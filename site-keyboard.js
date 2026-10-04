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

  // p5 games: let Tab reach the canvas (without drawing a ring around the whole game)
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

  // Arrow keys in a game's button menus (pause menus, Esc menus, end screens): when a button in the game has focus,
  // the arrow keys move to the nearest button in that direction, like Tab but by position. Games that handle their own
  // arrow keys call preventDefault, and this then does nothing. Text boxes, sliders and the game canvas keep their arrows.
  var DIRS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  function shown(el) {
    if (el.disabled || el.getAttribute('aria-hidden') === 'true' || el.closest('[hidden], [aria-hidden="true"]')) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    var cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05;
  }
  window.addEventListener('keydown', function (e) {
    var d = DIRS[e.key];
    if (!d || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var t = document.activeElement, slot = document.getElementById('game-canvas-slot') || document.querySelector('.game-frame');
    if (!slot) return;
    // nothing focused yet (e.g. Esc just opened a box): the first arrow press lands on that box's first button
    if (!t || t === document.body || t === document.documentElement) {
      var dlg = Array.prototype.find.call(slot.querySelectorAll('[role="dialog"], [aria-modal="true"], [id$="confirm-layer"], [id$="Confirm"], [id$="Ov"]'), shown);
      var first = dlg && Array.prototype.find.call(dlg.querySelectorAll('button, [role="button"]:not(svg *)'), shown);
      if (first) { e.preventDefault(); setTimeout(function () { if (document.activeElement === t || !document.activeElement || document.activeElement === document.body) first.focus(); }, 0); }
      return;
    }
    if (!slot.contains(t)) return;
    if (!t.matches('button, a[href], [role="button"]:not(svg *), summary') || t.closest('input, textarea, select, [contenteditable]')) return;
    // the menu the focused button belongs to: the nearest dialog / overlay / screen, else the whole game
    var box = t.closest('[role="dialog"], .overlay, [id$="Ov"], .scr, .card, section') || slot;
    var list = Array.prototype.filter.call(box.querySelectorAll('button, a[href], [role="button"]:not(svg *), summary'), function (b) { return b !== t && shown(b); });
    if (!list.length && box !== slot) list = Array.prototype.filter.call(slot.querySelectorAll('button, a[href], [role="button"]:not(svg *)'), function (b) { return b !== t && shown(b); });
    var a = t.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, best = null, bestS = Infinity;
    list.forEach(function (b) {
      var r = b.getBoundingClientRect(), dx = r.left + r.width / 2 - ax, dy = r.top + r.height / 2 - ay;
      var along = dx * d[0] + dy * d[1], across = Math.abs(dx * d[1] - dy * d[0]);
      if (along <= 4) return;                       // only buttons that are really in that direction
      var s = along + across * 2.5;
      if (s < bestS) { bestS = s; best = b; }
    });
    // buttons side by side (like "Keep playing" / "Yes, exit"): up and down step through them too
    if (!best && d[0] === 0) {
      var row = list.concat([t]).filter(function (b) { var r = b.getBoundingClientRect(); return Math.abs(r.top + r.height / 2 - ay) < Math.max(a.height, r.height) / 2; });
      row.sort(function (p, q) { return p.getBoundingClientRect().left - q.getBoundingClientRect().left; });
      if (row.length > 1) best = row[(row.indexOf(t) + (d[1] > 0 ? 1 : row.length - 1)) % row.length];
    }
    if (!best) return;
    e.preventDefault();                             // no page scroll
    // the game's own key handlers run after this one: if one of them moved the focus already, leave it there
    setTimeout(function () { if (document.activeElement === t) best.focus(); }, 0);
  });
  var st = document.createElement('style');
  st.textContent = 'canvas.p5Canvas:focus, canvas.p5Canvas:focus-visible { outline: none; }';   // no ring around the game itself
  (document.head || document.documentElement).appendChild(st);
})();
