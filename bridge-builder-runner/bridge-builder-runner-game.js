// Bridge Builder Runner - game logic (math engine, level settings, runner physics, drawing, menus).
// Loaded by bridge-builder-runner.html. Level rules are all in one place: search for "LEVEL SETTINGS".
// A teacher-facing overview of every level with live sample questions is at bridge-builder-runner.html?levels
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
// classes = groups of edges that are equal in length (used at level 5, where equal sides are NOT labeled twice)
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

/* ---- LEVEL SETTINGS (edit these!) ----
   Level 1: find the SCALE FACTOR between two dilated figures (triangles and rectangles only, scale factor 1-3)
   Level 2: multiply OR divide to find a missing side (bigger or smaller figure)   scale factor 2-4, small numbers
   Level 3: multiply OR divide, figure rotated/reflected                          scale factor 2-5, bigger friendly numbers (multiples of 5 and 10)
   Level 4: like level 3, but some sides are NOT labeled - use tick marks / the shape's name (square, rhombus, rectangle...) */
const MAX_LEVEL = 4;
const K_BY_LEVEL = [[1, 2, 3], [2, 3, 4], [2, 3, 4, 5], [2, 3, 4, 5]];
const TYPE_BY_LEVEL = [['scale'], ['up', 'down'], ['up', 'down'], ['up', 'down']];
const UNIT_BY_LEVEL = [[1], [1], [5, 10], [5, 10]];                     // every side is multiplied by one of these
const MAX_SMALL_SIDE = [10, 12, Infinity, Infinity];                    // keeps the numbers easy on the early levels
const MAX_BIG_SIDE = [40, 48, 250, 250];
// which shapes can appear at each level (a name listed twice shows up twice as often)
const SHAPES_BY_LEVEL = [
  ['tri', 'rect'],
  ['tri', 'rect', 'par', 'trap', 'rtrap', 'house', 'stair'],
  ['tri', 'rect', 'par', 'trap', 'rtrap', 'house', 'stair', 'ell', 'tee', 'arrow'],
  ['sq', 'rect', 'par', 'rhomb', 'isotri', 'equitri', 'trap']
];
const SECONDS_BETWEEN_QUESTIONS = 10;                          // about how long you run (dodging obstacles) between two questions
const SOLVED_PER_LEVEL = 4;                                  // correct answers needed to reach the next level

function genProblem(level, ksOverride) {
  const L = level - 1, ks = ksOverride || K_BY_LEVEL[L], shapes = SHAPES_BY_LEVEL[L];
  for (let n = 0; n < 1500; n++) {
    const key = pick(shapes), sh = SHAPES[key], base = sh.make();
    const type = pick(TYPE_BY_LEVEL[L]), k = pick(ks), u = pick(UNIT_BY_LEVEL[L]);
    const lensS = base.lens.map(v => v * u), lensB = lensS.map(v => v * k);          // small figure / big figure (whole numbers)
    if (Math.max(...lensS) > MAX_SMALL_SIDE[L] || Math.max(...lensB) > MAX_BIG_SIDE[L]) continue;
    const hgt = Math.max(...base.pts.map(p => p[1])) * u * k;
    const fits = PPF_OPTIONS.filter(o => lensB[0] * o >= 120 && lensB[0] * o <= 400);   // gap 120-400 px
    if (!fits.length) continue;
    const ppf = fits.reduce((a, b) => Math.abs(b - 10) < Math.abs(a - 10) ? b : a);     // prefer 10 px per foot so gap width tracks real length
    if (hgt * ppf > 330) continue;                                                        // finished bridge stays on screen
    let ti = -1, src = 0, showS = [], showB = [];
    if (type === 'scale') { showS = sh.label.slice(); showB = sh.label.slice(); }
    else if (level === 4) {                                                            // one number per group of equal sides
      const tc = pick(sh.classes.filter(c => c.length > 1));
      ti = pick(tc); src = pick(tc.filter(i => i !== ti));                             // the labeled twin of the missing side
      const reps = sh.classes.map(c => c === tc ? src : pick(c));
      if (type === 'up') showS = reps; else showB = reps;
    } else {
      ti = pick(sh.label); src = ti;
      if (level === 3) { showS = sh.label.slice(); showB = sh.label.slice(); }          // level 3: every side of both shapes is shown except the one missing side
      else if (type === 'up') showS = sh.label.slice(); else showB = sh.label.slice();
    }
    const answer = type === 'scale' ? k : type === 'up' ? lensB[ti] : lensS[ti];
    let flip = false, rot = 0;
    if (level >= 3) { flip = Math.random() < 0.5; rot = pick([90, 180, 270]); }        // always turned; sometimes mirrored too
    return {
      type, level, shape: key, shapeName: sh.name, pts: base.pts, lens: base.lens, lensS, lensB, k, u, ppf,
      ti, src, showS, showB, answer, flip, rot,
      cmap: level === 4 ? base.pts.map((_, i) => i) : sh.cmap,                          // level 4: colors don't reveal which sides are equal
      classes: sh.classes || [], ticks: level === 4
    };
  }
  return genProblem(level, [2]);
}
const gapFor = P => P.lensB[0] * P.ppf;                     // gap width = real base length of the big bridge x pixels-per-foot

const chip = (txt, col) => `<span class="chip" style="border-color:${col};color:${col}">${txt}</span>`;

// the worked steps, drawn with color chips (used on the wrong-answer card and the end-of-run list)
function stepsHTML(P) {
  const C = i => COLORS[P.cmap[i]];
  if (P.type === 'scale') return `<div>${chip(P.lensB[0], C(0))} ÷ ${chip(P.lensS[0], C(0))} = ${chip('×' + P.k, '#ff7a1a')}</div>`;
  const x = P.type === 'up' ? P.lensS[P.src] : P.lensB[P.src];
  const twin = P.src !== P.ti ? `<div>${chip(x, C(P.src))} <b style="font-size:26px">=</b> ${chip(x, C(P.ti))}</div>` : '';
  return twin + `<div>${chip(x, C(P.src))} ${P.type === 'up' ? '×' : '÷'} ${P.k} = ${chip(P.answer, C(P.ti))}</div>`;
}
const ansText = (P, v) => P.type === 'scale' ? '×' + fmt(v) : fmt(v) + ' ft';

// Both figures in ONE picture, with a curved arrow for every side: from the pre-image side to its matching side on the image,
// the scale factor on top of the arrow (×k going small -> big, ÷k going big -> small; "×?" on level 1 while it is unknown).
// Arrows/pills use the side's own color so you can see which side goes where.
function pairSVG(P, reveal) {
  const A = figParts(P, 'model', reveal), Bp = figParts(P, 'bridge', reveal);
  const focus = P.level === 2 && P.type !== 'scale';                                    // level 2: only the missing side's arrow
  const toSmall = P.type === 'down';
  const label = P.type === 'scale' && !reveal ? '×?' : (toSmall ? '÷' : '×') + P.k;
  const noArrows = P.level === 3 && !reveal;                                       // level 3 question: no arrows, no scale factor - find it yourself
  const edges = noArrows ? [] : focus ? [P.ti] : reveal ? SHAPES[P.shape].label.slice() : [...new Set([...P.showS, ...P.showB, ...(P.ti >= 0 ? [P.ti] : [])])].sort((a, b) => a - b);
  const OFFX = 340, VW = 600;
  const pre = toSmall ? Bp : A, img = toSmall ? A : Bp, preX = toSmall ? OFFX : 0, imgX = toSmall ? 0 : OFFX;
  // sides on the lower part of a shape get an arrow that dips DOWN beneath the shapes and then curves UP to the match;
  // every other side gets a gentle arch over the top. The arches hug the shapes so they stay calm.
  const isLow = i => (pre.mids[i].ny + img.mids[i].ny) / 2 > 0.35;
  const nLow = edges.filter(isLow).length, nUp = edges.length - nLow;
  const capH = 0, OFFY = noArrows ? 0 : capH + 22 + 20 * nUp, VH = OFFY + 190 + (nLow ? 46 + 20 * nLow : 8);
  const topY = Math.min(pre.top, img.top), botY = Math.max(pre.bottom, img.bottom);
  let ru = 0, rl = 0;
  const single = SHAPES[P.shape].single, big = P.level === 4 ? `Big ${single}` : 'Big', small = P.level === 4 ? `Small ${single}` : 'Small';
  const font = 'font-family:Trebuchet MS,system-ui,sans-serif';
  let defs = '', paths = '', pills = '';
  const items = [];
  edges.forEach((i, r) => {
    const col = COLORS[P.cmap[i]], m1 = pre.mids[i], m2 = img.mids[i];
    const low = isLow(i), sgn = low ? 1 : -1, rank = low ? rl++ : ru++;
    const off = focus ? 33 : (P.ticks ? 24 : 17), gap = focus ? 30 : 20;       // the arrow starts / ends just past each side's number
    const sx = preX + m1.x + m1.nx * off, sy = OFFY + m1.y + m1.ny * off + sgn * gap, dx = imgX + m2.x + m2.nx * off, dy = OFFY + m2.y + m2.ny * off + sgn * gap;
    // lower arrows really dip: the lowest point is well below where the arrow starts and ends, then it rises to its match
    const apex = low ? Math.max(OFFY + botY + 32, (sy + dy) / 2 + 30) + rank * 20 : OFFY + topY - 32 - rank * 20;
    const cx = (sx + dx) / 2, cy = 2 * (apex - (sy + dy) / 4);
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

// wrong-answer card: mostly pictures - both figures with per-side arrows, and the math with matching colors
function solutionHTML(P) {
  const verdict = P.timedOut ? '⏱' : `<span class="bad">❌ ${ansText(P, P.userAns)} <small>${P.userAns < P.answer ? '(too small)' : '(too big)'}</small></span>`;
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
  let pts = P.pts.map(([x, y]) => { x = flip ? -x : x; y = -y; return [x*ca - y*sa, x*sa + y*ca]; });
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
  const focus = P.level === 2 && P.type !== 'scale';                                    // level 2: spotlight the missing side + its match
  const font = 'font-family:Trebuchet MS,system-ui,sans-serif';
  const mids = pts.map((a, i) => {
    const b = pts[(i + 1) % n], mx = (a[0]+b[0])/2, my = (a[1]+b[1])/2; let nx = mx - cx, ny = my - cy; const nl = Math.hypot(nx, ny) || 1;
    return { x: mx, y: my, nx: nx / nl, ny: ny / nl };
  });
  let out = `<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="#e8eeff" stroke="none"/>`;
  for (let i = 0; i < n; i++) {                                                      // right-angle marks
    const v0 = P.pts[i], p0 = P.pts[(i + n - 1) % n], q0 = P.pts[(i + 1) % n];
    const dot = (p0[0]-v0[0])*(q0[0]-v0[0]) + (p0[1]-v0[1])*(q0[1]-v0[1]);
    if (n <= 6 && Math.abs(dot) < 1e-6) {
      const v = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      const u = [a[0]-v[0], a[1]-v[1]], w = [b[0]-v[0], b[1]-v[1]];
      const lu = Math.hypot(...u), lw = Math.hypot(...w), m = 11;
      const A = [v[0]+u[0]/lu*m, v[1]+u[1]/lu*m], B = [A[0]+w[0]/lw*m, A[1]+w[1]/lw*m], C = [v[0]+w[0]/lw*m, v[1]+w[1]/lw*m];
      out += `<path d="M${A} L${B} L${C}" fill="none" stroke="#7a84ad" stroke-width="2" opacity="${focus ? .4 : 1}"/>`;
    }
  }
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], col = COLORS[P.cmap[i]], isT = i === P.ti;
    const dim = focus && !isT;
    if (qHere && isT)                                                                  // the missing side: glowing gold
      out += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#ffd23f" stroke-opacity=".6" stroke-width="${focus ? 22 : 15}" stroke-linecap="round"><animate attributeName="stroke-opacity" values=".25;.9;.25" dur="1.2s" repeatCount="indefinite"/></line>`;
    else if (focus && isT)                                                             // its matching side on the other figure: soft glow in the same color
      out += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${col}" stroke-opacity=".3" stroke-width="20" stroke-linecap="round"/>`;
    out += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${col}" stroke-width="${focus && isT ? 9 : 5}" stroke-linecap="round" opacity="${dim ? .3 : 1}"/>`;
  }
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
  for (let i = 0; i < n; i++) {
    let txt = null;
    if (qHere && i === P.ti) txt = reveal ? fmt(P.answer) : '?';
    else if ((reveal ? SHAPES[P.shape].label : show).includes(i)) txt = fmt(lens[i]);     // the wrong-answer card reveals every side
    if (txt === null) continue;
    const m = mids[i], col = COLORS[P.cmap[i]], off = P.ticks ? 24 : 17;
    if (focus && i === P.ti) {                                                         // spotlighted number: a filled bubble in the side's color
      const size = txt === '?' ? 30 : 22, w = Math.max(40, 18 + String(txt).length * size * .62), h = size + 12;
      const lx = m.x + m.nx * (off + 8), ly = m.y + m.ny * (off + 8);
      out += `<rect x="${lx - w/2}" y="${ly - h/2}" width="${w}" height="${h}" rx="${h/2}" fill="${col}" stroke="#fff" stroke-width="3"/>` +
        `<text x="${lx}" y="${ly + 1}" text-anchor="middle" dominant-baseline="central" font-size="${size}" font-weight="900" fill="#fff" style="${font}">${txt}</text>`;
    } else {
      const lx = m.x + m.nx * off, ly = m.y + m.ny * off;
      out += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" font-size="${txt === '?' ? 24 : 18}" font-weight="900" fill="${col}" stroke="#fff" stroke-width="4" paint-order="stroke" opacity="${focus ? .4 : 1}" style="${font}">${txt}</text>`;
    }
  }
  return { body: out, mids, VW, VH, top: Math.min(...pts.map(p => p[1])), bottom: Math.max(...pts.map(p => p[1])) };
}

/* ===================== GAME STATE ===================== */
const THEMES = [
  { name: 'Canyon', sky: ['#6ec6ff','#ffe3b3'], far: '#d9a074', near: '#b5683f', top: '#d29a55', body: '#8a4b2a', sun: '#fff3b0' },
  { name: 'Jungle', sky: ['#7fdcc0','#f4fbd0'], far: '#5fae7a', near: '#2f8a5a', top: '#45b04f', body: '#6b4a2b', sun: '#fffbd0' },
  { name: 'Night City', sky: ['#171b48','#7a4a8f'], far: '#3a3470', near: '#25204d', top: '#5b5b70', body: '#2d2d3a', sun: '#e8ecff', city: true }
];
const SKINS = [
  { name: 'Rookie', need: 0,    body: '#2f80ed', accent: '#1b4f9c', hat: 'cap' },
  { name: 'Builder', need: 150,  body: '#ff9f1a', accent: '#b56600', hat: 'hard' },
  { name: 'Ninja', need: 400, body: '#2b2b3a', accent: '#111', hat: 'band' },
  { name: 'Royal', need: 800, body: '#9b51e0', accent: '#5b2a94', hat: 'crown' }
];
// Saved progress lives in this browser only (localStorage), under the "bridgerunner_" prefix - the same
// per-game prefix convention every other game on the site uses, so My Stats and the reset buttons can find it.
const KEY = {
  bestMeters: 'bridgerunner_best_meters', bestLevel: 'bridgerunner_best_level',
  bestBridges: 'bridgerunner_best_bridges', bestStreak: 'bridgerunner_best_streak',
  skin: 'bridgerunner_skin', muted: 'bridgerunner_muted'
};
let best = store.get(KEY.bestMeters, 0), skinIdx = store.get(KEY.skin, 0), muted = store.get(KEY.muted, false);
if (skinIdx >= SKINS.length || SKINS[skinIdx].need > best) skinIdx = 0;

// Records this run's numbers if they beat the saved ones. Called when a run ends AND when the tab is hidden or
// closed, so progress earned right before leaving the page is never lost.
function saveRunStats() {
  if (window.bridgeRunnerResetting || !G || G.state === 'menu') return;
  const meters = Math.max(0, Math.floor(G.px / 30));
  if (meters > best) { best = meters; store.set(KEY.bestMeters, best); }
  if (G.level > store.get(KEY.bestLevel, 1)) store.set(KEY.bestLevel, G.level);
  if (G.solved > store.get(KEY.bestBridges, 0)) store.set(KEY.bestBridges, G.solved);
  if (G.bestStreak > store.get(KEY.bestStreak, 0)) store.set(KEY.bestStreak, G.bestStreak);
}
addEventListener('pagehide', saveRunStats);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveRunStats(); });

let G = null;
const keys = {};

function newWorld(menu) {
  return {
    state: menu ? 'menu' : 'run', t: 0, cam: 0, px: menu ? 0 : 60, py: GROUND, vy: 0, onGround: true,
    jumpBuf: 0, airJumps: 0, stumble: 0, inv: 0, crashed: false, shake: 0,
    lives: 3, streak: 0, bestStreak: 0, solved: 0, wrong: 0,
    level: 1, theme: 0, dist: 0, missed: [],
    platforms: [menu ? { s: -5000, e: 1e9, obs: [], bridged: true } : makePlatform(-400, 3600, true)],
    pi: 0, particles: [], problem: null, timeLeft: 0, timeTotal: 0, hint: false, tipT: 0
  };
}

// Obstacles per theme. Ground obstacles are jumped; flyers hang at head height, so DON'T jump under them.
const OBS = {
  rock: { w: 46, h: 38 }, cactus: { w: 28, h: 62 }, vulture: { fly: true },
  log: { w: 64, h: 30 }, stump: { w: 36, h: 44 }, parrot: { fly: true },
  cone: { w: 26, h: 38 }, barrel: { w: 38, h: 48 }, drone: { fly: true }
};
const THEME_OBS = [['rock', 'cactus', 'rock', 'vulture'], ['log', 'stump', 'log', 'parrot'], ['cone', 'barrel', 'barrel', 'drone']];
const flyY = c => GROUND - 125 + Math.sin(G.t * 4 + c.x) * 8;

// each level: the runner is faster, and obstacles are closer together (more of them)
const SPEED_BY_LEVEL = [1, 1.12, 1.26, 1.4];                 // × the base running speed (330 px/s)
const SPACING_BY_LEVEL = [[400, 560], [360, 520], [330, 470], [300, 420]];   // px between obstacles (lots of them!)

function fillContent(p, first, theme, level = 1, keepX = null) {
  // keepX: when a platform ahead is re-filled (theme/level just changed), everything at x <= keepX is already on screen,
  // so it is left exactly as it is; only what is still off-screen gets the new theme / density.
  const kept = keepX === null ? [] : (p.obs || []).filter(c => c.x <= keepX);
  const keptFloats = keepX === null ? [] : (p.floats || []).filter(f => f.x <= keepX);
  p.obs = kept.slice();
  const [gMin, gMax] = SPACING_BY_LEVEL[level - 1];
  // nothing appears for the first 3 seconds: the first obstacle enters the screen after ~3.1 s (start x=60, speed 330 px/s, screen shows 720 px ahead)
  let x = kept.length ? kept[kept.length - 1].x + rnd(gMin, gMax) : Math.max(p.s + (first ? 2200 : 340), keepX === null ? 0 : keepX + 40);
  let lastFly = kept.length ? !!kept[kept.length - 1].fly : false;
  const fresh = [];
  while (x < p.e - 300) {
    let type = pick(THEME_OBS[theme]);
    if (OBS[type].fly && lastFly) type = THEME_OBS[theme][0];        // no back-to-back flyers
    const d = OBS[type]; lastFly = !!d.fly;
    const c = { x, type, fly: !!d.fly, hit: false };
    p.obs.push(c); fresh.push(c);
    x += rnd(gMin, gMax);
  }
  // floating platforms: you can land on them (from above) and run along them to hop over a ground obstacle.
  // They only sit over ground obstacles, never near a flyer. Height 105-125 px: reachable with one jump, easy with a double jump.
  p.floats = keptFloats;
  const flyers = p.obs.filter(c => c.fly);
  fresh.forEach(c => {
    if (c.fly || Math.random() > 0.7) return;
    const w = OBS[c.type].w + 100 + rnd(0, 60), fx = c.x - 50 - rnd(0, 20);
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
    p.problem = genProblem(G.level);                         // the puzzle decides how wide the gap is
    p.gapW = gapFor(p.problem);
    const s = p.e + p.gapW;
    const runLen = Math.round(SECONDS_BETWEEN_QUESTIONS * 330 * SPEED_BY_LEVEL[G.level - 1] * (0.9 + Math.random() * 0.2));   // time to dodge before the next question
    G.platforms.push(makePlatform(s, s + runLen, false, G.theme, G.level));
  }
}

function startGame() {
  G = newWorld(false);
  G.tipT = 4;
  $('menu').classList.add('hidden'); $('over').classList.add('hidden');
  $('feedback').classList.add('hidden'); $('problem').classList.add('hidden');
  audioInit(); toast('Run! Jump obstacles — a crash costs a ❤️', '');
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
  $('hLives').textContent = '❤️'.repeat(G.lives) + '🖤'.repeat(Math.max(0, 3 - G.lives));
  $('hStreak').textContent = G.streak;
  $('hDist').textContent = Math.max(0, Math.floor(G.px / 30));
}
function buildMenu() {
  $('mBest').textContent = Math.floor(best);
  const box = $('skins'); box.innerHTML = '';
  SKINS.forEach((s, i) => {
    const b = document.createElement('button');
    const locked = s.need > best;
    b.className = 'skin' + (i === skinIdx ? ' sel' : '') + (locked ? ' locked' : '');
    b.textContent = locked ? `🔒 ${s.name} (${s.need} m)` : s.name;
    b.onclick = () => { if (locked) return; skinIdx = i; store.set(KEY.skin, i); buildMenu(); };
    box.appendChild(b);
  });
}

/* ===================== PROBLEM FLOW ===================== */
const TIME_BY_LEVEL = [45, 40, 36, 33];        // seconds to answer, by level
function answerTime() { return TIME_BY_LEVEL[G.level - 1]; }

function startSolve() {
  G.state = 'solve';
  const gp = G.platforms[G.pi];
  G.problem = gp.problem || genProblem(G.level); gp.problem = null;
  G.timeTotal = G.timeLeft = answerTime();
  G.hint = false;
  const P = G.problem;
  const bn = SHAPES[P.shape].bridge;
  $('pTitle').textContent = `Level ${G.level}`;
  $('pTimer').textContent = '';
  const single = SHAPES[P.shape].single;
  const prompts = {
    scale: 'What is the <b>scale factor</b>?',
    up: 'Find the missing side of the <b>big</b> shape.',
    down: 'Find the missing side of the <b>small</b> shape.'
  };
  let txt = prompts[P.type];
  if (P.level === 4) txt += ` <span style="color:#5b6485">Same tick marks = same length.</span>`;
  $('pPrompt').innerHTML = txt;
  $('pairWrap').innerHTML = pairSVG(P, false);
  $('ansLbl').textContent = P.type === 'scale' ? 'Scale factor ×' : '? =';
  $('ansUnit').style.display = P.type === 'scale' ? 'none' : '';
  $('hintBox').classList.add('hidden');
  $('btnHint').disabled = false;
  $('ans').value = '';
  $('problem').classList.remove('hidden');
  setTimeout(() => { if (!matchMedia('(pointer:coarse)').matches) $('ans').focus(); }, 30);
}

function parseAns(str) {                          // whole numbers only
  str = (str || '').trim();
  return /^\d{1,4}$/.test(str) ? Number(str) : NaN;
}

function submit(timedOut) {
  if (G.state !== 'solve') return;
  let val = null;
  if (!timedOut) {
    val = parseAns($('ans').value);
    if (!isFinite(val)) { const a = $('ans'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); return; }
  }
  const P = G.problem, p = G.platforms[G.pi];
  const ok = val === P.answer;
  P.userAns = val; P.timedOut = !!timedOut;
  const ratio = ok ? 1 : (val === null || val <= 0 ? 0.1 : clamp(val / P.answer, 0.1, 2.2));     // the bridge is built at the scale YOUR number implies
  p.bridge = { ratio, len: p.gapW * ratio, ok, prog: 0, collapsed: false, cAnim: 0, P, val, sparked: false };
  $('problem').classList.add('hidden');
  G.state = 'build'; sfx.build();
}

function onBridgeBuilt() {
  const p = G.platforms[G.pi], b = p.bridge;
  if (b.ok) {
    p.bridged = true;
    G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak); G.solved++;
    const oldTheme = G.theme, oldLevel = G.level;
    G.level = Math.min(MAX_LEVEL, 1 + Math.floor(G.solved / SOLVED_PER_LEVEL));
    G.theme = Math.floor(G.solved / 6) % THEMES.length;
    if (G.theme !== oldTheme || G.level !== oldLevel)                // platforms ahead get the new theme's obstacles at the new density
      for (let i = G.pi + 1; i < G.platforms.length; i++) fillContent(G.platforms[i], false, G.theme, G.level, G.cam + W + 160);   // never touch what is already on screen
    const up = G.level !== oldLevel ? ` · Level ${G.level}: faster + more obstacles!` : '';
    toast((b.P.type === 'scale' ? `Scale ×${b.P.k} — ${SHAPES[b.P.shape].bridge} locked in!`
      : `${SHAPES[b.P.shape].bridge} locked in by your ${fmt(b.P.answer)} ft keystone!`) + up, 'good'); sfx.good();
    G.state = 'run';
  } else {
    G.state = 'cross';
  }
}

// the moment the runner drops into the hole: lose a heart
function applyFail() {
  const P = G.problem;
  G.lives--; G.streak = 0; G.wrong++;
  G.missed.push(P);
  sfx.bad(); G.shake = .3;
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
  $('fbStorm').innerHTML = '❤️'.repeat(G.lives) + '🖤'.repeat(3 - G.lives);
  $('btnNext').textContent = 'Try a new bridge ➜';
  $('feedback').classList.remove('hidden');
}

function respawn() {
  const p = G.platforms[G.pi];
  p.bridge = null; p.bridged = false;
  G.px = p.e - 70; G.py = GROUND; G.vy = 0; G.onGround = true;
  const P = genProblem(G.level); p.problem = P; setGap(p, gapFor(P));      // a new puzzle means a new gap width
  $('feedback').classList.add('hidden');
  startSolve();
}

function gameOver() {
  G.state = 'over';
  const total = G.solved + G.wrong, acc = total ? Math.round(G.solved / total * 100) : 0;
  const meters = Math.max(0, Math.floor(G.px / 30)), newBest = meters > best;
  saveRunStats();                                       // best distance, highest level, most bridges, best streak
  $('ovTitle').textContent = G.crashed ? '💥 You crashed out!' : '🏁 Run over!';
  $('ovStats').innerHTML =
    `<div><b>${meters} m</b>Distance ${newBest ? '🏆 New best!' : ''}</div><div><b>${best} m</b>Best distance</div>` +
    `<div><b>${G.solved}</b>Bridges built</div><div><b>${acc}%</b>Accuracy · best streak ${G.bestStreak}</div>`;
  const uniq = G.missed.slice(-4);
  $('ovReview').innerHTML = uniq.length ? `<p style="text-align:left;font-weight:800;margin-bottom:2px">📝 Missed:</p><div class="review">` +
    uniq.map(P => `<div>${stepsHTML(P)} <span style="color:#c33">${P.timedOut ? '⏱' : '❌ ' + ansText(P, P.userAns)}</span></div>`).join('') + `</div>`
    : `<p>🎉 No missed math problems!${G.crashed ? ' Watch out for obstacles next time.' : ''}</p>`;
  $('feedback').classList.add('hidden'); $('problem').classList.add('hidden');
  $('over').classList.remove('hidden');
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
    // obstacles: a crash costs a heart, then you get a moment of invincibility
    if (G.inv > 0) G.inv -= dt;
    else for (const c of p.obs) {
      if (c.hit) continue;
      const d = OBS[c.type];
      const hit = c.fly
        ? Math.abs(G.px - c.x) < 28 && (G.py - 92) < flyY(c) + 14 && G.py > flyY(c) - 14
        : G.px + 10 > c.x && G.px - 10 < c.x + d.w && G.py > GROUND - d.h + 4;
      if (hit) {
        c.hit = true; G.inv = 1.6; G.stumble = .5; G.shake = .35; G.lives--;
        sfx.hit(); sfx.bad(); burst(c.fly ? c.x - G.cam : c.x + d.w / 2 - G.cam, c.fly ? flyY(c) : GROUND - d.h / 2, '#ff8a5c', 18);
        toast(G.lives > 0 ? `Crash into the ${c.type}! −1 ❤️` : 'Crashed out!', 'bad');
        if (G.lives <= 0) { G.crashed = true; gameOver(); return; }
      }
    }
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
    // a wrong bridge always collapses: too long snaps in the middle of the gap; too short buckles under the runner and swings down
    const trigger = b.ratio > 1 ? p.gapW * .5 : b.len * .55;
    if (!b.ok && !b.collapsed && G.px >= p.e + trigger) {
      b.collapsed = true; sfx.hit(); G.shake = .4;
      burst(p.e + trigger - G.cam, GROUND, '#c98a4b', 26);
    }
  } else if (G.state === 'solve') {
    G.timeLeft -= dt;
    const f = clamp(G.timeLeft / G.timeTotal, 0, 1);
    $('barFill').style.width = (f * 100) + '%';
    $('barFill').style.background = f > .5 ? '#1e9e57' : f > .25 ? '#f2b01e' : '#e04545';
    $('pTimer').textContent = '⏱ ' + Math.max(0, Math.ceil(G.timeLeft)) + 's';
    if (G.timeLeft <= 0) submit(true);
  }
  // gravity + landing
  if (G.state === 'rise') {
    const r = G.rise; r.t = Math.min(1, r.t + dt / 1.5);
    const e = 1 - Math.pow(1 - r.t, 3);
    G.px = r.x0 + (r.x1 - r.x0) * e;
    G.py = r.y0 + (GROUND - r.y0) * e - Math.sin(Math.PI * e) * 60;
    if (Math.random() < .5) G.particles.push({ x: G.px, y: G.py - 20, vx: (Math.random() - .5) * 60, vy: 80, life: .5, color: '#fff' });
    if (r.t >= 1) { G.py = GROUND; G.vy = 0; G.onGround = true; G.airJumps = 0; showFeedback(); }
  } else if (G.state !== 'fall') {
    const prevPy = G.py;
    G.vy += 2400 * dt; G.py += G.vy * dt;
    if (G.py < 100) { G.py = 100; if (G.vy < 0) G.vy = 0; }         // keep the runner's head on screen (top of a double jump from a platform)
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
    if (G.py > H + 90) { if (G.lives <= 0) gameOver(); else startRise(); }
  }
}

/* ===================== DRAWING ===================== */
function hash(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
function themeNow() { return THEMES[G.theme]; }

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
function bridgeVerts(p) {
  const b = p.bridge, x0 = p.e - G.cam, sc = b.len / b.P.lens[0];
  return b.P.pts.map(([x, y]) => [x0 + x * sc, GROUND - y * sc]);
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
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // deck planks
  if (dl > 1) {
    ctx.fillStyle = '#8a4b2a'; ctx.fillRect(x0, GROUND - 2, dl, 12);
    ctx.strokeStyle = '#5c2f18'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let x = x0; x < x0 + dl; x += 14) { ctx.moveTo(x, GROUND - 2); ctx.lineTo(x, GROUND + 10); } ctx.stroke();
  }
  // beam order: base first, the keystone (unknown side) always LAST
  const ord = []; for (let i = 1; i < n; i++) if (i !== ti) ord.push(i); if (ti > 0) ord.push(ti);
  const seg = (i, f, w, col) => {
    const a = V[i], c = V[(i + 1) % n];
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f); ctx.stroke();
  };
  const pulse = .5 + .5 * Math.sin(G.t * 6);
  if (done) {                                             // tint + bracing once the frame is complete
    ctx.fillStyle = b.ok ? 'rgba(255,190,80,.16)' : 'rgba(255,80,80,.14)';
    ctx.beginPath(); V.forEach((v, i) => i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(217,115,26,.75)'; ctx.lineWidth = 2.5; ctx.beginPath();
    if (sh.brace) sh.brace.forEach(([i, j]) => { ctx.moveTo(V[i][0], V[i][1]); ctx.lineTo(V[j][0], V[j][1]); });
    else if (n === 3) { ctx.moveTo(V[2][0], V[2][1]); ctx.lineTo(V[2][0], GROUND); }
    else if (n === 4) { ctx.moveTo(V[0][0], V[0][1]); ctx.lineTo(V[2][0], V[2][1]); ctx.moveTo(V[1][0], V[1][1]); ctx.lineTo(V[3][0], V[3][1]); }
    else for (let i = 2; i < n - 1; i++) { ctx.moveTo(V[0][0], V[0][1]); ctx.lineTo(V[i][0], V[i][1]); }   // fan bracing for pentagons / L-shapes
    ctx.stroke();
  }
  seg(0, deckP, 7, COLORS[P.cmap[0]]);
  ord.forEach((i, k) => {
    const f = clamp(beamP * ord.length - k, 0, 1); if (f <= 0) return;
    if (i === ti) { ctx.save(); ctx.shadowColor = b.ok ? '#ffd23f' : '#ff5d5d'; ctx.shadowBlur = 14 + 10 * pulse; seg(i, f, 15, b.ok ? 'rgba(255,210,63,.75)' : 'rgba(255,93,93,.75)'); ctx.restore(); seg(i, f, 8, b.ok ? COLORS[P.cmap[i]] : '#ff5d5d'); }
    else seg(i, f, 7, COLORS[P.cmap[i]]);
  });
  if (ti === 0 && deckP >= 1) { ctx.save(); ctx.shadowColor = b.ok ? '#ffd23f' : '#ff5d5d'; ctx.shadowBlur = 14 + 10 * pulse; seg(0, 1, 13, b.ok ? 'rgba(255,210,63,.7)' : 'rgba(255,93,93,.7)'); ctx.restore(); seg(0, 1, 8, b.ok ? COLORS[P.cmap[0]] : '#ff5d5d'); }
  // joints
  if (done) { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#5c2f18'; ctx.lineWidth = 2; V.forEach(v => { ctx.beginPath(); ctx.arc(v[0], v[1], 5, 0, 7); ctx.fill(); ctx.stroke(); }); }
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
      if (i === 0) { nx = 0; ny = 1; l = 1; my = GROUND + 6; }      // base label goes below the deck
      haloText(txt, mx + nx / l * 26, my + ny / l * (i === 0 ? 20 : 26), col, size);
    };
    if (b.val !== null && b.val !== undefined) {              // the built beam's real length (or the scale you chose for level 1)
      const txt = P.type === 'scale' ? '×' + b.val : fmt(P.lensB[ti] * b.ratio) + ' ft';
      label(ti >= 0 ? ti : 0, (b.ok ? '⭐ ' : '❌ ') + txt, b.ok ? '#b58100' : '#d33', 20);
    }
  }
}

function drawObstacle(c, x) {
  const G0 = GROUND, ol = '#3b2a1a';
  ctx.save(); if (c.hit) ctx.globalAlpha = .4;
  ctx.lineWidth = 3; ctx.strokeStyle = ol; ctx.lineJoin = 'round';
  const rr = (a, b, w, h, r, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(a, b, w, h, r); ctx.fill(); ctx.stroke(); };
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
      ctx.fillStyle = '#222'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', x + 19, G0 - 22); break;
    case 'vulture': case 'parrot': {
      const y = flyY(c), fl = Math.sin(G.t * 12 + c.x) * 14, col = c.type === 'vulture' ? '#3a2a2a' : '#e2334a';
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, 17, 10, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 6, y - 4); ctx.lineTo(x - 26, y - 6 - fl); ctx.lineTo(x - 2, y + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x + 22, y - 6 - fl); ctx.lineTo(x + 8, y + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffc93c'; ctx.beginPath(); ctx.moveTo(x - 15, y - 2); ctx.lineTo(x - 26, y + 3); ctx.lineTo(x - 15, y + 5); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 9, y - 3, 2.5, 0, 7); ctx.fill(); break; }
    case 'drone': {
      const y = flyY(c);
      rr(x - 16, y - 8, 32, 16, 6, '#4b5578'); ctx.fillStyle = Math.sin(G.t * 10) > 0 ? '#ff4d4d' : '#701'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#cfd6ff'; ctx.lineWidth = 3; const r = Math.abs(Math.sin(G.t * 30)) * 10 + 8;
      ctx.beginPath(); ctx.moveTo(x - 16 - r / 2, y - 12); ctx.lineTo(x - 16 + r / 2, y - 12); ctx.moveTo(x + 16 - r / 2, y - 12); ctx.lineTo(x + 16 + r / 2, y - 12); ctx.stroke(); break; }
  }
  ctx.restore();
}

function drawWorld(T) {
  for (let i = 0; i < G.platforms.length; i++) {
    const p = G.platforms[i], sx = p.s - G.cam, ex = p.e - G.cam;
    if (ex < -50 && !(p.bridge)) continue; if (sx > W + 50) continue;
    // chasm
    if (p.gapW) {
      const gx = ex, gw = p.gapW; const g = ctx.createLinearGradient(0, GROUND, 0, H);
      g.addColorStop(0, T.city ? '#1a1030' : '#3b2a55'); g.addColorStop(1, '#0d0a1c');
      ctx.fillStyle = g; ctx.fillRect(gx, GROUND, gw, H - GROUND);
    }
    const x = Math.max(-10, sx), w = Math.min(W + 10, ex) - x;
    if (w > 0) {
      ctx.fillStyle = T.body; ctx.fillRect(x, GROUND, w, H - GROUND);
      ctx.fillStyle = 'rgba(0,0,0,.14)';
      for (let yy = GROUND + 34; yy < H; yy += 34) ctx.fillRect(x, yy, w, 4);
      ctx.fillStyle = T.top; ctx.fillRect(x, GROUND, w, 14);
      if (T.city) { ctx.fillStyle = '#f5d23a'; for (let xx = Math.floor((x + G.cam) / 60) * 60 - G.cam; xx < x + w; xx += 60) ctx.fillRect(xx, GROUND + 5, 30, 3); }
    }
    // gap warning sign
    if (!p.bridged && p.gapW && ex > -20 && ex < W + 20) {
      ctx.fillStyle = '#5a3a1e'; ctx.fillRect(ex - 24, GROUND - 60, 5, 60);
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(ex - 21, GROUND - 100); ctx.lineTo(ex - 2, GROUND - 62); ctx.lineTo(ex - 40, GROUND - 62); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#222'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', ex - 21, GROUND - 68);
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
      const cx = c.x - G.cam; if (cx < -80 || cx > W + 80) continue;
      drawObstacle(c, cx);
    }
    drawBridge(p, T);
  }
}

function drawRunner() {
  const sk = SKINS[skinIdx], x = 240 + (G.px - G.cam - 240), fy = G.py;
  const running = (G.state === 'run' || G.state === 'cross' || G.state === 'menu') && G.onGround;
  const ph = G.t * (G.state === 'cross' ? 12 : 16) * (G.stumble > 0 ? .5 : 1);
  const air = !G.onGround;
  ctx.save(); ctx.translate(x, 0); ctx.lineCap = 'round';
  if (G.inv > 0 && Math.floor(G.t * 14) % 2) ctx.globalAlpha = .35;      // blink while invincible
  if (G.state === 'fall') ctx.translate(0, 0);
  // legs
  ctx.strokeStyle = sk.accent; ctx.lineWidth = 8;
  for (const s of [1, -1]) {
    const a = running ? Math.sin(ph) * s * .9 : (air ? s * .6 : s * .15);
    ctx.beginPath(); ctx.moveTo(0, fy - 26); ctx.lineTo(Math.sin(a) * 18, fy - 26 + Math.cos(a) * 24); ctx.stroke();
  }
  // body
  ctx.fillStyle = sk.body; ctx.beginPath(); ctx.roundRect(-13, fy - 62, 26, 38, 8); ctx.fill();
  // arms
  ctx.strokeStyle = sk.body; ctx.lineWidth = 6;
  for (const s of [1, -1]) {
    const a = running ? -Math.sin(ph) * s * .9 : (air ? -2.2 : .2);
    ctx.beginPath(); ctx.moveTo(0, fy - 54); ctx.lineTo(Math.sin(a) * 18, fy - 54 + Math.cos(a) * 18); ctx.stroke();
  }
  // head
  ctx.fillStyle = '#ffd9b0'; ctx.beginPath(); ctx.arc(0, fy - 74, 13, 0, 7); ctx.fill();
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(5, fy - 75, 2.2, 0, 7); ctx.fill();
  // hat
  ctx.fillStyle = sk.accent;
  if (sk.hat === 'cap') { ctx.beginPath(); ctx.arc(0, fy - 78, 13, Math.PI, 0); ctx.fill(); ctx.fillRect(2, fy - 80, 18, 5); }
  else if (sk.hat === 'hard') { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, fy - 79, 14, Math.PI, 0); ctx.fill(); ctx.fillRect(-16, fy - 80, 32, 5); }
  else if (sk.hat === 'band') { ctx.fillStyle = '#e04545'; ctx.fillRect(-13, fy - 81, 26, 6); ctx.fillRect(-20, fy - 80, 8, 3); }
  else if (sk.hat === 'crown') { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(-12, fy - 84); ctx.lineTo(-12, fy - 98); ctx.lineTo(-6, fy - 90); ctx.lineTo(0, fy - 100); ctx.lineTo(6, fy - 90); ctx.lineTo(12, fy - 98); ctx.lineTo(12, fy - 84); ctx.closePath(); ctx.fill(); }
  if (G.state === 'rise') {                                   // balloons carry the runner back up
    const cols = ['#ff5d73', '#ffd23f', '#4dd0e1'];
    cols.forEach((c, i) => {
      const bx = (i - 1) * 22 + Math.sin(G.t * 5 + i) * 4, by = fy - 165 + Math.abs(i - 1) * 10;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, fy - 62); ctx.lineTo(bx, by + 24); ctx.stroke();
      ctx.fillStyle = c; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(bx, by, 17, 22, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(bx - 6, by - 8, 4, 7, -.5, 0, 7); ctx.fill();
    });
  }
  ctx.restore();
  // shadow
  if (G.state !== 'fall' && support(G.px)) { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, GROUND + 4, Math.max(6, 18 - (GROUND - fy) * .05), 4, 0, 0, 7); ctx.fill(); }
}

function draw() {
  const T = themeNow();
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - .5) * 8, (Math.random() - .5) * 8);
  drawSky(T);
  drawHills(T, .18, T.far, 330, 130);
  drawHills(T, .4, T.near, 380, 110);
  drawWorld(T);
  drawRunner();
  for (const p of G.particles) { ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x - G.cam, p.y, 5, 5); }
  ctx.globalAlpha = 1;
  if (G.state === 'menu') { /* keep clean behind the menu card */ }
  if (G.tipT > 0 && G.state === 'run') {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.roundRect(W / 2 - 250, 110, 500, 40, 20); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Trebuchet MS, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SPACE / TAP to jump · again in the air = double jump!', W / 2, 137);
  }
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = 'bold 14px Trebuchet MS, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(T.name + ' · Level ' + G.level, W - 12, H - 10);
  ctx.restore();
}

/* ===================== LOOP & INPUT ===================== */
let last = performance.now();
let paused = false;                                        // the Menu button pauses everything (timer, runner, bridge)
function setPaused(v) {
  paused = v; $('pause').classList.toggle('hidden', !v);
  $('menuBtn').textContent = v ? '✕ Close' : '☰ Menu';
  last = performance.now();
}
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  try { if (!paused) update(dt); draw(); updateHUD(); }
  catch (e) { console.error('game frame error (kept running):', e); try { ctx.restore(); } catch (_) {} }   // never let one bad frame freeze the game
  requestAnimationFrame(frame);
}

function jump() { if (G && G.state === 'run' && !paused) G.jumpBuf = .12; }
addEventListener('keydown', e => {
  if (e.code === 'Escape') { e.preventDefault(); setPaused(!paused); return; }       // Esc = same as the Menu button
  if (paused) return;
  // Enter (main keyboard or numpad) jumps exactly like Space; while a question is showing, Enter still submits the answer
  const isJumpKey = ['Space', 'ArrowUp', 'KeyW', 'Enter', 'NumpadEnter'].includes(e.code) || e.key === 'Enter';
  if (isJumpKey && G && G.state === 'run') { e.preventDefault(); if (!e.repeat) jump(); }
  if ((e.code === 'Enter' || e.key === 'Enter') && G && G.state === 'solve') { e.preventDefault(); submit(); }
});
$('stage').addEventListener('pointerdown', e => { audioInit(); jump(); });
$('jumpBtn').addEventListener('pointerdown', e => { e.stopPropagation(); audioInit(); jump(); });
$('btnStart').onclick = startGame;
$('btnAgain').onclick = () => { buildMenu(); startGame(); };
$('btnBuild').onclick = () => submit();
$('btnNext').onclick = respawn;
$('btnHint').onclick = () => {
  if (!G || G.state !== 'solve' || G.hint) return;
  const P = G.problem; G.hint = true;
  const hints = P.level === 3 ? { up: 'scale factor = big ÷ small (use a pair you can see), then multiply', down: 'scale factor = big ÷ small (use a pair you can see), then divide' }
    : { scale: 'big ÷ small', up: 'small side × scale factor', down: 'big side ÷ scale factor' };
  $('hintBox').innerHTML = '💡 ' + (P.level === 4 ? 'Same ticks = same length. ' : '') + '<b>' + hints[P.type] + '</b>';
  $('hintBox').classList.remove('hidden'); $('btnHint').disabled = true;
};
const muteLabel = () => { $('muteBtn').textContent = muted ? '🔇 Sound off' : '🔊 Sound on'; };
$('muteBtn').onclick = () => { muted = !muted; store.set(KEY.muted, muted); muteLabel(); audioInit(); };
muteLabel();
$('menuBtn').onclick = () => setPaused(!paused);
$('btnResume').onclick = () => setPaused(false);
$('btnRestart').onclick = () => { setPaused(false); buildMenu(); startGame(); };
$('btnTitle').onclick = () => {                                              // back to the title screen
  setPaused(false); G = newWorld(true);
  ['problem', 'feedback', 'over'].forEach(id => $(id).classList.add('hidden'));
  buildMenu(); $('menu').classList.remove('hidden');
};
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
    <code>TYPE_BY_LEVEL</code>, <code>SPEED_BY_LEVEL</code>, <code>SPACING_BY_LEVEL</code>, <code>SHAPES_BY_LEVEL</code>, <code>K_BY_LEVEL</code>, <code>UNIT_BY_LEVEL</code>, <code>MAX_SMALL_SIDE</code>, <code>MAX_BIG_SIDE</code>, <code>TIME_BY_LEVEL</code> and <code>SOLVED_PER_LEVEL</code>.</div>`;
  const WHAT = {
    scale: '❓ Find the SCALE FACTOR between the two figures',
    up: '✖ Find a missing side of the BIGGER figure (multiply by the scale factor)',
    down: '➗ Find a missing side of the SMALLER figure (divide by the scale factor)'
  };
  const NOTE = [
    'Both figures show all their sides. Small numbers.',
    'Scale factor is given; the missing side is spotlighted. Mixes multiplying and dividing. Small numbers.',
    'No arrows and no scale factor shown: all sides of both shapes are given except the missing one, so you find the factor yourself. Big figure is always turned (90°, 180° or 270°) and sometimes flipped. Numbers are multiples of 5 or 10.',
    'Like level 3, but equal sides are only labeled once (tick marks show which are equal). Uses the shape name: square, rectangle, rhombus…'
  ];
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    const counts = {}; SHAPES_BY_LEVEL[lv - 1].forEach(s => counts[s] = (counts[s] || 0) + 1);
    const total = SHAPES_BY_LEVEL[lv - 1].length;
    const startAt = (lv - 1) * SOLVED_PER_LEVEL;
    h += `<div class="lvl"><h2>Level ${lv}</h2><div class="meta"><span>${lv === 1 ? 'Starts at the beginning' : `Reached after ${startAt} correct answers`}${lv === MAX_LEVEL ? ' (and stays here)' : ''}</span>` +
      `<span>⏱ ${TIME_BY_LEVEL[lv - 1]} s per question</span><span>🏃 runner speed ×${SPEED_BY_LEVEL[lv - 1]}</span>` +
      `<span>🪨 obstacles every ${SPACING_BY_LEVEL[lv - 1][0]}–${SPACING_BY_LEVEL[lv - 1][1]} px</span>${lv >= 3 ? '<span>🔄 figure rotated / flipped</span>' : ''}</div>` +
      `<div class="tags"><b>Question:</b> ` + TYPE_BY_LEVEL[lv - 1].map(t => `<span class="tag">${WHAT[t]}</span>`).join('') + `</div>` +
      `<div class="meta">${NOTE[lv - 1]}</div>` +
      `<div class="tags"><b>Shapes:</b> ` + Object.keys(counts).map(s => `<span class="tag">${SHAPES[s].name} · ${Math.round(counts[s] / total * 100)}%</span>`).join('') + `</div>` +
      `<div class="tags"><b>Scale factors:</b> ` + K_BY_LEVEL[lv - 1].map(k => `<span class="tag k">×${k}</span>`).join('') + ` <b>Side-length units:</b> ` + UNIT_BY_LEVEL[lv - 1].map(u => `<span class="tag k">×${u}</span>`).join('') + `</div>` +
      `<div class="samples">`;
    for (let i = 0; i < 4; i++) {
      const P = genProblem(lv);
      h += `<div class="s"><div class="pair"><div>${figSVG(P, 'model')}</div><div class="kb">×${P.type === 'scale' ? '?' : P.k}</div><div>${figSVG(P, 'bridge')}</div></div>` +
        `<div class="cap">${SHAPES[P.shape].bridge} · answer <b>${P.type === 'scale' ? '×' + P.answer : P.answer + ' ft'}</b> (${P.type === 'scale' ? 'scale factor' : P.type === 'up' ? 'multiply' : 'divide'})</div></div>`;
    }
    h += `</div></div>`;
  }
  root.innerHTML = h; document.body.appendChild(root);
}

// setup
if (/[?&]levels/.test(location.search)) { G = newWorld(true); buildLevelsPage(); } else {
G = newWorld(true);
buildMenu();
requestAnimationFrame(frame);
}

// small hook (used for automated checks and by the Reset Progress button to avoid re-saving)
window.BBR = { step(dt) { update(dt); draw(); updateHUD(); }, genProblem, get G() { return G; }, submit, startGame, solutionHTML, figSVG, fmt };
})();
