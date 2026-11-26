// Galactic Void — onboarding tips. Short cards that appear once, the first time each system shows
// up, instead of one long tutorial. They don't pause the game; they fade on their own or on "Got it".
(function () {
  const GV = window.GV, P = GV.Play.prototype, M = GV.menus, esc = M.esc, I = GV.input;
  const K = (a) => I.label(a);
  const touch = () => I.isTouch;
  const TIPS = {
    aim: { icon: '⌖', title: 'Aim where you point', body: () => touch() ? 'Drag a skill button to aim it, then let go to fire. Tap the open screen to point at something.' : `Your mouse aims every attack and skill. ${K('attack')} attacks, ${K('skill1')} uses slot 2. Aim up to strike overhead; aim down in mid-air to strike below and bounce.` },
    move: { icon: '⇄', title: 'Getting around', body: () => touch() ? 'Left pad moves. Jump twice for a double jump. Phase Dash makes you untouchable for a moment.' : `${K('left')} ${K('right')} to move, ${K('jump')} to jump (again in the air), ${K('dash')} to Phase Dash through danger.` },
    charge: { icon: '◇', title: 'Out of Charge', body: () => 'Skills cost Charge, the blue bar. Your basic attack is free and refills nothing, but Charge regenerates on its own, and the blue flask tops it up.' },
    flask: { icon: '⚗', title: 'Flasks', body: () => `Red heals (${K('flask1')}), blue restores Charge (${K('flask2')}). Kills refill them, and beacons refill everything.` },
    loot: { icon: '◆', title: 'Your first gear', body: () => `Items come in five tiers: Salvaged, Calibrated, Stellar, Nova and Singularity. Equip them in Gear (${K('gear')}); salvage the rest for memories.` },
    core: { icon: '✦', title: 'A Star Core', body: () => `Star Cores are your skills. Format blanks into new ones and socket Augments to change how they work, in Star Cores (${K('gems')}).` },
    set: { icon: '❖', title: 'A set piece', body: () => 'Pieces of the same set unlock bonuses at 2, 3 and 4 worn. The fourth is always something special. Check Gear to see which are lit.' },
    hands: { icon: '⚔', title: 'Two hands, three styles', body: () => 'At Vesper\'s Trade: a two-handed weapon hits 10% harder; a one-hander with a free hand crits more; a shield blocks; two one-handers attack faster and mix both weapons\' effects.' },
    death: { icon: '✚', title: 'Signal lost', body: () => 'You come back at the last beacon you touched, with whatever you were carrying. Beacons also refill your flasks.' },
    passive: { icon: '✧', title: 'Passive points', body: () => `You have points to spend. The passive tree (${K('tree')}) is where a build really takes shape.` },
    frontier: { icon: '✦', title: 'The Frontier is open', body: () => 'Void Depths (an endless descent), the Weekly Titan Hunt and daily Bounties live on the Departures board on your ship.' },
    lantern: { icon: '⌂', title: 'Life aboard the Lantern', body: () => 'The Lantern has Crew Quarters (permanent bonuses and a daily visit), a Hangar for companion drones, and a Wardrobe for suit dyes.' },
    titan: { icon: '☠', title: 'A Titan stirs', body: () => 'A Titan Gate has opened. Break its weak points to expose the core, then hit the core hard while it\'s open. Titans drop exotic weapons.' },
    macros: { icon: '⟳', title: 'Macros', body: () => 'Below the keybinds: a sequence fires a chain of skills from one key, and a repeat keeps using one on a timer. Each skill step waits until it\'s ready.' },
    hall: { icon: '⌂', title: 'Walk the deck', body: () => `Walk up to anything and press ${K('interact')}: the vault, armory, mirror, war table, sparring ring. Plan at the war table, then stand on the drop pod together to launch.` },
    guild: { icon: '♜', title: 'Guilds', body: () => 'A guild shares a bank with the same self-sorting tabs as your vault, a treasury, and a hall you can walk around with your guildmates.' },
    ng: { icon: '∞', title: 'Ascend the Void', body: () => 'All three Titans are down. On the Lantern you can now start New Game+: harder enemies, more memories, better loot, prestige dyes.' },
  };
  const seen = () => { const m = GV.save.main || GV.save.data; m.tips = m.tips || {}; return m.tips; };
  const off = () => GV.settings.data.tips === false;
  let queue = [], card = null, hideT = null;
  const T = (GV.tips = {
    show(id, force) {
      if (!TIPS[id] || (off() && !force)) return;
      if (!force && seen()[id]) return;
      seen()[id] = 1; try { GV.save.write(); } catch (e) {}
      if (queue.includes(id)) return;
      queue.push(id); if (!card) next();
    },
    reset() { const m = GV.save.main || GV.save.data; m.tips = {}; GV.save.write(); },
    list: () => Object.keys(TIPS),
  });
  function next() {
    const id = queue.shift(); if (!id) { card = null; return; }
    const t = TIPS[id];
    if (!card) { card = document.createElement('div'); card.id = 'tipCard'; document.body.appendChild(card); }
    card.className = '';
    card.innerHTML = `<i>${t.icon}</i><div><b>${esc(t.title)}</b><span>${esc(t.body())}</span></div><button>Got it</button>`;
    void card.offsetWidth; card.className = 'on';
    card.querySelector('button').onclick = (e) => { e.stopPropagation(); close(); };
    clearTimeout(hideT); hideT = setTimeout(close, 9000 + t.body().length * 25);
  }
  function close() { clearTimeout(hideT); if (!card) return; card.className = ''; const c = card; setTimeout(() => { if (queue.length) next(); else { c.remove(); if (card === c) card = null; } }, 260); }

  // ---------------- triggers ----------------
  const up0 = P.update;
  P.update = function (dt) {
    up0.call(this, dt);
    if (!GV.game || this !== GV.game.play || this.bench) return;
    const pl = this.player, s = seen();
    this._tipT = (this._tipT || 0) + dt;
    if (!s.move && this._tipT > 1.5) T.show('move');
    if (!s.aim && this._tipT > 1.5 && pl.aim && pl.aim.on) T.show('aim');
    if (!s.aim && this._tipT > 14 && !touch()) T.show('aim');
    if (!s.flask && pl.hp < pl.maxHp * 0.5 && !pl.dead) T.show('flask');
    if (!s.passive && this._tipT > 3 && GV.TREE.points() > 0) T.show('passive');
  };
  const text0 = P.text;
  P.text = function (x, y, txt) { if (txt === 'LOW CHARGE' && GV.game && this === GV.game.play) T.show('charge'); return text0.apply(this, arguments); };
  const give0 = P.giveDrop;
  P.giveDrop = function (dr, pl) {
    const r = give0.apply(this, arguments);
    if (dr.kind === 'item' && dr.item) { T.show('loot'); if (dr.item.set) T.show('set'); }
    if (dr.kind === 'gem' || dr.kind === 'uncut' || dr.kind === 'core') T.show('core');
    if (dr.kind === 'weapon') T.show('hands');
    return r;
  };
  const map0 = M.map;
  M.map = function () {
    const r = map0.apply(this, arguments);
    const d = GV.save.data, m = GV.save.main || d;
    if (d.shipFound) { T.show('lantern'); T.show('frontier'); }
    if (Object.keys(d.cleared || {}).some((k) => /-2$/.test(k))) T.show('titan');
    if (GV.ngReady && GV.ngReady()) T.show('ng');
    if ((d.weapons || []).filter((w) => GV.WEAPONS[w] && GV.WEAPONS[w].hand === 'one').length >= 2) T.show('hands');
    if ((d.uncut || []).length) T.show('core');
    return r;
  };
  const kb0 = M.keybinds;
  M.keybinds = function () { const r = kb0.apply(this, arguments); T.show('macros'); return r; };
  const dead0 = M.dead;
  M.dead = function () { const r = dead0.apply(this, arguments); const p = GV.game && GV.game.play; if (p && !p.depth && !p.hunt) T.show('death'); return r; };

  // ---------------- settings: on/off and replay ----------------
  const set0 = M.settings;
  M.settings = function (opts) {
    set0.call(this, opts);
    const fb = [...document.querySelectorAll('#ui .gsub')].find((g) => /Feedback/.test(g.textContent));
    if (!fb) return;
    const box = document.createElement('div');
    box.innerHTML = `<label class="tog"><input type="checkbox" id="tipsOn" ${off() ? '' : 'checked'}> Show tips when something new appears</label>
      <div class="menu row"><button id="tipsReset">Show all tips again</button></div>`;
    fb.parentNode.insertBefore(box, fb);
    box.querySelector('#tipsOn').addEventListener('change', (e) => GV.settings.set('tips', e.target.checked));
    box.querySelector('#tipsReset').addEventListener('click', (e) => { e.stopPropagation(); T.reset(); e.target.textContent = 'Tips will show again'; });
  };
})();
