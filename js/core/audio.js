// Galactic Void — tiny synth audio. No files; everything is generated with Web Audio.
(function () {
  const GV = window.GV;
  const SFX = {
    jump: { w: 'square', f: 260, f2: 520, d: 0.09, v: 0.08 },
    djump: { w: 'square', f: 380, f2: 760, d: 0.1, v: 0.08 },
    swing: { w: 'triangle', f: 520, f2: 180, d: 0.08, v: 0.1 },
    hit: { w: 'sawtooth', f: 200, f2: 60, d: 0.08, v: 0.12 },
    hurt: { w: 'sawtooth', f: 160, f2: 40, d: 0.25, v: 0.18 },
    mem: { w: 'sine', f: 880, f2: 1320, d: 0.12, v: 0.09 },
    dash: { w: 'triangle', f: 900, f2: 200, d: 0.15, v: 0.09 },
    skill: { w: 'sine', f: 300, f2: 1100, d: 0.25, v: 0.12 },
    heal: { w: 'sine', f: 500, f2: 900, d: 0.35, v: 0.1 },
    slam: { w: 'sawtooth', f: 90, f2: 30, d: 0.35, v: 0.2 },
    boss: { w: 'sawtooth', f: 70, f2: 35, d: 1.2, v: 0.2 },
    beacon: { w: 'sine', f: 440, f2: 660, d: 0.5, v: 0.1 },
    ui: { w: 'sine', f: 660, f2: 760, d: 0.05, v: 0.05 },
    die: { w: 'sawtooth', f: 300, f2: 30, d: 0.9, v: 0.18 },
    rift: { w: 'square', f: 120, f2: 60, d: 0.2, v: 0.06 },
    shoot: { w: 'square', f: 700, f2: 300, d: 0.08, v: 0.05 },
    level: { w: 'triangle', f: 440, f2: 1760, d: 0.6, v: 0.12 },
  };

  GV.audio = {
    ctx: null,
    muted: false,
    unlock() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.28 * this.vol;
        this.master.connect(this.ctx.destination);
        this.startDrone();
      } catch (e) { this.ctx = null; }
    },
    vol: 0.8,
    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.28 * this.vol;
    },
    setVolume(v) { this.vol = v; this.setMuted(this.muted); },
    // Low, uneasy ambience for the void.
    startDrone() {
      const c = this.ctx;
      const g = c.createGain();
      g.gain.value = 0.05;
      g.connect(this.master);
      [41.2, 61.7, 82.4 * 1.007].forEach((f, i) => {
        const o = c.createOscillator();
        o.type = i === 2 ? 'triangle' : 'sine';
        o.frequency.value = f;
        const lfo = c.createOscillator(), lg = c.createGain();
        lfo.frequency.value = 0.07 + i * 0.05;
        lg.gain.value = 1.5 + i;
        lfo.connect(lg); lg.connect(o.frequency);
        o.connect(g); o.start(); lfo.start();
      });
    },
    sfx(type) {
      if (!this.ctx || this.muted) return;
      const p = SFX[type] || SFX.ui;
      const c = this.ctx, t = c.currentTime;
      try {
        const o = c.createOscillator(), g = c.createGain();
        o.type = p.w;
        o.frequency.setValueAtTime(p.f, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(20, p.f2), t + p.d);
        g.gain.setValueAtTime(p.v, t);
        g.gain.exponentialRampToValueAtTime(0.0008, t + p.d);
        o.connect(g); g.connect(this.master);
        o.start(t); o.stop(t + p.d + 0.03);
      } catch (e) {}
    },
  };
})();

// Generative music. Each system gets its own scale, root and arpeggio, seeded from its index,
// so a system always sounds like itself. Boss fights speed it up and add a pulse and bass.
(function () {
  const GV = window.GV;
  const SCALES = [
    [0, 2, 3, 5, 7, 8, 10], // aeolian
    [0, 1, 3, 5, 7, 8, 10], // phrygian
    [0, 2, 3, 5, 7, 9, 10], // dorian
    [0, 2, 3, 7, 8],        // hirajoshi
    [0, 1, 4, 5, 7, 8, 10], // phrygian dominant
  ];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  const M = (GV.music = {
    mode: null, seed: -1, step: 0, next: 0, timer: null, gain: null, level: 1,
    setLevel(v) { this.level = v; if (this.gain) this.gain.gain.value = 0.55 * v; },
    // mode: 'menu' | 'stage' | 'boss' | null (silence)
    set(mode, seed) {
      seed = seed == null ? 0 : seed;
      if (mode === this.mode && seed === this.seed) return;
      const newSong = seed !== this.seed;
      this.mode = mode; this.seed = seed;
      if (newSong) this.song = this.compose(seed);
      this.ensure();
    },
    compose(seed) {
      const r = rng(seed + 11);
      const scale = SCALES[Math.floor(r() * SCALES.length)];
      const root = 45 + Math.floor(r() * 7); // A2..D#3
      const deg = (d) => { const o = Math.floor(d / scale.length); return root + scale[((d % scale.length) + scale.length) % scale.length] + 12 * o; };
      const prog = [0, Math.floor(r() * 3) + 3, Math.floor(r() * 2) + 5, Math.floor(r() * 3) + 1]; // four chords
      const arp = []; for (let i = 0; i < 16; i++) arp.push(r() < 0.72 ? Math.floor(r() * 6) : null);
      return { deg, prog, arp, tempo: 68 + Math.floor(r() * 18), wave: r() < 0.5 ? 'triangle' : 'sine' };
    },
    ensure() {
      const A = GV.audio;
      if (!A.ctx) return; // started on first unlock
      if (!this.gain) {
        this.gain = A.ctx.createGain(); this.gain.gain.value = 0.55 * this.level;
        this.filt = A.ctx.createBiquadFilter(); this.filt.type = 'lowpass'; this.filt.frequency.value = 2400;
        this.gain.connect(this.filt); this.filt.connect(A.master);
      }
      if (!this.timer) { this.next = A.ctx.currentTime + 0.1; this.timer = setInterval(() => this.tick(), 40); }
    },
    note(f, t, d, v, w, att) {
      const c = GV.audio.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = w; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + (att || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(this.gain);
      o.start(t); o.stop(t + d + 0.05);
    },
    kick(t, v) {
      const c = GV.audio.ctx, o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(34, t + 0.18);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + 0.3);
    },
    tick() {
      const A = GV.audio, c = A.ctx;
      if (!c || !this.mode || !this.song || A.muted || this.level <= 0 || document.hidden) { if (c) this.next = c.currentTime + 0.1; return; }
      if (c.state !== 'running') return;
      const S = this.song, boss = this.mode === 'boss', menu = this.mode === 'menu';
      const bpm = S.tempo * (boss ? 1.45 : menu ? 0.8 : 1), sx = 60 / bpm / 4;
      if (this.next < c.currentTime - 0.2) this.next = c.currentTime + 0.05;
      while (this.next < c.currentTime + 0.15) {
        const t = this.next, st = this.step % 64, bar = Math.floor(st / 16), chord = S.prog[bar], pos = st % 16;
        try {
          if (pos === 0) for (const d of [0, 2, 4]) this.note(mtof(S.deg(chord + d) + 12), t, sx * 16 * 1.05, 0.035, 'sine', 0.6);
          const a = S.arp[pos];
          if (a != null && (!menu || pos % 2 === 0)) this.note(mtof(S.deg(chord + a) + 24), t, sx * (boss ? 1.6 : 3), boss ? 0.05 : 0.04, S.wave);
          if (boss) {
            if (pos % 4 === 0) this.kick(t, 0.32);
            if (pos % 2 === 0) this.note(mtof(S.deg(chord) - 12 + (pos % 8 === 6 ? 7 : 0)), t, sx * 1.8, 0.06, 'sawtooth');
          } else if (!menu && pos === 8 && bar % 2 === 1) this.note(mtof(S.deg(chord) - 12), t, sx * 8, 0.05, 'triangle', 0.2);
        } catch (e) {}
        this.next += sx; this.step++;
      }
    },
  });
  // Start the song as soon as audio is unlocked by the first tap/key.
  const unlock0 = GV.audio.unlock.bind(GV.audio);
  GV.audio.unlock = function () { unlock0(); if (this.ctx && M.mode) M.ensure(); };
})();
