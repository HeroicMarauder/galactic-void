// Galactic Void — which build this is, and what changed. The web version also serves this as
// version.json, which open copies of the game check now and then to offer a reload.
window.GV = window.GV || {};
window.GV.BUILD = {
  id: '2026.11.27-8',
  title: 'Dungeons',
  notes: [
    'Dungeons: one big locked maze per run, freshly generated, with climbing shafts between floors, shortcut loops, treasure rooms behind breakable walls and a boss vault in the middle',
    'Find the Red and Blue keycards to get through locked doors, then the Gold one for the vault. Each card is always hidden in the part of the maze you can already reach',
    'Rooms wake up the first time you walk in. Beacons wait past every locked door. The dungeon map in the corner fills in as you explore',
    'Three tiers: Derelict Hulk, Abyssal Vault, and Wyrm\'s Hoard, where Draconis guards the vault',
    'Dungeons pay better than stages: 60% to 100% more experience and memories by tier, far more item drops, the odd Void Conduit, and an extra item in every chest',
    'In a squad only one person needs a key: in couch co-op either player\'s key works, and in online parties the host\'s key brings everyone',
    'Dungeon keys drop from stage bosses (sometimes), Titans (always) and the odd elite. Run one from the war table on the Lantern; clearing a dungeon can drop keys for the next tier. If you\'ve cleared the first system, a free Derelict key is waiting',
      'Fixed: starting any stage in couch co-op with no controller connected crashed the game',
      'Loot cards: a card slides in when you pick up Stellar, Nova, Unique or Set gear, exotic weapons and pieces, or a dungeon key',
  ],
};
