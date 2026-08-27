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
var MIN_STOP_SPEED = 0.06;
var MAX_DRAG = 170;
var MAX_LAUNCH_SPEED = 15;
var WALL_REST = 0.8;
var BUSH_REST = 0.55;
var CUP_CAPTURE_SPEED = 4.6;
var HERO_TIMER_SECONDS = 10;
var CHAOS_SPEED_MULT = 2.3;

var MODE_EASY = 'EASY';
var MODE_HARD = 'HARD';

// ---------------------------------------------------------------
// Theme palettes (more themes get appended here as courses are added)
// ---------------------------------------------------------------
var THEMES = {
  classicGreen: {
    label: 'Classic Green',
    icon: '⛳',
    fairwayA: '#3ea158', fairwayB: '#379150',
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

function makeHole(par, points, widths, bushes, zones) {
  var corridor = buildCorridor(points, widths);
  return {
    par: par,
    tee: { x: points[0].x, y: points[0].y },
    cup: { x: points[points.length - 1].x, y: points[points.length - 1].y },
    walls: corridor.walls,
    fairwayLeft: corridor.left, fairwayRight: corridor.right,
    bushes: bushes || [], zones: zones || []
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
        [], []),

      makeHole(3, [{ x: 130, y: 610 }, { x: 130, y: 430 }, { x: 340, y: 430 }, { x: 340, y: 230 }, { x: 570, y: 230 }], 48,
        [{ x: 250, y: 430, r: 22 }], []),

      makeHole(3, [{ x: 130, y: 620 }, { x: 130, y: 160 }], 55,
        [], [{ type: 'hill', x: 90, y: 340, w: 90, h: 130, dirDeg: 20, strength: 0.04 }]),

      makeHole(4, [{ x: 590, y: 620 }, { x: 590, y: 390 }, { x: 300, y: 390 }, { x: 300, y: 160 }], 50,
        [{ x: 440, y: 500, r: 26 }],
        [{ type: 'water', x: 340, y: 320, w: 130, h: 100, dirDeg: 210, strength: 0.03 }]),

      makeHole(4, [{ x: 120, y: 620 }, { x: 120, y: 480 }, { x: 300, y: 480 }, { x: 300, y: 340 }, { x: 480, y: 340 }, { x: 480, y: 160 }], 46,
        [{ x: 300, y: 250, r: 22 }], []),

      makeHole(4, [{ x: 150, y: 610 }, { x: 400, y: 610 }, { x: 400, y: 340 }, { x: 400, y: 170 }], [50, 50, 50, 85],
        [{ x: 350, y: 175, r: 24 }, { x: 450, y: 175, r: 24 }],
        [{ type: 'hill', x: 340, y: 470, w: 120, h: 110, dirDeg: 250, strength: 0.035 }]),

      makeHole(5, [{ x: 100, y: 620 }, { x: 100, y: 400 }, { x: 350, y: 400 }, { x: 350, y: 170 }, { x: 580, y: 170 }], 50,
        [{ x: 470, y: 170, r: 22 }],
        [
          { type: 'hill', x: 60, y: 260, w: 90, h: 110, dirDeg: 40, strength: 0.035 },
          { type: 'water', x: 180, y: 360, w: 220, h: 60, dirDeg: 90, strength: 0.026 }
        ]),

      makeHole(5, [{ x: 590, y: 620 }, { x: 590, y: 450 }, { x: 370, y: 450 }, { x: 370, y: 270 }, { x: 550, y: 270 }, { x: 550, y: 150 }], 42,
        [{ x: 400, y: 350, r: 20 }, { x: 440, y: 380, r: 18 }, { x: 380, y: 400, r: 16 }], []),

      makeHole(5, [{ x: 120, y: 160 }, { x: 120, y: 350 }, { x: 300, y: 350 }, { x: 300, y: 540 }, { x: 490, y: 540 }, { x: 490, y: 300 }, { x: 600, y: 300 }], 48,
        [{ x: 560, y: 300, r: 24 }],
        [
          { type: 'hill', x: 200, y: 400, w: 120, h: 110, dirDeg: 130, strength: 0.035 },
          { type: 'water', x: 380, y: 400, w: 130, h: 90, dirDeg: 190, strength: 0.028 }
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

var feedbackToast = null;      // { text, color, until }
var chaosUntil = 0;
var chaosShakeMag = 0;
var preShotPos = { x: 0, y: 0 };
var sinkAnim = 0;              // 0..1

// ---------------------------------------------------------------
// Setup
// ---------------------------------------------------------------
function gameSetup() {
  textFont('-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif');
}

function gameDraw() {
  background(10, 14, 10);
  if (gameState === 'MENU') { drawMenu(); return; }
  if (gameState === 'COURSE_INTRO') { drawCourseIntro(); return; }
  if (gameState === 'COURSE_COMPLETE') { drawScorecard(); return; }

  // PLAYING / HOLE_COMPLETE both render the hole underneath
  push();
  if (millis() < chaosUntil) {
    translate(random(-chaosShakeMag, chaosShakeMag), random(-chaosShakeMag, chaosShakeMag));
  }
  drawHoleBackground();
  drawZones();
  drawWalls();
  drawBushes();
  drawCup();
  updatePhysics();
  drawBall();
  drawAimPreview();
  drawLiveAngleDiagram();
  pop();

  if (holePhase === 'SUNK' && sinkAnim >= 1 && gameState === 'PLAYING') {
    finishHole();
  }

  drawHUD();
  if (holePhase === 'QUESTION') drawQuestionOverlay();
  drawFeedbackToast();
  if (gameState === 'HOLE_COMPLETE') drawHoleCompleteOverlay();
}

// ---------------------------------------------------------------
// Menu
// ---------------------------------------------------------------
var MENU_HERO = { x: 56, y: 106, w: 588, h: 176 };
var MENU_CARD_W = 300, MENU_CARD_H = 248, MENU_CARD_Y = 306;

function drawMenu() {
  drawMenuBackground();

  noStroke();
  textAlign(CENTER, CENTER);
  fill(255);
  textStyle(BOLD);
  textSize(38);
  text('⛳ Bank Shot: Angle Golf', width / 2, 54);
  textStyle(NORMAL);
  textSize(14.5);
  fill(180, 200, 180);
  text('Solve the angle. Line up the shot. Sink the putt.', width / 2, 84);

  drawGolfHeroScene(MENU_HERO.x, MENU_HERO.y, MENU_HERO.w, MENU_HERO.h);

  drawModeCard(width / 2 - 12 - MENU_CARD_W, MENU_CARD_Y, 'Golf Gamer', 'EASY', '⛳',
    ['Angles ease in - 10s, then 5s,', 'then anything by hole 7.'], 'No clock. Take your time.', '#3ea158');
  drawModeCard(width / 2 + 12, MENU_CARD_Y, 'Hole-In-One Hero', 'HARD', '🔥',
    ['Any angle from hole 1 -', 'algebra by the back nine.'], '10s clock from hole 4. Miss it, ball goes wild.', '#e0562f');

  textAlign(CENTER, CENTER);
  textSize(12.5);
  fill(140, 155, 140);
  text('9 holes per round · a new random themed course every time you play', width / 2, MENU_CARD_Y + MENU_CARD_H + 26);
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
  var ready = GOLF_BALL_ANGLE + 2, back = -130, impact = GOLF_BALL_ANGLE, follow = GOLF_BALL_ANGLE + 34;
  if (t < 0.20) return lerp(ready, back, easeOutQuad(t / 0.20));
  if (t < GOLF_IMPACT_T) return lerp(back, impact, easeInQuad((t - 0.20) / (GOLF_IMPACT_T - 0.20)));
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
  ellipse(cx, y + 40, 46, 46);
  textAlign(CENTER, CENTER);
  textSize(20);
  text(icon, cx, y + 41);

  fill(red(color(accent)), green(color(accent)), blue(color(accent)), pulse);
  textSize(12.5);
  textStyle(BOLD);
  text(badge, cx, y + 76);

  fill(255);
  textSize(21);
  text(title, cx, y + 100);
  textStyle(NORMAL);

  fill(200, 212, 200);
  textSize(12.5);
  text(lines[0], cx, y + 128);
  text(lines[1], cx, y + 146);

  fill(accent);
  textSize(11.5);
  textStyle(BOLD);
  text(tagline, cx - (w - 44) / 2, y + 172, w - 44);
  textStyle(NORMAL);

  fill(accent);
  rect(cx - 66, y + h - 46, 132, 34, 9);
  fill(255);
  textSize(14.5);
  textStyle(BOLD);
  text('Play', cx, y + h - 29);
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
  textSize(18);
  fill(150, 200, 160);
  text((gameMode === MODE_EASY ? 'GOLF GAMER' : 'HOLE-IN-ONE HERO') + ' · TODAY’S COURSE', width / 2, height / 2 - 90);
  textSize(48);
  fill(255);
  textStyle(BOLD);
  text(course.theme.icon + ' ' + course.theme.label, width / 2, height / 2 - 30);
  textStyle(NORMAL);
  textSize(15);
  fill(200, 210, 200);
  text('9 holes · par ' + totalPar(), width / 2, height / 2 + 20);

  fill('#3ea158');
  rect(width / 2 - 90, height / 2 + 60, 180, 48, 12);
  fill(255);
  textSize(18);
  textStyle(BOLD);
  text('Tee Off', width / 2, height / 2 + 84);
  textStyle(NORMAL);
}

function totalPar() {
  var p = 0;
  for (var i = 0; i < course.holes.length; i++) p += course.holes[i].par;
  return p;
}

function introHit(mx, my) {
  var x = width / 2 - 90, y = height / 2 + 60, w = 180, h = 48;
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

function startHole(idx) {
  holeIndex = idx;
  hole = course.holes[idx];
  ball.x = hole.tee.x; ball.y = hole.tee.y; ball.vx = 0; ball.vy = 0;
  strokeCount = 0;
  sinkAnim = 0;
  gameState = 'PLAYING';
  holePhase = 'AIMING';
  pendingShot = null;
  answerText = '';
  answerLocked = false;
}

// Snaps a known angle to this hole's difficulty tier (round numbers
// ease in for Golf Gamer; Hole-In-One Hero is arbitrary from the start
// and wraps the value in an algebraic expression on the back three) -
// same progression as before, just now applied to a value that's
// either measured live off the player's own aim (the wall case) or
// generated fresh when there's no wall to measure (the straight case),
// via `rawKnown` being a real degrees value or null respectively.
function applyDifficultyTier(rawKnown, mode, holeNum, maxVal) {
  var known;
  var algebra = null;
  var timerOn = false;

  if (mode === MODE_EASY) {
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
      var x = floor(random(2, 9.999));
      var a = floor(random(2, 5.999));
      var b = known - a * x;
      if (b < 1 || a * x + b > maxVal - 1) b = floor(random(1, 6.999));
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

function raycastWalls(origin, dir, maxDist, walls) {
  var best = null;
  for (var i = 0; i < walls.length; i++) {
    var w = walls[i];
    var hit = raySegmentIntersect(origin, dir, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
    if (hit && hit.t > 6 && hit.t < maxDist && (!best || hit.t < best.t)) {
      best = { point: { x: origin.x + dir.x * hit.t, y: origin.y + dir.y * hit.t }, t: hit.t, wall: w };
    }
  }
  return best;
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

  var stopPoint = { x: origin.x + aimDir.x * maxDist, y: origin.y + aimDir.y * maxDist };
  var tier2 = applyDifficultyTier(null, gameMode, holeNum, 179);
  return {
    type: 'STRAIGHT', known: tier2.known, algebra: tier2.algebra, timerOn: tier2.timerOn,
    correctAnswer: 180 - tier2.known, point: stopPoint,
    triggerDist: maxDist * 0.6, aimDir: aimDir, power: power, applied: false
  };
}

function nextStroke() {
  strokeCount++;
}

function checkHoleComplete() {
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

  var left = hole.fairwayLeft, right = hole.fairwayRight;
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.moveTo(left[0].x, left[0].y);
  for (var i = 1; i < left.length; i++) drawingContext.lineTo(left[i].x, left[i].y);
  for (i = right.length - 1; i >= 0; i--) drawingContext.lineTo(right[i].x, right[i].y);
  drawingContext.closePath();
  drawingContext.clip();

  fill(th.fairwayB);
  rect(0, 0, width, height);
  var stripeW = 34;
  fill(th.fairwayA);
  for (i = -2; i * stripeW < width + height; i++) {
    if (i % 2 !== 0) continue;
    var x0 = i * stripeW;
    quad(x0, 0, x0 + stripeW, 0, x0 + stripeW + height, height, x0 + height, height);
  }

  // cup green: a lighter circular patch under the hole for a real
  // mini-golf "putting green" look
  fill(255, 255, 255, 22);
  ellipse(hole.cup.x, hole.cup.y, 130, 130);

  drawingContext.restore();
}

function drawZones() {
  var th = course.theme;
  for (var i = 0; i < hole.zones.length; i++) {
    var z = hole.zones[i];
    noStroke();
    if (z.type === 'hill') {
      var g = drawingContext.createLinearGradient(z.x, z.y, z.x + z.w * cos(z.dirDeg), z.y + z.h * sin(z.dirDeg));
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.28)');
      drawingContext.fillStyle = g;
      rect(z.x, z.y, z.w, z.h, 10);
      drawFlowArrows(z, 'rgba(255,255,255,0.55)');
    } else {
      fill(red(color(th.water)), green(color(th.water)), blue(color(th.water)), 190);
      rect(z.x, z.y, z.w, z.h, 10);
      var t = millis() / 500;
      stroke(255, 255, 255, 90);
      strokeWeight(1.5);
      noFill();
      for (var r = 0; r < 3; r++) {
        var rr = ((t + r * 12) % 36);
        ellipse(z.x + z.w / 2, z.y + z.h / 2, rr * 3, rr * 1.4);
      }
      noStroke();
      drawFlowArrows(z, 'rgba(255,255,255,0.85)');
    }
  }
}

function drawFlowArrows(z, col) {
  push();
  fill(col);
  var cols = max(2, floor(z.w / 60)), rows = max(1, floor(z.h / 60));
  for (var i = 0; i < cols; i++) {
    for (var j = 0; j < rows; j++) {
      var ax = z.x + (i + 0.5) * (z.w / cols);
      var ay = z.y + (j + 0.5) * (z.h / rows);
      push();
      translate(ax, ay);
      rotate(z.dirDeg);
      triangle(-6, -5, -6, 5, 6, 0);
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
  var h = hole.cup;
  noStroke();
  fill(0, 0, 0, 120);
  ellipse(h.x, h.y, CUP_R * 2.1, CUP_R * 1.2);
  fill(10, 10, 10);
  ellipse(h.x, h.y, CUP_R * 2, CUP_R * 1.7);
  fill(30, 30, 30);
  ellipse(h.x, h.y, CUP_R * 1.4, CUP_R * 1.1);
  // flag
  stroke(220);
  strokeWeight(2.5);
  line(h.x, h.y, h.x, h.y - 70);
  noStroke();
  var wave = sin(millis() / 130) * 4;
  fill('#e63946');
  triangle(h.x, h.y - 70, h.x + 26 + wave, h.y - 62, h.x, h.y - 54);
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

function drawAimPreview() {
  if (!dragging || holePhase !== 'AIMING') return;
  var dx = dragStart.x - dragNow.x, dy = dragStart.y - dragNow.y;
  var d = min(mag(dx, dy), MAX_DRAG);
  var ang = atan2(dy, dx);
  var ex = ball.x + cos(ang) * d * 1.6;
  var ey = ball.y + sin(ang) * d * 1.6;
  push();
  drawingContext.setLineDash([6, 8]);
  stroke(255, 255, 255, 200);
  strokeWeight(2.5);
  line(ball.x, ball.y, ex, ey);
  drawingContext.setLineDash([]);
  pop();
  var power = d / MAX_DRAG;
  noStroke();
  fill(lerpColor(color('#3ea158'), color('#e63946'), power));
  ellipse(ex, ey, 10, 10);

  // power meter
  var mx = BOUND.x + 10, my = BOUND.y - 26, mw = 160, mh = 10;
  fill(0, 0, 0, 150);
  rect(mx, my, mw, mh, 5);
  fill(lerpColor(color('#3ea158'), color('#e63946'), power));
  rect(mx, my, mw * power, mh, 5);
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
      pendingShot = null;
    }
    return;
  }

  // zone forces (once per frame - a gentle continuous field, no need
  // to apply per substep)
  for (var i = 0; i < hole.zones.length; i++) {
    var z = hole.zones[i];
    if (ball.x > z.x && ball.x < z.x + z.w && ball.y > z.y && ball.y < z.y + z.h) {
      ball.vx += cos(z.dirDeg) * z.strength;
      ball.vy += sin(z.dirDeg) * z.strength;
    }
  }

  // Move in substeps no bigger than roughly one ball radius. A single
  // big step (fast ball, shallow-angle wall) can have its one sampled
  // position land just past collision range on both sides of a thin
  // rail without ever coming within BALL_R of it mid-flight - classic
  // tunneling. Splitting the frame's movement into smaller hops and
  // resolving collisions after each one closes that gap.
  var steps = max(1, ceil(mag(ball.vx, ball.vy) / (BALL_R * 0.8)));
  for (var s = 0; s < steps; s++) {
    ball.x += ball.vx / steps;
    ball.y += ball.vy / steps;

    // Consume a pending STRAIGHT-shot resolution once the ball actually
    // reaches the real point the diagram was drawn at - a wrong answer
    // bends the path there by the player's own numeric error, same
    // "natural, logical consequence" rule as the wall case.
    if (pendingShot && pendingShot.type === 'STRAIGHT' && !pendingShot.applied && pendingShot.launchFrom) {
      var traveled = dist(ball.x, ball.y, pendingShot.launchFrom.x, pendingShot.launchFrom.y);
      if (traveled >= pendingShot.triggerDist) {
        pendingShot.applied = true;
        if (!pendingShot.correct) {
          var curSpeed = mag(ball.vx, ball.vy);
          var newAng = atan2(ball.vy, ball.vx) + pendingShot.bendDeg;
          ball.vx = cos(newAng) * curSpeed;
          ball.vy = sin(newAng) * curSpeed;
        }
      }
    }

    collideWalls();
    collideBushes();
  }

  ball.vx *= FRICTION;
  ball.vy *= FRICTION;
  checkHoleComplete();
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

function collideWalls() {
  var walls = allWalls();
  for (var i = 0; i < walls.length; i++) {
    var w = walls[i];
    var closest = closestPointOnSegment(ball.x, ball.y, w.x1, w.y1, w.x2, w.y2);
    var dx = ball.x - closest.x, dy = ball.y - closest.y;
    var d = mag(dx, dy);
    if (d < BALL_R && d > 0.0001) {
      var nx = dx / d, ny = dy / d;
      ball.x = closest.x + nx * BALL_R;
      ball.y = closest.y + ny * BALL_R;
      var vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) {
        var speedNow = mag(ball.vx, ball.vy);
        // Consume a pending WALL-shot resolution on the first real
        // contact against the SAME wall the diagram was drawn on - a
        // correct answer leaves at the true complementary angle, a
        // wrong one leaves at whatever angle the player actually typed.
        if (pendingShot && pendingShot.type === 'WALL' && !pendingShot.applied && pendingShot.wallRef === w) {
          var outDir = vNorm(vAdd(vScale(pendingShot.Wd, cos(pendingShot.resolvedAngle)), vScale(pendingShot.N, sin(pendingShot.resolvedAngle))));
          var newSpeed = speedNow * WALL_REST;
          ball.vx = outDir.x * newSpeed;
          ball.vy = outDir.y * newSpeed;
          pendingShot.applied = true;
        } else {
          ball.vx -= (1 + WALL_REST) * vn * nx;
          ball.vy -= (1 + WALL_REST) * vn * ny;
        }
        if (mag(ball.vx, ball.vy) > 1.5) playSound('bounce');
      }
    }
  }
}

function collideBushes() {
  for (var i = 0; i < hole.bushes.length; i++) {
    var b = hole.bushes[i];
    var dx = ball.x - b.x, dy = ball.y - b.y;
    var d = mag(dx, dy);
    var minD = b.r + BALL_R;
    if (d < minD && d > 0.0001) {
      var nx = dx / d, ny = dy / d;
      ball.x = b.x + nx * minD;
      ball.y = b.y + ny * minD;
      var vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) {
        ball.vx -= (1 + BUSH_REST) * vn * nx;
        ball.vy -= (1 + BUSH_REST) * vn * ny;
      }
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
  var r = 50;

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
  noFill();
  stroke(255, 255, 255, 150);
  strokeWeight(2);
  line(p.type === 'WALL' ? -14 : -r * 1.35, 0, r * 1.35, 0);

  var knownEnd = sweepSign * knownVal;
  var totalEnd = sweepSign * totalDeg;
  stroke('#e0a030');
  strokeWeight(3);
  arc(0, 0, r * 1.1, r * 1.1, min(0, knownEnd), max(0, knownEnd));
  stroke('#5b8cff');
  arc(0, 0, r * 1.55, r * 1.55, min(knownEnd, totalEnd), max(knownEnd, totalEnd));

  if (totalDeg === 90) {
    noStroke();
    fill(255, 255, 255, 70);
    beginShape();
    vertex(0, 0); vertex(15, 0); vertex(15, 15 * sweepSign); vertex(0, 15 * sweepSign);
    endShape(CLOSE);
  }

  noStroke();
  fill('#e0a030');
  textAlign(CENTER, CENTER);
  textSize(13);
  var kMid = knownEnd / 2;
  text(knownVal + '°', cos(kMid) * r * 0.7, sin(kMid) * r * 0.7);
  fill('#8fb4ff');
  var uMid = (knownEnd + totalEnd) / 2;
  text('?', cos(uMid) * r * 0.98, sin(uMid) * r * 0.98);
  pop();
}

function drawQuestionOverlay() {
  if (!pendingShot) return;
  var w = 560, h = 132, x = width / 2 - w / 2, y = height - h - 14;
  noStroke();
  fill(15, 20, 15, 235);
  rect(x, y, w, h, 16);
  stroke(pendingShot.timerOn ? '#e63946' : '#3ea158');
  strokeWeight(2);
  noFill();
  rect(x, y, w, h, 16);
  noStroke();
  fill(255);
  textAlign(LEFT, TOP);
  textSize(15);
  textStyle(BOLD);
  var isWall = pendingShot.type === 'WALL';
  text(isWall ? 'Bank Shot — Complementary (sum to 90°)' : 'Straight Shot — Supplementary (sum to 180°)', x + 24, y + 14);
  textStyle(NORMAL);
  textSize(13.5);
  fill(210, 220, 210);
  var relWord = isWall ? 'complementary' : 'supplementary';
  if (pendingShot.algebra) {
    var alg = pendingShot.algebra;
    text('The marked angle is (' + alg.a + 'x + ' + alg.b + ')°, and x = ' + alg.x + '.', x + 24, y + 40);
    text('Find that angle, then find its ' + relWord + ' partner.', x + 24, y + 58);
  } else {
    text('The marked angle is ' + pendingShot.known + '°.', x + 24, y + 40);
    text('What angle completes the ' + relWord + ' pair?', x + 24, y + 58);
  }

  fill(0, 0, 0, 160);
  rect(x + 24, y + h - 46, 160, 36, 8);
  fill(255);
  textSize(18);
  textAlign(LEFT, CENTER);
  text((answerText.length ? answerText : '_') + '°', x + 36, y + h - 28);

  fill(answerText.length ? '#3ea158' : '#365a3d');
  rect(x + 196, y + h - 46, 90, 36, 8);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(14);
  textStyle(BOLD);
  text('Submit', x + 241, y + h - 28);
  textStyle(NORMAL);

  if (pendingShot.timerOn) {
    var remain = max(0, HERO_TIMER_SECONDS - (millis() - timerStart) / 1000);
    fill(remain < 3 ? '#e63946' : 255);
    textAlign(RIGHT, TOP);
    textSize(20);
    textStyle(BOLD);
    text(ceil(remain) + 's', x + w - 24, y + 14);
    textStyle(NORMAL);
    if (remain <= 0 && !answerLocked) {
      triggerTimeoutChaos();
    }
  }
  textAlign(LEFT, BASELINE);
}

function handleAnswerKey(k) {
  if (holePhase !== 'QUESTION' || answerLocked) return;
  if (k === 'backspace') { answerText = answerText.slice(0, -1); return; }
  if (k === 'enter') { submitAnswer(); return; }
  if (answerText.length < 3) answerText += k;
}

// Resolving the answer is also the moment the shot actually launches -
// the ball has been frozen at the aim/power the player already chose
// while the question was live. Correct: leaves at the true angle
// (complementary/supplementary as shown). Wrong: leaves at whatever
// the player actually typed instead - a direct, logical consequence
// of their own number, not a generic penalty.
function submitAnswer() {
  if (holePhase !== 'QUESTION' || answerLocked || answerText.length === 0 || !pendingShot) return;
  var typed = parseInt(answerText, 10);
  var correct = typed === pendingShot.correctAnswer;
  pendingShot.typed = typed;
  pendingShot.launchFrom = { x: ball.x, y: ball.y };

  if (pendingShot.type === 'WALL') {
    pendingShot.resolvedAngle = correct ? pendingShot.correctAnswer : constrain(typed, 1, 179);
    showToast(correct ? 'Correct! That bank lines right up.' : 'Off by ' + abs(typed - pendingShot.correctAnswer) + '° — the bounce goes wide!', correct ? '#3ea158' : '#e63946');
  } else {
    pendingShot.correct = correct;
    if (!correct) pendingShot.bendDeg = constrain(typed - pendingShot.correctAnswer, -75, 75);
    showToast(correct ? 'Correct! Straight down the fairway.' : 'Off by ' + abs(typed - pendingShot.correctAnswer) + '° — the shot drifts off line!', correct ? '#3ea158' : '#e63946');
  }

  answerLocked = true;
  ball.vx = pendingShot.aimDir.x * pendingShot.power;
  ball.vy = pendingShot.aimDir.y * pendingShot.power;
  holePhase = 'ROLLING';
  nextStroke();
  playSound('hit');
}

// ---------------------------------------------------------------
// Aiming input
// ---------------------------------------------------------------
function mousePressed() {
  if (gameState === 'MENU') {
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
    if (mouseY > height - 160) {
      var w = 560, h = 132, x = width / 2 - w / 2, y = height - h - 14;
      if (mouseX > x + 196 && mouseX < x + 286 && mouseY > y + h - 46 && mouseY < y + h - 10) submitAnswer();
    }
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
function keyPressed() {
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

  pendingShot = classifyAndBuildShot(aimDir, power, holeIndex + 1);
  answerText = '';
  answerLocked = false;
  timerStart = millis();
  holePhase = 'QUESTION';
}

function showToast(text, col) {
  feedbackToast = { text: text, color: col, until: millis() + 2600 };
}

function drawFeedbackToast() {
  if (!feedbackToast || millis() > feedbackToast.until) return;
  var alpha = 255;
  var remain = feedbackToast.until - millis();
  if (remain < 400) alpha = map(remain, 0, 400, 0, 255);
  noStroke();
  fill(red(color(feedbackToast.color)), green(color(feedbackToast.color)), blue(color(feedbackToast.color)), alpha * 0.25);
  rectMode(CENTER);
  rect(width / 2, 66, 460, 40, 10);
  rectMode(CORNER);
  fill(255, 255, 255, alpha);
  textAlign(CENTER, CENTER);
  textSize(15);
  textStyle(BOLD);
  text(feedbackToast.text, width / 2, 66);
  textStyle(NORMAL);
}

// ---------------------------------------------------------------
// Hero-mode timeout chaos shot
// ---------------------------------------------------------------
function triggerTimeoutChaos() {
  answerLocked = true;
  pendingShot = null; // chaos bypasses the normal wall/straight resolution entirely
  holePhase = 'ROLLING';
  preShotPos.x = ball.x; preShotPos.y = ball.y;
  var toCup = atan2(hole.cup.y - ball.y, hole.cup.x - ball.x);
  var wildAngle = toCup + random(-40, 40);
  ball.vx = cos(wildAngle) * MAX_LAUNCH_SPEED * CHAOS_SPEED_MULT;
  ball.vy = sin(wildAngle) * MAX_LAUNCH_SPEED * CHAOS_SPEED_MULT;
  chaosUntil = millis() + 1400;
  chaosShakeMag = 5;
  nextStroke();
  playSound('chaos');
  showToast('Time’s up! That one got away from you...', '#e63946');

  setTimeout(function () {
    chaosShakeMag = 0;
    var away = atan2(preShotPos.y - hole.cup.y, preShotPos.x - hole.cup.x);
    var dist2 = random(25, 45);
    ball.x = preShotPos.x + cos(away) * dist2;
    ball.y = preShotPos.y + sin(away) * dist2;
    ball.vx = 0; ball.vy = 0;
    holePhase = 'AIMING';
  }, 1400);
}

// ---------------------------------------------------------------
// HUD / overlays
// ---------------------------------------------------------------
function drawHUD() {
  noStroke();
  fill(10, 14, 10, 220);
  rect(0, 0, width, 74);
  fill(255);
  textAlign(LEFT, CENTER);
  textSize(16);
  textStyle(BOLD);
  text(course.theme.icon + ' ' + course.theme.label, 20, 24);
  textStyle(NORMAL);
  textSize(13);
  fill(180, 195, 180);
  text('Hole ' + (holeIndex + 1) + ' / 9 · Par ' + hole.par, 20, 48);

  textAlign(RIGHT, CENTER);
  fill(255);
  textSize(16);
  textStyle(BOLD);
  text('Strokes: ' + strokeCount, width - 20, 24);
  textStyle(NORMAL);
  textSize(13);
  fill(180, 195, 180);
  text(gameMode === MODE_EASY ? 'Golf Gamer' : 'Hole-In-One Hero', width - 20, 48);
  textAlign(LEFT, BASELINE);
}

function drawHoleCompleteOverlay() {
  noStroke();
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);
  fill(15, 20, 15, 235);
  rect(width / 2 - 200, height / 2 - 110, 400, 220, 16);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(24);
  textStyle(BOLD);
  var rel = strokeCount - hole.par;
  var label = rel === 0 ? 'Par' : (rel < 0 ? (rel === -1 ? 'Birdie' : 'Eagle') : (rel === 1 ? 'Bogey' : 'Double Bogey+'));
  text('Hole ' + (holeIndex + 1) + ' complete!', width / 2, height / 2 - 60);
  textStyle(NORMAL);
  textSize(16);
  fill(200, 215, 200);
  text('Strokes: ' + strokeCount + ' (Par ' + hole.par + ') — ' + label, width / 2, height / 2 - 20);
  fill('#3ea158');
  rect(width / 2 - 90, height / 2 + 20, 180, 46, 10);
  fill(255);
  textSize(16);
  textStyle(BOLD);
  text(holeIndex + 1 < 9 ? 'Next Hole' : 'See Scorecard', width / 2, height / 2 + 43);
  textStyle(NORMAL);
}

function drawScorecard() {
  background(10, 14, 10);
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(30);
  textStyle(BOLD);
  text('Round Complete!', width / 2, 70);
  textStyle(NORMAL);
  textSize(14);
  fill(180, 195, 180);
  text(course.theme.icon + ' ' + course.theme.label + ' · ' + (gameMode === MODE_EASY ? 'Golf Gamer' : 'Hole-In-One Hero'), width / 2, 100);

  var totalStrokes = 0, par = 0;
  var startX = width / 2 - 270, y = 150, colW = 60;
  textAlign(CENTER, CENTER);
  for (var i = 0; i < 9; i++) {
    fill(20, 26, 20);
    rect(startX + i * colW, y, colW - 6, 90, 6);
    fill(160, 175, 160);
    textSize(12);
    text('Hole ' + (i + 1), startX + i * colW + (colW - 6) / 2, y + 16);
    fill(255);
    textSize(20);
    textStyle(BOLD);
    text(scorecard[i], startX + i * colW + (colW - 6) / 2, y + 44);
    textStyle(NORMAL);
    textSize(11);
    fill(140, 155, 140);
    text('par ' + course.holes[i].par, startX + i * colW + (colW - 6) / 2, y + 66);
    totalStrokes += scorecard[i];
    par += course.holes[i].par;
  }

  textSize(20);
  fill(255);
  textStyle(BOLD);
  var rel = totalStrokes - par;
  text('Total: ' + totalStrokes + ' strokes (' + (rel <= 0 ? rel : '+' + rel) + ' to par)', width / 2, 280);
  textStyle(NORMAL);

  fill('#3ea158');
  rect(width / 2 - 100, 330, 200, 48, 12);
  fill(255);
  textSize(17);
  textStyle(BOLD);
  text('Play Again', width / 2, 354);
  textStyle(NORMAL);
}

function scorecardHit(mx, my) {
  return mx > width / 2 - 100 && mx < width / 2 + 100 && my > 330 && my < 378;
}
