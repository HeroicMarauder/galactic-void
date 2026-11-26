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
  let aFrom = 'map', aSel = null;
  function ascend() {
    const M = GV.menus, esc = M.esc, A = GV.asc, d = GV.save.data;
    const cls = GV.CLASSES[d.cls];
    if (!A.unlocked()) {
      if (A.reqMet()) return M.ascTrials(() => back(aFrom));
      M.render(`<div class="screen panel narrow"><h2>Ascendancy</h2><p>${esc(A.reqText())} Then pass the Trial of the Threshold at the altar on the Lantern.</p><p class="note">You're rank ${d.level || 1}. Ascending lets your class choose one of two paths, each a tree of powers that change how your skills work.</p>
        <div class="menu row"><button class="primary" data-a="back">Back</button></div></div>`, () => back(aFrom), () => back(aFrom));
      return;
    }
    const sub = A.current();
    if (!sub) {
      const cards = A.choices().map((c) => {
        const tr = A.tree(c), nots = tr.filter((n) => n.kind === 'notable'), caps = tr.filter((n) => n.kind === 'capstone');
        return `<button class="asccard" data-a="pick" data-k="${c.id}" style="--c:${c.color}">
        <span class="an">${c.name}</span><span class="at">${esc(c.tag)}</span>
        <ul>${nots.map((n) => `<li><b>${esc(n.name)}</b> ${esc(n.lines[0] || '')}</li>`).join('')}</ul>
        <div class="acaps"><i>Capstones · choose one</i>${caps.map((n) => `<div><b>${esc(n.name)}</b> ${esc(n.lines[0] || '')}</div>`).join('')}</div></button>`;
      }).join('');
      M.render(`<div class="screen panel wide asc"><h2>Ascend · ${esc(cls.name)}</h2>
        <p>Choose your path. Each one is its own tree: four signature powers, the disciplines between them, and two capstones at the top, of which you may take one.</p>
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
    A.migrate();
    const tr = A.tree(sub), byId = Object.fromEntries(tr.map((n) => [n.id, n]));
    if (!byId[aSel]) aSel = tr.find((n) => A.canTake(n)) ? tr.find((n) => A.canTake(n)).id : 'start';
    const X = (n) => 50 + n.x * 31, Y = (n) => 90 - n.y * 19.5;
    const links = tr.flatMap((n) => n.req.map((r) => {
      const a = byId[r], on = A.has(r) && A.has(n.id), open = A.has(r) && !A.has(n.id);
      return `<line x1="${X(a)}" y1="${Y(a)}" x2="${X(n)}" y2="${Y(n)}" class="${on ? 'on' : open ? 'open' : ''}"/>`;
    })).join('');
    const nodeEl = (n) => {
      const w = A.why(n), st = n.id === 'start' || w === 'taken' ? 'on' : w === 'ok' ? 'can' : w === 'other' ? 'other' : '';
      const glyph = n.kind === 'start' ? '✦' : n.kind === 'capstone' ? '◆' : n.kind === 'notable' ? '◉' : '';
      return `<button class="an ${n.kind} ${st} ${aSel === n.id ? 'sel' : ''}" data-a="sel" data-k="${n.id}" style="left:${X(n)}%;top:${Y(n)}%"><span>${glyph}</span>${n.kind !== 'small' ? `<em>${esc(n.name)}</em>` : ''}</button>`;
    };
    const n = byId[aSel], w = A.why(n);
    const act = n.id === 'start' ? `<span class="muted">Your ${esc(sub.name)} path begins here.</span>`
      : w === 'taken' ? '<span class="ok">Taken</span>'
      : w === 'ok' ? `<button class="primary" data-a="take" data-k="${n.id}">Take · ${n.cost} point${n.cost > 1 ? 's' : ''}</button>`
      : w === 'other' ? '<span class="muted">You already chose your capstone</span>'
      : w === 'points' ? `<span class="muted">Needs ${n.cost} point${n.cost > 1 ? 's' : ''}</span>` : '<span class="muted">Take a node below it first</span>';
    const kindName = { start: 'Ascendancy', small: 'Discipline', notable: 'Signature power', capstone: 'Capstone · choose one' }[n.kind];
    M.render(`<div class="screen panel wide asc asctree" style="--c:${sub.color}">
      <div class="topbar"><h2>${esc(sub.name)}</h2><div class="stats"><b class="pts">${A.points()}</b> point${A.points() === 1 ? '' : 's'} · ${A.spent()}/${A.CAP} spent</div></div>
      <p>${esc(sub.tag)}. The Trial of the Threshold gave you 4 points; each later Ascension Trial gives 2 more, up to ${A.CAP}.${d.asc.note ? ' <span class="warn">Ascendancies have been rebuilt as trees: your old picks were refunded.</span>' : ''}</p>
      <div class="atwrap">
        <div class="atree"><svg viewBox="0 0 100 100" preserveAspectRatio="none">${links}</svg>${tr.map(nodeEl).join('')}</div>
        <div class="adetail">
          <div class="ak">${kindName}</div><div class="anm">${esc(n.name)}</div>
          <ul>${(n.lines || []).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
          <div class="aact">${act}</div>
          <div class="asum"><div class="gsub">Your ${esc(sub.name)}</div>${(() => { const got = tr.filter((x) => x.id !== 'start' && A.has(x.id)), seen = {}; for (const x of got) seen[x.name] = (seen[x.name] || 0) + 1;
            return got.filter((x, i) => got.findIndex((y) => y.name === x.name) === i).map((x) => `<div class="aitem ${x.kind}">${esc(x.name)}${seen[x.name] > 1 ? ` ×${seen[x.name]}` : ''}</div>`).join('') || '<p class="note">Nothing taken yet. Tap a glowing node.</p>'; })()}</div>
        </div>
      </div>
      <div class="menu row"><button data-a="trials">Ascension Trials · ${GV.ascTrials.done()}/4</button>${A.spent() ? `<button class="ghost" data-a="respec">Reset tree · ${A.respecCost()} ✦</button>` : ''}<button class="primary" data-a="back">Done</button></div></div>`, (a, b) => {
      if (a === 'back') { if (d.asc.note) { d.asc.note = false; } return back(aFrom); }
      if (a === 'trials') return M.ascTrials(() => ascend());
      if (a === 'sel') { if (aSel === b.dataset.k && A.canTake(byId[aSel])) { if (A.take(aSel)) GV.audio.sfx('level'); } else { aSel = b.dataset.k; GV.audio.sfx('ui'); } }
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
