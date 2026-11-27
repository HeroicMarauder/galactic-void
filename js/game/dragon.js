// Galactic Void — the fourth Titan: DRACONIS, the Iron Wyrm. The home system's last war-engine, built to
// kill Titans. They ate it and rebuilt it in their own image. It hangs over the arena on thrusters:
// break its two wing thrusters and its tail blade, and its head crashes down with the reactor open.
(function () {
  const GV = window.GV, U = GV.util, A = GV.art, B = A.bio, C = GV.CFG, P = GV.Play.prototype;
  const alive = (p) => p.players.filter((pl) => !pl.dead);
  const target = (p) => { const a = alive(p); return a[Math.floor(Math.random() * a.length)] || p.players[0]; };
  const hurtAll = (p, test, dmg, fromX) => { const r = p.player; for (const pl of alive(p)) if (test(pl)) { p.player = pl; p.damagePlayer(dmg, fromX); } p.player = r; };
  const lerpTo = (e, x, y, k) => { e.tx = x; e.ty = y; e.lerp = k || 4; };
  const ORANGE = '#ff9a3c', HOT = '#ffd9a0', STEEL = '#2b303d', STEEL2 = '#3c4354', EDGE = '#6f7a92';
  function slamWaves(p, x, y, dmg) { for (const s of [-1, 1]) p.spawnProj({ x: x + s * 30, y: y - 12, vx: s * 500, vy: 0, r: 14, dmg, hostile: true, life: 2.2, kind: 'wave' }); }
  const fire = (p, x, y, vx, vy, dmg, r = 11) => p.spawnProj({ x, y, vx, vy, r, dmg, hostile: true, life: 1.4, kind: 'orb', color: Math.random() < 0.5 ? ORANGE : '#ff6a3a' });
  // burning ground: the dragon's fire lingers on the floor
  const burn = (T, x, w, t) => T.fx.push({ k: 'burn', x, w, t, max: t });

  const DEF = {
    name: 'Draconis', title: 'The Iron Wyrm', color: ORANGE, soft: 'rgba(255,154,60,0.4)', hpMul: 3.6,
    lore: 'The home system\'s last war-engine, built to kill Titans. They ate it, and rebuilt it in their own image. It still flies the old colours.',
    talk: ['IDENTIFY. …Survivor. Designation: obsolete.', 'I was built to save you. I remember the blueprints. I do not remember why.', 'Burn clean, little one.'],
    half: 'REACTOR AT 200%.', death: 'The thrusters gutter out. It falls the way it was built to fall: slowly, and toward the enemy.',
    parts: [
      { key: 'wingL', name: 'Port Thruster', w: 110, h: 84, frac: 0.09 },
      { key: 'wingR', name: 'Starboard Thruster', w: 110, h: 84, frac: 0.09 },
      { key: 'tail', name: 'Tail Blade', w: 150, h: 64, frac: 0.1 },
    ],
    rest(T, p, k) {
      const ar = p.arena, b = Math.sin(T.t * 1.4 + k.length) * 14;
      if (k === 'wingL') return { x: 90, y: ar.floorY - 330 + b };
      if (k === 'wingR') return { x: ar.w - 200, y: ar.floorY - 330 - b };
      return { x: ar.w - 330 + Math.sin(T.t * 0.7) * 50, y: ar.floorY - 220 + Math.cos(T.t * 1.1) * 20 };
    },
    core(T, p, exposed) {
      const ar = p.arena;
      if (exposed) return { x: ar.w / 2 - 55, y: ar.floorY - 120 };
      if (T.hold) return T.hold;
      return { x: ar.w / 2 - 55 + Math.sin(T.t * 0.45) * 260, y: ar.floorY - 265 + Math.sin(T.t * 0.9) * 14 };
    },
    attacks: {
      // a river of fire swept across the floor; the ground keeps burning behind it
      breath: {
        w: 3, phase: 1,
        start(T, p, s) {
          const ar = p.arena, tp = target(p);
          s.dir = tp.cx < ar.w / 2 ? -1 : 1; // sweeps toward the side you're on
          s.x = s.dir > 0 ? 80 : ar.w - 190; s.st = 'aim'; s.t = 0.9; s.spit = 0;
          T.hold = { x: s.x, y: ar.floorY - 255 };
          p.toast('It draws breath', 1.2, 'small'); p.sfx('rift');
        },
        tick(T, p, dt, s) {
          const ar = p.arena, h = T.core; s.t -= dt;
          if (s.st === 'aim') {
            if (s.t <= 0) { s.st = 'warn'; s.t = 0.7; p.warn({ x: 0, y: ar.floorY - 60, w: ar.w, h: 60, t: 0.7 }); }
          } else if (s.st === 'warn') {
            if (s.t <= 0) { s.st = 'go'; T.breathing = true; p.shake(6); }
          } else if (s.st === 'go') {
            const sp = T.phase >= 2 ? 640 : 520;
            s.x += -s.dir * sp * dt; // starts on the far side, sweeps across toward you and past
            T.hold = { x: s.x, y: ar.floorY - 255 + Math.sin(T.t * 8) * 6 }; h.x = s.x; h.y = T.hold.y;
            s.spit -= dt;
            if (s.spit <= 0) {
              s.spit = 0.045;
              const mx = h.x + h.w / 2, my = h.y + h.h - 8;
              fire(p, mx, my, -s.dir * 90 + (Math.random() - 0.5) * 120, 640 + Math.random() * 120, T.core.dmg * 0.5);
              burn(T, mx - 40, 80, T.phase >= 2 ? 2.4 : 1.4);
            }
            if (s.x < 40 || s.x > ar.w - 150) { T.breathing = false; T.hold = null; return true; }
          }
          return false;
        },
      },
      // the thrusters fire a salvo that climbs out of sight and comes back down where you're standing
      missiles: {
        w: 2, phase: 1, when: (T) => T.parts.wingL || T.parts.wingR,
        start(T, p, s) {
          const ar = p.arena, n = T.phase >= 3 ? 12 : T.phase >= 2 ? 9 : 6;
          s.xs = alive(p).map((pl) => pl.cx);
          while (s.xs.length < n) s.xs.push(60 + Math.random() * (ar.w - 120));
          for (const k of ['wingL', 'wingR']) { const w = T.parts[k]; if (!w) continue; for (let i = 0; i < n / 2; i++) T.fx.push({ k: 'climb', x: w.x + w.w / 2 + (Math.random() - 0.5) * 50, y: w.y + 10, vy: -700 - Math.random() * 300, t: 0.9, max: 0.9 }); }
          p.sfx('shoot'); s.st = 'up'; s.t = 0.75;
        },
        tick(T, p, dt, s) {
          const ar = p.arena; s.t -= dt;
          if (s.st === 'up' && s.t <= 0) { for (const x of s.xs) p.warn({ x: x - 30, y: ar.floorY - 44, w: 60, h: 44, t: 0.85 }); s.st = 'mark'; s.t = 0.85; }
          else if (s.st === 'mark' && s.t <= 0) {
            for (const x of s.xs) p.spawnProj({ x, y: ar.top - 80, vx: 0, vy: 880, r: 13, dmg: T.core.dmg * 0.9, hostile: true, life: 2, kind: 'orb', color: HOT });
            p.sfx('shoot'); return true;
          }
          return false;
        },
      },
      // the tail blade scythes across the floor: jump it
      tail: {
        w: 2, phase: 1, when: (T) => !!T.parts.tail,
        start(T, p, s) { s.claw = 'tail'; s.dir = Math.random() < 0.5 ? 1 : -1; s.st = 'set'; s.t = 0.9; },
        tick(T, p, dt, s) {
          const c = T.parts.tail, ar = p.arena;
          if (!c) return true;
          s.t -= dt;
          if (s.st === 'set') {
            lerpTo(c, s.dir > 0 ? 10 : ar.w - c.w - 10, ar.floorY - c.h, 7);
            if (s.t <= 0) { s.st = 'warn'; s.t = 0.65; p.warn({ x: 0, y: ar.floorY - 64, w: ar.w, h: 64, t: 0.65 }); }
          } else if (s.st === 'warn') { if (s.t <= 0) s.st = 'go'; }
          else if (s.st === 'go') {
            c.tx = c.x = c.x + s.dir * (T.phase >= 2 ? 980 : 800) * dt; c.ty = c.y = ar.floorY - c.h;
            p.hazards.push({ x: c.x, y: ar.floorY - 64, w: c.w, h: 64, t: 0.05, max: 0.05, dmg: T.core.dmg });
            if (Math.random() < dt * 24) p.burst(c.x + (s.dir > 0 ? 0 : c.w), ar.floorY - 4, 4, HOT, 240, 0.35, 2);
            if (c.x < -20 || c.x > ar.w - c.w + 20) return true;
          }
          return false;
        },
      },
      // it climbs out of sight, then drops its whole head on you
      dive: {
        w: 2, phase: 2,
        start(T, p, s) { const h = T.core; s.st = 'rise'; s.t = 0.7; T.hold = { x: h.x, y: p.arena.top - 420 }; p.sfx('boss'); },
        tick(T, p, dt, s) {
          const ar = p.arena, h = T.core; s.t -= dt;
          if (s.st === 'rise') {
            if (s.t <= 0) { s.st = 'aim'; s.t = 0.75; s.tp = target(p); }
          } else if (s.st === 'aim') {
            const x = U.clamp(s.tp.cx - h.w / 2, 20, ar.w - h.w - 20);
            T.hold = { x, y: ar.top - 420 }; h.x += (x - h.x) * Math.min(1, dt * 8);
            if (s.t <= 0.55 && !s.warned) { s.warned = true; s.x = x; p.warn({ x: x - 50, y: ar.top, w: h.w + 100, h: ar.floorY - ar.top, t: 0.55 }); }
            if (s.t <= 0) { s.st = 'drop'; h.x = s.x; }
          } else if (s.st === 'drop') {
            h.y += 2200 * dt; T.hold = { x: s.x, y: h.y };
            if (h.y >= ar.floorY - h.h) {
              h.y = ar.floorY - h.h; T.hold = { x: s.x, y: h.y };
              p.hazards.push({ x: h.x - 50, y: ar.floorY - 160, w: h.w + 100, h: 160, t: 0.25, max: 0.25, dmg: T.core.dmg * 1.5 });
              slamWaves(p, h.x + h.w / 2, ar.floorY, T.core.dmg * 0.8);
              p.shake(24); p.sfx('slam'); if (GV.audio.play) GV.audio.play('explode', { x: h.x + h.w / 2 });
              for (let i = 0; i < 8; i++) fire(p, h.x + h.w / 2, ar.floorY - 30, (Math.random() - 0.5) * 700, -200 - Math.random() * 300, T.core.dmg * 0.4, 9);
              s.st = 'stuck'; s.t = T.phase >= 3 ? 0.9 : 1.4;
            }
          } else if (s.st === 'stuck' && s.t <= 0) { T.hold = null; return true; }
          return false;
        },
      },
      // phase three: the reactor runs too hot and the vents rain slag
      overheat: {
        w: 2, phase: 3,
        start(T, p, s) { s.t = 2.2; s.drip = 0; T.overheat = 2.2; p.toast('IT OVERHEATS', 1.4); p.sfx('boss'); p.shake(10); },
        tick(T, p, dt, s) {
          const ar = p.arena; s.t -= dt; s.drip -= dt;
          if (s.drip <= 0 && s.t > 0.4) {
            s.drip = 0.11;
            const x = 40 + Math.random() * (ar.w - 80);
            p.warn({ x: x - 22, y: ar.floorY - 36, w: 44, h: 36, t: 0.5 });
            T.fx.push({ k: 'slag', x, t: 0.42, max: 0.42 }); // falls when its timer runs out (game time, so pausing pauses it)
          }
          if (s.t <= 0) { T.overheat = 0; return true; }
          return false;
        },
      },
    },

    // ---------- drawing ----------
    // Behind the world: the wings, the hull, the neck down to the head, the tail cable, and fire on the floor.
    drawBack(ctx, T, p, t) {
      const ar = p.arena, cx = ar.w / 2, chestY = ar.floorY - 410, h = T.core, ex = T.exposedT > 0;
      const hx = h ? h.x + h.w / 2 : cx, hy = h ? h.y + 20 : ar.floorY - 360;
      const heat = ex ? 1 : T.overheat > 0 ? 0.8 : T.phase >= 2 ? 0.55 : 0.35;
      A.glow(ctx, cx, chestY, 520, `rgba(255,120,40,${0.08 + heat * 0.1})`);
      // wings: ribbed metal sails from the shoulders out to the thruster pods
      for (const side of [-1, 1]) {
        const pod = T.parts[side < 0 ? 'wingL' : 'wingR'], px = pod ? pod.x + pod.w / 2 : cx + side * 620, py = pod ? pod.y + 30 : ar.floorY - 300;
        const sx = cx + side * 120, sy = chestY + 10, tipX = cx + side * 860, tipY = ar.floorY - 120;
        ctx.fillStyle = 'rgba(28,30,40,0.92)';
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px, py - 40); ctx.lineTo(tipX, tipY); ctx.quadraticCurveTo(cx + side * 520, ar.floorY - 240, sx + side * 40, chestY + 110); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = pod ? 'rgba(111,122,146,0.7)' : 'rgba(80,60,60,0.6)'; ctx.lineWidth = 6;
        for (let i = 0; i < 5; i++) { const k = (i + 1) / 6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px + (tipX - px) * k, py - 40 + (tipY - py + 40) * k); ctx.stroke(); }
        ctx.strokeStyle = EDGE; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px, py - 40); ctx.lineTo(tipX, tipY); ctx.stroke();
        if (!pod) { ctx.fillStyle = `rgba(255,120,40,${0.3 + 0.2 * Math.sin(t * 9 + side)})`; A.circle(ctx, px, py - 30, 26); } // a torn-off stump, still burning
      }
      // the hull: an armoured chest hanging from the dark, reactor seams glowing
      ctx.fillStyle = STEEL; ctx.beginPath(); ctx.moveTo(cx - 200, chestY - 160); ctx.lineTo(cx + 200, chestY - 160); ctx.lineTo(cx + 150, chestY + 120); ctx.lineTo(cx, chestY + 170); ctx.lineTo(cx - 150, chestY + 120); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 4; i++) B.plate(ctx, cx - 140 + i * 72, chestY - 40 + (i % 2) * 14, 64, 40, 6, false);
      const rg = 0.5 + 0.5 * Math.sin(t * 3) * (T.overheat > 0 ? 1.6 : 1);
      A.glow(ctx, cx, chestY + 60, 90 + heat * 60, `rgba(255,154,60,${0.35 + heat * 0.35 * rg})`);
      ctx.fillStyle = ex ? '#fff4d8' : HOT; A.circle(ctx, cx, chestY + 60, 18 + heat * 6);
      B.seam(ctx, [cx - 150, chestY + 100, cx - 80, chestY + 140, cx, chestY + 150, cx + 80, chestY + 140, cx + 150, chestY + 100], ORANGE, t);
      // the neck: armoured vertebrae from the chest down to the head
      const n = 14, c1x = cx, c1y = chestY + 260, c2x = hx + (cx - hx) * 0.3, c2y = hy - 160;
      for (let i = n; i >= 0; i--) {
        const k = i / n, a = 1 - k;
        const x = a * a * a * cx + 3 * a * a * k * c1x + 3 * a * k * k * c2x + k * k * k * hx;
        const y = a * a * a * (chestY + 140) + 3 * a * a * k * c1y + 3 * a * k * k * c2y + k * k * k * hy;
        // tangent of the curve, so each plate lies along the neck
        const dx = 3 * a * a * (c1x - cx) + 6 * a * k * (c2x - c1x) + 3 * k * k * (hx - c2x), dy = 3 * a * a * (c1y - chestY - 140) + 6 * a * k * (c2y - c1y) + 3 * k * k * (hy - c2y);
        const ang = Math.atan2(dy, dx), r = 26 - k * 8;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.fillStyle = '#1a1d26'; A.rrect(ctx, -r * 0.9, -r * 0.55, r * 1.8, r * 1.1, 4); // the cable core between plates
        ctx.fillStyle = i % 2 ? STEEL2 : STEEL; A.rrect(ctx, -r * 0.55, -r, r * 1.1, r * 2, 6); // a vertebra plate
        ctx.fillStyle = EDGE; ctx.fillRect(-r * 0.55, -r, r * 1.1, 3);
        ctx.beginPath(); ctx.moveTo(-r * 0.3, -r); ctx.lineTo(0, -r - 12 + k * 4); ctx.lineTo(r * 0.3, -r); ctx.fill(); // a dorsal spine
        if (i % 3 === 0) { ctx.fillStyle = `rgba(255,154,60,${0.45 + 0.35 * Math.sin(t * 4 - i)})`; ctx.fillRect(-2, -r * 0.4, 4, r * 0.8); }
        ctx.restore();
      }
      // the tail: a segmented cable from the hull to the blade
      const tl = T.parts.tail;
      if (tl) B.cable(ctx, cx + 120, chestY + 120, tl.x + tl.w / 2, tl.y + 10, 160, STEEL, 22);
      // fire on the floor
      for (const f of T.fx) {
        if (f.k === 'burn') {
          const k = f.t / f.max;
          for (let i = 0; i < 4; i++) {
            const fx = f.x + (i + 0.5) * (f.w / 4), fh = (26 + 18 * Math.sin(t * 14 + fx)) * k;
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createLinearGradient(0, ar.floorY, 0, ar.floorY - fh);
            g.addColorStop(0, `rgba(255,200,120,${0.75 * k})`); g.addColorStop(0.5, `rgba(255,110,40,${0.5 * k})`); g.addColorStop(1, 'rgba(255,60,20,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(fx - 14, ar.floorY); ctx.quadraticCurveTo(fx - 4, ar.floorY - fh * 0.6, fx + Math.sin(t * 9 + fx) * 5, ar.floorY - fh); ctx.quadraticCurveTo(fx + 4, ar.floorY - fh * 0.6, fx + 14, ar.floorY); ctx.fill();
            ctx.restore();
          }
        } else if (f.k === 'climb') {
          f.y += f.vy * (1 / 60);
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = 'rgba(255,217,160,0.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x, f.y + 60); ctx.stroke();
          A.glow(ctx, f.x, f.y, 16, 'rgba(255,154,60,0.7)');
          ctx.restore();
        }
      }
    },
    drawPart(ctx, e, T, t) {
      const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      if (e.key === 'tail') {
        // a serrated blade on the end of the tail
        ctx.fillStyle = f ? '#fff' : STEEL2;
        ctx.beginPath(); ctx.moveTo(e.x, cy); ctx.lineTo(e.x + 30, e.y); ctx.lineTo(e.x + e.w - 10, e.y + 10); ctx.lineTo(e.x + e.w + 20, cy); ctx.lineTo(e.x + e.w - 10, e.y + e.h - 10); ctx.lineTo(e.x + 30, e.y + e.h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = f ? '#fff' : '#d8dde8';
        for (let i = 0; i < 5; i++) { const x = e.x + 30 + i * 24; ctx.beginPath(); ctx.moveTo(x, e.y + e.h - 6); ctx.lineTo(x + 8, e.y + e.h + 12); ctx.lineTo(x + 16, e.y + e.h - 6); ctx.fill(); }
        B.seam(ctx, [e.x + 30, cy, e.x + e.w - 10, cy], ORANGE, t);
        B.eye(ctx, e.x + 40, cy, 7, ORANGE, f, DEF.soft);
        return;
      }
      // a thruster pod: armoured housing, intake eye, jet flame underneath
      const fl = 0.75 + Math.sin(t * 28 + cx) * 0.2;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, e.y + e.h, 0, e.y + e.h + 120 * fl);
      g.addColorStop(0, 'rgba(255,230,180,0.95)'); g.addColorStop(0.4, 'rgba(255,140,60,0.6)'); g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - 26, e.y + e.h - 6); ctx.lineTo(cx + 26, e.y + e.h - 6); ctx.lineTo(cx, e.y + e.h + 120 * fl); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.fillStyle = f ? '#fff' : STEEL; A.rrect(ctx, e.x + 6, e.y + 8, e.w - 12, e.h - 16, 16);
      B.plate(ctx, e.x + 14, e.y + 2, e.w - 28, 20, 6, f);
      ctx.fillStyle = f ? '#fff' : '#1a1d26'; A.rrect(ctx, cx - 30, e.y + e.h - 22, 60, 14, 6);
      B.eye(ctx, cx, cy + 2, 10, ORANGE, f, DEF.soft);
    },
    drawCore(ctx, e, T, t) {
      const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2, ex = T.exposedT > 0;
      const pl = GV.game.play.player, face = pl && pl.cx < cx ? -1 : 1;
      // breath: a roaring cone from the jaw to the floor
      if (T.breathing) {
        const ar = GV.game.play.arena;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(0, cy + 30, 0, ar.floorY);
        g.addColorStop(0, 'rgba(255,240,200,0.95)'); g.addColorStop(0.3, 'rgba(255,160,70,0.75)'); g.addColorStop(1, 'rgba(255,70,30,0.15)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - 14, cy + 34); ctx.lineTo(cx + 14, cy + 34); ctx.lineTo(cx + 70 + Math.sin(t * 30) * 10, ar.floorY); ctx.lineTo(cx - 70 + Math.sin(t * 27) * 10, ar.floorY); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      A.glow(ctx, cx, cy, 130, ex ? 'rgba(255,220,150,0.55)' : DEF.soft);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(face, 1);
      // horns
      ctx.fillStyle = f ? '#fff' : EDGE;
      ctx.beginPath(); ctx.moveTo(-30, -30); ctx.lineTo(-74, -78); ctx.lineTo(-18, -44); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6, -40); ctx.lineTo(-34, -92); ctx.lineTo(8, -46); ctx.closePath(); ctx.fill();
      // skull: an angular armoured wedge pointing at you
      ctx.fillStyle = f ? '#fff' : STEEL2;
      ctx.beginPath(); ctx.moveTo(-52, -36); ctx.lineTo(30, -40); ctx.lineTo(70, -10); ctx.lineTo(66, 6); ctx.lineTo(-40, 14); ctx.closePath(); ctx.fill();
      B.plate(ctx, -40, -34, 60, 18, 5, f);
      // jaw: hangs open when the core is exposed or it's breathing
      const open = ex ? 0.7 : T.breathing ? 0.5 : 0.1 + 0.05 * Math.sin(t * 3);
      ctx.save(); ctx.rotate(open * 0.6);
      ctx.fillStyle = f ? '#fff' : STEEL; ctx.beginPath(); ctx.moveTo(-40, 10); ctx.lineTo(62, 10); ctx.lineTo(48, 34); ctx.lineTo(-30, 30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d8dde8'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 14, 10); ctx.lineTo(-8 + i * 14, 0); ctx.lineTo(-2 + i * 14, 10); ctx.fill(); }
      ctx.restore();
      // the mouth glows: the reactor shows through when exposed
      ctx.fillStyle = ex ? '#fff4d8' : `rgba(255,154,60,${0.6 + 0.3 * Math.sin(t * 6)})`; A.circle(ctx, 20, 14, ex ? 14 : 7);
      // eye
      ctx.fillStyle = f ? '#fff' : '#0a0c12'; A.ellipse(ctx, 22, -18, 14, 7);
      ctx.fillStyle = ex ? '#fff' : ORANGE; A.ellipse(ctx, 26, -18, 7, 4);
      A.glow(ctx, 26, -18, 18, 'rgba(255,154,60,0.7)');
      ctx.restore();
      if (!ex) { ctx.strokeStyle = 'rgba(111,122,146,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 64, 0, Math.PI * 2); ctx.stroke(); } // the armour field
    },
  };

  // ---------- register it like the other Titans ----------
  GV.TITANS.draconis = DEF;
  GV.TITAN_ORDER.push('draconis');
  GV.titanFor = (sysIdx) => GV.TITAN_ORDER[sysIdx % GV.TITAN_ORDER.length];
  GV.titanAwake = (sysIdx) => Math.floor(sysIdx / GV.TITAN_ORDER.length);
  GV.BOSSES.titan_draconis = {
    w: 110, h: 110, hp: 600, dmg: 30, xp: 600, mem: 200, fly: true, titan: 'draconis',
    spawn(p) { return DEF.core({ t: 0 }, p, false); },
    update(e, p, dt) { p.titanTick(e, dt); },
    draw(ctx, e, P2, t) { const p = GV.game.play || {}; if (p.titan) DEF.drawCore(ctx, e, p.titan, t); },
  };
  GV.BOSS_LORE.titan_draconis = { epithet: DEF.title, talk: DEF.talk, half: [DEF.half], death: [DEF.death] };
  GV.BEASTS.titan_draconis = { name: DEF.name, text: DEF.lore, titan: true };
  // its heart
  const HEART = 'Reactor of the Iron Wyrm';
  GV.UNIQUES.push({ slot: 'relic', name: HEART, tier: 3, quest: true, mods: { dmg: 25, area: 20, life: 50, moveSpd: 8 }, flavor: 'Still warm. It will be warm long after you are not.' });
  // burning ground hurts, and fire burns out
  const tick0 = P.titanTick;
  P.titanTick = function (e, dt) {
    const T0 = this.titan;
    if (T0 && T0.id === 'draconis') for (const f of T0.fx) if (f.k === 'slag' && f.t > 0 && f.t - dt <= 0) this.spawnProj({ x: f.x, y: this.arena.top - 40, vx: 0, vy: 820, r: 12, dmg: T0.core.dmg * 0.7, hostile: true, life: 2, kind: 'orb', color: '#ff6a3a' });
    tick0.call(this, e, dt);
    const T = this.titan;
    if (!T || T.id !== 'draconis') return;
    const ar = this.arena;
    for (const f of T.fx) if (f.k === 'burn') hurtAll(this, (pl) => pl.cx > f.x && pl.cx < f.x + f.w && pl.y + pl.h >= ar.floorY - 6, T.core.dmg * 0.3, f.x + f.w / 2);
    if (T.exposedT > 0) { T.breathing = false; T.hold = null; }
  };
  const down0 = P.onBossDown;
  P.onBossDown = function (b) {
    const r = down0.call(this, b);
    if (b.def && b.def.titan === 'draconis') {
      const d = GV.save.main || GV.save.data;
      if (d.titans && (d.titans.draconis === 1 || Math.random() < 0.35)) {
        const u = GV.UNIQUES.find((x) => x.name === HEART);
        if (u) this.drops.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: 0, vy: -500, w: 14, h: 14, kind: 'item', item: { uid: GV.save.data.uid++, slot: u.slot, rarity: 'unique', tier: u.tier, name: u.name, base: GV.SLOTS[u.slot].bases[u.tier - 1], mods: Object.assign({}, u.mods), flavor: u.flavor }, age: 0 });
      }
    }
    return r;
  };

  // ---------- its exotics ----------
  Object.assign(GV.WEAPONS, {
    wyrmfang: { hand: 'two', name: 'Wyrmfang', exotic: 'draconis', fx: 'wyrmfire', desc: 'Exotic · Draconis. A tooth-blade torn from the Iron Wyrm\'s jaw, still hot. Hits set the ground ablaze under enemies; every fifth hit breathes fire.', cost: 0, dmg: 40, cd: 0.56, range: 122, h: 70, active: 0.15, knock: 460, color: '#ff9a3c', art: 'greatblade' },
    emberjaw: { hand: 'one', name: 'Emberjaw', exotic: 'draconis', fx: 'wyrmfire', desc: 'Exotic · Draconis. Its jaw-cannon, cut down to a hand-cannon. Hits set the ground ablaze under enemies; every fifth hit breathes fire.', cost: 0, dmg: 24, cd: 0.34, range: 60, h: 30, active: 0.09, knock: 260, color: '#ffb36a', art: 'handcannon', gun: true },
  });
  GV.EXOTICS = Object.keys(GV.WEAPONS).filter((k) => GV.WEAPONS[k].exotic);
  const hit0 = GV.Skills.hitEnemy;
  GV.Skills.hitEnemy = function (p, e, s, o = {}) {
    const r = hit0.call(this, p, e, s, o);
    const pl = (s && s.pl) || p.player, W = pl && pl.weapon;
    if (!W || W.fx !== 'wyrmfire' || !s || !s.isAttack || o.fromFx || o.wyrm) return r;
    pl.wyrm = (pl.wyrm || 0) + 1;
    const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
    // a lick of fire on the ground under the target
    if (Math.random() < 0.35) p.burst(ex, e.y + e.h, 10, '#ff9a3c', 160, 0.4, 2.5);
    if (pl.wyrm >= 5) {
      pl.wyrm = 0;
      p.novas.push({ x: ex, y: ey, r: 12, max: 120, t: 0, color: '#ff9a3c' });
      for (const x of p.enemies) if (!x.dead && Math.hypot(x.x + x.w / 2 - ex, x.y + x.h / 2 - ey) < 120) hit0.call(this, p, x, s, { mult: 0.6, fromFx: true, wyrm: true });
      if (GV.audio.play) GV.audio.play('fire', { x: ex });
    }
    return r;
  };

  // ---------- achievement ----------
  GV.ACH.push({ id: 'titanDragon', name: 'Dragonslayer', desc: 'Fell Draconis, the Iron Wyrm', icon: '🐉', mem: 800, test: () => !!((GV.save.main || GV.save.data).titans || {}).draconis });
})();
