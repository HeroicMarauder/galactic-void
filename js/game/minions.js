// Galactic Void — minions, part two. Void Hounds, Spore Brood, Lantern Wisps and the Rift
// Colossus walk the world beside their player (pl.mx); Rallying Command and Unstable Bond order
// them about. Minion stats (attack speed, duration, count) and the minion keystones also live
// here, folded into every Minion skill when it's built. Crew Echoes, turrets and drones are the
// older minions (play.js, skills2.js); they share the same rate, count and command rules.
(function () {
  const GV = window.GV, U = GV.util, S = GV.Skills;
  const A = () => GV.art;
  const live = (e) => !e.dead && !(e.def && e.def.static) && !(e.alpha != null && e.alpha < 0.4);
  const isMinion = (s) => !!(s && s.tags && s.tags.has('Minion'));
  const scale = (s, k) => { for (const t in s.parts) s.parts[t] *= k; s.total *= k; };

  // ---------- building: minion stats and keystones ----------
  const build0 = S.build;
  S.build = function (gem, st, W) {
    const s = build0.call(this, gem, st, W);
    if (!s) return s;
    const ks = st.ks || {};
    if (isMinion(s)) {
      s.minionRate = 1 + ((st.minionSpd || 0) + (s.minionSpdInc || 0)) / 100;
      if (s.def.dur) s.dur = s.def.dur * Math.max(0.2, 1 + ((st.duration || 0) + s.durInc + (st.minionDur || 0)) / 100);
      s.extraMinions = (s.extraMinions || 0) + (st.minionCount || 0);
      s.leech += st.minionLeech || 0;
      if (ks.legion) scale(s, 1.2);
      if (ks.hivebond) scale(s, 1.25);
    } else if (ks.legion && s.total) scale(s, 0.7);
    return s;
  };

  // How fast a minion attacks right now (its build, plus a Rallying Command).
  GV.minionRate = (s, pl) => Math.max(0.3, ((s && s.minionRate) || 1) * (pl && pl.buffs && pl.buffs.command > 0 ? 1.4 : 1));

  // Everything a player has fighting for them, old and new kinds alike.
  function owned(p, pl) {
    const out = [];
    for (const m of pl.mx || []) out.push({ m, x: m.x, y: m.y - (m.kind === 'colossus' ? 40 : 10), list: 'mx' });
    for (const m of p.minions || []) if (!m.s || !m.s.pl || m.s.pl === pl) out.push({ m, x: m.x, y: m.kind === 'turret' ? m.y - 20 : m.y + 22, list: 'p' });
    if (pl.drones) for (let i = 0; i < pl.drones.n; i++) out.push({ drone: i, x: pl.cx, y: pl.y });
    return out;
  }
  GV.minionCount = (p, pl) => owned(p, pl).length;

  // Pack Bond and Rallying Command: more damage on every minion hit.
  const hit0 = S.hitEnemy;
  S.hitEnemy = function (p, e, s, o = {}) {
    if (isMinion(s) && s.kind !== 'detonate' && s.kind !== 'command') {
      const pl = s.pl || p.player;
      let k = 1;
      if (pl.buffs && pl.buffs.command > 0) k *= 1 + (pl.cmdPct || 30) / 100;
      if (s.packBond) k *= 1 + Math.min(0.4, 0.08 * Math.max(0, GV.minionCount(p, pl) - 1));
      if (k !== 1) o = Object.assign({}, o, { mult: (o.mult || 1) * k });
    }
    return hit0.call(this, p, e, s, o);
  };

  const mine = (pl) => (pl.mx || (pl.mx = []));
  const nearest = (p, x, y, range) => {
    let best = null, bd = range * range;
    for (const e of p.enemies) { if (!live(e)) continue; const dx = e.x + e.w / 2 - x, dy = e.y + e.h / 2 - y, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = e; } }
    return best;
  };
  const ground = (p, x, y) => { const g = p.groundYAt(x, y - 40); return g != null && g - y < 320 ? g : y; };

  // ---------- casting ----------
  const NEW = {
    hounds(p, pl, s, o) {
      pl.mx = mine(pl).filter((m) => m.kind !== 'hound');
      const n = (s.def.count || 2) + (s.extraMinions || 0);
      for (let i = 0; i < n; i++) pl.mx.push({ kind: 'hound', i, x: pl.cx - pl.facing * (20 + i * 18), y: pl.y + pl.h, vx: 0, face: pl.facing, t: s.dur, max: s.dur, cd: 0.3 + i * 0.15, s, o, bite: 0 });
      p.burst(pl.cx, pl.y + pl.h - 10, 26, s.def.color, 200, 0.6, 3); p.sfx('rift');
    },
    spores(p, pl, s, o) {
      const n = (s.def.count || 3) + (s.extraMinions || 0);
      for (let i = 0; i < n; i++) mine(pl).push({ kind: 'spore', i, x: pl.cx, y: pl.cy - 10, vx: pl.facing * (110 + Math.random() * 170) + (Math.random() - 0.5) * 120, vy: -240 - Math.random() * 140, t: 4.5, max: 4.5, s, o, seed: Math.random() * 9 });
      const sp = pl.mx.filter((m) => m.kind === 'spore');
      if (sp.length > 14) pl.mx = pl.mx.filter((m) => m.kind !== 'spore' || sp.indexOf(m) >= sp.length - 14);
      p.sfx('skill');
    },
    wisps(p, pl, s, o) {
      pl.mx = mine(pl).filter((m) => m.kind !== 'wisp');
      const n = (s.def.count || 3) + (s.extraMinions || 0);
      for (let i = 0; i < n; i++) pl.mx.push({ kind: 'wisp', i, n, x: pl.cx, y: pl.cy, t: s.dur, max: s.dur, cd: 0.4 + i * 0.25, s, o });
      p.burst(pl.cx, pl.cy, 22, s.def.color, 160, 0.5, 3); p.sfx('beacon');
    },
    colossus(p, pl, s, o) {
      pl.mx = mine(pl).filter((m) => m.kind !== 'colossus');
      const x = pl.cx + pl.facing * 50;
      pl.mx.push({ kind: 'colossus', x, y: ground(p, x, pl.y + pl.h), vx: 0, face: pl.facing, t: s.dur, max: s.dur, cd: 1.1, slam: 0, s, o, rise: 0 });
      p.novas.push({ x, y: pl.y + pl.h, r: 10, max: 120, t: 0, color: s.def.color });
      p.burst(x, pl.y + pl.h, 40, s.def.color, 300, 0.7, 4); p.shake(8); p.sfx('slam');
    },
    command(p, pl, s) {
      pl.buffs.command = s.dur;
      pl.cmdPct = s.def.buff(s.L) * (1 + (s.st.commandEff || 0) / 100);
      for (const q of owned(p, pl)) { if (q.m) q.m.t += 4; }
      if (pl.drones) pl.drones.t += 4;
      p.novas.push({ x: pl.cx, y: pl.cy, r: 10, max: 260, t: 0, color: s.def.color });
      p.text(pl.cx, pl.y - 26, 'RALLY!', s.def.color, 16);
      p.sfx('hurt');
    },
    detonate(p, pl, s, o) {
      const all = owned(p, pl);
      if (!all.length) { p.text(pl.cx, pl.y - 26, 'NO MINIONS', '#9aa6c0', 13); return; }
      all.forEach((q, i) => p.delay(0.04 * i, () => {
        S.area(p, q.x, q.y, s.radius, s, Object.assign({ knock: 380, ky: -240 }, o));
        p.novas.push({ x: q.x, y: q.y, r: 6, max: s.radius, t: 0, color: s.def.color });
        p.burst(q.x, q.y, 22, s.def.color, 260, 0.5, 3);
      }));
      pl.mx = [];
      p.minions = (p.minions || []).filter((m) => !(!m.s || !m.s.pl || m.s.pl === pl));
      pl.drones = null;
      p.shake(10); p.sfx('slam');
    },
  };

  const use0 = S.use;
  S.use = function (p, pl, s, slot, opts = {}) {
    const fn = NEW[s.kind];
    if (!fn) return use0.call(this, p, pl, s, slot, opts);
    const ambush = pl.stealth > 0 && !opts.echoed;
    if (ambush) pl.stealth = 0;
    fn(p, pl, s, { ambush, mult: opts.mult || 1 });
  };

  // ---------- behaviour ----------
  function tick(p, pl, dt) {
    if (pl.mxP && pl.mxP !== p) pl.mx = []; // a new stage: the old pack stays behind
    pl.mxP = p;
    if (pl.buffs.command > 0) pl.buffs.command -= dt;
    const list = pl.mx;
    if (!list || !list.length) return;
    let wisps = 0;
    for (const m of list) {
      m.t -= dt; m.cd -= dt;
      const rate = GV.minionRate(m.s, pl);
      if (m.kind === 'hound') {
        const e = nearest(p, pl.cx, pl.cy, 560);
        let tx, ty;
        if (e) { tx = e.x + e.w / 2 - Math.sign(e.x + e.w / 2 - m.x) * 18; ty = e.y + e.h; }
        else { tx = pl.cx - pl.facing * (34 + m.i * 22); ty = pl.y + pl.h; }
        const dx = tx - m.x, sp = e ? 470 : 380;
        m.vx = Math.abs(dx) < 6 ? 0 : Math.sign(dx) * Math.min(sp, Math.abs(dx) * 6);
        m.x += m.vx * dt; m.y += (ty - m.y) * Math.min(1, dt * 7);
        if (Math.abs(m.vx) > 20) m.face = Math.sign(m.vx);
        m.bite = Math.max(0, m.bite - dt);
        if (e && m.cd <= 0 && Math.abs(e.x + e.w / 2 - m.x) < e.w / 2 + 26 && m.y > e.y - 20 && m.y < e.y + e.h + 30) {
          S.hitEnemy(p, e, m.s, Object.assign({ kx: m.face * 220, ky: -90 }, m.o));
          m.cd = 0.8 / rate; m.bite = 0.18;
        }
      } else if (m.kind === 'spore') {
        const e = nearest(p, m.x, m.y, 640);
        if (e) {
          const dx = e.x + e.w / 2 - m.x, dy = e.y + e.h / 2 - m.y, d = Math.hypot(dx, dy) || 1, acc = 1500;
          m.vx += (dx / d) * acc * dt; m.vy += (dy / d) * acc * dt;
          const v = Math.hypot(m.vx, m.vy), cap = 430 * Math.sqrt(rate);
          if (v > cap) { m.vx *= cap / v; m.vy *= cap / v; }
          if (U.circRect(m.x, m.y, 14, e)) m.t = 0;
        } else { m.vy += 300 * dt; m.vx *= 1 - dt * 1.5; const gy = ground(p, m.x, m.y); if (m.y > gy - 10) { m.y = gy - 10; m.vy = -Math.abs(m.vy) * 0.4; } }
        m.x += m.vx * dt; m.y += m.vy * dt;
        if (m.t <= 0) {
          S.area(p, m.x, m.y, m.s.radius, m.s, Object.assign({ knock: 240, ky: -160 }, m.o));
          p.novas.push({ x: m.x, y: m.y, r: 6, max: m.s.radius, t: 0, color: m.s.def.color });
          p.burst(m.x, m.y, 16, m.s.def.color, 200, 0.45, 3);
          p.sfx('hit');
        }
      } else if (m.kind === 'wisp') {
        wisps++;
        const a = pl.t * 2.1 + (m.i * Math.PI * 2) / m.n;
        m.x += (pl.cx + Math.cos(a) * 46 - m.x) * Math.min(1, dt * 8);
        m.y += (pl.y + 6 + Math.sin(a) * 22 - m.y) * Math.min(1, dt * 8);
        if (m.cd <= 0) {
          const e = nearest(p, m.x, m.y, 470);
          if (e) {
            const dx = e.x + e.w / 2 - m.x, dy = e.y + e.h / 2 - m.y, d = Math.hypot(dx, dy) || 1, sp = m.s.pspeed || 800;
            p.spawnProj({ x: m.x, y: m.y, vx: (dx / d) * sp, vy: (dy / d) * sp, r: 5, friendly: true, kind: 'gem', s: m.s, hit: new Set(), pierce: m.s.pierce || 0, chain: m.s.chain || 0, life: 0.8, o: m.o, color: m.s.def.color });
            m.cd = 1.05 / rate; m.flash = 0.1;
          } else m.cd = 0.25;
        }
        if (m.flash > 0) m.flash -= dt;
      } else if (m.kind === 'colossus') {
        const e = nearest(p, m.x, m.y - 40, 700);
        const tx = e ? e.x + e.w / 2 : pl.cx - pl.facing * 70;
        const dx = tx - m.x, close = e && Math.abs(dx) < 90;
        m.vx = close ? 0 : Math.sign(dx) * Math.min(e ? 190 : 230, Math.abs(dx) * 3);
        if (!e && Math.abs(dx) < 30) m.vx = 0;
        if (!e && Math.abs(pl.cx - m.x) > 700) { m.x = pl.cx - pl.facing * 60; m.y = pl.y + pl.h; } // never left behind
        m.x += m.vx * dt; m.y += (ground(p, m.x, m.y) - m.y) * Math.min(1, dt * 10);
        if (Math.abs(m.vx) > 15) m.face = Math.sign(m.vx);
        m.rise = Math.min(1, m.rise + dt * 1.6);
        if (m.slam > 0) m.slam -= dt;
        if (e && m.cd <= 0 && Math.abs(e.x + e.w / 2 - m.x) < 120 + m.s.radius * 0.4 && Math.abs(e.y + e.h - m.y) < 160) {
          const sx = m.x + m.face * 40;
          S.area(p, sx, m.y - 20, m.s.radius, m.s, Object.assign({ knock: 520, ky: -320 }, m.o));
          p.novas.push({ x: sx, y: m.y - 6, r: 10, max: m.s.radius, t: 0, color: m.s.def.color });
          p.burst(sx, m.y, 30, m.s.def.color, 320, 0.6, 3); p.shake(7); p.sfx('slam');
          m.cd = 1.8 / rate; m.slam = 0.35;
        }
      }
    }
    if (wisps && !pl.dead && pl.hp < pl.maxHp) pl.heal(pl.maxHp * 0.006 * wisps * dt);
    pl.mx = list.filter((m) => m.t > 0);
  }

  function draw(ctx, p, pl) {
    const list = pl.mx;
    if (!list || !list.length) return;
    const a = A(), t = p.t;
    ctx.save();
    for (const m of list) {
      const fade = Math.min(1, m.t / 1.2), c = m.s.def.color;
      ctx.globalAlpha = fade;
      if (m.kind === 'hound') {
        const x = m.x, y = m.y, f = m.face || 1, run = Math.sin(t * 18 + m.i * 2) * (Math.abs(m.vx) > 20 ? 1 : 0.2), lunge = m.bite > 0 ? 8 : 0;
        a.glow(ctx, x, y - 14, 34, 'rgba(150,100,255,0.28)');
        ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        a.line(ctx, x - 9 * f, y - 12, x - 13 * f + run * 5, y); a.line(ctx, x + 8 * f, y - 12, x + 10 * f - run * 5, y);
        ctx.fillStyle = '#140c26'; ctx.beginPath(); ctx.ellipse(x + lunge * f * 0.4, y - 16, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + (16 + lunge) * f, y - 21, 8, 6, f * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + (12 + lunge) * f, y - 26); ctx.lineTo(x + (14 + lunge) * f, y - 34); ctx.lineTo(x + (18 + lunge) * f, y - 26); ctx.fill();
        ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.globalAlpha = fade * 0.8;
        ctx.beginPath(); ctx.moveTo(x - 15 * f, y - 18); ctx.quadraticCurveTo(x - 26 * f, y - 30 + Math.sin(t * 9 + m.i) * 4, x - 32 * f, y - 22); ctx.stroke();
        ctx.globalAlpha = fade; ctx.fillStyle = m.bite > 0 ? '#fff' : c; a.circle(ctx, x + (20 + lunge) * f, y - 22, 2);
      } else if (m.kind === 'spore') {
        const pul = 1 + Math.sin(t * 12 + m.seed) * 0.15;
        a.glow(ctx, m.x, m.y, 20, 'rgba(255,90,150,0.35)');
        ctx.fillStyle = '#4a1328'; a.circle(ctx, m.x, m.y, 8 * pul);
        ctx.fillStyle = c; a.circle(ctx, m.x - 2, m.y - 2, 3.4 * pul);
        ctx.strokeStyle = 'rgba(255,140,190,0.7)'; ctx.lineWidth = 1.2;
        for (let k = 0; k < 3; k++) { const an = m.seed + k * 2.1 + t * 2; a.line(ctx, m.x, m.y, m.x + Math.cos(an) * 12, m.y + Math.sin(an) * 12); }
      } else if (m.kind === 'wisp') {
        a.glow(ctx, m.x, m.y, 22, 'rgba(255,240,160,0.45)');
        ctx.fillStyle = m.flash > 0 ? '#fff' : c; a.circle(ctx, m.x, m.y, 4.5);
        ctx.fillStyle = 'rgba(255,250,220,0.5)'; a.circle(ctx, m.x - Math.cos(t * 3 + m.i) * 6, m.y + 4, 2.2);
      } else if (m.kind === 'colossus') {
        const x = m.x, f = m.face || 1, rs = m.rise, y = m.y + (1 - rs) * 60, step = Math.sin(t * 6) * (Math.abs(m.vx) > 15 ? 3 : 0), arm = m.slam > 0 ? -38 * (m.slam / 0.35) : 0;
        ctx.save(); ctx.beginPath(); ctx.rect(x - 90, y - 140, 180, 140 + (1 - rs) * 60 + 2); ctx.clip();
        a.glow(ctx, x, y - 50, 90, 'rgba(255,150,80,0.25)');
        ctx.fillStyle = '#2b2420';
        ctx.fillRect(x - 20 + step, y - 30, 14, 30); ctx.fillRect(x + 6 - step, y - 30, 14, 30);
        ctx.beginPath(); ctx.moveTo(x - 32, y - 28); ctx.lineTo(x + 32, y - 28); ctx.lineTo(x + 38, y - 82); ctx.lineTo(x - 38, y - 86); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3a312a'; ctx.beginPath(); ctx.moveTo(x - 14, y - 86); ctx.lineTo(x + 14, y - 86); ctx.lineTo(x + 10, y - 106); ctx.lineTo(x - 10, y - 106); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#2b2420'; ctx.lineWidth = 13; ctx.lineCap = 'round';
        a.line(ctx, x + 30 * f, y - 74, x + (46 + (m.slam > 0 ? 10 : 0)) * f, y - 40 + arm); a.line(ctx, x - 30 * f, y - 74, x - 40 * f, y - 42);
        ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.globalAlpha = fade * (0.6 + Math.sin(t * 5) * 0.2);
        a.line(ctx, x - 22, y - 70, x - 6, y - 48); a.line(ctx, x + 18, y - 76, x + 4, y - 50); a.line(ctx, x - 8, y - 36, x + 12, y - 58);
        ctx.globalAlpha = fade; ctx.fillStyle = c; a.circle(ctx, x, y - 60, 7); a.glow(ctx, x, y - 60, 30, 'rgba(255,170,90,0.55)');
        ctx.fillStyle = '#ffe2b8'; a.circle(ctx, x + 5 * f, y - 96, 2.5);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  const upd0 = GV.Player.prototype.update;
  GV.Player.prototype.update = function (dt, p) { upd0.call(this, dt, p); tick(p, this, dt); };
  const draw0 = GV.Player.prototype.draw;
  GV.Player.prototype.draw = function (ctx, p) { draw(ctx, p, this); draw0.call(this, ctx, p); };

  // The gem screen: minion numbers.
  const sum0 = S.summary;
  S.summary = function (s) {
    const out = sum0.call(this, s);
    if (isMinion(s) && s.kind !== 'detonate') {
      const at = Math.max(0, out.findIndex((r) => r.label === 'Cast time' || r.label === 'Attack time'));
      const add = [];
      const n = s.def.count != null ? s.def.count + (s.extraMinions || 0) : s.kind === 'colossus' ? 1 : null;
      if (s.kind === 'command') add.push({ label: 'Minion damage', value: `+${Math.round(s.def.buff(s.L) * (1 + (s.st.commandEff || 0) / 100))}% · 40% faster` });
      else { if (n != null) add.push({ label: 'Minions', value: String(n) }); add.push({ label: 'Minion attack speed', value: `×${(s.minionRate || 1).toFixed(2)}` }); }
      out.splice(at, 0, ...add);
    }
    return out;
  };
})();
