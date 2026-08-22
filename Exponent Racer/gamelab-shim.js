// Minimal polyfill that recreates the slice of Code.org Game Lab's API
// (a customized p5.play) that Exponent Racer.js actually uses, so that
// file can run on plain p5.js outside Code.org's environment unmodified.

// ---- Canvas bootstrap (Code.org injects this behind the scenes) ----
function setup() {
  createCanvas(400, 450);
  frameRate(30); // Game Lab's default frame rate; the game's speed constants were tuned against it
}
// Per-frame bookkeeping (sprite velocity, input edge-detection) is wired up
// in gamelab-hook.js, which runs after Exponent Racer.js defines draw().

// ---- Background-color globals startGame()/playGame() assign into ----
var oldBgColor = [0, 128, 0];
var newBgColor = [0, 128, 0];

// ---- randomNumber(min, max): inclusive integer random, Game Lab style ----
function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

window.addEventListener('keydown', function (e) { _glKeysNow[_glNormalizeKey(e.key)] = true; });
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
// Code.org. This looks for a same-named file in a local sounds/ folder
// instead, and fails silently if it isn't there - see sounds/README.txt.
var _glSoundCache = {};

function _glSoundFile(url) {
  var parts = url.split('/');
  return 'sounds/' + parts[parts.length - 1];
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
