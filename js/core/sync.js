// Galactic Void — save transfer. Three ways to move a save between phone and computer:
//  1. Cloud save: kept privately under your claude.ai account; any device signed in to the same
//     account sees it. Auto-uploads after progress, and offers a newer save when you open the game.
//  2. Transfer code: a copy-paste text code.
//  3. Save file: download a .json file and load it on the other device.
(function () {
  const GV = window.GV;
  const CODE_PREFIX = 'GV1:';

  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), ms))]);
  const deviceName = () => {
    const ua = navigator.userAgent || '';
    if (/iPad|Tablet/i.test(ua)) return 'Tablet';
    if (/iPhone|Android|Mobile/i.test(ua)) return 'Phone';
    return 'Computer';
  };

  const S = (GV.sync = {
    status: 'checking', // checking | ready | unavailable
    cloud: null, // meta + json of the cloud save, if any
    ref: null, downloads: null,
    auto: true, armed: false, // auto-upload only after the startup check is settled
    busy: false, dirty: false, timer: 0, lastError: '',
    listeners: [],

    onChange(fn) { this.listeners.push(fn); },
    emit() { for (const fn of this.listeners) try { fn(); } catch (e) {} },

    async init() {
      try { this.auto = localStorage.getItem('galacticVoid.autoSync') !== 'off'; } catch (e) {}
      if (!window.claude || !window.claude.use) { this.status = 'unavailable'; this.emit(); return; }
      try {
        const [db, user, dl] = await Promise.all([window.claude.use('db'), window.claude.use('user'), window.claude.use('downloads')]);
        this.downloads = dl || null;
        const id = db && user ? await user.id() : null;
        if (!db || !id) { this.status = 'unavailable'; this.emit(); return; }
        this.ref = db.doc('data/users/' + id + '/save');
        this.status = 'ready';
        await this.peek();
        this.startupCheck();
      } catch (e) {
        this.status = 'unavailable';
      }
      this.emit();
    },

    // Erase Save wipes the cloud copy too. If the cloud can't be reached right now, it's marked to be
    // overwritten with the fresh save on the next upload instead.
    async eraseCloud() {
      this.cloud = null; this.pending = false;
      if (!this.ref) return;
      try { await withTimeout(this.ref.delete(), 10000); this.dirty = false; }
      catch (e) { this.dirty = true; this.changed(); }
    },
    async peek() {
      if (!this.ref) return null;
      try {
        const snap = await withTimeout(this.ref.get(), 10000);
        this.cloud = snap.exists ? snap.data() : null;
        this.lastError = '';
      } catch (e) {
        this.lastError = e && e.code === 'timeout' ? 'The cloud did not answer. Try again in a moment.' : 'Could not reach the cloud save.';
      }
      this.emit();
      return this.cloud;
    },

    // On launch: if the cloud holds a newer save than this device, offer it (or take it quietly
    // when this device has nothing yet). Uploads stay off until that question is settled, so an
    // older device never overwrites newer progress.
    startupCheck() {
      const local = GV.save.data, c = this.cloud;
      if (c && c.json && (c.savedAt || 0) > (local.savedAt || 0) + 1000) {
        if (!GV.save.hasProgress() && GV.game && GV.game.scene === 'title' && !document.querySelector('.classes')) { this.applyCloud(); this.armed = true; GV.menus.show('title'); return; }
        this.pending = true;
        if (GV.game && GV.game.scene === 'title' && !document.querySelector('.classes')) GV.menus.show('title');
        else if (GV.game && GV.game.scene === 'map') GV.menus.show('map');
        return;
      }
      this.armed = true;
      if (!c || (local.savedAt || 0) > (c.savedAt || 0) + 1000) this.changed();
    },
    resolvePending(useCloud) {
      this.pending = false;
      this.armed = true;
      if (useCloud) this.applyCloud();
      else this.push();
    },

    changed() {
      this.dirty = true;
      if (!this.auto || !this.armed || this.status !== 'ready') return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.push(), 6000);
    },

    async push() {
      if (this.status !== 'ready' || !this.ref) return false;
      if (this.busy) { this.changed(); return false; }
      this.busy = true; this.emit();
      const d = GV.save.data;
      const body = {
        json: JSON.stringify(d), savedAt: d.savedAt || Date.now(), device: deviceName(),
        level: d.level || 1, cls: d.cls || '', memories: d.memories || 0, stages: Object.keys(d.cleared || {}).length,
        // keybinds and macros ride along, so a new device plays the way you set it up
        prefs: (() => { try { return JSON.stringify({ binds: localStorage.getItem('gv_binds_v1'), macros: localStorage.getItem('gv_macros_v1') }); } catch (e) { return ''; } })(),
      };
      let ok = false;
      try {
        await withTimeout(this.ref.set(body), 12000);
        this.cloud = body; this.dirty = false; this.lastError = ''; ok = true;
      } catch (e) {
        if (e && e.code === 'unavailable') {
          await new Promise((r) => setTimeout(r, 800 + Math.random() * 800));
          try { await withTimeout(this.ref.set(body), 12000); this.cloud = body; this.dirty = false; ok = true; } catch (e2) { this.lastError = 'Upload failed. Your save is still safe on this device.'; }
        } else this.lastError = e && e.code === 'quota_exceeded' ? 'The cloud save is full.' : 'Upload failed. Your save is still safe on this device.';
      }
      this.busy = false; this.emit();
      return ok;
    },

    applyCloud() {
      const c = this.cloud;
      if (!c || !c.json) return false;
      try {
        const obj = JSON.parse(c.json);
        GV.save.replace(obj);
        if (c.prefs) { try { const pf = JSON.parse(c.prefs); if (pf.binds) localStorage.setItem('gv_binds_v1', pf.binds); if (pf.macros) localStorage.setItem('gv_macros_v1', pf.macros); GV.input.reloadBinds && GV.input.reloadBinds(); GV.macros && GV.macros.load(); } catch (e) {} }
        return true;
      } catch (e) { this.lastError = 'The cloud save could not be read.'; return false; }
    },
    async pull() {
      await this.peek();
      return this.applyCloud();
    },
    setAuto(on) {
      this.auto = on;
      try { localStorage.setItem('galacticVoid.autoSync', on ? 'on' : 'off'); } catch (e) {}
      if (on) this.changed();
      this.emit();
    },

    // ---- transfer code ----
    makeCode() {
      const json = JSON.stringify(GV.save.data);
      const b64 = btoa(unescape(encodeURIComponent(json)));
      return CODE_PREFIX + b64;
    },
    // Accepts a transfer code or the raw JSON from a save file. Returns the save object or throws.
    parse(text) {
      text = String(text || '').trim();
      let json = text;
      if (text.startsWith(CODE_PREFIX)) json = decodeURIComponent(escape(atob(text.slice(CODE_PREFIX.length).replace(/\s+/g, ''))));
      const obj = JSON.parse(json);
      if (!obj || typeof obj !== 'object' || (obj.level == null && obj.memories == null)) throw new Error('not a save');
      return obj;
    },

    // ---- save file ----
    async download() {
      if (!this.downloads) return { ok: false, msg: 'Downloads are not available here. Use the transfer code instead.' };
      const date = new Date().toISOString().slice(0, 10);
      try {
        await this.downloads.save({ filename: `galactic-void-save-${date}.json`, data: JSON.stringify(GV.save.data, null, 1) });
        return { ok: true, msg: 'Save file downloaded.' };
      } catch (e) {
        if (e && e.code === 'declined') return { ok: false, msg: 'Download cancelled.' };
        return { ok: false, msg: 'The download did not work here. Use the transfer code instead.' };
      }
    },

    ago(ms) {
      if (!ms) return 'never';
      const s = Math.max(0, (Date.now() - ms) / 1000);
      if (s < 60) return 'just now';
      if (s < 3600) return Math.round(s / 60) + ' min ago';
      if (s < 86400) return Math.round(s / 3600) + ' h ago';
      return new Date(ms).toLocaleDateString();
    },
    deviceName,
  });
})();
