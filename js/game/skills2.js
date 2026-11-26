// Galactic Void — the second wave of Star Cores and Augments. Every new core reads the free aim
// (GV.aim); with nothing aimed it falls back to the way you face. Field effects (wells, mines,
// pillars, black holes, beams, hooks, drones) belong to the player who made them and tick and
// draw with that player.
(function () {
  const GV = window.GV, U = GV.util, S = GV.Skills;
  const A = () => GV.art;

  const field = (p) => p.sx2 || (p.sx2 = { wells: [], mines: [], pillars: [], holes: [], beams: [], hooks: [], fx: [] });
  const solidAt = (p, x, y) => { let hit = null; p.eachSolid(false, (s) => { if (!hit && x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h) hit = s; }); return hit; };
  const movable = (e) => !e.dead && !e.boss && !e.part && !(e.def && (e.def.static || e.def.titan));
  const live = (e) => !e.dead && !(e.def && e.def.static) && !(e.alpha != null && e.alpha < 0.4);
  const aimDir = (pl) => { const a = GV.aim && GV.aim.of(pl); return a ? { x: a.x, y: a.y } : { x: pl.facing, y: 0 }; };
  // A point on the ground near where you aim (for wells and mines).
  const aimGround = (p, pl, range) => {
    const pt = GV.aim ? GV.aim.point(pl, range) : { x: pl.cx + pl.facing * range * 0.6, y: pl.cy };
    const gy = p.groundYAt(pt.x, pt.y - 30);
    return { x: pt.x, y: gy != null && gy - pt.y < 260 ? gy : pt.y };
  };

  const NEW = {
    lunge(p, pl, s, base) {
      const d = aimDir(pl), sp = 1250, T = ((s.def.dist || 260) * s.distMul) / sp;
      const dir = d.x >= 0 ? 1 : -1;
      pl.charging = { t: T, sp: Math.max(60, Math.abs(d.x) * sp), dir, vy: d.y * sp, s, set: new Set(), o: Object.assign({ kx: dir * 420, ky: -220 }, base), color: s.def.color, trailT: 0, lunge: true };
      pl.inv = Math.max(pl.inv, T + 0.12);
      p.sfx('dash');
    },
    rail(p, pl, s, base) {
      const d = aimDir(pl), n = s.proj, spread = 0.06;
      const ox = pl.cx + d.x * 14, oy = pl.y + 22 + d.y * 10;
      for (let k = 0; k < n; k++) {
        const a = Math.atan2(d.y, d.x) + (k - (n - 1) / 2) * spread, dx = Math.cos(a), dy = Math.sin(a);
        const hit = new Set();
        let x = ox, y = oy, len = 0;
        const range = s.def.range * Math.max(1, s.areaMul);
        while (len < range) {
          x += dx * 10; y += dy * 10; len += 10;
          if (solidAt(p, x, y)) break;
          for (const e of p.enemies) if (live(e) && !hit.has(e) && U.circRect(x, y, 10, e)) { hit.add(e); S.hitEnemy(p, e, s, Object.assign({ kx: dx * 300, ky: -120 }, base)); }
          for (const rf of p.L.rifts) if (!rf.dead && !hit.has(rf) && U.circRect(x, y, 10, rf)) { hit.add(rf); p.damageRift(rf, s.total * (base.mult || 1)); }
        }
        field(p).beams.push({ pl, x0: ox, y0: oy, x1: x, y1: y, t: 0.22, max: 0.22, color: s.def.color });
        p.burst(x, y, 10, s.def.color, 220, 0.35, 2);
      }
      pl.vx -= d.x * 180; // recoil
      pl.swing = { t: 0.1, max: 0.1, color: s.def.color, kind: 'shot', reach: 30 };
      p.shake(4); p.sfx('shoot');
    },
    knives(p, pl, s, base) { throwBack(p, pl, s, base, false); },
    aegis(p, pl, s, base) {
      const shield = pl.weapon && pl.weapon.shield;
      throwBack(p, pl, s, Object.assign({}, base, { mult: base.mult * (shield ? 1.3 : 1) }), true);
    },
    hook(p, pl, s, base) {
      const d = aimDir(pl);
      field(p).hooks.push({ pl, s, o: base, x: pl.cx, y: pl.y + 22, vx: d.x * s.pspeed, vy: d.y * s.pspeed, len: 0, max: s.def.range * Math.max(1, s.areaMul), back: false });
      p.sfx('shoot');
    },
    mine(p, pl, s, base) {
      const F = field(p), d = aimDir(pl);
      const mine = { pl, s, o: base, x: pl.cx, y: pl.y + 18, vx: d.x * 520, vy: d.y * 520 - 260, landed: false, t: 0, dur: s.dur, r: s.radius };
      F.mines.push(mine);
      const mine0 = F.mines.filter((m) => m.pl === pl);
      const cap = (s.def.count || 3) + (s.extraMinions || 0);
      if (mine0.length > cap) F.mines.splice(F.mines.indexOf(mine0[0]), 1);
      p.sfx('skill');
    },
    pillar(p, pl, s, base) {
      const pt = GV.aim && GV.aim.of(pl) ? (GV.aim.pick(p, pl, 600, 0.3) || null) : null;
      let x, gy;
      if (pt) { x = pt.x + pt.w / 2; gy = pt.y + pt.h; }
      else { const g = aimGround(p, pl, 520); x = g.x; gy = g.y; }
      field(p).pillars.push({ pl, s, o: base, x, gy, t: s.def.delay, max: s.def.delay, w: s.radius, struck: false, fade: 0.35 });
      p.sfx('beacon');
    },
    well(p, pl, s, base) {
      const g = aimGround(p, pl, 360);
      field(p).wells.push({ pl, s, o: base, x: g.x, y: g.y - 40, r: s.radius, t: s.dur, max: s.dur, tick: 0 });
      p.sfx('skill');
    },
    horizon(p, pl, s, base) {
      const pt = GV.aim ? GV.aim.point(pl, 420) : { x: pl.cx + pl.facing * 220, y: pl.cy - 30 };
      field(p).holes.push({ pl, s, o: base, x: pt.x, y: pt.y, r: s.radius, t: s.dur, max: s.dur, tick: 0 });
      p.shake(4); p.sfx('skill');
    },
    drones(p, pl, s, base) {
      const n = (s.def.count || 3) + (s.extraMinions || 0);
      pl.drones = { s, o: base, t: s.dur, n, cd: Array.from({ length: n }, (_, i) => 0.3 + i * 0.22) };
      p.burst(pl.cx, pl.cy, 20, s.def.color, 160, 0.5, 3);
      p.sfx('beacon');
    },
  };

  // Knives and shields: thrown along the aim, they come back to you.
  function throwBack(p, pl, s, base, shield) {
    const d = aimDir(pl), a0 = Math.atan2(d.y, d.x), n = shield ? 1 : s.proj, spread = s.def.spread || 0.2;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i - (n - 1) / 2) * spread;
      p.spawnProj({ x: pl.cx + d.x * 14, y: pl.y + 22 + d.y * 8, vx: Math.cos(a) * s.pspeed, vy: Math.sin(a) * s.pspeed, r: s.def.r || 7, friendly: true, kind: 'gem', s, hit: new Set(),
        pierce: shield ? 0 : 99, chain: shield ? s.chain : 0, life: 2.4, o: base, color: s.def.color, ghost: !shield, ret: { pl, hang: shield ? 0.55 : 0.3, shield } });
    }
    pl.swing = { t: 0.1, max: 0.1, color: s.def.color, kind: 'shot', reach: 30 };
    p.sfx('swing');
  }

  // ---- hook into the skill engine ----
  const use0 = S.use;
  S.use = function (p, pl, s, slot, opts = {}) {
    // Overload: every fourth cast hits much harder and wider.
    let restoreR = null;
    if (s.overload) {
      s.ovN = (s.ovN || 0) + 1;
      if (s.ovN % 4 === 0) {
        opts = Object.assign({}, opts, { mult: (opts.mult || 1) * 1.8 });
        restoreR = s.radius; s.radius *= 1.3;
        p.text(pl.cx, pl.y - 26, 'OVERLOAD', '#ff6ad5', 14);
        p.novas.push({ x: pl.cx, y: pl.cy, r: 6, max: 50, t: 0, color: '#ff6ad5' });
      }
    }
    try {
      const fn = NEW[s.kind];
      if (!fn) return use0.call(this, p, pl, s, slot, opts);
      const AM = GV.aim ? GV.aim.of(pl) : null;
      if (AM && Math.abs(AM.x) > 0.15) { pl.facing = AM.x > 0 ? 1 : -1; pl.aimFaceT = 0.45; }
      const ambush = pl.stealth > 0 && !s.tags.has('Stealth') && !opts.echoed;
      if (ambush) pl.stealth = 0;
      fn(p, pl, s, { ambush, mult: opts.mult || 1 });
    } finally { if (restoreR != null) s.radius = restoreR; }
  };

  // Titanslayer: big things hurt more.
  const hit0 = S.hitEnemy;
  S.hitEnemy = function (p, e, s, o = {}) {
    if (s && s.titanslayer) o = Object.assign({}, o, { mult: (o.mult || 1) * (e.boss || e.part || (e.def && e.def.titan) ? 1.5 : 0.85) });
    return hit0.call(this, p, e, s, o);
  };

  // Thrown things that ran out of targets turn around instead of vanishing.
  const ph0 = S.projHit;
  S.projHit = function (p, pr, e) {
    ph0.call(this, p, pr, e);
    if (pr.ret && pr.life <= 0 && !pr.back) { pr.life = 1.6; pr.back = true; pr.ghost = true; pr.hit = new Set(); }
  };

  // ---- per-frame ----
  function tick(p, pl, dt) {
    const F = field(p), mine = (o) => o.pl === pl;
    // returning projectiles
    for (const pr of p.projs) {
      if (!pr.ret || pr.ret.pl !== pl) continue;
      if (!pr.back && pr.t > pr.ret.hang && !pr.ret.shield) { pr.back = true; pr.hit = new Set(); pr.life = 1.6; }
      if (!pr.back && pr.ret.shield && pr.t > 0.9) { pr.back = true; pr.ghost = true; pr.hit = new Set(); pr.life = 1.6; }
      if (!pr.back && !pr.ret.shield && pr.t > pr.ret.hang * 0.6) { pr.vx *= Math.pow(0.02, dt); pr.vy *= Math.pow(0.02, dt); }
      if (pr.back) {
        const dx = pl.cx - pr.x, dy = pl.cy - pr.y, d = Math.hypot(dx, dy) || 1, sp = 1050;
        pr.vx += ((dx / d) * sp - pr.vx) * Math.min(1, dt * 10); pr.vy += ((dy / d) * sp - pr.vy) * Math.min(1, dt * 10);
        pr.pierce = 99; pr.chain = 0;
        if (d < 26) { pr.life = 0; if (pr.ret.shield) p.burst(pl.cx, pl.cy, 6, pr.color, 100, 0.25, 2); }
      }
    }
    // the end of a lunge: a burst of starfire
    if (pl._lunging && !pl.charging) {
      const s = pl._lunging.s;
      S.area(p, pl.cx, pl.cy, s.radius, s, Object.assign({}, pl._lunging.o, { mult: (pl._lunging.o.mult || 1) * 0.8, knock: 420, ky: -260 }));
      p.novas.push({ x: pl.cx, y: pl.cy, r: 8, max: s.radius, t: 0, color: s.def.color });
      p.shake(5);
      pl._lunging = null;
    }
    if (pl.charging && pl.charging.lunge) pl._lunging = pl.charging;
    // coming out of a lunge or zip, don't keep flying off with the full vertical speed
    if (pl._chgVy && !pl.charging) {
      pl.vy = U.clamp(pl.vy * 0.35, -380, 260);
      const m = pl._mantle; pl._mantle = null;
      if (m && pl.y <= m.y + 30) {
        const r = { x: m.x, y: m.y, w: pl.w, h: pl.h };
        let free = true; p.eachSolid(false, (s) => { if (free && U.ov(r, s)) free = false; });
        if (free) { pl.x = m.x; pl.y = m.y; pl.vy = 0; p.burst(pl.cx, pl.y + pl.h, 8, '#9fffd8', 120, 0.3, 2); }
      }
    }
    pl._chgVy = !!(pl.charging && pl.charging.vy);
    // hooks
    for (const h of F.hooks) {
      if (!mine(h)) continue;
      if (h.back) { const dx = pl.cx - h.x, dy = pl.y + 22 - h.y, d = Math.hypot(dx, dy); if (d < 30) h.done = true; else { h.x += (dx / d) * 1800 * dt; h.y += (dy / d) * 1800 * dt; } continue; }
      const st = Math.ceil((Math.hypot(h.vx, h.vy) * dt) / 10);
      for (let i = 0; i < st && !h.back; i++) {
        h.x += (h.vx * dt) / st; h.y += (h.vy * dt) / st; h.len += Math.hypot(h.vx, h.vy) * dt / st;
        const e = p.enemies.find((x) => live(x) && U.circRect(h.x, h.y, 9, x));
        if (e) {
          S.hitEnemy(p, e, h.s, Object.assign({ kx: 0, ky: 0, stun: 0.6 }, h.o));
          if (movable(e)) { const dx = pl.cx - (e.x + e.w / 2); e.vx = dx * 3.4; e.vy = -300; e.stun = Math.max(e.stun || 0, 0.6); p.text(e.x + e.w / 2, e.y - 12, 'YANK', '#9fffd8', 12); }
          else zip(pl, e.x + e.w / 2 - Math.sign(e.x + e.w / 2 - pl.cx) * (e.w / 2 + 24), e.y + e.h - pl.h);
          h.back = true; p.burst(h.x, h.y, 10, h.s.def.color, 160, 0.3, 2); break;
        }
        const sol = solidAt(p, h.x, h.y);
        if (sol) {
          // hooked near a ledge's top edge: pull up onto it; otherwise hang beside where it bit
          if (h.y - sol.y < 56 && sol.w >= pl.w + 8) zip(pl, U.clamp(h.x - pl.w / 2, sol.x + 2, sol.x + sol.w - pl.w - 2), sol.y - pl.h - 2, true);
          else zip(pl, h.x - Math.sign(h.vx) * (pl.w / 2 + 4) - pl.w / 2, h.y - pl.h * 0.5);
          h.back = true; h.x -= (h.vx * dt) / st; h.y -= (h.vy * dt) / st;
          p.burst(h.x, h.y, 8, '#ffffff', 140, 0.3, 2); p.sfx('land'); break;
        }
        if (h.len >= h.max) h.back = true;
      }
    }
    F.hooks = F.hooks.filter((h) => !h.done);
    // mines
    for (const m of F.mines) {
      if (!mine(m)) continue;
      m.t += dt;
      if (!m.landed) {
        m.vy += 1400 * dt; const nx = m.x + m.vx * dt, ny = m.y + m.vy * dt;
        if (solidAt(p, nx, ny + 4)) { m.landed = true; m.vx = 0; m.vy = 0; } else { m.x = nx; m.y = ny; }
      }
      if (m.t > m.dur) { m.dead = true; continue; }
      if (m.t < 0.45) continue;
      if (p.enemies.some((e) => live(e) && U.circRect(m.x, m.y, 52, e))) {
        S.area(p, m.x, m.y, m.r, m.s, Object.assign({}, m.o, { knock: 380, ky: -300 }));
        p.novas.push({ x: m.x, y: m.y, r: 8, max: m.r, t: 0, color: m.s.def.color });
        p.burst(m.x, m.y, 26, m.s.def.color, 260, 0.5, 3); p.shake(4); p.sfx('slam');
        m.dead = true;
      }
    }
    F.mines = F.mines.filter((m) => !m.dead);
    // pillars
    for (const c of F.pillars) {
      if (!mine(c)) continue;
      c.t -= dt;
      if (c.t <= 0 && !c.struck) {
        c.struck = true;
        for (const e of p.enemies) {
          if (!live(e)) continue;
          const ex = e.x + e.w / 2;
          if (Math.abs(ex - c.x) < c.w + e.w / 2 && e.y < c.gy + 10 && e.y + e.h > c.gy - 640) S.hitEnemy(p, e, c.s, Object.assign({ kx: 0, ky: -200, stun: 0.6 }, c.o));
        }
        for (const rf of p.L.rifts) if (!rf.dead && Math.abs(rf.x + rf.w / 2 - c.x) < c.w + rf.w / 2) p.damageRift(rf, c.s.total);
        p.novas.push({ x: c.x, y: c.gy, r: 6, max: c.w * 1.6, t: 0, color: c.s.def.color });
        p.burst(c.x, c.gy, 30, c.s.def.color, 320, 0.5, 3); p.shake(7); p.sfx('slam');
      }
      if (c.struck) c.fade -= dt;
    }
    F.pillars = F.pillars.filter((c) => !c.struck || c.fade > 0);
    // gravity wells
    for (const w of F.wells) {
      if (!mine(w)) continue;
      w.t -= dt; w.tick -= dt;
      for (const e of p.enemies) {
        if (!live(e) || !U.circRect(w.x, w.y, w.r, e)) continue;
        if (movable(e)) { if (e.y + e.h > w.y - w.r * 0.6) e.vy = -110; else e.vy = Math.min(e.vy, 0) * 0.5; e.vx *= 0.8; e.stun = Math.max(e.stun || 0, 0.12); }
        else { e.chill = Math.max(e.chill || 0, 0.3); e.chillMag = Math.max(e.chillMag || 0, 0.3); }
      }
      if (w.tick <= 0) { w.tick = 0.4; S.area(p, w.x, w.y, w.r, w.s, Object.assign({}, w.o, { mult: (w.o.mult || 1) * 1, knock: 0, ky: 0 })); }
    }
    F.wells = F.wells.filter((w) => w.t > 0);
    // event horizons
    for (const h of F.holes) {
      if (!mine(h)) continue;
      h.t -= dt; h.tick -= dt;
      for (const e of p.enemies) {
        if (!movable(e) || !live(e)) continue;
        const ex = e.x + e.w / 2, ey = e.y + e.h / 2, dx = h.x - ex, dy = h.y - ey, d = Math.hypot(dx, dy);
        if (d > h.r * 1.9 || d < 6) continue;
        const pull = 260 * (1 - d / (h.r * 2));
        e.x += (dx / d) * pull * dt; e.y += (dy / d) * pull * dt * 0.7; e.vx *= 0.7;
      }
      if (h.tick <= 0) { h.tick = 0.3; S.area(p, h.x, h.y, h.r, h.s, Object.assign({}, h.o, { mult: (h.o.mult || 1) * 0.45, knock: 0, ky: 0 })); }
      if (h.t <= 0) {
        S.area(p, h.x, h.y, h.r * 1.15, h.s, Object.assign({}, h.o, { mult: (h.o.mult || 1) * 2, knock: 560, ky: -340 }));
        p.novas.push({ x: h.x, y: h.y, r: 4, max: h.r * 1.4, t: 0, color: h.s.def.color });
        p.burst(h.x, h.y, 40, h.s.def.color, 380, 0.6, 3); p.shake(9); p.sfx('slam');
      }
    }
    F.holes = F.holes.filter((h) => h.t > 0);
    // beams fade
    for (const b of F.beams) if (mine(b)) b.t -= dt;
    F.beams = F.beams.filter((b) => b.t > 0);
    // drones
    const D = pl.drones;
    if (D) {
      D.t -= dt;
      for (let i = 0; i < D.n; i++) {
        D.cd[i] -= dt;
        if (D.cd[i] > 0) continue;
        const pos = dronePos(pl, i, D.n);
        let tgt = GV.aim && GV.aim.of(pl) ? GV.aim.pick(p, pl, 560, 0.5) : null;
        if (!tgt) { let bd = 520; for (const e of p.enemies) { if (!live(e)) continue; const d = Math.hypot(e.x + e.w / 2 - pos.x, e.y + e.h / 2 - pos.y); if (d < bd) { bd = d; tgt = e; } } }
        if (!tgt) { D.cd[i] = 0.2; continue; }
        D.cd[i] = 0.75;
        const dx = tgt.x + tgt.w / 2 - pos.x, dy = tgt.y + tgt.h / 2 - pos.y, d = Math.hypot(dx, dy) || 1;
        p.spawnProj({ x: pos.x, y: pos.y, vx: (dx / d) * D.s.pspeed, vy: (dy / d) * D.s.pspeed, r: 4, friendly: true, kind: 'gem', s: D.s, hit: new Set(), pierce: 0, chain: 0, life: 0.8, o: D.o, color: D.s.def.color });
      }
      if (D.t <= 0) pl.drones = null;
    }
  }
  const dronePos = (pl, i, n) => { const a = pl.t * 2.6 + (i * Math.PI * 2) / n; return { x: pl.cx + Math.cos(a) * 34, y: pl.y - 8 + Math.sin(a) * 12 }; };
  // Ledge pulls rise straight up first, then step onto the top (so the ledge's side can't snag you).
  function zip(pl, tx, ty, ledge) {
    const dx = tx - pl.x, dy = ty - pl.y, d = Math.hypot(dx, dy);
    if (d < 20) return;
    const T = Math.min(0.42, d / 1300), dir = dx >= 0 ? 1 : -1;
    pl._mantle = ledge ? { x: tx, y: ty } : null;
    if (ledge) { pl.charging = { t: T, sp: 1, dir, vy: dy / T, s: null, set: { has: () => true, add() {} }, o: {}, color: '#9fffd8', trailT: 1e9, zip: true }; pl.inv = Math.max(pl.inv, T); return; }
    const none = { has: () => true, add() {} };
    pl.charging = { t: T, sp: Math.abs(dx) / T, dir, vy: dy / T, s: null, set: none, o: {}, color: '#9fffd8', trailT: 1e9, zip: true };
    pl.inv = Math.max(pl.inv, T);
  }

  // ---- drawing ----
  function draw(ctx, p, pl) {
    const F = p.sx2; if (!F) return;
    const a = A(), t = p.t, mine = (o) => o.pl === pl;
    ctx.save();
    for (const w of F.wells) {
      if (!mine(w)) continue;
      const k = Math.min(1, w.t / 0.4), c = w.s.def.color;
      a.glow(ctx, w.x, w.y, w.r * 1.1, 'rgba(140,120,255,0.18)');
      ctx.globalAlpha = 0.6 * k; ctx.strokeStyle = c; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const rr = w.r * (((t * 0.6 + i / 3) % 1)); ctx.beginPath(); ctx.ellipse(w.x, w.y, rr, rr * 0.45, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    for (const h of F.holes) {
      if (!mine(h)) continue;
      const grow = Math.min(1, (h.max - h.t) / 0.3), r = h.r * 0.38 * grow;
      a.glow(ctx, h.x, h.y, h.r * 1.5, 'rgba(255,60,130,0.22)');
      ctx.strokeStyle = h.s.def.color; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(h.x, h.y, r * (1.6 + i * 0.5), r * (0.5 + i * 0.15), t * (1.5 + i), 0, Math.PI * 1.4); ctx.stroke(); }
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(h.x, h.y, r + 1, 0, Math.PI * 2); ctx.stroke();
    }
    for (const c of F.pillars) {
      if (!mine(c)) continue;
      if (!c.struck) {
        const k = 1 - c.t / c.max;
        ctx.globalAlpha = 0.25 + 0.5 * k; ctx.strokeStyle = c.s.def.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(c.x, c.gy, c.w * (1.3 - k * 0.3), 6, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.12 * k; ctx.fillStyle = c.s.def.color; ctx.fillRect(c.x - c.w * 0.2, c.gy - 640, c.w * 0.4, 640);
      } else {
        const k = Math.max(0, c.fade / 0.35);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = k; ctx.fillStyle = c.s.def.color; ctx.fillRect(c.x - c.w * k, c.gy - 640, c.w * 2 * k, 640);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(c.x - c.w * 0.3 * k, c.gy - 640, c.w * 0.6 * k, 640);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
    }
    for (const m of F.mines) {
      if (!mine(m)) continue;
      const armed = m.t >= 0.45, blink = armed && Math.floor(t * 4) % 2 === 0;
      a.glow(ctx, m.x, m.y, 16, armed ? 'rgba(200,155,255,0.5)' : 'rgba(200,155,255,0.2)');
      ctx.fillStyle = '#2a2140'; ctx.beginPath(); ctx.arc(m.x, m.y - 4, 7, Math.PI, 0); ctx.fill(); ctx.fillRect(m.x - 8, m.y - 4, 16, 3);
      ctx.fillStyle = blink ? '#ffffff' : m.s.def.color; ctx.beginPath(); ctx.arc(m.x, m.y - 7, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    for (const b of F.beams) {
      if (!mine(b)) continue;
      const k = b.t / b.max;
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      ctx.globalAlpha = k; ctx.strokeStyle = b.color; ctx.lineWidth = 9 * k + 2; a.line(ctx, b.x0, b.y0, b.x1, b.y1);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5 * k + 0.5; a.line(ctx, b.x0, b.y0, b.x1, b.y1);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    for (const h of F.hooks) {
      if (!mine(h)) continue;
      ctx.strokeStyle = '#9fffd8'; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.85; a.line(ctx, pl.cx, pl.y + 22, h.x, h.y); ctx.globalAlpha = 1;
      ctx.fillStyle = '#e8fff6'; ctx.beginPath(); ctx.arc(h.x, h.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    if (pl.drones && !pl.dead) {
      const D = pl.drones;
      for (let i = 0; i < D.n; i++) {
        const q = dronePos(pl, i, D.n);
        a.glow(ctx, q.x, q.y, 12, 'rgba(255,180,70,0.4)');
        ctx.fillStyle = '#3a3f55'; ctx.beginPath(); ctx.moveTo(q.x, q.y - 5); ctx.lineTo(q.x + 6, q.y); ctx.lineTo(q.x, q.y + 5); ctx.lineTo(q.x - 6, q.y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = D.t < 2 && Math.floor(t * 8) % 2 ? '#fff' : D.s.def.color; ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3);
      }
    }
    ctx.restore();
  }

  const upd0 = GV.Player.prototype.update;
  GV.Player.prototype.update = function (dt, p) {
    upd0.call(this, dt, p);
    tick(p, this, dt);
  };
  const draw0 = GV.Player.prototype.draw;
  GV.Player.prototype.draw = function (ctx, p) {
    draw(ctx, p, this);
    draw0.call(this, ctx, p);
  };
})();
