// Minimal polyfill that recreates the slice of Code.org Game Lab's API
// (a customized p5.play) that Exponent Racer.js actually uses, so that
// file can run on plain p5.js outside Code.org's environment unmodified.

// ---- Canvas bootstrap (Code.org injects this behind the scenes) ----
function setup() {
  var isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  createCanvas(400, 400).parent('game-canvas-slot');
  pixelDensity(Math.min(2, displayDensity())); // renders into a sharper-than-400x400 backing buffer so the canvas stays crisp when CSS stretches it up to 700px (desktop) or fullscreen, but never beyond what the actual screen can show or above 2x on touch devices - see bank-shot-angle-golf-shim.js for the same fix (Piggy Bank Math ran laggy on phones until this was capped)
  // The game's speed constants were tuned for Game Lab's 30 frames per second. p5's own frameRate(30) throttle can pace frames
  // unevenly (some 33 ms, some 50 ms), which feels laggy, so instead p5 is paused and redraw() is called from our own timer,
  // which carries the leftover time forward so frames land on an even 30 per second.
  noLoop();
  (function () {
    var STEP = 1000 / 30, acc = 0, last = performance.now();
    function tick(now) {
      requestAnimationFrame(tick);
      acc += Math.min(100, now - last); last = now;
      if (acc >= STEP - 3) { acc = Math.min(acc - STEP, STEP); fitDensity(); redraw(); }
    }
    // Keep the picture sharp: the backing buffer gets enough pixels for the size the canvas is actually shown at (CSS size x screen
    // scaling), rather than a fixed 1x-2x - on a normal monitor a 400px buffer stretched to about 700px or fullscreen looked fuzzy.
    // Capped at 3x (2x on touch devices) so it never costs much speed.
    var dens = 0, lastCss = 0;
    function fitDensity() {
      var c = document.querySelector('canvas'); if (!c) return;
      var css = c.clientWidth; if (!css || css === lastCss) return; lastCss = css;
      var want = Math.min(isTouch ? 2 : 3, Math.max(1, Math.ceil(css * (window.devicePixelRatio || 1) / 400 - 0.05)));
      if (want !== dens) { dens = want; pixelDensity(want); }
    }
    requestAnimationFrame(tick);
  })();
  angleMode(DEGREES); // Game Lab uses degrees everywhere (rotate(), arc() angles), unlike plain p5.js's radians default
}
// Per-frame bookkeeping (sprite velocity, input edge-detection) is wired up
// in gamelab-hook.js, which runs after Exponent Racer.js defines draw().

// ---- Background-color globals startGame()/playGame() assign into ----
var oldBgColor = [0, 128, 0];
var newBgColor = [0, 128, 0];

// ---- randomNumber(min, max): inclusive integer random, Game Lab style ----
// Uses a small seeded generator (mulberry32) instead of Math.random(), so its state can be saved and restored:
// Second Chance rewinds the game and replays the last 3 seconds with exactly the same "random" events as before.
var _rngS = (Math.random() * 4294967296) >>> 0;
function _rng() {
  _rngS = (_rngS + 0x6D2B79F5) | 0;
  var t = Math.imul(_rngS ^ (_rngS >>> 15), 1 | _rngS);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function randomNumber(min, max) {
  return Math.floor(_rng() * (max - min + 1)) + min;
}

// ---- Minimal sprite/group system ----
// Every sprite here is only ever read for .x/.y (and, for the coin,
// .velocityX) - the game never touches p5.play's own drawing, physics or
// collision helpers - so a lightweight stand-in is enough.
var _glAllSprites = [];

function createSprite(x, y, w, h) {
  var sprite = {
    x: x, y: y, width: w, height: h,
    velocityX: 0, velocityY: 0,
    visible: true,
    _groups: [],
    _destroyed: false,
    destroy: function () {
      if (this._destroyed) return;
      this._destroyed = true;
      var ai = _glAllSprites.indexOf(this);
      if (ai !== -1) _glAllSprites.splice(ai, 1);
      for (var g = 0; g < this._groups.length; g++) this._groups[g]._remove(this);
    }
  };
  _glAllSprites.push(sprite);
  return sprite;
}

function createGroup() {
  var items = [];
  var group = {
    add: function (sprite) { items.push(sprite); sprite._groups.push(group); },
    get: function (i) { return items[i]; },
    destroyEach: function () { for (var i = items.length - 1; i >= 0; i--) items[i].destroy(); },
    _remove: function (sprite) { var i = items.indexOf(sprite); if (i !== -1) items.splice(i, 1); }
  };
  Object.defineProperty(group, 'length', { get: function () { return items.length; } });
  return group;
}

// ---- Input: keyDown / keyWentDown / mouseDown / mouseWentDown ----
// "WentDown" is true only on the single frame a key/button transitions
// from up to down - tracked here with a before/after-draw snapshot.
var _glKeysNow = {};
var _glKeysPrev = {};

function _glNormalizeKey(k) {
  if (k === ' ' || k === 'Spacebar') return 'space';
  if (k === 'ArrowLeft') return 'left';
  if (k === 'ArrowRight') return 'right';
  if (k === 'ArrowUp') return 'up';
  if (k === 'ArrowDown') return 'down';
  return String(k).toLowerCase();
}

// Arrow keys and space scroll the page by default - block that while playing,
// since it fights the player and shoves the canvas out from under them.
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
function keyWentDown(name) {
  var k = _glNormalizeKey(name);
  return !!_glKeysNow[k] && !_glKeysPrev[k];
}

// The game only ever passes "leftButton", so any pressed mouse button counts.
var _glMouseNow = false;
var _glMousePrev = false;

function mouseDown() { return _glMouseNow; }
function mouseWentDown() { return _glMouseNow && !_glMousePrev; }

// ---- Sound ----
// Game Lab's playSound()/stopSound() point at Code.org's own hosted sound
// library ("sound://category_x/name.mp3"), which isn't reachable outside
// Code.org. This looks for a same-named file in a local
// exponent-racer-sounds/ folder instead, and fails silently if it isn't
// there - see exponent-racer-sounds/README.txt.
var _glSoundCache = {};

function _glSoundFile(url) {
  var parts = url.split('/');
  return 'exponent-racer-sounds/' + parts[parts.length - 1];
}

function playSound(url, loop) {
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
