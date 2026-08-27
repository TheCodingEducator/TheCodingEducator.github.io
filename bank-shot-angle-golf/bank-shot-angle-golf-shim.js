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
var _glSoundCache = {};

function playSound(name, loop) {
  try {
    var audio = _glSoundCache[name];
    if (!audio) { audio = new Audio('sounds/' + name + '.mp3'); _glSoundCache[name] = audio; }
    audio.loop = !!loop;
    audio.currentTime = 0;
    var p = audio.play();
    if (p && p.catch) p.catch(function () {});
  } catch (e) {}
}

function stopSound(name) {
  var audio = _glSoundCache[name];
  if (audio) { audio.pause(); audio.currentTime = 0; }
}
