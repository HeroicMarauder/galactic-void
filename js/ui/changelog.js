// Galactic Void — "How far we've come": a short, newest-first history of updates down the left
// side of the title screen. Add a new entry at the top of LOG with every release.
(function () {
  const GV = window.GV;
  const LOG = [
    { d: 'Nov 27', t: 'Impact', s: 'Ichor, chunks, sparks and stardust fly off what you hit (with a setting to tone it down), every sound effect rebuilt, a Sound Lab for your own sounds, and stacked cores.' },
    { d: 'Nov 27', t: 'The Workshop', s: 'Four crafting benches for armour, blades, guns and Star Cores, a class filter on every kit list, and smoother menus.' },
    { d: 'Nov 27', t: 'Steady Growth', s: 'Star Cores level more slowly and stay within 2 levels of your rank, and Whirlwind now uses Blade Arts.' },
    { d: 'Nov 27', t: 'Skill Arts', s: 'Star Cores learn combo bonuses, new move styles and Finishers as they level, and only the cores you use earn experience.' },
    { d: 'Nov 27', t: 'Melee Rebalanced', s: 'Attune Void Strike to the element you like, melee hits can arc to a second enemy, and melee classes take less damage up close.' },
    { d: 'Nov 27', t: 'The Drop Tube', s: 'Missions launch from a glass tube that spits your pod into space, then it burns in to land at the stage start. The Lantern got a new hull and lights.' },
    { d: 'Nov 27', t: 'Healers and Hidden Ways', s: 'Healing cores and Augments, six new damage cores, Frontier tree wheels, hidden climbable passages, explosive pods, and Void Conduits.' },
    { d: 'Nov 26', t: 'Character Creator', s: 'Name your character, pick a build, colours, helmet style and markings, and take the helmet off to show your face. Couch Player 2 gets one too.' },
    { d: 'Nov 26', t: 'Six Races', s: 'Choose Human, Synth, Voidborn, Kethari, Lumari or Drakkari: each has its own look and one small perk.' },
    { d: 'Nov 26', t: 'The Fabricator', s: 'A new workbench on the Lantern turns salvage into materials, levels up to Master, and assembles exotics from the pieces Titans drop.' },
    { d: 'Nov 26', t: 'Found, Not Bought', s: 'Vesper only sells standard-issue weapons now. Everything better drops from enemies and bosses, with a Weapons screen and Vault space to manage them.' },
    { d: 'Nov 26', t: 'Fair Fight', s: 'Any class can use guns and bows as its basic attack, the Engineer\'s minions were reined in, and the Paladin hits harder.' },
    { d: 'Nov 26', t: 'The Armoury', s: 'Thirteen new weapons: rifles, a sniper, a shotgun, a grenade launcher, a laser cannon, a bow, crossbows, SMGs, a hand cannon and new blades to dual-wield.' },
    { d: 'Nov 26', t: 'Phase Through', s: 'A new Augment lets strikes and projectiles hit the first enemy in full, then carry on through the rest of the line.' },
    { d: 'Nov 26', t: 'Graviton Pulse', s: 'Monk punches now throw a short, fast-fading pulse past the fist, so his reach roughly triples without losing the brawler feel.' },
    { d: 'Nov 26', t: 'Every Angle', s: 'Strikes, slams, charges and Comet Drop follow your aim all the way around, the Monk is sturdier, and the first boss is a fairer teacher.' },
    { d: 'Nov 26', t: 'Update Log', s: 'This panel: a quick look back at every update, newest first.' },
    { d: 'Nov 26', t: 'Phone Controls', s: 'Drag a skill to aim it, tap to auto-target, and the buttons are spread out so Jump and Dash stop colliding.' },
    { d: 'Nov 26', t: 'Legacy & Ascension', s: 'Up to 8 characters with a shared Legacy, leaner loot, slower and more rewarding levels, and Ascension Trials.' },
    { d: 'Nov 26', t: 'Hard Vacuum', s: 'Tougher enemies and bosses, a less overpowered player, and Titan gates marked on the war table.' },
    { d: 'Nov 25', t: 'The Great Expansion', s: 'A 500-node passive tree, ascendancy trees, minion skills, inventory and shop filters, and update notices.' },
    { d: 'Nov 25', t: 'First Fixes', s: 'Correct keybind hints, full tree access for the Symbiote and Cryo Lancer, and no more stalling Hollow Warden.' },
    { d: 'Nov 25', t: 'Launch on the Web', s: 'Galactic Void got its own website, Google sign-in, cloud saves and a privacy page.' },
    { d: 'Earlier', t: 'Together in the Void', s: 'Friends, guilds, online co-op, the Shared Vault and player trading.' },
    { d: 'Earlier', t: 'The Frontier', s: 'Titan hunts, anomalies, rifts, achievements and the Codex.' },
    { d: 'Earlier', t: 'Five New Classes', s: 'The Cryo Lancer, Void Engineer, Graviton Monk, Starcaller and Symbiote joined the original three.' },
    { d: 'Earlier', t: 'The Ship', s: 'A walkable ship with a star map, Vesper\'s Trade, crew quests and the war table.' },
    { d: 'Earlier', t: 'The Soundtrack', s: 'Original albums play through the stages, with your own in-game radio.' },
    { d: 'The beginning', t: 'Into the Void', s: 'A lone spaceman, swarming gauntlet stages, skill gems, a passive tree, and the Ranger, Knight and Paladin.' },
  ];
  const KEY = 'gv_log_open';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let el = null;

  function isOpen() {
    let v = null; try { v = localStorage.getItem(KEY); } catch (e) {}
    if (v === '1') return true; if (v === '0') return false;
    return !(GV.input && GV.input.isTouch) && innerWidth > 900; // phones start folded
  }
  function build() {
    el = document.createElement('aside');
    el.id = 'gvLog';
    el.innerHTML = `<button class="lgHead" type="button" aria-expanded="false"><span class="lgK">Update log</span><b>How far we've come</b><i class="lgArr">‹</i></button>
      <ol class="lgList">${LOG.map((e, i) => `<li class="${i === 0 ? 'latest' : ''}"><span class="lgD">${esc(e.d)}${i === 0 ? ' · <em>Latest</em>' : ''}</span><b>${esc(e.t)}</b><p>${esc(e.s)}</p></li>`).join('')}</ol>
      <div class="lgFoot">${LOG.length} updates and counting</div>`;
    el.querySelector('.lgHead').addEventListener('click', (ev) => {
      ev.stopPropagation();
      const open = !el.classList.contains('open');
      el.classList.toggle('open', open);
      el.querySelector('.lgHead').setAttribute('aria-expanded', open);
      try { localStorage.setItem(KEY, open ? '1' : '0'); } catch (e) {}
    });
    if (isOpen()) { el.classList.add('open'); el.querySelector('.lgHead').setAttribute('aria-expanded', 'true'); }
    document.body.appendChild(el);
  }
  // shown only on the title screen
  function sync() {
    const on = !!document.querySelector('#ui .title') && !document.body.classList.contains('playing');
    if (on && !el) build();
    if (el) el.classList.toggle('on', on);
  }
  let q = 0; const later = () => { if (!q) q = requestAnimationFrame(() => { q = 0; sync(); }); };
  new MutationObserver(later).observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
  addEventListener('load', sync);
  GV.changelog = { LOG, sync };
})();
