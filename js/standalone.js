// Galactic Void — running as its own website (not inside Claude). Points the soundtrack at the music
// files that ship beside the game, gives "Download save file" a plain browser download, and words the
// Claude-only features (cloud saves, guilds, the friends directory) for this version.
(function () {
  const GV = window.GV; if (!GV || !GV.standalone) return;
  document.documentElement.classList.add('standalone');
  const slug = (s) => String(s).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (GV.OST) for (const t of GV.OST) t.f = `music/${slug(t.a)}/${slug(t.n)}.m4a`;
  addEventListener('load', () => {
    if (GV.sync) GV.sync.downloads = {
      save: async ({ filename, data }) => {
        const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: filename }); document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      },
    };
  });
})();

// ---- account badge (web version): sign in with Google for cloud saves, guilds and friends ----
(function () {
  const GV = window.GV; if (!GV || !GV.standalone) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function badge() {
    const S = GV.supa;
    const box = document.createElement('div'); box.className = 'acct';
    if (!S) { box.innerHTML = '<span class="acct-note">Offline copy · saves stay in this browser</span>'; return box; }
    if (S.status === 'starting') box.innerHTML = '<span class="acct-note">Connecting…</span>';
    else if (S.user) {
      const name = (S.profile && S.profile.name) || (S.user.user_metadata && S.user.user_metadata.full_name) || 'Pilot';
      const av = (S.profile && S.profile.avatar_url) || '';
      box.innerHTML = `${av ? `<img src="${esc(av)}" alt="" referrerpolicy="no-referrer">` : '<i></i>'}<div><b>${esc(name)}</b><span>Cloud saves · guilds · friends</span></div><button class="ghost" data-acct="out">Sign out</button>`;
    } else box.innerHTML = `<button class="gbtn" data-acct="in"><svg viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z"/></svg>Sign in with Google</button><span class="acct-note">${esc(S.err || 'for cloud saves, guilds and friends')}</span>`;
    box.addEventListener('click', (e) => { const b = e.target.closest('[data-acct]'); if (!b) return; e.stopPropagation(); if (b.dataset.acct === 'in') S.signIn(); else S.signOut(); });
    return box;
  }
  const place = () => { const t = document.querySelector('#ui .title'); if (!t) return; const old = t.querySelector('.acct'); const b = badge(); b.insertAdjacentHTML('beforeend', '<a class="acct-priv" href="privacy.html" target="_blank" rel="noopener">Privacy</a>'); old ? old.replaceWith(b) : t.appendChild(b); };
  addEventListener('load', () => {
    const M = GV.menus, t0 = M.title;
    M.title = function () { const r = t0.apply(this, arguments); place(); return r; };
    place();
  });
  document.addEventListener('gv-auth', place);
})();
