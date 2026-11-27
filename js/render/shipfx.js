// Galactic Void — the Lantern up close: a richer hull and engines, the discovery scene when you first
// find her, and the drop-pod launch (fired from the drop tube, out of the hull, a burning descent,
// then the pod slamming down at the start of the level).
(function () {
  const GV = window.GV, A = GV.art, U = GV.util;
  const C = () => GV.CFG;
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // ---------- the hull ----------
  // A.ship(ctx, x, y, scale, t, lit, tilt): the same footprint as before, with far more on it.
  A.ship = (ctx, x, y, s, t, lit, tilt = 0, power = lit ? 1 : 0) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
    const pw = Math.max(0, Math.min(1, power));
    // engine plume
    if (pw > 0) {
      const fl = 0.8 + Math.sin(t * 30) * 0.15 + Math.sin(t * 47) * 0.08;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(-122, 0, -122 - 120 * pw * fl, 0);
      g.addColorStop(0, 'rgba(200,245,255,0.95)'); g.addColorStop(0.3, 'rgba(143,233,255,0.6)'); g.addColorStop(1, 'rgba(255,70,90,0)');
      for (const ey of [-8, 8]) { ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-122, ey - 7); ctx.quadraticCurveTo(-122 - 60 * pw, ey, -122 - 130 * pw * fl, ey); ctx.quadraticCurveTo(-122 - 60 * pw, ey, -122, ey + 7); ctx.fill(); }
      A.glow(ctx, -122, 0, 60 * fl * pw, 'rgba(255,70,90,0.45)');
      A.glow(ctx, -122, 0, 26 * fl * pw, 'rgba(200,245,255,0.8)');
      ctx.restore();
    }
    // fins (behind)
    const fin = (dir) => { const g = ctx.createLinearGradient(0, dir * 20, 0, dir * 52); g.addColorStop(0, '#3d4258'); g.addColorStop(1, '#262a3a'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-64, dir * 19); ctx.lineTo(-26, dir * 54); ctx.lineTo(6, dir * 54); ctx.lineTo(-2, dir * 21); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(170,190,230,0.25)'; ctx.lineWidth = 1; ctx.stroke(); };
    fin(-1); fin(1);
    // hull body with shading
    const hg = ctx.createLinearGradient(0, -26, 0, 22);
    hg.addColorStop(0, '#4a5068'); hg.addColorStop(0.35, '#2f3446'); hg.addColorStop(1, '#1b1e2b');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.moveTo(-112, -18); ctx.lineTo(40, -26); ctx.lineTo(112, -6); ctx.lineTo(122, 4); ctx.lineTo(60, 22); ctx.lineTo(-112, 20); ctx.closePath(); ctx.fill();
    // rim light along the top
    ctx.strokeStyle = 'rgba(190,215,255,0.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-108, -18); ctx.lineTo(40, -25.5); ctx.lineTo(110, -6); ctx.stroke();
    // panel lines and plating
    ctx.strokeStyle = 'rgba(10,12,20,0.55)'; ctx.lineWidth = 1;
    for (const px of [-90, -64, -38, -12, 14, 40, 66]) { ctx.beginPath(); ctx.moveTo(px, -23 + Math.max(0, px - 40) * 0.08); ctx.lineTo(px + 4, 20); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-110, 10); ctx.lineTo(70, 10); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(-86, -14, 22, 8); ctx.fillRect(-34, -18, 26, 7); ctx.fillRect(20, -20, 18, 8);
    // battle scars
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(-50, 2, 7, 3, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(28, 12, 5, 2, -0.2, 0, Math.PI * 2); ctx.fill();
    // engine housings
    ctx.fillStyle = '#1a1d29'; ctx.fillRect(-124, -16, 16, 32);
    ctx.fillStyle = '#2c3248'; ctx.fillRect(-126, -14, 4, 12); ctx.fillRect(-126, 2, 4, 12);
    // window row: lights come on one by one as power returns
    for (let i = 0; i < 9; i++) {
      const on = pw > i / 10 && (Math.sin(t * 7 + i * 3.1) > -0.95);
      const wx = -84 + i * 16;
      ctx.fillStyle = on ? (i % 4 === 2 ? '#ffd36b' : '#8fe9ff') : '#1b2130';
      ctx.fillRect(wx, -9, 7, 4);
      if (on) A.glow(ctx, wx + 3.5, -7, 8, i % 4 === 2 ? 'rgba(255,211,107,0.5)' : 'rgba(143,233,255,0.5)');
    }
    // cockpit canopy
    const cg = ctx.createLinearGradient(52, -20, 98, -5);
    cg.addColorStop(0, pw > 0 ? '#bff4ff' : '#2c4654'); cg.addColorStop(1, pw > 0 ? '#3aa7d6' : '#1c2c38');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(52, -20); ctx.lineTo(98, -7); ctx.lineTo(60, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.moveTo(58, -18); ctx.lineTo(72, -14); ctx.lineTo(60, -12); ctx.closePath(); ctx.fill();
    // belly lights and the drop hatch
    for (let i = 0; i < 5; i++) { ctx.fillStyle = pw > 0.3 ? '#ff3b4f' : '#552028'; ctx.fillRect(-80 + i * 26, 6, 6, 3); }
    ctx.fillStyle = '#121520'; ctx.fillRect(-8, 16, 20, 5);
    if (pw > 0.5) { ctx.fillStyle = '#ffb347'; ctx.fillRect(-8, 15, 20, 1.5); }
    // the Lantern itself: a beacon on the prow that gives the ship its name
    const bx = 104, by = -12;
    ctx.fillStyle = '#3d4258'; ctx.fillRect(bx - 2, by - 10, 4, 10);
    if (pw > 0) {
      const lp = 0.7 + 0.3 * Math.sin(t * 2.4);
      A.glow(ctx, bx, by - 13, 44 * pw * lp, 'rgba(255,211,107,0.35)');
      A.glow(ctx, bx, by - 13, 16 * pw, 'rgba(255,240,200,0.9)');
    }
    ctx.fillStyle = pw > 0 ? '#fff4c8' : '#4a4436'; A.circle(ctx, bx, by - 13, 3.5);
    // nav lights
    const blink = Math.sin(t * 4) > 0.6;
    if (pw > 0.2 && blink) { ctx.fillStyle = '#ff4a5a'; A.circle(ctx, -22, 52, 2); A.glow(ctx, -22, 52, 10, 'rgba(255,74,90,0.7)'); ctx.fillStyle = '#7dffb0'; A.circle(ctx, -22, -52, 2); A.glow(ctx, -22, -52, 10, 'rgba(125,255,176,0.7)'); }
    // name
    ctx.fillStyle = '#d5dae4'; ctx.font = `700 9px ${C().FONT}`; ctx.textAlign = 'left'; ctx.fillText('LANTERN', -40, 4);
    ctx.restore();
    if (pw > 0) A.glow(ctx, x + 75 * s, y - 12 * s, 40 * s * pw, 'rgba(140,230,255,0.25)');
  };

  // ---------- the discovery scene ----------
  // st runs 0 → 3.5 (then waits on a choice), and on past 4.5 when you take off.
  const ship0 = A.shipScene;
  A.shipScene = (ctx, t, st) => {
    { // the old scene's sky and ground only: its ship and spaceman are hidden, we draw our own
      const keepShip = A.ship, keepMan = A.spaceman;
      A.ship = () => {}; A.spaceman = () => {};
      try { ship0(ctx, t, 0); } finally { A.ship = keepShip; A.spaceman = keepMan; }
    }
    const W = C().W, ox = (W - 960) / 2;
    ctx.save(); ctx.translate(ox, 0);
    const power = Math.max(0, Math.min(1, (st - 1.4) / 1.6));
    const lift = st > 4.5 ? (st - 4.5) * (st - 4.5) * 60 : 0;
    const shake = st > 4.2 && st < 5.6 ? (Math.random() - 0.5) * 3 : 0;
    // dust and sparks under the hull as she wakes
    if (power > 0) for (let i = 0; i < 18; i++) {
      const k = (t * 0.6 + rnd(i)) % 1, dx = 360 + rnd(i + 9) * 340;
      ctx.fillStyle = `rgba(255,${120 + Math.floor(rnd(i) * 100)},90,${(1 - k) * 0.5 * power})`;
      ctx.fillRect(dx + Math.sin(t + i) * 10, 430 - k * 60, 2, 2);
    }
    // a scanning beam from the beacon as she powers up
    if (power > 0.6 && st < 4.5) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const a = Math.sin(t * 1.2) * 0.5 - 0.3, sx = 520 + 104 * 1.4, sy = 392 - 25 * 1.4;
      const g = ctx.createLinearGradient(sx, sy, sx + Math.cos(a) * 400, sy + Math.sin(a) * 400);
      g.addColorStop(0, 'rgba(255,230,160,0.35)'); g.addColorStop(1, 'rgba(255,230,160,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a - 0.12) * 420, sy + Math.sin(a - 0.12) * 420); ctx.lineTo(sx + Math.cos(a + 0.12) * 420, sy + Math.sin(a + 0.12) * 420); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // ground glow under the engines
    if (power > 0) A.glow(ctx, 360, 432, 120 * power, `rgba(255,80,90,${0.18 * power})`);
    A.ship(ctx, 520 + lift * 0.6 + shake, 392 - lift, 1.4, t, power > 0, st > 4.5 ? -0.08 : 0.04, st > 4.5 ? 1 + Math.min(1, (st - 4.5)) * 0.6 : power);
    // take-off: a wash of dust and heat
    if (st > 4.3) {
      const k = Math.min(1, (st - 4.3) / 1.2);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) { const r = rnd(i), dx = 300 + r * 500 + (t * 120 * (r - 0.5)) % 80; ctx.fillStyle = `rgba(255,190,150,${0.25 * k * (1 - (t * 0.8 + r) % 1)})`; ctx.beginPath(); ctx.arc(dx, 432 - ((t * 0.8 + r) % 1) * 50, 6 + r * 10, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    // the spaceman walks up to her
    const cls = GV.CLASSES[GV.save.data.cls], lk = (cls && cls.look) || {}, d = GV.save.data;
    if (st < 4.5) A.spaceman(ctx, 250 + Math.min(st, 1.5) * 60, 430, { facing: 1, t, run: st < 1.5, scale: 1.3, cloak: lk.cloak, visor: lk.visor, suit: lk.suit, gear: cls && GV.WEAPONS[cls.weapon] && GV.WEAPONS[cls.weapon].art, race: GV.raceOf ? GV.raceOf(d) : undefined, custom: d.look && GV.lookOf ? GV.lookOf(d) : undefined });
    ctx.restore();
    // a title card as she comes alive
    if (st > 2 && st < 4.6) {
      const a = Math.min(1, (st - 2) / 0.6) * Math.min(1, (4.6 - st) / 0.4);
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
      ctx.font = `600 13px ${C().FONT}`; ctx.fillStyle = '#ffd36b'; ctx.fillText('YOU FOUND YOUR SHIP', W / 2, 70);
      ctx.font = `800 40px ${C().FONT}`; ctx.fillStyle = '#fff4c8'; ctx.shadowColor = 'rgba(255,211,107,0.8)'; ctx.shadowBlur = 24; ctx.fillText('THE LANTERN', W / 2, 112);
      ctx.restore();
    }
    // the flash when her beacon first catches
    if (st > 1.4 && st < 1.9) { ctx.fillStyle = `rgba(255,240,200,${0.4 * (1 - (st - 1.4) / 0.5)})`; ctx.fillRect(0, 0, W, 540); }
  };
})();

// ---------- the drop pod ----------
(function () {
  const GV = window.GV, A = GV.art;
  const rnd = (i) => { const x = Math.sin(i * 91.7 + 17.3) * 43758.5453; return x - Math.floor(x); };
  // A pod in model space: nose at +x. heat 0..1 sets the burn.
  function pod(ctx, x, y, a, s, heat, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
    if (heat > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const L = 40 + 120 * heat + Math.sin(t * 40) * 8;
      const g = ctx.createLinearGradient(14, 0, -L, 0);
      g.addColorStop(0, `rgba(255,255,230,${0.95 * heat})`); g.addColorStop(0.25, `rgba(255,190,90,${0.8 * heat})`); g.addColorStop(0.7, `rgba(255,80,40,${0.5 * heat})`); g.addColorStop(1, 'rgba(255,40,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(16, -14 - 6 * heat); ctx.quadraticCurveTo(-L * 0.4, -22 * heat - 8, -L, 0); ctx.quadraticCurveTo(-L * 0.4, 22 * heat + 8, 16, 14 + 6 * heat); ctx.closePath(); ctx.fill();
      A.glow(ctx, 16, 0, 40 * heat + 10, `rgba(255,170,80,${0.6 * heat})`);
      ctx.restore();
    }
    const g2 = ctx.createLinearGradient(0, -12, 0, 12); g2.addColorStop(0, '#5a6078'); g2.addColorStop(1, '#262a3a');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(-14, -11); ctx.lineTo(8, -12); ctx.quadraticCurveTo(22, 0, 8, 12); ctx.lineTo(-14, 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = heat > 0.3 ? `rgb(255,${Math.floor(200 - heat * 120)},${Math.floor(120 - heat * 100)})` : '#ffb347'; ctx.fillRect(-12, -12, 3, 24); // heat shield band
    ctx.fillStyle = '#0b0f19'; A.rrect(ctx, -4, -5, 9, 10, 3);
    ctx.fillStyle = '#8fe9ff'; ctx.fillRect(-2, -3, 5, 2);
    ctx.restore();
  }
  A.dropPod = pod;

  // The launch: drawn on its own canvas over the game for ~3.4 seconds, then the level starts.
  GV.podLaunch = function (done) {
    const cv = document.createElement('canvas'); cv.id = 'podFx';
    Object.assign(cv.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: 9500, pointerEvents: 'auto', background: '#000' });
    document.body.appendChild(cv);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const fit = () => { cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); };
    fit();
    const g = cv.getContext('2d');
    const T = 3.4; let t0 = performance.now(), fin = false;
    const sys = GV.game.play && GV.game.play.sysIdx || 0;
    GV.audio.sfx('rift');
    const end = () => { if (fin) return; fin = true; GV.podArrive = true; try { done(); } finally { setTimeout(() => cv.remove(), 60); } };
    const skip = () => { if (performance.now() - t0 > 600) end(); };
    cv.addEventListener('pointerdown', skip); addEventListener('keydown', skip, { once: true });
    const frame = (now) => {
      if (fin) return;
      const t = (now - t0) / 1000, W = cv.width / dpr, H = cv.height / dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sc = Math.min(W / 960, H / 540), ox = (W - 960 * sc) / 2, oy = (H - 540 * sc) / 2;
      g.fillStyle = '#03040a'; g.fillRect(0, 0, W, H);
      g.save(); g.translate(ox, oy); g.scale(sc, sc);
      // stars streaking faster as the pod drops
      const speed = t < 1 ? 0.2 : t < 1.8 ? 1 : 2.5;
      for (let i = 0; i < 120; i++) {
        const sx = rnd(i) * 960, sy = ((rnd(i + 300) * 540) + t * 120 * speed * (0.5 + rnd(i + 7))) % 540, len = 1 + speed * 10 * rnd(i + 3);
        g.fillStyle = `rgba(255,255,255,${0.3 + rnd(i + 5) * 0.6})`; g.fillRect(sx, sy, 1.4, len);
      }
      // the planet below, growing
      const pr = 260 + Math.min(1.1, Math.max(0, t - 0.8)) * 420, py = 540 + pr - 60 - Math.max(0, t - 0.8) * 120;
      const pg = g.createRadialGradient(480, py, pr * 0.6, 480, py, pr);
      pg.addColorStop(0, ['#2a1630', '#13283a', '#2a2016', '#1a2a20', '#301418'][sys % 5]); pg.addColorStop(1, '#05060c');
      g.fillStyle = pg; g.beginPath(); g.arc(480, py, pr, 0, Math.PI * 2); g.fill();
      g.strokeStyle = `rgba(143,233,255,${0.3 + Math.min(0.5, t * 0.2)})`; g.lineWidth = 3; g.beginPath(); g.arc(480, py, pr, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      if (t < 1.1) {
        // phase 1: the Lantern overhead, the pod spat from her belly
        const k = t / 1.1;
        A.ship(g, 480, 150 - k * 40, 2.2, now / 1000, true, 0.02, 1);
        const px = 480 + 4, py2 = 150 + 46 + k * k * 260;
        A.glow(g, 482, 196, 40 * (1 - k), 'rgba(255,180,90,0.7)');
        pod(g, px, py2, Math.PI / 2, 1.6, 0.15 + k * 0.3, now / 1000);
      } else if (t < 1.9) {
        // phase 2: falling free, tumbling a little toward the planet
        const k = (t - 1.1) / 0.8;
        pod(g, 480 + Math.sin(t * 3) * 20, 230 + k * 40, Math.PI / 2 + Math.sin(t * 5) * 0.25, 2 + k * 0.6, 0.3 + k * 0.4, now / 1000);
      } else {
        // phase 3: re-entry. The pod burns; sparks rip upward past it
        const k = Math.min(1, (t - 1.9) / 1.2), j = (Math.random() - 0.5) * 6 * k;
        // burning air: the sky turns to fire around the pod
        const sky = g.createLinearGradient(0, 0, 0, 540);
        sky.addColorStop(0, `rgba(20,4,8,${0.85 * k})`); sky.addColorStop(0.55, `rgba(90,20,10,${0.75 * k})`); sky.addColorStop(1, `rgba(200,80,20,${0.7 * k})`);
        g.fillStyle = sky; g.fillRect(0, 0, 960, 540);
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 40; i++) { const r = rnd(i + 50), x = 480 + (r - 0.5) * 160, y = (300 - ((t * 900 * (0.6 + r)) % 600)); g.fillStyle = `rgba(255,${150 + Math.floor(r * 100)},80,${0.6 * k})`; g.fillRect(x, y, 2, 14 + r * 20); }
        g.restore();
        pod(g, 480 + j, 280 + j, Math.PI / 2, 2.6, 0.7 + 0.3 * k, now / 1000);
        A.glow(g, 480, 290, 200 * k, `rgba(255,120,60,${0.25 * k})`);
      }
      g.restore();
      // countdown to the white-out
      if (t > T - 0.45) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(255,245,230,${Math.min(1, (t - (T - 0.45)) / 0.35)})`; g.fillRect(0, 0, cv.width, cv.height); }
      if (t >= T) return end();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  // The landing: the first moments of the level, the pod slams down at the start and cracks open.
  const P = GV.Play.prototype;
  const upd0 = P.update;
  P.update = function (dt) {
    if (GV.podArrive && this.L && !this.L.hall) {
      GV.podArrive = false;
      const sp = this.L.spawn || { x: this.player.x, y: this.player.y };
      this.podLand = { t: 1.15, x: sp.x + 12, y: sp.y + 50, hit: false };
    }
    const pl = this.podLand;
    if (pl && pl.t > 0) {
      pl.t -= dt;
      for (const P2 of this.players || [this.player]) { P2.vx = 0; P2.inv = Math.max(P2.inv || 0, 0.3); }
      if (!pl.hit && pl.t <= 0.45) {
        pl.hit = true; this.shake(16); this.sfx('slam');
        this.burst(pl.x, pl.y - 4, 40, 'rgba(255,170,90,0.9)', 380, 0.7, 4);
        this.burst(pl.x, pl.y - 4, 30, 'rgba(180,180,190,0.6)', 260, 1.2, 6);
      }
      if (pl.t > 0.45) return; // the world holds its breath while the pod comes in
    }
    return upd0.call(this, dt);
  };
  const draw0 = P.drawProjs;
  P.drawProjs = function (ctx) {
    const r = draw0.call(this, ctx);
    const pl = this.podLand;
    if (pl && pl.t > -1.5) {
      const now = this.t || 0;
      if (pl.t > 0.45) {
        // still falling, trailing fire
        const k = (pl.t - 0.45) / 0.7, y = pl.y - 40 - k * 700;
        pod(ctx, pl.x, y, Math.PI / 2, 1.4, 0.9, now + pl.t);
      } else {
        // smoking in a crater, hatch open
        const sm = Math.max(0, pl.t + 1.5) / 1.95;
        ctx.save(); ctx.globalAlpha = Math.min(1, sm * 1.5);
        pod(ctx, pl.x, pl.y - 18, Math.PI / 2 - 0.12, 1.4, 0, now);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(pl.x, pl.y, 40, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (Math.random() < 0.4 && this.parts) this.parts.push({ x: pl.x + (Math.random() - 0.5) * 20, y: pl.y - 30, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 40, life: 1.2, max: 1.2, size: 5, color: 'rgba(150,150,160,0.3)' });
      }
    }
    return r;
  };
  // hide the player inside the pod until it lands
  const pdraw = GV.Player.prototype.draw;
  GV.Player.prototype.draw = function (ctx, p) { if (p && p.podLand && p.podLand.t > 0.45) return; return pdraw.call(this, ctx, p); };
})();
