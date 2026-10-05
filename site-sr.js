// Screen reader support shared by the games.
// SiteSR.say(text) reads a message aloud through a hidden live region (feedback, results, a new question).
// A game whose words are painted onto a canvas (the p5 games) marks its page <html data-sr-canvas>: every word the
// game draws is then also collected, new words are read aloud as they appear, and a hidden "On screen now" summary
// lists everything currently showing, so a screen reader user hears the questions, menus, hints and results.
// Words that change many times a second (timers, a ticking score) are left out of the spoken messages so they don't
// talk over everything else; they still appear in the summary. Sighted players see no change.
(function () {
  var tl = window.tl || function (en) { return en; };
  var live, scene;
  function make() {
    if (live) return;
    var css = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0';
    live = document.createElement('div');
    live.setAttribute('aria-live', 'polite'); live.setAttribute('role', 'status'); live.style.cssText = css;
    scene = document.createElement('div'); scene.style.cssText = css; scene.id = 'sr-scene';
    document.body.appendChild(live); document.body.appendChild(scene);
  }
  var lastMsg = '', lastAt = 0;
  function say(text) {
    text = String(text || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    if (!document.body) return;
    make();
    var t = Date.now();
    if (text === lastMsg && t - lastAt < 4000) return;   // don't repeat the same message
    lastMsg = text; lastAt = t;
    live.textContent = '';
    setTimeout(function () { live.textContent = text; }, 60);   // clearing first makes repeats read again
  }
  // math written with superscripts, read the way a teacher says it: 3⁴ -> "3 to the power of 4"
  var SUP = { '⁻': '-', '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
  function spoken(s) {
    return String(s).replace(/[⁻⁰¹²³⁴-⁹]+/g, function (m) {
      return tl(' to the power of ', ' elevado a ') + m.split('').map(function (c) { return SUP[c]; }).join('') + ' ';
    }).replace(/\s+/g, ' ').trim();
  }
  var frame = [], quiet = 0;
  window.SiteSR = {
    say: say,
    // for words a game draws in pieces (a power drawn as a big digit and a small raised one): line() gives the reader
    // the whole thing, and quiet(fn) draws the pieces without the reader picking them up
    line: function (s) { if (!quiet && s != null && String(s).trim()) frame.push(spoken(String(s).replace(/\s*·\s*/g, tl(' times ', ' por ')))); },   // math: a dot means times
    quiet: function (fn) { quiet++; try { return fn(); } finally { quiet--; } }
  };

  if (!document.documentElement.hasAttribute('data-sr-canvas')) return;

  // ---- collect the words drawn on the game's canvas ----
  var P = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (!P) return;
  function grab(orig) {
    return function (s) {
      try {
        var c = this.canvas;
        if (!quiet && c && c.isConnected && c.width > 200 && s != null) { s = spoken(s); if (s) frame.push(s); }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
  }
  P.fillText = grab(P.fillText);
  P.strokeText = grab(P.strokeText);

  var recent = {}, shown = [], prevKeys = {}, changes = {}, flagged = {}, pending = null;
  // a line's "shape" ignores its numbers, so "Time: 12" and "Time: 11" are the same line changing
  function shape(s) { return s.replace(/-?\d+(\.\d+)?/g, '#'); }
  // real words, or a plain number (an answer choice) when there are only a few of them on screen; not the dozens of
  // numbers along a graph's axes
  var words = /[A-Za-zÀ-ɏ]{2}/, fewNums = true;
  function useful(s) { return words.test(s) || (fewNums && /\d/.test(s)); }

  function tick() {
    setTimeout(tick, 400);
    // keep each line once, in drawing order (p5 often draws a word twice: outline then fill)
    // and a line drawn several times with different numbers (a timer between checks) only in its latest form
    var seen = {}, now = [];
    frame.forEach(function (s) { var k = shape(s); if (seen[k] === undefined) { seen[k] = now.length; now.push(s); } else now[seen[k]] = s; });
    frame = [];
    if (!now.length) return;   // nothing drew this time (paused tab, between frames)
    fewNums = now.filter(function (s) { return !words.test(s); }).length <= 8;
    var t = Date.now(), fresh = [], keys = {};
    now.forEach(function (s) {
      var k = shape(s); keys[k] = s;
      var wasRecent = recent[s] && t - recent[s] < 3000;   // still showing, or blinking on and off
      recent[s] = t;
      if (prevKeys[k] === s || wasRecent) return;
      if (prevKeys[k] !== undefined) {   // the same line with a new number
        var c = changes[k] = (changes[k] || []).filter(function (x) { return t - x < 6000; });
        c.push(t);
        if (c.length > 3) flagged[k] = t;   // a timer or counter: stop reading it out
      }
      if (flagged[k] && t - flagged[k] < 8000) return;
      if (useful(s)) fresh.push(s);
    });
    prevKeys = keys;
    shown = now;
    var cv = document.querySelector("canvas");   // p5 makes its canvas after this file loads
    if (cv && !cv.getAttribute("aria-describedby")) cv.setAttribute("aria-describedby", "sr-scene");
    scene.textContent = tl('On screen now: ', 'En pantalla ahora: ') + now.filter(useful).join('. ');
    if (fresh.length) {
      // wait a moment so a screen that is still appearing is read as one message
      pending = (pending || []).concat(fresh);
      if (!tick.t) tick.t = setTimeout(function () {
        tick.t = 0;
        var seenMsg = {}, msg = pending.filter(function (s) { return seenMsg[s] ? 0 : (seenMsg[s] = 1); });
        pending = null;
        if (msg.length > 14) msg = msg.slice(0, 14);
        say(msg.join('. '));
      }, 500);
    }
  }
  function start() { make(); tick(); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
