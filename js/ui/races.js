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
        const sw = Math.sin(t * 3) * 3 + (o.run ? Math.sin(t * 11.5) * 3 : 0), c = k.fl ? '#fff' : '#3f7a52', c2 = k.fl ? '#fff' : '#5fae74';
        const pts = [[-6, -20 - k.bob], [-16, -16 + sw * 0.3], [-25, -9 + sw * 0.7], [-32, -3 + sw]];
        for (let i = 0; i < pts.length - 1; i++) {
          ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.lineWidth = 7 - i * 2;
          ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
        }
        ctx.fillStyle = c2;
        for (let i = 0; i < 3; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], mx = (x0 + x1) / 2, my = (y0 + y1) / 2; ctx.beginPath(); ctx.moveTo(mx - 2.5, my - 2); ctx.lineTo(mx, my - 6 + i); ctx.lineTo(mx + 2.5, my - 2); ctx.fill(); }
      },
      front(ctx, o, t, k) {
        ctx.fillStyle = k.fl ? '#fff' : '#5fae74';
        for (let i = 0; i < 4; i++) { const a = -2.2 + i * 0.38, r = 10.6, x = Math.cos(a) * r, y = k.hy + Math.sin(a) * r; ctx.beginPath(); ctx.moveTo(x - 2, y + 1); ctx.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); ctx.lineTo(x + 2, y + 1); ctx.fill(); }
      },
    },
    kethari: {
      front(ctx, o, t, k) {
        const c = k.fl ? '#fff' : '#8fbf4a', tip = k.fl ? '#fff' : '#d8ff6a', w = Math.sin(t * 4) * 1.5;
        ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-2, k.hy - 9); ctx.quadraticCurveTo(-8, k.hy - 20, -14 + w, k.hy - 26); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3, k.hy - 10); ctx.quadraticCurveTo(4, k.hy - 22, 1 - w, k.hy - 29); ctx.stroke();
        ctx.fillStyle = tip; A.circle(ctx, -14 + w, k.hy - 26, 1.8); A.circle(ctx, 1 - w, k.hy - 29, 1.8);
        if (!k.fl && !k.low) { A.glow(ctx, -14 + w, k.hy - 26, 6, 'rgba(216,255,106,0.6)'); A.glow(ctx, 1 - w, k.hy - 29, 6, 'rgba(216,255,106,0.6)'); }
        // carapace plates on the back of the suit
        ctx.fillStyle = k.fl ? '#fff' : 'rgba(120,160,70,0.85)';
        for (let i = 0; i < 3; i++) { A.ellipse(ctx, -8, -34 + i * 6 - k.bob, 3.2, 2.4); }
      },
    },
    lumari: {
      back(ctx, o, t, k) { if (!k.fl && !k.low) A.glow(ctx, 0, -30 - k.bob, 40 + Math.sin(t * 2) * 4, 'rgba(255,240,180,0.28)'); },
      front(ctx, o, t, k) {
        ctx.strokeStyle = k.fl ? '#fff' : `rgba(255,240,180,${0.55 + Math.sin(t * 3) * 0.2})`; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(-1, k.hy - 15, 8, 2.6, 0, 0, Math.PI * 2); ctx.stroke();
        if (!k.fl && !k.low) for (let i = 0; i < 3; i++) { const a = t * 1.4 + i * 2.1; ctx.fillStyle = 'rgba(255,245,200,0.8)'; A.circle(ctx, Math.cos(a) * 16, -30 - k.bob + Math.sin(a * 1.3) * 14, 1.1); }
      },
    },
    synth: {
      front(ctx, o, t, k) {
        const c = k.fl ? '#fff' : `rgba(125,255,224,${0.6 + Math.sin(t * 4) * 0.25})`;
        ctx.strokeStyle = c; ctx.lineWidth = 1;
        const y0 = -37 - k.bob;
        ctx.beginPath(); ctx.moveTo(-4, y0 + 3); ctx.lineTo(-4, y0 + 15); ctx.moveTo(3, y0 + 2); ctx.lineTo(3, y0 + 16); ctx.moveTo(-6, y0 + 9); ctx.lineTo(6, y0 + 9); ctx.stroke();
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
        for (let i = 0; i < 6; i++) { const a = t * 2 + i * 1.05, r = 13 + Math.sin(t * 3 + i) * 3; ctx.fillStyle = `rgba(170,120,255,${0.5 + 0.3 * Math.sin(t * 5 + i)})`; A.circle(ctx, Math.cos(a) * r - 2, -28 - k.bob + Math.sin(a) * r * 1.6, 1.7); }
      },
    },
  };
  const sm0 = A.spaceman;
  A.spaceman = function (ctx, x, y, o = {}) {
    const L = o.race && LOOK[o.race];
    if (!L) return sm0(ctx, x, y, o);
    const t = o.t || 0, breathe = Math.sin(t * 2.1), bob = o.run ? Math.abs(Math.sin(t * 11.5)) * 2.2 - 0.6 : o.air ? 0 : breathe * 0.6;
    const k = { bob, hy: -49 - bob, fl: !!o.flash, low: !!(GV.CFG && GV.CFG.LOWFX) };
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
    const race = me.slot ? 'human' : GV.raceOf(); // couch Player 2 wears the classic suit for now
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
