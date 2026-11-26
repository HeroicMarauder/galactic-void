// Galactic Void — in-game HUD: life (crimson) with void ward, charge (ice), rank, memories,
// the four-slot skill bar, boss bar, toasts and dialog. Scales up on small touch screens.
(function () {
  const GV = window.GV, A = GV.art, C = GV.CFG;
  const SLOT_ACT = ['attack', 'skill1', 'skill2', 'skill3'];

  function bar(ctx, x, y, w, h, k, c1, c2, back = 'rgba(0,0,0,0.55)') {
    ctx.fillStyle = back; A.rrect(ctx, x - 2, y - 2, w + 4, h + 4, 4);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    if (k > 0) A.rrect(ctx, x, y, Math.max(2, w * Math.min(1, k)), h, 3);
  }
  function wrap(ctx, text, maxW) {
    const words = text.split(' '), lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  GV.hud = {
    draw(ctx, p) {
      const pl = p.players ? p.players[0] : p.player, d = GV.save.data, pal = p.pal, S = C.HUD, W = C.W / S, H = C.H / S;
      ctx.save();
      ctx.scale(S, S);
      ctx.textBaseline = 'alphabetic';
      if (pl.hp / pl.maxHp < 0.3 && !pl.dead && pl.maxHp > 1) {
        ctx.globalAlpha = 0.35 + Math.sin(p.t * 6) * 0.15;
        A.glow(ctx, 0, H / 2, H * 0.7, A.col(pal.hB, 90, 35, 0.9));
        A.glow(ctx, W, H / 2, H * 0.7, A.col(pal.hB, 90, 35, 0.9));
        ctx.globalAlpha = 1;
      }
      // life + ward / charge / rank
      const x = 18, y = 16;
      bar(ctx, x, y, 230, 13, pl.hp / pl.maxHp, A.col(pal.hB, 90, 38), A.col(pal.hB, 100, 62));
      if (pl.maxWard > 0) {
        ctx.fillStyle = 'rgba(200,240,255,0.85)';
        ctx.fillRect(x, y, 230 * Math.min(1, pl.ward / Math.max(pl.maxWard, pl.maxHp)), 4);
      }
      bar(ctx, x, y + 21, 180, 7, pl.charge / pl.maxCharge, A.col(pal.hA, 80, 45), A.col(pal.hA, 100, 78));
      if (pl.maxChargeEff < pl.maxCharge) { ctx.fillStyle = 'rgba(255,120,60,0.5)'; ctx.fillRect(x + 180 * (pl.maxChargeEff / pl.maxCharge), y + 21, 180 * (1 - pl.maxChargeEff / pl.maxCharge), 7); }
      bar(ctx, x, y + 34, 180, 3, d.xp / GV.progress.xpNeed(d.level), '#888', '#fff', 'rgba(0,0,0,0.4)');
      ctx.font = `700 11px ${C.FONT}`; ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.fillText(`${Math.ceil(pl.hp)} / ${pl.maxHp}${pl.maxWard ? `  ·  ward ${Math.ceil(pl.ward)}` : ''}`, x + 6, y + 10.5);
      ctx.fillStyle = 'rgba(220,235,255,0.85)'; ctx.fillText(`RANK ${d.level}`, x + 190, y + 29);
      let ax = x;
      for (const k of Object.keys(GV.ABILITIES)) {
        if (k === 'hook' && !d.abilities.hook) continue;
        const ab = GV.ABILITIES[k];
        ctx.globalAlpha = d.abilities[k] ? 1 : 0.22;
        ctx.fillStyle = ab.color; ctx.font = `700 13px ${C.FONT}`;
        ctx.fillText(ab.glyph, ax, y + 56);
        ax += 20;
      }
      ctx.globalAlpha = 1;
      // flasks
      pl.flasks.forEach((f, i) => {
        const fx = x + i * 40, fy = y + 82, c = i ? '#8fe9ff' : '#ff4f62';
        ctx.fillStyle = 'rgba(5,6,12,0.65)'; A.rrect(ctx, fx, fy, 32, 34, 7);
        ctx.fillStyle = c; ctx.globalAlpha = f.t > 0 ? 1 : 0.85;
        const k = Math.min(1, f.n / f.max);
        ctx.fillRect(fx + 9, fy + 9 + 18 * (1 - k), 14, 18 * k);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(220,235,255,0.6)'; ctx.lineWidth = 1.2; ctx.strokeRect(fx + 9.5, fy + 8.5, 13, 19);
        ctx.fillStyle = '#fff'; ctx.font = `700 9px ${C.FONT}`; ctx.textAlign = 'center';
        ctx.fillText(Math.floor(f.n), fx + 16, fy + 6.5);
        if (!GV.input.isTouch) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText(GV.input.label(i ? 'flask2' : 'flask1'), fx + 16, fy + 33); }
        ctx.textAlign = 'left';
      });
      const pts = GV.TREE.points();
      if (pts > 0) {
        ctx.font = `700 11px ${C.FONT}`;
        ctx.fillStyle = `rgba(255,211,107,${0.7 + Math.sin(p.t * 4) * 0.3})`;
        ctx.fillText(`+${pts} PASSIVE ${pts > 1 ? 'POINTS' : 'POINT'}${GV.input.isTouch ? '' : ' · ' + GV.input.label('tree')}`, ax + 6, y + 55);
      }
      if (GV.asc.unlocked() && (!GV.asc.current() || GV.asc.points() > 0)) {
        ctx.font = `700 11px ${C.FONT}`; ctx.fillStyle = `rgba(255,154,74,${0.7 + Math.sin(p.t * 4) * 0.3})`;
        ctx.fillText(GV.asc.current() ? `+${GV.asc.points()} ASCENDANCY${GV.input.isTouch ? '' : ' · ' + GV.input.label('ascend')}` : `ASCEND${GV.input.isTouch ? '' : ' · ' + GV.input.label('ascend')}`, ax + 6 + (pts > 0 ? 190 : 0), y + 55);
      }
      // buffs
      const bufs = [];
      if (pl.stealth > 0) bufs.push(['STEALTH', '#7dffcf']);
      if (pl.buffs.howl > 0) bufs.push(['HOWL', '#ff8a98']);
      if (pl.overT > 0) bufs.push(['OVERCHARGE', '#fff27a']);
      if (pl.herald) bufs.push(['HERALD', '#ff7a4a']);
      if (pl.orbit) bufs.push(['WARD', '#ff6a7a']);
      ctx.font = `700 10px ${C.FONT}`;
      bufs.forEach(([n, c], i) => { ctx.fillStyle = c; ctx.fillText(n, x + 90 + i * 72, y + 104); });

      // memories + stage
      ctx.textAlign = 'right';
      A.memory(ctx, W - 24, 28, p.t, pal, false);
      ctx.font = `700 18px ${C.FONT}`; ctx.fillStyle = '#fff';
      ctx.fillText(d.memories, W - 40, 34);
      ctx.font = `600 11px ${C.FONT}`; ctx.fillStyle = 'rgba(220,230,255,0.6)';
      if (p.trial) {
        const T = p.trial;
        ctx.fillText(`RIFT TRIAL · ${p.sys.name.toUpperCase()}`, W - 20, 54);
        ctx.font = `700 15px ${C.FONT}`; ctx.fillStyle = pal.glow;
        ctx.fillText(T.restT > 0 && T.wave === 0 ? 'GET READY' : `WAVE ${T.wave}  ·  ${T.left + p.enemies.length} LEFT`, W - 20, 74);
        ctx.font = `600 10px ${C.FONT}`; ctx.fillStyle = 'rgba(220,230,255,0.5)';
        ctx.fillText(`BEST ${GV.save.data.trialBest || 0}`, W - 20, 88);
      } else {
        ctx.fillText(`${p.sys.name.toUpperCase()} · ${p.sd.name.toUpperCase()}`, W - 20, 54);
        const prog = Math.max(0, Math.min(1, p.player.cx / p.arena.x));
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(W - 180, 62, 160, 3);
        ctx.fillStyle = pal.glow; ctx.fillRect(W - 180, 62, 160 * prog, 3);
        ctx.fillStyle = pal.accent; ctx.fillRect(W - 22, 59, 3, 9);
      }

      // skill bar (keyboard players; touch players see icons on their buttons)
      if (!GV.input.isTouch) {
        for (let i = 0; i < 4; i++) {
          const s = pl.skills[i], sx = 18 + i * 56, sy = H - 60;
          ctx.fillStyle = 'rgba(5,6,12,0.7)'; A.rrect(ctx, sx, sy, 50, 46, 8);
          ctx.strokeStyle = s ? s.color : 'rgba(160,190,230,0.2)'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, 49, 45); ctx.globalAlpha = 1;
          ctx.textAlign = 'center';
          if (s) {
            const afford = pl.st.ks.bloodrite ? pl.hp > s.cost : pl.charge >= s.cost;
            const ready = pl.cd[i] <= 0 && afford;
            ctx.globalAlpha = ready || s.kind === 'herald' ? 1 : 0.4;
            ctx.fillStyle = s.color; ctx.font = `700 20px ${C.FONT}`; ctx.fillText(s.icon, sx + 25, sy + 26);
            ctx.globalAlpha = 1;
            if (s.kind === 'herald' && pl.herald) { ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.strokeRect(sx + 2, sy + 2, 46, 42); }
            if (pl.cd[i] > 0 && s.cd) { const k = Math.min(1, pl.cd[i] / s.cd); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx, sy + 46 * (1 - k), 50, 46 * k); }
            if (!afford && s.kind !== 'herald') { ctx.fillStyle = 'rgba(80,140,255,0.25)'; ctx.fillRect(sx, sy, 50, 46); }
            ctx.font = `600 8px ${C.FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText('L' + s.L, sx + 41, sy + 11);
          }
          ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = `700 9px ${C.FONT}`; ctx.fillText(GV.input.label(SLOT_ACT[i]), sx + 25, sy + 41);
        }
        ctx.textAlign = 'left'; ctx.font = `600 10px ${C.FONT}`; ctx.fillStyle = 'rgba(220,230,255,0.45)';
        const L = GV.input.label;
        ctx.fillText(`MOUSE aims · ${L('dash')} dash · ${L('flask1')}/${L('flask2')} flasks · ${L('interact')} talk · ${L('gems')} cores · ${L('gear')} gear · ${L('tree')} tree · ${L('pause')} pause`, 250, H - 20);
      }

      // boss bar
      if (p.boss) {
        const b = p.boss, bw = Math.min(520, W - 340), bx = (W - bw) / 2, by = 84;
        ctx.textAlign = 'center'; ctx.font = `700 14px ${C.FONT}`; ctx.fillStyle = '#fff';
        ctx.fillText(p.sd.bossName.toUpperCase(), W / 2, by - 8);
        bar(ctx, bx, by, bw, 10, b.hp / b.maxHp, A.col(pal.hB, 90, 30), A.col(pal.hB, 100, 60));
        const st = [];
        if (b.ign) st.push(['IGNITED', '#ffb36a']); if (b.chill > 0) st.push(['CHILLED', '#9fe8ff']); if (b.shk > 0) st.push(['SHOCKED', '#fff27a']);
        if (b.cor && b.cor.length) st.push([`CORRUPT ×${b.cor.length}`, '#d6a8ff']); if (b.hp < b.maxHp * 0.5) st.push(['ENRAGED', pal.accent]);
        ctx.font = `600 10px ${C.FONT}`;
        st.forEach(([n, c], i) => { ctx.fillStyle = c; ctx.fillText(n, W / 2 + (i - (st.length - 1) / 2) * 80, by + 26); });
      }

      // boss intro card: letterbox bars, the name sliding in, the epithet beneath
      if (p.bossCard) {
        const bc = p.bossCard, k = Math.min(1, bc.t / 0.35, (bc.max - bc.t) / 0.4);
        const bh = 46 * Math.max(0, k);
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
        ctx.globalAlpha = Math.max(0, k); ctx.textAlign = 'center';
        const slide = (1 - Math.min(1, bc.t / 0.5)) * 60;
        ctx.font = `800 40px ${C.FONT}`; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(bc.name.toUpperCase(), W / 2 + 2 - slide, H * 0.42 + 2);
        ctx.fillStyle = '#ffffff'; ctx.fillText(bc.name.toUpperCase(), W / 2 - slide, H * 0.42);
        ctx.fillStyle = pal.accent; ctx.fillRect(W / 2 - 120 + slide, H * 0.42 + 12, 240 * Math.min(1, bc.t / 0.6), 2);
        if (bc.sub) { ctx.font = `italic 500 16px ${C.FONT}`; ctx.fillStyle = pal.glow; ctx.fillText(bc.sub, W / 2 + slide, H * 0.42 + 38); }
        ctx.globalAlpha = 1;
      }
      // boss barks
      if (p.bark) {
        const k = Math.min(1, p.bark.t / 0.3, (3.2 - p.bark.t) / 0.4);
        ctx.globalAlpha = Math.max(0, k); ctx.textAlign = 'center'; ctx.font = `italic 500 15px ${C.FONT}`;
        const w = ctx.measureText(p.bark.text).width + 34;
        ctx.fillStyle = 'rgba(5,6,12,0.7)'; A.rrect(ctx, W / 2 - w / 2, 118, w, 28, 8);
        ctx.fillStyle = '#e6dcff'; ctx.fillText(p.bark.text, W / 2, 137);
        ctx.globalAlpha = 1;
      }

      if (p.coop) p.drawCoopHud(ctx, W, H);
      if (p.drawMinimap) p.drawMinimap(ctx, W, H);

      // toasts
      let ty = 170;
      for (const t of p.toasts) {
        const a = Math.min(1, t.t / 0.4, (t.max - t.t) / 0.25 + 0.01);
        ctx.globalAlpha = Math.max(0, a); ctx.textAlign = 'center';
        if (t.kind === 'big') {
          ctx.font = `700 34px ${C.FONT}`; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(t.msg.toUpperCase(), W / 2 + 2, ty + 2);
          if (t.anom) { const j = Math.sin(p.t * 40) > 0.6 ? 4 : 2; ctx.fillStyle = '#ff4fd8'; ctx.fillText(t.msg.toUpperCase(), W / 2 - j, ty); ctx.fillStyle = '#4ff3ff'; ctx.fillText(t.msg.toUpperCase(), W / 2 + j, ty); }
          ctx.fillStyle = '#fff'; ctx.fillText(t.msg.toUpperCase(), W / 2, ty);
          if (t.sub) { ctx.font = `600 13px ${C.FONT}`; ctx.fillStyle = pal.glow; ctx.fillText(t.sub.toUpperCase(), W / 2, ty + 24); }
          ty += 60;
        } else {
          ctx.font = `600 15px ${C.FONT}`;
          const w = ctx.measureText(t.msg).width + 30;
          ctx.fillStyle = 'rgba(5,6,12,0.75)'; A.rrect(ctx, W / 2 - w / 2, ty - 18, w, 28, 8);
          ctx.fillStyle = t.color || '#e8f4ff'; ctx.fillText(t.msg, W / 2, ty + 1);
          ty += 36;
        }
        if (ty > H * 0.6) break;
      }
      ctx.globalAlpha = 1;

      // dialog
      if (p.dialog) {
        const dl = p.dialog, bw = Math.min(760, W - 40), bh = 112, bx = (W - bw) / 2, by = H - bh - 24;
        ctx.fillStyle = 'rgba(4,5,10,0.9)'; A.rrect(ctx, bx, by, bw, bh, 10);
        ctx.strokeStyle = dl.color; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1); ctx.globalAlpha = 1;
        ctx.textAlign = 'left'; ctx.font = `700 13px ${C.FONT}`; ctx.fillStyle = dl.color;
        ctx.fillText(dl.name, bx + 22, by + 26);
        ctx.font = `500 17px ${C.FONT}`; ctx.fillStyle = '#eef4ff';
        wrap(ctx, dl.lines[dl.i] || '', bw - 44).slice(0, 3).forEach((ln, i) => ctx.fillText(ln, bx + 22, by + 52 + i * 22));
        ctx.textAlign = 'right'; ctx.font = `600 11px ${C.FONT}`; ctx.fillStyle = 'rgba(220,230,255,0.55)';
        ctx.fillText(`${dl.i + 1}/${dl.lines.length}  ·  ${GV.input.isTouch ? 'TAP' : `${GV.input.label('interact')} / ${GV.input.label('jump')}`} ▶`, bx + bw - 18, by + bh - 12);
      }
      ctx.restore();
    },
  };
})();
