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
// Hole-In-One Hero (p.double): three angles instead of two. A bank shot shows the straight wall with
// the ball's path in AND its path out, each making the same gold angle with the wall (a real bounce);
// the missing angle is between the two paths. A straight shot splits the right angle into two equal
// gold angles and the missing one next to the aim line.
function drawLiveAngleDiagram(shot, reveal) {
  if (!reveal && (!pendingShot || holePhase !== 'QUESTION')) return;
  var p = shot || pendingShot;
  if (!p) return;
  if (p.rel === 'vert') { drawVerticalDiagram(p, reveal); return; }
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
  knownVal = shotKnown(p);

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
  var S = sweepSign, T = totalDeg;
  // the gold given angle(s) and the unknown, as [start, end] in degrees from the baseline
  var gold = [[0, drawKnown]];
  var uS = drawKnown, uE = T;
  if (p.double) {
    if (p.type === 'WALL') { gold.push([T - drawKnown, T]); uE = T - drawKnown; }
    else { gold.push([drawKnown, 2 * drawKnown]); uS = 2 * drawKnown; }
  }
  var arcBetween = function (a, b, mode) { var x = S * a, y = S * b; arc(0, 0, r * 2, r * 2, min(x, y), max(x, y), mode); };

  // filled wedges first, so the shared baseline/marker draw crisply on top
  noStroke();
  fill(224, 160, 48, 95);
  for (var gi = 0; gi < gold.length; gi++) arcBetween(gold[gi][0], gold[gi][1], PIE);
  if (!wrongR) {
    if (!reveal) fill(91, 140, 255, 95); else fill(77, 255, 77, 100);
    arcBetween(uS, uE, PIE);
  }

  noFill();
  stroke(255, 255, 255, 200);
  strokeWeight(2.5);
  var lineR = wrongR ? r : r * 1.15;   // after a wrong answer the sides stop right at the arc
  line(p.type === 'WALL' ? -lineR : 0, 0, lineR, 0);
  if (p.type !== 'WALL' && !reveal) {   // a straight shot's one dotted line is its path: the aim side of the right angle (after the shot, the solid route line takes its place)
    drawingContext.setLineDash([6, 8]);
    line(0, 0, cos(S * T) * (wrongR ? r : r * 1.6), sin(S * T) * (wrongR ? r : r * 1.6));
    drawingContext.setLineDash([]);
  }
  if (p.double) {   // the extra side: the ball's path out of the bounce, or the line splitting the right angle
    var xa = p.type === 'WALL' ? T - drawKnown : drawKnown;
    if (p.type === 'WALL') drawingContext.setLineDash([6, 8]);
    line(0, 0, cos(S * xa) * r * 1.15, sin(S * xa) * r * 1.15);
    drawingContext.setLineDash([]);
  }

  strokeWeight(4);
  stroke('#e0a030');
  for (var gj = 0; gj < gold.length; gj++) arcBetween(gold[gj][0], gold[gj][1]);
  if (!wrongR) {
    stroke(!reveal ? '#5b8cff' : '#4dff4d');
    arcBetween(uS, uE);
  }

  var tMid, gMid, hasGap = false;
  if (wrongR) {
    // A wrong answer: the student's number as a red wedge, starting where the given angle(s) end.
    // Too small leaves a gray gap before the far side (the "?" still to find); too big spills past it.
    var ty = min(max(resolvedInfo.typedAngle, 1), 359 - abs(uS));
    var rs = uS, re = uS + ty;
    noStroke();
    fill(230, 57, 70, 120);
    arcBetween(rs, re, PIE);
    if (re < uE) {
      fill(255, 255, 255, 60);
      arcBetween(re, uE, PIE);
      hasGap = true;
    }
    noFill();
    stroke('#e63946');
    strokeWeight(4);
    arcBetween(rs, re);
    tMid = S * (rs + re) / 2; gMid = S * (re + uE) / 2;
  }

  if (totalDeg === 90) {
    noFill();
    stroke(255, 255, 255, 230);
    strokeWeight(2.5);
    var m = 20;
    beginShape();
    vertex(m, 0); vertex(m, m * S); vertex(0, m * S);
    endShape();
  }

  // Local-space positions for the labels, computed here (still inside the rotated frame) but drawn
  // AFTER pop() below - text drawn while the canvas is rotated gets rotated too (upside-down/mirrored
  // digits, "?" turns into "¿"), so we place it in unrotated world space instead.
  var kLocals = gold.map(function (gw) { var mid = S * (gw[0] + gw[1]) / 2; return { x: cos(mid) * r * 0.6, y: sin(mid) * r * 0.6 }; });
  var uMid = S * (uS + uE) / 2;
  var uLocal = { x: cos(uMid) * r * 0.65, y: sin(uMid) * r * 0.65 };
  if (wrongR) uLocal = { x: cos(tMid) * r * 0.62, y: sin(tMid) * r * 0.62 };   // the typed number, inside its red wedge
  var gLocal = wrongR && hasGap ? { x: cos(gMid) * r * 0.7, y: sin(gMid) * r * 0.7 } : null;
  pop();

  noStroke();
  fill('#ffce6b');
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(p.double ? 13 : 15);
  for (var ki = 0; ki < kLocals.length; ki++) {
    var kWorld = rotatePoint(kLocals[ki], baseAngle);
    text(knownVal + '°', p.point.x + kWorld.x, p.point.y + kWorld.y);
  }
  if (gLocal) {   // the gap the typed angle left unfilled
    var gWorld = rotatePoint(gLocal, baseAngle);
    fill(255); textSize(18);
    text('?', p.point.x + gWorld.x, p.point.y + gWorld.y);
  }
  var uWorld = rotatePoint(uLocal, baseAngle);
  fill(!reveal ? '#bcd4ff' : wrongR ? '#ffffff' : '#4dff4d');
  textSize(reveal ? 19 : 23);
  if (!reveal && p.algebra) textSize(17);
  text(!reveal ? (p.algebra ? '(' + algebraText(p.algebra) + ')°' : '?') : (wrongR ? resolvedInfo.typedAngle : p.missing) + '°', p.point.x + uWorld.x, p.point.y + uWorld.y);
  textStyle(NORMAL);
}

// Vertical angles: two lines cross at the ball - its path (the aim line, through the ball both ways) and a
// guide line. The given angle (gold) sits between the path behind the ball and one end of the guide line;
// the missing angle is the one across from it, between the path ahead and the other end. They're equal.
function drawVerticalDiagram(p, reveal) {
  var wrongR = reveal && resolvedInfo && resolvedInfo.typed !== null && !resolvedInfo.correct;
  var O = p.point, aim = atan2(p.aimDir.y, p.aimDir.x), s = p.vSign, k = p.known, r = 62, L = r * 1.5;
  var L2 = aim + s * k, L1 = L2 + 180, back = aim + 180;
  push();
  translate(O.x, O.y);
  var wedge = function (a, b, col, alpha, mode) { var lo = min(a, b), hi = max(a, b); fill(col[0], col[1], col[2], alpha); arc(0, 0, r * 2, r * 2, lo, hi, mode); };
  noStroke();
  wedge(back, back + s * k, [224, 160, 48], 95, PIE);                                   // the given angle
  if (!wrongR) wedge(aim, L2, reveal ? [77, 255, 77] : [91, 140, 255], 100, PIE);      // the one across from it
  // the two crossing lines
  stroke(255, 255, 255, 210); strokeWeight(2.5);
  line(cos(L1) * L, sin(L1) * L, cos(L2) * L, sin(L2) * L);
  line(cos(back) * L, sin(back) * L, 0, 0);
  if (!reveal) { drawingContext.setLineDash([6, 8]); line(0, 0, cos(aim) * L * 1.1, sin(aim) * L * 1.1); drawingContext.setLineDash([]); }
  noFill(); strokeWeight(4);
  stroke('#e0a030'); arc(0, 0, r * 2, r * 2, min(back, back + s * k), max(back, back + s * k));
  if (!wrongR) { stroke(reveal ? '#4dff4d' : '#5b8cff'); arc(0, 0, r * 2, r * 2, min(aim, L2), max(aim, L2)); }
  var tMid = null;
  if (wrongR) {   // the typed angle as a red wedge from the guide line, toward the path
    var t = min(max(resolvedInfo.typedAngle, 1), 179), e = L2 - s * t;
    noStroke(); wedge(L2, e, [230, 57, 70], 120, PIE);
    noFill(); stroke('#e63946'); strokeWeight(4); arc(0, 0, r * 2, r * 2, min(L2, e), max(L2, e));
    tMid = (L2 + e) / 2;
  }
  pop();
  noStroke(); textAlign(CENTER, CENTER); textStyle(BOLD);
  var gm = back + s * k / 2;
  fill('#ffce6b'); textSize(15); text(k + '°', O.x + cos(gm) * r * 0.62, O.y + sin(gm) * r * 0.62);
  var um = tMid !== null ? tMid : aim + s * k / 2;
  fill(!reveal ? '#bcd4ff' : (wrongR ? '#ffffff' : '#4dff4d'));
  textSize(reveal ? 19 : (p.algebra ? 17 : 23));
  text(!reveal ? (p.algebra ? '(' + algebraText(p.algebra) + ')°' : '?') : (wrongR ? resolvedInfo.typedAngle : p.missing) + '°', O.x + cos(um) * r * 0.66, O.y + sin(um) * r * 0.66);
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
  var isWall = pendingShot.type === 'WALL', vert = pendingShot.rel === 'vert';
  drawQuestionBand(pendingShot.algebra || retryHint ? 150 : 88);
  var title = vert ? tl('Vertical Angles', 'Ángulos opuestos por el vértice')
    : (isWall ? tl('Supplementary Angles', 'Ángulos suplementarios') : tl('Complementary Angles', 'Ángulos complementarios'));
  var relWord = isWall ? tl('sum to 180°', 'suman 180°') : tl('sum to 90°', 'suman 90°');
  var lead = pendingShot.double
    ? (isWall ? tl('The ball leaves the wall at the same angle it hit it. These three angles ', 'La bola sale de la pared con el mismo ángulo con que llegó. Estos tres ángulos ')
              : tl('These three angles ', 'Estos tres ángulos '))
    : tl('These two angles ', 'Estos dos ángulos ');
  var sub = vert ? tl('Two lines cross at the ball: the angles across from each other are equal.', 'Dos rectas se cruzan en la bola: los ángulos opuestos son iguales.') : lead + relWord;

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
  if ((pendingShot.double && isWall) || vert) textSize(15);
  text(sub, width / 2 + 1, 151);
  fill(216, 226, 216);
  text(sub, width / 2, 150);
  textSize(18);

  // an equation question: the missing angle is written as x + d (or x - d)
  if (pendingShot.algebra) {
    var at = tl('The missing angle is (', 'El ángulo que falta es (') + algebraText(pendingShot.algebra) + tl(')°. Find x.', ')°. Halla x.');
    fill(0, 0, 0, 130);
    text(at, width / 2 + 1, 179);
    fill('#ffce6b');
    text(at, width / 2, 178);
  }

  if (retryHint) {
    var hintY = pendingShot.algebra ? 206 : 178;
    // just the rule for THIS question
    var hint = vert ? tl('Hint: angles across from each other are equal.', 'Pista: los ángulos opuestos son iguales.')
      : (isWall
        ? tl('Hint: supplementary angles always add up to 180°.', 'Pista: los ángulos suplementarios siempre suman 180°.')
        : tl('Hint: complementary angles always add up to 90°.', 'Pista: los ángulos complementarios siempre suman 90°.'));
    textSize(16);
    fill(0, 0, 0, 140);
    text(hint, width / 2 + 1, hintY + 1);
    fill('#ffce6b');
    text(hint, width / 2, hintY);
    if ((pendingShot.tries || 1) >= 3) {   // a second wrong try: the equation, with a blank to fill
      var eq = questionEquation(pendingShot);
      textSize(22);
      fill(0, 0, 0, 140);
      text(eq, width / 2 + 1, hintY + 27);
      fill(255);
      text(eq, width / 2, hintY + 26);
    }
    textSize(18);
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
  text(pendingShot.algebra ? 'x = ' + (answerText.length ? answerText : '_') : (answerText.length ? answerText : '_') + '°', ix + iw / 2, iy + ih / 2 + 1);   // (an equation question asks for x)

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
  if (window.SiteResults) SiteResults.record(pendingShot.rel, correct);
  pendingShot.launchFrom = { x: ball.x, y: ball.y };
  if (!correct) holeBlockedThisStroke = true;

  var launchDir = pendingShot.aimDir;
  if (pendingShot.type === 'WALL') {
    // A right answer bounces like a real bank shot. A wrong one leaves along the far edge of the red
    // wedge drawn afterwards: the typed angle measured on from the ball's incoming path (skimming
    // along the wall if the typed angle runs past it).
    var kw = pendingShot.known, ta = typedAngle(pendingShot, typed);   // (with an equation, the angle typed is x + d)
    // (in Hero mode the typed angle sits between the in and out paths, measured from the path in, so it
    // works out to the very same outgoing direction formula)
    pendingShot.resolvedAngle = correct ? wallNormalAngle(180 - kw) : wallNormalAngle(constrain(kw + ta, 3, 177));
  } else {
    if (!correct) {
      var kv = pendingShot.known, tv = typedAngle(pendingShot, typed), outAng;
      if (pendingShot.rel === 'vert') {
        // vertical angles: the typed angle measured from the guide line toward the aim; a right answer is
        // exactly the aim, so a wrong one is off by the difference
        outAng = atan2(pendingShot.aimDir.y, pendingShot.aimDir.x) + pendingShot.vSign * (kv - constrain(tv, 1, 179));
      } else {
        // the typed angle measured on the question's right angle: the ball leaves along that line
        var bs = shotBaseAngleAndSweep(pendingShot);
        outAng = bs.baseAngle + bs.sweepSign * ((pendingShot.double ? 2 * kv : kv) + constrain(tv, 1, 179));   // (Hero: after both given angles)
      }
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
    correctAnswer: pendingShot.correctAnswer, typed: typed, typedAngle: typedAngle(pendingShot, typed), correct: correct,
    rel: pendingShot.rel, missing: pendingShot.missing,
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
    if (choice) menuAction(choice);
    return;
  }
  if (gameState === 'PLAYING' && exitButtonHit(mouseX, mouseY)) {
    confirmExitOpen = true;
    playSound('click');
    return;
  }
  if (gameState === 'MENU') {
    if (continueButtonHit(mouseX, mouseY)) { playSound('click'); resumeProgress(); return; }
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
    if (introBackHit(mouseX, mouseY)) { playSound('click'); gameState = 'COURSE_SELECT'; return; }
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
// _ontouchend in ../p5.min.js, which only invoke
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

