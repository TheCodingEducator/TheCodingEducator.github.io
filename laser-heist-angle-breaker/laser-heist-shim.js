// Minimal polyfill that recreates the slice of Code.org Game Lab's API
// that Laser Heist.js actually uses, so that file can run on plain
// p5.js outside Code.org's environment unmodified.
//
// This port is structurally different from every other game on this
// site: the game itself defines setup() and draw() (every other port
// left that to this shim, since Code.org normally injects it behind
// the scenes) and does its OWN input edge-detection internally. The
// canvas-routing/pixelDensity/frameRate bootstrap every other shim
// does directly in its own setup() instead happens in
// laser-heist-hook.js here, which wraps the GAME's own setup() after
// game.js has defined it - see that file for why. This file only
// supplies the actual Game Lab functions the game calls at runtime:
// keyDown(name) and playSound(url)/stopSound(url).

// ---- keyDown(name): Game Lab's string-keyed poll ----
// Real p5.js only has keyIsDown(keyCode) (a numeric code or a p5
// constant like LEFT_ARROW) - Game Lab's keyDown() takes plain
// lowercase string names ("left", "a", "enter", "0"-"9", etc.)
// instead, which is what this game's own safeKeyDown()/keyEdge()
// wrappers assume throughout.
var _glKeysNow = {};

function _glNormalizeKey(k) {
  if (k === ' ' || k === 'Spacebar') return 'space';
  if (k === 'ArrowLeft') return 'left';
  if (k === 'ArrowRight') return 'right';
  if (k === 'ArrowUp') return 'up';
  if (k === 'ArrowDown') return 'down';
  if (k === 'Escape') return 'escape';
  if (k === 'Enter') return 'enter';
  if (k === 'Backspace') return 'backspace';
  if (k === 'Delete') return 'delete';
  return String(k).toLowerCase();
}

// Arrow keys and space scroll the page by default - block that while
// playing, since it fights the player and shoves the canvas out from
// under them.
var _glScrollKeys = { ' ': true, 'ArrowUp': true, 'ArrowDown': true, 'ArrowLeft': true, 'ArrowRight': true, 'Spacebar': true };
window.addEventListener('keydown', function (e) {
  if (_glScrollKeys[e.key]) e.preventDefault();
  _glKeysNow[_glNormalizeKey(e.key)] = true;
});
window.addEventListener('keyup', function (e) { _glKeysNow[_glNormalizeKey(e.key)] = false; });
window.addEventListener('blur', function () { _glKeysNow = {}; }); // avoid stuck keys after alt-tab

function keyDown(name) {
  return !!_glKeysNow[_glNormalizeKey(name)];
}

// ---- Sound ----
// Game Lab's playSound() points at Code.org's own hosted sound
// library ("sound://category_x/name.mp3"), which isn't reachable
// outside Code.org. This looks for a same-named file in a local
// laser-heist-angle-breaker/sounds/ folder instead. The game already
// wraps every playSfx() call in its own try/catch, so this doesn't
// need to fail silently itself - but does anyway, to be safe if
// something ever calls it directly.
var _glSoundCache = {};

function _glSoundFile(url) {
  var parts = url.split('/');
  return 'sounds/' + parts[parts.length - 1];
}

function playSound(url, loop) {
  if (url.indexOf('synth://') === 0) { _glPlaySynth(url.slice('synth://'.length)); return; }
  try {
    var audio = _glSoundCache[url];
    if (!audio) { audio = new Audio(_glSoundFile(url)); _glSoundCache[url] = audio; }
    audio.loop = !!loop;
    audio.currentTime = 0;
    var p = audio.play();
    if (p && p.catch) p.catch(function () {});
  } catch (e) {}
}

function stopSound(url) {
  var audio = _glSoundCache[url];
  if (audio) { audio.pause(); audio.currentTime = 0; }
}

// ---- Synthesized cues ----
// A couple of cues (the sneaking-phase near-miss "tension" blip) are
// generated directly with the Web Audio API instead of a library
// file (see SOUND_URLS.tension in laser-heist-game.js) -- it needs to
// repeat rapidly and never wear out its welcome, which is easier to
// get right by tuning an oscillator envelope than by hunting the
// sound library for the closest available file.
var _glAudioCtx = null;
function _glGetAudioCtx() {
  if (!_glAudioCtx) {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    _glAudioCtx = new Ctx();
  }
  return _glAudioCtx;
}

function _glPlaySynth(name) {
  try {
    var ctx = _glGetAudioCtx();
    if (ctx.state === 'suspended') { ctx.resume(); }
    if (name === 'tension_blip') {
      var now = ctx.currentTime;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch (e) {}
}
