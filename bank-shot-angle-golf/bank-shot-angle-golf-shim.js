// Small support layer for Bank Shot: Angle Golf. Unlike the ported
// Code.org games on this site, this game was written directly against
// plain p5.js, so there's no Game Lab API to emulate here - this file
// only supplies sound playback and the density-aware canvas bootstrap
// (never draw sharper than the screen can show - extra pixels just cost speed).

function setup() {
  createCanvas(700, 700).parent('game-canvas-slot');
  // draw at the screen's own sharpness (1x on most classroom laptops and Chromebooks, 2x on sharp screens),
  // never more: a forced 2x draws four times the pixels, which made the zoom and the first roll lag
  pixelDensity(Math.min(2, Math.max(1, displayDensity())));
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
