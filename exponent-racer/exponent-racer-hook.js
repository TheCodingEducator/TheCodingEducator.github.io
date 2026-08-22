// Wraps the game's draw() (defined in Exponent Racer.js, loaded just
// before this file) so per-frame bookkeeping - sprite velocity, input
// edge-detection - runs around it every frame. p5.registerMethod() isn't
// reliably callable from a global-mode sketch in this p5 build, so plain
// function wrapping is used instead.
(function () {
  var gameDraw = window.draw;
  window.draw = function () {
    for (var i = 0; i < _glAllSprites.length; i++) {
      var s = _glAllSprites[i];
      s.x += s.velocityX;
      s.y += s.velocityY;
    }
    _glMouseNow = mouseIsPressed;

    gameDraw();

    _glKeysPrev = Object.assign({}, _glKeysNow);
    _glMousePrev = _glMouseNow;
  };
})();
