// Galactic Void — combat plumbing mixed into the Play scene: damage in and out, defences,
// projectiles, drops (memories, uncut gems, void conduits), particles and text.
(function () {
  const GV = window.GV, U = GV.util, A = GV.art;

  GV.Combat = {
    spawnProj(o) { o.life = o.life || 2; o.r = o.r || 6; o.t = 0; if (o.friendly && o.s && o.s.bounce && o.bounce == null && !o.ghost) o.bounce = o.s.bounce; this.projs.push(o); return o; },
    burst(x, y, n, color, spd = 200, life = 0.5, size = 3, add = true, grav = 0) {
      if (this.parts.length > GV.CFG.MAX_PARTS) n = Math.ceil(n / 3);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random() * 0.7);
        const l = life * (0.6 + Math.random() * 0.6);
        this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: l, max: l, size: size * (0.6 + Math.random() * 0.8), color, add, grav });
      }
    },
    text(x, y, txt, color = '#fff', size = 14) { if (this.texts.length < 60) this.texts.push({ x, y, txt, color, size, life: 0.9, max: 0.9 }); },
    shake(a) { if (GV.settings.data.shake) this.shakeA = Math.max(this.shakeA, a); },
    sfx(n) { GV.audio.sfx(n); },
    buzz(ms) { try { if (GV.input.isTouch && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} },
    warn(o) { o.max = o.t; this.warns.push(o); },
    hazard(o) { o.max = o.t; this.hazards.push(o); },
    delay(t, fn) { this.timers.push({ t, fn }); },
    hint(msg) { if (this.hintT > 0) return; this.hintT = 2.5; this.toast(msg, 2.2, 'small'); },
    toast(msg, t = 2.5, kind = 'big') { this.toasts.push({ msg, t, max: t, kind }); },

    gainXP(n) {
      if (GV.legacy) n *= GV.legacy.xpMul();
      if (this.coop) for (const P2 of this.players.slice(1)) {
        if (P2.holo || !P2.slot) continue;
        const up = GV.save.as(P2.slot, (d2) => {
          d2.xp += Math.round(n); let u = false;
          while (d2.xp >= GV.progress.xpNeed(d2.level)) { d2.xp -= GV.progress.xpNeed(d2.level); d2.level++; u = true; }
          GV.inv.addXp(n, P2.slot);
          return u ? d2.level : 0;
        });
        if (up) { P2.recalc(); if (!P2.dead) P2.hp = P2.maxHp; this.toast(`P${P2.slot + 1} · RANK ${up}`, 1.8, 'small'); this.burst(P2.cx, P2.cy, 30, this.pal.glow, 220, 0.8, 3); }
      }
      const P1 = (this.players || [this.player])[0];
      const d = GV.save.data;
      d.xp += Math.round(n);
      let up = false; const was = d.level;
      while (d.xp >= GV.progress.xpNeed(d.level)) { d.xp -= GV.progress.xpNeed(d.level); d.level++; up = true; }
      if (up) {
        P1.recalc();
        P1.hp = P1.maxHp;
        if (GV.rankUp) GV.rankUp(this, was, d.level);
        else { this.toast(`${this.coop ? 'P1 · ' : ''}RANK ${d.level}`, 2.2); this.toasts[this.toasts.length - 1].sub = '+1 passive point · T to open the tree'; }
        this.sfx('level');
        this.burst(P1.cx, P1.cy, 40, this.pal.glow, 260, 0.9, 3);
      }
      const ups = GV.inv.addXp(n);
      if (ups.length) {
        for (const g of ups) this.toast(`${GV.GEMS[g.id].name} reached level ${g.lvl}`, 2, 'small');
        P1.recalc();
      }
    },
    gainMem(n) { (GV.save.main || GV.save.data).memories += n; this.memGot += n; GV.quests.emit('mem', n); },

    damageEnemy(e, dmg, kx, ky, crit, type) {
      if (e.dead) return;
      if (e.dr) dmg *= 1 - e.dr;
      if (e.def.shield && kx && Math.sign(kx) === -e.dir) { dmg *= 0.2; if (Math.random() < 0.3) this.text(e.x + e.w / 2, e.y - 18, 'SHIELDED', '#9fe8ff', 12); }
      e.hp -= dmg; e.flash = 0.1;
      if (!e.boss && (kx || ky)) {
        const k = e.def.heavy ? 0.3 : 1;
        e.vx = kx * k; if (ky) e.vy = ky * k;
        e.knockT = 0.16;
      }
      const col = crit ? '#ffd36b' : GV.DMG_COLORS[type] || '#fff';
      if (GV.settings.data.numbers) this.text(e.x + e.w / 2 + (Math.random() - 0.5) * 16, e.y - 6, Math.round(dmg) + (crit ? '!' : ''), col, crit ? 19 : 14);
      this.burst(e.x + e.w / 2, e.y + e.h / 2, 5, type && type !== 'phys' ? GV.DMG_COLORS[type] : this.pal.accent, 220, 0.35, 2.5);
      this.sfx('hit');
      this.shake(crit ? 4 : 1.5);
      if (e.hp <= 0) this.killEnemy(e);
    },
    killEnemy(e) {
      if (e.dead) return;
      e.dead = true;
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      this.burst(cx, cy, e.boss ? 120 : 20, this.pal.accent, e.boss ? 500 : 260, e.boss ? 1.4 : 0.6, 3.5);
      this.burst(cx, cy, e.boss ? 60 : 8, '#ffffff', e.boss ? 380 : 180, 0.6, 2);
      const sc = 1.3 * (1 + 0.25 * this.diff) * (e.elite ? 3 : 1); // fights last longer now, so each kill is worth a bit more
      this.gainXP((e.def.xp || 5) * sc);
      const pl = this.player, AF = pl.st.asc || {};
      if (GV.codex) { GV.codex.kill(e.type, !!e.elite); for (const l of GV.codex.check()) { this.toast(`Codex: ${l.title}`, 2.6, 'small'); this.toasts[this.toasts.length - 1].color = '#ffd36b'; } }
      if (GV.onKill) GV.onKill(this, e, pl);
      if (AF.bladeDance) { pl.dance = Math.min(5, pl.dance + 1); pl.danceT = 4; }
      if (AF.linger && pl.lingerCd <= 0 && !e.boss) { pl.lingerCd = 3; pl.stealth = Math.max(pl.stealth, 1.2); pl.decoy = { x: pl.x, y: pl.y, w: pl.w, h: pl.h }; }
      if (e.volatile) {
        const vx = cx, vy = cy, dmg = e.dmg * 1.6;
        this.warn({ x: vx - 100, y: vy - 100, w: 200, h: 200, t: 0.6 });
        this.delay(0.6, () => { this.novas.push({ x: vx, y: vy, r: 10, max: 110, t: 0, color: '#ff7a4a' }); this.shake(6); if (Math.hypot(this.player.cx - vx, this.player.cy - vy) < 110) this.damagePlayer(dmg, vx); });
      }
      if (e.splitting) for (const s of [-1, 1]) { const c = this.spawnEnemy(e.type, cx + s * 20, e.y + e.h, true); c.hp = c.maxHp = e.maxHp * 0.12; c.vx = s * 200; }
      if (e.elite) {
        for (let i = 0; i < 6; i++) this.drops.push({ x: cx, y: cy, vx: (Math.random() - 0.5) * 300, vy: -250 - Math.random() * 200, w: 10, h: 10, kind: 'mem', val: 1, age: 0 });
        const Q = GV.legacy ? GV.legacy.qty() : 1;
        if (Math.random() < 0.22 * Q) this.dropItem(cx, cy);
        if (Math.random() < 0.06 * Q) this.dropGem(cx, cy, Math.random() < 0.5 ? 'skill' : 'support');
        if (Math.random() < 0.16 * Q) this.dropCur(cx, cy);
      }
      for (const P of this.players || [pl]) if (!P.dead) P.flaskGain(e.boss ? 3 : e.def.heavy ? 0.5 : 0.2);
      if (pl.herald && !e.boss) GV.Skills.heraldBurst(this, e, pl.herald);
      if (e.bloom) for (const o of this.enemies) if (!o.dead && o !== e && U.circRect(cx, cy, e.bloom.s.radius * 1.4, o)) o.bloom = { dps: e.bloom.dps, t: e.bloom.s.dur, s: e.bloom.s };
      GV.quests.emit('kill', { type: e.type, elite: !!e.elite, boss: !!e.boss });
      if (e.boss) { this.onBossDown(e); return; }
      this.kills++;
      const memF = (e.def.mem || 1) * (1 + pl.st.memFind / 100), memN = Math.floor(memF) + (Math.random() < memF % 1 ? 1 : 0);
      for (let i = 0; i < memN; i++) this.drops.push({ x: cx, y: cy, vx: (Math.random() - 0.5) * 240, vy: -200 - Math.random() * 200, w: 10, h: 10, kind: 'mem', val: 1, age: 0 });
      if (Math.random() < 0.08) this.drops.push({ x: cx, y: cy, vx: 0, vy: -260, w: 12, h: 12, kind: 'hp', val: 0.14, age: 0 });
      const Q = GV.legacy ? GV.legacy.qty() : 1;
      if (Math.random() < (e.def.heavy ? 0.045 : 0.014) * Q * (1 + 0.15 * ((GV.save.data.ship || {}).scanner || 0))) this.dropItem(cx, cy);
      if (Math.random() < (0.005 + this.diff * 0.0008) * Q) this.dropGem(cx, cy, Math.random() < 0.55 ? 'support' : 'skill');
      else if (Math.random() < 0.003 * Q) this.dropOrb(cx, cy);
    },
    dropGem(x, y, kind, tier) {
      this.drops.push({ x, y, vx: (Math.random() - 0.5) * 200, vy: -380, w: 14, h: 14, kind: 'uncut', gk: kind, tier: tier || GV.progress.dropTier(this.diff), age: 0 });
    },
    dropItem(x, y, opts) {
      const it = GV.items.roll(GV.progress.dropTier(this.diff), opts);
      this.drops.push({ x, y, vx: (Math.random() - 0.5) * 220, vy: -400, w: 14, h: 14, kind: 'item', item: it, age: 0 });
    },
    dropCur(x, y) {
      const ks = ['alch', 'alch', 'alch', 'chaos', 'chaos', 'annul', 'divine', 'exalt'];
      this.drops.push({ x, y, vx: (Math.random() - 0.5) * 220, vy: -380, w: 12, h: 12, kind: 'cur', cur: ks[Math.floor(Math.random() * ks.length)], age: 0 });
    },
    dropOrb(x, y) { this.drops.push({ x, y, vx: (Math.random() - 0.5) * 200, vy: -380, w: 14, h: 14, kind: 'orb', age: 0 }); },
    damageRift(rf, dmg) {
      if (rf.dead) return;
      rf.hp -= dmg; rf.flash = 0.1;
      this.burst(rf.x + rf.w / 2, rf.y + rf.h / 2, 5, this.pal.accent, 200, 0.4, 2.5);
      this.sfx('hit');
      if (rf.hp <= 0) {
        rf.dead = true;
        this.burst(rf.x + rf.w / 2, rf.y + rf.h / 2, 50, this.pal.accent, 340, 0.9, 3.5);
        this.shake(6); this.sfx('slam');
        this.text(rf.x + rf.w / 2, rf.y - 10, 'RIFT SEALED', this.pal.glow, 16);
        this.gainXP(12 * (1 + 0.25 * this.diff));
        for (let i = 0; i < 3; i++) this.drops.push({ x: rf.x + rf.w / 2, y: rf.y + 30, vx: (Math.random() - 0.5) * 260, vy: -260, w: 10, h: 10, kind: 'mem', val: 1, age: 0 });
        const Q = GV.legacy ? GV.legacy.qty() : 1;
        if (Math.random() < 0.09 * Q) this.dropGem(rf.x + rf.w / 2, rf.y + 30, Math.random() < 0.5 ? 'support' : 'skill');
        if (Math.random() < 0.07 * Q) this.dropItem(rf.x + rf.w / 2, rf.y + 30);
      }
    },

    // Incoming damage: evade → block → armour → keystones → void ward → life.
    damagePlayer(dmg, fromX, force, unavoidable) {
      const pl = this.player, st = pl && pl.st;
      if (!st || (!force && pl.inv > 0) || pl.dead || this.state === 'clear') return;
      dmg = Math.max(1, dmg);
      if (!force && !unavoidable) {
        if (Math.random() * 100 < st.evasion) { this.text(pl.cx, pl.y - 8, 'EVADE', '#7dffcf', 14); pl.inv = 0.25; return; }
        if (Math.random() * 100 < st.block) {
          if (st.asc.retaliate) GV.Skills.raw(this, pl.cx, pl.cy, 115, { phys: pl.weapon.dmg * 2.2 * (1 + (st.inc.all + st.inc.melee) / 100) }, { color: '#ffd36b' });
          if (GV.onBlock) GV.onBlock(this, pl);
          this.text(pl.cx, pl.y - 8, 'BLOCK', '#ffd36b', 14); pl.inv = 0.3; this.burst(pl.cx + pl.facing * 14, pl.cy, 10, '#ffd36b', 160, 0.3, 2.5); this.sfx('hit'); return; }
      }
      if (this.boss) this.bossHurt = true;
      if (st.armour > 0) dmg *= 1 - Math.min(0.75, st.armour / (st.armour + 6 * dmg));
      if (st.ks.unbroken) dmg *= 0.75;
      if (pl.guardT > 0) dmg *= 0.85;
      if (st.asc.lastStand && pl.hp < pl.maxHp * 0.35) dmg *= 0.7;
      if (GV.dmgTakenMul) dmg *= GV.dmgTakenMul(this, pl);
      dmg = Math.round(dmg);
      pl.wardDelay = 2;
      if (pl.ward > 0) { const ab = Math.min(pl.ward, dmg); pl.ward -= ab; dmg -= ab; }
      pl.hp -= dmg; pl.inv = GV.CFG.INVULN; pl.hurtT = 0.2;
      pl.channel = null;
      const dir = Math.sign(pl.cx - fromX) || -pl.facing;
      if (!st.asc.noKnock) { pl.vx = dir * 340; pl.vy = -420; }
      pl.dashT = 0;
      if (st.asc.martyr && Math.random() < 0.25) GV.Skills.raw(this, pl.cx, pl.cy, 155, { fire: pl.maxHp * 0.45 * (1 + (st.inc.all + st.inc.fire + st.inc.spell) / 100) }, { color: '#ffd36b' });
      this.shake(7); this.sfx('hurt'); this.buzz(30);
      this.text(pl.cx, pl.y - 8, '-' + Math.max(0, dmg), this.pal.accent, 16);
      this.burst(pl.cx, pl.cy, 12, this.pal.accent, 220, 0.5, 3);
      if (pl.hp <= 0 && this.coop && this.players.some((o) => o !== pl && !o.dead)) {
        pl.hp = 0; pl.dead = true; pl.down = true; pl.reviveT = 0;
        if (pl.y > this.L.killY - 40) { pl.x = pl.lastSafe.x; pl.y = pl.lastSafe.y; }
        pl.vx = 0; pl.vy = 0;
        this.burst(pl.cx, pl.cy, 40, this.pal.glow, 300, 1, 3);
        this.sfx('die');
        this.toast(`P${pl.slot + 1} is down · stand by them to revive`, 2.6, 'small');
      } else if (pl.hp <= 0) {
        pl.hp = 0; pl.dead = true; this.state = 'dead';
        this.burst(pl.cx, pl.cy, 80, this.pal.glow, 360, 1.3, 3.5);
        this.sfx('die'); this.buzz(200);
        this.deathT = 1.1;
      }
    },

    updateProjs(dt) {
      const pl = this.player;
      for (const pr of this.projs) {
        pr.life -= dt; pr.t += dt;
        if (pr.grav) pr.vy += pr.grav * dt;
        const ox = pr.x, oy = pr.y;
        pr.x += pr.vx * dt; pr.y += pr.vy * dt;
        if (pr.kind === 'spark' && Math.random() < dt * 4) pr.vx *= -0.3 + Math.random() * 1.6;
        if (pr.friendly) {
          for (const e of this.enemies) {
            if (pr.life <= 0) break;
            if (e.dead || (e.alpha != null && e.alpha < 0.4)) continue;
            if (pr.kind === 'spark') { const nx = pr.rehit.get(e) || 0; if (this.t < nx) continue; }
            else if (pr.hit.has(e)) continue;
            if (U.circRect(pr.x, pr.y, pr.r, e)) {
              if (pr.kind === 'spark') pr.rehit.set(e, this.t + 0.45);
              GV.Skills.projHit(this, pr, e);
            }
          }
          for (const rf of this.L.rifts) if (!rf.dead && !pr.hit.has(rf) && U.circRect(pr.x, pr.y, pr.r, rf)) { pr.hit.add(rf); this.damageRift(rf, pr.s.total * ((pr.o && pr.o.mult) || 1) * (pr.mult || 1)); }
        } else if (pr.hostile) {
          for (const P of this.players || [pl]) {
            if (P.dead || pr.life <= 0) continue;
            const hb = { x: P.x + 3, y: P.y + 4, w: P.w - 6, h: P.h - 6 };
            if (U.circRect(pr.x, pr.y, pr.r, hb)) { this.player = P; this.damagePlayer(pr.dmg, pr.x); if (P.inv > 0) pr.life = 0; }
          }
          this.player = pl;
        }
        if (pr.life > 0 && !pr.ghost) {
          let hit = null;
          if (!this.grid) this.buildGrid();
          for (const s of this.near(pr.x - 1, pr.x + 1, false)) if (pr.x > s.x && pr.x < s.x + s.w && pr.y > s.y && pr.y < s.y + s.h) { hit = s; break; }
          if (hit) {
            if (pr.kind === 'spark' || pr.bounce > 0) {
              if (pr.kind !== 'spark') { pr.bounce--; pr.hit = new Set(); if (oy <= hit.y || oy >= hit.y + hit.h) { pr.y = oy; pr.vy = -pr.vy; } else { pr.x = ox; pr.vx = -pr.vx; } } else
              if (oy <= hit.y || oy >= hit.y + hit.h) { pr.y = oy; pr.vy = -Math.abs(pr.vy) * 0.8 - 120; } else { pr.x = ox; pr.vx = -pr.vx; }
            } else { pr.life = 0; this.burst(pr.x, pr.y, 5, pr.friendly ? (pr.color || this.pal.glow) : this.pal.accent, 120, 0.3, 2); }
          }
        }
      }
      this.projs = this.projs.filter((p) => p.life > 0);
    },

    updateDrops(dt) {
      const pl = this.player, d = GV.save.data;
      for (const dr of this.drops) {
        dr.age += dt;
        const dx = pl.cx - (dr.x + 5), dy = pl.cy - (dr.y + 5), dist = Math.hypot(dx, dy) || 1;
        if (dr.age > 0.45 && (dist < 150 || dr.age > 2.5) && !pl.dead) {
          const sp = 520 + dr.age * 200;
          dr.x += (dx / dist) * sp * dt; dr.y += (dy / dist) * sp * dt;
        } else {
          dr.vy = Math.min(900, dr.vy + 1600 * dt);
          dr.vx *= Math.max(0, 1 - dt * 2);
          this.moveBody(dr, dt);
        }
        if (dist < 22 && !pl.dead) {
          dr.got = true;
          if (dr.kind === 'mem') { this.gainMem(dr.val); this.sfx('mem'); }
          else if (dr.kind === 'hp') { pl.heal(pl.maxHp * dr.val); this.text(pl.cx, pl.y - 10, '+LIFE', '#9fffd8', 14); this.sfx('heal'); }
          else if (dr.kind === 'uncut') {
            d.uncut.push({ kind: dr.gk, tier: dr.tier });
            this.toast(`${GV.TERMS.blank(dr.gk)} (Tier ${dr.tier}) · G to format`, 2.4, 'small');
            this.sfx('level'); GV.save.write();
          } else if (dr.kind === 'item') {
            const it = dr.item, ok = GV.items.add(it);
            this.toast(ok ? `${it.name} · ${GV.SLOTS[it.slot].name} (B to equip)` : `Inventory full: ${it.name} salvaged`, 2.4, 'small');
            this.toasts[this.toasts.length - 1].color = GV.items.color(it);
            this.sfx('level'); GV.save.write();
          } else if (dr.kind === 'cur') {
            d.cur[dr.cur] = (d.cur[dr.cur] || 0) + 1;
            const c = GV.CURRENCY[dr.cur];
            this.toast(`${c.name} · crafting currency (B → item → Craft)`, 2.2, 'small');
            this.toasts[this.toasts.length - 1].color = c.color;
            this.sfx('mem'); GV.save.write();
          } else if (dr.kind === 'orb') {
            d.orbs++;
            this.toast(`${GV.TERMS.orb} · adds an augment port (G)`, 2.4, 'small');
            this.sfx('level'); GV.save.write();
          }
        }
        if (dr.y > this.L.killY) dr.got = true;
      }
      this.drops = this.drops.filter((x) => !x.got);
    },

    drawProjs(ctx) {
      for (const pr of this.projs) {
        const c = pr.color || (pr.friendly ? this.pal.glow : this.pal.accent);
        if (pr.kind === 'wave') {
          A.glow(ctx, pr.x, pr.y, 30, pr.friendly ? 'rgba(255,190,110,0.55)' : A.col(this.pal.hB, 100, 55, 0.55));
          ctx.fillStyle = pr.friendly ? c : this.pal.accent;
          ctx.beginPath(); ctx.moveTo(pr.x - 10, pr.y + 12); ctx.lineTo(pr.x, pr.y - 14 - Math.sin(pr.t * 30) * 3); ctx.lineTo(pr.x + 10, pr.y + 12); ctx.fill();
        } else if (pr.kind === 'pulse') {
          // a fist's graviton pulse: a crescent that swells and fades almost at once
          const k = Math.max(0, pr.life / (pr.max || 0.14)), a = Math.atan2(pr.vy, pr.vx), rr = pr.r * (1.6 - k * 0.6);
          ctx.save(); ctx.globalAlpha = k; ctx.globalCompositeOperation = 'lighter';
          A.glow(ctx, pr.x, pr.y, rr * 2.4, c);
          ctx.strokeStyle = c; ctx.lineWidth = 3 + 3 * k; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(pr.x - Math.cos(a) * rr * 0.6, pr.y - Math.sin(a) * rr * 0.6, rr, a - 1.1, a + 1.1); ctx.stroke();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.restore();
        } else if (pr.friendly) {
          A.glow(ctx, pr.x, pr.y, pr.r * 3.4, c);
          ctx.fillStyle = '#fff';
          if (pr.kind === 'spark') A.star(ctx, pr.x, pr.y, pr.r, 4, pr.t * 20);
          else { const a = Math.atan2(pr.vy, pr.vx); A.ellipse(ctx, pr.x, pr.y, pr.r * 1.8, pr.r * 0.45, a); }
        } else {
          A.glow(ctx, pr.x, pr.y, pr.r * 3, A.col(this.pal.hB, 100, 55, 0.6));
          ctx.fillStyle = '#fff'; A.circle(ctx, pr.x, pr.y, pr.r * 0.55);
        }
      }
    },
  };
})();
