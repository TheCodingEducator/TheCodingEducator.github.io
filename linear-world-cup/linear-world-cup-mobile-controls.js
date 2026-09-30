// On-screen number pad for entering the slope-intercept equation on phones and tablets (built by the site's shared
// ../site-controls.js). It sits below the field, so it replaces the game's own on-canvas KEYBOARD toggle, which covered
// part of the field. Shown only while an equation is being typed.
if (SiteControls.isTouch) {
  // tells drawKeyboardButton() in linear-world-cup-game.js to keep its on-canvas keypad hidden
  window.mobileNumpadActive = true;
  SiteControls.create({
    numpad: ['sign', 'backspace'],
    onKey: function (key) {
      if (key === 'backspace') { if (typeof backspace === 'function') backspace(); }
      else if (key === 'sign') { if (typeof toggleSign === 'function') toggleSign(); }
      else if (typeof appendChar === 'function') appendChar(key);
    },
    show: function () {
      return { numpad: typeof screenState !== 'undefined' && screenState === 'input' && !(typeof exitConfirmPending !== 'undefined' && exitConfirmPending) };
    }
  });
}
