function playGame(isFrozen) {
  if (isFrozen === undefined) isFrozen = false;
  var dir = 1;
  var currentSpeedMult = 1, enemySpeedMult = 1;

  if (zoomFrames > 0) {
    var ratio = zoomFrames / maxZoomFrames; currentSpeedMult = 1 + (1.5 * ratio); enemySpeedMult = 1 - (0.8 * ratio);
  }

  var activeSpeed = speed;
  if (startSequencePhase === 1) activeSpeed = 0; else if (startSequencePhase === 2) activeSpeed = currentStartSpeed;
  var handling = 0.3;

  var milestone = Math.floor(score / 50) * 50;
  var maxMilestone = (gameMode === "easy") ? 150 : 100;

  if (milestone > currentScoreMilestone && milestone <= maxMilestone) {
    currentScoreMilestone = milestone; oldBiome = newBiome; biomeTransitionY = -20;

    if (gameMode === "easy") {
        if (milestone === 50) newBiome = "desert";
        else if (milestone === 100) newBiome = "snow";
        else if (milestone === 150) newBiome = "forest";
    } else {
        if (milestone === 50) newBiome = "beach";
        else if (milestone === 100) newBiome = "rain";
    }
  }


  if (!isFrozen) {
    frameCounter++;

    if (startSequencePhase === 1) {
        if (startTimer === 120 || startTimer === 80 || startTimer === 40) playSound("sound://category_digital/bounce_1.mp3");
        startTimer--;
        if (startTimer <= 0) { startSequencePhase = 2; playSound("sound://category_male_voiceover/go_male.mp3"); playSound("sound://category_background/f1_race.mp3"); }
    } else if (startSequencePhase === 2) {
        var targetSpeed = currentQuestionSpeed(); currentStartSpeed += 0.05;
        if (currentStartSpeed > targetSpeed) currentStartSpeed = targetSpeed;
        startLineY += (currentStartSpeed * 5 * currentSpeedMult * dir);
        if (startLineY > 450) { startSequencePhase = 0; resetQuestion(); }
    }

    activeSpeed = speed;
    if (startSequencePhase === 1) activeSpeed = 0; else if (startSequencePhase === 2) activeSpeed = currentStartSpeed;

    if (frameCounter % 400 === 0 && startSequencePhase === 0) {
       if (randomNumber(1, 4) === 1) roadDecorations.push({type: "tire", x: lanes[randomNumber(0, 2)], y: -50});
    }

    if (frameCounter % 200 === 0 && score < 50 && startSequencePhase === 0) spawnSignNext = true;

    if (biomeTransitionY < 500) { biomeTransitionY += (activeSpeed * 5 * currentSpeedMult * dir); }

    if (gameMode === "hard" && equipped.world === "default") {
        if (score >= 90) stormPhase = Math.min(1.0, stormPhase + 0.005);
        if (score >= 150) dayPhase = Math.max(0, dayPhase - 0.005);
    }

    // (Maximum Velocity and its skills are now unlocked only by FINISHING Street Racing - see the win check below - not by reaching a score.)

    roadOffset += (activeSpeed * 5 * currentSpeedMult * dir);
    if (roadOffset > 60) roadOffset -= 60; if (roadOffset < -60) roadOffset += 60;

    if (startSequencePhase === 0) {
        fuel -= (equipped.boost === "fuelsaver" ? 0 : 0.04);
        if (moveCooldown > 0) moveCooldown--;

        if ((keyWentDown("left") || keyWentDown("a")) && targetCarX > 128) { targetCarX -= 72; moveCooldown = 8; }
        else if ((keyDown("left") || keyDown("a")) && targetCarX > 128 && moveCooldown === 0) { targetCarX -= 72; moveCooldown = 2; }
        if ((keyWentDown("right") || keyWentDown("d")) && targetCarX < 272) { targetCarX += 72; moveCooldown = 8; }
        else if ((keyDown("right") || keyDown("d")) && targetCarX < 272 && moveCooldown === 0) { targetCarX += 72; moveCooldown = 2; }
        if ((keyWentDown("up") || keyWentDown("w")) && targetCarY > 50) { targetCarY -= 24; moveCooldown = 8; }
        else if ((keyDown("up") || keyDown("w")) && targetCarY > 50 && moveCooldown === 0) { targetCarY -= 24; moveCooldown = 2; }
        if ((keyWentDown("down") || keyWentDown("s")) && targetCarY < 350) { targetCarY += 24; moveCooldown = 8; }
        else if ((keyDown("down") || keyDown("s")) && targetCarY < 350 && moveCooldown === 0) { targetCarY += 24; moveCooldown = 2; }

        // Belt-and-suspenders: targetCarX should only ever be one of the 3
        // lane x-positions, but anything that sets it directly instead of
        // stepping it by +/-72 (e.g. a Second Chance rewind restoring a
        // mid-lane-change position) could otherwise leave it off-grid,
        // letting the next left/right press walk the car past the outer
        // lane and onto the grass. Re-snapping every frame makes that
        // impossible regardless of how targetCarX got set.
        targetCarX = nearestLane(targetCarX);

        var pEnv = (player.y < biomeTransitionY) ? newBiome : oldBiome;
        var isStorming = (pEnv === "rain" || dayPhase < 1.0) && equipped.world === "default";
        var targetPWater = (isStorming && gameMode === "hard") ? 1.0 : 0.0;
        var targetPSand = (pEnv === "beach" && gameMode === "hard") ? 1.0 : 0.0;
        playerWater += (targetPWater - playerWater) * 0.005; playerSand += (targetPSand - playerSand) * 0.005;

        if (gameMode === "hard" && isStorming && randomNumber(1, 350) === 1) {
            lightningFrames = 15; lightningPath = { main: [], branches: [] };
            var lx = randomNumber(20, 380); var ly = -20; lightningPath.main.push({x: lx, y: ly});
            for (var l = 0; l < 12; l++) {
                lx += randomNumber(-40, 40); ly += randomNumber(20, 45); lightningPath.main.push({x: lx, y: ly});
                if (randomNumber(1, 3) === 1) {
                    var bx = lx; var by = ly; var branch = []; branch.push({x: bx, y: by});
                    for (var b = 0; b < 3; b++) { bx += randomNumber(-30, 30); by += randomNumber(10, 25); branch.push({x: bx, y: by}); }
                    lightningPath.branches.push(branch);
                }
            }
        }
    }

    player.x += (targetCarX - player.x) * handling; player.y += (targetCarY - player.y) * handling;

    if (fuel <= 0 && startSequencePhase === 0) { fuel = 0; if (gameOverReason === "") { gameOverReason = tl("Ran out of gas!", "¡Te quedaste sin gasolina!"); playSound("sound://category_alerts/vibrant_game_life_lost_1.mp3"); } gameState = "over"; if (gameMode === "hard" && score > hardHighScore) hardHighScore = score; saveExponentProgress(); return; }

    if (frameCounter % 200 === 0 && !coinActive && startSequencePhase === 0) {
      coinActive = true;
      if (randomNumber(0, 1) === 0) { coinSprite.x = -10; coinSprite.velocityX = 3.5; } else { coinSprite.x = 410; coinSprite.velocityX = -3.5; }
      coinSprite.y = randomNumber(100, 320);
    }
    if (coinActive && (coinSprite.x > 450 || coinSprite.x < -30)) coinActive = false;

    if (zoomFrames === 0) fuelY += (activeSpeed * currentSpeedMult * dir);

    if (fuelY > 450 && zoomFrames === 0) {
      fuelY = -350;
    }

    var pLeft = player.x - 13, pRight = player.x + 13, pTop = player.y - 2, pBottom = player.y + 43;

    if (damageFrames === 0 && startSequencePhase === 0) {
      var hitObstacle = false, hitObsRef = null;
      for (var b = 0; b < obstacles.length; b++) {
        var o = obstacles.get(b); var oLeft, oRight, oTop, oBottom;

        // Calculate offset dynamically if we are on a curvy road in non-default worlds
        if (o.obsType === "car") { oLeft = o.x - 13; oRight = o.x + 13; oTop = o.y - 2; oBottom = o.y + 45; }
        else { oLeft = o.x - 14; oRight = o.x + 14; oTop = o.y - 7; oBottom = o.y + 56; }

        if (pLeft < oRight && pRight > oLeft && pTop < oBottom && pBottom > oTop) { hitObstacle = true; hitObsRef = o; break; }
      }

      if (hitObstacle) {
        playSound("sound://category_hits/retro_game_simple_impact_1.mp3");
        if (activeShield) {
            activeShield = false; damageFrames = 60; hitObsRef.destroy();
        } else if (equipped.boost === "secondchance" && !usedSecondChance) {
            usedSecondChance = true; damageFrames = 60; shakeFrames = 60; hitObsRef.destroy();
            triggerSecondChanceRewind();
        } else {
            strikes++;
            if (strikes >= 3) { gameOverReason = tl("3 Strikes!", "¡3 errores!"); gameState = "over"; if (gameMode === "hard" && score > hardHighScore) hardHighScore = score; saveExponentProgress(); return; }
            else { damageFrames = 60; shakeFrames = 60; }
        }
      }
    }

    if (coinActive && startSequencePhase === 0) {
      var coinRad = (equipped.boost === "magnet") ? 45 : 10;
      var cLeft = coinSprite.x - coinRad, cRight = coinSprite.x + coinRad, cTop = coinSprite.y - coinRad, cBottom = coinSprite.y + coinRad;
      if (pLeft < cRight && pRight > cLeft && pTop < cBottom && pBottom > cTop) {
         var collectReady = true;
         if (equipped.boost === "magnet") {
             coinSprite.x += (player.x - coinSprite.x) * 0.22; coinSprite.y += (player.y - coinSprite.y) * 0.22;
             if (Math.abs(coinSprite.x - player.x) > 15) collectReady = false;
         }


         if (collectReady) {
             fuel = Math.min(fuel + 12, maxFuel);
             var cBiome = (coinSprite.y < biomeTransitionY) ? newBiome : oldBiome;
             var cValue = 10; var rgbColor = "255, 255, 0";
             if (gameMode === "hard" && equipped.world === "default") {
                 if (cBiome === "rain" || dayPhase < 1.0) { cValue = 50; rgbColor = "255, 68, 68"; } else { cValue = 20; rgbColor = "218, 112, 214"; }
             }
             var coinsGained = (equipped.boost === "doublecoins") ? cValue * 2 : cValue;
             score += (cValue / 10); totalCoins = Math.min(999999, totalCoins + coinsGained); // cap at $9999.99
             saveSoon(); // saved a moment later rather than in the middle of the collect frame (a hitch on phones); leaving the page still saves at once
             coinPopupValue = "+$" + (coinsGained / 100).toFixed(2); coinPopupColor = rgbColor; coinPopupTimer = 60;
             coinActive = false; coinSprite.x = -100; coinSprite.velocityX = 0;
             playSound("sound://category_achievements/lighthearted_bonus_objective_1.mp3");
         }
      }
    }

    if (fuelY > player.y - 40 && fuelY < player.y + 45 && zoomFrames === 0 && startSequencePhase === 0) {
      var pLane = -1;
      for (var l = 0; l < lanes.length; l++) {
          if (Math.abs(player.x - lanes[l]) < 30) pLane = l;
      }


      if (pLane !== -1) {
       if (window.SiteResults) SiteResults.record(RACER_SKILL_IDS[qSkillIdx], fuelOptions[pLane] === answer);
       if (fuelOptions[pLane] === answer) { score += 10; fuel = Math.min(fuel + 25, maxFuel); correctAnswersCount++;
          if (score >= 200 && gameMode === "easy") {
            // Completing Street Racing is what unlocks Maximum Velocity, plus the Maximum Velocity version of every skill played in this run.
            hasUnlockedHardMode = true;
            for (var uh = 0; uh < 6; uh++) { if (skillStates[uh]) unlockedHardSkills[uh] = true; }
            gameState = "winSequence"; finishLineY = -100; winCarAccel = 0; engineSoundPlayed = false; speed = 2;
            saveExponentProgress();
            playSound("sound://category_background/f1_race.mp3");
            for (var i = 0; i < obstacles.length; i++) obstacles.get(i).y = 1000;
            fuelY = -1000;
          } else {
            if (gameMode === "hard") {
              if (questionTimeLimit <= 2) questionTimeLimit *= 0.99;
              else if (questionTimeLimit <= 3.5) { questionTimeLimit *= 0.97; if (questionTimeLimit < 2) questionTimeLimit = 2; }
              else { questionTimeLimit *= 0.85; if (questionTimeLimit < 3.5) questionTimeLimit = 3.5; }
            } else { questionTimeLimit = Math.max(5, questionTimeLimit * 0.85); }
            playSound("sound://category_collect/energy_bar_recharge_4.mp3");
            speed = currentQuestionSpeed(); resetQuestion();
          }
        } else {
          lastPickedAnswer = fuelOptions[pLane];
          var cleanQ = expressionString.replace(/\n/g, " "); var cleanA = String(answer).replace(/\n—\n/g, "/").replace(/\n/g, " "); var cleanP = String(fuelOptions[pLane]).replace(/\n—\n/g, "/").replace(/\n/g, " ");
          wrongAnswersList.push({ q: cleanQ, a: cleanA, picked: cleanP });
          playSound("sound://category_hits/retro_game_simple_impact_1.mp3");
          if (equipped.boost === "secondchance" && !usedSecondChance) {
            usedSecondChance = true; shakeFrames = 30;
            triggerSecondChanceRewind();
          } else {
            strikes++;
            if (strikes >= 3) gameOverReason = tl("3 Strikes! I'm sure your brain is exhaust-ed.", "¡3 errores! Seguro que tu cerebro necesita gasolina.");
            shakeFrames = 30; gameState = "paused"; pauseTimer = 150;
            coinActive = false; coinSprite.x = -100; coinSprite.velocityX = 0;
          }
        }
      }
    }
  } // End if (!isFrozen) logic loop

  // --- RENDERING LAYER 1: Deep Parallax Background ---
  background("rgb(" + Math.round(newBgColor[0]) + ", " + Math.round(newBgColor[1]) + ", " + Math.round(newBgColor[2]) + ")");

  drawDeepScene(newBiome, 0, Math.max(0, Math.min(450, biomeTransitionY)));
  drawDeepScene(oldBiome, Math.max(0, Math.min(450, biomeTransitionY)), 450);

  if (biomeTransitionY > 0 && biomeTransitionY < 450) { fill("rgba(0, 0, 0, 0.3)"); rect(0, biomeTransitionY - 2, 400, 4); }

  if (equipped.world === "default") {
      if (newBiome === "beach") drawTides(0, biomeTransitionY < 450 ? Math.max(0, biomeTransitionY) : 450);
      if (biomeTransitionY < 450) { if (oldBiome === "beach") drawTides(Math.max(0, biomeTransitionY), 450); }
  }

  push(); // MAIN CAMERA SHAKE PUSH
  if (shakeFrames > 0) {
      translate(randomNumber(-6, 6), randomNumber(-6, 6));
      shakeFrames--;
  }
  if (damageFrames > 0) {
      damageFrames--;
  }


  // --- OPTIMIZATION: Pre-calculate alpha color strings once per frame to prevent Garbage Collection lag ---
  var globalBlinkState = (Math.floor(frameCounter / 10) % 2 === 0);
  var cityWinAlpha = dayPhase < 1.0 ? 0.9 : 0.4;
  var cityYellowWin = "rgba(241, 196, 15, " + cityWinAlpha + ")";
  var cityBlueWin = "rgba(135, 206, 235, " + cityWinAlpha + ")";
  var generalShadowColor = "rgba(0, 0, 0, " + (dayPhase * 0.3).toFixed(2) + ")";
  var beachShadowColor = "rgba(0, 0, 0, " + (dayPhase * 0.25).toFixed(2) + ")";
  var signAlphaVal = dayPhase < 1.0 && equipped.world === "default" ? Math.max(0.4, dayPhase + 0.2) : 1;
  var signPostColor = "rgba(139, 69, 19, " + signAlphaVal + ")";
  var signBoardColor = "rgba(240, 230, 200, " + signAlphaVal + ")";
  var signStrokeColor = "rgba(100, 50, 10, " + signAlphaVal + ")";
  var signTextColor = "rgba(0, 0, 0, " + signAlphaVal + ")";

  // --- RENDERING LAYER 2: Peripheral Scenery (sideTrees) ---
  for (var t = 0; t < sideTrees.length; t++) {
    var tree = sideTrees[t];
    if (!isFrozen) tree.y += (activeSpeed * 5 * currentSpeedMult * dir);
    if (tree.y > 650) {
      if (!isFrozen) {
        var respawnY = 1000;
        for (var st = 0; st < sideTrees.length; st++) {
            if ((tree.x < 200 && sideTrees[st].x < 200) || (tree.x > 200 && sideTrees[st].x > 200)) {
                if (sideTrees[st].y < respawnY) respawnY = sideTrees[st].y;
            }
        }
        tree.y = respawnY - randomNumber(100,250);
        tree.x = tree.x < 200 ? randomNumber(-10, 75) : randomNumber(325, 410);
        tree.s = randomNumber(12, 22); tree.type = randomNumber(0,4); tree.seed = randomNumber(0,1000); tree.isSign = false;

        // ONLY spawn signs if NOT in Maximum Velocity (hard) mode
        if (spawnSignNext && score < 50 && startSequencePhase === 0 && gameMode !== "hard") {
            tree.isSign = true; tree.x = tree.x < 200 ? 45 : 355;
            var nextMsg = ""; do { nextMsg = signMessages[randomNumber(0, signMessages.length - 1)]; } while (nextMsg === lastSignMessage);
            tree.signText = nextMsg; lastSignMessage = nextMsg; spawnSignNext = false;
        }

      }
    }

    // --- NEW FRUSTUM CULLING OPTIMIZATION ---
    // If the asset is completely off-screen above or below the viewport, skip rendering it!
    // City buildings are drawn well above their anchor point (up to bH=198px,
    // since bH = tree.s * 9 and tree.s can be up to 22) - a plain "> 470" cutoff
    // (canvas is 400 tall) would cull a tall building's top while it's still
    // clearly on-screen, so the exit threshold has to clear that worst case.
    if (tree.y < -250 || tree.y > 610) {
        continue;
    }

    var treeBiome = (tree.y < biomeTransitionY) ? newBiome : oldBiome;

    // Smooth road bending coordinate helper
    var treeXCurve = 0;
    if (equipped.world !== "default") {
        treeXCurve = Math.sin(tree.y * 0.015 + frameCounter * 0.05) * 45;
    }
    var finalTreeX = tree.x + treeXCurve;

    if (tree.isSign) {
        fill(signPostColor); noStroke(); rect(finalTreeX - 3, tree.y, 6, 40);
        fill(signBoardColor); stroke(signStrokeColor); strokeWeight(2);
        rect(finalTreeX - 35, tree.y - 30, 70, 40); noStroke(); fill(signTextColor); textAlign(CENTER, CENTER);
        if (tree.signText === tl("BRILLIANT", "BRILLANTE") || tree.signText === tl("YOU'RE\nAWESOME", "¡ERES\nGENIAL!") || tree.signText === tl("AMAZING", "¡INCREÍBLE!") || tree.signText === "Mr. H\n= GOAT!" || tree.signText === tl("EXPONENT\nEXPERT!", "¡GENIO DE\nEXPONENTES!")) textSize(11);
        else if (tree.signText === tl("YOU GOT\nTHIS!", "¡TÚ\nPUEDES!") || tree.signText === tl("YOU LOVE\nMATH!", "¡AMAS LAS\nMATES!")) textSize(12); else textSize(14);
        textLeading(15); textStyle(BOLD);
        var signLines = tree.signText.split('\n');
        for (var i = 0; i < signLines.length; i++) {
           var totalHeight = (signLines.length - 1) * 15; var baseY = (tree.y - 10) - (totalHeight / 2); text(signLines[i], finalTreeX, baseY + (i * 15));
        }
        textStyle(NORMAL);
    } else {
        if (dayPhase > 0 && treeBiome !== "beach") {
          fill(generalShadowColor); noStroke();
          ellipse(finalTreeX + 4 + ((1 - dayPhase) * 30), tree.y + tree.s * 1.5, tree.s * 2 + ((1 - dayPhase) * 15), tree.s * 1.2);
        }

        if (treeBiome === "city") {
          var isLeft = tree.x < 200; var bW = tree.s * 4; var bH = tree.s * 9;
          fill("#2c3e50"); noStroke(); rect(finalTreeX - bW/2, tree.y - bH, bW, bH + 20);
          fill("#1a252f"); rect(finalTreeX - bW/2 + (isLeft ? bW*0.6 : 0), tree.y - bH, bW*0.4, bH + 20);
          fill("#34495e"); rect(finalTreeX - bW/2 + 5, tree.y - bH - 10, bW - 10, 10);
          stroke("#7f8c8d"); strokeWeight(2); line(finalTreeX, tree.y - bH - 10, finalTreeX, tree.y - bH - 25); noStroke();

          // --- OPTIMIZED: Uses pre-cached window colors instead of real-time strings ---
          fill((Math.floor(tree.s) % 2 === 0) ? cityYellowWin : cityBlueWin);
          rect(finalTreeX - bW/2 + 8, tree.y - bH + 20, 8, bH - 30);
          if (Math.floor(tree.s) % 2 !== 0) rect(finalTreeX + bW/2 - 16, tree.y - bH + 20, 8, bH - 30);
          fill("#2c3e50"); for (var wy = tree.y - bH + 30; wy < tree.y + 10; wy += bH/4) { rect(finalTreeX - bW/2, wy, bW, 6); }
        }
 else if (treeBiome === "beach") {
          if (dayPhase > 0) { fill(beachShadowColor); noStroke(); ellipse(finalTreeX + 4, tree.y + tree.s * 0.5, tree.s * 2.5, tree.s * 1.5); }
          if (Math.floor(tree.x) % 2 === 0) {
            stroke("#8B4513"); strokeWeight(3); line(finalTreeX, tree.y, finalTreeX + 5, tree.y - tree.s * 1.5); noStroke();
            fill("#e74c3c"); arc(finalTreeX + 5, tree.y - tree.s * 1.5, tree.s * 3, tree.s * 1.5, 180, 360); fill("white"); arc(finalTreeX + 5, tree.y - tree.s * 1.5, tree.s * 1.5, tree.s * 1.5, 180, 360);
          } else {
            noStroke(); fill("#e74c3c"); arc(finalTreeX, tree.y, tree.s * 1.2, tree.s * 1.2, 0, 120); fill("#3498db"); arc(finalTreeX, tree.y, tree.s * 1.2, tree.s * 1.2, 120, 240); fill("#f1c40f"); arc(finalTreeX, tree.y, tree.s * 1.2, tree.s * 1.2, 240, 360); fill("white"); ellipse(finalTreeX, tree.y, tree.s * 0.4, tree.s * 0.4);
          }
        } else if (treeBiome === "forest") {
          fill("saddlebrown"); noStroke(); rect(finalTreeX - 4, tree.y, 8, tree.s * 1.5); fill("forestgreen"); ellipse(finalTreeX - 7, tree.y, tree.s * 1.8, tree.s * 1.8); ellipse(finalTreeX + 7, tree.y, tree.s * 1.8, tree.s * 1.8); fill("darkgreen"); ellipse(finalTreeX, tree.y - tree.s * 0.6, tree.s * 2.2, tree.s * 2.2); fill("mediumseagreen"); ellipse(finalTreeX, tree.y - tree.s * 0.2, tree.s * 1.4, tree.s * 1.4);
        } else if (treeBiome === "desert") {
          fill("#2ecc71"); noStroke(); rect(finalTreeX - 6, tree.y - tree.s, 12, tree.s * 3 + 10); rect(finalTreeX - 14, tree.y, 8, 8); rect(finalTreeX - 14, tree.y - 10, 8, 12); rect(finalTreeX + 6, tree.y + 10, 8, 8); rect(finalTreeX + 6, tree.y, 8, 12); fill("darkgreen"); ellipse(finalTreeX - 2, tree.y + 5, 2, 2); ellipse(finalTreeX + 2, tree.y - 5, 2, 2);
        } else if (treeBiome === "snow" || treeBiome === "ice") {
          fill("saddlebrown"); noStroke(); rect(finalTreeX - 4, tree.y + tree.s, 8, tree.s); fill("white"); stroke("lightgray"); strokeWeight(1);
          triangle(finalTreeX - tree.s * 1.5, tree.y + tree.s * 1.5, finalTreeX + tree.s * 1.5, tree.y + tree.s * 1.5, finalTreeX, tree.y - tree.s);
          triangle(finalTreeX - tree.s * 1.2, tree.y + tree.s * 0.5, finalTreeX + tree.s * 1.2, tree.y + tree.s * 0.5, finalTreeX, tree.y - tree.s * 1.5);
          triangle(finalTreeX - tree.s, tree.y - tree.s * 0.5, finalTreeX + tree.s, tree.y - tree.s * 0.5, finalTreeX, tree.y - tree.s * 2); noStroke();
        }
    }
  }

  // --- RENDERING LAYER 3: The Road ---
  fill("gray");
  noStroke();
  rect(92, 0, 216, 450);

  if (gameMode === "hard") {
    for (var p = 0; p < roadPatches.length; p++) {
      var rp = roadPatches[p];
      if (!isFrozen) rp.y += (activeSpeed * 5 * currentSpeedMult * dir);
      if (rp.y > 500) {
          if (!isFrozen) { rp.y = -60; rp.x = randomNumber(110, 290); rp.s = randomNumber(40, 90); }
      }

      var pBiome = (rp.y < biomeTransitionY) ? newBiome : oldBiome;

      if (pBiome === "rain" || dayPhase < 1.0) {
          fill("rgba(40, 50, 60, 0.6)"); noStroke(); ellipse(rp.x, rp.y, rp.s, rp.s * 0.25);
          fill("rgba(100, 130, 160, 0.4)"); ellipse(rp.x, rp.y, rp.s * 0.8, rp.s * 0.15);
          fill("rgba(255, 255, 255, 0.3)"); ellipse(rp.x + rp.s * 0.2, rp.y - rp.s * 0.05, rp.s * 0.3, rp.s * 0.05);
      } else if (pBiome === "beach") {
          fill("rgba(210, 180, 140, 0.4)"); noStroke(); ellipse(rp.x, rp.y, rp.s, rp.s * 0.8);
          fill("rgba(194, 178, 128, 0.5)"); ellipse(rp.x + 10, rp.y + 10, rp.s * 0.6, rp.s * 0.5);
      }
    }
  }


  for (var r = roadDecorations.length - 1; r >= 0; r--) {
    var rd = roadDecorations[r];
    if (!isFrozen) rd.y += (activeSpeed * 5 * currentSpeedMult * dir);
    if (rd.y > 500) { roadDecorations.splice(r, 1); continue; }

    var finalDecX = rd.x;

    if (rd.type === "tire") {
        fill("rgba(0,0,0,0.3)"); noStroke(); rect(finalDecX - 12, rd.y, 5, 60); rect(finalDecX + 7, rd.y, 5, 60);
    } else if (rd.type === "scorch") {
        fill("rgba(30, 30, 30, " + rd.alpha + ")"); noStroke(); ellipse(finalDecX, rd.y, rd.s, rd.s * 1.5);
        if (!isFrozen) rd.alpha -= 0.01;
        if (rd.alpha <= 0) roadDecorations.splice(r, 1);
    }
  }

  var lineColor1 = (equipped.world === "space") ? "#ff00ff" : "white"; var lineColor2 = (equipped.world === "space") ? "#00ffff" : "yellow";

  // Lanes and center dashes
  for (var rLane = -60; rLane <= 450; rLane += 30) {
    var curveY1 = rLane + roadOffset;
    fill(Math.abs(rLane / 30) % 2 === 0 ? "red" : "white"); rect(86, curveY1, 6, 30); rect(308, curveY1, 6, 30);
  }
  fill("yellow");
  for (var dLine = -60; dLine <= 450; dLine += 60) {
    var curveY2 = dLine + roadOffset;
    rect(162, curveY2, 4, 30); rect(234, curveY2, 4, 30);
  }

  // --- RENDERING LAYER 4: Game Elements ---

if (startSequencePhase > 0) {
    fill("white"); noStroke(); rect(80, startLineY, 240, 40); fill("black");
    for (var x = 80; x < 320; x += 20) { rect(x, startLineY, 10, 10); rect(x + 10, startLineY + 10, 10, 10); rect(x, startLineY + 20, 10, 10); rect(x + 10, startLineY + 30, 10, 10); }
  }


  if (gameState === "winSequence" || gameState === "winScreen") {
    fill("white"); noStroke(); rect(80, finishLineY, 240, 40); fill("black");
    for (var x = 80; x < 320; x += 20) { rect(x, finishLineY, 10, 10); rect(x + 10, finishLineY + 10, 10, 10); rect(x, finishLineY + 20, 10, 10); rect(x + 10, finishLineY + 30, 10, 10); }
    fill("yellow"); stroke("black"); strokeWeight(3); textSize(30); textAlign(CENTER, CENTER); textStyle(BOLD); text(tl("FINISH", "META"), 200, finishLineY + 20); textStyle(NORMAL); noStroke();
  }


  var bgDarkness = 0;
  if (gameMode === "hard" && equipped.world === "default") {
      if (stormPhase > 0) bgDarkness += stormPhase * 0.45;
      if (dayPhase < 1.0) bgDarkness += (1 - dayPhase) * 0.45;
  } else if (equipped.world === "default") {
      if (dayPhase < 1.0) bgDarkness += (1 - dayPhase) * 0.85;
  }
  if (bgDarkness > 0.90) bgDarkness = 0.90;

  if (bgDarkness > 0) { fill("rgba(15, 20, 30, " + bgDarkness.toFixed(2) + ")"); noStroke(); rect(0, 0, 400, 450); }

  if (dayPhase < 1.0 && equipped.world === "default") {
    for (var l = 0; l < lightPoles.length; l++) {
      if (!isFrozen) lightPoles[l] += (activeSpeed * 5 * currentSpeedMult * dir);
      if (lightPoles[l] > 500) { if (!isFrozen) lightPoles[l] -= 600; }

      var sy = lightPoles[l]; var glowAlpha = (1 - dayPhase);
      fill("darkgray"); rect(65, sy, 5, 40); fill("gray"); rect(70, sy, 20, 5);
      fill("rgba(255, 255, 200, " + (glowAlpha * 0.9).toFixed(2) + ")"); ellipse(85, sy + 2, 10, 10);
      fill("rgba(255, 255, 150, " + (glowAlpha * 0.4).toFixed(2) + ")"); ellipse(85, sy + 25, 80, 80);
      fill("darkgray"); rect(330, sy, 5, 40); fill("gray"); rect(310, sy, 20, 5);
      fill("rgba(255, 255, 200, " + (glowAlpha * 0.9).toFixed(2) + ")"); ellipse(315, sy + 2, 10, 10);
      fill("rgba(255, 255, 150, " + (glowAlpha * 0.4).toFixed(2) + ")"); ellipse(315, sy + 25, 80, 80);
    }

    noStroke(); var nightAlpha = 1 - dayPhase;
    for (var f = 1; f <= 5; f++) {
      var dist = f * 60 * dir; var spread = f * 20; var beamAlpha = nightAlpha * (0.25 / f);
      fill("rgba(255, 255, 220, " + beamAlpha.toFixed(3) + ")");
      quad(player.x - 12, player.y + 5, player.x + 12, player.y + 5, player.x + spread, player.y - dist, player.x - spread, player.y - dist);
    }
  }

  var globalBlinkState = (Math.floor(frameCounter / 10) % 2 === 0);

  // Cars never overlap: new question cars, cars merging in from the edge and cars changing lanes can all end up on top
  // of another one, so any two cars that touch are separated by moving the one further up the road back.
  if (!isFrozen) separateObstacles();

  for (var m = obstacles.length - 1; m >= 0; m--) {
    var obs = obstacles.get(m);
    if (!isFrozen) obs.y += (activeSpeed * enemySpeedMult * dir);

    if (!isFrozen && gameMode === "hard") {
      if (obs.x === obs.targetX && obs.signalTimer === 0 && !obs.hasSwerved) {
        if (obs.swerveCooldown > 0) obs.swerveCooldown--;
        else {
          var availLanes = [];
          if (obs.targetX === 128) availLanes = [200];
          else if (obs.targetX === 200) availLanes = [128, 272];
          else availLanes = [200];

          // --- NEW BLIND SPOT SAFETY CHECK ---
          var safeLanes = [];
          for (var L = 0; L < availLanes.length; L++) {
              var testLane = availLanes[L];
              var isLaneSafe = true;
              for (var j = 0; j < obstacles.length; j++) {
                  var otherCar = obstacles.get(j);
                  // Check if another car is already in that lane (or signaling to turn there) and is too close!
                  if (obs !== otherCar && (otherCar.targetX === testLane || otherCar.intentX === testLane) && Math.abs(otherCar.y - obs.y) < 150) {
                      isLaneSafe = false;
                      break;
                  }
              }
              if (isLaneSafe) safeLanes.push(testLane); // Keep this lane if it's empty
          }

          // Only turn on the blinker if the lane is open!
          if (safeLanes.length > 0) {
              obs.intentX = safeLanes[randomNumber(0, safeLanes.length - 1)];
              obs.signalTimer = 45;
          } else {
              obs.swerveCooldown = 30; // Wait 30 frames for the car to pass and check again
          }
          // ------------------------------------
        }
      }

      if (obs.signalTimer > 0) {
          obs.signalTimer--;
          if (obs.signalTimer === 0) {
              // --- FINAL SAFETY CHECK BEFORE TURNING THE WHEEL ---
              var isStillSafe = true;
              for (var j = 0; j < obstacles.length; j++) {
                  var otherCar = obstacles.get(j);
                  // Check if someone snuck into the lane while our blinker was on!
                  if (obs !== otherCar && (otherCar.targetX === obs.intentX || otherCar.x === obs.intentX) && Math.abs(otherCar.y - obs.y) < 150) {
                      isStillSafe = false;
                      break;
                  }
              }

              if (isStillSafe) {
                  obs.targetX = obs.intentX;
                  obs.hasSwerved = true;
                  obs.isMerging = true; // <--- THE MISSING PIECE! THIS MAKES THEM TURN!
              } else {
                  obs.intentX = obs.x; // Cancel the lane change!
                  obs.swerveCooldown = 40; // Wait and try again later
              }
              // ---------------------------------------------------
          }
      }
    }

    if (!isFrozen && obs.isMerging) {
      if (obs.x < obs.targetX) obs.x = Math.min(obs.x + 1.5, obs.targetX);
      else if (obs.x > obs.targetX) obs.x = Math.max(obs.x - 1.5, obs.targetX);
      if (obs.x === obs.targetX) { obs.isMerging = false; obs.intentX = obs.targetX; }
    }

    if (!isFrozen && obs.y > 450) { obs.destroy(); continue; }
    if (!isFrozen && (obs.y > fuelY - 180 && obs.y < fuelY + 180)) { obs.destroy(); continue; }

    var sigDir = ""; var bState = false;
    if ((obs.signalTimer > 0 || obs.isMerging) && obs.intentX !== obs.x) { sigDir = (obs.intentX < obs.x) ? "left" : "right"; bState = globalBlinkState; }

    var obsEnv = (obs.y < biomeTransitionY) ? newBiome : oldBiome;
    var obsIsStorming = (obsEnv === "rain" || dayPhase < 1.0) && equipped.world === "default";
    var targetObsWater = (obsIsStorming && gameMode === "hard") ? 1.0 : 0.0;
    var targetObsSand = (obsEnv === "beach" && gameMode === "hard") ? 1.0 : 0.0;
    if (!isFrozen && startSequencePhase === 0) { obs.water += (targetObsWater - (obs.water || 0)) * 0.01; obs.sand += (targetObsSand - (obs.sand || 0)) * 0.01; }

    push(); translate(obs.x, obs.y);
    drawVehicle(0, 0, obs.obsType, obs.carColor, false, sigDir, bState, obs.water, obs.sand);
    pop();
  }


  if (!isFrozen && zoomFrames === 0 && startSequencePhase === 0) {
    var targetObstacleCount = (gameMode === "hard") ? Math.min(Math.floor(score / 30) + 2, 4) : 2;
    if (obstacles.length < targetObstacleCount) {
      var startY = -50;
      for (var p = 0; p < obstacles.length; p++) {
        if (obstacles.get(p).y < startY) startY = obstacles.get(p).y;
      }
      var willMerge = (gameMode === "hard" && score >= 50 && randomNumber(1, 3) === 1);
      var spawnY = startY - randomNumber(120, 220);

      if (spawnY > fuelY - 250 && spawnY < fuelY + 250) { spawnY = fuelY - (250 + randomNumber(20, 80)); }

      var pickLane = lanes[randomNumber(0, 2)];
      var isSafe = false;
      var escapes = 0;

      while (!isSafe && escapes < 20) {
          isSafe = true;
          for (var i = 0; i < obstacles.length; i++) {
              var otherCar = obstacles.get(i);
              // Check the lane the car is IN OR HEADING TOWARD (targetX/intentX),
              // not just its current x - a merging car's x sits off at the road
              // edge (40 or 360) the whole time it's merging, so checking raw x
              // alone misses cars already committed to arriving in this lane.
              if ((otherCar.x === pickLane || otherCar.targetX === pickLane || otherCar.intentX === pickLane) && Math.abs(otherCar.y - spawnY) < 150) {
                  isSafe = false;
                  spawnY -= 150;
                  break;
              }
          }
          escapes++;
      }

      // Use the safe lane and safe Y position
      spawnObstacle(pickLane, spawnY, willMerge);
      separateObstacles();   // the new car never starts on top of another


    }
  }

  for (var h = 0; h < 3; h++) {
    var targetX = lanes[h];


    if (dayPhase > 0 && equipped.world === "default") {
      fill("rgba(0, 0, 0, " + (dayPhase * 0.4).toFixed(2) + ")"); noStroke();
      ellipse(targetX + 3 + ((1 - dayPhase) * 40), fuelY + 4, 70 + ((1 - dayPhase) * 20), 70);
    }
    fill("orange"); stroke("black"); strokeWeight(1); ellipse(targetX, fuelY, 70, 70);
    fill("black"); noStroke(); textAlign(CENTER, CENTER);

    var optStr = String(fuelOptions[h]); var isFraction = optStr.indexOf("—") !== -1; var isVocab = optStr.indexOf("[B]") === 0 || optStr.indexOf("[E]") === 0 || optStr.indexOf("[P]") === 0; var circleType = "";
    if (isVocab) { circleType = optStr.substring(1, 2); optStr = optStr.substring(3); }

    if (isFraction) {
      var fParts = optStr.split("\n—\n"); textSize(19); drawSupText(fParts[0], targetX, fuelY - 14);
      stroke("black"); strokeWeight(2); line(targetX - 10, fuelY - 2, targetX + 10, fuelY - 2);
      noStroke(); drawSupText(fParts[1], targetX, fuelY + 17); // shifted up 4px from the +21/-10 pair to vertically center the fraction block within the 70px answer circle
    } else if (isVocab) {
      textSize(24); drawSupText(optStr, targetX, fuelY, CENTER, CENTER, circleType);
      noStroke();
    } else {
      if (optStr.length >= 7) textSize(18); else if (optStr.length >= 5) textSize(22); else textSize(28);
      drawSupText(optStr, targetX, fuelY);
    }
  }

  if (coinActive) {
    var pulse = (Math.sin(frameCounter * 0.2) + 1) / 2;
    var cBiome = (coinSprite.y < biomeTransitionY) ? newBiome : oldBiome;
    var cFill1, cFill2, cStroke, cInner, cGlow;

    if (gameMode === "easy") {
        cFill1 = "rgba(255, 215, 0, " + (0.4 * pulse).toFixed(2) + ")"; cFill2 = "rgba(255, 255, 0, " + (0.6 * pulse).toFixed(2) + ")"; cStroke = "darkgoldenrod"; cInner = "yellow"; cGlow = "gold";
    } else if ((cBiome === "rain" || dayPhase < 1.0) && equipped.world === "default") {
        cFill1 = "rgba(255, 50, 50, " + (0.4 * pulse).toFixed(2) + ")"; cFill2 = "rgba(200, 0, 0, " + (0.6 * pulse).toFixed(2) + ")"; cStroke = "darkred"; cInner = "red"; cGlow = "lightcoral";
    } else {
        cFill1 = "rgba(138, 43, 226, " + (0.4 * pulse).toFixed(2) + ")"; cFill2 = "rgba(186, 85, 211, " + (0.6 * pulse).toFixed(2) + ")"; cStroke = "indigo"; cInner = "#9932CC"; cGlow = "#DA70D6";
    }

    var finalCoinX = coinSprite.x;

    if (dayPhase > 0) {
      fill("rgba(0, 0, 0, " + (dayPhase * 0.3).toFixed(2) + ")"); noStroke(); ellipse(finalCoinX + 4 + ((1 - dayPhase) * 15), coinSprite.y + 12, 20 + ((1 - dayPhase) * 10), 10);
    }


    noStroke(); fill(cFill1); ellipse(finalCoinX, coinSprite.y, 24 + (pulse * 8), 24 + (pulse * 8)); fill(cFill2); ellipse(finalCoinX, coinSprite.y, 18 + (pulse * 4), 18 + (pulse * 4));
    stroke(cStroke); strokeWeight(1); fill(cInner); ellipse(finalCoinX, coinSprite.y, 14, 14); noStroke(); fill("white"); ellipse(finalCoinX - 2, coinSprite.y - 2, 4, 4); fill(cGlow); ellipse(finalCoinX, coinSprite.y, 8, 8);
  }

var isBlinking = (!isFrozen && damageFrames > 0 && Math.floor(frameCounter / 4) % 2 === 0);
  if (!isBlinking) {
    push();
    translate(player.x, player.y);
    drawVehicle(0, 0, "car", equipped.car, true, "", false, playerWater, playerSand);
    if (activeShield) {
        var isHero = (equipped.car === "superhero");
        var shieldY = isHero ? 12 : 21.5;
        var sW = isHero ? 70 : 52;
        var sH = isHero ? 80 : 64;
        var inW = isHero ? 64 : 46;
        var inH = isHero ? 70 : 56;
        var shieldPulse = Math.sin(frameCounter * 0.15) * 4;

        noFill();
        stroke("cyan");
        strokeWeight(3);
        ellipse(0, shieldY, sW + shieldPulse, sH + shieldPulse);

        stroke("rgba(0,255,255,0.3)");
        strokeWeight(1.5);
        ellipse(0, shieldY, inW - shieldPulse, inH - shieldPulse);

        fill("rgba(0,255,255,0.12)");
        noStroke();
        ellipse(0, shieldY, sW + shieldPulse, sH + shieldPulse);

        stroke("rgba(255,255,255,0.45)");
        strokeWeight(1);
        line(-22, shieldY, 22, shieldY);
        line(0, shieldY - 28, 0, shieldY + 28);
    }
    pop();
  }



  // Trailing Particles Logic
  if (!isFrozen) {
    var emitFreq = (equipped.trail !== "none") ? 6 : 8;
    if (frameCounter % emitFreq === 0) {
      var dy = (activeSpeed * 4 * currentSpeedMult + 2) * dir;
      var py = player.y + 41;
      var emitPoints = (equipped.car === "superhero") ? [player.x] : [player.x - 8, player.x + 8];
      for (var ep = 0; ep < emitPoints.length; ep++) {
          var px = emitPoints[ep] + randomNumber(-2, 2);
          if (equipped.trail === "fire") {
        // Shoots tight, fast streams out of dual exhaust positions behind the car
        smokeParticles.push({ type: "fire", x: player.x - 7, y: player.y + 40, size: randomNumber(7, 11), alpha: 1.0, dy: dy * 1.3, dx: randomNumber(-4, 4) / 10, seed: randomNumber(0, 1000) });
        smokeParticles.push({ type: "fire", x: player.x + 7, y: player.y + 40, size: randomNumber(7, 11), alpha: 1.0, dy: dy * 1.3, dx: randomNumber(-4, 4) / 10, seed: randomNumber(0, 1000) });
    }

          // Each of these gets its own particle type/shape (not just a
          // recolored glow circle), so the trails actually look different
          // from each other, not just tinted differently.
          // These slow their dy well below the car's actual speed (unlike
          // fire/bubbles/money, tuned closer to real speed already) - at
          // full road speed they used to fly past before their shape/motion
          // details (zigzag, flap, twinkle, etc.) had time to register.
          else if (equipped.trail === "blue") { smokeParticles.push({ type: "spark", c: "80,200,255,", x: px, y: py, size: randomNumber(2.5, 4.5), len: randomNumber(18, 55), alpha: 1.0, dy: dy * 0.5, flicker: randomNumber(0, 100) }); }
          else if (equipped.trail === "red") { smokeParticles.push({ type: "ember", x: px, y: py, size: randomNumber(9, 15), alpha: 1.0, dy: dy * 0.45, flicker: randomNumber(0, 100) }); }
          else if (equipped.trail === "pink") { smokeParticles.push({ type: "heart", x: px, y: py, size: randomNumber(13, 20), alpha: 1.0, dy: dy * 0.45, phase: randomNumber(0, 100) }); }
          else if (equipped.trail === "purple") { smokeParticles.push({ type: "twinkle", x: px, y: py, size: randomNumber(10, 16), alpha: 1.0, dy: dy * 0.45, ang: randomNumber(0, 360) }); }
          else if (equipped.trail === "gold") { smokeParticles.push({ type: "diamond", x: px, y: py, size: randomNumber(10, 16), alpha: 1.0, dy: dy * 0.45, ang: randomNumber(0, 360) }); }
          else if (equipped.trail === "ice") { smokeParticles.push({ type: "snowflake", x: px, y: py, size: randomNumber(10, 16), alpha: 1.0, dy: dy * 0.35, ang: randomNumber(0, 360) }); }
          else if (equipped.trail === "rainbow" && frameCounter % 2 === 0) {
            // Color-cycling dots, emitted often, in a mix of sizes (tiny specks up to big beads) with a little sideways drift
            // so the trail looks full and lively instead of evenly spaced.
            var rbCount = randomNumber(1, 2);
            for (var rbi = 0; rbi < rbCount; rbi++) {
              smokeParticles.push({ type: "prism", x: px + randomNumber(-4, 4), y: py + randomNumber(-6, 6), size: randomNumber(3, 15), alpha: 1.0, dy: dy * randomNumber(35, 60) / 100,
                dx: randomNumber(-8, 8) / 10, hue: (frameCounter * 6 + randomNumber(0, 120)) % 360 });
            }
          }
          else if (equipped.trail === "bubbles") { smokeParticles.push({ type: "bubbles", x: px, y: py, size: randomNumber(5, 11), alpha: 0.9, dy: dy * 0.6, phase: randomNumber(0, 100) }); }
          else if (equipped.trail === "money") {
             if (frameCounter % 6 === 0) {
                 for (var i = 0; i < 2; i++) {
                   smokeParticles.push({ type: "money", x: player.x + randomNumber(-15, 15), y: player.y + 35, size: randomNumber(9, 13), alpha: 1.0, dy: dy * randomNumber(7, 12) / 10, dx: randomNumber(-30, 30) / 10, rot: randomNumber(0, 360), rotSpeed: randomNumber(-8, 8) });
                 }
             }
          }
          else { smokeParticles.push({ type: "smoke", x: px, y: py, size: randomNumber(5, 8), alpha: 1.0, dy: dy }); }
      }
    }
  }

  // No trail during the finish-line drive / win screen (it used to freeze in place where it was when the drive began)
  if (gameState === "winSequence" || gameState === "winScreen") smokeParticles = [];
  for (var s = smokeParticles.length - 1; s >= 0; s--) {
    var p = smokeParticles[s];
    if (!isFrozen) {
        p.y += p.dy;
        if (p.type === "spark") { p.alpha -= 0.14; }
        else if (p.type === "fire") { p.size -= 0.24; p.alpha -= 0.05; p.x += Math.sin(frameCounter * 0.4 + p.y * 0.15) * 0.8 + p.dx; }
        else if (p.type === "glow") { p.size -= 0.15; p.alpha -= 0.06; }
        else if (p.type === "ember") { p.alpha -= 0.035; p.x += Math.sin(frameCounter * 0.3 + p.flicker) * 0.5; }
        else if (p.type === "heart") { p.x += Math.sin(p.phase + p.y * 0.04) * 0.8; p.alpha -= 0.035; }
        else if (p.type === "twinkle") { p.ang += 4; p.alpha -= 0.035; }
        else if (p.type === "diamond") { p.ang += 5; p.alpha -= 0.035; }
        else if (p.type === "snowflake") { p.x += Math.sin(frameCounter * 0.08 + p.ang) * 0.4; p.ang += 2; p.alpha -= 0.03; }
        else if (p.type === "prism") { p.hue = (p.hue + 4) % 360; p.alpha -= 0.035; p.x += p.dx || 0; }
        else if (p.type === "bubbles") { p.x += Math.sin(p.phase + p.y * 0.05) * 1.5; p.size += 0.05; p.alpha -= 0.04; }
        else if (p.type === "money") { p.alpha -= 0.03; p.x += p.dx; p.rot += p.rotSpeed; }
        else { p.size += 0.3; p.alpha -= 0.05; }
    }

    if (p.alpha <= 0 || p.size <= 0) {
        if (!isFrozen) smokeParticles.splice(s, 1);
    }
    else {
        if (p.type === "fire") {
            // Actual licking-flame silhouettes (narrow flickering tip trailing
            // away from the car, wide base near it) instead of plain ellipses,
            // layered glow -> body -> white-hot core like a real flame.
            drawFlameBlob(p.x, p.y, p.size * 1.7, "rgba(231, 76, 60, " + (p.alpha * 0.45) + ")", p.seed, p.size * 0.18);
            drawFlameBlob(p.x, p.y, p.size * 1.15, "rgba(255, 120, 0, " + p.alpha + ")", p.seed + 10, p.size * 0.12);
            if (p.alpha > 0.4) {
                drawFlameBlob(p.x, p.y - p.size * 0.15, p.size * 0.55, "rgba(255, 240, 150, " + (p.alpha * 0.95) + ")", p.seed + 20, p.size * 0.08);
            }
        }

        else if (p.type === "spark") {
            // A quick vertical zap shooting straight down from the back of
            // the car at a random length, not a shape rotating in place -
            // re-jittered every frame it's alive so it crackles like real
            // lightning instead of holding one static zigzag.
            var flick = 0.55 + 0.45 * Math.sin(frameCounter * 1.6 + p.flicker);
            var j1 = randomNumber(-4, 4), j2 = randomNumber(-4, 4), j3 = randomNumber(-4, 4);
            noStroke();
            fill("rgba(" + p.c + (p.alpha * 0.25 * flick) + ")");
            ellipse(p.x, p.y + p.len * 0.5, p.size * 6, p.len * 1.2);

            stroke("rgba(" + p.c + (p.alpha * flick) + ")"); strokeWeight(p.size * 0.6); noFill();
            beginShape();
            vertex(p.x, p.y); vertex(p.x + j1, p.y + p.len * 0.3); vertex(p.x + j2, p.y + p.len * 0.55);
            vertex(p.x + j3, p.y + p.len * 0.8); vertex(p.x, p.y + p.len);
            endShape();

            stroke("rgba(255,255,255," + (p.alpha * flick) + ")"); strokeWeight(p.size * 0.25);
            beginShape();
            vertex(p.x, p.y); vertex(p.x + j1, p.y + p.len * 0.3); vertex(p.x + j2, p.y + p.len * 0.55);
            vertex(p.x + j3, p.y + p.len * 0.8); vertex(p.x, p.y + p.len);
            endShape();
        }
        else if (p.type === "glow") { fill("rgba(" + p.c + (p.alpha * 0.4) + ")"); noStroke(); ellipse(p.x, p.y, p.size * 2.5, p.size * 2.5); fill("rgba(255,255,255," + p.alpha + ")"); ellipse(p.x, p.y, p.size, p.size); }
        else if (p.type === "ember") {
            var flick = 0.6 + 0.4 * Math.sin(frameCounter * 0.5 + p.flicker);
            noStroke(); fill("rgba(255,90,30," + (p.alpha * flick * 0.5) + ")"); ellipse(p.x, p.y, p.size * 3, p.size * 3);
            fill("rgba(255,180,60," + (p.alpha * flick) + ")"); ellipse(p.x, p.y, p.size, p.size);
        }
        else if (p.type === "heart") {
            noStroke(); fill("rgba(255,90,160," + p.alpha + ")"); var hs = p.size * 0.55;
            ellipse(p.x - hs * 0.5, p.y - hs * 0.3, hs, hs); ellipse(p.x + hs * 0.5, p.y - hs * 0.3, hs, hs);
            triangle(p.x - hs * 0.95, p.y - hs * 0.1, p.x + hs * 0.95, p.y - hs * 0.1, p.x, p.y + hs * 0.9);
        }
        else if (p.type === "twinkle") {
            push(); translate(p.x, p.y); rotate(p.ang);
            stroke("rgba(190,120,255," + p.alpha + ")"); strokeWeight(1.5); line(-p.size, 0, p.size, 0); line(0, -p.size, 0, p.size);
            stroke("rgba(255,255,255," + p.alpha + ")"); strokeWeight(1); line(-p.size * 0.5, -p.size * 0.5, p.size * 0.5, p.size * 0.5); line(-p.size * 0.5, p.size * 0.5, p.size * 0.5, -p.size * 0.5);
            pop();
        }
        else if (p.type === "diamond") {
            push(); translate(p.x, p.y); rotate(p.ang); noStroke();
            fill("rgba(255,215,60," + p.alpha + ")"); quad(0, -p.size, p.size * 0.7, 0, 0, p.size, -p.size * 0.7, 0);
            fill("rgba(255,255,255," + (p.alpha * 0.8) + ")"); quad(0, -p.size * 0.4, p.size * 0.25, 0, 0, p.size * 0.4, -p.size * 0.25, 0);
            pop();
        }
        else if (p.type === "snowflake") {
            // 6 arms, each with a small branch tick, so it actually reads
            // as a snowflake rather than an asterisk.
            push(); translate(p.x, p.y); rotate(p.ang);
            stroke("rgba(200,240,255," + p.alpha + ")"); strokeWeight(1.3);
            for (var sfArm = 0; sfArm < 3; sfArm++) {
              push(); rotate(sfArm * 60);
              line(-p.size, 0, p.size, 0);
              strokeWeight(1); line(p.size * 0.5, 0, p.size * 0.3, -p.size * 0.3); line(p.size * 0.5, 0, p.size * 0.3, p.size * 0.3);
              line(-p.size * 0.5, 0, -p.size * 0.3, -p.size * 0.3); line(-p.size * 0.5, 0, -p.size * 0.3, p.size * 0.3);
              strokeWeight(1.3);
              pop();
            }
            pop();
        }
        else if (p.type === "prism") {
            // A tiny color-cycling dot instead of the busier triangle ribbon.
            noStroke();
            colorMode(HSB, 360, 100, 100, 1);
            fill(p.hue, 20, 100, p.alpha * 0.5); ellipse(p.x, p.y, p.size * 2, p.size * 2);
            fill(p.hue, 85, 95, p.alpha); ellipse(p.x, p.y, p.size, p.size);
            colorMode(RGB, 255);
        }
        else if (p.type === "bubbles") { fill("rgba(150, 220, 255, " + (p.alpha * 0.3) + ")"); stroke("rgba(200, 240, 255, " + p.alpha + ")"); strokeWeight(1.5); ellipse(p.x, p.y, p.size * 2, p.size * 2); noStroke(); fill("rgba(255, 255, 255, " + p.alpha + ")"); ellipse(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.4, p.size * 0.4); }
        else if (p.type === "money") {
            push(); translate(p.x, p.y); rotate(p.rot);
            fill("rgba(46, 204, 113, " + p.alpha + ")"); stroke("rgba(39, 174, 96, " + p.alpha + ")"); strokeWeight(1); rect(-p.size, -p.size/2, p.size*2, p.size);
            fill("rgba(255, 255, 255, " + (p.alpha * 0.7) + ")"); noStroke(); ellipse(0, 0, p.size * 0.8, p.size * 0.5);
            fill("rgba(39, 174, 96, " + p.alpha + ")"); textSize(p.size * 0.7); textAlign(CENTER, CENTER); text("$", 0, 0);
            pop();
        }
        else { fill("rgba(150, 150, 150, " + p.alpha.toFixed(2) + ")"); noStroke(); ellipse(p.x, p.y, p.size * 2, p.size * 2); }
    }
  }

  pop(); // Restores missing initial push for the camera shake matrix!

  // --- RENDERING LAYER 5: Foremost HUD and Sequence Triggers ---

  if (startSequencePhase === 1) {
    var countNum = Math.ceil(startTimer / 40); if (countNum > 3) countNum = 3; if(countNum < 1) countNum = 1;
    var col = countNum > 1 ? "#f1c40f" : "#e74c3c"; if(countNum===3) col = "#e74c3c";
    fill("rgba(0,0,0,0.7)"); noStroke(); rect(150, 150, 100, 100);
    fill(col); ellipse(200, 200, 70, 70);
    fill("rgba(255,255,255,0.9)"); textAlign(CENTER, CENTER); textSize(50); textStyle(BOLD); text(countNum, 200, 204); textStyle(NORMAL);
  } else if (startSequencePhase === 2) {
    var alphaGo = 1.0;
    if (startLineY > 250) alphaGo = Math.max(0, (400 - startLineY) / 150);
    if (alphaGo > 0) {
        fill("rgba(0,0,0," + (0.7 * alphaGo) + ")"); noStroke(); rect(120, 150, 160, 100);
        fill("rgba(46, 204, 113, " + alphaGo + ")"); rect(130, 160, 140, 80);
        fill("rgba(255,255,255," + alphaGo + ")"); textAlign(CENTER, CENTER); textSize(50); textStyle(BOLD); text(tl("GO!", "¡YA!"), 200, 204); textStyle(NORMAL);
    }
  }

  stroke("black"); strokeWeight(2); fill("white"); rect(-2, -2, 404, 47);
  fill("black"); noStroke(); textAlign(LEFT, CENTER); textSize(20); text(tl("Score: ", "Puntos: ") + score, 10, 23);
  stroke("black"); strokeWeight(1); fill("black"); rect(310, 10, 80, 25);
  var electricCar = (equipped.boost === "fuelsaver");                          // Electric never uses fuel: a full charge, shown as a lightning bolt
  if (electricCar) fill("lime"); else if (fuel > 25) fill("lime"); else if (fuel > 10) fill("yellow"); else { if (Math.floor(frameCounter / 4) % 2 === 0) fill("red"); else fill("white"); }
  rect(310, 10, electricCar ? 80 : (fuel / maxFuel) * 80, 25);
  if (electricCar) {
    stroke("black"); strokeWeight(1.5); fill("#ffe14a");
    beginShape(); vertex(354, 11); vertex(343, 24); vertex(350, 24); vertex(346, 34); vertex(362, 20); vertex(354, 20); vertex(359, 11); endShape(CLOSE);
    noStroke();
  } else { noStroke(); fill("black"); textAlign(CENTER, CENTER); textSize(15); textStyle(BOLD); text(tl("FUEL", "GAS"), 350, 24); textStyle(NORMAL); }
  noStroke(); fill("black"); textAlign(CENTER, CENTER);

  if (expressionString.indexOf(tl("Identify:", "Identifica:")) === 0) { textSize(18); drawSupText(expressionString, 200, 23); }
  else if (expressionString.length >= 20) { textSize(15); drawSupText(expressionString, 200, 23); }
  else if (expressionString.length > 14) { textSize(19); drawSupText(expressionString, 200, 23); }
  else { textSize(24); drawSupText(expressionString, 200, 23); }

  drawEquippedBoostBadge();
  noStroke(); fill("gold"); ellipse(16, 60, 16, 16); fill("yellow"); ellipse(16, 60, 10, 10);
  fill("white"); stroke("black"); strokeWeight(3); textAlign(LEFT, CENTER);

  var moneyStr = "$" + (totalCoins / 100).toFixed(2);
  if (moneyStr.length >= 7) textSize(13); else if (moneyStr.length >= 6) textSize(15); else textSize(18);
  textStyle(BOLD); text(moneyStr, 28, 62);

  if (coinPopupTimer > 0) {
      var fade = coinPopupTimer < 20 ? (coinPopupTimer / 20).toFixed(2) : "1.0";
      fill("rgba(" + coinPopupColor + ", " + fade + ")"); stroke("rgba(0, 0, 0, " + fade + ")"); strokeWeight(3);
      if (moneyStr.length >= 7) textSize(13); else if (moneyStr.length >= 6) textSize(15); else textSize(16);
      var popY = 82 - ((60 - coinPopupTimer) * 0.4); text(coinPopupValue, 28, popY);
      if (!isFrozen) coinPopupTimer--;
  }
  textStyle(NORMAL); noStroke();

  if (!isFrozen && zoomFrames > 0) { zoomFrames--; if (zoomFrames === 0) speed = currentQuestionSpeed(); }

  fill("white"); stroke("black"); strokeWeight(2); rect(322, 360, 70, 30);
  textAlign(CENTER, CENTER); textSize(22); textStyle(BOLD);
  for (var i = 0; i < 3; i++) {
    if (strikes > i) { fill("red"); noStroke(); }
    else if (strikes === 2 && i === 2) { if (Math.floor(frameCounter / 6) % 2 === 0) fill("rgba(150, 150, 150, 0.3)"); else fill("rgba(255, 0, 0, 0.5)"); noStroke(); }
    else { fill("rgba(150, 150, 150, 0.3)"); noStroke(); }
    text("X", 337 + (i * 20), 377);
  }
  textStyle(NORMAL);

  fill("white"); stroke("black"); strokeWeight(2); rect(10, 360, 60, 30);
  fill("black"); noStroke(); textAlign(CENTER, CENTER); textSize(14); textStyle(BOLD); text(tl("MENU", "MENÚ"), 40, 375); textStyle(NORMAL);
  if (mouseWentDown("leftButton") && mouseX > 10 && mouseX < 70 && mouseY > 360 && mouseY < 390) {
    playSound("sound://category_app/perfect_clean_app_button_click.mp3");
    exitConfirmPending = true;
  }
}

function drawExitConfirmOverlay() {
  fill("#1a1d24"); noStroke(); rect(0, 0, 400, 400);
  fill("white"); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(24);
  text(tl("Exit to Main Menu?", "¿Salir al menú principal?"), 200, 150);
  fill("lightgray"); textSize(15); textStyle(NORMAL);
  text(tl("Your progress this run will be saved.", "Se guardará tu progreso de esta carrera."), 200, 185);

  var hoverYes = (mouseX > 60 && mouseX < 190 && mouseY > 230 && mouseY < 280);
  var hoverNo = (mouseX > 210 && mouseX < 340 && mouseY > 230 && mouseY < 280);
  fill(hoverYes ? "#c0392b" : "#e74c3c"); stroke("white"); strokeWeight(2); rect(60, 230, 130, 50, 10);
  fill(hoverNo ? "#229954" : "#27ae60"); rect(210, 230, 130, 50, 10);
  fill("white"); noStroke(); textSize(17); textStyle(BOLD);
  text(tl("YES, EXIT", "SÍ, SALIR"), 125, 255); text(tl("CANCEL", "CANCELAR"), 275, 255); textStyle(NORMAL);

  if (mouseWentDown("leftButton")) {
    if (hoverYes) {
      exitConfirmPending = false;
      // Quitting mid-run counts as the run ending here - same high-score
      // check/save as a natural game over, so progress isn't lost just
      // because the player left via the menu button instead of running
      // out of fuel or striking out.
      if (gameState === "play" || gameState === "paused") {
        if (gameMode === "hard" && score > hardHighScore) hardHighScore = score;
        saveExponentProgress();
      }
      gameState = "start";
    } else if (hoverNo) {
      exitConfirmPending = false;
    }
  }
}
