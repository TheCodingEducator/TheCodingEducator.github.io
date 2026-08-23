var playerBody = createSprite(200, 350, 32, 55);
var playerHead = createSprite(200, 315, 22, 22);
var playerLarm = createSprite(180, 340, 8, 35);
var playerRarm = createSprite(220, 340, 8, 35);
var p1EyeL = createSprite(196, 313, 2, 3);
var p1EyeR = createSprite(204, 313, 2, 3);
var stealCooldownTimer = 0;
var stealTimer = 0;
var failedStealTimer = 0;
var failedStealX = 0;
var failedStealY = 0;

playerBody.shapeColor = "#1d428a"; playerHead.shapeColor = "bisque";
p1EyeL.shapeColor = "black"; p1EyeR.shapeColor = "black";

var oppBody = createSprite(200, 200, 32, 55);
var oppHead = createSprite(200, 165, 22, 22);
var oppLarm = createSprite(180, 190, 8, 35);
var oppRarm = createSprite(220, 190, 8, 35);
var p2EyeL = createSprite(196, 163, 2, 3);
var p2EyeR = createSprite(204, 163, 2, 3);

oppBody.shapeColor = "#ce1141"; oppHead.shapeColor = "bisque";
p2EyeL.shapeColor = "black"; p2EyeR.shapeColor = "black";

var ball = createSprite(220, 350, 18, 18);
ball.shapeColor = "rgba(0,0,0,0)";
var hoop = {x: 200, y:57, w: 24, h: 10};
var inactivityTimer = 0;

playerBody.visible = false; playerHead.visible = false; playerLarm.visible = false; playerRarm.visible = false;
p1EyeL.visible = false; p1EyeR.visible = false;
oppBody.visible = false; oppHead.visible = false; oppLarm.visible = false; oppRarm.visible = false;
p2EyeL.visible = false; p2EyeR.visible = false; ball.visible = false;

var scoreBlue = 0; var scoreRed = 0;
var gameMode = "title"; var gameState = "title";
var possession = 1; var defenderLockedOut = false; var lockedOptionIndex = -1;

var afkStreak = 0; var hasInteractedThisPossession = false; var prePauseState = "";
var questionText = ""; var subQuestionText = ""; var isFraction = false;
var options = []; var buttons = createGroup();
var gravity = 0.65; var shotValue = 0; var dribbleTime = 0;

var targetBallSide = 1; var currentBallOffset = 24; var dashTrails = [];
var resetTimer = 0; var stuckTimer = 0; var floorTimer = 0; var violationTimer = 0;
var preQuestionTimer = 0; var pendingQuestionState = "";
var ballTrail = []; var trailColor = "";
var shotClock = 10;
var frameCounter = 0;
var shakeTimer = 0;

var showPenalty = false; var showCorrect = false; var penaltyTimer = 0;
var lastQuestionText = ""; var lastSubQuestionText = ""; var lastIsFraction = false;
var lastCorrectAns = ""; var lastExplanation = ""; var lastShotResult = "";

var pulseCounter = 0;
var p1Vx = 0; var p1Vy = 0;
var p2Vx = 0; var p2Vy = 0;

function pinArm(arm, body, isLeft, angle) {
  arm.rotation = angle;
  var rad = angle * (Math.PI / 180);
  var shoulderX = body.x + (isLeft ? -16 : 16);
  var shoulderY = body.y - 26;
  var armHalfHeight = 17.5;
  arm.x = shoulderX - armHalfHeight * Math.sin(rad);
  arm.y = shoulderY + armHalfHeight * Math.cos(rad);
}

function renderWorld() {
  drawNBACourt();
  drawTrail();
  drawWhooshTrails();

  var p1 = { y: playerBody.y, body: playerBody, head: playerHead, larm: playerLarm, rarm: playerRarm, el: p1EyeL, er: p1EyeR };
  var p2 = { y: oppBody.y, body: oppBody, head: oppHead, larm: oppLarm, rarm: oppRarm, el: p2EyeL, er: p2EyeR };

  var back = p1.y <= p2.y ? p1 : p2;
  var front = p1.y <= p2.y ? p2 : p1;

  var drawP = function(p) {
    p.body.visible = true; drawSprite(p.body); p.body.visible = false;
    p.head.visible = true; drawSprite(p.head); p.head.visible = false;
    p.larm.visible = true; drawSprite(p.larm); p.larm.visible = false;
    p.rarm.visible = true; drawSprite(p.rarm); p.rarm.visible = false;
    p.el.visible = true; drawSprite(p.el); p.el.visible = false;
    p.er.visible = true; drawSprite(p.er); p.er.visible = false;
  };

  drawP(back);
  var ballDrawn = false;

  if (gameState !== "rattling") {
    if (ball.y < front.y) { drawBallSkins(); ballDrawn = true; }
  }

  drawP(front);
  if (gameState !== "rattling" && !ballDrawn) drawBallSkins();
  drawBackboard();
  if (gameState === "rattling") drawBallSkins();

  drawHoopNet(); drawRimFront(); drawSprites();
}

function draw() {
  if (shakeTimer > 0) { camera.x = 200 + randomNumber(-8, 8); camera.y = 200 + randomNumber(-8, 8); shakeTimer--; }
  else { camera.x = 200; camera.y = 200; }

  // --- INACTIVITY TRACKER ---
  if (gameState !== "title" && gameState !== "paused" && gameState !== "instructions_2p") {
    var isActive = keyDown("w") || keyDown("a") || keyDown("s") || keyDown("d") ||
                   keyDown("up") || keyDown("down") || keyDown("left") || keyDown("right") ||
                   keyDown("space") || keyDown("enter") || mouseWentDown("leftButton");

    if (isActive) {
      hasInteractedThisPossession = true;
      afkStreak = 0;
      inactivityTimer = 0;
    } else if (gameMode === "2P") {
      inactivityTimer++;
      if (inactivityTimer >= 600) {
        prePauseState = gameState;
        gameState = "paused";
        inactivityTimer = 0;
      }
    }
  }
  // --------------------------

  if (gameState === "title") {
    drawTitleScreen(); updateHumanoids();
  } else if (gameState === "instructions_2p") {
    updateHumanoids(); renderWorld(); drawInstructions2P();
  } else if (gameState === "play") {
    handleMovement();
    if (gameMode === "1P") handleDefenseAI();
    updateHumanoids(); handleIsolatedDribble();

    // --- SHOT CLOCK LOGIC (2P ONLY) ---
    if (gameMode === "2P") {
      frameCounter++;
      if (frameCounter >= 30) {
        shotClock--;
        frameCounter = 0;
      }
      if (shotClock <= 0) {
        gameState = "shot_clock_violation";
        violationTimer = 90; // 3 seconds
      }
    }

    renderWorld();

    // --- STEAL MECHANIC & DYNAMIC UI (2-PLAYER ONLY) ---
    if (gameMode === "2P") {
      var attacker = (possession === 1) ? playerBody : oppBody;
      var defender = (possession === 1) ? oppBody : playerBody;

      var ax = attacker.x; var ay = attacker.y + 27.5;
      var dx = defender.x; var dy = defender.y + 27.5;
      var dist = Math.sqrt(Math.pow(ax - dx, 2) + Math.pow(ay - dy, 2));

      // Linear Steal Math visually scales smoothly from 50% to exactly 0% at 110px
      var stealPercent = 0;
      if (dist <= 15) {
        stealPercent = 50;
      } else if (dist <= 110) {
        stealPercent = Math.floor(50 - (50 * ((dist - 15) / 95)));
      }

      // Draw the connecting line and percentage
      if (dist <= 110) {
        stroke("rgba(255, 255, 255, 0.4)"); strokeWeight(2);
        line(ax, ay, dx, dy); noStroke();
        var midX = (ax + dx) / 2; var midY = (ay + dy) / 2;
        fill("white"); textSize(11); textAlign(CENTER); textStyle(NORMAL);
        text(stealPercent + "%", midX, midY - 8);
      }

      // --- UPDATED DEFENDER UI TRACKER & STEAL LOGIC ---

      // 1. COUNTDOWN TIMER (Decreases by 1 every frame)
      if (stealCooldownTimer > 0) stealCooldownTimer--;

      var canSteal = (dist <= 110 && stealCooldownTimer === 0);

      // 2. DYNAMIC TEXT COLOR
      noStroke();
      fill(canSteal ? "white" : "red");
      textSize(8); textAlign(CENTER);
      text("STEAL", defender.x, defender.y - 64);

      // 3. PROGRESS BAR (Set to 45 frames = 1.5 seconds)
      var maxCooldown = 45;
      var progress = (maxCooldown - stealCooldownTimer) / maxCooldown;
      fill("rgba(255, 255, 255, 0.3)");
      rect(defender.x - 20, defender.y - 60, 40, 5, 2);
      fill("white");
      rect(defender.x - 20, defender.y - 60, 40 * progress, 5, 2);

      // 4. STEAL INPUT HANDLING (Percentage-based success)
      var defShootKey = (possession === 1) ? "enter" : "space";

      if (keyWentDown(defShootKey) && stealCooldownTimer === 0) {

        // Calculate dynamic probability based on distance
        var stealChance = 0;
        if (dist <= 15) {
          stealChance = 0.50; // Maximum 50% chance when point-blank
        } else if (dist <= 110) {
          // Scales smoothly from 50% (at 15px) down to exactly 0% (at 110px)
          stealChance = 0.50 - (0.50 * ((dist - 15) / 95));
        }

        // Check if in range AND if the random number generator roll succeeds
        if (dist <= 110 && Math.random() < stealChance) {
          // SUCCESSFUL STEAL
          gameState = "steal_success";
          stealTimer = 90;
        } else {
          // FAILED STEAL (Triggers if out of range OR RNG percentage fails)
          stealCooldownTimer = maxCooldown;
          failedStealTimer = 60; // 60 frames (2 seconds at 30 FPS)
          failedStealX = (playerBody.x + oppBody.x) / 2;
          failedStealY = ((playerBody.y + oppBody.y) / 2) + 25;
        }
      }

      // 5. DRAW & ANIMATE THE FAILED STEAL TEXT
      if (failedStealTimer > 0) {
        // 2-second fade logic: Solid for 1s, fades during final 1s
        var alpha = 1.0;
        if (failedStealTimer <= 30) {
          alpha = failedStealTimer / 30;
        }

        fill("rgba(231, 76, 60, " + alpha + ")");
        noStroke(); textSize(10); textAlign(CENTER); textStyle(BOLD);
        text("STEAL FAILED", failedStealX, failedStealY);
        textStyle(NORMAL);

        failedStealY -= 0.3; // Gentle glide
        failedStealTimer--;
      }
    }
    // ---------------------------------------------------

    var activeBody = (possession === 1 || gameMode === "1P") ? playerBody : oppBody;

    // --- EXACT FOOTPRINT 3-POINT LOGIC ---
    var feetY = activeBody.y + 27.5;
    var leftFootX = activeBody.x - 16; var rightFootX = activeBody.x + 16;
    var isThree = true;

    if (feetY <= 110) {
      if (rightFootX >= 28.5 && leftFootX <= 371.5) isThree = false;
    } else {
      var closestX = Math.max(leftFootX, Math.min(200, rightFootX));
      var distToArcCenter = Math.sqrt(Math.pow(closestX - 200, 2) + Math.pow(feetY - 110, 2));
      if (distToArcCenter <= 171.5) isThree = false;
    }

    drawHeadIndicator(isThree, activeBody);
    drawScoreUI(); drawShotClock(); drawControlsUI(); drawMenuButton();

    if (gameMode === "1P" && (keyWentDown("space") || keyWentDown("enter"))) initiateShot(isThree, "questioning");
    else if (gameMode === "2P") {
      if (possession === 1 && keyWentDown("space")) initiateShot(isThree, "questioning_2p");
      if (possession === 2 && keyWentDown("enter")) initiateShot(isThree, "questioning_2p");
    }

  // --- STEAL ANIMATION STATE ---
  } else if (gameState === "steal_success") {
    var activeDefender = (possession === 1) ? oppBody : playerBody;

    // Phase 1: Swiping Animation (Frames 90 to 75)
    if (stealTimer > 75) {
      activeDefender.x += (stealTimer % 4 < 2) ? 4 : -4;
    }

    // Phase 2: Ball Bouncing Physics (Frames 90 to 60)
    if (stealTimer > 60) {
      ball.velocityY += gravity;
      ball.x += ball.velocityX;
      ball.y += ball.velocityY;

      if (ball.y > 340) { // Bounce off the floor
        ball.y = 340;
        ball.velocityY = -ball.velocityY * 0.6;
        ball.velocityX *= 0.8;
      }
    }

    updateHumanoids(); renderWorld(); drawScoreUI(); drawShotClock(); drawControlsUI(); drawMenuButton();

    // Phase 3: Immediate Wait Screen (Frames 90 to 0)
    if (stealTimer <= 90) {
      fill("rgba(0,0,0,0.85)"); noStroke(); rect(0, 160, 400, 60);
      fill("#2ecc71"); textSize(32); textAlign(CENTER); textStyle(BOLD);
      text("STEAL!", 200, 202);
      textStyle(NORMAL);
    }

    stealTimer--;
    if (stealTimer <= 0) {
      possession = (possession === 1) ? 2 : 1; // Give ball to the player who stole
      resetBall();
    }
  // ---------------------------------

  } else if (gameState === "shot_clock_violation") {
    // 1. Keep drawing the court, players, and UI so the screen doesn't freeze
    updateHumanoids();
    renderWorld();
    drawScoreUI();
    drawShotClock();
    drawControlsUI();
    drawMenuButton();

    // 2. Draw the Violation Banner
    fill("rgba(0,0,0,0.85)"); noStroke(); rect(0, 160, 400, 60);
    fill("#e74c3c"); textSize(24); textAlign(CENTER); textStyle(BOLD);
    text("SHOT CLOCK VIOLATION", 200, 192);
    fill("white"); textSize(14); text("TURNOVER", 200, 212);
    textStyle(NORMAL);

    // 3. Countdown the timer and reset
    violationTimer--;
    if (violationTimer <= 0) {
      if (gameMode === "2P") {
        switchPossession(); // Give ball to the other player
      } else {
        resetBall(); // Solo mode just resets
      }
    }

  } else if (gameState === "pre_question") {
    updateHumanoids(); renderWorld(); drawScoreUI(); drawControlsUI(); drawMenuButton();
    fill("rgba(0,0,0,0.85)"); noStroke(); rect(0, 170, 400, 60);
    fill("#f1c40f"); textSize(28); textAlign(CENTER); textStyle(BOLD); text("GET READY!", 200, 208); textStyle(NORMAL);
    preQuestionTimer--;
    if (preQuestionTimer <= 0) gameState = pendingQuestionState;
  } else if (gameState === "scoring" || gameState === "missing" || gameState === "falling_from_net" || gameState === "rattling" || gameState === "blocked") {
    ball.scale -= 0.015;
    if (ball.scale < 0.6) ball.scale = 0.6;
    ballTrail.push({x: ball.x, y: ball.y});
    if (ballTrail.length > 15) ballTrail.shift();

    if (gameState === "scoring" || gameState === "missing" || gameState === "falling_from_net" || gameState === "blocked") ball.velocityY += gravity;

    if (gameState === "scoring" && ball.y > hoop.y - 5 && ball.velocityY > 0) {
      if (gameMode === "1P" || possession === 1) scoreBlue += shotValue; else scoreRed += shotValue;
      gameState = "rattling"; ball.x = hoop.x; ball.y = hoop.y - 5;
      ball.velocityY = 0; ball.velocityX = 1.8; stuckTimer = 22;
    }

    if (gameState === "rattling") {
      ball.x += ball.velocityX; ball.y += 0.6;
      if (ball.x >= hoop.x + 5) { ball.x = hoop.x + 5; ball.velocityX *= -1; }
      else if (ball.x <= hoop.x - 5) { ball.x = hoop.x - 5; ball.velocityX *= -1; }
      stuckTimer--;
      if (stuckTimer <= 0) { gameState = "falling_from_net"; ball.velocityX = 0; ball.x = hoop.x; ball.velocityY = 0; resetTimer = 60; }
    }

    if (gameState === "falling_from_net") {
      if (ball.y >= hoop.y + 50 && ball.velocityY > 0) { ball.y = hoop.y + 50; ball.velocityY = -ball.velocityY * 0.7; }
      resetTimer--;
      if (resetTimer <= 0) { if (gameMode === "1P" && !showPenalty && !showCorrect) resetBall(); }
    }

    if ((gameState === "missing" || gameState === "blocked") && ball.y > 340 && ball.velocityY > 0) {
      ball.y = 340; ball.velocityY = -ball.velocityY * 0.45; ball.velocityX *= 0.6;
      if (Math.abs(ball.velocityY) < 1.5) { ball.velocityY = 0; gameState = "floor"; floorTimer = 40; }
    }

    updateHumanoids(); renderWorld(); drawScoreUI(); drawControlsUI(); drawMenuButton();
  } else if (gameState === "floor") {
    ball.velocityX *= 0.85; updateHumanoids(); renderWorld(); drawScoreUI(); drawControlsUI(); drawMenuButton();
    floorTimer--;
    if (floorTimer <= 0) { if (gameMode === "1P" && !showPenalty && !showCorrect) resetBall(); }
  } else if (gameState === "questioning" || gameState === "questioning_2p") {
    updateHumanoids(); renderWorld(); drawScoreUI(); drawControlsUI(); drawMenuButton();
    if (gameState === "questioning") renderMathUI_1P(); else renderMathUI_2P();
  }

  if (showCorrect || showPenalty) {
    drawExplanationScreen(showCorrect);
    if (penaltyTimer > 0) {
      penaltyTimer--;
    } else {
      var anyKeyPressed = keyWentDown("w") || keyWentDown("a") || keyWentDown("s") || keyWentDown("d") ||
                          keyWentDown("space") || keyWentDown("up") || keyWentDown("down") ||
                          keyWentDown("left") || keyWentDown("right") || keyWentDown("enter");
      if (anyKeyPressed) {
        if (gameMode === "2P") switchPossession(); else resetBall();
      }
    }
  }

  if (gameState === "paused") {
    fill("rgba(0, 0, 0, 0.75)"); rect(0, 0, 400, 400);
    fill("white"); textSize(35); textAlign(CENTER); textStyle(BOLD); text("GAME PAUSED", 200, 150); textStyle(NORMAL);
    var mx = World.mouseX; var my = World.mouseY;
    var hoverResume = (mx > 100 && mx < 300 && my > 190 && my < 240);
    fill(hoverResume ? "#27ae60" : "#2ecc71"); stroke("white"); strokeWeight(2); rect(100, 190, 200, 50, 10);
    fill("white"); noStroke(); textSize(20); textStyle(BOLD); text("RESUME", 200, 223);
    var hoverMenu = (mx > 100 && mx < 300 && my > 260 && my < 310);
    fill(hoverMenu ? "#c0392b" : "#e74c3c"); stroke("white"); strokeWeight(2); rect(100, 260, 200, 50, 10);
    fill("white"); noStroke(); text("MAIN MENU", 200, 293); textStyle(NORMAL);

    if (mouseWentDown("leftButton")) {
      if (hoverResume) { hasInteractedThisPossession = true; afkStreak = 0; gameState = prePauseState; }
      if (hoverMenu) { afkStreak = 0; showCorrect = false; showPenalty = false; gameState = "title"; }
    }
  }
}

function updateHumanoids() {
  playerHead.x = playerBody.x; playerHead.y = playerBody.y - 35;
  oppHead.x = oppBody.x; oppHead.y = oppBody.y - 35;

  p1EyeL.x = playerHead.x - 4; p1EyeL.y = playerHead.y - 2;
  p1EyeR.x = playerHead.x + 4; p1EyeR.y = playerHead.y - 2;
  p2EyeL.x = oppHead.x - 4; p2EyeL.y = oppHead.y - 2;
  p2EyeR.x = oppHead.x + 4; p2EyeR.y = oppHead.y - 2;

  var defLarm, defRarm, defBody, atkLarm, atkRarm, atkBody;

  if (gameMode === "1P" || possession === 1) {
    atkBody = playerBody; atkLarm = playerLarm; atkRarm = playerRarm;
    defBody = oppBody; defLarm = oppLarm; defRarm = oppRarm;
  } else {
    atkBody = oppBody; atkLarm = oppLarm; atkRarm = oppRarm;
    defBody = playerBody; defLarm = playerLarm; defRarm = playerRarm;
  }

  if (gameState === "questioning" || gameState === "questioning_2p" || gameState === "pre_question") {
    pinArm(defLarm, defBody, true, 135); pinArm(defRarm, defBody, false, -135);
    var dx = hoop.x - atkBody.x; var dy = hoop.y - (atkBody.y - 26);
    var shootAngle = Math.atan2(dy, dx) * (180 / Math.PI) - 90;
    pinArm(atkLarm, atkBody, true, shootAngle); pinArm(atkRarm, atkBody, false, shootAngle);
  } else if (gameState === "play" || gameState === "shot_clock_violation") {
    pinArm(defLarm, defBody, true, 45); pinArm(defRarm, defBody, false, -45);
    if (gameState === "shot_clock_violation") { pinArm(atkLarm, atkBody, true, 10); pinArm(atkRarm, atkBody, false, -10); }
  } else if (gameState === "scoring" || gameState === "missing" || gameState === "falling_from_net" || gameState === "rattling" || gameState === "blocked" || gameState === "floor") {
    if (ball.velocityY < 0) {
      pinArm(defLarm, defBody, true, 160); pinArm(defRarm, defBody, false, -160);
      var airDx = hoop.x - atkBody.x; var airDy = hoop.y - (atkBody.y - 26);
      var shootAngleAir = Math.atan2(airDy, airDx) * (180 / Math.PI) - 90;
      if (atkBody.x < 200) { atkLarm.x = -1000; pinArm(atkRarm, atkBody, false, shootAngleAir); }
      else { atkRarm.x = -1000; pinArm(atkLarm, atkBody, true, shootAngleAir); }
    } else {
      pinArm(atkLarm, atkBody, true, 10); pinArm(atkRarm, atkBody, false, -10);
      pinArm(defLarm, defBody, true, 10); pinArm(defRarm, defBody, false, -10);
    }
  } else if (gameState === "title" || gameState === "instructions_2p") {
     playerBody.x = 80; playerBody.y = 300; oppBody.x = 320; oppBody.y = 300;
     pinArm(playerLarm, playerBody, true, 10); pinArm(playerRarm, playerBody, false, -10);
     pinArm(oppLarm, oppBody, true, 10); pinArm(oppRarm, oppBody, false, -10);
  }
}

function handleIsolatedDribble() {
  if (gameState !== "play") return;
  var activeBody = (possession === 1 || gameMode === "1P") ? playerBody : oppBody;
  var activeLarm = (possession === 1 || gameMode === "1P") ? playerLarm : oppLarm;
  var activeRarm = (possession === 1 || gameMode === "1P") ? playerRarm : oppRarm;

  var targetOffset = targetBallSide * 24;
  var offsetDiff = targetOffset - currentBallOffset;
  currentBallOffset += offsetDiff * 0.2;

  var isCrossingOver = Math.abs(offsetDiff) > 4;
  if (isCrossingOver) {
    var activeHead = (possession === 1 || gameMode === "1P") ? playerHead : oppHead;
    dashTrails.push({ x: activeBody.x, y: activeBody.y, headX: activeHead.x, headY: activeHead.y, life: 1.0 });
  }

  dribbleTime += 0.25;
  var bounce = Math.pow(Math.sin(dribbleTime), 2) * 22;
  var crossoverDip = (24 - Math.abs(currentBallOffset)) * 0.45;

  ball.x = activeBody.x + currentBallOffset;
  ball.y = (activeBody.y - 5) + bounce + crossoverDip;
  activeBody.rotation = 0;

  var ratioLeft = (24 - currentBallOffset) / 48;
  var ratioRight = (currentBallOffset + 24) / 48;
  var dribbleAngleL = 10 + (ratioLeft * bounce * 1.5);
  var dribbleAngleR = -10 - (ratioRight * bounce * 1.5);

  pinArm(activeLarm, activeBody, true, dribbleAngleL);
  pinArm(activeRarm, activeBody, false, dribbleAngleR);
}

function drawWhooshTrails() {
  for (var i = dashTrails.length - 1; i >= 0; i--) {
    var t = dashTrails[i];
    t.life -= 0.15;
    if (t.life <= 0) dashTrails.splice(i, 1);
    else {
      noStroke(); fill("rgba(255, 255, 255, " + (t.life * 0.35) + ")");
      rect(t.x - 16, t.y - 27.5, 32, 55, 3); ellipse(t.headX, t.headY, 22, 22);
    }
  }
}

function triggerBlock() {
  lastShotResult = "blocked"; ballTrail = []; trailColor = "142, 68, 173";
  var defenderBody = (possession === 1 || gameMode === "1P") ? oppBody : playerBody;
  ball.x = defenderBody.x; ball.y = defenderBody.y - 45;
  ball.velocityY = -3; ball.velocityX = (defenderBody.x < 200) ? 2 : -2;
  gameState = "blocked"; playSound("sound://category_hits/retro_game_hit_block_3.mp3");
}

function handleMovement() {
  if (gameMode === "1P") {
    var speed = 6.0;
    if (keyDown("left") || keyDown("a")) { playerBody.x -= speed; targetBallSide = -1; }
    if (keyDown("right") || keyDown("d")) { playerBody.x += speed; targetBallSide = 1; }
    if (keyDown("up") || keyDown("w")) playerBody.y -= speed;
    if (keyDown("down") || keyDown("s")) playerBody.y += speed;
  } else {
    // --- UPDATED 2P DEFENDER SPEED (+20%) ---
    var defSpeed = 4.8; var atkSpeed = 6.8; var defLerp = 0.1275; var p1IsAtk = (possession === 1);
    var p1InX = 0; var p1InY = 0;
    if (keyDown("a")) { p1InX = -1; if(p1IsAtk) targetBallSide = -1; }
    if (keyDown("d")) { p1InX = 1; if(p1IsAtk) targetBallSide = 1; }
    if (keyDown("w")) p1InY = -1; if (keyDown("s")) p1InY = 1;

    var p2InX = 0; var p2InY = 0;
    if (keyDown("left")) { p2InX = -1; if(!p1IsAtk) targetBallSide = -1; }
    if (keyDown("right")) { p2InX = 1; if(!p1IsAtk) targetBallSide = 1; }
    if (keyDown("up")) p2InY = -1; if (keyDown("down")) p2InY = 1;

    if (p1IsAtk) {
      playerBody.x += p1InX * atkSpeed; playerBody.y += p1InY * atkSpeed;
      p2Vx += (p2InX * defSpeed - p2Vx) * defLerp; p2Vy += (p2InY * defSpeed - p2Vy) * defLerp;
      oppBody.x += p2Vx; oppBody.y += p2Vy;
    } else {
      oppBody.x += p2InX * atkSpeed; oppBody.y += p2InY * atkSpeed;
      p1Vx += (p1InX * defSpeed - p1Vx) * defLerp; p1Vy += (p1InY * defSpeed - p1Vy) * defLerp;
      playerBody.x += p1Vx; playerBody.y += p1Vy;
    }
  }
  playerBody.y = Math.min(Math.max(playerBody.y, 20), 365); playerBody.x = Math.min(Math.max(playerBody.x, 10), 390);
  oppBody.y = Math.min(Math.max(oppBody.y, 20), 365); oppBody.x = Math.min(Math.max(oppBody.x, 10), 390);
}

function drawNBACourt() {
  background("#f0c07c"); stroke("#000000"); strokeWeight(3); noFill();
  line(0, 40, 400, 40); rect(120, 40, 160, 180);
  ellipse(200, 220, 100, 100); arc(200, 220, 100, 100, 0, 180);
  line(30, 40, 29.5, 110); line(370, 40, 369.5, 110); arc(200, 110, 340, 340, 0, 180);
}

function drawHeadIndicator(is3, activeBody) {
  var txt = is3 ? "3-PTS" : "2-PTS"; var col = is3 ? "#f1c40f" : "#ffffff";
  fill("rgba(0,0,0,0.6)"); noStroke(); rect(activeBody.x - 22, activeBody.y - 82, 44, 18, 4);
  fill(col); textSize(10); textAlign(CENTER); textStyle(BOLD); text(txt, activeBody.x, activeBody.y - 69); textStyle(NORMAL);
}

function initiateShot(is3, targetState) {
  shotValue = is3 ? 3 : 2; generateExponentQuestion(is3);
  pendingQuestionState = targetState; defenderLockedOut = false; lockedOptionIndex = -1;
  var activeBody = (possession === 1 || gameMode === "1P") ? playerBody : oppBody;
  ball.x = activeBody.x; ball.y = activeBody.y - 35;
  gameState = "pre_question"; preQuestionTimer = 30;
}

function triggerScore() {
  lastShotResult = "made"; var framesInAir = 35; ballTrail = []; trailColor = "46, 204, 113";
  ball.velocityY = (hoop.y - ball.y - 0.5 * gravity * framesInAir * framesInAir) / framesInAir;
  ball.velocityX = (hoop.x - ball.x) / framesInAir;
  gameState = "scoring"; playSound("sound://category_achievements/vibrant_game_positive_achievement_1.mp3");
}

function triggerMiss() {
  lastShotResult = "missed"; var framesInAir = 35; ballTrail = []; trailColor = "231, 76, 60";
  ball.velocityY = (hoop.y - ball.y - 0.5 * gravity * framesInAir * framesInAir) / framesInAir;
  ball.velocityX = (ball.x < 200) ? 6 : -6;
  gameState = "missing"; playSound("sound://category_digital/power_down_1.mp3");
}

function switchPossession() { possession = (possession === 1) ? 2 : 1; resetBall(); }

function drawHoopNet() {
  stroke("white"); strokeWeight(1); noFill();
  for (var i = 0; i <= 6; i++) { var xOff = (i * 4) - 12; line(hoop.x + xOff, hoop.y, hoop.x + (xOff * 0.6), hoop.y + 20); }
  line(hoop.x - 10, hoop.y + 7, hoop.x + 10, hoop.y + 7); line(hoop.x - 6, hoop.y + 14, hoop.x + 6, hoop.y + 14);
}

function drawBackboard() {
  fill("#e0e0e0"); stroke("#000000"); strokeWeight(2); rect(175, 45, 50, 6);
  stroke("#ff4500"); strokeWeight(3); noFill(); arc(hoop.x, hoop.y, hoop.w, hoop.h, 180, 360);
}
function drawRimFront() { stroke("#ff4500"); strokeWeight(3); noFill(); arc(hoop.x, hoop.y, hoop.w, hoop.h, 0, 180); }

function drawScoreUI() {
  if (gameMode === "1P") {
    fill("#1d428a"); stroke("white"); strokeWeight(2); rect(10, 5, 60, 30, 5);
    noStroke(); fill("white"); textSize(22); textAlign(CENTER); textStyle(BOLD); text(scoreBlue, 40, 28); textStyle(NORMAL);
  } else {
    fill("#1d428a"); stroke("white"); strokeWeight(2); rect(10, 5, 60, 30, 5);
    noStroke(); fill("white"); textSize(22); textAlign(CENTER); textStyle(BOLD); text(scoreBlue, 40, 28);
    fill("#ce1141"); stroke("white"); strokeWeight(2); rect(330, 5, 60, 30, 5);
    noStroke(); fill("white"); textSize(22); textAlign(CENTER); text(scoreRed, 360, 28); textStyle(NORMAL);
  }
}

function drawShotClock() {
  if (gameMode === "1P") return;
  var clockColor = (shotClock <= 3) ? "#e74c3c" : "#f1c40f";
  fill("black"); stroke(clockColor); strokeWeight(2); rect(175, 2, 50, 22, 3);
  noStroke(); fill(clockColor); textSize(18); textAlign(CENTER); textStyle(BOLD); text(shotClock, 200, 19); textStyle(NORMAL);
}

function drawControlsUI() {
  fill("rgba(0, 0, 0, 0.85)"); noStroke(); rect(0, 360, 400, 40);
  if (gameMode === "1P") {
    fill("#1d428a"); stroke("white"); strokeWeight(1.5); rect(15, 365, 150, 30, 5);
    fill("white"); noStroke(); textSize(11); textAlign(CENTER); textStyle(BOLD); text("MOVE", 90, 385);

    fill("#c0392b"); stroke("white"); strokeWeight(1.5); rect(235, 365, 150, 30, 5);
    fill("white"); noStroke(); text("SPACE/ENTER : Shoot", 310, 385); textStyle(NORMAL);
  } else {
    var p1Text = (possession === 1) ? "SPACE Shoot" : "SPACE Steal";
    var p2Text = (possession === 2) ? "ENTER Shoot" : "ENTER Steal";

    fill("#1d428a"); stroke("white"); strokeWeight(1.5); rect(5, 365, 165, 30, 5);
    fill("white"); noStroke(); textSize(11); textAlign(CENTER); textStyle(BOLD); text("WASD Move | " + p1Text, 87, 385);

    fill("#ce1141"); stroke("white"); strokeWeight(1.5); rect(230, 365, 165, 30, 5);
    fill("white"); noStroke(); text("ARROWS Move | " + p2Text, 312, 385); textStyle(NORMAL);
  }
}

function drawMenuButton() {
  if (gameState === "title" || gameState === "instructions_2p") return;
  var mx = World.mouseX; var my = World.mouseY;

  var hover = (mx > 175 && mx < 225 && my > 365 && my < 395);
  fill(hover ? "#e74c3c" : "#111111"); stroke("white"); strokeWeight(1.5); rect(175, 365, 50, 30, 4);

  fill("white"); noStroke(); textSize(11); textAlign(CENTER); textStyle(BOLD); text("MENU", 200, 385); textStyle(NORMAL);
  if (mouseWentDown("leftButton") && hover) {
    gameState = "title"; showCorrect = false; showPenalty = false;
  }
}

function drawTrail() {
  if (ballTrail.length === 0) return;
  noStroke();
  for (var i = 0; i < ballTrail.length; i++) {
    var pt = ballTrail[i]; var alpha = (i / ballTrail.length);
    fill("rgba(" + trailColor + ", " + alpha + ")");
    var size = (i / ballTrail.length) * 22; ellipse(pt.x, pt.y, size, size);
  }
}

function toSuperscript(num) {
  var str = num.toString();
  var superMap = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  var res = ""; for (var i = 0; i < str.length; i++) res += superMap[str[i]] || str[i]; return res;
}
function formatPower(v, exp) { if (exp === 0) return "1"; return v + toSuperscript(exp); }

// Draws text that may contain toSuperscript()'s superscript characters, but
// renders those digits as scaled-down/raised REGULAR digits instead of using
// the Unicode superscript glyphs directly. Unicode superscript characters
// come from two different blocks (¹²³ vs ⁰⁴⁵⁶⁷⁸⁹) that many fonts - even
// well-designed ones - render with inconsistent size/baseline/style, which
// looks broken (mismatched digits) especially on mobile. Regular digits 0-9
// are always a unified, consistent glyph set in any font, so drawing scaled
// copies of those instead guarantees a consistent look everywhere.
var SUP_TO_NORMAL = {"⁻":"-", "⁰":"0", "¹":"1", "²":"2", "³":"3", "⁴":"4", "⁵":"5", "⁶":"6", "⁷":"7", "⁸":"8", "⁹":"9"};

function drawSupText(str, x, y, hAlign, vAlign) {
  if (hAlign === undefined) hAlign = CENTER;
  if (vAlign === undefined) vAlign = CENTER;

  var segments = [];
  for (var i = 0; i < str.length; i++) {
    var ch = str[i];
    var mapped = SUP_TO_NORMAL[ch];
    var isSup = mapped !== undefined;
    var glyph = isSup ? mapped : ch;
    if (segments.length > 0 && segments[segments.length - 1].isSup === isSup) {
      segments[segments.length - 1].text += glyph;
    } else {
      segments.push({ text: glyph, isSup: isSup });
    }
  }

  var baseSize = textSize();
  var supSize = baseSize * 0.62;
  var supRaise = baseSize * 0.32;

  var totalWidth = 0;
  var s;
  for (s = 0; s < segments.length; s++) {
    textSize(segments[s].isSup ? supSize : baseSize);
    totalWidth += textWidth(segments[s].text);
  }

  var startX;
  if (hAlign === CENTER) startX = x - totalWidth / 2;
  else if (hAlign === RIGHT) startX = x - totalWidth;
  else startX = x;

  // Whether both a base and a superscript segment are present - if the
  // exponent is only raised (base stays put), the combined shape's visual
  // center drifts upward from y (the raised part sticks out further than
  // the base sticks down), which is what made text look off-center inside
  // boxes. Splitting the offset between both segments instead keeps the
  // combined shape balanced around the original y.
  var hasBoth = false;
  for (s = 0; s < segments.length; s++) { if (segments[s].isSup) hasBoth = true; }
  hasBoth = hasBoth && segments.length > 1;
  var baseShift = hasBoth ? supRaise / 2 : 0;

  textAlign(LEFT, vAlign);
  var cursorX = startX;
  for (s = 0; s < segments.length; s++) {
    var seg = segments[s];
    textSize(seg.isSup ? supSize : baseSize);
    text(seg.text, cursorX, seg.isSup ? (y - supRaise + baseShift) : (y + baseShift));
    cursorX += textWidth(seg.text);
  }

  textSize(baseSize);
  textAlign(hAlign, vAlign);
}

function generateExponentQuestion(isHard) {
  isFraction = false; subQuestionText = "";
  var qType = randomNumber(0, 7);
  if (qType >= 4) qType = randomNumber(0, 1);
  var vars = ["x", "y", "a", "b"]; var v = vars[randomNumber(0, 3)];
  var m, n, correctStr;
  var wrongExponents = [];
  var usedStrings = [];

  function getNum() { return isHard ? randomNumber(-5, 5) : randomNumber(2, 6); }

  if (qType === 0) {
    m = getNum(); n = getNum();
    questionText = v + toSuperscript(m) + " · " + v + toSuperscript(n);
    correctStr = formatPower(v, m + n);
    wrongExponents.push(m * n, m - n, m + n + 1, m + n - 1);
    lastExplanation = "Rule: Add exponents (" + m + ((n < 0) ? " - " + Math.abs(n) : " + " + n) + " = " + (m + n) + ")";
  } else if (qType === 1) {
    m = getNum(); n = getNum(); if (!isHard && m < n) { var temp = m; m = n; n = temp; }
    isFraction = randomNumber(0, 1) === 0;
    if (isFraction) { questionText = v + toSuperscript(m); subQuestionText = v + toSuperscript(n); }
    else questionText = v + toSuperscript(m) + " ÷ " + v + toSuperscript(n);
    correctStr = formatPower(v, m - n);
    wrongExponents.push(m + n, m * n, m - n - 1, m - n + 1);
    lastExplanation = "Rule: Subtract exponents (" + m + ((n < 0) ? " + " + Math.abs(n) : " - " + n) + " = " + (m - n) + ")";
  } else if (qType === 2) {
    m = getNum(); if (m === 0) m = 5; if (m === 1) m = 6;
    questionText = "(" + v + toSuperscript(m) + ")" + toSuperscript(0);
    correctStr = "1";
    lastExplanation = "Rule: Any base to the power of 0 is 1.";
  } else {
    m = isHard ? randomNumber(-4, 4) : randomNumber(2, 4); n = isHard ? randomNumber(-3, 3) : randomNumber(2, 3);
    questionText = "(" + v + toSuperscript(m) + ")" + toSuperscript(n);
    correctStr = formatPower(v, m * n);
    wrongExponents.push(m + n, Math.pow(m, 2), m * n + 1, m * n - 1);
    lastExplanation = "Rule: Multiply exponents (" + m + " · " + n + " = " + (m * n) + ")";
  }

  usedStrings.push(correctStr);
  var wrongs = [];

  if (qType === 2) {
    var possibleWrongs = [v + toSuperscript(m), "0", v, "-1"];
    for (var i = 0; i < possibleWrongs.length; i++) {
      if (usedStrings.indexOf(possibleWrongs[i]) === -1) {
        wrongs.push(possibleWrongs[i]);
        usedStrings.push(possibleWrongs[i]);
      }
    }
  } else {
    for (var i = 0; i < wrongExponents.length; i++) {
      var wStr = formatPower(v, wrongExponents[i]);
      if (usedStrings.indexOf(wStr) === -1) {
        wrongs.push(wStr);
        usedStrings.push(wStr);
      }
    }
  }

  var safetyExp = 1;
  while (wrongs.length < 3) {
    var sStr = formatPower(v, safetyExp);
    if (usedStrings.indexOf(sStr) === -1) {
      wrongs.push(sStr);
      usedStrings.push(sStr);
    }
    safetyExp++;
    if (safetyExp === 0) safetyExp++;
  }

  lastCorrectAns = correctStr;
  var numOptions = (gameMode === "1P") ? 4 : 2;
  options = [{ text: correctStr, isCorrect: true }];

  for (var j = 0; j < numOptions - 1; j++) {
    options.push({ text: wrongs[j], isCorrect: false });
  }

  for (var k = options.length - 1; k > 0; k--) {
    var r = randomNumber(0, k);
    var tempOpt = options[k];
    options[k] = options[r];
    options[r] = tempOpt;
  }
}

function renderMathUI_1P() {
  fill("#111111"); noStroke(); rect(20, 20, 360, 360, 12);
  fill("white"); textAlign(CENTER); textSize(18); textStyle(BOLD); text("SOLVE TO SHOOT", 200, 45); textStyle(NORMAL);
  stroke("#333333"); strokeWeight(1); line(50, 55, 350, 55); noStroke(); fill("white"); textSize(38);

  if (isFraction) {
    drawSupText(questionText, 200, 185); stroke("white"); strokeWeight(2); line(165, 218, 235, 218); noStroke(); drawSupText(subQuestionText, 200, 244);
  } else {
    drawSupText(questionText, 200, 210);
  }

  var buttonLayout = [
    { x: 200, y: 100, key: "up", altKey: "w", arrow: "▲", dir: "up" },
    { x: 200, y: 310, key: "down", altKey: "s", arrow: "▼", dir: "down" },
    { x: 75, y: 205, key: "left", altKey: "a", arrow: "◀", dir: "left" },
    { x: 325, y: 205, key: "right", altKey: "d", arrow: "▶", dir: "right" }
  ];

  for (var i = 0; i < 4; i++) {
    var bx = buttonLayout[i].x; var by = buttonLayout[i].y; var bw = (i === 2 || i === 3) ? 105 : 120; var bh = 60;
    var hover = (World.mouseX > bx - bw/2 && World.mouseX < bx + bw/2 && World.mouseY > by - bh/2 && World.mouseY < by + bh/2);

    fill(hover ? "#4a90d9" : "white"); noStroke(); rect(bx - bw/2, by - bh/2, bw, bh, 8);

    var dir = buttonLayout[i].dir;
    var textX = bx, textY = by, arrowX = bx, arrowY = by;
    if (dir === "up") { arrowY = by - bh / 2 + 13; textY = by + 8; }
    else if (dir === "down") { arrowY = by + bh / 2 - 13; textY = by - 9; }
    else if (dir === "left") { arrowX = bx - bw / 2 + 15; textX = bx + 10; }
    else if (dir === "right") { arrowX = bx + bw / 2 - 15; textX = bx - 10; }

    fill(hover ? "white" : "#111111"); textSize(24); textStyle(BOLD); drawSupText(options[i].text, textX, textY); textStyle(NORMAL);

    fill(hover ? "white" : "#111111"); textSize(18); textStyle(BOLD); textAlign(CENTER, CENTER); text(buttonLayout[i].arrow, arrowX, arrowY); textStyle(NORMAL);

    if (keyWentDown(buttonLayout[i].key) || keyWentDown(buttonLayout[i].altKey) || (mouseWentDown("leftButton") && hover)) {
      lastQuestionText = questionText; lastSubQuestionText = subQuestionText; lastIsFraction = isFraction;

      if (options[i].isCorrect) {
        showCorrect = true; penaltyTimer = 150; triggerScore();
      } else {
        showPenalty = true; penaltyTimer = 150; shakeTimer = 9; triggerMiss();
      }
    }
  }
}

function renderMathUI_2P() {
  fill("#111111"); noStroke(); rect(20, 20, 360, 360, 12);
  fill((possession === 1) ? "#1d428a" : "#ce1141"); textAlign(CENTER); textSize(16); textStyle(BOLD); text("PLAYER SHOOTING", 200, 52); textStyle(NORMAL);
  stroke("#333333"); strokeWeight(1); line(50, 62, 350, 62); noStroke(); fill("white"); textSize(36);

  if (isFraction) {
    drawSupText(questionText, 200, 108); stroke("white"); strokeWeight(2); line(165, 138, 235, 138); noStroke(); drawSupText(subQuestionText, 200, 163);
  } else {
    drawSupText(questionText, 200, 135);
  }

  if (defenderLockedOut) {
    fill("#d44a4a"); textSize(13); textStyle(BOLD); text("DEFENDER WRONG - ATTACKER SHOOTS FREE", 200, 182); textStyle(NORMAL);
  } else {
    fill("#888888"); textSize(13); text("First correct answer wins", 200, 182);
  }

  for (var i = 0; i < 2; i++) {
    var bx = 110 + (i * 175); var by = 275; var isLocked = (lockedOptionIndex === i);
    fill(isLocked ? "#3a1010" : "white"); noStroke(); rect(bx - 70, by - 45, 140, 90, 8);
    fill(isLocked ? "#666666" : "#111111"); textSize(32); textStyle(BOLD); drawSupText(options[i].text, bx, by + 5); textStyle(NORMAL);
    fill(isLocked ? "#222222" : "#1d428a"); rect(bx - 65, by + 28, 58, 16, 4); fill(isLocked ? "#444444" : "white"); textSize(11); textStyle(BOLD); text(i === 0 ? "[ A ]" : "[ D ]", bx - 36, by + 40);
    fill(isLocked ? "#222222" : "#ce1141"); rect(bx + 7, by + 28, 58, 16, 4); fill(isLocked ? "#444444" : "white"); textSize(11); text(i === 0 ? "[ < ]" : "[ > ]", bx + 36, by + 40); textStyle(NORMAL);

    if (!isLocked) {
      var p1Press = (i===0 && keyWentDown("a")) || (i===1 && keyWentDown("d"));
      var p2Press = (i===0 && keyWentDown("left")) || (i===1 && keyWentDown("right"));
      var atkPress = (possession === 1) ? p1Press : p2Press; var defPress = (possession === 1) ? p2Press : p1Press;

      if (!defenderLockedOut && defPress) {
        lastQuestionText = questionText; lastSubQuestionText = subQuestionText; lastIsFraction = isFraction;
        if (options[i].isCorrect) { showPenalty = true; penaltyTimer = 150; triggerBlock(); }
        else { defenderLockedOut = true; lockedOptionIndex = i; shakeTimer = 9; }
      }
      if (atkPress) {
        lastQuestionText = questionText; lastSubQuestionText = subQuestionText; lastIsFraction = isFraction;
        if (options[i].isCorrect) { showCorrect = true; penaltyTimer = 150; triggerScore(); }
        else { showPenalty = true; penaltyTimer = 150; shakeTimer = 9; triggerMiss(); }
      }
    }
  }
}

function drawExplanationScreen(isCorrect) {
  fill("#111111"); noStroke(); rect(30, 265, 340, 100, 10);

  if (isCorrect) {
    fill("#27ae60"); textSize(18); textAlign(CENTER); textStyle(BOLD);
    text(gameMode === "2P" ? "SHOT MADE  +" + shotValue : "CORRECT!  +" + shotValue, 200, 285);
  } else {
    fill("#c0392b"); textSize(18); textAlign(CENTER); textStyle(BOLD);
    text(lastShotResult === "blocked" ? "SHOT BLOCKED!" : "WRONG ANSWER", 200, 285);
  }
  textStyle(NORMAL);

  stroke("#333333"); strokeWeight(1); line(60, 294, 340, 294); noStroke();

  var qString = lastQuestionText;
  if (lastIsFraction && lastSubQuestionText !== "") qString += " / " + lastSubQuestionText;
  fill("white"); textSize(18); textStyle(BOLD); drawSupText(qString + "  =  " + lastCorrectAns, 200, 316); textStyle(NORMAL);

  fill("#aaaaaa"); textSize(12); text(lastExplanation, 200, 336);

  var nextIsRed = (gameMode === "2P" && possession === 1);
  var nextColor = nextIsRed ? "#ce1141" : "#1d428a";
  var nextText = nextIsRed ? "RED PLAYER" : "BLUE PLAYER";
  if (gameMode === "1P") {
    nextColor = "#1d428a"; nextText = "BLUE PLAYER";
  }

  if (penaltyTimer > 0) {
    fill("#888888"); textSize(12); textStyle(BOLD); text("Wait " + Math.ceil(penaltyTimer / 30) + "s...", 200, 356); textStyle(NORMAL);
  } else {
    fill(nextColor); textSize(12); textStyle(BOLD); text(nextText + " press any key to start", 200, 356); textStyle(NORMAL);
  }
}

function handleDefenseAI() {
  var dx = hoop.x - playerBody.x; var dy = hoop.y - playerBody.y;
  var tx = playerBody.x + dx * 0.45; var ty = playerBody.y + dy * 0.45;
  ty = Math.min(Math.max(ty, 20), 320);

  // INCREASED 1P DEFENDER SPEED BY 20% (0.07 * 1.2 = 0.084)
  oppBody.x += (tx - oppBody.x) * 0.084;
  oppBody.y += (ty - oppBody.y) * 0.084;
}

function drawBallSkins() {
  push(); translate(ball.x, ball.y); if (gameState === "play") rotate(dribbleTime * 30 * targetBallSide);
  scale(19 / 150); ellipseMode(CENTER); fill("#e67e22"); noStroke(); ellipse(0, 0, 150, 150);
  stroke("#000000"); strokeWeight(6); noFill(); line(-74, 0, 74, 0); line(0, -74, 0, 74);
  arc(-55, 0, 85, 125, -60, 60); arc(55, 0, 85, 125, 120, 240); pop();
}

function drawBigBasketball(bx, by, s) {
  push(); translate(bx, by); scale(s); ellipseMode(CENTER);
  fill("rgba(230, 126, 34, 0.3)"); noStroke(); ellipse(0, 0, 150, 150);
  stroke("rgba(0, 0, 0, 0.5)"); strokeWeight(3); noFill();
  line(-74, 0, 74, 0); line(0, -74, 0, 74);
  arc(-55, 0, 85, 125, -60, 60); arc(55, 0, 85, 125, 120, 240); pop();
}

function resetBall() {
  hasInteractedThisPossession = false;
  ball.velocityY = 0; ball.velocityX = 0; ball.scale = 1.1;
  p1Vx = 0; p1Vy = 0; p2Vx = 0; p2Vy = 0;

  if (gameMode === "2P") {
    stealCooldownTimer = 0;
    stealTimer = 0;
  }

  var attackerY = 315;
  var defenderY = 145;

  if (gameMode === "1P" || (gameMode === "2P" && possession === 1)) {
    playerBody.x = 200; playerBody.y = attackerY; oppBody.x = 200; oppBody.y = defenderY;
  } else {
    oppBody.x = 200; oppBody.y = attackerY; playerBody.x = 200; playerBody.y = defenderY;
  }

  targetBallSide = 1; currentBallOffset = 24; dashTrails = [];
  ballTrail = []; showCorrect = false; showPenalty = false; shotClock = 10; frameCounter = 0;

  if (gameState !== "instructions_2p" && gameState !== "title") gameState = "play";
}

function drawInstructions2P() {
  pulseCounter++;

  // Background
  fill("rgba(0, 0, 0, 0.9)"); noStroke(); rect(0, 0, 400, 400);

  // TITLE
  fill("#f1c40f"); textSize(24); textAlign(CENTER); textStyle(BOLD);
  text("HOW TO PLAY", 200, 45); textStyle(NORMAL);
  stroke("#333333"); strokeWeight(2); line(40, 55, 360, 55); noStroke();

  // --- SECTION 1: ATTACKER ---
  var y = 90;

  fill("#3498db"); textSize(20); textStyle(BOLD);
  text("ATTACKER", 200, y);

  fill("white"); textSize(14); textStyle(NORMAL);
  text("SHOOT the ball. 3-Pointers have harder math.", 200, y + 25);

  fill("#2ecc71"); textSize(14); textStyle(BOLD);
  text("Correct: SCORE   |   Wrong: MISS", 200, y + 50);

  // Minor dividing line between sections
  stroke("#222222"); strokeWeight(2); line(100, y + 80, 300, y + 80); noStroke();

  // --- SECTION 2: DEFENDER ---
  y = 210;

  fill("#ce1141"); textSize(20); textStyle(BOLD);
  text("DEFENDER", 200, y);

  fill("white"); textSize(14); textStyle(NORMAL);
  text("Get close to STEAL. Success chance is shown.", 200, y + 25);

  fill("#2ecc71"); textSize(14); textStyle(BOLD);
  text("Correct: BLOCK   |   Wrong: ATTACKER OPEN SHOT", 200, y + 50);

  // --- YELLOW TEXT (Centered) ---
  fill("#f1c40f");
  textSize(13);
  textStyle(BOLD);
  text("You need to be quick but you also need to be CORRECT", 200, 310);

  // --- FOOTER / START BUTTON (FLASHING EFFECT) ---
  var flashAlpha = 0.6 + 0.4 * Math.sin(pulseCounter / 8);
  fill("rgba(255, 255, 255, " + flashAlpha + ")");

  textSize(16); textStyle(BOLD);
  text("Press SPACE or ENTER to Start", 200, 360);
  textStyle(NORMAL);

  if (keyWentDown("space") || keyWentDown("enter")) {
    gameState = "play";
    resetBall();
  }
}

function drawTitleScreen() {
  background("#1e272e"); pulseCounter++;
  var pulseScale = 1 + Math.sin(pulseCounter / 15) * 0.05;
  drawBigBasketball(200, 140, pulseScale);

  var p1 = { body: playerBody, head: playerHead, larm: playerLarm, rarm: playerRarm, el: p1EyeL, er: p1EyeR };
  var p2 = { body: oppBody, head: oppHead, larm: oppLarm, rarm: oppRarm, el: p2EyeL, er: p2EyeR };
  var drawP = function(p) {
    p.body.visible = true; drawSprite(p.body); p.body.visible = false;
    p.head.visible = true; drawSprite(p.head); p.head.visible = false;
    p.larm.visible = true; drawSprite(p.larm); p.larm.visible = false;
    p.rarm.visible = true; drawSprite(p.rarm); p.rarm.visible = false;
    p.el.visible = true; drawSprite(p.el); p.el.visible = false;
    p.er.visible = true; drawSprite(p.er); p.er.visible = false;
  };
  drawP(p1); drawP(p2);

  textAlign(CENTER); fill("rgba(255,255,255,0.4)"); noStroke();
  textSize(45); text("x" + toSuperscript(3), 80, 100); text("y" + toSuperscript(7), 330, 80);
  textSize(30); text("a" + toSuperscript(2), 60, 190); text("b" + toSuperscript(5), 340, 210);
  stroke("#e67e22"); strokeWeight(3); fill("black"); textSize(48); textStyle(BOLD);
  text("EXPONENT", 200, 100); stroke("#e74c3c"); fill("#f1c40f");
  text("HOOPS", 200, 145); textStyle(NORMAL); noStroke();
  fill("white"); textSize(18); text("Solve Exponents. Sink Shots.", 200, 190);

  var mx = World.mouseX; var my = World.mouseY;
  var hover1P = (mx > 20 && mx < 190 && my > 300 && my < 350);
  fill(hover1P ? "#f1c40f" : "#1d428a"); stroke("white"); strokeWeight(2); rect(20, 300, 170, 50, 10);
  fill("white"); noStroke(); textSize(18); textStyle(BOLD); text("SOLO MODE", 105, 331);
  var hover2P = (mx > 210 && mx < 380 && my > 300 && my < 350);
  fill(hover2P ? "#f1c40f" : "#ce1141"); stroke("white"); strokeWeight(2); rect(210, 300, 170, 50, 10);
  fill("white"); noStroke(); textSize(18); text("VERSUS MODE", 295, 331); textStyle(NORMAL);

  if (mouseWentDown("leftButton")) {
    if (hover1P) { gameMode = "1P"; scoreBlue = 0; gameState = "play"; resetBall(); }
    if (hover2P) { gameMode = "2P"; scoreBlue = 0; scoreRed = 0; possession = 1; gameState = "instructions_2p"; resetBall(); }
  }
}
