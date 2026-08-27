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
// Course data - Course 1: Classic Green (9 holes)
// Each hole plays inside the shared BOUND rectangle. `puzzleWall` is
// the wall shown in the bank-shot diagram; it is also a real physical
// wall like any other, drawn highlighted.
// ---------------------------------------------------------------
function buildClassicGreenCourse() {
  return {
    key: 'classicGreen', theme: THEMES.classicGreen,
    holes: [
      { par: 3, tee: { x: 120, y: 580 }, cup: { x: 580, y: 160 },
        walls: [{ x1: 330, y1: 130, x2: 480, y2: 320 }],
        puzzleWallIndex: 0, relationship: 'complementary', bushes: [], zones: [] },

      { par: 3, tee: { x: 580, y: 580 }, cup: { x: 130, y: 160 },
        walls: [{ x1: 240, y1: 230, x2: 410, y2: 160 }],
        puzzleWallIndex: 0, relationship: 'supplementary',
        bushes: [{ x: 400, y: 400, r: 26 }], zones: [] },

      { par: 4, tee: { x: 120, y: 600 }, cup: { x: 600, y: 150 },
        walls: [{ x1: 260, y1: 460, x2: 410, y2: 390 }],
        puzzleWallIndex: 0, relationship: 'complementary',
        bushes: [], zones: [{ type: 'hill', x: 320, y: 260, w: 160, h: 140, dirDeg: 55, strength: 0.045 }] },

      { par: 4, tee: { x: 600, y: 600 }, cup: { x: 110, y: 150 },
        walls: [{ x1: 470, y1: 300, x2: 560, y2: 420 }],
        puzzleWallIndex: 0, relationship: 'supplementary',
        bushes: [{ x: 440, y: 500, r: 28 }],
        zones: [{ type: 'water', x: 230, y: 240, w: 200, h: 120, dirDeg: 200, strength: 0.032 }] },

      { par: 4, tee: { x: 120, y: 610 }, cup: { x: 600, y: 610 },
        walls: [{ x1: 320, y1: 280, x2: 320, y2: 470 }],
        puzzleWallIndex: 0, relationship: 'complementary',
        bushes: [{ x: 420, y: 430, r: 24 }, { x: 470, y: 480, r: 20 }], zones: [] },

      { par: 4, tee: { x: 150, y: 150 }, cup: { x: 600, y: 600 },
        walls: [{ x1: 350, y1: 150, x2: 350, y2: 350 }, { x1: 350, y1: 350, x2: 590, y2: 350 }],
        puzzleWallIndex: 0, relationship: 'supplementary',
        bushes: [], zones: [{ type: 'hill', x: 480, y: 470, w: 130, h: 130, dirDeg: 230, strength: 0.04 }] },

      { par: 5, tee: { x: 100, y: 610 }, cup: { x: 600, y: 150 },
        walls: [{ x1: 250, y1: 170, x2: 420, y2: 120 }],
        puzzleWallIndex: 0, relationship: 'complementary',
        bushes: [{ x: 300, y: 250, r: 24 }, { x: 470, y: 440, r: 25 }],
        zones: [{ type: 'water', x: 150, y: 360, w: 470, h: 70, dirDeg: 90, strength: 0.028 }] },

      { par: 5, tee: { x: 600, y: 150 }, cup: { x: 100, y: 610 },
        walls: [{ x1: 450, y1: 240, x2: 560, y2: 390 }, { x1: 190, y1: 450, x2: 320, y2: 450 }, { x1: 190, y1: 540, x2: 320, y2: 540 }],
        puzzleWallIndex: 0, relationship: 'supplementary',
        bushes: [{ x: 300, y: 300, r: 22 }, { x: 340, y: 340, r: 20 }, { x: 280, y: 360, r: 18 }], zones: [] },

      { par: 5, tee: { x: 120, y: 150 }, cup: { x: 600, y: 610 },
        walls: [{ x1: 280, y1: 270, x2: 420, y2: 210 }, { x1: 480, y1: 480, x2: 600, y2: 420 }],
        puzzleWallIndex: 0, relationship: 'complementary',
        bushes: [{ x: 550, y: 340, r: 25 }],
        zones: [
          { type: 'hill', x: 200, y: 390, w: 150, h: 120, dirDeg: 140, strength: 0.038 },
          { type: 'water', x: 400, y: 190, w: 150, h: 100, dirDeg: 190, strength: 0.03 }
        ] }
    ]
  };
}

var COURSES = [buildClassicGreenCourse()];

// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------
var gameState = 'MENU';        // MENU | COURSE_INTRO | PLAYING | HOLE_COMPLETE | COURSE_COMPLETE
var holePhase = 'SOLVE';       // SOLVE | AIMING | ROLLING | SUNK | CHAOS
var gameMode = MODE_EASY;
var course = null;
var holeIndex = 0;             // 0-based
var hole = null;

var ball = { x: 0, y: 0, vx: 0, vy: 0 };
var strokeCount = 0;
var scorecard = [];            // strokes per hole this round

var question = null;           // { knownDisplay, knownValue, correctAnswer, relationship, algebra }
var answerText = '';
var answerLocked = false;      // once submitted, drag/aim is enabled
var answerWasCorrect = false;
var timerActive = false;
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
  pop();

  if (holePhase === 'SUNK' && sinkAnim >= 1 && gameState === 'PLAYING') {
    finishHole();
  }

  drawHUD();
  if (holePhase === 'SOLVE') drawSolvePanel();
  drawFeedbackToast();
  if (gameState === 'HOLE_COMPLETE') drawHoleCompleteOverlay();
}

// ---------------------------------------------------------------
// Menu
// ---------------------------------------------------------------
function drawMenu() {
  var g1 = color(20, 60, 30), g2 = color(10, 30, 16);
  for (var y = 0; y < height; y++) {
    stroke(lerpColor(g1, g2, y / height));
    line(0, y, width, y);
  }
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(42);
  textStyle(BOLD);
  fill(255, 255, 255);
  text('⛳ Bank Shot: Angle Golf', width / 2, 130);
  textStyle(NORMAL);
  textSize(16);
  fill(210, 225, 210);
  text('Solve the bank-shot angle, then drag from the ball to aim and strike.', width / 2, 172);

  drawModeCard(MODE_EASY, width / 2 - 190, 230, 'Golf Gamer', 'Easy',
    ['Angles ease in: multiples of 10, then 5, then any number.', 'No time pressure - work it out.'], '#3ea158');
  drawModeCard(MODE_HARD, width / 2 + 190, 230, 'Hole-In-One Hero', 'Hard',
    ['Any angle from hole 1, algebra by the back nine.', '10-second clock kicks in from hole 4 - miss it and the ball goes wild.'], '#c0392b');

  textSize(13);
  fill(160, 175, 160);
  text('9 holes per round · one random themed course each time you play', width / 2, 590);
}

function drawModeCard(mode, cx, cy, title, sub, lines, accent) {
  var w = 320, h = 300, x = cx - w / 2, y = cy;
  var hovered = mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
  noStroke();
  fill(20, 26, 20, 235);
  rect(x, y, w, h, 18);
  stroke(hovered ? accent : 'rgba(255,255,255,0.15)');
  strokeWeight(hovered ? 3 : 1.5);
  noFill();
  rect(x, y, w, h, 18);
  noStroke();
  fill(accent);
  textAlign(CENTER, CENTER);
  textSize(15);
  text(sub.toUpperCase(), cx, y + 34);
  fill(255);
  textSize(24);
  textStyle(BOLD);
  text(title, cx, y + 68);
  textStyle(NORMAL);
  textSize(13.5);
  fill(205, 215, 205);
  var ty = y + 112;
  for (var i = 0; i < lines.length; i++) {
    text(lines[i], cx, ty, w - 40);
    ty += 46;
  }
  fill(accent);
  rect(cx - 70, y + h - 56, 140, 40, 10);
  fill(255);
  textSize(16);
  textStyle(BOLD);
  text('Play', cx, y + h - 36);
  textStyle(NORMAL);
}

function menuHit(mx, my) {
  var cards = [
    { mode: MODE_EASY, cx: width / 2 - 190 },
    { mode: MODE_HARD, cx: width / 2 + 190 }
  ];
  for (var i = 0; i < cards.length; i++) {
    var x = cards[i].cx - 160, y = 230, w = 320, h = 300;
    if (mx > x && mx < x + w && my > y && my < y + h) return cards[i].mode;
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
  holePhase = 'SOLVE';
  answerText = '';
  answerLocked = false;
  question = generateQuestion(hole, gameMode, idx + 1);
  timerActive = question.timerOn;
  timerStart = millis();
}

function generateQuestion(h, mode, holeNum) {
  var relationship = h.relationship;
  var known, algebra = null;
  var timerOn = false;

  if (mode === MODE_EASY) {
    if (holeNum <= 3) known = 10 * floor(random(1, 8.999));
    else if (holeNum <= 6) { do { known = 5 * floor(random(1, 17.999)); } while (known % 10 === 0); }
    else known = floor(random(1, 89.999));
  } else {
    timerOn = holeNum >= 4;
    if (holeNum <= 6) known = floor(random(1, 89.999));
    else {
      var x = floor(random(2, 9.999));
      var a = floor(random(2, 5.999));
      var b = floor(random(1, 20.999));
      var val = a * x + b;
      while (val < 5 || val > 89) { b = floor(random(1, 20.999)); val = a * x + b; }
      known = val;
      algebra = { a: a, b: b, x: x };
    }
  }

  var correct = relationship === 'complementary' ? (90 - known) : (180 - known);
  return { known: known, relationship: relationship, correctAnswer: correct, algebra: algebra, timerOn: timerOn };
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
function drawHoleBackground() {
  var th = course.theme;
  noStroke();
  fill(th.rough);
  rect(0, 0, width, height);
  // fairway with mow stripes
  var stripeW = 34;
  for (var i = -1; i * stripeW < BOUND.w + BOUND.h; i++) {
    fill(i % 2 === 0 ? th.fairwayA : th.fairwayB);
    push();
    beginShape();
    var x0 = BOUND.x + i * stripeW;
    vertex(constrain(x0, BOUND.x, BOUND.x + BOUND.w), BOUND.y);
    vertex(constrain(x0 + stripeW, BOUND.x, BOUND.x + BOUND.w), BOUND.y);
    vertex(constrain(x0 + stripeW + BOUND.h, BOUND.x, BOUND.x + BOUND.w), BOUND.y + BOUND.h);
    vertex(constrain(x0 + BOUND.h, BOUND.x, BOUND.x + BOUND.w), BOUND.y + BOUND.h);
    endShape(CLOSE);
    pop();
  }
  noFill();
  stroke(255, 255, 255, 40);
  strokeWeight(2);
  rect(BOUND.x, BOUND.y, BOUND.w, BOUND.h, 6);
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
    var isPuzzle = i === hole.puzzleWallIndex;
    push();
    strokeCap(ROUND);
    stroke(0, 0, 0, 90);
    strokeWeight(13);
    line(w.x1, w.y1 + 4, w.x2, w.y2 + 4);
    stroke(isPuzzle ? '#e0a030' : th.wall);
    strokeWeight(11);
    line(w.x1, w.y1, w.x2, w.y2);
    stroke(isPuzzle ? '#ffce6b' : th.wallHi);
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
    }
    return;
  }

  // zone forces
  for (var i = 0; i < hole.zones.length; i++) {
    var z = hole.zones[i];
    if (ball.x > z.x && ball.x < z.x + z.w && ball.y > z.y && ball.y < z.y + z.h) {
      ball.vx += cos(z.dirDeg) * z.strength;
      ball.vy += sin(z.dirDeg) * z.strength;
    }
  }

  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.vx *= FRICTION;
  ball.vy *= FRICTION;

  collideWalls();
  collideBushes();
  checkHoleComplete();
}

function allWalls() {
  var w = hole.walls.slice();
  w.push({ x1: BOUND.x, y1: BOUND.y, x2: BOUND.x + BOUND.w, y2: BOUND.y });
  w.push({ x1: BOUND.x, y1: BOUND.y + BOUND.h, x2: BOUND.x + BOUND.w, y2: BOUND.y + BOUND.h });
  w.push({ x1: BOUND.x, y1: BOUND.y, x2: BOUND.x, y2: BOUND.y + BOUND.h });
  w.push({ x1: BOUND.x + BOUND.w, y1: BOUND.y, x2: BOUND.x + BOUND.w, y2: BOUND.y + BOUND.h });
  return w;
}

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
        ball.vx -= (1 + WALL_REST) * vn * nx;
        ball.vy -= (1 + WALL_REST) * vn * ny;
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
// Solve panel (bank-shot question)
// ---------------------------------------------------------------
function drawSolvePanel() {
  var w = 560, h = 190, x = width / 2 - w / 2, y = height - h - 14;
  noStroke();
  fill(15, 20, 15, 235);
  rect(x, y, w, h, 16);
  stroke(question.timerOn ? '#e63946' : '#3ea158');
  strokeWeight(2);
  noFill();
  rect(x, y, w, h, 16);
  noStroke();
  fill(255);
  textAlign(LEFT, TOP);
  textSize(15);
  textStyle(BOLD);
  var rel = question.relationship === 'complementary' ? 'Complementary (sum to 90°)' : 'Supplementary (sum to 180°)';
  text('Bank Shot Challenge — ' + rel, x + 24, y + 16);
  textStyle(NORMAL);
  textSize(14);
  fill(210, 220, 210);
  if (question.algebra) {
    var alg = question.algebra;
    text('The wall meets the green at (' + alg.a + 'x + ' + alg.b + ')°, and x = ' + alg.x + '.', x + 24, y + 44);
    text('First find that angle, then find its ' + question.relationship + ' partner.', x + 24, y + 64);
  } else {
    text('The wall meets the green at ' + question.known + '°.', x + 24, y + 44);
    text('What angle completes the ' + question.relationship + ' pair?', x + 24, y + 64);
  }

  // mini diagram
  drawAngleDiagram(x + w - 150, y + 100, 66, question);

  // answer box
  fill(0, 0, 0, 160);
  rect(x + 24, y + h - 54, 160, 40, 8);
  fill(255);
  textSize(20);
  textAlign(LEFT, CENTER);
  text((answerText.length ? answerText : '_') + '°', x + 36, y + h - 34);

  fill(answerText.length ? '#3ea158' : '#365a3d');
  rect(x + 196, y + h - 54, 90, 40, 8);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(15);
  textStyle(BOLD);
  text('Submit', x + 241, y + h - 34);
  textStyle(NORMAL);

  if (question.timerOn) {
    var remain = max(0, HERO_TIMER_SECONDS - (millis() - timerStart) / 1000);
    fill(remain < 3 ? '#e63946' : 255);
    textAlign(RIGHT, TOP);
    textSize(22);
    textStyle(BOLD);
    text(ceil(remain) + 's', x + w - 24, y + 16);
    textStyle(NORMAL);
    if (remain <= 0 && !answerLocked) {
      triggerTimeoutChaos();
    }
  }
  textAlign(LEFT, BASELINE);
}

function drawAngleDiagram(cx, cy, r, q) {
  push();
  translate(cx, cy);
  noFill();
  stroke(255, 255, 255, 90);
  strokeWeight(1.5);
  line(-r - 10, 0, r + 10, 0);
  var totalDeg = q.relationship === 'complementary' ? 90 : 180;
  var knownVal = q.algebra ? (q.algebra.a * q.algebra.x + q.algebra.b) : q.known;
  var knownEndAngle = -(knownVal);
  noFill();
  stroke('#e0a030');
  strokeWeight(3);
  arc(0, 0, r * 1.1, r * 1.1, knownEndAngle, 0);
  stroke('#5b8cff');
  arc(0, 0, r * 1.4, r * 1.4, -(totalDeg), knownEndAngle);
  if (totalDeg === 90) {
    noStroke();
    fill(255, 255, 255, 60);
    rect(-14, -14, 14, 14);
  }
  var kx = cos(-knownVal / 2) * (r * 0.65), ky = sin(-knownVal / 2) * (r * 0.65);
  noStroke();
  fill('#e0a030');
  textAlign(CENTER, CENTER);
  textSize(12);
  text(knownVal + '°', kx, ky);
  var midUnknown = -(knownVal + totalDeg) / 2;
  var ux = cos(midUnknown) * (r * 0.85), uy = sin(midUnknown) * (r * 0.85);
  fill('#8fb4ff');
  text('?', ux, uy);
  pop();
}

function handleAnswerKey(k) {
  if (holePhase !== 'SOLVE' || answerLocked) return;
  if (k === 'backspace') { answerText = answerText.slice(0, -1); return; }
  if (k === 'enter') { submitAnswer(); return; }
  if (answerText.length < 3) answerText += k;
}

function submitAnswer() {
  if (holePhase !== 'SOLVE' || answerLocked || answerText.length === 0) return;
  var typed = parseInt(answerText, 10);
  answerWasCorrect = typed === question.correctAnswer;
  question.typed = typed;
  answerLocked = true;
  holePhase = 'AIMING';
  playSound('click');
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
  if (gameState === 'PLAYING' && holePhase === 'SOLVE') {
    if (mouseY > height - 240) {
      var w = 560, h = 190, x = width / 2 - w / 2, y = height - h - 14;
      if (mouseX > x + 196 && mouseX < x + 286 && mouseY > y + h - 54 && mouseY < y + h - 14) submitAnswer();
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
  if (holePhase !== 'SOLVE') return false;
  if (key >= '0' && key <= '9') { handleAnswerKey(key); return false; }
  if (keyCode === BACKSPACE) { handleAnswerKey('backspace'); return false; }
  if (keyCode === ENTER || keyCode === RETURN) { handleAnswerKey('enter'); return false; }
  return true;
}

function mouseReleased() {
  if (!dragging) return;
  dragging = false;
  var dx = dragStart.x - dragNow.x, dy = dragStart.y - dragNow.y;
  var d = min(mag(dx, dy), MAX_DRAG);
  if (d < 8) return; // too short, not a real shot
  var aimAngle = atan2(dy, dx); // already in degrees - angleMode(DEGREES) is set
  var power = (d / MAX_DRAG) * MAX_LAUNCH_SPEED;

  preShotPos.x = ball.x; preShotPos.y = ball.y;
  var launchAngle = aimAngle;

  if (strokeCount === 0 && question) {
    if (answerWasCorrect) {
      showToast('Correct! Banking exactly where you aimed.', '#3ea158');
    } else {
      var error = constrain(question.typed - question.correctAnswer, -75, 75);
      launchAngle = aimAngle + error;
      showToast('Off by ' + abs(question.typed - question.correctAnswer) + '° — the shot banks wide!', '#e63946');
    }
  }

  ball.vx = cos(launchAngle) * power;
  ball.vy = sin(launchAngle) * power;
  holePhase = 'ROLLING';
  nextStroke();
  playSound('hit');
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
