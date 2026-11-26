// Galactic Void — races. Each race changes how your spaceman looks and gives one small perk, worth
// about one good passive node. New characters choose a race after their class; existing characters
// can change theirs in the Wardrobe.
(function () {
  const GV = window.GV, A = GV.art, M = GV.menus;

  GV.RACES = {
    human: { name: 'Human', tag: 'The ones who built the Lantern', look: 'The classic suit, nothing added.', perk: '+1 passive point at ranks 10, 20 and 30', color: '#8fe9ff', stats: {} },
    synth: { name: 'Synth', tag: 'Android crew, still under warranty', look: 'Plated frame with glowing seams.', perk: '+40 Armour and 10% increased Armour', color: '#7dffe0', stats: { armour: 40, armourPct: 10 } },
    voidborn: { name: 'Voidborn', tag: 'Born where the light gave out', look: 'Shadow clings to them and flickers at the edges.', perk: '+5% chance to evade hits', color: '#b48cff', stats: { evasion: 5 } },
    kethari: { name: 'Kethari', tag: 'Chitin-clad hive scouts', look: 'Antennae through the helmet, a hard carapace.', perk: '6% increased attack speed', color: '#c8ff6a', stats: { atkSpd: 6 } },
    lumari: { name: 'Lumari', tag: 'Light that learned to walk', look: 'A soft glow and a halo shimmer.', perk: '10% increased Charge regeneration', color: '#fff0b0', stats: { chargeRegenPct: 10 } },
    drakkari: { name: 'Drakkari', tag: 'Scaled, patient, very hard to kill', look: 'A heavy tail and a ridge of scales.', perk: '8% increased maximum Life', color: '#7fe08c', stats: { lifePct: 8 } },
  };
  const D = () => GV.save.data;
  GV.raceOf = (d = D()) => (d && GV.RACES[d.race] ? d.race : 'human');
  GV.raceStats = () => (GV.RACES[GV.raceOf()] || {}).stats || {};

  // Human: an extra passive point at ranks 10, 20 and 30
  if (GV.TREE && GV.TREE.total) {
    const t0 = GV.TREE.total;
    GV.TREE.total = function () { const L = (D() && D().level) || 1; return t0.call(this) + (GV.raceOf() === 'human' ? Math.min(3, Math.floor(L / 10)) : 0); };
  }
  // ---------- looks ----------
  // Drawn behind and in front of the suit, in the model's own space: feet at 0, facing +x.
  const LOOK = {
    drakkari: {
      back(ctx, o, t, k) {
        const sw = Math.sin(t * 3) * 3 + (o.run ? Math.sin(t * 11.5) * 3 : 0), base = k.c.accent || '#4f8a5e', c = k.fl ? '#fff' : A.modelShade ? A.modelShade(base, -0.12) : base, c2 = k.fl ? '#fff' : A.modelShade ? A.modelShade(base, 0.25) : base;
        const pts = k.c.tail === 'short' ? [[-6, -20 - k.bob], [-13, -15 + sw * 0.3], [-19, -10 + sw * 0.6], [-23, -6 + sw * 0.8]] : [[-6, -20 - k.bob], [-16, -16 + sw * 0.3], [-25, -9 + sw * 0.7], [-32, -3 + sw]];
        for (let i = 0; i < pts.length - 1; i++) {
          ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.lineWidth = 7 - i * 2;
          ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
        }
        ctx.fillStyle = c2;
        for (let i = 0; i < 3; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], mx = (x0 + x1) / 2, my = (y0 + y1) / 2; ctx.beginPath(); ctx.moveTo(mx - 2.5, my - 2); ctx.lineTo(mx, my - 6 + i); ctx.lineTo(mx + 2.5, my - 2); ctx.fill(); }
      },
      front(ctx, o, t, k) {
        if (k.noHelm) return;
        ctx.fillStyle = k.fl ? '#fff' : (k.c.accent || '#5fae74');
        for (let i = 0; i < 4; i++) { const a = -2.2 + i * 0.38, r = 10.6, x = Math.cos(a) * r, y = k.hy + Math.sin(a) * r; ctx.beginPath(); ctx.moveTo(x - 2, y + 1); ctx.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); ctx.lineTo(x + 2, y + 1); ctx.fill(); }
      },
    },
    kethari: {
      front(ctx, o, t, k) {
        const c = k.fl ? '#fff' : '#8fbf4a', tip = k.fl ? '#fff' : (k.c.accent || '#d8ff6a'), w = Math.sin(t * 4) * 1.5;
        ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        const st = k.c.antenna === 'straight', a1 = st ? [-6, k.hy - 30 + w] : [-14 + w, k.hy - 26], a2 = st ? [4, k.hy - 32 - w] : [1 - w, k.hy - 29];
        ctx.beginPath(); ctx.moveTo(-2, k.hy - 9); if (st) ctx.lineTo(a1[0], a1[1]); else ctx.quadraticCurveTo(-8, k.hy - 20, a1[0], a1[1]); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3, k.hy - 10); if (st) ctx.lineTo(a2[0], a2[1]); else ctx.quadraticCurveTo(4, k.hy - 22, a2[0], a2[1]); ctx.stroke();
        ctx.fillStyle = tip; A.circle(ctx, a1[0], a1[1], 1.8); A.circle(ctx, a2[0], a2[1], 1.8);
        if (!k.fl && !k.low) { A.glow(ctx, a1[0], a1[1], 6, 'rgba(216,255,106,0.6)'); A.glow(ctx, a2[0], a2[1], 6, 'rgba(216,255,106,0.6)'); }
        // carapace plates on the back of the suit
        ctx.fillStyle = k.fl ? '#fff' : 'rgba(120,160,70,0.85)';
        for (let i = 0; i < 3; i++) { A.ellipse(ctx, -8, -34 + i * 6 - k.bob, 3.2, 2.4); }
      },
    },
    lumari: {
      back(ctx, o, t, k) { if (!k.fl && !k.low) A.glow(ctx, 0, -30 - k.bob, 40 + Math.sin(t * 2) * 4, A.alpha ? A.alpha(k.c.accent || '#fff0b4', 0.28) : 'rgba(255,240,180,0.28)'); },
      front(ctx, o, t, k) {
        ctx.strokeStyle = k.fl ? '#fff' : `rgba(255,240,180,${0.55 + Math.sin(t * 3) * 0.2})`; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(-1, k.hy - 15, 8, 2.6, 0, 0, Math.PI * 2); ctx.stroke();
        if (!k.fl && !k.low) for (let i = 0; i < 3; i++) { const a = t * 1.4 + i * 2.1; ctx.fillStyle = 'rgba(255,245,200,0.8)'; A.circle(ctx, Math.cos(a) * 16, -30 - k.bob + Math.sin(a * 1.3) * 14, 1.1); }
      },
    },
    synth: {
      front(ctx, o, t, k) {
        const c = k.fl ? '#fff' : A.alpha ? A.alpha(k.c.accent || '#7dffe0', 0.6 + Math.sin(t * 4) * 0.25) : '#7dffe0';
        ctx.strokeStyle = c; ctx.lineWidth = 1;
        const y0 = -37 - k.bob;
        ctx.beginPath(); ctx.moveTo(-4, y0 + 3); ctx.lineTo(-4, y0 + 15); ctx.moveTo(3, y0 + 2); ctx.lineTo(3, y0 + 16); ctx.moveTo(-6, y0 + 9); ctx.lineTo(6, y0 + 9); ctx.stroke();
        if (k.noHelm) return;
        ctx.fillStyle = c; ctx.fillRect(-7, k.hy - 2, 2.2, 5);
        if (!k.fl && !k.low) A.glow(ctx, -6, k.hy, 6, 'rgba(125,255,224,0.5)');
      },
    },
    voidborn: {
      back(ctx, o, t, k) {
        if (k.fl) return;
        const j = Math.sin(t * 17) > 0.6 ? 2.5 : 0;
        if (!k.low) A.glow(ctx, -j, -28 - k.bob, 40, 'rgba(110,50,180,0.45)');
        ctx.fillStyle = 'rgba(25,8,45,0.7)'; A.ellipse(ctx, -3 - j, -28 - k.bob, 14, 27);
        // trailing shadow wisps
        for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * 2.1; ctx.fillStyle = `rgba(70,30,120,${0.35 + 0.2 * Math.sin(a)})`; A.ellipse(ctx, -14 - i * 5 + Math.sin(a) * 2, -40 + i * 12 - k.bob, 4 - i * 0.8, 6); }
      },
      front(ctx, o, t, k) {
        if (k.fl || k.low) return;
        for (let i = 0; i < 6; i++) { const a = t * 2 + i * 1.05, r = 13 + Math.sin(t * 3 + i) * 3; ctx.fillStyle = A.alpha ? A.alpha(k.c.accent || '#aa78ff', 0.5 + 0.3 * Math.sin(t * 5 + i)) : '#aa78ff'; A.circle(ctx, Math.cos(a) * r - 2, -28 - k.bob + Math.sin(a) * r * 1.6, 1.7); }
      },
    },
  };
  const sm0 = A.spaceman;
  A.spaceman = function (ctx, x, y, o = {}) {
    const L = o.race && LOOK[o.race];
    if (!L) return sm0(ctx, x, y, o);
    const t = o.t || 0, breathe = Math.sin(t * 2.1), bob = o.run ? Math.abs(Math.sin(t * 11.5)) * 2.2 - 0.6 : o.air ? 0 : breathe * 0.6;
    const k = { bob, hy: -49 - bob, fl: !!o.flash, low: !!(GV.CFG && GV.CFG.LOWFX), c: Object.assign({}, GV.LOOK_DEFAULT || {}, o.custom || {}), noHelm: !!o.noHelm || (o.custom && o.custom.helmet === false) };
    const frame = (fn) => {
      if (!fn) return;
      ctx.save(); ctx.translate(x, y); if (o.scale) ctx.scale(o.scale, o.scale); ctx.scale(o.facing || 1, 1);
      ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
      try { fn(ctx, o, t, k); } finally { ctx.restore(); }
    };
    frame(L.back);
    sm0(ctx, x, y, o);
    frame(L.front);
  };

  // the player's model wears their race
  const draw0 = GV.Player.prototype.draw;
  GV.Player.prototype.draw = function (ctx, p) {
    const sm = A.spaceman, me = this;
    const m = GV.save.main || GV.save.data;
    const race = me._race || (me.slot === 1 && m && m.coop && m.coop.on && m.coop.p2 ? GV.raceOf(m.coop.p2) : GV.raceOf(m)); // online partners carry theirs; couch Player 2 has their own
    A.spaceman = function (c, x, y, o = {}) { return sm(c, x, y, o.race ? o : Object.assign({}, o, { race })); };
    try { return draw0.call(this, ctx, p); } finally { A.spaceman = sm; }
  };

  // ---------- choosing ----------
  let anim = 0;
  function previews(cls) {
    cancelAnimationFrame(anim);
    const c = GV.CLASSES[cls] || {}, look = c.look || {}, kit = GV.kitLook ? GV.kitLook({ cls, equip: {} }) : null;
    const loop = (ms) => {
      const cvs = document.querySelectorAll('#ui canvas.raceCv');
      if (!cvs.length) return;
      const t = ms / 1000;
      for (const cv of cvs) {
        const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
        A.spaceman(g, cv.width / 2, cv.height - 14, { facing: 1, t, scale: 2.4, race: cv.dataset.r, cloak: look.cloak, visor: look.visor, visorGlow: look.glow, suit: look.suit, gear: c.weapon && GV.WEAPONS[c.weapon] && GV.WEAPONS[c.weapon].art, gearColor: c.weapon && GV.WEAPONS[c.weapon] && GV.WEAPONS[c.weapon].color, kit: kit || (c.kit ? { helm: c.kit.helm, suit: c.kit.suit, boots: c.kit.boots, c: {} } : undefined) });
      }
      anim = requestAnimationFrame(loop);
    };
    anim = requestAnimationFrame(loop);
  }
  const cards = (cls, cur) => Object.keys(GV.RACES).map((k) => {
    const R = GV.RACES[k];
    return `<button class="race ${cur === k ? 'sel' : ''}" data-a="race" data-k="${k}" style="--c:${R.color}">
      <canvas class="raceCv" data-r="${k}" width="150" height="170"></canvas>
      <b>${M.esc(R.name)}</b><small>${M.esc(R.tag)}</small><em>${M.esc(R.perk)}</em></button>`;
  }).join('');

  // after picking a class for a new character
  GV.raceSelect = function (cls, done, back) {
    M.render(`<div class="screen panel wide racesel">
      <h2>Choose your race</h2>
      <p class="muted">Your race changes how you look and gives one small perk. You can change it later in the Wardrobe.</p>
      <div class="racerow">${cards(cls, null)}</div>
      <div class="menu row"><button class="ghost" data-a="back">Back</button></div></div>`, (a, b) => {
      if (a === 'back') { cancelAnimationFrame(anim); return back(); }
      if (a === 'race') { cancelAnimationFrame(anim); GV.audio.sfx('level'); done(b.dataset.k); }
    }, back);
    previews(cls);
  };

  // the Wardrobe gets a Race section for existing characters
  GV.raceChange = function (back) {
    const d = D(), cur = GV.raceOf(d), free = !d.raceChanged, COST = 300;
    M.render(`<div class="screen panel wide racesel">
      <div class="topbar"><h2>Race</h2><div class="stats">✦ ${d.memories}</div></div>
      <p class="muted">${free ? 'Your first change is free.' : `Changing race costs ${COST} ✦.`} Your class, gear and progress stay the same.</p>
      <div class="racerow">${cards(d.cls, cur)}</div>
      <div class="menu row"><button data-a="back">Back</button></div></div>`, (a, b) => {
      if (a === 'back') { cancelAnimationFrame(anim); return back(); }
      if (a === 'race') {
        const k = b.dataset.k; if (k === cur) return;
        if (!free && d.memories < COST) { GV.audio.sfx('hurt'); return; }
        if (!free) d.memories -= COST;
        d.race = k; d.raceChanged = true; GV.save.write(); GV.audio.sfx('level');
        const g = GV.game && GV.game.play; if (g && g.player && g.player.recalc) g.player.recalc();
        GV.raceChange(back);
      }
    }, back);
    previews(d.cls);
  };
})();

// ---------------- appearance: faces, colours, build, markings, and the character creator ----------------
(function () {
  const GV = window.GV, A = GV.art, M = GV.menus;
  const shade = A.modelShade || ((c) => c);
  const D = () => GV.save.data;

  GV.LOOK_DEFAULT = { name: '', build: 'std', helmet: true, helm: 'auto', suit: '', trim: '', visor: '', cloak: '', marks: 'none', skin: '#d9a98a', hair: 'short', hairC: '#3a2a20', accent: '', tail: 'long', antenna: 'curled' };
  GV.lookOf = (d = D()) => Object.assign({}, GV.LOOK_DEFAULT, (d && d.look) || {});

  // ---------- heads (helmet off) ----------
  // Helmet space: head centred on 0,0, about 10 across, facing +x.
  const HEADS = {
    human(ctx, c, t, fl) {
      const W = (x) => (fl ? '#fff' : x);
      ctx.fillStyle = W(c.skin); A.ellipse(ctx, 0.5, 0.5, 8.6, 9.6);
      ctx.fillStyle = W(shade(c.skin, -0.2)); A.ellipse(ctx, -2.5, 1.5, 2, 2.6); // ear
      ctx.fillStyle = W('#1c1a22'); A.ellipse(ctx, 5.2, -1, 1.1, 1.5);
      ctx.strokeStyle = W(shade(c.skin, -0.35)); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(4.5, 4.6); ctx.lineTo(7.2, 4.2); ctx.stroke();
      ctx.fillStyle = W(c.hairC);
      if (c.hair === 'short') { ctx.beginPath(); ctx.ellipse(-0.5, -3.5, 9, 6.5, 0, Math.PI, Math.PI * 2.08); ctx.fill(); ctx.fillRect(-9, -4, 5, 6); }
      else if (c.hair === 'long') { ctx.beginPath(); ctx.ellipse(-0.5, -3.5, 9.4, 7, 0, Math.PI, Math.PI * 2.1); ctx.fill(); A.rrect(ctx, -10, -4, 7, 15, 3); }
      else if (c.hair === 'mohawk') { ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-2, -14); ctx.lineTo(1, -9); ctx.lineTo(4, -13); ctx.lineTo(5, -7); ctx.closePath(); ctx.fill(); }
      else if (c.hair === 'bun') { ctx.beginPath(); ctx.ellipse(-0.5, -3.5, 9, 6.5, 0, Math.PI, Math.PI * 2.05); ctx.fill(); A.circle(ctx, -8, -6, 3.6); }
    },
    synth(ctx, c, t, fl) {
      const W = (x) => (fl ? '#fff' : x), acc = c.accent || '#7dffe0';
      const g = ctx.createLinearGradient(0, -10, 0, 10); g.addColorStop(0, W('#c9d0dc')); g.addColorStop(1, W('#6a7488'));
      ctx.fillStyle = g; A.rrect(ctx, -8, -9.5, 16.5, 19, 5);
      ctx.fillStyle = W('#1a1f2a'); A.rrect(ctx, 1.5, -3.5, 7, 3.6, 1.5);
      ctx.fillStyle = W(acc); ctx.fillRect(2.5, -2.6, 5.4, 1.8); if (!fl) A.glow(ctx, 5, -1.7, 8, acc);
      ctx.strokeStyle = W('#4a5262'); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-8, 1); ctx.lineTo(8.5, 1); ctx.moveTo(-2, -9.5); ctx.lineTo(-2, 9.5); ctx.stroke();
      ctx.fillStyle = W('#9aa4b8'); ctx.fillRect(3, 4.5, 4.5, 1);
    },
    voidborn(ctx, c, t, fl) {
      const W = (x) => (fl ? '#fff' : x), acc = c.accent || '#b48cff';
      ctx.fillStyle = W('#1d1230'); A.ellipse(ctx, 0.5, 0.5, 8.8, 9.8);
      if (!fl) for (let i = 0; i < 4; i++) { const a = t * 2 + i; ctx.fillStyle = 'rgba(60,25,100,0.55)'; A.ellipse(ctx, -5 + i * 2.2, -9 - Math.abs(Math.sin(a)) * 3, 2.2, 3.2); }
      ctx.fillStyle = W(acc); A.ellipse(ctx, 5, -1.5, 1.6, 1.1); A.ellipse(ctx, 1.6, -1.8, 1.2, 0.9);
      if (!fl) A.glow(ctx, 4, -1.5, 9, acc);
    },
    kethari(ctx, c, t, fl) {
      const W = (x) => (fl ? '#fff' : x);
      const g = ctx.createRadialGradient(-2, -4, 1, 0, 0, 12); g.addColorStop(0, W('#9fc25a')); g.addColorStop(1, W('#4c6a26'));
      ctx.fillStyle = g; A.ellipse(ctx, 0.5, 0, 8.4, 10.2);
      ctx.fillStyle = W('#141a10'); A.ellipse(ctx, 4.4, -2, 3.6, 4.4);
      if (!fl) { ctx.fillStyle = 'rgba(200,255,140,0.55)'; A.circle(ctx, 3.4, -3.6, 1.1); }
      ctx.strokeStyle = W('#3a4e1c'); ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(6, 6); ctx.quadraticCurveTo(10, 7, 9, 10); ctx.moveTo(4, 7); ctx.quadraticCurveTo(7, 10, 5, 12); ctx.stroke();
    },
    lumari(ctx, c, t, fl) {
      const W = (x) => (fl ? '#fff' : x), acc = c.accent || '#fff0b0';
      if (!fl) A.glow(ctx, 0, 0, 20, acc);
      const g = ctx.createRadialGradient(-1, -2, 1, 0, 0, 11); g.addColorStop(0, W('#ffffff')); g.addColorStop(1, W(acc));
      ctx.fillStyle = g; A.ellipse(ctx, 0.5, 0.5, 8.4, 9.6);
      ctx.fillStyle = W('#6a5a8a'); A.ellipse(ctx, 5, -1, 0.9, 1.6); A.ellipse(ctx, 2, -1.2, 0.8, 1.4);
    },
    drakkari(ctx, c, t, fl) {
      const W = (x) => (fl ? '#fff' : x), sc = c.accent || '#4f8a5e';
      const g = ctx.createLinearGradient(0, -10, 0, 10); g.addColorStop(0, W(shade(sc, 0.25))); g.addColorStop(1, W(shade(sc, -0.3)));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.quadraticCurveTo(-2, -12, 5, -7); ctx.quadraticCurveTo(14, -4, 14, 1); ctx.quadraticCurveTo(13, 5, 5, 6); ctx.quadraticCurveTo(-2, 11, -8, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = W('#ffd34a'); A.ellipse(ctx, 4.2, -3.2, 1.8, 1.4); ctx.fillStyle = W('#1a1a10'); ctx.fillRect(4, -4.4, 0.7, 2.4);
      ctx.strokeStyle = W(shade(sc, -0.45)); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(7, 3); ctx.lineTo(13.5, 1.6); ctx.stroke();
      ctx.fillStyle = W(shade(sc, -0.4)); A.circle(ctx, 12.6, -1.4, 0.6);
    },
  };
  A.drawHead = function (ctx, o, t, fl) {
    const c = Object.assign({}, GV.LOOK_DEFAULT, o.custom || {});
    (HEADS[o.race] || HEADS.human)(ctx, c, t, fl);
  };

  // ---------- markings on the suit (model space: feet at 0, facing +x) ----------
  function marks(ctx, o, t, k, c) {
    if (!c.marks || c.marks === 'none' || k.fl) return;
    const col = c.trim || o.visor || '#8fe9ff', y0 = -37 - k.bob;
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.globalAlpha *= 0.85; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    if (c.marks === 'stripes') { ctx.beginPath(); ctx.moveTo(-6, y0 + 4); ctx.lineTo(6, y0 + 12); ctx.moveTo(-6, y0 + 8); ctx.lineTo(6, y0 + 16); ctx.stroke(); }
    else if (c.marks === 'chevrons') { for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(-5, y0 + 5 + i * 5); ctx.lineTo(0, y0 + 9 + i * 5); ctx.lineTo(5, y0 + 5 + i * 5); ctx.stroke(); } }
    else if (c.marks === 'bars') { for (let i = 0; i < 3; i++) ctx.fillRect(1.5, y0 + 4 + i * 3, 5, 1.6); }
    else if (c.marks === 'sigil') { ctx.beginPath(); ctx.arc(1, y0 + 9, 4, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(1, y0 + 4); ctx.lineTo(1, y0 + 14); ctx.moveTo(-4, y0 + 9); ctx.lineTo(6, y0 + 9); ctx.stroke(); }
    ctx.restore();
  }

  // ---------- applying a look to the model ----------
  const BUILD = { slim: [0.9, 1], std: [1, 1], heavy: [1.13, 1.03] };
  const sm1 = A.spaceman;
  A.spaceman = function (ctx, x, y, o = {}) {
    const c = o.custom;
    if (!c) return sm1(ctx, x, y, o);
    const L = Object.assign({}, GV.LOOK_DEFAULT, c);
    const o2 = Object.assign({}, o);
    if (L.suit) o2.suit = L.suit;
    if (L.cloak) o2.cloak = L.cloak;
    if (L.visor) { o2.visor = L.visor; o2.visorGlow = A.alpha ? A.alpha(L.visor, 0.35) : o2.visorGlow; }
    if (o.kit || L.trim || L.helm !== 'auto') {
      const kit = Object.assign({ helm: 'dome', suit: 'cloak', boots: 'std' }, o.kit || {}); kit.c = Object.assign({}, (o.kit && o.kit.c) || {});
      if (L.trim) { kit.c.suit = L.trim; kit.c.helm = L.trim; kit.c.boots = L.trim; }
      if (L.helm && L.helm !== 'auto') kit.helm = L.helm;
      o2.kit = kit;
    }
    if (!L.helmet) o2.noHelm = true;
    const B = BUILD[L.build] || BUILD.std;
    ctx.save();
    if (B[0] !== 1 || B[1] !== 1) { ctx.translate(x, y); ctx.scale(B[0], B[1]); ctx.translate(-x, -y); }
    try {
      sm1(ctx, x, y, o2);
      // markings on top of the suit
      const t = o.t || 0, breathe = Math.sin(t * 2.1), bob = o.run ? Math.abs(Math.sin(t * 11.5)) * 2.2 - 0.6 : o.air ? 0 : breathe * 0.6;
      ctx.save(); ctx.translate(x, y); if (o.scale) ctx.scale(o.scale, o.scale); ctx.scale(o.facing || 1, 1); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
      marks(ctx, o2, t, { bob, fl: !!o.flash }, L);
      ctx.restore();
    } finally { ctx.restore(); }
  };
  if (!A.alpha) A.alpha = (c, a) => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return c; const n = parseInt(m[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  // the player's model wears their look (and online partners wear theirs)
  const draw1 = GV.Player.prototype.draw;
  GV.Player.prototype.draw = function (ctx, p) {
    const sm = A.spaceman, me = this;
    let custom = me._custom;
    if (custom === undefined) {
      const m = GV.save.main || GV.save.data;
      const src = me.slot === 1 && m && m.coop && m.coop.on && m.coop.p2 ? m.coop.p2 : m;
      custom = src && src.look ? GV.lookOf(src) : null;
    }
    A.spaceman = function (cx, x, y, o = {}) { return sm(cx, x, y, o.custom || !custom ? o : Object.assign({}, o, { custom })); };
    try { return draw1.call(this, ctx, p); } finally { A.spaceman = sm; }
  };

  // a named character shows its name in the roster
  if (GV.roster && GV.roster.label) {
    const lab0 = GV.roster.label;
    GV.roster.label = function (d) {
      const r = lab0.call(this, d), nm = d && d.look && d.look.name;
      if (nm) { const cls = d.cls && GV.CLASSES[d.cls]; r.sub = [cls ? cls.name : '', r.sub].filter(Boolean).join(' · '); r.name = nm; }
      return r;
    };
  }

  // ---------- the creator ----------
  const SW = {
    suit: ['', '#d5dae4', '#e6dcc4', '#9fb4d8', '#3a3f55', '#c9a8ff', '#ffb3b3', '#a8ffd8', '#2a2f3f'],
    trim: ['', '#8fe9ff', '#ffd36b', '#ff6a9a', '#7dffb0', '#c9a8ff', '#ff9a4a', '#ffffff', '#ff4a5a'],
    visor: ['', '#8fe9ff', '#ffd36b', '#ff6a9a', '#7dffb0', '#c9a8ff', '#ff9a4a', '#ffffff', '#ff3048'],
    cloak: ['', '#252a3b', '#3a2f1f', '#1c2b2a', '#2e1520', '#2a3f55', '#3b1a40', '#101318', '#5a2a1a'],
    skin: ['#f2d0b8', '#e0b89a', '#c9966f', '#a8714c', '#7a4e33', '#4e3020', '#c8d6e8', '#9ad0b0'],
    hairC: ['#1c1a22', '#3a2a20', '#7a4a2a', '#c8a060', '#e8e0d0', '#c03030', '#3070c0', '#9a50d0'],
    accent: ['', '#7dffe0', '#b48cff', '#c8ff6a', '#fff0b0', '#4f8a5e', '#ff9a4a', '#8fe9ff', '#ff6a9a'],
  };
  const OPT = {
    build: [['slim', 'Slim'], ['std', 'Standard'], ['heavy', 'Heavy']],
    helmet: [[true, 'Helmet on'], [false, 'Helmet off']],
    helm: [['auto', 'From your gear'], ['dome', 'Dome'], ['visor', 'Visor'], ['crest', 'Crest'], ['horned', 'Horned'], ['halo', 'Halo'], ['mask', 'Mask'], ['organic', 'Organic']],
    marks: [['none', 'None'], ['stripes', 'Stripes'], ['chevrons', 'Chevrons'], ['bars', 'Rank bars'], ['sigil', 'Sigil']],
    hair: [['short', 'Short'], ['long', 'Long'], ['mohawk', 'Mohawk'], ['bun', 'Bun'], ['none', 'Shaved']],
    tail: [['short', 'Short'], ['long', 'Long']],
    antenna: [['curled', 'Curled'], ['straight', 'Straight']],
  };
  let st = null, anim = 0;
  function render() {
    const { look: L, race, cls } = st, esc = M.esc, R = GV.RACES[race] || {};
    const sw = (key, label) => `<div class="cr-row"><span>${label}</span><div class="cr-sw">${SW[key].map((c) => `<button class="sw ${L[key] === c ? 'sel' : ''}" data-a="set" data-k="${key}" data-v="${c}" title="${c || 'Default'}" style="background:${c || 'repeating-linear-gradient(45deg,#2a2f3f 0 4px,#3a4055 4px 8px)'}"></button>`).join('')}</div></div>`;
    const op = (key, label) => `<div class="cr-row"><span>${label}</span><div class="cr-op">${OPT[key].map(([v, n]) => `<button class="${String(L[key]) === String(v) ? 'sel' : ''}" data-a="set" data-k="${key}" data-v="${v}">${n}</button>`).join('')}</div></div>`;
    const raceOpts = race === 'human' ? op('hair', 'Hair') + sw('hairC', 'Hair colour') + sw('skin', 'Skin') : race === 'drakkari' ? op('tail', 'Tail') + sw('accent', 'Scales') : race === 'kethari' ? op('antenna', 'Antennae') : sw('accent', race === 'lumari' ? 'Glow' : race === 'synth' ? 'Seams' : 'Wisps');
    M.render(`<div class="screen panel wide creator">
      <div class="topbar"><h2>${st.edit ? 'Appearance' : 'Create your character'}</h2><div class="stats">${esc(R.name || '')} · ${esc((GV.CLASSES[cls] || {}).name || '')}</div></div>
      <div class="cr-cols">
        <div class="cr-prev"><canvas id="crCv" width="260" height="300"></canvas>
          <input class="cr-name" maxlength="18" placeholder="Name (optional)" value="${esc(L.name || '')}" />
          <div class="menu row"><button class="ghost small" data-a="random">Randomise</button><button class="ghost small" data-a="reset">Reset</button></div></div>
        <div class="cr-opts">
          <div class="gsub">Body</div>${op('build', 'Build')}${op('helmet', 'Helmet')}${L.helmet ? op('helm', 'Helmet style') : ''}
          <div class="gsub">${esc(R.name || 'Race')}</div>${raceOpts}
          <div class="gsub">Colours</div>${sw('suit', 'Suit')}${sw('trim', 'Trim')}${sw('visor', 'Visor')}${sw('cloak', 'Cloak')}
          <div class="gsub">Markings</div>${op('marks', 'Pattern')}
        </div>
      </div>
      <div class="menu row"><button class="ghost" data-a="back">Back</button><button class="primary" data-a="done">${st.edit ? 'Save' : 'Begin voyage'}</button></div></div>`, (a, b) => {
      const inp = document.querySelector('#ui .cr-name'); if (inp) st.look.name = inp.value.trim().slice(0, 18);
      if (a === 'back') { cancelAnimationFrame(anim); return st.back(); }
      if (a === 'done') { cancelAnimationFrame(anim); GV.audio.sfx('level'); return st.done(Object.assign({}, st.look)); }
      if (a === 'set') { const k = b.dataset.k; let v = b.dataset.v; if (k === 'helmet') v = v === 'true'; st.look[k] = v; }
      if (a === 'random') {
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        Object.assign(st.look, { build: pick(OPT.build)[0], suit: pick(SW.suit.slice(1)), trim: pick(SW.trim.slice(1)), visor: pick(SW.visor.slice(1)), cloak: pick(SW.cloak.slice(1)), marks: pick(OPT.marks)[0], skin: pick(SW.skin), hair: pick(OPT.hair)[0], hairC: pick(SW.hairC), accent: pick(SW.accent.slice(1)) });
      }
      if (a === 'reset') st.look = Object.assign({}, GV.LOOK_DEFAULT, { name: st.look.name });
      render();
    }, () => { cancelAnimationFrame(anim); st.back(); });
    const inp = document.querySelector('#ui .cr-name');
    if (inp) inp.addEventListener('input', () => { st.look.name = inp.value.trim().slice(0, 18); });
    loop();
  }
  function loop() {
    cancelAnimationFrame(anim);
    const c = GV.CLASSES[st.cls] || {}, look = c.look || {}, Wp = c.weapon && GV.WEAPONS[c.weapon], O = c.offhand && GV.WEAPONS[c.offhand];
    const step = (ms) => {
      const cv = document.getElementById('crCv'); if (!cv) return;
      const g = cv.getContext('2d'), t = ms / 1000; g.clearRect(0, 0, cv.width, cv.height);
      A.glow(g, 130, 250, 120, 'rgba(143,233,255,0.08)');
      g.fillStyle = 'rgba(0,0,0,0.35)'; A.ellipse(g, 130, 282, 52, 7);
      A.spaceman(g, 130, 280, { facing: Math.sin(t * 0.6) > -0.6 ? 1 : -1, t, scale: 3.6, race: st.race, custom: st.look, cloak: look.cloak, visor: look.visor, visorGlow: look.glow, suit: look.suit, gear: Wp && Wp.art, gearColor: Wp && Wp.color, off: O && O.hand !== 'off' ? O.art : O ? 'shield' : null, offColor: O && O.color, kit: c.kit ? { helm: c.kit.helm, suit: c.kit.suit, boots: c.kit.boots, c: {} } : undefined });
      anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  GV.creator = {
    // opts: { cls, race, look, edit, done(look), back() }
    open(opts) { st = Object.assign({ edit: false }, opts); st.look = Object.assign({}, GV.LOOK_DEFAULT, opts.look || {}); render(); },
    edit(back) {
      const d = D();
      GV.creator.open({ cls: d.cls, race: GV.raceOf(d), look: d.look, edit: true, back, done: (look) => { d.look = look; GV.save.write(); back(); } });
    },
  };
})();
