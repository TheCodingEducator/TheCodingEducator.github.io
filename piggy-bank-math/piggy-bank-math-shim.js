// Minimal polyfill that recreates the slice of Code.org Game Lab's API
// that Piggy Bank Math.js actually uses, so that file can run on plain
// p5.js outside Code.org's environment unmodified.

// ---- Canvas bootstrap (Code.org injects this behind the scenes) ----
function setup() {
  createCanvas(400, 400).parent('game-canvas-slot');
  // 4x keeps the canvas sharp when CSS stretches it up to 700px on
  // desktop (unchanged, confirmed fine there) - but forcing that same
  // 1600x1600 backing buffer on a touch device asks a typically much
  // weaker mobile GPU to fill far more pixels than the screen can even
  // show: measured this page's own canvas rendering into a 375x400 CSS
  // box on a 2x-density phone emulation - a >4x overdraw ratio (a real
  // ~2.56 million backing pixels painted every frame for a display
  // that only needed ~600K) for zero visible sharpness benefit, since
  // nothing on a phone displays this canvas anywhere near 700px wide.
  // Capped lower on touch devices, and never higher than the device's
  // own actual pixel ratio either way, so it's never asked to render
  // more pixels than the screen can display.
  var isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  pixelDensity(isTouch ? Math.min(2, displayDensity()) : 4);
  frameRate(30); // Game Lab's default frame rate; the game's own timing is wall-clock (millis()) based, not frame-based, so this only paces animation smoothness
  // Deliberately NOT calling angleMode(DEGREES) here, unlike every other
  // port in this site. This game always wraps its own degree-scale values
  // (0-360 rotation fields) in radians() before handing them to rotate()/
  // cos()/sin() - e.g. `rotate(radians(p.rotation))` - which only produces
  // a normal-speed spin under plain p5's default RADIANS angle mode. Under
  // DEGREES mode that already-converted-to-radians number gets reinterpreted
  // as degrees again, freezing the animation to a near-standstill.
}
// Per-frame input edge-detection bookkeeping is wired up in
// piggy-bank-math-hook.js, which runs after the game defines draw().

// ---- randomNumber(min, max): inclusive integer random, Game Lab style ----
function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---- rgb(r,g,b): Game Lab's shorthand alias for color() ----
function rgb(r, g, b, a) {
  return (a === undefined) ? color(r, g, b) : color(r, g, b, a);
}

// ---- Minimal sprite system ----
// Sprites here are only ever used as positioned, clickable hit-boxes
// (buttons and coins) - this game never sets .velocityX/.velocityY,
// .rotation, or .scale, and draws every visible thing itself (drawText(),
// drawSingleCoin(), drawPiggyBank()), so drawSprite() only needs to cover
// the plain-rectangle button look, not a full sprite renderer.
var _glAllSprites = [];

function createSprite(x, y, w, h) {
  var sprite = {
    x: x, y: y, width: w, height: h,
    shapeColor: "gray",
    visible: true,
    _destroyed: false,
    destroy: function () {
      if (this._destroyed) return;
      this._destroyed = true;
      var ai = _glAllSprites.indexOf(this);
      if (ai !== -1) _glAllSprites.splice(ai, 1);
    }
  };
  _glAllSprites.push(sprite);
  return sprite;
}

// Draws a sprite as a plain rectangle using its shapeColor - Game Lab's
// default look for any sprite that never got an animation/image assigned.
function drawSprite(s) {
  if (!s.visible) return;
  noStroke();
  fill(s.shapeColor || "gray");
  rect(s.x - s.width / 2, s.y - s.height / 2, s.width, s.height);
}

function drawSprites() {
  for (var i = 0; i < _glAllSprites.length; i++) {
    if (_glAllSprites[i].visible) drawSprite(_glAllSprites[i]);
  }
}

// mouseIsOver(sprite): true when the real mouse/touch position is within
// the sprite's rectangular bounding box, centered at (x, y).
function mouseIsOver(sprite) {
  return mouseX > sprite.x - sprite.width / 2 && mouseX < sprite.x + sprite.width / 2 &&
    mouseY > sprite.y - sprite.height / 2 && mouseY < sprite.y + sprite.height / 2;
}

// ---- Input: keyWentDown / mouseWentDown ----
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

// Enter and space scroll/submit by default - block that while playing.
var _glScrollKeys = { ' ': true, 'Spacebar': true, 'Enter': true };
window.addEventListener('keydown', function (e) {
  if (_glScrollKeys[e.key]) e.preventDefault();
  _glKeysNow[_glNormalizeKey(e.key)] = true;
});
window.addEventListener('keyup', function (e) { _glKeysNow[_glNormalizeKey(e.key)] = false; });
window.addEventListener('blur', function () { _glKeysNow = {}; }); // avoid stuck keys after alt-tab

function keyWentDown(name) {
  var k = _glNormalizeKey(name);
  return !!_glKeysNow[k] && !_glKeysPrev[k];
}

// The game only ever passes "leftButton", so any pressed mouse button counts.
var _glMouseNow = false;
var _glMousePrev = false;

function mouseWentDown() { return _glMouseNow && !_glMousePrev; }

// ---- Sound ----
// Unlike the other ported games, this game's own playSound() call already
// uses a plain relative path ("sounds/pop.mp3") rather than Code.org's
// "sound://category/name.mp3" scheme, so no URL rewriting is needed here -
// it just plays that path directly, relative to this HTML page, and fails
// silently if the file is missing.
var _glSoundCache = {};

function playSound(url, loop) {
  try {
    var audio = _glSoundCache[url];
    if (!audio) { audio = new Audio(url); _glSoundCache[url] = audio; }
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
