// On-screen touch controls for mobile/touch devices, feeding directly
// into the same _glKeysNow state laser-heist-shim.js's keyDown() reads
// from - the game code itself needs no changes. Only shown on devices
// whose primary input is touch (not on desktop/mouse).
//
// This game needs two DIFFERENT control surfaces depending on what
// phase it's in, unlike every other game on this site:
//  - A directional joystick during the maze sneak phase (arrow keys/
//    WASD). Movement is grid-stepped and auto-repeats while a
//    direction is held (see the game's own tryStartRobberStep()
//    comments), so a continuously-held _glKeysNow flag - exactly what
//    the joystick already does for every other game - works here
//    without any special handling.
//  - An on-screen number pad while typing a degree answer (AIMING in
//    the main game, or PRACTICE_PLAY in practice mode) - this game
//    draws its answer box directly on the canvas rather than using a
//    real HTML <input>, so there's no native mobile keyboard to fall
//    back on the way there is on, say, Tip the Scales' real <input>.
// Both are hidden/shown every frame based on the game's own state
// globals (window.gameState/puzzlePhase), so switching between aiming
// and sneaking swaps the visible control surface automatically.
(function () {
  var isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  if (!isTouch) return;

  var wrap = document.createElement('div');
  wrap.id = 'mobile-controls';
  wrap.innerHTML =
    '<div id="mc-joy-base"><div id="mc-joy-stick"></div></div>' +
    '<div id="mc-numpad">' +
      '<button class="mc-num" data-key="1">1</button><button class="mc-num" data-key="2">2</button><button class="mc-num" data-key="3">3</button>' +
      '<button class="mc-num" data-key="4">4</button><button class="mc-num" data-key="5">5</button><button class="mc-num" data-key="6">6</button>' +
      '<button class="mc-num" data-key="7">7</button><button class="mc-num" data-key="8">8</button><button class="mc-num" data-key="9">9</button>' +
      '<button class="mc-num" data-key="backspace" id="mc-backspace">&#9003;</button><button class="mc-num" data-key="0">0</button><button class="mc-num" id="mc-enter" data-key="enter">&#9166;</button>' +
    '</div>';
  document.body.appendChild(wrap);

  var style = document.createElement('style');
  style.textContent =
    '#mobile-controls { position: fixed; left: 0; right: 0; bottom: 0; z-index: 1000; pointer-events: none; }' +
    '#mc-joy-base { position: absolute; left: 24px; bottom: 24px; width: 100px; height: 100px; border-radius: 50%; background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.35); touch-action: none; pointer-events: auto; display: none; }' +
    '#mc-joy-stick { position: absolute; left: 30px; top: 30px; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.55); transition: transform 0.05s linear; }' +
    '#mc-numpad { display: none; grid-template-columns: repeat(3, 64px); grid-auto-rows: 44px; gap: 6px; position: absolute; left: 50%; transform: translateX(-50%); bottom: 12px; pointer-events: auto; }' +
    '#mc-numpad.mc-visible { display: grid; }' +
    '#mc-joy-base.mc-visible { display: block; }' +
    '.mc-num { border-radius: 8px; border: 2px solid rgba(255,255,255,0.4); background: rgba(20,24,44,0.85); color: #fff; font: bold 18px -apple-system, sans-serif; touch-action: none; }' +
    '.mc-num:active { background: rgba(91,140,255,0.7); }' +
    '#mc-enter { background: rgba(60,255,140,0.35); }' +
    '#mc-enter:active { background: rgba(60,255,140,0.6); }' +
    '#mc-backspace { background: rgba(255,90,90,0.25); }' +
    '#mc-backspace:active { background: rgba(255,90,90,0.55); }';
  document.head.appendChild(style);

  // ---- Joystick (sneak phase movement) ----
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

  // ---- Number pad (typing a degree answer) ----
  // Each button briefly sets its key "down" in _glKeysNow on press and
  // clears it on release/cancel - a plain tap, exactly like a quick
  // physical key press - which is all handleAnswerTyping()'s own
  // keyEdge() polling needs to register one digit per tap.
  var numButtons = document.querySelectorAll('#mc-numpad .mc-num');
  for (var i = 0; i < numButtons.length; i++) {
    (function (btn) {
      var key = btn.getAttribute('data-key');
      function on(e) { e.preventDefault(); _glKeysNow[key] = true; }
      function off() { _glKeysNow[key] = false; }
      btn.addEventListener('pointerdown', on);
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointercancel', off);
      btn.addEventListener('pointerleave', off);
    })(numButtons[i]);
  }

  // ---- Swap which control surface is visible based on game state ----
  // Tied to the game's own draw() (wrapping whatever laser-heist-hook.js
  // already wrapped it into, chaining after that) rather than a separate
  // requestAnimationFrame loop - draw() is guaranteed to run every real
  // frame during actual gameplay, whereas an independent rAF loop can
  // start silently missing updates if the tab is backgrounded/throttled
  // (browsers deprioritize rAF in hidden tabs) even though the game
  // itself might still be running via other means.
  var numpadEl = document.getElementById('mc-numpad');
  function isAimingForAnswer() {
    if (typeof gameState === 'undefined') return false;
    if (gameState === STATE_PLAYING && puzzlePhase === PUZZLE_PHASE_AIMING) return true;
    if (gameState === STATE_PRACTICE_PLAY && !practiceFeedbackShown) return true;
    return false;
  }
  function isSneaking() {
    return typeof gameState !== 'undefined' && gameState === STATE_PLAYING && puzzlePhase === PUZZLE_PHASE_SNEAKING;
  }
  function refreshVisibility() {
    var showNumpad = isAimingForAnswer();
    var showJoy = isSneaking();
    numpadEl.classList.toggle('mc-visible', showNumpad);
    base.classList.toggle('mc-visible', showJoy);
    if (!showJoy) clearDirs();
  }

  var _mcPrevDraw = window.draw;
  window.draw = function () {
    _mcPrevDraw();
    refreshVisibility();
  };
})();
