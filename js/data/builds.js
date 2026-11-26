// Galactic Void — shareable builds. A build code carries a class, passive tree, ascendancy and
// skill bar (Star Cores plus their Augments). Importing never gives you anything you don't own:
// it lays out the tree as far as your points reach and slots the cores and augments you have.
(function () {
  const GV = window.GV;
  const PREFIX = 'GVB1:';
  const b64e = (s) => btoa(unescape(encodeURIComponent(s)));
  const b64d = (s) => decodeURIComponent(escape(atob(s)));

  GV.builds = {
    exportCode(name) {
      const d = GV.save.data, inv = GV.inv;
      const bar = inv.barGems().map((g) => (g ? { id: g.id, s: g.sup.map((u) => { const x = d.sups.find((y) => y.uid === u); return x ? x.id : null; }) } : null));
      const o = { n: (name || '').slice(0, 30), c: d.cls, tv: GV.TREE.VER, av: GV.asc && GV.asc.VER, p: d.passives, a: d.asc && d.asc.sub ? { s: d.asc.sub, n: d.asc.nodes } : null, b: bar, r: d.level };
      return PREFIX + b64e(JSON.stringify(o)).replace(/=+$/, '');
    },
    parse(code) {
      code = String(code || '').trim().replace(/\s+/g, '');
      if (!code.startsWith(PREFIX)) throw new Error('That isn\'t a Galactic Void build code (they start with GVB1:).');
      let o;
      try { o = JSON.parse(b64d(code.slice(PREFIX.length))); } catch (e) { throw new Error('That build code is damaged. Copy it again.'); }
      if (!o || !GV.CLASSES[o.c] || !Array.isArray(o.p) || !Array.isArray(o.b)) throw new Error('That build code is incomplete.');
      return o;
    },
    // What applying would do, for the preview.
    preview(o) {
      const d = GV.save.data, T = GV.TREE;
      const sameCls = o.c === d.cls;
      const oldTree = (o.tv || 1) !== T.VER;
      const want = oldTree ? 0 : o.p.filter((id) => T.nodes[id]).length - 1;
      const cores = o.b.map((x) => {
        if (!x || !GV.GEMS[x.id]) return null;
        const own = d.gems.some((g) => g.id === x.id);
        return { id: x.id, own, sups: (x.s || []).filter(Boolean).map((sid) => ({ id: sid, own: d.sups.some((s) => s.id === sid) })) };
      });
      return { oldTree, name: o.n, cls: o.c, sameCls: sameCls && !oldTree, rank: o.r, nodes: want, canNodes: Math.min(want, T.total()), cost: T.resetCost(), cores, asc: o.a };
    },
    apply(o, opts = {}) {
      const d = GV.save.data, T = GV.TREE, inv = GV.inv, out = { nodes: 0, cores: 0, augs: 0, missing: [] };
      // Tree: same class only. Costs the normal tree reset.
      if (opts.tree && o.c === d.cls && (o.tv || 1) === T.VER) {
        const c = T.resetCost();
        if (d.memories < c) throw new Error(`Rebuilding the tree costs ${c} ✦ (the normal reset cost).`);
        d.memories -= c;
        d.passives = [T.root()];
        const target = new Set(o.p.filter((id) => T.nodes[id]));
        // Grow outward from the root through the build's nodes, nearest first, until points run out.
        let grew = true;
        while (grew && T.points() > 0) {
          grew = false;
          for (const id of d.passives.slice()) {
            for (const nb of T.nodes[id].adj) {
              if (T.points() <= 0) break;
              if (target.has(nb) && !d.passives.includes(nb)) { d.passives.push(nb); out.nodes++; grew = true; }
            }
          }
        }
      }
      // Skill bar: put matching owned cores in the same slots, then plug matching spare augments.
      if (opts.cores) {
        const used = new Set();
        o.b.forEach((x, i) => {
          if (!x || !GV.GEMS[x.id]) return;
          const g = d.gems.filter((g) => g.id === x.id && !used.has(g.uid)).sort((a, b) => b.lvl - a.lvl)[0];
          if (!g) { out.missing.push(GV.GEMS[x.id].name); return; }
          used.add(g.uid); inv.equip(i, g.uid); out.cores++;
          (x.s || []).forEach((sid, k) => {
            if (!sid || k >= g.sockets) return;
            const free = inv.freeSups().find((s) => s.id === sid);
            if (free) { inv.socket(g, k, free.uid); out.augs++; } else if (GV.SUPPORTS[sid]) out.missing.push(GV.SUPPORTS[sid].name);
          });
        });
      }
      GV.save.write();
      return out;
    },
  };
})();
