// Galactic Void — hidden passages and explosive scenery.
// False rock: looks solid, but fades away as you step into it (or as soon as the cracked panel guarding
// it breaks), showing the tube and cache behind. Fuel and cryo pods: static "enemies" every attack can
// hit; when one breaks it blows, hurting every enemy near it (and you, a little, if you're too close).
(function () {
  const GV = window.GV, A = GV.art, P = GV.Play.prototype, S = GV.Skills, U = GV.util;

  // ---------- explosive pods ----------
  GV.ENEMIES.fuelpod = {
    name: 'Volatile pod', w: 26, h: 34, hp: 1, dmg: 0, xp: 0, mem: 0, fly: true, static: true, heavy: true,
    update(e) { e.vx = 0; e.vy = 0; e.x = e.x0; e.y = e.y0; e.noContact = true; },
    draw(ctx, e, pal, t) {
      const f = e.flash > 0, cryo = e.cryo, col = cryo ? '#8fe9ff' : '#ff7a3a', x = e.x, y = e.y, w = e.w, h = e.h;
      const k = 1 - e.hp / e.maxHp, pulse = 0.5 + 0.5 * Math.sin(t * (4 + k * 14));
      A.glow(ctx, x + w / 2, y + h / 2, 30 + pulse * 8, cryo ? 'rgba(143,233,255,0.25)' : 'rgba(255,122,58,0.28)');
      ctx.fillStyle = f ? '#fff' : '#2a2f3f'; A.rrect(ctx, x, y + 4, w, h - 4, 6);
      ctx.fillStyle = f ? '#fff' : '#454c60'; ctx.fillRect(x - 2, y + 2, w + 4, 5); ctx.fillRect(x - 2, y + h - 5, w + 4, 5);
      ctx.fillStyle = f ? '#fff' : col; ctx.globalAlpha *= 0.55 + pulse * 0.45; A.rrect(ctx, x + 6, y + 10, w - 12, h - 18, 3); ctx.globalAlpha = 1;
      ctx.fillStyle = f ? '#fff' : '#ffd36b'; // hazard stripes
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 3 + i * 8, y + 3, 4, 3);
      if (k > 0 && !f) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 8, y + 12); ctx.lineTo(x + 13, y + 20); ctx.lineTo(x + 10, y + 26); ctx.stroke(); }
    },
  };
  function blow(p, e) {
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2, R = 130, cryo = e.cryo;
    const dmg = 70 * GV.SCALE.hp(p.diff) * (1 + 0.25 * (p.sysIdx || 0));
    S.raw(p, cx, cy, R, cryo ? { cold: dmg } : { fire: dmg * 0.7, phys: dmg * 0.3 }, { exclude: e, color: cryo ? '#8fe9ff' : '#ff7a3a' });
    // chain reactions
    for (const o of p.enemies) if (!o.dead && o !== e && o.def === GV.ENEMIES.fuelpod && Math.hypot(o.x - e.x, o.y - e.y) < R) o.fuse = Math.max(o.fuse || 0, 0.18);
    // too close yourself? it stings
    for (const pl of p.players || [p.player]) {
      if (pl.dead || !pl.st || pl.holo) continue; // sparring holograms aren't really there
      const d = Math.hypot(pl.cx - cx, pl.cy - cy);
      if (d < R * 0.6 && p.damagePlayer) { const keep = p.player; p.player = pl; p.damagePlayer(Math.round(pl.maxHp * 0.12), cx); p.player = keep; }
    }
    p.burst(cx, cy, 46, cryo ? '#bfefff' : '#ffb347', 420, 0.8, 4);
    p.burst(cx, cy, 24, cryo ? '#8fe9ff' : '#ff5a2a', 300, 1.1, 5);
    p.shake(12); p.sfx('slam');
  }

  // ---------- init, update, kill ----------
  const init0 = P.featuresInit;
  P.featuresInit = function () {
    init0.call(this);
    const L = this.L;
    L.illusions = L.illusions || [];
    for (const b of L.barrels || []) {
      const e = this.spawnEnemy('fuelpod', b.x, b.y, true);
      e.x = e.x0 = b.x - 13; e.y = e.y0 = b.y - 34; e.cryo = b.kind === 'cryo'; e.noContact = true;
      e.hp = e.maxHp = 12 * GV.SCALE.hp(this.diff);
    }
    // a cracked panel guarding a passage reveals it when it breaks
    for (const il of L.illusions) il.panel = (L.walls || []).find((w) => w.x >= il.x - 2 && w.x <= il.x + il.w && w.y >= il.y - 2 && w.y <= il.y + il.h + 30) || null;
  };
  const kill0 = P.killEnemy;
  P.killEnemy = function (e) {
    if (e.def === GV.ENEMIES.fuelpod) { if (e.dead) return; e.dead = true; blow(this, e); return; }
    return kill0.call(this, e);
  };
  const upd0 = P.updateFeatures;
  P.updateFeatures = function (dt) {
    upd0.call(this, dt);
    const L = this.L;
    for (const e of this.enemies) if (e.fuse > 0 && !e.dead) { e.fuse -= dt; if (e.fuse <= 0) this.killEnemy(e); }
    for (const il of L.illusions || []) {
      if (il.rev >= 1) continue;
      let inside = il.panel && il.panel.gone;
      for (const pl of this.players || [this.player]) {
        if (pl.dead) continue;
        if (pl.x + pl.w > il.x - 6 && pl.x < il.x + il.w + 6 && pl.y + pl.h > il.y && pl.y < il.y + il.h + 6) inside = true;
      }
      if (inside) {
        if (!il.found) { il.found = true; this.toast('A hidden passage', 1.8, 'small'); this.sfx('mem'); const st = ((GV.save.main || GV.save.data).stats = (GV.save.main || GV.save.data).stats || {}); st.secrets = (st.secrets || 0) + 1; }
        il.rev = Math.min(1, il.rev + dt * 2.5);
      }
    }
  };

  // ---------- drawing: false rock goes on top of what it hides ----------
  P.drawIllusions = function (ctx, v) {
    const L = this.L, pal = this.pal, t = this.t || 0;
    for (const il of L.illusions || []) {
      if (il.rev >= 1) continue;
      ctx.save(); ctx.globalAlpha *= 1 - il.rev;
      A.rock(ctx, il, pal, v || { x0: -1e9, x1: 1e9, y0: -1e9, y1: 1e9 });
      // the tell: a faint seam and an odd draught of dust (only if you look closely)
      ctx.globalAlpha *= 0.35 + 0.25 * Math.sin(t * 1.7);
      ctx.strokeStyle = A.col(pal.hB, 70, 60, 0.4); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(il.x + il.w * 0.42, il.y + il.h); ctx.lineTo(il.x + il.w * 0.47, il.y + il.h - 26); ctx.lineTo(il.x + il.w * 0.44, il.y + il.h - 48); ctx.stroke();
      ctx.restore();
      if (Math.random() < 0.04 && this.parts) this.parts.push({ x: il.x + il.w * (0.3 + Math.random() * 0.4), y: il.y + il.h, vx: (Math.random() - 0.5) * 10, vy: 14, life: 1.2, max: 1.2, size: 1.5, color: 'rgba(190,190,200,0.5)' });
    }
  };
})();
