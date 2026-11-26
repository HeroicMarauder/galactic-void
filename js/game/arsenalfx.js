// Galactic Void — what sets and dual wielding do in a fight, and where sets drop.
(function () {
  const GV = window.GV, U = GV.util, P = GV.Play.prototype, S = GV.Skills;

  const fx = (pl) => (pl && pl.st && pl.st.setFx) || {};

  // Hits: dash ambush, gravity pull, and dual wielding's alternating weapon effects.
  const hit0 = S.hitEnemy;
  S.hitEnemy = function (p, e, s, o = {}) {
    const pl = s.pl || p.player, F = fx(pl);
    if (F.dashAmbush && pl.ambushT > 0 && s.isAttack) o = Object.assign({}, o, { mult: (o.mult || 1) * 2 });
    const W = pl && pl.weapon;
    // with two weapons, every other hit uses the off-hand's effect
    let swapped = false;
    if (W && W.dual && s.isAttack && !o.fromFx) { pl.dualFlip = !pl.dualFlip; if (pl.dualFlip && W.fx2 !== W.fx) { pl._fx = W.fx; W.fx = W.fx2; swapped = true; } }
    let r;
    try { r = hit0.call(this, p, e, s, o); } finally { if (swapped) W.fx = pl._fx; }
    if (F.gravPull && !e.dead && !e.boss && !e.part && !e.def.static) e.vx += Math.sign(pl.cx - (e.x + e.w / 2)) * 160;
    return r;
  };

  // Track dashes (for Stalker) and spell casts (for Solar Choir).
  const use0 = S.use;
  S.use = function (p, pl, s, slot, opts) {
    const r = use0.apply(this, arguments);
    if (r === false) return r;
    const F = fx(pl);
    if (F.solarPillar && s && s.isSpell) {
      pl.solarN = (pl.solarN || 0) + 1;
      if (pl.solarN >= 5) {
        pl.solarN = 0;
        let best = null, bd = 520;
        for (const e of p.enemies) { if (e.dead || e.def.static) continue; const d = Math.hypot(e.x + e.w / 2 - pl.cx, e.y + e.h / 2 - pl.cy); if (d < bd) { bd = d; best = e; } }
        if (best) {
          const x = best.x + best.w / 2;
          p.novas.push({ x, y: best.y + best.h, r: 8, max: 70, t: 0, color: '#ffe9a8' });
          p.burst(x, best.y, 30, '#ffe9a8', 300, 0.6, 3);
          hit0.call(this, p, best, s, { mult: 2.2, fromFx: true });
        }
      }
    }
    return r;
  };
  const upd0 = GV.Player.prototype.update;
  GV.Player.prototype.update = function (dt, p) {
    const was = this.dashT > 0;
    upd0.call(this, dt, p);
    if (this.ambushT > 0) this.ambushT -= dt;
    if (!was && this.dashT > 0 && fx(this).dashAmbush) { this.ambushT = 1.5; p.text(this.cx, this.y - 12, 'AMBUSH', '#7dffcf', 12); }
  };

  // Being hit: Dreadnought / Oathkeeper shockwaves.
  const dmg0 = P.damagePlayer;
  P.damagePlayer = function (dmg, fromX, a, b) {
    const pl = this.player, hp0 = pl && pl.hp, inv0 = pl && pl.inv;
    const r = dmg0.call(this, dmg, fromX, a, b);
    if (pl && !pl.dead && fx(pl).retaliateNova && pl.hp < hp0 && !(inv0 > 0) && Math.random() < 0.25) {
      const s0 = pl.skills.find((s) => s && s.isAttack) || pl.skills[0];
      this.novas.push({ x: pl.cx, y: pl.cy, r: 10, max: 120, t: 0, color: '#ff8a5a' });
      this.shake(6);
      if (s0) for (const e of this.enemies) if (!e.dead && !e.def.static && Math.hypot(e.x + e.w / 2 - pl.cx, e.y + e.h / 2 - pl.cy) < 120) hit0.call(S, this, e, s0, { mult: 3, fromFx: true, kx: Math.sign(e.x - pl.cx) * 400, ky: -260 });
    }
    return r;
  };

  // Kills: Symbiont feast. Drops: set pieces from bosses, Titans and elites.
  const kill0 = P.killEnemy;
  P.killEnemy = function (e) {
    if (e.dead) return kill0.call(this, e);
    const r = kill0.call(this, e);
    if (e.def && e.def.static) return r;
    for (const pl of this.players || [this.player]) if (!pl.dead && fx(pl).feast) pl.heal(pl.maxHp * 0.03);
    const tier = GV.progress.dropTier(this.diff);
    const chance = e.part ? 0 : e.def && e.def.titan ? 0.6 : e.boss ? 0.1 : e.elite ? 0.012 : 0;
    if (Math.random() < chance) this.drops.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: (Math.random() - 0.5) * 200, vy: -480, w: 14, h: 14, kind: 'item', item: GV.items.randomSet(tier), age: 0 });
    // weapon sets: a rare boss or Titan drop
    const wchance = e.def && e.def.titan ? 0.3 : e.boss ? 0.04 : 0;
    if (Math.random() < wchance && this.dropWeapon) this.dropWeapon(e.x + e.w / 2, e.y + e.h / 2, GV.SET_WEAPONS[Math.floor(Math.random() * GV.SET_WEAPONS.length)]);
    return r;
  };
})();
