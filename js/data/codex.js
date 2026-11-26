// Galactic Void — the Codex: crew logs that unlock with progress, the bestiary (kill counts,
// with a damage bonus once a kind is studied), and the echo fragments found in caches.
(function () {
  const GV = window.GV;
  const d = () => GV.save.data;
  const cleared = (k) => !!d().cleared[k];
  const sector1Caches = () => ['0-0-0', '0-0-1', '0-1-0', '0-1-1', '0-2-0', '0-2-1'].filter((k) => d().vaults[k]).length;
  const totalKills = () => Object.values(d().codex.kills).reduce((a, b) => a + b, 0);

  GV.LOGS = [
    { id: 'l1', title: 'Engineer Ione · Day 1 after', when: () => cleared('0-0'), hint: 'Clear the Drift Shelf',
      text: 'The hull breach sealed itself. Hulls do not do that. I logged it as a fault in the patch foam and went back to sleep. When I woke, the foam had grown a pattern, like frost on a window, like handwriting.' },
    { id: 'l2', title: "Vesper's Ledger · Entry 212", when: () => cleared('0-1'), hint: 'Clear the Echo Wreck',
      text: 'Paid: one oxygen cell. Received: a map to a ship called LANTERN. The ship is ours. I checked twice. The trader who sold it to me wore our crew patch, and had no face behind the visor.' },
    { id: 'l3', title: 'Captain Arden · Final Log', when: () => cleared('0-2'), hint: 'Defeat the Hollow Warden',
      text: 'I am staying at the Horizon so the others can run. If something comes back wearing my helmet, do not open the airlock. Do not listen when it says your name. It will say it the way I do.' },
    { id: 'l4', title: 'Unsigned · Found in the Lantern', when: () => d().shipFound, hint: 'Find the Lantern',
      text: 'Whoever finds this: the drive runs on memories now. Not fuel. Memories. Every jump costs one of us a little. I do not remember my mother\'s face anymore. I think that is what it ate first.' },
    { id: 'l5', title: 'Ione · Recorded in the Swarm', when: () => totalKills() >= 150, hint: 'Destroy 150 foes',
      text: 'They are not animals. They come out of the rifts in the same order every time, like a sentence being read aloud. Crawler, crawler, leaper. I think the rifts are speaking. I think we are the words.' },
    { id: 'l6', title: 'Medical Officer Sato · Quarantine', when: () => d().codex.elites >= 10, hint: 'Destroy 10 elite foes',
      text: 'Some of them carry pieces of us. The fast ones have Ruiz\'s gait. The one that split in two hummed the song from the galley. I have stopped writing names on the body bags. There are no bodies.' },
    { id: 'l7', title: 'Engineer Ione · The Caches', when: () => sector1Caches() >= 6, hint: 'Open every memory cache in Sector I',
      text: 'I sealed our memories in the walls where the swarm cannot reach. Membranes, shafts, anything only a living suit can pass. If you are reading this, you are living. Or you are very good at pretending.' },
    { id: 'l8', title: 'Navigator Okafor · Second System', when: () => cleared('1-2'), hint: 'Clear the second system',
      text: 'New stars, same hunger. The second system was emptier than the first. Every system we reach is hungrier, like we are walking down a throat. I asked the Captain where it ends. She said: in the middle.' },
    { id: 'l9', title: 'Trial Recording · Wave 5', when: () => (d().trialBest || 0) >= 5, hint: 'Reach wave 5 in a Rift Trial',
      text: 'The arena is not a place. It is the rift testing the suit. Measuring. Every wave it learns a little more about how you move. Do not get predictable. Do not get comfortable.' },
    { id: 'l10', title: 'Trial Recording · Wave 15', when: () => (d().trialBest || 0) >= 15, hint: 'Reach wave 15 in a Rift Trial',
      text: 'Fifteen waves and it began to imitate me. A spaceman in a cloak, standing at the far portal, visor dark. It raised a hand when I did. I did not wave back. I am almost sure I did not wave back.' },
    { id: 'l11', title: 'Captain Arden · Before the Horizon', when: () => d().level >= 15, hint: 'Reach rank 15',
      text: 'You are the last of the crew still wearing yourself. Keep collecting. Every red star you pick up is one of us you are carrying home. We are heavy, I know. Carry us anyway.' },
    { id: 'l12', title: 'The Lantern · Automated Message', when: () => cleared('4-2'), hint: 'Clear the fifth system',
      text: 'MEMORY RESERVE: CRITICAL. CREW REGISTERED: 1. CREW REMEMBERED: 9. Destination unchanged. The void has no edge, Captain. But it has a centre, and we are close enough to hear it breathing.' },
  ];

  GV.BEASTS = {
    crawler: { name: 'Rift Crawler', text: 'Low, fast, and always first through the rift. It follows warmth, then sound, then nothing at all.' },
    leaper: { name: 'Pale Leaper', text: 'It crouches before it jumps, the way a person would. Its eyes are holes. It has learned to wait.' },
    wisp: { name: 'Void Wisp', text: 'A drifting light with a red core. It spits slow orbs of void and keeps its distance, like it is afraid of you.' },
    brute: { name: 'Husk Brute', text: 'A suit that kept walking after its wearer stopped. It slams the ground hard enough to crack stone.' },
    jelly: { name: 'Void Jelly', text: 'It drifts toward warmth and holds its breath. When it lets go, the void lets go with it.' },
    sentry: { name: 'Shielded Sentry', text: 'A crew defence turret, still loyal to a crew that is gone. Its shield faces forward. Go around.' },
    mimic: { name: 'Cache Mimic', text: 'It learned what we treasure. It wears the shape of a memory and waits for someone to reach for it.' },
    brood: { name: 'The Brood Matron', boss: true, text: 'Mother of the crawlers. Charges, leaps, and gives birth mid-fight. Her eggs hum when you get close.' },
    sentinel: { name: 'Wreck Sentinel', boss: true, text: 'A lens in a cage of hull plates. Fires volleys and burning beams, then sinks to the floor with its core exposed.' },
    leviathan: { name: 'Rift Leviathan', boss: true, text: 'Something long lives under the arena floor. The ground warns you, once, before it opens.' },
    choir: { name: 'The Pale Choir', boss: true, text: 'Five heads, one hymn. When the singing stops, so does the light.' },
    warden: { name: 'The Hollow Warden', boss: true, text: 'It still wears the Captain\'s helmet. A red star where a face should be. It never speaks.' },
  };

  GV.codex = {
    kill(type, elite) {
      const c = d().codex;
      c.kills[type] = (c.kills[type] || 0) + 1;
      if (elite) c.elites = (c.elites || 0) + 1;
    },
    // Studying a kind of foe: 25 kills gives +5% damage against it, 100 gives +10%.
    bonus(type) {
      const k = d().codex.kills[type] || 0;
      return k >= 100 ? 0.1 : k >= 25 ? 0.05 : 0;
    },
    // Unlock any logs whose conditions are now met. Returns the newly unlocked ones.
    check() {
      const c = d().codex, got = [];
      for (const l of GV.LOGS) if (!c.logs.includes(l.id) && l.when()) { c.logs.push(l.id); got.push(l); }
      return got;
    },
    unread() { return d().codex.logs.filter((id) => !(d().codex.read || []).includes(id)).length; },
  };
})();
