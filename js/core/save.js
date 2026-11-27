// Galactic Void — save data, progression math and the gem inventory. Stored in this browser only.
(function () {
  const GV = window.GV;
  const KEY = 'galacticVoid.save.v2';
  const BKEY = 'galacticVoid.backups';

  GV.save = {
    data: null,
    defaults() {
      return {
        memories: 0, xp: 0, level: 1,
        abilities: { dash: false, grip: false, hook: false },
        weapons: [], weapon: 'pike', offhand: null,
        upgrades: { hp: 0, dmg: 0, charge: 0 },
        cleared: {}, vaults: {}, shipFound: false, seenIntro: false, mute: false, lore: [],
        // classes, passive tree, gems
        cls: null, passives: [], bonusPoints: 2,
        gems: [], sups: [], bar: [null, null, null, null], uncut: [], orbs: 0, uid: 1,
        oldSkills: [], savedAt: 0,
        asc: { sub: null, nodes: [] }, codex: { kills: {}, elites: 0, logs: [], read: [] },
        ship: { racks: 0, medbay: 0, armory: 0, salvage: 0, scanner: 0, gemlab: 0 },
        cur: { alch: 0, chaos: 0, divine: 0, exalt: 0, annul: 0 }, loadouts: [null, null], activeLoadout: 0,
        items: [], equip: { helm: null, suit: null, boots: null, relic: null }, trialBest: 0, trialRuns: 0,
        coop: { on: false, mode: null, p2: null },
      };
    },
    load() {
      let d = {};
      try { d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { d = {}; }
      this.data = this.main = this.normalize(d);
      this.slot = 0;
      return this.data;
    },
    // ---------- Player 2 (couch co-op) ----------
    // Player 2's character (class, gems, gear, tree) lives inside the main save at coop.p2, so it
    // syncs and transfers with everything else. World progress and the memory wallet are shared:
    // while Player 2's data is active those fields mirror Player 1's.
    SHARED: ['cleared', 'abilities', 'shipFound', 'ship', 'vaults', 'codex', 'lore', 'seenIntro', 'tutDone', 'trialBest', 'daily', 'stats', 'ach'],
    hasP2() { const c = this.main && this.main.coop; return !!(c && c.p2 && c.p2.cls); },
    useSlot(i) {
      if (i === this.slot) return;
      const M = this.main;
      if (i === 1) {
        M.coop = M.coop || { on: false, mode: null, p2: null };
        const p2 = this.normalize(M.coop.p2 || {});
        delete p2.coop;
        M.coop.p2 = p2;
        for (const k of this.SHARED) p2[k] = M[k];
        p2.memories = M.memories;
        this.data = p2; this.slot = 1;
      } else {
        const p2 = this.data;
        M.memories = p2.memories;
        for (const k of this.SHARED) delete p2[k];
        delete p2.memories;
        this.data = M; this.slot = 0;
      }
    },
    // Run fn with a player's data active, then switch back.
    as(i, fn) {
      const prev = this.slot;
      this.useSlot(i);
      try { return fn(this.data); } finally { this.useSlot(prev); }
    },
    resetP2() { if (this.main.coop) { this.main.coop.p2 = null; this.main.coop.on = false; } this.write(); },
    // Fill in anything missing from a save (older versions, other devices) from the defaults.
    normalize(d) {
      const def = this.defaults();
      for (const k in def) {
        if (d[k] === undefined) continue;
        if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) def[k] = Object.assign(def[k], d[k]);
        else def[k] = d[k];
      }
      // Older saves (before classes and gems) kept rites in `skills`; carry them over as gems later.
      if (Array.isArray(d.skills) && !d.gems) def.oldSkills = d.skills.filter((s) => s !== 'patch');
      // Keep everything later systems added (NG+, crew, Frontier, shards, dyes, tips, vault, friends,
      // guild...). Before this, anything not in the original defaults was dropped on load.
      for (const k in d) if (!(k in def) && k !== 'skills' && d[k] !== undefined) def[k] = d[k];
      return def;
    },
    // Every write stamps the save, keeps it in this browser, keeps a rolling backup, and lets
    // cloud sync know there is something new to upload.
    // quiet: housekeeping on load. It keeps the old stamp, so it can't look newer than the cloud.
    write(quiet) {
      if (this.slot >= 1) this.main.memories = this.data.memories;
      const d = this.main || this.data;
      if (quiet !== true || !d.savedAt) d.savedAt = Date.now();
      const json = JSON.stringify(d);
      try { localStorage.setItem(KEY, json); this.localOk = true; } catch (e) { this.localOk = false; }
      this.backup(json);
      if (GV.sync && quiet !== true) GV.sync.changed();
    },
    backup(json) {
      try {
        const list = this.backups();
        const now = Date.now();
        if (list.length && now - list[0].at < 5 * 60 * 1000) list[0] = { at: now, json };
        else list.unshift({ at: now, json });
        localStorage.setItem(BKEY, JSON.stringify(list.slice(0, 4)));
      } catch (e) {}
    },
    backups() { try { return JSON.parse(localStorage.getItem(BKEY)) || []; } catch (e) { return []; } },
    // Replace this device's save with another (cloud, transfer code, file, backup).
    replace(obj) {
      const keepMute = this.data ? this.data.mute : false;
      if (this.data && this.hasProgress()) this.backup(JSON.stringify(this.data));
      const at = obj.savedAt;
      this.useSlot && this.slot && this.useSlot(0);
      this.data = this.main = this.normalize(obj);
      this.data.mute = keepMute;
      const json = JSON.stringify(this.data);
      try { localStorage.setItem(KEY, json); } catch (e) {}
      this.data.savedAt = at || Date.now();
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
    },
    summary(d) {
      d = d || this.data;
      const cls = d.cls && GV.CLASSES[d.cls] ? GV.CLASSES[d.cls].name : 'No class yet';
      return `${cls} · Rank ${d.level || 1} · ${Object.keys(d.cleared || {}).length} stages · ${d.memories || 0} memories`;
    },
    reset() { return this.eraseAll(); },
    // Erase every save: the main save (Player 2's character lives inside it), the rolling backups on
    // this device, and the cloud copy. Settings, keybinds and your own music are not saves and stay.
    eraseAll() {
      if (this.slot) { this.slot = 0; this.data = this.main; }
      const keepMute = this.main ? !!this.main.mute : false;
      try { localStorage.removeItem(KEY); localStorage.removeItem(BKEY); } catch (e) {}
      this.data = this.main = this.defaults(); this.slot = 0; this.data.mute = keepMute;
      this.data.savedAt = Date.now();
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
      if (GV.sync && GV.sync.eraseCloud) GV.sync.eraseCloud();
      if (GV.net && GV.net.role && GV.net.leave) try { GV.net.leave(); } catch (e) {}
    },
    hasProgress() {
      const d = this.data;
      return Object.keys(d.cleared).length > 0 || d.memories > 0 || d.level > 1 || !!d.cls;
    },
    needsClass() { return !this.data.cls; },
    chooseClass(key) {
      const d = this.data, C = GV.CLASSES[key], inv = GV.inv;
      d.cls = key;
      if (!d.weapons.includes(C.weapon)) d.weapons.push(C.weapon);
      d.weapon = C.weapon;
      d.offhand = C.offhand || null;
      if (C.offhand && !d.weapons.includes(C.offhand)) d.weapons.push(C.offhand);
      d.arsenalV = 1;
      d.passives = [GV.TREE.classStart[key]]; d.treeVer = GV.TREE.VER;
      d.gems = []; d.sups = []; d.bar = [null, null, null, null];
      C.bar.forEach(([id, sockets], i) => { d.bar[i] = inv.newGem(id, 1, sockets).uid; });
      for (const s of C.supports) inv.newSup(s);
      for (const old of d.oldSkills || []) if (GV.GEMS[old] && !d.gems.some((g) => g.id === old)) inv.newGem(old, 3, 2);
      d.oldSkills = [];
      d.uncut.push({ kind: 'skill', tier: 1 }, { kind: 'support', tier: 1 });
      this.write();
    },
  };

  GV.progress = {
    // steeper than before, most of all in the first ranks: each one should be earned
    xpNeed: (lvl) => Math.round(55 * Math.pow(lvl, 1.6) + 45),
    stageOpen(s, t) {
      const d = GV.save.data, c = d.cleared;
      if (s > 0 && !d.shipFound) return false;
      if (t === 0) return s === 0 || !!c[`${s - 1}-2`];
      return !!c[`${s}-${t - 1}`];
    },
    systemOpen(s) { return this.stageOpen(s, 0); },
    frontier() { let s = 0; while (this.systemOpen(s + 1)) s++; return s; },
    upgradeCost(key) { return GV.UPGRADES[key].base + GV.UPGRADES[key].step * GV.save.data.upgrades[key]; },
    // Highest gem tier Vesper will sell, and the tier enemies drop at a given difficulty.
    shopTier() { const c = GV.save.data.cleared; return 1 + (c['0-0'] ? 1 : 0) + (c['0-2'] ? 1 : 0); },
    dropTier: (diff) => Math.min(3, 1 + Math.floor((diff + 1) / 2)),
  };

  // ---------- gem inventory ----------
  const d = () => GV.save.data;
  GV.inv = {
    newGem(id, lvl = 1, sockets = 1) {
      const g = { uid: d().uid++, id, lvl, xp: 0, sockets, sup: new Array(sockets).fill(null) };
      d().gems.push(g);
      return g;
    },
    newSup(id) { const s = { uid: d().uid++, id }; d().sups.push(s); return s; },
    gem(uid) { return d().gems.find((g) => g.uid === uid) || null; },
    sup(uid) { return d().sups.find((s) => s.uid === uid) || null; },
    holder(supUid) { return d().gems.find((g) => g.sup.includes(supUid)) || null; },
    freeSups() { return d().sups.filter((s) => !this.holder(s.uid)); },
    freeGems() { return d().gems.filter((g) => !d().bar.includes(g.uid)); },
    barGems() { return d().bar.map((u) => (u == null ? null : this.gem(u))); },
    socket(gem, idx, supUid) {
      if (supUid != null) { const h = this.holder(supUid); if (h) h.sup[h.sup.indexOf(supUid)] = null; }
      gem.sup[idx] = supUid;
      GV.save.write();
    },
    addSocket(gem) {
      if (d().orbs <= 0 || gem.sockets >= GV.MAX_SOCKETS) return false;
      d().orbs--; gem.sockets++; gem.sup.push(null);
      GV.save.write();
      return true;
    },
    equip(slot, uid) {
      const bar = d().bar;
      const cur = bar.indexOf(uid);
      if (cur >= 0) bar[cur] = bar[slot];
      bar[slot] = uid;
      GV.save.write();
    },
    // Cut an uncut gem into the chosen gem. Higher tiers start at a higher level.
    cut(index, id) {
      const u = d().uncut[index];
      if (!u) return null;
      d().uncut.splice(index, 1);
      const out = u.kind === 'skill' ? this.newGem(id, 1 + 3 * (u.tier - 1), 1) : this.newSup(id);
      GV.save.write();
      return out;
    },
    // Loadouts: two complete builds (skill bar + sockets, gear, passive tree, weapon) to swap between.
    snapshot() {
      const D = d();
      return { bar: D.bar.slice(), sup: Object.fromEntries(D.gems.map((g) => [g.uid, g.sup.slice()])), equip: Object.assign({}, D.equip), passives: D.passives.slice(), weapon: D.weapon, offhand: D.offhand };
    },
    swapLoadout(to) {
      const D = d();
      if (to === D.activeLoadout) return;
      D.loadouts[D.activeLoadout] = this.snapshot();
      const L = D.loadouts[to];
      if (L) {
        const live = new Set(D.sups.map((s) => s.uid));
        for (const g of D.gems) g.sup = new Array(g.sockets).fill(null);
        for (const g of D.gems) {
          const want = (L.sup[g.uid] || []).slice(0, g.sockets);
          want.forEach((u, i) => { if (u != null && live.has(u) && !this.holder(u)) g.sup[i] = u; });
        }
        D.bar = L.bar.map((u) => (u != null && this.gem(u) ? u : null));
        for (const s in D.equip) D.equip[s] = L.equip[s] && GV.items.get(L.equip[s]) ? L.equip[s] : null;
        if (L.passives.length - 1 <= GV.TREE.total()) D.passives = L.passives.slice();
        if (D.weapons.includes(L.weapon)) D.weapon = L.weapon;
        D.offhand = L.offhand && D.weapons.includes(L.offhand) ? L.offhand : (L.offhand === undefined ? D.offhand : null);
      }
      D.activeLoadout = to;
      GV.save.write();
    },
    // Star Cores earn experience from kills only if you've used them in the last 10 seconds.
    // Returns the gems that levelled up.
    addXp(n, who = 'p1') {
      const ups = [], used = (GV.gemUse && GV.gemUse[who]) || {}, now = performance.now();
      for (const g of this.barGems()) {
        if (!g || g.lvl >= GV.MAX_GEM_LVL) continue;
        const lasting = GV.LASTING_KINDS && GV.LASTING_KINDS.has((GV.GEMS[g.id] || {}).kind); // summons and auras keep working after the cast
        if (!(now - (used[g.uid] || -1e9) < (lasting ? 60000 : 10000))) continue;
        const cap = GV.gemLvlCap ? GV.gemLvlCap(d().level) : GV.MAX_GEM_LVL;
        if (g.lvl >= cap) continue;
        g.xp += n * (GV.GEM_XP_SHARE || 1) * (1 + 0.15 * ((d().ship || {}).gemlab || 0));
        while (g.lvl < cap && g.xp >= GV.gemXpNeed(g.lvl)) { g.xp -= GV.gemXpNeed(g.lvl); g.lvl++; ups.push(g); }
        if (g.lvl >= cap) g.xp = Math.min(g.xp, GV.gemXpNeed(g.lvl) - 1);
      }
      return ups;
    },
  };
})();
