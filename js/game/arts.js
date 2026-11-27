// Galactic Void — Skill Arts. Every Star Core learns Arts as it levels:
//  Lv 4  Flow      — each use within 2.5s of your last skill builds Combo (+4% damage per stack, max 5).
//                    Switching to a different skill builds 2 stacks at once.
//  Lv 8  Style     — every 3rd use the move changes form (depends on the skill's school).
//  Lv 14 Finisher  — at full Combo the next use is a Finisher: double damage plus a signature burst. Combo resets.
//  Lv 20 Mastery   — Combo can reach 8, and Finishers refresh your step (haste) and guard.
(function () {
  const GV = window.GV, S = GV.Skills, P = GV.Play.prototype;
  const TIERS = [4, 8, 14, 20], WINDOW = 2.5, PER = 0.04;

  const MOVE_KINDS = new Set(['blink', 'charge', 'dive', 'lunge', 'float', 'hook']);
  const NO_ECHO = new Set(['blink', 'charge', 'dive', 'lunge', 'float', 'hook', 'cloak', 'aegis', 'herald', 'command', 'drones', 'turret', 'minion', 'hound', 'hounds', 'wisps', 'wisp', 'colossus', 'orbit', 'channel', 'echo', 'howl', 'well', 'bloom', 'spores', 'spore']);
  const AREA_KINDS = new Set(['nova', 'ground', 'meteor', 'pillar', 'wave', 'pulse', 'slam', 'mine', 'detonate', 'horizon', 'well']);

  // Five schools; each skill belongs to one by its tags and kind.
  GV.ART_SCHOOLS = {
    blade: { name: 'Blade Arts', color: '#ffd28a', style: ['Whirl Step', 'Every 3rd use you lunge forward and spin, cutting all around you for 60% damage.'], fin: ['Rending Crescent', 'A huge crescent cleaves everything in front of you for 150% damage.'] },
    gun: { name: 'Gunner Arts', color: '#9fe8ff', style: ['Double Tap', 'Every 3rd use fires a second time a moment later for 50% damage.'], fin: ['Overcharge', 'The shot detonates on the nearest enemy, blasting the area for 120% damage.'] },
    storm: { name: 'Storm Arts', color: '#c79bff', style: ['Aftershock', 'Every 3rd use, a second blast follows where it landed for 50% damage.'], fin: ['Cataclysm', 'Three blasts ripple out from you, each one wider than the last.'] },
    mend: { name: 'Mender Arts', color: '#7dffb0', style: ['Afterglow', 'Every 3rd heal also wraps you in a ward: 25% less damage taken for 3s.'], fin: ['Lifebloom', 'Your heal blooms outward, burning enemies around you with light.'] },
    path: { name: 'Pathfinder Arts', color: '#ffe27a', style: ['Momentum', 'Every 3rd use gives 30% more move speed for 2.5s.'], fin: ['Second Wind', 'Restores 12% of your Life and grants 2s of 30% less damage taken.'] },
  };
  GV.artSchool = (s) => {
    const t = s.tags, k = s.kind;
    if (t.has('Heal') || k === 'heal') return 'mend';
    if (MOVE_KINDS.has(k) || t.has('Minion') || t.has('Movement') || NO_ECHO.has(k)) return 'path';
    if (t.has('Melee')) return 'blade';
    if (AREA_KINDS.has(k) || (t.has('Area') && !t.has('Projectile'))) return 'storm';
    return 'gun';
  };
  GV.artsOf = (gemOrSkill) => {
    const lvl = gemOrSkill.L != null ? gemOrSkill.L : gemOrSkill.lvl || 1;
    const def = gemOrSkill.def || GV.GEMS[gemOrSkill.id];
    const s = gemOrSkill.tags ? gemOrSkill : { tags: GV.gemTags(def), kind: def.kind };
    const sc = GV.artSchool(s), D = GV.ART_SCHOOLS[sc];
    return {
      school: sc, def: D,
      list: [
        { lvl: TIERS[0], name: 'Flow', desc: 'Using skills back to back builds Combo: +4% damage per stack, up to 5. Switching skills builds 2 at once.' },
        { lvl: TIERS[1], name: D.style[0], desc: D.style[1] },
        { lvl: TIERS[2], name: D.fin[0], desc: 'Finisher: at full Combo your next use deals double damage. ' + D.fin[1] },
        { lvl: TIERS[3], name: 'Mastery', desc: 'Combo can reach 8, and each Finisher grants 2s of haste and guard.' },
      ].map((a) => Object.assign(a, { on: lvl >= a.lvl })),
    };
  };

  // ---------- effects ----------
  const fx = (p, x, y, r, color, t = 0.35) => { (p.artFx = p.artFx || []).push({ x, y, r, color, t, max: t }); };
  const later = (p, t, fn) => { (p.artQ = p.artQ || []).push({ t, fn }); };
  const scaleDmg = (p) => 45 * GV.SCALE.hp(p.diff) * (1 + 0.25 * (p.sysIdx || 0));
  function nearestAhead(p, pl, range = 420) {
    let best = null, bd = range * range;
    for (const e of p.enemies) {
      if (e.dead || (e.def && e.def.static) || (e.alpha != null && e.alpha < 0.4)) continue;
      const dx = e.x + e.w / 2 - pl.cx, dy = e.y + e.h / 2 - pl.cy;
      if (dx * pl.facing < -40) continue;
      const d2 = dx * dx + dy * dy; if (d2 < bd) { bd = d2; best = e; }
    }
    return best;
  }
  function rawAs(p, pl, x, y, r, amt, color) { const keep = p.player; p.player = pl; S.raw(p, x, y, r, { phys: amt * 0.5, light: amt * 0.5 }, { color }); p.player = keep; }

  function style(p, pl, s, slot, opts, sc, mult) {
    const col = GV.ART_SCHOOLS[sc].color;
    if (sc === 'blade') {
      pl.vx = pl.facing * 520; if (!pl.onGround) pl.vy = Math.min(pl.vy, -120);
      later(p, 0.1, () => { S.area(p, pl.cx, pl.cy, 100, s, { mult: 0.6 * mult, knock: 300 }); fx(p, pl.cx, pl.cy, 100, col); });
      p.text(pl.cx, pl.y - 30, 'WHIRL STEP', col, 12);
    } else if (sc === 'gun') {
      later(p, 0.14, () => { if (!pl.dead) S.use(p, pl, s, slot, Object.assign({}, opts, { mult: 0.5 * mult, echoed: true, art: true })); });
    } else if (sc === 'storm') {
      const e = nearestAhead(p, pl, 360);
      const x = s.kind === 'nova' || s.kind === 'slam' || !e ? pl.cx + (s.kind === 'nova' ? 0 : pl.facing * 90) : e.x + e.w / 2;
      const y = s.kind === 'nova' || s.kind === 'slam' || !e ? pl.cy : e.y + e.h / 2;
      later(p, 0.35, () => { S.area(p, x, y, 110, s, { mult: 0.5 * mult }); fx(p, x, y, 110, col, 0.45); p.shake && p.shake(3); });
    } else if (sc === 'mend') {
      pl.artWardT = 3; fx(p, pl.cx, pl.cy, 60, col, 0.5); p.text(pl.cx, pl.y - 30, 'AFTERGLOW', col, 12);
    } else {
      pl.artHasteT = 2.5; p.text(pl.cx, pl.y - 30, 'MOMENTUM', col, 12);
    }
  }
  function finisher(p, pl, s, sc, mult, mastery) {
    const col = GV.ART_SCHOOLS[sc].color, f = pl.facing;
    p.text(pl.cx, pl.y - 44, GV.ART_SCHOOLS[sc].fin[0].toUpperCase(), col, 17);
    p.hitStop && p.hitStop(0.06); p.shake && p.shake(6);
    if (sc === 'blade') {
      later(p, 0.08, () => { const x = pl.cx + f * 95; S.area(p, x, pl.cy, 150, s, { mult: 1.5 * mult, knock: 520, ky: -320 }); fx(p, x, pl.cy, 150, col, 0.45); });
    } else if (sc === 'gun') {
      const e = nearestAhead(p, pl, 600);
      if (e) later(p, 0.18, () => { const x = e.x + e.w / 2, y = e.y + e.h / 2; S.area(p, x, y, 130, s, { mult: 1.2 * mult }); fx(p, x, y, 130, col, 0.45); p.burst && p.burst(x, y, 24, col, 300, 0.5, 3); });
    } else if (sc === 'storm') {
      [0, 0.18, 0.36].forEach((t, i) => later(p, t + 0.1, () => { const r = 110 + i * 60; S.area(p, pl.cx, pl.cy, r, s, { mult: 0.6 * mult }); fx(p, pl.cx, pl.cy, r, col, 0.4); }));
    } else if (sc === 'mend') {
      rawAs(p, pl, pl.cx, pl.cy, 150, scaleDmg(p) * (1 + (s.L || 1) * 0.08), col); fx(p, pl.cx, pl.cy, 150, col, 0.6);
    } else {
      pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * 0.12); pl.artWardT = Math.max(pl.artWardT || 0, 2); fx(p, pl.cx, pl.cy, 70, col, 0.5);
    }
    if (mastery) { pl.artHasteT = Math.max(pl.artHasteT || 0, 2); pl.artWardT = Math.max(pl.artWardT || 0, 2); }
  }

  // ---------- the hook ----------
  // Remember which cores each player actually uses, so only those earn XP from kills.
  GV.gemUse = { p1: {} };
  GV.LASTING_KINDS = new Set(['herald', 'drones', 'turret', 'minion', 'hound', 'hounds', 'wisps', 'wisp', 'colossus', 'orbit', 'spores', 'spore', 'well', 'aegis', 'cloak', 'command', 'bloom']);
  const use0 = S.use;
  S.use = function (p, pl, s, slot, opts = {}) {
    if (s && s.gem && pl && !(opts && (opts.echoed || opts.art))) { const who = pl.slot || 'p1'; (GV.gemUse[who] = GV.gemUse[who] || {})[s.gem.uid] = performance.now(); }
    if (!s || !pl || opts.echoed || opts.art || !s.gem) return use0.apply(this, arguments);
    const L = s.L || 1;
    if (L < TIERS[0]) return use0.apply(this, arguments);
    const sc = GV.artSchool(s), now = p.artClock || 0;
    const C = pl.combo = pl.combo || { n: 0, t: -99, last: null };
    const cap = L >= TIERS[3] ? 8 : 5;
    if (now - C.t > WINDOW) C.n = 0;
    let mult = 1 + PER * C.n;
    const fin = L >= TIERS[2] && C.n >= 5 && C.n >= Math.min(cap, C.ready || 5);
    if (fin) mult *= 2;
    s.artN = (s.artN || 0) + 1;
    const o2 = Object.assign({}, opts, { mult: (opts.mult || 1) * mult });
    const r = use0.call(this, p, pl, s, slot, o2);
    if (fin) { finisher(p, pl, s, sc, o2.mult / 2, L >= TIERS[3]); C.n = 0; C.ready = cap; }
    else {
      if (L >= TIERS[1] && s.artN % 3 === 0) style(p, pl, s, slot, opts, sc, o2.mult);
      const gain = C.last && C.last !== s.id && now - C.t <= WINDOW ? 2 : 1;
      C.n = Math.min(cap, C.n + gain); C.ready = cap;
      if (C.n >= 2) p.text(pl.cx + 14, pl.y - 16, `×${C.n}${C.n >= 5 && L >= TIERS[2] ? ' READY' : ''}`, C.n >= 5 ? '#ffd28a' : '#cfd8ff', C.n >= 5 ? 13 : 11);
    }
    C.t = now; C.last = s.id;
    return r;
  };

  // queue, timers, haste
  const upd0 = P.update;
  P.update = function (dt) {
    upd0.call(this, dt);
    this.artClock = (this.artClock || 0) + dt;
    if (this.artQ && this.artQ.length) {
      for (const q of this.artQ) q.t -= dt;
      const due = this.artQ.filter((q) => q.t <= 0); this.artQ = this.artQ.filter((q) => q.t > 0);
      for (const q of due) { try { q.fn(); } catch (e) { /* the target may be gone */ } }
    }
    if (this.artFx) { for (const f of this.artFx) f.t -= dt; this.artFx = this.artFx.filter((f) => f.t > 0); }
    for (const pl of this.players || [this.player]) {
      if (!pl) continue;
      if (pl.artWardT > 0) pl.artWardT -= dt;
      if (pl.artHasteT > 0) { pl.artHasteT -= dt; if (pl.onGround && Math.abs(pl.vx) > 40) pl.x += pl.vx * dt * 0.3; }
    }
  };
  const dtm0 = GV.dmgTakenMul;
  GV.dmgTakenMul = function (p, pl) { let k = dtm0(p, pl); if (pl && pl.artWardT > 0) k *= 0.75; return k; };

  const dp0 = P.drawProjs;
  P.drawProjs = function (ctx, ...rest) {
    dp0.call(this, ctx, ...rest);
    if (!this.artFx || !this.artFx.length) return;
    ctx.save();
    for (const f of this.artFx) {
      const k = 1 - f.t / f.max, a = f.t / f.max;
      ctx.globalAlpha = a * 0.8; ctx.strokeStyle = f.color; ctx.lineWidth = 2 + 6 * a;
      ctx.shadowColor = f.color; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.35 + 0.65 * k), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  };
})();
