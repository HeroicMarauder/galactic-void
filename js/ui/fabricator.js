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
  // Four benches, each with its own level. Old saves had one Fabricator level: every bench starts there.
  const BENCHES = {
    armour: { name: 'Armour Bench', icon: '⛨', color: '#8fb8ff', what: 'armour and shields', unlock: ['Break down armour and shields into Alloy.', 'Break-downs yield 25% more. Break down in bulk.', 'Transmute Void Shards into the crafting currency you use on gear.', 'Break-downs yield double, and Stellar gear gives Void Shards too.'] },
    blade: { name: 'Blade Bench', icon: '⚔', color: '#ffb36a', what: 'melee weapons', unlock: ['Break down melee weapons into Alloy.', 'Break-downs yield 25% more. Refine Alloy into Void Shards.', 'Break-downs yield 50% more.', 'Assemble melee exotics from the pieces Titans drop.'] },
    guns: { name: 'Gunsmith', icon: '⌖', color: '#7dffcf', what: 'firearms and bows', unlock: ['Break down firearms and bows into Alloy.', 'Break-downs yield 25% more. Refine Alloy into Void Shards.', 'Break-downs yield 50% more.', 'Assemble firearm exotics from the pieces Titans drop.'] },
    arcane: { name: 'Arcane Bench', icon: '✷', color: '#c79bff', what: 'Star Cores, Augments and spell foci', unlock: ['Break down spare Star Cores, Augments and foci into Void Shards.', 'Break-downs yield 25% more. Forge Void Conduits from Void Shards.', 'Reformat a spare Star Core back into a Blank Core of its tier.', 'Fuse three Blank Cores into one of the next tier.'] },
  };
  const benchLv = (b, d = D()) => { d.benches = d.benches || {}; if (d.benches[b] == null) d.benches[b] = d.fab || 0; return d.benches[b]; };
  const lvl = (d = D()) => Math.max(...Object.keys(BENCHES).map((b) => benchLv(b, d))); // the best bench (old callers)
  const benchOf = (k) => { const w = W[k]; if (!w) return 'blade'; if (w.hand === 'off') return 'armour'; if (w.gun) return 'guns'; if (w.art === 'staff' || w.spell || w.focus) return 'arcane'; return 'blade'; };
  const parts = (d = D()) => (d.exoParts = d.exoParts || {});
  let bench = 'blade';
  const yieldMul = (b = bench) => [1, 1.25, 1.5, b === 'armour' ? 2 : 1.5][benchLv(b)];

  // what breaking something down gives you
  const RAR = { normal: [1, 0], magic: [2, 0], rare: [4, 0], nova: [6, 1], unique: [8, 2] };
  const itemYield = (it) => { const [a, s0] = RAR[it.rarity] || [1, 0]; const s = s0 || (it.rarity === 'rare' && benchLv('armour') >= 3 ? 1 : 0); return { alloy: Math.round(a * (1 + 0.5 * (it.tier - 1)) * yieldMul('armour')), shard: Math.round((s + (it.set ? 1 : 0)) * yieldMul('armour')) }; };
  const weaponYield = (k) => { const t = GV.weaponTier ? GV.weaponTier(k) : 2, b = benchOf(k), m = yieldMul(b); const sh = [0, 0, 0, 2, 2, 0][t] + (b === 'arcane' ? 2 : 0); return { alloy: Math.round([0, 3, 6, 12, 14, 0][t] * m * (b === 'arcane' ? 0.4 : 1)), shard: Math.round(sh * m) }; };
  const give = (y) => { const m = mats(); m.alloy += y.alloy || 0; m.shard += y.shard || 0; };

  // Salvaging gear anywhere now also yields materials.
  const salv0 = GV.items.salvage.bind(GV.items);
  GV.items.salvage = function (uid) { const it = this.get(uid); const v = salv0(uid); if (it) give(itemYield(it)); return v; };

  // ---------- exotic pieces ----------
  GV.fab = {
    LEVELS, PARTS, BENCHES, benchLv, benchOf, mats, lvl, parts, weaponYield, give,
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
      this.toasts[this.toasts.length - 1].sub = `Assemble all four at a Master ${BENCHES[benchOf(dr.wid)].name}`;
      GV.save.write();
    });
    this.sfx('level'); this.shake(6);
  };
  // ---------- the bench screen ----------
  let from = 'play', msg = '', tab = 'break';
  const esc = (s) => GV.menus.esc(s);
  function close() {
    GV.save.write();
    if (from === 'play') GV.game.resume();
    else if (from === 'pause') GV.menus.pause();
    else GV.menus.map();
  }
  const costOf = (L) => { const c = LEVELS[L] && LEVELS[L].cost; return c ? { mem: Math.round(c.mem * 0.6), alloy: Math.round((c.alloy || 0) * 0.6), shard: Math.round((c.shard || 0) * 0.6) } : null; };
  const costText = (c) => [c.mem ? `${c.mem} ✦` : '', c.alloy ? `${c.alloy} Alloy` : '', c.shard ? `${c.shard} Void Shards` : ''].filter(Boolean).join(' · ');
  const canPay = (c, d = D()) => (d.memories >= (c.mem || 0)) && mats(d).alloy >= (c.alloy || 0) && mats(d).shard >= (c.shard || 0);
  const pay = (c, d = D()) => { d.memories -= c.mem || 0; mats(d).alloy -= c.alloy || 0; mats(d).shard -= c.shard || 0; };
  const spareWeapons = (d, b) => { const cls = GV.CLASSES[d.cls] || {}; return (d.weapons || []).filter((k) => W[k] && !W[k].legacy && !W[k].exotic && k !== d.weapon && k !== d.offhand && k !== cls.weapon && k !== cls.offhand && (!b || benchOf(k) === b)); };
  // Star Cores you can spare: not on the bar of either loadout
  const spareCores = (d) => { const keep = new Set([...(d.bar || []), ...((d.loadouts || []).flatMap((L) => (L && L.bar) || []))]); return (d.gems || []).filter((g) => !keep.has(g.uid)); };
  const coreYield = (g) => ({ alloy: 0, shard: Math.round((1 + (GV.GEMS[g.id].tier || 1) - 1 + Math.floor(g.lvl / 4)) * yieldMul('arcane')) });
  const supYield = (s) => ({ alloy: 0, shard: Math.round((GV.SUPPORTS[s.id] ? GV.SUPPORTS[s.id].tier || 1 : 1) * yieldMul('arcane')) });
  const COUPLER = 12, MAX_TIER = Math.max(...Object.values(GV.GEMS).map((g) => g.tier || 1));
  const yTxt = (y) => [y.alloy ? `${y.alloy} Alloy` : '', y.shard ? `${y.shard} Shard${y.shard > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ') || 'nothing';
  const row = (title, color, sub, btn) => `<div class="row"><div class="ri"><b style="color:${color}">${title}</b><span>${sub}</span></div>${btn}</div>`;

  const TABS = {
    armour: [['break', 'Break down', 0], ['transmute', 'Transmute', 2]],
    blade: [['break', 'Break down', 0], ['refine', 'Refine', 1], ['exotics', 'Exotics', 0]],
    guns: [['break', 'Break down', 0], ['refine', 'Refine', 1], ['exotics', 'Exotics', 0]],
    arcane: [['break', 'Break down', 0], ['couplers', 'Conduits', 1], ['reformat', 'Reformat', 2], ['fuse', 'Fuse', 3]],
  };

  function render() {
    const M = GV.menus, d = D(), B = BENCHES[bench], L = benchLv(bench), m = mats(d);
    const tabsDef = TABS[bench];
    if (!tabsDef.some((t) => t[0] === tab)) tab = 'break';
    const tabs = tabsDef.map(([id, name, need]) => `<button class="seg ${tab === id ? 'sel' : ''}" data-a="tab" data-t="${id}">${name}${L < need ? ' 🔒' : ''}</button>`).join('');
    const locked = (need) => `<p class="note">Upgrade the ${esc(B.name)} to <b style="color:${LEVELS[need].color}">${LEVELS[need].name}</b> to use this.</p>`;
    const need = (tabsDef.find((t) => t[0] === tab) || [0, 0, 0])[2];
    let body = '';
    if (L < need) body = locked(need);
    else if (tab === 'break') {
      let rows = '';
      if (bench === 'armour') {
        const eq = new Set(Object.values(d.equip || {}));
        const items = (d.items || []).filter((i) => !eq.has(i.uid)).sort((a, b) => GV.items.value(b) - GV.items.value(a));
        rows += (L >= 1 ? `<div class="menu row left"><button class="ghost" data-a="bulk">Break down all spare Salvaged &amp; Calibrated gear</button></div>` : '');
        rows += spareWeapons(d, 'armour').map((k) => row(`⛉ ${esc(W[k].name)}`, W[k].color, 'Shield', `<button data-a="bw" data-k="${k}">${yTxt(weaponYield(k))}</button>`)).join('');
        rows += items.map((it) => row(esc(it.name), GV.items.color(it), `${esc(GV.items.rarityName(it))} · T${it.tier}`, `<button data-a="bi" data-u="${it.uid}">${yTxt(itemYield(it))}</button>`)).join('');
      } else if (bench === 'arcane') {
        rows += spareWeapons(d, 'arcane').map((k) => row(`✷ ${esc(W[k].name)}`, W[k].color, 'Spell focus', `<button data-a="bw" data-k="${k}">${yTxt(weaponYield(k))}</button>`)).join('');
        rows += spareCores(d).map((g) => { const G = GV.GEMS[g.id]; return row(`${G.icon} ${esc(G.name)} <small>Lv ${g.lvl}</small>`, G.color, `Spare Star Core · Tier ${G.tier}`, `<button data-a="bc" data-u="${g.uid}">${yTxt(coreYield(g))}</button>`); }).join('');
        rows += GV.inv.freeSups().map((x) => { const S2 = GV.SUPPORTS[x.id]; return row(`◇ ${esc(S2.name)}`, '#c9d2e6', 'Spare Augment', `<button data-a="bs" data-u="${x.uid}">${yTxt(supYield(x))}</button>`); }).join('');
      } else {
        rows += spareWeapons(d, bench).map((k) => row(`${B.icon} ${esc(W[k].name)}`, W[k].color, `${esc(GV.weaponTierName ? GV.weaponTierName(k) : '')} ${bench === 'guns' ? 'firearm' : 'weapon'}`, `<button data-a="bw" data-k="${k}">${yTxt(weaponYield(k))}</button>`)).join('');
      }
      body = `<p class="note">Break down spare ${esc(B.what)}. Anything you have equipped or on your skill bar is kept safe.</p><div class="fabl">${rows || '<p class="note fnone">Nothing spare to break down here.</p>'}</div>`;
    } else if (tab === 'refine') {
      body = `<p class="note">Melt Alloy down into Void Shards.</p>
        <div class="menu row left"><button class="primary" data-a="refine" data-n="1" ${m.alloy >= REFINE.alloy ? '' : 'disabled'}>${REFINE.alloy} Alloy → ${REFINE.shard} Void Shard</button>
        <button data-a="refine" data-n="10" ${m.alloy >= REFINE.alloy * 10 ? '' : 'disabled'}>×10</button><button data-a="refine" data-n="all" ${m.alloy >= REFINE.alloy ? '' : 'disabled'}>All</button></div>`;
    } else if (tab === 'transmute') {
      body = `<p class="note">Spend Void Shards on the crafting currency you use on gear.</p><div class="fabl">${Object.keys(TRANSMUTE).filter((k) => GV.CURRENCY[k]).map((k) => {
        const c = GV.CURRENCY[k];
        return row(`${esc(c.name)} <small>you have ${d.cur[k] || 0}</small>`, c.color, esc(c.desc), `<button data-a="tm" data-k="${k}" ${m.shard >= TRANSMUTE[k] ? '' : 'disabled'}>${TRANSMUTE[k]} Shards</button>`);
      }).join('')}</div>`;
    } else if (tab === 'couplers') {
      body = `<p class="note">A ${esc(GV.TERMS.orb)} adds an augment port to a Star Core. You have ${d.orbs}.</p>
        <div class="menu row left"><button class="primary" data-a="coupler" ${m.shard >= COUPLER ? '' : 'disabled'}>Forge one · ${COUPLER} Void Shards</button></div>`;
    } else if (tab === 'reformat') {
      const list = spareCores(d);
      body = `<p class="note">Wipe a spare Star Core back into a Blank Core of the same tier, ready to format into something else. Its level is lost.</p><div class="fabl">${list.map((g) => { const G = GV.GEMS[g.id]; return row(`${G.icon} ${esc(G.name)} <small>Lv ${g.lvl}</small>`, G.color, `Tier ${G.tier}`, `<button data-a="reformat" data-u="${g.uid}">Reformat · 3 Shards</button>`); }).join('') || '<p class="note fnone">No spare Star Cores.</p>'}</div>`;
    } else if (tab === 'fuse') {
      const rowsF = [];
      for (const kind of ['skill', 'support']) for (let t = 1; t < MAX_TIER; t++) {
        const n = d.uncut.filter((u) => u.kind === kind && u.tier === t).length;
        if (!n) continue;
        rowsF.push(row(`Blank ${kind === 'skill' ? 'Star Core' : 'Augment'} · Tier ${t} <small>you have ${n}</small>`, kind === 'skill' ? '#6fd3ff' : '#c9d2e6', `Fuse three into one Tier ${t + 1}`, `<button data-a="fuse" data-k="${kind}" data-t="${t}" ${n >= 3 && m.shard >= 5 ? '' : 'disabled'}>Fuse 3 · 5 Shards</button>`));
      }
      body = `<p class="note">Three Blank Cores of one tier fuse into a single Blank Core of the next tier up.</p><div class="fabl">${rowsF.join('') || '<p class="note fnone">No Blank Cores below the top tier.</p>'}</div>`;
    } else {
      const byTitan = {};
      for (const k of GV.EXOTICS || []) if (benchOf(k) === bench) (byTitan[W[k].exotic] = byTitan[W[k].exotic] || []).push(k);
      body = `<p class="note">Titans drop exotics in four pieces: a Frame, a Core, an Edge and a Schematic. Collect all four, then assemble the weapon here once this bench is <b style="color:${LEVELS[3].color}">Master</b> (${costText(ASSEMBLE)}).</p>` +
        (Object.keys(byTitan).map((tid) => `<div class="gsub">${esc((GV.TITANS && GV.TITANS[tid] && GV.TITANS[tid].name) || tid)}</div>` + byTitan[tid].map((k) => {
          const w = W[k], own = (d.weapons || []).includes(k) || (GV.vault && GV.vault.weaponsInVault && GV.vault.weaponsInVault().includes(k)), n = GV.fab.count(k);
          const pcs = PARTS.map((pt) => `<span class="pc ${GV.fab.has(k, pt.id) || own ? 'on' : ''}" title="${pt.name}">${pt.icon} ${pt.name}</span>`).join('');
          const btn = own ? '<button disabled>Owned</button>' : n < 4 ? `<button disabled>${n}/4 pieces</button>` : L < 3 ? '<button disabled>Needs Master</button>' : `<button class="primary" data-a="assemble" data-k="${k}" ${canPay(ASSEMBLE) ? '' : 'disabled'}>Assemble</button>`;
          return `<div class="row exo"><div class="ri"><b style="color:${w.color}">${esc(w.name)} <small class="exo">EXOTIC</small></b><span>${esc(w.desc)}</span><div class="pcs">${pcs}</div></div>${btn}</div>`;
        }).join('')).join('') || '<p class="note fnone">No exotics are made at this bench.</p>');
    }
    const nextC = costOf(L + 1);
    const up = nextC ? `<button class="primary" data-a="upgrade" ${canPay(nextC) ? '' : 'disabled'}>Upgrade to ${LEVELS[L + 1].name} · ${costText(nextC)}</button>` : '<button disabled>Fully upgraded</button>';
    const switcher = Object.keys(BENCHES).map((k) => `<button class="seg ${k === bench ? 'sel' : ''}" data-a="bench" data-k="${k}" style="--c:${BENCHES[k].color}"><b style="color:${BENCHES[k].color}">${BENCHES[k].icon}</b> ${esc(BENCHES[k].name)} <small>${LEVELS[benchLv(k)].name}</small></button>`).join('');
    M.render(`
      <div class="screen panel wide fab bench-${bench}">
        <div class="topbar"><h2 style="color:${B.color}">${B.icon} ${esc(B.name)}</h2><div class="stats"><b style="color:${LEVELS[L].color}">${LEVELS[L].name}</b> · ⚙ ${m.alloy} Alloy · ◆ ${m.shard} Void Shards · ✦ ${d.memories}</div></div>
        <div class="loadouts benchsw">${switcher}</div>
        <div class="fablv">${LEVELS.map((x, i) => `<div class="lv ${i <= L ? 'on' : ''}" style="--c:${x.color}"><b>${x.name}</b><span>${esc(B.unlock[i])}</span></div>`).join('')}</div>
        <div class="menu row left">${up}</div>
        ${msg ? `<p class="warn">${esc(msg)}</p>` : ''}
        <div class="loadouts fabtabs">${tabs}</div>
        <div class="fabbody">${body}</div>
        <div class="menu row"><button class="primary" data-a="done">Done</button></div>
      </div>`, onAction, close);
  }

  const arm = (b, text) => { if (b.dataset.armed) return true; b.dataset.armed = '1'; b.textContent = text; b.classList.add('danger'); return false; };
  function onAction(a, b) {
    const d = D(), m = mats(d);
    msg = '';
    if (a === 'done') return close();
    if (a === 'tab') tab = b.dataset.t;
    if (a === 'bench') { bench = b.dataset.k; tab = 'break'; }
    if (a === 'upgrade') { const L = benchLv(bench), c = costOf(L + 1); if (c && canPay(c)) { pay(c); d.benches[bench] = L + 1; GV.audio.sfx('level'); msg = `The ${BENCHES[bench].name} is now ${LEVELS[L + 1].name}.`; } }
    if (a === 'bi') { const it = GV.items.get(+b.dataset.u); if (it && !Object.values(d.equip).includes(it.uid)) { d.items = d.items.filter((x) => x !== it); give(itemYield(it)); GV.audio.sfx('mem'); } }
    if (a === 'bw') { const k = b.dataset.k; if (spareWeapons(d).includes(k)) { if (!arm(b, `Tap again: break down ${W[k].name}`)) return; d.weapons = d.weapons.filter((x) => x !== k); give(weaponYield(k)); GV.audio.sfx('mem'); } }
    if (a === 'bc') { const g = spareCores(d).find((x) => x.uid === +b.dataset.u); if (g) { if (!arm(b, `Tap again: break down ${GV.GEMS[g.id].name}`)) return; d.gems = d.gems.filter((x) => x !== g); give(coreYield(g)); GV.audio.sfx('mem'); } }
    if (a === 'bs') { const s = GV.inv.freeSups().find((x) => x.uid === +b.dataset.u); if (s) { d.sups = d.sups.filter((x) => x !== s); give(supYield(s)); GV.audio.sfx('mem'); } }
    if (a === 'bulk') {
      if (!arm(b, 'Tap again: break down every spare Salvaged and Calibrated item')) return;
      const eq = new Set(Object.values(d.equip));
      for (const it of d.items.slice()) if ((it.rarity === 'magic' || it.rarity === 'normal') && !it.set && !eq.has(it.uid)) { d.items = d.items.filter((x) => x !== it); give(itemYield(it)); }
      GV.audio.sfx('mem');
    }
    if (a === 'refine' && benchLv(bench) >= 1) {
      const n = b.dataset.n === 'all' ? Math.floor(m.alloy / REFINE.alloy) : Math.min(+b.dataset.n, Math.floor(m.alloy / REFINE.alloy));
      if (n > 0) { m.alloy -= n * REFINE.alloy; m.shard += n * REFINE.shard; GV.audio.sfx('level'); }
    }
    if (a === 'tm' && benchLv('armour') >= 2) { const k = b.dataset.k, c = TRANSMUTE[k]; if (m.shard >= c) { m.shard -= c; d.cur[k] = (d.cur[k] || 0) + 1; GV.audio.sfx('level'); } }
    if (a === 'coupler' && benchLv('arcane') >= 1 && m.shard >= COUPLER) { m.shard -= COUPLER; d.orbs++; GV.audio.sfx('level'); msg = `Forged a ${GV.TERMS.orb}. You have ${d.orbs}.`; }
    if (a === 'reformat' && benchLv('arcane') >= 2) {
      const g = spareCores(d).find((x) => x.uid === +b.dataset.u);
      if (g && m.shard >= 3) { if (!arm(b, `Tap again: wipe ${GV.GEMS[g.id].name}`)) return; m.shard -= 3; d.gems = d.gems.filter((x) => x !== g); d.uncut.push({ kind: 'skill', tier: GV.GEMS[g.id].tier || 1 }); GV.audio.sfx('level'); msg = `${GV.GEMS[g.id].name} is a Blank Core again.`; }
    }
    if (a === 'fuse' && benchLv('arcane') >= 3) {
      const kind = b.dataset.k, t = +b.dataset.t, idx = [];
      d.uncut.forEach((u, i) => { if (u.kind === kind && u.tier === t && idx.length < 3) idx.push(i); });
      if (idx.length === 3 && m.shard >= 5) { m.shard -= 5; d.uncut = d.uncut.filter((_, i) => !idx.includes(i)); d.uncut.push({ kind, tier: t + 1 }); GV.audio.sfx('level'); msg = `Fused into a Tier ${t + 1} Blank ${kind === 'skill' ? 'Star Core' : 'Augment'}.`; }
    }
    if (a === 'assemble' && benchLv(bench) >= 3) {
      const k = b.dataset.k;
      if (benchOf(k) === bench && GV.fab.count(k) === 4 && canPay(ASSEMBLE) && !(d.weapons || []).includes(k)) {
        pay(ASSEMBLE); delete parts(d)[k];
        if ((d.weapons || []).length >= (GV.WEAPON_RACK || 99) && GV.vault && GV.vault.stashWeapon && GV.vault.stashWeapon(k)) msg = `${W[k].name} assembled. Your rack is full, so it went to the Shared Vault.`;
        else { d.weapons.push(k); msg = `${W[k].name} assembled! Equip it in Gear → Weapons.`; }
        GV.audio.sfx('level');
      }
    }
    GV.save.write();
    render();
  }

  GV.fabricator = { open(f, b) { from = f || 'play'; msg = ''; if (b && BENCHES[b]) { bench = b; tab = 'break'; } render(); } };
})();
