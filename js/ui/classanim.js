// Galactic Void — class picker portraits. Each class has three animations of its own:
//   idle   : what it does while you look at the row
//   hover  : a show-off when you point at it (mouse, keyboard focus or controller)
//   pick   : a flourish when you choose it, played before the game moves on
// Portraits render at 2x into a 340px canvas with the figure anchored so even the longest weapon
// at the end of its swing stays inside the frame.
(function () {
  const GV = window.GV, A = GV.art;
  const S = 340, FEET = 306, SC = 2.35;
  const TAU = Math.PI * 2;
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const hexA = (c, a) => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return c; const n = parseInt(m[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  function base(k) {
    const c = GV.CLASSES[k], W = GV.WEAPONS[c.weapon], O = c.offhand && GV.WEAPONS[c.offhand];
    return { facing: 1, scale: SC, cloak: c.look.cloak, visor: c.look.visor, suit: c.look.suit, visorGlow: c.look.glow,
      gear: W.art, gearColor: W.color, kit: Object.assign({ c: {} }, c.kit), off: O ? (O.hand === 'off' ? 'shield' : O.art) : null, offColor: O && O.color };
  }
  // a swing that plays once every `period` seconds and holds still between
  const swingCycle = (t, period, dur) => { const p = (t % period) / dur; return p < 1 ? p : 0; };
  const ring = (g, x, y, r, col, a, w = 3, squash = 0.28) => { if (a <= 0 || r <= 0) return; g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.ellipse(x, y, r, r * squash, 0, 0, TAU); g.stroke(); g.restore(); };
  const spark = (g, x, y, r, col, a) => { if (a <= 0) return; g.save(); g.globalAlpha = a; A.glow(g, x, y, r * 3, hexA(col, 0.6)); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r * 0.5, 0, TAU); g.fill(); g.restore(); };
  // deterministic bursts: n particles flying out from (x,y), at time p in [0,1]
  const burst = (g, x, y, n, reach, col, p, seed = 1, up = 0) => {
    for (let i = 0; i < n; i++) {
      const a = ((i * 2.399 + seed) % TAU), sp = 0.55 + ((i * 7.31 + seed) % 1) * 0.45;
      const d = ease(p) * reach * sp;
      spark(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7 - up * p * 30, 2.2 + (i % 3), col, (1 - p) * 0.95);
    }
  };

  function drone(g, x, y, t, a) {
    g.save(); g.globalAlpha = a; A.glow(g, x, y, 26, 'rgba(255,180,80,0.45)');
    g.fillStyle = '#4a4f63'; g.beginPath(); g.ellipse(x, y, 12, 6.5, 0, 0, TAU); g.fill();
    g.fillStyle = '#6c7489'; g.beginPath(); g.ellipse(x, y - 2, 8, 3, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffb347'; g.beginPath(); g.arc(x + 5, y + 1, 2.6, 0, TAU); g.fill();
    g.strokeStyle = '#8c93a6'; g.lineWidth = 2; const r = Math.sin(t * 45) * 3;
    g.beginPath(); g.moveTo(x - 14, y - 7 + r); g.lineTo(x - 4, y - 7 - r); g.moveTo(x + 4, y - 7 - r); g.lineTo(x + 14, y - 7 + r); g.stroke();
    g.restore();
  }
  // Each class: { x: anchor, idle(g,t,o), hover(g,t,h,o), pick(g,t,o) }. They adjust the spaceman
  // options `o` and draw their own effects, behind (pre) or in front (post) of the figure.
  const CLS = {
    ranger: {
      x: 150,
      idle(t, o) { o.vx = Math.sin(t * 0.9) * 70; o.run = false; },
      hover(t, o, fx) {
        o.attack = 0.92 + Math.sin(t * 2) * 0.02; o.vx = 90;
        const shot = (t % 0.55) / 0.55;
        if (shot < 0.35) { const x0 = o.x + 52, y0 = FEET - 78; fx.post.push((g) => { spark(g, x0, y0, 4, '#7dffcf', 1 - shot / 0.35); g.save(); g.globalAlpha = 1 - shot / 0.35; g.strokeStyle = '#bffff0'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + 6, y0); g.lineTo(x0 + 6 + 40 + shot * 60, y0 - 2); g.stroke(); g.restore(); }); }
      },
      pick(p, o, fx) {
        const hop = clamp01(p / 0.6);
        o.y = -Math.sin(Math.PI * hop) * 46; o.air = hop > 0 && hop < 1;
        if (hop > 0 && hop < 1) fx.rot = -TAU * ease(hop);
        if (p > 0.62) { o.attack = 0.95; o.squash = Math.max(0, 0.3 - (p - 0.62) * 1.2); const s = clamp01((p - 0.66) / 0.3); fx.post.push((g) => { spark(g, o.x + 54, FEET - 76, 6, '#7dffcf', 1 - s); burst(g, o.x + 60, FEET - 76, 8, 46, '#7dffcf', s, 3); }); }
        fx.pre.push((g) => ring(g, o.x, FEET + 2, 20 + p * 60, '#7dffcf', p > 0.6 ? (1 - p) * 1.5 : 0));
      },
    },
    knight: {
      x: 150, sc: 1.9,
      idle(t, o) { o.vx = Math.sin(t * 0.7) * 40; },
      hover(t, o, fx) {
        const s = swingCycle(t, 1.25, 0.42); o.attack = s * 0.72; o.vx = 120;
        if (s > 0.25) fx.pre.push((g) => { g.save(); g.globalAlpha = 0.5 * (1 - s); g.strokeStyle = '#aaf0ff'; g.lineWidth = 10; g.beginPath(); g.arc(o.x + 8, FEET - 76, 96, -2.2, -2.2 + s * 2.8); g.stroke(); g.restore(); });
        fx.pre.push((g) => A.glow(g, o.x + 20, FEET - 90, 120, 'rgba(140,230,255,0.16)'));
      },
      pick(p, o, fx) {
        const up = clamp01(p / 0.45), down = clamp01((p - 0.45) / 0.15);
        o.y = p < 0.45 ? -Math.sin(up * Math.PI / 2) * 40 : -40 * (1 - down);
        o.air = p < 0.6; o.attack = p < 0.3 ? 0 : clamp01((p - 0.3) / 0.3) * 0.85;
        if (p > 0.6) { const s = clamp01((p - 0.6) / 0.4); o.squash = Math.max(0, 0.35 - s); o.attack = 0.85; fx.pre.push((g) => { ring(g, o.x + 20, FEET + 2, 20 + s * 80, '#aaf0ff', 1 - s, 4, 0.22); ring(g, o.x + 20, FEET + 2, 10 + s * 60, '#ffffff', (1 - s) * 0.8, 2); }); fx.shake = (1 - s) * 4; fx.post.push((g) => burst(g, o.x + 60, FEET - 4, 10, 60, '#aaf0ff', s, 5, 1)); }
      },
    },
    paladin: {
      x: 155,
      idle(t, o, fx) { fx.pre.push((g) => A.glow(g, o.x, FEET - 80, 80 + Math.sin(t * 2) * 8, 'rgba(255,220,120,0.14)')); },
      hover(t, o, fx) {
        o.attack = 0.08 + Math.sin(t * 3) * 0.04; // mace raised high
        const k = (Math.sin(t * 3) + 1) / 2;
        fx.pre.push((g) => { A.glow(g, o.x, FEET - 90, 120 + k * 20, 'rgba(255,215,110,0.28)'); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * 0.6; g.save(); g.globalAlpha = 0.25 + 0.2 * k; g.strokeStyle = '#ffe9a8'; g.lineWidth = 2; g.beginPath(); g.moveTo(o.x + Math.cos(a) * 60, FEET - 90 + Math.sin(a) * 60); g.lineTo(o.x + Math.cos(a) * (86 + k * 14), FEET - 90 + Math.sin(a) * (86 + k * 14)); g.stroke(); g.restore(); } });
      },
      pick(p, o, fx) {
        o.squash = p < 0.3 ? ease(p / 0.3) * 0.3 : Math.max(0, 0.3 - (p - 0.3) * 2);
        o.attack = p < 0.35 ? 0.05 : clamp01((p - 0.35) / 0.25);
        const s = clamp01((p - 0.5) / 0.5);
        fx.pre.push((g) => { A.glow(g, o.x, FEET - 110, 60 + s * 70, `rgba(255,225,130,${0.5 * (1 - s)})`); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.save(); g.globalAlpha = (1 - s) * 0.9; g.strokeStyle = '#fff2c4'; g.lineWidth = 3; g.beginPath(); g.moveTo(o.x + Math.cos(a) * (30 + s * 45), FEET - 110 + Math.sin(a) * (30 + s * 45)); g.lineTo(o.x + Math.cos(a) * (50 + s * 70), FEET - 110 + Math.sin(a) * (50 + s * 70)); g.stroke(); g.restore(); } });
        if (s > 0) fx.post.push((g) => burst(g, o.x + 50, FEET - 60, 10, 50, '#ffd36b', s, 2));
      },
    },
    engineer: {
      x: 132,
      idle(t, o, fx) {
        // checks a wrist readout while his drone idles at his shoulder; no swinging
        o.vx = Math.sin(t * 0.8) * 30;
        const dx = o.x - 46 + Math.sin(t * 1.3) * 4, dy = FEET - 150 + Math.sin(t * 2.1) * 6;
        fx.pre.push((g) => drone(g, dx, dy, t, 0.8));
        const hx = o.x + 30, hy = FEET - 92, k = 0.6 + 0.4 * Math.sin(t * 3);
        fx.post.push((g) => {
          g.save(); g.globalAlpha = 0.55 * k; g.fillStyle = 'rgba(255,180,80,0.25)'; g.strokeStyle = '#ffb347'; g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + 26, hy - 26); g.lineTo(hx + 56, hy - 26); g.lineTo(hx + 30, hy); g.closePath(); g.fill(); g.stroke();
          g.globalAlpha = 0.9 * k; for (let i = 0; i < 3; i++) { const w = 10 + ((t * 30 + i * 9) % 18); g.fillRect(hx + 22 + i * 3, hy - 20 + i * 6, w, 1.6); }
          g.restore();
        });
      },
      hover(t, o, fx) {
        // a turret blueprint draws itself; the drone scans it; he welds it together
        const tx = o.x + 118, build = Math.min(1, t / 1.6), weld = swingCycle(t, 0.5, 0.22);
        o.attack = 0.5 + weld * 0.4; o.vx = 50;
        const a = t * 2.2, dx = tx + Math.cos(a) * 34, dy = FEET - 130 + Math.sin(a * 2) * 8;
        fx.pre.push((g) => {
          // blueprint grid on the floor
          g.save(); g.globalAlpha = 0.35; g.strokeStyle = '#ffb347'; g.lineWidth = 1;
          for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(tx + i * 12, FEET - 3); g.lineTo(tx + i * 16, FEET + 6); g.stroke(); }
          g.beginPath(); g.ellipse(tx, FEET + 1, 44, 7, 0, 0, TAU); g.stroke(); g.restore();
          // the turret, line by line, then filling in
          const seg = [[-18, 0, 18, 0], [18, 0, 14, -10], [14, -10, -14, -10], [-14, -10, -18, 0], [-4, -10, -4, -34], [4, -10, 4, -34], [-14, -34, 14, -34], [-14, -34, -12, -48], [14, -34, 12, -48], [-12, -48, 12, -48], [10, -44, 36, -44], [10, -38, 36, -38], [36, -44, 36, -38]];
          g.save(); g.translate(tx, FEET); g.scale(1.35, 1.35); g.strokeStyle = '#ffd08a'; g.lineWidth = 2; g.shadowColor = '#ffb347'; g.shadowBlur = 8;
          const n = seg.length * Math.min(1, build * 1.6);
          for (let i = 0; i < n; i++) { const [x0, y0, x1, y1] = seg[i], f = Math.min(1, n - i); g.globalAlpha = 0.85; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f); g.stroke(); }
          g.shadowBlur = 0;
          const fill = Math.max(0, (build - 0.6) / 0.4);
          if (fill > 0) { g.globalAlpha = fill; g.fillStyle = '#4c513e'; g.fillRect(-18, -10, 36, 10); g.fillStyle = '#6a6f58'; g.fillRect(-4, -34, 8, 24); g.fillStyle = '#8c93a6'; g.fillRect(-14, -48, 28, 14); g.fillStyle = '#3a3d30'; g.fillRect(10, -44, 26, 6); }
          if (build >= 1) { const pulse = (Math.sin(t * 6) + 1) / 2; g.globalAlpha = 1; A.glow(g, 0, -41, 16 + pulse * 6, 'rgba(255,190,90,0.8)'); g.fillStyle = '#fff2c4'; g.fillRect(-3, -43, 6, 4); }
          g.restore();
          // the drone's scan cone
          g.save(); g.globalAlpha = 0.18 + 0.1 * Math.sin(t * 9); g.fillStyle = '#ffb347'; g.beginPath(); g.moveTo(dx, dy + 4); g.lineTo(tx - 24, FEET - 2); g.lineTo(tx + 24, FEET - 2); g.closePath(); g.fill(); g.restore();
        });
        fx.post.push((g) => drone(g, dx, dy, t, 1));
        if (weld > 0.4) fx.post.push((g) => { const p = (weld - 0.4) / 0.6; spark(g, tx - 20, FEET - 24, 5, '#ffe3a0', 1 - p); burst(g, tx - 20, FEET - 24, 7, 30, '#ffb347', p, Math.floor(t / 0.5), 1); });
      },
      pick(p, o, fx) {
        o.attack = p < 0.35 ? clamp01(p / 0.35) : 1; o.squash = p > 0.3 && p < 0.5 ? 0.25 : 0;
        const rise = ease(clamp01((p - 0.35) / 0.35)), tx = o.x + 92;
        fx.pre.push((g) => {
          g.save(); g.translate(tx, FEET); g.globalAlpha = rise;
          g.fillStyle = '#4c513e'; g.fillRect(-16, -8 * rise, 32, 8 * rise);
          g.fillStyle = '#6a6f58'; g.fillRect(-4, -30 * rise, 8, 24 * rise);
          g.fillStyle = '#8c93a6'; g.beginPath(); g.ellipse(0, -32 * rise, 12, 9, 0, 0, TAU); g.fill();
          g.fillStyle = '#3a3d30'; g.fillRect(4, -35 * rise, 18, 5);
          if (p > 0.75) { A.glow(g, 26, -33, 18, 'rgba(255,180,80,0.7)'); }
          g.restore();
        });
        if (p > 0.3) fx.post.push((g) => burst(g, o.x + 60, FEET - 6, 12, 50, '#ffb347', clamp01((p - 0.3) / 0.6), 4, 1));
      },
    },
    starcaller: {
      x: 168,
      idle(t, o, fx) {
        o.y = -4 - Math.sin(t * 1.6) * 4;
        fx.pre.push((g) => { for (let i = 0; i < 3; i++) { const a = t * 0.9 + i * TAU / 3; const x = o.x + Math.cos(a) * 54, y = FEET - 96 + Math.sin(a) * 14; spark(g, x, y, 2.5, '#c9a8ff', Math.sin(a) > 0 ? 0.9 : 0.4); } });
      },
      hover(t, o, fx) {
        o.y = -18 - Math.sin(t * 2.2) * 5; o.air = true; o.attack = 0.22 + Math.sin(t * 4) * 0.03;
        fx.pre.push((g) => { A.glow(g, o.x, FEET - 110, 110, 'rgba(200,170,255,0.25)'); for (let i = 0; i < 6; i++) { const a = t * 2.4 + i * TAU / 6; spark(g, o.x + Math.cos(a) * 72, FEET - 104 + o.y + Math.sin(a) * 20, 3, i % 2 ? '#c9a8ff' : '#9fe8ff', 0.9); } });
        fx.pre.push((g) => ring(g, o.x, FEET + 2, 34 + Math.sin(t * 4) * 4, '#c9a8ff', 0.5, 2));
      },
      pick(p, o, fx) {
        o.y = -18 - ease(clamp01(p / 0.4)) * 16; o.air = true; o.attack = p < 0.4 ? 0.22 : clamp01(0.22 + (p - 0.4) * 2.4);
        const s = clamp01((p - 0.45) / 0.55);
        fx.pre.push((g) => { A.glow(g, o.x + 30, FEET - 140, 40 + s * 130, `rgba(210,180,255,${0.7 * (1 - s)})`); ring(g, o.x + 20, FEET - 120, 20 + s * 120, '#e6d6ff', 1 - s, 3, 1); });
        if (s > 0) fx.post.push((g) => burst(g, o.x + 24, FEET - 130, 14, 110, '#c9a8ff', s, 7));
      },
    },
    monk: {
      x: 150,
      idle(t, o, fx) { o.squash = (Math.sin(t * 1.4) + 1) * 0.03; fx.pre.push((g) => A.glow(g, o.x, FEET - 80, 70 + Math.sin(t * 1.4) * 10, 'rgba(150,255,220,0.12)')); },
      hover(t, o, fx) {
        const s = (t / 0.26) % 1; o.attack = s; o.vx = 100;
        const n = Math.floor(t / 0.26);
        fx.pre.push((g) => { g.save(); g.globalAlpha = 0.25; A.spaceman(g, o.x - 16, FEET + (o.y || 0), Object.assign({}, o, { attack: (s + 0.5) % 1, alpha: 0.25, visorGlow: 'rgba(0,0,0,0)' })); g.restore(); });
        if (s > 0.5) fx.post.push((g) => spark(g, o.x + 50 + (n % 2) * 6, FEET - 74 - (n % 3) * 8, 5, '#9fffe0', 1 - (s - 0.5) * 2));
      },
      pick(p, o, fx) {
        const j = clamp01(p / 0.6);
        o.y = -Math.sin(Math.PI * j) * 54; o.air = j > 0 && j < 1; o.attack = clamp01(p / 0.35);
        if (j > 0.1 && j < 0.9) fx.rot = TAU * ease((j - 0.1) / 0.8) * 0.999;
        fx.pre.push((g) => { ring(g, o.x, FEET + 2, 30 + p * 70, '#9fffe0', (1 - p), 3); A.glow(g, o.x, FEET - 80 + (o.y || 0), 80, `rgba(150,255,220,${0.4 * (1 - p)})`); });
        if (p > 0.6) fx.post.push((g) => burst(g, o.x, FEET - 10, 10, 60, '#9fffe0', (p - 0.6) / 0.4, 9, 1));
      },
    },
    symbiote: {
      x: 140,
      idle(t, o) { o.vx = Math.sin(t * 1.3) * 160; o.squash = 0.06 + Math.sin(t * 2.3) * 0.04; },
      hover(t, o, fx) {
        // the suit wakes: it swells and breathes, veins pulse, tentacles reach and lash, the whip cracks
        const s = swingCycle(t, 1.1, 0.34), beat = Math.pow((Math.sin(t * 5.2) + 1) / 2, 3);
        o.attack = s; o.vx = 220; o.squash = 0.04 - beat * 0.06;
        fx.scale = 1 + beat * 0.035;
        const cx = o.x, cy = FEET - 70;
        fx.pre.push((g) => {
          // living stain creeping across the floor
          const sp = Math.min(1, t / 1.5);
          g.save(); g.globalAlpha = 0.5; const gr = g.createRadialGradient(cx, FEET + 2, 4, cx, FEET + 2, 30 + sp * 80); gr.addColorStop(0, 'rgba(120,20,50,0.9)'); gr.addColorStop(1, 'rgba(120,20,50,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, FEET + 2, 30 + sp * 80, 8 + sp * 8, 0, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(255,90,140,0.55)'; g.lineWidth = 1.5;
          for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI + 0.25, L = (20 + sp * 70) * (0.6 + (i % 3) * 0.2); g.beginPath(); g.moveTo(cx, FEET + 2); g.quadraticCurveTo(cx + Math.cos(a) * L * 0.5 * (i % 2 ? 1 : -1), FEET + 4 + Math.sin(t * 2 + i) * 2, cx + Math.cos(a) * L * (i % 2 ? 1 : -1), FEET + 3 + (i % 3)); g.stroke(); }
          g.restore();
          A.glow(g, cx, cy - 24, 80 + beat * 24, `rgba(255,70,120,${0.16 + beat * 0.18})`);
          // tentacles from the back, reaching forward over the shoulders and lashing
          for (let i = 0; i < 3; i++) {
            const ph = t * 3.1 + i * 2.1, reach = 40 + 26 * Math.sin(ph) + i * 8, lift = 30 + i * 16;
            const x0 = cx - 12, y0 = cy - 24 + i * 10, x3 = cx + reach + 30, y3 = cy - lift + Math.cos(ph * 1.7) * 14;
            g.save(); g.lineCap = 'round';
            for (const [w, col] of [[7 - i, '#3e1f2b'], [4.5 - i * 0.8, '#6e3446']]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x0 - 30, y0 - 40 - i * 8, x3 - 40, y3 - 50, x3, y3); g.stroke(); }
            g.fillStyle = '#ff6a9a'; g.globalAlpha = 0.6 + 0.4 * beat; g.beginPath(); g.arc(x3, y3, 2.6, 0, TAU); g.fill();
            g.restore();
          }
        });
        fx.post.push((g) => {
          // pulsing veins over the carapace
          g.save(); g.globalAlpha = 0.35 + beat * 0.6; g.strokeStyle = '#ff7aa6'; g.lineWidth = 1.4; g.shadowColor = '#ff4f7a'; g.shadowBlur = 6 + beat * 8;
          for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(cx + 4, cy - 30 + i * 2); g.quadraticCurveTo(cx - 6 + i * 4, cy - 10 + i * 6, cx + 2 - i * 3, cy + 18 + i * 3); g.stroke(); }
          g.restore();
          // drips
          for (let i = 0; i < 3; i++) { const q = (t * 0.9 + i * 0.37) % 1; spark(g, cx - 10 + i * 12, cy + q * 66, 1.8, '#ff4f7a', (1 - q) * 0.8); }
          // whip crack: a snap mark and a spray where it lands
          if (s > 0.55) { const p = (s - 0.55) / 0.45, kx = o.x + 150, ky = FEET - 70; spark(g, kx, ky, 7, '#ff6a9a', 1 - p); burst(g, kx, ky, 9, 40, '#ff4f7a', p, Math.floor(t / 1.1)); g.save(); g.globalAlpha = 1 - p; g.strokeStyle = '#ffd0e0'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; g.beginPath(); g.moveTo(kx + Math.cos(a) * 6, ky + Math.sin(a) * 6); g.lineTo(kx + Math.cos(a) * (12 + p * 18), ky + Math.sin(a) * (12 + p * 18)); g.stroke(); } g.restore(); }
        });
      },
      pick(p, o, fx) {
        const k = p < 0.5 ? ease(p / 0.5) : 1 - ease((p - 0.5) / 0.5);
        fx.scale = 1 + k * 0.14; o.squash = -k * 0.1; o.vx = 260;
        fx.pre.push((g) => A.glow(g, o.x, FEET - 90, 80 + k * 40, `rgba(255,70,120,${0.25 + k * 0.4})`));
        if (p > 0.45) fx.post.push((g) => burst(g, o.x, FEET - 90, 16, 105, '#ff4f7a', (p - 0.45) / 0.55, 11));
      },
    },
    lancer: {
      x: 112, sc: 2.15,
      idle(t, o, fx) {
        o.vx = Math.sin(t * 0.9) * 90;
        fx.pre.push((g) => { for (let i = 0; i < 6; i++) { const q = (t * 0.25 + i / 6) % 1; spark(g, o.x - 40 + i * 18 + Math.sin(t + i) * 6, FEET - 10 - q * 150, 1.6, '#cfe6ff', Math.sin(q * Math.PI) * 0.8); } });
      },
      hover(t, o, fx) {
        // three quick thrusts, then a breath: ice bursts at the tip, frost rolls along the floor
        const cyc = t % 1.05, k = cyc < 0.6 ? Math.floor(cyc / 0.2) : -1, ph = k >= 0 ? (cyc - k * 0.2) / 0.2 : 0;
        const ext = k >= 0 ? Math.sin(Math.min(1, ph * 1.6) * Math.PI) : 0;
        o.attack = 0.49; o.vx = 140; o.x = 112 + ext * 16;
        const tipX = 112 + 52 + 108 + ext * 16, tipY = FEET - 84;
        fx.pre.push((g) => {
          g.save(); g.globalAlpha = 0.35; const fg = g.createLinearGradient(40, 0, 320, 0); fg.addColorStop(0, 'rgba(180,215,255,0)'); fg.addColorStop(0.5, 'rgba(180,215,255,.55)'); fg.addColorStop(1, 'rgba(180,215,255,0)');
          g.fillStyle = fg; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(120 + ((t * 40 + i * 70) % 200), FEET - 2, 60, 7, 0, 0, TAU); g.fill(); } g.restore();
          A.glow(g, tipX - 40, tipY, 90, 'rgba(120,175,255,0.16)');
        });
        if (k >= 0 && ph > 0.25) fx.post.push((g) => {
          const q = (ph - 0.25) / 0.75;
          for (let i = 0; i < 6; i++) { const a = -0.9 + i * 0.36; const d = 6 + q * 26; g.save(); g.globalAlpha = 1 - q; g.fillStyle = '#e6f2ff'; g.translate(tipX + Math.cos(a) * d, tipY + Math.sin(a) * d); g.rotate(a); g.beginPath(); g.moveTo(5, 0); g.lineTo(0, 2); g.lineTo(-5, 0); g.lineTo(0, -2); g.closePath(); g.fill(); g.restore(); }
          spark(g, tipX, tipY, 5, '#9cc8ff', 1 - q);
        });
      },
      pick(p, o, fx) {
        // a dragoon leap, a plunge, and the ground freezes into spikes
        const up = Math.min(1, p / 0.42), down = Math.max(0, Math.min(1, (p - 0.42) / 0.14));
        o.y = p < 0.42 ? -Math.sin(up * Math.PI / 2) * 64 : -64 * (1 - down);
        o.air = p < 0.56; o.attack = p < 0.42 ? 0.2 : 0.72;
        if (p > 0.56) {
          const s2 = Math.min(1, (p - 0.56) / 0.44);
          o.squash = Math.max(0, 0.3 - s2);
          fx.pre.push((g) => {
            for (let i = -4; i <= 4; i++) { const h = (34 - Math.abs(i) * 6) * Math.min(1, s2 * 3) * (1 - Math.max(0, s2 - 0.7) / 0.3), x = o.x + 60 + i * 15; if (h <= 0) continue;
              const gr = g.createLinearGradient(0, FEET, 0, FEET - h); gr.addColorStop(0, '#5f8fd0'); gr.addColorStop(1, '#eaf4ff'); g.fillStyle = gr;
              g.beginPath(); g.moveTo(x - 6, FEET + 1); g.lineTo(x + (i % 2) * 2, FEET - h); g.lineTo(x + 6, FEET + 1); g.closePath(); g.fill(); }
            ring(g, o.x + 60, FEET + 2, 20 + s2 * 70, '#cfe6ff', 1 - s2, 3, 0.22);
          });
          fx.shake = (1 - s2) * 4;
          fx.post.push((g) => burst(g, o.x + 60, FEET - 20, 12, 70, '#cfe6ff', s2, 13));
        } else if (p > 0.2) fx.pre.push((g) => spark(g, o.x + 20, FEET - 120 + o.y, 6, '#9cc8ff', 0.6));
      },
    },
  };

  const PICK_T = 1.15;
  GV.clsAnim = {
    SIZE: S, PICK_T,
    // state: { hoverT: seconds since hover began (or -1), hoverOut: seconds since it ended, pickT: seconds since picked (or -1) }
    draw(g, k, t, st) {
      const def = CLS[k], c = GV.CLASSES[k]; if (!def || !c) return;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S);
      const o = base(k); o.x = def.x; o.t = t; o.y = 0; if (def.sc) o.scale = def.sc;
      const fx = { pre: [], post: [], rot: 0, scale: 1, shake: 0 };
      const picking = st.pickT >= 0, hovering = !picking && st.hoverT >= 0;
      A.glow(g, def.x, FEET - 100, 120, c.look.glow);
      if (picking) def.pick(clamp01(st.pickT / PICK_T), o, fx);
      else if (hovering) def.hover(st.hoverT, o, fx);
      else def.idle(t, o, fx);
      // floor
      g.save(); g.globalAlpha = 0.55; const fg = g.createRadialGradient(def.x, FEET + 2, 4, def.x, FEET + 2, 120); fg.addColorStop(0, hexA(c.color, 0.35)); fg.addColorStop(1, hexA(c.color, 0)); g.fillStyle = fg; g.beginPath(); g.ellipse(def.x, FEET + 2, 120, 16, 0, 0, TAU); g.fill(); g.restore();
      const sx = fx.shake ? Math.sin(t * 90) * fx.shake : 0;
      g.save(); g.translate(sx, 0);
      for (const f of fx.pre) f(g);
      // the figure, with any flip or swell around its middle
      const cy = FEET + o.y - 34 * o.scale;
      g.save();
      if (fx.rot || fx.scale !== 1) { g.translate(o.x, cy); g.rotate(fx.rot); g.scale(fx.scale, fx.scale); g.translate(-o.x, -cy); }
      A.spaceman(g, o.x, FEET + o.y, o);
      g.restore();
      for (const f of fx.post) f(g);
      g.restore();
    },
  };
})();

// ---------- skill previews: a looping vignette of a class casting one of its skills ----------
// Drawn per skill type (projectile, slam, nova, turret...) in that skill's own colour, by that
// class's own spaceman, at a training dummy. Shown in the tooltip on the class picker.
(function () {
  const GV = window.GV, A = GV.art, TAU = Math.PI * 2;
  const W = 480, H = 240, GY = 214, SC = 2.0, LOOP = 1.8;
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const rgba = (c, a) => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return c; const n = parseInt(m[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const dot = (g, x, y, r, c, a = 1) => { if (a <= 0) return; g.save(); g.globalAlpha = a; A.glow(g, x, y, r * 3.2, rgba(c, 0.55)); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r * 0.55, 0, TAU); g.fill(); g.restore(); };
  const ring = (g, x, y, r, c, a, w = 3, sq = 0.3) => { if (a <= 0 || r <= 0) return; g.save(); g.globalAlpha = a; g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.ellipse(x, y, r, r * sq, 0, 0, TAU); g.stroke(); g.restore(); };
  const burst = (g, x, y, n, reach, c, p, seed = 1) => { for (let i = 0; i < n; i++) { const a = (i * 2.399 + seed) % TAU, d = ease(p) * reach * (0.55 + ((i * 7.31 + seed) % 1) * 0.45); dot(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 2.2, c, 1 - p); } };
  function dummy(g, x, hit, t, flip) {
    const k = hit > 0 ? hit : 0, jx = k ? Math.sin(t * 80) * 3 * k : 0;
    g.save(); g.translate(x + jx, GY);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(0, 1, 18, 3.5, 0, 0, TAU); g.fill();
    g.fillStyle = '#3a2f2a'; g.fillRect(-2.5, -46, 5, 46);
    g.fillStyle = k ? '#ffffff' : '#4a3a33'; g.beginPath(); g.ellipse(0, -58, 15, 20, 0, 0, TAU); g.fill();
    g.fillStyle = k ? '#ffffff' : '#5c4a40'; g.beginPath(); g.arc(0, -86, 9, 0, TAU); g.fill();
    g.strokeStyle = '#2a201c'; g.lineWidth = 2; g.beginPath(); g.moveTo(-15, -60); g.lineTo(15, -56); g.stroke();
    g.fillStyle = '#ff4f6a'; g.beginPath(); g.arc(flip ? -4 : 4, -88, 1.8, 0, TAU); g.fill();
    g.restore();
  }
  function caster(k) {
    const c = GV.CLASSES[k], Wp = GV.WEAPONS[c.weapon], O = c.offhand && GV.WEAPONS[c.offhand];
    return { facing: 1, scale: SC, cloak: c.look.cloak, visor: c.look.visor, suit: c.look.suit, visorGlow: c.look.glow, gear: Wp.art, gearColor: Wp.color, kit: Object.assign({ c: {} }, c.kit), off: O ? (O.hand === 'off' ? 'shield' : O.art) : null, offColor: O && O.color };
  }
  const HAND = (x, o) => ({ x: x + 22 * SC * (o.facing || 1), y: GY - 36 * SC + (o.y || 0) });

  // Each returns nothing; sets o (the caster), draws effects, reports dummy hit strength via S.hit.
  const KIND = {
    proj(g, p, o, S, G) {
      const n = Math.min(5, G.proj || 1), shot = clamp01(p / 0.25); o.attack = p < 0.5 ? Math.max(0.6, shot) : 0;
      const h = HAND(S.cx, o), tx = S.tx;
      for (let i = 0; i < n; i++) {
        const q = clamp01((p - 0.18 - i * 0.04) / 0.32), off = (i - (n - 1) / 2) * 9;
        if (q > 0 && q < 1) { const x = h.x + (tx - h.x) * q, y = h.y + off * q - 4; dot(g, x, y, G.r ? G.r * 0.5 + 2 : 4, G.color); g.save(); g.globalAlpha = 0.5; g.strokeStyle = G.color; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 26, y - off * 0.1); g.stroke(); g.restore(); }
        if (q >= 1) { const r = clamp01((p - 0.5 - i * 0.04) / 0.3); burst(g, tx - 6, GY - 60 + off, 6, 28, G.color, r, i); S.hit = Math.max(S.hit, 1 - r); }
      }
    },
    melee(g, p, o, S, G) {
      S.cx = S.tx - (G.backstab ? -46 : 52); if (G.backstab) { o.facing = -1; S.flip = true; }
      const s = clamp01((p - 0.1) / 0.3); o.attack = s > 0 && s < 1 ? s : 0;
      if (s > 0.35 && s < 1) { g.save(); g.globalAlpha = 1 - s; g.strokeStyle = G.color; g.lineWidth = 6; g.beginPath(); const f = o.facing; g.arc(S.cx + 6 * f, GY - 56, 50, f > 0 ? -1.9 : Math.PI + 1.9 - (s * 2.6), f > 0 ? -1.9 + s * 2.6 : Math.PI + 1.9); g.stroke(); g.restore(); }
      if (s > 0.55) { const r = clamp01((p - 0.28) / 0.4); burst(g, S.tx, GY - 60, 8, 34, G.color, r, 2); S.hit = 1 - r; }
    },
    sweep(g, p, o, S, G) {
      S.cx = S.tx - 64; const s = clamp01((p - 0.1) / 0.45); o.attack = s > 0 && s < 1 ? s : 0; o.facing = s > 0.5 && s < 1 ? -1 : 1;
      if (s > 0 && s < 1) { g.save(); g.globalAlpha = 0.9 * (1 - s); g.strokeStyle = G.color; g.lineWidth = 7; g.beginPath(); g.ellipse(S.cx, GY - 50, 82, 30, 0, -1 + s * TAU, -1 + s * TAU + 2.4); g.stroke(); g.restore(); }
      if (s > 0.25) { S.hit = Math.max(0, 1 - (s - 0.25) * 2); }
    },
    slam(g, p, o, S, G) {
      S.cx = S.tx - 70; const s = clamp01((p - 0.05) / 0.35); o.attack = s > 0 && s < 1 ? s : 0; o.squash = s > 0.7 && s < 1 ? 0.25 : 0;
      if (s > 0.7) { const r = clamp01((p - 0.3) / 0.5); ring(g, S.cx + 30, GY + 2, 20 + r * (G.radius || 85) * 1.1, G.color, 1 - r, 4); burst(g, S.cx + 40, GY - 6, 10, 70, G.color, r, 4); S.hit = 1 - r; S.shake = (1 - r) * 4; }
    },
    dive(g, p, o, S, G) {
      const j = clamp01(p / 0.5); S.cx = 90 + (S.tx - 120 - 90) * ease(j); o.y = -Math.sin(Math.PI * j) * 70; o.air = j < 1; o.attack = j > 0.5 ? clamp01((j - 0.5) * 2) : 0;
      if (j > 0.3 && j < 1) dot(g, S.cx, GY - 40 + o.y, 8, G.color, 0.7);
      if (j >= 1) { const r = clamp01((p - 0.5) / 0.45); ring(g, S.tx - 30, GY + 2, 20 + r * 120, G.color, 1 - r, 4); burst(g, S.tx - 20, GY - 10, 12, 80, '#ffb36a', r, 6); S.hit = 1 - r; S.shake = (1 - r) * 5; }
    },
    channel(g, p, o, S, G) {
      S.cx = S.tx - 60; o.attack = (p * 6) % 1; o.facing = Math.floor(p * 12) % 2 ? -1 : 1;
      g.save(); g.globalAlpha = 0.7; g.strokeStyle = G.color; g.lineWidth = 5; g.beginPath(); g.ellipse(S.cx, GY - 46, 86, 26, 0, p * 30, p * 30 + 4); g.stroke(); g.restore();
      S.hit = (Math.sin(p * 40) + 1) / 2;
    },
    charge(g, p, o, S, G) {
      const c = clamp01(p / 0.4); S.cx = 70 + (S.tx - 50 - 70) * ease(c); o.run = c < 1; o.vx = 400; o.attack = c > 0.6 && c < 1 ? (c - 0.6) * 2.5 : 0;
      for (let i = 1; i <= 3 && c < 1; i++) { g.save(); g.globalAlpha = 0.18 / i; A.spaceman(g, S.cx - i * 22, GY, Object.assign({}, o, { visorGlow: 'rgba(0,0,0,0)' })); g.restore(); }
      if (G.off === 'shield' || o.off === 'shield') o.off = 'shield';
      if (c >= 1) { const r = clamp01((p - 0.4) / 0.4); burst(g, S.tx - 10, GY - 50, 10, 46, G.color, r, 3); S.hit = 1 - r; S.shake = (1 - r) * 3; }
    },
    spark(g, p, o, S, G) {
      o.attack = p < 0.3 ? 0.3 : 0; const h = HAND(S.cx, o);
      for (let i = 0; i < 4; i++) { const q = clamp01((p - 0.12) / 0.75); const x = h.x + (S.tx - h.x + 30) * q, y = h.y + Math.sin(q * 14 + i * 2) * 22 + (i - 1.5) * 8; if (q > 0 && q < 1) { dot(g, x, y, 3.5, G.color); } }
      S.hit = p > 0.6 ? (Math.sin(p * 50) + 1) / 2 : 0;
    },
    arc(g, p, o, S, G) {
      o.attack = 0.3; const h = HAND(S.cx, o);
      if (p > 0.15 && p < 0.7) { g.save(); g.strokeStyle = G.color; g.lineWidth = 3; g.globalAlpha = 0.9; g.beginPath(); g.moveTo(h.x, h.y); for (let i = 1; i <= 8; i++) g.lineTo(h.x + (S.tx - h.x) * i / 8, h.y + (i < 8 ? (Math.sin(p * 90 + i * 3) * 14) : -20)); g.stroke(); g.restore(); S.hit = 1; }
    },
    nova(g, p, o, S, G) {
      S.cx = S.tx - 110; o.attack = p < 0.25 ? 0.15 : 0; o.squash = p < 0.2 ? 0.15 : 0;
      const r = clamp01((p - 0.15) / 0.6); ring(g, S.cx, GY - 40, 20 + r * 140, G.color, 1 - r, 5, 0.55); A.glow(g, S.cx, GY - 40, 30 + r * 90, rgba(G.color, 0.35 * (1 - r)));
      if (r > 0.55) S.hit = 1 - (r - 0.55) * 2.2;
    },
    meteor(g, p, o, S, G) {
      o.attack = p < 0.5 ? 0.2 : 0; const f = clamp01((p - 0.1) / 0.4), x = S.tx + 60 - f * 60, y = -20 + (GY - 40 + 20) * f;
      if (f < 1) { dot(g, x, y, 10, G.color); g.save(); g.globalAlpha = 0.5; g.strokeStyle = G.color; g.lineWidth = 6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y - 50); g.stroke(); g.restore(); }
      else { const r = clamp01((p - 0.5) / 0.45); A.glow(g, S.tx, GY - 40, 40 + r * 90, rgba(G.color, 0.6 * (1 - r))); ring(g, S.tx, GY + 2, 20 + r * 110, G.color, 1 - r, 4); burst(g, S.tx, GY - 30, 14, 80, '#ffd36b', r, 8); S.hit = 1 - r; S.shake = (1 - r) * 6; }
    },
    cloak(g, p, o, S, G) {
      const a = p < 0.3 ? 1 - p / 0.3 * 0.8 : p < 0.8 ? 0.2 : 0.2 + (p - 0.8) * 4; o.alpha = a; S.cx = 140; o.run = p > 0.3 && p < 0.8; o.vx = 200; S.cx = 120 + clamp01((p - 0.3) / 0.5) * 120;
      for (let i = 0; i < 6; i++) dot(g, S.cx + Math.sin(p * 20 + i) * 20, GY - 30 - ((p * 60 + i * 12) % 70), 2, G.color, (1 - a) * 0.8);
    },
    blink(g, p, o, S, G) {
      const out = p < 0.3; S.cx = out ? 120 : S.tx + 50; o.facing = out ? 1 : -1; S.flip = !out;
      o.alpha = out ? 1 - p / 0.3 : clamp01((p - 0.3) / 0.15);
      const r = clamp01((p - 0.25) / 0.3); burst(g, 120, GY - 45, 8, 36, G.color, r, 1); burst(g, S.tx + 50, GY - 45, 8, 36, G.color, r, 4);
      if (p > 0.55) { o.attack = clamp01((p - 0.55) / 0.3); if (p > 0.7) S.hit = 1 - (p - 0.7) * 3; }
    },
    heal(g, p, o, S, G) {
      S.cx = 200; o.squash = Math.sin(p * Math.PI) * 0.08; A.glow(g, S.cx, GY - 50, 70, rgba('#7dffb0', 0.3 * Math.sin(p * Math.PI)));
      for (let i = 0; i < 7; i++) { const q = (p + i / 7) % 1, x = S.cx + Math.sin(i * 2.4) * 26, y = GY - 10 - q * 90; g.save(); g.globalAlpha = Math.sin(q * Math.PI); g.fillStyle = '#7dffb0'; g.fillRect(x - 1.5, y - 5, 3, 10); g.fillRect(x - 5, y - 1.5, 10, 3); g.restore(); }
      S.noDummy = true;
    },
    ground(g, p, o, S, G) {
      S.cx = S.tx - 120; o.attack = p < 0.2 ? 0.15 : 0; const a = Math.min(1, p * 4) * (p > 0.85 ? (1 - p) / 0.15 : 1);
      g.save(); g.globalAlpha = 0.55 * a; const gr = g.createRadialGradient(S.tx - 20, GY, 4, S.tx - 20, GY, 110); gr.addColorStop(0, rgba(G.color, 0.9)); gr.addColorStop(1, rgba(G.color, 0)); g.fillStyle = gr; g.beginPath(); g.ellipse(S.tx - 20, GY, 110, 18, 0, 0, TAU); g.fill(); g.restore();
      for (let i = 0; i < 8; i++) { const q = (p * 1.6 + i / 8) % 1; dot(g, S.tx - 90 + i * 22, GY - q * 70, 2, '#ffb36a', a * (1 - q)); }
      S.hit = a * ((Math.sin(p * 30) + 1) / 2) * 0.6;
    },
    turret(g, p, o, S, G) {
      S.cx = 100; o.attack = p < 0.2 ? clamp01(p / 0.2) : 0; const r = ease(clamp01((p - 0.1) / 0.2)), tx0 = 190;
      g.save(); g.translate(tx0, GY); g.globalAlpha = r; g.fillStyle = '#4c513e'; g.fillRect(-14, -7, 28, 7); g.fillStyle = '#6a6f58'; g.fillRect(-3, -26 * r, 6, 20 * r); g.fillStyle = '#8c93a6'; g.beginPath(); g.ellipse(0, -28 * r, 11, 8, 0, 0, TAU); g.fill(); g.fillStyle = '#3a3d30'; g.fillRect(4, -31 * r, 16, 5); g.restore();
      for (let i = 0; i < 3; i++) { const q = clamp01((p - 0.35 - i * 0.15) / 0.18); if (q > 0 && q < 1) dot(g, tx0 + 22 + (S.tx - tx0 - 22) * q, GY - 28, 3.5, G.color); if (q >= 1 && p - 0.53 - i * 0.15 < 0.1) S.hit = 1; }
    },
    minion(g, p, o, S, G) {
      S.cx = 90; o.attack = p < 0.2 ? 0.2 : 0;
      for (let i = 0; i < 2; i++) { const a = clamp01((p - 0.1 - i * 0.1) / 0.2), x = 180 + i * 60 + clamp01((p - 0.3) / 0.3) * 40; const s = clamp01((p - 0.55 - i * 0.08) / 0.25);
        g.save(); g.globalAlpha = 0.55 * a; A.spaceman(g, x, GY, { facing: 1, t: p * 4 + i, scale: SC * 0.9, cloak: '#2a3f55', suit: '#9fd8ff', visor: '#e8fbff', gear: 'saber', gearColor: G.color, attack: s > 0 && s < 1 ? s : 0, alpha: 0.55 * a, visorGlow: 'rgba(160,220,255,0.4)' }); g.restore();
        if (s > 0.5 && s < 1) S.hit = 1 - s; }
    },
    orbit(g, p, o, S, G) {
      S.cx = 200; S.noDummy = true;
      for (let i = 0; i < 4; i++) { const a = p * TAU * 1.5 + i * TAU / 4, front = Math.sin(a) > 0; (front ? S.post : S.pre).push(() => dot(g, S.cx + Math.cos(a) * 44, GY - 48 + Math.sin(a) * 14, 5, G.color)); }
      A.glow(g, S.cx, GY - 48, 60, rgba(G.color, 0.18));
    },
    hook(g, p, o, S, G) {
      o.attack = p < 0.5 ? 0.49 : 0; const h = HAND(S.cx, o), fly = clamp01(p / 0.22), yank = ease(clamp01((p - 0.3) / 0.35));
      S.tx = 380 - yank * 190;
      const ex = fly < 1 ? h.x + (S.tx - h.x) * fly : S.tx - 8, ey = GY - 60;
      if (p < 0.75) { g.save(); g.strokeStyle = G.color; g.lineWidth = 2; g.setLineDash([5, 3]); g.beginPath(); g.moveTo(h.x, h.y); g.quadraticCurveTo((h.x + ex) / 2, ey + 14 * (1 - yank), ex, ey); g.stroke(); g.restore(); dot(g, ex, ey, 4, G.color); }
      if (fly >= 1 && p < 0.7) S.hit = 0.6;
      if (p > 0.66) { const r = clamp01((p - 0.66) / 0.3); burst(g, S.tx - 10, GY - 50, 8, 34, G.color, r, 5); S.hit = 1 - r; }
    },
    howl(g, p, o, S, G) {
      S.cx = S.tx - 150; o.squash = p < 0.2 ? -0.1 : 0;
      for (let i = 0; i < 3; i++) { const r = clamp01((p - i * 0.15) / 0.5); ring(g, S.cx + 10, GY - 62, 16 + r * 130, G.color, (1 - r) * 0.8, 3, 0.7); }
      if (p > 0.35) { S.hit = 0.4; S.fear = true; }
    },
    bloom(g, p, o, S, G) {
      S.cx = S.tx - 150; o.attack = p < 0.25 ? 0.2 : 0; const b = ease(clamp01((p - 0.15) / 0.35)), f = p > 0.8 ? (1 - p) / 0.2 : 1;
      g.save(); g.translate(S.tx, GY - 20); g.globalAlpha = f;
      for (let i = 0; i < 6; i++) { g.save(); g.rotate(i * TAU / 6 + p * 1.5); g.fillStyle = rgba(G.color, 0.55); g.beginPath(); g.ellipse(0, -22 * b, 9 * b, 24 * b, 0, 0, TAU); g.fill(); g.restore(); }
      A.glow(g, 0, 0, 30 + b * 40, rgba(G.color, 0.5)); g.restore();
      if (b > 0.5) S.hit = f * ((Math.sin(p * 30) + 1) / 2) * 0.7;
    },
  };
  GV.clsAnim.skillPreview = function (g, k, id, t) {
    const G = Object.assign({}, GV.GEMS[id]); if (!G.kind) return;
    const fn = KIND[G.kind] || KIND.proj, p = (t % LOOP) / LOOP;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0d1220'); bg.addColorStop(1, '#151b2c'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, GY, W, H - GY); g.fillStyle = rgba(G.color, 0.35); g.fillRect(0, GY, W, 1.5);
    const o = Object.assign(caster(k), { t: t, y: 0 }), S = { cx: 100, tx: 380, hit: 0, pre: [], post: [], shake: 0 };
    g.save();
    if (S.shake) g.translate(Math.sin(t * 90) * S.shake, 0);
    fn(g, p, o, S, G);
    g.restore();
    for (const f of S.pre) f();
    if (!S.noDummy) dummy(g, S.tx, S.hit, t, S.flip);
    A.spaceman(g, S.cx, GY + (o.y || 0), o);
    for (const f of S.post) f();
  };
  GV.clsAnim.SKILL_W = W; GV.clsAnim.SKILL_H = H;
})();
