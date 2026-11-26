// Galactic Void — the Fabricator: a workbench on the Lantern's deck that you upgrade from Basic
// to Master. Lower levels deal in salvage (break gear and weapons into Alloy and Void Shards,
// refine Alloy into Shards, transmute Shards into crafting currency). Exotic weapons no longer drop
// whole: Titans drop their pieces, and only a Master Fabricator can assemble them.
(function () {
  const GV = window.GV, W = GV.WEAPONS, P = GV.Play.prototype;

  const LEVELS = [
    { name: 'Basic', color: '#aab2c2', yield: 1, unlock: 'Break down gear and weapons into Alloy and Void Shards.' },
    { name: 'Journeyman', color: '#7dffb0', yield: 1.25, cost: { mem: 400, alloy: 40 }, unlock: 'Refine Alloy into Void Shards. Break-downs yield 25% more.' },
    { name: 'Expert', color: '#6fb8ff', yield: 1.5, cost: { mem: 1200, alloy: 120, shard: 15 }, unlock: 'Transmute Void Shards into crafting currency. Break-downs yield 50% more.' },
    { name: 'Master', color: '#ff9a4a', yield: 1.5, cost: { mem: 3000, alloy: 260, shard: 60 }, unlock: 'Assemble exotic weapons from the pieces Titans drop.' },
  ];
  const PARTS = [
    { id: 'frame', name: 'Frame', icon: '▭' },
    { id: 'core', name: 'Core', icon: '◉' },
    { id: 'edge', name: 'Edge', icon: '◢' },
    { id: 'schematic', name: 'Schematic', icon: '⌗' },
  ];
  const ASSEMBLE = { shard: 40, mem: 2000 };
  const REFINE = { alloy: 10, shard: 1 };
  const TRANSMUTE = { alch: 2, annul: 2, chaos: 3, divine: 4, exalt: 6 };

  const D = () => GV.save.data;
  const mats = (d = D()) => (d.mats = d.mats || { alloy: 0, shard: 0 });
  const lvl = (d = D()) => d.fab || 0;
  const parts = (d = D()) => (d.exoParts = d.exoParts || {});
  const yieldMul = () => LEVELS[lvl()].yield;

  // what breaking something down gives you
  const RAR = { normal: [1, 0], magic: [2, 0], rare: [4, 0], nova: [6, 1], unique: [8, 2] };
  const itemYield = (it) => { const [a, s] = RAR[it.rarity] || [1, 0]; return { alloy: Math.round(a * (1 + 0.5 * (it.tier - 1)) * yieldMul()), shard: Math.round((s + (it.set ? 1 : 0)) * yieldMul()) }; };
  const weaponYield = (k) => { const t = GV.weaponTier ? GV.weaponTier(k) : 2; return { alloy: Math.round([0, 3, 6, 12, 14, 0][t] * yieldMul()), shard: Math.round([0, 0, 0, 2, 2, 0][t] * yieldMul()) }; };
  const give = (y) => { const m = mats(); m.alloy += y.alloy || 0; m.shard += y.shard || 0; };

  // Salvaging gear anywhere now also yields materials.
  const salv0 = GV.items.salvage.bind(GV.items);
  GV.items.salvage = function (uid) { const it = this.get(uid); const v = salv0(uid); if (it) give(itemYield(it)); return v; };

  // ---------- exotic pieces ----------
  GV.fab = {
    LEVELS, PARTS, mats, lvl, parts, weaponYield, give,
    has(wid, part, d = D()) { return ((parts(d)[wid] || {})[part] || 0) > 0; },
    count(wid, d = D()) { return PARTS.filter((p) => GV.fab.has(wid, p.id, d)).length; },
    // a piece for one of this Titan's exotics: missing pieces of weapons you don't have first
    pick(titanId, d = D()) {
      const mine = (GV.EXOTICS || []).filter((k) => W[k].exotic === titanId);
      const want = [];
      for (const k of mine) { if ((d.weapons || []).includes(k)) continue; for (const pt of PARTS) if (!GV.fab.has(k, pt.id, d)) want.push([k, pt.id]); }
      if (want.length) return want[Math.floor(Math.random() * want.length)];
      const k = mine[Math.floor(Math.random() * mine.length)];
      return k ? [k, PARTS[Math.floor(Math.random() * PARTS.length)].id] : null;
    },
    // give a piece directly (rewards); returns a short label
    grant(wid, part, d = D()) {
      const have = GV.fab.has(wid, part, d) || (d.weapons || []).includes(wid);
      if (have) { const m = mats(d); m.shard += 6; return `${W[wid].name} ${PART(part).name} (duplicate) · +6 Void Shards`; }
      const pp = (parts(d)[wid] = parts(d)[wid] || {}); pp[part] = 1;
      return `${W[wid].name} · ${PART(part).name} (${GV.fab.count(wid, d)}/4)`;
    },
  };
  const PART = (id) => PARTS.find((p) => p.id === id) || PARTS[0];

  P.dropExoPiece = function (x, y, titanId) {
    const pk = GV.fab.pick(titanId);
    if (!pk) return;
    this.drops.push({ x, y, vx: (Math.random() - 0.5) * 240, vy: -540, w: 16, h: 16, kind: 'weapon', wid: pk[0], part: pk[1], age: 0 });
  };
  const give0 = P.giveDrop;
  P.giveDrop = function (dr, pl) {
    if (!(dr.kind === 'weapon' && dr.part)) return give0.call(this, dr, pl);
    const tag = this.coop ? `P${((pl && pl.slot) || 0) + 1}: ` : '';
    GV.save.as((pl && pl.slot) || 0, (d) => {
      const label = GV.fab.grant(dr.wid, dr.part, d);
      this.toast(`${tag}EXOTIC PIECE · ${label}`, 3);
      this.toasts[this.toasts.length - 1].sub = 'Assemble all four at a Master Fabricator';
      GV.save.write();
    });
    this.sfx('level'); this.shake(6);
  };
  // ---------- the screen ----------
  let from = 'play', msg = '', tab = 'break';
  const esc = (s) => GV.menus.esc(s);
  function close() {
    GV.save.write();
    if (from === 'play') GV.game.resume();
    else if (from === 'pause') GV.menus.pause();
    else GV.menus.map();
  }
  const costText = (c) => [c.mem ? `${c.mem} ✦` : '', c.alloy ? `${c.alloy} Alloy` : '', c.shard ? `${c.shard} Void Shards` : ''].filter(Boolean).join(' · ');
  const canPay = (c, d = D()) => (d.memories >= (c.mem || 0)) && mats(d).alloy >= (c.alloy || 0) && mats(d).shard >= (c.shard || 0);
  const pay = (c, d = D()) => { d.memories -= c.mem || 0; mats(d).alloy -= c.alloy || 0; mats(d).shard -= c.shard || 0; };
  const spareWeapons = (d) => { const cls = GV.CLASSES[d.cls] || {}; return (d.weapons || []).filter((k) => W[k] && !W[k].legacy && !W[k].exotic && k !== d.weapon && k !== d.offhand && k !== cls.weapon && k !== cls.offhand); };

  function render() {
    const M = GV.menus, d = D(), L = lvl(d), Lv = LEVELS[L], next = LEVELS[L + 1], m = mats(d);
    const TABS = [
      { id: 'break', name: 'Break down', need: 0 },
      { id: 'refine', name: 'Refine', need: 1 },
      { id: 'transmute', name: 'Transmute', need: 2 },
      { id: 'exotics', name: 'Exotics', need: 0 },
    ];
    const tabs = TABS.map((t) => `<button class="seg ${tab === t.id ? 'sel' : ''}" data-a="tab" data-t="${t.id}">${t.name}${L < t.need ? ' 🔒' : ''}</button>`).join('');
    let body = '';
    const locked = (need) => `<p class="note">Upgrade the Fabricator to <b style="color:${LEVELS[need].color}">${LEVELS[need].name}</b> to use this.</p>`;
    if (tab === 'break') {
      const eq = new Set(Object.values(d.equip || {}));
      const items = (d.items || []).filter((i) => !eq.has(i.uid)).sort((a, b) => GV.items.value(b) - GV.items.value(a));
      const wps = spareWeapons(d);
      const yTxt = (y) => `${y.alloy} Alloy${y.shard ? ` · ${y.shard} Shard${y.shard > 1 ? 's' : ''}` : ''}`;
      body = `<p class="note">Breaking something down gives Alloy (and Void Shards from Nova, Singularity, set and prototype pieces). Salvaging gear from the Gear screen gives materials too.</p>
        <div class="menu row left"><button class="ghost" data-a="bulk">Break down all spare Salvaged &amp; Calibrated gear</button></div>
        <div class="fabl">${wps.map((k) => `<div class="row"><div class="ri"><b style="color:${W[k].color}">⚔ ${esc(W[k].name)}</b><span>${esc(GV.weaponTierName ? GV.weaponTierName(k) : '')} weapon</span></div><button data-a="bw" data-k="${k}">${yTxt(weaponYield(k))}</button></div>`).join('')}
        ${items.map((it) => `<div class="row"><div class="ri"><b style="color:${GV.items.color(it)}">${esc(it.name)}</b><span>${esc(GV.items.rarityName(it))} · T${it.tier}</span></div><button data-a="bi" data-u="${it.uid}">${yTxt(itemYield(it))}</button></div>`).join('') || (wps.length ? '' : '<p class="note">Nothing spare to break down.</p>')}</div>`;
    } else if (tab === 'refine') {
      body = L < 1 ? locked(1) : `<p class="note">Melt Alloy down into Void Shards.</p>
        <div class="menu row left"><button class="primary" data-a="refine" data-n="1" ${m.alloy >= REFINE.alloy ? '' : 'disabled'}>${REFINE.alloy} Alloy → ${REFINE.shard} Void Shard</button>
        <button data-a="refine" data-n="10" ${m.alloy >= REFINE.alloy * 10 ? '' : 'disabled'}>×10</button><button data-a="refine" data-n="all" ${m.alloy >= REFINE.alloy ? '' : 'disabled'}>All</button></div>`;
    } else if (tab === 'transmute') {
      body = L < 2 ? locked(2) : `<p class="note">Spend Void Shards on the crafting currency you use on gear.</p><div class="fabl">${Object.keys(TRANSMUTE).filter((k) => GV.CURRENCY[k]).map((k) => {
        const c = GV.CURRENCY[k];
        return `<div class="row"><div class="ri"><b style="color:${c.color}">${esc(c.name)} <small>you have ${d.cur[k] || 0}</small></b><span>${esc(c.desc)}</span></div><button data-a="tm" data-k="${k}" ${m.shard >= TRANSMUTE[k] ? '' : 'disabled'}>${TRANSMUTE[k]} Shards</button></div>`;
      }).join('')}</div>`;
    } else {
      const byTitan = {};
      for (const k of GV.EXOTICS || []) (byTitan[W[k].exotic] = byTitan[W[k].exotic] || []).push(k);
      body = `<p class="note">Titans no longer drop exotics whole. Each one drops pieces: a Frame, a Core, an Edge and a Schematic. Collect all four, then assemble the weapon here at <b style="color:${LEVELS[3].color}">Master</b> level for ${costText(ASSEMBLE)}.</p>` +
        Object.keys(byTitan).map((tid) => `<div class="gsub">${esc((GV.TITANS && GV.TITANS[tid] && GV.TITANS[tid].name) || tid)}</div>` + byTitan[tid].map((k) => {
          const w = W[k], own = (d.weapons || []).includes(k) || (GV.vault && GV.vault.weaponsInVault && GV.vault.weaponsInVault().includes(k)), n = GV.fab.count(k);
          const pcs = PARTS.map((pt) => `<span class="pc ${GV.fab.has(k, pt.id) || own ? 'on' : ''}" title="${pt.name}">${pt.icon} ${pt.name}</span>`).join('');
          const btn = own ? '<button disabled>Owned</button>' : n < 4 ? `<button disabled>${n}/4 pieces</button>` : L < 3 ? '<button disabled>Needs Master</button>' : `<button class="primary" data-a="assemble" data-k="${k}" ${canPay(ASSEMBLE) ? '' : 'disabled'}>Assemble</button>`;
          return `<div class="row exo"><div class="ri"><b style="color:${w.color}">${esc(w.name)} <small class="exo">EXOTIC</small></b><span>${esc(w.desc)}</span><div class="pcs">${pcs}</div></div>${btn}</div>`;
        }).join('')).join('');
    }
    const up = next ? `<button class="primary" data-a="upgrade" ${canPay(next.cost) ? '' : 'disabled'}>Upgrade to ${next.name} · ${costText(next.cost)}</button>` : '<button disabled>Fully upgraded</button>';
    M.render(`
      <div class="screen panel wide fab">
        <div class="topbar"><h2>Fabricator</h2><div class="stats"><b style="color:${Lv.color}">${Lv.name}</b> · ⚙ ${m.alloy} Alloy · ◆ ${m.shard} Void Shards · ✦ ${d.memories}</div></div>
        <div class="fablv">${LEVELS.map((x, i) => `<div class="lv ${i <= L ? 'on' : ''}" style="--c:${x.color}"><b>${x.name}</b><span>${esc(x.unlock)}</span></div>`).join('')}</div>
        <div class="menu row left">${up}</div>
        ${msg ? `<p class="warn">${esc(msg)}</p>` : ''}
        <div class="loadouts fabtabs">${tabs}</div>
        <div class="fabbody">${body}</div>
        <div class="menu row"><button class="primary" data-a="done">Done</button></div>
      </div>`, onAction, close);
  }

  function onAction(a, b) {
    const d = D(), m = mats(d);
    msg = '';
    if (a === 'done') return close();
    if (a === 'tab') tab = b.dataset.t;
    if (a === 'upgrade') { const nx = LEVELS[lvl(d) + 1]; if (nx && canPay(nx.cost)) { pay(nx.cost); d.fab = lvl(d) + 1; GV.audio.sfx('level'); msg = `The Fabricator is now ${nx.name}.`; } }
    if (a === 'bi') { const it = GV.items.get(+b.dataset.u); if (it && !Object.values(d.equip).includes(it.uid)) { d.items = d.items.filter((x) => x !== it); give(itemYield(it)); GV.audio.sfx('mem'); } }
    if (a === 'bw') { const k = b.dataset.k; if (spareWeapons(d).includes(k)) { if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = `Tap again: break down ${W[k].name}`; b.classList.add('danger'); return; } d.weapons = d.weapons.filter((x) => x !== k); give(weaponYield(k)); GV.audio.sfx('mem'); } }
    if (a === 'bulk') {
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again: break down every spare Salvaged and Calibrated item'; b.classList.add('danger'); return; }
      const eq = new Set(Object.values(d.equip));
      for (const it of d.items.slice()) if ((it.rarity === 'magic' || it.rarity === 'normal') && !it.set && !eq.has(it.uid)) { d.items = d.items.filter((x) => x !== it); give(itemYield(it)); }
      GV.audio.sfx('mem');
    }
    if (a === 'refine' && lvl(d) >= 1) {
      const n = b.dataset.n === 'all' ? Math.floor(m.alloy / REFINE.alloy) : Math.min(+b.dataset.n, Math.floor(m.alloy / REFINE.alloy));
      if (n > 0) { m.alloy -= n * REFINE.alloy; m.shard += n * REFINE.shard; GV.audio.sfx('level'); }
    }
    if (a === 'tm' && lvl(d) >= 2) { const k = b.dataset.k, c = TRANSMUTE[k]; if (m.shard >= c) { m.shard -= c; d.cur[k] = (d.cur[k] || 0) + 1; GV.audio.sfx('level'); } }
    if (a === 'assemble' && lvl(d) >= 3) {
      const k = b.dataset.k;
      if (GV.fab.count(k) === 4 && canPay(ASSEMBLE) && !(d.weapons || []).includes(k)) {
        pay(ASSEMBLE); delete parts(d)[k];
        if ((d.weapons || []).length >= (GV.WEAPON_RACK || 99) && GV.vault && GV.vault.stashWeapon && GV.vault.stashWeapon(k)) msg = `${W[k].name} assembled. Your rack is full, so it went to the Shared Vault.`;
        else { d.weapons.push(k); msg = `${W[k].name} assembled! Equip it in Gear → Weapons.`; }
        GV.audio.sfx('level');
      }
    }
    GV.save.write();
    render();
  }

  GV.fabricator = { open(f) { from = f || 'play'; msg = ''; render(); } };
})();
