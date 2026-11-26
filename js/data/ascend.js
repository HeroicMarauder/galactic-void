// Galactic Void — Ascendancies. After the Hollow Warden falls, each class chooses one of two
// subclasses. Each has four nodes (2 points each): two open at once, two need one of those first.
// Nodes give stats and/or flags (`asc.<flag>`) that the combat code checks.
(function () {
  const GV = window.GV;

  GV.ASCEND = {
    knight: [
      { id: 'vanguard', name: 'Vanguard', color: '#ff9a4a', tag: 'Charges that set the ground on fire',
        nodes: [
          { id: 'wake', name: 'Burning Wake', tier: 1, flag: 'burnTrail', lines: ['Your charges leave a trail of burning ground'] },
          { id: 'advance', name: 'Bulwark Advance', tier: 1, flag: 'chargeGuard', stats: { armourPct: 25 }, lines: ['25% increased Armour', 'Take 15% less damage for 3s after a charge'] },
          { id: 'momentum', name: 'Relentless', tier: 2, flag: 'moveCdr', stats: { moveSpd: 15 }, lines: ['Movement skills recharge 35% faster', '15% increased Movement Speed'] },
          { id: 'unstop', name: 'Unstoppable', tier: 2, flag: 'noKnock', stats: { life: 40 }, lines: ['You cannot be knocked back', '+40 maximum Life'] },
        ] },
      { id: 'bladestorm', name: 'Bladestorm', color: '#8fe9ff', tag: 'Whirlwind that pulls the crowd in',
        nodes: [
          { id: 'eye', name: 'Eye of the Storm', tier: 1, flag: 'whirlPull', lines: ['Whirlwind drags nearby enemies toward you'] },
          { id: 'razor', name: 'Razor Wind', tier: 1, flag: 'whirlArea', stats: { areaDmg: 20 }, lines: ['Channelling skills have 30% increased Area', '20% increased Area Damage'] },
          { id: 'dance', name: 'Blade Dance', tier: 2, flag: 'bladeDance', stats: { atkSpd: 10 }, lines: ['10% increased Attack Speed', 'Kills grant 5% more Attack Speed for 4s, up to 5 times'] },
          { id: 'endless', name: 'Endless Spin', tier: 2, flag: 'cheapSpin', lines: ['Channelling skills cost 40% less', 'Channelling skills Leech 3% of damage as Life'] },
        ] },
    ],
    ranger: [
      { id: 'ghost', name: 'Ghost', color: '#7dffcf', tag: 'Never seen, never stopped',
        nodes: [
          { id: 'phantom', name: 'Phantom Strike', tier: 1, stats: { stealthDmg: 60 }, lines: ['60% increased Damage from Stealth'] },
          { id: 'fade', name: 'Fade', tier: 1, flag: 'fade', stats: { evasion: 10 }, lines: ['Stealth skills recharge 40% faster', '+10% chance to Evade'] },
          { id: 'linger', name: 'Lingering Shadow', tier: 2, flag: 'linger', lines: ['Kills grant 1.2s of Stealth (once every 3s)'] },
          { id: 'haunt', name: 'Haunt', tier: 2, flag: 'haunt', lines: ['Hits from Stealth burst in void, hitting enemies around the target for 60% of the damage'] },
        ] },
      { id: 'gunslinger', name: 'Gunslinger', color: '#ffd36b', tag: 'More bullets, every one a ricochet',
        nodes: [
          { id: 'ricochet', name: 'Ricochet', tier: 1, flag: 'ricochet', lines: ['Projectiles Chain +1 time'] },
          { id: 'hollow', name: 'Hollow Points', tier: 1, stats: { projDmg: 30, critMulti: 30 }, lines: ['30% increased Projectile Damage', '+30% Critical Damage Bonus'] },
          { id: 'fan', name: 'Fan the Hammer', tier: 2, flag: 'fan', lines: ['Projectile Attacks fire +1 Projectile'] },
          { id: 'quick', name: 'Quickdraw', tier: 2, flag: 'quickdraw', stats: { atkSpd: 15 }, lines: ['15% increased Attack Speed', 'Your first hit after a Phase Dash or Shadow Step is a Critical Hit'] },
        ] },
    ],
    paladin: [
      { id: 'templar', name: 'Templar', color: '#ffd36b', tag: 'Holy ground and radiant wards',
        nodes: [
          { id: 'conse', name: 'Consecration', tier: 1, flag: 'consecrate', lines: ['Ground skills have 40% increased Area', 'Sanctified Ground heals 5% Life per second'] },
          { id: 'divine', name: 'Divine Ward', tier: 1, flag: 'fastWard', stats: { ward: 30, wardPct: 40 }, lines: ['+30 Void Ward, 40% increased Void Ward', 'Void Ward recharges 50% faster'] },
          { id: 'radiance', name: 'Radiance', tier: 2, flag: 'radiance', stats: { spellDmg: 25 }, lines: ['25% increased Spell Damage', 'Area Spells have 15% increased Area'] },
          { id: 'martyr', name: 'Martyrdom', tier: 2, flag: 'martyr', lines: ['When hit, 25% chance to release a burst of holy fire'] },
        ] },
      { id: 'crusader', name: 'Crusader', color: '#ff8a98', tag: 'Shield first, then everything else',
        nodes: [
          { id: 'bulwark', name: 'Retribution', tier: 1, flag: 'retaliate', stats: { block: 12 }, lines: ['+12% chance to Block', 'Blocking a hit slams the enemies around you'] },
          { id: 'bash', name: 'Shield Bash', tier: 1, flag: 'bash', lines: ['Shield Charge deals 50% more damage', 'Shield Charge stuns for twice as long'] },
          { id: 'zeal', name: 'Zeal', tier: 2, flag: 'zeal', lines: ['Melee hits grant Zeal: 2% more damage each, up to 15'] },
          { id: 'last', name: 'Last Stand', tier: 2, flag: 'lastStand', lines: ['Below 35% Life: take 30% less damage and deal 30% more'] },
        ] },
    ],
  };

  const d = () => GV.save.data;
  // ---- each subclass grows its own tree from its four signature notables, a pool of stats for
  // the small nodes, and two capstones (you may take only one) ----
  //
  //            [cap X]        [cap Y]
  //        a3 ────── b3 ────── c3
  //        a2        b2        c2
  //        a1        b1        c1
  //                [start]
  const LAYOUT = [
    ['a1', 'small', -1, 1, ['start'], 0], ['b1', 'notable', 0, 1, ['start'], 0], ['c1', 'small', 1, 1, ['start'], 1],
    ['a2', 'notable', -1, 2, ['a1'], 1], ['b2', 'small', 0, 2, ['b1'], 2], ['c2', 'notable', 1, 2, ['c1'], 2],
    ['a3', 'small', -1, 3, ['a2'], 1], ['b3', 'notable', 0, 3, ['b2'], 3], ['c3', 'small', 1, 3, ['c2'], 0],
    ['X', 'capstone', -0.5, 4.15, ['a3', 'b3'], 0], ['Y', 'capstone', 0.5, 4.15, ['b3', 'c3'], 1],
  ];
  const trees = {};
  function treeOf(sub) {
    if (trees[sub.id]) return trees[sub.id];
    const X = GV.ASC_EXTRA[sub.id] || {}, pool = X.pool || [{ dmg: 8 }, { life: 15 }, { dmg: 6, life: 10 }];
    const out = [{ id: 'start', kind: 'start', name: sub.name, x: 0, y: 0, req: [], cost: 0, lines: [sub.tag] }];
    for (const [id, kind, x, y, req, k] of LAYOUT) {
      let n;
      if (kind === 'small') n = { name: X.smallName || sub.name + ' Discipline', stats: pool[k % pool.length] };
      else if (kind === 'notable') n = Object.assign({}, sub.nodes[k]);
      else n = Object.assign({}, (X.caps || [])[k] || { name: 'Apex', stats: { dmg: 20 }, lines: [] });
      n = Object.assign(n, { id, kind, x, y, req, cost: kind === 'capstone' ? 2 : 1 });
      n.lines = [...(n.lines || []).filter((l) => kind !== 'small'), ...(kind === 'small' || !n.lines || !n.lines.length ? GV.STATS.lines(n.stats || {}) : [])];
      if (kind === 'capstone') n.lines = [...(n.lines || [])];
      out.push(n);
    }
    return (trees[sub.id] = out);
  }
  GV.asc = {
    VER: 2,
    unlocked() { return !!d().cleared['0-2'] && !!d().cls; },
    choices() { return GV.ASCEND[d().cls] || []; },
    current() { const a = d().asc; return a && a.sub ? this.choices().find((c) => c.id === a.sub) : null; },
    tree(sub) { sub = sub || this.current(); return sub ? treeOf(sub) : []; },
    node(id) { return this.tree().find((n) => n.id === id) || null; },
    CAP: 10,
    total() {
      if (!this.unlocked()) return 0;
      let n = 4;
      for (let s = 1; s < 10; s++) if (d().cleared[`${s}-2`]) n += 2;
      return Math.min(this.CAP, n);
    },
    // Old (first-edition) ascendancy picks are refunded for free; your subclass stays.
    migrate() {
      const a = d().asc;
      if (!a || d().ascVer === this.VER) return;
      if (a.nodes && a.nodes.length) a.note = true;
      a.nodes = []; d().ascVer = this.VER;
    },
    spent() { this.migrate(); return (d().asc.nodes || []).reduce((t, id) => t + ((this.node(id) || {}).cost || 0), 0); },
    points() { return this.total() - this.spent(); },
    has(id) { return id === 'start' || (d().asc.nodes || []).includes(id); },
    capTaken() { return (d().asc.nodes || []).some((id) => (this.node(id) || {}).kind === 'capstone'); },
    why(n) {
      if (this.has(n.id)) return 'taken';
      if (!n.req.some((r) => this.has(r))) return 'locked';
      if (n.kind === 'capstone' && this.capTaken()) return 'other';
      if (this.points() < n.cost) return 'points';
      return 'ok';
    },
    canTake(n) { return this.why(n) === 'ok'; },
    choose(id) { d().asc = { sub: id, nodes: [] }; d().ascVer = this.VER; GV.save.write(); },
    take(id) {
      const n = this.node(id);
      if (!n || !this.canTake(n)) return false;
      d().asc.nodes.push(id); GV.save.write(); return true;
    },
    respec() { const c = this.respecCost(); if (d().memories < c) return false; d().memories -= c; d().asc.nodes = []; GV.save.write(); return true; },
    respecCost() { return 30 + 10 * this.spent(); },
    // Stats, flags, fx and tag modifiers for the stat aggregator.
    collect() {
      const out = { stats: {}, flags: {}, fx: {}, tm: [] }, sub = this.current();
      if (!sub) return out;
      this.migrate();
      for (const n of this.tree(sub)) {
        if (n.id === 'start' || !this.has(n.id)) continue;
        if (n.flag) for (const f of [].concat(n.flag)) out.flags[f] = true;
        for (const k in n.stats || {}) out.stats[k] = (out.stats[k] || 0) + n.stats[k];
        for (const k in n.fx || {}) out.fx[k] = (out.fx[k] || 0) + n.fx[k];
        if (n.tm) out.tm.push(...n.tm);
      }
      return out;
    },
  };
})();

// Ascendancies for the four space classes.
(function () {
  const GV = window.GV;
  const N = (id, name, tier, stats, lines, flag) => ({ id, name, tier, stats, lines, flag });
  Object.assign(GV.ASCEND, {
    engineer: [
      { id: 'architect', name: 'Architect', color: '#ffb347', tag: 'More machines, better machines',
        nodes: [N('overclock', 'Overclock', 1, { minionDmg: 40 }, ['40% increased Minion Damage']), N('plating', 'Riveted Plating', 1, { armour: 80, armourPct: 20 }, ['+80 Armour', '20% increased Armour']),
          N('foundry', 'Foundry', 2, { minionDmg: 30, cdr: 15 }, ['30% increased Minion Damage', '15% increased Cooldown Recovery']), N('failsafe', 'Failsafe', 2, { life: 60, regen: 5 }, ['+60 maximum Life', 'Regenerate 5 Life per second'], 'lastStand')] },
      { id: 'demolisher', name: 'Demolisher', color: '#ff7a4a', tag: 'Arc, fire and very big bangs',
        nodes: [N('arcweld', 'Arc Weld', 1, { lightDmg: 35, shockChance: 15 }, ['35% increased Lightning Damage', '15% chance to Shock']), N('charges', 'Shaped Charges', 1, { areaDmg: 30, area: 15 }, ['30% increased Area Damage', '15% increased Area']),
          N('chain', 'Chain Reaction', 2, { fireDmg: 30, igniteChance: 20 }, ['30% increased Fire Damage', '20% chance to Ignite'], 'consecrate'), N('blast', 'Blast Doors', 2, { block: 12, life: 40 }, ['+12% Block', '+40 maximum Life'], 'retaliate')] },
    ],
    starcaller: [
      { id: 'astromancer', name: 'Astromancer', color: '#c9a8ff', tag: 'The sky, falling, on purpose',
        nodes: [N('constel', 'Constellation', 1, { spellDmg: 35 }, ['35% increased Spell Damage']), N('orbit', 'Orbital Mind', 1, { castSpd: 15, area: 10 }, ['15% increased Cast Speed', '10% increased Area']),
          N('supernova', 'Supernova', 2, { critChance: 60, critMulti: 40 }, ['60% increased Critical Chance', '+40% Critical Multiplier']), N('aurora', 'Aurora Ward', 2, { ward: 80, wardPct: 30 }, ['+80 Void Ward', '30% increased Void Ward'], 'fastWard')] },
      { id: 'voidcaller', name: 'Voidcaller', color: '#8a6aff', tag: 'Corruption and the things between stars',
        nodes: [N('null', 'Null Psalm', 1, { voidDmg: 40, corruptChance: 15 }, ['40% increased Void Damage', '15% chance to Corrupt']), N('drain', 'Drain the Stars', 1, { leech: 1.5, chargeRegenPct: 25 }, ['1.5% Leech', '25% increased Charge Regeneration']),
          N('horizon', 'Horizon', 2, { duration: 30, area: 20 }, ['30% increased Skill Duration', '20% increased Area']), N('eclipse', 'Eclipse', 2, { spellDmg: 30, cdr: 15 }, ['30% increased Spell Damage', '15% increased Cooldown Recovery'], 'radiance')] },
    ],
    monk: [
      { id: 'gravitic', name: 'Gravitic', color: '#9fffe0', tag: 'Faster than gravity allows',
        nodes: [N('flurry', 'Flurry', 1, { atkSpd: 18 }, ['18% increased Attack Speed']), N('weight', 'Weightless', 1, { moveSpd: 12, airJump: 1 }, ['12% increased Movement Speed', '+1 air jump']),
          N('dance', 'Orbital Dance', 2, { atkSpd: 10 }, ['10% increased Attack Speed', 'Kills grant stacking Attack Speed'], 'bladeDance'), N('center', 'Still Center', 2, { evasion: 12 }, ['+12% chance to Evade', 'You cannot be knocked back'], 'noKnock')] },
      { id: 'ascetic', name: 'Ascetic', color: '#e4efe9', tag: 'Endure, then end it',
        nodes: [N('breath', 'Breath of Stars', 1, { regen: 6, ward: 40 }, ['Regenerate 6 Life per second', '+40 Void Ward']), N('iron', 'Iron Palm', 1, { physDmg: 35, knock: 30 }, ['35% increased Physical Damage', '30% increased Knockback']),
          N('zeal', 'Zeal', 2, { meleeDmg: 20 }, ['20% increased Melee Damage', 'Melee hits build Zeal for more damage'], 'zeal'), N('last', 'Last Breath', 2, { life: 60 }, ['+60 maximum Life', 'Deal more damage at low Life'], 'lastStand')] },
    ],
    symbiote: [
      { id: 'devourer', name: 'Devourer', color: '#ff6a9a', tag: 'It eats. You heal.',
        nodes: [N('maw', 'Maw', 1, { leech: 2, life: 30 }, ['2% Leech', '+30 maximum Life']), N('hide', 'Thick Hide', 1, { lifePct: 15, armour: 40 }, ['15% increased maximum Life', '+40 Armour']),
          N('gorge', 'Gorge', 2, { lifeOnHit: 4, meleeDmg: 25 }, ['4 Life on hit', '25% increased Melee Damage']), N('spines', 'Spines', 2, { armourPct: 30 }, ['30% increased Armour', 'Retaliate against attackers'], 'retaliate')] },
      { id: 'hivemind', name: 'Hivemind', color: '#ffb0ce', tag: 'You are never alone in there',
        nodes: [N('brood', 'Brood', 1, { minionDmg: 40 }, ['40% increased Minion Damage']), N('spore', 'Spore Bloom', 1, { corruptChance: 20, voidDmg: 25 }, ['20% chance to Corrupt', '25% increased Void Damage']),
          N('swarmmind', 'Swarm Mind', 2, { minionDmg: 30, area: 15 }, ['30% increased Minion Damage', '15% increased Area']), N('regrow', 'Regrowth', 2, { regen: 8 }, ['Regenerate 8 Life per second', 'Kills briefly cloak you'], 'linger')] },
    ],
    lancer: [
      { id: 'dragoon', name: 'Dragoon', color: '#7fb4ff', tag: 'All reach, no retreat',
        nodes: [N('longreach', 'Long Reach', 1, { meleeDmg: 20, knock: 30 }, ['20% increased Melee Damage', '30% increased Knockback']), N('tetherm', 'Tether Master', 1, { projDmg: 20 }, ['20% increased Projectile Damage', 'Movement skills recharge 35% faster'], 'moveCdr'),
          N('impale', 'Impale', 2, { critChance: 40, physDmg: 25 }, ['40% increased Critical Hit Chance', '25% increased Physical Damage']), N('anchored', 'Anchored', 2, { life: 50 }, ['+50 maximum Life', 'You cannot be knocked back'], 'noKnock')] },
      { id: 'glacier', name: 'Glacier', color: '#cfe6ff', tag: 'Everything stops where you stand',
        nodes: [N('rime', 'Rime', 1, { coldDmg: 30, chillEff: 20 }, ['30% increased Cold Damage', '20% stronger Chill']), N('shatter', 'Shatterpoint', 1, { freezeChance: 10, critChance: 20 }, ['+10% chance to Freeze', '20% increased Critical Hit Chance']),
          N('permafrost', 'Permafrost', 2, { freezeChance: 10, coldDmg: 25 }, ['+10% chance to Freeze', '25% increased Cold Damage']), N('shell', 'Glacial Shell', 2, { ward: 60, armour: 50 }, ['+60 Void Ward', '+50 Armour'])] },
    ],
  });
})();

// Ascendancy trees: small-node stats and the two capstones (choose one) for every subclass.
(function () {
  const GV = window.GV;
  const C = (name, o, lines) => Object.assign({ name, lines }, o);
  GV.ASC_EXTRA = {
    vanguard: { smallName: 'Vanguard Drill', pool: [{ armour: 40, meleeDmg: 8 }, { life: 25 }, { moveSpd: 4, fireDmg: 10 }, { armourPct: 12 }],
      caps: [C('Juggernaut Charge', { tm: [{ t: 'Movement', more: 1.5, cdr: 30 }], fx: { lessTaken: 8 } }, ['Movement skills deal 50% more damage and recharge 30% faster', 'Take 8% less damage']),
        C('Scorched March', { flag: 'burnTrail', fx: { ignitedMore: 30 }, stats: { fireDmg: 30, igniteChance: 20 } }, ['Your charges leave burning ground', 'Ignited enemies take 30% more damage from your hits', '30% increased Fire Damage, +20% chance to Ignite'])] },
    bladestorm: { smallName: 'Storm Form', pool: [{ atkSpd: 4 }, { areaDmg: 12 }, { meleeDmg: 10 }, { life: 20 }],
      caps: [C('Maelstrom', { tm: [{ t: 'Channelling', more: 1.35, area: 25 }] }, ['Channelling skills deal 35% more damage', 'Channelling skills have 25% increased Area']),
        C('Thousand Cuts', { flag: 'bladeDance', fx: { killCharge: 5 }, stats: { atkSpd: 15 } }, ['15% increased Attack Speed', 'Kills grant stacking Attack Speed', 'Kills restore 5 Charge'])] },
    ghost: { smallName: 'Shadow Craft', pool: [{ stealthDmg: 15 }, { evasion: 3 }, { critChance: 15 }, { moveSpd: 4 }],
      caps: [C('Nightfall', { fx: { stealthMore: 50, dashStealth: 1 } }, ['Hits from Stealth deal 50% more damage', 'Phase Dash grants 1 second of Stealth']),
        C("Assassin's Mark", { fx: { bossMore: 30 }, stats: { critMulti: 40 } }, ['Deal 30% more damage to bosses and Titans', '+40% Critical Damage Bonus'])] },
    gunslinger: { smallName: 'Trigger Discipline', pool: [{ projDmg: 10 }, { atkSpd: 4 }, { critMulti: 10 }, { projSpd: 12 }],
      caps: [C('Bullet Storm', { tm: [{ t: 'Projectile', proj: 2, more: 0.9 }] }, ['Projectile skills fire 2 additional Projectiles', 'Projectile skills deal 10% less damage']),
        C("Executioner's Round", { tm: [{ t: 'Projectile', crit: 80, pierce: 2 }], stats: { critMulti: 30 } }, ['Projectile skills have 80% increased Critical Hit Chance and Pierce 2 more enemies', '+30% Critical Damage Bonus'])] },
    templar: { smallName: 'Templar Vow', pool: [{ ward: 20 }, { spellDmg: 10 }, { area: 6 }, { fireDmg: 10, lightDmg: 10 }],
      caps: [C('Sun Altar', { tm: [{ t: 'Area', more: 1.25 }], fx: { fullLifeMore: 15 } }, ['Area skills deal 25% more damage', 'Deal 15% more damage while above 90% Life']),
        C('Sanctuary', { fx: { lessTaken: 12, killWard: 8 } }, ['Take 12% less damage', 'Kills restore 8 Void Ward'])] },
    crusader: { smallName: 'Crusader Oath', pool: [{ block: 2 }, { meleeDmg: 10 }, { life: 20 }, { armour: 40 }],
      caps: [C('Holy Bulwark', { fx: { blockHeal: 4, blockWard: 20 }, stats: { block: 8 } }, ['+8% chance to Block', 'Blocking restores 4% of your Life and 20 Void Ward']),
        C('Avenger', { flag: 'lastStand', fx: { lowLifeMore: 35 } }, ['Deal 35% more damage below half Life', 'Below 35% Life: take 30% less damage and deal 30% more'])] },
    architect: { smallName: 'Blueprint', pool: [{ minionDmg: 12 }, { minionSpd: 6 }, { minionDur: 10 }, { armour: 40 }],
      caps: [C('Grand Design', { tm: [{ t: 'Minion', minions: 2 }], stats: { minionDmg: 20 } }, ['Minion skills summon 2 more minions', '20% increased Minion Damage']),
        C('Overdrive Core', { tm: [{ t: 'Minion', minionSpd: 40, more: 1.15 }] }, ['Minions attack 40% faster', 'Minion skills deal 15% more damage'])] },
    demolisher: { smallName: 'Blast Training', pool: [{ areaDmg: 12 }, { lightDmg: 10 }, { fireDmg: 10 }, { area: 6 }],
      caps: [C('Payload', { tm: [{ t: 'Area', more: 1.3, area: 20 }] }, ['Area skills deal 30% more damage and have 20% increased Area']),
        C('Live Wire', { fx: { shockedMore: 30 }, stats: { shockChance: 25 } }, ['Shocked enemies take 30% more damage from your hits', '+25% chance to Shock'])] },
    astromancer: { smallName: 'Star Study', pool: [{ spellDmg: 10 }, { castSpd: 4 }, { critChance: 15 }, { charge: 15 }],
      caps: [C('Starfall', { tm: [{ t: 'Spell', more: 1.2 }], fx: { fullChargeMore: 20 } }, ['Spells deal 20% more damage', 'Spells deal 20% more damage again while your Charge is above 80%']),
        C('Singularity Mind', { tm: [{ t: 'Area', area: 35 }], stats: { castSpd: 15 } }, ['Area skills have 35% increased Area', '15% increased Cast Speed'])] },
    voidcaller: { smallName: 'Void Litany', pool: [{ voidDmg: 12 }, { corruptChance: 5 }, { duration: 8 }, { ward: 20 }],
      caps: [C('Unmaking', { fx: { corruptedMore: 30 }, stats: { corruptChance: 25 } }, ['Corrupted enemies take 30% more damage from your hits', '+25% chance to Corrupt']),
        C('Abyssal Tide', { fx: { killBurst: 10 }, stats: { voidDmg: 30 } }, ['Enemies you kill burst for 10% of their maximum Life as Void damage', '30% increased Void Damage'])] },
    gravitic: { smallName: 'Zero-G Form', pool: [{ atkSpd: 4 }, { moveSpd: 4 }, { meleeDmg: 10 }, { evasion: 3 }],
      caps: [C('Event Fist', { flag: 'palm', tm: [{ t: 'Melee', speed: 15 }] }, ['Every fourth melee hit releases a shockwave for 60% of its damage', 'Melee skills are 15% faster']),
        C('Orbit Breaker', { fx: { airMore: 30 }, stats: { airJump: 1 } }, ['Deal 30% more damage while airborne', '+1 air jump'])] },
    ascetic: { smallName: 'Ascetic Practice', pool: [{ regen: 2 }, { life: 20 }, { physDmg: 12 }, { ward: 20 }],
      caps: [C('Perfect Body', { fx: { lessTaken: 15 }, stats: { regen: 10 } }, ['Take 15% less damage', 'Regenerate 10 Life per second']),
        C('Final Lesson', { fx: { lowLifeMore: 40, bossMore: 15 } }, ['Deal 40% more damage below half Life', 'Deal 15% more damage to bosses and Titans'])] },
    devourer: { smallName: 'Appetite', pool: [{ leech: 0.6 }, { life: 25 }, { meleeDmg: 10 }, { lifePct: 5 }],
      caps: [C('Gorge Eternal', { fx: { killHeal: 4 }, stats: { leech: 2 } }, ['Kills heal 4% of your maximum Life', '2% of Hit Damage Leeched as Life']),
        C('Carapace Bloom', { fx: { hiLifeLess: 20, lessTaken: 5 }, stats: { lifePct: 20 } }, ['20% increased maximum Life', 'Take 5% less damage, and 20% less again while above 75% Life'])] },
    hivemind: { smallName: 'Brood Bond', pool: [{ minionDmg: 12 }, { minionSpd: 6 }, { minionDur: 10 }, { voidDmg: 10 }],
      caps: [C('Queen of the Hive', { tm: [{ t: 'Minion', minions: 2, more: 1.15 }] }, ['Minion skills summon 2 more minions and deal 15% more damage']),
        C('Living Swarm', { fx: { minionShield: 20 }, tm: [{ t: 'Minion', minionSpd: 30 }] }, ['Take 20% less damage while you have a minion', 'Minions attack 30% faster'])] },
    dragoon: { smallName: 'Lance Form', pool: [{ meleeDmg: 10 }, { projDmg: 10 }, { physDmg: 10 }, { life: 20 }],
      caps: [C('Sky Piercer', { fx: { airMore: 30 }, tm: [{ t: 'Movement', more: 1.3 }] }, ['Deal 30% more damage while airborne', 'Movement skills deal 30% more damage']),
        C('Impaler', { tm: [{ t: 'Melee', crit: 60 }], fx: { bossMore: 20 } }, ['Melee skills have 60% increased Critical Hit Chance', 'Deal 20% more damage to bosses and Titans'])] },
    glacier: { smallName: 'Rimewalk', pool: [{ coldDmg: 12 }, { chillEff: 10 }, { freezeChance: 2 }, { ward: 20 }],
      caps: [C('Glacial Prison', { fx: { frozenMore: 40 }, stats: { freezeChance: 10 } }, ['Hits against Frozen enemies deal 40% more damage', '+10% chance to Freeze']),
        C('Endless Winter', { fx: { chilledMore: 25 }, tm: [{ t: 'Cold', area: 20 }] }, ['Chilled enemies take 25% more damage from your hits', 'Cold skills have 20% increased Area'])] },
  };
})();
