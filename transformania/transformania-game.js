// Transformania - a turn-based falling-blocks game where every piece is a transformation.
// One shared board of square cells. On each turn a figure appears in the transform zone above the white dotted line;
// the player whose turn it is slides it to a starting spot and confirms, then performs the instruction (translate,
// rotate on tracing paper around a fixed red point, reflect across a vertical or horizontal line, or a sequence of these
// in order). Check compares every cell with the mathematically correct image. A correct image drops straight down,
// locks, and can complete rows; then the other player (the computer or Player 2) takes a turn. The first wrong check on
// a question adds an X (three lose; each completed row removes one). Figures are lists of [x, y] cells (x across, y down).
(function () {
  'use strict';
  var T = window.tl || function (en) { return en; };
  var say = function (m) { if (window.SiteSR) SiteSR.say(String(m).replace(/&rsquo;/g, "'").replace(/<[^>]*>/g, '')); };
  var TOUCH = !!(window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches);
  var CALM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var $ = function (id) { return document.getElementById(id); };
  var app = $('tm');

  // ------------------------------------------------------------------ the board
  var W = 10, Z = 8, S = 14, H = Z + S;            // 10 columns; 8 rows of transform zone above the line, 14 below
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
  function translate(c, dx, dy) { dy = dy || 0; return c.map(function (p) { return [p[0] + dx, p[1] + dy]; }); }
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
    if (st.type === 'T') return translate(c, st.dx, st.dy);
    if (st.type === 'R') return rotateAbout(c, st.px, st.py, st.turns);
    return st.axis === 'v' ? reflectV(c, st.a) : reflectH(c, st.b);
  }
  function inZone(c) { return c.every(function (p) { return p[0] >= 0 && p[0] < W && p[1] >= 0 && p[1] < Z; }); }

  // ------------------------------------------------------------------ making instructions that fit the zone
  // Normal: translations left or right, 90° and 180° turns, reflections across a line drawn on the board.
  // Hard: translations can go up or down too, turns go up to 360°, reflection lines are not drawn (the instruction says
  // where the line is) and can sit 1 or 2 units away from the figure, and many instructions are sequences.
  function genT(c, hard) {
    var kinds = hard ? shuffle(['h', 'h', 'v', 'hv']) : ['h'], opts;
    for (var i = 0; i < kinds.length; i++) {
      opts = [];
      for (var dx = -4; dx <= 4; dx++) for (var dy = -3; dy <= 3; dy++) {
        var k = kinds[i];
        if (k === 'h' && (dy !== 0 || dx === 0)) continue;
        if (k === 'v' && (dx !== 0 || dy === 0)) continue;
        if (k === 'hv' && (dx === 0 || dy === 0 || Math.abs(dx) > 3 || Math.abs(dy) > 2)) continue;
        if (inZone(translate(c, dx, dy))) opts.push([dx, dy]);
      }
      if (opts.length) { var o = pick(opts); return { type: 'T', dx: o[0], dy: o[1] }; }
    }
    return null;
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
  function lineSpots(lo, hi, limit, maxGap) {     // where a line can go beside a figure spanning [lo, hi), so its image fits
    var out = [];
    for (var g = 0; g <= maxGap; g++) {
      var a = lo - g; if (a >= 0 && 2 * a - hi >= 0) out.push(a);           // a line before the figure: the image lands before it
      var b = hi + g; if (b <= limit && 2 * b - lo <= limit) out.push(b);   // a line after it: the image lands after it
    }
    return out;
  }
  function genF(c, hard) {
    var b = box(c), axes = shuffle(['v', 'h']), gap = hard ? 2 : 1;
    for (var i = 0; i < axes.length; i++) {
      var ax = axes[i];
      var vs = shuffle(lineSpots(b.x0, b.x1, W, gap)), hs = shuffle(lineSpots(b.y0, b.y1, Z, gap));
      var good = ax === 'v' ? vs : hs;
      for (var j = 0; j < good.length; j++) {
        var st = { type: 'F', axis: ax, hidden: hard };
        if (ax === 'v') { st.a = good[j]; st.b = hs.length ? hs[0] : (b.y1 <= Z - 1 ? b.y1 : b.y0); }
        else { st.b = good[j]; st.a = vs.length ? vs[0] : (b.x1 <= W - 1 ? b.x1 : b.x0); }
        if (inZone(apply(st, c))) {
          // where the line is, measured from the figure (said in words when the line isn't drawn)
          st.vside = st.a <= b.x0 ? 'left' : 'right'; st.vgap = st.a <= b.x0 ? b.x0 - st.a : st.a - b.x1;
          st.hside = st.b <= b.y0 ? 'above' : 'below'; st.hgap = st.b <= b.y0 ? b.y0 - st.b : st.b - b.y1;
          return st;
        }
      }
    }
    return null;
  }
  function genStep(type, c, hard) {
    if (type === 'T') return genT(c, hard);
    if (type === 'R') return genR(c, hard ? [1, -1, 2, -2, 3, -3, 4, -4] : [1, -1, 2, -2]);
    return genF(c, hard);
  }
  // allow (Practice): which skills may come, { T, R, F, seq }; null = everything the level has
  function makeQuestion(c, hard, allow) {
    var basics = ['T', 'R', 'F'].filter(function (t) { return !allow || allow[t]; });
    var seqOK = allow ? !!allow.seq : hard;
    if (!basics.length) basics = ['T', 'R', 'F'];                       // sequences only: their steps can be anything
    var singlesOK = !allow || allow.T || allow.R || allow.F;
    var seqChance = !seqOK ? 0 : !singlesOK ? 1 : allow ? 0.5 : 0.65;
    if (Math.random() >= seqChance) {
      var order = shuffle(basics);
      for (var i = 0; i < order.length; i++) { var s = genStep(order[i], c, hard); if (s) return [s]; }
      if (!seqOK) return [genT(c, false) || { type: 'T', dx: 0, dy: 0 }];
    }
    for (var tries = 0; tries < 40; tries++) {
      var len = hard && Math.random() < 0.3 ? 3 : 2, steps = [], cur = c, prev = null, ok = true;
      for (var k = 0; k < len; k++) {
        var types = shuffle(basics.filter(function (t) { return t !== prev || basics.length === 1; })), st = null;
        for (var m = 0; m < types.length && !st; m++) st = genStep(types[m], cur, hard);
        if (!st) { ok = false; break; }
        steps.push(st); cur = apply(st, cur); prev = st.type;
      }
      if (ok) return steps;
    }
    return [genT(c, false) || { type: 'T', dx: 0, dy: 0 }];
  }

  // ------------------------------------------------------------------ words
  function units(n) { n = Math.abs(n); return n === 1 ? T('1 unit', '1 unidad') : n + T(' units', ' unidades'); }
  function turnsWord(n) { n = Math.abs(n); return n === 1 ? T('1 turn', '1 vuelta') : n + T(' turns', ' vueltas'); }
  function dirWord(cw) { return cw ? T('clockwise', 'en sentido horario') : T('counterclockwise', 'en sentido antihorario'); }
  function moveWords(dx, dy) {                     // "3 units right and 1 unit up"
    var parts = [];
    if (dx) parts.push(units(dx) + (dx > 0 ? T(' right', ' a la derecha') : T(' left', ' a la izquierda')));
    if (dy) parts.push(units(dy) + (dy > 0 ? T(' down', ' hacia abajo') : T(' up', ' hacia arriba')));
    return parts.join(T(' and ', ' y '));
  }
  function lineWords(st) {                         // where a reflection line is, in words (Hard draws no line)
    if (st.axis === 'v') {
      var sv = st.vside === 'left' ? T('left', 'izquierdo') : T('right', 'derecho');
      return st.vgap === 0 ? T('the vertical line along the figure&rsquo;s ', 'la línea vertical sobre el borde ') + (st.vside === 'left' ? T('left edge', 'izquierdo de la figura') : T('right edge', 'derecho de la figura'))
        : T('the vertical line ', 'la línea vertical a ') + units(st.vgap) + (st.vside === 'left' ? T(' to the left of the figure', ' a la izquierda de la figura') : T(' to the right of the figure', ' a la derecha de la figura'));
    }
    return st.hgap === 0 ? T('the horizontal line along the figure&rsquo;s ', 'la línea horizontal sobre el borde ') + (st.hside === 'above' ? T('top edge', 'de arriba de la figura') : T('bottom edge', 'de abajo de la figura'))
      : T('the horizontal line ', 'la línea horizontal a ') + units(st.hgap) + (st.hside === 'above' ? T(' above the figure', ' arriba de la figura') : T(' below the figure', ' debajo de la figura'));
  }
  function stepText(st) {
    if (st.type === 'T') return T('Translate ', 'Traslada ') + moveWords(st.dx, st.dy) + '.';
    if (st.type === 'R') return T('Rotate ', 'Rota ') + Math.abs(st.turns) * 90 + '° ' + dirWord(st.turns > 0) + T(' around the red point.', ' alrededor del punto rojo.');
    if (st.hidden) return T('Reflect across ', 'Refleja sobre ') + lineWords(st) + '.';
    return st.axis === 'v' ? T('Reflect across the vertical line.', 'Refleja sobre la línea vertical.') : T('Reflect across the horizontal line.', 'Refleja sobre la línea horizontal.');
  }
  function shortText(st) {
    if (st.type === 'T') return T('Translate ', 'Traslada ') + moveWords(st.dx, st.dy);
    if (st.type === 'R') return T('Rotate ', 'Rota ') + Math.abs(st.turns) * 90 + '° ' + (st.turns > 0 ? T('CW', 'horario') : T('CCW', 'antihorario'));
    if (st.hidden) return T('Reflect across ', 'Refleja sobre ') + lineWords(st);
    return st.axis === 'v' ? T('Reflect: vertical line', 'Refleja: línea vertical') : T('Reflect: horizontal line', 'Refleja: línea horizontal');
  }
  function goodText(st) {
    if (st.type === 'T') return T('Correct! The figure was translated ', '¡Correcto! La figura se trasladó ') + moveWords(st.dx, st.dy) + '.';
    if (st.type === 'R') { var n = Math.abs(st.turns); return T('Correct! ', '¡Correcto! ') + n * 90 + '° = ' + (n === 1 ? T('one 90° turn', 'una vuelta de 90°') : n + T(' turns of 90°', ' vueltas de 90°')) + ' ' + dirWord(st.turns > 0) + '.'; }
    return T('Correct! Every square is the same distance from the ', '¡Correcto! Cada cuadrado está a la misma distancia de la línea ') + (st.axis === 'v' ? T('vertical', 'vertical') : T('horizontal', 'horizontal')) + T(' line, on the other side.', ', del otro lado.');
  }
  function hintText(st, level) {
    var L = Math.min(level, 4);
    if (st.type === 'T') {
      return [T('Count grid units: each square is 1 unit. A translation slides the figure without turning it.', 'Cuenta unidades de la cuadrícula: cada cuadrado mide 1 unidad. Una traslación desliza la figura sin girarla.'),
        T('Compare with the faint ghost: the image is the same figure, moved ', 'Compara con la figura tenue: la imagen es la misma figura, movida ') + moveWords(st.dx, st.dy) + '.',
        T('Pick one square of the ghost and count ', 'Elige un cuadrado de la figura tenue y cuenta ') + moveWords(st.dx, st.dy) + T(' from it. The same square must end up there.', ' desde él. Ese mismo cuadrado debe quedar ahí.'),
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
      st.hidden ? T('Picture ', 'Imagina ') + lineWords(st) + T('. The image is its mirror image on the other side of that line, the same distance away.', '. La imagen es su reflejo del otro lado de esa línea, a la misma distancia.')
        : v ? T('Use the pink vertical line. Its mirror image goes on its other side, flipped left to right.', 'Usa la línea vertical rosa. La imagen va del otro lado, volteada de izquierda a derecha.')
        : T('Use the green horizontal line. Its mirror image goes on its other side, flipped top to bottom.', 'Usa la línea horizontal verde. La imagen va del otro lado, volteada de arriba abajo.'),
      T('The dotted yellow outline shows where the image goes.', 'El contorno amarillo punteado muestra dónde va la imagen.')][L - 1];
  }
  // what the student actually did, compared with what was asked: so the feedback names the mistake
  function mistakeText(st, g) {
    if (st.type === 'T') {
      var b0 = box(g.stepStart), b1 = box(g.cur), mx = b1.x0 - b0.x0, my = b1.y0 - b0.y0;
      if (!mx && !my) return T("You haven't moved the figure yet.", 'Todavía no moviste la figura.');
      if (mx * st.dx < 0 || my * (st.dy || 0) < 0) return T('You moved it ', 'La moviste ') + moveWords(mx, my) + T(': check the direction.', ': revisa la dirección.');
      if ((st.dy || 0) === 0 && my) return T('You moved it up or down too: this translation only goes ', 'También la moviste arriba o abajo: esta traslación solo va ') + (st.dx > 0 ? T('right.', 'a la derecha.') : T('left.', 'a la izquierda.'));
      if (st.dx === 0 && mx) return T('You moved it sideways too: this translation only goes ', 'También la moviste de lado: esta traslación solo va ') + (st.dy > 0 ? T('down.', 'hacia abajo.') : T('up.', 'hacia arriba.'));
      return T('You moved it ', 'La moviste ') + moveWords(mx, my) + T(', but the instruction says ', ', pero la instrucción dice ') + moveWords(st.dx, st.dy) + '.';
    }
    if (st.type === 'R') {
      var k = Math.round(g.rot.target / 90);
      if (k === 0) return T("The paper hasn't turned yet.", 'El papel todavía no gira.');
      if (k * st.turns < 0) {
        var sameSpot = same(rotateAbout(g.stepStart, st.px, st.py, k), apply(st, g.stepStart));
        return T('You turned ', 'Giraste ') + dirWord(k > 0) + T(', but the instruction says ', ', pero la instrucción dice ') + dirWord(st.turns > 0) + '.'
          + (sameSpot ? T(' (It lands in the same spot, but the turn must go the right way.)', ' (Llega al mismo lugar, pero el giro debe ir en el sentido correcto.)') : '');
      }
      return T('You turned ', 'Giraste ') + turnsWord(k) + ' (' + Math.abs(k) * 90 + T('°), but ', '°), pero ') + Math.abs(st.turns) * 90 + T('° is ', '° son ') + turnsWord(st.turns) + '.';
    }
    var want = st.axis === 'v';
    if (!g.flipV && !g.flipH) return T("You haven't flipped the figure yet.", 'Todavía no reflejaste la figura.');
    if (g.flipV && g.flipH) return T('You flipped across both lines; flip across only the ', 'La reflejaste sobre las dos líneas; refléjala solo sobre la línea ') + (want ? T('vertical line.', 'vertical.') : T('horizontal line.', 'horizontal.'));
    if (g.flipV !== want) return T('You flipped across the ', 'La reflejaste sobre la línea ') + (g.flipV ? T('vertical', 'vertical') : T('horizontal', 'horizontal')) + T(' line; the instruction says the ', '; la instrucción dice la línea ') + (want ? T('vertical line.', 'vertical.') : T('horizontal line.', 'horizontal.'));
    return '';
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
  // One shared board. Players take turns: each turn is one figure, placed, transformed and dropped by the player whose
  // turn it is; then the next player (the computer, or the next person at this device) takes a turn on the same board.
  // Player vs Player is for 2 to 4 people; with 3 or 4, a player who is out drops out and the rest play on until one is left.
  // Practice has one player, no opponent and no Xs, with the skills the student picks.
  var mode = 'cpu', level = 'normal', count = 2, many = false, players = [], running = false, paused = false, over = false, overAt = 0, winner = null;
  var G = null;                                          // the board and the turn in progress
  var skills = { T: true, R: true, F: true, seq: false };   // Practice: which skills may come
  function solo() { return mode === 'practice'; }
  function versus() { return !solo(); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, String(v)); } catch (e) { return null; } }
  function bump(k) { store(k, (+store(k) || 0) + 1); }
  var GOAL = { normal: 3, hard: 4 }, RISE_EVERY = { normal: 12, hard: 10 }, TOPN = 1;   // rows to win; pieces between floor rises
  var PALETTE = [['#5cc8ff', '#7cf0ff', '#4ee6a6', '#8fd3ff'], ['#ff7ab0', '#ffcc33', '#ff9f43', '#ff6b6b']];   // cool for the left player, warm for the right
  var PALETTE4 = [['#5cc8ff', '#7cf0ff', '#8fd3ff', '#4aa8ff'], ['#ff7ab0', '#ff6b6b', '#ff9cc4', '#ff5d8f'],   // 3 or 4 players: blue, pink, green, yellow
    ['#4ee6a6', '#7dffc4', '#3fd17f', '#9be86a'], ['#ffcc33', '#ff9f43', '#ffd84d', '#ffb31a']];
  var TURNCOL = ['#5cc8ff', '#ff9cc4', '#7dffc4', '#ffd84d'];
  var ZONETINT = ['rgba(92, 200, 255, 0.07)', 'rgba(255, 122, 176, 0.07)', 'rgba(78, 230, 166, 0.07)', 'rgba(255, 204, 51, 0.07)'];
  if (window.SiteResults) SiteResults.setup([
    { id: 'T', en: 'Translations', es: 'Traslaciones' }, { id: 'R', en: 'Rotations', es: 'Rotaciones' },
    { id: 'F', en: 'Reflections', es: 'Reflexiones' }, { id: 'seq', en: 'Sequences of transformations', es: 'Secuencias de transformaciones' }]);

  function newShape(p) {
    var bigOK = level === 'hard' || p.pieces >= 5;
    var pool = bigOK && Math.random() < (level === 'hard' ? 0.6 : 0.35) ? BIG : SMALL;
    if (level !== 'hard' && p.pieces < 3) pool = SMALL.filter(function (s) { return s.length <= 4; });   // Normal starts with small figures
    var c = clone(pick(pool));
    var k = rnd(4); for (var i = 0; i < k; i++) c = c.map(function (q) { return [-q[1], q[0]]; });
    if (Math.random() < 0.5) c = c.map(function (q) { return [-q[0], q[1]]; });
    return { cells: norm(c), color: pick((many ? PALETTE4 : PALETTE)[p.idx]) };
  }
  function makePlayer(idx, kind) {
    var p = { idx: idx, kind: kind, name: kind === 'cpu' ? T('Computer', 'Computadora') : (mode === 'pvp' ? T('Player ', 'Jugador ') + (idx + 1) : T('You', 'Tú')),
      fresh: 0,
      xs: 0, rows: 0, pieces: 0, solved: 0, firstTry: 0, dead: '' };
    p.next = newShape(p);
    return p;
  }
  function cur() { return players[G.turn]; }
  function pcls(p) { return p.kind === 'cpu' ? 'cpu' : 'p' + (p.idx + 1); }
  function humanTurn() { return running && !paused && !over && G && cur().kind !== 'cpu'; }

  // ------------------------------------------------------------------ the page: controls | board | scoreboard
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  var UI = {};
  function buildUI() {
    var m = $('match'); m.innerHTML = ''; m.classList.toggle('many', many);
    var left = el('div', 'panel'), wrap = el('div', 'board-wrap'), right = el('div', 'panel score');
    UI.turnEl = el('div', 'turn'); left.appendChild(UI.turnEl);
    UI.askEl = el('div', 'ask'); left.appendChild(UI.askEl);
    UI.msgEl = el('div', 'msg'); left.appendChild(UI.msgEl);
    var pad = el('div', 'pad'); UI.btn = {};
    [['left', '◀', T('Move or flip left', 'Mover o reflejar a la izquierda')], ['right', '▶', T('Move or flip right', 'Mover o reflejar a la derecha')],
     ['up', '▲', T('Up: move or flip up, or turn the paper clockwise', 'Arriba: mover o reflejar hacia arriba, o girar el papel en sentido horario')],
     ['down', '▼', T('Down: move or flip down, or turn the paper counterclockwise', 'Abajo: mover o reflejar hacia abajo, o girar el papel en sentido antihorario')],
     ['ccw', '⟲', T('Turn the paper 90 degrees counterclockwise', 'Girar el papel 90 grados en sentido antihorario')], ['cw', '⟳', T('Turn the paper 90 degrees clockwise', 'Girar el papel 90 grados en sentido horario')],
     ['reset', T('↺ Start over', '↺ Empezar otra vez'), T('Start this step over', 'Empezar este paso otra vez')], ['ok', '', '']].forEach(function (b) {
      var bt = el('button', b[0] === 'reset' ? 'wide' : (b[0] === 'ok' ? 'ok' : ''), b[1]); bt.type = 'button';
      if (b[2]) bt.setAttribute('aria-label', b[2]);
      bt.addEventListener('click', function () { if (humanTurn()) act(b[0]); });
      pad.appendChild(bt); UI.btn[b[0]] = bt;
    });
    left.appendChild(pad);
    UI.helpEl = TOUCH ? null : el('div', 'help'); if (UI.helpEl) left.appendChild(UI.helpEl);   // the keys for this moment only (see keysNow)
    UI.cv = el('canvas'); UI.cv.tabIndex = 0; UI.cv.setAttribute('role', 'img');
    wrap.appendChild(UI.cv); UI.banner = el('div', 'banner'); wrap.appendChild(UI.banner);
    UI.ctx = UI.cv.getContext('2d');
    UI.cv.addEventListener('pointerdown', pointerDown);
    UI.cv.addEventListener('pointermove', pointerMove);
    UI.cv.addEventListener('pointerup', pointerUp);
    UI.cv.addEventListener('pointercancel', pointerUp);
    UI.goalEl = el('div', 'goal'); right.appendChild(UI.goalEl);
    players.forEach(function (p) {
      var card = el('div', 'pcard ' + pcls(p));
      var who = el('div', 'who'); p.nameEl = el('b', '', p.name); p.xsEl = el('div', 'xs');
      for (var i = 0; i < 3; i++) p.xsEl.appendChild(el('i', '', '✕'));
      who.appendChild(p.nameEl); who.appendChild(p.xsEl); card.appendChild(who);
      p.statsEl = el('div', 'stats'); card.appendChild(p.statsEl);
      var next = el('div', 'next', T('NEXT', 'SIGUE')); p.nextCv = el('canvas'); p.nextCv.width = 84; p.nextCv.height = 50; p.nextCv.style.width = '84px'; p.nextCv.style.height = '50px';
      next.appendChild(p.nextCv); card.appendChild(next);
      p.card = card; right.appendChild(card);
    });
    UI.riseEl = el('div', 'rise-lbl'); right.appendChild(UI.riseEl);
    m.appendChild(left); m.appendChild(wrap); m.appendChild(right);
    UI.left = left; UI.right = right;
  }

  // ------------------------------------------------------------------ sizes: the board as big as fits, nothing scrolls
  var cell = 24, DPR = Math.min(2, window.devicePixelRatio || 1);
  function layout() {
    if (!G || !UI.cv) return;
    var r = app.getBoundingClientRect(); if (!r.width) return;
    var side = UI.left.getBoundingClientRect().width + UI.right.getBoundingClientRect().width;
    var availW = r.width - side - 24 - 28, availH = r.height - 20;
    cell = Math.max(8, Math.floor(Math.min(availW / W, availH / H)));
    UI.cv.width = W * cell * DPR; UI.cv.height = H * cell * DPR;
    UI.cv.style.width = W * cell + 'px'; UI.cv.style.height = H * cell + 'px';
    UI.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(app);

  // ------------------------------------------------------------------ a turn: place, transform, drop, clear, pass
  function emptyRow() { var row = []; for (var x = 0; x < W; x++) row.push(null); return row; }
  function startTurn() {
    var p = cur(), sh = p.next; p.next = newShape(p);
    var b = box(sh.cells), x0 = Math.floor((W - b.w) / 2), y0 = Math.floor((Z - b.h) / 2);
    G.piece = { cells: translate(sh.cells.map(function (q) { return [q[0], q[1] + y0]; }), x0), color: sh.color, owner: p.idx };
    G.cur = clone(G.piece.cells);
    G.phase = 'place'; G.steps = null; G.si = 0; G.wrongQ = false; G.hint = 0; G.showTarget = false; G.demo = null; G.flipV = G.flipH = false;
    G.rot = { angle: 0, target: 0, drag: false, last: 0 }; G.ai = { queue: [], wait: 0, plan: '' };
    setMsg('', '');
    if (versus()) flash(p.kind === 'cpu' ? T("Computer's turn", 'Turno de la computadora') : (mode === 'pvp' ? p.name + T("'s turn", ': tu turno') : T('Your turn', 'Tu turno')), TURNCOL[p.idx]);
    render();
    if (p.kind !== 'cpu') {
      focusBoard();
      say((mode === 'pvp' ? p.name + T("'s turn. ", ': tu turno. ') : versus() ? T('Your turn. ', 'Tu turno. ') : '') + T('A new figure of ', 'Una figura nueva de ') + G.cur.length + T(' squares: ', ' cuadrados: ')
        + figureWords(G.cur) + '. ' + T('Move it left or right, then confirm the start.', 'Muévela a la izquierda o la derecha y confirma el inicio.'));
    } else say(T("The computer's turn.", 'Turno de la computadora.'));
  }
  // The instruction is made only after the start is confirmed. So that a good start is rewarded (and rows can be built),
  // the game makes thirty instructions that fit and picks the one whose image lands best on the board: both
  // players get the same treatment, and the transformation still has to be done exactly right.
  function allowNow() {
    return mode === 'practice' ? skills : null;
  }
  function rankedQuestions(c) {
    var list = [], allow = allowNow();
    for (var i = 0; i < 30; i++) {
      var q = makeQuestion(c, level === 'hard', allow), img = c;
      q.forEach(function (st) { img = apply(st, img); });
      list.push({ q: q, s: aiEval(landing(img)) });
    }
    return list.sort(function (a, b) { return b.s - a.s; }).slice(0, TOPN);
  }
  function confirmStart() {
    G.start = clone(G.cur);
    G.steps = pick(rankedQuestions(G.start)).q;
    G.si = 0; beginStep(G.start);
    sfx('start'); render();
    if (cur().kind !== 'cpu') say(G.steps.map(function (s, i) { return (G.steps.length > 1 ? (i + 1) + '. ' : '') + stepText(s); }).join(' ') + ' ' + whereWords() + ' ' + controlsWord(G.steps[0]));
    else say(T('The computer: ', 'La computadora: ') + G.steps.map(stepText).join(' '));
  }
  function controlsWord(st) {
    if (TOUCH) return '';
    if (st.type === 'T') return level === 'hard' ? T('Use the arrow keys.', 'Usa las flechas.') : T('Use left and right.', 'Usa izquierda y derecha.');
    if (st.type === 'R') return T('Up turns the paper a quarter-turn clockwise; down turns it counterclockwise.', 'Arriba gira el papel un cuarto de vuelta en sentido horario; abajo, en sentido antihorario.');
    return T('Left and right flip across the vertical line; up and down across the horizontal line.', 'Izquierda y derecha reflejan sobre la línea vertical; arriba y abajo sobre la horizontal.');
  }
  function beginStep(from) {
    G.phase = 'xf'; G.stepStart = clone(from); G.cur = clone(from); G.flipV = G.flipH = false;
    G.rot.angle = G.rot.target = 0; G.rot.drag = false; G.hint = 0; G.showTarget = false; G.ai.plan = '';
  }
  function step() { return G && G.steps && G.steps[G.si]; }
  function rotIdle() { return Math.abs(G.rot.angle - G.rot.target) < 0.01 && !G.rot.drag; }
  function currentImage() {
    var st = step();
    if (st && st.type === 'R') return rotateAbout(G.stepStart, st.px, st.py, Math.round(G.rot.target / 90));
    return G.cur;
  }
  function check() {
    var st = step(), p = cur(); if (!st) return;
    if (st.type === 'R' && !rotIdle()) return;
    var img = currentImage(), want = apply(st, G.stepStart);
    var ok = same(img, want) && (st.type !== 'R' || Math.round(G.rot.target / 90) === st.turns);
    if (ok) {
      G.cur = want;
      if (G.si < G.steps.length - 1) {
        setMsg('good', T('Step ', 'Paso ') + (G.si + 1) + ' ✓ ' + goodText(st));
        sfx('flip'); G.si++; beginStep(want); render();
        if (p.kind !== 'cpu') say(T('Correct. Now step ', 'Correcto. Ahora el paso ') + (G.si + 1) + ': ' + stepText(step()) + ' ' + whereWords());
        return;
      }
      p.solved++; if (!G.wrongQ) p.firstTry++;
      if (p.kind !== 'cpu') {
        if (window.SiteResults) SiteResults.record(skillOf(G.steps), !G.wrongQ);
        if (!G.wrongQ) bump('transformania_ft_' + skillOf(G.steps));     // for the badges on My Stats
      }
      setMsg('good', goodText(st)); sfx('good');
      if (p.kind !== 'cpu') say(goodText(st));
      G.phase = 'drop'; G.dropT = 0; G.drop = clone(want); render();
      return;
    }
    G.hint++;
    if (!G.wrongQ) { G.wrongQ = true; if (versus()) { p.xs++; flash('✕', '#ff4d6a'); } }
    if (G.hint >= 4) G.showTarget = true;
    var named = mistakeText(st, G), h = hintText(st, G.hint);
    sfx('bad');
    if (G.hint === 2) {
      // the second miss: watch the right move once, slowly, on the board; then the step starts over to try again
      G.demo = { st: st, from: clone(G.stepStart), t: 0, dur: st.type === 'R' ? 700 + Math.abs(st.turns) * 650 : 1400, hint: G.hint };
      setMsg('hint', (named ? named + ' ' : '') + T('Watch the correct move, then try it yourself.', 'Mira el movimiento correcto y luego inténtalo tú.'));
      render();
      say((named ? named + ' ' : '') + T('Watch the correct move, then try it yourself.', 'Mira el movimiento correcto y luego inténtalo tú.') + (versus() ? ' ' + T('Xs: ', 'X: ') + p.xs : ''));
    } else {
      setMsg('hint', (named ? '<b>' + named + '</b> ' : (G.hint === 1 ? T('Not yet. ', 'Todavía no. ') : '')) + h);
      render();
      say((named || T('Not yet.', 'Todavía no.')) + ' ' + h + (versus() ? ' ' + T('Xs: ', 'X: ') + p.xs : ''));
    }
    if (versus() && p.xs >= 3 && !knockOut(p, 'xs')) { G.demo = null; G.phase = 'wait'; G.waitT = 0; setMsg('', ''); render(); }   // the others play on
  }
  function endDemo() {
    var keep = G.demo.hint; G.demo = null;
    beginStep(G.stepStart); G.hint = keep;
    setMsg('hint', T('Now you try: ', 'Ahora tú: ') + stepText(step()));
    render(); say(T('Now you try. ', 'Ahora tú. ') + stepText(step()));
  }
  function fits(c) { return c.every(function (q) { return q[0] >= 0 && q[0] < W && q[1] < H && (q[1] < 0 || !G.board[q[1]][q[0]]); }); }
  function lock() {
    var p = cur();
    G.drop.forEach(function (q) { if (q[1] >= 0) G.board[q[1]][q[0]] = G.piece.color; });
    p.pieces++; G.placed++; sfx('lock');
    if (G.drop.some(function (q) { return q[1] < Z; })) {
      var dropped = G.drop; G.drop = null;
      if (solo()) {                                    // Practice: a full board just starts fresh
        for (var r = 0; r < H; r++) G.board[r] = emptyRow();
        p.fresh++; flash(T('Fresh board!', '¡Tablero nuevo!'), '#ffd84d'); say(T('The stack reached the line, so the board starts fresh.', 'La pila llegó a la línea, así que el tablero empieza de nuevo.'));
        passTurn(); render(); return;
      }
      if (knockOut(p, 'top')) { render(); return; }
      dropped.forEach(function (q) { if (q[1] >= 0) G.board[q[1]][q[0]] = null; });   // the others play on, without that piece
      passTurn(); render(); return;
    }
    var full = [];
    for (var y = Z; y < H; y++) if (G.board[y].every(function (v) { return v; })) full.push(y);
    G.drop = null;
    if (full.length) { G.phase = 'clear'; G.clearRows = full; G.clearT = 0; sfx('clear'); }
    else passTurn();
    render();
  }
  function finishClear() {
    var p = cur(), rows = G.clearRows;
    rows.forEach(function (y) { G.board.splice(y, 1); G.board.splice(Z, 0, emptyRow()); });
    p.rows += rows.length;
    var back = Math.min(p.xs, rows.length); p.xs -= back;
    flash('+' + rows.length + (rows.length === 1 ? T(' row', ' fila') : T(' rows', ' filas')) + (back ? T('  ✕ removed', '  ✕ fuera') : ''), '#4ee6a6');
    say(p.name + ': ' + rows.length + T(' row cleared. ', ' fila completa. ') + (back ? T('One X removed. ', 'Se quita una X. ') : '') + T('Rows: ', 'Filas: ') + p.rows + (versus() ? T(' of ', ' de ') + GOAL[level] : ''));
    G.clearRows = null;
    if (versus() && p.rows >= GOAL[level]) { render(); endGame(p, 'goal'); return; }
    passTurn(); render();
  }
  // after each piece: in a match, every few pieces the floor rises one row (a row with one gap); then the next turn
  function passTurn() {
    G.phase = 'wait'; G.waitT = 0;
    if (versus() && G.placed % RISE_EVERY[level] === 0 && G.board[Z].every(function (v) { return !v; })) {
      G.board.shift(); var hole = rnd(W), row = emptyRow(); for (var x = 0; x < W; x++) if (x !== hole) row[x] = GARBAGE; G.board.push(row);
      sfx('rise'); flash(T('▲ The floor rises', '▲ Sube el piso'), '#ff9f43'); say(T('The floor rises one row.', 'El piso sube una fila.'));
    }
  }
  // where things are, in words, for screen readers (columns counted from the left, rows from the top of the board)
  function figureWords(c) {
    var rows = {};
    c.forEach(function (q) { (rows[q[1]] = rows[q[1]] || []).push(q[0] + 1); });
    return Object.keys(rows).map(Number).sort(function (a, b) { return a - b; }).map(function (y) {
      var cols = rows[y].sort(function (a, b) { return a - b; });
      return T('row ', 'fila ') + (y + 1) + (cols.length === 1 ? T(', column ', ', columna ') : T(', columns ', ', columnas ')) + cols.join(', ');
    }).join('; ');
  }
  function whereWords() {
    var st = step(); if (!st || G.phase !== 'xf') return '';
    if (st.type === 'R') return T('The red point is the corner where columns ', 'El punto rojo es la esquina donde se unen las columnas ') + st.px + T(' and ', ' y ') + (st.px + 1) + T(' meet rows ', ' con las filas ') + st.py + T(' and ', ' y ') + (st.py + 1) + '.';
    if (st.type === 'F') {
      var v = T('The vertical line runs between columns ', 'La línea vertical pasa entre las columnas ') + st.a + T(' and ', ' y ') + (st.a + 1) + '. ';
      var h = T('The horizontal line runs between rows ', 'La línea horizontal pasa entre las filas ') + st.b + T(' and ', ' y ') + (st.b + 1) + '.';
      return st.hidden ? T('The line is ', 'La línea es ') + lineWords(st) + '.' : v + h;
    }
    return '';
  }
  function alive() { return players.filter(function (q) { return !q.dead; }); }
  function nextTurn() { var t = G.turn; do { t = (t + 1) % players.length; } while (players[t].dead && t !== G.turn); return t; }
  // three Xs, or a piece stopped above the line: that player is out. With two players the other one wins;
  // with three or four the rest play on until one is left. Returns true when that ends the game.
  function knockOut(p, why) {
    if (over) return true;
    p.dead = why; G.lastOut = p;
    var left = alive();
    if (left.length <= 1) { endGame(left[0], why); return true; }
    flash(T(p.name + ' is out!', '¡' + p.name + ' queda fuera!'), '#ff4d6a');
    say(p.name + (why === 'xs' ? T(' reached three Xs and is out. ', ' llegó a tres X y queda fuera. ') : T(' dropped a piece above the dotted line and is out. ', ' soltó una pieza arriba de la línea punteada y queda fuera. '))
      + left.length + T(' players left.', ' jugadores siguen.'));
    return false;
  }
  function endGame(win, why) {
    if (over) return;
    winner = win; G.endWhy = why; G.phase = 'over'; render();
    flash(why === 'xs' ? T('✕ ✕ ✕  Out!', '✕ ✕ ✕  ¡Fuera!') : why === 'top' ? T('Over the line!', '¡Pasó la línea!') : winner.name + T(' reached the goal!', ' llegó a la meta!'), why === 'goal' ? '#4ee6a6' : '#ff4d6a');
    over = true; overAt = performance.now();
  }

  // ------------------------------------------------------------------ the controls (keys, buttons and the computer all come here)
  function act(a) {
    if (!running || paused || over || !G) return;
    ac();
    if (G.demo) return;                                  // watching the correct move
    if (G.phase === 'place') {
      if (a === 'left' || a === 'right') { var c = translate(G.cur, a === 'left' ? -1 : 1); if (inZone(c)) { G.cur = c; sfx('move'); } }
      else if (a === 'ok') confirmStart();
      return;
    }
    if (G.phase !== 'xf') return;
    var st = step();
    if (st.type === 'R' && (a === 'up' || a === 'down')) a = a === 'up' ? 'cw' : 'ccw';   // during a rotation: up turns clockwise, down counterclockwise
    if (a === 'ok') { check(); return; }
    if (a === 'reset') { var h = G.hint, tg = G.showTarget; beginStep(G.stepStart); G.hint = h; G.showTarget = tg; render(); return; }   // starting over keeps the hints earned
    var vert = a === 'up' || a === 'down';
    if (st.type === 'T' && (a === 'left' || a === 'right' || (vert && level === 'hard'))) {   // Hard translations can go up or down too
      var t = translate(G.cur, a === 'left' ? -1 : a === 'right' ? 1 : 0, a === 'up' ? -1 : a === 'down' ? 1 : 0);
      if (inZone(t)) { G.cur = t; sfx('move'); }
    } else if (st.type === 'F' && a !== 'cw' && a !== 'ccw') {
      var bx = box(G.cur), across = a === 'left' || a === 'right', mid = across ? (bx.x0 + bx.x1) / 2 : (bx.y0 + bx.y1) / 2, line = across ? st.a : st.b;
      var toward = (a === 'left' || a === 'up') ? -1 : 1;
      if ((mid - line) * toward < 0) {
        G.cur = across ? reflectV(G.cur, st.a) : reflectH(G.cur, st.b); sfx('flip');
        if (across) G.flipV = !G.flipV; else G.flipH = !G.flipH;   // which lines it has been flipped across (to name a mistake)
      }
    } else if (st.type === 'R' && (a === 'cw' || a === 'ccw')) {
      if (Math.abs(G.rot.target) < 1440) { G.rot.target += a === 'cw' ? 90 : -90; sfx('turn'); }
    }
  }

  // dragging the tracing paper's handle around the red point (the up and down keys do the same, a quarter-turn per press)
  function boardXY(e) { var r = UI.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / cell, y: (e.clientY - r.top) / cell }; }
  function angleAt(st, pt) { return Math.atan2(pt.x - st.px, -(pt.y - st.py)) * 180 / Math.PI; }   // 0 = up, + = clockwise
  function pointerDown(e) {
    ac();
    var st = step(); if (!humanTurn() || G.phase !== 'xf' || !st || st.type !== 'R') return;
    var pt = boardXY(e);
    if (Math.hypot(pt.x - st.px, pt.y - st.py) < paperHalf() * 1.1) {
      G.rot.drag = true; G.rot.last = angleAt(st, pt); G.rot.angle = G.rot.target; UI.cv.setPointerCapture(e.pointerId); e.preventDefault();
    }
  }
  function pointerMove(e) {
    if (!G || !G.rot.drag) return;
    var st = step(), a = angleAt(st, boardXY(e)), d = a - G.rot.last;
    while (d > 180) d -= 360; while (d < -180) d += 360;
    G.rot.last = a; G.rot.angle = Math.max(-1440, Math.min(1440, G.rot.angle + d));
    var snapped = Math.round(G.rot.angle / 90) * 90;
    if (snapped !== G.rot.target) { G.rot.target = snapped; sfx('move'); }
  }
  function pointerUp() {
    if (!G || !G.rot.drag) return;
    G.rot.drag = false; G.rot.target = Math.round(G.rot.angle / 90) * 90; sfx('turn');
  }

  // every key: in a game, on the title screen, in the menus and on the results screen
  var KEYS = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down',
    ',': 'ccw', '<': 'ccw', '.': 'cw', '>': 'cw', ' ': 'ok', enter: 'ok', backspace: 'reset' };
  function screenOpen(id) { return !$(id).hidden; }
  document.addEventListener('keydown', function (e) {
    if (window.isPageControlKey && window.isPageControlKey(e)) return;
    if (document.querySelector('.sres')) return;   // the results panel (site-results.js) handles its own keys
    var k = e.key.toLowerCase(), onBtn = e.target && e.target.tagName === 'BUTTON' && (k === ' ' || k === 'enter');
    // title screen: arrows pick the mode and level, Enter plays, H opens How to play
    if (screenOpen('scr-title')) {
      var modes = ['cpu', 'pvp', 'practice'];
      if (k === 'arrowleft' || k === 'arrowright') { e.preventDefault(); chooseMode(modes[(modes.indexOf(mode) + (k === 'arrowleft' ? 2 : 1)) % 3]); return; }
      if (k === 'arrowup' || k === 'arrowdown') { e.preventDefault(); chooseLevel(k === 'arrowup' ? 'normal' : 'hard'); return; }
      if (mode === 'practice' && '1234'.indexOf(k) >= 0 && k) { e.preventDefault(); toggleSkill(['T', 'R', 'F', 'seq'][+k - 1]); return; }
      if (mode === 'pvp' && '234'.indexOf(k) >= 0 && k) { e.preventDefault(); chooseCount(+k); return; }
      if ((k === 'enter' || k === ' ') && !onBtn) { e.preventDefault(); ac(); play(); return; }
      if (k === 'h') { e.preventDefault(); openHow(); }
      return;
    }
    if (screenOpen('scr-how')) { if (k === 'escape' || ((k === 'enter' || k === ' ') && !onBtn)) { e.preventDefault(); closeHow(); } return; }
    if (screenOpen('scr-pause')) {
      if (k === 'escape' || ((k === 'enter' || k === ' ') && !onBtn)) { e.preventDefault(); togglePause(); }
      else if (k === 'r') { e.preventDefault(); paused = false; startMatch(); }
      else if (k === 'f' && mode === 'practice') { e.preventDefault(); paused = false; finishPractice(); }
      else if (k === 'm') { e.preventDefault(); toMenu(); }
      return;
    }
    if (screenOpen('scr-over')) {
      if ((k === 'enter' || k === ' ') && !onBtn) { e.preventDefault(); startMatch(); }
      else if (k === 's') { e.preventDefault(); showResults(); }
      else if (k === 'm' || k === 'escape') { e.preventDefault(); toMenu(); }
      return;
    }
    if (k === 'escape') { if (running && !over) { e.preventDefault(); togglePause(); } return; }
    var a = KEYS[k]; if (!a || !running) return;
    if (onBtn) return;   // a focused on-screen button handles its own press
    e.preventDefault();
    if (!humanTurn()) return;
    if (e.repeat && (a === 'ok' || a === 'cw' || a === 'ccw')) return;
    act(a);
  });

  // ------------------------------------------------------------------ the computer: the same rules, and it never answers wrong
  function aiEval(c) {
    var b = G.board.map(function (r) { return r.slice(); });
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
  function landing(c) { var d = clone(c); while (fits(d.map(function (q) { return [q[0], q[1] + 1]; }))) d = d.map(function (q) { return [q[0], q[1] + 1]; }); return d; }
  function aiPlan() {
    var q = G.ai.queue = [], think = level === 'hard' ? 900 : 1200, mv = 230;
    if (G.phase === 'place') {
      // it can't know the instruction yet, so it scores each start by the instructions that could come
      var b = box(G.cur), best = null, bestS = -Infinity;
      for (var x = 0; x + b.w <= W; x++) {
        var c = translate(G.cur, x - b.x0), top = rankedQuestions(c), tot = 0;
        top.forEach(function (t) { tot += t.s; });
        var s = tot / top.length + Math.random() * 1.5;
        if (s > bestS) { bestS = s; best = x; }
      }
      var dx = best - b.x0; q.push({ a: null, t: think });
      for (var i = 0; i < Math.abs(dx); i++) q.push({ a: dx > 0 ? 'right' : 'left', t: mv });
      q.push({ a: 'ok', t: 350 });
      G.ai.plan = 'place';
      return;
    }
    var st = step(); q.push({ a: null, t: think });
    if (st.type === 'T') {
      for (var j = 0; j < Math.abs(st.dx); j++) q.push({ a: st.dx > 0 ? 'right' : 'left', t: mv });
      for (var j2 = 0; j2 < Math.abs(st.dy || 0); j2++) q.push({ a: st.dy > 0 ? 'down' : 'up', t: mv });
    }
    else if (st.type === 'R') { for (var k = 0; k < Math.abs(st.turns); k++) q.push({ a: st.turns > 0 ? 'cw' : 'ccw', t: 520 }); }
    else {
      var bb = box(G.cur);
      if (st.axis === 'v') q.push({ a: (bb.x0 + bb.x1) / 2 < st.a ? 'right' : 'left', t: mv });
      else q.push({ a: (bb.y0 + bb.y1) / 2 < st.b ? 'down' : 'up', t: mv });
    }
    q.push({ a: 'ok', t: 500 });
    G.ai.plan = 'xf' + G.si;
  }
  function aiTick(dt) {
    if (G.phase !== 'place' && G.phase !== 'xf') { G.ai.queue = []; return; }
    var want = G.phase === 'place' ? 'place' : 'xf' + G.si;
    if (G.ai.plan !== want) { aiPlan(); G.ai.wait = 0; }
    G.ai.wait -= dt;
    while (G.ai.wait <= 0 && G.ai.queue.length) {
      var n = G.ai.queue.shift(); G.ai.wait += n.t;
      if (n.a) {
        if (n.a === 'ok' && G.phase === 'xf' && !rotIdle()) { G.ai.queue.unshift(n); G.ai.wait = 120; return; }
        act(n.a); if (G.ai.plan !== want) return;
      }
    }
  }

  // ------------------------------------------------------------------ the loop
  var lastT = 0;
  function frame(t) {
    var dt = Math.min(50, t - (lastT || t)); lastT = t;
    if (running && !paused) update(dt);
    if (G && UI.cv) draw();
    requestAnimationFrame(frame);
  }
  function update(dt) {
    if (!G) return;
    if (G.demo) { G.demo.t += dt; if (G.demo.t >= G.demo.dur + 500) endDemo(); return; }   // the replay of the correct move
    if (!G.rot.drag && G.rot.angle !== G.rot.target) {   // the paper turns smoothly through every quarter-turn on the way
      var sp = (CALM ? 900 : 300) * dt / 1000, d = G.rot.target - G.rot.angle;
      G.rot.angle = Math.abs(d) <= sp ? G.rot.target : G.rot.angle + Math.sign(d) * sp;
    }
    if (G.phase === 'drop') {
      G.dropT += dt;
      while (G.dropT >= 28 && G.phase === 'drop') {
        G.dropT -= 28;
        var dn = G.drop.map(function (q) { return [q[0], q[1] + 1]; });
        if (fits(dn)) G.drop = dn; else lock();
      }
    } else if (G.phase === 'clear') {
      G.clearT += dt; if (G.clearT > 380) finishClear();
    } else if (G.phase === 'wait') {
      G.waitT += dt;
      if (G.waitT > 450) {
        if (versus()) G.turn = nextTurn();
        startTurn();
      }
    }
    if (!over && cur().kind === 'cpu') aiTick(dt);
    if (over && performance.now() - overAt > 1500) showOver();
  }

  // ------------------------------------------------------------------ drawing the board
  function paperHalf() {
    var st = step(), m = 0;
    G.stepStart.forEach(function (q) { [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (d) { m = Math.max(m, Math.hypot(q[0] + d[0] - st.px, q[1] + d[1] - st.py)); }); });
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

  function draw() {
    var g = UI.ctx, s = cell, BW = W * s, BH = H * s;
    g.clearRect(0, 0, BW, BH);
    g.fillStyle = '#0d1333'; g.fillRect(0, 0, BW, BH);
    var tc = ZONETINT[G.piece ? G.piece.owner : 0];   // the zone takes the color of whose turn it is
    g.fillStyle = tc; g.fillRect(0, 0, BW, Z * s);
    g.strokeStyle = 'rgba(140, 160, 255, 0.16)'; g.lineWidth = 1; g.beginPath();
    for (var x = 0; x <= W; x++) { g.moveTo(x * s + 0.5, 0); g.lineTo(x * s + 0.5, BH); }
    for (var y = 0; y <= H; y++) { g.moveTo(0, y * s + 0.5); g.lineTo(BW, y * s + 0.5); }
    g.stroke();
    g.font = '900 ' + Math.max(9, Math.round(s * 0.36)) + 'px Nunito, sans-serif'; g.fillStyle = 'rgba(180, 200, 255, 0.28)'; g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillText(T('TRANSFORM ZONE', 'ZONA DE TRANSFORMACIÓN'), BW / 2, 4);
    for (y = Z; y < H; y++) for (x = 0; x < W; x++) if (G.board[y][x]) {
      var flashRow = G.phase === 'clear' && G.clearRows.indexOf(y) >= 0;
      blockAt(g, x * s, y * s, s, flashRow ? (Math.floor(G.clearT / 70) % 2 ? '#ffffff' : G.board[y][x]) : G.board[y][x]);
    }
    g.save(); g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(2, s * 0.12); g.setLineDash([s * 0.28, s * 0.22]);
    g.beginPath(); g.moveTo(0, Z * s); g.lineTo(BW, Z * s); g.stroke(); g.restore();
    var st = step();
    if (G.phase === 'place') {
      G.cur.forEach(function (q) { blockAt(g, q[0] * s, q[1] * s, s, G.piece.color); });
      var b = box(G.cur);
      arrow(g, b.x0 * s - 4, (b.y0 + b.h / 2) * s, b.x0 * s - s * 0.9, (b.y0 + b.h / 2) * s, 'rgba(255,255,255,0.55)', 3, 9);
      arrow(g, b.x1 * s + 4, (b.y0 + b.h / 2) * s, b.x1 * s + s * 0.9, (b.y0 + b.h / 2) * s, 'rgba(255,255,255,0.55)', 3, 9);
    } else if (G.phase === 'xf' && st) {
      outline(g, G.start, 'rgba(255,255,255,0.55)', [4, 3], 2, 'rgba(255,255,255,0.07)');   // the ghost: the pre-image where it started
      if (G.si > 0) outline(g, G.stepStart, 'rgba(255,255,255,0.3)', [2, 4], 1.5);
      if (G.showTarget) outline(g, apply(st, G.stepStart), '#ffd84d', [5, 4], 2.5);
      if (st.type === 'F' && (!st.hidden || G.demo)) drawLines(st);   // Hard draws no lines (the replay shows the one it used)
      if (G.demo) drawDemo();
      else if (st.type === 'R') drawPaper(st);
      else G.cur.forEach(function (q) { blockAt(g, q[0] * s, q[1] * s, s, G.piece.color); });
    } else if (G.phase === 'drop' && G.drop) {
      G.drop.forEach(function (q) { blockAt(g, q[0] * s, q[1] * s, s, G.piece.color); });
    }
    if (over || paused) { g.fillStyle = 'rgba(5, 8, 22, 0.45)'; g.fillRect(0, 0, BW, BH); }
    players.forEach(drawNext);
  }
  function drawLines(st) {
    var g = UI.ctx, s = cell;
    g.save(); g.lineWidth = Math.max(2, s * 0.12); g.setLineDash([s * 0.3, s * 0.18]);
    g.strokeStyle = '#ff7ab0'; g.beginPath(); g.moveTo(st.a * s, 0); g.lineTo(st.a * s, Z * s); g.stroke();
    g.strokeStyle = '#4ee6a6'; g.beginPath(); g.moveTo(0, st.b * s); g.lineTo(W * s, st.b * s); g.stroke();
    g.restore();
    // each line's label goes at the end farther from the figure, so it never covers a square
    var fb = box(G.cur), fx = (fb.x0 + fb.x1) / 2, fy = (fb.y0 + fb.y1) / 2;
    tag(g, T('vertical line', 'línea vertical'), Math.min(Math.max(st.a * s, s * 1.8), W * s - s * 1.8), fy < Z / 2 ? Z * s - s * 0.45 : s * 0.45, '#ff9cc4');
    tag(g, T('horizontal line', 'línea horizontal'), fx > W / 2 ? s * 1.9 : W * s - s * 1.9, st.b * s + (fy < st.b ? s * 0.45 : -s * 0.45), '#7dffc4');
  }
  function drawPaper(st) {
    var g = UI.ctx, s = cell, cx = st.px * s, cy = st.py * s, hs = paperHalf() * s, ang = G.rot.angle * Math.PI / 180;
    // the tracing paper with the figure on it, turning around the red point
    g.save(); g.translate(cx, cy); g.rotate(ang);
    g.fillStyle = 'rgba(180, 210, 255, 0.17)'; g.strokeStyle = 'rgba(140, 185, 255, 0.85)'; g.lineWidth = 2;
    g.fillRect(-hs, -hs, hs * 2, hs * 2); g.strokeRect(-hs, -hs, hs * 2, hs * 2);
    g.translate(-cx, -cy);
    G.stepStart.forEach(function (q) { blockAt(g, q[0] * s, q[1] * s, s, G.piece.color, 0.95); });
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
    g.beginPath(); g.arc(ex, ey, Math.max(8, s * 0.42), 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();   // the handle
    g.lineWidth = 3; g.strokeStyle = '#ffd23c'; g.stroke();
    g.fillStyle = '#7a5a00'; g.font = '900 ' + Math.max(10, Math.round(s * 0.5)) + 'px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⟳', ex, ey + 1);
    g.beginPath(); g.arc(cx, cy, Math.max(5, s * 0.24), 0, Math.PI * 2); g.fillStyle = '#ff3b3b'; g.fill();   // the fixed red point
    g.beginPath(); g.arc(cx, cy, Math.max(2, s * 0.09), 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
    var turns = Math.round(G.rot.angle / 90), deg = Math.round(Math.abs(G.rot.angle));
    var lbl = deg === 0 ? T('0° · 0 turns', '0° · 0 vueltas') : deg + '° ' + (G.rot.angle > 0 ? T('CW', 'horario') : T('CCW', 'antihorario')) + ' · ' + turnsWord(turns);
    var ly = cy + hs + s * 0.55 > Z * s ? cy - hs - s * 0.5 : cy + hs + s * 0.55;
    tag(g, lbl, Math.min(Math.max(cx, s * 2.4), W * s - s * 2.4), Math.max(s * 0.5, ly), '#ffd84d');
  }
  // the replay: the correct move played slowly from the step's start (a slide, the paper turning, or a flip across its line)
  function drawDemo() {
    var g = UI.ctx, s = cell, d = G.demo, st = d.st, u = Math.min(1, d.t / d.dur);
    u = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;                       // ease in and out
    var col = G.piece.color;
    g.save();
    if (st.type === 'T') {
      g.translate(st.dx * u * s, (st.dy || 0) * u * s);
      d.from.forEach(function (q) { blockAt(g, q[0] * s, q[1] * s, s, col, 0.9); });
    } else if (st.type === 'R') {
      var cx = st.px * s, cy = st.py * s, ang = st.turns * 90 * u * Math.PI / 180;
      g.translate(cx, cy); g.rotate(ang); g.translate(-cx, -cy);
      d.from.forEach(function (q) { blockAt(g, q[0] * s, q[1] * s, s, col, 0.9); });
      g.restore(); g.save();
      g.beginPath(); g.arc(cx, cy, Math.max(5, s * 0.24), 0, Math.PI * 2); g.fillStyle = '#ff3b3b'; g.fill();
      tag(g, Math.round(Math.abs(st.turns) * 90 * u) + '° ' + (st.turns > 0 ? T('CW', 'horario') : T('CCW', 'antihorario')), Math.min(Math.max(cx, s * 2.4), W * s - s * 2.4), Math.max(s * 0.5, cy - s * 1.2), '#ffd84d');
    } else {
      var k = 1 - 2 * u;                                                                // the mirror squeezes to the line and opens on the other side
      if (st.axis === 'v') { g.translate(st.a * s, 0); g.scale(k || 0.001, 1); g.translate(-st.a * s, 0); }
      else { g.translate(0, st.b * s); g.scale(1, k || 0.001); g.translate(0, -st.b * s); }
      d.from.forEach(function (q) { blockAt(g, q[0] * s, q[1] * s, s, col, 0.9); });
    }
    g.restore();
    tag(g, T('Watch: the correct move', 'Mira: el movimiento correcto'), W * s / 2, s * 0.6, '#ffd84d', 'rgba(60, 40, 0, 0.85)');
  }
  function drawNext(p) {
    if (!p.nextCv || !p.next) return;
    var g = p.nextCv.getContext('2d'), b = box(p.next.cells), sz = Math.min(13, Math.floor(Math.min(80 / b.w, 46 / b.h)));
    g.clearRect(0, 0, 84, 50);
    var ox = (84 - b.w * sz) / 2, oy = (50 - b.h * sz) / 2;
    p.next.cells.forEach(function (q) { blockAt(g, ox + q[0] * sz, oy + q[1] * sz, sz, p.next.color); });
  }

  // ------------------------------------------------------------------ the panels
  var msgKind = '', msgText = '';
  function setMsg(kind, text) { msgKind = kind; msgText = text; }
  function render() {
    if (!G) return;
    var p = cur(), st = step(), html;
    UI.turnEl.className = 'turn ' + pcls(p);
    UI.turnEl.textContent = over ? T('Game over', 'Fin del juego') : mode === 'practice' ? T('Practice', 'Práctica') : p.kind === 'cpu' ? T("Computer's turn", 'Turno de la computadora') : (mode === 'pvp' ? p.name + T("'s turn", ': tu turno') : T('Your turn', 'Tu turno'));
    if (G.phase === 'place') html = '<div class="lbl">' + T('Choose the start', 'Elige el inicio') + '</div><div class="txt">' + (p.kind === 'cpu' ? T('The computer is choosing where its figure starts.', 'La computadora elige dónde empieza su figura.') : T('Move the figure left or right, then confirm the start.', 'Mueve la figura a la izquierda o la derecha y confirma el inicio.')) + '</div>';
    else if (G.steps && G.steps.length > 1) html = '<div class="lbl">' + T('Do these in order', 'Hazlas en orden') + '</div><ol>' + G.steps.map(function (s2, k) {
      return '<li class="' + (k < G.si || G.phase !== 'xf' ? 'done' : k === G.si ? 'now' : 'later') + '">' + shortText(s2) + '</li>'; }).join('') + '</ol>';
    else if (G.steps) html = '<div class="lbl">' + T('Transform', 'Transforma') + '</div><div class="txt">' + stepText(G.steps[0]) + '</div>';
    else html = '';
    UI.askEl.innerHTML = html;
    UI.msgEl.className = 'msg ' + (msgKind || ''); UI.msgEl.innerHTML = msgText || '';
    UI.cv.setAttribute('aria-label', T('The board. ', 'El tablero. ') + UI.turnEl.textContent + '. ' + (st && G.phase === 'xf' ? stepText(st).replace(/&rsquo;/g, "'") : ''));
    var B = UI.btn, mine = humanTurn() && !G.demo, place = mine && G.phase === 'place', xf = mine && G.phase === 'xf', t = st && st.type;
    var vMove = t === 'T' && level === 'hard';
    B.left.disabled = B.right.disabled = !(place || (xf && (t === 'T' || t === 'F')));
    B.up.disabled = B.down.disabled = !(xf && (t === 'F' || t === 'R' || vMove));
    B.cw.disabled = B.ccw.disabled = !(xf && t === 'R');
    B.reset.disabled = !xf;
    B.ok.disabled = !(place || xf);
    B.ok.className = 'ok' + (G.phase === 'place' ? ' start' : '');
    B.ok.textContent = G.phase === 'place' ? T('✓ Confirm start', '✓ Confirmar inicio') : T('✓ Check', '✓ Comprobar');
    UI.goalEl.innerHTML = versus() ? T('First to <b>', 'Gana quien complete <b>') + GOAL[level] + T(' rows</b> wins', ' filas</b> primero')
      : T('<b>Practice</b>: no Xs, no opponent', '<b>Práctica</b>: sin X ni rival');
    players.forEach(function (q) {
      var xs = q.xsEl.children; for (var i = 0; i < 3; i++) xs[i].className = i < q.xs ? 'on' : '';
      q.xsEl.style.display = versus() ? '' : 'none';
      q.xsEl.setAttribute('aria-label', T('Xs: ', 'X: ') + q.xs + T(' of 3', ' de 3'));
      q.statsEl.innerHTML = '<span>' + T('Rows', 'Filas') + ' <b>' + q.rows + (versus() ? ' / ' + GOAL[level] : '') + '</b></span><span>' + T('First try', 'A la primera') + ' <b>' + q.firstTry + (solo() ? ' / ' + q.solved : '') + '</b></span>';
      q.card.classList.toggle('active', !over && q === p);
      q.card.classList.toggle('out', !!q.dead && q !== winner);
      q.nameEl.textContent = q.name + (q.dead && q !== winner ? T(' · out', ' · fuera') : '');
    });
    var left = RISE_EVERY[level] - (G.placed % RISE_EVERY[level]);
    UI.riseEl.textContent = versus() ? T('The floor rises in ', 'El piso sube en ') + left + (left === 1 ? T(' piece', ' pieza') : T(' pieces', ' piezas')) : '';
    if (UI.helpEl) UI.helpEl.innerHTML = humanTurn() && !G.demo ? keysNow() : '';
  }
  // only the keys that do something right now (Start over, Where is my figure and the menu keys still work, unlisted)
  function keysNow() {
    var st = step(), go = '<kbd>' + T('Space', 'Espacio') + '</kbd> ';
    if (G.phase === 'place') return T('<kbd>←</kbd> <kbd>→</kbd> move · ', '<kbd>←</kbd> <kbd>→</kbd> mover · ') + go + T('confirm the start', 'confirmar el inicio');
    if (G.phase !== 'xf' || !st) return '';
    var check = ' · ' + go + T('check', 'comprobar');
    if (st.type === 'T') return (level === 'hard' ? T('<kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> move', '<kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> mover') : T('<kbd>←</kbd> <kbd>→</kbd> move', '<kbd>←</kbd> <kbd>→</kbd> mover')) + check;
    if (st.type === 'R') return T('<kbd>↑</kbd> turn clockwise · <kbd>↓</kbd> turn counterclockwise', '<kbd>↑</kbd> girar en sentido horario · <kbd>↓</kbd> girar en sentido antihorario') + check;
    return T('<kbd>←</kbd> <kbd>→</kbd> flip across the vertical line · <kbd>↑</kbd> <kbd>↓</kbd> flip across the horizontal line', '<kbd>←</kbd> <kbd>→</kbd> reflejar sobre la línea vertical · <kbd>↑</kbd> <kbd>↓</kbd> reflejar sobre la línea horizontal') + check;
  }
  var flashTimer = 0;
  function flash(txt, col) {
    UI.banner.textContent = txt; UI.banner.style.color = col || '#fff';
    clearTimeout(flashTimer); flashTimer = setTimeout(function () { UI.banner.textContent = ''; }, 1300);
  }
  function focusBoard() { try { UI.cv.focus({ preventScroll: true }); } catch (e) {} }

  // ------------------------------------------------------------------ screens
  function show(id) { ['scr-title', 'scr-how', 'scr-pause', 'scr-over'].forEach(function (s) { $(s).hidden = s !== id; }); }
  function play() { startMatch(); }
  function startMatch() {
    var n = solo() ? 1 : mode === 'pvp' ? count : 2;
    many = n > 2; players = [];
    for (var i = 0; i < n; i++) players.push(makePlayer(i, i === 1 && mode === 'cpu' ? 'cpu' : 'human'));
    G = { board: [], turn: 0, placed: 0, phase: 'idle' };
    for (var y = 0; y < H; y++) G.board.push(emptyRow());
    buildUI();
    $('match').hidden = false; $('btn-menu').hidden = false; show(null);
    $('btn-finish').hidden = mode !== 'practice';
    running = true; paused = false; over = false; winner = null;
    if (window.SiteResults) SiteResults.reset();
    layout(); setTimeout(layout, 50);
    say(T('Transformania. ', 'Transformania. ') + (mode === 'practice' ? T('Practice: no Xs and no opponent. Press Escape, then F, to finish and see your results.', 'Práctica: sin X ni rival. Pulsa Escape y luego F para terminar y ver tus resultados.')
      : (mode === 'pvp' ? (n === 2 ? T('Player 1 and Player 2 take turns on one board.', 'El Jugador 1 y el Jugador 2 se turnan en un tablero.') : T('Players 1 to ' + n + ' take turns on one board.', 'Los jugadores del 1 al ' + n + ' se turnan en un tablero.')) : T('You and the computer take turns on one board.', 'Tú y la computadora se turnan en un tablero.'))
        + ' ' + T('First to ', 'Gana quien complete ') + GOAL[level] + T(' rows wins.', ' filas primero.')));
    startTurn();
  }
  function togglePause() {
    if (over || !running) return;
    paused = !paused; show(paused ? 'scr-pause' : null);
    if (paused) $('btn-resume').focus(); else { focusBoard(); render(); }
  }
  function finishPractice() {
    if (!G) return;
    running = true; over = true; winner = null; overAt = performance.now() - 2000;
    paused = false; show(null); showOver();
  }
  function showOver() {
    if (!running) return;
    running = false;
    var txt, why;
    if (mode === 'practice') {
      var p0 = players[0];
      txt = T('Practice finished', 'Práctica terminada');
      why = p0.solved + T(' transformations, ', ' transformaciones, ') + p0.firstTry + T(' right on the first try.', ' correctas a la primera.');
      sfx('win');
    } else {
      var lo = G.lastOut;
      txt = winner.kind === 'cpu' ? T('The computer wins', 'Gana la computadora') : (mode === 'pvp' ? T(winner.name + ' wins!', '¡' + winner.name + ' gana!') : T('You win!', '¡Ganaste!'));
      if (G.endWhy === 'goal') why = winner.name + T(' cleared ', ' completó ') + winner.rows + T(' rows first.', ' filas primero.');
      else {
        why = lo.name + (lo.dead === 'xs' ? T(' reached three Xs.', ' llegó a tres X.') : T(' dropped a piece that stopped above the dotted line.', ' soltó una pieza que quedó arriba de la línea punteada.'));
        if (many) why += ' ' + T(winner.name + ' is the last player left.', winner.name + ' es quien queda en juego.');
      }
      sfx(winner.kind === 'cpu' ? 'lose' : 'win');
    }
    // records for My Stats (the people at this computer; the computer doesn't count)
    bump('transformania_games');
    if (mode !== 'practice' && winner.kind !== 'cpu') { bump('transformania_wins'); if (mode === 'cpu' && level === 'hard') store('transformania_hard_win', 1); }
    players.forEach(function (p) {
      if (p.kind === 'cpu') return;
      store('transformania_solved', (+store('transformania_solved') || 0) + p.solved); store('transformania_firsttry', (+store('transformania_firsttry') || 0) + p.firstTry);
      if (p.rows > (+store('transformania_best_rows') || 0)) store('transformania_best_rows', p.rows);
    });
    $('over-title').textContent = txt; $('over-why').textContent = why;
    $('over-stats').innerHTML = players.map(function (p) {
      return '<div><span>' + p.name + '</span><b>' + p.rows + T(' rows', ' filas') + '</b><span>' + p.solved + T(' transformations · ', ' transformaciones · ') + p.firstTry + T(' first try', ' a la primera') + '</span></div>'; }).join('');
    $('btn-results').hidden = !window.SiteResults;
    show('scr-over'); $('btn-again').focus();
    say(txt + '. ' + why + ' ' + T('Enter plays again, S shows results by skill, M goes to the menu.', 'Enter juega otra vez, S muestra los resultados, M va al menú.'));
  }
  function showResults() { if (window.SiteResults) SiteResults.show({ title: T('Your results', 'Tus resultados') }); }
  function toMenu() {
    running = false; over = false; paused = false; players = []; G = null;
    $('match').hidden = true; $('match').innerHTML = ''; $('btn-menu').hidden = true; show('scr-title');
    syncTitle(); $('btn-play').focus();
  }
  function syncTitle() {
    document.querySelectorAll('#tm [data-mode]').forEach(function (o) { o.setAttribute('aria-pressed', String(o.getAttribute('data-mode') === mode)); });
    document.querySelectorAll('#tm [data-level]').forEach(function (o) { o.setAttribute('aria-pressed', String(o.getAttribute('data-level') === level)); });
    document.querySelectorAll('#tm [data-skill]').forEach(function (o) { o.setAttribute('aria-pressed', String(!!skills[o.getAttribute('data-skill')])); });
    $('skills-row').hidden = mode !== 'practice';
    document.querySelectorAll('#tm [data-count]').forEach(function (o) { o.setAttribute('aria-pressed', String(+o.getAttribute('data-count') === count)); });
    $('count-row').hidden = mode !== 'pvp';
  }
  function chooseCount(n) { count = n; syncTitle(); sfx('move'); say(n + T(' players', ' jugadores')); }
  function chooseMode(m) { mode = m; syncTitle(); sfx('move'); say(m === 'pvp' ? T('Player versus player, ' + count + ' players. Keys 2 to 4 choose how many.', 'Jugador contra jugador, ' + count + ' jugadores. Las teclas 2 a 4 eligen cuántos.') : m === 'practice' ? T('Practice. Keys 1 to 4 choose the skills.', 'Práctica. Las teclas 1 a 4 eligen las destrezas.') : T('Player versus computer', 'Jugador contra computadora')); }
  function chooseLevel(l) { level = l; syncTitle(); sfx('move'); say(l === 'hard' ? T('Hard', 'Difícil') : T('Normal', 'Normal')); }
  function toggleSkill(s) {
    skills[s] = !skills[s];
    if (!skills.T && !skills.R && !skills.F && !skills.seq) skills[s] = true;   // at least one skill stays on
    syncTitle(); sfx('move');
    say({ T: T('Translations', 'Traslaciones'), R: T('Rotations', 'Rotaciones'), F: T('Reflections', 'Reflexiones'), seq: T('Sequences', 'Secuencias') }[s] + ' ' + (skills[s] ? T('on', 'sí') : T('off', 'no')));
  }
  function openHow() { show('scr-how'); $('btn-how-back').focus(); }
  function closeHow() { show('scr-title'); $('btn-play').focus(); }

  document.querySelectorAll('#tm [data-mode]').forEach(function (b) { b.addEventListener('click', function () { chooseMode(b.getAttribute('data-mode')); }); });
  document.querySelectorAll('#tm [data-level]').forEach(function (b) { b.addEventListener('click', function () { chooseLevel(b.getAttribute('data-level')); }); });
  document.querySelectorAll('#tm [data-skill]').forEach(function (b) { b.addEventListener('click', function () { toggleSkill(b.getAttribute('data-skill')); }); });
  document.querySelectorAll('#tm [data-count]').forEach(function (b) { b.addEventListener('click', function () { chooseCount(+b.getAttribute('data-count')); }); });
  $('btn-play').addEventListener('click', function () { ac(); play(); });
  $('btn-how').addEventListener('click', openHow);
  $('btn-how-back').addEventListener('click', closeHow);
  $('btn-menu').addEventListener('click', togglePause);
  $('btn-resume').addEventListener('click', togglePause);
  $('btn-restart').addEventListener('click', function () { paused = false; startMatch(); });
  $('btn-finish').addEventListener('click', finishPractice);
  $('btn-quit').addEventListener('click', toMenu);
  $('btn-again').addEventListener('click', startMatch);
  $('btn-over-menu').addEventListener('click', toMenu);
  $('btn-results').addEventListener('click', showResults);

  $('how-list').innerHTML = [
    T('Players <b>take turns on one board</b>: you place a piece, then the computer (or the next player) places one. <b>Player vs Player</b> is for 2 to 4 people on one device. <b>Practice</b> is just you, with the skills you choose and no Xs.', 'Los jugadores <b>se turnan en un tablero</b>: tú colocas una pieza y luego la computadora (o el siguiente jugador) coloca otra. <b>Jugador contra jugador</b> es para 2 a 4 personas en un dispositivo. En <b>Práctica</b> juegas solo, con las destrezas que eliges y sin X.'),
    T('A figure appears above the <b>white dotted line</b>. Slide it left or right to choose where it starts, then press <b>Confirm start</b>.', 'Una figura aparece arriba de la <b>línea blanca punteada</b>. Deslízala a la izquierda o la derecha para elegir dónde empieza y pulsa <b>Confirmar inicio</b>.'),
    T('An instruction appears, and a faint <b>ghost</b> keeps the starting figure (the pre-image) in place.', 'Aparece una instrucción, y una <b>figura tenue</b> deja la figura inicial (la preimagen) en su lugar.'),
    T('<b>Translate</b>: slide with ◀ ▶ and count the grid units (on Hard, ▲ ▼ too).', '<b>Traslada</b>: desliza con ◀ ▶ y cuenta las unidades (en Difícil, también ▲ ▼).'),
    T('<b>Rotate</b>: the figure is on tracing paper pinned at a <b>red point</b>. Press ▲ to turn it clockwise and ▼ counterclockwise (or ⟳ ⟲, or drag the handle). Each turn is <b>90°</b>: 180° is 2 turns, 270° is 3, 360° is 4. The red arrow on the paper starts pointing up.', '<b>Rota</b>: la figura está en papel de calcar fijo en un <b>punto rojo</b>. Pulsa ▲ para girarlo en sentido horario y ▼ en sentido antihorario (o ⟳ ⟲, o arrastra el asa). Cada vuelta es de <b>90°</b>: 180° son 2 vueltas, 270° son 3 y 360° son 4. La flecha roja del papel empieza apuntando hacia arriba.'),
    T('<b>Reflect</b>: ◀ ▶ flip the figure across the pink <b>vertical</b> line, ▲ ▼ across the green <b>horizontal</b> line. On Hard the lines aren&rsquo;t drawn: the instruction tells you where the line is.', '<b>Refleja</b>: ◀ ▶ reflejan la figura sobre la línea <b>vertical</b> rosa, ▲ ▼ sobre la línea <b>horizontal</b> verde. En Difícil no se dibujan las líneas: la instrucción dice dónde está la línea.'),
    T('Press <b>Check</b>. A correct image drops below the line and stacks. A wrong check tells you what went wrong; the first one on a question adds an <b>X</b>, and after the second you watch the correct move.', 'Pulsa <b>Comprobar</b>. Una imagen correcta cae debajo de la línea y se apila. Un error te dice qué salió mal; el primero de cada pregunta suma una <b>X</b>, y después del segundo ves el movimiento correcto.'),
    T('Fill a whole row to clear it and remove one of your Xs. <b>The first to clear the goal number of rows wins.</b> Three Xs, or a piece that stops above the dotted line, loses (with 3 or 4 players, that player is out and the rest play on until one is left). The floor rises every few pieces.', 'Completa una fila para quitarla y borrar una de tus X. <b>Gana quien complete primero el número de filas de la meta.</b> Pierde quien llega a tres X o suelta una pieza que queda arriba de la línea punteada (con 3 o 4 jugadores, ese jugador queda fuera y los demás siguen hasta que quede uno). El piso sube cada pocas piezas.'),
    T('<b>Hard</b>: turns up to 360°, translations up and down, reflection lines you must picture, and sequences such as &ldquo;rotate 90° clockwise, then translate 2 units left&rdquo;, done in order.', '<b>Difícil</b>: giros hasta 360°, traslaciones hacia arriba y abajo, líneas de reflexión que debes imaginar y secuencias como &ldquo;rota 90° en sentido horario y luego traslada 2 unidades a la izquierda&rdquo;, en orden.')
  ].map(function (x) { return '<li>' + x + '</li>'; }).join('');
  $('how-keys').innerHTML = TOUCH ? '' : T('Keyboard: <kbd>←</kbd> <kbd>→</kbd> move, <kbd>↑</kbd> <kbd>↓</kbd> flip (in a rotation, <kbd>↑</kbd> turns the paper clockwise and <kbd>↓</kbd> counterclockwise), <kbd>Space</kbd> or <kbd>Enter</kbd> confirm and check, <kbd>Esc</kbd> menu. With more than one player, the player whose turn it is uses the same keys.',
    'Teclado: <kbd>←</kbd> <kbd>→</kbd> mover, <kbd>↑</kbd> <kbd>↓</kbd> reflejar (en una rotación, <kbd>↑</kbd> gira el papel en sentido horario y <kbd>↓</kbd> en sentido antihorario), <kbd>Espacio</kbd> o <kbd>Enter</kbd> confirmar y comprobar, <kbd>Esc</kbd> menú. Con varios jugadores, quien tiene el turno usa las mismas teclas.');

  syncTitle();
  show('scr-title');
  requestAnimationFrame(frame);
  // a small hook for automated checks
  window.TM = { get players() { return players; }, get G() { return G; }, act: act, apply: apply, rotateAbout: rotateAbout, reflectV: reflectV, reflectH: reflectH, makeQuestion: makeQuestion, same: same, inZone: inZone, startMatch: startMatch,
    setMode: function (m, l, n) { mode = m; level = l; if (n) count = n; }, update: update, mistakeText: mistakeText, figureWords: figureWords, skills: skills };
})();
