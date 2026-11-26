// Galactic Void — the passive tree. A constellation of ~190 nodes: three attribute arms
// (Hull, Drift, Psyche), three hybrid clusters between them, notables, keystones, and one
// starting point per class. Built procedurally from the spec below, the same every time.
(function () {
  const GV = window.GV;
  const D = Math.PI / 180;
  const nodes = [], edges = [];

  const add = (o) => { o.id = nodes.length; o.adj = []; nodes.push(o); return o.id; };
  const link = (a, b) => {
    if (a === b || nodes[a].adj.includes(b)) return;
    nodes[a].adj.push(b); nodes[b].adj.push(a); edges.push([a, b]);
  };
  const P = (a, r) => ({ x: Math.cos(a * D) * r, y: Math.sin(a * D) * r });
  const small = (stats, group, name, pos) => add(Object.assign({ type: 'small', stats, group, name }, pos));
  function path(a, b, n, pool, group, name) {
    const A = nodes[a], B = nodes[b];
    let prev = a;
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      const id = small(pool[(i - 1) % pool.length], group, name, { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t });
      link(prev, id); prev = id;
    }
    link(prev, b);
  }
  function wheel(c, R, n, pool, notable, group, name) {
    const ring = [];
    const rot = Math.atan2(c.y, c.x) + Math.PI;
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      ring.push(small(pool[i % pool.length], group, name, { x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R }));
    }
    for (let i = 0; i < n; i++) link(ring[i], ring[(i + 1) % n]);
    const nid = add({ type: 'notable', x: c.x, y: c.y, name: notable.name, stats: notable.stats, group, cluster: name });
    link(nid, ring[0]); link(nid, ring[Math.floor(n / 2)]);
    return { ring, nid, c };
  }
  const nearest = (w, p) => {
    let best = null, bd = 1e12;
    for (const id of w.ring) { const n = nodes[id], dd = (n.x - p.x) ** 2 + (n.y - p.y) ** 2; if (dd < bd) { bd = dd; best = id; } }
    return best;
  };

  const ARMS = {
    psyche: {
      ang: -90, name: 'Psyche', hub: { spellDmg: 8, charge: 10 }, path: [{ charge: 10 }, { ward: 10 }, { spellDmg: 6 }], ks: 'hollowed',
      w: [
        { name: 'Charge Cells', pool: [{ charge: 12 }, { chargeRegenPct: 10 }], notable: { name: 'Overcapacity', stats: { charge: 30, chargeRegenPct: 25, costRed: 8 } } },
        { name: 'Starfire', pool: [{ fireDmg: 12 }, { igniteChance: 5 }], notable: { name: 'Pyre of Stars', stats: { fireDmg: 30, igniteChance: 15, igniteDmg: 30 } } },
        { name: 'Cryo Lattice', pool: [{ coldDmg: 12 }, { chillEff: 10 }], notable: { name: 'Absolute Zero', stats: { coldDmg: 25, freezeChance: 12, chillEff: 20 } } },
        { name: 'Storm Choir', pool: [{ lightDmg: 12 }, { shockChance: 5 }], notable: { name: 'Static Dynamo', stats: { lightDmg: 30, shockChance: 15, castSpd: 6 } } },
      ],
    },
    drift: {
      ang: 30, name: 'Drift', hub: { moveSpd: 4, projDmg: 6 }, path: [{ atkSpd: 3 }, { projDmg: 6 }, { evasion: 2 }], ks: 'starborn',
      w: [
        { name: 'Slipstream', pool: [{ moveSpd: 4 }, { atkSpd: 4 }], notable: { name: 'Comet Tail', stats: { moveSpd: 10, dashCd: 25, atkSpd: 5 } } },
        { name: 'Marksman', pool: [{ projDmg: 10 }, { projSpd: 10 }], notable: { name: 'Deadeye', stats: { projDmg: 25, pierce: 1 } } },
        { name: 'Keen Visor', pool: [{ critChance: 15 }, { critMulti: 8 }], notable: { name: 'Eye of the Void', stats: { critChance: 40, critMulti: 25 } } },
        { name: 'Ghost Step', pool: [{ evasion: 3 }, { stealthDmg: 10 }], notable: { name: 'Phantom', stats: { evasion: 10, dashCd: 20, stealthDmg: 30 } } },
      ],
    },
    hull: {
      ang: 150, name: 'Hull', hub: { life: 15, armour: 20 }, path: [{ life: 8 }, { meleeDmg: 6 }, { armour: 15 }], ks: 'unbroken',
      w: [
        { name: 'Plated Hull', pool: [{ life: 12 }, { armour: 25 }, { armourPct: 10 }], notable: { name: 'Bulwark Plating', stats: { lifePct: 12, armourPct: 30, armour: 40 } } },
        { name: 'Breaker', pool: [{ meleeDmg: 10 }, { physDmg: 10 }, { knock: 15 }], notable: { name: 'Shatterhand', stats: { meleeDmg: 25, atkSpd: 6, knock: 30 } } },
        { name: 'Gravity Well', pool: [{ areaDmg: 10 }, { area: 8 }], notable: { name: 'Collapse', stats: { area: 20, areaDmg: 20 } } },
        { name: 'Red Engine', pool: [{ regen: 1.5 }, { lifePct: 5 }, { leech: 1 }], notable: { name: 'Blood Engine', stats: { regen: 5, leech: 2, lifeOnHit: 3 } } },
      ],
    },
  };
  const HYB = [
    { ang: 90, left: 'drift', right: 'hull', group: 'hd', name: "Duelist's Circle", pool: [{ meleeDmg: 8 }, { critChance: 10 }, { atkSpd: 3 }], notable: { name: 'Riposte', stats: { meleeDmg: 20, critMulti: 20, atkSpd: 6 } }, path: [{ dmg: 5 }, { block: 2 }], junction: { critMulti: 10, block: 3 }, ks: 'glass' },
    { ang: -30, left: 'psyche', right: 'drift', group: 'dp', name: 'Spellslinger', pool: [{ spellDmg: 10 }, { castSpd: 4 }, { minionDmg: 12 }], notable: { name: 'Arcane Barrage', stats: { spellDmg: 20, castSpd: 8, projSpd: 15 } }, path: [{ dmg: 5 }, { cdr: 4 }], junction: { cdr: 8, duration: 8 }, ks: 'overcharge' },
    { ang: 210, left: 'hull', right: 'psyche', group: 'ph', name: 'Void Communion', pool: [{ voidDmg: 12 }, { ward: 15 }, { corruptChance: 5 }], notable: { name: 'Faraday Mantle', stats: { ward: 40, wardPct: 20, voidDmg: 15 } }, path: [{ ward: 8 }, { life: 8 }, { block: 2 }], junction: { duration: 10, ward: 15, minionDmg: 15 }, ks: 'bloodrite' },
  ];
  const CLASS_AT = { 30: 'ranger', 150: 'knight', 210: 'paladin', '-90': 'starcaller', '-30': 'engineer', 90: 'monk' };

  // ---- build ----
  const core = add({ type: 'notable', x: 0, y: 0, name: 'Lantern Core', stats: { dmg: 6, life: 10, charge: 10 }, group: 'core' });
  const inner = {};
  const innerPool = [{ dmg: 5 }, { life: 8 }, { charge: 8 }, { memFind: 10 }];
  const angs = [-90, -30, 30, 90, 150, 210];
  const classStart = {};
  angs.forEach((a, i) => {
    const cls = CLASS_AT[a];
    if (cls) {
      inner[a] = add(Object.assign({ type: 'classStart', cls, name: GV.CLASSES[cls].name, stats: {}, group: 'core' }, P(a, 150)));
      classStart[cls] = inner[a];
    } else inner[a] = small(innerPool[i % innerPool.length], 'core', 'Core Conduit', P(a, 150));
    link(core, inner[a]);
  });
  angs.forEach((a, i) => link(inner[a], inner[angs[(i + 1) % 6]]));

  const armW = {};
  for (const key in ARMS) {
    const A = ARMS[key], th = A.ang;
    const hub = small(A.hub, key, A.name + ' Nexus', P(th, 340));
    path(inner[th], hub, 2, A.path, key, A.name + ' Path');
    const w = [
      wheel(P(th - 20, 580), 70, 6, A.w[0].pool, A.w[0].notable, key, A.w[0].name),
      wheel(P(th + 20, 580), 70, 6, A.w[1].pool, A.w[1].notable, key, A.w[1].name),
      wheel(P(th - 13, 860), 70, 6, A.w[2].pool, A.w[2].notable, key, A.w[2].name),
      wheel(P(th + 13, 860), 70, 6, A.w[3].pool, A.w[3].notable, key, A.w[3].name),
    ];
    path(hub, nearest(w[0], nodes[hub]), 1, A.path, key, A.name + ' Path');
    path(hub, nearest(w[1], nodes[hub]), 1, A.path, key, A.name + ' Path');
    path(nearest(w[0], w[2].c), nearest(w[2], w[0].c), 2, A.path, key, A.name + ' Path');
    path(nearest(w[1], w[3].c), nearest(w[3], w[1].c), 2, A.path, key, A.name + ' Path');
    path(nearest(w[2], w[3].c), nearest(w[3], w[2].c), 2, A.path, key, A.name + ' Path');
    const ks = add(Object.assign({ type: 'keystone', keystone: A.ks, name: GV.KEYSTONES[A.ks].name, group: key, stats: {} }, P(th, 1120)));
    path(nearest(w[2], nodes[ks]), ks, 1, A.path, key, A.name + ' Path');
    path(nearest(w[3], nodes[ks]), ks, 1, A.path, key, A.name + ' Path');
    armW[key] = w;
  }
  for (const H of HYB) {
    const ph = H.ang;
    const wh = wheel(P(ph, 490), 70, 6, H.pool, H.notable, H.group, H.name);
    path(inner[ph], nearest(wh, { x: 0, y: 0 }), 2, H.path, H.group, H.name + ' Path');
    const L = armW[H.left], R = armW[H.right];
    path(nearest(wh, L[1].c), nearest(L[1], wh.c), 1, H.path, H.group, H.name + ' Path');
    path(nearest(wh, R[0].c), nearest(R[0], wh.c), 1, H.path, H.group, H.name + ' Path');
    const J = small(H.junction, H.group, H.name + ' Junction', P(ph, 870));
    path(nearest(wh, nodes[J]), J, 2, H.path, H.group, H.name + ' Path');
    path(nearest(L[3], nodes[J]), J, 2, H.path, H.group, H.name + ' Path');
    path(nearest(R[2], nodes[J]), J, 2, H.path, H.group, H.name + ' Path');
    const ks = add(Object.assign({ type: 'keystone', keystone: H.ks, name: GV.KEYSTONES[H.ks].name, group: H.group, stats: {} }, P(ph, 1070)));
    link(J, ks);
  }

  // Added after everything else so older saves keep their node numbers: the Symbiote's start,
  // between the Ranger's and the Monk's.
  {
    const sy = add(Object.assign({ type: 'classStart', cls: 'symbiote', name: GV.CLASSES.symbiote.name, stats: {}, group: 'core' }, P(60, 175)));
    classStart.symbiote = sy;
    link(core, sy); link(sy, inner[30]); link(sy, inner[90]);
  }
  // ...and the Cryo Lancer's, between the Starcaller's and the Engineer's, by the Cryo Lattice.
  {
    const ln = add(Object.assign({ type: 'classStart', cls: 'lancer', name: GV.CLASSES.lancer.name, stats: {}, group: 'core' }, P(-60, 175)));
    classStart.lancer = ln;
    link(core, ln); link(ln, inner[-90]); link(ln, inner[-30]);
  }

  const GROUPS = {
    core: { name: 'Core', hue: 45 }, hull: { name: 'Hull', hue: 352 }, drift: { name: 'Drift', hue: 158 }, psyche: { name: 'Psyche', hue: 200 },
    hd: { name: "Duelist's Circle", hue: 28 }, dp: { name: 'Spellslinger', hue: 265 }, ph: { name: 'Void Communion', hue: 310 },
  };

  const save = () => GV.save.data;
  const T = (GV.TREE = {
    nodes, edges, GROUPS, ARMS, HYB, classStart,
    root() { return classStart[save().cls] != null ? classStart[save().cls] : core; },
    // Passive points come only from ranks: 2 to start, +1 per rank, capped so no build can take
    // the whole tree. Roughly a third of it: you have to choose.
    CAP: 60,
    total() { return Math.min(this.CAP, (save().level || 1) + 1); },
    // Older saves may hold more than the new rules allow: reset those trees for free.
    enforceCap() {
      const d = save();
      if (!d || !d.cls || this.spent() <= this.total()) return false;
      d.passives = [this.root()];
      d.treeResetNote = true;
      for (const L of d.loadouts || []) if (L && L.passives && L.passives.length - 1 > this.total()) L.passives = [this.root()];
      return true;
    },
    spent() { return save().passives.length - 1; },
    points() { return this.total() - this.spent(); },
    has(id) { return save().passives.includes(id); },
    // Shortest path of unallocated nodes from the allocated set to `id` (PoE-style path allocation).
    pathTo(id) {
      if (this.has(id)) return [];
      const d = save(), alloc = new Set(d.passives);
      const prev = new Map(), q = [];
      for (const a of alloc) for (const b of nodes[a].adj) if (!alloc.has(b) && !prev.has(b)) {
        if (nodes[b].type === 'classStart') continue;
        prev.set(b, -1); q.push(b);
      }
      while (q.length) {
        const c = q.shift();
        if (c === id) break;
        for (const b of nodes[c].adj) if (!alloc.has(b) && !prev.has(b) && nodes[b].type !== 'classStart') { prev.set(b, c); q.push(b); }
      }
      if (!prev.has(id)) return null;
      const out = [];
      let c = id;
      while (c !== -1) { out.unshift(c); c = prev.get(c); }
      return out;
    },
    allocPath(id) {
      const p = this.pathTo(id);
      if (!p || !p.length || p.length > this.points()) return false;
      save().passives.push(...p);
      GV.save.write();
      return true;
    },
    canRefund(id) {
      const d = save();
      if (!this.has(id) || id === this.root()) return false;
      const rest = new Set(d.passives); rest.delete(id);
      const seen = new Set([this.root()]), q = [this.root()];
      while (q.length) { const c = q.shift(); for (const b of nodes[c].adj) if (rest.has(b) && !seen.has(b)) { seen.add(b); q.push(b); } }
      return seen.size === rest.size;
    },
    refundCost() { return 3 + Math.floor(save().level / 2); },
    refund(id) {
      const d = save(), c = this.refundCost();
      if (!this.canRefund(id) || d.memories < c) return false;
      d.memories -= c;
      d.passives = d.passives.filter((x) => x !== id);
      GV.save.write();
      return true;
    },
    resetCost() { return this.spent() * 2; },
    reset() {
      const d = save(), c = this.resetCost();
      if (d.memories < c) return false;
      d.memories -= c;
      d.passives = [this.root()];
      GV.save.write();
      return true;
    },
    lines(n) {
      if (n.type === 'keystone') return GV.KEYSTONES[n.keystone].lines;
      if (n.type === 'classStart') return ['Starting point of the ' + n.name, GV.CLASSES[n.cls].treeHint];
      return GV.STATS.lines(n.stats);
    },
  });
  T.core = core;
})();
