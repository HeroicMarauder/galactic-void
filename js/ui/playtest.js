// Galactic Void — the hidden playtest panel. Turn it on with Ctrl+Shift+P (or F8), or tap the
// Settings title five times on a phone. While on, every stage is logged: damage by skill, casts,
// damage taken and from what, deaths, time. A live meter shows in play; the pause menu gets a
// "Playtest log" screen with the history, per-class averages, export, and a training range.
(function () {
  const GV = window.GV, P = GV.Play.prototype, S = GV.Skills, M = GV.menus, esc = M.esc;
  const KEY = 'gv_playtest_log', ON = 'gv_playtest';
  let enabled = false, log = [];
  try { enabled = localStorage.getItem(ON) === '1' || /[?&]playtest/.test(location.search); log = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
  const saveLog = () => { try { localStorage.setItem(KEY, JSON.stringify(log.slice(-60))); } catch (e) {} };
  const PT = (GV.playtest = {
    get on() { return enabled; },
    toggle(v) {
      enabled = v == null ? !enabled : !!v;
      try { localStorage.setItem(ON, enabled ? '1' : '0'); } catch (e) {}
      const p = GV.game && GV.game.play; if (p) p.text(p.player.cx, p.player.y - 30, enabled ? 'PLAYTEST ON' : 'PLAYTEST OFF', '#ffd36b', 15);
      overlay();
    },
    log: () => log,
  });

  // ---------------- collection ----------------
  let src = null; // which skill is dealing damage right now
  const nameOf = (id) => (GV.GEMS[id] && GV.GEMS[id].name) || id;
  function run(p) {
    if (!enabled || !p) return null;
    if (!p.pt) {
      const pl = p.player, d = GV.save.data;
      p.pt = { cls: d.cls, rank: d.level, stage: p.sys ? `${p.sys.name} · ${(p.sd && p.sd.name) || 'stage ' + ((p.stIdx || 0) + 1)}` : 'stage', mode: p.depth ? 'depths ' + p.depth.n : p.mode || 'stage', diff: p.diff, ng: d.ng || 0,
        bar: pl.skills.map((s) => s && s.id), t: 0, dmg: {}, casts: {}, taken: 0, hitsTaken: 0, big: 0, from: {}, deaths: [], kills: 0, flasks: 0, lowCharge: 0, recent: [], weapon: pl.weapon && pl.weapon.name };
    }
    return p.pt;
  }
  const hit0 = S.hitEnemy;
  S.hitEnemy = function (p, e, s, o) { const old = src; src = s && s.id ? s.id : src; try { return hit0.apply(this, arguments); } finally { src = old; } };
  const use0 = S.use;
  S.use = function (p, pl, s, slot, opts) {
    const R = run(p); if (R && pl === p.player && s) R.casts[s.id] = (R.casts[s.id] || 0) + (opts && opts.echoed ? 0 : 1);
    const old = src; src = s && s.id; try { return use0.apply(this, arguments); } finally { src = old; }
  };
  const de0 = P.damageEnemy;
  P.damageEnemy = function (e, amt) {
    const before = e.hp;
    const r = de0.apply(this, arguments);
    const R = run(this);
    if (R && !e.rangeDummy) {
      const dealt = Math.max(0, before - Math.max(0, e.hp));
      const k = src || (e.ignite || e.corrupt || e.bleed ? 'ailments' : 'other');
      const D = (R.dmg[k] = R.dmg[k] || { dmg: 0, hits: 0, crits: 0 });
      D.dmg += dealt; D.hits++; if (arguments[4]) D.crits++;
      R.recent.push([R.t, dealt]);
    } else if (R && e.rangeDummy) {
      const dealt = Math.max(0, before - e.hp), k = src || 'other';
      const D = (R.dmg[k] = R.dmg[k] || { dmg: 0, hits: 0, crits: 0 });
      D.dmg += dealt; D.hits++; if (arguments[4]) D.crits++; R.recent.push([R.t, dealt]);
      e.hp = e.maxHp;
    }
    return r;
  };
  const dp0 = P.damagePlayer;
  P.damagePlayer = function (dmg, fromX) {
    const pl = this.player, hp0 = pl.hp, w0 = pl.ward;
    const r = dp0.apply(this, arguments);
    const R = run(this);
    if (R && pl === this.players[0]) {
      const lost = Math.max(0, hp0 - pl.hp) + Math.max(0, (w0 || 0) - (pl.ward || 0));
      if (lost > 0) {
        let who = 'hazard', bd = 160;
        for (const e of this.enemies) { if (e.dead || (e.def && e.def.static)) continue; const d = Math.abs(e.x + e.w / 2 - fromX); if (d < bd) { bd = d; who = (e.def && e.def.name) || 'enemy'; } }
        if (this.boss && !this.boss.dead && Math.abs(this.boss.x + this.boss.w / 2 - fromX) < 400) who = this.boss.def.name || 'boss';
        R.taken += lost; R.hitsTaken++; R.big = Math.max(R.big, lost); R.from[who] = (R.from[who] || 0) + lost;
        R.lastHit = { who, dmg: Math.round(lost) };
        if (pl.dead) R.deaths.push({ t: Math.round(R.t), who, dmg: Math.round(lost), hpMax: Math.round(pl.maxHp) });
      }
    }
    return r;
  };
  const kill0 = P.killEnemy;
  P.killEnemy = function (e) { const R = run(this); if (R && !e.dead && !(e.def && e.def.static)) R.kills++; return kill0.apply(this, arguments); };
  const up0 = P.update;
  P.update = function (dt) {
    const R = run(this);
    if (R) {
      R.t += dt;
      const pl = this.player;
      if (pl.inp.pressed('flask1') || pl.inp.pressed('flask2')) R.flasks++;
      while (R.recent.length && R.recent[0][0] < R.t - 5) R.recent.shift();
    }
    up0.call(this, dt);
    if (this.range) for (const e of this.range) { e.x = e.x0; e.y = e.y0; e.vx = e.vy = 0; e.dead = false; e.hp = e.maxHp; }
    if (R && this.state === 'dead' && !R.done) end(this, 'death');
    if (enabled && Math.floor(R ? R.t * 4 : 0) !== this._ptTick) { this._ptTick = Math.floor(R ? R.t * 4 : 0); draw(this); }
  };
  const fin0 = P.finish;
  P.finish = function () { const r = fin0.apply(this, arguments); if (this.pt && !this.pt.done) end(this, 'clear'); return r; };
  function end(p, result) {
    const R = p.pt; if (!R || R.done || p.range) return;
    R.done = true;
    const total = Object.values(R.dmg).reduce((a, d) => a + d.dmg, 0);
    log.push({ when: new Date().toISOString(), result, cls: R.cls, rank: R.rank, stage: R.stage, mode: R.mode, diff: R.diff, ng: R.ng, weapon: R.weapon, bar: R.bar,
      secs: Math.round(R.t), kills: R.kills, dps: Math.round(total / Math.max(1, R.t)), dmg: Math.round(total), taken: Math.round(R.taken), dtps: Math.round(R.taken / Math.max(1, R.t)), biggestHit: Math.round(R.big), flasks: R.flasks,
      deaths: R.deaths, bySkill: Object.fromEntries(Object.entries(R.dmg).map(([k, d]) => [k, { dmg: Math.round(d.dmg), hits: d.hits, crits: d.crits, casts: R.casts[k] || 0 }])),
      takenFrom: Object.fromEntries(Object.entries(R.from).map(([k, v]) => [k, Math.round(v)])) });
    saveLog();
  }
  addEventListener('beforeunload', () => { const p = GV.game && GV.game.play; if (p && p.pt && !p.pt.done) end(p, 'quit'); });

  // ---------------- live meter ----------------
  let box = null;
  function overlay() {
    const show = enabled && GV.game && GV.game.scene === 'play';
    if (show && !box) { box = document.createElement('div'); box.id = 'ptMeter'; document.body.appendChild(box); }
    if (box) box.style.display = show ? '' : 'none';
  }
  function draw(p) {
    overlay(); if (!box || !p.pt) return;
    const R = p.pt, total = Object.values(R.dmg).reduce((a, d) => a + d.dmg, 0);
    const dps5 = R.recent.reduce((a, r) => a + r[1], 0) / Math.min(5, Math.max(1, R.t));
    const rows = Object.entries(R.dmg).sort((a, b) => b[1].dmg - a[1].dmg).slice(0, 6).map(([k, d]) => `<tr><td>${esc(nameOf(k))}</td><td>${Math.round((d.dmg / Math.max(1, total)) * 100)}%</td><td>${Math.round(d.dmg / Math.max(1, R.t))}</td><td>${R.casts[k] || '–'}</td></tr>`).join('');
    const from = Object.entries(R.from).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${esc(k)} ${Math.round(v)}`).join(' · ');
    box.innerHTML = `<b>PLAYTEST</b> <span>${Math.floor(R.t / 60)}:${String(Math.floor(R.t % 60)).padStart(2, '0')}${p.range ? ' · training range' : ''}</span>
      <div class="big"><i>${Math.round(dps5)}</i> dps (5s) · ${Math.round(total / Math.max(1, R.t))} avg</div>
      <table><tr><th>Source</th><th>%</th><th>dps</th><th>casts</th></tr>${rows || '<tr><td colspan=4>Hit something.</td></tr>'}</table>
      <div class="tk">Taken ${Math.round(R.taken)} (${Math.round(R.taken / Math.max(1, R.t))}/s) · biggest ${Math.round(R.big)}${from ? '<br>' + from : ''}</div>
      <div class="tk">Kills ${R.kills} · deaths ${R.deaths.length} · flasks ${R.flasks}</div>`;
  }
  addEventListener('keydown', (e) => {
    if ((e.code === 'KeyP' && e.ctrlKey && e.shiftKey) || e.code === 'F8') { e.preventDefault(); e.stopImmediatePropagation(); PT.toggle(); }
  }, true);
  setInterval(overlay, 500);

  // ---------------- log screen ----------------
  M.playtestLog = function (back) {
    const by = {};
    for (const r of log) { const b = (by[r.cls] = by[r.cls] || { n: 0, dps: 0, dtps: 0, deaths: 0, secs: 0, clears: 0 }); b.n++; b.dps += r.dps; b.dtps += r.dtps; b.deaths += r.deaths.length; b.secs += r.secs; if (r.result === 'clear') b.clears++; }
    const cls = Object.keys(by).map((k) => { const b = by[k]; return `<tr><td>${esc((GV.CLASSES[k] || {}).name || k)}</td><td>${b.n}</td><td>${Math.round(b.dps / b.n)}</td><td>${Math.round(b.dtps / b.n)}</td><td>${b.deaths}</td><td>${Math.round(b.secs / b.n)}s</td><td>${b.clears}/${b.n}</td></tr>`; }).join('');
    const runs = log.slice(-25).reverse().map((r) => {
      const top = Object.entries(r.bySkill).sort((a, b) => b[1].dmg - a[1].dmg).slice(0, 3).map(([k, d]) => `${esc(nameOf(k))} ${Math.round((d.dmg / Math.max(1, r.dmg)) * 100)}%`).join(', ');
      return `<tr class="${r.result}"><td>${esc((GV.CLASSES[r.cls] || {}).name || r.cls)} R${r.rank}</td><td>${esc(r.stage)}<br><small>${esc(r.mode)} · diff ${r.diff}${r.ng ? ' · NG+' + r.ng : ''}</small></td><td>${r.result}</td><td>${r.secs}s</td><td>${r.dps}</td><td>${r.dtps}</td><td>${r.kills}</td><td>${r.deaths.length ? r.deaths.map((d) => `${esc(d.who)} (${d.dmg})`).join(', ') : '—'}</td><td><small>${top}</small></td></tr>`;
    }).join('');
    M.render(`<div class="screen panel wide ptlog"><h2>Playtest log</h2>
      <p class="muted">${enabled ? 'Logging is on.' : 'Logging is off.'} Ctrl+Shift+P or F8 toggles it (on a phone, tap the Settings title five times). DPS counts real damage dealt, so overkill on the last hit isn't counted.</p>
      <div class="gsub">By class</div><div class="pttable"><table><tr><th>Class</th><th>Runs</th><th>Avg dps</th><th>Taken/s</th><th>Deaths</th><th>Avg time</th><th>Clears</th></tr>${cls || '<tr><td colspan=7>No runs yet.</td></tr>'}</table></div>
      <div class="gsub">Recent runs</div><div class="pttable"><table><tr><th>Who</th><th>Stage</th><th>Result</th><th>Time</th><th>DPS</th><th>Taken/s</th><th>Kills</th><th>Deaths (killer, hit)</th><th>Top damage</th></tr>${runs || '<tr><td colspan=9>Play a stage with logging on.</td></tr>'}</table></div>
      <div class="menu row"><button class="primary" data-a="range">Training range</button><button data-a="tog">${enabled ? 'Turn logging off' : 'Turn logging on'}</button><button data-a="copy">Copy JSON</button><button data-a="dl">Download JSON</button><button data-a="clr">Clear log</button><button data-a="back">Back</button></div></div>`, (a, b) => {
      if (a === 'back') return back();
      if (a === 'tog') { PT.toggle(); return M.playtestLog(back); }
      if (a === 'range') return PT.range();
      if (a === 'copy') { const t = JSON.stringify(log, null, 1); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { b.textContent = 'Copied'; }, () => { b.textContent = 'Copy failed'; }); return; }
      if (a === 'dl') { const u = URL.createObjectURL(new Blob([JSON.stringify(log, null, 1)], { type: 'application/json' })); const el = document.createElement('a'); el.href = u; el.download = 'galactic-void-playtest.json'; document.body.appendChild(el); el.click(); el.remove(); return; }
      if (a === 'clr') { if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = 'Tap again to clear'; return; } log = []; saveLog(); return M.playtestLog(back); }
    }, back);
  };
  // Training range: a flat floor and pinned, unkillable dummies (one alone, a pack of six, one flying).
  PT.range = function () {
    if (!enabled) PT.toggle(true);
    const G = GV.game; GV.stageSeed = 5; G.startStage(0, 0); GV.stageSeed = undefined;
    const p = G.play, L = p.L, FY = 600;
    p.dialog = null; p.pendingDialog = null;
    L.solids = [{ x: -400, y: FY, w: 2400, h: 300 }, { x: -440, y: 0, w: 40, h: FY + 300 }, { x: 2000, y: 0, w: 40, h: FY + 300 }];
    L.oneways = [{ x: 820, y: FY - 130, w: 200, h: 14 }]; L.walls = []; L.hazards = []; L.acid = []; L.vents = []; L.chests = []; L.ambushes = []; L.ceilings = []; L.rifts = []; L.npcs = []; L.checkpoints = [];
    L.exit = { x: 1900, y: FY - 90, w: 40, h: 90 }; L.killY = FY + 400; L.w = 2000; p.grid = null; p.enemies = []; p.projs = []; p.drops = []; p.spawners && (p.spawners.length = 0);
    p.spawnCap = 0; p.noSpawn = true;
    const pl = p.player; pl.x = 200; pl.y = FY - pl.h; pl.vx = pl.vy = 0;
    const mk = (type, x, y) => { const e = p.spawnEnemy(type, x, y, true); e.x = x; e.y = y - e.h; e.x0 = e.x; e.y0 = e.y; e.rangeDummy = true; e.hp = e.maxHp = 1e7; e.dmg = 0; return e; };
    p.range = [mk('brute', 420, FY), ...[0, 1, 2, 3, 4, 5].map((i) => mk('brute', 1120 + i * 42, FY)), mk('wisp', 680, FY - 150)];
    p.pt = null; run(p); p.pt.stage = 'Training range'; p.pt.mode = 'range';
    p.toasts.length = 0; p.toast('TRAINING RANGE', 2.4); p.toasts[0].sub = 'Single target on the left · a pack on the right · Esc to leave';
  };
  const cap0 = P.cap;
  P.cap = function () { return this.noSpawn ? 0 : cap0.apply(this, arguments); };

  // Pause menu entry, while logging is on. Settings title: five taps toggles playtest mode.
  const pause0 = M.pause;
  M.pause = function () {
    pause0.apply(this, arguments);
    if (!enabled) return;
    const menu = document.querySelector('#ui .menu'); if (!menu) return;
    const b = document.createElement('button'); b.innerHTML = '<b>Playtest log</b><span>Notes for the developer</span>'; b.dataset.l = 'ptlog';
    M.pauseAdd ? M.pauseAdd('sys', b) : menu.appendChild(b);
    b.addEventListener('click', (e) => { e.stopPropagation(); M.playtestLog(() => M.pause()); });
  };
  const set0 = M.settings;
  M.settings = function (opts) {
    set0.call(this, opts);
    const h = document.querySelector('#ui h2'); if (!h) return;
    let n = 0, t = 0;
    h.addEventListener('click', () => { const now = Date.now(); n = now - t < 700 ? n + 1 : 1; t = now; if (n >= 5) { n = 0; PT.toggle(); h.textContent = enabled ? 'Settings · playtest on' : 'Settings'; } });
    if (enabled) { const row = document.createElement('div'); row.className = 'menu row'; row.innerHTML = '<button>Playtest log</button>'; h.after(row); row.firstChild.addEventListener('click', (e) => { e.stopPropagation(); M.playtestLog(() => M.settings()); }); }
  };
})();
