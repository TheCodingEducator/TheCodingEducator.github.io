// Shared page layout for every game (styles in site-layout.css).
// Builds a slim top bar (All games on the left; Fullscreen, Standards and Teaching notes on the right) and moves the
// page's Common Core standards and its teaching notes (with Reset progress) into pop-out panels, the way Tip the
// Scales does its Standards. With nothing beside or below it, the game fills the rest of the screen on a computer.
// Tip the Scales already has its own top bar: there it just adds a Teaching notes pop-out next to Standards.
(function () {
  var panels = [];

  function closeAll(except) {
    panels.forEach(function (p) {
      if (p.panel === except) return;
      p.panel.hidden = true; p.btn.setAttribute('aria-expanded', 'false');
    });
  }

  function addPanel(right, id, icon, label, nodes, tip) {
    nodes = nodes.filter(Boolean);
    if (!nodes.length) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = tip ? 'ccss-toggle' : 'sb-toggle';
    btn.innerHTML = icon + ' ' + label;
    btn.setAttribute('aria-expanded', 'false');
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
    });
    panels.push({ panel: panel, btn: btn });
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
    if (!tipBar) addPanel(right, 'sb-standards', '&#128207;', 'Standards', [standards], false);
    addPanel(right, 'sb-notes', '&#128221;', 'Teaching notes', [notes, reset], !!tipBar);
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
    // let the games re-measure now that the page around them changed
    try { window.dispatchEvent(new Event('resize')); } catch (err) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
