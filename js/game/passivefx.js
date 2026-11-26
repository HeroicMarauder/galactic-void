// Galactic Void — what passives and ascendancies *do*, beyond plain stats.
//   st.tm : tag modifiers ("Slam skills deal 20% more damage") folded into a skill as it's built
//   st.fx : numbers read in combat (more damage against Frozen enemies, heal on kill, ...)
//   flags : on/off rules in st.asc (Graviton Palm, Retribution, ...)
// Combat calls the small hooks below (onKill, onBlock, onDash, dmgTakenMul).
(function () {
  const GV = window.GV, S = GV.Skills;

  // ---- tag modifiers: applied with the supports, before a skill's numbers are worked out ----
  GV.applyTagMods = function (s, st) {
    for (const m of st.tm || []) {
      if (!s.tags.has(m.t)) continue;
      if (m.more) s.more *= m.more;
      if (m.area) s.areaInc += m.area;
      if (m.cdr) s.cdrInc += m.cdr;
      if (m.speed) s.speedInc += m.speed;
      if (m.dur) s.durInc += m.dur;
      if (m.cost) s.costMul *= Math.max(0.1, 1 - m.cost / 100);
      if (m.proj) s.proj += m.proj;
      if (m.chain) s.chain += m.chain;
      if (m.pierce) s.pierce += m.pierce;
      if (m.crit) s.critInc += m.crit;
      if (m.minions) s.extraMinions = (s.extraMinions || 0) + m.minions;
      if (m.minionSpd) s.minionSpdInc = (s.minionSpdInc || 0) + m.minionSpd;
      if (m.leech) s.leech += m.leech;
    }
  };

  // ---- Absolute Zero: fire becomes cold ----
  const build0 = S.build;
  S.build = function (gem, st, W) {
    const s = build0.call(this, gem, st, W);
    if (s && st.ks && st.ks.absolute && s.parts.fire) { s.parts.cold = (s.parts.cold || 0) + s.parts.fire; delete s.parts.fire; }
    return s;
  };

  // ---- more damage, by circumstance ----
  const hit0 = S.hitEnemy;
  S.hitEnemy = function (p, e, s, o = {}) {
    const st = s.st, pl = s.pl || p.player, fx = (st && st.fx) || {}, ks = (st && st.ks) || {};
    let k = 1;
    if (fx.fullChargeMore && s.isSpell && pl.charge >= (pl.maxChargeEff || pl.maxCharge || 100) * 0.8) k *= 1 + fx.fullChargeMore / 100;
    if (fx.frozenMore && e.frz > 0) k *= 1 + fx.frozenMore / 100;
    if (e.chill > 0 && (fx.chilledMore || ks.absolute)) k *= 1 + ((fx.chilledMore || 0) + (ks.absolute ? 25 : 0)) / 100;
    if (fx.corruptedMore && e.cor && e.cor.length) k *= 1 + fx.corruptedMore / 100;
    if (fx.ignitedMore && e.ign) k *= 1 + fx.ignitedMore / 100;
    if (fx.shockedMore && e.shk > 0) k *= 1 + fx.shockedMore / 100;
    if (fx.airMore && !pl.onGround) k *= 1 + fx.airMore / 100;
    if (fx.bossMore && (e.boss || e.part || (e.def && e.def.titan))) k *= 1 + fx.bossMore / 100;
    if (fx.lowLifeMore && pl.hp < pl.maxHp * 0.5) k *= 1 + fx.lowLifeMore / 100;
    if (fx.fullLifeMore && pl.hp >= pl.maxHp * 0.9) k *= 1 + fx.fullLifeMore / 100;
    if (fx.stealthMore && o.ambush) k *= 1 + fx.stealthMore / 100;
    if (k !== 1) o = Object.assign({}, o, { mult: (o.mult || 1) * k });
    const dealt = hit0.call(this, p, e, s, o);
    // Graviton Palm: every fourth melee hit sends a shockwave through the target
    if (st && st.asc && st.asc.palm && s.tags && s.tags.has('Melee') && !o.haunt && dealt > 0) {
      pl.palmN = (pl.palmN || 0) + 1;
      if (pl.palmN % 4 === 0) {
        const x = e.x + e.w / 2, y = e.y + e.h / 2, amt = dealt * 0.6;
        p.delay(0.04, () => S.raw(p, x, y, 95, { phys: amt }, { exclude: e, color: '#9fffe0' }));
      }
    }
    return dealt;
  };

  // ---- hooks called from combat ----
  GV.onKill = function (p, e, pl) {
    const st = pl && pl.st; if (!st) return;
    const fx = st.fx || {};
    if (fx.killHeal && !pl.dead) pl.heal(pl.maxHp * fx.killHeal / 100);
    if (fx.killCharge) pl.charge = Math.min(pl.maxChargeEff || 100, pl.charge + fx.killCharge);
    if (fx.killWard) pl.ward = Math.min(pl.maxWard || pl.ward, (pl.ward || 0) + fx.killWard);
    if (fx.killBurst && !e.boss && !(e.def && e.def.titan)) {
      const x = e.x + e.w / 2, y = e.y + e.h / 2, amt = e.maxHp * fx.killBurst / 100;
      p.delay(0.05, () => S.raw(p, x, y, 100, { void: amt }, { exclude: e, color: '#ff6a9a' }));
    }
    if (fx.killSpeed) { pl.rushT = 3; }
  };
  GV.onBlock = function (p, pl) {
    const st = pl.st, fx = st.fx || {};
    const heal = (fx.blockHeal || 0) + (st.ks.bastion ? 3 : 0);
    if (heal) pl.heal(pl.maxHp * heal / 100);
    if (fx.blockWard) pl.ward = Math.min(pl.maxWard || 0, (pl.ward || 0) + fx.blockWard);
  };
  GV.dmgTakenMul = function (p, pl) {
    const fx = pl.st.fx || {};
    let k = 1;
    if (fx.hiLifeLess && pl.hp >= pl.maxHp * 0.75) k *= 1 - fx.hiLifeLess / 100;
    if (fx.lessTaken) k *= 1 - fx.lessTaken / 100;
    if (fx.minionShield && GV.minionCount && GV.minionCount(p, pl) > 0) k *= 1 - fx.minionShield / 100;
    return k;
  };
  GV.onDash = function (p, pl) {
    const fx = pl.st.fx || {};
    if (fx.dashStealth) { pl.stealth = Math.max(pl.stealth || 0, fx.dashStealth); pl.decoy = { x: pl.x, y: pl.y, w: pl.w, h: pl.h }; }
  };
})();
