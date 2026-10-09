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
    if (target.type === "pass") startFeedback(tl("BAD PASS", "MAL PASE"), 30);
    else startFeedback(tl("INVALID EQUATION", "ECUACIÓN NO VÁLIDA"));
    return;
  }

  if (window.SiteResults) {
    var bOk = onLine(eq, 0, ballB);
    SiteResults.record('intercept', bOk);
    if (bOk) SiteResults.record('slope', target.type === 'shoot' ? onLine(eq, target.x, target.y) : teammates.some(function (t) { return onLine(eq, t.x, t.y); }));
  }
  if (!onLine(eq, 0, ballB)) {
    if (target.type === "pass") startFeedback(tl("BAD PASS: INCORRECT Y-INTERCEPT", "MAL PASE: INTERSECCIÓN Y INCORRECTA"), 30);
    else startFeedback(tl("INCORRECT Y-INTERCEPT", "INTERSECCIÓN Y INCORRECTA"));
    return;
  }

  var ax = gridSX(0), ay = gridSY(ballB);

  if (target.type === "shoot") {
    if (!onLine(eq, target.x, target.y)) {
      var ep = exitPoint(eq);
      startKickAnimation(eq, ep.x, ep.y, false, false, tl("MISSED THE GOAL", "FALLASTE LA PORTERÍA"));
      return;
    }
    if (target.forcedBlock) {
      var blockX = target.x * random(0.35, 0.65);
      startKickAnimation(eq, blockX, eq.m * blockX + eq.b, false, false, tl("DEFENDER BLOCKED IT", "LO BLOQUEÓ EL DEFENSA"));
      return;
    }
    var gx = gridSX(goalieX), gy = gridSY(GY_MAX);
    var bx = gridSX(target.x), by = gridSY(target.y);
    if (pointSegDist(gx, gy, ax, ay, bx, by) < GOALIE_REACH_PX) {
      startKickAnimation(eq, goalieX, eq.m * goalieX + eq.b, false, false, tl("GOALIE BLOCKED IT", "LO BLOQUEÓ EL PORTERO"));
      return;
    }
    var shootLoX = min(0, target.x), shootHiX = max(0, target.x);
    for (var i = 0; i < opponents.length; i++) {
      var o = opponents[i];
      if (o.x >= shootLoX && o.x <= shootHiX && onLine(eq, o.x, o.y)) {
        startKickAnimation(eq, o.x, o.y, false, false, tl("BLOCKED BY DEFENDER", "BLOQUEADO POR EL DEFENSA"));
        return;
      }
    }

    startKickAnimation(eq, target.x, target.y + BALL_RADIUS_GRID, true, true, tl("GOAL!", "¡GOL!"));
    return;
  }

  var candidates = [];
  for (var j = 0; j < teammates.length; j++) {
    var t = teammates[j];
    if (onLine(eq, t.x, t.y)) candidates.push({ x: t.x, y: t.y });
  }
  if (candidates.length === 0) {
    var ep2 = exitPoint(eq);
    startKickAnimation(eq, ep2.x, ep2.y, false, false, tl("BAD PASS: INCORRECT SLOPE", "MAL PASE: PENDIENTE INCORRECTA"));
    return;
  }
  var first = candidates[0];
  for (var c = 1; c < candidates.length; c++) {
    if (abs(candidates[c].x) < abs(first.x)) first = candidates[c];
  }
  target.x = first.x;
  target.y = first.y;
  startKickAnimation(eq, first.x, first.y, true, false, tl("GREAT PASS!", "¡GRAN PASE!"));
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
    if (abs(cx - goalieX) > GOALIE_REACH_GRID && enemyShotPathClear(holder.x, holder.y, cx, GY_MAX, 0.35)) return cx;
  }

  return constrain(farSide * 2.3, -2.5, 2.5);
}

function beginEnemyResolution(forceShoot) {
  enemyResolving = true;
  var holder = enemyDispT[enemyHolderIdx];

  if (forceShoot || enemyPossessionScores || random(0, 1) < 0.5) {
    enemyPhase = "shoot";
    enemyShotStartX = holder.x; enemyShotStartY = holder.y;

    enemyShotEndX = enemyPossessionScores ? pickEnemyGoalAimX(holder) : (random(0, 1) < 0.5 ? random(GOAL_HALF_WIDTH - 0.1, GOAL_HALF_WIDTH + 1.2) : random(-(GOAL_HALF_WIDTH + 1.2), -(GOAL_HALF_WIDTH - 0.1)));

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

    if (!enemyPossessionScores && sby > GY_MAX - 0.7 && abs(goalieX - sbx) < GOALIE_REACH_GRID) enemyShotSaved = true;

    if (sft >= 1) {
      if (enemyShotSaved) {

        enemyPhase = "saveDeflect";
        enemySaveTimer = 0;
        enemySaveFromX = sbx; enemySaveFromY = sby;
      } else {
        var ballRadius = BALL_RADIUS_GRID;
        var edgeDist = abs(abs(enemyShotEndX) - GOAL_HALF_WIDTH);
        if (edgeDist <= ballRadius) {

          enemyPhase = "postHit";
          enemyPostHitTimer = 0;
          enemyPostHitX = enemyShotEndX;
          screenShakeTimer = 30;
        } else if (abs(enemyShotEndX) < GOAL_HALF_WIDTH - ballRadius) {
          enemyResolving = false;
          if (attackingTeam === "A") scoreA++; else scoreB++;
          var enemyPlayers = buildPlayerSnapshot(enemyDispO, defenderColor()).concat(buildPlayerSnapshot(enemyDispT, attackerColor()));
          startCelebration(countries[attackingTeam === "A" ? teamAIdx : teamBIdx].name.toUpperCase() + tl(" SCORES", " ANOTA"), {
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
          startFeedback(tl("WIDE SHOT", "TIRO DESVIADO"));
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
      startFeedback(tl("HIT THE POST", "¡AL POSTE!"));
    }
  } else if (enemyPhase === "saveDeflect") {
    enemySaveTimer++;
    var svt = constrain(enemySaveTimer / enemySaveDuration, 0, 1);
    var saveDir = enemySaveFromX >= 0 ? 1 : -1;
    enemyShotBallX = enemySaveFromX + saveDir * svt * 2.2;
    enemyShotBallY = enemySaveFromY - svt * 1.7;
    if (svt >= 1) {
      enemyResolving = false;
      startFeedback(tl("SAVED!", "¡ATAJADO!"));
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
      startFeedback(tl("INTERCEPTED", "INTERCEPTADO"));
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

  // Defenders won't drop back past this line toward GY_MIN even when their
  // marked attacker roams further downfield - keeps the defense holding a
  // shape near their own goal instead of chasing attackers deep.
  var defenseHoldLineY = GY_MAX - 2.2;

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
    enemyTargetO[j].y = constrain(mark.y + standoff, defenseHoldLineY, PLAYER_Y_CAP);

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
  drawBallOnField(ebx, eby);
  if (enemyPhase === "postHit") {
    drawPostPop(gridSX(enemyPostHitX >= 0 ? 3 : -3), FY1 - 4.5, enemyPostHitTimer / 12);
  }
}

function drawEnemyPossessionPanel() {
  fill(10, 10, 40); noStroke();
  rect(0, FY2 + 1, 400, 400 - (FY2 + 1));
  fill(255, 80, 80); textSize(15); textAlign(CENTER);
  text(countries[attackingTeam === "A" ? teamAIdx : teamBIdx].name.toUpperCase() + tl(" IS ATTACKING...", " ATACA..."), 200, FY2 + 40);
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

var exitConfirmPending = false;

// Drawn from inside drawMenuButton() (called last, each frame, from the
// live-match render path) rather than as a top-level early-return like the
// menu/over/bracket screens use, since replicating this file's manual
// tappedX/tappedY/keyTapped reset bookkeeping for a new early-return branch
// would be easy to get subtly wrong. It still visually covers the whole
// screen on top of the match as requested; the match clock keeps ticking
// behind it for the brief moment the confirm is open.
function drawMenuButton() {
  drawBtn(4, 4, 66, 26, tl("MENU", "MENÚ"), col(70, 60, 90));
  if (!exitConfirmPending && wasClicked(4, 4, 66, 26)) {
    exitConfirmPending = true;
  }
  if (exitConfirmPending) drawExitConfirmOverlay();
}
