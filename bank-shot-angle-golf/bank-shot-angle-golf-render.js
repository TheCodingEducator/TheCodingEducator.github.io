// ---------------------------------------------------------------
// Rendering: hole world
// ---------------------------------------------------------------
// Everything that never moves (the scenery around the hole, the green, the islands and the hole's
// pictures) is painted once into a picture and reused every frame.
function drawHoleBackground() {
  if (!hole._layer) hole._layer = buildHoleLayer(hole, course.theme);
  image(hole._layer, 0, 0, 700, 700);
}

// a repeatable pseudo-random number (the same scenery every time a hole is played)
function seeded(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function buildHoleLayer(h, th) {
  var g = createGraphics(700, 700);
  g.pixelDensity(pixelDensity());   // the same sharpness as the game canvas
  g.angleMode(DEGREES);
  var ctx = g.drawingContext;
  g.noStroke();

  // ---- the ground around the hole (see bank-shot-angle-golf-scenery.js)
  var seed = 0, nm = String(h.name || th.key);
  for (var si0 = 0; si0 < nm.length; si0++) seed = (seed * 31 + nm.charCodeAt(si0)) | 0;
  var rnd = sceneRng(seed), k;
  drawSceneGround(g, h, th, rnd);
  // out over the sea (a pier or a headland): a strip of sand along the green
  if (h.ground === 'ocean') {
    ctx.save(); ctx.lineJoin = 'round';
    g.stroke('#e8cc8e'); g.strokeWeight(46); g.fill('#e8cc8e');
    g.beginShape(); h.fairwayPoly.forEach(function (p) { g.vertex(p.x, p.y); }); g.endShape(CLOSE);
    ctx.restore(); g.noStroke();
  }
  // a moat across the hole (the drawbridge)
  (h.decor || []).forEach(function (d) {
    if (d.e !== 'moat') return;
    g.fill(th.water); g.rect(d.x, d.y, d.w, d.h);
    g.stroke(255, 255, 255, 60); g.strokeWeight(2); g.noFill();
    for (var m = 0; m < 14; m++) g.arc(m * 52 + 20, d.y + d.h / 2 + (m % 2) * 14 - 7, 30, 10, 200, 340);
    g.noStroke();
  });
  // ---- the props around the hole (towers, rockets, palm trees...), fitted into the open ground
  placeSceneProps(g, h, rnd);

  // ---- the green, striped, clipped to the hole's outline
  ctx.save();
  ctx.beginPath();
  var poly = h.fairwayPoly;
  ctx.moveTo(poly[0].x, poly[0].y);
  for (var pi = 1; pi < poly.length; pi++) ctx.lineTo(poly[pi].x, poly[pi].y);
  ctx.closePath();
  ctx.clip();
  g.fill(th.fairwayB); g.rect(0, 0, 700, 700);
  g.fill(th.fairwayA);
  var stripeW = 34;
  for (var si = -Math.ceil(700 / stripeW) - 2; si * stripeW < 700; si++) {
    if (si % 2 !== 0) continue;
    var x0 = si * stripeW;
    g.quad(x0, 0, x0 + stripeW, 0, x0 + stripeW + 700, 700, x0 + 700, 700);
  }
  if (th.key === 'space') {   // a faint grid on the deck
    g.stroke(255, 255, 255, 18); g.strokeWeight(1);
    for (k = 0; k <= 700; k += 35) { g.line(k, 0, k, 700); g.line(0, k, 700, k); }
    g.noStroke();
  }
  (h.decor || []).forEach(function (d) {   // the royal carpet
    if (d.e !== 'carpet') return;
    g.fill('#9e2a2b'); g.rect(d.x, d.y, d.w, d.h);
    g.fill('#d4a73a'); g.rect(d.x, d.y, 5, d.h); g.rect(d.x + d.w - 5, d.y, 5, d.h);
  });
  ctx.restore();

  // ---- islands: solid shapes inside the green
  (h.islands || []).forEach(function (isl) { drawIslandShape(g, isl, th); });
  // ---- the walls and the round obstacles never move either
  paintWalls(g);
  paintBushes(g);

  return g;
}

function islandPath(g, p) { g.beginShape(); p.forEach(function (q) { g.vertex(q.x, q.y); }); g.endShape(CLOSE); }
function islandCenter(p) { var x = 0, y = 0; p.forEach(function (q) { x += q.x; y += q.y; }); return { x: x / p.length, y: y / p.length }; }

// each island style has its own look; the island's edges are drawn as walls on top
function drawIslandShape(g, isl, th) {
  var p = isl.pts, c = islandCenter(p);
  g.noStroke();
  g.fill(0, 0, 0, 70); g.push(); g.translate(3, 5); islandPath(g, p); g.pop();   // shadow
  var st = isl.style;
  if (st === 'fountain') {
    g.fill('#9a9ca3'); islandPath(g, p);
    g.fill(th.water); g.circle(c.x, c.y, 82);
    g.fill(255, 255, 255, 90); g.circle(c.x - 12, c.y - 10, 22);
  } else if (st === 'boulder') {
    g.fill('#6e6a63'); islandPath(g, p); g.fill('#8a857c'); g.circle(c.x - 12, c.y - 10, 30);
  } else if (st === 'anvil') {
    g.fill('#3b3d42'); islandPath(g, p); g.fill('#5c5f66'); g.rect(c.x - 34, c.y - 14, 68, 6, 2);
  } else if (st === 'planet') {
    g.fill('#d9823b'); islandPath(g, p);
    g.fill('#f0a65a'); g.arc(c.x, c.y, 190, 190, 180, 360, CHORD);
    g.fill(255, 255, 255, 40); g.circle(c.x - 30, c.y - 30, 60);
  } else if (st === 'blackhole') {
    for (var r = 5; r >= 0; r--) { g.fill(120 - r * 15, 40, 200 - r * 20, 60 + r * 20); g.circle(c.x, c.y, 84 + r * 14); }
    g.fill(0); islandPath(g, p);
  } else if (st === 'panel') {
    g.fill('#2856c8'); islandPath(g, p);
    g.stroke(255, 255, 255, 90); g.strokeWeight(1);
    for (var x = p[0].x + 12; x < p[1].x; x += 12) g.line(x, p[0].y, x, p[2].y);
    g.noStroke();
  } else if (st === 'sandcastle') {
    g.fill('#d9b46a'); islandPath(g, p);
    g.fill('#c49a50');
    for (var b = 0; b < 3; b++) g.rect(c.x - 70 + b * 55, c.y - 5, 30, 34, 2);
    g.fill('#8a6a35'); g.rect(c.x - 14, c.y + 20, 28, 38, 14, 14, 0, 0);
  } else if (st === 'lighthouse') {
    g.fill('#f2f2f2'); islandPath(g, p);
    g.fill('#d6343c'); g.rect(c.x - 38, c.y - 8, 76, 16);
  } else if (st === 'coral') {
    g.fill('#ff7e9d'); islandPath(g, p); g.fill('#ffb3c6'); g.circle(c.x - 6, c.y - 6, 14); g.circle(c.x + 8, c.y + 4, 9);
  } else {
    g.fill(th.island); islandPath(g, p); g.fill(th.islandHi); g.circle(c.x - 8, c.y - 8, 18);
  }
}

function drawZones() {
  var th = course.theme;
  for (var i = 0; i < hole.zones.length; i++) {
    var z = hole.zones[i];
    var cx = z.x + z.w / 2, cy = z.y + z.h / 2;
    noStroke();
    if (z.type === 'hill') {
      // A flat, evenly-tinted block with a bold border instead of the
      // old diagonal highlight/shadow gradient - hills only ever push
      // straight left/right/up/down now (see buildClassicGreenCourse),
      // so there's no diagonal slope to shade toward, and a uniform
      // fill reads as a clean rectangular tile instead of a soft,
      // blurred patch of terrain.
      var hc = th.hill || [70, 55, 35]; fill(hc[0], hc[1], hc[2], 110);
      rect(z.x, z.y, z.w, z.h, 5);
      noFill();
      stroke(255, 235, 190, 190);
      strokeWeight(3.5);
      rect(z.x, z.y, z.w, z.h, 5);
      noStroke();
      drawFlowArrows(z, [60, 140, 255], 40, 1.6);
    } else {
      fill(red(color(th.water)), green(color(th.water)), blue(color(th.water)), 190);
      rect(z.x, z.y, z.w, z.h, 10);
      noFill();
      stroke(red(color(th.waterHi)), green(color(th.waterHi)), blue(color(th.waterHi)), 140);
      strokeWeight(2);
      rect(z.x, z.y, z.w, z.h, 10);
      var t = millis() / 500;
      stroke(255, 255, 255, 90);
      strokeWeight(1.5);
      noFill();
      for (var r = 0; r < 3; r++) {
        var rr = ((t + r * 12) % 36);
        ellipse(cx, cy, rr * 3, rr * 1.4);
      }
      noStroke();
      drawFlowArrows(z, [220, 240, 255], 46);
    }
  }
  // the zones are drawn every frame (their arrows move), so the few walls they touch go back on top
  if (hole.zones.length) {
    if (!hole._zoneWalls) hole._zoneWalls = hole.walls.filter(function (w) {
      return hole.zones.some(function (z) { return max(w.x1, w.x2) >= z.x - 8 && min(w.x1, w.x2) <= z.x + z.w + 8 && max(w.y1, w.y2) >= z.y - 8 && min(w.y1, w.y2) <= z.y + z.h + 8; });
    });
    paintWalls(window, hole._zoneWalls);
  }
}

// Continuously slides small chevrons through the zone along its real
// push direction (z.dirDeg), instead of a static grid of fixed arrows -
// motion is what actually reads as "this current/slope is pushing the
// ball," where a still triangle could just as easily be mistaken for
// decoration. Each lead chevron trails a smaller, fainter one right
// behind it for a streak-of-motion cue, and every arrow fades out near
// whichever rectangle edge it's closest to (not just the ones the flow
// crosses), so nothing pops in or out abruptly at the zone's border.
// Sampled in the zone's own rotated flow/perpendicular axes rather than
// a plain x/y grid - the only way to get a straight, evenly-spaced
// stream running at an arbitrary angle like 20deg or 250deg. `scale`
// (default 1) sizes and spaces the chevrons up for zones - hills, at
// 1.6 - that need to read clearly as a strong directional push, versus
// water's smaller, denser default current arrows.
function drawFlowArrows(z, rgb, basePxPerSec, scale) {
  scale = scale || 1;
  var cx = z.x + z.w / 2, cy = z.y + z.h / 2;
  var dirX = cos(z.dirDeg), dirY = sin(z.dirDeg);
  var perpX = -dirY, perpY = dirX;
  var half = sqrt(z.w * z.w + z.h * z.h) / 2 + 20;
  var spacing = 42 * scale, laneGap = 34 * scale;
  var speedMult = constrain(map(z.strength, 0.02, 0.045, 0.7, 1.6), 0.6, 1.8);
  var slide = (millis() / 1000 * basePxPerSec * speedMult) % spacing;
  var numLanes = ceil((2 * half) / laneGap);
  var numSteps = ceil((2 * half) / spacing) + 2;
  push();
  noStroke();
  for (var li = 0; li <= numLanes; li++) {
    var p = -half + li * laneGap;
    for (var si = -1; si <= numSteps; si++) {
      var t = -half + slide + si * spacing;
      var x = cx + p * perpX + t * dirX;
      var y = cy + p * perpY + t * dirY;
      if (x < z.x - 2 || x > z.x + z.w + 2 || y < z.y - 2 || y > z.y + z.h + 2) continue;
      var edgeFade = constrain(min(min(x - z.x, z.x + z.w - x), min(y - z.y, z.y + z.h - y)) / 18, 0, 1);
      if (edgeFade <= 0.03) continue;
      push();
      translate(x, y);
      rotate(z.dirDeg);
      fill(rgb[0], rgb[1], rgb[2], 110 * edgeFade);
      triangle(-16 * scale, -4 * scale, -16 * scale, 4 * scale, -8 * scale, 0);
      fill(rgb[0], rgb[1], rgb[2], 235 * edgeFade);
      triangle(-7 * scale, -6 * scale, -7 * scale, 6 * scale, 8 * scale, 0);
      pop();
    }
  }
  pop();
}

// Walls in the course's style: castle stone, glowing station rails, or beach boardwalk planks. Bumpers
// (fences, solar panels, breakwaters standing inside the green) are a little lighter so they stand out.
// The walls never move, so they're painted once into the hole's saved picture (see buildHoleLayer);
// G is that picture. Only the highlighted wall is drawn live, every frame (drawWalls).
function paintWalls(G, list) {
  var th = course.theme, style = th.wallStyle;
  list = list || hole.walls;
  G.push();
  G.strokeCap(ROUND);
  for (var i = 0; i < list.length; i++) {
    var w = list[i];
    var bump = w.kind === 'bumper';
    G.stroke(0, 0, 0, 90); G.strokeWeight(13);
    G.line(w.x1, w.y1 + 4, w.x2, w.y2 + 4);
    if (style === 'neon') {
      G.drawingContext.shadowColor = bump ? '#ffb347' : th.wall; G.drawingContext.shadowBlur = 12;
      G.stroke(bump ? '#ff9f2e' : th.wall); G.strokeWeight(9); G.line(w.x1, w.y1, w.x2, w.y2);
      G.drawingContext.shadowBlur = 0;
      G.stroke(bump ? '#ffe2b0' : th.wallHi); G.strokeWeight(3); G.line(w.x1, w.y1, w.x2, w.y2);
    } else if (style === 'stone') {
      G.stroke(bump ? '#8a5a34' : th.wall); G.strokeWeight(12); G.line(w.x1, w.y1, w.x2, w.y2);
      G.stroke(bump ? '#c08a5a' : th.wallHi); G.strokeWeight(4); G.line(w.x1, w.y1 - 2, w.x2, w.y2 - 2);
      // mortar joints along stone walls
      if (!bump) {
        var L = dist(w.x1, w.y1, w.x2, w.y2), n = floor(L / 22);
        G.stroke(60, 62, 68, 160); G.strokeWeight(1.5);
        var ux = (w.x2 - w.x1) / L, uy = (w.y2 - w.y1) / L;
        for (var j = 1; j < n; j++) { var mx = w.x1 + ux * j * 22, my = w.y1 + uy * j * 22; G.line(mx - uy * 5, my + ux * 5, mx + uy * 5, my - ux * 5); }
      }
    } else {   // wood
      G.stroke(bump ? '#6f6f78' : th.wall); G.strokeWeight(12); G.line(w.x1, w.y1, w.x2, w.y2);
      G.stroke(bump ? '#a9a9b3' : th.wallHi); G.strokeWeight(4); G.line(w.x1, w.y1 - 2, w.x2, w.y2 - 2);
    }
  }
  G.pop();
}
// While a bank-shot question is live, the wall the ball is headed for lights up gold so the
// diagram's wall is unmistakably the same one sitting right there on the course.
function drawWalls() {
  if (!(holePhase === 'QUESTION' && pendingShot && pendingShot.type === 'WALL' && pendingShot.wallRef)) return;
  var w = pendingShot.wallRef;
  push();
  strokeCap(ROUND);
  stroke('#e0a030'); strokeWeight(11); line(w.x1, w.y1, w.x2, w.y2);
  stroke('#ffce6b'); strokeWeight(4); line(w.x1, w.y1 - 1.5, w.x2, w.y2 - 1.5);
  pop();
}

// round obstacles: hedges, asteroids or beach rocks
function paintBushes(G) {   // (painted once into the hole's saved picture)
  var th = course.theme;
  for (var i = 0; i < hole.bushes.length; i++) {
    var b = hole.bushes[i];
    G.noStroke();
    G.fill(0, 0, 0, 70);
    G.ellipse(b.x + 4, b.y + 6, b.r * 2.1, b.r * 1.1);
    if (th.rockStyle === 'asteroid') {
      G.fill(th.bush); G.ellipse(b.x, b.y, b.r * 2, b.r * 1.9);
      G.fill(90, 86, 80); G.ellipse(b.x + b.r * 0.3, b.y + b.r * 0.2, b.r * 0.6, b.r * 0.5); G.ellipse(b.x - b.r * 0.35, b.y - b.r * 0.1, b.r * 0.4, b.r * 0.35);
      G.fill(th.bushHi); G.ellipse(b.x - b.r * 0.3, b.y - b.r * 0.45, b.r * 0.7, b.r * 0.35);
    } else if (th.rockStyle === 'rock') {
      G.fill(th.bush); G.ellipse(b.x, b.y, b.r * 2, b.r * 1.8);
      G.fill(th.bushHi); G.ellipse(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.9, b.r * 0.6);
    } else {
      G.fill(th.bush); G.ellipse(b.x, b.y, b.r * 2, b.r * 1.9);
      G.fill(th.bushHi); G.ellipse(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 1.1, b.r);
    }
  }
}

// the signature moving obstacles, drawn at the obstacle clock's current time
function drawObstacles() {
  if (!hole.obstacles) return;
  for (var i = 0; i < hole.obstacles.length; i++) {
    var o = hole.obstacles[i];
    push();
    if (o.type === 'windmill') {
      noStroke(); fill(0, 0, 0, 70); ellipse(o.x + 4, o.y + 6, 50, 30);
      fill('#8b7d6b'); ellipse(o.x, o.y, 44, 44); fill('#a89a86'); ellipse(o.x - 6, o.y - 6, 18, 18);   // the stone tower top
      var segs = obstacleSegments(o, obsClock);
      for (var j = 0; j < segs.length; j++) {
        var s = segs[j], ux = (s.x2 - s.x1) / o.r, uy = (s.y2 - s.y1) / o.r;
        stroke('#5a3c22'); strokeWeight(6); line(s.x1, s.y1, s.x2, s.y2);
        noStroke(); fill(245, 238, 220, 235);   // the sail cloth along one side of the arm
        quad(s.x1 + ux * 18, s.y1 + uy * 18, s.x2, s.y2, s.x2 - uy * 16, s.y2 + ux * 16, s.x1 + ux * 18 - uy * 12, s.y1 + uy * 18 + ux * 12);
        stroke('#5a3c22'); strokeWeight(1.5);
        for (var q = 1; q < 4; q++) { var t = 0.25 + q * 0.18; line(s.x1 + ux * o.r * t, s.y1 + uy * o.r * t, s.x1 + ux * o.r * t - uy * 14, s.y1 + uy * o.r * t + ux * 14); }
      }
      noStroke(); fill('#3b2a1a'); ellipse(o.x, o.y, WINDMILL_HUB_R * 2, WINDMILL_HUB_R * 2); fill('#c9a227'); ellipse(o.x, o.y, 8, 8);
    } else if (o.type === 'portal') {
      var spin = obsClock * 140, flash = o.flashAt && millis() - o.flashAt < 400 ? 1 - (millis() - o.flashAt) / 400 : 0;
      var pc = color(o.color);
      // entry: a swirling disc
      noStroke(); fill(red(pc), green(pc), blue(pc), 60 + flash * 120); ellipse(o.a.x, o.a.y, o.r * 2.6, o.r * 2.6);
      fill(10, 6, 30); ellipse(o.a.x, o.a.y, o.r * 1.7, o.r * 1.7);
      noFill(); stroke(pc); strokeWeight(3);
      for (var k = 0; k < 3; k++) arc(o.a.x, o.a.y, o.r * (1 + k * 0.45), o.r * (1 + k * 0.45), spin + k * 120, spin + k * 120 + 200);
      // exit: a ring with an arrow-shaped glow, and a faint link line between the two
      drawingContext.setLineDash([3, 9]); stroke(red(pc), green(pc), blue(pc), 70); strokeWeight(2); line(o.a.x, o.a.y, o.b.x, o.b.y); drawingContext.setLineDash([]);
      noStroke(); fill(red(pc), green(pc), blue(pc), 40 + flash * 160); ellipse(o.b.x, o.b.y, o.r * 2.4, o.r * 2.4);
      noFill(); stroke(pc); strokeWeight(2.5); ellipse(o.b.x, o.b.y, o.r * 1.8, o.r * 1.8);
      noStroke(); fill(pc); textAlign(CENTER, CENTER); textSize(10); textStyle(BOLD); text(tl('OUT', 'SALIDA'), o.b.x, o.b.y); textStyle(NORMAL);
    } else if (o.type === 'slider') {
      // the track, then the board
      stroke(255, 255, 255, 70); strokeWeight(3); drawingContext.setLineDash([6, 8]); line(o.x1, o.y1, o.x2, o.y2); drawingContext.setLineDash([]);
      var sg = obstacleSegments(o, obsClock)[0], cx = (sg.x1 + sg.x2) / 2, cy = (sg.y1 + sg.y2) / 2;
      translate(cx, cy); rotate(o.deg);
      noStroke(); fill(0, 0, 0, 70); ellipse(4, 6, o.len + 8, 20);
      fill(o.color); ellipse(0, 0, o.len + 6, 18);
      fill(255, 255, 255, 220); rect(-o.len / 2 + 8, -2.5, o.len - 16, 5, 2);
      fill(255, 255, 255, 90); ellipse(-o.len / 4, -4, o.len / 3, 5);
    }
    pop();
  }
}

function drawCup() {
  if (!hole.cup) return;
  var h = hole.cup;
  noStroke();
  fill(0, 0, 0, 120);
  ellipse(h.x, h.y, CUP_R * 2.1, CUP_R * 1.2);
  fill(10, 10, 10);
  ellipse(h.x, h.y, CUP_R * 2, CUP_R * 1.7);
  fill(30, 30, 30);
  ellipse(h.x, h.y, CUP_R * 1.4, CUP_R * 1.1);

  if (holeBlockedThisStroke) {
    drawBlockingPole(h);
    return;
  }

  // flag
  stroke(220);
  strokeWeight(2.5);
  line(h.x, h.y, h.x, h.y - 70);
  noStroke();
  var wave = sin(millis() / 130) * 4;
  fill('#e63946');
  triangle(h.x, h.y - 70, h.x + 26 + wave, h.y - 62, h.x, h.y - 54);
}

// Covers the cup for the stroke a wrong answer just cost the player (see
// holeBlockedThisStroke/collidePole), so the ball visibly cannot drop in.
function drawBlockingPole(h) {
  // A "no entry" cover, bigger than the cup in every direction, so no part of the hole shows:
  // a red disc with a white rim and a white bar across it.
  var d = CUP_R * 2.9;
  noStroke();
  fill(0, 0, 0, 90);
  ellipse(h.x + 2, h.y + 3, d, d);
  fill(255);
  ellipse(h.x, h.y, d, d);
  fill('#d62f2f');
  ellipse(h.x, h.y, d * 0.84, d * 0.84);
  fill(255);
  rect(h.x - d * 0.28, h.y - d * 0.08, d * 0.56, d * 0.16, d * 0.04);
  var ft = (millis() - coverFlashAt) / 450;   // a white ring pulses out when the ball hits it
  if (ft < 1) {
    noFill();
    stroke(255, 255, 255, 255 * (1 - ft));
    strokeWeight(4);
    ellipse(h.x, h.y, d * (1 + ft * 0.9), d * (1 + ft * 0.9));
    noStroke();
  }
}

function drawBall() {
  if (holePhase === 'SUNK') {
    sinkAnim = min(1, sinkAnim + 0.06);
    if (sinkAnim >= 1) return;
  }
  var scale = 1 - sinkAnim * 0.8;
  noStroke();
  fill(0, 0, 0, 90);
  ellipse(ball.x, ball.y + 5, BALL_R * 1.8 * scale, BALL_R * 0.9 * scale);
  fill(255);
  ellipse(ball.x, ball.y, BALL_R * 2 * scale, BALL_R * 2 * scale);
  fill(255, 255, 255, 160);
  ellipse(ball.x - BALL_R * 0.35, ball.y - BALL_R * 0.35, BALL_R * 0.7 * scale, BALL_R * 0.7 * scale);
}

// Only a short slice of the ball's route is drawn: a line from the moment it is
// hit, through the bounce, and a little way past it so the angle is clear -
// then it stops growing. The solved angle (arcs, numbers, equation) appears the
// instant the ball is hit and stays until the ball stops. `revealed` below only
// marks the bounce, which is what starts the trail's "a little past it" countdown.
var ANGLE_REVEAL_STRAIGHT_PX = 60;
var ANGLE_REVEAL_BOUNCE_RAD = 0.21; // ~12 degrees of sudden direction change = a bounce
function updateAngleReveal() {
  if (!resolvedInfo || resolvedInfo.revealed) return;
  // A correct shot (wall or straight) is scripted to reach its vertex on the
  // course (pendingShot.applied flips the moment that happens), so wait for that
  // exact point instead of any rail the ball happens to graze on the way.
  var correctWallShot = resolvedInfo.correct && pendingShot;
  if (correctWallShot) {
    if (pendingShot.applied) resolvedInfo.revealed = true;
    return;
  }
  if (mag(ball.vx, ball.vy) > 0.5) {
    var heading = Math.atan2(ball.vy, ball.vx);
    if (resolvedInfo.lastHeading !== undefined) {
      var turn = Math.abs(Math.atan2(Math.sin(heading - resolvedInfo.lastHeading), Math.cos(heading - resolvedInfo.lastHeading)));
      if (turn > ANGLE_REVEAL_BOUNCE_RAD) { resolvedInfo.revealed = true; return; }
    }
    resolvedInfo.lastHeading = heading;
  }
  // A straight-line shot (or a Hero-mode timeout's wild shot) never bounces
  // off the puzzle wall, so it reveals after rolling a short way instead.
  var straightOrChaos = !pendingShot || pendingShot.type !== 'WALL';
  if (straightOrChaos && dist(ball.x, ball.y, resolvedInfo.revealFrom.x, resolvedInfo.revealFrom.y) >= ANGLE_REVEAL_STRAIGHT_PX) {
    resolvedInfo.revealed = true;
  }
}
var TRAIL_AFTER_BOUNCE_PX = 110; // how far the line keeps going past the bounce

// The route a CORRECT answer would have taken, cut off at the same point as
// the real line (bounce + TRAIL_AFTER_BOUNCE_PX). Built by running the real
// physics on a scratch ball, so it matches what a correct shot really does.
function simulateTrail(shot, isCorrect) {
  var from = shot.launchFrom || { x: ball.x, y: ball.y };
  var dir = isCorrect ? shot.aimDir : (shot.launchDir || shot.aimDir);
  var b = { x: from.x, y: from.y, vx: dir.x * shot.power, vy: dir.y * shot.power };
  // A correct shot still has its scripted bounce/bend waiting (applied=false and
  // it flips at the vertex). A wrong shot's script is already used up at launch
  // (see submitAnswer), so its "bounce" is just where its heading first turns.
  var pending = {
    type: shot.type, wallRef: shot.wallRef, Wd: shot.Wd, N: shot.N,
    resolvedAngle: isCorrect ? wallNormalAngle(180 - shotKnown(shot)) : shot.resolvedAngle, correct: isCorrect,
    bendDeg: isCorrect ? 0 : (shot.bendDeg || 0),
    launchFrom: from, triggerDist: shot.triggerDist, applied: !isCorrect && shot.type !== 'WALL'   // a wrong wall shot still bounces at the wall (at the typed angle)
  };
  var walls = allWalls();
  var pts = [{ x: b.x, y: b.y }];
  var after = 0;
  var lastHeading = null;
  for (var frame = 0; frame < 2000; frame++) {
    if (mag(b.vx, b.vy) < MIN_STOP_SPEED) break;
    stepBallOneFrame(b, pending, walls, hole.bushes, hole.zones, true, !isCorrect);
    var last = pts[pts.length - 1];
    var step = dist(b.x, b.y, last.x, last.y);
    if (step > 3) {
      pts.push({ x: b.x, y: b.y });
      if (pts.bounceIdx !== undefined) after += step;
    }
    if (pts.bounceIdx !== undefined && after > 4 && mag(b.vx, b.vy) > 0.5) {   // a second wall ends the line
      var h2 = Math.atan2(b.vy, b.vx);
      if (pts.postHeading !== undefined && Math.abs(Math.atan2(Math.sin(h2 - pts.postHeading), Math.cos(h2 - pts.postHeading))) > ANGLE_REVEAL_BOUNCE_RAD) { pts.push({ x: b.x, y: b.y }); break; }
      pts.postHeading = h2;
    }
    if (pts.bounceIdx === undefined) {
      if (isCorrect) {
        if (pending.applied) pts.bounceIdx = pts.length - 1;
      } else if (mag(b.vx, b.vy) > 0.5) {
        var heading = Math.atan2(b.vy, b.vx);
        if (lastHeading !== null) {
          var turn = Math.abs(Math.atan2(Math.sin(heading - lastHeading), Math.cos(heading - lastHeading)));
          if (turn > ANGLE_REVEAL_BOUNCE_RAD) pts.bounceIdx = pts.length - 1;
        }
        lastHeading = heading;
      }
    }
    if (after >= TRAIL_AFTER_BOUNCE_PX) break;
  }
  return pts;
}
function updateTrail() {
  var ri = resolvedInfo;
  if (!ri || ri.trailDone) return;
  var last = ri.trail[ri.trail.length - 1];
  var step = dist(ball.x, ball.y, last.x, last.y);
  if (step > 3) {
    ri.trail.push({ x: ball.x, y: ball.y });
    if (ri.revealed) ri.afterReveal += step;
  }
  // Remember how much of the route existed when it first bounced (wrong answers
  // only draw the route up to that point - see drawTrail).
  if (ri.revealed && ri.trailCut === undefined) ri.trailCut = ri.trail.length;
  // (a straight shot's line keeps following the ball until it touches a rail - see drawExactRoute)
  if (ri.afterReveal >= TRAIL_AFTER_BOUNCE_PX && !(ri.type === 'STRAIGHT' && ri.hitIdx === undefined)) ri.trailDone = true;
  // Once past the bounce, stop the line the moment the ball hits a second wall.
  if (ri.revealed && !ri.trailDone && mag(ball.vx, ball.vy) > 0.5) {
    var hd = Math.atan2(ball.vy, ball.vx);
    if (ri.postHeading !== undefined && ri.afterReveal > 4) {
      var tn = Math.abs(Math.atan2(Math.sin(hd - ri.postHeading), Math.cos(hd - ri.postHeading)));
      if (tn > ANGLE_REVEAL_BOUNCE_RAD) { ri.trail.push({ x: ball.x, y: ball.y }); ri.trailDone = true; }
    }
    ri.postHeading = hd;
  }
}

// The angle between the two green route lines where the correct shot bounces:
// the vertex, where each arm points, and the bisector between them (which is
// where the green degree number sits, so it is always between the lines).
function computeGreenArms(pts, normalAng) {
  if (!pts || pts.bounceIdx === undefined) return null;
  var v = pts[pts.bounceIdx];
  var inPt = pts[0], outPt = pts[pts.length - 1];
  for (var i = pts.bounceIdx - 1; i >= 0; i--) { if (dist(v.x, v.y, pts[i].x, pts[i].y) >= 24) { inPt = pts[i]; break; } }
  for (var j = pts.bounceIdx + 1; j < pts.length; j++) { if (dist(v.x, v.y, pts[j].x, pts[j].y) >= 24) { outPt = pts[j]; break; } }
  var a1 = atan2(inPt.y - v.y, inPt.x - v.x);
  var a2 = atan2(outPt.y - v.y, outPt.x - v.x);
  var diff = ((a2 - a1) % 360 + 540) % 360 - 180; // signed, -180..180
  // Which side of the incoming line the wall's normal (the bounce's bisector)
  // lies on. A near head-on bounce makes the in and out lines almost coincide,
  // so the measured `diff` can be ~0 and can't say - the known normal always can.
  var s;
  if (normalAng !== undefined && normalAng !== null) {
    var toN = ((normalAng - a1) % 360 + 540) % 360 - 180;
    s = toN >= 0 ? 1 : -1;
  } else {
    s = diff >= 0 ? 1 : -1;
  }
  return { v: v, a1: a1, a2: a2, diff: diff, mid: a1 + diff / 2, s: s };
}

// Gold arc between the two green lines, kept close to the vertex so the green
// number (further out along the bisector) never overlaps it.
var GREEN_ARC_R = 26;
var GREEN_LABEL_R = 58;
function getGreenArms() {
  if (!resolvedInfo) return null;
  var ri = resolvedInfo;
  if (ri.greenArms === undefined) {
    if (ri.type === 'STRAIGHT') {
      // No bounce on a straight shot: the angle lives at the launch spot. The
      // route line is one side; the other side is the ray at the known angle,
      // which is `answer` degrees away from the forward direction, toward the
      // side the question swept (opposite the sweep sign measured from the
      // backward ray).
      var wrongShot = ri.typed !== null && !ri.correct;
      var a1 = wrongShot ? ri.launchAngle : ri.aimAngle;
      ri.greenArms = { v: ri.point, a1: a1, diff: -ri.sweepSign * 90, mid: a1 - ri.sweepSign * 45, s: -ri.sweepSign };
    } else {
      // A correct wall shot bounces off the question wall, whose normal is known.
      var nAng = (ri.type === 'WALL' && ri.correct && ri.offsetDir) ? atan2(ri.offsetDir.y, ri.offsetDir.x) : null;
      ri.greenArms = computeGreenArms(ri.intendedTrail, nAng);
    }
  }
  return ri.greenArms;
}
// The number shown at the wall is the angle between the route's incoming line
// and the wall's normal (the line that splits the bounce in half). So the gold
// arc always starts on the incoming route line and sweeps EXACTLY that many
// degrees toward the normal - it can never disagree with the number. For a
// wrong answer the number is the one the student typed, and a red dashed line is
// drawn at that many degrees from the incoming line: the other side of the
// angle their answer creates.
function shownAngleDeg() {
  return (resolvedInfo.typed !== null && !resolvedInfo.correct) ? resolvedInfo.typed : resolvedInfo.correctAnswer;
}
var OTHER_LINE_LEN = 96;
// A wall shot's answer is supplementary: the angle from the ball's outgoing line
// back to the wall BEHIND the contact point (the other half of that straight
// line is the known angle). Returns the arc for it, or null for a straight shot.
function wallAnswerArc(g) {
  var ri = resolvedInfo;
  if (!ri || ri.type !== 'WALL' || !ri.wd || !g || g.a2 === undefined) return null;
  var back = atan2(-ri.wd.y, -ri.wd.x);
  var fwd = atan2(ri.wd.y, ri.wd.x);
  // Measured from the ball's INCOMING path (g.a1 points back along it): the known angle is on
  // the side the ball comes from (toward the wall behind it), the answer toward the wall ahead.
  var k = ((back - g.a1) % 360 + 540) % 360 - 180;
  var d = ((fwd - g.a1) % 360 + 540) % 360 - 180;
  return { from: g.a1, to: g.a1 + d, mid: g.a1 + d / 2, kTo: g.a1 + k, kMid: g.a1 + k / 2,
    // the vertex sits ON the wall (the bounce point is the ball's center, one radius off it)
    vx: g.v.x - ri.offsetDir.x * BALL_R, vy: g.v.y - ri.offsetDir.y * BALL_R };
}
var WALL_HALF_R = 32;   // radius of the after-shot wall angle arcs
function drawGreenAngleArc() {
  if (resolvedInfo && resolvedInfo.timedOut) return;   // (nothing to show - the question is asked again)
  if (resolvedInfo && resolvedInfo.shot) { drawLiveAngleDiagram(resolvedInfo.shot, true); return; }
  var g = getGreenArms();
  if (!g) return;
  var span = shownAngleDeg();
  // For a real bounce (WALL etc.), g.a2 is the actual outgoing line's measured
  // angle - using it instead of reconstructing a1 + s*span keeps the arc's far
  // edge locked to where the second green line really is, instead of drifting
  // to the wall's normal (half the bend) partway there. STRAIGHT has no real
  // second line to match, so it keeps the constructed reference ray.
  var a2 = g.a2 !== undefined ? g.a2 : g.a1 + g.s * span;
  var wa = wallAnswerArc(g);
  push();
  noFill();
  strokeCap(ROUND);
  if (resolvedInfo.typed !== null && !resolvedInfo.correct) {
    stroke('#e63946');
    strokeWeight(4);
    drawingContext.setLineDash([4, 7]);
    line(g.v.x, g.v.y, g.v.x + cos(a2) * OTHER_LINE_LEN, g.v.y + sin(a2) * OTHER_LINE_LEN);
    drawingContext.setLineDash([]);
  }
  stroke(resolvedInfo.typed !== null && !resolvedInfo.correct ? '#e63946' : '#e0a030');
  strokeWeight(3.5);
  if (wa) {
    // Option C: the incoming path splits the wall's straight line - the answer as a filled
    // green wedge (red when wrong) toward the wall ahead, the known angle as a gold arc behind.
    var wrongW = resolvedInfo.typed !== null && !resolvedInfo.correct;
    var R = WALL_HALF_R * 2;
    noStroke();
    fill(wrongW ? color(230, 57, 70, 120) : color(77, 255, 77, 110));
    arc(wa.vx, wa.vy, R, R, min(wa.from, wa.to), max(wa.from, wa.to), PIE);
    noFill();
    strokeWeight(3.5);
    stroke(wrongW ? '#e63946' : '#4dff4d');
    arc(wa.vx, wa.vy, R, R, min(wa.from, wa.to), max(wa.from, wa.to));
    stroke('#e0a030');
    arc(wa.vx, wa.vy, R, R, min(wa.from, wa.kTo), max(wa.from, wa.kTo));
  }
  else {
    arc(g.v.x, g.v.y, GREEN_ARC_R * 2, GREEN_ARC_R * 2, min(g.a1, a2), max(g.a1, a2));
  }
  pop();
}

// Green for a correct answer, red for a wrong one (or a Hero-mode timeout).
// A correct shot's route: exactly the path the ball really rolled, so it lies right on top of
// the white dotted line from the tee to the wall. A wall shot's line stops at the wall.
function drawExactRoute(ri, wrong) {
  // Every route line (green right, red wrong) is a STRAIGHT line along the angle's direction - currents, hills and bushes
  // can bend the ball itself, but never the lines. Each one grows as far as the ball has rolled
  // and stops at the first rail in its way.
  var p = ri.shot, tr = ri.trail, A = p.launchFrom, L = 0;
  for (var q = 1; q < tr.length; q++) L += dist(tr[q].x, tr[q].y, tr[q - 1].x, tr[q - 1].y);
  if (!ri.trailDone) L += dist(ball.x, ball.y, tr[tr.length - 1].x, tr[tr.length - 1].y);
  var ray = function (from, dir, len, skip) {   // a straight piece, cut off at the first rail
    var hit = raycastWalls(from, dir, len + 1, hole.walls, skip);
    return vAdd(from, vScale(dir, hit ? hit.t : len));
  };
  var pts = [{ x: A.x, y: A.y }];
  if (p.type === 'WALL') {
    // in to the wall exactly along the white dotted line
    var V = p.point, inLen = dist(A.x, A.y, V.x, V.y);
    var reached = ri.revealed || L >= inLen;
    pts.push(reached ? { x: V.x, y: V.y } : vAdd(A, vScale(vNorm(vSub(V, A)), L)));
    // right or wrong, the line stops at the wall (a wrong answer's red arc shows the typed angle)
  } else {
    // a straight (complementary) shot: the line is one side of the right angle, so it stops at the
    // end of the angle's arc (see drawLiveAngleDiagram: r = 62)
    var dir = wrong && p.launchDir ? p.launchDir : p.aimDir;
    pts.push(ray(A, dir, 62));   // drawn full length right away
  }
  push();
  noFill();
  stroke(wrong ? '#e63946' : '#4dff4d');
  strokeWeight(4);
  strokeCap(ROUND);
  strokeJoin(ROUND);
  beginShape();
  for (var j = 0; j < pts.length; j++) vertex(pts[j].x, pts[j].y);
  endShape();
  pop();
}
function drawTrail() {
  var ri = resolvedInfo;
  if (!ri || ri.trail.length < 1) return;
  var wrong = ri.typed !== null && !ri.correct;
  var pts = ri.trail, live = !ri.trailDone;
  if (ri.shot && ri.shot.launchFrom) { drawExactRoute(ri, wrong); return; }
  if (wrong) {
    // A wrong answer draws ONE red line: the route in to the vertex, and no
    // further (the angle it makes is drawn by drawGreenAngleArc).
    var g = getGreenArms();
    if (ri.type === 'STRAIGHT') {
      // No bounce on a straight shot - the line just leaves the vertex.
      var len = 0, cut = pts.length;
      for (var k = 1; k < pts.length; k++) {
        len += dist(pts[k].x, pts[k].y, pts[k - 1].x, pts[k - 1].y);
        if (len >= OTHER_LINE_LEN) { cut = k + 1; break; }
      }
      live = live && cut >= pts.length;
      pts = pts.slice(0, cut);
    } else if (ri.trailCut !== undefined) {
      pts = pts.slice(0, ri.trailCut);
      if (g) pts = pts.concat([{ x: g.v.x, y: g.v.y }]);
      live = false;
    }
  }
  push();
  noFill();
  stroke(ri.correct ? '#4dff4d' : '#e63946');
  strokeWeight(4);
  strokeCap(ROUND);
  strokeJoin(ROUND);
  var fadeTo = (!wrong && ri.type === 'WALL' && ri.trailCut !== undefined) ? min(ri.trailCut, pts.length) : 0;
  if (fadeTo > 1) {   // the path IN stays solid (the angle is measured from it); the path OUT is faded
    beginShape();
    for (var fi = 0; fi < fadeTo; fi++) vertex(pts[fi].x, pts[fi].y);
    endShape();
    stroke(77, 255, 77, 120);
    pts = pts.slice(fadeTo - 1);
  }
  beginShape();
  for (var i = 0; i < pts.length; i++) vertex(pts[i].x, pts[i].y);
  if (live) vertex(ball.x, ball.y);
  endShape();
  pop();
}

// Shown from the moment a shot launches until the stroke resets
// (updatePhysics/startHole clear resolvedInfo once the ball stops), so
// the player always sees what the correct angle actually was right
// where it was measured from - not just on a miss. A wrong answer (or
// a Hero-mode timeout, which never let them answer at all) additionally
// shows the number they were actually judged against, stacked further
// out along the same offset direction so the two labels never overlap.
function drawResolvedAngleLabels() {
  if (!resolvedInfo || resolvedInfo.shot) return;   // (the after-shot diagram carries its own numbers)
  var d = resolvedInfo.offsetDir;
  noStroke();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(26);

  // One angle only, always in the same format: the number sits between the two
  // route lines at the vertex. A correct answer shows the correct angle in
  // green; a wrong answer shows only the angle the player typed, in red.
  var wrong = resolvedInfo.typed !== null && !resolvedInfo.correct;
  var gArms = getGreenArms();
  // middle of the arc: for a real bounce, gArms.mid is the true bisector between
  // the two green lines (the wall's normal); STRAIGHT has no real second line,
  // so it keeps the constructed reference ray's own midpoint.
  var lblAng = gArms ? (gArms.a2 !== undefined ? gArms.mid : gArms.a1 + gArms.s * shownAngleDeg() / 2) : 0;
  var waL = gArms ? wallAnswerArc(gArms) : null;
  if (waL) lblAng = waL.mid;
  var cx = gArms ? (waL ? waL.vx : gArms.v.x) + cos(lblAng) * (waL ? WALL_HALF_R * 1.6 : GREEN_LABEL_R) : resolvedInfo.point.x + d.x * 30;
  var cy = gArms ? (waL ? waL.vy : gArms.v.y) + sin(lblAng) * (waL ? WALL_HALF_R * 1.6 : GREEN_LABEL_R) : resolvedInfo.point.y + d.y * 30;
  var label = (wrong ? resolvedInfo.typed : resolvedInfo.correctAnswer) + '°';
  if (waL && !wrong) {   // the known angle, in gold, on the other side of the outgoing line
    var kx = waL.vx + cos(waL.kMid) * WALL_HALF_R * 1.6, ky = waL.vy + sin(waL.kMid) * WALL_HALF_R * 1.6;
    var kLbl = resolvedInfo.known + '°';
    textSize(14);
    fill(0, 0, 0, 150); text(kLbl, kx + 1.5, ky + 1.5);
    fill('#ffce6b'); text(kLbl, kx, ky);
    textSize(18);
  }
  if (waL) textSize(18);
  fill(0, 0, 0, 150);
  text(label, cx + 1.5, cy + 1.5);
  fill(wrong ? '#e63946' : '#4dff4d');
  text(label, cx, cy);
  textStyle(NORMAL);
}

// A single arrow pointing the direction the ball will actually travel,
// growing with drag distance the same way MAX_DRAG/power already
// worked - not the old full bounce-by-bounce forecast (computePreviewPath,
// now unused/removed). The player aims and judges power from this one
// clean line instead of reading a multi-segment predicted route; where
// it actually ends up (including any bank) is what the bank-shot
// question and the real roll are for.
function drawAimPreview() {
  if (!dragging || holePhase !== 'AIMING') return;
  var dx = dragStart.x - dragNow.x, dy = dragStart.y - dragNow.y;
  var d = min(mag(dx, dy), MAX_DRAG);
  var ang = atan2(dy, dx);
  var powerNorm = d / MAX_DRAG;
  var aimDir = { x: cos(ang), y: sin(ang) };
  var col = lerpColor(color('#3ea158'), color('#e63946'), powerNorm);

  var arrowLen = 46 + powerNorm * 150;
  var tipX = ball.x + aimDir.x * arrowLen, tipY = ball.y + aimDir.y * arrowLen;
  // Shaft stops short of the tip by the arrowhead's own length - a
  // round line cap reaching all the way to the tip peeks out past the
  // triangle's sharp point (the triangle is only a couple px wide right
  // at its very tip), reading as a stray dot sitting past the arrowhead.
  var shaftX = ball.x + aimDir.x * (arrowLen - 22), shaftY = ball.y + aimDir.y * (arrowLen - 22);

  push();
  strokeCap(ROUND);
  stroke(0, 0, 0, 130);
  strokeWeight(11);
  line(ball.x, ball.y, shaftX, shaftY);
  stroke(col);
  strokeWeight(7);
  line(ball.x, ball.y, shaftX, shaftY);
  pop();

  push();
  translate(tipX, tipY);
  rotate(ang);
  noStroke();
  fill(0, 0, 0, 130);
  triangle(2, 1, -20, -13, -20, 15);
  fill(col);
  triangle(0, 0, -22, -14, -22, 14);
  pop();
}
