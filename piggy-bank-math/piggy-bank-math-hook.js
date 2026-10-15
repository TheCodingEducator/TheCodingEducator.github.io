// Wraps the game's draw() (defined in piggy-bank-math-game.js, loaded
// just before this file) so per-frame input edge-detection bookkeeping
// runs around it every frame. p5.registerMethod() isn't reliably callable
// from a global-mode sketch in this p5 build, so plain function wrapping
// is used instead. Unlike the other ported games, there's no sprite-
// velocity loop or camera-offset reset here - this game's sprites are
// static hit-boxes (never given a velocity or moved by the engine) and it
// never touches camera/World.
(function () {
  // A tap or key press that starts and ends between two frames (a quick tap, or a slow device) still counts: it is
  // remembered until the next frame has seen it.
  var _glTapSince = false, _glKeysSince = {};
  window.addEventListener('pointerdown', function () { _glTapSince = true; }, true);
  window.addEventListener('keydown', function (e) { var k = _glNormalizeKey(e.key); if (_glKeysNow[k]) _glKeysSince[k] = true; });
  var gameDraw = window.draw;
  window.draw = function () {
    _glMouseNow = mouseIsPressed || _glTapSince;
    _glTapSince = false;

    var _glTemp = [];

    for (var _k in _glKeysSince) if (_glKeysSince[_k] && !_glKeysNow[_k]) { _glKeysNow[_k] = true; _glTemp.push(_k); }

    _glKeysSince = {};


    gameDraw();

    _glKeysPrev = Object.assign({}, _glKeysNow);

    _glTemp.forEach(function (k) { _glKeysNow[k] = false; });
    _glMousePrev = _glMouseNow;
  };
})();
