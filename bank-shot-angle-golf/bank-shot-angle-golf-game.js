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
    walls.push({ x1: a.x, y1: a.y, x2: c.x, y2: c.y, kind: 'rail' });
  }
  return {
    par: null,
    tee: { x: b.x + b.w / 2, y: b.y + b.h / 2 },
    cup: null,
    walls: walls,
    fairwayPoly: corners,
    bushes: [], zones: [], islands: [], obstacles: [], decor: []
  };
}

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
var retryHint = false;   // a retried question shows the 90 / 180 rule as a hint
var slowTick = 0;        // frame counter for the slower wrong-answer playback

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

// The question only appears once the camera has finished zooming in (questionReady).
var questionReady = false;
var holeResult = null;    // the last finished hole's record result (see recordHole)
var roundResult = null;   // the last finished round's (see recordRound)
var kbCourseSel = 0;      // which course card the keyboard has picked
var holeBannerAt = -10000; // when the hole-name banner appeared

// ---------------------------------------------------------------
// Sound effects made on the fly (this game's own; the recorded ones live in sounds/)
// ---------------------------------------------------------------
function playFx(name) {
  var ctx = window.SiteSound && SiteSound.context && SiteSound.context();
  if (!ctx) return;
  try {
    var now = ctx.currentTime;
    var tone = function (type, f0, f1, dur, vol, delay) {
      var o = ctx.createOscillator(), g = ctx.createGain(), t = now + (delay || 0);
      o.type = type; o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    };
    var noise = function (dur, vol, freq, delay) {
      var n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = now + (delay || 0);
      f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.9; g.gain.value = vol;
      s.buffer = buf; s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(t);
    };
    var fx = {
      warp: function () { tone('sine', 220, 1800, 0.35, 0.12); tone('triangle', 330, 2400, 0.3, 0.06, 0.05); },
      thunk: function () { tone('square', 140, 70, 0.12, 0.08); noise(0.08, 0.15, 500); },
      boing: function () { tone('sine', 260, 520, 0.18, 0.12); tone('sine', 520, 300, 0.15, 0.06, 0.08); },
      star: function () { tone('sine', 1320, 0, 0.25, 0.12); tone('sine', 2640, 0, 0.15, 0.04); },
      pop: function () { noise(0.15, 0.25, 2500); },
      par: function () { [523, 659, 784].forEach(function (f, i) { tone('triangle', f, 0, 0.22, 0.1, i * 0.09); }); },
      birdie: function () { [1568, 2093, 1760, 2349, 2637].forEach(function (f, i) { tone('sine', f, f * 1.05, 0.09, 0.08, i * 0.06); }); },
      holeInOne: function () {
        [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { tone('square', f, 0, 0.18, 0.06, i * 0.1); tone('triangle', f / 2, 0, 0.2, 0.06, i * 0.1); });
        noise(0.4, 0.2, 3000, 0.75);
      },
      record: function () { [784, 988, 1175, 1568].forEach(function (f, i) { tone('triangle', f, 0, 0.3, 0.1, i * 0.12); }); }
    };
    if (fx[name]) fx[name]();
  } catch (e) {}
}

// ---------------------------------------------------------------
// Saved records (this device only: best strokes on each hole, best course total, stars)
// ---------------------------------------------------------------
var RECORDS_KEY = 'bankshot_records';
function loadRecords() { try { return JSON.parse(localStorage.getItem(RECORDS_KEY)) || {}; } catch (e) { return {}; } }
function saveRecords(r) { try { localStorage.setItem(RECORDS_KEY, JSON.stringify(r)); } catch (e) {} }
function courseRecord(mode, key) {
  var r = loadRecords(), m = r[mode] || {}, c = m[key] || {};
  return { best: c.best || [], total: c.total || null, stars: c.stars || [] };
}
function bumpCounter(key) { try { localStorage.setItem(key, String((parseInt(localStorage.getItem(key), 10) || 0) + 1)); } catch (e) {} }
function holeStars(strokes, par) { return strokes === 1 || strokes - par <= -1 ? 3 : (strokes <= par ? 2 : 1); }
function starTotal(stars) { var s = 0; for (var i = 0; i < 9; i++) s += stars[i] || 0; return s; }
// records one finished hole; returns { newBest, stars }
function recordHole(idx, strokes, par) {
  var r = loadRecords(), m = r[gameMode] = r[gameMode] || {}, c = m[course.key] = m[course.key] || { best: [], total: null, stars: [] };
  var stars = holeStars(strokes, par), had = c.best[idx];
  var newBest = had === undefined || had === null || strokes < had;
  if (newBest) c.best[idx] = strokes;
  c.stars[idx] = Math.max(c.stars[idx] || 0, stars);
  saveRecords(r);
  if (strokes === 1) bumpCounter('bankshot_hole_in_ones');
  return { newBest: newBest && had !== undefined && had !== null, firstTime: had === undefined || had === null, stars: stars, prev: had };
}
// records a finished round; returns true for a new course record
function recordRound(total, par) {
  var r = loadRecords(), m = r[gameMode] = r[gameMode] || {}, c = m[course.key] = m[course.key] || { best: [], total: null, stars: [] };
  var prev = c.total, isNew = prev === null || prev === undefined || total < prev;
  if (isNew) c.total = total;
  saveRecords(r);
  bumpCounter('bankshot_rounds');
  if (total < par) { try { localStorage.setItem('bankshot_under_par', 'true'); } catch (e) {} }
  return { isNew: isNew && prev !== null && prev !== undefined, first: prev === null || prev === undefined, prev: prev };
}

// ---------------------------------------------------------------
// Celebrations: confetti and a big pop-up word when the ball drops
// ---------------------------------------------------------------
var confetti = [];
var popWord = null;   // { text, sub, col, at }
function burstConfetti(x, y, n, spread) {
  var cols = (course && course.theme.confetti) || ['#ffd166', '#ffffff'];
  for (var i = 0; i < n; i++) {
    var a = random(0, 360), s = random(2, spread || 9);
    confetti.push({ x: x, y: y, vx: cos(a) * s, vy: sin(a) * s - random(2, 5), rot: random(360), vr: random(-12, 12),
      col: cols[i % cols.length], life: random(70, 120), w: random(5, 10), h: random(3, 6) });
  }
}
function drawConfetti() {
  if (!confetti.length) return;
  push(); noStroke(); rectMode(CENTER);
  for (var i = confetti.length - 1; i >= 0; i--) {
    var p = confetti[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.vx *= 0.985; p.rot += p.vr; p.life--;
    if (p.life <= 0 || p.y > height + 20) { confetti.splice(i, 1); continue; }
    push(); translate(p.x, p.y); rotate(p.rot); fill(p.col); rect(0, 0, p.w, p.h, 1); pop();
  }
  pop();
}
function showPopWord(text, sub, col) { popWord = { text: text, sub: sub || '', col: col || '#ffd166', at: millis() }; }
function drawPopWord() {
  if (!popWord) return;
  var t = (millis() - popWord.at) / 1600;
  if (t > 1) { popWord = null; return; }
  var sc = t < 0.15 ? 0.4 + t / 0.15 * 0.75 : (t < 0.25 ? 1.15 - (t - 0.15) : 1.05);
  var a = t > 0.8 ? (1 - t) / 0.2 : 1;
  push();
  translate(width / 2, height / 2 - 40); scale(sc);
  textAlign(CENTER, CENTER); textStyle(BOLD); textSize(64);
  fill(0, 0, 0, 160 * a); text(popWord.text, 3, 4);
  var c = color(popWord.col); c.setAlpha(255 * a); fill(c); text(popWord.text, 0, 0);
  if (popWord.sub) { textSize(22); fill(255, 255, 255, 230 * a); text(popWord.sub, 0, 52); }
  textStyle(NORMAL);
  pop();
}
// the word for a score on a hole
function scoreWord(strokes, par) {
  if (strokes === 1) return tl('HOLE IN ONE!', '¡HOYO EN UNO!');
  var rel = strokes - par;
  if (rel <= -3) return tl('Albatross!', '¡Albatros!');
  if (rel === -2) return tl('Eagle!', '¡Águila!');
  if (rel === -1) return tl('Birdie!', '¡Birdie!');
  if (rel === 0) return tl('Par', 'Par');
  if (rel === 1) return tl('Bogey', 'Bogey');
  return tl('Double Bogey+', 'Doble bogey+');
}
// called the moment the ball drops in
function celebrateSink() {
  var s = strokeCount, par = hole.par;   // the stroke that dropped is already counted
  var sx = (hole.cup.x - cameraFocus.x) * cameraZoom + width / 2, sy = (hole.cup.y - cameraFocus.y) * cameraZoom + height / 2;
  if (s === 1) { burstConfetti(sx, sy, 140, 12); burstConfetti(width / 2, height / 2, 80, 14); playFx('holeInOne'); showPopWord(scoreWord(s, par), '', '#ffd166'); }
  else if (s < par) { burstConfetti(sx, sy, 90, 10); playFx('birdie'); showPopWord(scoreWord(s, par), '', '#7dffb0'); }
  else if (s === par) { burstConfetti(sx, sy, 40, 7); playFx('par'); showPopWord(scoreWord(s, par), '', '#ffffff'); }
  else { burstConfetti(sx, sy, 16, 5); showPopWord(scoreWord(s, par), '', '#ffce6b'); }
}

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

// ---------------------------------------------------------------
// Keyboard play - everything the mouse does also works from the keys:
//   menu: arrows choose, Enter/Space picks · course intro / scorecard: Enter/Space
//   exit box: arrows choose, Enter/Space confirms, Esc cancels
//   aiming: ←/→ turn the shot, ↑/↓ set the power, Enter/Space locks it in (same as letting go of a drag)
// ---------------------------------------------------------------
var kbMenuSel = 0;      // 0 = Golf Gamer, 1 = Hole-In-One Hero, 2 = Putting Green practice
var kbExitSel = 'cancel';
var kbAim = null;       // { ang, power } while aiming from the keyboard
var kbShown = false;    // only draw focus rings once the keyboard has been used

function kbConfirmKey() { return keyCode === ENTER || keyCode === RETURN || key === ' '; }

// edge-triggered keys (called from keyPressed); returns true when it used the key
function kbKeyPressed() {
  if (explainOpen) return false;
  if (confirmExitOpen) {
    kbShown = true;
    if (keyCode === LEFT_ARROW) { kbExitSel = 'cancel'; return true; }
    if (keyCode === RIGHT_ARROW) { kbExitSel = 'exit'; return true; }
    if (keyCode === UP_ARROW || keyCode === DOWN_ARROW) { kbExitSel = kbExitSel === 'exit' ? 'cancel' : 'exit'; return true; }   // the two buttons sit side by side: up / down switch too
    if (keyCode === ESCAPE) { confirmExitOpen = false; kbExitSel = 'cancel'; playSound('click'); return true; }
    if (kbConfirmKey()) {
      confirmExitOpen = false; playSound('click');
      if (kbExitSel === 'exit') { dragging = false; kbAim = null; gameState = 'MENU'; }
      kbExitSel = 'cancel';
      return true;
    }
    return true;
  }
  if (gameState === 'MENU') {
    kbShown = true;
    if (keyCode === LEFT_ARROW) { kbMenuSel = 0; return true; }
    if (keyCode === RIGHT_ARROW) { kbMenuSel = 1; return true; }
    if (keyCode === DOWN_ARROW) { kbMenuSel = 2; return true; }
    if (keyCode === UP_ARROW) { if (kbMenuSel === 2) kbMenuSel = 0; return true; }
    if (kbConfirmKey()) {
      playSound('click');
      if (kbMenuSel === 2) startPractice(); else { gameMode = kbMenuSel === 0 ? MODE_EASY : MODE_HARD; startCourse(); }
      return true;
    }
    return false;
  }
  if (gameState === 'COURSE_SELECT') {
    kbShown = true;
    if (keyCode === LEFT_ARROW) { kbCourseSel = (kbCourseSel + COURSES.length - 1) % COURSES.length; return true; }
    if (keyCode === RIGHT_ARROW) { kbCourseSel = (kbCourseSel + 1) % COURSES.length; return true; }
    if (keyCode === ESCAPE) { gameState = 'MENU'; playSound('click'); return true; }
    if (kbConfirmKey()) { playSound('click'); chooseCourse(kbCourseSel); }
    return true;
  }
  if (gameState === 'COURSE_INTRO') {
    if (keyCode === ESCAPE) { gameState = 'COURSE_SELECT'; playSound('click'); return true; }
    if (kbConfirmKey()) { playSound('click'); startHole(0); }
    return true;
  }
  if (gameState === 'COURSE_COMPLETE') {
    kbShown = true;
    if (keyCode === LEFT_ARROW) { kbCardSel = max(0, kbCardSel - 1); return true; }
    if (keyCode === RIGHT_ARROW) { kbCardSel = min(CARD_BTNS.length - 1, kbCardSel + 1); return true; }
    if (kbConfirmKey()) scorecardAction(CARD_BTNS[kbCardSel].id);
    return true;
  }
  if (gameState === 'PLAYING' && holePhase === 'AIMING' && kbAim && kbConfirmKey()) {
    kbAim = null;
    mouseReleased();   // fires exactly like releasing a mouse drag
    return true;
  }
  return false;
}

// held arrow keys steer the keyboard aim every frame
function kbUpdateAim() {
  if (window.isPageControlKey && window.isPageControlKey({ target: document.activeElement })) return;   // arrows belong to a focused page control
  if (gameState !== 'PLAYING' || holePhase !== 'AIMING' || confirmExitOpen || explainOpen) { if (kbAim) { kbAim = null; dragging = false; } return; }
  var turn = (keyIsDown(RIGHT_ARROW) ? 1 : 0) - (keyIsDown(LEFT_ARROW) ? 1 : 0);
  var push = (keyIsDown(UP_ARROW) ? 1 : 0) - (keyIsDown(DOWN_ARROW) ? 1 : 0);
  if (!kbAim) {
    if (!turn && !push) return;
    // always starts pointing straight up the screen - not at the cup, so the player does the aiming
    kbAim = { ang: -90, power: 0.45 };
  }
  var fine = keyIsDown(SHIFT) ? 0.25 : 1;   // hold Shift for small adjustments
  kbAim.ang += turn * 1.6 * fine;
  kbAim.power = constrain(kbAim.power + push * 0.012 * fine, 0.08, 1);
  // show it with the same arrow the mouse drag uses: pull back from the ball, opposite the shot
  dragging = true;
  dragStart.x = ball.x; dragStart.y = ball.y;
  dragNow.x = ball.x - cos(kbAim.ang) * kbAim.power * MAX_DRAG;
  dragNow.y = ball.y - sin(kbAim.ang) * kbAim.power * MAX_DRAG;
}

// gold ring around whatever the keyboard has selected
function kbDrawFocus() {
  if (!kbShown) return;
  var r = null;
  if (confirmExitOpen) {
    var h = EXIT_CONFIRM_BOX.h, by = height / 2 - h / 2 + h - 70, gap = 16;
    r = kbExitSel === 'cancel' ? { x: width / 2 - EXIT_CONFIRM_NO.w - gap / 2, y: by, w: EXIT_CONFIRM_NO.w, h: EXIT_CONFIRM_NO.h, rr: 10 }
                               : { x: width / 2 + gap / 2, y: by, w: EXIT_CONFIRM_YES.w, h: EXIT_CONFIRM_YES.h, rr: 10 };
  } else if (gameState === 'MENU') {
    if (kbMenuSel === 2) r = { x: width / 2 - PRACTICE_BTN.w / 2, y: PRACTICE_BTN.y, w: PRACTICE_BTN.w, h: PRACTICE_BTN.h, rr: PRACTICE_BTN.h / 2 };
    else r = { x: kbMenuSel === 0 ? width / 2 - 12 - MENU_CARD_W : width / 2 + 12, y: MENU_CARD_Y, w: MENU_CARD_W, h: MENU_CARD_H, rr: 16 };
  }
  if (!r) return;
  push();
  noFill(); stroke(255, 214, 60); strokeWeight(4);
  rect(r.x - 5, r.y - 5, r.w + 10, r.h + 10, r.rr + 5);
  pop();
}

function gameDraw() {
  kbUpdateAim();
  gameDrawScreen();
  kbDrawFocus();
  if (gameState === 'PLAYING' && holePhase === 'AIMING' && !confirmExitOpen && !explainOpen) {
    push();
    noStroke(); fill(0, 0, 0, 140); rect(width - 344, height - 40, 332, 28, 14);
    fill(230, 240, 230); textAlign(CENTER, CENTER); textSize(13);
    text(kbAim ? tl('← → aim  ·  ↑ ↓ power  ·  SPACE to lock in the shot', '← → apuntar  ·  ↑ ↓ fuerza  ·  ESPACIO para tirar') : tl('Drag to aim  ·  or use ← → ↑ ↓ and SPACE', 'Arrastra para apuntar  ·  o usa ← → ↑ ↓ y ESPACIO'), width - 178, height - 26);
    pop();
  }
}

function gameDrawScreen() {
  background(10, 14, 10);
  if (gameState === 'MENU') { drawMenu(); return; }
  if (gameState === 'COURSE_SELECT') { drawCourseSelect(); return; }
  if (gameState === 'COURSE_INTRO') { drawCourseIntro(); return; }
  if (gameState === 'COURSE_COMPLETE') { drawScorecard(); drawConfetti(); return; }

  // Ease the camera toward the live question's real point (making the
  // angle diagram big and legible) or back out to the full course view.
  var wantZoomIn = holePhase === 'QUESTION' && pendingShot;
  var targetZoom = wantZoomIn ? QUESTION_ZOOM : 1;
  var targetFocus = wantZoomIn ? pendingShot.point : { x: 350, y: 350 };
  cameraZoom = lerp(cameraZoom, targetZoom, 0.16);
  cameraFocus.x = lerp(cameraFocus.x, targetFocus.x, 0.16);
  cameraFocus.y = lerp(cameraFocus.y, targetFocus.y, 0.16);
  // the question (and its clock) only starts once the zoom has settled
  if (wantZoomIn && !questionReady && Math.abs(cameraZoom - targetZoom) < 0.03 && dist(cameraFocus.x, cameraFocus.y, targetFocus.x, targetFocus.y) < 2) {
    questionReady = true;
    timerStart = millis();
  }
  if (!confirmExitOpen && !explainOpen && gameState === 'PLAYING') obsClock += 1 / 60;

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
  drawObstacles();
  if (!confirmExitOpen && !explainOpen) updatePhysics();
  updateAngleReveal();
  updateTrail();
  drawGreenAngleArc();
  drawResolvedAngleLabels();
  drawTrail();
  drawBall();
  drawAimPreview();
  drawLiveAngleDiagram();
  pop();

  if (holePhase === 'SUNK' && sinkAnim >= 1 && gameState === 'PLAYING' && (!popWord || millis() - popWord.at > 1200)) {   // after the celebration
    finishHole();
  }

  drawHUD();
  drawEquation();
  if (gameState === 'PLAYING') drawExitButton();
  if (holePhase === 'QUESTION') drawQuestionOverlay();
  drawScreenFlash();
  drawHoleBanner();
  if (gameState === 'HOLE_COMPLETE') drawHoleCompleteOverlay();
  else drawPopWord();
  drawConfetti();
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
  text(tl('⛳ Bank Shot: Angle Golf', '⛳ Bank Shot: golf de ángulos'), width / 2, 56);
  textStyle(NORMAL);
  textSize(18);
  fill(180, 200, 180);
  text(tl('Solve the angle. Line up the shot. Sink the putt.', 'Resuelve el ángulo. Apunta el tiro. Mete la bola.'), width / 2, 90);

  drawGolfHeroScene(MENU_HERO.x, MENU_HERO.y, MENU_HERO.w, MENU_HERO.h);

  drawModeCard(width / 2 - 12 - MENU_CARD_W, MENU_CARD_Y, tl('Golf Gamer', 'Golfista gamer'), 'EASY', '⛳',
    [tl('Angles ease in - 10s, then 5s,', 'Ángulos fáciles: de 10 en 10, luego de 5,'), tl('then anything by hole 7.', 'y cualquiera desde el hoyo 7.')], tl('No clock. Take your time.', 'Sin reloj. Tómate tu tiempo.'), '#3ea158');
  drawModeCard(width / 2 + 12, MENU_CARD_Y, tl('Hole-In-One Hero', 'Héroe del hoyo en uno'), 'HARD', '🔥',
    [tl('Any angle from hole 1 -', 'Cualquier ángulo desde el hoyo 1 -'), tl('algebra by the back nine.', 'álgebra en los últimos nueve.')], tl('10s clock from hole 4. Run out and it counts as a miss.', 'Reloj de 10 s desde el hoyo 4. Si se acaba, cuenta como fallo.'), '#e0562f');

  drawPracticeButton();

  textAlign(CENTER, CENTER);
  textSize(15);
  fill(140, 155, 140);
  text(tl('Three themed courses · 9 holes each · your best scores are saved', 'Tres campos temáticos · 9 hoyos cada uno · se guardan tus mejores marcas'), width / 2, PRACTICE_BTN.y + PRACTICE_BTN.h + 24);
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
  text(tl('🎯 Putting Green — Free Practice', '🎯 Green de práctica — práctica libre'), width / 2, b.y + b.h / 2 + 1);
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
  text(tl(badge, { EASY: 'FÁCIL', HARD: 'DIFÍCIL' }[badge] || badge), cx, y + 84);

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
  text(tl('Play', 'Jugar'), cx, y + h - 37);
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
// Choosing a course, and the course intro
// ---------------------------------------------------------------
function totalPar(c) {
  c = c || course;
  var p = 0;
  for (var i = 0; i < c.holes.length; i++) p += c.holes[i].par;
  return p;
}
function modeName() { return gameMode === MODE_EASY ? tl('Golf Gamer', 'Golfista gamer') : (gameMode === MODE_HARD ? tl('Hole-In-One Hero', 'Héroe del hoyo en uno') : tl('Putting Green', 'Green de práctica')); }
function starsText(n) { return '★ ' + n + ' / 27'; }

var SELECT_CARD = { w: 206, h: 392, y: 132, gap: 15 };
var SELECT_BACK = { w: 150, h: 46, y: 560 };
function selectCardX(i) { var b = SELECT_CARD; return width / 2 - (b.w * 3 + b.gap * 2) / 2 + i * (b.w + b.gap); }
function inBox(mx, my, x, y, w, h) { return mx > x && mx < x + w && my > y && my < y + h; }

function drawCourseSelect() {
  drawMenuBackground();
  noStroke(); textAlign(CENTER, CENTER);
  fill(150, 200, 160); textSize(16); text(modeName().toUpperCase(), width / 2, 52);
  fill(255); textStyle(BOLD); textSize(36); text(tl('Choose your course', 'Elige tu campo'), width / 2, 88); textStyle(NORMAL);
  var b = SELECT_CARD;
  for (var i = 0; i < COURSES.length; i++) {
    var c = COURSES[i], th = c.theme, x = selectCardX(i), y = b.y;
    var hov = inBox(mouseX, mouseY, x, y, b.w, b.h) || (kbShown && kbCourseSel === i);
    var rec = courseRecord(gameMode, c.key);
    fill(0, 0, 0, hov ? 110 : 70); rect(x + 3, y + 5, b.w, b.h, 18);
    fill(th.rough); rect(x, y, b.w, b.h, 18);
    fill(th.fairwayB); rect(x + 12, y + 12, b.w - 24, 120, 12);
    fill(th.fairwayA); for (var s = 0; s < 6; s++) rect(x + 12 + s * 32, y + 12, 16, 120, s === 0 ? 12 : 0);
    stroke(th.wall); strokeWeight(5); noFill(); rect(x + 12, y + 12, b.w - 24, 120, 12); noStroke();
    textSize(64); fill(255); text(th.icon, x + b.w / 2, y + 74);
    var light = th.key === 'summer';
    fill(light ? '#3a2a10' : 255); textStyle(BOLD); textSize(22); text(th.label, x + b.w / 2, y + 160); textStyle(NORMAL);
    fill(light ? '#5a4a2a' : color(210, 220, 215)); textSize(14); textAlign(CENTER, TOP);
    text(th.blurb, x + 16, y + 180, b.w - 32, 70);
    textAlign(CENTER, CENTER);
    fill(light ? '#5a4a2a' : color(180, 195, 185)); textSize(14);
    text(tl('9 holes · par ', '9 hoyos · par ') + totalPar(c), x + b.w / 2, y + 268);
    fill(light ? '#2a1a00' : 255); textSize(15); textStyle(BOLD);
    text(rec.total ? tl('Best round: ', 'Mejor ronda: ') + rec.total : tl('Not played yet', 'Aún sin jugar'), x + b.w / 2, y + 298);
    textStyle(NORMAL);
    fill(light ? '#8a5a00' : '#ffd166'); textSize(17); text(starsText(starTotal(rec.stars)), x + b.w / 2, y + 326);
    fill(hov ? th.accent : color(0, 0, 0, 120)); rect(x + 40, y + b.h - 52, b.w - 80, 38, 19);
    fill(hov ? '#101010' : 255); textStyle(BOLD); textSize(16); text(tl('Play', 'Jugar'), x + b.w / 2, y + b.h - 33); textStyle(NORMAL);
    if (hov) { stroke(th.accent); strokeWeight(3); noFill(); rect(x - 4, y - 4, b.w + 8, b.h + 8, 21); noStroke(); }
  }
  var bx = width / 2 - SELECT_BACK.w / 2;
  fill(0, 0, 0, 150); rect(bx, SELECT_BACK.y, SELECT_BACK.w, SELECT_BACK.h, 23);
  fill(255); textSize(16); textStyle(BOLD); text(tl('← Back', '← Volver'), width / 2, SELECT_BACK.y + SELECT_BACK.h / 2 + 1); textStyle(NORMAL);
  fill(140, 155, 140); textSize(13); text(tl('← → to choose · Enter to play · Esc to go back', '← → para elegir · Enter para jugar · Esc para volver'), width / 2, 636);
  textAlign(LEFT, BASELINE);
}
function courseSelectHit(mx, my) {
  for (var i = 0; i < COURSES.length; i++) if (inBox(mx, my, selectCardX(i), SELECT_CARD.y, SELECT_CARD.w, SELECT_CARD.h)) return i;
  if (inBox(mx, my, width / 2 - SELECT_BACK.w / 2, SELECT_BACK.y, SELECT_BACK.w, SELECT_BACK.h)) return 'back';
  return null;
}

var INTRO_BTN = { w: 220, h: 54, y: 606 };
function drawCourseIntro() {
  var th = course.theme, rec = courseRecord(gameMode, course.key);
  background(th.rough);
  noStroke(); textAlign(CENTER, CENTER);
  var light = th.key === 'summer';
  fill(0, 0, 0, light ? 40 : 120); rect(24, 24, width - 48, height - 48, 20);
  fill(light ? '#3a2a10' : color(150, 200, 160)); textSize(15); text(modeName().toUpperCase() + tl(' · TODAY’S COURSE', ' · CAMPO DE HOY'), width / 2, 58);
  fill(light ? '#2a1a00' : 255); textStyle(BOLD); textSize(42); text(th.icon + ' ' + th.label, width / 2, 100); textStyle(NORMAL);
  fill(light ? '#4a3a1a' : color(210, 220, 210)); textSize(15); textAlign(CENTER, TOP);
  text(th.signature, 70, 128, width - 140, 44);
  textAlign(CENTER, CENTER);
  // the nine holes
  for (var i = 0; i < 9; i++) {
    var h = course.holes[i], col = i % 3, row = floor(i / 3);
    var x = 56 + col * 200, y = 186 + row * 118, w = 188, hh = 106;
    fill(th.fairwayB); rect(x, y, w, hh, 12);
    fill(0, 0, 0, 60); rect(x, y + hh - 30, w, 30, 0, 0, 12, 12);
    textSize(34); fill(255); text(h.icon, x + 30, y + 40);
    fill(255); textStyle(BOLD); textSize(13); textAlign(LEFT, CENTER);
    text((i + 1) + '. ' + h.name, x + 56, y + 32, w - 62, 40);
    textStyle(NORMAL); textAlign(CENTER, CENTER); textSize(13); fill(235);
    var best = rec.best[i];
    text('Par ' + h.par + (best ? tl('   ·   Best ', '   ·   Mejor ') + best : '') + '   ' + '★'.repeat(rec.stars[i] || 0), x + w / 2, y + hh - 15);
  }
  fill(light ? '#2a1a00' : 255); textSize(16);
  text(tl('Par ', 'Par ') + totalPar() + (rec.total ? tl('   ·   Your best round: ', '   ·   Tu mejor ronda: ') + rec.total : '') + '   ·   ' + starsText(starTotal(rec.stars)), width / 2, 568);
  fill(th.accent); rect(width / 2 - INTRO_BTN.w / 2, INTRO_BTN.y, INTRO_BTN.w, INTRO_BTN.h, 14);
  fill('#101010'); textSize(21); textStyle(BOLD); text(tl('Tee Off', '¡A jugar!'), width / 2, INTRO_BTN.y + INTRO_BTN.h / 2 + 1); textStyle(NORMAL);
  textAlign(LEFT, BASELINE);
}
function introHit(mx, my) { return inBox(mx, my, width / 2 - INTRO_BTN.w / 2, INTRO_BTN.y, INTRO_BTN.w, INTRO_BTN.h); }

// the hole's name and idea, shown for a moment when it starts
function drawHoleBanner() {
  if (gameState !== 'PLAYING' || gameMode === MODE_PRACTICE || !hole.name) return;
  var t = (millis() - holeBannerAt) / 3200;
  if (t > 1 || holePhase !== 'AIMING' || strokeCount > 0) return;
  var a = t < 0.1 ? t / 0.1 : (t > 0.75 ? (1 - t) / 0.25 : 1);
  push(); noStroke(); textAlign(CENTER, CENTER);
  fill(0, 0, 0, 185 * a); rect(width / 2 - 250, 96, 500, 86, 16);
  fill(255, 255, 255, 255 * a); textStyle(BOLD); textSize(24);
  text(hole.icon + '  ' + tl('Hole ', 'Hoyo ') + (holeIndex + 1) + ': ' + hole.name, width / 2, 124);
  textStyle(NORMAL); textSize(15); fill(220, 230, 220, 255 * a);
  text(hole.tip + '   ·   Par ' + hole.par, width / 2, 158);
  pop();
}

// strokes so far this round (finished holes plus this one)
function roundStrokes() { var s = scorecard.length > holeIndex ? 0 : strokeCount; for (var i = 0; i < scorecard.length; i++) s += scorecard[i]; return s; }
function roundPar(n) { var p = 0; for (var i = 0; i < n; i++) p += course.holes[i].par; return p; }
function relText(rel) { return rel === 0 ? 'E' : (rel > 0 ? '+' + rel : String(rel)); }


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
    var wallShot = {
      type: 'WALL', known: tier.known, algebra: tier.algebra, timerOn: tier.timerOn,
      correctAnswer: 180 - tier.known, point: hit.point, Wd: Wd, N: N, wallRef: w,
      aimDir: aimDir, power: power, applied: false, launchFrom: { x: origin.x, y: origin.y }
    };
    // Only ask a wall question if the correct answer would really make the ball
    // bounce off that wall. A corner (two walls touching the ball at once) can
    // swallow the scripted bounce; then there is no wall angle to solve, so it
    // falls through to the straight-line question below.
    if (simulateTrail(wallShot, true).bounceIdx !== undefined) return wallShot;
  }

  var tier2 = applyDifficultyTier(null, gameMode, holeNum, 89);
  // The missing (complementary) angle is any whole number from 1° to 89° on every hole - no rounding
  // to 10s or 5s. (Hero mode's algebra questions keep their own known-angle expression.)
  if (!tier2.algebra) tier2.known = 90 - floor(random(1, 90));
  return {
    type: 'STRAIGHT', known: tier2.known, algebra: tier2.algebra, timerOn: tier2.timerOn,
    correctAnswer: 90 - tier2.known,
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
  holeResult.at = millis();
  playSound(strokeCount <= hole.par ? 'hole_complete' : 'click');
  if (holeResult.newBest) burstConfetti(width / 2, height / 2 - 60, 60, 9);
}

function advanceAfterHole() {
  if (holeIndex + 1 < course.holes.length) {
    startHole(holeIndex + 1);
  } else {
    gameState = 'COURSE_COMPLETE';
    var tot = 0; for (var i = 0; i < scorecard.length; i++) tot += scorecard[i];
    roundResult = recordRound(tot, totalPar());
    playSound('course_complete');
    if (roundResult.isNew || tot < totalPar()) { playFx('record'); burstConfetti(width / 2, 120, 150, 12); }
  }
}

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
  g.pixelDensity(2);
  g.angleMode(DEGREES);
  var ctx = g.drawingContext;
  var hasDecor = function (e) { return (h.decor || []).some(function (d) { return d.e === e; }); };
  g.noStroke();

  // ---- the ground around the hole
  g.fill(th.rough); g.rect(0, 0, 700, 700);
  var k;
  if (th.key === 'space') {
    for (k = 0; k < 160; k++) { g.fill(255, 255, 255, 60 + seeded(k) * 180); var r = seeded(k + 500) < 0.1 ? 2.6 : 1.3; g.circle(seeded(k + 1000) * 700, seeded(k + 2000) * 700, r); }
    g.fill(110, 60, 200, 26); g.circle(120, 620, 260); g.fill(40, 120, 220, 22); g.circle(620, 160, 300);
  } else if (th.key === 'summer') {
    for (k = 0; k < 260; k++) { g.fill(th.roughDot); g.circle(seeded(k) * 700, seeded(k + 900) * 700, 2 + seeded(k + 77) * 3); }
  } else if (th.key === 'medieval') {
    for (k = 0; k < 180; k++) {   // grass tufts
      var gx = seeded(k) * 700, gy = seeded(k + 400) * 700;
      g.stroke(th.roughDot); g.strokeWeight(2); g.line(gx, gy, gx - 3, gy - 7); g.line(gx, gy, gx + 3, gy - 7); g.noStroke();
    }
  } else {
    for (k = 0; k < 120; k++) { g.fill(th.roughDot); g.circle(seeded(k) * 700, seeded(k + 900) * 700, 4); }
  }
  // the sea all around (a pier or a headland), with a strip of sand along the green
  if (hasDecor('ocean')) {
    g.fill('#1593b8'); g.rect(0, 0, 700, 700);
    g.stroke(255, 255, 255, 70); g.strokeWeight(2); g.noFill();
    for (k = 0; k < 40; k++) { var wx = seeded(k) * 700, wy = seeded(k + 300) * 700; g.arc(wx, wy, 26, 12, 200, 340); }
    g.noStroke();
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

  // ---- pictures: around the hole, and the few that sit on the green
  g.textAlign(CENTER, CENTER);
  (h.decor || []).forEach(function (d) {
    if (d.e === 'moat' || d.e === 'carpet' || d.e === 'ocean') return;   // the named scenery pieces above
    g.textSize(d.s || 48);
    if (d.onGreen) { g.fill(255, 255, 255, 200); } else { g.fill(255); }
    g.text(d.e, d.x, d.y);
  });
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
function drawWalls() {
  var th = course.theme, style = th.wallStyle;
  push();
  strokeCap(ROUND);
  for (var i = 0; i < hole.walls.length; i++) {
    var w = hole.walls[i];
    // While a bank-shot question is live, the wall the ball is headed for lights up gold so the
    // diagram's wall is unmistakably the same one sitting right there on the course.
    var isLit = holePhase === 'QUESTION' && pendingShot && pendingShot.type === 'WALL' && pendingShot.wallRef === w;
    var bump = w.kind === 'bumper';
    stroke(0, 0, 0, 90); strokeWeight(13);
    line(w.x1, w.y1 + 4, w.x2, w.y2 + 4);
    if (isLit) {
      stroke('#e0a030'); strokeWeight(11); line(w.x1, w.y1, w.x2, w.y2);
      stroke('#ffce6b'); strokeWeight(4); line(w.x1, w.y1 - 1.5, w.x2, w.y2 - 1.5);
      continue;
    }
    if (style === 'neon') {
      drawingContext.shadowColor = bump ? '#ffb347' : th.wall; drawingContext.shadowBlur = 12;
      stroke(bump ? '#ff9f2e' : th.wall); strokeWeight(9); line(w.x1, w.y1, w.x2, w.y2);
      drawingContext.shadowBlur = 0;
      stroke(bump ? '#ffe2b0' : th.wallHi); strokeWeight(3); line(w.x1, w.y1, w.x2, w.y2);
    } else if (style === 'stone') {
      stroke(bump ? '#8a5a34' : th.wall); strokeWeight(12); line(w.x1, w.y1, w.x2, w.y2);
      stroke(bump ? '#c08a5a' : th.wallHi); strokeWeight(4); line(w.x1, w.y1 - 2, w.x2, w.y2 - 2);
      // mortar joints along stone walls
      if (!bump) {
        var L = dist(w.x1, w.y1, w.x2, w.y2), n = floor(L / 22);
        stroke(60, 62, 68, 160); strokeWeight(1.5);
        var ux = (w.x2 - w.x1) / L, uy = (w.y2 - w.y1) / L;
        for (var j = 1; j < n; j++) { var mx = w.x1 + ux * j * 22, my = w.y1 + uy * j * 22; line(mx - uy * 5, my + ux * 5, mx + uy * 5, my - ux * 5); }
      }
    } else {   // wood
      stroke(bump ? '#6f6f78' : th.wall); strokeWeight(12); line(w.x1, w.y1, w.x2, w.y2);
      stroke(bump ? '#a9a9b3' : th.wallHi); strokeWeight(4); line(w.x1, w.y1 - 2, w.x2, w.y2 - 2);
    }
  }
  pop();
}

// round obstacles: hedges, asteroids or beach rocks
function drawBushes() {
  var th = course.theme;
  for (var i = 0; i < hole.bushes.length; i++) {
    var b = hole.bushes[i];
    noStroke();
    fill(0, 0, 0, 70);
    ellipse(b.x + 4, b.y + 6, b.r * 2.1, b.r * 1.1);
    if (th.rockStyle === 'asteroid') {
      fill(th.bush); ellipse(b.x, b.y, b.r * 2, b.r * 1.9);
      fill(90, 86, 80); ellipse(b.x + b.r * 0.3, b.y + b.r * 0.2, b.r * 0.6, b.r * 0.5); ellipse(b.x - b.r * 0.35, b.y - b.r * 0.1, b.r * 0.4, b.r * 0.35);
      fill(th.bushHi); ellipse(b.x - b.r * 0.3, b.y - b.r * 0.45, b.r * 0.7, b.r * 0.35);
    } else if (th.rockStyle === 'rock') {
      fill(th.bush); ellipse(b.x, b.y, b.r * 2, b.r * 1.8);
      fill(th.bushHi); ellipse(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.9, b.r * 0.6);
    } else {
      fill(th.bush); ellipse(b.x, b.y, b.r * 2, b.r * 1.9);
      fill(th.bushHi); ellipse(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 1.1, b.r);
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
    resolvedAngle: isCorrect ? wallNormalAngle(shot.correctAnswer) : shot.resolvedAngle, correct: isCorrect,
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
    pts.push(ray(A, dir, min(L, 62)));
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
    var kLbl = (resolvedInfo.algebra ? (resolvedInfo.algebra.a * resolvedInfo.algebra.x + resolvedInfo.algebra.b) : resolvedInfo.known) + '°';
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
// Also drawn after the shot (reveal = true) from the same shot, so the angle the player sees
// afterwards is exactly the one they answered - with the "?" replaced by the answer.
function drawLiveAngleDiagram(shot, reveal) {
  if (!reveal && (!pendingShot || holePhase !== 'QUESTION')) return;
  var p = shot || pendingShot;
  if (!p) return;
  var wrongR = reveal && resolvedInfo && resolvedInfo.typed !== null && !resolvedInfo.correct;
  var from = reveal ? (p.launchFrom || p.point) : ball;
  var dir0, sweepDir, totalDeg, knownVal;
  if (p.type === 'WALL') {
    // measured from the wall behind the ball, so the ball's own dotted path is the line between the two angles
    dir0 = vScale(p.Wd, -1); sweepDir = p.N; totalDeg = 180;
  } else {
    // a right angle whose far side is the aim line: known from the square edge, answer up to the aim
    dir0 = vPerp(p.aimDir); sweepDir = p.aimDir; totalDeg = 90;
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
  line(from.x, from.y, p.point.x, p.point.y);
  drawingContext.setLineDash([]);
  pop();

  push();
  translate(p.point.x, p.point.y);
  rotate(baseAngle);

  // The line between the two colors IS the ball's path (the one dotted line). The question can
  // round the angle it asks about, so the wedge is drawn at the real angle of that path.
  var drawKnown = knownVal;
  if (p.type === 'WALL' && dist(from.x, from.y, p.point.x, p.point.y) > 1) {
    var tb = vNorm(vSub(from, p.point));
    drawKnown = degrees(Math.acos(constrain(vDot(dir0, tb), -1, 1)));
  }
  var knownEnd = sweepSign * drawKnown;
  var totalEnd = sweepSign * totalDeg;
  var kLo = min(0, knownEnd), kHi = max(0, knownEnd);
  var uLo = min(knownEnd, totalEnd), uHi = max(knownEnd, totalEnd);

  // filled wedges first, so the shared baseline/marker draw crisply on top
  noStroke();
  fill(224, 160, 48, 95);
  arc(0, 0, r * 2, r * 2, kLo, kHi, PIE);
  if (!wrongR) {
    if (!reveal) fill(91, 140, 255, 95); else fill(77, 255, 77, 100);
    arc(0, 0, r * 2, r * 2, uLo, uHi, PIE);
  }

  noFill();
  stroke(255, 255, 255, 200);
  strokeWeight(2.5);
  var lineR = wrongR ? r : r * 1.15;   // after a wrong answer the sides stop right at the arc
  line(p.type === 'WALL' ? -lineR : 0, 0, lineR, 0);
  if (p.type !== 'WALL') {   // a straight shot's one dotted line is its path: the aim side of the right angle
    drawingContext.setLineDash([6, 8]);
    line(0, 0, cos(totalEnd) * (wrongR ? r : r * 1.6), sin(totalEnd) * (wrongR ? r : r * 1.6));
    drawingContext.setLineDash([]);
  }

  strokeWeight(4);
  stroke('#e0a030');
  arc(0, 0, r * 2, r * 2, kLo, kHi);
  if (!wrongR) {
    stroke(!reveal ? '#5b8cff' : '#4dff4d');
    arc(0, 0, r * 2, r * 2, uLo, uHi);
  }

  if (wrongR) {
    // A wrong answer: the student's number as a red wedge, starting where the known angle ends.
    // Too small leaves a gray gap before the wall (the "?" still to find); too big spills past it.
    var ty = min(max(resolvedInfo.typed, 1), 359 - abs(knownEnd));
    var rs = knownEnd, re = knownEnd + sweepSign * ty;
    noStroke();
    fill(230, 57, 70, 120);
    arc(0, 0, r * 2, r * 2, min(rs, re), max(rs, re), PIE);
    if (abs(re) < abs(totalEnd)) {
      fill(255, 255, 255, 60);
      arc(0, 0, r * 2, r * 2, min(re, totalEnd), max(re, totalEnd), PIE);
    }
    noFill();
    stroke('#e63946');
    strokeWeight(4);
    arc(0, 0, r * 2, r * 2, min(rs, re), max(rs, re));
    var tMid = (rs + re) / 2, gMid = (re + totalEnd) / 2, hasGap = abs(re) < abs(totalEnd);
  }

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
  if (wrongR) uLocal = { x: cos(tMid) * r * 0.62, y: sin(tMid) * r * 0.62 };   // the typed number, inside its red wedge
  var gLocal = wrongR && hasGap ? { x: cos(gMid) * r * 0.7, y: sin(gMid) * r * 0.7 } : null;
  pop();

  var kWorld = rotatePoint(kLocal, baseAngle);
  var uWorld = rotatePoint(uLocal, baseAngle);

  noStroke();
  fill('#ffce6b');
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(15);
  text(knownVal + '°', p.point.x + kWorld.x, p.point.y + kWorld.y);
  if (gLocal) {   // the gap the typed angle left unfilled
    var gWorld = rotatePoint(gLocal, baseAngle);
    fill(255); textSize(18);
    text('?', p.point.x + gWorld.x, p.point.y + gWorld.y);
  }
  fill(!reveal ? '#bcd4ff' : wrongR ? '#ffffff' : '#4dff4d');
  textSize(reveal ? 19 : 23);
  text(!reveal ? '?' : (wrongR ? resolvedInfo.typed : p.correctAnswer) + '°', p.point.x + uWorld.x, p.point.y + uWorld.y);
  textStyle(NORMAL);
}

function rotatePoint(pt, deg) {
  var c = cos(deg), s = sin(deg);
  return { x: pt.x * c - pt.y * s, y: pt.x * s + pt.y * c };
}

// a dark band under the question text, so it reads on every course (light sand included)
function drawQuestionBand(h) {
  noStroke();
  for (var i = 0; i < 12; i++) { fill(0, 0, 0, 150 * (1 - i / 12)); rect(0, 82 + h + i * 3, width, 3); }
  fill(0, 0, 0, 150); rect(0, 82, width, h);
}

// No background panel any more - just a bold title floating near the
// top (with a soft drop-shadow pass for legibility over the course
// art) once the camera has zoomed in, and a small pill-shaped input
// at the bottom instead of one big black box.
function drawQuestionOverlay() {
  if (!pendingShot || !questionReady) return;   // wait for the zoom to finish
  var isWall = pendingShot.type === 'WALL';
  drawQuestionBand(pendingShot.algebra || retryHint || pendingShot.timerOn ? 150 : 88);
  var title = isWall ? tl('Supplementary Angles', 'Ángulos suplementarios') : tl('Complementary Angles', 'Ángulos complementarios');
  var relWord = isWall ? tl('sum to 180°', 'suman 180°') : tl('sum to 90°', 'suman 90°');

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
  text(tl('These two angles ', 'Estos dos ángulos ') + relWord, width / 2 + 1, 151);
  fill(216, 226, 216);
  text(tl('These two angles ', 'Estos dos ángulos ') + relWord, width / 2, 150);

  if (retryHint) {
    var hintY = pendingShot.algebra ? 206 : 178;
    // just the rule for THIS question: a wall shot is supplementary, a straight shot complementary
    var hint = isWall
      ? tl('Hint: supplementary angles always add up to 180°.', 'Pista: los ángulos suplementarios siempre suman 180°.')
      : tl('Hint: complementary angles always add up to 90°.', 'Pista: los ángulos complementarios siempre suman 90°.');
    textSize(16);
    fill(0, 0, 0, 140);
    text(hint, width / 2 + 1, hintY + 1);
    fill('#ffce6b');
    text(hint, width / 2, hintY);
    if ((pendingShot.tries || 1) >= 3) {   // a second wrong try: the equation, with a blank to fill
      var kq = pendingShot.algebra ? (pendingShot.algebra.a * pendingShot.algebra.x + pendingShot.algebra.b) : pendingShot.known;
      var eq = (isWall ? 180 : 90) + '° − ' + kq + '° = ?';
      textSize(22);
      fill(0, 0, 0, 140);
      text(eq, width / 2 + 1, hintY + 27);
      fill(255);
      text(eq, width / 2, hintY + 26);
    }
    textSize(18);
  }
  if (pendingShot.algebra) {
    var alg = pendingShot.algebra;
    fill(0, 0, 0, 130);
    text(tl('Known angle = (', 'Ángulo conocido = (') + alg.a + 'x + ' + alg.b + tl(')°, and x = ', ')°, y x = ') + alg.x, width / 2 + 1, 179);
    fill('#ffce6b');
    text(tl('Known angle = (', 'Ángulo conocido = (') + alg.a + 'x + ' + alg.b + tl(')°, and x = ', ')°, y x = ') + alg.x, width / 2, 178);
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
  text(tl('Hit', 'Golpear'), sx + sw / 2, iy + ih / 2 + 1);
  textStyle(NORMAL);
  textAlign(LEFT, BASELINE);
}

function handleAnswerKey(k) {
  if (holePhase !== 'QUESTION' || answerLocked || !questionReady) return;
  if (k === 'backspace') { answerText = answerText.slice(0, -1); return; }
  if (k === 'enter') { submitAnswer(); return; }
  if (answerText.length < 3) answerText += k;
}

// Shared by drawLiveAngleDiagram and the green-angle helpers -
// both need the same "which direction
// is the 0deg baseline, which way does the known angle sweep" derived
// from a shot object, so this is the one place that math lives.
function shotBaseAngleAndSweep(shot) {
  var dir0 = shot.type === 'WALL' ? shot.Wd : vPerp(shot.aimDir);
  var sweepDirVec = shot.type === 'WALL' ? shot.N : shot.aimDir;
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
    // A right answer bounces like a real bank shot. A wrong one leaves along the far edge of the red
    // wedge drawn afterwards: the typed angle measured on from the ball's incoming path (skimming
    // along the wall if the typed angle runs past it).
    var kw = pendingShot.algebra ? (pendingShot.algebra.a * pendingShot.algebra.x + pendingShot.algebra.b) : pendingShot.known;
    pendingShot.resolvedAngle = correct ? wallNormalAngle(pendingShot.correctAnswer) : wallNormalAngle(constrain(kw + typed, 3, 177));
  } else {
    if (!correct) {
      // the typed angle measured on the question's right angle: the ball leaves along that line
      var bs = shotBaseAngleAndSweep(pendingShot);
      var kv = pendingShot.algebra ? (pendingShot.algebra.a * pendingShot.algebra.x + pendingShot.algebra.b) : pendingShot.known;
      var outAng = bs.baseAngle + bs.sweepSign * (kv + constrain(typed, 1, 179));
      launchDir = { x: cos(outAng), y: sin(outAng) };
      pendingShot.bendDeg = 0;
      pendingShot.applied = true;
    }
  }
  triggerScreenFlash(correct ? '#3ea158' : '#e63946', correct);

  answerLocked = true;
  ball.vx = launchDir.x * pendingShot.power;
  ball.vy = launchDir.y * pendingShot.power;
  pendingShot.launchDir = launchDir;
  holePhase = 'ROLLING';
  nextStroke();
  playSound('hit');
  playSound(correct ? 'correct' : 'wrong');
  var baseSweep = shotBaseAngleAndSweep(pendingShot);
  resolvedInfo = {
    correctAnswer: pendingShot.correctAnswer, typed: typed, correct: correct,
    point: { x: pendingShot.point.x, y: pendingShot.point.y },
    offsetDir: pendingShot.type === 'WALL' ? pendingShot.N : { x: 0, y: -1 },
    wd: pendingShot.type === 'WALL' ? pendingShot.Wd : null,
    type: pendingShot.type, known: pendingShot.known, algebra: pendingShot.algebra,
    shot: pendingShot,
    baseAngle: baseSweep.baseAngle, sweepSign: baseSweep.sweepSign,
    revealed: false, revealFrom: { x: ball.x, y: ball.y },
    aimAngle: atan2(pendingShot.aimDir.y, pendingShot.aimDir.x), launchAngle: atan2(launchDir.y, launchDir.x),
    trail: [{ x: ball.x, y: ball.y }], trailDone: false, afterReveal: 0,
    intendedTrail: simulateTrail(pendingShot, correct)
  };
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
    if (explainModalHit(mouseX, mouseY)) { explainOpen = false; playSound('click'); retryQuestion(); }
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
  if (gameState === 'COURSE_SELECT') {
    var cs = courseSelectHit(mouseX, mouseY);
    if (cs === 'back') { gameState = 'MENU'; playSound('click'); }
    else if (cs !== null) { playSound('click'); chooseCourse(cs); }
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
    var sh = scorecardHit(mouseX, mouseY);
    if (sh) scorecardAction(sh);
    return;
  }
  if (gameState === 'PLAYING' && holePhase === 'QUESTION') {
    if (!questionReady) return;
    var iw = 124, ih = 50, sw = 112, gap = 10;   // (the same box drawQuestionOverlay draws)
    var totalW = iw + gap + sw;
    var ix = width / 2 - totalW / 2, iy = height - ih - 24;
    var sx = ix + iw + gap;
    if (mouseX > sx && mouseX < sx + sw && mouseY > iy && mouseY < iy + ih) submitAnswer();
    return;
  }
  if (gameState === 'PLAYING' && holePhase === 'AIMING') {
    var d = dist(mouseX, mouseY, ball.x, ball.y);
    if (d < 220) {
      kbAim = null;   // the mouse takes over from any keyboard aim
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
// p5 listens for touches on the whole page, so only touches that start on the game itself are handled (and kept from
// scrolling); anywhere else - the top bar's All games / Fullscreen / Standards buttons, the number pad - the tap goes
// through untouched. (Returning false for every touch used to swallow those taps on phones.)
function onGame(e) { return !!(e && e.target && e.target.tagName === 'CANVAS'); }
function touchStarted(e) { if (!onGame(e)) return; mousePressed(); return false; }
function touchMoved(e) { if (!onGame(e)) return; mouseDragged(); return false; }
function touchEnded(e) { if (!onGame(e)) return; mouseReleased(); return false; }

// Desktop keyboard: digits, backspace, enter for the answer box. Mobile
// uses the on-screen keypad in bank-shot-angle-golf-mobile-controls.js,
// which calls handleAnswerKey() directly.
function keyPressed(ev) {
  // Tab and any key aimed at the page's own controls (All games, Fullscreen...) keep their normal behavior
  if (keyCode === 9 || (window.isPageControlKey && window.isPageControlKey(ev))) return true;
  // Returning false below cancels a key's default action, which would also
  // swallow browser shortcuts (Ctrl+R / Ctrl+Shift+R hard refresh, F5, etc).
  // Let any Ctrl/Cmd/Alt combo and function key through untouched.
  if ((ev && (ev.ctrlKey || ev.metaKey || ev.altKey)) ||
      keyIsDown(CONTROL) || keyIsDown(91) || keyIsDown(93) || keyIsDown(224) ||
      (keyCode >= 112 && keyCode <= 123)) return true;
  if (kbKeyPressed()) return false;
  // Escape acts the same as clicking the exit button - both bring up the
  // same confirm-before-quitting overlay.
  if (keyCode === ESCAPE && gameState === 'PLAYING' && !confirmExitOpen) {
    confirmExitOpen = true;
    return false;
  }
  if (explainOpen) {
    if (keyCode === ENTER || keyCode === RETURN || key === ' ') { explainOpen = false; playSound('click'); retryQuestion(); }
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
  retryHint = false;
  questionReady = false;
  answerText = '';
  answerLocked = false;
  timerStart = millis();
  holePhase = 'QUESTION';
}


// ---------------------------------------------------------------
// Hero-mode timeout chaos shot
// ---------------------------------------------------------------
function triggerTimeoutChaos() {
  // Running out of time counts as a miss, like a wrong answer: the ball doesn't move, the
  // explanation card opens, and then the same question is asked again with the hint.
  answerLocked = true;
  var shot = pendingShot;
  shot.launchFrom = { x: ball.x, y: ball.y };
  var baseSweep = shotBaseAngleAndSweep(shot);
  resolvedInfo = {
    correctAnswer: shot.correctAnswer, typed: null, correct: false, timedOut: true,
    point: { x: shot.point.x, y: shot.point.y },
    offsetDir: shot.type === 'WALL' ? shot.N : { x: 0, y: -1 },
    wd: shot.type === 'WALL' ? shot.Wd : null,
    type: shot.type, known: shot.known, algebra: shot.algebra,
    shot: shot,
    baseAngle: baseSweep.baseAngle, sweepSign: baseSweep.sweepSign,
    revealed: false, revealFrom: { x: ball.x, y: ball.y },
    aimAngle: atan2(shot.aimDir.y, shot.aimDir.x), launchAngle: atan2(shot.aimDir.y, shot.aimDir.x),
    trail: [{ x: ball.x, y: ball.y }], trailDone: true, afterReveal: 0, intendedTrail: []
  };
  nextStroke();
  playSound('wrong');
  triggerScreenFlash('#e63946', false);
  holePhase = 'EXPLAIN';
  explainOpen = true;
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
  textSize(18);
  textStyle(BOLD);
  var practice = gameMode === MODE_PRACTICE;
  // while the solved equation sits in the middle of this bar, the side text stays short so they never overlap
  var busy = !!resolvedInfo;
  text(practice ? course.theme.icon + ' ' + course.theme.label : (busy ? hole.icon + ' ' + tl('Hole ', 'Hoyo ') + (holeIndex + 1) : hole.icon + ' ' + hole.name), 20, 26);
  textStyle(NORMAL);
  textSize(15);
  fill(180, 195, 180);
  if (!busy) text(practice ? tl('Free practice · no par, no limit', 'Práctica libre · sin par, sin límite')
                : course.theme.icon + ' ' + tl('Hole ', 'Hoyo ') + (holeIndex + 1) + ' / 9  ·  Par ' + hole.par, 20, 54);
  textAlign(RIGHT, CENTER);
  fill(255);
  textSize(18);
  textStyle(BOLD);
  text((practice ? tl('Shots: ', 'Tiros: ') : tl('Strokes: ', 'Golpes: ')) + strokeCount, width - 20, 26);
  textStyle(NORMAL);
  textSize(15);
  fill(180, 195, 180);
  if (busy) { }
  else if (practice) text(modeName(), width - 20, 54);
  else {
    var rs = roundStrokes();
    var best = courseRecord(gameMode, course.key).best[holeIndex];
    text(tl('Round: ', 'Ronda: ') + rs + (scorecard.length ? ' (' + relText(rs - (scorecard.length > holeIndex ? 0 : strokeCount) - roundPar(scorecard.length)) + ')' : '') + (best ? tl('  ·  Best here: ', '  ·  Mejor aquí: ') + best : ''), width - 20, 54);
  }
  textAlign(LEFT, BASELINE);
}

// The actual arithmetic behind a correct answer, shown big and bold
// across the HUD bar (between the hole/mode readouts on either side)
// once the angle is revealed, in the same bright green as
// the correct angle label - this is the reward for getting it right,
// so it's sized to be unmissable rather than a small readout. A wrong
// answer gets its own full explanation via drawExplainModal instead
// of a shrunk-down version of this.
// After a wrong answer: a small card adding the two angles, showing they miss the total -
// without giving away the right number (the question is asked again).
function drawSumCheckCard() {
  var ri = resolvedInfo, sum = ri.type === 'WALL' ? 180 : 90;
  var k = ri.algebra ? (ri.algebra.a * ri.algebra.x + ri.algebra.b) : ri.known;
  var line1 = k + '° + ' + ri.typed + '° = ' + (k + ri.typed) + '°';
  var line2 = tl('not ', 'no ') + sum + '°';
  noStroke();
  fill(15, 22, 16, 225);
  rect(width / 2 - 140, 10, 280, 66, 12);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  fill(255);
  textSize(24);
  text(line1, width / 2, 32);
  fill('#ff8a93');
  textSize(19);
  text(line2, width / 2, 58);
  textStyle(NORMAL);
  textAlign(LEFT, BASELINE);
}
function drawEquation() {
  if (!resolvedInfo) return;
  if (!resolvedInfo.correct) { if (resolvedInfo.typed !== null) drawSumCheckCard(); return; }
  var sum = resolvedInfo.type === 'WALL' ? 180 : 90;
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
  var sum = info.type === 'WALL' ? 180 : 90;
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
  text('?', cos(uMid) * r * 0.65, sin(uMid) * r * 0.65);
  textStyle(NORMAL);
  pop();
}

// Names the most likely slip behind a wrong answer, so the retry is aimed at the real problem.
function mistakeNote(ri) {
  if (!ri || ri.typed === null || ri.typed === undefined) return '';
  var sum = ri.type === 'WALL' ? 180 : 90, other = sum === 180 ? 90 : 180;
  var k = ri.algebra ? (ri.algebra.a * ri.algebra.x + ri.algebra.b) : ri.known;
  var right = sum - k, t = ri.typed;
  if (ri.algebra) {
    var a = ri.algebra.a, x = ri.algebra.x, b = ri.algebra.b;
    if (t === sum - a * x || t === sum - b || t === sum - (a + x + b) || t === sum - (a * x * b))
      return tl('Work out the given angle first: ', 'Primero calcula el ángulo dado: ') + a + '(' + x + ') + ' + b + ' = ' + k + '°.';
  }
  if (t === k) return tl('That’s the angle you were given. Find the other one.', 'Ese es el ángulo que te dieron. Halla el otro.');
  if (t + k === other) return sum === 90
    ? tl('Those add up to 180°. These two make a square corner, so they add to 90°.', 'Esos suman 180°. Estos dos forman una esquina recta, así que suman 90°.')
    : tl('Those add up to 90°. These two make a straight line, so they add to 180°.', 'Esos suman 90°. Estos dos forman una línea recta, así que suman 180°.');
  if (t === sum + k || t >= sum) return tl('That’s bigger than ', 'Eso es más que ') + sum + tl('°. Take the given angle away from ', '°. Resta el ángulo dado a ') + sum + '°.';
  if (Math.abs(t - right) <= 10) return tl('Close! Check your subtraction: ', '¡Casi! Revisa tu resta: ') + sum + ' − ' + k + '.';
  return tl('Start from ', 'Empieza con ') + sum + tl('° and take away ', '° y resta ') + k + '°.';
}

var EXPLAIN_BOX_W = 600;
// Every y below is measured from the top of the box, spaced evenly so the box is
// only as tall as its content (algebra questions have one extra equation line).
function explainLayout() {
  var alg = !!(resolvedInfo && resolvedInfo.algebra);
  var diagR = 165, diagCY = 300;
  var eqY = diagCY + 54;
  var typedY = eqY + (alg ? 82 : 46);
  var btnY = typedY + 64;   // room for the answer they gave and a note about the likely mistake
  var boxH = btnY + EXPLAIN_BTN.h + 34;
  return { w: EXPLAIN_BOX_W, h: boxH, diagR: diagR, diagCY: diagCY, eqY: eqY, typedY: typedY, btnY: btnY };
}
var EXPLAIN_BTN = { w: 220, h: 56 };

// Opened the instant a typed answer turns out wrong (see submitAnswer,
// explainOpen). Rebuilds the exact question the player just faced as a
// large standalone diagram, states the rule in words, then walks the
// same arithmetic drawEquation shows a correct answer - so a miss
// teaches the rule instead of just penalizing it. Physics stays frozen
// (see the updatePhysics guard in gameDraw) until tl("Got It", "Entendido") is clicked.
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

  var sum = resolvedInfo.type === 'WALL' ? 180 : 90;
  var relWord = resolvedInfo.type === 'WALL' ? tl('supplementary', 'suplementarios') : tl('complementary', 'complementarios');

  noStroke();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  fill('#e63946');
  textSize(26);
  text(tl('✗ Let’s Break This Down', '✗ Veamos qué pasó'), width / 2, by + 44);
  textStyle(NORMAL);

  textSize(17);
  fill(206, 218, 206);
  text(tl('These two angles are ', 'Estos dos ángulos son ') + relWord + tl(' - together they always', ' - juntos siempre'), width / 2, by + 82);
  text(tl('add up to ', 'suman ') + sum + '°.', width / 2, by + 106);

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
    text(sum + '° − ' + resolvedInfo.known + '° = ?', width / 2, eqY + 36);
  } else {
    fill('#4dff4d');
    textSize(28);
    text(sum + '° − ' + resolvedInfo.known + '° = ?', width / 2, eqY);
  }
  textStyle(NORMAL);

  if (resolvedInfo.timedOut) {
    fill(230, 130, 130);
    textSize(15);
    text(tl('Time ran out.', 'Se acabó el tiempo.'), width / 2, by + L.typedY);
  }
  if (resolvedInfo.typed !== null) {
    fill(230, 130, 130);
    textSize(15);
    text(tl('You answered ', 'Respondiste ') + resolvedInfo.typed + tl('° instead.', '° en su lugar.'), width / 2, by + L.typedY);
    var note = mistakeNote(resolvedInfo);
    if (note) { fill('#ffce6b'); textSize(16); textStyle(BOLD); text(note, width / 2, by + L.typedY + 28); textStyle(NORMAL); }
  }

  var btn = EXPLAIN_BTN, btnX = width / 2 - btn.w / 2, btnY = by + L.btnY;
  fill('#3ea158');
  rect(btnX, btnY, btn.w, btn.h, 12);
  noStroke();
  fill(255);
  textSize(19);
  textStyle(BOLD);
  text(tl('Got It', 'Entendido'), width / 2, btnY + btn.h / 2 + 1);
  textStyle(NORMAL);
}

// After the explanation card: the ball goes back to where it was hit and the SAME question
// (same aim, power and angle) is asked again, this time with the rule shown as a hint.
function retryQuestion() {
  var ri = resolvedInfo;
  if (!ri || !ri.shot || holePhase !== 'EXPLAIN') return;
  var p = ri.shot;
  ball.x = p.launchFrom.x; ball.y = p.launchFrom.y; ball.vx = 0; ball.vy = 0;
  p.tries = (p.tries || 1) + 1;   // how many times this question has been asked
  p.applied = false; p.typed = undefined; p.correct = undefined; p.resolvedAngle = undefined;
  p.launchDir = undefined; p.bendDeg = 0;
  pendingShot = p;
  resolvedInfo = null;
  holeBlockedThisStroke = false;
  retryHint = true;
  answerText = '';
  answerLocked = false;
  questionReady = false;
  timerStart = millis();
  holePhase = 'QUESTION';
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
  text(tl('☰ Menu', '☰ Menú'), b.x + b.w / 2, b.y + b.h / 2 + 1);
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
  text(tl('Exit to Main Menu?', '¿Salir al menú principal?'), width / 2, y + 52);
  textStyle(NORMAL);
  textSize(16);
  fill(200, 212, 200);
  text(tl('This round will end and won’t be saved.', 'Esta ronda terminará y no se guardará.'), width / 2, y + 84);

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
  text(tl('Cancel', 'Cancelar'), noX + EXIT_CONFIRM_NO.w / 2, by + EXIT_CONFIRM_NO.h / 2 + 1);
  text(tl('Exit', 'Salir'), yesX + EXIT_CONFIRM_YES.w / 2, by + EXIT_CONFIRM_YES.h / 2 + 1);
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

// ---------------------------------------------------------------
// End of a hole: the score, stars, this hole's best, and the round so far
// ---------------------------------------------------------------
var HOLE_BOX = { w: 560, h: 372 };
var NEXT_BTN = { w: 210, h: 52 };
function drawStar(cx, cy, r, filled) {
  push(); translate(cx, cy);
  stroke(filled ? '#b8860b' : color(255, 255, 255, 90)); strokeWeight(2.5);
  fill(filled ? '#ffd166' : color(255, 255, 255, 25));
  beginShape();
  for (var i = 0; i < 10; i++) { var a = -90 + i * 36, rr = i % 2 === 0 ? r : r * 0.45; vertex(cos(a) * rr, sin(a) * rr); }
  endShape(CLOSE);
  pop();
}
// one row of nine little score boxes (the round so far)
function drawMiniCard(x, y, cellW) {
  textAlign(CENTER, CENTER);
  for (var i = 0; i < 9; i++) {
    var s = scorecard[i], p = course.holes[i].par, cx = x + i * cellW;
    fill(i === holeIndex ? color(255, 255, 255, 40) : color(0, 0, 0, 90)); rect(cx, y, cellW - 4, 46, 6);
    fill(150, 165, 150); textSize(11); text(i + 1, cx + (cellW - 4) / 2, y + 11);
    if (s !== undefined) { fill(s < p ? '#7dffb0' : (s > p ? '#ff9a9a' : '#ffffff')); textStyle(BOLD); textSize(17); text(s, cx + (cellW - 4) / 2, y + 31); textStyle(NORMAL); }
  }
}
function holeBoxRect() { return { x: width / 2 - HOLE_BOX.w / 2, y: height / 2 - HOLE_BOX.h / 2 }; }
function nextButtonRect() { var r = holeBoxRect(); return { x: width / 2 - NEXT_BTN.w / 2, y: r.y + HOLE_BOX.h - NEXT_BTN.h - 20, w: NEXT_BTN.w, h: NEXT_BTN.h }; }
function drawHoleCompleteOverlay() {
  noStroke();
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);
  var b = HOLE_BOX, r0 = holeBoxRect(), x = r0.x, y = r0.y;
  fill(15, 20, 15, 238); rect(x, y, b.w, b.h, 18);
  stroke(course.theme.accent); strokeWeight(2); noFill(); rect(x, y, b.w, b.h, 18); noStroke();
  textAlign(CENTER, CENTER);
  fill(200, 215, 200); textSize(16);
  text(hole.icon + '  ' + tl('Hole ', 'Hoyo ') + (holeIndex + 1) + ': ' + hole.name, width / 2, y + 30);
  var word = scoreWord(strokeCount, hole.par), rel = strokeCount - hole.par;
  fill(strokeCount === 1 ? '#ffd166' : (rel < 0 ? '#7dffb0' : (rel === 0 ? '#ffffff' : '#ffce6b')));
  textStyle(BOLD); textSize(36); text(word, width / 2, y + 70); textStyle(NORMAL);
  fill(220, 230, 220); textSize(17);
  text(tl('Strokes: ', 'Golpes: ') + strokeCount + '   ·   Par ' + hole.par, width / 2, y + 106);
  // the stars pop in one at a time
  var stars = holeResult ? holeResult.stars : holeStars(strokeCount, hole.par);
  var since = holeResult ? millis() - holeResult.at : 9999;
  for (var i = 0; i < 3; i++) {
    var appear = since > 250 + i * 260, on = appear && i < stars;
    if (holeResult && on && (holeResult.played || 0) <= i) { holeResult.played = i + 1; playFx('star'); }
    var sz = on && since < 250 + i * 260 + 160 ? 30 : 24;
    drawStar(width / 2 - 54 + i * 54, y + 146, sz, on);
  }
  // this hole's best
  var best = courseRecord(gameMode, course.key).best[holeIndex];
  textSize(15);
  if (holeResult && holeResult.newBest) { fill('#ffd166'); textStyle(BOLD); text(tl('NEW BEST on this hole! (was ', '¡NUEVO RÉCORD en este hoyo! (era ') + holeResult.prev + ')', width / 2, y + 186); textStyle(NORMAL); }
  else if (holeResult && holeResult.firstTime) { fill(200, 215, 200); text(tl('First time on this hole: that’s your best to beat.', 'Primera vez en este hoyo: ese es tu récord a batir.'), width / 2, y + 186); }
  else { fill(200, 215, 200); text(tl('Your best on this hole: ', 'Tu mejor en este hoyo: ') + best, width / 2, y + 186); }
  // the round so far
  drawMiniCard(x + 28, y + 208, (b.w - 56) / 9);
  var done = scorecard.length, tot = 0; for (var k = 0; k < done; k++) tot += scorecard[k];
  fill(255); textSize(15); textStyle(BOLD);
  text(tl('Round total: ', 'Total de la ronda: ') + tot + '  (' + relText(tot - roundPar(done)) + tl(' to par)', ' respecto al par)'), width / 2, y + 274);
  textStyle(NORMAL);
  var nb = nextButtonRect();
  fill(course.theme.accent); rect(nb.x, nb.y, nb.w, nb.h, 12);
  fill('#101010'); textSize(18); textStyle(BOLD);
  text(holeIndex + 1 < 9 ? tl('Next Hole', 'Siguiente hoyo') : tl('See Scorecard', 'Ver tarjeta'), width / 2, nb.y + nb.h / 2 + 1);
  textStyle(NORMAL);
  textAlign(LEFT, BASELINE);
}

// ---------------------------------------------------------------
// The round's scorecard: every hole's strokes, par, best and stars, the total, and the course record
// ---------------------------------------------------------------
var CARD_BTNS = [{ id: 'again', w: 170 }, { id: 'courses', w: 170 }, { id: 'menu', w: 130 }];
var CARD_BTN_Y = 530, CARD_BTN_H = 52, CARD_BTN_GAP = 14;
var kbCardSel = 0;
function cardButtonX(i) {
  var total = 0; CARD_BTNS.forEach(function (b) { total += b.w; }); total += CARD_BTN_GAP * (CARD_BTNS.length - 1);
  var x = width / 2 - total / 2; for (var k = 0; k < i; k++) x += CARD_BTNS[k].w + CARD_BTN_GAP;
  return x;
}
function drawScorecard() {
  var th = course.theme, rec = courseRecord(gameMode, course.key);
  background(10, 14, 10);
  noStroke();
  textAlign(CENTER, CENTER);
  fill(255); textStyle(BOLD); textSize(36); text(tl('Round Complete!', '¡Ronda terminada!'), width / 2, 58); textStyle(NORMAL);
  fill(180, 195, 180); textSize(16); text(th.icon + ' ' + th.label + '  ·  ' + modeName(), width / 2, 92);
  // the table: a label column, then one column per hole, then the total
  var x0 = 14, labelW = 70, colW = 56, totW = 92, y0 = 128, rowH = 44;
  var rows = [tl('Hole', 'Hoyo'), 'Par', tl('You', 'Tú'), tl('Best', 'Mejor'), tl('Stars', 'Estrellas')];
  var totalStrokes = 0, par = 0, starsRound = 0;
  for (var r = 0; r < rows.length; r++) {
    var ry = y0 + r * rowH;
    fill(r === 0 ? color(30, 40, 30) : color(20, 26, 20)); rect(x0, ry, labelW + colW * 9 + totW, rowH - 4, 6);
    fill(160, 175, 160); textSize(13); textStyle(BOLD); text(rows[r], x0 + labelW / 2, ry + rowH / 2 - 2); textStyle(NORMAL);
    for (var i = 0; i < 9; i++) {
      var cx = x0 + labelW + i * colW + colW / 2, cy = ry + rowH / 2 - 2, s = scorecard[i], p = course.holes[i].par;
      if (r === 0) { textSize(18); fill(255); text(course.holes[i].icon, cx, cy); }
      else if (r === 1) { fill(200); textSize(16); text(p, cx, cy); }
      else if (r === 2) { fill(s < p ? '#7dffb0' : (s > p ? '#ff9a9a' : '#ffffff')); textStyle(BOLD); textSize(19); text(s, cx, cy); textStyle(NORMAL); }
      else if (r === 3) { fill(rec.best[i] === s ? '#ffd166' : color(200)); textSize(16); text(rec.best[i] || '—', cx, cy); }
      else { var st = holeStars(s, p); starsRound += st; fill('#ffd166'); textSize(12); text('★'.repeat(st), cx, cy); }
    }
    if (r === 0) { fill(255); textSize(13); textStyle(BOLD); text(tl('Total', 'Total'), x0 + labelW + 9 * colW + totW / 2, ry + rowH / 2 - 2); textStyle(NORMAL); }
  }
  for (var j = 0; j < 9; j++) { totalStrokes += scorecard[j]; par += course.holes[j].par; }
  var txx = x0 + labelW + 9 * colW + totW / 2;
  fill(200); textSize(16); text(par, txx, y0 + rowH * 1 + rowH / 2 - 2);
  fill(255); textStyle(BOLD); textSize(19); text(totalStrokes, txx, y0 + rowH * 2 + rowH / 2 - 2); textStyle(NORMAL);
  fill('#ffd166'); textSize(16); text(rec.total || '—', txx, y0 + rowH * 3 + rowH / 2 - 2);
  fill('#ffd166'); textSize(14); text(starsRound + ' / 27', txx, y0 + rowH * 4 + rowH / 2 - 2);

  var rel = totalStrokes - par, ly = y0 + rowH * 5 + 34;
  fill(255); textStyle(BOLD); textSize(26);
  text(tl('Total: ', 'Total: ') + totalStrokes + tl(' strokes  (', ' golpes  (') + relText(rel) + tl(' to par)', ' respecto al par)'), width / 2, ly);
  textStyle(NORMAL); textSize(18);
  if (roundResult && roundResult.isNew) { fill('#ffd166'); textStyle(BOLD); text(tl('🏆 New course record! (was ', '🏆 ¡Nuevo récord del campo! (era ') + roundResult.prev + ')', width / 2, ly + 42); textStyle(NORMAL); }
  else if (roundResult && roundResult.first) { fill('#7dffb0'); text(tl('Your first round here: that’s the score to beat.', 'Tu primera ronda aquí: esa es la marca a batir.'), width / 2, ly + 42); }
  else { fill(200, 215, 200); text(tl('Course record: ', 'Récord del campo: ') + rec.total, width / 2, ly + 42); }
  fill(200, 215, 200); textSize(16);
  text(tl('Stars on this course: ', 'Estrellas en este campo: ') + starsText(starTotal(rec.stars)), width / 2, ly + 76);

  var labels = { again: tl('Play Again', 'Jugar otra vez'), courses: tl('Courses', 'Campos'), menu: tl('Menu', 'Menú') };
  for (var bi = 0; bi < CARD_BTNS.length; bi++) {
    var btn = CARD_BTNS[bi], bx = cardButtonX(bi);
    var hov = inBox(mouseX, mouseY, bx, CARD_BTN_Y, btn.w, CARD_BTN_H) || (kbShown && kbCardSel === bi);
    fill(bi === 0 ? th.accent : color(40, 52, 42)); rect(bx, CARD_BTN_Y, btn.w, CARD_BTN_H, 12);
    if (hov) { stroke(255, 214, 60); strokeWeight(3); noFill(); rect(bx - 3, CARD_BTN_Y - 3, btn.w + 6, CARD_BTN_H + 6, 14); noStroke(); }
    fill(bi === 0 ? '#101010' : 255); textStyle(BOLD); textSize(18); text(labels[btn.id], bx + btn.w / 2, CARD_BTN_Y + CARD_BTN_H / 2 + 1); textStyle(NORMAL);
  }
  textAlign(LEFT, BASELINE);
}
function scorecardHit(mx, my) {
  for (var i = 0; i < CARD_BTNS.length; i++) if (inBox(mx, my, cardButtonX(i), CARD_BTN_Y, CARD_BTNS[i].w, CARD_BTN_H)) return CARD_BTNS[i].id;
  return null;
}
function scorecardAction(id) {
  playSound('click');
  if (id === 'again') chooseCourse(COURSES.indexOf(course));
  else if (id === 'courses') gameState = 'COURSE_SELECT';
  else if (id === 'menu') gameState = 'MENU';
}

