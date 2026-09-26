// Keyboard-only play, shared by every game page.
// Every game can be played without a mouse (the mouse still works too). This file keeps the page itself usable
// from the keyboard around the game:
//   - The page's own controls (All games, Fullscreen, the standards panel, teaching notes, Reset progress) keep
//     their normal keys. isPageControlKey(e) tells a game's key handler to leave such a key alone, so Enter on
//     "All games" follows the link instead of also pressing something in the game.
//   - A game drawn on a canvas becomes a Tab stop, so Tab can move from the page's controls back into the game.
(function () {
  var CHROME = '.back-link, .site-back-link, .fullscreen-btn, .pseudo-fullscreen-exit-btn, .standards-panel, .teaching-notes, .reset-progress';
  var INTERACTIVE = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"]), [contenteditable]';

  // true when the key is aimed at one of the page's controls rather than at the game
  window.isPageControlKey = function (e) {
    var t = e && e.target;
    if (!t || !t.closest || t === document.body || t === document.documentElement) return false;
    if (!t.closest(INTERACTIVE)) return false;
    if (t.closest(CHROME)) return true;
    var slot = document.getElementById('game-canvas-slot');
    return !!(slot && !slot.contains(t));   // anything interactive outside the game's own area
  };

  // true when the game itself has the keyboard: nothing focused, or the game's canvas focused
  window.gameHasKeyboard = function (e) {
    var t = e && e.target;
    return !t || t === document.body || t === document.documentElement || t.tagName === 'CANVAS';
  };

  // p5 games: let Tab reach the canvas, and show a ring when it has keyboard focus
  function tabbableCanvas() {
    var cs = document.querySelectorAll('canvas.p5Canvas');
    for (var i = 0; i < cs.length; i++) {
      if (!cs[i].hasAttribute('tabindex')) {
        cs[i].setAttribute('tabindex', '0');
        cs[i].setAttribute('aria-label', cs[i].getAttribute('aria-label') || 'Game - use the keyboard to play');
      }
    }
    return cs.length > 0;
  }
  var tries = 0;
  (function wait() { if (!tabbableCanvas() && tries++ < 40) setTimeout(wait, 250); })();
  var st = document.createElement('style');
  st.textContent = 'canvas.p5Canvas:focus { outline: none; } canvas.p5Canvas:focus-visible { outline: 3px solid #ffd23f; outline-offset: 3px; }';
  (document.head || document.documentElement).appendChild(st);
})();
