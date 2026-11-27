// Galactic Void — impact debris. Hits knock bits off things: alien ichor and chunks from creatures, sparks and
// shards from machines, stardust from crystal and energy beings. Blood drops land and leave splats that fade.
// Settings → Hit effects: 'full' (blood & chunks), 'dust' (stardust only: no blood, nothing fleshy), 'off'.
(function () {
  const GV = window.GV, S = GV.Skills, P = GV.Play.prototype;
  const mode = () => { const g = GV.settings && GV.settings.data && GV.settings.data.gore; return g === 'off' || g === 'dust' ? g : 'full'; };
  const saver = () => !!(GV.settings && GV.settings.saver && GV.settings.saver());
  const MAX = () => (saver() ? 110 : 240), MAX_SPLATS = 70;

  // What each thing is made of. blood: ichor colour; chunk: flesh/shell colour; kind: organic | mech | crystal | energy
  const MAT = {
    jelly: { kind: 'organic', blood: '#b06cff', chunk: '#6a3fa8', glow: true },
    crawler: { kind: 'organic', blood: '#8fd14f', chunk: '#33452a' },
    leaper: { kind: 'organic', blood: '#ff5a4a', chunk: '#6e2a2e' },
    brute: { kind: 'organic', blood: '#c2303a', chunk: '#4a2a30' },
    sentry: { kind: 'mech', spark: '#ffd27a', chunk: '#8a94a8' },
    mimic: { kind: 'mech', spark: '#ffb36a', chunk: '#9a7a52' },
    wisp: { kind: 'energy', dust: '#9fe8ff' },
    titanpart: { kind: 'crystal', dust: '#ffd9a0', chunk: '#9aa6bd' },
    fuelpod: { kind: 'mech', spark: '#ff9a4a', chunk: '#6a7488' },
    // bosses
    leviathan: { kind: 'organic', blood: '#d04a7a', chunk: '#4a2440' },
    brood: { kind: 'organic', blood: '#9be05a', chunk: '#2e3a22' },
    choir: { kind: 'energy', dust: '#e8d8ff' },
    sentinel: { kind: 'mech', spark: '#9fe8ff', chunk: '#7f8aa6' },
    warden: { kind: 'crystal', dust: '#c79bff', chunk: '#5a4a7a' },
  };
  const PLAYER = { kind: 'organic', blood: '#d8323c', chunk: '#5a6478', spark: '#bfefff', suit: true };
  function matOf(e) {
    if (e.mat) return e.mat;
    let m = MAT[e.type];
    if (!m && e.def && GV.BOSSES) for (const k in GV.BOSSES) if (GV.BOSSES[k] === e.def) { m = MAT[k]; break; }
    if (!m && e.def && e.def.titan) m = MAT.titanpart;
    m = m || { kind: 'organic', blood: '#b06cff', chunk: '#3a3050' };
    if (e.elite && e.eliteColor) m = Object.assign({}, m, { tint: e.eliteColor });
    return (e.mat = m);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------- spawning ----------
  function add(p, g) { const L = (p.gibs = p.gibs || []); if (L.length >= MAX()) L.splice(0, L.length - MAX() + 1); L.push(g); }
  // dir: which way the hit pushes (+1 right, -1 left); amt: 0..1 how hard
  function spray(p, x, y, m, dir, amt, kill) {
    const md = mode(); if (md === 'off') return;
    const n = Math.round((kill ? 9 : 2) + amt * (kill ? 10 : 6)) * (saver() ? 0.6 : 1);
    const dust = md === 'dust' || m.kind === 'energy' || m.kind === 'crystal';
    const col = (m.tint && Math.random() < 0.35) ? m.tint : null;
    for (let i = 0; i < n; i++) {
      // mostly away from the blow and upward; kills burst every way
      const d = kill && Math.random() < 0.35 ? -(dir || 1) : (dir || (Math.random() < 0.5 ? -1 : 1));
      const el = rnd(0.15, 1.1), sp = rnd(140, 380) * (kill ? 1.25 : 1);
      const vx = Math.cos(el) * sp * d, vy = -Math.sin(el) * sp - rnd(40, 160);
      if (dust) {
        add(p, { t: 'dust', x, y, vx: vx * 0.6, vy: vy * 0.5, g: 90, life: rnd(0.7, 1.4), size: rnd(1.4, 3), color: col || m.dust || m.blood || m.chunk || '#cfe8ff', tw: Math.random() * 6 });
        if (kill && i % 3 === 0) add(p, { t: 'shard', x, y, vx, vy, g: 900, life: rnd(1.6, 2.4), size: rnd(4, 8), rot: Math.random() * 6, vr: rnd(-12, 12), color: m.chunk || m.dust || '#9aa6bd', glint: m.dust || '#fff' });
      } else if (m.kind === 'mech') {
        add(p, { t: 'spark', x, y, vx: vx * 1.3, vy: vy * 0.8, g: 700, life: rnd(0.25, 0.55), size: rnd(1.5, 2.5), color: col || m.spark });
        if (kill ? i % 2 === 0 : i % 4 === 0) add(p, { t: 'chunk', x, y, vx: vx * 0.7, vy, g: 1100, life: rnd(2.2, 3.4), size: rnd(4, kill ? 10 : 6), rot: Math.random() * 6, vr: rnd(-14, 14), color: m.chunk, edge: '#cfd8e8', pts: shape() });
      } else { // organic: ichor drops, and chunks on heavy hits and kills
        add(p, { t: 'drop', x, y, vx: vx * 0.8, vy, g: 1200, life: 2.5, size: rnd(1.8, 3.6), color: col || m.blood });
        if ((kill && i % 2 === 0) || (amt > 0.25 && i % 5 === 0)) add(p, { t: 'chunk', x, y, vx: vx * 0.6, vy: vy * 0.9, g: 1150, life: rnd(2.5, 4), size: rnd(3.5, kill ? 9 : 5), rot: Math.random() * 6, vr: rnd(-10, 10), color: m.chunk, edge: m.blood, pts: shape(), wet: true });
      }
    }
    if (!dust && m.kind === 'organic' && kill && p.burst) p.burst(x, y, 10, m.blood, 140, 0.4, 3, false, 300); // a puff of mist
  }
  function shape() { const k = 5 + Math.floor(Math.random() * 3), out = []; for (let i = 0; i < k; i++) { const a = (i / k) * Math.PI * 2, r = 0.6 + Math.random() * 0.5; out.push([Math.cos(a) * r, Math.sin(a) * r]); } return out; }
  GV.impact = { spray, matOf, mode };

  // ---------- hooks ----------
  const SND = { organic: 'Flesh', mech: 'Metal', crystal: 'Crystal', energy: 'Energy' };
  const snd = (p, kind, m, x, vol) => { if (GV.game && p === GV.game.play && GV.audio.play) GV.audio.play(kind + (SND[m.kind] || 'Flesh'), { x, vol, gap: kind === 'kill' ? 0.06 : 0.05 }); };
  const hit0 = S.hitEnemy;
  S.hitEnemy = function (p, e, s, o = {}, ...rest) {
    const hp0 = e && e.hp;
    const r = hit0.call(this, p, e, s, o, ...rest);
    if (e && hp0 != null && e.hp < hp0 && e.hp > 0 && !(e.def && e.def.static)) snd(p, 'hit', matOf(e), e.x + e.w / 2, 0.75);
    if (e && hp0 != null && e.hp < hp0 && !(e.def && e.def.static && e.type !== 'fuelpod') && mode() !== 'off') {
      const now = p.artClock || performance.now() / 1000;
      if (!e._gibT || now - e._gibT > 0.07 || e.hp <= 0) {
        e._gibT = now;
        const amt = Math.min(1, (hp0 - Math.max(0, e.hp)) / Math.max(1, e.maxHp) * 3);
        const pl = p.player, dir = pl ? Math.sign(e.x + e.w / 2 - pl.cx) || 1 : 1;
        if (e.hp > 0) spray(p, e.x + e.w / 2, e.y + e.h * 0.45, matOf(e), dir, amt, false);
      }
    }
    return r;
  };
  const kill0 = P.killEnemy;
  P.killEnemy = function (e) {
    const was = e && e.dead;
    const r = kill0.call(this, e);
    if (e && !was && !(e.def && e.def.static && e.type !== 'fuelpod')) snd(this, 'kill', matOf(e), e.x + e.w / 2, e.boss ? 1 : 0.8);
    if (e && !was && !(e.def && e.def.static && e.type !== 'fuelpod') && mode() !== 'off') {
      const pl = this.player, dir = pl ? Math.sign(e.x + e.w / 2 - pl.cx) || 1 : 0;
      spray(this, e.x + e.w / 2, e.y + e.h * 0.5, matOf(e), dir, e.boss ? 1 : Math.min(1, e.w / 60), true);
      if (e.boss) for (let i = 0; i < 3; i++) spray(this, e.x + Math.random() * e.w, e.y + Math.random() * e.h, matOf(e), dir, 1, true);
    }
    return r;
  };
  const dmg0 = P.damagePlayer;
  P.damagePlayer = function (dmg, fromX, ...rest) {
    const pl = this.player, hp0 = pl && pl.hp;
    const r = dmg0.call(this, dmg, fromX, ...rest);
    if (pl && hp0 != null && pl.hp < hp0 && mode() !== 'off') {
      const dir = fromX != null ? (Math.sign(pl.cx - fromX) || 1) : 0, amt = Math.min(1, (hp0 - pl.hp) / Math.max(1, pl.maxHp) * 4);
      const m = mode() === 'dust' ? { kind: 'crystal', dust: '#bfefff', chunk: '#5a6478' } : PLAYER;
      // suit sparks always; blood only in full mode
      for (let i = 0; i < 3 + amt * 6; i++) add(this, { t: 'spark', x: pl.cx, y: pl.cy - 6, vx: dir * rnd(80, 300) + rnd(-80, 80), vy: -rnd(80, 280), g: 700, life: rnd(0.2, 0.45), size: 1.8, color: '#bfefff' });
      spray(this, pl.cx, pl.cy - 4, m, dir, amt * 0.6, false);
    }
    return r;
  };

  // ---------- physics ----------
  function landY(p, x, y0, y1) {
    // the top of whatever surface lies between y0 and y1 at x (solids and one-way platforms)
    let best = null;
    const test = (s) => { if (x > s.x && x < s.x + s.w && s.y >= y0 - 2 && s.y <= y1 && (best === null || s.y < best)) best = s.y; };
    p.eachSolid(true, test);
    for (const o of p.L.oneways || []) test(o);
    return best;
  }
  const upd0 = P.update;
  P.update = function (dt) {
    upd0.call(this, dt);
    const G = this.gibs; if (!G || !G.length || !this.L) return;
    for (const g of G) {
      g.life -= dt;
      if (g.rest) continue;
      g.vy += g.g * dt; g.vx *= g.t === 'dust' ? 0.97 : 0.995;
      const ny = g.y + g.vy * dt;
      if (g.vy > 0 && (g.t === 'chunk' || g.t === 'drop' || g.t === 'shard')) {
        const ly = landY(this, g.x, g.y, ny + 1);
        if (ly != null) {
          if (g.t === 'drop') { g.life = 0; splat(this, g.x, ly, g.color, g.size); continue; }
          g.y = ly - g.size * 0.4;
          if (Math.abs(g.vy) > 160 && !g.bounced) { g.vy *= -0.32; g.vx *= 0.55; g.vr *= 0.5; g.bounced = true; if (g.wet && mode() === 'full') splat(this, g.x, ly, g.edge, g.size * 0.7); }
          else { g.rest = true; g.vx = 0; g.vy = 0; g.vr = 0; g.life = Math.min(g.life, rnd(1.5, 3)); }
          continue;
        }
      }
      g.x += g.vx * dt; g.y = ny;
      if (g.vr) g.rot += g.vr * dt;
    }
    this.gibs = G.filter((g) => g.life > 0);
    if (this.splats) { for (const s of this.splats) s.life -= dt; this.splats = this.splats.filter((s) => s.life > 0); }
  };
  function splat(p, x, y, color, size) {
    if (mode() !== 'full') return;
    const L = (p.splats = p.splats || []);
    if (L.length >= MAX_SPLATS) L.shift();
    L.push({ x, y, color, w: size * rnd(2.2, 3.6), life: rnd(5, 8), max: 8, dots: [rnd(-1, 1), rnd(-1, 1)] });
  }

  // ---------- drawing (world space, after projectiles) ----------
  const dp0 = P.drawProjs;
  P.drawProjs = function (ctx, ...rest) {
    dp0.call(this, ctx, ...rest);
    const G = this.gibs, SP = this.splats;
    if ((!G || !G.length) && (!SP || !SP.length)) return;
    ctx.save();
    if (SP) for (const s of SP) {
      ctx.globalAlpha = Math.min(1, s.life / 2) * 0.7; ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.ellipse(s.x, s.y - 0.5, s.w, s.w * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s.x + s.dots[0] * s.w * 1.4, s.y - 1, s.w * 0.18, 0, Math.PI * 2); ctx.arc(s.x + s.dots[1] * s.w * 1.6, s.y - 1, s.w * 0.12, 0, Math.PI * 2); ctx.fill();
    }
    for (const g of G || []) {
      const a = Math.min(1, g.life / 0.5);
      if (g.t === 'spark') {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.strokeStyle = g.color; ctx.lineWidth = g.size; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x - g.vx * 0.03, g.y - g.vy * 0.03); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      } else if (g.t === 'dust') {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * (0.55 + 0.45 * Math.sin(g.tw + g.life * 18)); ctx.fillStyle = g.color;
        ctx.fillRect(g.x - g.size / 2, g.y - g.size / 2, g.size, g.size);
        if (g.size > 2.4) { ctx.fillRect(g.x - g.size * 1.4, g.y - 0.5, g.size * 2.8, 1); ctx.fillRect(g.x - 0.5, g.y - g.size * 1.4, 1, g.size * 2.8); }
        ctx.globalCompositeOperation = 'source-over';
      } else if (g.t === 'drop') {
        ctx.globalAlpha = a; ctx.fillStyle = g.color;
        const sp = Math.hypot(g.vx, g.vy), ang = Math.atan2(g.vy, g.vx);
        ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(ang); ctx.beginPath(); ctx.ellipse(0, 0, g.size * (1 + Math.min(1.6, sp / 400)), g.size * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      } else { // chunk / shard
        ctx.globalAlpha = a; ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rot || 0);
        if (g.t === 'shard') {
          ctx.fillStyle = g.color; ctx.beginPath(); ctx.moveTo(-g.size * 0.3, -g.size); ctx.lineTo(g.size * 0.35, 0); ctx.lineTo(-g.size * 0.2, g.size * 0.8); ctx.closePath(); ctx.fill();
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * (0.4 + 0.6 * Math.max(0, Math.sin((g.rot || 0) * 2))); ctx.strokeStyle = g.glint; ctx.lineWidth = 1; ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
        } else {
          ctx.fillStyle = g.color; ctx.beginPath(); g.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * g.size, py * g.size) : ctx.moveTo(px * g.size, py * g.size))); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = g.edge; ctx.globalAlpha = a * 0.7; ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.restore();
      }
    }
    ctx.restore();
  };
})();
