function drawExitConfirmOverlay() {
  noStroke(); fill(10, 12, 20, 235); rect(0, 0, 400, 400);
  fill(255); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(20);
  text(tl("Exit to Main Menu?", "¿Salir al menú principal?"), 200, 165);
  fill(200); textSize(13); textStyle(NORMAL);
  text(tl("Your current match will end.", "Tu partido terminará."), 200, 190);

  var btnW = 130, btnH = 44, gap = 14, btnY = 225;
  var yesX = 200 - btnW - gap / 2, noX = 200 + gap / 2;
  drawBtn(yesX, btnY, btnW, btnH, tl("YES, EXIT", "SÍ, SALIR"), col(180, 50, 50));
  drawBtn(noX, btnY, btnW, btnH, tl("CANCEL", "CANCELAR"), col(30, 150, 30));

  if (wasClicked(yesX, btnY, btnW, btnH)) {
    exitConfirmPending = false; screenState = "menu"; mainMode = null; subMode = null;
  } else if (wasClicked(noX, btnY, btnW, btnH)) {
    exitConfirmPending = false;
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
    var goalLeftPx = xB[-GOAL_HALF_WIDTH - GX_MIN], goalRightPx = xB[GOAL_HALF_WIDTH - GX_MIN];
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
  }

  // The numbers and the axes go away once the pass is played and the player dribbles up the field (the breakaway),
  // and stay away through the shot - the field has scrolled, so they no longer line up with anything. They're also
  // hidden while the other team has the ball, when there's no equation to write.
  var skipLabels = screenState === "enemyPossession" || (screenState === "feedback" && feedbackScene === "enemy") || screenState === "revealLine" || screenState === "kicking" || screenState === "breakaway" || screenState === "powering" || screenState === "aiming" || screenState === "shootFlight" || screenState === "postHit" || screenState === "saved" || screenState === "blocked" || screenState === "celebrate";
  if (!skipLabels) {
    // Solid black x- and y-axes whenever the numbers are showing. The y-axis (x = 0) runs up the middle; the x-axis is the
    // row whose label is 0 (in Hard the y numbers shift, so it's drawn only when y = 0 is on the field).
    stroke(0); strokeWeight(2);
    line(gridSX(0), FY1, gridSX(0), FIELD_Y0);
    var zeroRow = (subMode === "hard" && mainMode !== "proportional") ? -hardYOffset : 0;
    if (zeroRow >= GY_MIN && zeroRow <= GY_MAX) line(FX1, gridSY(zeroRow), FX2, gridSY(zeroRow));

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

// A shot ball, cut off at the goal line (the top edge of the field, FY1): as it
// crosses into the goal it slips out of sight behind the line a little at a
// time, instead of being drawn on top of the net.
function drawBallOnField(x, y, alpha) {
  drawingContext.save();
  drawingContext.beginPath(); drawingContext.rect(0, FY1, 400, 400 - FY1); drawingContext.clip();
  if (alpha === undefined) drawBall(x, y); else drawBallFading(x, y, alpha);
  drawingContext.restore();
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

// One glove: a dark wrist cuff plus a palm with four splayed fingers and a
// thumb, drawn as round-capped lines fanning out from the palm - an open
// hand rather than a mitt blob, colored to match the goalie's own team.
// facing is +1 for the glove on the goalie's right, -1 for the left, so the
// fingers fan outward away from the body on each side.
function drawGlove(gx, gy, facing, c) {
  push();

  noStroke();
  fill(30, 25, 10);
  ellipse(gx - facing * 5, gy + 6, 9, 7);

  var baseAngle = facing > 0 ? 0 : 180;
  strokeCap(ROUND);
  stroke(c[0], c[1], c[2]); strokeWeight(4);
  var fingerSpread = [-28, -10, 10, 28];
  for (var i = 0; i < fingerSpread.length; i++) {
    var ang = baseAngle + fingerSpread[i];
    line(gx, gy, gx + cos(ang) * 11, gy + sin(ang) * 11);
  }
  strokeWeight(3.5);
  var thumbAngle = baseAngle - facing * 55;
  line(gx, gy, gx + cos(thumbAngle) * 8, gy + sin(thumbAngle) * 8);

  fill(c[0], c[1], c[2]); stroke(255); strokeWeight(1.2);
  ellipse(gx, gy, 11, 11);

  pop();
}

// Small fading starburst drawn over the glove that made a save, right as the
// ball would be making contact with it.
function drawImpactBurst(x, y, svt) {
  var a = svt < 0.45 ? map(svt, 0, 0.45, 230, 0) : 0;
  if (a <= 0) return;
  stroke(255, 255, 255, a); strokeWeight(2); noFill();
  for (var ang = 0; ang < 360; ang += 60) {
    line(x + cos(ang) * 6, y + sin(ang) * 6, x + cos(ang) * 13, y + sin(ang) * 13);
  }
}

// savePose (optional): { dirX, svt } - dirX is which side the ball is on
// (>0 right, <0 left) and svt is the save animation's 0-1 progress. When
// given, the glove on that side punches outward with an impact burst, so a
// save actually looks like the keeper's glove stopping the ball.
function drawGoalie(x, y, countryIdx, savePose) {
  var s = 26;
  var c = countries[countryIdx].color;

  var gloveOffset = s * 0.6;
  var punch = savePose ? min(savePose.svt * 6, 1) : 0;
  var outL = (savePose && savePose.dirX < 0) ? punch * 11 : 0;
  var outR = (savePose && savePose.dirX > 0) ? punch * 11 : 0;
  var liftL = (savePose && savePose.dirX < 0) ? -punch * 7 : 0;
  var liftR = (savePose && savePose.dirX > 0) ? -punch * 7 : 0;

  drawGlove(x - gloveOffset - outL, y + 3 + liftL, -1, c);
  drawGlove(x + gloveOffset + outR, y + 3 + liftR, 1, c);

  fill(c[0], c[1], c[2]); stroke(255); strokeWeight(2);
  ellipse(x, y, s, s);
  noFill(); stroke(255); strokeWeight(1);
  ellipse(x, y, 14, 14);

  if (savePose) {
    var ix = savePose.dirX > 0 ? x + gloveOffset + outR : x - gloveOffset - outL;
    var iy = y + 3 + (savePose.dirX > 0 ? liftR : liftL);
    drawImpactBurst(ix, iy, savePose.svt);
  }
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
  drawBallOnField(sx, sy);
  return { x: dpx, y: dpy };
}

// Splits msg into lines no wider than maxWidth (at the given text size) so a
// long message wraps inside the panel instead of running off the left/right
// edges of the 400-wide canvas.
function wrapTextToWidth(msg, maxWidth, size) {
  textSize(size);
  var words = msg.split(" ");
  var lines = [];
  var current = "";
  for (var i = 0; i < words.length; i++) {
    var test = current === "" ? words[i] : current + " " + words[i];
    if (textWidth(test) > maxWidth && current !== "") {
      lines.push(current);
      current = words[i];
    } else {
      current = test;
    }
  }
  if (current !== "") lines.push(current);
  return lines;
}

function drawShootoutPanel(msg) {
  fill(10, 10, 40); noStroke();
  rect(0, FY2 + 1, 400, 400 - (FY2 + 1));
  fill(200, 220, 255); textSize(15); textAlign(CENTER);
  text(tl("Distance to goal: ", "Distancia a la portería: ") + (round((GY_MAX - dribY) * 10) / 10) + tl(" units", " unidades"), 200, FY2 + 30);
  fill(255); textAlign(CENTER);
  var msgLines = wrapTextToWidth(msg, 360, 16);
  var lineHeight = 18;
  var startY = FY2 + 75 - ((msgLines.length - 1) * lineHeight) / 2;
  for (var li = 0; li < msgLines.length; li++) {
    text(msgLines[li], 200, startY + li * lineHeight);
  }
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
  drawBallOnField(kbx, kby);

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
    var ballLabel = tl("ball: (", "balón: (") + dispX(0) + "," + dispY(ballB) + ")";
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
  text(tl("Players repositioning...", "Los jugadores se reacomodan..."), 200, FY1 + 16);
}

function turnStatusText() {
  var who = attackingTeam === "A" ? "" : (vsComputer() ? tl("COMPUTER'S TURN", "TURNO DE LA COMPUTADORA") : tl("PLAYER 2'S TURN", "TURNO DEL JUGADOR 2"));
  if (target.type === "shoot") return (who ? who + " -- " : "") + tl("FINAL ATTEMPT - SHOOT!", "ÚLTIMO INTENTO: ¡TIRA!");
  return who;
}

// An on-screen number pad for entering the equation -- there's no spare
// room left below the equation boxes/buttons (they already run almost to
// the bottom of the canvas), so this overlays the lower part of the field
// instead, where there's plenty of room. Needed because the only other
// way to type a digit is a physical keyboard, which a phone doesn't have.
var keyboardOpen = false;

function drawKeyboardButton() {
  // On a touch device, linear-world-cup-mobile-controls.js supplies a
  // real bottom-of-viewport numpad instead - this on-canvas one only
  // exists as a fallback for phones running without that script, and
  // would otherwise sit as redundant clutter overlapping the field.
  if (window.mobileNumpadActive) { keyboardOpen = false; return; }
  var bx = 4, by = 370, bw = 80, bh = 26;
  drawBtn(bx, by, bw, bh, tl("KEYBOARD", "TECLADO"), keyboardOpen ? col(20, 130, 90) : col(70, 60, 90));
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
  drawSolidBtn(signBtnX, btnY, signBtnW, signBtnH, negNow ? tl("MAKE POSITIVE", "HACER POSITIVO") : tl("MAKE NEGATIVE", "HACER NEGATIVO"), negNow ? col(30, 150, 30) : col(180, 40, 40));
  if (wasClicked(signBtnX, btnY, signBtnW, signBtnH)) toggleSign();

  drawBtn(kickBtnX, btnY, kickBtnW, signBtnH, tl("KICK!", "¡PATEA!"), allBoxesFilled() ? col(200, 130, 0) : col(90, 90, 90));
  if (wasClicked(kickBtnX, btnY, kickBtnW, signBtnH)) resolveKick();
}

function drawFeedbackOverlay() {
  textSize(22); textStyle(BOLD); textAlign(CENTER);
  // A message with a colon (e.g. tl("BAD PASS: INCORRECT SLOPE", "MAL PASE: PENDIENTE INCORRECTA")) splits
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

  // A single ball loops along one path (a figure-eight-ish curve); the trail
  // is that same path sampled a little further back in time each step, so
  // the echoes are strung out directly behind the head instead of just
  // being separate circles drifting on their own orbits.
  noStroke();
  var headAngle = frameCount * 1.7;
  for (var i = 9; i >= 1; i--) {
    var trailAng = headAngle - i * 7;
    var trailX = 200 + cos(trailAng) * 112, trailY = 195 + sin(trailAng * 1.3) * 78;
    var trailSize = map(i, 9, 1, 8, 30);
    var trailAlpha = map(i, 9, 1, 12, 150);
    fill(255, 255, 255, trailAlpha);
    ellipse(trailX, trailY, trailSize, trailSize);
  }
  // The ball itself: big, fully opaque, drawn last so it sits in front of
  // its own trail - looking like it was just kicked at speed.
  var headX = 200 + cos(headAngle) * 112, headY = 195 + sin(headAngle * 1.3) * 78;
  push();
  translate(headX, headY);
  scale(3.4);
  drawBall(0, 0);
  pop();

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

    // tl("YOU WON THE", "¡GANASTE LA") — bold white with gold shadow
    textStyle(BOLD);
    fill(90, 60, 0); noStroke(); textSize(24); textAlign(CENTER);
    text(tl("YOU WON THE", "¡GANASTE LA"), 202, 215);
    fill(255, 255, 255); textSize(24);
    text(tl("YOU WON THE", "¡GANASTE LA"), 200, 213);

    // tl("WORLD CUP!", "COPA DEL MUNDO!") — large gold with dark shadow + glow
    fill(80, 50, 0); textSize(48);
    text(tl("WORLD CUP!", "COPA DEL MUNDO!"), 203, 265);
    fill(255, 180, 0, 120); textSize(50);
    text(tl("WORLD CUP!", "COPA DEL MUNDO!"), 200, 264);
    fill(255, 220, 40); textSize(48);
    text(tl("WORLD CUP!", "COPA DEL MUNDO!"), 200, 262);
    textStyle(NORMAL);

    // Bottom star row
    fill(255, 200, 40); noStroke(); textSize(13); textAlign(CENTER);
    text("★   ★   ★   ★   ★", 200, 282);

    var btnW = 144, btnH = 40, btnGap = 14, btnY = 342;
    var leftBtnX = 200 - btnW - btnGap / 2;
    var rightBtnX = 200 + btnGap / 2;
    drawBtn(leftBtnX, btnY, btnW, btnH, tl("MENU", "MENÚ"), col(90, 90, 95));
    if (wasClicked(leftBtnX, btnY, btnW, btnH)) {
      wcConfetti = []; tournamentMode = false; screenState = "menu"; mainMode = null; subMode = null;
    }
    drawBtn(rightBtnX, btnY, btnW, btnH, tl("PLAY AGAIN", "REVANCHA"), col(30, 150, 30));
    if (wasClicked(rightBtnX, btnY, btnW, btnH) || keyTapped) { wcConfetti = []; startTournament(); }
    return;
  }
  // ───────────────────────────────────────────────────────────

  fill(255, 220, 40); noStroke(); textSize(36); textAlign(CENTER);
  text(tl("FULL TIME", "FINAL DEL PARTIDO"), 200, 55);
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
      var nextRoundName = tRound === 0 ? tl("SEMI-FINALS", "SEMIFINALES") : tl("FINAL", "LA FINAL");
      fill(100, 255, 120); textSize(18);
      text(tl("YOU WIN!", "¡GANASTE!"), 200, 264);
      text(tl("ADVANCING TO THE ", "AVANZAS A ") + nextRoundName, 200, 290);
      drawBtn(200 - 90, btnY, 180, btnH, tl("CONTINUE", "CONTINUAR"), col(30, 150, 30));
      if (wasClicked(200 - 90, btnY, 180, btnH) || keyTapped) advanceTournament();
    } else {
      fill(255, 110, 90); textSize(20);
      text(tl("ELIMINATED FROM", "ELIMINADO DE"), 200, 264);
      text(tl("THE WORLD CUP", "LA COPA DEL MUNDO"), 200, 290);
      drawBtn(leftBtnX, btnY, btnW, btnH, tl("MENU", "MENÚ"), col(90, 90, 95));
      if (wasClicked(leftBtnX, btnY, btnW, btnH)) {
        tournamentMode = false; screenState = "menu"; mainMode = null; subMode = null;
      }
      drawBtn(rightBtnX, btnY, btnW, btnH, tl("PLAY AGAIN", "REVANCHA"), col(30, 150, 30));
      if (wasClicked(rightBtnX, btnY, btnW, btnH) || keyTapped) startTournament();
    }
  } else {
    textSize(20); textAlign(CENTER);
    if (scoreA > scoreB) {
      fill(100, 255, 120);
      text(countries[teamAIdx].name.toUpperCase() + tl(" WINS!", " ¡GANA!"), 200, 274);
    } else if (scoreA < scoreB) {
      fill(255, 110, 90);
      text(countries[teamBIdx].name.toUpperCase() + tl(" WINS!", " ¡GANA!"), 200, 274);
    } else {
      fill(255, 220, 60);
      text(tl("IT'S A DRAW!", "¡EMPATE!"), 200, 274);
    }
    drawBtn(leftBtnX, btnY, btnW, btnH, tl("MENU", "MENÚ"), col(90, 90, 95));
    if (wasClicked(leftBtnX, btnY, btnW, btnH)) {
      screenState = "menu"; mainMode = null; subMode = null;
    }
    drawBtn(rightBtnX, btnY, btnW, btnH, tl("PLAY AGAIN", "REVANCHA"), col(30, 150, 30));
    if (wasClicked(rightBtnX, btnY, btnW, btnH) || keyTapped) startMatch();
  }
}
