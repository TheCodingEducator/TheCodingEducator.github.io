// Shared Fullscreen button for every game page. The page provides a #fullscreen-btn, a #pseudo-fullscreen-exit-btn and
// the game box (#game-canvas-slot, or .game-frame on Tip the Scales); each game's own CSS decides how the game is laid out
// in fullscreen. Load this at the end of <body>, after the buttons.
(function () {
  function box() { return document.getElementById('game-canvas-slot') || document.querySelector('.game-frame'); }
  function T(en, es) { return typeof tl === 'function' ? tl(en, es) : en; }
  function realFs() { return document.fullscreenElement || document.webkitFullscreenElement; }

  function enterPseudoFullscreen() {
    box().classList.add('pseudo-fullscreen');
    document.getElementById('pseudo-fullscreen-exit-btn').classList.add('visible');
    updateFullscreenBtn();
  }
  function exitPseudoFullscreen() {
    box().classList.remove('pseudo-fullscreen');
    document.getElementById('pseudo-fullscreen-exit-btn').classList.remove('visible');
    updateFullscreenBtn();
  }
  function toggleFullscreen() {
    var el = box();
    if (!realFs() && !el.classList.contains('pseudo-fullscreen')) {
      // Some devices (notably managed school devices) expose requestFullscreen but block it, so it throws, rejects, or
      // silently does nothing. The check after the call falls back to a CSS-only fullscreen, so the button always works.
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      var launched = false;
      if (req && document.fullscreenEnabled !== false) {
        try {
          var result = req.call(el);
          launched = true;
          if (result && typeof result.catch === 'function') result.catch(function () { enterPseudoFullscreen(); });
        } catch (e) { launched = false; }
      }
      if (!launched) { enterPseudoFullscreen(); return; }
      setTimeout(function () {
        if (!realFs() && !el.classList.contains('pseudo-fullscreen')) enterPseudoFullscreen();
      }, 350);
    } else if (el.classList.contains('pseudo-fullscreen')) {
      exitPseudoFullscreen();
    } else {
      var exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
    }
  }
  function exitFullscreenAny() {
    if (box().classList.contains('pseudo-fullscreen')) { exitPseudoFullscreen(); return; }
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) exit.call(document);
  }
  // the Exit Fullscreen button lives inside the game box, so it's still there in real fullscreen
  function syncExitBtn(isFs) {
    var eb = document.getElementById('pseudo-fullscreen-exit-btn'), el = box();
    if (!eb || !el) return;
    if (isFs) { if (eb.parentNode !== el) el.appendChild(eb); eb.classList.add('visible'); }
    else eb.classList.remove('visible');
  }
  function updateFullscreenBtn() {
    var btn = document.getElementById('fullscreen-btn'), el = box();
    var isFs = !!(realFs() || (el && el.classList.contains('pseudo-fullscreen')));
    if (btn) btn.innerHTML = isFs ? T('&#10021; Exit Fullscreen', '&#10021; Salir de pantalla completa') : T('&#10021; Fullscreen', '&#10021; Pantalla completa');
    syncExitBtn(isFs);
  }

  window.enterPseudoFullscreen = enterPseudoFullscreen;
  window.exitPseudoFullscreen = exitPseudoFullscreen;
  window.toggleFullscreen = toggleFullscreen;
  window.exitFullscreenAny = exitFullscreenAny;
  window.updateFullscreenBtn = updateFullscreenBtn;

  document.addEventListener('fullscreenchange', updateFullscreenBtn);
  document.addEventListener('webkitfullscreenchange', updateFullscreenBtn);
  // addEventListener rather than inline onclick= attributes: some school content filters block inline handlers
  var fb = document.getElementById('fullscreen-btn'), xb = document.getElementById('pseudo-fullscreen-exit-btn');
  if (fb) fb.addEventListener('click', toggleFullscreen);
  if (xb) xb.addEventListener('click', exitFullscreenAny);
  // Escape must not leave fullscreen (in the games it opens the pause menu): while in real fullscreen, ask the browser
  // (Chrome/Edge Keyboard Lock) to hand Escape to the page. Players leave with the Exit Fullscreen button, and the
  // browser still allows holding Escape for about 2 seconds as a safety exit.
  document.addEventListener('fullscreenchange', function () {
    try {
      if (!navigator.keyboard) return;
      if (document.fullscreenElement) navigator.keyboard.lock(['Escape']).catch(function () {});
      else navigator.keyboard.unlock();
    } catch (e) {}
  });
})();
