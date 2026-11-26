// Galactic Void — the spaceman. Movement (run, jump, air jumps, dash, wall grip), defences
// (life, void ward, armour, evasion, block), and the four-slot skill bar.
(function () {
  const GV = window.GV, U = GV.util, C = GV.CFG, I = GV.input;
  const ACTS = ['attack', 'skill1', 'skill2', 'skill3'];

  class Player {
    constructor(x, y, slot) {
      this.isPlayer = true;
      this.slot = slot || 0;
      this.inp = this.slot ? GV.input.p2 : GV.input;
      this.w = 24; this.h = 50;
      this.hp = null; this.charge = null; this.ward = null;
      this.place(x, y);
      this.recalc();
    }
    place(x, y) {
      this.x = x; this.y = y; this.vx = 0; this.vy = 0;
      this.facing = 1; this.onGround = false; this.ground = null; this.hitWall = 0; this.wallSide = 0;
      this.coyote = 0; this.buffer = 0; this.jumps = 1; this.dashT = 0; this.dashCd = 0; this.airDash = true;
      this.dropT = 0; this.inv = 1; this.hurtT = 0; this.t = 0; this.dead = false; this.wallLock = 0;
      this.busy = 0; this.cd = [0, 0, 0, 0]; this.swing = null; this.dive = null; this.charging = null; this.channel = null;
      this.orbit = null; this.stealth = 0; this.decoy = null; this.buffs = { howl: 0 }; this.howlPct = 0; this.overT = 0;
      this.wardDelay = 0;
      this.zeal = 0; this.zealT = 0; this.dance = 0; this.danceT = 0; this.lingerCd = 0; this.guardT = 0; this.quickdraw = false;
      // Flasks: Life and Charge. Kills refill them; beacons top them up.
      const fm = 3 + ((GV.save.data.ship || {}).racks || 0);
      this.flasks = [{ n: fm, max: fm, t: 0 }, { n: fm, max: fm, t: 0 }];
      this.lastSafe = { x, y };
      this.jumpWasHeld = false;
    }
    get cx() { return this.x + this.w / 2; }
    get cy() { return this.y + this.h / 2; }

    recalc() { GV.save.as(this.dataSlot != null ? this.dataSlot : this.slot, () => this.recalc0()); } // dataSlot: a joiner's own suit is slot 0 in their save, whatever its colour
    recalc0() {
      const d = GV.save.data;
      this.cls = d.cls;
      const st = (this.st = GV.computeStats());
      const oldMax = this.maxHp || 0;
      this.maxHp = st.maxLife; this.maxWard = st.maxWard; this.maxCharge = st.maxCharge;
      if (this.hp == null) this.hp = this.maxHp;
      else this.hp = Math.min(this.maxHp, this.hp + Math.max(0, this.maxHp - oldMax));
      if (this.ward == null) this.ward = this.maxWard;
      this.ward = Math.min(this.ward, this.maxWard);
      this.weapon = GV.equippedWeapon(d);
      this.kit = GV.kitLook(d);
      this.skills = GV.inv.barGems().map((g) => (g ? GV.Skills.build(g, st, this.weapon) : null));
      // A gun, bow or crossbow takes over the basic attack for every class: a spell or a ranged attack in
      // slot 1 becomes a weapon attack with the same level and augments. (Ion Shot is the pistol's own shot.)
      const W0 = this.weapon, s0 = this.skills[0];
      if (s0 && W0 && (W0.gun || W0.gun2) && s0.kind !== 'melee' && !(s0.id === 'ionshot' && (W0.gun || W0.gun2) === 'pistol')) {
        const g = GV.Skills.build({ id: 'strike', lvl: s0.L, sup: s0.gem.sup || [] }, st, W0);
        if (g) { g.gem = s0.gem; g.name = W0.name; g.gunFrom = s0.name; this.skills[0] = g; }
      }
      else if (s0 && W0 && (W0.gun || W0.gun2) && s0.id === 'strike' && !W0.dual) s0.name = W0.name;
      if (this.herald) {
        const i = this.skills.findIndex((s) => s && s.kind === 'herald');
        this.herald = i >= 0 ? this.skills[i] : null;
      }
      this.maxChargeEff = this.maxCharge * (this.herald ? 1 - this.herald.def.reserve : 1);
      if (this.charge == null) this.charge = this.maxChargeEff;
      this.charge = Math.min(this.charge, this.maxChargeEff);
      for (const s of this.skills) if (s) s.pl = this;
      if (GV.touchUI && !this.slot) GV.touchUI.refresh(this);
    }
    heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }

    pay(s) {
      if (!s.cost) return true;
      if (this.st.ks.bloodrite) { if (this.hp > s.cost) { this.hp -= s.cost; return true; } return false; }
      if (this.charge >= s.cost) { this.charge -= s.cost; return true; }
      return false;
    }

    update(dt, p) {
      const ab = GV.save.data.abilities, st = this.st;
      this.t += dt;
      this.inv -= dt; this.hurtT -= dt; this.dashCd -= dt; this.dropT -= dt; this.wallLock -= dt; this.busy -= dt;
      this.overT -= dt; this.buffs.howl -= dt; this.wardDelay -= dt;
      this.zealT -= dt; if (this.zealT <= 0) this.zeal = 0;
      this.danceT -= dt; if (this.danceT <= 0) this.dance = 0;
      this.lingerCd -= dt; this.guardT -= dt;
      if (this.stealth > 0) { this.stealth -= dt; if (this.stealth <= 0) this.decoy = null; }
      if (this.swing) { this.swing.t -= dt; if (this.swing.t <= 0) this.swing = null; }
      for (let i = 0; i < 4; i++) this.cd[i] -= dt;
      this.charge = Math.min(this.maxChargeEff, this.charge + st.chargeRegen * dt);
      if (st.regen > 0) this.heal(st.regen * dt);
      if (this.maxWard > 0 && this.wardDelay <= 0) this.ward = Math.min(this.maxWard, this.ward + this.maxWard * st.wardRecharge * dt);

      for (const k of ['nullT', 'invertT', 'gravT', 'slowT']) if (this[k] > 0) this[k] -= dt;
      const mv = ((this.inp.held('right') ? 1 : 0) - (this.inp.held('left') ? 1 : 0)) * (this.invertT > 0 ? -1 : 1);
      if (this.inp.pressed('jump')) this.buffer = C.BUFFER; else this.buffer -= dt;
      const run = C.RUN * st.moveMul * (this.channel ? 0.65 : 1);

      if (this.charging) {
        const c = this.charging;
        c.t -= dt;
        this.vx = c.dir * c.sp; this.vy = c.vy || 0; this.facing = c.dir;
        if (Math.random() < 0.9) p.parts.push({ x: this.cx - c.dir * 14, y: this.y + 8 + Math.random() * 36, vx: -c.dir * 80, vy: 0, life: 0.25, max: 0.25, size: 3, color: c.color, add: true });
        const r = { x: c.dir > 0 ? this.x : this.x - 30, y: this.y, w: this.w + 30, h: this.h };
        for (const e of p.enemies) if (!e.dead && !c.set.has(e) && U.ov(r, e)) { c.set.add(e); GV.Skills.hitEnemy(p, e, c.s, c.o); }
        for (const rf of p.L.rifts) if (!rf.dead && !c.set.has(rf) && U.ov(r, rf)) { c.set.add(rf); p.damageRift(rf, c.s.total); }
        const AF = st.asc || {};
        if (AF.burnTrail) {
          c.trailT -= dt;
          if (c.trailT <= 0) { c.trailT = 0.07; p.grounds.push({ x: this.cx, y: this.y + this.h, r: 42, t: 2, max: 2, s: c.s, tick: 0, o: { mult: 0.6 }, parts: { fire: c.s.total * 0.5 }, noHeal: true, color: '#ff9a4a' }); }
        }
        if (c.t <= 0 || this.hitWall) {
          this.charging = null; this.vx = c.dir * run * 0.5; if (this.hitWall) p.shake(5);
          if (AF.chargeGuard) this.guardT = 3;
        }
      } else if (this.dashT > 0) {
        this.dashT -= dt;
        this.vy = 0;
        this.vx = this.facing * C.DASH_SPEED;
        if (this.dashT <= 0) this.vx = this.facing * run;
        if (Math.random() < 0.8) p.parts.push({ x: this.cx - this.facing * 10, y: this.y + 10 + Math.random() * 30, vx: -this.facing * 60, vy: 0, life: 0.25, max: 0.25, size: 3, color: p.pal.glow, add: true });
      } else if (this.dive && this.dive.t <= 0) {
        this.inv = Math.max(this.inv, 0.06); this.vy = 1500; this.vx = this.dive.ax != null ? this.dive.ax * 900 : this.facing * 180;
      } else {
        if (this.dive) this.dive.t -= dt;
        let target = mv * run;
        if (this.swing && this.weapon.slow && this.onGround) target *= 0.4;
        if (this.hurtT > 0 || this.wallLock > 0) target = this.vx;
        const accel = this.onGround ? (mv ? C.ACCEL : C.FRICTION) : C.AIRACCEL;
        if (this.vx < target) this.vx = Math.min(target, this.vx + accel * dt);
        else if (this.vx > target) this.vx = Math.max(target, this.vx - accel * dt);
        if (mv && this.wallLock <= 0) this.facing = mv;
        this.vy = Math.min(this.gravT > 0 ? C.MAXFALL * 0.35 : C.MAXFALL, this.vy + C.GRAV * (this.gravT > 0 ? 0.3 : 1) * dt);
        if (ab.grip && !this.onGround && this.wallSide && mv === this.wallSide && this.vy > 0) {
          this.vy = Math.min(this.vy, C.WALL_SLIDE);
          if (Math.random() < 0.3) p.parts.push({ x: this.wallSide > 0 ? this.x + this.w : this.x, y: this.y + this.h - 6, vx: 0, vy: 30, life: 0.3, max: 0.3, size: 2, color: '#7dffb0', add: true });
        }
      }

      // jumping: coyote time, buffer, wall kick, air jumps
      if (this.onGround) { this.coyote = C.COYOTE; this.jumps = st.airJumps; this.airDash = true; }
      else this.coyote -= dt;
      if (this.buffer > 0 && this.dashT <= 0 && !this.charging && !this.dive) {
        if (this.inp.held('down') && this.onGround && this.ground && this.ground.h <= 16) {
          this.dropT = 0.22; this.buffer = 0; this.onGround = false; this.coyote = 0;
        } else if (this.coyote > 0) {
          this.vy = -C.JUMP; this.coyote = 0; this.buffer = 0; this.onGround = false; this.ground = null;
          p.sfx('jump'); p.burst(this.cx, this.y + this.h, 5, 'rgba(200,210,230,0.6)', 90, 0.3, 2, false);
        } else if (ab.grip && this.wallSide) {
          this.vy = -C.WALLJUMP_Y; this.vx = -this.wallSide * C.WALLJUMP_X; this.facing = -this.wallSide;
          this.wallLock = 0.14; this.buffer = 0; this.jumps = st.airJumps; this.airDash = true;
          p.sfx('jump'); p.burst(this.wallSide > 0 ? this.x + this.w : this.x, this.cy, 8, '#7dffb0', 140, 0.3, 2);
        } else if (this.jumps > 0) {
          this.vy = -C.DJUMP; this.jumps--; this.buffer = 0;
          p.sfx('djump'); p.burst(this.cx, this.y + this.h, 10, p.pal.glow, 160, 0.35, 2.5);
        }
      }
      const jh = this.inp.held('jump');
      if (!jh && this.jumpWasHeld && this.vy < 0 && this.dashT <= 0 && !this.dive) this.vy *= C.JUMP_CUT;
      this.jumpWasHeld = jh;

      if (this.inp.pressed('dash')) {
        if (!ab.dash) p.hint('Phase Dash is still sealed. A boss carries it.');
        else if (this.dashCd <= 0 && (this.onGround || this.airDash) && !this.charging) {
          if (mv) this.facing = mv;
          this.dashT = C.DASH_TIME; this.dashCd = C.DASH_CD / Math.max(0.4, 1 + st.dashCd / 100);
          if (!this.onGround) this.airDash = false;
          this.inv = Math.max(this.inv, C.DASH_TIME + 0.05);
          this.dive = null; this.channel = null;
          if (st.asc && st.asc.quickdraw) this.quickdraw = true;
          if (GV.onDash) GV.onDash(p, this);
          p.sfx('dash');
        }
      }

      const wasAir = !this.onGround;
      p.moveBody(this, dt);
      if (this.dive && this.dive.t <= 0 && this.onGround) GV.Skills.land(p, this);
      else if (this.dive && this.onGround && !wasAir && this.dive.t > 0.1) this.dive.t = 0; // blocked by a ceiling: drop now
      this.wallSide = 0;
      if (!this.onGround) {
        const pl = { x: this.x - 3, y: this.y + 8, w: 3, h: this.h - 16 }, pr = { x: this.x + this.w, y: this.y + 8, w: 3, h: this.h - 16 };
        for (const s of p.near(this.x - 4, this.x + this.w + 4, false)) { if (U.ov(pl, s)) this.wallSide = -1; else if (U.ov(pr, s)) this.wallSide = 1; }
      }
      if (this.onGround && this.ground && !this.ground.isMover && this.ground.h > 16) {
        const g = this.ground;
        this.lastSafe = { x: U.clamp(this.x, g.x + 16, g.x + g.w - this.w - 16), y: g.y - this.h };
      }

      this.useSkills(dt, p);
      this.updateOrbit(dt, p);
      this.updateFlasks(dt, p);
    }

    updateFlasks(dt, p) {
      const [lf, cf] = this.flasks;
      if (this.inp.pressed('flask1')) {
        if (lf.n >= 1 && this.hp < this.maxHp) { lf.n -= 1; p.flasksUsed = (p.flasksUsed || 0) + 1; lf.t = 2.5; this.heal(this.maxHp * 0.12); p.sfx('heal'); p.burst(this.cx, this.cy, 14, '#ff6a7a', 120, 0.5, 3); }
        else if (lf.n < 1) p.text(this.cx, this.y - 12, 'FLASK EMPTY', '#ff8a98', 12);
      }
      if (this.inp.pressed('flask2')) {
        if (cf.n >= 1 && this.charge < this.maxChargeEff) { cf.n -= 1; p.flasksUsed = (p.flasksUsed || 0) + 1; cf.t = 2; p.sfx('skill'); p.burst(this.cx, this.cy, 14, '#8fe9ff', 120, 0.5, 3); }
        else if (cf.n < 1) p.text(this.cx, this.y - 12, 'FLASK EMPTY', '#8fe9ff', 12);
      }
      if (lf.t > 0) { lf.t -= dt; this.heal(this.maxHp * 0.3 / 2.5 * dt); if (this.maxWard) this.ward = Math.min(this.maxWard, this.ward + this.maxWard * 0.1 * dt); }
      if (cf.t > 0) { cf.t -= dt; this.charge = Math.min(this.maxChargeEff, this.charge + this.maxCharge * 0.3 * dt); }
    }
    flaskGain(n) {
      const pl = GV.game && GV.game.play;
      if (pl && pl.trial && pl.trial.curses && pl.trial.curses.dry && n < 3) return;
      for (const f of this.flasks) f.n = Math.min(f.max, f.n + n);
    }

    useSkills(dt, p) {
      const free = !this.charging && !this.dive && this.dashT <= 0;
      let channelling = false;
      // Input buffer: a skill tapped while you're still mid-swing goes off as soon as you're free
      // (within 0.3s), and gets priority over a held attack.
      if (this.qT > 0) this.qT -= dt; else this.qI = -1;
      for (let i = 1; i < 4; i++) if (this.skills[i] && this.inp.pressed(ACTS[i]) && this.skills[i].kind !== 'channel' && this.skills[i].kind !== 'herald') { this.qI = i; this.qT = 0.3; }
      const qReady = this.qI > 0 && this.cd[this.qI] <= 0;
      for (let i = 0; i < 4; i++) {
        const s = this.skills[i];
        if (!s) continue;
        let pr = this.inp.pressed(ACTS[i]), hd = this.inp.held(ACTS[i]);
        if (qReady && i !== this.qI) { pr = false; hd = false; }
        if (this.qI === i && this.qT > 0) pr = true;
        if (i > 0 && this.nullT > 0) { if (pr) p.text(this.cx, this.y - 12, 'NULLED', '#ff4fd8', 13); continue; }
        if (s.kind === 'herald') {
          if (pr) {
            this.herald = this.herald ? null : s;
            this.maxChargeEff = this.maxCharge * (this.herald ? 1 - s.def.reserve : 1);
            this.charge = Math.min(this.charge, this.maxChargeEff);
            p.text(this.cx, this.y - 16, this.herald ? 'HERALD ON' : 'HERALD OFF', s.color, 13);
            p.sfx('skill');
          }
          continue;
        }
        if (s.kind === 'channel') {
          if ((pr || hd) && free) {
            channelling = true;
            if (!this.channel || this.channel.s !== s) this.channel = { s, tick: 0 };
            this.channel.tick -= dt;
            if (this.channel.tick <= 0) {
              if (!this.pay(s)) { if (pr) p.text(this.cx, this.y - 12, 'LOW CHARGE', p.pal.glow, 13); channelling = false; continue; }
              this.channel.tick = s.useTime / (1 + 0.05 * this.dance);
              GV.Skills.channelTick(p, this, s);
            }
          }
          continue;
        }
        if ((pr || hd) && free && this.busy <= 0 && this.cd[i] <= 0) {
          if (!this.pay(s)) { if (this.inp.pressed(ACTS[i])) p.text(this.cx, this.y - 12, this.st.ks.bloodrite ? 'LOW LIFE' : 'LOW CHARGE', p.pal.glow, 13); if (this.qI === i) this.qI = -1; continue; }
          this.busy = s.useTime / (1 + 0.05 * this.dance); this.cd[i] = s.cd;
          if (this.qI === i) { this.qI = -1; this.qT = 0; }
          GV.Skills.use(p, this, s, i);
        }
      }
      if (!channelling) this.channel = null;
    }

    updateOrbit(dt, p) {
      const o = this.orbit;
      if (!o) return;
      o.t -= dt;
      for (let i = 0; i < o.n; i++) {
        const a = this.t * 4 + (i * Math.PI * 2) / o.n, ox = this.cx + Math.cos(a) * 58, oy = this.cy + Math.sin(a) * 58;
        for (const e of p.enemies) {
          if (e.dead) continue;
          const cd = o.cd.get(e) || 0;
          if (p.t > cd && U.circRect(ox, oy, 16, e)) {
            o.cd.set(e, p.t + 0.35);
            GV.Skills.hitEnemy(p, e, o.s, Object.assign({}, o.o, { kx: Math.sign(e.x - this.x) * 140, ky: -80, ambush: false }));
          }
        }
      }
      if (o.t <= 0) this.orbit = null;
    }

    draw(ctx, p) {
      if (this.dead) return;
      const cls = GV.CLASSES[this.cls], look = Object.assign({}, (cls && cls.look) || {}, this._dye || {});
      const blink = this.inv > 0 && this.dashT <= 0 && !this.charging && Math.floor(this.t * 20) % 2 === 0;
      const alpha = this.stealth > 0 ? 0.28 : blink ? 0.4 : 1;
      if (this.decoy && this.stealth > 0) GV.art.spaceman(ctx, this.decoy.x + 12, this.decoy.y + this.h + 4, { facing: this.facing, t: 0, alpha: 0.2 + Math.sin(this.t * 10) * 0.08, cloak: look.cloak, visor: look.visor, visorGlow: look.glow });
      if (this.dashT > 0 || this.charging) {
        for (let i = 1; i <= 3; i++) GV.art.spaceman(ctx, this.cx - this.facing * i * 16, this.y + this.h + 4, { facing: this.facing, t: this.t, alpha: 0.25 / i, air: true, visor: '#ffffff', cloak: look.cloak });
      }
      const spinning = this.swing && this.swing.kind === 'spin';
      GV.art.spaceman(ctx, this.cx, this.y + this.h + 4, {
        facing: spinning ? (Math.floor(this.t * 16) % 2 ? 1 : -1) : this.facing, t: this.t,
        run: this.onGround && Math.abs(this.vx) > 40, air: !this.onGround, vx: this.vx, alpha, flash: this.hurtT > 0.1,
        attack: this.swing ? 1 - this.swing.t / this.swing.max : 0,
        cloak: look.cloak, visor: look.visor, visorGlow: look.glow, suit: look.suit, gear: this.weapon.art, gearColor: this.weapon.color,
        kit: this.kit, off: this.weapon.offArt, offColor: this.weapon.offColor, squash: this.squash || 0,
      });
      if (this.herald) GV.art.glow(ctx, this.cx, this.cy, 46, 'rgba(255,120,60,0.22)');
      if (this.ward > 0 && this.maxWard > 0) {
        ctx.strokeStyle = `rgba(190,235,255,${0.12 + 0.25 * (this.ward / this.maxWard)})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(this.cx, this.cy - 4, 24, 34, 0, 0, Math.PI * 2); ctx.stroke();
      }
      this.drawSwing(ctx);
      if (this.orbit) {
        for (let i = 0; i < this.orbit.n; i++) {
          const a = this.t * 4 + (i * Math.PI * 2) / this.orbit.n;
          GV.art.memory(ctx, this.cx + Math.cos(a) * 58, this.cy + Math.sin(a) * 58, this.t + i, p.pal, false);
        }
      }
    }

    drawSwing(ctx) {
      const sw = this.swing;
      if (!sw) return;
      const k = 1 - sw.t / sw.max;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.85 * (1 - k * 0.6);
      ctx.strokeStyle = sw.color; ctx.lineCap = 'round';
      const cy = this.y + this.h * 0.42, f = this.facing;
      if (sw.rot) { ctx.translate(this.cx, cy); ctx.rotate(sw.rot); ctx.translate(-this.cx, -cy); }
      else if (sw.vert) { ctx.translate(this.cx, cy); ctx.rotate(sw.vert * f * Math.PI / 2); ctx.translate(-this.cx, -cy); }
      if (sw.kind === 'spin') {
        ctx.lineWidth = 6;
        for (let i = 0; i < 2; i++) {
          const a0 = this.t * 18 + i * Math.PI;
          ctx.beginPath(); ctx.ellipse(this.cx, cy, sw.reach, sw.reach * 0.45, 0, a0, a0 + 2.2); ctx.stroke();
        }
      } else if (sw.kind === 'arc') {
        ctx.lineWidth = 8;
        ctx.beginPath();
        const r = sw.reach * 0.8;
        if (f > 0) ctx.arc(this.cx, cy, r, -1.3 + k * 0.4, 1.1 + k * 0.3);
        else ctx.arc(this.cx, cy, r, Math.PI + 1.3 - k * 0.4, Math.PI - 1.1 - k * 0.3, true);
        ctx.stroke();
      } else if (sw.kind === 'shot') {
        GV.art.glow(ctx, this.cx + f * 22, this.y + 20, 18, 'rgba(140,255,220,0.8)');
      } else {
        const ox = f > 0 ? this.x + this.w - 4 : this.x + 4, reach = sw.reach * (0.55 + k * 0.45);
        ctx.lineWidth = 4; GV.art.line(ctx, ox, cy, ox + f * reach, cy);
        ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; GV.art.line(ctx, ox, cy, ox + f * reach, cy);
      }
      ctx.restore();
    }
  }
  GV.Player = Player;
})();
