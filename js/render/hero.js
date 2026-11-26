// Galactic Void — the title screen. Four scenes, one per album, each with its own sky and two of
// the classes holding the line against waves of the game's own creatures. Scenes change through an
// expanding rift portal. Replaces the old static cover (GV.art.cover).
(function () {
  const GV = window.GV, A = GV.art, TAU = Math.PI * 2;
  const H = 540, GY = 468, SC = 1.8;
  const DUR = 12, TRANS = 1.5;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const rgba = (c, a) => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return c; const n = parseInt(m[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  const SCENES = [
    { act: 0, sys: 0, set: 'hole', heroes: ['knight', 'ranger'], foes: ['crawler', 'leaper', 'swarmer'], fly: ['wisp'] },
    { act: 1, sys: 3, set: 'beam', heroes: ['paladin', 'starcaller'], foes: ['seraphling', 'prism', 'crawler'], fly: ['seraphling'] },
    { act: 2, sys: 6, set: 'war', heroes: ['engineer', 'lancer'], foes: ['trooper', 'swarmer', 'huskknight'], fly: ['wisp'] },
    { act: 3, sys: 9, set: 'horizon', heroes: ['monk', 'symbiote'], foes: ['echohound', 'stalker', 'echoling'], fly: ['echoghost'] },
  ];
  // how each class fights: reach, ranged or not, swing time, and its signature move
  const STYLE = {
    knight: { reach: 92, swing: 0.42, skill: 'whirl' },
    ranger: { reach: 330, ranged: 'bolt', swing: 0.28, skill: 'blink', col: '#7dffcf' },
    paladin: { reach: 76, swing: 0.4, skill: 'nova' },
    starcaller: { reach: 340, ranged: 'orb', swing: 0.45, skill: 'meteor', col: '#c9a8ff' },
    engineer: { reach: 70, swing: 0.36, skill: 'turret' },
    lancer: { reach: 128, swing: 0.34, skill: 'volley', col: '#9cc8ff', thrust: true },
    monk: { reach: 56, swing: 0.2, skill: 'comet' },
    symbiote: { reach: 150, swing: 0.4, skill: 'bloom' },
  };

  function look(k) {
    const c = GV.CLASSES[k], W = GV.WEAPONS[c.weapon], O = c.offhand && GV.WEAPONS[c.offhand];
    return { scale: SC, cloak: c.look.cloak, visor: c.look.visor, suit: c.look.suit, visorGlow: c.look.glow, gear: W.art, gearColor: W.color, kit: Object.assign({ c: {} }, c.kit), off: O ? (O.hand === 'off' ? 'shield' : O.art) : null, offColor: O && O.color, color: c.color };
  }

  // ------------------------------------------------------------ one scene
  function makeScene(i, W) {
    const S = SCENES[i], pal = A.palette(GV.UNIVERSE.system(S.sys)), bg = A.background(pal, 200 + i * 37);
    const sc = { i, S, pal, bg, t: 0, foes: [], fx: [], parts: [], heroes: [], spawnT: [0.6, 1.3], ships: [] };
    S.heroes.forEach((k, j) => {
      const side = j === 0 ? -1 : 1;
      sc.heroes.push({ k, st: STYLE[k], L: look(k), side, home: W / 2 + side * W * 0.27, x: W / 2 + side * (W * 0.27 + 260), facing: side, atk: -1, atkT: 0, skillT: 3 + j * 1.6, y: 0, vy: 0, busy: 0, run: true, alpha: 1 });
    });
    for (let k = 0; k < 5; k++) sc.ships.push({ x: rnd(-200, W), y: rnd(70, 230), s: rnd(0.5, 1.1), v: rnd(30, 70) });
    return sc;
  }

  function spawn(sc, W, side) {
    const S = sc.S, flying = Math.random() < 0.22, type = flying ? S.fly[0] : S.foes[Math.floor(Math.random() * S.foes.length)];
    const def = GV.ENEMIES[type]; if (!def || !def.draw) return;
    const e = { type, def, x: side < 0 ? -def.w - 20 : W + 20, y: GY - def.h, w: def.w, h: def.h, vx: 0, vy: 0, hp: 1, maxHp: 1, dir: -side, onGround: true, flash: 0, t: Math.random() * 3, cd: 9, knockT: 0, spd: 1, seed: Math.random() * 10, crouch: 0, wind: 0, awake: true };
    sc.foes.push({ e, side, hp: 2 + Math.floor(Math.random() * 2), fly: flying, base: GY - def.h - (flying ? rnd(60, 110) : 0), speed: rnd(70, 110) * (flying ? 0.8 : 1), dead: 0, kx: 0 });
  }
  const burst = (sc, x, y, n, col, sp = 220, life = 0.6, size = 2.6) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (0.3 + Math.random() * 0.7); sc.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: life * (0.6 + Math.random() * 0.4), max: life, col, size }); } };
  function hurt(sc, f, n, from) {
    if (f.dead) return;
    f.hp -= n; f.e.flash = 0.14; f.kx = (f.e.x + f.e.w / 2 > from ? 1 : -1) * 120;
    burst(sc, f.e.x + f.e.w / 2, f.e.y + f.e.h / 2, 6, '#ffffff', 160, 0.35, 2);
    if (f.hp <= 0) { f.dead = 0.01; burst(sc, f.e.x + f.e.w / 2, f.e.y + f.e.h / 2, 20, sc.pal.accent || '#ff4f6a', 260, 0.7, 3); }
  }
  const alive = (sc, h) => sc.foes.filter((f) => !f.dead && f.side === h.side);
  const nearest = (sc, h) => { let best = null, bd = 1e9; for (const f of alive(sc, h)) { const d = Math.abs(f.e.x + f.e.w / 2 - h.x); if (d < bd) { bd = d; best = f; } } return best; };

  function skill(sc, h, W) {
    const col = h.L.color, side = h.side, fx = sc.fx;
    const foes = alive(sc, h);
    if (h.st.skill === 'whirl') { h.busy = 1.1; fx.push({ k: 'whirl', h, t: 0, max: 1.1, col }); foes.forEach((f) => { if (Math.abs(f.e.x - h.x) < 170) setTimeout(() => hurt(sc, f, 9, h.x), 300); }); }
    if (h.st.skill === 'nova') { h.busy = 0.7; fx.push({ k: 'ring', x: h.x, y: GY - 50, t: 0, max: 0.8, r: 200, col: '#ff9a4a' }); foes.forEach((f) => { if (Math.abs(f.e.x - h.x) < 210) hurt(sc, f, 9, h.x); }); }
    if (h.st.skill === 'meteor') { const tg = foes[0] || { e: { x: h.x + side * 200, w: 0 } }; const tx = tg.e.x + tg.e.w / 2; h.busy = 0.8; fx.push({ k: 'meteor', x: tx, t: 0, max: 1.2, col: '#ff9a4a', hit: false, h }); }
    if (h.st.skill === 'turret') { h.busy = 0.5; fx.push({ k: 'turret', x: h.x + side * 46, t: 0, max: 4.2, side, fire: 0.5, h }); }
    if (h.st.skill === 'volley') { h.busy = 0.5; h.atk = 0; for (let j = 0; j < 3; j++) fx.push({ k: 'lance', x: h.x + side * 40, y: GY - 66 + (j - 1) * 10, vx: side * 760, t: -j * 0.06, max: 1.2, side, col: '#cfe6ff' }); }
    if (h.st.skill === 'blink') { const tg = foes[foes.length - 1]; if (tg) { burst(sc, h.x, GY - 50, 14, col, 200, 0.5); h.blink = { from: h.x, to: tg.e.x + tg.e.w / 2 + side * 40, t: 0, tg }; h.busy = 0.9; } }
    if (h.st.skill === 'comet') { const tg = foes[0]; const tx = tg ? tg.e.x + tg.e.w / 2 - side * 20 : h.x + side * 140; h.leap = { from: h.x, to: tx, t: 0 }; h.busy = 0.9; }
    if (h.st.skill === 'bloom') { const tg = foes[0] || { e: { x: h.x + side * 160, w: 0 } }; h.busy = 0.6; h.atk = 0; fx.push({ k: 'bloom', x: tg.e.x + tg.e.w / 2, t: 0, max: 1.3, col: '#c79bff', hit: false, h }); }
  }

  function update(sc, dt, W) {
    sc.t += dt;
    // waves from each side, faster as the scene builds
    for (let s = 0; s < 2; s++) {
      sc.spawnT[s] -= dt;
      const side = s === 0 ? -1 : 1, live = sc.foes.filter((f) => !f.dead && f.side === side).length;
      if (sc.spawnT[s] <= 0 && live < 4 && sc.t > 0.8) { spawn(sc, W, side); sc.spawnT[s] = rnd(0.9, 1.9) - Math.min(0.4, sc.t * 0.03); }
    }
    for (const h of sc.heroes) {
      h.busy = Math.max(0, h.busy - dt);
      // running in at the start of the scene
      if (h.run) { const d = h.home - h.x; h.x += Math.sign(d) * Math.min(Math.abs(d), 300 * dt); h.facing = Math.sign(d) || h.side; if (Math.abs(d) < 1) { h.run = false; h.facing = h.side; } continue; }
      h.facing = h.side;
      if (h.blink) { h.blink.t += dt; const b = h.blink; h.alpha = b.t < 0.2 ? 1 - b.t / 0.2 : clamp01((b.t - 0.25) / 0.15); if (b.t > 0.22 && !b.moved) { b.moved = true; h.x = b.to; h.facing = -h.side; burst(sc, h.x, GY - 50, 14, h.L.color, 200, 0.5); } if (b.moved) { h.facing = -h.side; if (b.t > 0.32 && h.atk < 0) { h.atk = 0; } if (b.t > 0.45 && !b.hit) { b.hit = true; hurt(sc, b.tg, 9, h.x); } } if (b.t > 0.95) { h.blink = null; h.alpha = 1; h.backT = 0.01; } }
      if (h.backT) { h.backT += dt; const d = h.home - h.x; h.x += Math.sign(d) * Math.min(Math.abs(d), 420 * dt); h.facing = Math.sign(d) || h.side; if (Math.abs(d) < 1) h.backT = 0; }
      if (h.leap) { const L = h.leap; L.t += dt; const p = clamp01(L.t / 0.6); h.x = L.from + (L.to - L.from) * ease(p); h.y = -Math.sin(p * Math.PI) * 90; if (p >= 1 && !L.hit) { L.hit = true; h.y = 0; sc.fx.push({ k: 'ring', x: h.x, y: GY, t: 0, max: 0.7, r: 150, col: '#ffd36b', flat: true }); for (const f of alive(sc, h)) if (Math.abs(f.e.x + f.e.w / 2 - h.x) < 150) hurt(sc, f, 9, h.x); sc.shake = 6; } if (L.t > 0.9) { h.leap = null; h.backT = 0.01; } }
      // basic attacks
      if (h.atk >= 0) { h.atk += dt / h.st.swing; if (h.atk >= 0.55 && !h.struck) { h.struck = true; strike(sc, h); } if (h.atk >= 1) { h.atk = -1; h.struck = false; } }
      if (!h.busy && h.atk < 0 && !h.blink && !h.leap && !h.backT) {
        h.skillT -= dt;
        const tg = nearest(sc, h);
        if (h.skillT <= 0 && alive(sc, h).length >= 2) { h.skillT = rnd(4.5, 6.5); skill(sc, h, W); }
        else if (tg && Math.abs(tg.e.x + tg.e.w / 2 - h.x) < h.st.reach + tg.e.w / 2) { h.atk = 0; h.tg = tg; }
      }
    }
    for (const f of sc.foes) {
      const e = f.e; e.t += dt; e.flash = Math.max(0, e.flash - dt);
      if (f.dead) { f.dead += dt; continue; }
      const h = sc.heroes[f.side < 0 ? 0 : 1], stop = h.x + f.side * (h.st.ranged ? 40 : 38 + e.w / 2);
      const cx = e.x + e.w / 2;
      if (f.kx) { e.x += f.kx * dt; f.kx *= Math.pow(0.02, dt); if (Math.abs(f.kx) < 4) f.kx = 0; }
      else if ((f.side < 0 && cx < stop) || (f.side > 0 && cx > stop)) e.x += -f.side * f.speed * dt;
      e.dir = -f.side; e.vx = -f.side * f.speed;
      e.y = f.fly ? f.base + Math.sin(e.t * 2.2 + e.seed) * 12 : f.base;
    }
    sc.foes = sc.foes.filter((f) => !(f.dead > 0.45) && f.e.x > -400 && f.e.x < W + 400);
    for (const p of sc.parts) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.vx *= 0.97; }
    sc.parts = sc.parts.filter((p) => p.t > 0);
    for (const f of sc.fx) {
      f.t += dt;
      if (f.k === 'bolt' || f.k === 'lance') { if (f.t > 0) { f.x += f.vx * dt; for (const o of sc.foes) if (!o.dead && o.side === f.side && Math.abs(o.e.x + o.e.w / 2 - f.x) < o.e.w / 2 + 8 && Math.abs(o.e.y + o.e.h / 2 - f.y) < o.e.h / 2 + 18) { hurt(sc, o, f.k === 'lance' ? 3 : 1, f.x - f.vx); if (f.k === 'bolt') f.t = 99; } } }
      if (f.k === 'meteor' && !f.hit && f.t > 0.5) { f.hit = true; sc.shake = 7; for (const o of alive(sc, f.h)) if (Math.abs(o.e.x + o.e.w / 2 - f.x) < 130) hurt(sc, o, 9, f.x); burst(sc, f.x, GY - 10, 26, '#ffb36a', 300, 0.8, 3); }
      if (f.k === 'bloom' && !f.hit && f.t > 0.45) { f.hit = true; for (const o of alive(sc, f.h)) if (Math.abs(o.e.x + o.e.w / 2 - f.x) < 120) hurt(sc, o, 9, f.x); }
      if (f.k === 'turret' && f.t > 0.5) { f.fire -= dt; if (f.fire <= 0 && f.t < f.max - 0.3) { f.fire = 0.42; sc.fx.push({ k: 'bolt', x: f.x + f.side * 22, y: GY - 34, vx: f.side * 820, t: 0, max: 1, side: f.side, col: '#ffd36b' }); } }
    }
    sc.fx = sc.fx.filter((f) => f.t < f.max);
    sc.shake = Math.max(0, (sc.shake || 0) - dt * 18);
    for (const s of sc.ships) { s.x += s.v * dt; if (s.x > W + 200) { s.x = -200; s.y = rnd(70, 230); } }
  }
  function strike(sc, h) {
    const tg = h.tg; if (!tg || tg.dead) return;
    if (h.st.ranged) sc.fx.push({ k: 'bolt', x: h.x + h.side * 40, y: GY - 62, vx: h.side * 900, t: 0, max: 1, side: h.side, col: h.st.col });
    else { hurt(sc, tg, 1, h.x); sc.fx.push({ k: 'slash', x: tg.e.x + tg.e.w / 2, y: tg.e.y + tg.e.h / 2, t: 0, max: 0.25, col: h.L.color, side: h.side, thrust: h.st.thrust }); }
  }

  // ------------------------------------------------------------ drawing
  function setPiece(ctx, sc, W, t) {
    const pal = sc.pal, s = sc.S.set;
    if (s === 'hole') A.blackHole(ctx, W * 0.5 + 40, 190, 96, t, pal);
    if (s === 'beam') {
      const x = W * 0.5 + 10, y = 210;
      A.glow(ctx, x, y, 260, 'rgba(160,200,255,0.18)');
      const g = ctx.createRadialGradient(x - 30, y - 30, 10, x, y, 120); g.addColorStop(0, '#9fb8e8'); g.addColorStop(0.7, '#233456'); g.addColorStop(1, '#0a1020');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 118, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(200,230,255,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 118, -2.6, -0.6); ctx.stroke();
      const bw = 14 + Math.sin(t * 3) * 3, bg = ctx.createLinearGradient(x - bw * 3, 0, x + bw * 3, 0);
      bg.addColorStop(0, 'rgba(160,220,255,0)'); bg.addColorStop(0.5, 'rgba(235,248,255,0.9)'); bg.addColorStop(1, 'rgba(160,220,255,0)');
      ctx.fillStyle = bg; ctx.fillRect(x - bw * 3, 0, bw * 6, GY);
      A.glow(ctx, x, y + 40, 60 + Math.sin(t * 4) * 8, 'rgba(255,255,255,0.7)');
    }
    if (s === 'war') {
      const x = W * 0.5 + 20, y = 220;
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, 120, 0, TAU); ctx.clip();
      const gl = ctx.createLinearGradient(x - 120, 0, x + 120, 0); gl.addColorStop(0, '#2c5fb8'); gl.addColorStop(0.48, '#8fc4ff'); gl.addColorStop(0.52, '#ff8a5a'); gl.addColorStop(1, '#8a1a1a');
      ctx.fillStyle = gl; ctx.fillRect(x - 120, y - 120, 240, 240);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(x - 100 + ((i * 53) % 200), y - 90 + ((i * 37) % 180), 6 + (i % 4) * 4, 0, TAU); ctx.fill(); }
      ctx.restore();
      A.glow(ctx, x, y, 220, 'rgba(255,90,70,0.16)');
      ctx.fillStyle = 'rgba(230,245,255,0.85)'; ctx.fillRect(x - 2, 0, 4, GY);
      A.glow(ctx, x, y, 30 + Math.sin(t * 5) * 6, 'rgba(255,255,255,0.8)');
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.stroke();
      for (const sh of sc.ships) { ctx.save(); ctx.translate(sh.x, sh.y); ctx.scale(sh.s, sh.s); ctx.fillStyle = '#0c111c'; ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(-30, -9); ctx.lineTo(-38, 0); ctx.lineTo(-30, 9); ctx.closePath(); ctx.fill(); A.glow(ctx, -38, 0, 14, 'rgba(90,170,255,0.8)'); ctx.restore(); }
    }
    if (s === 'horizon') {
      const x = W * 0.5 + 20, y = 200;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { ctx.strokeStyle = rgba(i === 1 ? '#ff3b6a' : '#7fb4ff', 0.35 - i * 0.08); ctx.lineWidth = 10 - i * 3; ctx.beginPath(); ctx.ellipse(x, y, 260 + i * 40, 46 + i * 8, -0.08, 0, TAU); ctx.stroke(); }
      ctx.restore();
      A.blackHole(ctx, x, y, 74, t * 1.3, pal);
      ctx.fillStyle = '#05060b'; for (const [px, h] of [[-360, 230], [-300, 170], [320, 210], [380, 260]]) { ctx.beginPath(); ctx.moveTo(x + px - 16, GY); ctx.lineTo(x + px - 8, GY - h); ctx.lineTo(x + px + 8, GY - h - 14); ctx.lineTo(x + px + 16, GY); ctx.fill(); }
    }
  }
  function ground(ctx, sc, W, t) {
    const pal = sc.pal, off = sc.t * 6;
    // far ridge
    ctx.fillStyle = rgba('#000000', 0.55);
    ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W + 40; x += 40) ctx.lineTo(x, GY - 40 - Math.sin((x + off) * 0.008) * 26 - Math.sin((x + off) * 0.021) * 10); ctx.lineTo(W, H); ctx.fill();
    // the ledge they fight on
    const g = ctx.createLinearGradient(0, GY, 0, H); g.addColorStop(0, pal.rock || '#1a1824'); g.addColorStop(1, pal.rockDark || '#07060a');
    ctx.fillStyle = g; ctx.fillRect(0, GY, W, H - GY);
    ctx.fillStyle = pal.rockLite || '#3a3446'; ctx.fillRect(0, GY, W, 3);
    ctx.strokeStyle = rgba('#ffffff', 0.05); ctx.lineWidth = 1;
    for (let x = -((off * 2) % 90); x < W; x += 90) { ctx.beginPath(); ctx.moveTo(x, GY + 6); ctx.lineTo(x + 30, H); ctx.stroke(); }
  }
  function drawScene(ctx, sc, W, t) {
    const bg = sc.bg, pan = sc.t * 10;
    ctx.drawImage(bg.sky, 0, 0, W, H);
    ctx.save(); ctx.translate(-(pan * 0.3) % 1920, 0); ctx.drawImage(bg.far, 0, 30); ctx.drawImage(bg.far, 1920, 30); ctx.restore();
    setPiece(ctx, sc, W, t);
    if (!GV.settings.saver()) { ctx.save(); ctx.globalAlpha = 0.8; ctx.translate(-(pan * 0.7) % 1920, 60); ctx.drawImage(bg.mid, 0, 0); ctx.drawImage(bg.mid, 1920, 0); ctx.restore(); }
    ground(ctx, sc, W, t);
    const sx = sc.shake ? Math.sin(t * 90) * sc.shake : 0;
    ctx.save(); ctx.translate(sx, 0);
    // effects behind the fighters
    for (const f of sc.fx) {
      const p = f.t / f.max;
      if (f.k === 'ring') { ctx.save(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = f.col; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(f.x, f.y, 20 + p * f.r, (20 + p * f.r) * (f.flat ? 0.2 : 0.6), 0, 0, TAU); ctx.stroke(); ctx.restore(); A.glow(ctx, f.x, f.y, 40 + p * f.r * 0.6, rgba(f.col, 0.3 * (1 - p))); }
      if (f.k === 'whirl') { const h = f.h; ctx.save(); ctx.globalAlpha = 0.8 * (1 - p); ctx.strokeStyle = f.col; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(h.x, GY - 58, 150, 44, 0, f.t * 16, f.t * 16 + 4.2); ctx.stroke(); ctx.restore(); }
      if (f.k === 'turret') { const r = ease(clamp01(f.t / 0.35)) * (p > 0.9 ? (1 - p) / 0.1 : 1); ctx.save(); ctx.translate(f.x, GY); ctx.scale(f.side, 1); ctx.globalAlpha = r; ctx.fillStyle = '#4c513e'; ctx.fillRect(-16, -8, 32, 8); ctx.fillStyle = '#6a6f58'; ctx.fillRect(-4, -30, 8, 24); ctx.fillStyle = '#8c93a6'; ctx.beginPath(); ctx.ellipse(0, -34, 13, 9, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#3a3d30'; ctx.fillRect(4, -37, 20, 6); ctx.restore(); A.glow(ctx, f.x + f.side * 24, GY - 34, 14, 'rgba(255,190,90,0.7)'); }
      if (f.k === 'bloom') { const b = ease(clamp01(f.t / 0.5)), fade = p > 0.7 ? (1 - p) / 0.3 : 1; ctx.save(); ctx.translate(f.x, GY - 30); ctx.globalAlpha = fade; for (let i = 0; i < 7; i++) { ctx.save(); ctx.rotate(i * TAU / 7 + f.t); ctx.fillStyle = rgba(f.col, 0.55); ctx.beginPath(); ctx.ellipse(0, -28 * b, 11 * b, 30 * b, 0, 0, TAU); ctx.fill(); ctx.restore(); } A.glow(ctx, 0, 0, 30 + b * 50, rgba(f.col, 0.5)); ctx.restore(); }
    }
    // creatures
    for (const f of sc.foes) {
      const e = f.e; ctx.save();
      if (f.dead) { ctx.globalAlpha = clamp01(1 - f.dead / 0.45); }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(e.x + e.w / 2, GY + 1, e.w * 0.45, 4, 0, 0, TAU); ctx.fill();
      try { e.def.draw(ctx, e, sc.pal, t); } catch (err) {}
      ctx.restore();
    }
    // heroes
    for (const h of sc.heroes) {
      const st = h.st, o = Object.assign({}, h.L, { facing: h.facing, t: t + h.side, alpha: h.alpha });
      if (h.run || h.backT) { o.run = true; o.vx = 300 * h.facing; }
      if (h.leap) { o.air = true; o.attack = clamp01(h.leap.t / 0.6); }
      if (h.atk >= 0) o.attack = st.ranged ? 0.49 : st.thrust ? 0.49 : clamp01(h.atk);
      if (st.thrust && h.atk >= 0) o.x = Math.sin(h.atk * Math.PI) * 14;
      if (sc.fx.some((f) => f.k === 'whirl' && f.h === h)) { o.facing = Math.floor(t * 14) % 2 ? 1 : -1; o.attack = (t * 4) % 1; }
      if (h.busy && st.skill === 'nova') o.squash = 0.12;
      A.spaceman(ctx, h.x + (o.x || 0) * h.facing, GY + 4 + (h.y || 0), o);
    }
    // effects in front
    for (const f of sc.fx) {
      const p = f.t / f.max;
      if (f.k === 'bolt' && f.t >= 0) { A.glow(ctx, f.x, f.y, 16, rgba(f.col, 0.7)); ctx.strokeStyle = f.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - Math.sign(f.vx) * 26, f.y); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, 2.5, 0, TAU); ctx.fill(); }
      if (f.k === 'lance' && f.t >= 0) { ctx.save(); ctx.translate(f.x, f.y); ctx.scale(Math.sign(f.vx), 1); ctx.strokeStyle = '#6a7088'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(0, 0); ctx.stroke(); ctx.fillStyle = '#e6f2ff'; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(14, 0); ctx.lineTo(0, 5); ctx.fill(); A.glow(ctx, 6, 0, 16, 'rgba(160,210,255,0.7)'); ctx.restore(); }
      if (f.k === 'slash') { ctx.save(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = f.col; ctx.lineWidth = 4; ctx.beginPath(); if (f.thrust) { ctx.moveTo(f.x - f.side * 30, f.y); ctx.lineTo(f.x + f.side * (10 + p * 20), f.y); } else ctx.arc(f.x - f.side * 14, f.y, 26, f.side > 0 ? -1.6 : Math.PI + 1.6 - p * 2.6, f.side > 0 ? -1.6 + p * 2.6 : Math.PI + 1.6); ctx.stroke(); ctx.restore(); }
      if (f.k === 'meteor') { if (f.t < 0.5) { const q = f.t / 0.5, mx = f.x + 120 * (1 - q), my = -40 + (GY - 20 + 40) * q; A.glow(ctx, mx, my, 30, 'rgba(255,170,90,0.8)'); ctx.strokeStyle = 'rgba(255,190,120,0.6)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 50, my - 80); ctx.stroke(); ctx.fillStyle = '#fff2c4'; ctx.beginPath(); ctx.arc(mx, my, 8, 0, TAU); ctx.fill(); } else { const q = (f.t - 0.5) / 0.7; A.glow(ctx, f.x, GY - 30, 60 + q * 120, `rgba(255,150,80,${0.6 * (1 - q)})`); ctx.save(); ctx.globalAlpha = 1 - q; ctx.strokeStyle = '#ffb36a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(f.x, GY, 20 + q * 140, (20 + q * 140) * 0.2, 0, 0, TAU); ctx.stroke(); ctx.restore(); } }
    }
    for (const p of sc.parts) { const a = clamp01(p.t / p.max); ctx.globalAlpha = a; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ------------------------------------------------------------ the loop
  const HERO = (GV.hero = { idx: 0, cur: null, next: null, transT: 0, last: 0, onScene: null });
  function vignette(ctx, W) {
    const v = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.78)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    // a dark band behind the logo and menu so they read over any scene
    const c = ctx.createLinearGradient(0, 0, 0, H); c.addColorStop(0, 'rgba(2,3,8,0.55)'); c.addColorStop(0.35, 'rgba(2,3,8,0.12)'); c.addColorStop(0.7, 'rgba(2,3,8,0)'); c.addColorStop(1, 'rgba(2,3,8,0.4)');
    ctx.fillStyle = c; ctx.fillRect(0, 0, W, H);
  }
  A.coverOld = A.cover;
  A.cover = (ctx, t) => {
    const W = GV.CFG.W, dt = Math.min(0.05, Math.max(0, t - (HERO.last || t))); HERO.last = t;
    if (!HERO.cur || HERO.cur.W !== W) { HERO.cur = makeScene(HERO.idx, W); HERO.cur.W = W; if (HERO.onScene) HERO.onScene(SCENES[HERO.idx]); }
    const cur = HERO.cur;
    update(cur, dt, W);
    if (!HERO.next && cur.t > DUR) { HERO.idx = (HERO.idx + 1) % SCENES.length; HERO.next = makeScene(HERO.idx, W); HERO.next.W = W; HERO.transT = 0; if (HERO.onScene) HERO.onScene(SCENES[HERO.idx]); }
    drawScene(ctx, cur, W, t);
    if (HERO.next) {
      const nx = HERO.next; update(nx, dt, W); HERO.transT += dt;
      const p = ease(clamp01(HERO.transT / TRANS)), cx = W / 2, cy = 232, R = p * Math.hypot(W, H) * 0.75;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.1, R), 0, TAU); ctx.clip(); drawScene(ctx, nx, W, t); ctx.restore();
      // the rift's edge
      if (p < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(190,235,255,${0.9 * (1 - p)})`; ctx.lineWidth = 6 + 20 * (1 - p); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
        ctx.strokeStyle = `rgba(255,60,90,${0.6 * (1 - p)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R + 10, 0, TAU); ctx.stroke();
        ctx.restore();
        if (p < 0.2) A.glow(ctx, cx, cy, 80 + p * 400, `rgba(220,245,255,${(0.2 - p) * 4})`);
      }
      if (HERO.transT >= TRANS) { HERO.cur = nx; HERO.next = null; }
    }
    vignette(ctx, W);
  };
  HERO.scenes = SCENES;
  // the album line under the logo follows the scene
  HERO.onScene = (S) => {
    const el = document.getElementById('heroAlbum'); if (!el || !GV.ACTS) return;
    const box = el.parentNode; box.classList.remove('swap'); void box.offsetWidth; box.classList.add('swap');
    setTimeout(() => { el.textContent = GV.ACTS[S.act].album; }, 380);
  };
})();
