// Phones and tablets: big coin buttons under the game, or beside it when the phone is sideways (the coins drawn in the game are small for a finger), plus Undo and
// Clear. Each button presses the same key a keyboard player would (1-4, U, C), so the game needs no changes. The bar shows
// only while a round is being played, and only the coins allowed in this round. It uses the id mobile-controls, so the
// page's layout keeps the game above it and fullscreen takes it along (see ../site-layout.js).
(function () {
  if (!(window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches)) return;
  var T = window.tl || function (en) { return en; };
  var COINS = [
    { id: 'penny', key: '1', label: '1&cent;', name: T('Penny', 'Centavo'), bg: '#c97a3d', size: 58 },
    { id: 'nickel', key: '2', label: '5&cent;', name: T('Nickel', 'Níquel'), bg: '#b8bec6', size: 66 },
    { id: 'dime', key: '3', label: '10&cent;', name: T('Dime', 'Dime'), bg: '#cfd4da', size: 54 },
    { id: 'quarter', key: '4', label: '25&cent;', name: T('Quarter', 'Cuarto'), bg: '#d9dde2', size: 72 }
  ];
  var css = document.createElement('style');
  css.textContent =
    '#mobile-controls { position: fixed; left: 0; right: 0; bottom: 0; height: 150px; z-index: 10001; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; touch-action: manipulation; user-select: none; -webkit-user-select: none; }' +
    '#mobile-controls.off { visibility: hidden; }' +
    '#pb-coins { display: flex; gap: 12px; align-items: flex-end; }' +
    '#pb-coins button { display: flex; flex-direction: column; align-items: center; gap: 2px; background: none; border: 0; padding: 0; color: #e2e8f0; font: 700 12px sans-serif; }' +
    '#pb-coins .c { border-radius: 50%; border: 3px solid rgba(0,0,0,0.35); color: #1f2937; font: 900 17px sans-serif; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 0 rgba(0,0,0,0.35); }' +
    '#pb-coins button:active .c { transform: translateY(2px); box-shadow: 0 1px 0 rgba(0,0,0,0.35); }' +
    '#pb-coins button[hidden] { display: none; }' +
    '#pb-tools { display: flex; gap: 12px; }' +
    '#pb-tools button { min-width: 110px; height: 40px; border-radius: 10px; border: 0; color: #fff; font: 800 16px sans-serif; }' +
    // a phone held sideways: the game is a square in the middle, so the coins go in the empty strips beside it (penny and
    // nickel, then Undo, on the left; dime and quarter, then Clear, on the right) instead of over the bottom of the game
    '@media (orientation: landscape) and (max-height: 500px) {' +
    ' #mobile-controls { top: 48px; height: auto; display: grid; grid-template-columns: auto 1fr auto; grid-template-rows: 1fr 1fr auto; align-items: center; justify-items: center; padding: 6px 18px 10px; gap: 6px 0; pointer-events: none; }' +
    ' #pb-coins, #pb-tools { display: contents; }' +
    ' #mobile-controls button { pointer-events: auto; }' +
    ' #pb-coins [data-coin="penny"] { grid-column: 1; grid-row: 1; } #pb-coins [data-coin="nickel"] { grid-column: 1; grid-row: 2; }' +
    ' #pb-coins [data-coin="dime"] { grid-column: 3; grid-row: 1; } #pb-coins [data-coin="quarter"] { grid-column: 3; grid-row: 2; }' +
    ' #pb-tools [data-key="u"] { grid-column: 1; grid-row: 3; } #pb-tools [data-key="c"] { grid-column: 3; grid-row: 3; }' +
    '}';
  document.head.appendChild(css);
  var bar = document.createElement('div');
  bar.id = 'mobile-controls'; bar.className = 'off';
  bar.innerHTML = '<div id="pb-coins">' + COINS.map(function (c) {
    return '<button type="button" data-key="' + c.key + '" data-coin="' + c.id + '" aria-label="' + c.name + '"><span class="c" style="width:' + c.size + 'px;height:' + c.size + 'px;background:' + c.bg + '">' + c.label + '</span>' + c.name + '</button>';
  }).join('') + '</div>' +
    '<div id="pb-tools"><button type="button" data-key="u" style="background:#f59e0b">' + T('&#8630; Undo', '&#8630; Quitar') + '</button>' +
    '<button type="button" data-key="c" style="background:#dc2626">' + T('Clear', 'Borrar') + '</button></div>';
  document.body.appendChild(bar);
  Array.prototype.forEach.call(bar.querySelectorAll('button'), function (b) {
    b.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var key = b.getAttribute('data-key');
      window.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true }));
      setTimeout(function () { window.dispatchEvent(new KeyboardEvent('keyup', { key: key, bubbles: true })); }, 80);
    });
  });
  // show the bar only during a round, with only the coins that round allows
  setInterval(function () {
    var playing = typeof gameState !== 'undefined' && gameState === 'game';
    bar.classList.toggle('off', !playing);
    if (playing && typeof allowedCoins !== 'undefined') {
      Array.prototype.forEach.call(bar.querySelectorAll('[data-coin]'), function (b) { b.hidden = allowedCoins.indexOf(b.getAttribute('data-coin')) < 0; });
    }
  }, 200);
})();
