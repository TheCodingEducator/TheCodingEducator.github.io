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

  function bg(col) { return '<rect x="0" y="0" width="160" height="110" rx="10" fill="' + col + '"/>'; }
  function circ(x, y, r, f, extra) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + f + '"' + (extra || '') + '/>'; }
  function rect(x, y, w, h, f, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + f + '"' + (extra || '') + '/>'; }
  var SK = ' stroke="' + INK + '" stroke-width="1.6"';

  // ---- angles ----
  // mini golf: the ball banks off the wall at equal angles into the hole (l1, l2 on the two angles)
  art.golf = function (d) {
    return bg('#e6f1fa') + '<rect x="10" y="14" width="140" height="86" rx="12" fill="#55b36b" stroke="#8a4b24" stroke-width="6"/>' +
      circ(126, 80, 6, INK) + '<line x1="126" y1="80" x2="126" y2="52" stroke="#6b7280" stroke-width="1.5"/><path d="M126 52 l14 5 l-14 5 Z" fill="' + OR + '"/>' +
      '<path d="M34 82 L80 17 L126 80" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="4 3"/>' +
      '<path d="M66 17 A14 14 0 0 0 71.9 28.4" fill="none" stroke="' + YE + '" stroke-width="2.6"/><path d="M94 17 A14 14 0 0 1 88.3 28.3" fill="none" stroke="' + YE + '" stroke-width="2.6"/>' +
      circ(34, 82, 4.5, '#fff', SK) + '<line x1="22" y1="96" x2="31" y2="86" stroke="#c9ced8" stroke-width="3.5" stroke-linecap="round"/>' + t(58, 34, d.l1, '#fff') + t(103, 34, d.l2, '#fff');
  };
  // a clock at 3:00: the hands make a right angle (l1 on the angle)
  art.clock = function (d) {
    var h = bg('#fdf1dc') + circ(80, 55, 44, '#fff', ' stroke="' + INK + '" stroke-width="4"');
    for (var k = 0; k < 12; k++) { var a = k * Math.PI / 6; h += '<line x1="' + (80 + 36 * Math.sin(a)).toFixed(1) + '" y1="' + (55 - 36 * Math.cos(a)).toFixed(1) + '" x2="' + (80 + 41 * Math.sin(a)).toFixed(1) + '" y2="' + (55 - 41 * Math.cos(a)).toFixed(1) + '" stroke="' + INK + '" stroke-width="' + (k % 3 ? 1.5 : 3) + '"/>'; }
    return h + '<path d="M80 55 L80 37 A18 18 0 0 1 98 55 Z" fill="' + OR + '" fill-opacity="0.3"/><line x1="80" y1="55" x2="80" y2="21" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="80" y1="55" x2="106" y2="55" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' + circ(80, 55, 3.5, INK) + t(92, 47, d.l1, OR, 11);
  };
  // a pizza cut into 8 slices; one slice's angle is shaded (l1)
  art.pizza = function (d) {
    var h = bg('#fdf1dc') + circ(80, 56, 46, '#e8a33d') + circ(80, 56, 40, '#f6d06b');
    [[66, 40], [92, 38], [100, 62], [74, 72], [60, 58], [86, 80], [96, 48]].forEach(function (p) { h += circ(p[0], p[1], 4.5, '#c0392b'); });
    for (var k = 0; k < 8; k++) { var a = k * Math.PI / 4; h += '<line x1="80" y1="56" x2="' + (80 + 46 * Math.cos(a)).toFixed(1) + '" y2="' + (56 - 46 * Math.sin(a)).toFixed(1) + '" stroke="#b5702a" stroke-width="1.6"/>'; }
    return h + '<path d="M80 56 L126 56 A46 46 0 0 0 112.5 23.5 Z" fill="' + BL + '" fill-opacity="0.35" stroke="' + BL + '" stroke-width="2"/>' + t(140, 40, d.l1, BL, 12);
  };
  // a laser bouncing off a mirror in a vault: equal angles on each side of the mirror's dashed normal
  art.laser = function (d) {
    return bg('#1f2433') + rect(8, 92, 144, 10, '#3a4155') + '<rect x="58" y="10" width="44" height="7" rx="2" fill="#b9d4ff" stroke="#e8f0ff" stroke-width="1"/>' +
      '<line x1="80" y1="17" x2="80" y2="44" stroke="#8f9ab3" stroke-width="1.2" stroke-dasharray="3 2"/>' +
      '<rect x="14" y="74" width="16" height="12" rx="2" fill="#6b7280"/><path d="M28 78 L80 17 L132 78" fill="none" stroke="#ff4d4d" stroke-width="2.4"/>' +
      '<rect x="130" y="74" width="18" height="18" rx="3" fill="' + YE + '"/><path d="M80 31 A14 14 0 0 1 70.9 27.6" fill="none" stroke="' + YE + '" stroke-width="2.4"/><path d="M80 31 A14 14 0 0 0 89.1 27.6" fill="none" stroke="' + YE + '" stroke-width="2.4"/>' +
      t(64, 46, d.l1, '#fff') + t(97, 46, d.l2, '#fff');
  };

  // ---- lines and slope ----
  // stairs: each step has the same rise (l1) and run (l2), so the slope stays the same
  art.stairs = function (d) {
    var h = bg('#e6f1fa'), x = 20, y = 96, p = 'M' + x + ' ' + y;
    for (var k = 0; k < 5; k++) { p += ' V' + (y - 16) + ' H' + (x + 24); y -= 16; x += 24; }
    h += '<path d="' + p + ' V96 Z" fill="#c9a26b" stroke="' + INK + '" stroke-width="1.6"/><line x1="20" y1="96" x2="140" y2="16" stroke="' + BL + '" stroke-width="2" stroke-dasharray="5 3"/>' +
      '<line x1="44" y1="80" x2="44" y2="64" stroke="' + OR + '" stroke-width="3"/><line x1="44" y1="64" x2="68" y2="64" stroke="' + GR + '" stroke-width="3"/>';
    return h + t(34, 76, d.l1, OR, 11) + t(56, 60, d.l2, GR, 11);
  };
  // a house: the roof's slope is its rise (l1) over its run (l2)
  art.roof = function (d) {
    return bg('#e6f1fa') + circ(136, 20, 9, YE) + rect(30, 56, 100, 44, '#f2d7a8', SK) + '<path d="M22 58 L80 22 L138 58 Z" fill="' + OR + '"' + SK + '/>' +
      rect(70, 72, 20, 28, '#a0662f') + rect(40, 66, 18, 14, '#bfe3ff', SK) + rect(102, 66, 18, 14, '#bfe3ff', SK) +
      '<line x1="80" y1="22" x2="80" y2="58" stroke="' + BL + '" stroke-width="2" stroke-dasharray="4 3"/><line x1="80" y1="58" x2="138" y2="58" stroke="' + GR + '" stroke-width="2.4" stroke-dasharray="4 3"/>' +
      t(88, 44, d.l1, BL, 11) + t(110, 54, d.l2, GR, 11) + rect(0, 100, 160, 10, '#7cc07a');
  };
  // a taxi: the fare is a starting fee plus a rate per mile (l1 is the sign's text, like "$3 + $2/mile")
  art.taxi = function (d) {
    return bg('#eef0f4') + rect(0, 88, 160, 22, '#9aa1ad') + '<line x1="0" y1="99" x2="160" y2="99" stroke="#fff" stroke-width="2" stroke-dasharray="8 6"/>' +
      '<path d="M22 84 V66 Q24 58 34 56 L50 44 H104 L120 56 Q134 58 138 66 V84 Z" fill="' + YE + '"' + SK + '/>' + '<path d="M56 48 H78 V58 H48 Z M84 48 H100 L110 58 H84 Z" fill="#bfe3ff"/>' +
      rect(68, 36, 22, 8, INK) + t(79, 43, 'TAXI', YE, 6.5) + circ(46, 86, 9, INK) + circ(46, 86, 4, '#c9ced8') + circ(114, 86, 9, INK) + circ(114, 86, 4, '#c9ced8') +
      '<rect x="10" y="8" width="100" height="22" rx="5" fill="#fff"' + SK + '/>' + t(60, 23, d.l1 || '$3 + $2 per mile', INK, 10);
  };
  // a soccer ball kicked in a straight line toward the goal
  art.soccer = function (d) {
    return bg('#55b36b') + '<line x1="0" y1="80" x2="160" y2="80" stroke="#fff" stroke-width="1.5" opacity=".6"/>' +
      '<rect x="118" y="20" width="34" height="46" fill="none" stroke="#fff" stroke-width="3"/>' +
      '<path d="M118 20 l-6 6 v46 l6 -6 M152 20 l-6 6 v46" fill="none" stroke="#fff" stroke-width="1" opacity=".7"/>' +
      '<line x1="22" y1="90" x2="128" y2="34" stroke="#fff" stroke-width="2" stroke-dasharray="5 4"/>' + circ(22, 90, 8, '#fff', SK) + '<path d="M19 86 l3 -2 l3 2 l-1 4 h-4 Z" fill="' + INK + '"/>' + t(70, 54, d.l1, '#fff', 11);
  };

  // ---- transformations ----
  // a butterfly: one wing is the reflection of the other across the dashed line
  art.butterfly = function (d) {
    var wing = function (s) { return '<g transform="translate(80 0) scale(' + s + ' 1)"><path d="M0 52 C 20 10, 62 14, 56 46 C 52 60, 20 56, 0 56 Z" fill="' + (s > 0 ? OR : BL) + '"' + SK + '/><path d="M0 58 C 18 62, 44 70, 36 92 C 28 100, 8 84, 0 66 Z" fill="' + YE + '"' + SK + '/>' + circ(34, 38, 6, '#fff') + '</g>'; };
    return bg('#e6f1fa') + wing(1) + wing(-1) + '<rect x="77" y="34" width="6" height="56" rx="3" fill="' + INK + '"/><path d="M80 36 Q72 22 66 18 M80 36 Q88 22 94 18" fill="none" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<line x1="80" y1="4" x2="80" y2="106" stroke="' + GR + '" stroke-width="1.6" stroke-dasharray="4 3"/>';
  };
  // a Ferris wheel: every car turns around the center (a rotation)
  art.ferris = function (d) {
    var h = bg('#e6f1fa') + '<path d="M60 102 L80 52 L100 102" fill="none" stroke="' + INK + '" stroke-width="3"/>' + circ(80, 52, 38, 'none', ' stroke="' + INK + '" stroke-width="2.4"');
    for (var k = 0; k < 8; k++) {
      var a = k * Math.PI / 4, x = 80 + 38 * Math.cos(a), y = 52 + 38 * Math.sin(a);
      h += '<line x1="80" y1="52" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#6b7280" stroke-width="1.2"/>' + rect((x - 6).toFixed(1), (y + 1).toFixed(1), 12, 9, [OR, BL, GR, YE][k % 4], ' rx="2"');
    }
    return h + circ(80, 52, 4, INK) + '<path d="M128 30 A50 50 0 0 1 134 62" fill="none" stroke="' + OR + '" stroke-width="2.6"/><path d="M134 62 l-6 -4 l8 -3 Z" fill="' + OR + '"/>' + t(140, 22, d.l1, OR, 11);
  };
  // an elevator: the car slides straight up without turning (a translation)
  art.elevator = function (d) {
    return bg('#eef0f4') + rect(52, 6, 56, 100, '#d8dde6', SK) + '<line x1="80" y1="6" x2="80" y2="106" stroke="#9aa1ad" stroke-width="1"/>' +
      rect(60, 62, 40, 36, BL, ' opacity=".25" stroke="' + BL + '" stroke-dasharray="4 3"') + rect(60, 18, 40, 36, BL, SK) + rect(66, 24, 12, 24, '#bfe3ff') + rect(82, 24, 12, 24, '#bfe3ff') +
      '<line x1="118" y1="92" x2="118" y2="30" stroke="' + OR + '" stroke-width="3"/><path d="M118 24 l-6 9 h12 Z" fill="' + OR + '"/>' + t(136, 64, d.l1, OR, 11);
  };

  // ---- similarity and scale ----
  // a photo and its enlargement: same shape, every length times the scale factor (l1, like "×2")
  art.photo = function (d) {
    var pic = function (x, y, k) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><rect width="30" height="22" fill="#bfe3ff" stroke="' + INK + '" stroke-width="' + (1.6 / k) + '"/><circle cx="23" cy="6" r="3" fill="' + YE + '"/><path d="M0 22 L10 10 L17 17 L22 12 L30 22 Z" fill="' + GR + '"/></g>'; };
    return bg('#f6f1e6') + pic(10, 60, 1) + pic(64, 14, 2.6) + '<path d="M44 66 Q56 54 60 44" fill="none" stroke="' + OR + '" stroke-width="2.2"/><path d="M60 44 l-1 9 l-6 -5 Z" fill="' + OR + '"/>' + t(40, 50, d.l1, OR, 12);
  };
  // a map with a scale bar (l1 is the scale, like "1 cm = 5 km")
  art.map = function (d) {
    return bg('#f3ead2') + '<path d="M10 60 Q40 30 70 52 T130 40 L150 46 V100 H10 Z" fill="#cfe8c8"/><path d="M0 84 Q40 70 80 86 T160 78" fill="none" stroke="' + BL + '" stroke-width="4"/>' +
      circ(40, 46, 4, OR) + circ(118, 62, 4, OR) + '<path d="M40 46 L118 62" stroke="' + INK + '" stroke-width="1.6" stroke-dasharray="4 3"/>' +
      '<rect x="12" y="10" width="60" height="18" rx="3" fill="#fff"' + SK + '/><line x1="18" y1="22" x2="50" y2="22" stroke="' + INK + '" stroke-width="2.4"/><line x1="18" y1="18" x2="18" y2="25" stroke="' + INK + '" stroke-width="1.6"/><line x1="50" y1="18" x2="50" y2="25" stroke="' + INK + '" stroke-width="1.6"/>' +
      t(42, 17, d.l1 || '1 cm = 5 km', INK, 7) + '<path d="M140 10 l5 12 l-5 -3 l-5 3 Z" fill="' + INK + '"/>' + t(140, 32, 'N', INK, 8);
  };
  // a tree and a person casting shadows at the same time: similar triangles
  art.shadow = function (d) {
    return bg('#e6f1fa') + circ(18, 16, 10, YE) + rect(0, 92, 160, 18, '#7cc07a') +
      '<path d="M44 92 L44 40 L104 92 Z" fill="' + BL + '" fill-opacity=".15"/><path d="M120 92 L120 72 L143 92 Z" fill="' + BL + '" fill-opacity=".15"/>' +
      rect(40, 54, 8, 38, '#8a5a2b') + circ(44, 44, 18, GR) + circ(120, 66, 4, INK) + '<line x1="120" y1="70" x2="120" y2="84" stroke="' + INK + '" stroke-width="3"/><path d="M120 84 l-4 8 M120 84 l4 8 M114 75 h12" stroke="' + INK + '" stroke-width="2"/>' +
      '<line x1="44" y1="95" x2="104" y2="95" stroke="#4a4f5c" stroke-width="3"/><line x1="120" y1="95" x2="143" y2="95" stroke="#4a4f5c" stroke-width="3"/>' + t(74, 106, d.l1, INK, 10) + t(132, 106, d.l2, INK, 10);
  };

  // ---- the Pythagorean theorem ----
  // a TV: the size you buy is the diagonal (l1), with the width (l2) and height (l3) as legs
  art.tv = function (d) {
    return bg('#eef0f4') + '<rect x="18" y="12" width="124" height="76" rx="4" fill="' + INK + '"/>' + rect(24, 18, 112, 64, '#2f6fd6', ' opacity=".85"') +
      '<line x1="24" y1="82" x2="136" y2="18" stroke="' + YE + '" stroke-width="2.4" stroke-dasharray="5 3"/>' + rect(70, 88, 20, 8, '#6b7280') + rect(56, 96, 48, 5, '#6b7280', ' rx="2"') +
      t(76, 46, d.l1, '#fff', 12) + t(80, 108, d.l2, INK, 10) + t(10, 54, d.l3, INK, 10);
  };
  // a baseball diamond: the throw from home to second base cuts across the square
  art.baseball = function (d) {
    return bg('#55b36b') + '<path d="M80 102 L130 54 L80 8 L30 54 Z" fill="#d9a066" stroke="#fff" stroke-width="2"/><path d="M80 90 L118 54 L80 20 L42 54 Z" fill="#55b36b"/>' +
      [[80, 102], [130, 54], [80, 8], [30, 54]].map(function (p) { return '<rect x="' + (p[0] - 4) + '" y="' + (p[1] - 4) + '" width="8" height="8" fill="#fff" transform="rotate(45 ' + p[0] + ' ' + p[1] + ')"/>'; }).join('') +
      '<line x1="80" y1="100" x2="80" y2="12" stroke="' + YE + '" stroke-width="2.4" stroke-dasharray="5 3"/>' + t(92, 58, d.l1, '#fff', 11) + t(116, 88, d.l2, '#fff', 10);
  };

  // ---- equations ----
  // a balance scale; l1 and l2 are what sits on each pan (like "2x + 3" and "11")
  art.balance = function (d) {
    return bg('#f6f1e6') + '<path d="M70 102 h20 l-6 -8 h-8 Z" fill="' + INK + '"/><line x1="80" y1="96" x2="80" y2="22" stroke="' + INK + '" stroke-width="4"/>' +
      '<line x1="24" y1="26" x2="136" y2="26" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' + circ(80, 22, 5, YE, SK) +
      '<path d="M30 26 L18 62 M30 26 L42 62 M130 26 L118 62 M130 26 L142 62" stroke="#6b7280" stroke-width="1.4"/>' +
      '<path d="M10 62 h40 q-4 12 -20 12 q-16 0 -20 -12 Z" fill="' + OR + '"/><path d="M110 62 h40 q-4 12 -20 12 q-16 0 -20 -12 Z" fill="' + BL + '"/>' +
      t(30, 56, d.l1, INK, 11) + t(130, 56, d.l2, INK, 11);
  };
  // a store receipt (l1 is the total line)
  art.receipt = function (d) {
    var h = bg('#e6f1fa') + '<path d="M44 6 H116 V100 l-6 -4 l-6 4 l-6 -4 l-6 4 l-6 -4 l-6 4 l-6 -4 l-6 4 l-6 -4 l-6 4 l-6 -4 Z" fill="#fff"' + SK + '/>';
    for (var k = 0; k < 4; k++) h += '<line x1="52" y1="' + (24 + k * 12) + '" x2="' + (88 - (k % 2) * 10) + '" y2="' + (24 + k * 12) + '" stroke="#9aa1ad" stroke-width="2.4"/><line x1="98" y1="' + (24 + k * 12) + '" x2="108" y2="' + (24 + k * 12) + '" stroke="#9aa1ad" stroke-width="2.4"/>';
    return h + t(80, 16, 'STORE', INK, 8) + '<line x1="50" y1="74" x2="110" y2="74" stroke="' + INK + '" stroke-width="1.2"/>' + t(80, 88, d.l1 || 'TOTAL $24', OR, 10);
  };

  // ---- exponents and roots ----
  // cells doubling: 1, 2, 4, 8 (powers of 2)
  art.cells = function (d) {
    // each group: [x, labels below, cell centers as (dx, y)]
    var h = bg('#eaf6ee'), groups = [
      [18, '1', [[0, 54]]],
      [54, '2', [[0, 42], [0, 66]]],
      [92, '2²', [[-8, 42], [8, 42], [-8, 66], [8, 66]]],
      [134, '2³', [[-7, 24], [7, 24], [-7, 42], [7, 42], [-7, 60], [7, 60], [-7, 78], [7, 78]]]];
    groups.forEach(function (gr, i) {
      gr[2].forEach(function (p) { h += circ(gr[0] + p[0], p[1], i === 3 ? 6 : 7, GR, ' fill-opacity=".55" stroke="' + GR + '" stroke-width="1.6"'); });
      h += t(gr[0], 102, gr[1], INK, 11);
      if (i < 3) h += '<path d="M' + (gr[0] + 13) + ' 54 h' + (i === 2 ? 14 : 12) + '" stroke="' + OR + '" stroke-width="2"/><path d="M' + (gr[0] + (i === 2 ? 27 : 25)) + ' 54 l-5 -3 v6 Z" fill="' + OR + '"/>';
    });
    return h;
  };
  // the Earth and the Sun: distances so big we write them with powers of 10 (l1)
  art.planet = function (d) {
    var h = bg('#141a2e');
    [[20, 20], [60, 12], [140, 30], [100, 98], [30, 92], [120, 14]].forEach(function (p) { h += circ(p[0], p[1], 1.2, '#fff'); });
    return h + circ(18, 58, 30, YE) + circ(134, 58, 9, BL) + '<path d="M130 54 q4 -3 7 1 q-2 5 -6 4 Z" fill="' + GR + '"/>' +
      '<line x1="52" y1="58" x2="122" y2="58" stroke="#fff" stroke-width="1.4" stroke-dasharray="4 3"/>' + t(88, 50, d.l1, '#fff', 10);
  };
  // a basketball hoop and the ball's arc
  art.hoop = function (d) {
    return bg('#f6e7d6') + rect(0, 96, 160, 14, '#c98a4b') + rect(118, 14, 6, 82, '#6b7280') + rect(98, 12, 36, 26, '#fff', SK) + rect(108, 20, 14, 10, 'none', ' stroke="' + OR + '" stroke-width="1.6"') +
      '<line x1="96" y1="40" x2="116" y2="40" stroke="' + OR + '" stroke-width="3"/><path d="M97 40 l3 12 h12 l3 -12" fill="none" stroke="#fff" stroke-width="1.2"/>' +
      '<path d="M24 80 Q60 0 104 36" fill="none" stroke="' + OR + '" stroke-width="1.6" stroke-dasharray="4 3"/>' + circ(24, 80, 9, '#e8742c', SK) + '<path d="M15 80 h18 M24 71 v18" stroke="' + INK + '" stroke-width="1"/>' + t(60, 66, d.l1, INK, 11);
  };
  // a race car, fast enough for big numbers
  art.racecar = function (d) {
    return bg('#eef0f4') + rect(0, 84, 160, 26, '#5a6170') + '<line x1="0" y1="96" x2="160" y2="96" stroke="#fff" stroke-width="2" stroke-dasharray="10 8"/>' +
      '<path d="M30 78 L40 64 H82 L96 56 H118 L134 70 H142 V80 H30 Z" fill="' + OR + '"' + SK + '/><path d="M86 60 h14 l-4 8 h-14 Z" fill="#bfe3ff"/>' + rect(122, 54, 18, 5, INK) +
      circ(54, 82, 9, INK) + circ(54, 82, 4, '#c9ced8') + circ(120, 82, 9, INK) + circ(120, 82, 4, '#c9ced8') +
      '<path d="M8 62 h18 M4 70 h20 M10 54 h14" stroke="#9aa1ad" stroke-width="2" stroke-linecap="round"/>' + t(70, 74, d.l1 || '7', '#fff', 10) + t(80, 24, d.l2, INK, 12);
  };
  // a square of floor tiles: its side (l1) is the square root of the number of tiles
  art.tiles = function (d) {
    var n = +(d.n || 5), u = 76 / n, h = bg('#f6f1e6');
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) h += rect((42 + j * u).toFixed(1), (14 + i * u).toFixed(1), u.toFixed(1), u.toFixed(1), (i + j) % 2 ? '#d9e6f5' : '#fff', ' stroke="#7c8597" stroke-width="1"');
    return h + rect(42, 14, 76, 76, 'none', SK) + t(80, 104, d.l1, OR, 11) + t(132, 56, d.l2, BL, 11);
  };
  // a cube-shaped box (like an ice cube or a gift box): its edge (l1) is the cube root of its volume
  art.cube = function (d) {
    return bg('#e6f1fa') + '<path d="M40 40 L80 22 L124 34 L84 52 Z" fill="#bfe3ff"' + SK + '/><path d="M40 40 L84 52 L84 98 L40 86 Z" fill="' + BL + '" fill-opacity=".55"' + SK + '/>' +
      '<path d="M84 52 L124 34 L124 80 L84 98 Z" fill="' + BL + '" fill-opacity=".8"' + SK + '/><line x1="40" y1="40" x2="40" y2="86" stroke="' + OR + '" stroke-width="4"/>' +
      t(26, 67, d.l1, OR, 11) + t(140, 20, d.l2, INK, 11);
  };
  // a soccer goal from the front, with the ball heading in
  art.goal = function (d) {
    var h = bg('#7cc07a') + rect(20, 18, 120, 66, '#fff', ' fill-opacity=".35"');
    for (var k = 1; k < 10; k++) h += '<line x1="' + (20 + k * 12) + '" y1="18" x2="' + (20 + k * 12) + '" y2="84" stroke="#fff" stroke-width=".8"/>';
    for (k = 1; k < 6; k++) h += '<line x1="20" y1="' + (18 + k * 11) + '" x2="140" y2="' + (18 + k * 11) + '" stroke="#fff" stroke-width=".8"/>';
    return h + '<path d="M20 84 V18 H140 V84" fill="none" stroke="#fff" stroke-width="4"/>' + circ(110, 44, 9, '#fff', SK) + '<path d="M107 40 l3 -2 l3 2 l-1 4 h-4 Z" fill="' + INK + '"/>' + t(60, 100, d.l1, INK, 11);
  };

  // ---- ratios and proportions ----
  // a mixing bowl and a recipe card (l1, l2 are recipe lines, like "2 cups flour")
  art.bowl = function (d) {
    return bg('#fdf1dc') + '<rect x="94" y="10" width="58" height="46" rx="4" fill="#fff"' + SK + '/>' + t(123, 24, 'RECIPE', OR, 8) + t(123, 37, d.l1, INK, 7.5) + t(123, 49, d.l2, INK, 7.5) +
      '<path d="M10 60 h80 q-4 34 -40 34 q-36 0 -40 -34 Z" fill="' + BL + '"' + SK + '/><ellipse cx="50" cy="60" rx="40" ry="6" fill="#f2e6cf"' + SK + '/>' +
      '<line x1="62" y1="62" x2="86" y2="30" stroke="#a0662f" stroke-width="4" stroke-linecap="round"/>' + rect(104, 72, 22, 24, '#fff', SK) + '<path d="M104 80 h22" stroke="' + OR + '" stroke-width="2"/><path d="M126 76 h6 v8 h-6" fill="none"' + SK + '/>';
  };
  // a pitcher of lemonade and glasses (l1 is the mix, like "2 lemons : 3 cups")
  art.lemonade = function (d) {
    var h = bg('#fff8d6') + '<path d="M18 30 h40 l-4 64 h-32 Z" fill="' + YE + '" fill-opacity=".6"' + SK + '/><path d="M58 40 q14 4 10 22 q-2 8 -12 8" fill="none"' + SK + '/>';
    [80, 104, 128].forEach(function (x) { h += '<path d="M' + x + ' 56 h18 l-2 38 h-14 Z" fill="' + YE + '" fill-opacity=".6"' + SK + '/>'; });
    return h + circ(36, 18, 8, YE, SK) + '<path d="M28 18 h16" stroke="' + INK + '" stroke-width="1"/>' + t(116, 30, d.l1, INK, 10);
  };
  // a price tag (l1 is the price, like "3 for $6")
  art.pricetag = function (d) {
    return bg('#e6f1fa') + '<path d="M30 30 L100 20 L140 58 L74 98 Z" fill="' + YE + '"' + SK + '/>' + circ(98, 36, 5, '#e6f1fa', SK) + '<path d="M98 36 Q112 10 136 14" fill="none" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<g transform="rotate(-24 82 62)">' + t(82, 66, d.l1, INK, 14) + '</g>';
  };

  // ---- the coordinate plane ----
  // a treasure map on a grid: X marks the spot
  art.treasure = function (d) {
    var h = bg('#f3ead2');
    for (var k = 0; k <= 6; k++) h += '<line x1="' + (20 + k * 20) + '" y1="8" x2="' + (20 + k * 20) + '" y2="98" stroke="#c8b98f" stroke-width="1"/>';
    for (k = 0; k <= 4; k++) h += '<line x1="20" y1="' + (8 + k * 22.5) + '" x2="140" y2="' + (8 + k * 22.5) + '" stroke="#c8b98f" stroke-width="1"/>';
    return h + '<path d="M30 90 Q50 60 70 72 T110 34" fill="none" stroke="' + OR + '" stroke-width="2" stroke-dasharray="4 3"/>' + '<path d="M104 26 l12 12 M116 26 l-12 12" stroke="#c0392b" stroke-width="4" stroke-linecap="round"/>' +
      circ(50, 40, 8, GR) + rect(48, 46, 4, 8, '#8a5a2b') + '<path d="M120 76 q10 -6 20 0 v14 h-20 Z" fill="' + BL + '" opacity=".6"/>' + t(80, 108, d.l1, INK, 9);
  };
  // a thermometer below zero (negative numbers)
  art.thermometer = function (d) {
    var h = bg('#e6f1fa') + '<rect x="68" y="8" width="16" height="78" rx="8" fill="#fff"' + SK + '/>' + circ(76, 92, 12, '#d64545', SK) + rect(72, 70, 8, 20, '#d64545');
    for (var k = 0; k < 7; k++) h += '<line x1="84" y1="' + (18 + k * 10) + '" x2="' + (k === 4 ? 98 : 92) + '" y2="' + (18 + k * 10) + '" stroke="' + INK + '" stroke-width="1.4"/>';
    return h + t(110, 61, '0', INK, 10) + t(112, 22, '+', INK, 10) + t(112, 82, '−', INK, 12) + '<path d="M24 30 l6 8 l-6 8 l6 8" fill="none" stroke="#9ac4ff" stroke-width="2"/>' + t(36, 100, d.l1, BL, 11);
  };
  // theater seats: a ticket's row and seat find one seat, like an ordered pair (l1 is the ticket)
  art.theater = function (d) {
    var h = bg('#2c1f3a') + rect(14, 6, 132, 14, '#c0392b', ' rx="3"');
    for (var r = 0; r < 4; r++) for (var c = 0; c < 7; c++) h += rect(22 + c * 17, 30 + r * 16, 13, 11, (r === 1 && c === 4) ? YE : '#7c6aa0', ' rx="3"');
    return h + '<rect x="40" y="92" width="80" height="16" rx="3" fill="#fff"/>' + t(80, 104, d.l1 || 'Row 3, Seat 5', INK, 9);
  };

  // ---- arrays and area ----
  // an egg carton: 2 rows of 6 (an array)
  art.eggs = function (d) {
    var h = bg('#e6f1fa') + '<rect x="14" y="30" width="132" height="56" rx="8" fill="#c9b49a"' + SK + '/>';
    for (var r = 0; r < 2; r++) for (var c = 0; c < 6; c++) h += '<ellipse cx="' + (28 + c * 21) + '" cy="' + (46 + r * 24) + '" rx="8" ry="10" fill="#fff8ee" stroke="#b9a68c" stroke-width="1"/>';
    return h + t(80, 104, d.l1, INK, 11) + t(80, 22, d.l2, INK, 11);
  };
  // a chocolate bar: rows and columns of squares (area)
  art.chocolate = function (d) {
    var h = bg('#fdf1dc') + '<rect x="24" y="16" width="112" height="76" rx="4" fill="#6b3f22"/>';
    for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) h += '<rect x="' + (29 + c * 27) + '" y="' + (21 + r * 23.5) + '" width="23" height="20" rx="2" fill="#8a5432" stroke="#5a341c" stroke-width="1"/>';
    return h + t(80, 106, d.l1, INK, 11);
  };
  // a garden bed with plants in rows and columns
  art.garden = function (d) {
    var h = bg('#e6f1fa') + '<rect x="16" y="22" width="128" height="70" rx="4" fill="#a0662f"/>';
    for (var r = 0; r < 3; r++) for (var c = 0; c < 5; c++) h += circ(32 + c * 24, 38 + r * 20, 7, GR) + circ(32 + c * 24, 36 + r * 20, 3, r % 2 ? YE : OR);
    return h + t(80, 106, d.l1, INK, 11) + t(80, 16, d.l2, INK, 10);
  };

  // ---- money ----
  // a piggy bank with a coin going in
  art.piggy = function (d) {
    return bg('#fdeef2') + '<ellipse cx="78" cy="62" rx="48" ry="32" fill="#f4a3b8"' + SK + '/>' + circ(122, 58, 12, '#f4a3b8', SK) + '<ellipse cx="128" cy="58" rx="5" ry="6" fill="#e58aa2"/>' +
      '<path d="M54 34 l6 -12 l8 10" fill="#f4a3b8"' + SK + '/>' + circ(104, 50, 3, INK) + rect(54, 88, 10, 12, '#f4a3b8', SK) + rect(92, 88, 10, 12, '#f4a3b8', SK) +
      rect(66, 30, 20, 4, INK, ' rx="2"') + circ(76, 14, 8, '#c9ced8', SK) + t(76, 17, d.l1 || '25¢', INK, 7) + t(36, 104, d.l2, INK, 10);
  };
  // a lemonade stand with a price sign (l1)
  art.stand = function (d) {
    return bg('#e6f1fa') + rect(20, 50, 120, 50, '#fff', SK) + '<path d="M14 50 L26 26 H134 L146 50 Z" fill="' + YE + '"' + SK + '/>' +
      '<path d="M26 26 l-12 24 M50 26 l-8 24 M74 26 l-4 24 M98 26 l4 24 M122 26 l12 24" stroke="' + OR + '" stroke-width="5" opacity=".7"/>' +
      '<rect x="46" y="60" width="68" height="22" rx="3" fill="' + YE + '" fill-opacity=".4"' + SK + '/>' + t(80, 76, d.l1 || 'Lemonade 25¢', INK, 10) +
      '<path d="M120 84 h12 l-2 14 h-8 Z" fill="' + YE + '"' + SK + '/>';
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
