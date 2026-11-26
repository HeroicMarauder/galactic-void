// Galactic Void — one filter bar for every list: tabs with counts, a search box and a sort, in
// the Vault's style. Used by Vesper's Trade, the Star Cores screen and the Gear inventory.
(function () {
  const GV = window.GV;
  const esc = (s) => GV.menus.esc(s);
  const F = (GV.filters = {});
  // tabs: [{ id, name, icon, n }]; sorts: [[value, label]]; checks: [{ id, label, on }]
  F.bar = function (o) {
    const tabs = (o.tabs || []).map((t) => `<button class="tab ${o.tab === t.id ? 'sel' : ''}" data-f="tab" data-t="${t.id}" ${t.n === 0 && t.id !== 'all' && o.dimEmpty !== false ? 'data-empty="1"' : ''}>${t.icon ? `<span class="fi">${t.icon}</span>` : ''}${esc(t.name)}${t.n ? ` <i>${t.n}</i>` : ''}</button>`).join('');
    const sorts = o.sorts ? `<select data-fsort="1">${o.sorts.map(([v, l]) => `<option value="${v}" ${o.sort === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>` : '';
    const checks = (o.checks || []).map((c) => `<label class="fchk"><input type="checkbox" data-fchk="${c.id}" ${c.on ? 'checked' : ''}><span>${esc(c.label)}</span></label>`).join('');
    return `<div class="fbar ${o.cls || ''}" data-fbar="${o.id}">
      ${tabs ? `<div class="vtabs tabs ftabs">${tabs}</div>` : ''}
      <div class="vtools ftools"><input data-fq="1" type="search" placeholder="${esc(o.placeholder || 'Search names and stats')}" value="${esc(o.q || '')}" autocomplete="off">${sorts}${checks}</div>
    </div>`;
  };
  // Wire a bar that's on screen. h: { tab(id), q(text), sort(v), check(id, on) } each re-renders.
  F.bind = function (id, h) {
    const root = document.querySelector(`#ui [data-fbar="${id}"]`);
    if (!root) return;
    root.querySelectorAll('[data-f=tab]').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); h.tab && h.tab(b.dataset.t); }));
    const q = root.querySelector('[data-fq]');
    if (q) q.addEventListener('input', () => {
      const v = q.value, pos = q.selectionStart;
      h.q && h.q(v.trim().toLowerCase());
      const q2 = document.querySelector(`#ui [data-fbar="${id}"] [data-fq]`);
      if (q2) { q2.focus(); try { q2.setSelectionRange(pos, pos); } catch (e) {} }
    });
    const s = root.querySelector('[data-fsort]');
    if (s) s.addEventListener('change', () => h.sort && h.sort(s.value));
    root.querySelectorAll('[data-fchk]').forEach((c) => c.addEventListener('change', () => h.check && h.check(c.dataset.fchk, c.checked)));
  };
  // Does any of these strings contain the query?
  F.match = (q, ...parts) => !q || parts.join(' ').toLowerCase().includes(q);
})();
