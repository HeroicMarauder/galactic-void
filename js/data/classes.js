// Galactic Void — starting classes. Each has a weapon, a look, starting gems and a starting
// point on the passive tree.
(function () {
  const GV = window.GV;
  GV.CLASSES = {
    ranger: {
      name: 'Space Ranger',
      tag: 'Guns, daggers and stealth',
      desc: 'An ion pistol in one hand and a void-dagger in the other. Strikes from the dark, then vanishes again.',
      weapon: 'ionpistol', offhand: 'voiddagger', start: 'ranger', color: '#7dffcf', kit: { helm: 'visor', suit: 'cloak', boots: 'mag' },
      look: { cloak: '#1d2f2c', visor: '#7dffcf', glow: 'rgba(120,255,210,0.35)' },
      stats: { evasion: 8, moveSpd: 6, critChance: 24 },
      bar: [['ionshot', 2], ['backstab', 1], ['cloak', 1], ['shadowstep', 1]],
      supports: ['quick', 'keen'],
      treeHint: 'Starts on the Drift side of the tree: speed, projectiles, criticals, evasion.',
    },
    knight: {
      name: 'Space Knight',
      tag: 'Huge laser sword, whirlwind, charges',
      desc: 'A Lumen Greatblade taller than he is. Spins through crowds and charges through whatever is left.',
      weapon: 'greatblade', start: 'knight', color: '#8fe9ff', kit: { helm: 'dome', suit: 'plate', boots: 'greave' },
      look: { cloak: '#252a3b', visor: '#8fe9ff', glow: 'rgba(120,225,255,0.35)' },
      stats: { life: 20, meleeDmg: 18, armour: 30 },
      bar: [['strike', 2], ['whirl', 2], ['lcharge', 1], ['patch', 1]],
      supports: ['impact', 'siphon'],
      treeHint: 'Starts on the Hull side of the tree: life, armour, melee and area.',
    },
    paladin: {
      name: 'Space Paladin',
      tag: 'Mace and shield, shield charge, area spells',
      desc: 'Star-forged mace, Aegis shield, and rites that burn the ground. Holds the line and lights it on fire.',
      weapon: 'starmace', offhand: 'aegis', start: 'paladin', color: '#ffd36b', kit: { helm: 'crest', suit: 'plate', boots: 'std' },
      look: { cloak: '#3a2f1f', visor: '#ffd36b', glow: 'rgba(255,210,110,0.35)', suit: '#e6dcc4' },
      stats: { block: 10, ward: 20, spellDmg: 15, meleeDmg: 12 },
      bar: [['strike', 1], ['shcharge', 1], ['nova', 2], ['sanct', 1]],
      supports: ['expanse', 'ember'],
      treeHint: 'Starts between Hull and Psyche: block, void ward, spells and fire.',
    },
    engineer: {
      name: 'Void Engineer',
      tag: 'Turrets, drones and an arc wrench',
      desc: 'Rebuilt the Lantern\'s reactor with a wrench and a bad attitude. Lets the machines do the fighting.',
      weapon: 'arcwrench', start: 'engineer', color: '#ffb347', kit: { helm: 'visor', suit: 'rig', boots: 'mag' },
      look: { cloak: '#2d2a1f', visor: '#ffb347', glow: 'rgba(255,180,70,0.35)', suit: '#d9d0bd' },
      stats: { minionDmg: 20, armour: 20, lightDmg: 10 },
      bar: [['strike', 2], ['turret', 2], ['echoes', 1], ['spark', 1]],
      supports: ['swarm', 'might'],
      treeHint: 'Starts between Drift and Psyche: minions, lightning and gadgets.',
    },
    starcaller: {
      name: 'Starcaller',
      tag: 'Cosmic sorcery, meteors and gravity',
      desc: 'Reads the sky like a book and throws pages of it at things. Fragile, devastating.',
      weapon: 'starfocus', start: 'starcaller', color: '#c9a8ff', kit: { helm: 'halo', suit: 'robe', boots: 'std' },
      look: { cloak: '#241c38', visor: '#c9a8ff', glow: 'rgba(200,170,255,0.4)', suit: '#e9e4f5' },
      stats: { spellDmg: 24, castSpd: 6, ward: 30 },
      bar: [['bolt', 2], ['meteor', 1], ['nova', 1], ['ward', 1]],
      supports: ['expanse', 'chain'],
      treeHint: 'Starts deep in Psyche: spells, void ward and the elements.',
    },
    monk: {
      name: 'Graviton Monk',
      tag: 'Gravity fists, blinding speed',
      desc: 'A graviton knuckle on each fist and no armour to speak of. Hits too fast to be hit back.',
      weapon: 'gravknuckle', offhand: 'gravknuckle', start: 'monk', color: '#9fffe0', kit: { helm: 'crest', suit: 'harness', boots: 'mag' },
      look: { cloak: '#1c2b2a', visor: '#9fffe0', glow: 'rgba(150,255,220,0.35)', suit: '#e4efe9' },
      stats: { atkSpd: 6, evasion: 8, moveSpd: 6 },
      bar: [['strike', 2], ['comet', 1], ['slam', 1], ['howl', 1]],
      supports: ['quick', 'impact'],
      treeHint: 'Starts between Hull and Drift: attack speed, evasion and area.',
    },
    symbiote: {
      name: 'Symbiote',
      tag: 'A living suit that feeds on its enemies',
      desc: 'Something grew into this suit and decided to stay. It is hungry, and it shares.',
      weapon: 'biolash', start: 'symbiote', color: '#ff6a9a', kit: { helm: 'organic', suit: 'carapace', boots: 'greave' },
      look: { cloak: '#2e1520', visor: '#ff6a9a', glow: 'rgba(255,100,150,0.4)', suit: '#e3c9d2' },
      stats: { leech: 2, regen: 3, corruptChance: 10, dmg: 10 },
      bar: [['strike', 2], ['spores', 1], ['bloom', 1], ['patch', 1]],
      supports: ['siphon', 'keen'],
      treeHint: 'Starts between Drift and Hull: life, leech and corruption.',
    },
    lancer: {
      name: 'Cryo Lancer',
      tag: 'Frost lance, thrown spears, a grapple',
      desc: 'The longest reach on the Lantern and the coldest hands. Pins things at the end of a lance, freezes them there, and hooks in for the rest.',
      weapon: 'rimelance', start: 'lancer', color: '#7fb4ff', kit: { helm: 'horned', suit: 'cloak', boots: 'greave' },
      look: { cloak: '#16233d', visor: '#9cc8ff', glow: 'rgba(120,175,255,0.38)', suit: '#dfe8f5' },
      stats: { coldDmg: 20, projDmg: 10, freezeChance: 5 },
      bar: [['strike', 2], ['volley', 1], ['shards', 1], ['hook', 1]],
      supports: ['frost', 'pierce'],
      treeHint: 'Starts between Psyche and the Engineer, by the Cryo Lattice: cold, projectiles and reach.',
    },
  };
  // The look your suit takes: class defaults, overridden by whatever armour you wear.
  GV.kitLook = function (d) {
    const cls = GV.CLASSES[d.cls] || {}, k = Object.assign({}, cls.kit || {});
    const col = {};
    for (const slot of ['helm', 'suit', 'boots']) {
      const it = GV.items && GV.items.get((d.equip || {})[slot]);
      if (it && it.look) { k[slot] = it.look.s; col[slot] = it.look.c; }
    }
    return { helm: k.helm || 'dome', suit: k.suit || 'cloak', boots: k.boots || 'std', c: col };
  };
})();
