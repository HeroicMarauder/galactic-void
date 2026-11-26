// Galactic Void — anomalies. Mid-stage, reality sometimes breaks. Three kinds of anomaly roll at
// random: a unique Anomalous creature appears, a zone of broken physics opens, or an event
// rewrites the stage (Rift Tear, Doppelgänger, Déjà Vu). Rarely, the boss itself is replaced by
// The Aberrance. Anomalies drop Anomaly Shards, which twist an item with a powerful modifier.
(function () {
  const GV = window.GV, U = GV.util, A = GV.art, B = A.bio, C = GV.CFG, P = GV.Play.prototype;
  const MAG = '#ff4fd8', CYAN = '#4ff3ff', MAG_SOFT = 'rgba(255,79,216,0.45)';

  // ---------- glitch drawing helpers ----------
  // Draw something three times with a colour split, like a corrupted signal.
  function glitch(ctx, t, amt, fn) {
    const j = Math.sin(t * 37) > 0.7 ? amt * 2.5 : amt;
    ctx.save(); ctx.globalAlpha = 0.35; ctx.translate(-j, 0); ctx.globalCompositeOperation = 'lighter'; fn('#ff3b8f'); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.35; ctx.translate(j, 0); ctx.globalCompositeOperation = 'lighter'; fn('#3bd8ff'); ctx.restore();
    fn(null);
  }
  A.glitch = glitch;

  // ---------- unique Anomalous creatures ----------
  const near = (p, e, r) => p.players.filter((pl) => !pl.dead && Math.hypot(pl.cx - (e.x + e.w / 2), pl.cy - (e.y + e.h / 2)) < r);
  const ANOM = {
    stutter: {
      name: 'The Stutter', anomaly: true, w: 30, h: 76, hp: 210, dmg: 24, xp: 60, mem: 8,
      lore: 'It moves the way a bad recording plays. Between one frame and the next, it is somewhere else, and closer.',
      update(e, p, dt) {
        const pl = p.player, dx = pl.cx - (e.x + e.w / 2);
        e.dir = dx > 0 ? 1 : -1;
        e.cd -= dt;
        if (e.skip > 0) {
          e.skip -= dt;
          if (e.skip <= 0) {
            p.burst(e.x + e.w / 2, e.y + e.h / 2, 20, MAG, 200, 0.4, 2.5);
            e.x += e.dir * Math.min(150, Math.abs(dx) - 30);
            p.burst(e.x + e.w / 2, e.y + e.h / 2, 20, CYAN, 200, 0.4, 2.5);
            e.swipe = 0.3; p.sfx('rift');
          }
        } else if (e.swipe > 0) {
          e.swipe -= dt;
          if (e.swipe <= 0) { for (const t of near(p, e, 70)) { p.player = t; p.damagePlayer(e.dmg, e.x + e.w / 2); } p.player = pl; }
        } else if (e.cd <= 0) {
          e.cd = 1.5 + Math.random() * 0.6; e.skip = 0.45;
          p.warn({ x: e.x + e.dir * 120 - 10, y: e.y, w: e.w + 20, h: e.h, t: 0.45 });
        } else e.vx = e.dir * 60 * e.spd;
        if (e.skip > 0 || e.swipe > 0) e.vx = 0;
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, by = e.y + e.h;
        glitch(ctx, t, 2, (tint) => {
          // a tall figure cut into horizontal slices that don't line up
          for (let i = 0; i < 7; i++) {
            const y0 = e.y + i * (e.h / 7), off = Math.sin(t * 13 + i * 2.1) * (i % 2 ? 5 : 3) * (Math.sin(t * 3) > 0 ? 1 : 0.3);
            ctx.fillStyle = tint || (f ? '#fff' : i === 1 ? '#d9d3e4' : i < 3 ? '#283140' : B.flesh(false));
            const w = i === 0 ? 14 : i < 3 ? 18 : 12 + (i % 2) * 6;
            ctx.fillRect(cx - w / 2 + off, y0, w, e.h / 7 - 1);
          }
          if (!tint) { ctx.fillStyle = MAG; ctx.fillRect(cx - 5 + Math.sin(t * 13) * 3, e.y + 5, 10, 2); }
        });
        if (e.skip > 0) A.glow(ctx, cx + e.dir * 120, by - 38, 40, MAG_SOFT);
        if (e.swipe > 0) { ctx.strokeStyle = MAG; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, by - 40, 46, e.dir > 0 ? -1 : Math.PI - 1, e.dir > 0 ? 1 : Math.PI + 1); ctx.stroke(); }
      },
    },
    recursion: {
      name: 'Recursion', anomaly: true, w: 46, h: 30, hp: 150, dmg: 16, xp: 40, mem: 5,
      lore: 'Kill it and it is still there, only smaller. Kill that, and it is still there. We stopped counting.',
      update(e, p, dt) {
        const pl = p.player, dx = pl.cx - (e.x + e.w / 2);
        e.dir = dx > 0 ? 1 : -1;
        e.vx = e.dir * (110 + (e.gen || 0) * 50) * e.spd;
        e.cd -= dt;
        if (e.cd <= 0 && e.onGround && Math.abs(dx) < 220) { e.cd = 1.4; e.vy = -420; }
      },
      onDeath(p, e) {
        if ((e.gen || 0) >= 2) return;
        for (const s of [-1, 1]) {
          const c = p.spawnEnemy('recursion', e.x + e.w / 2 + s * 10, e.y + e.h, true);
          c.gen = (e.gen || 0) + 1; c.w = e.w * 0.72; c.h = e.h * 0.72; c.x = e.x + e.w / 2 + s * 10 - c.w / 2; c.y = e.y + e.h - c.h;
          c.hp = c.maxHp = e.maxHp * 0.45; c.vx = s * 260; c.vy = -300; c.dmg = e.dmg * 0.75; c.noShard = true;
        }
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2, s = e.w / 46;
        glitch(ctx, t, 1.5, (tint) => {
          // a crawler made of crawlers: each shell holds a smaller one
          for (let k = 0; k < 3; k++) {
            const sc = s * Math.pow(0.6, k), rot = Math.sin(t * 2 + k) * 0.2 * (k % 2 ? -1 : 1);
            ctx.save(); ctx.translate(cx, cy + k * 2 * s); ctx.rotate(rot);
            ctx.fillStyle = tint || (f ? '#fff' : k === 0 ? B.fleshD(false) : k === 1 ? '#283140' : B.flesh(false));
            ctx.beginPath(); ctx.moveTo(-23 * sc, 10 * sc); ctx.lineTo(0, -15 * sc); ctx.lineTo(23 * sc, 10 * sc); ctx.closePath(); ctx.fill();
            ctx.restore();
          }
          if (!tint) {
            ctx.strokeStyle = f ? '#fff' : '#2c3442'; ctx.lineWidth = 2 * s;
            for (let i = 0; i < 3; i++) { const lx = cx - 12 * s + i * 12 * s; A.line(ctx, lx, cy + 6 * s, lx + Math.sin(t * 14 + i) * 5 * s, e.y + e.h); }
            B.eye(ctx, cx + e.dir * 9 * s, cy - 2 * s, 2.5 * s, MAG, f);
          }
        });
      },
    },
    nullsaint: {
      name: 'Null Saint', anomaly: true, fly: true, w: 40, h: 60, hp: 230, dmg: 18, xp: 60, mem: 8, aura: 170,
      lore: 'Where it hovers, nothing you were taught works. Only your hands do.',
      update(e, p, dt) {
        const pl = p.player, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        const tx = pl.cx + Math.sin(e.t * 0.7) * 120, ty = pl.y - 110;
        e.vx += ((tx - cx) * 0.9 - e.vx) * Math.min(1, dt * 1.2);
        e.vy += ((ty - cy) * 0.9 - e.vy) * Math.min(1, dt * 1.2);
        for (const t of near(p, e, this.aura)) t.nullT = 0.2;
        e.cd -= dt;
        if (e.cd <= 0) {
          e.cd = 2.2;
          const a = Math.atan2(pl.cy - cy, pl.cx - cx);
          for (const da of [-0.25, 0, 0.25]) p.spawnProj({ x: cx, y: cy, vx: Math.cos(a + da) * 180, vy: Math.sin(a + da) * 180, r: 7, hostile: true, dmg: e.dmg, life: 4, t: 0, color: MAG });
        }
        e.dir = pl.cx > cx ? 1 : -1;
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        // the null aura: a dark disc with a slowly turning broken ring
        ctx.fillStyle = 'rgba(0,0,0,0.28)'; A.circle(ctx, cx, cy, this.aura);
        ctx.strokeStyle = 'rgba(255,79,216,0.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([10, 14]);
        ctx.beginPath(); ctx.arc(cx, cy, this.aura, t * 0.3, t * 0.3 + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        glitch(ctx, t, 1.5, (tint) => {
          // a robed figure with no face, a black halo, hands of wire
          ctx.fillStyle = tint || (f ? '#fff' : '#e8e3ef');
          ctx.beginPath(); ctx.moveTo(cx, e.y + 14); ctx.lineTo(cx + 16, e.y + e.h); ctx.lineTo(cx - 16, e.y + e.h); ctx.closePath(); ctx.fill();
          ctx.fillStyle = tint || (f ? '#fff' : '#05060a'); A.circle(ctx, cx, e.y + 12, 9);
          if (!tint) {
            ctx.strokeStyle = '#05060a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, e.y + 6, 15, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
            B.cable(ctx, cx - 10, e.y + 28, cx - 22, e.y + 44 + Math.sin(t * 3) * 4, 4, '#2c3442', 1.5);
            B.cable(ctx, cx + 10, e.y + 28, cx + 22, e.y + 44 + Math.cos(t * 3) * 4, 4, '#2c3442', 1.5);
            B.seam(ctx, [cx - 8, e.y + 34, cx, e.y + 40, cx + 8, e.y + 34], MAG, t);
          }
        });
      },
    },
    echohound: {
      name: 'Echo Hound', anomaly: true, w: 44, h: 28, hp: 170, dmg: 20, xp: 45, mem: 6,
      lore: 'It runs the same path twice: once alive, and once after.',
      update(e, p, dt) {
        const pl = p.player, dx = pl.cx - (e.x + e.w / 2);
        e.dir = dx > 0 ? 1 : -1;
        e.vx += (e.dir * 230 * e.spd - e.vx) * Math.min(1, dt * 3);
        e.path = e.path || [];
        e.pathT = (e.pathT || 0) - dt;
        if (e.pathT <= 0) { e.pathT = 0.05; e.path.push({ x: e.x, y: e.y, dir: e.dir }); if (e.path.length > 60) e.path.shift(); }
        e.cd -= dt;
        if (e.cd <= 0 && e.onGround && Math.abs(dx) < 260) { e.cd = 1.8; e.vy = -380; e.vx = e.dir * 420; }
      },
      onDeath(p, e) {
        if (!e.path || e.path.length < 5) return;
        const g = p.spawnEnemy('echoghost', e.x + e.w / 2, e.y + e.h, true);
        g.path = e.path.slice(); g.w = e.w; g.h = e.h; g.dmg = e.dmg;
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, by = e.y + e.h, d = e.dir;
        // afterimages of where it has just been
        for (let i = 1; i <= 3; i++) { const pt = e.path && e.path[e.path.length - 1 - i * 4]; if (pt) { ctx.globalAlpha = 0.12; ctx.fillStyle = CYAN; A.ellipse(ctx, pt.x + e.w / 2, pt.y + e.h / 2, 20, 10); } }
        ctx.globalAlpha = 1;
        glitch(ctx, t, 1.5, (tint) => {
          for (let i = 0; i < 2; i++) {
            const lx = cx - 12 + i * 24, s = Math.sin(t * 18 + i * 3) * 6;
            ctx.strokeStyle = tint || (f ? '#fff' : '#2c3442'); ctx.lineWidth = 3; A.line(ctx, lx, by - 12, lx + s, by);
          }
          ctx.fillStyle = tint || (f ? '#fff' : B.flesh(false)); A.ellipse(ctx, cx, by - 16, 22, 10);
          if (!tint) {
            B.plate(ctx, cx - 14, by - 26, 24, 8, 3, f);
            ctx.fillStyle = B.fleshD(f); A.ellipse(ctx, cx + d * 22, by - 20, 10, 8);
            B.eye(ctx, cx + d * 26, by - 22, 2.4, CYAN, f, 'rgba(79,243,255,0.4)');
          }
        });
      },
    },
    echoghost: {
      name: 'Echo', anomaly: true, ghost: true, w: 44, h: 28, hp: 1e9, dmg: 18, xp: 0, mem: 0,
      update(e, p, dt) {
        e.alpha = 0.38; e.noBar = true; e.vx = 0; e.vy = 0;
        e.i = (e.i || 0) + dt / 0.05;
        const pt = e.path[Math.floor(e.i)];
        if (!pt) { e.dead = true; p.burst(e.x + e.w / 2, e.y + e.h / 2, 16, CYAN, 160, 0.5, 2); return; }
        e.x = pt.x; e.y = pt.y; e.dir = pt.dir;
        for (const t of p.players) if (!t.dead && U.ov(t, e)) { const r = p.player; p.player = t; p.damagePlayer(e.dmg, e.x + e.w / 2); p.player = r; }
      },
      draw(ctx, e, P, t) {
        ctx.globalAlpha = 0.45 + Math.sin(t * 20) * 0.1;
        ANOM.echohound.draw.call(ANOM.echohound, ctx, e, P, t);
        ctx.globalAlpha = 1;
      },
    },
    inverter: {
      name: 'The Inverter', anomaly: true, fly: true, w: 52, h: 52, hp: 200, dmg: 18, xp: 55, mem: 7, aura: 210,
      lore: 'Near it, left is right. Your hands know it before you do.',
      update(e, p, dt) {
        const pl = p.player, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        const tx = pl.cx - Math.sin(e.t * 0.9) * 160, ty = pl.y - 70 + Math.sin(e.t * 2) * 30;
        e.vx += ((tx - cx) - e.vx) * Math.min(1, dt * 1.4);
        e.vy += ((ty - cy) - e.vy) * Math.min(1, dt * 1.4);
        for (const t of near(p, e, this.aura)) t.invertT = 0.2;
        e.cd -= dt;
        if (e.cd <= 0) { e.cd = 2.6; const a = Math.atan2(pl.cy - cy, pl.cx - cx); p.spawnProj({ x: cx, y: cy, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, r: 6, hostile: true, dmg: e.dmg, life: 3, t: 0, color: CYAN }); }
      },
      draw(ctx, e, P, t) {
        const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        ctx.strokeStyle = 'rgba(79,243,255,0.22)'; ctx.lineWidth = 1; ctx.setLineDash([4, 10]);
        ctx.beginPath(); ctx.arc(cx, cy, this.aura, -t * 0.4, -t * 0.4 + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        glitch(ctx, t, 2, (tint) => {
          // a Möbius band of flesh and steel that turns through itself
          for (let i = 0; i < 28; i++) {
            const a = (i / 28) * Math.PI * 2 + t * 1.2, tw = Math.sin(a / 2 + t);
            const x = cx + Math.cos(a) * 22, y = cy + Math.sin(a) * 22 * 0.55;
            ctx.fillStyle = tint || (f ? '#fff' : tw > 0 ? '#283140' : B.flesh(false));
            A.ellipse(ctx, x, y, 3.5, 7 * Math.abs(tw) + 1, a);
          }
          if (!tint) B.eye(ctx, cx, cy, 4, CYAN, f, 'rgba(79,243,255,0.5)');
        });
      },
    },
  };
  // The Doppelgänger: a corrupted copy of Player 1's own look.
  ANOM.doppel = {
    name: 'Doppelgänger', anomaly: true, w: 24, h: 50, hp: 400, dmg: 22, xp: 120, mem: 20,
    lore: 'It wears your suit. It swings like you do. It is a little faster than you, and it knows it.',
    update(e, p, dt) {
      const pl = p.player, dx = pl.cx - (e.x + e.w / 2), ad = Math.abs(dx);
      e.dir = dx > 0 ? 1 : -1;
      const ranged = e.cls === 'ranger';
      const want = ranged ? 260 : 40;
      e.vx += ((ad > want ? e.dir : ad < want * 0.6 ? -e.dir : 0) * 240 * e.spd - e.vx) * Math.min(1, dt * 5);
      e.cd -= dt; e.dashCd = (e.dashCd || 0) - dt;
      if (e.dashCd <= 0 && ad > 120 && ad < 420 && !ranged) { e.dashCd = 3; e.vx = e.dir * 900; e.dashT = 0.15; p.burst(e.x + e.w / 2, e.y + 25, 10, MAG, 160, 0.3, 2); }
      if (e.onGround && Math.random() < dt * 0.6) e.vy = -560;
      if (e.cd <= 0) {
        e.cd = ranged ? 0.9 : 1.1;
        if (ranged) p.spawnProj({ x: e.x + e.w / 2, y: e.y + 22, vx: e.dir * 520, vy: 0, r: 5, hostile: true, dmg: e.dmg * 0.7, life: 1.4, t: 0, color: MAG });
        else if (ad < 90) { e.swing = 0.18; for (const t of near(p, e, 90)) { const r = p.player; p.player = t; p.damagePlayer(e.dmg, e.x + e.w / 2); p.player = r; } }
      }
      if (e.swing > 0) e.swing -= dt;
    },
    draw(ctx, e, P, t) {
      const cls = GV.CLASSES[e.cls] || {}, look = cls.look || {};
      glitch(ctx, t, 2.5, (tint) => {
        A.spaceman(ctx, e.x + e.w / 2, e.y + e.h + 4, { facing: e.dir, t: e.t, run: Math.abs(e.vx) > 40, air: !e.onGround, alpha: tint ? 0.6 : 1,
          cloak: tint || '#120a14', visor: tint || MAG, visorGlow: MAG_SOFT, suit: tint || '#3a2a3e', gear: cls.weapon && GV.WEAPONS[cls.weapon].art, kit: cls.kit ? { helm: cls.kit.helm, suit: cls.kit.suit, boots: cls.kit.boots, c: { suit: MAG, helm: MAG, boots: MAG } } : null, off: cls.offhand ? (GV.WEAPONS[cls.offhand].hand === 'off' ? 'shield' : GV.WEAPONS[cls.offhand].art) : null, offColor: MAG, attack: e.swing > 0 ? 1 - e.swing / 0.18 : 0, flash: e.flash > 0 });
      });
    },
  };
  for (const k in ANOM) GV.ENEMIES[k] = ANOM[k];
  const ANOM_POOL = ['stutter', 'recursion', 'nullsaint', 'echohound', 'inverter'];

  // ---------- The Aberrance: the anomalous boss ----------
  GV.BOSSES.aberrance = {
    w: 110, h: 110, hp: 640, dmg: 24, xp: 300, mem: 90, fly: true,
    spawn(p, ar) { return { x: ar.x + ar.w / 2 - 55, y: ar.floorY - 300 }; },
    update(e, p, dt) {
      const ar = p.arena, pl = p.player, enr = e.hp < e.maxHp * 0.5, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      e.tt -= dt * (enr ? 1.35 : 1);
      if (e.st === 'intro') { e.vx = 0; e.vy = 0; if (e.tt <= 0) { e.st = 'drift'; e.tt = 1.2; } return; }
      if (e.st === 'drift') {
        const tx = U.clamp(pl.cx - e.w / 2 + Math.sin(e.t) * 200, ar.x + 60, ar.x + ar.w - e.w - 60), ty = ar.floorY - 250 + Math.sin(e.t * 1.3) * 30;
        e.vx = (tx - e.x) * 1.8; e.vy = (ty - e.y) * 1.8;
        if (e.tt <= 0) {
          const opts = ['blink', 'fold', 'shards', 'blink', 'fold'];
          if (!p.enemies.some((x) => x.type === 'doppel')) opts.push('mirror');
          if (enr && !(p.anomZoneArena > 0)) opts.push('weightless');
          e.st = opts[Math.floor(Math.random() * opts.length)]; e.tt = 0.7; e.step = 0;
          if (e.st === 'blink') { e.bx = U.clamp(pl.cx - e.w / 2, ar.x + 40, ar.x + ar.w - e.w - 40); p.warn({ x: e.bx - 10, y: ar.floorY - 140, w: e.w + 20, h: 140, t: 0.7 }); }
          if (e.st === 'fold') { e.fy = pl.cy; p.warn({ x: ar.x, y: e.fy - 30, w: ar.w, h: 60, t: 0.85 }); e.tt = 0.85; }
        }
        return;
      }
      e.vx = 0; e.vy = 0;
      if (e.st === 'blink' && e.tt <= 0) {
        p.burst(cx, cy, 30, MAG, 260, 0.5, 3);
        e.x = e.bx; e.y = ar.floorY - e.h;
        p.burst(e.x + e.w / 2, e.y + e.h / 2, 40, CYAN, 320, 0.6, 3);
        p.hazards.push({ x: e.x - 10, y: ar.floorY - 140, w: e.w + 20, h: 140, t: 0.25, max: 0.25, dmg: e.dmg * 1.2 });
        p.novas.push({ x: e.x + e.w / 2, y: ar.floorY - 10, r: 10, max: 160, t: 0, color: MAG });
        p.shake(14); p.sfx('slam');
        e.st = 'drift'; e.tt = enr ? 0.9 : 1.5;
      } else if (e.st === 'fold' && e.tt <= 0) {
        p.hazards.push({ x: ar.x, y: e.fy - 30, w: ar.w, h: 60, t: 0.45, max: 0.45, dmg: e.dmg });
        p.beam = { y: e.fy, t: 0.45 }; p.shake(10); p.sfx('rift');
        e.st = 'drift'; e.tt = enr ? 1 : 1.6;
      } else if (e.st === 'shards' && e.tt <= 0) {
        const n = enr ? 16 : 11;
        for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + e.t; p.spawnProj({ x: cx, y: cy, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 7, hostile: true, dmg: e.dmg * 0.8, life: 4, t: 0, color: i % 2 ? MAG : CYAN }); }
        p.sfx('shoot'); e.step++;
        if (e.step >= (enr ? 3 : 2)) { e.st = 'drift'; e.tt = 1.4; } else e.tt = 0.45;
      } else if (e.st === 'mirror' && e.tt <= 0) {
        const dp = p.spawnEnemy('doppel', cx, ar.floorY, true); dp.cls = p.players[0].cls; dp.hp = dp.maxHp = e.maxHp * 0.25;
        p.toast('It made a copy of you', 1.8, 'small'); p.sfx('boss');
        e.st = 'drift'; e.tt = 1.6;
      } else if (e.st === 'weightless' && e.tt <= 0) {
        p.zones = p.zones || [];
        p.zones.push({ kind: 'float', x: ar.x, y: ar.top - 100, w: ar.w, h: ar.floorY - ar.top + 200, t: 7, max: 7 });
        p.anomZoneArena = 7; p.toast('Gravity forgets you', 1.8, 'small');
        e.st = 'drift'; e.tt = 1.2;
      }
    },
    draw(ctx, e, P, t) {
      const f = e.flash > 0, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      A.glow(ctx, cx, cy, 130, 'rgba(255,79,216,0.22)');
      glitch(ctx, t, 3, (tint) => {
        // a tesseract: two cubes, one inside the other, turning through each other
        const rot = t * 0.7;
        const cube = (s, ph) => [0, 1, 2, 3].map((i) => { const a = rot * (ph ? -1 : 1) + i * Math.PI / 2 + Math.PI / 4; return [cx + Math.cos(a) * s, cy + Math.sin(a) * s * 0.8]; });
        const o = cube(56, 0), n = cube(28 + Math.sin(t * 2) * 6, 1);
        ctx.strokeStyle = tint || (f ? '#fff' : '#8796b0'); ctx.lineWidth = tint ? 2 : 3;
        for (const q of [o, n]) { ctx.beginPath(); q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke(); }
        for (let i = 0; i < 4; i++) A.line(ctx, o[i][0], o[i][1], n[i][0], n[i][1]);
        if (!tint) {
          // a heart of flesh at the centre, stapled with plates, cables to every corner
          for (let i = 0; i < 4; i++) B.cable(ctx, cx, cy, o[i][0], o[i][1], Math.sin(t * 2 + i) * 10, '#1a1f2a', 2);
          const beat = 1 + Math.max(0, Math.sin(t * 5)) * 0.12;
          ctx.fillStyle = B.flesh(f); A.circle(ctx, cx, cy, 18 * beat);
          ctx.fillStyle = B.fleshL(f); A.circle(ctx, cx - 4, cy - 5, 8 * beat);
          B.veins(ctx, cx, cy, 16, 0.6, t, 'rgba(255,120,170,0.8)');
          B.plate(ctx, cx - 10, cy + 8, 20, 6, 2, f);
          const play = GV.game.play, lx = play ? U.clamp((play.player.cx - cx) * 0.02, -5, 5) : 0;
          B.eye(ctx, cx + lx, cy - 2, 6, MAG, f, MAG_SOFT);
        }
      });
    },
  };
  GV.BOSS_LORE.aberrance = { epithet: 'It should not be here', half: ['ERR: REALITY NOT FOUND'], death: ['The room remembers its shape.'] };
  GV.BEASTS = GV.BEASTS || {};
  for (const k of ANOM_POOL.concat(['doppel'])) GV.BEASTS[k] = { name: ANOM[k].name, text: ANOM[k].lore, anomaly: true };
  GV.BEASTS.aberrance = { name: 'The Aberrance', text: 'A shape with more sides than the room it is in. It does not belong to any system. It visits.', anomaly: true };

  // ---------- Anomaly Shards: one twisted modifier per item ----------
  GV.CURRENCY.anomaly = { name: 'Anomaly Shard', color: MAG, cost: 260, desc: 'Twists an item: adds one powerful Anomalous modifier with a drawback. One per item.' };
  GV.ANOM_MODS = [
    { up: ['dmg', 45], down: ['lifePct', -20] }, { up: ['atkSpd', 22], down: ['lifePct', -12] }, { up: ['critChance', 60], down: ['moveSpd', -8] },
    { up: ['area', 30], down: ['moveSpd', -8] }, { up: ['castSpd', 22], down: ['ward', -40] }, { up: ['lifePct', 30], down: ['dmg', -12] },
    { up: ['cdr', 20], down: ['charge', -30] }, { up: ['projDmg', 50], down: ['charge', -25] }, { up: ['meleeDmg', 50], down: ['dashCd', -25] },
    { up: ['minionDmg', 60], down: ['lifePct', -15] }, { up: ['voidDmg', 55], down: ['dashCd', -30] }, { up: ['moveSpd', 18], down: ['armourPct', -30] },
  ];
  const craft0 = GV.items.craft;
  GV.items.craft = function (it, cur) {
    if (cur !== 'anomaly') return craft0.call(this, it, cur);
    const d = GV.save.data;
    if (!d.cur.anomaly) return 'You have none.';
    if (it.anom) return 'This item is already anomalous.';
    const m = GV.ANOM_MODS[Math.floor(Math.random() * GV.ANOM_MODS.length)];
    it.mods[m.up[0]] = (it.mods[m.up[0]] || 0) + m.up[1];
    it.mods[m.down[0]] = (it.mods[m.down[0]] || 0) + m.down[1];
    it.anom = true; it.crafted = true;
    if (!/^Anomalous /.test(it.name)) it.name = 'Anomalous ' + it.name;
    d.cur.anomaly--;
    GV.save.write();
    if (GV.quests) GV.quests.emit('craft');
    return null;
  };

  // ---------- the director: when and what ----------
  const EVENTS = {
    enemy: { w: 45, name: () => 'Anomalous signal' },
    zone: { w: 30 },
    tear: { w: 10, name: () => 'Rift Tear' },
    doppel: { w: 8, name: () => 'Doppelgänger' },
    dejavu: { w: 7, name: () => 'Déjà vu' },
  };
  const ZONES = {
    float: { name: 'Weightless', color: CYAN, desc: 'gravity loosens' },
    slow: { name: 'Time Sink', color: '#9b8cff', desc: 'time drags' },
    fold: { name: 'Fold', color: MAG, desc: 'edges connect' },
    static: { name: 'Static', color: '#c9d2e6', desc: 'signal lost' },
  };
  GV.ANOM_ZONES = ZONES;

  P.anomInit = function () {
    const d = GV.save.main || GV.save.data;
    this.anom = { t: 28 + Math.random() * 30, on: !!(d.cleared && d.cleared['0-0']) && !(this.sysIdx === 0 && this.stIdx === 0 && !d.cleared['0-1']), snaps: [], snapT: 0 };
    this.zones = [];
  };
  P.updateAnomaly = function (dt) {
    if (!this.anom) this.anomInit();
    const AN = this.anom, pl = this.player;
    if (this.glitchT > 0) this.glitchT -= dt;
    if (this.anomZoneArena > 0) this.anomZoneArena -= dt;
    if (this.beam) { this.beam.t -= dt; if (this.beam.t <= 0) this.beam = null; }
    // zones: apply their rules
    this.staticHud = false;
    for (const z of this.zones) {
      z.t -= dt;
      for (const P_ of this.players) {
        if (P_.dead || !U.ov(P_, z)) continue;
        if (z.kind === 'float') P_.gravT = 0.15;
        if (z.kind === 'slow') P_.slowT = 0.15;
        if (z.kind === 'static' && P_.slot === 0) this.staticHud = true;
        if (z.kind === 'fold') {
          if (P_.cx < z.x + 8 && P_.vx < 0) { P_.x = z.x + z.w - P_.w - 10; this.burst(P_.cx, P_.cy, 10, MAG, 140, 0.3, 2); }
          else if (P_.cx > z.x + z.w - 8 && P_.vx > 0) { P_.x = z.x + 10; this.burst(P_.cx, P_.cy, 10, MAG, 140, 0.3, 2); }
        }
      }
      if (z.kind === 'slow') for (const e of this.enemies) if (U.ov(e, z)) e.slowZ = 0.15;
    }
    this.zones = this.zones.filter((z) => z.t > 0);
    // Rift Tear ends
    if (this.tear) { this.tear.t -= dt; if (this.tear.t <= 0) { this.pal = this.tear.pal; this.sd.pool = this.tear.pool; this.tear = null; this.toast('The tear closes', 1.6, 'small'); } }
    // Déjà vu: keep a rolling memory of the last ~30 s
    AN.snapT -= dt;
    if (AN.snapT <= 0 && this.state === 'run') {
      AN.snapT = 2;
      AN.snaps.push({ t: this.t, players: this.players.map((p) => ({ x: p.x, y: p.y })), enemies: this.enemies.filter((e) => !e.dead && !e.def.ghost).map((e) => Object.assign({}, e)) });
      if (AN.snaps.length > 16) AN.snaps.shift();
    }
    if (AN.rewind > 0) { AN.rewind -= dt; if (AN.rewind <= 0) this.doRewind(); }
    // roll the next anomaly
    if (!AN.on || this.duel || this.boss || this.state !== 'run') return;
    AN.t -= dt;
    if (AN.t > 0) return;
    AN.t = 40 + Math.random() * 45;
    if (Math.random() > 0.6) return;
    this.triggerAnomaly();
  };
  P.triggerAnomaly = function (kind) {
    const pl = this.player;
    if (!kind) {
      const tot = Object.values(EVENTS).reduce((a, b) => a + b.w, 0);
      let r = Math.random() * tot;
      for (const k in EVENTS) { r -= EVENTS[k].w; if (r <= 0) { kind = k; break; } }
    }
    this.glitchT = 0.8; this.sfx('rift'); this.shake(6);
    const announce = (title, sub) => { this.toast(title, 2.4); const t = this.toasts[this.toasts.length - 1]; t.sub = sub; t.anom = true; };
    if (kind === 'enemy') {
      const type = ANOM_POOL[Math.floor(Math.random() * ANOM_POOL.length)], def = GV.ENEMIES[type];
      const x = pl.cx + (Math.random() < 0.5 ? -1 : 1) * (280 + Math.random() * 120);
      const gy = def.fly ? pl.y - 120 : this.groundYAt(x, pl.y - 300);
      const e = this.spawnEnemy(type, x, gy != null ? gy : pl.y + pl.h, true);
      announce('Anomaly', def.name);
      this.burst(e.x + e.w / 2, e.y + e.h / 2, 40, MAG, 260, 0.7, 3);
    } else if (kind === 'zone') {
      const ks = Object.keys(ZONES), k = ks[Math.floor(Math.random() * ks.length)];
      const w = 420, h = 340, x = pl.cx + pl.facing * 140 - w / 2, y = pl.cy - h * 0.6;
      this.zones.push({ kind: k, x, y, w, h, t: 18, max: 18 });
      announce('Anomaly', `${ZONES[k].name}: ${ZONES[k].desc}`);
    } else if (kind === 'tear') {
      const other = GV.UNIVERSE.system((this.sysIdx + 1 + Math.floor(Math.random() * 3)) % 6);
      const st = other.stages[Math.floor(Math.random() * 3)];
      this.tear = { t: 20, pal: this.pal, pool: this.sd.pool };
      this.pal = A.palette(other); this.sd.pool = st.pool;
      for (let i = 0; i < 4; i++) { const type = U.weighted(Math.random, st.pool), def = GV.ENEMIES[type]; const x = pl.cx + (i % 2 ? 1 : -1) * (300 + i * 60); const gy = def.fly ? pl.y - 100 : this.groundYAt(x, pl.y - 300); if (gy != null) this.spawnEnemy(type, x, gy); }
      announce('Rift Tear', `${other.name} bleeds through`);
    } else if (kind === 'doppel') {
      const x = pl.cx + pl.facing * 320, gy = this.groundYAt(x, pl.y - 300);
      const e = this.spawnEnemy('doppel', x, gy != null ? gy : pl.y + pl.h, true);
      e.cls = this.players[0].cls; e.hp = e.maxHp = Math.max(e.hp, this.players[0].maxHp * 2.2);
      announce('Doppelgänger', 'Something is wearing you');
    } else if (kind === 'dejavu') {
      if (this.anom.snaps.length < 6) return this.triggerAnomaly('enemy');
      this.anom.rewind = 2.2;
      announce('Déjà vu', 'You have been here before');
    }
  };
  P.doRewind = function () {
    const s = this.anom.snaps[Math.max(0, this.anom.snaps.length - 11)];
    if (!s) return;
    this.glitchT = 1.2; this.shake(10); this.sfx('boss');
    this.enemies = this.enemies.filter((e) => e.boss).concat(s.enemies.filter((e) => !e.boss).map((e) => Object.assign({}, e, { dead: false })));
    s.players.forEach((q, i) => { const p = this.players[i]; if (p && !p.dead) { p.x = q.x; p.y = q.y; p.vx = 0; p.vy = 0; p.inv = 1; } });
    this.projs = this.projs.filter((p) => !p.hostile);
    this.snapCam();
    this.toast('…again', 1.6, 'small');
  };

  // A rare anomalous boss replaces the usual one (never on a first clear, never the Warden's story fight).
  const startBoss0 = P.startBoss;
  P.startBoss = function () {
    const d = GV.save.main || GV.save.data, key = `${this.sysIdx}-${this.stIdx}`;
    if (d.cleared[key] && !this.trial && (this.forceAberrance || Math.random() < 0.12)) {
      this.sd.boss = 'aberrance'; this.sd.bossName = 'The Aberrance'; this.aberrance = true;
    }
    return startBoss0.call(this);
  };
  const nextWave0 = P.nextWave;
  P.nextWave = function () {
    const T = this.trial;
    nextWave0.call(this);
    if (this.boss && this.boss.type !== 'aberrance' && T.wave >= 10 && Math.random() < 0.1) {
      const b = this.boss; b.dead = true; this.enemies = this.enemies.filter((e) => e !== b); this.boss = null;
      this.sd.boss = 'aberrance'; this.sd.bossName = 'The Aberrance · Wave ' + T.wave;
      this.spawnBoss();
    }
  };

  // Anomalous kills: special deaths, shards, and a bigger payout from the Aberrance.
  const kill0 = P.killEnemy;
  P.killEnemy = function (e) {
    if (e.dead) return;
    const anomaly = e.def && e.def.anomaly && !e.def.ghost;
    if (e.def && e.def.onDeath) { try { e.def.onDeath(this, e); } catch (err) {} }
    if (anomaly && !e.noShard) this.drops.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: 0, vy: -380, w: 12, h: 12, kind: 'cur', cur: 'anomaly', age: 0 });
    if (e.type === 'aberrance') {
      for (let i = 0; i < 2; i++) this.drops.push({ x: e.x + e.w / 2 + (i - 0.5) * 40, y: e.y + e.h / 2, vx: (i - 0.5) * 200, vy: -420, w: 12, h: 12, kind: 'cur', cur: 'anomaly', age: 0 });
      const u = GV.UNIQUES.filter((x) => !x.quest); const pick = u[Math.floor(Math.random() * u.length)];
      if (pick) this.drops.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: 0, vy: -460, w: 14, h: 14, kind: 'item', item: { uid: GV.save.data.uid++, slot: pick.slot, rarity: 'unique', tier: pick.tier, name: pick.name, base: GV.SLOTS[pick.slot].bases[pick.tier - 1], mods: Object.assign({}, pick.mods), flavor: pick.flavor }, age: 0 });
      const st = ((GV.save.main || GV.save.data).stats = (GV.save.main || GV.save.data).stats || {}); st.aberrance = (st.aberrance || 0) + 1;
    }
    if (anomaly && !e.noShard) { const st = ((GV.save.main || GV.save.data).stats = (GV.save.main || GV.save.data).stats || {}); st.anomalies = (st.anomalies || 0) + 1; }
    return kill0.call(this, e);
  };

  // Ghost echoes can't be hit; zone slowdown reaches creatures through the ailment speed.
  const tick0 = GV.Skills.tickAilments;
  GV.Skills.tickAilments = function (p, e, dt) {
    const r = tick0.call(this, p, e, dt);
    if (e.slowZ > 0) { e.slowZ -= dt; r.spd *= 0.45; }
    return r;
  };

  // ---------- drawing ----------
  P.drawZones = function (ctx) {
    for (const z of this.zones) {
      const Z = ZONES[z.kind], k = Math.min(1, z.t / 1, (z.max - z.t) / 0.6);
      ctx.save(); ctx.globalAlpha = 0.18 * k; ctx.fillStyle = Z.color; ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.globalAlpha = 0.7 * k; ctx.strokeStyle = Z.color; ctx.lineWidth = 2; ctx.setLineDash([12, 8]); ctx.lineDashOffset = -this.t * 40;
      ctx.strokeRect(z.x, z.y, z.w, z.h); ctx.setLineDash([]);
      // drifting scanlines
      ctx.globalAlpha = 0.25 * k;
      for (let i = 0; i < 6; i++) { const y = z.y + ((this.t * 60 + i * z.h / 6) % z.h); ctx.fillRect(z.x, y, z.w, 1.5); }
      ctx.globalAlpha = 0.85 * k; ctx.font = `700 11px ${C.FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = Z.color;
      ctx.fillText(Z.name.toUpperCase(), z.x + 8, z.y + 16);
      ctx.restore();
    }
    if (this.beam) {
      const ar = this.arena;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,79,216,${this.beam.t * 1.4})`; ctx.fillRect(ar.x, this.beam.y - 30, ar.w, 60);
      ctx.fillStyle = `rgba(255,255,255,${this.beam.t})`; ctx.fillRect(ar.x, this.beam.y - 4, ar.w, 8);
      ctx.restore();
    }
  };
  // Screen-space corruption when an anomaly hits, plus static.
  P.drawGlitch = function (ctx) {
    const W = C.W, H = C.H;
    if (this.glitchT > 0) {
      const k = Math.min(1, this.glitchT / 0.4);
      for (let i = 0; i < 7; i++) {
        const y = Math.random() * H, h = 4 + Math.random() * 18;
        ctx.fillStyle = Math.random() < 0.5 ? `rgba(255,79,216,${0.25 * k})` : `rgba(79,243,255,${0.25 * k})`;
        ctx.fillRect((Math.random() - 0.5) * 40, y, W, h);
      }
    }
    if (this.staticHud) {
      ctx.fillStyle = 'rgba(200,210,230,0.06)';
      for (let i = 0; i < 70; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 40, 1);
    }
    if (this.tear) { ctx.fillStyle = `rgba(255,79,216,${0.05 + Math.sin(this.t * 3) * 0.03})`; ctx.fillRect(0, 0, W, H); }
  };
  // Anomalous creatures get a name tag and a magenta health bar.
  P.drawAnomTag = function (ctx, e) {
    if (!e.def.anomaly || e.def.ghost) return;
    ctx.font = `800 10px ${C.FONT}`; ctx.textAlign = 'center';
    const x = e.x + e.w / 2, y = e.y - 16, jx = Math.sin(this.t * 31) > 0.85 ? 2 : 0;
    ctx.fillStyle = CYAN; ctx.fillText(e.def.name.toUpperCase(), x - 1 + jx, y);
    ctx.fillStyle = MAG; ctx.fillText(e.def.name.toUpperCase(), x + 1 - jx, y);
    ctx.fillStyle = '#fff'; ctx.fillText(e.def.name.toUpperCase(), x, y);
  };
})();

// Achievements for anomaly hunters.
(function () {
  const GV = window.GV, st = () => ((GV.save.main || GV.save.data).stats || {});
  GV.ACH.push(
    { id: 'anomaly1', name: 'Something Wrong', desc: 'Destroy an anomalous creature', icon: '⌬', mem: 60, test: () => (st().anomalies || 0) >= 1 },
    { id: 'anomaly15', name: 'Anomaly Hunter', desc: 'Destroy 15 anomalous creatures', icon: '⌬', mem: 220, test: () => (st().anomalies || 0) >= 15, prog: () => [st().anomalies || 0, 15] },
    { id: 'aberrance', name: 'It Should Not Be Here', desc: 'Defeat The Aberrance', icon: '◈', mem: 300, test: () => (st().aberrance || 0) >= 1 },
  );
})();
