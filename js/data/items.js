// Galactic Void — gear. Four slots (helm, suit, boots, relic). Drops roll as Magic (1-2 mods),
// Rare (3-4 mods) or, rarely, Unique (fixed mods with a twist). Higher tiers roll bigger numbers.
(function () {
  const GV = window.GV;

  GV.SLOTS = {
    helm: { name: 'Helm', icon: '⛑', bases: ['Cracked Visor', 'Void Helm', 'Halo Crown'] },
    suit: { name: 'Suit', icon: '⛨', bases: ['Patched Suit', 'Plated Rig', 'Aegis Shell'] },
    boots: { name: 'Boots', icon: '⇵', bases: ['Mag Boots', 'Drift Treads', 'Grav Striders'] },
    relic: { name: 'Relic', icon: '✧', bases: ['Star Shard', 'Echo Stone', 'Black Sun Idol'] },
  };

  // [stat, min, max] at tier 1. Tier 2 rolls ×1.5, tier 3 ×2.1.
  const POOL = {
    helm: [['life', 10, 20], ['ward', 12, 25], ['critChance', 10, 22], ['critMulti', 6, 12], ['castSpd', 3, 6], ['spellDmg', 6, 12], ['lightDmg', 8, 14], ['chargeRegenPct', 8, 15], ['charge', 10, 20]],
    suit: [['life', 15, 30], ['lifePct', 4, 8], ['armour', 30, 60], ['evasion', 2, 5], ['ward', 15, 30], ['regen', 1, 2.5], ['block', 2, 5], ['armourPct', 8, 16]],
    boots: [['moveSpd', 4, 8], ['evasion', 2, 4], ['dashCd', 8, 15], ['life', 10, 20], ['armour', 15, 30], ['chillEff', 8, 14], ['ward', 8, 16]],
    relic: [['dmg', 6, 12], ['meleeDmg', 8, 15], ['projDmg', 8, 15], ['spellDmg', 8, 15], ['fireDmg', 10, 18], ['coldDmg', 10, 18], ['lightDmg', 10, 18], ['voidDmg', 10, 18], ['area', 6, 12],
      ['cdr', 4, 8], ['duration', 6, 12], ['leech', 0.6, 1.2], ['lifeOnHit', 1, 3], ['igniteChance', 4, 8], ['shockChance', 4, 8], ['freezeChance', 3, 6], ['corruptChance', 4, 8],
      ['memFind', 8, 15], ['atkSpd', 3, 6], ['critMulti', 6, 12], ['minionDmg', 10, 18]],
  };
  const TIER_MUL = [0, 1, 1.5, 2.1];
  const SUFFIX = { life: 'of Vigour', ward: 'of the Veil', critChance: 'of Precision', critMulti: 'of Ruin', castSpd: 'of Haste', spellDmg: 'of Starfire', lightDmg: 'of Storms',
    lifePct: 'of the Bulwark', armour: 'of Plating', evasion: 'of Shadows', regen: 'of Mending', block: 'of the Aegis', moveSpd: 'of the Comet', dashCd: 'of Phasing',
    dmg: 'of Malice', meleeDmg: 'of the Brawler', projDmg: 'of the Marksman', fireDmg: 'of Embers', coldDmg: 'of Frost', voidDmg: 'of the Void', area: 'of Collapse',
    minionDmg: 'of the Crew', cdr: 'of Clockwork', leech: 'of Hunger', memFind: 'of Memory', atkSpd: 'of Fury', charge: 'of Capacity', chargeRegenPct: 'of Flow' };
  const RARE_A = ['Grim', 'Hollow', 'Dread', 'Pale', 'Star', 'Night', 'Ash', 'Rift', 'Ghost', 'Ember', 'Cold', 'Void', 'Black', 'Wraith'];
  const RARE_B = { helm: ['Halo', 'Gaze', 'Crown', 'Visage'], suit: ['Shell', 'Mantle', 'Carapace', 'Shroud'], boots: ['Stride', 'Tread', 'Path', 'Drift'], relic: ['Heart', 'Star', 'Idol', 'Eye'] };

  GV.UNIQUES = [
    { slot: 'helm', name: "The Captain's Visor", tier: 2, mods: { critChance: 45, critMulti: 30, lifePct: 8 }, flavor: 'She never looked away from the horizon.' },
    { slot: 'suit', name: "Shepherd's Hollow Shroud", tier: 2, mods: { ward: 90, wardPct: 35, life: -25 }, flavor: 'Warm, though nobody is inside.' },
    { slot: 'boots', name: 'Lantern Striders', tier: 2, mods: { moveSpd: 14, dashCd: 30, airJump: 1 }, flavor: '+1 air jump. The ship taught them to fly.' },
    { slot: 'relic', name: 'Black Sun Idol', tier: 3, mods: { fireDmg: 40, igniteChance: 25, igniteDmg: 45 }, flavor: 'It burns cold in your palm.' },
    { slot: 'relic', name: "Ione's Locket", tier: 1, mods: { regen: 4, memFind: 40, lifeOnHit: 3 }, flavor: 'A picture of the crew, one face scratched out.' },
  ];

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pickN = (arr, n) => { const c = arr.slice(), out = []; while (out.length < n && c.length) out.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]); return out; };
  const roundStat = (k, v) => (['leech', 'regen'].includes(k) ? Math.round(v * 10) / 10 : Math.round(v));

  // Crafting currencies, bought from Vesper or dropped by elites and bosses.
  GV.CURRENCY = {
    alch: { name: 'Void Salt', color: '#c9d2e6', cost: 40, desc: 'Turns a Salvaged or Calibrated item into a Stellar one with 3 modifiers.' },
    chaos: { name: 'Rift Shard', color: '#d6a8ff', cost: 60, desc: 'Rerolls every modifier on a Rare item.' },
    divine: { name: 'Lantern Oil', color: '#ffd36b', cost: 90, desc: 'Rerolls the values of an item\'s modifiers.' },
    exalt: { name: 'Star Ember', color: '#ff9a4a', cost: 140, desc: 'Adds a new modifier to a Rare item (up to 5).' },
    annul: { name: 'Null Dust', color: '#8b98b3', cost: 70, desc: 'Removes a random modifier from a Magic or Rare item.' },
  };

  GV.items = {
    MAX_INV: 40,
    rollMod(slot, tier, exclude) {
      const pool = POOL[slot].filter(([k]) => !(k in exclude));
      if (!pool.length) return null;
      const [k, a, b] = pool[Math.floor(Math.random() * pool.length)];
      return [k, roundStat(k, rnd(a, b) * TIER_MUL[tier])];
    },
    rerollValue(it, k) {
      const row = POOL[it.slot].find(([x]) => x === k);
      return row ? roundStat(k, rnd(row[1], row[2]) * TIER_MUL[it.tier]) : it.mods[k];
    },
    // Apply a crafting currency. Returns an error string, or null on success.
    craft(it, cur) {
      const d = GV.save.data;
      if (!d.cur[cur]) return 'You have none.';
      if (it.rarity === 'unique') return 'Singularity items cannot be crafted.';
      if (it.set) return 'Set pieces cannot be crafted.';
      const n = Object.keys(it.mods).length;
      if (cur === 'alch') {
        if (it.rarity !== 'magic' && it.rarity !== 'normal') return 'Needs a Salvaged or Calibrated item.';
        it.rarity = 'rare';
        while (Object.keys(it.mods).length < 3) { const m = this.rollMod(it.slot, it.tier, it.mods); if (!m) break; it.mods[m[0]] = m[1]; }
        it.name = `${RARE_A[Math.floor(Math.random() * RARE_A.length)]} ${RARE_B[it.slot][Math.floor(Math.random() * 4)]}`;
      } else if (cur === 'chaos') {
        if (it.rarity !== 'rare' && it.rarity !== 'nova') return 'Needs a Stellar or Nova item.';
        if (it.rarity === 'nova') { it.rarity = 'rare'; it.name = it.name.replace(/^Nova /, ''); delete it.novaMod; }
        const keep = Math.max(3, Math.min(4, n));
        it.mods = {};
        while (Object.keys(it.mods).length < keep) { const m = this.rollMod(it.slot, it.tier, it.mods); if (!m) break; it.mods[m[0]] = m[1]; }
      } else if (cur === 'divine') {
        for (const k in it.mods) it.mods[k] = this.rerollValue(it, k);
      } else if (cur === 'exalt') {
        if (it.rarity !== 'rare' && it.rarity !== 'nova') return 'Needs a Stellar or Nova item.';
        if (n >= 5) return 'Already has 5 modifiers.';
        const m = this.rollMod(it.slot, it.tier, it.mods); if (!m) return 'No modifiers left to add.';
        it.mods[m[0]] = m[1];
      } else if (cur === 'annul') {
        if (n <= 1) return 'Nothing left to remove.';
        const ks = Object.keys(it.mods); delete it.mods[ks[Math.floor(Math.random() * ks.length)]];
      }
      d.cur[cur]--;
      it.crafted = true;
      GV.save.write();
      return null;
    },
    roll(tier, opts = {}) {
      tier = Math.max(1, Math.min(3, tier));
      const slot = opts.slot || Object.keys(GV.SLOTS)[Math.floor(Math.random() * 4)];
      const r = Math.random();
      const RR = GV.legacy ? GV.legacy.rar() : 1; // Legacy rarity
      const uniqueChance = (opts.boss ? 0.06 : 0.012) * RR;
      if (r < uniqueChance) {
        const pool = GV.UNIQUES.filter((u) => u.tier <= tier + 1 && !u.quest);
        if (pool.length) {
          const u = pool[Math.floor(Math.random() * pool.length)];
          return { uid: GV.save.data.uid++, slot: u.slot, rarity: 'unique', tier: u.tier, name: u.name, base: GV.SLOTS[u.slot].bases[u.tier - 1], mods: Object.assign({}, u.mods), flavor: u.flavor };
        }
      }
      const rare = (opts.boss && Math.random() < 0.7) || r < 0.16 * RR;
      const n = rare ? 3 + (Math.random() < 0.35 + tier * 0.1 ? 1 : 0) : 1 + (Math.random() < 0.5 ? 1 : 0);
      const mods = {};
      for (const [k, a, b] of pickN(POOL[slot], n)) mods[k] = roundStat(k, rnd(a, b) * TIER_MUL[tier]);
      const base = GV.SLOTS[slot].bases[tier - 1];
      const keys = Object.keys(mods);
      const name = rare ? `${RARE_A[Math.floor(Math.random() * RARE_A.length)]} ${RARE_B[slot][Math.floor(Math.random() * 4)]}` : `${base} ${SUFFIX[keys[0]] || ''}`.trim();
      return { uid: GV.save.data.uid++, slot, rarity: rare ? 'rare' : 'magic', tier, name, base, mods };
    },
    color: (it) => ({ magic: '#8fb4ff', rare: '#ffd36b', unique: '#ff9a4a' }[it.rarity] || '#fff'),
    value: (it) => Math.round(4 * it.tier * ({ magic: 1, rare: 2.2, unique: 6 }[it.rarity] || 1)),
    lines(it) { return Object.keys(it.mods).map((k) => (k === 'airJump' ? `+${it.mods[k]} air jump` : GV.STATS.fmt(k, it.mods[k]))); },
    equipped() { const e = GV.save.data.equip || {}; return Object.keys(GV.SLOTS).map((s) => this.get(e[s])).filter(Boolean); },
    get(uid) { return uid == null ? null : (GV.save.data.items || []).find((i) => i.uid === uid) || null; },
    add(it) {
      const d = GV.save.data;
      if (d.items.length >= this.MAX_INV) {
        // Inventory full: salvage the lowest-value unequipped item to make room.
        const eq = new Set(Object.values(d.equip));
        const cand = d.items.filter((i) => !eq.has(i.uid)).sort((a, b) => this.value(a) - this.value(b))[0];
        if (cand && this.value(cand) <= this.value(it)) { this.salvage(cand.uid); }
        else { d.memories += this.value(it); return false; }
      }
      d.items.push(it);
      return true;
    },
    equip(uid) {
      const d = GV.save.data, it = this.get(uid);
      if (!it) return;
      d.equip[it.slot] = d.equip[it.slot] === uid ? null : uid;
      GV.save.write();
    },
    salvage(uid) {
      const d = GV.save.data, it = this.get(uid);
      if (!it) return 0;
      for (const s in d.equip) if (d.equip[s] === uid) d.equip[s] = null;
      d.items = d.items.filter((i) => i.uid !== uid);
      d.memories += this.value(it);
      GV.save.write();
      return this.value(it);
    },
    // Total stats from equipped gear, for the stat aggregator.
    stats() {
      const out = {};
      for (const it of this.equipped()) for (const k in it.mods) out[k] = (out[k] || 0) + it.mods[k];
      return out;
    },
  };
})();
