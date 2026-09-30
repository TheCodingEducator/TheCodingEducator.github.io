// Shared on-screen touch controls (window.SiteControls) for the games that need a joystick, a GO button or a number pad
// on phones and tablets. Only created on touch devices. The bar is fixed to the bottom of the screen, and site-layout.js
// keeps the game above it (or beside it, sideways) and carries it into fullscreen.
//
//   SiteControls.create({
//     joystick: true,                      // a joystick that holds the arrow keys up / down / left / right
//     action: 'GO',                        // a round button that holds Space and Enter while pressed
//     numpad: ['backspace', 'enter'],      // a 1-9 / 0 pad; the two keys beside the 0 (any of backspace, enter, sign)
//     keys: _glKeysNow,                    // where held keys are written (the game reads them with keyDown())
//     onKey: function (key) {},            // optional: number pad taps call this instead of holding a key
//     active: function () { return true; },// optional: whether the controls are steering the game right now
//     menus: true,                         // optional: when not active(), the joystick and GO button work the menus
//     show: function () { return { joystick: true, numpad: false }; }   // optional: which parts are showing right now
//   });
//
// active() and show() are checked every frame (after the game's own draw()). Without show(), every part is always shown.
// With menus: true, on the game's menu screens the joystick presses the arrow keys and GO presses Enter - one press per
// push, exactly like a keyboard - so students can move through the menus the same way they do with arrow keys.
(function () {
  var isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);

  var CSS =
    // The bar spans the full width but takes no touches itself (pointer-events: none), so it never swallows taps meant for
    // the page; only the controls inside it do, and only while .mc-active is on. z-index 10001 keeps it above a game box
    // in CSS fullscreen (z-index 9999).
    '#mobile-controls { position: fixed; left: 0; right: 0; bottom: 0; z-index: 10001; pointer-events: none; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }' +
    '#mobile-controls:not(.mc-active) #mc-joy-base, #mobile-controls:not(.mc-active) #mc-action, #mobile-controls:not(.mc-active) #mc-numpad { pointer-events: none; }' +
    '#mc-joy-base { position: absolute; left: 20px; bottom: 24px; width: 130px; height: 130px; border-radius: 50%; background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.35); touch-action: none; pointer-events: auto; }' +
    '#mc-joy-stick { position: absolute; left: 39px; top: 39px; width: 52px; height: 52px; border-radius: 50%; background: rgba(255,255,255,0.55); transition: transform 0.05s linear; }' +
    '#mc-action { position: absolute; right: 24px; bottom: 24px; width: 100px; height: 100px; border-radius: 50%; background: rgba(91,140,255,0.55); border: 2px solid rgba(255,255,255,0.5); color: #fff; font: bold 22px -apple-system, sans-serif; touch-action: none; pointer-events: auto; }' +
    '#mc-action:active { background: rgba(91,140,255,0.85); }' +
    // 4 rows of 56px + 3 gaps of 8px = 248px, 16px off the bottom: the bar is 280px tall whenever there's a pad
    '#mc-numpad { display: grid; grid-template-columns: repeat(3, 80px); grid-auto-rows: 56px; gap: 8px; position: absolute; left: 50%; transform: translateX(-50%); bottom: 16px; pointer-events: auto; }' +
    '#mobile-controls .mc-hide { display: none !important; }' +
    '.mc-num { border-radius: 8px; border: 2px solid rgba(255,255,255,0.4); background: rgba(20,24,44,0.85); color: #fff; font: bold 22px -apple-system, sans-serif; touch-action: none; }' +
    '.mc-num:active { background: rgba(91,140,255,0.7); }' +
    '#mc-enter { background: rgba(60,255,140,0.35); }' +
    '#mc-enter:active { background: rgba(60,255,140,0.6); }' +
    '#mc-backspace, #mc-sign { background: rgba(255,90,90,0.25); }' +
    '#mc-backspace:active, #mc-sign:active { background: rgba(255,90,90,0.55); }' +
    '#mc-sign { font-size: 18px; }';

  var LABEL = { backspace: '&#9003;', enter: '&#9166;', sign: '+/&minus;' };

  function create(o) {
    if (!isTouch) return null;
    var keys = o.keys || {};
    var wrap = document.createElement('div');
    wrap.id = 'mobile-controls';
    wrap.style.height = (o.numpad ? 280 : 190) + 'px';
    var html = '';
    if (o.joystick) html += '<div id="mc-joy-base"><div id="mc-joy-stick"></div></div>';
    if (o.action) html += '<button id="mc-action" aria-label="Action">' + o.action + '</button>';
    if (o.numpad) {
      var k = ['1', '2', '3', '4', '5', '6', '7', '8', '9', o.numpad[0], '0', o.numpad[1]];
      html += '<div id="mc-numpad">' + k.map(function (key) {
        return '<button class="mc-num"' + (LABEL[key] ? ' id="mc-' + key + '"' : '') + ' data-key="' + key + '">' + (LABEL[key] || key) + '</button>';
      }).join('') + '</div>';
    }
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
    // Touches on these controls belong to the controls only: the game never sees them as a mouse or touch on the page.
    // (p5 games listen on the whole window, so a thumb on the joystick used to move the game's pointer - taking the
    // hover and the keyboard highlight away from the menu button GO was about to press.) Cancelling touchstart also
    // stops the browser from sending its made-up mouse events after the touch.
    ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel',
     'mousedown', 'mousemove', 'mouseup', 'click'].forEach(function (ev) {
      wrap.addEventListener(ev, function (e) {
        e.stopPropagation();
        if (ev === 'touchstart' || ev === 'touchmove') e.preventDefault();
      }, { passive: false });
    });
    if (!document.getElementById('mc-style')) {
      var style = document.createElement('style'); style.id = 'mc-style'; style.textContent = CSS; document.head.appendChild(style);
    }

    // ---- Joystick: holds the arrow keys while pushed past 30% of the way out ----
    var base = document.getElementById('mc-joy-base'), stick = document.getElementById('mc-joy-stick');
    var dirs = { up: false, down: false, left: false, right: false }, joyId = null, R = 65, MAX = 46;
    var menuMode = false;   // on a menu screen (menus: true): send real key presses instead of holding keys for the game
    var ARROW = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
    function press(key, down) {
      document.body.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: key, code: key, bubbles: true, cancelable: true }));
    }
    function setDir(name, on) {
      if (dirs[name] === on) return;
      dirs[name] = on;
      if (menuMode) press(ARROW[name], on); else keys[name] = on;
    }
    function clearDirs() {
      setDir('up', false); setDir('down', false); setDir('left', false); setDir('right', false);
      if (stick) stick.style.transform = 'translate(0px, 0px)';
    }
    function moveJoy(x, y) {
      var r = base.getBoundingClientRect();
      var dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2), d = Math.sqrt(dx * dx + dy * dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      stick.style.transform = 'translate(' + (dx * MAX / R) + 'px, ' + (dy * MAX / R) + 'px)';
      setDir('right', dx / R > 0.3); setDir('left', dx / R < -0.3); setDir('down', dy / R > 0.3); setDir('up', dy / R < -0.3);
    }
    if (base) {
      base.addEventListener('pointerdown', function (e) { joyId = e.pointerId; base.setPointerCapture(e.pointerId); moveJoy(e.clientX, e.clientY); });
      base.addEventListener('pointermove', function (e) { if (e.pointerId === joyId) moveJoy(e.clientX, e.clientY); });
      var endJoy = function (e) { if (e.pointerId === joyId) { joyId = null; clearDirs(); } };
      base.addEventListener('pointerup', endJoy);
      base.addEventListener('pointercancel', endJoy);
    }

    // ---- GO button: holds Space and Enter (whichever the game reads) ----
    var act = document.getElementById('mc-action');
    if (act) {
      var actDown = false, actPressed = false;   // actPressed: this press went out as a real Enter key (menu screen)
      var actOn = function (e) {
        e.preventDefault(); actDown = true; actPressed = menuMode;
        if (menuMode) press('Enter', true); else { keys.space = true; keys.enter = true; }
      };
      var actOff = function () {
        if (!actDown) return; actDown = false;
        if (actPressed) press('Enter', false);   // even if GO just started the game and the screen is no longer a menu
        keys.space = false; keys.enter = false;
      };
      act.addEventListener('pointerdown', actOn);
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { act.addEventListener(ev, actOff); });
    }

    // ---- Number pad: each tap either calls onKey(key) or holds the key down like a quick physical key press ----
    var pad = document.getElementById('mc-numpad');
    if (pad) Array.prototype.forEach.call(pad.querySelectorAll('.mc-num'), function (btn) {
      var key = btn.getAttribute('data-key');
      btn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        if (o.onKey) o.onKey(key); else keys[key] = true;
      });
      if (!o.onKey) ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { btn.addEventListener(ev, function () { keys[key] = false; }); });
    });

    // ---- Every frame: which parts are showing, and whether they take touches ----
    function refresh() {
      var s = o.show ? o.show() : null;
      var joyOn = !s || !!s.joystick, padOn = !s || !!s.numpad;
      if (base) base.classList.toggle('mc-hide', !joyOn);
      if (pad) pad.classList.toggle('mc-hide', !padOn);
      var on = o.active ? !!o.active() : (s ? (s.joystick || s.numpad || s.action) : true);
      var menu = !on && !!o.menus;
      if (menu !== menuMode) { clearDirs(); menuMode = menu; }   // let go of everything when switching between game and menus
      wrap.classList.toggle('mc-active', !!on || menu);
      if ((!on && !menu) || !joyOn) clearDirs();
    }
    var prevDraw = window.draw;
    if (typeof prevDraw === 'function') window.draw = function () { try { prevDraw(); } finally { refresh(); } };
    else (function loop() { refresh(); requestAnimationFrame(loop); })();
    refresh();
    return { wrap: wrap, refresh: refresh };
  }

  window.SiteControls = { create: create, isTouch: !!isTouch };
})();
