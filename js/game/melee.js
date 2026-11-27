// Galactic Void — melee gets its due. Three things:
//  · Attunement: Void Strike hits with the element you choose (Star Cores screen).
//  · Cleaving Arc: every melee hit has a chance to leap to one more nearby enemy, in your strike's element.
//  · Close Guard: the melee classes take less damage while an enemy is within reach.
(function () {
  const GV = window.GV, S = GV.Skills;

  GV.ATTUNE = {
    phys: { name: 'Physical', icon: '⚔', color: '#e8e0d0' },
    fire: { name: 'Fire', icon: '🔥', color: '#ff8a4a' },
    cold: { name: 'Cold', icon: '❄', color: '#9fe8ff' },
    light: { name: 'Lightning', icon: 'ϟ', color: '#fff27a' },
    void: { name: 'Void', icon: '◐', color: '#c79bff' },
  };
  GV.strikeAttune = () => { const d = GV.save && GV.save.data; return d && GV.ATTUNE[d.strikeEl] ? d.strikeEl : 'phys'; };

  // ---------- Cleaving Arc ----------
  const ARC_CHANCE = 0.25, ARC_MULT = 0.4, ARC_RANGE = 170;
  const hit0 = S.hitEnemy;
  S.hitEnemy = function (p, e, s, o = {}, ...rest) {
    const r = hit0.call(this, p, e, s, o, ...rest);
    const shooting = s && s.W && (s.W.gun || s.W.gun2) && s.kind === 'melee'; // a gun firing through Void Strike isn't a melee hit
    if (s && s.tags && s.tags.has && s.tags.has('Melee') && !shooting && !o.arced && !o.haunt && Math.random() < ARC_CHANCE) {
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      let best = null, bd = ARC_RANGE * ARC_RANGE;
      for (const o2 of p.enemies) {
        if (o2 === e || o2.dead || (o2.def && o2.def.static) || (o2.alpha != null && o2.alpha < 0.4)) continue;
        const d2 = (o2.x + o2.w / 2 - cx) ** 2 + (o2.y + o2.h / 2 - cy) ** 2;
        if (d2 < bd) { bd = d2; best = o2; }
      }
      if (best) {
        const el = s.attune || 'phys', col = (GV.ATTUNE[el] || GV.ATTUNE.phys).color;
        const bx = best.x + best.w / 2, by = best.y + best.h / 2;
        p.bolts.push({ pts: [{ x: cx, y: cy }, { x: (cx + bx) / 2 + (Math.random() - 0.5) * 30, y: (cy + by) / 2 - 18 }, { x: bx, y: by }], t: 0.18, max: 0.18, color: col });
        hit0.call(this, p, best, s, Object.assign({}, o, { mult: (o.mult || 1) * ARC_MULT, arced: true, kx: Math.sign(bx - cx) * 160, ky: -80 }), ...rest);
      }
    }
    return r;
  };

  // ---------- Close Guard ----------
  GV.MELEE_CLASSES = new Set(['knight', 'paladin', 'monk', 'lancer', 'symbiote', 'engineer']);
  const dtm0 = GV.dmgTakenMul;
  GV.dmgTakenMul = function (p, pl) {
    let k = dtm0(p, pl);
    const d = GV.save && GV.save.data;
    if (d && GV.MELEE_CLASSES.has(d.cls) && p && p.enemies) {
      for (const e of p.enemies) {
        if (e.dead || (e.def && e.def.static)) continue;
        if (Math.abs(e.x + e.w / 2 - pl.cx) < 150 && Math.abs(e.y + e.h / 2 - pl.cy) < 120) { k *= 0.85; break; }
      }
    }
    return k;
  };
})();
