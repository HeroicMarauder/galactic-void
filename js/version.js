// Galactic Void — which build this is, and what changed. The web version also serves this as
// version.json, which open copies of the game check now and then to offer a reload.
window.GV = window.GV || {};
window.GV.BUILD = {
  id: '2026.11.27-2',
  title: 'Skill Arts',
  notes: [
    'Every Star Core now learns Arts as it levels (see them on the Star Cores screen):',
    'Lv 4 Flow: using skills back to back builds Combo, +4% damage a stack. Switching skills builds 2 stacks',
    'Lv 8 Style: every 3rd use changes the move. Blades whirl-step, guns double-tap, storms aftershock, heals ward you, movement and summons give Momentum',
    'Lv 14 Finisher: at full Combo your next use hits twice as hard with a signature burst (Rending Crescent, Overcharge, Cataclysm, Lifebloom, Second Wind)',
    'Lv 20 Mastery: Combo reaches 8 and Finishers grant haste and guard',
    'Star Cores only gain experience if you used them recently (summons and auras count for a minute after you cast them), so idle cores no longer level up',
  ],
};
