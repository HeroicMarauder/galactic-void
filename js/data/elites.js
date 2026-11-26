// Galactic Void — elite enemies. Any normal foe can spawn as an elite with one or two modifiers:
// three times the life, harder hits, a coloured aura, and much better drops.
(function () {
  const GV = window.GV;
  GV.ELITE_MODS = {
    hasted: { name: 'Hasted', color: '#7dffcf', apply(e) { e.spd *= 1.6; } },
    armoured: { name: 'Armoured', color: '#c9d2e6', apply(e) { e.dr = 0.4; } },
    volatile: { name: 'Volatile', color: '#ff7a4a', apply(e) { e.volatile = true; } },
    splitting: { name: 'Splitting', color: '#d6a8ff', apply(e) { e.splitting = true; } },
    vampiric: { name: 'Vampiric', color: '#ff4f62', apply(e) { e.vamp = true; } },
    frenzied: { name: 'Frenzied', color: '#ffd36b', apply(e) { e.dmg *= 1.3; e.spd *= 1.25; } },
  };
  GV.makeElite = function (e, diff) {
    const keys = Object.keys(GV.ELITE_MODS);
    const n = diff >= 3 && Math.random() < 0.5 ? 2 : 1;
    const mods = [];
    while (mods.length < n) { const k = keys[Math.floor(Math.random() * keys.length)]; if (!mods.includes(k)) mods.push(k); }
    e.elite = mods;
    e.hp *= 3; e.maxHp = e.hp; e.dmg *= 1.2;
    for (const k of mods) GV.ELITE_MODS[k].apply(e);
    e.eliteName = mods.map((k) => GV.ELITE_MODS[k].name).join(' ') + ' ' + e.def.name;
    e.eliteColor = GV.ELITE_MODS[mods[0]].color;
    return e;
  };
})();
