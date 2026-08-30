// On-screen numeric keypad for entering the slope-intercept equation on
// touch devices, fixed to the bottom of the viewport - see
// bank-shot-angle-golf-mobile-controls.js for the pattern this follows.
// Replaces the on-canvas KEYBOARD toggle (drawKeyboardButton/
// drawNumberRow in linear-world-cup-game.js), which exists only because
// there was no other way to type a digit on a phone; that overlay sits
// on top of part of the soccer field while open. This panel lives
// entirely outside the canvas instead, so nothing on screen is ever
// covered by it. Shown only while screenState is "input" (see
// linear-world-cup-game.js), matching the same swap-by-game-state
// pattern every other mobile-controls.js on this site uses.
(function () {
  var isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  if (!isTouch) return;

  // Tells linear-world-cup-game.js's drawKeyboardButton() to stay hidden
  // and keep keyboardOpen false - this panel is the only numpad a touch
  // player needs, so the on-canvas one (which eats into the field) would
  // just be redundant clutter.
  window.mobileNumpadActive = true;

  var wrap = document.createElement('div');
  wrap.id = 'mobile-controls';
  wrap.innerHTML =
    '<div id="mc-numpad">' +
      '<button class="mc-num" data-key="1">1</button><button class="mc-num" data-key="2">2</button><button class="mc-num" data-key="3">3</button>' +
      '<button class="mc-num" data-key="4">4</button><button class="mc-num" data-key="5">5</button><button class="mc-num" data-key="6">6</button>' +
      '<button class="mc-num" data-key="7">7</button><button class="mc-num" data-key="8">8</button><button class="mc-num" data-key="9">9</button>' +
      '<button class="mc-num" id="mc-sign" data-key="sign">+/&minus;</button><button class="mc-num" data-key="0">0</button><button class="mc-num" id="mc-backspace" data-key="backspace">&#9003;</button>' +
    '</div>';
  document.body.appendChild(wrap);

  var style = document.createElement('style');
  style.textContent =
    // pointer-events starts at none, not auto - see
    // bank-shot-angle-golf-mobile-controls.js for the full reasoning:
    // an always-on "auto" here would permanently swallow every tap and
    // scroll gesture in this full-width bottom strip, including on the
    // standards panel/teaching notes once scrolled into it, even on
    // screens where the numpad itself isn't shown. .mc-active (toggled
    // alongside mc-visible in refreshVisibility below) re-enables it
    // only while the numpad is actually up.
    '#mobile-controls { position: fixed; left: 0; right: 0; bottom: 0; height: 240px; z-index: 1000; pointer-events: none; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }' +
    '#mobile-controls.mc-active { pointer-events: auto; }' +
    '#mc-numpad { display: none; grid-template-columns: repeat(3, 80px); grid-auto-rows: 56px; gap: 8px; position: absolute; left: 50%; transform: translateX(-50%); bottom: 16px; pointer-events: auto; }' +
    '#mc-numpad.mc-visible { display: grid; }' +
    '.mc-num { border-radius: 8px; border: 2px solid rgba(255,255,255,0.4); background: rgba(20,24,44,0.85); color: #fff; font: bold 22px -apple-system, sans-serif; touch-action: none; }' +
    '.mc-num:active { background: rgba(91,140,255,0.7); }' +
    '#mc-sign { background: rgba(255,90,90,0.25); font-size: 18px; }' +
    '#mc-sign:active { background: rgba(255,90,90,0.55); }' +
    '#mc-backspace { background: rgba(255,90,90,0.25); }' +
    '#mc-backspace:active { background: rgba(255,90,90,0.55); }';
  document.head.appendChild(style);

  var numpadEl = document.getElementById('mc-numpad');
  var numButtons = document.querySelectorAll('#mc-numpad .mc-num');
  for (var i = 0; i < numButtons.length; i++) {
    (function (btn) {
      var key = btn.getAttribute('data-key');
      btn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        if (key === 'backspace') { if (typeof backspace === 'function') backspace(); }
        else if (key === 'sign') { if (typeof toggleSign === 'function') toggleSign(); }
        else if (typeof appendChar === 'function') appendChar(key);
      });
    })(numButtons[i]);
  }

  function refreshVisibility() {
    var show = typeof screenState !== 'undefined' && screenState === 'input';
    numpadEl.classList.toggle('mc-visible', show);
    wrap.classList.toggle('mc-active', show);
  }

  var _mcPrevDraw = window.draw;
  window.draw = function () {
    _mcPrevDraw();
    refreshVisibility();
  };
})();
