// Shared page layout for every game (styles in site-layout.css).
// Builds a slim top bar (All games on the left; Fullscreen, Standards and Teaching notes on the right) and moves the
// page's Common Core standards, its teaching notes and its Reset progress into pop-out panels, the way Tip the
// Scales does its Standards. With nothing beside or below it, the game fills the rest of the screen on a computer.
// Tip the Scales already has its own top bar: there it just adds a Teaching notes pop-out next to Standards.
(function () {
  var panels = [];

  function closeAll(except) {
    panels.forEach(function (p) {
      if (p.panel === except) return;
      if (!p.panel.hidden && p.onClose) p.onClose();
      p.panel.hidden = true; p.btn.setAttribute('aria-expanded', 'false');
    });
  }

  // Reset progress gets its own button and panel: the game's own reset text, and an "Erase all progress" button
  // that counts down 5 seconds (on the button itself) before it can be pressed. Pressing it runs the game's own
  // reset, without a second OK/Cancel box.
  function resetPanelNodes(reset) {
    var orig = reset.querySelector('button');
    if (!orig) return null;
    orig.style.display = 'none';
    var erase = document.createElement('button');
    erase.type = 'button'; erase.className = 'sb-erase'; erase.disabled = true;
    var timer = null;
    function label(n) { erase.textContent = n > 0 ? 'Erase all progress (' + n + ')' : 'Erase all progress'; }
    erase.startCountdown = function () {
      clearInterval(timer);
      var n = 5; erase.disabled = true; label(n);
      timer = setInterval(function () {
        n--; label(n);
        if (n <= 0) { clearInterval(timer); erase.disabled = false; }
      }, 1000);
    };
    erase.stopCountdown = function () { clearInterval(timer); erase.disabled = true; label(5); };
    erase.addEventListener('click', function () {
      if (erase.disabled) return;
      var realConfirm = window.confirm;
      window.confirm = function () { return true; };   // the countdown already did the "are you sure?"
      try { orig.click(); } finally { window.confirm = realConfirm; }
    });
    label(5);
    reset.appendChild(erase);
    return erase;
  }

  function addPanel(right, id, icon, label, nodes, tip, onOpen, onClose) {
    nodes = nodes.filter(Boolean);
    if (!nodes.length) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = tip ? 'ccss-toggle' : 'sb-toggle';
    btn.innerHTML = icon + ' <span class="sb-lbl">' + label + '</span>';   // just the icon on a narrow screen
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', label);
    btn.setAttribute('aria-controls', id);
    if (tip) {   // on Tip the Scales the page controls stay off the keyboard, like its Standards button
      btn.tabIndex = -1;
      btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
    }
    var panel = document.createElement('div');
    panel.className = 'sb-panel' + (tip ? ' sb-light' : '');
    panel.id = id; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', label);
    var close = document.createElement('button');
    close.type = 'button'; close.className = 'sb-close'; close.setAttribute('aria-label', 'Close ' + label); close.innerHTML = '&times;';
    if (tip) close.tabIndex = -1;
    close.addEventListener('click', function () { closeAll(); });
    panel.appendChild(close);
    nodes.forEach(function (n) { panel.appendChild(n); });
    document.body.appendChild(panel);
    right.appendChild(btn);
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var show = panel.hidden;
      closeAll();
      panel.hidden = !show; btn.setAttribute('aria-expanded', String(show));
      if (show && onOpen) onOpen();
    });
    panels.push({ panel: panel, btn: btn, onClose: onClose });
  }

  // Phones and tablets: a game page is one screen that never scrolls (styles in site-layout.css). The game is
  // sized to sit above the on-screen joystick / number pad, whose height goes in --mc.
  function lockPhoneScroll() {
    if (!matchMedia('(hover: none), (pointer: coarse)').matches) return;
    if (!document.querySelector('.play-area, .game-frame')) return;   // only game pages (My Stats still scrolls)
    var root = document.documentElement;
    root.classList.add('site-lock');
    var last = -1;
    function measure() {
      var mc = document.getElementById('mobile-controls');
      var h = mc && getComputedStyle(mc).display !== 'none' ? Math.round(mc.getBoundingClientRect().height) : 0;
      root.classList.toggle('site-pad', !!document.getElementById('mc-numpad'));
      if (h === last) return;
      last = h; root.style.setProperty('--mc', h + 'px');
      try { window.dispatchEvent(new Event('resize')); } catch (err) {}
    }
    measure();
    var n = 0, t = setInterval(function () { measure(); if (++n > 20) clearInterval(t); }, 250);   // the controls are added after load
    window.addEventListener('orientationchange', function () { setTimeout(measure, 300); });
    // a page that scrolled anyway (focusing a text box, the address bar sliding) snaps back to the top
    window.addEventListener('scroll', function () { if (window.scrollY || window.scrollX) window.scrollTo(0, 0); });
  }

  function setup() {
    var tipBar = document.querySelector('.site-topbar');
    var standards = document.querySelector('aside.standards-panel');
    var notes = document.querySelector('section.teaching-notes');
    var reset = document.querySelector('.reset-progress');
    var right;
    if (tipBar) {
      right = tipBar.querySelector('.topbar-right') || tipBar;
    } else {
      var bar = document.createElement('div');
      bar.className = 'site-bar';
      var back = document.querySelector('.back-link');
      if (back) bar.appendChild(back);
      right = document.createElement('div');
      right.className = 'sb-right';
      bar.appendChild(right);
      var fs = document.getElementById('fullscreen-btn');
      if (fs) right.appendChild(fs);
      document.body.insertBefore(bar, document.body.firstChild);
      document.body.classList.add('site-fit');
    }
    // the bar's own buttons show just their icons on a narrow screen, like the pop-out buttons
    [['#fullscreen-btn', 'Fullscreen'], ['.ccss-toggle', 'Standards']].forEach(function (b) {
      var el = right.querySelector(b[0]);
      if (!el || el.querySelector('.sb-lbl')) return;
      el.innerHTML = el.innerHTML.replace(b[1], '<span class="sb-lbl">' + b[1] + '</span>');
      el.setAttribute('aria-label', b[1]);
    });
    // a link to this game's teacher guide (guide.html in the game's folder)
    if (document.getElementById('game-canvas-slot') || tipBar) {
      var guide = document.createElement('a');
      guide.href = 'guide.html';
      guide.className = tipBar ? 'ccss-toggle sb-guide' : 'sb-toggle sb-guide';
      guide.innerHTML = '&#128216; <span class="sb-lbl">Teacher guide</span>';
      guide.setAttribute('aria-label', 'Teacher guide');
      if (tipBar) {   // Tip the Scales keeps its page controls off the keyboard
        guide.tabIndex = -1;
        guide.addEventListener('mousedown', function (e) { e.preventDefault(); });
      }
      right.appendChild(guide);
    }
    if (!tipBar) addPanel(right, 'sb-standards', '&#128207;', 'Standards', [standards], false);
    addPanel(right, 'sb-notes', '&#128221;', 'Teaching notes', [notes], !!tipBar);
    // this game's saved stats and badges (site-stats.js), read fresh each time it opens
    if (window.SiteStats && !/my-stats\.html$/.test(location.pathname)) {
      var statsBox = document.createElement('div'), gameKey = SiteStats.keyForPage();
      var fillStats = function () {
        statsBox.innerHTML = (gameKey ? SiteStats.gameHTML(SiteStats.read(), gameKey, '../', false)
          : '<p class="ss-empty">This game doesn\'t save stats - every round starts fresh.</p>') +
          '<a class="ss-all" href="../my-stats.html">See all my stats and badges &rarr;</a>';
      };
      fillStats();
      addPanel(right, 'sb-stats', '&#128202;', 'My stats', [statsBox], !!tipBar, fillStats);
    }
    var erase = reset ? resetPanelNodes(reset) : null;
    if (erase) addPanel(right, 'sb-reset', '&#128465;&#65039;', 'Reset progress', [reset], !!tipBar, erase.startCountdown, erase.stopCountdown);
    // a click anywhere else closes the panels
    document.addEventListener('click', function (e) {
      if (!panels.some(function (p) { return p.panel.contains(e.target) || p.btn.contains(e.target); })) closeAll();
    });
    // Esc closes an open panel (and nothing else happens in the game)
    window.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!panels.some(function (p) { return !p.panel.hidden; })) return;
      e.preventDefault(); e.stopImmediatePropagation();
      closeAll();
    }, true);
    lockPhoneScroll();
    // let the games re-measure now that the page around them changed
    try { window.dispatchEvent(new Event('resize')); } catch (err) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
