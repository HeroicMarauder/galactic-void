// Galactic Void — the Titans. The things that ate the home system. Each Titan is far larger than
// the screen and is fought in its own arena (a Titan Gate on the star map, once a system's third
// stage is clear). Break its weak points to expose the core, survive three phases. Between fights
// they hunt you: mid-stage, a Titan can open its eye in the sky and try to crush you.
(function () {
  const GV = window.GV, U = GV.util, A = GV.art, B = A.bio, C = GV.CFG, P = GV.Play.prototype;

  // ---------- arena ----------
  GV.buildTitanArena = function (sysIdx) {
    const L = GV.buildTrial(sysIdx), gy = L.arena.floorY, W = 1600;
    L.trial = false; L.titan = true;
    L.solids = [{ x: -400, y: gy, w: W + 800, h: 900 }, { x: -40, y: gy - 900, w: 40, h: 900 }, { x: W, y: gy - 900, w: 40, h: 900 }];
    L.oneways = [[120, gy - 140, 220], [W - 340, gy - 140, 220], [W / 2 - 130, gy - 250, 260], [330, gy - 360, 170], [W - 500, gy - 360, 170]].map(([x, y, w]) => ({ x, y, w, h: 16 }));
    L.movers = []; L.portals = [];
    L.arena = { x: 0, w: W, floorY: gy, top: gy - 520 };
    L.spawn = { x: W / 2 - 12, y: gy - 50 };
    L.length = W; L.diff = GV.UNIVERSE.difficulty(sysIdx, 2) + 1;
    L.sd = { name: 'Titan Gate', pool: {}, boss: 'brood', bossName: '', vaults: [] };
    L.exit = { x: -99999, y: gy };
    L.gates = [{ x: -9999, y: 0, w: 1, h: 1, closed: false }, { x: -9999, y: 0, w: 1, h: 1, closed: false }];
    L.camMaxY = gy + 120 - C.H;
    return L;
  };

  // ---------- helpers ----------
  const alive = (p) => p.players.filter((pl) => !pl.dead);
  const target = (p) => { const a = alive(p); return a[Math.floor(Math.random() * a.length)] || p.players[0]; };
  const hurtAll = (p, test, dmg, fromX) => { const r = p.player; for (const pl of alive(p)) if (test(pl)) { p.player = pl; p.damagePlayer(dmg, fromX); } p.player = r; };
  const segDist = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy || 1; let t = ((px - x1) * dx + (py - y1) * dy) / l; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)); };
  const lerpTo = (e, x, y, k) => { e.tx = x; e.ty = y; e.lerp = k || 4; };
  function slamWaves(p, x, y, dmg) { for (const s of [-1, 1]) p.spawnProj({ x: x + s * 30, y: y - 12, vx: s * 460, vy: 0, r: 14, dmg, hostile: true, life: 2.2, kind: 'wave' }); }

  // ---------- the three Titans ----------
  GV.TITANS = {
    kharybdis: {
      name: 'Kharybdis', title: 'The Hunger', color: '#ff7a4a', soft: 'rgba(255,122,74,0.4)', hpMul: 3.2,
      lore: 'A mouth the size of a moon. It ate the home system in an afternoon, and it is still hungry.',
      talk: ['…you are one of the little ones. The ones that got away.', 'I swallowed your sun. I swallowed your name.', 'Come closer. I am so hungry.'],
      half: 'IT OPENS WIDER.', death: 'The maw closes, slowly, like an eye that will not open again.',
      parts: [{ key: 'clawL', name: 'Left Claw', w: 130, h: 96, frac: 0.12 }, { key: 'clawR', name: 'Right Claw', w: 130, h: 96, frac: 0.12 }],
      rest(T, p, k) { const ar = p.arena; return k === 'clawL' ? { x: 140, y: ar.floorY - 300 + Math.sin(T.t * 1.3) * 16 } : { x: ar.w - 270, y: ar.floorY - 300 + Math.cos(T.t * 1.3) * 16 }; },
      core(T, p, exposed) { const ar = p.arena; return exposed ? { x: ar.w / 2 - 60, y: ar.floorY - 250 } : { x: ar.w / 2 - 60, y: ar.top + 20 + Math.sin(T.t) * 10 }; },
      attacks: {
        slam: {
          w: 3, phase: 1,
          start(T, p, s) { s.claw = T.nextClaw = T.nextClaw === 'clawL' ? 'clawR' : 'clawL'; s.st = 'aim'; s.t = 0.9; s.tp = target(p); s.double = T.phase >= 3; },
          tick(T, p, dt, s) {
            const c = T.parts[s.claw], ar = p.arena;
            if (!c) return true;
            s.t -= dt;
            if (s.st === 'aim') {
              const x = U.clamp(s.tp.cx - c.w / 2, 20, ar.w - c.w - 20);
              lerpTo(c, x, ar.floorY - 320, 6);
              if (s.t <= 0) { s.st = 'warn'; s.t = 0.55; s.x = c.x; p.warn({ x: s.x - 10, y: ar.floorY - 150, w: c.w + 20, h: 150, t: 0.55 }); }
            } else if (s.st === 'warn') {
              if (s.t <= 0) { s.st = 'drop'; lerpTo(c, s.x, ar.floorY - c.h, 22); }
            } else if (s.st === 'drop') {
              if (c.y > ar.floorY - c.h - 8) {
                p.hazards.push({ x: c.x - 10, y: ar.floorY - 140, w: c.w + 20, h: 140, t: 0.22, max: 0.22, dmg: T.core.dmg * 1.3 });
                slamWaves(p, c.x + c.w / 2, ar.floorY, T.core.dmg * 0.8);
                p.shake(18); p.sfx('slam');
                s.st = 'rest'; s.t = T.phase >= 2 ? 0.9 : 1.4;
              }
            } else if (s.st === 'rest' && s.t <= 0) {
              if (s.double) { s.double = false; s.claw = s.claw === 'clawL' ? 'clawR' : 'clawL'; s.st = 'aim'; s.t = 0.6; s.tp = target(p); return false; }
              return true;
            }
            return false;
          },
        },
        sweep: {
          w: 2, phase: 1,
          start(T, p, s) { s.claw = Math.random() < 0.5 ? 'clawL' : 'clawR'; s.dir = s.claw === 'clawL' ? 1 : -1; s.st = 'set'; s.t = 0.9; },
          tick(T, p, dt, s) {
            const c = T.parts[s.claw], ar = p.arena;
            if (!c) return true;
            s.t -= dt;
            if (s.st === 'set') {
              lerpTo(c, s.dir > 0 ? 10 : ar.w - c.w - 10, ar.floorY - c.h, 7);
              if (s.t <= 0) { s.st = 'warn'; s.t = 0.7; p.warn({ x: 0, y: ar.floorY - 70, w: ar.w, h: 70, t: 0.7 }); }
            } else if (s.st === 'warn') { if (s.t <= 0) s.st = 'go'; }
            else if (s.st === 'go') {
              c.tx = c.x = c.x + s.dir * (T.phase >= 2 ? 900 : 720) * dt; c.ty = c.y = ar.floorY - 70;
              p.hazards.push({ x: c.x, y: ar.floorY - 70, w: c.w, h: 70, t: 0.05, max: 0.05, dmg: T.core.dmg });
              if (Math.random() < dt * 20) p.burst(c.x + c.w / 2, ar.floorY - 6, 4, '#c9b39a', 200, 0.4, 2);
              if (c.x < -20 || c.x > ar.w - c.w + 20) return true;
            }
            return false;
          },
        },
        inhale: {
          w: 2, phase: 2,
          start(T, p, s) { s.t = 3.2; s.st = 'pull'; p.toast('It breathes in', 1.4, 'small'); p.sfx('rift'); },
          tick(T, p, dt, s) {
            const ar = p.arena, mx = ar.w / 2;
            s.t -= dt;
            if (s.st === 'pull') {
              for (const pl of alive(p)) pl.x += Math.sign(mx - pl.cx) * Math.min(Math.abs(mx - pl.cx), 190 * dt);
              if (Math.random() < dt * 8) { const sx = Math.random() < 0.5 ? 0 : ar.w, sy = ar.floorY - 40 - Math.random() * 300; const a = Math.atan2(ar.top - sy, mx - sx); p.spawnProj({ x: sx, y: sy, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, r: 9, dmg: T.core.dmg * 0.6, hostile: true, life: 4, kind: 'orb' }); }
              if (s.t <= 0.8 && !s.warned) { s.warned = true; p.warn({ x: mx - 130, y: ar.floorY - 260, w: 260, h: 260, t: 0.8 }); }
              if (s.t <= 0) { s.st = 'bite'; p.hazards.push({ x: mx - 130, y: ar.floorY - 260, w: 260, h: 260, t: 0.3, max: 0.3, dmg: T.core.dmg * 1.6 }); p.shake(22); p.sfx('boss'); return true; }
            }
            return false;
          },
        },
        debris: {
          w: 2, phase: 2,
          start(T, p, s) {
            const ar = p.arena; s.xs = alive(p).map((pl) => pl.cx);
            while (s.xs.length < (T.phase >= 3 ? 10 : 7)) s.xs.push(60 + Math.random() * (ar.w - 120));
            for (const x of s.xs) p.warn({ x: x - 26, y: ar.floorY - 40, w: 52, h: 40, t: 1 });
            s.t = 0.9;
          },
          tick(T, p, dt, s) {
            s.t -= dt;
            if (s.t <= 0) { const ar = p.arena; for (const x of s.xs) p.spawnProj({ x, y: ar.top - 60, vx: 0, vy: 820, r: 16, dmg: T.core.dmg, hostile: true, life: 2, kind: 'orb' }); p.sfx('shoot'); return true; }
            return false;
          },
        },
      },
      drawBack(ctx, T, p, t) {
        const ar = p.arena, cx = ar.w / 2, cy = ar.top - 120, R = 380, open = T.core && T.exposedT > 0 ? 1.15 : 1;
        A.glow(ctx, cx, cy, R * 1.6, 'rgba(255,90,40,0.18)');
        // cables hanging from the rim, swaying
        for (let i = 0; i < 14; i++) { const a = Math.PI * (0.15 + 0.7 * (i / 13)); const x0 = cx + Math.cos(a) * R * 0.95, y0 = cy + Math.sin(a) * R * 0.95; B.cable(ctx, x0, y0, x0 + Math.sin(t * 0.8 + i) * 30, y0 + 140 + (i % 3) * 50, 30, '#140c10', 4); }
        ctx.fillStyle = '#2a141a'; A.circle(ctx, cx, cy, R);
        ctx.fillStyle = '#3d1d26'; A.circle(ctx, cx, cy, R * 0.86);
        // armour plates bolted around the lip
        for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2 + t * 0.03; ctx.save(); ctx.translate(cx + Math.cos(a) * R * 0.93, cy + Math.sin(a) * R * 0.93); ctx.rotate(a + Math.PI / 2); B.plate(ctx, -34, -12, 68, 24, 6, false); ctx.restore(); }
        // three rings of teeth turning against each other
        for (let ring = 0; ring < 3; ring++) {
          const rr = R * (0.78 - ring * 0.17) * open, n = 26 - ring * 5, rot = t * (ring % 2 ? -0.25 : 0.18);
          ctx.fillStyle = ring === 0 ? '#e9dfd2' : ring === 1 ? '#cfc1b2' : '#a9978a';
          for (let i = 0; i < n; i++) { const a = rot + (i / n) * Math.PI * 2; const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; ctx.beginPath(); ctx.moveTo(x + Math.cos(a + 1.6) * 10, y + Math.sin(a + 1.6) * 10); ctx.lineTo(x - Math.cos(a) * 38, y - Math.sin(a) * 38); ctx.lineTo(x + Math.cos(a - 1.6) * 10, y + Math.sin(a - 1.6) * 10); ctx.fill(); }
        }
        ctx.fillStyle = '#05030a'; A.circle(ctx, cx, cy, R * 0.32 * open);
        B.seam(ctx, [cx - R * 0.8, cy + R * 0.3, cx - R * 0.4, cy + R * 0.62, cx, cy + R * 0.7, cx + R * 0.4, cy + R * 0.62, cx + R * 0.8, cy + R * 0.3], '#ff7a4a', t);
      },
      drawPart(ctx, e, T, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, top = e.y, left = e.key === 'clawL';
        // the arm reaching up out of frame
        B.cable(ctx, cx, top + 10, cx + (left ? -60 : 60), top - 400, 40, '#1a0f14', 26);
        B.cable(ctx, cx + (left ? 10 : -10), top + 10, cx + (left ? -30 : 30), top - 400, 30, '#3a1d26', 12);
        B.plate(ctx, cx - 40, top - 40, 80, 50, 10, f);
        // the hand: a slab of flesh with steel talons
        ctx.fillStyle = B.flesh(f); A.rrect(ctx, e.x + 10, top + 6, e.w - 20, e.h - 30, 18);
        B.plate(ctx, e.x + 22, top + 2, e.w - 44, 22, 6, f);
        ctx.fillStyle = f ? '#fff' : '#d9cfc4';
        for (let i = 0; i < 4; i++) { const x = e.x + 18 + i * ((e.w - 36) / 3); ctx.beginPath(); ctx.moveTo(x - 9, top + e.h - 26); ctx.lineTo(x, top + e.h + 4); ctx.lineTo(x + 9, top + e.h - 26); ctx.fill(); }
        B.eye(ctx, cx, top + 40, 7, T.def.color, f, T.def.soft);
        if (!f) B.veins(ctx, cx - 20, top + 50, 22, 0.4, t, 'rgba(255,120,150,0.7)');
      },
      drawCore(ctx, e, T, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2, ex = T.exposedT > 0;
        A.glow(ctx, cx, cy, 120, ex ? 'rgba(255,200,120,0.5)' : T.def.soft);
        ctx.fillStyle = B.fleshD(f); A.circle(ctx, cx, cy, 56);
        if (!ex) { ctx.strokeStyle = '#4a5468'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(cx, cy, 52, 0, Math.PI * 2); ctx.stroke(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + t * 0.4; B.plate(ctx, cx + Math.cos(a) * 44 - 10, cy + Math.sin(a) * 44 - 6, 20, 12, 3, f); } }
        ctx.fillStyle = f ? '#fff' : '#ffb36a'; A.circle(ctx, cx, cy, ex ? 30 : 22);
        ctx.fillStyle = '#120404'; A.ellipse(ctx, cx + U.clamp((GV.game.play.player.cx - cx) * 0.02, -8, 8), cy, 6, ex ? 22 : 16);
      },
    },

    seraph: {
      name: 'Seraph-9', title: 'The Choirmother', color: '#ffe9a8', soft: 'rgba(255,233,168,0.4)', hpMul: 3.4,
      lore: 'Built to sing a dying sun back to life. It sang the wrong song. Every choir you have fought is one of its children.',
      talk: ['Little voice. You are out of tune.', 'My children sang for you. You silenced them.', 'Let me teach you the last hymn.'],
      half: 'THE HALO BURNS WHITE.', death: 'Its wings fold. The last note hangs in the dark for a very long time.',
      parts: [{ key: 'eyeUL', name: 'Wing Eye', w: 70, h: 70, frac: 0.07 }, { key: 'eyeUR', name: 'Wing Eye', w: 70, h: 70, frac: 0.07 }, { key: 'eyeLL', name: 'Wing Eye', w: 70, h: 70, frac: 0.07 }, { key: 'eyeLR', name: 'Wing Eye', w: 70, h: 70, frac: 0.07 }],
      rest(T, p, k) {
        const ar = p.arena, cx = ar.w / 2, b = Math.sin(T.t * 1.6 + k.length) * 14;
        return { eyeUL: { x: cx - 560, y: ar.floorY - 450 + b }, eyeUR: { x: cx + 490, y: ar.floorY - 450 - b }, eyeLL: { x: cx - 390, y: ar.floorY - 300 - b }, eyeLR: { x: cx + 320, y: ar.floorY - 300 + b } }[k];
      },
      core(T, p, exposed) { const ar = p.arena; return exposed ? { x: ar.w / 2 - 55, y: ar.floorY - 240 } : { x: ar.w / 2 - 55, y: ar.top + 30 + Math.sin(T.t * 0.8) * 12 }; },
      attacks: {
        pillars: {
          w: 3, phase: 1,
          start(T, p, s) { const ar = p.arena; s.xs = alive(p).map((pl) => pl.cx); while (s.xs.length < (T.phase >= 3 ? 8 : 5)) s.xs.push(60 + Math.random() * (ar.w - 120)); for (const x of s.xs) p.warn({ x: x - 35, y: ar.top, w: 70, h: ar.floorY - ar.top, t: 0.85 }); s.t = 0.85; s.twice = T.phase >= 3; },
          tick(T, p, dt, s) {
            s.t -= dt;
            if (s.t <= 0) {
              const ar = p.arena;
              for (const x of s.xs) { p.hazards.push({ x: x - 35, y: ar.top, w: 70, h: ar.floorY - ar.top, t: 0.35, max: 0.35, dmg: T.core.dmg * 1.2 }); T.fx.push({ k: 'pillar', x, t: 0.5, max: 0.5 }); }
              p.shake(8); p.sfx('slam');
              if (s.twice) { s.twice = false; s.xs = s.xs.map((x) => U.clamp(x + (Math.random() < 0.5 ? -110 : 110), 40, ar.w - 40)); for (const x of s.xs) p.warn({ x: x - 35, y: ar.top, w: 70, h: ar.floorY - ar.top, t: 0.6 }); s.t = 0.6; return false; }
              return true;
            }
            return false;
          },
        },
        feathers: {
          w: 3, phase: 1,
          start(T, p, s) { s.n = 0; s.next = 0; },
          tick(T, p, dt, s) {
            s.next -= dt;
            if (s.next <= 0) {
              s.next = 0.32; s.n++;
              for (const k in T.parts) { const e = T.parts[k]; if (!e) continue; const tp = target(p), ex = e.x + e.w / 2, ey = e.y + e.h / 2, a = Math.atan2(tp.cy - ey, tp.cx - ex); p.spawnProj({ x: ex, y: ey, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, r: 7, dmg: T.core.dmg * 0.6, hostile: true, life: 3.5, kind: 'orb' }); }
              p.sfx('shoot');
            }
            return s.n >= 3;
          },
        },
        sweep: {
          w: 2, phase: 2,
          start(T, p, s) { const ar = p.arena; s.dir = Math.random() < 0.5 ? 1 : -1; s.x = s.dir > 0 ? -40 : ar.w + 40; s.t = 0.8; s.st = 'warn'; p.warn({ x: s.dir > 0 ? 0 : ar.w - 90, y: ar.top, w: 90, h: ar.floorY - ar.top, t: 0.8 }); p.toast('Dash through the light', 1.4, 'small'); },
          tick(T, p, dt, s) {
            const ar = p.arena;
            s.t -= dt;
            if (s.st === 'warn') { if (s.t <= 0) s.st = 'go'; return false; }
            s.x += s.dir * (T.phase >= 3 ? 560 : 430) * dt;
            p.hazards.push({ x: s.x - 30, y: ar.top, w: 60, h: ar.floorY - ar.top, t: 0.05, max: 0.05, dmg: T.core.dmg * 0.9 });
            T.fx.push({ k: 'pillar', x: s.x, t: 0.08, max: 0.08 });
            return s.x < -60 || s.x > ar.w + 60;
          },
        },
        choir: {
          w: 1, phase: 2,
          start(T, p, s) { const ar = p.arena; for (let i = 0; i < 3; i++) if (p.enemies.length < 12) p.spawnEnemy(i === 2 && T.phase >= 3 ? 'nullsaint' : 'wisp', 200 + Math.random() * (ar.w - 400), ar.floorY - 260, true); p.sfx('rift'); p.toast('Its children wake', 1.4, 'small'); },
          tick() { return true; },
        },
      },
      drawBack(ctx, T, p, t) {
        const ar = p.arena, cx = ar.w / 2, cy = ar.top + 80, burn = T.phase >= 2;
        A.glow(ctx, cx, cy, 700, burn ? 'rgba(255,240,200,0.2)' : 'rgba(255,233,168,0.12)');
        // wings: fans of steel feathers, each feather veined with light
        for (const side of [-1, 1]) for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) {
          const a = (side < 0 ? Math.PI : 0) + side * (-0.55 + i * 0.14 + row * 0.05) + Math.sin(t * 0.6 + i * 0.3) * 0.03 * side;
          const len = 520 - row * 120 - i * 14, x0 = cx + side * 60, y0 = cy + 40 + row * 40;
          const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len * 0.75;
          ctx.strokeStyle = row === 0 ? '#3a4254' : row === 1 ? '#5a6276' : '#8a92a6'; ctx.lineWidth = 16 - row * 4;
          A.line(ctx, x0, y0, x1, y1);
          ctx.strokeStyle = 'rgba(255,233,168,0.35)'; ctx.lineWidth = 1.5; A.line(ctx, x0, y0, x1, y1);
        }
        // halo
        ctx.strokeStyle = burn ? '#fff6dc' : '#ffe9a8'; ctx.lineWidth = 14; if (!GV.CFG.LOWFX) { ctx.shadowColor = '#ffe9a8'; ctx.shadowBlur = 30; }
        ctx.beginPath(); ctx.ellipse(cx, cy - 40, 260, 80, 0, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
        // the body: a column of flesh caged in ribs, a smooth faceless mask
        ctx.fillStyle = '#3e2430'; A.rrect(ctx, cx - 70, cy - 10, 140, 340, 60);
        ctx.strokeStyle = '#59647a'; ctx.lineWidth = 8; for (let i = 0; i < 6; i++) { const y = cy + 40 + i * 44; ctx.beginPath(); ctx.ellipse(cx, y, 76, 16, 0, 0, Math.PI); ctx.stroke(); }
        ctx.fillStyle = '#e8e3ef'; A.ellipse(ctx, cx, cy - 30, 54, 70);
        B.seam(ctx, [cx - 30, cy - 40, cx, cy - 20, cx + 30, cy - 40], '#ffe9a8', t);
        for (const fx of T.fx) if (fx.k === 'pillar') { const k = fx.t / fx.max; ctx.fillStyle = `rgba(255,245,215,${0.7 * k})`; ctx.fillRect(fx.x - 35, ar.top - 200, 70, ar.floorY - ar.top + 200); A.glow(ctx, fx.x, ar.floorY, 120, `rgba(255,233,168,${0.5 * k})`); }
      },
      drawPart(ctx, e, T, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        ctx.fillStyle = B.metal(f); ctx.beginPath(); ctx.moveTo(cx, e.y - 10); ctx.lineTo(e.x + e.w + 10, cy); ctx.lineTo(cx, e.y + e.h + 10); ctx.lineTo(e.x - 10, cy); ctx.closePath(); ctx.fill();
        ctx.fillStyle = B.fleshL(f); A.ellipse(ctx, cx, cy, 26, 18);
        B.eye(ctx, cx + U.clamp((GV.game.play.player.cx - cx) * 0.01, -6, 6), cy, 11, T.def.color, f, T.def.soft);
      },
      drawCore(ctx, e, T, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2, ex = T.exposedT > 0;
        A.glow(ctx, cx, cy, 130, ex ? 'rgba(255,250,230,0.6)' : T.def.soft);
        ctx.strokeStyle = f ? '#fff' : '#ffe9a8'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI * 2); ctx.stroke();
        if (!ex) for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - t * 0.6; B.plate(ctx, cx + Math.cos(a) * 36 - 12, cy + Math.sin(a) * 36 - 8, 24, 16, 4, f); }
        ctx.fillStyle = f ? '#fff' : B.flesh(false); A.circle(ctx, cx, cy, ex ? 34 : 24);
        B.veins(ctx, cx, cy, 24, 0, t, 'rgba(255,200,170,0.8)');
      },
    },

    kronos: {
      name: 'Kronos', title: 'Who Eats Time', color: '#9fd6ff', soft: 'rgba(159,214,255,0.4)', hpMul: 3.6,
      lore: 'It does not kill you. It takes the time you had left. The Lantern\'s logs are missing eleven years.',
      talk: ['Tick.', 'You have been here before. You will be here again.', 'I have already eaten the moment you win.'],
      half: 'TIME RUNS BACKWARDS.', death: 'Every clock on the Lantern starts again at once.',
      parts: [{ key: 'gearL', name: 'Escapement', w: 84, h: 84, frac: 0.1 }, { key: 'gearR', name: 'Escapement', w: 84, h: 84, frac: 0.1 }, { key: 'spring', name: 'Mainspring', w: 110, h: 60, frac: 0.12 }],
      rest(T, p, k) {
        const ar = p.arena, cx = ar.w / 2;
        return { gearL: { x: cx - 330, y: ar.floorY - 420 + Math.sin(T.t) * 10 }, gearR: { x: cx + 246, y: ar.floorY - 420 - Math.sin(T.t) * 10 }, spring: { x: cx - 55 + Math.sin(T.t * 0.7) * 420, y: ar.floorY - 60 } }[k];
      },
      core(T, p, exposed) {
        // a pendulum heart that swings across the arena on a long cable
        const ar = p.arena, cx = ar.w / 2;
        if (exposed) return { x: cx - 50, y: ar.floorY - 230 };
        const a = Math.sin(T.t * 0.9) * 0.9;
        return { x: cx + Math.sin(a) * 460 - 50, y: ar.top - 120 + Math.cos(a) * 300 - 50 };
      },
      attacks: {
        hand: {
          w: 3, phase: 1,
          start(T, p, s) {
            s.hands = [{ a: Math.PI * 0.95, dir: -1 }];
            if (T.phase >= 3) s.hands.push({ a: Math.PI * 0.05, dir: 1 });
            s.st = 'warn'; s.t = 0.9; T.fx.push({ k: 'hands', s, t: 99, max: 99 }); p.sfx('rift');
          },
          tick(T, p, dt, s) {
            const ar = p.arena, px = ar.w / 2, py = ar.top - 60, len = 760;
            s.t -= dt;
            if (s.st === 'warn') { if (s.t <= 0) s.st = 'go'; return false; }
            let done = true;
            for (const h of s.hands) {
              h.a += h.dir * (T.phase >= 2 ? 1.25 : 1) * dt;
              if (h.a > 0 && h.a < Math.PI) done = false;
              const x2 = px + Math.cos(h.a) * len, y2 = py + Math.sin(h.a) * len;
              hurtAll(p, (pl) => segDist(pl.cx, pl.cy, px, py, x2, y2) < 26, T.core.dmg * 1.1, x2);
            }
            if (done) { const i = T.fx.findIndex((f) => f.s === s); if (i >= 0) T.fx.splice(i, 1); }
            return done;
          },
        },
        bombs: {
          w: 3, phase: 1,
          start(T, p, s) { const ar = p.arena; s.xs = []; for (const pl of alive(p)) s.xs.push(pl.cx - 90, pl.cx + 90); while (s.xs.length < (T.phase >= 2 ? 8 : 6)) s.xs.push(60 + Math.random() * (ar.w - 120)); for (const x of s.xs) p.warn({ x: x - 50, y: ar.floorY - 100, w: 100, h: 100, t: 1.6 }); s.t = 1.6; p.toast('Tick… tock…', 1.2, 'small'); },
          tick(T, p, dt, s) {
            s.t -= dt;
            if (s.t <= 0) { const ar = p.arena; for (const x of s.xs) { p.hazards.push({ x: x - 50, y: ar.floorY - 100, w: 100, h: 100, t: 0.2, max: 0.2, dmg: T.core.dmg }); p.novas.push({ x, y: ar.floorY - 20, r: 10, max: 90, t: 0, color: '#9fd6ff' }); } p.shake(10); p.sfx('slam'); return true; }
            return false;
          },
        },
        drag: {
          w: 2, phase: 2,
          start(T, p, s) { s.t = 4; p.toast('Time drags', 1.4, 'small'); p.sfx('boss'); s.next = 0; },
          tick(T, p, dt, s) {
            s.t -= dt; s.next -= dt;
            for (const pl of alive(p)) pl.slowT = 0.15;
            if (s.next <= 0) { s.next = 0.5; const ar = p.arena, x = 60 + Math.random() * (ar.w - 120); p.spawnProj({ x, y: ar.top - 40, vx: 0, vy: 420, r: 14, dmg: T.core.dmg * 0.8, hostile: true, life: 3, kind: 'orb' }); }
            return s.t <= 0;
          },
        },
        rewind: {
          w: 2, phase: 2, when: (T) => T.def.parts.some((d) => !T.parts[d.key]),
          start(T, p, s) { s.t = 2.2; p.toast('It reaches back for what you broke', 1.6, 'small'); p.sfx('rift'); },
          tick(T, p, dt, s) {
            s.t -= dt;
            if (s.t <= 0) { const d = T.def.parts.find((d) => !T.parts[d.key]); if (d) { T.spawnPart(d, 0.5); p.toast('REWOUND', 1.4); p.shake(10); } return true; }
            return false;
          },
        },
      },
      drawBack(ctx, T, p, t) {
        const ar = p.arena, cx = ar.w / 2, cy = ar.top - 60, R = 340, rev = T.phase >= 2;
        A.glow(ctx, cx, cy, R * 1.5, 'rgba(120,190,255,0.16)');
        // gears turning behind the face, flesh grown through the teeth
        for (const [gx, gy, gr, sp] of [[cx - 420, cy + 120, 150, 0.3], [cx + 430, cy + 90, 170, -0.25], [cx - 250, cy + 300, 90, -0.6], [cx + 280, cy + 310, 100, 0.5]]) {
          ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * sp * (rev ? -1 : 1));
          ctx.fillStyle = '#283140'; A.circle(ctx, 0, 0, gr);
          ctx.fillStyle = '#1a2130'; for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillRect(-12, -gr - 14, 24, 22); }
          ctx.fillStyle = '#3e2430'; A.circle(ctx, 0, 0, gr * 0.45);
          ctx.restore();
        }
        // the clock face
        ctx.fillStyle = '#d9d3c4'; A.circle(ctx, cx, cy, R);
        ctx.fillStyle = '#2a2420'; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.save(); ctx.translate(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86); ctx.rotate(a); ctx.fillRect(-4, -18, 8, 36); ctx.restore(); }
        ctx.strokeStyle = '#4a5468'; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
        // flesh splitting the face
        ctx.fillStyle = '#5a2c3a'; ctx.beginPath(); ctx.moveTo(cx - 40, cy - R * 0.9); ctx.quadraticCurveTo(cx + 30, cy, cx - 10, cy + R * 0.9); ctx.quadraticCurveTo(cx - 70, cy, cx - 40, cy - R * 0.9); ctx.fill();
        B.seam(ctx, [cx - 40, cy - R * 0.9, cx + 20, cy, cx - 10, cy + R * 0.9], '#9fd6ff', t);
        // small hands, ticking (backwards in phase 2)
        const sec = Math.floor(t * (rev ? -1 : 1)) * (Math.PI / 30);
        ctx.strokeStyle = '#120e0c'; ctx.lineWidth = 8; A.line(ctx, cx, cy, cx + Math.cos(sec - Math.PI / 2) * R * 0.7, cy + Math.sin(sec - Math.PI / 2) * R * 0.7);
        // the pendulum cable
        if (T.core && !(T.exposedT > 0)) { const c = T.core; ctx.strokeStyle = '#1a1f2a'; ctx.lineWidth = 6; A.line(ctx, cx, ar.top - 120 - 300 + 300, c.x + c.w / 2, c.y + c.h / 2); }
        // the great hand attack
        for (const fx of T.fx) if (fx.k === 'hands') for (const h of fx.s.hands) {
          const px = cx, py = ar.top - 60, len = 760, x2 = px + Math.cos(h.a) * len, y2 = py + Math.sin(h.a) * len;
          ctx.strokeStyle = fx.s.st === 'warn' ? 'rgba(159,214,255,0.35)' : '#0e1116'; ctx.lineWidth = fx.s.st === 'warn' ? 10 : 34; A.line(ctx, px, py, x2, y2);
          if (fx.s.st !== 'warn') { ctx.strokeStyle = '#9fd6ff'; ctx.lineWidth = 3; A.line(ctx, px, py, x2, y2); }
        }
      },
      drawPart(ctx, e, T, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        if (e.key === 'spring') {
          ctx.strokeStyle = f ? '#fff' : '#8796b0'; ctx.lineWidth = 5;
          ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i * 0.6, r = 6 + i * 0.6; const x = cx + Math.cos(a + t * 3) * r, y = cy + Math.sin(a + t * 3) * r * 0.6; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
          ctx.fillStyle = B.flesh(f); A.ellipse(ctx, cx, cy + 14, 40, 10);
          B.eye(ctx, cx, cy, 6, T.def.color, f, T.def.soft);
          return;
        }
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * (e.key === 'gearL' ? 1 : -1));
        ctx.fillStyle = B.metal(f); A.circle(ctx, 0, 0, 34); for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.fillRect(-6, -44, 12, 14); }
        ctx.restore();
        ctx.fillStyle = B.fleshL(f); A.circle(ctx, cx, cy, 20);
        B.eye(ctx, cx, cy, 9, T.def.color, f, T.def.soft);
      },
      drawCore(ctx, e, T, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2, ex = T.exposedT > 0;
        A.glow(ctx, cx, cy, 110, ex ? 'rgba(200,235,255,0.6)' : T.def.soft);
        ctx.fillStyle = B.metal(f); A.circle(ctx, cx, cy, 48);
        ctx.fillStyle = f ? '#fff' : B.flesh(false); A.circle(ctx, cx, cy, ex ? 38 : 28);
        if (!ex) { ctx.strokeStyle = '#d9d3c4'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2); ctx.stroke(); }
        const beat = 1 + Math.max(0, Math.sin(t * 6)) * 0.15;
        ctx.fillStyle = f ? '#fff' : '#9fd6ff'; A.circle(ctx, cx, cy, 10 * beat);
      },
    },
  };
  GV.TITAN_ORDER = ['kharybdis', 'seraph', 'kronos'];
  GV.titanFor = (sysIdx) => GV.TITAN_ORDER[sysIdx % 3];
  GV.titanAwake = (sysIdx) => Math.floor(sysIdx / 3);

  // A Titan's heart: one unique per Titan, only from felling it.
  GV.UNIQUES.push(
    { slot: 'relic', name: 'Heart of the Hunger', tier: 3, quest: true, mods: { dmg: 30, life: 60, memFind: 40, leech: 2 }, flavor: 'Still beating. Still hungry.' },
    { slot: 'helm', name: 'Halo of the Choirmother', tier: 3, quest: true, mods: { spellDmg: 40, castSpd: 15, ward: 80, area: 15 }, flavor: 'It hums when you are about to die.' },
    { slot: 'relic', name: 'Mainspring of Kronos', tier: 3, quest: true, mods: { cdr: 25, atkSpd: 15, moveSpd: 10, dashCd: 30 }, flavor: 'Wind it once a day. Do not ask what happens if you forget.' },
  );
  const HEART = { kharybdis: 'Heart of the Hunger', seraph: 'Halo of the Choirmother', kronos: 'Mainspring of Kronos' };

  // Boss definitions for each Titan's core, plus the weak-point part.
  GV.ENEMIES.titanpart = {
    name: 'Weak point', w: 80, h: 80, hp: 1, dmg: 0, xp: 0, mem: 0, fly: true, heavy: true,
    update(e, p, dt) { e.vx = 0; e.vy = 0; if (e.tx != null) { const k = Math.min(1, dt * (e.lerp || 4)); e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; } },
    draw(ctx, e, P, t) {
      e.T.def.drawPart(ctx, e, e.T, t);
      ctx.font = `800 10px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = e.T.def.color;
      ctx.fillText(e.pname.toUpperCase(), e.x + e.w / 2, e.y - 14);
    },
  };
  for (const id in GV.TITANS) {
    const T0 = GV.TITANS[id];
    GV.BOSSES['titan_' + id] = {
      w: 110, h: 110, hp: 600, dmg: 30, xp: 600, mem: 200, fly: true, titan: id,
      spawn(p) { return T0.core({ t: 0 }, p, false); },
      update(e, p, dt) { p.titanTick(e, dt); },
      draw(ctx, e, P, t) { if (p0().titan) T0.drawCore(ctx, e, p0().titan, t); },
    };
    GV.BOSS_LORE['titan_' + id] = { epithet: T0.title, talk: T0.talk, half: [T0.half], death: [T0.death] };
    GV.BEASTS['titan_' + id] = { name: T0.name, text: T0.lore, titan: true };
  }
  const p0 = () => GV.game.play || {};

  // ---------- running a Titan fight ----------
  P.titanSetup = function (id) {
    const def = GV.TITANS[id], awake = GV.titanAwake(this.sysIdx);
    this.titanMode = id;
    this.sd.boss = 'titan_' + id;
    this.sd.bossName = (awake ? 'Awakened ' : '') + def.name.toUpperCase();
    this.state = 'boss';
    this.ambT = 1e9;
    const T = (this.titan = { id, def, t: 0, phase: 1, atk: null, cd: 2.5, exposedT: 0, parts: {}, fx: [], core: null, awake });
    const b = this.spawnBoss();
    b.hp = b.maxHp = b.hp * def.hpMul * (1 + 0.6 * awake);
    b.dmg *= 1 + 0.25 * awake;
    b.st = 'intro'; b.tt = 2;
    T.core = b; b.noContact = true;
    T.spawnPart = (pd, frac) => {
      const pos = def.rest(T, this, pd.key);
      const e = this.spawnEnemy('titanpart', pos.x + pd.w / 2, pos.y + pd.h, true);
      e.w = pd.w; e.h = pd.h; e.x = pos.x; e.y = pos.y; e.key = pd.key; e.pname = pd.name; e.T = T; e.part = true; e.noContact = true;
      e.hp = e.maxHp = b.maxHp * pd.frac * (frac || 1);
      T.parts[pd.key] = e;
      return e;
    };
    for (const pd of def.parts) T.spawnPart(pd);
    this.snapCam();
  };

  P.titanTick = function (e, dt) {
    const T = this.titan;
    if (!T) return;
    const def = T.def;
    T.t += dt; e.vx = 0; e.vy = 0;
    for (const f of T.fx) f.t -= dt;
    T.fx = T.fx.filter((f) => f.t > 0);
    if (e.st === 'intro') { e.tt -= dt; const c = def.core(T, this, false); e.x = c.x; e.y = c.y; if (e.tt <= 0) e.st = 'fight'; this.restParts(dt); return; }
    // phases
    const ph = e.hp < e.maxHp * 0.33 ? 3 : e.hp < e.maxHp * 0.66 ? 2 : 1;
    if (ph > T.phase) {
      T.phase = ph; T.exposedT = 0; T.atk = null; T.cd = 1.6;
      for (const pd of def.parts) if (!T.parts[pd.key]) T.spawnPart(pd, 0.8);
      this.toast(ph === 2 ? def.half : `${def.name.toUpperCase()} WILL NOT DIE`, 2.2); this.toasts[this.toasts.length - 1].sub = `Phase ${ph}`;
      this.shake(24); this.sfx('boss'); this.glitchT = 0.6;
    }
    // exposure: all weak points broken
    const broken = def.parts.every((pd) => !T.parts[pd.key]);
    if (broken && !(T.exposedT > 0) && !T.exposedDone) { T.exposedT = 7.5; T.atk = null; T.exposedDone = true; this.toast('CORE EXPOSED', 2); this.sfx('level'); this.shake(14); }
    if (T.exposedT > 0) {
      T.exposedT -= dt;
      const c = def.core(T, this, true); e.x += (c.x - e.x) * Math.min(1, dt * 5); e.y += (c.y - e.y) * Math.min(1, dt * 5);
      if (T.exposedT <= 0) { for (const pd of def.parts) T.spawnPart(pd, 0.6); T.exposedDone = false; T.cd = 1.2; this.toast('It rebuilds itself', 1.6, 'small'); }
      return;
    }
    const c = def.core(T, this, false); e.x += (c.x - e.x) * Math.min(1, dt * 3); e.y += (c.y - e.y) * Math.min(1, dt * 3);
    // attacks
    if (!T.atk) {
      this.restParts(dt);
      T.cd -= dt * (1 + 0.25 * (T.phase - 1));
      if (T.cd > 0) return;
      const opts = [];
      for (const k in def.attacks) { const a = def.attacks[k]; if (a.phase <= T.phase && (!a.when || a.when(T)) && k !== T.last) for (let i = 0; i < a.w; i++) opts.push(k); }
      const k = opts[Math.floor(Math.random() * opts.length)] || Object.keys(def.attacks)[0];
      T.atk = { k, s: {} }; T.last = k;
      def.attacks[k].start(T, this, T.atk.s);
    } else {
      // parts not used by this attack drift back to rest
      this.restParts(dt, T.atk.s.claw);
      if (def.attacks[T.atk.k].tick(T, this, dt, T.atk.s)) { T.atk = null; T.cd = 1.3 - 0.15 * (T.phase - 1); }
    }
  };
  P.restParts = function (dt, busy) {
    const T = this.titan;
    for (const pd of T.def.parts) { const e = T.parts[pd.key]; if (!e || pd.key === busy) continue; const r = T.def.rest(T, this, pd.key); lerpTo(e, r.x, r.y, 3); }
  };

  // The core is armoured until the weak points are broken.
  const dmg0 = P.damageEnemy;
  P.damageEnemy = function (e, dmg, ...rest) {
    if (e.def && e.def.titan && this.titan && !(this.titan.exposedT > 0)) {
      dmg *= 0.06;
      if ((this._armT = (this._armT || 0) - 1) <= 0) { this._armT = 25; this.text(e.x + e.w / 2, e.y - 10, 'ARMOURED · BREAK ITS WEAK POINTS', this.titan.def.color, 12); }
    } else if (e.def && e.def.titan) dmg *= 1.5;
    return dmg0.call(this, e, dmg, ...rest);
  };
  const kill0 = P.killEnemy;
  P.killEnemy = function (e) {
    if (e.part && e.T) {
      if (e.dead) return;
      e.dead = true; e.T.parts[e.key] = null;
      this.burst(e.x + e.w / 2, e.y + e.h / 2, 60, e.T.def.color, 380, 1, 3.5);
      this.toast(`${e.pname} broken`, 1.4, 'small'); this.shake(12); this.sfx('boss');
      this.gainXP(30 * (1 + 0.25 * this.diff));
      return;
    }
    return kill0.call(this, e);
  };
  // Titan rewards on top of the usual boss rewards.
  const down0 = P.onBossDown;
  P.onBossDown = function (b) {
    const T = this.titan;
    if (T) for (const k in T.parts) if (T.parts[k]) T.parts[k].dead = true;
    const r = down0.call(this, b);
    if (T && b.def.titan) {
      const d = GV.save.main || GV.save.data;
      d.titans = d.titans || {}; d.titans[T.id] = (d.titans[T.id] || 0) + 1;
      const first = d.titans[T.id] === 1;
      d.orbs = (d.orbs || 0) + 2; d.cur.divine = (d.cur.divine || 0) + 1; d.cur.exalt = (d.cur.exalt || 0) + 2;
      if (first || Math.random() < 0.35) {
        const u = GV.UNIQUES.find((x) => x.name === HEART[T.id]);
        if (u) this.drops.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: 0, vy: -500, w: 14, h: 14, kind: 'item', item: { uid: GV.save.data.uid++, slot: u.slot, rarity: 'unique', tier: u.tier, name: u.name, base: GV.SLOTS[u.slot].bases[u.tier - 1], mods: Object.assign({}, u.mods), flavor: u.flavor }, age: 0 });
      }
      for (let i = 0; i < 6; i++) this.dropItem(b.x + b.w / 2 + (i - 2.5) * 30, b.y + b.h / 2, { boss: true });
      this.gainMem(Math.round(400 * (1 + 0.3 * this.diff)));
      this.toast(`${T.def.name.toUpperCase()} FELLED`, 3); this.toasts[this.toasts.length - 1].sub = first ? 'Its heart is yours' : `Felled ${d.titans[T.id]} times`;
      this.L.exit = { x: this.arena.w - 110, y: this.arena.floorY };
      GV.save.write();
      if (GV.quests) GV.quests.emit('boss', { type: 'titan', trial: false, flasks: 9, time: 999 });
    }
    return r;
  };
  // Leaving the Titan arena: a result screen of its own, no stage gets marked.
  const finish0 = P.finish;
  P.finish = function () {
    if (!this.titanMode) return finish0.call(this);
    this.sweepDrops();
    this.state = 'clear';
    const d = GV.save.main || GV.save.data;
    this.pendingClear = { titan: this.titanMode, sys: this.sysIdx, mem: this.memGot, kills: this.kills, name: GV.TITANS[this.titanMode].name, sysName: this.sys.name, times: (d.titans || {})[this.titanMode] || 1 };
    GV.save.write();
  };
  // No contact damage from weak points, and no normal enemy spawns in a Titan arena.
  const cap0 = P.cap;
  P.cap = function () { return this.titanMode ? 12 : cap0.call(this); };

  P.drawTitanBack = function (ctx) {
    if (this.titan) this.titan.def.drawBack(ctx, this.titan, this, this.t);
  };

  // ---------- incursions: the Titan hunts you mid-stage ----------
  P.incursionInit = function () {
    const d = GV.save.main || GV.save.data;
    this.inc = { armed: !this.trial && !this.titanMode && !!d.cleared['0-2'] && Math.random() < 0.32, at: 45 + Math.random() * 80, t: 0, on: null };
  };
  P.updateIncursion = function (dt) {
    if (!this.inc) this.incursionInit();
    const I_ = this.inc;
    if (I_.on) {
      const o = I_.on, def = GV.TITANS[o.id], pl = target(this);
      o.t -= dt; o.next -= dt; o.open = Math.min(1, o.open + dt * 0.8);
      if (o.t <= 0 || this.boss || this.state !== 'run') { I_.on = null; this.toast('It loses interest. For now.', 2.2, 'small'); this.gainMem(20 + this.diff * 4); return; }
      if (o.next <= 0 && o.t > 1.5) {
        o.next = 3.4;
        const dmg = 30 * GV.SCALE.dmg(this.diff);
        if (o.id === 'kharybdis') { const x = pl.cx; this.warn({ x: x - 80, y: pl.y + pl.h - 160, w: 160, h: 160, t: 1 }); this.timers.push({ t: 1, fn: () => { const gy = this.groundYAt(x, pl.y - 200) || pl.y + pl.h; this.hazards.push({ x: x - 80, y: gy - 160, w: 160, h: 160, t: 0.25, max: 0.25, dmg }); slamWaves(this, x, gy, dmg * 0.6); this.shake(16); this.sfx('slam'); o.slam = { x, t: 0.6 }; } }); }
        else if (o.id === 'seraph') { const xs = [pl.cx, pl.cx - 160 - Math.random() * 120, pl.cx + 160 + Math.random() * 120]; for (const x of xs) this.warn({ x: x - 35, y: this.cam.y - 40, w: 70, h: this.vh() + 80, t: 0.9 }); this.timers.push({ t: 0.9, fn: () => { for (const x of xs) this.hazards.push({ x: x - 35, y: this.cam.y - 40, w: 70, h: this.vh() + 80, t: 0.3, max: 0.3, dmg }); o.pillars = { xs, t: 0.5 }; this.shake(8); this.sfx('slam'); } }); }
        else { const xs = [pl.cx - 100, pl.cx, pl.cx + 100]; for (const x of xs) this.warn({ x: x - 50, y: pl.y + pl.h - 100, w: 100, h: 100, t: 1.4 }); this.timers.push({ t: 1.4, fn: () => { for (const x of xs) { this.hazards.push({ x: x - 50, y: pl.y + pl.h - 100, w: 100, h: 100, t: 0.2, max: 0.2, dmg }); this.novas.push({ x, y: pl.y + pl.h - 20, r: 10, max: 80, t: 0, color: '#9fd6ff' }); } this.shake(8); this.sfx('slam'); } }); }
      }
      if (o.slam) o.slam.t -= dt; if (o.pillars) o.pillars.t -= dt;
      return;
    }
    if (!I_.armed || this.state !== 'run' || this.boss || this.duel) return;
    I_.t += dt;
    if (I_.t >= I_.at) {
      I_.armed = false;
      const id = GV.titanFor(this.sysIdx);
      I_.on = { id, t: 14, next: 2.6, open: 0 };
      this.toast(`${GV.TITANS[id].name.toUpperCase()} HUNTS YOU`, 2.6); this.toasts[this.toasts.length - 1].sub = 'Keep moving. You cannot fight it here.';
      this.shake(14); this.sfx('boss'); this.glitchT = 0.5;
    }
  };
  // Drawn in screen space, behind the world: a vast eye opening in the sky.
  P.drawIncursionSky = function (ctx) {
    const o = this.inc && this.inc.on;
    if (!o) return;
    const def = GV.TITANS[o.id], W = C.W, H = C.H, k = o.open * Math.min(1, o.t / 1.2);
    ctx.fillStyle = `rgba(0,0,0,${0.45 * k})`; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.22, R = 220;
    ctx.save(); ctx.globalAlpha = k;
    A.glow(ctx, cx, cy, R * 2, def.soft);
    ctx.fillStyle = '#1a0f14'; A.ellipse(ctx, cx, cy, R * 1.4, R * 0.55 * k + 4);
    const sg = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.3);
    sg.addColorStop(0, '#c9b8a8'); sg.addColorStop(0.6, '#8a6a64'); sg.addColorStop(1, '#3a1d22');
    ctx.fillStyle = sg; A.ellipse(ctx, cx, cy, R * 1.25, R * 0.45 * k);
    const pl = this.player, Z = this.zoom(), ix = U.clamp(((pl.cx - this.cam.x) * Z - cx) * 0.15, -R * 0.7, R * 0.7);
    ctx.fillStyle = def.color; A.circle(ctx, cx + ix, cy, R * 0.32 * k);
    ctx.fillStyle = '#05030a'; A.ellipse(ctx, cx + ix, cy, R * 0.07, R * 0.28 * k);
    B.veins(ctx, cx - R, cy, R * 0.5, 0, this.t, 'rgba(255,90,110,0.6)'); B.veins(ctx, cx + R, cy, R * 0.5, Math.PI, this.t, 'rgba(255,90,110,0.6)');
    ctx.restore();
    // the falling claw / pillars of light, in world-ish space
    if (o.slam && o.slam.t > 0) { const sx = (o.slam.x - this.cam.x) * Z; ctx.fillStyle = `rgba(40,20,26,${o.slam.t * 1.6})`; ctx.fillRect(sx - 90, 0, 180, H); }
    if (o.pillars && o.pillars.t > 0) for (const x of o.pillars.xs) { ctx.fillStyle = `rgba(255,245,215,${o.pillars.t * 1.4})`; ctx.fillRect((x - this.cam.x) * Z - 35 * Z, 0, 70 * Z, H); }
  };

  // ---------- achievements ----------
  const st = () => (GV.save.main || GV.save.data).titans || {};
  GV.ACH.push(
    { id: 'titan1', name: 'Smaller Than Gods', desc: 'Fell a Titan', icon: '⛬', mem: 400, test: () => Object.keys(st()).length >= 1 },
    { id: 'titan3', name: 'Deicide', desc: 'Fell all three Titans', icon: '⛬', mem: 1200, test: () => GV.TITAN_ORDER.every((k) => st()[k]), prog: () => [GV.TITAN_ORDER.filter((k) => st()[k]).length, 3] },
  );
})();

// ---------- exotic weapons: Titan-only drops with an effect no shop weapon has ----------
(function () {
  const GV = window.GV, A = GV.art, P = GV.Play.prototype;
  Object.assign(GV.WEAPONS, {
    mawcleaver: { hand: 'two', name: 'Maw Cleaver', exotic: 'kharybdis', fx: 'devour', desc: 'Exotic · Kharybdis. A tooth from the Hunger, edged in light. Hits heal you; kills sometimes burst.', cost: 0, dmg: 36, cd: 0.5, range: 118, h: 66, active: 0.15, knock: 420, color: '#ff8a5a', art: 'greatblade' },
    titanbreaker: { hand: 'two', name: 'Titanbreaker', exotic: 'kharybdis', fx: 'breaker', desc: 'Exotic · Kharybdis. A knuckle of the claw on a haft. 70% more damage to bosses, Titans and their weak points.', cost: 0, dmg: 44, cd: 0.62, range: 78, h: 80, active: 0.17, knock: 620, color: '#ffb36a', slow: true, art: 'maul' },
    requiem: { hand: 'one', name: 'Requiem', exotic: 'seraph', fx: 'chorus', desc: 'Exotic · Seraph-9. A pistol that sings. Every fourth hit calls a pillar of light down on the target.', cost: 0, dmg: 15, cd: 0.2, range: 56, h: 28, active: 0.09, knock: 170, color: '#ffe9a8', art: 'pistol' },
    seraphblade: { hand: 'one', name: 'Wingfeather', exotic: 'seraph', fx: 'chorus', desc: 'Exotic · Seraph-9. One of its blade-feathers. Every fourth hit calls a pillar of light.', cost: 0, dmg: 16, cd: 0.17, range: 64, h: 36, active: 0.08, knock: 160, color: '#fff3d0', crit: 10, art: 'saber' },
    secondhand: { hand: 'one', name: 'The Second Hand', exotic: 'kronos', fx: 'rewind', desc: 'Exotic · Kronos. Its hits wind your skills back: every hit shaves time off your cooldowns, and some hits land twice.', cost: 0, dmg: 13, cd: 0.15, range: 58, h: 34, active: 0.08, knock: 150, color: '#9fd6ff', crit: 8, art: 'saber' },
    horizonlance: { hand: 'two', name: 'Event Horizon', exotic: 'kronos', fx: 'gravity', desc: 'Exotic · Kronos. A lance that bends space. Hits drag enemies toward you and sometimes collapse into a void burst.', cost: 0, dmg: 26, cd: 0.42, range: 136, h: 22, active: 0.12, knock: -120, color: '#b8a8ff', art: 'lance' },
  });
  GV.EXOTICS = Object.keys(GV.WEAPONS).filter((k) => GV.WEAPONS[k].exotic);

  // Weapon effects, applied after every hit with an attack.
  const hit0 = GV.Skills.hitEnemy;
  GV.Skills.hitEnemy = function (p, e, s, o = {}) {
    const pl = s.pl || p.player, W = pl && pl.weapon;
    if (W && W.fx === 'breaker' && s.isAttack && (e.boss || e.part)) o = Object.assign({}, o, { mult: (o.mult || 1) * 1.7 });
    const hpBefore = e.hp;
    const r = hit0.call(this, p, e, s, o);
    if (!W || !W.fx || !s.isAttack || o.fromFx) return r;
    const dealt = Math.max(0, hpBefore - Math.max(0, e.hp));
    if (W.fx === 'devour') { pl.heal(dealt * 0.025); if (e.dead && Math.random() < 0.25) { p.novas.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, r: 10, max: 110, t: 0, color: W.color }); for (const x of p.enemies) if (!x.dead && x !== e && Math.hypot(x.x - e.x, x.y - e.y) < 110) hit0.call(this, p, x, s, { mult: 0.8, fromFx: true }); } }
    if (W.fx === 'chorus') { pl.chorus = (pl.chorus || 0) + 1; if (pl.chorus >= 4) { pl.chorus = 0; p.hazards.push({ x: e.x + e.w / 2 - 30, y: e.y - 260, w: 60, h: 1, t: 0.01, max: 0.01, dmg: 0 }); if (!e.dead) hit0.call(this, p, e, s, { mult: 1.6, fromFx: true }); p.novas.push({ x: e.x + e.w / 2, y: e.y + e.h, r: 6, max: 60, t: 0, color: W.color }); p.burst(e.x + e.w / 2, e.y, 18, W.color, 260, 0.5, 3); } }
    if (W.fx === 'rewind') { for (let i = 0; i < pl.cd.length; i++) pl.cd[i] = Math.min(pl.cd[i], Math.max(0, pl.cd[i] - 0.1)); if (!e.dead && Math.random() < 0.18) hit0.call(this, p, e, s, { mult: 0.7, fromFx: true }); }
    if (W.fx === 'gravity') { if (!e.boss && !e.part && !e.dead) e.vx += Math.sign(pl.cx - (e.x + e.w / 2)) * 220; if (!e.dead && Math.random() < 0.15) { p.novas.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, r: 8, max: 90, t: 0, color: W.color }); for (const x of p.enemies) if (!x.dead && Math.hypot(x.x - e.x, x.y - e.y) < 90) hit0.call(this, p, x, s, { mult: 0.6, fromFx: true, parts: { void: 1 } }); } }
    return r;
  };

  // Dropping, drawing and picking up an exotic weapon.
  P.dropWeapon = function (x, y, id) {
    this.drops.push({ x, y, vx: (Math.random() - 0.5) * 200, vy: -520, w: 16, h: 16, kind: 'weapon', wid: id, age: 0 });
  };
  const give0 = P.giveDrop;
  P.giveDrop = function (dr, pl) {
    if (dr.kind !== 'weapon') return give0.call(this, dr, pl);
    const W = GV.WEAPONS[dr.wid], tag = this.coop ? `P${pl.slot + 1}: ` : '';
    GV.save.as(pl.slot || 0, (d) => {
      if (d.weapons.includes(dr.wid)) { const m = 150 + this.diff * 20; this.gainMem(m); this.toast(`${tag}${W.name} (duplicate) · salvaged for ${m} ✦`, 2.4, 'small'); }
      else { d.weapons.push(dr.wid); this.toast(`${tag}EXOTIC WEAPON · ${W.name}`, 3); this.toasts[this.toasts.length - 1].sub = 'Equip it at Vesper\'s Trade → Weapons'; }
      GV.save.write();
    });
    this.sfx('level'); this.shake(8);
  };
  A.weaponDrop = function (ctx, x, y, t, wid) {
    const W = GV.WEAPONS[wid];
    A.glow(ctx, x, y, 46, 'rgba(255,170,90,0.55)');
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2) * 0.3 - 0.6);
    ctx.fillStyle = W.color; ctx.fillRect(-2, -16, 4, 26); ctx.fillStyle = '#2c3442'; ctx.fillRect(-7, 6, 14, 4); ctx.fillRect(-2, 10, 4, 8);
    ctx.restore();
    ctx.strokeStyle = `rgba(255,200,120,${0.5 + Math.sin(t * 5) * 0.3})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 18 + Math.sin(t * 3) * 2, 0, Math.PI * 2); ctx.stroke();
  };
  // Titans drop their exotics: the first fell of each guarantees one, later fells sometimes do.
  const down1 = P.onBossDown;
  P.onBossDown = function (b) {
    const r = down1.call(this, b);
    if (b.def && b.def.titan) {
      const id = b.def.titan, d = GV.save.main || GV.save.data;
      const mine = GV.EXOTICS.filter((k) => GV.WEAPONS[k].exotic === id), missing = mine.filter((k) => !d.weapons.includes(k));
      const n = (d.titans || {})[id] === 1 ? 1 : Math.random() < 0.3 + 0.1 * GV.titanAwake(this.sysIdx) ? 1 : 0;
      for (let i = 0; i < n; i++) this.dropWeapon(b.x + b.w / 2, b.y + b.h / 2, (missing.length ? missing : mine)[Math.floor(Math.random() * (missing.length ? missing : mine).length)]);
    }
    return r;
  };
})();
