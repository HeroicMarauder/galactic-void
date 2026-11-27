// Galactic Void — Dungeons. A dungeon is one big locked maze: a grid of rooms carved into passages,
// with climbing shafts between floors, keycard doors (red, then blue, then the gold vault door), shortcut
// loops, treasure rooms behind breakable walls, and a boss vault in the middle.
// Dungeon keys drop as loot; run one from the Lantern's war table (it's a mission while you hold a key).
// Rooms wake up the first time you walk into them. The deepest tier, the Wyrm's Hoard, is guarded by Draconis.
(function () {
  const GV = window.GV, U = GV.util, A = GV.art, C = GV.CFG, P = GV.Play.prototype;
  const RW = 800, RH = 460, WT = 40, DOORH = 150, GAP = 130, STEP = 76;
  const KEYS = [
    { id: 'red', name: 'Red Keycard', color: '#ff5a6a' },
    { id: 'blue', name: 'Blue Keycard', color: '#5ab0ff' },
    { id: 'gold', name: 'Gold Keycard', color: '#ffd36b' },
  ];
  GV.DUNGEONS = {
    1: { name: 'Derelict Hulk', short: 'Derelict', desc: 'A gutted freighter, its holds sealed with keycards', cols: 5, rows: 4, keys: 2, color: '#7dffcf', diffAdd: 0.5 },
    2: { name: 'Abyssal Vault', short: 'Abyssal', desc: 'A drowned research station; bigger, meaner, three locks deep', cols: 6, rows: 5, keys: 3, color: '#6fb8ff', diffAdd: 2 },
    3: { name: 'Wyrm\'s Hoard', short: 'Wyrm', desc: 'The Iron Wyrm\'s nest. Draconis guards the vault', cols: 7, rows: 5, keys: 3, color: '#ff9a3c', diffAdd: 3.5, titan: 'draconis' },
  };
  const D = () => GV.save.main || GV.save.data;
  // Keys belong to whoever picked them up; a squad only needs one between them.
  const keysOf = (d = D()) => { d.dkeys = d.dkeys || {}; return d.dkeys; };
  const p2Data = () => { const M = GV.save.main, c = M && M.coop; return c && c.on && c.p2 && c.p2.cls ? c.p2 : null; };
  GV.dkeys = {
    count: (t) => (keysOf()[t] || 0) + (p2Data() ? keysOf(p2Data())[t] || 0 : 0),
    add: (t, n = 1, d) => { const k = keysOf(d || GV.save.data); k[t] = (k[t] || 0) + n; GV.save.write(); },
    // spend one: Player 1's if they have it, otherwise Player 2's
    spend: (t) => { const a = keysOf(); if ((a[t] || 0) > 0) { a[t]--; GV.save.write(); return 1; } const p2 = p2Data(); if (p2 && (keysOf(p2)[t] || 0) > 0) { keysOf(p2)[t]--; GV.save.write(); return 2; } return 0; },
    any: () => [1, 2, 3].some((t) => GV.dkeys.count(t) > 0),
  };

  // ---------- the maze ----------
  GV.buildDungeon = function (tier, sysIdx, seed) {
    const T = GV.DUNGEONS[tier], r = U.rng(seed >>> 0 || 1), ri = (n) => Math.floor(r() * n);
    const sys = GV.UNIVERSE.system(sysIdx), base = sys.stages[2];
    const diff = GV.UNIVERSE.difficulty(sysIdx, 2) + T.diffAdd;
    const cols = T.cols, rows = T.rows;
    // the vault: the 2x2 block in the middle
    const vc = Math.floor(cols / 2) - 1, vr = Math.floor(rows / 2) - 1;
    const inVault = (c, rr) => c >= vc && c <= vc + 1 && rr >= vr && rr <= vr + 1;
    const X = (c) => (c - vc) * RW, Y = (rr) => (rr - vr) * RH; // the vault's corner is the origin, so Titan code (arena at x 0) just works
    const id = (c, rr) => c + ',' + rr;
    const cells = []; for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) if (!inVault(c, rr)) cells.push([c, rr]);
    const S = [0, rows - 1]; // you land bottom-left
    // randomized depth-first maze over the rooms (the vault joins later, by one door)
    const links = new Set(), edge = (a, b) => [a, b].sort().join('|');
    const seen = new Set([id(...S)]), stack = [S], parent = { [id(...S)]: null }, depth = { [id(...S)]: 0 };
    const nbrs = ([c, rr]) => [[c + 1, rr], [c - 1, rr], [c, rr + 1], [c, rr - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < cols && b < rows && !inVault(a, b));
    while (stack.length) {
      const cur = stack[stack.length - 1], opts = nbrs(cur).filter((n) => !seen.has(id(...n)));
      if (!opts.length) { stack.pop(); continue; }
      const nx = opts[ri(opts.length)];
      links.add(edge(id(...cur), id(...nx))); seen.add(id(...nx)); parent[id(...nx)] = id(...cur); depth[id(...nx)] = depth[id(...cur)] + 1; stack.push(nx);
    }
    // the vault's door: from the deepest room that borders it
    const border = cells.filter(([c, rr]) => nbrs([c, rr]).length < 4 && [[c + 1, rr], [c - 1, rr], [c, rr + 1], [c, rr - 1]].some(([a, b]) => inVault(a, b)));
    border.sort((a, b) => depth[id(...b)] - depth[id(...a)]);
    const NV = border[0];
    // the route from the landing to the vault door, as a list of rooms
    const route = []; for (let k = id(...NV); k; k = parent[k]) route.unshift(k);
    // locks: the last door is the vault (gold); earlier locks sit evenly along the route
    const nK = T.keys, doors = []; // { a, b, key }
    for (let i = 0; i < nK - 1; i++) { const at = Math.max(1, Math.round(((i + 1) * (route.length - 1)) / nK)); doors.push({ a: route[at - 1], b: route[at], key: i }); }
    const vaultKey = nK - 1;
    const lockOf = (a, b) => doors.find((d) => edge(d.a, d.b) === edge(a, b));
    // zones: what you can reach with the first n keys
    const zone = {};
    { let z = 0; const q = [id(...S)]; zone[id(...S)] = 0;
      const fill = (start, zz) => { const st2 = [start]; while (st2.length) { const k = st2.pop(); const [c, rr] = k.split(',').map(Number); for (const n of nbrs([c, rr])) { const kk = id(...n); if (zone[kk] != null || !links.has(edge(k, kk)) || lockOf(k, kk)) continue; zone[kk] = zz; st2.push(kk); } } };
      fill(q[0], 0);
      for (const d of doors) { z++; zone[d.b] = z; fill(d.b, z); }
    }
    // shortcuts: extra passages, but never between zones (that would skip a lock)
    for (const [c, rr] of cells) for (const n of nbrs([c, rr])) { const a = id(c, rr), b = id(...n); if (a < b && !links.has(edge(a, b)) && zone[a] === zone[b] && r() < 0.16) links.add(edge(a, b)); }
    // where each key lies: the room furthest from where its zone begins, off the main route if possible
    const zoneStart = [id(...S), ...doors.map((d) => d.b)];
    const keyRoom = [];
    for (let k = 0; k < nK; k++) {
      const z = k, members = Object.keys(zone).filter((kk) => zone[kk] === z);
      const dist = {}; const q = [zoneStart[z]]; dist[zoneStart[z]] = 0;
      while (q.length) { const kk = q.shift(); const [c, rr] = kk.split(',').map(Number); for (const n of nbrs([c, rr])) { const k2 = id(...n); if (dist[k2] == null && zone[k2] === z && links.has(edge(kk, k2))) { dist[k2] = dist[kk] + 1; q.push(k2); } } }
      members.sort((a, b) => (dist[b] || 0) + (route.includes(b) ? -1.5 : 0) - ((dist[a] || 0) + (route.includes(a) ? -1.5 : 0)));
      keyRoom.push(members.find((m) => m !== id(...S) && !keyRoom.includes(m)) || members[0]);
    }
    // treasure rooms: dead ends (one passage) that hold no key; one or two get a breakable wall
    const degree = (k) => { const [c, rr] = k.split(',').map(Number); return nbrs([c, rr]).filter((n) => links.has(edge(k, id(...n)))).length; };
    const treasure = cells.map(([c, rr]) => id(c, rr)).filter((k) => degree(k) === 1 && !keyRoom.includes(k) && k !== id(...S)).slice(0, 2 + Math.floor(tier / 2));

    // ---------- geometry ----------
    const L = {
      sys, sysIdx, stIdx: 2, diff, dungeon: tier,
      sd: { name: T.name, pool: Object.assign({}, base.pool), boss: T.titan ? 'titan_' + T.titan : base.boss, bossName: T.titan ? GV.TITANS[T.titan].name.toUpperCase() : (base.bossName || 'VAULT WARDEN'), vaults: [] },
      solids: [], oneways: [], movers: [], spikes: [], memories: [], checkpoints: [], rifts: [], vaults: [], membranes: [], npcs: [], sigils: [], gates: [],
      acid: [], vents: [], walls: [], chests: [], ambushes: [], ceilings: [], biome: { caves: true }, runSeed: seed,
      keycards: [], doors: [], rooms: {}, cols, rows, vc, vr, RW, RH,
    };
    const wall = (x, y, w, h, extra) => { const s = Object.assign({ x, y, w, h }, extra || {}); L.solids.push(s); return s; };
    const ledge = (x, y, w) => { const o = { x, y, w, h: 16 }; L.oneways.push(o); return o; };
    const floorY = (rr) => Y(rr) + RH - WT / 2;
    const horiz = {}; // where the shaft gap sits in the slab between (c,rr) and (c,rr+1)
    // vertical edges (walls between rooms in a row)
    for (let rr = 0; rr < rows; rr++) for (let c = 0; c <= cols; c++) {
      const x = X(c) - WT / 2, top = Y(rr) - WT / 2, fy = floorY(rr);
      const a = c > 0 ? (inVault(c - 1, rr) ? 'V' : id(c - 1, rr)) : null, b = c < cols ? (inVault(c, rr) ? 'V' : id(c, rr)) : null;
      if (a === 'V' && b === 'V') continue; // inside the vault: open
      const isVaultDoor = (a === 'V' && b === id(...NV)) || (b === 'V' && a === id(...NV));
      const open = a && b && a !== 'V' && b !== 'V' && links.has(edge(a, b));
      if (isVaultDoor) {
        wall(x, top, WT, fy - DOORH - top);
        L.doors.push(wall(x - 6, fy - DOORH, WT + 12, DOORH, { door: 'gold', vaultDoor: true, breakable: true }));
      } else if (open) {
        wall(x, top, WT, fy - DOORH - top);
        const lk = lockOf(a, b);
        if (lk) L.doors.push(wall(x - 6, fy - DOORH, WT + 12, DOORH, { door: KEYS[lk.key].id, breakable: true }));
        else if (treasure.includes(a) || treasure.includes(b)) { if (r() < 0.6) L.walls.push({ x: x - 4, y: fy - DOORH, w: WT + 8, h: DOORH, hp: 40 * Math.pow(1.15, diff) }); }
      } else wall(x, top, WT, RH + WT);
    }
    // horizontal edges (floors and ceilings)
    for (let rr = 0; rr <= rows; rr++) for (let c = 0; c < cols; c++) {
      const y = Y(rr) - WT / 2, x = X(c);
      const a = rr > 0 ? (inVault(c, rr - 1) ? 'V' : id(c, rr - 1)) : null, b = rr < rows ? (inVault(c, rr) ? 'V' : id(c, rr)) : null;
      if (a === 'V' && b === 'V') continue;
      const isVaultDoor = (a === 'V' && b === id(...NV)) || (b === 'V' && a === id(...NV));
      const open = a && b && a !== 'V' && b !== 'V' && links.has(edge(a, b));
      if (open || isVaultDoor) {
        const gx = x + 140 + ri(RW - 280 - GAP);
        wall(x, y, gx - x, WT); wall(gx + GAP, y, x + RW - gx - GAP, WT);
        horiz[edge(a || 'V', b || 'V')] = gx;
        const lk = !isVaultDoor && lockOf(a, b);
        if (isVaultDoor) L.doors.push(wall(gx, y, GAP, WT, { door: 'gold', vaultDoor: true, breakable: true, hatch: true }));
        else if (lk) L.doors.push(wall(gx, y, GAP, WT, { door: KEYS[lk.key].id, breakable: true, hatch: true }));
        // ledges up the shaft from the room below to the gap
        const below = b, fyb = Y(rr) + RH - WT / 2;
        if (below) for (let k = 1, yy = fyb - STEP; yy > y + 30; k++, yy -= STEP) ledge(gx + (k % 2 ? -10 : GAP - 70), yy, 80); // zig-zag under the opening itself
        ledge(gx - 10, y - 2, GAP + 20); // a lip to land on above... it's one-way, so you drop through by holding down
      } else wall(x, y, RW, WT);
    }
    // the vault door must use the gold key; if the vault edge is vertical we already placed it above
    for (const d of L.doors) if (d.vaultDoor) d.door = 'gold';

    // ---------- rooms ----------
    const pool = L.sd.pool;
    for (const [c, rr] of cells) {
      const k = id(c, rr), x0 = X(c), y0 = Y(rr), fy = floorY(rr), z = zone[k];
      const room = (L.rooms[k] = { c, r: rr, x: x0, y: y0, w: RW, h: RH, zone: z, woke: false, foes: [], key: null, treasure: treasure.includes(k), seen: false });
      // a couple of platforms, kept clear of the shaft gaps
      const shafts = [horiz[edge(rr > 0 ? (inVault(c, rr - 1) ? 'V' : id(c, rr - 1)) : 'none', k)], horiz[edge(k, rr < rows - 1 ? (inVault(c, rr + 1) ? 'V' : id(c, rr + 1)) : 'none')]].filter((g) => g != null);
      const nP = 1 + ri(3);
      for (let i = 0; i < nP; i++) {
        let w = 0, px = 0, py = 0, ok = false;
        for (let tries = 0; tries < 8 && !ok; tries++) { w = 140 + ri(120); px = x0 + 60 + ri(RW - 120 - w); py = fy - 130 - ri(2) * 110; ok = !shafts.some((g) => px < g + GAP + 90 && px + w > g - 90); }
        if (!ok) continue; // keep the climbing shafts clear
        ledge(px, py, w); if (r() < 0.5) L.memories.push({ x: px + w / 2, y: py - 30, taken: false });
      }
      // spikes on some floors (never right by a door)
      if (r() < 0.22 + tier * 0.06 && k !== id(...S)) { const sw = 90 + ri(90), sx = x0 + 220 + ri(RW - 440 - sw); L.spikes.push({ x: sx, y: fy - 16, w: sw, h: 16 }); }
      // foes: they appear the first time you come in
      if (k !== id(...S)) {
        const n = 2 + ri(2) + Math.floor(z * 0.6) + (tier > 1 ? 1 : 0);
        for (let i = 0; i < n; i++) room.foes.push({ type: U.weighted(r, pool), x: x0 + 120 + ri(RW - 240) });
        if (r() < 0.12 + 0.05 * z) { const hp = 60 * 2 * Math.pow(1.15, diff); L.rifts.push({ x: x0 + RW / 2 - 22, y: fy - 96, w: 44, h: 86, hp, maxHp: hp, timer: 2, dead: false, pulse: 0, flash: 0, room: k }); }
      }
      // keys, treasure, beacons
      const ki = keyRoom.indexOf(k);
      if (ki >= 0) { const kc = { x: x0 + RW / 2, y: fy - 70, key: ki === nK - 1 ? 'gold' : KEYS[ki].id, taken: false }; L.keycards.push(kc); room.key = kc.key; }
      if (room.treasure) { L.chests.push({ x: x0 + RW / 2 - 60, y: fy, opened: false }); L.chests.push({ x: x0 + RW / 2 + 60, y: fy, opened: false }); for (let i = 0; i < 6; i++) L.memories.push({ x: x0 + 200 + i * 70, y: fy - 40, taken: false }); }
      if (k === id(...S) || zoneStart.includes(k)) L.checkpoints.push({ x: x0 + 90, y: fy, on: false });
    }
    // the vault: an open 2x2 hall, platforms like a Titan arena
    const vx = X(vc), vy = Y(vr), vfy = floorY(vr + 1), VW = 2 * RW;
    for (const [px, py, w] of [[140, vfy - 140, 220], [VW - 360, vfy - 140, 220], [VW / 2 - 130, vfy - 250, 260], [330, vfy - 360, 170], [VW - 500, vfy - 360, 170]]) ledge(vx + px, py, w);
    L.vault = { x: vx, y: vy, w: VW, h: 2 * RH };
    L.arena = { x: vx, w: VW, floorY: vfy, top: vfy - 520 };
    L.gates = [{ x: -99999, y: 0, w: 1, h: 1, closed: false }, { x: -99999, y: 0, w: 1, h: 1, closed: false }];
    L.exit = { x: -99999, y: vfy };
    const sfy = floorY(S[1]);
    L.spawn = { x: X(S[0]) + 140, y: sfy - 50 };
    L.bounds = { x0: X(0) - WT, x1: X(cols) + WT, y0: Y(0) - WT, y1: Y(rows) + WT };
    L.length = L.bounds.x1;
    L.killY = L.bounds.y1 + 400;
    L.camMaxY = L.bounds.y1 + 40 - C.H;
    L.totalMem = L.memories.length;
    L.route = route; L.zoneOf = zone; L.keyRooms = keyRoom; L.nKeys = nK; L.vaultEntry = id(...NV);
    return L;
  };

  // ---------- starting one ----------
  GV.startDungeon = function (tier) {
    const G = GV.game;
    // dying to the vault's guardian puts you back at your last beacon, not in a Titan Gate
    if (!G._dRestart) {
      G._dRestart = true;
      const rr0 = G.restartRun;
      G.restartRun = function () { const p = this.play; if (p && p.dungeon) { p.resetVault(); p.respawnPlayer(); this.resume(); return; } return rr0.apply(this, arguments); };
    }
    if (GV.save.needsClass()) { GV.menus.classSelect(); return; }
    if (!(GV.dkeys.count(tier) > 0)) { GV.menus.toast && GV.menus.toast('You need a dungeon key'); return; }
    GV.menus.hide(); GV.input.clear();
    const sys = GV.progress.frontier(), seed = Math.floor(Math.random() * 1e9);
    const payer = GV.dkeys.spend(tier);
    GV._dungeonL = GV.buildDungeon(tier, sys, seed);
    try { G.play = new GV.Play(sys, 2); } finally { GV._dungeonL = null; }
    const p = G.play;
    p.dungeon = { tier, keys: new Set(), seed, start: p.t, found: [] };
    p.ambT = 1e9; // no wandering spawns: rooms wake up instead
    p.toasts.length = 0; p.toast(GV.DUNGEONS[tier].name.toUpperCase(), 2.8); p.toasts[0].sub = `Find the keycards · the vault is in the middle${p.coop ? ` · Player ${payer || 1}'s key` : ''}`;
    G.scene = 'play'; G.paused = false; G.setPlaying(true);
  };
  // a new Play builds its level with buildStage: hand it the prebuilt dungeon instead
  const bs0 = GV.buildStage;
  GV.buildStage = function (s, st) { if (GV._dungeonL) { const L = GV._dungeonL; GV._dungeonL = null; return L; } return bs0.call(this, s, st); };
  // back out of a lost vault fight: the guardian resets, the vault door opens again
  P.resetVault = function () {
    this.enemies = this.enemies.filter((e) => !e.boss && !e.part);
    this.titan = null; this.titanMode = null; this.boss = null; this.state = 'run'; this.bossCard = null;
    this.projs = this.projs.filter((q) => !q.hostile); this.hazards = []; this.warns = [];
    for (const d of this.L.doors) if (d.vaultDoor) { d.sealed = false; d.gone = true; }
  };

  // ---------- the camera stays inside the maze ----------
  const cam0 = P.camTarget;
  P.camTarget = function () {
    const o = cam0.call(this);
    if (!this.dungeon || this.state === 'boss' || this.titanMode) return o;
    const pl = this.player, W = this.vw(), H = this.vh(), B = this.L.bounds;
    o.tx = U.clamp(pl.cx - W * 0.45 + pl.facing * 46, B.x0 - 20, B.x1 - W + 20);
    o.ty = U.clamp(pl.cy - H * 0.58, B.y0 - 20, this.camBottom - H);
    return o;
  };

  // ---------- the boss waits until you're actually inside the vault ----------
  const inVault = (p, pl) => { const V = p.L.vault; return V && pl.cx > V.x + 60 && pl.cx < V.x + V.w - 60 && pl.cy > V.y && pl.cy < V.y + V.h; };
  const sb0 = P.startBoss;
  P.startBoss = function () {
    if (!this.dungeon) return sb0.call(this);
    if (!this.players.some((pl) => !pl.dead && inVault(this, pl))) return;
    // seal the vault behind you
    for (const d of this.L.doors) if (d.vaultDoor) { d.gone = false; d.sealed = true; }
    const tid = GV.DUNGEONS[this.dungeon.tier].titan;
    if (tid) { this.titanSetup(tid); this.L.exit = { x: -99999, y: this.arena.floorY }; return; }
    return sb0.call(this);
  };

  // ---------- keycards, doors, rooms ----------
  const has = (p, k) => p.dungeon && p.dungeon.keys.has(k);
  const roomAt = (p, x, y) => { const L = p.L; const c = Math.floor(x / RW) + L.vc, rr = Math.floor(y / RH) + L.vr; return L.rooms[c + ',' + rr] || null; };
  const upd0 = P.update;
  P.update = function (dt) {
    // rifts in rooms you haven't reached yet stay quiet
    if (this.dungeon) for (const rf of this.L.rifts) if (rf.room && !this.L.rooms[rf.room].woke) rf.timer = Math.max(rf.timer, 1);
    upd0.call(this, dt);
    if (!this.dungeon || this.state === 'clear') return;
    const L = this.L;
    for (const pl of this.players) {
      if (pl.dead) continue;
      // keycards
      for (const kc of L.keycards) if (!kc.taken && Math.abs(pl.cx - kc.x) < 34 && Math.abs(pl.cy - kc.y) < 50) {
        kc.taken = true; this.dungeon.keys.add(kc.key);
        const K = KEYS.find((x) => x.id === kc.key);
        this.toast(`${K.name.toUpperCase()}`, 2.2); this.toasts[this.toasts.length - 1].sub = kc.key === 'gold' ? 'It opens the vault' : 'It opens the matching door';
        this.burst(kc.x, kc.y, 40, K.color, 260, 0.8, 3); if (GV.audio.play) GV.audio.play('level', { force: true });
      }
      // doors: open when you walk up holding the right card
      for (const d of L.doors) {
        if (d.gone || d.sealed) continue;
        const near = d.hatch ? Math.abs(pl.cx - (d.x + d.w / 2)) < d.w / 2 + 20 && Math.abs(pl.cy - d.y) < 110 : Math.abs(pl.cx - (d.x + d.w / 2)) < 70 && pl.cy > d.y - 20 && pl.cy < d.y + d.h + 20;
        if (!near) { d.hint = Math.max(0, (d.hint || 0) - dt); continue; }
        if (has(this, d.door)) {
          d.gone = true; const K = KEYS.find((x) => x.id === d.door);
          this.toast(d.vaultDoor ? 'THE VAULT OPENS' : `${K.name.split(' ')[0].toUpperCase()} DOOR OPEN`, 1.8, d.vaultDoor ? undefined : 'small');
          this.burst(d.x + d.w / 2, d.y + d.h / 2, 30, K.color, 220, 0.6, 3); this.shake(6); if (GV.audio.play) GV.audio.play(d.vaultDoor ? 'boss' : 'confirm', { force: true });
        } else if (!(d.hint > 0)) { d.hint = 2.5; const K = KEYS.find((x) => x.id === d.door); this.text(d.x + d.w / 2, d.y - 10, `LOCKED · NEEDS ${K.name.toUpperCase()}`, K.color, 12); if (GV.audio.play) GV.audio.play('deny', { gap: 0.5 }); }
      }
      // rooms wake when you first walk in
      const rm = roomAt(this, pl.cx, pl.cy);
      if (rm) { rm.seen = true; if (!rm.woke) { rm.woke = true; rm.wokeT = 0.5; } }
    }
    for (const k in L.rooms) {
      const rm = L.rooms[k];
      if (rm.wokeT > 0 && (rm.wokeT -= dt) <= 0) {
        for (const f of rm.foes) {
          const def = GV.ENEMIES[f.type]; if (!def) continue;
          const fy = rm.y + RH - WT / 2;
          this.spawnEnemy(f.type, f.x, def.fly ? fy - 160 - Math.random() * 120 : fy);
        }
        rm.foes = [];
      }
    }
  };
  // rifts only work in rooms you've woken
  const cap0 = P.cap;
  P.cap = function () { const c = cap0.call(this); return this.dungeon ? c + 4 : c; };

  // ---------- drawing: doors, keycards ----------
  const df0 = P.drawFeatures;
  P.drawFeatures = function (ctx, vis) {
    df0.call(this, ctx, vis);
    if (!this.dungeon) return;
    const L = this.L, t = this.t;
    for (const d of L.doors) {
      if (d.gone || !vis(d, 40)) continue;
      const K = KEYS.find((x) => x.id === d.door);
      ctx.fillStyle = '#121620'; ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.fillStyle = K.color; ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 3);
      if (d.hatch) { for (let i = 0; i < 4; i++) ctx.fillRect(d.x + 8 + i * (d.w - 16) / 4, d.y + 6, (d.w - 16) / 4 - 6, d.h - 12); }
      else { for (let i = 0; i < 5; i++) ctx.fillRect(d.x + 6, d.y + 8 + i * (d.h - 16) / 5, d.w - 12, (d.h - 16) / 5 - 6); }
      ctx.globalAlpha = 1; ctx.strokeStyle = K.color; ctx.lineWidth = 2; ctx.strokeRect(d.x + 1, d.y + 1, d.w - 2, d.h - 2);
      A.glow(ctx, d.x + d.w / 2, d.y + d.h / 2, 40, K.color + '55');
      if (d.vaultDoor) { ctx.font = `800 11px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = K.color; ctx.fillText('VAULT', d.x + d.w / 2, d.hatch ? d.y - 8 : d.y - 10); }
    }
    for (const kc of L.keycards) {
      if (kc.taken || !vis({ x: kc.x - 20, w: 40 }, 30)) continue;
      const K = KEYS.find((x) => x.id === kc.key), by = kc.y + Math.sin(t * 2.4 + kc.x) * 6;
      A.glow(ctx, kc.x, by, 46, K.color + '88');
      ctx.save(); ctx.translate(kc.x, by); ctx.rotate(Math.sin(t * 1.7) * 0.25);
      ctx.fillStyle = K.color; A.rrect(ctx, -16, -11, 32, 22, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(-12, -4, 24, 4); ctx.fillStyle = '#fff'; ctx.fillRect(6, 3, 6, 4);
      ctx.restore();
    }
  };

  // ---------- inside, not outside: a dark bulkhead backdrop instead of open sky ----------
  const bg0 = A.drawBackground;
  A.drawBackground = function (ctx, bg, cam, t, pal) {
    bg0.apply(this, arguments);
    const p = GV.game && GV.game.play;
    if (!p || !p.dungeon || p.bg !== bg) return;
    const W = C.W, H = C.H, col = GV.DUNGEONS[p.dungeon.tier].color;
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,14,0.86)'; ctx.fillRect(0, 0, W, H);
    // bulkhead panels and ribs, scrolling slower than the walls
    const px = -((cam.x * 0.55) % 160), py = -((cam.y * 0.55) % 120);
    ctx.strokeStyle = 'rgba(120,140,180,0.07)'; ctx.lineWidth = 2;
    for (let x = px; x < W + 160; x += 160) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = py; y < H + 120; y += 120) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(120,140,180,0.06)';
    for (let x = px; x < W + 160; x += 160) for (let y = py; y < H + 120; y += 120) { ctx.fillRect(x + 6, y + 6, 4, 4); ctx.fillRect(x + 150, y + 6, 4, 4); }
    // dim emergency strips in the dungeon's colour
    const sx = -((cam.x * 0.7) % 480);
    for (let x = sx; x < W + 480; x += 480) { ctx.globalAlpha = 0.18 + 0.08 * Math.sin(t * 1.3 + x); ctx.fillStyle = col; ctx.fillRect(x + 40, py + 30, 120, 3); A.glow(ctx, x + 100, py + 32, 70, col + '22'); }
    ctx.globalAlpha = 1;
    // a vignette pulls the eye to the middle
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };

  // ---------- the dungeon map (replaces the strip minimap) ----------
  const mm0 = P.drawMinimap;
  P.drawMinimap = function (ctx, W, H) {
    if (!this.dungeon) return mm0.call(this, ctx, W, H);
    if (this.titanMode || GV.settings.data.minimap === false) return;
    const L = this.L, touch = GV.input.isTouch, cs = touch ? 15 : 19, mw = L.cols * cs, mh = L.rows * cs, x0 = W - mw - 16, y0 = touch ? 96 : H - mh - 74;
    ctx.save();
    ctx.fillStyle = 'rgba(5,7,14,0.7)'; A.rrect(ctx, x0 - 6, y0 - 6, mw + 12, mh + 12, 8);
    for (let rr = 0; rr < L.rows; rr++) for (let c = 0; c < L.cols; c++) {
      const k = c + ',' + rr, rm = L.rooms[k], x = x0 + c * cs, y = y0 + rr * cs;
      if (!rm) { ctx.fillStyle = this.state === 'boss' ? 'rgba(255,90,110,0.6)' : 'rgba(255,211,107,0.22)'; ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2); continue; }
      if (!rm.seen) continue;
      ctx.fillStyle = 'rgba(160,180,215,0.45)'; ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
      if (rm.key && !(this.dungeon.keys.has(rm.key))) { const K = KEYS.find((q) => q.id === rm.key); ctx.fillStyle = K.color; ctx.fillRect(x + cs / 2 - 3, y + cs / 2 - 2, 6, 4); }
      if (rm.treasure) { ctx.fillStyle = '#ffd36b'; ctx.fillRect(x + 2, y + 2, 3, 3); }
    }
    ctx.font = `800 9px ${C.FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd36b'; ctx.fillText('VAULT', x0 + (L.vc + 1) * cs, y0 + (L.vr + 1) * cs + 3);
    for (const pl of this.players) if (!pl.dead) { const c = (pl.cx / RW) + L.vc, rr = (pl.cy / RH) + L.vr; ctx.fillStyle = GV.COOP_COLORS ? GV.COOP_COLORS[pl.slot] : '#7fe8ff'; ctx.fillRect(x0 + c * cs - 2, y0 + rr * cs - 2, 4, 4); }
    // keycards held
    let kx = x0; for (const K of KEYS) { if (!this.dungeon.keys.has(K.id)) continue; ctx.fillStyle = K.color; A.rrect(ctx, kx, y0 - 22, 16, 10, 2); kx += 20; }
    ctx.restore();
  };

  // ---------- finishing ----------
  const down0 = P.onBossDown;
  P.onBossDown = function (b) {
    const r = down0.call(this, b);
    if (this.dungeon && b && (b.boss || (b.def && b.def.titan))) {
      const tier = this.dungeon.tier, d = GV.save.data, got = this.dungeon.found;
      for (let i = 0; i < 2 + tier; i++) this.dropItem(b.x + b.w / 2 + (i - 1) * 26, b.y + b.h / 2, { boss: true });
      d.orbs = (d.orbs || 0) + tier; got.push(`${tier} ${tier > 1 ? GV.TERMS.orbs : GV.TERMS.orb}`);
      d.uncut.push({ kind: Math.random() < 0.5 ? 'skill' : 'support', tier: Math.min(3, tier + 1) }); got.push(`a Tier ${Math.min(3, tier + 1)} blank`);
      this.gainMem(Math.round(300 * tier * (1 + 0.3 * this.diff)));
      if (tier < 3 && Math.random() < 0.45) { GV.dkeys.add(tier + 1); got.push(`a ${GV.DUNGEONS[tier + 1].short} key`); }
      if (Math.random() < 0.5) { GV.dkeys.add(tier); got.push(`a ${GV.DUNGEONS[tier].short} key`); }
      this.L.exit = { x: this.arena.x + this.arena.w / 2 - 20, y: this.arena.floorY };
      for (const dd of this.L.doors) if (dd.vaultDoor) dd.sealed = false;
      GV.save.write();
    }
    return r;
  };
  const fin0 = P.finish;
  P.finish = function () {
    if (!this.dungeon) return fin0.call(this);
    this.sweepDrops();
    this.state = 'clear';
    const D2 = D(); D2.dungeonsDone = (D2.dungeonsDone || 0) + 1;
    this.pendingClear = { dungeon: this.dungeon.tier, mem: this.memGot, kills: this.kills, got: this.dungeon.found, time: Math.round(this.t - this.dungeon.start) };
    GV.save.write();
  };
  // results
  const clear0 = GV.menus.clear;
  GV.menus.clear = function (info) {
    if (!info || !info.dungeon) return clear0.call(this, info);
    const T = GV.DUNGEONS[info.dungeon], esc = GV.menus.esc, mm = Math.floor(info.time / 60), ss = String(info.time % 60).padStart(2, '0');
    const more = GV.dkeys.count(info.dungeon) > 0;
    GV.menus.render(`<div class="screen panel narrow clear" style="--tc:${T.color}">
      <h2 style="color:${T.color}">${esc(T.name)} Cleared</h2><div class="sub">The vault is yours</div>
      <div class="how"><div><b>Memories</b><span>✦ ${info.mem}</span></div><div><b>Kills</b><span>${info.kills}</span></div><div><b>Time</b><span>${mm}:${ss}</span></div></div>
      ${info.got && info.got.length ? `<p class="muted">Also found: ${esc(info.got.join(', '))}</p>` : ''}
      <div class="menu"><button class="primary" data-a="ship">Back to the Lantern</button>${more ? `<button data-a="again">Run another (${GV.dkeys.count(info.dungeon)} key${GV.dkeys.count(info.dungeon) > 1 ? 's' : ''})</button>` : ''}</div></div>`, (a) => {
      if (a === 'ship') GV.game.home(GV.progress.frontier());
      if (a === 'again') GV.game.startDungeon(info.dungeon);
    });
  };
  // dying in a dungeon: back to the last beacon, as usual (the key is already spent)

  // ---------- richer pickings: dungeons pay better than stages ----------
  // more experience and memories, more item drops from foes, an extra item in every chest
  GV.dungeonBonus = (p) => (p && p.dungeon ? 1.4 + 0.2 * p.dungeon.tier : 1); // ×1.6 / ×1.8 / ×2.0
  const xp0 = P.gainXP;
  P.gainXP = function (n, ...rest) { return xp0.call(this, n * GV.dungeonBonus(this), ...rest); };
  const mem0 = P.gainMem;
  P.gainMem = function (n, ...rest) { return mem0.call(this, Math.round(n * GV.dungeonBonus(this)), ...rest); };
  const kl0 = P.killEnemy;
  P.killEnemy = function (e) {
    const was = e && e.dead, r = kl0.call(this, e);
    if (this.dungeon && e && !was && e.dead && !e.boss && !e.part && !(e.def && e.def.static)) {
      const tier = this.dungeon.tier;
      if (Math.random() < 0.14 + 0.05 * tier + (e.elite ? 0.35 : 0)) this.dropItem(e.x + e.w / 2, e.y + e.h / 2, { boss: !!e.elite });
      if (Math.random() < 0.03 * tier) this.dropOrb(e.x + e.w / 2, e.y);
    }
    return r;
  };
  const oc0 = P.openChest;
  if (oc0) P.openChest = function (c) { const was = c.opened, r = oc0.call(this, c); if (this.dungeon && !was && c.opened) this.dropItem(c.x, c.y - 30, { boss: true }); return r; };

  // ---------- keys as loot ----------
  const keyTierFor = (sys) => (sys >= 3 && Math.random() < 0.3 ? 3 : sys >= 1 && Math.random() < 0.5 ? 2 : 1);
  P.dropDKey = function (x, y, tier) { this.drops.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: -480, w: 14, h: 14, kind: 'dkey', gk: 'dkey', tier, age: 0 }); };
  const bd1 = P.onBossDown;
  P.onBossDown = function (b) {
    const r = bd1.call(this, b);
    if (!this.dungeon && !this.trial && b && b.boss && Math.random() < (b.def && b.def.titan ? 1 : 0.35)) this.dropDKey(b.x + b.w / 2, b.y + b.h / 2, b.def && b.def.titan ? (this.sysIdx >= 3 ? 3 : 2) : keyTierFor(this.sysIdx));
    return r;
  };
  const ke0 = P.killEnemy;
  P.killEnemy = function (e) {
    const was = e && e.dead, r = ke0.call(this, e);
    if (e && !was && e.elite && !this.dungeon && !this.trial && Math.random() < 0.04) this.dropDKey(e.x + e.w / 2, e.y, keyTierFor(this.sysIdx));
    return r;
  };
  const give0 = P.giveDrop;
  P.giveDrop = function (dr, pl) {
    if (dr.kind !== 'dkey') return give0.call(this, dr, pl);
    GV.save.as(pl.slot || 0, (d) => GV.dkeys.add(dr.tier, 1, d));
    this.sfx('level'); this.shake(6); // the loot card says what it is
  };
  const gi0 = A.gemItem;
  A.gemItem = function (ctx, x, y, t, gk, tier) {
    if (gk !== 'dkey') return gi0.apply(this, arguments);
    const col = (GV.DUNGEONS[tier] || GV.DUNGEONS[1]).color;
    A.glow(ctx, x, y, 34, col + '88');
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2) * 0.3);
    ctx.fillStyle = col; A.circle(ctx, -6, 0, 6); ctx.fillRect(-2, -2, 14, 4); ctx.fillRect(8, 2, 3, 4); ctx.fillRect(4, 2, 3, 3);
    ctx.fillStyle = '#05070c'; A.circle(ctx, -6, 0, 2.5);
    ctx.restore();
  };
  // a first key, so the feature can be found: anyone who has cleared the first system gets one
  GV.grantFirstDKey = () => { const d = D(); if (d && d.cleared && d.cleared['0-2'] && !d.dkeyGift) { d.dkeyGift = true; GV.dkeys.add(1); return true; } return false; };
})();
