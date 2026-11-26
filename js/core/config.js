// Galactic Void — tuning constants. Change feel here without touching game code.
(function () {
  window.GV.CFG = {
    W: 960, // widens on wide phone screens so the game fills the display
    H: 540,
    GRAV: 2100,
    MAXFALL: 1150,
    RUN: 310,
    ACCEL: 3200,
    AIRACCEL: 2200,
    FRICTION: 3400,
    JUMP: 760,
    DJUMP: 690,
    JUMP_CUT: 0.45,
    COYOTE: 0.1,
    BUFFER: 0.13,
    DASH_SPEED: 960,
    DASH_TIME: 0.17,
    DASH_CD: 0.5,
    WALL_SLIDE: 130,
    WALLJUMP_X: 360,
    WALLJUMP_Y: 720,
    INVULN: 0.9,
    MAX_PARTS: 600,
    HUD: 1, // HUD scale; raised on small touch screens
    FONT: '"Chakra Petch", "Segoe UI", sans-serif',
  };
})();

// Names for the skill system, in one place so the whole game says the same thing.
window.GV.TERMS = {
  cores: 'Star Cores', core: 'Star Core', skillCore: 'Skill Core', aug: 'Augment', augs: 'Augments',
  port: 'port', ports: 'ports', orb: 'Flux Coupler', orbs: 'Flux Couplers',
  blank: (kind) => (kind === 'skill' ? 'Blank Star Core' : 'Blank Augment'),
  coresKey: () => (window.GV.input && window.GV.input.isTouch ? 'Cores' : 'G'),
};
window.GV.ORB_NAME = () => window.GV.TERMS.orb;

// ---------- difficulty curve ----------
// Player power multiplies as you level (core levels × passives × gear × augments), so enemy
// health and damage compound too. diff = system × 3 + stage. "Rank pressure": being well above
// the expected rank for a system toughens its enemies, so out-levelling never trivialises it.
window.GV.SCALE = {
  expectedRank: (diff) => 4 + Math.round(diff * 2.35),
  pressure(diff) {
    const d = window.GV.save && (window.GV.save.main || window.GV.save.data);
    const over = Math.max(0, ((d && d.level) || 1) - this.expectedRank(diff));
    return 1 + Math.min(0.75, over * 0.045);
  },
  // the first two stages are gentler while a new player finds their feet
  early: (diff) => (diff < 2 ? 0.7 + 0.15 * diff : 1),
  hp: (diff) => 2.2 * Math.pow(1.18, diff) * window.GV.SCALE.pressure(diff) * window.GV.SCALE.early(diff),
  dmg: (diff) => 1.64 * Math.pow(1.12, diff) * Math.sqrt(window.GV.SCALE.pressure(diff)),
  bossHp: (diff) => 9 * Math.pow(1.17, diff) * window.GV.SCALE.pressure(diff) * window.GV.SCALE.early(diff),
  bossDmg: (diff) => 1.7 * Math.pow(1.12, diff) * Math.sqrt(window.GV.SCALE.pressure(diff)),
};
