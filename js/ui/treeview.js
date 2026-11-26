// Galactic Void — the passive tree viewer. Drag to pan, scroll or pinch to zoom, tap a node.
// Tapping a distant node previews the whole path to it (PoE-style) and allocates it in one go.
(function () {
  const GV = window.GV, T = () => GV.TREE;
  let from = 'map', cv, ctx, raf = 0, cam = { x: 0, y: 0, z: 0.5 }, sel = null, hover = null, preview = [], query = '';
  const ptrs = new Map();
  let drag = null, pinch = null, moved = false, dpr = 1, goTo = null;

  const R = { small: 10, notable: 18, keystone: 26, classStart: 22 };
  const hue = (n) => T().GROUPS[n.group].hue;

  function open(f) {
    setTimeout(() => { if (GV.save.data.treeResetNote) { GV.save.data.treeResetNote = false; GV.save.write(); } }, 8000);
    from = f || 'map'; sel = null; preview = []; query = '';
    const M = GV.menus;
    M.render(`
      <div class="treewrap">
        <canvas id="treeCv"></canvas>
        <div class="tree-top">
          <div class="tt-title">Passive Tree</div>
          <div class="tt-pts" id="tvPts"></div>
          <input id="tvSearch" type="search" placeholder="Search stats…" autocomplete="off">
          <button data-a="reset" class="ghost" id="tvReset"></button>
          <button class="primary" data-a="close">Done</button>
        </div>
        <div class="tree-regions" id="tvRegions">${T().REGIONS.map((R) => `<button data-a="go" data-r="${R.id}" class="${R.cls === GV.save.data.cls ? 'mine' : ''}" style="--h:${R.hue}"><b>${R.name}</b><small>${GV.CLASSES[R.cls].name}</small></button>`).join('')}</div>
        <div class="tree-tip" id="tvTip"></div>
        <div class="tree-hint">${GV.input.isTouch ? 'Drag to pan · pinch to zoom · tap a node' : 'Drag to pan · scroll to zoom · click a node'}</div>
      </div>`, onAction, () => (sel != null ? (sel = null, preview = [], tip()) : close()));
    cv = document.getElementById('treeCv'); cv.classList.add('grabZone');
    ctx = cv.getContext('2d');
    sizeCanvas();
    const root = T().nodes[T().root()];
    const fit = Math.min(cv.clientWidth, cv.clientHeight) / 1300;
    cam = { x: root.x * 1.9, y: root.y * 1.9, z: Math.max(0.36, Math.min(0.85, fit * 1.35)) };
    bindInput();
    document.getElementById('tvSearch').addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); });
    tip();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }
  function close() {
    cancelAnimationFrame(raf); raf = 0;
    GV.save.write();
    if (from === 'play') GV.game.resume();
    else if (from === 'pause') { if (GV.game.play) GV.game.play.player.recalc(); GV.menus.pause(); }
    else GV.menus.map();
  }
  function onAction(a, b) {
    if (a === 'close') return close();
    if (a === 'go') {
      const R = T().REGIONS.find((x) => x.id === b.dataset.r), rad = R.ang * Math.PI / 180;
      goTo = { x: Math.cos(rad) * 850, y: Math.sin(rad) * 850, z: 0.4 };
      return;
    }
    if (a === 'reset') {
      const b = document.getElementById('tvReset');
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = `Confirm: ${T().resetCost()} ✦`; return; }
      if (!T().reset()) GV.audio.sfx('hurt'); else GV.audio.sfx('level');
      b.dataset.armed = ''; sel = null; preview = [];
    }
    if (a === 'alloc' && sel != null) {
      if (T().allocPath(sel)) { GV.audio.sfx('level'); preview = []; }
    }
    if (a === 'refund' && sel != null) { if (T().refund(sel)) GV.audio.sfx('ui'); }
    tip();
  }

  function sizeCanvas() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(cv.clientWidth * dpr);
    cv.height = Math.round(cv.clientHeight * dpr);
  }
  const toWorld = (sx, sy) => ({ x: (sx - cv.clientWidth / 2) / cam.z + cam.x, y: (sy - cv.clientHeight / 2) / cam.z + cam.y });
  function pickNode(sx, sy) {
    const w = toWorld(sx, sy);
    let best = null, bd = Infinity;
    for (const n of T().nodes) {
      const r = Math.max(R[n.type] * cam.z, GV.input.isTouch ? 16 : 10) / cam.z;
      const dd = (n.x - w.x) ** 2 + (n.y - w.y) ** 2;
      if (dd < r * r && dd < bd) { bd = dd; best = n.id; }
    }
    return best;
  }
  function zoomAt(sx, sy, f) {
    const before = toWorld(sx, sy);
    cam.z = Math.max(0.18, Math.min(2.4, cam.z * f));
    const after = toWorld(sx, sy);
    cam.x += before.x - after.x; cam.y += before.y - after.y;
  }

  function bindInput() {
    const rel = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, rel(e));
      moved = false;
      if (ptrs.size === 1) drag = { ...rel(e), cx: cam.x, cy: cam.y };
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: cam.z }; drag = null; }
    });
    cv.addEventListener('pointermove', (e) => {
      const p = rel(e);
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, p);
      if (pinch && ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const f = (pinch.z * (d / pinch.d)) / cam.z;
        zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, f);
        moved = true;
      } else if (drag && ptrs.size === 1) {
        const dx = p.x - drag.x, dy = p.y - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
        cam.x = drag.cx - dx / cam.z; cam.y = drag.cy - dy / cam.z;
      } else if (e.pointerType === 'mouse') {
        const h = pickNode(p.x, p.y);
        if (h !== hover) { hover = h; tip(); cv.classList.toggle('overItem', h != null); }
      }
    });
    const up = (e) => {
      const p = rel(e);
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = null;
      if (!ptrs.size) {
        if (!moved) {
          const id = pickNode(p.x, p.y);
          if (id != null && id === sel && !T().has(id)) onAction('alloc');
          else { sel = id; preview = id != null ? T().pathTo(id) || [] : []; GV.audio.sfx('ui'); }
          tip();
        }
        drag = null;
      }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); drag = null; pinch = null; });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const p = rel(e); zoomAt(p.x, p.y, e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
  }

  function tip() {
    const el = document.getElementById('tvTip');
    if (!el) return;
    const pts = T().points();
    const note = GV.save.data.treeResetNote;
    document.getElementById('tvPts').innerHTML = `<b>${pts}</b> point${pts === 1 ? '' : 's'} · ${T().spent()} / ${T().CAP} max · ✦ ${GV.save.data.memories}${note ? ` · <span class="warn">${note === 'new' ? 'The tree has been rebuilt: every point refunded, free' : 'New point rules: your tree was reset for free'}</span>` : ''}`;
    const rb = document.getElementById('tvReset');
    if (!rb.dataset.armed) rb.textContent = 'Reset tree';
    const id = sel != null ? sel : hover;
    if (id == null) { el.className = 'tree-tip'; el.innerHTML = ''; return; }
    const n = T().nodes[id], esc = GV.menus.esc;
    const kind = n.sig ? `Signature · ${GV.CLASSES[n.cls].name} only` : { small: 'Passive', notable: 'Notable', keystone: 'Keystone', classStart: 'Class start' }[n.type];
    const lines = T().lines(n).map((l) => `<li>${esc(l)}</li>`).join('');
    let act = '';
    if (sel != null) {
      if (T().has(id)) {
        act = T().canRefund(id) ? `<button data-a="refund">Refund · ${T().refundCost()} ✦</button>` : (id === T().root() ? '<span class="muted">Your starting point</span>' : '<span class="muted">Other passives depend on this one</span>');
      } else if (n.type === 'classStart') act = '<span class="muted">Another class starts here</span>';
      else if (n.sig && n.cls !== GV.save.data.cls) act = `<span class="muted">Only a ${esc(GV.CLASSES[n.cls].name)} can take this</span>`;
      else {
        const p = T().pathTo(id);
        if (!p) act = '<span class="muted">Not reachable</span>';
        else if (p.length > pts) act = `<span class="muted">Needs ${p.length} point${p.length > 1 ? 's' : ''} · you have ${pts}</span>`;
        else act = `<button class="primary" data-a="alloc">Allocate${p.length > 1 ? ` path (${p.length} points)` : ''}</button>`;
      }
    }
    el.className = 'tree-tip show ' + n.type;
    el.style.setProperty('--h', hue(n));
    el.innerHTML = `<div class="tk">${kind}${n.cluster ? ' · ' + esc(n.cluster) : ''}</div><div class="tn">${esc(n.name)}</div><ul>${lines}</ul><div class="ta">${act}</div>`;
    el.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => onAction(b.dataset.a, b)));
  }

  function loop(now) {
    if (!cv || !document.body.contains(cv)) { raf = 0; return; }
    if (cv.width !== Math.round(cv.clientWidth * dpr)) sizeCanvas();
    if (goTo) { const k = 0.16; cam.x += (goTo.x - cam.x) * k; cam.y += (goTo.y - cam.y) * k; cam.z += (goTo.z - cam.z) * k; if (Math.abs(goTo.x - cam.x) + Math.abs(goTo.y - cam.y) < 2) goTo = null; }
    draw(now / 1000);
    raf = requestAnimationFrame(loop);
  }

  function draw(t) {
    const W = cv.clientWidth, H = cv.clientHeight, tr = T(), nodes = tr.nodes;
    const alloc = new Set(GV.save.data.passives), pts = tr.points();
    const prev = new Set(preview || []);
    const match = query.length > 1 ? new Set(nodes.filter((n) => (n.name + ' ' + tr.lines(n).join(' ')).toLowerCase().includes(query)).map((n) => n.id)) : null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#04050b'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
    // backdrop: faint rings and arm names
    ctx.strokeStyle = 'rgba(140,160,220,0.06)'; ctx.lineWidth = 2 / cam.z;
    for (const r of [390, 660, 1060, 1300, 1560]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // region names, faint and huge, with the class beneath
    for (const Rg of tr.REGIONS) {
      const a = Rg.ang * Math.PI / 180, x = Math.cos(a) * 930, y = Math.sin(a) * 930, mine = Rg.cls === GV.save.data.cls;
      ctx.fillStyle = `hsla(${Rg.hue},80%,62%,${mine ? 0.16 : 0.08})`;
      ctx.font = `800 ${Math.max(58, 24 / cam.z)}px ${GV.CFG.FONT}`;
      ctx.fillText(Rg.name.toUpperCase(), x, y);
      ctx.font = `600 ${Math.max(22, 11 / cam.z)}px ${GV.CFG.FONT}`;
      ctx.fillText(GV.CLASSES[Rg.cls].name.toUpperCase(), x, y + Math.max(56, 24 / cam.z));
    }
    // edges
    for (const [a, b] of tr.edges) {
      const A = nodes[a], B = nodes[b];
      const ia = alloc.has(a), ib = alloc.has(b);
      const pa = prev.has(a) || ia, pb = prev.has(b) || ib;
      if (ia && ib) { ctx.strokeStyle = `hsla(${hue(B)},90%,65%,0.95)`; ctx.lineWidth = 6; }
      else if (pa && pb && (prev.has(a) || prev.has(b))) { ctx.strokeStyle = 'rgba(255,230,140,0.85)'; ctx.lineWidth = 5; }
      else if ((ia || ib) && pts > 0) { ctx.strokeStyle = 'rgba(220,230,255,0.38)'; ctx.lineWidth = 4; }
      else { ctx.strokeStyle = 'rgba(120,135,175,0.2)'; ctx.lineWidth = 3; }
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    }
    // nodes
    const pulse = 0.5 + Math.sin(t * 4) * 0.5;
    for (const n of nodes) {
      const r = R[n.type], h = hue(n), on = alloc.has(n.id);
      const locked = n.sig && n.cls !== GV.save.data.cls;
      const canNext = !on && pts > 0 && tr.allowed(n.id) && n.adj.some((x) => alloc.has(x));
      if (on) GV.art.glow(ctx, n.x, n.y, r * 3, `hsla(${h},90%,60%,0.5)`);
      ctx.fillStyle = on ? `hsl(${h},85%,58%)` : prev.has(n.id) ? 'rgba(255,230,140,0.35)' : '#121624';
      ctx.strokeStyle = on ? `hsl(${h},95%,80%)` : canNext ? `hsla(${h},95%,70%,${0.5 + pulse * 0.5})` : `hsla(${h},40%,55%,0.55)`;
      ctx.lineWidth = n.type === 'small' ? 3 : 4;
      ctx.beginPath();
      if (n.type === 'keystone') {
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? r * 0.78 : r; ctx.lineTo(n.x + Math.cos(a) * rr, n.y + Math.sin(a) * rr); }
        ctx.closePath();
      } else if (n.sig) {
        for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; ctx.lineTo(n.x + Math.cos(a) * (r + 5), n.y + Math.sin(a) * (r + 5)); }
        ctx.closePath();
        if (locked) ctx.globalAlpha = 0.45;
      } else if (n.type === 'classStart') {
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; ctx.lineTo(n.x + Math.cos(a) * r, n.y + Math.sin(a) * r); }
        ctx.closePath();
      } else ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
      if (n.sig) { ctx.fillStyle = on ? '#fff' : locked ? 'rgba(255,255,255,0.35)' : `hsl(${h},95%,75%)`; ctx.font = `700 13px ${GV.CFG.FONT}`; ctx.fillText(locked ? '🔒' : '✦', n.x, n.y + 1); }
      else if (n.type === 'notable' || n.type === 'keystone') {
        ctx.strokeStyle = on ? '#fff' : `hsla(${h},60%,70%,0.5)`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 0.55, 0, Math.PI * 2); ctx.stroke();
      }
      if (n.type === 'classStart') {
        ctx.fillStyle = n.cls === GV.save.data.cls ? '#fff' : 'rgba(255,255,255,0.3)';
        ctx.font = `700 14px ${GV.CFG.FONT}`;
        ctx.fillText(n.cls[0].toUpperCase(), n.x, n.y + 1);
      }
      if (match && match.has(n.id)) { ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(n.x, n.y, r + 8 + pulse * 4, 0, Math.PI * 2); ctx.stroke(); }
      if (n.id === sel) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2); ctx.stroke(); }
      if ((n.type === 'notable' || n.type === 'keystone' || n.type === 'classStart') && cam.z > 0.42) {
        ctx.fillStyle = on ? '#fff' : 'rgba(220,228,245,0.7)';
        ctx.font = `600 ${Math.round(12 / Math.min(1, cam.z))}px ${GV.CFG.FONT}`;
        ctx.fillText(n.name, n.x, n.y + r + 14 / Math.min(1, cam.z));
      }
    }
    ctx.restore();
  }

  GV.treeView = { open, close };
})();
