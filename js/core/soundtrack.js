// Galactic Void — the soundtrack. The game ships with four albums (js/data/ost.js), one per act:
// a stage plays its act's album, the deck and menus shuffle all four, Titans get the war album.
// The radio on the deck (or Settings) picks a station: follow the act, one album, everything,
// your own songs, or the generated score. Songs you add are kept on this device (IndexedDB).
// Boss fights push the current song faster, a touch higher, and heavier.
(function () {
  const GV = window.GV;
  const DB = 'galacticVoidMusic', STORE = 'tracks';
  const BOSS_RATE = 1.12;

  let db = null;
  function open() {
    if (db) return Promise.resolve(db);
    return new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('No storage'));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      r.onsuccess = () => { db = r.result; res(db); };
      r.onerror = () => rej(r.error);
    });
  }
  const tx = (mode) => open().then((d) => d.transaction(STORE, mode).objectStore(STORE));
  const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  const ST = (GV.soundtrack = {
    tracks: [],       // { id, name, album, size, blob }
    ready: false,
    busy: '',
    decks: [], cur: -1, mode: null, key: null, bag: [], boss: 0,

    async init() {
      try {
        this.tracks = (await req((await tx('readonly')).getAll())) || [];
      } catch (e) { this.tracks = []; }
      this.ready = true;
    },
    albumsOff() { return GV.settings.data.albumsOff || (GV.settings.data.albumsOff = {}); },
    albums() {
      const m = {};
      for (const t of this.tracks) { const a = (m[t.album] = m[t.album] || { name: t.album, n: 0, size: 0 }); a.n++; a.size += t.size || 0; }
      return Object.values(m).sort((a, b) => a.name.localeCompare(b.name));
    },
    ost() { return (this._ost = this._ost || (GV.OST || []).map((t, i) => ({ id: 'ost:' + i, name: t.n, album: t.a, url: t.f, ost: true }))); },
    stationMode() { return GV.settings.data.radio || 'auto'; },
    // which album the current place calls for, in "follow the act" mode
    contextAlbum() {
      const p = GV.game && GV.game.play;
      if (!p || !p.L || p.L.hall) return null;
      if (p.titanMode || p.titan) return 'The War Reality Forgot';
      if (p.trial) return null;
      const A = GV.ACTS && GV.actOf ? GV.ACTS[GV.actOf(p.sysIdx || 0)] : null;
      return A ? A.album : null;
    },
    enabled() {
      const off = this.albumsOff(), mode = this.stationMode(), ost = this.ost().filter((t) => !off[t.album]), mine = this.tracks.filter((t) => !off[t.album]);
      if (mode === 'gen') return [];
      if (mode === 'mine') return mine;
      if (mode === 'all') return ost.concat(mine);
      if (mode.startsWith('album:')) { const a = mode.slice(6); return ost.concat(mine).filter((t) => t.album === a); }
      const ctx = this.contextAlbum(), pick = ctx ? ost.filter((t) => t.album === ctx) : ost;
      return (pick.length ? pick : ost).concat(GV.settings.data.mixMine ? mine : []);
    },
    poolKey() { return this.stationMode() + '|' + (this.contextAlbum() || '*'); },
    active() { return this.ready && GV.settings.data.ownMusic !== false && this.enabled().length > 0; },
    stations() {
      const al = [...new Set(this.ost().map((t) => t.album))];
      const out = [{ id: 'auto', name: 'Follow the act', sub: 'Each act plays its own album' }, { id: 'all', name: 'Shuffle everything', sub: `${this.ost().length + this.tracks.length} songs` }];
      for (const a of al) out.push({ id: 'album:' + a, name: a, sub: `${this.ost().filter((t) => t.album === a).length} songs` });
      if (this.tracks.length) out.push({ id: 'mine', name: 'Your music', sub: `${this.tracks.length} songs you added` });
      out.push({ id: 'gen', name: 'Generated score', sub: 'The synth music, no songs' });
      return out;
    },
    setStation(id) { GV.settings.set('radio', id); this.bag = []; this.key = null; },

    // ---------- library ----------
    async add(files, albumName) {
      const list = [...files].filter((f) => /^audio\//.test(f.type) || /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i.test(f.name));
      if (!list.length) return 0;
      try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
      let n = 0;
      for (const f of list) {
        this.busy = `Adding ${++n} of ${list.length}…`;
        const parts = (f.webkitRelativePath || '').split('/');
        const album = (parts.length > 2 ? parts[parts.length - 2] : parts.length > 1 ? parts[0] : '') || albumName || 'My Music';
        const rec = { name: f.name.replace(/\.[^.]+$/, '').replace(/^\d+[\s._-]+/, ''), album, size: f.size, blob: f };
        try { rec.id = await req((await tx('readwrite')).add(rec)); this.tracks.push(rec); }
        catch (e) { this.busy = ''; throw new Error(e && e.name === 'QuotaExceededError' ? 'This device is out of storage space for music.' : 'Could not save that song.'); }
      }
      this.busy = '';
      this.bag = [];
      return list.length;
    },
    async removeAlbum(name) {
      const s = await tx('readwrite');
      for (const t of this.tracks.filter((t) => t.album === name)) s.delete(t.id);
      this.tracks = this.tracks.filter((t) => t.album !== name);
      this.bag = [];
      if (this.decks[this.cur] && this.decks[this.cur].track && this.decks[this.cur].track.album === name) this.stop();
    },
    toggleAlbum(name, on) {
      const off = Object.assign({}, this.albumsOff());
      if (on) delete off[name]; else off[name] = true;
      GV.settings.set('albumsOff', off);
      this.bag = [];
    },

    // ---------- playback ----------
    graph() {
      const A = GV.audio, c = A.ctx;
      if (!c || this.bus) return !!c;
      this.bus = c.createGain(); this.bus.gain.value = 0.9;
      this.low = c.createBiquadFilter(); this.low.type = 'lowshelf'; this.low.frequency.value = 140; this.low.gain.value = 0;
      this.high = c.createBiquadFilter(); this.high.type = 'highshelf'; this.high.frequency.value = 3200; this.high.gain.value = 0;
      this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 3;
      this.bus.connect(this.low); this.low.connect(this.high); this.high.connect(this.comp); this.comp.connect(A.master);
      return true;
    },
    deck() {
      const c = GV.audio.ctx, el = new Audio();
      el.preload = 'auto'; el.crossOrigin = 'anonymous';
      const g = c.createGain(); g.gain.value = 0;
      let src = null;
      try { src = c.createMediaElementSource(el); src.connect(g); } catch (e) {}
      g.connect(this.bus);
      const d = { el, g, url: null, track: null, src };
      el.addEventListener('ended', () => { if (this.decks[this.cur] === d) this.next(); });
      el.addEventListener('error', () => { if (this.decks[this.cur] === d) setTimeout(() => this.next(), 300); });
      return d;
    },
    pick() {
      const pool = this.enabled();
      if (!pool.length) return null;
      const pk = this.poolKey(); if (pk !== this.bagKey) { this.bag = []; this.bagKey = pk; }
      if (!this.bag.length) {
        this.bag = pool.map((t) => t.id);
        for (let i = this.bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]; }
        const now = this.decks[this.cur] && this.decks[this.cur].track;
        if (now && this.bag.length > 1 && this.bag[this.bag.length - 1] === now.id) this.bag.unshift(this.bag.pop());
      }
      const id = this.bag.pop();
      return pool.find((t) => t.id === id) || pool[0];
    },
    next() {
      if (!this.graph()) return;
      const t = this.pick();
      if (!t) return this.stop();
      if (this.decks.length < 2) this.decks = [this.deck(), this.deck()];
      const c = GV.audio.ctx, now = c.currentTime;
      const old = this.decks[this.cur];
      this.cur = this.cur === 0 ? 1 : 0;
      const d = this.decks[this.cur];
      if (d.url) URL.revokeObjectURL(d.url);
      d.url = t.url ? null : URL.createObjectURL(t.blob); d.track = t;
      d.el.src = t.url || d.url;
      d.el.preservesPitch = d.el.mozPreservesPitch = d.el.webkitPreservesPitch = false;
      d.el.playbackRate = 1 + (BOSS_RATE - 1) * this.boss;
      d.g.gain.cancelScheduledValues(now); d.g.gain.setValueAtTime(0.0001, now); d.g.gain.linearRampToValueAtTime(1, now + 1.6);
      const p = d.el.play(); if (p && p.catch) p.catch(() => { this.wantPlay = true; });
      if (old) {
        old.g.gain.cancelScheduledValues(now); old.g.gain.setValueAtTime(old.g.gain.value, now); old.g.gain.linearRampToValueAtTime(0.0001, now + 1.6);
        const oe = old.el; setTimeout(() => { if (this.decks[this.cur] !== old) oe.pause(); }, 1700);
      }
      this.nowPlaying = t;
      this.announce(t);
    },
    skip() { if (this.nowPlaying) { this.next(); return true; } return false; },
    station() { return (GV.settings.data.station || '').trim() || 'Void Radio'; },
    // A small "now playing" card slides in whenever a new song starts.
    announce(t) {
      let el = document.getElementById('nowPlaying');
      if (!el) { el = document.createElement('div'); el.id = 'nowPlaying'; document.body.appendChild(el); }
      const esc = GV.menus ? GV.menus.esc : (s) => s;
      const html = `<span class="np-ic">♪</span><div><small>${esc(this.station())}${t.ost ? ' · Galactic Void OST' : ''}</small><b>${esc(t.name)}</b><span>${esc(t.album)}</span></div>`;
      // Fade out any card still showing, then fade the new one in, hold, and fade out.
      clearTimeout(this._npT); clearTimeout(this._npIn);
      const wasOn = el.classList.contains('show');
      el.classList.remove('show');
      this._npIn = setTimeout(() => { el.innerHTML = html; el.classList.add('show'); this._npT = setTimeout(() => el.classList.remove('show'), 4500); }, wasOn ? 700 : 30);
    },
    stop() {
      for (const d of this.decks) { try { d.el.pause(); } catch (e) {} }
      this.nowPlaying = null;
    },
    // Called every frame from the main loop. key changes when a new stage/trial/menu begins.
    update(dt, mode, key) {
      const on = this.active() && !GV.audio.muted && GV.settings.data.music > 0;
      if (!on || !GV.audio.ctx) { if (this.nowPlaying) this.stop(); this.key = null; return false; }
      if (GV.audio.ctx.state !== 'running') return true;
      // a new place, or a station whose songs don't include what's playing: change song
      const pk = this.poolKey();
      if (key !== this.key || !this.nowPlaying || (pk !== this.playKey && !this.enabled().includes(this.nowPlaying))) { this.key = key; this.playKey = pk; this.next(); }
      else if (pk !== this.playKey) this.playKey = pk;
      else if (this.wantPlay) { this.wantPlay = false; const d = this.decks[this.cur]; d && d.el.play().catch(() => {}); }
      // Boss intensity eases in and out.
      const target = mode === 'boss' ? 1 : 0;
      this.boss += Math.sign(target - this.boss) * Math.min(Math.abs(target - this.boss), dt / 1.2);
      const d = this.decks[this.cur];
      if (d) { const r = Math.round((1 + (BOSS_RATE - 1) * this.boss) * 100) / 100; if (d.el.playbackRate !== r) d.el.playbackRate = r; }
      if (this.low) { this.low.gain.value = 7 * this.boss; this.high.gain.value = 3 * this.boss; }
      if (this.bus) this.bus.gain.value = (mode === 'menu' ? 0.65 : 0.9) * GV.settings.data.music * (1 + 0.2 * this.boss);
      return true;
    },
    pauseAll(hidden) {
      const d = this.decks[this.cur];
      if (!d || !this.nowPlaying) return;
      if (hidden) d.el.pause(); else d.el.play().catch(() => {});
    },

    // ---------- the "Your music" section of Settings ----------
    panelHtml(esc) {
      if (!window.indexedDB) return '<p class="muted">This browser can\'t store music for the game.</p>';
      const al = this.albums(), off = this.albumsOff();
      const mb = (b) => (b / 1048576).toFixed(b > 1e8 ? 0 : 1) + ' MB';
      const total = al.reduce((a, x) => a + x.size, 0);
      const dir = 'webkitdirectory' in document.createElement('input');
      return `<div class="gsub">Your radio station <span>${this.tracks.length} song${this.tracks.length === 1 ? '' : 's'}${total ? ' · ' + mb(total) : ''}</span></div>
        <p class="muted">The game's own soundtrack: four albums, one for each act. Pick a station here or at the radio on your deck. You can add your own songs too; they stay on this device. Boss fights speed the song up and hit harder. N skips a song (Pause → Next song on phones and controllers).</p>
        <div class="stations">${this.stations().map((st) => `<button class="tab ${this.stationMode() === st.id ? 'sel' : ''}" data-a="radio" data-st="${esc(st.id)}">${esc(st.name)}</button>`).join('')}</div>
        <input id="stationName" class="txt" placeholder="Station name (Void Radio)" maxlength="32" value="${esc(GV.settings.data.station || '')}">
        ${this.busy ? `<p class="busy">${this.busy}</p>` : ''}
        <div class="albums">${[...new Set(this.ost().map((t) => t.album))].map((a) => `<div class="album ${off[a] ? 'off' : ''}"><label class="tog"><input type="checkbox" data-alb="${esc(a)}" ${off[a] ? '' : 'checked'}> <b>${esc(a)}</b></label><span>${this.ost().filter((t) => t.album === a).length} songs · soundtrack</span></div>`).join('')}${al.map((a) => `<div class="album ${off[a.name] ? 'off' : ''}">
          <label class="tog"><input type="checkbox" data-alb="${esc(a.name)}" ${off[a.name] ? '' : 'checked'}> <b>${esc(a.name)}</b></label>
          <span>${a.n} song${a.n === 1 ? '' : 's'} · ${mb(a.size)}</span>
          <button class="ghost small" data-a="delAlb" data-alb="${esc(a.name)}">Remove</button></div>`).join('')}</div>
        ${this.nowPlaying ? `<p class="muted np">Now playing: <b>${esc(this.nowPlaying.name)}</b> · ${esc(this.nowPlaying.album)}</p>` : ''}
        <div class="addmusic">
          <input id="albName" class="txt" placeholder="Album name (for single songs)" maxlength="40">
          <div class="menu row">
            <button data-a="addSongs">Add songs</button>
            ${dir ? '<button data-a="addFolder">Add an album folder</button>' : ''}
          </div>
          ${this.tracks.length ? `<label class="tog"><input type="checkbox" id="mixMine" ${GV.settings.data.mixMine ? 'checked' : ''}> Mix my songs into "Follow the act"</label>` : ''}
        </div>
        <input type="file" id="pickSongs" accept="audio/*,.mp3,.m4a,.ogg,.opus,.wav,.flac" multiple hidden>
        ${dir ? '<input type="file" id="pickFolder" webkitdirectory multiple hidden>' : ''}`;
    },
    bindPanel(rerender, setMsg) {
      const pick = async (input) => {
        const name = (document.getElementById('albName') || {}).value;
        const files = input.files;
        if (!files || !files.length) return;
        const tick = setInterval(() => { const b = document.querySelector('.settings .busy'); if (b) b.textContent = this.busy; }, 200);
        this.busy = 'Adding…'; rerender();
        try { const n = await this.add(files, (name || '').trim()); setMsg(n ? `Added ${n} song${n === 1 ? '' : 's'}.` : 'No audio files found there.'); }
        catch (e) { setMsg(e.message); }
        clearInterval(tick); this.busy = ''; this.key = null; rerender();
      };
      const mm = document.getElementById('mixMine'); if (mm) mm.addEventListener('change', () => { GV.settings.set('mixMine', mm.checked); this.bag = []; });
      const sn = document.getElementById('stationName');
      if (sn) sn.addEventListener('change', () => GV.settings.set('station', sn.value.trim()));
      const s = document.getElementById('pickSongs'), f = document.getElementById('pickFolder');
      if (s) s.addEventListener('change', () => pick(s));
      if (f) f.addEventListener('change', () => pick(f));
      document.querySelectorAll('[data-alb]').forEach((el) => {
        if (el.tagName === 'INPUT') el.addEventListener('change', () => { this.toggleAlbum(el.dataset.alb, el.checked); this.key = null; rerender(); });
      });
    },
    onAction(a, b, rerender) {
      if (a === 'radio') { this.setStation(b.dataset.st); GV.audio.unlock(); rerender(); return true; }
      if (a === 'addSongs') { GV.audio.unlock(); document.getElementById('pickSongs').click(); return true; }
      if (a === 'addFolder') { GV.audio.unlock(); document.getElementById('pickFolder').click(); return true; }
      if (a === 'delAlb') {
        if (b.dataset.sure) { this.removeAlbum(b.dataset.alb).then(() => { this.key = null; rerender(); }); }
        else { b.dataset.sure = '1'; b.textContent = 'Tap again to remove'; }
        return true;
      }
      return false;
    },
  });
  document.addEventListener('visibilitychange', () => ST.pauseAll(document.hidden));
})();
