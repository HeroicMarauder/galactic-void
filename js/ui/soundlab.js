// Galactic Void — the Sound Lab (Settings → Sound Lab): hear every sound effect, and swap any of them for
// your own audio file. Files you pick here are kept on this device. To ship sounds to every player, put the
// files in the game's sfx/ folder and list them in sfx/manifest.json.
(function () {
  const GV = window.GV;
  let back = null, msg = '', q = '';
  const esc = (s) => GV.menus.esc(s);

  function render() {
    const M = GV.menus, C = GV.sfxCustom, sh = C.shipped();
    const groups = GV.SFX_GROUPS.map(([title, names]) => {
      const list = names.filter((n) => GV.filters.match(q, n, GV.SFX_NAMES[n] || ''));
      if (!list.length) return '';
      return `<div class="gsub">${esc(title)}</div><div class="slab">` + list.map((n) => {
        const mine = C.fileOf[n], game = !mine && sh[n];
        const src = mine ? `<em class="mine">Your file · ${esc(mine)}</em>` : game ? `<em class="game">Game file · ${esc(sh[n])}</em>` : '<em>Built in</em>';
        return `<div class="srow"><button class="play" data-a="play" data-k="${n}" title="Play">▶</button><div class="sn"><b>${esc(GV.SFX_NAMES[n] || n)}</b><small>${n}</small>${src}</div>
          <label class="ghost small up">Replace<input type="file" accept="audio/*" data-up="${n}" hidden></label>${mine ? `<button class="ghost small" data-a="reset" data-k="${n}">Reset</button>` : ''}</div>`;
      }).join('') + '</div>';
    }).join('');
    M.render(`
      <div class="screen panel wide soundlab">
        <div class="topbar"><h2>Sound Lab</h2><div class="stats">${Object.keys(C.fileOf).length} of yours${Object.keys(sh).length ? ` · ${Object.keys(sh).length} game files` : ""}</div></div>
        <p class="muted">Tap ▶ to hear a sound. <b>Replace</b> swaps it for an audio file of your own (wav, mp3 or ogg; short and trimmed works best). Your files stay on this device.</p>
        ${msg ? `<p class="ok">${esc(msg)}</p>` : ''}
        <div class="fbar" data-fbar="slab"><div class="vtools ftools"><input data-fq="1" type="search" placeholder="Search sounds" value="${esc(q)}" autocomplete="off"></div></div>
        ${groups || '<p class="note fnone">No sounds match.</p>'}
        <details class="howto"><summary>Making your own sounds</summary>
          <p>Free tools that work well: <b>sfxr / jsfxr</b> and <b>ChipTone</b> (in the browser, made for game effects), <b>Audacity</b> (record and edit), and <b>freesound.org</b> (filter by the CC0 licence so you can use them freely). Keep effects under a second, trim the silence off the start, and export as .ogg or .wav.</p>
          <p>To make a sound part of the game for everyone, add the file to the <code>sfx/</code> folder of the game's code and list it in <code>sfx/manifest.json</code> by the short name shown under each sound, for example <code>{ "jump": "my-jump.ogg", "hitMetal": "clang.wav" }</code>.</p>
        </details>
        <div class="menu row"><button class="primary" data-a="back">Done</button></div>
      </div>`, onAction, () => back && back());
    GV.filters.bind('slab', { q: (v) => { q = v; render(); } });
    document.querySelectorAll('#ui [data-up]').forEach((inp) => inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      if (f.size > 4 * 1024 * 1024) { msg = 'That file is over 4 MB. Short effects work best.'; return render(); }
      try { await GV.sfxCustom.save(inp.dataset.up, f); GV.sfxCustom.fileOf[inp.dataset.up] = f.name; msg = `${GV.SFX_NAMES[inp.dataset.up] || inp.dataset.up} now uses ${f.name}.`; setTimeout(() => GV.sfxPreview(inp.dataset.up), 250); }
      catch (e) { msg = 'This browser couldn\'t store that file.'; }
      render();
    }));
  }
  async function onAction(a, b) {
    msg = '';
    if (a === 'back') return back && back();
    if (a === 'play') return GV.sfxPreview(b.dataset.k);
    if (a === 'reset') { const n = b.dataset.k; await GV.sfxCustom.remove(n); delete GV.sfxCustom.fileOf[n]; msg = `${GV.SFX_NAMES[n] || n} is back to the built-in sound.`; }
    render();
  }
  GV.soundLab = { open(b) { back = b; msg = ''; render(); } };
})();
