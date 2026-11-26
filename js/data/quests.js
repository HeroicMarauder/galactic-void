// Galactic Void — quests. Two kinds:
//  · Contracts: three rotating jobs on the board. Finish one, claim it, and a new one takes its place.
//  · Crew quests: short story chains from Ione, Vesper and the Echo, ending in a unique item.
// Progress comes from game events (GV.quests.emit), so co-op kills by either player count.
(function () {
  const GV = window.GV;
  const d = () => GV.save.main || GV.save.data;
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const ENEMY_NAMES = { crawler: 'crawlers', leaper: 'leapers', wisp: 'wisps', brute: 'brutes', jelly: 'void jellies', sentry: 'shielded sentries', spitter: 'spitters' };

  // Objective kinds. `ev` is the event that advances it; `test(q, data)` says whether this event counts
  // and returns how much it adds (or sets, for "best of" objectives).
  const KINDS = {
    kill: { ev: 'kill', test: (q, e) => (!q.p || e.type === q.p) && !e.boss ? 1 : 0, text: (q) => `Destroy ${q.need} ${q.p ? ENEMY_NAMES[q.p] || q.p : 'creatures'}` },
    elite: { ev: 'kill', test: (q, e) => (e.elite ? 1 : 0), text: (q) => `Destroy ${q.need} elites` },
    boss: { ev: 'boss', test: (q, e) => (!q.p || e.type === q.p ? 1 : 0), text: (q) => (q.p ? `Defeat ${q.need > 1 ? q.need + ' × ' : 'a '}${GV.QUEST_BOSS[q.p]}` : `Defeat ${q.need} bosses`) },
    dryBoss: { ev: 'boss', test: (q, e) => (!e.trial && e.flasks === 0 && (!q.p || e.type === q.p) ? 1 : 0), text: (q) => `Defeat ${q.p ? GV.QUEST_BOSS[q.p] : 'a stage boss'} without drinking a flask` },
    quickBoss: { ev: 'boss', test: (q, e) => (!e.trial && e.time <= q.p ? 1 : 0), text: (q) => `Defeat a stage boss within ${q.p} seconds` },
    stage: { ev: 'clear', test: (q, e) => (q.p == null || e.key === q.p ? 1 : 0), text: (q) => (q.p ? `Clear ${GV.quests.stageName(q.p)}` : `Clear ${q.need} stages`) },
    sector: { ev: 'clear', test: (q, e) => (e.sys === q.p ? 1 : 0), text: (q) => `Clear ${q.need} stages in ${GV.UNIVERSE.system(q.p).name}` },
    runMem: { ev: 'clear', set: true, test: (q, e) => e.mem, text: (q) => `Gather ${q.need} memories in a single stage` },
    trial: { ev: 'trial', set: true, test: (q, e) => (!q.c || (e.curses || {})[q.c] ? e.reached : 0), text: (q) => `Survive ${q.need} Rift Trial waves${q.c ? ` with ${GV.TRIAL_CURSES[q.c].name} on` : ''}` },
    craft: { ev: 'craft', test: () => 1, text: (q) => `Use ${q.need} crafting currencies` },
    mem: { ev: 'mem', test: (q, n) => n, text: (q) => `Gather ${q.need} memories` },
  };
  GV.QUEST_BOSS = { brood: 'a Brood Matron', sentinel: 'a Sentinel', warden: 'a Hollow Warden', leviathan: 'a Rift Leviathan', choir: 'a Pale Choir' };

  // ---------- crew quests ----------
  GV.CREW_QUESTS = [
    {
      id: 'ione', who: 'Ione', color: '#ffd28a', title: 'The Lost Signal',
      steps: [
        { k: 'stage', p: '0-1', need: 1, say: 'Ione: There was a distress ping from the Echo Wreck before everything went quiet. Get me there.' },
        { k: 'elite', need: 6, say: 'Ione: The signal is being eaten by something big. The elites carry it in their wiring. Tear it out of them.' },
        { k: 'dryBoss', p: 'warden', need: 1, say: 'Ione: It\'s him. The Warden. He\'s holding the signal. Face him clean, no flasks. He deserves that much.' },
      ],
      reward: { unique: 'Ione\'s Beacon', mem: 200 },
      done: 'Ione: The signal… it\'s a voice log. His. "Tell them I held the line." Keep the beacon. It found you once, it\'ll find you again.',
    },
    {
      id: 'vesper', who: 'Vesper', color: '#ffb347', title: 'Salvage Rights',
      steps: [
        { k: 'mem', need: 400, say: 'Vesper: Business is slow. Bring in memories, any memories, and I\'ll cut you in.' },
        { k: 'kill', p: 'sentry', need: 12, say: 'Vesper: Those shielded sentries are guarding good salvage. Get behind them and crack them open.' },
        { k: 'craft', need: 8, say: 'Vesper: Now show me you can use what I sell. Work some currency into your gear.' },
      ],
      reward: { unique: 'Salvager\'s Treads', cur: { exalt: 2, chaos: 3 } },
      done: 'Vesper: Pleasure doing business. Take the treads. They\'ve walked out of worse places than this.',
    },
    {
      id: 'echo', who: 'The Echo', color: '#9fd8ff', title: 'What the Void Kept',
      steps: [
        { k: 'boss', p: 'leviathan', need: 1, say: 'The Echo: Something swims under the rock out there. It swallowed part of me. Get it back.' },
        { k: 'boss', p: 'choir', need: 1, say: 'The Echo: The singing… that was our crew, once. Quiet them. Please.' },
        { k: 'trial', need: 12, say: 'The Echo: The rest of me is scattered through the Rift. Go deep. Twelve waves, at least.' },
      ],
      reward: { unique: 'Fragment of the Echo', mem: 400 },
      done: 'The Echo: I remember my name now. I won\'t tell you. It\'s the only thing that\'s still mine. But take this.',
    },
  ];

  // ---------- contracts ----------
  function makeContract() {
    const F = GV.progress.frontier(), L = 1 + F;
    const sysPool = [];
    for (let s = 0; s <= F; s++) sysPool.push(s);
    const pool = [
      () => ({ k: 'kill', p: pick(['crawler', 'leaper', 'wisp', F > 0 ? 'jelly' : 'brute', F > 0 ? 'sentry' : 'crawler']), need: rnd(25, 40) * L }),
      () => ({ k: 'kill', need: rnd(80, 120) * L }),
      () => ({ k: 'elite', need: rnd(4, 7) + F * 2 }),
      () => ({ k: 'boss', need: rnd(2, 3) }),
      () => ({ k: 'dryBoss', need: 1 }),
      () => ({ k: 'quickBoss', p: 75 - F * 5, need: 1 }),
      () => ({ k: 'sector', p: pick(sysPool), need: 3 }),
      () => ({ k: 'runMem', need: 60 + 40 * F }),
      () => ({ k: 'trial', need: 6 + F * 3 }),
      () => ({ k: 'trial', need: 4 + F * 2, c: pick(Object.keys(GV.TRIAL_CURSES || { swift: 1 })) }),
      () => ({ k: 'craft', need: rnd(4, 6) }),
    ];
    const q = pick(pool)();
    if (q.k === 'trial' && !(d().cleared || {})['0-0']) return makeContract();
    q.n = 0;
    const r = Math.random();
    q.reward = r < 0.35 ? { mem: Math.round((60 + q.need * 0.6) * L) }
      : r < 0.65 ? { cur: { [pick(['alch', 'chaos', 'annul', 'divine', 'exalt'])]: rnd(1, 2) }, mem: 30 * L }
      : r < 0.85 ? { rare: true, mem: 20 * L }
      : { orb: 1, mem: 30 * L };
    q.id = Math.random().toString(36).slice(2, 8);
    return q;
  }

  GV.quests = {
    KINDS,
    state() {
      const D = d();
      D.quests = D.quests || { contracts: [], crew: {}, done: 0 };
      const Q = D.quests;
      while (Q.contracts.length < 3) Q.contracts.push(makeContract());
      for (const c of GV.CREW_QUESTS) if (!Q.crew[c.id]) Q.crew[c.id] = { step: 0, n: 0, done: false, seen: false };
      return Q;
    },
    text(q) { return KINDS[q.k].text(q); },
    stageName(key) { const [s, t] = key.split('-').map(Number); const sys = GV.UNIVERSE.system(s); return `${sys.stages[t].name} (${sys.name})`; },
    rewardText(r) {
      const out = [];
      if (r.unique) out.push(`Unique: ${r.unique}`);
      if (r.rare) out.push('a Rare item');
      if (r.orb) out.push(`${r.orb} ${GV.TERMS.orb}`);
      if (r.cur) for (const k in r.cur) out.push(`${r.cur[k]} ${GV.CURRENCY[k].name}`);
      if (r.mem) out.push(`${r.mem} ✦`);
      return out.join(' · ');
    },
    // Advance every matching objective. Returns objectives that just finished.
    emit(ev, data) {
      const Q = this.state(), fin = [];
      const step = (q) => {
        const K = KINDS[q.k];
        if (!K || K.ev !== ev || q.n >= q.need) return;
        let v = 0; try { v = K.test(q, data) || 0; } catch (e) {}
        if (!v) return;
        q.n = K.set ? Math.max(q.n, Math.min(q.need, v)) : Math.min(q.need, q.n + v);
        if (q.n >= q.need) fin.push(q);
      };
      for (const c of Q.contracts) step(c);
      for (const cq of GV.CREW_QUESTS) {
        const s = Q.crew[cq.id];
        if (s.done || !s.seen) continue;
        const st = cq.steps[s.step];
        const view = Object.assign({}, st, { n: s.n });
        step(view);
        if (view.n !== s.n) {
          s.n = view.n;
          if (s.n >= st.need) { s.step++; s.n = 0; if (s.step >= cq.steps.length) { s.done = 'ready'; fin.push({ crew: cq }); } else fin.push({ crewStep: cq }); }
        }
      }
      if (fin.length) {
        const p = GV.game && GV.game.play;
        for (const f of fin) {
          const msg = f.crew ? `${f.crew.who}'s quest complete · claim it in Quests` : f.crewStep ? `${f.crewStep.title}: next step unlocked` : `Contract done · claim it in Quests`;
          if (p) { p.toast(msg, 2.6, 'small'); p.toasts[p.toasts.length - 1].color = '#9dffb8'; }
        }
      }
      return fin;
    },
    unclaimed() {
      const Q = this.state();
      return Q.contracts.filter((c) => c.n >= c.need).length + GV.CREW_QUESTS.filter((c) => Q.crew[c.id].done === 'ready').length;
    },
    give(r) {
      const D = d(), got = [];
      if (r.mem) { D.memories += r.mem; }
      if (r.cur) for (const k in r.cur) D.cur[k] = (D.cur[k] || 0) + r.cur[k];
      if (r.orb) D.orbs = (D.orbs || 0) + r.orb;
      if (r.rare) { let it; do { it = GV.items.roll(GV.progress.dropTier(1 + GV.progress.frontier() * 2), {}); } while (it.rarity === 'magic'); GV.items.add(it); got.push(it); }
      if (r.unique) { const u = GV.UNIQUES.find((x) => x.name === r.unique); if (u) { const it = { uid: D.uid++, slot: u.slot, rarity: 'unique', tier: u.tier, name: u.name, base: GV.SLOTS[u.slot].bases[u.tier - 1], mods: Object.assign({}, u.mods), flavor: u.flavor }; GV.items.add(it); got.push(it); } }
      GV.save.write();
      return got;
    },
    claim(id) {
      const Q = this.state(), i = Q.contracts.findIndex((c) => c.id === id);
      if (i < 0 || Q.contracts[i].n < Q.contracts[i].need) return null;
      const c = Q.contracts[i];
      const got = this.give(c.reward);
      Q.contracts[i] = makeContract();
      Q.done = (Q.done || 0) + 1;
      GV.save.write();
      return { c, got };
    },
    claimCrew(id) {
      const Q = this.state(), cq = GV.CREW_QUESTS.find((c) => c.id === id), s = Q.crew[id];
      if (!cq || s.done !== 'ready') return null;
      s.done = true;
      const got = this.give(cq.reward);
      GV.save.write();
      return { cq, got };
    },
    rerollCost() { return 25 + 15 * GV.progress.frontier(); },
    reroll(id) {
      const Q = this.state(), i = Q.contracts.findIndex((c) => c.id === id), D = d(), cost = this.rerollCost();
      if (i < 0 || D.memories < cost) return false;
      D.memories -= cost; Q.contracts[i] = makeContract(); GV.save.write();
      return true;
    },
    accept(id) { const s = this.state().crew[id]; if (s) { s.seen = true; GV.save.write(); } },
  };

  // Quest uniques never drop at random.
  const add = [
    { slot: 'relic', name: 'Ione\'s Beacon', tier: 2, quest: true, mods: { life: 40, memFind: 30, regen: 3, dmg: 14 }, flavor: 'It found you once. It\'ll find you again.' },
    { slot: 'boots', name: 'Salvager\'s Treads', tier: 2, quest: true, mods: { moveSpd: 12, armour: 70, dashCd: 20, life: 25 }, flavor: 'They\'ve walked out of worse places than this.' },
    { slot: 'helm', name: 'Fragment of the Echo', tier: 3, quest: true, mods: { ward: 60, spellDmg: 30, castSpd: 10, critChance: 30 }, flavor: 'A name you will never be told.' },
  ];
  for (const u of add) GV.UNIQUES.push(u);
})();
