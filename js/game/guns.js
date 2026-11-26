// Galactic Void — firearms and the second armoury: rifles, a sniper, a shotgun, a grenade launcher,
// a laser cannon, one-handed guns that dual-wield, and more one-handed blades to pair up.
// A weapon with a `gun` profile turns the basic attack (Void Strike, Backstab…) into shots fired
// along your aim. Melee augments still apply (they are still attacks with your weapon).
(function () {
  const GV = window.GV, A = GV.art, S = GV.Skills;
  const W = GV.WEAPONS;

  // gun profiles: n pellets, spread (radians), speed, life (s), radius, pierce, per-pellet share of
  // the hit, recoil, and special kinds (lob = grenade that bursts, beam = instant laser line)
  GV.GUNS = {
    pistol: { n: 1, spread: 0.03, sp: 1300, life: 0.42, r: 5, mult: 0.8, recoil: 0 },
    smg: { n: 1, spread: 0.09, sp: 1250, life: 0.36, r: 4, mult: 1, recoil: 0 },
    handcannon: { n: 1, spread: 0.02, sp: 1500, life: 0.48, r: 7, mult: 1, pierce: 1, recoil: 80 },
    rifle: { n: 1, spread: 0.035, sp: 1600, life: 0.55, r: 5, mult: 1, recoil: 20 },
    sniper: { n: 1, spread: 0, sp: 3200, life: 0.5, r: 6, mult: 1, pierce: 3, recoil: 220, trail: true },
    shotgun: { n: 7, spread: 0.34, sp: 1150, life: 0.2, r: 5, mult: 0.22, recoil: 260 },
    launcher: { n: 1, spread: 0, sp: 760, life: 1.4, r: 9, mult: 0.25, lob: true, boom: 100, recoil: 140 },
    cannon: { n: 1, beam: 780, mult: 1, recoil: 160 },
    bow: { n: 1, spread: 0.02, sp: 1350, life: 0.85, r: 6, mult: 1, pierce: 1, grav: 520, arrow: true, recoil: 0 },
    crossbow: { n: 1, spread: 0, sp: 1900, life: 0.6, r: 6, mult: 1, pierce: 2, arrow: true, bolt: true, recoil: 90 },
    handxbow: { n: 1, spread: 0.02, sp: 1650, life: 0.45, r: 5, mult: 1, arrow: true, bolt: true, recoil: 0 },
  };

  Object.assign(W, {
    // two-handed firearms
    pulserifle: { name: 'Pulse Rifle', hand: 'two', desc: 'Two-handed. A steady stream of pulse rounds down your aim.', cost: 220, dmg: 7.5, cd: 0.16, range: 52, reach: 880, h: 24, active: 0.06, knock: 120, color: '#8fe9ff', art: 'rifle', gun: 'rifle' },
    longshot: { name: 'Longshot Sniper', hand: 'two', desc: 'Two-handed. Slow, enormous shots that cross the screen and punch through three enemies. +20% critical chance.', cost: 320, dmg: 38, cd: 0.85, range: 52, reach: 1600, h: 20, active: 0.06, knock: 420, color: '#ffe27a', crit: 25, art: 'sniper', gun: 'sniper' },
    breacher: { name: 'Breach Shotgun', hand: 'two', desc: 'Two-handed. Seven pellets in a wide cone. Devastating up close, nothing at range.', cost: 240, dmg: 30, cd: 0.62, range: 52, reach: 230, h: 40, active: 0.08, knock: 520, color: '#ff9a5a', art: 'shotgun', gun: 'shotgun' },
    novalauncher: { name: 'Nova Grenade Launcher', hand: 'two', desc: 'Two-handed. Lobs grenades that burst on impact, hitting everything nearby.', cost: 380, dmg: 36, cd: 0.9, range: 52, reach: 700, h: 30, active: 0.08, knock: 460, color: '#ff6a9a', art: 'launcher', gun: 'launcher' },
    helios: { name: 'Helios Laser Cannon', hand: 'two', desc: 'Two-handed. A searing beam that hits every enemy along its line in an instant.', cost: 450, dmg: 27, cd: 0.7, range: 52, reach: 780, h: 30, active: 0.1, knock: 200, color: '#ff5a4a', art: 'cannon', gun: 'cannon' },
    // one-handed firearms: carry one with a shield, or one in each hand
    arcsmg: { name: 'Arc SMG', hand: 'one', desc: 'One-handed. Sprays light rounds very fast. Dual-wield two for a storm of fire.', cost: 150, dmg: 5, cd: 0.1, range: 52, reach: 450, h: 22, active: 0.05, knock: 80, color: '#7dffb0', art: 'smg', gun: 'smg' },
    handcannon: { name: 'Hand Cannon', hand: 'one', desc: 'One-handed. A heavy revolver: slow, hard-hitting rounds that pierce one enemy.', cost: 180, dmg: 16, cd: 0.38, range: 52, reach: 720, h: 24, active: 0.07, knock: 300, color: '#ffb347', crit: 8, art: 'handcannon', gun: 'handcannon' },
    // bows and crossbows
    lumenbow: { name: 'Lumen Bow', hand: 'two', desc: 'Two-handed. Draws arrows of hard light that arc slightly in flight and pierce one enemy.', cost: 260, dmg: 23, cd: 0.48, range: 52, reach: 1000, h: 24, active: 0.07, knock: 220, color: '#b8ffea', crit: 12, art: 'bow', gun: 'bow' },
    heavyxbow: { name: 'Siege Crossbow', hand: 'two', desc: 'Two-handed. Fires heavy, dead-straight bolts that pierce two enemies.', cost: 300, dmg: 33, cd: 0.72, range: 52, reach: 1140, h: 24, active: 0.07, knock: 380, color: '#ffd36b', art: 'crossbow', gun: 'crossbow' },
    handxbow: { name: 'Hand Crossbow', hand: 'one', desc: 'One-handed. A compact repeating crossbow. Carry one with a shield, or one in each hand.', cost: 170, dmg: 11, cd: 0.25, range: 52, reach: 740, h: 22, active: 0.06, knock: 160, color: '#c9a8ff', art: 'handxbow', gun: 'handxbow' },
    // one-handed blades to pair up
    cutlass: { name: 'Star Cutlass', hand: 'one', desc: 'One-handed. A curved boarding blade. Pair two for quick, wide cuts.', cost: 140, dmg: 14, cd: 0.21, range: 64, h: 40, active: 0.09, knock: 190, color: '#9fd6ff', art: 'saber' },
    katana: { name: 'Ember Katana', hand: 'one', desc: 'One-handed. A long, keen edge. +8% critical chance.', cost: 200, dmg: 16, cd: 0.23, range: 76, h: 30, active: 0.09, knock: 200, color: '#ff9a6a', crit: 13, art: 'katana' },
    hatchet: { name: 'Plasma Hatchet', hand: 'one', desc: 'One-handed. Short, heavy chops. Pairs well with a second hatchet or a shield.', cost: 160, dmg: 20, cd: 0.3, range: 58, h: 46, active: 0.1, knock: 300, color: '#9fffd8', art: 'axe' },
  });
  // pistols that already existed now actually shoot
  for (const k in W) if (W[k].art === 'pistol' && !W[k].gun && !W[k].legacy) { W[k].gun = 'pistol'; W[k].reach = 540; }

  const muzzle = (pl, ax, ay) => ({ x: pl.cx + ax * 22, y: pl.y + pl.h * 0.4 + ay * 16 });

  // Fire the equipped gun for an attack skill. Returns true if it fired.
  GV.fireGun = function (p, pl, s, base) {
    const Wp = s.W; if (!Wp) return false;
    let gid = Wp.gun;
    if (Wp.dual) { pl.gunFlip = !pl.gunFlip; gid = pl.gunFlip ? Wp.gun2 : Wp.gun; } // two weapons take turns
    const G = GV.GUNS[gid];
    if (!G) return false;
    const AM = GV.aim ? GV.aim.of(pl) : null;
    let ax = AM ? AM.x : pl.facing, ay = AM ? AM.y : 0;
    const m0 = Math.hypot(ax, ay) || 1; ax /= m0; ay /= m0;
    const o = muzzle(pl, ax, ay), a0 = Math.atan2(ay, ax), col = (Wp.dual && pl.gunFlip && Wp.offColor) || Wp.color;
    const ob = Object.assign({}, base);
    if (G.beam) {
      // instant line: everything along it is hit once
      const len = G.beam * (s.areaMul || 1), hit = new Set(), ex = o.x + ax * len, ey = o.y + ay * len;
      for (const e of p.enemies) {
        if (e.dead || (e.alpha != null && e.alpha < 0.4)) continue;
        for (let d = 0; d <= len; d += 14) { const x = o.x + ax * d, y = o.y + ay * d; if (x > e.x - 8 && x < e.x + e.w + 8 && y > e.y - 8 && y < e.y + e.h + 8) { hit.add(e); break; } }
      }
      let n = 0;
      for (const e of hit) { S.hitEnemy(p, e, s, Object.assign({ kx: ax * 240, ky: -120 }, ob, { mult: (ob.mult || 1) * (s.phase && n++ > 0 ? 0.85 : 1) })); }
      for (const rf of p.L.rifts) if (!rf.dead) for (let d = 0; d <= len; d += 14) { const x = o.x + ax * d, y = o.y + ay * d; if (x > rf.x && x < rf.x + rf.w && y > rf.y && y < rf.y + rf.h) { p.damageRift(rf, s.total * (ob.mult || 1)); break; } }
      p.spawnProj({ x: o.x, y: o.y, x2: ex, y2: ey, vx: 0, vy: 0, kind: 'beam', ghost: true, life: 0.2, max: 0.2, r: 1, color: col });
      p.shake(4);
    } else {
      for (let i = 0; i < G.n; i++) {
        const a = a0 + (G.n > 1 ? (i / (G.n - 1) - 0.5) * G.spread : (Math.random() - 0.5) * G.spread);
        const sp = G.sp * (G.n > 1 ? 0.85 + Math.random() * 0.3 : 1);
        p.spawnProj({
          x: o.x, y: o.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (G.lob ? 260 : 0), r: G.r, friendly: true,
          kind: G.lob ? 'grenade' : 'bullet', s, hit: new Set(), pierce: G.lob ? 0 : (G.pierce || 0) + (s.pierce || 0), chain: 0,
          life: G.life * (G.n > 1 ? 0.8 + Math.random() * 0.4 : 1), max: G.life, mult: G.mult, o: ob, color: col,
          grav: G.lob ? 1100 : G.grav || 0, arrow: G.arrow, bolt: G.bolt, boom: G.boom ? G.boom * (s.areaMul || 1) : 0, trail: G.trail,
        });
      }
    }
    if (G.recoil && pl.onGround) pl.vx -= ax * G.recoil;
    pl.swing = { t: 0.08, max: 0.08, color: col, kind: 'shot', reach: 30 };
    p.sfx(G.beam || G.lob ? 'skill' : 'shoot');
    return true;
  };

  // grenades burst when they hit something, land, or run out of fuse
  const upd1 = GV.Play.prototype.updateProjs;
  GV.Play.prototype.updateProjs = function (dt) {
    const before = this.projs.filter((pr) => pr.kind === 'grenade' && !pr.boomed);
    upd1.call(this, dt);
    for (const pr of before) {
      if (pr.life > 0 && this.projs.includes(pr)) continue;
      pr.boomed = true;
      const r = pr.boom || 90;
      S.area(this, pr.x, pr.y, r, pr.s, Object.assign({}, pr.o, { knock: 420, ky: -300 }));
      this.novas.push({ x: pr.x, y: pr.y, r: 10, max: r, t: 0, color: pr.color });
      this.burst(pr.x, pr.y, 26, pr.color, 320, 0.5, 3);
      this.shake(8); this.sfx('slam');
    }
  };

  // drawing: bullets are streaks, grenades are glowing shells, the beam is a fading line
  const draw0 = GV.Play.prototype.drawProjs;
  GV.Play.prototype.drawProjs = function (ctx) {
    const mine = [], rest = [];
    for (const pr of this.projs) (pr.kind === 'bullet' || pr.kind === 'grenade' || pr.kind === 'beam' ? mine : rest).push(pr);
    const all = this.projs; this.projs = rest;
    try { draw0.call(this, ctx); } finally { this.projs = all; }
    for (const pr of mine) {
      const c = pr.color || '#8fe9ff';
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      if (pr.kind === 'beam') {
        const k = Math.max(0, pr.life / (pr.max || 0.2));
        ctx.globalAlpha = k; ctx.lineCap = 'round';
        ctx.strokeStyle = c; ctx.lineWidth = 12 * k + 2; ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x2, pr.y2); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * k + 1; ctx.stroke();
        A.glow(ctx, pr.x, pr.y, 30 * k + 8, c);
      } else if (pr.kind === 'grenade') {
        A.glow(ctx, pr.x, pr.y, 22, c);
        ctx.fillStyle = '#2a2f3f'; A.circle(ctx, pr.x, pr.y, pr.r);
        ctx.fillStyle = Math.floor(pr.t * 14) % 2 ? '#fff' : c; A.circle(ctx, pr.x, pr.y, pr.r * 0.45);
      } else if (pr.arrow) {
        // an energy arrow or bolt: glowing shaft, a hard head, fletching at the back
        const a = Math.atan2(pr.vy, pr.vx), L = pr.bolt ? 20 : 28;
        ctx.translate(pr.x, pr.y); ctx.rotate(a);
        A.glow(ctx, -L * 0.4, 0, 14, c);
        ctx.strokeStyle = c; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(0, 0); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-2, -3.6); ctx.lineTo(-2, 3.6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(-L - 6, -4); ctx.lineTo(-L + 3, 0); ctx.lineTo(-L - 6, 4); ctx.closePath(); ctx.fill();
      } else {
        const sp = Math.hypot(pr.vx, pr.vy) || 1, L = pr.trail ? 60 : 22;
        const tx = pr.x - (pr.vx / sp) * L, ty = pr.y - (pr.vy / sp) * L;
        ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.lineWidth = pr.r * 0.9; ctx.globalAlpha = 0.75;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(pr.x, pr.y); ctx.stroke();
        ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.2, pr.r * 0.35); ctx.stroke();
      }
      ctx.restore();
    }
  };
})();
