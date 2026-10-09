// Math Billiards - drawing: the table, the balls, the cue, the short aim preview, the angle diagram drawn right on top
// of the real shot, shot paths, and the cosmetic looks. Everything is plain 2D canvas with cached pieces (the table and
// each ball are drawn once and reused) so it runs smoothly on any student device.
(function () {
  var MB = window.MB, V = MB.V, TB = MB.TABLE, R = MB.R, T = MB.T;
  var Rd = MB.Render = {};
  var cv, ctx, Q = 1, W = MB.W, H = MB.H;
  Rd.init = function (canvas) { cv = canvas; ctx = cv.getContext('2d'); Rd.ctx = ctx; };
  Rd.setQ = function (q) { Q = q; tableLayer = null; sprites = {}; };
  var FONT = "'Nunito', 'Segoe UI', sans-serif";
  var COL = { ball: { red: '#d3202f', blue: '#1f56d0', eight: '#141414', cue: '#f6f3ea' } };
  Rd.COL = COL;

  // ------------------------------------------------------------------ the camera (zooms in on a diagram)
  // world point -> screen:  (p - c) * z + center of the table
  var cam = { x: (TB.x0 + TB.x1) / 2, y: (TB.y0 + TB.y1) / 2, z: 1 }, camTo = null;
  var HOME = { x: cam.x, y: cam.y, z: 1 };
  Rd.cam = cam;
  Rd.camHome = function () { camTo = { x: HOME.x, y: HOME.y, z: 1 }; };
  // frame a set of points (a diagram), as big as fits inside the table's area
  Rd.camFrame = function (pts, pad) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(function (p) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
    pad = pad || 110; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    var vw = (TB.x1 - TB.x0) + 2 * TB.rail - 10, vh = (TB.y1 - TB.y0) + 2 * TB.rail - 10;
    var z = MB.clamp(Math.min(vw / (x1 - x0), vh / (y1 - y0)), 1, 1.75);
    camTo = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: z };
    // keep the zoomed view from showing much past the table's edge
    var hw = vw / 2 / z, hh = vh / 2 / z;
    if (z > 1.01) { camTo.x = MB.clamp(camTo.x, TB.x0 - TB.rail + hw - 40, TB.x1 + TB.rail - hw + 40); camTo.y = MB.clamp(camTo.y, TB.y0 - TB.rail + hh - 40, TB.y1 + TB.rail - hh + 40); }
    else { camTo.x = HOME.x; camTo.y = HOME.y; }
  };
  Rd.camStep = function (dt, instant) {
    if (!camTo) return;
    var k = instant ? 1 : 1 - Math.pow(0.0015, dt);
    cam.x += (camTo.x - cam.x) * k; cam.y += (camTo.y - cam.y) * k; cam.z += (camTo.z - cam.z) * k;
  };
  Rd.toScreen = function (p) { return { x: (p.x - cam.x) * cam.z + HOME.x, y: (p.y - cam.y) * cam.z + HOME.y }; };
  Rd.toWorld = function (s) { return { x: (s.x - HOME.x) / cam.z + cam.x, y: (s.y - HOME.y) / cam.z + cam.y }; };
  function applyCam() { ctx.translate(HOME.x, HOME.y); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y); }

  Rd.begin = function () {
    ctx.setTransform(Q, 0, 0, Q, 0, 0);
    ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
    var g = ctx.createRadialGradient(498, 360, 60, 498, 360, 720);
    g.addColorStop(0, '#1b2a44'); g.addColorStop(1, '#070c16');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1000, H);
  };
  // (the table's area only: a zoomed view never spills under the top bar or the side panel)
  Rd.world = function (fn) { ctx.save(); ctx.beginPath(); ctx.rect(0, 58, 992, H - 58); ctx.clip(); applyCam(); fn(ctx); ctx.restore(); };

  // ------------------------------------------------------------------ the table (drawn once into its own canvas)
  var tableLayer = null, tableTheme = '';
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  Rd.rr = rr;
  function buildTable(th) {
    var S = Math.min(2.5, Q * 1.6), pad = 70, w = (TB.x1 - TB.x0) + 2 * (TB.rail + pad), h = (TB.y1 - TB.y0) + 2 * (TB.rail + pad);
    var c = document.createElement('canvas'); c.width = Math.round(w * S); c.height = Math.round(h * S);
    var x = c.getContext('2d'); x.scale(S, S); x.translate(-(TB.x0 - TB.rail - pad), -(TB.y0 - TB.rail - pad));
    var ox = TB.x0 - TB.rail, oy = TB.y0 - TB.rail, ow = TB.x1 - TB.x0 + 2 * TB.rail, oh = TB.y1 - TB.y0 + 2 * TB.rail;
    // a soft shadow under the table and a pool of light around it
    x.save(); x.shadowColor = 'rgba(0,0,0,0.65)'; x.shadowBlur = 40; x.shadowOffsetY = 14;
    rr(x, ox, oy, ow, oh, 30); x.fillStyle = th.wood; x.fill(); x.restore();
    // the wooden frame
    var wg = x.createLinearGradient(0, oy, 0, oy + oh);
    wg.addColorStop(0, th.woodHi); wg.addColorStop(0.5, th.wood); wg.addColorStop(1, th.woodHi);
    rr(x, ox, oy, ow, oh, 30); x.fillStyle = wg; x.fill();
    x.lineWidth = 2; x.strokeStyle = 'rgba(255,255,255,0.12)'; rr(x, ox + 4, oy + 4, ow - 8, oh - 8, 26); x.stroke();
    if (th.neon) { x.save(); x.shadowColor = th.neon; x.shadowBlur = 18; x.strokeStyle = th.neon; x.lineWidth = 3; rr(x, ox + 2, oy + 2, ow - 4, oh - 4, 28); x.stroke(); x.restore(); }
    // wood grain lines
    x.save(); rr(x, ox, oy, ow, oh, 30); x.clip(); x.globalAlpha = 0.08; x.strokeStyle = '#000';
    for (var i = 0; i < 26; i++) { x.beginPath(); var yy = oy + (i / 26) * oh; x.moveTo(ox, yy); x.bezierCurveTo(ox + ow * 0.3, yy + 6, ox + ow * 0.7, yy - 6, ox + ow, yy + 3); x.stroke(); }
    x.restore();
    // the cushions (a band of darker cloth just inside the wood)
    var cb = 14;
    x.fillStyle = th.cush; x.fillRect(TB.x0 - cb, TB.y0 - cb, TB.x1 - TB.x0 + 2 * cb, TB.y1 - TB.y0 + 2 * cb);
    // the cloth, lit from above
    var cg = x.createRadialGradient((TB.x0 + TB.x1) / 2, (TB.y0 + TB.y1) / 2, 40, (TB.x0 + TB.x1) / 2, (TB.y0 + TB.y1) / 2, (TB.x1 - TB.x0) * 0.62);
    cg.addColorStop(0, th.clothHi); cg.addColorStop(1, th.cloth);
    x.fillStyle = cg; x.fillRect(TB.x0, TB.y0, TB.x1 - TB.x0, TB.y1 - TB.y0);
    if (th.lamp) {   // the glow of a lamp hanging over the middle
      var lg = x.createRadialGradient((TB.x0 + TB.x1) / 2, (TB.y0 + TB.y1) / 2, 10, (TB.x0 + TB.x1) / 2, (TB.y0 + TB.y1) / 2, 300);
      lg.addColorStop(0, 'rgba(255,240,190,0.18)'); lg.addColorStop(1, 'rgba(255,240,190,0)'); x.fillStyle = lg; x.fillRect(TB.x0, TB.y0, TB.x1 - TB.x0, TB.y1 - TB.y0);
    }
    // the cushion noses: a thin highlight where the cloth turns up into the cushion
    x.strokeStyle = 'rgba(255,255,255,0.10)'; x.lineWidth = 2; x.strokeRect(TB.x0 - 1, TB.y0 - 1, TB.x1 - TB.x0 + 2, TB.y1 - TB.y0 + 2);
    x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 3; x.strokeRect(TB.x0 + 1.5, TB.y0 + 1.5, TB.x1 - TB.x0 - 3, TB.y1 - TB.y0 - 3);
    // the head string and foot spot, faintly
    x.fillStyle = 'rgba(255,255,255,0.25)';
    x.beginPath(); x.arc(TB.x0 + (TB.x1 - TB.x0) * 0.72, (TB.y0 + TB.y1) / 2, 2.2, 0, 7); x.fill();
    x.beginPath(); x.arc(TB.x0 + (TB.x1 - TB.x0) * 0.25, (TB.y0 + TB.y1) / 2, 2.2, 0, 7); x.fill();
    // the diamonds (sights) on the wood
    x.fillStyle = th.trim;
    for (i = 1; i < 8; i++) { if (i === 4) continue; var dx = TB.x0 + (TB.x1 - TB.x0) * i / 8; diamond(x, dx, TB.y0 - TB.rail / 2 - 6); diamond(x, dx, TB.y1 + TB.rail / 2 + 6); }
    for (i = 1; i < 4; i++) { var dy = TB.y0 + (TB.y1 - TB.y0) * i / 4; diamond(x, TB.x0 - TB.rail / 2 - 6, dy); diamond(x, TB.x1 + TB.rail / 2 + 6, dy); }
    // the pockets: a leather lip around a dark hole
    MB.POCKETS.forEach(function (p) {
      var pr = p.corner ? 24 : 20;
      x.fillStyle = '#2a2a2a'; x.beginPath(); x.arc(p.c.x, p.c.y, pr + 5, 0, 7); x.fill();
      var pg = x.createRadialGradient(p.c.x, p.c.y, 2, p.c.x, p.c.y, pr);
      pg.addColorStop(0, '#000'); pg.addColorStop(0.75, '#050505'); pg.addColorStop(1, '#262626');
      x.fillStyle = pg; x.beginPath(); x.arc(p.c.x, p.c.y, pr, 0, 7); x.fill();
      x.strokeStyle = th.trim; x.globalAlpha = 0.5; x.lineWidth = 1.5; x.beginPath(); x.arc(p.c.x, p.c.y, pr + 5, 0, 7); x.stroke(); x.globalAlpha = 1;
    });
    // the cushion jaws at each pocket, in the cushion color
    x.strokeStyle = th.cush; x.lineCap = 'round'; x.lineWidth = 7;
    MB.CUSHIONS.forEach(function (s) { if (!s.jaw) return; x.beginPath(); x.moveTo(s.a.x, s.a.y); x.lineTo(s.b.x, s.b.y); x.stroke(); });
    return { c: c, S: S, ox: TB.x0 - TB.rail - pad, oy: TB.y0 - TB.rail - pad, w: w, h: h };
  }
  function diamond(x, cx, cy) { x.beginPath(); x.moveTo(cx, cy - 4); x.lineTo(cx + 3, cy); x.lineTo(cx, cy + 4); x.lineTo(cx - 3, cy); x.closePath(); x.fill(); }
  Rd.table = function () {
    var th = MB.equipped('table');
    if (!tableLayer || tableTheme !== th.id) { tableLayer = buildTable(th); tableTheme = th.id; }
    ctx.drawImage(tableLayer.c, tableLayer.ox, tableLayer.oy, tableLayer.w, tableLayer.h);
  };
  // pockets shut for a wrong answer's demonstration: a glowing bar across each mouth
  Rd.blocked = function (t) {
    ctx.save(); ctx.lineCap = 'round';
    MB.POCKETS.forEach(function (p) {
      ctx.strokeStyle = 'rgba(255,90,90,' + (0.55 + 0.3 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(p.e1.x, p.e1.y); ctx.lineTo(p.e2.x, p.e2.y); ctx.stroke();
    });
    ctx.restore();
  };

  // ------------------------------------------------------------------ balls
  var sprites = {};
  function shade(hex, k) {   // lighten (k > 0) or darken (k < 0) a color
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var f = function (v) { return Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)); };
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }
  function ballSprite(kind, style) {
    var key = kind + style.id;
    if (sprites[key]) return sprites[key];
    var S = Math.min(4, Q * 2.5), size = Math.ceil((2 * R + 4) * S), c = document.createElement('canvas'); c.width = c.height = size;
    var x = c.getContext('2d'), m = size / 2, r = R * S, base = COL.ball[kind];
    var g = x.createRadialGradient(m - r * 0.35, m - r * 0.4, r * 0.1, m, m, r);
    if (style.look === 'matte') { g.addColorStop(0, shade(base, 0.25)); g.addColorStop(1, shade(base, -0.25)); }
    else if (style.look === 'metal') { g.addColorStop(0, shade(base, 0.7)); g.addColorStop(0.35, shade(base, 0.05)); g.addColorStop(0.7, shade(base, -0.45)); g.addColorStop(1, shade(base, 0.15)); }
    else { g.addColorStop(0, shade(base, 0.45)); g.addColorStop(0.55, base); g.addColorStop(1, shade(base, -0.5)); }
    x.fillStyle = g; x.beginPath(); x.arc(m, m, r, 0, 7); x.fill();
    if (style.look === 'pearl') {   // a soft shimmer of other colors
      var pg = x.createLinearGradient(m - r, m - r, m + r, m + r);
      pg.addColorStop(0, 'rgba(255,170,255,0.22)'); pg.addColorStop(0.5, 'rgba(160,255,240,0.18)'); pg.addColorStop(1, 'rgba(255,240,160,0.22)');
      x.fillStyle = pg; x.beginPath(); x.arc(m, m, r, 0, 7); x.fill();
    }
    if (style.look === 'marble') {   // swirls of a lighter tone
      x.save(); x.beginPath(); x.arc(m, m, r, 0, 7); x.clip(); x.strokeStyle = kind === 'cue' ? 'rgba(150,150,170,0.35)' : 'rgba(255,255,255,0.28)'; x.lineWidth = r * 0.12;
      for (var i = 0; i < 4; i++) { x.beginPath(); x.moveTo(m - r, m - r + i * r * 0.6); x.bezierCurveTo(m - r * 0.3, m - r * 1.2 + i * r * 0.7, m + r * 0.2, m + r * 0.3 + i * r * 0.2, m + r, m - r * 0.4 + i * r * 0.5); x.stroke(); }
      x.restore();
    }
    // a dark edge so every ball (even the black one on a dark cloth) stands out
    x.lineWidth = Math.max(1, S * 0.9); x.strokeStyle = kind === 'eight' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'; x.beginPath(); x.arc(m, m, r - S * 0.4, 0, 7); x.stroke();
    // the shine
    var hg = x.createRadialGradient(m - r * 0.38, m - r * 0.45, 0, m - r * 0.38, m - r * 0.45, r * 0.55);
    hg.addColorStop(0, 'rgba(255,255,255,' + (0.9 * style.gloss) + ')'); hg.addColorStop(1, 'rgba(255,255,255,0)');
    var shine = document.createElement('canvas'); shine.width = shine.height = size;
    var sx = shine.getContext('2d'); sx.fillStyle = hg; sx.beginPath(); sx.arc(m, m, r, 0, 7); sx.fill();
    sprites[key] = { c: c, shine: shine, size: size / S };
    return sprites[key];
  }
  // the number badge: a white circle on red balls, a white rounded square on blue (so the groups differ by shape too)
  function badge(kind, num) {
    var key = 'b' + kind + num;
    if (sprites[key]) return sprites[key];
    var S = Math.min(4, Q * 2.5), size = Math.ceil(R * 1.3 * S), c = document.createElement('canvas'); c.width = c.height = size;
    var x = c.getContext('2d'), m = size / 2, r = size * 0.48;
    x.fillStyle = '#fbfaf4';
    if (kind === 'blue') rr(x, m - r * 0.92, m - r * 0.92, r * 1.84, r * 1.84, r * 0.45); else { x.beginPath(); x.arc(m, m, r, 0, 7); }
    x.fill();
    x.fillStyle = '#111'; x.font = '900 ' + Math.round(r * 1.25) + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(String(num), m, m + r * 0.08);
    sprites[key] = { c: c, size: size / S };
    return sprites[key];
  }
  Rd.ball = function (b, x, y, scale, alpha) {
    var st = MB.equipped('balls'), sp = ballSprite(b.kind, st), s = scale || 1, sz = sp.size * s;
    ctx.save(); if (alpha !== undefined) ctx.globalAlpha = alpha;
    // shadow from the light above
    ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(x + 2.5 * s, y + 3.5 * s, R * s, R * 0.9 * s, 0, 0, 7); ctx.fill();
    ctx.drawImage(sp.c, x - sz / 2, y - sz / 2, sz, sz);
    if (b.kind !== 'cue') {
      // the number rolls with the ball: it slides across and turns away as the ball turns over
      var ph = b.roll || 0, md = b.md || { x: 1, y: 0 }, cph = Math.cos(ph);
      if (cph > -0.1) {
        var off = Math.sin(ph) * R * 0.55 * s, bg = badge(b.kind, b.num), bs = bg.size * s;
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, R * s - 0.5, 0, 7); ctx.clip();
        ctx.translate(x + md.x * off, y + md.y * off); ctx.rotate(Math.atan2(md.y, md.x)); ctx.scale(Math.max(0.2, cph), 1); ctx.rotate(-Math.atan2(md.y, md.x));
        ctx.drawImage(bg.c, -bs / 2, -bs / 2, bs, bs); ctx.restore();
      }
    }
    ctx.drawImage(sp.shine, x - sz / 2, y - sz / 2, sz, sz);
    ctx.restore();
  };
  Rd.balls = function (balls, dt) {
    balls.forEach(function (b) {
      if (b.on) {
        var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (sp > 1) b.md = { x: b.vx / sp, y: b.vy / sp };
        Rd.ball(b, b.x, b.y);
      } else if (b.pocket !== null && b.sinkT < 1) {
        // dropping into the pocket: slides to the hole and shrinks into the dark
        b.sinkT = Math.min(1, b.sinkT + dt * 3.2);
        var p = MB.POCKETS[b.pocket].c, k = b.sinkT, from = b.sinkFrom || p;
        Rd.ball(b, from.x + (p.x - from.x) * Math.min(1, k * 1.6), from.y + (p.y - from.y) * Math.min(1, k * 1.6), 1 - k * 0.55, 1 - k);
      }
    });
  };
  // a ball drawn flat for the side panel (the group racks)
  Rd.ballIcon = function (c2, kind, num, x, y, r) {
    var sp = ballSprite(kind, MB.equipped('balls'));
    c2.drawImage(sp.c, x - r - 2 * r / R, y - r - 2 * r / R, 2 * r + 4 * r / R, 2 * r + 4 * r / R);
    if (kind !== 'cue') { var bg = badge(kind, num), bs = bg.size * r / R; c2.drawImage(bg.c, x - bs / 2, y - bs / 2, bs, bs); }
    c2.drawImage(sp.shine, x - r - 2 * r / R, y - r - 2 * r / R, 2 * r + 4 * r / R, 2 * r + 4 * r / R);
  };

  // ------------------------------------------------------------------ the cue stick (the only sign of a player)
  Rd.cue = function (cb, dir, pull, alpha, style) {
    var st = style || MB.equipped('cue'), L = 440, tipGap = R + 4 + pull;
    var ang = Math.atan2(dir.y, dir.x);
    ctx.save(); ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.translate(cb.x, cb.y); ctx.rotate(ang);
    // shadow on the cloth
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.moveTo(-tipGap + 4, 6); ctx.lineTo(-tipGap - L + 4, 12); ctx.lineTo(-tipGap - L + 4, 22); ctx.lineTo(-tipGap + 4, 10); ctx.fill();
    function seg(a, b, c) {   // from a to b along the cue (a and b are distances back from the tip), tapering
      var wa = 2.2 + (a / L) * 4.6, wb = 2.2 + (b / L) * 4.6;
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-tipGap - a, -wa); ctx.lineTo(-tipGap - b, -wb); ctx.lineTo(-tipGap - b, wb); ctx.lineTo(-tipGap - a, wa); ctx.closePath(); ctx.fill();
    }
    if (st.glow) { ctx.shadowColor = st.glow; ctx.shadowBlur = 12; }
    seg(0, 3, st.tip); seg(3, 12, '#f4f1e8'); seg(12, L * 0.58, st.shaft);
    ctx.shadowBlur = 0;
    seg(L * 0.58, L * 0.6, st.ring); seg(L * 0.6, L * 0.76, st.wrap); seg(L * 0.76, L * 0.78, st.ring); seg(L * 0.78, L, st.butt);
    if (st.weave) { ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; for (var i = 0; i < 30; i++) { var px = -tipGap - 20 - i * 8; ctx.beginPath(); ctx.moveTo(px, -4); ctx.lineTo(px - 6, 4); ctx.stroke(); } }
    if (st.gem) { ctx.fillStyle = '#c9142a'; ctx.beginPath(); ctx.arc(-tipGap - L * 0.88, 0, 3.4, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(-tipGap - L * 0.88 - 1, -1, 1.1, 0, 7); ctx.fill(); }
    // the shaft's shine along its top edge
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-tipGap - 12, -1.8); ctx.lineTo(-tipGap - L, -5.2); ctx.stroke();
    ctx.restore();
  };

  // The short aim preview: a dotted line ahead of the cue ball that grows with the power and stops where the cue
  // ball would first touch something (with a faint outline of the cue ball there). Never the whole path.
  Rd.preview = function (balls, cb, dir, power) {
    var fc = MB.firstContact(balls, cb, dir, cb), len = Math.min(fc.t, 70 + power * 120);
    var col = power < 0.4 ? '255,255,255' : power < 0.75 ? '255,214,102' : '255,120,90';
    ctx.save(); ctx.strokeStyle = 'rgba(' + col + ',0.85)'; ctx.lineWidth = 2.2; ctx.setLineDash([2, 7]); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cb.x + dir.x * (R + 3), cb.y + dir.y * (R + 3)); ctx.lineTo(cb.x + dir.x * len, cb.y + dir.y * len); ctx.stroke();
    ctx.setLineDash([]);
    // an arrowhead
    var tip = V.add(cb, V.mul(dir, len)), sd = V.rot(dir, 90);
    if (len < fc.t - 1) {
      ctx.fillStyle = 'rgba(' + col + ',0.9)'; ctx.beginPath(); ctx.moveTo(tip.x + dir.x * 6, tip.y + dir.y * 6);
      ctx.lineTo(tip.x - dir.x * 6 + sd.x * 5, tip.y - dir.y * 6 + sd.y * 5); ctx.lineTo(tip.x - dir.x * 6 - sd.x * 5, tip.y - dir.y * 6 - sd.y * 5); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(fc.point.x, fc.point.y, R, 0, 7); ctx.stroke();
    }
    ctx.restore();
  };
  // a cue ball being placed by hand
  Rd.ghost = function (p, ok) {
    ctx.save(); ctx.globalAlpha = 0.75; Rd.ball({ kind: 'cue' }, p.x, p.y); ctx.restore();
    ctx.save(); ctx.strokeStyle = ok ? 'rgba(125,255,176,0.9)' : 'rgba(255,90,90,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(p.x, p.y, R + 6, 0, 7); ctx.stroke(); ctx.restore();
  };

  // ------------------------------------------------------------------ paths and effects
  Rd.path = function (pts, col, width, dash) {
    if (!pts || pts.length < 2) return;
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i += 2) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y); ctx.stroke(); ctx.restore();
  };
  var parts = [];
  Rd.burst = function (x, y, col, n, spd) {
    if (MB.calm) return;
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, s = (spd || 120) * (0.4 + Math.random()); parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.7, max: 0.7, col: col, size: 2 + Math.random() * 2 }); }
  };
  Rd.trailDot = function (x, y, kind, col, t) {
    if (MB.calm) return;
    var c = kind === 'rainbow' ? 'hsl(' + ((t * 360) % 360) + ',90%,65%)' : col;
    parts.push({ x: x + MB.rand(-2, 2), y: y + MB.rand(-2, 2), vx: kind === 'sparks' ? MB.rand(-40, 40) : 0, vy: kind === 'sparks' ? MB.rand(-40, 40) : 0, life: kind === 'comet' ? 0.45 : 0.35, max: kind === 'comet' ? 0.45 : 0.35, col: c, size: kind === 'comet' ? 5 : 2.5 });
  };
  Rd.particles = function (dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92;
      ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + p.life / p.max / 2), 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // ------------------------------------------------------------------ the angle diagram
  // Drawn in table coordinates on top of the real shot, so the picture is the shot. Sizes are divided by the zoom so
  // lines and labels look the same at any zoom.
  var DC = { x: '#ffd23f', known: '#62e3ff', mid: '#ff8ae0', other: '#d7deea', wrong: '#ff5a5a', right: '#7dffb0', guide: 'rgba(255,255,255,0.88)', rail: '#ffb347' };
  Rd.DC = DC;
  function pill(text, x, y, col, z, big) {
    var fs = (big ? 22 : 19) / z;
    ctx.font = '900 ' + fs + 'px ' + FONT;
    var w = ctx.measureText(text).width + 14 / z, h = fs + 9 / z;
    ctx.fillStyle = 'rgba(8,14,28,0.88)'; rr(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2 / z; rr(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.stroke();
    ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 1 / z);
  }
  Rd.pill = pill;
  function arrowHead(at, dir, col, z) {
    var sd = V.rot(dir, 90), a = 10 / z;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(at.x + dir.x * a, at.y + dir.y * a);
    ctx.lineTo(at.x - dir.x * a + sd.x * a * 0.7, at.y - dir.y * a + sd.y * a * 0.7); ctx.lineTo(at.x - dir.x * a - sd.x * a * 0.7, at.y - dir.y * a - sd.y * a * 0.7); ctx.fill();
  }
  function line(a, b, col, w, dash) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
  }
  // an arc from ray u to ray v (the short way) at a vertex
  function arcPath(at, u, v, r) {
    var a0 = Math.atan2(u.y, u.x), a1 = Math.atan2(v.y, v.x), da = a1 - a0;
    while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    ctx.beginPath(); ctx.arc(at.x, at.y, r, a0, a0 + da, da < 0);
    return a0 + da / 2;
  }
  // opts: hint (0-4: how much help to show), wrong (a wrong answer to show beside the right one), reveal (show x's value),
  // show: which parts are visible yet (for the computer's step-by-step solving)
  Rd.diagram = function (p, opts, t) {
    opts = opts || {};
    var z = cam.z, hint = opts.hint || 0, pulse = 0.5 + 0.5 * Math.sin(t * 5);
    ctx.save(); ctx.lineCap = 'round';
    // dim the table a little so the diagram stands out
    ctx.fillStyle = 'rgba(4,8,18,0.42)'; ctx.fillRect(TB.x0 - 300, TB.y0 - 300, TB.x1 - TB.x0 + 600, TB.y1 - TB.y0 + 600);
    // the lines
    p.els.forEach(function (e) {
      if (e.t === 'line') line(V.add(e.at, V.mul(e.dir, -e.len)), V.add(e.at, V.mul(e.dir, e.len)), e.kind === 'guide2' ? 'rgba(215,222,234,0.7)' : DC.guide, 2.4 / z, e.kind === 'guide2' ? [6 / z, 6 / z] : null);
      else if (e.t === 'ray') {
        var end = V.add(e.from, V.mul(e.dir, e.len));
        if (e.kind === 'guide') line(e.from, end, DC.guide, 2.4 / z);
        else if (e.kind === 'normal') line(e.from, end, DC.guide, 2.2 / z, [8 / z, 6 / z]);
        else if (e.kind === 'back' || e.kind === 'ext') line(e.from, end, 'rgba(255,210,63,0.75)', 2.6 / z, [9 / z, 7 / z]);
      } else if (e.t === 'rail') {
        ctx.save(); ctx.shadowColor = DC.rail; ctx.shadowBlur = 10;
        line(V.add(e.at, V.mul(e.dir, -e.len)), V.add(e.at, V.mul(e.dir, e.len)), DC.rail, 5 / z); ctx.restore();
      }
    });
    // the shot itself: a solid line from the cue ball (to the cushion, or ahead) with an arrowhead
    var shotEnd = p.C && p.kind !== 'guide' ? p.C : V.add(p.V, V.mul(p.aim, 170));
    if (!opts.hideShot) {
      line(p.V, shotEnd, DC.x, 3.4 / z);
      arrowHead(V.add(p.V, V.mul(p.aim, Math.min(V.dist(p.V, shotEnd) * 0.55, 95))), p.aim, DC.x, z);
    }
    // the parallel marks and the right-angle boxes
    p.els.forEach(function (e) {
      if (e.t === 'para') {
        ctx.strokeStyle = DC.guide; ctx.lineWidth = 2.4 / z;
        [-7, 7].forEach(function (o) {
          var c = V.add(e.at, V.mul(e.dir, e.off + o / z)), sd = V.rot(e.dir, 90), a = 7 / z;
          ctx.beginPath(); ctx.moveTo(c.x - e.dir.x * a + sd.x * a, c.y - e.dir.y * a + sd.y * a); ctx.lineTo(c.x, c.y); ctx.lineTo(c.x - e.dir.x * a - sd.x * a, c.y - e.dir.y * a - sd.y * a); ctx.stroke();
        });
      } else if (e.t === 'box') {
        var s = 15 / z, a = V.add(e.at, V.mul(e.u, s)), b = V.add(e.at, V.mul(e.v, s)), c2 = V.add(a, V.mul(e.v, s));
        ctx.strokeStyle = DC.guide; ctx.lineWidth = 2.2 / z; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      } else if (e.t === 'ray' && e.kind === 'normal') {
        // (the box for a cushion's perpendicular is listed separately)
      }
    });
    // the angles
    var hl = hint >= 1;
    p.els.forEach(function (e) {
      if (e.t !== 'arc') return;
      if (e.role === 'mid' && hint < 1 && !opts.solve) return;   // the in-between angle shows up as a hint
      var col = DC[e.role] || DC.other, r = (e.r || 48) / z, w = 3 / z;
      var lit = hl && (e.role === 'x' || e.role === 'known' || e.role === 'mid');
      if (lit) { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 8 + pulse * 10; w = (3.5 + pulse * 2) / z; }
      // a light fill inside the arc helps tell which angle is meant
      ctx.fillStyle = col.length === 7 ? col + '30' : 'rgba(255,255,255,0.15)';
      ctx.beginPath(); ctx.moveTo(e.at.x, e.at.y); var mid0 = arcPath(e.at, e.u, e.v, r); ctx.lineTo(e.at.x, e.at.y); ctx.closePath();
      if (opts.fills !== false) ctx.fill();
      arcPath(e.at, e.u, e.v, r); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
      if (lit) ctx.restore();
      var lr = r + 22 / z, lp = { x: e.at.x + Math.cos(mid0) * lr, y: e.at.y + Math.sin(mid0) * lr };
      var text = e.label;
      if (e.role === 'x' && opts.reveal) text = 'x = ' + p.x + '°';
      if (e.role === 'mid' && (hint >= 2 || opts.solve)) text = e.value + '°';
      pill(text, lp.x, lp.y, col, z, e.role === 'x');
    });
    // a wrong answer: the angle it really makes, and where it really points
    if (opts.wrong !== undefined && opts.wrong !== null) {
      var wd = MB.dirFor(p, opts.wrong), xe = p.els.filter(function (e) { return e.t === 'arc' && e.role === 'x'; })[0];
      var wDir = V.mul(V.rot(p.B, p.s * opts.wrong), 1);
      ctx.save(); ctx.setLineDash([7 / z, 6 / z]);
      arcPath(xe.at, p.B, wDir, (xe.r || 48) / z + 26 / z); ctx.strokeStyle = DC.wrong; ctx.lineWidth = 3 / z; ctx.stroke(); ctx.restore();
      line(p.V, V.add(p.V, V.mul(wd, 150)), DC.wrong, 3 / z, [10 / z, 7 / z]);
      arrowHead(V.add(p.V, V.mul(wd, 150)), wd, DC.wrong, z);
      // the wrong angle's label sits out at the end of the line it really makes
      var wl = V.add(xe.at === p.V ? p.V : xe.at, V.mul(xe.at === p.V ? wd : wDir, xe.at === p.V ? 150 + 30 / z : (xe.r || 48) / z + 58 / z));
      pill('x = ' + opts.wrong + '°', wl.x, wl.y, DC.wrong, z);
    }
    ctx.restore();
  };
})();
