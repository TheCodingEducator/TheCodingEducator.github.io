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
  var ri = resolvedInfo, sum = ri.type === 'WALL' ? 180 : 90, k = ri.known, t = ri.typedAngle;
  var dbl = !!(ri.shot && ri.shot.double), line1, line2;
  if (ri.rel === 'vert') {   // vertical angles: the two should be equal
    line1 = k + '° ≠ ' + t + '°';
    line2 = tl('across from each other: equal', 'los opuestos son iguales');
  } else {
    line1 = dbl ? k + '° + ' + k + '° + ' + t + '° = ' + (2 * k + t) + '°' : k + '° + ' + t + '° = ' + (k + t) + '°';
    line2 = tl('not ', 'no ') + sum + '°';
  }
  noStroke();
  fill(15, 22, 16, 225);
  rect(width / 2 - 150, 10, 300, 66, 12);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  fill(255);
  textSize(24);
  text(line1, width / 2, 32);
  fill('#ff8a93');
  textSize(ri.rel === 'vert' ? 16 : 19);
  text(line2, width / 2, 58);
  textStyle(NORMAL);
  textAlign(LEFT, BASELINE);
}
// a right answer: the working, big and green across the top bar
function drawEquation() {
  if (!resolvedInfo) return;
  if (!resolvedInfo.correct) { if (resolvedInfo.typed !== null) drawSumCheckCard(); return; }
  var ri = resolvedInfo, sum = ri.type === 'WALL' ? 180 : 90;
  var main = ri.rel === 'vert'
    ? tl('✓ Vertical angles are equal: ', '✓ Los opuestos son iguales: ') + ri.missing + '°'
    : '✓ ' + sum + '° − ' + ri.known + '°' + (ri.shot && ri.shot.double ? ' − ' + ri.known + '°' : '') + ' = ' + ri.missing + '°';
  noStroke();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  fill('#4dff4d');
  if (ri.algebra) {   // then undo the + d to find x
    textSize(21);
    text(main, width / 2, 25);
    text(algebraText(ri.algebra) + ' = ' + ri.missing + ',  x = ' + ri.correctAnswer, width / 2, 57);
  } else {
    textSize(ri.rel === 'vert' ? 24 : 28);
    text(main, width / 2, 41);
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
  if (info.rel === 'vert') {   // two crossing lines: the gold angle and the equal one across from it
    var kv = info.known;
    // (an X fits the same space as the half-circle diagram: centered a little higher, a little smaller)
    var R = r * 0.62, A = r * 1.0;
    push(); translate(cx, cy - r * 0.37);
    noStroke(); fill(224, 160, 48, 150); arc(0, 0, A, A, 180, 180 + kv, PIE);
    fill(77, 255, 77, 130); arc(0, 0, A, A, 0, kv, PIE);
    stroke(255, 255, 255, 220); strokeWeight(3); strokeCap(ROUND);
    line(-R, 0, R, 0);
    line(-cos(kv) * R, -sin(kv) * R, cos(kv) * R, sin(kv) * R);
    noFill(); strokeWeight(5); stroke('#e0a030'); arc(0, 0, A, A, 180, 180 + kv);
    stroke('#4dff4d'); arc(0, 0, A, A, 0, kv);
    noStroke(); textAlign(CENTER, CENTER); textStyle(BOLD);
    fill('#ffce6b'); textSize(r * 0.15); text(kv + '°', cos(180 + kv / 2) * A * 0.33, sin(180 + kv / 2) * A * 0.33);
    fill('#4dff4d'); textSize(r * 0.17); text('?', cos(kv / 2) * A * 0.33, sin(kv / 2) * A * 0.33);
    textStyle(NORMAL); pop();
    return;
  }
  var sum = info.type === 'WALL' ? 180 : 90;
  var known = info.known, correctAns = info.correctAnswer;
  push();
  translate(cx, cy);

  stroke(255, 255, 255, 220);
  strokeWeight(3);
  strokeCap(ROUND);
  line(-r * 1.15, 0, r * 1.15, 0);

  // the given angle(s) in gold and the missing one in green (Hole-In-One Hero has two equal given angles)
  var dbl = !!(info.shot && info.shot.double);
  var gold = [[0, known]], uS = known, uE = sum;
  if (dbl && sum === 180) { gold.push([sum - known, sum]); uE = sum - known; }
  else if (dbl) { gold.push([known, 2 * known]); uS = 2 * known; }
  noStroke();
  fill(224, 160, 48, 150);
  gold.forEach(function (g) { arc(0, 0, r * 2, r * 2, -g[1], -g[0], PIE); });
  fill(77, 255, 77, 130);
  arc(0, 0, r * 2, r * 2, -uE, -uS, PIE);

  noFill();
  strokeWeight(5);
  stroke('#e0a030');
  gold.forEach(function (g) { arc(0, 0, r * 2, r * 2, -g[1], -g[0]); });
  stroke('#4dff4d');
  arc(0, 0, r * 2, r * 2, -uE, -uS);
  if (dbl) {   // the extra side
    stroke(255, 255, 255, 220); strokeWeight(3);
    var xa = sum === 180 ? sum - known : known;
    line(0, 0, cos(-xa) * r * 1.1, sin(-xa) * r * 1.1);
  }

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
  gold.forEach(function (g) { var kMid = -(g[0] + g[1]) / 2; text(known + '°', cos(kMid) * r * 0.62, sin(kMid) * r * 0.62); });
  fill('#4dff4d');
  textSize(r * 0.22);
  var uMid = -(uS + uE) / 2;
  text('?', cos(uMid) * r * 0.65, sin(uMid) * r * 0.65);
  textStyle(NORMAL);
  pop();
}

// Names the most likely slip behind a wrong answer, so the retry is aimed at the real problem.
function mistakeNote(ri) {
  if (!ri || ri.typed === null || ri.typed === undefined) return '';
  var k = ri.known, x = ri.typed, t = ri.typedAngle, missing = ri.missing;
  var alg = ri.algebra, dTxt = alg ? (alg.d >= 0 ? '+ ' : '− ') + abs(alg.d) : '';
  // an equation question: they found the angle but didn't undo the + d, or undid it the wrong way
  if (alg && x === missing) return tl('That’s the whole angle, x ', 'Ese es el ángulo entero, x ') + dTxt + tl('. Now undo the ', '. Ahora deshaz el ') + dTxt + tl(' to find x.', ' para hallar x.');
  if (alg && x === missing + alg.d) return alg.d >= 0
    ? tl('To undo + ', 'Para deshacer + ') + alg.d + tl(', subtract ', ', resta ') + alg.d + tl(' (don’t add it).', ' (no lo sumes).')
    : tl('To undo − ', 'Para deshacer − ') + abs(alg.d) + tl(', add ', ', suma ') + abs(alg.d) + tl(' (don’t subtract it).', ' (no lo restes).');
  if (ri.rel === 'vert') {
    if (t + k === 180) return tl('That angle is next to the gold one. The angle ACROSS from it is equal.', 'Ese ángulo está junto al dorado. El ángulo OPUESTO es igual.');
    return tl('Vertical angles are equal: the missing angle is the same as the gold one.', 'Los opuestos por el vértice son iguales: el que falta mide lo mismo que el dorado.');
  }
  var sum = ri.type === 'WALL' ? 180 : 90, other = sum === 180 ? 90 : 180;
  var dbl = !!(ri.shot && ri.shot.double), given = dbl ? 2 * k : k;   // (Hole-In-One Hero: two equal given angles)
  if (dbl && t === sum - k) return tl('Both gold angles count: take ', 'Cuentan los dos ángulos dorados: resta ') + k + tl('° away twice.', '° dos veces.');
  if (t === k) return tl('That’s the angle you were given. Find the other one.', 'Ese es el ángulo que te dieron. Halla el otro.');
  if (t + given === other) return sum === 90
    ? tl('Those add up to 180°. These angles make a square corner, so they add to 90°.', 'Esos suman 180°. Estos ángulos forman una esquina recta, así que suman 90°.')
    : tl('Those add up to 90°. These angles make a straight line, so they add to 180°.', 'Esos suman 90°. Estos ángulos forman una línea recta, así que suman 180°.');
  if (t >= sum) return tl('That’s bigger than ', 'Eso es más que ') + sum + '°. ' + (dbl ? tl('Take both given angles away from ', 'Resta los dos ángulos dados a ') : tl('Take the given angle away from ', 'Resta el ángulo dado a ')) + sum + '°.';
  var minusK = ' − ' + k + (dbl ? ' − ' + k : '');
  if (Math.abs(t - missing) <= 10) return tl('Close! Check your subtraction: ', '¡Casi! Revisa tu resta: ') + sum + minusK + '.';
  return tl('Start from ', 'Empieza con ') + sum + tl('° and take away ', '° y resta ') + k + '°' + (dbl ? tl(' twice', ' dos veces') : '') + '.';
}

var EXPLAIN_BOX_W = 600;
// Every y below is measured from the top of the box, spaced evenly so the box is
// only as tall as its content (algebra questions have one extra equation line).
function explainLayout() {
  var alg = !!(resolvedInfo && resolvedInfo.algebra);
  var diagR = 165, diagCY = 300;
  var eqY = diagCY + 54;
  var typedY = eqY + (alg ? 82 : 46);
  var btnY = typedY + 76;   // room for the answer they gave and a note about the likely mistake (up to two lines)
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
  var dblX = !!(resolvedInfo.shot && resolvedInfo.shot.double);
  if (dblX && sum === 180) {
    text(tl('The ball leaves the wall at the same angle it hit it, so both gold', 'La bola sale de la pared con el mismo ángulo con que llegó: los dos'), width / 2, by + 82);
    text(tl('angles match. All three angles on the straight wall add up to 180°.', 'ángulos dorados son iguales. Los tres ángulos sobre la pared suman 180°.'), width / 2, by + 106);
  } else if (dblX) {
    text(tl('The two gold angles are equal. All three angles together', 'Los dos ángulos dorados son iguales. Los tres juntos'), width / 2, by + 82);
    text(tl('make the right angle, so they add up to 90°.', 'forman el ángulo recto, así que suman 90°.'), width / 2, by + 106);
  } else if (resolvedInfo.rel === 'vert') {
    text(tl('Two lines cross at the ball. The angles across from each other', 'Dos rectas se cruzan en la bola. Los ángulos opuestos'), width / 2, by + 82);
    text(tl('are called vertical angles, and they are always equal.', 'se llaman opuestos por el vértice y siempre son iguales.'), width / 2, by + 106);
  } else {
    text(tl('These two angles are ', 'Estos dos ángulos son ') + relWord + tl(' - together they always', ' - juntos siempre'), width / 2, by + 82);
    text(tl('add up to ', 'suman ') + sum + '°.', width / 2, by + 106);
  }

  drawExplainDiagram(width / 2, by + L.diagCY, L.diagR, resolvedInfo);

  var eqY = by + L.eqY;
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  if (resolvedInfo.algebra) {   // the equation, then the reminder to undo the + d
    fill('#4dff4d');
    textSize(25);
    text(questionEquation(resolvedInfo.shot), width / 2, eqY);
    fill('#ffce6b');
    textSize(18);
    text(tl('Find the angle first, then undo the ', 'Halla primero el ángulo y luego deshaz el ') + (resolvedInfo.algebra.d >= 0 ? '+ ' : '− ') + abs(resolvedInfo.algebra.d) + tl(' to get x.', ' para obtener x.'), width / 2, eqY + 36);
  } else {
    fill('#4dff4d');
    textSize(28);
    text(questionEquation(resolvedInfo.shot), width / 2, eqY);
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
    text(resolvedInfo.algebra ? tl('You answered x = ', 'Respondiste x = ') + resolvedInfo.typed + '.' : tl('You answered ', 'Respondiste ') + resolvedInfo.typed + tl('° instead.', '° en su lugar.'), width / 2, by + L.typedY);
    var note = mistakeNote(resolvedInfo);
    if (note) { fill('#ffce6b'); textSize(16); textStyle(BOLD); textAlign(CENTER, TOP); text(note, width / 2 - 260, by + L.typedY + 14, 520, 64); textAlign(CENTER, CENTER); textStyle(NORMAL); }   // (wraps onto two lines if it needs to)
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

// The in-game menu (the Menu button or Esc): keep playing, restart this hole, or go back to the main menu.
var EXIT_CONFIRM_BOX = { w: 500, h: 236 };
var MENU_BTNS = [{ id: 'cancel', w: 140 }, { id: 'restart', w: 160 }, { id: 'exit', w: 140 }];
var MENU_BTN_H = 50, MENU_BTN_GAP = 14;
function menuButtonRects() {
  var total = MENU_BTN_GAP * (MENU_BTNS.length - 1);
  MENU_BTNS.forEach(function (b) { total += b.w; });
  var y = height / 2 - EXIT_CONFIRM_BOX.h / 2 + EXIT_CONFIRM_BOX.h - 72, x = width / 2 - total / 2;
  return MENU_BTNS.map(function (b) { var r = { id: b.id, x: x, y: y, w: b.w, h: MENU_BTN_H }; x += b.w + MENU_BTN_GAP; return r; });
}

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
  text(tl('Menu', 'Menú'), width / 2, y + 46);
  textStyle(NORMAL);
  textSize(15);
  fill(200, 212, 200);
  text(tl('Restart this hole from the tee, or exit to the main menu.', 'Reinicia este hoyo desde la salida o vuelve al menú principal.'), width / 2, y + 80);
  text(gameMode === MODE_PRACTICE ? tl('Your practice shots aren’t saved.', 'Tus tiros de práctica no se guardan.') : tl('If you exit, choose Continue on the menu to pick up from this hole.', 'Si sales, elige Continuar en el menú para seguir desde este hoyo.'), width / 2, y + 104);

  var labels = { cancel: tl('Keep Playing', 'Seguir'), restart: tl('↺ Restart Hole', '↺ Reiniciar hoyo'), exit: tl('Exit', 'Salir') };
  var cols = { cancel: 'rgba(60,80,60,0.9)', restart: '#2f8ac7', exit: '#c0392b' };
  menuButtonRects().forEach(function (b) {
    fill(cols[b.id]); rect(b.x, b.y, b.w, b.h, 10);
    if (inBox(mouseX, mouseY, b.x, b.y, b.w, b.h)) { stroke(255); strokeWeight(2); noFill(); rect(b.x, b.y, b.w, b.h, 10); noStroke(); }
    fill(255); textSize(16); textStyle(BOLD); text(labels[b.id], b.x + b.w / 2, b.y + b.h / 2 + 1); textStyle(NORMAL);
  });
}

function exitConfirmHit(mx, my) {
  var bs = menuButtonRects();
  for (var i = 0; i < bs.length; i++) if (inBox(mx, my, bs[i].x, bs[i].y, bs[i].w, bs[i].h)) return bs[i].id;
  return null;
}
// what each in-game menu button does
function menuAction(id) {
  confirmExitOpen = false;
  playSound('click');
  if (id === 'exit') { dragging = false; kbAim = null; gameState = 'MENU'; if (window.SiteResults) { SiteResults.show({ title: tl('Your results', 'Tus resultados') }); SiteResults.reset(); } }
  else if (id === 'restart') { dragging = false; kbAim = null; startHole(holeIndex); }
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

