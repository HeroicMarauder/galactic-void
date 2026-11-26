// Galactic Void — living level features: cracked walls hiding caches, crumbling ledges, updraft
// vents, acid lakes, sealed ambush rooms, and a Metroid-style minimap of what you've explored.
(function () {
  const GV = window.GV, U = GV.util, A = GV.art, B = A.bio, C = GV.CFG, P = GV.Play.prototype;

  // A breakable wall is a static "enemy" so every attack and spell can hit it.
  GV.ENEMIES.crackwall = {
    name: 'Cracked wall', w: 30, h: 120, hp: 1, dmg: 0, xp: 0, mem: 0, fly: true, static: true, heavy: true,
    update(e) { e.vx = 0; e.vy = 0; e.x = e.x0; e.y = e.y0; e.noContact = true; },
    draw(ctx, e, P, t) {
      const f = e.flash > 0, k = 1 - e.hp / e.maxHp;
      ctx.fillStyle = f ? '#fff' : A.col(P.hA, 14, 22, 1); ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.strokeStyle = A.col(P.hB, 90, 60, 0.55 + Math.sin(t * 3) * 0.2); ctx.lineWidth = 1.5;
      const s = e.seed;
      ctx.beginPath();
      for (let i = 0; i < 3 + k * 6; i++) {
        const x0 = e.x + ((s * (i + 1) * 37) % e.w), y0 = e.y + ((s * (i + 3) * 53) % e.h);
        ctx.moveTo(x0, y0); ctx.lineTo(x0 + ((i % 2) ? 9 : -9), y0 + 12); ctx.lineTo(x0 + ((i % 3) - 1) * 6, y0 + 22);
      }
      ctx.stroke();
      A.glow(ctx, e.x + e.w / 2, e.y + e.h / 2, Math.max(e.w, e.h) * 0.7, A.col(P.hB, 90, 55, 0.12));
    },
  };

  P.liveCount = function () { let n = 0; for (const e of this.enemies) if (!e.dead && !e.def.static) n++; return n; };

  P.featuresInit = function () {
    const L = this.L;
    for (const k of ['acid', 'vents', 'walls', 'chests', 'ambushes', 'ceilings']) if (!L[k]) L[k] = [];
    this.feat = { init: true, seen: new Set() };
    for (const w of L.walls || []) {
      const e = this.spawnEnemy('crackwall', w.x + w.w / 2, w.y + w.h, true);
      e.w = w.w; e.h = w.h; e.x = e.x0 = w.x; e.y = e.y0 = w.y; e.seed = 7 + Math.floor(Math.random() * 90);
      e.hp = e.maxHp = 40 * GV.SCALE.hp(this.diff); e.solid = w; e.noContact = true;
    }
  };

  // Breaking a wall opens the passage; nothing else (no xp, no quest kills).
  const kill0 = P.killEnemy;
  P.killEnemy = function (e) {
    if (e.def === GV.ENEMIES.crackwall) {
      if (e.dead) return;
      e.dead = true; e.solid.gone = true;
      this.burst(e.x + e.w / 2, e.y + e.h / 2, 40, this.pal.accent, 300, 0.8, 3.5);
      this.burst(e.x + e.w / 2, e.y + e.h / 2, 24, '#9a8f86', 260, 0.9, 4);
      this.shake(10); this.sfx('slam');
      this.toast('A hidden chamber', 1.6, 'small');
      const st = ((GV.save.main || GV.save.data).stats = (GV.save.main || GV.save.data).stats || {}); st.secrets = (st.secrets || 0) + 1;
      return;
    }
    return kill0.call(this, e);
  };

  P.updateFeatures = function (dt) {
    if (!this.feat) this.featuresInit();
    const L = this.L, F = this.feat;
    // crumbling ledges: they shake for half a second after you land, fall, and grow back
    for (const o of L.oneways) {
      if (!o.crumble) continue;
      if (o.gone) { o.back -= dt; if (o.back <= 0) { o.gone = false; o.cr = 0; } continue; }
      const on = this.players.some((p) => !p.dead && p.ground === o);
      if (on || o.cr > 0) o.cr += dt;
      if (o.cr > 0.55) { o.gone = true; o.back = 4; o.cr = 0; this.burst(o.x + o.w / 2, o.y + 6, 14, '#8a8178', 160, 0.6, 3); this.sfx('hit'); }
    }
    for (const p of this.players) {
      if (p.dead) continue;
      // updraft vents
      for (const v of L.vents) if (p.cx > v.x && p.cx < v.x + v.w && p.y + p.h > v.y && p.y < v.y + v.h) { p.vy = Math.max(p.vy - 3000 * dt, -560); p.onGround = false; }
      // acid: burns and slows
      for (const a of L.acid) if (U.ov(p, a)) {
        p.acidT = (p.acidT || 0) - dt; p.vx *= 0.9;
        if (p.acidT <= 0) { p.acidT = 0.35; const r = this.player; this.player = p; this.damagePlayer(Math.max(4, p.maxHp * 0.06), p.cx, false, true); this.player = r; }
      }
      // caches in hidden chambers
      for (const c of L.chests) if (!c.opened && Math.abs(p.cx - c.x) < 30 && Math.abs(p.y + p.h - c.y) < 40) this.openChest(c);
    }
    for (const e of this.enemies) if (!e.dead && !e.def.fly && !e.def.static) for (const a of L.acid) if (U.ov(e, a)) { e.hp -= e.maxHp * 0.25 * dt; if (e.hp <= 0) this.killEnemy(e); }
    // ambush rooms
    for (const am of L.ambushes) this.tickAmbush(am, dt);
    // explored map
    const cell = 200;
    for (const p of this.players) if (!p.dead) F.seen.add(Math.floor(p.cx / cell) + ',' + Math.floor(p.cy / cell));
  };

  P.openChest = function (c) {
    c.opened = true;
    const x = c.x, y = c.y - 20;
    this.burst(x, y, 40, '#ffd36b', 260, 0.8, 3);
    for (let i = 0; i < 10; i++) this.drops.push({ x, y, vx: (Math.random() - 0.5) * 400, vy: -300 - Math.random() * 300, w: 10, h: 10, kind: 'mem', val: 3 + this.diff, age: 0 });
    const r = Math.random();
    if (r < 0.4) this.dropItem(x, y, {}); else if (r < 0.7) this.dropCur(x, y); else this.dropGem(x, y, Math.random() < 0.5 ? 'skill' : 'support', GV.progress.dropTier(this.diff));
    if (Math.random() < 0.25) this.dropOrb(x, y);
    this.toast('Cache opened', 1.4, 'small'); this.sfx('level');
  };

  P.tickAmbush = function (am, dt) {
    const L = this.L;
    if (am.state === 'done') return;
    if (am.state === 'idle') {
      const p = this.players.find((q) => !q.dead && q.cx > am.x + 120 && q.cx < am.x + am.w - 120 && Math.abs(q.y + q.h - am.floorY) < 60);
      if (!p || this.state !== 'run') return;
      am.state = 'active';
      am.walls = [{ x: am.x - 10, y: am.floorY - 300, w: 30, h: 300, ambush: true }, { x: am.x + am.w - 20, y: am.floorY - 300, w: 30, h: 300, ambush: true }];
      L.solids.push(...am.walls); this.grid = null;
      // anyone outside the room is pulled in with the others
      for (const q of this.players) if (!q.dead && (q.cx < am.x + 20 || q.cx > am.x + am.w - 20)) { q.x = p.x; q.y = p.y; }
      am.foes = [];
      for (let i = 0; i < am.n; i++) {
        const type = am.types[i % am.types.length], def = GV.ENEMIES[type];
        const x = am.x + 80 + Math.random() * (am.w - 160);
        this.timers.push({ t: 0.3 + i * 0.25, fn: () => { const e = this.spawnEnemy(type, x, def.fly ? am.floorY - 180 : am.floorY, false); am.foes.push(e); this.burst(x, am.floorY - 30, 20, this.pal.accent, 220, 0.5, 3); } });
      }
      am.wait = 0.3 + am.n * 0.25 + 0.2;
      this.toast('Ambush', 1.8); this.toasts[this.toasts.length - 1].sub = 'The walls seal. Clear the room.';
      this.shake(12); this.sfx('boss');
      return;
    }
    if (am.state === 'active') {
      am.wait -= dt;
      if (am.wait > 0 || am.foes.some((e) => !e.dead)) return;
      am.state = 'done';
      for (const w of am.walls) w.gone = true;
      this.toast('The room opens', 1.4, 'small'); this.sfx('level');
      const cx = am.x + am.w / 2;
      for (let i = 0; i < 14; i++) this.drops.push({ x: cx, y: am.floorY - 60, vx: (Math.random() - 0.5) * 500, vy: -300 - Math.random() * 300, w: 10, h: 10, kind: 'mem', val: 3 + this.diff, age: 0 });
      if (Math.random() < 0.35 * (GV.legacy ? GV.legacy.qty() : 1)) this.dropItem(cx, am.floorY - 60, {});
    }
  };

  // ---------- drawing ----------
  // Cave ceilings: dark rock with hanging teeth of stone and the odd glowing vein.
  P.drawCeiling = function (ctx, s) {
    const pal = this.pal, bot = s.y + s.h, x0 = Math.max(s.x, this.cam.x - 40), x1 = Math.min(s.x + s.w, this.cam.x + this.vw() + 40);
    if (x1 <= x0) return;
    const top = Math.max(s.y, this.cam.y - 20);
    const g = ctx.createLinearGradient(0, bot - 160, 0, bot);
    g.addColorStop(0, A.col(pal.hA, 18, 7, 1)); g.addColorStop(1, A.col(pal.hA, 20, 16, 1));
    ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, bot - top);
    ctx.fillStyle = A.col(pal.hA, 20, 16, 1);
    for (let x = Math.floor(x0 / 46) * 46; x < x1; x += 46) {
      const h = 14 + ((x * 7919) % 31), w = 18 + ((x * 104729) % 14);
      if (x < s.x + 10 || x + w > s.x + s.w - 10) continue;
      ctx.beginPath(); ctx.moveTo(x, bot - 1); ctx.lineTo(x + w / 2, bot + h); ctx.lineTo(x + w, bot - 1); ctx.fill();
    }
    ctx.strokeStyle = A.col(pal.hB, 90, 55, 0.35); ctx.lineWidth = 1.5;
    ctx.beginPath(); for (let x = Math.floor(x0 / 210) * 210 + 60; x < x1; x += 210) { ctx.moveTo(x, bot - 70); ctx.lineTo(x + 18, bot - 40); ctx.lineTo(x + 6, bot - 8); } ctx.stroke();
  };
  P.drawCrumble = function (ctx, o) {
    const sh = o.cr > 0 ? (Math.random() - 0.5) * 4 * (o.cr / 0.55) : 0;
    ctx.fillStyle = A.col(this.pal.hA, 18, 30, 1); ctx.fillRect(o.x + sh, o.y, o.w, o.h);
    ctx.fillStyle = A.col(this.pal.hA, 20, 42, 1); ctx.fillRect(o.x + sh, o.y, o.w, 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); for (let i = 1; i < 4; i++) { const x = o.x + (o.w / 4) * i + sh; ctx.moveTo(x, o.y); ctx.lineTo(x + 4, o.y + o.h); } ctx.stroke();
  };
  P.drawFeatures = function (ctx, vis) {
    if (!this.feat) return;
    const L = this.L, t = this.t, pal = this.pal;
    for (const s of L.solids) if (s.ambush && !s.gone && vis(s)) {
      ctx.fillStyle = A.col(pal.hB, 80, 30, 0.85); ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = A.col(pal.hB, 100, 60, 0.5 + Math.sin(t * 8) * 0.3); for (let y = s.y; y < s.y + s.h; y += 24) ctx.fillRect(s.x + 4, y + 4, s.w - 8, 10);
    }
    for (const v of L.vents) if (vis(v, 40)) {
      const g = ctx.createLinearGradient(0, v.y + v.h, 0, v.y);
      g.addColorStop(0, 'rgba(170,230,255,0.22)'); g.addColorStop(1, 'rgba(170,230,255,0)');
      ctx.fillStyle = g; ctx.fillRect(v.x, v.y, v.w, v.h);
      ctx.fillStyle = 'rgba(210,245,255,0.6)';
      for (let i = 0; i < 8; i++) { const yy = v.y + v.h - ((t * 220 + i * 70 + v.x) % v.h); ctx.fillRect(v.x + 8 + ((i * 23) % (v.w - 16)), yy, 2, 10); }
      ctx.fillStyle = '#283140'; ctx.fillRect(v.x - 6, v.y + v.h - 14, v.w + 12, 14);
    }
    for (const a of L.acid) if (vis(a, 20)) {
      const g = ctx.createLinearGradient(0, a.y, 0, a.y + a.h);
      g.addColorStop(0, 'rgba(150,255,110,0.85)'); g.addColorStop(1, 'rgba(40,120,40,0.9)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(a.x, a.y + a.h);
      for (let x = a.x; x <= a.x + a.w; x += 12) ctx.lineTo(x, a.y + Math.sin(t * 3 + x * 0.05) * 3);
      ctx.lineTo(a.x + a.w, a.y + a.h); ctx.closePath(); ctx.fill();
      A.glow(ctx, a.x + a.w / 2, a.y, a.w * 0.6, 'rgba(140,255,110,0.18)');
      ctx.fillStyle = 'rgba(220,255,200,0.7)';
      for (let i = 0; i < 5; i++) { const bx = a.x + ((i * 97 + t * 30) % a.w), by = a.y + 6 + ((t * 40 + i * 13) % (a.h - 10)); A.circle(ctx, bx, by, 2); }
    }
    for (const c of L.chests) if (vis({ x: c.x - 20, w: 40 }, 20)) {
      if (c.opened) { ctx.fillStyle = '#3a3226'; A.rrect(ctx, c.x - 16, c.y - 14, 32, 14, 3); continue; }
      A.glow(ctx, c.x, c.y - 12, 40, 'rgba(255,211,107,0.35)');
      B.plate(ctx, c.x - 17, c.y - 22, 34, 22, 4, false);
      ctx.fillStyle = '#ffd36b'; ctx.fillRect(c.x - 3, c.y - 16, 6, 8);
    }
  };

  // ---------- minimap: the shapes of what you've explored ----------
  P.drawMinimap = function (ctx, W, H) {
    if (this.trial || this.titanMode || !this.feat || GV.settings.data.minimap === false) return;
    const touch = GV.input.isTouch, L = this.L, F = this.feat, cell = 200, mw = touch ? 150 : 190, mh = touch ? 50 : 64, x0 = W - mw - 14, y0 = touch ? 96 : H - mh - 70; // on phones it sits up top, clear of the thumb buttons
    const span = 2600, sc = mw / span, pl = this.player;
    const left = U.clamp(pl.cx - span * 0.4, -200, Math.max(-200, L.length - span));
    const cy = pl.cy, top = cy - (mh / sc) * 0.55;
    ctx.save();
    ctx.fillStyle = 'rgba(5,7,14,0.6)'; A.rrect(ctx, x0 - 4, y0 - 4, mw + 8, mh + 8, 8);
    ctx.beginPath(); ctx.rect(x0, y0, mw, mh); ctx.clip();
    for (const s of L.solids) {
      if (s.gone || s.ceiling && s.h > 800 && false) continue;
      if (s.x + s.w < left || s.x > left + span) continue;
      // only what you've seen
      const cx0 = Math.floor(Math.max(s.x, left) / cell), cx1 = Math.floor(Math.min(s.x + s.w, left + span) / cell);
      let seen = false;
      for (let c = cx0; c <= cx1 && !seen; c++) for (let r = Math.floor((s.y - 300) / cell); r <= Math.floor((s.y + 300) / cell); r++) if (F.seen.has(c + ',' + r)) { seen = true; break; }
      if (!seen) continue;
      const rx = x0 + (s.x - left) * sc, ry = y0 + (s.y - top) * sc;
      ctx.fillStyle = s.breakable ? 'rgba(255,211,107,0.8)' : s.ambush ? 'rgba(255,90,110,0.8)' : 'rgba(160,180,215,0.55)';
      ctx.fillRect(rx, ry, Math.max(1, s.w * sc), Math.max(1.5, Math.min(mh, s.h * sc)));
    }
    for (const c of L.chests) if (!c.opened && F.seen.has(Math.floor(c.x / cell) + ',' + Math.floor((c.y - 20) / cell))) { ctx.fillStyle = '#ffd36b'; ctx.fillRect(x0 + (c.x - left) * sc - 1.5, y0 + (c.y - top) * sc - 4, 3, 3); }
    if (this.arena) { ctx.fillStyle = 'rgba(255,90,110,0.9)'; const ax = x0 + (this.arena.x - left) * sc; if (ax < x0 + mw) ctx.fillRect(Math.max(x0, ax), y0, 2, mh); }
    for (const p of this.players) if (!p.dead) { ctx.fillStyle = GV.COOP_COLORS ? GV.COOP_COLORS[p.slot] : '#7fe8ff'; ctx.fillRect(x0 + (p.cx - left) * sc - 2, y0 + (p.cy - top) * sc - 2, 4, 4); }
    ctx.restore();
  };
})();
