// Galactic Void — update notices. Two kinds:
//   · "What's new": the first time a returning player loads a new build, a card lists the changes.
//   · "Update ready": a copy left open while a new build goes live polls version.json and offers
//     a reload (saving first). It never interrupts a fight: in a stage it waits for a quiet moment.
(function () {
  const GV = window.GV, B = GV.BUILD || { id: 'dev', notes: [] };
  const KEY = 'gv_build_seen';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let box = null, shownFor = null;

  function card(html, cls) {
    if (box) box.remove();
    box = document.createElement('div');
    box.id = 'gvUpdate'; box.className = cls;
    box.innerHTML = html;
    document.body.appendChild(box);
    requestAnimationFrame(() => box && box.classList.add('on'));
    box.addEventListener('click', (e) => {
      const a = e.target.closest('[data-u]'); if (!a) return;
      e.stopPropagation();
      if (a.dataset.u === 'reload') { try { GV.save.write(true); } catch (_) {} setTimeout(() => location.reload(), 120); }
      else if (a.dataset.u === 'more') box.classList.toggle('open');
      else dismiss();
    });
  }
  function dismiss() { if (!box) return; const b = box; b.classList.remove('on'); setTimeout(() => b.remove(), 400); box = null; }

  // ---- what's new ----
  const playing = () => document.body.classList.contains('playing');
  function whatsNew() {
    let seen = null; try { seen = localStorage.getItem(KEY); } catch (e) {}
    const returning = seen || (GV.save && GV.save.data && GV.save.data.cls);
    if (!returning || seen === B.id || !B.notes || !B.notes.length) { try { localStorage.setItem(KEY, B.id); } catch (e) {} return; }
    if (!document.querySelector('#ui .title')) { setTimeout(whatsNew, 3000); return; } // only on the title screen, never over play or a menu
    try { localStorage.setItem(KEY, B.id); } catch (e) {}
    card(`<div class="uIcon">✦</div><div class="uBody"><div class="uK">Updated · ${esc(B.title || 'New build')}</div>
      <div class="uT">Galactic Void has been updated</div>
      <ul>${B.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>
      <div class="uBtns"><button class="primary" data-u="ok">Let's go</button></div>`, 'news');
  }

  // ---- update ready ----
  async function check() {
    if (shownFor || document.hidden) return;
    let v = null;
    try { const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (r.ok) v = await r.json(); } catch (e) { return; }
    if (!v || !v.id || v.id === B.id) return;
    shownFor = v.id;
    const show = () => card(`<div class="uIcon">⟳</div><div class="uBody"><div class="uK">Update ready</div>
      <div class="uT">${esc(v.title || 'A new version')} is live</div><p>Reload to get it. Your progress is saved first.</p></div>
      <div class="uBtns"><button class="primary" data-u="reload">Reload now</button><button class="ghost" data-u="later">Later</button></div>`, 'ready');
    // never in the middle of a fight: wait until you're on the ship, in a menu, or paused
    const calm = () => { const g = GV.game, p = g && g.play; return !document.body.classList.contains('playing') || !p || g.paused || (p.L && p.L.hall) || p.state === 'clear'; };
    if (calm()) show(); else { const t = setInterval(() => { if (calm()) { clearInterval(t); show(); } }, 2000); }
  }

  // starting to play clears a "what's new" card out of the way
  new MutationObserver(() => { if (box && box.classList.contains('news') && (playing() || !document.querySelector('#ui .title'))) dismiss(); }).observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
  addEventListener('load', () => {
    setTimeout(whatsNew, 2600);
    setTimeout(check, 20000);
    setInterval(check, 3 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  });
  GV.updates = { check, whatsNew, dismiss };
})();
