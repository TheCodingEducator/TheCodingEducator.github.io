function clippedRect(cx, cy, r, rx, ry, rw, rh, cArr) {
  fill(cArr[0], cArr[1], cArr[2]); noStroke();
  rect(rx, ry, rw, rh);
}

function clippedHStripes(cx, cy, r, colors) {
  var n = colors.length;
  var stripeH = (2 * r) / n;
  for (var i = 0; i < n; i++) {
    clippedRect(cx, cy, r, cx - r, cy - r + i * stripeH, 2 * r, stripeH, colors[i]);
  }
}

function clippedHStripesWeighted(cx, cy, r, colors, weights) {
  var total = 0;
  for (var k = 0; k < weights.length; k++) total += weights[k];
  var yAcc = cy - r;
  for (var i = 0; i < colors.length; i++) {
    var hgt = (weights[i] / total) * (2 * r);
    clippedRect(cx, cy, r, cx - r, yAcc, 2 * r, hgt, colors[i]);
    yAcc += hgt;
  }
}

function clippedVStripes(cx, cy, r, colors) {
  var n = colors.length;
  var stripeW = (2 * r) / n;
  for (var i = 0; i < n; i++) {
    clippedRect(cx, cy, r, cx - r + i * stripeW, cy - r, stripeW, 2 * r, colors[i]);
  }
}

function flagArgentina(cx, cy, r) {
  clippedHStripes(cx, cy, r, [[108, 166, 224], [255, 255, 255], [108, 166, 224]]);
  var rOuter = r * 0.42, rInner = r * 0.19;
  fill(247, 199, 47); noStroke();
  beginShape();
  for (var a = 0; a < 360; a += 30) {
    vertex(cx + cos(a) * rOuter, cy + sin(a) * rOuter);
    vertex(cx + cos(a + 15) * rInner, cy + sin(a + 15) * rInner);
  }
  endShape(CLOSE);
  fill(190, 130, 20); stroke(150, 100, 10); strokeWeight(0.5);
  ellipse(cx, cy, rInner * 1.7, rInner * 1.7);
}
function flagSpain(cx, cy, r) {
  clippedHStripesWeighted(cx, cy, r, [[170, 21, 27], [244, 196, 0], [170, 21, 27]], [1, 2, 1]);
  var sw = r * 0.36, sh = r * 0.68;
  var sx = cx - r * 0.32, sy = cy - sh / 2;
  fill(240, 240, 240); stroke(120, 90, 0); strokeWeight(0.6);
  rect(sx, sy, sw, sh * 0.65);
  triangle(sx, sy + sh * 0.65, sx + sw, sy + sh * 0.65, sx + sw / 2, sy + sh);
  noStroke(); fill(170, 21, 27);
  rect(sx + sw * 0.15, sy + sh * 0.08, sw * 0.3, sh * 0.22);
  fill(244, 196, 0);
  rect(sx + sw * 0.55, sy + sh * 0.08, sw * 0.3, sh * 0.22);
}
function flagFrance(cx, cy, r) {
  clippedVStripes(cx, cy, r, [[0, 35, 149], [255, 255, 255], [237, 41, 57]]);
}
function flagArmenia(cx, cy, r) {
  clippedHStripes(cx, cy, r, [[213, 43, 30], [0, 51, 160], [242, 168, 30]]);
}
function flagBrazil(cx, cy, r) {
  clippedHStripes(cx, cy, r, [[0, 151, 57]]);
  fill(254, 221, 0);
  beginShape();
  vertex(cx, cy - r * 0.78);
  vertex(cx + r * 0.86, cy);
  vertex(cx, cy + r * 0.78);
  vertex(cx - r * 0.86, cy);
  endShape(CLOSE);
  fill(0, 39, 118);
  ellipse(cx, cy, r * 0.7, r * 0.7);
  noFill(); stroke(255, 255, 255); strokeWeight(1.1);
  arc(cx, cy + r * 0.03, r * 0.58, r * 0.58, 200, 340);
  noStroke(); fill(255, 255, 255);
  ellipse(cx - r * 0.12, cy - r * 0.13, 1.3, 1.3);
  ellipse(cx + r * 0.1, cy - r * 0.11, 1.3, 1.3);
  ellipse(cx, cy + r * 0.17, 1.3, 1.3);
}
function flagEngland(cx, cy, r) {
  clippedHStripes(cx, cy, r, [[255, 255, 255]]);
  clippedRect(cx, cy, r, cx - r, cy - r * 0.15, 2 * r, r * 0.3, [206, 17, 38]);
  clippedRect(cx, cy, r, cx - r * 0.15, cy - r, r * 0.3, 2 * r, [206, 17, 38]);
}
function flagGermany(cx, cy, r) {
  clippedHStripes(cx, cy, r, [[0, 0, 0], [221, 0, 0], [255, 206, 0]]);
}
function flagMexico(cx, cy, r) {
  clippedVStripes(cx, cy, r, [[0, 104, 71], [255, 255, 255], [206, 17, 38]]);
  noStroke();

  // Wings (spread, dark brown)
  fill(72, 46, 18);
  beginShape();
    vertex(cx - r*0.04, cy - r*0.14);
    vertex(cx - r*0.38, cy - r*0.28);
    vertex(cx - r*0.36, cy - r*0.06);
    vertex(cx - r*0.14, cy + r*0.06);
    vertex(cx - r*0.04, cy + r*0.04);
  endShape(CLOSE);
  beginShape();
    vertex(cx + r*0.04, cy - r*0.14);
    vertex(cx + r*0.38, cy - r*0.24);
    vertex(cx + r*0.36, cy - r*0.04);
    vertex(cx + r*0.14, cy + r*0.06);
    vertex(cx + r*0.04, cy + r*0.04);
  endShape(CLOSE);

  // Eagle body
  fill(101, 68, 33);
  ellipse(cx, cy - r*0.06, r*0.2, r*0.28);

  // Eagle head profile facing left
  ellipse(cx - r*0.05, cy - r*0.26, r*0.17, r*0.17);

  // Golden hooked beak
  fill(210, 160, 20);
  triangle(cx - r*0.12, cy - r*0.28,
           cx - r*0.23, cy - r*0.23,
           cx - r*0.12, cy - r*0.21);

  // Snake in beak (wavy green line hanging down-left)
  stroke(20, 150, 50); strokeWeight(max(1, r * 0.055));
  line(cx - r*0.22, cy - r*0.22,  cx - r*0.30, cy - r*0.10);
  line(cx - r*0.30, cy - r*0.10,  cx - r*0.20, cy + r*0.02);
  line(cx - r*0.20, cy + r*0.02,  cx - r*0.28, cy + r*0.12);
  noStroke();

  // Cactus nopal paddles
  fill(0, 128, 54);
  ellipse(cx, cy + r*0.22, r*0.13, r*0.22);
  ellipse(cx - r*0.12, cy + r*0.13, r*0.10, r*0.15);
  ellipse(cx + r*0.12, cy + r*0.13, r*0.10, r*0.15);

  // Rock / island base
  fill(110, 88, 55);
  ellipse(cx, cy + r*0.38, r*0.30, r*0.10);
}

var countries = [
  { name: "Argentina", code: "ARG", flag: flagArgentina, color: [108, 166, 224] },
  { name: "Spain",     code: "ESP", flag: flagSpain,     color: [244, 196, 0] },
  { name: "France",    code: "FRA", flag: flagFrance,    color: [0, 35, 149] },
  { name: "Armenia",   code: "ARM", flag: flagArmenia,   color: [213, 43, 30] },
  { name: "Brazil",    code: "BRA", flag: flagBrazil,    color: [102, 204, 102] },
  { name: "England",   code: "ENG", flag: flagEngland,   color: [255, 255, 255] },
  { name: "Germany",   code: "GER", flag: flagGermany,   color: [0, 0, 0] },
  { name: "Mexico",    code: "MEX", flag: flagMexico,    color: [0, 90, 40] }
];

function drawSwatch(countryIdx, x, y, w, h) {
  countries[countryIdx].flag(x + w / 2, y + h / 2, min(w, h) / 2);
}
var confettiColors = [
  { r: 220, g: 40, b: 40 }, { r: 40, g: 110, b: 230 }, { r: 235, g: 200, b: 30 },
  { r: 40, g: 175, b: 70 }, { r: 235, g: 130, b: 20 }, { r: 170, g: 50, b: 210 }
];
var teamAIdx = 3;
var teamBIdx = 2;
var colorWarnTimer = 0;

var mainMode = "proportional";
var subMode = "easy";

var screenState = "menu";
var prevMouse = false;

var scoreA = 0, scoreB = 0;
var attackingTeam = "A";
var passCount = 0;
var gameClockSeconds = 0;
var GAME_END_SECONDS = 90 * 60;
var GOAL_LIMIT = 3;
// Tournament state
var tournamentMode = false;
var tSeeds = [];
var tRound = 0;
var tQFWin = [-1, -1, -1, -1];
var tSFWin = [-1, -1];
var bracketTimer = 0;
var bracketAutoStart = true;
var enemyAnimTimer = 0, enemyAnimDuration = 300;
var enemyDispT = [], enemyTargetT = [], enemyDispO = [], enemyTargetO = [];
var enemyRetargetTimerT = [], enemyRetargetIntervalT = [];
var enemyRetargetTimerO = [], enemyRetargetIntervalO = [], enemyJitterO = [];
var enemySpeedT = [], enemySpeedTargetT = [], enemySpeedTimerT = [], enemyEaseT = [];
var enemySpeedO = [], enemySpeedTargetO = [], enemySpeedTimerO = [], enemyEaseO = [];
var enemyHolderIdx = 0, enemyReceiverIdx = 1, enemyPhase = "dribble";
var enemyPhaseTimer = 0, enemyPhaseDuration = 30;
var enemyWasCross = false;
var enemyDribbleIntentX = 0, enemyDribbleIntentY = 0;

var enemyPossessionScores = false;
var enemyPassFromX = 0, enemyPassFromY = 0;
var enemyResolving = false;
var enemyShotStartX = 0, enemyShotStartY = 0, enemyShotEndX = 0, enemyShotEndY = 5;
var enemyShotTimer = 0, enemyShotDuration = 30, enemyShotSaved = false, enemyShotPower = 0;
var enemySaveTimer = 0, enemySaveDuration = 26, enemySaveFromX = 0, enemySaveFromY = 0;
var enemyShotBallX = 0, enemyShotBallY = 0;
var enemyInterceptorIdx = 0;
var enemyInterceptFromX = 0, enemyInterceptFromY = 0, enemyInterceptToX = 0, enemyInterceptToY = 0;
var enemyInterceptX = 0, enemyInterceptY = 0;
var enemyInterceptTimer = 0, enemyInterceptDuration = 20;
var enemyClearTimer = 0, enemyClearDuration = 16;
var enemyClearFromX = 0, enemyClearFromY = 0, enemyClearToX = 0, enemyClearToY = 0;
var enemyClearDefFromX = 0, enemyClearDefFromY = 0;

var ballB = 0;
var teammates = [];
var opponents = [];
var goalGapX = 0;
var goalieX = 0;
var target = null;

var mNumSign = 1, mNumDigit = "", mDenDigit = "";
var bBuf = "", activeField = "mNum";

var feedbackTimer = 0, feedbackText = "", feedbackScene = "scene";
var particles = [];
var wcConfetti = [];
var screenFlash = 0;
var celebrateTimer = 0;
var celebrateText = "";

var celebrateSnapshot = null;
var celebrateBoxW = 0;

var FY1 = 48;
var GY_MIN = -4, GY_MAX = 4;
var GX_MIN = -6, GX_MAX = 6;
var UNIT_PX = (276 - FY1) / (GY_MAX - GY_MIN);
var FX1 = 200 - (UNIT_PX * (GX_MAX - GX_MIN)) / 2;
var FX2 = FX1 + UNIT_PX * (GX_MAX - GX_MIN);
var FIELD_Y0 = FY1 + UNIT_PX * (GY_MAX - GY_MIN);
var FY2 = FIELD_Y0 + 20;

var PLAYER_Y_CAP = GY_MAX - 1;
var highlightRow = 1;
var BALL_RADIUS_GRID = 0.22;

var EQ_LABEL_W_READY = false;
var YEQ_W = 0, XPLUS_W = 0, SIGN_BTN_W = 0;
function ensureEquationLabelWidths() {
  if (EQ_LABEL_W_READY) return;
  textSize(18);
  YEQ_W = textWidth("y =");
  XPLUS_W = textWidth("x +");
  textSize(28 * 0.42);
  SIGN_BTN_W = max(textWidth("MAKE POSITIVE"), textWidth("MAKE NEGATIVE")) + 16;
  EQ_LABEL_W_READY = true;
}

var fieldGridReady = false;
var FIELD_XB = [], FIELD_YB = [];
function ensureFieldGrid() {
  if (fieldGridReady) return;
  for (var fxi = GX_MIN; fxi <= GX_MAX; fxi++) FIELD_XB.push(gridSX(fxi));
  for (var fyi = GY_MIN; fyi <= GY_MAX; fyi++) FIELD_YB.push(gridSY(fyi));
  fieldGridReady = true;
}

var oldTeammates = [], oldOpponents = [], oldGoalieX = 0, oldBallB = 0;
var pendingTeammates = [], pendingOpponents = [], pendingGoalGapX = 0, pendingGoalieX = 0, pendingBallB = 0;
var animTimer = 0, animDuration = 36;

var breakawayTimer = 0, breakawayDuration = 40;
var breakawayStartX = 0, breakawayStartY = 0, breakawayEndX = 0, breakawayEndY = 0;
var breakawayDefStartX = 0, breakawayDefStartY = 0;
var breakawayDefX = 0, breakawayDefY = 0;
var breakawayKeeperStartX = 0, breakawayKeeperTargetX = 0;
var breakawaySwerveOffset = 0;
var breakawayReceiverIdx = 0, breakawayScroll = 0;

var otherDispT = [], otherStartT = [], otherTargetT = [];
var otherDispO = [], otherStartO = [], otherTargetO = [];

var kickM = 1, kickB = 0, kickStopX = 0, kickEndY = 0, kickVertical = false, kickIsGood = false, kickIsGoal = false, kickMsg = "";
var kickTimer = 0, kickDuration = 22;

var revealLineTimer = 0, revealLineDuration = 30;

var dribX = 0, dribY = 1.2;
var aimTimer = 0, aimAngle = 0, shotAimAngle = 0, shotAimX = 0;
var powerTimer = 0, powerFrac = 0, shotPower = 0;
var keeperX = 0;
var shootStartX = 0, shootStartY = 0, shootEndX = 0, shootEndY = 5;
var shootFlightTimer = 0, shootFlightDuration = 30;
var shootOutcomeDecided = false;
var shootWasSaved = false;
var screenShakeTimer = 0;
var postHitTimer = 0, postHitDuration = 30, postHitX = 0;
var saveTimer = 0, saveDuration = 30, saveX = 0, saveY = 0, savePower = 0;
var blockTimer = 0, blockDuration = 30, blockX = 0, blockY = 0, blockDirX = 1;
var enemyPostHitTimer = 0, enemyPostHitDuration = 30, enemyPostHitX = 0;

function gridSX(gx) { return map(gx, GX_MIN, GX_MAX, FX1, FX2); }
function gridSY(gy) { return map(gy, GY_MIN, GY_MAX, FIELD_Y0, FY1); }

function drawFieldClippedLine(m, b, vertical) {
  if (vertical) {
    line(gridSX(0), gridSY(GY_MIN), gridSX(0), gridSY(GY_MAX));
    return;
  }
  var xa, xb;
  if (m === 0) {
    if (b < GY_MIN || b > GY_MAX) return;
    xa = GX_MIN; xb = GX_MAX;
  } else {
    var xAtYMin = (GY_MIN - b) / m;
    var xAtYMax = (GY_MAX - b) / m;
    var lo = min(xAtYMin, xAtYMax);
    var hi = max(xAtYMin, xAtYMax);
    xa = max(GX_MIN, lo);
    xb = min(GX_MAX, hi);
    if (xa > xb) return;
  }
  line(gridSX(xa), gridSY(m * xa + b), gridSX(xb), gridSY(m * xb + b));
}

function randInt(lo, hi) { return floor(random(lo, hi + 1)); }

// tappedX/Y: p5's own mouseClicked() callback (which it fires for both
// real mouse clicks AND taps, on every platform, without needing any
// manual touch-event bookkeeping of our own -- the previous attempt at
// hand-rolling touchStarted/touchMoved/touchEnded ended up fighting
// whatever click handling Code.org's own runtime already does, which is
// why taps were registering as hover but never as an actual click).
var tappedX = null, tappedY = null;
var keyTapped = false;
function mouseClicked() {
  tappedX = mouseX; tappedY = mouseY;
}
function keyPressed() {
  if (keyCode === 13 || keyCode === 32) keyTapped = true;
}

// Driven entirely by mouseClicked() (set in tappedX/Y below) -- it's the
// one event p5 fires exactly once per completed click/tap on every
// platform. Checking the raw mouseIsPressed press-edge here too (as a
// second, independent path) double-counted a single real mouse click --
// once on press, once again on release when mouseClicked() also fired --
// which silently toggled things back off again.
function wasClicked(x, y, w, h) {
  return tappedX !== null && tappedX > x && tappedX < x + w && tappedY > y && tappedY < y + h;
}

// Only blocks the page's default touch behavior (scrolling, pinch-zoom,
// tap-and-hold callouts) on the canvas -- doesn't touch mouseIsPressed/
// mouseX/mouseY at all, leaving that entirely to the platform's own
// (already-working) touch-to-mouse simulation.
function touchStarted() { return false; }
function touchMoved() { return false; }
function touchEnded() { return false; }

function pointSegDist(px, py, ax, ay, bx, by) {
  var dx = bx - ax, dy = by - ay;
  var lenSq = dx * dx + dy * dy;
  var t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
  t = max(0, min(1, t));
  var cx = ax + t * dx, cy = ay + t * dy;
  return dist(px, py, cx, cy);
}

function drawFlag(countryIdx, cx, cy, d) {
  countries[countryIdx].flag(cx, cy, d / 2);
}

function drawSolidBtn(x, y, w, h, lbl, col) {
  fill(col.r, col.g, col.b); stroke(255); strokeWeight(2);
  rect(x, y, w, h, 5);
  fill(255); noStroke();
  textSize(h * 0.42); textAlign(CENTER);
  text(lbl, x + w / 2, y + h * 0.68);
}

function drawBtn(x, y, w, h, lbl, col) {
  var over = mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
  fill(over ? 255 : col.r, over ? 255 : col.g, over ? 255 : col.b);
  stroke(over ? col.r : 255, over ? col.g : 255, over ? col.b : 255);
  strokeWeight(2);
  rect(x, y, w, h, 5);
  fill(over ? col.r : 255, over ? col.g : 255, over ? col.b : 255);
  noStroke();
  textSize(h * 0.42);
  textAlign(CENTER);
  text(lbl, x + w / 2, y + h * 0.68);
}
function col(r, g, b) { return { r: r, g: g, b: b }; }

function goalUnlocked() { return passCount >= 1; }

function liveView() { return subMode === "easy"; }
function vsComputer() { return subMode !== "2player"; }

function drawSectionBox(x, y, w, h, label) {
  noFill(); stroke(70, 80, 130); strokeWeight(1.5);
  rect(x, y, w, h, 8);
  textSize(9);
  var tw = textWidth(label) + 10;
  fill(8, 10, 30); noStroke();
  rect(x + 10, y - 6, tw, 12);
  fill(255, 220, 40); textAlign(LEFT);
  text(label, x + 15, y + 2);
}

function drawMenuScreen() {
  background(8, 10, 30);

  fill(255, 220, 40); textSize(15); textAlign(CENTER);
  text("LINEAR WORLD CUP", 200, 16);
  fill(120, 220, 255); textSize(10);
  text("RISE, RUN, REPEAT", 200, 30);

  drawSectionBox(20, 44, 360, 54, "STEP 1: MATH MODE");
  drawBtn(32,  58, 162, 30, "PROPORTIONAL (b=0)", mainMode === "proportional" ? col(20,130,20) : col(55,55,65));
  drawBtn(206, 58, 162, 30, "NON-PROPORTIONAL", mainMode === "nonproportional" ? col(20,130,20) : col(55,55,65));
  if (wasClicked(32, 58, 162, 30)) mainMode = "proportional";
  if (wasClicked(206, 58, 162, 30)) mainMode = "nonproportional";

  drawSectionBox(20, 110, 360, 68, "STEP 2: SUPPORT LEVEL");
  drawBtn(30,  124, 110, 30, "EASY", subMode === "easy" ? col(20,90,170) : col(55,55,65));
  drawBtn(146, 124, 108, 30, "HARD", subMode === "hard" ? col(20,90,170) : col(55,55,65));
  drawBtn(260, 124, 110, 30, "2-PLAYER", subMode === "2player" ? col(20,90,170) : col(55,55,65));
  if (wasClicked(30, 124, 110, 30)) subMode = "easy";
  if (wasClicked(146, 124, 108, 30)) subMode = "hard";
  if (wasClicked(260, 124, 110, 30)) subMode = "2player";
  fill(170); noStroke(); textSize(7); textAlign(CENTER);
  text("EASY: shows a live pass preview.  HARD: same boxes, no preview.  2P: take turns vs a friend.", 200, 168);

  drawSectionBox(20, 188, 360, 134, "STEP 3: TEAM FLAGS  (no repeats)");
  fill(210); noStroke(); textSize(9); textAlign(LEFT);
  text((subMode === "2player" ? "PLAYER 1: " : "YOU: ") + countries[teamAIdx].name, 30, 208);
  drawColorRow(216, teamAIdx, true);

  fill(210); noStroke(); textSize(9); textAlign(LEFT);
  text((vsComputer() ? "COMPUTER: " : "PLAYER 2: ") + countries[teamBIdx].name, 30, 258);
  drawColorRow(266, teamBIdx, false);

  if (colorWarnTimer > 0) {
    colorWarnTimer--;
    fill(255, 90, 90); textSize(9); textAlign(CENTER);
    text("Teams can't use the same flag!", 200, 312);
  }

  var ready = mainMode && subMode;
  drawBtn(16, 332, 168, 40, ready ? "KICK OFF!" : "PICK MODES FIRST", ready ? col(210, 140, 0) : col(70, 70, 70));
  if (ready && (wasClicked(16, 332, 168, 40) || keyTapped)) startMatch();
  var tourReady = ready && subMode !== "2player";
  drawBtn(216, 332, 168, 40, "TOURNAMENT", tourReady ? col(30, 80, 180) : col(50, 50, 60));
  if (tourReady && wasClicked(216, 332, 168, 40)) startTournament();
}

function drawColorRow(y, currentIdx, isTeamA) {
  var d = 24, gap = 6;
  var totalW = countries.length * (d + gap) - gap;
  var startX = 200 - totalW / 2;
  var order = [];
  for (var j = 0; j < countries.length; j++) order.push(j);
  order.sort(function(a, b) { return countries[a].name < countries[b].name ? -1 : 1; });
  for (var i = 0; i < order.length; i++) {
    var ci = order[i];
    var x = startX + i * (d + gap);
    var selected = (ci === currentIdx);
    drawSwatch(ci, x, y, d, d);
    if (!selected) {
      fill(0, 0, 0, 140); noStroke();
      rect(x, y, d, d);
    }
    noFill(); stroke(selected ? 255 : 90); strokeWeight(selected ? 3 : 1);
    rect(x, y, d, d);
    if (wasClicked(x, y, d, d)) {
      var otherIdx = isTeamA ? teamBIdx : teamAIdx;
      if (ci === otherIdx) {
        colorWarnTimer = 70;
      } else {
        if (isTeamA) teamAIdx = ci; else teamBIdx = ci;
      }
    }
  }
}

function positionOccupied(arr, x, y) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].x === x && arr[i].y === y) return true;
  }
  return false;
}

function minPlayerX() {
  return subMode === "hard" ? GX_MIN + 1 : GX_MIN;
}

function pickTeammatePosition(taken, isNorth) {
  var x, y, tries = 0;
  do {
    x = randInt(minPlayerX(), GX_MAX);
    y = isNorth ? randInt(1, PLAYER_Y_CAP) : randInt(GY_MIN, -1);
    tries++;
  } while (positionOccupied(taken, x, y) && tries < 40);
  return { x: x, y: y };
}

function sharesLinePath(pos, others, forB) {
  for (var k = 0; k < others.length; k++) {
    if ((pos.y - forB) * others[k].x === (others[k].y - forB) * pos.x) return true;
  }
  return false;
}

function buildFormation(forB) {
  var taken = [{ x: 0, y: forB }];

  var southIdx = randInt(0, 2);
  var tms = [];
  for (var i = 0; i < 3; i++) {
    var pos;
    var lineTries = 0;
    do {
      pos = pickTeammatePosition(taken, i !== southIdx);
      lineTries++;
    } while (lineTries < 30 && sharesLinePath(pos, tms, forB));
    taken.push(pos);
    tms.push(pos);
  }

  // Each defender marks one teammate by standing within 1 unit of them in
  // any direction (not just due north of them anymore) -- still never
  // placed exactly on the ball-to-teammate pass lane, and never on top of
  // another player.
  var opp = [];
  for (var j = 0; j < 3; j++) {
    var marked = tms[j];
    var offsets = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    for (var s = offsets.length - 1; s > 0; s--) {
      var sw = randInt(0, s);
      var tmpOff = offsets[s]; offsets[s] = offsets[sw]; offsets[sw] = tmpOff;
    }
    var placed = null;
    for (var oi = 0; oi < offsets.length; oi++) {
      var cx = constrain(marked.x + offsets[oi][0], minPlayerX(), GX_MAX);
      var cy = constrain(marked.y + offsets[oi][1], GY_MIN, PLAYER_Y_CAP);
      if (positionOccupied(taken, cx, cy)) continue;
      if (pointSegDist(cx, cy, 0, forB, marked.x, marked.y) < 0.3) continue;
      placed = { x: cx, y: cy };
      break;
    }
    if (!placed) placed = { x: marked.x, y: min(PLAYER_Y_CAP, marked.y + 1) };
    taken.push(placed);
    opp.push(placed);
  }

  var gapX;
  do { gapX = randInt(-3, 3); } while (gapX === 0);
  return { teammates: tms, opponents: opp, goalGapX: gapX, goalieX: 0 };
}

function generateTargets() {
  var f = buildFormation(ballB);
  teammates = f.teammates; opponents = f.opponents;
  goalGapX = f.goalGapX; goalieX = f.goalieX;
}

function kickoffB() {
  if (mainMode !== "proportional" && random(0, 1) >= 0.1) {
    var v;
    do { v = randInt(GY_MIN, PLAYER_Y_CAP); } while (v === 0);
    return v;
  }
  return 0;
}

function isComputerTurn() { return attackingTeam === "B" && vsComputer(); }

function decideTarget() {
  if (passCount < 1) {
    target = { type: "pass" };
  } else {
    var p = shotBlockProbability(ballB);
    target = { x: goalGapX, y: GY_MAX, type: "shoot", forcedBlock: random(0, 1) < p };
  }
}

function shotDistanceYRange() {
  var unitScale = (FIELD_Y0 - FY1) / (GY_MAX - GY_MIN);
  return { min: GY_MAX - 120 / unitScale, max: GY_MAX - 70 / unitScale };
}

function startOneOnOne() {
  dribX = random(-3, 3);
  var sr = shotDistanceYRange();
  dribY = random(sr.min, sr.max);

  keeperX = constrain(dribX * 0.35, -3, 3);
  aimTimer = 0; powerTimer = 0;
  screenState = "powering";
}

function findOpenDribbleX(targetY, excludeIdx) {
  var bestX = 0, bestMinDist = -1;
  for (var cx = -3.5; cx <= 3.5; cx += 0.5) {
    var minDist = 999;
    for (var ti = 0; ti < teammates.length; ti++) {
      if (ti === excludeIdx) continue;
      minDist = min(minDist, dist(cx, targetY, teammates[ti].x, teammates[ti].y));
    }
    for (var oi = 0; oi < opponents.length; oi++) {
      minDist = min(minDist, dist(cx, targetY, opponents[oi].x, opponents[oi].y));
    }
    if (minDist > bestMinDist) { bestMinDist = minDist; bestX = cx; }
  }
  return bestX;
}

function startBreakaway(fromX, fromY) {
  breakawayStartX = fromX; breakawayStartY = fromY;

  breakawayReceiverIdx = 0;
  for (var i = 0; i < teammates.length; i++) {
    if (abs(teammates[i].x - fromX) < 0.05 && abs(teammates[i].y - fromY) < 0.05) {
      breakawayReceiverIdx = i;
      break;
    }
  }

  var sr = shotDistanceYRange();
  breakawayEndY = random(sr.min, sr.max);

  breakawayEndX = findOpenDribbleX(breakawayEndY, breakawayReceiverIdx);

  var guard = opponents[breakawayReceiverIdx] || opponents[0];
  breakawayDefStartX = guard.x; breakawayDefStartY = guard.y;

  breakawayKeeperStartX = goalieX;
  breakawayKeeperTargetX = constrain(breakawayEndX * 0.35, -3, 3);

  dribX = breakawayStartX; dribY = breakawayStartY;
  breakawayDefX = breakawayDefStartX; breakawayDefY = breakawayDefStartY;
  breakawaySwerveOffset = 0;
  breakawayScroll = 0;
  breakawayTimer = 0;

  otherDispT = []; otherStartT = []; otherTargetT = [];
  for (var ti2 = 0; ti2 < teammates.length; ti2++) {
    var tx2 = teammates[ti2].x, ty2 = teammates[ti2].y;
    otherStartT.push({ x: tx2, y: ty2 });
    otherDispT.push({ x: tx2, y: ty2 });
    otherTargetT.push({
      x: constrain(tx2 + random(-1.3, 1.3), -4.8, 4.8),
      y: constrain(ty2 + random(0.3, 1.3), 0, 4.2)
    });
  }
  otherDispO = []; otherStartO = []; otherTargetO = [];
  for (var oi2 = 0; oi2 < opponents.length; oi2++) {
    var ox2 = opponents[oi2].x, oy2 = opponents[oi2].y;
    otherStartO.push({ x: ox2, y: oy2 });
    otherDispO.push({ x: ox2, y: oy2 });
    otherTargetO.push({
      x: constrain(ox2 + random(-1.1, 1.1), -4.6, 4.6),
      y: constrain(oy2 + random(-0.4, 0.8), 0, 4.4)
    });
  }

  screenState = "breakaway";
}

function updateBreakaway() {
  breakawayTimer++;
  var t = easeInOutPass(constrain(breakawayTimer / breakawayDuration, 0, 1));

  breakawayScroll = (FIELD_Y0 - FY1) * t;

  var straightX = lerp(breakawayStartX, breakawayEndX, t);
  var straightY = lerp(breakawayStartY, breakawayEndY, t);
  var nearestX = breakawayDefX, nearestDist = dist(straightX, straightY, breakawayDefX, breakawayDefY);
  for (var pi = 0; pi < otherDispT.length; pi++) {
    if (pi === breakawayReceiverIdx) continue;
    var pd = dist(straightX, straightY, otherDispT[pi].x, otherDispT[pi].y);
    if (pd < nearestDist) { nearestDist = pd; nearestX = otherDispT[pi].x; }
  }
  for (var pj = 0; pj < otherDispO.length; pj++) {
    var od = dist(straightX, straightY, otherDispO[pj].x, otherDispO[pj].y);
    if (od < nearestDist) { nearestDist = od; nearestX = otherDispO[pj].x; }
  }
  var closeness = 1 - constrain(nearestDist / 1.1, 0, 1);
  var swerveDir = (nearestX >= straightX) ? -1 : 1;

  var desiredSwerve = swerveDir * closeness * 1.1;
  breakawaySwerveOffset = lerp(breakawaySwerveOffset, desiredSwerve, 0.12);
  dribX = straightX + breakawaySwerveOffset + sin(breakawayTimer * 14) * 0.06;
  dribY = straightY;

  breakawayDefX = lerp(breakawayDefX, dribX, 0.025);
  breakawayDefY = lerp(breakawayDefY, dribY - 0.9, 0.022);

  goalieX = lerp(breakawayKeeperStartX, breakawayKeeperTargetX, t);

  for (var oti = 0; oti < otherDispT.length; oti++) {
    otherDispT[oti].x = lerp(otherStartT[oti].x, otherTargetT[oti].x, t);
    otherDispT[oti].y = lerp(otherStartT[oti].y, otherTargetT[oti].y, t);
  }
  for (var ooi = 0; ooi < otherDispO.length; ooi++) {
    otherDispO[ooi].x = lerp(otherStartO[ooi].x, otherTargetO[ooi].x, t);
    otherDispO[ooi].y = lerp(otherStartO[ooi].y, otherTargetO[ooi].y, t);
  }

  if (breakawayTimer >= breakawayDuration) {
    keeperX = goalieX;
    aimTimer = 0; powerTimer = 0;
    screenState = "powering";
  }
}

function drawGoalNet(xLeft, xRight, netTop, netBottom) {
  var topClamped = max(32, netTop);
  if (netBottom <= topClamped) return;

  fill(235, 240, 248, 130); noStroke();
  rect(xLeft, topClamped, xRight - xLeft, netBottom - topClamped);

  stroke(255, 255, 255, 180); strokeWeight(0.8);
  var gap = 6;
  for (var y = topClamped; y <= netBottom; y += gap) {
    line(xLeft, y, xRight, y);
  }
  for (var x = xLeft; x <= xRight; x += gap) {
    line(x, topClamped, x, netBottom);
  }
}

function drawBreakawayScroll() {
  ensureFieldGrid();
  var xB = FIELD_XB, yB = FIELD_YB;

  fill(10, 60, 20); noStroke();
  rect(0, FY1 - 6, 400, FIELD_Y0 - FY1 + 12);

  var rowSpan = GY_MAX - GY_MIN;
  var fullH = FIELD_Y0 - FY1;
  var shiftDown = breakawayScroll % fullH;

  noStroke();
  for (var rep = 0; rep < 2; rep++) {
    var shiftY = shiftDown - rep * fullH;
    for (var gy = GY_MIN; gy < GY_MAX; gy++) {
      var rowIdx = gy - GY_MIN;
      var cellTop = max(yB[rowIdx + 1] + shiftY, FY1);
      var cellBot = min(yB[rowIdx] + shiftY, FIELD_Y0);
      if (cellBot <= cellTop) continue;

      for (var gx = GX_MIN; gx < GX_MAX; gx++) {
        if ((gx + gy + rep * rowSpan) % 2 === 0) fill(28, 118, 42); else fill(38, 150, 56);
        rect(xB[gx - GX_MIN], cellTop, xB[gx - GX_MIN + 1] - xB[gx - GX_MIN] + 1, cellBot - cellTop + 1);
      }
    }
  }

  noFill(); stroke(255); strokeWeight(2);
  rect(FX1, FY1, FX2 - FX1, FIELD_Y0 - FY1);
}

function drawOtherFieldPlayers() {

  for (var ti = 0; ti < otherDispT.length; ti++) {
    if (ti === breakawayReceiverIdx) continue;
    drawPlayerCircle(gridSX(otherDispT[ti].x), gridSY(otherDispT[ti].y), attackerColor());
  }
  for (var oi = 0; oi < otherDispO.length; oi++) {
    if (oi === breakawayReceiverIdx) continue;
    drawPlayerCircle(gridSX(otherDispO[oi].x), gridSY(otherDispO[oi].y), defenderColor());
  }

  drawPlayerCircle(gridSX(breakawayDefX), gridSY(breakawayDefY), defenderColor());
}

function drawBreakawayScene() {
  drawBreakawayScroll();

  var bt = constrain(breakawayTimer / breakawayDuration, 0, 1);
  // Slides the exact same pixel distance as the scrolling checkerboard
  // (drawBreakawayScroll's own shiftDown travels this same span) -- so
  // the goal/box arrives in lockstep with the new field squares scrolling
  // into view, instead of drifting in at its own independent rate.
  var goalSlide = lerp(-(FIELD_Y0 - FY1), 0, easeInOutPass(bt));
  if (goalUnlocked()) {
    var goalLeftPx = gridSX(-3), goalRightPx = gridSX(3);
    drawGoalNet(goalLeftPx, goalRightPx, FY1 - 16 + goalSlide, FY1 + goalSlide);
    fill(210); stroke(160); strokeWeight(2);
    rect(goalLeftPx, FY1 - 9 + goalSlide, goalRightPx - goalLeftPx, 9);
    fill(200, 200, 205); stroke(120); strokeWeight(1.5);
    ellipse(goalLeftPx, FY1 - 4.5 + goalSlide, 10, 10);
    ellipse(goalRightPx, FY1 - 4.5 + goalSlide, 10, 10);

    // The goalie box slides in together with the goal/goalie, instead of
    // just appearing already in place once the breakaway finishes.
    noFill(); stroke(255, 255, 255, 220); strokeWeight(1);
    beginShape();
    vertex(gridSX(-4), gridSY(GY_MAX) + goalSlide);
    vertex(gridSX(-4), gridSY(GY_MAX - 3) + goalSlide);
    vertex(gridSX(4), gridSY(GY_MAX - 3) + goalSlide);
    vertex(gridSX(4), gridSY(GY_MAX) + goalSlide);
    endShape();

    drawPenaltySpotAndArc(goalSlide);
  }

  drawOtherFieldPlayers();
  if (goalUnlocked()) drawGoalie(gridSX(goalieX), gridSY(GY_MAX) + goalSlide, defenderColor());

  drawPlayerCircle(gridSX(dribX), gridSY(dribY), attackerColor());

  var bdx = breakawayEndX - breakawayStartX, bdy = breakawayEndY - breakawayStartY;
  var bdMag = sqrt(bdx * bdx + bdy * bdy) || 1;
  drawBall(gridSX(dribX + (bdx / bdMag) * 0.3), gridSY(dribY + (bdy / bdMag) * 0.3));

  var xB2 = FIELD_XB, yB2 = FIELD_YB;
  noStroke(); fill(255); textSize(11);
  textAlign(CENTER);
  for (var xi2 = GX_MIN; xi2 <= GX_MAX; xi2++) {
    text(dispX(xi2), constrain(xB2[xi2 - GX_MIN], 8, 392), FIELD_Y0 + 15);
  }
  textAlign(RIGHT);
  for (var yi2 = GY_MIN; yi2 <= GY_MAX; yi2++) {
    text(dispY(yi2), FX1 - 6, yB2[yi2 - GY_MIN] + 4);
  }

  fill(10, 10, 40); noStroke();
  rect(0, FY2 + 1, 400, 400 - (FY2 + 1));
  drawEquationReadout(FY2 + 24);
}

function startPossessionAction() {
  if (!isComputerTurn() && passCount >= 1) {
    startOneOnOne();
  } else {
    decideTarget();
    screenState = "input";
  }
}

function spaceOrTap() {
  return keyWentDown("space") || keyWentDown(" ") || (mouseIsPressed && !prevMouse);
}

// Power is chosen first (arrow fixed straight up while the bar fills),
// then aim (arrow oscillates, now showing the power level already locked
// in) -- swapped from the original aim-then-power order.
function updatePowering() {
  powerTimer++;
  var cycleFrames = 24;
  powerFrac = (powerTimer % cycleFrames) / (cycleFrames - 1);
  if (spaceOrTap()) {
    shotPower = min(powerFrac, 0.9);
    aimTimer = 0;
    screenState = "aiming";
  }
}

function updateAiming() {
  aimTimer++;
  aimAngle = sin(aimTimer * 4.025) * 90;
  if (spaceOrTap()) {
    shotAimAngle = aimAngle;

    var aimTheta = constrain(aimAngle, -89.5, 89.5);
    shotAimX = constrain(dribX + tan(aimTheta) * (GY_MAX - dribY), GX_MIN - 1, GX_MAX + 1);
    startShootFlight();
  }
}

function startShootFlight() {
  shootStartX = dribX; shootStartY = dribY;

  shootEndX = shotAimX; shootEndY = GY_MAX + BALL_RADIUS_GRID;
  shootFlightDuration = round(lerp(31, 5, shotPower));
  shootFlightTimer = 0;
  shootOutcomeDecided = false;
  shootWasSaved = false;
  screenState = "shootFlight";
}

function findShotBlocker(bx, by) {
  var r = 0.35;
  for (var i = 0; i < otherDispT.length; i++) {
    if (i === breakawayReceiverIdx) continue;
    if (dist(bx, by, otherDispT[i].x, otherDispT[i].y) < r) return otherDispT[i];
  }
  for (var j = 0; j < otherDispO.length; j++) {
    if (j === breakawayReceiverIdx) continue;
    if (dist(bx, by, otherDispO[j].x, otherDispO[j].y) < r) return otherDispO[j];
  }
  if (dist(bx, by, breakawayDefX, breakawayDefY) < r) return { x: breakawayDefX, y: breakawayDefY };
  return null;
}

function buildBreakawaySnapshot() {
  var atkC = attackerColor(), defC = defenderColor();
  var players = [{ x: dribX, y: dribY, c: atkC }, { x: breakawayDefX, y: breakawayDefY, c: defC }];
  for (var ti = 0; ti < otherDispT.length; ti++) {
    if (ti === breakawayReceiverIdx) continue;
    players.push({ x: otherDispT[ti].x, y: otherDispT[ti].y, c: atkC });
  }
  for (var oi = 0; oi < otherDispO.length; oi++) {
    if (oi === breakawayReceiverIdx) continue;
    players.push({ x: otherDispO[oi].x, y: otherDispO[oi].y, c: defC });
  }
  return {
    players: players,
    goalie: { x: keeperX, y: GY_MAX, c: defC },
    ball: {
      x: shootEndX, y: shootEndY,
      pvx: (gridSX(shootEndX) - gridSX(shootStartX)) / max(1, shootFlightDuration),
      pvy: (gridSY(shootEndY) - gridSY(shootStartY)) / max(1, shootFlightDuration)
    }
  };
}

function finishShoot(good, msg) {
  if (good) {
    if (attackingTeam === "A") scoreA++; else scoreB++;
    startCelebration(msg, buildBreakawaySnapshot());
  } else {
    startFeedback(msg);
  }
}

function hitPost() {
  postHitX = shootEndX;
  postHitTimer = 0;
  screenShakeTimer = 30;
  screenState = "postHit";
}

function makeSave(atX, atY) {
  saveX = atX; saveY = atY;
  savePower = shotPower;
  saveTimer = 0;
  screenShakeTimer = 30;
  screenState = "saved";
}

function makeBlocked(atX, atY, fromX) {
  blockX = atX; blockY = atY;

  blockDirX = (atX >= fromX) ? 1 : -1;
  blockTimer = 0;
  screenShakeTimer = 30;
  screenState = "blocked";
}

function resetEquationInput() {
  mNumSign = 1; mNumDigit = ""; mDenDigit = ""; bBuf = ""; activeField = "mNum";
}

var hardYOffset = 0;
function regenerateHardAxisLabels() {
  hardYOffset = randInt(-99 - GY_MIN, 99 - GY_MAX);
}

function dispX(gx) { return gx; }
function dispY(gy) { return (subMode === "hard" && mainMode !== "proportional") ? gy + hardYOffset : gy; }

function newPossession(startB) {
  ballB = (mainMode === "proportional") ? 0 : startB;
  ballB = constrain(ballB, mainMode === "proportional" ? 0 : GY_MIN, PLAYER_Y_CAP);
  highlightRow = ballB;
  passCount = 0;
  generateTargets();
  resetEquationInput();
  if (subMode === "hard") regenerateHardAxisLabels();
  startPossessionAction();
}

function shuffleArray(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = floor(random(i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
}

function startTournament() {
  tournamentMode = true;
  tRound = 0;
  tQFWin = [-1, -1, -1, -1];
  tSFWin = [-1, -1];
  var others = [];
  for (var k = 0; k < countries.length; k++) {
    if (k !== teamAIdx) others.push(k);
  }
  shuffleArray(others);
  tSeeds = [teamAIdx].concat(others);
  teamBIdx = tSeeds[1];
  bracketTimer = 240;
  bracketAutoStart = true;
  screenState = "bracket";
}

function advanceTournament() {
  if (tRound === 0) {
    tQFWin[0] = tSeeds[0];
    tQFWin[1] = random() < 0.5 ? tSeeds[2] : tSeeds[3];
    tQFWin[2] = random() < 0.5 ? tSeeds[4] : tSeeds[5];
    tQFWin[3] = random() < 0.5 ? tSeeds[6] : tSeeds[7];
    teamBIdx = tQFWin[1];
    tRound = 1;
  } else if (tRound === 1) {
    tSFWin[0] = tSeeds[0];
    tSFWin[1] = random() < 0.5 ? tQFWin[2] : tQFWin[3];
    teamBIdx = tSFWin[1];
    tRound = 2;
  }
  bracketTimer = 240;
  bracketAutoStart = true;
  screenState = "bracket";
}

function drawBracketSlot(x, cy, w, h, cIdx, isPlayer, isElim) {
  var hy = h / 2;
  if (cIdx < 0) {
    fill(35, 38, 58); stroke(65, 68, 95); strokeWeight(1);
    rect(x, cy - hy, w, h, 3);
    fill(85); noStroke(); textSize(7); textAlign(CENTER);
    text("TBD", x + w / 2, cy + 2.5);
    return;
  }
  if (isElim) {
    fill(48, 28, 28); stroke(85, 48, 48); strokeWeight(1);
  } else if (isPlayer) {
    fill(10, 50, 10); stroke(60, 190, 60); strokeWeight(2);
  } else {
    fill(28, 33, 55); stroke(75, 80, 115); strokeWeight(1);
  }
  rect(x, cy - hy, w, h, 3);
  var fd = h - 6;
  drawFlag(cIdx, x + 3 + fd / 2, cy, fd);
  noFill(); stroke(isElim ? 55 : 95); strokeWeight(0.5);
  rect(x + 3, cy - fd / 2, fd, fd);
  var nameStr = countries[cIdx].name.toUpperCase();
  var textStartX = x + fd + 10;
  var maxTextW = x + w - 2 - textStartX;
  textSize(7);
  var ts = textWidth(nameStr) > maxTextW ? max(5, 7 * maxTextW / textWidth(nameStr)) : 7;
  fill(isElim ? 75 : (isPlayer ? 175 : 210)); noStroke(); textSize(ts); textAlign(LEFT);
  text(nameStr, textStartX, cy + 2.5);
}

function drawBracketScreen() {
  background(8, 10, 30);
  noStroke();
  for (var i = 0; i < 5; i++) {
    var tb = frameCount * 0.006 + i * 1.2;
    fill(100 + i * 18, 130 + i * 14, 255, 8 + i * 2);
    ellipse(200 + cos(tb + i * 0.55) * (100 + i * 18), 195 + sin(tb * 0.65 + i * 0.75) * (75 + i * 12), 32 + i * 9, 32 + i * 9);
  }

  fill(255, 220, 40); noStroke(); textSize(13); textAlign(CENTER);
  text("LINEAR WORLD CUP", 200, 14);
  var rndLabel = tRound === 0 ? "QUARTER-FINALS" : tRound === 1 ? "SEMI-FINALS" : "THE FINAL";
  fill(120, 220, 255); textSize(9);
  text(rndLabel, 200, 26);

  var tX = 4, tW = 92, tH = 22;
  var sfX = 112, sfW = 60, sfH = 22;
  var rtX = 304, rtW = 92;
  var rsfX = 228, rsfW = 60;
  var s0y = 78, s1y = 114, s2y = 246, s3y = 282;
  var sfTy = 96, sfBy = 264, fy = 180;
  var aL1 = 102, aL2 = 178, aR1 = 298, aR2 = 222;

  stroke(110, 120, 160); strokeWeight(1.2); noFill();
  line(tX + tW, s0y, aL1, s0y); line(tX + tW, s1y, aL1, s1y);
  line(aL1, s0y, aL1, s1y);    line(aL1, sfTy, sfX, sfTy);
  line(tX + tW, s2y, aL1, s2y); line(tX + tW, s3y, aL1, s3y);
  line(aL1, s2y, aL1, s3y);    line(aL1, sfBy, sfX, sfBy);
  line(sfX + sfW, sfTy, aL2, sfTy); line(sfX + sfW, sfBy, aL2, sfBy);
  line(aL2, sfTy, aL2, sfBy);  line(aL2, fy, 196, fy);
  line(rtX, s0y, aR1, s0y); line(rtX, s1y, aR1, s1y);
  line(aR1, s0y, aR1, s1y);    line(aR1, sfTy, rsfX + rsfW, sfTy);
  line(rtX, s2y, aR1, s2y); line(rtX, s3y, aR1, s3y);
  line(aR1, s2y, aR1, s3y);    line(aR1, sfBy, rsfX + rsfW, sfBy);
  line(rsfX, sfTy, aR2, sfTy); line(rsfX, sfBy, aR2, sfBy);
  line(aR2, sfTy, aR2, sfBy);  line(aR2, fy, 204, fy);

  var isFinal = tRound >= 2;
  fill(isFinal ? 255 : 50, isFinal ? 215 : 55, isFinal ? 30 : 80);
  stroke(isFinal ? 200 : 70, isFinal ? 165 : 70, isFinal ? 10 : 90); strokeWeight(1.5);
  ellipse(200, fy, 18, 18);
  fill(255); noStroke(); textSize(9); textAlign(CENTER);
  text("★", 200, fy + 3);

  var qfDone = tRound >= 1;
  var sfDone = tRound >= 2;

  drawBracketSlot(tX, s0y, tW, tH, tSeeds[0], true, false);
  drawBracketSlot(tX, s1y, tW, tH, tSeeds[1], false, qfDone);
  drawBracketSlot(tX, s2y, tW, tH, tSeeds[2], false, qfDone && tQFWin[1] !== tSeeds[2]);
  drawBracketSlot(tX, s3y, tW, tH, tSeeds[3], false, qfDone && tQFWin[1] !== tSeeds[3]);
  drawBracketSlot(rtX, s0y, rtW, tH, tSeeds[4], false, qfDone && tQFWin[2] !== tSeeds[4]);
  drawBracketSlot(rtX, s1y, rtW, tH, tSeeds[5], false, qfDone && tQFWin[2] !== tSeeds[5]);
  drawBracketSlot(rtX, s2y, rtW, tH, tSeeds[6], false, qfDone && tQFWin[3] !== tSeeds[6]);
  drawBracketSlot(rtX, s3y, rtW, tH, tSeeds[7], false, qfDone && tQFWin[3] !== tSeeds[7]);

  var sfL1 = qfDone ? tQFWin[0] : -1;
  var sfL2 = qfDone ? tQFWin[1] : -1;
  drawBracketSlot(sfX, sfTy, sfW, sfH, sfL1, sfL1 === tSeeds[0], false);
  drawBracketSlot(sfX, sfBy, sfW, sfH, sfL2, false, sfDone);
  var sfR1 = qfDone ? tQFWin[2] : -1;
  var sfR2 = qfDone ? tQFWin[3] : -1;
  drawBracketSlot(rsfX, sfTy, rsfW, sfH, sfR1, false, sfDone && tSFWin[1] !== sfR1);
  drawBracketSlot(rsfX, sfBy, rsfW, sfH, sfR2, false, sfDone && tSFWin[1] !== sfR2);

  var oppIdx = tRound === 0 ? tSeeds[1] : tRound === 1 ? tQFWin[1] : tSFWin[1];
  fill(255, 210, 80); noStroke(); textSize(9); textAlign(CENTER);
  text("YOUR MATCH  ►  vs " + countries[oppIdx].name.toUpperCase(), 200, 336);
  fill(140, 155, 190); textSize(8);
  text("Click or press Enter / Space to start", 200, 352);
}

function startMatch() {
  scoreA = 0; scoreB = 0; gameClockSeconds = 0; attackingTeam = "A";
  newPossession(kickoffB());
}

function beginPassTransition(nextB) {
  passCount++;
  oldTeammates = teammates; oldOpponents = opponents; oldGoalieX = goalieX; oldBallB = ballB;
  var clampedB = (mainMode === "proportional") ? 0 : constrain(nextB, GY_MIN, PLAYER_Y_CAP);
  var f = buildFormation(clampedB);
  pendingTeammates = f.teammates; pendingOpponents = f.opponents;
  pendingGoalGapX = f.goalGapX; pendingGoalieX = f.goalieX;
  pendingBallB = clampedB;
  animTimer = 0;
  screenState = "moving";
}

function attackerColor() { return attackingTeam === "A" ? teamAIdx : teamBIdx; }
function defenderColor()  { return attackingTeam === "A" ? teamBIdx : teamAIdx; }

function parseFractionOrNumber(str) {
  if (str.indexOf("/") >= 0) {
    var parts = str.split("/");
    var num = parseFloat(parts[0]);
    var den = parseFloat(parts[1]);
    if (isNaN(num) || isNaN(den) || den === 0) return null;
    return num / den;
  }
  if (str === "" || str === "-") return null;
  var v = parseFloat(str);
  return isNaN(v) ? null : v;
}

function getTypedEquation() {
  if (mNumDigit === "" || mDenDigit === "") return null;
  var den = parseFloat(mDenDigit);

  if (den === 0) return { m: Infinity, b: 0, vertical: true };
  var mv = (mNumSign * parseFloat(mNumDigit)) / den;
  var bv = (mainMode === "proportional") ? 0 : parseFractionOrNumber(bBuf);
  if (bv === null) return null;

  if (subMode === "hard" && mainMode !== "proportional") bv -= hardYOffset;
  return { m: mv, b: bv };
}

function onLine(eq, x, y) {
  if (eq.vertical) return abs(x) < 0.05;
  return abs(eq.m * x + eq.b - y) < 0.05;
}

function exitPoint(eq) {
  if (eq.vertical) return { x: 0, y: GY_MAX };
  var ex = lineExitX(eq);
  return { x: ex, y: eq.m * ex + eq.b };
}

function shotBlockProbability(curB) {
  return constrain(map(curB, 0, 5, 0.75, 0.10), 0.10, 0.75);
}

function lineExitX(eq) { return eq.m >= 0 ? GX_MAX : GX_MIN; }

function startKickAnimation(eq, stopX, stopY, isGood, isGoal, msg) {
  kickM = eq.m; kickB = eq.b; kickVertical = !!eq.vertical;
  kickStopX = stopX; kickEndY = stopY;
  kickIsGood = isGood; kickIsGoal = isGoal; kickMsg = msg;
  kickTimer = 0;
  if (subMode === "hard") {
    revealLineTimer = 0;
    screenState = "revealLine";
  } else {
    screenState = "kicking";
  }
}

function allBoxesFilled() {
  return mNumDigit !== "" && mDenDigit !== "" && (mainMode === "proportional" || bBuf !== "");
}

function resolveKick() {
  if (!allBoxesFilled()) return;
  resolveEquation(getTypedEquation());
}

function resolveEquation(eq) {
  if (!eq) {
    if (target.type === "pass") startFeedback("BAD PASS", 30);
    else startFeedback("INVALID EQUATION");
    return;
  }

  if (!onLine(eq, 0, ballB)) {
    if (target.type === "pass") startFeedback("BAD PASS: INCORRECT Y-INTERCEPT", 30);
    else startFeedback("INCORRECT Y-INTERCEPT");
    return;
  }

  var ax = gridSX(0), ay = gridSY(ballB);

  if (target.type === "shoot") {
    if (!onLine(eq, target.x, target.y)) {
      var ep = exitPoint(eq);
      startKickAnimation(eq, ep.x, ep.y, false, false, "MISSED THE GOAL");
      return;
    }
    if (target.forcedBlock) {
      var blockX = target.x * random(0.35, 0.65);
      startKickAnimation(eq, blockX, eq.m * blockX + eq.b, false, false, "DEFENDER BLOCKED IT");
      return;
    }
    var gx = gridSX(goalieX), gy = gridSY(GY_MAX);
    var bx = gridSX(target.x), by = gridSY(target.y);
    if (pointSegDist(gx, gy, ax, ay, bx, by) < 16) {
      startKickAnimation(eq, goalieX, eq.m * goalieX + eq.b, false, false, "GOALIE BLOCKED IT");
      return;
    }
    var shootLoX = min(0, target.x), shootHiX = max(0, target.x);
    for (var i = 0; i < opponents.length; i++) {
      var o = opponents[i];
      if (o.x >= shootLoX && o.x <= shootHiX && onLine(eq, o.x, o.y)) {
        startKickAnimation(eq, o.x, o.y, false, false, "BLOCKED BY DEFENDER");
        return;
      }
    }

    startKickAnimation(eq, target.x, target.y + BALL_RADIUS_GRID, true, true, "GOAL!");
    return;
  }

  var candidates = [];
  for (var j = 0; j < teammates.length; j++) {
    var t = teammates[j];
    if (onLine(eq, t.x, t.y)) candidates.push({ x: t.x, y: t.y });
  }
  if (candidates.length === 0) {
    var ep2 = exitPoint(eq);
    startKickAnimation(eq, ep2.x, ep2.y, false, false, "BAD PASS: INCORRECT SLOPE");
    return;
  }
  var first = candidates[0];
  for (var c = 1; c < candidates.length; c++) {
    if (abs(candidates[c].x) < abs(first.x)) first = candidates[c];
  }
  target.x = first.x;
  target.y = first.y;
  startKickAnimation(eq, first.x, first.y, true, false, "GREAT PASS!");
}

function startFeedback(msg, dur) {
  feedbackText = msg;
  feedbackTimer = dur || 60;
  feedbackScene = (screenState === "enemyPossession") ? "enemy" : "scene";
  screenState = "feedback";
}

function buildPlayerSnapshot(arr, colorIdx) {
  var out = [];
  for (var i = 0; i < arr.length; i++) out.push({ x: arr[i].x, y: arr[i].y, c: colorIdx });
  return out;
}

function startCelebration(msg, snapshot) {
  celebrateText = msg;
  celebrateTimer = 60;
  celebrateSnapshot = snapshot;

  textSize(22);
  celebrateBoxW = textWidth(msg) + 32;
  screenFlash = 255;
  particles = [];
  for (var i = 0; i < 14; i++) {
    particles.push({
      x: 200, y: 150,
      vx: random(-4, 4), vy: random(-5, 1),
      life: 35 + randInt(0, 15),
      c: confettiColors[randInt(0, confettiColors.length - 1)]
    });
  }
  screenState = "celebrate";
}

function updateAndDrawParticles() {
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    if (p.life <= 0) continue;
    p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--;
    fill(p.c.r, p.c.g, p.c.b); noStroke();
    rect(p.x - 3, p.y - 3, 6, 6);
  }
}

function cloneXY(arr) {
  var out = [];
  for (var i = 0; i < arr.length; i++) out.push({ x: arr[i].x, y: arr[i].y });
  return out;
}

function pickEnemyOpenAreaX(holder) {
  var leftCount = 0, rightCount = 0;
  for (var i = 0; i < enemyDispO.length; i++) {
    if (enemyDispO[i].x < 0) leftCount++; else rightCount++;
  }
  var side = leftCount <= rightCount ? -1 : 1;
  return constrain(side * random(3, GX_MAX - 0.5), GX_MIN + 0.5, GX_MAX - 0.5);
}

function startEnemyDribble() {
  enemyPhase = "dribble";
  enemyPhaseTimer = 0;

  var holder = enemyDispT[enemyHolderIdx];

  var r = random(0, 1);
  if (r < 0.3) {
    enemyPhaseDuration = randInt(6, 12);
    enemyDribbleIntentX = holder.x;
    enemyDribbleIntentY = holder.y;
  } else if (r < 0.65) {
    enemyPhaseDuration = randInt(30, 55);
    if (random(0, 1) < 0.7) {
      enemyDribbleIntentX = holder.x + random(-0.5, 0.5);
      enemyDribbleIntentY = min(4.2, holder.y + random(1.6, 2.8));
    } else {
      var wideDir = holder.x >= 0 ? 1 : -1;
      enemyDribbleIntentX = constrain(holder.x + wideDir * random(1.2, 2.4), GX_MIN + 0.3, GX_MAX - 0.3);
      enemyDribbleIntentY = holder.y + random(0.2, 1.0);
    }
  } else {

    enemyPhaseDuration = randInt(45, 80);
    enemyDribbleIntentX = pickEnemyOpenAreaX(holder);
    enemyDribbleIntentY = constrain(holder.y + random(0.3, 1.4), 0.2, PLAYER_Y_CAP);
  }
}

function pickEnemyReceiver(excludeIdx) {
  var options = [];
  for (var i = 0; i < enemyDispT.length; i++) if (i !== excludeIdx) options.push(i);
  return options[randInt(0, options.length - 1)];
}

function pickForwardReceiver(excludeIdx) {
  var options = [];
  for (var i = 0; i < enemyDispT.length; i++) if (i !== excludeIdx) options.push(i);
  if (random(0, 1) < 0.7) {
    var best = options[0];
    for (var k = 1; k < options.length; k++) {
      if (enemyDispT[options[k]].y > enemyDispT[best].y) best = options[k];
    }
    return best;
  }
  return options[randInt(0, options.length - 1)];
}

function startEnemyPass() {
  enemyPhase = "pass";
  enemyPhaseTimer = 0;
  enemyReceiverIdx = pickForwardReceiver(enemyHolderIdx);
  enemyPassFromX = enemyDispT[enemyHolderIdx].x;
  enemyPassFromY = enemyDispT[enemyHolderIdx].y;
  var d = dist(enemyPassFromX, enemyPassFromY, enemyDispT[enemyReceiverIdx].x, enemyDispT[enemyReceiverIdx].y);
  enemyPhaseDuration = constrain(round(d * random(2.5, 4.5)), 5, 26);
}

function startEnemyCross() {
  enemyPhase = "pass";
  enemyPhaseTimer = 0;
  enemyWasCross = true;
  var best = 0;
  for (var k = 0; k < enemyDispT.length; k++) {
    if (k === enemyHolderIdx) continue;
    if (best === enemyHolderIdx || enemyDispT[k].y > enemyDispT[best].y) best = k;
  }
  enemyReceiverIdx = best;
  enemyPassFromX = enemyDispT[enemyHolderIdx].x;
  enemyPassFromY = enemyDispT[enemyHolderIdx].y;
  var dc = dist(enemyPassFromX, enemyPassFromY, enemyDispT[enemyReceiverIdx].x, enemyDispT[enemyReceiverIdx].y);
  enemyPhaseDuration = constrain(round(dc * random(3, 5)), 10, 30);
}

function easeInOutPass(t) {
  return t * t * (3 - 2 * t);
}

function startEnemyPossession() {
  enemyAnimDuration = round(random(240, 240)); // 4 seconds at 60fps
  enemyAnimTimer = 0;
  enemyPossessionScores = random(0, 1) < 0.35;

  // Everyone starts near the bottom of the field, well clear of the entire
  // goalie box (x:-4..4, y:1..4).  Attackers are biased toward the lower
  // portion of the pitch; defenders are capped well below the box front edge.
  var boxFrontY = GY_MAX - 3;
  var maxStartY = boxFrontY - 1.5;
  var bottomBias = GY_MIN + 2.5;
  enemyDispT = [];
  for (var zi = 0; zi < enemyZoneCentersX.length; zi++) {
    enemyDispT.push({ x: enemyZoneCentersX[zi] + random(-0.5, 0.5), y: random(GY_MIN + 0.3, bottomBias) });
  }
  enemyTargetT = cloneXY(enemyDispT);
  enemyDispO = [];
  for (var zj = 0; zj < enemyDispT.length; zj++) {
    enemyDispO.push({ x: enemyDispT[zj].x + random(-0.3, 0.3), y: min(maxStartY, enemyDispT[zj].y + random(0.5, 1.2)) });
  }
  enemyTargetO = cloneXY(enemyDispO);
  enemyRetargetTimerT = []; enemyRetargetIntervalT = [];
  enemySpeedT = []; enemySpeedTargetT = []; enemySpeedTimerT = []; enemyEaseT = [];
  for (var ti = 0; ti < enemyDispT.length; ti++) {
    enemyRetargetTimerT.push(randInt(0, 25));
    enemyRetargetIntervalT.push(randInt(35, 65));
    enemySpeedT.push(random(0.04, 0.07));
    enemySpeedTargetT.push(random(0.04, 0.08));
    enemySpeedTimerT.push(randInt(30, 60));
    enemyEaseT.push(random(0.02, 0.05));
  }
  enemyRetargetTimerO = []; enemyRetargetIntervalO = []; enemyJitterO = [];
  enemySpeedO = []; enemySpeedTargetO = []; enemySpeedTimerO = []; enemyEaseO = [];
  for (var oi = 0; oi < enemyDispO.length; oi++) {
    enemyRetargetTimerO.push(randInt(0, 25));
    enemyRetargetIntervalO.push(randInt(35, 65));
    enemyJitterO.push(0);
    enemySpeedO.push(random(0.04, 0.07));
    enemySpeedTargetO.push(random(0.04, 0.08));
    enemySpeedTimerO.push(randInt(30, 60));
    enemyEaseO.push(random(0.02, 0.05));
  }
  enemyHolderIdx = randInt(0, teammates.length - 1);
  startEnemyDribble();
  enemyResolving = false;
  screenState = "enemyPossession";
}

function enemyShotPathClear(fromX, fromY, toX, toY, minDist) {
  for (var i = 0; i < enemyDispO.length; i++) {
    if (pointSegDist(enemyDispO[i].x, enemyDispO[i].y, fromX, fromY, toX, toY) < minDist) return false;
  }
  for (var j = 0; j < enemyDispT.length; j++) {
    if (j === enemyHolderIdx) continue;
    if (pointSegDist(enemyDispT[j].x, enemyDispT[j].y, fromX, fromY, toX, toY) < minDist) return false;
  }
  return true;
}

function pickEnemyGoalAimX(holder) {
  var farSide = goalieX >= 0 ? -1 : 1;
  var candidates = [];
  for (var d = 2.3; d >= 0.3; d -= 0.3) candidates.push(farSide * d);
  candidates.push(0, -farSide * 1.2);
  for (var k = 0; k < candidates.length; k++) {
    var cx = candidates[k];
    if (abs(cx - goalieX) > 0.6 && enemyShotPathClear(holder.x, holder.y, cx, GY_MAX, 0.35)) return cx;
  }

  return constrain(farSide * 2.3, -2.5, 2.5);
}

function beginEnemyResolution(forceShoot) {
  enemyResolving = true;
  var holder = enemyDispT[enemyHolderIdx];

  if (forceShoot || enemyPossessionScores || random(0, 1) < 0.5) {
    enemyPhase = "shoot";
    enemyShotStartX = holder.x; enemyShotStartY = holder.y;

    enemyShotEndX = enemyPossessionScores ? pickEnemyGoalAimX(holder) : (random(0, 1) < 0.5 ? random(2.9, 4.2) : random(-4.2, -2.9));

    enemyShotEndY = GY_MAX + BALL_RADIUS_GRID;
    var power = random(0, 1);
    enemyShotPower = power;
    enemyShotDuration = round(lerp(22, 8, power));
    enemyShotTimer = 0;
    enemyShotSaved = false;
    enemyShotBallX = holder.x; enemyShotBallY = holder.y;
  } else {
    enemyPhase = "interceptPass";

    enemyInterceptorIdx = 0;
    var bestDist = dist(enemyDispO[0].x, enemyDispO[0].y, holder.x, holder.y);
    for (var di = 1; di < enemyDispO.length; di++) {
      var dd = dist(enemyDispO[di].x, enemyDispO[di].y, holder.x, holder.y);
      if (dd < bestDist) { bestDist = dd; enemyInterceptorIdx = di; }
    }
    var receiverIdx = pickEnemyReceiver(enemyHolderIdx);
    enemyInterceptFromX = holder.x; enemyInterceptFromY = holder.y;
    enemyInterceptToX = enemyDispT[receiverIdx].x; enemyInterceptToY = enemyDispT[receiverIdx].y;
    var frac = random(0.35, 0.65);
    enemyInterceptX = lerp(enemyInterceptFromX, enemyInterceptToX, frac);
    enemyInterceptY = lerp(enemyInterceptFromY, enemyInterceptToY, frac);
    enemyInterceptTimer = 0;
    var d = dist(enemyInterceptFromX, enemyInterceptFromY, enemyInterceptToX, enemyInterceptToY);
    enemyInterceptDuration = constrain(round(d * 3.5 * frac), 5, 20);
  }
}

function updateEnemyResolution() {
  if (enemyPhase === "shoot") {
    enemyShotTimer++;
    var sft = constrain(enemyShotTimer / enemyShotDuration, 0, 1);
    var sbx = lerp(enemyShotStartX, enemyShotEndX, sft);
    var sby = lerp(enemyShotStartY, enemyShotEndY, sft);
    enemyShotBallX = sbx; enemyShotBallY = sby;

    var speed = 0.14429;
    if (goalieX < sbx) goalieX = min(sbx, goalieX + speed);
    else if (goalieX > sbx) goalieX = max(sbx, goalieX - speed);

    if (!enemyPossessionScores && sby > GY_MAX - 0.7 && abs(goalieX - sbx) < 0.56182) enemyShotSaved = true;

    if (sft >= 1) {
      if (enemyShotSaved) {

        enemyPhase = "saveDeflect";
        enemySaveTimer = 0;
        enemySaveFromX = sbx; enemySaveFromY = sby;
      } else {
        var ballRadius = BALL_RADIUS_GRID;
        var edgeDist = abs(abs(enemyShotEndX) - 3);
        if (edgeDist <= ballRadius) {

          enemyPhase = "postHit";
          enemyPostHitTimer = 0;
          enemyPostHitX = enemyShotEndX;
          screenShakeTimer = 30;
        } else if (abs(enemyShotEndX) < 3 - ballRadius) {
          enemyResolving = false;
          if (attackingTeam === "A") scoreA++; else scoreB++;
          var enemyPlayers = buildPlayerSnapshot(enemyDispO, defenderColor()).concat(buildPlayerSnapshot(enemyDispT, attackerColor()));
          startCelebration(countries[attackingTeam === "A" ? teamAIdx : teamBIdx].name.toUpperCase() + " SCORES", {
            players: enemyPlayers,
            goalie: { x: goalieX, y: GY_MAX, c: defenderColor() },
            ball: {
              x: enemyShotEndX, y: enemyShotEndY,
              pvx: (gridSX(enemyShotEndX) - gridSX(enemyShotStartX)) / max(1, enemyShotDuration),
              pvy: (gridSY(enemyShotEndY) - gridSY(enemyShotStartY)) / max(1, enemyShotDuration)
            }
          });
        } else {
          enemyResolving = false;
          startFeedback("WIDE SHOT");
        }
      }
    }
  } else if (enemyPhase === "postHit") {

    enemyPostHitTimer++;
    var ephPft = constrain(enemyPostHitTimer / enemyPostHitDuration, 0, 1);
    var ephBounceDir = enemyPostHitX >= 0 ? 1 : -1;
    enemyShotBallX = enemyPostHitX + ephBounceDir * ephPft * 1.4;
    enemyShotBallY = GY_MAX - ephPft * 1.6;
    if (ephPft >= 1) {
      enemyResolving = false;
      startFeedback("HIT THE POST");
    }
  } else if (enemyPhase === "saveDeflect") {
    enemySaveTimer++;
    var svt = constrain(enemySaveTimer / enemySaveDuration, 0, 1);
    var saveDir = enemySaveFromX >= 0 ? 1 : -1;
    enemyShotBallX = enemySaveFromX + saveDir * svt * 2.2;
    enemyShotBallY = enemySaveFromY - svt * 1.7;
    if (svt >= 1) {
      enemyResolving = false;
      startFeedback("SAVED!");
    }
  } else if (enemyPhase === "interceptPass") {
    enemyInterceptTimer++;
    var pfLin = constrain(enemyInterceptTimer / enemyInterceptDuration, 0, 1);
    var pf = easeInOutPass(pfLin);
    enemyShotBallX = lerp(enemyInterceptFromX, enemyInterceptX, pf);
    enemyShotBallY = lerp(enemyInterceptFromY, enemyInterceptY, pf);
    enemyDispO[enemyInterceptorIdx].x = lerp(enemyDispO[enemyInterceptorIdx].x, enemyInterceptX, 0.15);
    enemyDispO[enemyInterceptorIdx].y = lerp(enemyDispO[enemyInterceptorIdx].y, enemyInterceptY, 0.15);
    if (pf >= 1) {

      enemyPhase = "interceptClear";
      enemyClearTimer = 0;
      enemyClearFromX = enemyInterceptX; enemyClearFromY = enemyInterceptY;
      // The defender's own body lerps toward enemyInterceptX/Y at a fixed
      // 0.15/frame rate above, so on a short intercept it may not have
      // actually arrived there yet -- start the clear phase from wherever
      // it really is, not from the idealized intercept point, or it snaps
      // the rest of the way there instantly.
      enemyClearDefFromX = enemyDispO[enemyInterceptorIdx].x;
      enemyClearDefFromY = enemyDispO[enemyInterceptorIdx].y;
      enemyClearToX = constrain(enemyInterceptX + random(-1.5, 1.5), -4.5, 4.5);
      enemyClearToY = max(0, enemyInterceptY - random(1.2, 2));
    }
  } else if (enemyPhase === "interceptClear") {
    enemyClearTimer++;
    var cf = easeInOutPass(constrain(enemyClearTimer / enemyClearDuration, 0, 1));
    enemyShotBallX = lerp(enemyClearFromX, enemyClearToX, cf);
    enemyShotBallY = lerp(enemyClearFromY, enemyClearToY, cf);
    enemyDispO[enemyInterceptorIdx].x = lerp(enemyClearDefFromX, enemyClearToX, cf);
    enemyDispO[enemyInterceptorIdx].y = lerp(enemyClearDefFromY, enemyClearToY, cf);
    if (cf >= 1) {
      enemyResolving = false;
      startFeedback("INTERCEPTED");
    }
  }
}

var enemyZoneCentersX = [-3.4, 0, 3.4];

function updateEnemyWander() {
  var progress = constrain(enemyAnimTimer / max(1, enemyAnimDuration), 0, 1);

  var yMin = lerp(0.2, 1.1, progress);
  var yMaxAttacker = PLAYER_Y_CAP;

  for (var i = 0; i < enemyTargetT.length; i++) {

    if (enemyPhase === "dribble" && i === enemyHolderIdx) {
      enemyTargetT[i].x = constrain(enemyDribbleIntentX, GX_MIN + 0.2, GX_MAX - 0.2);
      enemyTargetT[i].y = constrain(enemyDribbleIntentY, yMin, yMaxAttacker);
    } else {
      enemyRetargetTimerT[i]++;
      if (enemyRetargetTimerT[i] > enemyRetargetIntervalT[i]) {
        enemyRetargetTimerT[i] = 0;

        enemyRetargetIntervalT[i] = randInt(28, 50);

        // Cross-field runs are now rare and gentler -- the previous 35%
        // chance combined with high speed made players look like they
        // were teleport-sprinting clear across the pitch.
        if (random(0, 1) < 0.15) {
          enemyTargetT[i].x = enemyDispT[i].x >= 0
            ? random(GX_MIN + 0.5, -1)
            : random(1, GX_MAX - 0.5);
        } else {
          var zoneX = enemyZoneCentersX[i % enemyZoneCentersX.length];
          enemyTargetT[i].x = constrain(zoneX + random(-1.8, 1.8), GX_MIN + 0.2, GX_MAX - 0.2);
        }
        enemyTargetT[i].y = constrain(enemyDispT[i].y + random(-1.2, 1.2), yMin, yMaxAttacker);
      }
    }

    enemySpeedTimerT[i]--;
    if (enemyPhase === "dribble" && i === enemyHolderIdx) {
      enemySpeedTargetT[i] = 0.18;
    } else if (enemySpeedTimerT[i] <= 0) {
      enemySpeedTimerT[i] = randInt(20, 40);
      enemySpeedTargetT[i] = random(0.06, 0.1);
    }
    enemySpeedT[i] = lerp(enemySpeedT[i], enemySpeedTargetT[i], enemyEaseT[i]);
  }

  for (var j = 0; j < enemyTargetO.length; j++) {
    var mark = enemyDispT[j % enemyDispT.length];
    var standoff = 0.5;

    enemyRetargetTimerO[j]++;
    if (enemyRetargetTimerO[j] > enemyRetargetIntervalO[j]) {
      enemyRetargetTimerO[j] = 0;
      enemyRetargetIntervalO[j] = randInt(28, 50);
      enemyJitterO[j] = random(-0.9, 0.9);
    }
    enemyTargetO[j].x = constrain(mark.x + enemyJitterO[j], GX_MIN + 0.4, GX_MAX - 0.4);
    enemyTargetO[j].y = constrain(mark.y + standoff, mark.y + 0.3, PLAYER_Y_CAP);

    enemySpeedTimerO[j]--;
    if (enemySpeedTimerO[j] <= 0) {
      enemySpeedTimerO[j] = randInt(20, 40);
      enemySpeedTargetO[j] = random(0.06, 0.1);
    }
    enemySpeedO[j] = lerp(enemySpeedO[j], enemySpeedTargetO[j], enemyEaseO[j]);
  }

  for (var k = 0; k < enemyDispT.length; k++) {
    enemyDispT[k].x = lerp(enemyDispT[k].x, enemyTargetT[k].x, enemySpeedT[k]);
    enemyDispT[k].y = lerp(enemyDispT[k].y, enemyTargetT[k].y, enemySpeedT[k]);
  }
  for (var m = 0; m < enemyDispO.length; m++) {
    enemyDispO[m].x = lerp(enemyDispO[m].x, enemyTargetO[m].x, enemySpeedO[m]);
    enemyDispO[m].y = lerp(enemyDispO[m].y, enemyTargetO[m].y, enemySpeedO[m]);
  }
}

function updateEnemyPossession() {
  updateEnemyWander();
  if (!enemyResolving) {
    var currentBallX;
    if (enemyPhase === "dribble") {
      currentBallX = enemyDispT[enemyHolderIdx].x;
    } else {
      var pf = easeInOutPass(constrain(enemyPhaseTimer / max(1, enemyPhaseDuration), 0, 1));
      currentBallX = lerp(enemyPassFromX, enemyDispT[enemyReceiverIdx].x, pf);
    }
    var targetGoalieX = constrain(currentBallX * 0.5, -2.5, 2.5);
    goalieX = lerp(goalieX, targetGoalieX, 0.07);
  }
  enemyPhaseTimer++;
  if (enemyPhase === "dribble") {
    if (enemyPhaseTimer >= enemyPhaseDuration) {
      var holder = enemyDispT[enemyHolderIdx];

      if (abs(holder.x) > 3.0 && random(0, 1) < 0.5) {
        startEnemyCross();
      } else {
        enemyWasCross = false;
        startEnemyPass();
      }
    }
  } else {
    if (enemyPhaseTimer >= enemyPhaseDuration) {
      enemyHolderIdx = enemyReceiverIdx;

      if (enemyWasCross && random(0, 1) < 0.65) {
        enemyWasCross = false;
        beginEnemyResolution(true);
      } else {
        enemyWasCross = false;
        startEnemyDribble();
      }
    }
  }
}

function drawEnemyPossessionScene() {
  drawField();
  var defC = defenderColor();
  var atkC = attackerColor();
  for (var i = 0; i < enemyDispO.length; i++) {
    drawPlayerCircle(gridSX(enemyDispO[i].x), gridSY(enemyDispO[i].y), defC);
  }
  drawGoalie(gridSX(goalieX), gridSY(GY_MAX), defC);
  for (var j = 0; j < enemyDispT.length; j++) {
    drawPlayerCircle(gridSX(enemyDispT[j].x), gridSY(enemyDispT[j].y), atkC);
  }
  var ballX, ballY;
  var windFromX = null, windFromY = null, windToX = null, windToY = null, windSpeedFrac = 0, windDuration = null;
  if (enemyResolving) {
    ballX = enemyShotBallX; ballY = enemyShotBallY;
    if (enemyPhase === "shoot") {
      windFromX = enemyShotStartX; windFromY = enemyShotStartY;
      windToX = enemyShotEndX; windToY = enemyShotEndY;
      windSpeedFrac = enemyShotPower;
    } else if (enemyPhase === "interceptPass") {
      windFromX = enemyInterceptFromX; windFromY = enemyInterceptFromY;
      windToX = enemyInterceptX; windToY = enemyInterceptY;
      windDuration = enemyInterceptDuration;
    } else if (enemyPhase === "interceptClear") {
      windFromX = enemyClearFromX; windFromY = enemyClearFromY;
      windToX = enemyClearToX; windToY = enemyClearToY;
      windDuration = enemyClearDuration;
    }
  } else if (enemyPhase === "interceptClear") {
    ballX = enemyShotBallX; ballY = enemyShotBallY;
  } else if (enemyPhase === "dribble") {

    var holderPos = enemyDispT[enemyHolderIdx];
    var hdx = enemyDribbleIntentX - holderPos.x, hdy = enemyDribbleIntentY - holderPos.y;
    var hdMag = sqrt(hdx * hdx + hdy * hdy) || 1;
    ballX = holderPos.x + (hdx / hdMag) * 0.3;
    ballY = holderPos.y + (hdy / hdMag) * 0.3;
  } else {
    var pfLin = constrain(enemyPhaseTimer / max(1, enemyPhaseDuration), 0, 1);
    var pf = easeInOutPass(pfLin);
    ballX = lerp(enemyPassFromX, enemyDispT[enemyReceiverIdx].x, pf);
    ballY = lerp(enemyPassFromY, enemyDispT[enemyReceiverIdx].y, pf);
    windFromX = enemyPassFromX; windFromY = enemyPassFromY;
    windToX = enemyDispT[enemyReceiverIdx].x; windToY = enemyDispT[enemyReceiverIdx].y;
    windDuration = enemyPhaseDuration;
  }
  var ebx = gridSX(ballX), eby = gridSY(ballY);
  if (windFromX !== null) {

    var wfx = gridSX(windFromX), wfy = gridSY(windFromY);
    var wtx = gridSX(windToX), wty = gridSY(windToY);
    if (windDuration !== null) windSpeedFrac = speedFracFromPixelsPerFrame(dist(wfx, wfy, wtx, wty) / windDuration);
    drawWindMarkers(ebx, eby, wtx - wfx, wty - wfy, windSpeedFrac);
  }
  drawBall(ebx, eby);
  if (enemyPhase === "postHit") {
    drawPostPop(gridSX(enemyPostHitX >= 0 ? 3 : -3), FY1 - 4.5, enemyPostHitTimer / 12);
  }
}

function drawEnemyPossessionPanel() {
  fill(10, 10, 40); noStroke();
  rect(0, FY2 + 1, 400, 400 - (FY2 + 1));
  fill(255, 80, 80); textSize(15); textAlign(CENTER);
  text(countries[attackingTeam === "A" ? teamAIdx : teamBIdx].name.toUpperCase() + " IS ATTACKING...", 200, FY2 + 40);
}

function endPossessionSwap() {
  attackingTeam = (attackingTeam === "A") ? "B" : "A";
  if (attackingTeam === "A") {
    newPossession(kickoffB());
  } else {
    if (vsComputer()) startEnemyPossession();
    else newPossession(kickoffB());
  }
}

function handleKeyboard() {
  var digits = "0123456789";
  for (var i = 0; i < digits.length; i++) {
    var d = digits.charAt(i);
    if (keyWentDown(d)) appendChar(d);
  }
  if (keyWentDown("backspace")) backspace();
  if (keyWentDown("enter")) resolveKick();

  if (keyWentDown("-") || keyWentDown("minus") || keyWentDown("hyphen") ||
    keyWentDown("subtract") || keyWentDown("numpad-")) toggleSign();
  if (keyWentDown("up") || keyWentDown("ArrowUp")) moveActiveField("up");
  if (keyWentDown("down") || keyWentDown("ArrowDown")) moveActiveField("down");
  if (keyWentDown("left") || keyWentDown("ArrowLeft")) moveActiveField("left");
  if (keyWentDown("right") || keyWentDown("ArrowRight")) moveActiveField("right");
}

function moveActiveField(dir) {
  if (dir === "down" && activeField === "mNum") activeField = "mDen";
  else if (dir === "up" && activeField === "mDen") activeField = "mNum";
  else if (mainMode !== "proportional") {
    if (dir === "right" && (activeField === "mNum" || activeField === "mDen")) activeField = "b";
    else if (dir === "left" && activeField === "b") activeField = "mDen";
  }
}

function appendChar(c) {
  if (activeField === "mNum") { mNumDigit = c; activeField = "mDen"; }
  else if (activeField === "mDen") {
    mDenDigit = c;

    if (mainMode !== "proportional") activeField = "b";
  }
  else {
    var neg = bBuf.charAt(0) === "-";
    var digitsOnly = neg ? bBuf.slice(1) : bBuf;
    if (subMode === "hard" && mainMode !== "proportional") {

      if (digitsOnly.length < 2) bBuf = (neg ? "-" : "") + digitsOnly + c;
    } else {

      bBuf = (neg ? "-" : "") + c;
    }
  }
}
function backspace() {
  if (activeField === "mNum") mNumDigit = "";
  else if (activeField === "mDen") {

    if (mDenDigit !== "") mDenDigit = "";
    else { mNumDigit = ""; activeField = "mNum"; }
  } else if (bBuf !== "") {
    bBuf = bBuf.slice(0, -1);
  } else {

    mDenDigit = ""; activeField = "mDen";
  }
}

function toggleSign() {
  if (activeField === "mNum" || activeField === "mDen") {
    mNumSign = -mNumSign;
  } else {
    bBuf = (bBuf.charAt(0) === "-") ? bBuf.slice(1) : "-" + bBuf;
  }
}

function drawMenuButton() {
  drawBtn(4, 4, 66, 26, "MENU", col(70, 60, 90));
  if (wasClicked(4, 4, 66, 26)) {
    screenState = "menu"; mainMode = null; subMode = null;
  }
}

function formatClock() {
  var capped = min(gameClockSeconds, GAME_END_SECONDS);
  var mm = floor(capped / 60);
  var ss = floor(capped % 60);
  return (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss;
}

function drawClockBox() {
  fill(0, 0, 0); stroke(255, 220, 40); strokeWeight(2);
  rect(330, 4, 66, 26, 4);
  fill(255, 230, 60); noStroke(); textSize(16); textAlign(CENTER);
  text(formatClock(), 363, 21);
}

function drawScoreboard() {
  fill(0, 0, 0); stroke(255, 220, 40); strokeWeight(2);
  rect(74, 4, 252, 26, 4);

  // Team A — from center outward: score | code | color | flag
  fill(0, 255, 0); noStroke(); textSize(15); textAlign(RIGHT);
  text(scoreA, 192, 23);
  fill(210); noStroke(); textSize(13); textAlign(CENTER);
  text(countries[teamAIdx].code, 164, 22);
  var cA = countries[teamAIdx].color;
  fill(cA[0], cA[1], cA[2]); stroke(255); strokeWeight(1.5);
  ellipse(130, 17, 14, 14);
  drawFlag(teamAIdx, 98, 17, 15);
  noFill(); stroke(255); strokeWeight(1);
  rect(98 - 7.5, 17 - 7.5, 15, 15);

  fill(255); noStroke(); textSize(15); textAlign(CENTER);
  text(":", 200, 23);

  // Team B — mirror of A
  fill(0, 255, 0); noStroke(); textSize(15); textAlign(LEFT);
  text(scoreB, 208, 23);
  fill(210); noStroke(); textSize(13); textAlign(CENTER);
  text(countries[teamBIdx].code, 236, 22);
  var cB = countries[teamBIdx].color;
  fill(cB[0], cB[1], cB[2]); stroke(255); strokeWeight(1.5);
  ellipse(270, 17, 14, 14);
  drawFlag(teamBIdx, 302, 17, 15);
  noFill(); stroke(255); strokeWeight(1);
  rect(302 - 7.5, 17 - 7.5, 15, 15);

  drawClockBox();
}

// Penalty spot (12 yards from the goal line) and arc (10-yard radius from
// that spot), scaled in proportion to the goalie box's own 3-unit depth as
// if that depth represents the real 18-yard penalty box -- only the part
// of the arc that bulges out beyond the box edge is drawn, same as the
// real "D" marking. yOffsetPx lets this slide in sync with the goal
// during the breakaway entrance animation.
function drawPenaltySpotAndArc(yOffsetPx) {
  var spotGY = GY_MAX - (12 / 18) * 3;
  var spotPx = gridSX(0), spotPy = gridSY(spotGY) + yOffsetPx;

  fill(255); noStroke();
  ellipse(spotPx, spotPy, 4, 4);

  var arcRadiusUnits = (10 / 18) * 3;
  var edgeOffsetUnits = 3 - (12 / 18) * 3;
  var halfSpanDeg = asin(constrain(edgeOffsetUnits / arcRadiusUnits, -1, 1));
  var arcDiamPx = arcRadiusUnits * UNIT_PX * 2;

  noFill(); stroke(255, 255, 255, 220); strokeWeight(1);
  arc(spotPx, spotPy, arcDiamPx, arcDiamPx, halfSpanDeg, 180 - halfSpanDeg);
}

function drawField() {
  ensureFieldGrid();
  var xB = FIELD_XB, yB = FIELD_YB;

  fill(10, 60, 20); noStroke();
  rect(0, FY1 - 6, 400, FIELD_Y0 - FY1 + 12);

  noStroke();

  for (var gy = GY_MIN; gy < GY_MAX; gy++) {
    var rowIdx = gy - GY_MIN;
    var cellTopY = yB[rowIdx + 1], cellBotY = yB[rowIdx];
    for (var gx = GX_MIN; gx < GX_MAX; gx++) {
      var cellLeftX = xB[gx - GX_MIN], cellRightX = xB[gx - GX_MIN + 1];
      fill((gx + gy) % 2 === 0 ? 28 : 38, (gx + gy) % 2 === 0 ? 118 : 150, (gx + gy) % 2 === 0 ? 42 : 56);
      rect(cellLeftX, cellTopY, cellRightX - cellLeftX, cellBotY - cellTopY);
    }
  }

  noFill(); stroke(255); strokeWeight(2);
  rect(FX1, FY1, FX2 - FX1, FIELD_Y0 - FY1);

  if (goalUnlocked() || screenState === "enemyPossession") {
    var goalLeftPx = xB[-3 - GX_MIN], goalRightPx = xB[3 - GX_MIN];
    drawGoalNet(goalLeftPx, goalRightPx, 32, FY1);
    fill(210); stroke(160); strokeWeight(2);
    rect(goalLeftPx, FY1 - 9, goalRightPx - goalLeftPx, 9);

    fill(200, 200, 205); stroke(120); strokeWeight(1.5);
    ellipse(goalLeftPx, FY1 - 4.5, 10, 10);
    ellipse(goalRightPx, FY1 - 4.5, 10, 10);

    // The goalie box -- 1 coordinate point outside each post, 3 points
    // deep -- drawn the same for both the user's and the enemy's shots,
    // since they share this same goal/field rendering either way.
    noFill(); stroke(255, 255, 255, 220); strokeWeight(1);
    beginShape();
    vertex(gridSX(-4), gridSY(GY_MAX));
    vertex(gridSX(-4), gridSY(GY_MAX - 3));
    vertex(gridSX(4), gridSY(GY_MAX - 3));
    vertex(gridSX(4), gridSY(GY_MAX));
    endShape();

    drawPenaltySpotAndArc(0);
  }

  if (screenState === "input" || screenState === "moving") {

    stroke(255, 255, 255, 35); strokeWeight(0.5);
    for (var xi = GX_MIN; xi <= GX_MAX; xi++) line(gridSX(xi), FY1, gridSX(xi), FIELD_Y0);
    for (var yi = GY_MIN; yi <= GY_MAX; yi++) line(FX1, gridSY(yi), FX2, gridSY(yi));

    if (subMode !== "hard") {
      stroke(0, 0, 0, 160); strokeWeight(1);
      line(gridSX(0), FY1, gridSX(0), FIELD_Y0);
      line(FX1, gridSY(0), FX2, gridSY(0));
    }
  }

  var skipLabels = screenState === "revealLine" || screenState === "kicking" || screenState === "shootFlight" || screenState === "postHit" || screenState === "saved" || screenState === "blocked" || screenState === "celebrate";
  if (!skipLabels) {

    noStroke(); fill(255); textSize(11);
    textAlign(CENTER);
    for (var xi2 = GX_MIN; xi2 <= GX_MAX; xi2++) {
      text(dispX(xi2), constrain(xB[xi2 - GX_MIN], 8, 392), FIELD_Y0 + 15);
    }

    textAlign(RIGHT);
    for (var yi2 = GY_MIN; yi2 <= GY_MAX; yi2 += 1) text(dispY(yi2), FX1 - 6, yB[yi2 - GY_MIN] + 4);
  }
}

function drawPentagonPatch(cx, cy, r, rotationDeg) {
  beginShape();
  for (var a = 0; a < 360; a += 72) {
    vertex(cx + r * cos(a + rotationDeg - 90), cy + r * sin(a + rotationDeg - 90));
  }
  endShape(CLOSE);
}

function drawBall(x, y) {
  fill(255); stroke(30); strokeWeight(1.5);
  ellipse(x, y, 14, 14);

  noStroke();
  fill(0, 0, 0, 35);
  ellipse(x + 2, y + 2.5, 11, 11);
  fill(255, 255, 255, 90);
  ellipse(x - 3, y - 3, 5, 5);

  fill(35); noStroke();
  drawPentagonPatch(x, y, 2.6, 0);
  drawPentagonPatch(x - 4.2, y - 2.6, 1.7, 30);
  drawPentagonPatch(x + 4.2, y - 2.2, 1.7, 65);
  drawPentagonPatch(x - 0.6, y + 4.6, 1.7, 110);
}

function drawBallFading(x, y, alpha) {
  var a = constrain(alpha, 0, 255);
  fill(255, 255, 255, a); stroke(30, 30, 30, a); strokeWeight(1.5);
  ellipse(x, y, 14, 14);
  noStroke();
  fill(0, 0, 0, round(35 * a / 255));
  ellipse(x + 2, y + 2.5, 11, 11);
  fill(255, 255, 255, round(90 * a / 255));
  ellipse(x - 3, y - 3, 5, 5);
  fill(35, 35, 35, a); noStroke();
  drawPentagonPatch(x, y, 2.6, 0);
  drawPentagonPatch(x - 4.2, y - 2.6, 1.7, 30);
  drawPentagonPatch(x + 4.2, y - 2.2, 1.7, 65);
  drawPentagonPatch(x - 0.6, y + 4.6, 1.7, 110);
}

function drawPostPop(px, py, t) {
  if (t >= 1) return;
  var r = lerp(3, 16, t);
  var a = lerp(230, 0, t);
  noFill(); stroke(255, 240, 120, a); strokeWeight(3);
  ellipse(px, py, r * 2, r * 2);
}

function drawWindMarkers(x, y, dx, dy, speedFrac) {
  var mag = sqrt(dx * dx + dy * dy);
  if (mag < 0.01) return;
  var ux = dx / mag, uy = dy / mag;
  var px = -uy, py = ux;
  var sf = constrain(speedFrac, 0, 1);
  var count = round(lerp(1, 5, sf));
  var len = lerp(4, 15, sf);
  strokeWeight(lerp(1, 2.2, sf));
  for (var i = 0; i < count; i++) {
    var lateral = (i - (count - 1) / 2) * 4;
    var lx = x + px * lateral, ly = y + py * lateral;
    var trail = len + i * 1.5;
    stroke(255, 255, 255, lerp(70, 210, sf));
    line(lx - ux * 4, ly - uy * 4, lx - ux * (4 + trail), ly - uy * (4 + trail));
  }
  noStroke();
}

function speedFracFromPixelsPerFrame(pxPerFrame) {
  return constrain(map(pxPerFrame, 2, 18, 0, 1), 0, 1);
}

function drawPlayerCircle(x, y, countryIdx) {
  var s = 21;
  var c = countries[countryIdx].color;
  fill(c[0], c[1], c[2]); stroke(255); strokeWeight(1.5);
  ellipse(x, y, s, s);
}

function drawGoalie(x, y, countryIdx) {
  var s = 26;
  var c = countries[countryIdx].color;
  fill(c[0], c[1], c[2]); stroke(255); strokeWeight(2);
  ellipse(x, y, s, s);
  noFill(); stroke(255); strokeWeight(1);
  ellipse(x, y, 14, 14);
}

function drawRotatedRect(bx, by, c, s, x, y, w, h) {
  var x2 = x + w, y2 = y + h;
  beginShape();
  vertex(bx + x * c - y * s, by + x * s + y * c);
  vertex(bx + x2 * c - y * s, by + x2 * s + y * c);
  vertex(bx + x2 * c - y2 * s, by + x2 * s + y2 * c);
  vertex(bx + x * c - y2 * s, by + x * s + y2 * c);
  endShape(CLOSE);
}

function drawRotatedTipSlice(bx, by, c, s, baseY, frac) {
  var topY = baseY - 14 * frac;
  var topHalfW = 10 * (1 - frac);
  beginShape();
  vertex(bx + -10 * c - baseY * s, by + -10 * s + baseY * c);
  vertex(bx + 10 * c - baseY * s, by + 10 * s + baseY * c);
  vertex(bx + topHalfW * c - topY * s, by + topHalfW * s + topY * c);
  vertex(bx + -topHalfW * c - topY * s, by + -topHalfW * s + topY * c);
  endShape(CLOSE);
}

function drawPivotArrow(angleDeg, powerFracOrNull, originPx) {

  var bx = originPx ? originPx.x : gridSX(dribX);
  var by = originPx ? originPx.y : gridSY(dribY);
  var shaftLen = 50;
  var tipLen = 14;
  var c = cos(angleDeg), s = sin(angleDeg);
  var tx1 = bx + -10 * c - -shaftLen * s, ty1 = by + -10 * s + -shaftLen * c;
  var tx2 = bx + 10 * c - -shaftLen * s, ty2 = by + 10 * s + -shaftLen * c;
  var tipY = -shaftLen - tipLen;
  var tx3 = bx + 0 * c - tipY * s, ty3 = by + 0 * s + tipY * c;

  if (powerFracOrNull === null) {
    stroke(0); strokeWeight(1.5); fill(255, 220, 40);
    drawRotatedRect(bx, by, c, s, -4, -shaftLen, 8, shaftLen);
    triangle(tx1, ty1, tx2, ty2, tx3, ty3);
  } else {
    var totalLen = shaftLen + tipLen;
    var filledLen = powerFracOrNull * totalLen;
    var filledShaftH = min(filledLen, shaftLen);
    var tipFrac = constrain((filledLen - shaftLen) / tipLen, 0, 1);
    var fr = lerp(220, 40, powerFracOrNull), fg = lerp(40, 220, powerFracOrNull);

    fill(fr, fg, 40); noStroke();
    drawRotatedRect(bx, by, c, s, -4, -filledShaftH, 8, filledShaftH);
    if (tipFrac > 0) drawRotatedTipSlice(bx, by, c, s, -shaftLen, tipFrac);

    stroke(0); strokeWeight(1.5); noFill();
    drawRotatedRect(bx, by, c, s, -4, -shaftLen, 8, shaftLen);
    triangle(tx1, ty1, tx2, ty2, tx3, ty3);
  }
}

function drawShootoutBase() {
  drawField();
  drawOtherFieldPlayers();
  drawGoalie(gridSX(keeperX), gridSY(GY_MAX), defenderColor());
  var dpx = gridSX(dribX), dpy = gridSY(dribY);
  drawPlayerCircle(dpx, dpy, attackerColor());
  drawBall(dpx + 6, dpy - 6);
  return { x: dpx, y: dpy };
}

function drawShootoutFlight(bx, by) {
  drawField();
  drawOtherFieldPlayers();
  drawGoalie(gridSX(keeperX), gridSY(GY_MAX), defenderColor());
  var dpx = gridSX(dribX), dpy = gridSY(dribY);
  drawPlayerCircle(dpx, dpy, attackerColor());
  var sx = gridSX(bx), sy = gridSY(by);

  drawWindMarkers(sx, sy, gridSX(shootEndX) - gridSX(shootStartX), gridSY(shootEndY) - gridSY(shootStartY), shotPower);
  drawBall(sx, sy);
  return { x: dpx, y: dpy };
}

function drawShootoutPanel(msg) {
  fill(10, 10, 40); noStroke();
  rect(0, FY2 + 1, 400, 400 - (FY2 + 1));
  fill(200, 220, 255); textSize(15); textAlign(CENTER);
  text("Distance to goal: " + (round((GY_MAX - dribY) * 10) / 10) + " units", 200, FY2 + 30);
  fill(255); textSize(16); textAlign(CENTER);
  text(msg, 200, FY2 + 85);
}

function drawEquationReadout(topY) {
  var isProp = mainMode === "proportional";
  var boxY = topY, boxW = 40, boxH = 40, midY = boxY + boxH / 2;
  var eqTextY = boxY + 24;
  var gap = 5, gapToFrac = 14;

  ensureEquationLabelWidths();
  textSize(18);
  var yEqLabel = "y =", xPlusLabel = "x +";
  var yEqW = YEQ_W, xPlusW = XPLUS_W;
  var totalW = yEqW + gapToFrac + boxW + gap + xPlusW + gap + boxW;
  var groupStartX = 200 - totalW / 2;

  var yEqX = groupStartX + yEqW / 2;
  var mBoxX = groupStartX + yEqW + gapToFrac;
  var signX = groupStartX + yEqW + gapToFrac / 2;
  var xPlusX = mBoxX + boxW + gap + xPlusW / 2;
  var bBoxX = xPlusX + xPlusW / 2 + gap;

  fill(120, 255, 120); noStroke(); textSize(18); textAlign(CENTER);
  text(yEqLabel, yEqX, eqTextY);

  if (mNumSign < 0) {
    fill(255, 90, 90); noStroke(); textSize(20); textAlign(CENTER);
    text("-", signX, midY + 6);
  }

  fill(255); stroke(0); strokeWeight(1);
  rect(mBoxX, boxY, boxW, boxH / 2);
  rect(mBoxX, midY, boxW, boxH / 2);
  stroke(0); strokeWeight(1.5);
  line(mBoxX + 4, midY, mBoxX + boxW - 4, midY);

  fill(0); noStroke(); textSize(15); textAlign(CENTER);
  text(mNumDigit === "" ? "_" : mNumDigit, mBoxX + boxW / 2, boxY + boxH / 4 + 5);
  text(mDenDigit === "" ? "_" : mDenDigit, mBoxX + boxW / 2, midY + boxH / 4 + 5);

  fill(120, 255, 120); noStroke(); textSize(18); textAlign(CENTER);
  text(xPlusLabel, xPlusX, eqTextY);

  fill(255); stroke(0); strokeWeight(1);
  rect(bBoxX, boxY, 40, 40);
  fill(0); noStroke();
  text(isProp ? "0" : (bBuf.length ? bBuf : "_"), bBoxX + 20, eqTextY);
}

function drawKickFlight(bx, by) {
  drawField();
  var defC = defenderColor();
  var atkC = attackerColor();

  for (var i = 0; i < opponents.length; i++) {
    var o = opponents[i];
    drawPlayerCircle(gridSX(o.x), gridSY(o.y), defC);
  }
  if (goalUnlocked()) drawGoalie(gridSX(goalieX), gridSY(GY_MAX), defC);
  for (var j = 0; j < teammates.length; j++) {
    var t = teammates[j];
    drawPlayerCircle(gridSX(t.x), gridSY(t.y), atkC);
  }

  stroke(255, 255, 0); strokeWeight(2.5);
  drawFieldClippedLine(kickM, kickB, kickVertical);

  var kbx = gridSX(bx), kby = gridSY(by);
  var kEndX = gridSX(kickStopX), kEndY = gridSY(kickEndY);
  var kStartX = gridSX(0), kStartY = gridSY(ballB);
  var kDist = dist(kStartX, kStartY, kEndX, kEndY);
  drawWindMarkers(kbx, kby, kEndX - kStartX, kEndY - kStartY, speedFracFromPixelsPerFrame(kDist / kickDuration));
  drawBall(kbx, kby);

  fill(10, 10, 40); noStroke();
  rect(0, FY2 + 1, 400, 400 - (FY2 + 1));
  drawEquationReadout(FY2 + 24);
}

function drawScene() {
  drawField();

  var defC = defenderColor();
  var atkC = attackerColor();

  for (var i = 0; i < opponents.length; i++) {
    var o = opponents[i];
    drawPlayerCircle(gridSX(o.x), gridSY(o.y), defC);
  }
  if (goalUnlocked()) drawGoalie(gridSX(goalieX), gridSY(GY_MAX), defC);

  // Every player circle (including the ball-holder) is drawn first, in
  // one pass, before any coordinate label -- otherwise a later player's
  // circle can be drawn right on top of an earlier teammate's label,
  // covering it up.
  var teammatePx = [];
  for (var j = 0; j < teammates.length; j++) {
    var t = teammates[j];
    var tLx = gridSX(t.x), tLy = gridSY(t.y);
    teammatePx.push({ x: tLx, y: tLy });
    drawPlayerCircle(tLx, tLy, atkC);
  }

  var ballPx = gridSX(0), ballPy = gridSY(ballB);
  drawPlayerCircle(ballPx, ballPy, atkC);
  drawBall(ballPx, ballPy);

  if (screenState === "input") {
    var placedLabelRects = [];
    for (var j2 = 0; j2 < teammates.length; j2++) {
      var t2 = teammates[j2];
      var tLx2 = teammatePx[j2].x, tLy2 = teammatePx[j2].y;
      var tGoLeft = tLx2 > 360;
      var tLabel = "(" + dispX(t2.x) + "," + dispY(t2.y) + ")";
      noStroke(); textSize(13); textAlign(tGoLeft ? RIGHT : LEFT);
      var tW = textWidth(tLabel) + 6, tH = 15;

      var tGoUp = tLy2 < 24;
      var tTx = tGoLeft ? tLx2 - 12 : tLx2 + 12, tTy = tGoUp ? tLy2 + 12 : tLy2 - 3;
      var boxX = tGoLeft ? tTx - tW + 3 : tTx - 3, boxY = tTy - 11;
      // If this label's box would overlap one already placed for an
      // earlier teammate, nudge it straight down (re-checking against all
      // of them) until it's clear, instead of letting nearby teammates'
      // coordinate readouts stack on top of each other illegibly.
      var nudgeTries = 0;
      while (nudgeTries < 12) {
        var overlapsAny = false;
        for (var pr = 0; pr < placedLabelRects.length; pr++) {
          var other = placedLabelRects[pr];
          if (boxX < other.x + other.w && boxX + tW > other.x &&
              boxY < other.y + other.h && boxY + tH > other.y) {
            overlapsAny = true;
            break;
          }
        }
        if (!overlapsAny) break;
        boxY += tH + 2;
        nudgeTries++;
      }
      boxY = constrain(boxY, 2, 400 - tH - 2);
      tTy = boxY + 11;
      placedLabelRects.push({ x: boxX, y: boxY, w: tW, h: tH });

      fill(255, 255, 255, 215); rect(boxX, boxY, tW, tH, 2);
      fill(0);
      text(tLabel, tTx, tTy);
    }
  }

  if (screenState === "input" && !(subMode === "hard" && mainMode !== "proportional")) {
    var ballLabel = "ball: (" + dispX(0) + "," + dispY(ballB) + ")";
    var ballLx = ballPx + 10, ballLy = ballPy + 14;
    noStroke(); textSize(12); textAlign(LEFT);
    fill(0, 0, 0, 170); rect(ballLx - 3, ballLy - 13, textWidth(ballLabel) + 8, 17, 2);
    fill(130, 255, 225);
    text(ballLabel, ballLx, ballLy);
  }

  if (screenState === "input" && liveView()) {
    var eq = getTypedEquation();
    if (eq) {
      stroke(255, 255, 0); strokeWeight(2.5);
      drawFieldClippedLine(eq.m, eq.b, eq.vertical);
    }
  }
}

function drawLerpedGroup(oldArr, newArr, c, t) {
  for (var i = 0; i < oldArr.length; i++) {
    var lx = lerp(oldArr[i].x, newArr[i].x, t);
    var ly = lerp(oldArr[i].y, newArr[i].y, t);
    drawPlayerCircle(gridSX(lx), gridSY(ly), c);
  }
}

function drawTransitionScene(t) {
  highlightRow = lerp(oldBallB, pendingBallB, t);
  drawField();

  var defC = defenderColor();
  var atkC = attackerColor();

  drawLerpedGroup(oldOpponents, pendingOpponents, defC, t);
  if (goalUnlocked()) drawGoalie(gridSX(lerp(oldGoalieX, pendingGoalieX, t)), gridSY(GY_MAX), defC);
  drawLerpedGroup(oldTeammates, pendingTeammates, atkC, t);

  drawPlayerCircle(gridSX(0), gridSY(highlightRow), atkC);
  drawBall(gridSX(0), gridSY(highlightRow));

  fill(255); noStroke(); textSize(11); textAlign(CENTER);
  text("Players repositioning...", 200, FY1 + 16);
}

function turnStatusText() {
  var who = attackingTeam === "A" ? "" : (vsComputer() ? "COMPUTER'S TURN" : "PLAYER 2'S TURN");
  if (target.type === "shoot") return (who ? who + " -- " : "") + "FINAL ATTEMPT - SHOOT!";
  return who;
}

// An on-screen number pad for entering the equation -- there's no spare
// room left below the equation boxes/buttons (they already run almost to
// the bottom of the canvas), so this overlays the lower part of the field
// instead, where there's plenty of room. Needed because the only other
// way to type a digit is a physical keyboard, which a phone doesn't have.
var keyboardOpen = false;

function drawKeyboardButton() {
  var bx = 4, by = 370, bw = 80, bh = 26;
  drawBtn(bx, by, bw, bh, "KEYBOARD", keyboardOpen ? col(20, 130, 90) : col(70, 60, 90));
  if (wasClicked(bx, by, bw, bh)) keyboardOpen = !keyboardOpen;
}

// Sits above the equation panel but below the field's y-axis number
// labels, as an overlay -- nothing else on screen shifts when it opens or
// closes, since it's just drawn on top of (not laid out alongside) what's
// already there.
function drawNumberRow() {
  if (!keyboardOpen) return;
  var cellW = 34, cellH = 32, gap = 4;
  var gridW = 10 * cellW + 9 * gap;
  var startX = 200 - gridW / 2;
  var startY = FIELD_Y0 - cellH - 8;

  fill(0, 0, 0, 175); noStroke();
  rect(startX - 8, startY - 8, gridW + 16, cellH + 16, 8);

  for (var i = 0; i < 10; i++) {
    var bx = startX + i * (cellW + gap);
    var over = mouseX > bx && mouseX < bx + cellW && mouseY > startY && mouseY < startY + cellH;
    fill(over ? 255 : 235); stroke(0); strokeWeight(1);
    rect(bx, startY, cellW, cellH, 5);
    fill(0); noStroke(); textSize(16); textAlign(CENTER);
    text(i, bx + cellW / 2, startY + cellH / 2 + 5);
    if (wasClicked(bx, startY, cellW, cellH)) appendChar("" + i);
  }
}

function drawInputPanel() {
  fill(10, 10, 40); noStroke();
  rect(0, FY2 + 1, 400, 400 - (FY2 + 1));

  fill(255, 220, 40); textSize(11); textAlign(CENTER);
  text(turnStatusText(), 200, FY2 + 12);

  var isProp = mainMode === "proportional";
  var boxY = FY2 + 24, boxW = 40, boxH = 40, midY = boxY + boxH / 2;
  var eqTextY = boxY + 24;
  var gap = 5;

  var gapToFrac = 14;

  ensureEquationLabelWidths();
  textSize(18);
  var yEqLabel = "y =", xPlusLabel = "x +";
  var yEqW = YEQ_W, xPlusW = XPLUS_W;
  var totalW = yEqW + gapToFrac + boxW + gap + xPlusW + gap + boxW;
  var groupStartX = 200 - totalW / 2;

  var yEqX = groupStartX + yEqW / 2;
  var mBoxX = groupStartX + yEqW + gapToFrac;
  var signX = groupStartX + yEqW + gapToFrac / 2;
  var xPlusX = mBoxX + boxW + gap + xPlusW / 2;
  var bBoxX = xPlusX + xPlusW / 2 + gap;

  fill(120, 255, 120); textSize(18); textAlign(CENTER);
  text(yEqLabel, yEqX, eqTextY);

  if (mNumSign < 0) {
    fill(255, 90, 90); noStroke(); textSize(20); textAlign(CENTER);
    text("-", signX, midY + 6);
  }

  if (activeField === "mNum") fill(255, 255, 0); else fill(255, 255, 255);
  stroke(0); strokeWeight(1);
  rect(mBoxX, boxY, boxW, boxH / 2);
  if (activeField === "mDen") fill(255, 255, 0); else fill(255, 255, 255);
  rect(mBoxX, midY, boxW, boxH / 2);
  stroke(0); strokeWeight(1.5);
  line(mBoxX + 4, midY, mBoxX + boxW - 4, midY);

  fill(0); noStroke(); textSize(15); textAlign(CENTER);
  text(mNumDigit === "" ? "_" : mNumDigit, mBoxX + boxW / 2, boxY + boxH / 4 + 5);
  text(mDenDigit === "" ? "_" : mDenDigit, mBoxX + boxW / 2, midY + boxH / 4 + 5);

  if (wasClicked(mBoxX, boxY, boxW, boxH / 2)) activeField = "mNum";
  if (wasClicked(mBoxX, midY, boxW, boxH / 2)) activeField = "mDen";

  fill(120, 255, 120); noStroke(); textSize(18); textAlign(CENTER);
  text(xPlusLabel, xPlusX, eqTextY);

  if (isProp) {
    fill(150);
    stroke(100); strokeWeight(1);
    rect(bBoxX, boxY, 40, 40);
    fill(220); noStroke();
    text("0", bBoxX + 20, eqTextY);
  } else {
    if (activeField === "b") fill(255, 255, 0); else fill(255, 255, 255);
    stroke(0); strokeWeight(1);
    rect(bBoxX, boxY, 40, 40);
    fill(0); noStroke();

    textSize(bBuf.length > 2 ? 13 : 18);
    text(bBuf.length ? bBuf : "_", bBoxX + 20, eqTextY);
    if (wasClicked(bBoxX, boxY, 40, 40)) activeField = "b";
  }

  var negNow = (activeField === "b") ? (bBuf.charAt(0) === "-") : (mNumSign < 0);
  var btnY = boxY + boxH + 8;
  var signBtnH = 28;

  var signBtnW = SIGN_BTN_W;
  var kickBtnW = 68, btnGap = 30;
  var signBtnX = 200 - (signBtnW + btnGap + kickBtnW) / 2;
  var kickBtnX = signBtnX + signBtnW + btnGap;
  drawSolidBtn(signBtnX, btnY, signBtnW, signBtnH, negNow ? "MAKE POSITIVE" : "MAKE NEGATIVE", negNow ? col(30, 150, 30) : col(180, 40, 40));
  if (wasClicked(signBtnX, btnY, signBtnW, signBtnH)) toggleSign();

  drawBtn(kickBtnX, btnY, kickBtnW, signBtnH, "KICK!", allBoxesFilled() ? col(200, 130, 0) : col(90, 90, 90));
  if (wasClicked(kickBtnX, btnY, kickBtnW, signBtnH)) resolveKick();
}

function drawFeedbackOverlay() {
  textSize(22); textStyle(BOLD); textAlign(CENTER);
  // A message with a colon (e.g. "BAD PASS: INCORRECT SLOPE") splits
  // onto two lines instead of running together on one.
  var colonAt = feedbackText.indexOf(":");
  var line1 = colonAt >= 0 ? feedbackText.slice(0, colonAt) : feedbackText;
  var line2 = colonAt >= 0 ? feedbackText.slice(colonAt + 1).trim() : null;

  var boxW = max(textWidth(line1), line2 ? textWidth(line2) : 0) + 32;
  var boxH = line2 ? 70 : 50;
  var boxX = 200 - boxW / 2, boxY = 150 - boxH / 2;
  fill(150, 0, 0); noStroke();
  rect(boxX, boxY, boxW, boxH, 10);

  fill(255);
  if (line2) {
    text(line1, 200, 150 - 6);
    text(line2, 200, 150 + 20);
  } else {
    text(line1, 200, 150 + 7);
  }
  textStyle(NORMAL);
}

function updateDrawWCConfetti() {
  for (var s = 0; s < 5; s++) {
    wcConfetti.push({
      x: random(0, 400), y: random(-15, 0),
      vx: random(-1.4, 1.4), vy: random(2.5, 5.5),
      w: random(6, 13), h: random(3, 7),
      phase: random(0, 360),
      c: confettiColors[randInt(0, confettiColors.length - 1)]
    });
  }
  while (wcConfetti.length > 160) wcConfetti.shift();
  for (var i = wcConfetti.length - 1; i >= 0; i--) {
    var p = wcConfetti[i];
    p.x += p.vx + cos(frameCount * 3 + p.phase) * 0.5;
    p.y += p.vy; p.vy = min(p.vy + 0.05, 6.5);
    fill(p.c.r, p.c.g, p.c.b, 210); noStroke();
    rect(p.x, p.y, p.w, p.h, 1);
    if (p.y > 415) { wcConfetti.splice(i, 1); }
  }
}

function drawGameOver() {
  background(8, 10, 30);

  noStroke();
  for (var i = 0; i < 9; i++) {
    var t = frameCount * 0.007 + i * 0.7;
    var ox = 200 + cos(t + i * 0.44) * (95 + i * 12);
    var oy = 195 + sin(t * 0.62 + i * 0.65) * (72 + i * 9);
    fill(150 + i * 11, 170 + i * 6, 255, 10 + i * 2);
    ellipse(ox, oy, 26 + i * 7, 26 + i * 7);
  }

  // ── WORLD CUP CHAMPION: full custom screen ─────────────────
  if (tournamentMode && tRound === 2 && scoreA >= scoreB) {
    updateDrawWCConfetti();

    // Large flag centered
    var fs = 90;
    drawFlag(teamAIdx, 200, 108, fs);
    noFill(); stroke(255, 215, 0, 200); strokeWeight(2.5);
    rect(200 - fs / 2, 108 - fs / 2, fs, fs, 6);

    fill(200, 200, 200); noStroke(); textSize(12); textAlign(CENTER);
    text(countries[teamAIdx].name.toUpperCase(), 200, 168);

    // Decorative star row
    fill(255, 200, 40); noStroke(); textSize(13); textAlign(CENTER);
    text("★   ★   ★   ★   ★", 200, 186);

    // "YOU WON THE" — bold white with gold shadow
    textStyle(BOLD);
    fill(90, 60, 0); noStroke(); textSize(24); textAlign(CENTER);
    text("YOU WON THE", 202, 215);
    fill(255, 255, 255); textSize(24);
    text("YOU WON THE", 200, 213);

    // "WORLD CUP!" — large gold with dark shadow + glow
    fill(80, 50, 0); textSize(48);
    text("WORLD CUP!", 203, 265);
    fill(255, 180, 0, 120); textSize(50);
    text("WORLD CUP!", 200, 264);
    fill(255, 220, 40); textSize(48);
    text("WORLD CUP!", 200, 262);
    textStyle(NORMAL);

    // Bottom star row
    fill(255, 200, 40); noStroke(); textSize(13); textAlign(CENTER);
    text("★   ★   ★   ★   ★", 200, 282);

    var btnW = 144, btnH = 40, btnGap = 14, btnY = 342;
    var leftBtnX = 200 - btnW - btnGap / 2;
    var rightBtnX = 200 + btnGap / 2;
    drawBtn(leftBtnX, btnY, btnW, btnH, "MENU", col(90, 90, 95));
    if (wasClicked(leftBtnX, btnY, btnW, btnH)) {
      wcConfetti = []; tournamentMode = false; screenState = "menu"; mainMode = null; subMode = null;
    }
    drawBtn(rightBtnX, btnY, btnW, btnH, "PLAY AGAIN", col(30, 150, 30));
    if (wasClicked(rightBtnX, btnY, btnW, btnH) || keyTapped) { wcConfetti = []; startTournament(); }
    return;
  }
  // ───────────────────────────────────────────────────────────

  fill(255, 220, 40); noStroke(); textSize(36); textAlign(CENTER);
  text("FULL TIME", 200, 55);
  stroke(255, 220, 40, 120); strokeWeight(1);
  line(50, 70, 350, 70);

  var fs = 64, flagAX = 90, flagBX = 310, flagY = 140;
  drawFlag(teamAIdx, flagAX, flagY, fs);
  noFill(); stroke(255, 255, 255, 160); strokeWeight(1.5);
  rect(flagAX - fs / 2, flagY - fs / 2, fs, fs, 4);

  drawFlag(teamBIdx, flagBX, flagY, fs);
  noFill(); stroke(255, 255, 255, 160); strokeWeight(1.5);
  rect(flagBX - fs / 2, flagY - fs / 2, fs, fs, 4);

  fill(210); noStroke(); textSize(14); textAlign(CENTER);
  text(countries[teamAIdx].name, flagAX, flagY + fs / 2 + 18);
  text(countries[teamBIdx].name, flagBX, flagY + fs / 2 + 18);

  fill(255); textSize(50); textAlign(CENTER);
  text(scoreA + "  -  " + scoreB, 200, 236);

  var btnW = 144, btnH = 44, btnGap = 14;
  var btnY = 338;
  var leftBtnX = 200 - btnW - btnGap / 2;
  var rightBtnX = 200 + btnGap / 2;

  if (tournamentMode) {
    var playerWon = scoreA >= scoreB;
    textSize(20); textAlign(CENTER);
    if (playerWon) {
      var nextRoundName = tRound === 0 ? "SEMI-FINALS" : "FINAL";
      fill(100, 255, 120); textSize(18);
      text("YOU WIN!", 200, 264);
      text("ADVANCING TO THE " + nextRoundName, 200, 290);
      drawBtn(200 - 90, btnY, 180, btnH, "CONTINUE", col(30, 150, 30));
      if (wasClicked(200 - 90, btnY, 180, btnH) || keyTapped) advanceTournament();
    } else {
      fill(255, 110, 90); textSize(20);
      text("ELIMINATED FROM", 200, 264);
      text("THE WORLD CUP", 200, 290);
      drawBtn(leftBtnX, btnY, btnW, btnH, "MENU", col(90, 90, 95));
      if (wasClicked(leftBtnX, btnY, btnW, btnH)) {
        tournamentMode = false; screenState = "menu"; mainMode = null; subMode = null;
      }
      drawBtn(rightBtnX, btnY, btnW, btnH, "PLAY AGAIN", col(30, 150, 30));
      if (wasClicked(rightBtnX, btnY, btnW, btnH) || keyTapped) startTournament();
    }
  } else {
    textSize(20); textAlign(CENTER);
    if (scoreA > scoreB) {
      fill(100, 255, 120);
      text(countries[teamAIdx].name.toUpperCase() + " WINS!", 200, 274);
    } else if (scoreA < scoreB) {
      fill(255, 110, 90);
      text(countries[teamBIdx].name.toUpperCase() + " WINS!", 200, 274);
    } else {
      fill(255, 220, 60);
      text("IT'S A DRAW!", 200, 274);
    }
    drawBtn(leftBtnX, btnY, btnW, btnH, "MENU", col(90, 90, 95));
    if (wasClicked(leftBtnX, btnY, btnW, btnH)) {
      screenState = "menu"; mainMode = null; subMode = null;
    }
    drawBtn(rightBtnX, btnY, btnW, btnH, "PLAY AGAIN", col(30, 150, 30));
    if (wasClicked(rightBtnX, btnY, btnW, btnH) || keyTapped) startMatch();
  }
}

function draw() {
  background(8, 10, 30);

  if (screenState === "menu") {
    drawMenuScreen();
    prevMouse = mouseIsPressed;
    tappedX = null; tappedY = null; keyTapped = false;
    return;
  }

  if (screenState === "over") {
    drawGameOver();
    prevMouse = mouseIsPressed;
    tappedX = null; tappedY = null; keyTapped = false;
    return;
  }

  if (screenState === "bracket") {
    drawBracketScreen();
    if (tappedX !== null || keyTapped) {
      startMatch();
    }
    prevMouse = mouseIsPressed;
    tappedX = null; tappedY = null; keyTapped = false;
    return;
  }

  gameClockSeconds += 50 / 60;

  if (screenState !== "celebrate") {
    if (gameClockSeconds >= GAME_END_SECONDS) {
      gameClockSeconds = GAME_END_SECONDS;
      screenState = "over";
    }
    if (scoreA >= GOAL_LIMIT || scoreB >= GOAL_LIMIT) {
      screenState = "over";
    }
  }

  var shaking = screenShakeTimer > 0;
  if (shaking) {
    push();
    translate(random(-6, 6), random(-6, 6));
    screenShakeTimer--;
  }

  drawScoreboard();
  var skipScene = screenState === "moving" || screenState === "revealLine" || screenState === "kicking" ||
    screenState === "aiming" || screenState === "powering" ||
    screenState === "shootFlight" || screenState === "postHit" ||
    screenState === "saved" || screenState === "blocked" ||
    screenState === "enemyPossession" || screenState === "breakaway" ||
    screenState === "celebrate";
  if (!skipScene) drawScene();

  if (screenState === "input") {
    drawInputPanel();
    drawKeyboardButton();
    drawNumberRow();
    handleKeyboard();
  } else if (screenState === "powering") {
    updatePowering();
    var powerOriginPx = drawShootoutBase();
    if (screenState === "powering") {
      drawPivotArrow(0, powerFrac, powerOriginPx);
      drawShootoutPanel("Press SPACE or CLICK to set your power!");
    } else {
      drawPivotArrow(0, shotPower, powerOriginPx);
    }
  } else if (screenState === "aiming") {
    updateAiming();
    var aimOriginPx = drawShootoutBase();
    if (screenState === "aiming") {
      drawPivotArrow(aimAngle, shotPower, aimOriginPx);
      drawShootoutPanel("Press SPACE or CLICK to lock your aim and SHOOT!");
    }
  } else if (screenState === "shootFlight") {
    shootFlightTimer++;
    var sft = constrain(shootFlightTimer / shootFlightDuration, 0, 1);
    var sbx = lerp(shootStartX, shootEndX, sft);
    var sby = lerp(shootStartY, shootEndY, sft);

    var keeperSpeed = 0.14429;
    if (keeperX < sbx) keeperX = min(sbx, keeperX + keeperSpeed);
    else if (keeperX > sbx) keeperX = max(sbx, keeperX - keeperSpeed);

    var flightOriginPx = drawShootoutFlight(sbx, sby);

    drawPivotArrow(shotAimAngle, shotPower, flightOriginPx);
    drawShootoutPanel("Here it goes...");

    var blocker = findShotBlocker(sbx, sby);
    if (blocker && !shootOutcomeDecided) {
      shootOutcomeDecided = true;
      makeBlocked(sbx, sby, blocker.x);
    }

    if (sby > GY_MAX - 0.7 && abs(keeperX - sbx) < 0.56182) {
      shootWasSaved = true;
    }

    if (!shootOutcomeDecided && sft >= 1) {
      shootOutcomeDecided = true;
      if (shootWasSaved) {
        makeSave(sbx, sby);
      } else {
        var ballRadius = BALL_RADIUS_GRID;
        var edgeDist = abs(abs(shootEndX) - 3);
        if (edgeDist <= ballRadius) {
          hitPost();
        } else if (abs(shootEndX) < 3 - ballRadius) {
          finishShoot(true, "GOAL!");
        } else {
          finishShoot(false, "WIDE SHOT");
        }
      }
    }
  } else if (screenState === "postHit") {
    postHitTimer++;
    var pft = constrain(postHitTimer / postHitDuration, 0, 1);
    var bounceDir = postHitX >= 0 ? 1 : -1;
    var bounceX = postHitX + bounceDir * pft * 1.4;
    var bounceY = GY_MAX - pft * 1.6;
    drawField();
    drawOtherFieldPlayers();
    drawGoalie(gridSX(keeperX), gridSY(GY_MAX), defenderColor());
    drawPlayerCircle(gridSX(dribX), gridSY(dribY), attackerColor());
    drawBall(gridSX(bounceX), gridSY(bounceY));
    drawPostPop(gridSX(bounceDir * 3), FY1 - 4.5, postHitTimer / 12);
    drawShootoutPanel("HIT THE POST");
    if (postHitTimer >= postHitDuration) {
      startFeedback("HIT THE POST");
    }
  } else if (screenState === "saved") {

    saveTimer++;
    var svt = constrain(saveTimer / saveDuration, 0, 1);
    var saveBallX, saveBallY;
    if (savePower < 0.35) {
      saveBallX = lerp(saveX, keeperX, min(svt * 2.5, 1));
      saveBallY = lerp(saveY, GY_MAX - 0.15, min(svt * 2.5, 1));
    } else {
      var saveDir = saveX >= 0 ? 1 : -1;
      saveBallX = saveX + saveDir * svt * 2.2;
      saveBallY = saveY - svt * 1.7;
    }
    drawField();
    drawOtherFieldPlayers();
    drawGoalie(gridSX(keeperX), gridSY(GY_MAX), defenderColor());
    drawPlayerCircle(gridSX(dribX), gridSY(dribY), attackerColor());
    drawBall(gridSX(saveBallX), gridSY(saveBallY));
    drawShootoutPanel("SAVED!");
    if (saveTimer >= saveDuration) {
      startFeedback("SAVED!");
    }
  } else if (screenState === "blocked") {

    blockTimer++;
    var bkt = constrain(blockTimer / blockDuration, 0, 1);
    var blockBallX = blockX + blockDirX * bkt * 2.2;
    var blockBallY = blockY - bkt * 1.7;
    drawField();
    drawOtherFieldPlayers();
    drawGoalie(gridSX(keeperX), gridSY(GY_MAX), defenderColor());
    drawPlayerCircle(gridSX(dribX), gridSY(dribY), attackerColor());
    drawBall(gridSX(blockBallX), gridSY(blockBallY));
    drawShootoutPanel("SHOT BLOCKED!");
    if (blockTimer >= blockDuration) {
      startFeedback("SHOT BLOCKED!");
    }
  } else if (screenState === "revealLine") {
    revealLineTimer++;
    drawKickFlight(0, ballB);
    if (revealLineTimer >= revealLineDuration) {
      kickTimer = 0;
      screenState = "kicking";
    }
  } else if (screenState === "kicking") {
    kickTimer++;
    var kt = constrain(kickTimer / kickDuration, 0, 1);
    var curX = lerp(0, kickStopX, kt);
    var curY = lerp(ballB, kickEndY, kt);
    drawKickFlight(curX, curY);
    if (kickTimer >= kickDuration) {
      if (kickIsGoal) {
        if (attackingTeam === "A") scoreA++; else scoreB++;
        var kickPlayers = buildPlayerSnapshot(opponents, defenderColor()).concat(buildPlayerSnapshot(teammates, attackerColor()));
        startCelebration(kickMsg, {
          players: kickPlayers,
          goalie: goalUnlocked() ? { x: goalieX, y: GY_MAX, c: defenderColor() } : null,
          ball: {
              x: kickStopX, y: kickEndY,
              pvx: (gridSX(kickStopX) - gridSX(0)) / max(1, kickDuration),
              pvy: (gridSY(kickEndY) - gridSY(ballB)) / max(1, kickDuration)
            }
        });
      } else if (kickIsGood) {

        passCount++;
        startBreakaway(kickStopX, kickEndY);
      } else {
        startFeedback(kickMsg, kickMsg.indexOf("BAD PASS") === 0 ? 30 : 60);
      }
    }
  } else if (screenState === "moving") {
    animTimer++;
    var moveT = constrain(animTimer / animDuration, 0, 1);
    drawTransitionScene(moveT);
    if (animTimer >= animDuration) {
      teammates = pendingTeammates; opponents = pendingOpponents;
      goalGapX = pendingGoalGapX; goalieX = pendingGoalieX; ballB = pendingBallB;
      highlightRow = ballB;
      resetEquationInput();
      if (isComputerTurn()) {
        startEnemyPossession();
      } else {
        startPossessionAction();
      }
    }
  } else if (screenState === "feedback") {
    if (feedbackScene === "enemy") {
      drawEnemyPossessionScene();
      drawEnemyPossessionPanel();
    } else {
      drawScene();
    }
    drawFeedbackOverlay();
    feedbackTimer--;
    if (mouseIsPressed && !prevMouse) feedbackTimer = 0;
    if (feedbackTimer <= 0) endPossessionSwap();
  } else if (screenState === "enemyPossession") {
    if (!enemyResolving) {
      enemyAnimTimer++;
      updateEnemyPossession();
      // The open-lane early shot was firing as soon as 15 frames into a
      // dribble (0.25s), completely skipping the build-up timer -- removed
      // so the full enemyAnimDuration (4-7s) always plays out first, no
      // matter what.
      if (enemyAnimTimer >= enemyAnimDuration && enemyPhase === "dribble") {
        beginEnemyResolution(false);
      }
    } else {
      updateEnemyResolution();
    }
    drawEnemyPossessionScene();
    drawEnemyPossessionPanel();
  } else if (screenState === "breakaway") {
    updateBreakaway();
    drawBreakawayScene();
  } else if (screenState === "celebrate") {

    drawField();
    if (celebrateSnapshot) {
      for (var csi = 0; csi < celebrateSnapshot.players.length; csi++) {
        var cp = celebrateSnapshot.players[csi];
        drawPlayerCircle(gridSX(cp.x), gridSY(cp.y), cp.c);
      }
      if (celebrateSnapshot.goalie) {
        drawGoalie(gridSX(celebrateSnapshot.goalie.x), gridSY(celebrateSnapshot.goalie.y), celebrateSnapshot.goalie.c);
      }
      var celebElapsed = 60 - celebrateTimer;
      var cbPvx = celebrateSnapshot.ball.pvx || 0;
      var cbPvy = constrain(celebrateSnapshot.ball.pvy || -2.5, -4.5, -1.5);
      var cbPxX = gridSX(celebrateSnapshot.ball.x) + cbPvx * celebElapsed;
      var cbPxY = gridSY(celebrateSnapshot.ball.y) + cbPvy * celebElapsed;
      var cbNetTop = 32;
      var cbAlpha = cbPxY >= cbNetTop ? 255 : constrain(map(cbPxY, -20, cbNetTop, 0, 255), 0, 255);
      if (cbAlpha > 0) drawBallFading(cbPxX, cbPxY, cbAlpha);
    }

    fill(255, 255, 255, screenFlash); noStroke();
    rect(0, 0, 400, 400);
    if (screenFlash > 0) screenFlash *= 0.82;

    updateAndDrawParticles();

    var introT = constrain((60 - celebrateTimer) / 10, 0, 1);
    var introScale = easeInOutPass(introT);

    textStyle(BOLD); textAlign(CENTER);
    var cBoxW = celebrateBoxW * introScale, cBoxH = 50 * introScale;
    fill(0, 130, 0); noStroke();
    rect(200 - cBoxW / 2, 150 - cBoxH / 2, cBoxW, cBoxH, 10);

    fill(255, 220, 40); textSize(22 * introScale);
    text(celebrateText, 200, 157);
    textStyle(NORMAL);

    celebrateTimer--;
    if (celebrateTimer <= 0) {
      if (scoreA >= GOAL_LIMIT || scoreB >= GOAL_LIMIT || gameClockSeconds >= GAME_END_SECONDS) {
        screenState = "over";
      } else {

        endPossessionSwap();
      }
    }
  }

  drawMenuButton();
  prevMouse = mouseIsPressed;
  tappedX = null; tappedY = null; keyTapped = false;
  if (shaking) pop();
}
