// Galactic Void — the Skill Gems screen: the four-slot skill bar, support sockets, live skill
// numbers, cutting uncut gems, and Void Conduits.
(function () {
  const GV = window.GV;
  let from = 'map', sel = 0, picker = null;
  const fl = { inv: 'all', q: '', pkTag: 'all', pkQ: '', fit: true, hideOwned: false };
  const TAGTABS = [['all', 'All'], ['Attack', 'Attacks', '⚔'], ['Spell', 'Spells', '✧'], ['Minion', 'Minions', '♞'], ['Melee', 'Melee'], ['Projectile', 'Projectile'], ['Area', 'Area'], ['Fire', 'Fire'], ['Cold', 'Cold'], ['Lightning', 'Lightning'], ['Void', 'Void']];
  const tagTabs = (defs) => TAGTABS.map(([id, name, icon]) => ({ id, name, icon, n: defs.filter((g) => id === 'all' || g.tags.includes(id)).length })).filter((t) => t.id === 'all' || t.n);
  const KEYS = new Proxy([], { get: (t, i) => (/^\d+$/.test(i) ? GV.input.label(['attack', 'skill1', 'skill2', 'skill3'][i]) : t[i]) });
  const TOUCH = ['ATK', 'S1', 'S2', 'S3'];

  const tagChips = (tags) => [...tags].map((t) => `<span class="chip">${t}</span>`).join('');

  function close() {
    picker = null;
    GV.save.write();
    if (from === 'play') GV.game.resume();
    else if (from === 'pause') { if (GV.game.play) GV.game.play.player.recalc(); GV.menus.pause(); }
    else GV.menus.map();
  }

  function render() {
    const M = GV.menus, d = GV.save.data, inv = GV.inv, esc = M.esc;
    const st = GV.computeStats(), W = GV.equippedWeapon(d);
    const bar = inv.barGems();
    const keyName = (i) => (GV.input.isTouch ? TOUCH[i] : KEYS[i]);

    let slots = '';
    bar.forEach((g, i) => {
      const def = g && GV.GEMS[g.id];
      const socks = g ? g.sup.map((u) => {
        const it = u != null && inv.sup(u), sd = it && GV.SUPPORTS[it.id];
        const ok = sd && GV.gemFits(sd, def);
        return `<span class="sock ${sd ? 'full' : ''} ${sd && !ok ? 'bad' : ''}" title="${sd ? esc(sd.name) : 'Empty port'}"></span>`;
      }).join('') : '';
      slots += `<button class="gslot ${i === sel ? 'sel' : ''}" data-a="slot" data-i="${i}">
        <span class="key">${keyName(i)}</span>
        ${g ? `<span class="gi" style="color:${def.color}">${def.icon}</span><span class="gn">${esc(def.name)}<small>Lv ${g.lvl}</small></span>
          <span class="xp"><i style="width:${g.lvl >= GV.MAX_GEM_LVL ? 100 : Math.round(100 * g.xp / GV.gemXpNeed(g.lvl))}%"></i></span>
          <span class="socks">${socks}</span>` : '<span class="gn empty">Empty slot</span>'}
      </button>`;
    });

    const g = bar[sel];
    let detail = '';
    if (g) {
      const def = GV.GEMS[g.id], s = GV.Skills.build(g, st, W);
      const rows = GV.Skills.summary(s).map((r) => `<div><span>${r.label}</span><b ${r.color ? `style="color:${r.color}"` : ''}>${r.value}</b></div>`).join('');
      let socks = '';
      g.sup.forEach((u, idx) => {
        const it = u != null && inv.sup(u), sd = it && GV.SUPPORTS[it.id];
        const ok = sd && GV.gemFits(sd, def);
        socks += `<div class="sockrow ${sd ? '' : 'empty'}">
          <span class="sock ${sd ? 'full' : ''} ${sd && !ok ? 'bad' : ''}"></span>
          <div class="si">${sd ? `<b>${esc(sd.name)}</b><span>${esc(sd.desc)}${ok ? '' : ' <em class="warn">Does not support this skill</em>'}</span>` : '<b>Empty port</b><span>Plug in an Augment to change this skill.</span>'}</div>
          <div class="bs"><button data-a="pickSup" data-i="${idx}">${sd ? 'Change' : 'Plug in'}</button>${sd ? `<button class="ghost" data-a="unsock" data-i="${idx}">Remove</button>` : ''}</div>
        </div>`;
      });
      detail = `
        <div class="gdh"><span class="gi big" style="color:${def.color}">${def.icon}</span>
          <div><div class="gtitle">${esc(def.name)} <small>Level ${g.lvl} · Tier ${def.tier}${GV.gemLvlCap && g.lvl < GV.MAX_GEM_LVL && g.lvl >= GV.gemLvlCap(GV.save.data.level) ? ` · <span style="color:#ffcf6a">Rank up to grow further</span>` : ''}</small></div><div class="chips">${tagChips(GV.gemTags(def))}</div></div></div>
        <p class="gdesc">${esc(def.desc)}</p>
        <div class="gstats">${rows}</div>
        <div class="gsub">Support sockets <span>${g.sockets}/${GV.MAX_SOCKETS}</span></div>
        ${socks}
        <div class="menu row left">
          <button data-a="orb" ${d.orbs > 0 && g.sockets < GV.MAX_SOCKETS ? '' : 'disabled'}>+ Add port <small>(${GV.TERMS.orb} ×${d.orbs})</small></button>
          <button data-a="swap">Swap Star Core</button>
        </div>${g.id === 'strike' && GV.ATTUNE ? `<div class="gsub">Attunement <span>${esc(GV.ATTUNE[GV.strikeAttune()].name)}</span></div>
        <p class="gdesc">Choose what Void Strike hits with. Any element but Physical converts 60% of its damage and gains that element's status chance.</p>
        <div class="menu row left attune">${Object.keys(GV.ATTUNE).map((k2) => `<button class="${GV.strikeAttune() === k2 ? 'primary' : 'ghost'} small" data-a="attune" data-k="${k2}" style="--c:${GV.ATTUNE[k2].color}"><b style="color:${GV.ATTUNE[k2].color}">${GV.ATTUNE[k2].icon}</b> ${esc(GV.ATTUNE[k2].name)}</button>`).join('')}</div>` : ''}${GV.artsOf ? (() => { const A2 = GV.artsOf(g); return `<div class="gsub">Arts <span style="color:${A2.def.color}">${esc(A2.def.name)}</span></div>
        <div class="arts">${A2.list.map((x) => `<div class="art ${x.on ? 'on' : ''}" style="--c:${A2.def.color}"><b>${x.on ? '◆' : '◇'} ${esc(x.name)}</b><i>${x.on ? 'Learned' : 'Level ' + x.lvl}</i><p>${esc(x.desc)}</p></div>`).join('')}</div>`; })() : ''}`;
    } else {
      detail = `<p class="gdesc">This slot is empty.</p><div class="menu row left"><button class="primary" data-a="swap">Choose a Star Core</button></div>`;
    }

    const esc2 = esc, spare = inv.freeGems(), fs = inv.freeSups();
    const supCounts = {}; for (const x of fs) supCounts[x.id] = (supCounts[x.id] || 0) + 1;
    const ITABS = [{ id: 'all', name: 'All' }, { id: 'blank', name: 'Blank', icon: '⬡', n: d.uncut.length }, { id: 'cores', name: 'Star Cores', icon: '◆', n: spare.length }, { id: 'augs', name: 'Augments', icon: '◇', n: fs.length }];
    ITABS[0].n = d.uncut.length + spare.length + fs.length;
    const showT = (t) => fl.inv === 'all' || fl.inv === t;
    let invHtml = '';
    const uncutL = d.uncut.map((u, i) => [u, i]).filter(([u]) => GV.filters.match(fl.q, 'blank format tier ' + u.tier, u.kind === 'skill' ? 'star core' : 'augment'));
    if (showT('blank') && uncutL.length) {
      // stacked: one button per kind and tier, formatting the first of that stack
      const stacks = []; const byK = {};
      for (const [u, i] of uncutL) { const k = u.kind + u.tier; if (!byK[k]) { byK[k] = { u, i, n: 0 }; stacks.push(byK[k]); } byK[k].n++; }
      stacks.sort((a, b) => (a.u.kind === b.u.kind ? a.u.tier - b.u.tier : a.u.kind === 'skill' ? -1 : 1));
      invHtml += `<div class="gsub">Blank cores <span>${uncutL.length}</span></div><div class="uncut">` + stacks.map((x) => `<button class="ucg ${x.u.kind}" data-a="cut" data-i="${x.i}"><span class="hex"></span>Format Tier ${x.u.tier} ${x.u.kind === 'skill' ? 'Star Core' : 'Augment'}${x.n > 1 ? ` <b class="stackn">×${x.n}</b>` : ''}</button>`).join('') + `</div>`;
    }
    const spareL = spare.filter((x) => GV.filters.clsOk('gemInv', 'skill', x.id) && GV.filters.match(fl.q, GV.GEMS[x.id].name, GV.GEMS[x.id].tags.join(' '), GV.GEMS[x.id].desc));
    if (showT('cores') && spareL.length) {
      const st2 = []; const byK = {};
      for (const x of spareL) { const k = x.id + ':' + x.lvl; if (!byK[k]) { byK[k] = { x, n: 0 }; st2.push(byK[k]); } byK[k].n++; }
      invHtml += `<div class="gsub">Spare Star Cores <span>${spareL.length}</span></div><div class="spare">` + st2.map(({ x, n }) => `<span class="pill" style="color:${GV.GEMS[x.id].color}" title="${esc2(GV.GEMS[x.id].desc)}">${GV.GEMS[x.id].icon} ${esc2(GV.GEMS[x.id].name)} <small>Lv ${x.lvl}</small>${n > 1 ? ` ×${n}` : ''}</span>`).join('') + `</div>`;
    }
    const supL = Object.keys(supCounts).filter((k) => GV.filters.clsOk('gemInv', 'sup', k) && GV.filters.match(fl.q, GV.SUPPORTS[k].name, GV.SUPPORTS[k].desc, GV.SUPPORTS[k].req.join(' ')));
    if (showT('augs') && supL.length) invHtml += `<div class="gsub">Spare Augments <span>${fs.length}</span></div><div class="spare">` + supL.map((k) => `<span class="pill sup" title="${esc2(GV.SUPPORTS[k].desc)}">${esc2(GV.SUPPORTS[k].name)}${supCounts[k] > 1 ? ` ×${supCounts[k]}` : ''}</span>`).join('') + `</div>`;
    if (!invHtml) invHtml = ITABS[0].n ? '<p class="note fnone">Nothing matches. Try another tab or search.</p>' : '<p class="note">Blank cores drop from rifts, bosses and memory caches. Vesper sells them too.</p>';
    invHtml = GV.filters.bar({ id: 'gemInv', cls: 'compact', tabs: ITABS, tab: fl.inv, q: fl.q, placeholder: 'Search your cores and augments' }) + GV.filters.rail('gemInv', `<div class="ginvl">${invHtml}</div>`, [...spare.map((x) => ['skill', x.id]), ...Object.keys(supCounts).map((k) => ['sup', k])], render);

    M.render(`
      <div class="screen panel gems">
        <div class="loadouts"><span>Loadout</span>${[0, 1].map((i) => `<button class="seg ${d.activeLoadout === i ? 'sel' : ''}" data-a="loadout" data-i="${i}">${'AB'[i]}</button>`).join('')}<small>Each loadout keeps its own skill bar, augments, gear, passive tree and weapon.</small><button class="ghost small" data-a="share">Share build</button><button class="ghost small" data-a="import">Import build</button></div>
        <div class="topbar"><h2>Star Cores</h2><div class="stats">◆ ${d.uncut.length} blank · ✦ ${d.orbs} ${d.orbs === 1 ? GV.TERMS.orb : GV.TERMS.orbs} · ${esc(W.name)}</div></div>
        <div class="gbar">${slots}</div>
        <div class="gcols"><div class="gdetail">${detail}</div><div class="ginv">${invHtml}</div></div>
        <div class="menu row"><button class="primary" data-a="done">Done</button></div>
        ${picker ? (picker.mode === 'share' || picker.mode === 'import' ? renderShare() : renderPicker()) : ''}
      </div>`, onAction, () => (picker ? (picker = null, render()) : close()));
    GV.filters.bind('gemInv', { tab: (t) => { fl.inv = t; render(); }, q: (v) => { fl.q = v; render(); } });
    GV.filters.bind('pick', { tab: (t) => { fl.pkTag = t; render(); }, q: (v) => { fl.pkQ = v; render(); }, check: (id, on) => { fl[id] = on; render(); } });
  }

  function renderPicker() {
    const d = GV.save.data, inv = GV.inv, esc = GV.menus.esc;
    let title = '', items = '', bar = '', empty = false, railItems = [];
    if (picker.mode === 'sup') {
      const g = inv.barGems()[sel], def = GV.GEMS[g.id];
      title = `Plug an Augment into ${def.name}`;
      const seen = new Set();
      const all = inv.freeSups().filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
      railItems = all.map((x) => ['sup', x.id]);
      const free = all.filter((x) => (!fl.fit || GV.gemFits(GV.SUPPORTS[x.id], def)) && GV.filters.clsOk('pick', 'sup', x.id) && GV.filters.match(fl.pkQ, GV.SUPPORTS[x.id].name, GV.SUPPORTS[x.id].desc));
      free.sort((a, b) => (GV.gemFits(GV.SUPPORTS[b.id], def) ? 1 : 0) - (GV.gemFits(GV.SUPPORTS[a.id], def) ? 1 : 0));
      bar = GV.filters.bar({ id: 'pick', q: fl.pkQ, placeholder: 'Search augments', checks: [{ id: 'fit', label: `Only ones that fit ${def.name}`, on: fl.fit }] });
      empty = all.length && !free.length;
      items = free.map((x) => {
        const sd = GV.SUPPORTS[x.id], ok = GV.gemFits(sd, def);
        return `<button class="pick ${ok ? '' : 'no'}" data-a="putSup" data-u="${x.uid}" ${ok ? '' : 'disabled'}><b>${esc(sd.name)}</b><span>${esc(sd.desc)}</span><em>${ok ? 'Supports: ' + sd.req.join(', ').replace('*', 'any skill') : 'Needs: ' + sd.req.join(' or ')}</em></button>`;
      }).join('') || '<p class="note">No spare Augments. Format a Blank Augment, or unplug one from another skill.</p>';
    } else if (picker.mode === 'swap') {
      title = `Choose the skill for slot ${GV.input.isTouch ? TOUCH[sel] : KEYS[sel]}`;
      const own = inv.freeGems();
      bar = GV.filters.bar({ id: 'pick', tabs: tagTabs(own.map((x) => GV.GEMS[x.id])), tab: fl.pkTag, q: fl.pkQ, placeholder: 'Search your Star Cores' });
      railItems = own.map((x) => ['skill', x.id]);
      const list = own.filter((x) => { const g = GV.GEMS[x.id]; return GV.filters.clsOk('pick', 'skill', x.id) && (fl.pkTag === 'all' || g.tags.includes(fl.pkTag)) && GV.filters.match(fl.pkQ, g.name, g.desc, g.tags.join(' ')); });
      empty = own.length && !list.length;
      items = list.map((x) => {
        const def = GV.GEMS[x.id];
        return `<button class="pick" data-a="putGem" data-u="${x.uid}"><b style="color:${def.color}">${def.icon} ${esc(def.name)} <small>Lv ${x.lvl}</small></b><span>${esc(def.desc)}</span><em>${def.tags.join(' · ')}</em></button>`;
      }).join('') + `<button class="pick" data-a="putGem" data-u=""><b>Leave the slot empty</b></button>`;
    } else if (picker.mode === 'cut') {
      const u = d.uncut[picker.i];
      title = `Format a Tier ${u.tier} ${u.kind === 'skill' ? 'Star Core' : 'Augment'}`;
      const pool = u.kind === 'skill' ? GV.GEMS : GV.SUPPORTS;
      const owned = new Set((u.kind === 'skill' ? d.gems : d.sups).map((x) => x.id));
      const keys = Object.keys(pool).filter((k) => pool[k].tier <= u.tier);
      if (u.kind === 'skill') bar = GV.filters.bar({ id: 'pick', tabs: tagTabs(keys.map((k) => pool[k])), tab: fl.pkTag, q: fl.pkQ, placeholder: 'Search Star Cores', checks: [{ id: 'hideOwned', label: 'Hide ones I own', on: fl.hideOwned }] });
      else bar = GV.filters.bar({ id: 'pick', q: fl.pkQ, placeholder: 'Search Augments', checks: [{ id: 'hideOwned', label: 'Hide ones I own', on: fl.hideOwned }] });
      railItems = keys.map((k) => [u.kind === 'skill' ? 'skill' : 'sup', k]);
      const shown = keys.filter((k) => GV.filters.clsOk('pick', u.kind === 'skill' ? 'skill' : 'sup', k) && (u.kind !== 'skill' || fl.pkTag === 'all' || pool[k].tags.includes(fl.pkTag)) && !(fl.hideOwned && owned.has(k)) && GV.filters.match(fl.pkQ, pool[k].name, pool[k].desc, (pool[k].tags || pool[k].req || []).join(' ')));
      empty = keys.length && !shown.length;
      items = shown.sort((a, b) => pool[a].tier - pool[b].tier).map((k) => {
        const g = pool[k];
        const tags = u.kind === 'skill' ? g.tags.join(' · ') : 'Supports: ' + g.req.join(', ').replace('*', 'any skill');
        return `<button class="pick" data-a="doCut" data-k="${k}"><b ${g.color ? `style="color:${g.color}"` : ''}>${g.icon ? g.icon + ' ' : ''}${esc(g.name)} <small>T${g.tier}${owned.has(k) ? ' · owned' : ''}</small></b><span>${esc(g.desc)}</span><em>${tags}</em></button>`;
      }).join('');
    }
    if (empty) items = '<p class="note fnone">Nothing matches. Try another tab or search.</p>' + (picker.mode === 'swap' ? items : '');
    return `<div class="picker"><div class="pk"><div class="pkh"><b>${title}</b><button class="ghost" data-a="closePk">✕</button></div>${bar}${GV.filters.rail('pick', `<div class="pkl">${items}</div>`, railItems, render)}</div></div>`;
  }

  function renderShare() {
    const esc = GV.menus.esc, d = GV.save.data;
    let body = '';
    if (picker.mode === 'share') {
      body = `<p>Send this code to a friend. They can import it from their Star Cores screen. It only lays out what they already own.</p>
        <textarea id="bcode" class="code" readonly>${esc(picker.code)}</textarea>
        <div class="menu row"><button class="primary" data-a="copyB">${picker.copied ? 'Copied ✓' : 'Copy code'}</button></div>`;
    } else {
      const pv = picker.pv;
      body = `<p>Paste a build code (it starts with GVB1:).</p>
        <textarea id="bcode" class="code" placeholder="GVB1:…">${esc(picker.code || '')}</textarea>
        <div class="menu row"><button data-a="readB">Check code</button></div>
        ${picker.err ? `<p class="warn">${esc(picker.err)}</p>` : ''}
        ${picker.done ? `<p class="ok">${esc(picker.done)}</p>` : ''}
        ${pv ? `<div class="bprev">
          <b>${pv.name ? esc(pv.name) + ' · ' : ''}${esc(GV.CLASSES[pv.cls].name)} build · rank ${pv.rank || '?'}</b>
          <span>Passive tree: ${pv.oldTree ? '<em class="warn">made for the old tree, so only the skill bar can be used</em>' : `${pv.nodes} nodes`}${pv.oldTree ? '' : pv.sameCls ? ` · you can fill ${pv.canNodes} now (reset cost ${pv.cost} ✦)` : ` · <em class="warn">for ${esc(GV.CLASSES[pv.cls].name)}s only</em>`}</span>
          <div class="bcores">${pv.cores.map((c) => (c ? `<div><span class="${c.own ? 'ok' : 'warn'}">${c.own ? '✓' : '✗'} ${esc(GV.GEMS[c.id].name)}</span>${c.sups.map((s) => `<small class="${s.own ? 'ok' : 'warn'}">${s.own ? '✓' : '✗'} ${esc(GV.SUPPORTS[s.id] ? GV.SUPPORTS[s.id].name : s.id)}</small>`).join('')}</div>` : '<div><span class="muted">empty slot</span></div>')).join('')}</div>
          <div class="menu row">
            <button class="primary" data-a="applyCores">Use the skill bar</button>
            ${pv.sameCls ? `<button data-a="applyAll" ${d.memories >= pv.cost ? '' : 'disabled'}>Skill bar + tree</button>` : ''}
          </div></div>` : ''}`;
    }
    return `<div class="picker"><div class="pk"><div class="pkh"><b>${picker.mode === 'share' ? 'Share this build' : 'Import a build'}</b><button class="ghost" data-a="closePk">✕</button></div><div class="pkl share">${body}</div></div></div>`;
  }

  function onAction(a, b) {
    if (a === 'share') { picker = { mode: 'share', code: GV.builds.exportCode() }; return render(); }
    if (a === 'import') { picker = { mode: 'import' }; return render(); }
    if (a === 'copyB') {
      const ta = document.getElementById('bcode');
      const done = () => { picker.copied = true; render(); };
      try { navigator.clipboard.writeText(picker.code).then(done, () => { ta.select(); document.execCommand('copy'); done(); }); } catch (e) { ta.select(); try { document.execCommand('copy'); } catch (_) {} done(); }
      return;
    }
    if (a === 'readB') {
      picker.code = document.getElementById('bcode').value; picker.err = ''; picker.pv = null; picker.done = '';
      try { picker.o = GV.builds.parse(picker.code); picker.pv = GV.builds.preview(picker.o); } catch (e) { picker.err = e.message; }
      return render();
    }
    if (a === 'applyCores' || a === 'applyAll') {
      try {
        const r = GV.builds.apply(picker.o, { cores: true, tree: a === 'applyAll' });
        picker.done = `Done: ${r.cores} cores, ${r.augs} augments${a === 'applyAll' ? `, ${r.nodes} passive nodes` : ''}.${r.missing.length ? ' Missing: ' + [...new Set(r.missing)].join(', ') + '.' : ''}`;
        picker.pv = GV.builds.preview(picker.o);
        GV.audio.sfx('level');
      } catch (e) { picker.err = e.message; }
      return render();
    }
    const d = GV.save.data, inv = GV.inv, bar = inv.barGems();
    const g = bar[sel];
    switch (a) {
      case 'slot': sel = +b.dataset.i; picker = null; render(); { const gd = document.querySelector('#ui .gdetail'); if (gd) gd.scrollTop = 0; } return; // a new skill starts at the top
      case 'pickSup': picker = { mode: 'sup', idx: +b.dataset.i }; fl.pkQ = ''; break;
      case 'unsock': inv.socket(g, +b.dataset.i, null); break;
      case 'putSup': inv.socket(g, picker.idx, +b.dataset.u); picker = null; GV.audio.sfx('level'); break;
      case 'orb': if (inv.addSocket(g)) GV.audio.sfx('level'); break;
      case 'attune': if (GV.ATTUNE && GV.ATTUNE[b.dataset.k]) { GV.save.data.strikeEl = b.dataset.k; GV.save.write(); GV.audio.sfx('level'); } break;
      case 'swap': picker = { mode: 'swap' }; fl.pkTag = 'all'; fl.pkQ = ''; break;
      case 'putGem': if (b.dataset.u === '') d.bar[sel] = null; else inv.equip(sel, +b.dataset.u); picker = null; break;
      case 'cut': picker = { mode: 'cut', i: +b.dataset.i }; fl.pkTag = 'all'; fl.pkQ = ''; break;
      case 'doCut': {
        const made = inv.cut(picker.i, b.dataset.k);
        picker = null;
        GV.audio.sfx('level');
        if (made && made.lvl != null) { const empty = d.bar.indexOf(null); if (empty >= 0) { d.bar[empty] = made.uid; sel = empty; } }
        break;
      }
      case 'closePk': picker = null; break;
      case 'loadout': inv.swapLoadout(+b.dataset.i); picker = null; GV.audio.sfx('level'); break;
      case 'done': return close();
    }
    GV.save.write();
    render();
  }

  GV.gemView = {
    open(f) { from = f || 'map'; picker = null; fl.pkTag = 'all'; fl.pkQ = ''; render(); },
  };
})();
