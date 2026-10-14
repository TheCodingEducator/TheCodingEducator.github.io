// Real-life pictures for the printables: where students meet the math outside class. Each is an empty
// <svg data-art="name"> (usually inside a <figure class="art"> with a caption); this file draws it on load.
// Some pictures mark angles; data-l1 / data-l2 put a label on those marks (see each picture). The caption carries the
// meaning, so the drawings are hidden from screen readers.
(function () {
  var INK = '#1b2130', OR = '#e0674f', BL = '#2f6fd6', GR = '#3a9a5b', YE = '#f2b530';
  function t(x, y, s, col, size) {
    return s ? '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-size="' + (size || 12) + '" font-weight="800" fill="' + (col || INK) +
      '" font-family="Segoe UI, Arial, sans-serif">' + s + '</text>' : '';
  }
  var art = {};

  // a bank shot: the cue ball comes off the top cushion at the same angle it went in
  art.pool = function (d) {
    return '<rect x="4" y="8" width="152" height="96" rx="10" fill="#8a4b24"/><rect x="14" y="18" width="132" height="76" rx="3" fill="#2f8f5b"/>' +
      [[16, 20], [80, 17], [144, 20], [16, 92], [80, 95], [144, 92]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="6" fill="' + INK + '"/>'; }).join('') +
      '<line x1="45" y1="79" x2="27" y2="104" stroke="#e9c46a" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M50 72 L88 18 L126 72" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="4 3"/>' +
      '<line x1="88" y1="18" x2="88" y2="44" stroke="#d9f2e3" stroke-width="1.2" stroke-dasharray="2 2"/>' +
      '<path d="M88 32 A14 14 0 0 1 79.97 29.47" fill="none" stroke="' + YE + '" stroke-width="2.4"/>' +
      '<path d="M88 32 A14 14 0 0 0 96.03 29.47" fill="none" stroke="' + YE + '" stroke-width="2.4"/>' +
      '<circle cx="50" cy="72" r="5.5" fill="#fff" stroke="' + INK + '" stroke-width="1"/><circle cx="126" cy="72" r="5.5" fill="#d64545" stroke="' + INK + '" stroke-width="1"/>' +
      t(71, 45, d.l1, "#fff", 12) + t(105, 45, d.l2, "#fff", 12);
  };

  // open scissors: the blades and the handles make vertical angles (l1 = between the blades, l2 = between the handles)
  art.scissors = function (d) {
    return '<rect x="0" y="0" width="160" height="110" rx="10" fill="#f6f1e6"/>' +
      '<path d="M78 55 L146 30 L143 37 Z" fill="#aab3c3" stroke="#6b7280" stroke-width="1"/>' +
      '<path d="M78 55 L146 80 L143 73 Z" fill="#c4cad6" stroke="#6b7280" stroke-width="1"/>' +
      '<line x1="78" y1="55" x2="50" y2="65.3" stroke="#6b7280" stroke-width="5" stroke-linecap="round"/>' +
      '<line x1="78" y1="55" x2="50" y2="44.7" stroke="#6b7280" stroke-width="5" stroke-linecap="round"/>' +
      '<ellipse cx="38" cy="72" rx="14" ry="11" fill="none" stroke="' + OR + '" stroke-width="6"/>' +
      '<ellipse cx="38" cy="38" rx="14" ry="11" fill="none" stroke="' + BL + '" stroke-width="6"/>' +
      '<path d="M98.67 47.48 A22 22 0 0 1 98.67 62.52" fill="none" stroke="' + GR + '" stroke-width="2.6"/>' +
      '<path d="M57.33 47.48 A22 22 0 0 0 57.33 62.52" fill="none" stroke="' + GR + '" stroke-width="2.6"/>' +
      '<circle cx="78" cy="55" r="3.5" fill="' + INK + '"/>' + t(113, 60, d.l1, GR, 13) + t(40, 59.5, d.l2, GR, 12);
  };

  // a city map: two parallel streets crossed by a diagonal avenue (a transversal); the marked angles are alternate
  // interior angles (l1 at the top street, l2 at the bottom street)
  art.streets = function (d) {
    var h = '<rect x="0" y="0" width="160" height="110" rx="10" fill="#e8efdf"/>' +
      '<rect x="10" y="7" width="18" height="14" fill="' + YE + '"/><rect x="128" y="7" width="20" height="14" fill="' + OR + '"/>' +
      '<rect x="12" y="48" width="20" height="16" fill="' + OR + '"/><rect x="118" y="50" width="22" height="16" fill="' + BL + '"/>' +
      '<rect x="10" y="92" width="16" height="12" fill="' + BL + '"/><rect x="100" y="92" width="20" height="12" fill="' + GR + '"/>' +
      '<circle cx="140" cy="99" r="5" fill="' + GR + '"/><circle cx="36" cy="16" r="4.5" fill="' + GR + '"/>';
    [34, 80].forEach(function (y) { h += '<rect x="0" y="' + (y - 6) + '" width="160" height="12" fill="#9aa1ad"/><line x1="0" y1="' + y + '" x2="160" y2="' + y + '" stroke="#fff" stroke-width="1.2" stroke-dasharray="5 4"/>'; });
    h += '<line x1="40" y1="108" x2="120" y2="2" stroke="#8a919d" stroke-width="13"/><line x1="40" y1="108" x2="120" y2="2" stroke="#fff" stroke-width="1.2" stroke-dasharray="5 4"/>' +
      '<path d="M87.42 45.18 A14 14 0 0 1 81.85 34" fill="none" stroke="' + OR + '" stroke-width="2.6"/>' +
      '<path d="M69.56 68.82 A14 14 0 0 1 75.13 80" fill="none" stroke="' + OR + '" stroke-width="2.6"/>' +
      t(72, 55, d.l1, OR, 12) + t(85, 70, d.l2, OR, 12);
    return h;
  };

  // a ladder against a wall: the ladder's angle with the ground (l1) and with the wall (l2) are complementary
  art.ladder = function (d) {
    var h = '<rect x="0" y="0" width="160" height="110" rx="10" fill="#e6f1fa"/><circle cx="26" cy="22" r="10" fill="' + YE + '"/>' +
      '<rect x="0" y="100" width="160" height="10" fill="#7cc07a"/><line x1="6" y1="100" x2="154" y2="100" stroke="' + INK + '" stroke-width="2"/>';
    h += '<line x1="55.26" y1="97.82" x2="117.26" y2="19.82" stroke="#a0662f" stroke-width="3"/><line x1="60.74" y1="102.18" x2="122.74" y2="24.18" stroke="#a0662f" stroke-width="3"/>';
    for (var k = 1; k <= 6; k++) {
      var f = k / 7.2;
      h += '<line x1="' + (55.26 + 62 * f).toFixed(1) + '" y1="' + (97.82 - 78 * f).toFixed(1) + '" x2="' + (60.74 + 62 * f).toFixed(1) + '" y2="' + (102.18 - 78 * f).toFixed(1) + '" stroke="#a0662f" stroke-width="2.2"/>';
    }
    h += '<rect x="120" y="6" width="34" height="94" fill="#d36b4a"/>';
    for (var r = 0; r < 9; r++) h += '<line x1="120" y1="' + (16 + r * 10) + '" x2="154" y2="' + (16 + r * 10) + '" stroke="#f0c3b0" stroke-width="1"/>' +
      '<line x1="' + (r % 2 ? 137 : 129) + '" y1="' + (6 + r * 10) + '" x2="' + (r % 2 ? 137 : 129) + '" y2="' + (16 + r * 10) + '" stroke="#f0c3b0" stroke-width="1"/>';
    h += '<line x1="120" y1="6" x2="120" y2="100" stroke="' + INK + '" stroke-width="1.6"/><path d="M110 100 V90 H120" fill="none" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M74 100 A16 16 0 0 0 67.96 87.48" fill="none" stroke="' + OR + '" stroke-width="2.6"/>' +
      '<path d="M120 38 A16 16 0 0 1 110.04 34.52" fill="none" stroke="' + BL + '" stroke-width="2.6"/>' +
      t(84, 92, d.l1, OR) + t(111, 50, d.l2, BL);
    return h;
  };

  // a skate ramp on flat ground: the ramp's angle (l1) and the angle on the other side of it (l2) are supplementary
  art.ramp = function (d) {
    return '<rect x="0" y="0" width="160" height="110" rx="10" fill="#fdf1dc"/><circle cx="136" cy="20" r="10" fill="' + YE + '"/>' +
      '<path d="M30 92 L120 58 L146 58 L146 92 Z" fill="#c9a26b" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<line x1="128" y1="60" x2="128" y2="92" stroke="#a07c4a" stroke-width="2"/><line x1="138" y1="60" x2="138" y2="92" stroke="#a07c4a" stroke-width="2"/>' +
      '<line x1="6" y1="92" x2="154" y2="92" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<g transform="rotate(-20.7 79.5 73.3)"><rect x="66" y="66" width="27" height="4" rx="2" fill="' + BL + '"/><circle cx="71" cy="72.5" r="2.5" fill="' + INK + '"/><circle cx="88" cy="72.5" r="2.5" fill="' + INK + '"/></g>' +
      '<path d="M48 92 A18 18 0 0 0 46.84 85.64" fill="none" stroke="' + BL + '" stroke-width="2.6"/>' +
      '<path d="M41.23 87.76 A12 12 0 0 0 18 92" fill="none" stroke="' + OR + '" stroke-width="2.6"/>' +
      t(65, 90, d.l1, BL, 11) + t(24, 73, d.l2, OR, 12);
  };

  function run() {
    var s = document.querySelectorAll('svg[data-art]');
    for (var i = 0; i < s.length; i++) {
      var f = art[s[i].getAttribute('data-art')];
      s[i].setAttribute('viewBox', '0 0 160 110');
      s[i].setAttribute('aria-hidden', 'true');
      if (f) s[i].innerHTML = f(s[i].dataset);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
