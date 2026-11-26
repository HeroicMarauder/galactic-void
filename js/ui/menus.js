// Galactic Void — menu screens (DOM overlay): title, how to play, star map, Vesper's Trade,
// pause, death, stage clear, and the Lantern cutscene.
(function () {
  const GV = window.GV, U = GV.util;
  const $ui = () => document.getElementById('ui');
  let back = null;
  let shopTab = 'all', shopFrom = 'map';
  const shopF = { q: '', sort: 'default', afford: false };
  let savesFrom = 'title', savesMsg = '', settingsFrom = 'title', trialCurses = null, setMsg = '';
  GV.TRIAL_CURSES = {
    swift: { name: 'Swift', desc: 'Enemies move 40% faster', bonus: 30 },
    brutal: { name: 'Brutal', desc: 'Enemies deal 50% more damage', bonus: 40 },
    dry: { name: 'Parched', desc: 'Flasks only refill between waves', bonus: 30 },
    bosses3: { name: 'Gauntlet', desc: 'A boss every third wave', bonus: 40 },
    elites: { name: 'Elite Swarm', desc: 'Three times as many elites', bonus: 30 },
    dark: { name: 'Lights Out', desc: 'You can only see around yourself', bonus: 25 },
  };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const memIcon = '<span class="mi">✦</span>';

  function render(html, bind, onBack) {
    const ac = document.getElementById('actCard'); if (ac) ac.remove(); // a menu always wins over the act card
    const el = $ui();
    el.innerHTML = html;
    el.classList.add('show');
    back = onBack || null;
    el.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', (e) => {
      GV.audio.unlock(); GV.audio.sfx('ui');
      bind && bind(b.dataset.a, b, e);
    }));
    const first = el.querySelector('button.primary:not([disabled])') || el.querySelector('button:not([disabled])');
    if (first && !GV.input.isTouch) first.focus({ preventScroll: true });
  }

  // Arrow keys move focus between buttons; Escape goes back.
  GV.input.onKey = (e) => {
    const el = $ui();
    if (!el.classList.contains('show')) return false;
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) { if (e.code === 'Escape') ae.blur(); return true; }
    if (e.code === 'Escape' || e.code === 'KeyP') { if (back) { e.preventDefault(); back(); } return true; }
    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) {
      const btns = [...el.querySelectorAll('button:not([disabled])')];
      if (!btns.length) return true;
      e.preventDefault();
      const i = btns.indexOf(document.activeElement);
      const dir = ['ArrowDown', 'ArrowRight', 'KeyS', 'KeyD'].includes(e.code) ? 1 : -1;
      btns[(i + dir + btns.length) % btns.length].focus();
      return true;
    }
    if (e.code === 'Space' || e.code === 'Enter') return true; // let the focused button handle it
    return true;
  };

  const M = (GV.menus = {
    render, esc, memIcon,
    hide() { const el = $ui(); el.classList.remove('show'); el.innerHTML = ''; back = null; },
    show(name, opts) { M[name](opts || {}); },

    title() {
      const has = GV.save.hasProgress();
      render(`
        <div class="screen title">
          ${GV.sync.pending && GV.input.isTouch ? '' : `<div class="gvlogo"><h1 class="gvl-row" aria-label="Galactic Void"><span class="gvl-w gvl-a" data-t="GALACTIC">GALACTIC</span><span class="gvl-w gvl-b" data-t="VO">VO</span><svg class="gvl-spike" viewBox="0 0 40 300" aria-hidden="true"><defs><linearGradient id="gvsp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7d8696"/><stop offset=".45" stop-color="#ffffff"/><stop offset=".55" stop-color="#c9d1dd"/><stop offset="1" stop-color="#5d6575"/></linearGradient></defs><path d="M20 0 L26 112 L22 150 L22 296 L20 300 L18 296 L18 150 L14 112 Z" fill="url(#gvsp)" stroke="#0a0c12" stroke-width="1.2"/><path d="M2 158 L38 158 L33 166 L7 166 Z" fill="url(#gvsp)" stroke="#0a0c12" stroke-width="1"/><circle cx="20" cy="162" r="3.2" fill="#ff3048"/><g class="gvl-star"><path d="M20 -14 L22 -2 L34 0 L22 2 L20 14 L18 2 L6 0 L18 -2 Z" fill="#fff"/></g></svg><span class="gvl-w gvl-c" data-t="D">D</span></h1><div class="gvl-album"><i></i><b>✛</b><span id="heroAlbum">${GV.hero && GV.hero.scenes ? GV.ACTS[GV.hero.scenes[GV.hero.idx].act].album : 'The Silence Between'}</span><b>✛</b><i></i></div></div>`}
          ${GV.sync.pending ? `<div class="syncnote"><b>A newer save is in the cloud</b><span>From your ${esc((GV.sync.cloud.device || 'other device').toLowerCase())}, ${GV.sync.ago(GV.sync.cloud.savedAt)}: ${esc(GV.save.summary(JSON.parse(GV.sync.cloud.json)))}</span><span class="muted">This device: ${esc(GV.save.summary())}</span>
            <div class="menu row"><button class="primary" data-a="useCloud">Load the cloud save</button><button data-a="keepLocal">Keep this device's</button></div></div>` : ''}
          <div class="menu">
            <button class="primary" data-a="play">${has ? 'Continue Voyage' : 'Begin Voyage'}</button>
            <button data-a="saves">Save &amp; Transfer</button>
            <button data-a="settings">Settings</button>
            <button data-a="how">How to Play</button>
            ${GV.input.isTouch ? '<button data-a="fs">Fullscreen</button>' : ''}
          </div>
          <div class="foot">Gather memories. Survive the swarm. Find the Lantern.</div>
        </div>`, (a, b) => {
        if (a === 'play') { if (GV.save.needsClass()) M.classSelect(); else if (has) GV.game.home(); else GV.game.startStage(0, 0); }
        if (a === 'fs') GV.game.fullscreen();
        if (a === 'saves') M.saves({ from: 'title' });
        if (a === 'settings') M.settings({ from: 'title' });
        if (a === 'useCloud') { GV.sync.resolvePending(true); M.title(); }
        if (a === 'keepLocal') { GV.sync.resolvePending(false); M.title(); }
        if (a === 'how') M.how();
      });
    },

    classSelect(opts) {
      const forP2 = !!(opts && opts.p2);
      const migrating = !forP2 && GV.save.hasProgress();
      let cards = '';
      for (const k in GV.CLASSES) {
        const c = GV.CLASSES[k];
        const skills = c.bar.map(([id]) => `<span class="sk" data-g="${id}" tabindex="-1" style="color:${GV.GEMS[id].color}">${GV.GEMS[id].icon} ${GV.GEMS[id].name}</span>`).join('');
        cards += `<button class="cls" data-a="pick" data-k="${k}" style="--c:${c.color}">
          <canvas class="clsArt" data-k="${k}" width="340" height="340"></canvas>
          <span class="cn">${c.name}</span><span class="ctag">${c.tag}</span>
          <span class="cdesc">${c.desc}</span>
          <span class="cskills">${skills}</span>
          <span class="cw">${GV.WEAPONS[c.weapon].name}${c.offhand ? (c.offhand === c.weapon ? ' ×2' : ' & ' + GV.WEAPONS[c.offhand].name) : ''}</span>
        </button>`;
      }
      render(`
        <div class="screen panel wide classes">
          <h2>${forP2 ? 'Player 2: choose a class' : 'Choose your class'}</h2>
          ${forP2 ? '<p>Player 2 gets their own Star Cores, gear, passive tree and rank. Memories and story progress are shared.</p>' : migrating ? '<p>Your memories, rank, powers and cleared stages carry over. Pick who wears the suit from now on.</p>' : '<p>Each class has its own weapon, starting Star Cores and place on the passive tree. Any class can learn any core later.</p>'}
          <div class="clsrow">${cards}</div>
          <div class="menu row"><button class="ghost" data-a="back">Back</button></div>
        </div>`, (a, b) => {
        if (a === 'back') return forP2 ? M.coop() : M.title();
        if (a === 'pick' && !b.dataset.go && GV.clsAnim) { // play this class's pick flourish, then go
          if (document.querySelector('#ui .cls.picked')) return;
          b.classList.add('picked'); document.querySelectorAll('#ui .cls').forEach((x) => { if (x !== b) x.classList.add('dim'); });
          picked[b.dataset.k] = performance.now(); GV.audio.sfx('level');
          setTimeout(() => { b.dataset.go = '1'; b.click(); }, GV.clsAnim.PICK_T * 1000 + 150);
          return;
        }
        if (a === 'pick' && forP2) { const lv = GV.save.main.level || 1; GV.save.as(1, (d2) => { GV.save.chooseClass(b.dataset.k); d2.level = lv; }); GV.save.main.coop.on = true; GV.save.write(); return M.coop(); }
        if (a === 'pick') {
          GV.save.chooseClass(b.dataset.k);
          if (migrating) GV.game.home(); else GV.game.startStage(0, 0);
        }
      }, () => (forP2 ? M.coop() : M.title()));
      // portraits: each class idles, shows off on hover/focus, and plays a flourish when picked
      const hovered = {}, left = {}, picked = {};
      document.querySelectorAll('#ui .cls').forEach((b) => {
        const k = b.dataset.k, on = () => { if (!(k in hovered)) hovered[k] = performance.now(); }, off = () => { delete hovered[k]; left[k] = performance.now(); };
        b.addEventListener('mouseenter', on); b.addEventListener('focus', on);
        b.addEventListener('mouseleave', () => { if (document.activeElement !== b) off(); }); b.addEventListener('blur', () => { if (!b.matches(':hover')) off(); });
      });
      // skill tooltips: point at a skill to see it cast by this class
      let tip = document.getElementById('skillTip'); if (tip) tip.remove();
      tip = document.createElement('div'); tip.id = 'skillTip';
      tip.innerHTML = `<canvas width="${GV.clsAnim.SKILL_W}" height="${GV.clsAnim.SKILL_H}"></canvas><div class="stb"><b></b><i></i><p></p></div>`;
      document.body.appendChild(tip);
      const tipCv = tip.querySelector('canvas'), tipG = tipCv.getContext('2d');
      let tipOn = null;
      const showTip = (sp) => {
        const btn = sp.closest('.cls'), k = btn.dataset.k, id = sp.dataset.g, G = GV.GEMS[id];
        tipOn = { k, id };
        tip.style.setProperty('--sc', G.color);
        tip.querySelector('b').textContent = `${G.icon} ${G.name}`;
        tip.querySelector('i').textContent = (G.tags || []).join(' · ');
        tip.querySelector('p').textContent = G.desc || '';
        const r = sp.getBoundingClientRect(), tw = 300, x = Math.max(8, Math.min(innerWidth - tw - 8, r.left + r.width / 2 - tw / 2));
        const above = r.top > 330; tip.style.left = x + 'px'; tip.style.top = (above ? r.top - 10 : r.bottom + 10) + 'px';
        tip.classList.toggle('above', above); tip.classList.add('on');
      };
      const hideTip = () => { tipOn = null; tip.classList.remove('on'); };
      document.querySelectorAll('#ui .cls .sk').forEach((sp) => {
        sp.addEventListener('mouseenter', () => showTip(sp)); sp.addEventListener('mouseleave', hideTip);
      });
      const draw = (now) => {
        const cvs = document.querySelectorAll('.clsArt');
        if (!cvs.length) { tip.remove(); return; }
        if (tipOn) GV.clsAnim.skillPreview(tipG, tipOn.k, tipOn.id, now / 1000);
        cvs.forEach((cv) => {
          const k = cv.dataset.k, g = cv.getContext('2d'), t = now / 1000;
          GV.clsAnim.draw(g, k, t, { hoverT: k in hovered ? (now - hovered[k]) / 1000 : -1, pickT: k in picked ? (now - picked[k]) / 1000 : -1 });
        });
        requestAnimationFrame(draw);
      };
      requestAnimationFrame(draw);
    },

    saves(opts) {
      if (opts && opts.from) savesFrom = opts.from;
      const Y = GV.sync, d = GV.save.data;
      const goBack = () => (savesFrom === 'pause' ? M.pause() : savesFrom === 'map' ? M.map() : M.title());
      const afterLoad = (msg) => {
        savesMsg = msg;
        if (GV.game.play) { GV.game.toMap(); return; }
        if (savesFrom === 'map') return M.map();
        M.saves();
      };
      const c = Y.cloud;
      let cloudHtml;
      if (Y.status === 'checking') cloudHtml = '<p class="muted">Connecting to your cloud save…</p>';
      else if (Y.status !== 'ready') cloudHtml = '<p class="muted">Cloud save needs you signed in to claude.ai on this device. The transfer code and save file below work anywhere.</p>';
      else {
        cloudHtml = `
          <div class="slot"><span class="sl">Cloud</span><span>${c ? `${esc(GV.save.summary(JSON.parse(c.json)))}<br><small>Uploaded from your ${esc((c.device || 'device').toLowerCase())} · ${Y.ago(c.savedAt)}</small>` : '<small>Nothing uploaded yet.</small>'}</span></div>
          ${Y.lastError ? `<p class="warn">${esc(Y.lastError)}</p>` : ''}
          <div class="menu row left">
            <button class="primary" data-a="push" ${Y.busy ? 'disabled' : ''}>${Y.busy ? 'Uploading…' : 'Upload this save'}</button>
            <button data-a="pull" ${c ? '' : 'disabled'}>Load cloud save</button>
            <button class="ghost" data-a="refresh">Refresh</button>
          </div>
          <label class="tog"><input type="checkbox" data-t="auto" ${Y.auto ? 'checked' : ''}> Auto-upload after progress</label>`;
      }
      const backups = GV.save.backups().slice(1);
      render(`
        <div class="screen panel saves">
          <h2>Save &amp; Transfer</h2>
          ${savesMsg ? `<p class="ok">${esc(savesMsg)}</p>` : ''}
          <div class="slot"><span class="sl">This device</span><span>${esc(GV.save.summary())}<br><small>Saved in this browser ${Y.ago(d.savedAt)}${GV.save.localOk === false ? ' · <b class="warn">browser storage is blocked</b>' : ''}</small></span></div>
          <div class="sec"><h3>Cloud save</h3><p>Kept privately under your claude.ai account. Open the game on your phone or computer, signed in to the same account, and load it.</p>${cloudHtml}</div>
          <div class="sec"><h3>Transfer code</h3><p>Copy this code on one device, then paste it on the other.</p>
            <div class="menu row left"><button data-a="copy">Copy my transfer code</button><button data-a="showPaste">Paste a code</button></div>
            <textarea id="codeBox" class="code" rows="3" readonly hidden></textarea>
            <div id="pasteWrap" hidden><textarea id="pasteBox" class="code" rows="3" placeholder="Paste a GV1: transfer code here"></textarea>
              <div class="menu row left"><button class="primary" data-a="loadCode">Load this code</button></div></div>
          </div>
          <div class="sec"><h3>Save file</h3><p>Download your save as a file, or load one you've moved over.</p>
            <div class="menu row left">${Y.downloads ? '<button data-a="file">Download save file</button>' : ''}<label class="filebtn">Load a save file<input type="file" id="fileIn" accept=".json,.txt,application/json,text/plain"></label></div>
          </div>
          ${backups.length ? `<div class="sec"><h3>Backups on this device</h3>${backups.map((b, i) => {
            let sum = ''; try { sum = GV.save.summary(JSON.parse(b.json)); } catch (e) {}
            return `<div class="slot"><span>${esc(sum)}<br><small>${Y.ago(b.at)}</small></span><button data-a="restore" data-i="${i + 1}">Restore</button></div>`;
          }).join('')}</div>` : ''}
          <p class="muted">Loading a save replaces this device's progress. The current one is kept as a backup first.</p>
          <div class="menu row"><button class="primary" data-a="back">Back</button></div>
        </div>`, async (a, b) => {
        savesMsg = '';
        const confirmTwice = (label) => { if (b.dataset.armed) return true; b.dataset.armed = '1'; b.textContent = label; b.classList.add('danger'); return false; };
        if (a === 'back') return goBack();
        if (a === 'push') { b.disabled = true; b.textContent = 'Uploading…'; const ok = await Y.push(); savesMsg = ok ? 'Uploaded. Load it on your other device from Save & Transfer.' : ''; return M.saves(); }
        if (a === 'refresh') { await Y.peek(); return M.saves(); }
        if (a === 'pull') { if (!confirmTwice('Tap again to replace this device')) return; if (await Y.pull()) afterLoad('Cloud save loaded.'); else M.saves(); return; }
        if (a === 'copy') {
          const code = Y.makeCode(), box = document.getElementById('codeBox');
          box.hidden = false; box.value = code; box.focus(); box.select();
          try { await navigator.clipboard.writeText(code); b.textContent = 'Copied ✓'; } catch (e) { b.textContent = 'Select the code below and copy it'; }
          return;
        }
        if (a === 'showPaste') { document.getElementById('pasteWrap').hidden = false; document.getElementById('pasteBox').focus(); return; }
        if (a === 'loadCode') {
          let obj;
          try { obj = Y.parse(document.getElementById('pasteBox').value); } catch (e) { b.textContent = 'That code did not work. Check it and try again'; return; }
          if (!confirmTwice(`Replace with: ${GV.save.summary(obj)}?`)) return;
          GV.save.replace(obj); Y.changed(); afterLoad('Transfer code loaded.');
          return;
        }
        if (a === 'file') { const r = await Y.download(); savesMsg = r.msg; return M.saves(); }
        if (a === 'restore') {
          if (!confirmTwice('Tap again to restore')) return;
          const bk = GV.save.backups()[+b.dataset.i];
          try { GV.save.replace(JSON.parse(bk.json)); Y.changed(); afterLoad('Backup restored.'); } catch (e) { M.saves(); }
        }
      }, goBack);
      const tog = document.querySelector('[data-t=auto]');
      if (tog) tog.addEventListener('change', () => Y.setAuto(tog.checked));
      const fi = document.getElementById('fileIn');
      fi.addEventListener('change', () => {
        const f = fi.files && fi.files[0];
        if (!f) return;
        f.text().then((txt) => {
          let obj;
          try { obj = Y.parse(txt); } catch (e) { savesMsg = 'That file is not a Galactic Void save.'; return M.saves(); }
          GV.save.replace(obj); Y.changed(); afterLoad('Save file loaded.');
        });
      });
    },

    settings(opts) {
      if (opts && opts.from) settingsFrom = opts.from;
      const S = GV.settings, sd = S.data, d = GV.save.data;
      const goBack = () => (settingsFrom === 'pause' ? M.pause() : M.title());
      const opt = (k, v, label) => `<button class="seg ${sd[k] === v ? 'sel' : ''}" data-a="set" data-k="${k}" data-v="${v}">${label}</button>`;
      const tog = (k, label, on) => `<label class="tog"><input type="checkbox" data-tg="${k}" ${on ? 'checked' : ''}> ${label}</label>`;
      render(`
        <div class="screen panel narrow settings">
          <h2>Settings</h2>
          <div class="gsub">Graphics</div>
          <div class="segs">${opt('gfx', 'auto', 'Auto')}${opt('gfx', 'high', 'High')}${opt('gfx', 'saver', 'Battery Saver')}</div>
          <div class="gsub">Camera</div>
          <div class="segs">${opt('cam', 'close', 'Close')}${opt('cam', 'standard', 'Standard')}${opt('cam', 'wide', 'Wide')}</div>
          <div class="gsub">Aim assist <span>controller &amp; touch</span></div>
          <div class="segs">${opt('aimAssist', 'off', 'Off')}${opt('aimAssist', 'light', 'Light')}${opt('aimAssist', 'strong', 'Strong')}</div>
          <p class="muted">Aim with the mouse (left button attacks, right button uses your first skill), a controller's right stick, or on touch by dragging a skill button and letting go. Aim up to strike overhead; aim down in the air to strike below and bounce. With nothing aimed, you attack the way you face.</p>
          <p class="muted">Battery Saver runs at 30 fps with lower resolution and fewer effects. Auto uses it on phones and tablets.${S.saver() ? ' <b>Active now.</b>' : ''}</p>
          <div class="gsub">Sound <span>${Math.round(sd.volume * 100)}%</span></div>
          <input type="range" min="0" max="100" step="5" value="${Math.round(sd.volume * 100)}" id="vol" class="range">
          <div class="gsub">Music <span>${Math.round(sd.music * 100)}%</span></div>
          <input type="range" min="0" max="100" step="5" value="${Math.round(sd.music * 100)}" id="mus" class="range">
          ${tog('mute', 'Mute all sound', d.mute)}
          ${GV.soundtrack.panelHtml(esc)}
          ${setMsg ? `<p class="ok">${esc(setMsg)}</p>` : ''}
          <div class="gsub">Keyboard &amp; mouse <span>${GV.input.bindPreset === 'classic' ? 'classic layout' : 'mouse & keyboard layout'}</span></div>
          <div class="menu row"><button data-a="binds">Keybinds</button></div>
          <div class="gsub">Feedback</div>
          ${tog('shake', 'Screen shake', sd.shake)}
          ${tog('hitstop', 'Hit-stop on heavy hits', sd.hitstop !== false)}
          ${tog('adaptive', 'Adaptive resolution (drops resolution, not frame rate, when busy)', sd.adaptive !== false)}
          ${tog('numbers', 'Damage numbers', sd.numbers)}
          ${tog('fps', 'Show frame rate', sd.fps)}
          ${tog('touch', 'Touch controls', document.body.classList.contains('touch'))}
          ${tog('ghost', 'Tutorial ghost on the first stage', sd.ghost)}
          <p class="muted">${GV.input.pad ? `Controller connected: ${esc(GV.input.pad.slice(0, 40))}. A jump · X attack · B dash · Y / LB / RB skills · LT / RT flasks · D-pad up talk · Start pause.` : 'Controllers work too: plug one in or pair it, then press any button.'}</p>
          <p class="muted">These settings stay on this device and don't travel with your save.</p>
          <div class="testing"><b>Testing</b><p class="muted">Erases every save: your character and progress, Player 2, the backups on this device and the cloud copy. Settings, keybinds and your own music stay.</p><div class="menu row"><button class="ghost" data-a="reset">Erase All Saves</button></div></div>
          <div class="menu row"><button class="primary" data-a="back">Done</button></div>
        </div>`, (a, b) => {
        if (a === 'back') { setMsg = ''; return goBack(); }
        if (a === 'reset') { // testing only: wipes everything and returns to the title
          if (b.dataset.armed) { setMsg = ''; GV.save.reset(); if (GV.net && GV.net.role && GV.net.leave) GV.net.leave(); if (GV.game.scene === 'play' && GV.game.toTitle) GV.game.toTitle(); else M.title(); return; }
          b.dataset.armed = '1'; b.textContent = 'Tap again to erase everything'; b.classList.add('danger'); return;
        }
        if (a === 'binds') return M.keybinds(() => M.settings());
        if (GV.soundtrack.onAction(a, b, () => M.settings())) return;
        if (a === 'set') { S.set(b.dataset.k, b.dataset.v); M.settings(); }
      }, goBack);
      const vol = document.getElementById('vol');
      vol.addEventListener('input', () => { S.set('volume', vol.value / 100); vol.previousElementSibling.querySelector('span').textContent = vol.value + '%'; });
      vol.addEventListener('change', () => GV.audio.sfx('ui'));
      GV.soundtrack.bindPanel(() => M.settings(), (m) => { setMsg = m; });
      const mus = document.getElementById('mus');
      mus.addEventListener('input', () => { S.set('music', mus.value / 100); mus.previousElementSibling.querySelector('span').textContent = mus.value + '%'; });
      document.querySelectorAll('[data-tg]').forEach((el) => el.addEventListener('change', () => {
        const k = el.dataset.tg;
        if (k === 'mute') { d.mute = el.checked; GV.audio.setMuted(d.mute); GV.save.write(); }
        else if (k === 'ownMusic') { S.set('ownMusic', el.checked); M.settings(); }
        else if (k === 'touch') { document.body.classList.toggle('touch', el.checked); GV.input.isTouch = el.checked; S.apply(); }
        else S.set(k, el.checked);
      }));
    },

    how() {
      render(`
        <div class="screen panel narrow">
          <h2>How to Play</h2>
          <div class="how">
            ${(() => { const I = GV.input, K = (x) => (I.binds()[x] || []).filter(Boolean).map(I.keyName).join(' / ') || '—';
              return [['Move', `${K('left')} · ${K('right')}`], ['Jump · double jump', K('jump') + ' (again in the air)'], ['Drop through a ledge', K('down') + ' + Jump'], ['Aim', 'The mouse (or right stick)'],
                ['Attack · skills (hold to repeat)', `${K('attack')} · ${K('skill1')} · ${K('skill2')} · ${K('skill3')}`], ['Phase Dash', K('dash')], ['Life flask · Charge flask', `${K('flask1')} · ${K('flask2')}`],
                ['Talk', K('interact')], ['Star Cores · Passive tree · Gear', `${K('gems')} · ${K('tree')} · ${K('gear')}`], ['Ascendancy · Codex', `${K('ascend')} · ${K('codex')}`], ['Pause', K('pause')]]
                .map(([a, b]) => `<div><b>${a}</b><span>${GV.menus.esc(b)}</span></div>`).join(''); })()}
          </div>
          <div class="menu row"><button class="primary" data-a="binds">Change keybinds</button></div>
          <p>On a phone or tablet, slide the left pad to move and use the buttons on the right. Turn the device sideways.</p>
          <p><b>The gauntlet.</b> Monsters never stop coming. Red rifts birth them; shatter a rift to choke the swarm. Light beacons to save your place. At the end of every stage a boss waits in a sealed arena.</p>
          <p><b>The way back.</b> Bosses carry suit powers. Blue membranes need Phase Dash. Green shafts need Grav Grip. Return to earlier stages to open their memory caches.</p>
          <p><b>Builds.</b> Star Cores are your skills. Plug Augments into their ports to change how they work: more projectiles, extra fire, faster casts, chains. Blank cores drop from rifts and bosses; format them into the core you want. Every rank gives a passive point for the tree, up to 60, so choose carefully.</p>
          <p><b>Loot and flasks.</b> Enemies drop gear for your helm, suit, boots and relic slot: blue Magic, gold Rare and orange Unique. Flasks refill as you kill and top up at beacons.</p>
          <p><b>Rift Trial.</b> Once the Drift Shelf is cleared, the war table on your ship opens an endless wave arena. Every fifth wave brings a boss. Chase your best.</p>
          <p><b>Ever outward.</b> Clear Sector I to find your lost ship, the Lantern. Every system you clear charts another, without end.</p>
          <div class="menu row"><button class="primary" data-a="back">Back</button></div>
        </div>`, (a) => (a === 'binds' ? M.keybinds(() => M.how()) : M.title()), () => M.title());
    },

    // There is no classic Star Map any more: "the map" is the hologram over the war table on your
    // ship. Anything that asks for the map is taken home instead.
    map(opts) {
      if (GV.save.slot) { GV.save.useSlot(0); GV.save.write(); return M.coop(); } // back from editing Player 2
      GV.ach.check();
      return GV.game.goHome ? GV.game.goHome(opts) : M.title();
    },

    shop(opts) {
      if (opts && opts.from) shopFrom = opts.from;
      const d = GV.save.data;
      const cost = (n) => `${memIcon} ${n}`;
      const E = []; // every row Vesper has: { cat, name, desc, cost, html }
      const cur = GV.equippedWeapon(d);
      const handsRow = `<div class="row hands"><div class="ri"><b>In your hands</b><span>${esc(GV.WEAPONS[d.weapon] ? GV.WEAPONS[d.weapon].name : '—')} <em>main</em> · ${d.offhand ? esc(GV.WEAPONS[d.offhand].name) + ' <em>off-hand</em>' : GV.WEAPONS[d.weapon] && GV.WEAPONS[d.weapon].hand === 'two' ? '<em>two-handed</em>' : '<em>off-hand empty (+4% crit)</em>'}</span><em>${cur.dual ? 'Dual wielding: 18% faster attacks, both weapons\' effects alternate' : cur.shield ? `Shield: ${cur.shield.block}% block, +${cur.shield.armour} armour` : cur.twoHanded ? 'Two-handed: 10% more damage' : ''}</em></div>${d.offhand ? '<button data-a="unOff">Empty off hand</button>' : ''}</div>`;
      const HN = { one: 'One-handed', two: 'Two-handed', off: 'Off-hand shield' };
      for (const k in GV.WEAPONS) {
        const w = GV.WEAPONS[k], own = d.weapons.includes(k), eq = d.weapon === k, eqOff = d.offhand === k, cat = w.hand === 'off' ? 'shields' : 'weapons';
        if (w.legacy) continue;
        if (w.set && !own) continue;
        if (w.exotic && !own) { E.push({ cat, name: w.name, desc: w.desc, cost: Infinity, locked: true, html: `<div class="row locked"><div class="ri"><b style="color:${w.color}">${w.name} <small class="exo">EXOTIC</small></b><span>Only a Titan carries this. Fell ${esc(GV.TITANS[w.exotic].name)} for a chance at it.</span></div><button disabled>Titan drop</button></div>` }); continue; }
        const stat = w.hand === 'off' ? `${w.block}% block · +${w.armour} armour` : `DMG ${w.dmg} · ${w.cd < 0.3 ? 'fast' : w.cd > 0.5 ? 'slow' : 'steady'} · reach ${w.range}`;
        const tag = w.exotic ? ' <small class="exo">EXOTIC</small>' : w.set ? ` <small class="exo setw" style="background:${GV.SETS[w.set].color}">SET</small>` : '';
        let btns;
        if (!own) btns = `<button data-a="buyW" data-k="${k}" ${d.memories < w.cost ? 'disabled' : ''}>${cost(w.cost)}</button>`;
        else if (w.hand === 'off') btns = eqOff ? '<button disabled>Off hand</button>' : `<button class="primary" data-a="equipOff" data-k="${k}" ${GV.WEAPONS[d.weapon] && GV.WEAPONS[d.weapon].hand === 'two' ? 'disabled' : ''}>Off hand</button>`;
        else if (w.hand === 'two') btns = eq ? '<button disabled>Equipped</button>' : `<button class="primary" data-a="equipW" data-k="${k}">Equip</button>`;
        else btns = `${eq ? '<button disabled>Main</button>' : `<button class="primary" data-a="equipW" data-k="${k}">Main</button>`}${eqOff ? '<button disabled>Off</button>' : `<button data-a="equipOff" data-k="${k}" ${GV.WEAPONS[d.weapon] && GV.WEAPONS[d.weapon].hand === 'two' ? 'disabled' : ''}>Off</button>`}`;
        E.push({ cat, name: w.name, desc: w.desc + ' ' + HN[w.hand] + (own ? ' owned' : ''), cost: own ? 0 : w.cost, owned: own, html: `<div class="row ${own ? 'owned' : ''}"><div class="ri"><b style="color:${w.color}">${w.name}${tag}</b><span>${w.desc}</span><em>${HN[w.hand]} · ${stat}${own ? ' · <span class="ok">owned</span>' : ''}</em></div><div class="wbtns">${btns}</div></div>` });
      }
      const T = GV.progress.shopTier();
      const gitems = [];
      for (let t = 1; t <= T; t++) {
        gitems.push({ cat: 'cores', k: 'skill', t, name: `Blank Star Core · Tier ${t}`, desc: `Format it into any Tier ${t} or lower Star Core.${t > 1 ? ` Starts at level ${1 + 3 * (t - 1)}.` : ''}`, cost: 35 + 45 * t });
        gitems.push({ cat: 'augs', k: 'support', t, name: `Blank Augment · Tier ${t}`, desc: `Format it into any Tier ${t} or lower Augment.`, cost: 25 + 35 * t });
      }
      gitems.push({ cat: 'craft', k: 'orb', name: GV.TERMS.orb, desc: `Adds an augment port to a Star Core (up to ${GV.MAX_SOCKETS}). You have ${d.orbs}.`, cost: 90 });
      for (const ck in GV.CURRENCY) { if (ck === 'anomaly') continue; const c = GV.CURRENCY[ck]; gitems.push({ cat: 'craft', k: 'cur:' + ck, name: c.name, desc: `${c.desc} You have ${d.cur[ck] || 0}.`, cost: c.cost, color: c.color }); }
      for (const it of gitems) E.push(Object.assign({}, it, { html: `<div class="row"><div class="ri"><b style="color:${it.color || (it.k === 'orb' ? '#ffd36b' : it.k === 'skill' ? '#6fd3ff' : '#c9d2e6')}">${it.name}</b><span>${it.desc}</span></div>
            <button data-a="buyG" data-k="${it.k}" data-t="${it.t || 0}" data-c="${it.cost}" ${d.memories < it.cost ? 'disabled' : ''}>${cost(it.cost)}</button></div>` }));
      for (const k in GV.UPGRADES) {
        const u = GV.UPGRADES[k], lv = d.upgrades[k], c = GV.progress.upgradeCost(k), max = lv >= u.max;
        E.push({ cat: 'suit', name: u.name, desc: u.desc, cost: max ? Infinity : c, maxed: max, html: `<div class="row"><div class="ri"><b>${u.name} <i class="slot">Lv ${lv}/${u.max}</i></b><span>${u.desc}</span></div>
            <button data-a="buyU" data-k="${k}" ${max || d.memories < c ? 'disabled' : ''}>${max ? 'Maxed' : cost(c)}</button></div>` });
      }
      const CATS = [['all', 'All'], ['weapons', 'Weapons', '⚔'], ['shields', 'Shields', '⛉'], ['cores', 'Star Cores', '◆'], ['augs', 'Augments', '◇'], ['craft', 'Crafting', '⚗'], ['suit', 'Suit', '⛨']];
      if (!CATS.some(([id]) => id === shopTab)) shopTab = 'all';
      const canBuy = (e) => e.owned || (e.cost !== Infinity && d.memories >= e.cost);
      const pass = (e) => GV.filters.match(shopF.q, e.name, e.desc) && (!shopF.afford || canBuy(e));
      const tabs = CATS.map(([id, name, icon]) => ({ id, name, icon, n: E.filter((e) => (id === 'all' || e.cat === id) && pass(e)).length }));
      let list = E.filter((e) => (shopTab === 'all' || e.cat === shopTab) && pass(e));
      const price = (e) => (e.owned ? -1 : e.cost);
      if (shopF.sort === 'low') list = list.slice().sort((a, b) => price(a) - price(b));
      if (shopF.sort === 'high') list = list.slice().sort((a, b) => (b.cost === Infinity ? -1 : price(b)) - (a.cost === Infinity ? -1 : price(a)));
      if (shopF.sort === 'name') list = list.slice().sort((a, b) => a.name.localeCompare(b.name));
      let rows = (['all', 'weapons', 'shields'].includes(shopTab) && !shopF.q ? handsRow : '') + list.map((e) => e.html).join('');
      if (!list.length) rows += '<p class="note fnone">Nothing matches. Try another tab, clear the search, or untick "Only what I can afford".</p>';
      if (['all', 'cores', 'augs'].includes(shopTab) && T < 3) rows += `<p class="note">Clear more of Sector I to unlock higher tiers.</p>`;
      const fbar = GV.filters.bar({ id: 'shop', tabs, tab: shopTab, q: shopF.q, sort: shopF.sort, placeholder: 'Search Vesper\'s wares', sorts: [['default', 'Sort: shelf order'], ['low', 'Sort: price, low first'], ['high', 'Sort: price, high first'], ['name', 'Sort: name']], checks: [{ id: 'afford', label: 'Only what I can afford', on: shopF.afford }] });
      render(`
        <div class="screen panel shop">
          <div class="topbar"><h2>Vesper's Trade</h2><div class="stats">${memIcon} ${d.memories} memories</div></div>
          ${fbar}
          <div class="rows">${rows}</div>
          <div class="menu row"><button class="primary" data-a="back">${shopFrom === 'play' ? 'Back to the drift' : 'Back'}</button></div>
        </div>`, (a, b) => {
        const k = b.dataset.k;
        if (a === 'tab') shopTab = k;
        if (a === 'equipW') { d.weapon = k; if (GV.WEAPONS[k].hand === 'two') d.offhand = null; }
        if (a === 'equipOff') d.offhand = k;
        if (a === 'unOff') d.offhand = null;
        if (a === 'buyW' && d.memories >= GV.WEAPONS[k].cost) { d.memories -= GV.WEAPONS[k].cost; d.weapons.push(k); if (GV.WEAPONS[k].hand === 'off') { if (GV.WEAPONS[d.weapon].hand !== 'two') d.offhand = k; } else { d.weapon = k; if (GV.WEAPONS[k].hand === 'two') d.offhand = null; } GV.audio.sfx('level'); }
        if (a === 'buyG') {
          const c = +b.dataset.c;
          if (d.memories >= c) {
            d.memories -= c;
            if (k === 'orb') d.orbs++; else if (k.startsWith('cur:')) d.cur[k.slice(4)] = (d.cur[k.slice(4)] || 0) + 1; else d.uncut.push({ kind: k, tier: +b.dataset.t });
            GV.audio.sfx('level');
          }
        }
        if (a === 'buyU') { const c = GV.progress.upgradeCost(k); if (d.memories >= c && d.upgrades[k] < GV.UPGRADES[k].max) { d.memories -= c; d.upgrades[k]++; GV.audio.sfx('level'); } }
        if (a === 'back') { GV.save.write(); return GV.game.closeShop(shopFrom); }
        GV.save.write();
        M.shop();
      }, () => { GV.save.write(); GV.game.closeShop(shopFrom); });
      GV.filters.bind('shop', { tab: (t) => { shopTab = t; M.shop(); }, q: (v) => { shopF.q = v; M.shop(); }, sort: (v) => { shopF.sort = v; M.shop(); }, check: (id, on) => { shopF[id] = on; M.shop(); } });
    },

    // The pause menu: Resume up top, then three tabs (Character, Run, System) and the radio below.
    // Tabs carry a badge when something inside wants attention. It remembers the tab you left on.
    pause() {
      const d = GV.save.data, g0 = GV.game, p0 = g0.play;
      const inHall = !!(p0 && p0.L && p0.L.hall), guest = !!(GV.net && GV.net.role === 'guest');
      const pts = (n) => (n ? ` <b class="pts">${n}</b>` : '');
      const ascN = GV.asc.unlocked() && (!GV.asc.current() || GV.asc.points() > 0) ? '!' : '';
      const treeN = GV.TREE.points() > 0 ? '+' + GV.TREE.points() : '', codexN = GV.codex.unread() || '';
      const tabs = [
        { id: 'char', name: 'Character', badge: !!(ascN || treeN), html: `
            <button data-a="gear"><b>Gear</b><span>Weapons, armour, flasks</span></button>
            <button data-a="gems"><b>Star Cores</b><span>Your skills and their supports</span></button>
            <button data-a="tree"><b>Passive Tree${pts(treeN)}</b><span>Points you've earned by ranking up</span></button>
            <button data-a="ascend"><b>Ascendancy${pts(ascN)}</b><span>${GV.asc.unlocked() ? 'Your class specialisation' : 'Locked for now'}</span></button>` },
        { id: 'run', name: inHall ? 'Ship' : 'Run', badge: !!codexN, html: `
            ${inHall || guest ? '' : '<button data-a="restart"><b>Restart Stage</b><span>From the start, same settings</span></button>'}
            ${g0.homeLabel() ? `<button data-a="map"><b>${g0.homeLabel()}</b><span>${guest ? 'Wait for the host' : 'Leave this run'}</span></button>` : ''}
            <button data-a="codex"><b>Codex${pts(codexN)}</b><span>Lore, creatures and the story so far</span></button>
            <div class="pmSlot" data-slot="run"></div>` },
        { id: 'sys', name: 'System', badge: false, html: `
            <button data-a="settings"><b>Settings</b><span>Graphics, sound, radio, testing</span></button>
            <button data-a="how"><b>Controls</b><span>Keybinds and macros</span></button>
            <button data-a="saves"><b>Save &amp; Transfer</b><span>Back up or move your save</span></button>
            <div class="pmSlot" data-slot="sys"></div>
            <button class="ghost" data-a="title"><b>Quit to Title</b><span>Your progress is saved</span></button>` },
      ];
      if (!tabs.some((t) => t.id === M.pauseTab)) M.pauseTab = 'char';
      const np = GV.soundtrack.nowPlaying;
      render(`
        <div class="screen panel narrow pausemenu">
          <h2>Paused</h2>
          <div class="menu"><button class="primary" data-a="resume">Resume</button></div>
          <div class="pmTabs" role="tablist">${tabs.map((t) => `<button role="tab" data-a="tab" data-t="${t.id}" class="${t.id === M.pauseTab ? 'on' : ''}">${t.name}${t.badge ? '<i class="dot"></i>' : ''}</button>`).join('')}</div>
          ${tabs.map((t) => `<div class="menu pmPane ${t.id === M.pauseTab ? 'on' : ''}" data-pane="${t.id}">${t.html}</div>`).join('')}
          ${np ? `<div class="pmRadio"><span>♪</span><div><b>${esc(np.n || np.name || 'Now playing')}</b><i>${esc(np.a || np.album || '')}</i></div><button data-a="skipSong">Next song</button></div>` : ''}
        </div>`, (a, b) => {
        const g = GV.game;
        if (a === 'tab') {
          M.pauseTab = b.dataset.t;
          document.querySelectorAll('#ui .pmTabs button').forEach((x) => x.classList.toggle('on', x === b));
          document.querySelectorAll('#ui .pmPane').forEach((x) => x.classList.toggle('on', x.dataset.pane === M.pauseTab));
          return;
        }
        if (a === 'resume') g.resume();
        if (a === 'skipSong') { GV.soundtrack.skip(); setTimeout(() => { if (g.paused) M.pause(); }, 120); }
        if (a === 'gems') GV.gemView.open('pause');
        if (a === 'gear') GV.gearView.open('pause');
        if (a === 'ascend') GV.ascendView.open('pause');
        if (a === 'codex') GV.codexView.open('pause');
        if (a === 'saves') M.saves({ from: 'pause' });
        if (a === 'settings') M.settings({ from: 'pause' });
        if (a === 'tree') GV.treeView.open('pause');
        if (a === 'restart') g.restartRun();
        if (a === 'map') g.home(g.play.sysIdx);
        if (a === 'how') M.howPause();
        if (a === 'title') g.toTitle();
      }, () => GV.game.resume());
    },
    // Other modules add their own pause buttons (Photo Mode, the playtest log) into a tab's slot.
    pauseAdd(slot, btn) {
      const s = document.querySelector(`#ui .pmSlot[data-slot="${slot}"]`);
      if (s) s.parentNode.insertBefore(btn, s); else { const m = document.querySelector('#ui .menu'); if (m) m.appendChild(btn); }
    },
    howPause() {
      M.keybinds(() => M.pause());
    },

    lantern() {
      const d = GV.save.data;
      const rows = Object.keys(GV.SHIP).map((k) => {
        const u = GV.SHIP[k], lv = d.ship[k] || 0, max = lv >= u.max, cost = u.base + u.step * lv;
        return `<div class="row"><div class="ri"><b>${u.icon} ${u.name} <i class="slot">Lv ${lv}/${u.max}</i></b><span>${lv ? u.desc(lv) : 'Not installed'}${max ? '' : ` → next: ${u.desc(lv + 1)}`}</span></div>
          <button data-a="buy" data-k="${k}" ${max || d.memories < cost ? 'disabled' : ''}>${max ? 'Maxed' : `${memIcon} ${cost}`}</button></div>`;
      }).join('');
      render(`<div class="screen panel shop lantern"><div class="topbar"><h2>The Lantern</h2><div class="stats">${memIcon} ${d.memories}</div></div>
        <canvas id="shipCv" width="640" height="150"></canvas>
        <p>Your ship runs on memories. Feed it, and it looks after you. These upgrades are permanent.</p>
        <div class="rows">${rows}</div>
        <div class="menu row"><button class="primary" data-a="back">Back</button></div></div>`, (a, b) => {
        if (a === 'back') return M.map();
        if (a === 'buy') { const u = GV.SHIP[b.dataset.k], lv = d.ship[b.dataset.k] || 0, c = u.base + u.step * lv; if (lv < u.max && d.memories >= c) { d.memories -= c; d.ship[b.dataset.k] = lv + 1; GV.save.write(); GV.audio.sfx('level'); } }
        M.lantern();
      }, () => M.map());
      const cv = document.getElementById('shipCv');
      const draw = (now) => {
        if (!document.body.contains(cv)) return;
        const g = cv.getContext('2d'), t = now / 1000;
        g.clearRect(0, 0, 640, 150);
        GV.art.ship(g, 330, 80 + Math.sin(t) * 4, 1.6, t, true, Math.sin(t * 0.7) * 0.03);
        requestAnimationFrame(draw);
      };
      requestAnimationFrame(draw);
    },

    trialSetup() {
      const d = GV.save.data;
      trialCurses = trialCurses || {};
      const C = GV.TRIAL_CURSES;
      const bonus = Object.keys(trialCurses).filter((k) => trialCurses[k]).reduce((a, k) => a + C[k].bonus, 0);
      render(`<div class="screen panel narrow trialset"><h2>Rift Trial</h2>
        <p>Endless waves. Every fifth brings a boss. Best: wave ${d.trialBest || 0}.</p>
        <div class="gsub">Curses <span>+${bonus}% reward</span></div>
        ${Object.keys(C).map((k) => `<label class="tog curse"><input type="checkbox" data-c="${k}" ${trialCurses[k] ? 'checked' : ''}><b>${C[k].name}</b> <span>${C[k].desc}</span> <i>+${C[k].bonus}%</i></label>`).join('')}
        <div class="menu row"><button class="ghost" data-a="back">Back</button><button class="primary" data-a="go">Enter the Trial</button></div></div>`, (a) => {
        if (a === 'back') return M.map();
        if (a === 'go') GV.game.startTrial(GV.progress.frontier(), Object.assign({}, trialCurses));
      }, () => M.map());
      document.querySelectorAll('[data-c]').forEach((el) => el.addEventListener('change', () => { trialCurses[el.dataset.c] = el.checked; M.trialSetup(); }));
    },

    // ---------- Co-op: loot mode, Player 2's character, and the on/off switch ----------
    coop() {
      const S = GV.save, d = S.main, c = (d.coop = d.coop || { on: false, mode: null, p2: null });
      const T = GV.TERMS, I = GV.input;
      if (!c.mode) {
        return render(`<div class="screen panel narrow coop"><h2>Co-op</h2>
          <p>Two players, one screen. Player 2 plays on a controller. First, how do you want to split the loot? You can change this later.</p>
          <button class="lootpick" data-a="mode" data-m="shared"><b>Shared loot</b><span>Better drops for both of you. Anything can be grabbed by either player. When one of you grabs a Rare or Unique, the other has a few seconds to challenge, and you <b>duel</b> for it: first to 5 hits wins.</span></button>
          <button class="lootpick" data-a="mode" data-m="personal"><b>Personal loot</b><span>Every drop belongs to one of you, marked with that player's colour. No fighting over anything, but a little less loot overall.</span></button>
          <div class="menu row"><button class="ghost" data-a="back">Back</button></div></div>`, (a, b) => {
          if (a === 'back') return M.map();
          if (a === 'mode') { c.mode = b.dataset.m; S.write(); M.coop(); }
        }, () => M.map());
      }
      const has = S.hasP2(), p2 = has ? c.p2 : null, cls = p2 && GV.CLASSES[p2.cls];
      const pad = I.pads > 0, need = I.pads >= 1;
      const padMsg = I.pads >= 2 ? 'Two controllers: controller 1 is Player 1, controller 2 is Player 2.' : I.pads === 1 ? 'One controller: it\'s Player 2. Player 1 uses the keyboard.' : 'Connect a controller for Player 2 (press any button on it).';
      const seg = (m, label) => `<button class="seg ${c.mode === m ? 'sel' : ''}" data-a="mode" data-m="${m}">${label}</button>`;
      render(`<div class="screen panel narrow coop"><h2>Co-op</h2>
        <div class="gsub">Loot</div>
        <div class="segs">${seg('shared', 'Shared · duel for the good stuff')}${seg('personal', 'Personal · less loot, no fights')}</div>
        <div class="gsub">Player 2</div>
        ${has ? `<div class="p2card" style="--c:${GV.COOP_COLORS[1]}"><b>${esc(cls.name)}</b><span>Rank ${p2.level || 1} · ${(p2.gems || []).length} ${T.cores} · ${(p2.items || []).length} items</span></div>
          <div class="menu row">
            <button data-a="p2gems">P2 ${T.cores}</button><button data-a="p2gear">P2 Gear</button><button data-a="p2tree">P2 Passive Tree</button>
            <button class="ghost" data-a="p2reset">New Player 2</button>
          </div>` : `<p>Player 2 needs a character of their own.</p><div class="menu row"><button class="primary" data-a="p2new">Create Player 2</button></div>`}
        <p class="padnote ${pad ? 'ok' : 'warn'}">${pad ? '🎮 ' : ''}${padMsg}</p>
        <div class="menu row">
          <button class="ghost" data-a="back">Back</button>
          ${has ? (c.on ? '<button data-a="off">Play solo</button>' : `<button class="primary" data-a="on" ${need ? '' : ''}>Turn co-op on</button>`) : ''}
        </div>
        ${has && c.on ? '<p class="muted">Co-op is on: every stage and Trial you launch from the war table includes Player 2.</p>' : ''}
      </div>`, (a, b) => {
        if (a === 'back') return M.map();
        if (a === 'mode') { c.mode = b.dataset.m; S.write(); return M.coop(); }
        if (a === 'p2new') return M.classSelect({ p2: true });
        if (a === 'p2reset') { if (b.dataset.armed) { S.resetP2(); return M.coop(); } b.dataset.armed = '1'; b.textContent = 'Tap again: erase Player 2'; b.classList.add('danger'); return; }
        if (a === 'on') { c.on = true; S.write(); return M.coop(); }
        if (a === 'off') { c.on = false; S.write(); return M.coop(); }
        if (a === 'p2gems' || a === 'p2gear' || a === 'p2tree') {
          S.useSlot(1);
          ({ p2gems: GV.gemView, p2gear: GV.gearView, p2tree: GV.treeView })[a].open('map');
        }
      }, () => M.map());
      // keep the controller line fresh while this screen is open
      clearInterval(M._padIv);
      const n0 = I.pads;
      M._padIv = setInterval(() => { if (!document.querySelector('.panel.coop')) return clearInterval(M._padIv); if (I.pads !== n0) M.coop(); }, 700);
    },

    quests(msg) {
      const Q = GV.quests, S = Q.state(), d = GV.save.data;
      const bar = (n, need) => `<i class="bar"><i style="width:${Math.min(100, (n / need) * 100)}%"></i></i><em>${Math.min(n, need)} / ${need}</em>`;
      const avail = { ione: true, vesper: !!d.cleared['0-0'], echo: !!d.shipFound };
      const crew = GV.CREW_QUESTS.map((cq) => {
        const s = S.crew[cq.id];
        if (!avail[cq.id]) return `<div class="qcard locked" style="--c:${cq.color}"><b>${esc(cq.who)}</b><span>${cq.id === 'vesper' ? 'Clear the Drift Shelf to meet them.' : 'Find the Lantern to hear from them.'}</span></div>`;
        if (s.done === true) return `<div class="qcard done" style="--c:${cq.color}"><b>${esc(cq.title)} <small>${esc(cq.who)}</small></b><p class="say">${esc(cq.done)}</p><span class="ok">Complete</span></div>`;
        if (s.done === 'ready') return `<div class="qcard ready" style="--c:${cq.color}"><b>${esc(cq.title)} <small>${esc(cq.who)}</small></b><span>Reward: ${esc(Q.rewardText(cq.reward))}</span><div class="menu row left"><button class="primary" data-a="claimCrew" data-id="${cq.id}">Claim reward</button></div></div>`;
        const st = cq.steps[s.step];
        return `<div class="qcard" style="--c:${cq.color}"><b>${esc(cq.title)} <small>${esc(cq.who)} · step ${s.step + 1}/${cq.steps.length}</small></b>
          <p class="say">${esc(st.say)}</p>
          ${s.seen ? `<span class="obj">${esc(Q.text(st))}</span>${bar(s.n, st.need)}` : `<div class="menu row left"><button data-a="accept" data-id="${cq.id}">Take the job</button></div>`}
          <span class="rw">Reward: ${esc(Q.rewardText(cq.reward))}</span></div>`;
      }).join('');
      const cons = S.contracts.map((c) => {
        const done = c.n >= c.need;
        return `<div class="qcard contract ${done ? 'ready' : ''}"><span class="obj">${esc(Q.text(c))}</span>${bar(c.n, c.need)}<span class="rw">${esc(Q.rewardText(c.reward))}</span>
          <div class="menu row left">${done ? `<button class="primary" data-a="claim" data-id="${c.id}">Claim</button>` : `<button class="ghost small" data-a="reroll" data-id="${c.id}" ${d.memories >= Q.rerollCost() ? '' : 'disabled'}>Swap · ${Q.rerollCost()} ✦</button>`}</div></div>`;
      }).join('');
      render(`<div class="screen panel wide quests"><h2>Quests</h2>
        ${msg ? `<p class="ok">${esc(msg)}</p>` : ''}
        <div class="gsub">Crew</div><div class="qlist">${crew}</div>
        <div class="gsub">Contracts <span>${S.done || 0} completed</span></div><div class="qlist">${cons}</div>
        <div class="menu row"><button class="primary" data-a="back">Back</button></div></div>`, (a, b) => {
        if (a === 'back') return M.map();
        const id = b.dataset.id;
        if (a === 'accept') { Q.accept(id); return M.quests(); }
        if (a === 'reroll') { Q.reroll(id); return M.quests(); }
        if (a === 'claim') { const r = Q.claim(id); GV.audio.sfx('level'); return M.quests(r ? `Claimed: ${Q.rewardText(r.c.reward)}` : ''); }
        if (a === 'claimCrew') { const r = Q.claimCrew(id); GV.audio.sfx('level'); GV.ach.check(); return M.quests(r ? `${r.cq.who}'s reward: ${Q.rewardText(r.cq.reward)}. ${r.cq.done}` : ''); }
      }, () => M.map());
    },

    achievements() {
      const d = GV.save.data, got = d.ach || {};
      const rows = GV.ACH.map((a) => {
        const has = !!got[a.id];
        let pr = '';
        if (!has && a.prog) { try { const [v, m] = a.prog(); pr = `<i class="bar"><i style="width:${Math.min(100, (v / m) * 100)}%"></i></i><em>${Math.min(v, m)}/${m}</em>`; } catch (e) {} }
        return `<div class="ach ${has ? 'got' : ''}"><span class="ai">${a.icon}</span><div><b>${esc(a.name)}</b><span>${esc(a.desc)}</span>${pr}</div><span class="rw">${has ? '✓' : `+${a.mem} ${memIcon}`}</span></div>`;
      }).join('');
      render(`<div class="screen panel wide achs"><h2>Achievements <span class="muted">${GV.ach.count()} / ${GV.ACH.length}</span></h2>
        <div class="achlist">${rows}</div>
        <div class="menu row"><button class="primary" data-a="back">Back</button></div></div>`, () => M.map(), () => M.map());
    },

    trialEnd(r) {
      const dl = r.daily;
      render(`
        <div class="screen panel narrow clear">
          <h2>Trial Over</h2>
          <div class="sub">${r.newBest ? 'New personal best' : `Personal best: wave ${r.best}`}</div>
          <div class="how">
            <div><b>Waves survived</b><span>${r.reached}</span></div>
            <div><b>Foes destroyed</b><span>${r.kills}</span></div>
            <div><b>Memories gathered</b><span>${memIcon} ${Math.max(0, r.gathered)}</span></div>
            <div><b>Trial reward${r.curseBonus ? ` (+${r.curseBonus}% curses)` : ''}</b><span>${memIcon} ${r.bonus}</span></div>
            ${dl ? `<div><b>Daily Rift</b><span>${dl.claimed ? `${memIcon} ${dl.reward} + Chaos Shard · streak ${dl.streak}` : dl.reached >= dl.goal ? 'Already claimed today' : `Reach wave ${dl.goal} to claim`}</span></div>` : ''}
          </div>
          <p>Everything you picked up is yours to keep: gear, cores and memories.</p>
          <div class="menu">
            <button class="primary" data-a="again">Run it again</button>
            <button data-a="map">${GV.game.homeLabel() || 'Continue'}</button>
          </div>
        </div>`, (a) => {
        if (a === 'again') GV.game.startTrial(r.sys, r.curses, !!r.daily);
        if (a === 'map') GV.game.home();
      });
    },

    dead() {
      render(`
        <div class="screen panel narrow dead">
          <h2>Signal Lost</h2>
          <p>${GV.game.play && GV.game.play.titanMode ? 'The Titan barely noticed. It will be waiting.' : 'The suit reboots at your last lit beacon. The swarm does not forget.'}</p>
          <div class="menu">
            <button class="primary" data-a="respawn">${GV.game.play && GV.game.play.titanMode ? 'Face it again' : 'Wake at the Beacon'}</button>
            <button data-a="map">${GV.game.homeLabel() || 'Continue'}</button>
          </div>
        </div>`, (a) => {
        const g = GV.game;
        if (a === 'respawn') { if (g.play.titanMode) return g.restartRun(); g.play.respawnPlayer(); g.resume(); }
        if (a === 'map') g.home(g.play.sysIdx);
      });
    },

    clear(info) {
      if (info.titan) {
        const T = GV.TITANS[info.titan];
        return render(`<div class="screen panel narrow clear titanclear" style="--tc:${T.color}">
          <h2>${esc(T.name)} Felled</h2><div class="sub">${esc(T.title)} · ${esc(info.sysName)}</div>
          <p>${esc(T.death)}</p>
          <div class="how"><div><b>Memories</b><span>${memIcon} ${info.mem}</span></div><div><b>Times felled</b><span>${info.times}</span></div></div>
          <div class="menu"><button class="primary" data-a="map">${GV.game.homeLabel() || 'Continue'}</button><button data-a="again">Face it again</button></div></div>`, (a) => {
          if (a === 'map') GV.game.home(info.sys);
          if (a === 'again') GV.game.startTitan(info.sys);
        });
      }
      const next = info.st < 2 ? { s: info.sys, t: info.st + 1 } : { s: info.sys + 1, t: 0 };
      const canNext = GV.progress.stageOpen(next.s, next.t);
      const nsys = GV.UNIVERSE.system(next.s);
      render(`
        <div class="screen panel narrow clear">
          <h2>Stage Cleared</h2>
          <div class="sub">${esc(info.sysName)} · ${esc(info.name)}</div>
          <div class="how">
            <div><b>Memories gathered</b><span>${memIcon} ${info.mem}</span></div>
            <div><b>Foes destroyed</b><span>${info.kills}</span></div>
            <div><b>Caches opened</b><span>${info.vaults} / ${info.vaultsTotal}</span></div>
          </div>
          ${info.vaults < info.vaultsTotal ? '<p>Sealed caches remain here. New powers will open them.</p>' : ''}
          ${info.st === 2 ? `<p>The system falls quiet. A new one appears on the war table: <b>${esc(nsys.name)}</b>.</p>` : ''}
          <div class="menu">
            ${canNext ? `<button class="primary" data-a="next">Next: ${esc(nsys.stages[next.t].name)}</button>` : ''}
            <button data-a="map">${GV.game.homeLabel() || 'Continue'}</button>
          </div>
        </div>`, (a) => {
        if (a === 'next') GV.game.startStage(next.s, next.t);
        if (a === 'map') GV.game.home(next.s <= GV.progress.frontier() ? next.s : info.sys);
      });
    },

    ship() {
      const lines = [
        'Beyond the Warden\'s arena, half-buried in black ice: a hull you know.',
        'The LANTERN. Your ship. Her cockpit lights flicker at your touch.',
        'The memories you carry wake her drive. The Kharon Drift was only the first system.',
        'Out there, other systems wait. Every one you clear charts another. The void does not end, and neither does your search.',
      ];
      let i = 0;
      const draw = () => render(`
        <div class="screen cine">
          <div class="cinebox"><p>${lines[i]}</p>
          <div class="menu row"><button class="primary" data-a="next">${i < lines.length - 1 ? 'Continue' : 'Launch the Lantern'}</button></div></div>
        </div>`, () => {
        i++;
        if (i < lines.length) draw();
        else { GV.game.shipT = 4.5; setTimeout(() => GV.game.toMap(1), 1600); M.hide(); }
      });
      draw();
    },
  });
})();
