// Galactic Void — Metroid-style routes and secrets.
//  · Grapple Line (earned in the second system): in the air, interact near a gold anchor ring to
//    zip to it and hang; a Tether Hook that strikes a ring does the same. Hook vaults (sky-islands
//    with a cache) appear from the start, so early stages are worth revisiting.
//  · Star Shards: one hidden in every stage (behind cracked walls, on sky-islands, on the highest
//    ledges). Each carries a line of lore; every three make you permanently stronger.
(function () {
  const GV = window.GV, U = GV.util, A = GV.art, P = GV.Play.prototype;
  const d = () => GV.save.data;
  const shardsOf = () => { const x = d(); x.shards = x.shards || {}; return x.shards; };
  GV.shards = {
    count: () => Object.keys(shardsOf()).length,
    inSystem: (s) => Object.keys(shardsOf()).filter((k) => k.startsWith(s + '-')).length,
    bonus: () => Math.floor(Object.keys(shardsOf()).length / 3) * 3,
  };
  const SHARD_LORE = [
    'A voice, recorded over itself: "Keep the lantern lit. Keep the lantern lit."',
    'Scratched into the shard: a map of a sky with one star missing.',
    'It is warm, like something was holding it a moment ago.',
    'The shard hums one note. Ione hummed that note.',
    'Inside the crystal, a tiny figure in a cloak is walking toward a black hole.',
    'A child\'s handwriting: "Mum says the stars are just far away. They\'re not."',
    'It reflects a face that is not yours. It is smiling.',
    'Etched: "The Titans were here first. We are the trespassers."',
    'When you hold it to the dark, the dark leans closer.',
    'A fleet\'s last order, burned into glass: "Hold the line. There is no line."',
    'Light pours out of it for a moment, as if a door opened somewhere.',
    'The silence between the stars has a shape. This is a piece of it.',
  ];
  // permanent bonus: +3% life and +3% damage for every three shards
  GV.shardStats = () => { const b = GV.shards.bonus(); return b ? { lifePct: b, dmg: b } : {}; };

  // ---------------- setup per stage ----------------
  function init(p) {
    p.gatesInit = true;
    const L = p.L;
    L.anchors = L.anchors || [];
    if (p.trial || p.titan || p.range || L.trial || L.sysIdx == null || !L.solids) return;
    // one shard per stage: in a secret room if there is one, else on a sky-island, else up high
    const key = `${L.sysIdx}-${L.stIdx}`;
    let spot = null;
    const chest = (L.chests || []).find((c) => c.secret || c.hidden) || (L.chests || [])[0];
    const hv = (L.vaults || []).find((v) => v.type === 'hook');
    if (chest) spot = { x: chest.x + 50, y: chest.y - 40 };
    else if (hv) spot = { x: hv.x - 50, y: hv.y - 10 };
    else {
      const end = L.arena ? L.arena.x - 400 : 99999;
      const hi = (L.oneways || []).filter((o) => o.x > 600 && o.x < end && !o.crumble).sort((a, b) => a.y - b.y)[0];
      if (hi) spot = { x: hi.x + hi.w / 2, y: hi.y - 70 };
    }
    if (spot) L.shard = { key, x: spot.x, y: spot.y, got: !!shardsOf()[key], lore: SHARD_LORE[U.hash(key) % SHARD_LORE.length] };
  }

  function grapple(pl, a, p) {
    const tx = a.x - pl.w / 2, ty = a.y + 8, dx = tx - pl.x, dy = ty - pl.y, dd = Math.hypot(dx, dy);
    const T = Math.max(0.12, Math.min(0.42, dd / 1300)), dir = dx >= 0 ? 1 : -1;
    pl.charging = { t: T, sp: Math.abs(dx) / T, dir, vy: dy / T, s: null, set: { has: () => true, add() {} }, o: {}, color: '#ffd36b', trailT: 1e9, zip: true };
    pl.hangAt = a; pl.inv = Math.max(pl.inv, T);
    p.burst(a.x, a.y, 10, '#ffd36b', 160, 0.3, 2);
    GV.audio.play ? GV.audio.play('dash2') : p.sfx('dash');
  }

  const up0 = P.update;
  P.update = function (dt) {
    up0.call(this, dt);
    if (!this.gatesInit) init(this);
    const L = this.L, has = d().abilities && d().abilities.hook;
    for (const pl of this.players) {
      if (pl.dead) continue;
      // hanging under a ring after the zip: hold still until you jump or let go
      if (pl.hangAt && !pl.charging) {
        pl.hangT = pl.hangT == null ? 1.2 : pl.hangT - dt;
        pl.x = pl.hangAt.x - pl.w / 2; pl.y = pl.hangAt.y + 8; pl.vx = 0; pl.vy = 0;
        pl.jumps = pl.st.airJumps; pl.airDash = true;
        if (pl.inp.pressed('jump')) { pl.vy = -GV.CFG.DJUMP * 1.05; pl.hangAt = null; pl.hangT = null; }
        else if (pl.hangT <= 0 || pl.inp.pressed('down')) { pl.hangAt = null; pl.hangT = null; }
      }
      // aim a grapple: the nearest ring in reach, shown with a prompt
      pl.ring = null;
      if (has && L.anchors && L.anchors.length && !pl.onGround && !pl.charging && !pl.hangAt) {
        let best = null, bd = 290;
        for (const a of L.anchors) { const dd = Math.hypot(a.x - pl.cx, a.y - pl.cy); if (dd < bd && a.y < pl.y + pl.h) { bd = dd; best = a; } }
        pl.ring = best;
        if (best && (pl.inp.pressed('interact') || (pl.inp.pressed('jump') && pl.jumps <= 0))) grapple(pl, best, this);
      }
    }
    // a Tether Hook that strikes a ring pulls you to it, even without the Grapple Line
    if (this.sx2 && L.anchors) for (const h of this.sx2.hooks) {
      if (h.back || h.done) continue;
      const a = L.anchors.find((q) => Math.hypot(q.x - h.x, q.y - h.y) < 26);
      if (a) { h.back = true; grapple(h.pl, a, this); }
    }
    // shard pickup
    const S = L.shard;
    if (S && !S.got) for (const pl of this.players) if (!pl.dead && Math.hypot(pl.cx - S.x, pl.cy - S.y) < 34) {
      S.got = true; shardsOf()[S.key] = 1;
      const n = GV.shards.count(), mem = 60 * (L.sysIdx + 1);
      this.gainMem(mem);
      this.toast('STAR SHARD', 3.2); this.toasts[this.toasts.length - 1].sub = S.lore;
      if (n % 3 === 0) { this.text(pl.cx, pl.y - 40, `+3% LIFE & DAMAGE (${n} SHARDS)`, '#c9e6ff', 15); pl.recalc && pl.recalc(); }
      this.burst(S.x, S.y, 40, '#c9e6ff', 300, 0.8, 3); this.hitStop && this.hitStop(0.08);
      GV.audio.play ? GV.audio.play('chime') : this.sfx('level');
      GV.save.write();
      break;
    }
  };

  const df0 = P.drawFeatures;
  P.drawFeatures = function (ctx, vis) {
    df0.call(this, ctx, vis);
    const L = this.L, t = this.t, has = d().abilities && d().abilities.hook;
    for (const a of L.anchors || []) {
      if (!vis({ x: a.x - 30, y: a.y - 30, w: 60, h: 60 })) continue;
      const lit = this.players.some((pl) => pl.ring === a);
      A.glow(ctx, a.x, a.y, lit ? 34 : 22, lit ? 'rgba(255,211,107,0.6)' : 'rgba(255,211,107,0.25)');
      ctx.strokeStyle = has ? '#ffd36b' : 'rgba(255,211,107,0.45)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(a.x, a.y, 11 + (lit ? Math.sin(t * 10) * 1.5 : 0), 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,211,107,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y - 11); ctx.lineTo(a.x, a.y - 60); ctx.stroke();
      if (lit && !GV.input.isTouch) { ctx.font = `800 11px ${GV.CFG.FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd36b'; ctx.fillText(GV.input.label('interact'), a.x, a.y - 20); }
    }
    for (const pl of this.players) if (pl.hangAt || (pl.charging && pl.charging.zip && pl.charging.color === '#ffd36b')) {
      const a = pl.hangAt; if (!a) continue;
      ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 1.6; A.line(ctx, pl.cx, pl.y + 10, a.x, a.y);
    }
    const S = L.shard;
    if (S && !S.got && vis({ x: S.x - 40, y: S.y - 40, w: 80, h: 80 })) {
      const near = this.players.some((pl) => Math.hypot(pl.cx - S.x, pl.cy - S.y) < 320), y = S.y + Math.sin(t * 2) * 4;
      // far away it's just a twinkle you might miss; close up it shows itself
      A.glow(ctx, S.x, y, near ? 30 : 12 + Math.sin(t * 3) * 4, near ? 'rgba(200,230,255,0.6)' : 'rgba(200,230,255,0.3)');
      if (near) { ctx.save(); ctx.translate(S.x, y); ctx.rotate(t * 1.2); ctx.fillStyle = '#e8f6ff'; A.star(ctx, 0, 0, 9, 4, 0); ctx.restore(); }
    }
  };
})();
