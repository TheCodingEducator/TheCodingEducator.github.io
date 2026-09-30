// On-screen joystick + GO button for phones and tablets (built by the site's shared ../site-controls.js). They feed the
// same _glKeysNow state the shim's keyDown()/keyWentDown() read, so the game code needs no changes. They take touches once
// play has started (not on the title screen).
SiteControls.create({
  joystick: true, action: 'GO', keys: _glKeysNow,
  active: function () { return typeof gameState !== 'undefined' && gameState !== 'title'; }
});
