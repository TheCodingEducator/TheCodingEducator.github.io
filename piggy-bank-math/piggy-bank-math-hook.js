// Wraps the game's draw() (defined in piggy-bank-math-game.js, loaded
// just before this file) so per-frame input edge-detection bookkeeping
// runs around it every frame. p5.registerMethod() isn't reliably callable
// from a global-mode sketch in this p5 build, so plain function wrapping
// is used instead. Unlike the other ported games, there's no sprite-
// velocity loop or camera-offset reset here - this game's sprites are
// static hit-boxes (never given a velocity or moved by the engine) and it
// never touches camera/World.
(function () {
  var gameDraw = window.draw;
  window.draw = function () {
    _glMouseNow = mouseIsPressed;

    gameDraw();

    _glKeysPrev = Object.assign({}, _glKeysNow);
    _glMousePrev = _glMouseNow;
  };
})();
