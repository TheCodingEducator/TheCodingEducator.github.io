// On-screen numeric keypad for typing a degree answer on touch devices.
// This game's only touch-unfriendly input is typing the bank-shot
// angle - aiming/power is a natural drag gesture on the canvas itself
// and needs no on-screen control. Shown only while holePhase is
// QUESTION (see bank-shot-angle-golf-game.js), matching the same
// swap-by-game-state pattern every other mobile-controls.js on this
// site uses.
(function () {
  var isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  if (!isTouch) return;

  var wrap = document.createElement('div');
  wrap.id = 'mobile-controls';
  wrap.innerHTML =
    '<div id="mc-numpad">' +
      '<button class="mc-num" data-key="1">1</button><button class="mc-num" data-key="2">2</button><button class="mc-num" data-key="3">3</button>' +
      '<button class="mc-num" data-key="4">4</button><button class="mc-num" data-key="5">5</button><button class="mc-num" data-key="6">6</button>' +
      '<button class="mc-num" data-key="7">7</button><button class="mc-num" data-key="8">8</button><button class="mc-num" data-key="9">9</button>' +
      '<button class="mc-num" id="mc-backspace" data-key="backspace">&#9003;</button><button class="mc-num" data-key="0">0</button><button class="mc-num" id="mc-enter" data-key="enter">&#9166;</button>' +
    '</div>';
  document.body.appendChild(wrap);

  var style = document.createElement('style');
  style.textContent =
    '#mobile-controls { position: fixed; left: 0; right: 0; bottom: 0; height: 240px; z-index: 1000; pointer-events: auto; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }' +
    '#mc-numpad { display: none; grid-template-columns: repeat(3, 80px); grid-auto-rows: 56px; gap: 8px; position: absolute; left: 50%; transform: translateX(-50%); bottom: 16px; pointer-events: auto; }' +
    '#mc-numpad.mc-visible { display: grid; }' +
    '.mc-num { border-radius: 8px; border: 2px solid rgba(255,255,255,0.4); background: rgba(20,24,44,0.85); color: #fff; font: bold 22px -apple-system, sans-serif; touch-action: none; }' +
    '.mc-num:active { background: rgba(91,140,255,0.7); }' +
    '#mc-enter { background: rgba(60,255,140,0.35); }' +
    '#mc-enter:active { background: rgba(60,255,140,0.6); }' +
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
        if (typeof handleAnswerKey === 'function') handleAnswerKey(key);
      });
    })(numButtons[i]);
  }

  function refreshVisibility() {
    var show = typeof gameState !== 'undefined' && gameState === 'PLAYING' &&
      typeof holePhase !== 'undefined' && holePhase === 'QUESTION';
    numpadEl.classList.toggle('mc-visible', show);
  }

  var _mcPrevDraw = window.draw;
  window.draw = function () {
    _mcPrevDraw();
    refreshVisibility();
  };
})();
