// On-screen touch controls (joystick + action button) for mobile/touch
// devices, feeding directly into the same _glKeysNow state gamelab-shim.js
// uses for keyDown()/keyWentDown() - the game code itself needs no changes.
// Only shown on devices whose primary input is touch (not on desktop/mouse).
(function () {
  var isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  if (!isTouch) return;

  var wrap = document.createElement('div');
  wrap.id = 'mobile-controls';
  wrap.innerHTML =
    '<div id="mc-joy-base"><div id="mc-joy-stick"></div></div>' +
    '<button id="mc-action" aria-label="Action">GO</button>';
  document.body.appendChild(wrap);

  var style = document.createElement('style');
  style.textContent =
    '#mobile-controls { position: fixed; left: 0; right: 0; bottom: 0; height: 150px; z-index: 1000; pointer-events: none; }' +
    '#mc-joy-base { position: absolute; left: 24px; bottom: 24px; width: 100px; height: 100px; border-radius: 50%; background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.35); touch-action: none; pointer-events: auto; }' +
    '#mc-joy-stick { position: absolute; left: 30px; top: 30px; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.55); transition: transform 0.05s linear; }' +
    '#mc-action { position: absolute; right: 28px; bottom: 28px; width: 76px; height: 76px; border-radius: 50%; background: rgba(91,140,255,0.55); border: 2px solid rgba(255,255,255,0.5); color: #fff; font: bold 18px -apple-system, sans-serif; touch-action: none; pointer-events: auto; }' +
    '#mc-action:active { background: rgba(91,140,255,0.85); }';
  document.head.appendChild(style);

  // ---- Joystick ----
  var base = document.getElementById('mc-joy-base');
  var stick = document.getElementById('mc-joy-stick');
  var baseRadius = 50;
  var maxStickOffset = 35;
  var activeDirs = { up: false, down: false, left: false, right: false };
  var joyPointerId = null;

  function setDir(name, on) {
    if (activeDirs[name] === on) return;
    activeDirs[name] = on;
    _glKeysNow[name] = on;
  }

  function clearDirs() {
    setDir('up', false); setDir('down', false); setDir('left', false); setDir('right', false);
    stick.style.transform = 'translate(0px, 0px)';
  }

  function updateJoystick(clientX, clientY) {
    var rect = base.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = clientX - cx;
    var dy = clientY - cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > baseRadius) { dx = (dx / dist) * baseRadius; dy = (dy / dist) * baseRadius; }

    var visualScale = maxStickOffset / baseRadius;
    stick.style.transform = 'translate(' + (dx * visualScale) + 'px, ' + (dy * visualScale) + 'px)';

    var ratioX = dx / baseRadius;
    var ratioY = dy / baseRadius;
    var threshold = 0.3;
    setDir('right', ratioX > threshold);
    setDir('left', ratioX < -threshold);
    setDir('down', ratioY > threshold);
    setDir('up', ratioY < -threshold);
  }

  base.addEventListener('pointerdown', function (e) {
    joyPointerId = e.pointerId;
    base.setPointerCapture(e.pointerId);
    updateJoystick(e.clientX, e.clientY);
  });
  base.addEventListener('pointermove', function (e) {
    if (e.pointerId !== joyPointerId) return;
    updateJoystick(e.clientX, e.clientY);
  });
  function endJoy(e) {
    if (e.pointerId !== joyPointerId) return;
    joyPointerId = null;
    clearDirs();
  }
  base.addEventListener('pointerup', endJoy);
  base.addEventListener('pointercancel', endJoy);

  // ---- Action button: maps to both space and enter, matching whichever
  // the current game/mode actually reads (solo modes accept either). ----
  var actionBtn = document.getElementById('mc-action');
  function actionOn(e) { e.preventDefault(); _glKeysNow['space'] = true; _glKeysNow['enter'] = true; }
  function actionOff() { _glKeysNow['space'] = false; _glKeysNow['enter'] = false; }
  actionBtn.addEventListener('pointerdown', actionOn);
  actionBtn.addEventListener('pointerup', actionOff);
  actionBtn.addEventListener('pointercancel', actionOff);
  actionBtn.addEventListener('pointerleave', actionOff);
})();
