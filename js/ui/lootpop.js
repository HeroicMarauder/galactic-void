// Galactic Void — loot pop-ups: a card slides in when you pick up something worth noticing. That means
// Stellar, Nova, Unique and Set gear, exotic weapons and their pieces, and dungeon keys. Cards queue up,
// so a big haul shows one at a time. During play the card sits top right, clear of the achievement card.
(function () {
  const GV = window.GV, P = GV.Play.prototype;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let el = null, q = [], busy = false;
  function next() {
    const x = q.shift();
    if (!x) { busy = false; return; }
    busy = true;
    if (!el) { el = document.createElement('div'); el.id = 'lootPop'; document.body.appendChild(el); }
    el.style.setProperty('--lc', x.color || '#ffd36b');
    el.innerHTML = `<span class="li">${x.icon || '◆'}</span><div><small>${esc(x.label)}</small><b>${esc(x.name)}</b>${x.sub ? `<span>${esc(x.sub)}</span>` : ''}</div>`;
    el.className = 'show' + (x.big ? ' big' : '');
    setTimeout(() => { el.className = ''; setTimeout(next, 380); }, x.big ? 3600 : 2800);
  }
  GV.lootPop = function (x) {
    if (q.length > 6) q.shift(); // a flood of drops shouldn't queue forever
    q.push(x);
    if (!busy) next();
  };

  // gear: Stellar and up
  const HIGH = { rare: 'Stellar gear', nova: 'Nova gear', unique: 'Unique' };
  const ICON = { helm: '⛑', suit: '⛨', boots: '👢', relic: '✧' };
  const give0 = P.giveDrop;
  P.giveDrop = function (dr, pl) {
    const r = give0.call(this, dr, pl);
    try {
      if (dr.kind === 'item' && dr.item && (HIGH[dr.item.rarity] || dr.item.set)) {
        const it = dr.item, slot = GV.SLOTS[it.slot] || { name: it.slot };
        GV.lootPop({ label: it.set ? 'Set piece' : HIGH[it.rarity], name: it.name, sub: `${slot.name} · Tier ${it.tier}${it.set && GV.SETS[it.set] ? ' · ' + GV.SETS[it.set].name : ''}`, color: GV.items.color(it), icon: ICON[it.slot] || '◆', big: it.rarity === 'unique' || !!it.set });
      } else if (dr.kind === 'weapon' && dr.part && GV.WEAPONS[dr.wid]) {
        const W = GV.WEAPONS[dr.wid], pt = ((GV.fab && GV.fab.PARTS) || []).find((x) => x.id === dr.part);
        GV.lootPop({ label: 'Exotic piece', name: `${W.name} · ${pt ? pt.name : dr.part}`, sub: GV.fab ? `${GV.fab.count(dr.wid)}/4 pieces · assemble at a Master bench` : '', color: W.color || '#ffb36a', icon: pt ? pt.icon : '⚙' });
      } else if (dr.kind === 'weapon' && dr.wid && GV.WEAPONS[dr.wid]) {
        const W = GV.WEAPONS[dr.wid];
        GV.lootPop({ label: W.exotic ? 'Exotic weapon' : 'Weapon', name: W.name, sub: W.exotic ? 'Equip it in Gear → Weapons' : '', color: W.color || '#ffb36a', icon: '⚔', big: !!W.exotic });
      }
    } catch (e) { /* a pop-up should never break a pickup */ }
    return r;
  };

  // dungeon keys: however you get one
  if (GV.dkeys) {
    const add0 = GV.dkeys.add;
    GV.dkeys.add = function (t, n = 1, d) {
      const r = add0.call(this, t, n, d);
      if (n > 0 && GV.DUNGEONS && GV.DUNGEONS[t]) {
        const T = GV.DUNGEONS[t];
        GV.lootPop({ label: 'Dungeon key', name: T.name, sub: `Run it from the war table · ${GV.dkeys.count(t)} held`, color: T.color, icon: '🗝', big: t >= 3 });
      }
      return r;
    };
  }
})();
