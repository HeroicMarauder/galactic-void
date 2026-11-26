// Galactic Void — which build this is, and what changed. The web version also serves this as
// version.json, which open copies of the game check now and then to offer a reload.
window.GV = window.GV || {};
window.GV.BUILD = {
  id: '2026.11.26-17',
  title: 'Pause Fix',
  notes: [
    'Fixed: on phones, tapping Pause while another finger was on the stick or a button did nothing, so the fight kept going (and could kill you behind the menu you expected)',
    'Pause now reacts the instant your finger touches it',
    'The game also pauses itself if it loses focus: a notification, the app switcher, or clicking another window (not in online co-op, where your squad plays on)',
  ],
};
