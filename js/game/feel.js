// Galactic Void — game feel: hit-stop and slow-motion on big moments, a layered sound engine with a
// voice for every kind of skill, impact and boss telegraph, and squash/lean data for the suits.
(function () {
  const GV = window.GV, P = GV.Play.prototype, S = GV.Skills, AU = GV.audio;
  const setting = (k, d) => { const v = GV.settings && GV.settings.data && GV.settings.data[k]; return v == null ? d : v; };

  // ================= SOUND =================
  // Each sound is a few layers: oscillator sweeps and filtered noise bursts.
  // o: osc { w, f, f2, d, v, at (delay), det (detune cents) } · n: noise { f (filter freq), q, type, d, v, at, f2 }
  const SND = {
    slash: [{ n: { type: 'highpass', f: 2400, f2: 5200, q: 0.7, d: 0.09, v: 0.16 } }, { o: { w: 'triangle', f: 620, f2: 220, d: 0.08, v: 0.06 } }],
    heavy: [{ n: { type: 'lowpass', f: 900, f2: 200, q: 1, d: 0.16, v: 0.24 } }, { o: { w: 'sine', f: 130, f2: 48, d: 0.2, v: 0.2 } }],
    shot: [{ o: { w: 'square', f: 980, f2: 320, d: 0.07, v: 0.05 } }, { n: { type: 'bandpass', f: 3000, q: 2, d: 0.05, v: 0.06 } }],
    laser: [{ o: { w: 'sawtooth', f: 1500, f2: 260, d: 0.16, v: 0.06 } }, { o: { w: 'square', f: 760, f2: 180, d: 0.16, v: 0.04, det: 12 } }],
    zap: [{ n: { type: 'bandpass', f: 4200, f2: 1800, q: 4, d: 0.12, v: 0.16 } }, { o: { w: 'square', f: 1800, f2: 600, d: 0.06, v: 0.04 } }, { o: { w: 'square', f: 1300, f2: 400, d: 0.05, v: 0.035, at: 0.04 } }],
    fire: [{ n: { type: 'bandpass', f: 900, f2: 400, q: 0.8, d: 0.3, v: 0.2 } }, { o: { w: 'sawtooth', f: 180, f2: 90, d: 0.25, v: 0.06 } }],
    cold: [{ o: { w: 'sine', f: 2200, f2: 3100, d: 0.18, v: 0.05 } }, { o: { w: 'sine', f: 2930, f2: 2400, d: 0.22, v: 0.04, at: 0.03 } }, { n: { type: 'highpass', f: 6000, q: 0.5, d: 0.12, v: 0.06 } }],
    void: [{ o: { w: 'sine', f: 220, f2: 70, d: 0.4, v: 0.14 } }, { o: { w: 'sine', f: 223, f2: 72, d: 0.4, v: 0.1, det: 30 } }, { n: { type: 'lowpass', f: 500, q: 3, d: 0.3, v: 0.08 } }],
    light: [{ o: { w: 'triangle', f: 660, f2: 1320, d: 0.25, v: 0.08 } }, { o: { w: 'sine', f: 990, f2: 1980, d: 0.3, v: 0.05, at: 0.05 } }],
    burst: [{ n: { type: 'lowpass', f: 2400, f2: 300, q: 0.8, d: 0.35, v: 0.24 } }, { o: { w: 'sine', f: 160, f2: 40, d: 0.35, v: 0.18 } }],
    boom: [{ n: { type: 'lowpass', f: 700, f2: 90, q: 0.9, d: 0.55, v: 0.32 } }, { o: { w: 'sine', f: 90, f2: 28, d: 0.6, v: 0.28 } }],
    whoosh: [{ n: { type: 'bandpass', f: 400, f2: 2600, q: 1.2, d: 0.28, v: 0.14 } }],
    dash2: [{ n: { type: 'bandpass', f: 2600, f2: 500, q: 1.5, d: 0.16, v: 0.13 } }, { o: { w: 'triangle', f: 900, f2: 300, d: 0.12, v: 0.04 } }],
    chime: [{ o: { w: 'sine', f: 784, f2: 790, d: 0.4, v: 0.07 } }, { o: { w: 'sine', f: 1175, f2: 1180, d: 0.45, v: 0.05, at: 0.06 } }, { o: { w: 'sine', f: 1568, f2: 1570, d: 0.5, v: 0.04, at: 0.12 } }],
    shimmer: [{ n: { type: 'highpass', f: 5000, q: 0.5, d: 0.35, v: 0.06 } }, { o: { w: 'sine', f: 1400, f2: 700, d: 0.35, v: 0.04 } }],
    deploy: [{ o: { w: 'square', f: 300, f2: 300, d: 0.05, v: 0.05 } }, { o: { w: 'square', f: 450, f2: 450, d: 0.05, v: 0.05, at: 0.07 } }, { o: { w: 'square', f: 600, f2: 900, d: 0.08, v: 0.05, at: 0.14 } }],
    roar: [{ o: { w: 'sawtooth', f: 140, f2: 90, d: 0.5, v: 0.12 } }, { o: { w: 'sawtooth', f: 147, f2: 86, d: 0.5, v: 0.1 } }, { n: { type: 'bandpass', f: 600, q: 1, d: 0.45, v: 0.12 } }],
    impact: [{ n: { type: 'bandpass', f: 1400, q: 1, d: 0.05, v: 0.12 } }, { o: { w: 'sine', f: 220, f2: 80, d: 0.06, v: 0.1 } }],
    crit: [{ n: { type: 'highpass', f: 3000, q: 0.7, d: 0.07, v: 0.14 } }, { o: { w: 'triangle', f: 1200, f2: 400, d: 0.09, v: 0.08 } }, { o: { w: 'sine', f: 160, f2: 50, d: 0.12, v: 0.14 } }],
    kill: [{ n: { type: 'lowpass', f: 1800, f2: 300, q: 0.7, d: 0.16, v: 0.14 } }, { o: { w: 'triangle', f: 520, f2: 130, d: 0.14, v: 0.06 } }],
    warn: [{ o: { w: 'square', f: 420, f2: 860, d: 0.18, v: 0.035 } }, { o: { w: 'square', f: 430, f2: 880, d: 0.18, v: 0.03, det: 20 } }],
    bossWarn: [{ o: { w: 'sawtooth', f: 110, f2: 330, d: 0.45, v: 0.09 } }, { o: { w: 'sawtooth', f: 113, f2: 340, d: 0.45, v: 0.07 } }, { n: { type: 'bandpass', f: 300, f2: 1200, q: 2, d: 0.45, v: 0.06 } }],
  };
  let noiseBuf = null, voices = 0, voiceT = 0;
  const lastAt = {};
  function noise(c) {
    if (noiseBuf) return noiseBuf;
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  AU.play = function (name, opts = {}) {
    const c = this.ctx; if (!c || this.muted) return;
    const L = SND[name]; if (!L) return this.sfx(name);
    const now = c.currentTime;
    if (now - (lastAt[name] || 0) < (opts.gap || 0.035)) return; // the same sound can't stack up
    if (now - voiceT > 0.1) { voiceT = now; voices = 0; }
    if (++voices > 14) return; // and the whole mix stays sane in a crowd
    lastAt[name] = now;
    const pitch = opts.pitch || 1 + (Math.random() - 0.5) * 0.08, vol = opts.vol == null ? 1 : opts.vol;
    try {
      for (const layer of L) {
        const t = now + ((layer.o || layer.n).at || 0);
        const g = c.createGain(); g.connect(this.master);
        if (layer.o) {
          const o = c.createOscillator(), p = layer.o;
          o.type = p.w; o.frequency.setValueAtTime(p.f * pitch, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, p.f2 * pitch), t + p.d);
          if (p.det) o.detune.value = p.det;
          g.gain.setValueAtTime(p.v * vol, t); g.gain.exponentialRampToValueAtTime(0.0006, t + p.d);
          o.connect(g); o.start(t); o.stop(t + p.d + 0.03);
        } else {
          const s = c.createBufferSource(), p = layer.n, f = c.createBiquadFilter();
          s.buffer = noise(c); f.type = p.type; f.Q.value = p.q || 1;
          f.frequency.setValueAtTime(p.f * pitch, t); if (p.f2) f.frequency.exponentialRampToValueAtTime(p.f2 * pitch, t + p.d);
          g.gain.setValueAtTime(p.v * vol, t); g.gain.exponentialRampToValueAtTime(0.0006, t + p.d);
          s.connect(f); f.connect(g); s.start(t, Math.random() * 0.3); s.stop(t + p.d + 0.03);
        }
      }
    } catch (e) {}
  };
  // which voice a skill uses
  const dominant = (types) => { let b = 'phys', v = -1; for (const k in types || {}) if (types[k] > v) { v = types[k]; b = k; } return b; };
  function skillSound(s, pl) {
    const k = s.kind, el = dominant(s.def.types), tags = s.tags;
    if (k === 'heal' || k === 'ward' || k === 'ground') return 'chime';
    if (k === 'stealth' || k === 'cloak') return 'shimmer';
    if (k === 'blink' || k === 'charge' || k === 'lunge' || k === 'hook') return 'dash2';
    if (k === 'minion' || k === 'turret' || k === 'drones' || k === 'echo') return 'deploy';
    if (k === 'howl') return 'roar';
    if (k === 'meteor' || k === 'pillar' || k === 'dive') return 'whoosh';
    if (k === 'rail' || k === 'arc' || k === 'spark') return 'zap';
    if (k === 'nova') return 'burst';
    if (tags.has('Spell')) return { fire: 'fire', cold: 'cold', light: 'zap', void: 'void' }[el] || 'light';
    if (tags.has('Projectile')) return k === 'knives' || k === 'aegis' ? 'slash' : 'shot';
    if (k === 'slam' || (pl.weapon && pl.weapon.twoHanded)) return 'heavy';
    return 'slash';
  }
  const use0 = S.use;
  S.use = function (p, pl, s, slot, opts) {
    const r = use0.apply(this, arguments);
    if (s && pl && !(opts && opts.echoed) && GV.game && p === GV.game.play) AU.play(skillSound(s, pl), { vol: pl.slot ? 0.7 : 1 });
    return r;
  };
  // telegraphs get a sound: a rising whine for enemies, a deep swell for bosses
  const warn0 = P.warn;
  P.warn = function (o) {
    warn0.call(this, o);
    if (GV.game && this === GV.game.play) AU.play(this.boss && !this.boss.dead ? 'bossWarn' : 'warn', { gap: 0.25 });
  };
  const shake0 = P.shake;
  P.shake = function (n) { shake0.call(this, n); if (n >= 7 && GV.game && this === GV.game.play) AU.play('boom', { gap: 0.12, vol: Math.min(1, n / 12) }); };

  // ================= HIT-STOP & SLOW-MO =================
  // A short freeze on big hits sells the weight. A budget stops a crowd turning it into a stutter.
  P.hitStop = function (t) {
    if (!setting('hitstop', true) || this.bench) return;
    const b = (this._hsBudget = this._hsBudget == null ? 0.3 : this._hsBudget);
    const use = Math.min(t, b); if (use <= 0.01) return;
    this._hsBudget -= use; this._hs = Math.max(this._hs || 0, use);
  };
  P.slowMo = function (t, k) { if (!setting('hitstop', true) || this.bench) return; this._slow = { t, k }; };
  const de0 = P.damageEnemy;
  P.damageEnemy = function (e, amt, kx, ky, crit) {
    const before = e.hp, was = e.dead;
    const r = de0.apply(this, arguments);
    {
      const dealt = Math.max(0, before - Math.max(0, e.hp)), frac = dealt / Math.max(1, e.maxHp);
      if (GV.game && this === GV.game.play && dealt > 0 && !(e.def && e.def.static)) {
        AU.play(crit ? 'crit' : 'impact', { gap: crit ? 0.05 : 0.03, pitch: 0.85 + Math.random() * 0.3, vol: e.boss ? 0.8 : 0.6 });
        if (frac > 0.25 || (crit && frac > 0.08) || (e.boss && crit && dealt > e.maxHp * 0.02)) this.hitStop(e.boss ? 0.05 : 0.06);
        if (!was && e.dead) {
          AU.play('kill', { gap: 0.05 });
          if (e.boss) { this.hitStop(0.14); this.slowMo(1.1, 0.3); }
          else if (e.elite) this.hitStop(0.08);
          else if (frac > 0.5) this.hitStop(0.03);
        }
      }
    }
    return r;
  };
  const dp0 = P.damagePlayer;
  P.damagePlayer = function () {
    const pl = this.player, h = pl && pl.hp;
    const r = dp0.apply(this, arguments);
    if (pl && pl.hp < h) this.hitStop(0.07);
    return r;
  };
  const up0 = P.update;
  P.update = function (dt) {
    this._hsBudget = Math.min(0.3, (this._hsBudget == null ? 0.3 : this._hsBudget) + dt * 0.3);
    if (this._hs > 0) { this._hs -= dt; this.shakeA = Math.max(this.shakeA || 0, 1.5); return; }
    if (this._slow && this._slow.t > 0) { this._slow.t -= dt; dt *= this._slow.k; }
    up0.call(this, dt);
  };

  // ================= SUIT ANIMATION =================
  // Landing squashes, jumping stretches, running leans in, a swing pushes the body forward.
  const pu0 = GV.Player.prototype.update;
  GV.Player.prototype.update = function (dt, p) {
    const air = !this.onGround, vy = this.vy;
    pu0.call(this, dt, p);
    if (air && this.onGround && vy > 240) this.sqT = Math.min(0.16, 0.06 + vy / 6000); // land
    if (!air && !this.onGround && this.vy < -200) this.stT = 0.12; // take off
    if (this.sqT > 0) this.sqT -= dt; if (this.stT > 0) this.stT -= dt;
    this.squash = this.sqT > 0 ? this.sqT / 0.16 : this.stT > 0 ? -this.stT / 0.12 * 0.8 : 0;
  };
})();
