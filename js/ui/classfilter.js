// Galactic Void — "filter by class": a rail of class buttons down the side of every list of skills,
// augments and weapons. Which class a thing suits comes from its tags (skills) or its make (weapons),
// plus every class's own starting kit.
(function () {
  const GV = window.GV;
  const F = GV.filters;
  const has = (d, ...t) => t.some((x) => (d.tags || []).includes(x));
  const all = (d, ...t) => t.every((x) => (d.tags || []).includes(x));

  // Skills: what each class's playstyle reaches for.
  const SKILL = {
    ranger: (d) => has(d, 'Stealth') || all(d, 'Attack', 'Projectile') || ['backstab', 'lunge', 'shadowstep'].includes(d.id),
    knight: (d) => (all(d, 'Attack', 'Melee') && !has(d, 'Shield', 'Slam')) || has(d, 'Channelling') || (has(d, 'Warcry') && !has(d, 'Minion')),
    paladin: (d) => (all(d, 'Attack', 'Melee') && !has(d, 'Channelling')) || has(d, 'Shield', 'Heal', 'Buff') || all(d, 'Fire', 'Area'),
    engineer: (d) => (has(d, 'Minion') && has(d, 'Projectile', 'Lightning')) || has(d, 'Lightning') || d.id === 'mine' || d.id === 'turret',
    starcaller: (d) => has(d, 'Spell') && !has(d, 'Minion', 'Heal', 'Stealth') && !(has(d, 'Movement')),
    monk: (d) => has(d, 'Slam') || all(d, 'Melee', 'Movement') || has(d, 'Warcry') || d.id === 'strike',
    symbiote: (d) => has(d, 'Minion', 'Heal') || all(d, 'Spell', 'Void'),
    lancer: (d) => has(d, 'Cold') || all(d, 'Attack', 'Projectile') || (all(d, 'Attack', 'Melee') && !has(d, 'Slam', 'Shield', 'Channelling')),
  };
  // Weapons by their make.
  const WPN = {
    ranger: ['pistol', 'dagger', 'rifle', 'sniper', 'smg', 'handcannon', 'bow', 'crossbow', 'handxbow', 'shotgun'],
    knight: ['greatblade', 'saber', 'katana', 'maul', 'pike', 'axe', 'shield'],
    paladin: ['mace', 'shield', 'maul', 'greatblade'],
    engineer: ['wrench', 'rifle', 'launcher', 'cannon', 'smg', 'shotgun', 'handcannon'],
    starcaller: ['staff', 'cannon', 'launcher', 'sniper'],
    monk: ['fist', 'staff', 'katana', 'pike'],
    symbiote: ['whip', 'dagger', 'axe', 'saber'],
    lancer: ['lance', 'pike', 'crossbow', 'sniper', 'rifle'],
  };
  const ICON = { ranger: '➹', knight: '⚔', paladin: '⛨', engineer: '⚙', starcaller: '✷', monk: '◉', symbiote: '❦', lancer: '❄' };
  const starter = (cls) => { const c = GV.CLASSES[cls] || {}; return new Set([...(c.bar || []).map((b) => b[0]), ...(c.supports || []), c.weapon, c.offhand].filter(Boolean)); };

  const CF = (GV.classFit = {
    skill(id, cls) { const d = Object.assign({ id }, GV.GEMS[id] || {}); return starter(cls).has(id) || !!(SKILL[cls] && SKILL[cls](d)); },
    // an augment suits a class if it can plug into a skill that class favours
    sup(id, cls) {
      if (starter(cls).has(id)) return true;
      const sd = GV.SUPPORTS[id]; if (!sd) return false;
      return Object.keys(GV.GEMS).some((k) => GV.GEMS[k].tags && GV.GEMS[k].kind && CF.skill(k, cls) && GV.gemFits(sd, GV.GEMS[k]));
    },
    weapon(id, cls) { const w = GV.WEAPONS[id]; if (!w) return false; return w.cls === cls || starter(cls).has(id) || (WPN[cls] || []).includes(w.art); },
    test(kind, id, cls) { return !cls || cls === 'all' || !!(CF[kind] && CF[kind](id, cls)); },
  });

  // ---------- the rail ----------
  const sel = (F.clsSel = F.clsSel || {});
  const redraw = (F._clsRedraw = F._clsRedraw || {});
  F.cls = (id) => sel[id] || 'all';
  // Does this thing pass the rail for list `id`?
  F.clsOk = (id, kind, thingId) => CF.test(kind, thingId, F.cls(id));
  // Wrap a list in the rail. items: [[kind, id], ...] to count per class; rerender redraws the screen.
  F.rail = function (id, listHtml, items, rerender) {
    redraw[id] = rerender;
    const esc = GV.menus.esc, cur = F.cls(id), mine = GV.save && GV.save.data && GV.save.data.cls;
    const count = (c) => items.filter(([k, x]) => CF.test(k, x, c)).length;
    const btn = (c, name, icon, color) => `<button class="crb ${cur === c ? 'sel' : ''} ${c === mine ? 'mine' : ''}" data-fcls="${c}" data-rail="${id}" style="--c:${color}" title="${esc(name)}"><i>${icon}</i><span>${esc(name)}</span><b>${count(c)}</b></button>`;
    const rail = btn('all', 'All', '✦', '#cfd8ff') + Object.keys(GV.CLASSES).map((c) => {
      const C = GV.CLASSES[c];
      return btn(c, C.name.replace(/^(Space|Void|Cryo|Graviton) /, ''), (C.icon || ICON[c] || C.name[0]), C.color || '#cfd8ff');
    }).join('');
    return `<div class="clsplit"><nav class="clsrail">${rail}</nav><div class="clslist">${listHtml}</div></div>`;
  };
  // One listener for every rail on every screen.
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-fcls]');
    if (!b) return;
    e.stopPropagation();
    sel[b.dataset.rail] = b.dataset.fcls;
    GV.audio && GV.audio.sfx && GV.audio.sfx('ui');
    const r = redraw[b.dataset.rail]; if (r) r();
  }, true);
})();
