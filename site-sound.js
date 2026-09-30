// Shared sound player for the games that play recorded sound files (window.SiteSound).
//
// A plain <audio> element hitches a game on phones the first time it plays (the file is loaded and decoded mid-game), and
// phone browsers often refuse to play one that wasn't started by a tap - so a coin, a goal or a click could lag or make no
// sound at all. Here every file is decoded into memory once, ahead of time, and played through one AudioContext that is
// unlocked by the first touch, click or key press. Playing a decoded sound is instant, and the same sound can overlap
// itself. Browsers without Web Audio fall back to a small pool of <audio> elements.
//
//   SiteSound.preload(['sounds/pop.mp3', ...])   start loading files early (optional; play() loads on first use too)
//   SiteSound.play('sounds/pop.mp3', loop)       paths are relative to the game's page
//   SiteSound.stop('sounds/pop.mp3')             stops a looping (or still playing) sound
//   SiteSound.context()                          the shared AudioContext (for games that also synthesize tones), or null
(function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  try { if (AC && window.fetch) ctx = new AC(); } catch (e) { ctx = null; }

  var buffers = {}, loading = {}, playing = {};

  function load(file) {
    if (!ctx) return null;
    if (buffers[file]) return Promise.resolve(buffers[file]);
    if (loading[file]) return loading[file];
    loading[file] = fetch(file).then(function (r) { if (!r.ok) throw new Error(file); return r.arrayBuffer(); }).then(function (data) {
      return new Promise(function (ok, fail) { ctx.decodeAudioData(data, ok, fail); });   // callback form works on older Safari too
    }).then(function (buf) { buffers[file] = buf; return buf; }, function () { delete loading[file]; return null; });
    return loading[file];
  }

  // Phones start the AudioContext suspended until the player touches the screen. A silent sound started inside the
  // gesture is what iOS needs; once the context is running this does nothing.
  function unlock() {
    if (!ctx || ctx.state === 'running') return;
    try {
      ctx.resume();
      var s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0);
    } catch (e) {}
  }
  if (ctx) {
    ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown'].forEach(function (ev) { window.addEventListener(ev, unlock, true); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') unlock(); });
  }

  function start(file, buf, loop) {
    var src = ctx.createBufferSource();
    src.buffer = buf; src.loop = !!loop;
    src.connect(ctx.destination);
    src.start(0);
    var list = playing[file] || (playing[file] = []);
    list.push(src);
    src.onended = function () { var i = list.indexOf(src); if (i >= 0) list.splice(i, 1); try { src.disconnect(); } catch (e) {} };
  }

  // ---- Fallback: a few <audio> elements per sound, so overlapping plays don't cut each other off ----
  var pools = {};
  function htmlPlay(file, loop) {
    var pool = pools[file] || (pools[file] = []), a = null;
    for (var i = 0; i < pool.length; i++) if (pool[i].paused || pool[i].ended) { a = pool[i]; break; }
    if (!a) { if (pool.length < 3) { a = new Audio(file); pool.push(a); } else a = pool[0]; }
    a.loop = !!loop;
    var go = function () { try { a.currentTime = 0; } catch (e) {} var p = a.play(); if (p && p.catch) p.catch(function () {}); };
    if (a.readyState >= 1) go(); else a.addEventListener('loadedmetadata', go, { once: true });
  }

  window.SiteSound = {
    preload: function (files) { if (ctx) files.forEach(load); },
    play: function (file, loop) {
      try {
        if (!ctx) { htmlPlay(file, loop); return; }
        if (ctx.state === 'suspended') ctx.resume();
        if (buffers[file]) start(file, buffers[file], loop);
        else load(file).then(function (buf) { if (buf) start(file, buf, loop); });
      } catch (e) {}
    },
    stop: function (file) {
      var list = playing[file];
      if (list) { list.slice().forEach(function (s) { try { s.stop(0); } catch (e) {} }); playing[file] = []; }
      var pool = pools[file];
      if (pool) pool.forEach(function (a) { a.pause(); try { a.currentTime = 0; } catch (e) {} });
    },
    context: function () { return ctx; }
  };
})();
