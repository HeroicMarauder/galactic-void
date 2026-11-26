// Galactic Void — input. Keyboard (arrows / WASD) and multi-touch share one action map.
(function () {
  const GV = window.GV;
  // ---- Keybinds ----
  // Every action can have up to three bindings: keys (KeyboardEvent.code), mouse buttons
  // (Mouse0 left, Mouse1 middle, Mouse2 right, Mouse3/Mouse4 side buttons) or the wheel.
  const ACTIONS = {
    left: 'Move left', right: 'Move right', jump: 'Jump', down: 'Down / drop', dash: 'Phase Dash',
    attack: 'Attack (slot 1)', skill1: 'Skill slot 2', skill2: 'Skill slot 3', skill3: 'Skill slot 4',
    flask1: 'Life flask', flask2: 'Charge flask', interact: 'Talk / interact',
    ping: 'Ping / quick chat (online)', gems: 'Star Cores', tree: 'Passive tree', gear: 'Gear', ascend: 'Ascendancy', codex: 'Codex', skip: 'Next song', pause: 'Pause',
  };
  const PRESETS = {
    // Left hand on WASD, right hand on the mouse: everything a fight needs is reachable at once.
    mk: { left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], jump: ['Space', 'KeyW'], down: ['KeyS', 'ArrowDown'], dash: ['ShiftLeft', 'Mouse3'],
      attack: ['Mouse0', 'KeyJ'], skill1: ['Mouse2', 'KeyK'], skill2: ['KeyQ', 'KeyL', 'Mouse4'], skill3: ['KeyE', 'KeyI'],
      flask1: ['Digit1', 'KeyZ'], flask2: ['Digit2', 'KeyX'], interact: ['KeyF'], ping: ['KeyC'],
      gems: ['KeyG'], tree: ['KeyT'], gear: ['KeyB', 'Tab'], ascend: ['KeyY'], codex: ['KeyO'], skip: ['KeyN'], pause: ['Escape', 'KeyP'] },
    // The original keyboard-only layout: move with one hand, J K L I with the other.
    classic: { left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], jump: ['ArrowUp', 'KeyW', 'Space'], down: ['ArrowDown', 'KeyS'], dash: ['ShiftLeft', 'ShiftRight'],
      attack: ['KeyJ', 'KeyX', 'Mouse0'], skill1: ['KeyK', 'Mouse2'], skill2: ['KeyL', 'KeyC'], skill3: ['KeyI', 'KeyV'],
      flask1: ['KeyQ', 'Digit1'], flask2: ['KeyR', 'Digit2'], interact: ['KeyE'], ping: ['KeyH'],
      gems: ['KeyG'], tree: ['KeyT'], gear: ['KeyB'], ascend: ['KeyY'], codex: ['KeyO'], skip: ['KeyN'], pause: ['Escape', 'KeyP'] },
  };
  const MAP = {}; // code -> action, rebuilt from the binds
  let BINDS = null;
  const BKEY = 'gv_binds_v1';
  function rebuild() {
    for (const k in MAP) delete MAP[k];
    for (const a in BINDS) for (const c of BINDS[a]) if (c) MAP[c] = a;
    MAP.Enter = MAP.Enter || 'confirm';
  }
  function loadBinds() {
    let b = null;
    try { b = JSON.parse(localStorage.getItem(BKEY) || 'null'); } catch (e) {}
    BINDS = {};
    const base = PRESETS[(b && b.preset) || 'mk'] || PRESETS.mk;
    const used = new Set(); if (b && b.binds) for (const a in b.binds) for (const c of b.binds[a] || []) used.add(c);
    // an action added after the binds were saved gets its default keys only where they're still free
    for (const a in ACTIONS) BINDS[a] = (b && b.binds && b.binds[a] ? b.binds[a] : (base[a] || []).filter((c) => !(b && b.binds) || !used.has(c))).slice(0, 3);
    I && (I.bindPreset = (b && b.preset) || 'mk');
    rebuild();
  }
  const KN = { Space: 'Space', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'L-Alt', AltRight: 'R-Alt', Tab: 'Tab', Enter: 'Enter', Escape: 'Esc', Backquote: '`', CapsLock: 'Caps',
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Mouse0: 'LMB', Mouse1: 'MMB', Mouse2: 'RMB', Mouse3: 'Mouse 4', Mouse4: 'Mouse 5', WheelUp: 'Wheel ↑', WheelDown: 'Wheel ↓',
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\' };
  const keyName = (c) => (!c ? '—' : KN[c] || c.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ').replace(/^F(\d+)$/, 'F$1'));
  const keyDown = {}, held = {}, pressed = {}, touchHeld = {}, vHeld = {};

  const I = (GV.input = {
    ACTIONS, PRESETS,
    binds: () => BINDS,
    keyName,
    // The name of the first binding of an action, for prompts ("F · TALK").
    label(a, mouseOk = true) { const b = (BINDS[a] || []).filter((c) => c && (mouseOk || !/^Mouse|^Wheel/.test(c))); return keyName(b[0]); },
    setBind(a, i, code) {
      if (code) for (const x in BINDS) BINDS[x] = BINDS[x].map((c) => (c === code ? null : c));
      BINDS[a] = BINDS[a] || []; BINDS[a][i] = code || null;
      this.saveBinds(); I.clear();
    },
    reloadBinds() { loadBinds(); },
    // Text with {action} placeholders, filled with the player's current keys ("{attack}" -> "LMB").
    // {left/right} joins two actions; {a|b} lists both bindings' first keys.
    fill(str) { return String(str || '').replace(/\{([a-z0-9|\/]+)\}/gi, (m, k) => k.split(/([|\/])/).map((x) => (x === '|' ? ' / ' : x === '/' ? ' / ' : (BINDS[x] ? keyName((BINDS[x] || []).filter(Boolean)[0]) : x))).join('')); },
    usePreset(name) { try { localStorage.setItem(BKEY, JSON.stringify({ preset: name })); } catch (e) {} loadBinds(); I.clear(); },
    saveBinds() { for (const x in BINDS) BINDS[x] = BINDS[x].slice(0, 3); try { localStorage.setItem(BKEY, JSON.stringify({ preset: I.bindPreset, binds: BINDS, custom: true })); } catch (e) {} rebuild(); GV.sync && GV.sync.changed && GV.sync.changed(); },
    inMenu: true,
    isTouch: false,
    onKey: null,
    held: (a) => !!(held[a] || touchHeld[a] || vHeld[a]),
    // Virtual input, used by macros.
    vPress(a) { pressed[a] = true; },
    vHold(a, on) { vHeld[a] = !!on; },
    macroKeys: {}, onMacro: null,
    pressed: (a) => !!pressed[a],
    endFrame() { for (const k in pressed) pressed[k] = false; },
    clear() {
      for (const k in keyDown) keyDown[k] = false;
      for (const k in held) held[k] = false;
      for (const k in touchHeld) touchHeld[k] = false;
      for (const k in pressed) pressed[k] = false;
      for (const k in vHeld) vHeld[k] = false;
    },
    tap() { pressed.confirm = true; },
  });
  loadBinds();

  function recompute(a) {
    let v = false;
    for (const c in keyDown) if (keyDown[c] && MAP[c] === a) v = true;
    held[a] = v;
  }

  addEventListener('keydown', (e) => {
    GV.audio && GV.audio.unlock();
    if (I.onKey && I.onKey(e)) return;
    if (!I.inMenu && I.macroKeys[e.code] != null) { e.preventDefault(); if (!e.repeat && I.onMacro) I.onMacro(I.macroKeys[e.code], true); return; }
    const a = MAP[e.code];
    if (!a) return;
    if (!I.inMenu) e.preventDefault();
    if (e.repeat) return;
    if (!held[a] && !touchHeld[a]) pressed[a] = true;
    keyDown[e.code] = true;
    recompute(a);
  });
  addEventListener('keyup', (e) => {
    if (I.macroKeys[e.code] != null && I.onMacro) I.onMacro(I.macroKeys[e.code], false);
    const a = MAP[e.code];
    if (!a) return;
    keyDown[e.code] = false;
    recompute(a);
  });
  addEventListener('blur', () => I.clear());

  function press(a) {
    if (!touchHeld[a] && !held[a]) pressed[a] = true;
    touchHeld[a] = true;
  }
  function release(a) { touchHeld[a] = false; }

  // ---- Gamepad (standard mapping: Xbox / PlayStation / Switch Pro) ----
  // A jump · B dash · X attack · Y skill 1 · LB skill 2 · RB skill 3 · LT/RT flasks
  // D-pad up talk · Start pause · Select passive tree · L3 gems · R3 gear. In menus the
  // stick/D-pad moves focus, A presses, B goes back.
  const PADMAP = { 0: 'jump', 1: 'dash', 2: 'attack', 3: 'skill1', 4: 'skill2', 5: 'skill3', 6: 'flask1', 7: 'flask2', 8: 'tree', 9: 'pause', 10: 'gems', 11: 'gear', 12: 'interact' };
  const ACTS = ['left', 'right', 'down', 'jump', 'dash', 'attack', 'skill1', 'skill2', 'skill3', 'flask1', 'flask2', 'tree', 'pause', 'gems', 'gear', 'interact'];
  const padHeld = {}, padPrev = [{}, {}, {}, {}];
  // Player 2 (co-op) has its own channel, fed only by a gamepad.
  const p2held = {}, p2pressed = {};
  I.p2 = { held: (a) => !!p2held[a], pressed: (a) => !!p2pressed[a], clear() { for (const k in p2held) p2held[k] = false; for (const k in p2pressed) p2pressed[k] = false; } };
  const endFrame0 = I.endFrame;
  I.endFrame = function () { endFrame0(); for (const k in p2pressed) p2pressed[k] = false; };
  const clear0 = I.clear;
  I.clear = function () { clear0(); I.p2.clear(); for (const k in padHeld) padHeld[k] = false; };
  let menuRep = 0, menuDir = null;
  I.pad = null; I.pads = 0; I.coop = false;
  const fake = (code) => ({ code, repeat: false, preventDefault() {} });
  function readPad(gp) {
    const bt = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const now = { left: bt(14) || ax < -0.45, right: bt(15) || ax > 0.45, down: bt(13) || ay > 0.6, up: bt(12) || ay < -0.6 };
    for (const i in PADMAP) now[PADMAP[i]] = (now[PADMAP[i]] || false) || bt(+i);
    now.confirm = bt(0); now.back = bt(1);
    return now;
  }
  // Which player a pad drives. Solo: every pad is Player 1. Co-op: with two pads, pad 1 is P1
  // and pad 2 is P2; with one pad, the keyboard is P1 and the pad is P2.
  const roleOf = (i, n) => (!I.coop ? 0 : n >= 2 ? (i === 0 ? 0 : 1) : 1);
  I.pollPad = function (dt) {
    let raw = [];
    try { raw = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { return; }
    const pads = [];
    for (const g of raw || []) if (g && g.connected) pads.push(g);
    I.pads = pads.length;
    if (!pads.length) {
      if (I.pad) { I.pad = null; for (const k in padHeld) if (padHeld[k]) { touchHeld[k] = false; padHeld[k] = false; } I.p2.clear(); }
      return;
    }
    if (!I.pad) { I.pad = pads[0].id; GV.audio && GV.audio.unlock(); }
    const ui = document.getElementById('ui');
    const inMenu = ui && ui.classList.contains('show');
    const p1 = {}, p2 = {}, any = {};
    pads.forEach((gp, i) => {
      const now = readPad(gp), prev = padPrev[i] || (padPrev[i] = {});
      for (const k in now) {
        if (now[k]) any[k] = true;
        if (now[k] && !prev[k]) any['_' + k] = true; // edge on any pad
      }
      const role = roleOf(i, pads.length), tgt = role ? p2 : p1;
      for (const k in now) tgt[k] = tgt[k] || now[k];
      const rx = gp.axes[2] || 0, ry = gp.axes[3] || 0, rm = Math.hypot(rx, ry);
      if (rm > 0.35) { I.aim.stick[role] = { x: rx / rm, y: ry / rm }; I.aim.stickT[role] = performance.now() / 1000; }
      padPrev[i] = now;
    });
    if (inMenu) {
      // Any pad can drive the menus.
      for (const k in padHeld) if (padHeld[k]) { touchHeld[k] = false; padHeld[k] = false; }
      I.p2.clear();
      const dir = any.down ? 'ArrowDown' : any.up ? 'ArrowUp' : any.left ? 'ArrowLeft' : any.right ? 'ArrowRight' : null;
      if (dir && (dir !== menuDir || (menuRep -= dt) <= 0)) { menuRep = dir !== menuDir ? 0.38 : 0.12; I.onKey && I.onKey(fake(dir)); }
      menuDir = dir;
      if (any._confirm) {
        const ae = document.activeElement;
        if (ae && ui.contains(ae) && ae.click) ae.click();
        else { const b0 = ui.querySelector('button.primary:not([disabled])') || ui.querySelector('button:not([disabled])'); if (b0) b0.focus(); }
      }
      if (any._back || any._pause) I.onKey && I.onKey(fake('Escape'));
      return;
    }
    for (const k of ACTS) {
      if (p1[k] && !padHeld[k]) { if (!held[k] && !touchHeld[k]) pressed[k] = true; touchHeld[k] = true; padHeld[k] = true; }
      else if (!p1[k] && padHeld[k]) { touchHeld[k] = false; padHeld[k] = false; }
      if (p2[k] && !p2held[k]) p2pressed[k] = true;
      p2held[k] = !!p2[k];
    }
    if (p2.pause && !p2held._pause) pressed.pause = true; // either player can pause
    p2held._pause = !!p2.pause;
    if (any._confirm) pressed.confirm = true;
  };
  addEventListener('gamepadconnected', () => { GV.audio && GV.audio.unlock(); });

  I.bindTouch = function () {
    const showTouch = () => {
      if (!I.isTouch) {
        I.isTouch = true;
        document.body.classList.add('touch');
      }
    };
    if ('ontouchstart' in window || (window.matchMedia && matchMedia('(pointer:coarse)').matches)) showTouch();
    addEventListener('touchstart', showTouch, { passive: true });

    document.querySelectorAll('#touch [data-act]').forEach((el) => {
      const a = el.dataset.act;
      // Attack fires at once and can be dragged to steer it. Skills: a tap (or a hold) fires; drag
      // off the button to aim, and the skill fires where you point when you let go.
      const aimable = a === 'attack' || a === 'skill1' || a === 'skill2' || a === 'skill3';
      const deferred = aimable && a !== 'attack';
      let id = null, ox = 0, oy = 0, dragged = false, fired = false, holdT = null;
      const fire = () => { if (!fired) { fired = true; press(a); } };
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        id = e.pointerId;
        try { el.setPointerCapture(id); } catch (_) {}
        const r = el.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2;
        dragged = false; fired = false;
        if (deferred) holdT = setTimeout(() => { if (id != null && !dragged) fire(); }, 180);
        else fire();
        el.classList.add('on');
        GV.audio && GV.audio.unlock();
      });
      if (aimable) el.addEventListener('pointermove', (e) => {
        if (e.pointerId !== id) return;
        const dx = e.clientX - ox, dy = e.clientY - oy, m = Math.hypot(dx, dy);
        if (m > 22) { dragged = true; I.aim.drag = { x: dx / m, y: dy / m }; I.aim.dragT = performance.now() / 1000; el.classList.add('aiming'); }
      });
      const up = (e) => {
        if (e.pointerId !== id) return;
        id = null;
        clearTimeout(holdT);
        if (deferred && !fired) { fire(); touchHeld[a] = false; } else release(a);
        if (dragged) I.aim.dragT = performance.now() / 1000;
        el.classList.remove('on', 'aiming');
      };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });

    // Movement pad: slide a thumb left/right; pull down to drop through ledges.
    const pad = document.getElementById('pad');
    const knob = pad.querySelector('.knob');
    let pid = null;
    const setPad = (e) => {
      const r = pad.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      dx < -14 ? press('left') : release('left');
      dx > 14 ? press('right') : release('right');
      dy > 30 && Math.abs(dy) > Math.abs(dx) * 0.8 ? press('down') : release('down');
      const m = Math.min(1, Math.hypot(dx, dy) / 50), ang = Math.atan2(dy, dx);
      knob.style.transform = `translate(${Math.cos(ang) * m * 42}px, ${Math.sin(ang) * m * 28}px)`;
    };
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pid = e.pointerId;
      try { pad.setPointerCapture(pid); } catch (_) {}
      setPad(e);
      GV.audio && GV.audio.unlock();
    });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === pid) setPad(e); });
    const pup = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      release('left'); release('right'); release('down');
      knob.style.transform = '';
    };
    pad.addEventListener('pointerup', pup);
    pad.addEventListener('pointercancel', pup);
    pad.addEventListener('lostpointercapture', pup);
  };

  // ---- Aiming: mouse, right stick and touch ----
  // The mouse cursor is an aim point; left button attacks, right button uses skill 1, middle skill 2.
  // A right stick aims a direction for whoever holds that pad. On touch, drag a skill button to aim it,
  // or tap the open screen to point at something.
  I.aim = { mouse: null, mouseT: -1e9, stick: [null, null], stickT: [-1e9, -1e9], drag: null, dragT: -1e9, tap: null, tapT: -1e9, keyT: -1e9 };
  const nowS = () => performance.now() / 1000;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    I.aim.mouse = { x: e.clientX, y: e.clientY };
    if (!I.inMenu) I.aim.mouseT = nowS(); // moving the mouse around menus doesn't switch aiming on
  });
  addEventListener('keydown', (e) => { if (MAP[e.code] === 'left' || MAP[e.code] === 'right') I.aim.keyT = nowS(); });
  const mouseHeld = {};
  // Side buttons would otherwise send the browser back/forward.
  for (const ev of ['mouseup', 'auxclick']) addEventListener(ev, (e) => { if (!I.inMenu && (e.button === 3 || e.button === 4)) e.preventDefault(); });
  I.bindAim = function (canvas) {
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      GV.audio && GV.audio.unlock();
      if (I.inMenu) return;
      if (e.pointerType === 'mouse') {
        const mk = I.macroKeys['Mouse' + e.button];
        if (mk != null) { e.preventDefault(); if (I.onMacro) I.onMacro(mk, true); I.aim.mouse = { x: e.clientX, y: e.clientY }; I.aim.mouseT = nowS(); return; }
        const a = MAP['Mouse' + e.button]; if (!a) return;
        e.preventDefault();
        I.aim.mouse = { x: e.clientX, y: e.clientY }; I.aim.mouseT = nowS();
        if (!held[a] && !touchHeld[a]) pressed[a] = true;
        touchHeld[a] = true; mouseHeld[a] = true;
      } else {
        I.aim.tap = { x: e.clientX, y: e.clientY }; I.aim.tapT = nowS();
      }
    });
    canvas.addEventListener('wheel', (e) => {
      if (I.inMenu) return;
      const wc = e.deltaY < 0 ? 'WheelUp' : 'WheelDown';
      if (I.macroKeys[wc] != null) { e.preventDefault(); if (I.onMacro) { I.onMacro(I.macroKeys[wc], true); I.onMacro(I.macroKeys[wc], false); } return; }
      const a = MAP[wc]; if (!a) return;
      e.preventDefault(); pressed[a] = true;
    }, { passive: false });
    canvas.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' && e.buttons) { I.aim.tap = { x: e.clientX, y: e.clientY }; I.aim.tapT = nowS(); } });
    addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (I.macroKeys['Mouse' + e.button] != null && I.onMacro) I.onMacro(I.macroKeys['Mouse' + e.button], false);
      const a = MAP['Mouse' + e.button];
      if (a && mouseHeld[a]) { mouseHeld[a] = false; touchHeld[a] = false; }
    });
  };
})();
