// Galactic Void — skill gems and support gems.
// Active gems define a skill. Support gems socket into an active gem and change it, but only
// when their tags fit. Add a gem by adding an entry here (and a `kind` to skills.js if new).
(function () {
  const GV = window.GV;
  const lin = (a, b) => (L) => a + b * (L - 1);

  GV.DMG_COLORS = { phys: '#ffffff', fire: '#ffb36a', cold: '#9fe8ff', light: '#fff27a', void: '#d6a8ff' };
  GV.DMG_NAMES = { phys: 'Physical', fire: 'Fire', cold: 'Cold', light: 'Lightning', void: 'Void' };

  GV.GEMS = {
    // ---- attacks (use weapon damage) ----
    strike: { name: 'Void Strike', tier: 1, tags: ['Attack', 'Melee'], kind: 'melee', icon: '⚔', color: '#9fe8ff', types: { phys: 1 }, eff: lin(1, 0.07), cost: lin(0, 0), desc: 'Strike with your weapon. Fast, reliable, the root of every melee build.' },
    sweep: { name: 'Hull Sweep', tier: 1, tags: ['Attack', 'Melee', 'Area'], kind: 'sweep', icon: '◎', color: '#ff8a6a', types: { phys: 1 }, eff: lin(1.15, 0.08), cost: lin(5, 0.4), speed: 1.25, radius: 82, desc: 'A spinning cut that hits enemies on both sides of you.' },
    slam: { name: 'Grav Slam', tier: 2, tags: ['Attack', 'Melee', 'Area', 'Slam'], kind: 'slam', icon: '⤓', color: '#ffb36a', types: { phys: 1 }, eff: lin(1.35, 0.09), cost: lin(9, 0.6), speed: 2.2, radius: 85, waves: 1, desc: 'Hammer the ground. Crushes what is in front of you and sends a shockwave each way.' },
    comet: { name: 'Comet Drop', tier: 2, tags: ['Attack', 'Melee', 'Area', 'Slam', 'Movement'], kind: 'dive', icon: '☄', color: '#ffd36b', types: { phys: 0.6, fire: 0.4 }, eff: lin(1.7, 0.11), cost: lin(10, 0.6), cd: 1.2, radius: 110, desc: 'Leap and crash down in a burst of starfire. Works from the air.' },
    volley: { name: 'Lance Volley', tier: 1, tags: ['Attack', 'Projectile'], kind: 'proj', icon: '⇶', color: '#7dffcf', types: { phys: 1 }, eff: lin(0.5, 0.035), cost: lin(4, 0.3), speed: 1.25, proj: 3, spread: 0.12, pspeed: 820, life: 0.8, r: 7, desc: 'Throw a fan of void lances using your weapon\'s damage.' },
    // ---- class attacks ----
    ionshot: { name: 'Ion Shot', tier: 1, tags: ['Attack', 'Projectile', 'Lightning'], kind: 'proj', icon: '⁍', color: '#7dffcf', types: { phys: 0.5, light: 0.5 }, eff: lin(1.0, 0.07), cost: lin(0, 0), speed: 1, proj: 1, spread: 0.08, pspeed: 1150, life: 0.75, r: 6, ail: { shock: 5 }, desc: 'Fire your ion pistol. Fast and precise. Half physical, half lightning.' },
    backstab: { name: 'Backstab', tier: 1, tags: ['Attack', 'Melee'], kind: 'melee', icon: '†', color: '#7dffcf', types: { phys: 1 }, eff: lin(1.15, 0.075), cost: lin(4, 0.3), speed: 1.2, backstab: true, crit: 10, desc: 'A dagger thrust. 100% more damage against enemies facing away or while you are stealthed.' },
    whirl: { name: 'Whirlwind', tier: 1, tags: ['Attack', 'Melee', 'Area', 'Channelling'], kind: 'channel', icon: '✇', color: '#8fe9ff', types: { phys: 1 }, eff: lin(0.72, 0.054), cost: lin(3, 0.2), speed: 0.5, radius: 95, desc: 'Hold to spin your blade, hitting everything around you while you move. Costs Charge each spin.' },
    lcharge: { name: 'Lumen Charge', tier: 1, tags: ['Attack', 'Melee', 'Movement'], kind: 'charge', icon: '➠', color: '#8fe9ff', types: { phys: 0.7, light: 0.3 }, eff: lin(1.7, 0.11), cost: lin(8, 0.5), cd: 2.2, dist: 340, desc: 'Charge forward, carving through every enemy in the way. You cannot be hit during the charge.' },
    shcharge: { name: 'Shield Charge', tier: 1, tags: ['Attack', 'Melee', 'Movement', 'Shield'], kind: 'charge', icon: '⛉', color: '#ffd36b', types: { phys: 1 }, eff: lin(1.5, 0.1), cost: lin(8, 0.5), cd: 2.5, dist: 300, stun: 1.1, desc: 'Charge behind your Aegis. Hits and stuns everything you plough into.' },
    // ---- spells ----
    bolt: { name: 'Rift Bolt', tier: 1, tags: ['Spell', 'Projectile', 'Void'], kind: 'proj', icon: '➤', color: '#c79bff', types: { void: 1 }, dmg: lin(14, 3.9), cost: lin(8, 0.5), cast: 0.45, proj: 1, pierce: 2, pspeed: 920, life: 0.9, r: 9, desc: 'A piercing bolt of void.' },
    shards: { name: 'Cryo Shards', tier: 1, tags: ['Spell', 'Projectile', 'Cold'], kind: 'proj', icon: '❄', color: '#9fe8ff', types: { cold: 1 }, dmg: lin(4.2, 1.45), cost: lin(10, 0.6), cast: 0.5, proj: 5, spread: 0.2, pspeed: 700, life: 0.6, r: 6, desc: 'A spray of ice. Cold damage always Chills.' },
    spark: { name: 'Star Spark', tier: 2, tags: ['Spell', 'Projectile', 'Lightning', 'Duration'], kind: 'spark', icon: '✧', color: '#fff27a', types: { light: 1 }, dmg: lin(2.5, 0.85), cost: lin(11, 0.6), cast: 0.55, proj: 4, pspeed: 430, dur: 1.8, r: 6, ail: { shock: 10 }, desc: 'Erratic sparks crawl along the ground and bounce off walls.' },
    arc: { name: 'Arc Lash', tier: 2, tags: ['Spell', 'Lightning', 'Chaining'], kind: 'arc', icon: 'ϟ', color: '#fff27a', types: { light: 1 }, dmg: lin(16, 5), cost: lin(10, 0.6), cast: 0.5, chain: 4, range: 380, ail: { shock: 20 }, desc: 'Lightning leaps to the nearest foe and chains onward.' },
    nova: { name: 'Nova Burst', tier: 2, tags: ['Spell', 'Area', 'Fire'], kind: 'nova', icon: '✺', color: '#ff7a4a', types: { fire: 1 }, dmg: lin(24, 6.8), cost: lin(24, 1), cast: 0.4, cd: 1.8, radius: 165, ail: { ignite: 25 }, desc: 'A ring of starfire that burns and hurls everything near you.' },
    meteor: { name: 'Fallen Star', tier: 3, tags: ['Spell', 'Area', 'Fire'], kind: 'meteor', icon: '☀', color: '#ff9a4a', types: { fire: 1 }, dmg: lin(50, 12), cost: lin(30, 1.2), cast: 0.6, cd: 3.5, radius: 125, delay: 0.65, ail: { ignite: 40 }, desc: 'Call a star down on the nearest foe. A huge burst after a short delay.' },
    bloom: { name: 'Void Bloom', tier: 3, tags: ['Spell', 'Area', 'Void', 'Duration'], kind: 'bloom', icon: '✿', color: '#c79bff', types: { void: 1 }, dmg: lin(64, 18), cost: lin(16, 0.8), cast: 0.5, cd: 0.8, dur: 4, radius: 110, desc: 'Plant void rot in the nearest foes. It eats them over time, and spreads when they die.' },
    sanct: { name: 'Sanctified Ground', tier: 1, tags: ['Spell', 'Area', 'Duration', 'Fire'], kind: 'ground', icon: '☼', color: '#ffd36b', types: { fire: 0.5, light: 0.5 }, dmg: lin(14, 4), cost: lin(18, 0.8), cast: 0.4, cd: 4, dur: 4, radius: 140, desc: 'Consecrate the ground. Burns enemies standing in it, and heals you 3% Life per second while you stand in it.' },
    ward: { name: 'Echo Ward', tier: 2, tags: ['Spell', 'Duration'], kind: 'orbit', icon: '❂', color: '#ff6a7a', types: { void: 0.5, phys: 0.5 }, dmg: lin(6.5, 2), cost: lin(26, 1), cast: 0.3, cd: 7, dur: 6, proj: 3, desc: 'Memories orbit you and shred anything they touch.' },
    patch: { name: 'Patch Rite', tier: 1, tags: ['Spell', 'Heal'], kind: 'heal', icon: '✚', color: '#9fffd8', heal: (L) => 0.25 + 0.01 * (L - 1), cost: lin(30, 1), cast: 0.3, cd: 5, desc: 'Seal your suit and restore Life (and some Void Ward).' },
    cloak: { name: 'Void Cloak', tier: 1, tags: ['Spell', 'Duration', 'Stealth'], kind: 'cloak', icon: '◐', color: '#7dffcf', cost: lin(16, 0.6), cast: 0.2, cd: 6, dur: 4, desc: 'Fade from sight. Enemies lose track of you. Your next skill used from Stealth Critically Hits for 50% more damage.' },
    shadowstep: { name: 'Shadow Step', tier: 1, tags: ['Spell', 'Movement', 'Stealth'], kind: 'blink', icon: '⇆', color: '#7dffcf', cost: lin(10, 0.4), cast: 0.15, cd: 3, dur: 1.2, desc: 'Blink behind the nearest foe and slip into Stealth for a moment.' },
    echoes: { name: 'Summon Echoes', tier: 2, tags: ['Spell', 'Minion', 'Duration'], kind: 'minion', icon: '☗', color: '#9fd8ff', types: { void: 0.6, phys: 0.4 }, dmg: lin(7.5, 2.2), cost: lin(28, 1), cast: 0.5, cd: 1, dur: 25, count: 2, desc: 'Call ghosts of your crew to fight beside you. They follow you and fire void bolts at anything near. Recasting calls fresh ones.' },
    turret: { name: 'Sentry Turret', tier: 1, tags: ['Spell', 'Minion', 'Duration', 'Projectile'], kind: 'turret', icon: '⌖', color: '#fff27a', types: { light: 0.6, phys: 0.4 }, dmg: lin(4.2, 1.3), cost: lin(16, 0.7), cast: 0.35, cd: 1.5, dur: 9, count: 2, pspeed: 900, r: 6, ail: { shock: 10 }, desc: 'Drop an auto-firing turret that shoots the nearest foe. Up to 2 at once.' },
    howl: { name: 'Dread Howl', tier: 2, tags: ['Warcry', 'Area', 'Duration'], kind: 'howl', icon: '❗', color: '#ff8a98', types: { phys: 1 }, dmg: lin(10, 3), cost: lin(14, 0.6), cast: 0.4, cd: 8, dur: 6, radius: 190, buff: (L) => 25 + L, desc: 'A scream through the suit radio hurls back nearby foes, then your hits deal more damage.' },
    herald: { name: 'Herald of Embers', tier: 3, tags: ['Buff', 'Fire', 'Area'], kind: 'herald', icon: '♨', color: '#ff7a4a', types: { fire: 1 }, reserve: 0.3, radius: 100, pct: (L) => 0.15 + 0.005 * (L - 1), cost: lin(0, 0), desc: 'Toggle. Reserves 30% of your Charge. Enemies you kill explode in fire.' },
    // ---- the second wave of Star Cores (aim-driven; their logic lives in game/skills2.js) ----
    lunge: { name: 'Starbreaker Lunge', tier: 2, tags: ['Attack', 'Melee', 'Movement'], kind: 'lunge', icon: '⟿', color: '#ffb36a', types: { phys: 0.7, fire: 0.3 }, eff: lin(1.6, 0.1), cost: lin(8, 0.5), cd: 1.6, radius: 80, dist: 260, desc: 'Hurl yourself along your aim, in any direction, cutting through everything in the way. Ends in a burst of starfire.' },
    rail: { name: 'Railshot', tier: 2, tags: ['Attack', 'Projectile', 'Lightning'], kind: 'rail', icon: '═', color: '#8fe9ff', types: { phys: 0.5, light: 0.5 }, eff: lin(1.9, 0.12), cost: lin(10, 0.6), speed: 1.8, cd: 0.8, range: 900, ail: { shock: 25 }, desc: 'A slug of lightning that crosses the screen in an instant and pierces every enemy in its line. Stopped only by walls.' },
    knives: { name: 'Phase Knives', tier: 1, tags: ['Attack', 'Projectile'], kind: 'knives', icon: '⟡', color: '#7dffcf', types: { phys: 1 }, eff: lin(0.3, 0.022), cost: lin(5, 0.35), speed: 1.1, proj: 3, spread: 0.22, pspeed: 900, r: 6, desc: 'Fan out three knives that phase through walls, hang in the air, then fly back to your hand, cutting on the way out and back.' },
    aegis: { name: 'Aegis Throw', tier: 2, tags: ['Attack', 'Projectile', 'Shield', 'Chaining'], kind: 'aegis', icon: '⛊', color: '#ffd36b', types: { phys: 0.7, light: 0.3 }, eff: lin(1.15, 0.08), cost: lin(7, 0.5), speed: 1.5, chain: 3, pspeed: 760, r: 11, desc: 'Throw a shield that bounces between up to four foes, then boomerangs home. 30% more damage while you carry a shield.' },
    hook: { name: 'Tether Hook', tier: 1, tags: ['Attack', 'Movement', 'Projectile'], kind: 'hook', icon: '⚓', color: '#9fffd8', types: { phys: 1 }, eff: lin(0.9, 0.06), cost: lin(6, 0.3), cd: 1.1, range: 430, pspeed: 1500, desc: 'Fire a grapple along your aim. Hook an enemy to yank it to you (or yourself to a boss); hook a wall to zip there.' },
    mine: { name: 'Ghost Mine', tier: 1, tags: ['Spell', 'Area', 'Void', 'Duration'], kind: 'mine', icon: '◈', color: '#c79bff', types: { void: 1 }, dmg: lin(30, 8), cost: lin(12, 0.6), cast: 0.3, dur: 12, radius: 100, count: 3, ail: { corrupt: 30 }, desc: 'Lob a mine where you aim. It arms after a moment and bursts when anything walks over it. Up to three at once.' },
    pillar: { name: 'Judgement Pillar', tier: 3, tags: ['Spell', 'Area', 'Lightning', 'Fire'], kind: 'pillar', icon: '⏚', color: '#ffe9a8', types: { light: 0.5, fire: 0.5 }, dmg: lin(66, 18), cost: lin(22, 1), cast: 0.45, cd: 2.2, radius: 46, delay: 0.5, ail: { shock: 30 }, desc: 'Mark a spot. Half a second later a column of light hammers down from the sky, striking everything in it and stunning.' },
    well: { name: 'Gravity Well', tier: 2, tags: ['Spell', 'Area', 'Void', 'Duration'], kind: 'well', icon: '◎', color: '#9f8bff', types: { void: 1 }, dmg: lin(9, 2.6), cost: lin(20, 0.8), cast: 0.4, cd: 6, dur: 4, radius: 130, desc: 'Open a well where you aim. Enemies inside lose their weight and float helpless; bosses are slowed. Deals Void damage over time.' },
    horizon: { name: 'Event Horizon', tier: 3, tags: ['Spell', 'Area', 'Void', 'Duration'], kind: 'horizon', icon: '●', color: '#ff4f8a', types: { void: 1 }, dmg: lin(26, 7.5), cost: lin(32, 1.2), cast: 0.55, cd: 7, dur: 2.5, radius: 120, desc: 'Tear open a black hole that drags enemies into its centre, grinding them down, then collapses in a violent burst.' },
    // ---- the minion wave (their logic lives in game/minions.js) ----
    hounds: { name: 'Void Hounds', tier: 1, tags: ['Spell', 'Minion', 'Duration', 'Melee'], kind: 'hounds', icon: '♞', color: '#b28bff', types: { phys: 0.5, void: 0.5 }, dmg: lin(8, 2.4), cost: lin(24, 1), cast: 0.5, cd: 1, dur: 22, count: 2, desc: 'Call hounds of living void that run down your enemies and tear at them. Recasting calls a fresh pack.' },
    spores: { name: 'Spore Brood', tier: 1, tags: ['Spell', 'Minion', 'Area', 'Void'], kind: 'spores', icon: '❀', color: '#ff6a9a', types: { void: 1 }, dmg: lin(9, 2.6), cost: lin(14, 0.6), cast: 0.4, cd: 1.2, radius: 72, count: 3, ail: { corrupt: 25 }, desc: 'Release spore pods that hunt the nearest enemies and burst in corrupting void.' },
    wisps: { name: 'Lantern Wisps', tier: 2, tags: ['Spell', 'Minion', 'Duration', 'Projectile', 'Lightning'], kind: 'wisps', icon: '❉', color: '#fff2a8', types: { light: 1 }, dmg: lin(6, 1.8), cost: lin(22, 0.9), cast: 0.4, cd: 1, dur: 20, count: 3, pspeed: 820, desc: 'Three wisps of Lantern light circle you, zapping enemies. Each one heals you for 0.6% of your Life every second.' },
    command: { name: 'Rallying Command', tier: 2, tags: ['Warcry', 'Minion', 'Duration'], kind: 'command', icon: '⚑', color: '#ffd36b', cost: lin(12, 0.5), cast: 0.3, cd: 10, dur: 6, buff: (L) => 30 + L, desc: 'Order the attack. Your minions deal more damage and attack 40% faster for a while, and every minion you have lasts 4 seconds longer.' },
    detonate: { name: 'Unstable Bond', tier: 2, tags: ['Spell', 'Minion', 'Area', 'Void'], kind: 'detonate', icon: '✸', color: '#ff4f8a', types: { void: 0.6, fire: 0.4 }, dmg: lin(30, 9), cost: lin(10, 0.5), cast: 0.3, cd: 2, radius: 95, desc: 'Every minion you have explodes. Wasteful, spectacular. Turrets, hounds, wisps, spores, echoes, drones: all of it.' },
    colossus: { name: 'Rift Colossus', tier: 3, tags: ['Spell', 'Minion', 'Duration', 'Area', 'Slam'], kind: 'colossus', icon: '♜', color: '#ffb36a', types: { phys: 0.7, fire: 0.3 }, dmg: lin(44, 11), cost: lin(40, 1.4), cast: 0.7, cd: 6, dur: 30, radius: 115, desc: 'Drag a colossus of rock and starfire through a rift. It lumbers after your enemies and slams them flat. One at a time.' },
    drones: { name: 'Drone Swarm', tier: 2, tags: ['Spell', 'Minion', 'Duration', 'Projectile'], kind: 'drones', icon: '⧫', color: '#ffb347', types: { light: 0.5, phys: 0.5 }, dmg: lin(5.5, 1.6), cost: lin(26, 1), cast: 0.5, cd: 1, dur: 14, count: 3, pspeed: 900, desc: 'Launch three drones that orbit you and fire at whatever you aim at (or the nearest threat).' },
  };

  GV.SUPPORTS = {
    quick: { name: 'Quickened', tier: 1, req: ['Attack', 'Spell', 'Warcry'], desc: '25% increased Attack and Cast Speed.', apply(s) { s.speedInc += 25; } },
    brutal: { name: 'Brutality', tier: 2, req: ['Attack', 'Spell'], desc: '40% more Physical Damage. Deals no Elemental or Void damage.', apply(s) { s.brutal = true; s.typeMore.phys = (s.typeMore.phys || 1) * 1.4; } },
    conc: { name: 'Concentrated Effect', tier: 1, req: ['Area'], desc: '30% more Area Damage. 30% less Area of Effect.', apply(s) { s.more *= 1.3; s.areaMore *= 0.7; } },
    expanse: { name: 'Expanse', tier: 1, req: ['Area'], desc: '40% increased Area of Effect.', apply(s) { s.areaInc += 40; } },
    split: { name: 'Splitstar', tier: 1, req: ['Projectile'], desc: '+2 Projectiles. 25% less Damage.', apply(s) { s.proj += 2; s.more *= 0.75; } },
    pierce: { name: 'Piercing', tier: 1, req: ['Projectile'], desc: 'Projectiles Pierce 2 additional enemies. 10% more Damage.', apply(s) { s.pierce += 2; s.more *= 1.1; } },
    chain: { name: 'Chain Reaction', tier: 2, req: ['Projectile', 'Chaining'], desc: 'Chain +2 times. 15% less Damage.', apply(s) { s.chain += 2; s.more *= 0.85; } },
    ember: { name: 'Ember Infusion', tier: 1, req: ['Attack', 'Spell'], desc: 'Gain 25% of Damage as extra Fire. +20% chance to Ignite.', apply(s) { s.extra.fire = (s.extra.fire || 0) + 0.25; s.ail.ignite += 20; } },
    frost: { name: 'Frost Infusion', tier: 1, req: ['Attack', 'Spell'], desc: 'Gain 25% of Damage as extra Cold (Cold always Chills).', apply(s) { s.extra.cold = (s.extra.cold || 0) + 0.25; } },
    storm: { name: 'Storm Infusion', tier: 1, req: ['Attack', 'Spell'], desc: 'Gain 25% of Damage as extra Lightning. +15% chance to Shock.', apply(s) { s.extra.light = (s.extra.light || 0) + 0.25; s.ail.shock += 15; } },
    voidinf: { name: 'Void Infusion', tier: 2, req: ['Attack', 'Spell'], desc: 'Gain 25% of Damage as extra Void. +20% chance to Corrupt.', apply(s) { s.extra.void = (s.extra.void || 0) + 0.25; s.ail.corrupt += 20; } },
    control: { name: 'Controlled Ruin', tier: 2, req: ['Spell'], desc: '30% more Spell Damage. Cannot Critically Hit.', apply(s) { s.more *= 1.3; s.noCrit = true; } },
    siphon: { name: 'Siphon', tier: 1, req: ['Attack', 'Spell'], desc: '4% of Hit Damage Leeched as Life.', apply(s) { s.leech += 4; } },
    echo: { name: 'Spell Echo', tier: 3, req: ['Spell'], excl: ['Duration', 'Heal', 'Stealth'], desc: 'The spell repeats once. 15% less Damage. 10% increased Cast Speed.', apply(s) { s.echo = 1; s.more *= 0.85; s.speedInc += 10; } },
    ruthless: { name: 'Ruthless', tier: 2, req: ['Melee'], desc: 'Every third use deals 100% more Damage and Knockback.', apply(s) { s.ruthless = true; } },
    impact: { name: 'Impact', tier: 1, req: ['Melee', 'Warcry', 'Slam'], desc: '80% increased Knockback. 10% more Damage.', apply(s) { s.knock *= 1.8; s.more *= 1.1; } },
    clock: { name: 'Clockwork', tier: 2, req: ['Cooldown'], desc: '40% increased Cooldown Recovery Rate.', apply(s) { s.cdrInc += 40; } },
    lean: { name: 'Lean Burn', tier: 1, req: ['*'], desc: '35% reduced Skill Cost.', apply(s) { s.costMul *= 0.65; } },
    persist: { name: 'Persistence', tier: 1, req: ['Duration'], desc: '45% increased Skill Effect Duration.', apply(s) { s.durInc += 45; } },
    cull: { name: 'Executioner', tier: 2, req: ['Attack', 'Spell'], desc: 'Kill enemies left below 10% Life (5% for bosses).', apply(s) { s.cull = true; } },
    keen: { name: 'Keen Edge', tier: 1, req: ['Attack', 'Spell'], desc: '100% increased Critical Hit Chance. +25% Critical Damage Bonus.', apply(s) { s.critInc += 100; s.critMulti += 25; } },
    pyre: { name: 'Pyre', tier: 2, req: ['Fire'], desc: '+20% chance to Ignite. Ignites deal 40% more Damage.', apply(s) { s.ail.ignite += 20; s.igniteMore *= 1.4; } },
    hypo: { name: 'Hypothermia', tier: 2, req: ['Cold'], desc: '+15% chance to Freeze. 20% more Damage against Chilled enemies.', apply(s) { s.ail.freeze += 15; s.vsChilled *= 1.2; } },
    after: { name: 'Aftershock', tier: 2, req: ['Slam'], desc: '+1 shockwave each way. 25% chance for the slam to repeat.', apply(s) { s.waves += 1; s.repeat = 0.25; } },
    fury: { name: 'Momentum', tier: 2, req: ['Movement', 'Channelling'], desc: '30% more Damage. 20% increased travel distance and spin radius.', apply(s) { s.more *= 1.3; s.distMul *= 1.2; s.areaInc += 20; } },
    might: { name: 'Minion Might', tier: 1, req: ['Minion'], desc: '35% more Minion Damage.', apply(s) { s.more *= 1.35; } },
    swarm: { name: 'Swarm', tier: 2, req: ['Minion'], desc: '+1 Minion. 10% less Minion Damage.', apply(s) { s.extraMinions = (s.extraMinions || 0) + 1; s.more *= 0.9; } },
    ricochet: { name: 'Ricochet', tier: 1, req: ['Projectile'], desc: 'Projectiles bounce off walls up to twice. 10% more Damage.', apply(s) { s.bounce = (s.bounce || 0) + 2; s.more *= 1.1; } },
    overload: { name: 'Overload', tier: 2, req: ['Spell'], excl: ['Minion'], desc: 'Every fourth cast is Overloaded: 80% more Damage and 30% more Area.', apply(s) { s.overload = true; } },
    titanslayer: { name: 'Titanslayer', tier: 3, req: ['Attack', 'Spell'], desc: '50% more Damage against bosses, Titans and their weak points. 15% less Damage against everything else.', apply(s) { s.titanslayer = true; } },
    hasten: { name: 'Minion Haste', tier: 1, req: ['Minion'], desc: 'Minions attack 35% faster.', apply(s) { s.minionSpdInc = (s.minionSpdInc || 0) + 35; } },
    frenzy: { name: 'Feeding Frenzy', tier: 2, req: ['Minion'], desc: '25% more Minion Damage. Minions last 30% longer.', apply(s) { s.more *= 1.25; s.durInc += 30; } },
    infernal: { name: 'Infernal Legion', tier: 2, req: ['Minion'], desc: 'Minions gain 30% of Damage as extra Fire. +25% chance to Ignite.', apply(s) { s.extra.fire = (s.extra.fire || 0) + 0.3; s.ail.ignite += 25; } },
    packbond: { name: 'Pack Bond', tier: 3, req: ['Minion'], desc: '+2 Minions. Minions deal 8% more Damage for each other minion you have, up to 40%.', apply(s) { s.extraMinions = (s.extraMinions || 0) + 2; s.packBond = true; } },
    shroud: { name: 'Shroud', tier: 1, req: ['Stealth'], desc: '50% increased Stealth duration. 30% reduced cooldown.', apply(s) { s.durInc += 50; s.cdrInc += 43; } },
  };

  GV.gemTags = (def) => {
    const t = new Set(def.tags);
    if (def.cd) t.add('Cooldown');
    return t;
  };
  GV.gemFits = (sup, def) => {
    const tags = GV.gemTags(def);
    if (sup.excl && sup.excl.some((x) => tags.has(x))) return false;
    return sup.req.includes('*') || sup.req.some((r) => tags.has(r));
  };
  GV.gemXpNeed = (lvl) => Math.round(28 * Math.pow(lvl, 1.65));
  GV.MAX_GEM_LVL = 20;
  GV.MAX_SOCKETS = 5;
})();
