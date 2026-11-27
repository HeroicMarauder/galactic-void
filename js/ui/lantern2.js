// Galactic Void — life aboard the Lantern: crew rooms, the hangar (companion drones), the wardrobe
// (suit dyes), New Game+ ("Ascend the Void"), and photo mode.
(function () {
  const GV = window.GV, U = GV.util, P = GV.Play.prototype, M = GV.menus, esc = M.esc, memIcon = M.memIcon;
  const D = () => GV.save.data;
  const day = () => GV.daily.today();
  let msg = '';
  const flash = (m) => { msg = m; };

  // ======================= CREW ROOMS =======================
  GV.CREW = {
    ione: { name: 'Ione Vael', role: 'Navigator', room: 'Nav Deck', color: '#8fe9ff', unlock: () => !!D().shipFound, lock: 'Find the Lantern.',
      per: { memFind: 10 }, gift: 'memories', lines: ['"The charts lie. I draw my own now."', '"There\'s a current under the nebula. Ride it and you find more."', '"I mapped a way home once. I burned it."', '"Every star out here is somebody\'s last light."'] },
    dax: { name: 'Dax Morrow', role: 'Quartermaster', room: 'Armoury', color: '#ff8a5a', unlock: () => GV.progress.frontier() >= 1, lock: 'Reach the second system.',
      per: { dmg: 4 }, gift: 'currency', lines: ['"Bring me scrap. I\'ll bring you teeth."', '"Calibrated the rails again. Hit harder."', '"I don\'t sleep. The guns don\'t either."', '"You keep coming back. That\'s the best gear there is."'] },
    sol: { name: 'Sol Hadley', role: 'Medic', room: 'Medbay', color: '#9fffd8', unlock: () => GV.progress.frontier() >= 2, lock: 'Reach the third system.',
      per: { lifePct: 4, regen: 1 }, gift: 'orb', lines: ['"Hold still. This will only hurt for a while."', '"Your blood\'s half Void now. Still red, though."', '"I patched worse. I patched myself."', '"Come back in one piece. Or bring all the pieces."'] },
    kaito: { name: 'Kaito Rhys', role: 'Engineer', room: 'Drone Bay', color: '#ffb347', unlock: () => Object.values(D().titans || (GV.save.main || {}).titans || {}).some((n) => n > 0), lock: 'Fell a Titan.',
      per: { minionDmg: 10 }, gift: 'blank', drone: 0.15, lines: ['"Drones don\'t panic. That\'s why I like them."', '"Rewired your companion. It shoots straighter."', '"Titan scrap makes beautiful servos."', '"If it beeps, I can fix it. If it screams, call Sol."'] },
    mara: { name: 'Mara Quill', role: 'Gunsmith', room: 'Forge', color: '#ffd36b', unlock: () => GV.progress.frontier() >= 3, lock: 'Reach the fourth system.',
      per: { critChance: 8 }, gift: 'ember', lines: ['"A weapon\'s just a promise you keep with your hands."', '"Folded a star into this edge. Mind the glare."', '"Every Titan I hear about, I sharpen something."', '"Crit\'s not luck. It\'s rhythm."'] },
  };
  const ROOM_COST = [300, 900, 2200];
  const crew = () => { const d = D(); d.crew = d.crew || {}; return d.crew; };
  GV.crewStats = function () {
    const c = crew(), out = {};
    for (const k in GV.CREW) { const lv = (c[k] && c[k].lv) || 0; if (!lv) continue; for (const s in GV.CREW[k].per) out[s] = (out[s] || 0) + GV.CREW[k].per[s] * lv; }
    return out;
  };
  const droneMul = () => 1 + ((crew().kaito && crew().kaito.lv) || 0) * GV.CREW.kaito.drone;
  function giveGift(k) {
    const d = D(), F = GV.progress.frontier(), g = GV.CREW[k].gift;
    if (g === 'memories') { const n = 60 * (1 + F); d.memories += n; return `${n} memories`; }
    if (g === 'currency') { const ks = ['alch', 'chaos', 'annul', 'divine']; const a = ks[Math.floor(Math.random() * ks.length)]; d.cur[a] = (d.cur[a] || 0) + 2; return `2 × ${GV.CURRENCY[a].name}`; }
    if (g === 'orb') { d.orbs = (d.orbs || 0) + 1; return 'a ' + GV.TERMS.orb; }
    if (g === 'blank') { d.uncut.push({ kind: Math.random() < 0.5 ? 'skill' : 'support', tier: 2 }); return 'a Tier 2 blank'; }
    if (g === 'ember') { d.cur.exalt = (d.cur.exalt || 0) + 1; return 'a Star Ember'; }
  }
  M.crew = function () {
    const d = D(), c = crew();
    const cards = Object.keys(GV.CREW).map((k) => {
      const C = GV.CREW[k], open = C.unlock(), st = c[k] || { lv: 0 }, lv = st.lv || 0, max = lv >= 3, cost = ROOM_COST[lv];
      const bonus = Object.keys(C.per).map((s) => GV.STATS.fmt(s, C.per[s] * Math.max(1, lv))).join(', ');
      const gifted = st.gift === day();
      return `<div class="crewcard ${open ? '' : 'locked'}" style="--cc:${C.color}">
        <canvas class="crewArt" data-k="${k}" width="120" height="120"></canvas>
        <div class="cinfo"><b>${esc(C.name)}</b><span class="role">${esc(C.role)} · ${esc(C.room)} ${open ? `<i>Lv ${lv}/3</i>` : ''}</span>
        ${open ? `<em>${esc(C.lines[Math.min(3, lv)])}</em><span class="cb">${lv ? 'Room bonus: ' : 'Upgrade the room for: '}${esc(bonus)}${k === 'kaito' ? ` · companion drones ${Math.round(GV.CREW.kaito.drone * 100 * Math.max(1, lv))}% stronger` : ''}</span>` : `<em>Not aboard yet. ${esc(C.lock)}</em>`}
        ${open ? `<div class="cbtn"><button data-l="room" data-k="${k}" ${max || d.memories < cost ? 'disabled' : ''}>${max ? 'Room maxed' : `${lv ? 'Upgrade' : 'Build'} room · ${memIcon} ${cost}`}</button>
          <button class="${gifted ? '' : 'primary'}" data-l="gift" data-k="${k}" ${gifted ? 'disabled' : ''}>${gifted ? 'Visited today' : 'Visit (daily gift)'}</button></div>` : ''}</div></div>`;
    }).join('');
    M.render(`<div class="screen panel wide crewscreen"><div class="topbar"><h2>Crew Quarters</h2><div class="stats">${memIcon} ${d.memories}</div></div>
      ${msg ? `<p class="ok">${esc(msg)}</p>` : '<p class="muted">The people who made it aboard. Build out their rooms for permanent bonuses, and drop by once a day.</p>'}
      <div class="crewgrid">${cards}</div>
      <div class="menu row"><button data-a="back">The Lantern</button></div></div>`, (a) => { if (a === 'back') { msg = ''; M.lantern(); } }, () => { msg = ''; M.lantern(); });
    bindL((a, b) => {
      const k = b.dataset.k, C = GV.CREW[k], st = (c[k] = c[k] || { lv: 0 });
      if (a === 'room') { const cost = ROOM_COST[st.lv || 0]; if ((st.lv || 0) < 3 && d.memories >= cost) { d.memories -= cost; st.lv = (st.lv || 0) + 1; flash(`${C.room} upgraded.`); GV.audio.sfx('level'); } }
      if (a === 'gift' && st.gift !== day()) { st.gift = day(); flash(`${C.name} gave you ${giveGift(k)}.`); GV.audio.sfx('level'); }
      GV.save.write(); M.crew();
    });
    // portraits
    document.querySelectorAll('.crewArt').forEach((cv) => {
      const C = GV.CREW[cv.dataset.k], g = cv.getContext('2d');
      const kit = { ione: { helm: 'visor', suit: 'cloak', boots: 'std' }, dax: { helm: 'mask', suit: 'plate', boots: 'greave' }, sol: { helm: 'dome', suit: 'robe', boots: 'std' }, kaito: { helm: 'visor', suit: 'rig', boots: 'mag' }, mara: { helm: 'horned', suit: 'harness', boots: 'greave' } }[cv.dataset.k];
      g.clearRect(0, 0, 120, 120);
      GV.art.spaceman(g, 60, 112, { facing: 1, t: 0.4, scale: 1.6, cloak: '#252a3b', visor: C.color, visorGlow: 'rgba(255,255,255,0.25)', kit: Object.assign({ c: { suit: C.color, helm: C.color, boots: C.color } }, kit) });
    });
  };
  // Buttons in these screens use data-l so the shared render handler doesn't see them.
  function bindL(fn) {
    document.querySelectorAll('#ui [data-l]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); if (!b.disabled) fn(b.dataset.l, b); }));
  }

  // ======================= HANGAR: COMPANION DRONES =======================
  GV.COMPANIONS = {
    wisp: { name: 'Lumen Wisp', cost: 0, color: '#9fffd8', desc: 'Mends you: regenerates 2% of your Life per second while you are below half.' },
    magnet: { name: 'Salvage Magnet', cost: 400, color: '#ffd36b', desc: 'Pulls memories and loot to you from far away.' },
    sentinel: { name: 'Sentinel', cost: 700, color: '#ff8a5a', desc: 'Fires at the nearest enemy every 1.2s for 40% of your main skill\'s damage.' },
    spotter: { name: 'Spotter', cost: 900, color: '#c79bff', desc: 'Marks the toughest enemy near you every 3s. Marked enemies take 25% more damage.' },
  };
  M.hangar = function () {
    const d = D(); d.companions = d.companions || ['wisp'];
    const rows = Object.keys(GV.COMPANIONS).map((k) => {
      const C = GV.COMPANIONS[k], own = d.companions.includes(k), on = d.companion === k;
      return `<div class="row"><div class="ri"><b style="color:${C.color}">◆ ${esc(C.name)}</b><span>${esc(C.desc)}</span></div>
        ${on ? '<button data-l="off">Deployed · recall</button>' : own ? `<button class="primary" data-l="on" data-k="${k}">Deploy</button>` : `<button data-l="buy" data-k="${k}" ${d.memories < C.cost ? 'disabled' : ''}>${memIcon} ${C.cost}</button>`}</div>`;
    }).join('');
    M.render(`<div class="screen panel shop hangar"><div class="topbar"><h2>Hangar</h2><div class="stats">${memIcon} ${d.memories}</div></div>
      <p>${msg ? `<span class="ok">${esc(msg)}</span>` : 'One companion drone flies with you on every drop.'} Kaito's Drone Bay makes them ${Math.round((droneMul() - 1) * 100)}% stronger.</p>
      <div class="rows">${rows}</div>
      <div class="menu row"><button data-a="back">The Lantern</button></div></div>`, (a) => { if (a === 'back') { msg = ''; M.lantern(); } }, () => { msg = ''; M.lantern(); });
    bindL((a, b) => {
      const k = b.dataset.k;
      if (a === 'buy' && d.memories >= GV.COMPANIONS[k].cost) { d.memories -= GV.COMPANIONS[k].cost; d.companions.push(k); d.companion = k; flash(`${GV.COMPANIONS[k].name} deployed.`); GV.audio.sfx('level'); }
      if (a === 'on') d.companion = k;
      if (a === 'off') d.companion = null;
      GV.save.write(); M.hangar();
    });
  };
  // The companion in play.
  function compTick(p, pl, dt) {
    const id = pl._comp; if (!id || pl.dead) return;
    const c = (pl._cs = pl._cs || { x: pl.cx, y: pl.y - 30, t: 0, cd: 1 }), mul = pl._compMul || 1;
    c.t += dt;
    const tx = pl.cx - pl.facing * 30, ty = pl.y - 22 + Math.sin(c.t * 2.4) * 6;
    c.x += (tx - c.x) * Math.min(1, dt * 5); c.y += (ty - c.y) * Math.min(1, dt * 5);
    c.cd -= dt;
    if (id === 'wisp') { if (pl.hp < pl.maxHp * 0.5) { pl.heal(pl.maxHp * 0.02 * mul * dt); if (Math.random() < dt * 6) p.parts.push({ x: c.x, y: c.y, vx: (pl.cx - c.x) * 2, vy: (pl.cy - c.y) * 2, life: 0.4, max: 0.4, size: 2.5, color: '#9fffd8', add: true }); } }
    if (id === 'magnet') for (const dr of p.drops) { const dx = pl.cx - dr.x, dy = pl.cy - dr.y, dd = Math.hypot(dx, dy); if (dd < 380 * mul && dd > 10 && dr.age > 0.3) { dr.x += (dx / dd) * 420 * dt; dr.y += (dy / dd) * 420 * dt; dr.vy = Math.min(dr.vy || 0, 0); } }
    if (id === 'sentinel' && c.cd <= 0) {
      let best = null, bd = 380;
      for (const e of p.enemies) { if (e.dead || (e.def && e.def.static) || (e.alpha != null && e.alpha < 0.4)) continue; const dd = Math.hypot(e.x + e.w / 2 - c.x, e.y + e.h / 2 - c.y); if (dd < bd) { bd = dd; best = e; } }
      c.cd = best ? 1.2 : 0.3;
      if (best) {
        const s0 = pl.skills.find((s) => s && s.total > 0);
        const amt = (s0 ? s0.total : 20) * 0.4 * mul;
        p.bolts.push({ pts: [{ x: c.x, y: c.y }, { x: best.x + best.w / 2, y: best.y + best.h / 2 }], t: 0.12, max: 0.12, color: '#ff8a5a' });
        p.damageEnemy(best, amt, Math.sign(best.x - c.x) * 60, -40, false, 'phys');
      }
    }
    if (id === 'spotter' && c.cd <= 0) {
      c.cd = 3;
      let best = null, bh = 0;
      for (const e of p.enemies) { if (e.dead || (e.def && e.def.static)) continue; const dd = Math.hypot(e.x - pl.cx, e.y - pl.cy); if (dd < 520 && e.maxHp > bh) { bh = e.maxHp; best = e; } }
      if (best) { best.markT = 3; p.text(best.x + best.w / 2, best.y - 18, 'MARKED', '#c79bff', 12); }
    }
  }
  const de0 = P.damageEnemy;
  P.damageEnemy = function (e, amt, kx, ky, crit, dom) {
    if (e.markT > 0) amt *= 1 + 0.25 * (this.player._compMul || 1);
    return de0.call(this, e, amt, kx, ky, crit, dom);
  };
  function compDraw(ctx, pl) {
    const c = pl._cs; if (!pl._comp || !c || pl.dead) return;
    const C = GV.COMPANIONS[pl._comp], A = GV.art;
    A.glow(ctx, c.x, c.y, 16, C.color + '66');
    ctx.save(); ctx.fillStyle = '#2c3142';
    ctx.beginPath(); ctx.ellipse(c.x, c.y, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.color; ctx.beginPath(); ctx.arc(c.x + pl.facing * 3, c.y - 1, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.color; ctx.globalAlpha = 0.6; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c.x - 9, c.y + 2 + Math.sin(c.t * 30)); ctx.lineTo(c.x - 13, c.y + 2); ctx.moveTo(c.x + 9, c.y + 2 + Math.cos(c.t * 30)); ctx.lineTo(c.x + 13, c.y + 2); ctx.stroke();
    ctx.restore();
  }

  // ======================= WARDROBE: SUIT DYES =======================
  GV.DYES = {
    none: { name: 'Class colours', c: null, cost: 0 },
    voidblack: { name: 'Void Black', c: '#17141f', cost: 0 },
    ivory: { name: 'Ivory', c: '#e8e2d4', cost: 150 },
    ember: { name: 'Ember', c: '#ff7a4a', cost: 150 },
    glacier: { name: 'Glacier', c: '#9fe8ff', cost: 150 },
    verdant: { name: 'Verdant', c: '#7dffcf', cost: 200 },
    royal: { name: 'Royal', c: '#8a6bff', cost: 200 },
    crimson: { name: 'Crimson', c: '#ff4f6a', cost: 250 },
    gold: { name: 'Gold', c: '#ffd36b', cost: 400 },
    singularity: { name: 'Singularity', c: '#ff4f8a', cost: 0, ng: 1 },
    starforged: { name: 'Star-forged', c: '#fff4c2', cost: 0, ng: 2 },
    abyss: { name: 'Abyss', c: '#3b1d6e', cost: 0, ng: 3 },
  };
  const DSLOT = { base: 'Suit & cloak', trim: 'Trim', visor: 'Visor' };
  GV.dyeLook = function (d) {
    const y = d.dye || {}, out = {};
    const col = (k) => (y[k] && GV.DYES[y[k]] && GV.DYES[y[k]].c) || null;
    if (col('base')) { out.cloak = shade(col('base'), -0.45); out.suit = col('base'); }
    if (col('visor')) { out.visor = col('visor'); out.glow = hexA(col('visor'), 0.35); }
    out.trim = col('trim');
    return out;
  };
  const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const shade = (h, k) => { const n = parseInt(h.slice(1), 16); const f = (v) => Math.round(Math.max(0, Math.min(255, v + (k < 0 ? v * k : (255 - v) * k)))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
  M.wardrobe = function () {
    const d = D(); d.dyes = d.dyes || ['none', 'voidblack']; d.dye = d.dye || {};
    const ng = d.ng || 0;
    const sw = (slot) => Object.keys(GV.DYES).map((k) => {
      const Y = GV.DYES[k], own = d.dyes.includes(k) || (Y.ng && ng >= Y.ng), on = (d.dye[slot] || 'none') === k;
      const locked = Y.ng && ng < Y.ng;
      return `<button class="dye ${on ? 'sel' : ''} ${locked ? 'locked' : ''}" data-l="${own ? 'pick' : 'buy'}" data-s="${slot}" data-k="${k}" ${locked || (!own && d.memories < Y.cost) ? 'disabled' : ''} title="${esc(Y.name)}">
        <i style="background:${Y.c || 'linear-gradient(135deg,#8fe9ff,#ff8a5a)'}"></i><span>${esc(Y.name)}</span><em>${locked ? `NG+${Y.ng}` : own ? '' : `${memIcon} ${Y.cost}`}</em></button>`;
    }).join('');
    M.render(`<div class="screen panel wide wardrobe"><div class="topbar"><h2>Wardrobe</h2><div class="stats">${memIcon} ${d.memories}</div></div>
      <div class="wrow"><canvas id="dyeCv" width="220" height="220"></canvas><div class="wcols">${Object.keys(DSLOT).map((s) => `<div class="gsub">${DSLOT[s]}</div><div class="dyes">${sw(s)}</div>`).join('')}</div></div>
      ${msg ? `<p class="ok">${esc(msg)}</p>` : '<p class="muted">Dyes you buy work on any slot. Some only come from Ascending the Void.</p>'}
      <div class="menu row">${GV.creator ? '<button class="primary" data-a="look">Appearance</button>' : ''}${GV.raceChange ? `<button data-a="race">Race · ${esc((GV.RACES[GV.raceOf(d)] || {}).name || 'Human')}</button>` : ''}<button data-a="back">The Lantern</button></div></div>`, (a) => { if (a === 'look' && GV.creator) return GV.creator.edit(() => M.wardrobe()); if (a === 'race' && GV.raceChange) return GV.raceChange(() => M.wardrobe()); if (a === 'back') { msg = ''; M.lantern(); } }, () => { msg = ''; M.lantern(); });
    bindL((a, b) => {
      const k = b.dataset.k, s = b.dataset.s;
      if (a === 'buy' && d.memories >= GV.DYES[k].cost) { d.memories -= GV.DYES[k].cost; d.dyes.push(k); d.dye[s] = k; flash(`${GV.DYES[k].name} dye bought.`); }
      if (a === 'pick') d.dye[s] = k;
      GV.save.write(); M.wardrobe();
    });
    const cv = document.getElementById('dyeCv');
    const cls = GV.CLASSES[d.cls] || {}, look = Object.assign({}, cls.look || {}), dy = GV.dyeLook(d);
    Object.assign(look, dy);
    const kit = GV.kitLook(d); if (dy.trim) kit.c = { suit: dy.trim, helm: dy.trim, boots: dy.trim };
    const W = GV.equippedWeapon(d);
    const draw = (now) => {
      if (!document.body.contains(cv)) return;
      const g = cv.getContext('2d'), t = now / 1000;
      g.clearRect(0, 0, 220, 220);
      GV.art.glow(g, 110, 120, 90, 'rgba(120,160,255,0.12)');
      GV.art.spaceman(g, 110, 200, { facing: 1, t, scale: 2.6, cloak: look.cloak, visor: look.visor, visorGlow: look.glow, suit: look.suit, kit, gear: W.art, gearColor: W.color, off: W.offArt, offColor: W.offColor, race: GV.raceOf ? GV.raceOf(d) : undefined, custom: d.look && GV.lookOf ? GV.lookOf(d) : undefined });
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  };

  // ======================= NEW GAME+ =======================
  GV.ngReady = () => { const t = (GV.save.main || D()).titans || D().titans || {}; return ['kharybdis', 'seraph', 'kronos'].every((k) => (t[k] || 0) > 0); }; // the original three; Draconis is optional
  M.ascendVoid = function () {
    const d = D(), ng = d.ng || 0, ready = GV.ngReady();
    M.render(`<div class="screen panel narrow ngscreen"><h2>Ascend the Void</h2><div class="sub">New Game+ · currently ${ng ? 'NG+' + ng : 'your first voyage'}</div>
      <p>Turn the Lantern back to the first star and do it all again, harder. Your rank, Star Cores, gear, weapons, crew, passive tree and the Lantern itself all come with you. The star map, its stage clears and its gates reset.</p>
      <div class="how"><div><b>Enemies</b><span>+${50 * (ng + 1)}% Life, +${25 * (ng + 1)}% damage</span></div><div><b>Memories</b><span>+${25 * (ng + 1)}%</span></div><div><b>Loot</b><span>Better rarity rolls</span></div></div>
      <p class="muted">Each ascension also grants 3 ${GV.TERMS.orbs}, 2 Star Embers and unlocks a prestige dye. ${ready ? '' : '<b>Fell all three Titans first.</b>'}</p>
      <div class="menu"><button class="${ready ? 'danger' : ''}" data-l="go" ${ready ? '' : 'disabled'}>Ascend to NG+${ng + 1}</button><button data-a="back">The Lantern</button></div></div>`, (a) => { if (a === 'back') M.lantern(); }, () => M.lantern());
    bindL((a, b) => {
      if (a !== 'go' || !GV.ngReady()) return;
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again: reset the star map and ascend'; return; }
      d.ng = ng + 1; d.cleared = {};
      d.orbs = (d.orbs || 0) + 3; d.cur.exalt = (d.cur.exalt || 0) + 2;
      GV.save.write(); GV.audio.sfx('level');
      flash(`Ascended to NG+${d.ng}.`);
      GV.game.toMap(0);
    });
  };
  const ngOf = (p) => (p && p.players ? D().ng || 0 : 0);
  const sp0 = P.spawnEnemy;
  P.spawnEnemy = function () {
    const e = sp0.apply(this, arguments), ng = D().ng || 0;
    if (e && ng) { e.hp *= 1 + 0.5 * ng; e.maxHp *= 1 + 0.5 * ng; if (e.dmg) e.dmg *= 1 + 0.25 * ng; }
    return e;
  };
  const gm0 = P.gainMem;
  P.gainMem = function (n) { const ng = D().ng || 0; return gm0.call(this, ng ? Math.round(n * (1 + 0.25 * ng)) : n); };
  const roll0 = GV.items.roll;
  GV.items.roll = function (tier, opts) {
    let it = roll0.call(this, tier, opts);
    const ng = D().ng || 0;
    if (ng && (it.rarity === 'magic' || it.rarity === 'normal') && Math.random() < 0.12 * ng) { const b = roll0.call(this, tier, opts); if (GV.items.value(b) > GV.items.value(it)) it = b; }
    return it;
  };

  // ======================= PLAYER HOOKS =======================
  const rc0 = GV.Player.prototype.recalc0;
  GV.Player.prototype.recalc0 = function () {
    rc0.call(this);
    const d = GV.save.data;
    this._dye = GV.dyeLook(d);
    if (this._dye.trim && this.kit) this.kit = Object.assign({}, this.kit, { c: { suit: this._dye.trim, helm: this._dye.trim, boots: this._dye.trim } });
    this._comp = d.companion || null;
    this._compMul = droneMul();
  };
  const pu0 = GV.Player.prototype.update;
  GV.Player.prototype.update = function (dt, p) { pu0.call(this, dt, p); compTick(p, this, dt); };
  const pd0 = GV.Player.prototype.draw;
  GV.Player.prototype.draw = function (ctx, p) { pd0.call(this, ctx, p); compDraw(ctx, this); };
  // marks fade
  const up0 = P.update;
  P.update = function (dt) { up0.call(this, dt); for (const e of this.enemies) if (e.markT > 0) e.markT -= dt; };

  // ======================= THE LANTERN HUB =======================
  const lan0 = M.lantern;
  M.lantern = function () {
    lan0.call(this);
    const d = D(), rows = document.querySelector('#ui .lantern .rows');
    if (!rows) return;
    const nav = document.createElement('div');
    nav.className = 'lannav';
    const gifts = Object.keys(GV.CREW).filter((k) => GV.CREW[k].unlock() && (!crew()[k] || crew()[k].gift !== day())).length;
    nav.innerHTML = `<button data-l="crew">Crew Quarters${gifts ? ` <b class="pts">${gifts}</b>` : ''}</button><button data-l="hangar">Hangar</button><button data-l="wardrobe">Wardrobe</button>
      <button data-l="ng" class="${GV.ngReady() ? 'ngready' : ''}">Ascend the Void${d.ng ? ` <b class="pts">NG+${d.ng}</b>` : ''}</button>`;
    rows.parentNode.insertBefore(nav, rows);
    bindL((a) => { if (a === 'crew') M.crew(); if (a === 'hangar') M.hangar(); if (a === 'wardrobe') M.wardrobe(); if (a === 'ng') M.ascendVoid(); });
  };

  // ======================= PHOTO MODE =======================
  const FILTERS = { none: 'none', noir: 'grayscale(1) contrast(1.25)', warm: 'sepia(0.45) saturate(1.3) hue-rotate(-10deg)', void: 'hue-rotate(250deg) saturate(1.5) contrast(1.1)', dream: 'saturate(1.6) brightness(1.12) contrast(0.95)' };
  const ph = (GV.photo = { on: false, dx: 0, dy: 0, zoom: 1.3, filter: 'none', hide: false, frame: true, keys: {} });
  ph.enter = function () {
    const G = GV.game; if (!G.play) return;
    Object.assign(ph, { on: true, dx: 0, dy: 0, zoom: GV.settings.zoom(), hide: false });
    GV.menus.hide();
    document.body.classList.add('photo');
    const bar = document.createElement('div');
    bar.id = 'photoBar';
    bar.innerHTML = `<b>PHOTO MODE</b><span class="ph-hint">Drag or arrow keys to pan · wheel or +/− to zoom</span>
      <div class="ph-row">${Object.keys(FILTERS).map((f) => `<button data-f="${f}" class="${ph.filter === f ? 'sel' : ''}">${f}</button>`).join('')}</div>
      <div class="ph-row"><button data-p="hide">Hide suit</button><button data-p="frame" class="${ph.frame ? 'sel' : ''}">Frame</button><button data-p="zin">＋</button><button data-p="zout">－</button><button data-p="reset">Reset</button></div>
      <div class="ph-row"><button class="primary" data-p="save">Save photo</button><button data-p="exit">Exit</button></div>`;
    document.body.appendChild(bar);
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.f) { ph.filter = b.dataset.f; bar.querySelectorAll('[data-f]').forEach((x) => x.classList.toggle('sel', x === b)); }
      const a = b.dataset.p;
      if (a === 'hide') { ph.hide = !ph.hide; b.classList.toggle('sel', ph.hide); }
      if (a === 'frame') { ph.frame = !ph.frame; b.classList.toggle('sel', ph.frame); }
      if (a === 'zin') ph.zoom = Math.min(2.4, ph.zoom + 0.15);
      if (a === 'zout') ph.zoom = Math.max(0.7, ph.zoom - 0.15);
      if (a === 'reset') { ph.dx = 0; ph.dy = 0; ph.zoom = GV.settings.zoom(); }
      if (a === 'save') ph.save();
      if (a === 'exit') ph.exit();
    });
    ph.cvFilter();
  };
  ph.exit = function () {
    ph.on = false; document.body.classList.remove('photo');
    const bar = document.getElementById('photoBar'); if (bar) bar.remove();
    const sv = document.getElementById('photoShot'); if (sv) sv.remove();
    document.getElementById('game').style.filter = '';
    if (GV.game.play) GV.menus.show('pause');
  };
  ph.cvFilter = function () { document.getElementById('game').style.filter = ph.on && ph.filter !== 'none' ? FILTERS[ph.filter] : ''; };
  ph.save = function () {
    const src = document.getElementById('game');
    const out = document.createElement('canvas'); out.width = src.width; out.height = src.height;
    const g = out.getContext('2d');
    try { g.filter = FILTERS[ph.filter]; } catch (e) {}
    g.drawImage(src, 0, 0);
    let url;
    try { url = out.toDataURL('image/png'); } catch (e) { return; }
    const name = `galactic-void-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    try { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch (e) {}
    // Also show it, so it can be long-pressed / right-clicked to save where downloads are blocked.
    let sv = document.getElementById('photoShot');
    if (!sv) { sv = document.createElement('div'); sv.id = 'photoShot'; document.body.appendChild(sv); }
    sv.innerHTML = `<img src="${url}" alt="Your photo"><span>Saved. If nothing downloaded, long-press or right-click the picture to keep it.</span><button>Close</button>`;
    sv.querySelector('button').onclick = () => sv.remove();
  };
  addEventListener('keydown', (e) => {
    if (!ph.on) return;
    ph.keys[e.code] = true;
    if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); ph.exit(); }
    if (e.code === 'Equal' || e.code === 'NumpadAdd') ph.zoom = Math.min(2.4, ph.zoom + 0.1);
    if (e.code === 'Minus' || e.code === 'NumpadSubtract') ph.zoom = Math.max(0.7, ph.zoom - 0.1);
  }, true);
  addEventListener('keyup', (e) => { ph.keys[e.code] = false; });
  let drag = null;
  addEventListener('pointerdown', (e) => { if (ph.on && e.target.id === 'game') drag = { x: e.clientX, y: e.clientY }; });
  addEventListener('pointermove', (e) => {
    if (!ph.on || !drag) return;
    const r = document.getElementById('game').getBoundingClientRect(), k = GV.CFG.W / r.width / ph.zoom;
    ph.dx -= (e.clientX - drag.x) * k; ph.dy -= (e.clientY - drag.y) * k; drag = { x: e.clientX, y: e.clientY };
  });
  addEventListener('pointerup', () => { drag = null; });
  addEventListener('wheel', (e) => { if (!ph.on) return; ph.zoom = Math.max(0.7, Math.min(2.4, ph.zoom - Math.sign(e.deltaY) * 0.08)); }, { passive: true });

  const zoom0 = P.zoom;
  P.zoom = function () { return ph.on ? ph.zoom : zoom0.call(this); };
  const draw0 = P.draw;
  P.draw = function (ctx) {
    if (!ph.on) return draw0.call(this, ctx);
    const K = ph.keys, sp = 9 / ph.zoom;
    if (K.ArrowLeft || K.KeyA) ph.dx -= sp; if (K.ArrowRight || K.KeyD) ph.dx += sp;
    if (K.ArrowUp || K.KeyW) ph.dy -= sp; if (K.ArrowDown || K.KeyS) ph.dy += sp;
    ph.cvFilter();
    const cam = this.cam, cx = cam.x, cy = cam.y, sh = this.staticHud, sa = this.shakeA, deads = this.players.map((q) => q.dead);
    cam.x += ph.dx; cam.y += ph.dy; this.staticHud = true; this.shakeA = 0;
    if (ph.hide) this.players.forEach((q) => { q.dead = true; });
    try { draw0.call(this, ctx); } finally {
      cam.x = cx; cam.y = cy; this.staticHud = sh; this.shakeA = sa;
      this.players.forEach((q, i) => { q.dead = deads[i]; });
    }
    if (ph.frame) {
      const W = GV.CFG.W, H = GV.CFG.H;
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, 26); ctx.fillRect(0, H - 26, W, 26);
      ctx.font = `700 11px ${GV.CFG.FONT}`; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(`GALACTIC VOID · ${this.sys.name.toUpperCase()}${this.depth ? ' · DEPTH ' + this.depth.n : ''}`, W - 16, H - 9);
    }
  };
  // Photo Mode in the pause menu.
  const pause0 = M.pause;
  M.pause = function () {
    pause0.call(this);
    const menu = document.querySelector('#ui .menu');
    if (!menu) return;
    const b = document.createElement('button'); b.innerHTML = '<b>Photo Mode</b><span>Freeze the moment and frame a shot</span>'; b.dataset.l = 'photo';
    M.pauseAdd ? M.pauseAdd('run', b) : menu.appendChild(b);
    bindL((a) => { if (a === 'photo') ph.enter(); });
  };
})();
