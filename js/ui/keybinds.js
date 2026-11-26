// Galactic Void — the keybind editor. Each action has three slots; click one, then press a key,
// click a mouse button or roll the wheel. Esc cancels, Backspace/Delete clears the slot.
(function () {
  const GV = window.GV, M = GV.menus, I = GV.input, esc = M.esc;
  const GROUPS = [
    ['Movement', ['left', 'right', 'jump', 'down', 'dash']],
    ['Combat', ['attack', 'skill1', 'skill2', 'skill3', 'flask1', 'flask2']],
    ['Ship & menus', ['interact', 'ping', 'gems', 'tree', 'gear', 'ascend', 'codex', 'skip', 'pause']],
  ];
  let note = '';

  M.keybinds = function (back) {
    const B = I.binds();
    const rows = GROUPS.map(([g, acts]) => `<div class="gsub">${g}</div>` + acts.map((a) => `
      <div class="kbrow"><span>${esc(I.ACTIONS[a])}</span>
        ${[0, 1, 2].map((i) => `<button class="kslot ${B[a][i] ? '' : 'empty'}" data-k="${a}" data-i="${i}">${esc(B[a][i] ? I.keyName(B[a][i]) : '+')}</button>`).join('')}
      </div>`).join('')).join('');
    M.render(`<div class="screen panel wide keybinds"><h2>Keybinds</h2>
      <p class="muted">${note ? `<b class="ok">${esc(note)}</b> ` : ''}Click a slot, then press a key, click a mouse button (side buttons work) or roll the wheel. Backspace clears a slot. A key can only do one thing: binding it here takes it off anything else.</p>
      <div class="kbpre"><span>Presets</span>
        <button data-a="mk" class="${I.bindPreset === 'mk' ? 'sel' : ''}">Mouse &amp; keyboard</button>
        <button data-a="classic" class="${I.bindPreset === 'classic' ? 'sel' : ''}">Keyboard only (classic)</button></div>
      <div class="kbgrid">${rows}</div>
      <div class="menu row"><button class="primary" data-a="back">Done</button></div></div>`, (a) => {
      if (a === 'back') { note = ''; return back(); }
      if (a === 'mk' || a === 'classic') { I.usePreset(a); note = a === 'mk' ? 'Mouse & keyboard layout loaded.' : 'Classic layout loaded.'; return M.keybinds(back); }
    }, () => { note = ''; back(); });
    document.querySelectorAll('#ui .kslot').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); capture(b, back); }));
  };

  function capture(btn, back) {
    const a = btn.dataset.k, i = +btn.dataset.i;
    document.querySelectorAll('#ui .kslot').forEach((x) => x.classList.remove('wait'));
    btn.classList.add('wait'); btn.textContent = 'press…';
    const B = I.binds();
    const done = (code, clear) => {
      removeEventListener('keydown', onKey, true); removeEventListener('mousedown', onMouse, true); removeEventListener('wheel', onWheel, true); removeEventListener('contextmenu', noMenu, true);
      if (code || clear) {
        const was = code && Object.keys(B).find((x) => x !== a && B[x].includes(code));
        I.setBind(a, i, clear ? null : code);
        note = clear ? `Cleared a slot on ${I.ACTIONS[a]}.` : `${I.keyName(code)} → ${I.ACTIONS[a]}${was ? ` (taken off ${I.ACTIONS[was]})` : ''}`;
      }
      setTimeout(() => M.keybinds(back), 0);
    };
    const onKey = (e) => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.code === 'Escape') return done(null);
      if (e.code === 'Backspace' || e.code === 'Delete') return done(null, true);
      done(e.code);
    };
    const onMouse = (e) => { e.preventDefault(); e.stopImmediatePropagation(); done('Mouse' + e.button); };
    const onWheel = (e) => { e.preventDefault(); e.stopImmediatePropagation(); done(e.deltaY < 0 ? 'WheelUp' : 'WheelDown'); };
    const noMenu = (e) => e.preventDefault();
    // wait a tick so the click that opened capture doesn't bind Mouse0 to itself
    setTimeout(() => {
      addEventListener('keydown', onKey, true); addEventListener('mousedown', onMouse, true);
      addEventListener('wheel', onWheel, { capture: true, passive: false }); addEventListener('contextmenu', noMenu, true);
    }, 60);
  }
})();
