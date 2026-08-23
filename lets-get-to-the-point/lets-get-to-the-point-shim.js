// Minimal polyfill that recreates the slice of Code.org Game Lab's API
// (a customized p5.play) that Let's Get to the Point.js actually uses, so
// that file can run on plain p5.js outside Code.org's environment unmodified.

// ---- Canvas bootstrap (Code.org injects this behind the scenes) ----
function setup() {
  createCanvas(400, 400).parent('game-canvas-slot');
  pixelDensity(4); // renders into a 1600x1600 backing buffer instead of 400x400 so the canvas stays sharp when CSS stretches it up to 700px (desktop) or fullscreen - all game coordinates stay in the same 0-400 logical space either way
  frameRate(30); // Game Lab's default frame rate; the game's speed constants were tuned against it
  angleMode(DEGREES); // Game Lab uses degrees everywhere (rotate(), arc() angles, sprite.rotation, and this game's own cos()/sin() tracing-paper math), unlike plain p5.js's radians default
}
// Per-frame bookkeeping (sprite velocity, input edge-detection) is wired up
// in lets-get-to-the-point-hook.js, which runs after the game defines draw().

// ---- Minimal sprite/group system ----
// Only used here for a single invisible bookkeeping sprite (inputSprite) -
// drawSprites() is still called every frame by the game, so the drawing
// side is implemented for completeness even though nothing visible uses it.
var _glAllSprites = [];

function createSprite(x, y, w, h) {
  var sprite = {
    x: x, y: y, width: w || 0, height: h || 0,
    velocityX: 0, velocityY: 0,
    rotation: 0, scale: 1,
    shapeColor: "gray",
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

// Draws a sprite as a plain rectangle using its shapeColor - Game Lab's
// default look for any sprite that never got an animation/image assigned.
function drawSprite(s) {
  if (!s.visible) return;
  push();
  translate(s.x, s.y);
  rotate(s.rotation || 0);
  var sc = (s.scale === undefined || s.scale === null) ? 1 : s.scale;
  if (sc !== 1) scale(sc);
  noStroke();
  fill(s.shapeColor || "gray");
  rect(-s.width / 2, -s.height / 2, s.width, s.height);
  pop();
}

function drawSprites() {
  for (var i = 0; i < _glAllSprites.length; i++) {
    if (_glAllSprites[i].visible) drawSprite(_glAllSprites[i]);
  }
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

// The game only ever passes "left", so any pressed mouse button counts.
var _glMouseNow = false;
var _glMousePrev = false;

function mouseDown() { return _glMouseNow; }
function mouseWentDown() { return _glMouseNow && !_glMousePrev; }
