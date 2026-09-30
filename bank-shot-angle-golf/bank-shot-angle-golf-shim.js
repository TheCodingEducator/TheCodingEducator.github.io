// Small support layer for Bank Shot: Angle Golf. Unlike the ported
// Code.org games on this site, this game was written directly against
// plain p5.js, so there's no Game Lab API to emulate here - this file
// only supplies sound playback and the touch-density-aware canvas
// bootstrap (the lesson learned from Piggy Bank Math running laggy on
// phones: cap the backing-buffer multiplier on touch devices instead
// of forcing the same high multiplier everywhere).

function setup() {
  var isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  createCanvas(700, 700).parent('game-canvas-slot');
  pixelDensity(isTouch ? Math.min(2, displayDensity()) : 2);
  frameRate(60);
  angleMode(DEGREES);
  gameSetup();
}

function draw() {
  gameDraw();
}

// ---- Sound ----
// Played through the site's shared sound player (../site-sound.js): preloaded, instant, and reliable on phones.
SiteSound.preload(['bounce', 'chaos', 'click', 'correct', 'course_complete', 'hit', 'hole_complete', 'sink', 'tick', 'wrong']
  .map(function (n) { return 'sounds/' + n + '.mp3'; }));

function playSound(name, loop) { SiteSound.play('sounds/' + name + '.mp3', loop); }
function stopSound(name) { SiteSound.stop('sounds/' + name + '.mp3'); }
