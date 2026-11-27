// Galactic Void — all procedural art: the spaceman, the void, rock, pickups, the ship and the cover.
(function () {
  const GV = window.GV, U = GV.util;
  const col = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  const A = (GV.art = { col });

  // ---------- primitive helpers ----------
  A.circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fill(); };
  A.ellipse = (ctx, x, y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2); ctx.fill(); };
  A.rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); };
  A.line = (ctx, x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  // Glows are pre-rendered once per colour and stamped as sprites: far cheaper than building a
  // radial gradient every call, which matters a lot on phones.
  const glowCache = new Map();
  A.glow = (ctx, x, y, r, color) => {
    if (!(r > 0)) return;
    let c = glowCache.get(color);
    if (!c) {
      if (glowCache.size > 300) glowCache.clear();
      c = mk(64, 64);
      const g2 = c.getContext('2d'), g = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
      g2.fillStyle = g; g2.fillRect(0, 0, 64, 64);
      glowCache.set(color, c);
    }
    const op = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(c, x - r, y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = op;
  };
  A.star = (ctx, x, y, r, points, rot) => {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rr = i % 2 ? r * 0.42 : r;
      const a = rot + (i * Math.PI) / points;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  };

  // ---------- palettes ----------
  A.palette = (sys) => {
    const { hA, hB, rockHue: rh } = sys;
    return {
      hA, hB, rh,
      rock: col(rh, 10, 14), rockLite: col(rh, 12, 27), rockDark: col(rh, 14, 6),
      glow: col(hA, 90, 72), glowSoft: col(hA, 90, 70, 0.3),
      accent: col(hB, 92, 58), accentSoft: col(hB, 92, 58, 0.3),
      far: col(rh, 18, 5), mid: col(rh, 14, 8),
    };
  };

  // ---------- background ----------
  A.background = (pal, seed) => {
    const r = U.rng(seed || 7), W = 960, H = 540;
    const sky = mk(W, H), sc = sky.getContext('2d');
    let g = sc.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#020207');
    g.addColorStop(0.5, col(pal.hA, 45, 5));
    g.addColorStop(0.72, col(pal.hB, 55, 10));
    g.addColorStop(0.85, col(pal.hB, 45, 6));
    g.addColorStop(1, '#030306');
    sc.fillStyle = g; sc.fillRect(0, 0, W, H);
    sc.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 28; i++) {
      const x = r() * W, y = r() * H * 0.85, rad = 60 + r() * 240;
      const hue = r() < 0.55 ? pal.hA : pal.hB;
      const gg = sc.createRadialGradient(x, y, 0, x, y, rad);
      gg.addColorStop(0, col(hue, 80, 55, 0.05 + r() * 0.08));
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      sc.fillStyle = gg; sc.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 280; i++) {
      const x = r() * W, y = r() * H * 0.9;
      const big = r() > 0.93;
      sc.fillStyle = r() < 0.15 ? col(pal.hB, 90, 80, 0.8) : r() < 0.3 ? col(pal.hA, 90, 85, 0.8) : `rgba(255,255,255,${0.25 + r() * 0.6})`;
      sc.fillRect(x, y, big ? 2 : 1, big ? 2 : 1);
    }
    sc.globalCompositeOperation = 'source-over';

    // Far wreckage silhouettes
    const far = mk(1920, H), fc = far.getContext('2d');
    for (let i = 0; i < 18; i++) {
      const x = r() * 1920, w = 30 + r() * 110, h = 70 + r() * 230, base = H * 0.86;
      fc.fillStyle = pal.far;
      fc.beginPath();
      fc.moveTo(x, base);
      fc.lineTo(x + w * 0.1, base - h * (0.7 + r() * 0.3));
      fc.lineTo(x + w * 0.35, base - h);
      fc.lineTo(x + w * 0.5, base - h * (0.6 + r() * 0.2));
      fc.lineTo(x + w * 0.7, base - h * (0.85 + r() * 0.15));
      fc.lineTo(x + w, base);
      fc.closePath(); fc.fill();
      if (r() < 0.5) { fc.strokeStyle = pal.far; fc.lineWidth = 3; A.line(fc, x + w * 0.4, base - h, x + w * 0.4 + 60 * (r() - 0.5), base - h - 40); }
      for (let k = 0; k < 4; k++) {
        if (r() < 0.5) continue;
        fc.fillStyle = r() < 0.5 ? col(pal.hB, 90, 55, 0.7) : col(pal.hA, 90, 70, 0.6);
        fc.fillRect(x + w * (0.2 + r() * 0.6), base - h * (0.2 + r() * 0.6), 2, 2);
      }
    }
    fc.fillStyle = pal.far; fc.fillRect(0, H * 0.86, 1920, H * 0.14);

    // Mid floating asteroids
    const mid = mk(1920, H), mc = mid.getContext('2d');
    for (let i = 0; i < 12; i++) {
      const cx = r() * 1920, cy = H * (0.18 + r() * 0.5), rad = 18 + r() * 60;
      mc.fillStyle = pal.mid;
      mc.beginPath();
      const n = 9;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2, rr = rad * (0.7 + r() * 0.35);
        mc.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8);
      }
      mc.closePath(); mc.fill();
      mc.strokeStyle = col(pal.hA, 60, 65, 0.22); mc.lineWidth = 1.5;
      mc.beginPath(); mc.arc(cx, cy, rad * 0.8, Math.PI * 1.05, Math.PI * 1.6); mc.stroke();
    }
    return { sky, far, mid };
  };

  A.drawBackground = (ctx, bg, cam, t, pal) => {
    const W = GV.CFG.W;
    ctx.drawImage(bg.sky, 0, 0, W, 540);
    // The black hole turns slowly, so it's painted (with the sky behind it) into a cached patch
    // a dozen times a second instead of every frame. It was the single most expensive layer.
    const bx = W * 0.68 - cam.x * 0.025, by = 165 - cam.y * 0.03, R = 64, half = Math.ceil(R * 3.75);
    const tf = ctx.getTransform ? ctx.getTransform() : null, k = Math.max(1, Math.min(2.5, tf ? Math.hypot(tf.a, tf.b) : 1));
    let bh = bg.bh;
    if (!bh || bh.k !== k || bh.pal !== pal) {
      bh = bg.bh = { cv: mk(Math.ceil(half * 2 * k), Math.ceil(half * 2 * k)), k, pal, t: -1, x: NaN, y: NaN };
    }
    if (t - bh.t > 1 / 12 || t < bh.t || Math.abs(bx - bh.x) > 0.6 || Math.abs(by - bh.y) > 0.6) {
      const g = bh.cv.getContext('2d');
      g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, half * 2, half * 2);
      g.translate(half - bx, half - by);
      g.drawImage(bg.sky, 0, 0, W, 540);
      A.blackHole(g, bx, by, R, t, pal);
      bh.t = t; bh.x = bx; bh.y = by;
    }
    ctx.drawImage(bh.cv, bh.x - half, bh.y - half, half * 2, half * 2);
    const fx = -((cam.x * 0.18) % 1920), fy = -cam.y * 0.08;
    ctx.drawImage(bg.far, fx, fy); ctx.drawImage(bg.far, fx + 1920, fy);
    if (!GV.settings.saver()) {
      const mx = -((cam.x * 0.42) % 1920), my = -cam.y * 0.2;
      ctx.drawImage(bg.mid, mx, my); ctx.drawImage(bg.mid, mx + 1920, my);
    }
    if (!bg.fog) {
      bg.fog = mk(4, 240);
      const fc = bg.fog.getContext('2d'), g = fc.createLinearGradient(0, 0, 0, 240);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col(pal.hB, 50, 6, 0.55));
      fc.fillStyle = g; fc.fillRect(0, 0, 4, 240);
    }
    ctx.drawImage(bg.fog, 0, 300, W, 240);
  };

  A.blackHole = (ctx, x, y, r, t, pal) => {
    ctx.save();
    ctx.translate(x, y);
    A.glow(ctx, 0, 0, r * 3.6, col(pal.hB, 90, 50, 0.28));
    A.glow(ctx, 0, 0, r * 2.2, col(pal.hA, 80, 60, 0.12));
    const disk = (front) => {
      ctx.save();
      ctx.rotate(-0.22);
      ctx.scale(1, 0.27);
      if (front) { ctx.beginPath(); ctx.rect(-r * 5, 0, r * 10, r * 5); ctx.clip(); }
      ctx.globalCompositeOperation = 'lighter';
      const rings = [[1.35, 0.42, col(pal.hA, 95, 85, 0.5)], [1.75, 0.34, col(pal.hB, 95, 62, 0.42)], [2.15, 0.26, col(pal.hB, 90, 45, 0.28)], [2.6, 0.2, col(pal.hA, 80, 60, 0.14)]];
      for (const [rr, lw, c] of rings) { ctx.strokeStyle = c; ctx.lineWidth = r * lw; ctx.beginPath(); ctx.arc(0, 0, r * rr, 0, Math.PI * 2); ctx.stroke(); }
      for (let i = 0; i < 12; i++) {
        const a = t * 0.35 + i * 0.53, rr = r * (1.3 + (i % 4) * 0.36);
        ctx.strokeStyle = col(i % 2 ? pal.hA : pal.hB, 100, 88, 0.4);
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, rr, a, a + 0.45); ctx.stroke();
      }
      ctx.restore();
    };
    disk(false);
    ctx.fillStyle = '#000';
    A.circle(ctx, 0, 0, r);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = col(pal.hB, 100, 62, 0.5); ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = col(pal.hA, 100, 90, 0.9); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.03, 0, Math.PI * 2); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    disk(true);
    ctx.restore();
  };

  // ---------- terrain ----------
  A.rock = (ctx, r, pal, v) => {
    const x0 = Math.max(r.x, v.x0), x1 = Math.min(r.x + r.w, v.x1);
    const y0 = Math.max(r.y, v.y0), y1 = Math.min(r.y + r.h, v.y1);
    if (x1 <= x0 || y1 <= y0) return;
    if (!pal.strip) {
      pal.strip = mk(2, 220);
      const sc = pal.strip.getContext('2d'), g = sc.createLinearGradient(0, 0, 0, 220);
      g.addColorStop(0, pal.rockLite); g.addColorStop(0.08, pal.rock); g.addColorStop(1, pal.rockDark);
      sc.fillStyle = g; sc.fillRect(0, 0, 2, 220);
    }
    const sh = Math.min(r.h, 220);
    if (r.y + sh > y0) ctx.drawImage(pal.strip, x0, r.y, x1 - x0, sh);
    if (r.y + sh < y1) { ctx.fillStyle = pal.rockDark; ctx.fillRect(x0, Math.max(y0, r.y + sh), x1 - x0, y1 - Math.max(y0, r.y + sh)); }
    if (r.y >= v.y0 - 10 && r.y <= v.y1) {
      // jagged crust
      ctx.fillStyle = pal.rockLite;
      ctx.beginPath();
      const sx = Math.floor(x0 / 16) * 16;
      ctx.moveTo(x0, r.y + 6);
      for (let x = sx; x <= x1 + 16; x += 16) {
        const xx = U.clamp(x, x0, x1);
        ctx.lineTo(xx, r.y - 1 + U.noise(x) * 4);
      }
      ctx.lineTo(x1, r.y + 6);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = col(pal.hA, 70, 75, 0.35); ctx.lineWidth = 1;
      A.line(ctx, x0, r.y + 0.5, x1, r.y + 0.5);
      // cracks
      ctx.strokeStyle = pal.rockDark; ctx.lineWidth = 1.5;
      const cs = Math.floor(x0 / 70) * 70;
      for (let x = cs; x < x1; x += 70) {
        if (x < r.x + 6 || x > r.x + r.w - 6 || U.noise(x * 0.7) < 0.4) continue;
        ctx.beginPath();
        let cx = x, cy = r.y + 4;
        ctx.moveTo(cx, cy);
        for (let k = 0; k < 4; k++) { cx += (U.noise(x + k) - 0.5) * 18; cy += 9 + U.noise(x * 3 + k) * 10; ctx.lineTo(cx, cy); }
        ctx.stroke();
      }
    }
    // side edges
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    if (r.x >= x0) ctx.fillRect(r.x, y0, 3, y1 - y0);
    if (r.x + r.w <= x1) ctx.fillRect(r.x + r.w - 3, y0, 3, y1 - y0);
  };

  A.ledge = (ctx, r, pal, mover, t) => {
    ctx.fillStyle = pal.rock;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x + r.w, r.y);
    ctx.lineTo(r.x + r.w - 6, r.y + r.h);
    const n = Math.max(2, Math.floor(r.w / 22));
    for (let i = n; i >= 0; i--) ctx.lineTo(r.x + (r.w * i) / n, r.y + r.h + 4 + U.noise(r.x + i) * 10);
    ctx.lineTo(r.x + 6, r.y + r.h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.rockLite; ctx.fillRect(r.x, r.y, r.w, 4);
    if (mover) {
      ctx.fillStyle = pal.glow; ctx.fillRect(r.x + 4, r.y, r.w - 8, 2);
      A.glow(ctx, r.x + r.w / 2, r.y + r.h + 6, 30 + Math.sin(t * 4) * 4, pal.glowSoft);
      ctx.fillStyle = pal.glow;
      for (let i = 0; i < 3; i++) ctx.fillRect(r.x + r.w * (0.25 + i * 0.25) - 2, r.y + r.h + 1, 4, 3);
    } else {
      ctx.strokeStyle = col(pal.hA, 70, 75, 0.3); ctx.lineWidth = 1;
      A.line(ctx, r.x, r.y + 0.5, r.x + r.w, r.y + 0.5);
    }
  };

  A.spikes = (ctx, r, pal) => {
    const n = Math.max(1, Math.round(r.w / 14)), sw = r.w / n;
    for (let i = 0; i < n; i++) {
      const x = r.x + i * sw, hh = r.h * (0.75 + U.noise(r.x + i) * 0.35);
      ctx.fillStyle = '#07060b';
      ctx.beginPath(); ctx.moveTo(x, r.y + r.h); ctx.lineTo(x + sw * 0.5, r.y + r.h - hh); ctx.lineTo(x + sw, r.y + r.h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = pal.accentSoft; ctx.lineWidth = 1;
      A.line(ctx, x + sw * 0.5, r.y + r.h - hh, x + sw, r.y + r.h);
    }
    ctx.fillStyle = pal.accentSoft; ctx.fillRect(r.x, r.y + r.h - 2, r.w, 2);
  };

  A.membrane = (ctx, r, t, pal) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
    g.addColorStop(0, col(pal.hA, 100, 70, 0.05));
    g.addColorStop(0.5, col(pal.hA, 100, 70, 0.35 + Math.sin(t * 3) * 0.08));
    g.addColorStop(1, col(pal.hA, 100, 70, 0.05));
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = col(pal.hA, 100, 85, 0.6); ctx.lineWidth = 1.2;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let y = r.y; y <= r.y + r.h; y += 6) ctx.lineTo(r.x + r.w / 2 + Math.sin(y * 0.08 + t * 4 + k * 2) * (r.w * 0.35), y);
      ctx.stroke();
    }
    ctx.restore();
  };

  A.gate = (ctx, r, t, pal, closed) => {
    if (!closed) return;
    ctx.fillStyle = '#0b0a10'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#1c1a26';
    for (let y = r.y; y < r.y + r.h; y += 40) ctx.fillRect(r.x + 3, y + 2, r.w - 6, 34);
    ctx.fillStyle = col(pal.hB, 95, 55, 0.6 + Math.sin(t * 5) * 0.3);
    ctx.fillRect(r.x + r.w / 2 - 1.5, r.y, 3, r.h);
    A.glow(ctx, r.x + r.w / 2, r.y + r.h - 60, 50, pal.accentSoft);
  };

  // ---------- characters ----------
  // Draws the cloaked spaceman with his feet at (x, y).
  // The spaceman. o.kit (optional) picks armour styles: helm, suit and boots, plus trim colours
  // per slot. o.gear is the main-hand weapon art, o.off the off-hand (a shield or a second weapon).
  A.spaceman = (ctx, x, y, o = {}) => {
    const f = o.facing || 1, t = o.t || 0;
    const fl = o.flash;
    const C = (c) => (fl ? '#ffffff' : c);
    const cloak = o.cloak || '#252a3b', suitC = o.suit || '#d5dae4', visor = o.visor || '#8fe9ff';
    const kit = o.kit || { helm: 'dome', suit: 'cloak', boots: 'std', c: {} }, kc = kit.c || {};
    const trimS = kc.suit || visor, trimH = kc.helm || visor, trimB = kc.boots || visor;
    ctx.save();
    ctx.translate(x, y);
    if (o.scale) ctx.scale(o.scale, o.scale);
    ctx.scale(f, 1);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    // weight: squash on landing, stretch on take-off, lean into a run, lunge into a swing
    if (o.squash) ctx.scale(1 + o.squash * 0.16, 1 - o.squash * 0.16);
    if (o.run && !o.attack) ctx.rotate(0.07);
    if (o.attack) ctx.translate(Math.sin(o.attack * Math.PI) * 3.5, 0);
    const run = o.run ? 1 : 0;
    const bob = run ? Math.abs(Math.sin(t * 12)) * 2 : Math.sin(t * 2) * 0.7;
    const sw = run ? Math.sin(t * 12) : 0;
    const sway = U.clamp((o.vx || 0) / 310, -1, 1) * -6;
    // rear arm, holding the off-hand
    if (o.off) {
      ctx.fillStyle = C('#454b5e');
      const ra = o.attack ? 0.6 - o.attack * 1.2 : 0.35 - sw * 0.3;
      ctx.save(); ctx.translate(-2, -34 - bob); ctx.rotate(ra); ctx.fillRect(-2, 0, 5, 12);
      if (o.off === 'shield') { ctx.save(); ctx.translate(1, 12); ctx.rotate(-ra); ctx.fillStyle = C('#2c3142'); A.ellipse(ctx, 6, 0, 6, 11); ctx.strokeStyle = C(o.offColor || '#ffd36b'); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(6, 0, 6, 11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = C(o.offColor || '#ffd36b'); A.star(ctx, 6, 0, 3.5, 4, 0); ctx.restore(); }
      else A.held(ctx, o.off, !!o.attack, fl);
      ctx.restore();
    }
    // legs
    ctx.fillStyle = C('#171923');
    const leg = (lx, rot) => {
      ctx.save(); ctx.translate(lx, -17); ctx.rotate(rot);
      ctx.fillStyle = C('#1b1e2a'); ctx.fillRect(-3, 0, 6, 16);
      if (kit.boots === 'greave') { ctx.fillStyle = C('#7d8598'); A.rrect(ctx, -3.5, 5, 7, 11, 2); ctx.fillStyle = C(trimB); ctx.fillRect(-3.5, 5, 7, 1.5); }
      else if (kit.boots === 'mag') { ctx.fillStyle = C('#2a2f3e'); ctx.fillRect(-3.5, 10, 7, 6); ctx.fillStyle = fl ? '#fff' : trimB; ctx.fillRect(-3.5, 15, 7, 1.6); }
      else { ctx.fillStyle = C('#262a36'); ctx.fillRect(-3.5, 11, 7, 5); }
      ctx.fillStyle = C('#3a4052'); ctx.fillRect(-3, 4, 6, 2.5); // knee
      ctx.restore();
    };
    if (o.air) { leg(-4, 0.25); leg(4, -0.35); }
    else { leg(-3, sw * 0.45); leg(4, -sw * 0.45); }
    if (kit.boots === 'mag' && !fl && (o.air || run)) A.glow(ctx, 0, -1, 12, 'rgba(160,230,255,0.25)');
    // backpack
    if (kit.suit === 'rig') {
      ctx.fillStyle = C('#4a4f63'); A.rrect(ctx, -17, -46 - bob, 11, 23, 3);
      ctx.fillStyle = C('#8c93a6'); A.rrect(ctx, -19, -44 - bob, 4, 18, 2);
      ctx.strokeStyle = C('#8c93a6'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-14, -46 - bob); ctx.lineTo(-17, -58 - bob); ctx.stroke();
      ctx.fillStyle = fl ? '#fff' : trimS; A.circle(ctx, -17, -58 - bob, 1.5);
    } else if (kit.suit !== 'carapace') {
      ctx.fillStyle = C('#3a3f55'); A.rrect(ctx, -15, -44 - bob, 9, 19, 3);
      ctx.fillStyle = fl ? '#fff' : '#ff3b4f'; ctx.fillRect(-13, -33 - bob, 3, 3);
    }
    // the suit
    const torso = () => { ctx.fillStyle = C('#2a2f3f'); A.rrect(ctx, -8, -41 - bob, 16, 25, 4); };
    if (kit.suit === 'cloak') {
      ctx.fillStyle = C(cloak);
      ctx.beginPath(); ctx.moveTo(-9, -40 - bob); ctx.lineTo(9, -40 - bob); ctx.lineTo(11 + sway * 0.3, -12); ctx.lineTo(4, -10 + Math.sin(t * 6) * 1.5); ctx.lineTo(-4, -11); ctx.lineTo(-13 + sway, -13 + Math.sin(t * 5) * 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C('rgba(150,170,220,0.25)'); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = C('#8c93a6'); A.rrect(ctx, -6, -38 - bob, 12, 12, 3);
    } else if (kit.suit === 'plate') {
      torso();
      ctx.fillStyle = C(cloak); ctx.beginPath(); ctx.moveTo(-7, -20 - bob); ctx.lineTo(7, -20 - bob); ctx.lineTo(5 + sway * 0.2, -9); ctx.lineTo(-5 + sway * 0.4, -9); ctx.closePath(); ctx.fill(); // tabard
      ctx.fillStyle = C('#9aa2b6'); A.rrect(ctx, -8, -39 - bob, 16, 15, 4);
      ctx.fillStyle = C('#6c7489'); ctx.fillRect(-8, -26 - bob, 16, 3);
      ctx.fillStyle = C(trimS); ctx.fillRect(-1, -38 - bob, 2, 12); ctx.fillRect(-8, -24 - bob, 16, 1.5);
      ctx.fillStyle = C('#b4bccf'); A.ellipse(ctx, -8, -38 - bob, 5, 4); // rear pauldron
    } else if (kit.suit === 'robe') {
      ctx.fillStyle = C(cloak);
      ctx.beginPath(); ctx.moveTo(-8, -41 - bob); ctx.lineTo(8, -41 - bob); ctx.lineTo(10 + sway * 0.3, -3); ctx.lineTo(-11 + sway, -3 + Math.sin(t * 4) * 1.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C(suitC); ctx.beginPath(); ctx.moveTo(-3, -41 - bob); ctx.lineTo(3, -41 - bob); ctx.lineTo(4, -4); ctx.lineTo(-4, -4); ctx.closePath(); ctx.globalAlpha *= 0.35; ctx.fill(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
      ctx.fillStyle = C(trimS); ctx.fillRect(-8, -26 - bob, 16, 2.5);
      ctx.beginPath(); ctx.moveTo(-6, -26 - bob); ctx.lineTo(-12 + sway, -14 - bob); ctx.lineTo(-9 + sway, -13 - bob); ctx.closePath(); ctx.fill();
    } else if (kit.suit === 'harness') {
      ctx.fillStyle = C(suitC); A.rrect(ctx, -7, -40 - bob, 14, 22, 5);
      ctx.strokeStyle = C('#2a2f3f'); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-7, -39 - bob); ctx.lineTo(7, -22 - bob); ctx.moveTo(7, -39 - bob); ctx.lineTo(-7, -22 - bob); ctx.stroke();
      ctx.fillStyle = C(trimS); ctx.fillRect(-7, -22 - bob, 14, 3);
      // the sash streams behind
      ctx.beginPath(); ctx.moveTo(-6, -21 - bob); ctx.quadraticCurveTo(-14 + sway, -18, -18 + sway * 1.5, -12 + Math.sin(t * 7) * 2); ctx.lineTo(-15 + sway, -10 + Math.sin(t * 7) * 2); ctx.quadraticCurveTo(-11, -16, -5, -19 - bob); ctx.fill();
    } else if (kit.suit === 'carapace') {
      for (let i = 0; i < 3; i++) { const a = Math.sin(t * 3 + i) * 0.3; ctx.strokeStyle = C('#5a2c3a'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -36 - bob + i * 6); ctx.quadraticCurveTo(-16 + sway, -38 + i * 8 + a * 10, -20 + sway * 1.4, -30 + i * 10 + a * 12); ctx.stroke(); }
      ctx.fillStyle = C('#3e2430'); A.rrect(ctx, -8, -41 - bob, 16, 25, 6);
      ctx.fillStyle = C('#6a3c4c'); for (let i = 0; i < 4; i++) A.rrect(ctx, -7, -40 - bob + i * 6, 14, 4.5, 2);
      if (!fl) { ctx.strokeStyle = trimS; ctx.globalAlpha *= 0.6; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -40 - bob); ctx.lineTo(2, -30 - bob); ctx.lineTo(-1, -18 - bob); ctx.stroke(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha; }
    } else if (kit.suit === 'rig') {
      torso();
      ctx.fillStyle = C('#5a5f4a'); A.rrect(ctx, -8, -39 - bob, 16, 15, 3);
      ctx.fillStyle = C(trimS); ctx.fillRect(-8, -34 - bob, 16, 2); ctx.fillRect(-8, -29 - bob, 16, 2);
      ctx.fillStyle = C('#3a3d30'); ctx.fillRect(-8, -24 - bob, 16, 4);
      ctx.fillStyle = C('#8c93a6'); ctx.fillRect(-6, -23 - bob, 3, 6); ctx.fillRect(3, -23 - bob, 3, 6);
    }
    // front arm & main-hand weapon
    const gear = o.gear;
    if (gear === 'mace' && !o.off && o.kit == null) { ctx.fillStyle = C('#3a3346'); A.ellipse(ctx, 9, -27 - bob, 6, 11); ctx.strokeStyle = C('#ffd36b'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(9, -27 - bob, 6, 11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = C('#ffd36b'); A.star(ctx, 9, -27 - bob, 3.5, 4, 0); }
    if (gear === 'pistol' && !o.off && o.kit == null) { ctx.fillStyle = C('#7dffcf'); ctx.fillRect(-9, -22 - bob, 2, 9); ctx.fillStyle = C('#2a3a38'); ctx.fillRect(-10, -24 - bob, 4, 3); }
    if (gear === 'greatblade' && !o.attack) {
      ctx.save(); ctx.translate(-4, -30 - bob); ctx.rotate(-2.4);
      ctx.fillStyle = C('#2b2f40'); ctx.fillRect(-2, -3, 10, 6);
      ctx.fillStyle = fl ? '#fff' : (o.gearColor ? o.gearColor : 'rgba(150,235,255,0.95)'); ctx.fillRect(8, -2.5, 46, 5);
      ctx.restore();
      if (!fl) A.glow(ctx, -24, -50 - bob, 26, 'rgba(120,225,255,0.35)');
    }
    if (gear === 'staff' && !o.attack) { ctx.save(); ctx.translate(-6, -16 - bob); ctx.rotate(-0.25); ctx.fillStyle = C('#4a3f5e'); ctx.fillRect(-1.5, -44, 3, 50); ctx.fillStyle = fl ? '#fff' : (o.gearColor || '#c9a8ff'); A.star(ctx, 0, -46, 6, 4, t); ctx.restore(); if (!fl) A.glow(ctx, -16, -62 - bob, 24, 'rgba(200,170,255,0.4)'); }
    ctx.fillStyle = C(kit.suit === 'carapace' ? '#4a2a35' : '#5c6378');
    const armA = o.attack ? -0.9 + o.attack * 2.2 : 0.25 + sw * 0.3;
    ctx.save(); ctx.translate(3, -34 - bob); ctx.rotate(armA); ctx.fillRect(-2, 0, 5, 13);
    if (kit.suit === 'harness') { ctx.fillStyle = C(trimS); ctx.fillRect(-2, 8, 5, 2); }
    if (gear && !(gear === 'staff' && !o.attack)) A.held(ctx, gear, !!o.attack, fl, o.gearColor);
    ctx.restore();
    if (kit.suit === 'plate') { ctx.fillStyle = C('#c3cad9'); A.ellipse(ctx, 4, -38 - bob, 6, 4.5); ctx.fillStyle = C(trimS); ctx.fillRect(0, -36 - bob, 8, 1.4); } // front pauldron
    // helmet
    const hy = -48 - bob, H = kit.helm;
    if (H === 'organic') {
      ctx.fillStyle = C('#5a2c3a'); A.ellipse(ctx, 0, hy, 11.5, 11); ctx.fillStyle = C('#6a3c4c'); A.ellipse(ctx, -3, hy - 3, 8, 6);
      ctx.fillStyle = fl ? '#fff' : trimH; A.circle(ctx, 5, hy - 2, 2.6); A.circle(ctx, 8, hy + 2, 1.8); A.circle(ctx, 2, hy + 3, 1.5);
      if (!fl) { ctx.strokeStyle = 'rgba(255,120,150,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9, hy); ctx.quadraticCurveTo(-4, hy - 8, 1, hy - 10); ctx.stroke(); }
    } else {
      ctx.fillStyle = C(H === 'horned' ? '#8c93a6' : H === 'mask' ? '#3a3f55' : suitC); A.circle(ctx, 0, hy, 10.5);
      ctx.fillStyle = C('rgba(0,0,0,0.18)'); ctx.beginPath(); ctx.arc(0, hy, 10.5, 0.2, Math.PI - 0.2); ctx.fill();
      if (H === 'visor') { ctx.fillStyle = fl ? '#fff' : visor; A.rrect(ctx, -2, hy - 4, 13, 5, 2.5); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(6, hy - 3, 3, 1.2); }
      else if (H === 'mask') { ctx.fillStyle = C('#8c93a6'); A.rrect(ctx, 0, hy - 7, 11, 13, 4); ctx.fillStyle = C('#1a1d27'); for (let i = 0; i < 3; i++) ctx.fillRect(3, hy + 1 + i * 2, 7, 1); ctx.fillStyle = fl ? '#fff' : visor; ctx.fillRect(4, hy - 4, 6, 2); }
      else { ctx.fillStyle = fl ? '#fff' : visor; A.ellipse(ctx, 4, hy - 1, 6.6, 5.2); ctx.fillStyle = 'rgba(255,255,255,0.75)'; A.ellipse(ctx, 6, hy - 3, 2, 1.3); }
      if (H === 'crest') { ctx.fillStyle = C(trimH); ctx.beginPath(); ctx.moveTo(-6, hy - 8); ctx.quadraticCurveTo(-2, hy - 18, 6, hy - 13); ctx.lineTo(2, hy - 9); ctx.closePath(); ctx.fill(); }
      if (H === 'horned') { ctx.fillStyle = C('#d9d0c4'); for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 5 - 1, hy - 8); ctx.quadraticCurveTo(s * 12 - 2, hy - 14, s * 10 - 6, hy - 22); ctx.lineTo(s * 7 - 2, hy - 9); ctx.closePath(); ctx.fill(); } ctx.fillStyle = C(trimH); ctx.fillRect(-8, hy + 3, 16, 1.5); }
      if (H === 'halo') { ctx.strokeStyle = fl ? '#fff' : trimH; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(0, hy - 15, 9, 2.6, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.restore();
    if (!fl && (o.alpha == null || o.alpha > 0.3)) {
      A.glow(ctx, x + 4 * f * (o.scale || 1), y + (hy - 1) * (o.scale || 1), 20 * (o.scale || 1), o.visorGlow || 'rgba(120,225,255,0.35)');
      if (kit.helm === 'halo') A.glow(ctx, x, y + (hy - 15) * (o.scale || 1), 22 * (o.scale || 1), 'rgba(255,233,168,0.35)');
    }
  };

  // The weapon in the spaceman's hand, drawn in arm space (hand at 0,13; the arm points along +y).
  A.held = (ctx, gear, attacking, fl, col) => {
    const W = (c) => (fl ? '#fff' : c);
    ctx.save(); ctx.translate(0.5, 13); ctx.rotate(-Math.PI / 2);
    if (gear === 'dagger') { ctx.fillStyle = W('#3d4a52'); ctx.fillRect(-2, -2, 5, 4); ctx.fillStyle = W(col || '#9fffe8'); ctx.beginPath(); ctx.moveTo(3, -2.5); ctx.lineTo(17, 0); ctx.lineTo(3, 2.5); ctx.fill(); }
    else if (gear === 'wrench') { ctx.fillStyle = W('#6c7489'); ctx.fillRect(-2, -1.5, 20, 3); ctx.fillStyle = W(col || '#ffb347'); ctx.beginPath(); ctx.arc(20, 0, 5, 0.6, Math.PI * 2 - 0.6); ctx.lineTo(20, 0); ctx.fill(); if (attacking && !fl) A.glow(ctx, 22, 0, 14, 'rgba(255,200,90,0.6)'); }
    else if (gear === 'staff') { ctx.fillStyle = W('#4a3f5e'); ctx.fillRect(-14, -1.5, 52, 3); ctx.fillStyle = W(col || '#c9a8ff'); A.star(ctx, 40, 0, 6, 4, 0); if (!fl) A.glow(ctx, 40, 0, 18, 'rgba(200,170,255,0.5)'); }
    else if (gear === 'fist') { ctx.fillStyle = W('#5a6276'); A.rrect(ctx, -1, -5, 9, 10, 3); ctx.fillStyle = W(col || '#9fffe0'); ctx.fillRect(7, -4, 2.5, 8); if (attacking && !fl) A.glow(ctx, 10, 0, 16, 'rgba(150,255,220,0.5)'); }
    else if (gear === 'whip') { ctx.strokeStyle = W(col || '#ff6a9a'); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, 0); if (attacking) ctx.quadraticCurveTo(40, -16, 78, 2); else ctx.quadraticCurveTo(10, 10, 6, 26); ctx.stroke(); ctx.fillStyle = W('#4a2a35'); ctx.fillRect(-3, -2.5, 8, 5); }
    else if (gear === 'pistol') { ctx.fillStyle = W('#3d4a52'); ctx.fillRect(-2, -3, 13, 5); ctx.fillRect(-2, 1, 4, 6); ctx.fillStyle = W('#7dffcf'); ctx.fillRect(9, -2, 3, 2); }
    else if (gear === 'greatblade') { if (attacking) { ctx.fillStyle = W('#2b2f40'); ctx.fillRect(-4, -3, 10, 6); ctx.fillStyle = fl ? '#fff' : 'rgba(170,240,255,0.95)'; ctx.fillRect(6, -3, 62, 6); ctx.fillStyle = '#fff'; ctx.fillRect(6, -1, 62, 2); } }
    else if (gear === 'mace') { ctx.fillStyle = W('#5a4f3a'); ctx.fillRect(-2, -1.5, 18, 3); ctx.fillStyle = W('#ffd36b'); A.star(ctx, 19, 0, 7, 6, 0.3); }
    else if (gear === 'pike' || gear === 'lance') { ctx.fillStyle = W('#4a5068'); ctx.fillRect(-8, -1.5, gear === 'lance' ? 50 : 36, 3); ctx.fillStyle = W(gear === 'lance' ? '#7dffcf' : '#9fe8ff'); ctx.beginPath(); const L = gear === 'lance' ? 42 : 28; ctx.moveTo(L, -4); ctx.lineTo(L + 12, 0); ctx.lineTo(L, 4); ctx.fill(); }
    else if (gear === 'saber') { ctx.fillStyle = W('#d9b8ff'); ctx.fillRect(2, -1.5, 28, 3); ctx.fillStyle = W('#3d3346'); ctx.fillRect(-2, -4, 4, 8); }
    else if (gear === 'maul') { ctx.fillStyle = W('#4a5068'); ctx.fillRect(-2, -1.5, 24, 3); ctx.fillStyle = W('#ff6a5c'); ctx.fillRect(18, -8, 10, 16); }
    ctx.restore();
  };

  // Blank cores and Void Conduits lying on the ground.
  A.gemItem = (ctx, x, y, t, kind, tier) => {
    if (kind === 'orb') {
      // a Void Conduit: a sealed glass cylinder with a writhing violet thread inside, banded in hull metal
      A.glow(ctx, x, y, 26 + Math.sin(t * 5) * 4, 'rgba(180,140,255,0.55)');
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2) * 0.25);
      ctx.fillStyle = 'rgba(40,20,70,0.85)'; A.rrect(ctx, -5, -8, 10, 16, 4);
      ctx.strokeStyle = '#d9c4ff'; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const yy = -6 + i * 1.5, xx = Math.sin(t * 7 + i * 0.9) * 2.4; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
      ctx.fillStyle = '#8c93a6'; ctx.fillRect(-6, -9, 12, 3); ctx.fillRect(-6, 6, 12, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-3.5, -5, 1.2, 9);
      ctx.restore();
      return;
    }
    const c = kind === 'skill' ? '#6fd3ff' : '#c9d2e6';
    A.glow(ctx, x, y, 26 + Math.sin(t * 5) * 3, kind === 'skill' ? 'rgba(110,210,255,0.6)' : 'rgba(210,220,240,0.5)');
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2) * 0.3);
    ctx.fillStyle = c;
    if (kind === 'orb') A.circle(ctx, 0, 0, 6);
    else { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 7); } ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; A.circle(ctx, -2, -2, 2);
    ctx.restore();
    if (tier) { ctx.fillStyle = '#fff'; ctx.font = `700 9px ${GV.CFG.FONT}`; ctx.textAlign = 'center'; ctx.fillText('T' + tier, x, y - 12); }
  };
  A.itemDrop = (ctx, x, y, t, it) => {
    const c = GV.items.color(it);
    A.glow(ctx, x, y, 30 + Math.sin(t * 4) * 4, c);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5;
    ctx.fillStyle = c; ctx.fillRect(x - 1.5, y - 60, 3, 52);
    ctx.restore();
    ctx.fillStyle = '#0b0d16'; A.rrect(ctx, x - 9, y - 9, 18, 18, 4);
    ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.strokeRect(x - 8.5, y - 8.5, 17, 17);
    ctx.fillStyle = c; ctx.font = `700 11px ${GV.CFG.FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(GV.SLOTS[it.slot].icon, x, y + 1);
    ctx.textBaseline = 'alphabetic';
    if (it.rarity !== 'magic') { ctx.font = `700 10px ${GV.CFG.FONT}`; ctx.fillText(it.name, x, y - 16); }
  };
  A.ground = (ctx, g, t) => {
    const k = Math.min(1, g.t / 0.4, (g.max - g.t) / 0.3 + 0.2);
    if (g.color) { ctx.globalAlpha = 0.7 * k; A.glow(ctx, g.x, g.y - 8, g.r * 1.2, 'rgba(255,120,50,0.55)'); ctx.globalAlpha = 1; return; }
    ctx.save(); ctx.globalAlpha = 0.85 * k;
    A.glow(ctx, g.x, g.y - 6, g.r, 'rgba(255,200,90,0.35)');
    ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(g.x, g.y - 2, g.r, g.r * 0.18, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,220,130,0.8)';
    for (let i = 0; i < 6; i++) { const a = t * 0.8 + i; const rr = g.r * (0.3 + (i % 3) * 0.25); A.star(ctx, g.x + Math.cos(a) * rr, g.y - 6 - ((t * 40 + i * 20) % 50), 3, 4, t); }
    ctx.restore();
  };
  A.strikeWarn = (ctx, st, t) => {
    const k = 1 - st.t / st.max;
    ctx.strokeStyle = `rgba(255,160,80,${0.4 + k * 0.5})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(st.x, st.y - 4, st.r, st.r * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
    const sy = st.y - 600 * (1 - k);
    A.glow(ctx, st.x + 140 * (1 - k), sy, 50, 'rgba(255,150,70,0.8)');
    ctx.fillStyle = '#fff'; A.star(ctx, st.x + 140 * (1 - k), sy, 10, 5, t * 6);
  };
  A.lightning = (ctx, b) => {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = b.t / b.max;
    for (const [w, c] of [[6, b.color], [2, '#ffffff']]) {
      ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath();
      for (let i = 0; i < b.pts.length - 1; i++) {
        const a = b.pts[i], z = b.pts[i + 1];
        ctx.moveTo(a.x, a.y);
        for (let k = 1; k < 6; k++) ctx.lineTo(a.x + (z.x - a.x) * k / 6 + (Math.random() - 0.5) * 18, a.y + (z.y - a.y) * k / 6 + (Math.random() - 0.5) * 18);
        ctx.lineTo(z.x, z.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  };
  // Status effects shown on an enemy.
  A.ailments = (ctx, e, t) => {
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2, r = Math.max(e.w, e.h) * 0.7;
    if (e.ign) { A.glow(ctx, cx, cy, r, 'rgba(255,130,50,0.45)'); if (Math.random() < 0.4) { ctx.fillStyle = '#ffb36a'; ctx.fillRect(e.x + Math.random() * e.w, e.y + Math.random() * e.h * 0.6, 2, 3); } }
    if (e.frz > 0) { ctx.fillStyle = 'rgba(170,230,255,0.45)'; ctx.fillRect(e.x - 2, e.y - 2, e.w + 4, e.h + 4); }
    else if (e.chill > 0) A.glow(ctx, cx, cy, r, 'rgba(120,200,255,0.35)');
    if (e.shk > 0 && Math.random() < 0.5) { ctx.strokeStyle = '#fff27a'; ctx.lineWidth = 1.5; A.line(ctx, cx + (Math.random() - 0.5) * e.w, e.y, cx + (Math.random() - 0.5) * e.w, e.y + e.h * 0.6); }
    if ((e.cor && e.cor.length) || e.bloom) A.glow(ctx, cx, cy, r * 1.1, 'rgba(180,110,255,0.4)');
    if (e.stun > 0) { ctx.fillStyle = '#ffd36b'; for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; A.star(ctx, cx + Math.cos(a) * 14, e.y - 8 + Math.sin(a) * 4, 3, 4, 0); } }
  };

  A.npc = (ctx, n, t) => {
    if (n.kind === 'ione') A.spaceman(ctx, n.x, n.y, { facing: -1, t, cloak: '#3b2a3a', visor: '#ffd28a', visorGlow: 'rgba(255,200,120,0.35)', alpha: 0.85 + Math.sin(t * 3) * 0.1 });
    else if (n.kind === 'vesper') {
      A.spaceman(ctx, n.x, n.y, { facing: -1, t, cloak: '#3a321f', suit: '#b9b09a', visor: '#ffb347', visorGlow: 'rgba(255,170,70,0.35)' });
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; A.line(ctx, n.x - 18, n.y - 34, n.x - 18, n.y - 20);
      ctx.fillStyle = '#ffcf7a'; A.circle(ctx, n.x - 18, n.y - 16, 4);
      A.glow(ctx, n.x - 18, n.y - 16, 40 + Math.sin(t * 7) * 3, 'rgba(255,190,90,0.35)');
      // trade crates
      ctx.fillStyle = '#2a2433'; ctx.fillRect(n.x + 18, n.y - 22, 26, 22); ctx.fillRect(n.x + 24, n.y - 38, 18, 16);
      ctx.fillStyle = '#ffb347'; ctx.fillRect(n.x + 28, n.y - 14, 10, 2);
    } else {
      const a = 0.35 + Math.abs(Math.sin(t * 1.7)) * 0.35 * (Math.sin(t * 23) > -0.8 ? 1 : 0.2);
      A.spaceman(ctx, n.x, n.y, { facing: -1, t, cloak: '#2a3f55', suit: '#9fd8ff', visor: '#e8fbff', alpha: a });
    }
  };

  // ---------- pickups & props ----------
  A.memory = (ctx, x, y, t, pal, big) => {
    const s = (big ? 11 : 5.5) * (1 + Math.sin(t * 5 + x) * 0.15);
    A.glow(ctx, x, y, s * (big ? 4 : 3.2), col(pal.hB, 95, 58, 0.55));
    if (big) A.glow(ctx, x, y, s * 2.2, col(pal.hA, 95, 70, 0.4));
    ctx.fillStyle = '#fff';
    A.star(ctx, x, y, s, big ? 6 : 4, t * (big ? 0.8 : 2));
    ctx.fillStyle = col(pal.hB, 100, 75);
    A.star(ctx, x, y, s * 0.45, 4, -t);
  };

  A.beacon = (ctx, cp, t, pal) => {
    const x = cp.x + 10, y = cp.y;
    ctx.fillStyle = '#16141d'; ctx.fillRect(x - 3, y - 70, 6, 70); ctx.fillRect(x - 12, y - 6, 24, 6);
    ctx.fillStyle = '#2a2632'; ctx.fillRect(x - 8, y - 78, 16, 10);
    if (cp.on) {
      const p = 0.7 + Math.sin(t * 4) * 0.3;
      ctx.fillStyle = pal.accent; A.circle(ctx, x, y - 82, 6);
      A.glow(ctx, x, y - 82, 50 * p, col(pal.hB, 100, 55, 0.55));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, y - 400, 0, y - 82);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col(pal.hB, 100, 55, 0.25));
      ctx.fillStyle = g; ctx.fillRect(x - 4, y - 400, 8, 318);
      ctx.restore();
    } else {
      ctx.fillStyle = col(pal.hB, 40, 25); A.circle(ctx, x, y - 82, 5);
    }
  };

  A.flag = (ctx, ex, t, pal, active) => {
    const x = ex.x, y = ex.y;
    ctx.fillStyle = '#1a1822'; ctx.fillRect(x, y - 110, 5, 110);
    ctx.fillStyle = active ? '#0b0a10' : '#222';
    ctx.beginPath(); ctx.moveTo(x + 5, y - 108);
    for (let i = 0; i <= 6; i++) ctx.lineTo(x + 5 + i * 9, y - 108 + Math.sin(t * 4 + i * 0.8) * 4 * (i / 6));
    for (let i = 6; i >= 0; i--) ctx.lineTo(x + 5 + i * 9 - (i === 6 ? 6 : 0), y - 72 + Math.sin(t * 4 + i * 0.8) * 4 * (i / 6) + (i % 2 ? 4 : 0));
    ctx.closePath(); ctx.fill();
    if (active) {
      ctx.fillStyle = pal.accent; A.star(ctx, x + 30, y - 90, 7, 5, t);
      A.glow(ctx, x + 30, y - 90, 60, col(pal.hB, 100, 55, 0.4));
    }
  };

  A.rift = (ctx, rf, t, pal) => {
    const cx = rf.x + rf.w / 2, cy = rf.y + rf.h / 2;
    const p = 1 + (rf.pulse > 0 ? rf.pulse * 0.8 : 0) + Math.sin(t * 3 + rf.x) * 0.05;
    A.glow(ctx, cx, cy, 70 * p, col(pal.hB, 100, 50, 0.45));
    ctx.save(); ctx.translate(cx, cy); ctx.scale(p, p);
    ctx.fillStyle = rf.flash > 0 ? '#fff' : col(pal.hB, 95, 55);
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rr = 1 + Math.sin(a * 3 + t * 5) * 0.12;
      ctx.lineTo(Math.cos(a) * rf.w * 0.55 * rr, Math.sin(a) * rf.h * 0.55 * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#000';
    A.ellipse(ctx, 0, 0, rf.w * 0.38, rf.h * 0.44);
    ctx.strokeStyle = col(pal.hA, 100, 80, 0.6); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, rf.w * 0.25, rf.h * 0.3, t * 2, 0, 4); ctx.stroke();
    ctx.restore();
    if (rf.hp < rf.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(rf.x - 4, rf.y - 12, rf.w + 8, 5);
      ctx.fillStyle = pal.accent; ctx.fillRect(rf.x - 4, rf.y - 12, (rf.w + 8) * (rf.hp / rf.maxHp), 5);
    }
  };

  A.sigil = (ctx, s, t, owned) => {
    const ab = GV.ABILITIES[s.type];
    const y = s.y + Math.sin(t * 2 + s.x) * 3;
    ctx.fillStyle = 'rgba(5,6,12,0.75)'; A.circle(ctx, s.x, y, 15);
    ctx.strokeStyle = ab.color; ctx.globalAlpha = owned ? 1 : 0.55; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(s.x, y, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = ab.color; ctx.font = `700 16px ${GV.CFG.FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ab.glyph, s.x, y + 1);
    ctx.globalAlpha = 1;
    A.glow(ctx, s.x, y, 34, owned ? 'rgba(160,240,255,0.25)' : 'rgba(120,120,140,0.15)');
  };

  // ---------- the ship ----------
  A.ship = (ctx, x, y, s, t, lit, tilt = 0) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
    if (lit) {
      const fl = 0.8 + Math.sin(t * 30) * 0.2;
      A.glow(ctx, -118, 4, 70 * fl, 'rgba(255,70,90,0.6)');
      A.glow(ctx, -118, 4, 30 * fl, 'rgba(160,230,255,0.7)');
    }
    ctx.fillStyle = '#2b2f40';
    ctx.beginPath();
    ctx.moveTo(-110, -18); ctx.lineTo(40, -26); ctx.lineTo(110, -6); ctx.lineTo(120, 4); ctx.lineTo(60, 22); ctx.lineTo(-110, 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3d4258';
    ctx.beginPath(); ctx.moveTo(-60, -20); ctx.lineTo(-20, -52); ctx.lineTo(10, -52); ctx.lineTo(0, -24); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-60, 20); ctx.lineTo(-30, 44); ctx.lineTo(0, 44); ctx.lineTo(-5, 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a1d29'; ctx.fillRect(-122, -14, 14, 30);
    ctx.fillStyle = lit ? '#8fe9ff' : '#2c4654';
    ctx.beginPath(); ctx.moveTo(52, -20); ctx.lineTo(98, -7); ctx.lineTo(60, -4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(160,190,230,0.25)'; ctx.lineWidth = 1.5;
    A.line(ctx, -100, 0, 90, 0);
    ctx.fillStyle = lit ? '#ff3b4f' : '#552028';
    for (let i = 0; i < 5; i++) ctx.fillRect(-80 + i * 26, 6, 6, 3);
    ctx.fillStyle = '#d5dae4'; ctx.font = `700 9px ${GV.CFG.FONT}`; ctx.textAlign = 'left'; ctx.fillText('LANTERN', -40, -6);
    ctx.restore();
    if (lit) A.glow(ctx, x + 75 * s, y - 12 * s, 40 * s, 'rgba(140,230,255,0.3)');
  };

  // ---------- the cover (title screen art) ----------
  let coverBg = null, coverPal = null;
  A.cover = (ctx, t) => {
    if (!coverBg) { coverPal = A.palette(GV.UNIVERSE.system(0)); coverBg = A.background(coverPal, 99); }
    const pal = coverPal, H = 540, W = GV.CFG.W, ox = (W - 960) / 2;
    ctx.drawImage(coverBg.sky, 0, 0, W, H);
    ctx.save(); ctx.translate(ox, 0);
    A.blackHole(ctx, 610, 190, 96, t, pal);
    // memories spiraling into the void
    for (let i = 0; i < 22; i++) {
      const ph = (t * 0.05 + i / 22) % 1;
      const ang = i * 2.4 + ph * 6;
      const rad = 420 * (1 - ph) + 110;
      const x = 610 + Math.cos(ang) * rad, y = 190 + Math.sin(ang) * rad * 0.45;
      ctx.globalAlpha = Math.min(1, (1 - ph) * 2);
      A.memory(ctx, x, y, t + i, pal, false);
    }
    ctx.globalAlpha = 1;
    for (let k = -1; k < 2; k++) ctx.drawImage(coverBg.far, k * 1920 - ((t * 6) % 1920), 30);
    // the drifting wreck of the Lantern in the distance
    A.ship(ctx, 820, 330 + Math.sin(t * 0.6) * 6, 0.55, t, false, 0.18 + Math.sin(t * 0.4) * 0.03);
    // asteroid ledge
    ctx.fillStyle = pal.rockDark;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, 400);
    for (let x = 0; x <= 470; x += 18) ctx.lineTo(x, 418 - Math.sin(x * 0.012) * 18 + U.noise(x) * 8);
    ctx.lineTo(520, 470); ctx.lineTo(560, H);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col(pal.hA, 70, 70, 0.35); ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= 470; x += 18) ctx.lineTo(x, 418 - Math.sin(x * 0.012) * 18 + U.noise(x) * 8);
    ctx.stroke();
    // shards on the ledge
    ctx.fillStyle = '#06050a';
    [[60, 30], [120, 18], [400, 26], [430, 40]].forEach(([x, h]) => { ctx.beginPath(); ctx.moveTo(x - 8, 420); ctx.lineTo(x, 420 - h); ctx.lineTo(x + 8, 420); ctx.fill(); });
    // the spaceman, looking into the void
    ctx.fillStyle = pal.rockDark; ctx.fillRect(-ox - 2, 400, ox + 4, H - 400);
    A.spaceman(ctx, 300, 404, { facing: 1, t, scale: 2.3, vx: Math.sin(t) * 60 });
    ctx.restore();
    // vignette
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  };

  // ---------- ship cutscene ----------
  A.shipScene = (ctx, t, st) => {
    if (!coverBg) (A.coverOld || A.cover)(ctx, 0); // the ship cutscene borrows the old cover's sky
    const pal = coverPal, W = GV.CFG.W, ox = (W - 960) / 2;
    ctx.drawImage(coverBg.sky, 0, 0, W, 540);
    ctx.drawImage(coverBg.far, 0, 40);
    ctx.fillStyle = pal.rockDark; ctx.fillRect(0, 430, W, 110);
    ctx.fillStyle = pal.rockLite; ctx.fillRect(0, 430, W, 4);
    ctx.save(); ctx.translate(ox, 0);
    A.blackHole(ctx, 760, 140, 60, t, pal);
    const lit = st > 1.5;
    const lift = st > 4.5 ? (st - 4.5) * (st - 4.5) * 60 : 0;
    if (lit) for (let i = 0; i < 3; i++) A.glow(ctx, 360 + Math.random() * 40, 430, 50, 'rgba(255,80,90,0.15)');
    A.ship(ctx, 520 + lift * 0.6, 392 - lift, 1.4, t, lit, st > 4.5 ? -0.08 : 0.04);
    const cls = GV.CLASSES[GV.save.data.cls], lk = (cls && cls.look) || {};
    if (st < 4.5) A.spaceman(ctx, 250 + Math.min(st, 1.5) * 60, 430, { facing: 1, t, run: st < 1.5, scale: 1.3, cloak: lk.cloak, visor: lk.visor, suit: lk.suit, gear: cls && GV.WEAPONS[cls.weapon].art });
    ctx.restore();
  };
})();

// ---------- biomechanical kit: flesh grown through machinery ----------
// Shared pieces for every creature: wet flesh, riveted plating, cables, glowing seams and lenses.
(function () {
  const A = window.GV.art;
  const B = (A.bio = {
    flesh: (f) => (f ? '#fff' : '#3e2430'),
    fleshD: (f) => (f ? '#fff' : '#24141c'),
    fleshL: (f) => (f ? '#fff' : '#6a3c4c'),
    metal: (f) => (f ? '#fff' : '#283140'),
    metalD: (f) => (f ? '#fff' : '#151a24'),
    metalL: '#8796b0',
    // A riveted plate with a lit top edge.
    plate(ctx, x, y, w, h, r, f) {
      ctx.fillStyle = B.metal(f); A.rrect(ctx, x, y, w, h, r);
      if (f) return;
      ctx.strokeStyle = 'rgba(150,170,205,0.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + r, y + 0.5); ctx.lineTo(x + w - r, y + 0.5); ctx.stroke();
      ctx.fillStyle = 'rgba(160,180,210,0.6)';
      if (w > 14) { A.circle(ctx, x + 3, y + h - 3, 0.9); A.circle(ctx, x + w - 3, y + h - 3, 0.9); }
    },
    // A sagging cable between two points.
    cable(ctx, x1, y1, x2, y2, sag, col, w) {
      ctx.strokeStyle = col || '#1a1f2a'; ctx.lineWidth = w || 2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + sag, x2, y2); ctx.stroke();
    },
    // Glowing seam where metal is stitched into flesh.
    seam(ctx, pts, col, t) {
      ctx.save();
      ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.6 + Math.sin((t || 0) * 5) * 0.25;
      if (!GV.CFG.LOWFX) { ctx.shadowColor = col; ctx.shadowBlur = 6; }
      ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      ctx.stroke(); ctx.restore();
    },
    // A mechanical eye: metal socket, glowing iris, pinhole pupil.
    eye(ctx, x, y, r, col, f, soft) {
      ctx.fillStyle = B.metalD(f); A.circle(ctx, x, y, r + 1.6);
      ctx.fillStyle = f ? '#fff' : col; A.circle(ctx, x, y, r);
      ctx.fillStyle = '#05060a'; A.circle(ctx, x + r * 0.15, y, r * 0.35);
      if (soft) A.glow(ctx, x, y, r * 4, soft);
    },
    // Pulsing veins on flesh.
    veins(ctx, x, y, len, ang, t, col) {
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha = 0.35 + Math.sin(t * 4) * 0.15;
      for (let i = -1; i <= 1; i++) {
        const a = ang + i * 0.5;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + Math.sin(t * 3 + i) * 2, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    // Piston leg: metal thigh, flesh joint, metal shin.
    leg(ctx, x1, y1, kx, ky, x2, y2, f, w) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = B.metal(f); ctx.lineWidth = w || 3; A.line(ctx, x1, y1, kx, ky);
      ctx.strokeStyle = B.metalD(f); A.line(ctx, kx, ky, x2, y2);
      ctx.fillStyle = B.fleshL(f); A.circle(ctx, kx, ky, (w || 3) * 0.8);
      ctx.lineCap = 'butt';
    },
  });
})();
