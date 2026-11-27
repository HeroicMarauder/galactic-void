// Galactic Void — the backgrounds breathe with the music. An analyser listens to whatever music is playing
// (Void Radio, your own tracks, or the generated score) and turns it into a few smooth signals:
//   bass  — kicks and low hits      → the nebula, the black hole and the ship's lights pulse
//   level — how loud the song is     → backgrounds brighten in big passages and dim in quiet ones
//   high  — cymbals and shimmer      → stars and console lights twinkle
//   kick  — a beat that just landed  → a soft swell that fades
// Settings → Music pulse: Full, Subtle or Off. It eases back during fights, and stays off if the device
// asks for reduced motion.
(function () {
  const GV = window.GV;
  const P = (GV.pulse = { bass: 0, level: 0, high: 0, kick: 0, amt: 0, on: false });
  const setting = () => { const v = GV.settings && GV.settings.data && GV.settings.data.musicPulse; return v === 'off' || v === 'subtle' ? v : 'full'; };
  const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  let an = null, ctxOf = null, freq = null, wave = null, tapped = new Set();
  function attach() {
    const A = GV.audio, c = A && A.ctx;
    if (!c) return false;
    if (ctxOf !== c) {
      an = c.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.55;
      const sink = c.createGain(); sink.gain.value = 0; an.connect(sink); sink.connect(c.destination); // keeps the analyser running, silently
      freq = new Uint8Array(an.frequencyBinCount); wave = new Uint8Array(an.fftSize);
      ctxOf = c; tapped = new Set();
    }
    // tap every music source we can find (they're created lazily, so keep looking)
    for (const node of [GV.soundtrack && GV.soundtrack.bus, GV.music && GV.music.gain]) {
      if (node && !tapped.has(node)) { try { node.connect(an); tapped.add(node); } catch (e) { /* not ready */ } }
    }
    return tapped.size > 0;
  }

  // per-band running peaks, so quiet and loud songs both pulse properly
  const peak = { bass: 0.25, level: 0.15, high: 0.15 };
  const avg = { bass: 0, slow: 0.3 };
  let lastKick = 0, last = performance.now();
  function band(lo, hi) {
    const ny = ctxOf.sampleRate / 2, n = freq.length;
    const a = Math.max(1, Math.floor((lo / ny) * n)), b = Math.min(n - 1, Math.ceil((hi / ny) * n));
    let s = 0; for (let i = a; i <= b; i++) s += freq[i];
    return s / ((b - a + 1) * 255);
  }
  const ease = (cur, target, up, down, dt) => cur + (target - cur) * (1 - Math.exp(-(target > cur ? up : down) * dt));

  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const A = GV.audio;
    const mode = setting();
    let want = mode === 'off' || reduced.matches || !A || A.muted ? 0 : mode === 'subtle' ? 0.5 : 1;
    // ease back in a fight: anything awake and close to you
    const p = GV.game && GV.game.play;
    if (want && p && p.player && !(p.L && p.L.hall)) {
      const pl = p.player;
      let near = 0; for (const e of p.enemies || []) { if (!e.dead && !(e.def && e.def.static) && Math.abs(e.x - pl.cx) < 520 && Math.abs(e.y - pl.cy) < 360) { near++; if (near > 1) break; } }
      if (near || (p.boss && !p.boss.dead)) want *= 0.4;
    }
    P.amt = ease(P.amt, want, 3, 1.5, dt);
    let bass = 0, level = 0, high = 0;
    if (P.amt > 0.01 && attach()) {
      an.getByteFrequencyData(freq); an.getByteTimeDomainData(wave);
      bass = band(30, 160); high = band(3500, 11000);
      let s = 0; for (let i = 0; i < wave.length; i++) { const v = (wave[i] - 128) / 128; s += v * v; } level = Math.sqrt(s / wave.length);
      for (const k of ['bass', 'level', 'high']) { const v = { bass, level, high }[k]; peak[k] = Math.max(v, peak[k] * Math.exp(-dt * 0.25), k === 'bass' ? 0.12 : 0.05); }
      bass = Math.min(1, bass / peak.bass); level = Math.min(1, level / peak.level); high = Math.min(1, high / peak.high);
      // a beat: bass jumps clearly above its recent average
      avg.bass = ease(avg.bass, bass, 2.5, 2.5, dt);
      if (bass - avg.bass > 0.16 && now - lastKick > 220) { lastKick = now; P.kick = 1; }
      // punch: how far the bass stands above its slow baseline, so sustained bass doesn't keep everything lit
      avg.slow = ease(avg.slow, bass, 0.7, 0.7, dt);
      bass = Math.max(0, Math.min(1, (bass - avg.slow * 0.75) / Math.max(0.2, 1 - avg.slow * 0.75)));
      P.on = true;
    } else P.on = false;
    // shape: fast up, slow down, so it breathes rather than flickers
    P.bass = ease(P.bass, bass, 20, 7, dt);
    P.level = ease(P.level, level, 6, 1.6, dt);
    P.high = ease(P.high, high, 14, 4, dt);
    P.kick *= Math.exp(-dt * 4.5);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  // handy: a signal scaled by the current strength
  GV.pulseOf = (k) => (P[k] || 0) * P.amt;

  // ---------- the stage backgrounds ----------
  const A = GV.art;
  const draw0 = A.drawBackground;
  const stars = (seed) => { const out = []; let s = seed || 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 70; i++) out.push([r() * GV.CFG.W, r() * 420, r() * 6.28, 0.6 + r() * 1.6]); return out; };
  A.drawBackground = function (ctx, bg, cam, t, pal) {
    draw0.apply(this, arguments);
    const amt = P.amt; if (amt < 0.02 || !pal) return;
    const W = GV.CFG.W, b = P.bass * amt, lv = P.level * amt, hi = P.high * amt, kk = P.kick * amt;
    if (b + lv + hi + kk < 0.02) return;
    const bx = W * 0.68 - cam.x * 0.025, by = 165 - cam.y * 0.03;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // the whole nebula breathes with the song, swelling on each beat
    const wash = ctx.createRadialGradient(bx, by, 40, bx, by, W * 0.75);
    wash.addColorStop(0, `hsla(${pal.hB},90%,60%,${0.1 * lv + 0.14 * kk})`); wash.addColorStop(0.5, `hsla(${pal.hA},85%,55%,${0.05 * lv + 0.07 * kk})`); wash.addColorStop(1, 'hsla(0,0%,0%,0)');
    ctx.fillStyle = wash; ctx.fillRect(0, 0, W, 540);
    // the black hole's corona thumps with the bass
    // a ring around the event horizon (the hole itself stays black)
    const R = 64 * (2.9 + 1.2 * b), r0 = 64 * 1.15;
    const core = ctx.createRadialGradient(bx, by, r0, bx, by, R);
    core.addColorStop(0, 'hsla(0,0%,0%,0)'); core.addColorStop(0.12, `hsla(${pal.hA},95%,66%,${0.24 * b})`); core.addColorStop(0.45, `hsla(${pal.hB},95%,58%,${0.12 * b})`); core.addColorStop(1, 'hsla(0,0%,0%,0)');
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(bx, by, R, 0, Math.PI * 2); ctx.fill();
    // the horizon glows from below on the low end
    const hz = ctx.createLinearGradient(0, 540, 0, 300);
    hz.addColorStop(0, `hsla(${pal.hA},90%,55%,${0.16 * b + 0.06 * lv})`); hz.addColorStop(1, 'hsla(0,0%,0%,0)');
    ctx.fillStyle = hz; ctx.fillRect(0, 300, W, 240);
    // stars sparkle on the highs
    if (hi > 0.04 && !GV.settings.saver()) {
      const S = bg.pulseStars || (bg.pulseStars = stars(Math.round((pal.hA || 3) * 131 + (pal.hB || 5))));
      for (const [x0, y, ph, sz] of S) {
        const tw = Math.max(0, Math.sin(t * 3.1 + ph * 5) * 0.5 + 0.5) * hi;
        if (tw < 0.05) continue;
        const x = ((x0 - cam.x * 0.06) % W + W) % W;
        ctx.globalAlpha = Math.min(1, tw * 1.3); ctx.fillStyle = `hsla(${pal.hB},60%,88%,1)`;
        ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
        if (tw > 0.45) { ctx.fillRect(x - sz * 2.2, y - 0.5, sz * 4.4, 1); ctx.fillRect(x - 0.5, y - sz * 2.2, 1, sz * 4.4); }
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };
})();
