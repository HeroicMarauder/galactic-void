// Galactic Void — the web version's backend (Supabase). Gives the standalone build the same three
// services the game uses inside Claude, through the same `window.claude.use(name)` door:
//   'db'   : documents by path (get/set/update/delete/onSnapshot/acquire), collections
//   'user' : the signed-in player (Google), their profile, and profile lookup/search
//   'room' : the lobby (who's online, invites, join requests), on a Realtime channel
// Gameplay itself stays peer-to-peer (p2p.js). Active only in the standalone build with a config.
(function () {
  const GV = (window.GV = window.GV || {});
  const CFG = window.GV_SUPABASE;
  if (!window.GV_STANDALONE || !CFG || !window.supabase) return;
  const sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
  const S = (GV.supa = { sb, session: null, user: null, profile: null, status: 'starting', err: '' });
  const segs = (p) => String(p).split('/');
  const parentOf = (p) => segs(p).slice(0, -1).join('/');
  const idOf = (p) => segs(p).pop();
  const rid = () => Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-4);
  const snapDoc = (path, row) => ({ id: idOf(path), exists: !!row, data: () => (row ? row.data : undefined), metadata: { fromCache: false, hasPendingWrites: false } });
  const fail = (error) => { const e = new Error(error.message || 'db error'); e.code = error.code === '42501' ? 'not_permitted' : error.code === 'P0002' ? 'invalid_argument' : error.code || 'unavailable'; throw e; };

  // ---------------- realtime routing ----------------
  // one channel per watched path/collection for inserts & updates (filtered server side); deletes
  // carry only the primary key, so one shared channel receives them and routes by path here.
  const delWatch = new Map(); let delCh = null;
  function onDelete(key, fn) {
    if (!delCh) delCh = sb.channel('gv-del-' + rid()).on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'gv_docs' }, (m) => {
      const p = m.old && m.old.path; if (!p) return;
      for (const [k, f] of delWatch) if (k === p || k === 'c:' + parentOf(p)) f(p);
    }).subscribe();
    delWatch.set(key, fn); return () => delWatch.delete(key);
  }
  const watchers = new Map(); // key -> Set(fn) so several watchers of one key share a channel
  function watch(filter, key, fn) {
    let w = watchers.get(key);
    if (!w) {
      w = { fns: new Set(), ch: null };
      w.ch = sb.channel('gv-w-' + rid()).on('postgres_changes', { event: '*', schema: 'public', table: 'gv_docs', filter }, (m) => { for (const f of w.fns) f(m); }).subscribe();
      w.offDel = onDelete(key, () => { for (const f of w.fns) f({ eventType: 'DELETE' }); });
      watchers.set(key, w);
    }
    w.fns.add(fn);
    return () => { w.fns.delete(fn); if (!w.fns.size) { sb.removeChannel(w.ch); w.offDel(); watchers.delete(key); } };
  }

  // ---------------- db ----------------
  function docRef(path) {
    const r = {
      id: idOf(path), path,
      get: async () => { const { data, error } = await sb.from('gv_docs').select('data').eq('path', path).maybeSingle(); if (error) fail(error); return snapDoc(path, data); },
      set: async (d) => { const { error } = await sb.from('gv_docs').upsert({ path, parent: parentOf(path), id: idOf(path), data: d }); if (error) fail(error); },
      update: async (d) => { const { error } = await sb.rpc('gv_update', { p: path, patch: d }); if (error) fail(error); },
      delete: async () => { const { error } = await sb.from('gv_docs').delete().eq('path', path); if (error) fail(error); },
      acquire: async (o = {}) => { const { data, error } = await sb.rpc('gv_acquire', { p: path, h: String(o.holder || 'tab'), ttl_ms: o.ttlMs || 1500 }); if (error) return { acquired: false }; return { acquired: !!(data && data.acquired) }; },
      onSnapshot: (next, err) => {
        let dead = false, n = 0;
        const pull = async () => { const my = ++n; try { const s = await r.get(); if (!dead && my === n) next(s); } catch (e) { if (!dead && err) err(e); } };
        pull();
        const off = watch(`path=eq.${path}`, 'd:' + path, (m) => { if (m.eventType === 'DELETE') { if (!dead) next(snapDoc(path, null)); } else if (m.new && m.new.data !== undefined && !dead) next(snapDoc(path, { data: m.new.data })); else pull(); });
        return () => { dead = true; off(); };
      },
      collection: (p) => colRef(path + '/' + p),
    };
    return r;
  }
  function colRef(path) {
    let lim = 1000;
    const run = async () => {
      const { data, error } = await sb.from('gv_docs').select('id,data,updated_at').eq('parent', path).order('updated_at', { ascending: true }).limit(lim);
      if (error) fail(error);
      const docs = (data || []).map((row) => ({ id: row.id, exists: true, data: () => row.data, metadata: { fromCache: false } }));
      return { docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false } };
    };
    const c = {
      path,
      doc: (id) => docRef(path + '/' + (id || rid())),
      add: async (d) => { const ref = docRef(path + '/' + rid()); await ref.set(d); return ref; },
      limit: (n) => { lim = Math.max(1, Math.min(1000, n | 0)); return c; },
      where: () => c, orderBy: () => c,
      get: run,
      onSnapshot: (next, err) => {
        let dead = false, n = 0, t = null;
        const pull = async () => { const my = ++n; try { const s = await run(); if (!dead && my === n) next(s); } catch (e) { if (!dead && err) err(e); } };
        pull();
        // bursts of changes (a bank withdrawal is a delete + a log write) collapse into one refresh
        const off = watch(`parent=eq.${path}`, 'c:' + path, () => { clearTimeout(t); t = setTimeout(pull, 60); });
        return () => { dead = true; clearTimeout(t); off(); };
      },
    };
    return c;
  }
  const db = { doc: docRef, collection: colRef };

  // ---------------- user ----------------
  const user = {
    id: async () => (S.user ? S.user.id : null),
    me: async () => (S.user ? { id: S.user.id, name: (S.profile && S.profile.name) || 'Pilot', avatarUrl: (S.profile && S.profile.avatar_url) || '' } : null),
    profiles: async (ids) => {
      const want = [...new Set((ids || []).filter((x) => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x)))];
      if (!want.length) return {};
      const { data } = await sb.from('gv_profiles').select('id,name,avatar_url').in('id', want);
      return Object.fromEntries((data || []).map((p) => [p.id, { name: p.name, avatarUrl: p.avatar_url || '', color: '#8fe9ff' }]));
    },
    search: async (q) => {
      q = String(q || '').trim().replace(/[%_,()]/g, ''); if (q.length < 2) return [];
      const { data } = await sb.from('gv_profiles').select('id,name,avatar_url').ilike('name', `%${q}%`).limit(20);
      return (data || []).map((p) => ({ id: p.id, name: p.name, avatarUrl: p.avatar_url || '' }));
    },
  };

  // ---------------- lobby ----------------
  function makeLobby() {
    const me = 'tab-' + rid(), handlers = {}, peerFns = [], connFns = [];
    let pres = {}, ok = false;
    const ch = sb.channel('gv-lobby', { config: { presence: { key: me }, broadcast: { self: false } } });
    const list = () => {
      const st = ch.presenceState(), out = [];
      for (const [k, metas] of Object.entries(st)) { const m = metas[metas.length - 1] || {}; out.push({ peer: k, isMe: k === me, sameTab: k === me, by: m.by || null, presence: k === me ? pres : m.p || {} }); }
      if (!out.some((p) => p.isMe)) out.unshift({ peer: me, isMe: true, sameTab: true, by: S.user && S.user.id, presence: pres });
      return out;
    };
    let known = new Map();
    const firePeers = () => {
      const ps = list(), now = new Map(ps.map((p) => [p.peer, p]));
      const joined = ps.filter((p) => !known.has(p.peer)), left = [...known.values()].filter((p) => !now.has(p.peer));
      known = now;
      for (const f of peerFns) try { f({ peers: ps, joined, left }); } catch (e) { console.error(e); }
    };
    ch.on('presence', { event: 'sync' }, firePeers);
    ch.on('broadcast', { event: 'm' }, ({ payload }) => {
      const m = payload || {}; if (!m.topic || m.from === me) return;
      for (const f of handlers[m.topic] || []) try { f({ topic: m.topic, data: m.data, peer: m.from, by: m.by || null, isMe: false, sameTab: false }); } catch (e) { console.error(e); }
    });
    let lastTrack = 0, trackT = null;
    const track = () => { clearTimeout(trackT); const wait = Math.max(0, 400 - (Date.now() - lastTrack)); trackT = setTimeout(() => { lastTrack = Date.now(); if (ok) ch.track({ by: S.user && S.user.id, p: pres }); }, wait); };
    ch.subscribe((st) => { ok = st === 'SUBSCRIBED'; for (const f of connFns) f(ok); if (ok) track(); });
    return {
      emit: async (topic, data) => { if (ok) await ch.send({ type: 'broadcast', event: 'm', payload: { topic, data, from: me, by: S.user && S.user.id } }); },
      on: (topic, fn) => { (handlers[topic] = handlers[topic] || []).push(fn); return () => { handlers[topic] = handlers[topic].filter((f) => f !== fn); }; },
      presence: async (patch) => { pres = Object.assign({}, pres, patch); track(); firePeers(); },
      peers: list, onPeers: (fn) => { peerFns.push(fn); return () => {}; },
      connected: () => ok, onConnection: (fn) => { connFns.push(fn); return () => {}; },
      join: (n) => GV.p2p.join(n),
    };
  }
  let lobby = null;

  // ---------------- sign-in ----------------
  const ready = (async () => {
    try {
      const { data } = await sb.auth.getSession();
      S.session = data.session; S.user = data.session ? data.session.user : null;
      if (S.user) { const { data: p } = await sb.from('gv_profiles').select('name,avatar_url').eq('id', S.user.id).maybeSingle(); S.profile = p || null; }
      // the sign-in callback leaves ?code= in the address: tidy it away
      if (/[?&]code=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
      S.status = S.user ? 'in' : 'out';
    } catch (e) { S.status = 'error'; S.err = String(e.message || e); }
    document.dispatchEvent(new CustomEvent('gv-auth'));
  })();
  const inFrame = (() => { try { return window.top !== window.self; } catch (e) { return true; } })();
  const authPage = () => new URL('auth.html', location.href).href;
  S.signIn = async () => {
    if (!inFrame) {
      // its own website: sign in right here, Google sends us back to this page
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
      if (error) { S.err = error.message; document.dispatchEvent(new CustomEvent('gv-auth')); }
      return;
    }
    // inside a frame (itch.io): Google won't show in frames, so sign in through a small window
    const w = window.open(authPage() + '?start=1', 'gv-signin', 'width=480,height=640');
    if (!w) { S.err = 'Allow pop-ups for this page to sign in.'; document.dispatchEvent(new CustomEvent('gv-auth')); }
  };
  addEventListener('message', async (e) => {
    if (e.origin !== location.origin || !e.data || !e.data.gvAuth) return;
    const t = e.data.gvAuth; const { error } = await sb.auth.setSession({ access_token: t.access_token, refresh_token: t.refresh_token });
    if (!error) location.reload();
  });
  S.signOut = async () => { try { await sb.auth.signOut(); } catch (e) {} location.reload(); };
  sb.auth.onAuthStateChange((ev, session) => { if (ev === 'TOKEN_REFRESHED' || ev === 'SIGNED_IN') { S.session = session; S.user = session ? session.user : S.user; } });

  // the same door the game uses inside Claude
  const downloads = { save: async ({ filename, data }) => { const url = URL.createObjectURL(new Blob([data], { type: 'application/json' })); const a = Object.assign(document.createElement('a'), { href: url, download: filename }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); } };
  window.claude = window.claude || {
    use: async (n) => {
      if (n === 'downloads') return downloads;
      await ready;
      if (!S.user) return null;
      if (n === 'db') return db;
      if (n === 'user') return user;
      if (n === 'room') return (lobby = lobby || makeLobby());
      return null;
    },
  };
  S.ready = ready;
})();
