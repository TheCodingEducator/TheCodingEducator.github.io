// Area Artist - the game.
// A hidden picture (area-artist-scenes.js) is cut into rectangles. The camera zooms in on one random rectangle at a
// time; solving its multiplication paints that part of the picture, square by square. After each piece the camera
// zooms out so the student can see the picture growing. Also here: the art studio (Create My Own Art), and the
// gallery of finished pictures and creations, saved in this browser's localStorage under areaartist_*.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var T = window.tl || function (en) { return en; };
  var SC = window.AreaArtistScenes;
  var aa = $('aa'), cv = $('cv'), ctx = cv.getContext('2d');
  var TOUCH = matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (TOUCH) aa.classList.add('touch');

  // e = Product Picasso, h = Multiplication Monet. sizes: the picture's grid (columns x rows) for a short, medium
  // and long picture; art: how many canvas pixels go across each square (each square is one solid color of the picture); create: the art studio's canvases.
  var MODES = {
    e: { key: 'e', name: 'Product Picasso', min: 1, max: 5, art: 8, sizes: [[24, 16], [30, 20], [36, 24]], create: [[15, 10], [24, 16], [30, 20]] },
    h: { key: 'h', name: 'Multiplication Monet', min: 5, max: 12, art: 8, sizes: [[30, 20], [42, 28], [60, 40]], create: [[30, 20], [45, 30], [60, 40]] }
  };
  var LENGTHS = [T('Short', 'Corto'), T('Medium', 'Mediano'), T('Long', 'Largo')];
  var CANVAS_SIZES = [T('Small', 'Pequeño'), T('Medium', 'Mediano'), T('Large', 'Grande')];
  var PALETTE = ['#1a1a24', '#5a5a66', '#a8a8b4', '#ffffff', '#7a3a1e', '#b8743f', '#f2c79a', '#ffe8d0',
    '#e63946', '#ff7b54', '#ffb347', '#ffd23f', '#fff08a', '#8fd14f', '#2fb36b', '#1f6f4a',
    '#7fe0e8', '#4dc9ff', '#2f66d0', '#1b2a6b', '#b56cff', '#7a3ac8', '#ff8ce0', '#ff4d8f'];
  var PRAISE = [T('Beautiful!', '¡Precioso!'), T('Brilliant!', '¡Brillante!'), T('You nailed it!', '¡Lo lograste!'), T('Masterful!', '¡Magistral!'),
    T('Great work!', '¡Buen trabajo!'), T('Perfect!', '¡Perfecto!'), T('What an artist!', '¡Qué artista!'), T('Wonderful!', '¡Maravilloso!')];

  // ---------- saving ----------
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var K = { gallery: 'areaartist_gallery', creations: 'areaartist_creations', recent: 'areaartist_recent', len: 'areaartist_length', cat: 'areaartist_category', studio: 'areaartist_studio', muted: 'areaartist_muted' };

  // ---------- helpers ----------
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function sceneName(s) { return T(s.en, s.es); }
  function dateStr(ms) { try { return new Date(ms).toLocaleDateString(window.SITE_ES ? 'es' : undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return ''; } }
  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  // ---------- sound ----------
  var AC = null, muted = !!load(K.muted, false);
  function tone(f, t0, dur, type, vol) {
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function sfx(name, v) {
    if (muted) return;
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      var t = AC.currentTime;
      if (name === 'good') { tone(523, t, 0.15, 'triangle'); tone(659, t + 0.08, 0.15, 'triangle'); tone(784, t + 0.16, 0.25, 'triangle'); }
      else if (name === 'bad') { tone(220, t, 0.18, 'square', 0.06); tone(180, t + 0.12, 0.22, 'square', 0.06); }
      else if (name === 'pop') tone(600 + (v || 0) * 25, t, 0.06, 'sine', 0.07);
      else if (name === 'done') [523, 659, 784, 1047, 784, 1047].forEach(function (f, k) { tone(f, t + k * 0.12, 0.3, 'triangle', 0.13); });
      else if (name === 'place') { tone(440, t, 0.08, 'triangle', 0.12); tone(660, t + 0.05, 0.1, 'triangle', 0.1); }
      else if (name === 'erase') tone(300, t, 0.1, 'sawtooth', 0.05);
    } catch (e) {}
  }

  // ---------- the canvas and camera ----------
  var VW = 1, VH = 1, DPR = 1;
  var cam = { x: 0, y: 0, s: 10 }, camAnim = null;
  var screen = 'title', game = null, studio = null, pending = null, confetti = [];
  function resize() {
    var r = $('stage').getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    VW = Math.max(1, r.width); VH = Math.max(1, r.height);
    cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
    cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
    if (!camAnim) snapCam();
  }
  function fullCam(W, H, margin) {
    margin = margin === undefined ? 40 : margin;
    return { x: W / 2, y: H / 2, s: Math.max(1, Math.min((VW - margin * 2) / W, (VH - margin * 2) / H)) };
  }
  function pieceCam(pc) {
    var w = pc.w, h = pc.h, pad = Math.max(4, Math.max(w, h) * 0.9);
    var s = Math.min((VW - 110) / (w + pad), (VH - 110) / (h + pad));
    s = Math.min(s, Math.min(VW, VH) / 6.5);
    s = Math.max(s, fullCam(game.W, game.H).s);
    return { x: pc.x + w / 2, y: pc.y + h / 2, s: s };
  }
  function camTarget() {
    if (screen === 'create' && studio) return fullCam(studio.W, studio.H, 24);
    if (!game) return cam;
    if (game.phase === 'done') return doneCam();
    if (game.view === 'piece' && game.cur) return pieceCam(game.cur);
    return fullCam(game.W, game.H);
  }
  function doneCam() {   // the finished picture, moved up above the Masterpiece complete card
    var card = document.querySelector('#doneOv .ovCard'), ch = card ? card.getBoundingClientRect().height + 20 : 0;
    var s = Math.max(1, Math.min((VW - 60) / game.W, (VH - ch - 50) / game.H));
    return { x: game.W / 2, y: game.H / 2 + ch / 2 / s, s: s };
  }
  function snapCam() { var t = camTarget(); cam = { x: t.x, y: t.y, s: t.s }; }
  function camTo(target, dur, done) { camAnim = { a: { x: cam.x, y: cam.y, s: cam.s }, b: target, t0: performance.now(), dur: dur, done: done }; }
  function stepCam(now) {
    var c = camAnim, k = ease(clamp((now - c.t0) / c.dur, 0, 1));
    cam.s = Math.exp(lerp(Math.log(c.a.s), Math.log(c.b.s), k));
    cam.x = lerp(c.a.x, c.b.x, k); cam.y = lerp(c.a.y, c.b.y, k);
    if (k >= 1) { camAnim = null; if (c.done) c.done(); }
  }
  function wait(ms, fn, skippable) { pending = { t: performance.now() + ms, fn: fn, skip: !!skippable }; }
  function skipWait() { if (pending && pending.skip) { var f = pending.fn; pending = null; f(); } }
  function setMsg(txt) { var m = $('stageMsg'); if (txt) { m.textContent = txt; m.classList.add('show'); } else m.classList.remove('show'); }

  // ---------- drawing pieces of the picture ----------
  function drawWall() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var g = ctx.createRadialGradient(VW / 2, VH / 2, 10, VW / 2, VH / 2, Math.max(VW, VH) * 0.75);
    g.addColorStop(0, '#3a3258'); g.addColorStop(1, '#1f1a33');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  function drawFrame(x, y, w, h, s) {
    var t = clamp(s * 0.55, 8, 30);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - t + 6, y - t + 9, w + 2 * t, h + 2 * t);
    ctx.fillStyle = '#c8963e'; ctx.fillRect(x - t, y - t, w + 2 * t, h + 2 * t);
    ctx.fillStyle = '#e8bd66'; ctx.fillRect(x - t, y - t, w + 2 * t, t * 0.3); ctx.fillRect(x - t, y - t, t * 0.3, h + 2 * t);
    ctx.fillStyle = '#9a6e28'; ctx.fillRect(x - t, y + h + t * 0.7, w + 2 * t, t * 0.3); ctx.fillRect(x + w + t * 0.7, y - t, t * 0.3, h + 2 * t);
    ctx.fillStyle = '#7a531c'; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  }
  function gridLines(ox, oy, x, y, w, h, s, col, lw) {
    ctx.beginPath();
    for (var i = 0; i <= w; i++) { var X0 = Math.round(ox + (x + i) * s) + 0.5; ctx.moveTo(X0, oy + y * s); ctx.lineTo(X0, oy + (y + h) * s); }
    for (var j = 0; j <= h; j++) { var Y0 = Math.round(oy + (y + j) * s) + 0.5; ctx.moveTo(ox + x * s, Y0); ctx.lineTo(ox + (x + w) * s, Y0); }
    ctx.strokeStyle = col; ctx.lineWidth = lw || 1; ctx.stroke();
  }
  function tiles(ox, oy, pc, s, col) {   // every square of a piece, drawn as its own tile so it can be counted
    if (s < 7) return;
    var g = Math.max(1, s * 0.08);
    ctx.fillStyle = col;
    for (var j = 0; j < pc.h; j++) for (var i = 0; i < pc.w; i++) ctx.fillRect(ox + (pc.x + i) * s + g, oy + (pc.y + j) * s + g, s - 2 * g, s - 2 * g);
  }
  function pill(text, cx, cy, bg, fs, fg) {
    ctx.font = '700 ' + fs + 'px Fredoka, sans-serif';
    var w = Math.max(fs * 1.25, ctx.measureText(text).width + fs * 0.8), h = fs * 1.35;
    ctx.fillStyle = bg; roundRect(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.fillStyle = fg || '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy + fs * 0.05);
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function bigText(text, cx, cy, fs, col) {
    ctx.font = '700 ' + fs + 'px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(3, fs * 0.16); ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round'; ctx.strokeText(text, cx, cy);
    ctx.fillStyle = col || '#2b2140'; ctx.fillText(text, cx, cy);
  }
  // the size labels along the top (columns, blue) and left (rows, coral) of a rectangle
  function sideLabels(ox, oy, x, y, w, h, s, top, left) {
    var x0 = ox + x * s, y0 = oy + y * s, x1 = x0 + w * s, y1 = y0 + h * s, fs = clamp(Math.round(s * 0.5), 16, 30), gap = fs * 0.9;
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.strokeStyle = '#2f66d0'; ctx.beginPath();
    ctx.moveTo(x0, y0 - gap + 6); ctx.lineTo(x0, y0 - gap); ctx.lineTo(x1, y0 - gap); ctx.lineTo(x1, y0 - gap + 6); ctx.stroke();
    ctx.strokeStyle = '#d94c4c'; ctx.beginPath();
    ctx.moveTo(x0 - gap + 6, y0); ctx.lineTo(x0 - gap, y0); ctx.lineTo(x0 - gap, y1); ctx.lineTo(x0 - gap + 6, y1); ctx.stroke();
    pill(String(top), (x0 + x1) / 2, y0 - gap, '#2f66d0', fs);
    pill(String(left), x0 - gap, (y0 + y1) / 2, '#d94c4c', fs);
  }

  // ---------- cutting a picture into rectangles ----------
  function partition(W, H, m) {
    var out = [], min = m.min, max = m.max;
    function cut(dim) {
      if (min === 1) {   // Product Picasso: mostly sides of 3 to 5, with some 1s and 2s
        var r = Math.random(), a = r < 0.06 ? 1 : r < 0.18 ? 2 : r < 0.42 ? 3 : r < 0.7 ? 4 : 5;
        return Math.min(a, dim - 1);
      }
      return min + Math.floor(Math.random() * (dim - 2 * min + 1));
    }
    (function split(x, y, w, h) {
      var fits = w <= max && h <= max, canW = w >= 2 * min, canH = h >= 2 * min;
      var stop = min === 1 ? 0.88 : 0.72;
      if (fits && (!(canW || canH) || Math.random() < stop)) { out.push({ x: x, y: y, w: w, h: h }); return; }
      var axis;
      if (w > max && h > max) axis = Math.random() < w / (w + h) ? 'w' : 'h';
      else if (w > max) axis = 'w';
      else if (h > max) axis = 'h';
      else axis = canW && canH ? (Math.random() < w / (w + h) ? 'w' : 'h') : canW ? 'w' : 'h';
      if (axis === 'w') { var a = cut(w); split(x, y, a, h); split(x + a, y, w - a, h); }
      else { var b = cut(h); split(x, y, w, b); split(x, y + b, w, h - b); }
    })(0, 0, W, H);
    return out;
  }
  var AVG = {};   // about how many pieces each picture size has, for the size buttons
  function avgPieces(mk, z) {
    var key = mk + z;
    if (!AVG[key]) { var m = MODES[mk], sz = m.sizes[z], n = 0; for (var k = 0; k < 24; k++) n += partition(sz[0], sz[1], m).length; AVG[key] = Math.round(n / 24); }
    return AVG[key];
  }

  // ---------- painting a picture ----------
  function pickScene(cat) {   // a random picture from the category ('any' for all), skipping recently painted ones
    var all = SC.list.filter(function (s) { return cat === 'any' || s.theme === cat; });
    if (!all.length) all = SC.list;
    var recent = load(K.recent, []), list = all.filter(function (s) { return recent.indexOf(s.id) < 0; });
    if (!list.length) list = all;
    var s = pick(list);
    recent.push(s.id); while (recent.length > Math.min(20, SC.list.length - 5)) recent.shift();
    save(K.recent, recent);
    return s;
  }
  function scaleUp(src, k) {
    var c = document.createElement('canvas'); c.width = src.width * k; c.height = src.height * k;
    var x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  function paperCanvas(w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'); x.fillStyle = '#fbf6ec'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#f5eee0';
    for (var k = 0; k < w * h / 14; k++) x.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
    return c;
  }
  function startGame(mk, z) {
    var m = MODES[mk], sz = m.sizes[z], sc = pickScene(catChoice), seed = Math.floor(Math.random() * 2147483647);
    var art = scaleUp(SC.renderSquares(sc.id, seed, sz[0], sz[1]), m.art);
    var pieces = shuffle(partition(sz[0], sz[1], m));
    pieces.forEach(function (pc, k) {
      var r = Math.random();
      pc.kind = pc.w * pc.h === 1 || k === 0 ? 'product' : r < 0.35 ? 'missing' : 'product';
      if (pc.kind === 'missing') pc.hide = Math.random() < 0.5 ? 'w' : 'h';
    });
    var reveal = paperCanvas(art.width, art.height);
    game = { m: m, mk: mk, z: z, W: sz[0], H: sz[1], k: m.art, scene: sc, seed: seed, art: art, reveal: reveal, rctx: reveal.getContext('2d'),
      pieces: pieces, idx: 0, cur: null, phase: 'intro', view: 'full', firstTry: 0, streak: 0, gridShown: 0, gridFade: null };
    confetti = [];
    screen = 'play';
    hideOverlays(); show('playPanel'); hide('createPanel');
    $('pMode').textContent = m.name;
    $('qKind').textContent = ''; $('qEq').innerHTML = ''; setFb('', ''); show('checkBtn'); $('checkBtn').disabled = true;
    $('pHint').innerHTML = T('Type your answer and press <b>Enter</b>. Click the picture or press <b>Enter</b> to skip ahead while it zooms. <b>Esc</b> opens the menu.',
      'Escribe tu respuesta y presiona <b>Enter</b>. Haz clic en el cuadro o presiona <b>Enter</b> para adelantar mientras se acerca. <b>Esc</b> abre el menú.');
    resize(); snapCam();
    updateProgress();
    setMsg(T('A mystery picture is hiding under these rectangles...', 'Un cuadro misterioso se esconde bajo estos rectángulos...'));
    wait(1800, nextPiece, true);
    try { cv.focus({ preventScroll: true }); } catch (e) {}
  }
  function updateProgress() {
    var g = game, n = g.pieces.length;
    $('pProg').textContent = T('Piece ', 'Pieza ') + Math.min(n, g.idx + 1) + T(' of ', ' de ') + n;
    $('pStreak').textContent = g.streak >= 3 ? '🔥 ' + g.streak : '';
    $('pBar').style.width = (g.idx / n * 100) + '%';
  }
  function nextPiece() {
    var g = game; if (!g) return;
    setMsg('');
    if (g.idx >= g.pieces.length) return finish();
    var pc = g.cur = g.pieces[g.idx];
    g.gridShown = 0; g.phase = 'zoomIn'; g.view = 'piece';
    updateProgress();
    camTo(camTarget(), 950, function () { g.phase = 'ask'; setupQuestion(); });
  }
  function eqHTML(pc, slot) {   // slot: 'p' (the product), 'w' or 'h' (a missing side)
    var inp = '<input class="ans" id="ans" autocomplete="off" maxlength="3" inputmode="numeric" aria-label="' + T('Your answer', 'Tu respuesta') + '"' + (TOUCH ? ' readonly' : '') + '>';
    var h = slot === 'h' ? inp : '<span class="num r">' + pc.h + '</span>';
    var w = slot === 'w' ? inp : '<span class="num c">' + pc.w + '</span>';
    var p = slot === 'p' ? inp : '<span class="num">' + pc.w * pc.h + '</span>';
    return h + '<span>&times;</span>' + w + '<span>=</span>' + p;
  }
  function setupQuestion() {
    var g = game, pc = g.cur;
    $('checkBtn').disabled = false;
    if (pc.kind === 'missing') {
      $('qKind').textContent = T('This rectangle has ' + pc.w * pc.h + ' squares. What is the missing side?', 'Este rectángulo tiene ' + pc.w * pc.h + ' cuadritos. ¿Cuánto mide el lado que falta?');
      $('qEq').innerHTML = eqHTML(pc, pc.hide);
    } else {
      $('qKind').textContent = T('How many squares are in this rectangle?', '¿Cuántos cuadritos hay en este rectángulo?');
      $('qEq').innerHTML = eqHTML(pc, 'p');
    }
    setFb('', '');
    $('pHint').innerHTML = T('Type your answer and press <b>Enter</b>. <b>Esc</b> opens the menu.', 'Escribe tu respuesta y presiona <b>Enter</b>. <b>Esc</b> abre el menú.');
    var a = $('ans');
    a.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); check(); } });
    a.addEventListener('input', function () { a.value = a.value.replace(/[^0-9]/g, '').slice(0, 3); a.classList.remove('shake'); });
    if (!TOUCH) try { a.focus({ preventScroll: true }); } catch (e) {}
  }
  function setFb(cls, html) { var f = $('fb'); f.className = 'fb' + (cls ? ' ' + cls : ''); f.innerHTML = html; }
  function shakeInput(a) { if (!a) return; a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); }
  function check() {
    var g = game; if (!g || g.phase !== 'ask') return;
    var pc = g.cur;
    var a = $('ans'), v = parseInt(a.value, 10);
    if (isNaN(v)) { shakeInput(a); if (!TOUCH) a.focus(); return; }
    var want = pc.kind === 'missing' ? (pc.hide === 'w' ? pc.w : pc.h) : pc.w * pc.h;
    if (v === want) return correct();
    a.value = '';
    shakeInput(a);
    if (pc.kind === 'missing') wrong(T('Not quite! Try counting each individual square along the side with the <b>?</b>',
      'Casi. ¡Intenta contar cada cuadrito uno por uno en el lado del <b>?</b>'));
    else wrong(T('Not quite! Try counting each individual square in the rectangle.', 'Casi. ¡Intenta contar cada cuadrito del rectángulo uno por uno!'));
  }
  function wrong(msg) {
    var g = game; g.cur.missed = true; g.streak = 0; g.gridShown++;
    sfx('bad'); setFb('bad', '&#129300; ' + msg); updateProgress();
    if (!TOUCH && $('ans')) $('ans').focus();
  }
  function correct() {
    var g = game, pc = g.cur, a = $('ans');
    if (!pc.missed) g.firstTry++;
    g.streak++;
    sfx('good');
    a.classList.add('good'); a.readOnly = true; a.blur();
    $('checkBtn').disabled = true;
    setFb('good', '&#127881; ' + pick(PRAISE) + ' <b>' + pc.h + ' &times; ' + pc.w + ' = ' + pc.w * pc.h + '</b>');
    updateProgress();
    var n = pc.w * pc.h;
    g.fill = { t0: performance.now(), n: n, done: 0, dur: clamp(n * 55, 500, 1600) };
    g.phase = 'fill';
    try { cv.focus({ preventScroll: true }); } catch (e) {}
  }
  function stepFill(now) {
    var g = game, pc = g.cur, f = g.fill, k = g.k;
    var want = Math.min(f.n, Math.floor((now - f.t0) / f.dur * f.n) + 1);
    while (f.done < want) {
      var cx = pc.x + f.done % pc.w, cy = pc.y + Math.floor(f.done / pc.w);
      g.rctx.drawImage(g.art, cx * k, cy * k, k, k, cx * k, cy * k, k, k);
      f.done++;
      if (f.n <= 30 || f.done % Math.ceil(f.n / 30) === 0) sfx('pop', f.done % 12);
    }
    if (f.done >= f.n) {
      pc.solved = true; g.idx++; g.phase = 'hold';
      updateProgress();
      wait(450, function () {
        if (g.idx >= g.pieces.length) return finish();
        g.phase = 'zoomOut'; g.view = 'full';
        camTo(camTarget(), 600, function () { g.phase = 'look'; wait(450, nextPiece, true); });
      }, true);
    }
  }
  function finish() {
    var g = game;
    g.phase = 'final'; g.view = 'full'; g.cur = null;
    $('qKind').textContent = ''; $('qEq').innerHTML = '';
    $('pBar').style.width = '100%';
    camTo(camTarget(), 1300, function () {
      g.gridFade = performance.now();
      wait(900, function () {
        sfx('done');
        for (var i = 0; i < 160; i++) confetti.push({ x: Math.random() * VW, y: -20 - Math.random() * VH * 0.5, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: pick(PALETTE.slice(8)), s: 5 + Math.random() * 6 });
        var list = load(K.gallery, []);
        list.unshift({ s: g.scene.id, seed: g.seed, m: g.mk, z: g.z, d: Date.now(), ft: g.firstTry, n: g.pieces.length });
        save(K.gallery, list.slice(0, 80));
        g.phase = 'done';
        $('doneTitle').textContent = T('Masterpiece complete!', '¡Obra maestra terminada!');
        $('doneSub').innerHTML = '&ldquo;' + sceneName(g.scene) + '&rdquo; &middot; ' + T(g.firstTry + ' of ' + g.pieces.length + ' pieces right on the first try', g.firstTry + ' de ' + g.pieces.length + ' piezas correctas al primer intento') +
          '<br><small>' + T('Saved to your gallery.', 'Guardado en tu galería.') + '</small>';
        show('doneOv');
        camTo(doneCam(), 700);
        hide('checkBtn'); setFb('good', '&#127912; ' + T('Masterpiece complete!', '¡Obra maestra terminada!'));
        try { $('doneAgain').focus({ preventScroll: true }); } catch (e) {}
      });
    });
  }

  function drawPlay(now) {
    var g = game, s = cam.s, ox = VW / 2 - cam.x * s, oy = VH / 2 - cam.y * s, W = g.W, H = g.H;
    drawWall();
    drawFrame(ox, oy, W * s, H * s, s);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(g.reveal, ox, oy, W * s, H * s);
    var fade = g.gridFade ? clamp(1 - (now - g.gridFade) / 900, 0, 1) : 1;
    if (g.m.key === 'e' && s >= 5 && fade > 0) gridLines(ox, oy, 0, 0, W, H, s, 'rgba(60,40,20,' + (0.16 * fade) + ')', 1);
    var pc = g.cur;
    ctx.strokeStyle = 'rgba(120,95,60,0.5)'; ctx.lineWidth = Math.max(1, Math.min(2, s * 0.08));
    g.pieces.forEach(function (q) { if (!q.solved && q !== pc) ctx.strokeRect(Math.round(ox + q.x * s) + 0.5, Math.round(oy + q.y * s) + 0.5, Math.round(q.w * s), Math.round(q.h * s)); });
    if (!pc) return;
    var x0 = ox + pc.x * s, y0 = oy + pc.y * s, pw = pc.w * s, ph = pc.h * s;
    if (!pc.solved && g.phase !== 'fill') {
      ctx.fillStyle = 'rgba(255,201,60,0.28)'; ctx.fillRect(x0, y0, pw, ph);
      if (g.m.key === 'e' || g.gridShown) tiles(ox, oy, pc, s, 'rgba(255,255,255,0.75)');
    }
    if (!pc.solved && (g.m.key === 'e' || g.gridShown)) gridLines(ox, oy, pc.x, pc.y, pc.w, pc.h, s, 'rgba(60,40,20,0.6)', 1.5);
    if (g.gridShown >= 2 && !pc.solved && s >= 14) {   // after a second miss, number the squares along the sides too
      var fs2 = clamp(s * 0.36, 9, 16);
      ctx.font = '600 ' + fs2 + 'px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#6e6485';
      for (var i = 0; i < pc.w; i++) ctx.fillText(String(i + 1), x0 + (i + 0.5) * s, y0 + s * 0.3);
      for (var j = 1; j < pc.h; j++) ctx.fillText(String(j + 1), x0 + s * 0.3, y0 + (j + 0.5) * s);
    }
    var pulse = 0.5 + 0.5 * Math.sin(now / 250);
    if (!pc.solved) {
      ctx.strokeStyle = 'rgba(255,107,107,' + (0.7 + pulse * 0.3) + ')'; ctx.lineWidth = 3 + pulse * 2;
      ctx.strokeRect(x0, y0, pw, ph);
    }
    var fs = clamp(Math.round(Math.min(pw, ph) * 0.4), 18, 64);
    if (g.phase === 'ask' || g.phase === 'zoomIn') {
      if (pc.kind === 'missing') {
        sideLabels(ox, oy, pc.x, pc.y, pc.w, pc.h, s, pc.hide === 'w' ? '?' : pc.w, pc.hide === 'h' ? '?' : pc.h);
        bigText(String(pc.w * pc.h), x0 + pw / 2, y0 + ph / 2, fs);
      } else {
        sideLabels(ox, oy, pc.x, pc.y, pc.w, pc.h, s, pc.w, pc.h);
        bigText('?', x0 + pw / 2, y0 + ph / 2, fs);
      }
    } else if (g.phase === 'fill') {
      sideLabels(ox, oy, pc.x, pc.y, pc.w, pc.h, s, pc.w, pc.h);
      bigText(String(g.fill.done), x0 + pw / 2, y0 + ph / 2, fs, '#1f8a50');
    } else if (g.phase === 'hold') {
      bigText(String(pc.w * pc.h), x0 + pw / 2, y0 + ph / 2, fs, '#1f8a50');
    }
  }

  function drawConfetti() {
    if (!confetti.length) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    confetti = confetti.filter(function (c) {
      c.x += c.vx; c.y += c.vy; c.vy += 0.03; c.r += c.vr;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.fillStyle = c.c; ctx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2); ctx.restore();
      return c.y < VH + 20;
    });
  }

  // ---------- the art studio ----------
  function startStudio(mk, z, existing) {
    var m = MODES[mk], sz = m.create[z];
    studio = existing ? JSON.parse(JSON.stringify(existing)) : { id: Date.now(), m: mk, z: z, W: sz[0], H: sz[1], bg: '#ffffff', r: [], d: Date.now() };
    m = MODES[studio.m];
    studio.rows = m.key === 'e' ? 3 : 6; studio.cols = m.key === 'e' ? 4 : 8;
    studio.color = 11; studio.tool = 'paint'; studio.undo = []; studio.hover = null;
    solvedSizes = {};
    screen = 'create'; game = null; confetti = [];
    hideOverlays(); hide('playPanel'); show('createPanel'); hide('clearConfirm');
    $('cHint').innerHTML = T('<b>Arrow keys</b> move &middot; <b>Enter</b> paints &middot; <b>R</b> rotates &middot; <b>E</b> eraser &middot; <b>Ctrl+Z</b> undo', '<b>Flechas</b> mueven &middot; <b>Enter</b> pinta &middot; <b>R</b> gira &middot; <b>E</b> borrador &middot; <b>Ctrl+Z</b> deshace');
    buildSwatches(); setTool('paint'); studioEq();
    resize(); snapCam();
  }
  var solvedSizes = {};
  function sizeKey(a, b) { return Math.min(a, b) + 'x' + Math.max(a, b); }
  function studioSolved() { return !!solvedSizes[studio.rows + 'x' + studio.cols]; }
  function studioEq(note) {
    var st = studio, P = st.rows * st.cols, fb = $('cFb');
    $('cRows').textContent = st.rows; $('cCols').textContent = st.cols;
    if (studioSolved()) {
      $('cEq').innerHTML = '<span class="num r">' + st.rows + '</span><span>&times;</span><span class="num c">' + st.cols + '</span><span>=</span><span class="num" style="color:#1f8a50">' + P + '</span>';
      hide('cCheck');
      $('cReady').textContent = T('✓ Ready! Click the canvas to paint it.', '✓ ¡Listo! Haz clic en el lienzo para pintarlo.');
    } else {
      $('cEq').innerHTML = '<span class="num r">' + st.rows + '</span><span>&times;</span><span class="num c">' + st.cols + '</span><span>=</span><input class="ans" id="cAns" autocomplete="off" maxlength="3" inputmode="numeric" aria-label="' + T('Your answer', 'Tu respuesta') + '"' + (TOUCH ? ' readonly' : '') + '>';
      show('cCheck');
      $('cReady').textContent = '';
      var a = $('cAns');
      a.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); studioCheck(); } });
      a.addEventListener('input', function () { a.value = a.value.replace(/[^0-9]/g, '').slice(0, 3); a.classList.remove('shake'); });
    }
    fb.className = 'fb' + (note ? ' ' + note[0] : ''); fb.innerHTML = note ? note[1] : '';
  }
  function studioCheck() {
    var st = studio, a = $('cAns'); if (!a) return;
    var v = parseInt(a.value, 10);
    if (isNaN(v)) { shakeInput(a); return; }
    if (v === st.rows * st.cols) {
      sfx('good');
      solvedSizes[st.rows + 'x' + st.cols] = true;
      studioEq(['good', '&#127881; ' + pick(PRAISE)]);
      try { cv.focus({ preventScroll: true }); } catch (e) {}
    } else {
      sfx('bad'); a.value = ''; shakeInput(a);
      var fb = $('cFb'); fb.className = 'fb bad';
      fb.innerHTML = '&#129300; ' + T('Not quite! Try counting each individual square: ' + st.rows + ' rows with ' + st.cols + ' squares in each row.', 'Casi. ¡Intenta contar cada cuadrito uno por uno: ' + st.rows + ' filas con ' + st.cols + ' cuadritos en cada fila!');
      studio.showCount = true;
      a.focus();
    }
  }
  function setStudioSize(r, c) {
    var m = MODES[studio.m], st = studio;
    r = clamp(r, m.min, m.max); c = clamp(c, m.min, m.max);
    if (r === st.rows && c === st.cols) return;
    var wasFlip = r === st.cols && c === st.rows && solvedSizes[st.rows + 'x' + st.cols];
    st.rows = r; st.cols = c; st.showCount = false;
    if (wasFlip && !studioSolved()) {
      solvedSizes[r + 'x' + c] = true;
      studioEq(['info', T('You rotated it! ' + r + ' &times; ' + c + ' is still ' + r * c + ': rotating a rectangle doesn\'t change how many squares it has.',
        '¡Lo giraste! ' + r + ' &times; ' + c + ' sigue siendo ' + r * c + ': girar un rectángulo no cambia cuántos cuadritos tiene.')]);
    } else studioEq();
  }
  function buildSwatches() {
    var box = $('swatches'); box.innerHTML = '';
    PALETTE.forEach(function (c, k) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sw' + (k === studio.color ? ' on' : ''); b.style.background = c;
      b.setAttribute('aria-label', T('Color ', 'Color ') + (k + 1));
      b.addEventListener('click', function () { studio.color = k; setTool('paint'); Array.prototype.forEach.call(box.children, function (x, q) { x.classList.toggle('on', q === k); }); });
      box.appendChild(b);
    });
  }
  function setTool(t) { studio.tool = t; $('tBrush').classList.toggle('on', t === 'paint'); $('tErase').classList.toggle('on', t === 'erase'); }
  function saveStudio() {
    var st = studio; if (!st) return;
    var list = load(K.creations, []).filter(function (c) { return c.id !== st.id; });
    st.d = Date.now();
    if (st.r.length) list.unshift({ id: st.id, m: st.m, z: st.z, W: st.W, H: st.H, bg: st.bg, r: st.r, d: st.d });
    save(K.creations, list.slice(0, 60));
  }
  function ghostRect(cell) {
    var st = studio, w = st.cols, h = st.rows;
    return { x: clamp(cell.x - Math.floor((w - 1) / 2), 0, st.W - w), y: clamp(cell.y - Math.floor((h - 1) / 2), 0, st.H - h), w: w, h: h };
  }
  function rectAt(cell) {
    for (var k = studio.r.length - 1; k >= 0; k--) { var q = studio.r[k]; if (cell.x >= q[0] && cell.x < q[0] + q[2] && cell.y >= q[1] && cell.y < q[1] + q[3]) return k; }
    return -1;
  }
  function studioAct(cell) {
    var st = studio;
    if (st.tool === 'erase') {
      var k = rectAt(cell); if (k < 0) return;
      st.undo.push({ t: 'erase', k: k, q: st.r[k] }); st.r.splice(k, 1); sfx('erase'); saveStudio(); return;
    }
    if (!studioSolved()) {
      sfx('bad');
      var fb = $('cFb'); fb.className = 'fb bad';
      fb.innerHTML = T('Solve ' + st.rows + ' &times; ' + st.cols + ' first, then you can paint it!', '¡Primero resuelve ' + st.rows + ' &times; ' + st.cols + ' y luego podrás pintarlo!');
      shakeInput($('cAns')); if ($('cAns') && !TOUCH) $('cAns').focus();
      return;
    }
    var g = ghostRect(cell);
    st.r.push([g.x, g.y, g.w, g.h, PALETTE[st.color]]); st.undo.push({ t: 'add' });
    sfx('place'); saveStudio();
  }
  function studioUndo() {
    var st = studio, u = st.undo.pop(); if (!u) return;
    if (u.t === 'add') st.r.pop();
    else if (u.t === 'erase') st.r.splice(u.k, 0, u.q);
    else if (u.t === 'bg') st.bg = u.bg;
    else if (u.t === 'clear') { st.r = u.r; st.bg = u.bg; }
    sfx('erase'); saveStudio();
  }
  function drawStudio(now) {
    var st = studio, s = cam.s, ox = VW / 2 - cam.x * s, oy = VH / 2 - cam.y * s;
    drawWall();
    drawFrame(ox, oy, st.W * s, st.H * s, s);
    ctx.fillStyle = st.bg; ctx.fillRect(ox, oy, st.W * s, st.H * s);
    st.r.forEach(function (q) { ctx.fillStyle = q[4]; ctx.fillRect(Math.round(ox + q[0] * s), Math.round(oy + q[1] * s), Math.round((q[0] + q[2]) * s) - Math.round(q[0] * s), Math.round((q[1] + q[3]) * s) - Math.round(q[1] * s)); });
    if (s >= 5) gridLines(ox, oy, 0, 0, st.W, st.H, s, 'rgba(60,40,20,0.14)', 1);
    if (!st.hover) return;
    if (st.tool === 'erase') {
      var k = rectAt(st.hover);
      if (k >= 0) { var q = st.r[k]; ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.strokeRect(ox + q[0] * s, oy + q[1] * s, q[2] * s, q[3] * s); ctx.setLineDash([]); }
      ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 2; ctx.strokeRect(ox + st.hover.x * s, oy + st.hover.y * s, s, s);
      return;
    }
    var g = ghostRect(st.hover), ok = studioSolved();
    ctx.globalAlpha = ok ? 0.75 : 0.35; ctx.fillStyle = ok ? PALETTE[st.color] : '#8a8f9a';
    ctx.fillRect(ox + g.x * s, oy + g.y * s, g.w * s, g.h * s); ctx.globalAlpha = 1;
    if (st.showCount || MODES[st.m].key === 'e') gridLines(ox, oy, g.x, g.y, g.w, g.h, s, 'rgba(40,30,20,0.55)', 1);
    ctx.strokeStyle = ok ? '#2b2140' : '#6e6485'; ctx.lineWidth = 2.5; if (!ok) ctx.setLineDash([6, 4]);
    ctx.strokeRect(ox + g.x * s, oy + g.y * s, g.w * s, g.h * s); ctx.setLineDash([]);
    sideLabels(ox, oy, g.x, g.y, g.w, g.h, s, g.w, g.h);
  }

  // ---------- pictures as images: the gallery, thumbnails and downloads ----------
  function creationCanvas(c) {
    var cvs = document.createElement('canvas'); cvs.width = c.W; cvs.height = c.H;
    var x = cvs.getContext('2d'); x.fillStyle = c.bg; x.fillRect(0, 0, c.W, c.H);
    c.r.forEach(function (q) { x.fillStyle = q[4]; x.fillRect(q[0], q[1], q[2], q[3]); });
    return cvs;
  }
  var artCache = {};
  function masterpieceCanvas(e) {
    var key = e.s + ':' + e.seed + ':' + e.m + e.z;
    if (!artCache[key]) { var m = MODES[e.m] || MODES.e, sz = m.sizes[e.z] || m.sizes[0]; artCache[key] = SC.renderSquares(e.s, e.seed, sz[0], sz[1]); }
    return artCache[key];
  }
  function download(src, name) {
    var scale = Math.max(1, Math.floor(1500 / src.width)), big = document.createElement('canvas');
    big.width = src.width * scale; big.height = src.height * scale;
    var x = big.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, big.width, big.height);
    var file = 'area-artist-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.png';
    function go(url) { var a = document.createElement('a'); a.href = url; a.download = file; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 500); }
    try {
      if (big.toBlob) big.toBlob(function (b) { if (b) { var u = URL.createObjectURL(b); go(u); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); } });
      else go(big.toDataURL('image/png'));
    } catch (e) {}
  }
  var galTab = 'm', viewing = null;
  function openGallery(tab) {
    if (tab) galTab = tab;
    if (screen === 'play') { screen = 'title'; game = null; pending = null; camAnim = null; confetti = []; setMsg(''); hide('playPanel'); }
    hideOverlays(); show('galOv');
    $('tabM').classList.toggle('on', galTab === 'm'); $('tabC').classList.toggle('on', galTab === 'c');
    var box = $('thumbs'); box.innerHTML = '';
    var list = load(galTab === 'm' ? K.gallery : K.creations, []);
    if (!list.length) {
      box.innerHTML = '<div class="empty" style="grid-column:1/-1">' + (galTab === 'm'
        ? T('No masterpieces yet. Finish a picture in Product Picasso or Multiplication Monet and it will hang here!', 'Todavía no hay obras maestras. ¡Termina un cuadro en Product Picasso o Multiplication Monet y aparecerá aquí!')
        : T('No creations yet. Make your own art in the studio and it will be saved here!', 'Todavía no hay creaciones. ¡Crea tu propia obra en el estudio y se guardará aquí!')) + '</div>';
      return;
    }
    list.forEach(function (e, k) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'thumb';
      var c = document.createElement('canvas'); c.width = 3; c.height = 2; b.appendChild(c);
      var name = galTab === 'm' ? sceneName(SC.byId(e.s)) : T('Creation ', 'Creación ') + (list.length - k);
      var sub = galTab === 'm' ? (MODES[e.m] || MODES.e).name : (MODES[e.m] || MODES.e).name + ' &middot; ' + e.r.length + T(' rectangles', ' rectángulos');
      b.insertAdjacentHTML('beforeend', '<span>' + name + '</span><small>' + sub + '<br>' + dateStr(e.d) + '</small>');
      b.addEventListener('click', function () { openViewer(galTab, e, name); });
      box.appendChild(b);
      setTimeout(function () {   // draw the thumbnails a few at a time so the gallery opens right away
        if (!b.isConnected) return;
        var src = galTab === 'm' ? masterpieceCanvas(e) : creationCanvas(e);
        c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0);
      }, 30 + k * 15);
    });
  }
  function openViewer(tab, e, name) {
    viewing = { tab: tab, e: e, name: name };
    hideOverlays(); show('viewOv'); hide('delConfirm');
    var src = tab === 'm' ? masterpieceCanvas(e) : creationCanvas(e), c = $('viewArt');
    c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0);
    $('viewTitle').textContent = name;
    $('viewSub').innerHTML = (MODES[e.m] || MODES.e).name + ' &middot; ' + dateStr(e.d) + (tab === 'm' && e.n ? ' &middot; ' + T(e.ft + ' of ' + e.n + ' right on the first try', e.ft + ' de ' + e.n + ' correctas al primer intento') : '');
    $('viewEdit').classList.toggle('hidden', tab !== 'c');
  }
  function deleteViewing() {
    var v = viewing; if (!v) return;
    var key = v.tab === 'm' ? K.gallery : K.creations;
    save(key, load(key, []).filter(function (x) { return v.tab === 'm' ? !(x.d === v.e.d && x.seed === v.e.seed) : x.id !== v.e.id; }));
    openGallery(v.tab);
  }

  // ---------- screens ----------
  var OVERLAYS = ['titleOv', 'lenOv', 'csOv', 'galOv', 'viewOv', 'pauseOv', 'doneOv'];
  function hideOverlays() { OVERLAYS.forEach(hide); }
  function goTitle() {
    if (screen === 'create') saveStudio();
    screen = 'title'; game = null; studio = null; pending = null; camAnim = null; confetti = []; setMsg('');
    hideOverlays(); hide('playPanel'); hide('createPanel'); show('titleOv');
    var s = pick(SC.list), art = SC.render(s.id, Math.floor(Math.random() * 1e9), 120, 80), c = $('titleArt');
    c.width = 120; c.height = 80; c.getContext('2d').drawImage(art, 0, 0);
    var nm = load(K.gallery, []).length, nc = load(K.creations, []).length;
    $('gCount').textContent = T(nm + (nm === 1 ? ' masterpiece' : ' masterpieces') + ' · ' + nc + (nc === 1 ? ' creation' : ' creations'),
      nm + (nm === 1 ? ' obra maestra' : ' obras maestras') + ' · ' + nc + (nc === 1 ? ' creación' : ' creaciones'));
    try { $('goE').focus({ preventScroll: true }); } catch (e) {}
  }
  var CATS = [{ v: 'any', ic: '&#127922;', name: T('Surprise me', 'Sorpréndeme') }, { v: 'animals', ic: '&#129418;', name: T('Animals', 'Animales') },
    { v: 'space', ic: '&#128640;', name: T('Space', 'Espacio') }, { v: 'nature', ic: '&#127956;&#65039;', name: T('Nature', 'Naturaleza') }, { v: 'sports', ic: '&#9917;', name: T('Sports', 'Deportes') }, { v: 'pets', ic: '&#128054;', name: T('Pets', 'Mascotas') }, { v: 'fashion', ic: '&#128096;', name: T('Fashion &amp; style', 'Moda y estilo') },
    { v: 'things', ic: '&#9973;', name: T('Objects &amp; vehicles', 'Objetos y vehículos') }];
  var lenMode = 'e', lenChoice = load(K.len, 0), catChoice = load(K.cat, 'any');
  function choose(box, k) { Array.prototype.forEach.call(box.children, function (x, q) { x.classList.toggle('on', q === k); }); }
  function openLength(mk) {
    lenMode = mk; hideOverlays(); show('lenOv');
    var m = MODES[mk];
    $('lenTitle').textContent = m.name;
    $('lenSub').innerHTML = mk === 'e'
      ? T('Rectangles from 1 &times; 1 to 5 &times; 5. Every square is drawn, so you can always count them!', 'Rectángulos de 1 &times; 1 a 5 &times; 5. ¡Cada cuadrito está dibujado, así que siempre puedes contarlos!')
      : T('Rectangles from 5 &times; 5 to 12 &times; 12. The squares only appear if you need help counting.', 'Rectángulos de 5 &times; 5 a 12 &times; 12. Los cuadritos solo aparecen si necesitas ayuda para contar.');
    var cbox = $('catChoices'); cbox.innerHTML = '';
    CATS.forEach(function (c, k) {
      var n = c.v === 'any' ? SC.list.length : SC.list.filter(function (s) { return s.theme === c.v; }).length;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'choice' + (c.v === catChoice ? ' on' : '');
      b.innerHTML = '<span class="ic">' + c.ic + '</span><b>' + c.name + '</b><small>' + n + T(' pictures', ' cuadros') + '</small>';
      b.addEventListener('click', function () { catChoice = c.v; save(K.cat, c.v); choose(cbox, k); });
      cbox.appendChild(b);
    });
    var box = $('lenChoices'); box.innerHTML = '';
    LENGTHS.forEach(function (L, z) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'choice' + (z === lenChoice ? ' on' : '');
      var sz = m.sizes[z];
      b.innerHTML = '<b>' + L + '</b>' + T('about ', 'unas ') + avgPieces(mk, z) + T(' pieces', ' piezas') + '<small>' + sz[0] + ' &times; ' + sz[1] + T(' squares', ' cuadritos') + '</small>';
      b.addEventListener('click', function () { lenChoice = z; save(K.len, z); choose(box, z); });
      b.addEventListener('dblclick', function () { startGame(lenMode, z); });
      box.appendChild(b);
    });
    try { $('lenGo').focus({ preventScroll: true }); } catch (e) {}
  }
  var cs = load(K.studio, { m: 'e', z: 1 });
  function openStudioSetup() {
    hideOverlays(); show('csOv');
    function choices(boxId, items, cur, fn) {
      var box = $(boxId); box.innerHTML = '';
      items.forEach(function (it, k) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'choice' + (it.v === cur ? ' on' : '');
        b.innerHTML = it.html;
        b.addEventListener('click', function () { fn(it.v); Array.prototype.forEach.call(box.children, function (x, q) { x.classList.toggle('on', q === k); }); });
        box.appendChild(b);
      });
    }
    choices('csMode', [{ v: 'e', html: '<b>1 &ndash; 5</b>Product Picasso' }, { v: 'h', html: '<b>5 &ndash; 12</b>Multiplication Monet' }], cs.m, function (v) { cs.m = v; save(K.studio, cs); sizes(); });
    function sizes() {
      choices('csSize', CANVAS_SIZES.map(function (L, z) { var sz = MODES[cs.m].create[z]; return { v: z, html: '<b>' + L + '</b>' + sz[0] + ' &times; ' + sz[1] + T(' squares', ' cuadritos') }; }), cs.z, function (v) { cs.z = v; save(K.studio, cs); });
    }
    sizes();
  }

  // ---------- input ----------
  function cellAt(e) {
    var r = cv.getBoundingClientRect(), s = cam.s, px = e.clientX - r.left, py = e.clientY - r.top;
    return { x: Math.floor((px - (VW / 2 - cam.x * s)) / s), y: Math.floor((py - (VH / 2 - cam.y * s)) / s) };
  }
  cv.addEventListener('pointerdown', function (e) {
    if (screen === 'play' && game) skipWait();
    else if (screen === 'create' && studio) {
      var c = cellAt(e);
      if (c.x < 0 || c.y < 0 || c.x >= studio.W || c.y >= studio.H) return;
      studio.hover = c; studioAct(c);
    }
  });
  cv.addEventListener('pointermove', function (e) {
    if (screen === 'create' && studio) {
      var c = cellAt(e);
      studio.hover = c.x >= 0 && c.y >= 0 && c.x < studio.W && c.y < studio.H ? c : null;
    }
  });
  cv.addEventListener('pointerleave', function () { if (screen === 'create' && studio && !TOUCH) studio.hover = null; });

  // number pads for touch screens
  function keypad(boxId, target, onOk) {
    var box = $(boxId); box.innerHTML = '';
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].forEach(function (k) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'kbtn' + (k === '✓' ? ' ok' : ''); b.textContent = k;
      b.setAttribute('aria-label', k === '⌫' ? T('Delete', 'Borrar') : k === '✓' ? T('Check', 'Revisar') : k);
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); });
      b.addEventListener('click', function () {
        if (k === '✓') return onOk();
        var a = target(); if (!a || a.readOnly && a.classList.contains('good')) return;
        if (k === '⌫') a.value = a.value.slice(0, -1); else if (a.value.length < 3) a.value += k;
        a.classList.remove('shake');
      });
      box.appendChild(b);
    });
  }
  keypad('keypad', function () { return $('ans'); }, function () { check(); });
  keypad('cKeypad', function () { return $('cAns'); }, function () { studioCheck(); });

  document.addEventListener('keydown', function (e) {
    if (window.isPageControlKey && window.isPageControlKey(e)) return;
    var inInput = e.target && e.target.tagName === 'INPUT';
    var over = function (id) { return !$(id).classList.contains('hidden'); };
    if (e.key === 'Escape') {
      if (over('viewOv')) { e.preventDefault(); openGallery(); return; }
      if (over('galOv') || over('lenOv') || over('csOv')) { e.preventDefault(); goTitle(); return; }
      if (screen === 'play' && game && game.phase !== 'done') { e.preventDefault(); togglePause(); return; }
      return;
    }
    if (screen === 'play' && game && over('pauseOv')) return;
    if (screen === 'play' && game) {
      var g = game;
      if (g.phase === 'ask' && /^[0-9]$/.test(e.key) && !inInput && $('ans')) {
        var a = $('ans'); e.preventDefault(); if (a.value.length < 3) a.value += e.key; if (!TOUCH) a.focus();
      } else if (g.phase === 'ask' && e.key === 'Enter' && !inInput && e.target === cv) { e.preventDefault(); check(); }
      else if ((e.key === 'Enter' || e.key === ' ') && pending && pending.skip && (e.target === cv || e.target === document.body)) { e.preventDefault(); skipWait(); }
      return;
    }
    if (screen === 'create' && studio && !inInput) {
      var st = studio;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); studioUndo(); return; }
      if (e.target !== cv && e.target !== document.body) return;
      var mv = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
      if (mv) { e.preventDefault(); var h = st.hover || { x: Math.floor(st.W / 2), y: Math.floor(st.H / 2) }; st.hover = { x: clamp(h.x + mv[0], 0, st.W - 1), y: clamp(h.y + mv[1], 0, st.H - 1) }; return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!st.hover) st.hover = { x: Math.floor(st.W / 2), y: Math.floor(st.H / 2) }; studioAct(st.hover); return; }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); setStudioSize(st.cols, st.rows); return; }
      if (e.key === 'e' || e.key === 'E') { e.preventDefault(); setTool(st.tool === 'erase' ? 'paint' : 'erase'); return; }
      if (/^[0-9]$/.test(e.key) && $('cAns')) { e.preventDefault(); var ca = $('cAns'); if (ca.value.length < 3) ca.value += e.key; ca.focus(); }
    }
  });

  function togglePause() {
    if ($('pauseOv').classList.contains('hidden')) { show('pauseOv'); hide('quitConfirm'); muteLabel(); try { $('pResume').focus({ preventScroll: true }); } catch (e) {} }
    else { hide('pauseOv'); resumeFocus(); }
  }
  function resumeFocus() { try { if ($('ans') && game && game.phase === 'ask' && !TOUCH) $('ans').focus({ preventScroll: true }); else cv.focus({ preventScroll: true }); } catch (e) {} }
  function muteLabel() { $('pMute').innerHTML = muted ? T('&#128263; Sound off', '&#128263; Sonido apagado') : T('&#128266; Sound on', '&#128266; Sonido encendido'); }

  // ---------- buttons ----------
  function on(id, fn) { $(id).addEventListener('click', fn); }
  on('goE', function () { openLength('e'); });
  on('goH', function () { openLength('h'); });
  on('goC', openStudioSetup);
  on('goG', function () { openGallery('m'); });
  on('lenBack', goTitle);
  on('lenGo', function () { startGame(lenMode, lenChoice); });
  on('csBack', goTitle);
  on('csGo', function () { startStudio(cs.m, cs.z); });
  on('galBack', function () { goTitle(); });
  on('tabM', function () { openGallery('m'); });
  on('tabC', function () { openGallery('c'); });
  on('viewBack', function () { openGallery(); });
  on('viewDown', function () { if (viewing) download($('viewArt'), viewing.name); });
  on('viewEdit', function () { if (viewing && viewing.tab === 'c') startStudio(viewing.e.m, viewing.e.z, viewing.e); });
  on('viewDel', function () { show('delConfirm'); });
  on('delNo', function () { hide('delConfirm'); });
  on('delYes', deleteViewing);
  on('menuBtn', togglePause);
  on('pResume', togglePause);
  on('pMute', function () { muted = !muted; save(K.muted, muted); muteLabel(); });
  on('pQuit', function () { show('quitConfirm'); });
  on('quitNo', function () { hide('quitConfirm'); });
  on('quitYes', goTitle);
  on('checkBtn', check);
  on('doneDown', function () { if (game) download(game.art, sceneName(game.scene)); });
  on('doneAgain', function () { if (game) startGame(game.mk, game.z); });
  on('doneGal', function () { openGallery('m'); });
  on('doneMenu', goTitle);
  on('cRowM', function () { setStudioSize(studio.rows - 1, studio.cols); });
  on('cRowP', function () { setStudioSize(studio.rows + 1, studio.cols); });
  on('cColM', function () { setStudioSize(studio.rows, studio.cols - 1); });
  on('cColP', function () { setStudioSize(studio.rows, studio.cols + 1); });
  on('cRot', function () { setStudioSize(studio.cols, studio.rows); });
  on('cCheck', studioCheck);
  on('tBrush', function () { setTool('paint'); });
  on('tErase', function () { setTool('erase'); });
  on('tUndo', studioUndo);
  on('tBg', function () { studio.undo.push({ t: 'bg', bg: studio.bg }); studio.bg = PALETTE[studio.color]; sfx('place'); saveStudio(); });
  on('tDown', function () { download(creationCanvas(studio), T('my art', 'mi obra')); });
  on('tClear', function () { if (studio.r.length || studio.bg !== '#ffffff') show('clearConfirm'); });
  on('clearNo', function () { hide('clearConfirm'); });
  on('clearYes', function () { studio.undo.push({ t: 'clear', r: studio.r, bg: studio.bg }); studio.r = []; studio.bg = '#ffffff'; hide('clearConfirm'); sfx('erase'); saveStudio(); });
  on('cDone', function () { saveStudio(); var had = studio.r.length; studio = null; screen = 'title'; hide('createPanel'); openGallery(had ? 'c' : 'm'); });

  // ---------- the loop ----------
  function frame(now) {
    requestAnimationFrame(frame);
    if (camAnim) stepCam(now);
    if (pending && now >= pending.t) { var f = pending.fn; pending = null; f(); }
    if (screen === 'play' && game) {
      if (game.phase === 'fill' && game.fill) stepFill(now);
      if (game) drawPlay(now);
      drawConfetti();
      blank = false;
    } else if (screen === 'create' && studio) { drawStudio(now); blank = false; }
    else if (!blank) { drawWall(); blank = true; }   // the menus: just the empty studio wall behind them
  }
  var blank = false;
  if (window.ResizeObserver) new ResizeObserver(resize).observe($('stage'));
  window.addEventListener('resize', resize);
  document.addEventListener('fullscreenchange', function () { setTimeout(resize, 60); });
  window.addEventListener('pagehide', function () { if (screen === 'create') saveStudio(); });
  resize();
  goTitle();
  requestAnimationFrame(frame);
})();
