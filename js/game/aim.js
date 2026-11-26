// Galactic Void — free aim. Each player gets pl.aim each frame from whatever they last aimed with:
// the mouse (a point), a right stick or a dragged touch button (a direction), or a tap (a point).
// Skills read it through GV.aim.of / pick / point; with no aim input, play falls back to facing.
(function () {
  const GV = window.GV, I = GV.input, C = GV.CFG;
  const now = () => performance.now() / 1000;
  const ASSIST = { off: 0, light: 0.2, strong: 0.38 };

  const toWorld = (p, cx, cy) => {
    const cv = document.getElementById('game'), r = cv.getBoundingClientRect(), Z = p.zoom();
    const lx = ((cx - r.left) / r.width) * C.W, ly = ((cy - r.top) / r.height) * C.H;
    return { x: p.cam.x + lx / Z, y: p.cam.y + ly / Z };
  };
  const origin = (pl) => ({ x: pl.cx, y: pl.y + 22 });
  let AP = null; // who is aiming: a duelist's own stand-in is never a target for them
  const targetable = (e) => !e.dead && !(e.def && e.def.static && !e.pvpProxy && !e.hallDummy) && !(e.alpha != null && e.alpha < 0.4) && !(e.duelOf && e.duelOf === AP);

  // The enemy nearest a direction, inside a cone (radians) and a range.
  function coneTarget(p, o, dx, dy, range, cone) {
    let best = null, bs = 1e9;
    for (const e of p.enemies) {
      if (!targetable(e)) continue;
      const ex = e.x + e.w / 2 - o.x, ey = e.y + e.h / 2 - o.y, d = Math.hypot(ex, ey);
      if (d > range || d < 1) continue;
      const ang = Math.acos(Math.max(-1, Math.min(1, (ex * dx + ey * dy) / d)));
      if (ang > cone) continue;
      const sc = ang + (d / range) * 0.25;
      if (sc < bs) { bs = sc; best = e; }
    }
    return best;
  }

  GV.aim = {
    update(p, pl) {
      AP = pl;
      const t = now(), A = I.aim, slot = pl.slot || 0;
      const prev = pl.aim || {};
      let src = null, pt = null, dir = null;
      if (slot === 0) {
        const c = [];
        if (A.mouse && t - A.mouseT < 20) c.push(['mouse', A.mouseT]);
        if (A.stick[0] && t - A.stickT[0] < 0.25) c.push(['stick', A.stickT[0]]);
        if (A.drag && t - A.dragT < 1.2) c.push(['drag', A.dragT]);
        if (A.tap && t - A.tapT < 2) c.push(['tap', A.tapT]);
        c.sort((a, b) => b[1] - a[1]);
        src = c.length ? c[0][0] : null;
      } else if (A.stick[slot] && t - (A.stickT[slot] || 0) < 0.25) src = 'stick';
      const o = origin(pl);
      if (src === 'mouse' || src === 'tap') {
        const s = src === 'mouse' ? A.mouse : A.tap;
        pt = toWorld(p, s.x, s.y);
        const dx = pt.x - o.x, dy = pt.y - o.y, m = Math.hypot(dx, dy);
        dir = m > 10 ? { x: dx / m, y: dy / m } : prev.on ? { x: prev.x, y: prev.y } : { x: pl.facing, y: 0 };
      } else if (src === 'stick') dir = A.stick[slot];
      else if (src === 'drag') dir = A.drag;
      if (!src) { pl.aim = { on: false, x: pl.facing, y: 0 }; return; }
      // aim assist (sticks and touch only): bend toward the enemy closest to where you point
      let lock = null;
      if (src === 'stick' || src === 'drag') {
        const cone = ASSIST[GV.settings.data.aimAssist || 'light'];
        if (cone > 0) {
          lock = coneTarget(p, o, dir.x, dir.y, 700, cone);
          if (lock) { const dx = lock.x + lock.w / 2 - o.x, dy = lock.y + lock.h / 2 - o.y, m = Math.hypot(dx, dy) || 1; dir = { x: dx / m, y: dy / m }; }
        }
      }
      pl.aim = { on: true, src, x: dir.x, y: dir.y, px: pt ? pt.x : lock ? lock.x + lock.w / 2 : o.x + dir.x * 260, py: pt ? pt.y : lock ? lock.y + lock.h / 2 : o.y + dir.y * 260, lock };
    },
    of(pl) { return pl && pl.aim && pl.aim.on ? pl.aim : null; },
    // Who a targeted skill should go for: near the aim point (mouse, tap), else along the aim.
    pick(p, pl, range, cone) {
      AP = pl;
      const a = this.of(pl); if (!a) return null;
      if (a.lock && targetable(a.lock)) return a.lock;
      const o = origin(pl);
      if (a.src === 'mouse' || a.src === 'tap') {
        let best = null, bd = 150;
        for (const e of p.enemies) {
          if (!targetable(e)) continue;
          const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
          if (Math.hypot(ex - o.x, ey - o.y) > range) continue;
          const d = Math.hypot(ex - a.px, ey - a.py) - Math.max(e.w, e.h) / 2;
          if (d < bd) { bd = d; best = e; }
        }
        if (best) return best;
      }
      return coneTarget(p, o, a.x, a.y, range, cone);
    },
    // The aim point, no further than range from the player.
    point(pl, range) {
      const a = this.of(pl), o = origin(pl);
      if (!a) return { x: o.x + pl.facing * range * 0.5, y: o.y };
      const dx = a.px - o.x, dy = a.py - o.y, m = Math.hypot(dx, dy);
      return m <= range ? { x: a.px, y: a.py } : { x: o.x + (dx / m) * range, y: o.y + (dy / m) * range };
    },
  };

  // Aim before the player acts; afterwards, keep facing the aim for a moment after each use.
  const upd0 = GV.Player.prototype.update;
  GV.Player.prototype.update = function (dt, p) {
    GV.aim.update(p, this);
    upd0.call(this, dt, p);
    const a = this.aim;
    if (a && a.on && !this.charging && this.dashT <= 0) {
      if (this.aimFaceT > 0) { this.aimFaceT -= dt; if (Math.abs(a.x) > 0.15) this.facing = a.x > 0 ? 1 : -1; }
      else if (a.src === 'mouse' && Math.abs(this.vx) < 40 && Math.abs(a.x) > 0.2) this.facing = a.x > 0 ? 1 : -1;
    }
    if (!this.slot && !this.holo) document.body.classList.toggle('aimMouse', !!(a && a.on && a.src === 'mouse'));
  };

  // The reticle.
  const draw0 = GV.Player.prototype.draw;
  GV.Player.prototype.draw = function (ctx, p) {
    draw0.call(this, ctx, p);
    const a = this.aim;
    if (this.dead || this.holo || !a || !a.on) return;
    const cls = GV.CLASSES[this.cls], col = this.slot ? (GV.COOP_COLORS || [])[this.slot] || '#ffb347' : (cls && cls.color) || '#8fe9ff';
    const o = origin(this), t = this.t;
    const hasPt = a.src === 'mouse' || a.src === 'tap';
    const rx = a.lock ? a.lock.x + a.lock.w / 2 : hasPt ? a.px : o.x + a.x * 150;
    const ry = a.lock ? a.lock.y + a.lock.h / 2 : hasPt ? a.py : o.y + a.y * 150;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // a short guide from the suit toward the aim
    ctx.strokeStyle = col; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.moveTo(o.x + a.x * 22, o.y + a.y * 22); ctx.lineTo(o.x + a.x * 80, o.y + a.y * 80); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.9;
    if (a.lock) {
      const e = a.lock, pad = 6 + Math.sin(t * 8) * 2, x0 = e.x - pad, y0 = e.y - pad, x1 = e.x + e.w + pad, y1 = e.y + e.h + pad, k = 8;
      ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(x0, y0 + k); ctx.lineTo(x0, y0); ctx.lineTo(x0 + k, y0);
      ctx.moveTo(x1 - k, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + k);
      ctx.moveTo(x1, y1 - k); ctx.lineTo(x1, y1); ctx.lineTo(x1 - k, y1);
      ctx.moveTo(x0 + k, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - k);
      ctx.stroke();
    } else {
      const r = 9 + Math.sin(t * 5) * 1;
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(rx + dx * (r + 2), ry + dy * (r + 2)); ctx.lineTo(rx + dx * (r + 7), ry + dy * (r + 7)); }
      ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(rx, ry, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };
})();
