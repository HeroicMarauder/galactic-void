// Galactic Void — characters and Legacy.
//
// Characters: an account holds up to eight. The one you're playing lives in the save as before
// (GV.save.main), so every system keeps working unchanged; the others wait in main.roster.chars.
// Account-wide things stay put when you switch: the Vault (now shared by every character),
// achievements, the codex, couch co-op's Player 2, cosmetics, tips.
//
// Legacy: every character you raise earns Legacy for the whole account: rank milestones, systems
// cleared, ascending, Titans, and above all variety (each new class counts double). Legacy is how
// the loot comes back. Drops start lean; each Legacy level adds item quantity and rarity for every
// character, grows the shared Vault, and new characters start with heirlooms. Raise any class to
// rank 15 and it leaves a permanent Class Echo on all of your characters.
(function () {
  const GV = window.GV;
  const MAX = 8;
  const ACCOUNT = ['roster', 'bank', 'coop', 'ach', 'codex', 'lore', 'mute', 'tips', 'dyes', 'savedAt'];
  const main = () => GV.save.main || GV.save.data;
  function roster() {
    const m = main();
    if (!m.roster) m.roster = { v: 1, active: 0, chars: [null] };
    const r = m.roster;
    while (r.chars.length <= r.active) r.chars.push(null);
    return r;
  }

  const R = (GV.roster = {
    MAX, ACCOUNT,
    // Every character: { i, active, d } with d the character's data.
    list() {
      const r = roster(), out = [];
      r.chars.forEach((c, i) => { if (i === r.active) out.push({ i, active: true, d: main() }); else if (c) out.push({ i, active: false, d: c }); });
      return out;
    },
    count() { return this.list().filter((x) => x.d.cls).length; },
    // You can't swap mid-party. The ship's own open drop-in room (hosting with nobody in it) doesn't count:
    // it closes on the swap and opens again for the new character.
    inParty() { const N = GV.net; if (!N || !N.role) return false; return N.role === 'guest' || !!N.partner || !!(N.guests && N.guests.size) || !!(N.roster && N.roster.length > 1); },
    canSwitch() { return GV.save.slot === 0 && !this.inParty(); },
    // Pack the active character away and bring character i (or a brand-new one) forward.
    switchTo(i, fresh) {
      const r = roster(), m = main();
      if (!this.canSwitch() || (i === r.active && !fresh)) return false;
      if (GV.net && GV.net.role && GV.net.leave) GV.net.leave(); // close the empty drop-in room first
      const out = {};
      for (const k of Object.keys(m)) if (!ACCOUNT.includes(k)) { out[k] = m[k]; delete m[k]; }
      r.chars[r.active] = out.cls || out.level > 1 ? out : null; // an empty slot stays empty
      const inc = fresh ? GV.save.defaults() : r.chars[i] || GV.save.defaults();
      for (const k of Object.keys(inc)) if (!ACCOUNT.includes(k)) m[k] = inc[k];
      while (r.chars.length <= i) r.chars.push(null);
      r.chars[i] = null; r.active = i;
      const keep = { roster: m.roster, bank: m.bank, coop: m.coop };
      GV.save.data = GV.save.main = GV.save.normalize(m);
      Object.assign(GV.save.main, keep);
      GV.save.slot = 0;
      GV.save.write();
      return true;
    },
    freeSlot() {
      const r = roster();
      for (let i = 0; i < MAX; i++) if (i !== r.active && !r.chars[i]) return i;
      return -1;
    },
    // A new character in the next free slot, with its heirlooms. Then pick a class.
    create() {
      const i = roster().chars[roster().active] === null && !main().cls ? roster().active : this.freeSlot();
      if (i < 0) return false;
      const veteran = this.list().some((x) => x.d.seenIntro);
      if (i !== roster().active) this.switchTo(i, true);
      const d = main(), L = GV.legacy.level();
      if (veteran) { d.seenIntro = true; d.tutDone = true; }
      d.memories = (d.memories || 0) + GV.legacy.perks(L).startMem;
      d.heirloom = L;
      if (L >= 5) d.uncut.push({ kind: 'skill', tier: 2 });
      if (L >= 8) d.uncut.push({ kind: 'support', tier: 2 });
      GV.save.write();
      return true;
    },
    remove(i) {
      const r = roster();
      if (i === r.active || !r.chars[i]) return false;
      r.chars[i] = null;
      GV.save.write();
      return true;
    },
    label(d) {
      const c = d.cls && GV.CLASSES[d.cls];
      const sub = d.asc && d.asc.sub && GV.ASCEND[d.cls] ? (GV.ASCEND[d.cls].find((x) => x.id === d.asc.sub) || {}).name : null;
      return { name: c ? c.name : 'New character', sub, color: c ? c.color : '#8fe9ff', rank: d.level || 1, systems: Object.keys(d.cleared || {}).filter((k) => k.endsWith('-2')).length };
    },
  });

  // ---------------- Legacy ----------------
  const RANKS = [10, 20, 30, 40, 50, 60];
  const need = (L) => Math.round(2 * L + 0.6 * L * L); // points for level L: 3, 6, 11, 16, 25, 34 ...
  GV.legacy = {
    MAXL: 20,
    // Where the points came from, so the screen can show it.
    sources() {
      const chars = R.list().map((x) => x.d).filter((d) => d.cls), classes = {};
      let ranks = 0, systems = 0, asc = 0, titans = 0;
      for (const d of chars) {
        for (const r of RANKS) if ((d.level || 1) >= r) ranks++;
        systems += Math.min(10, Object.keys(d.cleared || {}).filter((k) => k.endsWith('-2')).length);
        if (d.asc && d.asc.sub) asc += 2;
        if (d.titans && Object.keys(d.titans).length) titans += 1;
        if ((d.level || 1) >= 10) classes[d.cls] = true;
      }
      const variety = Object.keys(classes).length * 3;
      return { ranks, systems, asc, titans, variety, total: ranks + systems + asc + titans + variety };
    },
    points() { return this.sources().total; },
    level() { const p = this.points(); let L = 0; while (L < this.MAXL && p >= need(L + 1)) L++; return L; },
    progress() { const L = this.level(), p = this.points(); if (L >= this.MAXL) return { L, p, a: need(L), b: need(L), f: 1 }; const a = need(L), b = need(L + 1); return { L, p, a, b, f: (p - a) / (b - a) }; },
    perks(L = this.level()) {
      return {
        qty: Math.min(0.6, 0.05 * L),      // more drops
        rar: Math.min(0.5, 0.04 * L),      // better drops
        vault: 10 * L,                     // shared vault slots
        startMem: Math.min(1000, 75 * L),  // heirloom memories for a new character
        catchUp: L >= 1,                   // alts level faster until they're close to your best
      };
    },
    qty() { return 1 + this.perks().qty; },
    rar() { return 1 + this.perks().rar; },
    best() { return Math.max(1, ...R.list().map((x) => x.d.level || 1)); },
    // +50% XP while this character is more than 5 ranks behind your best one
    xpMul() { const d = GV.save.data; return this.perks().catchUp && (d.level || 1) < this.best() - 5 ? 1.5 : 1; },
    // Class Echoes: raise a class to rank 15 and every character keeps a piece of it.
    ECHO_RANK: 15,
    ECHOES: {
      knight: { stats: { lifePct: 5 }, line: '+5% maximum Life' },
      ranger: { stats: { projDmg: 8 }, line: '8% increased Projectile Damage' },
      paladin: { stats: { block: 3 }, line: '+3% chance to Block' },
      engineer: { stats: { minionDmg: 12 }, line: '12% increased Minion Damage' },
      starcaller: { stats: { spellDmg: 8 }, line: '8% increased Spell Damage' },
      monk: { stats: { atkSpd: 4 }, line: '4% increased Attack Speed' },
      symbiote: { stats: { leech: 0.5 }, line: '0.5% of Hit Damage Leeched as Life' },
      lancer: { stats: { coldDmg: 8, chillEff: 8 }, line: '8% increased Cold Damage and Chill effect' },
    },
    echoes() {
      const out = {};
      for (const x of R.list()) if (x.d.cls && (x.d.level || 1) >= this.ECHO_RANK) out[x.d.cls] = true;
      return out;
    },
    echoStats() {
      const acc = {}, on = this.echoes();
      for (const k in on) { const e = this.ECHOES[k]; if (e) for (const s in e.stats) acc[s] = (acc[s] || 0) + e.stats[s]; }
      return acc;
    },
  };

  // Load: older saves become slot 1 of a roster.
  const load0 = GV.save.load;
  GV.save.load = function () { const d = load0.call(this); roster(); return d; };
  // Replacing the save (cloud, transfer, file) brings its roster along: nothing else to do.

  // The Vault is shared, and grows with Legacy.
  addEventListener('load', () => {
    if (GV.vault && GV.vault.solo) {
      const S = GV.vault.solo, cap0 = S.cap;
      S.title = 'Shared Vault';
      S.cap = () => cap0.call(S) + GV.legacy.perks().vault;
      S.banner = () => `<p class="note">Shared by all of your characters${GV.legacy.level() ? ` · Legacy ${GV.legacy.level()} adds ${GV.legacy.perks().vault} slots` : ''}. Leave something here and any character can take it.</p>`;
    }
  });
})();
