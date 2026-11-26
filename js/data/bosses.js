// Galactic Void — bosses. Each waits at the end of a stage's gauntlet, in a sealed arena.
// They are state machines: e.st is the current move, e.tt its timer. Below 50% HP they enrage.
(function () {
  const GV = window.GV, A = GV.art, U = GV.util;
  const go = (e, st, t) => { e.st = st; e.tt = t; e.did = false; };
  const pcx = (p) => p.player.x + p.player.w / 2;
  const pcy = (p) => p.player.y + p.player.h / 2;

  function ring(p, x, y, n, speed, dmg, off = 0) {
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2;
      p.spawnProj({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 8, dmg, hostile: true, life: 4, kind: 'orb' });
    }
  }
  function waves(p, x, y, dmg, spd = 420) {
    for (const s of [-1, 1]) p.spawnProj({ x: x + s * 20, y: y - 12, vx: s * spd, vy: 0, r: 13, dmg, hostile: true, life: 2.2, kind: 'wave' });
  }

  GV.BOSSES = {
    // ---------------- Rift Leviathan: bursts out of the floor where it was warned ----------------
    leviathan: {
      w: 84, h: 84, hp: 520, dmg: 22, xp: 170, mem: 55, fly: true, burrow: true, recover: 'mark',
      spawn(p, A_) { return { x: A_.x + A_.w / 2 - 42, y: A_.floorY + 40 }; },
      update(e, p, dt) {
        const enr = e.hp < e.maxHp * 0.5, ar = p.arena;
        e.tt -= dt;
        e.trail = e.trail || [];
        e.trail.unshift({ x: e.x + e.w / 2, y: e.y + e.h / 2 }); if (e.trail.length > 26) e.trail.pop();
        switch (e.st) {
          case 'intro': e.alpha = 0; e.vx = 0; e.vy = 0; if (e.tt <= 0) go(e, 'mark', 0.1); break;
          case 'mark': {
            e.alpha = 0; e.vx = 0; e.vy = 0;
            e.tx = U.clamp(pcx(p) + (Math.random() - 0.5) * 120, ar.x + 80, ar.x + ar.w - 80);
            e.x = e.tx - e.w / 2; e.y = ar.floorY + 60;
            p.warn({ x: e.tx - 55, y: ar.top, w: 110, h: ar.floorY - ar.top, t: enr ? 0.6 : 0.85 });
            go(e, 'wait', enr ? 0.6 : 0.85);
            break;
          }
          case 'wait': e.alpha = 0; if (e.tt <= 0) { go(e, 'erupt', 1.2); e.alpha = 1; p.shake(12); p.sfx('slam'); } break;
          case 'erupt':
            e.vx = 0; e.vy = -1150;
            if (e.y < ar.top + 40) { e.vy = 0; go(e, 'spit', 1.1); e.shots = 0; e.next = 0; }
            break;
          case 'spit':
            e.vx = 0; e.vy = Math.sin(e.t * 3) * 30;
            e.next -= dt;
            if (e.next <= 0 && e.shots < (enr ? 4 : 3)) {
              e.next = 0.28; e.shots++;
              const cx = e.x + e.w / 2, cy = e.y + e.h / 2, base = Math.atan2(pcy(p) - cy, pcx(p) - cx);
              for (let i = -2; i <= 2; i++) p.spawnProj({ x: cx, y: cy, vx: Math.cos(base + i * 0.16) * 320, vy: Math.sin(base + i * 0.16) * 320, r: 8, dmg: e.dmg, hostile: true, life: 3.5, kind: 'orb' });
              p.sfx('shoot');
            }
            if (e.tt <= 0) { go(e, 'dive', 2); e.dvx = pcx(p) > e.x + e.w / 2 ? 260 : -260; }
            break;
          case 'dive':
            e.vx = e.dvx; e.vy = 950;
            if (e.y > ar.floorY - 10) {
              p.shake(10);
              for (const s of [-1, 1]) p.spawnProj({ x: e.x + e.w / 2 + s * 20, y: ar.floorY - 12, vx: s * 420, vy: 0, r: 13, dmg: e.dmg, hostile: true, life: 2, kind: 'wave' });
              // its head lodges in the rock for a moment: the opening for everyone on the ground
              e.y = ar.floorY - e.h * 0.7; go(e, 'lodged', enr ? 1.2 : 1.7);
            }
            break;
          case 'lodged':
            e.alpha = 1; e.vx = 0; e.vy = 0; e.y = ar.floorY - e.h * 0.7 + Math.sin(e.t * 30) * 1.5;
            if (e.tt <= 0) { e.y = ar.floorY + 60; go(e, 'under', enr ? 0.3 : 0.6); }
            break;
          case 'under': e.alpha = 0; e.vx = 0; e.vy = 0; e.y = ar.floorY + 60; if (e.tt <= 0) go(e, Math.random() < 0.25 ? 'summon' : 'mark', 0.5); break;
          case 'summon':
            e.alpha = 0;
            if (!e.did) { e.did = true; for (let i = 0; i < (enr ? 3 : 2); i++) if (p.enemies.length < 8) p.spawnEnemy('crawler', ar.x + 100 + Math.random() * (ar.w - 200), ar.floorY, true); p.sfx('rift'); }
            if (e.tt <= 0) go(e, 'mark', 0.1);
            break;
        }
      },
      draw(ctx, e, P, t) {
        if (e.alpha === 0) return;
        const f = e.flash > 0, tr = e.trail || [];
        for (let i = tr.length - 1; i >= 1; i -= 2) {
          const r = 26 - i * 0.6;
          if (tr[i].y > (GV.game.play.arena.floorY)) continue;
          ctx.fillStyle = f ? '#fff' : i % 4 === 1 ? '#2a2236' : '#1b1622';
          A.circle(ctx, tr[i].x, tr[i].y, Math.max(6, r));
          ctx.fillStyle = P.accent; A.circle(ctx, tr[i].x, tr[i].y - r * 0.6, 2);
        }
        const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        ctx.fillStyle = f ? '#fff' : '#211a2c'; A.ellipse(ctx, cx, cy, 42, 36);
        ctx.fillStyle = '#000'; A.ellipse(ctx, cx, cy + 12, 26, 14);
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(cx - 24 + i * 8, cy + 2); ctx.lineTo(cx - 20 + i * 8, cy + 14); ctx.lineTo(cx - 16 + i * 8, cy + 2); ctx.fill(); }
        ctx.fillStyle = P.accent; A.circle(ctx, cx - 16, cy - 12, 5); A.circle(ctx, cx + 16, cy - 12, 5);
        A.glow(ctx, cx, cy - 10, 80, A.col(P.hB, 100, 55, 0.4));
      },
    },

    // ---------------- The Pale Choir: five singing heads that can put out the lights ----------------
    choir: {
      w: 90, h: 90, hp: 470, dmg: 19, xp: 170, mem: 55, fly: true,
      spawn(p, A_) { return { x: A_.x + A_.w / 2 - 45, y: A_.floorY - 280 }; },
      update(e, p, dt) {
        const enr = e.hp < e.maxHp * 0.5, ar = p.arena;
        e.tt -= dt;
        const tx = U.clamp(pcx(p) - e.w / 2 + Math.sin(e.t * 0.8) * 220, ar.x + 60, ar.x + ar.w - e.w - 60);
        const k = Math.min(1, dt * 1.6);
        e.vx = (tx - e.x) * k / dt; // It sings high, hovers at jump height, and after a lament or a summon it sinks to the floor, spent:
        // that is the window for anyone without a ranged skill.
        const hy = e.st === 'hymn' ? ar.floorY - 300 : e.st === 'rest' ? ar.floorY - e.h - 6 : ar.floorY - 185;
        e.vy = (hy + (e.st === 'rest' ? 0 : Math.sin(e.t * 1.7) * 22) - e.y) * k / dt;
        const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        switch (e.st) {
          case 'intro': if (e.tt <= 0) go(e, 'idle', 0.8); break;
          case 'idle':
            if (e.tt <= 0) {
              const r = Math.random();
              if (r < 0.35) go(e, 'hymn', 1.4);
              else if (r < 0.65) { go(e, 'lament', 1.6); e.shots = 0; e.next = 0; }
              else if (r < 0.85 && !(p.darkT > 0)) go(e, 'silence', 0.8);
              else go(e, 'summon', 0.8);
            }
            break;
          case 'hymn': // a ring of notes with a gap you have to find
            if (!e.did) {
              e.did = true;
              const gapA = Math.atan2(pcy(p) - cy, pcx(p) - cx) + (Math.random() - 0.5) * 1.2;
              const n = enr ? 26 : 20;
              for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2;
                let da = Math.abs(((a - gapA + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
                if (da < 0.42) continue;
                p.spawnProj({ x: cx, y: cy, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 8, dmg: e.dmg, hostile: true, life: 4, kind: 'orb' });
              }
              p.sfx('skill');
            }
            if (e.tt <= 0) go(e, 'idle', enr ? 0.5 : 0.8);
            break;
          case 'lament': // each head fires in turn
            e.next -= dt;
            if (e.next <= 0 && e.shots < 5) {
              e.next = enr ? 0.16 : 0.24;
              const a = e.t * 1.4 + (e.shots / 5) * Math.PI * 2, hx = cx + Math.cos(a) * 58, hy = cy + Math.sin(a) * 58;
              const d = Math.hypot(pcx(p) - hx, pcy(p) - hy) || 1;
              p.spawnProj({ x: hx, y: hy, vx: (pcx(p) - hx) / d * 360, vy: (pcy(p) - hy) / d * 360, r: 7, dmg: e.dmg, hostile: true, life: 3, kind: 'orb' });
              e.shots++; p.sfx('shoot');
            }
            if (e.tt <= 0) go(e, 'rest', enr ? 1.6 : 2.2);
            break;
          case 'rest': // exhausted: low and quiet
            if (e.tt <= 0) go(e, 'idle', 0.3);
            break;
          case 'silence':
            if (!e.did) { e.did = true; p.darkT = enr ? 4.5 : 3.5; p.toast('The lights go out', 1.6, 'small'); p.sfx('boss'); }
            if (e.tt <= 0) go(e, 'idle', 0.4);
            break;
          case 'summon':
            if (!e.did) { e.did = true; for (let i = 0; i < 2; i++) if (p.enemies.length < 8) p.spawnEnemy('leaper', ar.x + 120 + Math.random() * (ar.w - 240), ar.floorY, true); p.sfx('rift'); }
            if (e.tt <= 0) go(e, 'rest', 1.8);
            break;
        }
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        A.glow(ctx, cx, cy, 110, 'rgba(230,220,255,0.25)');
        ctx.strokeStyle = 'rgba(220,210,240,0.35)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, 58, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = f ? '#fff' : '#0d0b14'; A.circle(ctx, cx, cy, 22);
        ctx.fillStyle = P.accent; A.star(ctx, cx, cy, 9, 5, -t);
        for (let i = 0; i < 5; i++) {
          const a = t * 1.4 + (i / 5) * Math.PI * 2, hx = cx + Math.cos(a) * 58, hy = cy + Math.sin(a) * 58;
          ctx.fillStyle = f ? '#fff' : '#d8d2e4'; A.ellipse(ctx, hx, hy, 11, 14);
          ctx.fillStyle = '#000'; A.ellipse(ctx, hx - 4, hy - 3, 2.5, 3.5); A.ellipse(ctx, hx + 4, hy - 3, 2.5, 3.5);
          const sing = e.st === 'hymn' || e.st === 'lament' ? 4 + Math.sin(t * 20 + i) * 2 : 2;
          A.ellipse(ctx, hx, hy + 6, 3, sing);
        }
      },
    },

    // ---------------- Brood Matron: a ground charger that births crawlers ----------------
    brood: {
      w: 116, h: 78, hp: 420, dmg: 20, xp: 120, mem: 40,
      spawn(p, A_) { return { x: A_.x + A_.w - 220, y: A_.floorY - 78 }; },
      update(e, p, dt) {
        const enr = e.hp < e.maxHp * 0.5, ar = p.arena;
        e.tt -= dt;
        switch (e.st) {
          case 'intro': e.vx = 0; if (e.tt <= 0) go(e, 'idle', 0.6); break;
          case 'idle': {
            e.vx = 0; e.dir = pcx(p) > e.x + e.w / 2 ? 1 : -1;
            if (e.tt <= 0) {
              const r = Math.random();
              if (r < 0.42) go(e, 'chargeWind', enr ? 0.45 : 0.65);
              else if (r < 0.75) go(e, 'leapWind', 0.4);
              else go(e, 'summon', 0.9);
            }
            break;
          }
          case 'chargeWind': e.vx = 0; e.glow = 1; if (e.tt <= 0) { go(e, 'charge', 2.2); p.sfx('dash'); } break;
          case 'charge':
            e.glow = 1; e.vx = e.dir * (enr ? 720 : 600);
            if (e.hitWall) {
              p.shake(11); p.sfx('slam'); e.glow = 0;
              e.charges = (e.charges || 0) + 1;
              if (enr && e.charges < 2) { e.dir *= -1; go(e, 'chargeWind', 0.3); }
              else { e.charges = 0; go(e, 'stun', 0.9); }
            } else if (e.tt <= 0) go(e, 'idle', 0.4);
            break;
          case 'stun': e.vx = 0; e.glow = 0; if (e.tt <= 0) go(e, 'idle', enr ? 0.35 : 0.6); break;
          case 'leapWind':
            e.vx = 0;
            if (e.tt <= 0) {
              const dx = pcx(p) - (e.x + e.w / 2);
              e.vy = -950; e.vx = U.clamp(dx / 0.9, -650, 650); e.onGround = false;
              go(e, 'leap', 3);
            }
            break;
          case 'leap':
            if (e.onGround && e.tt < 2.85) {
              e.vx = 0; p.shake(13); p.sfx('slam');
              waves(p, e.x + e.w / 2, e.y + e.h, e.dmg);
              if (enr) ring(p, e.x + e.w / 2, e.y + 10, 8, 230, e.dmg * 0.8, -Math.PI);
              go(e, 'idle', enr ? 0.45 : 0.75);
            }
            break;
          case 'summon':
            e.vx = 0;
            if (!e.did) {
              e.did = true;
              const n = enr ? 3 : 2;
              for (let i = 0; i < n; i++) if (p.enemies.length < 8) p.spawnEnemy('crawler', U.clamp(e.x + e.w / 2 + (i - 1) * 50, ar.x + 60, ar.x + ar.w - 100), e.y + e.h - 30);
              p.sfx('rift');
            }
            if (e.tt <= 0) go(e, 'idle', 0.5);
            break;
        }
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2, d = e.dir;
        if (e.glow) A.glow(ctx, cx, cy, 110 + Math.sin(t * 30) * 10, A.col(P.hB, 100, 55, 0.45));
        ctx.strokeStyle = f ? '#fff' : '#3d3149'; ctx.lineWidth = 4;
        for (let i = 0; i < 4; i++) {
          const lx = cx - 36 + i * 24, s = Math.sin(t * 10 + i * 2) * 6 * (Math.abs(e.vx) > 10 ? 1 : 0.3);
          A.line(ctx, lx, cy, lx - 14 + s, e.y + e.h + 1); A.line(ctx, lx, cy, lx + 14 + s, e.y + e.h + 1);
        }
        // egg sacs
        for (let i = 0; i < 3; i++) {
          const pulse = 1 + Math.sin(t * 3 + i) * 0.1;
          ctx.fillStyle = f ? '#fff' : A.col(P.hB, 60, 25);
          A.circle(ctx, cx - d * (34 + i * 12), cy - 18 + i * 6, 12 * pulse);
          A.glow(ctx, cx - d * (34 + i * 12), cy - 18 + i * 6, 18, P.accentSoft);
        }
        ctx.fillStyle = f ? '#fff' : '#1b1622'; A.ellipse(ctx, cx, cy, e.w / 2, e.h / 2.1);
        ctx.fillStyle = f ? '#fff' : '#2f2639';
        for (let i = 0; i < 3; i++) A.ellipse(ctx, cx - d * (i * 20 - 10), cy - 12 + i * 2, 18, 10);
        // mandibles & eyes
        ctx.strokeStyle = f ? '#fff' : '#cdc6d6'; ctx.lineWidth = 3;
        const m = Math.sin(t * 8) * 0.25;
        ctx.beginPath(); ctx.moveTo(cx + d * 50, cy + 6); ctx.quadraticCurveTo(cx + d * 72, cy + 2 + m * 20, cx + d * 62, cy + 20); ctx.stroke();
        ctx.fillStyle = P.accent;
        for (let i = 0; i < 6; i++) A.circle(ctx, cx + d * (34 + (i % 3) * 7), cy - 8 + Math.floor(i / 3) * 7, 3);
        A.glow(ctx, cx + d * 40, cy - 4, 34, P.accentSoft);
      },
    },

    // ---------------- Wreck Sentinel: a floating lens that fires volleys and beams ----------------
    sentinel: {
      w: 96, h: 96, hp: 380, dmg: 18, xp: 140, mem: 45, fly: true,
      spawn(p, A_) { return { x: A_.x + A_.w / 2 - 48, y: A_.floorY - 270 }; },
      update(e, p, dt) {
        const enr = e.hp < e.maxHp * 0.5, ar = p.arena;
        e.tt -= dt;
        if (e.tx == null) { e.tx = e.x; e.ty = e.y; }
        const k = Math.min(1, dt * 2.5);
        e.vx = (e.tx - e.x) * k / dt; e.vy = (e.ty + Math.sin(e.t * 2) * 14 - e.y) * k / dt;
        const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        switch (e.st) {
          case 'intro': if (e.tt <= 0) go(e, 'idle', 0.8); break;
          case 'idle':
            e.tx = U.clamp(pcx(p) - e.w / 2 + Math.sin(e.t) * 140, ar.x + 40, ar.x + ar.w - e.w - 40);
            if (e.tt <= 0) {
              const r = Math.random();
              if (r < 0.38) { go(e, 'volley', 1.3); e.shots = 0; e.next = 0; }
              else if (r < 0.7) { go(e, 'beamWarn', 0.85); e.beams = enr ? [pcx(p), ar.x + ar.w - (pcx(p) - ar.x)] : [pcx(p)]; e.beams.forEach((bx) => p.warn({ x: bx - 40, y: ar.top, w: 80, h: ar.floorY - ar.top, t: 0.85 })); }
              else if (r < 0.82) go(e, 'fade', 0.45);
              else if (r < 0.93) { go(e, 'sink', 0.6); p.text(cx, cy - 60, 'CORE EXPOSED', '#ffd36b', 15); }
              else { go(e, 'summon', 0.8); }
            }
            break;
          case 'volley':
            e.next -= dt;
            if (e.next <= 0 && e.shots < 3) {
              e.next = 0.35; e.shots++;
              const n = enr ? 7 : 5, base = Math.atan2(pcy(p) - cy, pcx(p) - cx);
              for (let i = 0; i < n; i++) {
                const a = base + (i - (n - 1) / 2) * 0.2;
                p.spawnProj({ x: cx, y: cy, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 8, dmg: e.dmg, hostile: true, life: 3.5, kind: 'orb' });
              }
              p.sfx('shoot');
            }
            if (e.tt <= 0) go(e, 'idle', enr ? 0.5 : 0.8);
            break;
          case 'beamWarn': if (e.tt <= 0) { go(e, 'beam', 0.45); e.beams.forEach((bx) => p.hazard({ x: bx - 40, y: ar.top, w: 80, h: ar.floorY - ar.top, t: 0.45, dmg: e.dmg * 1.3 })); p.shake(8); p.sfx('slam'); } break;
          case 'beam': if (e.tt <= 0) go(e, 'idle', enr ? 0.5 : 0.8); break;
          case 'fade':
            e.alpha = Math.max(0, e.tt / 0.45);
            if (e.tt <= 0) {
              e.x = pcx(p) < ar.x + ar.w / 2 ? ar.x + ar.w - 180 : ar.x + 80;
              e.tx = e.x; e.y = ar.floorY - 300 + Math.random() * 60; e.ty = e.y;
              go(e, 'appear', 0.4);
            }
            break;
          case 'appear':
            e.alpha = 1 - Math.max(0, e.tt / 0.4);
            if (e.tt <= 0) { e.alpha = 1; ring(p, cx, cy, enr ? 14 : 10, 210, e.dmg, e.t); go(e, 'idle', 0.7); }
            break;
          case 'sink': // drops to the floor, stops firing, and takes extra damage
            e.ty = ar.floorY - e.h - 10; e.exposed = true;
            if (e.tt <= 0) go(e, 'grounded', enr ? 1.8 : 2.6);
            break;
          case 'grounded':
            e.ty = ar.floorY - e.h - 10; e.exposed = true;
            if (e.tt <= 0) { e.exposed = false; e.ty = ar.floorY - 270; go(e, 'idle', 0.4); }
            break;
          case 'summon':
            if (!e.did) { e.did = true; for (let i = 0; i < (enr ? 2 : 1); i++) if (p.enemies.length < 7) p.spawnEnemy('wisp', cx - 15 + i * 30, cy + 40); p.sfx('rift'); }
            if (e.tt <= 0) go(e, 'idle', 0.6);
            break;
        }
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        ctx.save(); ctx.globalAlpha = e.alpha == null ? 1 : e.alpha;
        // dangling cables
        ctx.strokeStyle = A.col(P.hA, 60, 55, 0.5); ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath(); ctx.moveTo(cx - 30 + i * 20, cy + 30);
          ctx.quadraticCurveTo(cx - 30 + i * 20 + Math.sin(t * 2 + i) * 14, cy + 70, cx - 30 + i * 20 + Math.sin(t * 3 + i) * 8, cy + 100 + i * 6); ctx.stroke();
        }
        // hull plates rotating
        for (let i = 0; i < 6; i++) {
          const a = t * 0.6 + (i / 6) * Math.PI * 2;
          ctx.save(); ctx.translate(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40); ctx.rotate(a);
          ctx.fillStyle = f ? '#fff' : i % 2 ? '#2b2f40' : '#3d4258'; ctx.fillRect(-14, -9, 28, 18);
          ctx.fillStyle = P.glow; ctx.fillRect(-10, -1, 4, 2);
          ctx.restore();
        }
        ctx.fillStyle = f ? '#fff' : '#14131b'; A.circle(ctx, cx, cy, 30);
        const lx = U.clamp((pcx(GV.game.play) - cx) * 0.03, -9, 9), ly = U.clamp((pcy(GV.game.play) - cy) * 0.03, -9, 9);
        ctx.fillStyle = P.accent; A.circle(ctx, cx + lx, cy + ly, 15);
        ctx.fillStyle = '#fff'; A.circle(ctx, cx + lx * 1.3, cy + ly * 1.3, 5);
        ctx.restore();
        if ((e.alpha == null ? 1 : e.alpha) > 0.3) A.glow(ctx, cx, cy, 90, A.col(P.hB, 100, 55, 0.35));
      },
    },

    // ---------------- Hollow Warden: a crewman the void hollowed out ----------------
    warden: {
      w: 96, h: 130, hp: 620, dmg: 22, xp: 220, mem: 70, fly: true,
      spawn(p, A_) { return { x: A_.x + A_.w - 260, y: A_.floorY - 230 }; },
      update(e, p, dt) {
        const enr = e.hp < e.maxHp * 0.5, ar = p.arena, spd = enr ? 1.4 : 1;
        e.tt -= dt * spd;
        if (e.hx == null) { e.hx = e.x; e.hy = e.y; }
        const cx = e.x + e.w / 2, cy = e.y + 40;
        const float = (tx, ty, rate) => {
          const k = Math.min(1, dt * rate);
          e.vx = (tx - e.x) * k / dt; e.vy = (ty - e.y) * k / dt;
        };
        switch (e.st) {
          case 'intro': float(e.hx, e.hy, 2); if (e.tt <= 0) go(e, 'idle', 0.7); break;
          case 'idle': {
            float(U.clamp(pcx(p) - e.w / 2 + 180 * Math.sin(e.t * 0.7), ar.x + 40, ar.x + ar.w - e.w - 40), ar.floorY - 250 + Math.sin(e.t * 2) * 20, 2);
            if (e.tt <= 0) {
              const r = Math.random();
              if (r < 0.3) go(e, 'starburst', 1.1);
              else if (r < 0.58) go(e, 'diveRise', 0.8);
              else if (r < 0.82) { const side = pcx(p) < ar.x + ar.w / 2 ? 1 : -1; e.sweepDir = -side; go(e, 'sweepSet', 0.7); }
              else go(e, 'summon', 0.9);
            }
            break;
          }
          case 'starburst':
            float(e.x, e.y, 2);
            if (!e.did) { e.did = true; ring(p, cx, cy, 12, 220, e.dmg, e.t); if (enr) p.delay(0.3, () => { if (!e.dead) ring(p, e.x + e.w / 2, e.y + 40, 12, 260, e.dmg, e.t + 0.26); }); p.sfx('skill'); }
            if (e.tt <= 0) go(e, 'idle', 0.6);
            break;
          case 'diveRise':
            float(U.clamp(pcx(p) - e.w / 2, ar.x + 20, ar.x + ar.w - e.w - 20), ar.top + 10, 4);
            if (e.tt <= 0) { go(e, 'diveWarn', 0.45); p.warn({ x: e.x, y: e.y, w: e.w, h: ar.floorY - e.y, t: 0.45 }); }
            break;
          case 'diveWarn': e.vx = 0; e.vy = 0; if (e.tt <= 0) go(e, 'dive', 2); break;
          case 'dive':
            e.vx = 0; e.vy = 1500;
            if (e.y + e.h >= ar.floorY - 2 || e.tt <= 0) {
              e.y = ar.floorY - e.h; e.vy = 0;
              p.shake(14); p.sfx('slam'); waves(p, e.x + e.w / 2, ar.floorY, e.dmg, 460);
              go(e, 'land', 0.6);
            }
            break;
          case 'land': e.vx = 0; e.vy = 0; if (e.tt <= 0) go(e, 'idle', 0.4); break;
          case 'sweepSet': {
            const tx = e.sweepDir > 0 ? ar.x + 30 : ar.x + ar.w - e.w - 30;
            float(tx, ar.floorY - 150, 5);
            if (e.tt <= 0) { go(e, 'sweepWarn', 0.5); p.warn({ x: ar.x, y: ar.floorY - 150, w: ar.w, h: e.h * 0.7, t: 0.5 }); }
            break;
          }
          case 'sweepWarn': e.vx = 0; e.vy = 0; if (e.tt <= 0) go(e, 'sweep', 2); break;
          case 'sweep':
            e.vy = 0; e.vx = e.sweepDir * 1150;
            // bosses are held 30px off the arena walls, so the sweep ends at that line (or after its time)
            if ((e.sweepDir > 0 && e.x >= ar.x + ar.w - e.w - 34) || (e.sweepDir < 0 && e.x <= ar.x + 34) || e.tt <= 0) { e.vx = 0; go(e, 'idle', 0.5); }
            break;
          case 'summon':
            float(e.x, e.y, 2);
            if (!e.did) {
              e.did = true; p.sfx('rift');
              const n = enr ? 3 : 2;
              for (let i = 0; i < n; i++) if (p.enemies.length < 8) p.spawnEnemy(i % 2 ? 'wisp' : 'leaper', ar.x + 120 + Math.random() * (ar.w - 240), i % 2 ? ar.top + 80 : ar.floorY - 60);
            }
            if (e.tt <= 0) go(e, 'idle', 0.5);
            break;
        }
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, top = e.y;
        // tattered cloak
        ctx.fillStyle = f ? '#fff' : '#121019';
        ctx.beginPath();
        ctx.moveTo(cx - 26, top + 40);
        ctx.lineTo(cx + 26, top + 40);
        for (let i = 0; i <= 8; i++) ctx.lineTo(cx + 40 - i * 10, top + e.h + Math.sin(t * 5 + i) * 6 - (i % 2) * 14);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = A.col(P.hB, 80, 40, 0.5); ctx.lineWidth = 1.5; ctx.stroke();
        // arms
        ctx.strokeStyle = f ? '#fff' : '#cdc6d6'; ctx.lineWidth = 4;
        const sw = Math.sin(t * 3) * 10;
        A.line(ctx, cx - 22, top + 48, cx - 44, top + 80 + sw); A.line(ctx, cx + 22, top + 48, cx + 44, top + 80 - sw);
        // cracked helmet
        ctx.fillStyle = f ? '#fff' : '#c5cad6'; A.circle(ctx, cx, top + 26, 24);
        ctx.fillStyle = '#05040a'; A.ellipse(ctx, cx, top + 28, 18, 15);
        ctx.strokeStyle = '#05040a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - 8, top + 3); ctx.lineTo(cx - 4, top + 12); ctx.lineTo(cx - 12, top + 16); ctx.stroke();
        // the red star face
        ctx.fillStyle = P.accent; A.star(ctx, cx, top + 28, 11, 5, t * 1.5);
        ctx.fillStyle = '#fff'; A.circle(ctx, cx, top + 28, 3);
        A.glow(ctx, cx, top + 28, 70, A.col(P.hB, 100, 55, 0.55));
        if (e.st === 'sweep' || e.st === 'dive') A.glow(ctx, cx, top + e.h / 2, 120, A.col(P.hB, 100, 55, 0.3));
      },
    },
  };
})();

// Boss intro cards and lines. Most bosses only "speak" in short barks under their health bar;
// the Hollow Warden was crew, so he talks to you before the fight the first time.
(function () {
  window.GV.BOSS_LORE = {
    brood: {
      epithet: 'Mother of the Drift',
      half: ['The nest shrieks. Something larger stirs inside it.'],
      death: ['The brood falls silent, all at once.'],
    },
    sentinel: {
      epithet: 'It still guards an empty ship',
      half: ['WARNING: HULL BREACH. LETHAL FORCE AUTHORISED.'],
      death: ['…returning to standby…'],
    },
    leviathan: {
      epithet: 'Swims through stone like water',
      half: ['The ground splits. It is hungrier now.'],
      death: ['The tremors stop. The rock settles over it.'],
    },
    choir: {
      epithet: 'Five voices, one hymn',
      half: ['The hymn breaks into a scream. The lights gutter.'],
      death: ['The last voice holds a note, and lets it go.'],
    },
    warden: {
      epithet: 'He was one of us',
      talk: [
        'You came back for the ship. Of course you did. You always were the stubborn one.',
        'I kept watch for you. Years, out here. The void kept me company. It told me things.',
        'It says you are a memory too. That none of us ever left the horizon.',
        'Let me show you what it showed me.',
      ],
      half: ['Why do you keep fighting? There is nothing left to go home to.'],
      death: ['…thank you. Tell them I held the line.'],
    },
  };
})();

// Biomechanical layer drawn over each boss: plating bolted into flesh, cables, seams and lenses.
(function () {
  const GV = window.GV, A = GV.art, B = A.bio;
  const OVER = {
    brood(ctx, e, P, t) {
      const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2, d = e.dir;
      for (let i = 0; i < 3; i++) B.plate(ctx, cx - d * (i * 20 - 10) - 11, cy - 24 + i * 2, 22, 9, 4, f);
      for (let i = 0; i < 3; i++) B.cable(ctx, cx - d * 18, cy - 8, cx - d * (34 + i * 12), cy - 18 + i * 6, 8, f ? '#fff' : '#0f1219', 2);
      if (!f) B.seam(ctx, [cx - 40, cy + 14, cx - 14, cy + 20, cx + 14, cy + 20, cx + 40, cy + 14], P.accent, t);
      B.veins(ctx, cx - d * 10, cy + 4, 18, 1.4, t, 'rgba(255,120,150,0.6)');
      B.plate(ctx, cx + d * 28 - 9, cy - 16, 18, 10, 3, f);
      B.eye(ctx, cx + d * 46, cy - 6, 5, P.accent, f, P.accentSoft);
    },
    sentinel(ctx, e, P, t) {
      const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      ctx.save(); ctx.globalAlpha = e.alpha == null ? 1 : e.alpha;
      // a ring of grown flesh around the lens, stapled in place
      ctx.strokeStyle = B.flesh(f); ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(cx, cy, 33, 0, Math.PI * 2); ctx.stroke();
      if (!f) {
        ctx.strokeStyle = 'rgba(255,120,150,0.5)'; ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.sin(t) * 0.1; A.line(ctx, cx + Math.cos(a) * 30, cy + Math.sin(a) * 30, cx + Math.cos(a + 0.2) * 36, cy + Math.sin(a + 0.2) * 36); }
        ctx.fillStyle = B.metalL; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; A.circle(ctx, cx + Math.cos(a) * 33, cy + Math.sin(a) * 33, 1.6); }
      }
      // a fleshy tendril trailing beneath it
      ctx.strokeStyle = B.fleshL(f); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy + 34); ctx.quadraticCurveTo(cx + Math.sin(t * 2) * 18, cy + 70, cx + Math.sin(t * 3) * 10, cy + 110); ctx.stroke();
      ctx.restore();
    },
    leviathan(ctx, e, P, t) {
      if (e.alpha === 0) return;
      const f = e.flash > 0, tr = e.trail || [], cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      // armour bands bolted onto the worm's segments
      for (let i = tr.length - 1; i >= 3; i -= 4) {
        if (tr[i].y > GV.game.play.arena.floorY) continue;
        const r = Math.max(6, 26 - i * 0.6);
        B.plate(ctx, tr[i].x - r * 0.8, tr[i].y - r * 0.95, r * 1.6, r * 0.55, 3, f);
      }
      // a riveted jaw plate and a cluster of lenses instead of eyes
      B.plate(ctx, cx - 30, cy - 34, 60, 14, 6, f);
      B.cable(ctx, cx - 38, cy - 4, cx - 22, cy + 22, 6, f ? '#fff' : '#0f1219', 2.5);
      B.cable(ctx, cx + 38, cy - 4, cx + 22, cy + 22, 6, f ? '#fff' : '#0f1219', 2.5);
      B.eye(ctx, cx - 16, cy - 12, 4.5, P.accent, f, P.accentSoft); B.eye(ctx, cx + 16, cy - 12, 4.5, P.accent, f, P.accentSoft);
      B.eye(ctx, cx, cy - 18, 3, P.accent, f);
      if (!f) B.seam(ctx, [cx - 36, cy + 4, cx - 26, cy + 18, cx, cy + 24, cx + 26, cy + 18, cx + 36, cy + 4], P.accent, t);
    },
    choir(ctx, e, P, t) {
      const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      // each singing head is wired back to the core
      for (let i = 0; i < 5; i++) {
        const a = t * 1.4 + (i / 5) * Math.PI * 2, hx = cx + Math.cos(a) * 58, hy = cy + Math.sin(a) * 58;
        B.cable(ctx, cx + Math.cos(a) * 20, cy + Math.sin(a) * 20, hx - Math.cos(a) * 10, hy - Math.sin(a) * 12, 10, f ? '#fff' : 'rgba(40,46,60,0.9)', 2);
        // a metal jaw-brace on every face
        ctx.fillStyle = B.metal(f); A.rrect(ctx, hx - 8, hy + 7, 16, 4, 2);
        ctx.fillStyle = f ? '#fff' : P.accent; A.circle(ctx, hx - 6, hy + 9, 1); A.circle(ctx, hx + 6, hy + 9, 1);
      }
      ctx.strokeStyle = B.metal(f); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = B.metalL; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - t * 0.5; A.circle(ctx, cx + Math.cos(a) * 24, cy + Math.sin(a) * 24, 1.3); }
    },
    warden(ctx, e, P, t) {
      const f = e.flash > 0, cx = e.x + e.w / 2, top = e.y;
      // the void grew into his suit: cables spill from under the cloak, flesh splits the shoulder plates
      for (let i = 0; i < 4; i++) B.cable(ctx, cx - 18 + i * 12, top + 70, cx - 30 + i * 20 + Math.sin(t * 2 + i) * 6, top + e.h + 10, 10, f ? '#fff' : '#0e1118', 2);
      B.plate(ctx, cx - 34, top + 40, 20, 12, 4, f); B.plate(ctx, cx + 14, top + 40, 20, 12, 4, f);
      ctx.fillStyle = B.fleshL(f); A.ellipse(ctx, cx - 24, top + 46, 6, 4); A.ellipse(ctx, cx + 24, top + 46, 6, 4);
      // the crack in the helmet glows like a seam
      if (!f) B.seam(ctx, [cx - 8, top + 3, cx - 4, top + 12, cx - 12, top + 16], P.accent, t);
      B.veins(ctx, cx, top + 56, 16, 1.57, t, 'rgba(255,110,140,0.6)');
    },
  };
  for (const k in OVER) {
    const def = GV.BOSSES[k];
    if (!def || !def.draw) continue;
    const d0 = def.draw;
    def.draw = function (ctx, e, P, t) { d0.call(this, ctx, e, P, t); try { OVER[k](ctx, e, P, t); } catch (err) {} };
  }
})();
