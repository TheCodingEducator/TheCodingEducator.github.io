// Wraps the game's own setup() (defined in laser-heist-game.js, loaded
// just before this file) instead of the game's draw() like every
// other port's hook.js - this game defines setup() AND draw() itself
// (Code.org normally injects setup() behind the scenes, but this
// export includes its own), and does its own input edge-detection
// internally, so there's nothing per-frame this file needs to touch.
//
// The real setup() calls createCanvas(400, 400) with no .parent(...)
// - Code.org injects that routing invisibly, so the original code
// never needed it - which would otherwise append the canvas to the
// end of <body> instead of into this page's #game-canvas-slot
// layout. Trying to intercept createCanvas() itself (from
// laser-heist-shim.js, loaded before p5 finishes initializing) fails
// with "createCanvas is not defined" - p5 doesn't attach its global
// functions until its own deferred startup, well after any script's
// own top-level code has already run. Wrapping setup() sidesteps
// this entirely: by the time OUR wrapper actually executes (called
// by p5's own lifecycle once it's ready), the genuine createCanvas
// call inside the real setup() already worked normally, and
// everything referenced here afterward is safely available too.
(function () {
  var gameSetup = window.setup;
  window.setup = function () {
    gameSetup();
    var canvas = document.querySelector('#game-canvas-slot canvas') || document.querySelector('canvas');
    if (canvas && canvas.parentElement && canvas.parentElement.id !== 'game-canvas-slot') {
      document.getElementById('game-canvas-slot').appendChild(canvas);
    }
    pixelDensity(4); // keeps the canvas sharp when CSS stretches it up to 700px (desktop) or fullscreen - see every other game's shim for the same fix
  };
})();
