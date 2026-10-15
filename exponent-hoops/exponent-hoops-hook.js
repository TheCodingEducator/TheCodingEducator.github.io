// Wraps the game's draw() (defined in Exponent Hoops.js, loaded just
// before this file) so per-frame bookkeeping - sprite velocity, input
// edge-detection, camera-offset reset - runs around it every frame.
// p5.registerMethod() isn't reliably callable from a global-mode sketch
// in this p5 build, so plain function wrapping is used instead.
(function () {
  // A tap or key press that starts and ends between two frames (a quick tap, or a slow device) still counts: it is
  // remembered until the next frame has seen it.
  var _glTapSince = false, _glKeysSince = {};
  window.addEventListener('pointerdown', function () { _glTapSince = true; }, true);
  window.addEventListener('keydown', function (e) { var k = _glNormalizeKey(e.key); if (_glKeysNow[k]) _glKeysSince[k] = true; });
  var gameDraw = window.draw;
  window.draw = function () {
    for (var i = 0; i < _glAllSprites.length; i++) {
      var s = _glAllSprites[i];
      s.x += s.velocityX;
      s.y += s.velocityY;
    }
    _glMouseNow = mouseIsPressed || _glTapSince;
    _glTapSince = false;

    // p5 resets the transform to identity before each draw() call, so the
    // camera's tracked "already applied" offset needs to reset too.
    _camAppliedX = 0;
    _camAppliedY = 0;

    var _glTemp = [];

    for (var _k in _glKeysSince) if (_glKeysSince[_k] && !_glKeysNow[_k]) { _glKeysNow[_k] = true; _glTemp.push(_k); }

    _glKeysSince = {};


    gameDraw();

    _glKeysPrev = Object.assign({}, _glKeysNow);

    _glTemp.forEach(function (k) { _glKeysNow[k] = false; });
    _glMousePrev = _glMouseNow;
  };
})();
