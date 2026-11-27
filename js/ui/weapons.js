// Galactic Void — weapons as loot. Vesper only sells basic weapons; everything better drops from
// enemies (rarely), elites (sometimes) and bosses (often). You carry a limited rack of weapons,
// manage it on the Weapons screen (filters, sorting, equip main/off hand, salvage) and can store
// spares in the Shared Vault, where your other characters can pick them up.
(function () {
  const GV = window.GV, W = GV.WEAPONS, P = GV.Play.prototype;

  // ---------- tiers ----------
  // 1: Vesper sells these. 2: common drops. 3: rare drops (from the second system on).
  const T1 = ['pike', 'ionpistol', 'voiddagger', 'starmace', 'aegis', 'cutlass', 'hatchet'];
  const T2 = ['saber', 'maul', 'katana', 'arcsmg', 'handcannon', 'handxbow', 'pulserifle', 'bulwark', 'lumenbow', 'greatblade', 'arcwrench', 'starfocus', 'gravknuckle', 'biolash', 'rimelance'];
  const T3 = ['lance', 'breacher', 'heavyxbow', 'longshot', 'novalauncher', 'helios'];
  for (const k of T1) if (W[k]) W[k].wtier = 1;
  for (const k of T2) if (W[k]) W[k].wtier = 2;
  for (const k of T3) if (W[k]) W[k].wtier = 3;
  GV.weaponTier = (k) => (W[k] && (W[k].exotic ? 5 : W[k].set ? 4 : W[k].wtier)) || 2;
  const TIER_NAME = { 1: 'Standard issue', 2: 'Field-grade', 3: 'Prototype', 4: 'Set weapon', 5: 'Exotic' };
  const TIER_COLOR = { 1: '#aab2c2', 2: '#7dffb0', 3: '#6fb8ff', 4: '#ffd36b', 5: '#ff9a4a' };
  GV.weaponTierName = (k) => TIER_NAME[GV.weaponTier(k)];
  GV.weaponTierColor = (k) => TIER_COLOR[GV.weaponTier(k)];
  GV.weaponValue = (k) => [0, 20, 90, 220, 300, 400][GV.weaponTier(k)] || 50;

  // ---------- the rack ----------
  GV.WEAPON_RACK = 14; // weapons you can carry; the rest go to the Vault
  const owned = (d) => (d.weapons = d.weapons || []);

  // ---------- drops ----------
  function pickWeapon(p) {
    const d = GV.save.data, sys = p.sysIdx || 0;
    const pool = [...T2, ...(sys >= 1 ? T3 : [])].filter((k) => W[k]);
    const weight = (k) => (W[k].wtier === 3 ? 0.35 + 0.15 * Math.min(4, sys) : 1);
    const missing = pool.filter((k) => !owned(d).includes(k));
    const from = missing.length && Math.random() < 0.8 ? missing : pool;
    let tot = 0; for (const k of from) tot += weight(k);
    let r = Math.random() * tot;
    for (const k of from) { r -= weight(k); if (r <= 0) return k; }
    return from[from.length - 1];
  }
  P.rollWeaponDrop = function (x, y, chance) {
    if (this.asc || this.duel) return;
    const Q = GV.legacy ? GV.legacy.qty() : 1;
    if (Math.random() < chance * Q) this.dropWeapon(x, y, pickWeapon(this));
  };
  const kill0 = P.killEnemy;
  P.killEnemy = function (e) {
    const was = e.dead;
    kill0.call(this, e);
    if (was || !e.dead || e.boss || e.part) return;
    this.rollWeaponDrop(e.x + e.w / 2, e.y + e.h / 2, e.elite ? 0.045 : e.def && e.def.heavy ? 0.008 : 0.0025);
  };
  const down0 = P.onBossDown;
  P.onBossDown = function (b) {
    const r = down0.call(this, b);
    if (b && !(b.def && b.def.titan)) this.rollWeaponDrop(b.x + b.w / 2, b.y + b.h / 2, 0.3 + 0.04 * Math.min(5, this.sysIdx || 0));
    return r;
  };

  // picking one up: new ones go on your rack (or to the Vault if the rack is full); repeats are salvaged
  const give0 = P.giveDrop;
  P.giveDrop = function (dr, pl) {
    if (dr.kind !== 'weapon' || (W[dr.wid] && W[dr.wid].exotic)) return give0.call(this, dr, pl);
    const Wd = W[dr.wid], tag = this.coop ? `P${(pl && pl.slot || 0) + 1}: ` : '';
    if (!Wd) return;
    GV.save.as((pl && pl.slot) || 0, (d) => {
      const vaulted = GV.vault && GV.vault.weaponsInVault ? GV.vault.weaponsInVault().includes(dr.wid) : false;
      if (owned(d).includes(dr.wid) || vaulted) {
        const m = GV.weaponValue(dr.wid);
        if (GV.fab) GV.fab.give(GV.fab.weaponYield(dr.wid));
        this.gainMem(m); this.toast(`${tag}${Wd.name} (already yours) · salvaged for ${m} ✦ and Alloy`, 2.4, 'small');
      } else if (owned(d).length < GV.WEAPON_RACK) {
        owned(d).push(dr.wid);
        this.toast(`${tag}NEW WEAPON · ${Wd.name}`, 3); this.toasts[this.toasts.length - 1].sub = `${GV.weaponTierName(dr.wid)} · equip it in Gear → Weapons`;
      } else if (GV.vault && GV.vault.stashWeapon && GV.vault.stashWeapon(dr.wid)) {
        this.toast(`${tag}NEW WEAPON · ${Wd.name}`, 3); this.toasts[this.toasts.length - 1].sub = 'Your weapon rack is full, so it went to the Shared Vault';
      } else {
        const m = GV.weaponValue(dr.wid); this.gainMem(m);
        this.toast(`${tag}${Wd.name} · no room on your rack or in the Vault, salvaged for ${m} ✦`, 3, 'small');
      }
      GV.save.write();
    });
    this.sfx('level'); this.shake(5);
  };

  // ---------- the vault holds weapons too ----------
  const V = GV.vault;
  if (V) {
    V.TABS.splice(V.TABS.findIndex((t) => t.id === 'cores'), 0, { id: 'weapons', name: 'Weapons', icon: '⚔' });
    const wrap = (name, fn) => { const f0 = V[name]; V[name] = function (e, ...a) { return e && e.k === 'weapon' ? fn(e, ...a) : f0.call(this, e, ...a); }; };
    wrap('tabOf', () => 'weapons');
    wrap('name', (e) => (W[e.o.id] || {}).name || e.o.id);
    wrap('score', (e) => 100 * GV.weaponTier(e.o.id) + ((W[e.o.id] || {}).dmg || 0));
    wrap('color', (e) => (W[e.o.id] || {}).color || '#fff');
    wrap('sub', (e) => { const w = W[e.o.id] || {}; return `⚔ ${GV.weaponTierName(e.o.id)} · ${{ one: 'One-handed', two: 'Two-handed', off: 'Shield' }[w.hand] || ''}`; });
    wrap('lines', (e) => [(W[e.o.id] || {}).desc || '']);
    wrap('valid', (e) => !!(e.o && W[e.o.id] && !W[e.o.id].legacy));
    wrap('pack', (e) => {
      const d = GV.save.data, k = e.o.id;
      if (!owned(d).includes(k) || d.weapon === k || d.offhand === k) return null;
      d.weapons = owned(d).filter((x) => x !== k);
      return { id: V.newId(), k: 'weapon', o: { id: k }, at: Date.now() };
    });
    wrap('roomFor', (e) => {
      const d = GV.save.data;
      if (owned(d).includes(e.o.id)) return 'You already carry this weapon.';
      return owned(d).length >= GV.WEAPON_RACK ? `Your weapon rack is full (${GV.WEAPON_RACK}). Store or salvage a weapon first.` : null;
    });
    wrap('unpack', (e) => { const d = GV.save.data; if (V.roomFor(e)) return false; owned(d).push(e.o.id); return true; });
    const mine0 = V.mine;
    V.mine = function () {
      const out = mine0.call(this), d = GV.save.data, cls = GV.CLASSES[d.cls] || {};
      for (const k of owned(d)) {
        if (!W[k] || W[k].legacy || k === d.weapon || k === d.offhand) continue;
        if (k === cls.weapon || k === cls.offhand) continue; // your class kit stays with you
        out.push({ id: 'w' + k, k: 'weapon', o: { id: k } });
      }
      return out;
    };
    const bank = () => { const m = GV.save.main; m.bank = m.bank || { list: [], mem: 0, cap: 60 }; return m.bank; };
    V.weaponsInVault = () => bank().list.filter((e) => e.k === 'weapon').map((e) => e.o.id);
    V.stashWeapon = (k) => {
      const b = bank();
      if (V.slots(b.list) >= b.cap) return false;
      b.list.push({ id: V.newId(), k: 'weapon', o: { id: k }, at: Date.now() });
      return true;
    };
  }

  // ---------- the Weapons screen ----------
  let from = 'map', sel = null, tab = 'all', q = '', sortBy = 'tier';
  const esc = (s) => GV.menus.esc(s);
  const isRanged = (w) => !!w.gun;
  const kindOf = (w) => (w.hand === 'off' ? 'shield' : isRanged(w) ? 'ranged' : 'melee');
  const stat = (w) => (w.hand === 'off' ? `${w.block}% block · +${w.armour} armour` : `DMG ${w.dmg} · ${w.cd < 0.3 ? 'fast' : w.cd > 0.5 ? 'slow' : 'steady'} · ${w.gun ? 'ranged ' + (w.reach || w.range) : 'reach ' + w.range}${w.crit ? ` · +${w.crit}% crit` : ''}`);
  const dps = (w) => (w.dmg || 0) / (w.cd || 1);

  function close() {
    GV.save.write();
    const g = GV.game && GV.game.play;
    if (g && g.player && g.player.recalc) g.player.recalc();
    if (from === 'play') GV.game.resume();
    else if (from === 'pause') GV.menus.pause();
    else GV.menus.map();
  }

  function render() {
    const M = GV.menus, d = GV.save.data, cls = GV.CLASSES[d.cls] || {};
    const list = owned(d).filter((k) => W[k] && (!W[k].legacy || k === d.weapon || k === d.offhand)); // an old paired kit still shows while you hold it
    const TABS = [
      { id: 'all', name: 'All' }, { id: 'melee', name: 'Melee', icon: '⚔' }, { id: 'ranged', name: 'Ranged', icon: '➹' },
      { id: 'one', name: 'One-handed' }, { id: 'two', name: 'Two-handed' }, { id: 'shield', name: 'Shields', icon: '⛉' }, { id: 'prized', name: 'Sets & Exotics', icon: '★' },
    ];
    const inTab = (k, t) => {
      const w = W[k];
      if (t === 'all') return true;
      if (t === 'melee' || t === 'ranged' || t === 'shield') return kindOf(w) === t;
      if (t === 'one' || t === 'two') return w.hand === t;
      if (t === 'prized') return !!(w.set || w.exotic);
      return true;
    };
    TABS.forEach((t) => { t.n = list.filter((k) => inTab(k, t.id)).length; });
    const SORT = {
      tier: (a, b) => GV.weaponTier(b) - GV.weaponTier(a) || dps(W[b]) - dps(W[a]),
      dps: (a, b) => dps(W[b]) - dps(W[a]),
      dmg: (a, b) => (W[b].dmg || 0) - (W[a].dmg || 0),
      reach: (a, b) => ((W[b].reach || W[b].range || 0) - (W[a].reach || W[a].range || 0)),
      name: (a, b) => W[a].name.localeCompare(W[b].name),
    };
    const shown = list.filter((k) => inTab(k, tab) && GV.filters.clsOk('wpn', 'weapon', k) && GV.filters.match(q, W[k].name, W[k].desc, kindOf(W[k]), GV.weaponTierName(k))).sort(SORT[sortBy] || SORT.tier);
    const fbar = GV.filters.bar({ id: 'wpn', tabs: TABS, tab, q, sort: sortBy, placeholder: 'Search weapons (e.g. "rifle", "pierce", "crit")', sorts: [['tier', 'Sort: best tier'], ['dps', 'Sort: damage per second'], ['dmg', 'Sort: hit damage'], ['reach', 'Sort: reach'], ['name', 'Sort: name']] });
    const card = (k) => {
      const w = W[k], eq = d.weapon === k ? 'main hand' : d.offhand === k ? 'off hand' : '';
      return `<button class="item wpn ${sel === k ? 'sel' : ''} ${eq ? 'eq' : ''}" data-a="sel" data-k="${k}" style="--rc:${GV.weaponTierColor(k)}">
        <span class="ih"><b style="color:${w.color}">${esc(w.name)}</b><small><span class="rar" style="color:${GV.weaponTierColor(k)}">${esc(GV.weaponTierName(k))}</span> · ${esc({ one: 'One-handed', two: 'Two-handed', off: 'Shield' }[w.hand] || '')}${eq ? ' · ' + eq : ''}</small></span></button>`;
    };
    let detail = '<p class="note">Select a weapon to see it and equip it. Better weapons drop from enemies, elites and especially bosses.</p>';
    if (sel && W[sel] && list.includes(sel)) {
      const w = W[sel], k = sel, isMain = d.weapon === k, isOff = d.offhand === k, twoMain = W[d.weapon] && W[d.weapon].hand === 'two';
      const kit = k === cls.weapon || k === cls.offhand;
      let btns = '';
      if (w.hand === 'off') btns = `<button class="primary" data-a="off" ${isOff || twoMain ? 'disabled' : ''}>${isOff ? 'In your off hand' : twoMain ? 'Needs a free hand' : 'Equip in off hand'}</button>`;
      else if (w.hand === 'two') btns = `<button class="primary" data-a="main" ${isMain ? 'disabled' : ''}>${isMain ? 'Equipped' : 'Equip (both hands)'}</button>`;
      else btns = `<button class="primary" data-a="main" ${isMain ? 'disabled' : ''}>${isMain ? 'In your main hand' : 'Main hand'}</button><button data-a="off" ${isOff || twoMain ? 'disabled' : ''}>${isOff ? 'In your off hand' : 'Off hand'}</button>`;
      if (isOff) btns += '<button class="ghost" data-a="clearOff">Empty off hand</button>';
      if (!isMain && !isOff && !kit) btns += `<button class="ghost" data-a="stash">Send to Vault</button><button class="ghost" data-a="salvage">Salvage · ${GV.weaponValue(k)} ✦</button>`;
      detail = `<div class="item full" style="--rc:${GV.weaponTierColor(k)}"><span class="ih"><b style="color:${w.color}">${esc(w.name)}</b><small><span style="color:${GV.weaponTierColor(k)}">${esc(GV.weaponTierName(k))}</span>${kit ? ' · your class kit' : ''}</small></span>
        <ul><li>${esc(stat(w))}</li><li>${esc(w.desc)}</li>${w.gun ? '<li>Your basic attack fires it down your aim.</li>' : ''}</ul></div>
        <div class="menu row left">${btns}</div>`;
    }
    const cur = GV.equippedWeapon(d);
    M.render(`
      <div class="screen panel gear">
        <div class="topbar"><h2>Weapons</h2><div class="seg2"><button class="ghost small" data-a="armour">Armour</button><button class="small on" disabled>Weapons</button></div><div class="stats">${list.length}/${GV.WEAPON_RACK} on your rack · ✦ ${d.memories}</div></div>
        <div class="gsub">In your hands: <b>${esc(cur.name)}</b> ${cur.dual ? '· dual wielding (18% faster, the two take turns)' : cur.shield ? '· with a shield' : cur.twoHanded ? '· two-handed (+10% damage)' : '· off hand free (+4% crit)'}</div>
        <div class="gcols">
          <div class="ginv">${fbar}${GV.filters.rail('wpn', `<div class="ilist">${shown.map(card).join('') || '<p class="note fnone">Nothing matches. Try another tab or search.</p>'}</div>`, list.map((k) => ['weapon', k]), render)}</div>
          <div class="gdetail">${detail}</div>
        </div>
        <div class="menu row"><button class="primary" data-a="done">Done</button></div>
      </div>`, onAction, close);
    GV.filters.bind('wpn', { tab: (t) => { tab = t; render(); }, q: (v) => { q = v; render(); }, sort: (v) => { sortBy = v; render(); } });
  }

  function onAction(a, b) {
    const d = GV.save.data;
    if (a === 'done') return close();
    if (a === 'armour') return GV.gearView.open(from);
    if (a === 'sel') sel = b.dataset.k;
    const k = sel, w = W[k];
    if (a === 'main' && w) { d.weapon = k; if (w.hand === 'two') d.offhand = null; if (d.offhand === k) d.offhand = null; GV.audio.sfx('level'); }
    if (a === 'off' && w) { if (W[d.weapon] && W[d.weapon].hand === 'two') return; if (d.weapon === k) return; d.offhand = k; GV.audio.sfx('level'); }
    if (a === 'clearOff') d.offhand = null;
    if (a === 'stash' && w) {
      if (!GV.vault || !GV.vault.stashWeapon || !GV.vault.stashWeapon(k)) { GV.audio.sfx('hurt'); return; }
      d.weapons = owned(d).filter((x) => x !== k); sel = null; GV.audio.sfx('mem');
    }
    if (a === 'salvage' && w) {
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = `Tap again to salvage ${w.name}`; b.classList.add('danger'); return; }
      d.weapons = owned(d).filter((x) => x !== k); d.memories += GV.weaponValue(k); if (GV.fab) GV.fab.give(GV.fab.weaponYield(k)); sel = null; GV.audio.sfx('mem');
    }
    GV.save.write();
    render();
  }

  GV.weaponView = { open(f) { from = f || 'map'; sel = null; render(); } };
})();
