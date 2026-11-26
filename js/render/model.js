// Galactic Void — the spaceman, rebuilt. Replaces art.js's original model with a proper rig:
//
//   back layer  : backpack, cape / robe tail / sash / tendrils, the rear arm (off-hand), the rear leg
//   body        : front leg, torso and belt (each suit has its own build), front arm + main weapon
//   head        : helmet shell, visor glass, crests, horns, halos
//
// Legs and arms have knees and elbows. The run is a real gait (the foot plants, the knee folds on the
// swing), the idle breathes, jumps tuck, swings travel through a full arc. Cloth is procedural: it
// trails behind your motion, lifts when you run or fall, and ripples along its length. Every armour
// piece you wear changes the silhouette, and its rarity colour shows up as trim and glow.
// Same call as before: A.spaceman(ctx, x, feetY, { facing, t, run, air, vx, attack, kit, gear, ... }).
(function () {
  const A = window.GV.art, U = window.GV.util;

  // ---------- colour helpers ----------
  const parse = (c) => {
    if (typeof c !== 'string') return null;
    if (c[0] === '#' && c.length === 7) return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 1];
    const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x)); return [p[0], p[1], p[2], p[3] == null ? 1 : p[3]];
  };
  const cache = new Map();
  // k > 0 lightens toward white, k < 0 darkens toward black
  const shade = (c, k) => {
    const key = c + '|' + k; if (cache.has(key)) return cache.get(key);
    const p = parse(c); if (!p) return c;
    const f = (v) => Math.round(Math.max(0, Math.min(255, k >= 0 ? v + (255 - v) * k : v * (1 + k))));
    const out = p[3] < 1 ? `rgba(${f(p[0])},${f(p[1])},${f(p[2])},${p[3]})` : `rgb(${f(p[0])},${f(p[1])},${f(p[2])})`;
    if (cache.size > 2000) cache.clear(); cache.set(key, out); return out;
  };
  const alpha = (c, a) => { const p = parse(c); return p ? `rgba(${p[0]},${p[1]},${p[2]},${a})` : c; };

  // a rounded limb segment from (0,0) down to (0,len), tapering
  function limb(ctx, len, w0, w1, col, light) {
    const g = ctx.createLinearGradient(-w0, 0, w0, 0);
    g.addColorStop(0, shade(col, -0.25)); g.addColorStop(0.45, light ? shade(col, 0.18) : col); g.addColorStop(1, shade(col, -0.35));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w0 / 2, 0); ctx.lineTo(w0 / 2, 0); ctx.lineTo(w1 / 2, len); ctx.arc(0, len, w1 / 2, 0, Math.PI); ctx.lineTo(-w0 / 2, 0);
    ctx.arc(0, 0, w0 / 2, Math.PI, 0); ctx.fill();
  }

  A.spaceman = (ctx, x, y, o = {}) => {
    const f = o.facing || 1, t = o.t || 0, fl = o.flash;
    const C = (c) => (fl ? '#ffffff' : c);
    const cloak = o.cloak || '#252a3b', suitC = o.suit || '#d5dae4', visor = o.visor || '#8fe9ff';
    const kit = o.kit || { helm: 'dome', suit: 'cloak', boots: 'std', c: {} }, kc = kit.c || {};
    const trimS = kc.suit || visor, trimH = kc.helm || visor, trimB = kc.boots || visor;
    const S = kit.suit || 'cloak', Hm = kit.helm || 'dome', Bt = kit.boots || 'std';
    const a0 = o.alpha == null ? 1 : o.alpha;
    const lowfx = GV.CFG && GV.CFG.LOWFX;

    // ---------- motion ----------
    const run = o.run ? 1 : 0, air = o.air ? 1 : 0, atk = o.attack || 0;
    const vxl = (o.vx || 0) * f;                       // speed in the direction you face
    const speed = Math.min(1, Math.abs(o.vx || 0) / 320);
    const p = t * 11.5;                                  // gait phase
    const breathe = Math.sin(t * 2.1);
    const bob = run ? Math.abs(Math.sin(p)) * 2.2 - 0.6 : air ? 0 : breathe * 0.6;
    const lean = run ? 0.08 + speed * 0.05 : air ? -0.04 : 0;

    ctx.save();
    ctx.translate(x, y);
    if (o.scale) ctx.scale(o.scale, o.scale);
    ctx.scale(f, 1);
    ctx.globalAlpha = a0;
    if (o.squash) ctx.scale(1 + o.squash * 0.16, 1 - o.squash * 0.16);
    if (atk) ctx.translate(Math.sin(atk * Math.PI) * 3.5, 0);

    // ground shadow
    if (!air && !fl) { ctx.save(); ctx.globalAlpha = a0 * 0.35; ctx.fillStyle = '#000'; A.ellipse(ctx, 0, 0.5, 11 + speed * 3, 2.4); ctx.restore(); }

    // ---------- skeleton ----------
    const HIP = -18 - bob, SH = -37 - bob, HEAD = -49 - bob;
    // legs: [thigh, knee] angles (0 = straight down, negative = forward)
    let fT, fK, rT, rK;
    if (air) { fT = -0.75; fK = 1.0; rT = 0.35; rK = 0.7; }
    else if (run) {
      fT = -Math.sin(p) * 0.72; fK = 0.12 + Math.max(0, -Math.cos(p)) * 1.05;
      rT = Math.sin(p) * 0.72; rK = 0.12 + Math.max(0, Math.cos(p)) * 1.05;
    } else { fT = -0.06 + breathe * 0.01; fK = 0.06; rT = 0.1; rK = 0.08; }
    // arms: [upper, forearm] angles
    let fU, fF, rU, rF;
    if (atk && A.GUNS && A.GUNS.has(o.gear)) { fU = 0.1; fF = -0.3 - Math.sin(atk * Math.PI) * 0.16; /* firearms: hold the aim and kick with the recoil */ }
    else if (atk) { const e = 1 - Math.pow(1 - atk, 2.2); fU = 2.3 + e * 3.1; fF = -0.35 - Math.sin(atk * Math.PI) * 0.3; /* up behind the shoulder, over the top, down in front */ }
    else if (run) { fU = Math.sin(p) * 0.85; fF = -0.95; }
    else if (air) { fU = -0.55; fF = -0.35; }
    else { fU = 0.12 + breathe * 0.04; fF = -0.32; }
    if (run) { rU = -Math.sin(p) * 0.85; rF = -0.95; } else if (air) { rU = 0.6; rF = -0.5; } else { rU = -0.1 - breathe * 0.04; rF = -0.4; }
    if (o.off && !run) { rU = -0.25; rF = -1.05; } // carry the off-hand forward

    const suitBase = S === 'carapace' ? '#3e2430' : S === 'harness' ? suitC : S === 'rig' ? '#4c513e' : '#2a2f3f';
    const limbCol = S === 'carapace' ? '#4a2a35' : '#30364a';
    const armorCol = S === 'carapace' ? '#6a3c4c' : '#8c93a6';

    // ---------- back layer ----------
    // backpack (cloth covers it, so it's drawn first)
    if (S !== 'carapace' && S !== 'robe') {
      ctx.save(); ctx.translate(0, SH);
      if (S === 'rig') {
        ctx.fillStyle = C(shade('#4a4f63', 0)); A.rrect(ctx, -17, -9, 11, 25, 3);
        ctx.fillStyle = C('#8c93a6'); A.rrect(ctx, -19.5, -7, 4, 20, 2);
        ctx.strokeStyle = C('#8c93a6'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-14, -9); ctx.quadraticCurveTo(-16, -16, -18, -22); ctx.stroke();
        ctx.fillStyle = fl ? '#fff' : trimS; A.circle(ctx, -18, -22, 1.6);
        if (!fl && !lowfx) A.glow(ctx, -18, -22, 6, alpha(trimS, 0.5));
      } else {
        const g = ctx.createLinearGradient(-16, 0, -6, 0); g.addColorStop(0, C('#2a2e40')); g.addColorStop(1, C('#454b63'));
        ctx.fillStyle = g; A.rrect(ctx, -15.5, -6, 9.5, 20, 3);
        ctx.fillStyle = C('#5a6178'); ctx.fillRect(-15.5, -2, 9.5, 1.2);
        ctx.fillStyle = fl ? '#fff' : (Math.sin(t * 3) > 0 ? '#ff3b4f' : '#7a1d28'); ctx.fillRect(-13.5, 6, 2.5, 2.5);
      }
      ctx.restore();
    }
    // cloth behind the body
    const trail = Math.max(0, Math.min(1, speed * (vxl >= 0 ? 1 : 0.6) + air * 0.45 + (run ? 0.15 : 0)));
    const cloth = (len, wTop, wBot, col, edge, n = 7, startX = -6, startY = SH - 1) => {
      // spine of the cloth, from the shoulders down and back
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const s = i / n, ang = (0.08 + trail * 1.05) * s + Math.sin(t * 6.5 - s * 4.2) * (0.05 + trail * 0.12) * s + (vxl < -30 ? -0.25 * s : 0);
        const prev = pts[i - 1] || { x: startX, y: startY };
        if (i === 0) { pts.push({ x: startX, y: startY }); continue; }
        pts.push({ x: prev.x - Math.sin(ang) * (len / n), y: prev.y + Math.cos(ang) * (len / n) });
      }
      const w = (s) => wTop + (wBot - wTop) * s;
      const front = pts.map((q, i) => ({ x: q.x + w(i / n) * 0.55, y: q.y })), back = pts.map((q, i) => ({ x: q.x - w(i / n) * 0.45, y: q.y }));
      // lining (the inside, seen where it curls)
      ctx.fillStyle = C(shade(col, -0.45));
      ctx.beginPath(); front.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      for (let i = back.length - 1; i >= 0; i--) ctx.lineTo(back[i].x - 1.2, back[i].y + 0.8);
      ctx.closePath(); ctx.fill();
      // outer face
      const g = ctx.createLinearGradient(0, startY, -len * 0.4, startY + len);
      g.addColorStop(0, C(shade(col, 0.12))); g.addColorStop(0.55, C(col)); g.addColorStop(1, C(shade(col, -0.3)));
      ctx.fillStyle = g;
      ctx.beginPath(); front.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      // a softly scalloped hem
      const fb = front[n], bb = back[n];
      ctx.quadraticCurveTo((fb.x + bb.x) / 2, fb.y + 2.5 + Math.sin(t * 7) * 1, bb.x, bb.y);
      for (let i = back.length - 2; i >= 0; i--) ctx.lineTo(back[i].x, back[i].y);
      ctx.closePath(); ctx.fill();
      // folds
      ctx.strokeStyle = C(alpha(shade(col, -0.5), 0.55)); ctx.lineWidth = 0.9;
      for (const k of [0.33, 0.66]) { ctx.beginPath(); pts.forEach((q, i) => { const s = i / n; const xx = back[i].x + (front[i].x - back[i].x) * k + Math.sin(t * 5 + s * 3 + k * 6) * 0.6; i ? ctx.lineTo(xx, q.y) : ctx.moveTo(xx, q.y); }); ctx.stroke(); }
      if (edge) { ctx.strokeStyle = C(edge); ctx.lineWidth = 1.1; ctx.beginPath(); back.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.quadraticCurveTo((fb.x + bb.x) / 2, fb.y + 2.5 + Math.sin(t * 7), fb.x, fb.y); ctx.stroke(); }
    };
    if (S === 'cloak') cloth(31, 13, 17, cloak, alpha(trimS, 0.7));
    else if (S === 'robe') cloth(24, 10, 13, shade(cloak, -0.1), alpha(trimS, 0.6), 6, -6, HIP - 4);
    else if (S === 'plate') cloth(16, 10, 11, cloak, alpha(trimS, 0.6), 5, -6, SH);
    else if (S === 'harness') { // twin sash tails from the belt
      for (const k of [0, 1]) { ctx.save(); ctx.translate(k * -2, k * 2); cloth(17 - k * 4, 3.5, 2.2, k ? shade(trimS, -0.25) : trimS, null, 5, -6, HIP - 2); ctx.restore(); }
    } else if (S === 'carapace') {
      for (let i = 0; i < 4; i++) {
        const a = Math.sin(t * 3 + i * 1.3) * 0.35, len = 16 + i * 2;
        ctx.strokeStyle = C(i % 2 ? '#5a2c3a' : '#6e3446'); ctx.lineWidth = 2.6 - i * 0.35; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-6, SH + 2 + i * 5);
        ctx.bezierCurveTo(-12 - trail * 6, SH + i * 6 + a * 8, -16 - trail * 10, SH + 6 + i * 7 - a * 8, -20 - trail * 12 + Math.sin(t * 4 + i) * 2, SH + 2 + i * 8 + len * 0.2);
        ctx.stroke();
        if (!fl) { ctx.fillStyle = alpha(trimS, 0.8); A.circle(ctx, -20 - trail * 12 + Math.sin(t * 4 + i) * 2, SH + 2 + i * 8 + len * 0.2, 1.2); }
      }
      ctx.lineCap = 'butt';
    }

    // rear arm and off-hand
    const arm = (sx, up, fore, col, front, item, itemCol) => {
      ctx.save(); ctx.translate(sx, SH + 1); ctx.rotate(up);
      limb(ctx, 7.5, 5.2, 4.4, C(col), front);
      if (S === 'plate' || S === 'rig') { ctx.fillStyle = C(shade(armorCol, front ? 0 : -0.25)); A.rrect(ctx, -3, 1, 6, 4.5, 2); }
      ctx.translate(0, 7.5); ctx.rotate(fore);
      limb(ctx, 7, 4.4, 3.8, C(shade(col, -0.05)), front);
      // gauntlet
      ctx.fillStyle = C(S === 'carapace' ? '#5a2c3a' : shade('#5c6378', front ? 0.1 : -0.15)); A.rrect(ctx, -2.6, 4, 5.2, 4.6, 1.6);
      if (S === 'harness' || S === 'rig') { ctx.fillStyle = C(trimS); ctx.fillRect(-2.6, 4, 5.2, 1.2); }
      if (item) {
        ctx.save(); ctx.translate(0, 7 - 13);
        if (item === 'shield') {
          ctx.translate(0.5, 13); ctx.rotate(-up - fore);
          const g = ctx.createLinearGradient(0, -12, 0, 12); g.addColorStop(0, C('#4a5068')); g.addColorStop(1, C('#1f2332'));
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(1, -12); ctx.quadraticCurveTo(13, -11, 13, -2); ctx.quadraticCurveTo(12, 9, 6, 13); ctx.quadraticCurveTo(0, 9, -1, -2); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = C(itemCol || '#ffd36b'); ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = C(itemCol || '#ffd36b'); A.star(ctx, 6, 0, 3.6, 4, 0);
          if (!fl) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(2, -10); ctx.quadraticCurveTo(8, -10, 11, -5); ctx.lineTo(9, -4); ctx.quadraticCurveTo(7, -8, 2, -8); ctx.fill(); }
        } else A.held(ctx, item, !!atk && front, fl, itemCol, front ? atk : 0);
        ctx.restore();
      }
      ctx.restore();
    };
    arm(-3, rU, rF, shade(limbCol, -0.2), false, o.off && o.off !== 'shield' ? o.off : null, o.offColor);

    // legs
    const leg = (hx, th, kn, front) => {
      const dark = front ? 0 : -0.22;
      ctx.save(); ctx.translate(hx, HIP); ctx.rotate(th);
      limb(ctx, 9, 6.4, 5.2, C(shade('#262a38', dark)), front);
      if (Bt === 'greave') { ctx.fillStyle = C(shade('#7d8598', dark)); A.rrect(ctx, -3.6, 1.5, 7.2, 5, 2); }
      ctx.translate(0, 9); ctx.rotate(kn);
      // knee cap
      ctx.fillStyle = C(shade(Bt === 'greave' ? '#9aa2b6' : '#3a4052', dark)); A.ellipse(ctx, 0.6, 0, 3.4, 2.8);
      limb(ctx, 8.6, 5.2, 4.6, C(shade('#1f2230', dark)), front);
      // boot, kept close to level with the ground
      ctx.save(); ctx.translate(0, 8.6); ctx.rotate(-(th + kn) * 0.75);
      if (Bt === 'greave') {
        const g = ctx.createLinearGradient(0, -9, 0, 3); g.addColorStop(0, C(shade('#9aa2b6', dark))); g.addColorStop(1, C(shade('#5d6478', dark)));
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-3.8, -8); ctx.lineTo(3.8, -8); ctx.lineTo(4, 0); ctx.lineTo(7.5, 1); ctx.lineTo(7.5, 3.2); ctx.lineTo(-4.2, 3.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C(trimB); ctx.fillRect(-3.8, -8, 7.6, 1.4);
      } else if (Bt === 'mag') {
        ctx.fillStyle = C(shade('#2a2f3e', dark)); A.rrect(ctx, -4, -5, 8, 7, 2); A.rrect(ctx, -4, 0, 11, 3.6, 1.6);
        ctx.fillStyle = fl ? '#fff' : trimB; ctx.fillRect(-4, 2.6, 11, 1.2);
        if (!fl && !lowfx && (air || run)) A.glow(ctx, 1.5, 4, 8, alpha(trimB, 0.45));
      } else {
        ctx.fillStyle = C(shade('#30364a', dark)); A.rrect(ctx, -3.8, -3.5, 7.6, 6, 2); A.rrect(ctx, -3.8, 0, 10, 3.4, 1.6);
        ctx.fillStyle = C(shade('#141620', dark)); ctx.fillRect(-3.8, 2.6, 10, 0.9);
      }
      ctx.restore();
      ctx.restore();
    };
    leg(-2.5, rT, rK, false);
    leg(2.5, fT, fK, true);

    // ---------- the suit ----------
    ctx.save(); ctx.translate(0, 0); ctx.rotate(lean);
    const torso = (col, r = 4) => {
      const g = ctx.createLinearGradient(-8, SH, 8, HIP);
      g.addColorStop(0, C(shade(col, 0.15))); g.addColorStop(0.6, C(col)); g.addColorStop(1, C(shade(col, -0.35)));
      ctx.fillStyle = g; A.rrect(ctx, -8, SH - 4, 16, HIP - SH + 6, r);
    };
    const belt = (col, buckle) => {
      ctx.fillStyle = C(col); A.rrect(ctx, -8.5, HIP - 2.5, 17, 4.2, 1.5);
      ctx.fillStyle = C(buckle); A.rrect(ctx, 1.5, HIP - 2.2, 4.4, 3.6, 1); if (!fl) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(2, HIP - 2, 3.4, 0.8); }
    };
    const chestLight = () => { if (!fl) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(2.5, SH + 2, 4.5, 3, -0.3, 0, Math.PI * 2); ctx.fill(); } };
    if (S === 'cloak') {
      torso('#2e3446');
      // the cloak's front: a mantle over the shoulders, not over the legs
      const g = ctx.createLinearGradient(0, SH - 5, 0, SH + 9); g.addColorStop(0, C(shade(cloak, 0.15))); g.addColorStop(1, C(shade(cloak, -0.2)));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-9, SH - 3); ctx.quadraticCurveTo(0, SH - 7, 9.5, SH - 2.5); ctx.lineTo(8, SH + 7); ctx.quadraticCurveTo(0, SH + 10, -8, SH + 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C(alpha(trimS, 0.8)); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(8, SH + 7); ctx.quadraticCurveTo(0, SH + 10, -8, SH + 6); ctx.stroke();
      ctx.fillStyle = C(trimS); A.circle(ctx, 5.5, SH + 4.5, 1.6); // clasp
      ctx.fillStyle = C('#8c93a6'); A.rrect(ctx, -5, SH + 9, 10, 7, 2.5); chestLight();
      belt('#1b1e2a', '#8c93a6');
    } else if (S === 'plate') {
      torso('#2a2f3f');
      const g = ctx.createLinearGradient(-8, SH - 4, 8, SH + 12); g.addColorStop(0, C('#d0d6e4')); g.addColorStop(0.5, C('#9aa2b6')); g.addColorStop(1, C('#5d6478'));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-8.5, SH - 3); ctx.lineTo(8.5, SH - 3); ctx.lineTo(8, SH + 9); ctx.quadraticCurveTo(0, SH + 14, -8, SH + 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C(trimS); ctx.fillRect(-0.9, SH - 2, 1.8, 13);
      ctx.fillStyle = C('#6c7489'); ctx.fillRect(-8, SH + 11, 16, 2.4); ctx.fillRect(-8, SH + 14.5, 16, 2.4); // faulds
      // tabard
      ctx.fillStyle = C(cloak); ctx.beginPath(); ctx.moveTo(-5, HIP - 1); ctx.lineTo(5, HIP - 1); ctx.lineTo(4.5 + Math.sin(t * 5) * 0.6 - trail * 2, HIP + 10); ctx.lineTo(-4.5 - trail * 2, HIP + 9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C(trimS); ctx.lineWidth = 0.9; ctx.stroke();
      chestLight(); belt('#3a3f55', trimS);
    } else if (S === 'robe') {
      // a long robe: the skirt hangs over the legs and parts as you stride
      const skirt = (side) => {
        const sw = run ? Math.sin(p) * 3.2 * side : 0;
        const g = ctx.createLinearGradient(0, HIP, 0, -1); g.addColorStop(0, C(shade(cloak, 0.05))); g.addColorStop(1, C(shade(cloak, -0.35)));
        ctx.fillStyle = g; ctx.beginPath();
        ctx.moveTo(side > 0 ? 0 : -8, HIP - 2); ctx.lineTo(side > 0 ? 8.5 : 0.5, HIP - 2);
        ctx.lineTo((side > 0 ? 10 : 2) + sw - trail * 3, -2 + Math.sin(t * 4 + side) * 0.8); ctx.lineTo((side > 0 ? -0.5 : -10) + sw - trail * 4, -1.5);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = C(alpha(trimS, 0.75)); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo((side > 0 ? 10 : 2) + sw - trail * 3, -2); ctx.lineTo((side > 0 ? -0.5 : -10) + sw - trail * 4, -1.5); ctx.stroke();
      };
      skirt(-1);
      torso(shade(cloak, 0.05), 5); skirt(1);
      ctx.fillStyle = C(alpha(suitC, 0.4)); ctx.beginPath(); ctx.moveTo(-2.5, SH - 3); ctx.lineTo(2.5, SH - 3); ctx.lineTo(3.5, HIP - 2); ctx.lineTo(-3.5, HIP - 2); ctx.closePath(); ctx.fill(); // stole
      ctx.fillStyle = C(trimS); ctx.fillRect(-8, HIP - 3, 16, 2.6);
      ctx.beginPath(); ctx.moveTo(-6, SH - 3); ctx.lineTo(-3, SH - 3); ctx.lineTo(0, SH + 3); ctx.closePath(); ctx.fill();
      chestLight();
    } else if (S === 'harness') {
      torso(suitC, 5);
      ctx.strokeStyle = C('#2a2f3f'); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-7.5, SH - 2); ctx.lineTo(7, HIP - 3); ctx.moveTo(7.5, SH - 2); ctx.lineTo(-7, HIP - 3); ctx.stroke();
      ctx.fillStyle = C('#8c93a6'); A.circle(ctx, 0, (SH + HIP) / 2 - 2, 2.2);
      chestLight(); belt('#2a2f3f', trimS);
      ctx.fillStyle = C(trimS); ctx.fillRect(-8.5, HIP - 2.5, 17, 1.2);
    } else if (S === 'carapace') {
      torso('#3e2430', 6);
      for (let i = 0; i < 4; i++) { const g = ctx.createLinearGradient(0, SH - 3 + i * 5.5, 0, SH + 2 + i * 5.5); g.addColorStop(0, C('#7a4558')); g.addColorStop(1, C('#4a2533')); ctx.fillStyle = g; A.rrect(ctx, -7.5, SH - 3 + i * 5.5, 15, 4.6, 2.2); }
      if (!fl) { ctx.strokeStyle = alpha(trimS, 0.75); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0.5, SH - 3); ctx.lineTo(2.5, SH + 6); ctx.lineTo(-0.5, HIP - 2); ctx.stroke(); if (!lowfx) A.glow(ctx, 1, SH + 6, 7, alpha(trimS, 0.35 + 0.15 * Math.sin(t * 4))); }
      ctx.fillStyle = C('#2a141c'); A.rrect(ctx, -8, HIP - 2.5, 16, 3.6, 1.6);
    } else if (S === 'rig') {
      torso('#2a2f3f');
      const g = ctx.createLinearGradient(-8, SH - 3, 8, SH + 12); g.addColorStop(0, C('#7a8060')); g.addColorStop(1, C('#4a4f3a'));
      ctx.fillStyle = g; A.rrect(ctx, -8.5, SH - 3, 17, 15, 3);
      ctx.fillStyle = C(trimS); ctx.fillRect(-8.5, SH + 2, 17, 1.8); ctx.fillRect(-8.5, SH + 6.5, 17, 1.8);
      ctx.fillStyle = C('#3a3d30'); A.rrect(ctx, -8.5, SH + 12, 17, 4.5, 1.5);
      ctx.fillStyle = C('#8c93a6'); A.rrect(ctx, -6.5, SH + 13, 3.6, 6, 1); A.rrect(ctx, 3, SH + 13, 3.6, 6, 1); // pouches
      chestLight(); belt('#2a2d22', '#c9b47a');
    }
    // collar ring under the helmet
    { const g = ctx.createLinearGradient(-7, SH - 6, 7, SH - 2); g.addColorStop(0, C('#3a4052')); g.addColorStop(0.5, C('#7a8296')); g.addColorStop(1, C('#2a2f3f')); ctx.fillStyle = g; A.rrect(ctx, -7, SH - 6.5, 14, 4, 2); }

    // front arm & main-hand weapon
    const gear = o.gear;
    if (gear === 'greatblade' && !atk) { // slung across the back
      ctx.save(); ctx.translate(-4, SH + 5); ctx.rotate(-2.35);
      ctx.fillStyle = C('#2b2f40'); A.rrect(ctx, -3, -3.2, 11, 6.4, 1.5); ctx.fillStyle = C('#c9a86a'); ctx.fillRect(8, -4.5, 2.5, 9);
      const g = ctx.createLinearGradient(10, -3, 10, 3); g.addColorStop(0, fl ? '#fff' : '#e8fbff'); g.addColorStop(0.5, fl ? '#fff' : (o.gearColor || 'rgba(150,235,255,0.95)')); g.addColorStop(1, fl ? '#fff' : shade(o.gearColor || '#7fd9ff', -0.3));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(10.5, -2.8); ctx.lineTo(54, -2.2); ctx.lineTo(58, 0); ctx.lineTo(54, 2.2); ctx.lineTo(10.5, 2.8); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (!fl && !lowfx) A.glow(ctx, -24, SH - 13, 22, alpha(o.gearColor || '#78e1ff', 0.28));
    }
    if (gear === 'staff' && !atk) {
      ctx.save(); ctx.translate(-7, HIP + 2); ctx.rotate(-0.22);
      const g = ctx.createLinearGradient(-2, 0, 2, 0); g.addColorStop(0, C('#3a2f4e')); g.addColorStop(0.5, C('#6a5a86')); g.addColorStop(1, C('#2a2238'));
      ctx.fillStyle = g; ctx.fillRect(-1.6, -48, 3.2, 52);
      ctx.fillStyle = C('#c9a86a'); ctx.fillRect(-2.2, -44, 4.4, 2); ctx.fillRect(-2.2, -20, 4.4, 2);
      ctx.fillStyle = fl ? '#fff' : (o.gearColor || '#c9a8ff'); A.star(ctx, 0, -51, 6, 4, t);
      ctx.restore();
      if (!fl && !lowfx) A.glow(ctx, -18, HIP - 50, 22, alpha(o.gearColor || '#c8aaff', 0.4));
    }
    if (o.kit == null && gear === 'mace' && !o.off) { ctx.fillStyle = C('#3a3346'); A.ellipse(ctx, 9, SH + 10, 6, 11); ctx.strokeStyle = C('#ffd36b'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(9, SH + 10, 6, 11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = C('#ffd36b'); A.star(ctx, 9, SH + 10, 3.5, 4, 0); }
    if (o.off === 'shield') { // braced on the forearm, in front of the chest
      ctx.save(); ctx.translate(7.5 + (run ? Math.sin(p) * 1.2 : 0), SH + 12 + (atk ? -2 : 0)); ctx.rotate(-0.08);
      const sg = ctx.createLinearGradient(-8, -12, 8, 12); sg.addColorStop(0, C('#5a6180')); sg.addColorStop(0.5, C('#3a4058')); sg.addColorStop(1, C('#1f2332'));
      ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(-6, -12); ctx.quadraticCurveTo(0, -14, 6, -12); ctx.quadraticCurveTo(7, 2, 0, 13); ctx.quadraticCurveTo(-7, 2, -6, -12); ctx.closePath(); ctx.fill();
      const sc = o.offColor || '#ffd36b';
      ctx.strokeStyle = C(sc); ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = C(sc); A.star(ctx, 0, -1, 3.8, 4, 0);
      if (!fl) { ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.moveTo(-4.5, -10.5); ctx.quadraticCurveTo(0, -12, 4.5, -10.5); ctx.lineTo(4, -8.5); ctx.quadraticCurveTo(0, -10, -4, -8.5); ctx.closePath(); ctx.fill(); if (!lowfx) A.glow(ctx, 0, -1, 9, alpha(sc, 0.35)); }
      ctx.restore();
    }
    const holdMain = gear && !(gear === 'staff' && !atk) && !(gear === 'greatblade' && !atk);
    arm(3, fU, fF, limbCol, true, holdMain ? gear : null, o.gearColor);
    // shoulder armour sits over the arm
    if (S === 'plate') { const g = ctx.createRadialGradient(3, SH - 1, 1, 4, SH, 7); g.addColorStop(0, C('#e4e9f2')); g.addColorStop(1, C('#8c93a6')); ctx.fillStyle = g; A.ellipse(ctx, 3.5, SH - 0.5, 6.2, 4.6); ctx.fillStyle = C(trimS); ctx.fillRect(-1, SH + 2, 9, 1.4); }
    else if (S === 'rig') { ctx.fillStyle = C('#6a6f58'); A.ellipse(ctx, 3.5, SH - 0.5, 5, 3.8); }
    else if (S === 'carapace') { ctx.fillStyle = C('#7a4558'); A.ellipse(ctx, 3.5, SH - 0.5, 5.2, 4); ctx.fillStyle = C('#d9c4b4'); ctx.beginPath(); ctx.moveTo(6, SH - 3); ctx.lineTo(10, SH - 7); ctx.lineTo(8, SH - 1.5); ctx.closePath(); ctx.fill(); }
    else if (S === 'cloak') { ctx.fillStyle = C(shade(cloak, 0.1)); A.ellipse(ctx, 3.5, SH - 0.8, 5.2, 3.6); }
    ctx.restore(); // lean

    // ---------- helmet ----------
    const hy = HEAD + (run ? Math.sin(p * 2) * 0.4 : 0), hx = lean * 8;
    ctx.save(); ctx.translate(hx, hy);
    if (o.noHelm && A.drawHead) { A.drawHead(ctx, o, t, fl); } // helmet off: the wearer's own head
    else if (Hm === 'organic') {
      const g = ctx.createRadialGradient(-3, -4, 2, 0, 0, 13); g.addColorStop(0, C('#7a4558')); g.addColorStop(1, C('#3e1f2b'));
      ctx.fillStyle = g; A.ellipse(ctx, 0, 0, 11.5, 11);
      ctx.strokeStyle = C('#2a141c'); ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-1, 0, 5 + i * 2.5, -2.4, -0.6); ctx.stroke(); }
      ctx.fillStyle = fl ? '#fff' : trimH;
      for (const [ex, ey, r] of [[5, -2, 2.7], [8.2, 2, 1.9], [2, 3, 1.6]]) { A.circle(ctx, ex, ey, r); }
      if (!fl && !lowfx) A.glow(ctx, 6, 0, 10, alpha(trimH, 0.4 + 0.2 * Math.sin(t * 5)));
      if (!fl) { ctx.strokeStyle = 'rgba(255,120,150,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-4, -8, 1, -10); ctx.stroke(); }
    } else {
      const base = Hm === 'horned' ? '#8c93a6' : Hm === 'mask' ? '#3a3f55' : suitC;
      // shell
      const g = ctx.createRadialGradient(-3, -4, 1.5, 0, 0, 12); g.addColorStop(0, C(shade(base, 0.35))); g.addColorStop(0.6, C(base)); g.addColorStop(1, C(shade(base, -0.4)));
      ctx.fillStyle = g; A.circle(ctx, 0, 0, 10.6);
      // seam
      ctx.strokeStyle = C(alpha(shade(base, -0.5), 0.6)); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, 0, 10.6, -2.6, -0.4); ctx.stroke();
      if (Hm === 'visor') {
        const vg = ctx.createLinearGradient(0, -5, 0, 2); vg.addColorStop(0, fl ? '#fff' : shade(visor, 0.3)); vg.addColorStop(1, fl ? '#fff' : shade(visor, -0.35));
        ctx.fillStyle = C('#1a1d27'); A.rrect(ctx, -3, -5.5, 14.5, 7, 3); ctx.fillStyle = vg; A.rrect(ctx, -2, -4.6, 12.8, 5.2, 2.5);
        if (!fl) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(5.5, -3.8, 3.2, 1.1); }
      } else if (Hm === 'mask') {
        const mg = ctx.createLinearGradient(0, -7, 0, 7); mg.addColorStop(0, C('#b4bccf')); mg.addColorStop(1, C('#5d6478'));
        ctx.fillStyle = mg; A.rrect(ctx, 0, -7.5, 11.5, 14, 4);
        ctx.fillStyle = C('#1a1d27'); for (let i = 0; i < 3; i++) ctx.fillRect(3.5, 1.5 + i * 2, 7, 1);
        ctx.fillStyle = fl ? '#fff' : visor; ctx.fillRect(4, -4, 6.5, 2.2); if (!fl && !lowfx) A.glow(ctx, 7, -3, 7, alpha(visor, 0.5));
        ctx.strokeStyle = C('#8c93a6'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-9, -15); ctx.stroke(); ctx.fillStyle = fl ? '#fff' : trimH; A.circle(ctx, -9, -15, 1.4);
      } else {
        // dome glass
        const vg = ctx.createRadialGradient(7, -3, 0.5, 4, -1, 8); vg.addColorStop(0, fl ? '#fff' : shade(visor, 0.55)); vg.addColorStop(0.55, fl ? '#fff' : visor); vg.addColorStop(1, fl ? '#fff' : shade(visor, -0.5));
        ctx.fillStyle = C('#1a1d27'); A.ellipse(ctx, 4, -1, 7.6, 6.2);
        ctx.fillStyle = vg; A.ellipse(ctx, 4, -1, 6.7, 5.3);
        if (!fl) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; A.ellipse(ctx, 6.3, -3.2, 2.1, 1.2, -0.4); ctx.fillStyle = 'rgba(255,255,255,0.25)'; A.ellipse(ctx, 2, 2, 2.6, 0.9, -0.3); }
      }
      if (Hm === 'crest') {
        const cg = ctx.createLinearGradient(-6, -18, 6, -8); cg.addColorStop(0, C(shade(trimH, 0.3))); cg.addColorStop(1, C(shade(trimH, -0.3)));
        ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(-7, -7); ctx.quadraticCurveTo(-4 - trail * 3, -19, 6, -14 + Math.sin(t * 6) * 0.6); ctx.lineTo(2, -9); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = C(shade(trimH, -0.45)); ctx.lineWidth = 0.7; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-5 + i * 3, -8); ctx.lineTo(-3 + i * 3, -15 + i); ctx.stroke(); }
      }
      if (Hm === 'horned') {
        for (const s of [-1, 1]) {
          const hg = ctx.createLinearGradient(0, -8, 0, -22); hg.addColorStop(0, C('#d9d0c4')); hg.addColorStop(1, C('#8a8070'));
          ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(s * 5 - 1.5, -7.5); ctx.quadraticCurveTo(s * 12 - 2, -13, s * 10 - 6, -23); ctx.quadraticCurveTo(s * 9 - 2, -14, s * 6.5 - 2.5, -9); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = C(trimH); ctx.fillRect(-9, 3, 18, 1.6);
      }
      if (Hm === 'halo') {
        ctx.strokeStyle = fl ? '#fff' : trimH; ctx.lineWidth = 1.9; ctx.beginPath(); ctx.ellipse(0, -15 + Math.sin(t * 2) * 0.8, 9.5, 2.6, 0, 0, Math.PI * 2); ctx.stroke();
        if (!fl) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(0, -15.4 + Math.sin(t * 2) * 0.8, 9.5, 2.6, 0, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke(); }
      }
      if (Hm === 'dome' && !o.kit) { /* the plain suit keeps its antenna */ ctx.strokeStyle = C('#8c93a6'); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-8, -14); ctx.stroke(); ctx.fillStyle = fl ? '#fff' : (Math.sin(t * 2.5) > 0.3 ? '#ff3b4f' : '#5a1d28'); A.circle(ctx, -8, -14, 1.2); }
    }
    ctx.restore();
    // a relic you carry orbits the rear shoulder
    if (kc.relic && !fl) {
      const ra = t * 2.2, rx = -10 + Math.cos(ra) * 4, ry = SH - 8 + Math.sin(ra) * 2;
      if (!lowfx) A.glow(ctx, rx, ry, 9, alpha(kc.relic, 0.5));
      ctx.fillStyle = kc.relic; ctx.save(); ctx.translate(rx, ry); ctx.rotate(t * 1.5); ctx.fillRect(-1.6, -1.6, 3.2, 3.2); ctx.restore();
    }
    ctx.restore();
    // visor glow in world space
    if (!fl && !o.noHelm && (o.alpha == null || o.alpha > 0.3)) {
      const sc = o.scale || 1;
      A.glow(ctx, x + (4 + hx) * f * sc, y + (hy - 1) * sc, 20 * sc, o.visorGlow || 'rgba(120,225,255,0.35)');
      if (Hm === 'halo') A.glow(ctx, x + hx * f * sc, y + (hy - 15) * sc, 22 * sc, 'rgba(255,233,168,0.35)');
    }
  };

  A.GUNS = new Set(['pistol', 'smg', 'handcannon', 'rifle', 'sniper', 'shotgun', 'launcher', 'cannon', 'bow', 'crossbow', 'handxbow']);
  // ---------- weapons, in arm space (hand at 0,13; the arm points along +y) ----------
  A.held = (ctx, gear, attacking, fl, col, atk = 0) => {
    const W = (c) => (fl ? '#fff' : c);
    const blade = (x0, x1, w, c, tip = 4) => {
      const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2); g.addColorStop(0, W(shade(c, 0.45))); g.addColorStop(0.5, W(c)); g.addColorStop(1, W(shade(c, -0.35)));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, -w / 2); ctx.lineTo(x1, -w / 2 + 0.4); ctx.lineTo(x1 + tip, 0); ctx.lineTo(x1, w / 2 - 0.4); ctx.lineTo(x0, w / 2); ctx.closePath(); ctx.fill();
      if (!fl) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x0, -0.4, x1 - x0, 0.8); }
      if (attacking && !fl && !(GV.CFG && GV.CFG.LOWFX)) A.glow(ctx, (x0 + x1) / 2, 0, (x1 - x0) * 0.6, alpha(c, 0.35));
    };
    const grip = (len, c = '#3d3346') => { ctx.fillStyle = W(c); A.rrect(ctx, -3, -2, len, 4, 1.2); ctx.fillStyle = W(shade(c, 0.3)); for (let i = 0; i < len - 2; i += 2.5) ctx.fillRect(-2.5 + i, -2, 0.8, 4); };
    ctx.save(); ctx.translate(0.5, 13); ctx.rotate(gear === 'whip' ? -0.2 : A.GUNS.has(gear) ? (attacking ? -0.08 : 0.12) : attacking ? Math.PI / 2 - 0.3 : gear === 'pistol' || gear === 'fist' ? 0 : gear === 'wrench' || gear === 'mace' || gear === 'maul' ? 1.05 : -0.55); // mid-swing the weapon follows the arm's line; at rest it's held up and forward
    if (gear === 'dagger') { grip(5, '#3d4a52'); ctx.fillStyle = W('#c9a86a'); ctx.fillRect(2, -3.2, 1.6, 6.4); blade(3.6, 15, 4.4, col || '#9fffe8', 3); }
    else if (gear === 'wrench') { ctx.fillStyle = W('#6c7489'); A.rrect(ctx, -2, -1.6, 20, 3.2, 1.2); ctx.fillStyle = W(col || '#ffb347'); ctx.beginPath(); ctx.arc(20, 0, 5.2, 0.6, Math.PI * 2 - 0.6); ctx.lineTo(20, 0); ctx.fill(); ctx.fillStyle = W('#2a2f3f'); A.circle(ctx, 20, 0, 1.6); if (attacking && !fl) A.glow(ctx, 22, 0, 14, 'rgba(255,200,90,0.6)'); }
    else if (gear === 'staff') { const g = ctx.createLinearGradient(0, -2, 0, 2); g.addColorStop(0, W('#6a5a86')); g.addColorStop(1, W('#2a2238')); ctx.fillStyle = g; ctx.fillRect(-14, -1.6, 52, 3.2); ctx.fillStyle = W('#c9a86a'); ctx.fillRect(30, -2.2, 2, 4.4); ctx.fillStyle = W(col || '#c9a8ff'); A.star(ctx, 40, 0, 6.5, 4, 0); if (!fl) A.glow(ctx, 40, 0, 18, alpha(col || '#c8aaff', 0.5)); }
    else if (gear === 'fist') { const g = ctx.createLinearGradient(0, -5, 0, 5); g.addColorStop(0, W('#7a8296')); g.addColorStop(1, W('#3a4052')); ctx.fillStyle = g; A.rrect(ctx, -1, -5.2, 9.5, 10.4, 3); ctx.fillStyle = W(col || '#9fffe0'); for (let i = 0; i < 3; i++) ctx.fillRect(8, -4 + i * 3, 2.2, 2); if (attacking && !fl) A.glow(ctx, 10, 0, 16, alpha(col || '#96ffdc', 0.5)); }
    else if (gear === 'whip') { ctx.strokeStyle = W(col || '#ff6a9a'); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(4, 0); if (attacking) { const k = 0.25 + 0.75 * Math.sin(Math.min(1, Math.max(0, atk || 0.5)) * Math.PI); ctx.bezierCurveTo(24 * k, -18 * k, 52 * k, -10 * k, 78 * k, 2 * k); } else ctx.bezierCurveTo(14, 6, 10, 18, 6, 26); ctx.stroke(); ctx.lineCap = 'butt'; grip(7, '#4a2a35'); }
    else if (gear === 'pistol') { ctx.fillStyle = W('#2e3a40'); A.rrect(ctx, -2, -3.2, 14, 5.2, 1.5); A.rrect(ctx, -2, 0.5, 4.5, 6.5, 1.2); ctx.fillStyle = W('#4a5a62'); ctx.fillRect(0, -3.2, 10, 1.2); ctx.fillStyle = W(col || '#7dffcf'); ctx.fillRect(10, -2.2, 3, 2.2); if (attacking && !fl) A.glow(ctx, 13, -1, 8, alpha(col || '#7dffcf', 0.6)); }
    else if (gear === 'greatblade') { if (attacking) { grip(8, '#2b2f40'); ctx.fillStyle = W('#c9a86a'); ctx.fillRect(5, -5, 2.6, 10); blade(7.6, 66, 6.4, col || '#aaf0ff', 6); } }
    else if (gear === 'mace') { grip(8, '#5a4f3a'); ctx.fillStyle = W('#8a7a5a'); ctx.fillRect(5, -1.6, 12, 3.2); const g = ctx.createRadialGradient(18, -2, 1, 19, 0, 8); g.addColorStop(0, W('#fff2c4')); g.addColorStop(1, W(col || '#ffd36b')); ctx.fillStyle = g; A.star(ctx, 19, 0, 7, 6, 0.3); if (attacking && !fl) A.glow(ctx, 19, 0, 14, alpha(col || '#ffd36b', 0.5)); }
    else if (gear === 'pike' || gear === 'lance') { const L = gear === 'lance' ? 42 : 28; const g = ctx.createLinearGradient(0, -2, 0, 2); g.addColorStop(0, W('#6a7088')); g.addColorStop(1, W('#2e3346')); ctx.fillStyle = g; ctx.fillRect(-8, -1.6, L + 2, 3.2); ctx.fillStyle = W('#c9a86a'); ctx.fillRect(L - 2, -2.6, 2, 5.2); blade(L, L + 8, 7, col || (gear === 'lance' ? '#7dffcf' : '#9fe8ff'), 6); }
    else if (gear === 'saber') { grip(5, '#3d3346'); ctx.fillStyle = W('#c9a86a'); ctx.beginPath(); ctx.arc(2.5, 0, 4.2, -1.6, 1.6); ctx.lineWidth = 1.3; ctx.strokeStyle = W('#c9a86a'); ctx.stroke(); blade(3.5, 29, 3.4, col || '#d9b8ff', 3); }
    else if (gear === 'bow') {
      // an energy bow: a dark riser with two glowing limbs and a string of light
      const c = col || '#b8ffea';
      ctx.fillStyle = W('#2e3446'); A.rrect(ctx, -2, -3, 6, 6, 1.5);
      ctx.strokeStyle = W(c); ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(1, -2); ctx.quadraticCurveTo(10, -14, 3, -26); ctx.moveTo(1, 2); ctx.quadraticCurveTo(10, 14, 3, 26); ctx.stroke();
      ctx.strokeStyle = W('#ffffff'); ctx.lineWidth = 0.9; ctx.globalAlpha *= 0.8; ctx.beginPath(); ctx.moveTo(3, -26); ctx.lineTo(attacking ? -6 : -1, 0); ctx.lineTo(3, 26); ctx.stroke(); ctx.globalAlpha /= 0.8;
      if (!fl) { A.glow(ctx, 6, -18, 9, alpha(c, 0.4)); A.glow(ctx, 6, 18, 9, alpha(c, 0.4)); }
      if (attacking && !fl) A.glow(ctx, 8, 0, 12, alpha(c, 0.7));
    }
    else if (gear === 'crossbow' || gear === 'handxbow') {
      const c = col || '#ffd36b', big = gear === 'crossbow', L = big ? 30 : 18, span = big ? 15 : 10;
      ctx.fillStyle = W('#2e3446'); A.rrect(ctx, big ? -8 : -2, -2.6, L + (big ? 8 : 2), 5.2, 1.4); A.rrect(ctx, 0, 1.5, 4, 6.5, 1.2);
      ctx.strokeStyle = W(shade(c, -0.2)); ctx.lineWidth = big ? 3 : 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(L - 4, 0); ctx.quadraticCurveTo(L, -span * 0.5, L - 6, -span); ctx.moveTo(L - 4, 0); ctx.quadraticCurveTo(L, span * 0.5, L - 6, span); ctx.stroke();
      ctx.strokeStyle = W('#ffffff'); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(L - 6, -span); ctx.lineTo(attacking ? L - 9 : L * 0.45, 0); ctx.lineTo(L - 6, span); ctx.stroke();
      if (!attacking) { ctx.fillStyle = W(c); ctx.fillRect(L * 0.45, -1, L * 0.55, 2); }
      if (!fl) A.glow(ctx, L - 4, 0, 9, alpha(c, 0.35));
    }
    else if (A.GUNS.has(gear) && gear !== 'pistol') {
      // firearms: a body, a barrel and a glowing cell in the weapon's colour
      const c = col || '#8fe9ff', dark = W('#262c38'), mid = W('#3d4556'), lite = W('#5a6478');
      const flash = attacking && !fl ? 1 : 0;
      if (gear === 'smg' || gear === 'handcannon') {
        const L = gear === 'smg' ? 15 : 17;
        ctx.fillStyle = dark; A.rrect(ctx, -2, -3.6, L, 6, 1.5); A.rrect(ctx, -1, 0.8, 4.5, 7, 1.2);
        ctx.fillStyle = lite; ctx.fillRect(0, -3.6, L - 3, 1.2);
        if (gear === 'smg') { ctx.fillStyle = mid; ctx.fillRect(5, 2, 3, 6); }
        else { ctx.fillStyle = mid; A.circle(ctx, 5, -0.6, 3.2); }
        ctx.fillStyle = W(c); ctx.fillRect(L - 2, -2.6, 3, 2.6);
        if (flash) A.glow(ctx, L + 3, -1.2, 12, alpha(c, 0.7));
      } else {
        const L = { rifle: 34, sniper: 48, shotgun: 30, launcher: 32, cannon: 38 }[gear] || 32;
        const bw = { rifle: 2.6, sniper: 2, shotgun: 4.2, launcher: 7.5, cannon: 6.5 }[gear] || 3;
        // stock and grip
        ctx.fillStyle = dark; A.rrect(ctx, -10, -3, 12, 6, 2); A.rrect(ctx, 0, 1.5, 4, 7, 1.2);
        // body
        const g = ctx.createLinearGradient(0, -5, 0, 5); g.addColorStop(0, lite); g.addColorStop(1, dark);
        ctx.fillStyle = g; A.rrect(ctx, 0, -4.6, L * 0.55, 8, 2);
        // barrel
        ctx.fillStyle = mid; A.rrect(ctx, L * 0.5, -bw / 2 - 1, L * 0.5, bw, 1);
        if (gear === 'shotgun') { ctx.fillStyle = dark; ctx.fillRect(L * 0.55, bw / 2 - 0.4, L * 0.35, 2.4); }
        if (gear === 'sniper') { ctx.fillStyle = dark; A.rrect(ctx, 6, -9, 14, 4, 1.6); ctx.fillStyle = W(c); ctx.fillRect(18, -8.2, 2, 2.4); }
        if (gear === 'launcher') { ctx.fillStyle = W(shade(c, -0.3)); A.circle(ctx, L * 0.35, 0, 4.2); }
        if (gear === 'cannon') { ctx.fillStyle = W(c); for (let i = 0; i < 3; i++) ctx.fillRect(L * 0.55 + i * 4.5, -bw / 2 - 1.6, 2, bw + 3.2); }
        // power cell
        ctx.fillStyle = W(c); ctx.fillRect(L * 0.18, -1.2, L * 0.25, 2.4);
        if (!fl) A.glow(ctx, L * 0.3, 0, 8, alpha(c, 0.35));
        if (flash) A.glow(ctx, L + 4, 0, gear === 'cannon' || gear === 'launcher' ? 22 : 14, alpha(c, 0.8));
      }
    }
    else if (gear === 'katana') { grip(7, '#2b2433'); ctx.fillStyle = W('#c9a86a'); A.ellipse(ctx, 4.6, 0, 1.6, 4.4); blade(5.6, 40, 3, col || '#ff9a6a', 5); }
    else if (gear === 'axe') { grip(9, '#4a3a2a'); ctx.fillStyle = W('#6a7088'); ctx.fillRect(5, -1.5, 14, 3); const c = col || '#9fffd8'; ctx.fillStyle = W(c); ctx.beginPath(); ctx.moveTo(14, -1.5); ctx.quadraticCurveTo(26, -11, 24, -1); ctx.lineTo(24, 1); ctx.quadraticCurveTo(26, 11, 14, 1.5); ctx.closePath(); ctx.fill(); if (attacking && !fl) A.glow(ctx, 22, 0, 13, alpha(c, 0.45)); }
    else if (gear === 'maul') { const g = ctx.createLinearGradient(0, -2, 0, 2); g.addColorStop(0, W('#6a7088')); g.addColorStop(1, W('#2e3346')); ctx.fillStyle = g; ctx.fillRect(-2, -1.6, 24, 3.2); const hg = ctx.createLinearGradient(18, -8, 28, 8); hg.addColorStop(0, W(shade(col || '#ff6a5c', 0.3))); hg.addColorStop(1, W(shade(col || '#ff6a5c', -0.35))); ctx.fillStyle = hg; A.rrect(ctx, 17, -8.5, 11, 17, 2); ctx.fillStyle = W('#2a2f3f'); ctx.fillRect(17, -1, 11, 2); if (attacking && !fl) A.glow(ctx, 23, 0, 16, alpha(col || '#ff6a5c', 0.45)); }
    ctx.restore();
  };
  A.modelShade = shade;
})();
