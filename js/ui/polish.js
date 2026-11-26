// Galactic Void — menu polish: a designed cursor and the "picker", a set of corner brackets that
// glides to whatever menu item you're on (mouse, keyboard or controller), on every screen.
(function () {
  const GV = window.GV;
  // ---- cursors: an original set drawn as SVG, in the game's palette (void-black facets, ice-cyan
  // glow, crimson accents). Each has a resting look and a "hover" look for anything you can click.
  // Picked in Settings; Void Spire is the default.
  const glow = (id, c, sd = 1.1) => `<filter id='${id}' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='${sd}' result='b'/><feFlood flood-color='${c}'/><feComposite in2='b' operator='in'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>`;
  const wrap = (body, defs = '') => `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><defs>${defs}</defs>${body}</svg>`;
  const charge = (x, y, c) => `<circle cx='${x}' cy='${y}' r='4.6' fill='none' stroke='${c}' stroke-width='1.4' stroke-dasharray='2.4 1.8'/><circle cx='${x}' cy='${y}' r='1.6' fill='#ff3048'/>`;
  const FACET = 'M3 2 L3 25 L8.6 20.4 L12 28.2 L16.2 26.6 L12.8 19 L20.4 19 Z';
  const facet = (rim, hover, rimDef = '') => wrap(
    `<g filter='url(#g)'><path d='${FACET}' fill='url(#f)' stroke='${rim}' stroke-width='${hover ? 2.3 : 1.8}' stroke-linejoin='round'/></g>
     <path d='M9 15.6 L3.8 3.6 M9 15.6 L3.8 23.2 M9 15.6 L19 18.6' stroke='${rim}' stroke-width='1' stroke-opacity='${hover ? 0.95 : 0.7}'/>
     <path d='M4.6 5.2 L8.4 14.2' stroke='#ffffff' stroke-opacity='.35' stroke-width='1'/>${hover ? charge(24, 25, '#e8fbff') : ''}`,
    `${rimDef}<linearGradient id='f' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#2a3348'/><stop offset='.55' stop-color='#0d1220'/><stop offset='1' stop-color='#05070d'/></linearGradient>${glow('g', typeof rim === 'string' && rim[0] === '#' ? rim : '#8fe9ff', hover ? 1.5 : 1)}`);
  const PRISM = "<linearGradient id='pr' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#8fe9ff'/><stop offset='.35' stop-color='#c38bff'/><stop offset='.65' stop-color='#ff3048'/><stop offset='1' stop-color='#ffd36b'/></linearGradient>";
  const CURSORS = {
    spire: { name: 'Void Spire', hot: [3, 2], svg: (h) => wrap(
      `<g transform='translate(-13 1) rotate(-32 16 1)'>
        <g filter='url(#g)'>
          <path d='M16 1 L3.6 27.4 L8.8 25.2 L16 8.6 Z' fill='url(#bl)' stroke='#05070d' stroke-width='.8'/>
          <path d='M16 1 L28.4 27.4 L23.2 25.2 L16 8.6 Z' fill='url(#br)' stroke='#05070d' stroke-width='.8'/>
        </g>
        <path d='M16 8.6 L9.6 23.6 L22.4 23.6 Z' fill='#0a1424' opacity='.9'/>
        <path d='M16 3.4 L5.6 26 M16 3.4 L26.4 26' stroke='#8fe9ff' stroke-width='.9' stroke-opacity='.85'/>
        <circle cx='16' cy='21' r='5.4' fill='#05070d' stroke='#8fe9ff' stroke-width='${h ? 2 : 1.5}' filter='url(#r)'/>
        <circle cx='16' cy='21' r='2.6' fill='none' stroke='#e8fbff' stroke-width='.8' stroke-dasharray='1.4 1.2' opacity='${h ? 1 : 0.6}'/>
        ${h ? "<circle cx='16' cy='21' r='1.3' fill='#ff3048'/>" : ''}
      </g>`,
      `<linearGradient id='bl' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#0b0f19'/><stop offset='1' stop-color='#2b3a52'/></linearGradient>
       <linearGradient id='br' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#1d2a3e'/><stop offset='1' stop-color='#06080f'/></linearGradient>
       ${glow('g', '#5fd8ff', h ? 1.3 : 0.9)}${glow('r', '#8fe9ff', h ? 1.6 : 1.1)}`) },
    facet: { name: 'Neon Facet', hot: [3, 2], svg: (h) => facet('#8fe9ff', h) },
    crimson: { name: 'Crimson Facet', hot: [3, 2], svg: (h) => facet('#ff3048', h) },
    prism: { name: 'Prism', hot: [3, 2], svg: (h) => facet('url(#pr)', h, PRISM) },
    shard: { name: 'Glass Shard', hot: [4, 2], svg: (h) => wrap(
      `<path d='M4 2 C14 4.4 22.6 12 18.4 27 C10.4 23 4.4 15 4 2 Z' fill='url(#gl)' stroke='#e8fbff' stroke-width='${h ? 1.8 : 1.4}' filter='url(#g)'/>
       <path d='M5.6 5 C11 8 15.6 14 16.4 22' fill='none' stroke='#ffffff' stroke-opacity='.75' stroke-width='1'/>
       <path d='M7 4.6 C13 7.4 18 12 19.4 18' fill='none' stroke='#8fe9ff' stroke-opacity='.6' stroke-width='.8'/>${h ? charge(24, 25, '#8fe9ff') : ''}`,
      `<linearGradient id='gl' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#cdf6ff' stop-opacity='.75'/><stop offset='.5' stop-color='#4aa8c8' stop-opacity='.45'/><stop offset='1' stop-color='#0b1a2a' stop-opacity='.85'/></linearGradient>${glow('g', '#8fe9ff', h ? 1.5 : 1)}`) },
    kite: { name: 'Ring Kite', hot: [3, 2], svg: (h) => wrap(
      `<path d='M3 2 L25 9.4 L22.8 24 L9.4 26.4 Z' fill='url(#k)' stroke='#7a8296' stroke-width='1' filter='url(#g)'/>
       <path d='M3 2 L25 9.4' stroke='#8fe9ff' stroke-width='1.2'/>
       <circle cx='15.6' cy='16.6' r='${h ? 5.6 : 5}' fill='#05070d' stroke='#5fd8ff' stroke-width='${h ? 2.2 : 1.8}' filter='url(#r)'/>
       ${h ? "<circle cx='15.6' cy='16.6' r='1.5' fill='#ff3048'/>" : ''}`,
      `<linearGradient id='k' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#3a4358'/><stop offset='1' stop-color='#0b0f19'/></linearGradient>${glow('g', '#5fd8ff', 0.8)}${glow('r', '#5fd8ff', h ? 1.6 : 1.1)}`) },
    thruster: { name: 'Thruster', hot: [3, 2], svg: (h) => wrap(
      `<path d='M19 20 L26 29 L21.4 21.2 Z' fill='url(#fl)' opacity='${h ? 1 : 0.85}'/>
       <path d='M3 2 L3 21 L9 17 L13.6 23 L18.4 19 L12.6 14.4 L19 12 Z' fill='url(#t)' stroke='#8fe9ff' stroke-width='1.5' stroke-linejoin='round' filter='url(#g)'/>
       <path d='M5 6 L10.6 13.4 L6.4 17' fill='none' stroke='#8fe9ff' stroke-opacity='.7' stroke-width='1'/>
       <circle cx='14.6' cy='18.6' r='${h ? 2.4 : 1.8}' fill='#ffb347' filter='url(#f2)'/>`,
      `<linearGradient id='t' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#2e4a58'/><stop offset='1' stop-color='#0a1520'/></linearGradient>
       <linearGradient id='fl' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#fff2c4'/><stop offset='.5' stop-color='#ffb347'/><stop offset='1' stop-color='#ff3048' stop-opacity='0'/></linearGradient>${glow('g', '#5fd8ff', h ? 1.3 : 0.9)}${glow('f2', '#ffb347', 1.2)}`) },
    reticle: { name: 'Targeting', hot: [16, 16], svg: (h) => { const c = h ? '#ffd36b' : '#8fe9ff'; return wrap(
      `<g filter='url(#g)' stroke='${c}' stroke-width='1.8' fill='none'>
        <circle cx='16' cy='16' r='9'/><path d='M16 1.5 V8 M16 24 V30.5 M1.5 16 H8 M24 16 H30.5'/>
        ${h ? "<circle cx='16' cy='16' r='4.2'/>" : "<circle cx='16' cy='16' r='6.2' stroke-dasharray='1.4 2' stroke-width='1'/>"}
       </g><circle cx='16' cy='16' r='1.4' fill='#ff3048'/>`, glow('g', c, 1)); } },
    classic: { name: 'Classic', hot: [4, 3], svg: (h) => wrap(
      `<path d='M4 3 L4 24 L9.5 18.8 L13.4 27.5 L17 26 L13.2 17.5 L21 17.5 Z' fill='#ffffff' stroke='#05070d' stroke-width='1.6' stroke-linejoin='round'/>${h ? charge(23, 24, '#8fe9ff') : ''}`) },
  };
  GV.CURSORS = CURSORS;
  const url = (s) => `url("data:image/svg+xml,${encodeURIComponent(s.replace(/\s+/g, ' '))}")`;
  const css = document.createElement('style'); document.head.appendChild(css);
  GV.cursorPreview = (id, hover) => `data:image/svg+xml,${encodeURIComponent(CURSORS[id].svg(!!hover).replace(/\s+/g, ' '))}`;
  GV.applyCursor = function (id) {
    const C = CURSORS[id] || CURSORS.spire, [hx, hy] = C.hot;
    css.textContent = `
      html, body, #ui, .screen, #game { cursor: ${url(C.svg(false))} ${hx} ${hy}, auto; }
      button:not([disabled]), [data-a], [data-g], [data-l], .filebtn, label, select, summary, .actTag, input[type=checkbox], input[type=range] { cursor: ${url(C.svg(true))} ${hx} ${hy}, pointer; }
      input[type=text], input:not([type]), textarea { cursor: text; }
      body.playing.aimMouse #game { cursor: none; }
    `;
  };
  GV.applyCursor((GV.settings && GV.settings.data.cursor) || 'spire');
  addEventListener('load', () => GV.applyCursor(GV.settings.data.cursor || 'spire')); // after saved settings load

  // Settings: a grid of cursors to choose from, each showing its rest and hover look.
  const M = GV.menus, set0 = M.settings;
  M.settings = function () {
    const r = set0.apply(this, arguments);
    const at = document.querySelector('#ui .testing') || document.querySelector('#ui .menu.row:last-child');
    if (!at) return r;
    const cur = (GV.settings.data.cursor) || 'spire';
    const box = document.createElement('div'); box.className = 'curPick';
    box.innerHTML = `<div class="curHead"><b>Cursor</b><span>${CURSORS[cur].name}</span></div><div class="curGrid">${Object.keys(CURSORS).map((k) => `<button class="curOpt ${k === cur ? 'sel' : ''}" data-cur="${k}" title="${CURSORS[k].name}"><span class="curImgs"><img src="${GV.cursorPreview(k)}" alt=""><img src="${GV.cursorPreview(k, true)}" alt=""></span><em>${CURSORS[k].name}</em></button>`).join('')}</div>`;
    at.parentNode.insertBefore(box, at);
    box.querySelectorAll('[data-cur]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation(); GV.audio && GV.audio.sfx('ui');
      GV.settings.set('cursor', b.dataset.cur); GV.applyCursor(b.dataset.cur);
      box.querySelectorAll('.curOpt').forEach((x) => x.classList.toggle('sel', x === b));
      box.querySelector('.curHead span').textContent = CURSORS[b.dataset.cur].name;
    }));
    return r;
  };

  // ---- the picker ----
  const pk = document.createElement('div'); pk.id = 'picker';
  pk.innerHTML = '<i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i>';
  document.body.appendChild(pk);
  let target = null, raf = 0;
  const pickable = (el) => el && el.closest && el.closest('#ui button:not([disabled]), #ui .sk');
  function place() {
    raf = 0;
    if (!target || !document.body.contains(target) || !document.getElementById('ui').classList.contains('show') || target.offsetParent === null) { pk.classList.remove('on'); target = null; return; }
    const r = target.getBoundingClientRect(), pad = target.classList.contains('cls') ? 5 : 4;
    if (r.width < 4 || r.bottom < 0 || r.top > innerHeight) { pk.classList.remove('on'); return; }
    pk.style.transform = `translate(${r.left - pad}px, ${r.top - pad}px)`;
    pk.style.width = r.width + pad * 2 + 'px'; pk.style.height = r.height + pad * 2 + 'px';
    const c = getComputedStyle(target).getPropertyValue('--c').trim() || getComputedStyle(target).getPropertyValue('--sc').trim();
    pk.style.setProperty('--pc', c || '#8fe9ff');
    pk.classList.add('on');
  }
  const queue = () => { if (!raf) raf = requestAnimationFrame(place); };
  function aim(el) { const t = pickable(el); if (t && t !== target) { target = t; pk.classList.remove('pop'); void pk.offsetWidth; pk.classList.add('pop'); } if (t) queue(); }
  document.addEventListener('mouseover', (e) => { if (GV.input && GV.input.isTouch) return; aim(e.target); }, true);
  document.addEventListener('focusin', (e) => aim(e.target), true);
  document.addEventListener('mouseout', (e) => { if (target && e.target === target && !target.contains(e.relatedTarget) && document.activeElement !== target) { target = null; queue(); } }, true);
  addEventListener('scroll', queue, true); addEventListener('resize', queue);
  // screens re-render often: keep the picker on the focused item, or let it go
  new MutationObserver(() => { if (target && !document.body.contains(target)) target = null; const f = document.activeElement; if (!target && pickable(f)) target = pickable(f); queue(); }).observe(document.getElementById('ui'), { childList: true, subtree: true });
  setInterval(() => { if (target) queue(); }, 250); // follows items that animate or reflow
})();
