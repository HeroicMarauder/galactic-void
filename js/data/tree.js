// Galactic Void — the passive tree, second edition. A constellation of ~530 nodes in eight
// regions, one per class, laid around the Lantern Core like the points of a compass:
//
//   start → Doctrine (the class's own cluster, with a class-only Signature notable)
//         → two inner wheels → a nexus → two outer wheels → a great cluster → the keystone
//
// Between every pair of neighbouring regions run bridges (a hybrid notable on the inside, a
// path on the outside, and two bridge keystones), so any class can wander into any other's
// ground. Built procedurally from the spec below, the same every time. Notables can carry a
// flag (an ascendancy-style rule), fx (numbers the combat hooks read) or tm (tag modifiers).
(function () {
  const GV = window.GV;
  const D = Math.PI / 180;
  const nodes = [], edges = [];
  const VER = 2;

  const add = (o) => { o.id = nodes.length; o.adj = []; nodes.push(o); return o.id; };
  const link = (a, b) => {
    if (a === b || nodes[a].adj.includes(b)) return;
    nodes[a].adj.push(b); nodes[b].adj.push(a); edges.push([a, b]);
  };
  const P = (a, r) => ({ x: Math.cos(a * D) * r, y: Math.sin(a * D) * r });
  const small = (stats, group, name, pos) => add(Object.assign({ type: 'small', stats, group, name }, pos));
  const notable = (spec, group, cluster, pos) => add(Object.assign({ type: 'notable', name: spec.name, stats: spec.stats || {}, flag: spec.flag, fx: spec.fx, tm: spec.tm, extra: spec.lines, group, cluster }, pos));
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
  function wheel(c, R, n, pool, nspec, group, name) {
    const ring = [];
    const rot = Math.atan2(c.y, c.x) + Math.PI; // ring[0] faces the core
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      ring.push(small(pool[i % pool.length], group, name, { x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R }));
    }
    for (let i = 0; i < n; i++) link(ring[i], ring[(i + 1) % n]);
    const nid = notable(nspec, group, name, { x: c.x, y: c.y });
    link(nid, ring[0]); link(nid, ring[Math.floor(n / 2)]);
    return { ring, nid, c };
  }
  const nearest = (w, p) => {
    let best = null, bd = 1e12;
    for (const id of w.ring) { const n = nodes[id], dd = (n.x - p.x) ** 2 + (n.y - p.y) ** 2; if (dd < bd) { bd = dd; best = id; } }
    return best;
  };
  const W = (name, pool, nt) => ({ name, pool, notable: nt });

  // ---------------- the eight regions ----------------
  const REGIONS = [
    { id: 'psyche', name: 'Psyche', ang: -90, hue: 265, cls: 'starcaller', ks: 'hollowed', path: [{ spellDmg: 6 }, { charge: 8 }],
      doctrine: W('Astral Doctrine', [{ spellDmg: 8 }, { castSpd: 3 }, { ward: 10 }], { name: 'Star Chart', stats: { spellDmg: 18, castSpd: 6, ward: 20 } }),
      sig: { name: 'Starwell', stats: { charge: 20 }, fx: { fullChargeMore: 25 }, lines: ['Spells deal 25% more damage while your Charge is above 80%'] },
      inner: [W('Charge Cells', [{ charge: 12 }, { chargeRegenPct: 10 }], { name: 'Overcapacity', stats: { charge: 30, chargeRegenPct: 25, costRed: 8 } }),
        W('Starfire', [{ fireDmg: 12 }, { igniteChance: 5 }], { name: 'Pyre of Stars', stats: { fireDmg: 30, igniteChance: 15, igniteDmg: 30 } })],
      outer: [W('Storm Choir', [{ lightDmg: 12 }, { shockChance: 5 }], { name: 'Static Dynamo', stats: { lightDmg: 30, shockChance: 15, castSpd: 6 } }),
        W('Echo Chamber', [{ castSpd: 4 }, { cdr: 4 }], { name: 'Resonance', stats: { castSpd: 10, cdr: 12, duration: 10 } })],
      great: { name: 'Astral Sea', pool: [{ spellDmg: 10 }, { area: 6 }, { critChance: 12 }], a: { name: 'Cosmic Rift', stats: { spellDmg: 25, area: 12, areaDmg: 15 } }, b: { name: 'Starseer', stats: { critChance: 50, critMulti: 25, spellDmg: 10 } } } },
    { id: 'rime', name: 'Rime', ang: -45, hue: 205, cls: 'lancer', ks: 'absolute', path: [{ coldDmg: 6 }, { projDmg: 5 }],
      doctrine: W('Lancer Doctrine', [{ coldDmg: 8 }, { meleeDmg: 6 }, { projDmg: 6 }], { name: 'Long Reach', stats: { meleeDmg: 15, projDmg: 15, knock: 20 } }),
      sig: { name: 'Glacial Spike', stats: { freezeChance: 5 }, fx: { frozenMore: 40 }, lines: ['Hits against Frozen enemies deal 40% more damage'] },
      inner: [W('Cryo Lattice', [{ coldDmg: 12 }, { chillEff: 10 }], { name: 'Deep Freeze', stats: { coldDmg: 25, freezeChance: 10, chillEff: 20 } }),
        W('Spearpoint', [{ projDmg: 10 }, { projSpd: 10 }], { name: 'Skewer', stats: { projDmg: 25, pierce: 1, critChance: 20 } })],
      outer: [W('Frostbite', [{ chillEff: 10 }, { coldDmg: 8 }], { name: 'Brittle', stats: { coldDmg: 15 }, fx: { chilledMore: 15 }, lines: ['Chilled enemies take 15% more damage from your hits'] }),
        W("Hunter's Tether", [{ moveSpd: 3 }, { cdr: 4 }], { name: 'Harpoon Drill', stats: { moveSpd: 6 }, tm: [{ t: 'Movement', more: 1.2, cdr: 20 }], lines: ['Movement skills deal 20% more damage and recharge 20% faster'] })],
      great: { name: 'Polar Night', pool: [{ coldDmg: 10 }, { freezeChance: 2 }, { armour: 20 }], a: { name: "Winter's Heart", stats: { coldDmg: 30, freezeChance: 8, life: 30 } }, b: { name: 'Shatter', stats: { critChance: 30 }, fx: { frozenMore: 20 }, lines: ['Hits against Frozen enemies deal 20% more damage'] } } },
    { id: 'foundry', name: 'Foundry', ang: 0, hue: 35, cls: 'engineer', ks: 'legion', path: [{ minionDmg: 8 }, { armour: 15 }],
      doctrine: W('Engineer Doctrine', [{ minionDmg: 10 }, { lightDmg: 6 }, { armour: 15 }], { name: 'Toolkit', stats: { minionDmg: 20, minionSpd: 10, armour: 30 } }),
      sig: { name: 'Field Workshop', stats: { minionCount: 1, minionSpd: 15, minionDur: 25 }, lines: [] },
      inner: [W('Assembly Line', [{ minionDmg: 12 }, { minionSpd: 5 }], { name: 'Mass Production', stats: { minionCount: 1, minionDmg: 15 } }),
        W('Arc Coils', [{ lightDmg: 12 }, { shockChance: 5 }], { name: 'Tesla Grid', stats: { lightDmg: 30, shockChance: 15, minionDmg: 15 } })],
      outer: [W('Overclock', [{ minionSpd: 6 }, { cdr: 3 }], { name: 'Redline', stats: { minionSpd: 25, castSpd: 8 } }),
        W('Command Deck', [{ commandEff: 10 }, { minionDur: 8 }], { name: 'Chain of Command', stats: { commandEff: 40, minionDur: 20, cdr: 10 } })],
      great: { name: 'The Forge', pool: [{ minionDmg: 12 }, { minionDur: 6 }, { areaDmg: 8 }], a: { name: 'Colossal Frames', stats: { minionDmg: 30, areaDmg: 20 }, tm: [{ t: 'Slam', area: 20 }], lines: ['Slam skills have 20% increased Area'] }, b: { name: 'Self-Repair', stats: { minionLeech: 1.5, regen: 4, armourPct: 20 } } } },
    { id: 'drift', name: 'Drift', ang: 45, hue: 158, cls: 'ranger', ks: 'starborn', path: [{ moveSpd: 3 }, { projDmg: 6 }],
      doctrine: W('Ranger Doctrine', [{ projDmg: 8 }, { evasion: 2 }, { critChance: 10 }], { name: 'Trailblazer', stats: { projDmg: 15, moveSpd: 6, evasion: 4 } }),
      sig: { name: 'Vanishing Act', stats: { stealthDmg: 30 }, fx: { dashStealth: 0.8 }, lines: ['Phase Dash grants 0.8 seconds of Stealth'] },
      inner: [W('Slipstream', [{ moveSpd: 4 }, { atkSpd: 4 }], { name: 'Comet Tail', stats: { moveSpd: 10, dashCd: 25, atkSpd: 5 } }),
        W('Marksman', [{ projDmg: 10 }, { projSpd: 10 }], { name: 'Deadeye', stats: { projDmg: 25, pierce: 1 } })],
      outer: [W('Keen Visor', [{ critChance: 15 }, { critMulti: 8 }], { name: 'Eye of the Void', stats: { critChance: 40, critMulti: 25 } }),
        W('Ghost Step', [{ evasion: 3 }, { stealthDmg: 10 }], { name: 'Phantom', stats: { evasion: 10, dashCd: 20, stealthDmg: 30 } })],
      great: { name: 'Open Sky', pool: [{ projDmg: 10 }, { atkSpd: 4 }, { evasion: 2 }], a: { name: 'Skyhunter', stats: { projDmg: 15 }, fx: { airMore: 20 }, lines: ['Deal 20% more damage while airborne'] }, b: { name: 'Bullet Time', stats: { atkSpd: 12, projSpd: 20, critMulti: 15 } } } },
    { id: 'circle', name: 'The Circle', ang: 90, hue: 28, cls: 'monk', ks: 'glass', path: [{ atkSpd: 3 }, { meleeDmg: 6 }],
      doctrine: W('Monk Doctrine', [{ atkSpd: 4 }, { evasion: 2 }, { meleeDmg: 8 }], { name: 'Still Mind', stats: { atkSpd: 10, evasion: 6, meleeDmg: 10 } }),
      sig: { name: 'Graviton Palm', flag: 'palm', lines: ['Every fourth melee hit releases a shockwave dealing 60% of its damage around the target'] },
      inner: [W("Duelist's Circle", [{ meleeDmg: 8 }, { critChance: 10 }], { name: 'Riposte', stats: { meleeDmg: 20, critMulti: 20, atkSpd: 6 } }),
        W('Flurry', [{ atkSpd: 4 }, { critChance: 8 }], { name: 'Thousand Fists', stats: { atkSpd: 15, meleeDmg: 10 } })],
      outer: [W('Breath Control', [{ regen: 1.5 }, { evasion: 3 }], { name: 'Inner Fire', stats: { regen: 5, evasion: 8, fireDmg: 15 } }),
        W('Momentum', [{ moveSpd: 3 }, { areaDmg: 8 }], { name: 'Comet Strike', stats: { areaDmg: 15 }, tm: [{ t: 'Slam', more: 1.2 }], lines: ['Slam skills deal 20% more damage'] })],
      great: { name: 'The Arena', pool: [{ meleeDmg: 10 }, { critMulti: 8 }, { atkSpd: 3 }], a: { name: 'Killing Blow', stats: { meleeDmg: 15 }, fx: { bossMore: 20 }, lines: ['Deal 20% more damage to bosses and Titans'] }, b: { name: 'Flow State', stats: { atkSpd: 8 }, fx: { killCharge: 4 }, lines: ['Kills restore 4 Charge'] } } },
    { id: 'hull', name: 'Hull', ang: 135, hue: 352, cls: 'knight', ks: 'unbroken', path: [{ life: 8 }, { meleeDmg: 6 }],
      doctrine: W('Knight Doctrine', [{ life: 10 }, { meleeDmg: 8 }, { armour: 20 }], { name: 'Oath of Steel', stats: { life: 30, meleeDmg: 15, armourPct: 15 } }),
      sig: { name: 'Iron Resolve', stats: { life: 40 }, fx: { hiLifeLess: 15 }, lines: ['Take 15% less damage while above 75% Life'] },
      inner: [W('Plated Hull', [{ life: 12 }, { armour: 25 }, { armourPct: 10 }], { name: 'Bulwark Plating', stats: { lifePct: 12, armourPct: 30, armour: 40 } }),
        W('Breaker', [{ meleeDmg: 10 }, { physDmg: 10 }, { knock: 15 }], { name: 'Shatterhand', stats: { meleeDmg: 25, atkSpd: 6, knock: 30 } })],
      outer: [W('Gravity Well', [{ areaDmg: 10 }, { area: 8 }], { name: 'Collapse', stats: { area: 20, areaDmg: 20 } }),
        W('Red Engine', [{ regen: 1.5 }, { lifePct: 5 }, { leech: 1 }], { name: 'Blood Engine', stats: { regen: 5, leech: 2, lifeOnHit: 3 } })],
      great: { name: 'Bastion of the Lantern', pool: [{ life: 12 }, { armourPct: 8 }, { meleeDmg: 6 }], a: { name: 'Juggernaut', stats: { life: 40, armourPct: 20 }, flag: 'noKnock', lines: ['You cannot be knocked back'] }, b: { name: 'Battle Hymn', stats: { meleeDmg: 15 }, fx: { killHeal: 2 }, lines: ['Kills heal 2% of your maximum Life'] } } },
    { id: 'sanctum', name: 'Sanctum', ang: 180, hue: 48, cls: 'paladin', ks: 'bastion', path: [{ block: 1 }, { ward: 10 }],
      doctrine: W('Paladin Doctrine', [{ block: 1 }, { spellDmg: 6 }, { ward: 10 }], { name: 'Vow of Light', stats: { block: 5, ward: 30, spellDmg: 12 } }),
      sig: { name: 'Radiant Aegis', fx: { blockHeal: 3, blockWard: 15 }, lines: ['Blocking a hit restores 3% of your Life and 15 Void Ward'] },
      inner: [W('Shieldwall', [{ block: 1.5 }, { armour: 20 }], { name: 'Aegis Discipline', stats: { block: 6, armourPct: 25 } }),
        W('Holy Fire', [{ fireDmg: 10 }, { lightDmg: 10 }], { name: 'Judgement', stats: { fireDmg: 20, lightDmg: 20, areaDmg: 15 } })],
      outer: [W('Consecration', [{ duration: 6 }, { area: 6 }], { name: 'Hallowed Ground', stats: { duration: 20 }, tm: [{ t: 'Duration', area: 15 }], lines: ['Duration skills have 15% increased Area'] }),
        W('Faraday Choir', [{ ward: 15 }, { wardPct: 6 }], { name: 'Faraday Mantle', stats: { ward: 40, wardPct: 20, voidDmg: 15 } })],
      great: { name: 'Cathedral', pool: [{ spellDmg: 8 }, { block: 1 }, { life: 8 }], a: { name: 'Retribution', stats: { block: 5 }, flag: 'retaliate', lines: ['Blocking a hit slams the enemies around you'] }, b: { name: "Martyr's Fire", stats: { life: 30 }, flag: 'martyr', lines: ['When hit, 25% chance to release a burst of holy fire'] } } },
    { id: 'brood', name: 'Brood', ang: 225, hue: 330, cls: 'symbiote', ks: 'hivebond', path: [{ leech: 0.5 }, { minionDmg: 8 }],
      doctrine: W('Symbiote Doctrine', [{ life: 8 }, { leech: 0.5 }, { corruptChance: 3 }], { name: 'Hungry Flesh', stats: { lifePct: 8, leech: 1.5, voidDmg: 15 } }),
      sig: { name: 'Shared Flesh', stats: { minionLeech: 1 }, fx: { killHeal: 2 }, lines: ['Kills by you or your minions heal 2% of your maximum Life'] },
      inner: [W('Spawning Pools', [{ minionDmg: 12 }, { minionDur: 6 }], { name: 'Brood Mother', stats: { minionCount: 1, minionDmg: 15 } }),
        W('Rot', [{ voidDmg: 12 }, { corruptChance: 4 }], { name: 'Blight', stats: { voidDmg: 30, corruptChance: 15 }, fx: { corruptedMore: 10 }, lines: ['Corrupted enemies take 10% more damage from your hits'] })],
      outer: [W('Feral Pack', [{ minionSpd: 6 }, { minionDmg: 8 }], { name: 'Alpha Instinct', stats: { minionSpd: 20, minionDmg: 20 } }),
        W('Regrowth', [{ regen: 1.5 }, { life: 10 }], { name: 'Mending Carapace', stats: { regen: 6, lifePct: 10, armour: 30 } })],
      great: { name: 'The Hive', pool: [{ minionDmg: 12 }, { minionLeech: 0.3 }, { voidDmg: 8 }], a: { name: 'Hive Queen', stats: { minionCount: 1, minionDur: 20, minionDmg: 15 } }, b: { name: 'Devour', stats: { voidDmg: 15 }, fx: { killBurst: 8 }, lines: ['Enemies you kill burst for 8% of their maximum Life as Void damage around them'] } } },
  ];
  // Bridges, from each region to the next one clockwise.
  const BRIDGES = [
    { name: 'Spellslinger', pool: [{ spellDmg: 8 }, { coldDmg: 8 }], notable: { name: 'Arcane Barrage', stats: { spellDmg: 20, castSpd: 8, projSpd: 15 } }, outer: [{ castSpd: 3 }, { coldDmg: 8 }], ks: 'overcharge' },
    { name: 'Cryo Engineering', pool: [{ coldDmg: 8 }, { minionDmg: 8 }], notable: { name: 'Frost Turrets', stats: { minionDmg: 15, coldDmg: 15, chillEff: 20 } }, outer: [{ minionDur: 6 }, { chillEff: 8 }] },
    { name: 'Drone Bay', pool: [{ minionDmg: 8 }, { projDmg: 8 }], notable: { name: 'Targeting Uplink', stats: { minionDmg: 15, projDmg: 15, minionSpd: 10 } }, outer: [{ projSpd: 8 }, { minionSpd: 4 }] },
    { name: 'Wind Dancer', pool: [{ atkSpd: 3 }, { evasion: 2 }], notable: { name: 'Gale Step', stats: { atkSpd: 8, evasion: 6, moveSpd: 5 } }, outer: [{ moveSpd: 3 }, { critChance: 8 }] },
    { name: "Warrior's Path", pool: [{ meleeDmg: 8 }, { life: 8 }], notable: { name: 'Iron Fist', stats: { meleeDmg: 20, physDmg: 15, life: 20 } }, outer: [{ physDmg: 8 }, { life: 8 }] },
    { name: 'Templar Road', pool: [{ armour: 20 }, { block: 1 }], notable: { name: 'Crusade', stats: { block: 4, life: 25, meleeDmg: 10 } }, outer: [{ armourPct: 6 }, { block: 1 }] },
    { name: 'Void Communion', pool: [{ voidDmg: 8 }, { ward: 10 }], notable: { name: 'Eclipse Rite', stats: { voidDmg: 20, ward: 30, corruptChance: 8 } }, outer: [{ wardPct: 5 }, { voidDmg: 8 }] },
    { name: 'Hive Mind', pool: [{ minionDmg: 8 }, { spellDmg: 8 }], notable: { name: 'Psychic Link', stats: { minionDmg: 20, spellDmg: 15, commandEff: 20 } }, outer: [{ life: 8 }, { minionDmg: 8 }], ks: 'bloodrite' },
  ];

  // ---------------- build ----------------
  const core = add({ type: 'notable', x: 0, y: 0, name: 'Lantern Core', stats: { dmg: 6, life: 10, charge: 10 }, group: 'core' });
  const classStart = {}, built = {};
  for (const R of REGIONS) {
    const th = R.ang, g = R.id;
    const st = add(Object.assign({ type: 'classStart', cls: R.cls, name: GV.CLASSES[R.cls].name, stats: {}, group: 'core' }, P(th, 195)));
    classStart[R.cls] = st; link(core, st);
    const doc = wheel(P(th, 390), 60, 6, R.doctrine.pool, R.doctrine.notable, g, R.doctrine.name);
    path(st, doc.ring[0], 1, R.path, g, R.name + ' Path');
    const sig = notable(R.sig, g, R.doctrine.name, P(th, 530));
    Object.assign(nodes[sig], { sig: true, cls: R.cls });
    link(sig, nearest(doc, nodes[sig]));
    const inn = R.inner.map((w, i) => wheel(P(th + (i ? 12 : -12), 660), 66, 6, w.pool, w.notable, g, w.name));
    inn.forEach((w) => path(nearest(doc, w.c), nearest(w, doc.c), 1, R.path, g, R.name + ' Path'));
    const nexus = small({ dmg: 6, life: 8 }, g, R.name + ' Nexus', P(th, 850));
    inn.forEach((w) => link(nexus, nearest(w, nodes[nexus])));
    const out = R.outer.map((w, i) => wheel(P(th + (i ? 13 : -13), 1060), 66, 6, w.pool, w.notable, g, w.name));
    out.forEach((w) => path(nexus, nearest(w, nodes[nexus]), 1, R.path, g, R.name + ' Path'));
    // the great cluster: an eight-node ring, a notable at its heart and one hanging off its rim
    const G = R.great, gw = wheel(P(th, 1300), 90, 8, G.pool, G.a, g, G.name);
    out.forEach((w) => path(nearest(w, gw.c), nearest(gw, w.c), 1, G.pool, g, G.name));
    const side = nodes[gw.ring[2]], bpos = { x: gw.c.x + (side.x - gw.c.x) * 1.55, y: gw.c.y + (side.y - gw.c.y) * 1.55 };
    link(notable(G.b, g, G.name, bpos), gw.ring[2]);
    const ks = add(Object.assign({ type: 'keystone', keystone: R.ks, name: GV.KEYSTONES[R.ks].name, group: g, stats: {} }, P(th, 1560)));
    path(gw.ring[4], ks, 1, G.pool, g, G.name);
    built[g] = { inn, out };
  }
  REGIONS.forEach((R, i) => {
    const N = REGIONS[(i + 1) % REGIONS.length], B = BRIDGES[i], a = built[R.id], b = built[N.id];
    const mid = R.ang + 22.5, grp = 'b' + i;
    const bn = notable(B.notable, grp, B.name, P(mid, 745));
    path(nearest(a.inn[1], nodes[bn]), bn, 1, B.pool, grp, B.name);
    path(nearest(b.inn[0], nodes[bn]), bn, 1, B.pool, grp, B.name);
    // the outer road
    const L = nearest(a.out[1], b.out[0].c), Rn = nearest(b.out[0], a.out[1].c);
    const m1 = small(B.outer[0], grp, B.name + ' Road', { x: nodes[L].x + (nodes[Rn].x - nodes[L].x) / 3, y: nodes[L].y + (nodes[Rn].y - nodes[L].y) / 3 });
    const m2 = small(B.outer[1], grp, B.name + ' Road', { x: nodes[L].x + (nodes[Rn].x - nodes[L].x) * 2 / 3, y: nodes[L].y + (nodes[Rn].y - nodes[L].y) * 2 / 3 });
    link(L, m1); link(m1, m2); link(m2, Rn);
    if (B.ks) {
      const ks = add(Object.assign({ type: 'keystone', keystone: B.ks, name: GV.KEYSTONES[B.ks].name, group: grp, stats: {} }, P(mid, 1290)));
      path(m1, ks, 1, B.outer, grp, B.name + ' Road');
    }
  });

  const GROUPS = { core: { name: 'Core', hue: 45 } };
  REGIONS.forEach((R, i) => {
    GROUPS[R.id] = { name: R.name, hue: R.hue };
    const N = REGIONS[(i + 1) % REGIONS.length];
    let h = (R.hue + N.hue) / 2; if (Math.abs(R.hue - N.hue) > 180) h = (h + 180) % 360;
    GROUPS['b' + i] = { name: BRIDGES[i].name, hue: h };
  });

  const save = () => GV.save.data;
  const T = (GV.TREE = {
    VER, nodes, edges, GROUPS, REGIONS, BRIDGES, classStart,
    root() { return classStart[save().cls] != null ? classStart[save().cls] : core; },
    // Passive points come only from ranks: 2 to start, +1 per rank, capped so no build can take
    // the whole tree. Around an eighth of it: you have to choose.
    CAP: 60,
    // +1 per rank, and a bonus point at every tenth rank
    total() { const L = save().level || 1; return Math.min(this.CAP, L + 1 + Math.floor(L / 10)); },
    // A save from the old (first-edition) tree, or one holding more than the rules allow, gets a
    // free reset. Also covers the loadouts.
    migrate(d) {
      if (!d || !d.cls) return false;
      if (d.treeVer === VER) return false;
      if (!d.passives || d.passives.length <= 1) { d.treeVer = VER; return false; } // nothing spent: nothing to refund
      const root = classStart[d.cls] != null ? classStart[d.cls] : core;
      d.passives = [root];
      for (const L of d.loadouts || []) if (L && L.passives) L.passives = [root];
      d.treeVer = VER; d.treeResetNote = 'new';
      return true;
    },
    enforceCap() {
      const d = save();
      if (this.migrate(d)) return true;
      if (!d || !d.cls || this.spent() <= this.total()) return false;
      d.passives = [this.root()];
      d.treeResetNote = true;
      for (const L of d.loadouts || []) if (L && L.passives && L.passives.length - 1 > this.total()) L.passives = [this.root()];
      return true;
    },
    spent() { return save().passives.length - 1; },
    points() { return this.total() - this.spent(); },
    has(id) { return save().passives.includes(id); },
    // Can this class ever take it? (Signatures belong to one class.)
    allowed(id) { const n = nodes[id]; return !!n && n.type !== 'classStart' && !(n.sig && n.cls !== save().cls); },
    // Shortest path of unallocated nodes from the allocated set to `id` (PoE-style path allocation).
    pathTo(id) {
      if (this.has(id)) return [];
      if (!this.allowed(id)) return null;
      const d = save(), alloc = new Set(d.passives);
      const prev = new Map(), q = [];
      for (const a of alloc) for (const b of nodes[a].adj) if (!alloc.has(b) && !prev.has(b)) {
        if (!this.allowed(b)) continue;
        prev.set(b, -1); q.push(b);
      }
      while (q.length) {
        const c = q.shift();
        if (c === id) break;
        for (const b of nodes[c].adj) if (!alloc.has(b) && !prev.has(b) && this.allowed(b)) { prev.set(b, c); q.push(b); }
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
      return [...(n.extra || []), ...GV.STATS.lines(n.stats)];
    },
  });
  T.core = core;
})();
