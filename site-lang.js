// Spanish for the games. A game that has a Spanish version marks its page <html data-langs="en es"> and loads this
// file in its <head>, before its own scripts. The 🌐 Español / English button in the top bar (site-layout.js) saves the
// choice in localStorage ('site_lang'), shared by every game on this device.
//   tl('English words', 'Palabras en español')  - returns whichever the student picked
//   window.SITE_ES                               - true when the game is being played in Spanish
//   data-es="..." / data-es-aria / data-es-title / data-es-placeholder  - the page's own words: swapped in for Spanish when the page loads
(function () {
  var want = false;
  try { want = localStorage.getItem('site_lang') === 'es'; } catch (e) {}
  var has = / es( |$)/.test(' ' + (document.documentElement.getAttribute('data-langs') || ''));
  var es = want && has;
  window.SITE_ES = es;
  window.tl = function (en, sp) { return es ? sp : en; };
  if (!es) return;
  document.documentElement.lang = 'es';
  function swap() {
    var i, els = document.querySelectorAll('[data-es]');
    for (i = 0; i < els.length; i++) els[i].innerHTML = els[i].getAttribute('data-es');
    els = document.querySelectorAll('[data-es-aria]');
    for (i = 0; i < els.length; i++) els[i].setAttribute('aria-label', els[i].getAttribute('data-es-aria'));
    els = document.querySelectorAll('[data-es-title]');
    for (i = 0; i < els.length; i++) els[i].setAttribute('title', els[i].getAttribute('data-es-title'));
    els = document.querySelectorAll('[data-es-placeholder]');
    for (i = 0; i < els.length; i++) els[i].setAttribute('placeholder', els[i].getAttribute('data-es-placeholder'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', swap); else swap();
})();
