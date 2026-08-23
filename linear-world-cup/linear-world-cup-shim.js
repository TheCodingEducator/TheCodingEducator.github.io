// Minimal polyfill that recreates the slice of Code.org Game Lab's API
// that Linear World Cup.js actually uses, so that file can run on plain
// p5.js outside Code.org's environment unmodified.
//
// This game needs far less than Exponent Racer/Hoops or Let's Get to the
// Point: it never calls createSprite/drawSprites (all drawing is done with
// plain p5 primitives), never calls Game Lab's mouseDown()/mouseWentDown()
// (it defines its own native p5 mouseClicked() callback and reads the
// native mouseIsPressed directly instead), and never calls playSound() or
// randomNumber() (it has its own randInt() wrapping p5's random()). The
// only Game Lab-specific function it actually calls is keyWentDown().

// ---- Canvas bootstrap (Code.org injects this behind the scenes) ----
function setup() {
  createCanvas(400, 400).parent('game-canvas-slot');
  // The game's own clock/timer math is tuned for 60fps specifically - e.g.
  // "enemyAnimDuration = round(random(240, 240)); // 4 seconds at 60fps"
  // and gameClockSeconds advancing by 50/60 per frame - so this is the one
  // port so far that does NOT use Game Lab's usual frameRate(30) default.
  frameRate(60);
  angleMode(DEGREES); // Game Lab uses degrees everywhere (the flag/arc/aim-arrow math here all assumes degrees), unlike plain p5.js's radians default
}
// Per-frame input edge-detection bookkeeping is wired up in
// linear-world-cup-hook.js, which runs after the game defines draw().

// ---- Input: keyDown / keyWentDown ----
// "WentDown" is true only on the single frame a key transitions from up to
// down - tracked here with a before/after-draw snapshot.
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
