// results by skill (site-results.js): the y-intercept and the slope of each equation typed, shown once when a match ends
if (window.SiteResults) SiteResults.setup([{ id: 'intercept', en: 'y-intercept (b)', es: 'Intersección con el eje y (b)' }, { id: 'slope', en: 'Slope (m)', es: 'Pendiente (m)' }]);
var wcStateWas = 'menu', wcResultsShown = true;
function watchMatchEnd() {
  var ended = screenState === 'over' || screenState === 'menu' || screenState === 'bracket';
  if (!ended) wcResultsShown = false;
  else if (!wcResultsShown && wcStateWas !== 'over' && wcStateWas !== 'menu' && wcStateWas !== 'bracket' && window.SiteResults) {
    wcResultsShown = true;
    setTimeout(function () { SiteResults.show({ title: tl('Match results', 'Resultados del partido') }); }, screenState === 'menu' ? 0 : 1200);
  }
  wcStateWas = screenState;
}
function draw() {
  watchMatchEnd();
  kbBeginFrame();
  drawFrame();
  kbEndFrame();
}

function drawFrame() {
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

  // Escape acts the same as clicking the MENU button - both bring up the
  // same confirm-before-quitting overlay (drawn from drawMenuButton() below).
  if (!exitConfirmPending && keyWentDown("escape")) {
    exitConfirmPending = true;
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
      drawShootoutPanel(tl("SPACE, ENTER, or CLICK to set power!", "¡ESPACIO, ENTER o CLIC para fijar la fuerza!"));
    } else {
      drawPivotArrow(0, shotPower, powerOriginPx);
    }
  } else if (screenState === "aiming") {
    updateAiming();
    var aimOriginPx = drawShootoutBase();
    if (screenState === "aiming") {
      drawPivotArrow(aimAngle, shotPower, aimOriginPx);
      drawShootoutPanel(tl("SPACE, ENTER, or CLICK to lock aim and SHOOT!", "¡ESPACIO, ENTER o CLIC para apuntar y TIRAR!"));
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
    drawShootoutPanel(tl("Here it goes...", "Allá va..."));

    var blocker = findShotBlocker(sbx, sby);
    if (blocker && !shootOutcomeDecided) {
      shootOutcomeDecided = true;
      makeBlocked(sbx, sby, blocker.x);
    }

    if (sby > GY_MAX - 0.7 && abs(keeperX - sbx) < GOALIE_REACH_GRID) {
      shootWasSaved = true;
    }

    if (!shootOutcomeDecided && sft >= 1) {
      shootOutcomeDecided = true;
      if (shootWasSaved) {
        makeSave(sbx, sby);
      } else {
        var ballRadius = BALL_RADIUS_GRID;
        var edgeDist = abs(abs(shootEndX) - GOAL_HALF_WIDTH);
        if (edgeDist <= ballRadius) {
          hitPost();
        } else if (abs(shootEndX) < GOAL_HALF_WIDTH - ballRadius) {
          finishShoot(true, tl("GOAL!", "¡GOL!"));
        } else {
          finishShoot(false, tl("WIDE SHOT", "TIRO DESVIADO"));
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
    drawShootoutPanel(tl("HIT THE POST", "¡AL POSTE!"));
    if (postHitTimer >= postHitDuration) {
      startFeedback(tl("HIT THE POST", "¡AL POSTE!"));
    }
  } else if (screenState === "saved") {

    saveTimer++;
    var svt = constrain(saveTimer / saveDuration, 0, 1);
    var saveBallX, saveBallY;
    if (saveIsCatch) {
      saveBallX = lerp(saveX, keeperX, min(svt * 2.5, 1));
      saveBallY = lerp(saveY, GY_MAX - 0.15, min(svt * 2.5, 1));
    } else {
      // Punch the ball away to the side instead of catching it - anything
      // that wasn't a weak shot hit straight at the keeper (see makeSave)
      // gets parried clear rather than caught.
      var saveDir = saveX >= 0 ? 1 : -1;
      saveBallX = saveX + saveDir * svt * 2.2;
      saveBallY = saveY - svt * 1.7;
    }
    drawField();
    drawOtherFieldPlayers();
    drawGoalie(gridSX(keeperX), gridSY(GY_MAX), defenderColor(), { dirX: saveX >= keeperX ? 1 : -1, svt: svt });
    drawPlayerCircle(gridSX(dribX), gridSY(dribY), attackerColor());
    drawBall(gridSX(saveBallX), gridSY(saveBallY));
    drawShootoutPanel(tl("SAVED!", "¡ATAJADO!"));
    if (saveTimer >= saveDuration) {
      startFeedback(tl("SAVED!", "¡ATAJADO!"));
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
    drawShootoutPanel(tl("SHOT BLOCKED!", "¡TIRO BLOQUEADO!"));
    if (blockTimer >= blockDuration) {
      startFeedback(tl("SHOT BLOCKED!", "¡TIRO BLOQUEADO!"));
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
        startFeedback(kickMsg, kickMsg.indexOf(tl("BAD PASS", "MAL PASE")) === 0 ? 30 : 60);
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
      // Keep the ball moving into the net at the same speed it was already
      // travelling - no slow-down/freeze - and let it disappear behind the
      // goal line as it goes in (drawBallOnField cuts it off there).
      var celebElapsed = 60 - celebrateTimer;
      var cbPvx = constrain(celebrateSnapshot.ball.pvx || 0, -8, 8);
      var cbPvy = min(celebrateSnapshot.ball.pvy || 0, -3);
      var cbPxX = gridSX(celebrateSnapshot.ball.x) + cbPvx * celebElapsed;
      var cbPxY = gridSY(celebrateSnapshot.ball.y) + cbPvy * celebElapsed;
      if (cbPxY > FY1 - 10) drawBallOnField(cbPxX, cbPxY);
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
