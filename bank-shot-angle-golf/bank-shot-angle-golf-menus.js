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
    [tl('Two equal angles and one to find,', 'Dos ángulos iguales y uno por hallar,'), tl('any angle, algebra on the back nine.', 'cualquier ángulo, álgebra al final.')], tl('See the bounce: in and out at the same angle.', 'Mira el rebote: entra y sale con el mismo ángulo.'), '#e0562f');

  drawPracticeButton();

  textAlign(CENTER, CENTER);
  textSize(15);
  fill(140, 155, 140);
  text(tl('Three themed courses · 9 holes each · your best scores are saved', 'Tres campos temáticos · 9 hoyos cada uno · se guardan tus mejores marcas'), width / 2, PRACTICE_BTN.y + PRACTICE_BTN.h + 24);
}

var PRACTICE_BTN = { w: 340, h: 50, y: 608 };

// ---------------------------------------------------------------
// A round in progress is saved at the start of every hole, so a student can pick it up again later
// from the menu (this device only). It's cleared when the round is finished.
// ---------------------------------------------------------------
var PROGRESS_KEY = 'bankshot_progress';
function saveProgress(hole) {
  if (gameMode === MODE_PRACTICE || !course || course.key === 'practice') return;
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify({ mode: gameMode, course: course.key, hole: hole === undefined ? holeIndex : hole, scorecard: scorecard.slice() })); } catch (e) {}
}
function clearProgress() { try { localStorage.removeItem(PROGRESS_KEY); } catch (e) {} }
function loadProgress() {
  try {
    var p = JSON.parse(localStorage.getItem(PROGRESS_KEY));   // (only read on the menu)
    if (!p || (p.mode !== MODE_EASY && p.mode !== MODE_HARD) || p.hole < 0 || p.hole > 8) return null;
    for (var i = 0; i < COURSES.length; i++) if (COURSES[i].key === p.course) { p.index = i; return p; }
  } catch (e) {}
  return null;
}
function resumeProgress() {
  var p = loadProgress();
  if (!p) return;
  gameMode = p.mode;
  course = COURSES[p.index];
  scorecard = (p.scorecard || []).slice(0, p.hole);
  roundResult = null;
  obsClock = 0;
  startHole(p.hole);
}
// the practice button sits in the middle, or on the left when there's a round to continue
function practiceRect() {
  var b = PRACTICE_BTN;
  return loadProgress() ? { x: width / 2 - 10 - 300, y: b.y, w: 300, h: b.h } : { x: width / 2 - b.w / 2, y: b.y, w: b.w, h: b.h };
}
function continueRect() { var b = PRACTICE_BTN; return { x: width / 2 + 10, y: b.y, w: 300, h: b.h }; }
function continueButtonHit(mx, my) { var r = continueRect(); return !!loadProgress() && inBox(mx, my, r.x, r.y, r.w, r.h); }
function drawContinueButton() {
  var p = loadProgress();
  if (!p) return;
  var r = continueRect(), hovered = inBox(mouseX, mouseY, r.x, r.y, r.w, r.h), th = COURSES[p.index].theme;
  noStroke();
  fill(0, 0, 0, hovered ? 90 : 60); rect(r.x + 2, r.y + 3, r.w, r.h, r.h / 2);
  fill(th.accent); rect(r.x, r.y, r.w, r.h, r.h / 2);
  if (hovered) { stroke(255); strokeWeight(2.5); noFill(); rect(r.x, r.y, r.w, r.h, r.h / 2); noStroke(); }
  fill('#101010'); textAlign(CENTER, CENTER);
  textStyle(BOLD); textSize(17); text(tl('▶ Continue: ', '▶ Continuar: ') + th.icon + ' ' + tl('Hole ', 'Hoyo ') + (p.hole + 1), r.x + r.w / 2, r.y + 17); textStyle(NORMAL);
  textSize(12); text(th.label + ' · ' + (p.mode === MODE_EASY ? tl('Golf Gamer', 'Golfista gamer') : tl('Hole-In-One Hero', 'Héroe del hoyo en uno')), r.x + r.w / 2, r.y + 36);
}

function drawPracticeButton() {
  drawContinueButton();
  var b = practiceRect(), x = b.x;
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
  textSize(b.w < 340 ? 16 : 19);
  textStyle(BOLD);
  text(tl('🎯 Putting Green — Free Practice', '🎯 Green de práctica — práctica libre'), x + b.w / 2, b.y + b.h / 2 + 1);
  textStyle(NORMAL);
}

function practiceButtonHit(mx, my) {
  var b = practiceRect();
  return inBox(mx, my, b.x, b.y, b.w, b.h);
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
  // Back (to the course list), to the left of Tee Off
  var bk = introBackRect(), bkHov = inBox(mouseX, mouseY, bk.x, bk.y, bk.w, bk.h);
  fill(0, 0, 0, bkHov ? 170 : 120); rect(bk.x, bk.y, bk.w, bk.h, 14);
  if (bkHov) { stroke(255); strokeWeight(2); noFill(); rect(bk.x, bk.y, bk.w, bk.h, 14); noStroke(); }
  fill(255); textSize(18); textStyle(BOLD); text(tl('← Back', '← Volver'), bk.x + bk.w / 2, bk.y + bk.h / 2 + 1); textStyle(NORMAL);
  fill(th.accent); rect(width / 2 - INTRO_BTN.w / 2, INTRO_BTN.y, INTRO_BTN.w, INTRO_BTN.h, 14);
  fill('#101010'); textSize(21); textStyle(BOLD); text(tl('Tee Off', '¡A jugar!'), width / 2, INTRO_BTN.y + INTRO_BTN.h / 2 + 1); textStyle(NORMAL);
  textAlign(LEFT, BASELINE);
}
function introHit(mx, my) { return inBox(mx, my, width / 2 - INTRO_BTN.w / 2, INTRO_BTN.y, INTRO_BTN.w, INTRO_BTN.h); }
function introBackRect() { return { x: width / 2 - INTRO_BTN.w / 2 - 16 - 130, y: INTRO_BTN.y, w: 130, h: INTRO_BTN.h }; }
function introBackHit(mx, my) { var r = introBackRect(); return inBox(mx, my, r.x, r.y, r.w, r.h); }

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

