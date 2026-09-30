// On-screen joystick + GO button for phones and tablets (built by the site's shared ../site-controls.js). They feed the
// same _glKeysNow state the shim's keyDown()/keyWentDown() read, so the game code needs no changes. They steer once play
// has started; on the title screen the joystick moves through the choices and GO picks one, like the arrow keys and Enter.
SiteControls.create({
  joystick: true, action: 'GO', keys: _glKeysNow, menus: true,   // on menu screens: joystick = arrow keys, GO = Enter
  active: function () { return typeof gameState !== 'undefined' && gameState !== 'title'; }
});
