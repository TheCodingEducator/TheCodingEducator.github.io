// Minimal polyfill that recreates the slice of Code.org Game Lab's API
// (a customized p5.play) that Exponent Hoops.js actually uses, so that
// file can run on plain p5.js outside Code.org's environment unmodified.

// ---- Canvas bootstrap (Code.org injects this behind the scenes) ----
function setup() {
  createCanvas(400, 400).parent('game-canvas-slot');
  frameRate(30); // Game Lab's default frame rate; the game's speed constants were tuned against it
  angleMode(DEGREES); // Game Lab uses degrees everywhere (rotate(), arc() angles, sprite.rotation), unlike plain p5.js's radians default
}
// Per-frame bookkeeping (sprite velocity, input edge-detection, camera reset)
// is wired up in gamelab-hook.js, which runs after Exponent Hoops.js defines draw().

// ---- randomNumber(min, max): inclusive integer random, Game Lab style ----
function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---- Minimal sprite/group system ----
// Sprites here are read for position (.x/.y), moved automatically from
// .velocityX/.velocityY like Game Lab's built-in physics, and some are
// drawn via drawSprite() using .shapeColor/.rotation/.scale as a plain
// rectangle (Game Lab's default look for a sprite with no animation set).
var _glAllSprites = [];

function createSprite(x, y, w, h) {
  var sprite = {
    x: x, y: y, width: w, height: h,
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

// ---- camera / World.mouseX / World.mouseY ----
// Game Lab's camera.x/camera.y recenter the whole scene around a world
// point; used here purely for a screen-shake effect. Assigning to
// camera.x/camera.y immediately shifts everything drawn afterward this
// frame - real p5.play does the same live-transform trick.
var _camAppliedX = 0, _camAppliedY = 0;
var _cameraX = 200, _cameraY = 200;
var camera = {
  get x() { return _cameraX; },
  set x(v) {
    _cameraX = v;
    var desired = width / 2 - v;
    translate(desired - _camAppliedX, 0);
    _camAppliedX = desired;
  },
  get y() { return _cameraY; },
  set y(v) {
    _cameraY = v;
    var desired = height / 2 - v;
    translate(0, desired - _camAppliedY);
    _camAppliedY = desired;
  }
};

// World.mouseX/mouseY report the mouse in the same shifted coordinates
// used for drawing (screen mouseX/mouseY corrected for the camera offset).
var World = {
  get mouseX() { return mouseX - _camAppliedX; },
  get mouseY() { return mouseY - _camAppliedY; }
};

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
// exponent-hoops-sounds/ folder instead, and fails silently if it isn't
// there - see exponent-hoops-sounds/README.txt.
var _glSoundCache = {};

function _glSoundFile(url) {
  var parts = url.split('/');
  return 'exponent-hoops-sounds/' + parts[parts.length - 1];
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
