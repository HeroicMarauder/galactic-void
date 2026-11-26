// Galactic Void — achievements and the Daily Rift. Achievements are checked against the save
// (cheap), so they also unlock retroactively for long-time players. Each pays out memories.
(function () {
  const GV = window.GV;
  const d = () => GV.save.data;
  const st = () => (d().stats = d().stats || {});
  const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
  const kills = () => sum(d().codex && d().codex.kills);
  const elites = () => (d().codex && d().codex.elites) || 0;

  GV.ACH = [
    { id: 'kills100', name: 'Thinning the Swarm', desc: 'Destroy 100 creatures', icon: '✕', mem: 40, test: () => kills() >= 100, prog: () => [kills(), 100] },
    { id: 'kills1000', name: 'Exterminator', desc: 'Destroy 1,000 creatures', icon: '✕', mem: 200, test: () => kills() >= 1000, prog: () => [kills(), 1000] },
    { id: 'elites25', name: 'Elite Hunter', desc: 'Destroy 25 elites', icon: '◆', mem: 120, test: () => elites() >= 25, prog: () => [elites(), 25] },
    { id: 'brood', name: 'Matricide', desc: 'Defeat the Brood Matron', icon: '☠', mem: 30, test: () => !!d().cleared['0-0'] },
    { id: 'ship', name: 'Lantern Lit', desc: 'Find the lost ship', icon: '⛭', mem: 60, test: () => !!d().shipFound },
    { id: 'powers', name: 'Phase and Grip', desc: 'Earn both suit powers', icon: '»', mem: 60, test: () => !!(d().abilities.dash && d().abilities.grip) },
    { id: 'warden', name: 'He Held the Line', desc: 'Lay the Hollow Warden to rest', icon: '☠', mem: 100, test: () => !!d().cleared['0-2'] },
    { id: 'leviathan', name: 'Deep Water', desc: 'Defeat a Rift Leviathan', icon: '≋', mem: 100, test: () => (st().boss_leviathan || 0) > 0 },
    { id: 'choir', name: 'Silence', desc: 'Defeat a Pale Choir', icon: '♪', mem: 100, test: () => (st().boss_choir || 0) > 0 },
    { id: 'bosses10', name: 'Giant Killer', desc: 'Defeat 10 bosses (Trial bosses count)', icon: '♛', mem: 150, test: () => (st().bosses || 0) >= 10, prog: () => [st().bosses || 0, 10] },
    { id: 'flawless', name: 'Untouchable', desc: 'Defeat a stage boss without being hit', icon: '✧', mem: 200, test: () => !!st().flawless },
    { id: 'frontier', name: 'Frontier', desc: 'Reach the third system', icon: '✷', mem: 150, test: () => GV.progress.frontier() >= 2 },
    { id: 'trial10', name: 'Rift Walker', desc: 'Survive 10 Rift Trial waves', icon: '◎', mem: 100, test: () => (d().trialBest || 0) >= 10, prog: () => [d().trialBest || 0, 10] },
    { id: 'trial25', name: 'Rift Lord', desc: 'Survive 25 Rift Trial waves', icon: '◎', mem: 300, test: () => (d().trialBest || 0) >= 25, prog: () => [d().trialBest || 0, 25] },
    { id: 'cursed', name: 'Glutton for Punishment', desc: 'Survive 5 Trial waves with 3 or more curses', icon: '☄', mem: 200, test: () => !!st().cursed5 },
    { id: 'daily', name: 'Daily Diver', desc: 'Claim a Daily Rift reward', icon: '☀', mem: 40, test: () => !!(d().daily && d().daily.claims) },
    { id: 'streak3', name: 'Creature of Habit', desc: 'Reach a 3-day Daily Rift streak', icon: '☀', mem: 150, test: () => ((d().daily || {}).streak || 0) >= 3, prog: () => [(d().daily || {}).streak || 0, 3] },
    { id: 'ascend', name: 'Ascended', desc: 'Choose an Ascendancy', icon: '▲', mem: 80, test: () => !!(d().asc && d().asc.sub) },
    { id: 'crafter', name: 'Tinkerer', desc: 'Use 25 crafting currencies', icon: '⚒', mem: 100, test: () => (st().crafts || 0) >= 25, prog: () => [st().crafts || 0, 25] },
    { id: 'shipwright', name: 'Shipwright', desc: 'Buy 10 Lantern upgrades', icon: '⛭', mem: 150, test: () => sum(d().ship) >= 10, prog: () => [sum(d().ship), 10] },
    { id: 'archivist', name: 'Archivist', desc: 'Recover every crew log', icon: '✎', mem: 250, test: () => d().codex && d().codex.logs.length >= GV.LOGS.length, prog: () => [(d().codex || { logs: [] }).logs.length, GV.LOGS.length] },
    { id: 'rank20', name: 'Veteran', desc: 'Reach rank 20', icon: '★', mem: 150, test: () => (d().level || 1) >= 20, prog: () => [d().level || 1, 20] },
  ];

  let toastEl = null, toastQ = [], toastBusy = false;
  function domToast(a) {
    toastQ.push(a);
    if (toastBusy) return;
    const showNext = () => {
      const x = toastQ.shift();
      if (!x) { toastBusy = false; return; }
      toastBusy = true;
      if (!toastEl) { toastEl = document.createElement('div'); toastEl.id = 'achToast'; document.body.appendChild(toastEl); }
      toastEl.innerHTML = `<span class="ai">${x.icon}</span><div><small>Achievement</small><b>${x.name}</b><span>+${x.mem} ✦</span></div>`;
      toastEl.className = 'show';
      setTimeout(() => { toastEl.className = ''; setTimeout(showNext, 450); }, 3200);
    };
    showNext();
  }

  GV.ach = {
    count() { return Object.keys(d().ach || {}).length; },
    has(id) { return !!(d().ach || {})[id]; },
    // Unlock anything newly earned. quiet: no toast (used at boot for old saves).
    check(quiet) {
      const D = d(); D.ach = D.ach || {};
      const got = [];
      for (const a of GV.ACH) {
        if (D.ach[a.id]) continue;
        let ok = false; try { ok = a.test(); } catch (e) {}
        if (!ok) continue;
        D.ach[a.id] = Date.now(); D.memories += a.mem; got.push(a);
      }
      if (got.length) {
        GV.save.write(quiet === true);
        if (!quiet) for (const a of got) { domToast(a); GV.audio.sfx('level'); }
      }
      return got;
    },
  };

  // Count successful crafts.
  const craft0 = GV.items.craft;
  GV.items.craft = function () { const r = craft0.apply(this, arguments); if (!r) { st().crafts = (st().crafts || 0) + 1; GV.quests && GV.quests.emit('craft'); } return r; };

  // ---------- Daily Rift: one seeded Trial per day, the same for everyone ----------
  const ymd = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  GV.daily = {
    today() { return ymd(new Date()); },
    yesterday() { const t = new Date(); t.setDate(t.getDate() - 1); return ymd(t); },
    seed(key) { return GV.util.hash('daily:' + (key || this.today())); },
    // Today's curses: two of them, picked by the date.
    curses(key) {
      const ks = Object.keys(GV.TRIAL_CURSES), s = this.seed(key), out = {};
      const a = s % ks.length, b = (a + 1 + ((s >>> 8) % (ks.length - 1))) % ks.length;
      out[ks[a]] = true; out[ks[b]] = true;
      return out;
    },
    state() {
      const D = d(); D.daily = D.daily || { date: '', best: 0, streak: 0, last: '', claimed: false, claims: 0 };
      if (D.daily.date !== this.today()) { D.daily.date = this.today(); D.daily.best = 0; D.daily.claimed = false; }
      if (D.daily.last && D.daily.last !== this.today() && D.daily.last !== this.yesterday()) D.daily.streak = 0;
      return D.daily;
    },
    GOAL: 5,
    reward(streak) { return Math.round(80 * (1 + 0.25 * Math.min(8, streak)) * (1 + GV.progress.frontier())); },
    // Called at the end of a daily run.
    finish(reached) {
      const S = this.state(), out = { goal: this.GOAL, reached, newBest: reached > S.best, claimed: false, reward: 0, streak: S.streak };
      if (reached > S.best) S.best = reached;
      if (reached >= this.GOAL && !S.claimed) {
        S.claimed = true; S.claims = (S.claims || 0) + 1;
        S.streak = S.last === this.yesterday() ? S.streak + 1 : 1;
        S.last = this.today();
        out.reward = this.reward(S.streak); out.claimed = true; out.streak = S.streak;
        d().memories += out.reward;
        d().cur = d().cur || {}; d().cur.chaos = (d().cur.chaos || 0) + 1;
      }
      return out;
    },
  };
})();

// The tutorial ghost's lessons, in order. Each finishes when you do the thing (on/need),
// walk far enough (dist), or after a while (time).
window.GV.TUTORIAL = [
  { kb: 'Move with {left} / {right}', touch: 'Slide the left pad to move', pad: 'Move with the left stick or D-pad', dist: 220 },
  { kb: 'Jump with {jump}. Jump again in the air', touch: 'Tap ⤒ to jump, and again in the air', pad: 'Press A to jump, and again in the air', on: ['jump'], need: 2, time: 12 },
  { kb: 'Attack with {attack}. Aim with the mouse', touch: 'Tap the big button to attack', pad: 'Press X to attack', on: ['attack'], need: 3, time: 12 },
  { kb: 'Skills: {skill1}, {skill2} and {skill3}. They spend charge', touch: 'Your skills are the smaller buttons', pad: 'Skills: Y, LB and RB', on: ['skill1', 'skill2', 'skill3'], need: 1, time: 12 },
  { kb: '{flask1} drinks a life flask, {flask2} a charge flask', touch: 'The red and blue vials are your flasks', pad: 'LT and RT drink your flasks', on: ['flask1', 'flask2'], need: 1, time: 9 },
  { kb: 'Grab the ✦ memories. They buy everything', touch: 'Grab the ✦ memories. They buy everything', pad: 'Grab the ✦ memories. They buy everything', time: 6 },
  { kb: 'The rifts never stop. Push on to the boss', touch: 'The rifts never stop. Push on to the boss', pad: 'The rifts never stop. Push on to the boss', dist: 500, time: 10 },
];
