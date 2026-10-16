// Transformania - a head-to-head falling-blocks game where every piece is a transformation.
// Each board is a grid of square cells. A figure appears in the transform zone above the white dotted line; the player
// slides it to a starting spot and confirms, then performs the instruction (translate, rotate on tracing paper around a
// fixed red point, reflect across a vertical or horizontal line, or a sequence of these in order). Check compares every
// cell with the mathematically correct image. A correct image drops straight down, locks, and can complete rows.
// The first wrong check on a question adds an X (three lose; each completed row removes one) and every wrong check
// gives a stronger hint. Figures are lists of [x, y] cells (x across, y down); the drawing always follows the cells.
(function () {
  'use strict';
  var T = window.tl || function (en) { return en; };
  var say = function (m) { if (window.SiteSR) SiteSR.say(m); };
  var TOUCH = !!(window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches);
  var CALM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var $ = function (id) { return document.getElementById(id); };
  var app = $('tm');

  // ------------------------------------------------------------------ the board
  var W = 8, Z = 8, S = 14, H = Z + S;             // 8 columns; 8 rows of transform zone above the line, 14 below
  var COLORS = ['#5cc8ff', '#ff7ab0', '#ffcc33', '#4ee6a6', '#b38cff', '#ff9f43', '#7cf0ff', '#ff6b6b', '#c6f06b'];
  var GARBAGE = '#5a6189';

  // ------------------------------------------------------------------ figures (polyominoes)
  var SMALL = [
    [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [1, 1]],                                  // 3 squares
    [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]],                  // I, O
    [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [2, 0], [0, 1], [1, 1]],                  // T, S
    [[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [1, 1], [1, 2]],                  // L, an L turned
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1]]   // P, U
  ];
  var BIG = [
    [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]], [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],  // F, L5
    [[1, 0], [1, 1], [0, 2], [1, 2], [0, 3]], [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]],  // N, T5
    [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]],  // V, W
    [[1, 0], [0, 1], [1, 1], [1, 2], [1, 3]], [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]],  // Y, Z5
    [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]], [[0, 0], [0, 1], [1, 1], [2, 1], [2, 0], [3, 1]]  // two of 6 squares
  ];

  function norm(c) {
    var mx = Infinity, my = Infinity;
    c.forEach(function (p) { mx = Math.min(mx, p[0]); my = Math.min(my, p[1]); });
    return c.map(function (p) { return [p[0] - mx, p[1] - my]; });
  }
  function clone(c) { return c.map(function (p) { return [p[0], p[1]]; }); }
  function key(c) { return c.map(function (p) { return p[0] + ',' + p[1]; }).sort().join(';'); }
  function same(a, b) { return key(a) === key(b); }
  function box(c) {
    var b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    c.forEach(function (p) { b.x0 = Math.min(b.x0, p[0]); b.y0 = Math.min(b.y0, p[1]); b.x1 = Math.max(b.x1, p[0] + 1); b.y1 = Math.max(b.y1, p[1] + 1); });
    b.w = b.x1 - b.x0; b.h = b.y1 - b.y0; return b;
  }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ------------------------------------------------------------------ the transformations, on cells
  // (a cell [x, y] is the unit square from (x, y) to (x+1, y+1); pivots and lines sit on grid lines)
  function translate(c, dx) { return c.map(function (p) { return [p[0] + dx, p[1]]; }); }
  function rotateAbout(c, px, py, turns) {          // turns: quarter-turns, + = clockwise (on screen, y points down)
    var k = ((turns % 4) + 4) % 4;
    return c.map(function (p) {
      var dx = p[0] + 0.5 - px, dy = p[1] + 0.5 - py;
      for (var i = 0; i < k; i++) { var t = dx; dx = -dy; dy = t; }
      return [Math.round(px + dx - 0.5), Math.round(py + dy - 0.5)];
    });
  }
  function reflectV(c, a) { return c.map(function (p) { return [2 * a - p[0] - 1, p[1]]; }); }   // across x = a
  function reflectH(c, b) { return c.map(function (p) { return [p[0], 2 * b - p[1] - 1]; }); }   // across y = b
  function apply(st, c) {
    if (st.type === 'T') return translate(c, st.dx);
    if (st.type === 'R') return rotateAbout(c, st.px, st.py, st.turns);
    return st.axis === 'v' ? reflectV(c, st.a) : reflectH(c, st.b);
  }
  function inZone(c) { return c.every(function (p) { return p[0] >= 0 && p[0] < W && p[1] >= 0 && p[1] < Z; }); }

  // ------------------------------------------------------------------ making instructions that fit the zone
  function genT(c, maxN) {
    var opts = [];
    for (var n = 1; n <= maxN; n++) [-1, 1].forEach(function (s) { if (inZone(translate(c, s * n))) opts.push(s * n); });
    return opts.length ? { type: 'T', dx: pick(opts) } : null;
  }
  function pivots(c) {
    var seen = {}, out = [];
    c.forEach(function (p) { [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (d) {
      var k = (p[0] + d[0]) + ',' + (p[1] + d[1]); if (!seen[k]) { seen[k] = 1; out.push([p[0] + d[0], p[1] + d[1]]); } }); });
    return out;
  }
  function genR(c, turnList) {
    var ts = shuffle(turnList);
    for (var i = 0; i < ts.length; i++) {
      var ps = shuffle(pivots(c));
      for (var j = 0; j < ps.length; j++) {
        var st = { type: 'R', turns: ts[i], px: ps[j][0], py: ps[j][1] };
        var img = apply(st, c);
        // a whole-turn-free answer that lands on the start (an O spun about its center) would teach nothing
        if (inZone(img) && (Math.abs(ts[i]) === 4 || !same(img, c))) return st;
      }
    }
    return null;
  }
  function lineSpots(lo, hi, limit) {             // where a line can go beside a figure spanning [lo, hi), so its image fits
    var out = [];
    [0, 1].forEach(function (g) {
      var a = lo - g; if (a >= 0 && 2 * a - hi >= 0) out.push(a);           // a line before the figure: the image lands before it
      var b = hi + g; if (b <= limit && 2 * b - lo <= limit) out.push(b);   // a line after it: the image lands after it
    });
    return out;
  }
  function genF(c, onlyAxis) {
    var b = box(c), axes = onlyAxis ? [onlyAxis] : shuffle(['v', 'h']);
    for (var i = 0; i < axes.length; i++) {
      var ax = axes[i];
      var vs = shuffle(lineSpots(b.x0, b.x1, W)), hs = shuffle(lineSpots(b.y0, b.y1, Z));
      var good = ax === 'v' ? vs : hs;
      for (var j = 0; j < good.length; j++) {
        var st = { type: 'F', axis: ax };
        if (ax === 'v') { st.a = good[j]; st.b = hs.length ? hs[0] : (b.y1 <= Z - 1 ? b.y1 : b.y0); }
        else { st.b = good[j]; st.a = vs.length ? vs[0] : (b.x1 <= W - 1 ? b.x1 : b.x0); }
        if (inZone(apply(st, c))) return st;
      }
    }
    return null;
  }
  function genStep(type, c, hard) {
    if (type === 'T') return genT(c, 4);
    if (type === 'R') return genR(c, hard ? [1, -1, 2, -2, 3, -3, 4, -4] : [1, -1, 2, -2]);
    return genF(c);
  }
  function makeQuestion(c, hard) {
    if (!hard) {
      var order = shuffle(['T', 'R', 'F']);
      for (var i = 0; i < order.length; i++) { var s = genStep(order[i], c, false); if (s) return [s]; }
      return [genT(c, 9) || { type: 'T', dx: 0 }];
    }
    var r = Math.random();
    if (r < 0.25) { var s1 = genStep('R', c, true); if (s1) return [s1]; }
    if (r < 0.35) { var s2 = genStep(pick(['T', 'F']), c, true); if (s2) return [s2]; }
    for (var tries = 0; tries < 40; tries++) {
      var len = Math.random() < 0.7 ? 2 : 3, steps = [], cur = c, prev = null, ok = true;
      for (var k = 0; k < len; k++) {
        var types = shuffle(['T', 'R', 'F'].filter(function (t) { return t !== prev; })), st = null;
        for (var m = 0; m < types.length && !st; m++) st = genStep(types[m], cur, true);
        if (!st) { ok = false; break; }
        steps.push(st); cur = apply(st, cur); prev = st.type;
      }
      if (ok) return steps;
    }
    return makeQuestion(c, false);
  }

  // ------------------------------------------------------------------ words
  function units(n) { return n === 1 ? T('1 unit', '1 unidad') : n + T(' units', ' unidades'); }
  function turnsWord(n) { n = Math.abs(n); return n === 1 ? T('1 turn', '1 vuelta') : n + T(' turns', ' vueltas'); }
  function dirWord(cw) { return cw ? T('clockwise', 'en sentido horario') : T('counterclockwise', 'en sentido antihorario'); }
  function stepText(st) {
    if (st.type === 'T') return T('Translate ', 'Traslada ') + units(Math.abs(st.dx)) + (st.dx > 0 ? T(' right', ' a la derecha') : T(' left', ' a la izquierda')) + '.';
    if (st.type === 'R') return T('Rotate ', 'Rota ') + Math.abs(st.turns) * 90 + '° ' + dirWord(st.turns > 0) + T(' around the red point.', ' alrededor del punto rojo.');
    return st.axis === 'v' ? T('Reflect across the vertical line.', 'Refleja sobre la línea vertical.') : T('Reflect across the horizontal line.', 'Refleja sobre la línea horizontal.');
  }
  function shortText(st) {
    if (st.type === 'T') return T('Translate ', 'Traslada ') + units(Math.abs(st.dx)) + (st.dx > 0 ? T(' right', ' a la der.') : T(' left', ' a la izq.'));
    if (st.type === 'R') return T('Rotate ', 'Rota ') + Math.abs(st.turns) * 90 + '° ' + (st.turns > 0 ? T('CW', 'horario') : T('CCW', 'antihorario'));
    return st.axis === 'v' ? T('Reflect: vertical line', 'Refleja: línea vertical') : T('Reflect: horizontal line', 'Refleja: línea horizontal');
  }
  function goodText(st) {
    if (st.type === 'T') return T('Correct! The figure was translated ', '¡Correcto! La figura se trasladó ') + units(Math.abs(st.dx)) + (st.dx > 0 ? T(' right.', ' a la derecha.') : T(' left.', ' a la izquierda.'));
    if (st.type === 'R') { var n = Math.abs(st.turns); return T('Correct! ', '¡Correcto! ') + n * 90 + '° = ' + (n === 1 ? T('one 90° turn', 'una vuelta de 90°') : n + T(' turns of 90°', ' vueltas de 90°')) + ' ' + dirWord(st.turns > 0) + '.'; }
    return T('Correct! Every square is the same distance from the ', '¡Correcto! Cada cuadrado está a la misma distancia de la línea ') + (st.axis === 'v' ? T('vertical', 'vertical') : T('horizontal', 'horizontal')) + T(' line, on the other side.', ', del otro lado.');
  }
  function hintText(st, level) {
    var L = Math.min(level, 4);
    if (st.type === 'T') {
      var n = Math.abs(st.dx), right = st.dx > 0, d = right ? T('right', 'la derecha') : T('left', 'la izquierda');
      return [T('Count grid units: each square is 1 unit. A translation slides the figure without turning it.', 'Cuenta unidades de la cuadrícula: cada cuadrado mide 1 unidad. Una traslación desliza la figura sin girarla.'),
        T('Slide toward the ', 'Desliza hacia ') + d + T(' side of the board, and compare with the faint ghost.', ' del tablero y compara con la figura tenue.'),
        T('Pick one square of the ghost and count ', 'Elige un cuadrado de la figura tenue y cuenta ') + units(n) + T(' to the ', ' hacia ') + d + T('. The same square must end up there.', '. Ese mismo cuadrado debe quedar ahí.'),
        T('The dotted yellow outline shows where the image goes.', 'El contorno amarillo punteado muestra dónde va la imagen.')][L - 1];
    }
    if (st.type === 'R') {
      var k = Math.abs(st.turns), cw = st.turns > 0;
      return [T('Each turn of the paper is 90°, a quarter-turn. ', 'Cada vuelta del papel es de 90°, un cuarto de vuelta. ') + k * 90 + '° = ' + turnsWord(k) + '.',
        T('Keep the red point fixed: the whole tracing paper turns around it. Start over and count the turns.', 'El punto rojo no se mueve: todo el papel de calcar gira alrededor de él. Empieza de nuevo y cuenta las vueltas.'),
        cw ? T('Clockwise is the way a clock&rsquo;s hands move: the arrow on the paper goes from pointing up to pointing right.', 'Horario es como giran las manecillas del reloj: la flecha del papel pasa de apuntar arriba a apuntar a la derecha.')
           : T('Counterclockwise is opposite to a clock&rsquo;s hands: the arrow on the paper goes from pointing up to pointing left.', 'Antihorario es al revés de las manecillas del reloj: la flecha del papel pasa de apuntar arriba a apuntar a la izquierda.'),
        T('The dotted yellow outline shows where the image goes. Turn ', 'El contorno amarillo punteado muestra dónde va la imagen. Gira ') + turnsWord(k) + ' ' + dirWord(cw) + '.'][L - 1];
    }
    var v = st.axis === 'v';
    return [T('In a reflection, every square lands the same distance from the line, on the other side.', 'En una reflexión, cada cuadrado queda a la misma distancia de la línea, del otro lado.'),
      T('A vertical line goes up and down: flip across it with ◀ ▶. A horizontal line goes side to side: flip across it with ▲ ▼.', 'Una línea vertical va de arriba abajo: refleja sobre ella con ◀ ▶. Una línea horizontal va de lado a lado: refleja con ▲ ▼.'),
      v ? T('Use the pink vertical line. Its mirror image goes on its other side, flipped left to right.', 'Usa la línea vertical rosa. La imagen va del otro lado, volteada de izquierda a derecha.')
        : T('Use the green horizontal line. Its mirror image goes on its other side, flipped top to bottom.', 'Usa la línea horizontal verde. La imagen va del otro lado, volteada de arriba abajo.'),
      T('The dotted yellow outline shows where the image goes.', 'El contorno amarillo punteado muestra dónde va la imagen.')][L - 1];
  }
  function skillOf(steps) { return steps.length > 1 ? 'seq' : steps[0].type; }

  // ------------------------------------------------------------------ sounds (made here, not recorded)
  var AC = null, muted = false;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
  function tone(f, dur, type, vol, f2, delay) {
    var a = ac(); if (!a || muted) return;
    var t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  var SFX = {
    move: function () { tone(520, 0.05, 'square', 0.05); },
    turn: function () { tone(330, 0.22, 'triangle', 0.1, 660); tone(990, 0.06, 'sine', 0.05, null, 0.2); },
    flip: function () { tone(700, 0.08, 'triangle', 0.09); tone(460, 0.12, 'triangle', 0.09, null, 0.07); },
    start: function () { tone(440, 0.08, 'square', 0.06); tone(660, 0.1, 'square', 0.06, null, 0.07); },
    good: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.12, 'triangle', 0.1, null, i * 0.06); }); },
    bad: function () { tone(160, 0.28, 'sawtooth', 0.09, 110); },
    lock: function () { tone(120, 0.12, 'sine', 0.18, 70); },
    clear: function () { [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, 0.16, 'sine', 0.1, null, i * 0.05); }); },
    rise: function () { tone(90, 0.4, 'sawtooth', 0.08, 60); },
    win: function () { [523, 659, 784, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.12, null, i * 0.12); }); },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.25, 'triangle', 0.11, null, i * 0.16); }); }
  };
  function sfx(n) { if (SFX[n]) SFX[n](); }

  // ------------------------------------------------------------------ game state
  var mode = 'cpu', level = 'normal', players = [], running = false, paused = false, over = false, overAt = 0;
  var RISE_MS = { normal: 60000, hard: 45000 };
  if (window.SiteResults) SiteResults.setup([
    { id: 'T', en: 'Translations', es: 'Traslaciones' }, { id: 'R', en: 'Rotations', es: 'Rotaciones' },
    { id: 'F', en: 'Reflections', es: 'Reflexiones' }, { id: 'seq', en: 'Sequences of transformations', es: 'Secuencias de transformaciones' }]);

  function newShape(p) {
    var bigOK = level === 'hard' || p.pieces >= 10;
    var pool = bigOK && Math.random() < (level === 'hard' ? 0.6 : 0.35) ? BIG : SMALL;
    if (level !== 'hard' && p.pieces < 6) pool = SMALL.filter(function (s) { return s.length <= 4; });   // Normal starts with small figures
    var c = clone(pick(pool));
    var k = rnd(4); for (var i = 0; i < k; i++) c = c.map(function (q) { return [-q[1], q[0]]; });
    if (Math.random() < 0.5) c = c.map(function (q) { return [-q[0], q[1]]; });
    return { cells: norm(c), color: pick(COLORS) };
  }

  function makePlayer(idx, kind) {
    var p = { idx: idx, kind: kind, name: kind === 'cpu' ? T('Computer', 'Computadora') : (mode === 'pvp' ? (idx === 0 ? T('Player 1', 'Jugador 1') : T('Player 2', 'Jugador 2')) : T('You', 'Tú')),
      board: [], phase: 'idle', xs: 0, rows: 0, pieces: 0, solved: 0, firstTry: 0, rise: RISE_MS[level], incoming: 0,
      rot: { angle: 0, target: 0, drag: false, last: 0 }, ai: { queue: [], wait: 0, plan: '' }, dead: '' };
    for (var y = 0; y < H; y++) { var row = []; for (var x = 0; x < W; x++) row.push(null); p.board.push(row); }
    p.next = newShape(p);
    buildUI(p);
    return p;
  }

  // ------------------------------------------------------------------ the page for each player
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function buildUI(p) {
    var col = el('div', 'pl ' + (p.kind === 'cpu' ? 'cpu' : (p.idx === 0 ? 'p1' : 'p2')));
    var wrap = el('div', 'board-wrap'), cv = el('canvas');
    cv.tabIndex = 0; cv.setAttribute('role', 'img');
    wrap.appendChild(cv); p.banner = el('div', 'banner'); wrap.appendChild(p.banner);
    var panel = el('div', 'panel');
    var who = el('div', 'who'); p.nameEl = el('b', '', p.name); p.xsEl = el('div', 'xs');
    p.xsEl.setAttribute('aria-label', T('Xs', 'X'));
    for (var i = 0; i < 3; i++) p.xsEl.appendChild(el('i', '', '✕'));
    who.appendChild(p.nameEl); who.appendChild(p.xsEl); panel.appendChild(who);
    p.statsEl = el('div', 'stats'); panel.appendChild(p.statsEl);
    var rise = el('div', 'rise'); p.riseBar = el('i'); rise.appendChild(p.riseBar); panel.appendChild(rise);
    p.riseLbl = el('div', 'rise-lbl'); panel.appendChild(p.riseLbl);
    var next = el('div', 'next', T('NEXT', 'SIGUE')); p.nextCv = el('canvas'); p.nextCv.width = 84; p.nextCv.height = 56; p.nextCv.style.width = '84px'; p.nextCv.style.height = '56px';
    next.appendChild(p.nextCv); panel.appendChild(next);
    p.askEl = el('div', 'ask'); p.askEl.setAttribute('aria-live', 'off'); panel.appendChild(p.askEl);
    p.msgEl = el('div', 'msg'); panel.appendChild(p.msgEl);
    if (p.kind !== 'cpu') {
      var pad = el('div', 'pad'); p.btn = {};
      [['left', '◀', T('Move or flip left', 'Mover o reflejar a la izquierda')], ['right', '▶', T('Move or flip right', 'Mover o reflejar a la derecha')],
       ['up', '▲', T('Flip up', 'Reflejar hacia arriba')], ['down', '▼', T('Flip down', 'Reflejar hacia abajo')],
       ['ccw', '⟲', T('Turn the paper 90 degrees counterclockwise', 'Girar el papel 90 grados en sentido antihorario')], ['cw', '⟳', T('Turn the paper 90 degrees clockwise', 'Girar el papel 90 grados en sentido horario')],
       ['reset', T('↺ Start over', '↺ Empezar otra vez'), T('Start this step over', 'Empezar este paso otra vez')], ['ok', '', '']].forEach(function (b) {
        var bt = el('button', b[0] === 'reset' ? 'wide' : (b[0] === 'ok' ? 'ok' : ''), b[1]); bt.type = 'button';
        if (b[2]) bt.setAttribute('aria-label', b[2]);
        bt.addEventListener('click', function () { act(p, b[0]); });
        pad.appendChild(bt); p.btn[b[0]] = bt;
      });
      panel.appendChild(pad);
      if (!TOUCH) {
        var h = mode === 'pvp' ? (p.idx === 0 ? T('<kbd>A</kbd> <kbd>D</kbd> move · <kbd>W</kbd> <kbd>S</kbd> flip · <kbd>Q</kbd> <kbd>E</kbd> turn · <kbd>Space</kbd> confirm / check · <kbd>R</kbd> start over',
                                                     '<kbd>A</kbd> <kbd>D</kbd> mover · <kbd>W</kbd> <kbd>S</kbd> reflejar · <kbd>Q</kbd> <kbd>E</kbd> girar · <kbd>Espacio</kbd> confirmar / comprobar · <kbd>R</kbd> otra vez')
                                                : T('<kbd>←</kbd> <kbd>→</kbd> move · <kbd>↑</kbd> <kbd>↓</kbd> flip · <kbd>&lt;</kbd> <kbd>&gt;</kbd> turn · <kbd>Enter</kbd> confirm / check · <kbd>Backspace</kbd> start over',
                                                    '<kbd>←</kbd> <kbd>→</kbd> mover · <kbd>↑</kbd> <kbd>↓</kbd> reflejar · <kbd>&lt;</kbd> <kbd>&gt;</kbd> girar · <kbd>Enter</kbd> confirmar / comprobar · <kbd>Retroceso</kbd> otra vez'))
          : T('<kbd>←</kbd> <kbd>→</kbd> move · <kbd>↑</kbd> <kbd>↓</kbd> flip · <kbd>Q</kbd> <kbd>E</kbd> turn (or drag the paper&rsquo;s handle) · <kbd>Space</kbd> confirm / check · <kbd>R</kbd> start over · <kbd>Esc</kbd> menu',
              '<kbd>←</kbd> <kbd>→</kbd> mover · <kbd>↑</kbd> <kbd>↓</kbd> reflejar · <kbd>Q</kbd> <kbd>E</kbd> girar (o arrastra el asa del papel) · <kbd>Espacio</kbd> confirmar / comprobar · <kbd>R</kbd> otra vez · <kbd>Esc</kbd> menú');
        panel.appendChild(el('div', 'help', h));
      }
    }
    // boards meet in the middle: the left player's panel sits on its left, the right player's on its right
    if (p.idx === 0) { col.appendChild(panel); col.appendChild(wrap); } else { col.appendChild(wrap); col.appendChild(panel); }
    p.col = col; p.cv = cv; p.ctx = cv.getContext('2d');
    if (p.kind !== 'cpu') {
      cv.addEventListener('pointerdown', function (e) { pointerDown(p, e); });
      cv.addEventListener('pointermove', function (e) { pointerMove(p, e); });
      cv.addEventListener('pointerup', function (e) { pointerUp(p, e); });
      cv.addEventListener('pointercancel', function (e) { pointerUp(p, e); });
    }
  }

  // ------------------------------------------------------------------ sizes: the boards as big as fit, nothing scrolls
  var cell = 24, DPR = Math.min(2, window.devicePixelRatio || 1);
  function layout() {
    if (!players.length) return;
    var r = app.getBoundingClientRect(); if (!r.width) return;
    var panelW = 0; players.forEach(function (p) { panelW += p.col.querySelector('.panel').getBoundingClientRect().width; });
    var availW = (r.width - 24 - 14 - panelW - 16) / 2, availH = r.height - 20;
    cell = Math.max(8, Math.floor(Math.min(availW / W, availH / H)));
    players.forEach(function (p) {
      p.cv.width = W * cell * DPR; p.cv.height = H * cell * DPR;
      p.cv.style.width = W * cell + 'px'; p.cv.style.height = H * cell + 'px';
      p.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    });
  }
  window.addEventListener('resize', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(app);

  // ------------------------------------------------------------------ the turn: place, transform, drop, clear
  function spawn(p) {
    if (p.incoming > 0) { var n = p.incoming; p.incoming = 0; for (var i = 0; i < n && !p.dead; i++) riseRow(p, true); if (p.dead) return; }
    var sh = p.next; p.next = newShape(p);
    var b = box(sh.cells), x0 = Math.floor((W - b.w) / 2), y0 = Math.floor((Z - b.h) / 2);
    p.piece = { cells: translate(sh.cells.map(function (q) { return [q[0], q[1] + y0]; }), x0), color: sh.color };
    p.cur = clone(p.piece.cells);
    p.phase = 'place'; p.steps = null; p.si = 0; p.wrongQ = false; p.hint = 0; p.showTarget = false;
    p.rot.angle = p.rot.target = 0; p.ai.plan = '';
    setMsg(p, '', '');
    renderPanel(p);
    if (p.kind !== 'cpu') say(p.name + ': ' + T('a new figure of ', 'una figura nueva de ') + p.cur.length + T(' squares. Move it left or right, then confirm the start.', ' cuadrados. Muévela a la izquierda o la derecha y confirma el inicio.'));
  }
  // The instruction is made only after the start is confirmed. So that a good start is rewarded (and rows can be built),
  // the game makes twenty instructions that fit and picks one of the two whose image lands best on this board: every
  // player and the computer get the same treatment, and the transformation still has to be done exactly right.
  function rankedQuestions(p, c) {
    var list = [];
    for (var i = 0; i < 20; i++) {
      var q = makeQuestion(c, level === 'hard'), img = c;
      q.forEach(function (st) { img = apply(st, img); });
      list.push({ q: q, s: aiEval(p.board, landing(p, img)) });
    }
    return list.sort(function (a, b) { return b.s - a.s; }).slice(0, 2);
  }
  function confirmStart(p) {
    p.start = clone(p.cur);
    p.steps = pick(rankedQuestions(p, p.start)).q;
    p.si = 0; beginStep(p, p.start);
    sfx('start');
    renderPanel(p);
    if (p.kind !== 'cpu') say(p.name + ': ' + p.steps.map(function (s, i) { return (p.steps.length > 1 ? (i + 1) + '. ' : '') + stepText(s); }).join(' ') + ' ' + controlsWord(p.steps[0]));
  }
  function controlsWord(st) {
    if (TOUCH) return '';
    if (st.type === 'T') return T('Use left and right.', 'Usa izquierda y derecha.');
    if (st.type === 'R') return T('Turn the paper a quarter-turn at a time.', 'Gira el papel un cuarto de vuelta a la vez.');
    return T('Left and right flip across the vertical line; up and down across the horizontal line.', 'Izquierda y derecha reflejan sobre la línea vertical; arriba y abajo sobre la horizontal.');
  }
  function beginStep(p, from) {
    p.phase = 'xf'; p.stepStart = clone(from); p.cur = clone(from);
    p.rot.angle = p.rot.target = 0; p.rot.drag = false; p.hint = 0; p.showTarget = false; p.ai.plan = '';
  }
  function step(p) { return p.steps && p.steps[p.si]; }
  function rotIdle(p) { return Math.abs(p.rot.angle - p.rot.target) < 0.01 && !p.rot.drag; }
  function currentImage(p) {
    var st = step(p);
    if (st && st.type === 'R') return rotateAbout(p.stepStart, st.px, st.py, Math.round(p.rot.target / 90));
    return p.cur;
  }
  function check(p) {
    var st = step(p); if (!st) return;
    if (st.type === 'R' && !rotIdle(p)) return;
    var img = currentImage(p), want = apply(st, p.stepStart);
    var ok = same(img, want) && (st.type !== 'R' || Math.round(p.rot.target / 90) === st.turns);
    if (ok) {
      p.cur = want;
      if (p.si < p.steps.length - 1) {
        setMsg(p, 'good', T('Step ', 'Paso ') + (p.si + 1) + ' ✓ ' + goodText(st));
        sfx('flip'); p.si++; beginStep(p, want); renderPanel(p);
        if (p.kind !== 'cpu') say(T('Correct. Now step ', 'Correcto. Ahora el paso ') + (p.si + 1) + ': ' + stepText(step(p)));
        return;
      }
      p.solved++; if (!p.wrongQ) p.firstTry++;
      if (p.kind !== 'cpu' && window.SiteResults) SiteResults.record(skillOf(p.steps), !p.wrongQ);
      setMsg(p, 'good', goodText(st)); sfx('good');
      if (p.kind !== 'cpu') say(goodText(st));
      p.phase = 'drop'; p.dropT = 0; p.drop = clone(want); renderPanel(p);
      return;
    }
    p.hint++;
    if (!p.wrongQ) { p.wrongQ = true; p.xs++; flash(p, '✕', '#ff4d6a'); }
    if (p.hint >= 4) p.showTarget = true;
    var h = hintText(st, p.hint);
    setMsg(p, 'hint', (p.hint === 1 ? T('Not yet. ', 'Todavía no. ') : '') + h); sfx('bad');
    renderPanel(p);
    if (p.kind !== 'cpu') say(T('Not yet. ', 'Todavía no. ') + h.replace(/&rsquo;/g, "'") + ' ' + T('Xs: ', 'X: ') + p.xs);
    if (p.xs >= 3) kill(p, 'xs');
  }
  function fits(p, c) { return c.every(function (q) { return q[0] >= 0 && q[0] < W && q[1] < H && (q[1] < 0 || !p.board[q[1]][q[0]]); }); }
  function lock(p) {
    p.drop.forEach(function (q) { if (q[1] >= 0) p.board[q[1]][q[0]] = p.piece.color; });
    p.pieces++; sfx('lock');
    if (p.drop.some(function (q) { return q[1] < Z; })) { renderPanel(p); kill(p, 'top'); return; }
    var full = [];
    for (var y = Z; y < H; y++) if (p.board[y].every(function (v) { return v; })) full.push(y);
    p.drop = null;
    if (full.length) { p.phase = 'clear'; p.clearRows = full; p.clearT = 0; sfx('clear'); }
    else spawn(p);
    renderPanel(p);
  }
  function finishClear(p) {
    var rows = p.clearRows;
    rows.forEach(function (y) { p.board.splice(y, 1); var row = []; for (var x = 0; x < W; x++) row.push(null); p.board.splice(Z, 0, row); });
    p.rows += rows.length;
    var back = Math.min(p.xs, rows.length); p.xs -= back;
    flash(p, '+' + rows.length + (rows.length === 1 ? T(' row', ' fila') : T(' rows', ' filas')) + (back ? T('  ✕ removed', '  ✕ fuera') : ''), '#4ee6a6');
    if (p.kind !== 'cpu') say(rows.length + T(' row cleared. ', ' fila completa. ') + (back ? T('One X removed. ', 'Se quita una X. ') : '') + T('Xs: ', 'X: ') + p.xs);
    if (rows.length >= 2) { var o = other(p); if (o && !o.dead) { o.incoming += rows.length - 1; flash(o, T('▲ row incoming', '▲ llega una fila'), '#ff9f43'); } }
    p.clearRows = null;
    spawn(p); renderPanel(p);
  }
  function riseRow(p, fromOpponent) {
    for (var x = 0; x < W; x++) if (p.board[Z][x]) { p.board.shift(); p.board.push(garbageRow()); kill(p, 'top'); return; }
    p.board.shift(); p.board.push(garbageRow());
    sfx('rise'); if (!fromOpponent) flash(p, T('▲ The floor rises', '▲ Sube el piso'), '#ff9f43');
  }
  function garbageRow() { var hole = rnd(W), row = []; for (var x = 0; x < W; x++) row.push(x === hole ? null : GARBAGE); return row; }
  function other(p) { return players[1 - p.idx]; }
  function kill(p, why) {
    if (p.dead) return;
    p.dead = why; p.phase = 'dead'; renderPanel(p);
    flash(p, why === 'xs' ? T('✕ ✕ ✕  Out!', '✕ ✕ ✕  ¡Fuera!') : T('Topped out!', '¡Tablero lleno!'), '#ff4d6a');
    if (!over) { over = true; overAt = performance.now(); }
  }

  // ------------------------------------------------------------------ the controls (keys, buttons and the computer all come here)
  function act(p, a) {
    if (!running || paused || over || p.dead) return;
    ac();
    if (p.phase === 'place') {
      if (a === 'left' || a === 'right') { var c = translate(p.cur, a === 'left' ? -1 : 1); if (inZone(c)) { p.cur = c; sfx('move'); } }
      else if (a === 'ok') confirmStart(p);
      return;
    }
    if (p.phase !== 'xf') return;
    var st = step(p);
    if (a === 'ok') { check(p); return; }
    if (a === 'reset') { beginStep(p, p.stepStart); renderPanel(p); return; }
    if (st.type === 'T' && (a === 'left' || a === 'right')) {
      var t = translate(p.cur, a === 'left' ? -1 : 1);
      if (t.every(function (q) { return q[0] >= 0 && q[0] < W; })) { p.cur = t; sfx('move'); }
    } else if (st.type === 'F' && a !== 'cw' && a !== 'ccw') {
      var bx = box(p.cur), vert = a === 'left' || a === 'right', mid = vert ? (bx.x0 + bx.x1) / 2 : (bx.y0 + bx.y1) / 2, line = vert ? st.a : st.b;
      var toward = (a === 'left' || a === 'up') ? -1 : 1;
      if ((mid - line) * toward < 0) { p.cur = vert ? reflectV(p.cur, st.a) : reflectH(p.cur, st.b); sfx('flip'); }
    } else if (st.type === 'R' && (a === 'cw' || a === 'ccw')) {
      if (Math.abs(p.rot.target) < 1440) { p.rot.target += a === 'cw' ? 90 : -90; sfx('turn'); }
    }
  }

  // dragging the tracing paper's handle around the red point
  function boardXY(p, e) { var r = p.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / cell, y: (e.clientY - r.top) / cell }; }
  function angleAt(st, pt) { return Math.atan2(pt.x - st.px, -(pt.y - st.py)) * 180 / Math.PI; }   // 0 = up, + = clockwise
  function handlePos(p) {
    var st = step(p), r = paperHalf(p) * 0.92, a = p.rot.angle * Math.PI / 180;
    return { x: st.px + Math.sin(a) * r, y: st.py - Math.cos(a) * r };
  }
  function pointerDown(p, e) {
    ac();
    var st = step(p); if (!running || paused || over || p.phase !== 'xf' || !st || st.type !== 'R') return;
    var pt = boardXY(p, e), h = handlePos(p);
    if (Math.hypot(pt.x - h.x, pt.y - h.y) < 0.9 || Math.hypot(pt.x - st.px, pt.y - st.py) < paperHalf(p)) {
      p.rot.drag = true; p.rot.last = angleAt(st, pt); p.rot.angle = p.rot.target; p.cv.setPointerCapture(e.pointerId); e.preventDefault();
    }
  }
  function pointerMove(p, e) {
    if (!p.rot.drag) return;
    var st = step(p), a = angleAt(st, boardXY(p, e)), d = a - p.rot.last;
    while (d > 180) d -= 360; while (d < -180) d += 360;
    p.rot.last = a; p.rot.angle = Math.max(-1440, Math.min(1440, p.rot.angle + d));
    var snapped = Math.round(p.rot.angle / 90) * 90;
    if (snapped !== p.rot.target) { p.rot.target = snapped; sfx('move'); }
  }
  function pointerUp(p) {
    if (!p.rot.drag) return;
    p.rot.drag = false; p.rot.target = Math.round(p.rot.angle / 90) * 90; sfx('turn');
  }

  var KEYS1 = { a: 'left', d: 'right', w: 'up', s: 'down', q: 'ccw', e: 'cw', ' ': 'ok', r: 'reset' };
  var KEYS2 = { arrowleft: 'left', arrowright: 'right', arrowup: 'up', arrowdown: 'down', ',': 'ccw', '<': 'ccw', '.': 'cw', '>': 'cw', enter: 'ok', backspace: 'reset' };
  document.addEventListener('keydown', function (e) {
    if (window.isPageControlKey && window.isPageControlKey(e)) return;
    var k = e.key.toLowerCase();
    if (k === 'escape') { if (running && !over) { e.preventDefault(); togglePause(); } return; }
    if (!running || !players.length) return;
    var a1 = KEYS1[k], a2 = KEYS2[k], target = null, a = null;
    if (mode === 'pvp') { if (a1) { target = players[0]; a = a1; } else if (a2) { target = players[1]; a = a2; } }
    else if (a1 || a2) { target = players[0]; a = a1 || a2; }
    if (!target) return;
    if (e.target && e.target.tagName === 'BUTTON' && (k === ' ' || k === 'enter')) return;   // a focused on-screen button handles its own press
    e.preventDefault();
    if (e.repeat && (a === 'ok' || a === 'cw' || a === 'ccw')) return;
    act(target, a);
  });

  // ------------------------------------------------------------------ the computer: the same rules, and it never answers wrong
  function aiEval(board, c) {
    var b = board.map(function (r) { return r.slice(); });
    c.forEach(function (q) { if (q[1] >= 0) b[q[1]][q[0]] = 1; });
    var lines = 0, holes = 0, agg = 0, bump = 0, hs = [];
    for (var y = Z; y < H; y++) if (b[y].every(function (v) { return v; })) lines++;
    for (var x = 0; x < W; x++) {
      var top = H; for (var yy = 0; yy < H; yy++) if (b[yy][x]) { top = yy; break; }
      hs.push(H - top); agg += H - top;
      for (var y2 = top + 1; y2 < H; y2++) if (!b[y2][x]) holes++;
    }
    for (var i = 1; i < W; i++) bump += Math.abs(hs[i] - hs[i - 1]);
    var high = c.some(function (q) { return q[1] < Z; }) ? 1000 : 0;
    return lines * 8 - agg * 0.5 - holes * 3.5 - bump * 0.35 - high;
  }
  function landing(p, c) { var d = clone(c); while (fits(p, d.map(function (q) { return [q[0], q[1] + 1]; }))) d = d.map(function (q) { return [q[0], q[1] + 1]; }); return d; }
  function aiPlan(p) {
    var q = p.ai.queue = [], think = level === 'hard' ? 2200 : 3000, mv = level === 'hard' ? 260 : 340;   // about a student's pace
    if (p.phase === 'place') {
      // it can't know the instruction yet (it is made after the start is confirmed), so it scores each start by the
      // average result over a handful of instructions that could come, the way a careful player would think
      var b = box(p.cur), best = null, bestS = -Infinity;
      for (var x = 0; x + b.w <= W; x++) {
        var c = translate(p.cur, x - b.x0), top = rankedQuestions(p, c), tot = 0;
        top.forEach(function (t) { tot += t.s; });
        var s = tot / top.length + Math.random() * 1.5;
        if (s > bestS) { bestS = s; best = x; }
      }
      var dx = best - b.x0; q.push({ a: null, t: think * 0.6 });
      for (var i = 0; i < Math.abs(dx); i++) q.push({ a: dx > 0 ? 'right' : 'left', t: mv });
      q.push({ a: 'ok', t: 300 });
      p.ai.plan = 'place';
      return;
    }
    var st = step(p); q.push({ a: null, t: think });
    if (st.type === 'T') { for (var j = 0; j < Math.abs(st.dx); j++) q.push({ a: st.dx > 0 ? 'right' : 'left', t: mv }); }
    else if (st.type === 'R') { for (var k = 0; k < Math.abs(st.turns); k++) q.push({ a: st.turns > 0 ? 'cw' : 'ccw', t: 520 }); }
    else {
      var bb = box(p.cur);
      if (st.axis === 'v') q.push({ a: (bb.x0 + bb.x1) / 2 < st.a ? 'right' : 'left', t: mv });
      else q.push({ a: (bb.y0 + bb.y1) / 2 < st.b ? 'down' : 'up', t: mv });
    }
    q.push({ a: 'ok', t: 450 });
    p.ai.plan = 'xf' + p.si;
  }
  function aiTick(p, dt) {
    if (p.dead || (p.phase !== 'place' && p.phase !== 'xf')) { p.ai.queue = []; return; }
    var want = p.phase === 'place' ? 'place' : 'xf' + p.si;
    if (p.ai.plan !== want) { aiPlan(p); p.ai.wait = 0; }
    p.ai.wait -= dt;
    while (p.ai.wait <= 0 && p.ai.queue.length) {
      var n = p.ai.queue.shift(); p.ai.wait += n.t;
      if (n.a) {
        if (n.a === 'ok' && p.phase === 'xf' && !rotIdle(p)) { p.ai.queue.unshift(n); p.ai.wait = 120; return; }
        act(p, n.a); if (p.ai.plan !== want) return;
      }
    }
  }

  // ------------------------------------------------------------------ the loop
  var lastT = 0, panelT = 0;
  function frame(t) {
    var dt = Math.min(50, t - (lastT || t)); lastT = t;
    if (running && !paused) update(dt);
    players.forEach(draw);
    requestAnimationFrame(frame);
  }
  function update(dt) {
    players.forEach(function (p) {
      if (p.dead) return;
      // the paper turns smoothly toward the quarter-turn it is heading for, through every quarter-turn on the way
      if (!p.rot.drag && p.rot.angle !== p.rot.target) {
        var sp = (CALM ? 900 : 300) * dt / 1000, d = p.rot.target - p.rot.angle;
        p.rot.angle = Math.abs(d) <= sp ? p.rot.target : p.rot.angle + Math.sign(d) * sp;
      }
      if (p.phase === 'drop') {
        p.dropT += dt;
        while (p.dropT >= 28 && p.phase === 'drop') {
          p.dropT -= 28;
          var dn = p.drop.map(function (q) { return [q[0], q[1] + 1]; });
          if (fits(p, dn)) p.drop = dn; else lock(p);
        }
      } else if (p.phase === 'clear') {
        p.clearT += dt; if (p.clearT > 380) finishClear(p);
      }
      if (!over && (p.phase === 'place' || p.phase === 'xf')) {
        p.rise -= dt;
        if (p.rise <= 0) { p.rise = RISE_MS[level]; riseRow(p, false); }
      }
      if (p.kind === 'cpu' && !over) aiTick(p, dt);
    });
    panelT += dt;
    if (panelT > 250) { panelT = 0; players.forEach(renderRise); }
    if (over && performance.now() - overAt > 1400) showOver();   // a moment to see the board that went out, then the results
  }

  // ------------------------------------------------------------------ drawing a board
  function paperHalf(p) {
    var st = step(p), m = 0;
    p.stepStart.forEach(function (q) { [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (d) { m = Math.max(m, Math.hypot(q[0] + d[0] - st.px, q[1] + d[1] - st.py)); }); });
    return m + 0.55;
  }
  function blockAt(g, x, y, s, col, alpha) {
    g.globalAlpha = alpha == null ? 1 : alpha;
    g.fillStyle = col; g.fillRect(x + 1, y + 1, s - 2, s - 2);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 1, y + 1, s - 2, Math.max(2, s * 0.16));
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + 1, y + s - 1 - Math.max(2, s * 0.14), s - 2, Math.max(2, s * 0.14));
    g.globalAlpha = 1;
  }
  function outline(g, cells, color, dash, width, fill) {
    g.save(); g.setLineDash(dash || []); g.strokeStyle = color; g.lineWidth = width || 2;
    cells.forEach(function (q) {
      if (fill) { g.fillStyle = fill; g.fillRect(q[0] * cell, q[1] * cell, cell, cell); }
      g.strokeRect(q[0] * cell + 1.5, q[1] * cell + 1.5, cell - 3, cell - 3);
    });
    g.restore();
  }
  function arrow(g, x1, y1, x2, y2, col, w, head) {
    var a = Math.atan2(y2 - y1, x2 - x1);
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6); g.stroke();
    g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - Math.cos(a - 0.45) * head, y2 - Math.sin(a - 0.45) * head); g.lineTo(x2 - Math.cos(a + 0.45) * head, y2 - Math.sin(a + 0.45) * head); g.closePath(); g.fill();
  }
  function tag(g, txt, x, y, col, bg) {
    g.font = '800 ' + Math.max(10, Math.round(cell * 0.42)) + 'px Nunito, sans-serif';
    var w = g.measureText(txt).width + 10, h = Math.max(14, cell * 0.62);
    g.fillStyle = bg || 'rgba(0,0,0,0.75)'; roundRect(g, x - w / 2, y - h / 2, w, h, 6); g.fill();
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y + 0.5);
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  function draw(p) {
    var g = p.ctx, s = cell, BW = W * s, BH = H * s;
    g.clearRect(0, 0, BW, BH);
    // the stacking area and the transform zone above the dotted line
    g.fillStyle = '#0d1333'; g.fillRect(0, 0, BW, BH);
    g.fillStyle = 'rgba(92, 200, 255, 0.07)'; g.fillRect(0, 0, BW, Z * s);
    g.strokeStyle = 'rgba(140, 160, 255, 0.16)'; g.lineWidth = 1; g.beginPath();
    for (var x = 0; x <= W; x++) { g.moveTo(x * s + 0.5, 0); g.lineTo(x * s + 0.5, BH); }
    for (var y = 0; y <= H; y++) { g.moveTo(0, y * s + 0.5); g.lineTo(BW, y * s + 0.5); }
    g.stroke();
    g.font = '900 ' + Math.max(9, Math.round(s * 0.36)) + 'px Nunito, sans-serif'; g.fillStyle = 'rgba(180, 200, 255, 0.28)'; g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillText(T('TRANSFORM ZONE', 'ZONA DE TRANSFORMACIÓN'), BW / 2, 4);
    // locked blocks
    for (y = Z; y < H; y++) for (x = 0; x < W; x++) if (p.board[y][x]) {
      var flashRow = p.phase === 'clear' && p.clearRows.indexOf(y) >= 0;
      blockAt(g, x * s, y * s, s, flashRow ? (Math.floor(p.clearT / 70) % 2 ? '#ffffff' : p.board[y][x]) : p.board[y][x]);
    }
    // the white dotted line: the safety line, not a wall
    g.save(); g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(2, s * 0.12); g.setLineDash([s * 0.28, s * 0.22]);
    g.beginPath(); g.moveTo(0, Z * s); g.lineTo(BW, Z * s); g.stroke(); g.restore();

    var st = step(p);
    if (p.phase === 'place') {
      p.cur.forEach(function (q) { blockAt(g, q[0] * s, q[1] * s, s, p.piece.color); });
      var b = box(p.cur);
      arrow(g, b.x0 * s - 4, (b.y0 + b.h / 2) * s, b.x0 * s - s * 0.9, (b.y0 + b.h / 2) * s, 'rgba(255,255,255,0.55)', 3, 9);
      arrow(g, b.x1 * s + 4, (b.y0 + b.h / 2) * s, b.x1 * s + s * 0.9, (b.y0 + b.h / 2) * s, 'rgba(255,255,255,0.55)', 3, 9);
    } else if (p.phase === 'xf' && st) {
      // the ghost: the pre-image stays where it started
      outline(g, p.start, 'rgba(255,255,255,0.55)', [4, 3], 2, 'rgba(255,255,255,0.07)');
      if (p.si > 0) outline(g, p.stepStart, 'rgba(255,255,255,0.3)', [2, 4], 1.5);
      if (p.showTarget) outline(g, apply(st, p.stepStart), '#ffd84d', [5, 4], 2.5);
      if (st.type === 'F') drawLines(p, st);
      if (st.type === 'R') drawPaper(p, st);
      else p.cur.forEach(function (q) { blockAt(g, q[0] * s, q[1] * s, s, p.piece.color); });
    } else if (p.phase === 'drop' && p.drop) {
      p.drop.forEach(function (q) { blockAt(g, q[0] * s, q[1] * s, s, p.piece.color); });
    }
    if (p.dead) { g.fillStyle = 'rgba(5, 8, 22, 0.55)'; g.fillRect(0, 0, BW, BH); }
    if (paused) { g.fillStyle = 'rgba(5, 8, 22, 0.4)'; g.fillRect(0, 0, BW, BH); }
    drawNext(p);
  }
  function drawLines(p, st) {
    var g = p.ctx, s = cell;
    g.save(); g.lineWidth = Math.max(2, s * 0.12); g.setLineDash([s * 0.3, s * 0.18]);
    g.strokeStyle = '#ff7ab0'; g.beginPath(); g.moveTo(st.a * s, 0); g.lineTo(st.a * s, Z * s); g.stroke();
    g.strokeStyle = '#4ee6a6'; g.beginPath(); g.moveTo(0, st.b * s); g.lineTo(W * s, st.b * s); g.stroke();
    g.restore();
    // each line's label goes at the end farther from the figure, so it never covers a square
    var fb = box(p.cur), fx = (fb.x0 + fb.x1) / 2, fy = (fb.y0 + fb.y1) / 2;
    tag(g, T('vertical line', 'línea vertical'), Math.min(Math.max(st.a * s, s * 1.8), W * s - s * 1.8), fy < Z / 2 ? Z * s - s * 0.45 : s * 0.45, '#ff9cc4');
    tag(g, T('horizontal line', 'línea horizontal'), fx > W / 2 ? s * 1.9 : W * s - s * 1.9, st.b * s + (fy < st.b ? s * 0.45 : -s * 0.45), '#7dffc4');
  }
  function drawPaper(p, st) {
    var g = p.ctx, s = cell, cx = st.px * s, cy = st.py * s, hs = paperHalf(p) * s, ang = p.rot.angle * Math.PI / 180;
    // the tracing paper with the figure on it, turning around the red point
    g.save(); g.translate(cx, cy); g.rotate(ang);
    g.fillStyle = 'rgba(180, 210, 255, 0.17)'; g.strokeStyle = 'rgba(140, 185, 255, 0.85)'; g.lineWidth = 2;
    g.fillRect(-hs, -hs, hs * 2, hs * 2); g.strokeRect(-hs, -hs, hs * 2, hs * 2);
    g.translate(-cx, -cy);
    p.stepStart.forEach(function (q) { blockAt(g, q[0] * s, q[1] * s, s, p.piece.color, 0.95); });
    g.translate(cx, cy);
    // the red arrow printed on the paper: it starts pointing up and turns with the paper
    arrow(g, hs - s * 0.55, -hs + s * 1.55, hs - s * 0.55, -hs + s * 0.3, '#ff4d4d', Math.max(3, s * 0.13), Math.max(9, s * 0.42));
    g.restore();
    // yellow arms: where the paper started (up) and where it is now, with the arc between them
    var r = hs * 0.92, ex = cx + Math.sin(ang) * r, ey = cy - Math.cos(ang) * r;
    g.save(); g.strokeStyle = 'rgba(255, 210, 60, 0.55)'; g.lineWidth = 2; g.setLineDash([5, 4]);
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - r); g.stroke(); g.restore();
    g.strokeStyle = '#ffd23c'; g.lineWidth = Math.max(2, s * 0.1); g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex, ey); g.stroke();
    var sweep = ang, ra = Math.max(s * 1.1, Math.min(hs * 0.55, s * 2));
    if (Math.abs(sweep) > 0.01) {
      var shown = Math.max(-Math.PI * 2 + 0.05, Math.min(Math.PI * 2 - 0.05, sweep));
      g.strokeStyle = '#ffd23c'; g.lineWidth = Math.max(3, s * 0.14);
      g.beginPath(); g.arc(cx, cy, ra, -Math.PI / 2, -Math.PI / 2 + shown, shown < 0); g.stroke();
      var endA = -Math.PI / 2 + shown, tx = Math.cos(endA + (shown > 0 ? Math.PI / 2 : -Math.PI / 2)), ty = Math.sin(endA + (shown > 0 ? Math.PI / 2 : -Math.PI / 2));
      var axp = cx + Math.cos(endA) * ra, ayp = cy + Math.sin(endA) * ra;
      arrow(g, axp - tx * 2, ayp - ty * 2, axp + tx * s * 0.5, ayp + ty * s * 0.5, '#ffd23c', 3, Math.max(9, s * 0.45));
    }
    // the handle the student turns
    g.beginPath(); g.arc(ex, ey, Math.max(8, s * 0.42), 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
    g.lineWidth = 3; g.strokeStyle = '#ffd23c'; g.stroke();
    g.fillStyle = '#7a5a00'; g.font = '900 ' + Math.max(10, Math.round(s * 0.5)) + 'px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⟳', ex, ey + 1);
    // the fixed red pivot point
    g.beginPath(); g.arc(cx, cy, Math.max(5, s * 0.24), 0, Math.PI * 2); g.fillStyle = '#ff3b3b'; g.fill();
    g.beginPath(); g.arc(cx, cy, Math.max(2, s * 0.09), 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
    // how far it has turned: degrees, direction and the number of quarter-turns
    var turns = Math.round(p.rot.angle / 90), deg = Math.round(Math.abs(p.rot.angle));
    var lbl = deg === 0 ? T('0° · 0 turns', '0° · 0 vueltas') : deg + '° ' + (p.rot.angle > 0 ? T('CW', 'horario') : T('CCW', 'antihorario')) + ' · ' + turnsWord(turns);
    var ly = cy + hs + s * 0.55 > Z * s ? cy - hs - s * 0.5 : cy + hs + s * 0.55;
    tag(g, lbl, Math.min(Math.max(cx, s * 2.4), W * s - s * 2.4), Math.max(s * 0.5, ly), '#ffd84d');
  }
  function drawNext(p) {
    if (!p.nextCv || !p.next) return;
    var g = p.nextCv.getContext('2d'), b = box(p.next.cells), sz = Math.min(14, Math.floor(Math.min(80 / b.w, 52 / b.h)));
    g.clearRect(0, 0, 84, 56);
    var ox = (84 - b.w * sz) / 2, oy = (56 - b.h * sz) / 2;
    p.next.cells.forEach(function (q) { blockAt(g, ox + q[0] * sz, oy + q[1] * sz, sz, p.next.color); });
  }

  // ------------------------------------------------------------------ the panel beside each board
  function setMsg(p, kind, text) { p.msgKind = kind; p.msgText = text; }
  function renderPanel(p) {
    var xs = p.xsEl.children; for (var i = 0; i < 3; i++) xs[i].className = i < p.xs ? 'on' : '';
    p.xsEl.setAttribute('aria-label', T('Xs: ', 'X: ') + p.xs + T(' of 3', ' de 3'));
    p.statsEl.innerHTML = '<span>' + T('Rows', 'Filas') + ' <b>' + p.rows + '</b></span><span>' + T('Pieces', 'Piezas') + ' <b>' + p.pieces + '</b></span><span>' + T('First try', 'A la primera') + ' <b>' + p.firstTry + '</b></span>';
    var st = step(p), html;
    if (p.dead) html = '<div class="lbl">' + T('Game over', 'Fin') + '</div><div class="txt">' + (p.dead === 'xs' ? T('Three Xs.', 'Tres X.') : T('The stack crossed the dotted line.', 'La pila cruzó la línea punteada.')) + '</div>';
    else if (p.phase === 'place') html = '<div class="lbl">' + T('Choose the start', 'Elige el inicio') + '</div><div class="txt">' + T('Move the figure left or right, then confirm the start.', 'Mueve la figura a la izquierda o la derecha y confirma el inicio.') + '</div>';
    else if (p.steps && p.steps.length > 1) html = '<div class="lbl">' + T('Do these in order', 'Hazlas en orden') + '</div><ol>' + p.steps.map(function (s2, k) {
      return '<li class="' + (k < p.si || p.phase !== 'xf' ? 'done' : k === p.si ? 'now' : 'later') + '">' + shortText(s2) + '</li>'; }).join('') + '</ol>';
    else if (p.steps) html = '<div class="lbl">' + T('Transform', 'Transforma') + '</div><div class="txt">' + stepText(p.steps[0]) + '</div>';
    else html = '';
    p.askEl.innerHTML = html;
    p.msgEl.className = 'msg ' + (p.msgKind || ''); p.msgEl.innerHTML = p.msgText || '';
    p.cv.setAttribute('aria-label', p.name + '. ' + (st && p.phase === 'xf' ? stepText(st) : '') + ' ' + T('Rows cleared: ', 'Filas completas: ') + p.rows + '. ' + T('Xs: ', 'X: ') + p.xs + '.');
    if (p.btn) {
      var B = p.btn, place = p.phase === 'place', xf = p.phase === 'xf', t = st && st.type;
      B.left.disabled = B.right.disabled = !(place || (xf && (t === 'T' || t === 'F')));
      B.up.disabled = B.down.disabled = !(xf && t === 'F');
      B.cw.disabled = B.ccw.disabled = !(xf && t === 'R');
      B.reset.disabled = !xf;
      B.ok.disabled = !(place || xf);
      B.ok.className = 'ok' + (place ? ' start' : '');
      B.ok.textContent = place ? T('✓ Confirm start', '✓ Confirmar inicio') : T('✓ Check', '✓ Comprobar');
    }
    renderRise(p);
  }
  function renderRise(p) {
    if (!p.riseBar) return;
    var f = 1 - p.rise / RISE_MS[level];
    p.riseBar.style.width = Math.max(0, Math.min(100, f * 100)) + '%';
    p.riseLbl.textContent = p.dead ? '' : T('Floor rises in ', 'El piso sube en ') + Math.ceil(p.rise / 1000) + ' s' + (p.incoming ? T(' · +', ' · +') + p.incoming + T(' row incoming', ' fila en camino') : '');
  }
  var flashTimers = {};
  function flash(p, txt, col) {
    p.banner.textContent = txt; p.banner.style.color = col || '#fff';
    clearTimeout(flashTimers[p.idx]); flashTimers[p.idx] = setTimeout(function () { p.banner.textContent = ''; }, 1300);
  }

  // ------------------------------------------------------------------ screens
  function show(id) { ['scr-title', 'scr-how', 'scr-pause', 'scr-over'].forEach(function (s) { $(s).hidden = s !== id; }); }
  function startMatch() {
    var m = $('match'); m.innerHTML = ''; players = [];
    players.push(makePlayer(0, 'human'));
    players.push(makePlayer(1, mode === 'pvp' ? 'human' : 'cpu'));
    players.forEach(function (p) { m.appendChild(p.col); });
    m.hidden = false; $('btn-menu').hidden = false; show(null);
    running = true; paused = false; over = false;
    if (window.SiteResults) SiteResults.reset();
    layout();
    players.forEach(spawn);
    setTimeout(layout, 50);
    players[0].cv.focus({ preventScroll: true });
    say(T('Transformania. ', 'Transformania. ') + (mode === 'pvp' ? T('Player 1 against Player 2.', 'Jugador 1 contra Jugador 2.') : T('You against the computer.', 'Tú contra la computadora.')));
  }
  function togglePause() {
    if (over) return;
    paused = !paused; show(paused ? 'scr-pause' : null);
    if (paused) $('btn-resume').focus(); else players[0].cv.focus({ preventScroll: true });
  }
  function showOver() {
    running = false;
    var a = players[0], b = players[1], txt, why;
    if (a.dead && b.dead) { txt = T("It's a tie!", '¡Empate!'); why = T('Both boards went out together.', 'Los dos tableros terminaron a la vez.'); sfx('lose'); }
    else {
      var winner = a.dead ? b : a, loser = a.dead ? a : b;
      txt = winner.kind === 'cpu' ? T('The computer wins', 'Gana la computadora') : (mode === 'pvp' ? winner.name + T(' wins!', ' gana!') : T('You win!', '¡Ganaste!'));
      why = loser.name + (loser.dead === 'xs' ? T(' reached three Xs.', ' llegó a tres X.') : T(': the stack crossed the dotted line.', ': la pila cruzó la línea punteada.'));
      sfx(winner.kind === 'cpu' ? 'lose' : 'win');
      if (winner.kind !== 'cpu') { try { var k = 'transformania_wins'; localStorage.setItem(k, String((+localStorage.getItem(k) || 0) + 1)); } catch (e) {} }
    }
    // records for My Stats (the people at this computer; the computer's board doesn't count)
    try {
      var add = function (k, n) { localStorage.setItem(k, String((+localStorage.getItem(k) || 0) + n)); };
      add('transformania_games', 1);
      players.forEach(function (p) {
        if (p.kind === 'cpu') return;
        add('transformania_solved', p.solved); add('transformania_firsttry', p.firstTry);
        if (p.rows > (+localStorage.getItem('transformania_best_rows') || 0)) localStorage.setItem('transformania_best_rows', String(p.rows));
      });
    } catch (e) {}
    $('over-title').textContent = txt; $('over-why').textContent = why;
    $('over-stats').innerHTML = players.map(function (p) {
      return '<div><span>' + p.name + '</span><b>' + p.rows + T(' rows', ' filas') + '</b><span>' + p.solved + T(' transformations · ', ' transformaciones · ') + p.firstTry + T(' first try', ' a la primera') + '</span></div>'; }).join('');
    $('btn-results').hidden = !window.SiteResults;
    show('scr-over'); $('btn-again').focus();
    say(txt + ' ' + why);
  }
  function toMenu() {
    running = false; over = false; paused = false; players = [];
    $('match').hidden = true; $('match').innerHTML = ''; $('btn-menu').hidden = true; show('scr-title');
    $('btn-play').focus();
  }

  // the title screen's choices
  if (TOUCH) $('opt-pvp').hidden = true;   // two players at once need one keyboard each side: computers only
  Array.prototype.forEach.call(document.querySelectorAll('#tm [data-mode]'), function (b) {
    b.addEventListener('click', function () { mode = b.getAttribute('data-mode'); document.querySelectorAll('#tm [data-mode]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); }); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('#tm [data-level]'), function (b) {
    b.addEventListener('click', function () { level = b.getAttribute('data-level'); document.querySelectorAll('#tm [data-level]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); }); });
  });
  $('btn-play').addEventListener('click', function () { ac(); startMatch(); });
  $('btn-how').addEventListener('click', function () { show('scr-how'); $('btn-how-back').focus(); });
  $('btn-how-back').addEventListener('click', function () { show('scr-title'); $('btn-play').focus(); });
  $('btn-menu').addEventListener('click', togglePause);
  $('btn-resume').addEventListener('click', togglePause);
  $('btn-restart').addEventListener('click', function () { paused = false; startMatch(); });
  $('btn-quit').addEventListener('click', toMenu);
  $('btn-again').addEventListener('click', startMatch);
  $('btn-over-menu').addEventListener('click', toMenu);
  $('btn-results').addEventListener('click', function () { if (window.SiteResults) SiteResults.show({ title: T('Your results', 'Tus resultados') }); });

  $('how-list').innerHTML = [
    T('A figure appears above the <b>white dotted line</b>. Slide it left or right to choose where it starts, then press <b>Confirm start</b>.', 'Una figura aparece arriba de la <b>línea blanca punteada</b>. Deslízala a la izquierda o la derecha para elegir dónde empieza y pulsa <b>Confirmar inicio</b>.'),
    T('An instruction appears, and a faint <b>ghost</b> keeps the starting figure (the pre-image) in place.', 'Aparece una instrucción, y una <b>figura tenue</b> deja la figura inicial (la preimagen) en su lugar.'),
    T('<b>Translate</b>: slide with ◀ ▶ and count the grid units.', '<b>Traslada</b>: desliza con ◀ ▶ y cuenta las unidades.'),
    T('<b>Rotate</b>: the figure is on tracing paper pinned at a <b>red point</b>. Drag the handle or press ⟲ ⟳ to turn it. Each turn is <b>90°</b>: 180° is 2 turns, 270° is 3, 360° is 4. The red arrow on the paper starts pointing up.', '<b>Rota</b>: la figura está en papel de calcar fijo en un <b>punto rojo</b>. Arrastra el asa o pulsa ⟲ ⟳ para girarlo. Cada vuelta es de <b>90°</b>: 180° son 2 vueltas, 270° son 3 y 360° son 4. La flecha roja del papel empieza apuntando hacia arriba.'),
    T('<b>Reflect</b>: ◀ ▶ flip the figure across the pink <b>vertical</b> line, ▲ ▼ across the green <b>horizontal</b> line.', '<b>Refleja</b>: ◀ ▶ reflejan la figura sobre la línea <b>vertical</b> rosa, ▲ ▼ sobre la línea <b>horizontal</b> verde.'),
    T('Press <b>Check</b>. A correct image drops below the line and stacks. The first wrong check on a question adds an <b>X</b>, and every wrong check gives a stronger hint. Three Xs and you are out.', 'Pulsa <b>Comprobar</b>. Una imagen correcta cae debajo de la línea y se apila. El primer error de cada pregunta suma una <b>X</b>, y cada error da una pista más clara. Con tres X quedas fuera.'),
    T('Fill a whole row to clear it and remove an X. The floor rises every so often, and clearing 2 or more rows at once pushes a row onto the other board. If your stack crosses the dotted line, you lose.', 'Completa una fila para quitarla y borrar una X. El piso sube cada cierto tiempo, y completar 2 o más filas a la vez sube una fila en el otro tablero. Si tu pila cruza la línea punteada, pierdes.'),
    T('<b>Hard</b>: turns up to 360° and sequences such as &ldquo;rotate 90° clockwise, then translate 2 units left&rdquo;, done in order.', '<b>Difícil</b>: giros hasta 360° y secuencias como &ldquo;rota 90° en sentido horario y luego traslada 2 unidades a la izquierda&rdquo;, en orden.')
  ].map(function (x) { return '<li>' + x + '</li>'; }).join('');
  $('how-keys').innerHTML = TOUCH ? '' : T('One player: arrow keys, <kbd>Q</kbd> <kbd>E</kbd> to turn, <kbd>Space</kbd> to confirm or check. Two players: left player <kbd>A</kbd> <kbd>D</kbd> <kbd>W</kbd> <kbd>S</kbd> <kbd>Q</kbd> <kbd>E</kbd> <kbd>Space</kbd>; right player arrow keys, <kbd>&lt;</kbd> <kbd>&gt;</kbd>, <kbd>Enter</kbd>.',
    'Un jugador: flechas, <kbd>Q</kbd> <kbd>E</kbd> para girar, <kbd>Espacio</kbd> para confirmar o comprobar. Dos jugadores: el de la izquierda <kbd>A</kbd> <kbd>D</kbd> <kbd>W</kbd> <kbd>S</kbd> <kbd>Q</kbd> <kbd>E</kbd> <kbd>Espacio</kbd>; el de la derecha flechas, <kbd>&lt;</kbd> <kbd>&gt;</kbd>, <kbd>Enter</kbd>.');

  show('scr-title');
  requestAnimationFrame(frame);
  // a small hook for automated checks
  window.TM = { get players() { return players; }, act: act, apply: apply, rotateAbout: rotateAbout, reflectV: reflectV, reflectH: reflectH, makeQuestion: makeQuestion, same: same, inZone: inZone, startMatch: startMatch, setMode: function (m, l) { mode = m; level = l; }, update: update };
})();
