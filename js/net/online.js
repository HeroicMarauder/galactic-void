// Galactic Void — online co-op over the artifact's live room.
//
// One player HOSTS: their game runs the real simulation for both. The other JOINS with a 4-letter
// code: their game sends its character once (so the host can play it as Player 2), then streams
// its inputs and its own position (movement is predicted locally, so it feels instant), and draws
// what the host sends back: everyone's positions, enemies, shots, loot, telegraphs and effects.
//
// Transport: the room capability. Snapshots (8 a second, split into pieces under 4 KB) and events
// go on topics; the joiner's input rides on presence, which the platform sends ~30 times a second.
// Everything the joiner hears is treated as data: it is copied field by field into plain objects,
// and nothing in it is ever run or put into HTML.
(function () {
  const GV = window.GV, U = GV.util, P = GV.Play.prototype, I = GV.input;
  const ACTS = ['left', 'right', 'jump', 'down', 'dash', 'attack', 'skill1', 'skill2', 'skill3', 'flask1', 'flask2', 'interact'];
  const ETYPES = Object.keys(GV.ENEMIES);
  const SNAP_HZ = 8, CHUNK = 3600;
  const SQUAD = 4; // host + up to three joiners
  const N = (GV.net = { role: null, code: null, room: null, status: '', partner: null, partnerBy: null, guestData: null, hostLook: null, inGame: false, lastHeard: 0, rtt: 0, onRoom: [], extFns: [],
    SQUAD, guests: new Map(), mySlot: 0, nonce: null, roster: [] });
  // Squad bookkeeping (host side). Each joiner gets a slot 1..3: their colour, their P-number, their save.
  const guestBySlot = (s) => { for (const g of N.guests.values()) if (g.slot === s) return g; return null; };
  const freeSlot = () => { for (let s = 1; s < SQUAD; s++) if (!guestBySlot(s)) return s; return 0; };
  const updatePartner = () => { const f = [...N.guests.values()].sort((a, b) => a.slot - b.slot)[0]; N.partner = f ? f.peer : null; N.guestData = f ? f.data : null; N.partnerBy = f ? f.by : null; };
  N.slotOfPeer = (peer) => (N.role === 'host' ? (N.guests.get(peer) || {}).slot || 0 : 0);
  N.squadSize = () => (N.role === 'host' ? 1 + N.guests.size : N.role === 'guest' ? Math.max(2, N.roster.length) : 1);

  // ---------------- transport ----------------
  async function roomNS() {
    if (window.__gvMockRoom) return window.__gvMockRoom; // tests
    if (GV.standalone && GV.p2p) return GV.p2p; // its own website: direct peer-to-peer
    try { return window.claude && window.claude.use ? await window.claude.use('room') : null; } catch (e) { return null; }
  }
  const unsub = [];
  async function open(code) {
    const R = await roomNS();
    if (!R) throw new Error('unavailable');
    const room = await R.join('gv-' + code.toLowerCase());
    N.room = room; N.code = code;
    unsub.push(room.on('ctl', (m) => !m.sameTab && onCtl(m.data || {}, m)));
    unsub.push(room.on('hello', (m) => !m.sameTab && N.role === 'host' && onHello(Object.assign({}, m.data || {}, { _peer: m.peer, _by: m.by }))));
    unsub.push(room.on('give', (m) => !m.sameTab && N.role === 'guest' && onGive(m.data || {})));
    unsub.push(room.on('snap', (m) => !m.sameTab && N.role === 'guest' && onSnap(m.data || {})));
    unsub.push(room.onPeers((ch) => onPeers(ch)));
    for (const f of N.onRoom) { try { const u = f(room); if (typeof u === 'function') unsub.push(u); } catch (e) {} }
    return room;
  }
  function close() {
    while (unsub.length) { try { unsub.pop()(); } catch (e) {} }
    if (N.room) { try { N.room.leave(); } catch (e) {} }
    Object.assign(N, { role: null, code: null, room: null, partner: null, guestData: null, hostLook: null, inGame: false, status: '', mySlot: 0, nonce: null, roster: [] });
    N.guests.clear();
  }
  const emit = (topic, data) => { if (N.room) N.room.emit(topic, data).catch(() => {}); };
  // big things (a character) go in numbered pieces
  function sendBig(topic, obj, extra = {}) {
    const s = JSON.stringify(obj), n = Math.ceil(s.length / CHUNK), id = Math.floor(Math.random() * 1e9);
    for (let i = 0; i < n; i++) emit(topic, Object.assign({ id, i, n, part: s.slice(i * CHUNK, (i + 1) * CHUNK) }, extra));
  }
  const bigBuf = {};
  function takeBig(m) {
    if (typeof m.part !== 'string' || !(m.n > 0 && m.n < 200) || !(m.i >= 0 && m.i < m.n)) return null;
    const b = (bigBuf[m.id] = bigBuf[m.id] || { n: m.n, parts: [] });
    b.parts[m.i] = m.part;
    if (b.parts.filter((x) => x != null).length < b.n) return null;
    delete bigBuf[m.id];
    try { return JSON.parse(b.parts.join('')); } catch (e) { return null; }
  }

  function onPeers(ch) {
    const others = ch.peers.filter((p) => !p.isMe);
    if (N.role === 'host') {
      for (const g of [...N.guests.values()]) if (!others.some((p) => p.peer === g.peer)) guestLeft(g.peer);
      if (N.guests.size < SQUAD - 1 && others.some((p) => p.presence && p.presence.role === 'guest' && !N.guests.has(p.peer))) N.status = 'A player is connecting…';
      // each joiner's input rides on their presence
      for (const o of others) { const g = N.guests.get(o.peer); if (g && o.presence && o.presence.in) g.remote.take(o.presence.in); }
    } else if (N.partner) {
      // only call the host gone once we've actually seen them in the room's list
      if (others.some((p) => p.peer === N.partner)) N.hostSeen = N.partner;
      else if (N.hostSeen === N.partner) partnerLeft();
    }
    refreshUI();
  }
  function guestLeft(peer) {
    const g = N.guests.get(peer); if (!g) return;
    N.guests.delete(peer); updatePartner();
    const p = GV.game && GV.game.play;
    if (p && p.netHost) {
      const i = p.players.findIndex((pl) => pl.netG === g);
      if (i > 0) { const gone = p.players[i]; p.players.splice(i, 1); p.toast(`P${g.slot + 1} disconnected`, 2.4, 'small'); if (p.onPlayerLeft) p.onPlayerLeft(gone); }
      p.coop = p.netP2 = p.players.length > 1; GV.input.coop = p.coop;
    }
    N.status = N.guests.size ? `Squad ${1 + N.guests.size}/${SQUAD}.` : 'Your squad left. Waiting for someone to join…';
    sendRoster(); refreshUI();
  }
  function partnerLeft() {
    const was = N.partner; N.partner = null;
    if (N.role === 'guest' && was) {
      N.status = 'The host left the game.';
      if (GV.game.play && GV.game.play.netGuest) { GV.game.toMap(); }
      close(); GV.menus.coop();
      GV.menus.flash && GV.menus.flash('The host left the game.');
    }
    refreshUI();
  }

  // ---------------- character data ----------------
  // What the host needs to play you: your character, not your world progress.
  function myCharacter() {
    const d = JSON.parse(JSON.stringify(GV.save.data));
    for (const k of GV.save.SHARED) delete d[k];
    delete d.coop; delete d.frontier; delete d.tips; delete d.actsSeen;
    return d;
  }
  // Clean what a joiner sent into a normal save shape (unknown keys are dropped by normalize).
  function cleanCharacter(raw) {
    if (!raw || typeof raw !== 'object' || !GV.CLASSES[raw.cls]) return null;
    const d = GV.save.normalize(JSON.parse(JSON.stringify(raw)));
    d.level = Math.max(1, Math.min(200, +d.level || 1));
    return d;
  }
  // While hosting, "Player 2's save" is the joiner's character, kept apart from your own P2 slot.
  // While hosting, save slot N is the joiner in that slot; your own couch P2 slot is left alone.
  // The memory wallet is shared on a run, as in couch co-op; each joiner's own wallet is put back after.
  const useSlot0 = GV.save.useSlot.bind(GV.save);
  GV.save.useSlot = function (i) {
    if (!(N.role === 'host' && N.guests.size)) return useSlot0(i);
    if (i === this.slot) return;
    if (this.slot !== 0) { const g = this.data; for (const k of this.SHARED) if (k !== 'abilities') delete g[k]; this.main.memories = g.memories; g.memories = g.__mem || 0; delete g.__mem; this.data = this.main; this.slot = 0; }
    if (!i) return;
    const G = guestBySlot(i), g = G ? G.data : (this.__void = this.__void || this.normalize({}));
    for (const k of this.SHARED) if (k !== 'abilities') g[k] = this.main[k];
    g.abilities = g.abilities || { dash: true, grip: true };
    g.__mem = g.memories; g.memories = this.main.memories;
    this.data = g; this.slot = i;
  };
  const hasP20 = GV.save.hasP2.bind(GV.save);
  GV.save.hasP2 = function () { return N.role === 'host' && N.guests.size ? true : hasP20(); };
  GV.net.hostWantsP2 = () => N.role === 'host' && N.guests.size > 0;

  // ---------------- remote input (host side) ----------------
  const makeRemote = () => ({
    held: {}, pressed: {}, counts: {}, st: null, aim: null, t: 0,
    reset() { this.held = {}; this.pressed = {}; this.counts = {}; this.st = null; this.aim = null; },
    take(inp) {
      if (!inp || typeof inp !== 'object') return;
      const h = +inp.h || 0;
      ACTS.forEach((a, i) => { this.held[a] = !!(h & (1 << i)); });
      if (Array.isArray(inp.c)) ACTS.forEach((a, i) => { const c = +inp.c[i] || 0; if (this.counts[a] != null && c > this.counts[a]) this.pressed[a] = true; this.counts[a] = c; });
      if (Array.isArray(inp.s) && inp.s.length >= 5 && inp.s.slice(0, 4).every(Number.isFinite)) this.st = { x: inp.s[0], y: inp.s[1], vx: inp.s[2], vy: inp.s[3], f: inp.s[4] > 0 ? 1 : -1, g: !!inp.s[5] };
      this.aim = Array.isArray(inp.a) && inp.a.length === 2 && inp.a.every(Number.isFinite) ? { x: inp.a[0], y: inp.a[1] } : null;
      if (Number.isFinite(inp.ts)) this.ts = inp.ts;
      this.t = performance.now();
    },
  });
  const inputOf = (r) => ({ held: (a) => !!r.held[a], pressed: (a) => !!r.pressed[a], clear() { r.pressed = {}; } });

  // ---------------- hosting ----------------
  function onHello(m) {
    const peer = m._peer;
    let G = N.guests.get(peer);
    if (!G && N.guests.size >= SQUAD - 1) { if (m.i === 0) emit('ctl', { full: String(m.nonce || '') }); return; }
    const raw = takeBig(m);
    if (!raw) return;
    const d = cleanCharacter(raw);
    if (!d) return;
    const p = GV.game && GV.game.play;
    if (G && raw.resync) { // the joiner changed gear or cores: rebuild their suit, nothing else
      G.data = d; updatePartner();
      const pl = p && p.players.find((q) => q.netG === G);
      if (pl) { pl.recalc(); applyLook(pl, lookOf(d)); }
      sendRoster(); return;
    }
    if (G) { G.data = d; updatePartner(); sendWelcome(G); return; } // a repeat hello: they missed the welcome
    G = { peer, by: m._by || null, slot: freeSlot(), nonce: String(m.nonce || ''), data: d, remote: makeRemote(), joinerIn: false, startSentT: 0 };
    G.inp = inputOf(G.remote);
    N.guests.set(peer, G); updatePartner();
    if (G.by && GV.friends) GV.friends.addRecent(G.by);
    N.status = `${(GV.CLASSES[d.cls] || {}).name || 'A spaceman'} · rank ${d.level} joined as P${G.slot + 1}. Squad ${1 + N.guests.size}/${SQUAD}.`;
    sendWelcome(G); sendRoster();
    // already in a stage? bring them in now, next to you
    if (N.inGame && p && p.netHost && N.startInfo) {
      const pl = addRemotePlayer(p, G);
      if (pl) p.toast(`P${G.slot + 1} dropped in`, 2, 'small');
      emit('ctl', { start: Object.assign({}, N.startInfo, { to: G.nonce, at: { x: Math.round(p.players[0].x - 36), y: Math.round(p.players[0].y) } }) });
      G.startSentT = performance.now(); G.joinerIn = false;
    }
    refreshUI();
  }
  function sendWelcome(G) { emit('ctl', { welcome: { to: G.nonce, slot: G.slot, look: lookOf(GV.save.data), name: (GV.CLASSES[GV.save.data.cls] || {}).name } }); }
  // Everyone's look and slot, so each joiner can draw the whole squad.
  function sendRoster() {
    if (N.role !== 'host') return;
    const r = [{ s: 0, look: lookOf(GV.save.data), by: GV.friends && GV.friends.myId ? GV.friends.myId() : null }];
    for (const g of N.guests.values()) r.push({ s: g.slot, look: lookOf(g.data), by: g.by });
    emit('ctl', { roster: r });
  }
  // Put a joiner's suit into the running stage (or rebuild it), driven by their inputs.
  function addRemotePlayer(p, G) {
    let pl = p.players.find((q) => q.netG === G);
    if (pl) return pl;
    const lead = p.players[0];
    pl = new GV.Player(lead.x - 36 * G.slot, lead.y, G.slot);
    pl.inp = G.inp; pl.netG = G;
    p.players.push(pl); p.players.sort((a, b) => a.slot - b.slot);
    p.coop = p.netP2 = true; p.lootMode = p.lootMode || 'shared'; GV.input.coop = true;
    return pl;
  }
  function lookOf(d) {
    const W = GV.equippedWeapon(d), dy = GV.dyeLook ? GV.dyeLook(d) : {};
    return { cls: d.cls, kit: GV.kitLook(d), art: W.art, color: W.color, off: W.offArt || null, offColor: W.offColor || null, dye: dy, rank: d.level };
  }
  // Starting a stage while hosting tells the joiner which one, with the seed, so both build it.
  function wrapStarts() {
    const G = GV.game;
    const ss0 = G.startStage;
    G.startStage = function (sys, st) {
      if (N.role === 'guest' && !N.allowStart) return GV.menus.netWait();
      if (N.role === 'host') {
        const seed = Math.floor(Math.random() * 1e9);
        GV.stageSeed = seed;
        try { ss0.apply(this, arguments); } finally { GV.stageSeed = undefined; }
        hostBegin({ sys, st, seed });
        return;
      }
      return ss0.apply(this, arguments);
    };
    for (const k of ['startTitan', 'startTrial']) {
      const f = G[k]; if (!f) continue;
      G[k] = function () {
        if (N.role === 'guest') return GV.menus.netWait();
        if (N.role === 'host' && N.partner) { GV.menus.flash && GV.menus.flash('Online co-op covers story stages and the Void Depths for now. Titans and trials are solo.'); return; }
        return f.apply(this, arguments);
      };
    }
    if (GV.startDepths) {
      const sd0 = GV.startDepths;
      GV.startDepths = function (n, seed) {
        if (N.role === 'guest') return GV.menus.netWait();
        if (N.role === 'host') {
          seed = seed || Math.floor(Math.random() * 1e9);
          const pinned = U.hash('dseed:' + seed + ':' + n);
          GV.stageSeed = pinned;
          try { sd0.call(this, n, seed); } finally { GV.stageSeed = undefined; }
          const p = GV.game.play;
          hostBegin({ sys: p.sysIdx, st: p.stIdx, seed: pinned, pinned, diff: p.diff, depth: n, dseed: seed });
          return;
        }
        return sd0.apply(this, arguments);
      };
    }
    const tm0 = G.toMap;
    G.toMap = function () {
      const r = tm0.apply(this, arguments);
      if (N.role === 'host' && N.partner) emit('ctl', { map: 1 });
      if (N.role === 'guest' && N.inGame && !N.leaving) { N.inGame = false; GV.menus.netWait(); }
      return r;
    };
  }
  function hostBegin(info) {
    const p = GV.game.play; if (!p) return;
    N.inGame = true; p.netHost = true;
    // the stage made a couch-style P2; rebuild the squad from the joiners in their own slots
    p.players = [p.players[0]];
    for (const G of [...N.guests.values()].sort((a, b) => a.slot - b.slot)) addRemotePlayer(p, G);
    p.coop = p.netP2 = p.players.length > 1; GV.input.coop = p.coop;
    if (p.coop) p.lootMode = p.lootMode || 'shared';
    N.memAtStart = GV.save.main.memories;
    N.startInfo = info;
    if (N.guests.size) emit('ctl', { start: info });
    for (const G of N.guests.values()) { G.startSentT = performance.now(); G.joinerIn = false; }
  }

  // Each host frame: feed Player 2 the joiner's input and position; afterwards, snapshot.
  const upd0 = P.update;
  P.update = function (dt) {
    if (this.netGuest) return guestUpdate.call(this, dt);
    if (!this.netHost || !this.netP2) { const r = upd0.call(this, dt); if (this.netHost) { this.netT = (this.netT || 0) + dt; if (this.netT > 1) { this.netT = 0; outbox.length = 0; } } return r; }
    const rem = this.players.filter((pl) => pl.netG), before = new Map();
    for (const pl of rem) {
      const r = pl.netG.remote, st = r.st, auto = pl.charging || pl.hangAt || pl.dead || pl.blinkT > 0;
      if (st && !auto) { pl.x = st.x; pl.y = st.y; pl.vx = st.vx; pl.vy = st.vy; pl.facing = st.f; }
      if (r.aim) { I.aim.stick[pl.slot] = r.aim; I.aim.stickT[pl.slot] = performance.now() / 1000; } else I.aim.stick[pl.slot] = null;
      before.set(pl, { x: pl.x, y: pl.y });
    }
    upd0.call(this, dt);
    this.netFix = this.netFix || {};
    for (const pl of rem) {
      const r = pl.netG.remote, st = r.st; r.pressed = {};
      if (!this.players.includes(pl)) continue;
      // the host moved this suit itself (a lunge, a blink, a grapple, a respawn): tell its joiner
      const b = before.get(pl), moved = b && Math.hypot(pl.x - b.x, pl.y - b.y), f = this.netFix[pl.slot];
      if (pl.charging || pl.hangAt || moved > 40 || pl._fixPending) { this.netFix[pl.slot] = { x: Math.round(pl.x), y: Math.round(pl.y), vx: Math.round(pl.vx), vy: Math.round(pl.vy), n: (f ? f.n : 0) + (moved > 40 || !f ? 1 : 0), hold: pl.charging || pl.hangAt ? 1 : 0 }; }
      else if (st && !pl.dead) { pl.x = st.x; pl.y = st.y; if (f) f.hold = 0; }
    }
    this.netT = (this.netT || 0) + dt;
    if (this.netT >= 1 / SNAP_HZ) { this.netT = 0; sendSnapshot(this); }
    // re-send the start to anyone who hasn't shown up in it yet, in case it was dropped
    if (N.startInfo) for (const G of N.guests.values()) if (!G.joinerIn && performance.now() - G.startSentT > 2000) { emit('ctl', { start: Object.assign({}, N.startInfo, { to: G.nonce }) }); G.startSentT = performance.now(); }
  };
  // Events the joiner should see happen (sounds, numbers, bursts, toasts) are collected as they occur.
  const outbox = [];
  const ev = (e) => { const p = GV.game && GV.game.play; if (p && p.netHost && p.netP2 && outbox.length < 60) outbox.push(e); };
  const r1 = (v) => Math.round(v * 10) / 10;
  for (const [k, fn] of [
    ['burst', (x, y, n, color, sp, life, size) => ['b', Math.round(x), Math.round(y), Math.min(30, n | 0), color, sp | 0, r1(life || 0.5), r1(size || 2)]],
    ['text', (x, y, txt, color, size) => ['t', Math.round(x), Math.round(y), String(txt).slice(0, 40), color, size | 0]],
    ['toast', (text, dur, kind) => ['o', String(text).slice(0, 60), r1(dur || 2), kind || '']],
    ['shake', (n) => ['k', n | 0]],
    ['sfx', (n) => ['s', String(n)]],
  ]) {
    const f0 = P[k];
    P[k] = function () { const r = f0.apply(this, arguments); if (this.netHost) { try { ev(fn.apply(null, arguments)); } catch (e) {} } return r; };
  }
  if (GV.audio.play) { const ap0 = GV.audio.play; GV.audio.play = function (n, o) { const p = GV.game && GV.game.play; if (p && p.netHost && p.netP2) ev(['a', String(n)]); return ap0.apply(this, arguments); }; }

  // ---------------- snapshot (host → joiner) ----------------
  const ESKIP = new Set(['def', 'w', 'h', 'dmg', 'spd', 'cd', 'seed', 'xp', 'mem', 'knockT', 'dead', 'type', 'onGround', 'ground', 'hitWall', 'wallSide', 'solid', 'x0', 'y0', 'id', 'eliteMods', 'foes', 'tp', 'parts', 'set', 'hit', 'rehit', 'sx', 'tx', 'ty', 'dvx', 'dvy', 'hitDone', 'turn', 'bt']);
  let eid = 1;
  function packEnemy(e) {
    if (!e.nid) e.nid = eid++;
    const o = { i: e.nid, k: ETYPES.indexOf(e.type), x: Math.round(e.x), y: Math.round(e.y), w: e.w, h: e.h, hp: Math.round(e.hp), mh: Math.round(e.maxHp) };
    for (const key in e) {
      if (ESKIP.has(key) || key in o) continue;
      const v = e[key];
      if (typeof v === 'number') { if (v !== 0 && Number.isFinite(v)) o[key] = Math.abs(v) > 50 ? Math.round(v) : r1(v); }
      else if (typeof v === 'boolean') { if (v) o[key] = 1; }
      else if (typeof v === 'string' && v.length < 24) o[key] = v;
    }
    return o;
  }
  function packPlayer(pl) {
    const sw = pl.swing;
    return { x: Math.round(pl.x), y: Math.round(pl.y), vx: Math.round(pl.vx), vy: Math.round(pl.vy), f: pl.facing, hp: Math.round(pl.hp), mh: Math.round(pl.maxHp), wd: Math.round(pl.ward || 0), mw: Math.round(pl.maxWard || 0), ch: Math.round(pl.charge || 0), mc: Math.round(pl.maxChargeEff || pl.maxCharge || 0),
      dead: pl.dead ? 1 : 0, down: pl.down ? 1 : 0, rv: r1(pl.reviveT || 0), inv: pl.inv > 0 ? 1 : 0, st: pl.stealth > 0 ? 1 : 0, cd: (pl.cd || []).map((c) => r1(Math.max(0, c))), fl: [pl.flasks ? pl.flasks[0] : 0, pl.flasks ? pl.flasks[1] : 0],
      sw: sw ? [sw.kind, r1(sw.t), r1(sw.max), sw.color, Math.round(sw.reach || 0), Math.round(sw.hh || 0), sw.vert || 0] : null, dash: pl.dashT > 0 ? 1 : 0, sq: r1(pl.squash || 0) };
  }
  function near(p, o, pad = 900) { return p.players.some((pl) => Math.abs((o.x || 0) - pl.x) < pad && Math.abs((o.y || 0) - pl.y) < 700); }
  function sendSnapshot(p) {
    const n = (p.netN = (p.netN || 0) + 1), L = p.L;
    const ec = {}; for (const G of N.guests.values()) if (G.remote.ts) ec[G.slot] = G.remote.ts;
    const main = { n, ec, t: r1(p.t), state: p.state, sl: p.players.map((pl) => pl.slot || 0), pl: p.players.map(packPlayer), fix: p.netFix || null, ev: outbox.splice(0, outbox.length),
      boss: p.boss && !p.boss.dead ? p.boss.nid || (p.boss.nid = eid++) : 0,
      w: p.warns.filter((w) => near(p, w)).slice(0, 24).map((w) => [Math.round(w.x), Math.round(w.y), Math.round(w.w), Math.round(w.h), r1(w.t), r1(w.max || w.t)]),
      hz: p.hazards.filter((h) => near(p, h)).slice(0, 10).map((h) => [Math.round(h.x), Math.round(h.y), Math.round(h.w), Math.round(h.h), r1(h.t), r1(h.max || h.t)]),
      dr: p.drops.filter((d) => near(p, d, 700)).slice(0, 30).map((d) => { if (!d.nid) d.nid = eid++; return [d.nid, Math.round(d.x), Math.round(d.y), d.kind, d.kind === 'item' && d.item ? GV.items.color(d.item) : d.kind === 'cur' ? d.cur : d.kind === 'weapon' ? (GV.WEAPONS[d.wid] || {}).color || '#fff' : d.gk || '', d.tier || 0, d.claim ? 1 : 0, d.owner == null ? -1 : d.owner]; }),
      gr: p.grounds.slice(0, 8).map((g) => [Math.round(g.x), Math.round(g.y), Math.round(g.r), r1(g.t), r1(g.max), g.color ? 1 : 0]),
      sk: p.strikes.slice(0, 6).map((s) => [Math.round(s.x), Math.round(s.y), Math.round(s.r), r1(s.t), r1(s.max)]),
      mn: p.minions.slice(0, 10).map((m) => [m.kind, Math.round(m.x), Math.round(m.y), r1(m.t), m.s && m.s.def ? m.s.def.color : '#fff', m.i || 0]),
      nv: p.novas.slice(-8).map((v) => [Math.round(v.x), Math.round(v.y), Math.round(v.r), Math.round(v.max), r1(v.t), v.color]),
      bo: p.bolts.slice(-6).map((b) => [b.pts.slice(0, 8).map((q) => [Math.round(q.x), Math.round(q.y)]), r1(b.t), r1(b.max), b.color]),
      fx2: p.sx2 ? { w: p.sx2.wells.map((w) => [p.players.indexOf(w.pl), Math.round(w.x), Math.round(w.y), Math.round(w.r), r1(w.t), r1(w.max), w.s.def.color]), h: p.sx2.holes.map((h) => [p.players.indexOf(h.pl), Math.round(h.x), Math.round(h.y), Math.round(h.r), r1(h.t), r1(h.max), h.s.def.color]),
        m: p.sx2.mines.slice(0, 8).map((m) => [p.players.indexOf(m.pl), Math.round(m.x), Math.round(m.y), r1(m.t), m.s.def.color]), p: p.sx2.pillars.map((c) => [p.players.indexOf(c.pl), Math.round(c.x), Math.round(c.gy), Math.round(c.w), r1(c.t), r1(c.max), c.struck ? 1 : 0, r1(c.fade), c.s.def.color]),
        b: p.sx2.beams.map((b) => [p.players.indexOf(b.pl), Math.round(b.x0), Math.round(b.y0), Math.round(b.x1), Math.round(b.y1), r1(b.t), r1(b.max), b.color]) } : null,
      dr2: p.players.map((pl) => (pl.drones ? [pl.drones.n, r1(pl.drones.t), pl.drones.s.def.color] : null)),
      af: (p.actFx || []).map((f) => [f.kind, Math.round(f.x), Math.round(f.y), Math.round(f.w), Math.round(f.h), r1(f.t), r1(f.max), f.color]),
    };
    // world changes: broken walls, fallen ledges, sealed rooms, opened chests (every snapshot; small)
    if (L.netBase == null) { L.netBase = L.solids.length; L.netBaseO = L.oneways.length; }
    main.g = [L.solids.slice(0, L.netBase).map((s, i) => (s.gone ? i : -1)).filter((i) => i >= 0), L.oneways.map((o, i) => (o.gone ? i : -1)).filter((i) => i >= 0),
      (L.ambushes || []).map((a) => (a.state === 'active' ? 1 : a.state === 'done' ? 2 : 0)), (L.chests || []).map((c) => (c.opened ? 1 : 0)), L.rifts.map((r) => (r.dead ? 1 : 0)), L.shard && L.shard.got ? 1 : 0];
    if (n % 8 === 1) main.mt = L.memories.map((m, i) => (m.taken ? i : -1)).filter((i) => i >= 0);
    if (p.titan) main.ti = null;
    // enemies and projectiles, nearest first, in pieces
    const ens = p.enemies.filter((e) => !e.dead && near(p, e, 1000)).map(packEnemy);
    const prs = p.projs.filter((q) => near(p, q, 900)).slice(0, 60).map((q) => [Math.round(q.x), Math.round(q.y), Math.round(q.vx), Math.round(q.vy), r1(q.r), q.kind || '', q.color || '', q.friendly ? 1 : 0, r1(q.t || 0)]);
    const pieces = [];
    let cur = [], size = 0;
    for (const o of ens) { const s = JSON.stringify(o).length + 1; if (size + s > CHUNK && cur.length) { pieces.push(cur); cur = []; size = 0; } cur.push(o); size += s; }
    pieces.push(cur);
    main.ep = pieces.length; main.pr = prs;
    let mainJson = JSON.stringify(main);
    while (mainJson.length > 3900 && (main.pr.length || main.dr.length || main.ev.length)) { main.pr = main.pr.slice(0, Math.floor(main.pr.length * 0.6)); main.dr = main.dr.slice(0, Math.floor(main.dr.length * 0.7)); if (mainJson.length > 3900 && main.ev.length > 10) main.ev = main.ev.slice(-10); mainJson = JSON.stringify(main); }
    if (mainJson.length > 3990) { main.fx2 = null; main.bo = []; main.af = []; main.ev = []; mainJson = JSON.stringify(main); }
    emit('snap', main);
    pieces.forEach((e, i) => emit('snap', { n, ei: i, en: pieces.length, e }));
  }

  // ---------------- joining ----------------
  let helloTimer = null;
  function sayHello() {
    sendBig('hello', myCharacter(), { nonce: N.nonce });
  }
  function onCtl(c, m) {
    if (c.ext && (N.role === 'host' ? N.guests.has(m.peer) : N.partner === m.peer)) { for (const f of N.extFns) try { f(c.ext, m); } catch (e) {} }
    if (N.role === 'host') {
      if (c.joinerIn) { const G = N.guests.get(m.peer); if (G) G.joinerIn = true; }
      return;
    }
    if (N.role !== 'guest') return;
    N.lastHeard = performance.now();
    if (c.full && c.full === N.nonce && !N.partner) { const code = N.code; close(); N.status = `That squad is full (${SQUAD} of ${SQUAD}).`; refreshUI(); GV.menus.flash && GV.menus.flash(`Room ${code} is full.`); return; }
    if (c.welcome && c.welcome.look && c.welcome.to === N.nonce) {
      clearInterval(helloTimer); helloTimer = null;
      if (N.partner !== m.peer && m.by && GV.friends) GV.friends.addRecent(m.by);
      N.hostLook = c.welcome.look; N.partner = m.peer; N.partnerBy = m.by || null; N.hostSeen = m.peer; // the welcome came from the host, so they're here
      N.mySlot = Math.max(1, Math.min(SQUAD - 1, +c.welcome.slot || 1));
      N.status = `Connected as P${N.mySlot + 1}. The host picks where you go.`;
      refreshUI(); if (!N.inGame) GV.menus.netWait();
    }
    if (Array.isArray(c.roster) && N.partner === m.peer) {
      N.roster = c.roster.filter((r) => r && Number.isInteger(r.s) && r.s >= 0 && r.s < SQUAD).slice(0, SQUAD).map((r) => ({ s: r.s, look: r.look && typeof r.look === 'object' ? r.look : null, by: typeof r.by === 'string' ? r.by : null }));
      const r0 = N.roster.find((r) => r.s === 0); if (r0 && r0.look) N.hostLook = r0.look;
      const p = GV.game.play; if (p && p.netGuest) syncProxies(p);
    }
    if (c.start && N.partner === m.peer && (!c.start.to || c.start.to === N.nonce)) { guestBegin(c.start); const at = c.start.at, p = GV.game.play; if (at && p && p.netGuest && Number.isFinite(at.x) && Number.isFinite(at.y)) { p.player.x = at.x; p.player.y = at.y; p.snapCam && p.snapCam(); } }
    if (c.kick && N.partner === m.peer && (c.kick === N.nonce || c.kick === 'all' || c.kick === 1)) { if (GV.game.play && GV.game.play.netGuest) { N.leaving = true; try { GV.game.toMap(); } finally { N.leaving = false; } } close(); GV.menus.coop(); N.status = 'The host closed the game.'; refreshUI(); }
    if (c.map && N.partner === m.peer && N.inGame) { N.inGame = false; N.leaving = true; try { GV.game.toMap(); } finally { N.leaving = false; } GV.menus.netWait(); }
    if (c.clear && N.partner === m.peer) { const p = GV.game.play; if (p && p.netGuest) { p.state = 'clear'; GV.menus.netClear(c.clear); } }
  }
  function onGive(m) {
    if (m.to && m.to !== N.nonce) return; // someone else's spoils
    const raw = takeBig(m);
    if (!raw || N.role !== 'guest') return;
    // what the host's game did with your character: rank, loot, Star Cores, memories earned
    const d = cleanCharacter(raw);
    if (!d || d.cls !== GV.save.data.cls) return;
    const me = GV.save.data;
    for (const k in d) if (!GV.save.SHARED.includes(k) && k !== 'coop' && k !== 'memories') me[k] = d[k];
    me.memories = (me.memories || 0) + Math.max(0, Math.min(1e7, +raw.earned || 0));
    GV.save.write();
  }

  // The joiner builds the same stage from the same seed, then mirrors the host.
  function guestBegin(info) {
    if (!info || !Number.isFinite(info.sys) || !Number.isFinite(info.st) || !Number.isFinite(info.seed)) return;
    N.inGame = true; N.allowStart = true;
    GV.stageSeed = info.pinned || info.seed; if (Number.isFinite(info.diff)) GV._depthDiff = info.diff;
    try { if (info.hall && GV.game.startHall) GV.game.startHall(info.hall); else GV.game.startStage(info.sys, info.st); } finally { GV.stageSeed = undefined; GV._depthDiff = null; N.allowStart = false; }
    const p = GV.game.play;
    p.netGuest = true; p.coop = true; p.pendingDialog = null; p.dialog = null; p.introT = 0; p.ghost = null;
    if (info.depth) p.depth = { n: info.depth, seed: info.dseed, mods: [] };
    const me = p.player;
    me.slot = N.mySlot || 1; me.dataSlot = 0; // your colour and P-number in this squad; your stats are still your own save
    p.players = [me]; p.player = me;
    syncProxies(p);
    p.net = { ents: new Map(), drops: new Map(), n: 0, epN: 0, epGot: {}, fixN: 0, hostT: 0 };
    me.netMe = true;
    emit('ctl', { joinerIn: 1 });
  }
  // Everyone else in the squad, drawn from what the host sends.
  const NULLIN = { held: () => false, pressed: () => false, clear() {} };
  function syncProxies(p) {
    const me = p.player, want = N.roster.length ? N.roster.filter((r) => r.s !== N.mySlot) : [{ s: 0, look: N.hostLook }];
    p.players = p.players.filter((pl) => pl === me || want.some((r) => r.s === pl.slot));
    for (const r of want) {
      let pl = p.players.find((q) => q !== me && q.slot === r.s);
      if (!pl) { pl = new GV.Player(me.x + 36, me.y, 0); pl.inp = NULLIN; pl.netRemote = true; pl.dataSlot = 0; pl.slot = r.s; p.players.push(pl); }
      if (r.look) applyLook(pl, r.look);
    }
    p.coop = p.players.length > 1;
  }
  function applyLook(pl, look) {
    if (!look) return;
    pl.cls = look.cls; pl.kit = look.kit || pl.kit;
    pl.weapon = Object.assign({}, pl.weapon, { art: look.art, color: look.color, offArt: look.off, offColor: look.offColor });
    pl._dye = look.dye || {};
  }

  // ---------------- the joiner's frame ----------------
  const pressCount = {};
  function guestInput(p) {
    const me = p.player;
    let h = 0;
    ACTS.forEach((a, i) => { if (I.held(a)) h |= 1 << i; if (I.pressed(a)) pressCount[a] = (pressCount[a] || 0) + 1; });
    const a = GV.aim && GV.aim.of(me);
    const inp = { h, c: ACTS.map((x) => pressCount[x] || 0), s: [Math.round(me.x), Math.round(me.y), Math.round(me.vx), Math.round(me.vy), me.facing, me.onGround ? 1 : 0], a: a ? [Math.round(a.x * 100) / 100, Math.round(a.y * 100) / 100] : null, ts: Math.round(performance.now()) };
    if (N.room) N.room.presence({ role: 'guest', in: inp }).catch(() => {});
  }
  function guestUpdate(dt) {
    this.t += dt; this.hintT -= dt;
    this.updateFx(dt);
    const me = this.player, S = this.net;
    // your own movement runs here, at once; everything that can hurt or reward you runs on the host
    if (!me.dead) { const hp = me.hp; me.update(dt, this); me.hp = hp; }
    for (const m of this.L.movers) { const s = (1 - Math.cos(((this.t / m.period) + m.phase) * Math.PI * 2)) / 2; const nx = U.lerp(m.x0, m.x1, s), ny = U.lerp(m.y0, m.y1, s); m.dx = nx - m.x; m.dy = ny - m.y; m.x = nx; m.y = ny; }
    // everyone else glides between snapshots
    const k = Math.min(1, dt * 12);
    for (const e of this.enemies) { e.t += dt; e.flash -= dt; if (e.tx != null) { e.tx += (e.vx || 0) * dt; e.ty += (e.def.fly ? e.vy || 0 : 0) * dt; e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; } }
    for (const q of this.projs) { q.x += q.vx * dt; q.y += q.vy * dt; q.t += dt; }
    for (const o of this.players) {
      if (o === me) continue;
      if (o.tx != null) { o.tx += o.vx * dt; o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k; o.t = (o.t || 0) + dt; o.run = Math.abs(o.vx) > 30; }
      if (o.swing) { o.swing.t -= dt; if (o.swing.t <= 0) o.swing = null; }
    }
    for (const w of this.warns) w.t -= dt; this.warns = this.warns.filter((w) => w.t > 0);
    for (const h of this.hazards) h.t -= dt; this.hazards = this.hazards.filter((h) => h.t > 0);
    for (const b of this.bolts) b.t -= dt; this.bolts = this.bolts.filter((b) => b.t > 0);
    for (const g of this.grounds) g.t -= dt; for (const s of this.strikes) s.t -= dt; for (const m of this.minions) m.t += dt;
    if (this.actFx) for (const f of this.actFx) f.t -= dt;
    // hold the stage clear / death screens to the host
    if (this.state === 'dead' && !me.dead) this.state = 'run';
    guestInput(this);
    this.updateCam(dt);
  }
  // the joiner never decides anything: no skills fired, no damage, no pickups, no finishing
  const use0 = GV.Skills.use;
  GV.Skills.use = function (p) { if (p && p.netGuest) return false; return use0.apply(this, arguments); };
  for (const k of ['damagePlayer', 'damageEnemy', 'killEnemy', 'finish', 'giveDrop', 'gainMem', 'startBoss', 'talk']) {
    const f = P[k]; if (!f) continue;
    P[k] = function () { if (this.netGuest) return; return f.apply(this, arguments); };
  }

  function onSnap(m) {
    const p = GV.game && GV.game.play;
    if (!p || !p.netGuest || !p.net) return;
    const S = p.net;
    if (!Number.isFinite(m.n)) return;
    if (m.e) return takeEnemies(p, m);
    if (m.n < S.n) return; // late
    S.n = m.n; N.lastHeard = performance.now();
    const ec = m.ec && typeof m.ec === 'object' ? +m.ec[N.mySlot] : 0;
    if (ec > 0) { const r = performance.now() - ec; if (r >= 0 && r < 10000) N.rtt = N.rtt ? N.rtt * 0.8 + r * 0.2 : r; }
    const me = p.player, sl = Array.isArray(m.sl) ? m.sl : [0, N.mySlot];
    const bySlot = (s) => (s === N.mySlot ? me : p.players.find((q) => q !== me && q.slot === s) || null);
    if (Array.isArray(m.pl)) {
      // make sure every suit the host has is drawn here, even before a roster arrives
      for (const s of sl) if (s !== N.mySlot && Number.isInteger(s) && s >= 0 && s < SQUAD && !bySlot(s)) { if (!N.roster.some((r) => r.s === s)) N.roster.push({ s, look: s === 0 ? N.hostLook : null }); syncProxies(p); }
      m.pl.forEach((hp, j) => {
      const s = sl[j], host = s === N.mySlot ? null : bySlot(s);
      if (s === N.mySlot) return applyMine(me, hp);
      if (hp && host) { host.tx = hp.x; host.ty = hp.y; host.vx = hp.vx; host.vy = hp.vy; host.facing = hp.f; host.hp = hp.hp; host.maxHp = hp.mh; host.dead = !!hp.dead && !hp.down; host.down = !!hp.down; host.reviveT = hp.rv; host.inv = hp.inv; host.stealth = hp.st; host.dashT = hp.dash ? 0.1 : 0; host.squash = hp.sq;
        host.swing = hp.sw ? { kind: hp.sw[0], t: hp.sw[1], max: hp.sw[2], color: hp.sw[3], reach: hp.sw[4], hh: hp.sw[5], vert: hp.sw[6] } : null; if (host.x == null || Math.hypot(host.x - hp.x, host.y - hp.y) > 400) { host.x = hp.x; host.y = hp.y; } }
      });
    }
    function applyMine(me, mp) {
      if (mp) {
        me.hp = mp.hp; me.maxHp = mp.mh; me.ward = mp.wd; me.maxWard = mp.mw; me.charge = mp.ch; if (mp.mc) me.maxChargeEff = mp.mc;
        const wasDead = me.dead; me.dead = !!mp.dead || !!mp.down; me.down = !!mp.down; me.reviveT = mp.rv; me.inv = mp.inv ? Math.max(me.inv, 0.1) : me.inv;
        if (Array.isArray(mp.cd)) me.cd = mp.cd.slice(0, 4);
        if (Array.isArray(mp.fl) && me.flasks) { me.flasks[0] = mp.fl[0]; me.flasks[1] = mp.fl[1]; }
        me.swing = mp.sw ? { kind: mp.sw[0], t: mp.sw[1], max: mp.sw[2], color: mp.sw[3], reach: mp.sw[4], hh: mp.sw[5], vert: mp.sw[6] } : me.swing;
        if (!me.dead && wasDead) { me.inv = 1; }
      }
    }
    const fix = m.fix && typeof m.fix === 'object' ? m.fix[N.mySlot] : null;
    if (fix && Number.isFinite(fix.x) && fix.n !== S.fixN) { S.fixN = fix.n; me.x = fix.x; me.y = fix.y; me.vx = fix.vx; me.vy = fix.vy; }
    if (fix && fix.hold) { me.x = fix.x; me.y = fix.y; }
    if (m.state === 'boss' && p.state === 'run') { p.state = 'boss'; if (p.L.gates && p.L.gates[0]) p.L.gates[0].closed = true; }
    p.warns = (m.w || []).map((w) => ({ x: w[0], y: w[1], w: w[2], h: w[3], t: w[4], max: w[5] }));
    p.hazards = (m.hz || []).map((h) => ({ x: h[0], y: h[1], w: h[2], h: h[3], t: h[4], max: h[5], dmg: 0 }));
    p.drops = (m.dr || []).map((d) => ({ x: d[1], y: d[2], w: 14, h: 14, kind: String(d[3]), item: d[3] === 'item' ? { rarity: 'rare', _col: d[4] } : null, cur: d[3] === 'cur' && GV.CURRENCY[d[4]] ? d[4] : null, gk: d[3] === 'gem' || d[3] === 'uncut' ? d[4] : null, tier: d[5], col: d[4], netOnly: true, age: 1 }));
    p.grounds = (m.gr || []).map((g) => ({ x: g[0], y: g[1], r: g[2], t: g[3], max: g[4], color: g[5] ? '#f60' : null }));
    p.strikes = (m.sk || []).map((s) => ({ x: s[0], y: s[1], r: s[2], t: s[3], max: s[4] }));
    p.minions = (m.mn || []).map((q) => ({ kind: q[0], x: q[1], y: q[2], t: q[3], s: { def: { color: q[4] } }, i: q[5], flash: 0 }));
    p.novas = (m.nv || []).map((v) => ({ x: v[0], y: v[1], r: v[2], max: v[3], t: v[4], color: v[5] }));
    p.bolts = (m.bo || []).map((b) => ({ pts: b[0].map((q) => ({ x: q[0], y: q[1] })), t: b[1], max: b[2], color: b[3] }));
    p.actFx = (m.af || []).map((f) => ({ kind: f[0], x: f[1], y: f[2], w: f[3], h: f[4], t: f[5], max: f[6], color: f[7] }));
    if (m.fx2) {
      const owner = (i) => bySlot(sl[i]) || me;
      const sx = (p.sx2 = p.sx2 || { wells: [], mines: [], pillars: [], holes: [], beams: [], hooks: [], fx: [] });
      sx.wells = m.fx2.w.map((w) => ({ pl: owner(w[0]), x: w[1], y: w[2], r: w[3], t: w[4], max: w[5], s: { def: { color: w[6] } } }));
      sx.holes = m.fx2.h.map((h) => ({ pl: owner(h[0]), x: h[1], y: h[2], r: h[3], t: h[4], max: h[5], s: { def: { color: h[6] } } }));
      sx.mines = m.fx2.m.map((q) => ({ pl: owner(q[0]), x: q[1], y: q[2], t: q[3], s: { def: { color: q[4] } } }));
      sx.pillars = m.fx2.p.map((c) => ({ pl: owner(c[0]), x: c[1], gy: c[2], w: c[3], t: c[4], max: c[5], struck: !!c[6], fade: c[7], s: { def: { color: c[8] } } }));
      sx.beams = m.fx2.b.map((b) => ({ pl: owner(b[0]), x0: b[1], y0: b[2], x1: b[3], y1: b[4], t: b[5], max: b[6], color: b[7] }));
    }
    if (Array.isArray(m.dr2)) m.dr2.forEach((d, i) => { const pl = bySlot(sl[i]); if (pl) pl.drones = d ? { n: d[0], t: d[1], s: { def: { color: d[2] } }, cd: [] } : null; });
    p.projs = (m.pr || []).map((q) => ({ x: q[0], y: q[1], vx: q[2], vy: q[3], r: q[4], kind: q[5], color: q[6] || null, friendly: !!q[7], hostile: !q[7], t: q[8], life: 1 }));
    // world changes
    if (Array.isArray(m.g)) {
      const L = p.L; if (L.netBase == null) { L.netBase = L.solids.length; }
      const gone = new Set(m.g[0]); L.solids.slice(0, L.netBase).forEach((s, i) => { if (!s.ceiling) s.gone = gone.has(i); });
      const og = new Set(m.g[1]); L.oneways.forEach((o, i) => { o.gone = og.has(i); });
      (L.ambushes || []).forEach((a, i) => {
        const st = m.g[2][i];
        if (st === 1 && !a.walls) { a.walls = [{ x: a.x - 10, y: a.floorY - 300, w: 30, h: 300, ambush: true }, { x: a.x + a.w - 20, y: a.floorY - 300, w: 30, h: 300, ambush: true }]; L.solids.push(...a.walls); p.grid = null; }
        if (st === 2 && a.walls) a.walls.forEach((w) => { w.gone = true; });
        a.state = st === 1 ? 'active' : st === 2 ? 'done' : 'idle';
      });
      (L.chests || []).forEach((c, i) => { c.opened = !!m.g[3][i]; });
      L.rifts.forEach((r, i) => { r.dead = !!m.g[4][i]; });
      if (L.shard) L.shard.got = !!m.g[5];
      p.grid = null;
    }
    if (Array.isArray(m.mt)) { const t = new Set(m.mt); p.L.memories.forEach((q, i) => { q.taken = t.has(i); }); }
    p.netBossId = m.boss || 0;
    // events
    for (const e of m.ev || []) playEvent(p, e);
    if (S.epN !== m.n) { S.epN = m.n; S.epGot = {}; S.epWant = m.ep || 1; }
  }
  function takeEnemies(p, m) {
    const S = p.net;
    if (!Array.isArray(m.e)) return;
    const seen = (S.epSeen = S.epN === m.n ? S.epSeen || new Set() : new Set());
    if (S.epN !== m.n) { S.epN = m.n; S.epGot = {}; S.epWant = m.en || 1; }
    S.epGot[m.ei] = 1;
    for (const o of m.e) {
      if (!o || !Number.isFinite(o.i) || !(o.k >= 0 && o.k < ETYPES.length)) continue;
      seen.add(o.i);
      let e = S.ents.get(o.i);
      const type = ETYPES[o.k], def = GV.ENEMIES[type];
      if (!e) { e = { type, def, t: 0, flash: 0, vx: 0, vy: 0, dir: 1, spd: 1, x: o.x, y: o.y, tx: o.x, ty: o.y, nid: o.i }; S.ents.set(o.i, e); }
      for (const k in o) { if (k === 'i' || k === 'k' || k === 'x' || k === 'y') continue; const v = o[k]; if (typeof v === 'number' || typeof v === 'string') e[k] = v; }
      for (const k in e) if (!(k in o) && typeof e[k] === 'number' && !['t', 'flash', 'vx', 'vy', 'dir', 'spd', 'x', 'y', 'tx', 'ty', 'nid', 'w', 'h', 'hp', 'maxHp'].includes(k)) e[k] = 0;
      e.tx = o.x; e.ty = o.y; e.maxHp = o.mh; e.hp = o.hp; e.w = o.w || def.w; e.h = o.h || def.h; e.dir = o.dir || 1; e.flash = o.flash || 0;
      e.elite = !!o.elite; e.boss = !!o.boss;
    }
    if (Object.keys(S.epGot).length >= (S.epWant || 1)) { for (const id of [...S.ents.keys()]) if (!seen.has(id)) S.ents.delete(id); S.epSeen = new Set(); }
    p.enemies = [...S.ents.values()];
    p.boss = p.netBossId ? p.enemies.find((e) => e.nid === p.netBossId) || null : null;
  }
  function playEvent(p, e) {
    if (!Array.isArray(e)) return;
    const s = (v) => (typeof v === 'string' ? v.slice(0, 60) : '');
    try {
      if (e[0] === 'b') burst0.call(p, +e[1], +e[2], Math.min(30, +e[3] || 0), s(e[4]), +e[5], +e[6], +e[7]);
      else if (e[0] === 't') text0.call(p, +e[1], +e[2], s(e[3]), s(e[4]), +e[5] || undefined);
      else if (e[0] === 'o') toast0.call(p, s(e[1]), +e[2] || 2, s(e[3]) || undefined);
      else if (e[0] === 'k') shake0.call(p, Math.min(14, +e[1] || 0));
      else if (e[0] === 's') sfx0.call(p, s(e[1]));
      else if (e[0] === 'a' && GV.audio.play) GV.audio.play(s(e[1]));
    } catch (err) {}
  }
  // originals for replaying (the hooks above only record on the host)
  const burst0 = P.burst, text0 = P.text, toast0 = P.toast, shake0 = P.shake, sfx0 = P.sfx;

  // drops drawn on the joiner have no real item behind them
  const items = GV.items, color0 = items.color;
  items.color = function (it) { return it && it._col ? it._col : color0.apply(this, arguments); };

  // the joiner's HUD: hide prompts it can't act on
  const draw0 = P.draw;
  P.draw = function (ctx) {
    if (!this.netGuest) return draw0.call(this, ctx);
    try { draw0.call(this, ctx); } catch (e) { /* a mirrored object can lack something a draw expects; skip a frame */ }
  };

  // ---------------- the host: stage clear, give the joiner their spoils ----------------
  const fin0 = P.finish;
  P.finish = function () {
    const r = fin0.apply(this, arguments);
    if (this.netHost && this.netP2 && N.guests.size) {
      const earned = Math.max(0, (this.memGot || 0));
      for (const G of N.guests.values()) {
        const d = JSON.parse(JSON.stringify(G.data));
        for (const k of GV.save.SHARED) delete d[k];
        if ('__mem' in d) { d.memories = d.__mem; delete d.__mem; }
        d.earned = earned;
        sendBig('give', d, { to: G.nonce });
      }
      emit('ctl', { clear: { name: (this.sd && this.sd.name) || 'Stage', mem: earned, kills: this.kills || 0 } });
    }
    return r;
  };
  addEventListener('beforeunload', () => { if (N.role) close(); });
  // If the host's snapshots stop for a while, say so.
  setInterval(() => {
    if (N.role === 'guest' && N.inGame && performance.now() - N.lastHeard > 6000) { const p = GV.game.play; if (p && p.netGuest && !p._stallToast) { p._stallToast = true; toast0.call(p, 'Waiting for the host…', 3, 'small'); } }
    if (N.role === 'guest' && !N.partner && helloTimer == null && N.room) helloTimer = setInterval(sayHello, 2500);
  }, 1500);

  // ---------------- lobby ----------------
  const M = GV.menus, esc = M.esc;
  const code4 = () => { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };
  async function host() {
    close();
    N.status = 'Opening a room…'; refreshUI();
    try {
      const code = code4();
      await open(code);
      N.role = 'host'; N.status = 'Waiting for a friend to join…';
      N.room.presence({ role: 'host', cls: GV.save.data.cls, rank: GV.save.data.level }).catch(() => {});
      { const p = GV.game && GV.game.play; if (p && p.L && p.L.hall && !p.netHost && !p.netGuest) hostBegin({ sys: 0, st: 0, seed: 0, hall: { host: 1 } }); } // hosting from the ship: friends board this ship
    } catch (e) { close(); N.status = GV.standalone ? 'Couldn\'t reach the matchmaking server. Check your connection and try again.' : 'Online play isn\'t available here. Open the game in Claude, signed in, with access to it.'; }
    refreshUI();
  }
  async function join(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (code.length !== 4) { N.status = 'Codes are 4 letters or numbers.'; return refreshUI(); }
    if (GV.save.needsClass()) { N.status = 'Make a character first.'; return refreshUI(); }
    close();
    N.nonce = Math.random().toString(36).slice(2, 10);
    N.status = 'Joining ' + code + '…'; refreshUI();
    try {
      await open(code);
      if (N.room.isHub && N.room.isHub()) { close(); N.status = `No one is hosting ${code} right now.`; return refreshUI(); } // peer-to-peer: we'd be alone in the room
      N.role = 'guest';
      N.room.presence({ role: 'guest', cls: GV.save.data.cls, rank: GV.save.data.level }).catch(() => {});
      sayHello(); helloTimer = setInterval(sayHello, 2500);
      N.status = 'Waiting for the host to answer…';
    } catch (e) { close(); N.status = e && e.code === 'not_permitted' ? 'You need access to this game to join (ask the host to share it with you).' : e && e.code === 'network' ? 'Couldn\'t reach that room. Check the code, and that the host is on their ship.' : 'Couldn\'t join. Check the code and try again.'; }
    refreshUI();
  }
  function refreshUI() { const el = document.getElementById('netBox'); if (el) el.replaceWith(netBox()); if (GV.friends) GV.friends.publish(); }
  N.refreshUI = () => refreshUI();
  function netBox(opts = netBox.last || {}) {
    netBox.last = opts;
    const box = document.createElement('div'); box.id = 'netBox'; box.className = 'netbox';
    const role = N.role;
    const COLS = GV.COOP_COLORS || [];
    const squadList = () => `<div class="squad"><div class="gsub">Squad <span>${1 + N.guests.size}/${SQUAD}</span></div>
      <div class="sqrow"><i style="background:${COLS[0]}"></i><b>P1 · you</b><span>${esc((GV.CLASSES[GV.save.data.cls] || {}).name || '')} · rank ${GV.save.data.level || 1}</span></div>
      ${[...N.guests.values()].sort((a, b) => a.slot - b.slot).map((g) => `<div class="sqrow"><i style="background:${COLS[g.slot]}"></i><b>P${g.slot + 1}</b><span>${esc((GV.CLASSES[g.data.cls] || {}).name || '')} · rank ${+g.data.level || 1}</span><button class="ghost" data-n="kick" data-p="${esc(g.peer)}">Remove</button></div>`).join('')}
      ${Array.from({ length: SQUAD - 1 - N.guests.size }, () => '<div class="sqrow open"><i></i><b>Open slot</b><span>share the code or invite a friend</span></div>').join('')}</div>`;
    box.innerHTML = `<div class="gsub">Online co-op <span>squads of up to ${SQUAD}, anywhere</span></div>
      ${role === 'host' ? `<div class="netcode">Room code <b>${esc(N.code)}</b></div>` : ''}
      <p class="muted">${esc(N.status || (GV.standalone ? 'One of you hosts and picks the stages; up to three friends join with the room code. Send them this page\'s link and your code.' : 'One of you hosts and picks the stages; up to three friends join with the room code. Your friend needs access to this game in Claude (share it with them as a Contributor or higher).'))}</p>
      ${role === 'host' ? squadList() : ''}
      ${role !== 'guest' ? `<div class="joinrow"><div class="gsub">Join a squad <span>${role === 'host' ? 'leaves your own room' : 'enter their room code'}</span></div>
        <div class="menu row"><input id="netCode" class="codein" maxlength="4" placeholder="CODE" autocomplete="off" spellcheck="false" aria-label="Room code"><button class="primary" data-n="join">Join</button>${!role ? '<button data-n="host">Host instead</button>' : ''}</div></div>` : ''}
      ${role ? `<div class="menu row">${role === 'guest' && N.partner ? '<button class="primary" data-n="wait">Follow the host</button>' : ''}${role === 'guest' ? '<button data-n="leave">Leave squad</button>' : N.guests.size ? '<button class="ghost" data-n="leave">Close my room</button>' : ''}</div>` : ''}
      ${opts.noFriends ? '' : `<div class="menu row"><button data-n="friends">Friends${GV.friends && GV.friends.onlineCount() ? ` <b class="pts">${GV.friends.onlineCount()} online</b>` : ''}</button></div>`}`;
    const ci = box.querySelector('#netCode');
    if (ci) {
      ci.addEventListener('input', () => { ci.value = ci.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); });
      ci.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') box.querySelector('[data-n="join"]').click(); });
      ci.addEventListener('keyup', (e) => e.stopPropagation());
    }
    box.querySelectorAll('[data-n]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const a = b.dataset.n;
      if (a === 'host') host();
      if (a === 'join') {
        const code = (box.querySelector('#netCode') || {}).value;
        // joining someone else leaves your own room; if friends are in it, confirm first
        if (N.role === 'host' && N.guests.size && !b.dataset.armed) { b.dataset.armed = '1'; b.textContent = `Leave ${N.guests.size} behind?`; b.classList.add('danger'); return; }
        join(code);
      }
      if (a === 'leave') { close(); N.status = ''; refreshUI(); }
      if (a === 'wait') M.netWait();
      if (a === 'kick') { N.kick(b.dataset.p); refreshUI(); }
      if (a === 'friends' && M.friends) M.friends(() => M.coop());
    }));
    return box;
  }
  const coop0 = M.coop;
  M.coop = function () {
    const r = coop0.apply(this, arguments);
    const panel = document.querySelector('#ui .screen'); if (panel) { const menu = panel.querySelector('.menu.row:last-of-type') || null; panel.insertBefore(netBox({}), menu); }
    return r;
  };
  M.netWait = function () {
    const L = N.hostLook || {};
    M.render(`<div class="screen panel narrow netwait"><h2>Online co-op</h2>
      <p>${N.partner ? `Connected to the host${L.cls ? ` (${esc((GV.CLASSES[L.cls] || {}).name || '')}, rank ${+L.rank || '?'})` : ''}. When they start a stage, you'll drop in beside them.` : esc(N.status || 'Not connected.')}</p>
      <p class="muted">Your character, gear and Star Cores come with you. Loot you pick up, rank you gain and memories earned on a clear are saved to your character.</p>
      <div class="menu"><button data-a="gear">Gear</button><button data-a="gems">Star Cores</button><button class="ghost" data-a="leave">Leave the game</button></div></div>`, (a) => {
      if (a === 'leave') { close(); return GV.menus.coop(); }
      if (a === 'gear') return GV.gearView.open('netwait');
      if (a === 'gems') return GV.gemView && GV.gemView.open ? GV.gemView.open('netwait') : null;
    }, () => {});
  };
  M.netClear = function (c) {
    M.render(`<div class="screen panel narrow clear"><h2>Stage cleared</h2><div class="sub">${esc(String(c.name || 'Stage'))}</div>
      <div class="how"><div><b>Memories</b><span>${M.memIcon} ${Math.max(0, +c.mem || 0)}</span></div><div><b>Kills</b><span>${Math.max(0, +c.kills || 0)}</span></div></div>
      <p class="muted">Saved to your character. The host picks what's next.</p>
      <div class="menu"><button class="primary" data-a="ok">Continue</button></div></div>`, () => { N.inGame = false; N.leaving = true; try { GV.game.toMap(); } finally { N.leaving = false; } M.netWait(); }, () => {});
  };
  // The Star Map while joined: you can look, the host decides.
  const map0 = M.map;
  M.map = function () { if (N.role === 'guest' && N.partner && !N.leaving) return M.netWait(); return map0.apply(this, arguments); };

  if (GV.game) wrapStarts(); else addEventListener('load', wrapStarts);
  N.netBox = (o) => netBox(o || {});
  // Comms (the friends screen) gets the same panel up top: room code, squad, and Join by code
  addEventListener('load', () => {
    const f0 = M.friends; if (!f0) return;
    M.friends = async function () {
      const r = await f0.apply(this, arguments);
      const panel = document.querySelector('#ui .screen.friends');
      if (panel && !panel.querySelector('#netBox')) { const h = panel.querySelector('h2'); const nb = netBox({ noFriends: true }); nb.classList.add('commsnet'); h ? h.after(nb) : panel.prepend(nb); }
      return r;
    };
  });
  N.host = host; N.join = join; N.leave = () => { close(); refreshUI(); };
  N.kick = (peer) => { if (N.role !== 'host') return; const list = peer ? [N.guests.get(peer)].filter(Boolean) : [...N.guests.values()]; for (const G of list) { emit('ctl', { kick: G.nonce }); guestLeft(G.peer); } };
  N.sendRoster = () => sendRoster();
  N.emit = emit;
  N.hostBegin = (info) => hostBegin(info);
  N.ext = (o) => { if (N.partner) emit('ctl', { ext: o }); };
  N.resync = () => { if (N.role === 'guest' && N.partner) sendBig('hello', Object.assign(myCharacter(), { resync: 1 })); };
  N.inputAge = () => { let a = 1e9; for (const G of N.guests.values()) if (G.remote.t) a = Math.min(a, performance.now() - G.remote.t); return a; };
  N.inputAgeOf = (slot) => { const G = guestBySlot(slot); return G && G.remote.t ? performance.now() - G.remote.t : 1e9; };
  GV.net._test = { sendSnapshot, onSnap, guestBegin, host, join };
})();
