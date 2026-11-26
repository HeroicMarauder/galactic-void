// Galactic Void — the Ascendancy screen (choose a subclass, then spend ascendancy points) and the
// Codex (crew logs, echo fragments, bestiary).
(function () {
  const GV = window.GV;
  const back = (from) => {
    GV.save.write();
    if (from === 'play') GV.game.resume();
    else if (from === 'pause') { if (GV.game.play) GV.game.play.player.recalc(); GV.menus.pause(); }
    else GV.menus.map();
  };

  // ---------------- Ascendancy ----------------
  let aFrom = 'map';
  function ascend() {
    const M = GV.menus, esc = M.esc, A = GV.asc, d = GV.save.data;
    const cls = GV.CLASSES[d.cls];
    if (!A.unlocked()) {
      M.render(`<div class="screen panel narrow"><h2>Ascendancy</h2><p>Defeat the Hollow Warden at the Event Horizon to ascend. Your class will choose one of two paths, each with powers that change how your skills work.</p>
        <div class="menu row"><button class="primary" data-a="back">Back</button></div></div>`, () => back(aFrom), () => back(aFrom));
      return;
    }
    const sub = A.current();
    if (!sub) {
      const cards = A.choices().map((c) => `<button class="asccard" data-a="pick" data-k="${c.id}" style="--c:${c.color}">
        <span class="an">${c.name}</span><span class="at">${esc(c.tag)}</span>
        <ul>${c.nodes.map((n) => `<li><b>${esc(n.name)}</b> ${esc(n.lines[0])}</li>`).join('')}</ul></button>`).join('');
      M.render(`<div class="screen panel wide asc"><h2>Ascend · ${esc(cls.name)}</h2>
        <p>Choose your path. This is permanent for this save, though you can reshuffle the nodes later.</p>
        <div class="ascrow">${cards}</div>
        <div class="menu row"><button class="ghost" data-a="back">Not yet</button></div></div>`, (a, b) => {
        if (a === 'back') return back(aFrom);
        if (a === 'pick') {
          if (!b.dataset.armed) { document.querySelectorAll('.asccard').forEach((x) => { x.dataset.armed = ''; x.classList.remove('armed'); }); b.dataset.armed = '1'; b.classList.add('armed'); return; }
          A.choose(b.dataset.k); GV.audio.sfx('level'); ascend();
        }
      }, () => back(aFrom));
      return;
    }
    const node = (n) => {
      const has = A.has(n.id), can = A.canTake(n);
      return `<button class="ascnode ${has ? 'on' : ''} ${can ? 'can' : ''}" data-a="take" data-k="${n.id}" ${has || !can ? 'disabled' : ''} style="--c:${sub.color}">
        <span class="nn">${esc(n.name)}</span><ul>${n.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul><span class="nc">${has ? 'Taken' : can ? 'Take · 2 points' : n.tier === 2 ? 'Needs a first-tier node' : 'Need 2 points'}</span></button>`;
    };
    M.render(`<div class="screen panel wide asc" style="--c:${sub.color}">
      <div class="topbar"><h2>${esc(sub.name)}</h2><div class="stats"><b class="pts">${A.points()}</b> ascendancy points · ${A.spent()}/8 spent</div></div>
      <p>${esc(sub.tag)}. You earn 4 points for ascending and 2 more for clearing each later system, up to 8.</p>
      <div class="gsub">First tier</div><div class="ascnodes">${sub.nodes.filter((n) => n.tier === 1).map(node).join('')}</div>
      <div class="gsub">Second tier</div><div class="ascnodes">${sub.nodes.filter((n) => n.tier === 2).map(node).join('')}</div>
      <div class="menu row">${A.spent() ? `<button class="ghost" data-a="respec">Reset nodes · ${A.respecCost()} ✦</button>` : ''}<button class="primary" data-a="back">Done</button></div></div>`, (a, b) => {
      if (a === 'back') return back(aFrom);
      if (a === 'take' && A.take(b.dataset.k)) GV.audio.sfx('level');
      if (a === 'respec') { if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again to reset'; b.classList.add('danger'); return; } A.respec(); }
      ascend();
    }, () => back(aFrom));
  }

  // ---------------- Codex ----------------
  let cFrom = 'map', tab = 'logs', openLog = null;
  function codex() {
    const M = GV.menus, esc = M.esc, d = GV.save.data, c = d.codex;
    GV.codex.check();
    const tabs = [['logs', `Crew Logs ${c.logs.length}/${GV.LOGS.length}`], ['echoes', `Echoes ${d.lore.length}`], ['beasts', 'Bestiary']]
      .map(([k, l]) => `<button class="tab ${tab === k ? 'sel' : ''}" data-a="tab" data-k="${k}">${l}</button>`).join('');
    let body = '';
    if (tab === 'logs') {
      body = GV.LOGS.map((l) => {
        const got = c.logs.includes(l.id), unread = got && !(c.read || []).includes(l.id);
        if (!got) return `<div class="log locked"><b>Locked</b><span>${esc(l.hint)}</span></div>`;
        const open = openLog === l.id;
        return `<button class="log ${open ? 'open' : ''}" data-a="log" data-k="${l.id}"><b>${esc(l.title)}${unread ? ' <i class="new">NEW</i>' : ''}</b>${open ? `<p>${esc(l.text)}</p>` : '<span>Tap to read</span>'}</button>`;
      }).join('');
    } else if (tab === 'echoes') {
      body = d.lore.length ? d.lore.map((t) => `<div class="log"><p>“${esc(t)}”</p></div>`).join('') : '<p class="note">Echo fragments play back when you open memory caches.</p>';
    } else {
      body = Object.keys(GV.BEASTS).map((k) => {
        const b = GV.BEASTS[k], n = c.kills[k] || 0, bonus = GV.codex.bonus(k);
        if (!n) return `<div class="log locked"><b>???</b><span>Not yet encountered</span></div>`;
        const next = n < 25 ? `${25 - n} more to study (+5% damage)` : n < 100 ? `${100 - n} more to master (+10% damage)` : 'Mastered';
        return `<div class="log beast"><b>${esc(b.name)}${b.boss ? ' <i class="new">BOSS</i>' : ''}</b><p>${esc(b.text)}</p>
          <span>Destroyed ${n} · ${bonus ? `+${Math.round(bonus * 100)}% damage against it · ` : ''}${next}</span></div>`;
      }).join('') + `<p class="note">Elites destroyed: ${c.elites || 0}</p>`;
    }
    M.render(`<div class="screen panel codex"><div class="topbar"><h2>Codex</h2></div>
      <div class="tabs">${tabs}</div><div class="logs">${body}</div>
      <div class="menu row"><button class="primary" data-a="back">Done</button></div></div>`, (a, b) => {
      if (a === 'back') return back(cFrom);
      if (a === 'tab') { tab = b.dataset.k; openLog = null; }
      if (a === 'log') { openLog = openLog === b.dataset.k ? null : b.dataset.k; c.read = c.read || []; if (!c.read.includes(b.dataset.k)) c.read.push(b.dataset.k); GV.save.write(); }
      codex();
    }, () => back(cFrom));
  }

  GV.ascendView = { open(f) { aFrom = f || 'map'; ascend(); } };
  GV.codexView = { open(f) { cFrom = f || 'map'; codex(); } };
})();
