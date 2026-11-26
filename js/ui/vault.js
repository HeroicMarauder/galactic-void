// Galactic Void — the Vault: a personal bank with tabs that sort themselves.
//
// What can be stored: gear (any rarity, set pieces too), spare Star Cores, free supports, uncut
// cores, crafting currency, Sockets and memories. Weapons are unlocks, not objects, so they stay put.
// The vault belongs to the whole save (Player 1 and a couch Player 2 share it) and syncs with it.
// The same model and screen also drive the guild bank (js/net/guild.js) through a "store" adapter.
(function () {
  const GV = window.GV, M = GV.menus, esc = M.esc;
  const RANK = { normal: 0, magic: 1, rare: 2, nova: 3, unique: 4 };
  const CUR = () => Object.assign({}, GV.CURRENCY, { orb: { name: 'Socket Orb', color: '#9fe8ff' } });

  // ---------------- entries ----------------
  // An entry is { id, k, o } (k: item | core | sup | uncut) or { id, k:'cur', c, n } for stacks.
  const V = (GV.vault = {});
  V.newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  V.TABS = [
    { id: 'all', name: 'All' },
    { id: 'helm', name: 'Helms', icon: '⛑' }, { id: 'suit', name: 'Suits', icon: '⛨' }, { id: 'boots', name: 'Boots', icon: '⇵' }, { id: 'relic', name: 'Relics', icon: '✧' },
    { id: 'prized', name: 'Sets & Singularity', icon: '★' },
    { id: 'cores', name: 'Star Cores', icon: '◆' }, { id: 'sups', name: 'Supports', icon: '◇' }, { id: 'uncut', name: 'Uncut', icon: '⬡' },
    { id: 'mats', name: 'Materials', icon: '⚗' },
  ];
  V.tabOf = (e) => {
    if (e.k === 'item') return e.o.set || e.o.rarity === 'unique' ? 'prized' : e.o.slot;
    return { core: 'cores', sup: 'sups', uncut: 'uncut', cur: 'mats' }[e.k];
  };
  V.inTab = (e, tab) => tab === 'all' || V.tabOf(e) === tab;
  V.name = (e) => {
    if (e.k === 'item') return e.o.name;
    if (e.k === 'core') return (GV.GEMS[e.o.id] || {}).name || e.o.id;
    if (e.k === 'sup') return (GV.SUPPORTS[e.o.id] || {}).name || e.o.id;
    if (e.k === 'uncut') return `Uncut ${e.o.kind === 'skill' ? 'Star Core' : 'Support'} · T${e.o.tier}`;
    if (e.k === 'cur') return (CUR()[e.c] || {}).name || e.c;
    return '?';
  };
  V.score = (e) => {
    if (e.k === 'item') return 1000 * (e.o.set ? 6 : RANK[e.o.rarity] || 0) + 100 * e.o.tier + GV.items.value(e.o);
    if (e.k === 'core') return 100 * ((GV.GEMS[e.o.id] || {}).tier || 1) + e.o.lvl * 5 + e.o.sockets;
    if (e.k === 'sup') return 100 * ((GV.SUPPORTS[e.o.id] || {}).tier || 1);
    if (e.k === 'uncut') return 100 * e.o.tier + (e.o.kind === 'skill' ? 10 : 0);
    return 0;
  };
  // Auto-sort: by tab order, then the chosen key. Ties keep a stable order by name.
  const TORDER = Object.fromEntries(V.TABS.map((t, i) => [t.id, i]));
  const SLORDER = { helm: 0, suit: 1, boots: 2, relic: 3 };
  V.sort = (list, mode) => list.slice().sort((a, b) => {
    const ta = TORDER[V.tabOf(a)] - TORDER[V.tabOf(b)]; if (ta) return ta;
    if (a.k === 'item' && b.k === 'item' && V.tabOf(a) === 'prized') { const s = SLORDER[a.o.slot] - SLORDER[b.o.slot]; if (s) return s; }
    if (mode === 'name') return V.name(a).localeCompare(V.name(b));
    if (mode === 'new') return (b.at || 0) - (a.at || 0);
    return V.score(b) - V.score(a) || V.name(a).localeCompare(V.name(b));
  });
  V.slots = (list) => list.filter((e) => e.k !== 'cur').length;
  V.color = (e) => {
    if (e.k === 'item') return GV.items.color(e.o);
    if (e.k === 'core') return (GV.GEMS[e.o.id] || {}).color || '#9fe8ff';
    if (e.k === 'sup') return '#c9b4ff';
    if (e.k === 'uncut') return e.o.kind === 'skill' ? '#9fe8ff' : '#c9b4ff';
    return (CUR()[e.c] || {}).color || '#fff';
  };
  V.sub = (e) => {
    if (e.k === 'item') return `${GV.items.rarityName(e.o)} · ${GV.SLOTS[e.o.slot].icon} ${e.o.base} · T${e.o.tier}`;
    if (e.k === 'core') { const g = GV.GEMS[e.o.id] || {}; return `${g.icon || '◆'} Lv ${e.o.lvl} · ${e.o.sockets} socket${e.o.sockets > 1 ? 's' : ''}${g.tags ? ' · ' + g.tags.slice(0, 2).join(', ') : ''}`; }
    if (e.k === 'sup') return `Support · T${(GV.SUPPORTS[e.o.id] || {}).tier || 1}`;
    if (e.k === 'uncut') return 'Cut it at the Gem Lab';
    if (e.k === 'cur') return `×${e.n}`;
    return '';
  };
  V.lines = (e) => (e.k === 'item' ? GV.items.lines(e.o) : e.k === 'sup' ? [(GV.SUPPORTS[e.o.id] || {}).desc || ''] : e.k === 'core' ? [(GV.GEMS[e.o.id] || {}).desc || ''] : []);
  // Is this entry well-formed enough to give to a player? (Guild banks are shared data: check.)
  V.valid = (e) => {
    if (!e || typeof e !== 'object') return false;
    if (e.k === 'cur') return !!CUR()[e.c] && Number.isInteger(e.n) && e.n > 0 && e.n < 1e6;
    const o = e.o; if (!o || typeof o !== 'object') return false;
    if (e.k === 'item') return !!GV.SLOTS[o.slot] && !!GV.RARITY[o.rarity] && o.tier >= 1 && o.tier <= 5 && typeof o.name === 'string' && o.mods && typeof o.mods === 'object' && Object.values(o.mods).every(Number.isFinite) && (!o.set || !!GV.SETS[o.set]);
    if (e.k === 'core') return !!GV.GEMS[o.id] && Number.isInteger(o.lvl) && o.lvl >= 1 && o.lvl <= 40 && Number.isInteger(o.sockets) && o.sockets >= 1 && o.sockets <= (GV.MAX_SOCKETS || 6);
    if (e.k === 'sup') return !!GV.SUPPORTS[o.id];
    if (e.k === 'uncut') return (o.kind === 'skill' || o.kind === 'support') && o.tier >= 1 && o.tier <= 4;
    return false;
  };

  // ---------------- what's on you ----------------
  const D = () => GV.save.data;
  V.mine = () => {
    const d = D(), out = [];
    const eq = new Set(Object.values(d.equip || {}));
    for (const it of d.items || []) if (!eq.has(it.uid)) out.push({ id: 'i' + it.uid, k: 'item', o: it, uid: it.uid });
    const bar = new Set(d.bar || []);
    for (const g of d.gems || []) if (!bar.has(g.uid)) out.push({ id: 'g' + g.uid, k: 'core', o: g, uid: g.uid });
    for (const s of GV.inv.freeSups()) out.push({ id: 's' + s.uid, k: 'sup', o: s, uid: s.uid });
    (d.uncut || []).forEach((u, i) => out.push({ id: 'u' + i, k: 'uncut', o: u, idx: i }));
    for (const c in GV.CURRENCY) if (d.cur[c] > 0) out.push({ id: 'c' + c, k: 'cur', c, n: d.cur[c] });
    if (d.orbs > 0) out.push({ id: 'corb', k: 'cur', c: 'orb', n: d.orbs });
    return out;
  };
  // Take something off the player and return a storable copy (no uid: uids belong to a save).
  V.pack = (e, n) => {
    const d = D();
    if (e.k === 'cur') {
      const have = e.c === 'orb' ? d.orbs : d.cur[e.c] || 0, take = Math.max(1, Math.min(have, n || have));
      if (!have) return null;
      if (e.c === 'orb') d.orbs -= take; else d.cur[e.c] -= take;
      return { id: V.newId(), k: 'cur', c: e.c, n: take, at: Date.now() };
    }
    if (e.k === 'item') {
      const it = (d.items || []).find((i) => i.uid === e.uid); if (!it || Object.values(d.equip).includes(it.uid)) return null;
      d.items = d.items.filter((i) => i !== it);
      const o = JSON.parse(JSON.stringify(it)); delete o.uid;
      return { id: V.newId(), k: 'item', o, at: Date.now() };
    }
    if (e.k === 'core') {
      const g = GV.inv.gem(e.uid); if (!g || d.bar.includes(g.uid)) return null;
      d.gems = d.gems.filter((x) => x !== g); // its supports stay with you, unsocketed
      return { id: V.newId(), k: 'core', o: { id: g.id, lvl: g.lvl, xp: g.xp || 0, sockets: g.sockets }, at: Date.now() };
    }
    if (e.k === 'sup') {
      const s = GV.inv.sup(e.uid); if (!s || GV.inv.holder(s.uid)) return null;
      d.sups = d.sups.filter((x) => x !== s);
      return { id: V.newId(), k: 'sup', o: { id: s.id }, at: Date.now() };
    }
    if (e.k === 'uncut') {
      const u = d.uncut[e.idx]; if (!u) return null;
      d.uncut.splice(e.idx, 1);
      return { id: V.newId(), k: 'uncut', o: { kind: u.kind, tier: u.tier }, at: Date.now() };
    }
    return null;
  };
  // Can the player hold it right now? (null = yes)
  V.roomFor = (e) => (e.k === 'item' && D().items.length >= GV.items.MAX_INV ? `Your gear bag is full (${GV.items.MAX_INV}). Salvage or stash something first.` : null);
  // Give a stored entry to the player, with fresh uids from their save.
  V.unpack = (e) => {
    const d = D();
    if (!V.valid(e)) return false;
    if (e.k === 'cur') { if (e.c === 'orb') d.orbs += e.n; else d.cur[e.c] = (d.cur[e.c] || 0) + e.n; return true; }
    if (V.roomFor(e)) return false;
    const o = JSON.parse(JSON.stringify(e.o));
    if (e.k === 'item') { o.uid = d.uid++; if (!o.look && GV.items.lookFor) o.look = GV.items.lookFor(o); d.items.push(o); return true; }
    if (e.k === 'core') { d.gems.push({ uid: d.uid++, id: o.id, lvl: o.lvl, xp: o.xp || 0, sockets: o.sockets, sup: new Array(o.sockets).fill(null) }); return true; }
    if (e.k === 'sup') { d.sups.push({ uid: d.uid++, id: o.id }); return true; }
    if (e.k === 'uncut') { d.uncut.push({ kind: o.kind, tier: o.tier }); return true; }
    return false;
  };

  // ---------------- the personal vault ----------------
  const bank = () => { const m = GV.save.main; m.bank = m.bank || { list: [], mem: 0, cap: 60 }; return m.bank; };
  V.CAP_MAX = 200;
  V.capCost = (cap) => 250 + (cap - 60) * 15;
  V.solo = {
    title: 'Your Vault', kind: 'solo',
    list: () => bank().list,
    cap: () => bank().cap,
    mem: () => bank().mem,
    async put(e) {
      const b = bank();
      if (e.k !== 'cur' && V.slots(b.list) >= b.cap) return 'The vault is full. Expand it, or take something out.';
      if (e.k === 'cur') { const s = b.list.find((x) => x.k === 'cur' && x.c === e.c); if (s) { s.n += e.n; return null; } }
      b.list.push(e); return null;
    },
    async take(id, n) {
      const b = bank(), i = b.list.findIndex((x) => x.id === id); if (i < 0) return null;
      const e = b.list[i];
      if (e.k === 'cur' && n && n < e.n) { e.n -= n; return { id: V.newId(), k: 'cur', c: e.c, n }; }
      b.list.splice(i, 1); return e;
    },
    async putMem(n) { bank().mem += n; return null; },
    async takeMem(n) { const b = bank(); if (b.mem < n) return 'Not that many stored.'; b.mem -= n; return null; },
    save() { GV.save.write(); },
  };

  // ---------------- the screen (shared with the guild bank) ----------------
  const st = { tab: 'all', sort: 'best', q: '', sel: null, side: null, msg: '', busy: false };
  V.open = function (store, back, extra) {
    st.store = store; st.back = back || st.back || (() => M.map()); st.extra = extra || null;
    if (store !== st.lastStore) { st.tab = 'all'; st.sel = null; st.q = ''; st.msg = ''; st.lastStore = store; }
    draw();
  };
  V.refresh = () => { if (document.querySelector('#ui .vaultui')) draw(); };
  const match = (e) => !st.q || V.name(e).toLowerCase().includes(st.q) || V.sub(e).toLowerCase().includes(st.q) || V.lines(e).join(' ').toLowerCase().includes(st.q);
  function card(e, side) {
    const sel = st.sel === e.id && st.side === side;
    const who = e.by && st.store.nameOf ? `<i class="by" data-by="${esc(e.by)}"></i>` : '';
    return `<div class="vcard ${sel ? "sel" : ""} vk-${e.k}" style="--rc:${V.color(e)}">
      <button class="vmain" data-v="sel" data-id="${esc(e.id)}" data-s="${side}"><b>${esc(V.name(e))}</b><small>${esc(V.sub(e))}</small>${who}
        ${sel ? `<ul>${V.lines(e).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}</button>
      <button class="vmove" data-v="move" data-id="${esc(e.id)}" data-s="${side}" title="${side === 'me' ? 'Deposit' : 'Withdraw'}">${side === 'me' ? '→' : '←'}</button>
      ${e.k === 'cur' && e.n > 1 && sel ? `<div class="vamt">${[1, 10].filter((x) => x < e.n).map((x) => `<button data-v="moveN" data-n="${x}" data-id="${esc(e.id)}" data-s="${side}">Move ${x}</button>`).join('')}<button data-v="moveN" data-n="${e.n}" data-id="${esc(e.id)}" data-s="${side}">Move all ${e.n}</button></div>` : ''}
    </div>`;
  }
  function draw() {
    const S = st.store, d = D();
    const mine = V.sort(V.mine(), st.sort), theirs = V.sort(S.list().filter((e) => V.valid(e)), st.sort);
    const count = (list, t) => list.filter((e) => V.inTab(e, t)).length;
    const tabs = V.TABS.map((t) => { const n = count(theirs, t.id); return `<button class="tab ${st.tab === t.id ? 'sel' : ''}" data-v="tab" data-t="${t.id}">${t.icon ? t.icon + ' ' : ''}${t.name}${n ? ` <i>${n}</i>` : ''}</button>`; }).join('');
    const L = mine.filter((e) => V.inTab(e, st.tab) && match(e)), R = theirs.filter((e) => V.inTab(e, st.tab) && match(e));
    const used = V.slots(theirs), cap = S.cap();
    const canExpand = S.kind === 'solo' && cap < V.CAP_MAX;
    M.render(`<div class="screen panel wide vaultui">
      <div class="topbar"><h2>${esc(S.title)}</h2><div class="stats">${used}/${cap} slots · ✦ ${d.memories} on you · ${S.mem()} ✦ stored</div></div>
      ${S.banner ? S.banner() : ''}
      <div class="vtabs tabs">${tabs}</div>
      <div class="vtools">
        <input id="vSearch" placeholder="Search names and stats" value="${esc(st.q)}" autocomplete="off">
        <select id="vSort"><option value="best" ${st.sort === 'best' ? 'selected' : ''}>Sort: best first</option><option value="new" ${st.sort === 'new' ? 'selected' : ''}>Sort: newest</option><option value="name" ${st.sort === 'name' ? 'selected' : ''}>Sort: name</option></select>
        <span class="vmem">Memories <button data-v="mem+" data-n="100">Store 100</button><button data-v="mem+" data-n="all">Store all</button><button data-v="mem-" data-n="100">Take 100</button><button data-v="mem-" data-n="all">Take all</button></span>
      </div>
      ${st.msg ? `<p class="warn vmsg">${esc(st.msg)}</p>` : ''}
      <div class="vcols">
        <div class="vcol"><div class="gsub">On you <span>${L.length}</span></div>
          <div class="vquick"><button data-v="q" data-q="mats">Stash materials</button><button data-v="q" data-q="low">Stash Salvaged &amp; Calibrated</button><button data-v="q" data-q="gear">Stash all spare gear</button><button data-v="q" data-q="cores">Stash spare cores</button></div>
          <div class="vlist">${L.map((e) => card(e, 'me')).join('') || '<p class="note">Nothing to stash in this tab. Equipped gear and cores on your bar stay with you.</p>'}</div></div>
        <div class="vcol"><div class="gsub">${esc(S.title)} <span>${R.length}</span></div>
          <div class="vlist">${R.map((e) => card(e, 'vault')).join('') || '<p class="note">Empty. Everything sorts itself into these tabs as you stash it.</p>'}</div></div>
      </div>
      <div class="menu row">${canExpand ? `<button data-v="expand" ${d.memories >= V.capCost(cap) ? '' : 'disabled'}>Expand +20 slots · ✦ ${V.capCost(cap)}</button>` : ''}${st.extra ? st.extra.buttons || '' : ''}<button class="primary" data-a="back">Done</button></div>
    </div>`, (a, b) => { if (a === 'back') { S.save && S.save(); st.back(); } else if (st.extra && st.extra.onAction) st.extra.onAction(a, b); }, () => { S.save && S.save(); st.back(); });
    if (S.nameOf) document.querySelectorAll('#ui .vaultui [data-by]').forEach((el) => S.nameOf(el.dataset.by).then((n) => { el.textContent = n ? `from ${n}` : ''; }));
    document.querySelectorAll('#ui .vaultui [data-v]').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); act(b.dataset.v, b); }));
    const si = document.getElementById('vSearch');
    si.addEventListener('input', () => { st.q = si.value.trim().toLowerCase(); const p = si.selectionStart; draw(); const s2 = document.getElementById('vSearch'); s2.focus(); s2.setSelectionRange(p, p); });
    document.getElementById('vSort').addEventListener('change', (ev) => { st.sort = ev.target.value; draw(); });
  }
  async function deposit(e, n) {
    const S = st.store;
    if (S.canPut) { const why = S.canPut(e); if (why) return why; }
    if (e.k !== 'cur' && V.slots(S.list()) >= S.cap()) return `${S.title} is full.`;
    const packed = V.pack(e, n); if (!packed) return 'That can\'t be stashed right now.';
    const err = await S.put(packed);
    if (err) { V.unpack(packed); return err; } // put it back on you
    return null;
  }
  async function withdraw(id, n) {
    const S = st.store, e = S.list().find((x) => x.id === id); if (!e) return 'Already gone.';
    const room = V.roomFor(e); if (room) return room;
    if (S.canTake) { const why = S.canTake(e, n); if (why) return why; }
    const got = await S.take(id, n);
    if (!got || typeof got === 'string') return got || 'Someone else took it first.';
    if (!V.unpack(got)) { await S.put(got); return 'That item looks damaged and was left in the vault.'; }
    return null;
  }
  async function act(a, b) {
    if (st.busy) return;
    const S = st.store, d = D();
    st.msg = '';
    if (a === 'tab') { st.tab = b.dataset.t; st.sel = null; return draw(); }
    if (a === 'sel') { const same = st.sel === b.dataset.id && st.side === b.dataset.s; st.sel = same ? null : b.dataset.id; st.side = b.dataset.s; return draw(); }
    st.busy = true;
    try {
      if (a === 'move' || a === 'moveN') {
        const n = a === 'moveN' ? +b.dataset.n : 0;
        if (b.dataset.s === 'me') { const e = V.mine().find((x) => x.id === b.dataset.id); st.msg = e ? (await deposit(e, n)) || '' : ''; }
        else st.msg = (await withdraw(b.dataset.id, n)) || '';
        if (!st.msg) { GV.audio.sfx('mem'); st.sel = null; }
      }
      if (a === 'q') {
        const q = b.dataset.q, eqd = new Set(Object.values(d.equip));
        const pick = V.mine().filter((e) => (q === 'mats' ? e.k === 'cur' || e.k === 'uncut' : q === 'low' ? e.k === 'item' && (e.o.rarity === 'normal' || e.o.rarity === 'magic') && !e.o.set : q === 'gear' ? e.k === 'item' && !eqd.has(e.uid) : e.k === 'core'));
        let moved = 0;
        // deposit from the end so indexes of uncut cores stay valid
        for (const e of pick.reverse()) { const err = await deposit(e); if (err) { st.msg = moved ? `Stashed ${moved}. ${err}` : err; break; } moved++; }
        if (moved) GV.audio.sfx('mem');
        if (!moved && !st.msg) st.msg = 'Nothing like that on you.';
      }
      if (a === 'mem+') { const n = b.dataset.n === 'all' ? d.memories : Math.min(+b.dataset.n, d.memories); if (n > 0) { d.memories -= n; const err = await S.putMem(n); if (err) { d.memories += n; st.msg = err; } } }
      if (a === 'mem-') { const n = b.dataset.n === 'all' ? S.mem() : Math.min(+b.dataset.n, S.mem()); if (n > 0) { const err = await S.takeMem(n); if (err) st.msg = err; else d.memories += n; } }
      if (a === 'expand') { const c = V.capCost(S.cap()); if (d.memories >= c && S.cap() < V.CAP_MAX) { d.memories -= c; bank().cap += 20; GV.audio.sfx('level'); } }
      GV.save.write(); S.save && S.save();
    } finally { st.busy = false; }
    draw();
  }

  M.vault = (back) => V.open(V.solo, back || (() => M.lantern()));

  // ---------------- ways in ----------------
  // The Lantern's nav, the Gear screen and the Star Map all get a Vault button.
  const lan0 = M.lantern;
  M.lantern = function () {
    lan0.call(this);
    const nav = document.querySelector('#ui .lantern .lannav'); if (!nav) return;
    const b = document.createElement('button'); b.textContent = 'Vault'; b.dataset.l = 'vault';
    b.addEventListener('click', (e) => { e.stopPropagation(); GV.audio.sfx('ui'); M.vault(() => M.lantern()); });
    nav.insertBefore(b, nav.firstChild);
  };
  const gv0 = GV.gearView.open;
  GV.gearView.open = function (f) {
    gv0.call(this, f);
    if (f === 'play') return; // mid-stage: the vault is on the ship
    const row = document.querySelector('#ui .gear > .menu.row'); if (!row) return;
    const b = document.createElement('button'); b.textContent = 'Vault'; row.insertBefore(b, row.firstChild);
    b.addEventListener('click', (e) => { e.stopPropagation(); GV.audio.sfx('ui'); M.vault(() => GV.gearView.open(f)); });
  };
})();
