// Area Artist - the pictures.
// Every picture is pixel art drawn by code, so it can be drawn at any grid size, and it comes out a little
// different every time (the time of day, where things stand, which colors). The pictures are 3:2: in a scene's
// drawing code x runs from 0 to 1.5 and y from 0 (top) to 1 (bottom), whatever size it is drawn at.
//   AreaArtistScenes.list                     - every scene: { id, en, es, theme, draw }
//   AreaArtistScenes.render(id, seed, W, H)   - a W x H canvas, one pixel per small square of the artwork
(function () {
  'use strict';
  var X = 1.5;

  // ---------- colors ----------
  var HEX = {};
  function hex(c) {
    if (HEX[c]) return HEX[c];
    var s = c.replace('#', '');
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    var n = parseInt(s, 16);
    return (HEX[c] = [n >> 16 & 255, n >> 8 & 255, n & 255]);
  }
  function C(c) { return typeof c === 'string' ? hex(c) : c; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mixc(a, b, t) { a = C(a); b = C(b); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function along(stops, t) {
    var s = clamp(t, 0, 1) * (stops.length - 1), k = Math.min(Math.floor(s), stops.length - 2);
    return mixc(stops[k], stops[k + 1], s - k);
  }

  // ---------- randomness ----------
  function mulberry(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(i, j, s) {
    var h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 982451653)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(seed) {   // smooth 2D noise, 0..1
    return function (x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      return lerp(lerp(hash(xi, yi, seed), hash(xi + 1, yi, seed), u), lerp(hash(xi, yi + 1, seed), hash(xi + 1, yi + 1, seed), u), v);
    };
  }
  function fbm(n, x, y) { return n(x, y) * 0.55 + n(x * 2.1, y * 2.1) * 0.3 + n(x * 4.3, y * 4.3) * 0.15; }
  var BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  var FLAT = false;   // true while drawing a picture made of solid squares: no dithering, no speckled textures
  function bay(i, j) { if (FLAT) return 0.5; return (BAY[(j & 3) * 4 + (i & 3)] + 0.5) / 16; }

  // ---------- shapes: a test(x, y) with a bounding box .bb = [x0, y0, x1, y1] ----------
  function S(test, bb) { test.bb = bb; return test; }
  function rect(x0, y0, x1, y1) { return S(function (x, y) { return x >= x0 && x < x1 && y >= y0 && y < y1; }, [x0, y0, x1, y1]); }
  function circ(cx, cy, r) { var r2 = r * r; return S(function (x, y) { var dx = x - cx, dy = y - cy; return dx * dx + dy * dy <= r2; }, [cx - r, cy - r, cx + r, cy + r]); }
  function ell(cx, cy, rx, ry, rot) {
    var c = Math.cos(rot || 0), s = Math.sin(rot || 0), m = Math.max(rx, ry);
    return S(function (x, y) {
      var dx = x - cx, dy = y - cy, u = dx * c + dy * s, v = -dx * s + dy * c;
      return u * u / (rx * rx) + v * v / (ry * ry) <= 1;
    }, [cx - m, cy - m, cx + m, cy + m]);
  }
  function poly(pts) {
    var x0 = 9, y0 = 9, x1 = -9, y1 = -9;
    pts.forEach(function (q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); });
    return S(function (x, y) {
      var inside = false;
      for (var a = 0, b = pts.length - 1; a < pts.length; b = a++) {
        var ya = pts[a][1], yb = pts[b][1];
        if ((ya > y) !== (yb > y) && x < (pts[b][0] - pts[a][0]) * (y - ya) / (yb - ya) + pts[a][0]) inside = !inside;
      }
      return inside;
    }, [x0, y0, x1, y1]);
  }
  function seg(x0, y0, x1, y1, w) {
    var dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1e-9, h = w / 2;
    return S(function (x, y) {
      var t = ((x - x0) * dx + (y - y0) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      var ex = x0 + t * dx - x, ey = y0 + t * dy - y;
      return ex * ex + ey * ey <= h * h;
    }, [Math.min(x0, x1) - h, Math.min(y0, y1) - h, Math.max(x0, x1) + h, Math.max(y0, y1) + h]);
  }
  function or() {
    var list = Array.prototype.slice.call(arguments), bb = [9, 9, -9, -9];
    list.forEach(function (s) { var b = s.bb || [0, 0, X, 1]; bb = [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])]; });
    return S(function (x, y) { for (var k = 0; k < list.length; k++) if (list[k](x, y)) return true; return false; }, bb);
  }
  function and(a, b) { return S(function (x, y) { return a(x, y) && b(x, y); }, a.bb); }
  function minus(a, b) { return S(function (x, y) { return a(x, y) && !b(x, y); }, a.bb); }
  function below(f, y0, y1) { return S(function (x, y) { return y >= f(x) && y < (y1 === undefined ? 9 : y1); }, [0, y0 || 0, X, 1]); }

  // ---------- color fills ----------
  function grad(stops, y0, y1, bands) {   // a banded, dithered vertical gradient - the pixel-art sky look
    stops = stops.map(C); bands = bands || 12;
    return function (x, y, i, j) {
      var t = clamp((y - y0) / (y1 - y0), 0, 1) * bands, b = Math.floor(t);
      if (t - b > bay(i, j)) b++;
      return along(stops, Math.min(b, bands) / bands);
    };
  }
  function rgrad(cx, cy, r, stops, bands, sy) {   // the same, going out from a point
    stops = stops.map(C); bands = bands || 8; sy = sy || 1;
    return function (x, y, i, j) {
      var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy) * sy * sy) / r;
      var t = clamp(d, 0, 1) * bands, b = Math.floor(t);
      if (t - b > bay(i, j)) b++;
      return along(stops, Math.min(b, bands) / bands);
    };
  }
  function tex(base, alt, prob, salt) { base = C(base); alt = C(alt); return function (x, y, i, j) { return !FLAT && hash(i, j, salt || 1) < prob ? alt : base; }; }
  function side(cx, light, dark) { return function (x) { return x > cx ? dark : light; }; }

  // ---------- the painter ----------
  function Painter(W, H, seed) {
    this.W = W; this.H = H; this.px = 1 / H;
    this.d = new Uint8ClampedArray(W * H * 4);
    for (var k = 3; k < this.d.length; k += 4) this.d[k] = 255;
    this.r = mulberry(seed);
    this.seed = seed;
    this.q = 1;                       // pixels across each square (more than 1 when the picture becomes solid squares)
    this.m = new Uint8Array(W * H);   // 1 where the main subject is, for its outline
    this.fg = false;
  }
  var P = Painter.prototype;
  P.rand = function (a, b) { return a + (b - a) * this.r(); };
  P.pick = function (arr) { return arr[Math.floor(this.r() * arr.length)]; };
  P.chance = function (q) { return this.r() < q; };
  P.get = function (i, j) {
    i = clamp(i, 0, this.W - 1); j = clamp(j, 0, this.H - 1);
    var k = (j * this.W + i) * 4, d = this.d; return [d[k], d[k + 1], d[k + 2]];
  };
  P.set = function (i, j, c, a) {
    if (i < 0 || j < 0 || i >= this.W || j >= this.H) return;
    var k = (j * this.W + i) * 4, d = this.d;
    if (a === undefined || a >= 0.5) this.m[j * this.W + i] = this.fg ? 1 : 0;
    if (a === undefined || a >= 1) { d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; }
    else if (a > 0) { d[k] += (c[0] - d[k]) * a; d[k + 1] += (c[1] - d[k + 1]) * a; d[k + 2] += (c[2] - d[k + 2]) * a; }
  };
  // paint every pixel whose center is inside the shape. col: a color, or fn(x, y, i, j) returning one (or null to skip).
  P.fill = function (shape, col, alpha) {
    var bb = shape.bb || [0, 0, X, 1], H = this.H, W = this.W, t = this.T;
    if (t) bb = [t.ax + (bb[0] - t.cx) * t.s, t.ay + (bb[1] - t.cy) * t.s, t.ax + (bb[2] - t.cx) * t.s, t.ay + (bb[3] - t.cy) * t.s];
    var i0 = Math.max(0, Math.floor(bb[0] * H)), i1 = Math.min(W - 1, Math.ceil(bb[2] * H));
    var j0 = Math.max(0, Math.floor(bb[1] * H)), j1 = Math.min(H - 1, Math.ceil(bb[3] * H));
    var fn = typeof col === 'function', c = fn ? null : C(col), afn = typeof alpha === 'function';
    for (var j = j0; j <= j1; j++) {
      var y = (j + 0.5) / H;
      if (t) y = (y - t.ay) / t.s + t.cy;
      for (var i = i0; i <= i1; i++) {
        var x = (i + 0.5) / H;
        if (t) x = (x - t.ax) / t.s + t.cx;
        if (!shape(x, y)) continue;
        var cc = fn ? col(x, y, i, j) : c;
        if (!cc) continue;
        var a = alpha === undefined ? 1 : afn ? alpha(x, y, i, j) : alpha;
        this.set(i, j, C(cc), a);
      }
    }
  };
  P.line = function (x0, y0, x1, y1, w, col, alpha) { this.fill(seg(x0, y0, x1, y1, Math.max(w, this.px * 1.05)), col, alpha); };
  // a curve through fn(t) for t = 0..1, width w(t) (or a number), color col(t) (or a color)
  P.curve = function (fn, n, w, col) {
    var a = fn(0);
    for (var k = 1; k <= n; k++) {
      var t = k / n, b = fn(t);
      this.line(a[0], a[1], b[0], b[1], typeof w === 'function' ? w(t) : w, typeof col === 'function' ? col(t) : col);
      a = b;
    }
  };
  // the main subject, drawn s times bigger: the point (cx, cy) of its drawing lands at (ax, ay) in the picture.
  // It is also outlined (see subject).
  P.hero = function (cx, cy, ax, ay, s, fn) {
    var self = this;
    this.T = { cx: cx, cy: cy, ax: ax, ay: ay, s: s };
    this.subject(function () { try { fn(); } finally { self.T = null; } });
  };
  P.dot = function (x, y, col, a) {
    var t = this.T; if (t) { x = t.ax + (x - t.cx) * t.s; y = t.ay + (y - t.cy) * t.s; }
    this.cell(Math.floor(x * this.H), Math.floor(y * this.H), C(col), a);
  };
  // one pixel - or, in a picture of squares, the whole square it falls in
  P.cell = function (i, j, c, a) {
    var q = this.q;
    if (q === 1) return this.set(i, j, c, a);
    i = Math.floor(i / q) * q; j = Math.floor(j / q) * q;
    for (var y = 0; y < q; y++) for (var x = 0; x < q; x++) this.set(i + x, j + y, c, a === undefined ? 1 : Math.max(a, 0.6));
  };
  // n small details (flowers, glints...) tuned for a 120-pixel-wide picture, scaled for a picture of squares
  P.few = function (n) { return this.q === 1 ? n : Math.max(1, Math.round(n * this.W / this.q / 120)); };
  // the main subject: everything drawn inside fn gets a dark outline in a picture of squares
  P.subject = function (fn) { this.fg = true; try { fn(); } finally { this.fg = false; } };
  P.glow = function (x, y, R, col, k) {
    this.fill(circ(x, y, R), col, function (xx, yy, i, j) {
      var d = Math.sqrt((xx - x) * (xx - x) + (yy - y) * (yy - y)) / R, a = (1 - d) * (1 - d) * k;
      return Math.floor(a * 6 + bay(i, j)) / 6;
    });
  };
  // mirror everything above the line hy into the water below it, tinted
  P.reflect = function (hy, y1, tint, amt, ripple) {
    var H = this.H, W = this.W, hj = Math.round(hy * H), j1 = Math.min(H, Math.round(y1 * H)), t = C(tint);
    for (var j = hj; j < j1; j++) {
      var sj = Math.max(0, 2 * hj - j - 1), d = (j - hj) / Math.max(1, j1 - hj);
      var off = ripple ? Math.round(Math.sin(j * 1.9 + this.seed) * ripple * (hash(0, j, this.seed) < 0.5 ? 1 : 0)) : 0;
      for (var i = 0; i < W; i++) this.set(i, j, mixc(this.get(i + off, sj), t, Math.min(1, amt + d * 0.3)));
    }
  };
  P.glints = function (y0, y1, col, n, x0, x1) {
    col = C(col); n = this.q > 1 ? Math.ceil(this.few(n) / 2) : n;
    for (var k = 0; k < n; k++) {
      var i = Math.floor(this.rand(x0 || 0, x1 || X) * this.H), j = Math.floor(this.rand(y0, y1) * this.H), len = 1 + Math.floor(this.r() * 3);
      for (var q = 0; q < len; q++) this.cell(i + q * this.q, j, col, 0.8);
    }
  };
  P.stars = function (n, y0, y1, cols) {
    cols = (cols || ['#ffffff', '#fff4c9', '#cfe0ff']).map(C);
    if (this.q > 1) {
      n = Math.ceil(n / (this.q * this.q));
      for (var s = 0; s < n; s++) this.cell(Math.floor(this.r() * this.W), Math.floor(this.rand(y0, y1) * this.H), cols[s % cols.length]);
      return;
    }
    for (var k = 0; k < n; k++) {
      var i = Math.floor(this.r() * this.W), j = Math.floor(this.rand(y0, y1) * this.H), c = cols[k % cols.length];
      this.set(i, j, c, this.rand(0.55, 1));
      if (this.r() < 0.12) { this.set(i - 1, j, c, 0.45); this.set(i + 1, j, c, 0.45); this.set(i, j - 1, c, 0.45); this.set(i, j + 1, c, 0.45); }
    }
  };
  P.sprinkle = function (shape, n, cols, a) {   // n random single pixels inside a shape
    cols = cols.map(C); n = this.few(n);
    var bb = shape.bb || [0, 0, X, 1];
    for (var k = 0, tries = 0; k < n && tries < n * 8; tries++) {
      var x = this.rand(bb[0], bb[2]), y = this.rand(bb[1], bb[3]);
      if (!shape(x, y)) continue;
      this.dot(x, y, cols[k % cols.length], a); k++;
    }
  };
  P.bird = function (x, y, col) {
    var i = Math.floor(x * this.H), j = Math.floor(y * this.H), s = this.H >= 70 ? 2 : 1, c = C(col);
    if (this.q > 1) { var q = this.q; this.cell(i, j, c); this.cell(i - q, j - q, c); this.cell(i + q, j - q, c); return; }
    this.set(i, j, c);
    for (var q = 1; q <= 2 * s; q++) { var up = Math.min(q, s); this.set(i - q, j - up, c); this.set(i + q, j - up, c); }
  };

  // ---------- scenery ----------
  var SKY = {
    day: ['#3b7dd8', '#69a9ee', '#a8d8ff', '#e2f4ff'],
    sunset: ['#2a1b5c', '#6b2f7d', '#c9486b', '#ff8a57', '#ffd27d'],
    dawn: ['#4a67b8', '#9a8cc8', '#f2a7a8', '#ffe2b0'],
    night: ['#040716', '#0b1236', '#1b2a66', '#2e4386'],
    dusk: ['#141040', '#3d2766', '#8d3f73', '#e0735e']
  };
  function sky(p, t, y1) { p.fill(rect(0, 0, X, y1), grad(SKY[t] || t, 0, y1)); }
  function sun(p, x, y, r, core, glowC, k) { p.glow(x, y, r * 3.4, glowC, k || 0.6); p.fill(circ(x, y, r), core); }
  function moon(p, x, y, r, col, crater, phase) {
    p.glow(x, y, r * 3, col, 0.35);
    var disc = circ(x, y, r);
    if (phase) disc = minus(disc, circ(x + r * phase, y - r * 0.25, r * 0.92));
    p.fill(disc, col);
    if (!phase && crater) {
      p.fill(and(circ(x - r * 0.3, y - r * 0.2, r * 0.25), disc), crater);
      p.fill(and(circ(x + r * 0.35, y + r * 0.3, r * 0.18), disc), crater);
      p.fill(and(circ(x + r * 0.1, y - r * 0.5, r * 0.12), disc), crater);
    }
  }
  function cloud(p, x, y, w, light, shade) {
    var sh = and(or(ell(x, y, w * 0.5, w * 0.13), circ(x - w * 0.2, y - w * 0.06, w * 0.15), circ(x + w * 0.04, y - w * 0.11, w * 0.2), circ(x + w * 0.26, y - w * 0.03, w * 0.13)), rect(x - w, y - w, x + w, y + w * 0.1));
    p.fill(sh, function (xx, yy) { return yy > y + w * 0.03 ? shade : light; });
  }
  function clouds(p, n, y0, y1, light, shade, w0, w1) { for (var k = 0; k < n; k++) cloud(p, p.rand(-0.1, X + 0.1), p.rand(y0, y1), p.rand(w0 || 0.14, w1 || 0.3), light, shade); }
  function peaksRand(p, n, y0, y1) { var a = []; for (var k = 0; k < n; k++) a.push([(k + 0.5) / n * X + p.rand(-0.12, 0.12), p.rand(y0, y1)]); return a; }
  function mountains(p, o) {
    var pk = o.peaks, n = vnoise(Math.floor(p.r() * 1e6)), slope = o.slope || 1.1, jag = o.jag === undefined ? 0.02 : o.jag;
    var top = 9; pk.forEach(function (q) { top = Math.min(top, q[1]); });
    function ridge(x) {
      var best = 9, k = 0;
      for (var q = 0; q < pk.length; q++) { var yy = pk[q][1] + Math.abs(x - pk[q][0]) * slope; if (yy < best) { best = yy; k = q; } }
      return [best + (n(x * 22, 0.5) - 0.5) * jag, pk[k][0], pk[k][1]];
    }
    p.fill(S(function (x, y) { return y >= ridge(x)[0] && y < o.base; }, [0, top - 0.03, X, o.base]), function (x, y) {
      var rg = ridge(x), right = x > rg[1];
      if (o.snow && y < rg[2] + o.snowDepth * (0.55 + n(x * 30, 3) * 0.9)) return right ? o.snowShade : o.snow;
      return right ? o.dark : o.light;
    });
  }
  function wav(p, amp, f) {
    var a = p.rand(0, 6.28), b = p.rand(0, 6.28), f2 = f * p.rand(1.8, 2.6);
    return function (x) { return amp * (Math.sin(x * f + a) * 0.7 + Math.sin(x * f2 + b) * 0.3); };
  }
  function hill(p, f, col, y1) { p.fill(below(f, 0, y1), col); }
  function pine(p, x, base, h, col, shade, trunk, snow) {
    if (trunk) p.fill(rect(x - h * 0.045, base - h * 0.16, x + h * 0.045, base), trunk);
    for (var k = 0; k < 3; k++) {
      var t = base - h + k * h * 0.25, b = t + h * 0.45, hw = h * (0.15 + 0.07 * k);
      p.fill(poly([[x, t], [x + hw, b], [x - hw, b]]), function (xx, yy) {
        if (snow && yy < t + (b - t) * 0.35) return snow;
        return xx > x ? shade : col;
      });
    }
  }
  function treeLine(p, y, h0, h1, col, shade, x0, x1) {
    for (var x = (x0 === undefined ? 0 : x0) - 0.02; x < (x1 === undefined ? X : x1) + 0.02; x += p.rand(0.018, 0.04)) pine(p, x, y + p.rand(0, 0.012), p.rand(h0, h1), col, shade);
  }
  function roundTree(p, x, base, h, leaf, dark, trunk, hi) {
    p.fill(rect(x - h * 0.05, base - h * 0.5, x + h * 0.05, base), trunk);
    var cy = base - h * 0.64, R = h * 0.3;
    var sh = or(circ(x, cy, R), circ(x - R * 0.72, cy + R * 0.35, R * 0.68), circ(x + R * 0.72, cy + R * 0.35, R * 0.68), circ(x + R * 0.05, cy - R * 0.55, R * 0.66));
    p.fill(sh, function (xx, yy, i, j) {
      var d = (xx - x) + (yy - cy);
      if (d > R * 0.55) return dark;
      if (hi && d < -R * 0.55 && hash(i, j, 7) < 0.55) return hi;
      return leaf;
    });
  }
  function palm(p, x, base, h, lean, trunk, trunk2, leaf, leafDark) {
    var tx = x + lean * h, ty = base - h;
    p.curve(function (t) { return [x + lean * h * t * t, base - h * t]; }, 10, function (t) { return h * (0.07 - t * 0.03); }, function (t) { return Math.floor(t * 10) % 2 ? trunk : trunk2; });
    [-2.9, -2.3, -1.6, -0.9, -0.3, 0.2, 3.3].forEach(function (a, q) {
      var L = h * (0.42 + (q % 2) * 0.1);
      p.curve(function (s) { return [tx + Math.cos(a) * L * s, ty + Math.sin(a) * L * s * 0.6 + L * 0.5 * s * s]; }, 8,
        function (s) { return h * 0.07 * (1 - s * 0.7); }, q % 2 ? leaf : leafDark);
    });
    p.fill(circ(tx - h * 0.03, ty + h * 0.05, h * 0.035), '#6b4424');
    p.fill(circ(tx + h * 0.03, ty + h * 0.06, h * 0.035), '#5a381d');
  }
  function flowers(p, shape, n, cols) { p.sprinkle(shape, n, cols); }
  function fish(p, x, y, s, body, fin, dir) {
    dir = dir || 1;
    p.fill(ell(x, y, s, s * 0.45), body);
    p.fill(poly([[x - dir * s * 0.8, y], [x - dir * s * 1.5, y - s * 0.45], [x - dir * s * 1.5, y + s * 0.45]]), fin);
    p.dot(x + dir * s * 0.5, y - s * 0.1, '#10131c');
  }
  function bubbles(p, n, y0, y1, col) {
    for (var k = 0; k < n; k++) {
      var x = p.rand(0, X), y = p.rand(y0, y1), r = p.rand(0.006, 0.016);
      if (r * p.H < 1.2) p.dot(x, y, col, 0.8);
      else p.fill(minus(circ(x, y, r), circ(x, y, r - p.px)), col, 0.8);
    }
  }
  function rays(p, y1, a) {   // soft beams of sunlight coming down through the water
    var o = p.rand(0, 1);
    p.fill(rect(0, 0, X, y1), '#ffffff', function (x, y, i, j) {
      var v = ((x + y * 0.35 + o) * 5) % 1;
      return v < 0.22 ? Math.floor(a * (1 - y / y1) * 6 + bay(i, j)) / 6 : 0;
    });
  }
  function seaweed(p, x, base, h, col) {
    var ph = p.rand(0, 6);
    p.curve(function (t) { return [x + Math.sin(t * 7 + ph) * 0.02, base - h * t]; }, 10, function (t) { return 0.022 * (1 - t * 0.6); }, col);
  }

  // ---------- the scenes ----------
  // Every scene is built to read as a picture of solid squares as small as 24 x 16: one big main subject in two or
  // three flat tones (outlined, the way sprites are drawn) on a simple background. The subject is drawn with p.hero
  // in its own box - x from -0.75 to 0.75, y from -0.5 (top) to 0.5 (bottom) - and then placed and sized.
  var L = [];
  function scene(id, en, es, theme, draw) { L.push({ id: id, en: en, es: es, theme: theme, draw: draw }); }
  function dark(c, t) { return mixc(c, '#000000', t || 0.3); }
  function spaceBg(p, top, bot) {
    p.fill(rect(0, 0, X, 1), grad([top || '#080b24', bot || '#1c1747'], 0, 1, 5));
    p.stars(Math.floor(p.W * p.H / 45), 0, 1, ['#ffffff', '#fff1b8', '#bcd4ff']);
  }
  function underwater(p) { p.fill(rect(0, 0, X, 1), grad(['#57c7ea', '#1f86c0', '#0d4f8a'], 0, 1, 5)); }
  function sandFloor(p, y) { var w = wav(p, 0.02, 5); p.fill(below(function (x) { return y + w(x); }, y - 0.03), '#e8cf8f'); }
  function flip(p) { return p.chance(0.5) ? 1 : -1; }

  // ===== nature =====
  scene('mountain-lake', 'Mountain Lake', 'Lago de montaña', 'nature', function (p) {
    var t = p.pick(['day', 'sunset', 'dawn']), hz = 0.62;
    var T = {
      day: { m: ['#7d93c8', '#5f74a8'], far: '#b3c4e8', tree: ['#2f7a4f', '#1f5a39'], water: '#3a78c0' },
      sunset: { m: ['#8a5a8f', '#6a4274'], far: '#b784ad', tree: ['#2b2342', '#1e1830'], water: '#4a2f6e' },
      dawn: { m: ['#8f86c0', '#6f68a0'], far: '#c7badf', tree: ['#34405f', '#26304b'], water: '#6a78b8' }
    }[t];
    sky(p, t, hz);
    var mx = p.rand(0.62, 0.88);
    sun(p, mx < 0.75 ? p.rand(1.15, 1.3) : p.rand(0.2, 0.35), t === 'day' ? 0.15 : 0.3, 0.06, '#fff4c4', '#ffd98a', 0.4);
    mountains(p, { peaks: [[mx - 0.55, 0.36], [mx + 0.55, 0.33]], base: hz, light: T.far, dark: T.far, jag: 0, slope: 0.9 });
    p.hero(0, 0, mx, hz - 0.26, 0.52, function () {
      p.fill(poly([[-0.85, 0.5], [0, -0.5], [0.85, 0.5]]), function (x, y) {
        if (y < -0.14 + Math.abs(Math.sin(x * 14)) * 0.08) return x > 0 ? '#c9d3ee' : '#ffffff';
        return x > 0 ? T.m[1] : T.m[0];
      });
    });
    p.reflect(hz, 1, T.water, 0.45, 0);
    var right = mx < 0.75, shore = function (x) { var d = right ? X - x : x; return 0.8 + d * 0.3; };
    p.fill(below(shore, 0.78), T.tree[1]);
    var tx = right ? X - 0.12 : 0.12;
    pine(p, tx, 0.97, 0.52, T.tree[0], T.tree[1], '#4a3222');
    pine(p, tx + (right ? -0.17 : 0.17), 0.99, 0.36, T.tree[0], T.tree[1], '#4a3222');
  });

  scene('cherry-blossom', 'Cherry Blossom Tree', 'Cerezo en flor', 'nature', function (p) {
    sky(p, ['#6fa8ec', '#a9d3f7', '#e4f3ff'], 0.75);
    var tx = p.chance(0.5) ? p.rand(0.45, 0.6) : p.rand(0.9, 1.05), fx = tx < 0.75 ? 1.2 : 0.3;
    cloud(p, fx, 0.18, 0.3, '#ffffff', '#dbe9f7');
    p.fill(poly([[fx - 0.4, 0.74], [fx - 0.06, 0.4], [fx + 0.06, 0.4], [fx + 0.4, 0.74]]), function (x, y) { return y < 0.49 ? '#ffffff' : '#9aaed8'; });
    var w = wav(p, 0.03, 3);
    hill(p, function (x) { return 0.72 + w(x); }, '#7cc35c');
    p.fill(below(function (x) { return 0.87 + w(x) * 0.5; }, 0.8), '#5fae4f');
    p.hero(0, 0, tx, 0.47, 0.86, function () {
      p.line(0, 0.5, 0.02, 0, 0.1, '#6b4431');
      p.line(0.01, 0.12, -0.22, -0.12, 0.06, '#6b4431');
      p.line(0.01, 0.1, 0.24, -0.1, 0.06, '#6b4431');
      [[0, -0.22, 0.26], [-0.31, -0.1, 0.2], [0.31, -0.08, 0.2], [-0.17, -0.34, 0.18], [0.18, -0.33, 0.19], [0.02, 0.0, 0.17]].forEach(function (b) {
        p.fill(circ(b[0], b[1], b[2]), function (x, y) { var d = (x - b[0]) + (y - b[1]); return d > b[2] * 0.6 ? '#e57fa5' : d < -b[2] * 0.7 ? '#ffd6e5' : '#f7a8c6'; });
      });
    });
    p.sprinkle(rect(0, 0.2, X, 0.95), 30, ['#f7a8c6', '#ffd6e5']);
    flowers(p, rect(0, 0.85, X, 1), 30, ['#ffffff', '#ffe36e']);
  });

  scene('desert-cactus', 'Desert Cactus', 'Cactus del desierto', 'nature', function (p) {
    var t = p.pick(['day', 'sunset']), hz = 0.66, cx = p.rand(0.45, 1.05);
    sky(p, t === 'day' ? ['#4f8fdc', '#8cc1f0', '#f4e1c1'] : SKY.sunset, hz);
    sun(p, cx < 0.75 ? 1.25 : 0.25, 0.22, 0.08, '#fff4c4', '#ffcf7a', 0.4);
    var mc = t === 'day' ? ['#d9895a', '#b86a40'] : ['#a8506a', '#843c56'];
    [[0.02, 0.3, 0.5], [1.0, 1.46, 0.46]].forEach(function (m) {
      p.fill(rect(m[0], m[2], m[1], hz + 0.02), mc[0]); p.fill(rect(m[1] - 0.05, m[2], m[1], hz + 0.02), mc[1]);
    });
    p.fill(rect(0, hz, X, 1), t === 'day' ? '#ecc583' : '#d49a72');
    p.hero(0, 0, cx, 0.52, 0.8, function () {
      var g = '#3f9a4f', d = '#2c7a3a', hi = '#6cc46a';
      function part(x0, y0, x1, y1) {
        var m = (x0 + x1) / 2, cut = m + (x1 - x0) * 0.15, col = function (x) { return x > cut ? d : x < x0 + (x1 - x0) * 0.25 ? hi : g; };
        p.fill(rect(x0, y0, x1, y1), col); p.fill(ell(m, y0, (x1 - x0) / 2, (x1 - x0) / 2), col);
      }
      part(-0.1, -0.4, 0.1, 0.5);
      part(-0.36, -0.15, -0.2, 0.12); p.fill(rect(-0.3, 0.02, -0.08, 0.12), g);
      part(0.2, -0.28, 0.36, 0.0); p.fill(rect(0.08, -0.1, 0.3, 0.0), d);
      p.fill(ell(0, -0.46, 0.07, 0.045), '#ff5d8f');
    });
    for (var k = 0; k < 3; k++) p.bird(p.rand(0.2, 1.3), p.rand(0.08, 0.2), '#3a3a4a');
  });

  scene('northern-lights', 'Northern Lights Cabin', 'Cabaña bajo la aurora', 'nature', function (p) {
    p.fill(rect(0, 0, X, 0.7), grad(['#050a24', '#10204a', '#1f3a6a'], 0, 0.7, 4));
    p.stars(Math.floor(p.W * p.H / 60), 0, 0.5);
    var ph = p.rand(0, 6);
    function band(y0, th, col) { p.fill(S(function (x, y) { var c = y0 + Math.sin(x * 4 + ph) * 0.06; return y > c && y < c + th; }, [0, 0, X, 0.7]), col); }
    band(0.1, 0.05, '#8a5cf0'); band(0.15, 0.1, '#3ee08f'); band(0.25, 0.04, '#9dffcf');
    var w = wav(p, 0.03, 3);
    hill(p, function (x) { return 0.66 + w(x); }, '#dfe9fa');
    p.fill(below(function (x) { return 0.82 + w(x) * 0.5; }, 0.7), '#c3d3ee');
    var cx = p.rand(0.55, 0.95);
    p.hero(0, 0, cx, 0.64, 0.46, function () {
      p.fill(rect(0.22, -0.56, 0.36, -0.2), '#4a3a36');
      p.fill(rect(-0.5, -0.05, 0.5, 0.5), function (x, y) { return Math.floor((y + 0.05) / 0.11) % 2 ? '#6b4430' : '#83553b'; });
      p.fill(poly([[-0.68, -0.02], [0, -0.5], [0.68, -0.02]]), function (x) { return x > 0 ? '#c9d6f0' : '#ffffff'; });
      p.fill(rect(-0.38, 0.08, -0.06, 0.32), '#ffd35e');
      p.fill(rect(-0.23, 0.08, -0.2, 0.32), '#83553b'); p.fill(rect(-0.38, 0.19, -0.06, 0.22), '#83553b');
      p.fill(rect(0.1, 0.15, 0.32, 0.5), '#3a2418');
    });
    pine(p, 0.12, 0.98, 0.5, '#16304a', '#0f2236', '#2a1c14', '#ffffff');
    pine(p, X - 0.12, 1.0, 0.56, '#16304a', '#0f2236', '#2a1c14', '#ffffff');
  });

  scene('palm-beach', 'Palm Tree Beach', 'Playa con palmera', 'nature', function (p) {
    var hz = 0.52, px = p.chance(0.5) ? p.rand(0.35, 0.55) : p.rand(0.95, 1.15), lean = px < 0.75 ? 0.28 : -0.28;
    sky(p, ['#2f8fe0', '#6ec0f5', '#c6ecff'], hz);
    sun(p, px < 0.75 ? 1.25 : 0.25, 0.16, 0.07, '#fffbe0', '#fff2a8', 0.4);
    cloud(p, px < 0.75 ? 1.0 : 0.5, 0.22, 0.3, '#ffffff', '#dbeefb');
    p.fill(rect(0, hz, X, 0.74), grad(['#1f7fb8', '#2fb0cf'], hz, 0.74, 3));
    p.fill(rect(0, 0.72, X, 0.76), '#ffffff');
    p.fill(rect(0, 0.76, X, 1), '#f3d99c');
    p.hero(0, 0, px, 0.5, 0.9, function () { palm(p, 0, 0.5, 0.95, lean, '#9a6c3c', '#7c542c', '#3aa35c', '#237a3e'); });
    var bx = px < 0.75 ? p.rand(1.0, 1.25) : p.rand(0.25, 0.5);
    p.subject(function () {
      p.fill(circ(bx, 0.88, 0.055), function (x) { var k = Math.floor((x - bx + 0.055) / 0.037); return k === 0 ? '#ff4d4d' : k === 1 ? '#ffffff' : '#4d8dff'; });
    });
  });

  scene('waterfall', 'Jungle Waterfall', 'Cascada en la selva', 'nature', function (p) {
    sky(p, ['#5aa7e6', '#a8dcf5'], 0.3);
    var wx = p.rand(0.6, 0.9);
    p.fill(rect(0, 0.18, X, 0.8), function (x, y) { return (Math.floor(x * 6) + Math.floor(y * 5)) % 2 ? '#8a7a66' : '#76685a'; });
    p.fill(rect(0, 0.15, X, 0.22), '#3f9a42');
    p.fill(rect(0, 0.76, X, 1), '#2fa6c4');
    p.hero(0, 0, wx, 0.46, 0.62, function () {
      p.fill(rect(-0.2, -0.5, 0.2, 0.45), function (x) { var c = Math.floor((x + 0.2) / 0.08) % 3; return c === 0 ? '#ffffff' : c === 1 ? '#bfe9ff' : '#8fd3f4'; });
      p.fill(ell(0, 0.47, 0.4, 0.1), '#ffffff');
    });
    [[0.1, 0.86, 0.17], [0.3, 0.97, 0.13], [X - 0.1, 0.87, 0.17], [X - 0.32, 0.97, 0.12], [0.06, 0.26, 0.12], [X - 0.06, 0.24, 0.12]].forEach(function (b) {
      p.fill(circ(b[0], b[1], b[2]), function (x, y) { return y > b[1] + b[2] * 0.2 ? '#1f7a36' : '#34a04c'; });
    });
    p.sprinkle(rect(0, 0.7, X, 1), 12, ['#ff5d8f', '#ffd166']);
  });

  scene('autumn-tree', 'Autumn Tree', 'Árbol de otoño', 'nature', function (p) {
    sky(p, ['#8fbfe8', '#d4e8f5', '#fff3dc'], 0.75);
    var tx = p.rand(0.5, 1.0), w = wav(p, 0.02, 3);
    hill(p, function (x) { return 0.76 + w(x); }, '#c9a25a');
    p.fill(below(function (x) { return 0.88 + w(x); }, 0.8), '#b88a44');
    var c = p.pick([['#f28b30', '#c95e18', '#ffc15a'], ['#e0452f', '#a82e1f', '#ff8a5a'], ['#f2b52c', '#c98b1c', '#ffe07a']]);
    p.hero(0, 0, tx, 0.44, 0.82, function () {
      p.fill(rect(-0.07, 0, 0.07, 0.5), function (x) { return x > 0.02 ? '#5a3a26' : '#7a5234'; });
      p.line(0, 0.1, -0.2, -0.08, 0.06, '#6a4430'); p.line(0, 0.08, 0.2, -0.06, 0.06, '#6a4430');
      [[0, -0.2, 0.3], [-0.3, -0.05, 0.22], [0.3, -0.05, 0.22], [-0.15, -0.35, 0.2], [0.17, -0.34, 0.2]].forEach(function (b) {
        p.fill(circ(b[0], b[1], b[2]), function (x, y) { var d = (x - b[0]) + (y - b[1]); return d > b[2] * 0.55 ? c[1] : d < -b[2] * 0.7 ? c[2] : c[0]; });
      });
    });
    p.sprinkle(rect(0, 0.3, X, 0.85), 25, [c[0], c[1], '#e0452f']);
    var px = tx < 0.75 ? p.rand(1.05, 1.3) : p.rand(0.2, 0.4);
    p.subject(function () {
      p.fill(ell(px, 0.9, 0.08, 0.055), function (x) { return Math.floor((x - px + 0.08) / 0.04) % 2 ? '#e07a1e' : '#f28b30'; });
      p.fill(rect(px - 0.01, 0.82, px + 0.012, 0.85), '#3f7a2a');
    });
  });

  scene('rainbow', 'Rainbow', 'Arcoíris', 'nature', function (p) {
    sky(p, ['#4a9be8', '#8cc8f5', '#d6efff'], 0.8);
    var cx = p.rand(0.68, 0.82);
    sun(p, cx < 0.75 ? 1.3 : 0.2, 0.12, 0.06, '#fffbe0', '#fff2a8', 0.4);
    p.hero(0, 0, cx, 0.5, 0.7, function () {
      ['#ff4d4d', '#ff9f40', '#ffe14d', '#57d05b', '#4d9bff', '#8a5cf0'].forEach(function (c, k) {
        var r1 = 0.9 - k * 0.08;
        p.fill(and(minus(circ(0, 0.5, r1), circ(0, 0.5, r1 - 0.08)), rect(-2, -2, 2, 0.5)), c);
      });
      cloud(p, -0.8, 0.46, 0.55, '#ffffff', '#dfeaf6'); cloud(p, 0.8, 0.46, 0.55, '#ffffff', '#dfeaf6');
    });
    var w = wav(p, 0.03, 3);
    hill(p, function (x) { return 0.8 + w(x); }, '#7cc35c');
    p.fill(below(function (x) { return 0.91 + w(x) * 0.5; }, 0.85), '#5bab45');
    flowers(p, rect(0, 0.86, X, 1), 30, ['#ffffff', '#ffe14d', '#ff7bac']);
  });

  scene('volcano', 'Volcano', 'Volcán', 'nature', function (p) {
    var hz = 0.8, vx = p.rand(0.6, 0.9);
    sky(p, ['#1a0c2e', '#5a1f4a', '#c0392b', '#ff8a4c'], hz);
    p.stars(Math.floor(p.W * p.H / 90), 0, 0.3);
    [[-0.12, 0.14, 0.09], [0.06, 0.08, 0.12], [0.22, 0.03, 0.1]].forEach(function (s) { p.fill(circ(vx + s[0], s[1], s[2]), '#6a5a6e'); });
    p.hero(0, 0, vx, 0.5, 0.64, function () {
      p.fill(poly([[-0.95, 0.5], [-0.14, -0.3], [0.14, -0.3], [0.95, 0.5]]), function (x) { return x > 0.05 ? '#3a2630' : '#533544'; });
      p.fill(poly([[-0.08, -0.3], [0.02, -0.3], [-0.26, 0.35], [-0.36, 0.35]]), '#ff6a2a');
      p.fill(poly([[0.03, -0.3], [0.11, -0.3], [0.36, 0.22], [0.27, 0.24]]), '#ff9a2a');
      p.fill(poly([[-0.14, -0.3], [0.14, -0.3], [0.24, -0.6], [-0.2, -0.64]]), function (x, y) { return y > -0.42 ? '#ffd65a' : '#ff8a2a'; });
      [[-0.32, -0.62], [0.34, -0.55], [0.02, -0.75]].forEach(function (b) { p.fill(circ(b[0], b[1], 0.06), '#ff6a2a'); });
    });
    p.fill(rect(0, hz, X, 1), '#1f2e5a');
    p.glints(hz + 0.03, 1, '#ff8a2a', 20, vx - 0.3, vx + 0.3);
  });

  // ===== space =====
  scene('ringed-planet', 'Ringed Planet', 'Planeta con anillos', 'space', function (p) {
    spaceBg(p);
    var x = p.rand(0.68, 0.82), y = p.rand(0.46, 0.54), rot = p.rand(-0.35, -0.15), c = Math.cos(rot), s = Math.sin(rot);
    var pal = p.pick([['#f3d9a0', '#d9a55f', '#b8743f'], ['#a8d0f0', '#6f9ad8', '#4a6ab0'], ['#f7b0c0', '#d9708a', '#a84a64']]);
    function rd(xx, yy) { var u = xx * c + yy * s, v = -xx * s + yy * c; return [Math.sqrt(u * u + v * v / 0.07), v]; }
    p.hero(0, 0, x, y, 0.9, function () {
      function ring(front) {
        p.fill(S(function (xx, yy) { var q = rd(xx, yy); return q[0] > 0.42 && q[0] < 0.72 && (front ? q[1] > 0 : q[1] <= 0); }, [-0.8, -0.5, 0.8, 0.5]),
          function (xx, yy) { var d = rd(xx, yy)[0]; return d < 0.52 ? '#f2e2c0' : d < 0.6 ? '#b89868' : '#e8d4a8'; });
      }
      ring(false);
      p.fill(circ(0, 0, 0.3), function (xx, yy) { var col = pal[Math.floor((yy + 0.3) / 0.1) % 3]; return xx + yy > 0.18 ? dark(col, 0.35) : col; });
      ring(true);
    });
    var mx = x < 0.75 ? 1.3 : 0.2;
    p.fill(circ(mx, 0.18, 0.07), function (xx, yy) { return (xx - mx) + (yy - 0.18) > 0.03 ? '#7a7e90' : '#c3c7d6'; });
  });

  scene('earthrise', 'Earth from the Moon', 'La Tierra desde la Luna', 'space', function (p) {
    spaceBg(p, '#04050d', '#0c1030');
    var ex = p.rand(0.55, 0.95);
    p.hero(0, 0, ex, 0.38, 0.64, function () {
      var disc = circ(0, 0, 0.45);
      p.fill(minus(circ(0, 0, 0.5), disc), '#6fb7ff');
      p.fill(disc, function (x, y) { return x + y * 0.4 > 0.22 ? '#1f4fa8' : '#2f78e0'; });
      var land = function (x, y) { return x + y * 0.4 > 0.22 ? '#2a7a36' : '#44b04f'; };
      p.fill(and(poly([[-0.32, -0.34], [-0.1, -0.4], [-0.02, -0.26], [-0.12, -0.12], [-0.2, -0.04], [-0.3, -0.14], [-0.38, -0.24]]), disc), land);
      p.fill(and(poly([[-0.16, 0.0], [-0.02, 0.02], [0.03, 0.12], [-0.05, 0.36], [-0.12, 0.32], [-0.18, 0.12]]), disc), land);
      p.fill(and(poly([[0.1, -0.32], [0.3, -0.34], [0.36, -0.12], [0.32, 0.1], [0.22, 0.3], [0.14, 0.12], [0.08, -0.04], [0.14, -0.16]]), disc), function (x, y) { return y > -0.05 && y < 0.1 ? '#c9a66b' : land(x, y); });
      p.fill(and(disc, rect(-1, -1, 1, -0.37)), '#ffffff');
      p.fill(and(disc, rect(-1, 0.39, 1, 1)), '#ffffff');
      p.fill(and(ell(-0.05, -0.1, 0.2, 0.03, -0.3), disc), '#ffffff');
      p.fill(and(ell(0.18, 0.2, 0.16, 0.025, 0.4), disc), '#ffffff');
    });
    p.fill(below(function (x) { return 0.78 + Math.sin(x * 3) * 0.03; }, 0.7), '#b0b0bc');
    for (var k = 0; k < 4; k++) {
      var cx = p.rand(0, X), cy = p.rand(0.86, 0.96), cr = p.rand(0.07, 0.11);
      p.fill(ell(cx, cy, cr, cr * 0.32), '#86868f');
      p.fill(and(ell(cx, cy, cr, cr * 0.32), rect(0, cy + cr * 0.12, X, 1)), '#d0d0d8');
    }
    var fx = ex < 0.75 ? p.rand(1.1, 1.3) : p.rand(0.2, 0.4);
    p.subject(function () {
      p.fill(rect(fx - 0.01, 0.6, fx + 0.01, 0.86), '#e0e0e8');
      p.fill(rect(fx + 0.01, 0.6, fx + 0.17, 0.71), function (x, y) { return x < fx + 0.07 && y < 0.655 ? '#2a4db8' : Math.floor((y - 0.6) / 0.022) % 2 ? '#ffffff' : '#e63946'; });
    });
  });

  scene('rocket-launch', 'Rocket Launch', 'Lanzamiento del cohete', 'space', function (p) {
    p.fill(rect(0, 0, X, 1), grad(p.pick([SKY.night, SKY.dusk]), 0, 1, 5));
    p.stars(Math.floor(p.W * p.H / 60), 0, 0.5);
    var rx = p.rand(0.6, 0.95), tx = rx - 0.34;
    p.fill(rect(tx - 0.05, 0.25, tx + 0.05, 0.92), '#5a5f78');
    for (var y = 0.3; y < 0.9; y += 0.1) p.fill(rect(tx - 0.05, y, tx + 0.05, y + 0.02), '#8a8fa6');
    p.hero(0, 0, rx, 0.46, 0.9, function () {
      p.fill(poly([[-0.11, 0.28], [0.11, 0.28], [0.07, 0.46], [0, 0.56], [-0.07, 0.46]]), '#ff5a2a');
      p.fill(poly([[-0.07, 0.28], [0.07, 0.28], [0.04, 0.42], [0, 0.48], [-0.04, 0.42]]), '#ffb347');
      p.fill(poly([[-0.035, 0.28], [0.035, 0.28], [0, 0.38]]), '#fff3a0');
      p.fill(poly([[-0.13, 0.05], [-0.27, 0.31], [-0.13, 0.25]]), '#e63946');
      p.fill(poly([[0.13, 0.05], [0.27, 0.31], [0.13, 0.25]]), '#b82d38');
      p.fill(rect(-0.13, -0.25, 0.13, 0.28), function (x) { return x > 0.05 ? '#c9ced9' : '#f4f6fa'; });
      p.fill(poly([[-0.13, -0.25], [0, -0.52], [0.13, -0.25]]), function (x) { return x > 0.03 ? '#b82d38' : '#e63946'; });
      p.fill(rect(-0.13, 0.12, 0.13, 0.17), '#2a4db8');
      p.fill(circ(0, -0.07, 0.075), '#5a6072');
      p.fill(circ(0, -0.07, 0.05), '#8fd3ff');
    });
    p.fill(rect(0, 0.93, X, 1), '#2a2d3e');
    for (var k = 0; k < 8; k++) { var sx = rx + (k - 3.5) * 0.09; p.fill(circ(sx, 0.95 - Math.abs(k - 3.5) * 0.01, p.rand(0.05, 0.08)), k % 2 ? '#e4e2ea' : '#c8c4d4'); }
  });

  scene('astronaut', 'Astronaut', 'Astronauta', 'space', function (p) {
    spaceBg(p);
    var n = vnoise(p.seed % 3331), left = p.chance(0.5), ex = left ? 0.05 : X - 0.05;
    p.fill(circ(ex, 1.02, 0.34), function (x, y) { return fbm(n, x * 6, y * 6) > 0.56 ? '#3fae4f' : '#2a6ad8'; });
    var ax = left ? p.rand(0.8, 1.0) : p.rand(0.5, 0.7);
    p.hero(0, 0, ax, 0.48, 0.88, function () {
      var w = '#f2f4f8', sh = '#c3c9d6', side = function (x) { return x > 0.08 ? sh : w; };
      p.fill(rect(-0.25, -0.14, 0.25, 0.24), '#9aa0ae');
      p.fill(rect(-0.18, 0.18, -0.03, 0.5), side); p.fill(rect(0.03, 0.18, 0.18, 0.5), side);
      p.fill(rect(-0.2, 0.42, -0.02, 0.5), '#8a90a2'); p.fill(rect(0.02, 0.42, 0.2, 0.5), '#8a90a2');
      p.line(-0.18, -0.02, -0.4, -0.3, 0.11, w); p.fill(circ(-0.41, -0.32, 0.06), '#8a90a2');
      p.line(0.18, -0.02, 0.33, 0.2, 0.11, sh); p.fill(circ(0.34, 0.22, 0.06), '#8a90a2');
      p.fill(rect(-0.2, -0.08, 0.2, 0.28), side);
      p.fill(rect(-0.1, 0.02, 0.1, 0.14), '#3a4058');
      p.fill(rect(-0.08, 0.05, -0.03, 0.1), '#ff4d4d'); p.fill(rect(-0.02, 0.05, 0.02, 0.1), '#3ee08f'); p.fill(rect(0.03, 0.05, 0.08, 0.1), '#ffd23f');
      p.fill(circ(0, -0.28, 0.21), side);
      p.fill(ell(0.02, -0.28, 0.15, 0.11), '#2b3d7a');
      p.fill(ell(-0.04, -0.31, 0.05, 0.03), '#8fb8ff');
    });
  });

  scene('flying-saucer', 'Flying Saucer', 'Platillo volador', 'space', function (p) {
    var hz = 0.8, ux = p.rand(0.55, 0.95), uy = 0.3;
    sky(p, ['#1a0f3d', '#4b1f6f', '#a0408a'], hz);
    p.stars(Math.floor(p.W * p.H / 60), 0, 0.5);
    p.fill(circ(ux < 0.75 ? 1.25 : 0.25, 0.18, 0.08), '#bff7ff');
    p.fill(below(function (x) { return 0.74 + Math.sin(x * 5) * 0.03; }, 0.68), '#5a2a7a');
    p.fill(rect(0, hz, X, 1), '#3f1d5c');
    p.fill(poly([[ux - 0.1, uy + 0.06], [ux + 0.1, uy + 0.06], [ux + 0.3, 0.93], [ux - 0.3, 0.93]]), '#b8ff9a', 0.4);
    p.hero(0, 0, ux, 0.76, 0.2, function () {   // a cow, floating up in the beam
      p.fill(rect(-0.4, -0.2, 0.3, 0.2), function (x, y) { return Math.sin(x * 18) * Math.sin(y * 20) > 0.3 ? '#1a1a24' : '#ffffff'; });
      p.fill(rect(0.3, -0.3, 0.55, -0.02), '#ffffff'); p.fill(rect(0.44, -0.18, 0.55, -0.02), '#ffb0c0');
      [-0.35, -0.2, 0.1, 0.25].forEach(function (l) { p.fill(rect(l, 0.2, l + 0.07, 0.45), '#ffffff'); });
    });
    p.hero(0, 0, ux, uy, 0.7, function () {
      p.fill(and(ell(0, -0.06, 0.26, 0.24), rect(-1, -1, 1, 0)), '#a8f0ff');
      p.fill(ell(-0.08, -0.16, 0.06, 0.04), '#ffffff');
      p.fill(ell(0, 0.04, 0.7, 0.14), function (x, y) { return y < 0.04 ? '#d6dbe6' : '#8a90a2'; });
      [-0.44, -0.22, 0, 0.22, 0.44].forEach(function (lx, k) { p.fill(circ(lx, 0.08, 0.045), k % 2 ? '#ff5d8f' : '#ffd166'); });
    });
  });

  scene('comet', 'Comet', 'Cometa', 'space', function (p) {
    sky(p, ['#03061a', '#0b1640', '#1f2f6a'], 0.85);
    p.stars(Math.floor(p.W * p.H / 45), 0, 0.8);
    var d = flip(p);
    p.hero(0, 0, 0.75, 0.4, 0.78, function () {
      var hx = -0.5 * d, hy = 0.3;
      p.fill(poly([[hx, hy - 0.1], [0.78 * d, -0.55], [0.78 * d, -0.15], [hx, hy + 0.1]]), '#4d7fff');
      p.fill(poly([[hx, hy - 0.06], [0.78 * d, -0.48], [0.78 * d, -0.3], [hx, hy + 0.05]]), '#9fd0ff');
      p.fill(poly([[hx, hy - 0.025], [0.6 * d, -0.35], [hx, hy + 0.02]]), '#ffffff');
      p.fill(circ(hx, hy, 0.11), '#bfe8ff');
      p.fill(circ(hx, hy, 0.07), '#ffffff');
    });
    p.fill(below(function (x) { return 0.84 + Math.abs(Math.sin(x * 4)) * -0.08; }, 0.72), '#141a36');
    treeLine(p, 0.9, 0.06, 0.12, '#0a0f24', '#070b1c');
  });

  scene('mars-rover', 'Mars Rover', 'Explorador de Marte', 'space', function (p) {
    var hz = 0.6, rx = p.rand(0.55, 0.95), d = flip(p);
    sky(p, ['#d9a07a', '#f0c8a0'], hz);
    p.fill(circ(rx < 0.75 ? 1.25 : 0.25, 0.15, 0.05), '#fff4e0');
    p.fill(below(function (x) { return 0.55 + Math.sin(x * 4 + 1) * 0.04; }, 0.48), '#b8583a');
    p.fill(rect(0, hz, X, 1), '#c8643c');
    for (var k = 0; k < 5; k++) p.fill(ell(p.rand(0, X), p.rand(0.85, 0.98), p.rand(0.03, 0.06), 0.025), '#8a3a22');
    p.hero(0, 0, rx, 0.64, 0.62, function () {
      p.line(-0.4, 0.3, 0, 0.14, 0.05, '#5a5f6e'); p.line(0, 0.14, 0.4, 0.3, 0.05, '#5a5f6e');
      [-0.4, 0, 0.4].forEach(function (wx) { p.fill(circ(wx, 0.33, 0.14), '#2b2b33'); p.fill(circ(wx, 0.33, 0.05), '#8a8f9a'); });
      p.fill(rect(-0.45, -0.05, 0.45, 0.18), function (x, y) { return y < 0.03 ? '#f0f0f4' : '#d9b25a'; });
      p.fill(rect(-0.56, -0.13, 0.56, -0.05), function (x) { return Math.floor((x + 0.56) / 0.08) % 2 ? '#2f4f9a' : '#3f64c0'; });
      p.fill(rect(0.27 * d - 0.03, -0.45, 0.27 * d + 0.03, -0.13), '#d6d6de');
      p.fill(rect(0.27 * d - 0.11, -0.56, 0.27 * d + 0.11, -0.42), '#f0f0f4');
      p.fill(circ(0.27 * d + 0.04 * d, -0.49, 0.035), '#1a1a24');
      p.fill(ell(-0.3 * d, -0.2, 0.09, 0.035), '#f0f0f4'); p.fill(rect(-0.3 * d - 0.01, -0.2, -0.3 * d + 0.01, -0.13), '#8a8f9a');
    });
  });

  scene('satellite', 'Satellite', 'Satélite', 'space', function (p) {
    spaceBg(p);
    var n = vnoise(p.seed % 5557);
    p.fill(minus(circ(0.75, 1.95, 1.2), circ(0.75, 1.95, 1.17)), '#8fd0ff');
    p.fill(circ(0.75, 1.95, 1.17), function (x, y) { return fbm(n, x * 6, y * 8) > 0.56 ? '#3fae4f' : '#2a6ad8'; });
    p.hero(0, 0, p.rand(0.66, 0.84), 0.38, 0.62, function () {
      var panel = function (x, y) { return (Math.abs(((x + 2) % 0.13) - 0.065) > 0.052 || Math.abs(y) > 0.12) ? '#1f3a8a' : '#3a6ae0'; };
      p.fill(rect(-0.95, -0.14, -0.28, 0.14), panel); p.fill(rect(0.28, -0.14, 0.95, 0.14), panel);
      p.fill(rect(-0.3, -0.02, 0.3, 0.02), '#9aa0ae');
      p.fill(rect(-0.2, -0.25, 0.2, 0.25), function (x) { return x > 0.08 ? '#b8862a' : '#e8b83e'; });
      p.fill(rect(-0.02, -0.38, 0.02, -0.25), '#9aa0ae');
      p.fill(and(ell(0, -0.4, 0.18, 0.08), rect(-1, -1, 1, -0.37)), '#f2f4f8');
      p.line(0.1, 0.25, 0.2, 0.45, 0.03, '#9aa0ae'); p.fill(circ(0.2, 0.46, 0.035), '#ff4d4d');
    });
  });

  // ===== animals =====
  scene('whale', 'Whale', 'Ballena', 'animals', function (p) {
    underwater(p);
    p.fill(rect(0, 0, X, 0.04), '#bff0ff');
    sandFloor(p, 0.88);
    for (var s = 0; s < 5; s++) seaweed(p, p.rand(0, X), 0.99, p.rand(0.1, 0.2), '#2f8a4a');
    var d = flip(p);
    p.hero(0, 0, 0.75 + p.rand(-0.04, 0.04), 0.45, 0.95, function () {
      function D(x) { return x * d; }
      p.fill(poly([[D(-0.35), -0.08], [D(-0.62), -0.01], [D(-0.62), 0.05], [D(-0.35), 0.12]]), '#3a5a8a');
      p.fill(ell(D(-0.66), -0.06, 0.13, 0.045, d * 1.1), '#3a5a8a');
      p.fill(ell(D(-0.66), 0.1, 0.13, 0.045, -d * 1.1), '#2f4a74');
      p.fill(ell(D(0.05), 0.02, 0.5, 0.18), function (x, y) {
        if (y > 0.07) return Math.floor(y * 40) % 2 ? '#a9c4dd' : '#c8dcef';
        return y < -0.07 ? '#2f4a74' : '#3a5a8a';
      });
      p.fill(ell(D(0.1), 0.2, 0.2, 0.05, d * 0.6), '#2f4a74');
      p.fill(circ(D(0.36), -0.01, 0.028), '#0a1220');
      p.line(D(0.3), 0.07, D(0.54), 0.04, 0.02, '#1f3050');
    });
    for (var f = 0; f < 5; f++) fish(p, p.rand(0.1, 1.4), p.rand(0.08, 0.2), 0.02, '#ffd166', '#f4a340', -d);
  });

  scene('sea-turtle', 'Sea Turtle', 'Tortuga marina', 'animals', function (p) {
    underwater(p);
    sandFloor(p, 0.86);
    for (var k = 0; k < 5; k++) {
      var x = p.rand(0, X), c = p.pick(['#ff6f91', '#ff9671', '#9b5de5', '#f9c74f']);
      p.fill(and(circ(x, 0.92, p.rand(0.05, 0.09)), rect(0, 0, X, 0.93)), c);
    }
    var d = flip(p);
    p.hero(0, 0, p.rand(0.6, 0.9), 0.42, 0.8, function () {
      function D(x) { return x * d; }
      var g = '#6fae6a';
      p.fill(ell(D(0.25), -0.28, 0.22, 0.07, -d * 0.7), g); p.fill(ell(D(0.25), 0.28, 0.22, 0.07, d * 0.7), g);
      p.fill(ell(D(-0.38), -0.18, 0.12, 0.05, d * 0.5), g); p.fill(ell(D(-0.38), 0.18, 0.12, 0.05, -d * 0.5), g);
      p.fill(ell(D(0.52), 0, 0.13, 0.09), '#7fbf6f');
      p.fill(circ(D(0.58), -0.03, 0.025), '#10131c');
      p.fill(ell(0, 0, 0.42, 0.3), function (x, y) {
        var r = Math.sqrt(x * x / 0.1764 + y * y / 0.09);
        if (r > 0.82) return '#5a3a1e';
        var a = Math.abs(((x + 1) % 0.18) - 0.09) < 0.012 || Math.abs(((y + 1) % 0.16) - 0.08) < 0.012;
        return a ? '#5a3a1e' : (Math.floor((x + 1) / 0.18) + Math.floor((y + 1) / 0.16)) % 2 ? '#8a6a2e' : '#a88438';
      });
    });
    bubbles(p, 6, 0.05, 0.7, '#e0f8ff');
  });

  scene('moon-owl', 'Owl in the Moonlight', 'Búho a la luz de la luna', 'animals', function (p) {
    sky(p, ['#060a24', '#101a4a', '#23306e'], 1);
    p.stars(Math.floor(p.W * p.H / 60), 0, 0.8);
    var ox = p.rand(0.6, 0.9);
    p.fill(circ(ox, 0.44, 0.36), '#fff3c8');
    p.fill(circ(ox - 0.18, 0.26, 0.05), '#eadba0'); p.fill(circ(ox + 0.22, 0.6, 0.06), '#eadba0');
    p.line(-0.05, 0.9, X + 0.05, 0.84, 0.06, '#5a3a26');
    p.fill(ell(ox + 0.35, 0.83, 0.06, 0.025), '#3f8a46'); p.fill(ell(ox - 0.4, 0.86, 0.06, 0.025), '#3f8a46');
    p.hero(0, 0, ox, 0.5, 0.72, function () {
      var b = '#8a6242', w = '#6f4c32';
      p.fill(ell(0, 0.1, 0.3, 0.36), b);
      p.fill(ell(0, 0.18, 0.19, 0.26), function (x, y) { return Math.floor((y + 1) / 0.06) % 2 && Math.floor((x + 1) / 0.06) % 2 ? '#b8946a' : '#e8d6b8'; });
      p.fill(ell(-0.27, 0.12, 0.09, 0.25, 0.15), w); p.fill(ell(0.27, 0.12, 0.09, 0.25, -0.15), w);
      p.fill(ell(0, -0.22, 0.3, 0.22), b);
      p.fill(poly([[-0.29, -0.3], [-0.25, -0.52], [-0.1, -0.37]]), w); p.fill(poly([[0.29, -0.3], [0.25, -0.52], [0.1, -0.37]]), w);
      [-1, 1].forEach(function (s) {
        p.fill(circ(s * 0.13, -0.21, 0.12), '#f2e6cc');
        p.fill(circ(s * 0.13, -0.21, 0.085), '#ffc93c');
        p.fill(circ(s * 0.13, -0.21, 0.042), '#1a1208');
      });
      p.fill(poly([[-0.045, -0.14], [0.045, -0.14], [0, -0.04]]), '#e0942a');
      p.fill(rect(-0.14, 0.44, -0.05, 0.5), '#e0942a'); p.fill(rect(0.05, 0.44, 0.14, 0.5), '#e0942a');
    });
  });

  scene('snow-fox', 'Fox in the Snow', 'Zorro en la nieve', 'animals', function (p) {
    var t = p.pick(['dusk', 'day']);
    sky(p, t === 'day' ? ['#7fb2e5', '#c3dcf2', '#eef5fc'] : ['#2a2a6a', '#6a4a8a', '#c07a8a'], 0.62);
    var tree = t === 'day' ? ['#2f5f4a', '#234a39'] : ['#1f3350', '#16263e'];
    for (var x = 0.03; x < X; x += p.rand(0.14, 0.22)) pine(p, x, 0.66, p.rand(0.2, 0.3), tree[0], tree[1], null, '#ffffff');
    var w = wav(p, 0.02, 4);
    hill(p, function (x) { return 0.66 + w(x); }, '#f2f6fc');
    p.fill(below(function (x) { return 0.84 + w(x); }, 0.78), '#d8e2f2');
    var d = flip(p), fx = p.rand(0.6, 0.9);
    p.hero(0, 0, fx, 0.52, 0.82, function () {
      function D(x) { return x * d; }
      var o = '#e0712c', od = '#b8561c';
      p.fill(ell(D(-0.35), 0.32, 0.3, 0.12, -d * 0.35), o);
      p.fill(ell(D(-0.6), 0.22, 0.11, 0.08, -d * 0.35), '#ffffff');
      p.fill(ell(0, 0.2, 0.25, 0.28), o);
      p.fill(ell(D(0.1), 0.14, 0.12, 0.22), '#ffffff');
      p.fill(rect(D(0.02) - 0.05, 0.36, D(0.02) + 0.05, 0.5), '#3a2418');
      p.fill(rect(D(0.16) - 0.05, 0.36, D(0.16) + 0.05, 0.5), '#3a2418');
      p.fill(poly([[D(0.0), -0.3], [D(0.03), -0.54], [D(0.13), -0.36]]), od);
      p.fill(poly([[D(0.14), -0.36], [D(0.23), -0.56], [D(0.28), -0.32]]), od);
      p.fill(ell(D(0.13), -0.24, 0.17, 0.14), o);
      p.fill(poly([[D(0.18), -0.3], [D(0.44), -0.2], [D(0.18), -0.12]]), o);
      p.fill(ell(D(0.24), -0.15, 0.13, 0.05), '#ffffff');
      p.fill(circ(D(0.43), -0.2, 0.03), '#1a1208');
      p.fill(circ(D(0.2), -0.27, 0.028), '#1a1208');
    });
    p.sprinkle(rect(0, 0, X, 1), 25, ['#ffffff']);
  });

  scene('penguins', 'Penguins', 'Pingüinos', 'animals', function (p) {
    var t = p.pick(['day', 'sunset']), hz = 0.55;
    sky(p, t === 'day' ? ['#5aa0e6', '#a8d4f5', '#e6f5ff'] : ['#3a3a8a', '#9a5aa0', '#ff9a8a', '#ffd9a0'], hz);
    for (var k = 0; k < 2; k++) { var ix = p.rand(0.1, 1.4), iw = p.rand(0.12, 0.2), ih = p.rand(0.08, 0.14); p.fill(poly([[ix - iw, hz], [ix - iw * 0.3, hz - ih], [ix + iw * 0.3, hz - ih * 0.8], [ix + iw, hz]]), function (x) { return x > ix ? '#b8d8ef' : '#f2faff'; }); }
    p.fill(rect(0, hz, X, 0.72), t === 'day' ? '#2f7fc0' : '#6a5a9a');
    p.fill(rect(0, 0.72, X, 0.94), function (x, y) { return y > 0.9 ? '#8fc0e0' : '#f4fbff'; });
    p.fill(rect(0, 0.94, X, 1), '#1f4f8a');
    function penguin(x, base, s, baby) {
      var body = baby ? '#8a8f9a' : '#1a1d2a';
      p.fill(ell(x - s * 0.24, base - s * 0.46, s * 0.07, s * 0.24, 0.3), body);
      p.fill(ell(x, base - s * 0.42, s * 0.26, s * 0.42), body);
      p.fill(ell(x + s * 0.04, base - s * 0.38, s * 0.18, s * 0.34), baby ? '#d8dce6' : '#ffffff');
      p.fill(circ(x, base - s * 0.86, s * 0.18), body);
      if (!baby) p.fill(ell(x + s * 0.06, base - s * 0.8, s * 0.1, s * 0.05), '#ffc93c');
      p.fill(poly([[x + s * 0.13, base - s * 0.9], [x + s * 0.3, base - s * 0.86], [x + s * 0.13, base - s * 0.82]]), '#ff8c2a');
      p.fill(circ(x + s * 0.07, base - s * 0.91, s * 0.035), '#ffffff');
      p.fill(ell(x - s * 0.08, base, s * 0.1, s * 0.035), '#ff8c2a'); p.fill(ell(x + s * 0.1, base, s * 0.1, s * 0.035), '#ff8c2a');
    }
    var px = p.rand(0.55, 0.95);
    p.hero(0, 0, px, 0.47, 0.84, function () { penguin(-0.2, 0.5, 0.95, false); penguin(0.34, 0.5, 0.52, true); });
  });

  scene('butterfly', 'Butterfly', 'Mariposa', 'animals', function (p) {
    sky(p, ['#5fb0f0', '#a8dcfa', '#e8f8ff'], 0.75);
    var w = wav(p, 0.03, 3);
    hill(p, function (x) { return 0.78 + w(x); }, '#7cc35c');
    for (var k = 0; k < 10; k++) {
      var fx = p.rand(0, X), fy = p.rand(0.84, 0.95), c = p.pick(['#ff4d6d', '#ffd23f', '#b56cff', '#ffffff']);
      p.line(fx, fy, fx, 1.02, 0.015, '#3f8a34'); p.fill(circ(fx, fy, 0.025), c);
    }
    var cols = p.pick([['#ff8c1a', '#ffae42'], ['#3a8fff', '#7fc4ff'], ['#ff5da2', '#ff9cc8']]);
    p.hero(0, 0, p.rand(0.6, 0.9), 0.44, 0.84, function () {
      function wing(x, y, rx, ry, rot, col) {
        p.fill(ell(x, y, rx, ry, rot), '#1a1208');
        p.fill(ell(x, y, rx * 0.78, ry * 0.74, rot), col);
        p.fill(circ(x + (x > 0 ? rx * 0.72 : -rx * 0.72), y, 0.025), '#ffffff');
      }
      wing(-0.32, -0.16, 0.34, 0.24, 0.4, cols[0]); wing(0.32, -0.16, 0.34, 0.24, -0.4, cols[0]);
      wing(-0.22, 0.2, 0.22, 0.17, -0.5, cols[1]); wing(0.22, 0.2, 0.22, 0.17, 0.5, cols[1]);
      p.line(-0.05, -0.02, -0.4, -0.26, 0.022, '#1a1208'); p.line(0.05, -0.02, 0.4, -0.26, 0.022, '#1a1208');
      p.fill(ell(0, 0.04, 0.055, 0.3), '#1a1208');
      p.fill(circ(0, -0.28, 0.065), '#1a1208');
      p.line(0, -0.32, -0.15, -0.5, 0.025, '#1a1208'); p.line(0, -0.32, 0.15, -0.5, 0.025, '#1a1208');
      p.fill(circ(-0.15, -0.5, 0.035), '#1a1208'); p.fill(circ(0.15, -0.5, 0.035), '#1a1208');
    });
  });

  scene('flamingo', 'Flamingo', 'Flamenco', 'animals', function (p) {
    var hz = 0.56;
    sky(p, ['#3a2a7a', '#a04a8a', '#ff8a7a', '#ffd6a0'], hz);
    var d = flip(p), fx = p.rand(0.6, 0.9);
    sun(p, fx < 0.75 ? 1.2 : 0.3, hz - 0.1, 0.08, '#fff2c0', '#ffb08a', 0.4);
    palm(p, fx < 0.75 ? 1.35 : 0.15, hz, 0.3, 0.1, '#3a2448', '#3a2448', '#3a2448', '#3a2448');
    p.reflect(hz, 1, '#6a3a7a', 0.35, 0);
    p.hero(0, 0, fx, 0.48, 0.92, function () {
      function D(x) { return x * d; }
      var pk = '#ff8fa8', pd = '#e0607a';
      p.line(0, 0.1, 0, 0.5, 0.035, pd);
      p.line(D(0.03), 0.1, D(0.16), 0.27, 0.035, pd); p.line(D(0.16), 0.27, D(0.02), 0.31, 0.035, pd);
      p.fill(poly([[D(-0.24), -0.02], [D(-0.36), 0.08], [D(-0.2), 0.08]]), pd);
      p.fill(ell(D(-0.03), 0, 0.25, 0.14, d * 0.2), pk);
      p.fill(ell(D(-0.08), 0, 0.16, 0.09, d * 0.3), '#ff6f90');
      p.curve(function (t) { return [D(0.14 + Math.sin(t * 3.4) * 0.12), -0.05 - t * 0.38]; }, 10, 0.055, pk);
      var hx = D(0.14 + Math.sin(3.4) * 0.12), hy = -0.44;
      p.fill(circ(hx, hy, 0.065), pk);
      p.line(hx + D(0.04), hy, hx + D(0.13), hy + 0.07, 0.04, '#f2e6d8');
      p.line(hx + D(0.1), hy + 0.05, hx + D(0.13), hy + 0.09, 0.04, '#1a1208');
      p.fill(circ(hx + D(0.015), hy - 0.015, 0.018), '#1a1208');
    });
  });

  scene('window-cat', 'Cat at the Window', 'Gato en la ventana', 'pets', function (p) {
    p.fill(rect(0, 0, X, 1), p.pick(['#c9a27a', '#8fa8c0', '#b88aa0']));
    var w0 = 0.3, w1 = 1.2, t0 = 0.08, t1 = 0.74;
    p.fill(rect(w0, t0, w1, t1), grad(['#0a1030', '#1f2f6a', '#3a4a8a'], t0, t1, 4));
    p.stars(Math.floor(p.W * p.H / 60), t0, t1 - 0.2);
    var cx = p.rand(0.6, 0.9);
    p.fill(circ(cx < 0.75 ? 1.0 : 0.5, 0.24, 0.08), '#fff3c8');
    for (var x = w0; x < w1; x += 0.1) { var h = p.rand(0.08, 0.2); p.fill(rect(x, t1 - h, x + 0.09, t1), '#141a3a'); }
    p.fill(minus(rect(w0 - 0.04, t0 - 0.04, w1 + 0.04, t1), rect(w0, t0, w1, t1)), '#f2ead8');
    p.fill(rect((w0 + w1) / 2 - 0.015, t0, (w0 + w1) / 2 + 0.015, t1), '#f2ead8');
    p.fill(rect(0.18, t1, X - 0.18, t1 + 0.06), '#e0d2b4');
    p.fill(rect(0.18, t1 + 0.06, X - 0.18, t1 + 0.08), '#a8977a');
    var cat = p.pick([['#e8903a', '#c46a1e'], ['#9aa0b0', '#747a8a'], ['#f4f4f4', '#cfd2dc']]);
    p.hero(0, 0, cx, t1 - 0.3, 0.6, function () {
      p.curve(function (t) { return [0.25 + t * 0.28, 0.46 - Math.sin(t * 3) * 0.14]; }, 8, 0.09, cat[1]);
      p.fill(ell(0, 0.16, 0.3, 0.34), cat[0]);
      p.fill(ell(0, 0.22, 0.14, 0.2), '#fff6ea');
      p.fill(poly([[-0.24, -0.32], [-0.21, -0.56], [-0.05, -0.44]]), cat[1]);
      p.fill(poly([[0.24, -0.32], [0.21, -0.56], [0.05, -0.44]]), cat[1]);
      p.fill(circ(0, -0.25, 0.25), cat[0]);
      [-1, 1].forEach(function (s) { p.fill(ell(s * 0.1, -0.27, 0.055, 0.05), '#9dff6a'); p.fill(ell(s * 0.1, -0.27, 0.018, 0.045), '#1a1208'); });
      p.fill(poly([[-0.035, -0.18], [0.035, -0.18], [0, -0.14]]), '#ff8fa8');
      p.fill(ell(-0.1, 0.48, 0.08, 0.04), '#fff6ea'); p.fill(ell(0.1, 0.48, 0.08, 0.04), '#fff6ea');
    });
  });

  scene('clownfish', 'Clownfish', 'Pez payaso', 'pets', function (p) {
    underwater(p);
    sandFloor(p, 0.88);
    var ax = p.rand(0.3, 1.2);
    for (var k = 0; k < 9; k++) p.curve(function (t) { return [ax - 0.2 + k * 0.05 + Math.sin(t * 4 + k) * 0.02, 0.92 - t * 0.2]; }, 6, 0.03, k % 2 ? '#ff7bb0' : '#ff9cc8');
    var d = flip(p);
    p.hero(0, 0, p.rand(0.6, 0.9), 0.4, 0.62, function () {
      function D(x) { return x * d; }
      var o = '#ff7b1c', blk = '#1a1208';
      p.fill(poly([[D(-0.42), 0], [D(-0.74), -0.24], [D(-0.64), 0], [D(-0.74), 0.24]]), blk);
      p.fill(poly([[D(-0.44), 0], [D(-0.68), -0.18], [D(-0.6), 0], [D(-0.68), 0.18]]), o);
      p.fill(ell(D(-0.05), -0.25, 0.22, 0.09), blk); p.fill(ell(D(-0.05), -0.24, 0.18, 0.06), o);
      p.fill(ell(D(0.05), 0.24, 0.13, 0.07), blk); p.fill(ell(D(0.05), 0.23, 0.1, 0.05), o);
      p.fill(ell(0, 0, 0.5, 0.28), function (x) {
        var u = x * d;
        function band(c, w) { var a = Math.abs(u - c); return a < w ? 'w' : a < w + 0.03 ? 'b' : null; }
        var b = band(0.27, 0.05) || band(-0.03, 0.07) || band(-0.34, 0.04);
        return b === 'w' ? '#ffffff' : b === 'b' ? blk : o;
      });
      p.fill(circ(D(0.37), -0.06, 0.055), '#ffffff'); p.fill(circ(D(0.39), -0.06, 0.03), blk);
    });
    bubbles(p, 5, 0.05, 0.6, '#e0f8ff');
  });

  scene('deer', 'Deer', 'Venado', 'animals', function (p) {
    var hz = 0.72;
    sky(p, ['#5a6fb8', '#b89ac8', '#f7b7a3', '#ffe2b0'], hz);
    var d = flip(p), dx = p.rand(0.6, 0.9);
    sun(p, dx < 0.75 ? 1.2 : 0.3, 0.45, 0.07, '#fff4d0', '#ffcfa0', 0.4);
    treeLine(p, 0.66, 0.14, 0.24, '#8a7aa0', '#7a6a90');
    treeLine(p, 0.74, 0.14, 0.26, '#4a4a70', '#3e3e60');
    p.fill(rect(0, hz, X, 1), '#6a8a4a');
    p.hero(0, 0, dx, 0.5, 0.88, function () {
      function D(x) { return x * d; }
      var c = '#9a5a2e', cd = '#6e3e1e', an = '#5a3a1e';
      [-0.26, -0.18, 0.12, 0.2].forEach(function (l) { p.fill(rect(D(l) - 0.025, 0.1, D(l) + 0.025, 0.5), l < 0 ? cd : c); p.fill(rect(D(l) - 0.025, 0.45, D(l) + 0.025, 0.5), '#2a1a10'); });
      p.fill(ell(D(-0.03), 0.04, 0.32, 0.15), c);
      p.fill(ell(D(-0.03), 0.12, 0.24, 0.05), '#e8c8a0');
      p.fill(ell(D(-0.35), -0.04, 0.04, 0.06), '#ffffff');
      p.fill(poly([[D(0.14), 0.02], [D(0.24), -0.25], [D(0.34), -0.22], [D(0.3), 0.06]]), c);
      p.fill(ell(D(0.35), -0.27, 0.1, 0.065, d * 0.3), c);
      p.fill(circ(D(0.44), -0.23, 0.028), '#1a1208');
      p.fill(ell(D(0.24), -0.33, 0.065, 0.028, -d * 0.5), cd);
      p.fill(circ(D(0.34), -0.29, 0.02), '#1a1208');
      [[0.3, -0.33, 0.22, -0.5], [0.25, -0.43, 0.15, -0.46], [0.36, -0.33, 0.44, -0.5], [0.41, -0.43, 0.51, -0.46]].forEach(function (a) { p.line(D(a[0]), a[1], D(a[2]), a[3], 0.03, an); });
    });
  });

  scene('busy-bee', 'Busy Bee', 'Abeja trabajadora', 'animals', function (p) {
    sky(p, ['#3f8fe6', '#8cc8f5', '#dff2ff'], 0.72);
    cloud(p, p.rand(0.2, 1.3), 0.14, 0.26, '#ffffff', '#dcecf8');
    p.fill(rect(0, 0.72, X, 1), '#5a9a3a');
    var right = p.chance(0.5), sx = right ? p.rand(0.95, 1.15) : p.rand(0.35, 0.55), bx = right ? p.rand(0.35, 0.5) : p.rand(1.0, 1.15);
    p.hero(0, 0, sx, 0.5, 0.82, function () {
      p.line(0, -0.1, 0.02, 0.6, 0.06, '#3f8a2a');
      p.fill(ell(0.14, 0.25, 0.14, 0.05, -0.5), '#4a9a2e'); p.fill(ell(-0.12, 0.38, 0.14, 0.05, 0.5), '#4a9a2e');
      p.fill(circ(0, -0.18, 0.32), function (x, y) {
        var a = Math.atan2(y + 0.18, x), r = Math.sqrt(x * x + (y + 0.18) * (y + 0.18)) / 0.32;
        if (r > 0.6 + 0.4 * Math.abs(Math.cos(a * 6))) return null;
        return r < 0.45 ? (Math.floor((x + 1) / 0.05) + Math.floor((y + 1) / 0.05)) % 2 ? '#5a3212' : '#3d2008' : Math.abs(Math.cos(a * 6)) > 0.85 ? '#ffe46b' : '#ffc21a';
      });
    });
    var d = right ? 1 : -1;
    p.hero(0, 0, bx, 0.3, 0.5, function () {
      function D(x) { return x * d; }
      p.fill(ell(D(-0.08), -0.28, 0.2, 0.14, d * -0.4), '#eaf6ff'); p.fill(ell(D(0.14), -0.28, 0.17, 0.12, d * 0.4), '#d8ecff');
      p.fill(poly([[D(-0.38), 0], [D(-0.52), 0.03], [D(-0.38), 0.08]]), '#1a1208');
      p.fill(ell(0, 0.02, 0.4, 0.25), function (x) { return Math.floor((x * d + 0.4) / 0.13) % 2 ? '#1a1208' : '#ffc21a'; });
      p.fill(circ(D(0.4), 0, 0.15), '#1a1208');
      p.fill(circ(D(0.45), -0.04, 0.045), '#ffffff');
      p.line(D(0.42), -0.12, D(0.52), -0.3, 0.03, '#1a1208'); p.line(D(0.36), -0.12, D(0.4), -0.32, 0.03, '#1a1208');
    });
    for (var t = 1; t < 6; t++) p.dot(bx - d * (0.15 + t * 0.06), 0.34 + Math.sin(t * 1.3) * 0.04, '#ffffff');
    p.sprinkle(rect(0, 0.78, X, 1), 15, ['#ff4d6d', '#ffffff', '#ffd23f']);
  });

  scene('jellyfish', 'Jellyfish', 'Medusa', 'animals', function (p) {
    p.fill(rect(0, 0, X, 1), grad(['#1a3a7a', '#0b1a44', '#040a1e'], 0, 1, 5));
    p.sprinkle(rect(0, 0, X, 1), 20, ['#5a7ac8']);
    var c = p.pick([['#ff8fd8', '#c850c0', '#ffd6f2'], ['#8fe8ff', '#4a9ae0', '#d6f6ff'], ['#c8a8ff', '#8a5ae0', '#ece0ff']]);
    var jx = p.rand(0.6, 0.9);
    p.fill(and(ell(jx < 0.75 ? 1.25 : 0.25, 0.3, 0.1, 0.08), rect(0, 0, X, 0.31)), c[1]);
    p.hero(0, 0, jx, 0.45, 0.9, function () {
      for (var t = 0; t < 6; t++) (function (t) { p.curve(function (u) { return [-0.25 + t * 0.1 + Math.sin(u * 7 + t) * 0.04, -0.04 + u * 0.54]; }, 10, 0.035, c[1]); })(t);
      p.curve(function (u) { return [-0.06 + Math.sin(u * 6) * 0.05, -0.04 + u * 0.4]; }, 8, 0.09, c[0]);
      p.curve(function (u) { return [0.08 + Math.sin(u * 6 + 2) * 0.05, -0.04 + u * 0.36]; }, 8, 0.08, c[0]);
      p.fill(and(ell(0, -0.08, 0.37, 0.36), rect(-1, -1, 1, -0.02)), function (x, y) { return y < -0.3 ? c[2] : c[0]; });
      p.fill(rect(-0.37, -0.04, 0.37, 0.0), c[1]);
      [[-0.15, -0.2], [0.12, -0.24], [0, -0.12]].forEach(function (s) { p.fill(circ(s[0], s[1], 0.04), c[2]); });
    });
  });

  scene('giraffe', 'Giraffe', 'Jirafa', 'animals', function (p) {
    var hz = 0.8, d = flip(p), gx = p.rand(0.6, 0.9);
    sky(p, ['#5a1f5a', '#c0392b', '#ff7b3a', '#ffc86b'], hz);
    sun(p, gx < 0.75 ? 1.15 : 0.35, 0.5, 0.15, '#ffe08a', '#ffb347', 0.3);
    var ax = gx < 0.75 ? 1.25 : 0.25;
    p.line(ax, hz, ax, hz - 0.22, 0.03, '#2a1418');
    p.fill(ell(ax, hz - 0.28, 0.22, 0.05), '#2a1418');
    p.fill(rect(0, hz, X, 1), '#8a6a2a');
    for (var g = 0; g < 20; g++) { var qx = p.rand(0, X); p.line(qx, hz + 0.01, qx, hz - 0.03, 0.012, '#6a4f1e'); }
    p.hero(0, 0, gx, 0.5, 0.96, function () {
      function D(x) { return x * d; }
      var y0 = '#f2b84a', spot = function (x, y) { return Math.sin(x * 48) * Math.sin(y * 44) > 0.35 ? '#a8601e' : y0; };
      [-0.2, -0.13, 0.08, 0.15].forEach(function (l) { p.fill(rect(D(l) - 0.022, 0.12, D(l) + 0.022, 0.5), l < 0 ? '#d49a36' : y0); p.fill(rect(D(l) - 0.022, 0.46, D(l) + 0.022, 0.5), '#3a2418'); });
      p.line(D(-0.27), 0.02, D(-0.33), 0.2, 0.02, '#a8601e'); p.fill(circ(D(-0.33), 0.21, 0.03), '#3a2418');
      p.fill(ell(D(-0.04), 0.07, 0.25, 0.12, -d * 0.12), spot);
      p.fill(poly([[D(0.08), 0.02], [D(0.2), -0.36], [D(0.29), -0.34], [D(0.22), 0.1]]), spot);
      p.line(D(0.1), 0.0, D(0.2), -0.33, 0.025, '#a8601e');
      p.fill(ell(D(0.3), -0.4, 0.11, 0.06, d * 0.35), y0);
      p.fill(circ(D(0.38), -0.36, 0.03), '#d49a36');
      p.fill(circ(D(0.29), -0.42, 0.02), '#1a1208');
      p.fill(ell(D(0.2), -0.44, 0.05, 0.02, -d * 0.4), '#d49a36');
      p.line(D(0.24), -0.44, D(0.22), -0.52, 0.022, '#3a2418'); p.line(D(0.28), -0.45, D(0.28), -0.53, 0.022, '#3a2418');
    });
    for (var b = 0; b < 3; b++) p.bird(p.rand(0.2, 1.3), p.rand(0.1, 0.3), '#2a1418');
  });

  scene('panda', 'Panda', 'Panda', 'animals', function (p) {
    sky(p, ['#d8f0d4', '#f2faec'], 0.8);
    [0.06, 0.19, X - 0.19, X - 0.06].forEach(function (bx) {
      p.fill(rect(bx - 0.025, 0, bx + 0.025, 0.82), function (x, y) { return Math.abs(((y + 1) % 0.16) - 0.08) < 0.012 ? '#7ab860' : '#a8dc8a'; });
      p.fill(ell(bx + 0.06, p.rand(0.15, 0.55), 0.06, 0.02, -0.5), '#8ccc6c');
    });
    p.fill(rect(0, 0.8, X, 1), '#7cc35c');
    // laid out on the 24 x 16 grid (one square = 0.0625 here) so the eyes, nose and cheeks each get whole squares
    p.hero(0, 0, 0.75, 0.5, 1, function () {
      var b = '#2a2a34', w = '#ffffff', pink = '#ffb0c4';
      p.fill(rect(0.33, -0.08, 0.39, 0.47), function (x, y) { return Math.abs(((y + 1) % 0.1875) - 0.09) < 0.02 ? '#5a9a42' : '#7cc35c'; });
      p.fill(ell(0.44, -0.06, 0.08, 0.03, -0.5), '#5aa845'); p.fill(ell(0.42, 0.06, 0.08, 0.03, 0.5), '#5aa845');
      p.fill(ell(0, 0.3, 0.3, 0.19), w);
      p.fill(ell(-0.27, 0.26, 0.07, 0.11, 0.3), b); p.fill(ell(0.29, 0.2, 0.07, 0.11, -0.4), b);
      [-1, 1].forEach(function (s) { p.fill(ell(s * 0.19, 0.45, 0.1, 0.055), b); });
      p.fill(circ(-0.27, -0.38, 0.1), b); p.fill(circ(0.27, -0.38, 0.1), b);
      p.fill(ell(0, -0.14, 0.35, 0.27), w);
      [-1, 1].forEach(function (s) {
        p.fill(ell(s * 0.125, -0.14, 0.085, 0.1), b);
        p.fill(or(rect(s * 0.094 - 0.031, -0.187, s * 0.094 + 0.031, -0.125), circ(s * 0.094, -0.156, 0.04)), '#ffffff');
        p.fill(rect(s * 0.25 - 0.031, -0.0625, s * 0.25 + 0.031, 0), pink);
      });
      p.fill(rect(-0.0625, -0.0625, 0.0625, 0), b);
    });
  });

  // ===== things and vehicles =====
  scene('sailboat', 'Sailboat', 'Velero', 'things', function (p) {
    var t = p.pick(['day', 'sunset']), hz = 0.58, bx = p.rand(0.55, 0.95), d = flip(p);
    sky(p, t === 'day' ? ['#3b8ae0', '#8cc8f5', '#dff2ff'] : SKY.sunset, hz);
    sun(p, bx < 0.75 ? 1.2 : 0.3, t === 'day' ? 0.15 : 0.45, 0.07, '#fff4c4', '#ffd98a', 0.4);
    if (t === 'day') cloud(p, bx < 0.75 ? 1.1 : 0.4, 0.25, 0.28, '#ffffff', '#dcecf8');
    p.fill(rect(0, hz, X, 1), grad(t === 'day' ? ['#2a7ac8', '#1f5aa0'] : ['#6a3a7a', '#3a2a5a'], hz, 1, 3));
    for (var k = 0; k < 8; k++) { var wx = p.rand(0, X), wy = p.rand(hz + 0.05, 0.98); p.line(wx, wy, wx + 0.07, wy, 0.012, '#ffffff'); }
    var hull = p.pick(['#e63946', '#2a4db8', '#1f8a50']);
    p.hero(0, 0, bx, 0.42, 0.8, function () {
      function D(x) { return x * d; }
      p.fill(rect(-0.02, -0.5, 0.02, 0.24), '#6b4431');
      p.fill(poly([[D(0.04), -0.47], [D(0.04), 0.18], [D(0.48), 0.18]]), function (x) { return x * d > 0.2 ? '#dfe4ee' : '#ffffff'; });
      p.fill(poly([[D(-0.04), -0.4], [D(-0.04), 0.18], [D(-0.4), 0.18]]), '#ffe9a8');
      p.fill(poly([[D(0.02), -0.5], [D(0.16), -0.46], [D(0.02), -0.42]]), '#ff4d4d');
      p.fill(poly([[D(-0.58), 0.22], [D(0.62), 0.22], [D(0.46), 0.44], [D(-0.44), 0.44]]), hull);
      p.fill(rect(-0.52, 0.28, 0.54, 0.31), '#ffffff');
    });
  });

  scene('hot-air-balloon', 'Hot Air Balloon', 'Globo aerostático', 'things', function (p) {
    var t = p.pick(['day', 'dawn']);
    sky(p, t === 'day' ? ['#4a9be8', '#8cc8f5', '#e0f4ff'] : SKY.dawn, 0.76);
    var bx = p.rand(0.55, 0.95);
    cloud(p, bx < 0.75 ? 1.15 : 0.35, 0.2, 0.3, '#ffffff', t === 'day' ? '#dcecf8' : '#f3c8c8');
    var cols = ['#a8d06a', '#e8d06a', '#7fb85a', '#c8b86a'];
    p.fill(rect(0, 0.76, X, 1), function (x, y) { return cols[(Math.floor(x / 0.25) + Math.floor((y - 0.76) / 0.08)) % 4]; });
    p.fill(circ(bx < 0.75 ? 1.3 : 0.2, 0.45, 0.05), '#b56cff');
    var sets = p.pick([['#ff4d4d', '#ffd23f', '#ff8c42'], ['#4d9bff', '#ffffff', '#ff4d6d'], ['#b56cff', '#ff7bac', '#ffd23f'], ['#3bb273', '#ffe066', '#4dc9ff']]);
    p.hero(0, 0, bx, 0.44, 0.88, function () {
      var env = or(circ(0, -0.2, 0.3), poly([[-0.29, -0.12], [0.29, -0.12], [0.1, 0.22], [-0.1, 0.22]]));
      p.fill(env, function (x, y) {
        var wid = y < -0.12 ? Math.sqrt(Math.max(0.001, 0.09 - (y + 0.2) * (y + 0.2))) : 0.29 - (y + 0.12) / 0.34 * 0.19;
        var c = sets[((Math.floor((x / wid + 1) * 2.5) % 3) + 3) % 3];
        return x > wid * 0.45 ? dark(c, 0.2) : c;
      });
      p.line(-0.1, 0.22, -0.07, 0.34, 0.02, '#5a4030'); p.line(0.1, 0.22, 0.07, 0.34, 0.02, '#5a4030');
      p.fill(rect(-0.1, 0.33, 0.1, 0.46), function (x, y) { return Math.floor((y - 0.33) / 0.04) % 2 ? '#7a5028' : '#9a6a36'; });
    });
  });

  scene('lighthouse', 'Lighthouse', 'Faro', 'things', function (p) {
    var hz = 0.7, left = p.chance(0.5), lx = left ? p.rand(0.4, 0.6) : p.rand(0.9, 1.1);
    sky(p, ['#050a24', '#0f1a4a', '#2f4a86'], hz);
    p.stars(Math.floor(p.W * p.H / 60), 0, hz);
    p.fill(circ(left ? 1.25 : 0.25, 0.15, 0.06), '#fff6d8');
    var ly = 0.5 - 0.31 * 0.95, bd = left ? 1 : -1;
    p.fill(poly([[lx, ly], [lx + bd * 1.4, ly - 0.2], [lx + bd * 1.4, ly + 0.14]]), '#fff2a8', 0.3);
    p.fill(rect(0, hz, X, 1), '#12204a');
    for (var k = 0; k < 7; k++) { var wx = p.rand(0, X), wy = p.rand(hz + 0.04, 0.98); p.line(wx, wy, wx + 0.06, wy, 0.012, '#6f8fd8'); }
    p.fill(ell(lx, 0.97, 0.36, 0.1), '#3a3a4a');
    p.hero(0, 0, lx, 0.47, 0.95, function () {
      p.fill(rect(-0.21, 0.4, 0.21, 0.5), '#8a8f9e');
      p.fill(poly([[-0.14, 0.42], [0.14, 0.42], [0.1, -0.22], [-0.1, -0.22]]), function (x, y) { var c = Math.floor((y + 0.22) / 0.13) % 2 ? '#f4f1ea' : '#d9382f'; return x > 0.04 ? dark(c, 0.25) : c; });
      p.fill(rect(-0.16, -0.26, 0.16, -0.21), '#2a2a36');
      p.fill(rect(-0.08, -0.38, 0.08, -0.26), '#fff3a0');
      p.fill(rect(-0.01, -0.38, 0.01, -0.26), '#2a2a36');
      p.fill(poly([[-0.12, -0.38], [0, -0.5], [0.12, -0.38]]), '#d9382f');
    });
  });

  scene('steam-train', 'Steam Train', 'Tren de vapor', 'things', function (p) {
    sky(p, ['#4a9be8', '#9fd0f5', '#e8f6ff'], 0.62);
    var w = wav(p, 0.03, 3), d = flip(p), tx = 0.75;
    hill(p, function (x) { return 0.56 + w(x); }, '#8fc86a');
    p.fill(rect(0, 0.68, X, 1), '#6fae55');
    p.fill(rect(0, 0.79, X, 0.87), '#9a8a7a');
    for (var x = 0.01; x < X; x += 0.09) p.fill(rect(x, 0.795, x + 0.05, 0.85), '#6a4428');
    p.fill(rect(0, 0.775, X, 0.8), '#6a7080');
    p.fill(rect(0, 0.775, X, 0.782), '#c8ccd6');
    p.hero(0, 0, tx, 0.49, 0.7, function () {
      function D(x) { return x * d; }
      function R(x0, y0, x1, y1, col) { p.fill(rect(Math.min(D(x0), D(x1)), y0, Math.max(D(x0), D(x1)), y1), col); }
      R(-0.72, 0.14, 0.6, 0.21, '#1a1a24');
      R(-0.72, -0.12, -0.47, 0.14, '#2f6a4a');
      p.fill(rect(Math.min(D(-0.7), D(-0.49)), -0.18, Math.max(D(-0.7), D(-0.49)), -0.12), '#1a1a24');
      R(-0.45, -0.34, -0.17, 0.14, '#c0392b');
      R(-0.49, -0.41, -0.13, -0.34, '#1a1a24');
      R(-0.39, -0.27, -0.23, -0.12, '#ffd36e');
      p.fill(rect(Math.min(D(-0.17), D(0.46)), -0.17, Math.max(D(-0.17), D(0.46)), 0.14), function (x) { return Math.abs(((x * d + 1) % 0.15) - 0.075) < 0.014 ? '#e0b44a' : '#2f6a4a'; });
      R(0.46, -0.15, 0.52, 0.14, '#1a1a24');
      p.fill(circ(D(0.5), -0.22, 0.05), '#fff3a0');
      p.fill(poly([[D(0.29), -0.17], [D(0.39), -0.17], [D(0.43), -0.42], [D(0.25), -0.42]]), '#1a1a24');
      p.fill(and(ell(D(0.06), -0.17, 0.08, 0.07), rect(-1, -1, 1, -0.17)), '#e0b44a');
      p.fill(poly([[D(0.52), 0.14], [D(0.7), 0.34], [D(0.52), 0.34]]), '#c0392b');
      [[-0.3, 0.13], [0.0, 0.13]].forEach(function (wh) { p.fill(circ(D(wh[0]), 0.28, wh[1]), '#c0392b'); p.fill(circ(D(wh[0]), 0.28, 0.04), '#1a1a24'); });
      [[0.34, 0.09], [-0.65, 0.07], [-0.53, 0.07]].forEach(function (wh) { p.fill(circ(D(wh[0]), 0.41 - wh[1], wh[1]), '#c0392b'); p.fill(circ(D(wh[0]), 0.41 - wh[1], 0.025), '#1a1a24'); });
      p.line(D(-0.3), 0.3, D(0.0), 0.3, 0.035, '#9aa0ae');
    });
    var cx = tx + d * 0.24;
    for (var s = 0; s < 5; s++) p.fill(circ(cx - d * s * 0.11, 0.14 - s * 0.02, 0.045 + s * 0.012), s % 2 ? '#e8ecf2' : '#ffffff');
  });

  scene('red-barn', 'Red Barn', 'Granero rojo', 'things', function (p) {
    sky(p, ['#4a9be8', '#9fd0f5', '#fff4d8'], 0.64);
    var bx = p.rand(0.58, 0.82), right = bx < 0.72;
    sun(p, right ? 1.3 : 0.2, 0.13, 0.06, '#fffbe0', '#fff2a8', 0.4);
    cloud(p, right ? 1.05 : 0.45, 0.2, 0.26, '#ffffff', '#dcecf8');
    p.fill(rect(0, 0.64, X, 1), function (x, y) { return Math.floor((y - 0.64) / 0.06) % 2 ? '#8fc86a' : '#7ab855'; });
    var sx = right ? bx + 0.5 : bx - 0.5;
    p.subject(function () {
      p.fill(rect(sx - 0.08, 0.3, sx + 0.08, 0.76), function (x, y) { return Math.floor((y - 0.3) / 0.07) % 2 ? '#a8b4c8' : '#c8d2e0'; });
      p.fill(and(circ(sx, 0.3, 0.08), rect(0, 0, X, 0.3)), '#7a8698');
    });
    p.hero(0, 0, bx, 0.5, 0.72, function () {
      var red = '#c0392b', w = '#ffffff';
      p.fill(poly([[-0.58, -0.04], [-0.43, -0.36], [0, -0.52], [0.43, -0.36], [0.58, -0.04]]), w);
      p.fill(poly([[-0.52, -0.06], [-0.39, -0.33], [0, -0.47], [0.39, -0.33], [0.52, -0.06]]), '#8a2420');
      p.fill(rect(-0.46, -0.08, 0.46, 0.46), function (x) { return Math.abs(((x + 1) % 0.09) - 0.045) < 0.006 ? '#a82e24' : red; });
      p.fill(rect(-0.46, -0.08, -0.41, 0.46), w); p.fill(rect(0.41, -0.08, 0.46, 0.46), w);
      p.fill(rect(-0.26, 0.08, 0.26, 0.46), w);
      [[-0.22, -0.02], [0.02, 0.22]].forEach(function (d) {
        p.fill(rect(d[0], 0.12, d[1], 0.46), red);
        p.line(d[0], 0.12, d[1], 0.46, 0.03, w); p.line(d[1], 0.12, d[0], 0.46, 0.03, w);
      });
      p.fill(rect(-0.12, -0.32, 0.12, -0.13), w);
      p.fill(rect(-0.08, -0.28, 0.08, -0.13), '#3a2418');
      p.fill(rect(-0.08, -0.19, 0.08, -0.13), '#f2c94c');
    });
    for (var f = 0.02; f < X; f += 0.12) if (Math.abs(f - bx) > 0.38) p.fill(rect(f, 0.84, f + 0.025, 0.96), '#ffffff');
    p.fill(rect(0, 0.87, X, 0.89), '#ffffff'); p.fill(rect(0, 0.92, X, 0.94), '#ffffff');
  });

  scene('city-night', 'City at Night', 'Ciudad de noche', 'things', function (p) {
    var hz = 0.78;
    sky(p, ['#070a22', '#1a1a4a', '#4a2a6a', '#a04a7a'], hz);
    p.stars(Math.floor(p.W * p.H / 60), 0, 0.35);
    var mx = p.chance(0.5) ? 0.22 : 1.28;
    p.fill(circ(mx, 0.15, 0.08), '#fff6d8');
    for (var x = 0; x < X; x += 0.12) { var h = p.rand(0.15, 0.32); p.fill(rect(x, hz - h, x + 0.11, hz), '#2a2050'); }
    var cols = p.pick([['#2a3a6a', '#3a2a5a', '#1f4a5a'], ['#34306a', '#1f3a5a', '#4a2a50']]);
    function lit(x0, x1, y0, col) {
      return function (x, y) {
        var u = x - x0, v = y - y0, cx = (u % 0.12) / 0.12, cy = (v % 0.13) / 0.13;
        if (u > 0.035 && x1 - x > 0.035 && v > 0.05 && cx > 0.35 && cy > 0.4) return hash(Math.floor(u / 0.12), Math.floor(v / 0.13), Math.floor(x0 * 100)) < 0.68 ? '#ffd36e' : dark(col, 0.45);
        return col;
      };
    }
    p.hero(0, 0, 0.75, hz - 0.41, 0.82, function () {
      p.fill(rect(-0.78, -0.02, -0.5, 0.5), lit(-0.78, -0.5, -0.02, cols[0]));
      p.fill(rect(-0.7, -0.12, -0.58, -0.02), '#5a5f78'); p.fill(ell(-0.64, -0.12, 0.07, 0.03), '#5a5f78');
      p.fill(rect(-0.48, -0.26, -0.2, 0.5), lit(-0.48, -0.2, -0.26, cols[1]));
      p.fill(rect(-0.42, -0.36, -0.26, -0.26), cols[1]); p.fill(rect(-0.35, -0.46, -0.33, -0.36), '#8a8fa6');
      p.fill(rect(-0.18, -0.34, 0.12, 0.5), lit(-0.18, 0.12, -0.34, cols[2]));
      p.fill(poly([[-0.14, -0.34], [0.08, -0.34], [-0.03, -0.46]]), cols[2]);
      p.fill(rect(-0.04, -0.58, -0.02, -0.46), '#8a8fa6'); p.fill(circ(-0.03, -0.59, 0.025), '#ff4d4d');
      p.fill(rect(0.14, -0.14, 0.42, 0.5), lit(0.14, 0.42, -0.14, cols[0]));
      p.fill(and(ell(0.28, -0.14, 0.14, 0.12), rect(-1, -1, 1, -0.14)), '#4dc9ff');
      p.fill(poly([[0.44, 0.02], [0.78, -0.08], [0.78, 0.5], [0.44, 0.5]]), lit(0.44, 0.78, 0.02, cols[1]));
    });
    p.reflect(hz, 1, '#0a0a28', 0.5, 0);
    p.fill(rect(mx - 0.03, hz + 0.02, mx + 0.03, 0.98), '#fff6d8', 0.35);
  });

  scene('castle', 'Castle', 'Castillo', 'things', function (p) {
    var t = p.pick(['day', 'sunset']), cx = p.rand(0.62, 0.88);
    sky(p, t, 0.75);
    if (t === 'sunset') sun(p, cx < 0.75 ? 1.25 : 0.25, 0.4, 0.07, '#ffe39a', '#ff9a5a', 0.4);
    cloud(p, cx < 0.75 ? 1.15 : 0.35, 0.18, 0.28, t === 'day' ? '#ffffff' : '#ffc3a0', t === 'day' ? '#dcecf8' : '#e38a8a');
    hill(p, function (x) { return 0.78 + Math.pow((x - cx) * 1.3, 2) * 0.3 - 0.02; }, t === 'day' ? '#6fae55' : '#4a6a4a');
    var stone = t === 'day' ? ['#c8c0b4', '#a8a094'] : ['#b09aa4', '#8a7280'], roof = p.pick(['#3a64c8', '#c0392b', '#7a3ac8']);
    p.hero(0, 0, cx, 0.5, 0.78, function () {
      var brick = function (x, y) { var c = x > 0.2 ? stone[1] : stone[0]; return Math.abs(((y + 1) % 0.1) - 0.05) < 0.008 ? dark(c, 0.15) : c; };
      p.fill(rect(-0.42, -0.05, 0.42, 0.45), brick);
      for (var k = 0; k < 7; k++) p.fill(rect(-0.42 + k * 0.13, -0.12, -0.35 + k * 0.13, -0.05), stone[0]);
      [[-0.52, 0.34], [0.52, 0.34], [0, 0.2]].forEach(function (tw) {
        var x = tw[0], top = tw[1] - 0.52, hw = x === 0 ? 0.13 : 0.11;
        p.fill(rect(x - hw, top, x + hw, 0.45), brick);
        p.fill(poly([[x - hw - 0.04, top], [x, top - 0.2], [x + hw + 0.04, top]]), function (xx) { return xx > x ? dark(roof, 0.25) : roof; });
        p.line(x, top - 0.2, x, top - 0.28, 0.018, '#3a2a1e');
        p.fill(poly([[x, top - 0.28], [x + 0.08, top - 0.25], [x, top - 0.22]]), '#ffd23f');
        p.fill(and(ell(x, top + 0.1, 0.03, 0.05), rect(-1, -1, 1, top + 0.14)), '#2a2030');
      });
      p.fill(and(ell(0, 0.3, 0.1, 0.16), rect(-1, -1, 1, 0.45)), '#4a3020');
    });
  });

  scene('airplane', 'Airplane', 'Avión', 'things', function (p) {
    var t = p.pick(['day', 'sunset']), d = flip(p);
    sky(p, t === 'day' ? ['#1f5fc0', '#4a9be8', '#a8d8ff'] : SKY.sunset, 0.78);
    sun(p, d > 0 ? 1.3 : 0.2, t === 'day' ? 0.14 : 0.5, 0.06, '#fffbe0', '#fff2a8', 0.4);
    var cl = t === 'day' ? ['#ffffff', '#d8e8f7'] : ['#ffd8c8', '#e8a0a8'];
    p.fill(rect(0, 0.86, X, 1), cl[1]);
    for (var k = 0; k < 9; k++) p.fill(circ(k * 0.18 + p.rand(-0.03, 0.03), 0.86, p.rand(0.08, 0.13)), function (x, y) { return y > 0.86 ? cl[1] : cl[0]; });
    var acc = p.pick(['#e63946', '#2a6ab8', '#1f8a50']);
    p.line(0.75 - d * 0.5, 0.42, 0.75 - d * 1.3, 0.4, 0.02, '#ffffff', 0.8);
    p.hero(0, 0, 0.75, 0.42, 0.9, function () {
      function D(x) { return x * d; }
      p.fill(poly([[D(0.02), -0.02], [D(0.1), -0.02], [D(-0.05), -0.22], [D(-0.11), -0.22]]), '#9aa4b2');
      p.fill(poly([[D(-0.45), -0.03], [D(-0.62), -0.32], [D(-0.52), -0.32], [D(-0.34), -0.03]]), acc);
      p.fill(ell(0, 0, 0.62, 0.09), function (x, y) { return y > 0.03 ? '#c8d0dc' : '#f4f6fa'; });
      p.fill(rect(-0.56, 0.02, 0.56, 0.04), acc);
      for (var w = -0.36; w < 0.4; w += 0.08) p.fill(rect(D(w) - 0.02, -0.035, D(w) + 0.02, -0.005), '#2a4a7a');
      p.fill(ell(D(0.52), -0.025, 0.06, 0.03), '#2a4a7a');
      p.fill(poly([[D(0.06), 0.03], [D(-0.2), 0.34], [D(-0.3), 0.34], [D(-0.1), 0.03]]), '#dfe4ee');
      p.fill(ell(D(-0.11), 0.16, 0.08, 0.035), '#8a94a4');
    });
  });

  scene('cottage', 'Cozy Cottage', 'Casita acogedora', 'things', function (p) {
    sky(p, ['#5aa7e6', '#a8d8f5', '#eaf8ff'], 0.66);
    var hx = p.rand(0.6, 0.9);
    sun(p, hx < 0.75 ? 1.28 : 0.22, 0.14, 0.06, '#fffbe0', '#fff2a8', 0.4);
    cloud(p, hx < 0.75 ? 1.05 : 0.45, 0.22, 0.26, '#ffffff', '#dcecf8');
    var w = wav(p, 0.02, 3);
    hill(p, function (x) { return 0.66 + w(x); }, '#7cc35c');
    roundTree(p, hx < 0.75 ? 1.3 : 0.2, 0.86, 0.5, '#3f9a4f', '#2f7a3c', '#6a4a2e');
    var wall = p.pick(['#f4ead8', '#fbe3c8', '#e8f0f8']), roof = p.pick(['#c0392b', '#5a4a8a', '#8a5a3a']);
    p.hero(0, 0, hx, 0.5, 0.68, function () {
      p.fill(rect(0.2, -0.52, 0.32, -0.24), '#8a5a4a');
      p.fill(rect(-0.45, -0.1, 0.45, 0.45), function (x) { return x > 0.3 ? dark(wall, 0.1) : wall; });
      p.fill(poly([[-0.56, -0.08], [0, -0.48], [0.56, -0.08]]), function (x) { return x > 0 ? dark(roof, 0.2) : roof; });
      p.fill(rect(-0.08, 0.12, 0.08, 0.45), '#6a3a2a');
      p.fill(circ(0.045, 0.3, 0.018), '#ffd23f');
      [-0.28, 0.28].forEach(function (x) {
        p.fill(rect(x - 0.1, 0.02, x + 0.1, 0.2), '#8fd3ff');
        p.fill(rect(x - 0.01, 0.02, x + 0.01, 0.2), '#ffffff'); p.fill(rect(x - 0.1, 0.1, x + 0.1, 0.12), '#ffffff');
        p.fill(rect(x - 0.12, 0.2, x + 0.12, 0.25), '#7a5a3a');
        p.fill(rect(x - 0.1, 0.17, x - 0.05, 0.2), '#ff4d6d'); p.fill(rect(x + 0.05, 0.17, x + 0.1, 0.2), '#ffd23f');
      });
    });
    p.fill(poly([[hx - 0.05, 0.81], [hx + 0.05, 0.81], [hx + 0.12, 1], [hx - 0.12, 1]]), '#d8c8a8');
    for (var f = 0; f < X; f += 0.08) if (Math.abs(f - hx) > 0.12) p.fill(rect(f, 0.84, f + 0.025, 0.93), '#ffffff');
    p.sprinkle(rect(0, 0.93, X, 1), 20, ['#ff4d6d', '#ffd23f', '#b56cff']);
  });

  scene('submarine', 'Yellow Submarine', 'Submarino amarillo', 'things', function (p) {
    underwater(p);
    sandFloor(p, 0.88);
    for (var s = 0; s < 6; s++) seaweed(p, p.rand(0, X), 0.99, p.rand(0.1, 0.22), p.pick(['#2f8a4a', '#3fa35a']));
    var d = flip(p);
    for (var f = 0; f < 3; f++) fish(p, p.rand(0.1, 1.4), p.rand(0.1, 0.25), 0.025, p.pick(['#ff7b54', '#ffd166', '#b56cff']), '#ffffff', d);
    p.hero(0, 0, p.rand(0.62, 0.88), 0.48, 0.72, function () {
      function D(x) { return x * d; }
      var y1 = '#ffd23f', y2 = '#e0a81a';
      p.fill(poly([[D(-0.56), 0.05], [D(-0.72), -0.1], [D(-0.72), 0.2]]), y2);
      p.fill(ell(D(-0.7), 0.05, 0.035, 0.13), '#8a8f9a');
      p.fill(rect(D(0.02) - 0.02, -0.5, D(0.02) + 0.02, -0.3), '#8a8f9a');
      p.fill(rect(Math.min(D(0.02), D(0.12)), -0.5, Math.max(D(0.02), D(0.12)), -0.46), '#8a8f9a');
      p.fill(rect(D(-0.05) - 0.14, -0.33, D(-0.05) + 0.14, -0.08), function (x) { return x > D(-0.05) + 0.05 ? y2 : y1; });
      p.fill(ell(0, 0.05, 0.6, 0.22), function (x, y) { return y > 0.12 ? y2 : y1; });
      [-0.26, 0, 0.26].forEach(function (x) { p.fill(circ(D(x), 0.03, 0.075), '#b88a1a'); p.fill(circ(D(x), 0.03, 0.05), '#8fe0ff'); });
    });
    bubbles(p, 8, 0.05, 0.8, '#e0f8ff');
  });

  // ===== sports =====
  function turned(shape, a) {   // a shape turned by angle a around (0, 0)
    var c = Math.cos(a), s = Math.sin(a);
    return S(function (x, y) { return shape(x * c + y * s, -x * s + y * c); }, [-1, -1, 1, 1]);
  }
  function pent(cx, cy, r, rot) { var pts = []; for (var k = 0; k < 5; k++) { var a = rot + k * Math.PI * 2 / 5; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return poly(pts); }
  function confetti(p, n) { p.sprinkle(rect(0, 0, X, 1), n, ['#ff4d6d', '#ffd23f', '#4dc9ff', '#3ee08f', '#b56cff']); }

  scene('soccer-ball', 'Soccer Ball', 'Balón de fútbol', 'sports', function (p) {
    sky(p, ['#4a9be8', '#9fd0f5'], 0.42);
    p.fill(rect(0, 0.3, X, 0.42), '#3a4a7a');
    p.fill(rect(0, 0.3, X, 0.42), function (x, y) { return hash(Math.floor(x * 30), Math.floor(y * 30), 4) < 0.35 ? p.pick(['#ff4d4d', '#ffd23f', '#ffffff']) : null; });
    p.fill(rect(0, 0.42, X, 1), function (x) { return Math.floor(x / 0.15) % 2 ? '#3fa34f' : '#4cb45c'; });
    var bx = p.rand(0.6, 0.9), gx = bx < 0.75 ? 1.15 : 0.35;
    p.fill(rect(0, 0.8, X, 0.82), '#ffffff');
    p.fill(rect(gx - 0.3, 0.3, gx + 0.3, 0.62), function (x, y) { return (Math.floor((x - gx) / 0.04) + Math.floor(y / 0.04)) % 2 ? '#e8ecf2' : null; });
    p.fill(minus(rect(gx - 0.31, 0.29, gx + 0.31, 0.62), rect(gx - 0.28, 0.32, gx + 0.28, 0.63)), '#ffffff');
    p.hero(0, 0, bx, 0.6, 0.72, function () {
      var ball = circ(0, 0, 0.45);
      p.fill(ball, function (x, y) { return x + y > 0.3 ? '#c9ced9' : '#ffffff'; });
      p.fill(pent(0, 0, 0.15, -Math.PI / 2), '#1a1a24');
      for (var k = 0; k < 5; k++) { var a = -Math.PI / 2 + k * Math.PI * 2 / 5; p.fill(and(pent(Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0.13, a + Math.PI / 5), ball), '#1a1a24'); }
    });
  });

  scene('basketball', 'Basketball Hoop', 'Aro de baloncesto', 'sports', function (p) {
    p.fill(rect(0, 0, X, 0.72), function (x, y) { return Math.floor(y / 0.12) % 2 ? '#3a4a7a' : '#34436e'; });
    p.fill(rect(0, 0.72, X, 1), function (x) { return Math.abs(((x + 1) % 0.12) - 0.06) < 0.006 ? '#b8843f' : '#d9a55f'; });
    p.fill(rect(0, 0.84, X, 0.86), '#ffffff');
    var bx = p.rand(0.6, 0.9);
    p.hero(0, 0, bx, 0.5, 0.8, function () {
      p.fill(rect(-0.36, -0.5, 0.36, -0.08), '#ffffff');
      p.fill(minus(rect(-0.36, -0.5, 0.36, -0.08), rect(-0.33, -0.47, 0.33, -0.11)), '#e63946');
      p.fill(minus(rect(-0.13, -0.3, 0.13, -0.12), rect(-0.1, -0.27, 0.1, -0.12)), '#e63946');
      p.fill(poly([[-0.2, -0.06], [0.2, -0.06], [0.12, 0.16], [-0.12, 0.16]]), function (x, y) {
        return Math.abs(((x + 1) % 0.1) - 0.05) < 0.018 ? null : '#ffffff';
      });
      p.fill(minus(ell(0, -0.07, 0.25, 0.065), ell(0, -0.07, 0.16, 0.025)), '#ff5a1f');
      var cx = 0.36, cy = 0.33, r = 0.17;
      p.fill(circ(cx, cy, r), function (x, y) {
        var dx = x - cx, dy = y - cy;
        if (Math.abs(dx) < 0.014 || Math.abs(dy) < 0.014) return '#1a1a24';
        if (Math.abs(Math.sqrt((dx + r) * (dx + r) + dy * dy) - r * 0.9) < 0.014 || Math.abs(Math.sqrt((dx - r) * (dx - r) + dy * dy) - r * 0.9) < 0.014) return '#1a1a24';
        return dx + dy > 0.12 ? '#d9481a' : '#ff7a2f';
      });
    });
  });

  scene('baseball', 'Baseball', 'Béisbol', 'sports', function (p) {
    sky(p, ['#4a9be8', '#9fd0f5', '#dff2ff'], 0.5);
    cloud(p, p.rand(0.2, 1.3), 0.16, 0.26, '#ffffff', '#dcecf8');
    p.fill(rect(0, 0.5, X, 1), '#4cb45c');
    p.fill(below(function (x) { return 0.72 + Math.pow((x - 0.75) / 0.9, 2) * 0.3; }, 0.7), '#c8864f');
    p.fill(rect(0.7, 0.9, 0.8, 0.93), '#ffffff');
    var d = flip(p), bx = p.rand(0.65, 0.85);
    p.hero(0, 0, bx, 0.48, 0.9, function () {
      p.fill(turned(or(rect(-0.62, -0.035, 0.1, 0.035), poly([[0.1, -0.035], [0.62, -0.075], [0.62, 0.075], [0.1, 0.035]]), circ(0.62, 0, 0.075), circ(-0.64, 0, 0.05)), d * -0.6), function (x, y) { return y > x * d * -0.68 + 0.02 ? '#9a6a36' : '#c9924f'; });
      var cx = -0.18 * d, cy = 0.2, r = 0.25;
      p.fill(circ(cx, cy, r), function (x, y) {
        var dx = x - cx, dy = y - cy;
        var s1 = Math.abs(Math.sqrt((dx + r * 1.15) * (dx + r * 1.15) + dy * dy) - r * 0.85) < 0.022, s2 = Math.abs(Math.sqrt((dx - r * 1.15) * (dx - r * 1.15) + dy * dy) - r * 0.85) < 0.022;
        if ((s1 || s2) && Math.floor((dy + 1) / 0.05) % 2) return '#e63946';
        return dx + dy > 0.15 ? '#d8dce6' : '#ffffff';
      });
    });
  });

  scene('football', 'Football', 'Balón de fútbol americano', 'sports', function (p) {
    p.fill(rect(0, 0, X, 0.45), grad(['#0a1030', '#1f2f6a'], 0, 0.45, 3));
    [0.15, X - 0.15].forEach(function (lx) { p.fill(rect(lx - 0.1, 0.06, lx + 0.1, 0.14), '#fff6c0'); p.fill(rect(lx - 0.01, 0.14, lx + 0.01, 0.42), '#5a5f78'); });
    p.fill(rect(0, 0.45, X, 1), function (x, y) { return Math.abs(((x + (y - 0.45) * 0.4 + 1) % 0.2) - 0.1) < 0.008 ? '#ffffff' : '#3f9a4a'; });
    var gx = p.chance(0.5) ? 0.3 : 1.2;
    p.fill(rect(gx - 0.012, 0.28, gx + 0.012, 0.6), '#ffd23f');
    p.fill(rect(gx - 0.14, 0.28, gx + 0.14, 0.3), '#ffd23f');
    p.fill(rect(gx - 0.14, 0.08, gx - 0.12, 0.3), '#ffd23f'); p.fill(rect(gx + 0.12, 0.08, gx + 0.14, 0.3), '#ffd23f');
    p.hero(0, 0, gx < 0.75 ? p.rand(0.85, 1.0) : p.rand(0.5, 0.65), 0.55, 0.8, function () {
      var a = -0.45, lens = and(circ(0, 0.4, 0.68), circ(0, -0.4, 0.68));
      p.fill(turned(lens, a), function (x, y) {
        var c = Math.cos(a), s = Math.sin(a), u = x * c + y * s, v = -x * s + y * c;
        if (Math.abs(Math.abs(u) - 0.38) < 0.03) return '#ffffff';
        if (Math.abs(v + 0.13) < 0.02 && Math.abs(u) < 0.17) return '#ffffff';
        if (Math.abs(u) < 0.17 && v < -0.08 && v > -0.18 && Math.abs(((u + 1) % 0.07) - 0.035) < 0.012) return '#ffffff';
        return v > 0.05 ? '#7a3a1a' : '#9a4e24';
      });
    });
  });

  scene('tennis', 'Tennis', 'Tenis', 'sports', function (p) {
    sky(p, ['#4a9be8', '#9fd0f5'], 0.4);
    p.fill(rect(0, 0.4, X, 1), '#3a7ac8');
    p.fill(rect(0, 0.55, X, 0.57), '#ffffff'); p.fill(rect(0.2, 0.4, 0.22, 1), '#ffffff'); p.fill(rect(X - 0.22, 0.4, X - 0.2, 1), '#ffffff');
    p.fill(rect(0, 0.4, X, 0.48), function (x, y) { return (Math.floor(x / 0.03) + Math.floor(y / 0.03)) % 2 ? '#1a1a24' : '#3a3a48'; });
    p.fill(rect(0, 0.39, X, 0.41), '#ffffff');
    var d = flip(p);
    p.hero(0, 0, p.rand(0.65, 0.85), 0.52, 0.9, function () {
      var rc = p.pick(['#e63946', '#2a4db8', '#9b5de5']);
      var a = d > 0 ? 0.7 : Math.PI - 0.7, c = Math.cos(a), s = Math.sin(a);
      p.fill(turned(or(rect(0.14, -0.055, 0.66, 0.055), poly([[0.08, 0], [0.2, -0.07], [0.2, 0.07]])), a), function (x, y) { var u = x * c + y * s; return u > 0.36 && Math.floor((u + 1) / 0.06) % 2 ? '#5a5a6a' : '#2a2a36'; });
      p.fill(turned(ell(-0.18, 0, 0.3, 0.23), a), rc);
      p.fill(turned(ell(-0.18, 0, 0.23, 0.16), a), function (x, y) {
        var u = x * c + y * s, v = -x * s + y * c;
        return Math.abs(((u + 1) % 0.08) - 0.04) < 0.013 || Math.abs(((v + 1) % 0.08) - 0.04) < 0.013 ? dark(rc, 0.2) : '#f4f4f4';
      });
      var bx = 0.38 * d, by = -0.22;
      p.fill(circ(bx, by, 0.12), function (x, y) { return Math.abs(Math.sqrt((x - bx + 0.14) * (x - bx + 0.14) + (y - by) * (y - by)) - 0.1) < 0.018 ? '#ffffff' : (x - bx) + (y - by) > 0.06 ? '#b8d420' : '#dff23a'; });
    });
  });

  scene('trophy', 'Champion Trophy', 'Trofeo de campeón', 'sports', function (p) {
    p.fill(rect(0, 0, X, 1), grad(p.pick([['#2a1a5a', '#6a2a8a'], ['#0f2a5a', '#2a5aa0'], ['#5a1a2a', '#a03a4a']]), 0, 1, 5));
    var tx = p.rand(0.6, 0.9);
    p.fill(poly([[tx - 0.08, 0], [tx + 0.08, 0], [tx + 0.5, 1], [tx - 0.5, 1]]), '#ffffff', 0.15);
    confetti(p, 40);
    var g = '#ffcc33', gd = '#d99a1a', gl = '#fff0a0';
    p.hero(0, 0, tx, 0.5, 0.88, function () {
      p.fill(minus(ell(-0.3, -0.25, 0.13, 0.13), ell(-0.3, -0.25, 0.08, 0.08)), gd);
      p.fill(minus(ell(0.3, -0.25, 0.13, 0.13), ell(0.3, -0.25, 0.08, 0.08)), gd);
      p.fill(or(rect(-0.28, -0.46, 0.28, -0.2), and(ell(0, -0.2, 0.28, 0.24), rect(-1, -0.2, 1, 1))), function (x, y) { return x > 0.12 ? gd : x < -0.18 && y < -0.1 ? gl : g; });
      p.fill(rect(-0.3, -0.5, 0.3, -0.44), gd);
      p.fill(rect(-0.05, 0.03, 0.05, 0.22), gd);
      p.fill(rect(-0.16, 0.2, 0.16, 0.27), g);
      p.fill(rect(-0.26, 0.27, 0.26, 0.5), '#5a3a26');
      p.fill(rect(-0.16, 0.33, 0.16, 0.43), gl);
      p.fill(pent(0, -0.25, 0.09, -Math.PI / 2), gl);
    });
  });

  scene('skateboard', 'Skateboard', 'Patineta', 'sports', function (p) {
    sky(p, ['#ff9a5a', '#ffc86b', '#ffe8b0'], 0.6);
    var d = flip(p), sx = p.rand(0.6, 0.9);
    p.fill(circ(sx < 0.75 ? 1.25 : 0.25, 0.2, 0.08), '#fff4d0');
    p.fill(rect(0, 0.6, X, 1), '#a8adba');
    var rx = d > 0 ? 0 : X;
    p.fill(and(rect(Math.min(rx, rx + d * 0.45) - 0.01, 0.3, Math.max(rx, rx + d * 0.45) + 0.01, 1), minus(rect(0, 0, X, 1), circ(rx + d * 0.5, 0.3, 0.45))), '#8a8f9e');
    p.fill(rect(0, 0.78, X, 0.8), '#8a8f9e');
    p.fill(rect(0.4, 0.62, 0.7, 0.7), function (x, y) { return hash(Math.floor(x * 40), Math.floor(y * 40), 2) < 0.4 ? '#ff4d8f' : null; });
    var deck = p.pick([['#e63946', '#ffd23f'], ['#2a4db8', '#4dc9ff'], ['#3ee08f', '#1a1a24']]);
    p.hero(0, 0, sx, 0.48, 0.95, function () {
      var a = d * -0.15;
      p.fill(turned(or(rect(-0.44, 0.04, -0.26, 0.14), rect(0.26, 0.04, 0.44, 0.14)), a), '#8a8f9a');
      p.fill(turned(or(circ(-0.35, 0.22, 0.11), circ(0.35, 0.22, 0.11)), a), '#ffd23f');
      p.fill(turned(or(circ(-0.35, 0.22, 0.04), circ(0.35, 0.22, 0.04)), a), '#b8960f');
      p.fill(turned(or(rect(-0.52, -0.06, 0.52, 0.06), poly([[0.5, -0.06], [0.68, -0.16], [0.7, -0.08], [0.5, 0.06]]), poly([[-0.5, -0.06], [-0.68, -0.16], [-0.7, -0.08], [-0.5, 0.06]])), a), function (x, y) {
        var c = Math.cos(a), s = Math.sin(a), u = x * c + y * s; return Math.floor((u + 1) / 0.16) % 2 ? deck[0] : deck[1];
      });
    });
  });

  scene('bowling', 'Bowling Strike', 'Chuza en el boliche', 'sports', function (p) {
    p.fill(rect(0, 0, X, 0.5), grad(['#1a1030', '#3a2a5a'], 0, 0.5, 3));
    [0.2, 0.55, 0.95, 1.3].forEach(function (x) { p.fill(rect(x - 0.08, 0.08, x + 0.08, 0.14), '#ff4d8f'); });
    p.fill(poly([[0.35, 0.5], [1.15, 0.5], [1.5, 1], [0, 1]]), function (x) { return Math.abs(((x + 1) % 0.1) - 0.05) < 0.006 ? '#b8843f' : '#e0b070'; });
    p.fill(poly([[0, 0.5], [0.35, 0.5], [0, 1]]), '#2a2a3a'); p.fill(poly([[1.15, 0.5], [X, 0.5], [X, 1]]), '#2a2a3a');
    var ballC = p.pick(['#2a4db8', '#e63946', '#9b5de5', '#1f8a50']), d = flip(p);
    p.hero(0, 0, 0.75, 0.52, 0.9, function () {
      function pin(x, y, s) {
        p.fill(or(ell(x, y + 0.1 * s, 0.1 * s, 0.24 * s), ell(x, y - 0.22 * s, 0.06 * s, 0.1 * s), rect(x - 0.04 * s, y - 0.2 * s, x + 0.04 * s, y - 0.05 * s)), function (xx, yy) {
          if (Math.abs(yy - (y - 0.1 * s)) < 0.02 * s || Math.abs(yy - (y - 0.05 * s)) < 0.015 * s) return '#e63946';
          return xx > x + 0.04 * s ? '#d8dce6' : '#ffffff';
        });
      }
      pin(-0.15 * d, -0.08, 0.95); pin(0.05 * d, -0.12, 0.9); pin(0.25 * d, -0.06, 1);
      var bx = -0.35 * d, by = 0.26, r = 0.22;
      p.fill(circ(bx, by, r), function (x, y) { return (x - bx) + (y - by) > 0.14 ? dark(ballC, 0.3) : ballC; });
      [[-0.06, -0.08], [0.04, -0.1], [-0.01, 0.0]].forEach(function (h) { p.fill(circ(bx + h[0], by + h[1], 0.03), '#1a1a24'); });
    });
  });

  scene('gold-medal', 'Gold Medal', 'Medalla de oro', 'sports', function (p) {
    p.fill(rect(0, 0, X, 1), grad(p.pick([['#1f3a8a', '#4a7ae0'], ['#1a5a4a', '#3aa07a'], ['#5a2a8a', '#9a5ad0']]), 0, 1, 5));
    confetti(p, 45);
    var rib = p.pick([['#e63946', '#2a4db8'], ['#2a4db8', '#ffffff'], ['#1f8a50', '#ffd23f']]);
    p.hero(0, 0, p.rand(0.6, 0.9), 0.5, 0.95, function () {
      p.fill(poly([[-0.32, -0.55], [-0.14, -0.55], [0.08, 0.02], [-0.08, 0.06]]), function (x) { return Math.floor((x + 1) / 0.05) % 2 ? rib[0] : rib[1]; });
      p.fill(poly([[0.32, -0.55], [0.14, -0.55], [-0.08, 0.02], [0.08, 0.06]]), function (x) { return Math.floor((x + 1) / 0.05) % 2 ? dark(rib[0], 0.2) : dark(rib[1], 0.2); });
      p.fill(circ(0, 0.22, 0.27), '#d99a1a');
      p.fill(circ(0, 0.22, 0.21), function (x, y) { return x + (y - 0.22) < -0.15 ? '#fff0a0' : '#ffcc33'; });
      var pts = []; for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 0.06 : 0.14; pts.push([Math.cos(a) * r, 0.22 + Math.sin(a) * r]); }
      p.fill(poly(pts), '#d99a1a');
    });
  });

  // ===== fashion and style =====
  function pastel(p) {
    var c = p.pick([['#ffd6e8', '#ffb0d0'], ['#d8e8ff', '#b0ccff'], ['#e8dcff', '#cbb4ff'], ['#d4f5e8', '#a8e8cc'], ['#fff0c8', '#ffd98a']]);
    p.fill(rect(0, 0, X, 1), grad(c, 0, 1, 4));
    p.sprinkle(rect(0, 0, X, 0.8), 14, ['#ffffff']);
    return c;
  }
  function shelf(p, y, col) { p.fill(rect(0, y, X, 1), col || '#e8d8c8'); p.fill(rect(0, y, X, y + 0.02), dark(col || '#e8d8c8', 0.15)); }

  scene('sneaker', 'Sneaker', 'Tenis deportivo', 'fashion', function (p) {
    pastel(p); shelf(p, 0.8);
    var d = flip(p), c = p.pick([['#e63946', '#ffffff'], ['#2a4db8', '#ffd23f'], ['#9b5de5', '#3ee08f'], ['#ff8c42', '#2a2a36'], ['#1f8a50', '#ffffff']]);
    p.hero(0, 0, 0.75, 0.5, 0.88, function () {
      function D(x) { return x * d; }
      p.fill(poly([[D(-0.6), 0.15], [D(-0.58), -0.18], [D(-0.42), -0.24], [D(-0.18), -0.08], [D(0.2), -0.03], [D(0.46), 0.02], [D(0.62), 0.12], [D(0.64), 0.16]]), c[0]);
      p.fill(and(ell(D(0.48), 0.16, 0.2, 0.15), rect(-1, -1, 1, 0.16)), '#f4f4f4');
      p.fill(ell(D(-0.42), -0.2, 0.15, 0.045), '#2a2a36');
      p.fill(poly([[D(-0.24), -0.1], [D(-0.18), -0.24], [D(-0.06), -0.2], [D(-0.08), -0.08]]), dark(c[0], 0.25));
      p.fill(rect(Math.min(D(-0.62), D(-0.53)), -0.22, Math.max(D(-0.62), D(-0.53)), 0.12), dark(c[0], 0.3));
      p.fill(poly([[D(-0.44), 0.1], [D(0.08), 0.02], [D(0.32), -0.03], [D(0.12), 0.1], [D(-0.4), 0.15]]), c[1]);
      [[-0.1, -0.06], [0.02, -0.04], [0.14, -0.02]].forEach(function (l) { p.line(D(l[0] - 0.05), l[1] - 0.04, D(l[0] + 0.05), l[1] + 0.02, 0.03, '#ffffff'); p.line(D(l[0] - 0.05), l[1] + 0.02, D(l[0] + 0.05), l[1] - 0.04, 0.03, '#ffffff'); });
      p.fill(poly([[D(-0.64), 0.14], [D(0.52), 0.14], [D(0.68), 0.18], [D(0.68), 0.3], [D(-0.64), 0.3]]), '#ffffff');
      p.fill(rect(-0.66, 0.26, 0.7, 0.31), '#8a8f9e');
    });
  });

  scene('high-heel', 'High Heel', 'Zapato de tacón', 'fashion', function (p) {
    pastel(p); shelf(p, 0.88, '#f4ecf4');
    var d = flip(p), c = p.pick(['#e63946', '#ff4d8f', '#1a1a24', '#9b5de5', '#e0b030']);
    p.hero(0, 0, 0.75, 0.48, 0.86, function () {
      function D(x) { return x * d; }
      var heel = p.pick([dark(c, 0.35), '#1a1a24']);
      p.fill(poly([[D(-0.53), 0.02], [D(-0.4), 0.05], [D(-0.44), 0.46], [D(-0.49), 0.46]]), heel);
      p.fill(rect(Math.min(D(-0.5), D(-0.43)), 0.44, Math.max(D(-0.5), D(-0.43)), 0.48), '#1a1a24');
      p.fill(poly([[D(-0.54), -0.16], [D(-0.36), -0.13], [D(-0.2), -0.02], [D(0.05), 0.17], [D(0.3), 0.25], [D(0.52), 0.25], [D(0.64), 0.31], [D(0.64), 0.4], [D(0.3), 0.42], [D(0.04), 0.36], [D(-0.2), 0.15], [D(-0.4), 0.07], [D(-0.54), 0.05]]), function (x, y) { return y < 0.05 && x * d < -0.3 ? dark(c, 0.15) : c; });
      p.fill(poly([[D(-0.5), -0.13], [D(-0.37), -0.1], [D(-0.15), 0.04], [D(0.1), 0.2], [D(0.24), 0.24], [D(0.08), 0.26], [D(-0.18), 0.12], [D(-0.48), 0.0]]), mixc(c, '#ffffff', 0.55));
      p.fill(poly([[D(0.04), 0.36], [D(0.3), 0.42], [D(0.64), 0.4], [D(0.64), 0.43], [D(0.3), 0.45], [D(0.04), 0.39], [D(-0.2), 0.18], [D(-0.2), 0.15]]), '#1a1a24');
      p.fill(ell(D(0.28), 0.28, 0.07, 0.045), '#ffffff');
      p.fill(circ(D(0.28), 0.28, 0.025), '#ffd23f');
      p.fill(ell(D(0.52), 0.3, 0.07, 0.02), mixc(c, '#ffffff', 0.4));
    });
    p.sprinkle(rect(0, 0, X, 0.8), 10, ['#ffffff', '#fff0a0']);
  });

  scene('party-dress', 'Party Dress', 'Vestido de fiesta', 'fashion', function (p) {
    pastel(p); shelf(p, 0.9, '#f2e6f2');
    var dx = p.rand(0.62, 0.88);
    p.fill(poly([[dx - 0.06, 0], [dx + 0.06, 0], [dx + 0.45, 0.9], [dx - 0.45, 0.9]]), '#ffffff', 0.25);
    var c = p.pick(['#e63946', '#9b5de5', '#2a9df4', '#ff5da2', '#1f8a50', '#ffb000']), band = p.pick(['#ffd23f', '#ffffff']);
    var light = mixc(c, '#ffffff', 0.35);
    p.hero(0, 0, dx, 0.46, 0.9, function () {
      p.line(-0.17, -0.37, -0.14, -0.45, 0.05, c); p.line(0.17, -0.37, 0.14, -0.45, 0.05, c);
      p.fill(poly([[-0.21, -0.38], [-0.08, -0.33], [0, -0.29], [0.08, -0.33], [0.21, -0.38], [0.14, -0.04], [-0.14, -0.04]]), function (x) { return x > 0.08 ? dark(c, 0.15) : c; });
      var skirt = or(poly([[-0.13, -0.02], [0.13, -0.02], [0.52, 0.42], [-0.52, 0.42]]));
      for (var k = -3; k <= 3; k++) skirt = or(skirt, circ(k * 0.15, 0.42, 0.08));
      p.fill(skirt, function (x, y, i, j) {
        if (hash(Math.floor((x + 1) * 30), Math.floor((y + 1) * 30), 5) < 0.06) return '#ffffff';
        return y > 0.1 && y < 0.24 ? light : x > 0.2 ? dark(c, 0.12) : c;
      });
      p.fill(rect(-0.15, -0.07, 0.15, 0.0), band);
      p.fill(poly([[0, -0.035], [-0.12, -0.1], [-0.12, 0.03]]), band); p.fill(poly([[0, -0.035], [0.12, -0.1], [0.12, 0.03]]), band);
      p.fill(circ(0, -0.035, 0.03), dark(band, 0.2));
    });
  });

  scene('sunglasses', 'Cool Sunglasses', 'Lentes de sol', 'fashion', function (p) {
    var hz = 0.62;
    sky(p, ['#3aa0f0', '#8cd0ff'], hz);
    sun(p, p.rand(0.2, 1.3), 0.14, 0.07, '#fffbe0', '#fff2a8', 0.4);
    p.fill(rect(0, hz, X, 0.74), '#2fb0cf'); p.fill(rect(0, 0.74, X, 1), '#f3d99c');
    var fr = p.pick(['#ff4d8f', '#1a1a24', '#ffd23f', '#9b5de5']), heart = p.chance(0.4);
    p.hero(0, 0, 0.75, 0.46, 0.8, function () {
      p.line(-0.62, -0.1, -0.72, 0.1, 0.04, fr); p.line(0.62, -0.1, 0.72, 0.1, 0.04, fr);
      p.fill(rect(-0.12, -0.14, 0.12, -0.09), fr);
      [-1, 1].forEach(function (s) {
        var cx = s * 0.36, lens;
        if (heart) lens = or(circ(cx - 0.1, -0.06, 0.13), circ(cx + 0.1, -0.06, 0.13), poly([[cx - 0.23, -0.02], [cx + 0.23, -0.02], [cx, 0.28]]));
        else lens = ell(cx, 0, 0.27, 0.2);
        p.fill(lens, fr);
        p.fill(heart ? or(circ(cx - 0.1, -0.06, 0.09), circ(cx + 0.1, -0.06, 0.09), poly([[cx - 0.18, -0.02], [cx + 0.18, -0.02], [cx, 0.22]])) : ell(cx, 0, 0.22, 0.15), function (x, y) { return y < -0.02 ? '#3a3a58' : '#1a1a2e'; });
        p.fill(ell(cx - 0.08, -0.08, 0.06, 0.03, -0.4), '#8a90c0');
      });
    });
  });

  scene('handbag', 'Handbag', 'Bolso', 'fashion', function (p) {
    pastel(p); shelf(p, 0.84);
    var c = p.pick(['#e63946', '#ff8c42', '#2a9df4', '#9b5de5', '#1f8a50', '#ff5da2']);
    p.hero(0, 0, p.rand(0.6, 0.9), 0.5, 0.85, function () {
      p.fill(and(minus(ell(0, -0.1, 0.3, 0.36), ell(0, -0.1, 0.23, 0.29)), rect(-1, -1, 1, -0.05)), dark(c, 0.3));
      p.fill(poly([[-0.42, -0.06], [0.42, -0.06], [0.5, 0.46], [-0.5, 0.46]]), function (x) { return x > 0.2 ? dark(c, 0.15) : c; });
      p.fill(poly([[-0.44, -0.06], [0.44, -0.06], [0.44, 0.12], [0, 0.2], [-0.44, 0.12]]), dark(c, 0.25));
      p.fill(circ(0, 0.17, 0.06), '#ffd23f');
      p.fill(rect(-0.5, 0.41, 0.5, 0.46), dark(c, 0.3));
    });
  });

  scene('crown', 'Royal Crown', 'Corona real', 'fashion', function (p) {
    p.fill(rect(0, 0, X, 1), grad(['#3a1a5a', '#7a3a9a'], 0, 1, 4));
    p.sprinkle(rect(0, 0, X, 1), 20, ['#fff0a0', '#ffffff']);
    p.hero(0, 0, 0.75, 0.5, 0.9, function () {
      p.fill(ell(0, 0.36, 0.62, 0.16), '#c0283a');
      p.fill(ell(0, 0.32, 0.56, 0.1), '#e63946');
      var g = '#ffcc33', gd = '#d99a1a';
      p.fill(poly([[-0.42, 0.26], [-0.46, -0.3], [-0.24, -0.06], [0, -0.44], [0.24, -0.06], [0.46, -0.3], [0.42, 0.26]]), function (x, y) { return x > 0.2 ? gd : g; });
      p.fill(rect(-0.44, 0.1, 0.44, 0.27), gd);
      [[-0.46, -0.32, '#ff4d8f'], [0, -0.46, '#4dc9ff'], [0.46, -0.32, '#3ee08f']].forEach(function (j) { p.fill(circ(j[0], j[1], 0.055), j[2]); });
      [[-0.26, 0.18, '#e63946'], [0, 0.18, '#2a4db8'], [0.26, 0.18, '#1f8a50']].forEach(function (j) { p.fill(circ(j[0], j[1], 0.055), j[2]); });
    });
  });

  scene('diamond-ring', 'Diamond Ring', 'Anillo de diamante', 'fashion', function (p) {
    p.fill(rect(0, 0, X, 1), grad(p.pick([['#1a2a5a', '#3a5aa0'], ['#4a1a3a', '#8a3a6a']]), 0, 1, 4));
    p.sprinkle(rect(0, 0, X, 1), 20, ['#ffffff', '#bff4ff']);
    p.hero(0, 0, p.rand(0.62, 0.88), 0.5, 0.92, function () {
      p.fill(minus(ell(0, 0.2, 0.3, 0.28), ell(0, 0.2, 0.22, 0.2)), function (x, y) { return x > 0.1 ? '#d99a1a' : '#ffcc33'; });
      p.fill(poly([[-0.1, -0.1], [0.1, -0.1], [0.06, -0.04], [-0.06, -0.04]]), '#d99a1a');
      p.fill(poly([[-0.22, -0.3], [0.22, -0.3], [0, -0.06]]), function (x) { return x > 0.06 ? '#8fd8f0' : x < -0.06 ? '#e8fbff' : '#bff0ff'; });
      p.fill(poly([[-0.14, -0.44], [0.14, -0.44], [0.22, -0.3], [-0.22, -0.3]]), function (x) { return x > 0.07 ? '#bff0ff' : '#ffffff'; });
    });
  });

  scene('sun-hat', 'Sun Hat', 'Sombrero de sol', 'fashion', function (p) {
    pastel(p);
    var c = p.pick(['#f2d9a0', '#ffffff', '#ffd6e8']), rb = p.pick(['#e63946', '#2a9df4', '#9b5de5', '#1f8a50']);
    p.hero(0, 0, 0.75, 0.52, 0.9, function () {
      p.fill(ell(0, 0.18, 0.72, 0.2), function (x, y) { return y > 0.24 ? dark(c, 0.15) : c; });
      p.fill(and(ell(0, 0.1, 0.34, 0.4), rect(-1, -1, 1, 0.14)), function (x) { return x > 0.14 ? dark(c, 0.12) : c; });
      p.fill(rect(-0.34, 0.02, 0.34, 0.12), rb);
      p.fill(poly([[0.22, 0.1], [0.36, 0.34], [0.28, 0.36]]), rb); p.fill(poly([[0.26, 0.1], [0.46, 0.3], [0.4, 0.34]]), rb);
      for (var k = 0; k < 5; k++) { var a = k * Math.PI * 2 / 5; p.fill(circ(-0.18 + Math.cos(a) * 0.06, 0.06 + Math.sin(a) * 0.06, 0.05), '#ffffff'); }
      p.fill(circ(-0.18, 0.06, 0.035), '#ffd23f');
    });
  });

  scene('hair-bow', 'Hair Bow', 'Moño para el cabello', 'fashion', function (p) {
    pastel(p);
    var c = p.pick(['#ff4d8f', '#e63946', '#9b5de5', '#2a9df4', '#ffb000']), dots = p.chance(0.6);
    p.hero(0, 0, 0.75, 0.48, 0.9, function () {
      var fill = function (x, y) { if (dots && Math.abs(((x + 1) % 0.12) - 0.06) < 0.025 && Math.abs(((y + 1) % 0.12) - 0.06) < 0.025) return '#ffffff'; return y > 0.05 ? dark(c, 0.15) : c; };
      p.fill(poly([[-0.08, 0.06], [-0.2, 0.46], [-0.08, 0.4], [0, 0.48], [0.02, 0.1]]), dark(c, 0.2));
      p.fill(poly([[0.08, 0.06], [0.22, 0.46], [0.1, 0.42], [0.04, 0.5], [-0.02, 0.1]]), dark(c, 0.2));
      p.fill(poly([[-0.06, -0.06], [-0.58, -0.38], [-0.62, 0.3], [-0.06, 0.08]]), fill);
      p.fill(poly([[0.06, -0.06], [0.58, -0.38], [0.62, 0.3], [0.06, 0.08]]), fill);
      p.fill(ell(0, 0.01, 0.1, 0.12), dark(c, 0.3));
    });
  });

  scene('nail-polish', 'Nail Polish', 'Esmalte de uñas', 'fashion', function (p) {
    pastel(p); shelf(p, 0.86, '#ffffff');
    var c = p.pick(['#e63946', '#ff4d8f', '#9b5de5', '#2a9df4', '#3ee08f']);
    p.subject(function () { [[0.25, '#ffd23f'], [1.25, '#ff8c42']].forEach(function (b) { p.fill(rect(b[0] - 0.05, 0.72, b[0] + 0.05, 0.86), b[1]); p.fill(rect(b[0] - 0.02, 0.6, b[0] + 0.02, 0.72), '#1a1a24'); }); });
    p.hero(0, 0, 0.75, 0.5, 0.88, function () {
      p.fill(rect(-0.1, -0.5, 0.1, -0.08), function (x) { return x > 0.04 ? '#1a1a24' : '#3a3a48'; });
      p.fill(rect(-0.16, -0.1, 0.16, -0.04), '#c8ccd6');
      p.fill(or(rect(-0.28, -0.04, 0.28, 0.46), circ(-0.2, 0.38, 0.08), circ(0.2, 0.38, 0.08)), function (x, y) { return x < -0.16 && y < 0.3 ? mixc(c, '#ffffff', 0.5) : x > 0.14 ? dark(c, 0.2) : c; });
      p.fill(rect(-0.2, 0.12, 0.2, 0.28), '#ffffff');
      p.fill(pent(0, 0.2, 0.05, -Math.PI / 2), c);
    });
  });

  // ===== pets =====
  function room(p) {
    p.fill(rect(0, 0, X, 0.72), p.pick(['#bfe0f0', '#f0d8c0', '#d8e8c8', '#e8d8f0']));
    p.fill(rect(0, 0.72, X, 1), function (x) { return Math.abs(((x + 1) % 0.2) - 0.1) < 0.008 ? '#a8783a' : '#c8945a'; });
    p.fill(rect(0, 0.7, X, 0.73), '#ffffff');
  }
  function yard(p) {
    sky(p, ['#5aa7e6', '#a8d8f5', '#e8f6ff'], 0.66);
    cloud(p, p.rand(0.2, 1.3), 0.16, 0.26, '#ffffff', '#dcecf8');
    p.fill(rect(0, 0.66, X, 1), '#6fbe55');
    for (var f = 0; f < X; f += 0.1) p.fill(rect(f, 0.5, f + 0.04, 0.68), '#ffffff');
    p.fill(rect(0, 0.54, X, 0.57), '#ffffff');
    p.sprinkle(rect(0, 0.72, X, 1), 12, ['#ffd23f', '#ffffff', '#ff7bac']);
  }

  scene('puppy', 'Puppy', 'Cachorrito', 'pets', function (p) {
    if (p.chance(0.5)) yard(p); else room(p);
    var c = p.pick([['#e0a45a', '#9a5e2a', '#fbe8cc'], ['#f7f3ea', '#b8743f', '#ffffff'], ['#8a5a3a', '#4a2a18', '#e8c8a8'], ['#d8d8e0', '#3a3a48', '#ffffff']]);
    var col = p.pick(['#e63946', '#2a9df4', '#3ee08f', '#b56cff']), spot = p.chance(0.5);
    p.hero(0, 0, p.rand(0.64, 0.86), 0.5, 0.9, function () {
      p.curve(function (t) { return [0.26 + t * 0.16, 0.36 - t * 0.3]; }, 6, 0.08, c[0]);
      p.fill(ell(0, 0.3, 0.28, 0.2), dark(c[0], 0.18));
      p.fill(ell(-0.23, 0.4, 0.11, 0.09), dark(c[0], 0.18)); p.fill(ell(0.23, 0.4, 0.11, 0.09), dark(c[0], 0.18));
      p.fill(ell(-0.28, 0.48, 0.07, 0.03), c[2]); p.fill(ell(0.28, 0.48, 0.07, 0.03), c[2]);
      p.fill(ell(0, 0.28, 0.08, 0.12), c[2]);
      [-1, 1].forEach(function (s) {
        p.fill(rect(s * 0.1 - 0.05, 0.16, s * 0.1 + 0.05, 0.46), c[0]);
        p.fill(ell(s * 0.1, 0.46, 0.07, 0.04), c[2]);
        p.fill(rect(s * 0.1 - 0.004, 0.44, s * 0.1 + 0.004, 0.5), dark(c[2], 0.25));
      });
      p.fill(ell(0, -0.1, 0.33, 0.28), c[0]);
      if (spot) p.fill(circ(0.13, -0.15, 0.1), c[1]);
      p.fill(ell(-0.33, -0.02, 0.1, 0.2, 0.25), c[1]); p.fill(ell(0.33, -0.02, 0.1, 0.2, -0.25), c[1]);
      p.fill(ell(0, 0.04, 0.15, 0.1), c[2]);
      [-1, 1].forEach(function (s) { p.fill(circ(s * 0.13, -0.13, 0.05), '#1a1208'); p.fill(circ(s * 0.13 - 0.015, -0.15, 0.016), '#ffffff'); });
      p.fill(ell(0, -0.02, 0.06, 0.04), '#1a1208');
      p.fill(ell(0.03, 0.11, 0.045, 0.055), '#ff7b9a');
      p.fill(and(ell(0, 0.19, 0.2, 0.05), rect(-1, 0.17, 1, 1)), col);
      p.fill(circ(0, 0.24, 0.035), '#ffd23f');
    });
  });

  scene('kitten', 'Kitten and Yarn', 'Gatito y estambre', 'pets', function (p) {
    room(p);
    var c = p.pick([['#f0a04a', '#c46a1e', '#fff2e0'], ['#b8bcc8', '#80869a', '#ffffff'], ['#a8866a', '#6e5038', '#f2e8dc']]);
    var yc = p.pick(['#e63946', '#2a9df4', '#9b5de5', '#3ee08f']), d = flip(p);
    p.hero(0, 0, 0.75 - d * 0.08, 0.5, 0.9, function () {
      function D(x) { return x * d; }
      p.curve(function (t) { return [D(-0.24 - Math.sin(t * 2.5) * 0.14), 0.45 - t * 0.34]; }, 8, 0.08, function (t) { return t > 0.8 ? c[1] : c[0]; });
      p.fill(ell(0, 0.33, 0.25, 0.17), function (x, y) { return Math.abs(x) > 0.14 && Math.abs(((y + 1) % 0.09) - 0.045) < 0.017 ? c[1] : c[0]; });
      p.fill(ell(0, 0.35, 0.12, 0.13), c[2]);
      p.fill(ell(D(-0.1), 0.47, 0.07, 0.035), c[2]);
      p.fill(ell(D(0.2), 0.42, 0.09, 0.05, -d * 0.3), c[0]); p.fill(ell(D(0.26), 0.41, 0.04, 0.035), c[2]);
      p.curve(function (t) { return [D(0.3 + t * 0.15), 0.46 - Math.sin(t * 3) * 0.04]; }, 6, 0.016, yc);
      p.fill(circ(D(0.52), 0.34, 0.15), function (x, y) { return Math.abs(((x * d * 0.8 + y + 2) % 0.08) - 0.04) < 0.014 ? dark(yc, 0.3) : yc; });
      [-1, 1].forEach(function (s) {
        p.fill(poly([[s * 0.32, -0.18], [s * 0.29, -0.52], [s * 0.07, -0.36]]), c[0]);
        p.fill(poly([[s * 0.28, -0.23], [s * 0.27, -0.44], [s * 0.13, -0.34]]), '#ffb0c0');
      });
      p.fill(ell(0, -0.12, 0.33, 0.27), c[0]);
      [-0.07, 0, 0.07].forEach(function (sx) { p.fill(rect(sx - 0.015, -0.39, sx + 0.015, -0.29), c[1]); });
      [-1, 1].forEach(function (s) {
        p.fill(ell(s * 0.14, -0.12, 0.085, 0.095), '#7fd35a');
        p.fill(ell(s * 0.14, -0.12, 0.035, 0.085), '#1a1208');
        p.fill(circ(s * 0.14 - 0.03, -0.16, 0.02), '#ffffff');
      });
      p.fill(ell(-0.05, 0.04, 0.065, 0.05), c[2]); p.fill(ell(0.05, 0.04, 0.065, 0.05), c[2]);
      p.fill(poly([[-0.04, -0.02], [0.04, -0.02], [0, 0.03]]), '#ff8fa8');
    });
  });

  scene('bunny', 'Bunny', 'Conejito', 'pets', function (p) {
    yard(p);
    var c = p.pick([['#ffffff', '#d8dce6'], ['#c8a07a', '#a07a54'], ['#9aa0b0', '#747a8a']]), d = flip(p), bx = p.rand(0.62, 0.88);
    p.subject(function () {
      var cx = bx - d * 0.42;
      p.fill(poly([[cx - 0.04, 0.72], [cx + 0.04, 0.72], [cx, 0.92]]), '#ff8c1a');
      p.fill(poly([[cx - 0.04, 0.72], [cx - 0.06, 0.64], [cx, 0.7], [cx + 0.06, 0.64], [cx + 0.04, 0.72]]), '#3f9a42');
    });
    p.hero(0, 0, bx, 0.5, 0.92, function () {
      function D(x) { return x * d; }
      p.fill(circ(D(-0.3), 0.3, 0.08), '#ffffff');
      p.fill(ell(D(-0.05), 0.26, 0.28, 0.22), c[0]);
      p.fill(ell(D(0.12), 0.44, 0.1, 0.05), c[1]);
      p.fill(ell(D(0.16), -0.42, 0.06, 0.2, D(0.15)), c[0]); p.fill(ell(D(0.16), -0.42, 0.03, 0.15, D(0.15)), '#ffb0c0');
      p.fill(ell(D(0.28), -0.4, 0.06, 0.2, D(0.35)), c[1]); p.fill(ell(D(0.28), -0.4, 0.03, 0.15, D(0.35)), '#ffb0c0');
      p.fill(circ(D(0.2), -0.08, 0.2), c[0]);
      p.fill(circ(D(0.28), -0.12, 0.035), '#1a1208');
      p.fill(ell(D(0.38), -0.04, 0.03, 0.025), '#ff8fa8');
    });
  });

  scene('goldfish-bowl', 'Goldfish Bowl', 'Pecera', 'pets', function (p) {
    room(p);
    p.fill(rect(0, 0.84, X, 1), '#8a5a3a'); p.fill(rect(0, 0.82, X, 0.85), '#a8743f');
    var d = flip(p);
    p.hero(0, 0, p.rand(0.62, 0.88), 0.48, 0.8, function () {
      function D(x) { return x * d; }
      var bowl = and(circ(0, 0.02, 0.44), rect(-1, -0.34, 1, 1));
      p.fill(bowl, function (x, y) { return y < -0.18 ? '#e8f6ff' : '#7fd0f0'; });
      p.fill(and(bowl, rect(-1, 0.3, 1, 1)), function (x, y) { return (Math.floor((x + 1) / 0.06) + Math.floor((y + 1) / 0.06)) % 2 ? '#e8b060' : '#c88a40'; });
      p.line(D(-0.2), 0.34, D(-0.26), 0.02, 0.04, '#3f9a42'); p.line(D(-0.14), 0.34, D(-0.08), 0.06, 0.04, '#2f7a36');
      p.fill(poly([[D(-0.1), 0.06], [D(-0.24), -0.04], [D(-0.24), 0.16]]), '#ff8c1a');
      p.fill(ell(D(0.06), 0.06, 0.17, 0.1), '#ff8c1a');
      p.fill(poly([[D(0.02), -0.03], [D(0.12), -0.12], [D(0.14), -0.02]]), '#ff6a0a');
      p.fill(circ(D(0.16), 0.03, 0.025), '#1a1208');
      p.fill(minus(ell(0, -0.34, 0.3, 0.05), ell(0, -0.34, 0.25, 0.025)), '#bfe8ff');
      p.fill(and(minus(circ(0, 0.02, 0.44), circ(0, 0.02, 0.4)), rect(-1, -0.34, 1, 1)), '#bfe8ff');
      p.fill(ell(D(-0.24), -0.1, 0.03, 0.08, D(0.4)), '#ffffff');
    });
  });

  scene('hamster', 'Hamster', 'Hámster', 'pets', function (p) {
    p.fill(rect(0, 0, X, 0.7), p.pick(['#bfe0f0', '#e8d8f0', '#d8f0d8']));
    p.fill(rect(0, 0.7, X, 1), '#f2d9a0');
    p.sprinkle(rect(0, 0.72, X, 1), 20, ['#e0c080', '#fff0c8']);
    var hx = p.rand(0.62, 0.88), bx = hx < 0.75 ? 1.25 : 0.25;
    p.subject(function () {
      p.fill(and(ell(bx, 0.78, 0.16, 0.1), rect(0, 0.78, X, 1)), '#e63946');
      p.fill(ell(bx, 0.78, 0.16, 0.04), '#8a5a3a');
      p.sprinkle(ell(bx, 0.77, 0.14, 0.03), 4, ['#4a3a2a', '#ffffff']);
    });
    p.hero(0, 0, hx, 0.5, 0.82, function () {
      var c = '#e8a04a', w = '#fff2e0';
      [-1, 1].forEach(function (s) { p.fill(circ(s * 0.25, -0.27, 0.09), c); p.fill(circ(s * 0.25, -0.27, 0.05), '#ffb0c0'); });
      p.fill(ell(0, 0.1, 0.42, 0.38), function (x, y) { return y < -0.12 && Math.abs(x) < 0.1 ? '#c8803a' : c; });
      p.fill(ell(0, 0.24, 0.26, 0.22), w);
      p.fill(circ(-0.2, 0.04, 0.13), w); p.fill(circ(0.2, 0.04, 0.13), w);
      [-1, 1].forEach(function (s) { p.fill(circ(s * 0.13, -0.1, 0.045), '#1a1208'); p.fill(circ(s * 0.13 - 0.012, -0.115, 0.015), '#ffffff'); });
      p.fill(ell(0, -0.01, 0.035, 0.025), '#ff8fa8');
      p.fill(ell(0, 0.16, 0.045, 0.08), '#4a3a2a'); p.fill(ell(0, 0.16, 0.018, 0.06), '#f2e8d0');
      p.fill(circ(-0.07, 0.19, 0.04), '#ffb0c0'); p.fill(circ(0.07, 0.19, 0.04), '#ffb0c0');
      p.fill(ell(-0.2, 0.47, 0.08, 0.035), '#ffb0c0'); p.fill(ell(0.2, 0.47, 0.08, 0.035), '#ffb0c0');
    });
  });

  scene('parrot', 'Parrot', 'Loro', 'pets', function (p) {
    sky(p, ['#3fae6a', '#8fd89a'], 1);
    [[0.1, 0.2], [1.4, 0.3], [0.2, 0.85], [1.35, 0.9]].forEach(function (l) { p.fill(ell(l[0], l[1], 0.2, 0.08, 0.6), '#2a8a4a'); });
    var d = flip(p), px = p.rand(0.62, 0.88);
    p.line(-0.05, 0.8, X + 0.05, 0.76, 0.05, '#7a5230');
    p.hero(0, 0, px, 0.4, 0.9, function () {
      function D(x) { return x * d; }
      p.fill(poly([[D(-0.02), 0.2], [D(-0.2), 0.62], [D(-0.08), 0.64], [D(0.08), 0.24]]), '#2a6ad8');
      p.fill(poly([[D(0.0), 0.22], [D(-0.08), 0.62], [D(0.02), 0.62], [D(0.1), 0.24]]), '#e63946');
      p.fill(ell(D(0.04), 0.0, 0.18, 0.28, D(-0.15)), '#e63946');
      p.fill(ell(D(-0.06), 0.06, 0.12, 0.22, D(-0.2)), function (x, y) { return y < 0.0 ? '#ffd23f' : '#2a6ad8'; });
      p.fill(circ(D(0.1), -0.3, 0.15), '#e63946');
      p.fill(ell(D(0.14), -0.3, 0.07, 0.06), '#ffffff');
      p.fill(circ(D(0.15), -0.31, 0.025), '#1a1208');
      p.fill(poly([[D(0.22), -0.36], [D(0.36), -0.3], [D(0.3), -0.16], [D(0.22), -0.22]]), '#2a2a36');
      p.fill(poly([[D(0.22), -0.36], [D(0.34), -0.32], [D(0.27), -0.27]]), '#f2e8d8');
      p.fill(rect(D(0.02) - 0.03, 0.26, D(0.02) + 0.03, 0.36), '#5a5a6a');
    });
  });

  scene('pony', 'Pony', 'Poni', 'pets', function (p) {
    yard(p);
    var d = flip(p), c = p.pick([['#c8864f', '#5a3a26'], ['#f4f4f4', '#ff8fc8'], ['#6a4a3a', '#f2e0b0'], ['#b8b8c8', '#4a4a5a']]);
    p.hero(0, 0, p.rand(0.62, 0.88), 0.5, 0.92, function () {
      function D(x) { return x * d; }
      [-0.26, -0.16, 0.14, 0.24].forEach(function (l) { p.fill(rect(D(l) - 0.035, 0.12, D(l) + 0.035, 0.5), l < 0 && l > -0.2 || l > 0.2 ? dark(c[0], 0.15) : c[0]); p.fill(rect(D(l) - 0.035, 0.44, D(l) + 0.035, 0.5), '#3a2a24'); });
      p.curve(function (t) { return [D(-0.36 - t * 0.14), 0.0 + t * 0.34]; }, 6, 0.08, c[1]);
      p.fill(ell(0, 0.06, 0.36, 0.17), c[0]);
      p.fill(poly([[D(0.18), 0.02], [D(0.26), -0.28], [D(0.4), -0.26], [D(0.36), 0.08]]), c[0]);
      p.fill(ell(D(0.4), -0.28, 0.14, 0.08, D(0.35)), c[0]);
      p.fill(poly([[D(0.28), -0.34], [D(0.3), -0.46], [D(0.36), -0.34]]), c[0]);
      p.fill(poly([[D(0.2), -0.34], [D(0.32), -0.36], [D(0.2), 0.02], [D(0.12), 0.0]]), c[1]);
      p.fill(circ(D(0.38), -0.3, 0.025), '#1a1208');
      p.fill(circ(D(0.5), -0.24, 0.018), '#1a1208');
    });
  });

  scene('snake', 'Pet Snake', 'Serpiente mascota', 'pets', function (p) {
    p.fill(rect(0, 0, X, 0.72), '#cfe8d8');
    p.fill(rect(0, 0.72, X, 1), '#e8c890');
    p.fill(rect(0, 0, 0.03, 1), '#8a8f9e'); p.fill(rect(X - 0.03, 0, X, 1), '#8a8f9e'); p.fill(rect(0, 0, X, 0.03), '#8a8f9e');
    p.fill(and(ell(0.2, 0.8, 0.16, 0.1), rect(0, 0, X, 0.82)), '#9aa0ae');
    p.fill(and(ell(1.3, 0.78, 0.13, 0.08), rect(0, 0, X, 0.8)), '#8a8f9e');
    for (var k = 0; k < 5; k++) p.line(1.2 + k * 0.03, 0.74, 1.12 + k * 0.05, 0.5 - k * 0.02, 0.025, '#3f9a42');
    var c = p.pick([['#3fae4f', '#ffd23f', '#2a7a36'], ['#ff8c2a', '#ffffff', '#c86a14'], ['#4d8dff', '#ffffff', '#2a5ab8']]);
    var d = flip(p);
    p.hero(0, 0, 0.75, 0.5, 0.95, function () {
      function D(x) { return x * d; }
      p.curve(function (t) { return [D(-0.72 + t * 1.12), 0.3 + Math.sin(t * Math.PI * 2.5) * 0.13]; }, 40,
        function (t) { return 0.05 + t * 0.08; }, function (t) { return Math.floor(t * 16) % 3 === 0 ? c[1] : c[0]; });
      p.curve(function (u) { return [D(0.4 + Math.sin(u * 2) * 0.1), 0.3 - u * 0.5]; }, 12, 0.13, function (u) { return Math.floor(u * 5) % 3 === 1 ? c[1] : c[0]; });
      var hx = D(0.52), hy = -0.24;
      p.fill(ell(hx, hy, 0.14, 0.1, d * 0.15), c[0]);
      p.fill(circ(hx + D(0.04), hy - 0.03, 0.035), '#ffd23f'); p.fill(circ(hx + D(0.04), hy - 0.03, 0.018), '#1a1208');
      p.line(hx + D(0.13), hy + 0.02, hx + D(0.26), hy + 0.02, 0.022, '#e63946');
      p.line(hx + D(0.26), hy + 0.02, hx + D(0.32), hy - 0.02, 0.02, '#e63946'); p.line(hx + D(0.26), hy + 0.02, hx + D(0.32), hy + 0.06, 0.02, '#e63946');
    });
  });

  // ---------- public ----------
  function byId(id) { for (var k = 0; k < L.length; k++) if (L[k].id === id) return L[k]; return L[0]; }
  function render(id, seed, W, H) {
    var p = new Painter(W, H, seed | 0);
    try { byId(id).draw(p); } catch (e) { if (window.console) console.error('Area Artist scene ' + id, e); }
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cv.getContext('2d').putImageData(new ImageData(p.d, W, H), 0, 0);
    return cv;
  }
  // the picture as W x H solid-color squares: drawn k times finer, then each square takes the color that covers
  // most of it (this keeps shapes cleaner than sampling one point per square)
  function renderSquares(id, seed, W, H, k) {
    k = k || 6;
    var fine = new Painter(W * k, H * k, seed | 0);
    fine.q = k; FLAT = true;
    try { byId(id).draw(fine); } catch (e) { if (window.console) console.error('Area Artist scene ' + id, e); }
    FLAT = false;
    var out = new Uint8ClampedArray(W * H * 4), d = fine.d, m = fine.m, FW = W * k, sub = new Uint8Array(W * H);
    for (var j = 0; j < H; j++) for (var i = 0; i < W; i++) {
      // a square belongs to the subject if the subject covers a good part of it; its color comes only from that part
      var n = 0, y, x, p;
      for (y = 0; y < k; y++) for (x = 0; x < k; x++) n += m[(j * k + y) * FW + i * k + x];
      var isSub = n >= k * k * 0.35 ? 1 : 0, count = {}, best = 0, bestAt = 0;
      sub[j * W + i] = isSub;
      for (y = 0; y < k; y++) for (x = 0; x < k; x++) {
        p = (j * k + y) * FW + i * k + x;
        if (m[p] !== isSub) continue;
        var q = p * 4, key = (d[q] >> 3) << 10 | (d[q + 1] >> 3) << 5 | (d[q + 2] >> 3);   // near-identical colors count together
        var c = count[key] = (count[key] || 0) + 1;
        if (c > best) { best = c; bestAt = q; }
      }
      var o = (j * W + i) * 4;
      out[o] = d[bestAt]; out[o + 1] = d[bestAt + 1]; out[o + 2] = d[bestAt + 2]; out[o + 3] = 255;
    }
    // a dark outline one square wide around the subject, the way sprites are drawn, so it stands out from the background
    for (var j2 = 0; j2 < H; j2++) for (var i2 = 0; i2 < W; i2++) {
      var s0 = j2 * W + i2;
      if (sub[s0]) continue;
      if ((i2 > 0 && sub[s0 - 1]) || (i2 < W - 1 && sub[s0 + 1]) || (j2 > 0 && sub[s0 - W]) || (j2 < H - 1 && sub[s0 + W])) {
        var o2 = s0 * 4;
        out[o2] = out[o2] * 0.25 + 12; out[o2 + 1] = out[o2 + 1] * 0.25 + 10; out[o2 + 2] = out[o2 + 2] * 0.25 + 22;
      }
    }
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cv.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0);
    return cv;
  }
  window.AreaArtistScenes = { list: L, byId: byId, render: render, renderSquares: renderSquares };
})();
