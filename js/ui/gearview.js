// Galactic Void — the Gear screen: four equipped slots, the inventory, comparisons against what
// you're wearing, equip and salvage.
(function () {
  const GV = window.GV;
  let from = 'map', sel = null, filter = 'all', crafting = false, craftMsg = '';

  function close() {
    GV.save.write();
    if (from === 'play') GV.game.resume();
    else if (from === 'pause') { if (GV.game.play) GV.game.play.player.recalc(); GV.menus.pause(); }
    else GV.menus.map();
  }

  const modLines = (it) => GV.items.lines(it).map((l) => `<li>${GV.menus.esc(l)}</li>`).join('');

  // Line-by-line difference against the item currently in the same slot.
  function compare(it) {
    const d = GV.save.data, cur = GV.items.get(d.equip[it.slot]);
    if (!cur || cur.uid === it.uid) return '';
    const keys = new Set([...Object.keys(it.mods), ...Object.keys(cur.mods)]);
    const rows = [];
    for (const k of keys) {
      const dv = (it.mods[k] || 0) - (cur.mods[k] || 0);
      if (Math.abs(dv) < 0.05) continue;
      const txt = k === 'airJump' ? `${dv > 0 ? '+' : ''}${dv} air jump` : GV.STATS.fmt(k, Math.round(dv * 10) / 10);
      rows.push(`<li class="${dv > 0 ? 'up' : 'down'}">${dv > 0 ? '▲' : '▼'} ${GV.menus.esc(txt)}</li>`);
    }
    return `<div class="cmp"><div class="gsub">Compared with ${GV.menus.esc(cur.name)}</div><ul>${rows.join('') || '<li>Same stats</li>'}</ul></div>`;
  }

  function card(it, opts = {}) {
    const esc = GV.menus.esc, eq = GV.save.data.equip[it.slot] === it.uid;
    return `<button class="item ${it.rarity} ${sel === it.uid ? 'sel' : ''} ${eq ? 'eq' : ''}" data-a="sel" data-u="${it.uid}" style="--rc:${GV.items.color(it)}">
      <span class="ih"><b>${esc(it.name)}</b><small><span class="rar" style="color:${GV.items.color(it)}">${esc(GV.items.rarityName(it))}</span> · ${GV.SLOTS[it.slot].icon} ${esc(it.base)} · T${it.tier}${eq ? ' · equipped' : ''}</small></span>
      ${opts.full ? `<ul>${modLines(it)}</ul>${it.flavor ? `<em>${esc(it.flavor)}</em>` : ''}` : ''}
    </button>`;
  }

  // A set's bonuses, lit up for however many pieces you're wearing.
  function setBox(id) {
    const S = GV.SETS[id], st = GV.setState(GV.save.data), n = st.count[id] || 0;
    const rows = Object.keys(S.bonus).map((k) => `<div class="${n >= +k ? 'on' : 'off'}">(${k}) ${GV.menus.esc(S.bonus[k].text)}</div>`).join('');
    return `<div class="setbox" style="--sc:${S.color}"><b>${GV.menus.esc(S.name)} set · ${n}/${S.pieces ? S.pieces.length : 2} worn</b>${rows}</div>`;
  }

  function render() {
    const M = GV.menus, d = GV.save.data, esc = M.esc;
    let slots = '';
    for (const s in GV.SLOTS) {
      const it = GV.items.get(d.equip[s]);
      slots += it ? card(it, { full: true }) : `<div class="item empty"><span class="ih"><b>${GV.SLOTS[s].icon} ${GV.SLOTS[s].name}</b><small>Empty</small></span></div>`;
    }
    const tabs = ['all', ...Object.keys(GV.SLOTS)].map((k) => `<button class="tab ${filter === k ? 'sel' : ''}" data-a="filter" data-k="${k}">${k === 'all' ? 'All' : GV.SLOTS[k].name}</button>`).join('');
    const eqSet = new Set(Object.values(d.equip));
    const inv = d.items.filter((i) => !eqSet.has(i.uid) && (filter === 'all' || i.slot === filter))
      .sort((a, b) => GV.items.value(b) - GV.items.value(a));
    const it = GV.items.get(sel);
    let detail = '<p class="note">Select an item to see its stats, compare it with what you\'re wearing, and equip or salvage it.</p>';
    if (it) {
      const eq = d.equip[it.slot] === it.uid;
      detail = `${card(it, { full: true })}${compare(it)}
        <div class="menu row left">
          <button class="primary" data-a="equip">${eq ? 'Unequip' : 'Equip'}</button>
          ${it.set ? setBox(it.set) : ''}
          ${it.rarity !== 'unique' ? `<button data-a="craft">${crafting ? 'Close crafting' : 'Craft'}</button>` : ''}
          ${eq ? '' : `<button data-a="salvage">Salvage · ${GV.items.value(it)} ✦</button>`}
        </div>
        ${crafting ? `<div class="craft">${craftMsg ? `<p class="warn">${esc(craftMsg)}</p>` : ''}${Object.keys(GV.CURRENCY).map((k) => {
          const c = GV.CURRENCY[k], n = d.cur[k] || 0;
          return `<button class="cur" data-a="use" data-k="${k}" ${n ? '' : 'disabled'} style="--rc:${c.color}"><b>${c.name} ×${n}</b><span>${esc(c.desc)}</span></button>`;
        }).join('')}<p class="note">Buy more from Vesper. Elites and bosses drop them too.</p></div>` : ''}`;
    }
    const totals = GV.items.stats();
    const totalLines = Object.keys(totals).map((k) => `<li>${esc(k === 'airJump' ? `+${totals[k]} air jump` : GV.STATS.fmt(k, totals[k]))}</li>`).join('');
    M.render(`
      <div class="screen panel gear">
        <div class="topbar"><h2>Gear</h2><div class="stats">${d.items.length}/${GV.items.MAX_INV} items · ✦ ${d.memories}</div></div>
        <div class="gslots">${slots}</div>
        <div class="gcols">
          <div class="ginv"><div class="tabs">${tabs}</div><div class="ilist">${inv.map((x) => card(x)).join('') || '<p class="note">Nothing here. Enemies, rifts and bosses drop gear.</p>'}</div>
            ${inv.length > 1 ? `<div class="menu row left"><button class="ghost" data-a="salvageMagic">Salvage all Salvaged &amp; Calibrated</button></div>` : ''}</div>
          <div class="gdetail">${detail}${totalLines ? `<div class="gsub">Total from gear</div><ul class="totals">${totalLines}</ul>` : ''}</div>
        </div>
        <div class="menu row"><button class="primary" data-a="done">Done</button></div>
      </div>`, onAction, close);
  }

  function onAction(a, b) {
    const d = GV.save.data;
    if (a === 'done') return close();
    if (a === 'sel') { if (sel !== +b.dataset.u) craftMsg = ''; sel = +b.dataset.u; }
    if (a === 'craft') { crafting = !crafting; craftMsg = ''; }
    if (a === 'use' && sel != null) { craftMsg = GV.items.craft(GV.items.get(sel), b.dataset.k) || ''; if (!craftMsg) GV.audio.sfx('level'); else GV.audio.sfx('hurt'); }
    if (a === 'filter') filter = b.dataset.k;
    if (a === 'equip' && sel != null) { GV.items.equip(sel); GV.audio.sfx('level'); }
    if (a === 'salvage' && sel != null) {
      if (!b.dataset.armed && GV.items.get(sel).rarity !== 'magic') { b.dataset.armed = '1'; b.textContent = 'Tap again to salvage'; b.classList.add('danger'); return; }
      GV.items.salvage(sel); sel = null; GV.audio.sfx('mem');
    }
    if (a === 'salvageMagic') {
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again: salvage every unequipped Salvaged/Calibrated item'; b.classList.add('danger'); return; }
      const eq = new Set(Object.values(d.equip));
      for (const it of d.items.slice()) if ((it.rarity === 'magic' || it.rarity === 'normal') && !it.set && !eq.has(it.uid)) GV.items.salvage(it.uid);
      sel = null; GV.audio.sfx('mem');
    }
    render();
  }

  GV.gearView = { open(f) { from = f || 'map'; sel = null; render(); } };
})();
