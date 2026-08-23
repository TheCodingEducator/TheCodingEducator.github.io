// Wraps the game's draw() (defined in linear-world-cup-game.js, loaded
// just before this file) so the key edge-detection snapshot runs after
// every frame. p5.registerMethod() isn't reliably callable from a
// global-mode sketch in this p5 build, so plain function wrapping is used
// instead. Unlike the other ported games, there's no sprite-velocity loop
// or mouse edge-detection here - this game never calls createSprite() and
// reads native p5 mouseIsPressed/mouseClicked() directly instead of a
// Game Lab mouseDown()/mouseWentDown() shim.
(function () {
  var gameDraw = window.draw;
  window.draw = function () {
    gameDraw();
    _glKeysPrev = Object.assign({}, _glKeysNow);
  };
})();
