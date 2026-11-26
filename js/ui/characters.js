// Galactic Void — the Characters screen: your roster, your Legacy, your Class Echoes.
(function () {
  const GV = window.GV;
  const M = GV.menus, esc = (s) => M.esc(s);
  const R = () => GV.roster, LG = () => GV.legacy;
  const ago = (t) => { if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); return m < 2 ? 'just now' : m < 60 ? `${m} min ago` : m < 48 * 60 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`; };

  function play() {
    const S = GV.save;
    if (S.needsClass()) return M.classSelect();
    if (S.hasProgress()) return GV.game.home();
    return GV.game.startStage(0, 0);
  }

  M.characters = function () {
    const lg = LG(), pr = lg.progress(), pk = lg.perks(pr.L), src = lg.sources(), echoes = lg.echoes();
    const list = R().list(), byIdx = Object.fromEntries(list.map((x) => [x.i, x]));
    const canSw = R().canSwitch();
    // ---- legacy ----
    const chip = (n, label) => `<span class="lgc"><b>${n}</b>${label}</span>`;
    const legacy = `<div class="lgbox">
      <div class="lgtop"><div class="lgL"><span>LEGACY</span><b>${pr.L}</b></div>
        <div class="lgbar"><div class="lgfill" style="width:${Math.round(pr.f * 100)}%"></div><span>${pr.L >= lg.MAXL ? 'Maxed' : `${pr.p - pr.a} / ${pr.b - pr.a} to Legacy ${pr.L + 1}`}</span></div></div>
      <div class="lgsrc">${chip(src.ranks, 'rank milestones')}${chip(src.systems, 'systems cleared')}${chip(src.asc, 'from ascending')}${chip(src.titans, 'from Titans')}${chip(src.variety, 'from different classes')}</div>
      <div class="lgperks">
        <div><i>⬢</i><b>+${Math.round(pk.qty * 100)}%</b> item and core drops</div>
        <div><i>◆</i><b>+${Math.round(pk.rar * 100)}%</b> rare, Nova and unique chance</div>
        <div><i>⛁</i><b>+${pk.vault}</b> Shared Vault slots</div>
        <div><i>✦</i>New characters start with <b>${pk.startMem}</b> memories${pr.L >= 5 ? ' and blank cores' : ''}</div>
        <div><i>»</i>${pk.catchUp ? '<b>+50% XP</b> for characters 5+ ranks behind your best' : 'Reach Legacy 1 for faster levelling on new characters'}</div>
      </div>
      <p class="note">Legacy is shared by every character. Raise ranks, clear systems, ascend and fell Titans on any of them. A new class counts most.</p>
    </div>`;
    // ---- echoes ----
    const ech = Object.keys(GV.CLASSES).map((k) => {
      const c = GV.CLASSES[k], on = !!echoes[k], e = lg.ECHOES[k];
      return `<div class="echo ${on ? 'on' : ''}" style="--c:${c.color}" title="${esc(on ? 'Earned' : `Raise a ${c.name} to rank ${lg.ECHO_RANK}`)}"><b>${esc(c.name)}</b><span>${esc(e ? e.line : '')}</span><em>${on ? '✦ Echo earned · all characters' : `Rank ${lg.ECHO_RANK} ${esc(c.name)}`}</em></div>`;
    }).join('');
    // ---- slots ----
    let slots = '', free = 0;
    for (let i = 0; i < R().MAX; i++) {
      const x = byIdx[i];
      if (!x || (!x.d.cls && !x.active)) { free++; continue; }
      const l = R().label(x.d);
      slots += `<div class="cslot ${x.active ? 'active' : ''}" style="--c:${l.color}">
        <div class="csh"><b>${esc(l.name)}</b>${x.active ? '<span class="tagp">Playing</span>' : ''}</div>
        <div class="csm">Rank ${l.rank}${l.sub ? ` · ${esc(l.sub)}` : ''}</div>
        <div class="css">${l.systems} system${l.systems === 1 ? '' : 's'} cleared · ${x.d.memories || 0} ✦${x.d.savedAt ? ` · ${ago(x.d.savedAt)}` : ''}</div>
        <div class="csb">${x.active ? `<button class="primary" data-a="play">${x.d.cls ? 'Continue' : 'Choose class'}</button>` : `<button class="primary" data-a="sw" data-i="${i}" ${canSw ? '' : 'disabled'}>Play</button><button class="ghost danger-soft" data-a="del" data-i="${i}">Delete</button>`}</div>
      </div>`;
    }
    M.render(`<div class="screen panel wide chars">
      <div class="topbar"><h2>Characters</h2><div class="stats">${R().count()} of ${R().MAX}</div></div>
      ${canSw ? '' : '<p class="note warn">Leave your squad (and Player 2\'s turn) before switching characters.</p>'}
      <div class="cgrid">${slots}${free ? `<button class="cslot empty" data-a="new" ${canSw ? '' : 'disabled'}><span class="plus">＋</span><b>New character</b><small>Starts with ${pk.startMem} memories${pr.L >= 5 ? ' and blank cores' : ''}${list.some((y) => y.d.seenIntro) ? ' · skips the intro' : ''}</small><small class="free">${free} slot${free === 1 ? '' : 's'} free</small></button>` : ''}</div>
      <div class="gsub">Your Legacy</div>${legacy}
      <div class="gsub">Class Echoes <span>${Object.keys(echoes).length} / ${Object.keys(GV.CLASSES).length}</span></div>
      <div class="echoes">${ech}</div>
      <div class="menu row"><button class="ghost" data-a="back">Back</button></div>
    </div>`, (a, b) => {
      if (a === 'back') return M.title();
      if (a === 'play') return play();
      if (a === 'sw') { if (R().switchTo(+b.dataset.i)) { GV.audio.sfx('level'); return play(); } return M.characters(); }
      if (a === 'new') { if (R().create()) { GV.save.data.fresh = true; GV.save.write(); return M.classSelect(); } return M.characters(); }
      if (a === 'del') {
        if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again: delete forever'; b.classList.add('danger'); return; }
        R().remove(+b.dataset.i); return M.characters();
      }
    }, () => M.title());
  };

  addEventListener('load', () => {
    // Title: a Characters button, and Continue says who you're continuing.
    const title0 = M.title;
    M.title = function () {
      title0.apply(this, arguments);
      const menu = document.querySelector('#ui .screen.title .menu');
      const playBtn = menu && menu.querySelector('[data-a=play]');
      if (!menu || !playBtn) return;
      const d = GV.save.data, l = R().label(d);
      if (d.cls && GV.save.hasProgress()) playBtn.innerHTML = `Continue Voyage <small class="who" style="color:${l.color}">${esc(l.name)} · Rank ${l.rank}</small>`;
      const n = R().count();
      const cb = document.createElement('button'); cb.dataset.a = 'chars'; cb.innerHTML = `Characters${n > 1 ? ` <small>${n}</small>` : ''}${LG().level() ? ` <small class="lgtag">Legacy ${LG().level()}</small>` : ''}`;
      cb.addEventListener('click', (e) => { e.stopPropagation(); GV.audio.sfx('ui'); M.characters(); });
      playBtn.after(cb);
    };
    // Class select: a fresh character isn't "migrating"; show which Echoes each class would earn.
    const cs0 = M.classSelect;
    M.classSelect = function (opts) {
      const d = GV.save.data, fresh = !!d.fresh;
      if (fresh) { const hp = GV.save.hasProgress; GV.save.hasProgress = () => false; try { cs0.call(this, opts); } finally { GV.save.hasProgress = hp; } }
      else cs0.call(this, opts);
      if (opts && opts.p2) return;
      const echoes = LG().echoes(), have = {};
      for (const x of R().list()) if (x.d.cls && !x.active) have[x.d.cls] = Math.max(have[x.d.cls] || 0, x.d.level || 1);
      document.querySelectorAll('#ui .cls').forEach((b) => {
        const k = b.dataset.k, tag = document.createElement('span');
        tag.className = 'cecho' + (echoes[k] ? ' on' : '');
        tag.textContent = echoes[k] ? '✦ Echo earned' : have[k] ? `You have a Rank ${have[k]}` : 'New class · counts toward Legacy';
        b.appendChild(tag);
      });
    };
  });
})();
