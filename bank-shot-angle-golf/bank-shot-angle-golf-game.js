// Bank Shot: Angle Golf
// A mini-golf game where every hole's opening shot is a bank-shot
// angle problem: the wall's known angle is shown, the player computes
// the complementary or supplementary partner angle, then aims and
// strikes. A correct answer sends the ball exactly where the player
// aimed; a wrong answer deflects the launch direction by the player's
// own numeric error, so a small mistake is a small miss and a big one
// is a big one. Real physics (friction, wall reflections, hills,
// water currents, bushes) carries every shot after that.

// ---------------------------------------------------------------
// Constants
// ---------------------------------------------------------------
var BOUND = { x: 50, y: 104, w: 600, h: 556 };
var BALL_R = 9;
var CUP_R = 14;
var FRICTION = 0.986;
// Exponential decay (v *= FRICTION every frame) never truly reaches
// zero, so how "stopped" is defined matters as much as the decay rate
// itself - at the old 0.06, the ball spent its last ~2.5s crawling at
// a speed too slow to actually see while still being tracked as
// ROLLING. Raised well above that so the roll gets cut off once it's
// already imperceptibly slow, not once it's mathematically exact -
// stoppingDistance()/aiming preview are untouched since those only
// depend on FRICTION, not this.
var MIN_STOP_SPEED = 0.25;
var MAX_DRAG = 170;
var MAX_LAUNCH_SPEED = 15;
var WALL_REST = 0.8;
var BUSH_REST = 0.55;
var CUP_CAPTURE_SPEED = 4.6;
var HERO_TIMER_SECONDS = 10;
var CHAOS_SPEED_MULT = 2.3;

var MODE_EASY = 'EASY';
var MODE_HARD = 'HARD';
var MODE_PRACTICE = 'PRACTICE';

// ---------------------------------------------------------------
// Theme palettes (more themes get appended here as courses are added)
// ---------------------------------------------------------------
var THEMES = {
  classicGreen: {
    label: 'Classic Green',
    icon: '⛳',
    fairwayA: '#3f9a55', fairwayB: '#66c277',
    rough: '#256b39',
    wall: '#8a5a34', wallHi: '#b9855a',
    bush: '#1f6b34', bushHi: '#2f8c47',
    water: '#2f7bdb', waterHi: '#6db2ff',
    sky: '#0e2a17'
  }
};

// ---------------------------------------------------------------
// Vector helpers + corridor builder
// ---------------------------------------------------------------
function vSub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
function vAdd(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
function vScale(a, s) { return { x: a.x * s, y: a.y * s }; }
function vLen(a) { return Math.sqrt(a.x * a.x + a.y * a.y); }
function vNorm(a) { var l = vLen(a) || 1; return { x: a.x / l, y: a.y / l }; }
function vDot(a, b) { return a.x * b.x + a.y * b.y; }
function vPerp(a) { return { x: -a.y, y: a.x }; } // +90deg, clockwise in y-down screen space

// Builds an enclosed fairway corridor from a centerline polyline (tee
// to cup), like a real mini-golf hole's rail-bordered track instead of
// a few free-floating walls inside one big open rectangle. `widths` is
// either one half-width for the whole corridor or a per-vertex array
// (a bigger value near the cup reads as the rounded "green" real holes
// widen into). Returns real wall segments for both rails plus short
// end caps so the whole hole is a single closed shape, and the raw
// left/right rail point lists for filling the fairway polygon.
function buildCorridor(points, widths) {
  var n = points.length;
  var w = Array.isArray(widths) ? widths : points.map(function () { return widths; });
  var normals = [];
  for (var i = 0; i < n; i++) {
    var dirs = [];
    if (i > 0) dirs.push(vNorm(vSub(points[i], points[i - 1])));
    if (i < n - 1) dirs.push(vNorm(vSub(points[i + 1], points[i])));
    var avg = { x: 0, y: 0 };
    for (var k = 0; k < dirs.length; k++) avg = vAdd(avg, dirs[k]);
    normals.push(vPerp(vNorm(avg)));
  }
  var left = [], right = [];
  for (i = 0; i < n; i++) {
    left.push(vAdd(points[i], vScale(normals[i], w[i])));
    right.push(vAdd(points[i], vScale(normals[i], -w[i])));
  }
  var walls = [];
  for (i = 0; i < n - 1; i++) {
    walls.push({ x1: left[i].x, y1: left[i].y, x2: left[i + 1].x, y2: left[i + 1].y });
    walls.push({ x1: right[i].x, y1: right[i].y, x2: right[i + 1].x, y2: right[i + 1].y });
  }
  walls.push({ x1: left[0].x, y1: left[0].y, x2: right[0].x, y2: right[0].y });
  walls.push({ x1: left[n - 1].x, y1: left[n - 1].y, x2: right[n - 1].x, y2: right[n - 1].y });
  return { walls: walls, left: left, right: right };
}

// The corridor's end-cap walls pass directly through points[0] and
// points[last] (see buildCorridor) - placing the tee/cup exactly there
// means the cup sits ON the end-cap wall with zero clearance. Insetting
// both markers along the centerline keeps them genuinely inside the
// enclosed shape instead of touching its boundary.
var HOLE_END_INSET = 40;

function makeHole(par, points, widths, bushes, zones) {
  var corridor = buildCorridor(points, widths);
  var n = points.length;
  var teeDir = vNorm(vSub(points[1], points[0]));
  var cupDir = vNorm(vSub(points[n - 1], points[n - 2]));
  var teePos = vAdd(points[0], vScale(teeDir, HOLE_END_INSET));
  var cupPos = vSub(points[n - 1], vScale(cupDir, HOLE_END_INSET));
  return {
    par: par,
    tee: { x: teePos.x, y: teePos.y },
    cup: { x: cupPos.x, y: cupPos.y },
    walls: corridor.walls,
    fairwayLeft: corridor.left, fairwayRight: corridor.right,
    bushes: bushes || [], zones: zones || []
  };
}

// Putting Green: a plain open square with no cup and no obstacles -
// an infinite practice arena. Every shot still gets a real bank/
// straight question off the same live classification every course
// hole uses, there's just nothing to win; the ball simply returns to
// AIMING once it stops, forever, until the player backs out to the menu.
function buildPracticeArena() {
  var b = { x: 70, y: 130, w: 560, h: 540 };
  var corners = [
    { x: b.x, y: b.y }, { x: b.x + b.w, y: b.y },
    { x: b.x + b.w, y: b.y + b.h }, { x: b.x, y: b.y + b.h }
  ];
  var walls = [];
  for (var i = 0; i < 4; i++) {
    var a = corners[i], c = corners[(i + 1) % 4];
    walls.push({ x1: a.x, y1: a.y, x2: c.x, y2: c.y });
  }
  return {
    par: null,
    tee: { x: b.x + b.w / 2, y: b.y + b.h / 2 },
    cup: null,
    walls: walls,
    fairwayPoly: corners,
    bushes: [], zones: []
  };
}

// ---------------------------------------------------------------
// Course data - Course 1: Classic Green (9 holes)
// Each hole is an enclosed fairway corridor (tee to cup), not an open
// field - see buildCorridor above. No hole authors a fixed "puzzle
// wall" or complementary/supplementary type any more: every shot is
// classified live from the player's own aim (see classifyAndBuildShot)
// - if it's heading for a rail, that's a complementary bank-shot
// question at the real contact point; if it's headed into open green,
// that's a supplementary straight-line question at the real spot it
// would come to rest.
// ---------------------------------------------------------------
function buildClassicGreenCourse() {
  return {
    key: 'classicGreen', theme: THEMES.classicGreen,
    holes: [
      makeHole(3, [{ x: 110, y: 600 }, { x: 110, y: 270 }, { x: 560, y: 270 }], [52, 52, 70],
        [], [{ type: 'water', x: 280, y: 240, w: 110, h: 60, dirDeg: 0, strength: 0.02 }]),

      makeHole(3, [{ x: 130, y: 610 }, { x: 130, y: 430 }, { x: 340, y: 430 }, { x: 340, y: 230 }, { x: 570, y: 230 }], 58,
        [{ x: 130, y: 520, r: 12 }], [{ type: 'hill', x: 200, y: 410, w: 50, h: 40, dirDeg: 0, strength: 0.028 }]),

      makeHole(3, [{ x: 130, y: 620 }, { x: 130, y: 160 }], 55,
        [], [{ type: 'hill', x: 92, y: 345, w: 80, h: 120, dirDeg: 0, strength: 0.04 }]),

      makeHole(4, [{ x: 590, y: 620 }, { x: 590, y: 390 }, { x: 300, y: 390 }, { x: 300, y: 160 }], 50,
        [{ x: 440, y: 500, r: 26 }],
        [{ type: 'water', x: 370, y: 365, w: 90, h: 45, dirDeg: 210, strength: 0.03 }]),

      makeHole(4, [{ x: 120, y: 620 }, { x: 120, y: 480 }, { x: 300, y: 480 }, { x: 300, y: 340 }, { x: 480, y: 340 }, { x: 480, y: 160 }], 46,
        [{ x: 300, y: 250, r: 22 }], [{ type: 'water', x: 180, y: 465, w: 40, h: 30, dirDeg: 0, strength: 0.026 }]),

      makeHole(4, [{ x: 150, y: 610 }, { x: 400, y: 610 }, { x: 400, y: 340 }, { x: 400, y: 170 }], [50, 50, 50, 85],
        [{ x: 350, y: 230, r: 16 }, { x: 450, y: 230, r: 16 }],
        [{ type: 'hill', x: 375, y: 480, w: 50, h: 80, dirDeg: 270, strength: 0.035 }]),

      makeHole(5, [{ x: 100, y: 620 }, { x: 100, y: 400 }, { x: 350, y: 400 }, { x: 350, y: 170 }, { x: 580, y: 170 }], 50,
        [{ x: 470, y: 170, r: 8 }],
        [
          { type: 'hill', x: 68, y: 465, w: 58, h: 80, dirDeg: 0, strength: 0.035 },
          { type: 'water', x: 190, y: 375, w: 170, h: 45, dirDeg: 90, strength: 0.026 }
        ]),

      makeHole(5, [{ x: 590, y: 620 }, { x: 590, y: 450 }, { x: 370, y: 450 }, { x: 370, y: 270 }, { x: 550, y: 270 }, { x: 550, y: 150 }], 42,
        [{ x: 290, y: 290, r: 11 }, { x: 350, y: 350, r: 10 }, { x: 400, y: 405, r: 7 }],
        [{ type: 'hill', x: 535, y: 195, w: 30, h: 50, dirDeg: 90, strength: 0.03 }]),

      makeHole(5, [{ x: 120, y: 160 }, { x: 120, y: 350 }, { x: 300, y: 350 }, { x: 300, y: 540 }, { x: 490, y: 540 }, { x: 490, y: 300 }, { x: 600, y: 300 }], 48,
        [{ x: 520, y: 340, r: 14 }],
        [
          { type: 'hill', x: 275, y: 410, w: 50, h: 80, dirDeg: 90, strength: 0.035 },
          { type: 'water', x: 468, y: 395, w: 44, h: 65, dirDeg: 190, strength: 0.028 }
        ])
    ]
  };
}

var COURSES = [buildClassicGreenCourse()];

// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------
var gameState = 'MENU';        // MENU | COURSE_INTRO | PLAYING | HOLE_COMPLETE | COURSE_COMPLETE
var holePhase = 'AIMING';      // AIMING | QUESTION | ROLLING | SUNK
var gameMode = MODE_EASY;
var course = null;
var holeIndex = 0;             // 0-based
var hole = null;

var ball = { x: 0, y: 0, vx: 0, vy: 0 };
var strokeCount = 0;
var scorecard = [];            // strokes per hole this round

// The live shot being classified/resolved - built the instant the
// player releases their aim (see classifyAndBuildShot), answered while
// the ball sits frozen at its real on-course contact/bend point, then
// consumed by updatePhysics() the moment the ball actually reaches
// that point during ROLLING. See the big comment above
// classifyAndBuildShot for the full field list.
var pendingShot = null;
var answerText = '';
var answerLocked = false;
var timerStart = 0;

var dragging = false;
var dragStart = { x: 0, y: 0 };
var dragNow = { x: 0, y: 0 };

// Confirm-before-exit dialog (see EXIT_BTN) - freezes physics and the
// hero-mode timer while it's open, so backing out never costs progress
// mid-question or lets the ball keep rolling unseen.
var confirmExitOpen = false;

// Opened the instant a typed answer turns out wrong (see submitAnswer)
// - a full worked explanation of the exact question just missed, not
// just a "you got it wrong" toast. Freezes physics same as
// confirmExitOpen, so the player can actually read it before the ball
// goes anywhere. Reads resolvedInfo directly for its content rather
// than its own snapshot, since both are set together at the same
// moment and share the same lifecycle.
var explainOpen = false;
var explainOpenedAt = 0;
var EXPLAIN_DELAY_MS = 3000; // after a wrong answer, the explanation can't be dismissed right away
function explainReady() { return millis() - explainOpenedAt >= EXPLAIN_DELAY_MS; }

// Set the instant a wrong answer resolves (see submitAnswer) and cleared
// the instant the resulting shot comes to rest (see updatePhysics'
// ROLLING->AIMING transition) and at the start of every hole/stroke - so
// a missed question caps the cup with a metal pole for exactly the one
// stroke it just cost the player, not permanently and not retroactively
// for strokes before the miss.
var holeBlockedThisStroke = false;

var chaosUntil = 0;
var chaosShakeMag = 0;
var preShotPos = { x: 0, y: 0 };
var sinkAnim = 0;              // 0..1


// The resolved-question readout shown next to the vertex while the
// ball rolls - the correct angle always, plus the player's own wrong
// number when they missed it. Captured as its own snapshot (not read
// live off pendingShot) because pendingShot itself goes null the
// instant a Hero-mode timeout fires (see triggerTimeoutChaos), and
// this needs to keep showing what the correct answer WAS regardless.
// Kept until the ball comes to rest. Nothing of it is drawn until `revealed` flips true (see updateAngleReveal) - the ball's route itself is never drawn.
var resolvedInfo = null;       // { correctAnswer, typed, correct, point, offsetDir }

// Camera zoom: eases toward the live question's real point while a
// question is up (making the small angle diagram big and legible),
// and back out to a full-course view otherwise. Plain exponential
// smoothing toward a moving target, recomputed every frame - simpler
// than tracking start times, and self-corrects if the target changes
// (e.g. the moment a question resolves) without a jump cut.
var cameraZoom = 1;
var cameraFocus = { x: 350, y: 350 };
var QUESTION_ZOOM = 2.4;

// ---------------------------------------------------------------
// Setup
// ---------------------------------------------------------------
function gameSetup() {
  // p5's textFont() takes a single font name, not a CSS comma-separated
  // fallback stack - passing the whole stack silently fails to apply
  // (ctx.font stays stuck at the browser's tiny default, no matter what
  // textSize() is called afterward). 'system-ui' is the one CSS keyword
  // that alone resolves to the platform's native UI font everywhere.
  textFont('system-ui');
}

function gameDraw() {
  background(10, 14, 10);
  if (gameState === 'MENU') { drawMenu(); return; }
  if (gameState === 'COURSE_INTRO') { drawCourseIntro(); return; }
  if (gameState === 'COURSE_COMPLETE') { drawScorecard(); return; }

  // Ease the camera toward the live question's real point (making the
  // angle diagram big and legible) or back out to the full course view.
  var wantZoomIn = holePhase === 'QUESTION' && pendingShot;
  var targetZoom = wantZoomIn ? QUESTION_ZOOM : 1;
  var targetFocus = wantZoomIn ? pendingShot.point : { x: 350, y: 350 };
  cameraZoom = lerp(cameraZoom, targetZoom, 0.12);
  cameraFocus.x = lerp(cameraFocus.x, targetFocus.x, 0.12);
  cameraFocus.y = lerp(cameraFocus.y, targetFocus.y, 0.12);

  // PLAYING / HOLE_COMPLETE both render the hole underneath
  push();
  translate(width / 2, height / 2);
  scale(cameraZoom);
  translate(-cameraFocus.x, -cameraFocus.y);
  if (millis() < chaosUntil) {
    translate(random(-chaosShakeMag, chaosShakeMag), random(-chaosShakeMag, chaosShakeMag));
  }
  drawHoleBackground();
  drawZones();
  drawWalls();
  drawBushes();
  drawCup();
  if (!confirmExitOpen && !explainOpen) updatePhysics();
  updateAngleReveal();
  updateTrail();
  drawVertexAngleMarker();
  drawGreenAngleArc();
  drawResolvedAngleLabels();
  drawTrail();
  drawBall();
  drawAimPreview();
  drawLiveAngleDiagram();
  pop();

  if (holePhase === 'SUNK' && sinkAnim >= 1 && gameState === 'PLAYING') {
    finishHole();
  }

  drawHUD();
  drawEquation();
  if (gameState === 'PLAYING') drawExitButton();
  if (holePhase === 'QUESTION') drawQuestionOverlay();
  drawScreenFlash();
  if (gameState === 'HOLE_COMPLETE') drawHoleCompleteOverlay();
  if (confirmExitOpen) drawExitConfirm();
  if (explainOpen) drawExplainModal();
}

// ---------------------------------------------------------------
// Menu
// ---------------------------------------------------------------
var MENU_HERO = { x: 56, y: 106, w: 588, h: 176 };
var MENU_CARD_W = 320, MENU_CARD_H = 288, MENU_CARD_Y = 306;

function drawMenu() {
  drawMenuBackground();

  noStroke();
  textAlign(CENTER, CENTER);
  fill(255);
  textStyle(BOLD);
  textSize(46);
  text('⛳ Bank Shot: Angle Golf', width / 2, 56);
  textStyle(NORMAL);
  textSize(18);
  fill(180, 200, 180);
  text('Solve the angle. Line up the shot. Sink the putt.', width / 2, 90);

  drawGolfHeroScene(MENU_HERO.x, MENU_HERO.y, MENU_HERO.w, MENU_HERO.h);

  drawModeCard(width / 2 - 12 - MENU_CARD_W, MENU_CARD_Y, 'Golf Gamer', 'EASY', '⛳',
    ['Angles ease in - 10s, then 5s,', 'then anything by hole 7.'], 'No clock. Take your time.', '#3ea158');
  drawModeCard(width / 2 + 12, MENU_CARD_Y, 'Hole-In-One Hero', 'HARD', '🔥',
    ['Any angle from hole 1 -', 'algebra by the back nine.'], '10s clock from hole 4. Miss it, ball goes wild.', '#e0562f');

  drawPracticeButton();

  textAlign(CENTER, CENTER);
  textSize(15);
  fill(140, 155, 140);
  text('9 holes per round · a new random themed course every time you play', width / 2, PRACTICE_BTN.y + PRACTICE_BTN.h + 24);
}

var PRACTICE_BTN = { w: 340, h: 50, y: 608 };

function drawPracticeButton() {
  var b = PRACTICE_BTN, x = width / 2 - b.w / 2;
  var hovered = mouseX > x && mouseX < x + b.w && mouseY > b.y && mouseY < b.y + b.h;
  noStroke();
  fill(0, 0, 0, hovered ? 90 : 60);
  rect(x + 2, b.y + 3, b.w, b.h, b.h / 2);
  fill(19, 25, 19, 245);
  rect(x, b.y, b.w, b.h, b.h / 2);
  var ac = color('#2f8ac7');
  stroke(red(ac), green(ac), blue(ac), hovered ? 255 : 110);
  strokeWeight(hovered ? 2.5 : 1.25);
  noFill();
  rect(x, b.y, b.w, b.h, b.h / 2);
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(19);
  textStyle(BOLD);
  text('🎯 Putting Green — Free Practice', width / 2, b.y + b.h / 2 + 1);
  textStyle(NORMAL);
}

function practiceButtonHit(mx, my) {
  var b = PRACTICE_BTN, x = width / 2 - b.w / 2;
  return mx > x && mx < x + b.w && my > b.y && my < b.y + b.h;
}

function drawMenuBackground() {
  var g1 = color(18, 46, 28), g2 = color(9, 22, 14);
  for (var y = 0; y < height; y++) {
    stroke(lerpColor(g1, g2, y / height));
    line(0, y, width, y);
  }
  noStroke();
  fill(255, 255, 255, 10);
  ellipse(width / 2, -60, 640, 320);
}

// ---- Animated hero scene: a golfer looping through a swing while the
// ball arcs toward a flag, purely a function of millis() % cycle so it
// never needs persistent per-frame state to keep looping cleanly. ----
var GOLF_CYCLE_MS = 2200;
var GOLF_IMPACT_T = 0.38, GOLF_FOLLOW_T = 0.58, GOLF_LAND_T = 0.9;

function easeOutQuad(x) { return 1 - (1 - x) * (1 - x); }
function easeInQuad(x) { return x * x; }
function smooth01(x) { return x * x * (3 - 2 * x); }

// Club angle is measured from the shoulder pivot, 0deg = pointing right,
// increasing = clockwise (p5's y-down screen space). The ball sits at
// pivot-relative offset (16, 40) - see drawSwingingGolfer - which is
// atan2(40,16) =~ 68deg from the pivot, so "impact" is set to that
// same angle on purpose: the club must actually be pointing at the
// ball's true position the instant it "strikes" it, not just somewhere
// plausible-looking, or the contact reads as fake. Backswing lifts the
// club up and back (counterclockwise, decreasing angle - swinging away
// from the target on the right is legitimately the opposite rotational
// sense). From backswing-top all the way through impact and into the
// follow-through is then ONE continuous clockwise (increasing-angle)
// sweep with no reversal right at the ball, so the strike visibly
// pushes the ball toward the target on the right, never the left.
var GOLF_BALL_ANGLE = 68;
function golfClubAngle(t) {
  var ready = GOLF_BALL_ANGLE + 2, impact = GOLF_BALL_ANGLE, follow = GOLF_BALL_ANGLE - 34;
  // backLift and backSwing are the SAME visual position (exactly 180deg
  // behind impact, a raised up-and-back top-of-backswing) but written
  // as two different numeric values 360deg apart on purpose: lerp()
  // interpolates the literal numbers, not the shortest visual arc, so
  // using -112 for the lift keeps that leg a clean decreasing sweep
  // (through "right, then up" - no dip through straight-down), while
  // using +248 for the swing-through keeps THAT leg decreasing too
  // (248 -> 68), i.e. counterclockwise all the way from the top of the
  // backswing, through impact, into the follow-through - contact and
  // everything after it happens in one continuous counterclockwise
  // motion, never reversing direction right at the ball.
  var backLift = GOLF_BALL_ANGLE - 180, backSwing = GOLF_BALL_ANGLE + 180;
  if (t < 0.20) return lerp(ready, backLift, easeOutQuad(t / 0.20));
  if (t < GOLF_IMPACT_T) return lerp(backSwing, impact, easeInQuad((t - 0.20) / (GOLF_IMPACT_T - 0.20)));
  if (t < GOLF_FOLLOW_T) return lerp(impact, follow, easeOutQuad((t - GOLF_IMPACT_T) / (GOLF_FOLLOW_T - GOLF_IMPACT_T)));
  if (t < 0.85) return follow;
  return lerp(follow, ready, smooth01((t - 0.85) / (1 - 0.85)));
}

function drawGolfHeroScene(px, py, pw, ph) {
  push();
  translate(px, py);
  drawingContext.save();
  drawingContext.beginPath();
  if (drawingContext.roundRect) drawingContext.roundRect(0, 0, pw, ph, 16);
  else drawingContext.rect(0, 0, pw, ph);
  drawingContext.clip();

  var g = drawingContext.createLinearGradient(0, 0, 0, ph);
  g.addColorStop(0, '#123a24');
  g.addColorStop(1, '#1d5a34');
  drawingContext.fillStyle = g;
  drawingContext.fillRect(0, 0, pw, ph);

  var groundY = ph * 0.74;
  noStroke();
  fill('#2f8a42');
  rect(0, groundY, pw, ph - groundY);
  fill(255, 255, 255, 14);
  for (var i = -20; i < pw; i += 30) rect(i, groundY, 15, ph - groundY);

  // flag + hole
  var holeX = pw * 0.88, holeY = groundY;
  fill(10, 10, 10);
  ellipse(holeX, holeY, 14, 5);
  stroke(230);
  strokeWeight(2);
  line(holeX, holeY, holeX, holeY - 44);
  noStroke();
  var wave = sin(millis() / 140) * 3;
  fill('#e63946');
  triangle(holeX, holeY - 44, holeX + 17 + wave, holeY - 38, holeX, holeY - 32);

  drawSwingingGolfer(pw * 0.17, groundY, holeX - 10, holeY - 4);

  drawingContext.restore();
  pop();
}

function drawSwingingGolfer(gx, groundY, targetX, targetY) {
  var t = (millis() % GOLF_CYCLE_MS) / GOLF_CYCLE_MS;
  var ang = golfClubAngle(t);
  var pivotY = groundY - 44;

  // Legs both hinge from one hip point (not two disconnected anchors
  // splayed out at torso height) with a slight knee bend, narrowing
  // toward the hip and spreading only at the feet for a natural stance.
  var hipX = gx, hipY = groundY - 30;
  stroke('#20241f');
  strokeWeight(6);
  strokeCap(ROUND);
  line(hipX, hipY, hipX - 6, hipY + 15);
  line(hipX - 6, hipY + 15, hipX - 9, groundY);
  line(hipX, hipY, hipX + 5, hipY + 15);
  line(hipX + 5, hipY + 15, hipX + 8, groundY);
  stroke('#3b6fd6');
  strokeWeight(10);
  line(hipX, hipY, gx, pivotY);
  noStroke();
  fill('#f0c8a0');
  ellipse(gx + 2, pivotY - 13, 17, 17);
  fill('#e63946');
  arc(gx + 2, pivotY - 15, 19, 15, 180, 360);

  push();
  translate(gx, pivotY);
  rotate(ang);
  stroke('#f0c8a0');
  strokeWeight(6);
  strokeCap(ROUND);
  line(0, 0, 28, 5);
  stroke('#cfcfcf');
  strokeWeight(3);
  line(28, 5, 62, 9);
  noStroke();
  fill('#efefef');
  ellipse(62, 9, 11, 7);
  pop();

  if (t > GOLF_IMPACT_T - 0.015 && t < GOLF_IMPACT_T + 0.06) {
    noStroke();
    fill(255, 255, 255, map(t, GOLF_IMPACT_T - 0.015, GOLF_IMPACT_T + 0.06, 210, 0));
    ellipse(gx + 16, groundY - 4, 18, 18);
  }

  var teeX = gx + 16, teeY = groundY - 4;
  var bx = teeX, by = teeY;
  if (t >= GOLF_IMPACT_T) {
    var bt = constrain((t - GOLF_IMPACT_T) / (GOLF_LAND_T - GOLF_IMPACT_T), 0, 1);
    bx = lerp(teeX, targetX, bt);
    by = lerp(teeY, targetY, bt) - sin(PI * bt) * 42;
  }
  fill(0, 0, 0, 60);
  ellipse(bx, groundY - 2, 8, 3);
  fill(255);
  ellipse(bx, by, 9, 9);
}

function drawModeCard(x, y, title, badge, icon, lines, tagline, accent) {
  var w = MENU_CARD_W, h = MENU_CARD_H;
  var cx = x + w / 2;
  var hovered = mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
  var lift = hovered ? 4 : 0;
  var pulse = hovered ? 150 + 90 * sin(millis() / 180) : 255;

  push();
  translate(0, -lift);
  noStroke();
  fill(0, 0, 0, hovered ? 90 : 60);
  rect(x + 3, y + 6, w, h, 18);
  fill(19, 25, 19, 245);
  rect(x, y, w, h, 18);
  var ac = color(accent);
  stroke(red(ac), green(ac), blue(ac), hovered ? 255 : 90);
  strokeWeight(hovered ? 2.5 : 1.25);
  noFill();
  rect(x, y, w, h, 18);

  noStroke();
  fill(accent);
  ellipse(cx, y + 44, 54, 54);
  textAlign(CENTER, CENTER);
  textSize(25);
  text(icon, cx, y + 45);

  fill(red(color(accent)), green(color(accent)), blue(color(accent)), pulse);
  textSize(15);
  textStyle(BOLD);
  text(badge, cx, y + 84);

  fill(255);
  textSize(26);
  text(title, cx, y + 111);
  textStyle(NORMAL);

  fill(200, 212, 200);
  textSize(15.5);
  text(lines[0], cx, y + 142);
  text(lines[1], cx, y + 165);

  fill(accent);
  textSize(14);
  textStyle(BOLD);
  text(tagline, cx - (w - 44) / 2, y + 194, w - 44);
  textStyle(NORMAL);

  fill(accent);
  rect(cx - 76, y + h - 58, 152, 40, 10);
  fill(255);
  textSize(18);
  textStyle(BOLD);
  text('Play', cx, y + h - 37);
  textStyle(NORMAL);
  pop();
}

function menuHit(mx, my) {
  var cards = [
    { mode: MODE_EASY, x: width / 2 - 12 - MENU_CARD_W },
    { mode: MODE_HARD, x: width / 2 + 12 }
  ];
  for (var i = 0; i < cards.length; i++) {
    if (mx > cards[i].x && mx < cards[i].x + MENU_CARD_W && my > MENU_CARD_Y && my < MENU_CARD_Y + MENU_CARD_H) return cards[i].mode;
  }
  return null;
}

// ---------------------------------------------------------------
// Course intro
// ---------------------------------------------------------------
var introTitle = '';
function drawCourseIntro() {
  background(10, 14, 10);
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(21);
  fill(150, 200, 160);
  text((gameMode === MODE_EASY ? 'GOLF GAMER' : 'HOLE-IN-ONE HERO') + ' · TODAY’S COURSE', width / 2, height / 2 - 90);
  textSize(56);
  fill(255);
  textStyle(BOLD);
  text(course.theme.icon + ' ' + course.theme.label, width / 2, height / 2 - 30);
  textStyle(NORMAL);
  textSize(18);
  fill(200, 210, 200);
  text('9 holes · par ' + totalPar(), width / 2, height / 2 + 24);

  fill('#3ea158');
  rect(width / 2 - 100, height / 2 + 64, 200, 54, 14);
  fill(255);
  textSize(21);
  textStyle(BOLD);
  text('Tee Off', width / 2, height / 2 + 91);
  textStyle(NORMAL);
}

function totalPar() {
  var p = 0;
  for (var i = 0; i < course.holes.length; i++) p += course.holes[i].par;
  return p;
}

function introHit(mx, my) {
  var x = width / 2 - 100, y = height / 2 + 64, w = 200, h = 54;
  return mx > x && mx < x + w && my > y && my < y + h;
}

// ---------------------------------------------------------------
// Hole lifecycle
// ---------------------------------------------------------------
function startCourse() {
  course = random(COURSES);
  holeIndex = 0;
  scorecard = [];
  gameState = 'COURSE_INTRO';
}

// Putting Green skips COURSE_INTRO entirely (there's nothing to reveal
// - it's always the same square) and goes straight into PLAYING on a
// single practice "hole" that's never left until the player backs out
// to the menu themselves.
function startPractice() {
  gameMode = MODE_PRACTICE;
  var practiceTheme = {};
  for (var k in THEMES.classicGreen) practiceTheme[k] = THEMES.classicGreen[k];
  practiceTheme.icon = '🎯';
  practiceTheme.label = 'Putting Green';
  course = { key: 'practice', theme: practiceTheme, holes: [buildPracticeArena()] };
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
}

// Snaps a known angle to this hole's difficulty tier (round numbers
// ease in for Golf Gamer; Hole-In-One Hero is arbitrary from the start
// and wraps the value in an algebraic expression on the back three) -
// same progression as before, just now applied to a value that's
// either measured live off the player's own aim (the wall case) or
// generated fresh when there's no wall to measure (the straight case),
// via `rawKnown` being a real degrees value or null respectively.
// Hero mode's algebra holes (7-9) need an (a, x) pair - fixed once per
// stroke (rolled whenever a fresh aim begins, see rollAlgebraSeed) so
// applyDifficultyTier is otherwise fully deterministic given rawKnown,
// rather than re-rolling a fresh (a, x) on every call.
var algebraSeedA = 3, algebraSeedX = 5;
function rollAlgebraSeed() {
  algebraSeedA = floor(random(2, 5.999));
  algebraSeedX = floor(random(2, 9.999));
}

function applyDifficultyTier(rawKnown, mode, holeNum, maxVal) {
  var known;
  var algebra = null;
  var timerOn = false;

  if (mode === MODE_EASY || mode === MODE_PRACTICE) {
    if (rawKnown !== null) {
      var snap = holeNum <= 3 ? 10 : (holeNum <= 6 ? 5 : 1);
      known = round(rawKnown / snap) * snap;
    } else if (holeNum <= 3) known = 10 * floor(random(1, maxVal / 10 - 0.001));
    else if (holeNum <= 6) { do { known = 5 * floor(random(1, maxVal / 5 - 0.001)); } while (known % 10 === 0); }
    else known = floor(random(1, maxVal - 0.001));
  } else {
    timerOn = holeNum >= 4;
    if (rawKnown !== null) known = round(rawKnown);
    else known = floor(random(1, maxVal - 0.001));
    if (holeNum >= 7) {
      var x = algebraSeedX, a = algebraSeedA;
      var b = constrain(known - a * x, 1, maxVal - 1 - a * x);
      known = a * x + b;
      algebra = { a: a, b: b, x: x };
    }
  }
  known = constrain(known, 1, maxVal - 1);
  return { known: known, algebra: algebra, timerOn: timerOn };
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

  if (hit) {
    var w = hit.wall;
    var wallVec = vNorm({ x: w.x2 - w.x1, y: w.y2 - w.y1 });
    var Wd = vDot(wallVec, aimDir) >= 0 ? wallVec : vScale(wallVec, -1);
    var perp = vPerp(Wd);
    var N = vDot(perp, aimDir) < 0 ? perp : vScale(perp, -1);
    var rawKnown = degrees(Math.acos(constrain(vDot(aimDir, Wd), -1, 1)));
    var tier = applyDifficultyTier(rawKnown, gameMode, holeNum, 89);
    return {
      type: 'WALL', known: tier.known, algebra: tier.algebra, timerOn: tier.timerOn,
      correctAnswer: 90 - tier.known, point: hit.point, Wd: Wd, N: N, wallRef: w,
      aimDir: aimDir, power: power, applied: false
    };
  }

  var tier2 = applyDifficultyTier(null, gameMode, holeNum, 179);
  return {
    type: 'STRAIGHT', known: tier2.known, algebra: tier2.algebra, timerOn: tier2.timerOn,
    correctAnswer: 180 - tier2.known,
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
  }
}

function finishHole() {
  scorecard.push(strokeCount);
  gameState = 'HOLE_COMPLETE';
  playSound(strokeCount <= hole.par ? 'hole_complete' : 'click');
}

function advanceAfterHole() {
  if (holeIndex + 1 < course.holes.length) {
    startHole(holeIndex + 1);
  } else {
    gameState = 'COURSE_COMPLETE';
    playSound('course_complete');
  }
}

// ---------------------------------------------------------------
// Rendering: hole world
// ---------------------------------------------------------------
// Fills ONLY the enclosed fairway corridor (the real playable shape),
// not the whole canvas - the surrounding "rough" reads as clearly
// outside the course, and the corridor's own rail walls (drawn after
// this) become a real, visible course boundary instead of a couple of
// free-floating lines inside an open field.
function drawHoleBackground() {
  var th = course.theme;
  noStroke();
  fill(th.rough);
  rect(0, 0, width, height);

  drawingContext.save();
  drawingContext.beginPath();
  if (hole.fairwayPoly) {
    // A plain closed polygon (the Putting Green practice arena's
    // square) instead of a corridor's offset left/right rail lists.
    var poly = hole.fairwayPoly;
    drawingContext.moveTo(poly[0].x, poly[0].y);
    for (var pi = 1; pi < poly.length; pi++) drawingContext.lineTo(poly[pi].x, poly[pi].y);
  } else {
    var left = hole.fairwayLeft, right = hole.fairwayRight;
    drawingContext.moveTo(left[0].x, left[0].y);
    for (var i = 1; i < left.length; i++) drawingContext.lineTo(left[i].x, left[i].y);
    for (i = right.length - 1; i >= 0; i--) drawingContext.lineTo(right[i].x, right[i].y);
  }
  drawingContext.closePath();
  drawingContext.clip();

  fill(th.fairwayB);
  rect(0, 0, width, height);
  var stripeW = 34;
  fill(th.fairwayA);
  // Starts far enough left that the diagonal bands (which slope down and
  // to the right) also reach the bottom-left of the canvas; a start of -2
  // left that whole corner unstriped, so half the course looked plain.
  for (var si = -Math.ceil(height / stripeW) - 2; si * stripeW < width; si++) {
    if (si % 2 !== 0) continue;
    var x0 = si * stripeW;
    quad(x0, 0, x0 + stripeW, 0, x0 + stripeW + height, height, x0 + height, height);
  }

  drawingContext.restore();
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
      fill(70, 55, 35, 100);
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

function drawWalls() {
  var th = course.theme;
  for (var i = 0; i < hole.walls.length; i++) {
    var w = hole.walls[i];
    // While a bank-shot question is live, the rail the ball is actually
    // headed for lights up gold so the diagram's wall is unmistakably
    // the same one sitting right there on the course.
    var isLit = holePhase === 'QUESTION' && pendingShot && pendingShot.type === 'WALL' && pendingShot.wallRef === w;
    push();
    strokeCap(ROUND);
    stroke(0, 0, 0, 90);
    strokeWeight(13);
    line(w.x1, w.y1 + 4, w.x2, w.y2 + 4);
    stroke(isLit ? '#e0a030' : th.wall);
    strokeWeight(11);
    line(w.x1, w.y1, w.x2, w.y2);
    stroke(isLit ? '#ffce6b' : th.wallHi);
    strokeWeight(4);
    line(w.x1, w.y1 - 1.5, w.x2, w.y2 - 1.5);
    pop();
  }
}

function drawBushes() {
  var th = course.theme;
  for (var i = 0; i < hole.bushes.length; i++) {
    var b = hole.bushes[i];
    noStroke();
    fill(0, 0, 0, 70);
    ellipse(b.x + 4, b.y + 6, b.r * 2.1, b.r * 1.1);
    fill(th.bush);
    ellipse(b.x, b.y, b.r * 2, b.r * 1.9);
    fill(th.bushHi);
    ellipse(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 1.1, b.r);
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

// Caps the cup with a hazard-striped metal pole for the stroke a wrong
// answer just cost the player (see holeBlockedThisStroke/collidePole) -
// a solid plate seals the mouth of the hole so the ball visibly cannot
// drop in, and the red/white banding reads as "blocked" the same way a
// real construction barrier pole does, at a glance and from any zoom.
function drawBlockingPole(h) {
  noStroke();
  fill(60, 64, 68);
  ellipse(h.x, h.y, CUP_R * 2.3, CUP_R * 1.5);
  fill(178, 183, 188);
  ellipse(h.x, h.y, CUP_R * 2.0, CUP_R * 1.2);
  fill(228, 231, 235);
  ellipse(h.x - CUP_R * 0.3, h.y - CUP_R * 0.18, CUP_R * 0.9, CUP_R * 0.42);

  var top = h.y - 62, poleW = 10, bandH = 8;
  for (var y = h.y; y > top; y -= bandH) {
    var bandIdx = floor((h.y - y) / bandH);
    fill(bandIdx % 2 === 0 ? '#e6e6e6' : '#d1372f');
    rect(h.x - poleW / 2, max(y - bandH, top), poleW, min(bandH, y - top));
  }
  fill(255, 255, 255, 90);
  rect(h.x - poleW / 2 + 1.5, top, 2, h.y - top);

  fill(210, 214, 218);
  ellipse(h.x, top, poleW + 4, poleW + 4);
  fill(255, 255, 255, 150);
  ellipse(h.x - 2, top - 2, (poleW + 4) * 0.4, (poleW + 4) * 0.4);
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
// The red wedge for the answer the player typed is sized so its number always
// sits fully inside it (see the corner test below).
function wrongWedgeSize(info) {
  var typed = info.typed;
  var mid = info.baseAngle + info.sweepSign * (info.known + typed / 2); // world degrees
  var halfSpan = typed / 2;
  var scales = [1, 0.75, 0.55]; // a very narrow wedge gets a smaller number rather than a giant wedge
  var best = null;
  for (var si = 0; si < scales.length && !best; si++) {
    var sc = scales[si], boxW = 60 * sc, boxH = 30 * sc;
    // Slide the label outward along the wedge's middle until every corner of its
    // box is inside the wedge's angle, whichever way the wedge happens to point
    // (the text is wider than tall, so a sideways wedge needs more room). Never
    // closer than one label-height past the green number (GREEN_LABEL_R), so the
    // two never overlap.
    var maxR = si === scales.length - 1 ? 340 : 200; // only the smallest size may run long
    for (var labelR = GREEN_LABEL_R + 34; labelR < maxR; labelR += 4) {
      var cx = cos(mid) * labelR, cy = sin(mid) * labelR, ok = true;
      for (var k = 0; k < 4; k++) {
        var px = cx + (k % 2 ? boxW : -boxW) / 2, py = cy + (k < 2 ? boxH : -boxH) / 2;
        var off = ((atan2(py, px) - mid) % 360 + 540) % 360 - 180;
        if (abs(off) > halfSpan - 1.5) { ok = false; break; }
      }
      if (ok) { best = { labelR: labelR, scale: sc, boxW: boxW, boxH: boxH }; break; }
    }
  }
  if (!best) best = { labelR: 340, scale: scales[scales.length - 1], boxW: 33, boxH: 16.5 };
  // The outline also has to enclose the box radially: farthest corner + margin.
  var reach = best.labelR + sqrt(best.boxW * best.boxW + best.boxH * best.boxH) / 2 + 6;
  return { labelR: best.labelR, wedgeR: reach, mid: mid, scale: best.scale, boxW: best.boxW, boxH: best.boxH };
}

// The route a CORRECT answer would have taken, cut off at the same point as
// the real line (bounce + TRAIL_AFTER_BOUNCE_PX). Built by running the real
// physics on a scratch ball, so it matches what a correct shot really does.
function simulateCorrectTrail(shot) {
  var from = shot.launchFrom || { x: ball.x, y: ball.y };
  var b = { x: from.x, y: from.y, vx: shot.aimDir.x * shot.power, vy: shot.aimDir.y * shot.power };
  var pending = {
    type: shot.type, wallRef: shot.wallRef, Wd: shot.Wd, N: shot.N,
    resolvedAngle: shot.correctAnswer, correct: true, bendDeg: 0,
    launchFrom: from, triggerDist: shot.triggerDist, applied: false
  };
  var walls = allWalls();
  var pts = [{ x: b.x, y: b.y }];
  var after = 0;
  for (var frame = 0; frame < 2000; frame++) {
    if (mag(b.vx, b.vy) < MIN_STOP_SPEED) break;
    stepBallOneFrame(b, pending, walls, hole.bushes, hole.zones, true);
    var last = pts[pts.length - 1];
    var step = dist(b.x, b.y, last.x, last.y);
    if (step > 3) {
      pts.push({ x: b.x, y: b.y });
      if (pending.applied) after += step;
    }
    if (pending.applied && pts.bounceIdx === undefined) pts.bounceIdx = pts.length - 1;
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
  if (ri.afterReveal >= TRAIL_AFTER_BOUNCE_PX) ri.trailDone = true;
}

// The angle between the two green route lines where the correct shot bounces:
// the vertex, where each arm points, and the bisector between them (which is
// where the green degree number sits, so it is always between the lines).
function computeGreenArms(pts) {
  if (!pts || pts.bounceIdx === undefined) return null;
  var v = pts[pts.bounceIdx];
  var inPt = pts[0], outPt = pts[pts.length - 1];
  for (var i = pts.bounceIdx - 1; i >= 0; i--) { if (dist(v.x, v.y, pts[i].x, pts[i].y) >= 24) { inPt = pts[i]; break; } }
  for (var j = pts.bounceIdx + 1; j < pts.length; j++) { if (dist(v.x, v.y, pts[j].x, pts[j].y) >= 24) { outPt = pts[j]; break; } }
  var a1 = atan2(inPt.y - v.y, inPt.x - v.x);
  var a2 = atan2(outPt.y - v.y, outPt.x - v.x);
  var diff = ((a2 - a1) % 360 + 540) % 360 - 180; // signed, -180..180
  if (abs(diff) < 4) return null;
  return { v: v, a1: a1, diff: diff, mid: a1 + diff / 2 };
}

// Gold arc between the two green lines, kept close to the vertex so the green
// number (further out along the bisector) never overlaps it.
var GREEN_ARC_R = 26;
var GREEN_LABEL_R = 58;
function getGreenArms() {
  if (!resolvedInfo) return null;
  if (resolvedInfo.greenArms === undefined) resolvedInfo.greenArms = computeGreenArms(resolvedInfo.intendedTrail);
  return resolvedInfo.greenArms;
}
function drawGreenAngleArc() {
  var g = getGreenArms();
  if (!g) return;
  push();
  noFill();
  stroke('#e0a030');
  strokeWeight(3.5);
  strokeCap(ROUND);
  arc(g.v.x, g.v.y, GREEN_ARC_R * 2, GREEN_ARC_R * 2, min(g.a1, g.a1 + g.diff), max(g.a1, g.a1 + g.diff));
  pop();
}

// Green for a correct answer, red for a wrong one (or a Hero-mode timeout).
function drawTrail() {
  var ri = resolvedInfo;
  if (!ri || ri.trail.length < 1) return;
  if (!ri.correct && ri.intendedTrail && ri.intendedTrail.length > 1) {
    // What a correct answer would have done - dashed green under the real line
    push();
    drawingContext.setLineDash([4, 7]);
    noFill();
    stroke('#4dff4d');
    strokeWeight(4);
    strokeCap(ROUND);
    strokeJoin(ROUND);
    beginShape();
    for (var j = 0; j < ri.intendedTrail.length; j++) vertex(ri.intendedTrail[j].x, ri.intendedTrail[j].y);
    endShape();
    drawingContext.setLineDash([]);
    pop();
  }
  push();
  noFill();
  stroke(ri.correct ? '#4dff4d' : '#e63946');
  strokeWeight(4);
  strokeCap(ROUND);
  strokeJoin(ROUND);
  beginShape();
  for (var i = 0; i < ri.trail.length; i++) vertex(ri.trail[i].x, ri.trail[i].y);
  if (!ri.trailDone) vertex(ball.x, ball.y);
  endShape();
  pop();
}

function drawVertexAngleMarker() {
  // Only a wrong answer draws anything here: a shaded red wedge for the angle
  // the player typed, starting from the same ray as the correct angle. The
  // correct angle itself is marked by the gold arc between the green route
  // lines (drawGreenAngleArc); the old small known/solved arcs are gone.
  if (!resolvedInfo || resolvedInfo.typed === null || resolvedInfo.correct) return;
  var knownEnd = resolvedInfo.sweepSign * resolvedInfo.known;
  var wrongEnd = knownEnd + resolvedInfo.sweepSign * resolvedInfo.typed;
  var wLo = min(knownEnd, wrongEnd), wHi = max(knownEnd, wrongEnd);
  var wSize = wrongWedgeSize(resolvedInfo);

  push();
  translate(resolvedInfo.point.x, resolvedInfo.point.y);
  rotate(resolvedInfo.baseAngle);
  strokeCap(ROUND);
  noStroke();
  fill(230, 57, 70, 60);
  arc(0, 0, wSize.wedgeR * 2, wSize.wedgeR * 2, wLo, wHi, PIE);
  noFill();
  strokeWeight(2.5);
  stroke('#e63946');
  arc(0, 0, wSize.wedgeR * 2, wSize.wedgeR * 2, wLo, wHi);
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
  if (!resolvedInfo) return;
  var d = resolvedInfo.offsetDir;
  noStroke();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(26);

  var gArms = getGreenArms();
  var cx = gArms ? gArms.v.x + cos(gArms.mid) * GREEN_LABEL_R : resolvedInfo.point.x + d.x * 30;
  var cy = gArms ? gArms.v.y + sin(gArms.mid) * GREEN_LABEL_R : resolvedInfo.point.y + d.y * 30;
  var correctLabel = resolvedInfo.correctAnswer + '°';
  fill(0, 0, 0, 150);
  text(correctLabel, cx + 1.5, cy + 1.5);
  fill('#4dff4d');
  text(correctLabel, cx, cy);

  if (resolvedInfo.typed !== null && !resolvedInfo.correct) {
    // Centered in the middle of the red wedge: halfway between its two rays,
    // measured in the same frame the arcs are drawn in (baseAngle + sweep).
    var wSizeL = wrongWedgeSize(resolvedInfo);
    var wrongMid = wSizeL.mid;
    var wLabelR = wSizeL.labelR;
    var wx = resolvedInfo.point.x + cos(wrongMid) * wLabelR, wy = resolvedInfo.point.y + sin(wrongMid) * wLabelR;
    var wrongLabel = resolvedInfo.typed + '°';
    textSize(26 * wSizeL.scale);
    fill(0, 0, 0, 150);
    text(wrongLabel, wx + 1.5, wy + 1.5);
    fill('#e63946');
    text(wrongLabel, wx, wy);
  }
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

// ---------------------------------------------------------------
// Physics
// ---------------------------------------------------------------
function updatePhysics() {
  if (holePhase !== 'ROLLING' && millis() >= chaosUntil) return;

  var speed = mag(ball.vx, ball.vy);
  if (speed < MIN_STOP_SPEED && millis() >= chaosUntil) {
    ball.vx = 0; ball.vy = 0;
    if (holePhase === 'ROLLING') {
      holePhase = 'AIMING';
      rollAlgebraSeed();
      pendingShot = null;
      resolvedInfo = null;
      holeBlockedThisStroke = false;
    }
    return;
  }


  stepBallOneFrame(ball, pendingShot, allWalls(), hole.bushes, hole.zones, false, holeBlockedThisStroke);
  checkHoleComplete();
}

// One frame's worth of ball motion: zone forces, then substepped
// movement with collision resolution, then friction. Pulled out of
// updatePhysics().
function stepBallOneFrame(b, pending, walls, bushes, zones, silent, poleActive) {
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
var POLE_R = CUP_R + BALL_R * 0.6;
var POLE_REST = 0.85;

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
    }
  }
}

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  var dx = x2 - x1, dy = y2 - y1;
  var len2 = dx * dx + dy * dy;
  var t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = constrain(t, 0, 1);
  return { x: x1 + t * dx, y: y1 + t * dy };
}

// ---------------------------------------------------------------
// Live question: the geometry diagram is drawn AT THE REAL POINT on
// the course (called from inside the world-space block in gameDraw,
// so it pans/shakes with everything else); the text/input/timer stay
// in a fixed screen-space bar underneath, same as before, since that's
// where a mobile keypad and a consistent tap target need to live.
// ---------------------------------------------------------------
// Redesigned for legibility once the camera is zoomed in on this exact
// point: both angle regions are filled wedges (not just thin arc
// outlines), so the shape of "the angle that is formed" is obvious at
// a glance, not something you have to trace with your eyes. Known
// angle in solid gold with its degree value large and centered in its
// own wedge; the unknown angle in blue with a big "?" the same way.
function drawLiveAngleDiagram() {
  if (!pendingShot || holePhase !== 'QUESTION') return;
  var p = pendingShot;
  var dir0, sweepDir, totalDeg, knownVal;
  if (p.type === 'WALL') {
    dir0 = p.Wd; sweepDir = p.N; totalDeg = 90;
  } else {
    dir0 = vScale(p.aimDir, -1); sweepDir = vPerp(dir0); totalDeg = 180;
  }
  knownVal = p.algebra ? (p.algebra.a * p.algebra.x + p.algebra.b) : p.known;

  var baseAngle = atan2(dir0.y, dir0.x);
  var sweepSign = vDot(sweepDir, vPerp(dir0)) >= 0 ? 1 : -1;
  var r = 62;

  // dotted line from the ball to the real point this diagram lives at
  push();
  drawingContext.setLineDash([6, 8]);
  stroke(255, 255, 255, 190);
  strokeWeight(2.5);
  line(ball.x, ball.y, p.point.x, p.point.y);
  drawingContext.setLineDash([]);
  pop();

  push();
  translate(p.point.x, p.point.y);
  rotate(baseAngle);

  var knownEnd = sweepSign * knownVal;
  var totalEnd = sweepSign * totalDeg;
  var kLo = min(0, knownEnd), kHi = max(0, knownEnd);
  var uLo = min(knownEnd, totalEnd), uHi = max(knownEnd, totalEnd);

  // filled wedges first, so the shared baseline/marker draw crisply on top
  noStroke();
  fill(224, 160, 48, 95);
  arc(0, 0, r * 2, r * 2, kLo, kHi, PIE);
  fill(91, 140, 255, 95);
  arc(0, 0, r * 2, r * 2, uLo, uHi, PIE);

  noFill();
  stroke(255, 255, 255, 200);
  strokeWeight(2.5);
  line(p.type === 'WALL' ? -18 : -r * 1.15, 0, r * 1.15, 0);

  strokeWeight(4);
  stroke('#e0a030');
  arc(0, 0, r * 2, r * 2, kLo, kHi);
  stroke('#5b8cff');
  arc(0, 0, r * 2, r * 2, uLo, uHi);

  if (totalDeg === 90) {
    noFill();
    stroke(255, 255, 255, 230);
    strokeWeight(2.5);
    var m = 20;
    beginShape();
    vertex(m, 0); vertex(m, m * sweepSign); vertex(0, m * sweepSign);
    endShape();
  }

  // Local-space positions for the two labels, computed here (still inside
  // the rotated frame) but drawn AFTER pop() below - text drawn while the
  // canvas is rotated gets rotated too (upside-down/mirrored digits, "?"
  // turns into "¿"), so we place it in unrotated world space instead.
  var kMid = knownEnd / 2;
  var kLocal = { x: cos(kMid) * r * 0.6, y: sin(kMid) * r * 0.6 };
  var uMid = (knownEnd + totalEnd) / 2;
  var uLocal = { x: cos(uMid) * r * 0.65, y: sin(uMid) * r * 0.65 };
  pop();

  var kWorld = rotatePoint(kLocal, baseAngle);
  var uWorld = rotatePoint(uLocal, baseAngle);

  noStroke();
  fill('#ffce6b');
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(15);
  text(knownVal + '°', p.point.x + kWorld.x, p.point.y + kWorld.y);
  fill('#bcd4ff');
  textSize(23);
  text('?', p.point.x + uWorld.x, p.point.y + uWorld.y);
  textStyle(NORMAL);
}

function rotatePoint(pt, deg) {
  var c = cos(deg), s = sin(deg);
  return { x: pt.x * c - pt.y * s, y: pt.x * s + pt.y * c };
}

// No background panel any more - just a bold title floating near the
// top (with a soft drop-shadow pass for legibility over the course
// art) once the camera has zoomed in, and a small pill-shaped input
// at the bottom instead of one big black box.
function drawQuestionOverlay() {
  if (!pendingShot) return;
  var isWall = pendingShot.type === 'WALL';
  var title = isWall ? 'Complementary Angles' : 'Supplementary Angles';
  var relWord = isWall ? 'sum to 90°' : 'sum to 180°';

  noStroke();
  textAlign(CENTER, TOP);
  textStyle(BOLD);
  textSize(38);
  fill(0, 0, 0, 130);
  text(title, width / 2 + 2, 96);
  fill(255);
  text(title, width / 2, 94);
  textStyle(NORMAL);

  textSize(18);
  fill(0, 0, 0, 130);
  text('These two angles ' + relWord, width / 2 + 1, 151);
  fill(216, 226, 216);
  text('These two angles ' + relWord, width / 2, 150);

  if (pendingShot.algebra) {
    var alg = pendingShot.algebra;
    fill(0, 0, 0, 130);
    text('Known angle = (' + alg.a + 'x + ' + alg.b + ')°, and x = ' + alg.x, width / 2 + 1, 179);
    fill('#ffce6b');
    text('Known angle = (' + alg.a + 'x + ' + alg.b + ')°, and x = ' + alg.x, width / 2, 178);
  }

  if (pendingShot.timerOn) {
    var remain = max(0, HERO_TIMER_SECONDS - (millis() - timerStart) / 1000);
    fill(remain < 3 ? '#e63946' : 255);
    textAlign(CENTER, TOP);
    textSize(26);
    textStyle(BOLD);
    text(ceil(remain) + 's', width / 2, pendingShot.algebra ? 208 : 178);
    textStyle(NORMAL);
    if (remain <= 0 && !answerLocked && !confirmExitOpen) {
      triggerTimeoutChaos();
    }
  }

  // bottom input pill
  var iw = 124, ih = 50, sw = 112, gap = 10;
  var totalW = iw + gap + sw;
  var ix = width / 2 - totalW / 2, iy = height - ih - 24;
  fill(0, 0, 0, 190);
  rect(ix, iy, iw, ih, ih / 2);
  fill(255);
  textSize(23);
  textAlign(CENTER, CENTER);
  text((answerText.length ? answerText : '_') + '°', ix + iw / 2, iy + ih / 2 + 1);

  var sx = ix + iw + gap;
  fill(answerText.length ? '#3ea158' : 'rgba(60,80,60,0.85)');
  rect(sx, iy, sw, ih, ih / 2);
  fill(255);
  textSize(18);
  textStyle(BOLD);
  text('Submit', sx + sw / 2, iy + ih / 2 + 1);
  textStyle(NORMAL);
  textAlign(LEFT, BASELINE);
}

function handleAnswerKey(k) {
  if (holePhase !== 'QUESTION' || answerLocked) return;
  if (k === 'backspace') { answerText = answerText.slice(0, -1); return; }
  if (k === 'enter') { submitAnswer(); return; }
  if (answerText.length < 3) answerText += k;
}

// Shared by drawLiveAngleDiagram and resolvedInfo's own vertex-arc
// marker (drawVertexAngleMarker) - both need the same "which direction
// is the 0deg baseline, which way does the known angle sweep" derived
// from a shot object, so this is the one place that math lives.
function shotBaseAngleAndSweep(shot) {
  var dir0 = shot.type === 'WALL' ? shot.Wd : vScale(shot.aimDir, -1);
  var sweepDirVec = shot.type === 'WALL' ? shot.N : vPerp(dir0);
  return {
    baseAngle: atan2(dir0.y, dir0.x),
    sweepSign: vDot(sweepDirVec, vPerp(dir0)) >= 0 ? 1 : -1
  };
}

// Resolving the answer is also the moment the shot actually launches -
// the ball has been frozen at the aim/power the player already chose
// while the question was live. Correct: leaves at the true angle
// (complementary/supplementary as shown), following the drag's real
// aim all the way to the wall/cup like normal physics. Wrong: leaves
// FROM THE TEE, immediately, already on a path that reflects the
// player's own (wrong) number - not a scripted mid-flight bend or a
// bounce off the wall at a fabricated angle once it gets there. Making
// the ball travel the correct-looking approach first and only reveal
// the error later (at the wall, or partway down the fairway) read as
// a physics glitch - a bounce at an angle that doesn't match how it
// hit the wall, or a ball that swerves for no visible reason mid-roll.
// Baking the wrong angle into the very first frame means what the
// player sees IS the consequence of their answer, start to finish.
function submitAnswer() {
  if (holePhase !== 'QUESTION' || answerLocked || answerText.length === 0 || !pendingShot) return;
  var typed = parseInt(answerText, 10);
  var correct = typed === pendingShot.correctAnswer;
  pendingShot.typed = typed;
  pendingShot.correct = correct;
  pendingShot.launchFrom = { x: ball.x, y: ball.y };
  if (!correct) holeBlockedThisStroke = true;

  var launchDir = pendingShot.aimDir;
  if (pendingShot.type === 'WALL') {
    pendingShot.resolvedAngle = correct ? pendingShot.correctAnswer : constrain(typed, 1, 179);
    if (!correct) {
      // The direction a ball leaving the wall AT the typed angle would
      // be heading (same outgoing-ray formula resolveWallCollision uses
      // for a real bounce - see its own comment for the derivation).
      var outDir = vNorm(vAdd(vScale(pendingShot.Wd, sin(pendingShot.resolvedAngle)), vScale(pendingShot.N, cos(pendingShot.resolvedAngle))));
      // Mirroring that back across the wall's own normal gives the
      // INCOMING direction that would produce it on a genuine physics
      // bounce off this same wall (reflection is its own inverse) - so
      // a typed answer close to correct launches close to the real aim
      // (reflecting the true answer's outDir back out this way is
      // provably a no-op, landing exactly on aimDir again), instead of
      // jumping straight to the unrelated post-bounce direction, which
      // could point anywhere - even roughly opposite the real aim -
      // for even a one-degree miss. `applied` is still marked used up
      // so the wall doesn't ALSO fire its own scripted-angle override
      // when the ball reaches it - whatever wall this incoming path
      // actually touches bounces off via real, ordinary physics.
      launchDir = vNorm(vAdd(outDir, vScale(pendingShot.N, -2 * vDot(outDir, pendingShot.N))));
      pendingShot.applied = true;
    }
  } else {
    if (!correct) {
      pendingShot.bendDeg = constrain(typed - pendingShot.correctAnswer, -75, 75);
      var aimAngle = atan2(pendingShot.aimDir.y, pendingShot.aimDir.x);
      var bentAngle = aimAngle + pendingShot.bendDeg;
      launchDir = { x: cos(bentAngle), y: sin(bentAngle) };
      pendingShot.applied = true;
    }
  }
  triggerScreenFlash(correct ? '#3ea158' : '#e63946', correct);

  answerLocked = true;
  ball.vx = launchDir.x * pendingShot.power;
  ball.vy = launchDir.y * pendingShot.power;
  holePhase = 'ROLLING';
  nextStroke();
  playSound('hit');
  playSound(correct ? 'correct' : 'wrong');
  var baseSweep = shotBaseAngleAndSweep(pendingShot);
  resolvedInfo = {
    correctAnswer: pendingShot.correctAnswer, typed: typed, correct: correct,
    point: { x: pendingShot.point.x, y: pendingShot.point.y },
    offsetDir: pendingShot.type === 'WALL' ? pendingShot.N : { x: 0, y: -1 },
    type: pendingShot.type, known: pendingShot.known, algebra: pendingShot.algebra,
    baseAngle: baseSweep.baseAngle, sweepSign: baseSweep.sweepSign,
    revealed: false, revealFrom: { x: ball.x, y: ball.y },
    trail: [{ x: ball.x, y: ball.y }], trailDone: false, afterReveal: 0,
    intendedTrail: simulateCorrectTrail(pendingShot)
  };
  if (!correct) { explainOpen = true; explainOpenedAt = millis(); }
}

// ---------------------------------------------------------------
// Correct/incorrect screen flash
// ---------------------------------------------------------------
var screenFlash = null; // { col, start, duration, isCorrect }

function triggerScreenFlash(col, isCorrect) {
  screenFlash = { col: col, start: millis(), duration: 380, isCorrect: isCorrect };
}

function drawScreenFlash() {
  if (!screenFlash) return;
  var elapsed = millis() - screenFlash.start;
  if (elapsed > screenFlash.duration) { screenFlash = null; return; }
  var t = elapsed / screenFlash.duration;
  var alpha = (1 - t) * (1 - t) * 130;
  var c = color(screenFlash.col);
  noStroke();
  fill(red(c), green(c), blue(c), alpha);
  rect(0, 0, width, height);

  // A checkmark/X alongside the color tint, same red-green-color-
  // blindness reasoning as drawResolvedAngleLabels - brief as this flash
  // is, it's still the very first thing a player sees after answering.
  var iconAlpha = (1 - t) * (1 - t) * 220;
  fill(red(c), green(c), blue(c), iconAlpha);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(120);
  text(screenFlash.isCorrect ? '✓' : '✗', width / 2, height / 2);
  textStyle(NORMAL);
}

// ---------------------------------------------------------------
// Aiming input
// ---------------------------------------------------------------
function mousePressed() {
  if (explainOpen) {
    if (explainReady() && explainModalHit(mouseX, mouseY)) { explainOpen = false; playSound('click'); }
    return;
  }
  if (confirmExitOpen) {
    var choice = exitConfirmHit(mouseX, mouseY);
    if (choice === 'exit') { confirmExitOpen = false; dragging = false; gameState = 'MENU'; playSound('click'); }
    else if (choice === 'cancel') { confirmExitOpen = false; playSound('click'); }
    return;
  }
  if (gameState === 'PLAYING' && exitButtonHit(mouseX, mouseY)) {
    confirmExitOpen = true;
    playSound('click');
    return;
  }
  if (gameState === 'MENU') {
    if (practiceButtonHit(mouseX, mouseY)) { startPractice(); playSound('click'); return; }
    var m = menuHit(mouseX, mouseY);
    if (m) { gameMode = m; startCourse(); playSound('click'); }
    return;
  }
  if (gameState === 'COURSE_INTRO') {
    if (introHit(mouseX, mouseY)) { playSound('click'); startHole(0); }
    return;
  }
  if (gameState === 'HOLE_COMPLETE') {
    advanceAfterHole();
    playSound('click');
    return;
  }
  if (gameState === 'COURSE_COMPLETE') {
    if (scorecardHit(mouseX, mouseY)) { gameState = 'MENU'; playSound('click'); }
    return;
  }
  if (gameState === 'PLAYING' && holePhase === 'QUESTION') {
    var iw = 100, ih = 42, sw = 90, gap = 8;
    var totalW = iw + gap + sw;
    var ix = width / 2 - totalW / 2, iy = height - ih - 22;
    var sx = ix + iw + gap;
    if (mouseX > sx && mouseX < sx + sw && mouseY > iy && mouseY < iy + ih) submitAnswer();
    return;
  }
  if (gameState === 'PLAYING' && holePhase === 'AIMING') {
    var d = dist(mouseX, mouseY, ball.x, ball.y);
    if (d < 220) {
      dragging = true;
      dragStart.x = ball.x; dragStart.y = ball.y;
      dragNow.x = mouseX; dragNow.y = mouseY;
    }
  }
}

function mouseDragged() {
  if (dragging) { dragNow.x = mouseX; dragNow.y = mouseY; }
}

// p5 only auto-falls-back from touch to the mouse callbacks for
// touchMoved (not touchStarted/touchEnded) - see _ontouchstart/
// _ontouchend in bank-shot-angle-golf-p5.min.js, which only invoke
// mousePressed/mouseReleased if touchStarted/touchEnded are left
// undefined AND the browser happens to also synthesize compatibility
// mouse events afterward, which real mobile browsers do inconsistently
// for drag gestures. Defining these explicitly - just delegating to
// the same mouse handlers, since p5 keeps mouseX/mouseY in sync with
// the active touch point regardless - makes canvas drag-to-aim work
// reliably on every touch device instead of depending on that quirk.
function touchStarted() { mousePressed(); return false; }
function touchMoved() { mouseDragged(); return false; }
function touchEnded() { mouseReleased(); return false; }

// Desktop keyboard: digits, backspace, enter for the answer box. Mobile
// uses the on-screen keypad in bank-shot-angle-golf-mobile-controls.js,
// which calls handleAnswerKey() directly.
function keyPressed(ev) {
  // Returning false below cancels a key's default action, which would also
  // swallow browser shortcuts (Ctrl+R / Ctrl+Shift+R hard refresh, F5, etc).
  // Let any Ctrl/Cmd/Alt combo and function key through untouched.
  if ((ev && (ev.ctrlKey || ev.metaKey || ev.altKey)) ||
      keyIsDown(CONTROL) || keyIsDown(91) || keyIsDown(93) || keyIsDown(224) ||
      (keyCode >= 112 && keyCode <= 123)) return true;
  // Escape acts the same as clicking the exit button - both bring up the
  // same confirm-before-quitting overlay.
  if (keyCode === ESCAPE && gameState === 'PLAYING' && !confirmExitOpen) {
    confirmExitOpen = true;
    return false;
  }
  if (explainOpen) {
    if (explainReady() && (keyCode === ENTER || keyCode === RETURN || key === ' ')) { explainOpen = false; playSound('click'); }
    return false;
  }
  if (gameState === 'HOLE_COMPLETE') {
    if (keyCode === ENTER || keyCode === RETURN || key === ' ') { advanceAfterHole(); playSound('click'); }
    return false;
  }
  if (holePhase !== 'QUESTION') return false;
  if (key >= '0' && key <= '9') { handleAnswerKey(key); return false; }
  if (keyCode === BACKSPACE) { handleAnswerKey('backspace'); return false; }
  if (keyCode === ENTER || keyCode === RETURN) { handleAnswerKey('enter'); return false; }
  return true;
}

// Releasing the drag no longer fires the shot - it freezes the ball
// right where it is and classifies what this exact aim+power would do
// (see classifyAndBuildShot): head for a rail, or travel straight into
// open green. The question that pops up live on the course is built
// from that real classification, and answering it is what actually
// launches the ball (see submitAnswer).
function mouseReleased() {
  if (!dragging) return;
  dragging = false;
  var dx = dragStart.x - dragNow.x, dy = dragStart.y - dragNow.y;
  var d = min(mag(dx, dy), MAX_DRAG);
  if (d < 8) return; // too short, not a real shot
  var aimAngle = atan2(dy, dx); // already in degrees - angleMode(DEGREES) is set
  var aimDir = { x: cos(aimAngle), y: sin(aimAngle) };
  var power = (d / MAX_DRAG) * MAX_LAUNCH_SPEED;

  pendingShot = classifyAndBuildShot(aimDir, power, currentHoleNum());
  answerText = '';
  answerLocked = false;
  timerStart = millis();
  holePhase = 'QUESTION';
}


// ---------------------------------------------------------------
// Hero-mode timeout chaos shot
// ---------------------------------------------------------------
function triggerTimeoutChaos() {
  answerLocked = true;
  // Captured before pendingShot goes null just below - chaos never lets
  // the player answer, but they should still see what the correct angle
  // WAS, same as a normal wrong answer would show.
  var baseSweep = shotBaseAngleAndSweep(pendingShot);
  resolvedInfo = {
    correctAnswer: pendingShot.correctAnswer, typed: null, correct: false,
    point: { x: pendingShot.point.x, y: pendingShot.point.y },
    offsetDir: pendingShot.type === 'WALL' ? pendingShot.N : { x: 0, y: -1 },
    type: pendingShot.type, known: pendingShot.known, algebra: pendingShot.algebra,
    baseAngle: baseSweep.baseAngle, sweepSign: baseSweep.sweepSign,
    revealed: false, revealFrom: { x: ball.x, y: ball.y },
    trail: [{ x: ball.x, y: ball.y }], trailDone: false, afterReveal: 0,
    intendedTrail: simulateCorrectTrail(pendingShot)
  };
  pendingShot = null; // chaos bypasses the normal wall/straight resolution entirely
  holePhase = 'ROLLING';
  // A timeout is exactly as "not correct" as a wrong typed answer, and
  // the wild shot below is aimed straight at the cup (with only a
  // random spread) rather than off in whatever direction a bank-shot
  // miss happens to send it - if anything, the cup is MORE likely to
  // be in the ball's path here, so it needs the same metal-pole block.
  holeBlockedThisStroke = true;
  preShotPos.x = ball.x; preShotPos.y = ball.y;
  var toCup = atan2(hole.cup.y - ball.y, hole.cup.x - ball.x);
  var wildAngle = toCup + random(-40, 40);
  ball.vx = cos(wildAngle) * MAX_LAUNCH_SPEED * CHAOS_SPEED_MULT;
  ball.vy = sin(wildAngle) * MAX_LAUNCH_SPEED * CHAOS_SPEED_MULT;
  chaosUntil = millis() + 1400;
  chaosShakeMag = 5;
  nextStroke();
  playSound('chaos');
  triggerScreenFlash('#e63946', false);

  setTimeout(function () {
    chaosShakeMag = 0;
    var away = atan2(preShotPos.y - hole.cup.y, preShotPos.x - hole.cup.x);
    var dist2 = random(25, 45);
    ball.x = preShotPos.x + cos(away) * dist2;
    ball.y = preShotPos.y + sin(away) * dist2;
    ball.vx = 0; ball.vy = 0;
    holePhase = 'AIMING';
    holeBlockedThisStroke = false;
    rollAlgebraSeed();
  }, 1400);
}

// ---------------------------------------------------------------
// HUD / overlays
// ---------------------------------------------------------------
function drawHUD() {
  noStroke();
  fill(10, 14, 10, 220);
  rect(0, 0, width, 82);
  fill(255);
  textAlign(LEFT, CENTER);
  textSize(19);
  textStyle(BOLD);
  text(course.theme.icon + ' ' + course.theme.label, 20, 26);
  textStyle(NORMAL);
  textSize(15.5);
  fill(180, 195, 180);
  if (gameMode === MODE_PRACTICE) {
    text('Free practice · no par, no limit', 20, 54);
  } else {
    text('Hole ' + (holeIndex + 1) + ' / 9 · Par ' + hole.par, 20, 54);
  }

  textAlign(RIGHT, CENTER);
  fill(255);
  textSize(19);
  textStyle(BOLD);
  text((gameMode === MODE_PRACTICE ? 'Shots: ' : 'Strokes: ') + strokeCount, width - 20, 26);
  textStyle(NORMAL);
  textSize(15.5);
  fill(180, 195, 180);
  var modeLabel = gameMode === MODE_EASY ? 'Golf Gamer' : (gameMode === MODE_HARD ? 'Hole-In-One Hero' : 'Putting Green');
  text(modeLabel, width - 20, 54);
  textAlign(LEFT, BASELINE);
}

// The actual arithmetic behind a correct answer, shown big and bold
// across the HUD bar (between the hole/mode readouts on either side)
// once the angle is revealed, in the same bright green as
// the correct angle label - this is the reward for getting it right,
// so it's sized to be unmissable rather than a small readout. A wrong
// answer gets its own full explanation via drawExplainModal instead
// of a shrunk-down version of this.
function drawEquation() {
  if (!resolvedInfo || !resolvedInfo.correct) return;
  var sum = resolvedInfo.type === 'WALL' ? 90 : 180;
  noStroke();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  fill('#4dff4d');
  if (resolvedInfo.algebra) {
    var alg = resolvedInfo.algebra;
    textSize(21);
    text(alg.a + '(' + alg.x + ') + ' + alg.b + ' = ' + resolvedInfo.known + '°', width / 2, 25);
    text('✓ ' + sum + '° − ' + resolvedInfo.known + '° = ' + resolvedInfo.correctAnswer + '°', width / 2, 57);
  } else {
    textSize(28);
    text('✓ ' + sum + '° − ' + resolvedInfo.known + '° = ' + resolvedInfo.correctAnswer + '°', width / 2, 41);
  }
  textStyle(NORMAL);
  textAlign(LEFT, BASELINE);
}

// A big standalone version of the same wedge diagram drawn during the
// live question (see drawLiveAngleDiagram) - fixed at a chosen center/
// radius instead of tied to the ball's real position and camera zoom,
// since this is a review, not something happening on the course right
// now. Reveals the solved unknown angle in green instead of a "?",
// since the whole point here is showing what it resolves to.
function drawExplainDiagram(cx, cy, r, info) {
  var sum = info.type === 'WALL' ? 90 : 180;
  var known = info.known, correctAns = info.correctAnswer;
  push();
  translate(cx, cy);

  stroke(255, 255, 255, 220);
  strokeWeight(3);
  strokeCap(ROUND);
  line(-r * 1.15, 0, r * 1.15, 0);

  noStroke();
  fill(224, 160, 48, 150);
  arc(0, 0, r * 2, r * 2, -known, 0, PIE);
  fill(77, 255, 77, 130);
  arc(0, 0, r * 2, r * 2, -sum, -known, PIE);

  noFill();
  strokeWeight(5);
  stroke('#e0a030');
  arc(0, 0, r * 2, r * 2, -known, 0);
  stroke('#4dff4d');
  arc(0, 0, r * 2, r * 2, -sum, -known);

  if (sum === 90) {
    stroke(255, 255, 255, 230);
    strokeWeight(3);
    noFill();
    var m = r * 0.28;
    beginShape();
    vertex(m, 0); vertex(m, -m); vertex(0, -m);
    endShape();
  }

  noStroke();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  fill('#ffce6b');
  textSize(r * 0.19);
  var kMid = -known / 2;
  text(known + '°', cos(kMid) * r * 0.62, sin(kMid) * r * 0.62);
  fill('#4dff4d');
  textSize(r * 0.22);
  var uMid = -(known + sum) / 2;
  text(correctAns + '°', cos(uMid) * r * 0.65, sin(uMid) * r * 0.65);
  textStyle(NORMAL);
  pop();
}

var EXPLAIN_BOX_W = 600;
// Every y below is measured from the top of the box, spaced evenly so the box is
// only as tall as its content (algebra questions have one extra equation line).
function explainLayout() {
  var alg = !!(resolvedInfo && resolvedInfo.algebra);
  var diagR = 165, diagCY = 300;
  var eqY = diagCY + 54;
  var typedY = eqY + (alg ? 82 : 46);
  var btnY = typedY + 36;
  var boxH = btnY + EXPLAIN_BTN.h + 34;
  return { w: EXPLAIN_BOX_W, h: boxH, diagR: diagR, diagCY: diagCY, eqY: eqY, typedY: typedY, btnY: btnY };
}
var EXPLAIN_BTN = { w: 220, h: 56 };

// Opened the instant a typed answer turns out wrong (see submitAnswer,
// explainOpen). Rebuilds the exact question the player just faced as a
// large standalone diagram, states the rule in words, then walks the
// same arithmetic drawEquation shows a correct answer - so a miss
// teaches the rule instead of just penalizing it. Physics stays frozen
// (see the updatePhysics guard in gameDraw) until "Got It" is clicked.
function drawExplainModal() {
  if (!resolvedInfo) { explainOpen = false; return; }
  var L = explainLayout(), b = L;
  var bx = width / 2 - b.w / 2, by = height / 2 - b.h / 2;

  noStroke();
  fill(0, 0, 0, 195);
  rect(0, 0, width, height);

  fill(15, 22, 16, 250);
  rect(bx, by, b.w, b.h, 18);
  stroke(77, 255, 77, 130);
  strokeWeight(2);
  noFill();
  rect(bx, by, b.w, b.h, 18);

  var sum = resolvedInfo.type === 'WALL' ? 90 : 180;
  var relWord = resolvedInfo.type === 'WALL' ? 'complementary' : 'supplementary';

  noStroke();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  fill('#e63946');
  textSize(26);
  text('✗ Let’s Break This Down', width / 2, by + 44);
  textStyle(NORMAL);

  textSize(17);
  fill(206, 218, 206);
  text('These two angles are ' + relWord + ' - together they always', width / 2, by + 82);
  text('add up to ' + sum + '°.', width / 2, by + 106);

  drawExplainDiagram(width / 2, by + L.diagCY, L.diagR, resolvedInfo);

  var eqY = by + L.eqY;
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  if (resolvedInfo.algebra) {
    var alg = resolvedInfo.algebra;
    fill('#ffce6b');
    textSize(21);
    text(alg.a + '(' + alg.x + ') + ' + alg.b + ' = ' + resolvedInfo.known + '°', width / 2, eqY);
    fill('#4dff4d');
    textSize(25);
    text(sum + '° − ' + resolvedInfo.known + '° = ' + resolvedInfo.correctAnswer + '°', width / 2, eqY + 36);
  } else {
    fill('#4dff4d');
    textSize(28);
    text(sum + '° − ' + resolvedInfo.known + '° = ' + resolvedInfo.correctAnswer + '°', width / 2, eqY);
  }
  textStyle(NORMAL);

  if (resolvedInfo.typed !== null) {
    fill(230, 130, 130);
    textSize(15);
    text('You answered ' + resolvedInfo.typed + '° instead.', width / 2, by + L.typedY);
  }

  var btn = EXPLAIN_BTN, btnX = width / 2 - btn.w / 2, btnY = by + L.btnY;
  var waitMs = EXPLAIN_DELAY_MS - (millis() - explainOpenedAt);
  fill(waitMs > 0 ? '#5a6a5c' : '#3ea158');
  rect(btnX, btnY, btn.w, btn.h, 12);
  noStroke();
  fill(waitMs > 0 ? 200 : 255);
  textSize(19);
  textStyle(BOLD);
  text(waitMs > 0 ? 'Read this... ' + ceil(waitMs / 1000) : 'Got It', width / 2, btnY + btn.h / 2 + 1);
  textStyle(NORMAL);
}

function explainModalHit(mx, my) {
  var L = explainLayout(), b = L;
  var bx = width / 2 - b.w / 2, by = height / 2 - b.h / 2;
  var btn = EXPLAIN_BTN, btnX = width / 2 - btn.w / 2, btnY = by + L.btnY;
  return mx > btnX && mx < btnX + btn.w && my > btnY && my < btnY + btn.h;
}

// Small exit button, always in the bottom-left corner during play
// (any mode, any hole phase) - opens a confirm dialog rather than
// leaving immediately, so an accidental tap can't dump mid-round
// progress or a mid-question practice streak with no way back.
var EXIT_BTN = { x: 16, y: 640, w: 112, h: 42 };

function drawExitButton() {
  var b = EXIT_BTN;
  var hovered = mouseX > b.x && mouseX < b.x + b.w && mouseY > b.y && mouseY < b.y + b.h;
  noStroke();
  fill(0, 0, 0, hovered ? 190 : 150);
  rect(b.x, b.y, b.w, b.h, b.h / 2);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(16);
  textStyle(BOLD);
  text('☰ Menu', b.x + b.w / 2, b.y + b.h / 2 + 1);
  textStyle(NORMAL);
  textAlign(LEFT, BASELINE);
}

function exitButtonHit(mx, my) {
  var b = EXIT_BTN;
  return mx > b.x && mx < b.x + b.w && my > b.y && my < b.y + b.h;
}

var EXIT_CONFIRM_BOX = { w: 420, h: 224 };
var EXIT_CONFIRM_YES = { w: 140, h: 50 };
var EXIT_CONFIRM_NO = { w: 140, h: 50 };

function drawExitConfirm() {
  noStroke();
  fill(0, 0, 0, 175);
  rect(0, 0, width, height);

  var w = EXIT_CONFIRM_BOX.w, h = EXIT_CONFIRM_BOX.h, x = width / 2 - w / 2, y = height / 2 - h / 2;
  fill(19, 25, 19, 250);
  rect(x, y, w, h, 16);
  stroke(255, 255, 255, 40);
  strokeWeight(1.5);
  noFill();
  rect(x, y, w, h, 16);

  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(23);
  textStyle(BOLD);
  text('Exit to Main Menu?', width / 2, y + 52);
  textStyle(NORMAL);
  textSize(16);
  fill(200, 212, 200);
  text('This round will end and won’t be saved.', width / 2, y + 84);

  var by = y + h - 70, gap = 16;
  var noX = width / 2 - EXIT_CONFIRM_NO.w - gap / 2;
  var yesX = width / 2 + gap / 2;

  fill('rgba(60,80,60,0.9)');
  rect(noX, by, EXIT_CONFIRM_NO.w, EXIT_CONFIRM_NO.h, 10);
  fill('#c0392b');
  rect(yesX, by, EXIT_CONFIRM_YES.w, EXIT_CONFIRM_YES.h, 10);

  fill(255);
  textSize(18);
  textStyle(BOLD);
  text('Cancel', noX + EXIT_CONFIRM_NO.w / 2, by + EXIT_CONFIRM_NO.h / 2 + 1);
  text('Exit', yesX + EXIT_CONFIRM_YES.w / 2, by + EXIT_CONFIRM_YES.h / 2 + 1);
  textStyle(NORMAL);
}

function exitConfirmHit(mx, my) {
  var w = EXIT_CONFIRM_BOX.w, h = EXIT_CONFIRM_BOX.h, y = height / 2 - h / 2;
  var by = y + h - 70, gap = 16;
  var noX = width / 2 - EXIT_CONFIRM_NO.w - gap / 2;
  var yesX = width / 2 + gap / 2;
  if (mx > noX && mx < noX + EXIT_CONFIRM_NO.w && my > by && my < by + EXIT_CONFIRM_NO.h) return 'cancel';
  if (mx > yesX && mx < yesX + EXIT_CONFIRM_YES.w && my > by && my < by + EXIT_CONFIRM_YES.h) return 'exit';
  return null;
}

function drawHoleCompleteOverlay() {
  noStroke();
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);
  fill(15, 20, 15, 235);
  rect(width / 2 - 230, height / 2 - 122, 460, 244, 16);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(29);
  textStyle(BOLD);
  var rel = strokeCount - hole.par;
  var label = rel === 0 ? 'Par' : (rel < 0 ? (rel === -1 ? 'Birdie' : 'Eagle') : (rel === 1 ? 'Bogey' : 'Double Bogey+'));
  text('Hole ' + (holeIndex + 1) + ' complete!', width / 2, height / 2 - 66);
  textStyle(NORMAL);
  textSize(19);
  fill(200, 215, 200);
  text('Strokes: ' + strokeCount + ' (Par ' + hole.par + ') — ' + label, width / 2, height / 2 - 22);
  fill('#3ea158');
  rect(width / 2 - 100, height / 2 + 22, 200, 52, 12);
  fill(255);
  textSize(19);
  textStyle(BOLD);
  text(holeIndex + 1 < 9 ? 'Next Hole' : 'See Scorecard', width / 2, height / 2 + 48);
  textStyle(NORMAL);
}

function drawScorecard() {
  background(10, 14, 10);
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(36);
  textStyle(BOLD);
  text('Round Complete!', width / 2, 72);
  textStyle(NORMAL);
  textSize(17);
  fill(180, 195, 180);
  text(course.theme.icon + ' ' + course.theme.label + ' · ' + (gameMode === MODE_EASY ? 'Golf Gamer' : 'Hole-In-One Hero'), width / 2, 106);

  var totalStrokes = 0, par = 0;
  var startX = width / 2 - 306, y = 150, colW = 68;
  textAlign(CENTER, CENTER);
  for (var i = 0; i < 9; i++) {
    fill(20, 26, 20);
    rect(startX + i * colW, y, colW - 6, 104, 6);
    fill(160, 175, 160);
    textSize(14.5);
    text('Hole ' + (i + 1), startX + i * colW + (colW - 6) / 2, y + 18);
    fill(255);
    textSize(25);
    textStyle(BOLD);
    text(scorecard[i], startX + i * colW + (colW - 6) / 2, y + 52);
    textStyle(NORMAL);
    textSize(13.5);
    fill(140, 155, 140);
    text('par ' + course.holes[i].par, startX + i * colW + (colW - 6) / 2, y + 78);
    totalStrokes += scorecard[i];
    par += course.holes[i].par;
  }

  textSize(24);
  fill(255);
  textStyle(BOLD);
  var rel = totalStrokes - par;
  text('Total: ' + totalStrokes + ' strokes (' + (rel <= 0 ? rel : '+' + rel) + ' to par)', width / 2, 300);
  textStyle(NORMAL);

  fill('#3ea158');
  rect(width / 2 - 110, 344, 220, 54, 12);
  fill(255);
  textSize(20);
  textStyle(BOLD);
  text('Play Again', width / 2, 371);
  textStyle(NORMAL);
}

function scorecardHit(mx, my) {
  return mx > width / 2 - 110 && mx < width / 2 + 110 && my > 344 && my < 398;
}
