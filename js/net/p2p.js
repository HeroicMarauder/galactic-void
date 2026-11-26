// Galactic Void — online play outside Claude. When the game runs as its own website there is no
// Claude "room" service, so this provides the same small interface over WebRTC (PeerJS):
//   join(name) -> room { emit, on, presence, peers, onPeers, connected, onConnection, leave }
// The first browser to open a room code becomes its hub (it takes the room's PeerJS id); everyone
// else connects to the hub, which relays messages and keeps the member list. Signalling uses the free
// PeerJS cloud by default; ?peer=host:port points it at another PeerJS server.
(function () {
  const GV = (window.GV = window.GV || {});
  const PREFIX = 'galactic-void-v1-';
  function opts() {
    const o = { debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] } };
    try {
      const q = new URLSearchParams(location.search).get('peer');
      if (q) { const [host, port] = q.split(':'); Object.assign(o, { host, port: +port || 9000, path: '/', secure: location.protocol === 'https:' && host !== 'localhost' }); }
    } catch (e) {}
    return o;
  }
  const newPeer = (id) => new Promise((res, rej) => {
    const p = id ? new window.Peer(id, opts()) : new window.Peer(opts());
    const t = setTimeout(() => { rej(Object.assign(new Error('timeout'), { code: 'timeout' })); try { p.destroy(); } catch (e) {} }, 12000);
    p.on('open', () => { clearTimeout(t); res(p); });
    p.on('error', (e) => { clearTimeout(t); rej(e); try { p.destroy(); } catch (x) {} });
  });

  async function join(name) {
    if (!window.Peer) throw Object.assign(new Error('PeerJS missing'), { code: 'unavailable' });
    const hubId = PREFIX + String(name).toLowerCase().replace(/[^a-z0-9-]/g, '');
    const handlers = {}, peerFns = [], connFns = [];
    let myPres = {}, peer, hub = false, hubConn = null, list = [], alive = true;
    const conns = new Map(); // hub: peerId -> DataConnection
    const pres = new Map();  // hub: peerId -> presence
    const fire = (topic, data, from) => (handlers[topic] || []).slice().forEach((f) => { try { f({ topic, data, peer: from, isMe: false, sameTab: false, kind: 'viewer', guest: false, by: null }); } catch (e) { console.error(e); } });
    const myId = () => (peer ? peer.id : 'me');
    const mkList = () => [{ peer: myId(), isMe: true, sameTab: true, by: null, presence: myPres }, ...list.filter((p) => p.peer !== myId())];
    const firePeers = () => { const ps = mkList(); peerFns.slice().forEach((f) => { try { f({ peers: ps }); } catch (e) { console.error(e); } }); };
    // ---- hub ----
    const hubList = () => [...pres.entries()].map(([id, p]) => ({ peer: id, isMe: false, sameTab: false, by: null, presence: p }));
    const hubBroadcastPeers = () => {
      const all = [{ peer: myId(), presence: myPres }, ...[...pres.entries()].map(([id, p]) => ({ peer: id, presence: p }))];
      for (const [id, c] of conns) if (c.open) c.send({ t: 'peers', list: all.filter((x) => x.peer !== id) });
      list = hubList(); firePeers();
    };
    const hubSend = (msg, except) => { for (const [id, c] of conns) if (id !== except && c.open) c.send(msg); };
    function hubAccept(c) {
      c.on('open', () => { conns.set(c.peer, c); pres.set(c.peer, {}); hubBroadcastPeers(); connFns.forEach((f) => f(true)); });
      c.on('data', (m) => {
        if (!m || typeof m !== 'object') return;
        if (m.t === 'emit') { fire(m.topic, m.data, c.peer); hubSend({ t: 'emit', topic: m.topic, data: m.data, from: c.peer }, c.peer); }
        if (m.t === 'pres') {
          // a guest's controller input rides on presence ~60x a second; only the hub (the host) needs it
          const old = pres.get(c.peer) || {}, nu = m.p || {}, strip = (o) => JSON.stringify(Object.assign({}, o, { in: 0 }));
          pres.set(c.peer, nu);
          if (strip(old) !== strip(nu)) hubBroadcastPeers(); else { list = hubList(); firePeers(); }
        }
      });
      const gone = () => { if (!conns.has(c.peer)) return; conns.delete(c.peer); pres.delete(c.peer); hubBroadcastPeers(); };
      c.on('close', gone); c.on('error', gone);
    }
    // try to become the hub; if the code is taken, join whoever holds it
    try { peer = await newPeer(hubId); hub = true; peer.on('connection', hubAccept); const ping = setInterval(() => { if (!alive) return clearInterval(ping); hubSend({ t: 'ping' }); }, 2000); }
    catch (e) {
      if (e && e.type !== 'unavailable-id') throw Object.assign(new Error(String(e && e.type || e)), { code: e && e.type === 'network' || e.type === 'server-error' || e.code === 'timeout' ? 'network' : 'failed' });
      peer = await newPeer(null);
      hubConn = peer.connect(hubId, { reliable: true, serialization: 'json' });
      await new Promise((res, rej) => { const t = setTimeout(() => rej(Object.assign(new Error('no hub'), { code: 'network' })), 12000); hubConn.on('open', () => { clearTimeout(t); res(); }); hubConn.on('error', (x) => { clearTimeout(t); rej(x); }); });
      let lastHeard = Date.now();
      hubConn.on('data', (m) => {
        lastHeard = Date.now();
        if (!m || typeof m !== 'object') return;
        if (m.t === 'bye') { lost(); return; }
        if (m.t === 'emit') fire(m.topic, m.data, m.from);
        if (m.t === 'peers') { list = (m.list || []).map((p) => ({ peer: p.peer, isMe: false, sameTab: false, by: null, presence: p.presence || {} })); firePeers(); }
      });
      let isLost = false;
      const lost = () => { if (!alive || isLost) return; isLost = true; list = []; firePeers(); connFns.forEach((f) => f(false)); };
      // the hub pings every 2s; a crashed or closed host is noticed within ~7s
      const watch = setInterval(() => { if (!alive) return clearInterval(watch); if (Date.now() - lastHeard > 7000) { clearInterval(watch); lost(); } }, 1000);
      hubConn.on('close', lost); hubConn.on('error', lost);
      hubConn.send({ t: 'pres', p: myPres });
    }
    peer.on('disconnected', () => { if (alive) try { peer.reconnect(); } catch (e) {} });
    const room = {
      name,
      emit: async (topic, data) => { if (hub) hubSend({ t: 'emit', topic, data, from: myId() }); else if (hubConn && hubConn.open) hubConn.send({ t: 'emit', topic, data }); },
      on: (topic, fn) => { (handlers[topic] = handlers[topic] || []).push(fn); return () => { handlers[topic] = (handlers[topic] || []).filter((f) => f !== fn); }; },
      presence: async (patch) => {
        myPres = Object.assign({}, myPres, patch);
        if (hub) hubBroadcastPeers(); else if (hubConn && hubConn.open) hubConn.send({ t: 'pres', p: myPres });
      },
      peers: () => mkList(),
      onPeers: (fn) => { peerFns.push(fn); return () => { const i = peerFns.indexOf(fn); if (i >= 0) peerFns.splice(i, 1); }; },
      connected: () => (hub ? true : !!(hubConn && hubConn.open)),
      onConnection: (fn) => { connFns.push(fn); return () => {}; },
      leave: async () => {
        alive = false;
        try { if (hub) hubSend({ t: 'bye' }); } catch (e) {}
        setTimeout(() => { try { if (hubConn) hubConn.close(); for (const c of conns.values()) c.close(); peer.destroy(); } catch (e) {} }, hub ? 150 : 0);
      },
      isHub: () => hub,
    };
    setTimeout(firePeers, 0);
    return room;
  }
  GV.p2p = { join, available: () => !!window.Peer };
  // Standalone = running as its own website, not inside Claude.
  GV.standalone = !!window.GV_STANDALONE; // set only by the standalone build's index.html
})();
