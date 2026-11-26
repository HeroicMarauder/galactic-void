// Galactic Void — stat definitions, keystones, and the stat aggregator.
// Everything that changes the spaceman (rank, suit upgrades, passive tree, keystones, class)
// is folded into one stats object by GV.computeStats().
(function () {
  const GV = window.GV;

  const F = {
    life: '+# maximum Life', lifePct: '#% increased maximum Life', regen: 'Regenerate # Life per second',
    armour: '+# Armour', armourPct: '#% increased Armour', evasion: '+#% chance to Evade enemy hits',
    block: '+#% chance to Block hits', ward: '+# Void Ward', wardPct: '#% increased Void Ward',
    charge: '+# maximum Charge', chargeRegenPct: '#% increased Charge Regeneration',
    moveSpd: '#% increased Movement Speed', atkSpd: '#% increased Attack Speed', castSpd: '#% increased Cast Speed',
    dmg: '#% increased Damage', meleeDmg: '#% increased Melee Damage', projDmg: '#% increased Projectile Damage',
    spellDmg: '#% increased Spell Damage', areaDmg: '#% increased Area Damage', physDmg: '#% increased Physical Damage',
    fireDmg: '#% increased Fire Damage', coldDmg: '#% increased Cold Damage', lightDmg: '#% increased Lightning Damage',
    voidDmg: '#% increased Void Damage', critChance: '#% increased Critical Hit Chance', critMulti: '+#% Critical Damage Bonus',
    area: '#% increased Area of Effect', projSpd: '#% increased Projectile Speed', pierce: 'Projectiles Pierce # additional enemies',
    cdr: '#% increased Cooldown Recovery Rate', duration: '#% increased Skill Effect Duration',
    leech: '#% of Hit Damage Leeched as Life', lifeOnHit: 'Gain # Life per enemy Hit',
    igniteChance: '+#% chance to Ignite', igniteDmg: '#% increased Ignite Damage', chillEff: '#% increased Chill Effect',
    freezeChance: '+#% chance to Freeze', shockChance: '+#% chance to Shock', corruptChance: '+#% chance to Corrupt',
    knock: '#% increased Knockback', dashCd: '#% faster Phase Dash recharge', costRed: '#% reduced Skill Cost',
    minionDmg: '#% increased Minion Damage', minionSpd: '#% increased Minion Attack Speed', minionDur: '#% increased Minion Duration', minionCount: '+# maximum Minions',
    minionLeech: 'Minions Leech #% of their damage to you as Life', commandEff: '#% increased effect of Minion commands',
    memFind: '#% increased Memories found', stealthDmg: '#% increased Damage from Stealth', airJump: '+# additional air jump',
  };
  function fmt(k, v) {
    let t = F[k] || k + ' #';
    if (v < 0 && t.includes('increased')) { t = t.replace('increased', 'reduced'); v = -v; }
    else if (v < 0 && t.includes('reduced')) { t = t.replace('reduced', 'increased'); v = -v; }
    else if (v < 0 && t.includes('+#')) { t = t.replace('+#', '-#'); v = -v; }
    return t.replace('#', +(+v).toFixed(1));
  }
  GV.STATS = { F, fmt, lines: (st) => Object.keys(st || {}).map((k) => fmt(k, st[k])) };

  GV.KEYSTONES = {
    unbroken: { name: 'Unbroken Suit', lines: ['Take 25% less damage from hits', '15% reduced Movement Speed', 'Cannot Evade enemy hits'] },
    starborn: { name: 'Starborn', lines: ['+1 additional air jump', 'Deal 25% more damage while airborne', 'Deal 10% less damage while grounded'] },
    hollowed: { name: 'Hollowed', lines: ['Maximum Life becomes 1', 'Void Ward is doubled', 'Void Ward recharges 50% faster'] },
    bloodrite: { name: 'Blood Rite', lines: ['Skills cost Life instead of Charge', 'Skill costs are halved', 'You cannot Regenerate Life'] },
    glass: { name: 'Glass Visor', lines: ['Deal 60% more damage', '40% less maximum Life and Void Ward'] },
    overcharge: { name: 'Overcharge', lines: ['Critical Hits deal no extra damage', 'After a Critical Hit, deal 40% more Elemental damage for 6 seconds'] },
    absolute: { name: 'Absolute Zero', lines: ['Your Fire damage is converted to Cold', 'Chilled enemies take 25% more damage from your hits', '+10% chance to Freeze'] },
    legion: { name: 'Machine Legion', lines: ['+2 maximum Minions', 'Minions deal 20% more damage', 'Your own non-minion skills deal 30% less damage'] },
    bastion: { name: 'Bastion', lines: ['+15% chance to Block, and Block can reach 75%', 'Blocking a hit heals 3% of your maximum Life', '15% reduced Movement Speed'] },
    hivebond: { name: 'Hive Bond', lines: ['Minions deal 25% more damage', 'Minions Leech 3% of their damage to you as Life', '20% less maximum Life'] },
  };

  GV.computeStats = function () {
    const d = GV.save.data, u = d.upgrades;
    const acc = {}, ks = {}, tFlags = {}, fx = {}, tm = [];
    const add = (o) => { for (const k in o) acc[k] = (acc[k] || 0) + o[k]; };
    const addFx = (o) => { for (const k in o || {}) fx[k] = (fx[k] || 0) + o[k]; };
    const T = GV.TREE;
    T.migrate && T.migrate(d);
    for (const id of d.passives) {
      const n = T.nodes[id];
      if (!n) continue;
      if (n.sig && n.cls !== d.cls) continue;
      if (n.stats) add(n.stats);
      if (n.keystone) ks[n.keystone] = true;
      if (n.flag) tFlags[n.flag] = true;
      if (n.fx) addFx(n.fx);
      if (n.tm) tm.push(...n.tm);
    }
    if (ks.absolute) add({ freezeChance: 10 });
    if (ks.bastion) add({ block: 15, moveSpd: -15 });
    const cls = GV.CLASSES[d.cls];
    if (cls) add(cls.stats);
    if (GV.items) add(GV.items.stats());
    const sh = (GV.save.main || d).ship || {};
    add({ regen: 2 * (sh.medbay || 0), dmg: 6 * (sh.armory || 0), memFind: 15 * (sh.salvage || 0) });
    if (GV.crewStats) add(GV.crewStats());
    if (GV.shardStats) add(GV.shardStats());
    const ascC = GV.asc ? GV.asc.collect() : { stats: {}, flags: {} };
    add(ascC.stats);
    if (GV.legacy) add(GV.legacy.echoStats());
    if (GV.raceStats) add(GV.raceStats());
    Object.assign(ascC.flags, tFlags);
    addFx(ascC.fx); if (ascC.tm) tm.push(...ascC.tm);
    const w = GV.equippedWeapon(d);
    if (w.block) add({ block: w.block });
    if (w.shield) add({ armour: w.shield.armour || 0, moveSpd: -(w.shield.slowMove || 0) });
    if (w.spell) add({ spellDmg: w.spell });
    if (w.leech) add({ leech: w.leech });
    if (w.cold) add({ coldDmg: w.cold });
    const setS = GV.setState(d);
    add(setS.stats);
    const g = (k) => acc[k] || 0;
    const lvl = d.level;
    const s = { ks, raw: acc, asc: ascC.flags, setFx: setS.flags, sets: setS, fx, tm };
    let life = (100 + 10 * (lvl - 1) + 20 * u.hp + g('life')) * (1 + g('lifePct') / 100);
    let ward = (g('ward')) * (1 + g('wardPct') / 100);
    if (ks.glass) { life *= 0.6; ward *= 0.6; }
    if (ks.hivebond) life *= 0.8;
    if (ks.hollowed) { life = 1; ward *= 2; }
    s.maxLife = Math.max(1, Math.round(life));
    s.maxWard = Math.max(0, Math.round(ward));
    s.wardRecharge = (ks.hollowed ? 0.45 : 0.3) * (ascC.flags.fastWard ? 1.5 : 1);
    s.regen = ks.bloodrite ? 0 : g('regen');
    s.maxCharge = Math.max(20, Math.round(100 + 20 * u.charge + g('charge')));
    s.chargeRegen = (9 + 2.5 * u.charge) * (1 + g('chargeRegenPct') / 100);
    s.armour = Math.max(0, g('armour') * (1 + g('armourPct') / 100));
    s.evasion = ks.unbroken ? 0 : Math.min(60, g('evasion'));
    s.block = Math.min(ks.bastion ? 75 : 60, g('block'));
    s.moveMul = Math.max(0.5, Math.min(1.3, 1 + (g('moveSpd') - (ks.unbroken ? 15 : 0)) / 100)); // movement tops out at +30%
    const soft = (v) => (v <= 40 ? v : 40 + (v - 40) * 0.5); // beyond +40%, speed counts half
    s.atkSpd = soft(g('atkSpd')); s.castSpd = soft(g('castSpd'));
    s.inc = {
      all: g('dmg') + 3 * (lvl - 1) + 10 * u.dmg, melee: g('meleeDmg'), proj: g('projDmg'), spell: g('spellDmg'), area: g('areaDmg'),
      minion: g('minionDmg'), phys: g('physDmg'), fire: g('fireDmg'), cold: g('coldDmg'), light: g('lightDmg'), void: g('voidDmg'),
    };
    s.more = ks.glass ? 1.6 : 1;
    s.critInc = g('critChance'); s.critMulti = g('critMulti');
    s.area = g('area'); s.projSpd = g('projSpd'); s.pierce = g('pierce'); s.cdr = g('cdr'); s.duration = g('duration');
    s.leech = g('leech'); s.lifeOnHit = g('lifeOnHit');
    s.ail = { ignite: g('igniteChance'), freeze: g('freezeChance'), shock: g('shockChance'), corrupt: g('corruptChance') };
    s.igniteDmg = g('igniteDmg'); s.chillEff = g('chillEff'); s.knock = g('knock'); s.dashCd = g('dashCd');
    s.costRed = Math.min(60, g('costRed')); s.memFind = g('memFind'); s.stealthDmg = g('stealthDmg');
    s.airJumps = 1 + (ks.starborn ? 1 : 0) + g('airJump');
    s.minionSpd = g('minionSpd'); s.minionDur = g('minionDur'); s.minionCount = g('minionCount') + (ks.legion ? 2 : 0);
    s.minionLeech = g('minionLeech') + (ks.hivebond ? 3 : 0); s.commandEff = g('commandEff');
    return s;
  };
})();
