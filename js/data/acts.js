// Galactic Void — the four acts, one for each album. Systems run in acts of three:
//   Act I   The Silence Between    (systems 1–3, 13–15 …)  the black-hole nebula, the husks
//   Act II  Ascension of Light     (4–6 …)  shattered light; crystal things; light-beam hazards
//   Act III The War Reality Forgot (7–9 …)  a war that never ended; machines; artillery
//   Act IV  Beyond the Horizon     (10–12 …) the event horizon; void things; gravity wells
// Each act brings its own colours, terrain hazards, enemy family, an act-wide hazard and a
// mini-boss that waits in a sealed room in every stage.
(function () {
  const GV = window.GV, U = GV.util, A = GV.art, P = GV.Play.prototype;

  GV.ACTS = [
    { id: 'silence', num: 'I', album: 'The Silence Between', cover: 'assets/act1.jpg', color: '#ff4f6a', hues: null, terrain: ['acid', 'caves'], family: null, hazard: null, mini: 'huskknight',
      line: 'The nebula hums at night. Nothing out here is silent; it is only waiting.' },
    { id: 'light', num: 'II', album: 'Ascension of Light', cover: 'assets/act2.jpg', color: '#ffe9a8', hues: [205, 45], terrain: ['crumble', 'caves'], family: { prism: 3, seraphling: 3, golem: 2 }, hazard: 'beams', mini: 'refractor',
      line: 'A planet split by a pillar of light. Everything here was made to shine, and to burn.' },
    { id: 'war', num: 'III', album: 'The War Reality Forgot', cover: 'assets/act3.jpg', color: '#ff6a4a', hues: [215, 8], terrain: ['vents', 'crumble'], family: { trooper: 3, bulwark: 2, swarmer: 3 }, hazard: 'barrage', mini: 'walker',
      line: 'Two fleets are still fighting a war nobody remembers starting. They will not stop for you.' },
    { id: 'horizon', num: 'IV', album: 'Beyond the Horizon', cover: 'assets/act4.jpg', color: '#ff3b6a', hues: [350, 225], terrain: ['acid', 'crumble'], family: { stalker: 3, maw: 2, echoling: 3 }, hazard: 'gravity', mini: 'eventmaw',
      line: 'At the edge of the eye, light bends and so does everything else. Past here is the Void.' },
  ];
  GV.actOf = (sys) => Math.floor(sys / 3) % 4;
  GV.MINIBOSS_FOR = (sys) => GV.ACTS[GV.actOf(sys)].mini;
  // The act's family takes over the stage, with a few of the old guard mixed in.
  GV.actPool = (act, old, st, sys) => {
    const pool = {};
    for (const k in act.family) pool[k] = act.family[k] + (st >= 1 && k !== Object.keys(act.family)[0] ? 1 : 0);
    const keep = Object.keys(old).filter((k) => k !== 'jelly').slice(0, 2);
    for (const k of keep) pool[k] = 1;
    return pool;
  };

  // ---------------- helpers ----------------
  const face = (e, p) => (p.player.cx > e.x + e.w / 2 ? 1 : -1);
  const fx = (p) => p.actFx || (p.actFx = []);
  const hurtIn = (p, r, dmg, fromX) => {
    const keep = p.player;
    for (const pl of p.players) if (!pl.dead && U.ov(r, pl)) { p.player = pl; p.damagePlayer(dmg, fromX); }
    p.player = keep;
  };
  // A telegraphed strike: warn, wait, then hurt whoever is inside and flash it.
  const strike = (p, r, delay, dmg, color, kind = 'beam') => {
    p.warn({ x: r.x, y: r.y, w: r.w, h: r.h, t: delay });
    p.delay(delay, () => { hurtIn(p, r, dmg, r.x + r.w / 2); fx(p).push({ kind, x: r.x, y: r.y, w: r.w, h: r.h, t: 0.25, max: 0.25, color }); if (kind === 'blast') { p.burst(r.x + r.w / 2, r.y + r.h / 2, 18, color, 260, 0.5, 3); p.shake(4); } });
  };
  const shot = (p, x, y, vx, vy, dmg, r = 6) => p.spawnProj({ x, y, vx, vy, r, dmg, hostile: true, life: 2.2, kind: 'orb' });
  const glowDot = (ctx, x, y, r, c, f) => { ctx.fillStyle = f ? '#fff' : c; A.circle(ctx, x, y, r); };

  // ================= ENEMIES =================
  const E = {
    // ---- Act II: the Lumen, things of shattered light ----
    prism: {
      name: 'Prism Sentinel', w: 34, h: 52, hp: 64, dmg: 16, xp: 12, mem: 3, heavy: true,
      update(e, p, dt) {
        const pl = p.player, dx = pl.cx - (e.x + e.w / 2);
        e.vx = 0; e.cd -= dt;
        if (!e.charging && e.cd <= 0 && Math.abs(dx) < 520 && Math.abs(pl.y + pl.h - (e.y + e.h)) < 120) {
          e.dir = dx > 0 ? 1 : -1; e.charging = 0.9;
          const y = e.y + 14, x = e.dir > 0 ? e.x + e.w : e.x - 520;
          strike(p, { x, y: y - 9, w: 520, h: 18 }, 0.9, e.dmg * 1.2, '#fff4c2');
          p.sfx('beacon');
        }
        if (e.charging > 0) { e.charging -= dt; if (e.charging <= 0) { e.charging = 0; e.cd = 2.6; } }
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, by = e.y + e.h, ch = e.charging > 0 ? 1 - e.charging / 0.9 : 0;
        A.glow(ctx, cx, by - 30, 40 + ch * 30, 'rgba(255,240,190,' + (0.25 + ch * 0.4) + ')');
        ctx.fillStyle = f ? '#fff' : '#3a3f55'; ctx.beginPath(); ctx.moveTo(cx - 16, by); ctx.lineTo(cx + 16, by); ctx.lineTo(cx + 9, by - 14); ctx.lineTo(cx - 9, by - 14); ctx.closePath(); ctx.fill();
        ctx.fillStyle = f ? '#fff' : 'rgba(220,240,255,0.85)'; ctx.beginPath(); ctx.moveTo(cx, by - 52); ctx.lineTo(cx + 13, by - 30); ctx.lineTo(cx, by - 12); ctx.lineTo(cx - 13, by - 30); ctx.closePath(); ctx.fill();
        ctx.fillStyle = f ? '#fff' : 'rgba(255,233,168,0.9)'; ctx.beginPath(); ctx.moveTo(cx, by - 52); ctx.lineTo(cx + 13, by - 30); ctx.lineTo(cx, by - 30); ctx.closePath(); ctx.fill();
        glowDot(ctx, cx + e.dir * 4, by - 34, 3 + ch * 2, '#ffffff', f);
      },
    },
    seraphling: {
      name: 'Seraphling', w: 30, h: 26, hp: 34, dmg: 14, xp: 9, mem: 2, fly: true,
      update(e, p, dt) {
        const pl = p.player, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        e.cd -= dt;
        if (e.dive > 0) {
          e.dive -= dt; e.vx = e.dvx; e.vy = e.dvy;
          if (U.ov(e, pl) && !e.hitDone) { e.hitDone = true; p.damagePlayer(e.dmg, cx); }
          if (e.dive <= 0) { e.cd = 2.2 + Math.random(); }
          return;
        }
        const hx = pl.cx + Math.sin(e.t * 0.9 + e.seed) * 140, hy = pl.y - 170;
        e.vx += ((hx - cx) * 1.6 - e.vx) * Math.min(1, dt * 2); e.vy += ((hy - cy) * 1.6 - e.vy) * Math.min(1, dt * 2);
        if (e.cd <= 0 && Math.abs(pl.cx - cx) < 260) {
          if (!e.aim) { e.aim = 0.6; const tx = pl.cx, ty = pl.y + pl.h / 2; e.tx = tx; e.ty = ty; p.warn({ x: tx - 26, y: ty - 30, w: 52, h: 60, t: 0.6 }); }
        }
        if (e.aim > 0) { e.aim -= dt; e.vx *= 0.8; e.vy *= 0.8; if (e.aim <= 0) { e.aim = 0; const dx = e.tx - cx, dy = e.ty - cy, d = Math.hypot(dx, dy) || 1; e.dvx = (dx / d) * 760; e.dvy = (dy / d) * 760; e.dive = Math.min(0.6, d / 760 + 0.1); e.hitDone = false; p.sfx('dash'); } }
        e.dir = pl.cx > cx ? 1 : -1;
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2, fl = Math.sin(e.t * 18) * 6;
        A.glow(ctx, cx, cy, 26, 'rgba(255,240,200,0.4)');
        ctx.fillStyle = f ? '#fff' : 'rgba(255,250,235,0.8)';
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + s * 16, cy - 14 - fl, cx + s * 20, cy - 4 + fl * 0.4); ctx.quadraticCurveTo(cx + s * 10, cy + 2, cx, cy + 2); ctx.fill(); }
        ctx.fillStyle = f ? '#fff' : '#ffe9a8'; ctx.beginPath(); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx + 6, cy + 2); ctx.lineTo(cx, cy + 12); ctx.lineTo(cx - 6, cy + 2); ctx.closePath(); ctx.fill();
        if (e.aim > 0) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 14 + e.aim * 20, 0, Math.PI * 2); ctx.stroke(); }
      },
    },
    golem: {
      name: 'Crystal Golem', w: 56, h: 66, hp: 150, dmg: 24, xp: 22, mem: 5, heavy: true,
      update(e, p, dt) {
        const pl = p.player, dx = pl.cx - (e.x + e.w / 2);
        e.cd -= dt;
        if (e.pound > 0) { e.vx = 0; e.pound -= dt; return; }
        e.dir = dx > 0 ? 1 : -1;
        e.vx = e.dir * 45 * e.spd;
        if (e.cd <= 0 && Math.abs(dx) < 170 && e.onGround) {
          e.cd = 3; e.pound = 1;
          const gy = e.y + e.h;
          strike(p, { x: e.x - 130, y: gy - 46, w: e.w + 260, h: 46 }, 0.85, e.dmg * 1.2, '#cfe8ff', 'blast');
        }
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, by = e.y + e.h, lift = e.pound > 0 ? Math.sin((1 - e.pound) * Math.PI) * -10 : 0, sw = Math.sin(e.t * 4) * 3;
        ctx.fillStyle = f ? '#fff' : '#2e3346'; A.rrect(ctx, cx - 22, by - 16 + sw * 0.2, 16, 16, 4); A.rrect(ctx, cx + 6, by - 16 - sw * 0.2, 16, 16, 4);
        ctx.fillStyle = f ? '#fff' : '#454b63'; A.rrect(ctx, cx - 26, by - 58, 52, 44, 10);
        ctx.fillStyle = f ? '#fff' : 'rgba(190,225,255,0.9)';
        for (const [ox, oy, s] of [[-14, -60, 12], [4, -66, 16], [18, -56, 10]]) { ctx.beginPath(); ctx.moveTo(cx + ox, by + oy - s); ctx.lineTo(cx + ox + s * 0.5, by + oy); ctx.lineTo(cx + ox - s * 0.5, by + oy); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = f ? '#fff' : '#454b63'; A.rrect(ctx, cx + e.dir * 24 - 9, by - 46 + lift, 18, 30, 6);
        glowDot(ctx, cx + e.dir * 10, by - 42, 4, '#9fe8ff', f);
        A.glow(ctx, cx + e.dir * 10, by - 42, 18, 'rgba(160,230,255,0.5)');
      },
    },
    // ---- Act III: the Legion, a war's leftovers ----
    trooper: {
      name: 'Legion Trooper', w: 26, h: 50, hp: 46, dmg: 11, xp: 10, mem: 2,
      update(e, p, dt) {
        const pl = p.player, dx = pl.cx - (e.x + e.w / 2), ad = Math.abs(dx);
        e.dir = dx > 0 ? 1 : -1; e.cd -= dt;
        const want = ad < 220 ? -1 : ad > 380 ? 1 : 0;
        e.vx = e.burst > 0 ? 0 : want * e.dir * 90 * e.spd;
        if (e.cd <= 0 && ad < 560 && Math.abs(pl.y - e.y) < 160) { e.burst = 3; e.bt = 0.35; e.cd = 2.8; }
        if (e.burst > 0) { e.bt -= dt; if (e.bt <= 0) { e.bt = 0.12; e.burst--; const sx = e.x + e.w / 2 + e.dir * 16, sy = e.y + 18, ddx = pl.cx - sx, ddy = pl.y + 20 - sy, d = Math.hypot(ddx, ddy) || 1; shot(p, sx, sy, (ddx / d) * 560, (ddy / d) * 560, e.dmg, 4); p.sfx('shoot'); } }
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, by = e.y + e.h, d = e.dir, run = Math.abs(e.vx) > 5 ? Math.sin(e.t * 12) * 4 : 0;
        ctx.fillStyle = f ? '#fff' : '#1f2433'; ctx.fillRect(cx - 7, by - 18, 5, 18 + run * 0.3); ctx.fillRect(cx + 2, by - 18, 5, 18 - run * 0.3);
        ctx.fillStyle = f ? '#fff' : '#3d4a66'; A.rrect(ctx, cx - 10, by - 40, 20, 24, 5);
        ctx.fillStyle = f ? '#fff' : '#c0392b'; ctx.fillRect(cx - 10, by - 30, 20, 3);
        ctx.fillStyle = f ? '#fff' : '#566488'; A.circle(ctx, cx, by - 44, 9);
        ctx.fillStyle = f ? '#fff' : '#ff4f4f'; ctx.fillRect(cx + d * 2 - 4, by - 46, 8, 3);
        ctx.fillStyle = f ? '#fff' : '#2a2f3e'; ctx.fillRect(cx + (d > 0 ? 4 : -22), by - 32, 18, 5);
        if (e.burst > 0) A.glow(ctx, cx + d * 24, by - 30, 12, 'rgba(255,120,80,0.6)');
      },
    },
    bulwark: {
      name: 'Bulwark', w: 46, h: 58, hp: 120, dmg: 20, xp: 18, mem: 4, heavy: true, shield: true,
      update(e, p, dt) {
        const pl = p.player, dx = pl.cx - (e.x + e.w / 2);
        e.cd -= dt;
        if (e.bash > 0) { e.bash -= dt; e.vx = e.dir * 520; if (U.ov(e, pl) && !e.hitDone) { e.hitDone = true; p.damagePlayer(e.dmg * 1.3, e.x + e.w / 2); } if (e.bash <= 0) e.cd = 2.6; return; }
        if (e.wind > 0) { e.vx = 0; e.wind -= dt; if (e.wind <= 0) { e.bash = 0.42; e.hitDone = false; p.sfx('dash'); } return; }
        e.turn = (e.turn || 0) - dt; if (e.turn <= 0) { e.dir = dx > 0 ? 1 : -1; e.turn = 0.9; }
        e.vx = e.dir * 55 * e.spd;
        if (e.cd <= 0 && Math.abs(dx) < 260 && Math.abs(pl.y + pl.h - e.y - e.h) < 50 && Math.sign(dx) === e.dir) {
          e.wind = 0.6; const x = e.dir > 0 ? e.x + e.w : e.x - 220; p.warn({ x, y: e.y + 8, w: 220, h: e.h - 8, t: 0.6 });
        }
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, by = e.y + e.h, d = e.dir;
        ctx.fillStyle = f ? '#fff' : '#1f2433'; ctx.fillRect(cx - 12, by - 16, 8, 16); ctx.fillRect(cx + 4, by - 16, 8, 16);
        ctx.fillStyle = f ? '#fff' : '#4a556f'; A.rrect(ctx, cx - 16, by - 46, 32, 32, 6);
        ctx.fillStyle = f ? '#fff' : '#5c6a8a'; A.rrect(ctx, cx - 11, by - 58, 22, 14, 5);
        ctx.fillStyle = f ? '#fff' : '#ff4f4f'; ctx.fillRect(cx + d * 2 - 6, by - 53, 12, 3);
        // the tower shield
        ctx.fillStyle = f ? '#fff' : '#2c3550'; A.rrect(ctx, cx + d * 18 - 7, by - 56, 14, 50, 4);
        ctx.fillStyle = f ? '#fff' : '#3a7bd5'; ctx.fillRect(cx + d * 18 - 5, by - 50, 10, 3); ctx.fillRect(cx + d * 18 - 5, by - 24, 10, 3);
        if (e.wind > 0) A.glow(ctx, cx + d * 22, by - 30, 30, 'rgba(255,120,80,0.55)');
      },
    },
    swarmer: {
      name: 'Swarm Drone', w: 20, h: 16, hp: 18, dmg: 18, xp: 5, mem: 1, fly: true,
      update(e, p, dt) {
        const pl = p.player, cx = e.x + e.w / 2, cy = e.y + e.h / 2, dx = pl.cx - cx, dy = pl.cy - cy, d = Math.hypot(dx, dy) || 1;
        if (e.fuse > 0) {
          e.fuse -= dt; e.vx *= 0.9; e.vy *= 0.9;
          if (e.fuse <= 0) { hurtIn(p, { x: cx - 60, y: cy - 60, w: 120, h: 120 }, e.dmg, cx); p.novas.push({ x: cx, y: cy, r: 6, max: 64, t: 0, color: '#ff8a4a' }); p.burst(cx, cy, 16, '#ff8a4a', 240, 0.4, 2.5); e.hp = 0; p.killEnemy(e); }
          return;
        }
        const sp = 210 * e.spd;
        e.vx += ((dx / d) * sp + Math.sin(e.t * 7 + e.seed) * 80 - e.vx) * Math.min(1, dt * 3);
        e.vy += ((dy / d) * sp + Math.cos(e.t * 6 + e.seed) * 60 - e.vy) * Math.min(1, dt * 3);
        if (d < 70) { e.fuse = 0.55; p.warn({ x: cx - 60, y: cy - 60, w: 120, h: 120, t: 0.55 }); }
        e.dir = dx > 0 ? 1 : -1;
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2, blink = e.fuse > 0 && Math.floor(e.t * 16) % 2;
        ctx.fillStyle = f ? '#fff' : '#3d4a66'; A.rrect(ctx, cx - 9, cy - 5, 18, 10, 4);
        ctx.strokeStyle = f ? '#fff' : '#8a97b8'; ctx.lineWidth = 1.2; A.line(ctx, cx - 12, cy - 7 + Math.sin(e.t * 40), cx - 4, cy - 7); A.line(ctx, cx + 4, cy - 7, cx + 12, cy - 7 + Math.cos(e.t * 40));
        glowDot(ctx, cx + e.dir * 4, cy, 2.4, blink ? '#ffffff' : '#ff6a4a', f);
        if (e.fuse > 0) A.glow(ctx, cx, cy, 22, 'rgba(255,110,60,0.6)');
      },
    },
    // ---- Act IV: things from past the horizon ----
    stalker: {
      name: 'Phase Stalker', w: 28, h: 52, hp: 70, dmg: 22, xp: 15, mem: 3,
      update(e, p, dt) {
        const pl = p.player, dx = pl.cx - (e.x + e.w / 2);
        e.cd -= dt; e.alpha = e.phase > 0 ? 0.15 : 1;
        if (e.phase > 0) { e.phase -= dt; e.vx = 0; if (e.phase <= 0) { const side = pl.facing > 0 ? -1 : 1; e.x = pl.cx + side * 54 - e.w / 2; e.y = pl.y + pl.h - e.h; e.dir = -side; e.slash = 0.45; p.burst(e.x + e.w / 2, e.y + 26, 14, '#ff3b6a', 200, 0.4, 2.5); const x = e.dir > 0 ? e.x + e.w - 6 : e.x - 64; p.warn({ x, y: e.y + 6, w: 70, h: e.h - 6, t: 0.45 }); e.sx = x; } return; }
        if (e.slash > 0) { e.vx = 0; e.slash -= dt; if (e.slash <= 0) { hurtIn(p, { x: e.sx, y: e.y + 6, w: 70, h: e.h - 6 }, e.dmg, e.x + e.w / 2); fx(p).push({ kind: 'slash', x: e.sx, y: e.y, w: 70, h: e.h, t: 0.18, max: 0.18, color: '#ff3b6a' }); e.cd = 2.4; } return; }
        e.dir = dx > 0 ? 1 : -1; e.vx = e.dir * 70 * e.spd;
        if (e.cd <= 0 && Math.abs(dx) < 420) { e.phase = 0.5; p.sfx('dash'); }
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, by = e.y + e.h, d = e.dir;
        ctx.save(); ctx.globalAlpha *= e.alpha == null ? 1 : e.alpha;
        ctx.fillStyle = f ? '#fff' : '#120e18'; ctx.beginPath(); ctx.moveTo(cx - 10, by); ctx.lineTo(cx - 13 - Math.sin(e.t * 5) * 3, by - 30); ctx.lineTo(cx, by - 52); ctx.lineTo(cx + 13, by - 30); ctx.lineTo(cx + 10, by); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = f ? '#fff' : 'rgba(255,59,106,0.7)'; ctx.lineWidth = 1.2; ctx.stroke();
        glowDot(ctx, cx + d * 4, by - 40, 2.4, '#ff3b6a', f); glowDot(ctx, cx + d * 9, by - 41, 1.6, '#8fb0ff', f);
        ctx.strokeStyle = f ? '#fff' : '#ff3b6a'; ctx.lineWidth = 2; A.line(ctx, cx + d * 10, by - 28, cx + d * (e.slash > 0 ? 14 : 22), by - (e.slash > 0 ? 48 : 12));
        ctx.restore();
      },
    },
    maw: {
      name: 'Horizon Maw', w: 46, h: 42, hp: 90, dmg: 20, xp: 16, mem: 4, fly: true, heavy: true,
      update(e, p, dt) {
        const pl = p.player, cx = e.x + e.w / 2, cy = e.y + e.h / 2, dx = pl.cx - cx, dy = pl.cy - cy, d = Math.hypot(dx, dy) || 1;
        e.cd -= dt;
        const sp = 50 * e.spd;
        e.vx += ((dx / d) * sp - e.vx) * Math.min(1, dt); e.vy += (((pl.y - 120) - cy) * 0.8 - e.vy) * Math.min(1, dt);
        e.open = e.pull > 0;
        if (e.pull > 0) {
          e.pull -= dt;
          for (const q of p.players) if (!q.dead) { const qx = cx - q.cx, qy = cy - q.cy, qd = Math.hypot(qx, qy) || 1; if (qd < 300 && qd > 30) { q.vx += (qx / qd) * 900 * dt; q.vy += (qy / qd) * 500 * dt; } if (qd < 44 && !e.bit) { e.bit = true; p.player = q; p.damagePlayer(e.dmg * 1.4, cx); } }
          if (e.pull <= 0) e.cd = 3.4;
        } else if (e.cd <= 0 && d < 300) { e.pull = 1.8; e.bit = false; p.sfx('boss'); }
        e.dir = dx > 0 ? 1 : -1;
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2, o = e.open ? 10 + Math.sin(e.t * 20) * 2 : 3;
        if (e.open) { ctx.strokeStyle = 'rgba(255,60,110,0.35)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const r = 300 * (1 - ((e.t * 1.4 + i / 3) % 1)); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); } }
        A.glow(ctx, cx, cy, 40, 'rgba(255,50,100,0.35)');
        ctx.fillStyle = f ? '#fff' : '#1a1222'; A.circle(ctx, cx, cy, 21);
        ctx.fillStyle = f ? '#fff' : '#000'; A.ellipse(ctx, cx, cy, 15, o);
        ctx.fillStyle = f ? '#fff' : '#e8e2ef'; for (let i = 0; i < 6; i++) { const x = cx - 13 + i * 5.2; ctx.beginPath(); ctx.moveTo(x, cy - o); ctx.lineTo(x + 2.5, cy - o + 5); ctx.lineTo(x + 5, cy - o); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, cy + o); ctx.lineTo(x + 2.5, cy + o - 5); ctx.lineTo(x + 5, cy + o); ctx.fill(); }
        ctx.strokeStyle = f ? '#fff' : '#ff3b6a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 21, 0, Math.PI * 2); ctx.stroke();
      },
    },
    echoling: {
      name: 'Echoling', w: 26, h: 44, hp: 52, dmg: 14, xp: 11, mem: 2,
      update(e, p, dt) {
        const pl = p.player, dx = pl.cx - (e.x + e.w / 2);
        e.dir = dx > 0 ? 1 : -1; e.cd -= dt;
        // mirrors your movement, keeping its distance
        const want = Math.abs(dx) < 200 ? -1 : Math.abs(dx) > 340 ? 1 : 0;
        e.vx = want * e.dir * 80 * e.spd + -pl.vx * 0.25;
        if (e.cd <= 0 && Math.abs(dx) < 520) {
          e.cd = 2.2;
          const sx = e.x + e.w / 2, sy = e.y + 14;
          for (const a of [-0.25, 0, 0.25]) { const ang = Math.atan2(pl.cy - sy, pl.cx - sx) + a; shot(p, sx, sy, Math.cos(ang) * 260, Math.sin(ang) * 260, e.dmg, 7); }
          p.sfx('shoot');
        }
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, by = e.y + e.h;
        ctx.save(); ctx.globalAlpha *= 0.85;
        ctx.fillStyle = f ? '#fff' : '#26203a'; A.rrect(ctx, cx - 9, by - 30, 18, 30, 6);
        ctx.fillStyle = f ? '#fff' : '#3a3058'; A.circle(ctx, cx, by - 36, 9);
        ctx.fillStyle = f ? '#fff' : '#8fb0ff'; A.ellipse(ctx, cx + e.dir * 3, by - 37, 5, 3);
        for (let i = 1; i <= 2; i++) { ctx.globalAlpha = 0.18 / i; ctx.fillStyle = '#8fb0ff'; A.rrect(ctx, cx - 9 - e.dir * i * 7, by - 44, 18, 44, 6); }
        ctx.restore();
      },
    },
  };

  // ================= MINI-BOSSES =================
  // Tougher, with a name bar and three attacks each. Each waits in a sealed room in every stage
  // of its act.
  const M = {
    huskknight: {
      name: 'Husk Knight', w: 64, h: 86, hp: 780, dmg: 26, xp: 120, mem: 40, heavy: true, mini: true,
      update(e, p, dt) {
        const pl = p.player, dx = pl.cx - (e.x + e.w / 2);
        e.cd -= dt;
        if (e.act > 0) { e.act -= dt; e.vx *= 0.9; return; }
        e.dir = dx > 0 ? 1 : -1; e.vx = e.dir * 70 * e.spd;
        if (e.cd > 0) return;
        const r = Math.random();
        if (Math.abs(dx) < 200 && r < 0.55) { // sweep
          e.act = 1.1; e.cd = 1.6; e.anim = 'sweep'; e.vx = 0;
          strike(p, { x: e.dir > 0 ? e.x + e.w - 10 : e.x - 170, y: e.y + 20, w: 180, h: e.h - 20 }, 0.7, e.dmg * 1.3, '#ff8a6a', 'slash');
        } else if (r < 0.85) { // leap slam onto you
          e.act = 1.4; e.cd = 2.2; e.anim = 'leap';
          const tx = pl.cx; p.warn({ x: tx - 90, y: pl.y + pl.h - 60, w: 180, h: 60, t: 1.0 });
          e.vy = -820; e.vx = (tx - (e.x + e.w / 2)) / 1.0;
          p.delay(1.0, () => { hurtIn(p, { x: tx - 90, y: pl.y + pl.h - 60, w: 180, h: 60 }, e.dmg * 1.5, tx); p.shake(10); p.novas.push({ x: tx, y: e.y + e.h, r: 10, max: 120, t: 0, color: '#ff8a6a' }); });
        } else { // call the husks
          e.act = 0.8; e.cd = 3; e.anim = 'call';
          for (const s of [-1, 1]) p.delay(0.5, () => p.spawnEnemy('crawler', e.x + e.w / 2 + s * 120, e.y + e.h, true));
          p.text(e.x + e.w / 2, e.y - 16, 'RISE', '#ff8a6a', 16);
        }
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, by = e.y + e.h, d = e.dir, k = e.act > 0 && e.anim === 'sweep' ? Math.max(0, 1 - e.act / 1.1) : 0;
        A.glow(ctx, cx, by - 50, 70, 'rgba(255,80,90,0.25)');
        ctx.fillStyle = f ? '#fff' : '#1b1e2a'; ctx.fillRect(cx - 16, by - 26, 12, 26); ctx.fillRect(cx + 4, by - 26, 12, 26);
        ctx.fillStyle = f ? '#fff' : '#3e2f3a'; A.rrect(ctx, cx - 24, by - 70, 48, 48, 10);
        ctx.fillStyle = f ? '#fff' : '#6c7489'; A.rrect(ctx, cx - 26, by - 72, 52, 18, 6); A.ellipse(ctx, cx - d * 22, by - 66, 10, 8);
        ctx.fillStyle = f ? '#fff' : '#8c93a6'; A.circle(ctx, cx, by - 80, 13);
        ctx.fillStyle = f ? '#fff' : '#ff3b4f'; ctx.fillRect(cx + d * 2 - 7, by - 82, 14, 3);
        ctx.save(); ctx.translate(cx + d * 20, by - 54); ctx.rotate(d * (-1.2 + k * 2.6));
        ctx.fillStyle = f ? '#fff' : '#2b2f40'; ctx.fillRect(-3, -4, 8, 8); ctx.fillStyle = f ? '#fff' : '#cfd6e6'; ctx.fillRect(4 * d > 0 ? 4 : -76, -3, 72, 6);
        ctx.restore();
      },
    },
    refractor: {
      name: 'The Refractor', w: 60, h: 60, hp: 700, dmg: 24, xp: 130, mem: 45, fly: true, heavy: true, mini: true,
      update(e, p, dt) {
        const pl = p.player, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        e.cd -= dt;
        const hx = pl.cx + Math.sin(e.t * 0.6) * 200, hy = pl.y - 150;
        e.vx += ((hx - cx) * 1.2 - e.vx) * Math.min(1, dt * 1.5); e.vy += ((hy - cy) * 1.2 - e.vy) * Math.min(1, dt * 1.5);
        if (e.cd > 0) return;
        const r = Math.random();
        if (r < 0.45) { // three falling beams around you
          e.cd = 2.4;
          for (const o of [-110, 0, 110]) strike(p, { x: pl.cx + o - 22, y: pl.y + pl.h - 600, w: 44, h: 600 }, 0.9 + Math.abs(o) / 400, e.dmg, '#fff4c2');
        } else if (r < 0.8) { // a horizontal lance at your height
          e.cd = 2.2;
          strike(p, { x: pl.cx - 520, y: pl.y + pl.h / 2 - 12, w: 1040, h: 24 }, 1.0, e.dmg * 1.2, '#fff4c2');
        } else { // shatter: crystal shards in a ring
          e.cd = 2;
          for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; shot(p, cx, cy, Math.cos(a) * 300, Math.sin(a) * 300, e.dmg * 0.7, 7); }
          p.sfx('shoot');
        }
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        A.glow(ctx, cx, cy, 90, 'rgba(255,240,190,0.35)');
        ctx.save(); ctx.translate(cx, cy);
        for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate(e.t * 0.8 + (i * Math.PI) / 3); ctx.fillStyle = f ? '#fff' : i % 2 ? 'rgba(220,240,255,0.85)' : 'rgba(255,233,168,0.85)'; ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(8, -16); ctx.lineTo(-8, -16); ctx.closePath(); ctx.fill(); ctx.restore(); }
        ctx.rotate(-e.t * 0.5);
        ctx.fillStyle = f ? '#fff' : '#ffffff'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(14, 0); ctx.lineTo(0, 16); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
        glowDot(ctx, cx, cy, 4, '#ff6a4a', f);
      },
    },
    walker: {
      name: 'Siege Walker', w: 96, h: 92, hp: 900, dmg: 26, xp: 140, mem: 50, heavy: true, shield: false, mini: true,
      update(e, p, dt) {
        const pl = p.player, dx = pl.cx - (e.x + e.w / 2);
        e.cd -= dt;
        if (e.act > 0) { e.act -= dt; e.vx = 0; return; }
        e.dir = dx > 0 ? 1 : -1; e.vx = e.dir * 40 * e.spd;
        if (e.cd > 0) return;
        const r = Math.random();
        if (r < 0.45) { // artillery
          e.act = 0.8; e.cd = 2.8;
          for (let i = 0; i < 4; i++) { const x = pl.cx + (i - 1.5) * 110 + (Math.random() - 0.5) * 40; strike(p, { x: x - 45, y: pl.y + pl.h - 90, w: 90, h: 90 }, 1.1 + i * 0.18, e.dmg, '#ff8a4a', 'blast'); }
          p.sfx('shoot');
        } else if (r < 0.75 && Math.abs(dx) < 220) { // stomp
          e.act = 1; e.cd = 2;
          strike(p, { x: e.x - 160, y: e.y + e.h - 40, w: e.w + 320, h: 40 }, 0.8, e.dmg * 1.4, '#ff6a4a', 'blast');
        } else { // missile volley
          e.act = 0.8; e.cd = 2.4;
          for (let i = 0; i < 5; i++) p.delay(0.15 * i, () => { const sx = e.x + e.w / 2, sy = e.y + 10, a = -Math.PI / 2 + (Math.random() - 0.5) * 1.2; const m = shot(p, sx, sy, Math.cos(a) * 340, Math.sin(a) * 340, e.dmg * 0.8, 6); m.homing = true; m.life = 3; });
        }
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, by = e.y + e.h, d = e.dir, st = Math.sin(e.t * 3) * 6;
        ctx.strokeStyle = f ? '#fff' : '#2a2f3e'; ctx.lineWidth = 9; ctx.lineCap = 'round';
        A.line(ctx, cx - 26, by - 46, cx - 40 - st, by); A.line(ctx, cx + 26, by - 46, cx + 40 + st, by);
        ctx.fillStyle = f ? '#fff' : '#3d4a66'; A.rrect(ctx, cx - 44, by - 86, 88, 46, 10);
        ctx.fillStyle = f ? '#fff' : '#c0392b'; ctx.fillRect(cx - 44, by - 64, 88, 4);
        ctx.fillStyle = f ? '#fff' : '#2a2f3e'; A.rrect(ctx, cx + d * 30 - 18, by - 96, 36, 14, 4);
        ctx.fillStyle = f ? '#fff' : '#1f2433'; ctx.fillRect(cx + (d > 0 ? 44 : -74), by - 80, 30, 10);
        glowDot(ctx, cx + d * 22, by - 74, 4, '#ff4f4f', f); A.glow(ctx, cx + d * 22, by - 74, 18, 'rgba(255,80,80,0.5)');
        ctx.lineCap = 'butt';
      },
    },
    eventmaw: {
      name: 'The Event Maw', w: 90, h: 80, hp: 760, dmg: 26, xp: 150, mem: 55, fly: true, heavy: true, mini: true,
      update(e, p, dt) {
        const pl = p.player, cx = e.x + e.w / 2, cy = e.y + e.h / 2, dx = pl.cx - cx;
        e.cd -= dt;
        e.vx += ((dx * 0.5) - e.vx) * Math.min(1, dt); e.vy += (((pl.y - 160) - cy) - e.vy) * Math.min(1, dt);
        if (e.pull > 0) {
          e.pull -= dt;
          for (const q of p.players) if (!q.dead) { const qx = cx - q.cx, qy = cy - q.cy, qd = Math.hypot(qx, qy) || 1; if (qd < 420 && qd > 40) { q.vx += (qx / qd) * 1100 * dt; q.vy += (qy / qd) * 600 * dt; } }
          if (e.pull <= 0) { strike(p, { x: cx - 90, y: cy - 70, w: 180, h: 140 }, 0.35, e.dmg * 1.6, '#ff3b6a', 'blast'); }
          return;
        }
        if (e.cd > 0) return;
        const r = Math.random();
        if (r < 0.4) { e.pull = 1.6; e.cd = 3.5; p.sfx('boss'); }
        else if (r < 0.75) { e.cd = 2; for (let i = -2; i <= 2; i++) { const a = Math.atan2(pl.cy - cy, pl.cx - cx) + i * 0.2; shot(p, cx, cy, Math.cos(a) * 280, Math.sin(a) * 280, e.dmg * 0.7, 8); } p.sfx('shoot'); }
        else { e.cd = 2.6; for (const s of [-1, 1]) p.delay(0.3, () => p.spawnEnemy('echoling', cx + s * 140, (p.groundYAt(cx + s * 140, cy) || pl.y + pl.h), true)); }
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2, o = e.pull > 0 ? 22 : 8 + Math.sin(e.t * 2) * 3;
        if (e.pull > 0) { ctx.strokeStyle = 'rgba(255,60,110,0.4)'; ctx.lineWidth = 2.5; for (let i = 0; i < 4; i++) { const r = 420 * (1 - ((e.t * 1.6 + i / 4) % 1)); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); } }
        A.glow(ctx, cx, cy, 110, 'rgba(255,40,100,0.3)');
        ctx.strokeStyle = f ? '#fff' : 'rgba(143,176,255,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, 64, 18, e.t * 0.6, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = f ? '#fff' : '#120c18'; A.circle(ctx, cx, cy, 40);
        ctx.fillStyle = '#000'; A.ellipse(ctx, cx, cy, 30, o);
        ctx.fillStyle = f ? '#fff' : '#e8e2ef'; for (let i = 0; i < 9; i++) { const x = cx - 27 + i * 6; ctx.beginPath(); ctx.moveTo(x, cy - o); ctx.lineTo(x + 3, cy - o + 8); ctx.lineTo(x + 6, cy - o); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, cy + o); ctx.lineTo(x + 3, cy + o - 8); ctx.lineTo(x + 6, cy + o); ctx.fill(); }
        ctx.strokeStyle = f ? '#fff' : '#ff3b6a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2); ctx.stroke();
      },
    },
  };
  Object.assign(GV.ENEMIES, E, M);

  // homing missiles (Siege Walker)
  const upd0 = P.update;
  P.update = function (dt) {
    upd0.call(this, dt);
    if (!this.actInit) actInit(this);
    for (const pr of this.projs) if (pr.homing && pr.hostile) { const pl = this.player, dx = pl.cx - pr.x, dy = pl.cy - pr.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(pr.vx, pr.vy); pr.vx += ((dx / d) * sp - pr.vx) * Math.min(1, dt * 1.6); pr.vy += ((dy / d) * sp - pr.vy) * Math.min(1, dt * 1.6); }
    tickHazards(this, dt);
    const F = this.actFx; if (F) { for (const f of F) f.t -= dt; this.actFx = F.filter((f) => f.t > 0); }
  };
  // no elite mini-bosses
  const elite0 = GV.makeElite;
  if (elite0) GV.makeElite = function (e) { if (e.def && e.def.mini) return; return elite0.apply(this, arguments); };

  // ================= ACT HAZARDS =================
  function actInit(p) {
    p.actInit = true;
    const L = p.L;
    L.beams = []; L.barrage = []; L.gwells = [];
    if (!L.sys || p.trial || p.titan || p.range || L.trial || L.sysIdx == null || L.sysIdx === 0) return;
    const act = GV.ACTS[GV.actOf(L.sysIdx)];
    p.act = act;
    if (!act.hazard) return;
    const end = (L.arena ? L.arena.x : L.length || 6000) - 500;
    const r = U.rng(U.hash('haz:' + L.sysIdx + ':' + L.stIdx + ':' + (L.runSeed || 0)));
    for (let x = 900 + r() * 300; x < end; x += 650 + r() * 500) {
      const gy = p.groundYAt(x, -2000);
      if (gy == null) continue;
      if (L.ambushes.some((a) => x > a.x - 60 && x < a.x + a.w + 60)) continue;
      if (act.hazard === 'beams') L.beams.push({ x: x - 20, w: 40, gy, period: 3.4 + r() * 1.2, ph: r() * 3 });
      if (act.hazard === 'barrage' && r() < 0.6) { L.barrage.push({ x0: x - 250, x1: x + 350, t: 1.5 + r() * 2 }); x += 400; }
      if (act.hazard === 'gravity' && r() < 0.7) L.gwells.push({ x, y: gy - 150, r: 170, ph: r() * 6 });
    }
  }
  function tickHazards(p, dt) {
    const L = p.L; if (!L.beams || p.state !== 'run') return;
    const dmg = 14 * GV.SCALE.dmg(p.diff);
    for (const b of L.beams) {
      const ph = (p.t + b.ph) % b.period, warnAt = b.period - 1.4;
      b.on = ph > b.period - 0.55;
      if (ph >= warnAt && !b.warned) { b.warned = true; p.warn({ x: b.x, y: b.gy - 640, w: b.w, h: 640, t: 0.85 }); }
      if (ph < warnAt) b.warned = false;
      if (b.on) hurtIn(p, { x: b.x, y: b.gy - 640, w: b.w, h: 640 }, dmg, b.x + b.w / 2);
    }
    for (const z of L.barrage) {
      const pl = p.player; if (pl.cx < z.x0 || pl.cx > z.x1) continue;
      z.t -= dt;
      if (z.t <= 0) {
        z.t = 2.4 + Math.random();
        for (let i = 0; i < 3; i++) { const x = pl.cx + (i - 1) * 130 + (Math.random() - 0.5) * 60, gy = p.groundYAt(x, pl.y - 100) || pl.y + pl.h; strike(p, { x: x - 45, y: gy - 80, w: 90, h: 80 }, 1.0 + i * 0.2, dmg, '#ff8a4a', 'blast'); }
      }
    }
    for (const g of L.gwells) for (const q of p.players) {
      if (q.dead || q.dashT > 0) continue;
      const dx = g.x - q.cx, dy = g.y - q.cy, d = Math.hypot(dx, dy);
      if (d < g.r && d > 12) { const k = (1 - d / g.r) * 1400; q.vx += (dx / d) * k * dt; q.vy += (dy / d) * k * 0.6 * dt; }
    }
  }
  const df0 = P.drawFeatures;
  P.drawFeatures = function (ctx, vis) {
    df0.call(this, ctx, vis);
    const L = this.L, t = this.t;
    if (L.beams) for (const b of L.beams) {
      if (!vis({ x: b.x - 40, y: b.gy - 660, w: b.w + 80, h: 680 })) continue;
      ctx.fillStyle = 'rgba(255,240,200,0.12)'; ctx.fillRect(b.x + b.w / 2 - 2, b.gy - 640, 4, 640);
      ctx.fillStyle = '#ffe9a8'; A.rrect(ctx, b.x + 4, b.gy - 10, b.w - 8, 10, 3);
      if (b.on) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,240,190,0.7)'; ctx.fillRect(b.x, b.gy - 640, b.w, 640);
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(b.x + b.w / 2 - 5, b.gy - 640, 10, 640);
        ctx.restore();
      }
    }
    if (L.gwells) for (const g of L.gwells) {
      if (!vis({ x: g.x - g.r, y: g.y - g.r, w: g.r * 2, h: g.r * 2 })) continue;
      A.glow(ctx, g.x, g.y, g.r, 'rgba(255,50,110,0.12)');
      ctx.strokeStyle = 'rgba(143,176,255,0.35)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) { const rr = g.r * (1 - ((t * 0.5 + i / 4 + g.ph) % 1)); ctx.beginPath(); ctx.ellipse(g.x, g.y, rr, rr * 0.5, t * 0.3, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = '#000'; A.circle(ctx, g.x, g.y, 9); ctx.strokeStyle = '#ff3b6a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.x, g.y, 10, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.actFx) for (const f of this.actFx) {
      const k = f.t / f.max;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k;
      if (f.kind === 'beam') { ctx.fillStyle = f.color; ctx.fillRect(f.x, f.y, f.w, f.h); ctx.fillStyle = '#fff'; if (f.w > f.h) ctx.fillRect(f.x, f.y + f.h / 2 - 3, f.w, 6); else ctx.fillRect(f.x + f.w / 2 - 3, f.y, 6, f.h); }
      else if (f.kind === 'slash') { ctx.strokeStyle = f.color; ctx.lineWidth = 6 * k + 2; ctx.beginPath(); ctx.ellipse(f.x + f.w / 2, f.y + f.h / 2, f.w / 2, f.h / 2, 0, -1.2, 1.2); ctx.stroke(); }
      else { A.glow(ctx, f.x + f.w / 2, f.y + f.h / 2, Math.max(f.w, f.h) * 0.8, f.color); }
      ctx.restore();
    }
  };

  // ================= MINI-BOSS ROOMS =================
  const amb0 = P.tickAmbush;
  P.tickAmbush = function (am, dt) {
    const was = am.state;
    amb0.call(this, am, dt);
    if (!am.mini) return;
    const def = GV.ENEMIES[am.mini];
    if (was === 'idle' && am.state === 'active') {
      const tt = this.toasts[this.toasts.length - 1]; if (tt) { tt.text = def.name.toUpperCase(); tt.sub = 'A champion of this act. Bring it down.'; }
      GV.audio.play && GV.audio.play('bossWarn', { gap: 0.3 });
    }
    if (was === 'active' && am.state === 'done') {
      const cx = am.x + am.w / 2, tier = GV.progress.dropTier(this.diff) + 1;
      this.dropItem && this.dropItem(cx, am.floorY - 60);
      this.drops.push({ x: cx + 30, y: am.floorY - 60, vx: 140, vy: -480, w: 14, h: 14, kind: 'uncut', gk: Math.random() < 0.5 ? 'skill' : 'support', tier: Math.min(3, tier), age: 0 });
      const d = GV.save.data; d.miniKills = d.miniKills || {}; d.miniKills[am.mini] = (d.miniKills[am.mini] || 0) + 1;
      this.toast(def.name + ' falls', 2, 'small');
    }
  };
  // Mini-boss health bar, under the top of the screen while one is fighting.
  const hud0 = GV.hud.draw;
  GV.hud.draw = function (ctx, p) {
    hud0.call(this, ctx, p);
    const e = p.enemies.find((x) => x.def && x.def.mini && !x.dead && Math.abs(x.x - p.player.x) < 900);
    if (!e || p.boss) return;
    const W = GV.CFG.W, w = Math.min(520, W * 0.45), x = (W - w) / 2, y = 62;
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,18,0.75)'; ctx.fillRect(x - 6, y - 18, w + 12, 32);
    ctx.font = `700 11px ${GV.CFG.FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd0d6'; ctx.fillText(e.def.name.toUpperCase(), W / 2, y - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x, y, w, 7);
    ctx.fillStyle = (p.act && p.act.color) || '#ff4f6a'; ctx.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 7);
    ctx.restore();
  };

  // ================= ACT TITLE CARDS =================
  // The first time you drop into an act, its album cover fades in with the act's name.
  GV.showAct = function (i, force) {
    const act = GV.ACTS[i]; if (!act) return;
    const m = GV.save.main || GV.save.data; m.actsSeen = m.actsSeen || {};
    if (m.actsSeen[act.id] && !force) return;
    m.actsSeen[act.id] = 1; try { GV.save.write(); } catch (e) {}
    const el = document.createElement('div'); el.id = 'actCard';
    el.innerHTML = `<img src="${act.cover}" alt=""><div><em>ACT ${act.num}</em><b>${GV.menus.esc(act.album)}</b><span>${GV.menus.esc(act.line)}</span></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
    setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 900); }, 5200);
    el.addEventListener('click', () => { el.classList.remove('on'); setTimeout(() => el.remove(), 600); });
  };
  const ss = () => {
    const G = GV.game; if (!G) return;
    const s0 = G.startStage;
    G.startStage = function (sys, st) { const r = s0.apply(this, arguments); if (this.play && !this.play.trial) GV.showAct(GV.actOf(sys)); return r; };
  };
  if (GV.game) ss(); else addEventListener('load', ss);
})();
