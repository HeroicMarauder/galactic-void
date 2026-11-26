// Galactic Void — stage generator. Builds a gauntlet run from (system, stage): terrain segments,
// enemy rifts, beacons, memories, ability-locked vaults, then a sealed boss arena and the exit.
// Same inputs always give the same stage.
(function () {
  const GV = window.GV, U = GV.util;
  const BOTTOM = 1300;

  // Rift Trial arena: one wide, walled floor with platforms and three portals the waves pour from.
  GV.buildTrial = function (sysIdx) {
    const sys = GV.UNIVERSE.system(sysIdx);
    const diff = GV.UNIVERSE.difficulty(sysIdx, 0);
    const gy = 440, W = 1500;
    const L = {
      sys, sysIdx, stIdx: 0, diff, trial: true,
      sd: { name: 'Rift Trial', pool: Object.assign({ crawler: 3, leaper: 2, wisp: 2, brute: 1 }, sysIdx >= 1 ? { jelly: 1, sentry: 1 } : {}), boss: 'brood', bossName: '', vaults: [] },
      solids: [], oneways: [], movers: [], spikes: [], memories: [], checkpoints: [], rifts: [], vaults: [], membranes: [], npcs: [], sigils: [], gates: [],
    };
    L.solids.push({ x: -400, y: gy, w: W + 800, h: BOTTOM - gy });
    L.solids.push({ x: -40, y: gy - 760, w: 40, h: 760 }, { x: W, y: gy - 760, w: 40, h: 760 });
    for (const [x, y, w] of [[140, gy - 130, 200], [W - 340, gy - 130, 200], [W / 2 - 120, gy - 250, 240], [380, gy - 330, 150], [W - 530, gy - 330, 150]]) L.oneways.push({ x, y, w, h: 16 });
    L.movers.push({ x: W / 2 - 60, y: gy - 120, w: 120, h: 16, isMover: true, x0: W / 2 - 260, y0: gy - 120, x1: W / 2 + 140, y1: gy - 120, period: 5, phase: 0, dx: 0, dy: 0 });
    L.portals = [{ x: 60, y: gy - 96, w: 44, h: 86, hp: 1, maxHp: 1, pulse: 0, flash: 0 }, { x: W - 104, y: gy - 96, w: 44, h: 86, hp: 1, maxHp: 1, pulse: 0, flash: 0 }, { x: W / 2 - 22, y: gy - 410, w: 44, h: 86, hp: 1, maxHp: 1, pulse: 0, flash: 0 }];
    L.arena = { x: 0, w: W, floorY: gy, top: gy - 440 };
    L.exit = { x: -99999, y: gy };
    L.spawn = { x: W / 2 - 12, y: gy - 50 };
    L.length = W;
    L.killY = gy + 400;
    L.camMaxY = gy + 120 - GV.CFG.H;
    L.totalMem = 0;
    return L;
  };

  GV.buildStage = function (sysIdx, stIdx) {
    const sys = GV.UNIVERSE.system(sysIdx);
    // A private copy: runs may change their boss or creature pool (anomalies) without touching the map.
    const sd = Object.assign({}, sys.stages[stIdx], { pool: Object.assign({}, sys.stages[stIdx].pool) });
    // Every drop is a fresh layout. (GV.stageSeed pins one for tests.)
    const runSeed = GV.stageSeed != null ? GV.stageSeed : Math.floor(Math.random() * 1e9);
    const r = U.rng(U.hash(`stage:${sysIdx}:${stIdx}:${runSeed}`));
    // Each system's biome brings two signature hazards.
    const BIOMES = ['acid', 'vents', 'crumble', 'caves'];
    const br = U.rng(U.hash(`biome:${sysIdx}`));
    // From the second system on, the act decides the terrain hazards and who lives there.
    const ACT = GV.actOf && sysIdx > 0 ? GV.ACTS[GV.actOf(sysIdx)] : null;
    let b1 = BIOMES[Math.floor(br() * 4)], b2 = BIOMES[(BIOMES.indexOf(b1) + 1 + Math.floor(br() * 3)) % 4];
    if (ACT) { b1 = ACT.terrain[0]; b2 = ACT.terrain[1]; if (ACT.family) sd.pool = GV.actPool(ACT, sd.pool, stIdx, sysIdx); }
    const biome = { [b1]: true, [b2]: true, caves: true };
    const diff = GV.UNIVERSE.difficulty(sysIdx, stIdx);
    const L = {
      sys, sd, sysIdx, stIdx, diff,
      solids: [], oneways: [], movers: [], spikes: [], memories: [], checkpoints: [],
      rifts: [], vaults: [], membranes: [], npcs: [], sigils: [], gates: [],
      acid: [], vents: [], walls: [], chests: [], ambushes: [], ceilings: [], biome, runSeed,
    };
    const len = sd.length;
    let gy = 440;
    let minGround = 440;

    const ground = (x, w, y) => { L.solids.push({ x, y, w, h: BOTTOM - y }); minGround = Math.max(minGround, y); };
    const ledge = (x, y, w) => { const o = { x, y, w, h: 16 }; L.oneways.push(o); return o; };
    const mem = (x, y) => L.memories.push({ x, y, taken: false });
    const memRow = (x, y, n, gap = 30) => { for (let i = 0; i < n; i++) mem(x + i * gap, y); };
    const memArc = (x0, x1, y, hgt, n) => {
      for (let i = 0; i < n; i++) {
        const t = (i + 1) / (n + 1);
        mem(U.lerp(x0, x1, t), y - Math.sin(t * Math.PI) * hgt);
      }
    };
    const riftGap = () => Math.max(460, 780 - diff * 40) + r() * 200;
    let nextRift = 900 + r() * 200;
    const maybeRift = (xc, y) => {
      if (xc > nextRift && xc < len - 300) {
        const hp = 60 * 2 * Math.pow(1.15, diff);
        L.rifts.push({ x: xc - 22, y: y - 96, w: 44, h: 86, hp, maxHp: hp, timer: 0.8 + r() * 1.2, dead: false, pulse: 0, flash: 0 });
        nextRift = xc + riftGap();
      }
    };
    const shiftGround = () => { gy = U.clamp(gy + U.pick(r, [-60, -40, 0, 0, 0, 30, 50]), 300, 470); };

    // ---------- segment builders: each returns the x where the next one starts ----------
    const SEG = {
      flat(x) {
        const w = U.irange(r, 340, 620);
        ground(x, w, gy);
        if (r() < 0.55) {
          const lw = U.irange(r, 120, 200), lx = x + U.irange(r, 40, Math.max(41, w - lw - 40)), ly = gy - U.irange(r, 105, 125);
          ledge(lx, ly, lw); memRow(lx + 20, ly - 22, Math.floor(lw / 40));
        } else memArc(x + 40, x + w - 40, gy - 30, 30, 3);
        maybeRift(x + w / 2, gy);
        return x + w;
      },
      gap(x) {
        const gw = U.irange(r, 120, 190);
        memArc(x, x + gw, gy - 60, 80, 4);
        shiftGround();
        const w = U.irange(r, 220, 340);
        ground(x + gw, w, gy);
        maybeRift(x + gw + w / 2, gy);
        return x + gw + w;
      },
      gap2(x) {
        const gw = U.irange(r, 280, 340);
        const mx = x + gw / 2 - 45;
        ledge(mx, gy - 60, 90); memRow(mx + 15, gy - 85, 3);
        shiftGround();
        const w = U.irange(r, 240, 360);
        ground(x + gw, w, gy);
        maybeRift(x + gw + w / 2, gy);
        return x + gw + w;
      },
      steps(x) {
        const n = 3, sp = 170;
        const hs = [60, 120, 70];
        for (let i = 0; i < n; i++) {
          const lx = x + 30 + i * sp, ly = gy - hs[i];
          ledge(lx, ly, 110); memRow(lx + 25, ly - 24, 2, 30);
        }
        const gw = n * sp + 20;
        ground(x, gw, gy + 70);
        L.spikes.push({ x: x + 10, y: gy + 54, w: gw - 20, h: 16 });
        const w = U.irange(r, 240, 320);
        ground(x + gw, w, gy);
        maybeRift(x + gw + w / 2, gy);
        return x + gw + w;
      },
      mover(x) {
        const gw = U.irange(r, 380, 480);
        const m = { x: x + 30, y: gy - 8, w: 110, h: 16, isMover: true, x0: x + 30, y0: gy - 8, x1: x + gw - 140, y1: gy - 8 - U.irange(r, 0, 60), period: 3.2 + r() * 1.2, phase: r(), dx: 0, dy: 0 };
        L.movers.push(m);
        memArc(x + 60, x + gw - 60, gy - 50, 40, 4);
        const w = U.irange(r, 240, 340);
        ground(x + gw, w, gy);
        maybeRift(x + gw + w / 2, gy);
        return x + gw + w;
      },
      lift(x) {
        if (gy < 360) return SEG.flat(x);
        ground(x, 200, gy);
        const up = 170;
        const m = { x: x + 200, y: gy - 8, w: 100, h: 16, isMover: true, x0: x + 200, y0: gy - 8, x1: x + 200, y1: gy - up - 8, period: 3.4, phase: r(), dx: 0, dy: 0 };
        L.movers.push(m);
        gy -= up;
        const w = U.irange(r, 360, 480);
        ground(x + 300, w, gy);
        memRow(x + 340, gy - 26, 4);
        maybeRift(x + 300 + w / 2, gy);
        return x + 300 + w;
      },
      spikes(x) {
        const w = U.irange(r, 440, 560), sw = U.irange(r, 120, 190);
        ground(x, w, gy);
        const sx = x + (w - sw) / 2;
        L.spikes.push({ x: sx, y: gy - 16, w: sw, h: 16 });
        ledge(sx - 30, gy - 112, sw + 60); memRow(sx, gy - 136, Math.floor(sw / 34));
        maybeRift(x + 60, gy);
        return x + w;
      },
      tower(x) {
        ground(x, 170, gy);
        const bh = U.irange(r, 70, 110), bw = U.irange(r, 220, 320);
        ground(x + 170, bw, gy - bh);
        memRow(x + 190, gy - bh - 26, Math.floor(bw / 50));
        maybeRift(x + 170 + bw / 2, gy - bh);
        ground(x + 170 + bw, 200, gy);
        return x + 170 + bw + 200;
      },
    };
    const ceil = (x, w, y) => { const s = { x, y: y - 900, w, h: 900, ceiling: true }; L.solids.push(s); L.ceilings.push(s); };
    const crumble = (x, y, w) => { const o = ledge(x, y, w); o.crumble = true; o.cr = 0; return o; };
    const pool = () => U.weighted(r, sd.pool);
    Object.assign(SEG, {
      // A low cave corridor: a ceiling closes in, so you can't see far ahead.
      cave(x) {
        const w = U.irange(r, 560, 860), h = U.irange(r, 190, 240);
        ground(x, w, gy); ceil(x + 30, w - 60, gy - h);
        if (r() < 0.6) { const lx = x + U.irange(r, 120, w - 260); ledge(lx, gy - 100, 140); memRow(lx + 20, gy - 124, 4); }
        else memArc(x + 60, x + w - 60, gy - 30, 40, 5);
        maybeRift(x + w * 0.6, gy);
        return x + w;
      },
      // Climb a staircase of ledges to a higher shelf.
      climb(x) {
        if (gy < 330) return SEG.cave(x);
        ground(x, 260, gy);
        const up = U.irange(r, 200, 260);
        for (let i = 0; i < 3; i++) { const lx = x + 60 + (i % 2) * 120, ly = gy - 80 - i * (up / 3); ledge(lx, ly, 110); if (i === 2) memRow(lx + 25, ly - 24, 2); }
        L.solids.push({ x: x + 260, y: gy - up, w: 40, h: up + 10 });
        gy -= up;
        const w = U.irange(r, 360, 520);
        ground(x + 260, w, gy);
        maybeRift(x + 260 + w / 2, gy);
        return x + 260 + w;
      },
      // Drop down into a lower cavern, which climbs back out at the far side.
      drop(x) {
        if (gy > 400) return SEG.flat(x);
        const lw = U.irange(r, 640, 900), low = gy + U.irange(r, 180, 240);
        ground(x, 120, gy);
        ground(x + 120, lw, low); ceil(x + 240, lw - 240, low - 220);
        memArc(x + 160, x + lw - 60, low - 30, 50, 6);
        maybeRift(x + 120 + lw / 2, low);
        // the way back up
        for (let i = 0; i < 2; i++) ledge(x + 120 + lw - 160 - i * 130, low - 80 - i * 75, 110);
        L.solids.push({ x: x + 120 + lw, y: gy, w: 60, h: low - gy + 10 });
        const w = U.irange(r, 260, 380);
        ground(x + 120 + lw, w, gy);
        return x + 120 + lw + w;
      },
      // Two routes: a high road of ledges with more memories, and a low road through a cave.
      split(x) {
        const w = U.irange(r, 900, 1200);
        ground(x, w, gy); ceil(x + 120, w - 240, gy - 200);
        const hi = gy - 300;
        for (let lx = x + 60; lx < x + w - 140; lx += U.irange(r, 170, 220)) { const o = (r() < 0.35 && biome.crumble) ? crumble(lx, hi + U.irange(r, -30, 30), 120) : ledge(lx, hi + U.irange(r, -30, 30), 120); memRow(o.x + 25, o.y - 24, 3); }
        L.solids.push({ x: x + 100, y: hi + 40, w: 30, h: 60 });
        ledge(x + 20, gy - 110, 90); ledge(x + 50, gy - 210, 70);
        maybeRift(x + w * 0.5, gy);
        if (r() < 0.5) maybeRift(x + w * 0.85, gy);
        return x + w;
      },
      // A crumbling bridge over the abyss.
      bridge(x) {
        const gw = U.irange(r, 420, 560);
        for (let lx = x + 30; lx < x + gw - 80; lx += 120) crumble(lx, gy - 10 - Math.sin((lx - x) / gw * Math.PI) * 40, 96);
        memArc(x + 40, x + gw - 40, gy - 80, 60, 5);
        const w = U.irange(r, 240, 340);
        ground(x + gw, w, gy);
        maybeRift(x + gw + w / 2, gy);
        return x + gw + w;
      },
      // An acid lake: ledges and sunken stones across a glowing pool.
      acid(x) {
        const w = U.irange(r, 520, 700);
        ground(x, 80, gy); ground(x + 80, w - 160, gy + 60); ground(x + w - 80, 80, gy);
        L.acid.push({ x: x + 80, y: gy + 18, w: w - 160, h: 42 });
        for (let lx = x + 130; lx < x + w - 160; lx += U.irange(r, 140, 180)) { const o = r() < 0.4 ? crumble(lx, gy - 30, 90) : ledge(lx, gy - 30 - U.irange(r, 0, 50), 90); memRow(o.x + 20, o.y - 24, 2); }
        return x + w;
      },
      // Updraft vents lift you across a chasm to a high shelf.
      vents(x) {
        const gw = U.irange(r, 360, 480);
        ground(x, gw, gy + 320);
        for (let vx = x + 60; vx < x + gw - 60; vx += 150) L.vents.push({ x: vx, y: gy - 260, w: 70, h: 580 });
        memRow(x + 70, gy - 230, Math.floor(gw / 50), 45);
        const up = gy > 360 ? 90 : 0;
        gy -= up;
        const w = U.irange(r, 260, 360);
        ground(x + gw, w, gy);
        maybeRift(x + gw + w / 2, gy);
        return x + gw + w;
      },
      // A sealed room: walls slam shut and the room fills with things. Clear it to get out.
      ambush(x) {
        const w = U.irange(r, 640, 760);
        ground(x, w, gy); ceil(x, w, gy - 300);
        L.ambushes.push({ x, w, floorY: gy, state: 'idle', n: 4 + Math.min(4, Math.floor(diff / 2)), types: [pool(), pool(), pool()] });
        memRow(x + w / 2 - 60, gy - 120, 5);
        return x + w;
      },
      // A cracked wall hides a side chamber with a cache. Break it open.
      secret(x) {
        const w = U.irange(r, 620, 760);
        ground(x, w, gy);
        const up = r() < 0.5, rx = x + w / 2 - 110;
        if (up) {
          L.solids.push({ x: rx - 30, y: gy - 300, w: 280, h: 30 }, { x: rx - 30, y: gy - 300, w: 30, h: 30 }, { x: rx + 220, y: gy - 300, w: 30, h: 180 });
          L.solids.push({ x: rx, y: gy - 150, w: 220, h: 30 });
          ledge(rx - 140, gy - 100, 100);
          { const wl = { x: rx - 30, y: gy - 270, w: 30, h: 120, breakable: true }; L.walls.push(wl); L.solids.push(wl); }
          L.chests.push({ x: rx + 100, y: gy - 150, opened: false });
          memRow(rx + 30, gy - 180, 5, 34);
        } else {
          // a floor hatch: break the slab to drop into a pocket below
          L.solids.push({ x: rx - 30, y: gy, w: 30, h: 220 }, { x: rx + 220, y: gy, w: 30, h: 220 }, { x: rx - 30, y: gy + 200, w: 280, h: 40 });
          { const wl = { x: rx, y: gy, w: 220, h: 26, breakable: true }; L.walls.push(wl); L.solids.push(wl); }
          L.chests.push({ x: rx + 100, y: gy + 200, opened: false });
          memRow(rx + 30, gy + 170, 5, 34);
          // the ground has a gap the hatch covers; rebuild ground around it
          L.solids = L.solids.filter((s) => !(s.x === x && s.y === gy && s.w === w));
          ground(x, rx - x, gy); ground(rx + 220, x + w - rx - 220, gy);
          ledge(rx + 40, gy + 100, 120);
        }
        maybeRift(x + 80, gy);
        return x + w;
      },
    });
    const SEG_POOL = ['flat', 'gap', 'gap2', 'steps', 'mover', 'spikes', 'tower', 'lift', 'cave', 'cave', 'climb', 'drop', 'split', 'bridge', 'secret', 'ambush']
      .concat(biome.acid ? ['acid', 'acid'] : [], biome.vents ? ['vents', 'vents'] : [], biome.crumble ? ['bridge', 'bridge'] : [], biome.caves ? ['cave'] : []);

    // ---------- ability vaults (the Metroidvania layer) ----------
    let vaultN = 0;
    const VAULT = {
      // A chamber walled by a void membrane: only a Phase Dash passes through.
      dash(x) {
        if (gy < 330) gy = 360;
        const w = 680;
        ground(x, w, gy);
        const cx = x + 230;
        ledge(x + 100, gy - 95, 100);
        L.membranes.push({ x: cx, y: gy - 150, w: 24, h: 150 });
        L.membranes.push({ x: cx + 298, y: gy - 150, w: 24, h: 150 });
        L.solids.push({ x: cx, y: gy - 172, w: 322, h: 22 });
        L.sigils.push({ x: cx - 40, y: gy - 60, type: 'dash' });
        L.vaults.push({ key: `${sysIdx}-${stIdx}-${vaultN}`, type: 'dash', x: cx + 160, y: gy - 60, taken: false });
        vaultN++;
        memRow(cx + 40, gy - 196, 7, 34);
        return x + w;
      },
      // A sky-island: only the Grapple Line reaches it, swinging from two gold anchor rings.
      hook(x) {
        if (gy < 420) gy = 460;
        const w = 720;
        ground(x, w, gy);
        L.anchors = L.anchors || [];
        L.anchors.push({ x: x + 250, y: gy - 250 }, { x: x + 440, y: gy - 380 });
        L.solids.push({ x: x + 500, y: gy - 430, w: 170, h: 26 });
        L.sigils.push({ x: x + 120, y: gy - 60, type: 'hook' });
        L.vaults.push({ key: `${sysIdx}-${stIdx}-${vaultN}`, type: 'hook', x: x + 585, y: gy - 460, taken: false });
        vaultN++;
        memRow(x + 540, gy - 470, 3, 30);
        return x + w;
      },
      // A tall shaft: only Grav Grip wall-jumps reach the cache at the top.
      grip(x) {
        if (gy < 400) gy = 440;
        const w = 600;
        ground(x, w, gy);
        const sx = x + 220;
        L.solids.push({ x: sx, y: gy - 400, w: 40, h: 310 });
        L.solids.push({ x: sx + 160, y: gy - 400, w: 40, h: 310 });
        ledge(sx + 40, gy - 390, 120);
        L.sigils.push({ x: sx - 50, y: gy - 60, type: 'grip' });
        L.vaults.push({ key: `${sysIdx}-${stIdx}-${vaultN}`, type: 'grip', x: sx + 100, y: gy - 420, taken: false });
        vaultN++;
        memRow(sx + 70, gy - 200, 3, 30);
        return x + w;
      },
    };

    // ---------- lay out the run ----------
    ground(-600, 1300, gy);
    let x = 700;
    L.spawn = { x: 110, y: gy - 50 };
    if (sd.npc) L.npcs.push({ kind: sd.npc, x: 360, y: gy });

    const cpMarks = [len * 0.34, len * 0.68];
    const vMarks = sd.vaults.map((type, i, all) => ({ type, at: len * (0.18 + i * (all.length > 2 ? 0.24 : 0.36)) + r() * len * 0.06 }));
    let last = '', ambushes = 0, secrets = 0, mini = !(GV.actOf && GV.MINIBOSS_FOR) || (sysIdx === 0 && stIdx === 0);
    while (x < len) {
      // one mini-boss room per stage, a little past halfway
      if (!mini && x > len * 0.55) { mini = true; const id = GV.MINIBOSS_FOR(sysIdx); if (id) { const w = U.irange(r, 700, 800); ground(x, w, gy); ceil(x, w, gy - 320); L.ambushes.push({ x, w, floorY: gy, state: 'idle', n: 1, types: [id], mini: id }); memRow(x + w / 2 - 60, gy - 130, 5); x += w; last = 'ambush'; continue; } }
      if (vMarks.length && x >= vMarks[0].at) { x = VAULT[vMarks.shift().type](x); last = 'vault'; continue; }
      if (cpMarks.length && x >= cpMarks[0]) {
        cpMarks.shift();
        const w = 380;
        ground(x, w, gy);
        L.checkpoints.push({ x: x + w / 2 - 10, y: gy, on: false });
        x += w; last = 'cp'; continue;
      }
      let t = U.pick(r, SEG_POOL);
      if (t === last && t !== 'flat') t = 'flat';
      if (t === 'ambush' && (ambushes >= 2 || x < 1200)) t = 'cave';
      if (t === 'secret' && secrets >= 2) t = 'split';
      if (t === 'ambush') ambushes++;
      if (t === 'secret') secrets++;
      if (r() < 0.3) shiftGround();
      x = SEG[t](x);
      last = t;
    }

    // Mimics: in later systems some memory caches bite back.
    L.mimics = [];
    if (sysIdx > 0) {
      const n = 1 + Math.floor(r() * 2);
      for (let i = 0, tries = 0; i < n && tries < 12; tries++) {
        const xx = 900 + r() * (len - 1400);
        const g = L.solids.filter((s) => s.h > 400 && xx > s.x + 20 && xx < s.x + s.w - 20).sort((a, b) => a.y - b.y)[0];
        if (g) { L.mimics.push({ x: xx, y: g.y }); i++; }
      }
    }

    // ---------- the arena ----------
    gy = 440;
    ground(x, 420, gy);
    L.checkpoints.push({ x: x + 180, y: gy, on: false, final: true });
    const ax = x + 420, AW = 960;
    ground(ax, AW + 520, gy);
    L.gates.push({ x: ax, y: gy - 640, w: 30, h: 640, closed: false });
    L.gates.push({ x: ax + AW - 30, y: gy - 640, w: 30, h: 640, closed: true });
    ledge(ax + 170, gy - 140, 170);
    ledge(ax + AW - 340, gy - 140, 170);
    ledge(ax + AW / 2 - 90, gy - 270, 180);
    L.arena = { x: ax, w: AW, floorY: gy, top: gy - 440 };
    L.exit = { x: ax + AW + 260, y: gy };
    L.length = ax + AW + 520;
    L.killY = minGround + 380;
    L.camMaxY = minGround + 120 - GV.CFG.H;
    L.totalMem = L.memories.length;
    return L;
  };
})();
