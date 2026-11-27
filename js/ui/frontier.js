// Galactic Void — the Frontier: Void Depths (an endless descent), the Weekly Titan Hunt, and the
// Bounty Board with its Marks. Reached from the Departures board on the ship.
(function () {
  const GV = window.GV, U = GV.util, P = GV.Play.prototype, M = GV.menus;
  // GV.game is made later (main.js), so these go on GV and look it up when called.
  const G = GV;
  const esc = M.esc, memIcon = M.memIcon;
  const main = () => GV.save.main || GV.save.data;
  const F = () => { const d = main(); d.frontier = d.frontier || { depthBest: 0, depthRuns: 0, hunt: {}, trophies: 0, marks: 0, bounty: null, marksEarned: 0 }; return d.frontier; };

  // ================= VOID DEPTHS =================
  const DMODS = {
    swarm: { name: 'Swarming', desc: '50% more creatures at once', color: '#ff8a6a' },
    armored: { name: 'Hardened', desc: 'Creatures have 40% more Life', color: '#c3cad9' },
    frenzied: { name: 'Frenzied', desc: 'Creatures deal 30% more damage', color: '#ff4f6a' },
    glass: { name: 'Glass Void', desc: 'You deal and take 30% more damage', color: '#9fe8ff' },
    bounty: { name: 'Rich Vein', desc: 'Double memories', color: '#ffd36b' },
  };
  const depthMods = (n, seed) => {
    if (n < 2) return [];
    const r = U.rng(U.hash('depth:' + seed + ':' + n)), ks = Object.keys(DMODS), out = [];
    const want = n >= 6 ? 2 : 1;
    while (out.length < want) { const k = ks[Math.floor(r() * ks.length)]; if (!out.includes(k)) out.push(k); }
    return out;
  };
  const depthDiff = (n) => Math.max(1, GV.progress.frontier() * 3) + Math.round((n - 1) * 0.7);

  // Build an ordinary stage, but at the depth's difficulty.
  const diff0 = GV.UNIVERSE.difficulty;
  GV.UNIVERSE.difficulty = (s, t) => (GV._depthDiff != null ? GV._depthDiff : diff0(s, t));
  G.startDepths = function (n, seed) { return startDepths.call(GV.game, n, seed); };
  function startDepths(n, seed) {
    if (GV.save.needsClass()) { GV.menus.classSelect(); return; }
    GV.menus.hide(); GV.input.clear();
    seed = seed || Math.floor(Math.random() * 1e9);
    const fr = GV.progress.frontier(), r = U.rng(U.hash('dsys:' + seed + ':' + n));
    const sys = Math.floor(r() * (fr + 1)), st = Math.floor(r() * 3);
    GV._depthDiff = depthDiff(n);
    try { this.play = new GV.Play(sys, st); } finally { GV._depthDiff = null; }
    const p = this.play;
    p.depth = { n, seed, mods: depthMods(n, seed) };
    p.toasts.length = 0;
    p.toast(`DEPTH ${n}`, 2.8);
    p.toasts[0].sub = 'The Void Depths' + (p.depth.mods.length ? ' · ' + p.depth.mods.map((k) => DMODS[k].name).join(' · ') : '');
    if (n === 1) { F().depthRuns++; }
    this.scene = 'play'; this.paused = false;
    this.setPlaying(true);
  }
  const has = (p, k) => p && p.depth && p.depth.mods.includes(k);
  const cap0 = P.cap;
  P.cap = function () { const c = cap0.call(this); return has(this, 'swarm') ? Math.round(c * 1.5) : c; };
  const spawn0 = P.spawnEnemy;
  P.spawnEnemy = function () {
    const e = spawn0.apply(this, arguments);
    if (e && has(this, 'armored')) { e.hp *= 1.4; e.maxHp *= 1.4; }
    if (e && has(this, 'frenzied') && e.dmg) e.dmg *= 1.3;
    return e;
  };
  const dp0 = P.damagePlayer;
  P.damagePlayer = function (dmg, fromX, a, b) { return dp0.call(this, has(this, 'glass') ? dmg * 1.3 : dmg, fromX, a, b); };
  const de0 = P.damageEnemy;
  P.damageEnemy = function (e, amt, kx, ky, crit, dom) { return de0.call(this, e, has(this, 'glass') ? amt * 1.3 : amt, kx, ky, crit, dom); };
  const mem0 = P.gainMem;
  P.gainMem = function (n) { return mem0.call(this, has(this, 'bounty') ? n * 2 : n); };

  // Reaching the exit of a depth: rewards, then the way down.
  const finish0 = P.finish;
  P.finish = function () {
    if (!this.depth) {
      const r = finish0.call(this);
      if (this.hunt && this.pendingClear) this.pendingClear.hunt = this.huntResult || { week: this.hunt.week, mods: this.hunt.mods, time: null };
      return r;
    }
    this.sweepDrops();
    const n = this.depth.n, f = F();
    const bonus = Math.round(60 * n * (1 + GV.progress.frontier() * 0.5));
    this.gainMem(bonus);
    const got = [];
    if (n % 5 === 0) {
      const d = GV.save.data, tier = GV.progress.dropTier(this.diff);
      const it = GV.items.randomSet(tier); GV.items.add(it); got.push(it.name);
      d.orbs = (d.orbs || 0) + 1; d.cur.exalt = (d.cur.exalt || 0) + 1;
      d.uncut.push({ kind: Math.random() < 0.5 ? 'skill' : 'support', tier: 3 });
      got.push(GV.TERMS.orb, 'Star Ember', 'Tier 3 blank');
    }
    const newBest = n > f.depthBest;
    f.depthBest = Math.max(f.depthBest, n);
    bountyEvent('depth', n);
    this.state = 'clear';
    this.pendingClear = { depths: true, depth: n, seed: this.depth.seed, mem: this.memGot, bonus, kills: this.kills, got, newBest, mods: this.depth.mods };
    GV.save.write();
  };

  // ================= WEEKLY TITAN HUNT =================
  const HMODS = {
    enraged: { name: 'Enraged', desc: 'The Titan deals 30% more damage', color: '#ff4f6a' },
    ironhide: { name: 'Ironhide', desc: 'The Titan has 35% more Life', color: '#c3cad9' },
    fleeting: { name: 'Fleeting Core', desc: 'Its core stays exposed for 4.5s, not 7.5s', color: '#ffd36b' },
  };
  const weekNo = (dt = new Date()) => Math.floor((Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) / 86400000 + 3) / 7);
  const weekLabel = (w) => { const mon = new Date((w * 7 - 3) * 86400000); return mon.toISOString().slice(0, 10); };
  GV.hunt = {
    week: () => weekNo(),
    open() { const d = main(); return Object.values(d.titans || {}).some((n) => n > 0); },
    info(w = weekNo()) {
      const s = U.hash('hunt:' + w), id = GV.TITAN_ORDER[s % 3], ks = Object.keys(HMODS);
      const a = (s >>> 4) % ks.length, b = (a + 1 + ((s >>> 9) % (ks.length - 1))) % ks.length;
      const fr = GV.progress.frontier();
      let sys = fr; while (GV.titanFor(sys) !== id) sys++;
      return { week: w, id, mods: [ks[a], ks[b]], sys, label: weekLabel(w) };
    },
    state(w = weekNo()) { const h = F().hunt; if (h.week !== w) { h.week = w; h.claimed = false; h.best = null; } return h; },
  };
  G.startHunt = function () {
    const H = GV.hunt.info();
    GV.game.startTitan(H.sys);
    const p = GV.game.play;
    if (!p) return;
    p.hunt = { week: H.week, mods: H.mods, id: H.id };
    const b = p.boss;
    if (b) {
      if (H.mods.includes('ironhide')) { b.hp *= 1.35; b.maxHp *= 1.35; }
      if (H.mods.includes('enraged')) b.dmg *= 1.3;
    }
    p.toasts.length = 0;
    p.toast('WEEKLY TITAN HUNT', 2.8); p.toasts[0].sub = H.mods.map((k) => HMODS[k].name).join(' · ');
  };
  const upd0 = P.update;
  P.update = function (dt) {
    upd0.call(this, dt);
    const T = this.titan;
    if (this.hunt && T && this.hunt.mods.includes('fleeting')) {
      if (T.exposedT > 4.5 && !T._fl) { T.exposedT = 4.5; T._fl = true; }
      if (!(T.exposedT > 0)) T._fl = false;
    }
  };
  const down0 = P.onBossDown;
  P.onBossDown = function (b) {
    const r = down0.call(this, b);
    if (this.hunt && b.def && b.def.titan && !this.huntResult) {
      const h = GV.hunt.state(this.hunt.week), time = Math.round(this.t);
      const first = !h.claimed;
      h.best = h.best == null ? time : Math.min(h.best, time);
      const x = b.x + b.w / 2, y = b.y + b.h / 2;
      if (first) {
        h.claimed = true; F().trophies = (F().trophies || 0) + 1;
        const d = GV.save.data;
        const pending = new Set(this.drops.map((x) => x.wid)), ex = Object.keys(GV.WEAPONS).filter((k) => GV.WEAPONS[k].exotic === this.hunt.id && !d.weapons.includes(k) && !pending.has(k));
        if (ex.length && this.dropExoPiece) { this.dropExoPiece(x, y, this.hunt.id); this.dropExoPiece(x + 30, y, this.hunt.id); }
        else d.orbs = (d.orbs || 0) + 3;
        this.drops.push({ x: x + 40, y, vx: 120, vy: -520, w: 14, h: 14, kind: 'item', item: GV.items.randomSet(3), age: 0 });
        d.cur.exalt = (d.cur.exalt || 0) + 3;
        F().marks += 25;
      }
      this.huntResult = { week: this.hunt.week, mods: this.hunt.mods, time, first, best: h.best };
      bountyEvent('hunt', 1);
      GV.save.write();
    }
    return r;
  };

  // ================= BOUNTIES =================
  const BTYPES = {
    kill: { text: (n) => `Cull ${n} creatures`, n: (r, f) => 40 + Math.round(r() * 30) + f * 10, marks: 8 },
    elite: { text: (n) => `Slay ${n} elites`, n: (r) => 3 + Math.floor(r() * 3), marks: 12 },
    boss: { text: (n) => `Defeat ${n} stage boss${n > 1 ? 'es' : ''}`, n: (r) => 1 + Math.floor(r() * 2), marks: 14 },
    clear: { text: (n) => `Clear ${n} stages`, n: () => 2, marks: 10 },
    depth: { text: (n) => `Reach depth ${n} in the Void Depths`, n: (r) => 3 + Math.floor(r() * 4), marks: 16 },
    mem: { text: (n) => `Gather ${n} memories`, n: (r, f) => (300 + Math.round(r() * 300)) * (1 + f), marks: 8 },
  };
  GV.bounty = {
    board() {
      const f = F(), day = GV.daily.today();
      if (!f.bounty || f.bounty.day !== day) {
        const r = U.rng(U.hash('bounty:' + day)), fr = GV.progress.frontier(), ks = Object.keys(BTYPES), list = [];
        while (list.length < 3) {
          const k = ks[Math.floor(r() * ks.length)];
          if (list.some((b) => b.k === k)) continue;
          const n = BTYPES[k].n(r, fr);
          list.push({ k, n, got: 0, done: false, claimed: false, marks: BTYPES[k].marks + Math.floor(r() * 5) });
        }
        f.bounty = { day, list };
      }
      return f.bounty;
    },
  };
  function bountyEvent(k, v) {
    const B = GV.bounty.board();
    for (const b of B.list) {
      if (b.k !== k || b.done) continue;
      if (k === 'depth') b.got = Math.max(b.got, v); else b.got += v;
      if (b.got >= b.n) { b.got = b.n; b.done = true; const p = GV.game && GV.game.play; if (p) { p.toast('Bounty complete', 2.2, 'small'); p.toasts[p.toasts.length - 1].color = '#ffd36b'; } }
    }
  }
  const emit0 = GV.quests.emit;
  GV.quests.emit = function (ev, data) {
    const r = emit0.apply(this, arguments);
    try {
      if (ev === 'kill') { bountyEvent('kill', 1); if (data && data.elite) bountyEvent('elite', 1); }
      if (ev === 'boss' && data && data.type !== 'titan' && !data.trial) bountyEvent('boss', 1);
      if (ev === 'clear') bountyEvent('clear', 1);
      if (ev === 'mem') bountyEvent('mem', data || 0);
    } catch (e) {}
    return r;
  };
  const SHOP = [
    { k: 'set', name: 'A set piece', desc: 'One piece of a random armour set, at your best tier.', cost: 30 },
    { k: 'nova', name: 'A Nova item', desc: 'A Nova-tier item with one supercharged modifier.', cost: 15 },
    { k: 'core', name: 'Tier 3 Star Core blank', desc: 'Format it into any Star Core.', cost: 20 },
    { k: 'aug', name: 'Tier 3 Augment blank', desc: 'Format it into any Augment.', cost: 20 },
    { k: 'exotic', name: 'An exotic weapon', desc: 'A Titan exotic you don\'t own yet.', cost: 80 },
  ];
  function buy(k) {
    const d = GV.save.data, tier = Math.max(2, GV.progress.dropTier(GV.progress.frontier() * 3 + 2));
    if (k === 'set') { const it = GV.items.randomSet(tier); GV.items.add(it); return it.name; }
    if (k === 'nova') { let it; for (let i = 0; i < 80; i++) { it = GV.items.roll(tier, {}); if (it.rarity === 'nova') break; } GV.items.add(it); return it.name; }
    if (k === 'core') { d.uncut.push({ kind: 'skill', tier: 3 }); return 'Tier 3 Star Core blank'; }
    if (k === 'aug') { d.uncut.push({ kind: 'support', tier: 3 }); return 'Tier 3 Augment blank'; }
    if (k === 'exotic') { const ts = [...new Set((GV.EXOTICS || []).map((w) => GV.WEAPONS[w].exotic))]; if (!ts.length || !GV.fab) return null; const pk = GV.fab.pick(ts[Math.floor(Math.random() * ts.length)], d); return pk ? 'Exotic piece · ' + GV.fab.grant(pk[0], pk[1], d) : null; }
  }

  // ================= SCREENS =================
  let msg = '';
  const fmtT = (s) => (s == null ? '—' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
  M.frontier = function () {
    const f = F(), B = GV.bounty.board(), dOpen = GV.save.data.shipFound || GV.save.data.cleared['0-2'];
    const hOpen = GV.hunt.open(), H = GV.hunt.info(), HS = GV.hunt.state(), T = GV.TITANS[H.id];
    const bl = B.list.map((b, i) => `<div class="row bounty ${b.claimed ? 'claimed' : b.done ? 'done' : ''}"><div class="ri"><b>${esc(BTYPES[b.k].text(b.n))}</b>
      <div class="bar"><i style="width:${Math.round((b.got / b.n) * 100)}%"></i></div><em>${b.got} / ${b.n} · ${b.marks} marks</em></div>
      ${b.claimed ? '<button disabled>Claimed</button>' : `<button class="${b.done ? 'primary' : ''}" data-a="claim" data-i="${i}" ${b.done ? '' : 'disabled'}>${b.done ? 'Claim' : 'In progress'}</button>`}</div>`).join('');
    const shop = SHOP.map((s) => `<div class="row"><div class="ri"><b>${esc(s.name)}</b><span>${esc(s.desc)}</span></div><button data-a="buy" data-k="${s.k}" ${f.marks < s.cost ? 'disabled' : ''}>${s.cost} ◆</button></div>`).join('');
    M.render(`
      <div class="screen panel wide frontier">
        <h2>The Frontier</h2>
        ${msg ? `<p class="ok">${esc(msg)}</p>` : ''}
        <div class="fcards">
          <div class="fcard depths ${dOpen ? '' : 'locked'}">
            <b>Void Depths</b><span>An endless descent. Every depth is a new stage, harder than the last, with its own twists. Rewards every depth, a cache every fifth. Die and the run ends.</span>
            <em>Deepest: ${f.depthBest || '—'} · Dives: ${f.depthRuns || 0}</em>
            <button class="${dOpen ? 'primary' : ''}" data-a="depths" ${dOpen ? '' : 'disabled'}>${dOpen ? 'Descend' : 'Find the Lantern first'}</button>
          </div>
          <div class="fcard hunt ${hOpen ? '' : 'locked'}" style="--tc:${T.color}">
            <b>Weekly Titan Hunt</b><span>${hOpen ? `This week: <i style="color:${T.color}">${GV.titanAwake(H.sys) ? 'Awakened ' : ''}${esc(T.name)}</i>, ${H.mods.map((k) => `<i style="color:${HMODS[k].color}">${HMODS[k].name}</i> (${HMODS[k].desc.toLowerCase()})`).join(' and ')}. First kill each week: an exotic, a set piece and 25 marks.` : 'Fell any Titan to join the hunt.'}</span>
            <em>Week of ${H.label} · Best time: ${fmtT(HS.best)} · ${HS.claimed ? 'Reward claimed' : 'Reward waiting'} · Trophies: ${f.trophies || 0}</em>
            <button class="${hOpen ? 'primary' : ''}" data-a="hunt" ${hOpen ? '' : 'disabled'}>${hOpen ? 'Hunt' : 'Locked'}</button>
          </div>
        </div>
        <div class="fcols">
          <div><div class="gsub">Bounty Board <span>new contracts daily</span></div><div class="rows">${bl}</div></div>
          <div><div class="gsub">Marks Exchange <span>◆ ${f.marks} marks</span></div><div class="rows">${shop}</div></div>
        </div>
        <div class="menu row"><button data-a="back">Back</button></div>
      </div>`, (a, b) => {
      if (a === 'back') { msg = ''; return GV.game.toMap(); }
      if (a === 'depths') { msg = ''; return G.startDepths(1); }
      if (a === 'hunt') { msg = ''; return G.startHunt(); }
      if (a === 'claim') { const x = B.list[+b.dataset.i]; if (x && x.done && !x.claimed) { x.claimed = true; f.marks += x.marks; f.marksEarned = (f.marksEarned || 0) + x.marks; msg = `+${x.marks} marks`; GV.save.write(); GV.audio.sfx('level'); } return M.frontier(); }
      if (a === 'buy') { const s = SHOP.find((x) => x.k === b.dataset.k); if (s && f.marks >= s.cost) { const got = buy(s.k); if (got) { f.marks -= s.cost; msg = `Got: ${got}`; GV.save.write(); GV.audio.sfx('level'); } else msg = 'You already own every exotic.'; } return M.frontier(); }
    }, () => GV.game.toMap());
  };

  const clear0 = M.clear;
  M.clear = function (info) {
    if (info.depths) {
      const mods = (n) => depthMods(n, info.seed);
      const nx = mods(info.depth + 1);
      return M.render(`<div class="screen panel narrow clear depthclear">
        <h2>Depth ${info.depth} cleared</h2><div class="sub">The Void Depths${info.newBest ? ' · new deepest!' : ''}</div>
        <div class="how"><div><b>Memories</b><span>${memIcon} ${info.mem}</span></div><div><b>Depth bonus</b><span>${memIcon} ${info.bonus}</span></div><div><b>Kills</b><span>${info.kills}</span></div></div>
        ${info.got.length ? `<p class="ok">Depth cache: ${info.got.map(esc).join(', ')}</p>` : ''}
        <p class="muted">Below: depth ${info.depth + 1}${nx.length ? ' · ' + nx.map((k) => `<b style="color:${DMODS[k].color}">${DMODS[k].name}</b> (${DMODS[k].desc.toLowerCase()})`).join(' · ') : ''}${(info.depth + 1) % 5 === 0 ? ' · <b style="color:#ffd36b">a cache waits at the bottom</b>' : ''}</p>
        <div class="menu"><button class="primary" data-a="down">Descend</button><button data-a="out">Surface (end the dive)</button></div></div>`, (a) => {
        if (a === 'down') G.startDepths(info.depth + 1, info.seed);
        if (a === 'out') { GV.game.toMap(); if (GV.hall && GV.hall.openStation) GV.hall.openStation('board'); else M.frontier(); }
      });
    }
    if (info.hunt) {
      const h = info.hunt, T = GV.TITANS[info.titan];
      return M.render(`<div class="screen panel narrow clear titanclear" style="--tc:${T.color}">
        <h2>Hunt complete</h2><div class="sub">${esc(T.name)} · week of ${weekLabel(h.week)}</div>
        <div class="how"><div><b>Time</b><span>${fmtT(h.time)}</span></div><div><b>Best this week</b><span>${fmtT(h.best)}</span></div><div><b>Memories</b><span>${memIcon} ${info.mem}</span></div></div>
        <p>${h.first ? 'First kill this week: the exotic, a set piece, 3 Star Embers and 25 marks are yours.' : 'The weekly reward is already claimed. Hunt again to beat your time.'}</p>
        <div class="menu"><button class="primary" data-a="f">Frontier</button><button data-a="again">Hunt again</button></div></div>`, (a) => {
        if (a === 'f') { GV.game.toMap(); if (GV.hall && GV.hall.openStation) GV.hall.openStation('board'); else M.frontier(); }
        if (a === 'again') G.startHunt();
      });
    }
    return clear0.call(this, info);
  };
  const dead0 = M.dead;
  M.dead = function () {
    const p = GV.game.play;
    if (p && p.depth) {
      const f = F();
      return M.render(`<div class="screen panel narrow dead">
        <h2>Lost in the Depths</h2>
        <p>The Void took you at depth ${p.depth.n}. Deepest ever: ${f.depthBest || 0}. What you carried out stays with you.</p>
        <div class="menu"><button class="primary" data-a="again">Dive again</button><button data-a="f">Frontier</button></div></div>`, (a) => {
        if (a === 'again') G.startDepths(1);
        if (a === 'f') { GV.game.toMap(); if (GV.hall && GV.hall.openStation) GV.hall.openStation('board'); else M.frontier(); }
      });
    }
    if (p && p.hunt) {
      return M.render(`<div class="screen panel narrow dead"><h2>The hunt failed</h2><p>It shrugged you off. The week isn't over.</p>
        <div class="menu"><button class="primary" data-a="again">Hunt again</button><button data-a="f">Frontier</button></div></div>`, (a) => {
        if (a === 'again') G.startHunt();
        if (a === 'f') { GV.game.toMap(); if (GV.hall && GV.hall.openStation) GV.hall.openStation('board'); else M.frontier(); }
      });
    }
    return dead0.call(this);
  };
})();
