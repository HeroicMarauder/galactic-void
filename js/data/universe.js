// Galactic Void — the universe. Sector I is hand-made; every system after it is generated
// from its index, forever. The universe keeps expanding as you clear systems.
(function () {
  const GV = window.GV, U = GV.util;

  const LORE = [
    "Day 41. The nebula hums at night. Ione says it's just the hull cooling.",
    "Vesper traded our spare oxygen for a map. The map shows a ship that isn't ours.",
    "Something answered our distress call. It used my voice.",
    "I counted the crew twice today. The second count was higher.",
    "The rifts open where we sleep. We've stopped sleeping.",
    "Captain's log, final: if you find this, don't look at the horizon.",
    "The Warden was one of us. It still wears the helmet.",
    "Memories are heavy out here. Carry them anyway.",
    "We named the ship Lantern. Funny. It's the only light left.",
    "The stars here aren't stars. They blink when you stare.",
    "I heard Ione singing in the wreck. Ione has been gone for a year.",
    "Every system we reach is emptier than the last. Every one is hungrier.",
  ];

  const S1 = {
    index: 0,
    name: 'Kharon Drift',
    subtitle: 'Sector I · the black-hole nebula',
    hA: 198, hB: 352, rockHue: 262,
    stages: [
      { name: 'Drift Shelf', pool: { crawler: 4, leaper: 2 }, boss: 'brood', bossName: 'The Brood Matron', length: 5200, npc: 'ione', reward: 'dash', vaults: ['dash', 'grip', 'hook'] },
      { name: 'Echo Wreck', pool: { crawler: 3, leaper: 2, wisp: 2 }, boss: 'sentinel', bossName: 'Wreck Sentinel', length: 6000, npc: 'vesper', reward: 'grip', vaults: ['dash', 'grip', 'hook'] },
      { name: 'Event Horizon', pool: { crawler: 2, leaper: 2, wisp: 2, brute: 1 }, boss: 'warden', bossName: 'The Hollow Warden', length: 6800, npc: 'echo', reward: 'nova', vaults: ['grip', 'hook', 'dash'] },
    ],
  };

  const SYL = ['ka', 'vel', 'or', 'thu', 'ne', 'sar', 'ix', 'mor', 'qua', 'zel', 'ra', 'om', 'ty', 'gen', 'dra', 'lu', 'yth', 'ek', 'cor', 'ash'];
  const STAGE_NAMES = ['Shattered Reach', 'Bone Drift', 'Ash Corona', 'Silent Spire', 'Maw of Teeth', 'Glass Rift', 'Drowned Halo', 'Ember Shoals', 'Cradle Wreck', 'Pale Choir', 'Weeping Belt', 'Cinder Vault', 'Hollow Moon', 'Null Garden', 'Red Lattice', 'Starless Keel'];
  const BOSS_PRE = ['Ashen', 'Weeping', 'Starved', 'Ninefold', 'Pale', 'Drowned', 'Choir-born', 'Hollow', 'Gilded', 'Blind'];
  const BOSS_NOUN = { brood: ['Matron', 'Broodqueen', 'Hive Mother'], sentinel: ['Sentinel', 'Watcher', 'Lantern'], warden: ['Warden', 'Shepherd', 'Herald'], leviathan: ['Leviathan', 'Wyrm', 'Devourer'], choir: ['Choir', 'Chorus', 'Cantor'] };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const cache = {};
  function gen(s) {
    const r = U.rng(U.hash('system:' + s));
    const name = cap(U.pick(r, SYL) + U.pick(r, SYL)) + '-' + cap(U.pick(r, SYL)) + ' ' + U.roman(s + 1);
    let hA = Math.floor(r() * 360);
    let hB = (hA + 110 + Math.floor(r() * 140)) % 360;
    // each act (album) has its own colours; systems vary them a little
    const act = GV.actOf && GV.ACTS[GV.actOf(s)];
    if (act && act.hues) { hA = (act.hues[0] + Math.floor((r() - 0.5) * 30) + 360) % 360; hB = (act.hues[1] + Math.floor((r() - 0.5) * 30) + 360) % 360; }
    const order = ['brood', 'sentinel', 'leviathan', 'choir'];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const names = STAGE_NAMES.slice();
    const stages = [0, 1, 2].map((t) => {
      const ni = Math.floor(r() * names.length);
      const nm = names.splice(ni, 1)[0];
      const boss = t === 2 ? 'warden' : order[t];
      const vaults = r() < 0.5 ? ['dash', 'grip'] : [U.pick(r, ['dash', 'grip'])];
      if (s >= 1 && (r() < 0.6 || (s === 1 && t === 0))) vaults.splice(1, 0, 'hook');
      return {
        name: nm,
        pool: { crawler: 3, leaper: 2 + t, wisp: 2 + t, brute: 1 + Math.min(3, Math.floor(s / 2)), jelly: 1 + t, sentry: s >= 2 ? 2 : 1 },
        boss,
        bossName: 'The ' + U.pick(r, BOSS_PRE) + ' ' + U.pick(r, BOSS_NOUN[boss]),
        length: Math.min(9500, 6200 + s * 350 + t * 300),
        npc: t === 1 ? 'vesper' : 'echo',
        reward: s === 1 && t === 0 ? 'hook' : 'core',
        vaults,
      };
    });
    return {
      index: s,
      name,
      subtitle: `Sector ${U.roman(s + 1)} · ${U.pick(r, ['a dying binary', 'a drowned nebula', 'a shattered ring-world', 'a starless reach', 'a red-giant graveyard', 'a choir of pulsars'])}`,
      hA, hB, rockHue: Math.floor(r() * 360),
      stages,
    };
  }

  GV.UNIVERSE = {
    LORE,
    system(s) {
      if (s === 0) return S1;
      if (!cache[s]) cache[s] = gen(s);
      return cache[s];
    },
    difficulty: (s, t) => s * 3 + t,
  };
})();
