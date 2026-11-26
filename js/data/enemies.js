// Galactic Void — enemy roster. Each entry owns its stats, its AI (update) and its look (draw).
// update(e, play, dt) is called with `this` = the definition. Ground enemies get gravity and
// collision from the play scene; `fly: true` enemies move freely.
(function () {
  const GV = window.GV, A = GV.art;

  const face = (e, p) => ((p.player.x + p.player.w / 2) > (e.x + e.w / 2) ? 1 : -1);

  GV.ENEMIES = {
    // ---- later-system families ----
    jelly: {
      name: 'Void Jelly', w: 40, h: 40, hp: 48, dmg: 14, xp: 9, mem: 2, fly: true,
      update(e, p, dt) {
        const pl = p.player, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        const dx = pl.x + pl.w / 2 - cx, dy = pl.y + 10 - cy, d = Math.hypot(dx, dy) || 1;
        const sp = 70 * e.spd;
        e.vx += ((dx / d) * sp - e.vx) * Math.min(1, dt * 1.5);
        e.vy += ((dy / d) * sp + Math.sin(e.t * 2) * 30 - e.vy) * Math.min(1, dt * 1.5);
        e.cd -= dt;
        if (e.pulse > 0) {
          e.pulse -= dt;
          if (e.pulse <= 0) {
            p.novas.push({ x: cx, y: cy, r: 10, max: 120, t: 0, color: '#c79bff' });
            if (d < 125) p.damagePlayer(e.dmg * 1.3, cx);
            e.cd = 3 + Math.random();
          }
        } else if (e.cd <= 0 && d < 160) { e.pulse = 0.7; p.warn({ x: cx - 120, y: cy - 120, w: 240, h: 240, t: 0.7 }); }
        e.dir = dx > 0 ? 1 : -1;
      },
      draw(ctx, e, P, t) {
        // A translucent bell of tissue around a reactor core, with cable tendrils.
        const B = A.bio, cx = e.x + e.w / 2, cy = e.y + e.h / 2, f = e.flash > 0, pu = e.pulse > 0 ? 1 + (0.7 - e.pulse) * 0.5 : 1 + Math.sin(e.t * 3) * 0.06;
        A.glow(ctx, cx, cy, 44 * pu, 'rgba(180,110,255,0.45)');
        for (let i = 0; i < 5; i++) {
          const x0 = cx - 14 + i * 7;
          B.cable(ctx, x0, cy + 4, x0 + Math.sin(e.t * 4 + i) * 6, cy + 28 + (i % 2) * 6, Math.sin(e.t * 3 + i) * 5, f ? '#fff' : (i % 2 ? '#2c3442' : 'rgba(200,150,255,0.7)'), i % 2 ? 2 : 1.3);
        }
        ctx.fillStyle = f ? '#fff' : 'rgba(150,100,230,0.5)';
        ctx.beginPath(); ctx.arc(cx, cy, 20 * pu, Math.PI, 0);
        for (let i = 0; i <= 6; i++) ctx.lineTo(cx + 20 * pu - i * (40 * pu / 6), cy + 6 + Math.sin(e.t * 6 + i) * 4);
        ctx.closePath(); ctx.fill();
        // ribbed metal band and the core inside
        ctx.strokeStyle = f ? '#fff' : '#3a4558'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cx, cy, 15 * pu, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        ctx.fillStyle = f ? '#fff' : '#ff9ad8'; A.circle(ctx, cx, cy - 4, 5 * pu);
        A.glow(ctx, cx, cy - 4, 16, 'rgba(255,150,220,0.6)');
        B.eye(ctx, cx, cy - 4, 2.2, '#ffffff', f);
      },
    },
    sentry: {
      name: 'Shielded Sentry', w: 40, h: 46, hp: 70, dmg: 13, xp: 11, mem: 2, shield: true, heavy: true,
      update(e, p, dt) {
        const pl = p.player, dx = pl.x + pl.w / 2 - (e.x + e.w / 2);
        e.vx = 0;
        e.turn = (e.turn || 0) - dt;
        if (e.turn <= 0) { e.dir = dx > 0 ? 1 : -1; e.turn = 1.4; }
        e.cd -= dt;
        if (e.cd <= 0 && Math.abs(dx) < 560 && Math.abs(pl.y - e.y) < 90 && Math.sign(dx) === e.dir) {
          e.cd = 1.9;
          p.spawnProj({ x: e.x + e.w / 2 + e.dir * 22, y: e.y + 16, vx: e.dir * 520, vy: 0, r: 6, dmg: e.dmg, hostile: true, life: 1.4, kind: 'orb' });
          p.sfx('shoot');
        }
      },
      draw(ctx, e, P) {
        // A grafted guard: armoured torso on flesh legs, a hard-light shield projected from a forearm.
        const B = A.bio, f = e.flash > 0, cx = e.x + e.w / 2, by = e.y + e.h, d = e.dir;
        ctx.fillStyle = B.fleshD(f); A.rrect(ctx, cx - 11, by - 14, 9, 14, 3); A.rrect(ctx, cx + 2, by - 14, 9, 14, 3);
        B.plate(ctx, cx - 14, by - 12, 28, 5, 2, f);
        ctx.fillStyle = B.flesh(f); A.rrect(ctx, cx - 12, by - 40, 24, 30, 7);
        B.plate(ctx, cx - 10, by - 42, 20, 20, 5, f);
        B.cable(ctx, cx - d * 10, by - 24, cx + d * 12, by - 30, 6, '#0f1219', 2);
        B.eye(ctx, cx + d * 5, by - 33, 2.6, P.accent, f, P.accentSoft);
        if (!f) B.seam(ctx, [cx - 10, by - 21, cx, by - 19, cx + 10, by - 21], P.accent, e.t);
        // the shield faces where the sentry is looking
        ctx.strokeStyle = f ? '#fff' : 'rgba(170,220,255,0.9)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cx, by - 24, 26, d > 0 ? -1 : Math.PI - 1, d > 0 ? 1 : Math.PI + 1); ctx.stroke();
        ctx.strokeStyle = 'rgba(170,220,255,0.35)'; ctx.lineWidth = 1;
        for (let i = -2; i <= 2; i++) { const a = (d > 0 ? 0 : Math.PI) + i * 0.38; A.line(ctx, cx + Math.cos(a) * 20, by - 24 + Math.sin(a) * 20, cx + Math.cos(a) * 28, by - 24 + Math.sin(a) * 28); }
        A.glow(ctx, cx + d * 24, by - 24, 26, 'rgba(140,210,255,0.4)');
      },
    },
    mimic: {
      name: 'Cache Mimic', w: 36, h: 36, hp: 90, dmg: 18, xp: 16, mem: 14,
      update(e, p, dt) {
        const pl = p.player, dx = pl.x + pl.w / 2 - (e.x + e.w / 2);
        if (!e.awake) { e.vx = 0; if (Math.abs(dx) < 130 && Math.abs(pl.y - e.y) < 120) { e.awake = true; p.text(e.x + e.w / 2, e.y - 10, 'IT WAS A MIMIC', '#ff8a98', 15); p.shake(5); e.cd = 0.3; } return; }
        e.cd -= dt;
        if (e.onGround) {
          e.vx *= Math.max(0, 1 - dt * 8);
          if (e.cd <= 0) { e.dir = dx > 0 ? 1 : -1; e.vy = -560; e.vx = e.dir * Math.min(380, Math.abs(dx) * 1.3 + 80) * e.spd; e.cd = 0.8; e.onGround = false; }
        }
      },
      draw(ctx, e, P, t) {
        const B = A.bio, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        if (!e.awake && e.flash <= 0) {
          A.memory(ctx, cx, cy, t, P, true);
          // a careful eye can spot it: a faint seam and a twitch
          if (Math.sin(t * 1.3) > 0.97) B.seam(ctx, [cx - 6, cy + 9, cx + 6, cy + 9], 'rgba(255,90,120,0.7)', t);
          return;
        }
        // a memory cache that is really a jaw: steel lid, flesh tongue, needle teeth
        const f = e.flash > 0, open = Math.abs(Math.sin(e.t * 10)) * 8;
        B.plate(ctx, cx - 18, cy - 14 - open / 2, 36, 14, 4, f);
        B.plate(ctx, cx - 18, cy + open / 2, 36, 14, 4, f);
        ctx.fillStyle = B.fleshL(f); A.ellipse(ctx, cx, cy, 13, open / 2 + 1);
        ctx.fillStyle = '#e8e2ef';
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(cx - 15 + i * 7, cy - open / 2); ctx.lineTo(cx - 12 + i * 7, cy + 5 - open / 2); ctx.lineTo(cx - 9 + i * 7, cy - open / 2); ctx.fill(); }
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - 12 + i * 7, cy + open / 2); ctx.lineTo(cx - 9 + i * 7, cy - 4 + open / 2); ctx.lineTo(cx - 6 + i * 7, cy + open / 2); ctx.fill(); }
        B.eye(ctx, cx - 8, cy - 8 - open / 2, 2.2, P.accent, f); B.eye(ctx, cx + 8, cy - 8 - open / 2, 2.2, P.accent, f);
        A.memory(ctx, cx, cy - 22 - open / 2, t, P, false);
        A.glow(ctx, cx, cy, 34, P.accentSoft);
      },
    },

    crawler: {
      name: 'Rift Crawler', w: 38, h: 22, hp: 26, dmg: 12, speed: 115, xp: 5, mem: 1,
      update(e, p, dt) {
        const pl = p.player;
        const dx = pl.x + pl.w / 2 - (e.x + e.w / 2);
        const chase = Math.abs(dx) < 460 && Math.abs(pl.y - e.y) < 180;
        if (chase) e.dir = dx > 0 ? 1 : -1;
        let sp = this.speed * (chase ? 1.35 : 1) * e.spd;
        if (e.onGround && !p.groundAhead(e)) { if (chase) sp = 0; else e.dir *= -1; }
        if (e.hitWall) e.dir *= -1;
        e.vx = e.dir * sp;
      },
      draw(ctx, e, P) {
        // A tick-like body of wet flesh riding on six piston legs, a sensor cluster for a face.
        const B = A.bio, cx = e.x + e.w / 2, cy = e.y + e.h / 2 + 1, f = e.flash > 0, d = e.dir;
        for (let i = 0; i < 3; i++) {
          const lx = cx - 10 + i * 10, s = Math.sin(e.t * 16 + i * 2) * 4;
          B.leg(ctx, lx, cy, lx - 6 + s, cy - 6, lx - 8 + s, e.y + e.h + 1, f, 2);
          B.leg(ctx, lx, cy, lx + 6 + s, cy - 6, lx + 8 + s, e.y + e.h + 1, f, 2);
        }
        ctx.fillStyle = B.fleshD(f); A.ellipse(ctx, cx, cy, e.w / 2, e.h / 2.1);
        ctx.fillStyle = B.flesh(f); A.ellipse(ctx, cx - 2 * d, cy - 2, e.w / 2.4, e.h / 2.8);
        B.plate(ctx, cx - d * 12 - 7, cy - e.h / 2.2, 14, 7, 3, f);
        B.cable(ctx, cx - d * 8, cy - 4, cx + d * 6, cy - 6, 4, '#12151d', 1.5);
        if (!f) B.seam(ctx, [cx - d * 4, cy + 4, cx + d * 2, cy + 1, cx + d * 8, cy + 3], P.accent, e.t);
        B.eye(ctx, cx + d * 12, cy - 1, 2.4, P.accent, f, P.accentSoft);
        B.eye(ctx, cx + d * 7, cy - 4, 1.6, P.accent, f);
      },
    },

    leaper: {
      name: 'Pale Leaper', w: 30, h: 42, hp: 34, dmg: 14, xp: 7, mem: 1,
      update(e, p, dt) {
        const pl = p.player, dx = pl.x + pl.w / 2 - (e.x + e.w / 2);
        e.cd -= dt;
        if (e.onGround) {
          e.vx *= Math.max(0, 1 - dt * 10);
          if (e.crouch > 0) {
            e.crouch -= dt; e.vx = 0;
            if (e.crouch <= 0) { e.vy = -640; e.vx = e.dir * Math.min(330, Math.abs(dx) * 1.1 + 60) * e.spd; e.onGround = false; }
          } else if (e.cd <= 0 && Math.abs(dx) < 540) {
            e.dir = dx > 0 ? 1 : -1; e.crouch = 0.28; e.cd = 1.1 + Math.random() * 0.7;
          }
        }
      },
      draw(ctx, e, P) {
        // A gaunt pale thing on hydraulic hind legs; a cracked visor-face with a red slit.
        const B = A.bio, f = e.flash > 0, cx = e.x + e.w / 2, by = e.y + e.h;
        const cr = e.crouch > 0 ? 8 : 0;
        ctx.save(); ctx.translate(cx, by); ctx.scale(e.dir, 1);
        B.leg(ctx, -4, -16 + cr * 0.5, -12, -8 + cr * 0.3, -8, 0, f, 3);
        B.leg(ctx, 5, -16 + cr * 0.5, 12, -9 + cr * 0.3, 9, 0, f, 3);
        ctx.fillStyle = f ? '#fff' : '#b9aec4';
        ctx.beginPath(); ctx.moveTo(-8, -14 + cr); ctx.quadraticCurveTo(-11, -36 + cr, 4, -38 + cr); ctx.lineTo(9, -16 + cr); ctx.closePath(); ctx.fill();
        // ribs of metal across the chest
        if (!f) { ctx.strokeStyle = '#38404f'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) A.line(ctx, -6 + i, -30 + cr + i * 5, 6 + i, -32 + cr + i * 5); }
        B.cable(ctx, -6, -18 + cr, 2, -34 + cr, -6, '#2a1820', 1.5);
        ctx.strokeStyle = f ? '#fff' : '#9a8fa6'; ctx.lineWidth = 2.5; A.line(ctx, 4, -32 + cr, 15, -14 + cr);
        ctx.fillStyle = f ? '#fff' : '#d7cfe0'; A.circle(ctx, 15, -13 + cr, 2.2);
        // head: half skull, half visor
        ctx.fillStyle = f ? '#fff' : '#cdc6d6'; A.circle(ctx, 8, -38 + cr, 7);
        B.plate(ctx, 6, -45 + cr, 9, 13, 3, f);
        ctx.fillStyle = f ? '#fff' : P.accent; ctx.fillRect(7, -40 + cr, 7, 2);
        ctx.fillStyle = '#000'; A.ellipse(ctx, 4, -38 + cr, 1.8, 2.6);
        ctx.restore();
        A.glow(ctx, cx + e.dir * 10, e.y + 10, 16, P.accentSoft);
      },
    },

    wisp: {
      name: 'Void Wisp', w: 30, h: 30, hp: 22, dmg: 10, xp: 7, mem: 1, fly: true,
      update(e, p, dt) {
        const pl = p.player;
        const tx = pl.x + pl.w / 2 + Math.sin(e.t * 0.9 + e.seed) * 170;
        const ty = pl.y - 120 + Math.sin(e.t * 2.1 + e.seed) * 30;
        const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        const k = Math.min(1, dt * 2);
        e.vx += ((tx - cx) * 1.6 - e.vx) * k;
        e.vy += ((ty - cy) * 1.6 - e.vy) * k;
        const sp = 175 * e.spd, m = Math.hypot(e.vx, e.vy);
        if (m > sp) { e.vx *= sp / m; e.vy *= sp / m; }
        e.dir = face(e, p);
        e.cd -= dt;
        const ddx = pl.x + pl.w / 2 - cx, ddy = pl.y + 20 - cy, d = Math.hypot(ddx, ddy);
        if (e.cd <= 0 && d < 520) {
          e.cd = 2.3 + Math.random();
          p.spawnProj({ x: cx, y: cy, vx: (ddx / d) * 250, vy: (ddy / d) * 250, r: 7, dmg: e.dmg, hostile: true, life: 3, kind: 'orb' });
          p.sfx('shoot');
        }
      },
      draw(ctx, e, P) {
        // A drifting nerve-cluster held inside a broken drone frame; trailing synapse threads.
        const B = A.bio, cx = e.x + e.w / 2, cy = e.y + e.h / 2, f = e.flash > 0, t = e.t;
        A.glow(ctx, cx, cy, 34, A.col(P.hB, 100, 50, 0.4));
        ctx.strokeStyle = f ? '#fff' : 'rgba(200,215,255,0.45)'; ctx.lineWidth = 1.2;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - 6 + i * 4, cy + 6); ctx.quadraticCurveTo(cx - 6 + i * 4 + Math.sin(t * 6 + i) * 6, cy + 14, cx - 8 + i * 5 + Math.sin(t * 4 + i) * 4, cy + 22); ctx.stroke(); }
        ctx.fillStyle = f ? '#fff' : 'rgba(210,170,200,0.55)'; A.circle(ctx, cx, cy, 10 + Math.sin(t * 5) * 1);
        B.veins(ctx, cx, cy, 9, -1.2, t, 'rgba(255,160,200,0.8)');
        // the frame: two arcs of plating that slowly rotate around the cluster
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.8);
        ctx.strokeStyle = f ? '#fff' : '#3a4558'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 15, 0.3, 1.9); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 15, 3.4, 5.0); ctx.stroke();
        ctx.fillStyle = f ? '#fff' : B.metalL; A.circle(ctx, 15 * Math.cos(1.1), 15 * Math.sin(1.1), 1.6); A.circle(ctx, 15 * Math.cos(4.2), 15 * Math.sin(4.2), 1.6);
        ctx.restore();
        B.eye(ctx, cx, cy - 1, 4.2, P.accent, f, P.accentSoft);
      },
    },

    brute: {
      name: 'Husk Brute', w: 58, h: 64, hp: 110, dmg: 22, xp: 20, mem: 4, speed: 70, heavy: true,
      update(e, p, dt) {
        const pl = p.player, dx = pl.x + pl.w / 2 - (e.x + e.w / 2);
        e.cd -= dt;
        if (e.wind > 0) {
          e.wind -= dt; e.vx = 0;
          if (e.wind <= 0) {
            p.shake(7); p.sfx('slam');
            for (const s of [-1, 1]) p.spawnProj({ x: e.x + e.w / 2 + s * 30, y: e.y + e.h - 12, vx: s * 380, vy: 0, r: 12, dmg: e.dmg, hostile: true, life: 1.1, kind: 'wave' });
            e.cd = 2.2;
          }
          return;
        }
        if (Math.abs(dx) < 140 && Math.abs(pl.y - e.y) < 120 && e.cd <= 0 && e.onGround) { e.wind = 0.6; return; }
        e.dir = dx > 0 ? 1 : -1;
        let sp = this.speed * e.spd;
        if (e.onGround && !p.groundAhead(e)) sp = 0;
        e.vx = e.dir * sp;
      },
      draw(ctx, e, P) {
        // A hulking flesh-engine: a slab of muscle bolted into a furnace chassis, a ram arm.
        const B = A.bio, f = e.flash > 0, cx = e.x + e.w / 2, by = e.y + e.h, d = e.dir;
        const step = Math.sin(e.t * 6) * 3;
        B.plate(ctx, cx - 19, by - 18, 13, 18 + step * 0.3, 3, f); B.plate(ctx, cx + 6, by - 18, 13, 18 - step * 0.3, 3, f);
        ctx.fillStyle = B.fleshD(f); A.rrect(ctx, cx - 26, by - 58, 52, 44, 14);
        ctx.fillStyle = B.flesh(f); A.rrect(ctx, cx - 20, by - 52, 40, 30, 12);
        B.veins(ctx, cx - 8, by - 40, 12, 2.6, e.t, 'rgba(255,120,150,0.7)');
        // furnace chest plate with a vent that glows when winding up
        B.plate(ctx, cx - 12, by - 50, 24, 22, 5, f);
        const hot = e.wind > 0 ? 1 : 0.45;
        ctx.globalAlpha = hot; ctx.fillStyle = P.accent;
        for (let i = 0; i < 3; i++) ctx.fillRect(cx - 8, by - 46 + i * 6, 16, 2);
        ctx.globalAlpha = 1;
        B.plate(ctx, cx - 31, by - 62, 22, 16, 6, f); B.plate(ctx, cx + 9, by - 62, 22, 16, 6, f);
        B.cable(ctx, cx - 22, by - 48, cx - 14, by - 22, 6, '#0f1219', 2.5);
        B.cable(ctx, cx + 22, by - 48, cx + 14, by - 22, 6, '#0f1219', 2.5);
        // head sunk between the shoulders
        ctx.fillStyle = B.fleshD(f); A.circle(ctx, cx + d * 8, by - 60, 10);
        B.eye(ctx, cx + d * 12, by - 61, 2.6, P.accent, f, P.accentSoft);
        if (e.wind > 0) A.glow(ctx, cx, by - 30, 60, A.col(P.hB, 100, 55, 0.5));
        // the ram arm: piston and flesh
        const arm = e.wind > 0 ? -18 : 0;
        B.plate(ctx, cx + d * 26 - 7, by - 50 + arm, 14, 18, 5, f);
        ctx.fillStyle = B.flesh(f); A.rrect(ctx, cx + d * 26 - 6, by - 34 + arm, 12, 16, 5);
      },
    },
  };
})();
