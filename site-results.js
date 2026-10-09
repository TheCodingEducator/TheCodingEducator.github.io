// Results by skill, shared by the games (window.SiteResults).
//
// A game names its skills once, records every answer as right or wrong under its skill, and shows the results when a
// game or round ends: for each skill practiced, how many answers, how many right, and the percent right, with a word
// and a color band (80% and up "Strong", 40-79% "Growing", under 40% "Keep practicing"). Nothing is saved or sent
// anywhere: the counts last only while the page is open, and start over with each new game.
//
//   SiteResults.setup([{ id: 'comp', en: 'Complementary angles', es: 'Ángulos complementarios' }, ...])
//   SiteResults.reset()                      a new game: start counting again
//   SiteResults.record('comp', true)         one answer: its skill, and whether it was right
//   SiteResults.show({ title, onClose })     open the results panel (nothing happens if nothing was answered yet)
(function () {
  var tl = window.tl || function (en) { return en; };
  var skills = [], counts = {}, panel = null, lastFocus = null;

  function setup(list) { skills = list || []; reset(); }
  function reset() { counts = {}; skills.forEach(function (s) { counts[s.id] = { n: 0, right: 0 }; }); }
  function record(id, right) {
    if (!counts[id]) counts[id] = { n: 0, right: 0 };
    counts[id].n++; if (right) counts[id].right++;
  }
  function total() { var n = 0, r = 0; for (var k in counts) { n += counts[k].n; r += counts[k].right; } return { n: n, right: r }; }
  function nameOf(id) {
    for (var i = 0; i < skills.length; i++) if (skills[i].id === id) return tl(skills[i].en, skills[i].es || skills[i].en);
    return id;
  }
  function band(p) {
    return p >= 80 ? ['sr-g', tl('Strong', 'Fuerte')] : p >= 40 ? ['sr-y', tl('Growing', 'Creciendo')] : ['sr-r', tl('Keep practicing', 'Sigue practicando')];
  }
  var css = '.sres{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;background:rgba(5,9,18,.72);font-family:Nunito,"Segoe UI",system-ui,sans-serif}' +
    '.sres-card{width:min(640px,94vw);max-height:92vh;overflow:auto;background:#111c33;color:#eef3fb;border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:20px 22px;box-shadow:0 20px 60px rgba(0,0,0,.5)}' +
    '.sres h2{margin:0 0 4px;font-size:24px;font-weight:900;color:#fff;font-family:inherit;text-transform:none;letter-spacing:0}.sres .sres-sub{margin:0 0 12px;color:#a9b8d2;font-size:15px}' +
    '.sres-tot{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.sres-tot div{background:rgba(255,255,255,.06);border-radius:10px;padding:8px;text-align:center}' +
    '.sres-tot b{display:block;font-size:26px}.sres-tot span{font-size:13px;color:#a9b8d2}' +
    '.sres table{width:100%;border-collapse:separate;border-spacing:0 6px;font-size:16px}.sres th{text-align:left;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#a9b8d2;font-weight:800;padding:0 8px}' +
    '.sres td{background:rgba(255,255,255,.05);padding:8px;color:#eef3fb}.sres td:first-child{border-radius:10px 0 0 10px}.sres td:last-child{border-radius:0 10px 10px 0}' +
    '.sres .pct{display:inline-block;font-weight:900;border-radius:999px;padding:2px 10px;white-space:nowrap}' +
    '.sres .sr-g{background:rgba(125,255,176,.18);color:#b6ffd4;border:1px solid #7dffb0}.sres .sr-y{background:rgba(255,210,63,.16);color:#ffe9a0;border:1px solid #ffd23f}.sres .sr-r{background:rgba(255,107,107,.16);color:#ffc9c9;border:1px solid #ff6b6b}' +
    '.sres-btn{display:block;margin:14px auto 0;min-height:46px;min-width:160px;border:0;border-radius:12px;background:linear-gradient(180deg,#ffe066,#f4b400);color:#1b1300;font:900 18px Nunito,"Segoe UI",sans-serif;cursor:pointer}' +
    '.sres-btn:focus-visible{outline:3px solid #62e3ff;outline-offset:3px}';
  function show(opts) {
    opts = opts || {};
    var t = total(); if (!t.n) { if (opts.onClose) opts.onClose(); return false; }
    close(true);
    if (!document.getElementById('sres-css')) { var st = document.createElement('style'); st.id = 'sres-css'; st.textContent = css; document.head.appendChild(st); }
    var rows = '', ids = skills.map(function (s) { return s.id; });
    for (var k in counts) if (ids.indexOf(k) < 0) ids.push(k);
    ids.forEach(function (id) {
      var c = counts[id]; if (!c || !c.n) return;
      var p = Math.round(100 * c.right / c.n), b = band(p);
      rows += '<tr><td>' + nameOf(id) + '</td><td>' + c.n + '</td><td>' + c.right + '</td><td><span class="pct ' + b[0] + '">' + p + '% · ' + b[1] + '</span></td></tr>';
    });
    var tp = Math.round(100 * t.right / t.n);
    panel = document.createElement('div'); panel.className = 'sres';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'sres-h');
    panel.innerHTML = '<div class="sres-card"><h2 id="sres-h">' + (opts.title || tl('Your results', 'Tus resultados')) + '</h2>' +
      '<p class="sres-sub">' + tl('How each skill went this game.', 'Cómo te fue en cada habilidad en este juego.') + '</p>' +
      '<div class="sres-tot"><div><b>' + t.n + '</b><span>' + tl('Answers', 'Respuestas') + '</span></div><div><b>' + t.right + '</b><span>' + tl('Correct', 'Correctas') + '</span></div><div><b>' + tp + '%</b><span>' + tl('Accuracy', 'Precisión') + '</span></div></div>' +
      '<table><thead><tr><th>' + tl('Skill', 'Habilidad') + '</th><th>' + tl('Answers', 'Respuestas') + '</th><th>' + tl('Correct', 'Correctas') + '</th><th>' + tl('Percent correct', 'Porcentaje') + '</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<button type="button" class="sres-btn">' + (opts.button || tl('Continue', 'Continuar')) + '</button></div>';
    var host = document.getElementById('game-canvas-slot') || document.body;
    host.appendChild(panel);
    lastFocus = document.activeElement;
    var btn = panel.querySelector('.sres-btn');
    var done = function () { close(); if (opts.onClose) opts.onClose(); };
    btn.addEventListener('click', done);
    // keys stay inside the panel (the game behind it doesn't see them)
    panel.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Escape' || ((e.key === 'Enter' || e.key === ' ') && document.activeElement !== btn)) { e.preventDefault(); done(); }
      if (e.key === 'Tab') { e.preventDefault(); btn.focus(); }
    });
    ['keyup', 'keypress'].forEach(function (ev) { panel.addEventListener(ev, function (e) { e.stopPropagation(); }); });
    setTimeout(function () { btn.focus(); }, 30);
    if (window.SiteSR) window.SiteSR.say(panel.textContent);
    return true;
  }
  function close(quiet) {
    if (!panel) return;
    panel.remove(); panel = null;
    if (!quiet && lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
  }
  window.SiteResults = { setup: setup, reset: reset, record: record, show: show, close: close, isOpen: function () { return !!panel; }, total: total };
})();
