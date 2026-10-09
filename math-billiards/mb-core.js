// Math Billiards - core: the shared namespace, words in two languages, vector and angle helpers, saved data and sound.
// Every other file adds its own part to window.MB (physics, geometry, rendering, the computer player, rules, shop, game).
(function () {
  var MB = window.MB = window.MB || {};
  var T = MB.T = window.tl || function (en) { return en; };

  // ------------------------------------------------------------------ the stage and the table (one fixed 1280 x 720 stage)
  MB.W = 1280; MB.H = 720;
  MB.R = 11;   // a ball's radius
  // the playing surface (the cloth inside the cushions): a 2:1 pool table
  MB.TABLE = { x0: 58, y0: 146, x1: 938, y1: 586, rail: 40 };

  // ------------------------------------------------------------------ vectors and angles
  // Angles are in degrees on the screen (y points down), so an angle a means the direction (cos a, sin a).
  var D2R = Math.PI / 180;
  var V = MB.V = {
    add: function (a, b) { return { x: a.x + b.x, y: a.y + b.y }; },
    sub: function (a, b) { return { x: a.x - b.x, y: a.y - b.y }; },
    mul: function (a, k) { return { x: a.x * k, y: a.y * k }; },
    dot: function (a, b) { return a.x * b.x + a.y * b.y; },
    cross: function (a, b) { return a.x * b.y - a.y * b.x; },
    len: function (a) { return Math.sqrt(a.x * a.x + a.y * a.y); },
    norm: function (a) { var l = Math.sqrt(a.x * a.x + a.y * a.y) || 1; return { x: a.x / l, y: a.y / l }; },
    neg: function (a) { return { x: -a.x, y: -a.y }; },
    dir: function (deg) { return { x: Math.cos(deg * D2R), y: Math.sin(deg * D2R) }; },
    ang: function (a) { return Math.atan2(a.y, a.x) / D2R; },
    rot: function (a, deg) { var c = Math.cos(deg * D2R), s = Math.sin(deg * D2R); return { x: a.x * c - a.y * s, y: a.x * s + a.y * c }; },
    dist: function (a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); },
    // the angle between two rays (0 to 180)
    between: function (a, b) { var c = (a.x * b.x + a.y * b.y) / ((V.len(a) * V.len(b)) || 1); return Math.acos(Math.max(-1, Math.min(1, c))) / D2R; },
    // which way to turn from ray a to reach ray b the short way: +1 or -1
    side: function (a, b) { return (a.x * b.y - a.y * b.x) >= 0 ? 1 : -1; }
  };
  MB.D2R = D2R;
  MB.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  MB.rand = function (a, b) { return a + Math.random() * (b - a); };
  MB.randi = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  MB.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  MB.shuffle = function (arr) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
  MB.$ = function (s) { return document.querySelector(s); };
  MB.say = function (t) { if (window.SiteSR) window.SiteSR.say(t); };

  // ------------------------------------------------------------------ saved data (this browser only: coins, cosmetics, settings)
  var KEY = 'mathbilliards_save';
  function fresh() {
    return { v: 1, coins: 0, owned: [], equip: { cue: 'maple', table: 'green', balls: 'classic', fx: 'none' },
      sound: true, tutorialSeen: false, rulesSeen: false, diff: 'beginner', skills: ['comp', 'supp', 'vert', 'par'],
      totals: { questions: 0, firstTry: 0, games: 0, wins: 0 } };
  }
  MB.save = (function () {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 1) {
        var f = fresh(), k;
        for (k in f) if (!(k in s)) s[k] = f[k];
        for (k in f.equip) if (!s.equip[k]) s.equip[k] = f.equip[k];
        return s;
      }
    } catch (e) {}
    return fresh();
  })();
  MB.store = function () { try { localStorage.setItem(KEY, JSON.stringify(MB.save)); } catch (e) {} };
  MB.resetSave = function () { try { localStorage.removeItem(KEY); } catch (e) {} MB.save = fresh(); };

  // ------------------------------------------------------------------ sound: every sound is made right here (no sound files)
  MB.Sound = (function () {
    var ac = null, master = null;
    function ctx() {
      if (ac) return ac;
      var A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
      try { ac = new A(); master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination); } catch (e) { ac = null; }
      return ac;
    }
    function on() { return MB.save.sound && ctx(); }
    function tone(type, f1, f2, dur, vol, delay) {
      if (!on()) return;
      var t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f1, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    }
    var noiseBuf = null;
    function noise(dur, vol, freq, q, delay, type) {
      if (!on()) return;
      if (!noiseBuf) { var n = ac.sampleRate, d; noiseBuf = ac.createBuffer(1, n, n); d = noiseBuf.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
      var t = ac.currentTime + (delay || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf; f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    }
    var lastClack = 0;
    var fx = {
      // the cue tip meeting the cue ball: a short woody knock
      cue: function (p) { noise(0.06, 0.25 + p * 0.35, 1800, 1.4); tone('triangle', 420, 260, 0.07, 0.12 + p * 0.1); },
      // two balls touching: the bright resin clack, louder for a harder hit
      clack: function (s) {
        var now = ac ? ac.currentTime : 0; if (now - lastClack < 0.018) return; lastClack = now;
        var v = Math.min(1, s / 1400); if (v < 0.03) return;
        noise(0.045, 0.1 + v * 0.5, 4200, 2.2); tone('sine', 2900, 2100, 0.04, 0.04 + v * 0.12);
      },
      // a ball against the cushion: a soft rubber thump
      cushion: function (s) { var v = Math.min(1, s / 1400); if (v < 0.05) return; noise(0.09, 0.08 + v * 0.25, 260, 0.9, 0, 'lowpass'); tone('sine', 140, 90, 0.1, 0.05 + v * 0.1); },
      // a ball dropping into a pocket: a hollow drop and a short rattle
      pocket: function () { tone('sine', 300, 120, 0.22, 0.22); noise(0.18, 0.18, 900, 1.2, 0.06); tone('triangle', 180, 110, 0.12, 0.08, 0.16); },
      click: function () { tone('sine', 1300, 1000, 0.05, 0.1); },
      type: function () { tone('square', 1800, 0, 0.02, 0.03); },
      correct: function () { [784, 988, 1175, 1568].forEach(function (f, i) { tone('triangle', f, 0, 0.18, 0.12, i * 0.06); }); },
      wrong: function () { tone('sawtooth', 260, 150, 0.32, 0.1); tone('sine', 196, 160, 0.4, 0.1, 0.05); },
      coin: function () { tone('square', 1976, 0, 0.07, 0.07); tone('square', 2637, 0, 0.22, 0.07, 0.07); },
      buy: function () { [1047, 1319, 1568, 2093, 2637].forEach(function (f, i) { tone('triangle', f, 0, 0.16, 0.09, i * 0.05); }); },
      turn: function () { tone('sine', 523, 659, 0.18, 0.1); tone('sine', 784, 0, 0.2, 0.08, 0.12); },
      win: function () { [523, 659, 784, 1047, 1319, 1568].forEach(function (f, i) { tone('triangle', f, 0, 0.35, 0.12, i * 0.09); }); },
      lose: function () { [392, 330, 262].forEach(function (f, i) { tone('triangle', f, 0, 0.4, 0.12, i * 0.16); }); },
      think: function () { tone('sine', 880, 0, 0.06, 0.05); }
    };
    return {
      play: function (n, a) { try { if (fx[n] && on()) fx[n](a || 0); } catch (e) {} },
      unlock: function () { var a = ctx(); if (a && a.state === 'suspended') a.resume(); }
    };
  })();
  ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { MB.Sound.unlock(); }, { once: true }); });
})();
