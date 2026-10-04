// Shared drawing helpers for the printable worksheets and exit tickets. Each diagram is an empty <svg> with a class
// and data- attributes; this file draws it when the page loads, so every sheet stays short and prints crisply.
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var INK = '#1b2130', A = '#e0674f', B = '#3a9a5b', C = '#2f6fd6', MUTED = '#8a91a3';
  var rad = function (d) { return d * Math.PI / 180; };
  var r1 = function (n) { return Math.round(n * 10) / 10; };
  function txt(x, y, s, col, anchor, size) {
    return '<text x="' + r1(x) + '" y="' + r1(y) + '" text-anchor="' + (anchor || 'middle') + '" font-size="' + (size || 13) +
      '" font-weight="700" fill="' + (col || INK) + '" font-family="Segoe UI, Arial, sans-serif">' + s + '</text>';
  }
  function line(x1, y1, x2, y2, col, w, dash) {
    return '<line x1="' + r1(x1) + '" y1="' + r1(y1) + '" x2="' + r1(x2) + '" y2="' + r1(y2) + '" stroke="' + (col || INK) +
      '" stroke-width="' + (w || 2) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + ' stroke-linecap="round"/>';
  }
  function size(s, w, h) { s.setAttribute('width', w); s.setAttribute('height', h); s.setAttribute('viewBox', '0 0 ' + w + ' ' + h); }
  var draw = {};

  // right triangle: leg a across the bottom, leg b up the left, hypotenuse c. data-a/b/c are the labels; when a leg's
  // label is "?", data-ra / data-rb give its real length so the triangle is still drawn to scale.
  draw.tri = function (s, d) {
    var a = +(d.a === '?' ? d.ra : d.a), b = +(d.b === '?' ? d.rb : d.b);
    var k = Math.min(150 / a, 64 / b), w = a * k, h = b * k, x0 = 22, y0 = 8 + h;
    size(s, w + 60, h + 30);
    s.innerHTML = line(x0, y0, x0 + w, y0, A, 3) + line(x0, y0, x0, y0 - h, B, 3) + line(x0, y0 - h, x0 + w, y0, C, 3) +
      '<path d="M' + x0 + ' ' + (y0 - 9) + ' h9 v9" fill="none" stroke="' + INK + '" stroke-width="1.2"/>' +
      txt(x0 + w / 2, y0 + 17, d.a, A) + txt(x0 - 6, y0 - h / 2 + 4, d.b, B, 'end') + txt(x0 + w / 2 + 8, y0 - h / 2 - 4, d.c, C, 'start');
  };

  // two angles that make a right angle (data-kind="comp") or a straight line (data-kind="supp").
  // data-given is the known angle in degrees (used to draw it); data-l1 / data-l2 are the labels (default "35°" and "?").
  draw.pair = function (s, d) {
    var g = +d.given, l1 = d.l1 || g + '°', l2 = d.l2 || '?', h = '';
    if (d.kind === 'comp') {
      var x0 = 18, y0 = 112, R = 104;
      size(s, 150, 122);
      h += line(x0, y0, x0 + R, y0) + line(x0, y0, x0, y0 - R) + line(x0, y0, x0 + R * Math.cos(rad(g)), y0 - R * Math.sin(rad(g)), C);
      h += '<path d="M' + x0 + ' ' + (y0 - 10) + ' h10 v10" fill="none" stroke="' + INK + '" stroke-width="1.2"/>';
      h += txt(x0 + 58 * Math.cos(rad(g / 2)), y0 - 58 * Math.sin(rad(g / 2)) + 4, l1, A);
      h += txt(x0 + 58 * Math.cos(rad((g + 90) / 2)), y0 - 58 * Math.sin(rad((g + 90) / 2)) + 4, l2, B);
    } else {
      var cx = 110, cy = 86, L = 96;
      size(s, 220, 100);
      h += line(cx - L, cy, cx + L, cy) + line(cx, cy, cx + 84 * Math.cos(rad(g)), cy - 84 * Math.sin(rad(g)), C);
      h += txt(cx + 46 * Math.cos(rad(g / 2)), cy - 46 * Math.sin(rad(g / 2)) + 4, l1, A);
      h += txt(cx + 46 * Math.cos(rad((g + 180) / 2)), cy - 46 * Math.sin(rad((g + 180) / 2)) + 4, l2, B);
    }
    s.innerHTML = h;
  };

  // two crossing lines. data-given is the angle between them (drawn); labels: data-l1 (that angle), data-l2 (the angle
  // across from it) and data-l3 (the angle beside it).
  draw.cross = function (s, d) {
    var g = +d.given, cx = 110, cy = 66, L = 90, h = '';
    size(s, 220, 132);
    h += line(cx - L, cy, cx + L, cy) + line(cx - L * Math.cos(rad(g)), cy + L * Math.sin(rad(g)), cx + L * Math.cos(rad(g)), cy - L * Math.sin(rad(g)), C);
    var at = function (deg, s2, col) { return txt(cx + 34 * Math.cos(rad(deg)), cy - 34 * Math.sin(rad(deg)) + 4, s2, col); };
    h += at(g / 2, d.l1 || g + '°', A) + at(180 + g / 2, d.l2 || 'x', B) + at((g + 180) / 2, d.l3 || 'y', C);
    s.innerHTML = h;
  };

  // two parallel lines cut by a transversal, with the eight angles numbered 1-8
  // (1 upper-left, 2 upper-right, 3 lower-left, 4 lower-right at the top line; 5-8 the same at the bottom line).
  draw.parallel = function (s, d) {
    var g = +d.given || 65, y1 = 40, y2 = 118, x1 = 150, dx = (y2 - y1) / Math.tan(rad(g)), x2 = x1 - dx, h = '';
    size(s, 250, 158);
    h += line(10, y1, 240, y1) + line(10, y2, 240, y2);
    h += '<path d="M200 ' + (y1 - 5) + ' l6 5 l-6 5 M200 ' + (y2 - 5) + ' l6 5 l-6 5" fill="none" stroke="' + INK + '" stroke-width="1.5"/>';
    var ext = 30 / Math.sin(rad(g));
    h += line(x1 + ext * Math.cos(rad(g)), y1 - 30, x2 - ext * Math.cos(rad(g)), y2 + 30, C);
    [[x1, y1, 1], [x2, y2, 5]].forEach(function (p) {
      [[(g + 180) / 2, 0], [g / 2, 1], [180 + g / 2, 2], [(180 + g + 360) / 2, 3]].forEach(function (q) {
        h += txt(p[0] + 20 * Math.cos(rad(q[0])), p[1] - 20 * Math.sin(rad(q[0])) + 4, String(p[2] + q[1]), A, 'middle', 12);
      });
    });
    s.innerHTML = h;
  };

  // coordinate grid from -r to r, with optional points: data-pts="A:2,-1;B:-3,4"
  // data-step="1" labels every number (default every 2nd); data-q1 draws only the first quadrant, 0 to r
  draw.grid = function (s, d) {
    var r = +(d.r || 6), u = +(d.u || 14), step = +(d.step || 2), q1 = 'q1' in d;
    if (q1) return gridQ1(s, d, r, u, step);
    var W = 2 * r * u + 30, o = W / 2, h = '';
    size(s, W, W);
    for (var i = -r; i <= r; i++) {
      h += line(o + i * u, 15, o + i * u, W - 15, '#dde2ec', 1) + line(15, o + i * u, W - 15, o + i * u, '#dde2ec', 1);
      if (i && i % step === 0) h += txt(o + i * u, o + 12, i, MUTED, 'middle', 9) + txt(o - 4, o - i * u + 3, i, MUTED, 'end', 9);
    }
    h += line(15, o, W - 15, o, INK, 1.5) + line(o, 15, o, W - 15, INK, 1.5) + txt(W - 10, o - 4, 'x', INK, 'middle', 11) + txt(o + 7, 12, 'y', INK, 'start', 11);
    h += gridPts(d, function (x, y) { return [o + x * u, o - y * u]; });
    s.innerHTML = h;
  };
  function gridPts(d, at) {
    var h = '';
    (d.pts || '').split(';').filter(Boolean).forEach(function (p) {
      var m = p.split(':'), xy = m[1].split(','), q = at(+xy[0], +xy[1]);
      h += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="3.5" fill="' + C + '"/>' + txt(q[0] + 5, q[1] - 5, m[0], C, 'start', 11);
    });
    return h;
  }
  function gridQ1(s, d, r, u, step) {
    var L = 26, T = 15, W = L + r * u + 18, H = T + r * u + 24, oy = T + r * u, h = '';
    size(s, W, H);
    for (var i = 0; i <= r; i++) {
      h += line(L + i * u, T, L + i * u, oy, '#dde2ec', 1) + line(L, oy - i * u, L + r * u, oy - i * u, '#dde2ec', 1);
      if (i % step === 0) h += txt(L + i * u, oy + 13, i, MUTED, 'middle', 9) + (i ? txt(L - 5, oy - i * u + 3, i, MUTED, 'end', 9) : '');
    }
    h += line(L, oy, L + r * u + 10, oy, INK, 1.5) + line(L, oy, L, T - 8, INK, 1.5) + txt(L + r * u + 13, oy - 4, 'x', INK, 'middle', 11) + txt(L + 6, T - 4, 'y', INK, 'start', 11);
    h += gridPts(d, function (x, y) { return [L + x * u, oy - y * u]; });
    s.innerHTML = h;
  }

  // a row of coins: data-coins="Q,Q,D,N,P"
  draw.coins = function (s, d) {
    var spec = { Q: [15, '25¢', '#c9ced8'], D: [10.5, '10¢', '#c9ced8'], N: [12.5, '5¢', '#b8bec9'], P: [11.5, '1¢', '#d0875a'] };
    var list = d.coins.split(','), x = 4, h = '';
    list.forEach(function (c) {
      var sp = spec[c.trim()], rr = sp[0];
      h += '<circle cx="' + (x + rr) + '" cy="17" r="' + rr + '" fill="' + sp[2] + '" stroke="#6b7280" stroke-width="1.2"/>' +
        txt(x + rr, 20.5, sp[1], INK, 'middle', rr > 12 ? 9.5 : 8);
      x += 2 * rr + 5;
    });
    size(s, x, 34);
    s.innerHTML = h;
  };

  // two similar rectangles side by side: data-r1="4,6" data-r2="10,15" (real sizes) and labels data-l1 / data-l2
  draw.rects = function (s, d) {
    var p = d.r1.split(',').map(Number), q = d.r2.split(',').map(Number);
    var lp = (d.l1 || d.r1).split(','), lq = (d.l2 || d.r2).split(',');
    var k = 70 / Math.max(p[1], q[1], p[0] * 0.6, q[0] * 0.6), h = '', x = 22, H = Math.max(p[1], q[1]) * k + 30;
    [[p, lp, A], [q, lq, C]].forEach(function (r) {
      var w = r[0][0] * k, hh = r[0][1] * k, y = H - 18 - hh;
      h += '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(w) + '" height="' + r1(hh) + '" fill="none" stroke="' + r[2] + '" stroke-width="2.5"/>';
      h += txt(x + w / 2, H - 4, r[1][0], r[2]) + txt(x - 5, y + hh / 2 + 4, r[1][1], r[2], 'end');
      x += w + 40;
    });
    size(s, x, H);
    s.innerHTML = h;
  };

  function run() {
    // exit tickets print two to a page: copy the ticket below a dashed cut line
    var tk = document.querySelectorAll('.ticket[data-twice]');
    for (var t = 0; t < tk.length; t++) {
      var cut = document.createElement('div');
      cut.className = 'cut'; cut.setAttribute('aria-hidden', 'true'); cut.textContent = '✂ cut here';
      var copy = tk[t].cloneNode(true);
      copy.removeAttribute('data-twice'); copy.setAttribute('aria-hidden', 'true');
      tk[t].parentNode.insertBefore(cut, tk[t].nextSibling);
      cut.parentNode.insertBefore(copy, cut.nextSibling);
    }
    var svgs = document.querySelectorAll('svg[data-draw]');
    for (var i = 0; i < svgs.length; i++) {
      var s = svgs[i], f = draw[s.getAttribute('data-draw')];
      s.setAttribute('aria-hidden', 'true');
      if (f) f(s, s.dataset);
    }
    var pb = document.getElementById('print-btn');
    if (pb) pb.addEventListener('click', function () { window.print(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
