// Galactic Void — core utilities. Every module hangs off window.GV.
(function () {
  const GV = (window.GV = window.GV || {});

  GV.util = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    // Seeded RNG (mulberry32) so every stage and system is reproducible.
    rng(seed) {
      let a = seed >>> 0;
      return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    hash(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    },
    // Overlap with a tiny epsilon so bodies resting exactly on a surface don't count as inside it.
    ov(a, b) {
      return (
        a.x < b.x + b.w - 0.01 &&
        a.x + a.w > b.x + 0.01 &&
        a.y < b.y + b.h - 0.01 &&
        a.y + a.h > b.y + 0.01
      );
    },
    circRect(cx, cy, r, b) {
      const nx = Math.max(b.x, Math.min(cx, b.x + b.w));
      const ny = Math.max(b.y, Math.min(cy, b.y + b.h));
      return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < r * r;
    },
    pick: (r, arr) => arr[Math.floor(r() * arr.length)],
    range: (r, a, b) => a + r() * (b - a),
    irange: (r, a, b) => Math.floor(a + r() * (b - a + 1)),
    weighted(r, obj) {
      let total = 0;
      for (const k in obj) total += obj[k];
      let v = r() * total;
      for (const k in obj) {
        v -= obj[k];
        if (v <= 0) return k;
      }
      return Object.keys(obj)[0];
    },
    noise(x) {
      const s = Math.sin(x * 12.9898 + 78.233) * 43758.5453;
      return s - Math.floor(s);
    },
    roman(n) {
      const m = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
      let out = '';
      for (const [v, s] of m) while (n >= v) { out += s; n -= v; }
      return out;
    },
  };
})();
