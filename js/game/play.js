// Galactic Void — the play scene. Runs one gauntlet stage: physics, endless rift spawns,
// pickups, beacons, NPCs, the sealed boss arena, and the exit.
(function () {
  const GV = window.GV, U = GV.util, A = GV.art, C = GV.CFG, I = GV.input;

  class Play {
    constructor(sysIdx, stIdx, mode) {
      this.L = mode === 'trial' ? GV.buildTrial(sysIdx) : mode === 'titan' ? GV.buildTitanArena(sysIdx) : mode === 'hall' ? GV.buildHall() : GV.buildStage(sysIdx, stIdx);
      if (mode === 'trial') this.trial = { wave: 0, left: 0, spawnT: 0, restT: 2.5, baseDiff: this.L.diff, memStart: GV.save.data.memories };
      this.sysIdx = sysIdx; this.stIdx = stIdx;
      this.sys = this.L.sys; this.sd = this.L.sd; this.diff = this.L.diff;
      this.arena = this.L.arena;
      this.pal = A.palette(this.sys);
      this.bg = A.background(this.pal, U.hash(this.sys.name));
      const d = GV.save.data;
      for (const v of this.L.vaults) v.taken = !!d.vaults[v.key];
      this.player = new GV.Player(this.L.spawn.x, this.L.spawn.y);
      this.players = [this.player];
      const SV = GV.save;
      if ((SV.main.coop && SV.main.coop.on && SV.hasP2() && !(GV.net && GV.net.role)) || (GV.net && GV.net.hostWantsP2 && GV.net.hostWantsP2())) {
        this.players.push(new GV.Player(this.L.spawn.x - 36, this.L.spawn.y, 1));
        this.coop = true; this.lootMode = SV.main.coop.mode || 'shared';
      }
      GV.input.coop = !!this.coop;
      if (this.coop && !GV.input.pads && !(GV.net && GV.net.role)) this.toast('Player 2 needs a controller · press a button on it', 3, 'small');
      this.respawn = { x: this.L.spawn.x, y: this.L.spawn.y };
      this.enemies = []; this.projs = []; this.parts = []; this.texts = []; this.warns = []; this.hazards = [];
      this.drops = []; this.novas = []; this.toasts = [];
      this.hitboxes = []; this.timers = []; this.bolts = []; this.strikes = []; this.grounds = []; this.minions = [];
      // The camera sits closer than the logical canvas: less of the level is visible at once, so
      // more shows up as a surprise. camBottom is the lowest the view's bottom edge may go.
      this.camBottom = this.L.camMaxY + C.H;
      this.cam = { x: 0, y: this.camBottom - this.vh() };
      this.t = 0; this.state = 'run'; this.boss = null; this.shakeA = 0; this.hintT = 0;
      this.dialog = null; this.ambT = 5; this.kills = 0; this.memGot = 0; this.deathT = 0;
      this.nearNpc = null; this.pendingClear = null; this.pendingDeath = false;
      for (const mm of this.L.mimics || []) { const e = this.spawnEnemy('mimic', mm.x, mm.y, true); e.awake = false; }
      this.toast(`${this.sd.name}`, 2.6);
      this.toasts[0].sub = this.sys.name;
      this.snapCam();
      if (!this.coop && sysIdx === 0 && stIdx === 0 && mode !== 'trial' && GV.settings.data.ghost && !d.tutDone) this.ghost = { i: 0, t: 0, x: this.L.spawn.x + 60, y: this.L.spawn.y, n: 0, sx: this.L.spawn.x };
      if (sysIdx === 0 && stIdx === 0 && !d.seenIntro) {
        d.seenIntro = true; GV.save.write();
        this.introT = 0.7;
      }
    }

    // ---------- world queries ----------
    // Walls, gates and membranes near a horizontal span, from a 256px-column grid built once per stage.
    // Each body only tests what is near it instead of every wall in the level.
    buildGrid() {
      const L = this.L, CW = 256, grid = new Map();
      const add = (o, kind) => {
        for (let c = Math.floor(o.x / CW); c <= Math.floor((o.x + o.w) / CW); c++) {
          let cell = grid.get(c);
          if (!cell) grid.set(c, (cell = { s: [], o: [] }));
          (kind === 's' ? cell.s : cell.o).push(o);
        }
      };
      for (const s of L.solids) add(s, 's');
      for (const g of L.gates) add(g, 's');
      for (const m of L.membranes) { m._mem = true; add(m, 's'); }
      for (const o of L.oneways) add(o, 'o');
      this.grid = grid; this.CW = CW;
      this._near = []; this._nearO = []; this._stamp = 0;
    }
    near(x0, x1, pass) {
      const out = this._near; out.length = 0;
      const st = ++this._stamp;
      for (let c = Math.floor(x0 / this.CW); c <= Math.floor(x1 / this.CW); c++) {
        const cell = this.grid.get(c);
        if (!cell) continue;
        for (const s of cell.s) {
          if (s._st === st) continue;
          s._st = st;
          if (s.closed === false) continue; // open gate
          if (pass && s._mem) continue;
          out.push(s);
        }
      }
      return out;
    }
    nearOneways(x0, x1) {
      const out = this._nearO; out.length = 0;
      const st = ++this._stamp;
      for (let c = Math.floor(x0 / this.CW); c <= Math.floor(x1 / this.CW); c++) {
        const cell = this.grid.get(c);
        if (!cell) continue;
        for (const o of cell.o) { if (o._st === st) continue; o._st = st; out.push(o); }
      }
      for (const m of this.L.movers) out.push(m);
      return out;
    }
    eachSolid(pass, fn) {
      const L = this.L;
      for (const s of L.solids) fn(s);
      for (const g of L.gates) if (g.closed) fn(g);
      if (!pass) for (const m of L.membranes) fn(m);
    }
    moveBody(b, dt) {
      if (!this.grid) this.buildGrid();
      const ov = U.ov;
      const pass = !!(b.isPlayer && b.dashT > 0 && GV.save.data.abilities.dash);
      if (b.ground && b.ground.isMover) { b.x += b.ground.dx; b.y += b.ground.dy; }
      const n = Math.max(1, Math.ceil((Math.max(Math.abs(b.vx), Math.abs(b.vy)) * dt) / 10));
      const sdt = dt / n, reach = Math.abs(b.vx * dt) + 4;
      const walls = this.near(b.x - reach, b.x + b.w + reach, pass).filter((s) => !s.gone);
      const plats = (b.vy >= 0 && !(b.dropT > 0)) ? this.nearOneways(b.x - reach, b.x + b.w + reach).filter((o) => !o.gone) : null;
      b.onGround = false; b.ground = null; b.hitWall = 0;
      for (let i = 0; i < n; i++) {
        b.x += b.vx * sdt;
        for (let k = 0; k < walls.length; k++) {
          const s = walls[k];
          if (!ov(b, s)) continue;
          if (b.x + b.w / 2 < s.x + s.w / 2) { b.x = s.x - b.w; b.hitWall = 1; if (b.vx > 0) b.vx = 0; }
          else { b.x = s.x + s.w; b.hitWall = -1; if (b.vx < 0) b.vx = 0; }
        }
        const pb = b.y + b.h;
        b.y += b.vy * sdt;
        for (let k = 0; k < walls.length; k++) {
          const s = walls[k];
          if (!ov(b, s)) continue;
          if (b.y + b.h / 2 < s.y + s.h / 2) { b.y = s.y - b.h; if (b.vy > 0) b.vy = 0; b.onGround = true; b.ground = s; }
          else { b.y = s.y + s.h; if (b.vy < 0) b.vy = 0; }
        }
        if (plats && b.vy >= 0) {
          for (let k = 0; k < plats.length; k++) {
            const o = plats[k];
            if (b.x + b.w > o.x + 1 && b.x < o.x + o.w - 1) {
              const tol = o.isMover ? Math.abs(o.dy) + 3 : 2;
              if (pb <= o.y + tol && b.y + b.h >= o.y) { b.y = o.y - b.h; b.vy = 0; b.onGround = true; b.ground = o; }
            }
          }
        }
      }
    }
    groundAhead(e) {
      const px = e.dir > 0 ? e.x + e.w + 3 : e.x - 3, py = e.y + e.h + 5;
      const inside = (s) => px > s.x && px < s.x + s.w && py > s.y && py < s.y + s.h + 8;
      for (const s of this.L.solids) if (inside(s)) return true;
      for (const s of this.L.oneways) if (inside(s)) return true;
      for (const s of this.L.movers) if (inside(s)) return true;
      return false;
    }

    // ---------- spawning ----------
    cap() { return Math.min(14, 5 + this.diff); }
    spawnInterval() { return Math.max(1.25, 3.4 - this.diff * 0.17); }
    spawnEnemy(type, x, y, noElite) {
      const def = GV.ENEMIES[type];
      const e = {
        type, def, x: x - def.w / 2, y: y - def.h, w: def.w, h: def.h, vx: 0, vy: 0,
        hp: def.hp * GV.SCALE.hp(this.diff), dmg: def.dmg * GV.SCALE.dmg(this.diff),
        dir: Math.random() < 0.5 ? -1 : 1, onGround: false, flash: 0, t: 0, cd: Math.random() * 1.5,
        knockT: 0, spd: 1 + Math.min(0.5, this.diff * 0.04), seed: Math.random() * 10, crouch: 0, wind: 0,
      };
      e.maxHp = e.hp;
      if (type === 'mimic') noElite = true;
      const cu = (this.trial && this.trial.curses) || {};
      if (cu.swift) e.spd *= 1.4;
      if (cu.brutal) e.dmg *= 1.5;
      if (!noElite && !this.boss && GV.makeElite && Math.random() < (0.05 + this.diff * 0.012) * (cu.elites ? 3 : 1)) GV.makeElite(e, this.diff);
      this.enemies.push(e);
      this.burst(x, y - def.h / 2, e.elite ? 30 : 14, e.elite ? e.eliteColor : this.pal.accent, 160, 0.5, 2.5);
      return e;
    }
    spawnBoss() {
      const def = GV.BOSSES[this.sd.boss];
      const pos = def.spawn(this, this.arena);
      const e = {
        type: this.sd.boss, def, boss: true, x: pos.x, y: pos.y, w: def.w, h: def.h, vx: 0, vy: 0,
        hp: def.hp * GV.SCALE.bossHp(this.diff), dmg: def.dmg * GV.SCALE.bossDmg(this.diff),
        dir: -1, flash: 0, t: 0, st: 'intro', tt: 1.3, knockT: 0, alpha: 1,
      };
      e.maxHp = e.hp;
      this.enemies.push(e);
      this.boss = e;
      const lore = (GV.BOSS_LORE || {})[e.type] || {};
      this.toasts = this.toasts.filter((t) => t.kind !== 'big');
      this.bossCard = { name: this.sd.bossName, sub: lore.epithet || '', t: 0, max: 2.4 };
      return e;
    }
    startBoss() {
      this.state = 'boss';
      this.L.gates[0].closed = true;
      this.enemies = this.enemies.filter((e) => e.x > this.arena.x + 40);
      const b = this.spawnBoss();
      this.bossHurt = false; this.bossFlask0 = this.flasksUsed || 0; this.bossT0 = this.t;
      this.shake(12); this.sfx('boss');
      const lore = (GV.BOSS_LORE || {})[b.type] || {}, d = GV.save.data, key = `${this.sysIdx}-${this.stIdx}`;
      d.bossTalk = d.bossTalk || {};
      if (lore.talk && !d.bossTalk[key]) {
        d.bossTalk[key] = true;
        this.pendingDialog = { name: this.sd.bossName.toUpperCase(), lines: lore.talk, color: '#c9a8ff' }; this.dialogT = 1.1;
      }
    }
    onBossDown(b) {
      GV.quests.emit('boss', { type: b.type, trial: !!this.trial, flasks: (this.flasksUsed || 0) - (this.bossFlask0 || 0), time: this.t - (this.bossT0 || 0) });
      const lore0 = (GV.BOSS_LORE || {})[b.type];
      if (lore0 && lore0.death) this.bark = { text: lore0.death[0], t: 0 };
      this.bossCard = null;
      const dd = GV.save.data; dd.stats = dd.stats || {}; dd.stats.bosses = (dd.stats.bosses || 0) + 1;
      if (!this.trial) dd.stats['boss_' + b.type] = (dd.stats['boss_' + b.type] || 0) + 1;
      if (this.trial) {
        this.boss = null;
        this.dropItem(b.x + b.w / 2, b.y + b.h / 2, { boss: true });
        if (Math.random() < 0.5) this.dropGem(b.x + b.w / 2, b.y + b.h / 2, Math.random() < 0.5 ? 'skill' : 'support');
        if (Math.random() < 0.3) this.dropOrb(b.x + b.w / 2, b.y + b.h / 2);
        this.dropCur(b.x + b.w / 2, b.y + b.h / 2);
        for (let i = 0; i < 12; i++) this.drops.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: (Math.random() - 0.5) * 500, vy: -300 - Math.random() * 300, w: 10, h: 10, kind: 'mem', val: 2 + this.trial.wave, age: 0 });
        this.shake(16); this.sfx('boss');
        this.toast('Trial boss destroyed', 2, 'small');
        return;
      }
      this.state = 'won';
      this.boss = null;
      if (!this.bossHurt) dd.stats.flawless = 1;
      this.L.gates[1].closed = false;
      for (const e of this.enemies) if (!e.dead) { e.dead = true; this.burst(e.x + e.w / 2, e.y + e.h / 2, 18, this.pal.accent, 240, 0.6, 3); }
      this.projs = []; this.hazards = []; this.warns = [];
      this.shake(20); this.sfx('boss');
      const d = GV.save.data;
      const mem = Math.round((b.def.mem || 40) * (1 + 0.2 * this.diff));
      for (let i = 0; i < 24; i++) this.drops.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: (Math.random() - 0.5) * 500, vy: -300 - Math.random() * 300, w: 10, h: 10, kind: 'mem', val: Math.ceil(mem / 24), age: 0 });
      const lines = [];
      const rw = this.sd.reward;
      const firstKill = !d.cleared[`${this.sysIdx}-${this.stIdx}`];
      const bx = b.x + b.w / 2, by = b.y + b.h / 2;
      this.dropGem(bx - 30, by, 'skill', Math.min(3, GV.progress.dropTier(this.diff) + 1));
      this.dropGem(bx + 30, by, 'support', Math.min(3, GV.progress.dropTier(this.diff) + 1));
      if (firstKill || Math.random() < 0.5) this.dropOrb(bx, by);
      this.dropItem(bx, by - 20, { boss: true });
      this.dropCur(bx - 30, by - 20); this.dropCur(bx + 30, by - 20);
      if (firstKill) this.dropItem(bx + 20, by - 20, { boss: true });
      if (firstKill) { d.orbs = (d.orbs || 0) + 1; lines.push('+1 FLUX COUPLER. Use it on a Star Core to add an augment port.'); }
      if (rw === 'dash' && !d.abilities.dash) {
        d.abilities.dash = true;
        lines.push('PHASE DASH ACQUIRED.', I.fill(GV.ABILITIES.dash.how), 'Blue membranes sealed caches back in the Drift Shelf. Return and take what is yours.');
      } else if (rw === 'hook' && !d.abilities.hook) {
        d.abilities.hook = true;
        lines.push('GRAPPLE LINE ACQUIRED.', I.fill(GV.ABILITIES.hook.how), 'Gold anchor rings hang over caches you could never reach before, all the way back to the Kharon Drift.');
      } else if (rw === 'grip' && !d.abilities.grip) {
        d.abilities.grip = true;
        lines.push('GRAV GRIP ACQUIRED.', GV.ABILITIES.grip.how, 'Green-marked shafts hold memory caches. Old drifts are worth revisiting.');
      } else if (rw === 'nova' && !d.gems.some((g) => g.id === 'meteor')) {
        GV.inv.newGem('meteor', 4, 2);
        lines.push('FALLEN STAR CORE ACQUIRED.', 'A Tier 3 spell. Put it on your skill bar from the Star Cores screen (G).', 'ASCENDANCY UNLOCKED. Choose your path from the Ascendancy screen (Y, or Pause → Ascendancy).');
      } else if (rw === 'core' && !d.cleared[`${this.sysIdx}-${this.stIdx}`]) {
        const keys = Object.keys(GV.UPGRADES).filter((k) => d.upgrades[k] < GV.UPGRADES[k].max);
        if (keys.length) {
          const k = keys[Math.floor(Math.random() * keys.length)];
          d.upgrades[k]++;
          this.player.recalc();
          lines.push(`VOID CORE: ${GV.UPGRADES[k].name} ${GV.UPGRADES[k].desc}.`);
        }
      }
      lines.push('The far gate is open. Reach the signal flag.');
      GV.save.write();
      this.dialogT = 1.2;
      this.pendingDialog = { name: 'SUIT', lines, color: this.pal.glow };
    }

    // ---------- dialog ----------
    openDialog(name, lines, onEnd, color) {
      this.dialog = { name, lines, i: 0, onEnd, color: color || this.pal.accent, t: 0 };
      I.clear();
    }
    npcLines(n) {
      const touch = I.isTouch;
      if (n.kind === 'ione') return ['You\'re awake. The suit kept you breathing. Barely.',
        touch ? 'Slide the left pad to move. JUMP, then JUMP again in the air.' : 'Move with A/D or the arrows. Jump with W, Space or Up, and again in the air.',
        touch ? 'Your four skill buttons are on the right. Hold one to keep using it.' : 'Your skills are J, K, L and I. Hold a key to keep using it.',
        'Star Cores power those skills. Plug Augments into their ports to change how they work. G opens your cores, T your passive tree.',
        'They will not stop coming. The red rifts birth them. Shatter the rifts to slow the swarm.',
        'Red stars are memories. Ours. Spend them with Vesper. And find the Lantern. Our ship.'];
      if (n.kind === 'vesper') return ['Vesper: A living one. Rare out here.', 'I trade wreck-tools for memories. Weapons, blank cores, flux couplers, suit plating.', 'Let\'s see what you carry.'];
      const r = U.rng(U.hash(`echo:${this.sysIdx}:${this.stIdx}`));
      const lore = U.pick(r, GV.UNIVERSE.LORE);
      return ['An echo flickers in a suit like yours.', `"${lore}"`, n.gift ? 'It fades.' : 'It presses a memory into your hand, then fades.'];
    }
    talk(n) {
      const lines = this.npcLines(n);
      const name = n.kind === 'ione' ? 'IONE' : n.kind === 'vesper' ? 'VESPER' : 'ECHO';
      const color = n.kind === 'ione' ? '#ffd28a' : n.kind === 'vesper' ? '#ffb347' : '#9fd8ff';
      this.openDialog(name, lines, () => {
        if (n.kind === 'vesper') GV.game.openShop('play');
        if (n.kind === 'echo' && !n.gift) { n.gift = true; const g = 5 + this.diff * 2; this.gainMem(g); this.text(this.player.cx, this.player.y - 20, `+${g} memories`, '#ffffff', 15); this.sfx('mem'); }
      }, color);
    }

    // ---------- update ----------
    update(dt) {
      this.t += dt;
      this.hintT -= dt;
      this.updateFx(dt);
      if (this.dialog) {
        this.dialog.t += dt;
        if (this.dialog.t > 0.15 && (I.pressed('interact') || I.pressed('attack') || I.pressed('jump') || I.pressed('confirm'))) {
          this.dialog.i++;
          GV.audio.sfx('ui');
          if (this.dialog.i >= this.dialog.lines.length) {
            const fn = this.dialog.onEnd; this.dialog = null; I.clear();
            if (fn) fn();
          }
        }
        return;
      }
      if (this.introT > 0) { this.introT -= dt; if (this.introT <= 0) { const n = this.L.npcs.find((n) => n.kind === 'ione'); if (n) this.talk(n); } }
      if (this.pendingDialog) { this.dialogT -= dt; if (this.dialogT <= 0) { const pd = this.pendingDialog; this.pendingDialog = null; this.openDialog(pd.name, pd.lines, null, pd.color); return; } }
      if (this.state === 'dead') {
        this.deathT -= dt;
        if (this.deathT <= 0 && !this.pendingDeath) { this.pendingDeath = true; }
        return;
      }
      if (this.state === 'clear') return;
      if ((this.achT = (this.achT || 0) - dt) <= 0) { this.achT = 1; GV.ach.check(); }
      if (this.bossCard) { this.bossCard.t += dt; if (this.bossCard.t > this.bossCard.max) this.bossCard = null; }
      if (this.bark) { this.bark.t += dt; if (this.bark.t > 3.2) this.bark = null; }
      if (this.boss && !this.boss.halfBark && this.boss.hp < this.boss.maxHp * 0.5) {
        this.boss.halfBark = true;
        const lore = (GV.BOSS_LORE || {})[this.boss.type];
        if (lore && lore.half) this.bark = { text: lore.half[0], t: 0 };
      }

      if (this.coop) this.player = this.lead();
      const L = this.L;
      let pl = this.player;
      if (this.ghost) this.updateGhost(dt);
      // moving platforms
      for (const m of L.movers) {
        const s = (1 - Math.cos(((this.t / m.period) + m.phase) * Math.PI * 2)) / 2;
        const nx = U.lerp(m.x0, m.x1, s), ny = U.lerp(m.y0, m.y1, s);
        m.dx = nx - m.x; m.dy = ny - m.y; m.x = nx; m.y = ny;
      }

      // the player acts against the real world; enemies chase a decoy while you are stealthed
      for (const P of this.players) { if (P.dead) continue; this.player = P; P.update(P.slowT > 0 ? dt * 0.5 : dt, this); }
      this.player = pl;
      if (this.coop) this.coopTick(dt);
      GV.Skills.updateHitboxes(this, dt);
      for (const tm of this.timers) { tm.t -= dt; if (tm.t <= 0 && !tm.done) { tm.done = true; tm.fn(); } }
      this.timers = this.timers.filter((tm) => !tm.done);
      for (const st of this.strikes) {
        st.t -= dt;
        if (st.t <= 0 && !st.done) {
          st.done = true;
          GV.Skills.area(this, st.x, st.y - 20, st.r, st.s, Object.assign({}, st.o, { knock: 480, ky: -340 }));
          this.novas.push({ x: st.x, y: st.y - 10, r: 10, max: st.r, t: 0, color: st.s.def.color });
          this.burst(st.x, st.y - 10, 50, st.s.def.color, 380, 0.8, 4);
          this.shake(12); this.sfx('slam');
        }
      }
      this.strikes = this.strikes.filter((st) => !st.done);
      for (const g of this.grounds) {
        g.t -= dt; g.tick -= dt;
        if (g.tick <= 0) {
          g.tick = 0.25;
          GV.Skills.area(this, g.x, g.y - 24, g.r, g.s, Object.assign({}, g.o, { mult: 0.25 * (g.o.mult || 1), knock: 0, ky: 0, parts: g.parts }));
        }
        for (const P of this.players) if (!g.noHeal && !P.dead && Math.abs(P.cx - g.x) < g.r && Math.abs(P.y + P.h - g.y) < 60) P.heal(P.maxHp * (P.st.asc.consecrate ? 0.05 : 0.03) * dt);
      }
      this.grounds = this.grounds.filter((g) => g.t > 0);
      this.updateMinions(dt);
      if (this.darkT > 0) this.darkT -= dt;
      for (const b of this.bolts) b.t -= dt;
      this.bolts = this.bolts.filter((b) => b.t > 0);

      // enemies
      for (const e of this.enemies) {
        if (e.dead) continue;
        e.t += dt; e.flash -= dt;
        if (e.def.static) { e.def.update(e, this, dt); continue; }
        const ail = GV.Skills.tickAilments(this, e, dt);
        if (e.dead) continue;
        if (e.knockT > 0) {
          e.knockT -= dt;
          e.vx *= Math.max(0, 1 - dt * 6);
        } else if (ail.act) {
          const realPl = this.player;
          const tp = this.coop ? this.nearestPlayer(e) : pl;
          this.player = tp;
          if (tp.stealth > 0 && tp.decoy) this.player = { x: tp.decoy.x, y: tp.decoy.y, w: tp.w, h: tp.h, cx: tp.decoy.x + 12, cy: tp.decoy.y + 25, facing: tp.facing };
          const sp0 = e.spd;
          if (e.spd != null) e.spd = sp0 * ail.spd;
          try { e.def.update(e, this, dt * (e.boss ? (1 - (1 - ail.spd) * 0.5) : 1)); }
          finally { if (e.spd != null) e.spd = sp0; this.player = realPl; }
        } else { e.vx = 0; if (e.def.fly) e.vy = 0; }
        if (e.def.fly) { e.x += e.vx * dt; e.y += e.vy * dt; if (e.knockT > 0) e.vy *= Math.max(0, 1 - dt * 6); }
        else { e.vy = Math.min(C.MAXFALL, (e.vy || 0) + C.GRAV * dt); this.moveBody(e, dt); }
        if (e.boss) {
          const ar = this.arena;
          // watchdog: no boss move lasts this long, so a boss stuck in one is put back to its rest state
          if (e.st !== e.wdSt) { e.wdSt = e.st; e.wdT = 0; } else if ((e.wdT += dt) > 9 && e.st !== 'intro' && e.def.update && !e.def.titan && !e.def.anomaly) { e.st = e.def.recover || 'idle'; e.tt = 0.4; e.did = false; e.vx = 0; e.vy = 0; e.alpha = 1; e.wdT = 0; }
          e.x = U.clamp(e.x, ar.x + 30, ar.x + ar.w - 30 - e.w);
          if (e.def.fly && !e.def.burrow) e.y = U.clamp(e.y, ar.top - 20, ar.floorY - e.h);
        }
        if (e.vamp && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.015 * dt);
        if (e.y > L.killY) { e.dead = true; continue; }
        if (!e.noContact && (e.alpha == null || e.alpha > 0.5)) for (const P of this.players) {
          if (P.dead) continue;
          const hb = { x: P.x + 4, y: P.y + 6, w: P.w - 8, h: P.h - 8 };
          const eb = { x: e.x + 4, y: e.y + 4, w: e.w - 8, h: e.h - 6 };
          if (U.ov(hb, eb) && ail.act && !(P.stealth > 0 && !e.boss)) { this.player = P; const hp0 = P.hp; this.damagePlayer(e.dmg, e.x + e.w / 2); if (e.vamp && P.hp < hp0) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.1); this.player = pl; }
        }
      }
      this.enemies = this.enemies.filter((e) => !e.dead);
      this.updateAnomaly(dt);
      this.updateFeatures(dt);
      this.updateIncursion(dt);

      // the gauntlet: rifts keep spawning, ambient spawns keep pressure on
      if (this.duel) { /* the world holds its breath during a duel */ }
      else if (this.trial) this.updateTrial(dt);
      else if (this.state === 'run') {
        for (const rf of L.rifts) {
          if (rf.dead) continue;
          rf.pulse -= dt; rf.flash -= dt;
          if (Math.abs(pl.cx - (rf.x + rf.w / 2)) > 880) continue;
          rf.timer -= dt;
          if (rf.timer <= 0) {
            rf.timer = this.spawnInterval() * (0.8 + Math.random() * 0.4);
            if (this.liveCount() < this.cap()) {
              const type = U.weighted(Math.random, this.sd.pool);
              const fly = GV.ENEMIES[type].fly;
              this.spawnEnemy(type, rf.x + rf.w / 2, fly ? rf.y - 30 : rf.y + rf.h + 8);
              rf.pulse = 0.4; this.sfx('rift');
            }
          }
        }
        this.ambT -= dt;
        if (this.ambT <= 0) {
          this.ambT = Math.max(3.2, 7.5 - this.diff * 0.4) * (0.8 + Math.random() * 0.4);
          if (this.liveCount() < this.cap() && pl.x > 600 && pl.x < this.arena.x - 300) {
            const type = U.weighted(Math.random, this.sd.pool);
            const def = GV.ENEMIES[type];
            const side = Math.random() < 0.7 ? 1 : -1;
            const x = pl.cx + side * (520 + Math.random() * 120);
            if (def.fly) this.spawnEnemy(type, x, this.cam.y + 140);
            else {
              const gyv = this.groundYAt(x, pl.y - 300);
              if (gyv != null) this.spawnEnemy(type, x, gyv);
            }
          }
        }
        if (this.players.some((P) => !P.dead && P.cx > this.arena.x + 90 && P.cx < this.arena.x + this.arena.w)) this.startBoss();
      }

      this.updateProjs(dt);
      for (const h of this.hazards) { h.t -= dt; for (const P of this.players) if (h.t > 0 && !P.dead && U.ov(P, h)) { this.player = P; this.damagePlayer(h.dmg, h.x + h.w / 2); } }
      this.player = pl;
      this.hazards = this.hazards.filter((h) => h.t > 0);
      for (const w of this.warns) w.t -= dt;
      this.warns = this.warns.filter((w) => w.t > 0);
      this.updateDrops(dt);

      // per-player: spikes, pits, pickups, beacons, the exit
      for (const P of this.players) {
      pl = this.player = P;
      if (P.dead) continue;
      // spikes & pits
      for (const s of L.spikes) {
        const hb = { x: pl.x + 4, y: pl.y + 10, w: pl.w - 8, h: pl.h - 10 };
        if (U.ov(hb, s) && pl.inv <= 0) { this.damagePlayer(14 + this.diff * 2, pl.cx + (Math.random() - 0.5), false, true); pl.vy = -560; }
      }
      if (pl.y > L.killY && !pl.dead) {
        this.damagePlayer(18 + this.diff * 2, pl.cx, true);
        if (!pl.dead) { pl.x = pl.lastSafe.x; pl.y = pl.lastSafe.y; pl.vx = 0; pl.vy = 0; pl.inv = 1.2; this.snapCam(); }
      }

      // pickups
      for (const m of L.memories) {
        if (m.taken) continue;
        if (Math.abs(pl.cx - m.x) < 20 && Math.abs(pl.cy - m.y) < 30) { m.taken = true; this.gainMem(1); this.sfx('mem'); this.burst(m.x, m.y, 6, '#fff', 120, 0.35, 2); }
      }
      for (const v of L.vaults) {
        if (v.taken) continue;
        if (Math.abs(pl.cx - v.x) < 26 && Math.abs(pl.cy - v.y) < 36) {
          v.taken = true;
          const d = GV.save.data;
          d.vaults[v.key] = true;
          const g = 25 + this.diff * 5;
          this.gainMem(g);
          const ck = ['alch', 'chaos', 'annul'][U.hash(v.key) % 3]; d.cur[ck] = (d.cur[ck] || 0) + 1;
          this.toast(`Cache: +1 ${GV.CURRENCY[ck].name}`, 2, 'small');
          d.uncut.push({ kind: 'support', tier: GV.progress.dropTier(this.diff) });
          this.burst(v.x, v.y, 50, '#fff', 260, 0.8, 3);
          this.sfx('level');
          const lore = GV.UNIVERSE.LORE[(U.hash(v.key) % GV.UNIVERSE.LORE.length)];
          if (!d.lore.includes(lore)) d.lore.push(lore);
          GV.save.write();
          this.openDialog('MEMORY CACHE', [`+${g} memories, crafting currency, and a Blank Augment.`, `A fragment plays back: "${lore}"`], null, this.pal.glow);
        }
      }
      for (const cp of L.checkpoints) {
        if (cp.on) continue;
        if (Math.abs(pl.cx - (cp.x + 10)) < 40 && pl.y + pl.h > cp.y - 110) {
          cp.on = true;
          this.respawn = { x: cp.x, y: cp.y - pl.h };
          pl.heal(pl.maxHp * 0.3);
          pl.ward = pl.maxWard;
          pl.flaskGain(3);
          this.toast('BEACON LIT', 1.6, 'small');
          this.sfx('beacon');
          this.burst(cp.x + 10, cp.y - 82, 30, this.pal.accent, 200, 0.8, 3);
          GV.save.write();
        }
      }
      if (this.state === 'won') {
        const ex = L.exit;
        if (Math.abs(pl.cx - ex.x - 20) < 40 && pl.y + pl.h > ex.y - 120) this.finish();
      }

      }
      pl = this.player = this.lead();
      // npcs
      this.nearNpc = null;
      for (const n of L.npcs) if (Math.abs(pl.cx - n.x) < 70 && Math.abs(pl.y + pl.h - n.y) < 70) this.nearNpc = n;
      if (this.nearNpc && I.pressed('interact')) this.talk(this.nearNpc);

      this.updateCam(dt);
    }

    // ---------- tutorial ghost: a faded crewmate who floats ahead and shows you the ropes ----------
    updateGhost(dt) {
      const g = this.ghost, pl = this.player, step = GV.TUTORIAL[g.i];
      if (!step) { this.ghost = null; GV.save.data.tutDone = true; GV.save.write(); return; }
      g.t += dt;
      if (step.on) for (const a of step.on) if (I.pressed(a)) g.n++;
      const done = g.t > 0.8 && ((step.need && g.n >= step.need) || (step.dist && pl.cx - g.sx > step.dist) || (step.time && g.t > step.time));
      if (done) { g.i++; g.t = 0; g.n = 0; g.sx = pl.cx; GV.audio.sfx('mem'); }
      const tx = pl.cx + pl.facing * 90, ty = pl.y + pl.h - 40 + Math.sin(this.t * 2) * 8;
      const k = Math.min(1, dt * 3); g.x += (tx - g.x) * k; g.y += (ty - g.y) * k;
    }
    drawGhost(ctx) {
      const g = this.ghost, step = g && GV.TUTORIAL[g.i];
      if (!step) return;
      A.glow(ctx, g.x, g.y - 24, 50, 'rgba(160,220,255,0.18)');
      A.spaceman(ctx, g.x, g.y, { facing: this.player.cx > g.x ? 1 : -1, t: this.t, alpha: 0.38 + Math.sin(this.t * 3) * 0.08, cloak: '#2a3f55', suit: '#9fd8ff', visor: '#e8fbff', air: true });
      const scheme = I.pad ? 'pad' : I.isTouch ? 'touch' : 'kb', txt = I.fill(step[scheme] || step.kb);
      ctx.save(); ctx.font = `600 13px ${C.FONT}`; ctx.textAlign = 'center';
      const w = Math.min(340, ctx.measureText(txt).width + 26), bx = g.x - w / 2, by = g.y - 92;
      ctx.globalAlpha = Math.min(1, g.t * 3);
      ctx.fillStyle = 'rgba(6,14,26,0.85)'; A.rrect(ctx, bx, by, w, 28, 8);
      ctx.strokeStyle = 'rgba(160,220,255,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, 27);
      ctx.fillStyle = '#dff3ff'; ctx.fillText(txt, g.x, by + 19);
      ctx.restore();
    }

    // ---------- Rift Trial: endless waves, a boss every fifth ----------
    updateTrial(dt) {
      const T = this.trial, pl = this.player;
      if (T.restT > 0) { T.restT -= dt; if (T.restT <= 0) this.nextWave(); return; }
      if (T.left > 0) {
        T.spawnT -= dt;
        if (T.spawnT <= 0 && this.liveCount() < this.cap() + 2) {
          T.left--; T.spawnT = Math.max(0.3, 1.15 - T.wave * 0.04);
          const pt = this.L.portals[Math.floor(Math.random() * this.L.portals.length)];
          const type = U.weighted(Math.random, this.sd.pool), fly = GV.ENEMIES[type].fly;
          const gx = pt.y < this.arena.floorY - 200 && !fly ? pt.x + 22 + (Math.random() - 0.5) * 200 : pt.x + 22;
          this.spawnEnemy(type, gx, fly ? pt.y : (pt.y < this.arena.floorY - 200 ? pt.y + 140 : this.arena.floorY));
          pt.pulse = 0.4; this.sfx('rift');
        }
      } else if (!this.enemies.length && !this.boss) {
        const bonus = 2 + T.wave;
        this.gainMem(bonus);
        if ((T.curses || {}).dry) pl.flaskGain(3); else pl.flaskGain(1);
        this.toast(`Wave ${T.wave} cleared`, 1.8, 'small');
        this.text(pl.cx, pl.y - 20, `+${bonus} memories`, '#ffffff', 14);
        T.restT = 3;
      }
    }
    nextWave() {
      const T = this.trial;
      T.wave++;
      this.diff = T.baseDiff + Math.floor((T.wave - 1) / 3);
      T.left = Math.round(5 + T.wave * 1.6);
      T.spawnT = 0.5;
      if (T.wave % ((T.curses || {}).bosses3 ? 3 : 5) === 0) {
        const kinds = ['brood', 'sentinel', 'leviathan', 'choir', 'warden'];
        const k = kinds[(T.bossN = (T.bossN || 0) + 1) % 5 === 0 ? 4 : (T.bossN - 1) % 5];
        this.sd.boss = k;
        this.sd.bossName = { brood: 'Trial Broodmother', sentinel: 'Trial Sentinel', warden: 'Trial Warden', leviathan: 'Trial Leviathan', choir: 'Trial Choir' }[k] + ' · Wave ' + T.wave;
        T.left = Math.round(3 + T.wave * 0.4);
        this.spawnBoss();
        this.shake(10); this.sfx('boss');
      } else this.toast(`Wave ${T.wave}`, 1.6);
    }
    endTrial() {
      const T = this.trial, d = GV.save.data;
      const reached = Math.max(0, T.wave - 1);
      const cb = Object.keys(T.curses || {}).filter((k) => T.curses[k]).reduce((a, k) => a + GV.TRIAL_CURSES[k].bonus, 0);
      const bonus = Math.round(reached * 5 * (1 + GV.progress.frontier()) * (1 + cb / 100));
      d.memories += bonus;
      const best = d.trialBest || 0, newBest = reached > best;
      if (newBest) d.trialBest = reached;
      d.trialRuns = (d.trialRuns || 0) + 1;
      d.stats = d.stats || {};
      if (reached >= 5 && Object.keys(T.curses || {}).filter((k) => T.curses[k]).length >= 3) d.stats.cursed5 = 1;
      const daily = T.daily ? GV.daily.finish(reached) : null;
      GV.quests.emit('trial', { reached, curses: T.curses || {} });
      GV.save.write();
      GV.ach.check();
      return { daily, curses: T.curses, curseBonus: cb, wave: T.wave, reached, bonus, gathered: d.memories - T.memStart - bonus, kills: this.kills, best: d.trialBest, newBest, sys: this.sysIdx };
    }

    // Minions: crew echoes follow you and fire; turrets stay put and fire.
    updateMinions(dt) {
      const pl = this.player;
      for (const m of this.minions) {
        m.t -= dt; m.cd -= dt;
        if (m.kind === 'echo') {
          const tx = pl.cx - pl.facing * (36 + m.i * 28), ty = pl.y - 18 + Math.sin(this.t * 2 + m.i) * 8;
          m.x += (tx - m.x) * Math.min(1, dt * 4); m.y += (ty - m.y) * Math.min(1, dt * 4);
        }
        if (m.cd <= 0) {
          let best = null, bd = (m.kind === 'turret' ? 460 : 400) ** 2;
          const ox = m.x, oy = m.kind === 'turret' ? m.y - 26 : m.y + 22;
          for (const e of this.enemies) {
            if (e.dead || (e.alpha != null && e.alpha < 0.4)) continue;
            const dx = e.x + e.w / 2 - ox, dy = e.y + e.h / 2 - oy, dd = dx * dx + dy * dy;
            if (dd < bd) { bd = dd; best = e; }
          }
          if (best) {
            const s = m.s, n = m.kind === 'turret' ? s.proj : 1;
            const base = Math.atan2(best.y + best.h / 2 - oy, best.x + best.w / 2 - ox);
            for (let k = 0; k < n; k++) {
              const a = base + (k - (n - 1) / 2) * 0.12, sp = s.pspeed || 760;
              this.spawnProj({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 6, friendly: true, kind: 'gem', s, hit: new Set(), pierce: s.pierce, chain: s.chain, life: 0.8, o: m.o, color: s.def.color });
            }
            m.cd = (m.kind === 'turret' ? 0.5 : 0.85) / (GV.minionRate ? GV.minionRate(m.s, m.s && m.s.pl) : 1);
            m.flash = 0.1;
          } else m.cd = 0.2;
        }
        if (m.flash > 0) m.flash -= dt;
      }
      this.minions = this.minions.filter((m) => m.t > 0);
    }

    groundYAt(x, above) {
      let best = null;
      for (const s of this.L.solids) if (!s.gone && !s.ceiling && x > s.x && x < s.x + s.w && s.y > above && (best == null || s.y < best)) best = s.y;
      return best;
    }

    // Anything still on the ground when you leave is swept up, so no loot is ever lost at the exit.
    sweepDrops() {
      const pl = this.players.find((q) => !q.dead) || this.player;
      for (const dr of this.drops) if (!dr.got && !dr.claim) { dr.got = true; this.giveDrop(dr, pl); }
      this.drops = [];
    }

    finish() {
      this.sweepDrops();
      const d = GV.save.data;
      const key = `${this.sysIdx}-${this.stIdx}`;
      const first = !d.cleared[key];
      d.cleared[key] = true;
      const ship = this.sysIdx === 0 && this.stIdx === 2 && !d.shipFound;
      if (ship) d.shipFound = true;
      if (GV.codex) GV.codex.check();
      GV.quests.emit('clear', { key, sys: this.sysIdx, mem: this.memGot });
      GV.save.write();
      this.state = 'clear';
      const vt = this.L.vaults.length, vf = this.L.vaults.filter((v) => v.taken).length;
      this.pendingClear = { sys: this.sysIdx, st: this.stIdx, mem: this.memGot, kills: this.kills, vaults: vf, vaultsTotal: vt, first, ship, name: this.sd.name, sysName: this.sys.name };
    }

    respawnPlayer() {
      const pl = this.player;
      pl.place(this.respawn.x, this.respawn.y);
      pl.hp = pl.maxHp; pl.charge = pl.maxChargeEff; pl.ward = pl.maxWard; pl.inv = 1.5;
      this.enemies = []; this.projs = []; this.hazards = []; this.warns = []; this.drops = [];
      this.hitboxes = []; this.timers = []; this.strikes = []; this.grounds = []; this.minions = [];
      if (this.state !== 'won') {
        this.boss = null;
        this.L.gates[0].closed = false;
        this.state = 'run';
      } else this.state = 'won';
      this.pendingDeath = false; this.deathShown = false;
      this.snapCam();
    }

    // ---------- camera & fx ----------
    zoom() { return GV.settings.zoom(); }
    vw() { return C.W / this.zoom(); }
    vh() { return C.H / this.zoom(); }
    camTarget() {
      const pl = this.player, ar = this.arena, W = this.vw(), H = this.vh();
      let tx, ty;
      const inArena = this.trial || this.titanMode || this.state === 'boss' || (this.state === 'won' && pl.cx < ar.x + ar.w);
      if (inArena) {
        // In an arena the view follows you, but leans toward the boss so you can see what's coming.
        const b = this.boss, bx = b && !b.dead ? b.x + b.w / 2 : pl.cx;
        const fx = pl.cx + U.clamp((bx - pl.cx) * 0.35, -W * 0.25, W * 0.25);
        tx = U.clamp(fx - W / 2, ar.x - 40, ar.x + ar.w - W + 40);
        if (ar.w + 80 < W) tx = ar.x + ar.w / 2 - W / 2;
        const by = b && !b.dead ? Math.min(pl.cy, b.y + b.h / 2) : pl.cy;
        ty = Math.min(ar.floorY + 90 - H, (pl.cy + by) / 2 - H * 0.55);
        ty = Math.max(ty, (this.titanMode ? ar.top - 160 : ar.top - 60));
        ty = Math.max(ty, pl.y + pl.h + 110 - H); // never lose the player off the bottom
        ty = Math.min(ty, ar.floorY + 90 - H);
        if (this.trial && !this.titanMode) return { tx: U.clamp(tx, -40, this.L.length - W + 40), ty };
      } else { tx = pl.cx - W * 0.42 + pl.facing * 46; ty = pl.cy - H * 0.6; }
      tx = U.clamp(tx, -200, this.L.length - W + 40);
      ty = Math.min(ty, this.camBottom - H);
      return { tx, ty };
    }
    snapCam() { const { tx, ty } = this.camTarget(); this.cam.x = tx; this.cam.y = ty; }
    updateCam(dt) {
      const { tx, ty } = this.camTarget();
      this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 7);
      this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 5);
    }
    updateFx(dt) {
      this.shakeA = Math.max(0, this.shakeA - dt * 40);
      for (const p of this.parts) { p.life -= dt; p.vy += (p.grav || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; }
      this.parts = this.parts.filter((p) => p.life > 0);
      if (this.parts.length > C.MAX_PARTS) this.parts.splice(0, this.parts.length - C.MAX_PARTS);
      for (const t of this.texts) { t.life -= dt; t.y -= 40 * dt; }
      this.texts = this.texts.filter((t) => t.life > 0);
      for (const n of this.novas) { n.t += dt; n.r = 10 + (n.max - 10) * Math.min(1, n.t / 0.3); }
      this.novas = this.novas.filter((n) => n.t < 0.45);
      for (const t of this.toasts) t.t -= dt;
      this.toasts = this.toasts.filter((t) => t.t > 0);
      for (const rf of this.L.rifts) rf.flash -= dt;
    }

    // ---------- draw ----------
    draw(ctx) {
      const L = this.L, W = C.W, H = C.H, t = this.t, pal = this.pal, Z = this.zoom(), VW = W / Z, VH = H / Z;
      A.drawBackground(ctx, this.bg, this.cam, t, pal);
      this.drawIncursionSky(ctx);
      ctx.save();
      const sx = (Math.random() - 0.5) * this.shakeA, sy = (Math.random() - 0.5) * this.shakeA;
      ctx.scale(Z, Z);
      ctx.translate(-Math.round((this.cam.x - sx) * Z) / Z, -Math.round((this.cam.y - sy) * Z) / Z);
      const v = { x0: this.cam.x - 60, x1: this.cam.x + VW + 60, y0: this.cam.y - 60, y1: this.cam.y + VH + 60 };
      const vis = (o, pad = 0) => o.x + (o.w || 0) > v.x0 - pad && o.x < v.x1 + pad;

      this.drawTitanBack(ctx);
      for (const rf of L.rifts) if (!rf.dead && vis(rf, 80)) A.rift(ctx, rf, t, pal);
      if (L.portals) for (const pt of L.portals) { pt.pulse -= 1 / 60; A.rift(ctx, pt, t, pal); }
      for (const s of L.solids) if (!s.gone && !s.breakable && vis(s)) { if (s.ceiling) this.drawCeiling(ctx, s); else A.rock(ctx, s, pal, v); }
      for (const o of L.oneways) if (!o.gone && vis(o)) { if (o.crumble) this.drawCrumble(ctx, o); else A.ledge(ctx, o, pal, false, t); }
      this.drawFeatures(ctx, vis);
      for (const m of L.movers) if (vis(m)) A.ledge(ctx, m, pal, true, t);
      for (const m of L.membranes) if (vis(m)) A.membrane(ctx, m, t, pal);
      for (const g of L.gates) if (vis(g)) A.gate(ctx, g, t, pal, g.closed);
      for (const s of L.spikes) if (vis(s)) A.spikes(ctx, s, pal);
      for (const cp of L.checkpoints) if (vis(cp, 60)) A.beacon(ctx, cp, t, pal);
      const ab = GV.save.data.abilities;
      for (const s of L.sigils) {
        if (!vis(s, 40)) continue;
        A.sigil(ctx, s, t, ab[s.type]);
        if (Math.abs(this.player.cx - s.x) < 170) {
          ctx.font = `600 12px ${C.FONT}`; ctx.textAlign = 'center';
          ctx.fillStyle = GV.ABILITIES[s.type].color;
          ctx.fillText(ab[s.type] ? GV.ABILITIES[s.type].name.toUpperCase() : `SEALED · NEEDS ${GV.ABILITIES[s.type].name.toUpperCase()}`, s.x, s.y - 26);
        }
      }
      for (const vt of L.vaults) if (!vt.taken && vis(vt, 40)) A.memory(ctx, vt.x, vt.y, t, pal, true);
      for (const m of L.memories) if (!m.taken && vis(m, 20)) A.memory(ctx, m.x, m.y, t, pal, false);
      if (vis(L.exit, 80)) A.flag(ctx, L.exit, t, pal, this.state === 'won');
      for (const n of L.npcs) {
        if (!vis(n, 60)) continue;
        A.npc(ctx, n, t);
        if (this.nearNpc === n && !this.dialog) {
          ctx.font = `700 12px ${C.FONT}`; ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; A.rrect(ctx, n.x - 34, n.y - 92, 68, 20, 6);
          ctx.fillStyle = '#fff'; ctx.fillText(I.isTouch ? 'TAP E · TALK' : `${I.label('interact')} · TALK`, n.x, n.y - 78);
        }
      }
      for (const d of this.drops) {
        if (d.kind === 'mem') A.memory(ctx, d.x + 5, d.y + 5, t + d.x, pal, false);
        else if (d.kind === 'hp') { A.glow(ctx, d.x + 6, d.y + 6, 18, 'rgba(140,255,200,0.6)'); ctx.fillStyle = '#9fffd8'; ctx.fillRect(d.x + 4, d.y, 4, 12); ctx.fillRect(d.x, d.y + 4, 12, 4); }
        else if (d.kind === 'item') A.itemDrop(ctx, d.x + 7, d.y + 7, t, d.item);
        else if (d.kind === 'weapon') A.weaponDrop(ctx, d.x + 8, d.y + 8, t, d.wid);
        else if (d.kind === 'cur') { const c = GV.CURRENCY[d.cur].color; A.glow(ctx, d.x + 6, d.y + 6, 22, c); ctx.fillStyle = c; A.star(ctx, d.x + 6, d.y + 6, 6, 3, t * 3); }
        else A.gemItem(ctx, d.x + 7, d.y + 7, t, d.kind === 'orb' ? 'orb' : d.gk, d.tier);
      }
      for (const g of this.grounds) A.ground(ctx, g, t);
      for (const st of this.strikes) A.strikeWarn(ctx, st, t);
      if (this.zones) this.drawZones(ctx);
      // Telegraphs: a faint zone that fills from the middle out as the hit comes, so you can read
      // exactly when it lands. It flashes white in its last tenth of a second.
      for (const w of this.warns) {
        const k = w.max ? 1 - Math.max(0, w.t) / w.max : 0.5, last = w.t < 0.1;
        ctx.fillStyle = A.col(pal.hB, 100, 55, 0.1);
        ctx.fillRect(w.x, w.y, w.w, w.h);
        const fw = w.w * k, fh = w.h >= w.w ? w.h * k : w.h;
        ctx.fillStyle = last ? 'rgba(255,255,255,0.45)' : A.col(pal.hB, 100, 58, 0.22 + 0.2 * k);
        if (w.h >= w.w) ctx.fillRect(w.x, w.y + w.h - fh, w.w, fh); else ctx.fillRect(w.x + (w.w - fw) / 2, w.y, fw, w.h);
        ctx.strokeStyle = last ? '#ffffff' : A.col(pal.hB, 100, 65, 0.55 + 0.4 * Math.abs(Math.sin(w.t * 14))); ctx.lineWidth = last ? 2.5 : 1.5;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
        if (w.w > 30) { ctx.fillStyle = last ? '#fff' : A.col(pal.hB, 100, 70, 0.9); ctx.font = `800 ${Math.min(22, 10 + w.w / 12)}px ${GV.CFG.FONT}`; ctx.textAlign = 'center'; ctx.fillText('!', w.x + w.w / 2, w.y - 6); }
      }
      for (const e of this.enemies) if (vis(e, 80) && !e.pvpProxy) {
        if (e.elite) A.glow(ctx, e.x + e.w / 2, e.y + e.h / 2, Math.max(e.w, e.h) * 1.4, e.eliteColor);
        e.def.draw(ctx, e, pal, t);
        A.ailments(ctx, e, t);
        if (e.elite) { ctx.font = `700 10px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = e.eliteColor; ctx.fillText(e.eliteName.toUpperCase(), e.x + e.w / 2, e.y - 14); }
        if (e.def.anomaly) this.drawAnomTag(ctx, e);
        if (!e.boss && !e.noBar && (e.hp < e.maxHp || e.elite || e.def.anomaly)) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x, e.y - 9, e.w, 4);
          ctx.fillStyle = e.def.anomaly ? '#ff4fd8' : pal.accent; ctx.fillRect(e.x, e.y - 9, e.w * Math.max(0, e.hp / e.maxHp), 4);
        }
      }
      for (const m of this.minions) {
        const fade = Math.min(1, m.t / 1.5);
        if (m.kind === 'echo') A.spaceman(ctx, m.x, m.y + 50, { facing: this.player.facing, t: this.t + m.i, scale: 0.85, alpha: (0.45 + Math.sin(this.t * 6 + m.i) * 0.1) * fade, cloak: '#2a3f55', suit: '#9fd8ff', visor: '#e8fbff', air: true });
        else {
          ctx.globalAlpha = fade;
          ctx.strokeStyle = '#5c6378'; ctx.lineWidth = 3;
          A.line(ctx, m.x, m.y - 22, m.x - 12, m.y); A.line(ctx, m.x, m.y - 22, m.x + 12, m.y);
          ctx.fillStyle = '#2b2f40'; A.rrect(ctx, m.x - 10, m.y - 34, 20, 14, 4);
          ctx.fillStyle = m.flash > 0 ? '#fff' : m.s.def.color; A.circle(ctx, m.x, m.y - 27, 4);
          A.glow(ctx, m.x, m.y - 27, 18, 'rgba(255,240,120,0.5)');
          ctx.globalAlpha = 1;
        }
      }
      if (this.ghost) this.drawGhost(ctx);
      for (const P of this.players) if (P !== this.player) P.draw(ctx, this);
      this.player.draw(ctx, this);
      if (this.coop) this.drawCoop(ctx);
      this.drawProjs(ctx);
      for (const h of this.hazards) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const k = h.t / h.max;
        const g = ctx.createLinearGradient(h.x, 0, h.x + h.w, 0);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, A.col(pal.hB, 100, 65, 0.9 * k)); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(h.x, h.y, h.w, h.h);
        ctx.fillStyle = `rgba(255,255,255,${0.7 * k})`; ctx.fillRect(h.x + h.w / 2 - 4, h.y, 8, h.h);
        ctx.restore();
      }
      for (const n of this.novas) {
        const k = 1 - n.t / 0.45;
        ctx.globalAlpha = Math.max(0, k);
        ctx.strokeStyle = n.color || A.col(pal.hA, 100, 75); ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = Math.max(0, k * 0.5);
        A.glow(ctx, n.x, n.y, n.r, n.color || pal.accent);
        ctx.globalAlpha = 1;
      }
      for (const b of this.bolts) A.lightning(ctx, b);
      for (const p of this.parts) {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        if (p.add) ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      for (const tx of this.texts) {
        ctx.globalAlpha = Math.min(1, tx.life / tx.max * 1.5);
        ctx.font = `700 ${tx.size}px ${C.FONT}`;
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(tx.txt, tx.x + 1, tx.y + 1);
        ctx.fillStyle = tx.color; ctx.fillText(tx.txt, tx.x, tx.y);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      if (this.darkT > 0 || (this.trial && this.trial.curses && this.trial.curses.dark)) {
        const px = (this.player.cx - this.cam.x) * Z, py = (this.player.cy - this.cam.y) * Z;
        const k = this.darkT > 0 ? Math.min(1, this.darkT / 0.4) : 0.85;
        const g = ctx.createRadialGradient(px, py, 90, px, py, 270);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.95 * k})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      this.drawGlitch(ctx);
      if (!this.staticHud) GV.hud.draw(ctx, this);
    }
  }

  Object.assign(Play.prototype, GV.Combat);
  GV.Play = Play;
})();
