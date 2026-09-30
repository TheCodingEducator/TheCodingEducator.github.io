// On-screen number pad for typing the bank-shot angle on phones and tablets (built by the site's shared
// ../site-controls.js). Aiming and power are a drag on the canvas itself, so this is the only touch control. Shown only
// while a hole's question is up.
SiteControls.create({
  numpad: ['backspace', 'enter'],
  onKey: function (key) { if (typeof handleAnswerKey === 'function') handleAnswerKey(key); },
  show: function () {
    return { numpad: typeof gameState !== 'undefined' && gameState === 'PLAYING' && typeof holePhase !== 'undefined' && holePhase === 'QUESTION' };
  }
});
