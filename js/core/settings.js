// Galactic Void — per-device settings (graphics, sound, feedback). Kept in this browser only,
// not in the save, so a phone can run Battery Saver while the computer runs High.
(function () {
  const GV = window.GV;
  const KEY = 'galacticVoid.settings';
  const ZOOMS = { close: 1.3, standard: 1.15, wide: 1 };
  GV.settings = {
    zoom() { return ZOOMS[this.data.cam] || 1.3; },
    data: { gfx: 'auto', shake: true, numbers: true, volume: 0.8, music: 0.7, fps: false, ghost: true, cam: 'close', aimAssist: 'light', hitstop: true },
    load() {
      try { Object.assign(this.data, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
      return this.data;
    },
    set(k, v) {
      this.data[k] = v;
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
      this.apply();
    },
    // 'auto' picks Battery Saver on touch devices, High elsewhere.
    saver() {
      const g = this.data.gfx;
      return g === 'saver' || (g === 'auto' && GV.input.isTouch);
    },
    apply() {
      if (GV.audio) GV.audio.setVolume(this.data.volume);
      if (GV.music) GV.music.setLevel(this.data.music);
      if (GV.game && GV.game.resize) GV.game.resize();
    },
  };
})();
