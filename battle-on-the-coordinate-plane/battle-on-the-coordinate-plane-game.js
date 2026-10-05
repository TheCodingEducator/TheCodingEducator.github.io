// Battle on the Coordinate Plane.
// Everything is drawn with SVG and HTML (no canvas), so the coordinate grids stay sharp at every size and every
// control is a real button, input or focusable element. Nothing is saved: every game starts fresh.
(function () {
  'use strict';

  var T = function (en, es) { return typeof window.tl === 'function' ? window.tl(en, es) : en; };
  var ES = !!window.SITE_ES;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var app = $('#bc');
  var SVGNS = 'http://www.w3.org/2000/svg';
  var TOUCH = matchMedia('(hover: none) and (pointer: coarse)').matches;

  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  // A game clock that stops while the pause menu is open, so planes, banners and turns freeze and then carry on.
  var clock = { paused: false, since: 0, lost: 0 };
  function now() { return (clock.paused ? clock.since : performance.now()) - clock.lost; }
  function wait(ms) {
    var end = now() + ms;
    return new Promise(function (r) { (function chk() { var left = end - now(); if (left <= 0) r(); else setTimeout(chk, clock.paused ? 50 : Math.min(left, 50)); })(); });
  }
  function later(ms, fn) { wait(ms).then(fn); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function key(x, y) { return x + ',' + y; }
  function num(n) { return n < 0 ? '−' + (-n) : String(n); }          // a real minus sign, easy to see
  function pair(x, y) { return '(' + num(x) + ', ' + num(y) + ')'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function say(msg, urgent) { var r = $(urgent ? '#live2' : '#live'); r.textContent = ''; setTimeout(function () { r.textContent = msg; }, 30); }

  // ---------------------------------------------------------------- modes and ships
  var MODES = {
    easy: { min: 0, max: 4, label: T('1-STAR GENERAL', 'GENERAL DE 1 ESTRELLA'), name: T('First Quadrant', 'Primer cuadrante') },
    standard: { min: -2, max: 2, label: T('2-STAR GENERAL', 'GENERAL DE 2 ESTRELLAS'), name: T('Full Coordinate Plane', 'Plano cartesiano completo') },
    hard: { min: -2, max: 2, label: T('3-STAR GENERAL', 'GENERAL DE 3 ESTRELLAS'), name: T('Coordinate Commander', 'Comandante de coordenadas'), hard: true }
  };
  var SHIPS = [
    { id: 'buddy', len: 3, name: T('Boat Buddy', 'Barquito Amigo'), up: T('BOAT BUDDY', 'BARQUITO AMIGO') },
    { id: 'galley', len: 4, name: T('Giant Galley', 'Galeón Gigante'), up: T('GIANT GALLEY', 'GALEÓN GIGANTE') }
  ];
  var SHIP = {};
  SHIPS.forEach(function (sh) { SHIP[sh.id] = sh; });
  function emptyFleet() { var f = {}; SHIPS.forEach(function (sh) { f[sh.id] = { id: sh.id, placed: false }; }); return f; }
  var TIME = { fire: 30, locate: 30, quiz: 30 };   // Hard mode seconds: enough to read and think on a 25-point board, not a typing race

  function cellsOf(s) {
    var out = [];
    for (var i = 0; i < SHIP[s.id].len; i++) out.push(s.dir === 'h' ? [s.x + i, s.y] : [s.x, s.y + i]);
    return out;
  }
  function onBoard(x, y) { return x >= G.min && x <= G.max && y >= G.min && y <= G.max; }
  function shipAt(fleet, x, y, skip) {
    for (var id in fleet) {
      var s = fleet[id];
      if (!s.placed || id === skip) continue;
      var c = cellsOf(s);
      for (var i = 0; i < c.length; i++) if (c[i][0] === x && c[i][1] === y) return id;
    }
    return null;
  }
  // can ship `id` sit at (x, y) facing dir? {ok, why, cells, at}
  function check(fleet, id, x, y, dir) {
    var c = cellsOf({ id: id, x: x, y: y, dir: dir });
    for (var i = 0; i < c.length; i++) if (!onBoard(c[i][0], c[i][1])) return { ok: false, why: 'off', cells: c };
    for (i = 0; i < c.length; i++) {
      var o = shipAt(fleet, c[i][0], c[i][1], id);
      if (o) return { ok: false, why: 'overlap', other: o, at: c[i], cells: c };
    }
    return { ok: true, cells: c };
  }
  // a legal random fleet: biggest ship first; on the rare dead end, start over
  function randomFleet() {
    for (var tries = 0; tries < 50; tries++) {
      var f = emptyFleet();
      SHIPS.slice().sort(function (a, b) { return b.len - a.len; }).forEach(function (sh) {
        for (var n = 0; n < 500; n++) {
          var dir = Math.random() < 0.5 ? 'h' : 'v';
          var x = G.min + rnd(G.max - G.min + 1), y = G.min + rnd(G.max - G.min + 1);
          if (check(f, sh.id, x, y, dir).ok) { f[sh.id] = { id: sh.id, x: x, y: y, dir: dir, placed: true }; break; }
        }
      });
      if (SHIPS.every(function (sh) { return f[sh.id].placed; })) return f;
    }
    return f;
  }

  // ---------------------------------------------------------------- sound effects (no music)
  // All synthesized here, so each one can be shaped to the moment and none is shared with another game.
  var Sound = (function () {
    var ctx = null, master = null, muted = false, noiseBuf = null;
    function ac() {
      if (!ctx) {
        try { ctx = (window.SiteSound && SiteSound.context && SiteSound.context()) || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
        if (ctx) { master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination); }
      }
      if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
      return ctx;
    }
    function tone(f, d, o) {
      o = o || {};
      var c = ac(); if (!c || muted) return;
      var t = c.currentTime + (o.delay || 0), osc = c.createOscillator(), g = c.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(f, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.vol || 0.25, t + (o.attack || 0.012));
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + d + 0.05);
    }
    function noise(d, o) {
      o = o || {};
      var c = ac(); if (!c || muted) return;
      if (!noiseBuf) {
        noiseBuf = c.createBuffer(1, c.sampleRate * 1.5, c.sampleRate);
        var data = noiseBuf.getChannelData(0);
        for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      var t = c.currentTime + (o.delay || 0), src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = noiseBuf;
      src.loop = true;
      f.type = o.ft || 'lowpass';
      f.frequency.setValueAtTime(o.f || 1000, t);
      if (o.fto) f.frequency.exponentialRampToValueAtTime(o.fto, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t + (o.attack || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t); src.stop(t + d + 0.05);
    }
    // a ship's bell: a few inharmonic partials that ring and fade
    function bell(f, delay, vol) {
      [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]].forEach(function (p) { tone(f * p[0], 1.1 / Math.sqrt(p[0]), { type: 'sine', vol: vol * p[1], attack: 0.004, delay: delay }); });
    }
    // a low foghorn blast
    function horn(f, d, delay, vol, to) {
      var c = ac(); if (!c || muted) return;
      var t = c.currentTime + (delay || 0), o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
      o1.type = o2.type = 'sawtooth'; o1.frequency.setValueAtTime(f, t); o2.frequency.setValueAtTime(f * 1.006, t);
      if (to) { o1.frequency.exponentialRampToValueAtTime(to, t + d); o2.frequency.exponentialRampToValueAtTime(to * 1.006, t + d); }
      lp.type = 'lowpass'; lp.frequency.value = 520;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.12); g.gain.setValueAtTime(vol, t + d - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master);
      o1.start(t); o2.start(t); o1.stop(t + d + 0.05); o2.stop(t + d + 0.05);
    }
    // Every sound here is made for this game alone, so none of them repeats a sound from another game on the site.
    var fx = {
      click: function () { noise(0.035, { ft: 'bandpass', f: 2600, vol: 0.18, attack: 0.002 }); tone(1750, 0.03, { type: 'sine', vol: 0.06, attack: 0.002 }); },
      place: function () { tone(150, 0.16, { type: 'triangle', to: 85, vol: 0.4, attack: 0.004 }); noise(0.09, { f: 700, vol: 0.16, attack: 0.003 }); },
      rotate: function () { noise(0.22, { ft: 'bandpass', f: 500, fto: 2600, vol: 0.12, attack: 0.03 }); tone(330, 0.16, { type: 'triangle', to: 520, vol: 0.1, delay: 0.04 }); },
      invalid: function () { tone(132, 0.09, { type: 'square', vol: 0.1, attack: 0.003 }); tone(118, 0.13, { type: 'square', vol: 0.1, attack: 0.003, delay: 0.11 }); },
      plane: function () {
        // a small propeller plane passing: a buzzing motor that swells and fades over the flight
        var c = ac(); if (!c || muted) return;
        var t = c.currentTime, o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(88, t); o.frequency.linearRampToValueAtTime(104, t + 1.4);
        lp.type = 'lowpass'; lp.frequency.value = 700;
        l.frequency.value = 24; lg.gain.value = 0.03; l.connect(lg); lg.connect(g.gain);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
        o.connect(lp); lp.connect(g); g.connect(master);
        o.start(t); l.start(t); o.stop(t + 2.3); l.stop(t + 2.3);
      },
      correct: function () { bell(1046, 0, 0.16); bell(1046, 0.26, 0.13); },          // ding-ding of a ship's bell
      wrong: function () { tone(196, 0.13, { type: 'triangle', to: 165, vol: 0.28, attack: 0.004 }); tone(147, 0.22, { type: 'triangle', to: 118, vol: 0.28, attack: 0.004, delay: 0.15 }); },
      tick: function () { tone(1480, 0.22, { type: 'sine', to: 1440, vol: 0.05, attack: 0.003 }); },   // a soft sonar ping
      timeout: function () { horn(110, 0.9, 0, 0.16); },
      victory: function () {
        bell(1046, 0, 0.14); bell(1046, 0.22, 0.12); bell(1318, 0.44, 0.12);
        [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.5, { type: 'triangle', vol: 0.16, delay: 0.75 + i * 0.12 }); });
        [523, 659, 784].forEach(function (f) { tone(f, 1.1, { type: 'triangle', vol: 0.12, delay: 1.25 }); });
      },
      lose: function () { horn(146, 0.7, 0, 0.14, 130); horn(110, 1.1, 0.8, 0.14, 92); },
      fire: function () { tone(260, 0.3, { type: 'sawtooth', to: 820, vol: 0.2 }); tone(520, 0.2, { type: 'triangle', to: 1300, vol: 0.16, delay: 0.08 }); },
      lock: function () { tone(1000, 0.08, { type: 'square', vol: 0.12 }); tone(1400, 0.1, { type: 'square', vol: 0.12, delay: 0.1 }); },
      hit: function () { noise(1.0, { f: 2200, fto: 120, vol: 0.55 }); tone(110, 0.6, { type: 'sine', to: 38, vol: 0.5 }); tone(660, 0.25, { type: 'triangle', to: 990, vol: 0.12, delay: 0.25 }); },
      // something plopping into water: a soft thud as it hits, the rising "bloop" of the bubble, a smaller bubble after
      miss: function () {
        tone(180, 0.09, { type: 'sine', to: 70, vol: 0.3, attack: 0.003 });
        noise(0.12, { ft: 'lowpass', f: 1400, fto: 300, vol: 0.12, attack: 0.003 });
        tone(320, 0.12, { type: 'sine', to: 1250, vol: 0.4, attack: 0.004, delay: 0.02 });
        tone(520, 0.07, { type: 'sine', to: 1500, vol: 0.14, attack: 0.004, delay: 0.17 });
      },
      alarm: function () { tone(560, 0.2, { type: 'square', to: 880, vol: 0.17 }); tone(880, 0.2, { type: 'square', to: 560, vol: 0.17, delay: 0.2 }); tone(560, 0.2, { type: 'square', to: 880, vol: 0.17, delay: 0.4 }); },
      thunder: function () { noise(2.8, { f: 420, fto: 60, vol: 0.7, attack: 0.2 }); noise(0.5, { ft: 'bandpass', f: 900, fto: 200, vol: 0.14, attack: 0.02 }); },
      sink: function () {
        tone(420, 1.4, { type: 'sine', to: 55, vol: 0.28 });
        for (var i = 0; i < 9; i++) tone(500 + Math.random() * 700, 0.08, { type: 'sine', to: 1400 + Math.random() * 600, vol: 0.09, delay: 0.5 + i * 0.12 });
      }
    };
    return {
      play: function (n) {
        if (muted) return;
        try {
          if (fx[n]) fx[n]();
        } catch (e) {}
      },
      setMuted: function (m) { muted = m; },
      isMuted: function () { return muted; },
      // the pause menu freezes every sound that's playing, and lets it finish on resume
      pause: function (p) { var c = ctx || (window.SiteSound && SiteSound.context && SiteSound.context()); if (!c) return; try { if (p) c.suspend(); else c.resume(); } catch (e) {} }
    };
  })();

  // ---------------------------------------------------------------- ship drawings (top-down, friendly, not military)
  // Drawn facing right with the first point at (0, 0) and one board unit = 60. Each white peg marks a point the ship covers.
  var U = 60;
  function shipArt(id) {
    var s = '', len = SHIP[id].len, w = (len - 1) * U;
    if (id === 'buddy') {
      // the friendly orange boat: cabin, life ring, a blue smokestack, a flag at the bow
      s += '<rect class="sel-ring" x="-40" y="-30" width="' + (w + 86) + '" height="60" rx="30"/>';
      s += '<path d="M-28 -16 Q-34 0 -28 16 L' + (w - 8) + ' 16 Q' + (w + 22) + ' 16 ' + (w + 38) + ' 0 Q' + (w + 22) + ' -16 ' + (w - 8) + ' -16 Z" fill="#ff7043" stroke="#8a2b12" stroke-width="3" stroke-linejoin="round"/>';
      s += '<path d="M-20 -9 L' + (w - 10) + ' -9 Q' + (w + 11) + ' -9 ' + (w + 24) + ' 0 Q' + (w + 11) + ' 9 ' + (w - 10) + ' 9 L-20 9 Q-23 0 -20 -9 Z" fill="#ffd166"/>';
      s += '<rect x="14" y="-12" width="32" height="24" rx="9" fill="#fff" stroke="#8a2b12" stroke-width="2.5"/>';
      s += '<circle cx="30" cy="0" r="5" fill="#4cc9f0" stroke="#8a2b12" stroke-width="1.5"/>';
      s += '<circle cx="90" cy="0" r="9" fill="none" stroke="#fff" stroke-width="5"/><circle cx="90" cy="0" r="9" fill="none" stroke="#e63946" stroke-width="5" stroke-dasharray="7 7"/>';
      if (len >= 4) s += '<circle cx="150" cy="0" r="8" fill="#2b7de9" stroke="#8a2b12" stroke-width="2"/>';   // a smokestack on a longer hull
      s += '<path d="M' + (w + 18) + ' 0 L' + (w + 30) + ' -8 L' + (w + 30) + ' 8 Z" fill="#2b7de9"/>';
    } else {
      // the big teal galley: two cabins, twin smokestacks, a cargo deck with crates, a flag at the bow
      s += '<rect class="sel-ring" x="-44" y="-34" width="' + (w + 98) + '" height="68" rx="34"/>';
      s += '<path d="M-32 -20 Q-38 0 -32 20 L' + (w - 8) + ' 20 Q' + (w + 26) + ' 20 ' + (w + 44) + ' 0 Q' + (w + 26) + ' -20 ' + (w - 8) + ' -20 Z" fill="#1b9aaa" stroke="#0b4f57" stroke-width="3" stroke-linejoin="round"/>';
      s += '<path d="M-24 -12 L' + (w - 10) + ' -12 Q' + (w + 16) + ' -12 ' + (w + 30) + ' 0 Q' + (w + 16) + ' 12 ' + (w - 10) + ' 12 L-24 12 Q-28 0 -24 -12 Z" fill="#e9f5f2"/>';
      s += '<rect x="13" y="-15" width="34" height="30" rx="8" fill="#fff" stroke="#0b4f57" stroke-width="2.5"/>';
      s += '<circle cx="30" cy="0" r="6" fill="#4cc9f0" stroke="#0b4f57" stroke-width="1.5"/>';
      s += '<rect x="73" y="-15" width="34" height="30" rx="8" fill="#fff" stroke="#0b4f57" stroke-width="2.5"/>';
      s += '<circle cx="83" cy="0" r="6" fill="#ff8a1f" stroke="#0b4f57" stroke-width="2"/><circle cx="97" cy="0" r="6" fill="#ff8a1f" stroke="#0b4f57" stroke-width="2"/>';
      if (len >= 5) {   // a longer galley gets a third cabin
        s += '<rect x="133" y="-15" width="34" height="30" rx="8" fill="#fff" stroke="#0b4f57" stroke-width="2.5"/>';
        s += '<rect x="140" y="-5" width="8" height="10" rx="2" fill="#4cc9f0"/><rect x="152" y="-5" width="8" height="10" rx="2" fill="#4cc9f0"/>';
      }
      var cx = w - 44;   // cargo crates just behind the bow
      s += '<rect x="' + cx + '" y="-12" width="12" height="11" rx="2" fill="#c98a4b" stroke="#6b4423" stroke-width="1.5"/><rect x="' + (cx + 16) + '" y="-12" width="12" height="11" rx="2" fill="#c98a4b" stroke="#6b4423" stroke-width="1.5"/><rect x="' + (cx + 8) + '" y="1" width="12" height="11" rx="2" fill="#c98a4b" stroke="#6b4423" stroke-width="1.5"/>';
      s += '<path d="M' + (w + 20) + ' 0 L' + (w + 32) + ' -8 L' + (w + 32) + ' 8 Z" fill="#ffd60a"/>';
    }
    // Standard and Hard: weathered paint and wood decks instead of bright toy colors (each ship keeps its own hue)
    if (G.mode !== 'easy') s = s.replace(/#ff7043/g, '#a5552e').replace(/#8a2b12/g, '#1d262d').replace(/#ffd166/g, '#b8955e')
      .replace(/#1b9aaa/g, '#2f5f66').replace(/#0b4f57/g, '#1d262d').replace(/#e9f5f2/g, '#b8955e').replace(/#4cc9f0/g, '#9fc3d6');
    for (var i = 0; i < len; i++) s += '<circle class="peg" cx="' + i * U + '" cy="0" r="10"/><circle class="pegc" cx="' + i * U + '" cy="0" r="3.5"/>';
    // the underwater look, shown once the ship is sunk: wavy water lines across the whole hull, and a few bubbles
    var waves = '', n = Math.ceil((w + 60) / 24);
    for (i = 0; i < n; i++) waves += ' t24 0';
    s += '<g class="water"><path d="M-30 -8 q12 -7 24 0' + waves + '"/><path d="M-24 10 q12 -7 24 0' + waves + '"/>' +
      '<circle cx="' + (w * 0.25 + 10) + '" cy="-24" r="5"/><circle cx="' + (w * 0.6) + '" cy="-28" r="7"/><circle cx="' + (w + 20) + '" cy="-22" r="4"/></g>';
    return s;
  }

  // ---------------------------------------------------------------- a coordinate-plane board
  var ML = 58, MT = 30, VB = 510;
  function Board(svg) { this.svg = svg; this.marks = {}; }
  Board.prototype.setup = function () {
    var s = this.svg;
    s.innerHTML = '';
    s.setAttribute('viewBox', '0 0 ' + VB + ' ' + VB);
    this.min = G.min; this.max = G.max; this.easy = G.mode === 'easy';
    this.u = 420 / (this.max - this.min + 1);   // grid spacing: the plane always fills the same space, whatever its size
    this.marks = {}; this.shipEls = {};
    this.L = {};
    var self = this;
    ['bg', 'grid', 'labels', 'pts', 'ships', 'marks', 'ui', 'fx'].forEach(function (n) { self.L[n] = svgEl('g', { 'class': 'L-' + n }, s); });
    this.drawGrid();
  };
  Board.prototype.sx = function (x) { return ML + (x - this.min + 0.5) * this.u; };
  Board.prototype.sy = function (y) { return MT + (this.max + 0.5 - y) * this.u; };
  Board.prototype.drawGrid = function () {
    var min = this.min, max = this.max, L = this.L, i;
    var x0 = this.sx(min - 0.5), x1 = this.sx(max + 0.5), y0 = this.sy(max + 0.5), y1 = this.sy(min - 0.5);
    svgEl('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: 6, 'class': 'plot' }, L.bg);
    var gx0 = this.easy ? this.sx(0) : x0, gy1 = this.easy ? this.sy(0) : y1;
    for (i = min; i <= max; i++) {
      if (i !== 0) {
        svgEl('line', { x1: this.sx(i), y1: y0, x2: this.sx(i), y2: gy1, 'class': 'gl' }, L.grid);
        svgEl('line', { x1: gx0, y1: this.sy(i), x2: x1, y2: this.sy(i), 'class': 'gl' }, L.grid);
      }
      svgEl('text', { x: this.sx(i), y: y1 + 31, 'class': 'tick' + (i === 0 ? ' zero' : '') }, L.labels).textContent = num(i);
      svgEl('text', { x: x0 - 10, y: this.sy(i) + 8, 'class': 'tick ty' + (i === 0 ? ' zero' : '') }, L.labels).textContent = num(i);
    }
    var ox = this.sx(0), oy = this.sy(0), a = 13;
    // x-axis and y-axis (arrows at both ends on the full plane; positive ends only in the first quadrant)
    svgEl('line', { x1: this.easy ? ox : x0 - 4, y1: oy, x2: x1 + 4, y2: oy, 'class': 'axis' }, L.grid);
    svgEl('line', { x1: ox, y1: this.easy ? oy : y1 + 4, x2: ox, y2: y0 - 4, 'class': 'axis' }, L.grid);
    svgEl('path', { d: 'M' + (x1 + 4 + a) + ' ' + oy + ' l' + (-a - 2) + ' -9 v18 z', 'class': 'arrow' }, L.grid);
    svgEl('path', { d: 'M' + ox + ' ' + (y0 - 4 - a) + ' l-9 ' + (a + 2) + ' h18 z', 'class': 'arrow' }, L.grid);
    if (!this.easy) {
      svgEl('path', { d: 'M' + (x0 - 4 - a) + ' ' + oy + ' l' + (a + 2) + ' -9 v18 z', 'class': 'arrow' }, L.grid);
      svgEl('path', { d: 'M' + ox + ' ' + (y1 + 4 + a) + ' l-9 ' + (-a - 2) + ' h18 z', 'class': 'arrow' }, L.grid);
    }
    svgEl('text', { x: x1 + 2, y: oy - 14, 'class': 'axname' }, L.labels).textContent = 'x';
    svgEl('text', { x: ox + 14, y: y0 - 4, 'class': 'axname' }, L.labels).textContent = 'y';
    svgEl('text', { x: ox + 8, y: oy + 22, 'class': 'olabel' }, L.labels).textContent = '(0, 0)';
    for (var x = min; x <= max; x++) for (var y = min; y <= max; y++) {
      var o = x === 0 && y === 0;
      svgEl('circle', { cx: this.sx(x), cy: this.sy(y), r: o ? 7 : 4.6, 'class': 'pt' + (o ? ' origin' : '') }, L.pts);
    }
  };
  // screen point -> board units (fractional)
  Board.prototype.toBoard = function (cx, cy) {
    var m = this.svg.getScreenCTM();
    if (!m) return { fx: -99, fy: -99 };
    var p = this.svg.createSVGPoint(); p.x = cx; p.y = cy;
    var q = p.matrixTransform(m.inverse());
    return { fx: (q.x - ML) / this.u - 0.5 + this.min, fy: this.max + 0.5 - (q.y - MT) / this.u };
  };
  Board.prototype.nearest = function (cx, cy, tol) {
    var p = this.toBoard(cx, cy), x = Math.round(p.fx), y = Math.round(p.fy);
    if (!onBoard(x, y)) return null;
    if (Math.abs(p.fx - x) > tol || Math.abs(p.fy - y) > tol) return null;
    return { x: x, y: y };
  };
  Board.prototype.unitPx = function () { return this.svg.getBoundingClientRect().width / VB * this.u; };
  Board.prototype.shipTransform = function (x, y, dir) { return 'translate(' + this.sx(x) + ',' + this.sy(y) + ')' + (dir === 'v' ? ' rotate(-90)' : '') + ' scale(' + (this.u / U) + ')'; };   // ship art is drawn at 60 per unit
  Board.prototype.drawShip = function (s, cls, layer) {
    var g = svgEl('g', { 'class': 'ship ship-' + s.id + (cls ? ' ' + cls : ''), transform: this.shipTransform(s.x, s.y, s.dir) }, layer || this.L.ships);
    var body = svgEl('g', { 'class': 'ship-body' }, g);
    body.innerHTML = shipArt(s.id);
    return g;
  };
  Board.prototype.clearShips = function () { this.L.ships.innerHTML = ''; this.shipEls = {}; };
  Board.prototype.ring = function (x, y, cls, r, layer) { return svgEl('circle', { cx: this.sx(x), cy: this.sy(y), r: r || 20, 'class': cls }, layer || this.L.ui); };
  Board.prototype.coordLabel = function (x, y, text) {
    var w = 26 + text.length * 13, h = 40;
    var lx = this.sx(x) + 30, ly = this.sy(y) - 52;
    if (lx + w > VB - 2) lx = this.sx(x) - 30 - w;
    if (ly < 2) ly = this.sy(y) + 16;
    var g = svgEl('g', { 'class': 'clabel mark-in' }, this.L.fx);
    svgEl('rect', { x: lx, y: ly, width: w, height: h, rx: 12 }, g);
    svgEl('text', { x: lx + w / 2, y: ly + 30 }, g).textContent = text;
    return g;
  };
  Board.prototype.targetRing = function (x, y) {
    var g = svgEl('g', { 'class': 'pulse' }, this.L.ui);
    svgEl('circle', { cx: this.sx(x), cy: this.sy(y), r: 22, 'class': 'tring' }, g);
    svgEl('circle', { cx: this.sx(x), cy: this.sy(y), r: 22, 'class': 'tring2' }, g);
    return g;
  };
  Board.prototype.addMark = function (x, y, hit) {
    var k = key(x, y), m = this.marks[k];
    if (m) {
      m.count++;
      if (m.badge) m.badge.remove();
      var b = svgEl('g', { 'class': 'badge mark-in' }, m.g);
      svgEl('circle', { cx: 17, cy: -17, r: 10 }, b);
      svgEl('text', { x: 17, y: -13 }, b).textContent = '×' + m.count;
      m.badge = b;
      m.g.classList.remove('mark-in'); void m.g.getBBox(); m.g.classList.add('mark-in');
      boardHistory();
      return;
    }
    var g = svgEl('g', { transform: 'translate(' + this.sx(x) + ',' + this.sy(y) + ')' }, this.L.marks);
    var inner = svgEl('g', { 'class': 'mark-in' }, g);
    if (hit) {
      inner.innerHTML = '<g class="flame"><ellipse cx="0" cy="11" rx="15" ry="5" fill="rgba(60,20,0,.28)"/>' +
        '<path class="f1" d="M0 13 C-15 9 -15 -6 -6 -15 C-6 -6 -2 -7 0 -24 C5 -9 15 -9 13 2 C13 9 7 13 0 13 Z" fill="#ff5a1f" stroke="#8a1c00" stroke-width="2"/>' +
        '<path class="f2" d="M0 11 C-8 9 -8 1 -3 -6 C-2 -1 1 -2 2 -11 C5 -3 9 0 8 4 C7 9 3 11 0 11 Z" fill="#ffd23f"/></g>';
    } else {
      inner.classList.add('xmark');
      inner.innerHTML = '<path class="xo" d="M-14 -14 L14 14 M14 -14 L-14 14"/><path class="xi" d="M-14 -14 L14 14 M14 -14 L-14 14"/>';
    }
    this.marks[k] = { g: inner, count: 1, hit: hit };
    boardHistory();
  };
  // For screen readers: each board's hidden description lists where your ships are (your board) and every shot so far,
  // so the history on the boards can be heard as well as seen.
  function boardHistory() {
    function shots(b) {
      var list = Object.keys(b.marks).map(function (k) { var p = k.split(',').map(Number), m = b.marks[k]; return pair(p[0], p[1]) + ' ' + (m.hit ? T('hit', 'impacto') : T('miss', 'agua')) + (m.count > 1 ? ' (' + T(m.count + ' times', m.count + ' veces') + ')' : ''); });
      return list.length ? list.join('; ') + '.' : T('none yet.', 'ninguno todavía.');
    }
    var me = $('#hist-me'), foe = $('#hist-foe');
    if (!me || !foe || !G.my) return;
    me.textContent = T('Your ships: ', 'Tus barcos: ') + SHIPS.map(function (sh) { return SHIP[sh.id].name + ' ' + T('on', 'en') + ' ' + cellsOf(G.my[sh.id]).map(function (c) { return pair(c[0], c[1]); }).join(', '); }).join('; ') + '. ' + T('Enemy shots: ', 'Disparos enemigos: ') + shots(B.me);
    foe.textContent = T('Your shots: ', 'Tus disparos: ') + shots(B.foe);
  }
  Board.prototype.explode = function (x, y) {
    // Standard and Hard: the whole board jolts with the blast
    var z = this.svg.closest('.zone');
    if (z && app.classList.contains('storm') && !G.calm) { z.classList.remove('jolt'); void z.offsetWidth; z.classList.add('jolt'); }
    var g = svgEl('g', { transform: 'translate(' + this.sx(x) + ',' + this.sy(y) + ')' }, this.L.fx);
    svgEl('circle', { r: 46, fill: '#ffd23f', 'class': 'boom' }, g);
    svgEl('circle', { r: 32, fill: '#ff6b1a', 'class': 'boom b2' }, g);
    svgEl('path', { d: 'M0 -40 L9 -12 L38 -14 L14 4 L26 32 L0 15 L-26 32 L-14 4 L-38 -14 L-9 -12 Z', fill: '#fff3b0', 'class': 'boom b2' }, g);
    for (var i = 0; i < 10; i++) {
      var a = i / 10 * Math.PI * 2, d = 40 + rnd(18);
      var c = svgEl('circle', { r: 4 + rnd(3), fill: i % 2 ? '#ff8a1f' : '#ffd23f', 'class': 'spark' }, g);
      c.style.setProperty('--dx', Math.cos(a) * d + 'px'); c.style.setProperty('--dy', Math.sin(a) * d + 'px');
    }
    later(900, function () { g.remove(); });
  };
  Board.prototype.splash = function (x, y) {
    var g = svgEl('g', { transform: 'translate(' + this.sx(x) + ',' + this.sy(y) + ')' }, this.L.fx);
    svgEl('circle', { r: 30, 'class': 'ripple' }, g);
    svgEl('circle', { r: 44, 'class': 'ripple r2' }, g);
    for (var i = 0; i < 8; i++) {
      var a = i / 8 * Math.PI * 2, d = 26 + rnd(10);
      var c = svgEl('circle', { r: 4.5, 'class': 'drop' }, g);
      c.style.setProperty('--dx', Math.cos(a) * d + 'px'); c.style.setProperty('--dy', Math.sin(a) * d + 'px');
    }
    later(1200, function () { g.remove(); });
  };
  Board.prototype.clearFx = function () { this.L.fx.innerHTML = ''; this.L.ui.innerHTML = ''; };

  // the little plane, facing right; its center is the point it is over
  function planeSVG(layer) {
    var g = svgEl('g', { 'class': 'plane' }, layer);
    var r = svgEl('g', {}, g);
    r.innerHTML = '<ellipse cx="6" cy="9" rx="22" ry="7" fill="rgba(11,37,69,.18)"/>' +
      '<path d="M-3 -25 L7 -25 L12 -3 L12 3 L7 25 L-3 25 L0 3 L0 -3 Z" fill="#e63946" stroke="#7a1820" stroke-width="1.5"/>' +
      '<ellipse cx="0" cy="0" rx="24" ry="6.5" fill="#fff" stroke="#1d3557" stroke-width="2.2"/>' +
      '<path d="M-22 -11 L-16 -11 L-13 0 L-16 11 L-22 11 L-19 0 Z" fill="#e63946" stroke="#7a1820" stroke-width="1.5"/>' +
      '<ellipse cx="8" cy="0" rx="5.5" ry="3.6" fill="#4cc9f0"/>' +
      '<ellipse class="prop" cx="25" cy="0" rx="2.4" ry="11" fill="#1d3557"/>';
    return { g: g, r: r };
  }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function tween(ms, fn) {
    return new Promise(function (res) {
      var t0 = now();
      (function step() {
        var t = Math.min(1, (now() - t0) / ms);
        fn(ease(t));
        if (t < 1) requestAnimationFrame(step); else res();
      })();
    });
  }
  // move label for one leg of the path: "2 right", "3 down"
  function legText(n, dirWord) { return num(n) + ' ' + dirWord; }
  function segLabel(b, cx, cy, text, help) {
    var w = 18 + text.length * 9.2, h = 26;
    var x = Math.max(4, Math.min(VB - w - 4, cx - w / 2)), y = Math.max(4, Math.min(VB - h - 4, cy - h / 2));
    var g = svgEl('g', { 'class': 'seglbl mark-in' + (help ? ' help' : '') }, b.L.fx);
    svgEl('rect', { x: x, y: y, width: w, height: h, rx: 9 }, g);
    svgEl('text', { x: x + w / 2, y: y + 19 }, g).textContent = text;
    return g;
  }
  function wordX(x) { return x > 0 ? T('right', 'a la derecha') : T('left', 'a la izquierda'); }
  function wordY(y) { return y > 0 ? T('up', 'hacia arriba') : T('down', 'hacia abajo'); }
  function WX(x) { return x > 0 ? T('RIGHT', 'a la DERECHA') : T('LEFT', 'a la IZQUIERDA'); }
  function WY(y) { return y > 0 ? T('UP', 'hacia ARRIBA') : T('DOWN', 'hacia ABAJO'); }
  function units(n) { n = Math.abs(n); return n === 1 ? T('1 unit', '1 unidad') : T(n + ' units', n + ' unidades'); }

  // Plane speed: after the player's first three shots, every flight is 50% faster, except the one flight right after a
  // wrong answer (missing the enemy's shot on the first try, a Radar Check, or a turn prediction)
  function planeMult() { return G.shots.length >= 3 && !G.slowNext ? 2 / 3 : 1; }
  // kind: 'find' (the enemy's shot), 'radar', 'orders' or 'turn'; each question is counted once, by its first try
  function noteAnswer(ok, kind) {
    if (!ok) G.slowNext = true;
    var r = G.rep && G.rep[kind];
    if (r) { r[1]++; if (ok) r[0]++; }
  }
  // Fly from the origin: x first (left/right), turn in place, then y (up/down). Leaves a dashed path with labeled legs.
  // opts.help: the purple "here's the way" path used for hints; opts.keepPlane: leave the plane at the end
  function flyPath(b, x, y, opts) {
    opts = opts || {};
    var id = G.id;
    var parts = [];
    var ox = b.sx(0), oy = b.sy(0), tx = b.sx(x), ty = b.sy(y);
    var trail = svgEl('polyline', { 'class': 'trail' + (opts.help ? ' help' : ''), points: ox + ',' + oy + ' ' + ox + ',' + oy }, b.L.fx);
    parts.push(trail);
    var pl = planeSVG(b.L.fx); parts.push(pl.g);
    var ang = x > 0 ? 0 : x < 0 ? 180 : (y > 0 ? -90 : 90);
    function put(px, py, a) { pl.g.setAttribute('transform', 'translate(' + px + ',' + py + ') rotate(' + a + ')'); }
    put(ox, oy, ang);
    pl.g.style.opacity = 0;
    // after three right answers in a row the plane flies 50% faster; right after a wrong answer it slows to normal for one flight
    var m = opts.help ? 1 : planeMult();
    var speed = (opts.help ? 300 : 340) * m;
    if (!opts.silent) Sound.play('plane');
    return tween(250 * m, function (t) { pl.g.style.opacity = t; }).then(function () {
      if (x === 0) return;
      return tween(320 * m + Math.abs(x) * speed, function (t) {
        var px = ox + (tx - ox) * t; put(px, oy, ang);
        trail.setAttribute('points', ox + ',' + oy + ' ' + px + ',' + oy);
      }).then(function () {
        var below = b.easy ? -26 : (y > 0 ? 24 : -26);
        parts.push(segLabel(b, (ox + tx) / 2, oy + below, legText(Math.abs(x), wordX(x)), opts.help));
      });
    }).then(function () {
      if (y === 0 || G.id !== id) return;
      var a0 = ang, a1 = y > 0 ? -90 : 90;
      if (x < 0) a1 = y > 0 ? -90 : 90;
      // turn the short way round
      var d = ((a1 - a0 + 540) % 360) - 180;
      return wait(120).then(function () {
        return tween(380 * m, function (t) { put(tx, oy, a0 + d * t); });
      }).then(function () {
        ang = a0 + d;
        // the turn arrow sits in the open corner beyond the turning point, away from both legs and their labels
        if (opts.turnLabel) parts.push(segLabel(b, tx + (x > 0 ? 1 : -1) * 26, oy + (y > 0 ? 1 : -1) * 26, opts.turnLabel, false));
        return wait(100);
      }).then(function () {
        return tween(320 * m + Math.abs(y) * speed, function (t) {
          var py = oy + (ty - oy) * t; put(tx, py, ang);
          trail.setAttribute('points', ox + ',' + oy + ' ' + tx + ',' + oy + ' ' + tx + ',' + py);
        });
      }).then(function () {
        var side = x >= 0 ? 1 : -1;
        var t = legText(Math.abs(y), wordY(y));
        parts.push(segLabel(b, tx + side * (24 + t.length * 4.6), (oy + ty) / 2, t, opts.help));
      });
    }).then(function () {
      return { parts: parts, plane: pl, angle: ang };
    });
  }

  // ---------------------------------------------------------------- game state
  var G = {
    id: 0, mode: 'standard', min: -3, max: 3, hard: false, screen: 'title',
    my: null, foe: null, myHits: {}, foeHits: {}, shots: [], ai: null,
    phase: '', onFire: null, onPick: null, paused: false, timer: null, sinceQuiz: 0, round: 0
  };
  // "Less motion": starts on if the device asks for reduced motion; the menu switch changes it for this visit only
  G.calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  app.classList.toggle('calm', G.calm);
  var B = { place: new Board($('#board-place')), me: new Board($('#board-me')), foe: new Board($('#board-foe')) };

  function show(name) {
    ['title', 'modes', 'instr', 'place', 'battle'].forEach(function (n) { $('#scr-' + n).hidden = n !== name; });
    G.screen = name;
    app.setAttribute('data-screen', name);
    Storm.set(name === 'title' || name === 'modes' || G.mode !== 'easy');
    app.classList.toggle('rank2', G.mode === 'standard');   // each rank has its own board frames (CSS)
    app.classList.toggle('rank3', G.mode === 'hard');
    $('#btn-menu').hidden = !(name === 'battle' || name === 'place');
    hideOverlay();
    layout();
  }
  function hideOverlay() { $('#scr-pause').hidden = true; $('#scr-end').hidden = true; $('#confetti').innerHTML = ''; }
  function focusLater(el) { if (el) setTimeout(function () { try { el.focus({ preventScroll: false }); } catch (e) { el.focus(); } }, 40); }

  // ---------------------------------------------------------------- title and mode menu
  // ---------------------------------------------------------------- the storm (title, mode menu, Standard and Hard)
  // Dark sky, rain, lightning, crashing waves and a battle on the horizon: water plumes and flashes near ship
  // silhouettes. It is drawn BEHIND every card and board, so the coordinate planes stay clean and easy to read.
  var Storm = (function () {
    var box = $('#storm'), fx = null, on = false, timers = [];
    function wave(y, amp, wl, fill, stroke, dur) {
      var w = 1200 + wl * 2, d = 'M' + (-wl) + ' ' + y;
      for (var x = -wl; x < w; x += wl) d += ' q' + wl / 4 + ' ' + (-amp) + ' ' + wl / 2 + ' 0 t' + wl / 2 + ' 0';
      d += ' V720 H' + (-wl) + ' Z';
      // a light rim along the crests, and wind-blown foam on each peak
      var foam = '';
      if (stroke) for (x = -wl; x < w; x += wl) {
        var px = x + wl / 4, py = y - amp / 2;
        foam += '<path d="M' + (px - wl * 0.16) + ' ' + (py + 3) + ' Q' + px + ' ' + (py - 5) + ' ' + (px + wl * 0.2) + ' ' + (py + 4) + ' Q' + (px + wl * 0.05) + ' ' + (py + 1) + ' ' + (px - wl * 0.16) + ' ' + (py + 3) + ' Z" fill="' + stroke + '"/>';
      }
      return '<g class="st-wave" style="--wl:' + wl + 'px;animation-duration:' + dur + 's"><path d="' + d + '" fill="' + fill + '"' +
        (stroke ? ' stroke="rgba(170,200,220,0.35)" stroke-width="2"' : '') + '/>' + foam + '</g>';
    }
    // side-view silhouettes of the two ship types, with a few lit windows and smoke
    function ship(x, y, s, big, delay) {
      var h = '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><g class="st-bob" style="animation-delay:' + delay + 's">';
      if (big) {
        h += '<path d="M-150 0 L150 0 L128 34 L-132 34 Z" fill="#0f1922"/><rect x="-100" y="-46" width="120" height="46" fill="#14212c"/><rect x="-74" y="-80" width="66" height="36" fill="#14212c"/>' +
          '<rect x="40" y="-60" width="20" height="60" fill="#14212c"/><rect x="76" y="-48" width="20" height="48" fill="#14212c"/>' +
          '<g fill="#ffc861" opacity="0.8"><rect x="-88" y="-30" width="9" height="7"/><rect x="-66" y="-30" width="9" height="7"/><rect x="-44" y="-30" width="9" height="7"/><rect x="-58" y="-66" width="9" height="7"/></g>' +
          '<circle class="st-smoke" cx="50" cy="-70" r="12" fill="#3a4651"/><circle class="st-smoke" cx="86" cy="-58" r="10" fill="#3a4651" style="animation-delay:-1.6s"/>';
      } else {
        h += '<path d="M-90 0 L90 0 L76 24 L-78 24 Z" fill="#0f1922"/><rect x="-46" y="-40" width="64" height="40" fill="#14212c"/><rect x="34" y="-44" width="16" height="44" fill="#14212c"/>' +
          '<path d="M-60 -2 V-70 L-36 -60 L-60 -52" fill="none" stroke="#14212c" stroke-width="4"/>' +
          '<g fill="#ffc861" opacity="0.8"><rect x="-34" y="-26" width="8" height="7"/><rect x="-14" y="-26" width="8" height="7"/></g>' +
          '<circle class="st-smoke" cx="42" cy="-54" r="9" fill="#3a4651"/>';
      }
      return h + '</g></g>';
    }
    // a breaking wave in the corner: it rises, curls over and throws spray, then sinks back
    function crash(x, flip, cls) {
      var spray = '', i;
      for (i = 0; i < 16; i++) {
        var a = -0.2 - i / 16 * 1.2, d = 60 + (i * 37) % 90;
        spray += '<circle r="' + (2 + i % 4) + '" cx="' + (300 + (i * 13) % 40) + '" cy="' + (-170 + (i * 7) % 30) + '" style="--sx:' + Math.round(Math.cos(a) * d) + 'px;--sy:' + Math.round(Math.sin(a) * d - 30) + 'px;animation-delay:' + ((cls ? -3.5 : 0) + i * 0.025).toFixed(3) + 's"/>';
      }
      var foam = '';
      for (i = 0; i < 7; i++) foam += '<ellipse cx="' + (170 + i * 26) + '" cy="' + (-196 + Math.abs(i - 3) * 6) + '" rx="' + (14 - Math.abs(i - 3)) + '" ry="7" fill="#eef5f9" opacity="' + (0.95 - i * 0.07).toFixed(2) + '"/>';
      return '<g transform="translate(' + x + ' 724) scale(' + (flip ? -1 : 1) + ' 1)"><g class="st-crash ' + (cls || '') + '">' +
        '<path d="M-60 0 C-20 -60 40 -150 150 -190 C220 -214 300 -200 330 -160 C340 -140 330 -120 310 -118 C300 -140 270 -150 245 -140 C210 -126 200 -80 230 -40 C250 -15 290 -4 340 0 Z" fill="url(#st-cw)"/>' +
        '<path d="M310 -118 C300 -140 270 -150 245 -140 C210 -126 200 -80 230 -40" fill="none" stroke="rgba(220,236,245,0.45)" stroke-width="4"/>' +
        '<path d="M150 -190 C220 -214 300 -200 330 -160" fill="none" stroke="#f4f9fc" stroke-width="10" stroke-linecap="round"/>' + foam +
        '<g class="st-spray">' + spray + '</g></g></g>';
    }
    function build() {
      var clouds = '';
      [[80, 0, 70], [420, -20, 95], [760, -48, 80], [1080, -9, 110]].forEach(function (c, i) {
        clouds += '<g style="animation-duration:' + c[2] + 's;animation-delay:' + c[1] + 's"><ellipse cx="' + c[0] + '" cy="' + (60 + i % 2 * 50) + '" rx="190" ry="60" fill="#0d151d" opacity="0.75"/>' +
          '<ellipse cx="' + (c[0] + 120) + '" cy="' + (90 + i % 2 * 40) + '" rx="150" ry="48" fill="#1b2835" opacity="0.8"/><ellipse cx="' + (c[0] - 110) + '" cy="' + (100 + i % 2 * 30) + '" rx="130" ry="44" fill="#16212c" opacity="0.8"/></g>';
      });
      box.innerHTML = '<div class="st-sky"></div>' +
        '<svg class="st-clouds" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMin slice">' + clouds + '</svg>' +
        '<svg class="st-bolt" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMin slice" id="st-bolt"></svg>' +
        '<svg class="st-scene" viewBox="0 0 1200 720" preserveAspectRatio="xMidYMax slice">' +
        '<defs><linearGradient id="st-b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff6d8" stop-opacity="0.55"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></linearGradient><linearGradient id="st-cw" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#0f2a3a"/><stop offset="0.55" stop-color="#2c5a70"/><stop offset="1" stop-color="#7aa6b9"/></linearGradient><radialGradient id="st-g"><stop offset="0" stop-color="#fff2c4"/><stop offset="0.35" stop-color="#ffa53a"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/></radialGradient></defs>' +
        '<g class="st-plane"><path d="M-30 0 L22 -3 L30 0 L22 3 Z M-6 -2 L4 -22 L10 -22 L6 -2 Z M-6 2 L4 22 L10 22 L6 2 Z M-28 -1 L-24 -9 L-20 -9 L-22 -1 Z" fill="#0e1720"/></g>' +
        '<g opacity="0.5"><path class="st-beam" d="M640 360 L520 0 L600 0 Z" fill="url(#st-b)"/><path class="st-beam b2" d="M230 390 L300 40 L350 40 Z" fill="url(#st-b)"/></g>' +
        ship(230, 418, 0.55, false, 0) + ship(640, 424, 0.85, true, -1.4) + ship(1010, 416, 0.5, false, -2.6) +
        '<g id="st-fx"></g>' +
        wave(430, 7, 140, '#28465a', null, 9) + wave(480, 14, 220, '#1f3b4f', 'rgba(220,235,245,0.35)', 7) + wave(560, 22, 320, '#173245', 'rgba(230,240,248,0.5)', 6) +
        wave(640, 26, 380, '#10283a', 'rgba(235,244,250,0.6)', 5) +
        crash(-70, false, '') + crash(1270, true, 'c2') +
        '</svg><div class="st-rain"></div><div class="st-rain r2"></div><div class="st-flash" id="st-flash"></div>';
      fx = $('#st-fx');
    }
    function later2(ms, fn) { timers.push(setTimeout(fn, ms)); }
    // a flash on the horizon, a column of water, and a puff of smoke
    function blast() {
      if (!on) return;
      if (!clock.paused && !document.hidden) {
        var x = 80 + Math.random() * 1040, y = 412 + Math.random() * 14, s = 0.6 + Math.random() * 0.7;
        var g = svgEl('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + s + ')' }, fx);
        g.innerHTML = '<circle class="st-glow" r="46" fill="url(#st-g)"/>' +
          '<path class="st-plume" d="M-14 0 C-16 -40 -8 -80 -2 -96 C2 -80 4 -86 8 -100 C12 -70 18 -36 16 0 Z" fill="#dfeaf2"/>' +
          '<circle class="st-puff" cx="0" cy="-20" r="14" fill="#55626e"/><circle class="st-puff" cx="10" cy="-10" r="10" fill="#4a5661" style="animation-delay:0.2s"/>';
        later2(3200, function () { g.remove(); });
      }
      later2(1100 + Math.random() * 2400, blast);
    }
    function lightning() {
      if (!on) return;
      if (!clock.paused && !document.hidden) {
        var x = 120 + Math.random() * 960, y = 0, pts = [x + ',' + y];
        while (y < 330) { y += 22 + Math.random() * 36; x += (Math.random() - 0.5) * 70; pts.push(Math.round(x) + ',' + Math.round(y)); }
        var bolt = $('#st-bolt'), fl = $('#st-flash');
        bolt.innerHTML = '<polyline points="' + pts.join(' ') + '"/>';
        fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
        later2(140, function () { bolt.style.opacity = 0; });
        later2(230, function () { bolt.style.opacity = 1; });
        later2(420, function () { bolt.innerHTML = ''; bolt.style.opacity = 1; });
        later2(500 + Math.random() * 900, function () { Sound.play('thunder'); });
      }
      later2(6500 + Math.random() * 7000, lightning);
    }
    return {
      set: function (want) {
        if (want === on) return;
        on = want;
        app.classList.toggle('storm', on);
        timers.forEach(clearTimeout); timers = [];
        if (!on) return;
        if (!fx) build();
        this.motion();
      },
      // "Less motion" (the menu switch, or the device's reduced-motion setting): a still, stormy picture, with no flashes
      motion: function () {
        timers.forEach(clearTimeout); timers = [];
        if (!on || G.calm) return;
        later2(600, blast);
        later2(2500, lightning);
      }
    };
  })();

  $('#btn-play').addEventListener('click', function () { Sound.play('click'); show('modes'); focusLater($('.mode.easy')); });
  $('#modes-back').addEventListener('click', function () { Sound.play('click'); show('title'); focusLater($('#btn-play')); });
  Array.prototype.forEach.call(document.querySelectorAll('.mode'), function (b, i, all) {
    b.addEventListener('click', function () { Sound.play('click'); chooseMode(b.getAttribute('data-mode')); });
    b.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      all[(i + d + all.length) % all.length].focus();
    });
  });

  function chooseMode(m) {
    G.mode = m; G.min = MODES[m].min; G.max = MODES[m].max; G.hard = !!MODES[m].hard;
    showInstructions(false);
  }

  // ---------------------------------------------------------------- instructions
  function showInstructions(fromPause) {
    var m = MODES[G.mode], easy = G.mode === 'easy';
    var steps = [
      ['&#9875;', T('Place your two ships: <b>Boat Buddy</b> (4 points) and <b>Giant Galley</b> (5 points).', 'Ubica tus dos barcos: <b>Barquito Amigo</b> (4 puntos) y <b>Galeón Gigante</b> (5 puntos).')],
      ['&#8596;', T('Ships face <b>horizontally or vertically</b>, never diagonally.', 'Los barcos van en <b>horizontal o vertical</b>, nunca en diagonal.')],
      ['&#128683;', T('Ships <b>cannot overlap</b>.', 'Los barcos <b>no pueden encimarse</b>.')],
      ['&#8635;', T('<b>Click a ship</b> on the board to rotate it (or press <kbd>R</kbd>).', '<b>Haz clic en un barco</b> del tablero para girarlo (o pulsa <kbd>R</kbd>).')],
      ['&#9654;', T('Press <b>START GAME</b> when your fleet is ready.', 'Pulsa <b>EMPEZAR</b> cuando tu flota esté lista.')],
      ['&#127919;', G.hard ? T('On your turn, <b>type the whole ordered pair</b>, like (2, &minus;1), and fire.', 'En tu turno, <b>escribe el par ordenado completo</b>, como (2, &minus;1), y dispara.') : T('On your turn, <b>enter a coordinate</b> and fire.', 'En tu turno, <b>escribe una coordenada</b> y dispara.')],
      ['&#128680;', T('On the computer&rsquo;s turn, it gives you a coordinate. <b>Find that point on your own board.</b>', 'En el turno de la computadora, te da una coordenada. <b>Encuentra ese punto en tu propio tablero.</b>')],
      ['&#127942;', T('<b>Sink both enemy ships</b> to win!', '<b>¡Hunde los dos barcos enemigos</b> para ganar!')]
    ];
    var noteMode = easy
      ? T('<b>1-Star General:</b> every coordinate is in the <b>first quadrant</b>. x and y go from 0 to 4, and the origin (0, 0) is in the bottom-left corner.', '<b>General de 1 estrella:</b> todas las coordenadas están en el <b>primer cuadrante</b>. x y y van de 0 a 4, y el origen (0, 0) está en la esquina inferior izquierda.')
      : T('<b>' + (G.hard ? '3' : '2') + '-Star General:</b> coordinates can be <b>negative</b>. x and y go from &minus;2 to 2, and the origin (0, 0) is in the center. Negative x is <b>left</b>; negative y is <b>down</b>.', '<b>General de ' + (G.hard ? '3' : '2') + ' estrellas:</b> las coordenadas pueden ser <b>negativas</b>. x y y van de &minus;2 a 2, y el origen (0, 0) está en el centro. x negativa es a la <b>izquierda</b>; y negativa es <b>hacia abajo</b>.');
    var hardNote = G.hard ? '<div class="note hard">' + T('&#9201; <b>Timer:</b> ' + TIME.fire + ' seconds for each task. Out of time on your shot? You lose that shot. On the enemy&rsquo;s shot, the game shows you where it lands. &#128225; <b>Radar Checks</b> pop up between turns: answer them to keep going. Read carefully: the enemy may give <b>y before x</b>!',
      '&#9201; <b>Cronómetro:</b> ' + TIME.fire + ' segundos para cada tarea. ¿Se acaba el tiempo en tu disparo? Pierdes ese disparo. En el disparo enemigo, el juego te muestra dónde cae. &#128225; Entre turnos aparecen <b>Revisiones de radar</b>: respóndelas para seguir. ¡Lee con cuidado: el enemigo puede dar <b>y antes que x</b>!') + '</div>' : '';
    var exPt = easy ? [2, 3] : [2, -2];
    var html = '<div class="scr-head"><h1 id="instr-h">' + T('HOW TO PLAY', 'CÓMO JUGAR') + '</h1><p>' + m.label + ': ' + m.name + '</p></div>' +
      '<div class="instr"><div class="card"><ol class="steps">' +
      steps.map(function (s) { return '<li><span class="si" aria-hidden="true">' + s[0] + '</span><span>' + s[1] + '</span></li>'; }).join('') +
      '</ol></div><div class="card xy-card">' +
      '<div class="xy-big" aria-label="(x, y)">( <span class="vx">x</span> , <span class="vy">y</span> )</div>' +
      '<div class="xy-rule"><span class="chip cx">x</span><span>' + T('comes <b>first</b>: move <b>left or right</b>', 'va <b>primero</b>: muévete a la <b>izquierda o derecha</b>') + '</span>' +
      '<span class="chip cy">y</span><span>' + T('comes <b>second</b>: move <b>up or down</b>', 'va <b>segundo</b>: muévete <b>arriba o abajo</b>') + '</span></div>' +
      exampleSVG(exPt[0], exPt[1], easy) +
      '<div class="note">' + noteMode + '</div>' + hardNote + '</div></div>' +
      '<div class="row"><button type="button" class="btn ghost" id="instr-back">' + (fromPause ? T('&larr; Back to the game', '&larr; Volver al juego') : T('&larr; Back', '&larr; Atrás')) + '</button>' +
      (fromPause ? '' : '<button type="button" class="btn orange big" id="instr-go">' + T('CONTINUE &#9654;', 'CONTINUAR &#9654;') + '</button>') + '</div>';
    var body = $('#instr-body');
    body.innerHTML = html;
    if (fromPause) {
      $('#scr-instr').hidden = false; $('#scr-instr').style.zIndex = 46;
      fitScreen();
      $('#instr-back').addEventListener('click', function () { $('#scr-instr').hidden = true; $('#scr-instr').style.zIndex = ''; openPause(); });
      focusLater($('#instr-back'));
      return;
    }
    show('instr');
    $('#instr-back').addEventListener('click', function () { Sound.play('click'); show('modes'); focusLater($('.mode[data-mode="' + G.mode + '"]')); });
    $('#instr-go').addEventListener('click', function () { Sound.play('click'); startPlacement(); });
    focusLater($('#instr-go'));
  }
  // a tiny picture: from the origin, x first (orange, sideways), then y (blue, up/down)
  function exampleSVG(x, y, easy) {
    var u = 22, ox = easy ? 30 : 96, oy = easy ? 150 : 80;
    var px = ox + x * u, py = oy - y * u;
    var s = '<svg viewBox="0 0 220 184" style="width:100%;max-width:270px;height:auto;margin:0 auto;display:block" aria-hidden="true">';
    s += '<rect x="4" y="4" width="212" height="176" rx="12" fill="#f6fbff" stroke="#c4d7ea"/>';
    s += '<line x1="' + (easy ? ox : 14) + '" y1="' + oy + '" x2="206" y2="' + oy + '" stroke="#0b2545" stroke-width="3"/>';
    s += '<line x1="' + ox + '" y1="' + (easy ? oy : 168) + '" x2="' + ox + '" y2="12" stroke="#0b2545" stroke-width="3"/>';
    s += '<circle cx="' + ox + '" cy="' + oy + '" r="5" fill="#c2410c"/>';
    s += '<path d="M' + ox + ' ' + oy + ' H' + px + '" stroke="#d9600a" stroke-width="5" stroke-linecap="round"/>';
    s += '<path d="M' + px + ' ' + oy + ' V' + py + '" stroke="#1a5bb8" stroke-width="5" stroke-linecap="round" stroke-dasharray="8 5"/>';
    s += '<circle cx="' + px + '" cy="' + py + '" r="8" fill="#ffd60a" stroke="#0b2545" stroke-width="3"/>';
    s += '<text x="' + (ox + px) / 2 + '" y="' + (oy + (y > 0 ? 20 : -8)) + '" text-anchor="middle" font-weight="900" font-size="14" fill="#d9600a">x = ' + num(x) + ' &#8594;</text>';
    s += '<text x="' + (px + 10) + '" y="' + (oy + py) / 2 + '" font-weight="900" font-size="14" fill="#1a5bb8">y = ' + num(y) + '</text>';
    s += '<text x="' + (px + 12) + '" y="' + (py + (y > 0 ? -4 : 18)) + '" font-weight="900" font-size="15" fill="#0b2545">' + pair(x, y) + '</text>';
    return s + '</svg>';
  }

  // ---------------------------------------------------------------- ship placement
  var drag = null, selId = null, ghostEl = null, msgTimer = null;

  function startPlacement() {
    G.id++;
    stopTimer();
    G.my = emptyFleet();
    selId = null;
    show('place');
    B.place.setup();
    buildDock();
    renderPlace();
    layout();   // size the board around the ship dock now that the dock is built
    placeMsg(T('Drag a ship onto the board, or press Enter on a ship to put it on the board.', 'Arrastra un barco al tablero, o pulsa Enter en un barco para ponerlo en el tablero.'));
    focusLater($('.ship-pick'));
  }
  function buildDock() {
    var box = $('#dock-cards');
    box.innerHTML = '';
    SHIPS.forEach(function (sh) {
      var card = document.createElement('div');
      card.className = 'ship-card'; card.setAttribute('data-id', sh.id);
      var w = (sh.len - 1) * U;
      card.innerHTML = '<div class="sc-top"><div><div class="sc-name">' + sh.name + '</div><div class="sc-len">' + T(sh.len + ' points long', sh.len + ' puntos de largo') + '</div></div><span class="sc-status"></span></div>' +
        '<button type="button" class="ship-pick"><svg viewBox="-48 -36 ' + (w + 110) + ' 72"><g class="ship ship-' + sh.id + '"><g class="ship-body">' + shipArt(sh.id) + '</g></g></svg></button>' +
        '<div class="sc-pts" aria-live="polite"></div>';
      box.appendChild(card);
      var btn = card.querySelector('.ship-pick');
      btn.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        var svg = btn.querySelector('svg'), r = svg.getBoundingClientRect();
        var vbW = w + 110, lx = (e.clientX - r.left) / r.width * vbW - 48;
        var idx = Math.max(0, Math.min(sh.len - 1, Math.round(lx / U)));
        beginDrag(e, sh.id, true, idx);
      });
      btn.addEventListener('click', function (e) {
        if (e.detail !== 0) return;          // mouse clicks are handled by the drag code; this is Enter / Space
        dockActivate(sh.id);
      });
    });
  }
  function dockActivate(id) {
    var s = G.my[id];
    if (!s.placed) {
      var spot = findSpot(id);
      if (!spot) { Sound.play('invalid'); placeMsg(T('There is no room for this ship. Move the other ship first.', 'No hay espacio para este barco. Mueve primero el otro barco.'), 'bad'); return; }
      G.my[id] = { id: id, x: spot.x, y: spot.y, dir: spot.dir, placed: true };
      Sound.play('place');
    } else Sound.play('click');
    selId = id;
    renderPlace();
    placeMsg(T('Arrow keys move ' + SHIP[id].name + '. R rotates it. Tab to the next control when you are done.', 'Las flechas mueven el ' + SHIP[id].name + '. R lo gira. Pulsa Tab para seguir cuando termines.'), 'good');
    focusLater(B.place.shipEls[id]);
  }
  function findSpot(id) {
    var c = (G.min + G.max) / 2, list = [];
    for (var x = G.min; x <= G.max; x++) for (var y = G.min; y <= G.max; y++) ['h', 'v'].forEach(function (d) { list.push({ x: x, y: y, dir: d }); });
    list.sort(function (a, b) {
      var la = SHIP[id].len - 1;
      var da = Math.abs(a.x + (a.dir === 'h' ? la / 2 : 0) - c) + Math.abs(a.y + (a.dir === 'v' ? la / 2 : 0) - c) + (a.dir === 'v' ? 0.01 : 0);
      var db = Math.abs(b.x + (b.dir === 'h' ? la / 2 : 0) - c) + Math.abs(b.y + (b.dir === 'v' ? la / 2 : 0) - c) + (b.dir === 'v' ? 0.01 : 0);
      return da - db;
    });
    for (var i = 0; i < list.length; i++) if (check(G.my, id, list[i].x, list[i].y, list[i].dir).ok) return list[i];
    return null;
  }
  function placeMsg(text, kind) {
    var m = $('#place-msg');
    m.className = 'pmsg' + (kind ? ' ' + kind : '');
    m.textContent = text;
  }
  function badWhy(r) {
    if (r.why === 'off') return T('Not allowed: ships must stay on the coordinate plane.', 'No se puede: los barcos deben quedarse en el plano cartesiano.');
    return T('Not allowed: ships can’t overlap. ' + SHIP[r.other].name + ' is already on ' + pair(r.at[0], r.at[1]) + '.', 'No se puede: los barcos no pueden encimarse. El ' + SHIP[r.other].name + ' ya está en ' + pair(r.at[0], r.at[1]) + '.');
  }
  // Ships may overlap while the student is still arranging them; START GAME stays locked until they don't.
  function sharedPoints() {
    // every point covered by more than one placed ship
    var seen = {}, out = [];
    SHIPS.forEach(function (sh) {
      var s = G.my[sh.id];
      if (!s.placed) return;
      cellsOf(s).forEach(function (c) { var k = key(c[0], c[1]); seen[k] = (seen[k] || 0) + 1; if (seen[k] === 2) out.push(c); });
    });
    return out;
  }
  function isShared(p) { return sharedPoints().some(function (c) { return c[0] === p[0] && c[1] === p[1]; }); }
  function allPlaced() { return SHIPS.every(function (sh) { return G.my[sh.id].placed; }); }
  function overlapMsg() {
    var all = sharedPoints(), sp = all.slice(0, 3).map(function (c) { return pair(c[0], c[1]); }).join(', ') + (all.length > 3 ? ' …' : '');   // at most three points, so it fits
    return T('Ships overlap on ' + sp + '. Move them onto different points to start.', 'Los barcos se enciman en ' + sp + '. Sepáralos en puntos diferentes para empezar.');
  }
  // after any change: say where the ship is, or warn (in red) that the ships overlap
  function placedMsg(text) {
    if (sharedPoints().length) { placeMsg(overlapMsg(), 'bad'); say(overlapMsg(), true); }
    else placeMsg(text, 'good');
  }
  function shipLabel(s) {
    var c = cellsOf(s);
    return SHIP[s.id].name + ', ' + (s.dir === 'h' ? T('horizontal', 'horizontal') : T('vertical', 'vertical')) + ', ' + T('on', 'en') + ' ' + c.map(function (p) { return pair(p[0], p[1]); }).join(', ') +
      '. ' + T('Arrow keys move it, R or Enter rotates it.', 'Las flechas lo mueven; R o Enter lo gira.');
  }
  function renderPlace() {
    var b = B.place;
    b.clearShips(); b.L.ui.innerHTML = '';
    SHIPS.forEach(function (sh) {
      var s = G.my[sh.id];
      var card = $('.ship-card[data-id="' + sh.id + '"]');
      card.classList.toggle('placed', !!s.placed);
      card.classList.toggle('sel', selId === sh.id);
      card.querySelector('.sc-status').textContent = s.placed ? T('✓ On the board', '✓ En el tablero') : T('Not placed', 'Sin ubicar');
      card.querySelector('.sc-pts').innerHTML = s.placed ? cellsOf(s).map(function (p) { return '<b>' + pair(p[0], p[1]) + '</b>'; }).join(' ') : '&nbsp;';
      card.querySelector('.ship-pick').setAttribute('aria-label', s.placed
        ? T(sh.name + ' is on the board. Press Enter to select it.', 'El ' + sh.name + ' está en el tablero. Pulsa Enter para seleccionarlo.')
        : T(sh.name + ', ' + sh.len + ' points long. Press Enter to put it on the board, or drag it.', sh.name + ', ' + sh.len + ' puntos de largo. Pulsa Enter para ponerlo en el tablero, o arrástralo.'));
      if (!s.placed) return;
      var g = b.drawShip(s, (selId === sh.id ? 'sel' : '') + (drag && drag.id === sh.id && drag.moved ? ' drag-src' : ''));
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', shipLabel(s));
      b.shipEls[sh.id] = g;
      g.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        var p = b.toBoard(e.clientX, e.clientY);
        var idx = s.dir === 'h' ? Math.round(p.fx) - s.x : Math.round(p.fy) - s.y;
        beginDrag(e, sh.id, false, Math.max(0, Math.min(sh.len - 1, idx)));
      });
      g.addEventListener('keydown', function (e) { shipKey(e, sh.id); });
      g.addEventListener('focus', function () { if (selId !== sh.id) { selId = sh.id; markSel(); } });
      if (selId === sh.id) cellsOf(s).forEach(function (p) { if (!isShared(p)) b.ring(p[0], p[1], 'occ ok', 17); });
    });
    var shared = sharedPoints();
    if (shared.length) {
      SHIPS.forEach(function (sh) { if (b.shipEls[sh.id]) b.shipEls[sh.id].classList.add('overlap'); });
      shared.forEach(function (c) { b.ring(c[0], c[1], 'occ bad', 21); });
    }
    $('#btn-start').disabled = !allPlaced() || shared.length > 0;
  }
  function markSel() {
    SHIPS.forEach(function (sh) {
      var g = B.place.shipEls[sh.id];
      if (g) g.classList.toggle('sel', selId === sh.id);
      $('.ship-card[data-id="' + sh.id + '"]').classList.toggle('sel', selId === sh.id);
    });
    B.place.L.ui.innerHTML = '';
    if (selId && G.my[selId].placed) cellsOf(G.my[selId]).forEach(function (p) { if (!isShared(p)) B.place.ring(p[0], p[1], 'occ ok', 17); });
    sharedPoints().forEach(function (c) { B.place.ring(c[0], c[1], 'occ bad', 21); });
  }
  function refocusShip(id) { var g = B.place.shipEls[id]; if (g) g.focus(); }

  function shipKey(e, id) {
    var k = e.key, s = G.my[id];
    var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[k];
    if (d) {
      e.preventDefault();
      // slide one point; ships may pass over each other (they turn red while they overlap), but not off the board
      var nx = s.x + d[0], ny = s.y + d[1];
      var r = check(G.my, id, nx, ny, s.dir);
      if (r.ok || r.why === 'overlap') { s.x = nx; s.y = ny; Sound.play(r.ok ? 'place' : 'invalid'); renderPlace(); refocusShip(id); placedMsg(T(SHIP[id].name + ' is on ', 'El ' + SHIP[id].name + ' está en ') + cellsOf(s).map(function (p) { return pair(p[0], p[1]); }).join(', ') + '.'); return; }
      flashBad(id, nx, ny, s.dir, r);
      return;
    }
    if (k === 'r' || k === 'R' || k === 'Enter' || k === ' ') { e.preventDefault(); rotateShip(id, Math.floor(SHIP[id].len / 2)); refocusShip(id); return; }
    if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); selId = null; markSel(); $('.ship-card[data-id="' + id + '"] .ship-pick').focus(); }
  }
  function rotateShip(id, pivot) {
    var s = G.my[id], nd = s.dir === 'h' ? 'v' : 'h', len = SHIP[id].len;
    var order = [pivot];
    for (var i = 0; i < len; i++) if (i !== pivot) order.push(i);
    // prefer a spot that doesn't overlap the other ship, but allow one that does (never one off the board)
    var first = null, spot = null;
    for (i = 0; i < order.length; i++) {
      var k = order[i], c = cellsOf(s)[k];
      var nx = nd === 'h' ? c[0] - k : c[0], ny = nd === 'v' ? c[1] - k : c[1];
      var r = check(G.my, id, nx, ny, nd);
      if (!first) first = { x: nx, y: ny, r: r };
      if (r.ok) { spot = { x: nx, y: ny }; break; }
      if (r.why === 'overlap' && !spot) spot = { x: nx, y: ny };
    }
    if (spot) {
      s.x = spot.x; s.y = spot.y; s.dir = nd; selId = id;
      Sound.play('rotate'); renderPlace();
      placedMsg(T(SHIP[id].name + ' is now ' + (nd === 'h' ? 'horizontal' : 'vertical') + ': ', 'El ' + SHIP[id].name + ' ahora está en ' + (nd === 'h' ? 'horizontal' : 'vertical') + ': ') + cellsOf(s).map(function (p) { return pair(p[0], p[1]); }).join(', ') + '.');
      say(shipLabel(s));
      return true;
    }
    flashBad(id, first.x, first.y, nd, first.r);
    placeMsg(T('No room to rotate ' + SHIP[id].name + ' here. ', 'No hay espacio para girar el ' + SHIP[id].name + ' aquí. ') + badWhy(first.r), 'bad');
    return false;
  }
  // show a red "can't go here" ghost for a moment
  function flashBad(id, x, y, dir, r) {
    Sound.play('invalid');
    var b = B.place;
    var g = b.drawShip({ id: id, x: x, y: y, dir: dir }, 'ghost badpos', b.L.ui);
    var marks = [];
    (r.cells || []).forEach(function (p) {
      if (onBoard(p[0], p[1])) marks.push(b.ring(p[0], p[1], 'occ bad', 17));
    });
    placeMsg(badWhy(r), 'bad');
    say(badWhy(r), true);
    setTimeout(function () { g.remove(); marks.forEach(function (m) { m.remove(); }); }, 700);
  }

  // ---- dragging with a mouse, pen or finger
  function beginDrag(e, id, fromDock, idx) {
    e.preventDefault();
    var s = G.my[id];
    drag = { id: id, fromDock: fromDock && !s.placed, dockSrc: fromDock, idx: idx, x0: e.clientX, y0: e.clientY, moved: false, dir: s.placed ? s.dir : 'h', over: false, spot: null };
    window.addEventListener('pointermove', dragMove);
    window.addEventListener('pointerup', dragEnd);
    window.addEventListener('pointercancel', dragCancel);
  }
  function dragMove(e) {
    if (!drag) return;
    if (!drag.moved) {
      if (Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) < 7) return;
      drag.moved = true;
      selId = drag.id;
      renderPlace();
    }
    var b = B.place, p = b.toBoard(e.clientX, e.clientY);
    var over = p.fx > G.min - 1.2 && p.fx < G.max + 1.2 && p.fy > G.min - 1.2 && p.fy < G.max + 1.2;
    drag.over = over;
    b.L.ui.innerHTML = '';
    if (over) {
      hideGhost();
      var ax = Math.round(p.fx) - (drag.dir === 'h' ? drag.idx : 0), ay = Math.round(p.fy) - (drag.dir === 'v' ? drag.idx : 0);
      var r = check(G.my, drag.id, ax, ay, drag.dir);
      drag.spot = { x: ax, y: ay, r: r };
      b.drawShip({ id: drag.id, x: ax, y: ay, dir: drag.dir }, 'ghost' + (r.ok ? '' : ' badpos'), b.L.ui);
      r.cells.forEach(function (c) {
        if (!onBoard(c[0], c[1])) return;
        if (r.ok) b.ring(c[0], c[1], 'occ ok', 17);
        else b.ring(c[0], c[1], 'occ bad', 17);
      });
      if (r.ok) placeMsg(T('Drop to place on ', 'Suelta para ubicarlo en ') + r.cells.map(function (c) { return pair(c[0], c[1]); }).join(', '), 'good');
      else if (r.why === 'overlap') placeMsg(T('This overlaps ' + SHIP[r.other].name + '. You can drop it, but ships must be apart to start.', 'Esto se encima con el ' + SHIP[r.other].name + '. Puedes soltarlo, pero deben estar separados para empezar.'), 'bad');
      else placeMsg(badWhy(r), 'bad');
    } else {
      drag.spot = null;
      showGhost(e.clientX, e.clientY);
      placeMsg(T('Bring the ship over the board.', 'Lleva el barco sobre el tablero.'));
    }
  }
  function showGhost(cx, cy) {
    var b = B.place, upx = b.unitPx(), len = SHIP[drag.id].len, w = (len - 1) * U;
    if (!ghostEl) {
      ghostEl = document.createElement('div');
      ghostEl.className = 'drag-ghost';
      ghostEl.innerHTML = '<svg viewBox="-48 -36 ' + (w + 110) + ' 72" style="display:block;width:' + ((w + 110) / U * upx) + 'px;overflow:visible"><g class="ship ship-' + drag.id + '"><g class="ship-body">' + shipArt(drag.id) + '</g></g></svg>';
      app.appendChild(ghostEl);
    }
    var ar = app.getBoundingClientRect(), sc = upx / U;
    var gx = (48 + drag.idx * U) * sc, gy = 36 * sc;
    ghostEl.style.left = (cx - ar.left - gx) + 'px';
    ghostEl.style.top = (cy - ar.top - gy) + 'px';
    ghostEl.style.transformOrigin = gx + 'px ' + gy + 'px';
    ghostEl.style.transform = drag.dir === 'v' ? 'rotate(-90deg)' : '';
  }
  function hideGhost() { if (ghostEl) { ghostEl.remove(); ghostEl = null; } }
  function dragDone() {
    window.removeEventListener('pointermove', dragMove);
    window.removeEventListener('pointerup', dragEnd);
    window.removeEventListener('pointercancel', dragCancel);
    hideGhost();
  }
  function dragCancel() { dragDone(); drag = null; renderPlace(); }
  function dragEnd() {
    var d = drag; dragDone(); drag = null;
    if (!d) return;
    if (!d.moved) {
      if (d.dockSrc) { dockActivate(d.id); return; }
      selId = d.id;
      rotateShip(d.id, d.idx);
      refocusShip(d.id);
      return;
    }
    if (d.over && d.spot) {
      if (d.spot.r.ok || d.spot.r.why === 'overlap') {
        G.my[d.id] = { id: d.id, x: d.spot.x, y: d.spot.y, dir: d.dir, placed: true };
        selId = d.id;
        Sound.play(d.spot.r.ok ? 'place' : 'invalid');
        renderPlace();
        placedMsg(T(SHIP[d.id].name + ' placed on ', SHIP[d.id].name + ' ubicado en ') + cellsOf(G.my[d.id]).map(function (c) { return pair(c[0], c[1]); }).join(', ') + '.');
        if (allPlaced() && !sharedPoints().length) setTimeout(function () { if (!sharedPoints().length) placeMsg(T('Fleet ready! Rotate or move ships, or press START GAME.', '¡Flota lista! Gira o mueve los barcos, o pulsa EMPEZAR.'), 'good'); }, 1400);
        return;
      }
      Sound.play('invalid');
      renderPlace();
      placeMsg(badWhy(d.spot.r) + ' ' + T('The ship went back.', 'El barco regresó.'), 'bad');
      say(badWhy(d.spot.r), true);
      return;
    }
    renderPlace();
    placeMsg(T('Drop the ship on the board’s points to place it.', 'Suelta el barco sobre los puntos del tablero para ubicarlo.'));
  }

  $('#btn-random').addEventListener('click', function () {
    G.my = randomFleet(); selId = null;
    Sound.play('rotate'); renderPlace();
    placeMsg(T('Random fleet placed. Move or rotate the ships if you like, then press START GAME.', 'Flota ubicada al azar. Mueve o gira los barcos si quieres, y pulsa EMPEZAR.'), 'good');
  });
  $('#place-back').addEventListener('click', function () { Sound.play('click'); showInstructions(false); });
  $('#btn-start').addEventListener('click', function () {
    if (!allPlaced()) return;
    if (sharedPoints().length) { Sound.play('invalid'); placeMsg(overlapMsg(), 'bad'); return; }
    Sound.play('click');
    startBattle();
  });

  // ---------------------------------------------------------------- battle
  function startBattle() {
    G.id++;
    var id = G.id;
    selId = null;
    G.foe = randomFleet();
    G.myHits = {}; G.foeHits = {}; G.shots = [];
    G.ai = { tried: {}, open: [] };
    G.sinceQuiz = 0; G.round = 0;
    G.sunkMe = {}; G.sunkFoe = {}; G.shown = {};   // ships the fleet bar may call SUNK (only after their sinking has played)
    G.slowNext = false;
    G.rep = { find: [0, 0], radar: [0, 0], orders: [0, 0], turn: [0, 0], errs: {} };   // for the end-of-game report
    show('battle');
    B.me.setup(); B.foe.setup();
    SHIPS.forEach(function (sh) { B.me.shipEls[sh.id] = B.me.drawShip(G.my[sh.id]); });
    boardHistory();
    $('#timer').hidden = !G.hard;
    updateFleets();
    layout();
    battleLoop(id);
  }
  function alive(id) { return G.id === id && G.screen === 'battle'; }

  function battleLoop(id) {
    (function round() {
      if (!alive(id)) return;
      G.round++;
      var pre = Promise.resolve();
      // 3-Star: some turns start with one question of its own (a Radar Check or a Turn Check); a turn never asks more
      // than one question before the shot, so a turn with one of these never also gets Orders from HQ
      G.askedPre = false;
      if (G.hard && G.round > 1 && (G.sinceQuiz >= 2 || Math.random() < 0.45)) {
        G.sinceQuiz = 0; G.askedPre = true;
        pre = Math.random() < 0.35 ? turnCheck(id) : radarCheck(id);
      }
      else G.sinceQuiz++;
      pre.then(function () { return alive(id) && playerTurn(id); })
        .then(function () {
          if (!alive(id)) return;
          if (allSunk(G.foe, G.foeHits)) return endGame(id, true);
          return wait(500).then(function () { return alive(id) && enemyTurn(id); }).then(function () {
            if (!alive(id)) return;
            if (allSunk(G.my, G.myHits)) return endGame(id, false);
            return wait(400).then(round);
          });
        });
    })();
  }
  function isSunk(fleet, hits, sid) { return cellsOf(fleet[sid]).every(function (c) { return hits[key(c[0], c[1])]; }); }
  function allSunk(fleet, hits) { return SHIPS.every(function (sh) { return isSunk(fleet, hits, sh.id); }); }

  function setTurn(kind, text, icon) {
    var t = $('#turn');
    t.className = 'turn anim' + (kind === 'foe' ? ' foe' : kind === 'radar' ? ' radar' : '');
    $('#turn-txt').textContent = text;
    $('#turn-ico').innerHTML = icon;
    void t.offsetWidth;
  }
  function updateFleets() {
    function row(fleet, hits, mine) {
      return SHIPS.map(function (sh) {
        var sunk = isSunk(fleet, hits, sh.id) && !!G.shown[(mine ? 'me:' : 'foe:') + sh.id];
        var pegs = '';
        if (mine) cellsOf(fleet[sh.id]).forEach(function (c) { pegs += '<i class="' + (hits[key(c[0], c[1])] ? 'h' : '') + '"></i>'; });
        else for (var i = 0; i < sh.len; i++) pegs += '<i class="' + (sunk ? 'h' : '') + '"></i>';
        var hitN = mine ? cellsOf(fleet[sh.id]).filter(function (c) { return hits[key(c[0], c[1])]; }).length : 0;
        return '<span class="fs' + (sunk ? ' sunk' : '') + '" aria-label="' + esc(sh.name + ': ' + (sunk ? T('sunk', 'hundido') : mine ? T(hitN + ' of ' + sh.len + ' points hit', hitN + ' de ' + sh.len + ' puntos con impacto') : T('afloat', 'a flote'))) + '">' +
          '<span class="ico ico-' + sh.id + '" aria-hidden="true"></span><span class="nm">' + sh.name + '</span> <span class="pegs" aria-hidden="true">' + pegs + '</span>' + (sunk ? ' <span class="tag">' + T('SUNK', 'HUNDIDO') + '</span>' : '') + '</span>';
      }).join('');
    }
    $('#fleet-me').innerHTML = '<span class="fl-t"><span class="lg">' + T('YOUR FLEET', 'TU FLOTA') + '</span><span class="sh">' + T('YOU', 'TÚ') + '</span></span>' + row(G.my, G.myHits, true);
    $('#fleet-foe').innerHTML = '<span class="fl-t"><span class="lg">' + T('ENEMY FLEET', 'FLOTA ENEMIGA') + '</span><span class="sh">' + T('ENEMY', 'ENEMIGO') + '</span></span>' + row(G.foe, G.foeHits, false);
  }
  function activeZone(which, tag) {
    ['me', 'foe'].forEach(function (w) {
      var z = $('#zone-' + w);
      z.classList.toggle('active', w === which);
      var t = z.querySelector('.ztag');
      if (t) t.remove();
      if (w === which && tag) { t = document.createElement('div'); t.className = 'ztag'; t.textContent = tag; z.appendChild(t); }
    });
    if (which && $('#arena').classList.contains('lay-stack')) {
      var z = $('#zone-' + which);
      setTimeout(function () { z.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);
    }
  }
  function banner(kind, title, sub, ms) {
    var b = $('#banner');
    b.className = kind;
    b.innerHTML = '<div class="bn"><div class="bn-t">' + title + '</div>' + (sub ? '<div class="bn-s">' + sub + '</div>' : '') + '</div>';
    b.hidden = false;
    say(title.replace(/<[^>]+>/g, '') + '. ' + (sub || '').replace(/<[^>]+>/g, ''), true);
    return wait(ms || 1300).then(function () { b.hidden = true; });
  }
  function shotLog() {
    var items = G.shots.slice().reverse().map(function (s) {
      return '<li class="' + (s.hit ? 'hit' : '') + '">' + pair(s.x, s.y) + ' ' + (s.hit ? '&#128293; ' + T('HIT', 'IMPACTO') : '&#10006; ' + T('MISS', 'AGUA')) + '</li>';
    });
    return '<div class="log"><h3>' + T('YOUR SHOTS', 'TUS DISPAROS') + '</h3><ol>' + (items.join('') || '<li class="none">' + T('No shots yet', 'Aún no hay disparos') + '</li>') + '</ol></div>';
  }
  function setPin(html) { var p = $('#pin'); p.innerHTML = html || ''; p.hidden = !html; }
  function panel(html) { $('#panel').innerHTML = '<div class="pfit"><div class="task fade-in">' + html + '</div>' + shotLog() + '</div>'; fitPanel(); }

  // ---------------- the student's shot
  function playerTurn(id) {
    return new Promise(function (resolve) {
      setTurn('me', T('YOUR TURN', 'TU TURNO'), '&#127919;');
      setPin(null);
      activeZone('foe', T('Fire here!', '¡Dispara aquí!'));
      // 3-Star, now and then: HQ describes the target in words and the student must type its ordered pair
      var orders = G.hard && G.round > 1 && !G.askedPre && Math.random() < 0.4 ? ordersTarget() : null;
      renderFire(orders);
      G.onFire = function (x, y) {
        if (orders && (x !== orders.x || y !== orders.y)) {
          orders.tries++;
          if (orders.tries === 1) noteAnswer(false, 'orders');
          Sound.play('wrong');
          $('#orders-fb').innerHTML = '<div class="fb bad"><b class="nq">' + T('NOT QUITE! Try again.', '¡CASI! Inténtalo de nuevo.') + '</b> ' +
            (orders.tries >= 2 ? T('The point described is <b>' + pair(orders.x, orders.y) + '</b>. Type it to fire.', 'El punto descrito es <b>' + pair(orders.x, orders.y) + '</b>. Escríbelo para disparar.')
              : esc(analyze(orders.x, orders.y, x, y))) + '</div>';
          var inp = $('#in-pair'); if (inp) { inp.select(); inp.focus(); }
          return;
        }
        if (orders && !orders.tries) { noteAnswer(true, 'orders'); Sound.play('correct'); }
        G.onFire = null; stopTimer();
        fireAt(id, x, y).then(resolve);
      };
      if (G.hard) startTimer(TIME.fire, function () {
        if (!G.onFire) return;
        G.onFire = null;
        Sound.play('timeout');
        lockEntry();
        banner('time', '&#9200; ' + T('TIME’S UP!', '¡SE ACABÓ EL TIEMPO!'), T('You lose this shot. Next time, type the ordered pair a little faster.', 'Pierdes este disparo. La próxima vez, escribe el par ordenado un poco más rápido.'), 2200).then(resolve);
      });
    });
  }
  // the on-screen keypad offers only the digits that are on this board
  function padKeys() {
    var digits = [];
    for (var d = 0; d <= G.max; d++) digits.push(String(d));
    if (G.mode === 'easy') return digits.concat(['back']);
    if (G.hard) return ['(', '-'].concat(digits, [',', ')', 'back']);
    return ['-'].concat(digits, ['back']);
  }
  function padHTML() {
    return '<div class="pad" aria-hidden="true">' + padKeys().map(function (k) {
      var lbl = k === 'back' ? '&#9003;' : k === '-' ? '&minus;' : k;
      return '<button type="button" tabindex="-1" data-k="' + esc(k) + '">' + lbl + '</button>';
    }).join('') + '</div>';
  }
  // a point the player hasn't fired at yet (with axis points coming up regularly)
  function ordersTarget() {
    var cand = [];
    for (var x = G.min; x <= G.max; x++) for (var y = G.min; y <= G.max; y++)
      if (!G.shots.some(function (s) { return s.x === x && s.y === y; })) cand.push([x, y]);
    if (!cand.length) return null;
    var sinceAxis = 0;
    for (var i = G.shots.length - 1; i >= 0 && !onAxis(G.shots[i].x, G.shots[i].y); i--) sinceAxis++;
    var c = pick(axisOften(cand, sinceAxis));
    return { x: c[0], y: c[1], tries: 0 };
  }
  function renderFire(orders) {
    var lo = num(G.min), hi = num(G.max);
    var html = '<h2 class="me">' + T('YOUR TURN: FIRE!', 'TU TURNO: ¡DISPARA!') + '</h2>';
    if (orders) {
      html += '<p><b>' + T('&#128251; ORDERS FROM HQ:', '&#128251; ÓRDENES DEL CUARTEL:') + '</b> ' + T('fire at this point. Type it as an <b>ordered pair</b>.', 'dispara a este punto. Escríbelo como <b>par ordenado</b>.') + '</p>' +
        '<div class="words">' + describe(orders.x, orders.y) + '</div>' +
        '<div class="entry"><input type="text" id="in-pair" class="wide" autocomplete="off" spellcheck="false" maxlength="14" placeholder="( ? , ? )" aria-label="' + esc(T('Ordered pair for the point HQ described', 'Par ordenado del punto que describió el cuartel')) + '"></div>' +
        '<div id="orders-fb" aria-live="polite"></div>';
    } else if (G.hard) {
      html += '<p>' + T('Type the <b>whole ordered pair</b> to fire at the opponent&rsquo;s board.', 'Escribe el <b>par ordenado completo</b> para disparar al tablero del oponente.') + '</p>' +
        '<div class="entry"><input type="text" id="in-pair" class="wide" autocomplete="off" spellcheck="false" maxlength="14" placeholder="( ? , ? )" aria-label="' + esc(T('Ordered pair, like (2, -3)', 'Par ordenado, como (2, -3)')) + '"></div>';
    } else {
      html += '<p>' + T('Enter a coordinate on the <b>opponent&rsquo;s board</b>.', 'Escribe una coordenada del <b>tablero del oponente</b>.') + '</p>' +
        '<div class="entry" role="group" aria-label="' + esc(T('Coordinate to fire at', 'Coordenada para disparar')) + '">(<input type="text" id="in-x" class="ix" autocomplete="off" maxlength="2" aria-label="' + esc(T('x-coordinate, from ' + lo + ' to ' + hi, 'coordenada x, de ' + lo + ' a ' + hi)) + '">,<input type="text" id="in-y" class="iy" autocomplete="off" maxlength="2" aria-label="' + esc(T('y-coordinate, from ' + lo + ' to ' + hi, 'coordenada y, de ' + lo + ' a ' + hi)) + '">)</div>' +
        '<div class="entry-lbl" aria-hidden="true"><span class="lx">x</span><span class="ly">y</span></div>';
    }
    html += '<p class="err" id="fire-err" role="alert"></p>' + padHTML() +
      '<div class="fire-row"><button type="button" class="btn red" id="btn-fire">&#128165; ' + T('FIRE', 'FUEGO') + '</button></div>' +
      '<div class="reminder">' + T('<b class="cx">x</b> first: left/right &middot; <b class="cy">y</b> second: up/down', '<b class="cx">x</b> primero: izquierda/derecha &middot; <b class="cy">y</b> segundo: arriba/abajo') + '</div>';
    panel(html);
    var inputs = G.hard ? [$('#in-pair')] : [$('#in-x'), $('#in-y')];
    var active = inputs[0];
    inputs.forEach(function (inp, i) {
      if (TOUCH) inp.setAttribute('inputmode', 'none');
      else inp.setAttribute('inputmode', G.hard ? 'text' : G.mode === 'easy' ? 'numeric' : 'text');
      inp.addEventListener('focus', function () { active = inp; });
      inp.addEventListener('input', function () { cleanInput(inp, i, inputs); });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); tryFire(); }
        else if (e.key === 'Backspace' && i === 1 && !inp.value) { e.preventDefault(); inputs[0].focus(); }
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('#panel .pad button'), function (b) {
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-k');
        Sound.play('click');
        if (k === 'back') {
          if (!active.value && active === inputs[1]) { active = inputs[0]; }
          active.value = active.value.slice(0, -1);
        } else active.value += k;
        cleanInput(active, inputs.indexOf(active), inputs);
        if (!TOUCH) active.focus();
        if (inputs.length === 2 && inputs.indexOf(active) === 0 && /^-?\d$/.test(inputs[0].value) && inRange(+inputs[0].value)) active = inputs[1];
      });
    });
    $('#btn-fire').addEventListener('click', tryFire);
    focusLater(inputs[0]);
  }
  function inRange(v) { return v >= G.min && v <= G.max; }
  function rangeMsg() { return T('Keep each coordinate between ' + num(G.min) + ' and ' + num(G.max) + '.', 'Cada coordenada debe estar entre ' + num(G.min) + ' y ' + num(G.max) + '.'); }
  function fireErr(msg, inp) {
    var e = $('#fire-err'); if (!e) return;
    e.textContent = msg || '';
    if (inp) { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); }
  }
  // only whole numbers in range; no letters, no decimals
  function cleanInput(inp, i, inputs) {
    var v = inp.value.replace(/−/g, '-'), msg = '';
    if (G.hard) {
      if (/[.]/.test(v)) msg = T('Coordinates on this board are whole numbers (no decimals).', 'Las coordenadas de este tablero son números enteros (sin decimales).');
      else if (/[^()\-,\d\s]/.test(v)) msg = T('Use only numbers, a minus sign, parentheses ( ) and a comma.', 'Usa solo números, el signo menos, paréntesis ( ) y una coma.');
      inp.value = v.replace(/[^()\-,\d\s]/g, '');
      fireErr(msg, msg ? inp : null);
      if (!msg) inp.classList.remove('bad');
      return;
    }
    // both numbers typed (or pasted) into the x box at once, like "2-3" or "2,-3": x keeps the first, y gets the second
    var both = i === 0 && inputs[1] && v.match(/^\s*\(?\s*(-?\d)\s*[,\s]?\s*(-?\d)\s*\)?\s*$/);
    if (both) { v = both[1]; inputs[1].value = both[2]; cleanInput(inputs[1], 1, inputs); inp.value = v; if (document.activeElement === inp) inputs[1].focus(); return; }
    if (/[.]/.test(v)) msg = T('Coordinates on this board are whole numbers (no decimals).', 'Las coordenadas de este tablero son números enteros (sin decimales).');
    else if (/[^\-\d]/.test(v)) msg = T('Type a number.', 'Escribe un número.');
    v = v.replace(/[^\-\d]/g, '');
    if (G.mode === 'easy' && v.indexOf('-') >= 0) { v = v.replace(/-/g, ''); msg = T('Easy mode has no negative numbers. ', 'El modo fácil no tiene números negativos. ') + rangeMsg(); }
    v = v.replace(/(?!^)-/g, '');
    if (v.length > 2 || (v.length === 2 && v[0] !== '-')) { v = v.slice(-1); }
    inp.value = v;
    if (/^-?\d$/.test(v) && !inRange(+v)) msg = rangeMsg();
    fireErr(msg, msg ? inp : null);
    if (!msg) inp.classList.remove('bad');
    if (!msg && i === 0 && /^-?\d$/.test(v) && inputs[1] && document.activeElement === inp) inputs[1].focus();
  }
  function parsePair(raw) {
    var v = raw.replace(/−/g, '-').replace(/\s+/g, '');
    if (!v) return { err: T('Type an ordered pair, like (2,-1).', 'Escribe un par ordenado, como (2,-1).') };
    if (v[0] !== '(') return { err: T('An ordered pair starts with an opening parenthesis: (', 'Un par ordenado empieza con un paréntesis de apertura: (') };
    if (v[v.length - 1] !== ')') return { err: T('Close the ordered pair with a parenthesis: )', 'Cierra el par ordenado con un paréntesis: )') };
    var inner = v.slice(1, -1);
    if (inner.indexOf(',') < 0) return { err: T('Separate x and y with a comma: (x, y)', 'Separa x y y con una coma: (x, y)') };
    var parts = inner.split(',');
    if (parts.length !== 2 || /[()]/.test(inner)) return { err: T('An ordered pair has exactly two numbers: (x, y)', 'Un par ordenado tiene exactamente dos números: (x, y)') };
    if (!/^-?\d+$/.test(parts[0]) || !/^-?\d+$/.test(parts[1])) return { err: T('Each coordinate must be a whole number, like (2,-1).', 'Cada coordenada debe ser un número entero, como (2,-1).') };
    var x = parseInt(parts[0], 10), y = parseInt(parts[1], 10);
    if (!inRange(x) || !inRange(y)) return { err: rangeMsg() };
    return { x: x, y: y };
  }
  function tryFire() {
    if (!G.onFire) return;
    var x, y;
    if (G.hard) {
      var r = parsePair($('#in-pair').value);
      if (r.err) { Sound.play('invalid'); fireErr(r.err, $('#in-pair')); $('#in-pair').focus(); return; }
      x = r.x; y = r.y;
    } else {
      var ix = $('#in-x'), iy = $('#in-y');
      var vx = ix.value.replace(/−/g, '-'), vy = iy.value.replace(/−/g, '-');
      if (!/^-?\d$/.test(vx)) { Sound.play('invalid'); fireErr(T('Enter the x-coordinate first.', 'Escribe primero la coordenada x.'), ix); ix.focus(); return; }
      if (!/^-?\d$/.test(vy)) { Sound.play('invalid'); fireErr(T('Now enter the y-coordinate.', 'Ahora escribe la coordenada y.'), iy); iy.focus(); return; }
      x = +vx; y = +vy;
      if (!inRange(x)) { Sound.play('invalid'); fireErr(rangeMsg(), ix); ix.focus(); return; }
      if (!inRange(y)) { Sound.play('invalid'); fireErr(rangeMsg(), iy); iy.focus(); return; }
    }
    G.onFire(x, y);
  }
  function lockEntry() {
    Array.prototype.forEach.call(document.querySelectorAll('#panel input, #panel button'), function (el) { el.disabled = true; });
  }

  // A gentle heads-up when a shot repeats an earlier one, or swaps x and y of an earlier one. The shot still happens.
  function shotNote(x, y) {
    var same = G.shots.some(function (s) { return s.x === x && s.y === y; });
    var swapped = x !== y && G.shots.some(function (s) { return s.x === y && s.y === x; });
    if (swapped && !same) return T('Heads up: you fired at ' + pair(y, x) + ' earlier. ' + pair(x, y) + ' is a different point, because x and y are swapped. Watch where this one lands!',
      'Atención: antes disparaste a ' + pair(y, x) + '. ' + pair(x, y) + ' es otro punto, porque x y y están intercambiadas. ¡Mira dónde cae este!');
    if (same) return T('You already fired at ' + pair(x, y) + '. That’s allowed: the plane will fly to the same point again.', 'Ya disparaste a ' + pair(x, y) + '. Se vale: el avión volará otra vez al mismo punto.');
    return '';
  }
  // Before some flights: which way will the plane turn at the x-axis? Points in Quadrants I and III need a
  // counterclockwise turn; points in Quadrants II and IV need a clockwise turn.
  function turnWords(x, y) {
    var ccw = x * y > 0;
    return {
      ccw: ccw,
      // the explanation names only the turn (clockwise / counterclockwise), never left or right
      why: T('At ' + pair(x, 0) + ' the plane turns <b>' + (ccw ? '&#8634; counterclockwise' : '&#8635; clockwise') + '</b> to fly <b>' + (y > 0 ? 'UP' : 'DOWN') + '</b> to ' + pair(x, y) + '. In Quadrants ' + (ccw ? 'I and III' : 'II and IV') + ' the turn is always ' + (ccw ? 'counterclockwise' : 'clockwise') + '.',
        'En ' + pair(x, 0) + ' el avión gira en <b>' + (ccw ? '&#8634; sentido antihorario' : '&#8635; sentido horario') + '</b> para volar hacia <b>' + (y > 0 ? 'ARRIBA' : 'ABAJO') + '</b> hasta ' + pair(x, y) + '. En los cuadrantes ' + (ccw ? 'I y III' : 'II y IV') + ' el giro siempre es en sentido ' + (ccw ? 'antihorario' : 'horario') + '.')
    };
  }
  function predictTurn(id, x, y, head) {
    return new Promise(function (resolve) {
      var tw = turnWords(x, y), done = false;
      panel(head + '<div class="predict"><p><b>' + T('Predict the turn!', '¡Predice el giro!') + '</b> ' +
        T('The plane flies along the x-axis to ' + pair(x, 0) + ', then turns to fly ' + wordY(y) + '. Which way will it turn?', 'El avión vuela por el eje x hasta ' + pair(x, 0) + ' y luego gira para volar ' + wordY(y) + '. ¿Hacia dónde girará?') + '</p>' +
        '<div class="choices">' +
        '<button type="button" class="btn" data-ccw="1"><span aria-hidden="true" style="opacity:.6;font-size:.8em">1</span> &#8634; ' + T('Counterclockwise', 'Antihorario') + '</button>' +
        '<button type="button" class="btn" data-ccw="0"><span aria-hidden="true" style="opacity:.6;font-size:.8em">2</span> &#8635; ' + T('Clockwise', 'Horario') + '</button></div>' +
        '<div id="predict-fb" aria-live="polite"></div></div>');
      var btns = document.querySelectorAll('#panel .predict .btn');
      function choose(ccw) {
        if (done || !alive(id)) return;
        done = true; G.quizKeys = null;
        var ok = ccw === tw.ccw;
        noteAnswer(ok, 'turn');
        Sound.play(ok ? 'correct' : 'wrong');
        Array.prototype.forEach.call(btns, function (b) {
          b.disabled = true;
          if ((b.getAttribute('data-ccw') === '1') === tw.ccw) b.classList.add('right'); else if (!ok) b.classList.add('wrong');
        });
        $('#predict-fb').innerHTML = '<div class="fb ' + (ok ? 'good' : 'info') + '">' + (ok ? '&#10004; ' + T('<b>Good prediction!</b> ', '<b>¡Buena predicción!</b> ') : T('<b>Watch the turn.</b> ', '<b>Mira el giro.</b> ')) + tw.why + '</div>';
        say($('#predict-fb').textContent);
        wait(ok ? 1300 : 2200).then(function () { resolve(tw); });
      }
      Array.prototype.forEach.call(btns, function (b) { b.addEventListener('click', function () { choose(b.getAttribute('data-ccw') === '1'); }); });
      G.quizKeys = function (e) { if (e.key === '1' || e.key === '2') { e.preventDefault(); choose(e.key === '1'); return true; } return false; };
      focusLater(btns[0]);
    });
  }

  function fireAt(id, x, y) {
    var b = B.foe;
    lockEntry();
    var note = shotNote(x, y);
    var head = '<h2 class="me">' + T('FIRING AT', 'DISPARANDO A') + ' ' + pair(x, y) + '</h2>' + (note ? '<div class="fb info">&#128161; ' + note + '</div>' : '');
    var info = head + '<p>' + T('Watch the plane: <b>x first</b> (' + (x === 0 ? 'x = 0, so no left or right' : units(x) + ' ' + wordX(x)) + '), then <b>y</b> (' + (y === 0 ? 'y = 0, so no up or down' : units(y) + ' ' + wordY(y)) + ').',
        'Mira el avión: <b>primero x</b> (' + (x === 0 ? 'x = 0, sin moverse a los lados' : units(x) + ' ' + wordX(x)) + '), luego <b>y</b> (' + (y === 0 ? 'y = 0, sin subir ni bajar' : units(y) + ' ' + wordY(y)) + ').') + '</p>';
    say(T('Firing at ', 'Disparando a ') + pair(x, y) + (note ? '. ' + note : ''));
    var ring = b.targetRing(x, y), lbl = b.coordLabel(x, y, pair(x, y));
    setPin('&#127919; ' + T('Firing at ', 'Disparando a ') + pair(x, y));
    var flight, turn = null;
    panel(info);
    return wait(0).then(function () {
      Sound.play('fire');
      return wait(800);
    }).then(function () {
      if (!alive(id)) return;
      return flyPath(b, x, y, { turnLabel: turn ? (turn.ccw ? '↺' : '↻') : null }).then(function (f) { flight = f; G.slowNext = false; });
    }).then(function () {
      if (!alive(id)) return;
      // lock on (a shrinking ring), the plane climbs away, then the burst at the point
      var ret = svgEl('g', { transform: 'translate(' + b.sx(x) + ',' + b.sy(y) + ')' }, b.L.fx);
      ret.innerHTML = '<g class="reticle"><circle r="20"/><path d="M0 -28 V-14 M0 14 V28 M-28 0 H-14 M14 0 H28" stroke="#e2541a" stroke-width="3"/></g>';
      Sound.play('lock');
      var a = flight.angle * Math.PI / 180, sx0 = b.sx(x), sy0 = b.sy(y);
      return wait(420).then(function () {
        ret.remove();
        return tween(420, function (t) {
          flight.plane.g.setAttribute('transform', 'translate(' + (sx0 + Math.cos(a) * 40 * t) + ',' + (sy0 + Math.sin(a) * 40 * t) + ') rotate(' + flight.angle + ') scale(' + (1 + t * 0.4) + ')');
          flight.plane.g.style.opacity = 1 - t;
        });
      });
    }).then(function () {
      if (!alive(id)) return;
      var sid = shipAt(G.foe, x, y), hit = !!sid, k = key(x, y), already = !!G.foeHits[k];
      if (hit) { b.explode(x, y); Sound.play('hit'); } else { b.splash(x, y); Sound.play('miss'); }
      return wait(600).then(function () {
        if (!alive(id)) return;
        b.addMark(x, y, hit);
        if (hit) G.foeHits[k] = true;
        G.shots.push({ x: x, y: y, hit: hit });
        return wait(450).then(function () {
          ring.remove(); lbl.remove();
          flight.parts.forEach(function (p) { p.remove(); });
          updateFleets();
          if (!hit) return banner('miss', '&#10006; ' + T('MISS', 'AGUA'), pair(x, y) + T(' is empty water.', ' es agua vacía.'), 1300);
          return banner('hit', '&#128293; ' + T('HIT!', '¡IMPACTO!'), already ? pair(x, y) + T(' was already hit.', ' ya tenía un impacto.') : pair(x, y) + T(' hit an enemy ship!', ' le dio a un barco enemigo!'), 1300).then(function () {
            if (already || !alive(id) || !isSunk(G.foe, G.foeHits, sid)) return;
            return sinkShip(b, G.foe[sid], true).then(function () {
              return banner('sunk', SHIP[sid].up + ' ' + T('SUNK!', '¡HUNDIDO!'), T('You sank the enemy’s ' + SHIP[sid].name + '!', '¡Hundiste el ' + SHIP[sid].name + ' enemigo!'), 1800);
            });
          });
        });
      });
    });
  }
  function sinkShip(b, s, reveal) {
    Sound.play('sink');
    var g = reveal ? b.drawShip(s, 'sinking') : b.shipEls[s.id];
    if (!reveal) g.classList.add('sinking');
    var c = cellsOf(s);
    c.forEach(function (p, i) { later(300 + i * 220, function () { b.splash(p[0], p[1]); }); });
    return wait(1900).then(function () { g.classList.remove('sinking'); g.classList.add('sunk'); G.shown[(reveal ? 'foe:' : 'me:') + s.id] = true; updateFleets(); });
  }

  // Points on an axis, like (0, 2) or (−1, 0), are where students mix up x and y most. Random targets land on them
  // about a third of the time anyway; this makes sure at least one of every three targets is on an axis.
  function onAxis(x, y) { return x === 0 || y === 0; }
  function axisOften(cand, sinceAxis) {
    if (sinceAxis === undefined) sinceAxis = G.ai.sinceAxis || 0;
    var ax = cand.filter(function (c) { return onAxis(c[0], c[1]); });
    return ax.length && sinceAxis >= 2 ? ax : cand;
  }

  // ---------------- the computer's shot
  function aiPick() {
    var ai = G.ai, tried = ai.tried;
    function free(x, y) { return onBoard(x, y) && !tried[key(x, y)]; }
    // how hard the computer hunts depends on the rank: 1-Star and 2-Star try the points around a hit;
    // 3-Star also works out which way the ship runs and follows it
    var level = G.hard ? 3 : 2;
    // a 1-Star general sometimes forgets and fires at a point it already tried (a wasted shot)
    var old = Object.keys(tried);
    if (G.mode === 'easy' && old.length && Math.random() < 0.15) { var o = pick(old).split(','); return { x: +o[0], y: +o[1], again: true }; }
    var open = ai.open, cand = [];
    if (open.length >= 2 && level === 3) {
      var sameY = open.every(function (p) { return p[1] === open[0][1]; }), sameX = open.every(function (p) { return p[0] === open[0][0]; });
      if (sameY || sameX) {
        var vals = open.map(function (p) { return sameY ? p[0] : p[1]; });
        var lo = Math.min.apply(null, vals) - 1, hi = Math.max.apply(null, vals) + 1;
        for (var v = lo; v <= hi; v++) {
          var cx = sameY ? v : open[0][0], cy = sameY ? open[0][1] : v;
          if (free(cx, cy)) cand.push([cx, cy]);
        }
        // try the ends first (that's how a ship continues), gaps after
        var ends = cand.filter(function (c) { var w = sameY ? c[0] : c[1]; return w === lo || w === hi; });
        if (ends.length) cand = ends;
      }
    }
    if (!cand.length && open.length) {
      open.forEach(function (p) {
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { if (free(p[0] + d[0], p[1] + d[1])) cand.push([p[0] + d[0], p[1] + d[1]]); });
      });
    }
    if (!cand.length) {
      for (var x = G.min; x <= G.max; x++) for (var y = G.min; y <= G.max; y++) if (free(x, y)) cand.push([x, y]);
      cand = axisOften(cand);
    }
    var c = pick(cand);
    return { x: c[0], y: c[1] };
  }
  function aiRecord(x, y, sid) {
    var ai = G.ai;
    ai.tried[key(x, y)] = true;
    ai.sinceAxis = onAxis(x, y) ? 0 : (ai.sinceAxis || 0) + 1;
    ai.lastShot = { x: x, y: y };
    if (!sid) return;
    ai.open.push([x, y]);
    if (isSunk(G.my, G.myHits, sid)) {
      var cs = cellsOf(G.my[sid]).map(function (c) { return key(c[0], c[1]); });
      ai.open = ai.open.filter(function (p) { return cs.indexOf(key(p[0], p[1])) < 0; });
    }
  }

  function enemyTurn(id) {
    var t = aiPick();
    setTurn('foe', T('ENEMY’S TURN', 'TURNO ENEMIGO'), '&#128680;');
    setPin(null);
    panel('<h2 class="foe">' + T('ENEMY FIRE!', '¡FUEGO ENEMIGO!') + '</h2><p>' + T('The computer is choosing a target&hellip;', 'La computadora está eligiendo un objetivo&hellip;') + '</p>');
    Sound.play('alarm');
    return banner('enemy', '&#128680; ' + T('ENEMY FIRE!', '¡FUEGO ENEMIGO!'), G.hard ? T('Read the enemy’s target carefully.', 'Lee con cuidado el objetivo del enemigo.') : T('The computer is firing at ', 'La computadora dispara a ') + pair(t.x, t.y), 1300).then(function () {
      if (!alive(id)) return;
      return locate(id, t.x, t.y);
    }).then(function (how) {
      if (!alive(id)) return;
      return resolveEnemy(id, t.x, t.y, how);
    });
  }

  // the student must find the computer's point on their own board
  function locate(id, tx, ty) {
    return new Promise(function (resolve) {
      var b = B.me, tries = 0, words = G.hard ? describe(tx, ty) : null, helpParts = null, done = false;
      activeZone('me', T('Find the point here!', '¡Busca el punto aquí!'));
      setPin((G.hard ? words : '<b>' + pair(tx, ty) + '</b>') + ' &rarr; ' + T('find it on YOUR BOARD', 'búscalo en TU TABLERO'));
      var head = '<h2 class="foe">' + T('ENEMY FIRE!', '¡FUEGO ENEMIGO!') + '</h2>' +
        (G.hard ? '<p>' + T('The computer&rsquo;s target:', 'El objetivo de la computadora:') + '</p><div class="words" id="enemy-words">' + words + '</div>'
          : '<p>' + T('The computer is firing at:', 'La computadora dispara a:') + '</p><div class="target-big" id="enemy-pair">' + pair(tx, ty) + '</div>') +
        '<p>' + T('Find this point on <b>YOUR BOARD</b> and click it. Keyboard: arrow keys, then <kbd>Enter</kbd>.', 'Busca este punto en <b>TU TABLERO</b> y haz clic. Teclado: flechas y luego <kbd>Enter</kbd>.') + '</p>';
      panel(head + '<div id="loc-fb" aria-live="polite"></div>');
      var cur = { x: G.mode === 'easy' ? 0 : 0, y: 0 }, hover = null;
      var curG = svgEl('g', { 'class': 'kcur-g' }, b.L.ui);
      function drawCur(show) {
        curG.innerHTML = '';
        if (!show) return;
        svgEl('circle', { cx: b.sx(cur.x), cy: b.sy(cur.y), r: 21, 'class': 'kcur' }, curG);
        svgEl('circle', { cx: b.sx(cur.x), cy: b.sy(cur.y), r: 27, 'class': 'kcur2' }, curG);
      }
      var hoverEl = null;
      function onMove(e) {
        var p = b.nearest(e.clientX, e.clientY, 0.48);
        if (hoverEl) { hoverEl.remove(); hoverEl = null; }
        if (p) hoverEl = b.ring(p.x, p.y, 'hover-ring', 20);
        b.svg.style.cursor = p ? 'pointer' : 'default';
      }
      function onLeave() { if (hoverEl) { hoverEl.remove(); hoverEl = null; } }
      function onClick(e) {
        var p = b.nearest(e.clientX, e.clientY, 0.48);
        if (p) { cur = p; choose(p.x, p.y); }
      }
      function onKey(e) {
        var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
        if (d) {
          e.preventDefault();
          cur = { x: Math.max(G.min, Math.min(G.max, cur.x + d[0])), y: Math.max(G.min, Math.min(G.max, cur.y + d[1])) };
          drawCur(true);
          say(pair(cur.x, cur.y));
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drawCur(true); choose(cur.x, cur.y); }
      }
      function onFocus() { drawCur(true); }
      function onBlur() { drawCur(false); }
      b.svg.setAttribute('tabindex', '0');
      b.svg.setAttribute('aria-label', T('Your board. Use the arrow keys to move from point to point, then press Enter to choose the computer’s target. The cursor starts at the origin.', 'Tu tablero. Usa las flechas para moverte de punto en punto y pulsa Enter para elegir el objetivo de la computadora. El cursor empieza en el origen.'));
      b.svg.addEventListener('pointermove', onMove);
      b.svg.addEventListener('pointerleave', onLeave);
      b.svg.addEventListener('click', onClick);
      b.svg.addEventListener('keydown', onKey);
      b.svg.addEventListener('focus', onFocus);
      b.svg.addEventListener('blur', onBlur);
      focusLater(b.svg);
      function cleanup() {
        done = true;
        stopTimer();
        b.svg.removeEventListener('pointermove', onMove);
        b.svg.removeEventListener('pointerleave', onLeave);
        b.svg.removeEventListener('click', onClick);
        b.svg.removeEventListener('keydown', onKey);
        b.svg.removeEventListener('focus', onFocus);
        b.svg.removeEventListener('blur', onBlur);
        b.svg.removeAttribute('tabindex');
        b.svg.style.cursor = '';
        onLeave(); curG.remove();
        if (helpParts) helpParts.forEach(function (p) { p.remove(); });
      }
      function choose(px, py) {
        if (done || !alive(id)) return;
        if (px === tx && py === ty) {
          if (!tries) noteAnswer(true, 'find');
          Sound.play('correct');
          b.ring(px, py, 'okpick', 22);
          $('#loc-fb').innerHTML = '<div class="fb good">&#10004; ' + T('Correct! That&rsquo;s ', '¡Correcto! Es ') + '<b>' + pair(tx, ty) + '</b>.</div>';
          setPin(null);
          cleanup();
          resolve('found');
          return;
        }
        tries++;
        if (tries === 1) noteAnswer(false, 'find');
        Sound.play('wrong');
        var r = b.ring(px, py, 'wrongpick', 21);
        var xg = svgEl('path', { d: 'M' + (b.sx(px) - 9) + ' ' + (b.sy(py) - 9) + ' l18 18 m0 -18 l-18 18', 'class': 'wrongx' }, b.L.ui);
        later(1700, function () { r.remove(); xg.remove(); });
        $('#loc-fb').innerHTML = '<div class="fb bad"><b class="nq">' + T('NOT QUITE! Try again.', '¡CASI! Inténtalo de nuevo.') + '</b>' +
          T('You picked ', 'Elegiste ') + pair(px, py) + '. ' + analyze(tx, ty, px, py) + '<span class="hint">' + hintFor(tx, ty, tries) + '</span></div>';
        say(T('Not quite. ', 'Casi. ') + $('#loc-fb').textContent);
        if (tries >= 4 && !helpParts) {
          helpParts = [];
          flyPath(b, tx, ty, { help: true, silent: true }).then(function (f) {
            if (done) { f.parts.forEach(function (p) { p.remove(); }); return; }
            f.plane.g.remove();
            helpParts = f.parts.concat([b.targetRing(tx, ty)]);
          });
        }
      }
      if (G.hard) startTimer(TIME.locate, function () {
        if (done || !alive(id)) return;
        if (!tries) noteAnswer(false, 'find');
        Sound.play('timeout');
        $('#loc-fb').innerHTML = '<div class="fb info">&#9200; ' + T('Time&rsquo;s up! Watch where ', '¡Se acabó el tiempo! Mira dónde está ') + '<b>' + pair(tx, ty) + '</b>' +
          T(' is: x = ' + num(tx) + ' first (left/right), then y = ' + num(ty) + ' (up/down).', ': primero x = ' + num(tx) + ' (izquierda/derecha), luego y = ' + num(ty) + ' (arriba/abajo).') + '</div>';
        var keep = helpParts; helpParts = null;
        cleanup();
        if (keep) keep.forEach(function (p) { p.remove(); });
        flyPath(b, tx, ty, { help: true }).then(function (f) {
          var tr = b.targetRing(tx, ty);
          return wait(1400).then(function () { f.parts.forEach(function (p) { p.remove(); }); tr.remove(); resolve('timeout'); });
        });
      });
    });
  }
  function resolveEnemy(id, x, y, how) {
    var b = B.me, sid = shipAt(G.my, x, y), k = key(x, y);
    if (G.ai.tried[k]) {
      // the 1-Star computer fired at a point it already tried: nothing new happens
      b.splash(x, y); Sound.play('miss');
      return wait(600).then(function () {
        if (!alive(id)) return;
        return banner('miss', '&#10006; ' + T('WASTED SHOT', 'TIRO PERDIDO'), pair(x, y) + T(': the computer already fired there!', ': ¡la computadora ya había disparado ahí!'), 1600);
      });
    }
    if (sid) { G.myHits[k] = true; b.explode(x, y); Sound.play('hit'); } else { b.splash(x, y); Sound.play('miss'); }
    aiRecord(x, y, sid);
    return wait(600).then(function () {
      if (!alive(id)) return;
      b.addMark(x, y, !!sid);
      updateFleets();
      var sub = (how === 'timeout' ? '' : '') + pair(x, y) + (sid ? T(' hit your ' + SHIP[sid].name + '!', ' le dio a tu ' + SHIP[sid].name + '!') : T(' landed in the water.', ' cayó al agua.'));
      return banner(sid ? 'hit' : 'miss', sid ? '&#128293; ' + T('HIT!', '¡IMPACTO!') : '&#10006; ' + T('MISS', 'AGUA'), sub, 1400).then(function () {
        if (!sid || !alive(id) || !isSunk(G.my, G.myHits, sid) || G.sunkMe[sid]) return;
        G.sunkMe[sid] = true;
        return sinkShip(b, G.my[sid], false).then(function () {
          return banner('sunk', SHIP[sid].up + ' ' + T('SUNK!', '¡HUNDIDO!'), T('The computer sank your ' + SHIP[sid].name + '.', 'La computadora hundió tu ' + SHIP[sid].name + '.'), 1800);
        });
      });
    });
  }

  // feedback that names the mistake
  // the kind of mistake, for the end-of-game report (same order of checks as analyze below)
  function mistakeKind(tx, ty, px, py) {
    if (px === ty && py === tx && tx !== ty) return 'order';
    if (py === ty && px === -tx && tx !== 0) return 'signx';
    if (px === tx && py === -ty && ty !== 0) return 'signy';
    if (px === -tx && py === -ty) return 'signs';
    if (Math.abs(px) === Math.abs(ty) && Math.abs(py) === Math.abs(tx) && Math.abs(tx) !== Math.abs(ty)) return 'order';
    if (py === ty) return 'countx';
    if (px === tx) return 'county';
    return 'other';
  }
  function analyze(tx, ty, px, py) {
    if (G.rep) { var mk = mistakeKind(tx, ty, px, py); G.rep.errs[mk] = (G.rep.errs[mk] || 0) + 1; }
    if (px === ty && py === tx && tx !== ty)
      return T('Check the order! Look carefully: the first number is x (left/right). The second number is y (up/down).', '¡Revisa el orden! Fíjate bien: el primer número es x (izquierda/derecha). El segundo número es y (arriba/abajo).');
    if (py === ty && px === -tx && tx !== 0)
      return T('Your y-coordinate is correct, but your x-coordinate should move ' + WX(tx) + ', not ' + WX(-tx) + '.', 'Tu coordenada y es correcta, pero tu coordenada x debe moverse ' + WX(tx) + ', no ' + WX(-tx) + '.');
    if (px === tx && py === -ty && ty !== 0)
      return T('Your x-coordinate is correct. Your y-coordinate should move ' + WY(ty) + ', not ' + WY(-ty) + '.', 'Tu coordenada x es correcta. Tu coordenada y debe moverse ' + WY(ty) + ', no ' + WY(-ty) + '.');
    if (px === -tx && py === -ty)
      return T('Both directions are flipped. Positive x moves RIGHT, negative x moves LEFT. Positive y moves UP, negative y moves DOWN.', 'Las dos direcciones están al revés. x positiva va a la DERECHA, x negativa a la IZQUIERDA. y positiva va hacia ARRIBA, y negativa hacia ABAJO.');
    if (Math.abs(px) === Math.abs(ty) && Math.abs(py) === Math.abs(tx) && Math.abs(tx) !== Math.abs(ty))
      return T('Check the order! The x-coordinate comes first, then the y-coordinate.', '¡Revisa el orden! Primero va la coordenada x y luego la coordenada y.');
    if (py === ty)
      return T('Your y-coordinate is correct. Check your x-coordinate: how far LEFT or RIGHT?', 'Tu coordenada y es correcta. Revisa tu coordenada x: ¿cuánto a la IZQUIERDA o a la DERECHA?');
    if (px === tx)
      return T('Your x-coordinate is correct. Check your y-coordinate: how far UP or DOWN?', 'Tu coordenada x es correcta. Revisa tu coordenada y: ¿cuánto hacia ARRIBA o hacia ABAJO?');
    return T('That point isn’t the target.', 'Ese punto no es el objetivo.');
  }
  function moveSentence(x, y) {
    var a = x === 0 ? T('Do not move left or right (x is 0).', 'No te muevas a los lados (x es 0).') : T('Move ' + units(x) + ' ' + WX(x) + '.', 'Muévete ' + units(x) + ' ' + WX(x) + '.');
    var b = y === 0 ? T('Then do not move up or down (y is 0).', 'Luego no subas ni bajes (y es 0).') : T('Then move ' + units(y) + ' ' + WY(y) + '.', 'Luego muévete ' + units(y) + ' ' + WY(y) + '.');
    return a + ' ' + b;
  }
  function hintFor(tx, ty, n) {
    if (n === 1) return T('Hint: Remember, x comes first.', 'Pista: recuerda, x va primero.');
    if (n === 2) return G.mode === 'easy' ? T('Hint: Start at (0, 0). Move RIGHT first, then UP.', 'Pista: empieza en (0, 0). Muévete primero a la DERECHA y luego hacia ARRIBA.')
      : T('Hint: Start at (0, 0). Move LEFT or RIGHT first.', 'Pista: empieza en (0, 0). Muévete primero a la IZQUIERDA o a la DERECHA.');
    if (n === 3) return T('Hint: Start at (0, 0). ', 'Pista: empieza en (0, 0). ') + moveSentence(tx, ty);
    return T('Watch the purple path on your board, then click the point where it ends. ', 'Mira el camino morado en tu tablero y haz clic en el punto donde termina. ') + moveSentence(tx, ty);
  }

  // Hard mode: the same point, said many ways (sometimes y first). The meaning never changes.
  function describe(x, y) {
    var opts = [];
    var xs = num(x), ys = num(y);
    var side = x > 0 ? T('to the right of', 'a la derecha del') : T('to the left of', 'a la izquierda del');
    var vert = y > 0 ? T('above', 'arriba del') : T('below', 'abajo del');
    opts.push(T('The x-coordinate is <b>' + xs + '</b> and the y-coordinate is <b>' + ys + '</b>.', 'La coordenada x es <b>' + xs + '</b> y la coordenada y es <b>' + ys + '</b>.'));
    opts.push(T('The y-coordinate is <b>' + ys + '</b> and the x-coordinate is <b>' + xs + '</b>.', 'La coordenada y es <b>' + ys + '</b> y la coordenada x es <b>' + xs + '</b>.'));
    opts.push(T('The y-coordinate is <b>' + ys + '</b> and the x-coordinate is <b>' + xs + '</b>.', 'La coordenada y es <b>' + ys + '</b> y la coordenada x es <b>' + xs + '</b>.'));
    if (x === 0 && y === 0) {
      opts.push(T('The target is the <b>origin</b>, where the x-axis and y-axis cross.', 'El objetivo es el <b>origen</b>, donde se cruzan el eje x y el eje y.'));
    } else if (x === 0) {
      opts.push(T('Stay on the y-axis and move <b>' + units(y) + ' ' + wordY(y) + '</b> from the origin.', 'Quédate en el eje y y muévete <b>' + units(y) + ' ' + wordY(y) + '</b> desde el origen.'));
      opts.push(T('Your target is on the <b>y-axis</b>, <b>' + units(y) + ' ' + vert + '</b> the x-axis.', 'Tu objetivo está en el <b>eje y</b>, <b>' + units(y) + ' ' + vert + '</b> eje x.'));
    } else if (y === 0) {
      opts.push(T('Move <b>' + units(x) + ' ' + wordX(x) + '</b> along the x-axis from the origin.', 'Muévete <b>' + units(x) + ' ' + wordX(x) + '</b> por el eje x desde el origen.'));
      opts.push(T('Your target is on the <b>x-axis</b>, <b>' + units(x) + ' ' + side + '</b> the y-axis.', 'Tu objetivo está en el <b>eje x</b>, <b>' + units(x) + ' ' + side + '</b> eje y.'));
    } else {
      opts.push(T('Move <b>' + units(y) + ' ' + wordY(y) + '</b> and <b>' + units(x) + ' ' + wordX(x) + '</b>.', 'Muévete <b>' + units(y) + ' ' + wordY(y) + '</b> y <b>' + units(x) + ' ' + wordX(x) + '</b>.'));
      opts.push(T('From the origin, move <b>' + units(x) + ' ' + wordX(x) + '</b>, then <b>' + units(y) + ' ' + wordY(y) + '</b>.', 'Desde el origen, muévete <b>' + units(x) + ' ' + wordX(x) + '</b> y luego <b>' + units(y) + ' ' + wordY(y) + '</b>.'));
      opts.push(T('Your target is <b>' + units(x) + ' ' + side + '</b> the y-axis and <b>' + units(y) + ' ' + vert + '</b> the x-axis.', 'Tu objetivo está <b>' + units(x) + ' ' + side + '</b> eje y y <b>' + units(y) + ' ' + vert + '</b> eje x.'));
      opts.push(T('Your target is <b>' + units(y) + ' ' + vert + '</b> the x-axis and <b>' + units(x) + ' ' + side + '</b> the y-axis.', 'Tu objetivo está <b>' + units(y) + ' ' + vert + '</b> eje x y <b>' + units(x) + ' ' + side + '</b> eje y.'));
    }
    return pick(opts);
  }

  // ---------------- Hard mode: Radar Checks between turns
  function quad(x, y) { if (x === 0 || y === 0) return 0; if (x > 0) return y > 0 ? 1 : 4; return y > 0 ? 2 : 3; }
  var QN = ['', 'I', 'II', 'III', 'IV'];
  function signWord(v, axis) {
    if (v === 0) return axis === 'x' ? T('x = 0 (no left or right)', 'x = 0 (ni izquierda ni derecha)') : T('y = 0 (no up or down)', 'y = 0 (ni arriba ni abajo)');
    return axis === 'x' ? T('x = ' + num(v) + ' is ' + (v > 0 ? 'positive (RIGHT)' : 'negative (LEFT)'), 'x = ' + num(v) + ' es ' + (v > 0 ? 'positiva (DERECHA)' : 'negativa (IZQUIERDA)'))
      : T('y = ' + num(v) + ' is ' + (v > 0 ? 'positive (UP)' : 'negative (DOWN)'), 'y = ' + num(v) + ' es ' + (v > 0 ? 'positiva (ARRIBA)' : 'negativa (ABAJO)'));
  }
  function quadExplain(x, y) {
    var q = quad(x, y);
    if (!q) {
      if (x === 0 && y === 0) return T(pair(x, y) + ' is the origin. It is on both axes, so it is not in any quadrant.', pair(x, y) + ' es el origen. Está en los dos ejes, así que no está en ningún cuadrante.');
      return T(pair(x, y) + ': ' + (x === 0 ? 'x = 0, so the point is ON the y-axis' : 'y = 0, so the point is ON the x-axis') + '. Points on an axis are not in any quadrant.',
        pair(x, y) + ': ' + (x === 0 ? 'x = 0, así que el punto está SOBRE el eje y' : 'y = 0, así que el punto está SOBRE el eje x') + '. Los puntos sobre un eje no están en ningún cuadrante.');
    }
    return pair(x, y) + ': ' + signWord(x, 'x') + T(' and ', ' y ') + signWord(y, 'y') + '. ' + T('That is Quadrant ' + QN[q] + '.', 'Eso es el cuadrante ' + QN[q] + '.') +
      ' ' + T('(I: +,+ &nbsp; II: &minus;,+ &nbsp; III: &minus;,&minus; &nbsp; IV: +,&minus;)', '(I: +,+ &nbsp; II: &minus;,+ &nbsp; III: &minus;,&minus; &nbsp; IV: +,&minus;)');
  }
  function nz() { return (Math.random() < 0.5 ? 1 : -1) * (1 + rnd(G.max)); }   // a nonzero coordinate on the board
  function randPt(nonzero) {
    var x, y;
    do { x = G.min + rnd(G.max - G.min + 1); y = G.min + rnd(G.max - G.min + 1); } while (nonzero && (x === 0 || y === 0));
    return { x: x, y: y };
  }
  function blipPoint() {
    // an empty spot on the opponent's board, so the blip is easy to see
    for (var n = 0; n < 60; n++) {
      var p = randPt(Math.random() < 0.75);
      if (!B.foe.marks[key(p.x, p.y)]) return p;
    }
    return randPt(true);
  }
  function makeQuiz() {
    var kinds = ['quad', 'quad', 'reverse', 'reverse', 'which', 'first', 'sign', 'right', 'uppy', 'inq', 'negx'];
    var k = pick(kinds), q = { kind: k };
    var P, i;
    if (k === 'quad') {
      var last = G.ai && G.ai.lastShot;
      P = Math.random() < 0.3 ? (Math.random() < 0.5 ? { x: 0, y: nz() } : { x: nz(), y: 0 }) : randPt(true);
      if (last && Math.random() < 0.4) P = last;
      var a = quad(P.x, P.y);
      q.prompt = pick([
        T('Your opponent&rsquo;s coordinate is <b>' + pair(P.x, P.y) + '</b>. Which quadrant is the point in? (Or is it on an axis?)', 'La coordenada de tu oponente es <b>' + pair(P.x, P.y) + '</b>. ¿En qué cuadrante está el punto? (¿O está sobre un eje?)'),
        T('Is <b>' + pair(P.x, P.y) + '</b> in a quadrant or on an axis? If it&rsquo;s in a quadrant, which one?', '¿<b>' + pair(P.x, P.y) + '</b> está en un cuadrante o sobre un eje? Si está en un cuadrante, ¿en cuál?')
      ]);
      q.choices = [1, 2, 3, 4, 0].map(function (n) { return { label: n ? T('Quadrant ' + QN[n], 'Cuadrante ' + QN[n]) : T('On an axis', 'Sobre un eje'), ok: n === a }; });
      q.explain = quadExplain(P.x, P.y);
      q.hint = T('Look at the signs. Is x positive or negative? Is y positive or negative? Is either one 0?', 'Mira los signos. ¿x es positiva o negativa? ¿y es positiva o negativa? ¿Alguna es 0?');
    } else if (k === 'reverse') {
      P = blipPoint();
      q.blip = P;
      q.prompt = T('A radar blip appeared on the <b>OPPONENT&rsquo;S BOARD</b> (the purple point). What is its coordinate? Type the ordered pair.', 'Apareció una señal de radar en el <b>TABLERO DEL OPONENTE</b> (el punto morado). ¿Cuál es su coordenada? Escribe el par ordenado.');
      q.answer = P;
      q.explain = T('The blip is ' + (P.x === 0 ? 'on the y-axis (x = 0)' : units(P.x) + ' ' + wordX(P.x)) + ' and ' + (P.y === 0 ? 'on the x-axis (y = 0)' : units(P.y) + ' ' + wordY(P.y)) + ' from the origin, so it is <b>' + pair(P.x, P.y) + '</b>.',
        'La señal está ' + (P.x === 0 ? 'sobre el eje y (x = 0)' : units(P.x) + ' ' + wordX(P.x)) + ' y ' + (P.y === 0 ? 'sobre el eje x (y = 0)' : units(P.y) + ' ' + wordY(P.y)) + ' del origen, así que es <b>' + pair(P.x, P.y) + '</b>.');
    } else if (k === 'which') {
      do { P = randPt(false); } while (P.x === P.y);
      var askX = Math.random() < 0.5;
      q.prompt = T('In the ordered pair <b>' + pair(P.x, P.y) + '</b>, which number is the <b>' + (askX ? 'x' : 'y') + '-coordinate</b>?', 'En el par ordenado <b>' + pair(P.x, P.y) + '</b>, ¿qué número es la <b>coordenada ' + (askX ? 'x' : 'y') + '</b>?');
      q.choices = shuffle([{ label: num(P.x), ok: askX }, { label: num(P.y), ok: !askX }]);
      q.explain = T('In (x, y), the <b>first</b> number is always x and the <b>second</b> is always y. So the ' + (askX ? 'x' : 'y') + '-coordinate is <b>' + num(askX ? P.x : P.y) + '</b>.', 'En (x, y), el <b>primer</b> número siempre es x y el <b>segundo</b> siempre es y. Así que la coordenada ' + (askX ? 'x' : 'y') + ' es <b>' + num(askX ? P.x : P.y) + '</b>.');
      q.hint = T('Which comes first in (x, y)?', '¿Qué va primero en (x, y)?');
    } else if (k === 'first') {
      do { P = randPt(true); } while (Math.abs(P.x) === Math.abs(P.y) && Math.random() < 0.5);
      q.prompt = T('To plot <b>' + pair(P.x, P.y) + '</b> starting at the origin, which way do you move <b>first</b>?', 'Para ubicar <b>' + pair(P.x, P.y) + '</b> empezando en el origen, ¿hacia dónde te mueves <b>primero</b>?');
      var right = P.x > 0 ? 'R' : 'L';
      q.choices = [['L', T('Left', 'Izquierda')], ['R', T('Right', 'Derecha')], ['U', T('Up', 'Arriba')], ['D', T('Down', 'Abajo')]].map(function (c) { return { label: c[1], ok: c[0] === right }; });
      q.explain = T('x comes first, so move left or right first. x = ' + num(P.x) + ' is ' + (P.x > 0 ? 'positive, so move <b>RIGHT</b>' : 'negative, so move <b>LEFT</b>') + '. Then y = ' + num(P.y) + ' moves you ' + wordY(P.y) + '.',
        'x va primero, así que primero te mueves a la izquierda o a la derecha. x = ' + num(P.x) + ' es ' + (P.x > 0 ? 'positiva, así que vas a la <b>DERECHA</b>' : 'negativa, así que vas a la <b>IZQUIERDA</b>') + '. Luego y = ' + num(P.y) + ' te mueve ' + wordY(P.y) + '.');
      q.hint = T('The first number tells you the first move. Is it x or y?', 'El primer número te dice el primer movimiento. ¿Es x o y?');
    } else if (k === 'sign') {
      P = blipPoint();
      q.blip = P;
      var ax = Math.random() < 0.5 ? 'x' : 'y', v = ax === 'x' ? P.x : P.y;
      q.prompt = T('Look at the purple radar blip on the <b>OPPONENT&rsquo;S BOARD</b>. Is its <b>' + ax + '-coordinate</b> positive, negative, or zero?', 'Mira la señal morada en el <b>TABLERO DEL OPONENTE</b>. ¿Su <b>coordenada ' + ax + '</b> es positiva, negativa o cero?');
      q.choices = [[1, T('Positive', 'Positiva')], [-1, T('Negative', 'Negativa')], [0, T('Zero', 'Cero')]].map(function (c) { return { label: c[1], ok: c[0] === Math.sign(v) }; });
      q.explain = ax === 'x'
        ? T('The blip is ' + (v > 0 ? '<b>right</b> of the y-axis, so x is positive' : v < 0 ? '<b>left</b> of the y-axis, so x is negative' : '<b>on</b> the y-axis, so x is 0') + '. It is ' + pair(P.x, P.y) + '.', 'La señal está ' + (v > 0 ? 'a la <b>derecha</b> del eje y, así que x es positiva' : v < 0 ? 'a la <b>izquierda</b> del eje y, así que x es negativa' : '<b>sobre</b> el eje y, así que x es 0') + '. Es ' + pair(P.x, P.y) + '.')
        : T('The blip is ' + (v > 0 ? '<b>above</b> the x-axis, so y is positive' : v < 0 ? '<b>below</b> the x-axis, so y is negative' : '<b>on</b> the x-axis, so y is 0') + '. It is ' + pair(P.x, P.y) + '.', 'La señal está ' + (v > 0 ? '<b>arriba</b> del eje x, así que y es positiva' : v < 0 ? '<b>abajo</b> del eje x, así que y es negativa' : '<b>sobre</b> el eje x, así que y es 0') + '. Es ' + pair(P.x, P.y) + '.');
      q.hint = ax === 'x' ? T('x is about left and right of the y-axis.', 'x tiene que ver con la izquierda y la derecha del eje y.') : T('y is about above and below the x-axis.', 'y tiene que ver con arriba y abajo del eje x.');
    } else if (k === 'right' || k === 'uppy') {
      var isX = k === 'right', pts = [];
      // three points with different x (or y); one is the swap of another to test order
      var A; do { A = randPt(true); } while (A.x === A.y || A.x === -A.y);
      pts.push(A, { x: A.y, y: A.x });
      for (i = 0; i < 40 && pts.length < 3; i++) {
        var C = randPt(false);
        if (pts.every(function (p) { return (isX ? p.x !== C.x : p.y !== C.y) && !(p.x === C.x && p.y === C.y); })) pts.push(C);
      }
      var best = pts.reduce(function (m, p) { return (isX ? p.x > m.x : p.y > m.y) ? p : m; });
      q.prompt = isX ? T('Which point is <b>farther right</b>?', '¿Qué punto está <b>más a la derecha</b>?') : T('Which point has the <b>greater y-coordinate</b>?', '¿Qué punto tiene la <b>coordenada y mayor</b>?');
      q.choices = shuffle(pts.map(function (p) { return { label: pair(p.x, p.y), ok: p === best }; }));
      q.explain = isX ? T('Farther right means the greatest <b>x-coordinate</b>, the <b>first</b> number. ' + pair(best.x, best.y) + ' has x = ' + num(best.x) + '.', 'Más a la derecha significa la <b>coordenada x</b> mayor, el <b>primer</b> número. ' + pair(best.x, best.y) + ' tiene x = ' + num(best.x) + '.')
        : T('The y-coordinate is the <b>second</b> number. ' + pair(best.x, best.y) + ' has the greatest y: ' + num(best.y) + '.', 'La coordenada y es el <b>segundo</b> número. ' + pair(best.x, best.y) + ' tiene la y mayor: ' + num(best.y) + '.');
      q.hint = isX ? T('Right and left are about x, the first number.', 'Derecha e izquierda tienen que ver con x, el primer número.') : T('y is the second number in (x, y).', 'y es el segundo número en (x, y).');
    } else if (k === 'inq') {
      var tq = 1 + rnd(4);
      var sx = tq === 1 || tq === 4 ? 1 : -1, sy = tq === 1 || tq === 2 ? 1 : -1;
      var ans = { x: sx * (1 + rnd(G.max)), y: sy * (1 + rnd(G.max)) };
      var list = [ans];
      var swap = { x: ans.y, y: ans.x };   // the swapped pair is a good trap, but only if it lands in another quadrant
      if (quad(swap.x, swap.y) !== tq) list.push(swap);
      var tries2 = 0;
      while (list.length < 4 && tries2++ < 80) {
        var D = Math.random() < 0.25 ? (Math.random() < 0.5 ? { x: 0, y: sy * (1 + rnd(G.max)) } : { x: sx * (1 + rnd(G.max)), y: 0 }) : randPt(true);
        if (quad(D.x, D.y) === tq) continue;
        if (list.some(function (p) { return p.x === D.x && p.y === D.y; })) continue;
        list.push(D);
      }
      q.prompt = T('Which point is in <b>Quadrant ' + QN[tq] + '</b>?', '¿Qué punto está en el <b>cuadrante ' + QN[tq] + '</b>?');
      q.choices = shuffle(list.map(function (p) { return { label: pair(p.x, p.y), ok: p === ans }; }));
      q.explain = quadExplain(ans.x, ans.y);
      q.hint = T('Quadrant I: (+,+). II: (&minus;,+). III: (&minus;,&minus;). IV: (+,&minus;). Check x first, then y.', 'Cuadrante I: (+,+). II: (&minus;,+). III: (&minus;,&minus;). IV: (+,&minus;). Revisa primero x, luego y.');
    } else {   // negx
      var a1 = { x: -(1 + rnd(G.max)), y: (Math.random() < 0.5 ? 1 : -1) * (1 + rnd(G.max)) };
      var opts2 = [a1, { x: 1 + rnd(G.max), y: -(1 + rnd(G.max)) }, { x: Math.abs(a1.y), y: a1.x }, { x: rnd(G.max + 1), y: -(1 + rnd(G.max)) }];
      var uniq = [];
      opts2.forEach(function (p) { if (!uniq.some(function (u) { return u.x === p.x && u.y === p.y; }) && (p === a1 || p.x >= 0)) uniq.push(p); });
      for (var t3 = 0; uniq.length < 4 && t3 < 80; t3++) {   // top up with more points whose x is 0 or positive
        var E = { x: rnd(G.max + 1), y: rnd(2 * G.max + 1) - G.max };
        if (!uniq.some(function (u) { return u.x === E.x && u.y === E.y; })) uniq.push(E);
      }
      q.prompt = T('Which ordered pair has a <b>negative x-coordinate</b>?', '¿Qué par ordenado tiene una <b>coordenada x negativa</b>?');
      q.choices = shuffle(uniq.map(function (p) { return { label: pair(p.x, p.y), ok: p === a1 }; }));
      q.explain = T('The x-coordinate is the <b>first</b> number. Only ' + pair(a1.x, a1.y) + ' starts with a negative number, so that point is left of the y-axis.', 'La coordenada x es el <b>primer</b> número. Solo ' + pair(a1.x, a1.y) + ' empieza con un número negativo, así que ese punto está a la izquierda del eje y.');
      q.hint = T('Look only at the first number in each pair.', 'Mira solo el primer número de cada par.');
    }
    return q;
  }

  // 3-Star: a question of its own about a plane flying to a point (not the player's shot): which way does it turn?
  function turnCheck(id) {
    var vals = [];
    for (var v = G.min; v <= G.max; v++) if (v) vals.push(v);
    var x = pick(vals), y = pick(vals);
    setTurn('radar', T('TURN CHECK', 'REVISIÓN DE GIRO'), '&#8635;');
    setPin(null);
    activeZone(null, null);
    var head = '<h2 class="radar">&#8635; ' + T('TURN CHECK', 'REVISIÓN DE GIRO') + '</h2><p class="sub">' + T('A scout plane is flying to ', 'Un avión explorador vuela hacia ') + '<b>' + pair(x, y) + '</b>.</p>';
    say(T('Turn check. A scout plane is flying to ', 'Revisión de giro. Un avión explorador vuela hacia ') + pair(x, y));
    return predictTurn(id, x, y, head);
  }
  function radarCheck(id) {
    return new Promise(function (resolve) {
      var q = makeQuiz(), done = false, blip = null, wrongs = 0;
      setTurn('radar', T('RADAR CHECK', 'REVISIÓN DE RADAR'), '&#128225;');
      setPin(null);
      activeZone(q.blip ? 'foe' : null, q.blip ? T('Radar blip!', '¡Señal de radar!') : null);
      if (q.blip) {
        var b = B.foe;
        blip = svgEl('g', { transform: 'translate(' + b.sx(q.blip.x) + ',' + b.sy(q.blip.y) + ')' }, b.L.ui);
        blip.innerHTML = '<circle r="16" class="blipring"/><path d="M0 -15 L15 0 L0 15 L-15 0 Z" class="blip"/>';
      }
      var html = '<h2 class="radar">&#128225; ' + T('RADAR CHECK', 'REVISIÓN DE RADAR') + '</h2><p class="sub">' + T('Answer correctly to unlock your next shot.', 'Responde bien para desbloquear tu siguiente disparo.') + '</p>' +
        '<p style="font-size:18px">' + q.prompt + '</p>';
      if (q.choices) {
        html += '<div class="choices" role="group">' + q.choices.map(function (c, i) { return '<button type="button" class="btn" data-i="' + i + '"><span aria-hidden="true" style="opacity:.6;font-size:.8em">' + (i + 1) + '</span> ' + c.label + '</button>'; }).join('') + '</div>';
      } else {
        html += '<div class="entry"><input type="text" id="in-pair" class="wide" autocomplete="off" spellcheck="false" maxlength="14" placeholder="( ? , ? )" aria-label="' + esc(T('Ordered pair', 'Par ordenado')) + '"></div><p class="err" id="fire-err" role="alert"></p>' + padHTML() +
          '<div class="fire-row"><button type="button" class="btn" id="btn-check">' + T('CHECK', 'COMPROBAR') + '</button></div>';
      }
      html += '<div id="quiz-fb" aria-live="polite"></div>';
      panel(html);
      say(T('Radar check. ', 'Revisión de radar. ') + $('#panel .task p:nth-of-type(2)').textContent);
      function finish(ok, timedOut) {
        if (done) return;
        if (!wrongs) noteAnswer(ok, 'radar');   // a Radar Check counts as right only on the first try
        done = true; stopTimer();
        Array.prototype.forEach.call(document.querySelectorAll('#panel .choices .btn, #panel input, #btn-check, #panel .pad button'), function (e) { e.disabled = true; });
        if (q.choices) q.choices.forEach(function (c, i) { if (c.ok) $('#panel .choices .btn[data-i="' + i + '"]').classList.add('right'); });
        var fb = $('#quiz-fb');
        fb.innerHTML = '<div class="fb ' + (ok ? 'good' : 'info') + '">' + (ok ? '&#10004; ' + T('<b>Correct!</b> ', '<b>¡Correcto!</b> ') : '&#9200; ' + T('<b>Time&rsquo;s up.</b> Here&rsquo;s the answer: ', '<b>Se acabó el tiempo.</b> Esta es la respuesta: ')) + q.explain + '</div>' +
          '<div class="fire-row" style="margin-top:8px"><button type="button" class="btn green" id="quiz-go">' + T('CONTINUE &#9654;', 'CONTINUAR &#9654;') + '</button></div>';
        if (q.answer && !ok) { var inp = $('#in-pair'); if (inp) inp.value = pair(q.answer.x, q.answer.y); }
        say((ok ? T('Correct. ', 'Correcto. ') : T('Time is up. ', 'Se acabó el tiempo. ')) + fb.textContent);
        $('#quiz-go').addEventListener('click', function () { Sound.play('click'); if (blip) blip.remove(); activeZone(null); resolve(); });
        focusLater($('#quiz-go'));
      }
      function wrong(msg) {
        wrongs++;
        if (wrongs === 1) noteAnswer(false, 'radar');
        Sound.play('wrong');
        $('#quiz-fb').innerHTML = '<div class="fb bad"><b class="nq">' + T('NOT QUITE! Try again.', '¡CASI! Inténtalo de nuevo.') + '</b>' + msg + '</div>';
        say(T('Not quite. ', 'Casi. ') + $('#quiz-fb').textContent);
      }
      if (q.choices) {
        Array.prototype.forEach.call(document.querySelectorAll('#panel .choices .btn'), function (btn) {
          btn.addEventListener('click', function () {
            if (done || btn.classList.contains('wrong')) return;
            var c = q.choices[+btn.getAttribute('data-i')];
            if (c.ok) { Sound.play('correct'); finish(true); }
            else { btn.classList.add('wrong'); btn.setAttribute('aria-disabled', 'true'); wrong(q.hint + (wrongs >= 1 ? ' ' : '')); }
          });
        });
        G.quizKeys = function (e) {
          if (done) return false;
          var n = parseInt(e.key, 10);
          if (n >= 1 && n <= q.choices.length) { e.preventDefault(); $('#panel .choices .btn[data-i="' + (n - 1) + '"]').click(); return true; }
          return false;
        };
        focusLater($('#panel .choices .btn'));
      } else {
        var inp = $('#in-pair'), active = inp;
        if (TOUCH) inp.setAttribute('inputmode', 'none');
        inp.addEventListener('input', function () { cleanInput(inp, 0, [inp]); });
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); check(); } });
        Array.prototype.forEach.call(document.querySelectorAll('#panel .pad button'), function (b2) {
          b2.addEventListener('mousedown', function (e) { e.preventDefault(); });
          b2.addEventListener('click', function () {
            var k = b2.getAttribute('data-k');
            Sound.play('click');
            if (k === 'back') active.value = active.value.slice(0, -1); else active.value += k;
            cleanInput(active, 0, [active]);
            if (!TOUCH) active.focus();
          });
        });
        $('#btn-check').addEventListener('click', check);
        focusLater(inp);
      }
      function check() {
        if (done) return;
        var r = parsePair($('#in-pair').value);
        if (r.err) { Sound.play('invalid'); fireErr(r.err, $('#in-pair')); return; }
        fireErr('');
        if (r.x === q.answer.x && r.y === q.answer.y) { Sound.play('correct'); finish(true); return; }
        var tx = q.answer.x, ty = q.answer.y;
        wrong(T('You typed ', 'Escribiste ') + pair(r.x, r.y) + '. ' + analyze(tx, ty, r.x, r.y) + (wrongs >= 1 ? '<span class="hint">' + hintFor(tx, ty, Math.min(3, wrongs + 1)) + '</span>' : ''));
      }
      startTimer(q.answer ? TIME.quiz + 5 : TIME.quiz, function () {
        if (done || !alive(id)) return;
        Sound.play('timeout');
        banner('time', '&#9200; ' + T('TIME’S UP!', '¡SE ACABÓ EL TIEMPO!'), '', 1100);
        finish(false, true);
      });
    }).then(function () { G.quizKeys = null; });
  }

  // ---------------- timer (Hard mode)
  function startTimer(sec, onExpire) {
    stopTimer();
    var el = $('#timer');
    el.hidden = false;
    var t = { left: sec * 1000, total: sec * 1000, last: now(), onExpire: onExpire, lastSec: sec };
    G.timer = t;
    function draw() {
      var s = Math.ceil(t.left / 1000);
      $('#timer-n').textContent = s;
      el.style.setProperty('--p', Math.max(0, t.left / t.total));
      el.classList.toggle('mid', s <= 15 && s > 6);
      el.classList.toggle('low', s <= 6);
      el.setAttribute('aria-label', T(s + ' seconds left', 'Quedan ' + s + ' segundos'));
    }
    draw();
    t.iv = setInterval(function () {
      var n = now(), dt = n - t.last; t.last = n;
      el.classList.toggle('paused', clock.paused);
      if (clock.paused) return;
      t.left -= dt;
      var s = Math.ceil(t.left / 1000);
      if (s !== t.lastSec) { t.lastSec = s; if (s <= 5 && s > 0) Sound.play('tick'); if (s === 10) say(T('10 seconds left', 'Quedan 10 segundos')); }
      draw();
      if (t.left <= 0) { stopTimer(); el.style.setProperty('--p', 0); onExpire(); }
    }, 100);
  }
  function stopTimer() {
    if (G.timer) { clearInterval(G.timer.iv); G.timer = null; }
    var el = $('#timer');
    if (el) { el.classList.remove('low', 'mid'); if (G.hard) { $('#timer-n').textContent = '–'; el.style.setProperty('--p', 1); } }
  }

  // ---------------- end of the battle
  // End-of-game report: how often each kind of question was right on the first try, the most common mistake, and a tip
  function reportHTML() {
    var r = G.rep; if (!r) return '';
    var rows = [], hits = G.shots.filter(function (s) { return s.hit; }).length;
    function row(label, v) { if (v[1]) rows.push('<li>' + label + ': <b>' + v[0] + ' ' + T('of', 'de') + ' ' + v[1] + '</b></li>'); }
    rows.push('<li>' + T('Shots fired', 'Disparos') + ': <b>' + G.shots.length + '</b> (' + hits + ' ' + T(hits === 1 ? 'hit' : 'hits', hits === 1 ? 'impacto' : 'impactos') + ')</li>');
    row(T('Enemy shots found on the first try', 'Disparos enemigos encontrados al primer intento'), r.find);
    row(T('Radar Checks right on the first try', 'Revisiones de radar correctas al primer intento'), r.radar);
    row(T('Orders from HQ right on the first try', 'Órdenes del cuartel correctas al primer intento'), r.orders);
    row(T('Turns predicted correctly', 'Giros predichos correctamente'), r.turn);
    var top = null, n = 0;
    Object.keys(r.errs).forEach(function (k) { if (r.errs[k] > n) { n = r.errs[k]; top = k; } });
    var TIPS = {
      order: [T('Mixing up the order of x and y', 'Confundir el orden de x y y'), T('x always comes first: move left or right, then up or down.', 'x siempre va primero: muévete a la izquierda o a la derecha, y luego arriba o abajo.')],
      signx: [T('The sign of x', 'El signo de x'), T('Positive x moves right; negative x moves left.', 'x positiva va a la derecha; x negativa va a la izquierda.')],
      signy: [T('The sign of y', 'El signo de y'), T('Positive y moves up; negative y moves down.', 'y positiva va hacia arriba; y negativa va hacia abajo.')],
      signs: [T('Both signs flipped', 'Los dos signos al revés'), T('Check each sign: right and up are positive, left and down are negative.', 'Revisa cada signo: derecha y arriba son positivos; izquierda y abajo son negativos.')],
      countx: [T('Counting the x-distance', 'Contar la distancia en x'), T('Start at the origin and count each step left or right carefully.', 'Empieza en el origen y cuenta con cuidado cada paso a la izquierda o a la derecha.')],
      county: [T('Counting the y-distance', 'Contar la distancia en y'), T('After moving for x, count each step up or down carefully.', 'Después de moverte en x, cuenta con cuidado cada paso hacia arriba o hacia abajo.')],
      other: [T('Finding the point', 'Encontrar el punto'), T('Say the point aloud: "x first, then y," and trace the path with your finger.', 'Di el punto en voz alta: "primero x, luego y", y sigue el camino con el dedo.')]
    };
    var tip = top ? '<p class="rep-tip"><b>' + T('Most common mistake', 'Error más común') + ':</b> ' + TIPS[top][0] + ' (' + n + '&times;). <b>' + T('Tip', 'Consejo') + ':</b> ' + TIPS[top][1] + '</p>'
      : '<p class="rep-tip"><b>' + T('No mistakes this battle!', '¡Ningún error en esta batalla!') + '</b> ' + (G.hard ? T('You are ready for anything, General.', 'Nada te detiene, General.') : T('Try the next rank for a bigger challenge.', 'Prueba el siguiente rango para un reto mayor.')) + '</p>';
    return '<h3>' + T('Battle report', 'Informe de batalla') + '</h3><ul>' + rows.join('') + '</ul>' + tip;
  }
  function endGame(id, win) {
    if (!alive(id)) return;
    stopTimer();
    G.screen = 'over';
    setPin(null);
    if (!win) {
      SHIPS.forEach(function (sh) { if (!isSunk(G.foe, G.foeHits, sh.id)) { var g = B.foe.drawShip(G.foe[sh.id]); g.style.opacity = 0.45; } });
    }
    setTurn(win ? 'me' : 'foe', win ? T('VICTORY!', '¡VICTORIA!') : T('BATTLE OVER', 'FIN DE LA BATALLA'), win ? '&#127942;' : '&#9875;');
    panel(win ? '<h2 class="me">' + T('FLEET COMPLETE!', '¡FLOTA COMPLETA!') + '</h2>' : '<h2 class="foe">' + T('BATTLE OVER', 'FIN DE LA BATALLA') + '</h2><p>' + T('The enemy ships that were still hiding are shown faintly on the opponent&rsquo;s board.', 'Los barcos enemigos que seguían escondidos se ven tenues en el tablero del oponente.') + '</p>');
    return wait(win ? 600 : 1500).then(function () {
      if (G.id !== id) return;
      var card = $('#end-card');
      card.className = 'card ' + (win ? 'end-win' : 'end-lose');
      $('#end-h').innerHTML = win ? '&#127942; ' + T('FLEET COMPLETE!', '¡FLOTA COMPLETA!') : '&#9875; ' + T('BATTLE OVER', 'FIN DE LA BATALLA');
      $('#end-p').innerHTML = win ? T('You sank both enemy ships!', '¡Hundiste los dos barcos enemigos!') : T('The computer found both of your ships this time. Regroup, place your fleet, and try again!', 'Esta vez la computadora encontró tus dos barcos. ¡Reorganízate, ubica tu flota y vuelve a intentarlo!');
      $('#end-report').innerHTML = reportHTML();
      $('#scr-end').hidden = false;
      fitScreen();
      Sound.play(win ? 'victory' : 'lose');
      say($('#end-h').textContent + '. ' + $('#end-p').textContent + ' ' + $('#end-report').textContent, true);
      if (win) confetti();
      focusLater($('#end-again'));
    });
  }
  function confetti() {
    var box = $('#confetti'), cols = ['#e63946', '#ffd60a', '#2b7de9', '#19a463', '#ff8a1f', '#7c3aed', '#ffffff'];
    box.innerHTML = '';
    for (var i = 0; i < 70; i++) {
      var c = document.createElement('i');
      c.style.left = Math.random() * 100 + '%';
      c.style.background = cols[i % cols.length];
      c.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      c.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
      c.style.animationDuration = (2.4 + Math.random() * 2.2) + 's';
      c.style.animationDelay = (Math.random() * 1.2) + 's';
      box.appendChild(c);
    }
  }
  $('#end-again').addEventListener('click', function () { Sound.play('click'); hideOverlay(); startPlacement(); });
  $('#end-menu').addEventListener('click', function () { Sound.play('click'); goMenu(); });
  function goMenu() { G.id++; stopTimer(); hideOverlay(); $('#banner').hidden = true; show('modes'); focusLater($('.mode[data-mode="' + G.mode + '"]')); }

  // ---------------- pause menu
  var pauseReturn = null;
  function setPaused(p) {
    if (p === clock.paused) return;
    if (p) clock.since = performance.now(); else clock.lost += performance.now() - clock.since;
    clock.paused = p;
    app.classList.toggle('paused', p);   // CSS stops every running animation too
    Sound.pause(p);
  }
  function openPause() {
    if (!$('#scr-end').hidden) return;
    setPaused(true);
    if (!pauseReturn) pauseReturn = document.activeElement;
    $('#scr-pause').hidden = false;
    fitScreen();
    focusLater($('#pause-resume'));
  }
  function closePause() {
    setPaused(false);
    $('#scr-pause').hidden = true;
    var r = pauseReturn; pauseReturn = null;
    if (r && document.body.contains(r) && r !== document.body) focusLater(r);
  }
  $('#btn-menu').addEventListener('click', function () { Sound.play('click'); openPause(); });
  $('#pause-resume').addEventListener('click', function () { Sound.play('click'); closePause(); });
  $('#pause-restart').addEventListener('click', function () { Sound.play('click'); setPaused(false); pauseReturn = null; $('#banner').hidden = true; startPlacement(); });
  $('#pause-menu').addEventListener('click', function () { Sound.play('click'); setPaused(false); pauseReturn = null; goMenu(); });
  $('#pause-help').addEventListener('click', function () { Sound.play('click'); $('#scr-pause').hidden = true; showInstructions(true); });
  function setCalm(on) {
    G.calm = on;
    app.classList.toggle('calm', on);
    Storm.motion();
    $('#pause-motion').setAttribute('aria-pressed', String(on));
    $('#motion-lbl').textContent = on ? T('LESS MOTION: ON', 'MENOS MOVIMIENTO: SÍ') : T('LESS MOTION: OFF', 'MENOS MOVIMIENTO: NO');
  }
  $('#pause-motion').addEventListener('click', function () { Sound.play('click'); setCalm(!G.calm); });
  setCalm(G.calm);

  // ---------------- sound toggle
  function setSoundBtn() {
    var m = Sound.isMuted(), b = $('#btn-sound');
    b.setAttribute('aria-pressed', String(!m));
    b.querySelector('.ic').innerHTML = m ? '&#128263;' : '&#128266;';
    $('#snd-lbl').textContent = m ? T('Sound off', 'Sonido apagado') : T('Sound on', 'Sonido encendido');
  }
  $('#btn-sound').addEventListener('click', function () { Sound.setMuted(!Sound.isMuted()); setSoundBtn(); if (!Sound.isMuted()) Sound.play('click'); });
  setSoundBtn();

  // ---------------- keyboard: Esc = back / menu, number keys in Radar Checks
  document.addEventListener('keydown', function (e) {
    if (window.isPageControlKey && isPageControlKey(e)) return;
    if (e.key === 'Escape') {
      if (!$('#scr-instr').hidden && $('#scr-instr').style.zIndex) { e.preventDefault(); $('#instr-back').click(); return; }
      if (!$('#scr-pause').hidden) { e.preventDefault(); closePause(); return; }
      if (!$('#scr-end').hidden) return;
      if (drag) { dragCancel(); return; }
      if (G.screen === 'modes') { e.preventDefault(); $('#modes-back').click(); }
      else if (G.screen === 'instr') { e.preventDefault(); $('#instr-back').click(); }
      else if (G.screen === 'battle' || G.screen === 'place') { e.preventDefault(); openPause(); }
      return;
    }
    if (G.screen === 'title' && (e.key === 'Enter' || e.key === ' ') && (e.target === document.body || !e.target.closest || !e.target.closest('button, a, input'))) {
      e.preventDefault(); $('#btn-play').click(); return;
    }
    if (G.quizKeys && $('#scr-pause').hidden && !(e.target && e.target.tagName === 'INPUT')) G.quizKeys(e);
    if (G.screen === 'place' && (e.key === 'r' || e.key === 'R') && selId && !(e.target && e.target.closest && e.target.closest('.ship')) && $('#scr-pause').hidden) {
      if (G.my[selId].placed) { e.preventDefault(); rotateShip(selId, Math.floor(SHIP[selId].len / 2)); refocusShip(selId); }
    }
  });

  // ---------------- layout: the biggest boards that fit, side by side when there's room
  // Everything fits on one screen, at any window size: nothing in the game ever scrolls.
  // The boards are sized to fit, and any content that is still too tall (a long question, the instructions on a phone)
  // is shrunk with CSS zoom until it fits its box.
  function fitTo(el, box) {
    if (!el || !box || el.offsetParent === null) return;
    el.style.zoom = '';
    var cs = getComputedStyle(box);
    var availH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var availW = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var h = el.scrollHeight, w = el.scrollWidth;
    var s = Math.min(1, availH / h, availW / w);
    if (s < 0.999) el.style.zoom = Math.max(0.3, Math.floor(s * 100) / 100);
  }
  function fitScreen() {
    var map = { title: '#scr-title .t-wrap', modes: '#scr-modes .menu-wrap', instr: '#instr-body', place: '#place-wrap' };
    var sel = map[G.screen];
    if (sel) fitTo($(sel), $(sel).closest('.scr'));
    if (!$('#scr-instr').hidden && $('#scr-instr').style.zIndex) fitTo($('#instr-body'), $('#scr-instr'));   // How to play, from the pause menu
    ['#scr-pause', '#scr-end'].forEach(function (id) { if (!$(id).hidden) fitTo($(id + ' .card'), $(id)); });
    fitPanel();
  }
  function fitPanel() { var p = $('#panel .pfit'); if (p) fitTo(p, $('#panel')); }

  function layout() {
    var r = app.getBoundingClientRect(), W = r.width, H = r.height;
    var frame = app.classList.contains('rank3') ? 14 : app.classList.contains('rank2') ? 10 : 0;   // the thicker rank frames
    if (G.screen === 'battle' || G.screen === 'over') {
      // two boards side by side, with the task panel either between them or underneath (never stacked to scroll)
      var arena = $('#arena'), hudH = ($('.hud').offsetHeight || 54), title = 40, gap = 12;
      var pw = Math.max(250, Math.min(340, W * 0.24));
      var panelMin = Math.max(170, Math.min(250, H * 0.3));
      var side = Math.min((W - pw - 4 * gap - 20) / 2, H - hudH - title - 3 * gap - 16);
      var below = Math.min((W - 3 * gap - 20) / 2, H - hudH - title - panelMin - 3 * gap - 16);
      var mode = side >= below ? 'lay-side' : 'lay-below', size = Math.max(side, below);
      size = Math.floor(Math.max(120, Math.min(size - frame, 700)));
      arena.className = 'arena ' + mode;
      arena.style.setProperty('--bsz', size + 'px');
      arena.style.setProperty('--pw', Math.floor(pw) + 'px');
    }
    if (G.screen === 'place') {
      // the board beside the ship dock, or (on a narrow screen) above it; the board gets whatever room the dock leaves
      var wrap = $('#place-wrap'), dock = $('#place-wrap .dock'), dockW = 330;
      wrap.style.zoom = '';
      var s1 = Math.min(W - dockW - 60, H - 52 - 40) - frame;
      wrap.classList.add('stack');
      var dockH = dock.offsetHeight;
      var s2 = Math.min(W - 44, H - 52 - 24 - dockH - 40) - frame;
      var stack = s2 > s1;
      wrap.classList.toggle('stack', stack);
      var bs = Math.max(140, Math.min(stack ? s2 : s1, 680));
      $('#place-zone').style.setProperty('--bsz', Math.floor(bs) + 'px');
    }
    fitScreen();
  }
  window.addEventListener('resize', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(app);
  // the task panel's content changes all the time (questions, hints, feedback): keep it fitting
  if (window.MutationObserver) new MutationObserver(function () { requestAnimationFrame(fitPanel); }).observe($('#panel'), { childList: true, subtree: true, characterData: true });

  show('title');
  focusLater($('#btn-play'));
})();
