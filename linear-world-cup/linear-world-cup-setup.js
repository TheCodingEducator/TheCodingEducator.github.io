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
  { name: tl("Spain", "España"),     code: "ESP", flag: flagSpain,     color: [244, 196, 0] },
  { name: tl("France", "Francia"),    code: "FRA", flag: flagFrance,    color: [0, 35, 149] },
  { name: "Armenia",   code: "ARM", flag: flagArmenia,   color: [213, 43, 30] },
  { name: tl("Brazil", "Brasil"),    code: "BRA", flag: flagBrazil,    color: [102, 204, 102] },
  { name: tl("England", "Inglaterra"),   code: "ENG", flag: flagEngland,   color: [255, 255, 255] },
  { name: tl("Germany", "Alemania"),   code: "GER", flag: flagGermany,   color: [0, 0, 0] },
  { name: tl("Mexico", "México"),    code: "MEX", flag: flagMexico,    color: [0, 90, 40] }
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

// Half-width of the goal mouth in grid units (posts sit at -GOAL_HALF_WIDTH
// and +GOAL_HALF_WIDTH) - kept an integer since the equation-kick screen's
// net is drawn from the FIELD_XB per-integer-grid-unit lookup table.
var GOAL_HALF_WIDTH = 4;

// How far a shot can pass from the goalie and still be saved, in grid units
// and in the equivalent screen pixels (grid * UNIT_PX) - sized to reach the
// splayed fingertips of drawGlove, not just the goalie's body, so a shot
// that visibly clips a glove actually counts as blocked.
var GOALIE_REACH_GRID = 0.95;
var GOALIE_REACH_PX = GOALIE_REACH_GRID * UNIT_PX;

var EQ_LABEL_W_READY = false;
var YEQ_W = 0, XPLUS_W = 0, SIGN_BTN_W = 0;
function ensureEquationLabelWidths() {
  if (EQ_LABEL_W_READY) return;
  textSize(18);
  YEQ_W = textWidth("y =");
  XPLUS_W = textWidth("x +");
  textSize(28 * 0.42);
  SIGN_BTN_W = max(textWidth(tl("MAKE POSITIVE", "HACER POSITIVO")), textWidth(tl("MAKE NEGATIVE", "HACER NEGATIVO"))) + 16;
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
var saveTimer = 0, saveDuration = 30, saveX = 0, saveY = 0, saveIsCatch = false;
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
function keyPressed(e) {
  if (window.isPageControlKey && window.isPageControlKey(e)) return;   // Enter / Space on the page's own controls
  if (keyCode === 13 || keyCode === 32) keyTapped = true;
}

// Driven entirely by mouseClicked() (set in tappedX/Y below) -- it's the
// one event p5 fires exactly once per completed click/tap on every
// platform. Checking the raw mouseIsPressed press-edge here too (as a
// second, independent path) double-counted a single real mouse click --
// once on press, once again on release when mouseClicked() also fired --
// which silently toggled things back off again.
function wasClicked(x, y, w, h) {
  var i = kbButtons.push({ x: x, y: y, w: w, h: h }) - 1;
  if (kbActivate && i === kbFocus) return true;   // pressed from the keyboard
  return tappedX !== null && tappedX > x && tappedX < x + w && tappedY > y && tappedY < y + h;
}

// Keyboard buttons for the menu, bracket, results and exit screens (the match itself already
// plays from the keys). The arrow keys (or Tab / Shift+Tab) move a gold ring to the nearest
// button in that direction; Enter or Space presses it. Until the ring is moved, Enter / Space
// keep their old job (start / continue).
var kbButtons = [], kbPrevButtons = [], kbFocus = -1, kbActivate = false, kbScreen = "", kbUsed = false;
function kbMenus() { return exitConfirmPending || screenState === "menu" || screenState === "over" || screenState === "bracket"; }
function kbMove(dx, dy) {
  var bs = kbPrevButtons; if (!bs.length) return;
  kbUsed = true;
  if (kbFocus < 0 || kbFocus >= bs.length) { kbFocus = 0; return; }
  var c = bs[kbFocus], cx = c.x + c.w / 2, cy = c.y + c.h / 2, best = -1, bestS = Infinity;
  for (var i = 0; i < bs.length; i++) {
    if (i === kbFocus) continue;
    var b = bs[i], bx = b.x + b.w / 2, by = b.y + b.h / 2;
    var along = dx ? (bx - cx) * dx : (by - cy) * dy, across = dx ? Math.abs(by - cy) : Math.abs(bx - cx);
    if (along <= 2) continue;
    var s = along + across * 2.5;
    if (s < bestS) { bestS = s; best = i; }
  }
  if (best >= 0) kbFocus = best;
}
window.addEventListener("keydown", function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey || !kbMenus()) return;
  if (window.isPageControlKey && window.isPageControlKey(e)) return;   // keys for the page's own controls
  var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (d) { e.preventDefault(); e.stopPropagation(); kbMove(d[0], d[1]); return; }
  if (e.key === "Tab") {
    // Tab steps through the game's buttons; past the last one (or before the first) it leaves the game for the page
    var n = kbPrevButtons.length, atEnd = e.shiftKey ? kbFocus === 0 : kbFocus === n - 1;
    if (!n || atEnd || (window.gameHasKeyboard && !window.gameHasKeyboard(e))) { kbFocus = -1; return; }
    e.preventDefault(); e.stopPropagation(); kbUsed = true;
    kbFocus = kbFocus < 0 ? (e.shiftKey ? n - 1 : 0) : kbFocus + (e.shiftKey ? -1 : 1);
    return;
  }
  if ((e.key === "Enter" || e.key === " ") && kbFocus >= 0 && kbFocus < kbPrevButtons.length) {
    e.preventDefault(); e.stopPropagation(); if (!e.repeat) kbActivate = true;
  }
}, true);
function kbBeginFrame() {
  var screen = (exitConfirmPending ? "exit" : screenState === "menu" || screenState === "over" || screenState === "bracket" ? screenState : "play");
  if (screen !== kbScreen) { kbScreen = screen; kbFocus = (kbUsed && screen === "exit") ? 0 : -1; }
  kbPrevButtons = kbButtons; kbButtons = [];
}
function kbEndFrame() {
  kbActivate = false;
  if (!kbMenus()) return;
  var r = kbFocus >= 0 ? kbButtons[kbFocus] : null;
  if (!r) return;
  push(); noFill(); stroke(255, 214, 60); strokeWeight(3); rect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 7); pop();
}

// p5's own automatic touch-to-mouse-click synthesis isn't reliable across
// real touch devices once a sketch defines its own touchStarted/Moved/Ended
// (which this one needs anyway, to block scrolling/pinch-zoom on the
// canvas) - on some browsers mouseClicked() then simply never fires from a
// real tap, so every button here (driven by wasClicked()/mouseClicked())
// silently stops registering taps on phones even though a mouse click in
// a desktop browser works fine. Manually driving mouseIsPressed and calling
// mouseClicked() here removes the dependency on that synthesis entirely -
// see touchStarted/touchEnded in bank-shot-angle-golf-question.js for the same
// pattern already proven to work on this site.
// p5 listens for touches on the whole page, so only touches that start on the game itself are handled; anywhere else -
// the top bar's buttons, the number pad - the tap goes through untouched (returning false for every touch swallowed them).
function onGame(e) { return !!(e && e.target && e.target.tagName === 'CANVAS'); }
function touchStarted(e) { if (!onGame(e)) return; mouseIsPressed = true; return false; }
function touchMoved(e) { if (!onGame(e)) return; return false; }
function touchEnded(e) { if (!onGame(e)) return; mouseIsPressed = false; mouseClicked(); return false; }

function pointSegDist(px, py, ax, ay, bx, by) {
  var dx = bx - ax, dy = by - ay;
  var lenSq = dx * dx + dy * dy;
  var t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
  t = max(0, min(1, t));
  var cx = ax + t * dx, cy = ay + t * dy;
  return dist(px, py, cx, cy);
}
