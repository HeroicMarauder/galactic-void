// Galactic Void — the third wave of Star Cores and Augments: real healing builds (three new healing
// cores and seven healing augments) and six new damage cores. Healing cores share one routine,
// GV.healCast, so every healing augment works on all of them.
(function () {
  const GV = window.GV, S = GV.Skills, A = GV.art, P = GV.Play.prototype;
  const lin = (a, b) => (L) => a + b * (L - 1);

  // ---------- new Star Cores ----------
  Object.assign(GV.GEMS, {
    // healing
    nanites: { name: 'Nanite Bloom', tier: 1, tags: ['Spell', 'Heal', 'Duration'], kind: 'heal', icon: '✾', color: '#7dffb0', heal: (L) => 0.34 + 0.012 * (L - 1), hot: 5, cost: lin(22, 0.9), cast: 0.25, cd: 7, dur: 5, desc: 'Release a cloud of repair nanites into your suit. Restores a large amount of Life, spread over 5 seconds.' },
    stims: { name: 'Combat Stims', tier: 2, tags: ['Spell', 'Heal', 'Duration'], kind: 'heal', icon: '⚕', color: '#ff6a9a', heal: (L) => 0.14 + 0.006 * (L - 1), stim: (L) => 18 + 0.6 * L, cost: lin(18, 0.7), cast: 0.15, cd: 9, dur: 5, desc: 'Jab a stim into your suit port: restore some Life instantly, then deal more damage for 5 seconds.' },
    mendfield: { name: 'Mending Field', tier: 2, tags: ['Spell', 'Heal', 'Area', 'Duration'], kind: 'heal', icon: '⊕', color: '#9fffd8', heal: (L) => 0.05 + 0.0015 * (L - 1), field: true, radius: 150, cost: lin(26, 1), cast: 0.4, cd: 10, dur: 6, desc: 'Project a field of mending light. You and your allies inside it (minions too) regain Life every second.' },
    // damage
    plasma: { name: 'Plasma Lance', tier: 1, tags: ['Spell', 'Projectile', 'Fire'], kind: 'proj', icon: '⟶', color: '#ff8a4a', types: { fire: 1 }, dmg: lin(24, 5.2), cost: lin(9, 0.5), cast: 0.55, proj: 1, pierce: 3, pspeed: 1150, life: 0.75, r: 8, ail: { ignite: 20 }, desc: 'A searing lance of plasma that pierces three enemies and sets them alight.' },
    rime: { name: 'Rime Burst', tier: 2, tags: ['Spell', 'Area', 'Cold'], kind: 'nova', icon: '❆', color: '#bfefff', types: { cold: 1 }, dmg: lin(21, 6), cost: lin(20, 0.9), cast: 0.35, cd: 2, radius: 150, ail: { freeze: 15 }, desc: 'A ring of frost bursts out from you. Cold always Chills, and it can Freeze.' },
    staticfield: { name: 'Static Field', tier: 2, tags: ['Spell', 'Area', 'Lightning', 'Duration'], kind: 'ground', icon: '⌁', color: '#fff27a', types: { light: 1 }, dmg: lin(15, 4.6), cost: lin(16, 0.7), cast: 0.35, cd: 4, dur: 5, radius: 130, noHeal: true, ail: { shock: 25 }, desc: 'Electrify the ground around you. Enemies standing in it are shocked over and over.' },
    barrage: { name: 'Void Barrage', tier: 1, tags: ['Attack', 'Projectile', 'Void'], kind: 'proj', icon: '⁂', color: '#c79bff', types: { phys: 0.4, void: 0.6 }, eff: lin(0.42, 0.03), cost: lin(5, 0.35), speed: 1.2, proj: 4, spread: 0.06, pspeed: 980, life: 0.7, r: 6, ail: { corrupt: 10 }, desc: 'Fire a tight burst of four void darts down your aim, using your weapon\'s damage.' },
    tempest: { name: 'Tempest Slam', tier: 2, tags: ['Attack', 'Melee', 'Area', 'Slam', 'Lightning'], kind: 'slam', icon: '⚡', color: '#fff27a', types: { phys: 0.5, light: 0.5 }, eff: lin(1.45, 0.1), cost: lin(10, 0.6), speed: 2.1, radius: 90, waves: 1, ail: { shock: 20 }, desc: 'Bring your weapon down in a crack of thunder. Shocks what it hits and sends a crackling wave each way.' },
    cleave: { name: 'Rending Cleave', tier: 1, tags: ['Attack', 'Melee', 'Area'], kind: 'sweep', icon: '⟲', color: '#ff6a6a', types: { phys: 1 }, eff: lin(1.3, 0.09), cost: lin(6, 0.45), speed: 1.45, radius: 104, desc: 'A wide, heavy cleave on both sides of you. Slower than Hull Sweep, but it hits harder and reaches further.' },
  });

  // ---------- new Augments ----------
  Object.assign(GV.SUPPORTS, {
    restore: { name: 'Restoration', tier: 1, req: ['Heal'], desc: '40% more Healing.', apply(s) { s.healMore = (s.healMore || 1) * 1.4; } },
    linger: { name: 'Lingering Mend', tier: 1, req: ['Heal'], desc: 'Your heal also restores 30% more Life over the next 4 seconds.', apply(s) { s.healHot = (s.healHot || 0) + 0.3; } },
    fieldmedic: { name: 'Field Medic', tier: 1, req: ['Heal'], desc: '30% reduced Cooldown. 40% faster Cast Speed.', apply(s) { s.cdrInc += 43; s.speedInc += 40; } },
    purify: { name: 'Purifying Light', tier: 1, req: ['Heal'], desc: 'Cleanses slows, gravity and void effects on you, and makes you immune to them for 3 seconds. 25% less Damage taken for 3 seconds.', apply(s) { s.purify = true; } },
    overflow: { name: 'Aegis Overflow', tier: 2, req: ['Heal'], desc: 'Healing past full Life becomes Void Ward, up to 30% of your Life. Restores 30% more Ward.', apply(s) { s.overflow = true; } },
    radiant: { name: 'Radiant Mend', tier: 2, req: ['Heal'], desc: 'Your heal bursts outward: nearby enemies take Fire and Lightning damage equal to the Life restored.', apply(s) { s.radiant = true; } },
    shared: { name: 'Shared Rite', tier: 2, req: ['Heal'], desc: 'Your heal also restores your minions and your couch partner by the same share of their Life.', apply(s) { s.sharedHeal = true; } },
  });

  // ---------- healing ----------
  const mul = (s) => (s.healMore || 1) * (s.more || 1) * (1 + ((s.st && s.st.raw && s.st.raw.healInc) || 0) / 100);
  function restore(p, pl, s, amt, opts = {}) {
    const before = pl.hp;
    pl.heal(amt);
    const over = amt - (pl.hp - before);
    if (s.overflow && over > 0) pl.ward = Math.min(Math.max(pl.maxWard, pl.maxHp * 0.3), pl.ward + over);
    return pl.hp - before;
  }
  GV.healCast = function (p, pl, s) {
    const def = s.def, frac = def.heal(s.L) * mul(s);
    let healed = 0;
    if (def.field) {
      // a field that heals over time; the first tick lands now
      p.healFields = p.healFields || [];
      p.healFields.push({ x: pl.cx, y: pl.y + pl.h, r: s.radius || def.radius, t: s.dur, max: s.dur, frac, s, pl, tick: 0 });
    } else if (def.hot) {
      pl.hots = pl.hots || [];
      pl.hots.push({ t: s.dur || def.hot, rate: (pl.maxHp * frac) / (s.dur || def.hot), s });
      healed = pl.maxHp * frac * 0.15; restore(p, pl, s, healed);
    } else {
      healed = restore(p, pl, s, pl.maxHp * frac);
    }
    pl.ward = Math.min(pl.maxWard, pl.ward + pl.maxWard * 0.25 * (s.overflow ? 1.3 : 1));
    if (def.stim) { pl.stimT = s.dur || 5; pl.stimMore = 1 + def.stim(s.L) / 100; }
    if (s.healHot) { pl.hots = pl.hots || []; pl.hots.push({ t: 4, rate: (pl.maxHp * frac * s.healHot) / 4, s }); }
    if (s.purify) { pl.purifyT = 3; for (const k of ['nullT', 'invertT', 'gravT', 'slowT']) pl[k] = 0; }
    if (s.sharedHeal) {
      for (const P of p.players || []) if (P !== pl && !P.dead) P.heal(P.maxHp * frac);
      for (const m of [...(p.minions || []), ...((pl.mx) || [])]) if (m && m.maxHp && m.hp > 0) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * frac);
    }
    if (s.radiant) {
      const dmg = Math.max(healed, pl.maxHp * frac * 0.5);
      const o = { mult: 1, knock: 300, ky: -160, parts: { fire: dmg * 0.5, light: dmg * 0.5 } };
      S.area(p, pl.cx, pl.cy, 160, s, o);
      p.novas.push({ x: pl.cx, y: pl.cy, r: 10, max: 160, t: 0, color: '#fff2a8' });
    }
    const col = def.color || '#9fffd8';
    p.burst(pl.cx, pl.cy, 24, col, 160, 0.7, 3);
    p.text(pl.cx, pl.y - 10, def.stim ? 'STIMS!' : def.field ? 'FIELD' : '+LIFE', col, 15);
    p.sfx('heal');
  };

  // Life over time, stims, and Purifying Light's immunity tick on the player
  const pu0 = GV.Player.prototype.update;
  GV.Player.prototype.update = function (dt, p) {
    if (this.purifyT > 0) { this.purifyT -= dt; for (const k of ['nullT', 'invertT', 'gravT', 'slowT']) this[k] = 0; }
    if (this.stimT > 0) this.stimT -= dt;
    if (this.hots && this.hots.length && !this.dead) {
      for (const h of this.hots) { const d = Math.min(dt, h.t); h.t -= dt; if (h.s && h.s.overflow) restore(p, this, h.s, h.rate * d); else this.heal(h.rate * d); }
      this.hots = this.hots.filter((h) => h.t > 0);
    }
    return pu0.call(this, dt, p);
  };
  // stims add damage; Purifying Light cuts damage taken
  const hit0 = S.hitEnemy;
  S.hitEnemy = function (p, e, s, o, ...rest) {
    const pl = (s && s.pl) || p.player;
    if (pl && pl.stimT > 0 && o) o = Object.assign({}, o, { mult: (o.mult || 1) * (pl.stimMore || 1) });
    return hit0.call(this, p, e, s, o, ...rest);
  };
  const dtm0 = GV.dmgTakenMul;
  GV.dmgTakenMul = function (p, pl) { return dtm0(p, pl) * (pl.purifyT > 0 ? 0.75 : 1); };

  // healing fields tick and draw
  const upd0 = P.update;
  P.update = function (dt) {
    const r = upd0.call(this, dt);
    if (this.healFields && this.healFields.length) {
      for (const f of this.healFields) {
        f.t -= dt; f.tick -= dt;
        if (f.tick <= 0) {
          f.tick = 0.5;
          const inside = (o) => Math.abs((o.cx != null ? o.cx : o.x + (o.w || 0) / 2) - f.x) < f.r && Math.abs((o.y + (o.h || 0)) - f.y) < 90;
          for (const P2 of this.players || [this.player]) if (!P2.dead && inside(P2)) { if (f.s.overflow) restore(this, P2, f.s, P2.maxHp * f.frac * 0.5); else P2.heal(P2.maxHp * f.frac * 0.5); }
          for (const m of [...(this.minions || []), ...((f.pl && f.pl.mx) || [])]) if (m && m.maxHp && m.hp > 0 && inside(m)) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * f.frac * 0.5);
        }
      }
      this.healFields = this.healFields.filter((f) => f.t > 0);
    }
    return r;
  };
  const drawG0 = P.drawProjs;
  P.drawProjs = function (ctx) {
    if (this.healFields) for (const f of this.healFields) {
      const k = Math.min(1, f.t / 0.4, (f.max - f.t) / 0.3 + 0.2), t = this.t || 0;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * k;
      const g = ctx.createRadialGradient(f.x, f.y - 10, 4, f.x, f.y - 10, f.r);
      g.addColorStop(0, 'rgba(159,255,216,0.35)'); g.addColorStop(1, 'rgba(159,255,216,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(f.x, f.y - 4, f.r, f.r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(159,255,216,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(f.x, f.y - 2, f.r, f.r * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 5; i++) { const a = (t * 0.8 + i / 5) % 1, x = f.x + Math.sin(i * 2.3 + t) * f.r * 0.7; ctx.fillStyle = `rgba(200,255,230,${(1 - a) * 0.9})`; ctx.font = '12px sans-serif'; ctx.fillText('+', x, f.y - 10 - a * 60); }
      ctx.restore();
    }
    return drawG0.call(this, ctx);
  };
})();
