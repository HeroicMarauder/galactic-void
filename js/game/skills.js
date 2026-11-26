// Galactic Void — the skill engine. Builds a skill from a gem + its supports + the player's
// stats, then runs it: hitboxes, projectiles, areas, charges, channels, stealth, ailments.
(function () {
  const GV = window.GV, U = GV.util;
  const ELEM = ['fire', 'cold', 'light'];
  const ECHOABLE = new Set(['proj', 'spark', 'arc', 'nova', 'meteor']);
  const S = (GV.Skills = {});

  // ---------- build ----------
  S.build = function (gem, st, W) {
    const def = GV.GEMS[gem.id];
    if (!def) return null;
    const L = gem.lvl, tags = GV.gemTags(def);
    const s = {
      gem, def, id: gem.id, L, tags, kind: def.kind, name: def.name, icon: def.icon, color: def.color,
      more: 1, typeMore: {}, extra: {}, speedInc: 0, areaInc: 0, areaMore: 1,
      proj: def.proj || 1, pierce: def.pierce || 0, chain: def.chain || 0,
      ail: Object.assign({ ignite: 0, freeze: 0, shock: 0, corrupt: 0 }, def.ail || {}),
      leech: 0, echo: 0, ruthless: false, knock: 1, cdrInc: 0, costMul: 1, durInc: 0, cull: false,
      critInc: 0, critMulti: 0, noCrit: false, igniteMore: 1, vsChilled: 1, waves: def.waves || 0, repeat: 0,
      brutal: false, distMul: 1, supports: [], uses: 0,
    };
    for (const uid of gem.sup) {
      if (uid == null) continue;
      const it = GV.inv.sup(uid);
      const sd = it && GV.SUPPORTS[it.id];
      if (!sd || !GV.gemFits(sd, def)) continue;
      sd.apply(s); s.supports.push(it.id);
    }
    if (GV.applyTagMods) GV.applyTagMods(s, st);
    // Ascendancy rules that reshape skills
    const AF = st.asc || {};
    if (AF.moveCdr && tags.has('Movement')) s.cdrInc += 54;
    if (AF.whirlArea && tags.has('Channelling')) s.areaInc += 30;
    if (AF.cheapSpin && tags.has('Channelling')) { s.costMul *= 0.6; s.leech += 3; }
    if (AF.fade && tags.has('Stealth')) s.cdrInc += 67;
    if (AF.ricochet && tags.has('Projectile')) s.chain += 1;
    if (AF.fan && tags.has('Projectile') && tags.has('Attack')) s.proj += 1;
    if (AF.consecrate && def.kind === 'ground') s.areaInc += 40;
    if (AF.radiance && tags.has('Spell') && tags.has('Area')) s.areaInc += 15;
    if (AF.bash && gem.id === 'shcharge') { s.more *= 1.5; s.stunMul = 2; }
    s.isAttack = tags.has('Attack'); s.isSpell = tags.has('Spell');
    s.W = W; s.st = st;
    s.base = def.eff ? W.dmg * def.eff(L) : def.dmg ? def.dmg(L) : 0;
    let types = Object.assign({}, def.types || {});
    if (s.brutal) { types = types.phys ? { phys: types.phys } : {}; s.extra = {}; }
    const inc = st.inc.all + (tags.has('Melee') ? st.inc.melee : 0) + (tags.has('Projectile') ? st.inc.proj : 0) +
      (s.isSpell && !tags.has('Minion') ? st.inc.spell : 0) + (tags.has('Area') ? st.inc.area : 0) + (tags.has('Minion') ? (st.inc.minion || 0) : 0);
    const parts = {};
    const addPart = (t, frac) => { parts[t] = (parts[t] || 0) + s.base * frac * (1 + (inc + (st.inc[t] || 0)) / 100) * (s.typeMore[t] || 1); };
    for (const t in types) addPart(t, types[t]);
    for (const t in s.extra) addPart(t, s.extra[t]);
    const mm = s.more * st.more;
    let total = 0;
    for (const t in parts) { parts[t] *= mm; total += parts[t]; }
    s.parts = parts; s.total = total; s.incTotal = inc;
    const baseCrit = def.crit || (s.isAttack ? (W.crit || 5) : 6);
    s.crit = s.noCrit ? 0 : Math.min(85, baseCrit * (1 + (st.critInc + s.critInc) / 100));
    s.critMult = st.ks.overcharge ? 1 : 1.5 + (st.critMulti + s.critMulti) / 100;
    const spInc = s.speedInc + (s.isAttack ? st.atkSpd : 0) + ((s.isSpell || tags.has('Warcry')) ? st.castSpd : 0);
    s.useTime = (def.eff ? W.cd * (def.speed || 1) : (def.cast || 0.4)) / Math.max(0.25, 1 + spInc / 100);
    s.cd = (def.cd || 0) / Math.max(0.25, 1 + (st.cdr + s.cdrInc) / 100);
    s.areaMul = Math.sqrt(Math.max(0.1, (1 + (st.area + s.areaInc) / 100) * s.areaMore));
    s.radius = (def.radius || 0) * s.areaMul;
    s.dur = (def.dur || 0) * Math.max(0.2, 1 + (st.duration + s.durInc) / 100);
    if (tags.has('Projectile')) s.pierce += st.pierce;
    s.pspeed = (def.pspeed || 0) * (1 + st.projSpd / 100);
    s.cost = Math.round((def.cost ? def.cost(L) : 0) * s.costMul * (1 - st.costRed / 100) * (st.ks.bloodrite ? 0.5 : 1));
    s.ailF = { ignite: s.ail.ignite + st.ail.ignite, freeze: s.ail.freeze + st.ail.freeze, shock: s.ail.shock + st.ail.shock, corrupt: s.ail.corrupt + st.ail.corrupt };
    s.leech += st.leech; s.lifeOnHit = st.lifeOnHit; s.knock *= 1 + st.knock / 100;
    s.igniteMul = (1 + st.igniteDmg / 100) * s.igniteMore;
    s.chillMag = Math.min(0.5, 0.3 * (1 + st.chillEff / 100));
    return s;
  };

  // ---------- hits & ailments ----------
  S.hitEnemy = function (p, e, s, o = {}) {
    if (e.dead) return 0;
    const pl = s.pl || p.player, st = s.st;
    let mult = o.mult || 1;
    if (e.chill > 0) mult *= s.vsChilled;
    if (e.shk > 0) mult *= 1.2;
    if (e.exposed) mult *= 1.5;
    if (pl.buffs.howl > 0) mult *= 1 + pl.howlPct / 100;
    if (st.ks.starborn) mult *= pl.onGround ? 0.9 : 1.25;
    if (o.ambush) mult *= 1.5 * (1 + st.stealthDmg / 100);
    const AF = st.asc || {};
    if (AF.lastStand && pl.hp < pl.maxHp * 0.35) mult *= 1.3;
    if (AF.zeal && pl.zeal) mult *= 1 + 0.02 * pl.zeal;
    if (GV.codex) mult *= 1 + GV.codex.bonus(e.type);
    let forced = !!o.ambush;
    if (pl.quickdraw && s.isAttack) { forced = true; pl.quickdraw = false; }
    const crit = !!(forced || Math.random() * 100 < s.crit) && !s.noCrit;
    const parts = o.parts || s.parts;
    const out = {};
    let total = 0;
    for (const t in parts) {
      let v = parts[t] * mult * (0.9 + Math.random() * 0.2);
      if (crit) v *= s.critMult;
      if (pl.overT > 0 && ELEM.includes(t)) v *= 1.4;
      out[t] = v; total += v;
    }
    if (crit && st.ks.overcharge) pl.overT = 6;
    let dom = 'phys', dv = -1;
    for (const t in out) if (out[t] > dv) { dv = out[t]; dom = t; }
    p.damageEnemy(e, total, (o.kx || 0) * s.knock, o.ky || 0, crit, dom);
    if (s.leech > 0) pl.heal(total * s.leech / 100);
    if (s.lifeOnHit > 0) pl.heal(s.lifeOnHit);
    if (s.isAttack) pl.charge = Math.min(pl.maxChargeEff, pl.charge + 2);
    if (AF.zeal && s.tags.has('Melee')) { pl.zeal = Math.min(15, (pl.zeal || 0) + 1); pl.zealT = 4; }
    if (AF.haunt && o.ambush && !o.haunt) {
      const hx = e.x + e.w / 2, hy = e.y + e.h / 2, amt = total * 0.6;
      p.delay(0.05, () => S.raw(p, hx, hy, 95, { void: amt }, { exclude: e, color: '#c79bff' }));
    }
    if (e.dead) return total;
    S.applyAilments(e, s, out);
    if (o.stun) e.stun = Math.max(e.stun || 0, (e.boss ? o.stun * 0.3 : o.stun) * (s.stunMul || 1));
    if (s.cull && e.hp < e.maxHp * (e.boss ? 0.05 : 0.1)) {
      p.text(e.x + e.w / 2, e.y - 20, 'CULLED', '#ffd36b', 15);
      e.hp = 0; p.killEnemy(e);
    }
    return total;
  };
  S.applyAilments = function (e, s, out) {
    const roll = () => Math.random() * 100;
    if (out.fire > 0 && roll() < s.ailF.ignite) {
      const dps = out.fire * 0.45 * s.igniteMul;
      if (!e.ign || e.ign.dps < dps) e.ign = { dps, t: 3 }; else e.ign.t = 3;
    }
    if (out.cold > 0) {
      e.chill = 2; e.chillMag = s.chillMag * (e.boss ? 0.5 : 1);
      if (roll() < s.ailF.freeze) e.frz = e.boss ? 0.25 : 0.9;
    }
    if (out.light > 0 && roll() < s.ailF.shock) e.shk = 3;
    if (out.void > 0 && roll() < s.ailF.corrupt) { e.cor = e.cor || []; if (e.cor.length < 8) e.cor.push({ dps: out.void * 0.15, t: 4 }); }
  };
  // Runs every frame for every enemy. Returns whether it can act and how slowed it is.
  S.tickAilments = function (p, e, dt) {
    let dot = 0;
    if (e.ign) { e.ign.t -= dt; dot += e.ign.dps; if (e.ign.t <= 0) e.ign = null; }
    if (e.cor && e.cor.length) { for (const c of e.cor) { c.t -= dt; dot += c.dps; } e.cor = e.cor.filter((c) => c.t > 0); }
    if (e.bloom) { e.bloom.t -= dt; dot += e.bloom.dps; if (e.bloom.t <= 0) e.bloom = null; }
    if (e.chill > 0) e.chill -= dt;
    if (e.frz > 0) e.frz -= dt;
    if (e.shk > 0) e.shk -= dt;
    if (e.stun > 0) e.stun -= dt;
    if (dot > 0) {
      const dm = dot * dt * (e.shk > 0 ? 1.2 : 1);
      e.hp -= dm; e.dotAcc = (e.dotAcc || 0) + dm; e.dotT = (e.dotT || 0) - dt;
      if (e.dotT <= 0) {
        e.dotT = 0.5;
        if (e.dotAcc >= 1 && GV.settings.data.numbers) p.text(e.x + e.w / 2 + (Math.random() - 0.5) * 20, e.y - 4, Math.round(e.dotAcc), e.ign ? '#ffb36a' : '#d6a8ff', 12);
        e.dotAcc = 0;
      }
      if (e.hp <= 0) p.killEnemy(e);
    }
    return { act: !(e.frz > 0) && !(e.stun > 0), spd: e.chill > 0 ? 1 - (e.chillMag || 0.3) : 1 };
  };

  S.area = function (p, x, y, r, s, o = {}) {
    let n = 0;
    for (const e of p.enemies) {
      if (e.dead || (e.alpha != null && e.alpha < 0.4)) continue;
      if (U.circRect(x, y, r, e)) {
        const dir = Math.sign(e.x + e.w / 2 - x) || 1;
        S.hitEnemy(p, e, s, Object.assign({}, o, { kx: dir * (o.knock != null ? o.knock : 380), ky: o.ky != null ? o.ky : -220 }));
        n++;
      }
    }
    for (const rf of p.L.rifts) if (!rf.dead && U.circRect(x, y, r, rf)) p.damageRift(rf, (o.parts ? sum(o.parts) : s.total) * (o.mult || 1));
    return n;
  };
  const sum = (o) => { let t = 0; for (const k in o) t += o[k]; return t; };

  S.updateHitboxes = function (p, dt) {
    const pl = p.player;
    for (const hb of p.hitboxes) {
      hb.t -= dt;
      const r = hb.calc();
      const hpl = hb.s.pl || pl;
      for (const e of p.enemies) {
        if (e.dead || hb.set.has(e) || (e.alpha != null && e.alpha < 0.4)) continue;
        if (!U.ov(r, e)) continue;
        hb.set.add(e);
        const o = Object.assign({}, hb.o);
        if (o.radial) o.kx = (Math.sign(e.x + e.w / 2 - hpl.cx) || 1) * (o.knockAmt || 300);
        if (hb.perEnemy) Object.assign(o, hb.perEnemy(e, o));
        S.hitEnemy(p, e, hb.s, o);
        if (hb.onHit) hb.onHit(e);
      }
      for (const rf of p.L.rifts) if (!rf.dead && !hb.set.has(rf) && U.ov(r, rf)) { hb.set.add(rf); p.damageRift(rf, hb.s.total * (hb.o.mult || 1)); }
    }
    p.hitboxes = p.hitboxes.filter((h) => h.t > 0);
  };

  // Friendly projectile hit: pierce first, then chain to the next nearest foe.
  S.projHit = function (p, pr, e) {
    pr.hit.add(e);
    S.hitEnemy(p, e, pr.s, Object.assign({ kx: Math.sign(pr.vx) * 260, ky: -120 }, pr.o, { mult: ((pr.o && pr.o.mult) || 1) * (pr.mult || 1) }));
    if (pr.kind === 'spark' || pr.kind === 'wave') return;
    if (pr.pierce > 0) { pr.pierce--; return; }
    if (pr.chain > 0) {
      let best = null, bd = 300 * 300;
      for (const o of p.enemies) {
        if (o.dead || pr.hit.has(o)) continue;
        const dx = o.x + o.w / 2 - pr.x, dy = o.y + o.h / 2 - pr.y, dd = dx * dx + dy * dy;
        if (dd < bd) { bd = dd; best = o; }
      }
      if (best) {
        pr.chain--;
        const sp = Math.hypot(pr.vx, pr.vy) || 800;
        const dx = best.x + best.w / 2 - pr.x, dy = best.y + best.h / 2 - pr.y, d = Math.hypot(dx, dy) || 1;
        pr.vx = (dx / d) * sp; pr.vy = (dy / d) * sp; pr.life = Math.max(pr.life, 0.5);
        return;
      }
    }
    pr.life = 0;
  };

  const nearestEnemy = (p, x, y, range, facing) => {
    let best = null, bd = range * range;
    for (const e of p.enemies) {
      if (e.dead || (e.alpha != null && e.alpha < 0.4)) continue;
      const dx = e.x + e.w / 2 - x, dy = e.y + e.h / 2 - y;
      if (facing && dx * facing < -30) continue;
      const dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; best = e; }
    }
    return best;
  };
  const freeAt = (p, r) => { let ok = true; p.eachSolid(false, (s) => { if (ok && U.ov(r, s)) ok = false; }); return ok; };

  // ---------- use a skill ----------
  S.use = function (p, pl, s, slot, opts = {}) {
    // Free aim: turn to face where you're aiming, and remember the aim for the switch below.
    const AM = GV.aim ? GV.aim.of(pl) : null;
    if (AM && Math.abs(AM.x) > (s.kind === 'charge' ? 0.05 : 0.15)) { pl.facing = AM.x > 0 ? 1 : -1; pl.aimFaceT = 0.45; }
    const def = s.def, f = pl.facing;
    const ambush = pl.stealth > 0 && !s.tags.has('Stealth') && !opts.echoed;
    if (ambush) pl.stealth = 0;
    let mult = opts.mult || 1;
    if (s.ruthless) { s.uses++; if (s.uses % 3 === 0) { mult *= 2; p.text(pl.cx, pl.y - 26, 'RUTHLESS', '#ff8a98', 13); } }
    const base = { ambush, mult };
    switch (s.kind) {
      case 'melee': {
        const W = s.W, reach = W.range * s.areaMul, hh = W.h * s.areaMul;
        // aim up to strike overhead; aim down in the air to strike below and bounce off what you hit
        const vert = AM && AM.y < -0.7 ? -1 : AM && AM.y > 0.7 && !pl.onGround ? 1 : 0;
        pl.swing = { t: W.active, max: W.active, color: def.color === '#9fe8ff' ? W.color : def.color, kind: W.h > 40 ? 'arc' : 'thrust', reach, hh, vert };
        const wide = Math.max(hh, 56);
        p.hitboxes.push({
          s, t: W.active, set: new Set(), o: Object.assign(vert ? { kx: 0, ky: vert < 0 ? -420 : 260 } : { kx: f * W.knock, ky: -170 }, base),
          onHit: vert > 0 ? () => { if (pl.vy > -480) { pl.vy = -560; pl.dashes = Math.max(pl.dashes || 0, 1); } } : null,
          calc: vert < 0 ? () => ({ x: pl.cx - wide / 2, y: pl.y - reach + 12, w: wide, h: reach })
            : vert > 0 ? () => ({ x: pl.cx - wide / 2, y: pl.y + pl.h - 12, w: wide, h: reach })
            : () => ({ x: pl.facing > 0 ? pl.x + pl.w - 4 : pl.x - reach + 4, y: pl.y + pl.h * 0.42 - hh / 2, w: reach, h: hh }),
          perEnemy: def.backstab ? (e, o) => ({ mult: o.mult * ((e.dir === pl.facing || ambush) ? 2 : 1) }) : null,
        });
        p.sfx('swing');
        break;
      }
      case 'sweep': {
        const r = s.radius;
        pl.swing = { t: 0.2, max: 0.2, color: def.color, kind: 'spin', reach: r };
        p.hitboxes.push({ s, t: 0.14, set: new Set(), o: Object.assign({ radial: true, knockAmt: 320, ky: -200 }, base), calc: () => ({ x: pl.cx - r, y: pl.cy - r * 0.6, w: r * 2, h: r * 1.2 }) });
        p.sfx('swing');
        break;
      }
      case 'slam': {
        const r = s.radius;
        const doSlam = (m) => {
          const cx = pl.cx + pl.facing * r * 0.7, cy = pl.y + pl.h;
          S.area(p, cx, cy - r * 0.4, r, s, Object.assign({}, base, { mult: m, knock: 420, ky: -300 }));
          p.novas.push({ x: cx, y: cy - 8, r: 10, max: r, t: 0, color: def.color });
          for (let w = 0; w < s.waves; w++) for (const dir of [-1, 1]) {
            p.spawnProj({ x: cx + dir * 20, y: cy - 14, vx: dir * (430 + w * 90), vy: 0, r: 13, friendly: true, kind: 'wave', s, hit: new Set(), pierce: 99, chain: 0, life: 0.85 + w * 0.15, mult: m * 0.6, o: base, color: def.color });
          }
          p.shake(9); p.sfx('slam');
        };
        doSlam(mult);
        if (s.repeat && Math.random() < s.repeat) p.delay(0.32, () => doSlam(mult));
        pl.swing = { t: 0.22, max: 0.22, color: def.color, kind: 'arc', reach: r };
        break;
      }
      case 'dive':
        pl.dive = { s, o: base, t: pl.onGround ? 0.17 : 0 };
        if (pl.onGround) { pl.vy = -580; pl.onGround = false; }
        p.sfx('jump');
        break;
      case 'proj': {
        const n = s.proj, spread = def.spread || 0.1;
        const a0 = AM ? Math.atan2(AM.y, AM.x) : f > 0 ? 0 : Math.PI;
        for (let i = 0; i < n; i++) {
          const a = a0 + (i - (n - 1) / 2) * spread;
          p.spawnProj({ x: pl.cx + Math.cos(a0) * 16, y: pl.y + 20 + Math.sin(a0) * 10, vx: Math.cos(a) * s.pspeed, vy: Math.sin(a) * s.pspeed, r: def.r || 7, friendly: true, kind: 'gem', s, hit: new Set(), pierce: s.pierce, chain: s.chain, life: def.life || 0.8, o: base, color: def.color });
        }
        if (s.isAttack) pl.swing = { t: 0.08, max: 0.08, color: def.color, kind: 'shot', reach: 30 };
        p.sfx('shoot');
        break;
      }
      case 'spark':
        for (let i = 0; i < s.proj; i++) {
          const sa = AM ? Math.atan2(AM.y, AM.x) + (Math.random() - 0.5) * 0.7 : null, sv = s.pspeed * (0.55 + Math.random() * 0.6);
          p.spawnProj({ x: pl.cx + f * 12, y: pl.y + 24, vx: AM ? Math.cos(sa) * sv : f * sv, vy: AM ? Math.sin(sa) * sv : (Math.random() - 0.6) * 380, r: def.r || 6, friendly: true, kind: 'spark', s, hit: new Set(), rehit: new Map(), pierce: 99, chain: 0, life: s.dur, grav: 900, o: base, color: def.color });
        }
        p.sfx('skill');
        break;
      case 'arc': {
        let from = { x: pl.cx + f * 12, y: pl.cy - 4 };
        const hit = new Set(), pts = [from];
        for (let c = 0; c <= s.chain; c++) {
          const best = c === 0 && AM ? GV.aim.pick(p, pl, def.range * s.areaMul, 0.6) : nearestEnemy({ enemies: p.enemies.filter((e) => !hit.has(e)) }, from.x, from.y, c === 0 ? def.range * s.areaMul : 270, c === 0 ? f : 0);
          if (!best) break;
          hit.add(best);
          const tp = { x: best.x + best.w / 2, y: best.y + best.h / 2 };
          pts.push(tp);
          S.hitEnemy(p, best, s, Object.assign({ kx: f * 120, ky: -60 }, base));
          from = tp;
        }
        if (pts.length === 1) pts.push(AM ? { x: pl.cx + AM.x * 200, y: pl.cy + AM.y * 200 } : { x: pl.cx + f * 200, y: pl.cy + (Math.random() - 0.5) * 60 });
        p.bolts.push({ pts, t: 0.2, max: 0.2, color: def.color });
        p.sfx('shoot');
        break;
      }
      case 'nova':
        S.area(p, pl.cx, pl.cy, s.radius, s, Object.assign({}, base, { knock: 560, ky: -280 }));
        p.novas.push({ x: pl.cx, y: pl.cy, r: 10, max: s.radius, t: 0, color: def.color });
        p.shake(7); p.sfx('skill');
        break;
      case 'meteor': {
        const tgt = AM ? GV.aim.pick(p, pl, 560, 0.35) : nearestEnemy(p, pl.cx, pl.cy, 560, f);
        let tx, ty;
        if (AM && AM.src === 'mouse' && !tgt) { const pt = GV.aim.point(pl, 560); tx = pt.x; ty = p.groundYAt(tx, pt.y - 40) || pt.y; }
        else if (AM && !tgt) { tx = pl.cx + AM.x * 300; ty = p.groundYAt(tx, pl.cy + AM.y * 300 - 200) || pl.y + pl.h; }
        else if (tgt) { tx = tgt.x + tgt.w / 2; ty = tgt.y + tgt.h; }
        else { tx = pl.cx + f * 260; ty = p.groundYAt(tx, pl.y - 200) || pl.y + pl.h; }
        p.strikes.push({ x: tx, y: ty, r: s.radius, t: def.delay, max: def.delay, s, o: base });
        p.sfx('skill');
        break;
      }
      case 'bloom': {
        const tgt = AM ? GV.aim.pick(p, pl, 460, 0.5) : nearestEnemy(p, pl.cx, pl.cy, 460, 0);
        if (!tgt) { p.text(pl.cx, pl.y - 14, 'NO TARGET', '#d6a8ff', 12); break; }
        const cx = tgt.x + tgt.w / 2, cy = tgt.y + tgt.h / 2;
        const dps = (s.total * mult * (ambush ? 1.5 : 1)) / Math.max(0.5, s.dur);
        for (const e of p.enemies) if (!e.dead && U.circRect(cx, cy, s.radius, e)) e.bloom = { dps, t: s.dur, s };
        p.novas.push({ x: cx, y: cy, r: 10, max: s.radius, t: 0, color: def.color });
        p.burst(cx, cy, 24, def.color, 200, 0.6, 3);
        p.sfx('skill');
        break;
      }
      case 'ground':
        p.grounds.push({ x: pl.cx, y: pl.y + pl.h, r: s.radius, t: s.dur, max: s.dur, s, tick: 0, o: base });
        p.sfx('beacon');
        break;
      case 'orbit':
        pl.orbit = { t: s.dur, n: s.proj, s, cd: new Map(), o: base };
        p.sfx('skill');
        break;
      case 'heal':
        pl.heal(pl.maxHp * def.heal(s.L));
        pl.ward = Math.min(pl.maxWard, pl.ward + pl.maxWard * 0.25);
        p.burst(pl.cx, pl.cy, 24, '#9fffd8', 160, 0.7, 3);
        p.text(pl.cx, pl.y - 10, '+LIFE', '#9fffd8', 15);
        p.sfx('heal');
        break;
      case 'cloak':
        if (s.st.asc && s.st.asc.quickdraw) pl.quickdraw = true;
        pl.stealth = s.dur;
        pl.decoy = { x: pl.x, y: pl.y, w: pl.w, h: pl.h };
        p.burst(pl.cx, pl.cy, 30, def.color, 180, 0.6, 3);
        p.sfx('dash');
        break;
      case 'blink': {
        const old = { x: pl.x, y: pl.y, w: pl.w, h: pl.h };
        const tgt = AM ? GV.aim.pick(p, pl, 440, 0.45) : nearestEnemy(p, pl.cx, pl.cy, 440, 0);
        let moved = false;
        if (tgt) {
          for (const side of [-tgt.dir, tgt.dir]) {
            const nx = side < 0 ? tgt.x - pl.w - 12 : tgt.x + tgt.w + 12;
            const ny = tgt.y + tgt.h - pl.h;
            const r = { x: nx, y: ny, w: pl.w, h: pl.h };
            if (freeAt(p, r)) { pl.x = nx; pl.y = ny; pl.facing = side < 0 ? 1 : -1; moved = true; break; }
          }
        }
        if (!moved && AM) {
          const max = AM.src === 'mouse' ? Math.min(260, Math.max(60, Math.hypot(AM.px - pl.cx, AM.py - pl.cy))) : 240;
          for (let d = max; d >= 40; d -= 30) {
            const r = { x: pl.x + AM.x * d, y: pl.y + AM.y * d, w: pl.w, h: pl.h };
            if (freeAt(p, r)) { pl.x = r.x; pl.y = r.y; moved = true; break; }
          }
        }
        if (!moved) {
          for (let dx = 240; dx >= 40; dx -= 40) {
            const r = { x: pl.x + f * dx, y: pl.y, w: pl.w, h: pl.h };
            if (freeAt(p, r)) { pl.x = r.x; moved = true; break; }
          }
        }
        pl.vx = 0; pl.vy = 0; pl.inv = Math.max(pl.inv, 0.3);
        pl.stealth = Math.max(pl.stealth, s.dur);
        pl.decoy = old;
        if (s.st.asc && s.st.asc.quickdraw) pl.quickdraw = true;
        p.burst(old.x + old.w / 2, old.y + old.h / 2, 20, def.color, 160, 0.5, 3);
        p.burst(pl.cx, pl.cy, 20, def.color, 160, 0.5, 3);
        p.sfx('dash');
        break;
      }
      case 'howl':
        S.area(p, pl.cx, pl.cy, s.radius, s, Object.assign({}, base, { knock: 620, ky: -260 }));
        pl.buffs.howl = s.dur; pl.howlPct = def.buff(s.L);
        p.novas.push({ x: pl.cx, y: pl.cy, r: 10, max: s.radius, t: 0, color: def.color });
        p.shake(6); p.sfx('hurt');
        break;
      case 'minion': {
        p.minions = p.minions.filter((m) => m.kind !== 'echo');
        const n = (def.count || 2) + (s.extraMinions || 0);
        for (let i = 0; i < n; i++) p.minions.push({ kind: 'echo', i, x: pl.cx - f * (30 + i * 26), y: pl.y, t: s.dur, s, cd: 0.4 + i * 0.2, o: { mult: mult } });
        p.burst(pl.cx, pl.cy, 30, def.color, 180, 0.7, 3);
        p.sfx('skill');
        break;
      }
      case 'turret': {
        const max = (def.count || 2) + (s.extraMinions || 0);
        const ty = p.groundYAt(pl.cx, pl.y) || pl.y + pl.h;
        p.minions.push({ kind: 'turret', x: pl.cx, y: ty, t: s.dur, s, cd: 0.3, o: { mult } });
        const ts = p.minions.filter((m) => m.kind === 'turret');
        if (ts.length > max) p.minions.splice(p.minions.indexOf(ts[0]), 1);
        p.sfx('beacon');
        break;
      }
      case 'charge': {
        const dist = (def.dist || 300) * s.distMul, sp = 1150;
        pl.charging = { t: dist / sp, sp, dir: f, s, set: new Set(), o: Object.assign({ kx: f * 520, ky: -260, stun: def.stun || 0 }, base), color: def.color, trailT: 0 };
        pl.inv = Math.max(pl.inv, dist / sp + 0.1);
        p.sfx('dash');
        break;
      }
    }
    if (s.echo && !opts.echoed && ECHOABLE.has(s.kind)) p.delay(0.22, () => { if (!pl.dead) S.use(p, pl, s, slot, { echoed: true }); });
  };

  // Comet Drop landing
  S.land = function (p, pl) {
    const dv = pl.dive;
    pl.dive = null;
    const s = dv.s;
    S.area(p, pl.cx, pl.y + pl.h - 20, s.radius, s, Object.assign({}, dv.o, { knock: 460, ky: -360 }));
    p.novas.push({ x: pl.cx, y: pl.y + pl.h - 10, r: 10, max: s.radius, t: 0, color: s.def.color });
    p.burst(pl.cx, pl.y + pl.h, 30, s.def.color, 300, 0.6, 3);
    pl.inv = Math.max(pl.inv, 0.25);
    p.shake(11); p.sfx('slam');
  };

  // A burst that isn't tied to a skill (Martyrdom, Retribution, Haunt): already-final damage parts.
  S.raw = function (p, x, y, r, parts, opts = {}) {
    const st = p.player.st;
    let total = 0; for (const k in parts) total += parts[k];
    const s = { st, parts, total, crit: 5, critMult: 1.5, noCrit: false, ailF: { ignite: 0, freeze: 0, shock: 0, corrupt: 0 }, leech: 0, lifeOnHit: 0,
      knock: 1, vsChilled: 1, isAttack: false, tags: new Set(), cull: false, igniteMul: 1, chillMag: 0.3, def: { color: opts.color || '#fff' } };
    for (const e of p.enemies) {
      if (e.dead || e === opts.exclude || (e.alpha != null && e.alpha < 0.4)) continue;
      if (U.circRect(x, y, r, e)) S.hitEnemy(p, e, s, { kx: (Math.sign(e.x + e.w / 2 - x) || 1) * 320, ky: -200, haunt: true });
    }
    p.novas.push({ x, y, r: 10, max: r, t: 0, color: opts.color || '#fff' });
  };

  // Whirlwind tick
  S.channelTick = function (p, pl, s) {
    if (s.st.asc && s.st.asc.whirlPull) {
      for (const e of p.enemies) {
        if (e.dead || e.boss) continue;
        const dx = pl.cx - (e.x + e.w / 2);
        if (Math.abs(dx) < s.radius * 1.8 && Math.abs(pl.cy - (e.y + e.h / 2)) < 140) { e.vx = Math.sign(dx) * 280; e.knockT = 0.12; }
      }
    }
    S.area(p, pl.cx, pl.cy, s.radius, s, { knock: 200, ky: -120, mult: 1 });
    pl.swing = { t: 0.2, max: 0.2, color: s.def.color, kind: 'spin', reach: s.radius };
  };

  // Herald of Embers explosion
  S.heraldBurst = function (p, e, s) {
    const st = s.st;
    const amt = e.maxHp * s.def.pct(s.L) * (1 + (st.inc.all + st.inc.fire + st.inc.area) / 100) * s.more * st.more;
    const x = e.x + e.w / 2, y = e.y + e.h / 2, r = s.radius;
    p.delay(0.06, () => {
      S.area(p, x, y, r, s, { parts: { fire: amt }, knock: 300, ky: -200 });
      p.novas.push({ x, y, r: 10, max: r, t: 0, color: s.def.color });
    });
  };

  // Damage summary used by the gem screen.
  S.summary = function (s) {
    const out = [];
    const range = (v) => `${Math.round(v * 0.9)}–${Math.round(v * 1.1)}`;
    for (const t in s.parts) out.push({ label: `${GV.DMG_NAMES[t]} damage`, value: range(s.parts[t]), color: GV.DMG_COLORS[t] });
    if (s.kind === 'heal') out.push({ label: 'Heals', value: Math.round(s.def.heal(s.L) * 100) + '% of Life' });
    if (s.kind === 'cloak' || s.kind === 'blink') out.push({ label: 'Stealth', value: s.dur.toFixed(1) + 's' });
    if (s.kind === 'herald') out.push({ label: 'Explosion', value: Math.round(s.def.pct(s.L) * 100) + '% of enemy Life as Fire' });
    out.push({ label: s.isAttack ? 'Attack time' : 'Cast time', value: s.useTime.toFixed(2) + 's' });
    if (s.cost) out.push({ label: s.st.ks.bloodrite ? 'Cost (Life)' : 'Cost (Charge)', value: s.cost + (s.kind === 'channel' ? ' per spin' : '') });
    if (s.cd) out.push({ label: 'Cooldown', value: s.cd.toFixed(1) + 's' });
    if (Object.keys(s.parts).length) out.push({ label: 'Critical chance', value: s.crit.toFixed(1) + '% · ×' + s.critMult.toFixed(2) });
    if (s.tags.has('Projectile')) out.push({ label: 'Projectiles', value: `${s.proj}${s.pierce ? ` · pierce ${s.pierce}` : ''}${s.chain ? ` · chain ${s.chain}` : ''}` });
    else if (s.chain) out.push({ label: 'Chains', value: s.chain });
    if (s.radius) out.push({ label: 'Radius', value: Math.round(s.radius) });
    if (s.dur && s.kind !== 'cloak' && s.kind !== 'blink') out.push({ label: 'Duration', value: s.dur.toFixed(1) + 's' });
    const a = s.ailF, ails = [];
    if (s.parts.fire && a.ignite) ails.push(`Ignite ${Math.min(100, a.ignite)}%`);
    if (s.parts.cold) ails.push('Chill' + (a.freeze ? ` · Freeze ${a.freeze}%` : ''));
    if (s.parts.light && a.shock) ails.push(`Shock ${Math.min(100, a.shock)}%`);
    if (s.parts.void && a.corrupt) ails.push(`Corrupt ${Math.min(100, a.corrupt)}%`);
    if (ails.length) out.push({ label: 'Ailments', value: ails.join(' · ') });
    if (s.leech) out.push({ label: 'Leech', value: s.leech + '%' });
    return out;
  };
})();
