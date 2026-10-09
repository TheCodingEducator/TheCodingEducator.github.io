// results by skill (site-results.js): shown once when a run ends (out of fuel, 3 strikes, the finish line, or Menu)
var qSkillIdx = 0, runStateWas = '', runResultsShown = true;
var RACER_SKILL_IDS = ['eval', 'muldiv', 'powpow', 'neg', 'zeroone', 'vocab'];
if (window.SiteResults) SiteResults.setup([{ id: 'eval', en: 'Evaluating powers', es: 'Evaluar potencias' }, { id: 'muldiv', en: 'Multiplying and dividing powers', es: 'Multiplicar y dividir potencias' }, { id: 'powpow', en: 'Power of a power', es: 'Potencia de una potencia' }, { id: 'neg', en: 'Negative exponents', es: 'Exponentes negativos' }, { id: 'zeroone', en: 'Exponents of zero and one', es: 'Exponentes cero y uno' }, { id: 'vocab', en: 'Vocabulary', es: 'Vocabulario' }]);
function watchRunEnd() {
  var inRun = gameState === 'play' || gameState === 'paused';
  if (inRun) runResultsShown = false;
  else if (!runResultsShown && (runStateWas === 'play' || runStateWas === 'paused') && window.SiteResults) {
    runResultsShown = true;
    setTimeout(function () { SiteResults.show({ title: tl('Your results', 'Tus resultados') }); }, gameState === 'start' ? 0 : 1600);
  }
  runStateWas = gameState;
}
function draw() {
  textFont("sans-serif");
  watchRunEnd();

  if (exitConfirmPending) { drawExitConfirmOverlay(); return; }

  // Escape acts as the Menu button, wherever one is on screen. In-run
  // states get the same confirm-before-quitting treatment as clicking the
  // in-play MENU button.
  if (keyWentDown("escape")) {
    if (gameState === "skillSelect" || gameState === "shop" || gameState === "over" || gameState === "winScreen") {
      gameState = "start";
    } else if (gameState === "play" || gameState === "paused") {
      exitConfirmPending = true;
    }
  }

  var shouldPlayStorm = false;
  if (gameMode === "hard" && (gameState === "play" || gameState === "paused" || gameState === "winSequence")) {
      var currentEnv = (player.y < biomeTransitionY) ? newBiome : oldBiome;
      if (equipped.world === "default" && (currentEnv === "rain" || dayPhase < 1.0)) {
          shouldPlayStorm = true;
      }
  }

  if (shouldPlayStorm && !stormSoundPlaying) {
      playSound("sound://category_background/rain_thunderstorm_calm.mp3", true);
      stormSoundPlaying = true;
  } else if (!shouldPlayStorm && stormSoundPlaying) {
      stopSound("sound://category_background/rain_thunderstorm_calm.mp3");
      stormSoundPlaying = false;
  }

 if (gameState === "start") drawStartScreen();
  else if (gameState === "skillSelect") drawSkillSelectScreen();
  else if (gameState === "shop") drawShopScreen();
  else if (gameState === "play") {
      // (The Maximum Velocity unlock popup used to appear at 100 points; the mode is now unlocked only by FINISHING Street Racing, so it is shown on the win screen instead.)
      if (false && score >= 100 && gameMode === "easy" && !maxVelocityPromptShown) {
          maxVelocityPromptShown = true;
          gameState = "maxVelocityPrompt";
          playSound("sound://category_achievements/puzzle_game_secret_unlock_01.mp3");
      } else {
          if (equipped.boost === "timefreeze" && !usedTimeFreeze && timeFreezeFramesLeft === 0 && (keyWentDown("space") || keyWentDown("enter"))) {
              usedTimeFreeze = true; timeFreezeFramesLeft = 300; playSound("sound://category_achievements/peaceful_win_1.mp3");
          }
          if (timeFreezeFramesLeft > 0) {
              timeFreezeFramesLeft--;
              playGame(true);
              drawTimeFreezeOverlay();
          } else {
              playGame(false);
          }
      }
  }
  else if (gameState === "timeFreezeTip") drawTimeFreezeTip();
  else if (gameState === "maxVelocityPrompt") drawMaxVelocityPrompt();
  else if (gameState === "paused") drawPausedScreen();
  else if (gameState === "rewinding" || gameState === "rewindingLegacy") drawRewindEffect();
  else if (gameState === "over") drawGameOver();
  else if (gameState === "unlockPopup") drawUnlockPopup();
  else if (gameState === "winSequence") drawWinSequence();
  else if (gameState === "winScreen") drawWinScreen();

}

function drawStartScreen() {
  background("#2c3e50");
  roadOffset = (roadOffset + 5) % 60;
  fill("#34495e"); noStroke(); rect(100, 0, 200, 400);
  fill("#f1c40f");
  for (var d = -60; d <= 400; d += 60) rect(198, d + roadOffset, 4, 30);

  for(var i=0; i<menuExponents.length; i++){
    var me = menuExponents[i];
    fill("rgba(255, 255, 255, 0.15)"); textSize(30);
    text(me.val, me.x, me.y); me.y += me.speed;
    if(me.y > 420) { me.y = -30; me.x = randomNumber(0,400); }
  }

  push(); translate(330, 320); rotate(-15); scale(2.2);
  drawVehicle(0, 0, "car", equipped.car, true, "", false, 0, 0);
  pop();

  fill("rgba(0, 0, 0, 0.6)"); noStroke(); rect(0, 75, 400, 70);
  fill("white"); rect(0, 80, 400, 55);
  fill("#c0392b"); rect(0, 80, 400, 5); fill("#c0392b"); rect(0, 130, 400, 5);

  fill("black"); textAlign(CENTER, CENTER);
  textSize(38); textStyle(BOLD); text("EXPONENT RACER", 200, 108); textStyle(NORMAL);

  var hardLocked = !hasUnlockedHardMode;

  drawMenuButton(40, 200, 140, 60, "#27ae60", tl("STREET RACING", "CARRERAS\nURBANAS"));
  if (hardLocked) drawMenuButton(220, 200, 140, 60, "#7f8c8d", tl("LOCKED", "BLOQUEADO"), tl("(Finish Street\nRacing first)", "(Termina Carreras\nUrbanas primero)"));
  else {
    drawMenuButton(220, 200, 140, 60, "#e74c3c", tl("MAXIMUM\nVELOCITY", "VELOCIDAD\nMÁXIMA"));
    // Best score in Maximum Velocity - an endless/survival mode with no
    // win condition, so a high score is the natural progress to chase.
    noStroke(); fill("white"); textAlign(CENTER, CENTER); textSize(12); textStyle(BOLD);
    text(tl("Best Score: ", "Mejor puntaje: ") + hardHighScore, 290, 270);
    textStyle(NORMAL);
  }

  drawMenuButton(150, 280, 100, 45, "#8e44ad", tl("SHOP", "TIENDA"));

  noStroke(); fill("gold"); ellipse(25, 25, 24, 24); fill("yellow"); ellipse(25, 25, 16, 16);
  fill("white"); textAlign(LEFT, CENTER); textSize(24); textStyle(BOLD);
  text("$" + (totalCoins / 100).toFixed(2), 45, 26); textStyle(NORMAL);

  if (keyDown("shift") && keyDown("t") && keyDown("a") && keyDown("v") && !cheatCoinsUsed) {
    cheatCoinsUsed = true;
    hasUnlockedHardMode = true; for (var k = 0; k < 6; k++) unlockedHardSkills[k] = true;
    totalCoins = 999999; playSound("sound://category_achievements/peaceful_win_1.mp3"); // $9999.99 - totalCoins is stored in cents
    saveExponentProgress();
  }

  if (mouseWentDown("leftButton")) {
    if (mouseX > 40 && mouseX < 180 && mouseY > 200 && mouseY < 260) { playSound("sound://category_tap/vibrant_ui_tap_1.mp3"); gameMode = "easy"; skillStates = [false, false, false, false, false, false]; gameState = "skillSelect"; }
    if (!hardLocked && mouseX > 220 && mouseX < 360 && mouseY > 200 && mouseY < 260) { playSound("sound://category_tap/vibrant_ui_tap_1.mp3"); gameMode = "hard"; skillStates = [false, false, false, false, false, false]; gameState = "skillSelect"; }
    if (mouseX > 130 && mouseX < 270 && mouseY > 280 && mouseY < 325) { gameState = "shop"; shopScrollY = 0; }
  }
}

// A flickering flame silhouette: wide base near the source (local -y),
// narrowing to a wobbling point trailing away (local +y). Used 3x per fire
// particle (glow/body/core) at different sizes/colors/seeds for a layered
// licking-flame look instead of a plain ellipse blob.
function drawFlameBlob(cx, cy, s, colorRgba, seed, wob) {
  var w1 = Math.sin(frameCounter * 0.6 + seed) * wob;
  var w2 = Math.sin(frameCounter * 0.7 + seed + 2) * wob;
  var wt = Math.sin(frameCounter * 0.5 + seed + 4) * wob * 1.6;
  push(); translate(cx, cy); noStroke(); fill(colorRgba);
  beginShape();
  vertex(-s * 0.5, -s * 0.7); vertex(-s * 0.28, s * 0.1); vertex(-s * 0.12 + w1, s * 0.8);
  vertex(0, s * 1.5 + wt);
  vertex(s * 0.12 + w2, s * 0.8); vertex(s * 0.28, s * 0.1); vertex(s * 0.5, -s * 0.7);
  endShape(CLOSE);
  pop();
}

function drawTrailGlyph(id) {
  if (id === "none") { fill("gray"); ellipse(0, 0, 15, 15); }
  else if (id === "fire") { fill("orange"); ellipse(0, 0, 25, 25); fill("yellow"); ellipse(0, 0, 15, 15); }
  else if (id === "bubbles") { fill("cyan"); ellipse(0, 0, 20, 20); noFill(); stroke("white"); ellipse(5, -5, 6, 6); }
  else if (id === "money") { fill("green"); rect(-15, -10, 30, 20); fill("white"); textAlign(CENTER, CENTER); textSize(16); text("$", 0, 0); }
  else if (id === "ice") { fill("#8fe3ff"); ellipse(0, 0, 22, 22); fill("white"); ellipse(-5, -5, 7, 7); }
  else if (id === "rainbow") { var rbColors = ["#ff3b3b", "#ff9f1c", "#ffe135", "#5cff5c", "#3ba7ff", "#b15cff"]; for (var ri = 0; ri < rbColors.length; ri++) { fill(rbColors[ri]); ellipse(-12 + ri * 5, 0, 9, 9); } }
  else if (id === "blue") { noFill(); stroke("#50c8ff"); strokeWeight(3); beginShape(); vertex(0, -12); vertex(5, -3); vertex(-3, 0); vertex(4, 4); vertex(0, 12); endShape(); }
  else if (id === "red") { noStroke(); fill("rgba(255,90,30,0.4)"); ellipse(0, 0, 24, 24); fill("#ffb43c"); ellipse(0, 0, 12, 12); }
  else if (id === "pink") { noStroke(); fill("#ff5aa0"); ellipse(-4, -3, 9, 9); ellipse(4, -3, 9, 9); triangle(-8, -1, 8, -1, 0, 10); }
  else if (id === "purple") { stroke("#be78ff"); strokeWeight(2); line(-11, 0, 11, 0); line(0, -11, 0, 11); stroke("white"); strokeWeight(1); line(-6, -6, 6, 6); line(-6, 6, 6, -6); }
  else if (id === "gold") { noStroke(); fill("#ffd73c"); quad(0, -12, 8, 0, 0, 12, -8, 0); fill("white"); quad(0, -5, 3, 0, 0, 5, -3, 0); }
  else { fill(id); ellipse(0, 0, 25, 25); }
}

function drawShopScreen() {
  background("#34495e");

  var items = shopData[shopTab];
  var maxScroll = Math.max(0, (items.length * 48) - 240);

  if (maxScroll > 0) {
      if (keyDown("up")) shopScrollY -= 10;
      if (keyDown("down")) shopScrollY += 10;
      if (mouseDown("leftButton") && mouseX >= 365 && mouseX <= 400 && mouseY >= 110 && mouseY <= 350) {
          var trackY = 110, trackH = 240;
          var thumbH = Math.max(30, trackH * (5 / items.length));
          var relativeY = mouseY - trackY - (thumbH / 2);
          var scrollFraction = relativeY / (trackH - thumbH);
          shopScrollY = scrollFraction * maxScroll;
      }
  }
  shopScrollY = Math.max(0, Math.min(maxScroll, shopScrollY));

  // Scrolling Items
  for (var i = 0; i < items.length; i++) {
    var item = items[i]; var yPos = 110 + (i * 48) - shopScrollY;
    if (yPos > 60 && yPos < 380) {
        fill("#2c3e50"); stroke("black"); strokeWeight(2); rect(20, yPos, 345, 40);
    // --- Draw Small Picture ---
          push();

          if (shopTab === "cars" && item.id === "classic") {
              // No preview icon here - the swatches themselves fill the row.
          } else if (shopTab === "cars") {
              translate(50, yPos + 10); // Car specific position
              scale(0.5); // Scale down the car so it fits
              drawVehicle(0, 0, "car", item.id, true, "", false, 0, 0);
          } else if (shopTab === "trails") {
              // Default red car shown horizontal, facing left (as if driving
              // forward across the row) with the actual trail glyph emitting
              // out its back (to the right) - so the row reads as a little
              // side-view replay of what the trail looks like in real gameplay.
              translate(39, yPos + 20);
              if (item.id !== "none") {
                var trailPreviewSteps = [[13, 1, 0.9], [21, 0.7, 0.55], [28, 0.45, 0.3]];
                for (var tp = 0; tp < trailPreviewSteps.length; tp++) {
                  push();
                  translate(trailPreviewSteps[tp][0], 0);
                  scale(trailPreviewSteps[tp][1]);
                  drawingContext.globalAlpha = trailPreviewSteps[tp][2];
                  drawTrailGlyph(item.id);
                  drawingContext.globalAlpha = 1;
                  pop();
                }
              }
              push();
              rotate(-HALF_PI);
              scale(0.32);
              drawVehicle(0, 0, "car", "red", true, "", false, 0, 0);
              pop();
          } else if (shopTab === "boosts") {
              translate(50, yPos + 20); // Centered vertically next to the text
              if (item.id === "none") { fill("gray"); textAlign(CENTER, CENTER); textSize(20); text("X", 0, 0); }
              else if (item.id === "shield") { noFill(); stroke("cyan"); strokeWeight(4); ellipse(0, 0, 30, 30); }
              else if (item.id === "magnet") { fill("gray"); rect(-12, -12, 24, 12); fill("red"); rect(-12, 0, 10, 12); fill("blue"); rect(2, 0, 10, 12); }
              else if (item.id === "fuelsaver") { noStroke(); fill("#2ecc71"); beginShape(); vertex(2, -13); vertex(-7, 2); vertex(-1, 2); vertex(-3, 13); vertex(8, -3); vertex(1, -3); endShape(CLOSE); }
              else if (item.id === "secondchance") { noFill(); stroke("gold"); strokeWeight(3); arc(0, 0, 28, 28, -220, 40); fill("gold"); noStroke(); textAlign(CENTER, CENTER); textSize(16); textStyle(BOLD); text("2", 0, 1); textStyle(NORMAL); }
              else if (item.id === "timefreeze") { noFill(); stroke("#7fdbff"); strokeWeight(3); ellipse(0, 0, 26, 26); stroke("white"); strokeWeight(2); line(0, 0, 0, -9); line(0, 0, 6, 3); }
              else if (item.id === "doublecoins") { fill("gold"); ellipse(-6, 3, 16, 16); fill("#e6b800"); noFill(); stroke("#b8860b"); strokeWeight(1.5); ellipse(6, -3, 16, 16); }
          }
          pop();


    if (item.isColorPicker) {
        // One row standing in for the flat-color cars: every swatch is free
        // and always available, so clicking one equips it directly instead
        // of going through the normal unlock/buy button. No preview picture
        // or label competing for space - the whole row is just swatches.
        var swStartX = 40, swEndX = 345, swStep = (swEndX - swStartX) / (CLASSIC_CAR_COLORS.length - 1);
        for (var cc = 0; cc < CLASSIC_CAR_COLORS.length; cc++) {
          var cColor = CLASSIC_CAR_COLORS[cc]; var swX = swStartX + cc * swStep, swY = yPos + 20;
          var isThisEquipped = (equipped.car === cColor);
          stroke(isThisEquipped ? "gold" : "#ccc"); strokeWeight(isThisEquipped ? 3 : 1.5);
          fill(cColor); ellipse(swX, swY, 26, 26);

          if (mouseWentDown("leftButton") && mouseY >= 110 && mouseY <= 350) {
            var dx = mouseX - swX, dy = mouseY - swY;
            if (dx * dx + dy * dy < 16 * 16) { equipped.car = cColor; playSound("sound://category_pop/puzzle_game_ui_pop_01.mp3"); saveExponentProgress(); }
          }
        }
    } else {
    fill("white"); noStroke(); textAlign(LEFT, CENTER); textSize(18); textStyle(BOLD);
    text(item.name, 75, yPos + 20); // Moved text to X=75 to make room for picture!
    textStyle(NORMAL);


        var isUnlocked = (unlockedItems[shopTab].indexOf(item.id) !== -1);
        var isEquipped = (equipped[shopTab.slice(0, -1)] === item.id);
        var btnColor = isEquipped ? "#27ae60" : (isUnlocked ? "#f1c40f" : "#e74c3c");
        var textColor = (isUnlocked && !isEquipped) ? "black" : "white";
        var btnText = isEquipped ? tl("EQUIPPED", "EQUIPADO") : (isUnlocked ? tl("EQUIP", "EQUIPAR") : (item.price === 0 ? tl("FREE", "GRATIS") : (tl("BUY $", "COMPRAR $") + (item.price/100).toFixed(2))));

        fill(btnColor); stroke("black"); strokeWeight(2); rect(245, yPos + 5, 110, 30);
        fill(textColor); noStroke(); textAlign(CENTER, CENTER); textSize(btnText.length > 11 ? 12 : 14); textStyle(BOLD); text(btnText, 300, yPos + 20); textStyle(NORMAL);

        if (mouseWentDown("leftButton") && mouseX > 245 && mouseX < 355 && mouseY > yPos + 5 && mouseY < yPos + 35) {
          if (mouseY >= 110 && mouseY <= 350) {
              if (!isUnlocked) {
                if (totalCoins >= item.price) {
                  totalCoins -= item.price; unlockedItems[shopTab].push(item.id); equipped[shopTab.slice(0, -1)] = item.id; playSound("sound://category_achievements/lighthearted_bonus_objective_1.mp3");
                  saveExponentProgress();
                }
              } else if (!isEquipped) {
                equipped[shopTab.slice(0, -1)] = item.id; playSound("sound://category_pop/puzzle_game_ui_pop_01.mp3");
                saveExponentProgress();
              }
          }
        }
    }
    }
  }

  // Header Masks
  fill("#34495e"); noStroke(); rect(0, 0, 400, 110);
  fill("rgba(0, 0, 0, 0.5)"); rect(0,0,400,60);
  fill("white"); textAlign(CENTER, CENTER); textSize(28); textStyle(BOLD); text(tl("SHOP", "TIENDA"), 200, 32); textStyle(NORMAL);
  noStroke(); fill("gold"); ellipse(25, 45, 20, 20); fill("yellow"); ellipse(25, 45, 14, 14);
  fill("white"); textAlign(LEFT, CENTER); textSize(18); textStyle(BOLD);
  text("$" + (totalCoins / 100).toFixed(2), 40, 46); textStyle(NORMAL);

  // Tabs
  var tabs = [
    { id: "cars", name: tl("CARS", "AUTOS"), x: 60, w: 80 },
    { id: "trails", name: tl("TRAILS", "ESTELAS"), x: 150, w: 90 },
    { id: "boosts", name: tl("BOOSTS", "PODERES"), x: 250, w: 90 }
  ];



  for (var t = 0; t < tabs.length; t++) {
    var tb = tabs[t]; var isSel = (shopTab === tb.id);
    fill(isSel ? "#3498db" : "#7f8c8d"); stroke("white"); strokeWeight(2); rect(tb.x, 70, 90, 30);
    fill("white"); noStroke(); textAlign(CENTER, CENTER); textSize(14); textStyle(BOLD); text(tb.name, tb.x + 45, 85); textStyle(NORMAL);
    if (mouseWentDown("leftButton") && mouseX > tb.x && mouseX < tb.x + 90 && mouseY > 70 && mouseY < 100) { playSound("sound://category_app/app_tab_sound.mp3"); shopTab = tb.id; shopScrollY = 0; }
  }

  // Footer Mask
  fill("#34495e"); noStroke(); rect(0, 350, 400, 100);
  fill("#95a5a6"); stroke("black"); strokeWeight(2); rect(100, 365, 200, 30);
  fill("black"); noStroke(); textSize(18); textStyle(BOLD); text(tl("BACK TO MENU", "VOLVER AL MENÚ"), 200, 380); textStyle(NORMAL);

  if (mouseWentDown("leftButton") && mouseX > 100 && mouseX < 300 && mouseY > 365 && mouseY < 395) gameState = "start";

  // Scrollbar
  if (maxScroll > 0) {
      var sTrackY = 110, sTrackH = 240, sThumbH = Math.max(30, sTrackH * (5 / items.length));
      var sFraction = shopScrollY / maxScroll, sThumbY = sTrackY + sFraction * (sTrackH - sThumbH);
      fill("rgba(0, 0, 0, 0.3)"); noStroke(); rect(375, sTrackY, 10, sTrackH);
      fill("rgba(255, 255, 255, 0.7)"); rect(375, sThumbY, 10, sThumbH);
  }
}

function drawSkillSelectScreen() {
  background("#2c3e50"); fill("white"); textAlign(CENTER, CENTER); textSize(28); textStyle(BOLD); text(tl("SELECT SKILLS", "ELIGE DESTREZAS"), 200, 50); textStyle(NORMAL);

  var skillNames = [tl("Evaluating Powers", "Evaluar potencias"), tl("Multiplying and Dividing Powers", "Multiplicar y dividir potencias"), tl("Power of a Power", "Potencia de una potencia"), tl("Negative Exponents", "Exponentes negativos"), tl("Exponents of Zero and One", "Exponentes cero y uno"), tl("Vocabulary", "Vocabulario")];
  for (var i = 0; i < 6; i++) {
    var y = 75 + (i * 42); var isLocked = (gameMode === "hard" && !unlockedHardSkills[i]);
    fill(isLocked ? "#bdc3c7" : "white"); stroke("black"); strokeWeight(2); rect(20, y, 360, 36);
    fill(isLocked ? "#7f8c8d" : "black"); noStroke(); textAlign(LEFT, CENTER); textSize(15); textStyle(BOLD);
    var displayName = skillNames[i]; if (isLocked) displayName += tl(" (LOCKED)", " (BLOQUEADO)");
    text(displayName, 30, y + 18); textStyle(NORMAL);
    fill(isLocked ? "#bdc3c7" : "white"); stroke("black"); strokeWeight(2); rect(340, y + 5, 26, 26);
    if (skillStates[i] && !isLocked) { stroke("green"); strokeWeight(4); line(346, y + 18, 351, y + 26); line(351, y + 26, 362, y + 10); }
    else if (isLocked) { stroke("#7f8c8d"); strokeWeight(3); line(346, y + 11, 360, y + 25); line(360, y + 11, 346, y + 25); }
    if (mouseWentDown("leftButton") && !isLocked && mouseX > 20 && mouseX < 380 && mouseY > y && mouseY < y + 36) { playSound("sound://category_tap/puzzle_game_organic_wood_block_tone_tap_1.mp3"); skillStates[i] = !skillStates[i]; showSkillError = false; }
  }

  if (showSkillError) { fill("red"); noStroke(); textAlign(CENTER, CENTER); textSize(15); textStyle(BOLD); text(tl("Select at least 1 skill to begin!", "¡Elige al menos 1 destreza para empezar!"), 200, 335); textStyle(NORMAL); }
  else if (gameMode === "hard") { fill("#e74c3c"); noStroke(); textAlign(CENTER, CENTER); textSize(12); textStyle(BOLD); text(tl("WARNING: Maximum Velocity includes\nnegative powers and exponents!", "AVISO: ¡Velocidad Máxima incluye\npotencias y exponentes negativos!"), 200, 335); textStyle(NORMAL); }

  fill("gray"); stroke("white"); strokeWeight(2); rect(40, 350, 140, 40); fill("white"); noStroke(); textAlign(CENTER, CENTER); textSize(18); textStyle(BOLD); text(tl("Menu", "Menú"), 110, 370);
  fill("#27ae60"); stroke("white"); strokeWeight(2); rect(220, 350, 140, 40); fill("white"); noStroke(); textAlign(CENTER, CENTER); textSize(18); textStyle(BOLD); text(tl("Confirm", "Confirmar"), 290, 370); textStyle(NORMAL);

  // Handle Button Clicks
  if (mouseWentDown("leftButton")) {
    if (mouseY > 350 && mouseY < 390) {
      if (mouseX > 40 && mouseX < 180) {
        gameState = "start";
      } else if (mouseX > 220 && mouseX < 360) {
        var anyCheckedClick = false;
        for (var j = 0; j < 6; j++) { if (skillStates[j]) anyCheckedClick = true; }
        if (!anyCheckedClick) showSkillError = true; else { showSkillError = false; playSound("sound://category_tap/vibrant_game_start_with_tone_hum.mp3"); proceedToGame(); }
      }
    }
  }

  // Keyboard shortcut to start game
  if (keyWentDown("space") || keyWentDown("enter")) {
    var anyChecked = false;
    for (var j = 0; j < 6; j++) { if (skillStates[j]) anyChecked = true; }
    if (!anyChecked) showSkillError = true; else { showSkillError = false; proceedToGame(); }
  }
}

function proceedToGame() {
  // Time Freeze's activation control (space/enter mid-race) isn't discoverable
  // on its own, so anyone with it equipped gets a one-screen heads-up before
  // every race reminding them it's there and how to use it.
  if (equipped.boost === "timefreeze") { gameState = "timeFreezeTip"; }
  else { startGame(); }
}

function drawMenuButton(x, y, w, h, color, label, sublabel) {
  fill("rgba(0,0,0,0.3)"); rect(x+3, y+3, w, h); fill(color); stroke("white"); strokeWeight(2); rect(x, y, w, h);
  noStroke(); fill("white"); textAlign(CENTER, CENTER);
  if (sublabel) { textSize(16); textStyle(BOLD); text(label, x + w/2, y + h/3 - 4); textSize(12); textStyle(NORMAL); text(sublabel, x + w/2, y + (h*2/3) + 2); }
  else { textSize(16); textStyle(BOLD); text(label, x + w/2, y + h/2); textStyle(NORMAL); }
}
