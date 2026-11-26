// Galactic Void — ranking up. Ranks come slower now, so each one says what it gave you: a passive
// point (two at every tenth rank), more Life and damage, and at every fifth rank a milestone cache.
// Reaching the Ascendancy is announced here too.
(function () {
  const GV = window.GV;
  let el = null, hideT = 0;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Called once per rank-up (possibly several ranks at once). Grants milestone rewards and shows the card.
  GV.rankUp = function (p, from, to) {
    const d = GV.save.data, gains = [];
    let pts = 0, bonus = 0;
    for (let L = from + 1; L <= to; L++) { pts++; if (L % 10 === 0) bonus++; }
    const T = GV.TREE;
    if (T.total() > T.spent()) gains.push(`<b>+${pts + bonus}</b> passive point${pts + bonus > 1 ? 's' : ''}${bonus ? ' <em>(milestone bonus)</em>' : ''}`);
    gains.push(`<b>+${10 * (to - from)}</b> Life · <b>+${3 * (to - from)}%</b> damage`);
    for (let L = from + 1; L <= to; L++) {
      if (L % 5 !== 0) continue;
      const tier = Math.min(3, GV.progress.dropTier(p ? p.diff : 1)), kind = (L / 5) % 2 ? 'skill' : 'support', mem = 25 * L;
      d.uncut.push({ kind, tier }); (GV.save.main || d).memories += mem;
      gains.push(`<b>Rank ${L} cache</b>: a Tier ${tier} blank ${kind === 'skill' ? 'Star Core' : 'Augment'} and <b>${mem}</b> ✦`);
    }
    if (GV.asc && GV.asc.REQ_RANK > from && GV.asc.REQ_RANK <= to && GV.asc.reqMet() && !GV.asc.current()) gains.push('<b class="asc">✦ The Ascendancy is open</b>: visit the altar on the Lantern');
    else if (GV.asc && GV.asc.REQ_RANK > from && GV.asc.REQ_RANK <= to && !GV.asc.current()) gains.push(`<em>Rank ${GV.asc.REQ_RANK} reached. ${esc(GV.asc.reqText())}</em>`);
    GV.save.write();
    show(to, gains);
  };
  function show(rank, gains) {
    if (el) el.remove();
    el = document.createElement('div'); el.id = 'rankCard';
    el.innerHTML = `<div class="rkL"><span>RANK</span><b>${rank}</b></div><ul>${gains.map((g) => `<li>${g}</li>`).join('')}</ul>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el && el.classList.add('on'));
    clearTimeout(hideT);
    const me = el; hideT = setTimeout(() => { me.classList.remove('on'); setTimeout(() => me.remove(), 500); if (el === me) el = null; }, 4200 + 500 * gains.length);
  }
})();
