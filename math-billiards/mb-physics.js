// Math Billiards - physics: the table's cushions and pockets, the balls, and a small top-down billiards engine
// (rolling friction, ball-to-ball collisions, cushion bounces, pockets). Plain 2D math, cheap enough for any student device.
(function () {
  var MB = window.MB, V = MB.V, R = MB.R, TB = MB.TABLE;

  // ------------------------------------------------------------------ the table
  // Six pockets. Each one has a capture circle (a ball whose center gets inside drops in) and the two cushion ends
  // that frame its mouth. The cushions are line segments along the cushion noses, with short angled jaws at each mouth.
  var CG = 27, SG = 21;   // how far each cushion stops short of a corner pocket, and half the side pocket's opening
  var mx = (TB.x0 + TB.x1) / 2;
  var POCKETS = [
    { c: { x: TB.x0 - 5, y: TB.y0 - 5 }, r: 25, e1: { x: TB.x0 + CG, y: TB.y0 }, e2: { x: TB.x0, y: TB.y0 + CG }, corner: true },
    { c: { x: mx, y: TB.y0 - 12 }, r: 20, e1: { x: mx - SG, y: TB.y0 }, e2: { x: mx + SG, y: TB.y0 }, corner: false },
    { c: { x: TB.x1 + 5, y: TB.y0 - 5 }, r: 25, e1: { x: TB.x1 - CG, y: TB.y0 }, e2: { x: TB.x1, y: TB.y0 + CG }, corner: true },
    { c: { x: TB.x0 - 5, y: TB.y1 + 5 }, r: 25, e1: { x: TB.x0 + CG, y: TB.y1 }, e2: { x: TB.x0, y: TB.y1 - CG }, corner: true },
    { c: { x: mx, y: TB.y1 + 12 }, r: 20, e1: { x: mx - SG, y: TB.y1 }, e2: { x: mx + SG, y: TB.y1 }, corner: false },
    { c: { x: TB.x1 + 5, y: TB.y1 + 5 }, r: 25, e1: { x: TB.x1 - CG, y: TB.y1 }, e2: { x: TB.x1, y: TB.y1 - CG }, corner: true }
  ];
  function seg(ax, ay, bx, by) { return { a: { x: ax, y: ay }, b: { x: bx, y: by } }; }
  // the four cushion lines (with the pocket gaps), then each mouth's two jaws angled in toward the pocket
  var CUSHIONS = [
    seg(TB.x0 + CG, TB.y0, mx - SG, TB.y0), seg(mx + SG, TB.y0, TB.x1 - CG, TB.y0),
    seg(TB.x0 + CG, TB.y1, mx - SG, TB.y1), seg(mx + SG, TB.y1, TB.x1 - CG, TB.y1),
    seg(TB.x0, TB.y0 + CG, TB.x0, TB.y1 - CG), seg(TB.x1, TB.y0 + CG, TB.x1, TB.y1 - CG)
  ];
  POCKETS.forEach(function (p) {
    [p.e1, p.e2].forEach(function (e) {
      var to = V.add(p.c, V.mul(V.sub(e, p.c), 0.55));   // the jaw runs from the cushion's end most of the way to the pocket
      CUSHIONS.push({ a: e, b: to, jaw: true });
    });
  });
  // with the pockets shut (the demonstration of a wrong answer in a two-player game), each mouth is a straight cushion
  var CLOSED = POCKETS.map(function (p) { return { a: p.e1, b: p.e2 }; });
  // the same line pulled back a ball's width inside the cushions: the edge of where a ball's center can go
  MB.POCKETS = POCKETS; MB.CUSHIONS = CUSHIONS;
  // the cushion lines themselves (no gaps), used by the geometry: the four sides of the playing surface
  MB.RAILS = [
    { name: 'top', a: { x: TB.x0, y: TB.y0 }, b: { x: TB.x1, y: TB.y0 }, n: { x: 0, y: 1 } },
    { name: 'bottom', a: { x: TB.x0, y: TB.y1 }, b: { x: TB.x1, y: TB.y1 }, n: { x: 0, y: -1 } },
    { name: 'left', a: { x: TB.x0, y: TB.y0 }, b: { x: TB.x0, y: TB.y1 }, n: { x: 1, y: 0 } },
    { name: 'right', a: { x: TB.x1, y: TB.y0 }, b: { x: TB.x1, y: TB.y1 }, n: { x: -1, y: 0 } }
  ];

  // ------------------------------------------------------------------ balls
  // kind: 'cue' (white), 'red', 'blue' or 'eight' (black). num: the number printed on it (red 1-7, blue 1-7, 8).
  function Ball(kind, num, x, y) { return { kind: kind, num: num, x: x, y: y, vx: 0, vy: 0, on: true, sinkT: 0, pocket: null, roll: 0 }; }
  MB.Ball = Ball;
  function cloneBalls(balls) { return balls.map(function (b) { return { kind: b.kind, num: b.num, x: b.x, y: b.y, vx: b.vx, vy: b.vy, on: b.on, sinkT: b.sinkT, pocket: b.pocket, roll: b.roll }; }); }
  MB.cloneBalls = cloneBalls;

  // a standard rack: the 8-ball in the middle, a red and a blue at the two back corners, everything else mixed
  MB.rackBalls = function () {
    var apex = { x: TB.x0 + (TB.x1 - TB.x0) * 0.72, y: (TB.y0 + TB.y1) / 2 }, gap = R * 2 + 0.6, rowH = gap * Math.sqrt(3) / 2;
    var spots = [];
    for (var row = 0; row < 5; row++) for (var k = 0; k <= row; k++) spots.push({ x: apex.x + row * rowH, y: apex.y + (k - row / 2) * gap });
    // spot 4 is the middle of the third row; 10 and 14 are the back corners
    var reds = [1, 2, 3, 4, 5, 6, 7], blues = [1, 2, 3, 4, 5, 6, 7], kinds = [];
    var rest = MB.shuffle(['red', 'red', 'red', 'red', 'red', 'red', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue']);
    var balls = [Ball('cue', 0, TB.x0 + (TB.x1 - TB.x0) * 0.25, apex.y)];
    spots.forEach(function (s, i) {
      var kind = i === 4 ? 'eight' : i === 10 ? 'red' : i === 14 ? 'blue' : rest.pop();
      kinds.push(kind);
      var num = kind === 'eight' ? 8 : kind === 'red' ? reds.shift() : blues.shift();
      balls.push(Ball(kind, num, s.x + MB.rand(-0.15, 0.15), s.y + MB.rand(-0.15, 0.15)));
    });
    return balls;
  };

  // a free spot for a ball: inside the cushions, clear of the other balls and of the pocket mouths
  MB.freeSpot = function (balls, x, y, ignore) {
    if (x < TB.x0 + R + 1 || x > TB.x1 - R - 1 || y < TB.y0 + R + 1 || y > TB.y1 - R - 1) return false;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i]; if (b === ignore || !b.on) continue;
      if ((b.x - x) * (b.x - x) + (b.y - y) * (b.y - y) < (2 * R + 2) * (2 * R + 2)) return false;
    }
    for (var p = 0; p < POCKETS.length; p++) if (V.dist(POCKETS[p].c, { x: x, y: y }) < POCKETS[p].r + R + 6) return false;
    return true;
  };

  // ------------------------------------------------------------------ the engine
  var DECEL = 210;      // rolling resistance of the cloth (pixels per second per second)
  var DRAG = 0.32;      // a little extra slowing that grows with speed
  var E_BALL = 0.95, E_CUSH = 0.76;
  MB.MAX_SPEED = 1900; MB.MIN_SPEED = 160;
  MB.speedFor = function (power) { return MB.MIN_SPEED + MB.clamp(power, 0, 1) * (MB.MAX_SPEED - MB.MIN_SPEED); };

  function closest(p, a, b) {
    var ab = V.sub(b, a), t = V.dot(V.sub(p, a), ab) / (V.dot(ab, ab) || 1);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return { x: a.x + ab.x * t, y: a.y + ab.y * t };
  }

  // One step of the world. opts.closed shuts the pockets. Returns what happened: clacks, cushion hits, balls pocketed,
  // and the first ball the cue ball touched.
  function step(balls, dt, opts, ev) {
    var i, j, b, walls = opts.closed ? CUSHIONS.filter(function (c) { return !c.jaw; }).concat(CLOSED) : CUSHIONS;
    for (i = 0; i < balls.length; i++) {
      b = balls[i]; if (!b.on) continue;
      b.x += b.vx * dt; b.y += b.vy * dt;
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (sp > 0) {
        b.roll += sp * dt / R;
        var ns = sp - (DECEL + DRAG * sp) * dt;
        if (ns <= 3) { b.vx = 0; b.vy = 0; } else { b.vx *= ns / sp; b.vy *= ns / sp; }
      }
    }
    // balls against balls
    for (i = 0; i < balls.length; i++) {
      var a = balls[i]; if (!a.on) continue;
      for (j = i + 1; j < balls.length; j++) {
        b = balls[j]; if (!b.on) continue;
        var dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
        if (d2 >= 4 * R * R || d2 === 0) continue;
        var d = Math.sqrt(d2), nx = dx / d, ny = dy / d, over = 2 * R - d;
        a.x -= nx * over / 2; a.y -= ny * over / 2; b.x += nx * over / 2; b.y += ny * over / 2;
        var rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          var jn = -(1 + E_BALL) * rv / 2;
          a.vx -= jn * nx; a.vy -= jn * ny; b.vx += jn * nx; b.vy += jn * ny;
          ev.push({ type: 'clack', s: -rv, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
          if (!ev.firstHit) { if (a.kind === 'cue') ev.firstHit = b; else if (b.kind === 'cue') ev.firstHit = a; }
        }
      }
    }
    // balls against cushions
    for (i = 0; i < balls.length; i++) {
      b = balls[i]; if (!b.on) continue;
      // only near the edges is a cushion close enough to touch
      if (b.x > TB.x0 + R + 2 && b.x < TB.x1 - R - 2 && b.y > TB.y0 + R + 2 && b.y < TB.y1 - R - 2) continue;
      for (j = 0; j < walls.length; j++) {
        var q = closest(b, walls[j].a, walls[j].b), ex = b.x - q.x, ey = b.y - q.y, dd = ex * ex + ey * ey;
        if (dd >= R * R || dd === 0) continue;
        var dl = Math.sqrt(dd), mxn = ex / dl, myn = ey / dl, vn = b.vx * mxn + b.vy * myn;
        b.x = q.x + mxn * R; b.y = q.y + myn * R;
        if (vn < 0) {
          b.vx -= (1 + E_CUSH) * vn * mxn; b.vy -= (1 + E_CUSH) * vn * myn;
          b.vx *= 0.985; b.vy *= 0.985;   // the cushion's cloth takes a little of the sideways speed too
          ev.push({ type: 'cushion', s: -vn, x: q.x, y: q.y });
          if (b.kind === 'cue' && !ev.firstRail) ev.firstRail = { x: q.x, y: q.y };
        }
      }
    }
    // pockets
    if (!opts.closed) {
      for (i = 0; i < balls.length; i++) {
        b = balls[i]; if (!b.on) continue;
        for (j = 0; j < POCKETS.length; j++) {
          var p = POCKETS[j];
          if ((b.x - p.c.x) * (b.x - p.c.x) + (b.y - p.c.y) * (b.y - p.c.y) < p.r * p.r) {
            b.on = false; b.pocket = j; b.sinkT = 0; b.sinkFrom = { x: b.x, y: b.y, vx: b.vx, vy: b.vy }; b.vx = 0; b.vy = 0;
            ev.push({ type: 'pocket', ball: b, pocket: j });
            break;
          }
        }
      }
    }
    // a ball that somehow got outside the table (a very hard shot into a jaw) drops into the nearest pocket, or is
    // put back on the cloth when the pockets are shut
    for (i = 0; i < balls.length; i++) {
      b = balls[i]; if (!b.on) continue;
      if (b.x < TB.x0 - 30 || b.x > TB.x1 + 30 || b.y < TB.y0 - 30 || b.y > TB.y1 + 30) {
        if (opts.closed) { b.x = MB.clamp(b.x, TB.x0 + R, TB.x1 - R); b.y = MB.clamp(b.y, TB.y0 + R, TB.y1 - R); b.vx = 0; b.vy = 0; continue; }
        var best = 0, bd = 1e9;
        POCKETS.forEach(function (pk, k) { var dk = V.dist(pk.c, b); if (dk < bd) { bd = dk; best = k; } });
        b.on = false; b.pocket = best; b.sinkT = 0; b.sinkFrom = { x: b.x, y: b.y, vx: 0, vy: 0 }; b.vx = 0; b.vy = 0;
        ev.push({ type: 'pocket', ball: b, pocket: best });
      }
    }
  }
  function moving(balls) { for (var i = 0; i < balls.length; i++) if (balls[i].on && (balls[i].vx || balls[i].vy)) return true; return false; }
  MB.moving = moving;

  // Advance the world by dt seconds in small enough steps that no ball can skip through another ball or a cushion.
  MB.advance = function (balls, dt, opts, ev) {
    var vmax = 0;
    for (var i = 0; i < balls.length; i++) if (balls[i].on) vmax = Math.max(vmax, Math.abs(balls[i].vx) + Math.abs(balls[i].vy));
    var n = Math.max(2, Math.min(40, Math.ceil(vmax * dt / (R * 0.35))));
    for (var k = 0; k < n; k++) step(balls, dt / n, opts, ev);
  };

  // Play a whole shot out of sight (for the computer player and for showing where a shot really goes): returns the
  // balls at rest, the balls pocketed, the cue ball's path, and the first ball the cue ball hit.
  MB.simulate = function (balls, cueIndex, dir, power, opts) {
    var sim = cloneBalls(balls), cue = sim[cueIndex], ev = [], path = [{ x: cue.x, y: cue.y }], t = 0, dt = 1 / 120;
    var sp = MB.speedFor(power); cue.vx = dir.x * sp; cue.vy = dir.y * sp;
    opts = opts || {};
    while (t < 14 && moving(sim)) {
      MB.advance(sim, dt, opts, ev); t += dt;
      if (cue.on) path.push({ x: cue.x, y: cue.y });
      if (opts.stopAtFirst && (ev.firstHit || ev.firstRail)) break;
    }
    return { balls: sim, events: ev, pocketed: ev.filter(function (e) { return e.type === 'pocket'; }).map(function (e) { return e.ball; }), path: path, firstHit: ev.firstHit || null, time: t };
  };

  // Where the cue ball's straight path first touches something: a ball (with the spot the cue ball is in when it
  // touches, the "ghost ball") or a cushion line. Used for the short aim preview and by the geometry.
  MB.firstContact = function (balls, from, dir, ignore) {
    var best = { t: 1e9, ball: null };
    balls.forEach(function (b) {
      if (!b.on || b === ignore) return;
      var f = V.sub(from, b), bq = V.dot(f, dir), c = V.dot(f, f) - 4 * R * R, disc = bq * bq - c;
      if (disc < 0) return;
      var t = -bq - Math.sqrt(disc);
      if (t > 0.01 && t < best.t) best = { t: t, ball: b };
    });
    // the cushion lines, pulled in by a ball's radius (where the center is when the ball touches)
    var lim = [
      dir.x > 0 ? (TB.x1 - R - from.x) / dir.x : dir.x < 0 ? (TB.x0 + R - from.x) / dir.x : 1e9,
      dir.y > 0 ? (TB.y1 - R - from.y) / dir.y : dir.y < 0 ? (TB.y0 + R - from.y) / dir.y : 1e9
    ];
    var tw = Math.min(lim[0], lim[1]);
    if (tw < best.t) best = { t: Math.max(0, tw), ball: null, rail: lim[0] < lim[1] ? (dir.x > 0 ? 'right' : 'left') : (dir.y > 0 ? 'bottom' : 'top') };
    best.point = V.add(from, V.mul(dir, best.t));
    return best;
  };

  // Where the line from a point in a direction crosses the cushion line itself (the edge of the cloth).
  MB.railHit = function (from, dir) {
    var tx = dir.x > 1e-9 ? (TB.x1 - from.x) / dir.x : dir.x < -1e-9 ? (TB.x0 - from.x) / dir.x : 1e9;
    var ty = dir.y > 1e-9 ? (TB.y1 - from.y) / dir.y : dir.y < -1e-9 ? (TB.y0 - from.y) / dir.y : 1e9;
    var t = Math.min(tx, ty), rail;
    if (tx < ty) rail = dir.x > 0 ? MB.RAILS[3] : MB.RAILS[2]; else rail = dir.y > 0 ? MB.RAILS[1] : MB.RAILS[0];
    return { t: t, point: V.add(from, V.mul(dir, t)), rail: rail };
  };
})();
