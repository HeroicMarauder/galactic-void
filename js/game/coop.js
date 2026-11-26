// Galactic Void — couch co-op. A second spaceman on a controller, with their own class, gems,
// gear and tree. Downed players are revived by standing next to them. Loot is either Shared
// (better drops; when both want a Rare or Unique, you duel for it) or Personal (each player's
// drops are marked with their colour; a little less loot overall, no fighting).
(function () {
  const GV = window.GV, U = GV.util, A = GV.art, C = GV.CFG, P = GV.Play.prototype;
  const COL = ['#7fe8ff', '#ffb35c', '#c38bff', '#7dffb0']; // P1..P4
  GV.COOP_COLORS = COL;
  const SQUAD_HP = [1, 1, 1.6, 2.1, 2.6], SQUAD_BOSS = [1, 1, 1.75, 2.4, 3.0]; // by squad size
  const REVIVE = 1.6, LEASH = 0.82, CLAIM = 2.6, DUEL_HITS = 5, DUEL_TIME = 25;

  // ---------- who's who ----------
  P.lead = function () { return this.players.find((p) => !p.dead) || this.players[0]; };
  P.nearestPlayer = function (e) {
    let best = null, bd = Infinity;
    const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
    for (const p of this.players) {
      if (p.dead) continue;
      const d = Math.abs(p.cx - ex) + Math.abs(p.cy - ey) * 0.6;
      if (d < bd) { bd = d; best = p; }
    }
    return best || this.players[0];
  };

  // ---------- per-frame co-op upkeep ----------
  P.coopTick = function (dt) {
    // revive: stand next to a downed squadmate
    for (const p of this.players) {
      if (!p.down) continue;
      const near = this.players.some((o) => o !== p && !o.dead && Math.abs(o.cx - p.cx) < 70 && Math.abs(o.cy - p.cy) < 80);
      p.reviveT = near ? p.reviveT + dt : Math.max(0, p.reviveT - dt * 0.5);
      if (p.reviveT >= REVIVE) {
        p.dead = false; p.down = false; p.reviveT = 0;
        p.hp = Math.round(p.maxHp * 0.4); p.inv = 1.5;
        this.burst(p.cx, p.cy, 40, COL[p.slot], 260, 0.8, 3); this.sfx('heal');
        this.toast(`P${p.slot + 1} is back up`, 1.6, 'small');
      }
    }
    // leash: anyone who drifts too far from the squad is pulled to the leader
    const alive = this.players.filter((p) => !p.dead);
    if (alive.length > 1 && !this.duel && !(this.L.hall && (this.netHost || this.netGuest))) { // online on the deck you roam freely
      const lead = this.state === 'boss' ? null : alive.reduce((m, p) => (p.cx > m.cx ? p : m), alive[0]);
      const mid = this.arena.x + this.arena.w / 2;
      const anchor = lead || alive.reduce((m, p) => (Math.abs(p.cx - mid) < Math.abs(m.cx - mid) ? p : m), alive[0]);
      for (const back of alive) {
        if (back === anchor) continue;
        if (Math.abs(anchor.cx - back.cx) > this.vw() * LEASH || Math.abs(anchor.cy - back.cy) > this.vh() * 0.9) {
          this.burst(back.cx, back.cy, 16, COL[back.slot], 180, 0.5, 2.5);
          back.x = anchor.x - anchor.facing * 30 * back.slot; back.y = anchor.y - 10; back.vx = 0; back.vy = 0; back.inv = Math.max(back.inv, 0.6);
          this.burst(back.cx, back.cy, 16, COL[back.slot], 180, 0.5, 2.5);
        }
      }
    }
    // loot claims and duels
    for (const dr of this.drops) if (dr.claim) this.tickClaim(dr, dt);
    if (this.duel) this.tickDuel(dt);
  };

  // Boss arenas seal the way back: bring both players in together.
  const startBoss0 = P.startBoss;
  P.startBoss = function () {
    if (this.coop) {
      const lead = this.players.reduce((m, p) => (!p.dead && p.cx > m.cx ? p : m), this.players[0]);
      for (const p of this.players) if (p !== lead) { p.x = lead.x - 40; p.y = lead.y - 10; p.vx = 0; p.vy = 0; if (p.down) { p.lastSafe = { x: p.x, y: p.y }; } }
    }
    return startBoss0.call(this);
  };

  // The camera frames both players.
  const camTarget0 = P.camTarget;
  P.camTarget = function () {
    if (!this.coop) return camTarget0.call(this);
    const alive = this.players.filter((p) => !p.dead);
    const ps = alive.length ? alive : this.players;
    const cx = ps.reduce((s, p) => s + p.cx, 0) / ps.length, cy = ps.reduce((s, p) => s + p.cy, 0) / ps.length;
    const real = this.player;
    this.player = { cx, cy, facing: 0, x: cx - 12, y: cy - 25, w: 24, h: 50 };
    try { return camTarget0.call(this); } finally { this.player = real; }
  };

  // Tougher foes for two.
  const spawnEnemy0 = P.spawnEnemy;
  P.spawnEnemy = function (type, x, y, noElite) {
    const e = spawnEnemy0.call(this, type, x, y, noElite);
    if (this.coop) { e.hp *= SQUAD_HP[Math.min(4, this.players.length)] || 1; e.maxHp = e.hp; }
    return e;
  };
  const spawnBoss0 = P.spawnBoss;
  P.spawnBoss = function () {
    const e = spawnBoss0.call(this);
    if (this.coop) { e.hp *= SQUAD_BOSS[Math.min(4, this.players.length)] || 1; e.maxHp = e.hp; }
    return e;
  };
  const cap0 = P.cap;
  P.cap = function () { return Math.round(cap0.call(this) * (this.coop ? 1.4 : 1)); };

  // ---------- loot ----------
  const OWNED = { item: 1, uncut: 1, cur: 1, orb: 1 };
  // Personal: every real drop belongs to one player (and there is 15% less of it).
  // Shared: items lean rarer and there is 25% more of everything.
  function wrapDrop(name) {
    const f0 = P[name];
    P[name] = function (...args) {
      if (!this.coop) return f0.apply(this, args);
      if (this.lootMode === 'personal') {
        if (Math.random() < 0.15) return;
        f0.apply(this, args);
        const dr = this.drops[this.drops.length - 1];
        if (dr && OWNED[dr.kind]) { this._ownFlip = ((this._ownFlip || 0) + 1) % this.players.length; dr.owner = this.players[this._ownFlip].slot; }
        return;
      }
      f0.apply(this, args);
      const dr = this.drops[this.drops.length - 1];
      if (dr && dr.kind === 'item' && dr.item.rarity === 'magic' && Math.random() < 0.35) {
        const again = GV.items.roll(GV.progress.dropTier(this.diff), args[2]);
        if (again.rarity !== 'magic') dr.item = again;
      }
      if (Math.random() < 0.25) f0.apply(this, args);
    };
  }
  ['dropItem', 'dropGem', 'dropCur', 'dropOrb'].forEach(wrapDrop);

  const contested = (dr) => dr.kind === 'item' && (dr.item.rarity === 'rare' || dr.item.rarity === 'nova' || dr.item.rarity === 'unique' || dr.item.set);
  const label = (dr) => (dr.kind === 'item' ? dr.item.name : dr.kind === 'orb' ? GV.ORB_NAME() : dr.kind === 'cur' ? GV.CURRENCY[dr.cur].name : 'Blank Core');

  // Give a picked-up drop to a player (into their own save data).
  P.giveDrop = function (dr, pl) {
    const tag = this.coop ? `P${pl.slot + 1}: ` : '';
    if (dr.kind === 'mem') { this.gainMem(dr.val); this.sfx('mem'); return; }
    if (dr.kind === 'hp') { pl.heal(pl.maxHp * dr.val); this.text(pl.cx, pl.y - 10, '+LIFE', '#9fffd8', 14); this.sfx('heal'); return; }
    GV.save.as(pl.slot || 0, (d) => {
      if (dr.kind === 'uncut') {
        d.uncut.push({ kind: dr.gk, tier: dr.tier });
        this.toast(`${tag}${GV.TERMS.blank(dr.gk)} (Tier ${dr.tier}) · ${GV.TERMS.coresKey()}`, 2.4, 'small');
        this.sfx('level');
      } else if (dr.kind === 'item') {
        const it = dr.item;
        if (this.coop) it.uid = d.uid++;
        const ok = GV.items.add(it);
        this.toast(tag + (ok ? `${it.name} · ${GV.SLOTS[it.slot].name} (B to equip)` : `Inventory full: ${it.name} salvaged`), 2.4, 'small');
        this.toasts[this.toasts.length - 1].color = GV.items.color(it);
        this.sfx('level');
      } else if (dr.kind === 'cur') {
        d.cur[dr.cur] = (d.cur[dr.cur] || 0) + 1;
        const c = GV.CURRENCY[dr.cur];
        this.toast(`${tag}${c.name} · crafting currency (B → item → Craft)`, 2.2, 'small');
        this.toasts[this.toasts.length - 1].color = c.color;
        this.sfx('mem');
      } else if (dr.kind === 'orb') {
        d.orbs++;
        this.toast(`${tag}${GV.ORB_NAME()} · adds an augment port (${GV.TERMS.coresKey()})`, 2.4, 'small');
        this.sfx('level');
      }
      GV.save.write();
    });
  };

  // Replaces the solo pickup loop: nearest eligible player magnets and takes each drop.
  P.updateDrops = function (dt) {
    const alive = this.players.filter((p) => !p.dead);
    for (const dr of this.drops) {
      dr.age += dt;
      if (dr.claim) continue;
      let pool = alive;
      if (this.coop && dr.owner != null) pool = alive.filter((p) => p.slot === dr.owner);
      let pl = null, best = Infinity;
      for (const p of pool) { const d = Math.hypot(p.cx - (dr.x + 5), p.cy - (dr.y + 5)); if (d < best) { best = d; pl = p; } }
      const frozen = !!this.duel;
      if (pl && !frozen && dr.age > 0.45 && (best < 150 || dr.age > 2.5)) {
        const dx = pl.cx - (dr.x + 5), dy = pl.cy - (dr.y + 5), dist = best || 1, sp = 520 + dr.age * 200;
        dr.x += (dx / dist) * sp * dt; dr.y += (dy / dist) * sp * dt;
      } else {
        dr.vy = Math.min(900, dr.vy + 1600 * dt);
        dr.vx *= Math.max(0, 1 - dt * 2);
        this.moveBody(dr, dt);
      }
      if (pl && !frozen && best < 22) {
        if (this.coop && this.lootMode === 'shared' && contested(dr) && alive.length > 1) {
          dr.claim = { by: pl, t: CLAIM };
          this.sfx('ui');
        } else { dr.got = true; this.giveDrop(dr, pl); }
      }
      if (dr.y > this.L.killY) dr.got = true;
    }
    this.drops = this.drops.filter((x) => !x.got);
  };

  // A contested drop hovers over its claimant. The partner can challenge (Interact) to duel.
  P.tickClaim = function (dr, dt) {
    const c = dr.claim, by = c.by;
    if (this.duel) return;
    dr.x += (by.cx - 7 - dr.x) * Math.min(1, dt * 10); dr.y += (by.y - 44 - dr.y) * Math.min(1, dt * 10);
    if (by.dead) { dr.claim = null; return; }
    c.t -= dt;
    const other = this.players.find((p) => p !== by && !p.dead && p.inp.pressed('interact')); // the first to challenge duels for it
    if (other) return this.startDuel(dr, by, other);
    if (c.t <= 0) { dr.got = true; this.giveDrop(dr, by); }
  };

  // ---------- duels ----------
  P.startDuel = function (dr, a, b) {
    this.duel = { dr, p: [a, b], hits: [0, 0], cd: [0, 0], t: DUEL_TIME, intro: 1.2, end: 0 };
    this.duelStash = this.enemies; this.enemies = [];
    this.projs = this.projs.filter((p) => !p.hostile); this.hazards = []; this.warns = [];
    for (const p of [a, b]) p.inv = 0;
    this.toast('DUEL', 1.6); this.toasts[this.toasts.length - 1].sub = `First to ${DUEL_HITS} hits takes ${label(dr)}`;
    this.shake(8); this.sfx('boss');
  };
  const reach = (p) => (p.cls === 'ranger' ? 380 : (p.weapon.range || 64) + 34);
  P.tickDuel = function (dt) {
    const D = this.duel;
    if (D.end > 0) { D.end -= dt; if (D.end <= 0) this.endDuel(); return; }
    if (D.intro > 0) { D.intro -= dt; return; }
    D.t -= dt;
    for (let i = 0; i < 2; i++) {
      const me = D.p[i], foe = D.p[1 - i];
      D.cd[i] -= dt;
      if (me.dead || D.cd[i] > 0) continue;
      const atk = ['attack', 'skill1', 'skill2', 'skill3'].some((k) => me.inp.pressed(k));
      if (!atk) continue;
      D.cd[i] = 0.42;
      const dx = foe.cx - me.cx, inFront = Math.sign(dx) === me.facing || Math.abs(dx) < 20;
      const ranged = me.cls === 'ranger';
      if (!inFront || Math.abs(dx) > reach(me) || Math.abs(foe.cy - me.cy) > (ranged ? 46 : 70)) continue;
      if (foe.dashT > 0 || foe.inv > 0) { this.text(foe.cx, foe.y - 10, 'DODGE', COL[foe.slot], 14); continue; }
      D.hits[i]++;
      foe.inv = 0.5; foe.hurtT = 0.2; foe.vx = Math.sign(dx) * 380; foe.vy = -300;
      this.text(foe.cx, foe.y - 14, 'HIT', COL[me.slot], 18);
      this.burst(foe.cx, foe.cy, 18, COL[me.slot], 240, 0.5, 3); this.shake(5); this.sfx('hit');
      if (D.hits[i] >= DUEL_HITS) { D.win = me; D.end = 1.4; break; }
    }
    if (!D.win && D.t <= 0) { D.win = D.hits[0] === D.hits[1] ? D.p[0] : D.p[D.hits[0] > D.hits[1] ? 0 : 1]; D.end = 1.4; }
    if (D.win && D.end === 1.4) { this.toast(`P${D.win.slot + 1} wins the duel`, 1.8); this.sfx('level'); }
  };
  P.endDuel = function () {
    const D = this.duel;
    this.duel = null;
    this.enemies = this.duelStash.concat(this.enemies); this.duelStash = null;
    D.dr.claim = null; D.dr.got = true;
    this.giveDrop(D.dr, D.win);
    for (const p of D.p) p.inv = Math.max(p.inv, 1);
  };

  // ---------- drawing ----------
  P.drawCoop = function (ctx) {
    const t = this.t;
    // P1/P2 markers (small chevrons) and downed players
    for (const p of this.players) {
      if (p.down) {
        A.spaceman(ctx, p.cx, p.y + p.h + 4, { facing: p.facing, t: 0, alpha: 0.35, cloak: '#333', visor: COL[p.slot], air: false });
        const k = p.reviveT / REVIVE;
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.cx, p.y - 18, 13, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = COL[p.slot];
        ctx.beginPath(); ctx.arc(p.cx, p.y - 18, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
        ctx.fillStyle = COL[p.slot]; ctx.font = `700 10px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillText('+', p.cx, p.y - 14);
        continue;
      }
      if (p.dead) continue;
      ctx.fillStyle = COL[p.slot]; ctx.globalAlpha = 0.9;
      const y = p.y - 14 + Math.sin(t * 4 + p.slot) * 2;
      ctx.beginPath(); ctx.moveTo(p.cx - 5, y - 4); ctx.lineTo(p.cx + 5, y - 4); ctx.lineTo(p.cx, y + 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // personal-loot owner rings, contested claims
    for (const dr of this.drops) {
      if (dr.owner != null) {
        ctx.strokeStyle = COL[dr.owner]; ctx.globalAlpha = 0.75; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(dr.x + dr.w / 2, dr.y + dr.h / 2, 11, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      }
      if (dr.claim && !this.duel) {
        const c = dr.claim, by = c.by, others = this.players.filter((p) => p !== by), other = others.length === 1 ? others[0] : null;
        const cx = dr.x + 7, cy = dr.y - 12;
        ctx.strokeStyle = COL[by.slot]; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(dr.x + 7, dr.y + 7, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (c.t / CLAIM)); ctx.stroke();
        const key = other && other.slot ? 'D-pad ↑' : (GV.input.pad && GV.input.pads >= 2 ? 'D-pad ↑' : GV.input.label('interact'));
        const txt = other ? `P${other.slot + 1}: ${key} to duel for it` : `Anyone: ${GV.input.label('interact')} to duel P${by.slot + 1} for it`;
        ctx.font = `600 11px ${C.FONT}`; ctx.textAlign = 'center';
        const w = ctx.measureText(txt).width + 16;
        ctx.fillStyle = 'rgba(5,6,12,0.8)'; A.rrect(ctx, cx - w / 2, cy - 30, w, 18, 6);
        ctx.fillStyle = other ? COL[other.slot] : '#fff'; ctx.fillText(txt, cx, cy - 17);
      }
    }
  };

  // Compact Player 2 panel (top right, under the stage name) and the duel scoreboard.
  P.drawCoopHud = function (ctx, W, H) {
    const self = this.netGuest ? this.player : this.players[0];
    this.players.filter((p) => p !== self && !p.holo).forEach((p2, i) => {
      const x = W - 196, y = 98 + i * 52, w = 180;
      ctx.fillStyle = 'rgba(5,6,12,0.6)'; A.rrect(ctx, x - 8, y - 14, w + 16, 46, 8);
      ctx.textAlign = 'left'; ctx.font = `700 11px ${C.FONT}`; ctx.fillStyle = COL[p2.slot] || COL[1];
      const cls = GV.CLASSES[p2.cls];
      ctx.fillText(`P${(p2.slot || 0) + 1} · ${cls ? cls.name.replace('Space ', '') : ''}${p2.down ? ' · DOWN' : ''}`, x, y);
      ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(230,240,255,0.7)';
      if (p2.flasks && p2.flasks[0] && p2.flasks[0].n != null) ctx.fillText(`${p2.flasks[0].n}♥ ${p2.flasks[1].n}◆`, x + w, y);
      const bar = (yy, k, c) => { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x, yy, w, 6); ctx.fillStyle = c; ctx.fillRect(x, yy, w * Math.max(0, Math.min(1, k || 0)), 6); };
      bar(y + 7, p2.hp / p2.maxHp, '#ff4f6d');
      bar(y + 17, p2.charge / Math.max(1, p2.maxChargeEff), '#7fe8ff');
    });
    if (this.duel) {
      const D = this.duel;
      ctx.textAlign = 'center'; ctx.font = `800 22px ${C.FONT}`;
      const pip = (n, c) => Array.from({ length: DUEL_HITS }, (_, i) => (i < n ? '■' : '□')).join('');
      ctx.fillStyle = COL[D.p[0].slot]; ctx.fillText(`P${D.p[0].slot + 1} ${pip(D.hits[0])}`, W / 2 - 110, 150);
      ctx.fillStyle = COL[D.p[1].slot]; ctx.fillText(`${pip(D.hits[1])} P${D.p[1].slot + 1}`, W / 2 + 110, 150);
      ctx.fillStyle = '#fff'; ctx.font = `700 14px ${C.FONT}`;
      ctx.fillText(D.intro > 0 ? 'GET READY' : `${Math.ceil(Math.max(0, D.t))}s · for ${label(D.dr)}`, W / 2, 172);
    }
  };
})();
