// On-screen controls for phones and tablets (built by the site's shared ../site-controls.js), feeding the same _glKeysNow
// state the shim's keyDown() reads. This game swaps between two control surfaces by phase:
//  - a joystick while sneaking through the maze (movement steps and auto-repeats while a direction is held), and
//  - a number pad while typing a degree answer (AIMING in the main game, or PRACTICE_PLAY in practice) - the answer box
//    is drawn on the canvas, so there's no native keyboard to fall back on.
SiteControls.create({
  joystick: true, numpad: ['backspace', 'enter'], keys: _glKeysNow,
  show: function () {
    if (typeof gameState === 'undefined') return {};
    var aiming = (gameState === STATE_PLAYING && puzzlePhase === PUZZLE_PHASE_AIMING) || (gameState === STATE_PRACTICE_PLAY && !practiceFeedbackShown);
    var sneaking = gameState === STATE_PLAYING && puzzlePhase === PUZZLE_PHASE_SNEAKING;
    return { joystick: sneaking, numpad: aiming };
  }
});
