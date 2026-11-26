// Galactic Void — weapons, suit upgrades and traversal abilities.
// Attack skill gems take their base damage, speed and reach from the equipped weapon.
(function () {
  const GV = window.GV;

  GV.WEAPONS = {
    ionpair: { name: 'Ion Pistol & Dagger', desc: 'Ranger kit. Fast shots and quicker stabs.', cost: 90, dmg: 12, cd: 0.22, range: 52, h: 26, active: 0.09, knock: 160, color: '#7dffcf', art: 'pistol', cls: 'ranger' },
    greatblade: { name: 'Lumen Greatblade', desc: 'Knight kit. A laser sword with enormous reach.', cost: 90, dmg: 21.5, cd: 0.46, range: 112, h: 64, active: 0.14, knock: 380, color: '#8fe9ff', art: 'greatblade', cls: 'knight' },
    macesh: { name: 'Star Mace & Aegis', desc: 'Paladin kit. Solid blows. The shield blocks 20% of hits.', cost: 90, dmg: 19, cd: 0.36, range: 70, h: 48, active: 0.12, knock: 300, color: '#ffd36b', art: 'mace', block: 20, cls: 'paladin' },
    pike: { name: 'Drift Pike', desc: 'Quick thrusts with good reach. Reliable.', cost: 40, dmg: 14, cd: 0.27, range: 64, h: 26, active: 0.11, knock: 240, color: '#9fe8ff', art: 'pike' },
    maul: { name: 'Hull Maul', desc: 'Slow, crushing arcs that hit above and below you.', cost: 80, dmg: 34, cd: 0.58, range: 74, h: 76, active: 0.16, knock: 560, color: '#ff6a5c', slow: true, art: 'maul' },
    saber: { name: 'Rift Saber', desc: 'Rapid cuts with a fierce critical edge.', cost: 120, dmg: 11, cd: 0.16, range: 54, h: 34, active: 0.08, knock: 150, color: '#d9b8ff', crit: 9, art: 'saber' },
    lance: { name: 'Void Lance', desc: 'Very long reach for thrusts and thrown lances.', cost: 160, dmg: 23, cd: 0.4, range: 128, h: 18, active: 0.12, knock: 320, color: '#7dffcf', art: 'lance' },
  };

  GV.UPGRADES = {
    hp: { name: 'Suit Plating', desc: '+20 max Life', base: 40, step: 30, max: 10 },
    dmg: { name: 'Edge Tuning', desc: '+10% increased Damage', base: 50, step: 35, max: 10 },
    charge: { name: 'Charge Cells', desc: '+20 max Charge, faster regeneration', base: 45, step: 30, max: 10 },
  };

  // The Lantern: permanent ship upgrades bought with memories once you've found your ship.
  GV.SHIP = {
    racks: { name: 'Flask Racks', icon: '⚗', max: 2, base: 120, step: 140, desc: (l) => `+${l} flask charge capacity` },
    medbay: { name: 'Med Bay', icon: '✚', max: 3, base: 100, step: 90, desc: (l) => `Regenerate ${l * 2} Life per second` },
    armory: { name: 'Armory', icon: '⚔', max: 3, base: 110, step: 110, desc: (l) => `${l * 6}% increased Damage` },
    salvage: { name: 'Salvage Bay', icon: '✦', max: 3, base: 90, step: 90, desc: (l) => `${l * 15}% increased Memories found` },
    scanner: { name: 'Deep Scanner', icon: '◉', max: 3, base: 130, step: 120, desc: (l) => `${l * 20}% more gear drops` },
    gemlab: { name: 'Core Lab', icon: '◆', max: 3, base: 100, step: 100, desc: (l) => `${l * 15}% more Star Core experience` },
  };

  GV.ABILITIES = {
    dash: { name: 'Phase Dash', color: '#8fe9ff', glyph: '»', how: '{dash} to dash. Dash through blue void membranes.' },
    grip: { name: 'Grav Grip', color: '#7dffb0', glyph: '⇈', how: 'Hold toward a wall to cling. Jump to kick off it.' },
    hook: { name: 'Grapple Line', color: '#ffd36b', glyph: '⚓', how: 'In the air, press {interact} near a gold anchor ring to zip to it and hang. A Tether Hook that hits a ring does the same.' },
  };
})();
