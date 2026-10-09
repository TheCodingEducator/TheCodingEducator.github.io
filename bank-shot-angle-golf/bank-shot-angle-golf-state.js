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
// results by skill at the end of a round (site-results.js)
if (window.SiteResults) SiteResults.setup([{ id: 'comp', en: 'Complementary angles', es: 'Ángulos complementarios' }, { id: 'supp', en: 'Supplementary angles', es: 'Ángulos suplementarios' }, { id: 'vert', en: 'Vertical angles', es: 'Ángulos opuestos por el vértice' }]);
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
// live off pendingShot), so it keeps showing what the correct answer WAS.
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
var QUESTION_ZOOM = 1.7;   // how close the camera moves in while the question is up

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
var recordsCache = null;   // (read once, not every frame)
function loadRecords() { if (recordsCache) return JSON.parse(recordsCache); try { recordsCache = localStorage.getItem(RECORDS_KEY) || '{}'; return JSON.parse(recordsCache); } catch (e) { return {}; } }
function saveRecords(r) { recordsCache = JSON.stringify(r); try { localStorage.setItem(RECORDS_KEY, recordsCache); } catch (e) {} }
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
    var order = ['cancel', 'restart', 'exit'], oi = order.indexOf(kbExitSel);
    if (keyCode === LEFT_ARROW || keyCode === UP_ARROW) { kbExitSel = order[max(0, oi - 1)]; return true; }   // the three buttons sit side by side
    if (keyCode === RIGHT_ARROW || keyCode === DOWN_ARROW) { kbExitSel = order[min(order.length - 1, oi + 1)]; return true; }
    if (keyCode === ESCAPE) { confirmExitOpen = false; kbExitSel = 'cancel'; playSound('click'); return true; }
    if (kbConfirmKey()) {
      var act = kbExitSel;
      kbExitSel = 'cancel';
      menuAction(act);
      return true;
    }
    return true;
  }
  if (gameState === 'MENU') {
    kbShown = true;
    var hasSave = !!loadProgress();
    if (keyCode === LEFT_ARROW) { kbMenuSel = kbMenuSel === 3 ? 2 : (kbMenuSel === 2 ? 2 : 0); return true; }
    if (keyCode === RIGHT_ARROW) { kbMenuSel = kbMenuSel >= 2 ? (hasSave ? 3 : 2) : 1; return true; }
    if (keyCode === DOWN_ARROW) { kbMenuSel = hasSave ? 3 : 2; return true; }
    if (keyCode === UP_ARROW) { if (kbMenuSel >= 2) kbMenuSel = 0; return true; }
    if (kbConfirmKey()) {
      playSound('click');
      if (kbMenuSel === 3) resumeProgress(); else if (kbMenuSel === 2) startPractice(); else { gameMode = kbMenuSel === 0 ? MODE_EASY : MODE_HARD; startCourse(); }
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
    // starts pointing the way of the first arrow key pressed (not at the cup, so the player does the aiming);
    // after that, ← → turn the shot and ↑ ↓ set the power
    var startAng = keyIsDown(RIGHT_ARROW) ? 0 : (keyIsDown(LEFT_ARROW) ? 180 : (keyIsDown(DOWN_ARROW) ? 90 : -90));
    kbAim = { ang: startAng, power: 0.45, fresh: true };   // (every new shot starts this way)
  }
  // the first press only sets the direction: turning and power start once that key is let go
  if (kbAim.fresh) { if (!turn && !push) kbAim.fresh = false; }
  else {
    var fine = keyIsDown(SHIFT) ? 0.25 : 1;   // hold Shift for small adjustments
    kbAim.ang += turn * 1.6 * fine;
    kbAim.power = constrain(kbAim.power + push * 0.012 * fine, 0.08, 1);
  }
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
    var mb = menuButtonRects().filter(function (b) { return b.id === kbExitSel; })[0];
    if (mb) r = { x: mb.x, y: mb.y, w: mb.w, h: mb.h, rr: 10 };
  } else if (gameState === 'MENU') {
    if (kbMenuSel === 3 && loadProgress()) { var cr = continueRect(); r = { x: cr.x, y: cr.y, w: cr.w, h: cr.h, rr: cr.h / 2 }; }
    else if (kbMenuSel >= 2) { var pr = practiceRect(); r = { x: pr.x, y: pr.y, w: pr.w, h: pr.h, rr: pr.h / 2 }; }
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
  if (wantZoomIn) {   // keep the zoomed view inside the scenery (no black past the edge of the course)
    var half = 350 / targetZoom;
    targetFocus = { x: constrain(targetFocus.x, half, 700 - half), y: constrain(targetFocus.y, half, 700 - half) };
  }
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
