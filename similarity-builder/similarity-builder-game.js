// Similarity Builder - game logic (math engine, level settings, runner physics, drawing, menus).
// Loaded by similarity-builder.html. Level rules are all in one place: search for "LEVEL SETTINGS".
// A teacher-facing overview of every level with live sample questions is at similarity-builder.html?levels
(() => {
'use strict';
const W = 960, H = 540, GROUND = 410;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

/* ===================== MATH ENGINE (whole numbers only) ===================== */
const COLORS = ['#2f80ed', '#f2994a', '#1e9e57', '#9b51e0', '#e0245e', '#00a3a3'];
const COLNAME = ['blue', 'orange', 'green', 'purple', 'pink', 'teal'];
// pixels per foot: 10 when it fits; otherwise the closest option that keeps the gap 120-400 px wide (so gap width follows the bridge's real base length)
const PPF_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 40];
const fmt = v => String(Math.round(v * 100) / 100);

const TRI_SETS = [[3,4,5],[5,12,13],[6,8,10],[8,15,17],[4,5,6],[5,6,7],[6,7,9],[4,6,8],[5,5,6],[6,9,10],[7,8,9],[3,5,6]];
const TRAP_SETS = [[10,4,5],[12,6,5],[9,3,5],[8,4,3],[12,8,3],[14,8,5]];
const RT_TRIPLES = [[3,4,5],[4,3,5],[5,12,13],[6,8,10]];                 // [run, rise, slant]
const HOUSE_SETS = [[6,4,5],[8,3,5],[12,8,10],[16,6,10]];                 // [width, roof rise, roof side]
const ELL_SETS = [[8,3,4,6],[10,4,6,8],[12,4,6,9],[10,3,7,7],[9,3,5,7],[12,5,8,9]]; // [a, c, b, d]
const TEE_SETS = [[12,3,4,9],[10,2,4,7],[12,4,6,9],[14,3,4,10],[8,2,2,6],[12,3,6,8]];   // [bar width, bar height, stem width, total height]
const ARROW_SETS = [[6,8,10],[8,6,10]];                                                  // [half head width, head rise, head slant]
const ARROW_SHAFTS = [4,6,8];
const ISO_SETS = [[6,5],[8,5],[4,3],[12,10],[10,13]];                                   // [base, leg]
const R3 = Math.sqrt(3) / 2;

// Each shape: name, bridge name, label = edges that may carry a number, cmap = edge -> color (same color = same kind of side),
// classes = groups of edges that are equal in length (worked out from cmap below; used for the tick marks)
const SHAPES = {
  tee: {
    name: 'T-shapes', single: 'T-shape', bridge: 'T-Beam Bridge', label: [0,1,2,3,4], cmap: [0,1,2,3,4,3,2,1],
    brace: [[0,3],[1,6],[3,5],[6,4]],
    make() {
      const [a, c, s, d] = pick(TEE_SETS), l = (a - s) / 2, r = l + s;      // an upside-down T: wide bar on the deck, stem on top
      return { pts: [[0,0],[a,0],[a,c],[r,c],[r,d],[l,d],[l,c],[0,c]], lens: [a, c, l, d - c, s, d - c, l, c] };
    }
  },
  arrow: {
    name: 'arrows', single: 'arrow', bridge: 'Arrow Bridge', label: [0,1,2,3], cmap: [0,1,2,3,3,2,1],
    brace: [[0,2],[1,6],[5,3],[6,4],[2,4]],
    make() {
      const [hw, rise, sl] = pick(ARROW_SETS), s = pick(ARROW_SHAFTS), e = hw - s / 2, h1 = rnd(3, 5);
      return { pts: [[0,0],[s,0],[s,h1],[s+e,h1],[s/2,h1+rise],[-e,h1],[0,h1]], lens: [s, h1, e, sl, sl, e, h1] };
    }
  },
  stair: {
    name: 'staircases', single: 'staircase', bridge: 'Staircase Bridge', label: [0,1,2,3], cmap: [0,1,2,3,2,3,2,3],
    brace: [[0,2],[1,5],[0,6]],
    make() {
      const w = rnd(2, 4), t = rnd(2, 3);
      return { pts: [[0,0],[3*w,0],[3*w,3*t],[2*w,3*t],[2*w,2*t],[w,2*t],[w,t],[0,t]], lens: [3*w, 3*t, w, t, w, t, w, t] };
    }
  },
  rtrap: {
    name: 'right trapezoids', single: 'right trapezoid', bridge: 'Ramp Bridge', label: [0,1,2,3], cmap: [0,1,2,3],
    make() {
      const [d, h, s] = pick(RT_TRIPLES), c = rnd(3, 8), a = c + d;         // top c, bottom a, left wall h, slanted side s
      return { pts: [[0,0],[a,0],[c,h],[0,h]], lens: [a, s, c, h] };
    }
  },
  house: {
    name: 'pentagons', single: 'pentagon', bridge: 'Gable Bridge', label: [0,1,2], cmap: [0,1,2,2,1],
    make() {
      const [w, r, s] = pick(HOUSE_SETS), h = rnd(2, 4);
      return { pts: [[0,0],[w,0],[w,h],[w/2,h+r],[0,h]], lens: [w, h, s, s, h] };
    }
  },
  ell: {
    name: 'L-shapes', single: 'L-shape', bridge: 'Stepped Bridge', label: [0,1,2,3,4,5], cmap: [0,1,2,3,4,5],
    make() {
      const [a, c, b, d] = pick(ELL_SETS);
      return { pts: [[0,0],[a,0],[a,c],[b,c],[b,d],[0,d]], lens: [a, c, a - b, d - c, b, d] };
    }
  },
  tri: {
    name: 'triangles', single: 'triangle', bridge: 'Truss Bridge', label: [0,1,2], cmap: [0,1,2],
    make() {
      const [a,b,c] = pick(TRI_SETS);                 // edges: c (bottom), a, b
      const x = (b*b + c*c - a*a) / (2*c), y = Math.sqrt(Math.max(0, b*b - x*x));
      return { pts: [[0,0],[c,0],[x,y]], lens: [c,a,b] };
    }
  },
  rect: {
    name: 'rectangles', single: 'rectangle', bridge: 'Box Girder Bridge', label: [0,1], cmap: [0,1,0,1], classes: [[0,2],[1,3]],
    make() {
      const w = rnd(4,10), h = rnd(2, w - 1);      // base is always the longer side so it can be a deck
      return { pts: [[0,0],[w,0],[w,h],[0,h]], lens: [w,h,w,h] };
    }
  },
  par: {
    name: 'parallelograms', single: 'parallelogram', bridge: 'Leaning Span Bridge', label: [0,1], cmap: [0,1,0,1], classes: [[0,2],[1,3]],
    make() {
      const a = rnd(6,10), b = rnd(3, Math.min(a - 1, 8));
      const dx = b * 0.5, dy = b * R3;
      return { pts: [[0,0],[a,0],[a+dx,dy],[dx,dy]], lens: [a,b,a,b] };
    }
  },
  trap: {
    name: 'trapezoids', single: 'isosceles trapezoid', bridge: 'Arch Truss Bridge', label: [0,1,2], cmap: [0,1,2,1], classes: [[1,3],[0],[2]],
    make() {
      const [a,c,l] = pick(TRAP_SETS);
      const d = (a - c) / 2, h = Math.sqrt(l*l - d*d);
      return { pts: [[0,0],[a,0],[a-d,h],[d,h]], lens: [a,l,c,l] };
    }
  },
  sq: {
    name: 'squares', single: 'square', bridge: 'Square Span', label: [0,1,2,3], cmap: [0,0,0,0], classes: [[0,1,2,3]],
    make() { const s = rnd(2, 8); return { pts: [[0,0],[s,0],[s,s],[0,s]], lens: [s,s,s,s] }; }
  },
  rhomb: {
    name: 'rhombuses', single: 'rhombus', bridge: 'Diamond Bridge', label: [0,1,2,3], cmap: [0,0,0,0], classes: [[0,1,2,3]],
    make() { const s = rnd(2, 8); return { pts: [[0,0],[s,0],[s*1.5,s*R3],[s*.5,s*R3]], lens: [s,s,s,s] }; }
  },
  isotri: {
    name: 'isosceles triangles', single: 'isosceles triangle', bridge: 'Gable Truss', label: [0,1,2], cmap: [0,1,1], classes: [[1,2],[0]],
    make() {
      const [b, l] = pick(ISO_SETS), h = Math.sqrt(l*l - b*b/4);
      return { pts: [[0,0],[b,0],[b/2,h]], lens: [b,l,l] };
    }
  },
  equitri: {
    name: 'equilateral triangles', single: 'equilateral triangle', bridge: 'Delta Bridge', label: [0,1,2], cmap: [0,0,0], classes: [[0,1,2]],
    make() { const s = rnd(2, 8); return { pts: [[0,0],[s,0],[s/2,s*R3]], lens: [s,s,s] }; }
  }
};

// Groups of sides that are equal in length (they share a color): used for the tick marks and to pick a "twin" of the missing side.
for (const s of Object.values(SHAPES)) {
  const g = {}; s.cmap.forEach((c, i) => (g[c] = g[c] || []).push(i)); s.classes = Object.values(g);
}

/* ---- LEVEL SETTINGS (edit these!) ----
   Level 1: find the SCALE FACTOR between two dilated figures (triangles and rectangles only, scale factor 1-5, small side lengths)
   Level 2: the scale factor is given: multiply OR divide to find a missing side (the missing side is spotlighted)
   Level 3: figures are turned / flipped, no scale factor is shown and only ONE pair of matching sides is labeled, so you find k first;
            tick marks and colors show which sides are equal
   Level 4: nested & overlapping triangles, and "Similar or Not Similar?"
   Level 5: every kind of question mixed together (including FRACTIONAL scale factors like 3/2 or 2/3), plus ALGEBRA in the sides (solve for x) */
const MAX_LEVEL = 5;
// which kinds of question a level asks (a kind listed twice is asked twice as often)
//   scale = find k   up / down = multiply / divide to a missing side   pair = find k from one pair, then the missing side
//   fup / fdown = like up / down with a fractional scale factor   nest = nested & overlapping triangles   sim = similar or not   alg = solve for x
const KINDS_BY_LEVEL = [
  ['scale'],
  ['up', 'down'],
  ['pair'],
  ['nest', 'nest', 'sim', 'sim'],
  ['scale', 'up', 'down', 'pair', 'fup', 'fdown', 'nest', 'sim', 'alg', 'alg', 'alg']
];
const SHAPES_L2 = ['tri', 'rect', 'par', 'trap', 'rtrap', 'house'];                      // (no staircase here: too many small sides to number without crowding)
const KIND_CFG = {
  scale: { level: 1, shapes: ['tri', 'rect'], ks: [1, 2, 3, 4, 5], units: [1], maxS: 8, maxB: 40 },   // pre-image side capped at 8 so even ×4/×5 keeps both numbers small
  ud:    { level: 2, shapes: SHAPES_L2, ks: [2, 3, 4], units: [1], maxS: 12, maxB: 48 },
  pair:  { level: 3, shapes: ['tri', 'rect', 'par', 'trap', 'rtrap', 'house', 'stair', 'ell', 'tee', 'arrow', 'isotri'], ks: [2, 3, 4, 5], units: [5], maxS: Infinity, maxB: 100, friendly: true, turn: true },
  frac:  { level: 5, shapes: SHAPES_L2, fracs: [[3, 2], [3, 2], [4, 3], [5, 2]], fracsDown: [[3, 2], [3, 2], [4, 3], [5, 2], [2, 1], [3, 1], [4, 1], [5, 1]], maxS: 30, maxB: 60, easyNums: true },
  alg:   { level: 5, shapes: ['tri', 'rect'], ks: [2, 3, 4], units: [1], maxS: 9, maxB: 30 },   // simple shapes and small numbers - the algebra step is the challenge here, not the geometry
  sim:   { level: 4, shapes: SHAPES_L2, ks: [2, 3, 4], maxS: 12, maxB: 48 }
};
const SECONDS_BETWEEN_QUESTIONS = 10;                          // about how long you run (dodging obstacles) between two questions
const METERS_PER_LEVEL = 1000;                           // Level 2 starts at 1000 m, Level 3 at 2000 m ... Level 5 at 4000 m
const levelForMeters = m => Math.min(MAX_LEVEL, 1 + Math.floor(m / METERS_PER_LEVEL));
const SIM_YES = 'Similar', SIM_NO = 'Not Similar';                                       // the two answer buttons of a "Similar or not?" question

// pixels per foot that keeps the gap 120-400 px wide and the finished bridge on screen (0 = this size does not fit)
function fitPPF(lensB0, heightFt) {
  const fits = PPF_OPTIONS.filter(o => lensB0 * o >= 120 && lensB0 * o <= 400);
  if (!fits.length) return 0;
  const ppf = fits.reduce((a, b) => Math.abs(b - 10) < Math.abs(a - 10) ? b : a);         // prefer 10 px per foot so gap width tracks real length
  return heightFt * ppf > 330 ? 0 : ppf;
}
// a ONE-STEP algebra expression that equals `v` for a small whole-number x, for level 5: either "x + c" / "x − c"
// (undo with one subtraction) or just "mx" (undo with one division) - never both together, and x, m and c all stay small.
function makeExpr(v) {
  const opts = [];
  for (let x = 2; x <= 9; x++) { const c = v - x; if (c !== 0) opts.push({ x, m: 1, c }); }                        // one-step: subtract c from both sides
  for (let m = 2; m <= 6; m++) { const x = v / m; if (Number.isInteger(x) && x >= 2 && x <= 9) opts.push({ x, m, c: 0 }); }   // one-step: divide both sides by m
  if (!opts.length) return null;
  const o = pick(opts);
  return { x: o.x, m: o.m, c: o.c, val: v, expr: (o.m === 1 ? '' : o.m) + 'x' + (o.c ? (o.c > 0 ? ' + ' + o.c : ' − ' + (-o.c)) : '') };
}

function genProblem(level, ksOverride, forceKind) {                    // forceKind (Practice mode): only make this kind of question
  let kind = forceKind || pick(KINDS_BY_LEVEL[level - 1]);
  if (kind === 'frac') kind = pick(['fup', 'fdown']);
  for (let n = 0; n < 40; n++) {
    const P = kind === 'nest' ? genNest() : kind === 'sim' ? genSim() : genShapes(kind);
    if (P) return P;
  }
  return genShapes('scale');
}

// scale / up / down / pair / fup / fdown / alg: two similar figures, one side missing (or the scale factor)
function genShapes(kind) {
  // 'alg' uses the plain, every-side-shown labeling (like level 2) rather than the harder find-k-yourself one -
  // the algebra step is the new challenge, so the scale factor itself stays obvious.
  const isScale = kind === 'scale', isFrac = kind === 'fup' || kind === 'fdown', isPair = kind === 'pair';
  const C = KIND_CFG[isScale ? 'scale' : isFrac ? 'frac' : isPair ? 'pair' : kind === 'alg' ? 'alg' : 'ud'];
  let fracPick = null;
  for (let n = 0; n < 1500; n++) {
    const key = pick(C.shapes), sh = SHAPES[key], base = sh.make();
    const type = isScale ? 'scale' : (kind === 'up' || kind === 'fup') ? 'up' : (kind === 'down' || kind === 'fdown') ? 'down' : pick(['up', 'down']);
    let k, u = 1, frac = null, lensS, lensB;
    if (isFrac) { if (n % 100 === 0) fracPick = pick(type === 'down' ? C.fracsDown : C.fracs);      // one factor at a time, so every factor gets its turn
      frac = fracPick; k = frac[0] / frac[1]; lensS = base.lens.map(v => v * frac[1]); lensB = base.lens.map(v => v * frac[0]); }      // (shrinking also allows 1/2, 1/3, 1/4 and 1/5)
    else { k = pick(C.ks); u = pick(C.units); lensS = base.lens.map(v => v * u); lensB = lensS.map(v => v * k); }      // small figure / big figure (whole numbers)
    if (Math.max(...lensS) > C.maxS || Math.max(...lensB) > C.maxB) continue;
    if (C.easyNums && ![...lensS, ...lensB].every(v => v <= 30 || v % 10 === 0)) continue;             // every side is 30 or less, or a multiple of 10
    if (C.friendly && ![...lensS, ...lensB].every(v => v < 30 ? v % 5 === 0 : v % 10 === 0)) continue;   // multiples of 5 under 30, multiples of 10 from 30 up
    const ppf = fitPPF(lensB[0], Math.max(...base.pts.map(p => p[1])) * lensB[0] / base.lens[0]); if (!ppf) continue;
    let ti = -1, src = 0, showS = [], showB = [], pair = -1;
    if (isScale) { showS = sh.label.slice(); showB = sh.label.slice(); }
    else if (isPair) {                                                    // only ONE pair of matching sides is labeled (plus the twin of the missing side)
      const cand = sh.classes.filter(c => c.some(i => sh.label.includes(i)));
      if (cand.length < 2) continue;
      const A = pick(cand), a = pick(A.filter(i => sh.label.includes(i)));
      const others = cand.filter(c => c !== A), multi = others.filter(c => c.length > 1);
      const T = multi.length && Math.random() < .7 ? pick(multi) : pick(others);
      src = pick(T.filter(i => sh.label.includes(i)));
      ti = T.length > 1 ? pick(T.filter(i => i !== src)) : src;
      if (lensS[a] === lensS[ti] || lensB[a] === lensB[ti]) continue;
      pair = a;
      if (type === 'up') { showS = [...new Set([a, src])]; showB = [a]; } else { showB = [...new Set([a, src])]; showS = [a]; }
    } else {                                                              // every side of both shapes is numbered except the one missing side
      ti = pick(sh.label); src = ti;
      if (sh.label.some(j => j !== ti && base.lens[j] === base.lens[ti])) continue;         // another numbered side is the same length: that would give the answer away
      showS = sh.label.slice(); showB = sh.label.slice();
    }
    let answer = type === 'scale' ? k : type === 'up' ? lensB[ti] : lensS[ti], alg = null;
    if (isFrac && ((type === 'up' ? lensS[src] : lensB[src]) > 11 || answer > 11)) continue;       // the numbers being multiplied and divided stay within the 11 x 11 times table
    if (kind === 'alg') { alg = makeExpr(answer); if (!alg) continue; answer = alg.x; }
    return {
      type, kind, level: C.level, shape: key, shapeName: sh.name, pts: base.pts, lens: base.lens, lensS, lensB, k, u, ppf, frac, alg, pair,
      ti, src, showS, showB, answer, flip: !!C.turn && Math.random() < 0.5, rot: C.turn ? pick([90, 180, 270]) : 0,        // turned; sometimes mirrored too
      cmap: sh.cmap, classes: sh.classes, ticks: isPair, focus: !isScale && !isPair, noArrows: isPair
    };
  }
  return null;
}

// "Similar or Not Similar?": two figures with every side numbered. Similar ones are scaled copies; the others are the same kind of shape with sides that do not scale together.
function genSim() {
  const C = KIND_CFG.sim, similar = Math.random() < .5;
  for (let n = 0; n < 1500; n++) {
    const key = pick(C.shapes), sh = SHAPES[key], b1 = sh.make(), k = pick(C.ks);
    let b2 = b1;
    if (!similar) { b2 = sh.make(); const r = b2.lens.map((v, i) => v / b1.lens[i]); if (r.every(v => Math.abs(v - r[0]) < 1e-9)) continue; }
    const lensS = b1.lens.slice(), lensB = b2.lens.map(v => v * k);
    if (Math.max(...lensS) > C.maxS || Math.max(...lensB) > C.maxB) continue;
    const ppf = fitPPF(lensB[0], Math.max(...b2.pts.map(p => p[1])) * lensB[0] / b2.lens[0]); if (!ppf) continue;
    const sum = a => a.reduce((s, v) => s + v, 0);
    return {
      type: 'sim', kind: 'sim', level: C.level, shape: key, shapeName: sh.name, pts: b2.pts, ptsS: b1.pts, lens: b2.lens, lensS, lensB, k: clamp(sum(lensB) / sum(lensS), 1.3, 4), u: 1, ppf,
      ti: -1, src: 0, showS: sh.label.slice(), showB: sh.label.slice(), answer: similar ? 'yes' : 'no', flip: Math.random() < .5, rot: pick([90, 180, 270]),
      cmap: sh.cmap, classes: sh.classes, ticks: false, focus: false, noArrows: true, pair: -1, frac: null, alg: null
    };
  }
  return null;
}

// Nested and overlapping triangles: a line parallel to one side makes a small triangle inside (or, where two lines cross, a "bow tie" of two
// triangles that overlap at a corner). The parallel lines make the triangles similar; find the missing length.
// The scale factor between the small and big triangle is always a WHOLE number (2-5), so every step - reducing the pair of given
// sides, then multiplying or dividing - is a fact the student can do in their head instead of reducing an odd fraction.
const NEST_K = [2, 3, 4, 5];
function triPts(base, l1, l2) {                                       // a triangle with the given base and two other sides
  const x = (l2 * l2 + base * base - l1 * l1) / (2 * base), y = Math.sqrt(Math.max(0, l2 * l2 - x * x));
  return [[0, 0], [base, 0], [x, y]];
}
function genNest() {
  const variant = pick(['nested', 'hourglass']);
  for (let n = 0; n < 800; n++) {
    let p = 1, q = pick(NEST_K);
    const m = rnd(2, 6), w = rnd(2, 6), l = rnd(2, 6), side = pick(['AC', 'BC']);
    if (!(m < l + w && l < m + w && w < m + l)) continue;               // the triangle has to exist
    let vals, Q;
    if (variant === 'nested') { Q = q; vals = { AD: p * m, DB: (q - p) * m, DE: p * w, BC: q * w }; }
    else {
      if (Math.random() < .5) [p, q] = [q, p];
      Q = Math.max(p, q);
      vals = side === 'AC' ? { AB: p * w, DE: q * w, AC: p * m, CD: q * m } : { AB: p * w, DE: q * w, BC: p * m, CE: q * m };
    }
    const keys = Object.keys(vals);
    if (Math.max(...keys.map(k => vals[k])) > 36 || Math.min(...keys.map(k => vals[k])) < 2) continue;
    // For "nested", AD can never be the unknown: finding it from DB, DE and BC needs solving DB = AD×(k-1) for AD, which isn't
    // a clean multiply/divide/add-or-subtract step - every other position (including DB itself) always is.
    const unk = pick(variant === 'nested' ? keys.filter(k => k !== 'AD') : keys), big = [Q * w, Q * l, Q * m], pts = triPts(big[0], big[1], big[2]);
    const ppf = fitPPF(big[0], pts[2][1]); if (!ppf) continue;
    return {
      type: 'nest', kind: 'nest', level: 4, shape: 'tri', shapeName: 'triangles', pts, lens: big, lensS: big, lensB: big, k: 1, u: 1, ppf,
      ti: -1, src: 0, showS: [], showB: [], answer: vals[unk], flip: false, rot: 0, cmap: SHAPES.tri.cmap, classes: [], ticks: false, focus: false, noArrows: true, pair: -1, frac: null, alg: null,
      nest: { variant, p, q, vals, unk, mir: Math.random() < .5, skew: pick([-50, -20, 0, 20, 50]), side }
    };
  }
  return null;
}

const gapFor = P => P.lensB[0] * P.ppf;                     // gap width = real base length of the big bridge x pixels-per-foot

// The kinds of questions Practice mode lets you pick from (choose as many as you like; they are mixed together).
// Each one is a level's question style; level 2 is split into its two halves (multiply / divide).
const PRACTICE_TYPES = [
  { id: 'scale', level: 1, kind: 'scale', name: 'Scale factor', desc: 'Find the scale factor.' },
  { id: 'up', level: 2, kind: 'up', name: 'Multiply', desc: 'Find the bigger side.' },
  { id: 'down', level: 2, kind: 'down', name: 'Divide', desc: 'Find the smaller side.' },
  { id: 'pair', level: 3, kind: 'pair', name: 'Turned and flipped', desc: 'Find k from one pair of sides.' },
  { id: 'nest', level: 4, kind: 'nest', name: 'Nested triangles', desc: 'Find the missing length.' },
  { id: 'sim', level: 4, kind: 'sim', name: 'Similar or not?', desc: 'Compare two figures.' },
  { id: 'frac', level: 5, kind: 'frac', name: 'Fractional scale factors', desc: 'Factors like 3/2, 2/3 or 1/4.' },
  { id: 'alg', level: 5, kind: 'alg', name: 'Algebra in the sides', desc: 'Solve for x.' }
];

const chip = (txt, col) => `<span class="chip" style="border-color:${col};color:${col}">${txt}</span>`;

// the worked steps, drawn with color chips (used on the wrong-answer card and the end-of-run list)
function stepsHTML(P) {
  const C = i => COLORS[P.cmap[i]];
  if (P.type === 'nest') return nestSteps(P);
  if (P.type === 'sim') {
    const rows = SHAPES[P.shape].label.map(i => { const r = P.lensB[i] / P.lensS[i]; return `<span style="white-space:nowrap">${chip(P.lensB[i], C(i))} ÷ ${chip(P.lensS[i], C(i))} = <b>${fmt(r)}</b></span>`; });
    return `<div style="display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:center">${rows.join('')}</div><div>${P.answer === 'yes' ? 'Every ratio is the same, so the figures are similar.' : 'The ratios are not all the same, so the figures are not similar.'}</div>`;
  }
  if (P.type === 'scale') return `<div>${chip(P.lensB[0], C(0))} ÷ ${chip(P.lensS[0], C(0))} = ${chip('×' + P.k, '#ff7a1a')}</div>`;
  const x = P.type === 'up' ? P.lensS[P.src] : P.lensB[P.src];
  const twin = P.src !== P.ti ? `<div>${chip(x, C(P.src))} <b style="font-size:26px">=</b> ${chip(x, C(P.ti))}</div>` : '';
  const kLine = P.pair >= 0 ? `<div>${chip(P.lensB[P.pair], C(P.pair))} ÷ ${chip(P.lensS[P.pair], C(P.pair))} = ${chip('k = ' + P.k, '#ff7a1a')}</div>` : '';   // one matching pair gives k
  const val = P.alg ? P.alg.val : P.answer;
  const f = P.frac ? (P.type === 'up' ? P.frac[0] + '/' + P.frac[1] : P.frac[1] + '/' + P.frac[0]) : P.k;
  const op = P.type === 'up' ? '×' : P.frac ? '×' : '÷';
  const algLine = P.alg ? `<div>${chip(P.alg.expr, C(P.ti))} = ${chip(val, C(P.ti))} &nbsp;➜&nbsp; ${chip('x = ' + P.answer, '#ff7a1a')}</div>` : '';
  if (P.frac) {                                                          // a fractional factor: multiply by the numerator first, then divide by the denominator
    const num = P.type === 'up' ? P.frac[0] : P.frac[1], den = P.type === 'up' ? P.frac[1] : P.frac[0];
    return twin + `<div>${chip(x, C(P.src))} × ${num} = ${chip(x * num, '#5b6485')}</div><div>${chip(x * num, '#5b6485')} ÷ ${den} = ${chip(val, C(P.ti))}</div>`;
  }
  return kLine + twin + `<div>${chip(x, C(P.src))} ${op} ${f} = ${chip(val, C(P.ti))}</div>` + algLine;
}
// the questions you missed, as pictures: both shapes with every side labeled and the scale-factor arrow, then your answer next to the right one
function missedHTML(list) {
  const last = list.slice(-4);
  if (!last.length) return '';
  return `<p style="text-align:left;font-weight:800;margin:6px 0 2px">📝 Questions you missed${list.length > last.length ? ` (last ${last.length})` : ''}:</p><div class="review">` +
    last.map(P => `<div class="miss">${pairSVG(P, true)}<div class="missLine">${P.timedOut ? '⏱ Time ran out' : '<span class="bad">❌ ' + ansText(P, P.userAns) + '</span>'} <span>➜</span> <span class="ok">✅ ${ansText(P, P.answer)}</span></div></div>`).join('') + `</div>`;
}
const ansText = (P, v) => P.type === 'scale' ? '×' + fmt(v) : P.type === 'sim' ? (v === 'yes' ? SIM_YES : SIM_NO) : P.alg ? 'x = ' + fmt(v) : fmt(v) + ' ft';

// Both figures in ONE picture, with a curved arrow for every side: from the pre-image side to its matching side on the image,
// the scale factor on top of the arrow (×k going small -> big, ÷k going big -> small; "×?" on level 1 while it is unknown).
// Arrows/pills use the side's own color so you can see which side goes where.
function pairSVG(P, reveal) {
  if (P.type === 'nest') return nestSVG(P, reveal);
  const A = figParts(P, 'model', reveal), Bp = figParts(P, 'bridge', reveal);
  const focus = !!P.focus;                                                              // levels 2 and 4: only the missing side's arrow
  const toSmall = P.type === 'down';
  const label = P.type === 'scale' && !reveal ? '×?' : P.frac ? '×' + (toSmall ? P.frac[1] + '/' + P.frac[0] : P.frac[0] + '/' + P.frac[1]) : (toSmall ? '÷' : '×') + P.k;
  const noArrows = P.type === 'sim' || (P.noArrows && !reveal);                    // no arrows and no scale factor: find it yourself (or just compare the figures)
  const edges = noArrows ? [] : focus ? [P.ti] : reveal ? SHAPES[P.shape].label.slice() : [...new Set([...P.showS, ...P.showB, ...(P.ti >= 0 ? [P.ti] : [])])].sort((a, b) => a - b);
  const OFFX = 340, VW = 600;
  const pre = toSmall ? Bp : A, img = toSmall ? A : Bp, preX = toSmall ? OFFX : 0, imgX = toSmall ? 0 : OFFX;
  // sides on the lower part of a shape get an arrow that dips DOWN beneath the shapes and then curves UP to the match;
  // every other side gets a gentle arch over the top. The arches hug the shapes so they stay calm.
  const isLow = i => (pre.mids[i].ny + img.mids[i].ny) / 2 > 0.35;
  const nLow = edges.filter(isLow).length, nUp = edges.length - nLow;
  const capH = focus && nUp ? 46 : 0, OFFY = noArrows ? 0 : capH + 22 + 20 * nUp, VH = OFFY + 190 + (nLow ? (focus ? 70 : 46) + 20 * nLow : 8);
  const topY = Math.min(pre.top, img.top), botY = Math.max(pre.bottom, img.bottom);
  let ru = 0, rl = 0;
  // panel titles: the shape you start from is the PRE-IMAGE; the one you move to (the one with the missing side) is the IMAGE
  const small = P.type === 'sim' ? 'Figure A' : toSmall ? 'Image' : 'Pre-image', big = P.type === 'sim' ? 'Figure B' : toSmall ? 'Pre-image' : 'Image';
  const font = 'font-family:Trebuchet MS,system-ui,sans-serif';
  let defs = '', paths = '', pills = '';
  const items = [];
  edges.forEach((i, r) => {
    const col = COLORS[P.cmap[i]], m1 = pre.mids[i], m2 = img.mids[i];
    const low = isLow(i), sgn = low ? 1 : -1, rank = low ? rl++ : ru++;
    // Every arrow runs straight from the NUMBER on the first shape to the matching NUMBER on the second: it leaves the edge of one
    // number and its head points right at the other. (If a side has no number on one shape, it uses the side's midpoint instead.)
    const lab = (m, X) => m.lx !== undefined ? { x: X + m.lx, y: OFFY + m.ly, hw: m.lw / 2 + 2, hh: m.lh / 2 + 2 }
      : { x: X + m.x + m.nx * 20, y: OFFY + m.y + m.ny * 20, hw: 4, hh: 4 };
    const A1 = lab(m1, preX), A2 = lab(m2, imgX);
    // lower arrows really dip below the shapes then rise to the match; the others arch over the top
    const apex = low ? Math.max(OFFY + botY + 32, (A1.y + A2.y) / 2 + 30) + rank * 20 : OFFY + topY - 32 - rank * 20;
    const apexF = low ? Math.max(apex, Math.max(A1.y, A2.y) + 34 + rank * 20) : Math.min(apex, Math.min(A1.y, A2.y) - 34 - rank * 20);
    const cx = (A1.x + A2.x) / 2, cy = 2 * apexF - (A1.y + A2.y) / 2;
    const edge = (L, tx, ty, extra) => { const ux = tx - L.x, uy = ty - L.y, l = Math.hypot(ux, uy) || 1, nx = ux / l, ny = uy / l;      // where a ray from the number's centre leaves its box
      const t = Math.min(L.hw / (Math.abs(nx) || 1e-6), L.hh / (Math.abs(ny) || 1e-6)) + extra; return { x: L.x + nx * t, y: L.y + ny * t }; };
    const S = edge(A1, cx, cy, 3), E = edge(A2, cx, cy, 7);
    const sx = S.x, sy = S.y, dx = E.x, dy = E.y;
    defs += `<marker id="ah${i}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${col}"/></marker>`;
    paths += `<path d="M${sx},${sy} Q${cx},${cy} ${dx},${dy}" fill="none" stroke="${col}" stroke-width="3.5" stroke-linecap="round" stroke-opacity=".9" marker-end="url(#ah${i})"/>`;
    items.push({ col, sx, sy, cx, cy, dx, dy });
  });
  // every arrow is drawn first, THEN all the scale-factor pills on top, so no arrow ever crosses over a pill.
  // A pill normally sits in the middle of its arrow; if that would touch another pill it slides along its own arrow instead.
  const hw = focus ? 32 : 26, hh = focus ? 17 : 12, placed = [];
  items.forEach(it => {
    const at = t => { const u = 1 - t; return { x: u*u*it.sx + 2*u*t*it.cx + t*t*it.dx, y: u*u*it.sy + 2*u*t*it.cy + t*t*it.dy }; };
    let pos = null;
    for (const t of [.5, .4, .6, .32, .68, .25, .75, .18, .82]) {
      const c = at(t);
      if (!placed.some(q => Math.abs(q.x - c.x) < hw * 2 + 6 && Math.abs(q.y - c.y) < hh * 2 + 6)) { pos = c; break; }
    }
    pos = pos || at(.5); placed.push(pos);
    pills += focus   // level 2: one clean, larger pill with nothing else around it
      ? `<rect x="${pos.x - 32}" y="${pos.y - 17}" width="64" height="34" rx="17" fill="${it.col}" stroke="#fff" stroke-width="3"/>` +
        `<text x="${pos.x}" y="${pos.y + 1}" text-anchor="middle" dominant-baseline="central" font-size="24" font-weight="900" fill="#fff" style="${font}">${label}</text>`
      : `<rect x="${pos.x - 26}" y="${pos.y - 12}" width="52" height="24" rx="12" fill="${it.col}" stroke="#fff" stroke-width="2"/>` +
        `<text x="${pos.x}" y="${pos.y + 1}" text-anchor="middle" dominant-baseline="central" font-size="16" font-weight="900" fill="#fff" style="${font}">${label}</text>`;
  });
  return `<svg class="pair" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="the two shapes with scale factor arrows">
    <defs>${defs}</defs>
    <rect x="0" y="${OFFY}" width="260" height="190" rx="14" fill="#f4f7ff"/><rect x="${OFFX}" y="${OFFY}" width="260" height="190" rx="14" fill="#f4f7ff"/>
    <text x="130" y="${OFFY + 17}" text-anchor="middle" font-size="14" font-weight="800" fill="#5b6485" style="${font}">${small}</text>
    <text x="${OFFX + 130}" y="${OFFY + 17}" text-anchor="middle" font-size="14" font-weight="800" fill="#5b6485" style="${font}">${big}</text>
    <g transform="translate(0,${OFFY})">${A.body}</g><g transform="translate(${OFFX},${OFFY})">${Bp.body}</g>
    ${paths}${pills}</svg>`;
}

// ---- nested / overlapping triangles (level 4): a line parallel to one side makes a small triangle inside the big one, or two crossing
// lines make a "bow tie" of two triangles that overlap at a corner. Parallel marks (>>) show which sides are parallel. ----
function nestSVG(P, reveal) {
  const N = P.nest, v = N.vals, VW = 360, VH = 240, font = 'font-family:Trebuchet MS,system-ui,sans-serif';
  const X = p => [N.mir ? VW - p[0] : p[0], p[1]], dirx = s => N.mir ? -s : s;
  const oC = COLORS[1], gC = COLORS[2], pC = COLORS[3], tC = COLORS[5], grey = '#7a84ad';
  const seg = (a, b, col, w) => { const A = X(a), B = X(b); return `<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`; };
  const poly = (ps, fill) => `<polygon points="${ps.map(p => X(p).join(',')).join(' ')}" fill="${fill}"/>`;
  const chev = (a, b, col) => {
    const A = X(a), B = X(b), dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux, mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
    return [-6, 5].map(o => { const cx = mx + ux * o, cy = my + uy * o;
      return `<path d="M${cx - ux * 4 + nx * 6},${cy - uy * 4 + ny * 6} L${cx + ux * 4},${cy + uy * 4} L${cx - ux * 4 - nx * 6},${cy - uy * 4 - ny * 6}" fill="none" stroke="${col}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`; }).join('');
  };
  const letter = (t, p, dx, dy) => { const q = X(p); return `<text x="${q[0] + dirx(dx)}" y="${q[1] + dy}" text-anchor="middle" dominant-baseline="central" font-size="17" font-weight="800" fill="#5b6485" style="${font}">${t}</text>`; };
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const away = (a, b, from, d) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, m = mid(a, b); let nx = -dy / l, ny = dx / l;   // a point d px off the side, on the side away from `from`
    if (nx * (from[0] - m[0]) + ny * (from[1] - m[1]) > 0) { nx = -nx; ny = -ny; } return [m[0] + nx * d, m[1] + ny * d]; };
  const num = (key, col, pt) => {
    const q = X(pt), isU = key === N.unk, txt = isU ? (reveal ? v[key] : '?') : v[key], w = String(txt).length > 1 ? 46 : 36;
    return isU ? `<rect x="${q[0] - w / 2}" y="${q[1] - 16}" width="${w}" height="32" rx="16" fill="${reveal ? col : '#ffd23f'}" stroke="#fff" stroke-width="3"/>` +
        `<text x="${q[0]}" y="${q[1] + 1}" text-anchor="middle" dominant-baseline="central" font-size="22" font-weight="900" fill="${reveal ? '#fff' : '#1d2340'}" style="${font}">${txt}</text>`
      : `<text x="${q[0]}" y="${q[1]}" text-anchor="middle" dominant-baseline="central" font-size="22" font-weight="900" fill="${col}" stroke="#fff" stroke-width="4" paint-order="stroke" style="${font}">${txt}</text>`;
  };
  let out = '';
  if (N.variant === 'nested') {
    const t = clamp(N.p / N.q, .3, .7), A = [130 + N.skew, 28], B = [40, 198], C = [320, 198];
    const D = [A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1])], E = [A[0] + t * (C[0] - A[0]), A[1] + t * (C[1] - A[1])], cen = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
    out = poly([A, B, C], '#e8eeff') + poly([A, D, E], '#fff1de') + seg(A, C, grey, 4) + seg(A, D, gC, 5) + seg(D, B, tC, 5) + seg(D, E, oC, 5) + seg(B, C, oC, 5) + chev(D, E, oC) + chev(B, C, oC) +
      num('AD', gC, away(A, D, cen, 24)) + num('DB', tC, away(D, B, cen, 24)) + num('BC', oC, [mid(B, C)[0], 224]) + num('DE', oC, [mid(D, E)[0], mid(D, E)[1] + (t < .55 ? 24 : -22)]) +
      letter('A', A, 0, -14) + letter('B', B, -13, 14) + letter('C', C, 13, 14) + letter('D', D, -17, 2) + letter('E', E, 17, 2);
  } else {
    const r = clamp(N.q / N.p, .5, 2), w = Math.min(200, 200 / r), Cx = 180, A = [Cx - w / 2, 42], B = [Cx + w / 2, 42], Cy = 42 + 156 / (1 + r), C = [Cx, Cy];
    const D = [Cx + r * (Cx - A[0]), Cy + r * (Cy - 42)], E = [Cx + r * (Cx - B[0]), Cy + r * (Cy - 42)];
    out = poly([A, B, C], '#e8eeff') + poly([C, D, E], '#fff1de') + seg(A, C, gC, 5) + seg(C, D, gC, 5) + seg(B, C, pC, 5) + seg(C, E, pC, 5) + seg(A, B, oC, 5) + seg(E, D, oC, 5) + chev(A, B, oC) + chev(E, D, oC) +
      num('AB', oC, [mid(A, B)[0], 17]) + num('DE', oC, [mid(E, D)[0], 224]) +
      (N.side === 'AC' ? num('AC', gC, away(A, C, B, 26)) + num('CD', gC, away(C, D, E, 26)) : num('BC', pC, away(B, C, A, 26)) + num('CE', pC, away(C, E, D, 26))) +
      letter('A', A, -12, -8) + letter('B', B, 12, -8) + letter('D', D, 13, 12) + letter('E', E, -13, 12) + letter('C', C, 0, -13);
  }
  return `<svg class="pair" style="max-width:440px;margin:0 auto" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="two similar triangles">${out}</svg>`;
}
// The worked steps for a nested / overlapping triangle question, spelled out as separate arithmetic lines instead of one
// proportion: find the scale factor first, then multiply or divide, then (for "nested") add or subtract from the total
// line to reach the missing segment - every line shows the actual numbers, not just the relationship.
const kLine = (big, small, col, k) => `<div>${chip(big, col)} ÷ ${chip(small, col)} = ${chip('k = ' + fmt(k), '#ff7a1a')}</div>`;
function nestSteps(P) {
  const N = P.nest, v = N.vals, oC = COLORS[1], gC = COLORS[2], pC = COLORS[3], tC = COLORS[5], sl = '#5b6485';
  if (N.variant === 'nested') {
    if (N.unk === 'DB') {                                       // the pure pair (DE, BC) is fully known - find k, scale AD up to the total, then subtract
      const k = v.BC / v.DE, AB = v.AD * k;
      return kLine(v.BC, v.DE, oC, k) +
        `<div>${chip(v.AD, gC)} × ${fmt(k)} = ${chip(fmt(AB), sl)}</div>` +
        `<div>${chip(fmt(AB), sl)} − ${chip(v.AD, gC)} = ${chip(v.DB, tC)}</div>`;
    }
    // DE or BC is unknown - the two known parts of the line (AD, DB) add to the total, which gives k, then scale the other pair
    const AB = v.AD + v.DB, k = AB / v.AD;
    const line3 = N.unk === 'BC' ? `<div>${chip(v.DE, oC)} × ${fmt(k)} = ${chip(v.BC, oC)}</div>` : `<div>${chip(v.BC, oC)} ÷ ${fmt(k)} = ${chip(v.DE, oC)}</div>`;
    return `<div>${chip(v.AD, gC)} + ${chip(v.DB, tC)} = ${chip(AB, sl)}</div>` + kLine(AB, v.AD, sl, k) + line3;
  }
  // hourglass: (AB, DE) and the other pair (AC/CD or BC/CE) scale by the exact same factor - whichever pair is fully
  // known gives k, then that k is applied straight to the known half of the pair that has the missing side.
  // AB/AC/BC always play the same role as each other (so do DE/CD/CE), but which of the two is actually BIGGER
  // depends on the random draw, so k is taken as (bigger ÷ smaller) - always a whole number - and the multiply-or-
  // divide direction is worked out from which named role turned out bigger, instead of ever showing a k under 1.
  const pRole = k => k === 'AB' || k === 'AC' || k === 'BC', pair2 = N.side === 'AC' ? ['AC', 'CD'] : ['BC', 'CE'];
  const targetKeys = (N.unk === 'AB' || N.unk === 'DE') ? ['AB', 'DE'] : pair2, knownKeys = targetKeys === pair2 ? ['AB', 'DE'] : pair2;
  const col = targetKeys === pair2 ? (N.side === 'AC' ? gC : pC) : oC;
  const [kp, kq] = pRole(knownKeys[0]) ? knownKeys : [knownKeys[1], knownKeys[0]];        // [p-role key, q-role key] of the known pair
  const kWhole = Math.max(v[kp], v[kq]) / Math.min(v[kp], v[kq]), qBigger = v[kq] >= v[kp];
  const knownCol = knownKeys === pair2 ? (N.side === 'AC' ? gC : pC) : oC;
  const targetKnownKey = targetKeys.find(k => k !== N.unk), targetVal = v[targetKnownKey];
  const unkIsQRole = !pRole(N.unk);
  const ans = unkIsQRole === qBigger ? targetVal * kWhole : targetVal / kWhole;
  return kLine(v[qBigger ? kq : kp], v[qBigger ? kp : kq], knownCol, kWhole) +
    `<div>${chip(targetVal, col)} ${unkIsQRole === qBigger ? '×' : '÷'} ${fmt(kWhole)} = ${chip(fmt(ans), col)}</div>`;
}

// wrong-answer card: mostly pictures - both figures with per-side arrows, and the math with matching colors
function solutionHTML(P) {
  const verdict = P.timedOut ? '⏱' : `<span class="bad">❌ ${ansText(P, P.userAns)} <small>${typeof P.userAns === 'number' ? (P.userAns < P.answer ? '(too small)' : '(too big)') : ''}</small></span>`;
  return `<div class="verdict">${verdict}<span class="arrow">➜</span><span class="ok">✅ ${ansText(P, P.answer)}</span></div>
    ${pairSVG(P, true)}
    <div class="steps">${stepsHTML(P)}</div>`;
}

/* ---- figure drawing (SVG) ---- */
function figSVG(P, which, reveal) {
  const f = figParts(P, which, reveal);
  return `<svg viewBox="0 0 ${f.VW} ${f.VH}" role="img" aria-label="${which} figure">${f.body}</svg>`;
}
// returns the drawing (no <svg> wrapper) plus the midpoint + outward direction of every side
function figParts(P, which, reveal) {
  const n = P.pts.length, VW = 260, VH = 190, pad = 48, isB = which === 'bridge';
  const ang = (isB ? P.rot : 0) * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang);
  const flip = isB && P.flip;
  const srcPts = !isB && P.ptsS ? P.ptsS : P.pts;                                    // (a "not similar" pair has two different shapes)
  let pts = srcPts.map(([x, y]) => { x = flip ? -x : x; y = -y; return [x*ca - y*sa, x*sa + y*ca]; });
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  // draw the two figures at (roughly) their true relative size: the big one fills the box, the small one shrinks by k^0.7
  const rel = isB ? 1 : Math.max(.34, Math.pow(1 / P.k, .7));
  const s = rel * Math.min((VW - 2*pad) / (maxX - minX || 1), (VH - 2*pad) / (maxY - minY || 1));
  const ox = VW/2 - (minX + maxX)/2 * s, oy = VH/2 - (minY + maxY)/2 * s;
  pts = pts.map(([x, y]) => [x*s + ox, y*s + oy]);
  const cx = pts.reduce((a, p) => a + p[0], 0) / n, cy = pts.reduce((a, p) => a + p[1], 0) / n;
  const lens = isB ? P.lensB : P.lensS, show = isB ? P.showB : P.showS;
  const qHere = (P.type === 'up' && isB) || (P.type === 'down' && !isB);            // which figure holds the "?"
  const focus = !!P.focus;                                                              // spotlight the missing side + its match
  const font = 'font-family:Trebuchet MS,system-ui,sans-serif';
  const mids = pts.map((a, i) => {
    const b = pts[(i + 1) % n], mx = (a[0]+b[0])/2, my = (a[1]+b[1])/2; let nx = mx - cx, ny = my - cy; const nl = Math.hypot(nx, ny) || 1;
    return { x: mx, y: my, nx: nx / nl, ny: ny / nl };
  });
  let out = `<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="#e8eeff" stroke="none"/>`;
  for (let i = 0; i < n; i++) {                                                      // right-angle marks
    const v0 = srcPts[i], p0 = srcPts[(i + n - 1) % n], q0 = srcPts[(i + 1) % n];
    const dot = (p0[0]-v0[0])*(q0[0]-v0[0]) + (p0[1]-v0[1])*(q0[1]-v0[1]);
    if (n <= 6 && Math.abs(dot) < 1e-6) {
      const v = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      const u = [a[0]-v[0], a[1]-v[1]], w = [b[0]-v[0], b[1]-v[1]];
      const lu = Math.hypot(...u), lw = Math.hypot(...w), m = 11;
      const A = [v[0]+u[0]/lu*m, v[1]+u[1]/lu*m], B = [A[0]+w[0]/lw*m, A[1]+w[1]/lw*m], C = [v[0]+w[0]/lw*m, v[1]+w[1]/lw*m];
      out += `<path d="M${A} L${B} L${C}" fill="none" stroke="#7a84ad" stroke-width="2"/>`;
    }
  }
  // Every side is a flat bar that stops exactly where the next side starts: the ends are cut along the corner's angle (a mitre), so
  // nothing sticks out past a corner and there are no gaps. (Glows first, then the colored sides on top.)
  const area = pts.reduce((s, p, i) => { const q = pts[(i + 1) % n]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
  const nrm = pts.map((a, i) => { const b = pts[(i + 1) % n]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; return area > 0 ? [dy, -dx] : [-dy, dx]; });
  mids.forEach((m, i) => { m.nx = nrm[i][0]; m.ny = nrm[i][1]; });                    // labels sit straight out from the MIDDLE of each side (perpendicular to it)
  const mit = pts.map((_, i) => {
    const p = nrm[(i + n - 1) % n], q = nrm[i]; const d = Math.max(.4, 1 + p[0] * q[0] + p[1] * q[1]);
    let mx = (p[0] + q[0]) / d, my = (p[1] + q[1]) / d; const l = Math.hypot(mx, my); if (l > 2.4) { mx *= 2.4 / l; my *= 2.4 / l; }   // very sharp corners: cap the point
    return [mx, my];
  });
  const flat = (i, w, fill, extra) => {                                                // (glows: square ends right at the corners, so they never poke past a vertex)
    const a = pts[i], b = pts[(i + 1) % n], h = w / 2, m = nrm[i];
    return `<polygon points="${a[0] + m[0] * h},${a[1] + m[1] * h} ${b[0] + m[0] * h},${b[1] + m[1] * h} ${b[0] - m[0] * h},${b[1] - m[1] * h} ${a[0] - m[0] * h},${a[1] - m[1] * h}" fill="${fill}"${extra || ''}>`;
  };
  const bar = (i, w, fill, extra) => {
    const a = pts[i], b = pts[(i + 1) % n], h = w / 2, ma = mit[i], mb = mit[(i + 1) % n];
    return `<polygon points="${a[0] + ma[0] * h},${a[1] + ma[1] * h} ${b[0] + mb[0] * h},${b[1] + mb[1] * h} ${b[0] - mb[0] * h},${b[1] - mb[1] * h} ${a[0] - ma[0] * h},${a[1] - ma[1] * h}" fill="${fill}"${extra || ''}>`;
  };
  for (let i = 0; i < n; i++) {
    const col = COLORS[P.cmap[i]], isT = i === P.ti;
    if (qHere && isT)                                                                  // the missing side: glowing gold
      out += flat(i, focus ? 22 : 15, '#ffd23f', ' fill-opacity=".6"') + `<animate attributeName="fill-opacity" values=".25;.9;.25" dur="1.2s" repeatCount="indefinite"/></polygon>`;
    else if (focus && isT)                                                             // its matching side on the other figure: soft glow in the same color
      out += flat(i, 20, col, ' fill-opacity=".3"') + `</polygon>`;
  }
  for (let i = 0; i < n; i++) out += bar(i, focus && i === P.ti ? 9 : 5, COLORS[P.cmap[i]]) + `</polygon>`;
  if (P.ticks) {                                                                     // tick marks = equal sides
    let g = 0;
    P.classes.filter(c => c.length > 1).forEach(c => {
      g++;
      c.forEach(i => {
        const a = pts[i], b = pts[(i + 1) % n], dx = b[0]-a[0], dy = b[1]-a[1], l = Math.hypot(dx, dy) || 1;
        const ux = dx/l, uy = dy/l, nx = -uy, ny = ux, mx = (a[0]+b[0])/2, my = (a[1]+b[1])/2;
        for (let t = 0; t < g; t++) {
          const off = (t - (g - 1) / 2) * 7, qx = mx + ux*off, qy = my + uy*off;
          out += `<line x1="${qx - nx*9}" y1="${qy - ny*9}" x2="${qx + nx*9}" y2="${qy + ny*9}" stroke="#1d2340" stroke-width="3" stroke-linecap="round"/>`;
        }
      });
    });
  }
  // ---- the numbers: each one sits straight out from the middle of its side, but is nudged (out, then sideways) until it doesn't
  // touch another number, sit on top of the shape, or cover another side. (Notches and inner corners used to pile numbers on top of each other.)
  const items = [];
  for (let i = 0; i < n; i++) {
    let txt = null;
    if (qHere && i === P.ti) txt = reveal ? fmt(P.alg ? P.alg.val : P.answer) : P.alg ? P.alg.expr : '?';      // (level 5: an expression like 2x + 5)
    else if ((reveal ? SHAPES[P.shape].label : show).includes(i)) txt = fmt(lens[i]);     // the wrong-answer card reveals every side
    if (txt === null) continue;
    const isQ = qHere && i === P.ti && !reveal, bubble = focus && i === P.ti, str = String(txt);
    const size = bubble ? (isQ ? 20 : 22) : isQ ? (P.alg ? 21 : 24) : focus ? 21 : 18;
    const w = bubble ? Math.max(isQ ? 32 : 40, 18 + str.length * size * .62) : str.length * size * .62 + 6, h = bubble ? size + (isQ ? 10 : 12) : size;
    items.push({ i, txt, isQ, bubble, size, w, h });
  }
  items.sort((a, b) => (b.isQ - a.isQ) || (b.bubble - a.bubble) || (a.i - b.i));          // the "?" and the spotlighted number get first pick of the space
  const inPoly = (x, y) => { let c = false; for (let a = 0, b = n - 1; a < n; b = a++) { const [xi, yi] = pts[a], [xj, yj] = pts[b]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const segDist = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; let t = ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1); t = Math.max(0, Math.min(1, t)); return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy); };
  const hitsBox = (a, b, x, y, hw, hh) => { const N = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3)); for (let s = 0; s <= N; s++) { if (Math.abs(a[0] + (b[0] - a[0]) * s / N - x) < hw + 1 && Math.abs(a[1] + (b[1] - a[1]) * s / N - y) < hh + 1) return true; } return false; };
  const placed = [], base = P.ticks ? 24 : 17;
  for (const it of items) {
    const m = mids[it.i], tx = -m.ny, ty = m.nx, hw = it.w / 2 + 2, hh = it.h / 2 + 2, o0 = base + (it.bubble ? (it.isQ ? 10 : 8) : 0);
    let best = null;
    const sx = m.nx >= 0 ? 1 : -1;                                                     // "to the right of a right-hand side, to the left of a left-hand side"
    // Two passes: first try just pushing straight out (further and further) along the side's own normal / sx - this
    // keeps a label centered beside the middle of its side. Only if that never clears (label still touches the shape
    // or another label even far out) do we try shifting sideways along the side, which can drag a label toward a corner.
    const passes = [[[m.nx, m.ny, 0], [sx, 0, 0]], [[m.nx, m.ny, 14], [m.nx, m.ny, -14], [sx, 0, 12], [sx, 0, -12], [m.nx, m.ny, 28], [m.nx, m.ny, -28], [m.nx, m.ny, 44], [m.nx, m.ny, -44]]];
    search: for (const variants of passes) for (let d = 0; d < 9; d++) for (const [dirx, diry, lat] of variants) {
      const o = o0 + d * 6, x = m.x + dirx * o + tx * lat, y = m.y + diry * o + ty * lat;
      if (x - hw < 3 || x + hw > VW - 3 || y - hh < 3 || y + hh > VH - 3) continue;
      if (placed.some(q => Math.abs(q.x - x) < hw + q.hw && Math.abs(q.y - y) < hh + q.hh)) continue;
      if ([[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]].some(([sx, sy]) => inPoly(x + sx * hw, y + sy * hh))) continue;
      if (pts.some((a, k) => k !== it.i && hitsBox(a, pts[(k + 1) % n], x, y, hw, hh))) continue;                 // never on top of another side (checks the whole label box)
      best = { x, y }; break search;
    }
    if (!best) best = { x: clamp(m.x + m.nx * o0, hw + 3, VW - hw - 3), y: clamp(m.y + m.ny * o0, hh + 3, VH - hh - 3) };  // never let a wide label (e.g. "x + 6") run off the card, even when no clean spot was found
    m.lx = best.x; m.ly = best.y; m.lw = it.w; m.lh = it.h; placed.push({ x: best.x, y: best.y, hw, hh });
    const col = COLORS[P.cmap[it.i]], { x: lx, y: ly } = best;
    if (it.bubble)                                                                     // spotlighted number: a filled bubble in the side's color
      out += `<rect x="${lx - it.w / 2}" y="${ly - it.h / 2}" width="${it.w}" height="${it.h}" rx="${it.h / 2}" fill="${col}" stroke="#fff" stroke-width="3"/>` +
        `<text x="${lx}" y="${ly + 1}" text-anchor="middle" dominant-baseline="central" font-size="${it.size}" font-weight="900" fill="#fff" style="${font}">${it.txt}</text>`;
    else
      out += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" font-size="${it.size}" font-weight="900" fill="${col}" stroke="#fff" stroke-width="4" paint-order="stroke" style="${font}">${it.txt}</text>`;
  }
  return { body: out, mids, pts, VW, VH, top: Math.min(...pts.map(p => p[1])), bottom: Math.max(...pts.map(p => p[1])) };
}

/* ===================== GAME STATE ===================== */
const THEMES = [
  { name: 'Canyon', sky: ['#6ec6ff','#ffe3b3'], far: '#d9a074', near: '#b5683f', top: '#d29a55', body: '#8a4b2a', sun: '#fff3b0' },
  { name: 'Jungle', sky: ['#7fdcc0','#f4fbd0'], far: '#5fae7a', near: '#2f8a5a', top: '#45b04f', body: '#6b4a2b', sun: '#fffbd0' },
  { name: 'Night City', sky: ['#171b48','#7a4a8f'], far: '#3a3470', near: '#25204d', top: '#5b5b70', body: '#2d2d3a', sun: '#e8ecff', city: true }
];
// Canyon and Jungle alternate every 6 bridges early on; Night City only starts once level 4 begins (3000 m) and then stays
// for the rest of the run, since its dark sky is the one theme that needs full daylight obstacle colors to read clearly.
function themeFor(level, solved) { return level >= 4 ? 2 : Math.floor(solved / 6) % 2; }
// The bridge-building crew: 6 jobs x 4 looks. You earn 1 coin for every correct answer and spend coins in the Shop to hire them as your runner.
// (Looks only - every crew member runs the same.)  Drawn from the SIDE, walking to the right.
//   look: torso/legs/boots colors; hat (hard | cap | beret | hair | headlamp) + hatc; hair; glasses (round | square); goggles;
//         vest + stripes; bibs; tie; belt; bolt; sash; props (held in the front hand, or worn: whistle, badge)
const CREW_ROLES = ['Site Worker', 'Politician', 'Architect', 'Engineer', 'Electrician', 'Safety Inspector', 'Surveyor', 'Environmental Scientist', 'Crane Operator', 'Geologist'];
const cY = '#ffd23f', cWH = '#f4f4f4', cBL = '#2f80ed', cOR = '#ff9f1a';
const CHARACTERS = [
  // ---- Site Worker (the free starter is the first one) ----
  { id: 'crew', role: 0, name: 'Site Worker', price: 0, tag: 'Ready to build. Your starting runner.', look: { torso: cBL, legs: '#1b4f9c', hat: 'cap', hatc: '#1b4f9c' } },
  { id: 'crewA', role: 0, name: 'Shovel Crew', price: 5, tag: 'Hi-vis vest, hard hat, and a shovel.', look: { torso: '#e8e2d0', vest: cOR, stripes: 1, legs: '#3d5a80', hat: 'hard', hatc: cY, props: ['shovel'] } },
  { id: 'crewB', role: 0, name: 'Fix-It Pro', price: 10, tag: 'Overalls, a tool belt, and a wrench.', look: { torso: '#c0392b', bibs: '#3a5f9c', legs: '#3a5f9c', hat: 'cap', hatc: '#e0761f', belt: 1, props: ['wrench'] } },
  { id: 'crewC', role: 0, name: 'Flagger', price: 15, tag: 'Slows the traffic with a STOP sign.', look: { torso: '#f2c21b', legs: '#3b3b46', hat: 'hard', hatc: '#f2c21b', props: ['paddle'] } },
  // ---- Politician ----
  { id: 'politician', role: 1, name: 'Politician', price: 10, tag: 'Gets the funding approved.', look: { torso: '#2b3a67', legs: '#1c2547', hair: '#b9b9c4', tie: '#d92b2b' } },
  { id: 'politicianA', role: 1, name: 'Mayor', price: 15, tag: 'A sash and a flag for the big day.', look: { torso: '#2b3a67', legs: '#1c2547', hair: '#7b5a3a', tie: '#d92b2b', sash: '#e8b02a', props: ['flag'] } },
  { id: 'politicianB', role: 1, name: 'State Representative', price: 20, tag: 'Gets the bridge funding bill passed.', look: { torso: '#3b3b46', legs: '#25252e', hair: '#b9b9c4', tie: '#2e86c1', props: ['clip', 'badge'] } },
  { id: 'politicianC', role: 1, name: 'Campaigner', price: 25, tag: 'Rallies the town with a megaphone.', look: { torso: '#e8e8ee', vest: '#3a5f9c', legs: '#3b3b46', hair: '#5b3a1a', tie: '#d92b2b', props: ['megaphone'] } },
  // ---- Architect ----
  { id: 'architect', role: 2, name: 'Architect', price: 20, tag: 'Designs the bridge on a blue blueprint first.', look: { torso: '#3b3b46', legs: '#26262e', hat: 'beret', hatc: '#7b3fa0', glasses: 'round', props: ['roll'] } },
  { id: 'architectA', role: 2, name: 'Designer', price: 25, tag: 'Black turtleneck, a ruler, and a blue blueprint tube.', look: { torso: '#222222', legs: '#333333', hair: '#5b3a1a', glasses: 'square', props: ['ruler', 'tube'] } },
  { id: 'architectB', role: 2, name: 'Draftsperson', price: 30, tag: 'Hard hat, a big compass, and a blue blueprint tube.', look: { torso: '#f4f4f4', legs: '#3b3b46', hat: 'hard', hatc: cWH, glasses: 'round', tie: cBL, props: ['compass', 'tube'] } },
  { id: 'architectC', role: 2, name: 'Blueprint Boss', price: 35, tag: 'A big blue blueprint and a red beret.', look: { torso: '#c9a26a', legs: '#5b4a3a', hat: 'beret', hatc: '#c0392b', glasses: 'round', belt: 1, props: ['blueprint'] } },
  // ---- Engineer ----
  { id: 'engineer', role: 3, name: 'Engineer', price: 30, tag: 'Checks the math and the forces.', look: { torso: cOR, legs: '#7a5a20', hat: 'hard', hatc: cY, glasses: 'round', props: ['clip'] } },
  { id: 'engineerA', role: 3, name: 'Lab Engineer', price: 35, tag: 'Goggles and a laptop full of numbers.', look: { torso: '#f4f4f4', legs: '#3b3b46', hat: 'hard', hatc: cY, goggles: 1, props: ['laptop'] } },
  { id: 'engineerB', role: 3, name: 'Angle Engineer', price: 40, tag: 'Measures every angle with a detailed protractor.', look: { torso: '#3a7d44', legs: '#2a4a30', hat: 'hard', hatc: cWH, glasses: 'square', belt: 1, props: ['protractor'] } },
  { id: 'engineerC', role: 3, name: 'Site Engineer', price: 45, tag: 'Vest, clipboard, and a badge.', look: { torso: cBL, vest: cOR, legs: '#25252e', hat: 'hard', hatc: cOR, props: ['clip', 'badge'] } },
  // ---- Electrician ----
  { id: 'electrician', role: 4, name: 'Electrician', price: 45, tag: 'Wires up the lights and signals.', look: { torso: '#2e6bd6', legs: '#1d3f86', hat: 'hard', hatc: cWH, bolt: 1, belt: 1 } },
  { id: 'electricianA', role: 4, name: 'Lineworker', price: 50, tag: 'Headlamp on, pliers in hand.', look: { torso: '#2e6bd6', legs: '#2e6bd6', hat: 'headlamp', hatc: cWH, belt: 1, props: ['pliers'] } },
  { id: 'electricianB', role: 4, name: 'Cable Crew', price: 55, tag: 'Carries a big coil of cable.', look: { torso: '#d9dde6', legs: '#3d4a6a', hat: 'hard', hatc: '#e0261f', bolt: 1, props: ['cable'] } },
  { id: 'electricianC', role: 4, name: 'Bright Spark', price: 60, tag: 'Goggles on and a glowing bulb.', look: { torso: '#f2c21b', legs: '#3b3b46', hat: 'hard', hatc: cWH, goggles: 1, props: ['bulb'] } },
  // ---- Safety Inspector ----
  { id: 'inspector', role: 5, name: 'Safety Inspector', price: 60, tag: 'Makes sure it is safe before it opens.', look: { torso: '#a6e22e', legs: '#4a5a1c', hat: 'hard', hatc: cWH, stripes: 1, vest: '#a6e22e', props: ['clip'] } },
  { id: 'inspectorA', role: 5, name: 'Stamp Inspector', price: 65, tag: 'Approves the bridge with a stamp.', look: { torso: '#f4f4f4', vest: '#ff8a1f', stripes: 1, legs: '#3b3b46', hat: 'hard', hatc: cWH, goggles: 1, props: ['stamp'] } },
  { id: 'inspectorB', role: 5, name: 'Whistle Marshal', price: 70, tag: 'A whistle, a green cap, and an OK sign.', look: { torso: '#3b3b46', vest: '#a6e22e', stripes: 1, legs: '#25252e', hat: 'cap', hatc: '#a6e22e', props: ['whistle', 'signOK'] } },
  { id: 'inspectorC', role: 5, name: 'OK Inspector', price: 75, tag: 'Gives the final thumbs-up sign.', look: { torso: '#a6e22e', legs: '#4a5a1c', hat: 'hard', hatc: cOR, glasses: 'square', stripes: 1, vest: '#a6e22e', props: ['signOK'] } },
  // ---- Surveyor ----
  { id: 'surveyor', role: 6, name: 'Surveyor', price: 40, tag: 'Measures the gap with a survey scope.', look: { torso: '#e8e2d0', vest: cOR, stripes: 1, legs: '#4a5a6a', hat: 'hard', hatc: cOR, props: ['tripod'] } },
  { id: 'surveyorA', role: 6, name: 'Rod Holder', price: 45, tag: 'Holds the striped rod for the scope.', look: { torso: '#f2c21b', vest: '#ff8a1f', stripes: 1, legs: '#3b3b46', hat: 'cap', hatc: '#ff8a1f', props: ['rod'] } },
  { id: 'surveyorB', role: 6, name: 'Mapper', price: 50, tag: 'Draws the land onto a map.', look: { torso: '#f4f4f4', legs: '#3b3b46', hat: 'hard', hatc: cWH, glasses: 'round', props: ['map'] } },
  { id: 'surveyorC', role: 6, name: 'Drone Pilot', price: 55, tag: 'Maps the gap from the sky.', look: { torso: '#2f80ed', legs: '#25252e', hat: 'cap', hatc: '#222222', props: ['drone'] } },
  // ---- Environmental Scientist ----
  { id: 'envsci', role: 7, name: 'Environmental Scientist', price: 50, tag: 'Looks for endangered animals with binoculars.', look: { torso: '#3a7d44', legs: '#5b4a3a', hat: 'sun', hatc: '#e8c778', props: ['binoculars'] } },
  { id: 'envsciA', role: 7, name: 'Field Biologist', price: 55, tag: 'Gets a closer look with a net.', look: { torso: '#c9a26a', vest: '#6b7a3a', legs: '#4a5a1c', hat: 'cap', hatc: '#3a7d44', props: ['net'] } },
  { id: 'envsciB', role: 7, name: 'Wildlife Ranger', price: 60, tag: 'Logs every sighting in a notebook.', look: { torso: '#6b7a3a', legs: '#5b4a3a', hat: 'ranger', hatc: '#8a6a3a', props: ['notebook'] } },
  { id: 'envsciC', role: 7, name: 'Water Tester', price: 65, tag: 'Tests the river water in a jar.', look: { torso: '#2e86c1', legs: '#25252e', goggles: 1, props: ['jar'] } },
  // ---- Crane Operator ----
  { id: 'crane', role: 8, name: 'Crane Operator', price: 60, tag: 'Lifts the beams into place.', look: { torso: '#f2c21b', legs: '#3b3b46', hat: 'hard', hatc: cWH, props: ['joystick', 'headset'] } },
  { id: 'craneA', role: 8, name: 'Signal Rigger', price: 65, tag: 'Guides the crane by radio.', look: { torso: '#f4f4f4', vest: '#ff8a1f', stripes: 1, legs: '#3b3b46', hat: 'hard', hatc: cY, props: ['radio'] } },
  { id: 'craneB', role: 8, name: 'Tower Crane Pro', price: 70, tag: 'Runs the tallest crane on site.', look: { torso: '#2f80ed', legs: '#1b4f9c', hat: 'hard', hatc: cOR, props: ['crane'] } },
  { id: 'craneC', role: 8, name: 'Rigger', price: 75, tag: 'Hooks the load on safely.', look: { torso: '#c0392b', belt: 1, legs: '#3b3b46', hat: 'hard', hatc: cWH, props: ['hook'] } },
  // ---- Geologist ----
  { id: 'geo', role: 9, name: 'Geologist', price: 70, tag: 'Reads the rock under the river.', look: { torso: '#c9a26a', legs: '#5b4a3a', hat: 'hard', hatc: cY, props: ['rockhammer'] } },
  { id: 'geoA', role: 9, name: 'Soil Tester', price: 75, tag: 'Pulls up a soil core to test.', look: { torso: '#3a7d44', legs: '#2a4a30', hat: 'cap', hatc: '#8a5a2a', props: ['core'] } },
  { id: 'geoB', role: 9, name: 'Rock Collector', price: 80, tag: 'Never leaves without a good rock.', look: { torso: '#e8e2d0', legs: '#5b4a3a', hat: 'sun', hatc: '#e8c778', props: ['rocks'] } },
  { id: 'geoC', role: 9, name: 'Driller', price: 85, tag: 'Drills test holes for the bridge footings.', look: { torso: '#2e6bd6', legs: '#25252e', hat: 'hard', hatc: '#e0261f', goggles: 1, props: ['drill'] } }
];
// Who each crew member is: half are women, and skin tones and hair vary, so every student can see someone like themselves in a professional job.
// style: short | long | pony | bun | curly
const SKIN = { fair: '#ffd9b0', light: '#f0c9a0', olive: '#d9a66c', tan: '#c68642', brown: '#8d5524', deep: '#5c3a21' };
const CREW_PEOPLE = {
  crew:         { skin: SKIN.tan,   style: 'pony',  hairc: '#2b1b10' },
  crewA:        { skin: SKIN.brown, style: 'short', hairc: '#151515' },
  crewB:        { skin: SKIN.fair,  style: 'bun',   hairc: '#a0522d' },
  crewC:        { skin: SKIN.light, style: 'short', hairc: '#4a3320' },
  politician:   { skin: SKIN.brown, style: 'long',  hairc: '#b9b9c4' },
  politicianA:  { skin: SKIN.fair,  style: 'short', hairc: '#7b5a3a' },
  politicianB:  { skin: SKIN.light, style: 'long',  hairc: '#222222' },
  politicianC:  { skin: SKIN.deep,  style: 'curly', hairc: '#111111' },
  architect:    { skin: SKIN.fair,  style: 'bun',   hairc: '#5b3a1a' },
  architectA:   { skin: SKIN.tan,   style: 'short', hairc: '#222222' },
  architectB:   { skin: SKIN.deep,  style: 'pony',  hairc: '#111111' },
  architectC:   { skin: SKIN.olive, style: 'short', hairc: '#4a3320' },
  engineer:     { skin: SKIN.light, style: 'short', hairc: '#333333' },
  engineerA:    { skin: SKIN.brown, style: 'pony',  hairc: '#1a1a1a' },
  engineerB:    { skin: SKIN.tan,   style: 'short', hairc: '#222222' },
  engineerC:    { skin: SKIN.fair,  style: 'pony',  hairc: '#c0872b' },
  electrician:  { skin: SKIN.brown, style: 'short', hairc: '#111111' },
  electricianA: { skin: SKIN.light, style: 'bun',   hairc: '#2b1b10' },
  electricianB: { skin: SKIN.fair,  style: 'short', hairc: '#a0522d' },
  electricianC: { skin: SKIN.deep,  style: 'pony',  hairc: '#111111' },
  inspector:    { skin: SKIN.olive, style: 'short', hairc: '#222222' },
  inspectorA:   { skin: SKIN.tan,   style: 'long',  hairc: '#1a1a1a' },
  inspectorB:   { skin: SKIN.light, style: 'short', hairc: '#3a2a1a' },
  inspectorC:   { skin: SKIN.fair,  style: 'pony',  hairc: '#d9a441' },
  surveyor:     { skin: SKIN.tan,   style: 'short', hairc: '#222222' },
  surveyorA:    { skin: SKIN.deep,  style: 'pony',  hairc: '#111111' },
  surveyorB:    { skin: SKIN.fair,  style: 'bun',   hairc: '#a0522d' },
  surveyorC:    { skin: SKIN.olive, style: 'short', hairc: '#4a3320' },
  envsci:       { skin: SKIN.light, style: 'long',  hairc: '#5b3a1a' },
  envsciA:      { skin: SKIN.brown, style: 'short', hairc: '#111111' },
  envsciB:      { skin: SKIN.fair,  style: 'short', hairc: '#7b5a3a' },
  envsciC:      { skin: SKIN.tan,   style: 'curly', hairc: '#111111' },
  crane:        { skin: SKIN.light, style: 'short', hairc: '#a0522d' },
  craneA:       { skin: SKIN.brown, style: 'pony',  hairc: '#111111' },
  craneB:       { skin: SKIN.olive, style: 'bun',   hairc: '#222222' },
  craneC:       { skin: SKIN.deep,  style: 'short', hairc: '#111111' },
  geo:          { skin: SKIN.fair,  style: 'pony',  hairc: '#a0522d' },
  geoA:         { skin: SKIN.tan,   style: 'short', hairc: '#222222' },
  geoB:         { skin: SKIN.deep,  style: 'curly', hairc: '#111111' },
  geoC:         { skin: SKIN.brown, style: 'short', hairc: '#111111' }
};
CHARACTERS.forEach(c => Object.assign(c.look, CREW_PEOPLE[c.id]));
// One-time move of progress saved under the game's earlier name ("bridgerunner_...") to the "similaritybuilder_..." keys.
// It MOVES the values (copies, then deletes the old key), so a later "Reset" can't bring old progress back.
(function migrateOldSaveKeys() {
  try {
    ['best_meters', 'best_level', 'best_bridges', 'best_streak', 'muted', 'checkpoints', 'coins', 'owned', 'character', 'skin'].forEach(function (s) {
      var oldKey = 'bridgerunner_' + s, v = localStorage.getItem(oldKey);
      if (v === null) return;
      if (localStorage.getItem('similaritybuilder_' + s) === null && s !== 'skin') localStorage.setItem('similaritybuilder_' + s, v);
      localStorage.removeItem(oldKey);
    });
  } catch (e) {}
})();
// Saved progress lives in this browser only (localStorage), under the "similaritybuilder_" prefix - the same
// per-game prefix convention every other game on the site uses, so My Stats and the reset buttons can find it.
const KEY = {
  bestMeters: 'similaritybuilder_best_meters', bestLevel: 'similaritybuilder_best_level',
  bestBridges: 'similaritybuilder_best_bridges', bestStreak: 'similaritybuilder_best_streak',
  muted: 'similaritybuilder_muted', checkpoints: 'similaritybuilder_checkpoints', practice: 'similaritybuilder_practice_types',
  coins: 'similaritybuilder_coins', owned: 'similaritybuilder_owned', character: 'similaritybuilder_character'
};
let best = store.get(KEY.bestMeters, 0), bestLevel = store.get(KEY.bestLevel, 1), muted = store.get(KEY.muted, false);
let coins = Math.max(0, Math.floor(Number(store.get(KEY.coins, 0)) || 0));
let owned = (store.get(KEY.owned, ['crew']) || ['crew']).filter(id => CHARACTERS.some(c => c.id === id));
if (!owned.includes('crew')) owned.unshift('crew');
let charId = store.get(KEY.character, 'crew');
if (!owned.includes(charId)) charId = 'crew';
const currentChar = () => CHARACTERS.find(c => c.id === charId) || CHARACTERS[0];
function addCoins(n) { coins += n; if (!window.similarityBuilderResetting) store.set(KEY.coins, coins); }
function equipCharacter(id) { if (!owned.includes(id)) return; charId = id; store.set(KEY.character, id); }
function buyCharacter(id) {                                    // spend coins to hire a crew member (and put them on)
  const ch = CHARACTERS.find(c => c.id === id);
  if (!ch || owned.includes(id) || coins < ch.price) return false;
  coins -= ch.price; owned.push(id);
  store.set(KEY.coins, coins); store.set(KEY.owned, owned); equipCharacter(id);
  return true;
}

// Records this run's numbers if they beat the saved ones. Called when a run ends AND when the tab is hidden or
// closed, so progress earned right before leaving the page is never lost.
function saveRunStats() {
  if (window.similarityBuilderResetting || !G || G.state === 'menu' || G.mode !== 'run') return;   // Practice never counts toward your best distance
  const meters = Math.max(0, Math.floor(G.px / 30));
  if (meters > best) { best = meters; store.set(KEY.bestMeters, best); }
  if (G.level > bestLevel) { bestLevel = G.level; store.set(KEY.bestLevel, bestLevel); }
  if (G.solved > store.get(KEY.bestBridges, 0)) store.set(KEY.bestBridges, G.solved);
  if (G.bestStreak > store.get(KEY.bestStreak, 0)) store.set(KEY.bestStreak, G.bestStreak);
}
// Level checkpoints: the first time (most recently) each level was reached - level, distance, and bridges built.
// Shown on the Menu screen and the game-over screen as places a new run can start from (saves from before levels were tied to distance are moved up to their level's distance).
let checkpoints = {};
(function loadCheckpoints() {
  const raw = store.get(KEY.checkpoints, {});
  for (let lv = 2; lv <= MAX_LEVEL; lv++) {
    const c = raw && raw[lv];
    if (c && Number.isFinite(c.px) && Number.isFinite(c.solved)) checkpoints[lv] = { level: lv, px: Math.max(c.px, (lv - 1) * METERS_PER_LEVEL * 30), solved: c.solved, wrong: c.wrong || 0, bestStreak: c.bestStreak || 0 };
  }
})();
function saveCheckpoint(cp) {
  if (window.similarityBuilderResetting) return;
  checkpoints[cp.level] = cp; store.set(KEY.checkpoints, checkpoints);
}
// The checkpoint for the highest level ever reached - used to send the player back into harder questions by
// default (the main Start button and "Run again") instead of always dropping them back to level 1.
function highestCheckpoint() {
  const lvs = Object.keys(checkpoints).map(Number);
  return lvs.length ? checkpoints[Math.max(...lvs)] : undefined;
}
// Fills `el` with a row of "Level N · X m" buttons (level 1 = a full restart at 0 m; levels not reached yet are locked).
// Clicking one starts a new run there; `beforeStart` runs first (used by the pause menu to close itself).
function renderStarts(el, head, beforeStart) {
  el.innerHTML = `<p class="startsHead">${head}</p><div class="starts">` +
    Array.from({ length: MAX_LEVEL }, (_, i) => {
      const lv = i + 1, c = checkpoints[lv];
      if (lv === 1) return `<button type="button" class="btn ghost start" data-lv="1">↺ Start Over</button>`;
      return c ? `<button type="button" class="btn alt start" data-lv="${lv}">Level ${lv} · ${Math.floor(c.px / 30)} m</button>`
               : `<span class="start locked" title="Reach level ${lv} in a run to unlock this start">🔒 Level ${lv}</span>`;
    }).join('') + `</div>`;
  el.onclick = e => {
    const b = e.target.closest('button[data-lv]'); if (!b) return;
    const lv = +b.dataset.lv;
    if (beforeStart) beforeStart();
    startGame(lv === 1 ? undefined : checkpoints[lv]);
  };
}
addEventListener('pagehide', saveRunStats);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveRunStats(); });

let G = null;
let cardAt = 0;                                          // when the last pop-up card appeared (for the Enter/Space delay)
let curMode = 'run';                     // 'run' = Bridge Run (obstacles, 3 hearts, levels)   'practice' = no obstacles, no hearts, pick your question types
const keys = {};

// cp (optional) = a checkpoint {level, px, solved, wrong, bestStreak} saved when that level was reached: the new run
// starts at that level, at that distance, with the same bridges-built count, and with a fresh set of 3 hearts.
function newWorld(menu, cp, mode) {
  const lv = cp ? cp.level : 1, x0 = cp ? cp.px : 60;
  const practice = mode === 'practice';
  const runLen = practice ? Math.round(PRACTICE_SECONDS * 330) : Math.round(4000 * SPEED_BY_LEVEL[lv - 1]);   // the same ~11 s of quiet running the very first level gets (Practice: a short jog)
  return {
    mode: mode || 'run', ptypes: [], answered: 0, byType: {},
    state: menu ? 'menu' : 'run', t: 0, cam: 0, camY: 0, px: menu ? 0 : x0, py: GROUND, vy: 0, onGround: true,
    jumpBuf: 0, airJumps: 0, stumble: 0, inv: 0, crashed: false, shake: 0,
    lives: 3, streak: 0, bestStreak: cp ? cp.bestStreak : 0, solved: cp ? cp.solved : 0, wrong: cp ? cp.wrong : 0,
    level: lv, theme: cp ? themeFor(lv, cp.solved) : 0, dist: 0, missed: [],
    platforms: [menu ? { s: -5000, e: 1e9, obs: [], bridged: true }
      : makePlatform(x0 - 460, x0 - 460 + runLen, true, cp ? themeFor(lv, cp.solved) : 0, lv)],
    pi: 0, particles: [], problem: null, timeLeft: 0, timeTotal: 0, tipT: 0
  };
}

// Obstacles: the real-world reasons a bridge doesn't get built (plus the terrain around it).
//   solid    = something standing on the ground: jump it.           vx = it walks toward you (px/s), so it comes at you faster
//   zone     = a patch of ground: jump over it or you're in it.     effect: slow (puddle) | collapse (unstable soil gives way if you linger) | hurt (a hole)
//   pipe     = a loose underground pipe that pops up out of the ground every couple of seconds: jump it while it's up
//   fly      = hangs at head height (birds, drones, storm clouds, power lines): DON'T jump into it, just run under
const OBS = {
  // --- standing on the ground ---
  rock:      { kind: 'solid', w: 46, h: 38, label: 'boulder' },
  cactus:    { kind: 'solid', w: 28, h: 62, label: 'cactus' },
  log:       { kind: 'solid', w: 64, h: 30, label: 'fallen log' },
  stump:     { kind: 'solid', w: 36, h: 44, label: 'tree stump' },
  cone:      { kind: 'solid', w: 26, h: 38, label: 'road cone' },
  barrel:    { kind: 'solid', w: 38, h: 48, label: 'hazmat barrel' },
  redtape:   { kind: 'solid', w: 58, h: 30, label: 'red tape' },
  home:      { kind: 'solid', w: 54, h: 52, label: 'private home' },
  // --- walking toward you ---
  protesters:{ kind: 'solid', w: 140, h: 66, vx: -70, label: 'protesters' },
  tortoise:  { kind: 'solid', w: 46, h: 28, vx: -22, label: 'endangered tortoise' },
  frog:      { kind: 'solid', w: 64, h: 40, vx: -30, label: 'endangered frog' },
  lawyer:    { kind: 'solid', w: 30, h: 68, vx: -45, label: 'lawyer (needs a permit)' },
  // --- ground hazards ---
  flood:     { kind: 'zone', w: 160, effect: 'hurt',     label: 'flooded land',      msg: 'You waded into the flood!' },
  soil:      { kind: 'zone', w: 130, effect: 'hurt',     label: 'unstable soil',     msg: 'The unstable soil gave way!' },
  hole:      { kind: 'zone', w: 64,  effect: 'hurt',     label: 'hole in the ground', msg: 'You fell in a hole in the ground!' },
  pipe:      { kind: 'pipe', w: 56, label: 'loose underground pipe', msg: 'A loose pipe burst out of the ground!' },
  // --- overhead: don't jump into these ---
  vulture:   { fly: true, label: 'vulture' },
  parrot:    { fly: true, label: 'parrot' },
  drone:     { fly: true, label: 'survey drone' },
  falcon:    { fly: true, label: 'endangered falcon' },
  storm:     { fly: true, w: 50, label: 'storm cloud (weather delay)' },   // hit width matched to how wide the cloud actually draws (~76px) - it was hitting well before the player visually touched it
  powerline: { fly: true, w: 180, still: true, label: 'electrical line' },
  // --- level 5 ---
  crate:     { kind: 'solid', w: 44, h: 84, label: 'stack of crates' },
  truck:     { kind: 'solid', w: 100, h: 54, vx: -95, label: 'dump truck' },
  helicopter:{ fly: true, w: 60, label: 'news helicopter' }
};
// Every level has its OWN obstacles (none repeat on another level), and every one of them costs a heart if it touches you.
// (A name listed twice shows up twice as often.)
const LEVEL_OBS = [
  ['rock', 'cactus', 'log', 'cone', 'tortoise'],                                            // 1: simple things on the ground - just jump
  ['stump', 'frog', 'barrel', 'redtape', 'home', 'vulture'],                               // 2: taller and wider things, plus the first flyer to duck under
  ['flood', 'hole', 'soil', 'lawyer', 'parrot', 'powerline'],                              // 3: wide hazards to clear, walkers, and low-hanging lines
  ['protesters', 'protesters', 'pipe', 'pipe', 'drone', 'falcon', 'storm'],                 // 4: big groups, bursting pipes, and lots of overhead traffic
  ['crate', 'crate', 'truck', 'truck', 'helicopter', 'helicopter']                          // 5: tall stacks, a dump truck rolling at you, and a helicopter overhead
];
const flyY = c => GROUND - 125 + Math.sin(G.t * 4 + c.x) * 8;
const flyYOf = c => OBS[c.type].still ? GROUND - 128 : flyY(c);                   // power lines don't bob
// a loose pipe: sits low, wobbles as a warning, shoots up, then sinks again (a 2.4 s cycle, out of step with its neighbours)
const PIPE_CYCLE = 2.4;
const pipeH = c => {
  const ph = (G.t + (c.t0 || 0)) % PIPE_CYCLE;
  return ph < 0.4 ? 0 : ph < 0.8 ? 6 : ph < 1.9 ? 6 + 42 * Math.sin(Math.PI * (ph - 0.8) / 1.1) : 0;
};

// each level: the runner is faster, and the spacing gets tighter and more surprising
const SPEED_BY_LEVEL = [1, 1.1, 1.2, 1.3, 1.4];                 // × the base running speed (330 px/s)
// The tightest gap between two obstacles, in seconds of running (a jump lasts 0.69 s, a double jump longer, so even the tightest is possible).
const MIN_GAP_SEC = [.85, .75, .66, .58, .52];
// How the gaps are shuffled: share of TIGHT clusters, share of MEDIUM gaps (the rest are long breathers). Later levels have more clusters.
const GAP_MIX = [[.15, .55], [.25, .50], [.35, .45], [.45, .40], [.55, .35]];
const COMBO_CHANCE = [0, .1, .25, .35, .45];                      // chance that a flyer is placed right behind a ground obstacle (jump, land, then run under it)

const PRACTICE_SECONDS = 3;                                  // Practice: about how long you run between two questions
// Distance from the previous obstacle to the next one. Always random, never below what can be cleared:
// a ground obstacle followed by a flyer leaves time to land first; a flyer followed by a ground obstacle leaves time to get past it before jumping.
function gapAfter(prev, type, level) {
  const spd = 330 * SPEED_BY_LEVEL[level - 1], minPx = spd * MIN_GAP_SEC[level - 1], d = OBS[type], pd = prev ? OBS[prev.type] : null;
  const [tight, medium] = GAP_MIX[level - 1], r = Math.random();
  const mult = r < tight ? 1 + Math.random() * .15 : r < tight + medium ? 1.35 + Math.random() * .55 : 2 + Math.random() * .8;
  let g = minPx * mult + (pd && !pd.fly ? (prev.w ? prev.w : Math.min(pd.w || 40, 90) * .6) : 0);       // (prev.w = a long stretch from a pattern: leave its whole length)
  if (pd && pd.vx) g += 110;                                                       // walkers move toward you: keep clear of whatever is in front of them
  if (pd && pd.kind === 'zone' && !prev.w) g += pd.w * .5;
  if (d.fly && pd && !pd.fly) g = Math.max(g, spd * .78 + (d.w || 0) * .5);        // land from the jump before the flyer arrives
  if (pd && pd.fly && !d.fly) g = Math.max(g, (prev.w ? prev.w / 2 : pd.w || 0) + 28 + spd * .48);       // get past the flyer before jumping the next thing
  if (d.fly && d.w) g += d.w * .3;                                                 // wide flyers (storms, power lines) get a bit more room
  return g;
}
// Bigger "moves" that make you change where you are, not just when you jump. Every one always has a way through:
//   tapeWall  a long wall of red tape: hop onto the platform above it and run along
//   skyField  a long stretch of flooded land / unstable soil: only a HIGH platform (double jump) gets you across without touching it
//   lowLine   a very long power line / storm cloud: you must stay down on the ground for the whole length
//   pipeRow   three loose pipes in a row: run through when they are down, or take the high platform over them
const PATTERNS = { 2: ['tapeWall'], 3: ['skyField', 'lowLine'], 4: ['lowLine', 'pipeRow'], 5: ['tapeWall', 'skyField', 'lowLine', 'pipeRow'] };
const PATTERN_CHANCE = [0, .18, .28, .36, .44];
function patternType(kind, level) { return kind === 'tapeWall' ? 'redtape' : kind === 'skyField' ? pick(['flood', 'soil']) : kind === 'lowLine' ? (level === 3 ? 'powerline' : level === 4 ? 'storm' : pick(['powerline', 'storm'])) : 'pipe'; }
function makePattern(kind, type, x) {
  const obs = [], floats = [], mk = (t, xx, extra) => Object.assign({ x: xx, type: t, fly: !!OBS[t].fly, hit: false, t0: Math.random() * PIPE_CYCLE }, extra || {});
  if (kind === 'tapeWall') { const w = rnd(300, 380); obs.push(mk('redtape', x, { w })); floats.push({ x: x - 30, w: w + 60, h: 115 }); }
  else if (kind === 'skyField') { const w = rnd(380, 500); obs.push(mk(type, x, { w })); floats.push({ x: x - 40, w: w + 80, h: pick([170, 185, 195]) }); }
  else if (kind === 'lowLine') { const w = rnd(360, 480); obs.push(mk(type, x + w / 2, { w })); }
  else { for (let i = 0; i < 3; i++) obs.push(mk('pipe', x + i * 190)); if (Math.random() < .5) floats.push({ x: x - 30, w: 2 * 190 + 56 + 60, h: 175 }); }
  const last = obs[obs.length - 1], endX = last.fly ? last.x + last.w / 2 : last.x + (last.w || OBS[last.type].w);
  return { obs, floats, last, endX };
}
function fillContent(p, first, theme, level = 1, keepX = null) {
  if (curMode === 'practice') { p.obs = []; p.floats = []; return; }        // Practice mode: a clear track - no obstacles at all
  // keepX: when a platform ahead is re-filled (level just changed), everything at x <= keepX is already on screen,
  // so it is left exactly as it is; only what is still off-screen gets the new level's obstacles and spacing.
  const kept = keepX === null ? [] : (p.obs || []).filter(c => c.x <= keepX);
  const keptFloats = keepX === null ? [] : (p.floats || []).filter(f => f.x <= keepX);
  p.obs = kept.slice();
  // nothing appears for the first 3 seconds: the first obstacle enters the screen after ~3.1 s (start x=60, speed 330 px/s, screen shows 720 px ahead)
  // (faster levels cover the same 720 px sooner, so the quiet start is stretched by the level's speed to stay a full 3 s)
  let prev = kept.length ? kept[kept.length - 1] : null;
  let x = prev ? 0 : Math.max(p.s + (first ? Math.round(2200 * SPEED_BY_LEVEL[level - 1]) : 340), keepX === null ? 0 : keepX + 40);
  const fresh = [], patFloats = [], pool = LEVEL_OBS[level - 1], flyPool = pool.filter(t => OBS[t].fly);
  while (true) {
    if (prev && !first && PATTERNS[level] && Math.random() < PATTERN_CHANCE[level - 1]) {          // a bigger move instead of a single obstacle
      const kind = pick(PATTERNS[level]), ptype = patternType(kind, level);
      if (!(prev.fly && OBS[ptype].fly)) {
        const px0 = prev.x + gapAfter(prev, ptype, level), pat = makePattern(kind, ptype, px0);
        if (pat.endX < p.e - 300) { pat.obs.forEach(c => p.obs.push(c)); pat.floats.forEach(f => patFloats.push(f)); prev = pat.last; continue; }
      }
    }
    let type = null;
    for (let tries = 0; tries < 40 && !type; tries++) {
      const t = pick(pool), d = OBS[t];
      if (d.fly && prev && prev.fly) continue;                                    // no back-to-back flyers
      if (first && !prev && d.vx) continue;                                       // nothing walks in during the quiet start
      type = t;
    }
    if (!type) type = pool.find(t => !OBS[t].fly);
    // later levels: sometimes a flyer right behind a ground obstacle - jump, land, then run under it
    if (prev && !prev.fly && !OBS[prev.type].vx && flyPool.length && Math.random() < COMBO_CHANCE[level - 1]) type = pick(flyPool);
    if (prev) x = prev.x + gapAfter(prev, type, level);
    if (x >= p.e - 300) break;
    const c = { x, type, fly: !!OBS[type].fly, hit: false, t0: Math.random() * PIPE_CYCLE };
    p.obs.push(c); fresh.push(c); prev = c;
  }
  // floating platforms: you can land on them (from above) and run along them to hop over a ground obstacle.
  // They only sit over ground obstacles that stay put, never near a flyer. Height 105-125 px: reachable with one jump, easy with a double jump.
  p.floats = keptFloats.concat(patFloats);
  const flyers = p.obs.filter(c => c.fly);
  fresh.forEach(c => {
    if (c.fly || OBS[c.type].vx || Math.random() > 0.7) return;
    const w = (OBS[c.type].w || 40) + 100 + rnd(0, 60), fx = c.x - 50 - rnd(0, 20);
    if (flyers.some(f => f.x > fx - 90 && f.x < fx + w + 90)) return;
    p.floats.push({ x: fx, w, h: pick([105, 115, 125]) });
  });
}
function makePlatform(s, e, first, theme = 0, level = 1) {
  const p = { s, e, obs: [], floats: [], bridged: false, bridge: null, gapW: 0 };
  fillContent(p, first, theme, level);
  return p;
}

function setGap(p, w) {                                     // resize a gap and slide everything beyond it
  const d = w - p.gapW; p.gapW = w;
  for (let i = G.platforms.indexOf(p) + 1; i < G.platforms.length; i++) {
    const q = G.platforms[i]; q.s += d; q.e += d; q.obs.forEach(c => c.x += d); (q.floats || []).forEach(f => f.x += d);
  }
}
function ensureNext() {
  const p = G.platforms[G.pi];
  if (G.pi === G.platforms.length - 1 && G.px > p.e - 1100) {
    p.problem = nextProblem();                               // the puzzle decides how wide the gap is
    p.gapW = gapFor(p.problem);
    p.shapeP = p.problem; p.under = Math.random() < .5;                  // half of the gaps are shaped holes: the bridge goes DOWN into them
    const s = p.e + p.gapW;
    const secs = G.mode === 'practice' ? PRACTICE_SECONDS : SECONDS_BETWEEN_QUESTIONS;
    const runLen = Math.round(secs * 330 * SPEED_BY_LEVEL[G.level - 1] * (0.9 + Math.random() * 0.2));   // time to dodge before the next question
    G.platforms.push(makePlatform(s, s + runLen, false, G.theme, G.level));
  }
}

// the next question: Bridge Run follows your level; Practice picks at random from the question types you chose
function nextProblem() {
  if (G.mode === 'practice') { const t = pick(G.ptypes); return genProblem(t.level, undefined, t.kind); }
  return genProblem(G.level);
}

/* ---- screens: title -> menu -> (Bridge Run | Practice setup | Shop) ---- */
let screen = 'title';                                                  // title | menu | practice | play
function showScreen(name) {
  screen = name;
  $('title').classList.toggle('hidden', name !== 'title');
  $('menu').classList.toggle('hidden', name !== 'menu');
  $('practice').classList.toggle('hidden', name !== 'practice');
  $('sb').classList.toggle('playing', name === 'play');                // the ☰ Menu / pause button only shows while you're actually playing
  if (name === 'title') startTitleAnim(); else stopTitleAnim();
  const f = { title: 'btnPlay', menu: 'btnStart', practice: 'btnPracStart' }[name];       // keyboard: the main button is ready to press
  if (f) setTimeout(() => { const el = $(f); if (el && el.offsetParent !== null && !el.disabled) el.focus(); }, 30);
}
function hidePlayOverlays() {
  ['over', 'feedback', 'problem', 'pause', 'shop', 'exitConfirm'].forEach(id => $(id).classList.add('hidden'));
}
// back to the Menu screen (from the pause menu or the end-of-run screen)
function toMenu() {
  setPaused(false); G = newWorld(true); curMode = 'run';
  hidePlayOverlays(); buildMenu(); showScreen('menu');
}
// startGame()   = a brand-new Bridge Run from level 1
// startGame(cp) = start from a saved level checkpoint: same level and distance, 3 fresh hearts.
function startGame(cp) {
  curMode = 'run'; G = newWorld(false, cp);
  G.tipT = cp ? 0 : 4;
  hidePlayOverlays(); showScreen('play');
  audioInit();
  toast(cp ? `Level ${cp.level} · continuing from ${Math.floor(cp.px / 30)} m` : 'Run! Jump obstacles — a crash costs a ❤️', '');
}
// Practice: no obstacles, no hearts, no timer. `types` = the PRACTICE_TYPES entries the player picked.
function startPractice(types) {
  curMode = 'practice'; G = newWorld(false, undefined, 'practice'); G.ptypes = types.slice();
  G.tipT = 0;
  hidePlayOverlays(); showScreen('play');
  audioInit();
  toast('Practice: no obstacles, no hearts — take your time!', '');
}

/* ===================== AUDIO ===================== */
let ac = null;
function audioInit() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) {} }
function beep(f, d = .1, type = 'sine', v = .05, delay = 0) {
  if (muted || !ac) return;
  try {
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + .02);
  } catch (e) {}
}
const sfx = {
  jump() { beep(420, .12, 'square', .03); beep(620, .1, 'square', .03, .05); },
  jump2() { beep(640, .1, 'square', .03); beep(900, .12, 'square', .03, .05); },
  coin() { beep(880, .08, 'triangle', .05); beep(1320, .12, 'triangle', .05, .06); },
  good() { [523, 659, 784, 1047].forEach((f, i) => beep(f, .16, 'triangle', .06, i * .08)); },
  bad() { beep(220, .25, 'sawtooth', .06); beep(150, .35, 'sawtooth', .06, .15); },
  hit() { beep(120, .15, 'square', .06); },
  build() { for (let i = 0; i < 6; i++) beep(300 + i * 40, .06, 'square', .025, i * .12); },
  thunder() { beep(70, .6, 'sawtooth', .08); }
};

/* ===================== UI HELPERS ===================== */
let toastTimer = 0;
function toast(msg, cls) {
  const t = $('toast'); t.textContent = msg; t.className = 'show ' + (cls || '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = '', 1700);
}
function updateHUD() {
  if (!G) return;
  const practice = G.mode === 'practice';
  $('hLives').style.display = practice ? 'none' : '';                                   // Practice has no hearts...
  $('hCorrectPill').style.display = practice ? '' : 'none';                             // ...so it shows how many you got right instead
  $('hLives').textContent = '❤️'.repeat(G.lives) + '🖤'.repeat(Math.max(0, 3 - G.lives));
  $('hCorrect').textContent = G.solved;
  $('menuBtn').style.visibility = G.state === 'over' ? 'hidden' : '';                     // the end-of-run card has its own Menu button
  $('hStreak').textContent = G.streak;
  $('hCoins').textContent = coins;
  $('hDist').textContent = Math.max(0, Math.floor(G.px / 30));
}
// the Menu screen: Bridge Run, Practice, and the Shop live here (and only here)
function buildMenu() {
  $('mBest').textContent = Math.floor(best);
  $('mBestLevel').textContent = bestLevel;
  $('mCoins').textContent = coins; $('hCoins').textContent = coins;
  const hc = highestCheckpoint();                                     // push the player back into their hardest unlocked level by default
  $('btnStart').textContent = hc ? `▶ Continue · Level ${hc.level}` : 'Start Running!';
  renderStarts($('menuStarts'), '📍 Or start from a level you\'ve reached:');
}

/* ===================== PRACTICE SETUP ===================== */
// which question types are ticked is remembered between visits
let practicePicked = (() => { const s = store.get(KEY.practice, null); return Array.isArray(s) ? s.filter(id => PRACTICE_TYPES.some(t => t.id === id)) : ['scale']; })();
function renderPractice() {
  const grid = $('ptypes'); grid.innerHTML = '';
  PRACTICE_TYPES.forEach(t => {                                            // (listed in level order; each level has its own color)
    const on = practicePicked.includes(t.id), lc = ['#2f80ed', '#1e9e57', '#f2994a', '#9b51e0', '#e0245e'][t.level - 1];
    const card = document.createElement('button'); card.type = 'button';
    card.className = 'ptype' + (on ? ' on' : ''); card.setAttribute('role', 'checkbox'); card.setAttribute('aria-checked', on ? 'true' : 'false');
    let sample = ''; try { sample = pairSVG(genProblem(t.level, undefined, t.kind), false); } catch (e) {}      // a live example of this kind of question
    card.style.borderLeftColor = lc; card.style.borderLeftWidth = '8px';
    card.innerHTML = `<span class="pcheck">${on ? '✓' : ''}</span><span class="plevel" style="color:${lc}">Level ${t.level}</span>` +
      `<span class="pname">${t.name}</span><span class="pdesc">${t.desc}</span><span class="psample" aria-hidden="true">${sample}</span>`;
    card.onclick = () => {
      practicePicked = practicePicked.includes(t.id) ? practicePicked.filter(id => id !== t.id) : practicePicked.concat(t.id);
      store.set(KEY.practice, practicePicked); renderPracticeState();
      card.classList.toggle('on', practicePicked.includes(t.id)); card.setAttribute('aria-checked', practicePicked.includes(t.id) ? 'true' : 'false');
      card.querySelector('.pcheck').textContent = practicePicked.includes(t.id) ? '✓' : '';
    };
    grid.appendChild(card);
  });
  renderPracticeState();
}
function renderPracticeState() {
  const n = practicePicked.length, b = $('btnPracStart');
  b.disabled = n === 0;
  b.textContent = n === 0 ? 'Pick at least one type' : `Start Practice (${n} type${n > 1 ? 's' : ''})`;
}
function openPractice() { hidePlayOverlays(); renderPractice(); showScreen('practice'); }

/* ===================== SHOP ===================== */
let shopRole = 0;                                                         // which job's four looks the Shop is showing
function renderShop() {
  $('shopCoins').textContent = coins;
  const tabs = $('shopTabs'); tabs.innerHTML = '';
  CREW_ROLES.forEach((r, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'roleTab' + (i === shopRole ? ' on' : '');
    b.innerHTML = `<span>${r}</span><small>${CHARACTERS.filter(c => c.role === i && owned.includes(c.id)).length}/4</small>`;
    b.onclick = () => { shopRole = i; renderShop(); tabs.children[i].focus(); };
    tabs.appendChild(b);
  });
  const grid = $('shopGrid'); grid.innerHTML = '';
  CHARACTERS.filter(c => c.role === shopRole).forEach(ch => {
    const has = owned.includes(ch.id), eq = ch.id === charId;
    const card = document.createElement('div'); card.className = 'shopCard' + (eq ? ' eq' : '') + (has ? '' : ' locked');
    const cv = document.createElement('canvas'); cv.width = 110; cv.height = 132; cv.setAttribute('aria-hidden', 'true');
    const g = cv.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 132); grd.addColorStop(0, '#dff1ff'); grd.addColorStop(1, '#f6e7c8');
    g.fillStyle = grd; g.fillRect(0, 0, 110, 132); g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(55, 122, 24, 5, 0, 0, 7); g.fill();
    drawChar(g, 50, 120, ch, { ph: 1.1, running: true });
    card.appendChild(cv);
    const nm = document.createElement('div'); nm.className = 'shopName'; nm.textContent = ch.name; card.appendChild(nm);
    const tg = document.createElement('div'); tg.className = 'shopTag'; tg.textContent = ch.tag; card.appendChild(tg);
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn shopBtn';
    if (eq) { btn.textContent = '✔ Running as'; btn.disabled = true; btn.classList.add('ghost'); }
    else if (has) { btn.textContent = 'Select'; btn.classList.add('alt'); btn.onclick = () => { equipCharacter(ch.id); renderShop(); buildMenu(); }; }
    else {
      btn.textContent = `Hire · ${ch.price} stars`; btn.disabled = coins < ch.price;
      btn.onclick = () => { if (buyCharacter(ch.id)) { sfx.good(); renderShop(); buildMenu(); } };
    }
    card.appendChild(btn); grid.appendChild(card);
  });
}
function openShop() { renderShop(); $('shop').classList.remove('hidden'); const b = $('shopGrid').querySelector('button:not(:disabled)') || $('btnShopClose'); b.focus(); }
function closeShop() { $('shop').classList.add('hidden'); buildMenu(); }

/* ===================== PROBLEM FLOW ===================== */
const TIME_BY_LEVEL = [45, 40, 35, 31, 27];        // seconds to answer, by level
function answerTime() { return TIME_BY_LEVEL[G.level - 1]; }

function startSolve() {
  G.state = 'solve';
  const gp = G.platforms[G.pi];
  G.problem = gp.problem || nextProblem(); gp.problem = null;
  G.timeTotal = G.timeLeft = answerTime();
  const P = G.problem;
  const bn = SHAPES[P.shape].bridge;
  const practice = G.mode === 'practice';
  $('pTitle').textContent = practice ? `Practice · Level ${P.level}` : `Level ${G.level}`;
  $('barFill').parentElement.style.display = practice ? 'none' : '';        // Practice is untimed
  $('pTimer').style.display = practice ? 'none' : '';
  $('pTimer').textContent = '';
  const single = SHAPES[P.shape].single;
  const prompts = {
    scale: 'What is the <b>scale factor</b>?',
    up: 'Find the missing side of the <b>image</b>.',
    down: 'Find the missing side of the <b>image</b>.',
    nest: 'Find the <b>missing length</b>.',
    sim: 'Are these two figures <b>similar</b>?'
  };
  $('pPrompt').innerHTML = P.alg ? 'Solve for <b>x</b>.' : prompts[P.type];
  $('pairWrap').innerHTML = pairSVG(P, false);
  const sim = P.type === 'sim';                                              // "Similar or not?" has two buttons instead of a number box
  $('ansRow').classList.toggle('hidden', sim); $('simRow').classList.toggle('hidden', !sim);
  $('keypad').style.display = sim ? 'none' : '';
  $('ansLbl').textContent = P.type === 'scale' ? 'k =' : P.alg ? 'x =' : '? =';
  $('ansUnit').style.display = P.type === 'scale' || P.alg ? 'none' : '';
  $('ans').value = '';
  $('problem').classList.remove('hidden');
  setTimeout(() => { if (!sim && !matchMedia('(pointer:coarse)').matches) $('ans').focus(); }, 30);
}

function parseAns(str) {                          // whole numbers only
  str = (str || '').trim();
  return /^\d{1,4}$/.test(str) ? Number(str) : NaN;
}

function submit(timedOut, choice) {                 // choice = 'yes' / 'no' for a "Similar or not?" question
  if (G.state !== 'solve') return;
  let val = null;
  if (!timedOut) {
    if (G.problem.type === 'sim') { if (choice !== 'yes' && choice !== 'no') return; val = choice; }
    else {
      val = parseAns($('ans').value);
      if (!isFinite(val)) { const a = $('ans'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); return; }
    }
  }
  const P = G.problem, p = G.platforms[G.pi];
  const ok = val === P.answer;
  P.userAns = val; P.timedOut = !!timedOut;
  if (timedOut) {                                                       // out of time: no bridge at all - you just walk to the edge and fall in
    p.bridge = null; $('problem').classList.add('hidden'); G.state = 'cross';
    toast("Time's up! No bridge…", 'bad'); return;
  }
  // On a wide gap, a plain 2.2x "too big" bridge can run off the right edge of the screen - worse still for a shape (like a
  // leaning parallelogram or trapezoid) whose far point overhangs past its own base width. Cap the ratio using how far that
  // point actually reaches, so the wrong-scale bridge always stays fully on screen no matter the shape or gap width.
  const overhang = Math.max(...P.pts.map(pt => pt[0])) / P.lens[0];
  const maxRatio = Math.min(2.2, 590 / (overhang * p.gapW));
  const ratio = ok ? 1 : P.type === 'sim' ? (val === null ? 0.1 : val === 'yes' ? 1.6 : 0.55) : (val === null || val <= 0 ? 0.1 : clamp(val / P.answer, 0.1, maxRatio));     // the bridge is built at the scale YOUR number implies
  p.bridge = { ratio, len: p.gapW * ratio, ok, prog: 0, collapsed: false, cAnim: 0, P, val, sparked: false, material: pick(BRIDGE_MATERIALS) };  // a fresh random material for every bridge
  $('problem').classList.add('hidden');
  G.state = 'build'; sfx.build();
}

function advanceLevel(lv) {
  G.level = lv;
  G.theme = themeFor(lv, G.solved);                                     // Night City locks in the moment level 4 starts (3000 m)
  for (let i = G.pi; i < G.platforms.length; i++) fillContent(G.platforms[i], false, G.theme, G.level, G.cam + W + 160);   // never touch what is already on screen
  saveCheckpoint({ level: lv, px: (lv - 1) * METERS_PER_LEVEL * 30, solved: G.solved, wrong: G.wrong, bestStreak: G.bestStreak });
  sfx.good(); toast(`🎉 Level ${lv} at ${(lv - 1) * METERS_PER_LEVEL} m: faster + new obstacles!`, 'good');
}
function onBridgeBuilt() {
  const p = G.platforms[G.pi], b = p.bridge;
  if (b.ok) {
    p.bridged = true;
    G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak); G.solved++;
    const oldTheme = G.theme;
    G.theme = themeFor(G.level, G.solved);
    if (G.mode === 'run' && G.theme !== oldTheme)                                          // platforms ahead get the new scenery
      for (let i = G.pi + 1; i < G.platforms.length; i++) fillContent(G.platforms[i], false, G.theme, G.level, G.cam + W + 160);   // never touch what is already on screen
    addCoins(1); sfx.coin();                                          // 1 star for every correct answer
    const up = ' · +1 ⭐';
    toast((b.P.type === 'scale' ? `Scale ×${b.P.k} — ${SHAPES[b.P.shape].bridge} locked in!`
      : b.P.type === 'sim' ? `${b.P.answer === 'yes' ? 'Similar' : 'Not similar'} — ${SHAPES[b.P.shape].bridge} locked in!`
      : b.P.alg ? `x = ${b.P.answer} — ${SHAPES[b.P.shape].bridge} locked in!`
      : `${SHAPES[b.P.shape].bridge} locked in by your ${fmt(b.P.answer)} ft keystone!`) + up, 'good'); sfx.good();
    G.state = 'run';
  } else {
    G.state = 'cross';
  }
}

// the moment the runner drops into the hole: lose a heart
function applyFail() {
  const P = G.problem;
  G.streak = 0; G.wrong++;
  G.missed.push(P);
  sfx.bad(); G.shake = .3;
  if (G.mode === 'practice') { toast('Not quite — see how it works, then try the next one', 'bad'); return; }   // Practice: no hearts to lose
  G.lives--;
  toast(G.lives > 0 ? 'Down the hole! −1 ❤️' : 'Down the hole!', 'bad');
}
// after falling out of sight, the runner is carried back up to the ledge
function startRise() {
  const p = G.platforms[G.pi];
  G.state = 'rise'; G.vy = 0;
  G.rise = { t: 0, x0: G.px, y0: G.py, x1: p.e - 70 };
  toast('Whoosh! Flying back up…', ''); beep(300, .5, 'sine', .05); beep(600, .5, 'sine', .05, .25);
}
function showFeedback() {
  const P = G.problem;
  G.state = 'feedback';
  $('fbTitle').textContent = '💥 Oops!';
  $('fbBody').innerHTML = solutionHTML(P);
  $('fbStorm').innerHTML = G.mode === 'practice' ? '' : '❤️'.repeat(G.lives) + '🖤'.repeat(3 - G.lives);
  $('btnNext').textContent = 'Try a new bridge ➜';
  $('feedback').classList.remove('hidden'); cardAt = performance.now(); $('btnNext').focus();
}

function respawn() {
  const p = G.platforms[G.pi];
  p.bridge = null; p.bridged = false;
  G.px = p.e - 70; G.py = GROUND; G.vy = 0; G.onGround = true;
  const P = nextProblem(); p.problem = P; setGap(p, gapFor(P)); p.shapeP = P; p.under = Math.random() < .5;            // a new puzzle means a new gap width
  $('feedback').classList.add('hidden');
  startSolve();
}

function gameOver() {
  G.state = 'over';
  const total = G.solved + G.wrong, acc = total ? Math.round(G.solved / total * 100) : 0;
  const meters = Math.max(0, Math.floor(G.px / 30)), newBest = meters > best, newBestLevel = G.level > bestLevel;
  saveRunStats();                                       // best distance, highest level, most bridges, best streak
  $('ovTitle').textContent = G.crashed ? '💥 You crashed out!' : '🏁 Run over!'; $('btnAgain').textContent = 'Run again';
  $('ovStats').innerHTML =
    `<div><b>${meters} m</b>Distance ${newBest ? '🏆 New best!' : ''}</div><div><b>${best} m &middot; Level ${bestLevel}</b>Best distance${newBestLevel ? ' 🏆' : ''}</div>` +
    `<div><b>${G.solved}</b>Bridges built</div><div><b>${acc}%</b>Accuracy · best streak ${G.bestStreak}</div>`;
  $('ovReview').innerHTML = missedHTML(G.missed) || `<p>🎉 No missed math problems!${G.crashed ? ' Watch out for obstacles next time.' : ''}</p>`;
  renderStarts($('ovContinue'), '↩ Or continue where you unlocked a level:');      // same level, same distance, fresh hearts
  $('feedback').classList.add('hidden'); $('problem').classList.add('hidden');
  $('over').classList.remove('hidden'); cardAt = performance.now(); $('btnAgain').focus();
}

/* ===================== PHYSICS / UPDATE ===================== */
function support(x) {
  for (const p of G.platforms) {
    if (x >= p.s && x <= p.e) return true;
    const b = p.bridge;
    if (b && !b.collapsed && x >= p.e && x <= p.e + b.len * Math.min(1, b.prog / .4)) return true;
  }
  return false;
}
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) G.particles.push({ x: x + G.cam, y, vx: (Math.random() - .5) * 320, vy: -Math.random() * 300 - 40, life: .6 + Math.random() * .4, color });
}
function speedNow() {
  return 330 * SPEED_BY_LEVEL[G.level - 1] * (1 + Math.min(.4, G.px / 60000));      // faster every level, and gently faster the farther you run
}

function update(dt) {
  G.t += dt;
  G.cam += ((G.px - 240) - G.cam) * Math.min(1, dt * 12);
  if (G.shake > 0) G.shake -= dt;
  if (G.tipT > 0) G.tipT -= dt;
  for (const p of G.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; p.life -= dt; }
  G.particles = G.particles.filter(p => p.life > 0);

  if (G.state === 'menu') { G.px += 170 * dt; G.cam = G.px - 240; return; }
  { const cb = G.platforms[G.pi] && G.platforms[G.pi].bridge; if (cb && cb.collapsed) cb.cAnim += dt; }   // debris keeps falling
  if (G.state === 'over' || G.state === 'feedback') return;

  const p = G.platforms[G.pi];
  ensureNext();
  G.jumpBuf = Math.max(0, G.jumpBuf - dt);

  if (G.state === 'run') {
    const sp = speedNow() * (G.stumble > 0 ? 0.5 : 1);
    G.stumble = Math.max(0, G.stumble - dt);
    G.px += sp * dt;
    if (!p.bridged && G.px >= p.e - 70) { G.px = p.e - 70; startSolve(); }
    if (G.jumpBuf > 0) {
      if (G.onGround) { G.vy = -830; G.onGround = false; G.jumpBuf = 0; G.airJumps = 0; sfx.jump(); }
      else if (G.airJumps < 1) {                                       // double jump: one extra jump in mid-air
        G.airJumps++; G.vy = -800; G.jumpBuf = 0; sfx.jump2();
        for (let i = 0; i < 10; i++) G.particles.push({ x: G.px + (Math.random() - .5) * 20, y: G.py - 4, vx: (Math.random() - .5) * 200, vy: 60 + Math.random() * 100, life: .35, color: '#fff' });
      }
    }
    // things that walk toward you (protesters, lawyers, endangered animals) start moving once they're on screen
    for (const q of G.platforms) for (const c of q.obs) {
      const vx = OBS[c.type].vx;
      if (vx && !c.hit && c.x - G.cam < W + 200 && c.x - G.cam > -150) c.x += vx * dt;
    }
    // obstacles: a crash costs a heart, then you get a moment of invincibility
    if (G.inv > 0) G.inv -= dt;
    const grounded = G.py >= GROUND - 4;                              // feet on the ground (not up on a floating platform or in the air)
    for (const c of p.obs) {
      const d = OBS[c.type], dw = c.w || d.w;
      if (c.hit && d.kind !== 'zone') continue;
      let hurt = false, ex = c.x + (dw || 0) / 2, ey = GROUND - 20;
      if (d.fly) {
        const y = flyYOf(c), half = dw ? dw / 2 + 12 : 28;
        hurt = Math.abs(G.px - c.x) < half && (G.py - 92) < y + 14 && G.py > y - 14; ex = c.x; ey = y;
      } else if (d.kind === 'zone') {
        const inside = grounded && G.px + 6 > c.x && G.px - 6 < c.x + dw;
        if (inside && !c.hit) {
          if (d.effect === 'slow') {                                    // puddle: you slip and lose speed
            G.stumble = Math.max(G.stumble, .3);
            if (!c.warned) { c.warned = true; toast(d.msg, 'bad'); }
            if (Math.random() < .6) G.particles.push({ x: G.px, y: GROUND, vx: (Math.random() - .5) * 160, vy: -120 - Math.random() * 120, life: .4, color: '#7fc8ff' });
          } else if (d.effect === 'collapse') {                         // unstable soil: keep running slowly on it and it gives way
            G.stumble = Math.max(G.stumble, .3); c.sink = (c.sink || 0) + dt; G.shake = Math.max(G.shake, .05);
            if (!c.warned) { c.warned = true; toast('Unstable soil! Jump off it!', 'bad'); }
            if (c.sink > 0.55) { hurt = true; c.collapsed = true; }
          } else if (d.effect === 'hurt') hurt = true;                  // a hole in the ground
        } else if (d.effect === 'collapse' && !c.collapsed) c.sink = 0;
        ey = GROUND + 6;
      } else if (d.kind === 'pipe') {
        const h = pipeH(c);
        hurt = h > 16 && G.px + 10 > c.x && G.px - 10 < c.x + dw && G.py > GROUND - h + 4; ey = GROUND - h / 2;
      } else {
        hurt = G.px + 10 > c.x && G.px - 10 < c.x + dw && G.py > GROUND - d.h + 4; ey = GROUND - d.h / 2;
      }
      if (hurt && G.inv <= 0 && !c.hit) {
        c.hit = true; G.inv = 1.6; G.stumble = .5; G.shake = .35; G.lives--;
        sfx.hit(); sfx.bad(); burst(ex - G.cam, ey, '#ff8a5c', 18);
        toast(G.lives > 0 ? `${d.msg || 'You ran into the ' + d.label + '!'} −1 ❤️` : 'Crashed out!', 'bad');
        if (G.lives <= 0) { G.crashed = true; gameOver(); return; }
        if (c.type === 'hole') {                                           // you really fall into a hole in the ground...
          G.state = 'hfall'; G.holeC = c; G.vy = 0; G.px = c.x + dw / 2; G.onGround = false; G.airJumps = 0;
          burst(c.x + dw / 2 - G.cam, GROUND, '#7a5230', 14); return;
        }
      }
    }
    // every 1000 m is a new level: faster runner, that level's own obstacles, tighter spacing, and a saved checkpoint to restart from
    if (G.mode === 'run') { const lv = levelForMeters(Math.floor(G.px / 30)); if (lv > G.level) advanceLevel(lv); }
    // move to next platform when we've crossed onto it
    const nx = G.platforms[G.pi + 1];
    if (nx && G.px > nx.s + 20) G.pi++;
  } else if (G.state === 'build') {
    p.bridge.prog = Math.min(1, p.bridge.prog + dt / 1.6);
    if (p.bridge.prog >= 1 && !p.bridge.sparked) {          // keystone beam lands
      p.bridge.sparked = true;
      const P = p.bridge.P, V = bridgeVerts(p), ki = Math.max(P.ti, 0), a = V[ki], c = V[(ki + 1) % V.length];
      burst((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, p.bridge.ok ? '#ffd23f' : '#ff5d5d', 30);
      G.shake = p.bridge.ok ? .12 : .3; if (!p.bridge.ok) sfx.hit();
    }
    if (p.bridge.prog >= 1) onBridgeBuilt();
  } else if (G.state === 'cross') {
    G.px += 250 * dt;
    const b = p.bridge;
    if (b) { // a wrong bridge always collapses: too long snaps in the middle of the gap; too short buckles under the runner and swings down
    const trigger = b.ratio > 1 ? p.gapW * .5 : b.len * .55;
    if (!b.ok && !b.collapsed && G.px >= p.e + trigger) {
      b.collapsed = true; sfx.hit(); G.shake = .4;
      burst(p.e + trigger - G.cam, GROUND, '#c98a4b', 26);
    } }
  } else if (G.state === 'solve' && G.mode === 'run') {                   // (Practice has no timer)
    G.timeLeft -= dt;
    const f = clamp(G.timeLeft / G.timeTotal, 0, 1);
    $('barFill').style.width = (f * 100) + '%';
    $('barFill').style.background = f > .5 ? '#1e9e57' : f > .25 ? '#f2b01e' : '#e04545';
    $('pTimer').textContent = '⏱ ' + Math.max(0, Math.ceil(G.timeLeft)) + 's';
    if (G.timeLeft <= 0) submit(true);
  }
  // camera: slide down to show a shaped hole while you work on it, and back up afterwards
  { const pp = G.platforms[G.pi]; let target = 0;
    if (pp && pp.under && pp.gapW && G.px > pp.e - 420 && G.px < pp.e + (pp.bridge ? pp.bridge.len : pp.gapW) + 60 && G.state !== 'over')
      target = clamp(pitDepth(pp) - 110, 0, 230);
    G.camY += (target - G.camY) * Math.min(1, dt * 3); if (Math.abs(target - G.camY) < .5) G.camY = target; }
  // gravity + landing
  if (G.state === 'rise') {
    const r = G.rise; r.t = Math.min(1, r.t + dt / 1.5);
    const e = 1 - Math.pow(1 - r.t, 3);
    G.px = r.x0 + (r.x1 - r.x0) * e;
    G.py = r.y0 + (GROUND - r.y0) * e - Math.sin(Math.PI * e) * 60;
    if (Math.random() < .5) G.particles.push({ x: G.px, y: G.py - 20, vx: (Math.random() - .5) * 60, vy: 80, life: .5, color: '#fff' });
    if (r.t >= 1) {
      G.py = GROUND; G.vy = 0; G.onGround = true; G.airJumps = 0;
      if (r.hole) { G.state = 'run'; G.inv = 1.8; } else showFeedback();                  // (out of a hole: straight back to running)
    }
  } else if (G.state === 'hfall') {                                      // ...drop down the hole, then balloons carry you back up out of it
    G.vy += 2400 * dt; G.py += G.vy * dt;
    if (G.py >= GROUND + 105) {
      G.py = GROUND + 105; G.state = 'rise'; G.vy = 0;
      G.rise = { t: 0, x0: G.px, y0: G.py, x1: G.holeC.x + OBS.hole.w + 45, hole: true };
      toast('Whoosh! Balloons to the rescue…', ''); beep(300, .5, 'sine', .05); beep(600, .5, 'sine', .05, .25);
    }
  } else if (G.state !== 'fall') {
    const prevPy = G.py;
    G.vy += 2400 * dt; G.py += G.vy * dt;
    // (no ceiling: you can jump right off the top of the screen and come back down)
    let landed = false;
    if (G.vy >= 0) for (const q of G.platforms) {                      // land on a floating platform (one-way: only from above)
      if (!q.floats || q.e < G.px - 500 || q.s > G.px + 500) continue;
      for (const f of q.floats) {
        const top = GROUND - f.h;
        if (prevPy <= top + 3 && G.py >= top && G.px >= f.x - 6 && G.px <= f.x + f.w + 6) { G.py = top; G.vy = 0; G.onGround = true; G.airJumps = 0; landed = true; }
      }
    }
    if (!landed) {
      if (G.vy >= 0 && G.py >= GROUND && G.py <= GROUND + 40 && support(G.px)) { G.py = GROUND; G.vy = 0; G.onGround = true; G.airJumps = 0; }
      else G.onGround = false;
    }
    if (G.py > GROUND + 40 && !support(G.px)) { G.state = 'fall'; applyFail(); }
  } else {
    G.vy += 2400 * dt; G.py += G.vy * dt;
    { const pp = G.platforms[G.pi]; if (pp && pp.under && pp.shapeP && pp.gapW && G.px > pp.e - 40 && G.px < pp.e + pp.gapW + 40) {
      const [lo, hi] = pitLimits(pp, G.py), t = hi - lo > 34 ? clamp(G.px, lo + 17, hi - 17) : (lo + hi) / 2;
      G.px += (t - G.px) * Math.min(1, dt * 12); } }
    if (G.py > H + G.camY + 90) { if (G.lives <= 0) gameOver(); else startRise(); }
  }
}

/* ===================== DRAWING ===================== */
function hash(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
function themeNow() { return THEMES[G.theme] || THEMES[0]; }         // (never let an odd theme value stop the drawing)

function drawSky(T) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, T.sky[0]); g.addColorStop(1, T.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = T.sun; ctx.beginPath(); ctx.arc(780, 95, 44, 0, 7); ctx.fill();
  if (T.city) { ctx.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { ctx.globalAlpha = .5 + .5 * Math.sin(G.t * 2 + i); ctx.fillRect(hash(i) * W, hash(i + 9) * 240, 2, 2); } ctx.globalAlpha = 1; }
  else {
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 5; i++) {
      const x = ((i * 260 - G.cam * .15 + G.t * 6) % (W + 260) + W + 260) % (W + 260) - 130, y = 60 + (i % 3) * 45;
      ctx.beginPath(); ctx.ellipse(x, y, 50, 16, 0, 0, 7); ctx.ellipse(x + 26, y - 10, 30, 14, 0, 0, 7); ctx.ellipse(x - 26, y - 6, 26, 12, 0, 0, 7); ctx.fill();
    }
  }
}
function drawHills(T, factor, color, baseY, amp) {
  ctx.fillStyle = color;
  if (T.city) {
    const bw = 70;
    for (let x = -bw; x < W + bw; x += bw) {
      const wx = x + G.cam * factor, i = Math.floor(wx / bw), h = 60 + hash(i + factor * 100) * amp;
      const sx = i * bw - G.cam * factor;
      ctx.fillRect(sx, baseY - h, bw - 6, h + 200);
      if (factor > .4) { ctx.fillStyle = 'rgba(255,230,140,.55)'; for (let yy = baseY - h + 10; yy < baseY - 10; yy += 22) for (let xx = sx + 8; xx < sx + bw - 16; xx += 18) if (hash(i * 31 + yy + xx) > .45) ctx.fillRect(xx, yy, 8, 10); ctx.fillStyle = color; }
    }
  } else {
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) {
      const wx = x + G.cam * factor;
      const h = amp * (.5 + .3 * Math.sin(wx * .004) + .2 * Math.sin(wx * .011 + 2) + .1 * Math.sin(wx * .027));
      ctx.lineTo(x, baseY - h);
    }
    ctx.lineTo(W, H); ctx.fill();
  }
}

// screen-space vertices of the bridge shape (base beam sits on the deck, scaled so a correct base spans the gap)
// ---- Bridge materials (testing) ----
// Press "M" while playing to cycle these live, so a look can be tried on real questions before it's made permanent.
// Every beam is drawn in its own local frame - translated to its start point and rotated to face its end point - so
// the exact same drawing function works on any side of any shape (triangle, rectangle, pentagon, L-shape...).
const BRIDGE_MATERIALS = ['wood', 'steel', 'stone', 'cable'];
function beamFrame(ax, ay, bx, by, drawFn) {
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(by - ay, bx - ax)); drawFn(); ctx.restore();
}
function drawWoodBeam(len, w) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#5c3a1a'; ctx.lineWidth = w * 1.35; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
  ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
  ctx.strokeStyle = '#c9975a'; ctx.lineWidth = Math.max(1.5, w * .22); ctx.beginPath(); ctx.moveTo(2, -w * .28); ctx.lineTo(Math.max(2, len - 2), -w * .28); ctx.stroke();
  ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 1.2;
  for (let x = 9; x < len - 5; x += 15) { ctx.beginPath(); ctx.moveTo(x, -w * .18); ctx.lineTo(x + 5, w * .18); ctx.stroke(); }
  ctx.fillStyle = '#4a2c12'; ctx.beginPath(); ctx.arc(0, 0, w * .34, 0, 7); ctx.arc(len, 0, w * .34, 0, 7); ctx.fill();
}
function drawSteelBeam(len, w) {
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#374151'; ctx.lineWidth = w * 1.3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
  ctx.strokeStyle = '#5b6577'; ctx.lineWidth = w * .78; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
  ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = Math.max(1.5, w * .22); ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(Math.max(3, len - 3), 0); ctx.stroke();
  ctx.fillStyle = '#6b7280'; ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 1.4;
  const step = Math.max(26, len); for (let x = 0; x <= len + 1; x += step) { ctx.beginPath(); ctx.arc(x, 0, w * .3, 0, 7); ctx.fill(); ctx.stroke(); }
}
function drawStoneBeam(len, w) {
  const bw = clamp(Math.round(len / 5), 16, 40), n = Math.max(1, Math.round(len / bw));
  for (let i = 0; i < n; i++) {
    const x0 = i * len / n, x1 = (i + 1) * len / n;
    ctx.fillStyle = i % 2 ? '#b8ab94' : '#c9bd9a'; ctx.strokeStyle = '#6b6152'; ctx.lineWidth = 1.4;
    ctx.fillRect(x0, -w / 2, x1 - x0, w); ctx.strokeRect(x0, -w / 2, x1 - x0, w);
  }
}
function drawCableBeam(len, w) {
  ctx.lineCap = 'round'; const rw = Math.max(2.5, w * .32);
  ctx.setLineDash([6, 6]); ctx.lineDashOffset = 0;
  ctx.strokeStyle = '#2f3540'; ctx.lineWidth = rw; ctx.beginPath(); ctx.moveTo(0, -w * .14); ctx.lineTo(len, -w * .14); ctx.stroke();
  ctx.lineDashOffset = 6; ctx.strokeStyle = '#7b8494'; ctx.beginPath(); ctx.moveTo(0, w * .14); ctx.lineTo(len, w * .14); ctx.stroke();
  ctx.setLineDash([]); ctx.lineDashOffset = 0;
  ctx.fillStyle = '#5b6478'; ctx.strokeStyle = '#2f3540'; ctx.lineWidth = 1.6;
  ctx.fillRect(-6, -8, 12, 16); ctx.strokeRect(-6, -8, 12, 16); ctx.fillRect(len - 6, -8, 12, 16); ctx.strokeRect(len - 6, -8, 12, 16);
  if (len > 26) { ctx.save(); ctx.translate(len / 2, 0); ctx.rotate(Math.PI / 4); ctx.fillRect(-5, -5, 10, 10); ctx.strokeRect(-5, -5, 10, 10); ctx.restore(); }
}
const BEAM_DRAW = { wood: drawWoodBeam, steel: drawSteelBeam, stone: drawStoneBeam, cable: drawCableBeam };
// draws (a fraction `frac` of) the beam from (ax,ay) to (bx,by) in the given material - `w` is the same beam width
// the flat-color version used to take, so every call site just swaps in this function. Each bridge picks its own
// material at random when it's built (see submit()), so two bridges on screen at once can look different.
function drawMaterialBeam(ax, ay, bx, by, w, frac, material) {
  const len = Math.hypot(bx - ax, by - ay) * clamp(frac, 0, 1);
  if (len < .5) return;
  beamFrame(ax, ay, bx, by, () => (BEAM_DRAW[material] || drawWoodBeam)(len, w));
}

function bridgeVerts(p) {
  const b = p.bridge, x0 = p.e - G.cam, sc = b.len / b.P.lens[0];
  return b.P.pts.map(([x, y]) => [x0 + x * sc, p.under ? GROUND + y * sc : GROUND - y * sc]);   // "under" bridges hang DOWN from the deck
}
function haloText(txt, x, y, color, size) {
  ctx.font = `900 ${size}px Trebuchet MS, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText(txt, x, y); ctx.fillStyle = color; ctx.fillText(txt, x, y);
}
function drawBridge(p, T) {
  const b = p.bridge; if (!b) return;
  const P = b.P, sh = SHAPES[P.shape], n = P.pts.length, ti = P.ti;
  const x0 = p.e - G.cam;
  if (x0 > W + 600 || x0 + b.len < -600) return;
  const V = bridgeVerts(p);
  const deckP = Math.min(1, b.prog / .4), beamP = clamp((b.prog - .35) / .65, 0, 1);
  const dl = b.len * deckP;
  const done = beamP >= 1;
  const paint = () => {
  ctx.lineCap = 'butt'; ctx.lineJoin = 'round';                 // beams end exactly at their joints (no overshoot)
  const material = b.material || 'wood';                        // picked once, at random, when this bridge was built (see submit())
  // deck planks (styled to loosely match the beam material)
  if (dl > 1) {
    if (material === 'steel') {
      ctx.fillStyle = '#6b7280'; ctx.fillRect(x0, GROUND - 2, dl, 12);
      ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = x0; x < x0 + dl; x += 18) { ctx.moveTo(x, GROUND - 2); ctx.lineTo(x + 9, GROUND + 10); ctx.lineTo(x + 18, GROUND - 2); } ctx.stroke();
    } else if (material === 'stone') {
      ctx.fillStyle = '#b8ab94'; ctx.fillRect(x0, GROUND - 2, dl, 12);
      ctx.strokeStyle = '#6b6152'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = x0; x < x0 + dl; x += 22) { ctx.moveTo(x, GROUND - 2); ctx.lineTo(x, GROUND + 10); } ctx.stroke();
    } else {
      ctx.fillStyle = '#8a4b2a'; ctx.fillRect(x0, GROUND - 2, dl, 12);
      ctx.strokeStyle = '#5c2f18'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = x0; x < x0 + dl; x += 14) { ctx.moveTo(x, GROUND - 2); ctx.lineTo(x, GROUND + 10); } ctx.stroke();
    }
  }
  // beam order: base first, the keystone (unknown side) always LAST
  const ord = []; for (let i = 1; i < n; i++) if (i !== ti) ord.push(i); if (ti > 0) ord.push(ti);
  const seg = (i, f, w, col) => {                                // a plain colored line - used only for the correct/wrong glow halo now
    const a = V[i], c = V[(i + 1) % n];
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f); ctx.stroke();
  };
  const mat = (i, f, w) => { const a = V[i], c = V[(i + 1) % n]; drawMaterialBeam(a[0], a[1], c[0], c[1], w, f, material); };
  const pulse = .5 + .5 * Math.sin(G.t * 6);
  if (done) {                                             // tint + bracing once the frame is complete
    ctx.fillStyle = b.ok ? (p.under ? 'rgba(255,190,80,.4)' : 'rgba(255,190,80,.16)') : 'rgba(255,80,80,.14)';
    ctx.beginPath(); V.forEach((v, i) => i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])); ctx.closePath(); ctx.fill();
    const braceLines = [];                                        // [ax,ay,bx,by] for every brace, regardless of shape
    if (sh.brace) sh.brace.forEach(([i, j]) => braceLines.push([V[i][0], V[i][1], V[j][0], V[j][1]]));
    else if (n === 3) braceLines.push([V[2][0], V[2][1], V[2][0], GROUND]);
    else if (n === 4) { braceLines.push([V[0][0], V[0][1], V[2][0], V[2][1]]); braceLines.push([V[1][0], V[1][1], V[3][0], V[3][1]]); }
    else for (let i = 2; i < n - 1; i++) braceLines.push([V[0][0], V[0][1], V[i][0], V[i][1]]);   // fan bracing for pentagons / L-shapes
    if (material === 'wood' || material === 'steel') braceLines.forEach(([ax, ay, bx, by]) => drawMaterialBeam(ax, ay, bx, by, 4, 1, material));
    else { ctx.strokeStyle = 'rgba(217,115,26,.75)'; ctx.lineWidth = 2.5; ctx.beginPath(); braceLines.forEach(([ax, ay, bx, by]) => { ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }); ctx.stroke(); }
  }
  mat(0, deckP, 7);
  ord.forEach((i, k) => {
    const f = clamp(beamP * ord.length - k, 0, 1); if (f <= 0) return;
    if (i === ti) { ctx.save(); ctx.shadowColor = b.ok ? '#ffd23f' : '#ff5d5d'; ctx.shadowBlur = 14 + 10 * pulse; seg(i, f, 15, b.ok ? 'rgba(255,210,63,.75)' : 'rgba(255,93,93,.75)'); ctx.restore(); mat(i, f, 8); }
    else mat(i, f, 7);
  });
  if (ti === 0 && deckP >= 1) { ctx.save(); ctx.shadowColor = b.ok ? '#ffd23f' : '#ff5d5d'; ctx.shadowBlur = 14 + 10 * pulse; seg(0, 1, 13, b.ok ? 'rgba(255,210,63,.7)' : 'rgba(255,93,93,.7)'); ctx.restore(); mat(0, 1, 8); }
  // joints, tinted per material
  if (done) {
    const jc = { wood: ['#a06b34', '#5c3a1a'], steel: ['#6b7280', '#1f2937'], stone: ['#c9bd9a', '#6b6152'], cable: ['#5b6478', '#2f3540'] }[material] || ['#fff', '#5c2f18'];
    ctx.fillStyle = jc[0]; ctx.strokeStyle = jc[1]; ctx.lineWidth = 2; V.forEach(v => { ctx.beginPath(); ctx.arc(v[0], v[1], 5, 0, 7); ctx.fill(); ctx.stroke(); });
  }
  };
  if (!b.collapsed) { ctx.save(); paint(); ctx.restore(); }
  else if (b.ratio < 1) {                    // too short: the whole bridge buckles and swings down from the ledge it is attached to
    const ang = Math.min(1.45, b.cAnim * 1.7), al = Math.max(0, 1 - b.cAnim * .7);
    ctx.save(); ctx.globalAlpha = al; ctx.translate(x0, GROUND); ctx.rotate(ang); ctx.translate(-x0, -GROUND); paint(); ctx.restore();
  }
  else {                                     // too long, snapped in the middle: two halves swing down from their ledges
    const mx = x0 + p.gapW / 2, ang = Math.min(1.45, b.cAnim * 1.9), al = Math.max(0, 1 - b.cAnim * .75);
    ctx.save(); ctx.globalAlpha = al; ctx.beginPath(); ctx.rect(x0 - 2500, -2000, mx - (x0 - 2500), 5000); ctx.clip();
    ctx.translate(x0, GROUND); ctx.rotate(ang); ctx.translate(-x0, -GROUND); paint(); ctx.restore();
    ctx.save(); ctx.globalAlpha = al; ctx.beginPath(); ctx.rect(mx, -2000, 4000, 5000); ctx.clip();
    const fx = x0 + p.gapW; ctx.translate(fx, GROUND); ctx.rotate(-ang); ctx.translate(-fx, -GROUND); paint(); ctx.restore();
  }
  // labels (kept upright, drawn unrotated)
  if (done && !b.collapsed) {
    const cx = V.reduce((s, v) => s + v[0], 0) / n, cy = V.reduce((s, v) => s + v[1], 0) / n;
    const label = (i, txt, col, size) => {
      const a = V[i], c = V[(i + 1) % n]; let mx = (a[0] + c[0]) / 2, my = (a[1] + c[1]) / 2;
      let nx = mx - cx, ny = my - cy, l = Math.hypot(nx, ny) || 1;
      if (i === 0) { nx = 0; ny = p.under ? -1 : 1; l = 1; my = GROUND + (p.under ? -6 : 6); }      // base label goes on the open-air side of the deck
      haloText(txt, mx + nx / l * 26, my + ny / l * (i === 0 ? 20 : 26), col, size);
    };
    if (b.val !== null && b.val !== undefined) {              // the built beam's real length (or the scale you chose for level 1)
      const txt = P.type === 'scale' ? '×' + b.val : P.type === 'sim' ? (b.val === 'yes' ? SIM_YES : SIM_NO) : P.alg ? 'x = ' + b.val : fmt((ti >= 0 ? P.lensB[ti] : P.answer) * b.ratio) + ' ft';
      label(ti >= 0 ? ti : 0, (b.ok ? '⭐ ' : '❌ ') + txt, b.ok ? '#b58100' : '#d33', 20);
    }
  }
}

// draws one obstacle. x = its left edge on screen (flyers: their centre). c.x keeps changing for the ones that walk.
function drawObstacle(c, x) {
  const G0 = GROUND, ol = '#3b2a1a', T = G.t, d = OBS[c.type], dw = c.w || d.w;
  ctx.save(); if (c.hit && d.kind !== 'zone' && d.kind !== 'pipe') ctx.globalAlpha = .4;
  ctx.lineWidth = 3; ctx.strokeStyle = ol; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const rr = (a, b, w, h, r, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(a, b, w, h, r); ctx.fill(); ctx.stroke(); };
  const txt = (s, tx, ty, size, col) => { ctx.fillStyle = col || '#222'; ctx.font = `900 ${size}px Trebuchet MS, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, tx, ty); };
  const person = (px, h, body, head, walk, phase) => {                 // a little walking person, feet on the ground at px
    const s = walk ? Math.sin(T * 9 + phase) : 0;
    ctx.strokeStyle = '#5b5f72'; ctx.lineWidth = 5;                    // (kept clear of near-black so it still reads against Night City's dark ground)
    ctx.beginPath(); ctx.moveTo(px, G0 - h * .4); ctx.lineTo(px + s * 5, G0); ctx.moveTo(px, G0 - h * .4); ctx.lineTo(px - s * 5, G0); ctx.stroke();
    ctx.fillStyle = body; ctx.strokeStyle = ol; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(px - 8, G0 - h * .78, 16, h * .42, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = head; ctx.beginPath(); ctx.arc(px, G0 - h * .86, 7, 0, 7); ctx.fill(); ctx.stroke();
  };
  switch (c.type) {
    case 'rock':
      ctx.fillStyle = '#9a8676'; ctx.beginPath(); ctx.moveTo(x, G0); ctx.lineTo(x + 5, G0 - 24); ctx.lineTo(x + 20, G0 - 38); ctx.lineTo(x + 38, G0 - 29); ctx.lineTo(x + 46, G0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(x + 12, G0 - 24); ctx.lineTo(x + 20, G0 - 33); ctx.lineTo(x + 28, G0 - 24); ctx.fill(); break;
    case 'cactus':
      rr(x + 9, G0 - 62, 11, 62, 6, '#3f9b4b'); rr(x, G0 - 40, 10, 7, 3, '#3f9b4b'); rr(x, G0 - 50, 8, 17, 4, '#3f9b4b');
      rr(x + 19, G0 - 34, 10, 7, 3, '#3f9b4b'); rr(x + 21, G0 - 46, 8, 17, 4, '#3f9b4b'); break;
    case 'log':
      rr(x, G0 - 30, 64, 30, 10, '#8a5a2b'); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 14, G0 - 20); ctx.lineTo(x + 50, G0 - 20); ctx.moveTo(x + 10, G0 - 10); ctx.lineTo(x + 40, G0 - 10); ctx.stroke();
      ctx.strokeStyle = ol; ctx.lineWidth = 3; ctx.fillStyle = '#c99760'; ctx.beginPath(); ctx.ellipse(x + 56, G0 - 15, 7, 13, 0, 0, 7); ctx.fill(); ctx.stroke(); break;
    case 'stump':
      rr(x, G0 - 44, 36, 44, 5, '#7a4b22'); ctx.fillStyle = '#c99760'; ctx.beginPath(); ctx.ellipse(x + 18, G0 - 44, 18, 6, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#7a4b22'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x + 18, G0 - 44, 9, 3, 0, 0, 7); ctx.stroke(); break;
    case 'cone':
      ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(x + 13, G0 - 38); ctx.lineTo(x + 24, G0 - 4); ctx.lineTo(x + 2, G0 - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 7, G0 - 24, 12, 6); rr(x - 1, G0 - 6, 28, 6, 2, '#ff7a1a'); break;
    case 'barrel':
      rr(x, G0 - 48, 38, 48, 9, '#c0392b'); ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 1.5, G0 - 34, 35, 6); ctx.fillRect(x + 1.5, G0 - 16, 35, 6);
      txt('!', x + 19, G0 - 22, 14); break;
    case 'redtape':                                                    // red tape: bureaucracy, stretched across the path
      rr(x, G0 - 34, 6, 34, 2, '#8a8a8a'); rr(x + dw - 6, G0 - 34, 6, 34, 2, '#8a8a8a');
      ctx.fillStyle = '#d92b2b'; ctx.strokeStyle = '#7a1414'; ctx.lineWidth = 2;
      for (const yy of [G0 - 32, G0 - 17]) { ctx.beginPath(); ctx.moveTo(x + 5, yy); ctx.quadraticCurveTo(x + dw / 2, yy + 5, x + dw - 5, yy); ctx.lineTo(x + dw - 5, yy + 8); ctx.quadraticCurveTo(x + dw / 2, yy + 13, x + 5, yy + 8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      rr(x + dw / 2 - 62, G0 - 70, 124, 30, 5, '#fff'); txt('RED TAPE', x + dw / 2, G0 - 55, 20, '#c0180c'); break;
    case 'home':                                                        // a mini private home: someone lives here, so you can't build through it
      ctx.strokeStyle = ol; ctx.lineWidth = 2.5;
      rr(x + 37, G0 - 62, 8, 20, 1, '#a0523d');                                                                 // chimney
      rr(x + 2, G0 - 34, dw - 4, 34, 2, '#f2d9a8');                                                            // walls
      ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(x - 4, G0 - 34); ctx.lineTo(x + dw / 2, G0 - 58); ctx.lineTo(x + dw + 4, G0 - 34); ctx.closePath(); ctx.fill(); ctx.stroke();   // roof
      rr(x + 8, G0 - 24, 12, 24, 2, '#7a4b22');                                                                 // door
      rr(x + 30, G0 - 27, 14, 13, 2, '#9ad8ff');                                                                // window
      ctx.strokeStyle = '#3a6f8f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 37, G0 - 27); ctx.lineTo(x + 37, G0 - 14); ctx.moveTo(x + 30, G0 - 20.5); ctx.lineTo(x + 44, G0 - 20.5); ctx.stroke();
      rr(x - 92, G0 - 104, 238, 36, 6, '#ffd23f'); txt("DON'T EVICT ME!", x + dw / 2, G0 - 86, 22, '#7a1414'); break;
    case 'protesters': {                                                // a group carrying signs that walks toward you
      const signs = ['NO!', 'STOP', 'WAIT'], cols = ['#fff35c', '#ffffff', '#ffd6a0'];
      for (let i = 0; i < 3; i++) {
        const px = x + 30 + i * 46, bob = Math.abs(Math.sin(T * 6 + i)) * 2, lift = i === 1 ? 14 : 0;
        person(px, 66, ['#c0392b', '#2e86c1', '#27ae60'][i], '#f1c08a', true, i);
        ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px, G0 - 40); ctx.lineTo(px, G0 - 96 - lift - bob); ctx.stroke();
        ctx.lineWidth = 3; rr(px - 23, G0 - 146 - lift - bob, 46, 50, 6, cols[i]);                    // a big sign...
        ctx.lineWidth = 2; ctx.strokeStyle = '#c0392b'; ctx.beginPath(); ctx.roundRect(px - 20, G0 - 143 - lift - bob, 40, 44, 4); ctx.stroke();   // ...with a red border
        txt(signs[i], px, G0 - 121 - lift - bob, i === 0 ? 22 : 17, '#111');              // ...and big dark letters
      } break; }
    case 'lawyer': {                                                    // a lawyer with a briefcase who wants to see a permit
      person(x + 15, 68, '#555b6e', '#f1c08a', true, 0);
      ctx.fillStyle = '#d92b2b'; ctx.beginPath(); ctx.moveTo(x + 15, G0 - 50); ctx.lineTo(x + 18, G0 - 44); ctx.lineTo(x + 15, G0 - 34); ctx.lineTo(x + 12, G0 - 44); ctx.fill();
      rr(x + 19, G0 - 36, 14, 11, 2, '#7a4b22');
      rr(x - 44, G0 - 120, 110, 32, 8, '#fff'); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + 6, G0 - 88); ctx.lineTo(x + 14, G0 - 88); ctx.lineTo(x + 12, G0 - 78); ctx.fill();
      txt('PERMIT?', x + 11, G0 - 104, 21, '#1d2340'); break; }
    case 'tortoise': {                                                  // a protected desert tortoise crossing the trail
      const l = Math.sin(T * 3) * 2;
      ctx.fillStyle = '#c9a26a'; ctx.strokeStyle = ol; ctx.lineWidth = 2.5;
      for (const lx of [x + 8, x + 18, x + 32, x + 40]) { ctx.beginPath(); ctx.roundRect(lx - 3, G0 - 8 + (lx % 2 ? l : -l) * .3, 7, 8, 2); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(x - 2, G0 - 15, 7, 5, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7a8f3a'; ctx.beginPath(); ctx.ellipse(x + 24, G0 - 16, 22, 15, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 24, G0 - 31); ctx.lineTo(x + 24, G0 - 16); ctx.moveTo(x + 10, G0 - 22); ctx.lineTo(x + 38, G0 - 22); ctx.stroke();
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 20, G0 - 30); ctx.lineTo(x + 20, G0 - 70); ctx.stroke();
      rr(x - 52, G0 - 136, 144, 64, 6, '#fff'); txt('PROTECTED', x + 20, G0 - 118, 22, '#0d7a3c'); txt('WILDLIFE', x + 20, G0 - 92, 22, '#0d7a3c'); break; }
    case 'frog': {                                                      // an endangered red-eyed tree frog, hopping toward you
      const hop = Math.abs(Math.sin(T * 5 + c.x * .01)) * 8;
      const E = (ex, ey, rx, ry, f) => { ctx.fillStyle = f; ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, 7); ctx.fill(); if (f !== null) ctx.stroke(); };
      ctx.save(); ctx.translate(x + 32, G0 - hop); ctx.scale(.5, .5); ctx.translate(-110, -128);       // drawn at 220-unit size, then shrunk to about 70 px wide
      ctx.strokeStyle = '#2b3a1e'; ctx.lineWidth = 6.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      E(60, 122, 20, 8, '#ff8a1f'); E(160, 122, 20, 8, '#ff8a1f');                                      // orange back feet
      E(110, 100, 44, 30, '#39d353');                                                                    // body
      ctx.strokeStyle = '#3a6fe0'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(68, 96); ctx.quadraticCurveTo(66, 112, 74, 122); ctx.moveTo(152, 96); ctx.quadraticCurveTo(154, 112, 146, 122); ctx.stroke();   // blue flanks
      ctx.strokeStyle = '#2b3a1e'; ctx.lineWidth = 6.5;
      ctx.fillStyle = '#fff6c2'; ctx.beginPath(); ctx.ellipse(110, 112, 24, 14, 0, 0, 7); ctx.fill();   // cream belly
      E(86, 70, 15, 15, '#e0261f'); E(134, 70, 15, 15, '#e0261f');                                      // big red eyes...
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(86, 70, 3.5, 11, 0, 0, 7); ctx.ellipse(134, 70, 3.5, 11, 0, 0, 7); ctx.fill();   // ...with slit pupils
      ctx.beginPath(); ctx.moveTo(88, 92); ctx.quadraticCurveTo(110, 104, 132, 92); ctx.stroke();         // smile
      ctx.lineWidth = 5; for (const [tx, ty, tr] of [[80, 122, 7], [96, 124, 6], [124, 124, 6], [140, 122, 7]]) E(tx, ty, tr, tr, '#ff8a1f');   // round orange toe pads
      ctx.restore();
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 32, G0 - 46); ctx.lineTo(x + 32, G0 - 64); ctx.stroke();
      rr(x - 44, G0 - 102, 152, 38, 6, '#fff'); txt('ENDANGERED', x + 32, G0 - 83, 22, '#0d7a3c'); break; }
    case 'flood': {                                                     // land under flood water: rippling water, half-sunk fence posts, and a warning sign
      const w = dw, top = G0 - 24;
      ctx.fillStyle = 'rgba(60,140,225,.88)'; ctx.strokeStyle = 'rgba(20,70,140,.95)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x, G0 + 6);
      for (let i = 0; i <= w; i += 8) ctx.lineTo(x + i, top + Math.sin(T * 3 + (x + i) * .08) * 3);          // a wavy surface
      ctx.lineTo(x + w, G0 + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.28)'; for (let i = 20; i < w - 10; i += 46) ctx.fillRect(x + i, top + 10 + (i % 3) * 3, 22, 3);
      ctx.fillStyle = '#7a5230'; ctx.strokeStyle = ol; ctx.lineWidth = 2;                                    // fence posts sticking out of the water
      for (let i = 30; i < w - 20; i += 90) { ctx.beginPath(); ctx.roundRect(x + i, G0 - 46, 7, 26, 2); ctx.fill(); ctx.stroke(); }
      const sx = x + Math.min(w / 2, 80);
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, G0 - 22); ctx.lineTo(sx, G0 - 62); ctx.stroke();
      rr(sx - 52, G0 - 100, 104, 36, 6, '#fff'); txt('FLOOD!', sx, G0 - 82, 24, '#1c5fb5'); break; }
    case 'soil': {                                                      // unstable soil: cracks, and it shakes when you linger on it
      const w = dw, sh = c.sink ? Math.sin(T * 60) * (1 + c.sink * 4) : 0;
      ctx.fillStyle = '#5b3a1e'; ctx.strokeStyle = '#2f1d0e'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x, G0 - 1, w, 15, 6); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#1e1208'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < 5; i++) { const cx0 = x + 10 + i * (w - 20) / 4; ctx.moveTo(cx0, G0 + sh * .2); ctx.lineTo(cx0 + 8, G0 + 6); ctx.lineTo(cx0 - 3, G0 + 12); }
      ctx.stroke(); ctx.fillStyle = '#7a5230'; for (let i = 0; i < 6; i++) ctx.fillRect(x + 8 + i * (w - 16) / 5 + sh, G0 - 5 - Math.abs(Math.sin(T * 8 + i)) * (c.sink ? 5 : 1), 4, 4);
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(x - 12, G0 - 46); ctx.lineTo(x - 2, G0 - 26); ctx.lineTo(x - 22, G0 - 26); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ol; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#6b4a2a'; ctx.beginPath(); ctx.moveTo(x - 12, G0 - 26); ctx.lineTo(x - 12, G0); ctx.stroke(); txt('!', x - 12, G0 - 34, 13); break; }
    case 'hole': {                                                      // a hole in the ground
      const w = dw; ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 3;
      const hg = ctx.createLinearGradient(0, G0, 0, G0 + 125); hg.addColorStop(0, '#1a1030'); hg.addColorStop(1, '#0b0714');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.roundRect(x, G0, w, 125, [0, 0, 12, 12]); ctx.fill(); ctx.stroke();      // a real pit you can fall down
      ctx.fillStyle = '#0b0714'; ctx.beginPath(); ctx.ellipse(x + w / 2, G0 + 2, w / 2, 13, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x + w / 2, G0 + 2, w / 2 - 6, 8, 0, .2, Math.PI - .2); ctx.stroke();
      ctx.fillStyle = '#7a5230'; for (const [px, py] of [[-2, -6], [w + 2, -3], [w * .3, -12], [w * .75, -11]]) { ctx.beginPath(); ctx.arc(x + px, G0 + py + 6, 3, 0, 7); ctx.fill(); } break; }
    case 'pipe': {                                                      // a loose pipe that pops up out of the ground
      const h = pipeH(c);
      ctx.fillStyle = '#5b3a1e'; ctx.strokeStyle = '#2f1d0e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x + dw / 2, G0 + 1, dw / 2, 7, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
      if (h > 1) {
        ctx.lineWidth = 3; ctx.strokeStyle = ol; rr(x + 10, G0 - h, 36, h + 2, 4, '#7d8b9a'); rr(x + 6, G0 - h - 5, 44, 9, 3, '#5f6d7b');
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 15, G0 - h + 2, 5, Math.max(0, h - 4));
        if (h > 14) { ctx.fillStyle = 'rgba(90,170,255,.9)'; for (let i = 0; i < 3; i++) { const dy = ((T * 90 + i * 22) % 44); ctx.beginPath(); ctx.arc(x + 14 + i * 14, G0 - h - 8 - dy * .5, 3, 0, 7); ctx.fill(); } }
      } break; }
    case 'vulture': case 'parrot': case 'falcon': {                     // birds (the falcon is an endangered peregrine)
      const y = flyYOf(c), fl = Math.sin(G.t * 12 + c.x) * 14, col = { vulture: '#3a2a2a', parrot: '#e2334a', falcon: '#a9bcdd' }[c.type];   // falcon brightened so it still shows up against Night City's dark sky
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, 17, 10, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 6, y - 4); ctx.lineTo(x - 26, y - 6 - fl); ctx.lineTo(x - 2, y + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x + 22, y - 6 - fl); ctx.lineTo(x + 8, y + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (c.type === 'falcon') { ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.ellipse(x - 2, y + 3, 10, 5, 0, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#ffc93c'; ctx.beginPath(); ctx.moveTo(x - 15, y - 2); ctx.lineTo(x - 26, y + 3); ctx.lineTo(x - 15, y + 5); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 9, y - 3, 2.5, 0, 7); ctx.fill();
      if (c.type === 'falcon') { rr(x - 76, y - 74, 152, 38, 6, '#fff'); txt('ENDANGERED', x, y - 55, 22, '#0d7a3c'); } break; }
    case 'crate': {                                                     // a tall stack of shipping crates: a supply delay
      const box = (bx, by, bw, bh, f) => { rr(bx, by, bw, bh, 3, f); ctx.strokeStyle = 'rgba(70,40,15,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 4, by + 4); ctx.lineTo(bx + bw - 4, by + bh - 4); ctx.moveTo(bx + bw - 4, by + 4); ctx.lineTo(bx + 4, by + bh - 4); ctx.stroke(); ctx.strokeStyle = ol; ctx.lineWidth = 3; };
      box(x, G0 - 42, 44, 42, '#c9954f'); box(x + 3, G0 - 84, 38, 42, '#d9a862'); break; }
    case 'truck': {                                                     // a dump truck driving toward you
      const bob = Math.sin(T * 14) * 1.2;
      rr(x + 34, G0 - 54 + bob, 66, 36, 4, '#e0a81a'); txt('DUMP', x + 67, G0 - 36 + bob, 18, '#5b3a00');
      rr(x, G0 - 40 + bob, 36, 28, 5, '#d8632a');
      ctx.fillStyle = '#bfe6ff'; ctx.beginPath(); ctx.roundRect(x + 4, G0 - 36 + bob, 15, 13, 2); ctx.fill(); ctx.stroke();
      rr(x, G0 - 18, 100, 8, 2, '#5b6478');
      for (const wx of [x + 20, x + 80]) { ctx.fillStyle = '#4a4f5c'; ctx.beginPath(); ctx.arc(wx, G0 - 9, 10, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#9aa3b5'; ctx.beginPath(); ctx.arc(wx, G0 - 9, 4, 0, 7); ctx.fill(); }
      break; }
    case 'helicopter': {                                                // a news helicopter hovering overhead
      const y = flyYOf(c), sp = Math.sin(G.t * 40) * 30;
      ctx.beginPath(); ctx.moveTo(x + 16, y - 4); ctx.lineTo(x + 48, y - 8); ctx.lineTo(x + 48, y - 1); ctx.lineTo(x + 16, y + 5); ctx.closePath(); ctx.fillStyle = '#c94a30'; ctx.fill(); ctx.stroke();
      rr(x - 24, y - 13, 44, 26, 13, '#e25a3d'); ctx.fillStyle = '#bfe6ff'; ctx.beginPath(); ctx.ellipse(x - 11, y - 3, 9, 7, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 6, y - 13); ctx.lineTo(x - 6, y - 21); ctx.moveTo(x - 6 - 30 - sp * .3, y - 21); ctx.lineTo(x - 6 + 30 + sp * .3, y - 21); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 20, y + 20); ctx.lineTo(x + 14, y + 20); ctx.moveTo(x - 12, y + 13); ctx.lineTo(x - 14, y + 20); ctx.moveTo(x + 6, y + 13); ctx.lineTo(x + 8, y + 20); ctx.stroke(); break; }
    case 'drone': {                                                     // (brightened body + blink color so it stays visible against Night City's dark sky)
      const y = flyYOf(c);
      rr(x - 16, y - 8, 32, 16, 6, '#8b9bd6'); ctx.fillStyle = Math.sin(G.t * 10) > 0 ? '#ff4d4d' : '#ffb3b3'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#cfd6ff'; ctx.lineWidth = 3; const r = Math.abs(Math.sin(G.t * 30)) * 10 + 8;
      ctx.beginPath(); ctx.moveTo(x - 16 - r / 2, y - 12); ctx.lineTo(x - 16 + r / 2, y - 12); ctx.moveTo(x + 16 - r / 2, y - 12); ctx.lineTo(x + 16 + r / 2, y - 12); ctx.stroke(); break; }
    case 'storm': {                                                     // a storm cloud: weather delay
      const y = flyYOf(c); ctx.fillStyle = '#8790ab'; ctx.strokeStyle = '#2e3446'; ctx.lineWidth = 2.5;   // brightened so the cloud still stands out against Night City's dark sky
      ctx.beginPath(); ctx.ellipse(x, y, 34, 15, 0, 0, 7); ctx.ellipse(x - 20, y + 3, 18, 11, 0, 0, 7); ctx.ellipse(x + 20, y + 3, 18, 11, 0, 0, 7); ctx.ellipse(x - 6, y - 10, 16, 12, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(140,200,255,.9)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < 5; i++) { const dx = x - 26 + i * 13, dy = ((T * 260 + i * 37) % 44); ctx.moveTo(dx, y + 16 + dy); ctx.lineTo(dx - 3, y + 24 + dy); } ctx.stroke();
      if (Math.sin(T * 5 + c.x) > .75) { ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.moveTo(x + 4, y + 10); ctx.lineTo(x - 6, y + 32); ctx.lineTo(x + 1, y + 32); ctx.lineTo(x - 5, y + 52); ctx.lineTo(x + 10, y + 26); ctx.lineTo(x + 3, y + 26); ctx.closePath(); ctx.fill(); } break; }
    case 'powerline': {                                                 // electrical lines strung between two poles, sparking
      const y = flyYOf(c), hw = dw / 2, sag = 14;
      ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - hw, G0); ctx.lineTo(x - hw, y - 34); ctx.moveTo(x + hw, G0); ctx.lineTo(x + hw, y - 34); ctx.stroke();
      ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - hw - 14, y - 30); ctx.lineTo(x - hw + 14, y - 30); ctx.moveTo(x + hw - 14, y - 30); ctx.lineTo(x + hw + 14, y - 30); ctx.stroke();
      ctx.strokeStyle = '#1b1b24'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - hw, y - 28); ctx.quadraticCurveTo(x, y - 28 + sag * 2, x + hw, y - 28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - hw, y - 20); ctx.quadraticCurveTo(x, y - 20 + sag * 2, x + hw, y - 20); ctx.stroke();
      const sp = Math.sin(T * 20 + c.x); if (sp > .4) { const sx = x + Math.sin(T * 3 + c.x) * hw * .6; ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, y - 6); ctx.lineTo(sx - 6, y + 4); ctx.lineTo(sx + 4, y + 6); ctx.lineTo(sx - 4, y + 16); ctx.stroke(); }
      ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = ol; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - hw, y - 96); ctx.lineTo(x - hw + 13, y - 72); ctx.lineTo(x - hw - 13, y - 72); ctx.closePath(); ctx.fill(); ctx.stroke(); txt('⚡', x - hw, y - 79, 11); break; }
  }
  ctx.restore();
}

// the hole for an "under" gap: the outline of the correct big shape, flipped so its base is the open top at ground level
const pitDepth = p => p.shapeP && p.gapW ? Math.max(...p.shapeP.pts.map(q => q[1])) * p.gapW / p.shapeP.lens[0] : 0;
function drawPit(p, T, gx) {
  const P = p.shapeP, sc = p.gapW / P.lens[0], depth = pitDepth(p);
  ctx.fillStyle = T.body; ctx.fillRect(gx, GROUND, p.gapW, H + 700 - GROUND);                     // solid ground all round...
  ctx.fillStyle = 'rgba(0,0,0,.14)'; for (let yy = GROUND + 34; yy < H + 700; yy += 34) ctx.fillRect(gx, yy, p.gapW, 4);
  const g = ctx.createLinearGradient(0, GROUND, 0, GROUND + depth);
  g.addColorStop(0, T.city ? '#1a1030' : '#3b2a55'); g.addColorStop(1, '#0d0a1c');
  ctx.fillStyle = g; ctx.beginPath();                                                                // ...with a hole cut in the shape of the figure
  P.pts.forEach(([x, y], i) => i ? ctx.lineTo(gx + x * sc, GROUND + y * sc) : ctx.moveTo(gx + x * sc, GROUND + y * sc));
  ctx.closePath(); ctx.fill();
  const sh = pitShaft(p);                                                                            // ...and the hole keeps going down below the figure's lowest point
  ctx.fillStyle = '#0d0a1c'; ctx.fillRect(sh.x0, GROUND + depth - 30, sh.x1 - sh.x0, H + 700);
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sh.x0, GROUND + depth - 30); ctx.lineTo(sh.x0, H + 700); ctx.moveTo(sh.x1, GROUND + depth - 30); ctx.lineTo(sh.x1, H + 700); ctx.stroke();
}
// the bottomless part of a shaped hole: a shaft under the figure's lowest side(s), at least 46 px wide (world x)
function pitShaft(p) {
  const P = p.shapeP, sc = p.gapW / P.lens[0], my = Math.max(...P.pts.map(q => q[1])), low = P.pts.filter(q => q[1] >= my - 1e-6);
  const xl = Math.min(...low.map(q => q[0])) * sc, xr = Math.max(...low.map(q => q[0])) * sc, w = Math.max(46, xr - xl), c = p.e + (xl + xr) / 2;
  return { x0: c - w / 2, x1: c + w / 2 };
}
// while falling into a shaped hole the runner slides along the hole's walls, so they really drop down INSIDE it
function pitLimits(p, y) {
  const P = p.shapeP, sc = p.gapW / P.lens[0], depth = pitDepth(p), n = P.pts.length, xs = [];
  if (y - GROUND > depth - 30) { const s = pitShaft(p); return [s.x0, s.x1]; }
  for (let i = 0; i < n; i++) {
    const a = P.pts[i], b = P.pts[(i + 1) % n], ay = GROUND + a[1] * sc, by = GROUND + b[1] * sc;
    if ((ay - y) * (by - y) <= 0 && ay !== by) xs.push(p.e + (a[0] + (b[0] - a[0]) * (y - ay) / (by - ay)) * sc);
  }
  return xs.length ? [Math.min(...xs), Math.max(...xs)] : [p.e, p.e + p.gapW];
}
function drawWorld(T) {
  for (let i = 0; i < G.platforms.length; i++) {
    const p = G.platforms[i], sx = p.s - G.cam, ex = p.e - G.cam;
    if (ex < -50 && !(p.bridge)) continue; if (sx > W + 50) continue;
    // chasm
    if (p.gapW && p.under && p.shapeP) drawPit(p, T, ex);
    else if (p.gapW) {
      const gx = ex, gw = p.gapW; const g = ctx.createLinearGradient(0, GROUND, 0, H);
      g.addColorStop(0, T.city ? '#1a1030' : '#3b2a55'); g.addColorStop(1, '#0d0a1c');
      ctx.fillStyle = g; ctx.fillRect(gx, GROUND, gw, H - GROUND);
    }
    const x = Math.max(-10, sx), w = Math.min(W + 10, ex) - x;
    if (w > 0) {
      ctx.fillStyle = T.body; ctx.fillRect(x, GROUND, w, H + 700 - GROUND);
      ctx.fillStyle = 'rgba(0,0,0,.14)';
      for (let yy = GROUND + 34; yy < H + 700; yy += 34) ctx.fillRect(x, yy, w, 4);
      ctx.fillStyle = T.top; ctx.fillRect(x, GROUND, w, 14);
      if (T.city) { ctx.fillStyle = '#f5d23a'; for (let xx = Math.floor((x + G.cam) / 60) * 60 - G.cam; xx < x + w; xx += 60) ctx.fillRect(xx, GROUND + 5, 30, 3); }
    }
    // gap warning sign
    if (!p.bridged && p.gapW && ex > -20 && ex < W + 20) {
      ctx.fillStyle = '#5a3a1e'; ctx.fillRect(ex - 24, GROUND - 60, 5, 60);
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(ex - 21, GROUND - 100); ctx.lineTo(ex - 2, GROUND - 62); ctx.lineTo(ex - 40, GROUND - 62); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#222'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Q', ex - 21, GROUND - 68);
    }
    for (const f of (p.floats || [])) {                                 // floating platforms you can land on
      const fx = f.x - G.cam; if (fx < -f.w - 20 || fx > W + 20) continue;
      const fy = GROUND - f.h;
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(fx + 6, GROUND - 4, f.w - 12, 4);            // shadow on the ground below
      ctx.fillStyle = T.body; ctx.beginPath(); ctx.roundRect(fx, fy + 4, f.w, 14, 5); ctx.fill();
      ctx.fillStyle = T.top; ctx.beginPath(); ctx.roundRect(fx - 2, fy, f.w + 4, 9, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(fx - 2, fy, f.w + 4, 18, 5); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.2)'; for (let bx = fx + 14; bx < fx + f.w - 8; bx += 24) ctx.fillRect(bx, fy + 11, 10, 3);
    }
    for (const c of p.obs) {
      const cx = c.x - G.cam, wd = c.w || OBS[c.type].w || 0;                         // (long obstacles stay drawn until their far end has left the screen)
      if (c.fly ? (cx + wd / 2 < -80 || cx - wd / 2 > W + 80) : (cx + wd < -80 || cx > W + 80)) continue;
      drawObstacle(c, cx);
    }
    drawBridge(p, T);
  }
}

// Draws one crew member from the SIDE (walking to the right) with feet at (x, fy) on drawing context g.
// Used for the runner, the Shop previews and the title screen.   o = { ph: stride phase, running, air }
const CHAR_HATS = {
  hard: c => [[`M37 33 Q37 15 52 15 Q67 15 67 33 Z`, c], [`M36 31 h38 a2 2 0 0 1 2 2 v1 a2 2 0 0 1 -2 2 h-38 a2 2 0 0 1 -2 -2 v-1 a2 2 0 0 1 2 -2 Z`, c], [`M48 11 h8 v6 h-8 Z`, c]],
  cap: c => [[`M37 32 Q38 16 52 16 Q66 16 67 32 Z`, c], [`M62 29 L79 33 L62 35 Z`, c]],
  hair: c => [[`M38 36 Q36 16 52 16 Q66 16 66 30 Q56 22 46 28 Q44 34 42 40 Z`, c]]
};
const CHAR_OL = '#2a2a3a', CHAR_SK = '#ffd9b0';
function drawChar(g, x, fy, ch, o) {
  const { ph = 0, running = false, air = false } = o || {}, L = ch.look || {};
  const p = (d, fill, stroke, lw) => { const q = new Path2D(d); if (fill) { g.fillStyle = fill; g.fill(q); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(q); } };
  const line = (x1, y1, x2, y2, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
  const rect = (rx, ry, w, h, r, fill, stroke, lw) => { g.beginPath(); g.roundRect(rx, ry, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } };
  const circ = (cx, cy, r, fill, stroke, lw) => { g.beginPath(); g.arc(cx, cy, r, 0, 7); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } };
  const ell = (cx, cy, rx, ry, fill) => { g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fillStyle = fill; g.fill(); };
  const OL = CHAR_OL, SK = L.skin || CHAR_SK, HC = L.hairc || L.hair || '#3a2a1a', sleeve = L.sleeve || L.torso, boots = L.boots || '#3b2a1a';
  g.save(); g.translate(x, fy); g.scale(.82, .82); g.translate(-50, -130);                    // drawn on a 100 x 140 sheet, feet at y = 130
  g.lineCap = 'round'; g.lineJoin = 'round';
  const s = running ? Math.sin(ph) : 0;
  const legF = air ? .75 : s * .75, legB = air ? -.55 : -s * .75, armF = air ? 2.5 : (L.props || []).some(k => !['whistle', 'badge', 'headset', 'tube'].includes(k)) ? .55 - s * .12 : .32 - s * .7, armB = air ? 2.9 : -.2 + s * .7;
  const pt = (hx, hy, a, len) => [hx + Math.sin(a) * len, hy + Math.cos(a) * len];
  // back leg + back arm (behind the body)
  let [fx, fy2] = pt(47, 94, legB, 32); line(47, 94, fx, fy2, L.legs, 10); ell(fx - 1, fy2 + 3, 9, 4.5, boots);
  let [bx, by] = pt(45, 58, armB, 27); line(45, 58, bx, by, sleeve, 8); circ(bx, by + 2, 4, SK);
  if ((L.props || []).includes('tube')) {                                                    // a blue blueprint tube slung over the back
    g.save(); g.translate(41, 62); g.rotate(-.55); rect(-5, -26, 10, 54, 4, '#2a6fd6', OL, 2); g.fillStyle = '#fff'; g.fillRect(-5, -16, 10, 3); g.fillRect(-5, 12, 10, 3); g.restore();
  }
  // front leg
  [fx, fy2] = pt(53, 94, legF, 32); line(53, 94, fx, fy2, L.legs, 10); ell(fx + 4, fy2 + 3, 10, 4.5, boots);
  // body
  rect(40, 52, 24, 46, 9, L.torso, OL, 2);
  if (L.vest) { rect(53, 53, 10, 44, 4, L.vest); }
  if (L.vest ? L.stripes : L.stripes) { g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(40, 64, 24, 4); g.fillRect(40, 80, 24, 4); }
  if (L.bibs) { rect(44, 70, 20, 28, 3, L.bibs); line(58, 54, 58, 70, L.bibs, 5); }
  if (L.tie) p('M62 54 L66 58 L64 84 L60 62 Z', L.tie, OL, 1);
  if (L.belt) { g.fillStyle = '#7a4b22'; g.fillRect(40, 86, 24, 6); rect(57, 88, 9, 11, 2, '#8a5a2a', OL, 1); }
  if (L.bolt) p('M56 58 L50 70 L55 70 L52 82 L61 66 L56 66 Z', '#ffd23f');
  if (L.sash) p('M42 54 L52 54 L64 92 L54 92 Z', L.sash);
  // hair that hangs or sticks out BEHIND the head
  if (L.style === 'long') p('M39 30 Q33 46 36 66 Q47 70 53 62 L53 40 Z', HC, OL, 1.5);
  else if (L.style === 'pony') p('M40 30 Q27 32 27 52 Q34 48 42 42 Z', HC, OL, 1.5);
  else if (L.style === 'bun') circ(39, 22, 6.5, HC, OL, 1.5);
  else if (L.style === 'curly') circ(45, 27, 16, HC, OL, 1.5);
  // head (profile: nose and eye at the front, ear at the back)
  circ(52, 36, 14, SK, OL, 2);
  p('M64 34 L70 39 L64 42 Z', SK, OL, 1.8);
  circ(59, 34, 2, '#222'); line(58, 45, 64, 45, '#222', 1.5);
  g.beginPath(); g.ellipse(48, 38, 3, 4, 0, 0, 7); g.fillStyle = 'rgba(0,0,0,.14)'; g.fill(); g.strokeStyle = OL; g.lineWidth = 1; g.stroke(); g.beginPath(); g.ellipse(48, 38, 3, 4, 0, 0, 7); g.fillStyle = 'rgba(255,255,255,0)'; g.fill(); g.strokeStyle = OL; g.lineWidth = 1; g.stroke();
  if (!L.hat) CHAR_HATS.hair(HC).forEach(([d, c]) => p(d, c, OL, 1.5));                           // hair on top (when there is no hat)
  if (L.hat === 'beret') { g.save(); g.translate(50, 19); g.rotate(-.14); g.beginPath(); g.ellipse(0, 0, 17, 7, 0, 0, 7); g.fillStyle = L.hatc; g.fill(); g.strokeStyle = OL; g.lineWidth = 2; g.stroke(); g.restore(); rect(48, 10, 4, 6, 1, L.hatc); }
  else if (L.hat === 'hard' || L.hat === 'headlamp') { CHAR_HATS.hard(L.hatc).forEach(([d, c]) => p(d, c, OL, 2)); if (L.hat === 'headlamp') circ(68, 27, 4, '#fff6a0', OL, 1.5); }
  else if (L.hat === 'cap') CHAR_HATS.cap(L.hatc).forEach(([d, c]) => p(d, c, OL, 2));
  else if (L.hat === 'sun') { g.beginPath(); g.ellipse(52, 29, 27, 5, 0, 0, 7); g.fillStyle = L.hatc; g.fill(); g.strokeStyle = OL; g.lineWidth = 2; g.stroke(); p('M40 29 Q40 13 52 13 Q64 13 64 29 Z', L.hatc, OL, 2); g.fillStyle = '#d92b2b'; g.fillRect(41, 23, 22, 4); }
  else if (L.hat === 'ranger') { g.beginPath(); g.ellipse(52, 28, 25, 4.5, 0, 0, 7); g.fillStyle = L.hatc; g.fill(); g.strokeStyle = OL; g.lineWidth = 2; g.stroke(); p('M42 28 L44 12 Q52 8 60 12 L62 28 Z', L.hatc, OL, 2); g.fillStyle = '#3a2a1a'; g.fillRect(43, 22, 18, 3); }
  if (L.glasses === 'round') { circ(59, 35, 4.5, null, '#222', 1.6); line(54, 35, 47, 36, '#222', 1.6); }
  if (L.glasses === 'square') { rect(54, 31, 10, 8, 0, null, '#222', 1.8); line(54, 35, 47, 36, '#222', 1.6); }
  if (L.goggles) { rect(38, 30, 26, 6, 3, '#333'); g.beginPath(); g.ellipse(60, 34, 6, 5, 0, 0, 7); g.fillStyle = '#bfeaff'; g.fill(); g.strokeStyle = OL; g.lineWidth = 1.8; g.stroke(); }
  const props = L.props || [];
  if (props.includes('headset')) { g.strokeStyle = '#333'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 30); g.quadraticCurveTo(52, 8, 64, 30); g.stroke(); circ(47, 38, 5, '#333'); g.lineWidth = 2; g.beginPath(); g.moveTo(47, 43); g.quadraticCurveTo(52, 50, 60, 46); g.stroke(); }
  if (props.includes('whistle')) { line(58, 51, 62, 62, '#888', 1.5); rect(59, 61, 9, 6, 3, '#c0c6d0', OL, 1.5); }
  if (props.includes('badge')) p('M58 66 l2.5 5 5.5 1 -4 3.5 1 5.5 -5 -3 -5 3 1 -5.5 -4 -3.5 5.5 -1z', '#ffd23f', OL, 1);
  // front arm + whatever it carries
  let [hx, hy] = pt(55, 58, armF, 27); line(55, 58, hx, hy, sleeve, 8); circ(hx, hy + 2, 4.5, SK, OL, 1);
  g.save(); g.translate(hx, hy + 2);
  for (const k of props) {
    if (k === 'shovel') { line(0, -40, 0, 40, '#8a5a2a', 4); p('M-8 40 L8 40 L5 54 L-5 54 Z', '#b0b7c0', OL, 2); }
    else if (k === 'wrench') { line(0, 0, 12, -26, '#b0b7c0', 6); circ(13, -30, 6, null, '#b0b7c0', 4); }
    else if (k === 'paddle') { line(0, -34, 0, 26, '#8a5a2a', 3); circ(0, -46, 14, '#d92b2b', OL, 2); g.fillStyle = '#fff'; g.font = '900 11px Trebuchet MS, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STOP', 0, -46); }
    else if (k === 'scissors') { line(0, 6, 24, -14, '#c0c6d0', 4); line(0, -14, 24, 6, '#c0c6d0', 4); circ(-2, 8, 4, null, '#d92b2b', 2.5); circ(-2, -16, 4, null, '#d92b2b', 2.5); }
    else if (k === 'megaphone') { p('M0 -6 L26 -20 L26 12 L0 2 Z', '#e8b02a', OL, 2); rect(-6, -6, 8, 10, 1, '#555'); }
    else if (k === 'flag') { line(0, -46, 0, 20, '#8a5a2a', 3); p('M0 -46 L20 -40 L0 -32 Z', '#d92b2b', OL, 1.5); }
    else if (k === 'roll') { g.save(); g.rotate(.44); rect(-3, -30, 10, 50, 4, '#2a6fd6', OL, 2); g.fillStyle = '#fff'; g.fillRect(-3, -22, 10, 3); g.fillRect(-3, 8, 10, 3); g.restore(); }             // a rolled-up blue blueprint
    else if (k === 'blueprint') {                                                          // an unrolled blue blueprint: white grid lines and a little bridge
      rect(-2, -34, 36, 28, 2, '#1f5fbf', OL, 2); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1;
      g.beginPath(); for (let t = 6; t < 34; t += 8) { g.moveTo(-2 + t, -34); g.lineTo(-2 + t, -6); } for (let t = -26; t < -6; t += 7) { g.moveTo(-2, t); g.lineTo(34, t); } g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(2, -14); g.lineTo(30, -14); g.moveTo(6, -14); g.quadraticCurveTo(16, -26, 26, -14); g.stroke();
    }
    else if (k === 'ruler') { rect(0, -40, 8, 60, 0, '#e8d3a8', OL, 2); g.strokeStyle = OL; g.lineWidth = 1.5; g.beginPath(); for (let t = -32; t <= 8; t += 8) { g.moveTo(0, t); g.lineTo(4, t); } g.stroke(); }
    else if (k === 'compass') { line(4, -42, -4, 24, '#b0b7c0', 3.5); line(4, -42, 14, 24, '#b0b7c0', 3.5); circ(4, -43, 4, '#555'); }
    else if (k === 'clip') { rect(-2, -26, 20, 28, 2, '#b98b5a', OL, 2); g.fillStyle = '#fff'; g.fillRect(1, -22, 14, 20); line(3, -16, 12, -16, '#8894ad', 1.5); line(3, -11, 12, -11, '#8894ad', 1.5); line(3, -6, 9, -6, '#8894ad', 1.5); }
    else if (k === 'laptop') { rect(-2, -22, 26, 18, 2, '#333', OL, 2); rect(-6, -4, 34, 4, 2, '#888'); g.fillStyle = '#5bd0ff'; g.fillRect(2, -18, 18, 10); }
    else if (k === 'protractor') {                                                       // a detailed protractor: see-through half-disc, degree ticks every 5 degrees, a 90 mark, and the center hole
      g.save(); g.translate(16, -2); const R = 27;
      g.beginPath(); g.arc(0, 0, R, Math.PI, 0); g.closePath(); g.fillStyle = 'rgba(190,225,255,.85)'; g.fill(); g.strokeStyle = OL; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.arc(0, 0, R - 11, Math.PI, 0); g.strokeStyle = '#4a6f9c'; g.lineWidth = 1; g.stroke();          // the inner scale line
      g.beginPath(); g.arc(0, 0, 5, Math.PI, 0); g.stroke();
      g.strokeStyle = '#1d2f55'; g.lineWidth = 1;
      for (let a = 0; a <= 180; a += 5) {
        const t = Math.PI + a * Math.PI / 180, len = a % 30 === 0 ? 10 : a % 10 === 0 ? 7 : 4;
        g.beginPath(); g.moveTo(Math.cos(t) * R, Math.sin(t) * R); g.lineTo(Math.cos(t) * (R - len), Math.sin(t) * (R - len)); g.stroke();
        if (a % 30 === 0 && a > 0 && a < 180) { g.beginPath(); g.moveTo(Math.cos(t) * (R - 11), Math.sin(t) * (R - 11)); g.lineTo(Math.cos(t) * 5, Math.sin(t) * 5); g.strokeStyle = 'rgba(29,47,85,.35)'; g.stroke(); g.strokeStyle = '#1d2f55'; }   // guide lines every 30 degrees
      }
      line(0, -R, 0, -R + 14, '#d92b2b', 2);                                                                             // the 90 degree mark
      line(-R, 0, R, 0, OL, 2.5);                                                                                        // the flat base
      circ(0, -2, 2.6, '#fff', OL, 1);                                                                                   // the center hole
      g.restore();
    }
    else if (k === 'pliers') { line(0, 0, 10, -38, '#d92b2b', 4); line(8, 0, 0, -38, '#d92b2b', 4); line(0, -40, 8, -40, '#b0b7c0', 5); }
    else if (k === 'cable') { circ(10, -6, 12, null, '#e0761f', 5); circ(10, -6, 5, null, '#e0761f', 3); }
    else if (k === 'bulb') { circ(4, -22, 11, '#ffe14a', OL, 2); rect(0, -12, 8, 8, 1, '#b0b7c0', OL, 1.5); }
    else if (k === 'stamp') { rect(-4, -30, 18, 12, 2, '#d92b2b', OL, 2); rect(1, -18, 6, 20, 0, '#8a5a2a'); }
    else if (k === 'tripod') { line(0, -8, -12, 26, '#8a5a2a', 3); line(0, -8, 0, 28, '#8a5a2a', 3); line(0, -8, 12, 26, '#8a5a2a', 3); rect(-8, -26, 16, 16, 2, '#e0761f', OL, 2); circ(9, -18, 3, '#333'); }
    else if (k === 'rod') { for (let t = 0; t < 8; t++) { g.fillStyle = t % 2 ? '#fff' : '#d92b2b'; g.fillRect(-2, -52 + t * 10, 5, 10); } g.strokeStyle = OL; g.lineWidth = 1.5; g.strokeRect(-2, -52, 5, 80); }
    else if (k === 'map') { rect(-2, -32, 36, 26, 2, '#ead9a8', OL, 2); g.strokeStyle = '#c0392b'; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(3, -12); g.quadraticCurveTo(16, -32, 28, -14); g.stroke(); g.setLineDash([]); line(24, -24, 30, -18, '#c0392b', 2); line(30, -24, 24, -18, '#c0392b', 2); }
    else if (k === 'drone') { rect(-6, -8, 16, 8, 2, '#333', OL, 1.5); line(6, -8, 14, -34, '#888', 1.5); rect(6, -44, 18, 7, 3, '#555', OL, 1.5); line(2, -46, 12, -46, '#888', 2.5); line(20, -46, 30, -46, '#888', 2.5); }
    else if (k === 'binoculars') { rect(-4, -18, 8, 6, 1, '#333'); circ(-2, -12, 6, '#333', OL, 1.5); circ(10, -12, 6, '#333', OL, 1.5); rect(2, -14, 4, 3, 0, '#555'); circ(-2, -12, 3, '#6fa8dc'); circ(10, -12, 3, '#6fa8dc'); }
    else if (k === 'net') { line(0, -40, 0, 26, '#8a5a2a', 3); g.beginPath(); g.ellipse(6, -50, 13, 12, 0, 0, 7); g.fillStyle = 'rgba(220,240,255,.6)'; g.fill(); g.strokeStyle = '#555'; g.lineWidth = 2; g.stroke(); }
    else if (k === 'notebook') { rect(-2, -26, 18, 24, 2, '#2f8a5a', OL, 2); g.fillStyle = '#fff'; g.fillRect(2, -22, 12, 16); line(4, -16, 12, -16, '#8894ad', 1.5); line(4, -11, 10, -11, '#8894ad', 1.5); }
    else if (k === 'jar') { rect(-4, -28, 18, 26, 4, '#bfeaff', OL, 2); g.fillStyle = 'rgba(46,134,193,.6)'; g.fillRect(-2, -16, 14, 12); rect(-5, -32, 20, 6, 2, '#888', OL, 1.5); }
    else if (k === 'joystick') { rect(-8, -6, 22, 8, 2, '#333', OL, 1.5); line(2, -6, 2, -26, '#555', 4); circ(2, -29, 5, '#d92b2b', OL, 1.5); }
    else if (k === 'radio') { rect(0, -26, 10, 24, 2, '#333', OL, 1.5); line(5, -26, 5, -42, '#555', 2); g.fillStyle = '#5bd0ff'; g.fillRect(2, -22, 6, 6); }
    else if (k === 'crane') { rect(-4, -4, 20, 6, 1, '#555', OL, 1.5); line(6, -4, 6, -44, '#e8b02a', 4); line(6, -44, 32, -44, '#e8b02a', 4); line(30, -44, 30, -28, '#333', 1.5); circ(30, -26, 4, null, '#333', 2.5); }
    else if (k === 'hook') { g.setLineDash([3, 3]); line(6, -44, 6, -10, '#888', 2); g.setLineDash([]); circ(6, -6, 6, null, '#b0b7c0', 3.5); }
    else if (k === 'rockhammer') { line(0, 0, 8, -30, '#8a5a2a', 4); g.save(); g.translate(9, -32); g.rotate(-.3); rect(-12, -4, 26, 8, 1, '#888', OL, 2); g.restore(); }
    else if (k === 'core') { rect(-3, -44, 10, 58, 3, 'rgba(223,231,238,.7)', OL, 2); g.fillStyle = '#8a5a2a'; g.fillRect(-1, -40, 6, 16); g.fillStyle = '#c9a26a'; g.fillRect(-1, -24, 6, 14); g.fillStyle = '#888'; g.fillRect(-1, -10, 6, 20); }
    else if (k === 'rocks') { p('M-6 -2 L-10 -14 L0 -24 L12 -18 L14 -4 Z', '#9aa0aa', OL, 2); circ(16, -4, 4, '#b8a58a', OL, 1.5); }
    else if (k === 'drill') { rect(-2, -22, 22, 13, 3, '#e8b02a', OL, 2); line(20, -15, 38, -15, '#888', 3.5); rect(2, -9, 9, 16, 2, '#333', OL, 1.5); }
    else if (k === 'signOK') { line(4, -40, 4, 30, '#8a5a2a', 3); rect(-10, -66, 28, 26, 3, '#1e9e57', OL, 2); g.strokeStyle = '#fff'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(-4, -52); g.lineTo(2, -46); g.lineTo(12, -60); g.stroke(); }
  }
  g.restore();
  g.restore();
}

function drawRunner() {
  const ch = currentChar(), x = 240 + (G.px - G.cam - 240), fy = G.py;
  const running = (G.state === 'run' || G.state === 'cross' || G.state === 'menu') && G.onGround;
  const ph = G.t * (G.state === 'cross' ? 12 : 16) * (G.stumble > 0 ? .5 : 1);
  ctx.save();
  if (G.inv > 0 && Math.floor(G.t * 14) % 2) ctx.globalAlpha = .35;      // blink while invincible
  drawChar(ctx, x, fy, ch, { ph, running, air: !G.onGround });
  ctx.restore();
  if (G.state === 'rise') {                                              // balloons carry the runner back up
    ctx.save(); ctx.translate(x, 0);
    const cols = ['#ff5d73', '#ffd23f', '#4dd0e1'];
    cols.forEach((c, i) => {
      const bx = (i - 1) * 22 + Math.sin(G.t * 5 + i) * 4, by = fy - 165 + Math.abs(i - 1) * 10;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, fy - 62); ctx.lineTo(bx, by + 24); ctx.stroke();
      ctx.fillStyle = c; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(bx, by, 17, 22, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(bx - 6, by - 8, 4, 7, -.5, 0, 7); ctx.fill();
    });
    ctx.restore();
  }
  // shadow
  if (G.state !== 'fall' && support(G.px)) { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, GROUND + 4, Math.max(6, 18 - (GROUND - fy) * .05), 4, 0, 0, 7); ctx.fill(); }
}

function draw() {
  const T = themeNow();
  // keep the picture sharp: the canvas buffer gets enough pixels for the size it is really shown at (capped at 3x), and everything is
  // still drawn in 960x540 units
  const cssW = cv.clientWidth;
  if (cssW) {
    const k = Math.min(3, Math.max(1, Math.ceil(cssW * (window.devicePixelRatio || 1) / W - 0.05)));
    if (cv.width !== W * k) { cv.width = W * k; cv.height = H * k; }
    ctx.setTransform(k, 0, 0, k, 0, 0);
  }
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - .5) * 8, (Math.random() - .5) * 8);
  drawSky(T);
  drawHills(T, .18, T.far, 330, 130);
  drawHills(T, .4, T.near, 380, 110);
  ctx.save(); ctx.translate(0, -G.camY);                            // the view slides down when the bridge has to go underground
  drawWorld(T);
  drawRunner();
  for (const p of G.particles) { ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x - G.cam, p.y, 5, 5); }
  ctx.globalAlpha = 1;
  ctx.restore();
  if (G.state === 'menu') { /* keep clean behind the menu card */ }
  if (G.tipT > 0 && G.state === 'run') {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.roundRect(W / 2 - 250, 110, 500, 40, 20); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Trebuchet MS, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SPACE / TAP to jump · again in the air = double jump!', W / 2, 137);
  }
  if (G.state !== 'menu' && G.py - 100 - G.camY < 0) {                              // above the top of the screen: a little marker shows where the runner is
    const rx = 240 + (G.px - G.cam - 240), up = clamp((100 + G.camY - G.py) / 160, 0, 1);
    ctx.globalAlpha = .55 + .4 * up; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1d2340'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(rx, 8); ctx.lineTo(rx - 13, 32); ctx.lineTo(rx + 13, 32); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = 'bold 14px Trebuchet MS, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(T.name + ' · Level ' + G.level, W - 12, H - 10);
  ctx.restore();
}

/* ===================== TITLE SCREEN ANIMATION ===================== */
// A small shape is dilated from a centre point: dashed rays run through matching corners, the big copy grows out
// along them, and a pill shows the "x k" (then "÷ k" on the way back). Behind it: drifting similar pairs, dusk hills,
// and the runner hopping a cone. All of it only runs while the title screen is showing.
const TITLE_SHAPES = [
  [[0, 0], [1.5, 0], [0, 1]],                                                        // right triangle
  [[0, 0], [1.6, 0], [1.6, 1], [0, 1]],                                              // rectangle
  [[0, 0], [1.8, 0], [1.3, 1], [.5, 1]],                                             // trapezoid
  [[0, .3], [1, .3], [1, 0], [1.7, .5], [1, 1], [1, .7], [0, .7]],                   // arrow
  [[0, .65], [0, 1], [1.6, 1], [1.6, .65], [1.1, .65], [1.1, 0], [.5, 0], [.5, .65]] // T
];
const TITLE_KS = [2, 3, 4, 3, 2];
const titleCv = $('titleCv'), tg = titleCv.getContext('2d');
let titleRaf = 0, titleT = 0, titleLast = 0, titleChar = null;         // titleChar: a different random crew member each time the title screen opens
const easeIO = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
function titlePoly(g, pts, ox, oy, s, rot) {
  g.beginPath();
  pts.forEach((p, i) => {
    let x = p[0] * s, y = p[1] * s;
    if (rot) { const c = Math.cos(rot), sn = Math.sin(rot); [x, y] = [x * c - y * sn, x * sn + y * c]; }
    i ? g.lineTo(ox + x, oy - y) : g.moveTo(ox + x, oy - y);
  });
  g.closePath();
}
function titlePill(g, x, y, text, col) {
  g.font = '900 22px "Trebuchet MS",sans-serif'; const w = g.measureText(text).width + 22;
  g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.roundRect(x - w / 2, y - 16, w, 32, 16); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y + 1);
}
// the different things the title-screen runner hops over (all centred on cx, standing on y)
const TITLE_OBS = ['cone', 'rock', 'home', 'cactus', 'tortoise', 'barrel', 'log'];
function drawTitleObs(g, type, cx, y) {
  const ol = '#3b2a1a', box = (x, yy, w, h, r, f) => { g.fillStyle = f; g.beginPath(); g.roundRect(x, yy, w, h, r); g.fill(); g.stroke(); };
  const sign = (txt, sx, sy, w) => { box(sx - w / 2, sy - 17, w, 30, 5, '#fff'); g.fillStyle = '#0d7a3c'; g.font = '900 20px "Trebuchet MS",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, sx, sy - 1); };
  g.save(); g.strokeStyle = ol; g.lineWidth = 2.5; g.lineJoin = 'round';
  if (type === 'cone') {
    g.fillStyle = '#ff7a1a'; g.beginPath(); g.moveTo(cx - 14, y); g.lineTo(cx + 14, y); g.lineTo(cx + 5, y - 38); g.lineTo(cx - 5, y - 38); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(cx - 9, y - 22, 18, 6); g.fillStyle = '#c95a0a'; g.fillRect(cx - 18, y - 3, 36, 5);
  } else if (type === 'rock') {
    g.fillStyle = '#8d8f99'; g.beginPath(); g.moveTo(cx - 26, y); g.quadraticCurveTo(cx - 24, y - 40, cx, y - 40); g.quadraticCurveTo(cx + 26, y - 38, cx + 26, y); g.closePath(); g.fill(); g.stroke();
  } else if (type === 'cactus') {
    box(cx - 8, y - 62, 16, 62, 8, '#3f9d4f'); box(cx - 26, y - 44, 12, 26, 6, '#3f9d4f'); box(cx + 14, y - 50, 12, 26, 6, '#3f9d4f');
    g.fillStyle = '#3f9d4f'; g.fillRect(cx - 20, y - 24, 14, 8); g.fillRect(cx + 6, y - 30, 14, 8);
  } else if (type === 'barrel') {
    box(cx - 19, y - 48, 38, 48, 5, '#f2c21b'); g.fillStyle = '#3b2a1a'; g.fillRect(cx - 19, y - 34, 38, 5); g.fillRect(cx - 19, y - 16, 38, 5);
  } else if (type === 'log') {
    box(cx - 32, y - 30, 64, 30, 8, '#8a5a30'); g.fillStyle = '#d9b27c'; g.beginPath(); g.ellipse(cx + 26, y - 15, 6, 12, 0, 0, 7); g.fill(); g.stroke();
  } else if (type === 'home') {
    box(cx + 12, y - 62, 8, 20, 1, '#a0523d'); box(cx - 25, y - 34, 50, 34, 2, '#f2d9a8');
    g.fillStyle = '#c0392b'; g.beginPath(); g.moveTo(cx - 31, y - 34); g.lineTo(cx, y - 58); g.lineTo(cx + 31, y - 34); g.closePath(); g.fill(); g.stroke();
    box(cx - 19, y - 24, 12, 24, 2, '#7a4b22'); box(cx + 3, y - 27, 14, 13, 2, '#9ad8ff');
    box(cx - 120, y - 106, 240, 36, 6, '#ffd23f'); g.fillStyle = '#7a1414'; g.font = '900 22px "Trebuchet MS",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText("DON'T EVICT ME!", cx, y - 88);
  } else if (type === 'tortoise') {
    g.fillStyle = '#c9a26a'; for (const lx of [-16, -6, 8, 18]) { g.beginPath(); g.roundRect(cx + lx - 3, y - 8, 7, 8, 2); g.fill(); g.stroke(); }
    g.beginPath(); g.ellipse(cx - 26, y - 15, 7, 5, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#7a8f3a'; g.beginPath(); g.ellipse(cx, y - 16, 22, 15, 0, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(cx, y - 68); g.lineTo(cx, y - 30); g.stroke(); box(cx - 70, y - 128, 140, 60, 6, '#fff'); g.fillStyle = '#0d7a3c'; g.font = '900 22px "Trebuchet MS",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PROTECTED', cx, y - 111); g.fillText('WILDLIFE', cx, y - 85);
  }
  g.restore();
}
function drawTitle() {
  const w = titleCv.clientWidth, h = titleCv.clientHeight; if (!w || !h) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (titleCv.width !== Math.round(w * dpr) || titleCv.height !== Math.round(h * dpr)) { titleCv.width = Math.round(w * dpr); titleCv.height = Math.round(h * dpr); }
  const s = Math.min(w / 960, h / 540) * dpr, t = titleT, GY = 450;
  tg.setTransform(1, 0, 0, 1, 0, 0);
  // the sky fills the whole box; the scene is 960x540 units, centred sideways and sitting on the bottom
  const sky = tg.createLinearGradient(0, 0, 0, titleCv.height); sky.addColorStop(0, '#0f1a4a'); sky.addColorStop(.55, '#31509f'); sky.addColorStop(1, '#f2955a');
  tg.fillStyle = sky; tg.fillRect(0, 0, titleCv.width, titleCv.height);
  tg.setTransform(s, 0, 0, s, (titleCv.width - 960 * s) / 2, titleCv.height - 540 * s);
  const L = -1200, R = 2200;
  // blueprint grid drifting sideways
  tg.strokeStyle = 'rgba(255,255,255,.07)'; tg.lineWidth = 1;
  const gx = -(t * 14) % 48;
  tg.beginPath(); for (let x = L + gx; x < R; x += 48) { tg.moveTo(x, -900); tg.lineTo(x, GY); } for (let y = GY; y > -900; y -= 48) { tg.moveTo(L, y); tg.lineTo(R, y); } tg.stroke();
  // sun + hills
  tg.fillStyle = 'rgba(255,214,120,.9)'; tg.beginPath(); tg.arc(330, 320, 62, 0, 7); tg.fill();
  [['#3a3f86', 90, .018, 8, 1], ['#2b2f6b', 55, .026, 16, 2]].forEach(([col, amp, fr, sp, ph]) => {
    tg.fillStyle = col; tg.beginPath(); tg.moveTo(L, GY);
    for (let x = L; x <= R; x += 24) tg.lineTo(x, GY - 40 - amp * (.5 + .5 * Math.sin((x + t * sp * 4) * fr + ph)));
    tg.lineTo(R, GY); tg.closePath(); tg.fill();
  });
  // drifting similar pairs (a shape and its x2 copy)
  for (let i = 0; i < 6; i++) {
    const sh = TITLE_SHAPES[i % 5], sz = 16 + (i % 3) * 7, span = 1500, x = ((i * 290 + t * (16 + i * 3)) % span) - 200, y = 230 + (i * 47) % 150 + Math.sin(t * .7 + i) * 10;
    const rot = Math.sin(t * .4 + i) * .25;
    tg.strokeStyle = 'rgba(255,255,255,.28)'; tg.fillStyle = 'rgba(255,255,255,.06)'; tg.lineWidth = 2;
    titlePoly(tg, sh, x, y, sz, rot); tg.fill(); tg.stroke();
    titlePoly(tg, sh, x + sz * 2.4, y, sz * 2, rot); tg.fill(); tg.stroke();
    tg.fillStyle = 'rgba(255,255,255,.4)'; tg.font = '800 13px "Trebuchet MS",sans-serif'; tg.textAlign = 'center'; tg.fillText('×2', x + sz * 1.6, y - sz * 2.4);
  }
  // ground
  tg.fillStyle = '#1b2350'; tg.fillRect(L, GY, R - L, 400);
  tg.fillStyle = '#5b6ac2'; tg.fillRect(L, GY, R - L, 5);
  tg.fillStyle = 'rgba(255,255,255,.22)'; const dx = -(t * 260) % 60;
  for (let x = L + dx; x < R; x += 60) tg.fillRect(x, GY + 34, 28, 5);

  // ---- the dilation demo ----
  const cyc = 5.5, n = Math.floor(t / cyc), ct = t % cyc, sh = TITLE_SHAPES[n % TITLE_SHAPES.length], k = TITLE_KS[n % TITLE_KS.length];
  let grow = 0, mode = '×';
  if (ct < .5) grow = 0; else if (ct < 2) grow = easeIO((ct - .5) / 1.5); else if (ct < 3.2) grow = 1; else if (ct < 4.7) { grow = 1 - easeIO((ct - 3.2) / 1.5); mode = '÷'; } else grow = 0;
  if (ct >= 3.2) mode = '÷';
  const cx = 500, u = 56, sc = 1 + (k - 1) * grow, appear = Math.min(1, t / .8);
  tg.globalAlpha = appear;
  // rays from the centre through each corner (drawn a little beyond the big copy)
  tg.setLineDash([7, 7]); tg.strokeStyle = 'rgba(255,255,255,.5)'; tg.lineWidth = 1.5; tg.beginPath();
  sh.forEach(p => { const ex = cx + p[0] * u * (sc + .25), ey = GY - p[1] * u * (sc + .25); tg.moveTo(cx, GY); tg.lineTo(ex, ey); });
  tg.stroke(); tg.setLineDash([]);
  // big copy (orange) then small (blue)
  tg.fillStyle = 'rgba(255,154,60,.88)'; tg.strokeStyle = '#fff'; tg.lineWidth = 3; tg.lineJoin = 'round';
  titlePoly(tg, sh, cx, GY, u * sc, 0); tg.fill(); tg.stroke();
  tg.fillStyle = '#4aa3ff'; titlePoly(tg, sh, cx, GY, u, 0); tg.fill(); tg.stroke();
  // corner dots on both copies
  sh.forEach(p => { [1, sc].forEach((m, j) => { tg.fillStyle = j ? '#fff3d6' : '#dff0ff'; tg.beginPath(); tg.arc(cx + p[0] * u * m, GY - p[1] * u * m, 3.5, 0, 7); tg.fill(); }); });
  tg.fillStyle = '#fff'; tg.beginPath(); tg.arc(cx, GY, 6, 0, 7); tg.fill();
  // bottom-side lengths under the ground, joined by a curved arrow with its scale-factor pill
  const bw = Math.max(...sh.map(p => p[0])), b0 = 3, smallMid = cx + bw * u / 2, bigMid = cx + bw * u * sc / 2, val = Math.round(b0 * sc * 10) / 10;
  tg.fillStyle = '#dff0ff'; tg.font = '900 22px "Trebuchet MS",sans-serif'; tg.textAlign = 'center'; tg.textBaseline = 'alphabetic';
  tg.fillText(String(b0), smallMid, GY + 30);
  if (sc > 1.05) {
    tg.fillStyle = '#ffd9a8'; tg.fillText(String(Math.round(val)), Math.max(bigMid, smallMid + 36), GY + 30);
    const ax = cx + 6, bx = cx + bw * u * sc - 6;
    if (bx - ax > 50) {
      tg.strokeStyle = '#fff'; tg.lineWidth = 3; tg.beginPath(); tg.moveTo(ax, GY + 40); tg.quadraticCurveTo((ax + bx) / 2, GY + 84, bx, GY + 40); tg.stroke();
      const dirx = mode === '×' ? 1 : -1, tipx = mode === '×' ? bx : ax;
      tg.fillStyle = '#fff'; tg.beginPath(); tg.moveTo(tipx, GY + 38); tg.lineTo(tipx - 9 * dirx, GY + 44); tg.lineTo(tipx - 3 * dirx, GY + 52); tg.closePath(); tg.fill();
      titlePill(tg, (ax + bx) / 2, GY + 72, mode + ' ' + k, mode === '×' ? '#ff7a1a' : '#2f80ed');
    }
  }
  tg.globalAlpha = 1;

  // ---- the runner hops a traffic cone (the world scrolls left) ----
  const RX = 170, cone = 470 - ((t * 260) % 760), rdx = cone - RX;
  const jh = rdx > -60 && rdx < 110 ? 78 * Math.sin(Math.PI * (110 - rdx) / 170) : 0;
  tg.globalAlpha = Math.max(0, Math.min(1, (470 - cone) / 40, (cone + 200) / 60));
  drawTitleObs(tg, TITLE_OBS[Math.floor(t * 260 / 760) % TITLE_OBS.length], cone, GY);          // a different obstacle each time round
  tg.fillStyle = 'rgba(0,0,0,.25)'; tg.beginPath(); tg.globalAlpha = 1; tg.ellipse(RX, GY + 3, Math.max(6, 22 - jh / 4), 5, 0, 0, 7); tg.fill();
  drawChar(tg, RX, GY - jh, titleChar || currentChar(), { ph: t * 14, running: jh < 2, air: jh >= 2 });
}
function startTitleAnim() {
  if (titleRaf) return;
  titleChar = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
  titleLast = performance.now();
  const loop = now => { titleRaf = requestAnimationFrame(loop); const dt = Math.min(.05, (now - titleLast) / 1000); titleLast = now; titleT += dt; try { drawTitle(); } catch (e) {} };
  titleRaf = requestAnimationFrame(loop);
}
function stopTitleAnim() { cancelAnimationFrame(titleRaf); titleRaf = 0; }

/* ===================== FIT EVERYTHING WITHOUT SCROLLING ===================== */
// Pop-up cards never scroll: if one is taller than the game box, it is shrunk just enough to fit (and grows back when there is room).
function fitCards() {
  document.querySelectorAll('#sb .overlay').forEach(ov => {
    if (ov.classList.contains('hidden') || ov.id === 'title') return;
    const card = ov.querySelector('.card'); if (!card) return;
    card.style.zoom = ''; const room = ov.getBoundingClientRect().height - 24; let z = 1;
    for (let i = 0; i < 16 && card.getBoundingClientRect().height > room && z > .35; i++) { z *= .94; card.style.zoom = z.toFixed(3); }
  });
}
let fitQueued = false;
const queueFit = () => { if (fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; try { fitCards(); } catch (e) {} }); };
new MutationObserver(queueFit).observe($('sb'), { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
addEventListener('resize', queueFit); document.addEventListener('fullscreenchange', queueFit);

/* ===================== LOOP & INPUT ===================== */
let last = performance.now();
let paused = false;                                        // the Menu button pauses everything (timer, runner, bridge)
function setPaused(v) {
  paused = v; $('pause').classList.toggle('hidden', !v);
  if (v) { $('btnResume').focus(); }
  $('menuBtn').textContent = v ? '✕ Close' : '☰ Menu';
  last = performance.now();
}
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  try { if (!paused) update(dt); draw(); updateHUD(); }
  catch (e) { console.error('game frame error (kept running):', e); try { ctx.restore(); } catch (_) {} }   // never let one bad frame freeze the game
  requestAnimationFrame(frame);
}

// Cheat code (same combo as the other games): hold Shift and press T, A, V together AT ANY TIME - unlocks every level start and gives max coins
const cheatDown = new Set();
addEventListener('keyup', e => cheatDown.delete(e.code));
addEventListener('blur', () => cheatDown.clear());
addEventListener('keydown', e => {
  cheatDown.add(e.code);
  if (e.repeat || !e.shiftKey || !['KeyT', 'KeyA', 'KeyV'].every(k => cheatDown.has(k))) return;
  cheatDown.clear();
  coins = 999999; store.set(KEY.coins, coins);
  for (let lv = 2; lv <= MAX_LEVEL; lv++) saveCheckpoint({ level: lv, px: (lv - 1) * METERS_PER_LEVEL * 30, solved: (lv - 1) * 4, wrong: 0, bestStreak: 0 });   // every level start unlocked
  sfx.good(); toast('🔓 All levels unlocked · max stars!', 'good');
  if (!$('shop').classList.contains('hidden')) renderShop();
  if (screen === 'menu') buildMenu();
});
function jump() { if (G && G.state === 'run' && !paused) G.jumpBuf = .12; }
addEventListener('keydown', e => {
  if (screen === 'title') {                                          // Enter / Space on the title screen = Play
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') { e.preventDefault(); audioInit(); showScreen('menu'); buildMenu(); }
    return;
  }
  if (e.code === 'Escape') {
    e.preventDefault();
    if (!$('exitConfirm').classList.contains('hidden')) { $('exitConfirm').classList.add('hidden'); $('pause').classList.remove('hidden'); }
    else if (!$('shop').classList.contains('hidden')) closeShop();
    else if (screen === 'practice') showScreen('menu');
    else if (screen === 'menu') { showScreen('title'); }
    else if (!$('over').classList.contains('hidden')) toMenu();
    else setPaused(!paused);                                         // while playing: same as the ☰ Menu button
    return;
  }
  const vis = id => !$(id).classList.contains('hidden'), enter = e.code === 'Enter' || e.code === 'NumpadEnter', space = e.code === 'Space', cardAge = performance.now() - cardAt;
  // Enter / Space carry on past the "Oops" card and the end-of-run card (a short delay so a jump-key tap doesn't skip it by accident)
  if ((enter || space) && screen === 'play' && !paused && !vis('shop')) {
    if (vis('feedback')) { e.preventDefault(); if (!e.repeat && cardAge > 350) $('btnNext').click(); return; }
    if (vis('over')) { e.preventDefault(); if (!e.repeat && cardAge > 700) $('btnAgain').click(); return; }
  }
  // Arrow keys jump to the nearest button in that direction (Tab works too); Enter / Space press the focused button
  if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.code) && (screen !== 'play' || vis('shop') || vis('pause') || vis('over') || vis('feedback'))) {
    const ov = ['shop', 'pause', 'over', 'feedback', 'practice', 'menu'].map($).find(el => !el.classList.contains('hidden'));
    if (ov) {
      e.preventDefault();
      const btns = [...ov.querySelectorAll('button:not(:disabled)')].filter(b => b.offsetParent !== null), cur = document.activeElement;
      if (!btns.length) return;
      if (!btns.includes(cur)) { btns[0].focus(); return; }
      const c = cur.getBoundingClientRect(), dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.code];
      let best = null, bestScore = Infinity;
      for (const b of btns) {
        if (b === cur) continue;
        const r = b.getBoundingClientRect();
        // distance along the pressed direction (from edge to edge), and how far off to the side the button is
        const along = dir[0] ? (dir[0] > 0 ? r.left - c.right : c.left - r.right) : (dir[1] > 0 ? r.top - c.bottom : c.top - r.bottom);
        const centerAlong = dir[0] ? (r.left + r.width / 2 - (c.left + c.width / 2)) * dir[0] : (r.top + r.height / 2 - (c.top + c.height / 2)) * dir[1];
        if (along < 0 || centerAlong <= 2) continue;                                // not in that direction (it has to be past the edge of this button)
        const overlap = dir[0] ? Math.min(c.bottom, r.bottom) - Math.max(c.top, r.top) : Math.min(c.right, r.right) - Math.max(c.left, r.left);
        const side = overlap > 0 ? 0 : (dir[0] ? Math.min(Math.abs(r.top - c.bottom), Math.abs(c.top - r.bottom)) : Math.min(Math.abs(r.left - c.right), Math.abs(c.left - r.right)));
        const cross = dir[0] ? Math.abs((r.top + r.height / 2) - (c.top + c.height / 2)) : Math.abs((r.left + r.width / 2) - (c.left + c.width / 2));
        const score = Math.max(0, along) + side * 3 + cross * .4 + (overlap > 0 ? 0 : 40);       // buttons in the same row / column win
        if (score < bestScore) { bestScore = score; best = b; }
      }
      if (best) best.focus();
    }
    return;
  }
  if (screen !== 'play') return;  if (screen !== 'play') return;
  if (paused) return;
  // Enter (main keyboard or numpad) jumps exactly like Space; while a question is showing, Enter still submits the answer
  const isJumpKey = ['Space', 'ArrowUp', 'KeyW', 'Enter', 'NumpadEnter'].includes(e.code) || e.key === 'Enter';
  if (isJumpKey && G && G.state === 'run') { e.preventDefault(); if (!e.repeat) jump(); }
  if (G && G.state === 'solve' && G.problem.type === 'sim') {              // "Similar or not?": arrow keys pick a button, Enter / Space presses it
    const yes = $('btnSimYes'), no = $('btnSimNo');
    if (e.code === 'ArrowLeft' || e.code === 'ArrowUp' || e.code === 'KeyS') { e.preventDefault(); yes.focus(); return; }
    if (e.code === 'ArrowRight' || e.code === 'ArrowDown' || e.code === 'KeyN') { e.preventDefault(); no.focus(); return; }
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') { e.preventDefault(); if (!e.repeat && (document.activeElement === yes || document.activeElement === no)) document.activeElement.click(); return; }
  }
  if ((e.code === 'Enter' || e.key === 'Enter') && G && G.state === 'solve') { e.preventDefault(); submit(); }
});
$('stage').addEventListener('pointerdown', e => { audioInit(); jump(); });
$('jumpBtn').addEventListener('pointerdown', e => { e.stopPropagation(); audioInit(); jump(); });
$('btnPlay').onclick = () => { audioInit(); buildMenu(); showScreen('menu'); };
$('btnMenuBack').onclick = () => showScreen('title');
$('btnPractice').onclick = openPractice;
$('btnPracBack').onclick = () => showScreen('menu');
$('btnPracStart').onclick = () => { const t = PRACTICE_TYPES.filter(p => practicePicked.includes(p.id)); if (t.length) startPractice(t); };
$('btnStart').onclick = () => startGame(highestCheckpoint());      // continues at the hardest level reached, so easy questions aren't repeated forever
$('btnAgain').onclick = () => { if (G && G.mode === 'practice' && G.ptypes.length) startPractice(G.ptypes); else startGame(highestCheckpoint()); };
$('btnOverMenu').onclick = toMenu;
$('btnBuild').onclick = () => submit();
$('btnNext').onclick = respawn;
$('btnSimYes').onclick = () => submit(false, 'yes');
$('btnSimNo').onclick = () => submit(false, 'no');
const muteLabel = () => { $('muteBtn').textContent = muted ? '🔇 Sound off' : '🔊 Sound on'; };
$('muteBtn').onclick = () => { muted = !muted; store.set(KEY.muted, muted); muteLabel(); audioInit(); };
muteLabel();
$('menuBtn').onclick = () => setPaused(!paused);
$('btnResume').onclick = () => setPaused(false);
$('btnShop').onclick = openShop;                 // (Menu screen only)
$('btnShopClose').onclick = closeShop;
$('btnRestart').onclick = () => { const pr = G && G.mode === 'practice' ? G.ptypes : null; setPaused(false); if (pr && pr.length) startPractice(pr); else startGame(G && G.level > 1 ? checkpoints[G.level] : undefined); };  // restarts THIS run's level, not all the way back to level 1
$('btnTitle').onclick = () => { $('pause').classList.add('hidden'); $('exitConfirm').classList.remove('hidden'); };
$('btnExitConfirmYes').onclick = () => { $('exitConfirm').classList.add('hidden'); toMenu(); };
$('btnExitConfirmNo').onclick = () => { $('exitConfirm').classList.add('hidden'); $('pause').classList.remove('hidden'); };
(function keypad() {
  const kp = $('keypad');
  ['7','8','9','4','5','6','1','2','3','Clear','0','⌫'].forEach(k => {
    if (k === 'Clear') { kp.lastChild && 0; }
    const b = document.createElement('button'); b.textContent = k === 'Clear' ? 'C' : k; b.type = 'button';
    b.onclick = () => { const a = $('ans'); if (k === '⌫') a.value = a.value.slice(0, -1); else if (k === 'Clear') a.value = ''; else a.value += k; };
    kp.appendChild(b);
  });
})();

/* ===================== LEVEL OVERVIEW (open the game with ?levels) ===================== */
function buildLevelsPage() {
  document.querySelectorAll('.overlay').forEach(e => e.classList.add('hidden'));
  document.querySelectorAll('.play-area, .teaching-notes, .reset-progress').forEach(e => { e.style.display = 'none'; });   // teacher view: just the level list
  const st = document.createElement('style');
  st.textContent = `#lv{max-width:1000px;margin:0 auto;padding:16px;color:#1d2340}
    #lv h1{color:#fff} #lv .intro{color:#aab2dd;margin-bottom:14px}
    #lv .lvl{background:#fff;border-radius:18px;padding:14px 16px;margin:14px 0}
    #lv h2{margin:0 0 4px} #lv .meta{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:14px;color:#5b6485;margin-bottom:8px}
    #lv .tags{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px} #lv .tag{background:#eef1ff;border-radius:999px;padding:3px 10px;font-size:13px;font-weight:700}
    #lv .tag.k{background:#fff1e4} #lv .samples{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}
    #lv .s{background:#f4f7ff;border-radius:14px;padding:6px} #lv .s .pair{display:flex;gap:4px;align-items:center}
    #lv .s .pair>div{flex:1;min-width:0} #lv .s svg{width:100%;height:auto;display:block}
    #lv .cap{font-size:13px;text-align:center;color:#5b6485;padding:2px 0 4px}
    #lv .kb{flex:0 0 auto !important;background:#ff7a1a;color:#fff;font-weight:900;border-radius:999px;padding:3px 8px;font-size:14px}`;
  document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'lv';
  let h = `<h1>📋 Question levels</h1><div class="intro">Every level's rules and live sample questions (refresh the page for new samples). Settings live in the code as
    <code>KINDS_BY_LEVEL</code>, <code>KIND_CFG</code>, <code>SPEED_BY_LEVEL</code>, <code>TIME_BY_LEVEL</code>, <code>LEVEL_OBS</code>, <code>MIN_GAP_SEC</code>, <code>GAP_MIX</code>, <code>METERS_PER_LEVEL</code> and <code>MAX_LEVEL</code>.</div>`;
  const WHAT = {
    scale: '❓ Find the SCALE FACTOR between the two figures',
    up: '✖ Find a missing side of the BIGGER figure (multiply by the scale factor)',
    down: '➗ Find a missing side of the SMALLER figure (divide by the scale factor)',
    pair: '🔎 Find k from ONE pair of sides, then find the missing side',
    fup: '✖ Multiply by a FRACTIONAL scale factor (like 3/2)',
    fdown: '✖ Shrink by a FRACTIONAL scale factor (like 2/3)',
    nest: '🔺 Nested and overlapping triangles: find the missing length',
    sim: '⚖ Similar or Not Similar?',
    alg: '🔤 Algebra in the sides: solve for x'
  };
  const NOTE = [
    'Both figures show all their sides. Small numbers.',
    'Scale factor is given; the missing side is spotlighted. Mixes multiplying and dividing. Small numbers.',
    'The bigger figure is turned (90°, 180° or 270°) and sometimes flipped. No scale factor and only ONE pair of matching sides is labeled, so find k first. Tick marks and colors show which sides are equal. Numbers are multiples of 5 (biggest side 100).',
    'Nested / overlapping triangles (parallel lines make similar triangles) and "Similar or Not Similar?" questions.',
    'A mix of every earlier question type, plus fractional scale factors (like 3/2 or 2/3) and algebra: a side is written like 2x + 5 and the student solves for x.'
  ];
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    const startAt = (lv - 1) * METERS_PER_LEVEL;
    h += `<div class="lvl"><h2>Level ${lv}</h2><div class="meta"><span>${lv === 1 ? 'Starts at the beginning' : `Reached at ${startAt} m`}${lv === MAX_LEVEL ? ' (and stays here)' : ''}</span>` +
      `<span>⏱ ${TIME_BY_LEVEL[lv - 1]} s per question</span><span>🏃 runner speed ×${SPEED_BY_LEVEL[lv - 1]}</span>` +
      `<span>🪨 obstacles: ${LEVEL_OBS[lv - 1].filter((t, i, a) => a.indexOf(t) === i).map(t => OBS[t].label).join(", ")} (spacing from ${MIN_GAP_SEC[lv - 1]} s)</span></div>` +
      `<div class="tags"><b>Questions:</b> ` + KINDS_BY_LEVEL[lv - 1].filter((t, i, a) => a.indexOf(t) === i).map(t => `<span class="tag">${WHAT[t]}</span>`).join('') + `</div>` +
      `<div class="meta">${NOTE[lv - 1]}</div><div class="samples">`;
    for (let i = 0; i < 4; i++) {
      const P = genProblem(lv);
      h += `<div class="s">${pairSVG(P, false)}<div class="cap">${SHAPES[P.shape].bridge} · answer <b>${ansText(P, P.answer)}</b></div></div>`;
    }
    h += `</div></div>`;
  }
  root.innerHTML = h; document.body.appendChild(root);
}

// setup
if (/[?&]levels/.test(location.search)) { G = newWorld(true); buildLevelsPage(); } else {
G = newWorld(true);
buildMenu();
showScreen('title');                                   // the title screen is the first thing players see
requestAnimationFrame(frame);
}

// small hook (used for automated checks and by the Reset Progress button to avoid re-saving)
window.BBR = { figParts, drawChar, CHARACTERS, pairSVG, titleStep(dt) { titleT += dt; drawTitle(); }, showScreen, step(dt) { update(dt); draw(); updateHUD(); }, genProblem, get G() { return G; }, submit, startGame: (cp, earlier) => startGame(cp, earlier), solutionHTML, figSVG, fmt };
})();
