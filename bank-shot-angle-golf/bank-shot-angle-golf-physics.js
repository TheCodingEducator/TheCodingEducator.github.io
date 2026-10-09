// ---------------------------------------------------------------
// Physics
// ---------------------------------------------------------------
function updatePhysics() {
  if (holePhase !== 'ROLLING' && millis() >= chaosUntil) return;

  var speed = mag(ball.vx, ball.vy);
  if (speed < MIN_STOP_SPEED && millis() >= chaosUntil) {
    ball.vx = 0; ball.vy = 0;
    if (holePhase === 'ROLLING' && resolvedInfo && resolvedInfo.typed !== null && !resolvedInfo.correct && resolvedInfo.shot) {
      // a wrong answer: once the ball stops, explain it, then the same question is asked again
      holePhase = 'EXPLAIN';
      explainOpen = true;
      return;
    }
    if (holePhase === 'ROLLING') {
      holePhase = 'AIMING';
      rollAlgebraSeed();
      pendingShot = null;
      resolvedInfo = null;
      holeBlockedThisStroke = false;
    }
    return;
  }


  // a wrong answer plays back a little slower (3 of every 4 frames), on exactly the same path
  if (resolvedInfo && resolvedInfo.typed !== null && !resolvedInfo.correct && (slowTick = (slowTick + 1) % 4) === 0) return;
  stepBallOneFrame(ball, pendingShot, allWalls(), hole.bushes, hole.zones, false, holeBlockedThisStroke, obsClock);
  checkHoleComplete();
}

// One frame's worth of ball motion: zone forces, then substepped
// movement with collision resolution, then friction. Pulled out of
// updatePhysics().
function stepBallOneFrame(b, pending, walls, bushes, zones, silent, poleActive, obsT) {
  for (var i = 0; i < zones.length; i++) {
    var z = zones[i];
    if (b.x > z.x && b.x < z.x + z.w && b.y > z.y && b.y < z.y + z.h) {
      b.vx += cos(z.dirDeg) * z.strength;
      b.vy += sin(z.dirDeg) * z.strength;
    }
  }

  // Move in substeps no bigger than roughly one ball radius. A single
  // big step (fast ball, shallow-angle wall) can have its one sampled
  // position land just past collision range on both sides of a thin
  // rail without ever coming within BALL_R of it mid-flight - classic
  // tunneling. Splitting the frame's movement into smaller hops and
  // resolving collisions after each one closes that gap.
  var steps = max(1, ceil(mag(b.vx, b.vy) / (BALL_R * 0.8)));
  for (var s = 0; s < steps; s++) {
    var wasApplied = !pending || pending.applied;
    b.x += b.vx / steps;
    b.y += b.vy / steps;

    // Consume a pending STRAIGHT-shot resolution once the ball actually
    // reaches the real point the diagram was drawn at - a wrong answer
    // bends the path there by the player's own numeric error, same
    // "natural, logical consequence" rule as the wall case.
    if (pending && pending.type === 'STRAIGHT' && !pending.applied && pending.launchFrom) {
      var traveled = dist(b.x, b.y, pending.launchFrom.x, pending.launchFrom.y);
      if (traveled >= pending.triggerDist) {
        pending.applied = true;
        if (!pending.correct) {
          var curSpeed = mag(b.vx, b.vy);
          var newAng = atan2(b.vy, b.vx) + pending.bendDeg;
          b.vx = cos(newAng) * curSpeed;
          b.vy = sin(newAng) * curSpeed;
        }
      }
    }

    collideWalls(b, pending, walls, silent);
    collideBushes(b, bushes);
    if (obsT !== undefined && hole.obstacles && hole.obstacles.length) collideObstacles(b, pending, obsT, silent);
    // Only real gameplay passes poleActive=true (see updatePhysics): the
    // pole only exists because THIS stroke's answer was wrong.
    if (poleActive && hole.cup) collidePole(b, hole.cup);

    // A pendingShot resolving (wall bounce or straight-line bend) ends
    // this frame's remaining substeps right there instead of quietly
    // continuing on the NEW direction for the rest of the frame's travel
    // budget, so the ball is never drawn past the real corner.
    if (pending && pending.applied && !wasApplied) break;
  }

  b.vx *= FRICTION;
  b.vy *= FRICTION;
}

// The corridor's own rails should always contain the ball, but a
// sharp interior corner (like where the tee's end-cap meets a side
// rail) can occasionally let a couple of substeps' worth of sequential
// per-wall correction drift the ball further than a single clean
// bounce would - a hard backstop just inside the canvas edges (well
// outside any real corridor) guarantees the ball can never actually
// leave the visible course, regardless of any corner-case physics
// imperfection elsewhere.
var SAFETY_BOUNDS = [
  { x1: 6, y1: 80, x2: 694, y2: 80 },
  { x1: 6, y1: 694, x2: 694, y2: 694 },
  { x1: 6, y1: 80, x2: 6, y2: 694 },
  { x1: 694, y1: 80, x2: 694, y2: 694 }
];

function allWalls() { return hole.walls.concat(SAFETY_BOUNDS); }

// A tight corner (like the one right where every hole's own puzzle
// wall usually sits) can put the ball within BALL_R of TWO different
// wall segments in the very same substep. The old version just looped
// every wall in array order and corrected against each one it was
// currently touching - if some other nearby rail happened to sit
// earlier in the array, it got a normal reflection FIRST, moving the
// ball and rewriting its velocity before the pending shot's own wall
// was even checked, so the "correct answer" override could end up
// applying on top of an already-corrupted direction (or missing the
// wall entirely, once that first correction moved the ball out of
// range). The pending shot's wall - the exact one the live question
// diagram was drawn on - now always gets checked and resolved FIRST,
// exclusively, before any other wall gets a chance to touch the ball's
// velocity this substep.
function collideWalls(b, pending, walls, silent) {
  if (pending && pending.type === 'WALL' && !pending.applied) {
    if (resolveWallCollision(b, pending, pending.wallRef, silent)) return;
  }
  for (var i = 0; i < walls.length; i++) {
    resolveWallCollision(b, pending, walls[i], silent);
  }
}

// Returns true if the ball was actually touching this wall (and
// resolves the bounce - either the pending shot's own override, once,
// or a normal reflection) so collideWalls() can stop right there when
// it matters. `silent` skips the bounce sound.
function resolveWallCollision(b, pending, w, silent) {
  var closest = closestPointOnSegment(b.x, b.y, w.x1, w.y1, w.x2, w.y2);
  var dx = b.x - closest.x, dy = b.y - closest.y;
  var d = mag(dx, dy);
  if (d >= BALL_R || d <= 0.0001) return false;
  var nx = dx / d, ny = dy / d;
  b.x = closest.x + nx * BALL_R;
  b.y = closest.y + ny * BALL_R;
  var vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    var speedNow = mag(b.vx, b.vy);
    if (pending && pending.type === 'WALL' && !pending.applied && pending.wallRef === w) {
      // A real bank shot bounces by the actual law of reflection (angle
      // of incidence = angle of reflection, both measured from the
      // wall's NORMAL) rather than an arbitrary "always turns exactly
      // 90 degrees" house rule - the physics is now the genuine thing,
      // not a simplification of it. The complementary-angle question
      // still comes along for free: `known` is the incidence angle
      // measured from the WALL, and the wall and its own normal are
      // always perpendicular by definition, so the angle from the
      // SAME incoming ray to the normal is always exactly (90-known) -
      // a real geometric fact, not a game rule. `resolvedAngle` is
      // that normal-relative angle (correctAnswer on a right answer,
      // literally whatever the player typed on a wrong one), and
      // reconstructing the outgoing ray at that angle from the normal
      // is provably the same as a true mirror bounce when the typed
      // value is correct: cos(known)*Wd + sin(known)*N (the standard
      // reflection formula, derived from v-2(v.n)n) equals
      // sin(90-known)*Wd + cos(90-known)*N, i.e. sin(resolvedAngle)*Wd
      // + cos(resolvedAngle)*N - the swapped sin/cos below, not a typo.
      var outDir = vNorm(vAdd(vScale(pending.Wd, sin(pending.resolvedAngle)), vScale(pending.N, cos(pending.resolvedAngle))));
      var newSpeed = speedNow * WALL_REST;
      b.vx = outDir.x * newSpeed;
      b.vy = outDir.y * newSpeed;
      pending.applied = true;
    } else {
      b.vx -= (1 + WALL_REST) * vn * nx;
      b.vy -= (1 + WALL_REST) * vn * ny;
    }
    if (!silent && mag(b.vx, b.vy) > 1.5) playSound('bounce');
  }
  return true;
}

function collideBushes(b, bushes) {
  for (var i = 0; i < bushes.length; i++) {
    var bu = bushes[i];
    var dx = b.x - bu.x, dy = b.y - bu.y;
    var d = mag(dx, dy);
    var minD = bu.r + BALL_R;
    if (d < minD && d > 0.0001) {
      var nx = dx / d, ny = dy / d;
      b.x = bu.x + nx * minD;
      b.y = bu.y + ny * minD;
      var vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= (1 + BUSH_REST) * vn * nx;
        b.vy -= (1 + BUSH_REST) * vn * ny;
      }
    }
  }
}

// The metal pole capping the cup after a wrong answer (see drawBlockingPole)
// - a plain solid-circle bounce, same shape as collideBushes, but sized
// past CUP_R so the ball is physically turned away before its center
// ever gets close enough to satisfy checkHoleComplete's sink radius, and
// springier (POLE_REST) since it reads as a firm metal bounce, not a
// soft hedge.
var POLE_R = CUP_R * 1.45 + BALL_R;   // the ball bounces off the edge of the "no entry" cover (see drawBlockingPole)
var POLE_REST = 0.85;
var coverFlashAt = -10000;   // when the ball last hit the "no entry" cover (for its flash)

function collidePole(b, cup) {
  var dx = b.x - cup.x, dy = b.y - cup.y;
  var d = mag(dx, dy);
  if (d < POLE_R && d > 0.0001) {
    var nx = dx / d, ny = dy / d;
    b.x = cup.x + nx * POLE_R;
    b.y = cup.y + ny * POLE_R;
    var vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + POLE_REST) * vn * nx;
      b.vy -= (1 + POLE_REST) * vn * ny;
      if (b === ball) { coverFlashAt = millis(); playSound('bounce'); }
    }
  }
}

// ---------------------------------------------------------------
// Signature obstacles (one kind per course): windmill sails, warp portals, sliding surfboards.
// They move on their own clock (obsClock, seconds), which runs while a hole is on screen. The
// shot questions are worked out on the fixed walls only; if the ball touches a moving obstacle
// before reaching the question's wall, that shot's scripted bounce is dropped and plain physics
// carries the ball from there.
// ---------------------------------------------------------------
var obsClock = 0;
var OBS_REST = 0.85;
var WINDMILL_HUB_R = 13;

// the moving wall pieces at time t: [{x1,y1,x2,y2, vel(px,py) -> {x,y} px/frame}]
function obstacleSegments(o, t) {
  var out = [];
  if (o.type === 'windmill') {
    var w = o.speed * Math.PI / 180;   // radians per second
    for (var k = 0; k < o.blades; k++) {
      var a = (o.speed * t + k * 360 / o.blades) * Math.PI / 180;
      out.push({ x1: o.x, y1: o.y, x2: o.x + Math.cos(a) * o.r, y2: o.y + Math.sin(a) * o.r,
        vel: function (px, py) { return { x: -(py - o.y) * w / 60, y: (px - o.x) * w / 60 }; } });
    }
  } else if (o.type === 'slider') {
    var s = sliderState(o, t), d = o.deg * Math.PI / 180, hl = o.len / 2;
    out.push({ x1: s.x - Math.cos(d) * hl, y1: s.y - Math.sin(d) * hl, x2: s.x + Math.cos(d) * hl, y2: s.y + Math.sin(d) * hl,
      vel: function () { return { x: s.vx, y: s.vy }; } });
  }
  return out;
}
// where a surfboard is at time t, and how fast it's moving (px/frame)
function sliderState(o, t) {
  var ph = (t / o.period + o.phase) * Math.PI * 2;
  var k = (1 - Math.cos(ph)) / 2, dk = Math.sin(ph) * Math.PI / o.period / 60;
  return { x: o.x1 + (o.x2 - o.x1) * k, y: o.y1 + (o.y2 - o.y1) * k, vx: (o.x2 - o.x1) * dk, vy: (o.y2 - o.y1) * dk };
}
function dropPending(pending) { if (pending && !pending.applied) { pending.applied = true; pending.abandoned = true; } }

function collideObstacles(b, pending, t, silent) {
  for (var i = 0; i < hole.obstacles.length; i++) {
    var o = hole.obstacles[i];
    if (o.type === 'portal') {
      if ((b.portalCool || 0) > 0) continue;
      if (dist(b.x, b.y, o.a.x, o.a.y) < o.r) {
        var sp = mag(b.vx, b.vy), dir = sp > 0.01 ? { x: b.vx / sp, y: b.vy / sp } : { x: 0, y: -1 };
        b.x = o.b.x + dir.x * (o.r + BALL_R + 2); b.y = o.b.y + dir.y * (o.r + BALL_R + 2);
        b.portalCool = 12;
        dropPending(pending);
        if (!silent) { playFx('warp'); o.flashAt = millis(); }
      }
      continue;
    }
    if (o.type === 'windmill') {   // the hub is a solid post
      var hd = dist(b.x, b.y, o.x, o.y), minD = WINDMILL_HUB_R + BALL_R;
      if (hd < minD && hd > 0.0001) {
        var hx = (b.x - o.x) / hd, hy = (b.y - o.y) / hd;
        b.x = o.x + hx * minD; b.y = o.y + hy * minD;
        var hvn = b.vx * hx + b.vy * hy;
        if (hvn < 0) { b.vx -= (1 + OBS_REST) * hvn * hx; b.vy -= (1 + OBS_REST) * hvn * hy; dropPending(pending); }
      }
    }
    var segs = obstacleSegments(o, t);
    for (var j = 0; j < segs.length; j++) {
      var sg = segs[j], c = closestPointOnSegment(b.x, b.y, sg.x1, sg.y1, sg.x2, sg.y2);
      var dx = b.x - c.x, dy = b.y - c.y, d = mag(dx, dy), R = BALL_R + 3;   // boards and sails are ~6px thick
      if (d >= R || d <= 0.0001) continue;
      var nx = dx / d, ny = dy / d, v = sg.vel(c.x, c.y);
      b.x = c.x + nx * R; b.y = c.y + ny * R;
      var rvx = b.vx - v.x, rvy = b.vy - v.y, vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        b.vx -= (1 + OBS_REST) * vn * nx; b.vy -= (1 + OBS_REST) * vn * ny;
        dropPending(pending);
        if (!silent && mag(b.vx, b.vy) > 1.2) playFx(o.type === 'windmill' ? 'thunk' : 'boing');
      }
    }
  }
  if (b.portalCool > 0) b.portalCool--;
}

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  var dx = x2 - x1, dy = y2 - y1;
  var len2 = dx * dx + dy * dy;
  var t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = constrain(t, 0, 1);
  return { x: x1 + t * dx, y: y1 + t * dy };
}
