// ---------------------------------------------------------------
// Hole lifecycle
// ---------------------------------------------------------------
// after choosing a mode: pick a course (each has its own theme and nine holes)
function startCourse() {
  gameState = 'COURSE_SELECT';
  kbCourseSel = kbCourseSel || 0;
}
function chooseCourse(i) {
  course = COURSES[i];
  kbCourseSel = i;
  holeIndex = 0;
  scorecard = [];
  roundResult = null;
  obsClock = 0;
  if (window.SiteResults) SiteResults.reset();
  gameState = 'COURSE_INTRO';
}

// Putting Green skips COURSE_INTRO entirely (there's nothing to reveal
// - it's always the same square) and goes straight into PLAYING on a
// single practice "hole" that's never left until the player backs out
// to the menu themselves.
function startPractice() {
  gameMode = MODE_PRACTICE;
  course = { key: 'practice', theme: THEMES.practice, holes: [buildPracticeArena()] };
  holeIndex = 0;
  scorecard = [];
  startHole(0);
}

// Course holes ease difficulty in by hole number; Putting Green has no
// holes to count, so it eases in by shots taken instead (capped at the
// same tier ceiling), then stays there - keeps using the exact same
// applyDifficultyTier() progression either way.
function currentHoleNum() {
  return gameMode === MODE_PRACTICE ? min(strokeCount + 1, 9) : holeIndex + 1;
}

function startHole(idx) {
  holeIndex = idx;
  hole = course.holes[idx];
  ball.x = hole.tee.x; ball.y = hole.tee.y; ball.vx = 0; ball.vy = 0;
  strokeCount = 0;
  sinkAnim = 0;
  gameState = 'PLAYING';
  holePhase = 'AIMING';
  rollAlgebraSeed();
  pendingShot = null;
  answerText = '';
  answerLocked = false;
  resolvedInfo = null;
  explainOpen = false;
  holeBlockedThisStroke = false;
  questionReady = false;
  confetti = []; popWord = null;
  cameraZoom = 1; cameraFocus.x = 350; cameraFocus.y = 350;
  holeBannerAt = millis();
  hole._layer = null;
  saveProgress();   // (a practice round is never saved)
}

// Snaps a known angle to this hole's difficulty tier (round numbers ease in for Golf Gamer; Hole-In-One
// Hero is any whole number from the start), from either a value measured live off the player's own aim
// (the wall case) or a fresh one when there's no wall to measure (the straight case: rawKnown null).
// Hero mode's back three (holes 7-9) also write the MISSING angle as a tiny equation, (x + d)° or
// (x - d)°: students find the angle, then undo the + d to get x. d is rolled once per stroke (see
// rollAlgebraSeed) so a retried question keeps the same equation.
var algebraSeedD = 4;
function rollAlgebraSeed() {
  algebraSeedD = floor(random(2, 9.999)) * (random() < 0.5 ? 1 : -1);
}
// the equation for a missing angle: x = missing - d (always a positive whole number)
function algebraFor(missing) {
  var d = algebraSeedD;
  if (missing - d < 1) d = -abs(d);
  return { d: d };
}
// "x + 5" / "x − 3"
function algebraText(alg) { return 'x ' + (alg.d >= 0 ? '+ ' : '− ') + abs(alg.d); }

// Golf Gamer eases in: given angles are multiples of 10 on holes 1-3, multiples of 5 on holes 4-6, then any whole number
function easySnap(mode, holeNum) { return (mode === MODE_EASY || mode === MODE_PRACTICE) ? (holeNum <= 3 ? 10 : (holeNum <= 6 ? 5 : 1)) : 1; }
function applyDifficultyTier(rawKnown, mode, holeNum, maxVal) {
  var known;
  var useAlgebra = false;

  if (mode === MODE_EASY || mode === MODE_PRACTICE) {
    if (rawKnown !== null) {
      var snap = holeNum <= 3 ? 10 : (holeNum <= 6 ? 5 : 1);
      known = round(rawKnown / snap) * snap;
    } else if (holeNum <= 3) known = 10 * floor(random(1, maxVal / 10 - 0.001));
    else if (holeNum <= 6) { do { known = 5 * floor(random(1, maxVal / 5 - 0.001)); } while (known % 10 === 0); }
    else known = floor(random(1, maxVal - 0.001));
  } else {
    if (rawKnown !== null) known = round(rawKnown);
    else known = floor(random(1, maxVal - 0.001));
    useAlgebra = holeNum >= 7;
  }
  // (a rounded angle stays a multiple of its step: a shallow 3° rounds up to 10°, not down to 0° and then 1°)
  var step = easySnap(mode, holeNum);
  known = constrain(known, step, floor((maxVal - 1) / step) * step);
  return { known: known, useAlgebra: useAlgebra };
}

// ---------------------------------------------------------------
// Shot classification - the heart of the redesign. Fired the instant
// the player releases their aim: raycasts the aimed direction against
// every rail in the hole, out to how far the shot would naturally
// travel before friction stops it (a plain geometric-series distance,
// v0/(1-FRICTION) - hills/water aren't factored in here, just the
// aim+power call the player actually made). A rail in the way makes
// this a bank shot (complementary, right-angle question live at the
// real contact point); nothing in the way makes it a straight shot
// (supplementary, straight-angle question at the real spot it would
// stop). Either way the question is answered before the ball moves,
// then consumed by updatePhysics() the instant the ball actually
// reaches that real point during ROLLING.
// ---------------------------------------------------------------
function stoppingDistance(power) { return power / (1 - FRICTION); }

// `excludeWall`, when given, skips only that exact wall (the one just
// bounced off) rather than using a blanket minimum distance - a flat
// "ignore anything within N px" cutoff would also skip a genuinely
// different wall that happens to sit close to a sharp corner right
// after a bounce, letting a ray (real or previewed) slip through a gap
// that isn't actually there.
// A point ball reaching a wall's exact mathematical line would have
// its CENTER exactly on the wall (half the real ball poking through to
// the other side) - collideWalls() actually stops/bounces the real
// ball's center BALL_R away, measured perpendicular to the wall
// (`closest + normal*BALL_R`). The correct way to reproduce that with
// a simple ray cast is to offset the WALL's line outward by BALL_R
// (along its own normal, toward whichever side the ball is
// approaching from) and intersect the ray against THAT shifted line -
// not to just shorten the ray by BALL_R along its own direction, which
// only agrees with the real perpendicular offset when the ball happens
// to hit the wall dead-on; at the oblique bank-shot angles this game
// is entirely built around, that approximation was still landing the
// traced point visibly off from where collideWalls() really stops the
// ball. Every consumer (the drag preview, the intended-path ghost
// line, and the shot classification itself) shares this function, so
// all three now agree with real physics at once.
function raycastWalls(origin, dir, maxDist, walls, excludeWall) {
  var best = null;
  for (var i = 0; i < walls.length; i++) {
    var w = walls[i];
    if (w === excludeWall) continue;
    var a = { x: w.x1, y: w.y1 }, b = { x: w.x2, y: w.y2 };
    var normal = vPerp(vNorm(vSub(b, a)));
    if (vDot(normal, vSub(origin, a)) < 0) normal = vScale(normal, -1);
    var offset = vScale(normal, BALL_R);
    var hit = raySegmentIntersect(origin, dir, vAdd(a, offset), vAdd(b, offset));
    if (hit && hit.t > 0.5 && hit.t < maxDist && (!best || hit.t < best.t)) {
      best = { t: hit.t, wall: w };
    }
  }
  if (!best) return null;
  return { point: { x: origin.x + dir.x * best.t, y: origin.y + dir.y * best.t }, t: best.t, wall: best.wall };
}

// Ray p = origin + t*dir (t>0) vs segment a-b. Standard 2D line-vs-line
// solve, rejected outside the ray's forward half or outside the segment.
function raySegmentIntersect(origin, dir, a, b) {
  var seg = vSub(b, a);
  var denom = dir.x * seg.y - dir.y * seg.x;
  if (Math.abs(denom) < 1e-9) return null;
  var diff = vSub(a, origin);
  var t = (diff.x * seg.y - diff.y * seg.x) / denom;
  var u = (diff.x * dir.y - diff.y * dir.x) / denom;
  if (t > 0 && u >= 0 && u <= 1) return { t: t, u: u };
  return null;
}

// Runs the shot with the game's real physics (bushes, hills, water currents,
// friction, the cup) on a scratch ball, as if it were launched exactly along
// aimDir, and reports the first course wall it actually touches - or null if it
// comes to rest / drops in the cup without touching any. A straight ray can't
// see any of those things, so it used to call a shot a "bank shot" (wall
// question) even when a bush or slope meant it never reached that wall.
function simulateFirstWallContact(origin, aimDir, power) {
  var b = { x: origin.x, y: origin.y, vx: aimDir.x * power, vy: aimDir.y * power };
  for (var frame = 0; frame < 2000; frame++) {
    var speed = mag(b.vx, b.vy);
    if (speed < MIN_STOP_SPEED) return null;
    var vx0 = b.vx, vy0 = b.vy;   // the heading BEFORE any bounce this frame
    stepBallOneFrame(b, null, hole.walls, hole.bushes, hole.zones, true);
    if (hole.cup && dist(b.x, b.y, hole.cup.x, hole.cup.y) < CUP_R - 2 && mag(b.vx, b.vy) < CUP_CAPTURE_SPEED) return null;
    if (frame < 2) continue;
    for (var i = 0; i < hole.walls.length; i++) {
      var w = hole.walls[i];
      var c = closestPointOnSegment(b.x, b.y, w.x1, w.y1, w.x2, w.y2);
      // only a wall the ball is rolling INTO counts - not one it starts next to and rolls away from
      if (dist(b.x, b.y, c.x, c.y) <= BALL_R + 1.5 && (vx0 * (c.x - b.x) + vy0 * (c.y - b.y)) > 0) return { wall: w, point: { x: b.x, y: b.y } };
    }
  }
  return null;
}

// A wall question asks for the SUPPLEMENTARY angle: the angle between the ball's
// outgoing path and the wall behind the contact point (the known angle is the
// other half of that straight line). The bounce physics works in angles measured
// from the wall's normal, which is this answer minus 90.
function wallNormalAngle(answerDeg) { return answerDeg - 90; }
// the given angle's value
function shotKnown(s) { return s.known; }
// the angle a typed answer stands for (with an equation, the angle is x + d)
function typedAngle(s, typed) { return typed + (s && s.algebra ? s.algebra.d : 0); }
// the question as an equation with a blank (shown as a hint after two misses, and on the explanation card)
function questionEquation(p) {
  var rhs = p.algebra ? algebraText(p.algebra) : '?';
  if (p.rel === 'vert') return (p.algebra ? rhs : '?') + ' = ' + p.known + '°';
  var sum = p.type === 'WALL' ? 180 : 90;
  return sum + '° − ' + p.known + '°' + (p.double ? ' − ' + p.known + '°' : '') + ' = ' + rhs;
}

function classifyAndBuildShot(aimDir, power, holeNum) {
  var origin = { x: ball.x, y: ball.y };
  var maxDist = stoppingDistance(power);
  var hit = raycastWalls(origin, aimDir, maxDist, hole.walls);

  // A wall can sit further down the same ray past the cup - raycastWalls
  // has no idea the ball would sink well before ever reaching it. If the
  // aim is lined up to drop straight into the cup before that wall (or
  // before running out of power at all), this is a shot into open
  // green, not a bank shot - a supplementary question, not
  // complementary, regardless of what the ray eventually hits.
  if (hit && hole.cup) {
    var toCup = vSub(hole.cup, origin);
    var alongRay = vDot(toCup, aimDir);
    if (alongRay > 0 && alongRay < hit.t) {
      var closest = vAdd(origin, vScale(aimDir, alongRay));
      if (dist(closest.x, closest.y, hole.cup.x, hole.cup.y) < CUP_R) hit = null;
    }
  }

  // The straight ray above can name a wall the ball never touches first (its
  // radius clips a nearer wall or corner; a bush or slope bends it). Trust the
  // real physics: no wall touched -> straight-line (supplementary) question; a
  // different wall touched -> ask about THAT wall.
  var angDir = aimDir;
  var sim = simulateFirstWallContact(origin, aimDir, power);
  // If a bush, hill or current would push the ball into a wall well away from where the player
  // aimed, the question would show up somewhere unexpected - ask the straight-shot question instead.
  if (sim) {
    var toHit = vSub(sim.point, origin);
    var offAim = Math.abs(((degrees(Math.atan2(toHit.y, toHit.x)) - degrees(Math.atan2(aimDir.y, aimDir.x))) % 360 + 540) % 360 - 180);
    if (offAim > 10) sim = null;
  }
  if (!sim) {
    hit = null;
  } else if (!hit || hit.wall !== sim.wall) {
    hit = { wall: sim.wall, point: sim.point, t: dist(origin.x, origin.y, sim.point.x, sim.point.y) };
    angDir = vNorm(vSub(sim.point, origin));
  }

  if (hit) {
    var w = hit.wall;
    var wallVec = vNorm({ x: w.x2 - w.x1, y: w.y2 - w.y1 });
    var Wd = vDot(wallVec, angDir) >= 0 ? wallVec : vScale(wallVec, -1);
    var perp = vPerp(Wd);
    var N = vDot(perp, angDir) < 0 ? perp : vScale(perp, -1);
    var rawKnown = degrees(Math.acos(constrain(vDot(angDir, Wd), -1, 1)));
    var tier = applyDifficultyTier(rawKnown, gameMode, holeNum, 89);
    // The question can round the real angle (43 -> 40 on easy holes). Turn the shot so it really
    // meets the wall at the asked angle - then the diagram, the dotted line and the ball all agree.
    var askedAim = vNorm(vAdd(vScale(Wd, cos(tier.known)), vScale(N, -sin(tier.known))));
    var askedSim = simulateFirstWallContact(origin, askedAim, power);
    if (askedSim && askedSim.wall === w) {
      aimDir = askedAim;
      angDir = vNorm(vSub(askedSim.point, origin));
      hit = { wall: w, point: askedSim.point, t: dist(origin.x, origin.y, askedSim.point.x, askedSim.point.y) };
      // the diagram sits where the STRAIGHT aim line meets the wall - currents and hills can curve
      // the ball on the way, but never the drawn angle
      var straightHit = raycastWalls(origin, askedAim, 100000, hole.walls);
      if (straightHit && straightHit.wall === w) { hit.point = straightHit.point; angDir = askedAim; }
    }
    // Hole-In-One Hero shows both equal angles of the bounce (in and out); the missing one is between them
    var wMissing = gameMode === MODE_HARD ? 180 - 2 * tier.known : 180 - tier.known;
    var wAlg = tier.useAlgebra ? algebraFor(wMissing) : null;
    var wallShot = {
      type: 'WALL', rel: 'supp', known: tier.known, missing: wMissing, algebra: wAlg, timerOn: false,
      double: gameMode === MODE_HARD,
      correctAnswer: wAlg ? wMissing - wAlg.d : wMissing, point: hit.point, Wd: Wd, N: N, wallRef: w,
      aimDir: aimDir, power: power, applied: false, launchFrom: { x: origin.x, y: origin.y }
    };
    // Only ask a wall question if the correct answer would really make the ball
    // bounce off that wall. A corner (two walls touching the ball at once) can
    // swallow the scripted bounce; then there is no wall angle to solve, so it
    // falls through to the straight-line question below.
    if (simulateTrail(wallShot, true).bounceIdx !== undefined) return wallShot;
  }

  // A straight shot is either a complementary question (a right angle with the aim line as one side) or a
  // vertical-angles one (the aim line and a guide line cross at the ball; the missing angle, between the
  // ball's path and the guide line, is across from the given one), about half and half.
  var dbl = gameMode === MODE_HARD;
  var vert = random() < 0.5;
  var tier2 = applyDifficultyTier(null, gameMode, holeNum, dbl ? 44 : 89);
  var sMissing;
  if (vert) {
    // any angle that isn't too close to 0°, 90° or 180°, rounded like the wall angles on easy holes
    var snapV = easySnap(gameMode, holeNum);
    do { tier2.known = round(random(20, 160) / snapV) * snapV; } while (abs(tier2.known - 90) < 6);
    sMissing = tier2.known;
  } else {
    // Golf Gamer's given angle is rounded like the wall angles (10s, then 5s, then anything).
    // Hole-In-One Hero splits the right angle into two equal given angles and the missing one.
    var snapC = easySnap(gameMode, holeNum);
    tier2.known = dbl ? floor(random(4, 41)) : snapC * floor(random(1, 90 / snapC));
    sMissing = dbl ? 90 - 2 * tier2.known : 90 - tier2.known;
  }
  var sAlg = tier2.useAlgebra ? algebraFor(sMissing) : null;
  return {
    type: 'STRAIGHT', rel: vert ? 'vert' : 'comp', known: tier2.known, missing: sMissing, algebra: sAlg, timerOn: false,
    double: dbl && !vert, vSign: random() < 0.5 ? 1 : -1,
    correctAnswer: sAlg ? sMissing - sAlg.d : sMissing,
    // The diagram/camera anchor for a straight shot - unlike WALL's
    // point (the actual contact point on a rail), there's no natural
    // "where" for an open-green shot except the ball's own launch spot.
    // Using the far-off stopping point instead used to zoom the camera
    // in on empty space well past the course, with the ball and the
    // whole hole scrolled off screen entirely.
    point: { x: origin.x, y: origin.y },
    triggerDist: maxDist * 0.6, aimDir: aimDir, power: power, applied: false
  };
}

function nextStroke() {
  strokeCount++;
}

function checkHoleComplete() {
  if (!hole.cup) return; // Putting Green practice arena has no cup to sink
  if (holeBlockedThisStroke) return; // capped by the metal pole - see collidePole
  var d = dist(ball.x, ball.y, hole.cup.x, hole.cup.y);
  var speed = mag(ball.vx, ball.vy);
  if (d < CUP_R - 2 && speed < CUP_CAPTURE_SPEED && holePhase === 'ROLLING') {
    holePhase = 'SUNK';
    playSound('sink');
    ball.vx = 0; ball.vy = 0;
    celebrateSink();
  }
}

function finishHole() {
  scorecard.push(strokeCount);
  gameState = 'HOLE_COMPLETE';
  holeResult = recordHole(holeIndex, strokeCount, hole.par);
  if (holeIndex + 1 < course.holes.length) saveProgress(holeIndex + 1);   // leaving now picks up at the next hole
  holeResult.at = millis();
  playSound(strokeCount <= hole.par ? 'hole_complete' : 'click');
  if (holeResult.newBest) burstConfetti(width / 2, height / 2 - 60, 60, 9);
}

function advanceAfterHole() {
  if (holeIndex + 1 < course.holes.length) {
    startHole(holeIndex + 1);
  } else {
    gameState = 'COURSE_COMPLETE';
    clearProgress();
    var tot = 0; for (var i = 0; i < scorecard.length; i++) tot += scorecard[i];
    roundResult = recordRound(tot, totalPar());
    playSound('course_complete');
    if (roundResult.isNew || tot < totalPar()) { playFx('record'); burstConfetti(width / 2, 120, 150, 12); }
    if (window.SiteResults) setTimeout(function () { SiteResults.show({ title: tl('Round results', 'Resultados de la ronda') }); }, 1800);
  }
}
