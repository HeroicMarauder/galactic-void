// Galactic Void — the passive tree viewer. Drag to pan, scroll or pinch to zoom, tap a node.
// Tapping a distant node previews the whole path to it (PoE-style) and allocates it in one go.
(function () {
  const GV = window.GV, T = () => GV.TREE;
  let from = 'map', cv, ctx, raf = 0, cam = { x: 0, y: 0, z: 0.5 }, sel = null, hover = null, preview = [], query = '';
  const ptrs = new Map();
  let drag = null, pinch = null, moved = false, dpr = 1;

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
        <div class="tree-tip" id="tvTip"></div>
        <div class="tree-hint">${GV.input.isTouch ? 'Drag to pan · pinch to zoom · tap a node' : 'Drag to pan · scroll to zoom · click a node'}</div>
      </div>`, onAction, () => (sel != null ? (sel = null, preview = [], tip()) : close()));
    cv = document.getElementById('treeCv');
    ctx = cv.getContext('2d');
    sizeCanvas();
    const root = T().nodes[T().root()];
    const fit = Math.min(cv.clientWidth, cv.clientHeight) / 1100;
    cam = { x: root.x * 0.6, y: root.y * 0.6, z: Math.max(0.32, Math.min(0.8, fit * 1.3)) };
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
  function onAction(a) {
    if (a === 'close') return close();
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
        if (h !== hover) { hover = h; tip(); }
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
    document.getElementById('tvPts').innerHTML = `<b>${pts}</b> point${pts === 1 ? '' : 's'} · ${T().spent()} / ${T().CAP} max · ✦ ${GV.save.data.memories}${GV.save.data.treeResetNote ? ' · <span class="warn">New point rules: your tree was reset for free</span>' : ''}`;
    const rb = document.getElementById('tvReset');
    if (!rb.dataset.armed) rb.textContent = 'Reset tree';
    const id = sel != null ? sel : hover;
    if (id == null) { el.className = 'tree-tip'; el.innerHTML = ''; return; }
    const n = T().nodes[id], esc = GV.menus.esc;
    const kind = { small: 'Passive', notable: 'Notable', keystone: 'Keystone', classStart: 'Class start' }[n.type];
    const lines = T().lines(n).map((l) => `<li>${esc(l)}</li>`).join('');
    let act = '';
    if (sel != null) {
      if (T().has(id)) {
        act = T().canRefund(id) ? `<button data-a="refund">Refund · ${T().refundCost()} ✦</button>` : (id === T().root() ? '<span class="muted">Your starting point</span>' : '<span class="muted">Other passives depend on this one</span>');
      } else if (n.type === 'classStart') act = '<span class="muted">Another class starts here</span>';
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
    el.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => onAction(b.dataset.a)));
  }

  function loop(now) {
    if (!cv || !document.body.contains(cv)) { raf = 0; return; }
    if (cv.width !== Math.round(cv.clientWidth * dpr)) sizeCanvas();
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
    for (const r of [340, 580, 860, 1100]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.max(60, 26 / cam.z)}px ${GV.CFG.FONT}`;
    for (const k in tr.ARMS) {
      const a = tr.ARMS[k].ang * Math.PI / 180;
      ctx.fillStyle = `hsla(${tr.GROUPS[k].hue},80%,60%,0.07)`;
      ctx.fillText(tr.ARMS[k].name.toUpperCase(), Math.cos(a) * 720, Math.sin(a) * 720);
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
      const canNext = !on && pts > 0 && n.type !== 'classStart' && n.adj.some((x) => alloc.has(x));
      if (on) GV.art.glow(ctx, n.x, n.y, r * 3, `hsla(${h},90%,60%,0.5)`);
      ctx.fillStyle = on ? `hsl(${h},85%,58%)` : prev.has(n.id) ? 'rgba(255,230,140,0.35)' : '#121624';
      ctx.strokeStyle = on ? `hsl(${h},95%,80%)` : canNext ? `hsla(${h},95%,70%,${0.5 + pulse * 0.5})` : `hsla(${h},40%,55%,0.55)`;
      ctx.lineWidth = n.type === 'small' ? 3 : 4;
      ctx.beginPath();
      if (n.type === 'keystone') {
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? r * 0.78 : r; ctx.lineTo(n.x + Math.cos(a) * rr, n.y + Math.sin(a) * rr); }
        ctx.closePath();
      } else if (n.type === 'classStart') {
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; ctx.lineTo(n.x + Math.cos(a) * r, n.y + Math.sin(a) * r); }
        ctx.closePath();
      } else ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      if (n.type === 'notable' || n.type === 'keystone') {
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
