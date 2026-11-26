// Galactic Void — macros. Two kinds, each on its own key (or mouse button / wheel):
//   Sequence: one press runs a chain of actions in order. Every skill step waits until the skill can
//             actually be used (up to 1.5s), then the step's delay runs before the next one.
//   Repeat:   uses one action again and again on a timer, either toggled on/off or while held.
// Stored on this device, alongside the keybinds.
(function () {
  const GV = window.GV, I = GV.input, M = GV.menus, esc = M.esc;
  const KEY = 'gv_macros_v1', MAX = 8, MAXSTEPS = 10;
  const STEP_ACTS = ['attack', 'skill1', 'skill2', 'skill3', 'dash', 'jump', 'flask1', 'flask2', 'wait'];
  const PRESS_ONLY = { dash: 1, jump: 1, flask1: 1, flask2: 1 };
  const actName = (a) => (a === 'wait' ? 'Wait' : slotName(a) || I.ACTIONS[a]);
  // Name a skill action after the Star Core in that slot, if there is one.
  function slotName(a) {
    const i = ['attack', 'skill1', 'skill2', 'skill3'].indexOf(a); if (i < 0) return null;
    try { const d = GV.save.data, g = d.bar && d.bar[i] && (d.gems || []).find((x) => x.uid === d.bar[i]); const def = g && GV.GEMS[g.id]; return def ? `${I.ACTIONS[a]} · ${def.name}` : null; } catch (e) { return null; }
  }

  let list = [];
  const load = () => { try { list = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { list = []; } rekey(); };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} rekey(); GV.sync && GV.sync.changed && GV.sync.changed(); };
  function rekey() { I.macroKeys = {}; list.forEach((m, i) => { if (m.key) I.macroKeys[m.key] = i; }); }
  GV.macros = { list: () => list, save, load };

  // A key used by a macro comes off any action, and vice versa.
  const freeCode = (code, keepMacro) => {
    if (!code) return;
    const B = I.binds();
    for (const a in B) B[a].forEach((c, i) => { if (c === code) I.setBind(a, i, null); });
    list.forEach((m, i) => { if (i !== keepMacro && m.key === code) m.key = null; });
  };
  const setBind0 = I.setBind.bind(I);
  I.setBind = function (a, i, code) { if (code) { let ch = false; list.forEach((m) => { if (m.key === code) { m.key = null; ch = true; } }); if (ch) save(); } return setBind0(a, i, code); };

  // ---------------- running ----------------
  const run = { seq: null, rep: {}, firing: [], useN: 0 };
  I.onMacro = (idx, down) => {
    const m = list[idx]; if (!m) return;
    if (m.type === 'rep') {
      const r = run.rep[idx];
      if (m.mode === 'hold') { if (down) run.rep[idx] = { t: 1e9 }; else delete run.rep[idx]; }
      else if (down) { if (r) delete run.rep[idx]; else run.rep[idx] = { t: 1e9 }; }
      return;
    }
    if (down && (!run.seq || run.seq.idx !== idx)) run.seq = { idx, i: 0, phase: 'go', t: 0 };
  };
  const useS = GV.Skills.use;
  GV.Skills.use = function (p, pl, s, slot, opts) { if (pl && !pl.slot && !(opts && opts.echoed)) run.useN++; return useS.apply(this, arguments); };

  function fire(a, dt) {
    if (a === 'wait') return true;
    if (PRESS_ONLY[a]) { I.vPress(a); return true; }
    run.firing.push({ a, n: run.useN, t: 1.5 });
    return false;
  }
  function tick(pl, dt) {
    if (run.pl !== pl) { resetRun(); run.pl = pl; } // a new stage starts with nothing running
    // finish any skill presses: hold until the skill goes off, or give up after 1.5s
    for (const f of run.firing) { f.t -= dt; I.vHold(f.a, true); }
    const done = run.firing.filter((f) => run.useN > f.n || f.t <= 0);
    for (const f of done) I.vHold(f.a, false);
    run.firing = run.firing.filter((f) => !done.includes(f));
    if (pl.dead) { run.seq = null; return; }
    // sequence
    const S = run.seq;
    if (S) {
      const m = list[S.idx];
      if (!m || !m.steps || !m.steps.length) run.seq = null;
      else if (S.phase === 'go') {
        const st = m.steps[S.i];
        fire(st.a, dt);
        S.n = run.useN; S.phase = st.a === 'wait' || PRESS_ONLY[st.a] ? 'wait' : 'cast'; S.t = st.a === 'wait' ? +st.wait || 0.2 : +st.wait || 0; S.c = 1.5;
      } else if (S.phase === 'cast') {
        S.c -= dt;
        if (run.useN > S.n || S.c <= 0) S.phase = 'wait';
      } else if (S.phase === 'wait') {
        S.t -= dt;
        if (S.t <= 0) { S.i++; if (S.i >= m.steps.length) run.seq = null; else S.phase = 'go'; }
      }
    }
    // repeats
    for (const k in run.rep) {
      const m = list[k], r = run.rep[k];
      if (!m) { delete run.rep[k]; continue; }
      r.t += dt;
      if (r.t >= Math.max(0.1, +m.every || 1)) { r.t = 0; fire(m.act || 'attack', dt); }
    }
  }
  const pu0 = GV.Player.prototype.update;
  GV.Player.prototype.update = function (dt, p) { if (!this.slot) tick(this, dt); pu0.call(this, dt, p); };
  const resetRun = () => { run.seq = null; run.rep = {}; for (const f of run.firing) I.vHold(f.a, false); run.firing = []; };
  GV.macros.reset = resetRun;
  const st0 = GV.Play.prototype.respawnPlayer;
  if (st0) GV.Play.prototype.respawnPlayer = function () { resetRun(); return st0.apply(this, arguments); };

  // HUD: what's running
  const hud0 = GV.hud.draw;
  GV.hud.draw = function (ctx, p) {
    hud0.call(this, ctx, p);
    const on = Object.keys(run.rep).map((k) => list[k] && list[k].name).filter(Boolean);
    if (run.seq && list[run.seq.idx]) on.unshift('▶ ' + list[run.seq.idx].name);
    if (!on.length) return;
    ctx.save(); ctx.font = `700 11px ${GV.CFG.FONT}`; ctx.textAlign = 'left';
    const txt = on.map((n) => (n.startsWith('▶') ? n : '⟳ ' + n)).join('   ');
    const w = ctx.measureText(txt).width + 18, x = 250, y = GV.CFG.H - 54;
    ctx.fillStyle = 'rgba(10,14,24,0.7)'; ctx.fillRect(x - 8, y - 13, w, 19);
    ctx.fillStyle = '#ffd36b'; ctx.fillText(txt, x, y);
    ctx.restore();
  };

  // ---------------- editor ----------------
  const kb0 = M.keybinds;
  M.keybinds = function (back) {
    kb0.call(this, back);
    const grid = document.querySelector('#ui .keybinds .kbgrid');
    if (!grid) return;
    const box = document.createElement('div');
    box.className = 'macrobox';
    box.innerHTML = `<div class="gsub">Macros <span>${list.length}/${MAX}</span></div>
      ${list.length ? list.map((m, i) => `<div class="mrow"><b>${esc(m.name || 'Macro')}</b><span>${m.type === 'rep' ? `⟳ ${esc(actName(m.act || 'attack'))} every ${(+m.every || 1).toFixed(2).replace(/\.?0+$/, '')}s · ${m.mode === 'hold' ? 'while held' : 'toggle'}` : esc((m.steps || []).map((s) => (s.a === 'wait' ? `wait ${s.wait}s` : actName(s.a).replace(/^.* · /, ''))).join(' → '))}</span>
        <i>${m.key ? esc(I.keyName(m.key)) : 'no key'}</i><button data-m="${i}">Edit</button></div>`).join('') : '<p class="muted">No macros yet. A sequence fires a chain of skills from one key; a repeat keeps using one on a timer.</p>'}
      <div class="menu row"><button data-mnew="seq" ${list.length >= MAX ? 'disabled' : ''}>New sequence</button><button data-mnew="rep" ${list.length >= MAX ? 'disabled' : ''}>New repeat</button></div>`;
    grid.after(box);
    box.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); edit(+b.dataset.m, back); }));
    box.querySelectorAll('[data-mnew]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = b.dataset.mnew;
      list.push(t === 'rep' ? { name: 'Auto-cast', type: 'rep', act: 'skill3', every: 8, mode: 'toggle', key: null } : { name: 'Combo', type: 'seq', key: null, steps: [{ a: 'dash', wait: 0.1 }, { a: 'skill1', wait: 0.1 }, { a: 'skill2', wait: 0 }] });
      save(); edit(list.length - 1, back);
    }));
  };

  function edit(idx, back) {
    const m = list[idx];
    if (!m) return M.keybinds(back);
    const opts = (sel, acts) => acts.map((a) => `<option value="${a}" ${a === sel ? 'selected' : ''}>${esc(actName(a))}</option>`).join('');
    const body = m.type === 'rep'
      ? `<div class="gsub">Action</div><select class="msel" id="mAct">${opts(m.act || 'skill3', STEP_ACTS.filter((a) => a !== 'wait'))}</select>
         <div class="gsub">Every <span>seconds</span></div><input class="mnum" id="mEvery" type="number" min="0.1" max="60" step="0.1" value="${+m.every || 1}">
         <div class="gsub">Runs</div><div class="segs"><button data-mm="toggle" class="${m.mode !== 'hold' ? 'sel' : ''}">Toggle on / off</button><button data-mm="hold" class="${m.mode === 'hold' ? 'sel' : ''}">While held</button></div>`
      : `<div class="gsub">Steps <span>${m.steps.length}/${MAXSTEPS} · skills wait until ready, then the delay</span></div>
         ${m.steps.map((s, i) => `<div class="mstep"><em>${i + 1}</em><select class="msel" data-si="${i}">${opts(s.a, STEP_ACTS)}</select>
           <label>then wait <input class="mnum" data-sw="${i}" type="number" min="0" max="5" step="0.05" value="${+s.wait || 0}">s</label>
           <button data-up="${i}" ${i ? '' : 'disabled'}>↑</button><button data-del="${i}">✕</button></div>`).join('')}
         <div class="menu row"><button data-add="1" ${m.steps.length >= MAXSTEPS ? 'disabled' : ''}>+ Add step</button></div>`;
    M.render(`<div class="screen panel narrow macroedit"><h2>${m.type === 'rep' ? 'Repeat macro' : 'Sequence macro'}</h2>
      <div class="gsub">Name</div><input class="mname" id="mName" maxlength="24" value="${esc(m.name || '')}">
      <div class="gsub">Trigger</div><button class="kslot mkey ${m.key ? '' : 'empty'}" id="mKey">${m.key ? esc(I.keyName(m.key)) : 'Click, then press a key or mouse button'}</button>
      ${body}
      <div class="menu row"><button class="primary" data-a="done">Save</button><button class="ghost" data-a="del">Delete</button></div></div>`, (a) => {
      if (a === 'done') { sync(); save(); return M.keybinds(back); }
      if (a === 'del') { list.splice(idx, 1); save(); return M.keybinds(back); }
    }, () => { sync(); save(); M.keybinds(back); });
    const $ = (s) => document.querySelector('#ui ' + s);
    function sync() {
      m.name = ($('#mName') && $('#mName').value.trim()) || (m.type === 'rep' ? 'Auto-cast' : 'Combo');
      if (m.type === 'rep') { m.act = $('#mAct').value; m.every = Math.max(0.1, Math.min(60, +$('#mEvery').value || 1)); }
      else {
        document.querySelectorAll('#ui [data-si]').forEach((x) => { m.steps[+x.dataset.si].a = x.value; });
        document.querySelectorAll('#ui [data-sw]').forEach((x) => { m.steps[+x.dataset.sw].wait = Math.max(0, Math.min(5, +x.value || 0)); });
      }
    }
    const redo = () => { sync(); save(); edit(idx, back); };
    const on = (sel, fn) => document.querySelectorAll('#ui ' + sel).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); fn(b); }));
    on('[data-mm]', (b) => { m.mode = b.dataset.mm; redo(); });
    on('[data-add]', () => { sync(); m.steps.push({ a: 'attack', wait: 0.1 }); save(); edit(idx, back); });
    on('[data-del]', (b) => { sync(); m.steps.splice(+b.dataset.del, 1); if (!m.steps.length) m.steps.push({ a: 'attack', wait: 0 }); save(); edit(idx, back); });
    on('[data-up]', (b) => { sync(); const i = +b.dataset.up; [m.steps[i - 1], m.steps[i]] = [m.steps[i], m.steps[i - 1]]; save(); edit(idx, back); });
    on('#mKey', (b) => {
      sync();
      b.textContent = 'press…'; b.classList.add('wait');
      const done = (code) => {
        removeEventListener('keydown', k, true); removeEventListener('mousedown', ms, true); removeEventListener('wheel', wh, true); removeEventListener('contextmenu', nm, true);
        if (code) { freeCode(code, idx); m.key = code; }
        save(); setTimeout(() => edit(idx, back), 0);
      };
      const k = (e) => { e.preventDefault(); e.stopImmediatePropagation(); if (e.code === 'Escape') return done(null); if (e.code === 'Backspace' || e.code === 'Delete') { m.key = null; return done(null); } done(e.code); };
      const ms = (e) => { e.preventDefault(); e.stopImmediatePropagation(); done('Mouse' + e.button); };
      const wh = (e) => { e.preventDefault(); e.stopImmediatePropagation(); done(e.deltaY < 0 ? 'WheelUp' : 'WheelDown'); };
      const nm = (e) => e.preventDefault();
      setTimeout(() => { addEventListener('keydown', k, true); addEventListener('mousedown', ms, true); addEventListener('wheel', wh, { capture: true, passive: false }); addEventListener('contextmenu', nm, true); }, 60);
    });
  }

  load();
})();
