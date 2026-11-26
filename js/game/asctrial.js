// Galactic Void — the Ascension Trials. The Ascendancy is earned in a sealed arena: three waves
// (a horde, an elite horde, a gauntlet of champions) and then an Ascendant boss: far more Life,
// harder hits, reinforcements through the fight and a frenzy below half Life. Trial I lets your
// class choose its path (4 points); each later trial, opened by clearing later systems, adds 2.
(function () {
  const GV = window.GV, U = GV.util;
  const d = () => GV.save.data;
  const TRIALS = [
    { n: 1, name: 'Trial of the Threshold', boss: 'warden', bossName: 'Ascendant Warden', sysOff: 0, color: '#ffd36b' },
    { n: 2, name: 'Trial of Embers', boss: 'choir', bossName: 'Ascendant Choir', sysOff: 1, color: '#ff9a4a' },
    { n: 3, name: 'Trial of the Deep', boss: 'leviathan', bossName: 'Ascendant Leviathan', sysOff: 2, color: '#6fd3ff' },
    { n: 4, name: 'Trial of the Last Light', boss: 'sentinel', bossName: 'Ascendant Sentinel', sysOff: 3, color: '#ff6a9a' },
  ];
  const waves = (n) => [
    { name: 'The Horde', count: 22 + 4 * n, every: 0.32, elite: 0.06 },
    { name: 'Elite Horde', count: 16 + 3 * n, every: 0.45, elite: 0.38 },
    { name: 'The Gauntlet', count: 12 + 2 * n, every: 0.55, elite: 0.2, champions: 1 + Math.ceil(n / 2) },
    { name: 'Ascendant', boss: true },
  ];

  const AT = (GV.ascTrials = {
    TRIALS,
    done() { const D = d(); return Math.max(D.ascTrials || 0, D.asc && D.asc.sub ? 1 : 0); },
    // Why trial n can't be started yet (null = it can).
    locked(n) {
      const A = GV.asc, D = d();
      if (n === 1) return A.reqMet() ? null : A.reqText();
      if (this.done() < n - 1) return `Complete Trial ${['', 'I', 'II', 'III'][n - 1]} first.`;
      const s = A.REQ_SYS + n - 1;
      return D.cleared[`${s}-2`] ? null : `Clear ${GV.UNIVERSE.system(s).name} to open it.`;
    },
    sysFor(n) { return Math.min(GV.progress.frontier(), GV.asc.REQ_SYS + TRIALS[n - 1].sysOff); },
    start(n) {
      if (this.locked(n)) return false;
      const G = GV.game;
      G.startTrial(this.sysFor(n), {}, false);
      const p = G.play, T = p.trial;
      T.asc = { n, step: -1, won: false };
      T.restT = 3.2;
      p.toast(TRIALS[n - 1].name, 3); p.toasts[p.toasts.length - 1].sub = 'Three waves, then an Ascendant';
      return true;
    },
  });

  // ---------------- Ascendancy points come from the trials ----------------
  addEventListener('load', () => {
    const A = GV.asc;
    A.unlocked = function () { return !!d().cls && AT.done() >= 1; };
    A.total = function () { const k = AT.done(); return k ? Math.min(this.CAP, 4 + 2 * (k - 1)) : 0; };
  });

  // ---------------- the fight ----------------
  const P = GV.Play.prototype;
  const upd0 = P.updateTrial;
  P.updateTrial = function (dt) {
    const T = this.trial;
    if (!T.asc) return upd0.call(this, dt);
    const S = T.asc, plan = waves(S.n), pl = this.player;
    if (S.won) return;
    if (T.restT > 0) {
      T.restT -= dt;
      if (T.restT <= 0) {
        S.step++;
        const w = plan[S.step];
        this.diff = T.baseDiff + S.step;
        if (w.boss) {
          const t = TRIALS[S.n - 1];
          this.sd.boss = t.boss; this.sd.bossName = t.bossName;
          const b = this.spawnBoss();
          b.hp = b.maxHp = b.maxHp * (2 + 0.25 * S.n); b.dmg *= 1.3 + 0.05 * S.n; b.haste = 1.12; b.ascendant = true;
          S.addT = 8; S.fury = false;
          this.shake(14); this.sfx('boss');
        } else {
          T.left = w.count; T.spawnT = 0.4; S.champs = w.champions || 0;
          this.toast(`Wave ${S.step + 1} · ${w.name}`, 2);
        }
      }
      return;
    }
    const w = plan[S.step];
    if (!w) return;
    if (w.boss) {
      const b = this.boss;
      if (b && !b.dead) {
        S.addT -= dt;
        if (!S.fury && b.hp < b.maxHp * 0.5) {
          S.fury = true; b.haste = 1.35;
          this.toast('ASCENDANT FURY', 2); this.shake(12); this.sfx('boss');
          this.novas.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, r: 20, max: 320, t: 0, color: TRIALS[S.n - 1].color });
        }
        if (S.addT <= 0 && this.liveCount() < this.cap() + 4) {
          S.addT = S.fury ? 6 : 9;
          for (let i = 0; i < 3 + S.n; i++) this.ascSpawn(i < 1 && S.fury ? 1 : 0.15);
        }
      } else if (!this.enemies.some((e) => !e.dead)) {
        S.won = true;
        this.ascWin(S.n);
      }
      return;
    }
    if (T.left > 0) {
      T.spawnT -= dt;
      if (T.spawnT <= 0 && this.liveCount() < this.cap() + 6) {
        T.left--; T.spawnT = w.every;
        const champ = S.champs > 0 && T.left % Math.max(2, Math.floor(w.count / (w.champions + 1))) === 0;
        if (champ) S.champs--;
        this.ascSpawn(w.elite, champ);
      }
    } else if (!this.enemies.some((e) => !e.dead)) {
      this.gainMem(6 + 4 * S.n);
      pl.flaskGain(1.5);
      this.toast(`Wave ${S.step + 1} cleared`, 1.6, 'small');
      T.restT = 3.4;
    }
  };
  P.ascSpawn = function (eliteChance, champion) {
    const pt = this.L.portals[Math.floor(Math.random() * this.L.portals.length)];
    const type = champion ? (Math.random() < 0.5 ? 'brute' : U.weighted(Math.random, this.sd.pool)) : U.weighted(Math.random, this.sd.pool);
    const fly = GV.ENEMIES[type] && GV.ENEMIES[type].fly;
    const gx = pt.y < this.arena.floorY - 200 && !fly ? pt.x + 22 + (Math.random() - 0.5) * 200 : pt.x + 22;
    const e = this.spawnEnemy(type, gx, fly ? pt.y : pt.y < this.arena.floorY - 200 ? pt.y + 140 : this.arena.floorY, true);
    if (e && (champion || Math.random() < eliteChance) && GV.makeElite) GV.makeElite(e, this.diff);
    if (e && champion) { e.hp = e.maxHp = e.maxHp * 3; e.dmg *= 1.25; e.champion = true; this.text(e.x + e.w / 2, e.y - 20, 'CHAMPION', '#ff9a4a', 15); }
    pt.pulse = 0.4; this.sfx('rift');
    return e;
  };
  P.ascWin = function (n) {
    const D = d(), first = (D.ascTrials || 0) < n, t = TRIALS[n - 1];
    D.ascTrials = Math.max(D.ascTrials || 0, n);
    const mem = (first ? 150 : 40) * n;
    (GV.save.main || D).memories += mem;
    if (first) D.uncut.push({ kind: 'skill', tier: 3 }, { kind: 'support', tier: 3 });
    GV.save.write(); GV.ach && GV.ach.check && GV.ach.check();
    this.toast('TRIAL COMPLETE', 3); this.sfx('level');
    const G = GV.game;
    setTimeout(() => {
      if (G.play !== this) return;
      G.paused = true; G.setPlaying(false);
      GV.menus.ascTrialWin({ n, first, mem, name: t.name, color: t.color });
    }, 1800);
  };
  // Endless Rift Trial bookkeeping doesn't apply to an Ascension Trial.
  const end0 = P.endTrial;
  P.endTrial = function () {
    const T = this.trial;
    if (!T.asc) return end0.call(this);
    return { asc: true, n: T.asc.n, step: T.asc.step, kills: this.kills };
  };

  // ---------------- screens ----------------
  addEventListener('load', () => {
    const M = GV.menus, esc = (s) => M.esc(s), roman = ['', 'I', 'II', 'III', 'IV'];
    const tEnd0 = M.trialEnd;
    M.trialEnd = function (r) {
      if (!r || !r.asc) return tEnd0.call(this, r);
      const t = TRIALS[r.n - 1], plan = waves(r.n);
      M.render(`<div class="screen panel narrow clear ascfail" style="--c:${t.color}"><h2>Trial Failed</h2>
        <div class="sub">${esc(t.name)} · fell at ${r.step >= 0 ? esc(plan[Math.min(r.step, 3)].name) : 'the gate'}</div>
        <div class="how"><div><b>Foes destroyed</b><span>${r.kills}</span></div></div>
        <p>Everything you picked up is yours to keep. The trial is waiting when you're ready.</p>
        <div class="menu"><button class="primary" data-a="retry">Try again</button><button data-a="home">Back to the Lantern</button></div></div>`, (a) => {
        if (a === 'retry') { AT.start(r.n); return; }
        if (a === 'home') GV.game.home();
      }, () => GV.game.home());
    };
    M.ascTrialWin = function (r) {
      const A = GV.asc;
      M.render(`<div class="screen panel narrow clear ascwin" style="--c:${r.color}"><h2>Trial ${roman[r.n]} Complete</h2>
        <div class="sub">${esc(r.name)}</div>
        <div class="how">
          <div><b>${r.n === 1 ? 'Ascendancy' : 'Ascendancy points'}</b><span>${r.first ? (r.n === 1 ? 'Unlocked · 4 points' : '+2') : 'Already earned'}</span></div>
          <div><b>Memories</b><span>✦ ${r.mem}</span></div>
          ${r.first ? '<div><b>Spoils</b><span>Tier 3 blank Star Core and Augment</span></div>' : ''}
        </div>
        <div class="menu">${r.first ? `<button class="primary" data-a="asc">${r.n === 1 && !A.current() ? 'Choose your path' : 'Spend your points'}</button>` : ''}<button data-a="home">Back to the Lantern</button></div></div>`, (a) => {
        if (a === 'asc') { GV.game.home(); setTimeout(() => GV.ascendView.open('map'), 400); }
        if (a === 'home') GV.game.home();
      }, () => GV.game.home());
    };
    // The altar's trial board.
    M.ascTrials = function (back) {
      const D = d(), k = AT.done();
      const rows = TRIALS.map((t) => {
        const lock = AT.locked(t.n), done = k >= t.n, plan = waves(t.n);
        return `<div class="atrial ${done ? 'done' : lock ? 'lock' : 'open'}" style="--c:${t.color}">
          <div class="atn"><i></i><span>${roman[t.n]}</span></div>
          <div class="atb"><b>${esc(t.name)}</b><small>${plan.slice(0, 3).map((w) => esc(w.name)).join(' → ')} → ${esc(t.bossName)}</small>
            <em>${done ? '✓ Completed · replay any time for memories' : lock ? esc(lock) : t.n === 1 ? 'Reward: your Ascendancy and 4 points' : 'Reward: +2 Ascendancy points'}</em></div>
          <button class="${done ? '' : 'primary'}" data-a="go" data-n="${t.n}" ${lock ? 'disabled' : ''}>${done ? 'Replay' : 'Enter'}</button></div>`;
      }).join('');
      M.render(`<div class="screen panel wide asctrials"><h2>Ascension Trials</h2>
        <p>Your path is earned in the arena. Each trial seals you in for three waves (a horde, an elite horde, a gauntlet of champions) and then an Ascendant: a boss with far more Life that calls reinforcements and turns frenzied at half Life.</p>
        <div class="atlist">${rows}</div>
        <div class="menu row">${GV.asc.unlocked() ? '<button data-a="tree">Ascendancy tree</button>' : ''}<button class="ghost" data-a="back">Back</button></div></div>`, (a, b) => {
        if (a === 'go') { if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again to enter'; return; } AT.start(+b.dataset.n); }
        if (a === 'tree') GV.ascendView.open('map');
        if (a === 'back') (back || (() => GV.game.resume ? GV.game.resume() : M.map()))();
      }, () => (back || (() => GV.game.resume()))());
    };
  });
})();
