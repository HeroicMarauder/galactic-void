// Galactic Void — boot, scene flow, phone handling and the main loop.
(function () {
  const GV = window.GV, C = GV.CFG, I = GV.input;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  let scale = 1, dpr = 1;
  // Adaptive resolution: when frames run long, render at a lower internal resolution (down to 55%);
  // when there's headroom again, step back up. Particle and glow budgets shrink with it.
  const perf = (GV.perf = { scale: 1, ema: 0, slowT: 0, fastT: 0, lowFx: false });

  // The logical view is always 540 tall. On wide phones it widens (up to 1280) so the game
  // fills the screen instead of letterboxing. Small screens get a larger HUD.
  function resize() {
    const vw = innerWidth, vh = innerHeight;
    C.W = Math.round(Math.max(960, Math.min(1280, (C.H * vw) / vh)));
    scale = Math.min(vw / C.W, vh / C.H);
    const touch = I.isTouch || document.body.classList.contains('touch');
    const saver = GV.settings.saver();
    dpr = Math.min(saver ? 1 : touch ? 1.5 : 2, window.devicePixelRatio || 1) * perf.scale;
    C.HUD = touch ? Math.max(1, Math.min(1.45, 0.92 / scale)) : 1;
    C.MAX_PARTS = Math.round((saver ? 140 : touch ? 280 : 600) * (perf.scale < 0.8 ? 0.6 : 1));
    C.LOWFX = saver || perf.scale < 0.8;
    canvas.style.width = Math.floor(C.W * scale) + 'px';
    canvas.style.height = Math.floor(C.H * scale) + 'px';
    canvas.width = Math.round(C.W * scale * dpr);
    canvas.height = Math.round(C.H * scale * dpr);
    document.body.classList.toggle('portrait', vh > vw);
  }
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 120));

  const G = (GV.game = {
    resize,
    scene: 'title', play: null, paused: false, t: 0, shipT: 0,
    setPlaying(on) { document.body.classList.toggle('playing', on); I.inMenu = !on; },
    startStage(s, t) {
      if (GV.save.needsClass()) { GV.menus.classSelect(); return; }
      GV.menus.hide(); I.clear();
      this.play = new GV.Play(s, t);
      this.scene = 'play'; this.paused = false;
      this.setPlaying(true);
    },
    startTrial(sys, curses, daily) {
      if (GV.save.needsClass()) { GV.menus.classSelect(); return; }
      GV.menus.hide(); I.clear();
      this.play = new GV.Play(sys, 0, 'trial');
      this.play.trial.curses = curses || {};
      if (daily) { this.play.trial.daily = GV.daily.today(); this.play.toast('Daily Rift', 2.4); this.play.toasts[this.play.toasts.length - 1].sub = GV.daily.today(); }
      this.scene = 'play'; this.paused = false;
      this.setPlaying(true);
    },
    // A Titan Gate: its own arena, the Titan's words the first time, then the fight.
    startTitan(sys) {
      if (GV.save.needsClass()) { GV.menus.classSelect(); return; }
      GV.menus.hide(); I.clear();
      const id = GV.titanFor(sys);
      this.play = new GV.Play(sys, 0, 'titan');
      this.play.titanSetup(id);
      const d = GV.save.main || GV.save.data; d.titanTalk = d.titanTalk || {};
      if (!d.titanTalk[id]) { d.titanTalk[id] = true; this.play.pendingDialog = { name: GV.TITANS[id].name.toUpperCase(), lines: GV.TITANS[id].talk, color: GV.TITANS[id].color }; this.play.dialogT = 1.4; GV.save.write(); }
      this.scene = 'play'; this.paused = false;
      this.setPlaying(true);
    },
    // Restart whatever you're in: the ship, a stage, a trial, a Titan or a depth, with the same settings.
    restartRun() {
      const p = this.play; if (!p) return;
      if (GV.net && GV.net.role === 'guest') { this.resume(); p.toast('Only the host can restart', 1.6, 'small'); return; }
      if (p.L && p.L.hall) return this.startHall ? this.startHall() : this.toMap();
      if (p.depth && GV.startDepths) return GV.startDepths(p.depth.n, p.depth.seed);
      if (p.hunt && GV.startHunt) return GV.startHunt();
      if (p.titanMode) return this.startTitan(p.sysIdx);
      if (p.trial) return this.startTrial(p.sysIdx, p.trial.curses, !!p.trial.daily);
      if (p.stIdx >= 0) return this.startStage(p.sysIdx, p.stIdx);
      return this.toMap();
    },
    pause() {
      if (this.scene !== 'play' || this.paused || !this.play) return;
      if (this.play.state === 'dead' || this.play.state === 'clear') return;
      this.paused = true; this.setPlaying(false); I.clear();
      GV.menus.show('pause');
    },
    pauseInto(view) {
      if (this.scene !== 'play' || this.paused || !this.play || this.play.dialog) return;
      this.paused = true; this.setPlaying(false); I.clear();
      view.open('play');
    },
    resume() {
      if (!this.play) return;
      this.paused = false; GV.menus.hide(); I.clear(); this.setPlaying(true);
      this.play.player.recalc();
    },
    leavePlay() { this.play = null; this.paused = false; this.setPlaying(false); GV.save.write(); },
    toMap(sel) { this.leavePlay(); this.scene = 'map'; GV.menus.show('map', { sel }); },
    toTitle() { this.leavePlay(); this.scene = 'title'; GV.menus.show('title'); },
    openShop(from) {
      if (from === 'play') { this.paused = true; this.setPlaying(false); I.clear(); }
      GV.menus.show('shop', { from });
    },
    closeShop(from) { if (from === 'play') this.resume(); else GV.menus.show('map'); },
    fullscreen() {
      const el = document.documentElement;
      try {
        const p = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen && el.webkitRequestFullscreen();
        if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
      } catch (e) {}
    },
  });

  // ---- touch skill buttons show the equipped gems and their cooldowns ----
  const tBtns = ['attack', 'skill1', 'skill2', 'skill3'].map((a) => document.querySelector(`#touch [data-act="${a}"]`));
  const tCd = [-1, -1, -1, -1];
  GV.touchUI = {
    refresh(pl) {
      tBtns.forEach((b, i) => {
        if (!b) return;
        const s = pl.skills[i];
        const key = s ? s.id + ':' + s.color : '';
        if (b.dataset.k === key) return;
        b.dataset.k = key;
        b.innerHTML = s ? `<span class="ic" style="color:${s.color}">${s.icon}</span><span class="cdm"></span>` : '<span class="ic dim">·</span>';
        b.classList.toggle('empty', !s);
        tCd[i] = -1;
      });
    },
    tick(pl) {
      tBtns.forEach((b, i) => {
        const s = pl.skills[i];
        if (!b || !s) return;
        const k = s.cd ? Math.max(0, Math.min(1, pl.cd[i] / s.cd)) : 0;
        const q = Math.round(k * 20);
        if (q !== tCd[i]) { tCd[i] = q; b.style.setProperty('--cd', k); }
        const afford = pl.st.ks.bloodrite ? pl.hp > s.cost : pl.charge >= s.cost;
        b.classList.toggle('low', !afford && s.kind !== 'herald');
        b.classList.toggle('hon', s.kind === 'herald' && !!pl.herald);
      });
    },
  };

  canvas.addEventListener('pointerdown', () => { GV.audio.unlock(); I.tap(); });
  document.getElementById('pauseBtn').addEventListener('click', () => { GV.audio.unlock(); G.pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) G.pause(); });

  let last = performance.now(), fpsN = 0, fpsT = 0, fps = 60, musicN = 0;
  function frame(now) {
    // Battery Saver runs the game at ~30 fps: skip every other display frame.
    if (GV.settings.saver() && now - last < 30) { requestAnimationFrame(frame); return; }
    const dt = Math.min(1 / 20, Math.max(0, (now - last) / 1000));
    last = now;
    fpsN++; fpsT += dt;
    if (GV.settings.data.adaptive !== false && G.scene === 'play' && !G.paused && dt > 0) {
      const target = GV.settings.saver() ? 1 / 30 : 1 / 60;
      perf.ema = perf.ema ? perf.ema * 0.92 + dt * 0.08 : dt;
      if (perf.ema > target * 1.35) { perf.slowT += dt; perf.fastT = 0; } else if (perf.ema < target * 1.08) { perf.fastT += dt; perf.slowT = 0; } else { perf.slowT = 0; perf.fastT = 0; }
      if (perf.slowT > 2 && perf.scale > 0.56) { perf.scale = Math.max(0.55, perf.scale - 0.15); perf.slowT = 0; resize(); }
      if (perf.fastT > 8 && perf.scale < 1) { perf.scale = Math.min(1, perf.scale + 0.15); perf.fastT = 0; resize(); }
    }
    if (fpsT >= 0.5) { fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; }
    G.t += dt;
    I.pollPad(dt);
    {
      const inPlay = G.scene === 'play' && G.play;
      const mode = inPlay ? (G.play.boss && !G.play.boss.dead ? 'boss' : 'stage') : 'menu';
      if (inPlay && !G.play._mid) G.play._mid = ++musicN;
      const own = GV.soundtrack.update(dt, mode, inPlay ? G.play._mid : 'menu');
      GV.music.set(own ? null : mode, inPlay ? G.play.sysIdx + 1 : 0);
      if (I.pressed('skip')) GV.soundtrack.skip();
    }
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    try {
      if (G.scene === 'play' && G.play) {
        const p = G.play;
        const portraitHold = I.isTouch && document.body.classList.contains('portrait');
        if (!G.paused && !portraitHold) {
          if (I.pressed('pause') && !p.dialog) G.pause();
          else if (I.pressed('tree')) G.pauseInto(GV.treeView);
          else if (I.pressed('gems')) G.pauseInto(GV.gemView);
          else if (I.pressed('gear')) G.pauseInto(GV.gearView);
          else if (I.pressed('ascend')) G.pauseInto(GV.ascendView);
          else if (I.pressed('codex')) G.pauseInto(GV.codexView);
          else p.update(dt);
        }
        if (G.play) {
          G.play.draw(ctx);
          if (I.isTouch) GV.touchUI.tick(G.play.player);
          if (p.pendingDeath && !p.deathShown) { p.deathShown = true; G.paused = true; G.setPlaying(false); if (p.trial) GV.menus.show('trialEnd', p.endTrial()); else GV.menus.show('dead'); }
          if (p.pendingClear) {
            const info = p.pendingClear; p.pendingClear = null;
            G.paused = true; G.setPlaying(false);
            if (info.ship) { G.leavePlay(); G.scene = 'ship'; G.shipT = 0; GV.menus.show('ship'); }
            else GV.menus.show('clear', info);
          }
        }
      } else if (G.scene === 'ship') {
        G.shipT = G.shipT >= 4.5 ? G.shipT + dt : Math.min(3.5, G.shipT + dt);
        GV.art.shipScene(ctx, G.t, G.shipT);
      } else {
        GV.art.cover(ctx, G.t);
      }
      if (GV.settings.data.fps) {
        ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
        ctx.font = `600 11px ${C.FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(160,255,200,0.8)';
        ctx.fillText(fps + ' fps' + (perf.scale < 1 ? ` · ${Math.round(perf.scale * 100)}% res` : ''), 8, C.H - 6);
      }
    } catch (err) {
      console.error(err);
    }
    I.endFrame();
    requestAnimationFrame(frame);
  }

  // Boot
  GV.save.load();
  GV.settings.load();
  GV.migrateArsenal(GV.save.data);
  if (GV.save.hasP2()) GV.save.as(1, (d2) => GV.migrateArsenal(d2));
  if (GV.save.data.cls) { GV.codex.check(); GV.ach.check(true); GV.TREE.enforceCap(); GV.save.write(true); } // already-earned crew logs unlock quietly
  GV.audio.setVolume(GV.settings.data.volume);
  GV.music.setLevel(GV.settings.data.music);
  GV.audio.setMuted(!!GV.save.data.mute);
  I.bindTouch(); I.bindAim(canvas);
  resize();
  addEventListener('touchstart', () => setTimeout(resize, 0), { once: true, passive: true });
  GV.menus.show('title');
  // Cloud save: connect in the background; refresh the Save & Transfer screen when it answers.
  let lastSync = '';
  GV.sync.onChange(() => {
    const key = GV.sync.status + (GV.sync.cloud ? GV.sync.cloud.savedAt : '');
    if (key !== lastSync && document.querySelector('.panel.saves') && !document.querySelector('.panel.saves textarea:not([hidden])')) { lastSync = key; GV.menus.saves(); }
    else lastSync = key;
  });
  GV.sync.init();
  GV.soundtrack.init();
  addEventListener('pagehide', () => { if (GV.sync.dirty) GV.sync.push(); });
  requestAnimationFrame(frame);
  GV.ready = true;
})();
