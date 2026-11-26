// Galactic Void — guilds: shared roster, guild bank, treasury and activity log.
//
// Guild data lives in the artifact's shared store, so everyone the game is shared with sees the same
// guilds. Layout:
//   guilds/<gid>                      name, tag, colour, emblem, leader, motd, open, limits, tab locks, cap, size
//   guilds/<gid>/members/<userId>     role (leader | officer | member), joined, contrib, daily withdraw counters
//   guilds/<gid>/bank/<entryId>       one stored thing (same entry shape as the personal vault)
//   guilds/<gid>/requests/<userId>    a join request for an invite-only guild
//   guilds/<gid>/meta/treasury        { mem, xp }
//   guilds/<gid>/meta/log             { list: [last 60 events] }
//   guildnames/<slug>                 { gid } so two guilds can't share a name
//   ginvites/<userId>/g/<gid>         an invite waiting for that player
// Withdrawals take a short lease on the entry first, so two people can't take the same item.
// Roles and limits are enforced by the game, which is fine among friends sharing a game.
(function () {
  const GV = window.GV, M = GV.menus, esc = M.esc, V = GV.vault;
  const EMBLEMS = ['✦', '☄', '⬡', '◈', '⚔', '☾', '✧', '♜', '⛨', '❂', '✺', '♆'];
  const COLORS = ['#8fe9ff', '#ff6a7a', '#ffd36b', '#7dffb0', '#c38bff', '#ff9a4a', '#6fb8ff', '#ff8ad8'];
  const ROLE = { leader: 3, officer: 2, member: 1 };
  const ROLENAME = { leader: 'Leader', officer: 'Officer', member: 'Member' };
  const day = () => new Date().toISOString().slice(0, 10);
  const use = async (n) => { if (n === 'db' && window.__gvMockDb) return window.__gvMockDb; if (n === 'user' && window.__gvMockUser) return window.__gvMockUser; try { return window.claude && window.claude.use ? await window.claude.use(n) : null; } catch (e) { return null; } };

  const G = (GV.guild = { ready: false, id: null, g: null, members: {}, bank: [], treasury: { mem: 0, xp: 0 }, log: [], requests: [], invites: [], list: [], myId: null, err: '' });
  let db = null, U = null, subs = [];
  const main = () => GV.save.main || GV.save.data;
  const gref = (gid) => db.doc('guilds/' + gid);
  const sub = (gid, p) => db.collection('guilds/' + gid + '/' + p);
  const meta = (gid, k) => db.doc('guilds/' + gid + '/meta/' + k);
  const changed = () => { if (GV.guild.onChange) GV.guild.onChange(); refreshOpen(); };

  // ---------------- boot & subscriptions ----------------
  async function boot() {
    db = await use('db'); U = await use('user');
    G.myId = U ? await U.id() : null;
    if (!db || typeof db.collection !== 'function' || !G.myId) { G.err = GV.standalone ? 'Guilds live in the Claude version of the game (they need its shared database).' : 'Guilds need the game open in Claude, signed in.'; return; }
    G.ready = true;
    if (main().guild) watch(main().guild);
    db.collection('ginvites/' + G.myId + '/g').onSnapshot((s) => { G.invites = s.docs.map((x) => Object.assign({ gid: x.id }, x.data())).filter((x) => typeof x.name === 'string'); changed(); }, () => {});
  }
  addEventListener('load', () => setTimeout(boot, 400));
  function unwatch() { for (const u of subs) try { u(); } catch (e) {} subs = []; G.id = null; G.g = null; G.members = {}; G.bank = []; G.log = []; G.requests = []; G.treasury = { mem: 0, xp: 0 }; }
  function watch(gid) {
    unwatch(); G.id = gid;
    let seenMe = false;
    subs.push(gref(gid).onSnapshot((s) => { if (!s.exists && s.metadata && !s.metadata.fromCache) { leftGuild('This guild has been disbanded.'); return; } G.g = s.exists ? s.data() : null; changed(); }, () => {}));
    subs.push(sub(gid, 'members').onSnapshot((s) => {
      const m = {}; for (const x of s.docs) { const v = x.data(); if (v && ROLE[v.role]) m[x.id] = v; }
      G.members = m;
      if (m[G.myId]) seenMe = true;
      else if (seenMe && !s.metadata.fromCache) return leftGuild('You are no longer in the guild.');
      changed();
    }, () => {}));
    subs.push(sub(gid, 'bank').onSnapshot((s) => { G.bank = s.docs.map((x) => Object.assign({}, x.data(), { id: x.id })).filter((e) => V.valid(e)); changed(); V.refresh(); }, () => {}));
    subs.push(sub(gid, 'requests').onSnapshot((s) => { G.requests = s.docs.map((x) => Object.assign({ uid: x.id }, x.data())); changed(); }, () => {}));
    subs.push(meta(gid, 'treasury').onSnapshot((s) => { const v = s.exists ? s.data() : {}; G.treasury = { mem: +v.mem || 0, xp: +v.xp || 0 }; changed(); V.refresh(); }, () => {}));
    subs.push(meta(gid, 'log').onSnapshot((s) => { const v = s.exists ? s.data() : {}; G.log = Array.isArray(v.list) ? v.list.slice(-60) : []; changed(); }, () => {}));
  }
  function leftGuild(msg) {
    unwatch(); main().guild = null; GV.save.write();
    if (GV.friends) GV.friends.publish && GV.friends.publish();
    G.err = msg; changed();
  }
  G.me = () => G.members[G.myId] || null;
  G.rank = () => (G.me() ? ROLE[G.me().role] : 0);
  G.level = () => 1 + Math.floor(Math.sqrt((G.treasury.xp || 0) / 150));
  G.cap = () => Math.min(400, (+(G.g && G.g.cap) || 100) + (G.level() - 1) * 10);

  // ---------------- leased read-modify-write ----------------
  let q = Promise.resolve();
  const TAB = 'tab-' + Math.random().toString(36).slice(2, 10); // per tab, so two of your own tabs can't both win
  const serial = (fn) => (q = q.then(fn, fn));
  async function locked(ref, fn) {
    for (let i = 0; i < 16; i++) {
      const r = await ref.acquire({ holder: TAB, ttlMs: 1500 }).catch(() => ({ acquired: false }));
      if (r.acquired) { const s = await ref.get(); return fn(s.exists ? s.data() : null); }
      await new Promise((res) => setTimeout(res, 150 + Math.random() * 250));
    }
    throw new Error('busy');
  }
  function log(text) {
    if (!G.id) return;
    const gid = G.id;
    serial(() => locked(meta(gid, 'log'), (v) => { const list = (v && Array.isArray(v.list) ? v.list : []).concat([{ t: Date.now(), by: G.myId, text: String(text).slice(0, 120) }]).slice(-60); return meta(gid, 'log').set({ list }); }).catch(() => {}));
  }
  function addXp(n) {
    if (!G.id || !(n > 0)) return;
    const gid = G.id;
    serial(() => locked(meta(gid, 'treasury'), (v) => meta(gid, 'treasury').set({ mem: +(v && v.mem) || 0, xp: (+(v && v.xp) || 0) + Math.round(n) })).catch(() => {}));
  }
  const bumpSize = (gid, d) => locked(gref(gid), (v) => (v ? gref(gid).update({ size: Math.max(0, (+v.size || 0) + d) }) : null)).catch(() => {});

  // ---------------- actions ----------------
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  // Founding a guild is earned: a seasoned rank, your own ship, a Titan felled, and a founding fee.
  G.CREATE_COST = 2000; G.CREATE_RANK = 15;
  G.createReqs = function () {
    const d = main(), felled = Object.values(d.titans || {}).reduce((a, n) => a + (+n || 0), 0);
    return [
      { label: `Rank ${G.CREATE_RANK}`, have: `Rank ${d.level || 1}`, ok: (d.level || 1) >= G.CREATE_RANK },
      { label: 'Found the Lantern', have: d.shipFound ? 'Done' : 'Clear Sector I', ok: !!d.shipFound },
      { label: 'Fell a Titan', have: felled ? `${felled} felled` : 'None yet', ok: felled > 0 },
      { label: `✦ ${G.CREATE_COST} founding fee`, have: `✦ ${d.memories || 0}`, ok: (d.memories || 0) >= G.CREATE_COST },
    ];
  };
  G.canCreate = () => G.createReqs().every((r) => r.ok);
  G.create = async function ({ name, tag, color, emblem }) {
    name = String(name || '').trim().replace(/\s+/g, ' '); tag = String(tag || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (name.length < 3 || name.length > 24) return 'Names are 3 to 24 characters.';
    if (tag.length < 2 || tag.length > 4) return 'Tags are 2 to 4 letters or numbers.';
    { const miss = G.createReqs().find((r) => !r.ok); if (miss) return `Not yet: ${miss.label} (you have ${miss.have}).`; }
    if (main().guild) return 'Leave your current guild first.';
    const s = slug(name); if (!s) return 'Pick a name with some letters in it.';
    const gid = s + '-' + Math.random().toString(36).slice(2, 6);
    const nref = db.doc('guildnames/' + s);
    try {
      const taken = await locked(nref, async (v) => { if (v && v.gid) { const g = await gref(v.gid).get(); if (g.exists) return true; } await nref.set({ gid }); return false; });
      if (taken) return 'A guild already has that name.';
      await gref(gid).set({ name, tag, color: COLORS.includes(color) ? color : COLORS[0], emblem: EMBLEMS.includes(emblem) ? emblem : EMBLEMS[0], leader: G.myId, created: Date.now(), size: 1,
        motd: 'Welcome aboard. Stash what you can spare, take what you need.', open: true, cap: 100, limits: { items: 5, mem: 500 }, locks: { prized: 'officer' }, upgrades: {} });
      await sub(gid, 'members').doc(G.myId).set({ role: 'leader', joined: Date.now(), contrib: 0 });
      await meta(gid, 'treasury').set({ mem: 0, xp: 0 });
      main().memories -= G.CREATE_COST; main().guild = gid; GV.save.write();
      watch(gid); log('founded the guild'); GV.friends && GV.friends.publish && GV.friends.publish();
      return null;
    } catch (e) { return 'The guild store is busy. Try again in a moment.'; }
  };
  G.browse = async function () {
    if (!db) return [];
    const s = await db.collection('guilds').limit(200).get().catch(() => null);
    G.list = s ? s.docs.map((x) => Object.assign({ gid: x.id }, x.data())).filter((g) => typeof g.name === 'string' && typeof g.tag === 'string') : [];
    return G.list;
  };
  async function joinAs(gid, role) {
    await sub(gid, 'members').doc(G.myId).set({ role, joined: Date.now(), contrib: 0 });
    await bumpSize(gid, 1);
    main().guild = gid; GV.save.write(); watch(gid); log('joined the guild');
    GV.friends && GV.friends.publish && GV.friends.publish();
  }
  G.join = async function (gid) {
    if (main().guild) return 'Leave your current guild first.';
    const s = await gref(gid).get(); if (!s.exists) return 'That guild is gone.';
    const g = s.data(), inv = G.invites.find((x) => x.gid === gid);
    if (g.open || inv) { await joinAs(gid, 'member'); if (inv) db.doc(`ginvites/${G.myId}/g/${gid}`).delete().catch(() => {}); return null; }
    await sub(gid, 'requests').doc(G.myId).set({ at: Date.now(), cls: GV.save.data.cls || '', rank: GV.save.data.level || 1 });
    return 'Request sent. An officer will let you in.';
  };
  G.declineInvite = (gid) => db.doc(`ginvites/${G.myId}/g/${gid}`).delete().catch(() => {});
  G.leave = async function () {
    const gid = G.id; if (!gid) return;
    const me = G.me(), others = Object.keys(G.members).filter((u) => u !== G.myId);
    if (me && me.role === 'leader') {
      if (others.length) {
        const heir = others.sort((a, b) => (ROLE[G.members[b].role] - ROLE[G.members[a].role]) || (G.members[a].joined - G.members[b].joined))[0];
        await sub(gid, 'members').doc(heir).update({ role: 'leader' }).catch(() => {});
        await gref(gid).update({ leader: heir }).catch(() => {});
      } else {
        // the last one out turns off the lights
        const g = G.g; await gref(gid).delete().catch(() => {});
        if (g) db.doc('guildnames/' + slug(g.name)).delete().catch(() => {});
      }
    }
    log('left the guild');
    await sub(gid, 'members').doc(G.myId).delete().catch(() => {});
    if (others.length) await bumpSize(gid, -1);
    leftGuild('');
  };
  G.invite = async function (uid) {
    if (G.rank() < 2 || !uid || G.members[uid]) return;
    await db.doc(`ginvites/${uid}/g/${G.id}`).set({ name: G.g.name, tag: G.g.tag, color: G.g.color, emblem: G.g.emblem, by: G.myId, at: Date.now() });
    log('sent an invite');
  };
  G.approve = async function (uid, yes) {
    if (G.rank() < 2) return;
    await sub(G.id, 'requests').doc(uid).delete().catch(() => {});
    if (yes) { await sub(G.id, 'members').doc(uid).set({ role: 'member', joined: Date.now(), contrib: 0 }); await bumpSize(G.id, 1); log('let a new member in'); }
  };
  G.setRole = async function (uid, role) {
    const me = G.me(); if (!me || !ROLE[role] || !G.members[uid] || uid === G.myId) return;
    if (role === 'leader') { if (me.role !== 'leader') return; await sub(G.id, 'members').doc(uid).update({ role: 'leader' }); await sub(G.id, 'members').doc(G.myId).update({ role: 'officer' }); await gref(G.id).update({ leader: uid }); log('handed leadership over'); return; }
    if (me.role !== 'leader') return;
    await sub(G.id, 'members').doc(uid).update({ role }); log(role === 'officer' ? 'promoted someone to officer' : 'made someone a member');
  };
  G.kick = async function (uid) {
    const t = G.members[uid]; if (!t || uid === G.myId || G.rank() <= ROLE[t.role]) return;
    await sub(G.id, 'members').doc(uid).delete(); await bumpSize(G.id, -1); log('removed a member');
  };
  G.settings = async function (patch) {
    if (G.rank() < 2) return;
    const ok = {};
    if (typeof patch.motd === 'string') ok.motd = patch.motd.slice(0, 200);
    if (G.rank() >= 3) {
      if (typeof patch.open === 'boolean') ok.open = patch.open;
      if (patch.color && COLORS.includes(patch.color)) ok.color = patch.color;
      if (patch.emblem && EMBLEMS.includes(patch.emblem)) ok.emblem = patch.emblem;
      if (patch.limits) ok.limits = { items: Math.max(0, Math.min(99, +patch.limits.items || 0)), mem: Math.max(0, Math.min(99999, +patch.limits.mem || 0)) };
      if (patch.locks) ok.locks = Object.fromEntries(Object.entries(patch.locks).filter(([t, r]) => V.TABS.some((x) => x.id === t) && (r === 'officer' || r === 'member')));
    }
    if (Object.keys(ok).length) await gref(G.id).update(ok);
  };
  // Hall upgrades, paid from the treasury.
  G.UPGRADES = {
    bank: { name: 'Bank wing', max: 6, cost: (lv) => 800 + lv * 600, desc: (lv) => `+25 bank slots (${100 + lv * 25} now)` },
    ring: { name: 'Sparring ring lights', max: 3, cost: (lv) => 600 + lv * 500, desc: () => 'More sparring holograms and arena hazards' },
    trophy: { name: 'Trophy wall', max: 5, cost: (lv) => 400 + lv * 400, desc: () => 'Shows your guild\'s Titan kills in the hall' },
  };
  G.buyUpgrade = async function (k) {
    const U2 = G.UPGRADES[k]; if (!U2 || G.rank() < 3) return 'Only the leader spends the treasury.';
    const lv = +((G.g.upgrades || {})[k] || 0); if (lv >= U2.max) return 'Already maxed.';
    const c = U2.cost(lv);
    try {
      const err = await locked(meta(G.id, 'treasury'), async (v) => { const mem = +(v && v.mem) || 0; if (mem < c) return 'The treasury is short.'; await meta(G.id, 'treasury').set({ mem: mem - c, xp: +(v && v.xp) || 0 }); return null; });
      if (err) return err;
      const up = Object.assign({}, G.g.upgrades || {}, { [k]: lv + 1 });
      await gref(G.id).update(k === 'bank' ? { upgrades: up, cap: 100 + (lv + 1) * 25 } : { upgrades: up });
      log(`bought ${U2.name} ${lv + 1}`); return null;
    } catch (e) { return 'Busy, try again.'; }
  };

  // ---------------- the guild bank, as a vault store ----------------
  function allowance() {
    const me = G.me() || {}, lim = (G.g && G.g.limits) || { items: 5, mem: 500 };
    const today = me.day === day();
    return { items: G.rank() >= 2 ? Infinity : Math.max(0, lim.items - (today ? me.took || 0 : 0)), mem: G.rank() >= 2 ? Infinity : Math.max(0, lim.mem - (today ? me.memTook || 0 : 0)) };
  }
  async function noteTake(items, mem) {
    if (G.rank() >= 2) return;
    const r = sub(G.id, 'members').doc(G.myId), me = G.me() || {}, today = me.day === day();
    await r.update({ day: day(), took: (today ? me.took || 0 : 0) + items, memTook: (today ? me.memTook || 0 : 0) + mem }).catch(() => {});
  }
  const profCache = {}, inflight = new Set();
  G.nameOf = async (uid) => { if (!U || !uid) return ''; if (!(uid in profCache)) profCache[uid] = U.profiles([uid]).then((p) => (p[uid] && p[uid].name) || '').catch(() => ''); return profCache[uid]; };
  G.store = {
    get title() { return G.g ? `${G.g.name} · Guild Bank` : 'Guild Bank'; },
    kind: 'guild',
    list: () => G.bank,
    cap: () => G.cap(),
    mem: () => G.treasury.mem,
    nameOf: G.nameOf,
    banner() {
      const a = allowance(), locks = (G.g && G.g.locks) || {};
      const lockTxt = Object.keys(locks).filter((t) => locks[t] === 'officer').map((t) => (V.TABS.find((x) => x.id === t) || {}).name).filter(Boolean);
      return `<p class="gbank-note">${G.rank() >= 2 ? 'Officers withdraw freely.' : `Today you can take ${a.items} more item${a.items === 1 ? '' : 's'} and ${a.mem} ✦.`}${lockTxt.length ? ` Officers only: ${esc(lockTxt.join(', '))}.` : ''} Everyone can deposit.</p>`;
    },
    canTake(e) {
      const locks = (G.g && G.g.locks) || {}, t = V.tabOf(e);
      if (locks[t] === 'officer' && G.rank() < 2) return 'Only officers can take from that tab.';
      if (e.k !== 'cur' && allowance().items < 1) return 'You\'ve reached today\'s withdrawal limit.';
      return null;
    },
    async put(e) {
      if (!G.id) return 'You are not in a guild.';
      if (e.k !== 'cur' && V.slots(G.bank) >= G.cap()) return 'The guild bank is full.';
      const body = Object.assign({}, e, { by: G.myId, at: Date.now() }); delete body.id;
      try {
        if (e.k === 'cur') {
          const ex = G.bank.find((x) => x.k === 'cur' && x.c === e.c);
          if (ex) { const ref = sub(G.id, 'bank').doc(ex.id); const err = await locked(ref, async (v) => { if (!v) return 'retry'; await ref.update({ n: (+v.n || 0) + e.n, at: Date.now() }); return null; }); if (!err) { log(`deposited ${e.n} ${V.name(e)}`); addXp(e.n * 3); return null; } }
        }
        await sub(G.id, 'bank').doc(e.id).set(body);
        log(`deposited ${V.name(e)}`); addXp(e.k === 'item' ? GV.items.value(e.o) : 6);
        contrib(e.k === 'item' ? GV.items.value(e.o) : 6);
        return null;
      } catch (x) { return 'Could not reach the guild bank.'; }
    },
    async take(id, n) {
      const ref = sub(G.id, 'bank').doc(id);
      if (inflight.has(id)) return 'Already on its way.';
      inflight.add(id);
      try {
        const got = await locked(ref, async (v) => {
          if (!v || !V.valid(v)) return null;
          if (v.k === 'cur' && n && n < v.n) { await ref.update({ n: v.n - n }); return Object.assign({}, v, { n }); }
          await ref.delete(); return v;
        });
        if (got) { log(`took ${got.k === 'cur' ? got.n + ' ' : ''}${V.name(got)}`); await noteTake(got.k === 'cur' ? 0 : 1, 0); }
        return got;
      } catch (x) { return 'Someone else is using that. Try again.'; } finally { inflight.delete(id); }
    },
    async putMem(n) {
      try { await locked(meta(G.id, 'treasury'), (v) => meta(G.id, 'treasury').set({ mem: (+(v && v.mem) || 0) + n, xp: (+(v && v.xp) || 0) + Math.round(n / 4) })); log(`added ${n} ✦ to the treasury`); contrib(Math.round(n / 4)); return null; } catch (e) { return 'The treasury is busy.'; }
    },
    async takeMem(n) {
      if (allowance().mem < n) return `You can take ${allowance().mem} ✦ more today.`;
      try {
        const err = await locked(meta(G.id, 'treasury'), async (v) => { const mem = +(v && v.mem) || 0; if (mem < n) return 'The treasury doesn\'t have that much.'; await meta(G.id, 'treasury').set({ mem: mem - n, xp: +(v && v.xp) || 0 }); return null; });
        if (!err) { log(`took ${n} ✦ from the treasury`); await noteTake(0, n); }
        return err;
      } catch (e) { return 'The treasury is busy.'; }
    },
    save() { GV.save.write(); },
  };
  function contrib(n) { const r = sub(G.id, 'members').doc(G.myId), me = G.me(); if (me) r.update({ contrib: (me.contrib || 0) + n }).catch(() => {}); }
  G.openBank = (back) => { if (!G.id) return M.guild(back); V.open(G.store, back || (() => M.guild())); };

  // ---------------- the Guild screen ----------------
  let view = 'roster', backFn = () => M.map(), msg = '', browseQ = '', form = { name: '', tag: '', color: COLORS[0], emblem: EMBLEMS[0] };
  function refreshOpen() { if (document.querySelector('#ui .guildui') && !document.activeElement.matches('#ui .guildui input, #ui .guildui textarea')) draw(); }
  M.guild = function (back) { if (back) backFn = back; if (GV.tips) GV.tips.show('guild'); msg = msg || G.err; G.err = ''; if (!G.id && G.ready) G.browse().then(() => { if (document.querySelector('#ui .guildui')) draw(); }); draw(); };
  const tagHtml = (g) => `<span class="gtag" style="--gc:${COLORS.includes(g.color) ? g.color : COLORS[0]}">${EMBLEMS.includes(g.emblem) ? g.emblem : '✦'} [${esc(g.tag)}]</span>`;
  async function nameFill() {
    const els = [...document.querySelectorAll('#ui .guildui [data-uid]')]; if (!els.length || !U) return;
    const ids = [...new Set(els.map((e) => e.dataset.uid))]; const ps = await U.profiles(ids).catch(() => ({}));
    els.forEach((e) => { const p = ps[e.dataset.uid]; if (e.tagName === 'IMG') { if (p && p.avatarUrl) e.src = p.avatarUrl; else e.remove(); } else e.textContent = (p && p.name) || 'Someone'; });
  }
  function draw() {
    if (!G.ready) { M.render(`<div class="screen panel guildui"><h2>Guilds</h2><p class="muted">${esc(G.err || 'Connecting to the guild registry…')}</p><div class="menu row"><button data-a="back">Back</button></div></div>`, (a) => a === 'back' && backFn(), backFn); return; }
    if (!G.id) return drawNoGuild();
    if (!G.g) { M.render(`<div class="screen panel guildui"><h2>Guild</h2><p class="muted">Loading your guild…</p><div class="menu row"><button data-a="back">Back</button></div></div>`, (a) => a === 'back' && backFn(), backFn); return; }
    const g = G.g, me = G.me() || { role: 'member' }, rk = G.rank();
    const online = new Set(GV.friends ? GV.friends.online().map((p) => p.by) : []);
    const ids = Object.keys(G.members).sort((a, b) => (ROLE[G.members[b].role] - ROLE[G.members[a].role]) || ((online.has(b) ? 1 : 0) - (online.has(a) ? 1 : 0)) || (G.members[b].contrib || 0) - (G.members[a].contrib || 0));
    const views = [['roster', `Roster (${ids.length})`], ['bank', 'Guild Bank'], ...(rk >= 2 ? [['requests', `Requests${G.requests.length ? ` <b class="pts">${G.requests.length}</b>` : ''}`]] : []), ['hall', 'Hall upgrades'], ...(rk >= 2 ? [['settings', 'Settings']] : []), ['log', 'Activity']];
    let body = '';
    if (view === 'roster') body = ids.map((u) => {
      const m = G.members[u], on = online.has(u) || u === G.myId, acts = [];
      if (u !== G.myId) {
        if (me.role === 'leader') { if (m.role === 'member') acts.push(`<button data-g="role" data-u="${esc(u)}" data-r="officer">Promote</button>`); if (m.role === 'officer') acts.push(`<button data-g="role" data-u="${esc(u)}" data-r="member">Demote</button>`, `<button data-g="role" data-u="${esc(u)}" data-r="leader">Make leader</button>`); }
        if (rk > ROLE[m.role]) acts.push(`<button class="ghost" data-g="kick" data-u="${esc(u)}">Remove</button>`);
        if (GV.friends && !GV.friends.isFriend(u)) acts.push(`<button data-g="friend" data-u="${esc(u)}">Add friend</button>`);
        const pe = GV.friends && GV.friends.online().find((q) => q.by === u); if (pe && pe.presence.st === 'hosting' && pe.presence.code) acts.unshift(`<button class="primary" data-g="joinhall" data-c="${esc(String(pe.presence.code))}">${pe.presence.hall ? 'Board their hall' : 'Join'}</button>`);
      }
      const pp = GV.friends && GV.friends.online().find((q) => q.by === u), where = pp && pp.presence.hall ? 'on their deck' : on ? 'online' : 'offline';
      return `<div class="frow ${on ? 'on' : ''}"><img data-uid="${esc(u)}" alt=""><div class="fi"><b data-uid="${esc(u)}"></b><span>${ROLENAME[m.role]} · ${where} · ${(m.contrib || 0).toLocaleString()} contribution</span></div><div class="fb">${acts.join('')}</div></div>`;
    }).join('') + (rk >= 2 ? `<p class="muted">Invite people from the Friends screen, or share the guild name so they can ${g.open ? 'join' : 'request to join'}.</p>` : '');
    if (view === 'requests') body = G.requests.map((r) => `<div class="frow"><img data-uid="${esc(r.uid)}" alt=""><div class="fi"><b data-uid="${esc(r.uid)}"></b><span>${GV.CLASSES[r.cls] ? esc(GV.CLASSES[r.cls].name) + ' · ' : ''}rank ${+r.rank || 1}</span></div><div class="fb"><button class="primary" data-g="approve" data-u="${esc(r.uid)}">Let in</button><button class="ghost" data-g="deny" data-u="${esc(r.uid)}">Decline</button></div></div>`).join('') || '<p class="muted">No one is waiting.</p>';
    if (view === 'hall') body = `<p class="muted">Paid from the treasury (${G.treasury.mem.toLocaleString()} ✦). Guild level ${G.level()} adds 10 bank slots per level.</p>` + Object.keys(G.UPGRADES).map((k) => {
      const u = G.UPGRADES[k], lv = +((g.upgrades || {})[k] || 0), max = lv >= u.max;
      return `<div class="row"><div class="ri"><b>${esc(u.name)} <i class="slot">Lv ${lv}/${u.max}</i></b><span>${esc(u.desc(lv + 1))}</span></div><button data-g="up" data-k="${k}" ${max || rk < 3 || G.treasury.mem < u.cost(lv) ? 'disabled' : ''}>${max ? 'Maxed' : `✦ ${u.cost(lv)}`}</button></div>`;
    }).join('') + (rk < 3 ? '<p class="muted">Only the leader spends the treasury.</p>' : '');
    if (view === 'settings') {
      const lim = g.limits || {}, locks = g.locks || {};
      body = `<label class="gset">Message of the day<textarea id="gMotd" maxlength="200">${esc(g.motd || '')}</textarea></label><button data-g="motd">Save message</button>
        ${rk >= 3 ? `<div class="gsub">Leader settings</div>
        <label class="tog"><input type="checkbox" id="gOpen" ${g.open ? 'checked' : ''}> Anyone can join (otherwise they request, officers approve)</label>
        <div class="gset">Daily limit for members: <input id="gLimI" type="number" min="0" max="99" value="${+lim.items || 0}"> items · <input id="gLimM" type="number" min="0" max="99999" value="${+lim.mem || 0}"> ✦ <button data-g="limits">Save limits</button></div>
        <div class="gsub">Officers-only bank tabs</div><div class="glocks">${V.TABS.filter((t) => t.id !== 'all').map((t) => `<label class="tog"><input type="checkbox" data-lock="${t.id}" ${locks[t.id] === 'officer' ? 'checked' : ''}> ${esc(t.name)}</label>`).join('')}</div>
        <div class="gsub">Colours</div><div class="gpick">${COLORS.map((c) => `<button class="sw ${g.color === c ? 'sel' : ''}" data-g="color" data-c="${c}" style="background:${c}"></button>`).join('')}</div>
        <div class="gpick">${EMBLEMS.map((e) => `<button class="em ${g.emblem === e ? 'sel' : ''}" data-g="emblem" data-e="${e}">${e}</button>`).join('')}</div>` : ''}`;
    }
    if (view === 'log') body = G.log.slice().reverse().map((l) => `<div class="glog"><b data-uid="${esc(l.by || '')}"></b> ${esc(l.text || '')} <small>${GV.sync.ago ? GV.sync.ago(l.t) : ''}</small></div>`).join('') || '<p class="muted">Nothing yet.</p>';
    M.render(`<div class="screen panel wide guildui">
      <div class="topbar"><h2>${tagHtml(g)} ${esc(g.name)}</h2><div class="stats">Level ${G.level()} · ${ids.length} member${ids.length === 1 ? '' : 's'} · treasury ${G.treasury.mem.toLocaleString()} ✦ · ${V.slots(G.bank)}/${G.cap()} bank</div></div>
      <div class="gmotd" style="--gc:${g.color}">${esc(g.motd || '')}</div>
      ${msg ? `<p class="warn">${esc(msg)}</p>` : ''}
      <div class="tabs">${views.map(([k, n]) => `<button class="tab ${view === k ? 'sel' : ''}" data-g="view" data-v="${k}">${n}</button>`).join('')}</div>
      <div class="gbody">${view === 'bank' ? '<p class="muted">Opening the bank…</p>' : body}</div>
      <div class="menu row">${GV.hall ? '<button class="primary" data-g="hall">Enter the Guild Hall</button>' : ''}<button class="ghost" data-g="leave">${me.role === 'leader' && ids.length === 1 ? 'Disband' : 'Leave guild'}</button><button data-a="back">Back</button></div>
    </div>`, (a) => { if (a === 'back') { msg = ''; backFn(); } }, () => { msg = ''; backFn(); });
    if (view === 'bank') { view = 'roster'; return G.openBank(() => M.guild()); }
    bindG(); nameFill();
  }
  function drawNoGuild() {
    const list = G.list.filter((g) => !browseQ || g.name.toLowerCase().includes(browseQ) || g.tag.toLowerCase().includes(browseQ)).sort((a, b) => (b.size || 0) - (a.size || 0));
    M.render(`<div class="screen panel wide guildui">
      <div class="topbar"><h2>Guilds</h2><div class="stats">✦ ${main().memories}</div></div>
      ${msg ? `<p class="warn">${esc(msg)}</p>` : ''}
      ${G.invites.length ? `<div class="gsub">Invites</div>${G.invites.map((i) => `<div class="frow on"><div class="fi"><b>${tagHtml(i)} ${esc(i.name)}</b><span>Invited by <i data-uid="${esc(i.by || '')}"></i></span></div><div class="fb"><button class="primary" data-g="join" data-id="${esc(i.gid)}">Join</button><button class="ghost" data-g="decline" data-id="${esc(i.gid)}">Decline</button></div></div>`).join('')}` : ''}
      <div class="fcols2">
        <div><div class="gsub">Find a guild</div><input id="gFind" class="fsearch" placeholder="Search guilds" value="${esc(browseQ)}" autocomplete="off">
          ${list.map((g) => `<div class="frow"><div class="fi"><b>${tagHtml(g)} ${esc(g.name)}</b><span>${+g.size || 1} member${(+g.size || 1) === 1 ? '' : 's'} · ${g.open ? 'open' : 'invite or request'}</span></div><div class="fb"><button class="${g.open ? 'primary' : ''}" data-g="join" data-id="${esc(g.gid)}">${g.open ? 'Join' : 'Ask to join'}</button></div></div>`).join('') || '<p class="muted">No guilds yet. Found the first one.</p>'}</div>
        <div><div class="gsub">Found a guild</div>
          <ul class="greqs">${G.createReqs().map((r) => `<li class="${r.ok ? 'ok' : 'no'}"><i>${r.ok ? '✓' : '✕'}</i><b>${esc(r.label)}</b><span>${esc(r.have)}</span></li>`).join('')}</ul>
          <input id="gName" class="fsearch" maxlength="24" placeholder="Guild name" value="${esc(form.name)}"><input id="gTag" class="fsearch gtagin" maxlength="4" placeholder="TAG" value="${esc(form.tag)}">
          <div class="gpick">${COLORS.map((c) => `<button class="sw ${form.color === c ? 'sel' : ''}" data-g="fcolor" data-c="${c}" style="background:${c}"></button>`).join('')}</div>
          <div class="gpick">${EMBLEMS.map((e) => `<button class="em ${form.emblem === e ? 'sel' : ''}" data-g="femblem" data-e="${e}">${e}</button>`).join('')}</div>
          <p class="muted">Preview: ${tagHtml({ tag: (form.tag || 'TAG').toUpperCase(), color: form.color, emblem: form.emblem })} ${esc(form.name || 'Your guild')}</p>
          <button class="primary" data-g="create" ${G.canCreate() ? '' : 'disabled'}>${G.canCreate() ? `Found it · ✦ ${G.CREATE_COST}` : 'Requirements not met'}</button>
          <p class="muted">A guild gets a shared bank with the same self-sorting tabs as your vault, a treasury, roles, and a hall you can walk around with your guildmates.</p></div>
      </div>
      <div class="menu row"><button data-a="back">Back</button></div></div>`, (a) => { if (a === 'back') { msg = ''; backFn(); } }, () => { msg = ''; backFn(); });
    const keep = (id, k) => { const el = document.getElementById(id); if (el) el.addEventListener('input', () => { form[k] = el.value; }); };
    keep('gName', 'name'); keep('gTag', 'tag');
    const f = document.getElementById('gFind'); if (f) f.addEventListener('input', () => { browseQ = f.value.trim().toLowerCase(); const p = f.selectionStart; draw(); const f2 = document.getElementById('gFind'); f2.focus(); f2.setSelectionRange(p, p); });
    bindG(); nameFill();
  }
  function bindG() {
    document.querySelectorAll('#ui .guildui [data-g]').forEach((b) => b.addEventListener('click', async (e) => {
      e.stopPropagation(); GV.audio.sfx('ui');
      const a = b.dataset.g, u = b.dataset.u; msg = '';
      try {
        if (a === 'view') view = b.dataset.v;
        if (a === 'hall' && GV.hall) return GV.hall.enter();
        if (a === 'fcolor') form.color = b.dataset.c;
        if (a === 'femblem') form.emblem = b.dataset.e;
        if (a === 'create') { msg = (await G.create(form)) || ''; if (!msg) { form = { name: '', tag: '', color: COLORS[0], emblem: EMBLEMS[0] }; GV.audio.sfx('level'); } }
        if (a === 'join') { msg = (await G.join(b.dataset.id)) || ''; }
        if (a === 'decline') await G.declineInvite(b.dataset.id);
        if (a === 'leave') { if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = 'Tap again to confirm'; b.classList.add('danger'); return; } await G.leave(); }
        if (a === 'role') await G.setRole(u, b.dataset.r);
        if (a === 'kick') { if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = 'Tap again'; b.classList.add('danger'); return; } await G.kick(u); }
        if (a === 'friend' && GV.friends) GV.friends.add(u);
        if (a === 'joinhall' && GV.net) { await GV.net.join(b.dataset.c); return M.coop(); }
        if (a === 'approve') await G.approve(u, true);
        if (a === 'deny') await G.approve(u, false);
        if (a === 'up') msg = (await G.buyUpgrade(b.dataset.k)) || '';
        if (a === 'motd') await G.settings({ motd: document.getElementById('gMotd').value });
        if (a === 'limits') await G.settings({ limits: { items: document.getElementById('gLimI').value, mem: document.getElementById('gLimM').value } });
        if (a === 'color') await G.settings({ color: b.dataset.c });
        if (a === 'emblem') await G.settings({ emblem: b.dataset.e });
      } catch (x) { msg = 'Something went wrong talking to the guild store. Try again.'; }
      draw();
    }));
    document.querySelectorAll('#ui .guildui [data-lock]').forEach((c) => c.addEventListener('change', () => {
      const locks = {}; document.querySelectorAll('#ui .guildui [data-lock]').forEach((x) => { if (x.checked) locks[x.dataset.lock] = 'officer'; });
      G.settings({ locks });
    }));
    const op = document.getElementById('gOpen'); if (op) op.addEventListener('change', () => G.settings({ open: op.checked }));
  }

  // ---------------- ways in ----------------
  const map0 = M.map;
  M.map = function () {
    const r = map0.apply(this, arguments);
    const row = document.querySelector('#ui .menu.row [data-a=coop]'); if (!row || document.querySelector('#ui [data-a=guildBtn]')) return r;
    const b = document.createElement('button'); b.dataset.a = 'guildBtn';
    b.innerHTML = G.id && G.g ? `${tagHtml(G.g)} Guild${G.rank() >= 2 && G.requests.length ? ` <b class="pts">${G.requests.length}</b>` : ''}` : `Guild${G.invites.length ? ` <b class="pts">${G.invites.length}</b>` : ''}`;
    b.addEventListener('click', (e) => { e.stopPropagation(); GV.audio.sfx('ui'); M.guild(() => M.map()); });
    row.parentNode.insertBefore(b, row.nextSibling);
    return r;
  };
  G.tagHtml = tagHtml;
  G.COLORS = COLORS;
})();
