// Galactic Void — friends, invites and in-game quick chat for online co-op.
//
// Who's online: everyone with the game open shares a small status in the artifact's lobby
// (menus / in a stage / hosting with a free slot). Friends are stored as ids only, in your save
// (so they follow your cloud save); names and avatars are resolved fresh each time they're drawn
// and always set as text. Invites and join requests are short lobby messages addressed to one
// open game; quick chat sends only a phrase number or a ping position, never free text.
(function () {
  const GV = window.GV, M = GV.menus, esc = M.esc, N = GV.net, P = GV.Play.prototype;
  const PHRASES = ['Help!', 'On my way', 'Revive me!', 'Loot here', 'Wait for me', 'Nice one!'];
  let R = null, U = null, myId = null, myPeer = null, peers = [];
  const store = () => { const m = GV.save.main || GV.save.data; m.friends = m.friends || { list: [], recent: [], blocked: [], autoJoin: true, hidden: false }; return m.friends; };
  const use = async (n) => { if (window.__gvMockLobby && n === 'room') return window.__gvMockLobby; if (window.__gvMockUser && n === 'user') return window.__gvMockUser; try { return window.claude && window.claude.use ? await window.claude.use(n) : null; } catch (e) { return null; } };

  const F = (GV.friends = {
    ready: false,
    isFriend: (id) => !!id && store().list.includes(id),
    isBlocked: (id) => !!id && store().blocked.includes(id),
    add(id) { const s = store(); if (id && id !== myId && !s.list.includes(id)) { s.list.push(id); s.blocked = s.blocked.filter((x) => x !== id); GV.save.write(); } },
    remove(id) { const s = store(); s.list = s.list.filter((x) => x !== id); GV.save.write(); },
    block(id) { const s = store(); if (id && !s.blocked.includes(id)) s.blocked.push(id); s.list = s.list.filter((x) => x !== id); GV.save.write(); },
    unblock(id) { const s = store(); s.blocked = s.blocked.filter((x) => x !== id); GV.save.write(); },
    addRecent(id) { const s = store(); if (!id || id === myId) return; s.recent = [id, ...s.recent.filter((x) => x !== id)].slice(0, 12); GV.save.write(); },
    online: () => peers.filter((p) => !p.isMe && p.presence && p.presence.gv),
    onlineCount: () => F.online().filter((p) => F.isFriend(p.by)).length,
    publish,
    myId: () => myId,
  });

  // ---------------- lobby status ----------------
  function status() {
    if (store().hidden) return { gv: null, st: null, code: null, cls: null, rank: null, g: null };
    const d = GV.save.data, G = GV.game;
    let st = G && G.scene === 'play' ? 'stage' : 'menu';
    if (N.role === 'host') st = N.guests && N.guests.size >= N.SQUAD - 1 ? 'full' : 'hosting';
    else if (N.role === 'guest' && N.partner) st = 'full';
    return { gv: 1, st, n: N.squadSize ? N.squadSize() : 1, code: N.role === 'host' && st === 'hosting' ? N.code : null, cls: d.cls || null, rank: d.level || 1, g: (GV.save.main || d).guild || null, hall: !!(G && G.play && G.play.L && G.play.L.hall) };
  }
  let lastPub = '';
  function publish() {
    if (!R) return;
    const s = status(), k = JSON.stringify(s);
    if (k === lastPub) return;
    lastPub = k; R.presence(s).catch(() => {});
  }
  async function boot() {
    R = await use('room'); U = await use('user');
    if (U) myId = await U.id();
    if (!R) return;
    F.ready = true;
    R.onPeers((ch) => {
      peers = ch.peers.slice();
      const me = peers.find((p) => p.isMe && p.sameTab); if (me) myPeer = me.peer;
      for (const p of ch.joined) if (!p.isMe && F.isFriend(p.by) && booted) note(p.by, (n) => `${n} is online`, null, 4);
      if (document.querySelector('#ui .friends')) M.friends(lastBack);
      N.refreshUI && document.getElementById('netBox') && N.refreshUI();
    });
    R.on('inv', (m) => onInvite(m));
    R.on('req', (m) => onRequest(m));
    R.on('dec', (m) => { if (m.data && m.data.to === myPeer && !m.isMe) note(m.by, (n) => `${n} can't play right now`, null, 4); });
    publish();
    setTimeout(() => { booted = true; }, 4000);
    setInterval(publish, 3000);
  }
  let booted = false;
  addEventListener('load', () => setTimeout(boot, 300));

  // ---------------- invites & requests ----------------
  const peerOf = (id) => peers.find((p) => !p.isMe && p.by === id && p.presence && p.presence.gv);
  async function invite(peer) {
    if (!R || !peer) return;
    if (N.role !== 'host') { await N.host(); }
    if (N.role !== 'host' || !N.code) return;
    R.emit('inv', { to: peer.peer, code: N.code }).catch(() => {});
    note(peer.by, (n) => `Invite sent to ${n}`, null, 3);
  }
  function askJoin(peer) {
    if (!R || !peer) return;
    if (peer.presence && peer.presence.st === 'hosting' && peer.presence.code) return N.join(String(peer.presence.code));
    R.emit('req', { to: peer.peer }).catch(() => {});
    note(peer.by, (n) => `Asked ${n} to let you in`, null, 3);
  }
  function onInvite(m) {
    const d = m.data || {};
    if (m.isMe || d.to !== myPeer || F.isBlocked(m.by)) return;
    const code = String(d.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (code.length !== 4) return;
    if (N.role === 'guest' && N.partner) return;
    note(m.by, (n) => `${n} invites you to play co-op`, [['Join', () => { if (GV.game.play && GV.game.scene === 'play' && !GV.game.play.netGuest) { GV.game.leavePlay(); GV.game.scene = 'menu'; } N.join(code); M.coop(); }], ['Decline', () => R.emit('dec', { to: m.peer }).catch(() => {})]], 25);
  }
  function onRequest(m) {
    const d = m.data || {};
    if (m.isMe || d.to !== myPeer || F.isBlocked(m.by)) return;
    if (N.role === 'host' && N.partner) return R.emit('dec', { to: m.peer }).catch(() => {});
    const yes = async () => { if (N.role !== 'host') await N.host(); if (N.code) R.emit('inv', { to: m.peer, code: N.code }).catch(() => {}); };
    if (F.isFriend(m.by) && store().autoJoin) { yes(); note(m.by, (n) => `${n} is joining you`, null, 4); return; }
    note(m.by, (n) => `${n} wants to join your game`, [['Let them in', yes], ['Not now', () => R.emit('dec', { to: m.peer }).catch(() => {})]], 25);
  }

  // ---------------- notifications ----------------
  async function note(id, text, actions, secs) {
    let box = document.getElementById('netNotes');
    if (!box) { box = document.createElement('div'); box.id = 'netNotes'; document.body.appendChild(box); }
    const prof = await profile(id);
    const el = document.createElement('div'); el.className = 'netnote';
    const img = document.createElement('img'); img.src = prof.avatarUrl || ''; img.alt = '';
    const body = document.createElement('div'); const t = document.createElement('span'); t.textContent = text(prof.name || 'Someone'); body.appendChild(t);
    el.append(img, body);
    const done = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
    if (actions) { const row = document.createElement('div'); row.className = 'nbtns'; for (const [label, fn] of actions) { const b = document.createElement('button'); b.textContent = label; b.onclick = (e) => { e.stopPropagation(); done(); fn(); }; row.appendChild(b); } body.appendChild(row); }
    box.appendChild(el);
    GV.audio.play ? GV.audio.play('chime', { vol: 0.6 }) : null;
    setTimeout(done, (secs || 6) * 1000);
  }
  async function profile(id) {
    if (!U || !id) return { name: '', avatarUrl: '', color: '#8fe9ff' };
    const ps = await U.profiles([id]); return ps[id] || { name: '', avatarUrl: '', color: '#8fe9ff' };
  }

  // ---------------- friends screen ----------------
  let lastBack = () => M.coop(), searchQ = '', hits = [];
  const STATUS = { menu: 'On their ship', stage: 'In a stage', hosting: 'Hosting · room open', full: 'In co-op' };
  const statusOf = (pr) => { const sq = pr.n > 1 ? ` · squad ${Math.min(4, +pr.n)}/4` : ''; return (pr.hall ? (pr.st === 'hosting' ? 'On their deck · come aboard' : 'On their deck') : STATUS[pr.st] || 'Online') + sq; };
  M.friends = async function (back) {
    lastBack = back || lastBack;
    const s = store();
    const online = F.online();
    const onlineIds = new Set(online.map((p) => p.by).filter(Boolean));
    const ids = [...new Set([...s.list, ...s.recent, ...online.map((p) => p.by).filter(Boolean), ...hits.map((h) => h.id)])];
    const ps = U ? await U.profiles(ids) : {};
    const row = (id, peer, where) => {
      const pr = peer && peer.presence, fr = F.isFriend(id), on = !!peer;
      const meta = on ? `${esc(statusOf(pr))}${pr.cls && GV.CLASSES[pr.cls] ? ` · ${esc(GV.CLASSES[pr.cls].name)} · rank ${+pr.rank || 1}` : ''}` : 'Offline';
      const btns = [];
      if (on && pr.st === 'hosting' && pr.code) btns.push(`<button class="primary" data-f="join" data-p="${esc(peer.peer)}">Join</button>`);
      else if (on && pr.st !== 'full') btns.push(`<button class="primary" data-f="invite" data-p="${esc(peer.peer)}">Invite</button>`, `<button data-f="ask" data-p="${esc(peer.peer)}">Ask to join</button>`);
      if (id) btns.push(fr ? `<button data-f="remove" data-i="${esc(id)}">Unfriend</button>` : `<button data-f="add" data-i="${esc(id)}">Add friend</button>`);
      const GG = GV.guild; if (id && GG && GG.id && GG.rank() >= 2 && !GG.members[id] && !(pr && pr.g)) btns.push(`<button data-f="ginvite" data-i="${esc(id)}">Invite to guild</button>`);
      if (id && where !== 'search') btns.push(`<button class="ghost" data-f="block" data-i="${esc(id)}">Block</button>`);
      return `<div class="frow ${on ? 'on' : ''}"><img data-av="${esc(id || '')}" alt=""><div class="fi"><b data-nm="${esc(id || '')}"></b><span>${meta}</span></div><div class="fb">${btns.join('')}</div></div>`;
    };
    const friends = s.list.map((id) => row(id, online.find((p) => p.by === id), 'friend')).join('');
    const others = online.filter((p) => !F.isFriend(p.by) && !F.isBlocked(p.by)).map((p) => row(p.by, p, 'online')).join('');
    const recent = s.recent.filter((id) => !F.isFriend(id) && !onlineIds.has(id) && !F.isBlocked(id)).map((id) => row(id, null, 'recent')).join('');
    const found = hits.filter((h) => h.id !== myId && !F.isFriend(h.id)).map((h) => row(h.id, online.find((p) => p.by === h.id), 'search')).join('');
    const blocked = s.blocked.map((id) => `<div class="frow"><img data-av="${esc(id)}" alt=""><div class="fi"><b data-nm="${esc(id)}"></b><span>Blocked: no invites or requests</span></div><div class="fb"><button data-f="unblock" data-i="${esc(id)}">Unblock</button></div></div>`).join('');
    M.render(`<div class="screen panel wide friends"><h2>Friends</h2>
      ${R ? '' : GV.standalone ? '<p class="muted">This version plays by room code: host from your ship, send your code, and friends join with it above. Friends lists and online status live in the Claude version.</p>' : '<p class="muted">Friends and online status need the game open in Claude, signed in. You can still join by room code.</p>'}
      <div class="fcols2">
        <div>
          <div class="gsub">Friends <span>${s.list.length ? `${F.onlineCount()} of ${s.list.length} online` : 'none yet'}</span></div>${friends || '<p class="muted">Add people from the lists here. Friends see when you\'re hosting, and can join you without asking (you can turn that off).</p>'}
          <div class="gsub">Playing now</div>${others || '<p class="muted">Nobody else has the game open right now.</p>'}
          ${recent ? `<div class="gsub">Played with recently</div>${recent}` : ''}
        </div>
        <div>
          <div class="gsub">Find people</div>
          <input id="fSearch" class="fsearch" placeholder="Search your organisation by name" value="${esc(searchQ)}" autocomplete="off">
          ${found}
          <div class="gsub">Settings</div>
          <label class="tog"><input type="checkbox" id="fAuto" ${s.autoJoin ? 'checked' : ''}> Friends can join my game without asking</label>
          <label class="tog"><input type="checkbox" id="fHide" ${s.hidden ? 'checked' : ''}> Appear offline</label>
          <label class="tog"><input type="checkbox" id="fHall" ${s.openHall !== false ? 'checked' : ''}> Open my hall to friends and guildmates when I walk the deck</label>
          ${blocked ? `<div class="gsub">Blocked</div>${blocked}` : ''}
          <p class="muted">Only people this game is shared with appear here. Names come from Claude and are never stored in your save, only an id.</p>
        </div>
      </div>
      <div class="menu row"><button data-a="back">Back</button></div></div>`, (a) => { if (a === 'back') lastBack(); }, () => lastBack());
    // names and avatars, as text
    document.querySelectorAll('#ui [data-nm]').forEach((el) => { const p = ps[el.dataset.nm]; el.textContent = (p && p.name) || (el.dataset.nm ? 'Someone' : 'Someone (no id)'); });
    document.querySelectorAll('#ui [data-av]').forEach((el) => { const p = ps[el.dataset.av]; if (p && p.avatarUrl) el.src = p.avatarUrl; else el.remove(); });
    const byPeer = (pp) => peers.find((x) => x.peer === pp);
    document.querySelectorAll('#ui [data-f]').forEach((b) => b.addEventListener('click', async (e) => {
      e.stopPropagation();
      const f = b.dataset.f, id = b.dataset.i;
      if (f === 'add') F.add(id);
      if (f === 'remove') F.remove(id);
      if (f === 'block') F.block(id);
      if (f === 'unblock') F.unblock(id);
      if (f === 'ginvite' && GV.guild) { await GV.guild.invite(id); note(id, (n) => `Guild invite sent to ${n}`, null, 3); }
      if (f === 'invite') await invite(byPeer(b.dataset.p));
      if (f === 'ask') askJoin(byPeer(b.dataset.p));
      if (f === 'join') { const pp = byPeer(b.dataset.p); if (pp) { await N.join(String(pp.presence.code)); return M.coop(); } }
      M.friends(lastBack);
    }));
    const si = document.getElementById('fSearch');
    if (si) {
      si.addEventListener('focus', async () => { if (U && !searchQ) { hits = (await U.search('')) || []; } });
      si.addEventListener('input', async () => { searchQ = si.value; hits = U ? (await U.search(searchQ)) || [] : []; const pos = si.selectionStart; await M.friends(lastBack); const s2 = document.getElementById('fSearch'); if (s2) { s2.focus(); s2.setSelectionRange(pos, pos); } });
    }
    const au = document.getElementById('fAuto'); if (au) au.addEventListener('change', () => { store().autoJoin = au.checked; GV.save.write(); });
    const oh = document.getElementById('fHall'); if (oh) oh.addEventListener('change', () => { store().openHall = oh.checked; GV.save.write(); });
    const hi = document.getElementById('fHide'); if (hi) hi.addEventListener('change', () => { store().hidden = hi.checked; GV.save.write(); lastPub = ''; publish(); });
  };

  // ---------------- quick chat & pings (in an online game) ----------------
  const marks = []; // pings and speech bubbles on screen
  N.onRoom.push((room) => room.on('qc', (m) => { if (m.sameTab) return; const d = m.data || {}; showQC(d, true); }));
  const mySlot = () => (N.role === 'guest' ? N.mySlot || 1 : 0);
  function showQC(d, remote) {
    const p = GV.game && GV.game.play; if (!p) return;
    const sl = remote ? (Number.isInteger(d.sl) ? d.sl : -1) : mySlot();
    const pl = p.players.find((q) => (q.slot || 0) === sl && !q.holo); if (!pl) return;
    if (d.k === 'ping' && Number.isFinite(d.x) && Number.isFinite(d.y)) { marks.push({ kind: 'ping', x: d.x, y: d.y, t: 3, pl }); GV.audio.play && GV.audio.play('deploy', { vol: 0.5 }); }
    if (d.k === 'say' && d.i >= 0 && d.i < PHRASES.length) { marks.push({ kind: 'say', text: PHRASES[d.i], t: 3, pl }); GV.audio.play && GV.audio.play('chime', { vol: 0.4 }); }
  }
  let holdT = 0, wheel = false;
  const pu0 = GV.Player.prototype.update;
  GV.Player.prototype.update = function (dt, p) {
    pu0.call(this, dt, p);
    if (this !== p.player || !N.room || !(p.netHost || p.netGuest)) return;
    const I = GV.input;
    if (I.held('ping')) { holdT += dt; if (holdT > 0.3 && !wheel) { wheel = true; openWheel(); } }
    else if (holdT > 0) { if (!wheel) sendPing(p, this); holdT = 0; }
  };
  function sendPing(p, pl) {
    const a = GV.aim && GV.aim.of(pl), x = Math.round(a ? a.px : pl.cx + pl.facing * 120), y = Math.round(a ? a.py : pl.y);
    const d = { k: 'ping', x, y, sl: mySlot() };
    showQC(d, false); N.emit('qc', d);
  }
  function openWheel() {
    let el = document.getElementById('qcWheel');
    if (!el) { el = document.createElement('div'); el.id = 'qcWheel'; document.body.appendChild(el); }
    el.innerHTML = PHRASES.map((t, i) => `<button data-q="${i}"><i>${i + 1}</i>${esc(t)}</button>`).join('');
    el.classList.add('on');
    const pick = (i) => { const d = { k: 'say', i, sl: mySlot() }; showQC(d, false); N.emit('qc', d); close(); };
    el.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); pick(+b.dataset.q); }));
    const key = (e) => { const n = +e.key; if (n >= 1 && n <= PHRASES.length) { e.preventDefault(); e.stopImmediatePropagation(); pick(n - 1); } else if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } };
    const close = () => { el.classList.remove('on'); removeEventListener('keydown', key, true); setTimeout(() => { wheel = false; }, 150); };
    addEventListener('keydown', key, true);
    setTimeout(() => { if (el.classList.contains('on')) close(); }, 4000);
  }
  const up0 = P.update;
  P.update = function (dt) { up0.call(this, dt); for (const m of marks) m.t -= dt; for (let i = marks.length - 1; i >= 0; i--) if (marks[i].t <= 0) marks.splice(i, 1); };
  const pd0 = GV.Player.prototype.draw;
  GV.Player.prototype.draw = function (ctx, p) {
    pd0.call(this, ctx, p);
    for (const m of marks) {
      if (m.pl !== this) continue;
      const k = Math.min(1, m.t / 0.4);
      if (m.kind === 'say') {
        ctx.save(); ctx.globalAlpha = k; ctx.font = `700 12px ${GV.CFG.FONT}`; const w = ctx.measureText(m.text).width + 16, x = this.cx - w / 2, y = this.y - 58;
        ctx.fillStyle = 'rgba(8,10,18,0.85)'; GV.art.rrect(ctx, x, y, w, 20, 8); ctx.strokeStyle = (GV.COOP_COLORS || [])[this.slot] || '#8fe9ff'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 2, y + 2, w - 4, 16);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(m.text, this.cx, y + 14); ctx.restore();
      } else {
        const col = (GV.COOP_COLORS || [])[this.slot] || '#8fe9ff', r = 10 + (1 - (m.t % 1)) * 16;
        ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = col; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(m.x, m.y - 14); ctx.lineTo(m.x + 10, m.y); ctx.lineTo(m.x, m.y + 14); ctx.lineTo(m.x - 10, m.y); ctx.closePath(); ctx.stroke();
        ctx.globalAlpha = k * 0.6; ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
    }
  };
  // connection health, top-right under the stage name while playing online
  const hud0 = GV.hud.draw;
  GV.hud.draw = function (ctx, p) {
    hud0.call(this, ctx, p);
    const on = !!((p.netHost && p.netP2) || p.netGuest); if (on !== document.body.classList.contains('online')) document.body.classList.toggle('online', on);
    if (!(p.netHost && p.netP2) && !p.netGuest) return;
    let txt, col;
    if (p.netGuest) { const r = Math.round(N.rtt || 0); txt = r ? `${r} ms` : 'connecting'; col = r < 120 ? '#7dffb0' : r < 250 ? '#ffd36b' : '#ff6a7a'; }
    else {
      const slots = p.players.filter((q) => q.netG).map((q) => q.slot), worst = slots.reduce((w, s) => { const a = N.inputAgeOf(s); return a > w.a ? { s, a } : w; }, { s: 0, a: 0 });
      txt = worst.a < 400 ? `Squad ${slots.length + 1}/4 linked` : `P${worst.s + 1} ${worst.a < 2000 ? 'lagging' : 'lost'}`; col = worst.a < 400 ? '#7dffb0' : worst.a < 2000 ? '#ffd36b' : '#ff6a7a';
    }
    const W = GV.CFG.W; ctx.save(); ctx.font = `700 10px ${GV.CFG.FONT}`; ctx.textAlign = 'right';
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(W - 18 - ctx.measureText(txt).width - 10, 74, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillText(txt, W - 18, 77); ctx.restore();
  };
})();
