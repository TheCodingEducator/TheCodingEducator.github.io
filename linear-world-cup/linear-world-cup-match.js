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
  text(tl("RISE, RUN, REPEAT", "SUBE, AVANZA, REPITE"), 200, 30);

  drawSectionBox(20, 44, 360, 54, tl("STEP 1: MATH MODE", "PASO 1: MODO DE MATEMÁTICAS"));
  drawBtn(32,  58, 162, 30, tl("PROPORTIONAL (b=0)", "PROPORCIONAL (b=0)"), mainMode === "proportional" ? col(20,130,20) : col(55,55,65));
  drawBtn(206, 58, 162, 30, tl("NON-PROPORTIONAL", "NO PROPORCIONAL"), mainMode === "nonproportional" ? col(20,130,20) : col(55,55,65));
  if (wasClicked(32, 58, 162, 30)) mainMode = "proportional";
  if (wasClicked(206, 58, 162, 30)) mainMode = "nonproportional";

  drawSectionBox(20, 110, 360, 68, tl("STEP 2: SUPPORT LEVEL", "PASO 2: NIVEL DE APOYO"));
  drawBtn(30,  124, 110, 30, tl("EASY", "FÁCIL"), subMode === "easy" ? col(20,90,170) : col(55,55,65));
  drawBtn(146, 124, 108, 30, tl("HARD", "DIFÍCIL"), subMode === "hard" ? col(20,90,170) : col(55,55,65));
  drawBtn(260, 124, 110, 30, tl("2-PLAYER", "2 JUGADORES"), subMode === "2player" ? col(20,90,170) : col(55,55,65));
  if (wasClicked(30, 124, 110, 30)) subMode = "easy";
  if (wasClicked(146, 124, 108, 30)) subMode = "hard";
  if (wasClicked(260, 124, 110, 30)) subMode = "2player";
  fill(170); noStroke(); textSize(7); textAlign(CENTER);
  text(tl("EASY: shows a live pass preview.  HARD: same boxes, no preview.  2P: take turns vs a friend.", "FÁCIL: muestra el pase en vivo.  DIFÍCIL: sin vista previa.  2J: por turnos contra un amigo."), 200, 168);

  drawSectionBox(20, 188, 360, 134, tl("STEP 3: TEAM FLAGS  (no repeats)", "PASO 3: BANDERAS  (sin repetir)"));
  fill(210); noStroke(); textSize(9); textAlign(LEFT);
  text((subMode === "2player" ? tl("PLAYER 1: ", "JUGADOR 1: ") : tl("YOU: ", "TÚ: ")) + countries[teamAIdx].name, 30, 208);
  drawColorRow(216, teamAIdx, true);

  fill(210); noStroke(); textSize(9); textAlign(LEFT);
  text((vsComputer() ? tl("COMPUTER: ", "COMPUTADORA: ") : tl("PLAYER 2: ", "JUGADOR 2: ")) + countries[teamBIdx].name, 30, 258);
  drawColorRow(266, teamBIdx, false);

  if (colorWarnTimer > 0) {
    colorWarnTimer--;
    fill(255, 90, 90); textSize(9); textAlign(CENTER);
    text(tl("Teams can't use the same flag!", "¡Los equipos no pueden usar la misma bandera!"), 200, 312);
  }

  var ready = mainMode && subMode;
  drawBtn(16, 332, 168, 40, ready ? tl("KICK OFF!", "¡A JUGAR!") : tl("PICK MODES FIRST", "ELIGE LOS MODOS"), ready ? col(210, 140, 0) : col(70, 70, 70));
  if (ready && (wasClicked(16, 332, 168, 40) || keyTapped)) startMatch();
  var tourReady = ready && subMode !== "2player";
  drawBtn(216, 332, 168, 40, tl("TOURNAMENT", "TORNEO"), tourReady ? col(30, 80, 180) : col(50, 50, 60));
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
  do { gapX = randInt(-GOAL_HALF_WIDTH, GOAL_HALF_WIDTH); } while (gapX === 0);
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
    var goalLeftPx = gridSX(-GOAL_HALF_WIDTH), goalRightPx = gridSX(GOAL_HALF_WIDTH);
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

  // (no axis numbers here: the field is scrolling up, so they'd no longer line up with anything)
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
  return keyWentDown("space") || keyWentDown(" ") || keyWentDown("enter") || (mouseIsPressed && !prevMouse);
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
  // A weak shot hit basically straight at the keeper is an easy catch; a
  // stronger shot, or one that only clips a glove out near its reach, gets
  // punched away instead - a keeper wouldn't risk catching either of those.
  saveIsCatch = shotPower < 0.35 && abs(atX - keeperX) < 0.25;
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
    text(tl("TBD", "POR DEFINIR"), x + w / 2, cy + 2.5);
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
  var rndLabel = tRound === 0 ? tl("QUARTER-FINALS", "CUARTOS DE FINAL") : tRound === 1 ? tl("SEMI-FINALS", "SEMIFINALES") : tl("THE FINAL", "LA FINAL");
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
  text(tl("YOUR MATCH  ►  vs ", "TU PARTIDO  ►  vs ") + countries[oppIdx].name.toUpperCase(), 200, 336);
  fill(140, 155, 190); textSize(8);
  text(tl("Click or press Enter / Space to start", "Haz clic o presiona Enter / Espacio para empezar"), 200, 352);
}

function startMatch() {
  if (window.SiteResults) SiteResults.reset();
  scoreA = 0; scoreB = 0; gameClockSeconds = 0; attackingTeam = "A";
  newPossession(kickoffB());
}
