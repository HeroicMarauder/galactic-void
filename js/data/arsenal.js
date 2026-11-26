// Galactic Void — the Arsenal. Five rarity tiers with space names, one-handed / two-handed /
// off-hand weapons (dual wielding and shields), epic armour and weapon sets with 2/3/4-piece
// bonuses, and the look each piece gives your suit.
(function () {
  const GV = window.GV;

  // ---------- rarity ----------
  // Internal keys stay stable for old saves: normal, magic, rare, nova, unique.
  GV.RARITY = {
    normal: { name: 'Salvaged', color: '#aab2c2', value: 0.6 },
    magic: { name: 'Calibrated', color: '#7dffb0', value: 1 },
    rare: { name: 'Stellar', color: '#6fb8ff', value: 2.2 },
    nova: { name: 'Nova', color: '#c38bff', value: 4 },
    unique: { name: 'Singularity', color: '#ff9a4a', value: 6 },
  };
  GV.items.color = (it) => (it.set && GV.SETS[it.set] ? GV.SETS[it.set].color : (GV.RARITY[it.rarity] || GV.RARITY.magic).color);
  GV.items.value = (it) => Math.round(4 * it.tier * (GV.RARITY[it.rarity] || GV.RARITY.magic).value);
  GV.items.rarityName = (it) => (it.set ? `Singularity · ${GV.SETS[it.set].name} set` : (GV.RARITY[it.rarity] || GV.RARITY.magic).name);

  // Rolling: Salvaged and Calibrated are common, Stellar less so, Nova rare (five rolls plus one
  // supercharged "nova" modifier). Bosses never drop junk.
  const roll0 = GV.items.roll;
  GV.items.roll = function (tier, opts = {}) {
    const it = roll0.call(this, tier, opts);
    if (it.rarity === 'unique') return it;
    const r = Math.random(), boss = !!opts.boss;
    if (it.rarity === 'magic' && !boss && r < 0.42) {
      // Salvaged: a single modest modifier
      const k = Object.keys(it.mods)[0];
      it.mods = { [k]: Math.max(1, Math.round(it.mods[k] * 0.7)) };
      it.rarity = 'normal'; it.name = `Salvaged ${it.base}`;
    } else if (it.rarity === 'rare' && Math.random() < ((boss ? 0.09 : 0.035) + tier * 0.01) * (GV.legacy ? GV.legacy.rar() : 1)) {
      // Nova: fill to five modifiers, then supercharge one
      let guard = 0;
      while (Object.keys(it.mods).length < 5 && guard++ < 10) { const m = GV.items.rollMod(it.slot, it.tier, it.mods); if (m) it.mods[m[0]] = m[1]; }
      const ks = Object.keys(it.mods), nk = ks[Math.floor(Math.random() * ks.length)];
      it.mods[nk] = Math.round(it.mods[nk] * 1.6 * 10) / 10; it.novaMod = nk;
      it.rarity = 'nova'; it.name = 'Nova ' + it.name;
    }
    it.look = GV.items.lookFor(it);
    return it;
  };

  // ---------- armour looks ----------
  // Every helm, suit and boots piece changes how your spaceman looks.
  GV.LOOKS = {
    helm: ['dome', 'visor', 'crest', 'horned', 'halo', 'mask', 'organic'],
    suit: ['cloak', 'plate', 'robe', 'harness', 'carapace', 'rig'],
    boots: ['std', 'mag', 'greave'],
  };
  const TIER_LOOK = { helm: ['dome', 'visor', 'crest'], suit: ['cloak', 'plate', 'plate'], boots: ['std', 'mag', 'greave'] };
  GV.items.lookFor = function (it) {
    if (!TIER_LOOK[it.slot]) return null;
    if (it.set && GV.SETS[it.set]) return { s: GV.SETS[it.set].look[it.slot], c: GV.SETS[it.set].color };
    const pool = it.rarity === 'nova' || it.rarity === 'unique' ? GV.LOOKS[it.slot] : TIER_LOOK[it.slot].slice(0, it.tier + 1);
    const s = pool[(it.uid * 7 + it.tier) % pool.length];
    return { s, c: GV.items.color(it) };
  };

  // ---------- weapons: hands ----------
  // one: can be dual-wielded or paired with a shield. two: both hands. off: shields only.
  const W = GV.WEAPONS;
  const HAND = { greatblade: 'two', maul: 'two', lance: 'two', pike: 'two', saber: 'one', mawcleaver: 'two', titanbreaker: 'two', horizonlance: 'two', requiem: 'one', seraphblade: 'one', secondhand: 'one' };
  for (const k in HAND) if (W[k]) W[k].hand = HAND[k];
  Object.assign(W, {
    // the old paired kits are split into their two halves
    ionpistol: { name: 'Ion Pistol', hand: 'one', desc: 'One-handed. Quick ion shots.', cost: 60, dmg: 14, cd: 0.22, range: 52, h: 26, active: 0.09, knock: 160, color: '#7dffcf', art: 'pistol' },
    voiddagger: { name: 'Void Dagger', hand: 'one', desc: 'One-handed. Short, fast and vicious from stealth.', cost: 50, dmg: 12.5, cd: 0.17, range: 44, h: 24, active: 0.07, knock: 130, color: '#9fffe8', crit: 10, art: 'dagger' },
    starmace: { name: 'Star Mace', hand: 'one', desc: 'One-handed. Solid, steady blows.', cost: 60, dmg: 21, cd: 0.36, range: 70, h: 48, active: 0.12, knock: 300, color: '#ffd36b', art: 'mace' },
    aegis: { name: 'Aegis Shield', hand: 'off', desc: 'Off-hand shield. Blocks 20% of hits, +40 armour.', cost: 70, block: 20, armour: 40, color: '#ffd36b', art: 'shield' },
    bulwark: { name: 'Hull Bulwark', hand: 'off', desc: 'Off-hand tower shield. Blocks 28% of hits, +90 armour, 6% slower.', cost: 140, block: 28, armour: 90, slowMove: 6, color: '#9fb4d8', art: 'shield' },
    // the new classes' kits
    arcwrench: { name: 'Arc Wrench', hand: 'one', desc: 'Engineer kit. One-handed. Every swing arcs current into the target.', cost: 80, dmg: 15.2, cd: 0.32, range: 66, h: 40, active: 0.11, knock: 260, color: '#ffb347', art: 'wrench' },
    starfocus: { name: 'Star Focus', hand: 'two', desc: 'Starcaller kit. A staff that bends starlight. Weak blows, but +35% spell damage.', cost: 80, dmg: 10, cd: 0.34, range: 74, h: 40, active: 0.1, knock: 220, color: '#c9a8ff', art: 'staff', spell: 35 },
    gravknuckle: { name: 'Graviton Knuckle', hand: 'one', desc: 'Monk kit. One-handed. Wear one on each fist.', cost: 60, dmg: 7.5, cd: 0.13, range: 54, h: 30, active: 0.07, knock: 200, color: '#9fffe0', art: 'fist' },
    biolash: { name: 'Bio-Lash', hand: 'two', desc: 'Symbiote kit. A living whip with enormous reach. Hits feed you.', cost: 80, dmg: 25, cd: 0.4, range: 150, h: 20, active: 0.13, knock: 260, color: '#ff6a9a', art: 'whip', leech: 1.5 },
    rimelance: { name: 'Rime Lance', hand: 'two', desc: 'Cryo Lancer kit. The longest reach of any weapon, forged cold. +20% Cold Damage.', cost: 80, dmg: 22, cd: 0.38, range: 136, h: 18, active: 0.12, knock: 300, color: '#9cc8ff', art: 'lance', cold: 20 },
    // weapon sets
    sol: { name: 'Sol', set: 'twinsuns', hand: 'one', desc: 'Twin Suns set. A blade of white fire.', cost: 0, dmg: 15, cd: 0.18, range: 60, h: 34, active: 0.08, knock: 170, color: '#ffcf6a', art: 'saber' },
    luna: { name: 'Luna', set: 'twinsuns', hand: 'one', desc: 'Twin Suns set. A blade of cold light.', cost: 0, dmg: 15, cd: 0.18, range: 60, h: 34, active: 0.08, knock: 170, color: '#9fd6ff', art: 'saber' },
    shepherdL: { name: 'Shepherd\'s Left', set: 'shepherd', hand: 'one', desc: 'Shepherd\'s Pair set. The left of two old service pistols.', cost: 0, dmg: 14, cd: 0.2, range: 54, h: 26, active: 0.08, knock: 160, color: '#e8d7b0', art: 'pistol' },
    shepherdR: { name: 'Shepherd\'s Right', set: 'shepherd', hand: 'one', desc: 'Shepherd\'s Pair set. The right of two old service pistols.', cost: 0, dmg: 14, cd: 0.2, range: 54, h: 26, active: 0.08, knock: 160, color: '#e8d7b0', art: 'pistol' },
    oathmace: { name: 'Warden\'s Oath', set: 'oath', hand: 'one', desc: 'Oathkeeper set. The Warden\'s own mace.', cost: 0, dmg: 24, cd: 0.38, range: 72, h: 50, active: 0.12, knock: 340, color: '#c9a8ff', art: 'mace' },
    oathshield: { name: 'Warden\'s Vigil', set: 'oath', hand: 'off', desc: 'Oathkeeper set. The shield he held the line with.', cost: 0, block: 24, armour: 70, color: '#c9a8ff', art: 'shield' },
  });
  for (const k in W) if (!W[k].hand) W[k].hand = W[k].art === 'pistol' || W[k].art === 'saber' ? 'one' : 'two';
  W.ionpair.hand = 'two'; W.ionpair.legacy = true; W.macesh.hand = 'two'; W.macesh.legacy = true;
  GV.SET_WEAPONS = ['sol', 'luna', 'shepherdL', 'shepherdR', 'oathmace', 'oathshield'];

  // The weapon you actually fight with: main hand, plus whatever is in the off hand.
  GV.equippedWeapon = function (d) {
    const main = W[d.weapon] || W.pike, off = d.offhand && W[d.offhand];
    let w = Object.assign({}, main, { id: d.weapon });
    if (main.hand === 'two' || !off) {
      if (main.hand === 'one' && !off) w.crit = (w.crit || 5) + 4; // a free hand steadies the aim
      if (main.hand === 'two') { w.dmg = Math.round(w.dmg * 1.1); w.twoHanded = true; }
      return w;
    }
    if (off.hand === 'off') {
      w.block = (w.block || 0) + off.block; w.offArt = 'shield'; w.offColor = off.color; w.shield = off; w.offId = d.offhand;
      return w;
    }
    // dual wielding: faster, blended, and both weapons' effects take turns
    w = Object.assign(w, {
      name: `${main.name} & ${off.name}`, dmg: Math.round((main.dmg + off.dmg) / 2), cd: ((main.cd + off.cd) / 2) * 0.82,
      range: Math.max(main.range, off.range), h: Math.max(main.h, off.h), crit: ((main.crit || 5) + (off.crit || 5)) / 2 + 3,
      dual: true, offArt: off.art, offColor: off.color, fx2: off.fx, offId: d.offhand,
    });
    return w;
  };

  // ---------- sets ----------
  const P = (slot, name) => ({ slot, name });
  GV.SETS = {
    dreadnought: {
      name: 'Dreadnought', color: '#ff8a5a', look: { helm: 'horned', suit: 'plate', boots: 'greave' },
      pieces: [P('helm', 'Dreadnought Visage'), P('suit', 'Dreadnought Plate'), P('boots', 'Dreadnought Greaves'), P('relic', 'Dreadnought Reactor')],
      mods: { helm: { armour: 60, life: 30 }, suit: { armourPct: 30, life: 50 }, boots: { armour: 50, moveSpd: 4 }, relic: { meleeDmg: 20, lifePct: 6 } },
      bonus: { 2: { stats: { armourPct: 25 }, text: '25% increased Armour' }, 3: { stats: { lifePct: 15 }, text: '15% increased maximum Life' }, 4: { flag: 'retaliateNova', text: 'When hit, 25% chance to release a shockwave dealing your weapon damage ×3' } },
    },
    stalker: {
      name: 'Stalker Weave', color: '#7dffcf', look: { helm: 'mask', suit: 'harness', boots: 'mag' },
      pieces: [P('helm', 'Stalker Mask'), P('suit', 'Stalker Weave'), P('boots', 'Stalker Treads'), P('relic', 'Stalker Lens')],
      mods: { helm: { critChance: 30, evasion: 4 }, suit: { evasion: 6, stealthDmg: 30 }, boots: { moveSpd: 10, dashCd: 15 }, relic: { critMulti: 30, projDmg: 15 } },
      bonus: { 2: { stats: { critChance: 40 }, text: '40% increased Critical Chance' }, 3: { stats: { moveSpd: 10 }, text: '10% increased Movement Speed' }, 4: { flag: 'dashAmbush', text: 'For 1.5s after a dash, your hits deal double damage' } },
    },
    solar: {
      name: 'Solar Choir', color: '#ffe9a8', look: { helm: 'halo', suit: 'robe', boots: 'std' },
      pieces: [P('helm', 'Choir Halo'), P('suit', 'Choir Vestments'), P('boots', 'Choir Sandals'), P('relic', 'Choir Bell')],
      mods: { helm: { spellDmg: 20, ward: 30 }, suit: { castSpd: 10, wardPct: 25 }, boots: { moveSpd: 6, chargeRegenPct: 20 }, relic: { spellDmg: 25, area: 10 } },
      bonus: { 2: { stats: { spellDmg: 25 }, text: '25% increased Spell Damage' }, 3: { stats: { castSpd: 12 }, text: '12% increased Cast Speed' }, 4: { flag: 'solarPillar', text: 'Every fifth spell calls a pillar of light on the nearest enemy' } },
    },
    graviton: {
      name: 'Graviton', color: '#9fffe0', look: { helm: 'crest', suit: 'harness', boots: 'mag' },
      pieces: [P('helm', 'Graviton Crest'), P('suit', 'Graviton Wraps'), P('boots', 'Graviton Soles'), P('relic', 'Graviton Pearl')],
      mods: { helm: { atkSpd: 8, critChance: 20 }, suit: { atkSpd: 8, evasion: 5 }, boots: { moveSpd: 8, airJump: 1 }, relic: { area: 15, physDmg: 20 } },
      bonus: { 2: { stats: { atkSpd: 12 }, text: '12% increased Attack Speed' }, 3: { stats: { area: 20 }, text: '20% increased Area of Effect' }, 4: { flag: 'gravPull', text: 'Your hits drag enemies toward you' } },
    },
    symbiont: {
      name: 'Symbiont', color: '#ff6a9a', look: { helm: 'organic', suit: 'carapace', boots: 'greave' },
      pieces: [P('helm', 'Symbiont Crown'), P('suit', 'Symbiont Carapace'), P('boots', 'Symbiont Roots'), P('relic', 'Symbiont Heart')],
      mods: { helm: { leech: 1, life: 40 }, suit: { regen: 4, lifePct: 10 }, boots: { moveSpd: 6, life: 30 }, relic: { leech: 1.5, corruptChance: 15 } },
      bonus: { 2: { stats: { leech: 1 }, text: '1% of damage Leeched as Life' }, 3: { stats: { regen: 6 }, text: 'Regenerate 6 Life per second' }, 4: { flag: 'feast', text: 'Kills heal you for 3% of maximum Life' } },
    },
    // weapon sets: both halves equipped (main + off hand)
    twinsuns: { name: 'Twin Suns', color: '#ffcf6a', weapons: ['sol', 'luna'], bonus: { 2: { stats: { fireDmg: 30, coldDmg: 30, igniteChance: 15, freezeChance: 8 }, text: '30% more Fire and Cold damage, 15% Ignite and 8% Freeze chance' } } },
    shepherd: { name: 'Shepherd\'s Pair', color: '#e8d7b0', weapons: ['shepherdL', 'shepherdR'], bonus: { 2: { stats: { projDmg: 35, atkSpd: 15, pierce: 1 }, text: '35% increased Projectile damage, 15% Attack Speed, +1 Pierce' } } },
    oath: { name: 'Oathkeeper', color: '#c9a8ff', weapons: ['oathmace', 'oathshield'], bonus: { 2: { stats: { block: 12, armourPct: 30 }, flag: 'retaliateNova', text: '+12% Block, 30% increased Armour, shockwaves when hit' } } },
  };
  GV.ARMOUR_SETS = ['dreadnought', 'stalker', 'solar', 'graviton', 'symbiont'];

  GV.items.makeSet = function (setId, slot, tier) {
    const S = GV.SETS[setId], pc = S.pieces.find((p) => p.slot === slot) || S.pieces[0];
    const tm = { 1: 0.8, 2: 1, 3: 1.25 }[tier || 2];
    const mods = {};
    for (const k in S.mods[pc.slot]) mods[k] = Math.round(S.mods[pc.slot][k] * tm * 10) / 10;
    const it = { uid: GV.save.data.uid++, slot: pc.slot, rarity: 'unique', set: setId, tier: tier || 2, name: pc.name, base: GV.SLOTS[pc.slot].bases[(tier || 2) - 1], mods, flavor: `${S.name} set` };
    it.look = GV.items.lookFor(it);
    return it;
  };
  GV.items.randomSet = function (tier) {
    const id = GV.ARMOUR_SETS[Math.floor(Math.random() * GV.ARMOUR_SETS.length)];
    const slot = ['helm', 'suit', 'boots', 'relic'][Math.floor(Math.random() * 4)];
    return GV.items.makeSet(id, slot, tier);
  };

  // Which set pieces are worn, and what they grant.
  GV.setState = function (d) {
    const count = {};
    for (const it of GV.items.equipped()) if (it.set) count[it.set] = (count[it.set] || 0) + 1;
    for (const k of [d.weapon, d.offhand]) { const w = k && W[k]; if (w && w.set) count[w.set] = (count[w.set] || 0) + 1; }
    const stats = {}, flags = {}, active = [];
    for (const id in count) {
      const S = GV.SETS[id]; if (!S) continue;
      for (const n in S.bonus) if (count[id] >= +n) {
        const b = S.bonus[n]; active.push({ id, n: +n, text: b.text });
        if (b.stats) for (const k in b.stats) stats[k] = (stats[k] || 0) + b.stats[k];
        if (b.flag) flags[b.flag] = true;
      }
    }
    return { count, stats, flags, active };
  };

  // ---------- old saves ----------
  GV.migrateArsenal = function (d) {
    if (!d || d.arsenalV >= 1) return;
    d.weapons = d.weapons || [];
    if (d.weapons.includes('ionpair')) d.weapons.push('ionpistol', 'voiddagger');
    if (d.weapons.includes('macesh')) d.weapons.push('starmace', 'aegis');
    if (d.weapon === 'ionpair') { d.weapon = 'ionpistol'; d.offhand = 'voiddagger'; }
    if (d.weapon === 'macesh') { d.weapon = 'starmace'; d.offhand = 'aegis'; }
    d.weapons = [...new Set(d.weapons)];
    for (const it of d.items || []) if (!it.look) it.look = GV.items.lookFor(it);
    d.arsenalV = 1;
  };
})();
