// Galactic Void — sound, polished. Every effect is a small layered recipe played through a shared bus:
// a soft attack (no clicks), a little random pitch so repeats don't sound robotic, stereo placement by where
// it happened, a space-y reverb tail, and a compressor that keeps big fights clean.
// Any sound can be replaced with your own file: Settings → Sound Lab (this device), or put files in the
// game's sfx/ folder and list them in sfx/manifest.json (everyone).
(function () {
  const GV = window.GV, AU = GV.audio;
  // Layers. o: oscillator { w, f, f2, d, v, at, det, a } · n: filtered noise { type, f, f2, q, d, v, at, a }
  // a = attack seconds; rv (per sound) = how much goes to the reverb.
  const R = {
    // ---- movement ----
    jump: { rv: 0.1, L: [{ n: { type: 'bandpass', f: 600, f2: 1900, q: 1.2, d: 0.11, v: 0.07 } }, { o: { w: 'triangle', f: 300, f2: 560, d: 0.09, v: 0.05 } }] },
    djump: { rv: 0.15, L: [{ n: { type: 'bandpass', f: 900, f2: 2600, q: 1.4, d: 0.12, v: 0.07 } }, { o: { w: 'triangle', f: 420, f2: 780, d: 0.1, v: 0.05 } }, { o: { w: 'sine', f: 1400, f2: 2100, d: 0.12, v: 0.025, at: 0.03 } }] },
    land: { rv: 0.05, L: [{ o: { w: 'sine', f: 120, f2: 48, d: 0.11, v: 0.13 } }, { n: { type: 'lowpass', f: 700, f2: 200, q: 0.8, d: 0.07, v: 0.08 } }] },
    dash: { rv: 0.12, L: [{ n: { type: 'bandpass', f: 2800, f2: 450, q: 1.4, d: 0.2, v: 0.13, a: 0.01 } }, { o: { w: 'triangle', f: 900, f2: 280, d: 0.14, v: 0.035 } }] },
    dash2: { rv: 0.15, L: [{ n: { type: 'bandpass', f: 2600, f2: 500, q: 1.5, d: 0.18, v: 0.13, a: 0.01 } }, { o: { w: 'triangle', f: 900, f2: 300, d: 0.12, v: 0.04 } }, { o: { w: 'sine', f: 140, f2: 70, d: 0.12, v: 0.06 } }] },
    whoosh: { rv: 0.2, L: [{ n: { type: 'bandpass', f: 380, f2: 2800, q: 1.2, d: 0.3, v: 0.14, a: 0.05 } }, { n: { type: 'bandpass', f: 500, f2: 3200, q: 2, d: 0.28, v: 0.06, at: 0.03, a: 0.04 } }] },
    // ---- melee & guns ----
    swing: { rv: 0.06, L: [{ n: { type: 'highpass', f: 1800, f2: 4600, q: 0.7, d: 0.1, v: 0.12, a: 0.008 } }, { o: { w: 'triangle', f: 520, f2: 190, d: 0.08, v: 0.05 } }] },
    slash: { rv: 0.06, L: [{ n: { type: 'highpass', f: 2400, f2: 5400, q: 0.7, d: 0.1, v: 0.15, a: 0.006 } }, { o: { w: 'triangle', f: 640, f2: 210, d: 0.08, v: 0.05 } }, { n: { type: 'bandpass', f: 7000, q: 6, d: 0.04, v: 0.04, at: 0.03 } }] },
    heavy: { rv: 0.12, L: [{ n: { type: 'lowpass', f: 1000, f2: 180, q: 1, d: 0.18, v: 0.24, a: 0.01 } }, { o: { w: 'sine', f: 140, f2: 46, d: 0.22, v: 0.2 } }, { n: { type: 'highpass', f: 2600, q: 0.7, d: 0.05, v: 0.06 } }] },
    shoot: { rv: 0.1, L: [{ o: { w: 'square', f: 980, f2: 320, d: 0.06, v: 0.04 } }, { n: { type: 'bandpass', f: 3200, q: 1.6, d: 0.04, v: 0.08 } }, { o: { w: 'sine', f: 170, f2: 60, d: 0.06, v: 0.1 } }] },
    shot: { rv: 0.1, L: [{ o: { w: 'square', f: 1000, f2: 320, d: 0.065, v: 0.045 } }, { n: { type: 'bandpass', f: 3000, q: 2, d: 0.05, v: 0.07 } }, { o: { w: 'sine', f: 180, f2: 60, d: 0.06, v: 0.09 } }] },
    laser: { rv: 0.2, L: [{ o: { w: 'sawtooth', f: 1500, f2: 260, d: 0.17, v: 0.055 } }, { o: { w: 'square', f: 760, f2: 180, d: 0.17, v: 0.035, det: 12 } }, { n: { type: 'bandpass', f: 5000, f2: 1500, q: 3, d: 0.12, v: 0.04 } }] },
    // ---- elements ----
    zap: { rv: 0.18, L: [{ n: { type: 'bandpass', f: 4200, f2: 1800, q: 4, d: 0.12, v: 0.15 } }, { o: { w: 'square', f: 1800, f2: 600, d: 0.06, v: 0.035 } }, { o: { w: 'square', f: 1300, f2: 400, d: 0.05, v: 0.03, at: 0.04 } }, { o: { w: 'square', f: 2300, f2: 900, d: 0.04, v: 0.02, at: 0.075 } }] },
    fire: { rv: 0.18, L: [{ n: { type: 'bandpass', f: 900, f2: 380, q: 0.8, d: 0.32, v: 0.2, a: 0.03 } }, { o: { w: 'sawtooth', f: 180, f2: 90, d: 0.26, v: 0.05 } }, { n: { type: 'highpass', f: 4000, q: 0.5, d: 0.2, v: 0.03, at: 0.05 } }] },
    cold: { rv: 0.3, L: [{ o: { w: 'sine', f: 2200, f2: 3100, d: 0.2, v: 0.045 } }, { o: { w: 'sine', f: 2930, f2: 2400, d: 0.24, v: 0.035, at: 0.03 } }, { n: { type: 'highpass', f: 6000, q: 0.5, d: 0.14, v: 0.06 } }, { o: { w: 'sine', f: 4400, f2: 4300, d: 0.3, v: 0.015, at: 0.06 } }] },
    void: { rv: 0.4, L: [{ o: { w: 'sine', f: 220, f2: 66, d: 0.45, v: 0.13, a: 0.02 } }, { o: { w: 'sine', f: 223, f2: 70, d: 0.45, v: 0.09, det: 30 } }, { n: { type: 'lowpass', f: 520, q: 3, d: 0.32, v: 0.08 } }, { o: { w: 'sine', f: 55, f2: 40, d: 0.5, v: 0.08 } }] },
    light: { rv: 0.35, L: [{ o: { w: 'triangle', f: 660, f2: 1320, d: 0.26, v: 0.075, a: 0.01 } }, { o: { w: 'sine', f: 990, f2: 1980, d: 0.3, v: 0.045, at: 0.05 } }, { n: { type: 'highpass', f: 6000, q: 0.5, d: 0.2, v: 0.025 } }] },
    burst: { rv: 0.25, L: [{ n: { type: 'lowpass', f: 2600, f2: 280, q: 0.8, d: 0.38, v: 0.24 } }, { o: { w: 'sine', f: 170, f2: 40, d: 0.38, v: 0.18 } }, { n: { type: 'highpass', f: 3500, q: 0.6, d: 0.06, v: 0.06 } }] },
    boom: { rv: 0.3, L: [{ n: { type: 'lowpass', f: 800, f2: 80, q: 0.9, d: 0.6, v: 0.32 } }, { o: { w: 'sine', f: 95, f2: 26, d: 0.65, v: 0.28 } }, { n: { type: 'highpass', f: 2000, q: 0.6, d: 0.05, v: 0.1 } }] },
    slam: { rv: 0.25, L: [{ n: { type: 'lowpass', f: 900, f2: 90, q: 0.9, d: 0.42, v: 0.26 } }, { o: { w: 'sine', f: 100, f2: 30, d: 0.45, v: 0.22 } }, { n: { type: 'highpass', f: 2400, q: 0.6, d: 0.04, v: 0.1 } }] },
    // ---- skills, support ----
    skill: { rv: 0.25, L: [{ o: { w: 'sine', f: 300, f2: 1100, d: 0.25, v: 0.09, a: 0.02 } }, { n: { type: 'bandpass', f: 800, f2: 3000, q: 2, d: 0.22, v: 0.05, a: 0.03 } }] },
    chime: { rv: 0.45, L: [{ o: { w: 'sine', f: 784, f2: 790, d: 0.45, v: 0.065, a: 0.01 } }, { o: { w: 'sine', f: 1175, f2: 1180, d: 0.5, v: 0.045, at: 0.06, a: 0.01 } }, { o: { w: 'sine', f: 1568, f2: 1570, d: 0.55, v: 0.035, at: 0.12, a: 0.01 } }] },
    heal: { rv: 0.45, L: [{ o: { w: 'sine', f: 523, f2: 530, d: 0.5, v: 0.06, a: 0.04 } }, { o: { w: 'sine', f: 659, f2: 666, d: 0.5, v: 0.05, at: 0.05, a: 0.04 } }, { o: { w: 'sine', f: 784, f2: 1046, d: 0.55, v: 0.045, at: 0.1, a: 0.04 } }, { n: { type: 'highpass', f: 6000, q: 0.5, d: 0.4, v: 0.02, a: 0.1 } }] },
    shimmer: { rv: 0.4, L: [{ n: { type: 'highpass', f: 5000, q: 0.5, d: 0.38, v: 0.06, a: 0.05 } }, { o: { w: 'sine', f: 1400, f2: 700, d: 0.36, v: 0.035 } }] },
    deploy: { rv: 0.15, L: [{ o: { w: 'square', f: 300, f2: 300, d: 0.05, v: 0.04 } }, { o: { w: 'square', f: 450, f2: 450, d: 0.05, v: 0.04, at: 0.07 } }, { o: { w: 'square', f: 600, f2: 900, d: 0.08, v: 0.04, at: 0.14 } }, { n: { type: 'bandpass', f: 1800, q: 4, d: 0.05, v: 0.04, at: 0.14 } }] },
    roar: { rv: 0.35, L: [{ o: { w: 'sawtooth', f: 140, f2: 88, d: 0.55, v: 0.11, a: 0.04 } }, { o: { w: 'sawtooth', f: 147, f2: 84, d: 0.55, v: 0.09, a: 0.04 } }, { n: { type: 'bandpass', f: 600, q: 1, d: 0.5, v: 0.12, a: 0.03 } }] },
    finisher: { rv: 0.45, L: [{ n: { type: 'lowpass', f: 3200, f2: 200, q: 0.8, d: 0.5, v: 0.26 } }, { o: { w: 'sine', f: 210, f2: 38, d: 0.55, v: 0.22 } }, { o: { w: 'triangle', f: 1320, f2: 1320, d: 0.5, v: 0.05, at: 0.06, a: 0.01 } }, { o: { w: 'triangle', f: 1980, f2: 1980, d: 0.45, v: 0.035, at: 0.1, a: 0.01 } }] },
    // ---- hits by material ----
    impact: { rv: 0.05, L: [{ n: { type: 'bandpass', f: 1400, q: 1, d: 0.05, v: 0.11 } }, { o: { w: 'sine', f: 220, f2: 80, d: 0.07, v: 0.1 } }] },
    hit: { rv: 0.05, L: [{ n: { type: 'bandpass', f: 1300, q: 1, d: 0.05, v: 0.11 } }, { o: { w: 'sine', f: 200, f2: 70, d: 0.08, v: 0.11 } }, { o: { w: 'square', f: 2600, f2: 2000, d: 0.012, v: 0.03 } }] },
    hitFlesh: { rv: 0.05, L: [{ n: { type: 'lowpass', f: 1000, f2: 280, q: 2, d: 0.09, v: 0.14 } }, { o: { w: 'sine', f: 150, f2: 60, d: 0.1, v: 0.1 } }, { n: { type: 'bandpass', f: 480, f2: 1500, q: 6, d: 0.07, v: 0.07, at: 0.01 } }] },
    hitMetal: { rv: 0.2, L: [{ o: { w: 'triangle', f: 1780, f2: 1700, d: 0.26, v: 0.045 } }, { o: { w: 'square', f: 2670, f2: 2600, d: 0.18, v: 0.018 } }, { n: { type: 'highpass', f: 4200, q: 0.6, d: 0.04, v: 0.09 } }, { o: { w: 'sine', f: 240, f2: 120, d: 0.06, v: 0.07 } }] },
    hitCrystal: { rv: 0.35, L: [{ o: { w: 'sine', f: 2600, f2: 2590, d: 0.32, v: 0.04 } }, { o: { w: 'sine', f: 3910, f2: 3900, d: 0.26, v: 0.025, at: 0.01 } }, { o: { w: 'sine', f: 5230, f2: 5200, d: 0.2, v: 0.015, at: 0.02 } }, { n: { type: 'highpass', f: 6000, q: 0.5, d: 0.04, v: 0.06 } }] },
    hitEnergy: { rv: 0.25, L: [{ o: { w: 'sawtooth', f: 900, f2: 280, d: 0.1, v: 0.04 } }, { n: { type: 'bandpass', f: 3000, f2: 1200, q: 5, d: 0.08, v: 0.08 } }] },
    crit: { rv: 0.1, L: [{ n: { type: 'highpass', f: 3000, q: 0.7, d: 0.07, v: 0.14 } }, { o: { w: 'triangle', f: 1200, f2: 400, d: 0.09, v: 0.07 } }, { o: { w: 'sine', f: 160, f2: 50, d: 0.13, v: 0.14 } }] },
    kill: { rv: 0.15, L: [{ n: { type: 'lowpass', f: 1800, f2: 300, q: 0.7, d: 0.17, v: 0.13 } }, { o: { w: 'triangle', f: 520, f2: 130, d: 0.15, v: 0.055 } }] },
    killFlesh: { rv: 0.15, L: [{ n: { type: 'lowpass', f: 1500, f2: 180, q: 1.5, d: 0.3, v: 0.16 } }, { o: { w: 'sine', f: 95, f2: 38, d: 0.3, v: 0.13 } }, { n: { type: 'bandpass', f: 380, f2: 1200, q: 7, d: 0.12, v: 0.06, at: 0.04 } }, { n: { type: 'bandpass', f: 600, f2: 1800, q: 7, d: 0.1, v: 0.04, at: 0.11 } }] },
    killMetal: { rv: 0.3, L: [{ n: { type: 'bandpass', f: 2200, f2: 400, q: 1, d: 0.35, v: 0.14 } }, { o: { w: 'square', f: 1500, f2: 1400, d: 0.05, v: 0.025 } }, { o: { w: 'square', f: 2200, f2: 2100, d: 0.05, v: 0.02, at: 0.07 } }, { o: { w: 'triangle', f: 1100, f2: 1000, d: 0.08, v: 0.03, at: 0.15 } }, { o: { w: 'sine', f: 110, f2: 40, d: 0.25, v: 0.12 } }] },
    killCrystal: { rv: 0.45, L: [{ n: { type: 'highpass', f: 3200, q: 0.6, d: 0.28, v: 0.12 } }, { o: { w: 'sine', f: 3100, f2: 3080, d: 0.4, v: 0.035 } }, { o: { w: 'sine', f: 4650, f2: 4630, d: 0.35, v: 0.025, at: 0.03 } }, { o: { w: 'sine', f: 6200, f2: 6150, d: 0.3, v: 0.018, at: 0.06 } }] },
    killEnergy: { rv: 0.4, L: [{ o: { w: 'sine', f: 400, f2: 1700, d: 0.14, v: 0.07 } }, { n: { type: 'highpass', f: 5000, q: 0.5, d: 0.3, v: 0.05, at: 0.05 } }] },
    hurt: { rv: 0.12, L: [{ n: { type: 'bandpass', f: 900, f2: 400, q: 1.2, d: 0.14, v: 0.2 } }, { o: { w: 'sawtooth', f: 220, f2: 66, d: 0.24, v: 0.11 } }, { o: { w: 'sine', f: 1250, f2: 1200, d: 0.06, v: 0.035, at: 0.07 } }, { o: { w: 'sine', f: 1250, f2: 1200, d: 0.06, v: 0.03, at: 0.16 } }] },
    die: { rv: 0.5, L: [{ o: { w: 'sawtooth', f: 300, f2: 30, d: 1, v: 0.14 } }, { n: { type: 'lowpass', f: 1000, f2: 90, q: 0.8, d: 1.1, v: 0.16 } }, { o: { w: 'sine', f: 62, f2: 40, d: 1.2, v: 0.12 } }] },
    // ---- world ----
    mem: { rv: 0.3, L: [{ o: { w: 'sine', f: 880, f2: 1320, d: 0.13, v: 0.07 } }, { o: { w: 'sine', f: 1320, f2: 1760, d: 0.14, v: 0.045, at: 0.04 } }, { n: { type: 'highpass', f: 7000, q: 0.5, d: 0.1, v: 0.02, at: 0.04 } }] },
    beacon: { rv: 0.55, L: [{ o: { w: 'sine', f: 440, f2: 440, d: 0.9, v: 0.07, a: 0.01 } }, { o: { w: 'sine', f: 1100, f2: 1100, d: 0.6, v: 0.025, a: 0.01 } }, { o: { w: 'sine', f: 660, f2: 662, d: 0.8, v: 0.04, at: 0.12, a: 0.01 } }] },
    rift: { rv: 0.35, L: [{ o: { w: 'square', f: 120, f2: 58, d: 0.22, v: 0.05 } }, { n: { type: 'bandpass', f: 420, f2: 150, q: 4, d: 0.3, v: 0.08, a: 0.02 } }] },
    boss: { rv: 0.5, L: [{ o: { w: 'sawtooth', f: 72, f2: 34, d: 1.25, v: 0.14, a: 0.05 } }, { o: { w: 'sawtooth', f: 75, f2: 32, d: 1.25, v: 0.11, a: 0.05 } }, { n: { type: 'lowpass', f: 320, f2: 120, q: 1.5, d: 1.1, v: 0.12, a: 0.08 } }] },
    warn: { rv: 0.15, L: [{ o: { w: 'square', f: 420, f2: 860, d: 0.18, v: 0.03, a: 0.01 } }, { o: { w: 'square', f: 430, f2: 880, d: 0.18, v: 0.025, det: 20, a: 0.01 } }] },
    bossWarn: { rv: 0.35, L: [{ o: { w: 'sawtooth', f: 110, f2: 330, d: 0.47, v: 0.08, a: 0.03 } }, { o: { w: 'sawtooth', f: 113, f2: 340, d: 0.47, v: 0.06, a: 0.03 } }, { n: { type: 'bandpass', f: 300, f2: 1200, q: 2, d: 0.47, v: 0.06, a: 0.05 } }] },
    explode: { rv: 0.35, L: [{ n: { type: 'lowpass', f: 1600, f2: 70, q: 0.8, d: 0.7, v: 0.32 } }, { o: { w: 'sine', f: 85, f2: 24, d: 0.7, v: 0.26 } }, { n: { type: 'highpass', f: 2500, q: 0.6, d: 0.08, v: 0.12 } }, { n: { type: 'bandpass', f: 900, f2: 300, q: 2, d: 0.5, v: 0.06, at: 0.1 } }] },
    // ---- UI ----
    ui: { rv: 0, L: [{ o: { w: 'sine', f: 1150, f2: 900, d: 0.035, v: 0.035 } }, { n: { type: 'highpass', f: 5000, q: 0.5, d: 0.012, v: 0.02 } }] },
    confirm: { rv: 0.15, L: [{ o: { w: 'sine', f: 660, f2: 662, d: 0.08, v: 0.05 } }, { o: { w: 'sine', f: 990, f2: 995, d: 0.14, v: 0.045, at: 0.06 } }] },
    deny: { rv: 0.05, L: [{ o: { w: 'square', f: 220, f2: 190, d: 0.1, v: 0.035 } }, { o: { w: 'square', f: 200, f2: 160, d: 0.12, v: 0.03, at: 0.09 } }] },
    buy: { rv: 0.3, L: [{ o: { w: 'sine', f: 1318, f2: 1320, d: 0.08, v: 0.05 } }, { o: { w: 'sine', f: 1760, f2: 1765, d: 0.3, v: 0.05, at: 0.06, a: 0.005 } }, { n: { type: 'highpass', f: 7000, q: 0.5, d: 0.2, v: 0.02, at: 0.06 } }] },
    level: { rv: 0.45, L: [{ o: { w: 'triangle', f: 440, f2: 442, d: 0.18, v: 0.06 } }, { o: { w: 'triangle', f: 554, f2: 556, d: 0.18, v: 0.055, at: 0.06 } }, { o: { w: 'triangle', f: 659, f2: 661, d: 0.2, v: 0.05, at: 0.12 } }, { o: { w: 'triangle', f: 880, f2: 1760, d: 0.45, v: 0.05, at: 0.18 } }, { n: { type: 'highpass', f: 6000, q: 0.5, d: 0.4, v: 0.025, at: 0.18 } }] },
  };
  GV.SFX_RECIPES = R;
  // Grouped for the Sound Lab.
  GV.SFX_GROUPS = [
    ['Movement', ['jump', 'djump', 'land', 'dash', 'dash2', 'whoosh']],
    ['Weapons', ['swing', 'slash', 'heavy', 'shoot', 'shot', 'laser']],
    ['Elements & skills', ['zap', 'fire', 'cold', 'void', 'light', 'burst', 'slam', 'skill', 'chime', 'heal', 'shimmer', 'deploy', 'roar', 'finisher']],
    ['Hits', ['hit', 'impact', 'crit', 'hitFlesh', 'hitMetal', 'hitCrystal', 'hitEnergy', 'kill', 'killFlesh', 'killMetal', 'killCrystal', 'killEnergy', 'hurt', 'die']],
    ['World', ['mem', 'beacon', 'rift', 'boss', 'warn', 'bossWarn', 'boom', 'explode']],
    ['Menus', ['ui', 'confirm', 'deny', 'buy', 'level']],
  ];
  const NAMES = {
    jump: 'Jump', djump: 'Double jump', land: 'Landing', dash: 'Phase Dash', dash2: 'Charge / blink', whoosh: 'Falling attack',
    swing: 'Swing', slash: 'Slash', heavy: 'Heavy blow', shoot: 'Basic shot', shot: 'Projectile skill', laser: 'Laser',
    zap: 'Lightning', fire: 'Fire', cold: 'Cold', void: 'Void', light: 'Light', burst: 'Nova burst', slam: 'Slam', skill: 'Skill cast', chime: 'Ward / ground', heal: 'Heal', shimmer: 'Stealth', deploy: 'Summon / turret', roar: 'Warcry', finisher: 'Finisher',
    hit: 'Hit', impact: 'Impact', crit: 'Critical hit', hitFlesh: 'Hit: creature', hitMetal: 'Hit: machine', hitCrystal: 'Hit: crystal', hitEnergy: 'Hit: energy', kill: 'Kill', killFlesh: 'Kill: creature', killMetal: 'Kill: machine', killCrystal: 'Kill: crystal', killEnergy: 'Kill: energy', hurt: 'You get hit', die: 'You die',
    mem: 'Memory pickup', beacon: 'Beacon', rift: 'Rift', boss: 'Boss appears', warn: 'Enemy telegraph', bossWarn: 'Boss telegraph', boom: 'Big impact', explode: 'Explosion',
    ui: 'Menu click', confirm: 'Confirm', deny: 'Not allowed', buy: 'Purchase', level: 'Level up / success',
  };
  GV.SFX_NAMES = NAMES;

  // ---------- the bus: compressor + reverb ----------
  let bus = null, noiseBuf = null;
  function ensureBus() {
    const c = AU.ctx; if (!c) return null;
    if (bus && bus.c === c) return bus;
    const input = c.createGain(), comp = c.createDynamicsCompressor(), send = c.createGain(), verb = c.createConvolver(), wet = c.createGain();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
    // a synthetic space: 1.8s of decaying stereo noise, darker as it fades
    const len = Math.floor(c.sampleRate * 1.8), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); let lp = 0; for (let i = 0; i < len; i++) { const k = i / len; lp = lp * (0.2 + 0.75 * k) + (Math.random() * 2 - 1) * (1 - 0.75 * k); d[i] = lp * Math.pow(1 - k, 2.6) * 0.5; } }
    verb.buffer = ir; wet.gain.value = 0.9;
    input.connect(comp); send.connect(verb); verb.connect(wet); wet.connect(comp); comp.connect(AU.master);
    bus = { c, input, send };
    return bus;
  }
  function noise(c) {
    if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.8, c.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  // Where a sound sits left/right: from a world x, relative to the player.
  function panFor(x) {
    const p = GV.game && GV.game.play, pl = p && p.player;
    if (x == null || !pl) return 0;
    return Math.max(-0.8, Math.min(0.8, (x - pl.cx) / 650));
  }

  // ---------- custom sounds ----------
  const custom = {}; // name → AudioBuffer
  const rawCustom = {}; // name → ArrayBuffer (decoded once the audio context exists)
  GV.sfxCustom = { has: (n) => !!(custom[n] || rawCustom[n]), names: () => Object.keys(Object.assign({}, rawCustom, custom)) };
  function decodePending() {
    const c = AU.ctx; if (!c) return;
    for (const n of Object.keys(rawCustom)) {
      const ab = rawCustom[n]; delete rawCustom[n];
      c.decodeAudioData(ab.slice(0)).then((buf) => { custom[n] = buf; }).catch(() => {});
    }
  }
  // this device: IndexedDB
  const DB = 'gv_sfx', ST = 'sounds';
  const db = () => new Promise((res, rej) => { if (!window.indexedDB) return rej(new Error('no storage')); const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const store = (mode) => db().then((d) => d.transaction(ST, mode).objectStore(ST));
  const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  GV.sfxCustom.save = async (name, file) => { const ab = await file.arrayBuffer(); const s = await store('readwrite'); await req(s.put({ ab, file: file.name }, name)); rawCustom[name] = ab; delete custom[name]; decodePending(); };
  GV.sfxCustom.remove = async (name) => { const s = await store('readwrite'); await req(s.delete(name)); delete custom[name]; delete rawCustom[name]; loadShipped(name); };
  GV.sfxCustom.fileOf = {};
  async function loadDevice() {
    try {
      const s = await store('readonly'); const keys = await req(s.getAllKeys());
      for (const k of keys) { const s2 = await store('readonly'); const v = await req(s2.get(k)); if (v && v.ab) { rawCustom[k] = v.ab; GV.sfxCustom.fileOf[k] = v.file; } }
      decodePending();
    } catch (e) { /* no storage: fine */ }
  }
  // everyone: sfx/manifest.json in the game's files, e.g. { "jump": "jump.ogg", "hitMetal": "clang.wav" }
  let shipped = {};
  async function loadShipped(only) {
    try {
      if (!only) { const r = await fetch('sfx/manifest.json', { cache: 'no-cache' }); if (!r.ok) return; shipped = await r.json(); }
      for (const [n, f] of Object.entries(shipped)) {
        if (only && n !== only) continue;
        if (GV.sfxCustom.fileOf[n]) continue; // your own device file wins
        const r2 = await fetch('sfx/' + f); if (!r2.ok) continue;
        rawCustom[n] = await r2.arrayBuffer();
      }
      decodePending();
    } catch (e) { /* no folder: fine */ }
  }
  GV.sfxCustom.shipped = () => shipped;
  loadDevice().then(() => loadShipped());

  // ---------- playing ----------
  let voices = 0, voiceT = 0;
  const lastAt = {};
  const old = AU.play;
  AU.play = function (name, opts = {}) {
    const c = this.ctx; if (!c || this.muted) return;
    decodePending();
    const rec = R[name], buf = custom[name];
    if (!rec && !buf) return old ? old.call(this, name, opts) : this.sfx0 && this.sfx0(name);
    const now = c.currentTime;
    if (!opts.force && now - (lastAt[name] || 0) < (opts.gap || 0.035)) return;
    if (now - voiceT > 0.1) { voiceT = now; voices = 0; }
    if (++voices > 16 && !opts.force) return;
    lastAt[name] = now;
    const B = ensureBus(); if (!B) return;
    const pitch = opts.pitch || 1 + (Math.random() - 0.5) * 0.1, vol = opts.vol == null ? 1 : opts.vol;
    const out = c.createGain(); out.gain.value = vol;
    let node = out;
    if (c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = opts.pan != null ? opts.pan : panFor(opts.x); out.connect(pn); node = pn; }
    node.connect(B.input);
    const rv = rec ? rec.rv || 0 : 0.15;
    if (rv > 0) { const sg = c.createGain(); sg.gain.value = rv; node.connect(sg); sg.connect(B.send); }
    try {
      if (buf) { // your own sound
        const s = c.createBufferSource(); s.buffer = buf; s.playbackRate.value = opts.pitch || 1 + (Math.random() - 0.5) * 0.06;
        const g = c.createGain(); g.gain.value = 0.9; s.connect(g); g.connect(out); s.start(now);
        return;
      }
      for (const layer of rec.L) {
        const p = layer.o || layer.n, t = now + (p.at || 0), a = p.a || 0.003;
        const g = c.createGain(); g.connect(out);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(p.v, t + a); g.gain.exponentialRampToValueAtTime(0.0004, t + Math.max(a + 0.01, p.d));
        if (layer.o) {
          const o = c.createOscillator();
          o.type = p.w; o.frequency.setValueAtTime(p.f * pitch, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, p.f2 * pitch), t + p.d);
          o.detune.value = (p.det || 0) + (Math.random() - 0.5) * 14;
          o.connect(g); o.start(t); o.stop(t + p.d + 0.05);
        } else {
          const s = c.createBufferSource(), f = c.createBiquadFilter();
          s.buffer = noise(c); f.type = p.type; f.Q.value = p.q || 1;
          f.frequency.setValueAtTime(p.f * pitch, t); if (p.f2) f.frequency.exponentialRampToValueAtTime(p.f2 * pitch, t + p.d);
          s.connect(f); f.connect(g); s.start(t, Math.random() * 0.4); s.stop(t + p.d + 0.05);
        }
      }
    } catch (e) { /* audio glitch: skip this one */ }
  };
  // The old single-oscillator sfx() calls now play the layered versions (or your own files).
  AU.sfx0 = AU.sfx;
  AU.sfx = function (type, opts) { if (R[type] || custom[type]) return AU.play(type, Object.assign({ gap: 0.03 }, opts || {})); return AU.sfx0.call(this, type); };
  GV.sfxPreview = (name) => { AU.unlock(); setTimeout(() => AU.play(name, { force: true, pan: 0 }), 30); };
})();
