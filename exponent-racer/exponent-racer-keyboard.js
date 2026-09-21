// Keyboard navigation for the mouse-driven screens of Exponent Racer (menu, skill select, shop, exit confirm).
// Arrow keys jump to the nearest button in that direction (Tab / Shift+Tab cycle), Enter or Space presses the highlighted button,
// and Escape backs out (the game already handles Escape everywhere except the exit-confirm box, where it means Cancel).
// The highlighted button gets a gold ring. "Pressing" a button sends the game a real mouse click at that button's centre, so
// every screen keeps working exactly as it does with a mouse. Driving the car during a run is untouched (it already uses the keys).
(function () {
  var focusId = null, lastKey = '', active = false;

  function regions() {
    if (typeof exitConfirmPending !== 'undefined' && exitConfirmPending)
      return [{ id: 'yes', x: 60, y: 230, w: 130, h: 50 }, { id: 'no', x: 210, y: 230, w: 130, h: 50 }];
    if (gameState === 'start') {
      var r = [{ id: 'easy', x: 40, y: 200, w: 140, h: 60 }];
      if (hasUnlockedHardMode) r.push({ id: 'hard', x: 220, y: 200, w: 140, h: 60 });
      r.push({ id: 'shop', x: 130, y: 280, w: 140, h: 45 });
      return r;
    }
    if (gameState === 'skillSelect') {
      var s = [];
      for (var i = 0; i < 6; i++) if (!(gameMode === 'hard' && !unlockedHardSkills[i])) s.push({ id: 'skill' + i, x: 20, y: 75 + i * 42, w: 360, h: 36 });
      s.push({ id: 'menu', x: 40, y: 350, w: 140, h: 40 }, { id: 'go', x: 220, y: 350, w: 140, h: 40 });
      return s;
    }
    if (gameState === 'shop') {
      var out = [{ id: 'tab0', x: 60, y: 70, w: 90, h: 30 }, { id: 'tab1', x: 150, y: 70, w: 90, h: 30 }, { id: 'tab2', x: 250, y: 70, w: 90, h: 30 }];
      var items = shopData[shopTab];
      for (var k = 0; k < items.length; k++) {
        var y = 110 + k * 48 - shopScrollY;
        if (items[k].isColorPicker) {
          var step = (345 - 40) / (CLASSIC_CAR_COLORS.length - 1);
          for (var c = 0; c < CLASSIC_CAR_COLORS.length; c++) out.push({ id: 'sw' + c, x: 40 + c * step - 13, y: y + 20 - 13, w: 26, h: 26, row: k });
        } else out.push({ id: 'item' + k, x: 245, y: y + 5, w: 110, h: 30, row: k });
      }
      out.push({ id: 'back', x: 100, y: 365, w: 200, h: 30 });
      return out;
    }
    return null;
  }
  function screenKey() {
    if (typeof exitConfirmPending !== 'undefined' && exitConfirmPending) return 'exit';
    return gameState + (gameState === 'shop' ? shopTab : '');
  }
  function defaultId(key) {
    if (key === 'exit') return 'no';
    if (key === 'start') return 'easy';
    if (key === 'skillSelect') return 'go';
    if (key.indexOf('shop') === 0) return 'tab' + ['cars', 'trails', 'boosts'].indexOf(shopTab);
    return null;
  }
  function current(rs) {
    var key = screenKey();
    if (key !== lastKey) { lastKey = key; focusId = defaultId(key); }
    for (var i = 0; i < rs.length; i++) if (rs[i].id === focusId) return rs[i];
    focusId = defaultId(key);
    for (var j = 0; j < rs.length; j++) if (rs[j].id === focusId) return rs[j];
    return rs[0];
  }
  function ensureVisible(r) {                                   // scroll the Shop list so the focused row is on screen
    if (r.row === undefined || gameState !== 'shop') return;
    var lo = r.row * 48 - 200, hi = r.row * 48;
    shopScrollY = Math.max(lo, Math.min(hi, shopScrollY));
  }
  function pick(rs, cur, dx, dy) {
    var best = null, bestScore = Infinity;
    rs.forEach(function (r) {
      if (r === cur) return;
      var along = dx ? (dx > 0 ? r.x - (cur.x + cur.w) : cur.x - (r.x + r.w)) : (dy > 0 ? r.y - (cur.y + cur.h) : cur.y - (r.y + r.h));
      var cAlong = dx ? ((r.x + r.w / 2) - (cur.x + cur.w / 2)) * dx : ((r.y + r.h / 2) - (cur.y + cur.h / 2)) * dy;
      if (along < -1 || cAlong <= 2) return;
      var overlap = dx ? Math.min(cur.y + cur.h, r.y + r.h) - Math.max(cur.y, r.y) : Math.min(cur.x + cur.w, r.x + r.w) - Math.max(cur.x, r.x);
      var cross = dx ? Math.abs((r.y + r.h / 2) - (cur.y + cur.h / 2)) : Math.abs((r.x + r.w / 2) - (cur.x + cur.w / 2));
      var side = overlap > 0 ? 0 : (dx ? Math.min(Math.abs(r.y - (cur.y + cur.h)), Math.abs(cur.y - (r.y + r.h))) : Math.min(Math.abs(r.x - (cur.x + cur.w)), Math.abs(cur.x - (r.x + r.w))));
      var score = Math.max(0, along) + side * 3 + cross * 0.4 + (overlap > 0 ? 0 : 40);
      if (score < bestScore) { bestScore = score; best = r; }
    });
    return best;
  }
  function mouseEvent(type, x, y) {
    var c = document.querySelector('canvas'), b = c.getBoundingClientRect();
    return new MouseEvent(type, { bubbles: true, cancelable: true, view: window, button: 0, buttons: type === 'mouseup' ? 0 : 1,
      clientX: b.left + x / 400 * b.width, clientY: b.top + y / 400 * b.height });
  }
  function hover(r) { document.querySelector('canvas').dispatchEvent(mouseEvent('mousemove', r.x + r.w / 2, r.y + r.h / 2)); }
  function press(r) {
    var c = document.querySelector('canvas'), x = r.x + r.w / 2, y = r.y + r.h / 2;
    c.dispatchEvent(mouseEvent('mousemove', x, y));
    c.dispatchEvent(mouseEvent('mousedown', x, y));
    setTimeout(function () { c.dispatchEvent(mouseEvent('mouseup', x, y)); }, 90);      // held for a moment so the game sees it as a click
  }

  window.addEventListener('keydown', function (e) {
    var rs = null;
    try { rs = regions(); } catch (err) { rs = null; }
    if (!rs) return;
    var isExit = typeof exitConfirmPending !== 'undefined' && exitConfirmPending;
    if (e.code === 'Escape' && isExit) {                                                      // Escape = Cancel on the exit box
      e.preventDefault(); e.stopImmediatePropagation();
      for (var i = 0; i < rs.length; i++) if (rs[i].id === 'no') press(rs[i]);
      return;
    }
    var dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.code], go = e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space';
    if (!dir && !go && e.code !== 'Tab') return;
    e.preventDefault(); e.stopImmediatePropagation();                                        // the game must not ALSO react to these keys here
    var cur = current(rs);
    if (go) { if (e.repeat) return; if (!active) { active = true; return; } press(cur); return; }
    if (!active) { active = true; hover(cur); return; }                                      // first key press just shows the ring
    var next = null;
    if (e.code === 'Tab') { var idx = rs.indexOf(cur); next = rs[(idx + (e.shiftKey ? -1 : 1) + rs.length) % rs.length]; }
    else next = pick(rs, cur, dir[0], dir[1]);
    if (next) { focusId = next.id; ensureVisible(next); hover(next); }
  }, true);
  window.addEventListener('mousemove', function (e) { if (e.isTrusted) active = false; }, true);
  window.addEventListener('mousedown', function (e) { if (e.isTrusted) active = false; }, true);

  // drawn by the game's draw() wrapper (exponent-racer-hook.js) on top of everything else
  window._kbDraw = function () {
    if (!active) return;
    var rs = null; try { rs = regions(); } catch (err) { rs = null; }
    if (!rs) return;
    var r = current(rs);
    push();
    noFill(); stroke(0); strokeWeight(6); rect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 8);
    stroke('#ffd23f'); strokeWeight(3); rect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 8);
    pop();
  };
})();
