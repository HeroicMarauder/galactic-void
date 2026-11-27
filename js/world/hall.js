// Galactic Void — the Hall: a ship's deck you walk around, alone or with your squad.
//
// If you're in a guild it's your guild's hall (their colours, banner and roster); otherwise it's the
// Lantern's own deck. Everything is a piece in the room you walk up to and use with Interact:
//   airlock · vault · guild bank · armory rack · core forge · mirror · war table · drop pad ·
//   comms console · roster board · training dummies · sparring ring
// The war table and the sparring console take over your controls while you use them (left/right to
// choose, Interact or Jump to pick, Dash or Esc to step away), so nothing leaves the room.
// When you host online the hall is shared: your partner walks in with you, stands on the drop pad
// with you, and can duel you in the ring. Duel damage is balanced against each fighter's own hits,
// so a rank-5 Ranger and a rank-40 Knight both take about a dozen solid hits to drop.
(function () {
  const GV = window.GV, C = GV.CFG, A = GV.art, I = GV.input, P = GV.Play.prototype, M = GV.menus;
  const W = 5700, FY = 440, TOP = FY - 430;
  const RING = { x0: 4420, x1: 5000 };
  const H = (GV.hall = { mission: null, sel: 0 });
  const N = () => GV.net || {};
  const main = () => GV.save.main || GV.save.data;
  const inGuild = () => !!(GV.guild && GV.guild.id && GV.guild.g);
  const online = (p) => !!(p && (p.netHost || p.netGuest) && N().partner);

  // ---------------- the room ----------------
  GV.buildHall = function () {
    const L = GV.buildTrial(0);
    L.trial = false; L.hall = true; L.titan = false;
    L.solids = [{ x: -400, y: FY, w: W + 800, h: 900, hull: true }, { x: -60, y: TOP - 200, w: 60, h: FY - TOP + 200, hull: true }, { x: W, y: TOP - 200, w: 60, h: FY - TOP + 200, hull: true }, { x: -400, y: TOP - 200, w: W + 800, h: 200, hull: true, roof: true }];
    L.oneways = [{ x: RING.x0 + 150, y: FY - 130, w: 120, h: 14 }, { x: RING.x1 - 270, y: FY - 130, w: 120, h: 14 }, { x: (RING.x0 + RING.x1) / 2 - 70, y: FY - 250, w: 140, h: 14 }];
    L.movers = []; L.portals = []; L.gates = [{ x: -9999, y: 0, w: 1, h: 1, closed: false }, { x: -9999, y: 0, w: 1, h: 1, closed: false }];
    L.arena = { x: 1e7, w: 10, floorY: FY, top: TOP }; // no boss room on the deck
    L.spawn = { x: 1700, y: FY - 50 }; // you come aboard in the war room
    L.length = W; L.killY = FY + 600; L.camMaxY = FY + 110 - C.H; L.exit = { x: -99999, y: FY };
    const g = inGuild() ? GV.guild.g : null;
    L.sd = { name: g ? `${g.name} Hall` : 'The Lantern · Deck', pool: {}, boss: 'brood', bossName: '', vaults: [] };
    L.stations = [
      // stores
      { id: 'airlock', x: 90, w: 70, label: 'CO-OP BAY', act: 'Couch co-op' },
      { id: 'vault', x: 300, w: 80, label: 'VAULT', act: 'Open vault' },
      { id: 'gbank', x: 470, w: 80, label: 'GUILD BANK', act: g ? 'Open guild bank' : 'Guilds' },
      { id: 'armory', x: 660, w: 110, label: 'ARMORY', act: 'Gear' },
      { id: 'forge', x: 840, w: 90, label: 'CORE FORGE', act: 'Star Cores' },
      { id: 'mirror', x: 990, w: 70, label: 'MIRROR', act: 'Wardrobe' },
      { id: 'vesper', x: 1170, w: 80, label: "VESPER'S TRADE", act: 'Trade' },
      // command
      { id: 'table', x: 1560, w: 240, label: 'WAR TABLE', act: 'War table · missions & Titans' },
      { id: 'pad', x: 1900, w: 170, label: 'DROP TUBE', passive: true },
      { id: 'comms', x: 2120, w: 80, label: 'COMMS', act: 'Join a squad · friends' },
      { id: 'roster', x: 2280, w: 110, label: g ? 'ROSTER' : 'GUILD BOARD', act: g ? 'Guild' : 'Guilds' },
      { id: 'board', x: 2470, w: 120, label: 'DEPARTURES', act: 'Frontier' },
      // crew deck
      { id: 'radio', x: 2700, w: 80, label: 'RADIO', act: 'Change station' },
      { id: 'codex', x: 2860, w: 70, label: 'CODEX', act: 'Read the codex' },
      { id: 'quests', x: 3010, w: 90, label: 'CONTRACTS', act: 'Quests' },
      { id: 'trophy', x: 3170, w: 100, label: 'TROPHY CASE', act: 'Achievements' },
      { id: 'crew', x: 3350, w: 90, label: 'CREW QUARTERS', act: 'Visit the crew' },
      { id: 'hangar', x: 3520, w: 90, label: 'HANGAR', act: 'Companions' },
      { id: 'engine', x: 3700, w: 120, label: 'ENGINE ROOM', act: 'Upgrade the Lantern' },
      { id: 'chart', x: 3880, w: 90, label: 'STAR CHART', act: 'Passive tree' },
      { id: 'altar', x: 4030, w: 80, label: 'ASCENDANCY', act: 'Ascendancy' },
      // training
      { id: 'ring', x: 4350, w: 70, label: 'SPARRING', act: 'Spar' },
      // the workshop: one bench for each kind of kit
      { id: 'bench_armour', x: 5130, w: 100, label: 'ARMOUR BENCH', act: 'Armour & shields' },
      { id: 'bench_blade', x: 5270, w: 100, label: 'BLADE BENCH', act: 'Melee weapons' },
      { id: 'bench_guns', x: 5410, w: 100, label: 'GUNSMITH', act: 'Firearms & bows' },
      { id: 'bench_arcane', x: 5550, w: 100, label: 'ARCANE BENCH', act: 'Star Cores & Augments' },
    ];
    L.dummies = [{ x: 4140, y: FY }, { x: 4210, y: FY }, { x: 4250, y: FY }, { x: 4290, y: FY }];
    return L;
  };
  const station = (p, id) => p.L.stations.find((s) => s.id === id);

  // ---------------- entering ----------------
  let G = null;
  addEventListener('load', () => {
    G = GV.game; G.startHall = startHall; wrapResume();
    // Home is your ship. Before you've found the Lantern, the drift just carries on to the next stage.
    G.deckHome = () => !!(GV.save.data && GV.save.data.shipFound) && !(GV.net && GV.net.role === 'guest');
    G.homeLabel = () => {
      if (G.play && G.play.L && G.play.L.hall) return null;
      if (GV.net && GV.net.role === 'guest') return 'Back to the squad';
      return G.deckHome() ? 'Back to the ship' : null;
    };
    G.home = function () { return this.toMap(); };
    G.goHome = function () {
      const d = GV.save.data;
      if (GV.save.needsClass()) return M.classSelect();
      if (N().role === 'guest') return M.netWait();
      if (d.shipFound) return this.startHall();
      const st = [0, 1, 2].find((k) => !d.cleared[`0-${k}`]);
      return this.startStage(0, st == null ? 0 : st);
    };
  });
  function startHall(o) {
    if (GV.save.needsClass()) { M.classSelect(); return; }
    if (N().role === 'guest' && !N().allowStart) return M.netWait();
    M.hide(); I.clear(); H.returnTo = null;
    this.play = new GV.Play(0, -1, 'hall');
    this.scene = 'play'; this.paused = false;
    this.setPlaying(true);
    const p = this.play;
    p.noSpawn = true; p.spawnCap = 0; p.ambT = 1e12; p.toasts.length = 0;
    p.toast(p.L.sd.name.toUpperCase(), 2.4);
    p.toasts[0].sub = inGuild() ? 'Walk up to anything and press Interact' : 'Your ship · walk up to anything and press Interact';
    setupDummies(p);
    const doneNow = H.mission && H.mission.k === 'stage' && GV.save.data.cleared[`${H.mission.s}-${H.mission.st}`] && !String(H.mission.sub).endsWith('cleared');
    H.mission = H.mission && validMission(H.mission) && !doneNow ? H.mission : defaultMission(); // just cleared it? line up the next one
    H.sel = Math.max(0, missions().findIndex((m) => sameMission(m, H.mission)));
    // Open the hall to friends and guildmates (Helldivers-style drop-in), unless they turned it off.
    const fs = main().friends || {};
    if (!o && !N().role && ((GV.friends && GV.friends.ready) || GV.standalone) && fs.openHall !== false && N().host) Promise.resolve(N().host()).then(() => { if (N().role === 'host' && this.play === p && N().hostBegin) N().hostBegin({ sys: 0, st: 0, seed: 0, hall: { host: 1 } }); });
    if (GV.tips) GV.tips.show('hall');
    if (N().role === 'host' && N().hostBegin) N().hostBegin({ sys: 0, st: 0, seed: 0, hall: { host: 1 } });
  }
  H.enter = () => { M.hide(); GV.game.startHall(); };

  // ---------------- missions (war table) ----------------
  function missions() {
    const d = GV.save.data, out = [], solo = !online(G.play);
    const fr = GV.progress.frontier();
    for (let s = 0; s <= fr; s++) {
      const sys = GV.UNIVERSE.system(s);
      for (let st = 0; st < 3; st++) if (GV.progress.stageOpen(s, st)) out.push({ k: 'stage', s, st, name: sys.stages[st].name, sub: `${sys.name}${d.cleared[`${s}-${st}`] ? ' · cleared' : ' · new'}` });
    }
    if (GV.startDepths) { const f = (main().frontier || {}); out.push({ k: 'depths', n: (f.depthBest || 0) + 1, name: `Void Depths ${(f.depthBest || 0) + 1}`, sub: 'Frontier · endless descent' }); }
    if (solo) {
      out.push({ k: 'trial', s: fr, name: 'Rift Trial', sub: `Solo · waves in a sealed arena · best wave ${d.trialBest || 0}` });
      if (d.cleared['0-0'] && GV.daily) { const D = GV.daily.state(), cu = GV.daily.curses(); out.push({ k: 'daily', s: fr, name: `Daily Rift · ${GV.daily.today()}`, sub: `${D.claimed ? 'Done today · run it again' : 'Today'} · ${Object.keys(cu).map((k) => GV.TRIAL_CURSES[k].name).join(' + ')}` }); }
      for (let s = 0; s <= fr; s++) if (d.cleared[`${s}-2`] && GV.titanFor) { const T = GV.TITANS[GV.titanFor(s)]; out.push({ k: 'titan', s, name: `Titan · ${T.name}`, sub: 'Solo · the gate is open' }); }
    }
    return out;
  }
  const sameMission = (a, b) => a && b && a.k === b.k && a.s === b.s && a.st === b.st && a.n === b.n;
  const validMission = (m) => missions().some((x) => sameMission(x, m));
  function defaultMission() { const ms = missions(); return ms.filter((m) => m.k === 'stage').find((m) => m.sub.endsWith('new')) || ms[0] || null; }
  function launch(m) {
    if (!m) return;
    GV.audio.sfx('rift');
    if (m.k === 'stage') G.startStage(m.s, m.st);
    else if (m.k === 'depths') GV.startDepths(m.n);
    else if (m.k === 'trial') { const p = G.play; G.paused = true; G.setPlaying(false); I.clear(); H.returnTo = () => { H.returnTo = null; G.resume(); }; M.trialSetup(); }
    else if (m.k === 'daily') G.startTrial(m.s, GV.daily.curses(), true);
    else if (m.k === 'titan') G.startTitan(m.s);
  }

  // ---------------- consoles (the war table and the ring take over your controls) ----------------
  const NULL_INP = { held: () => false, pressed: () => false, clear() {} };
  function openConsole(p, id) {
    if (id === 'table') {
      if (p.netGuest) { p.toast('The host plans the mission', 1.6, 'small'); return; }
      const ms = missions(); if (!ms.length) return;
      p.console = { id, items: ms.map((m) => ({ name: m.name, sub: m.sub, m })), i: Math.max(0, ms.findIndex((m) => sameMission(m, H.mission))) };
    }
    if (id === 'radio') {
      const ST = GV.soundtrack, sts = ST.stations();
      p.console = { id, items: sts.map((x) => ({ name: x.name, sub: x.sub, st: x.id })), i: Math.max(0, sts.findIndex((x) => x.id === ST.stationMode())) };
    }
    if (id === 'ring') {
      if (p.spar) return;
      if (p.netGuest) { N().ext({ duelAsk: 1 }); p.toast('Challenge sent', 1.4, 'small'); return; }
      const lv = +((inGuild() && GV.guild.g.upgrades && GV.guild.g.upgrades.ring) || 0);
      const items = [];
      const squad = p.players.filter((q) => !q.holo);
      if (squad.length === 2) items.push({ name: 'Duel your squadmate', sub: 'Best of three, one on one', duel: 'duel' });
      if (squad.length >= 3) items.push({ name: `Free-for-all · ${squad.length} players`, sub: 'Last one standing takes the round', duel: 'ffa' });
      if (squad.length === 4) items.push({ name: 'Teams · 2v2', sub: 'P1 & P3 against P2 & P4', duel: 'teams' });
      items.push({ name: 'Mirror · Recruit', sub: 'A hologram of your own build, slow to react', duel: 'holo', lvl: 0 });
      items.push({ name: 'Mirror · Veteran', sub: 'Reads your moves, uses its cores', duel: 'holo', lvl: 1 });
      items.push({ name: 'Mirror · Elite', sub: lv >= 1 || main().pvp && main().pvp.vet ? 'Dashes through you, punishes greed' : 'Beat a Veteran first', duel: 'holo', lvl: 2, locked: !(lv >= 1 || (main().pvp && main().pvp.vet)) });
      if (lv >= 2) items.push({ name: 'Mirror · Elite + hazards', sub: 'Guild ring upgrade: the floor bites', duel: 'holo', lvl: 2, hazards: true });
      p.console = { id, items, i: 0 };
    }
    GV.audio.sfx('ui');
  }
  function consoleTick(p) {
    const c = p.console; if (!c) return;
    if (I.pressed('left') || I.pressed('skill2')) { c.i = (c.i + c.items.length - 1) % c.items.length; GV.audio.sfx('ui'); if (c.id === 'table') pickMission(p, c.items[c.i].m); }
    if (I.pressed('right') || I.pressed('skill3')) { c.i = (c.i + 1) % c.items.length; GV.audio.sfx('ui'); if (c.id === 'table') pickMission(p, c.items[c.i].m); }
    if (c.id === 'table' && I.pressed('down')) { const cur = c.items[c.i].m, nx = c.items.findIndex((x, k) => k > c.i && x.m.s !== cur.s && x.m.k === 'stage'); c.i = nx >= 0 ? nx : 0; pickMission(p, c.items[c.i].m); GV.audio.sfx('ui'); }
    else if (I.pressed('dash') || I.pressed('pause') || I.pressed('down')) { p.console = null; I.clear(); return; }
    if (I.pressed('interact') || I.pressed('jump') || I.pressed('confirm') || I.pressed('attack')) {
      const it = c.items[c.i]; p.console = null; I.clear();
      if (c.id === 'table') { pickMission(p, it.m); p.toast(`${it.name} · stand on the drop pod`, 2, 'small'); GV.audio.sfx('level'); }
      if (c.id === 'radio') { GV.audio.unlock(); GV.soundtrack.setStation(it.st); p.toast(`Radio · ${it.name}`, 1.6, 'small'); }
      if (c.id === 'ring') {
        if (it.locked) { p.toast(it.sub, 1.8, 'small'); return; }
        const squad = p.players.filter((q) => !q.holo).sort((a, b) => (a.slot || 0) - (b.slot || 0));
        if (it.duel === 'holo') startHolo(p, it.lvl, it.hazards);
        else if (it.duel === 'teams') beginSpar(p, squad, squad.map((q) => (q.slot || 0) % 2), 'teams');
        else beginSpar(p, squad, squad.map((_, i) => i), it.duel);
      }
    }
  }
  function pickMission(p, m) { H.mission = m; if (p.netHost) N().ext({ hallSel: { name: m.name, sub: m.sub } }); }

  // ---------------- per-frame ----------------
  const up0 = P.update;
  P.update = function (dt) {
    if (!this.L.hall) return up0.call(this, dt);
    const me = this.netGuest ? this.player : this.players[0]; // p.player follows whoever leads; the keyboard is always yours
    // console use: freeze your suit while you pick
    if (this.console) { consoleTick(this); }
    const lockMe = !!this.console || (this.spar && this.spar.freeze > 0);
    const saved = []; if (lockMe) for (const pl of this.spar && this.spar.freeze > 0 ? this.players : [me]) { if (pl.inp !== NULL_INP) { saved.push([pl, pl.inp]); pl.inp = NULL_INP; } }
    try { up0.call(this, dt); } finally { for (const [pl, inp] of saved) pl.inp = inp; }
    if (this.state !== 'run') return;
    if (!this.spar) for (const pl of this.players) if (!pl.dead) pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * 0.25 * dt); // the deck patches you up
    // stations: yours (and, when hosting, your partner's)
    this.nearStation = null;
    const near = (pl) => { let best = null, bd = 1e9; for (const s of this.L.stations) { if (s.passive) continue; const d = Math.abs(pl.cx - s.x); if (d < s.w / 2 + 26 && d < bd && Math.abs(pl.y + pl.h - FY) < 90) { bd = d; best = s; } } return best; };
    if (!this.console && !this.spar) {
      this.nearStation = near(me);
      if (this.nearStation && I.pressed('interact')) useStation(this, this.nearStation);
    }
    padTick(this, dt);
    dummyTick(this, dt);
    duelTick(this, dt);
    for (const m of this.hallFx || []) m.t -= dt;
  };
  function useStation(p, s) {
    I.clear(); GV.audio.sfx('ui');
    const id = s.id;
    if (id === 'table' || id === 'ring' || id === 'radio') return openConsole(p, id);
    if (id === 'altar' && !GV.asc.unlocked() && !GV.asc.reqMet()) { p.toast('The altar is dark · ' + GV.asc.reqText(), 2.6, 'small'); return; }
    if (id === 'airlock' && p.netGuest) { p.toast('Couch co-op is set up on your own ship', 1.6, 'small'); return; }
    menu(p, (back) => {
      if (id === 'vault') GV.vault.open(GV.vault.solo, back);
      if (id === 'gbank') { if (inGuild()) GV.guild.openBank(back); else M.guild(back); }
      if (id === 'roster') M.guild(back);
      if (id === 'comms') M.friends(back);
      if (id === 'armory') GV.gearView.open('play');
      if (id === 'forge') GV.gemView.open('play');
      if (id === 'mirror') { H.returnTo = back; M.wardrobe(); }
      if (id === 'vesper') GV.game.openShop('play');
      if (id.startsWith('bench_') && GV.fabricator) GV.fabricator.open('play', id.slice(6));
      if (id === 'board') { H.returnTo = back; M.frontier(); }
      if (id === 'airlock') { H.returnTo = back; M.coop(); }
      if (id === 'codex') { H.returnTo = back; codexMenu(back); }
      if (id === 'quests') { H.returnTo = back; M.quests(); }
      if (id === 'trophy') { H.returnTo = back; M.achievements(); }
      if (id === 'crew') { H.returnTo = back; M.crew(); }
      if (id === 'hangar') { H.returnTo = back; M.hangar(); }
      if (id === 'engine') { H.returnTo = back; engineOpen = true; lan0.call(M); }
      if (id === 'chart') GV.treeView.open('play');
      if (id === 'altar') { if (GV.asc.unlocked() && GV.asc.current()) GV.ascendView.open('play'); else { H.returnTo = back; M.ascTrials(back); } }
    });
  }
  // The codex station: the codex itself, plus the story so far (each act you've reached).
  function codexMenu(back) {
    const m = GV.save.main || GV.save.data, seen = m.actsSeen || {}, acts = (GV.ACTS || []).map((A, i) => [A, i]).filter(([A]) => seen[A.id]);
    M.render(`<div class="screen panel narrow"><h2>Codex</h2>
      <div class="menu"><button class="primary" data-a="codex">Read the codex${GV.codex && GV.codex.unread() ? ` <b class="pts">${GV.codex.unread()}</b>` : ''}</button></div>
      ${acts.length ? `<h3>The story so far</h3><div class="menu">${acts.map(([A, i]) => `<button data-a="act" data-k="${i}">Act ${A.num} · ${M.esc(A.album)}</button>`).join('')}</div>` : ''}
      <div class="menu row"><button class="ghost" data-a="back">Back</button></div></div>`, (a, b) => {
      if (a === 'codex') { H.returnTo = null; GV.codexView.open('play'); }
      if (a === 'act') GV.showAct(+b.dataset.k, true);
      if (a === 'back') { H.returnTo = null; back(); }
    }, () => { H.returnTo = null; back(); });
  }
  H.openStation = (id) => { const p = G && G.play; if (p && p.L && p.L.hall) { const s = station(p, id); if (s) useStation(p, s); } };
  // A menu from a station. Solo, the deck pauses; online it keeps running around you.
  function menu(p, fn) {
    const on = online(p);
    if (!on) G.paused = true;
    G.setPlaying(false); I.clear();
    const back = () => { H.returnTo = null; G.resume(); };
    H.back = back;
    fn(back);
  }
  // Screens that only know how to go "back to the Lantern" go back to the deck instead.
  const lan0 = M.lantern;
  let engineOpen = false;
  // Screens that only know "back to the Lantern" or "back to the map" go back to the deck instead.
  M.lantern = function () {
    if (H.returnTo && G && G.play && G.play.L && G.play.L.hall) {
      if (engineOpen) return lan0.apply(this, arguments); // the engine room's own screen (and its sub-screens coming back to it)
      engineOpen = false; const f = H.returnTo; H.returnTo = null; return f();
    }
    return lan0.apply(this, arguments);
  };
  addEventListener('load', () => {
    const tm0 = G.toMap;
    G.toMap = function () { if (H.returnTo && this.play && this.play.L && this.play.L.hall) { const f = H.returnTo; H.returnTo = null; engineOpen = false; return f(); } return tm0.apply(this, arguments); };
    const map0 = M.map;
    M.map = function () { if (H.returnTo && !GV.save.slot && G && G.play && G.play.L && G.play.L.hall) { const f = H.returnTo; H.returnTo = null; engineOpen = false; return f(); } return map0.apply(this, arguments); };
  });
  // Gear and gem screens opened with 'play' resume on close; a guest also re-sends their build.
  function wrapResume() {
    const res0 = G.resume;
    G.resume = function () { const r = res0.apply(this, arguments); const p = this.play; if (p && p.L && p.L.hall && p.netGuest && N().resync) N().resync(); return r; };
  }
  // in a hall menu, the back function above already resumed

  // Online on the deck, each of you has your own camera.
  const cam0 = P.camTarget;
  P.camTarget = function () {
    if (this.L && this.L.hall && this.console && this.console.id === 'table') { // frame the hologram while you use it
      const tb = station(this, 'table'), c = this.coop, real = this.player;
      this.coop = false; this.player = { cx: tb.x, cy: real.cy, x: tb.x - 12, y: real.y, w: 24, h: real.h, facing: 0 };
      try { const r = cam0.call(this); r.tx = tb.x - this.vw() / 2; return r; } finally { this.coop = c; this.player = real; }
    }
    if (!(this.L && this.L.hall && (this.netHost || this.netGuest))) return cam0.call(this);
    const c = this.coop, real = this.player;
    this.coop = false; this.player = this.netGuest ? real : this.players[0];
    try { return cam0.call(this); } finally { this.coop = c; this.player = real; }
  };

  // ---------------- drop pod ----------------
  function padTick(p, dt) {
    if (p.netGuest || p.spar || p.podGo) return; // a pod already on its way: don't count down again
    const s = station(p, 'pad'), on = (pl) => !pl.dead && Math.abs(pl.cx - s.x) < s.w / 2 && Math.abs(pl.y + pl.h - FY) < 30;
    const squad = p.players.filter((q) => !q.holo), ready = squad.filter(on), lead = squad[0];
    p.padReady = ready.length; p.padNeed = squad.length;
    // everyone aboard launches at once; if the host is aboard and someone dawdles, go without them after a while
    const all = H.mission && ready.length === squad.length && ready.length > 0;
    p.padWait = H.mission && ready.includes(lead) && !all ? (p.padWait || 0) + dt : 0;
    const go = all || p.padWait > 10;
    if (p.padWait > 4 && !all && !p.padNag) { p.padNag = true; const late = squad.filter((q) => !on(q)).map((q) => `P${(q.slot || 0) + 1}`).join(', '); p.toast(`Waiting for ${late} · launching without them in 6s`, 3, 'small'); }
    if (!p.padWait) p.padNag = false;
    if (go) {
      p.launchT = (p.launchT == null ? 3.2 : p.launchT) - dt;
      if (Math.ceil(p.launchT) !== p.lastCount && p.launchT > 0) { p.lastCount = Math.ceil(p.launchT); p.toast(`LAUNCHING · ${p.lastCount}`, 0.9, 'small'); GV.audio.sfx('beacon'); }
      if (p.launchT <= 0) {
        p.launchT = null; p.padWait = 0;
        const m = H.mission;
        if (GV.podLaunch && m && m.k !== 'trial') { p.podGo = true; GV.podLaunch(() => launch(m)); } // fire the pod, burn in, land
        else launch(m);
      }
    } else if (p.launchT != null) { p.launchT = null; p.lastCount = null; p.toast('Launch held', 1, 'small'); }
  }

  // ---------------- training dummies ----------------
  function setupDummies(p) {
    if (p.netGuest) return;
    p.dummies = p.L.dummies.map((d, i) => {
      const e = p.spawnEnemy(i === 0 ? 'brute' : 'crawler', d.x, d.y, true);
      e.x = d.x - e.w / 2; e.y = d.y - e.h; e.x0 = e.x; e.y0 = e.y;
      e.hp = e.maxHp = 1e7; e.dmg = 0; e.hallDummy = true; e.group = i === 0 ? 0 : 1;
      const base = e.def; e.def = Object.assign(Object.create(base), { static: true, update(en) { en.x = en.x0; en.y = en.y0; en.vx = en.vy = 0; en.hp = en.maxHp; }, draw(ctx, en, pal, t) { ctx.save(); ctx.globalAlpha = 0.55; base.draw(ctx, en, pal, t); ctx.restore(); } });
      return e;
    });
    p.dps = [{ hits: [], best: 0 }, { hits: [], best: 0 }];
  }
  function dummyTick(p) {
    if (!p.dps) return;
    const now = p.t;
    for (const g of p.dps) { g.hits = g.hits.filter((h) => now - h.t < 4); const sum = g.hits.reduce((a, h) => a + h.d, 0), span = g.hits.length ? Math.max(1, now - g.hits[0].t) : 1; g.cur = g.hits.length ? sum / Math.max(span, 1) : 0; g.best = Math.max(g.best, g.cur); }
  }

  // ---------------- PvP: duels and the mirror hologram ----------------
  // Each fighter gets an invisible "proxy" that the other's attacks can hit; the hit is converted to
  // PvP damage on the real fighter. A fighter's own attacks never touch their own proxy.
  let curAtk = null;
  const hit0 = GV.Skills.hitEnemy;
  GV.Skills.hitEnemy = function (p, e, s, o) {
    if (e && e.duelOf && (s && s.pl ? s.pl : p.player) === e.duelOf) return 0;
    const prev = curAtk; curAtk = (s && s.pl) || p.player;
    try { return hit0.apply(this, arguments); } finally { curAtk = prev; }
  };
  const de0 = P.damageEnemy;
  P.damageEnemy = function (e, amt, kx, ky, crit) {
    if (e && e.duelOf) { pvpHit(this, e.duelOf, curAtk, amt, crit); return; }
    if (curAtk && amt > 0) curAtk.pvpMean = curAtk.pvpMean ? curAtk.pvpMean * 0.94 + amt * 0.06 : amt;
    if (e && e.hallDummy && this.dps) this.dps[e.group].hits.push({ t: this.t, d: amt });
    return de0.apply(this, arguments);
  };
  function pvpHit(p, tg, atk, amt, crit) {
    const d = p.spar; if (!d || d.freeze > 0 || d.over || tg.dead || tg.pvpDown) return;
    if (atk === tg || !d.fighters.includes(tg)) return;
    if (atk && d.fighters.includes(atk) && teamOf(d, atk) === teamOf(d, tg)) return; // no friendly fire
    if (tg.inv > 0) return;
    if (atk) atk.pvpMean = atk.pvpMean ? atk.pvpMean * 0.94 + amt * 0.06 : amt;
    const mean = (atk && atk.pvpMean) || amt || 1;
    let frac = amt < 0 ? 0.1 : Math.max(0.025, Math.min(0.16, 0.075 * (amt / mean)));
    const st = tg.st || {};
    if (Math.random() * 100 < Math.min(40, st.evasion || 0)) { p.text(tg.cx, tg.y - 8, 'EVADE', '#7dffcf', 14); tg.inv = 0.25; return; }
    if (Math.random() * 100 < Math.min(40, st.block || 0)) { p.text(tg.cx, tg.y - 8, 'BLOCK', '#ffd36b', 14); tg.inv = 0.3; return; }
    if (st.armour > 0) frac *= 1 - Math.min(0.3, st.armour / (st.armour + 600));
    let dmg = Math.max(1, Math.round(tg.maxHp * frac));
    if (tg.ward > 0) { const ab = Math.min(tg.ward, dmg); tg.ward -= ab; dmg -= ab; }
    tg.hp -= dmg; tg.inv = 0.22; tg.hurtT = 0.2; tg.channel = null;
    const dir = Math.sign(tg.cx - (atk ? atk.cx : tg.cx - tg.facing)) || 1;
    tg.vx = dir * 260; tg.vy = Math.min(tg.vy, -220);
    p.text(tg.cx, tg.y - 8, (crit ? '!' : '-') + dmg, crit ? '#ffd36b' : '#ff8a9a', crit ? 18 : 15);
    p.burst(tg.cx, tg.cy, 10, colOf(d, teamOf(d, tg)), 200, 0.4, 2.5);
    GV.audio.sfx('hit');
    if (tg.hp <= 0) { tg.hp = 0; knockOut(p, tg); }
  }
  function proxyFor(p, pl) {
    const e = p.spawnEnemy('brute', pl.x, pl.y, true);
    e.duelOf = pl; e.pvpProxy = true; e.hp = e.maxHp = 1e9; e.dmg = 0; e.boss = false;
    const base = e.def;
    e.def = Object.assign(Object.create(base), { static: true, update(en) { const o = en.duelOf; en.w = o.w; en.h = o.h; en.vx = en.vy = 0; en.hp = en.maxHp; en.dead = false; en.x = o.x; en.y = o.pvpDown ? -1e6 : o.y; }, draw() {} });
    return e;
  }
  function ringWalls(p, on) {
    const L = p.L;
    L.solids = L.solids.filter((s) => !s.ringWall);
    if (on) L.solids.push({ x: RING.x0 - 24, y: TOP - 200, w: 24, h: FY - TOP + 200, ringWall: true }, { x: RING.x1, y: TOP - 200, w: 24, h: FY - TOP + 200, ringWall: true });
    p.grid = null;
  }
  const COLS = () => GV.COOP_COLORS || ['#7fe8ff', '#ffb35c', '#c38bff', '#7dffb0'];
  const teamOf = (d, pl) => d.team[d.fighters.indexOf(pl)];
  function label(d, t) {
    if (d.kind === 'holo') return t === 0 ? 'You' : 'The mirror';
    if (d.kind === 'teams') return t === 0 ? 'Cyan team' : 'Orange team';
    const pl = d.fighters[d.team.indexOf(t)]; return `P${((pl && pl.slot) || 0) + 1}`;
  }
  function colOf(d, t) { if (d.kind === 'teams') return t === 0 ? '#7fe8ff' : '#ffb35c'; if (d.kind === 'holo') return t === 0 ? '#8fe9ff' : '#ff9a4a'; const pl = d.fighters[d.team.indexOf(t)]; return COLS()[(pl && pl.slot) || 0]; }
  function syncSpar(p) {
    if (!(p.netHost && N().partner)) return;
    const d = p.spar;
    N().ext({ spar: d ? { score: d.score.slice(), kind: d.kind, lvl: d.lvl || 0, labels: d.score.map((_, t) => label(d, t)), cols: d.score.map((_, t) => colOf(d, t)) } : 0 });
  }
  function challenge(p, slot) {
    if (!p.netHost || p.spar) return;
    p.toast(`P${slot + 1} wants to spar · the host starts it at the sparring console`, 3, 'small');
  }
  function placeFighters(p) {
    for (const e of p.spar.proxies) if (!p.enemies.includes(e)) { e.dead = false; p.enemies.push(e); } // re-arm every round
    const d = p.spar, n = d.fighters.length, span = RING.x1 - RING.x0 - 150;
    // teammates start side by side; in a free-for-all everyone spreads out
    const order = d.fighters.map((pl, i) => [pl, d.team[i]]).sort((a, b) => a[1] - b[1]);
    order.forEach(([pl], k) => {
      const x = RING.x0 + 60 + (n > 1 ? (k * span) / (n - 1) : 0), f = x < (RING.x0 + RING.x1) / 2 ? 1 : -1;
      pl.x = x; pl.y = FY - pl.h; pl.vx = pl.vy = 0; pl.facing = f; pl.hp = pl.maxHp; pl.ward = pl.maxWard || 0; pl.pvpDown = false; pl.dead = false; pl.inv = 0; if (pl.cd) for (const c in pl.cd) pl.cd[c] = 0;
      if (p.netHost && pl.netG) N().ext({ place: { s: pl.slot, x: Math.round(x), y: Math.round(FY - pl.h) } });
    });
  }
  function beginSpar(p, fighters, team, kind, opts) {
    p.console = null;
    const teams = Math.max(...team) + 1;
    p.spar = { fighters, team, kind, score: new Array(teams).fill(0), round: 1, freeze: 2.4, opts: opts || {}, a: fighters[0] };
    p.spar.proxies = fighters.map((pl) => proxyFor(p, pl));
    syncSpar(p);
    ringWalls(p, true); placeFighters(p);
    p.toast({ holo: 'MIRROR MATCH', duel: 'DUEL', ffa: 'FREE-FOR-ALL', teams: 'TEAMS 2V2' }[kind] || 'SPAR', 2.2); p.toasts[p.toasts.length - 1].sub = 'First to two rounds';
    GV.audio.sfx('boss');
  }
  function knockOut(p, tg) {
    const d = p.spar; tg.pvpDown = true;
    p.burst(tg.cx, tg.cy, 40, '#ffffff', 300, 0.8, 3); GV.audio.sfx('slam'); p.shake && p.shake(8);
    const standing = new Set(d.fighters.filter((f) => !f.pvpDown).map((f) => teamOf(d, f)));
    if (standing.size <= 1) roundOver(p, standing.size ? [...standing][0] : teamOf(d, tg));
  }
  function roundOver(p, wt) {
    const d = p.spar; if (d.over || d.freeze > 0) return;
    d.score[wt]++;
    const who = label(d, wt), you = who === 'You';
    syncSpar(p);
    const sc = d.score.join('-');
    if (d.score[wt] >= 2) { d.over = 2.6; p.toast(`${who.toUpperCase()} ${you ? 'WIN' : 'WINS'} · ${sc}`, 2.6); recordResult(p, d, wt); }
    else { d.round++; d.freeze = 2.2; d.between = 1.2; p.toast(`${who} take${you ? '' : 's'} round ${d.round - 1} · ${sc}`, 2, 'small'); }
  }
  function recordResult(p, d, wt) {
    const s = (main().pvp = main().pvp || { w: 0, l: 0, holo: [0, 0, 0], vet: false });
    const mine = teamOf(d, p.netGuest ? p.player : p.players[0]);
    if (d.kind === 'holo') { if (wt === 0) { s.holo[d.lvl] = (s.holo[d.lvl] || 0) + 1; if (d.lvl >= 1) s.vet = true; } }
    else if (mine != null) { if (wt === mine) s.w++; else s.l++; }
    GV.save.write();
  }
  function endDuel(p) {
    const d = p.spar; if (!d) return;
    for (const e of d.proxies) e.dead = true;
    p.enemies = p.enemies.filter((e) => !e.duelOf);
    ringWalls(p, false);
    for (const pl of d.fighters) { pl.pvpDown = false; pl.hp = pl.maxHp; }
    if (d.kind === 'holo') p.holo = null;
    p.spar = null;
    syncSpar(p);
  }
  // The ship is safe ground: no anomalies, no Titan incursions, nothing left over from a run.
  const ua0 = P.updateAnomaly, ui0 = P.updateIncursion;
  P.updateAnomaly = function (dt) {
    if (!(this.L && this.L.hall)) return ua0.call(this, dt);
    if (!this.anom && this.anomInit) this.anomInit(); // keep the fields the draw code reads
    if (this.anom) { this.anom.on = false; this.anom.rewind = 0; }
    if (this.zones) this.zones.length = 0;
    if (this.tear) { this.pal = this.tear.pal; this.sd.pool = this.tear.pool; this.tear = null; }
    this.glitchT = 0; this.beam = null; this.staticHud = false; this.anomZoneArena = 0;
  };
  const ta0 = P.triggerAnomaly;
  P.triggerAnomaly = function () { if (this.L && this.L.hall) return; return ta0.apply(this, arguments); };
  P.updateIncursion = function (dt) {
    if (!(this.L && this.L.hall)) return ui0.call(this, dt);
    if (!this.inc && this.incursionInit) this.incursionInit();
    if (this.inc) { this.inc.on = null; this.inc.armed = false; }
  };
  // someone dropped out mid-match: call it off rather than wait on a fighter who isn't there
  P.onPlayerLeft = function (pl) {
    const d = this.spar; if (!d || !d.fighters.includes(pl)) return;
    this.toast('Match called off · a fighter left', 2, 'small');
    endDuel(this);
  };
  function duelTick(p, dt) {
    const d = p.spar; if (!d) return;
    if (d.over) { d.over -= dt; if (d.over <= 0) endDuel(p); return; }
    if (d.freeze > 0) {
      if (d.between) { d.between -= dt; if (d.between <= 0) { d.between = 0; placeFighters(p); } return; }
      const c0 = Math.ceil(d.freeze); d.freeze -= dt; const c1 = Math.ceil(d.freeze);
      if (c1 !== c0 && c1 > 0 && c1 <= 3) { p.toast(String(c1), 0.7, 'small'); GV.audio.sfx('beacon'); }
      if (d.freeze <= 0) { p.toast('FIGHT', 0.8); GV.audio.sfx('skill'); }
      for (const pl of d.fighters) { pl.vx = 0; }
      return;
    }
    // walking out of the ring forfeits nothing, but the walls keep you in anyway
    if (d.opts.hazards) { d.hz = (d.hz || 0) - dt; if (d.hz <= 0) { d.hz = 2.4; const x = RING.x0 + 40 + Math.random() * (RING.x1 - RING.x0 - 160); p.warn && p.warn({ x, y: FY - 60, w: 120, h: 60, t: 0.7 }); setTimeout(() => { if (p.spar === d && !d.freeze) for (const pl of d.fighters) if (pl.cx > x && pl.cx < x + 120 && pl.y + pl.h > FY - 60) pvpHit(p, pl, null, -1, false); }, 700); } }
  }

  // ---- the mirror hologram: your own build, driven by a bot ----
  function startHolo(p, lvl, hazards) {
    const me = p.netGuest ? p.player : p.players[0];
    const holo = new GV.Player(RING.x1 - 90, FY - 60, 0);
    holo.holo = true; holo.botLvl = lvl;
    holo.inp = botInput(holo);
    p.holo = holo;
    beginSpar(p, [me, holo], [0, 1], 'holo', { hazards });
    p.spar.lvl = lvl;
  }
  const LV = [{ react: 0.45, aggr: 0.35, skill: 0.25, aim: 0.35, dodge: 0.05 }, { react: 0.25, aggr: 0.6, skill: 0.55, aim: 0.15, dodge: 0.18 }, { react: 0.12, aggr: 0.85, skill: 0.85, aim: 0.06, dodge: 0.35 }];
  function botInput(b) {
    const st = { held: {}, pressed: {} };
    b.bot = st;
    return { held: (a) => !!st.held[a], pressed: (a) => !!st.pressed[a], clear() { st.held = {}; st.pressed = {}; } };
  }
  function botThink(p, b, dt) {
    const s = b.bot, me = p.spar ? p.spar.a : p.players[0], L = LV[b.botLvl || 0];
    s.pressed = {};
    if (!p.spar || p.spar.freeze > 0 || p.spar.over || b.pvpDown) { s.held = {}; b.botAim = { x: b.facing, y: 0, px: b.cx + b.facing * 100, py: b.cy }; return; }
    s.t = (s.t || 0) - dt;
    const dx = me.cx - b.cx, dy = me.cy - b.cy, dist = Math.abs(dx);
    const melee = b.skills && b.skills[0] && b.skills[0].tags && b.skills[0].tags.has && b.skills[0].tags.has('Melee');
    const want = melee ? 46 : 230;
    if (s.t <= 0) {
      s.t = L.react * (0.6 + Math.random() * 0.8);
      s.dir = dist > want + 30 ? Math.sign(dx) : !melee && dist < want - 80 ? -Math.sign(dx) : Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
      s.atk = dist < (melee ? 110 : 520) && Math.abs(dy) < (melee ? 70 : 160) && Math.random() < L.aggr + 0.2;
      s.noise = (Math.random() - 0.5) * L.aim * 2;
      if (b.onGround && (dy < -60 || Math.random() < 0.08 * L.aggr)) s.pressed.jump = true;
      if (Math.random() < L.dodge && me.attackT > 0 && dist < 150) { s.pressed.dash = true; s.dir = Math.random() < 0.5 ? Math.sign(dx) : -Math.sign(dx); }
      if (Math.random() < L.skill * 0.5) s.pressed['skill' + (1 + Math.floor(Math.random() * 3))] = true;
      if (b.hp < b.maxHp * 0.4 && Math.random() < L.skill * 0.4) s.pressed.flask1 = true;
    }
    s.held = { left: s.dir < 0, right: s.dir > 0, attack: s.atk };
    const ox = b.cx, oy = b.cy, ax = dx, ay = dy + s.noise * 200, m = Math.hypot(ax, ay) || 1;
    b.botAim = { x: ax / m, y: ay / m, px: me.cx + s.noise * 120, py: me.cy + s.noise * 60, lock: null };
    if (Math.abs(dx) > 8) b.facing = Math.sign(dx);
  }
  // aim: the bot aims itself
  const aimU = GV.aim.update;
  GV.aim.update = function (p, pl) { if (pl.botAim) { pl.aim = Object.assign({ on: true, src: 'bot' }, pl.botAim); return; } return aimU.apply(this, arguments); };
  // the hologram updates and draws alongside you
  const pu0 = P.update;
  P.update = function (dt) {
    pu0.call(this, dt);
    const h = this.holo;
    if (h && this.spar && this.state === 'run' && !GV.game.paused) { botThink(this, h, dt); h.update(dt, this); if (h.y > FY + 200) { h.x = RING.x1 - 90; h.y = FY - h.h; } }
  };
  const HOLO_LOOK = { suit: '#ff9a4a', cloak: '#6e3415', visor: '#ffe2a8', glow: 'rgba(255,154,74,0.45)', trim: '#ffd36b' };
  const pd0 = GV.Player.prototype.draw;
  GV.Player.prototype.draw = function (ctx, p) {
    if (this.holo) {
      this._dye = HOLO_LOOK;
      ctx.save(); ctx.globalAlpha = 0.78 + 0.12 * Math.sin(this.t * 9); pd0.call(this, ctx, p); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; A.glow(ctx, this.cx, this.cy, 46, 'rgba(255,154,74,0.22)');
      ctx.fillStyle = 'rgba(255,180,110,0.18)'; for (let y = this.y - 6; y < this.y + this.h + 4; y += 4) ctx.fillRect(this.cx - 16, y + ((this.t * 30) % 4), 32, 1);
      ctx.restore();
      ctx.font = `700 10px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffb36b'; ctx.fillText('MIRROR', this.cx, this.y - 30);
      const f = Math.max(0, this.hp / this.maxHp); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(this.cx - 22, this.y - 24, 44, 5); ctx.fillStyle = '#ff9a4a'; ctx.fillRect(this.cx - 22, this.y - 24, 44 * f, 5);
      return;
    }
    pd0.call(this, ctx, p);
    if (p && p.holo && this === p.players[0]) p.holo.draw(ctx, p);
  };

  // ---------------- drawing the room ----------------
  const rock0 = A.rock;
  A.rock = function (ctx, r, pal, v) {
    if (r.ringWall) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0); g.addColorStop(0, 'rgba(255,154,74,0)'); g.addColorStop(0.5, 'rgba(255,154,74,0.45)'); g.addColorStop(1, 'rgba(255,154,74,0)'); ctx.fillStyle = g; ctx.fillRect(r.x, FY - 330, r.w, 330); ctx.restore(); return; }
    if (!r.hull) return rock0.apply(this, arguments);
    if (r.roof) { ctx.fillStyle = '#10141f'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = '#273047'; ctx.fillRect(r.x, r.y + r.h - 8, r.w, 8); return; }
    if (r.w < 100) { ctx.fillStyle = '#141a28'; ctx.fillRect(r.x, r.y, r.w, r.h); return; }
    ctx.fillStyle = '#161c2b'; ctx.fillRect(r.x, r.y, r.w, Math.min(r.h, 140));
    ctx.fillStyle = '#2c3650'; ctx.fillRect(r.x, r.y, r.w, 5);
    ctx.fillStyle = 'rgba(143,233,255,0.08)';
    const x0 = Math.max(r.x, v ? v.x0 : r.x), x1 = Math.min(r.x + r.w, v ? v.x1 : r.x + r.w);
    for (let x = Math.floor(x0 / 48) * 48; x < x1; x += 48) ctx.fillRect(x, r.y + 8, 2, 16);
  };
  const back0 = P.drawTitanBack;
  P.drawTitanBack = function (ctx) {
    back0 && back0.apply(this, arguments);
    if (!this.L.hall) return;
    const t = this.t, g = inGuild() ? GV.guild.g : null, acc = g ? g.color : '#8fe9ff';
    const vx0 = this.cam.x - 80, vx1 = this.cam.x + C.W / (this.zoom ? this.zoom() : 1) + 80;
    // hull interior
    const grd = ctx.createLinearGradient(0, TOP, 0, FY);
    grd.addColorStop(0, '#0c1019'); grd.addColorStop(1, '#151b29');
    ctx.fillStyle = grd; ctx.fillRect(Math.max(-60, vx0), TOP, Math.min(W + 60, vx1) - Math.max(-60, vx0), FY - TOP);
    // ribs and windows
    for (let x = 0; x < W; x += 180) {
      if (x + 180 < vx0 || x > vx1) continue;
      ctx.fillStyle = '#1b2233'; ctx.fillRect(x, TOP, 14, FY - TOP);
      ctx.fillStyle = 'rgba(143,233,255,0.05)'; ctx.fillRect(x + 14, TOP, 2, FY - TOP);
      if ((x / 180) % 3 === 1) {
        const wx = x + 40, wy = TOP + 50, ww = 100, wh = 120;
        ctx.fillStyle = '#05070c'; A.rrect(ctx, wx, wy, ww, wh, 16);
        for (let i = 0; i < 12; i++) { const sx = wx + 8 + ((i * 37 + x) % (ww - 16)), sy = wy + 8 + ((i * 53 + x * 3) % (wh - 16)); const tw = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.7 + i)) + 0.6 * (GV.pulseOf ? GV.pulseOf('high') : 0) * Math.max(0, Math.sin(t * 4 + i * 2.3)); ctx.fillStyle = `rgba(255,255,255,${Math.min(1, tw)})`; ctx.fillRect(sx, sy, 1.5, 1.5); }
        ctx.strokeStyle = '#2c3650'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(wx, wy, ww, wh, 16) : ctx.rect(wx, wy, ww, wh); ctx.stroke();
      }
    }
    // ceiling light strips (they breathe with the music: GV.pulse)
    const pb = GV.pulseOf ? GV.pulseOf('bass') : 0, pk = GV.pulseOf ? GV.pulseOf('kick') : 0, ph = GV.pulseOf ? GV.pulseOf('high') : 0;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let x = 60; x < W; x += 240) {
      if (x < vx0 - 100 || x > vx1) continue;
      const fl = (0.85 + 0.15 * Math.sin(t * 2.3 + x) + (Math.sin(t * 17 + x * 3) > 0.985 ? -0.5 : 0)) * (1 + 1.1 * pb + 0.6 * pk); // the odd flicker, and the beat
      ctx.fillStyle = `rgba(143,233,255,${0.22 * fl})`; ctx.fillRect(x, TOP + 4, 120, 4);
      A.glow(ctx, x + 60, TOP + 10, 90, `rgba(143,233,255,${0.1 * fl})`);
      // a soft cone of light falling to the deck
      const cone = ctx.createLinearGradient(0, TOP + 8, 0, FY);
      cone.addColorStop(0, `rgba(143,233,255,${0.07 * fl})`); cone.addColorStop(1, 'rgba(143,233,255,0)');
      ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(x + 10, TOP + 8); ctx.lineTo(x + 110, TOP + 8); ctx.lineTo(x + 170, FY); ctx.lineTo(x - 50, FY); ctx.closePath(); ctx.fill();
    }
    // floor running lights, chasing toward the drop tube
    for (let x = 0; x < W; x += 56) {
      if (x < vx0 - 40 || x > vx1) continue;
      const k = Math.min(1.6, 0.35 + 0.65 * Math.max(0, Math.sin(t * 3 - x / 140)) + 0.9 * pk + 0.4 * pb);
      ctx.fillStyle = `rgba(143,233,255,${0.35 * k})`; ctx.fillRect(x, FY - 3, 18, 2);
      A.glow(ctx, x + 9, FY - 2, 14, `rgba(143,233,255,${0.12 * k})`);
    }
    // wall conduits with pulses of light flowing along them
    for (const cy of [TOP + 196, TOP + 214]) {
      ctx.fillStyle = 'rgba(40,60,90,0.6)'; ctx.fillRect(Math.max(0, vx0), cy, Math.min(W, vx1) - Math.max(0, vx0), 3);
      for (let i = 0; i < 6; i++) {
        const px = ((t * (cy % 2 ? 260 : 190) + i * 1300) % (W + 400)) - 200;
        if (px < vx0 - 100 || px > vx1 + 100) continue;
        const g2 = ctx.createLinearGradient(px - 120, 0, px, 0); g2.addColorStop(0, 'rgba(255,154,74,0)'); g2.addColorStop(1, cy % 2 ? 'rgba(255,154,74,0.6)' : 'rgba(125,255,176,0.55)');
        ctx.fillStyle = g2; ctx.fillRect(px - 120, cy - 1, 120, 5);
      }
    }
    // console lights blinking on the ribs
    for (let x = 0; x < W; x += 180) {
      if (x < vx0 - 40 || x > vx1) continue;
      for (let j = 0; j < 4; j++) { const on = Math.sin(t * (1.3 + j * 0.7) + x * 0.13 + j) > 0.2, c = ['#ff6a7a', '#7dffb0', '#ffd36b', '#8fe9ff'][(x / 180 + j) % 4]; if (!on && !(ph > 0.35 && Math.sin(t * 9 + x + j * 4) > 0.6)) continue; ctx.fillStyle = c; ctx.fillRect(x + 4, FY - 140 + j * 12, 6, 4); A.glow(ctx, x + 7, FY - 138 + j * 12, 9 * (1 + ph), c); }
    }
    ctx.restore();
    // wing signs
    ctx.font = `700 13px ${C.FONT}`; ctx.textAlign = 'center';
    for (const [x, txt] of [[640, 'STORES'], [1900, 'COMMAND'], [3360, 'CREW DECK'], [4210, 'TRAINING'], [(RING.x0 + RING.x1) / 2, 'SPARRING RING']]) { ctx.fillStyle = 'rgba(232,240,255,0.35)'; ctx.fillText(txt, x, TOP + 34); }
    // banner over the war room
    const bx = 2375, by = TOP + 60;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(bx - 70, by, 140, 150);
    ctx.fillStyle = acc; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(bx - 60, by); ctx.lineTo(bx + 60, by); ctx.lineTo(bx + 60, by + 130); ctx.lineTo(bx, by + 150); ctx.lineTo(bx - 60, by + 130); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#0b0e16'; ctx.font = `700 44px ${C.FONT}`; ctx.fillText(g ? g.emblem : '✦', bx, by + 70);
    ctx.font = `800 18px ${C.FONT}`; ctx.fillText(g ? `[${g.tag}]` : 'LANTERN', bx, by + 108);
    // sparring ring floor
    ctx.fillStyle = 'rgba(255,154,74,0.08)'; ctx.fillRect(RING.x0, FY - 8, RING.x1 - RING.x0, 8);
    ctx.strokeStyle = 'rgba(255,154,74,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(RING.x0, FY - 70); ctx.lineTo(RING.x1, FY - 70); ctx.moveTo(RING.x0, FY - 40); ctx.lineTo(RING.x1, FY - 40); ctx.stroke();
    for (const x of [RING.x0, RING.x1]) { ctx.fillStyle = '#3a2a22'; ctx.fillRect(x - 5, FY - 90, 10, 90); }
    // stations
    for (const s of this.L.stations) if (s.x + 150 > vx0 && s.x - 150 < vx1) drawStation(ctx, this, s, t, acc);
    // dps meters over the dummies
    if (this.dps) { ctx.font = `700 12px ${C.FONT}`; ctx.fillStyle = '#ffd36b'; const lbl = (v) => (v >= 1e4 ? (v / 1000).toFixed(1) + 'k' : Math.round(v)); ctx.fillText(`DPS ${lbl(this.dps[0].cur || 0)} · best ${lbl(this.dps[0].best)}`, this.L.dummies[0].x, FY - 120); ctx.fillText(`PACK DPS ${lbl(this.dps[1].cur || 0)} · best ${lbl(this.dps[1].best)}`, this.L.dummies[2].x, FY - 90); }
    // the war table's hologram: the whole map, floating over the room
    drawHolo(ctx, this, t);
    // duel scoreboard
    if (this.spar || this.guestSpar) {
      const d = this.spar || this.guestSpar, cx = (RING.x0 + RING.x1) / 2, n = d.score.length, gap = 120;
      ctx.textAlign = 'center';
      d.score.forEach((sc, t) => {
        const x = cx + (t - (n - 1) / 2) * gap, lab = d.labels ? d.labels[t] : label(d, t), col = d.cols ? d.cols[t] : colOf(d, t);
        ctx.font = `800 22px ${C.FONT}`; ctx.fillStyle = col; ctx.fillText(String(sc), x, TOP + 70);
        ctx.font = `700 10px ${C.FONT}`; ctx.fillText(String(lab || '').toUpperCase(), x, TOP + 86);
      });
      ctx.font = `600 11px ${C.FONT}`; ctx.fillStyle = '#ffb36b';
      ctx.fillText(d.kind === 'holo' ? `MIRROR · ${['RECRUIT', 'VETERAN', 'ELITE'][d.lvl || 0]}` : { duel: 'DUEL', ffa: 'FREE-FOR-ALL', teams: 'TEAMS 2V2' }[d.kind] || 'SPAR', cx, TOP + 104);
    }
  };
  function drawStation(ctx, p, s, t, acc) {
    const x = s.x, y = FY, near = p.nearStation === s;
    ctx.save();
    const glow = (r, col) => A.glow(ctx, x, y - 50, r, col);
    if (s.id === 'airlock') { ctx.fillStyle = '#1e2638'; ctx.fillRect(x - 34, y - 130, 68, 130); ctx.fillStyle = '#0a0d14'; ctx.fillRect(x - 26, y - 122, 24, 122); ctx.fillRect(x + 2, y - 122, 24, 122); ctx.fillStyle = '#ff6a7a'; ctx.fillRect(x - 4, y - 140, 8, 6); }
    if (s.id === 'vault' || s.id === 'gbank') { const col = s.id === 'gbank' ? acc : '#ffd36b'; ctx.fillStyle = '#222b40'; A.rrect(ctx, x - 38, y - 110, 76, 110, 8); ctx.fillStyle = '#0b0f19'; A.rrect(ctx, x - 28, y - 100, 56, 40, 4); ctx.fillStyle = col; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 2); ctx.fillRect(x - 22, y - 92, 44, 3); ctx.fillRect(x - 22, y - 84, 30, 3); ctx.fillRect(x - 22, y - 76, 38, 3); ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 32, 14, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y - 32); ctx.lineTo(x + Math.cos(t) * 10, y - 32 + Math.sin(t) * 10); ctx.stroke(); }
    if (s.id.startsWith('bench_')) {
      // a workbench with a fabrication arm; its lamp shows the bench's level, the hologram what it works on
      const bk = s.id.slice(6), BB = GV.fab && GV.fab.BENCHES[bk];
      const lv = GV.fab ? GV.fab.benchLv(bk) : 0, col = ['#aab2c2', '#7dffb0', '#6fb8ff', '#ff9a4a'][lv];
      if (BB) {
        const hy = y - 150 + Math.sin(t * 1.8 + x) * 4;
        A.glow(ctx, x - 6, hy, 30, BB.color + '55');
        ctx.save(); ctx.globalAlpha = 0.75 + Math.sin(t * 3 + x) * 0.15; ctx.fillStyle = BB.color; ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(BB.icon, x - 6, hy); ctx.restore();
        ctx.strokeStyle = BB.color + '66'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 20, y - 56); ctx.lineTo(x - 6, hy + 14); ctx.lineTo(x + 8, y - 56); ctx.stroke();
      }
      ctx.fillStyle = '#232a3a'; A.rrect(ctx, x - 50, y - 46, 100, 46, 6); ctx.fillStyle = '#323b50'; ctx.fillRect(x - 54, y - 50, 108, 8);
      ctx.fillStyle = '#1a202c'; ctx.fillRect(x - 40, y - 36, 26, 30); ctx.fillRect(x + 14, y - 36, 26, 30);
      const sw = Math.sin(t * 1.6) * 0.5;
      ctx.strokeStyle = '#5a6478'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + 30, y - 50); ctx.lineTo(x + 30, y - 120); ctx.lineTo(x + 30 - 40 * Math.cos(sw), y - 120 + 26 * Math.sin(sw) + 22); ctx.stroke();
      const tx = x + 30 - 40 * Math.cos(sw), ty = y - 120 + 26 * Math.sin(sw) + 22;
      A.glow(ctx, tx, ty + 6, 16 + Math.sin(t * 9) * 4, col);
      if (Math.random() < 0.3) p.parts.push({ x: tx, y: ty + 6, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 120, life: 0.4, max: 0.4, size: 2, color: col, add: true });
      ctx.fillStyle = '#9aa6bd'; ctx.fillRect(x - 20, y - 56, 34, 6);
      A.glow(ctx, x - 44, y - 64, 10, col); ctx.fillStyle = col; A.circle(ctx, x - 44, y - 64, 3);
    }
    if (s.id === 'armory') { ctx.fillStyle = '#20283a'; ctx.fillRect(x - 55, y - 150, 110, 8); ctx.fillRect(x - 55, y - 8, 110, 8); for (let i = 0; i < 4; i++) { const ix = x - 42 + i * 28; ctx.strokeStyle = ['#8fe9ff', '#ffd36b', '#ff9a4a', '#c38bff'][i]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ix, y - 140); ctx.lineTo(ix, y - 30); ctx.stroke(); ctx.fillStyle = '#9aa6c0'; ctx.fillRect(ix - 6, y - 40, 12, 4); } }
    if (s.id === 'forge') { ctx.fillStyle = '#241e2e'; A.rrect(ctx, x - 40, y - 70, 80, 70, 10); A.glow(ctx, x, y - 95, 40, 'rgba(195,139,255,0.35)'); ctx.fillStyle = '#c38bff'; ctx.save(); ctx.translate(x, y - 100 + Math.sin(t * 2) * 5); ctx.rotate(t); ctx.fillRect(-9, -9, 18, 18); ctx.restore(); }
    if (s.id === 'mirror') { ctx.fillStyle = '#1e2638'; A.rrect(ctx, x - 30, y - 140, 60, 140, 30); const mg = ctx.createLinearGradient(x - 24, 0, x + 24, 0); mg.addColorStop(0, '#5f7aa8'); mg.addColorStop(0.5, '#c9e6ff'); mg.addColorStop(1, '#5f7aa8'); ctx.fillStyle = mg; ctx.globalAlpha = 0.5; A.rrect(ctx, x - 24, y - 132, 48, 124, 24); ctx.globalAlpha = 1; }
    if (s.id === 'table') {
      ctx.fillStyle = '#1b2233'; ctx.fillRect(x - 120, y - 54, 240, 14); ctx.fillRect(x - 100, y - 40, 20, 40); ctx.fillRect(x + 80, y - 40, 20, 40);
      ctx.globalCompositeOperation = 'lighter'; A.glow(ctx, x, y - 110, 110, 'rgba(143,233,255,0.18)');
      if (!(p.holoK > 0.2)) for (let i = 0; i < 3; i++) { ctx.strokeStyle = `rgba(143,233,255,${0.25 + i * 0.1})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y - 110, 70 - i * 18, 26 - i * 7, t * (0.3 + i * 0.2), 0, Math.PI * 2); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';

    }
    if (s.id === 'pad') {
      // the drop tube: a glass launch canister with a pod waiting inside
      const n = p.padReady || 0, need = p.padNeed || p.players.length, all = n >= need && n > 0, live = p.launchT != null;
      const hw = s.w / 2, top = y - 230, col = live ? '#ff5a4a' : all ? '#7dffb0' : '#8fe9ff', pulse = 0.5 + 0.5 * Math.sin(t * (live ? 12 : 3));
      ctx.fillStyle = '#141a28'; ctx.fillRect(x - hw - 14, y - 14, s.w + 28, 14); // base
      ctx.fillStyle = '#1b2233'; ctx.fillRect(x - hw - 14, top - 18, s.w + 28, 22); // ceiling collar
      // glass
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
      gg.addColorStop(0, A.col ? 'rgba(143,233,255,0.16)' : 'rgba(143,233,255,0.16)'); gg.addColorStop(0.5, 'rgba(143,233,255,0.03)'); gg.addColorStop(1, 'rgba(143,233,255,0.12)');
      ctx.fillStyle = gg; ctx.fillRect(x - hw, top, s.w, y - 14 - top);
      ctx.fillStyle = live ? `rgba(255,90,74,${0.12 + 0.18 * pulse})` : all ? 'rgba(125,255,176,0.16)' : 'rgba(143,233,255,0.07)';
      ctx.fillRect(x - hw, top, s.w, y - 14 - top);
      // rising light rings
      for (let i = 0; i < 4; i++) { const yy = y - 14 - ((t * (live ? 180 : 50) + i * 55) % (y - 14 - top)); ctx.fillStyle = live ? 'rgba(255,140,90,0.45)' : all ? 'rgba(125,255,176,0.35)' : 'rgba(143,233,255,0.2)'; ctx.fillRect(x - hw + 6, yy, s.w - 12, 2); }
      ctx.restore();
      // frame rings
      ctx.fillStyle = '#2a3348';
      for (const yy of [top, top + 70, top + 140, y - 30]) ctx.fillRect(x - hw - 6, yy, s.w + 12, 6);
      ctx.fillRect(x - hw - 6, top, 6, y - top); ctx.fillRect(x + hw, top, 6, y - top);
      // the pod at the bottom of the tube
      const px = x, py = y - 18, lid = live ? Math.min(1, (3.2 - p.launchT) / 0.8) : 0;
      ctx.fillStyle = '#3a4258'; ctx.beginPath(); ctx.moveTo(px - 30, py); ctx.lineTo(px - 24, py - 46); ctx.quadraticCurveTo(px, py - 70, px + 24, py - 46); ctx.lineTo(px + 30, py); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffb347'; ctx.fillRect(px - 28, py - 8, 56, 3); // hazard band
      ctx.fillStyle = '#0b0f19'; A.rrect(ctx, px - 13, py - 44 + lid * 0, 26, 22 - lid * 0, 8);
      ctx.fillStyle = col; ctx.globalAlpha = 0.5 + 0.5 * pulse; A.rrect(ctx, px - 11, py - 42, 22, 6, 3); ctx.globalAlpha = 1;
      if (live) { for (let i = 0; i < 2; i++) p.parts.push({ x: x + (Math.random() - 0.5) * s.w, y: y - 16, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 80, life: 0.8, max: 0.8, size: 4, color: 'rgba(200,210,230,0.35)' }); }
      // status lamps on the collar
      for (let i = 0; i < 3; i++) { const on = live ? (Math.ceil(p.launchT) <= 3 - i) : all; ctx.fillStyle = on ? (live ? '#ff5a4a' : '#7dffb0') : '#2c3446'; A.circle(ctx, x - 24 + i * 24, top - 8, 4); if (on) A.glow(ctx, x - 24 + i * 24, top - 8, 12, live ? 'rgba(255,90,74,0.6)' : 'rgba(125,255,176,0.6)'); }
      A.glow(ctx, x, y - 40, 120, live ? `rgba(255,90,74,${0.1 + pulse * 0.1})` : 'rgba(143,233,255,0.06)');
      ctx.font = `700 12px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = live ? '#ff8a6a' : all ? '#7dffb0' : '#e8f0ff';
      const hasM = p.netGuest ? !!H.guestSel : !!H.mission;
      ctx.fillText(!hasM ? 'PLAN A MISSION AT THE WAR TABLE' : live ? `LAUNCH IN ${Math.ceil(p.launchT)}` : `STEP IN · READY ${n}/${need}`, x, top - 30);
    }
    if (s.id === 'comms') { ctx.fillStyle = '#1e2638'; ctx.fillRect(x - 30, y - 90, 60, 90); ctx.fillStyle = '#0b0f19'; ctx.fillRect(x - 22, y - 82, 44, 30); ctx.fillStyle = '#7dffb0'; const on = GV.friends ? GV.friends.onlineCount() : 0; ctx.font = `700 11px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillText(on ? `${on} ONLINE` : 'NO SIGNAL', x, y - 63); ctx.strokeStyle = '#9aa6c0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 90); ctx.lineTo(x, y - 130); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y - 130, 4 + (t * 20) % 16, -2.4, -0.7); ctx.stroke(); }
    if (s.id === 'roster') {
      ctx.fillStyle = '#1b2233'; ctx.fillRect(x - 55, y - 170, 110, 120); ctx.fillRect(x - 4, y - 50, 8, 50);
      ctx.font = `600 10px ${C.FONT}`; ctx.textAlign = 'left';
      if (inGuild()) { const ms = Object.keys(GV.guild.members), onl = new Set(GV.friends ? GV.friends.online().map((q) => q.by) : []); ms.slice(0, 8).forEach((u, i) => { ctx.fillStyle = onl.has(u) || u === GV.guild.myId ? '#7dffb0' : '#6d7890'; ctx.fillText(`● ${(H.names && H.names[u]) || '…'}`, x - 48, y - 154 + i * 13); }); fetchNames(ms.slice(0, 8)); }
      else { ctx.fillStyle = '#9aa6c0'; ctx.fillText('No guild yet.', x - 48, y - 150); ctx.fillText('Found or join one', x - 48, y - 136); ctx.fillText('to fly together.', x - 48, y - 122); }
    }
    if (s.id === 'vesper') { A.npc(ctx, { kind: 'vesper', x, y }, t); ctx.fillStyle = '#3a321f'; ctx.fillRect(x - 46, y - 40, 92, 40); ctx.fillStyle = '#ffb347'; ctx.fillRect(x - 46, y - 40, 92, 3); ctx.fillStyle = '#8fe9ff'; ctx.fillRect(x - 30, y - 50, 10, 10); ctx.fillStyle = '#c38bff'; ctx.fillRect(x + 18, y - 48, 9, 8); }
    if (s.id === 'board') {
      ctx.fillStyle = '#141a28'; ctx.fillRect(x - 60, y - 190, 120, 110); ctx.fillRect(x - 4, y - 80, 8, 80);
      ctx.font = `700 9px ${C.FONT}`; ctx.textAlign = 'left';
      const f = main().frontier || {}, rows = [['VOID DEPTHS', `best ${f.depthBest || 0}`], ['TITAN HUNT', 'weekly'], ['BOUNTIES', f.bounty ? 'posted' : 'new'], ['MARKS', String(f.marks || 0)]];
      rows.forEach(([a, b2], i) => { ctx.fillStyle = '#ffd36b'; ctx.fillText(a, x - 52, y - 172 + i * 22); ctx.fillStyle = (Math.floor(t * 2 + i) % 7) ? '#8fe9ff' : '#fff'; ctx.textAlign = 'right'; ctx.fillText(b2.toUpperCase(), x + 52, y - 172 + i * 22); ctx.textAlign = 'left'; });
    }
    if (s.id === 'radio') {
      ctx.fillStyle = '#2a2030'; A.rrect(ctx, x - 34, y - 96, 68, 96, 10); ctx.fillStyle = '#120e16'; A.rrect(ctx, x - 26, y - 88, 52, 26, 4);
      const np = GV.soundtrack.nowPlaying; ctx.font = `600 8px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffb36b';
      const nm = np ? np.name : 'GENERATED SCORE'; ctx.save(); ctx.beginPath(); ctx.rect(x - 24, y - 86, 48, 22); ctx.clip(); const w = ctx.measureText(nm.toUpperCase()).width; ctx.fillText(nm.toUpperCase(), x + (w > 46 ? 24 + w / 2 - ((t * 30) % (w + 52)) : 0), y - 72); ctx.restore();
      for (let i = 0; i < 7; i++) { const h = 4 + Math.abs(Math.sin(t * (3 + i) + i)) * (np ? 16 : 4); ctx.fillStyle = '#ff9a4a'; ctx.fillRect(x - 24 + i * 7, y - 30 - h, 5, h); }
      for (const dx of [-16, 16]) { ctx.fillStyle = '#1a141f'; ctx.beginPath(); ctx.arc(x + dx, y - 16, 9, 0, Math.PI * 2); ctx.fill(); }
    }
    if (s.id === 'codex') { ctx.fillStyle = '#1e2638'; ctx.fillRect(x - 28, y - 110, 56, 110); ctx.fillStyle = '#0b0f19'; ctx.fillRect(x - 20, y - 100, 40, 54); ctx.fillStyle = '#7dffb0'; for (let i = 0; i < 6; i++) ctx.fillRect(x - 16, y - 94 + i * 8, 10 + ((i * 13) % 20), 2); const un = GV.codex ? GV.codex.unread() : 0; if (un) { ctx.fillStyle = '#ff6a7a'; ctx.beginPath(); ctx.arc(x + 22, y - 108, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `700 9px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillText(String(un), x + 22, y - 105); } }
    if (s.id === 'quests') { ctx.fillStyle = '#2c2418'; ctx.fillRect(x - 46, y - 170, 92, 90); ctx.fillRect(x - 3, y - 80, 6, 80); for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#e8e2d4', '#ffd36b', '#c9d2e6'][i]; ctx.save(); ctx.translate(x - 30 + i * 28, y - 150 + (i % 2) * 14); ctx.rotate((i - 1) * 0.12); ctx.fillRect(-11, 0, 22, 30); ctx.restore(); } const un = GV.quests && GV.quests.unclaimed ? GV.quests.unclaimed() : 0; if (un) { ctx.fillStyle = '#7dffb0'; ctx.font = `700 10px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillText(`${un} TO CLAIM`, x, y - 176); } }
    if (s.id === 'trophy') {
      ctx.fillStyle = '#1b2233'; ctx.fillRect(x - 55, y - 140, 110, 140); ctx.fillStyle = 'rgba(143,233,255,0.08)'; ctx.fillRect(x - 48, y - 132, 96, 124);
      const kills = Object.values(main().titans || {}).reduce((a, b2) => a + b2, 0), achN = GV.ach ? GV.ach.count() : 0;
      ctx.font = `700 15px ${C.FONT}`; ctx.textAlign = 'center';
      for (let i = 0; i < Math.min(kills, 6); i++) { ctx.fillStyle = '#ffd36b'; ctx.fillText('♜', x - 34 + (i % 3) * 34, y - 104 + Math.floor(i / 3) * 26); }
      ctx.font = `700 10px ${C.FONT}`; ctx.fillStyle = '#c9d3ea'; ctx.fillText(`${achN}/${GV.ACH ? GV.ACH.length : 0}`, x, y - 30);
    }
    if (s.id === 'crew' || s.id === 'hangar') {
      const wide = s.id === 'hangar'; ctx.fillStyle = '#1e2638'; ctx.fillRect(x - (wide ? 44 : 30), y - 140, wide ? 88 : 60, 140);
      const open = p.nearStation === s ? 0.35 : 0; ctx.fillStyle = '#0a0d14'; ctx.fillRect(x - (wide ? 38 : 24), y - 132, (wide ? 38 : 24) * (1 - open), 132); ctx.fillRect(x + (wide ? 38 : 24) * open, y - 132, (wide ? 38 : 24) * (1 - open), 132);
      ctx.fillStyle = s.id === 'crew' ? '#ffd28a' : '#8fe9ff'; ctx.fillRect(x - 4, y - 150, 8, 5);
      if (s.id === 'crew' && GV.CREW) { const gifts = Object.keys(GV.CREW).filter((k) => GV.CREW[k].unlock() && (!(main().crew || {})[k] || (main().crew || {})[k].gift !== new Date().toISOString().slice(0, 10))).length; if (gifts) { ctx.fillStyle = '#7dffb0'; ctx.font = `700 10px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillText(`${gifts} GIFT${gifts > 1 ? 'S' : ''}`, x, y - 158); } }
    }
    if (s.id === 'engine') {
      ctx.fillStyle = '#20283a'; A.rrect(ctx, x - 58, y - 120, 116, 120, 14);
      ctx.globalCompositeOperation = 'lighter'; A.glow(ctx, x, y - 64, 54, 'rgba(255,154,74,0.35)'); ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#ff9a4a'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x, y - 64, 14 + i * 10, t * (1 + i * 0.4), t * (1 + i * 0.4) + 4); ctx.stroke(); }
    }
    if (s.id === 'chart') { ctx.fillStyle = '#141a28'; ctx.beginPath(); ctx.arc(x, y - 90, 40, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 4, y - 50, 8, 50); ctx.strokeStyle = 'rgba(143,233,255,0.6)'; ctx.lineWidth = 1; for (let i = 0; i < 9; i++) { const a = i * 0.7 + t * 0.2, r = 10 + (i % 3) * 10; ctx.fillStyle = '#8fe9ff'; ctx.fillRect(x + Math.cos(a) * r - 1.5, y - 90 + Math.sin(a) * r - 1.5, 3, 3); } const pts = GV.TREE && GV.TREE.points ? GV.TREE.points() : 0; if (pts > 0) { ctx.fillStyle = '#ffd36b'; ctx.font = `700 10px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillText(`+${pts}`, x, y - 136); } }
    if (s.id === 'altar') { const on = GV.asc && (GV.asc.unlocked() || GV.asc.reqMet()); ctx.fillStyle = '#241e2e'; ctx.beginPath(); ctx.moveTo(x - 36, y); ctx.lineTo(x - 22, y - 70); ctx.lineTo(x + 22, y - 70); ctx.lineTo(x + 36, y); ctx.fill(); if (on) { ctx.globalCompositeOperation = 'lighter'; A.glow(ctx, x, y - 96, 36, 'rgba(255,211,107,0.4)'); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#ffd36b'; ctx.font = `700 22px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillText('✦', x, y - 86 + Math.sin(t * 2) * 4); } }
    if (s.id === 'ring') { ctx.fillStyle = '#2a2230'; A.rrect(ctx, x - 26, y - 100, 52, 100, 8); ctx.fillStyle = '#ff9a4a'; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 3); ctx.fillRect(x - 16, y - 88, 32, 6); ctx.globalAlpha = 1; ctx.font = `700 16px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillText('⚔', x, y - 52); const r = main().pvp; if (r) { ctx.font = `600 10px ${C.FONT}`; ctx.fillStyle = '#c9b49a'; ctx.fillText(`${r.w || 0}W ${r.l || 0}L`, x, y - 30); } }
    // label + prompt
    ctx.font = `700 10px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = near ? '#fff' : 'rgba(232,240,255,0.45)';
    if (s.id !== 'pad') ctx.fillText(s.label, x, y + 20 > FY + 18 ? FY + 18 : y + 20);
    if (near && !p.console) {
      const txt = `${I.isTouch ? 'TAP E' : I.label('interact')} · ${s.act.toUpperCase()}`;
      ctx.font = `700 12px ${C.FONT}`; const w = ctx.measureText(txt).width + 18;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; A.rrect(ctx, x - w / 2, y - 205, w, 22, 6); ctx.fillStyle = '#fff'; ctx.fillText(txt, x, y - 189);
    }
    // console menu in the world
    if (p.console && p.console.id === s.id && s.id !== 'table') {
      const c = p.console, it = c.items[c.i];
      ctx.fillStyle = 'rgba(6,9,16,0.88)'; A.rrect(ctx, x - 150, y - 270, 300, 92, 10);
      ctx.strokeStyle = s.id === 'ring' ? '#ff9a4a' : '#8fe9ff'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 146, y - 266, 292, 84);
      ctx.font = `800 15px ${C.FONT}`; ctx.fillStyle = it.locked ? '#6d7890' : '#fff'; ctx.fillText(`◀  ${it.name}  ▶`, x, y - 240);
      ctx.font = `500 11px ${C.FONT}`; ctx.fillStyle = '#9aa6c0'; ctx.fillText(it.sub, x, y - 222);
      ctx.font = `600 10px ${C.FONT}`; ctx.fillStyle = '#8fe9ff'; ctx.fillText(`${c.i + 1}/${c.items.length} · ${I.label('left')}/${I.label('right')} choose · ${I.label('interact')} pick · ${I.label('dash')} step away`, x, y - 196);
    }
    ctx.restore();
  }
  // ---------------- the hologram star map over the war table ----------------
  function drawHolo(ctx, p, t) {
    const tb = station(p, 'table'); if (!tb) return;
    const open = p.console && p.console.id === 'table', k = (p.holoK = Math.max(0, Math.min(1, (p.holoK || 0) + (open ? 0.08 : -0.08))));
    const cx = tb.x, top = FY - 245, w = 240 + 400 * k, h = 50 + 112 * k, x0 = cx - w / 2; // sits in the band the deck camera shows
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // projector cone
    const cone = ctx.createLinearGradient(0, FY - 60, 0, top + h); cone.addColorStop(0, 'rgba(143,233,255,0.18)'); cone.addColorStop(1, 'rgba(143,233,255,0.02)');
    ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(cx - 70, FY - 56); ctx.lineTo(cx + 70, FY - 56); ctx.lineTo(x0 + w, top + h); ctx.lineTo(x0, top + h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(10,30,50,0.35)'; ctx.fillRect(x0, top, w, h);
    ctx.strokeStyle = 'rgba(143,233,255,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, top + 0.5, w - 1, h - 1);
    for (let yy = top + ((t * 20) % 6); yy < top + h; yy += 6) { ctx.fillStyle = 'rgba(143,233,255,0.03)'; ctx.fillRect(x0, yy, w, 1); }
    const fr = GV.progress.frontier(), nSys = Math.min(fr + 2, 99), sel = (p.netGuest ? null : H.mission) || {}, selSys = Number.isFinite(sel.s) ? sel.s : fr;
    const show = []; for (let s2 = Math.max(0, selSys - 3); s2 < Math.min(nSys, Math.max(0, selSys - 3) + 6); s2++) show.push(s2);
    const span = k > 0.5 ? w - 300 : w - 80, gap = span / Math.max(1, show.length - 1 || 1), py = top + (k > 0.5 ? 30 : h / 2);
    // route line
    ctx.strokeStyle = 'rgba(143,233,255,0.25)'; ctx.setLineDash([4, 6]); ctx.beginPath(); show.forEach((s2, i) => { const px = x0 + 40 + i * gap; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); ctx.setLineDash([]);
    show.forEach((s2, i) => {
      const px = x0 + 40 + i * gap, open2 = s2 <= fr, act = GV.ACTS ? GV.ACTS[GV.actOf(s2)] : null, col = act ? act.color : '#8fe9ff', isSel = s2 === selSys;
      const r = (isSel ? 13 : 8) * (0.7 + 0.3 * k);
      ctx.globalAlpha = open2 ? 1 : 0.3; A.glow(ctx, px, py, r * 3, col + '55'); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      if (isSel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(px, py, r + 8, r * 0.45 + 4, t * 0.6, 0, Math.PI * 2); ctx.stroke(); }
      if (k > 0.4) { const sys = GV.UNIVERSE.system(s2); ctx.font = `700 9px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = open2 ? '#e8f0ff' : '#6d7890'; ctx.fillText(open2 ? sys.name.toUpperCase() : 'UNCHARTED', px, py + r + 14); }
      // a Titan gate stands open here: mark it so it can be found
      if (GV.titanFor && GV.save.data.cleared[`${s2}-2`] && !online(p)) {
        ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 4 + i); ctx.font = `700 ${k > 0.4 ? 13 : 11}px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ff9a4a';
        ctx.fillText('☠', px + r + 6, py - r - 2);
      }
      ctx.globalAlpha = 1;
    });
    if (k > 0.6) {
      // the chosen system's missions
      const sys = GV.UNIVERSE.system(selSys), act = GV.ACTS ? GV.ACTS[GV.actOf(selSys)] : null, nodes = [];
      for (let st = 0; st < 3; st++) nodes.push({ k: 'stage', s: selSys, st, name: sys.stages[st].name, open: GV.progress.stageOpen(selSys, st), done: !!GV.save.data.cleared[`${selSys}-${st}`] });
      if (GV.titanFor && GV.save.data.cleared[`${selSys}-2`] && !online(p)) nodes.push({ k: 'titan', s: selSys, name: `Titan · ${GV.TITANS[GV.titanFor(selSys)].name}`, open: true });
      const ny = top + 82, ng = Math.min(110, (w - 300) / Math.max(1, nodes.length - 1));
      nodes.forEach((n, i) => {
        const nx = x0 + 40 + i * ng, on = sel.k === n.k && sel.s === n.s && (n.k !== 'stage' || sel.st === n.st);
        if (i) { ctx.strokeStyle = 'rgba(143,233,255,0.3)'; ctx.beginPath(); ctx.moveTo(nx - ng + 9, ny); ctx.lineTo(nx - 9, ny); ctx.stroke(); }
        ctx.save(); ctx.translate(nx, ny); ctx.rotate(Math.PI / 4); ctx.globalAlpha = n.open ? 1 : 0.3;
        ctx.strokeStyle = n.k === 'titan' ? '#ff9a4a' : '#8fe9ff'; ctx.lineWidth = on ? 2.5 : 1.2; ctx.strokeRect(-7, -7, 14, 14);
        if (n.done) { ctx.fillStyle = '#8fe9ff'; ctx.fillRect(-4, -4, 8, 8); }
        ctx.restore(); ctx.globalAlpha = 1;
        if (on) { ctx.strokeStyle = '#fff'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5); ctx.beginPath(); ctx.arc(nx, ny, 15, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
        ctx.font = `600 9px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = n.open ? '#c9d3ea' : '#6d7890'; ctx.fillText(n.name.toUpperCase(), nx, ny + 24);
      });
      // a nudge toward any open Titan gate that isn't on this system
      const gates = []; for (let s2 = 0; s2 <= fr; s2++) if (s2 !== selSys && GV.titanFor && GV.save.data.cleared[`${s2}-2`] && !online(p)) gates.push(s2);
      if (gates.length && !nodes.some((n) => n.k === 'titan')) {
        const g0 = gates[gates.length - 1];
        ctx.font = `700 9px ${C.FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#ff9a4a';
        ctx.fillText(`☠ TITAN GATE OPEN · ${GV.UNIVERSE.system(g0).name.toUpperCase()} · ${I.label('down')} TO CHANGE SYSTEM`, x0 + 40, top + h - 24);
      }
      // read-out
      const rx = x0 + w - 230, it = p.console ? p.console.items[p.console.i] : null, m = it ? it.m : sel;
      ctx.textAlign = 'left'; ctx.font = `800 14px ${C.FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(String((it ? it.name : m.name) || '').toUpperCase(), rx, top + 24);
      ctx.font = `500 10px ${C.FONT}`; ctx.fillStyle = '#9aa6c0'; ctx.fillText(String((it ? it.sub : m.sub) || ''), rx, top + 40);
      if (act) { ctx.fillStyle = act.color; ctx.fillText(`ACT ${act.num} · ♪ ${act.album}`, rx, top + 56); }
      if (m && m.k === 'stage') { const bn = sys.stages[m.st] && (sys.stages[m.st].bossName || (GV.BOSSES && GV.BOSSES[sys.stages[m.st].boss] && GV.BOSSES[sys.stages[m.st].boss].name)); if (bn) { ctx.fillStyle = '#ff9a9a'; ctx.fillText(`BOSS · ${String(bn).toUpperCase()}`, rx, top + 72); } }
      ctx.font = `600 9px ${C.FONT}`; ctx.fillStyle = '#8fe9ff'; ctx.textAlign = 'center';
      if (open) ctx.fillText(`${I.label('left')}/${I.label('right')} mission · ${I.label('down')} next system · ${I.label('interact')} confirm · ${I.label('dash')} step away`, cx, top + h - 10);
    } else if (sel.name) {
      ctx.textAlign = 'center'; ctx.font = `700 11px ${C.FONT}`; ctx.fillStyle = '#e8f0ff'; ctx.fillText(String(sel.name).toUpperCase(), cx, top + h - 8);
    }
    if (p.netGuest && H.guestSel) { ctx.textAlign = 'center'; ctx.font = `700 11px ${C.FONT}`; ctx.fillStyle = '#e8f0ff'; ctx.fillText(`HOST'S PLAN · ${H.guestSel.name.toUpperCase()}`, cx, top + h - 8); }
    ctx.restore();
  }
  function fetchNames(ids) {
    H.names = H.names || {};
    const miss = ids.filter((u) => !(u in H.names)); if (!miss.length || !GV.guild.nameOf) return;
    for (const u of miss) { H.names[u] = '…'; GV.guild.nameOf(u).then((n) => { H.names[u] = (n || 'Someone').slice(0, 16); }); }
  }

  // ---------------- online: what the joiner sees ----------------
  addEventListener('load', () => {
    const net = GV.net; if (!net || !net.extFns) return;
    net.extFns.push((o, m) => {
      const p = GV.game.play;
      if (o.hallSel && typeof o.hallSel.name === 'string') H.guestSel = { name: String(o.hallSel.name).slice(0, 60), sub: String(o.hallSel.sub || '').slice(0, 80) };
      if (o.place && p && p.netGuest && o.place.s === N().mySlot && Number.isFinite(o.place.x) && Number.isFinite(o.place.y)) { p.player.x = o.place.x; p.player.y = o.place.y; p.player.vx = p.player.vy = 0; }
      if (o.duelAsk && p && p.netHost) challenge(p, N().slotOfPeer(m.peer));
      if ('spar' in o && p && p.netGuest && p.L.hall) {
        const sp = o.spar, ok = sp && Array.isArray(sp.score);
        const v = ok ? { score: sp.score.map((x) => +x || 0).slice(0, 4), kind: ['holo', 'duel', 'ffa', 'teams'].includes(sp.kind) ? sp.kind : 'duel', lvl: +sp.lvl || 0,
          labels: (Array.isArray(sp.labels) ? sp.labels : []).slice(0, 4).map((x) => String(x).slice(0, 16)), cols: (Array.isArray(sp.cols) ? sp.cols : []).slice(0, 4).map((x) => (/^#[0-9a-f]{6}$/i.test(x) ? x : '#ffffff')) } : null;
        if (!!v !== !!p.guestSpar) ringWalls(p, !!v);
        p.guestSpar = v;
      }
    });
  });
  // send the current mission to a joiner when they arrive
  setInterval(() => { const p = GV.game && GV.game.play; if (p && p.netHost && p.L && p.L.hall && H.mission && N().partner) N().ext({ hallSel: { name: H.mission.name, sub: H.mission.sub } }); }, 3000);

  // ---------------- ways in ----------------
  const map0 = M.map;
  M.map = function () {
    const r = map0.apply(this, arguments);
    const row = document.querySelector('#ui .menu.row [data-a=frontier]'); if (!row || document.querySelector('#ui [data-a=hallBtn]')) return r;
    const b = document.createElement('button'); b.dataset.a = 'hallBtn'; b.className = 'hallBtn';
    b.textContent = inGuild() ? 'Guild Hall' : 'Walk the Deck';
    b.addEventListener('click', (e) => { e.stopPropagation(); GV.audio.sfx('ui'); H.enter(); });
    row.parentNode.insertBefore(b, row);
    return r;
  };
})();
