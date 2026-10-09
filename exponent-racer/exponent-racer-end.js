function drawPausedScreen() {
  if (shakeFrames > 0) shakeFrames--;
  playGame(true);
  push();
  if (shakeFrames > 0) translate(randomNumber(-6, 6), randomNumber(-6, 6));

  stroke("white"); strokeWeight(4); fill("black"); rect(10, 40, 380, 315); textAlign(CENTER, TOP);

  var pAns = String(lastPickedAnswer); var cAns = String(answer);
  var pIsVocab = pAns.indexOf("[B]") === 0 || pAns.indexOf("[E]") === 0 || pAns.indexOf("[P]") === 0;
  var cIsVocab = cAns.indexOf("[B]") === 0 || cAns.indexOf("[E]") === 0 || cAns.indexOf("[P]") === 0;
  var pCircleType = ""; if (pIsVocab) { pCircleType = pAns.substring(1, 2); pAns = pAns.substring(3); }
  var cCircleType = ""; if (cIsVocab) { cCircleType = cAns.substring(1, 2); cAns = cAns.substring(3); }
  var pickedIsFraction = pAns.indexOf("—") !== -1; var correctIsFraction = cAns.indexOf("—") !== -1;

  var topY = 55; var bottomY = 340;
  var h1 = 30; var h2 = 22; var h3_left = 20 + (pickedIsFraction ? 54 : 22); var h3_right = 20 + (correctIsFraction ? 54 : 22); var h3 = Math.max(h3_left, h3_right);
  var vExtra = (pIsVocab || cIsVocab) ? 12 : 0; h3 += vExtra;   // circled base/exponent/power answers sit lower so their circles never touch the "Your Answer" / "Correct Answer" labels
  var h4 = explanationString.split('\n').length * 18; if (explanationString.indexOf(tl("A negative exponent flips", "Un exponente negativo pasa")) === 0) h4 = 80;
  var h5 = 14;
  var totalContentHeight = h1 + h2 + h3 + h4 + h5; var gap = (bottomY - topY - totalContentHeight) / 4;

  var currentY = topY;
  noStroke(); fill("red"); textSize(30); textStyle(BOLD); text(tl("INCORRECT!", "¡INCORRECTO!"), 200, currentY); textStyle(NORMAL);

  currentY += h1 + gap;
  fill("white"); if (expressionString.indexOf(tl("Identify:", "Identifica:")) === 0) textSize(18); else textSize(22); drawSupText(tl("Question: ", "Pregunta: ") + expressionString, 200, currentY, CENTER, TOP);

  currentY += h2 + gap;
  var leftY = currentY; var rightY = currentY;

  fill("red"); textSize(18); textStyle(BOLD); text(tl("Your Answer:", "Tu respuesta:"), 100, leftY); textStyle(NORMAL); leftY += 20;
  if (pickedIsFraction) {
    var pParts = pAns.split("\n—\n"); fill("white"); textSize(18); drawSupText(pParts[0], 100, leftY, CENTER, TOP); stroke("white"); strokeWeight(2); line(90, leftY + 22, 110, leftY + 22); noStroke(); drawSupText(pParts[1], 100, leftY + 35, CENTER, TOP); leftY += 60;
  } else if (pIsVocab) {
    fill("white"); textSize(22); drawSupText(pAns, 100, leftY + vExtra, CENTER, TOP, pCircleType); noStroke(); leftY += 30;
  } else { fill("white"); textSize(22); drawSupText(pAns, 100, leftY, CENTER, TOP); leftY += 30; }

  fill("lime"); textSize(18); textStyle(BOLD); text(tl("Correct Answer:", "Correcta:"), 300, rightY); textStyle(NORMAL); rightY += 20;
  if (correctIsFraction) {
    var cParts = cAns.split("\n—\n"); fill("white"); textSize(18); drawSupText(cParts[0], 300, rightY, CENTER, TOP); stroke("white"); strokeWeight(2); line(290, rightY + 22, 310, rightY + 22); noStroke(); drawSupText(cParts[1], 300, rightY + 35, CENTER, TOP); rightY += 60;
  } else if (cIsVocab) {
    fill("white"); textSize(22); drawSupText(cAns, 300, rightY + vExtra, CENTER, TOP, cCircleType); noStroke(); rightY += 30;
  } else { fill("white"); textSize(22); drawSupText(cAns, 300, rightY, CENTER, TOP); rightY += 30; }

  currentY += h3 + gap;

  if (explanationString.indexOf(tl("A negative exponent flips", "Un exponente negativo pasa")) === 0) {
    var expParts = explanationString.split(":\n"); fill("lime"); textSize(15); textLeading(18); text(expParts[0] + ":", 200, currentY);
    var eqY = currentY + 40; var eqParts = expParts[1].split(" = "); var leftDenom = eqParts[0].substring(4); var rightDenom = eqParts[1].substring(4);
    text("1", 150, eqY); stroke("lime"); strokeWeight(2); line(138, eqY + 22, 162, eqY + 22); noStroke(); drawSupText(leftDenom, 150, eqY + 34, CENTER, TOP);
    text("=", 200, eqY + 12); text("1", 250, eqY); stroke("lime"); strokeWeight(2); line(238, eqY + 22, 262, eqY + 22); noStroke(); drawSupText(rightDenom, 250, eqY + 34, CENTER, TOP);
  } else { fill("lime"); textSize(15); textLeading(18); text(explanationString, 200, currentY); }

  currentY += h4 + gap;
  fill("white"); textSize(14); textStyle(BOLD);

  if (pauseTimer > 0) {
    pauseTimer--; var secondsLeft = Math.ceil(pauseTimer / 30); text(tl("Wait ", "Espera ") + secondsLeft + tl(" seconds to continue...", " segundos para continuar..."), 200, currentY);
  } else {
    if (Math.floor(Date.now() / 500) % 2 === 0) { if (strikes >= 3) text(tl("Press any key to finish", "Presiona una tecla para terminar"), 200, currentY); else text(tl("Press any key to continue", "Presiona una tecla para continuar"), 200, currentY); }
    if (keyWentDown("left") || keyWentDown("a") || keyWentDown("right") || keyWentDown("d") || keyWentDown("up") || keyWentDown("w") || keyWentDown("down") || keyWentDown("s") || keyWentDown("space") || keyWentDown(" ") || keyWentDown("enter") || keyWentDown("Enter")) {
      if (strikes >= 3) { gameState = "over"; if (gameMode === "hard" && score > hardHighScore) hardHighScore = score; saveExponentProgress(); } else { shakeFrames = 15; damageFrames = 90; resetQuestion(); moveCooldown = 15; gameState = "play"; }
    }
  }
  textStyle(NORMAL); textAlign(CENTER, CENTER); pop();
}

function drawReviewItem(str, cx, cy) {
  var isVocab = str.indexOf("[B]") === 0 || str.indexOf("[E]") === 0 || str.indexOf("[P]") === 0;
  var circle = ""; if (isVocab) { circle = str.substring(1,2); str = str.substring(3); }
  textAlign(CENTER, CENTER); fill("white");

  if (str.indexOf("—") !== -1) {
      var fParts = str.split("\n—\n"); textSize(12); drawSupText(fParts[0], cx, cy - 8); stroke("white"); strokeWeight(1.5); line(cx - 7, cy, cx + 7, cy); noStroke(); drawSupText(fParts[1], cx, cy + 13); // pushed down from +8: the denominator's exponent digit is raised, so it needs extra clearance below the bar
  } else { textSize(18); drawSupText(str, cx, cy, CENTER, CENTER, isVocab ? circle : null, "cyan", 2); }
  textAlign(LEFT, CENTER);
}

function drawGameOver() {
  fill("black"); noStroke(); rect(0, 0, 400, 400);
  textAlign(CENTER, TOP);

  var maxShow = Math.min(wrongAnswersList.length, 3);
  var reviewHeight = 25;
  if (wrongAnswersList.length === 0) reviewHeight += 25;
  else { reviewHeight += maxShow * 35; if (wrongAnswersList.length > 3) reviewHeight += 15; }
  var h1 = 30; var h2 = 16; var h3 = 45; var h4 = reviewHeight; var h5 = 45;
  var topY = 15; var bottomY = 385; var totalContent = h1 + h2 + h3 + h4 + h5; var gap = Math.max(5, (bottomY - topY - totalContent) / 4);
  var currentY = topY;

  noStroke(); fill("red"); textSize(32); textStyle(BOLD); text(tl("GAME OVER", "FIN DEL JUEGO"), 200, currentY); textStyle(NORMAL); currentY += h1 + gap;
  fill("yellow"); textSize(14); text(gameOverReason, 200, currentY); currentY += h2 + gap;

  var displayMode = gameMode === "easy" ? tl("STREET RACING", "CARRERAS URBANAS") : tl("MAXIMUM VELOCITY", "VELOCIDAD MÁXIMA");
  fill("orange"); textSize(14); text(tl("MODE: ", "MODO: ") + displayMode, 200, currentY);
  fill("white"); textSize(22); text(tl("Final Score: ", "Puntaje final: ") + score, 200, currentY + 20); currentY += h3 + gap;

  fill("cyan"); textSize(16); text(tl("Mistakes to Review:", "Errores para repasar:"), 200, currentY);
  var reviewStartY = currentY + 25;
  if (wrongAnswersList.length === 0) {
    fill("lime"); textSize(14); if (gameOverReason === tl("Crashed into an enemy car!", "¡Chocaste con un auto enemigo!")) text(tl("No math mistakes made.", "Sin errores de matemáticas."), 200, reviewStartY); else text(tl("No mistakes made… except driving ones", "Sin errores… excepto al manejar"), 200, reviewStartY);
  } else {
    for (var w = 0; w < maxShow; w++) {
      var wa = wrongAnswersList[wrongAnswersList.length - 1 - w]; var itemY = reviewStartY + (w * 35);
      fill("white"); noStroke(); textAlign(LEFT, TOP);
      var qText = wa.q; if (qText.indexOf(tl("Identify: ", "Identifica: ")) === 0) qText = qText.replace(tl("Identify: ", "Identifica: "), "");
      var fullQ = tl("Q: ", "P: ") + qText; if (fullQ.length > 22) textSize(14); else if (fullQ.length > 17) textSize(16); else textSize(18);
      drawSupText(fullQ, 35, itemY + 4, LEFT, TOP); textSize(16); fill("#ff6b6b"); text(tl("You:", "Tú:"), 180, itemY + 5); fill("#2ecc71"); text(tl("Cor:", "Bien:"), 280, itemY + 5);
      drawReviewItem(wa.picked, 230, itemY + 12); drawReviewItem(wa.a, 330, itemY + 12); textAlign(CENTER, TOP);
    }
    if (wrongAnswersList.length > 3) { fill("gray"); textSize(10); text("+ " + (wrongAnswersList.length - 3) + tl(" more unlisted mistake(s)", " error(es) más sin mostrar"), 200, reviewStartY + (maxShow * 35)); }
  }
  currentY += h4 + gap; var btnY = currentY; window._goBtnY = btnY;                        // (the keyboard navigation needs to know where the buttons are)

  fill("gray"); stroke("black"); strokeWeight(2); rect(40, btnY, 150, 40); fill("white"); noStroke(); textSize(20); textAlign(CENTER, CENTER); textStyle(BOLD); text(tl("Menu", "Menú"), 115, btnY + 20);
  fill("green"); stroke("black"); strokeWeight(2); rect(210, btnY, 150, 40); fill("white"); noStroke(); textSize(20); textAlign(CENTER, CENTER); textStyle(BOLD); text(tl("Play Again", "Jugar otra vez"), 285, btnY + 20); textStyle(NORMAL);

  if (mouseWentDown("leftButton")) {
    if (mouseY > btnY && mouseY < btnY + 40) {
      if (mouseX > 40 && mouseX < 190) { playSound("sound://category_tap/vibrant_ui_mouse_click_1.mp3"); gameState = "start"; }
      else if (mouseX > 210 && mouseX < 360) { playSound("sound://category_tap/vibrant_ui_mouse_click_1.mp3"); startGame(); }
    }
  }
  if (keyWentDown("space") || keyWentDown("enter")) { playSound("sound://category_tap/vibrant_ui_mouse_click_1.mp3"); startGame(); }
  textAlign(CENTER, CENTER);
}

function drawVehicle(cx, cy, type, color, isPlayer, signalDir, blinkState, water, sand) {
  if (color === "superhero") {
      push(); // Save the normal canvas size

      // Mathematically scale the superhero down and shift him to fit the car hitbox
      translate(cx, cy + 17);
      scale(0.7);
      translate(-cx, -cy);

      fill("#c0392b"); triangle(cx - 8, cy - 10, cx + 8, cy - 10, cx + 18, cy + 30);
      fill("#e74c3c"); triangle(cx - 8, cy - 10, cx + 8, cy - 10, cx - 18, cy + 30);
      fill("#e74c3c"); rect(cx - 12, cy - 10, 24, 35);
      fill("#2980b9"); rect(cx - 7, cy + 10, 6, 20); rect(cx + 1, cy + 10, 6, 20);
      fill("#c0392b"); rect(cx - 8, cy + 25, 8, 12); rect(cx, cy + 25, 8, 12);
      fill("#2980b9"); rect(cx - 14, cy - 25, 5, 20); rect(cx + 9, cy - 25, 5, 20);
      fill("#f1c27d"); ellipse(cx - 11.5, cy - 27, 7, 7); ellipse(cx + 11.5, cy - 27, 7, 7);
      fill("#3498db"); rect(cx - 9, cy - 15, 18, 28);
      fill("#f1c40f"); rect(cx - 9, cy + 8, 18, 4);
      fill("#e74c3c"); triangle(cx - 5, cy - 10, cx + 5, cy - 10, cx, cy);
      fill("#f1c40f"); triangle(cx - 3, cy - 9, cx + 3, cy - 9, cx, cy - 2);
      fill("#f1c27d"); ellipse(cx, cy - 18, 16, 18);
      fill("black"); arc(cx, cy - 20, 16, 12, 180, 360);
      triangle(cx, cy - 22, cx + 4, cy - 22, cx + 2, cy - 16);

      pop(); // Restore the canvas size back to normal for the rest of the game

      return;
  }

  if (color === "alien") {
    // A UFO, not a car: flattened saucer body, glowing dome, and a ring of
    // rim lights - deliberately not the standard car silhouette at all.
    noStroke(); fill("rgba(0,0,0,0.25)"); ellipse(cx, cy + 40, 26, 7);
    fill("rgba(150,255,180,0.3)"); ellipse(cx, cy + 30, 36, 16);
    fill("#8fe86b"); ellipse(cx, cy + 24, 34, 15);
    fill("#6fc84a"); ellipse(cx, cy + 27, 28, 9);
    fill("rgba(210,255,225,0.75)"); stroke("#4f9a34"); strokeWeight(1); ellipse(cx, cy + 15, 18, 17); noStroke();
    fill("#ffe98a"); ellipse(cx - 11, cy + 25, 3, 3); ellipse(cx, cy + 27, 3, 3); ellipse(cx + 11, cy + 25, 3, 3);
    return;
  }

  if (color === "bird") {
    // A bird, not a car: oval body, a beak, and wings that actually flap.
    var flap = Math.sin(frameCount * 0.3) * 10;
    noStroke(); fill("rgba(0,0,0,0.25)"); ellipse(cx, cy + 40, 20, 6);
    fill("#4a90d9"); triangle(cx - 2, cy + 12, cx - 19, cy + 4 - flap, cx - 5, cy + 22);
    fill("#4a90d9"); triangle(cx + 2, cy + 12, cx + 19, cy + 4 - flap, cx + 5, cy + 22);
    fill("#5da3f0"); ellipse(cx, cy + 17, 19, 26);
    fill("#3a7bc8"); triangle(cx - 6, cy + 30, cx + 6, cy + 30, cx, cy + 40);
    fill("#5da3f0"); ellipse(cx, cy + 3, 14, 14);
    fill("#f5a623"); triangle(cx, cy - 1, cx + 9, cy + 2, cx, cy + 5);
    fill("black"); ellipse(cx + 3, cy, 2, 2);
    return;
  }

  if (color === "swervingtruck") {
    // Visibly swerves side to side as it drives, instead of just being a
    // static skin - the gimmick IS the motion, not just the shape.
    var swerve = Math.sin(frameCount * 0.1) * 14;
    push(); translate(cx + swerve * 0.5, cy + 22); rotate(swerve * 0.9); translate(-cx, -(cy + 22));
    noStroke(); fill("rgba(0,0,0,0.3)"); rect(cx - 14, cy + 41, 28, 6);
    fill("black"); ellipse(cx - 11, cy + 11, 9, 9); ellipse(cx + 11, cy + 11, 9, 9); ellipse(cx - 11, cy + 35, 9, 9); ellipse(cx + 11, cy + 35, 9, 9);
    fill("#e67e22"); rect(cx - 13, cy - 4, 26, 20);
    fill("#d35400"); rect(cx - 14, cy + 16, 28, 24);
    fill("lightblue"); rect(cx - 10, cy - 1, 20, 10);
    fill("yellow"); ellipse(cx - 8, cy - 3, 5, 5); ellipse(cx + 8, cy - 3, 5, 5);
    fill("red"); ellipse(cx - 8, cy + 39, 5, 5); ellipse(cx + 8, cy + 39, 5, 5);
    pop();
    return;
  }

  if (color === "robot") {
    // Boxy and angular with a glowing visor instead of a windshield, tread
    // blocks instead of round wheels, and an antenna - not the standard
    // car silhouette with a couple of dots added.
    noStroke(); fill("rgba(0,0,0,0.25)"); ellipse(cx, cy + 44, 26, 6);
    fill("black"); rect(cx - 16, cy + 5, 6, 10); rect(cx + 10, cy + 5, 6, 10); rect(cx - 16, cy + 28, 6, 10); rect(cx + 10, cy + 28, 6, 10);
    fill("#95a5a6"); rect(cx - 13, cy, 26, 43, 3);
    fill("#7f8c8d"); rect(cx - 13, cy + 18, 26, 4);
    fill("#2c3e50"); rect(cx - 10, cy + 6, 20, 10);
    fill("#e74c3c"); ellipse(cx - 5, cy + 11, 4, 4); ellipse(cx + 5, cy + 11, 4, 4);
    stroke("#7f8c8d"); strokeWeight(2); line(cx, cy, cx, cy - 8); noStroke(); fill("#e74c3c"); ellipse(cx, cy - 9, 5, 5);
    fill("#7f8c8d"); ellipse(cx - 10, cy + 36, 3, 3); ellipse(cx + 10, cy + 36, 3, 3);
    return;
  }

  if (color === "dragon") {
    // A dragon head up front with horns and eyes, spiky ridge along the
    // roof, scaled plating, and wings spread from the back. Wings are
    // purely visual (the collision hitbox is a fixed box computed from
    // player.x/y elsewhere, not from anything drawn here) and are kept
    // entirely at/behind cy+10 - below the head/horns, which are the
    // frontmost points - so they can never reach up toward the
    // answer-choice bubbles shown above the car.
    noStroke(); fill("rgba(0,0,0,0.25)"); ellipse(cx, cy + 44, 26, 6);
    // Wings flap by rotating each one about its root (where it meets the
    // body), mirrored so both move together instead of independently.
    var flapAngle = Math.sin(frameCount * 0.2) * 15;
    push(); translate(cx - 12, cy + 14); rotate(-flapAngle);
    fill("#164a1a"); beginShape(); vertex(0, 0); vertex(-18, -4); vertex(-12, 8); vertex(-20, 12); vertex(-1, 16); endShape(CLOSE);
    fill("#2e7d32"); beginShape(); vertex(0, 2); vertex(-10, 0); vertex(-6, 8); vertex(-1, 10); endShape(CLOSE);
    pop();
    push(); translate(cx + 12, cy + 14); rotate(flapAngle);
    fill("#164a1a"); beginShape(); vertex(0, 0); vertex(18, -4); vertex(12, 8); vertex(20, 12); vertex(1, 16); endShape(CLOSE);
    fill("#2e7d32"); beginShape(); vertex(0, 2); vertex(10, 0); vertex(6, 8); vertex(1, 10); endShape(CLOSE);
    pop();
    fill("black"); ellipse(cx - 8, cy + 22, 8, 8); ellipse(cx + 8, cy + 22, 8, 8); ellipse(cx - 8, cy + 38, 8, 8); ellipse(cx + 8, cy + 38, 8, 8);
    fill("#1b5e20"); rect(cx - 13, cy + 6, 26, 37, 4);
    fill("#2e7d32");
    triangle(cx - 11, cy + 6, cx - 5, cy + 6, cx - 8, cy - 4);
    triangle(cx - 3, cy + 6, cx + 3, cy + 6, cx, cy - 5);
    triangle(cx + 5, cy + 6, cx + 11, cy + 6, cx + 8, cy - 4);
    fill("#1b5e20"); ellipse(cx, cy, 20, 14);
    fill("#0d3d10"); triangle(cx - 10, cy + 2, cx - 16, cy + 6, cx - 8, cy + 6); triangle(cx + 10, cy + 2, cx + 16, cy + 6, cx + 8, cy + 6);
    fill("#e74c3c"); ellipse(cx - 5, cy - 1, 3, 3); ellipse(cx + 5, cy - 1, 3, 3);
    return;
  }

  if (color === "plane") {
    // A crop-duster plane seen from above: wide wings crossing a narrow
    // fuselage, a tail fin, and a spinning propeller up front.
    noStroke(); fill("rgba(0,0,0,0.25)"); ellipse(cx, cy + 42, 30, 8);
    fill("#f1c40f"); rect(cx - 30, cy + 16, 60, 9, 2);
    fill("#e67e22"); rect(cx - 30, cy + 16, 60, 3);
    fill("#f1c40f"); rect(cx - 14, cy + 36, 28, 6, 2);
    fill("#e67e22"); triangle(cx, cy + 30, cx, cy + 44, cx + 6, cy + 44);
    fill("#f1c40f"); rect(cx - 5, cy - 6, 10, 46, 3);
    fill("#2c3e50"); ellipse(cx, cy + 10, 8, 10);
    push(); translate(cx, cy - 8); rotate(frameCount * 25);
    stroke("#555"); strokeWeight(2); line(-9, 0, 9, 0); line(0, -9, 0, 9);
    pop();
    noStroke(); fill("#e67e22"); ellipse(cx, cy - 8, 5, 5);
    return;
  }

  if (color === "motorcycle") {
    // A motorcycle, not a bicycle: chunky tires, a visible engine block,
    // an exhaust pipe, a headlight, and a helmeted rider - a thin frame
    // with a bare-headed rider would read as a bicycle instead.
    noStroke(); fill("rgba(0,0,0,0.3)"); ellipse(cx, cy + 42, 20, 6);
    stroke("#111"); strokeWeight(4); line(cx, cy + 3, cx, cy + 39); noStroke();
    fill("#111"); ellipse(cx, cy + 2, 15, 15); ellipse(cx, cy + 40, 15, 15);
    fill("#555"); ellipse(cx, cy + 2, 6, 6); ellipse(cx, cy + 40, 6, 6);
    fill("#2c3e50"); rect(cx - 7, cy + 15, 14, 14, 2);
    fill("#7f8c8d"); rect(cx - 5, cy + 17, 10, 4);
    fill("#bdc3c7"); rect(cx + 6, cy + 25, 11, 4, 2);
    stroke("#111"); strokeWeight(2); line(cx - 12, cy + 6, cx + 12, cy + 6); noStroke();
    fill("yellow"); ellipse(cx, cy - 1, 6, 6);
    fill("#c0392b"); ellipse(cx, cy + 18, 15, 18);
    fill("#111"); ellipse(cx, cy + 8, 9, 9);
    fill("#3498db"); ellipse(cx, cy + 8, 6, 3);
    return;
  }

  if (color === "vintage") {
    // The Hamburger Car (keeps the old "vintage" id so anyone who already owns it still does): seen from above, a sesame-seed bun on
    // top of ruffled lettuce, a red tomato ring, a bit of melted cheese and the edge of the patty, on four black wheels with headlights.
    noStroke(); fill("rgba(0,0,0,0.25)"); ellipse(cx, cy + 44, 30, 6);
    fill("#5a3418"); rect(cx - 15, cy + 1, 30, 42, 15);                                     // patty edge
    fill("#ffcf3a"); rect(cx - 15, cy + 6, 9, 9, 2); rect(cx + 6, cy + 27, 9, 9, 2);        // cheese corners
    fill("#e0402f"); rect(cx - 14, cy + 2, 28, 40, 14);                                     // tomato ring
    fill("#4fae3a");                                                                          // ruffled lettuce round the edge
    for (var lt = 0; lt < 8; lt++) { ellipse(cx - 14, cy + 6 + lt * 4.8, 5, 6); ellipse(cx + 14, cy + 6 + lt * 4.8, 5, 6); }
    ellipse(cx - 6, cy + 2, 6, 5); ellipse(cx + 2, cy + 1.5, 6, 5); ellipse(cx + 9, cy + 3, 5, 5); ellipse(cx - 7, cy + 42, 6, 5); ellipse(cx + 3, cy + 42.5, 6, 5);
    fill("#e0a04a"); rect(cx - 12, cy + 4, 24, 36, 12);                                     // the bun
    fill("#f0bd72"); rect(cx - 9, cy + 7, 12, 14, 6);                                       // shine
    fill("#fff3d6");                                                                          // sesame seeds
    ellipse(cx - 5, cy + 10, 4, 2.4); ellipse(cx + 4, cy + 13, 4, 2.4); ellipse(cx - 1, cy + 19, 4, 2.4);
    ellipse(cx + 6, cy + 23, 4, 2.4); ellipse(cx - 6, cy + 26, 4, 2.4); ellipse(cx + 1, cy + 31, 4, 2.4); ellipse(cx - 4, cy + 35, 4, 2.4);
    fill("#fff3a8"); ellipse(cx - 8, cy + 2, 4, 4); ellipse(cx + 8, cy + 2, 4, 4);          // headlights
    fill("#c9c9c9"); rect(cx - 5, cy + 42, 10, 3, 1);                                        // little rear bumper
    fill("black"); rect(cx - 18, cy + 6, 6, 12, 2); rect(cx + 12, cy + 6, 6, 12, 2); rect(cx - 18, cy + 27, 6, 12, 2); rect(cx + 12, cy + 27, 6, 12, 2);      // wheels, on top so they show
    return;
  }

  if (color === "supercar") {
    // A low, narrow, sleek body with a racing stripe, tinted cockpit,
    // hood scoop, and a rear spoiler on struts - wide tires instead of
    // the standard car's, since a "cheap plain color swap" was the exact
    // complaint this whole roster of custom shapes exists to fix.
    noStroke(); fill("rgba(0,0,0,0.25)"); ellipse(cx, cy + 44, 26, 6);
    fill("black"); rect(cx - 17, cy + 6, 6, 11); rect(cx + 11, cy + 6, 6, 11); rect(cx - 17, cy + 27, 6, 11); rect(cx + 11, cy + 27, 6, 11);
    fill("#d40000"); rect(cx - 12, cy, 24, 43, 8);
    fill("#ffcc00"); rect(cx - 2, cy, 4, 43);
    fill("rgba(0,0,0,0.5)"); rect(cx - 9, cy + 9, 18, 16, 4);
    fill("#111"); rect(cx - 7, cy - 3, 14, 4, 2);
    fill("white"); ellipse(cx - 6, cy + 1, 4, 4); ellipse(cx + 6, cy + 1, 4, 4);
    fill("#111"); rect(cx - 13, cy + 36, 3, 8); rect(cx + 10, cy + 36, 3, 8);
    fill("#111"); rect(cx - 15, cy + 34, 30, 3, 1);
    return;
  }


  // Ghost is drawn as the standard car shape (shadow, wheels, lights, the
  // works), just with the WHOLE thing rendered at reduced opacity via
  // globalAlpha instead of only the body fill - a single translucent body
  // fill alone still left the opaque wheels/lights looking solid.
  drawingContext.globalAlpha = (color === "ghost") ? 0.4 : 1;

  if (dayPhase > 0) {
    noStroke(); fill("rgba(0, 0, 0, " + (dayPhase * 0.4).toFixed(2) + ")");
    var shadowStretchX = (1 - dayPhase) * 30; var shadowStretchW = (1 - dayPhase) * 15;
    if (type === "car") rect(cx - 10 + shadowStretchX, cy + 5, 26 + shadowStretchW, 43);
    else if (type === "truck") rect(cx - 11 + shadowStretchX, cy, 28 + shadowStretchW, 60);
  }
  if (type === "car") {
    noStroke(); fill("rgba(255, 255, 0, 0.4)");
    ellipse(cx - 7, cy - 3, 14, 14); ellipse(cx + 7, cy - 3, 14, 14);
    // Ghost is meant to be entirely white/translucent from headlights to
    // taillights, not just the body - wheels included.
    if (color === "ghost") { stroke("white"); strokeWeight(1); fill("white"); }
    else { stroke("black"); strokeWeight(1); fill("black"); }
    rect(cx - 16, cy + 7, 6, 12); rect(cx + 10, cy + 7, 6, 12); rect(cx - 16, cy + 26, 6, 12); rect(cx + 10, cy + 26, 6, 12);

    if (color === "rainbow") {
      // Cycles hue continuously by frame count, then immediately resets
      // colorMode back to the default 0-255 RGB every other fill() call
      // in this function (and elsewhere) assumes.
      colorMode(HSB, 360, 100, 100); fill((frameCount * 3) % 360, 85, 95); colorMode(RGB, 255);
    } else if (color === "ghost") { fill("#ffffff"); } // opaque here - globalAlpha above is what makes the whole car see-through
    else { fill(color); }
    rect(cx - 13, cy, 26, 43);
    fill("rgba(255,255,255,0.2)"); rect(cx - 10, cy + 10, 20, 22);
    fill(color === "ghost" ? "white" : "lightblue"); rect(cx - 8, cy + 7, 16, 7); rect(cx - 8, cy + 29, 16, 6);

    water = water || 0; sand = sand || 0;
    if (water > 0) {
        noStroke(); fill("rgba(150, 200, 255, " + (water * 0.8) + ")");
        rect(cx - 11, cy + 6, 4, 15); rect(cx + 7, cy + 12, 4, 18); rect(cx - 6, cy + 20, 5, 20); rect(cx + 4, cy + 25, 4, 12);
        fill("rgba(200, 230, 255, " + (water * 0.6) + ")"); rect(cx - 7, cy + 8, 14, 5); rect(cx - 7, cy + 27, 14, 5);
    }
    if (sand > 0) {
        noStroke(); fill("rgba(210, 180, 140, " + (sand * 0.9) + ")");
        rect(cx - 10, cy + 30, 20, 8); rect(cx - 12, cy + 15, 4, 15); rect(cx + 8, cy + 15, 4, 15);
    }

    fill(color === "ghost" ? "white" : "yellow"); ellipse(cx - 7, cy + 1, 6, 6); ellipse(cx + 7, cy + 1, 6, 6);
    fill(color === "ghost" ? "white" : "red"); ellipse(cx - 7, cy + 42, 6, 6); ellipse(cx + 7, cy + 42, 6, 6);

    if (blinkState && !isPlayer) {
      fill("#FFBF00");
      if (signalDir === "left") { ellipse(cx - 9, cy + 1, 6, 6); ellipse(cx - 9, cy + 42, 6, 6); }
      else if (signalDir === "right") { ellipse(cx + 9, cy + 1, 6, 6); ellipse(cx + 9, cy + 42, 6, 6); }
    }

  } else if (type === "truck") {
    noStroke(); fill("rgba(255, 255, 0, 0.4)");
    ellipse(cx - 9, cy - 5, 14, 14); ellipse(cx + 9, cy - 5, 14, 14);
    stroke("black"); strokeWeight(1); fill("black");
    rect(cx - 18, cy + 5, 8, 14); rect(cx + 10, cy + 5, 8, 14); rect(cx - 18, cy + 25, 8, 14); rect(cx + 10, cy + 25, 8, 14); rect(cx - 18, cy + 45, 8, 14); rect(cx + 10, cy + 45, 8, 14);
    fill(color); rect(cx - 14, cy - 5, 28, 60); fill("lightgray"); rect(cx - 12, cy, 24, 15); fill("lightblue"); rect(cx - 10, cy + 2, 20, 8);


    water = water || 0; sand = sand || 0;
    if (water > 0) {
        noStroke(); fill("rgba(150, 200, 255, " + (water * 0.8) + ")");
        rect(cx - 12, cy + 10, 5, 20); rect(cx + 7, cy + 15, 5, 25); rect(cx - 4, cy + 30, 6, 20);
        fill("rgba(200, 230, 255, " + (water * 0.6) + ")"); rect(cx - 9, cy + 3, 18, 6);
    }
    if (sand > 0) {
        noStroke(); fill("rgba(210, 180, 140, " + (sand * 0.9) + ")");
        rect(cx - 14, cy + 40, 28, 12); rect(cx - 14, cy + 15, 5, 25); rect(cx + 9, cy + 15, 5, 25);
    }

    fill("yellow"); ellipse(cx - 9, cy - 3, 8, 8); ellipse(cx + 9, cy - 3, 8, 8);
    fill("red"); ellipse(cx - 9, cy + 53, 6, 6); ellipse(cx + 9, cy + 53, 6, 6);

    if (blinkState && !isPlayer) {
      fill("#FFBF00");
      if (signalDir === "left") { ellipse(cx - 11, cy - 3, 8, 8); ellipse(cx - 11, cy + 53, 8, 8); }
      else if (signalDir === "right") { ellipse(cx + 11, cy - 3, 8, 8); ellipse(cx + 11, cy + 53, 8, 8); }
    }
  }
  drawingContext.globalAlpha = 1;
}

function drawWinSequence() {
  // Call playGame(true) to keep rendering the scene but freeze normal gameplay
  playGame(true);

  // Remove any coins from the screen
  coinActive = false;
  coinSprite.x = -100;

  // Smoothly glide the player's car to the bottom middle using easing
  if (winCarAccel === 0) {
    player.x += (200 - player.x) * 0.08;
    player.y += (350 - player.y) * 0.08;
  }

  // Check if the finish line has reached the middle yet
  if (finishLineY < 225) {
    // Smoothly decelerate the background speed as it approaches the end
    if (speed > 0.6) {
      speed -= 0.015;
    }

    // Keep the background moving
    roadOffset = (roadOffset + speed * 5) % 60;
    for (var t = 0; t < sideTrees.length; t++) {
      sideTrees[t].y += speed * 5;
    }
    for (var p = 0; p < roadPatches.length; p++) {
      roadPatches[p].y += speed * 5;
    }
    for (var r = 0; r < roadDecorations.length; r++) {
      roadDecorations[r].y += speed * 5;
    }

    // Move the finish line down in sync with the background
    finishLineY += speed * 5;
    if (finishLineY >= 225) finishLineY = 225; // Snap it exactly when it hits the middle
  } else {
    // Stop the background completely once the finish line arrives in the middle
    speed = 0;
    finishLineY = 225;

    // Start the car zoom once the background is stopped
    if (winCarAccel === 0) {
      if (!engineSoundPlayed) {
        playSound("sound://category_whoosh/deep_pass_by_whoosh_7_fast.mp3");
        playSound("sound://category_whoosh/deep_pass_by_whoosh_1.mp3");
        engineSoundPlayed = true;
      }
      winCarAccel = 0.5; // Trigger the acceleration
    }

    // Smoothly accelerate the car through the stationary finish line and off the top
    if (winCarAccel > 0) {
      winCarAccel += 1.2;
      player.y -= winCarAccel;
    }
  }

  // Once the car is completely off the screen, move to the next screen
  if (player.y < -50) {
    gameState = "winScreen";
  }
}





function drawWinScreen() {
  // Add a semi-transparent dark background over the finished race
  fill("rgba(0, 0, 0, 0.7)");
  noStroke();
  rect(0, 0, 400, 450);

  // "YOU WIN" Title
  fill("gold");
  textSize(45);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(tl("YOU WIN!", "¡GANASTE!"), 200, 100);

  // Display the Final Score
  fill("white");
  textSize(24);
  text(tl("Final Score: ", "Puntaje final: ") + score, 200, 170);

  // Display Coins
  fill("yellow");
  textSize(20);
  text(tl("Total Wealth: $", "Riqueza total: $") + (totalCoins / 100).toFixed(2), 200, 210);

  // Prompt for Hard Mode
  if (gameMode === "easy") {
    fill("cyan");
    textSize(16);
    textStyle(BOLD);
    text(tl("MAXIMUM VELOCITY UNLOCKED - try it!", "¡VELOCIDAD MÁXIMA DESBLOQUEADA! ¡Pruébala!"), 200, 255);
    textStyle(NORMAL);
  }

  // Draw Menu Button
  fill("gray");
  stroke("black");
  strokeWeight(2);
  rect(40, 300, 150, 40);

  fill("white");
  noStroke();
  textSize(20);
  textStyle(BOLD);
  text(tl("Menu", "Menú"), 115, 320);

  // Draw Play Again Button
  fill("green");
  stroke("black");
  strokeWeight(2);
  rect(210, 300, 150, 40);
  fill("white");
  noStroke();
  textSize(20);
  textStyle(BOLD);
  text(tl("Play Again", "Jugar otra vez"), 285, 320);
  textStyle(NORMAL);

// Handle Button Clicks
  if (mouseWentDown("leftButton")) {
    if (mouseY > 300 && mouseY < 340) {
      if (mouseX > 40 && mouseX < 190) {
         playSound("sound://category_tap/vibrant_ui_mouse_click_1.mp3");
         gameState = "start";
      } else if (mouseX > 210 && mouseX < 360) {
         playSound("sound://category_tap/vibrant_ui_mouse_click_1.mp3");
         startGame();
      }
    }
  }

  // Allow keyboard shortcuts to restart
  if (keyWentDown("space") || keyWentDown("enter")) {
    playSound("sound://category_tap/vibrant_ui_mouse_click_1.mp3");
    startGame();
  }
}


function drawTimeFreezeTip() {
  fill("rgba(0, 0, 0, 0.85)"); noStroke(); rect(0, 0, 400, 450);

  fill("#7fdbff"); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(26);
  text(tl("⏱ NEW CONTROL", "⏱ NUEVO CONTROL"), 200, 90);

  fill("white"); textSize(18); textStyle(NORMAL);
  text(tl("You have Time Freeze equipped!", "¡Tienes Congelar tiempo equipado!"), 200, 140);

  fill("lightgray"); textSize(15);
  text(tl("Press SPACE or ENTER during the race\nto freeze everything for 10 seconds.\n\nIt only works once per race, so\nsave it for a close call!", "Presiona ESPACIO o ENTER durante la carrera\npara congelar todo por 10 segundos.\n\nSolo funciona una vez por carrera, así que\n¡guárdalo para un momento difícil!"), 200, 220);

  fill("lime"); stroke("white"); strokeWeight(3); rect(80, 340, 240, 55, 10);
  fill("black"); noStroke(); textAlign(CENTER, CENTER); textSize(20); textStyle(BOLD);
  text(tl("GOT IT!", "¡ENTENDIDO!"), 200, 368); textStyle(NORMAL);

  if ((mouseWentDown("leftButton") && mouseX > 80 && mouseX < 320 && mouseY > 340 && mouseY < 395) || keyWentDown("space") || keyWentDown("enter")) {
    startGame();
  }
}

function drawTimeFreezeOverlay() {
  // A light icy tint over the scene, and the "TIME FROZEN" badge sits in the grass beside the road (x 0-95), so it never covers the
  // question at the top or the answer choices on the road.
  fill("rgba(20, 60, 90, 0.14)"); noStroke(); rect(0, 46, 400, 354);
  fill("rgba(234, 249, 255, 0.95)"); stroke("#1b6ea8"); strokeWeight(3); rect(6, 150, 86, 74, 10);
  fill("#1b6ea8"); noStroke(); textAlign(CENTER, CENTER); textStyle(BOLD);
  textSize(15); text(tl("⏱ TIME", "⏱ TIEMPO"), 49, 168); text(tl("FROZEN!", "¡CONGELADO!"), 49, 187);
  textSize(20); text(Math.ceil(timeFreezeFramesLeft / 30) + "s", 49, 210);
  textStyle(NORMAL);
}

function drawMaxVelocityPrompt() {
  // Dark overlay
  fill("rgba(0, 0, 0, 0.85)");
  rect(0, 0, 400, 450);

  // Big Exciting Text
  fill("cyan");
  textSize(30);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text(tl("🔥 UNLOCKED! 🔥", "🔥 ¡DESBLOQUEADO! 🔥"), 200, 80);

  fill("white");
  textSize(22);
  text(tl("MAXIMUM VELOCITY MODE", "MODO VELOCIDAD MÁXIMA"), 200, 130);

  fill("lightgray");
  textSize(16);
  textStyle(NORMAL);
  text(tl("You have mastered the basics.\nAre you ready for the ultimate challenge?\n(Bigger risks, much bigger rewards!)", "Ya dominas lo básico.\n¿Estás listo para el reto final?\n(¡Más riesgo, mucha más recompensa!)"), 200, 180);

  // --- BIG GREEN BUTTON (Start Max Velocity) ---
  fill("lime");
  stroke("white");
  strokeWeight(3);
  rect(40, 250, 320, 60, 10);

  fill("black");
  noStroke();
  textSize(20);
  textStyle(BOLD);
  text(tl("START MAXIMUM VELOCITY", "¡A VELOCIDAD MÁXIMA!"), 200, 280);

  // --- SMALL GRAY BUTTON (Continue) ---
  fill("gray");
  stroke("white");
  strokeWeight(2);
  rect(100, 340, 200, 40, 10);

  fill("white");
  noStroke();
  textSize(16);
  textStyle(NORMAL);
  text(tl("Continue Normal Mode", "Seguir en modo normal"), 200, 360);

  // --- Click Detection ---
  if (mouseWentDown("leftButton")) {
    // Check if clicked the Green Button (X: 40-360, Y: 250-310)
    if (mouseX > 40 && mouseX < 360 && mouseY > 250 && mouseY < 310) {
        playSound("sound://category_digital/coin_1.mp3"); // Optional sound
        gameMode = "hard";
        startGame(); // This will reset the game into the new hard mode!
    }
    // Check if clicked the Gray Button (X: 100-300, Y: 340-380)
    else if (mouseX > 100 && mouseX < 300 && mouseY > 340 && mouseY < 380) {
        playSound("sound://category_pop/puzzle_game_ui_pop_tiny_01.mp3"); // Optional sound
        gameState = "play"; // Unpause and keep going
    }
  }
}


// ---------- CHEAT CODE (same combo in every game) ----------
// Hold Shift and press T, A, V together at ANY time while the game is open: max coins, every car / trail / powerup unlocked, and Hard Mode fully unlocked.
(function () {
  var down = {};
  addEventListener('keyup', function (e) { delete down[e.code]; });
  addEventListener('blur', function () { down = {}; });
  addEventListener('keydown', function (e) {
    down[e.code] = true;
    if (e.repeat || !e.shiftKey || !down.KeyT || !down.KeyA || !down.KeyV) return;
    down = {};
    totalCoins = 999999; hasUnlockedHardMode = true; cheatCoinsUsed = true;
    for (var k = 0; k < unlockedHardSkills.length; k++) unlockedHardSkills[k] = true;
    ['cars', 'trails', 'boosts'].forEach(function (t) { unlockedItems[t] = shopData[t].map(function (i) { return i.id; }); });
    saveExponentProgress();
    try { playSound("sound://category_achievements/peaceful_win_1.mp3"); } catch (err) {}
  });
})();


// ---------- SECOND CHANCE: REAL REWIND ----------
// While a run is in progress the game keeps a rolling record of the last 3 seconds (90 frames): where the car was, every
// obstacle, the question and its answer choices, the road, the scenery... and the state of the game's random-number generator.
// When Second Chance triggers, those frames are played BACKWARDS on screen (2x speed) so the player watches the last few
// seconds un-happen, and then play resumes from the start of that window with everything exactly where it was. Because the
// random numbers are restored too, obstacles behave exactly as they did the first time - the player just has a chance to do
// something different.
var RW_MAX_FRAMES = 90;
var RW_VARS = ["score", "totalCoins", "fuel", "maxFuel", "questionTimeLimit", "speed", "roadOffset", "frameCounter", "moveCooldown", "strikes",
  "finishLineY", "winCarAccel", "activeShield", "timeFreezeFramesLeft", "usedTimeFreeze", "startSequencePhase", "startTimer", "startLineY",
  "currentStartSpeed", "playerWater", "playerSand", "roadPatches", "lightningFrames", "lightningPath", "stormPhase", "coinPopupTimer",
  "coinPopupValue", "coinPopupColor", "correctAnswersCount", "base", "exponent", "answer", "expressionString", "explanationString",
  "fuelOptions", "fuelY", "zoomFrames", "shakeFrames", "damageFrames", "dayPhase", "lightPoles", "oldBiome", "newBiome", "biomeTransitionY",
  "currentScoreMilestone", "roadDecorations", "spawnSignNext", "lastSignMessage", "lastPickedAnswer", "lastQuestionString", "pauseTimer",
  "targetCarX", "targetCarY", "coinActive", "cLane", "correctNumericValue", "wrongAnswersList", "sideTrees", "smokeParticles"];
var rwHistory = [], rwFrames = [], rwIdx = -1, rwTotal = 0;
var RW_SPRITE_KEYS = ["x", "y", "width", "height", "velocityX", "velocityY", "targetX", "intentX", "signalTimer", "isMerging", "hasSwerved",
  "swerveCooldown", "water", "sand", "obsType", "carColor"];

function rwClone(v) { return (v !== null && typeof v === "object") ? JSON.parse(JSON.stringify(v)) : v; }

function rwCapture() {
  var s = { rng: _rngS, v: {}, obs: [], px: player.x, py: player.y, cx: coinSprite.x, cy: coinSprite.y, cvx: coinSprite.velocityX };
  for (var i = 0; i < RW_VARS.length; i++) { var k = RW_VARS[i]; if (typeof window[k] !== "undefined") s.v[k] = rwClone(window[k]); }
  for (var o = 0; o < obstacles.length; o++) {
    var ob = obstacles.get(o), d = {};
    for (var j = 0; j < RW_SPRITE_KEYS.length; j++) d[RW_SPRITE_KEYS[j]] = ob[RW_SPRITE_KEYS[j]];
    s.obs.push(d);
  }
  return s;
}

function rwApply(s) {
  _rngS = s.rng;
  for (var k in s.v) window[k] = rwClone(s.v[k]);
  player.x = s.px; player.y = s.py;
  coinSprite.x = s.cx; coinSprite.y = s.cy; coinSprite.velocityX = s.cvx;
  obstacles.destroyEach();
  for (var i = 0; i < s.obs.length; i++) {
    var d = s.obs[i], ob = createSprite(d.x, d.y, d.width, d.height);
    for (var j = 0; j < RW_SPRITE_KEYS.length; j++) ob[RW_SPRITE_KEYS[j]] = d[RW_SPRITE_KEYS[j]];
    ob.visible = false; obstacles.add(ob);
  }
}

// called by the draw() wrapper (exponent-racer-hook.js) at the start of every frame
window._rwRecord = function () {
  if (gameState !== "play" || exitConfirmPending) return;
  rwHistory.push(rwCapture());
  if (rwHistory.length > RW_MAX_FRAMES) rwHistory.shift();
};

// starting a new run (or leaving to the menu) forgets the old recording
var rwLastFrameCounter = -1;

function triggerSecondChanceRewind() {
  if (rwHistory.length < 8) {                                       // not enough recorded yet: fall back to the old jump-to-question-start
    var fromX = player.x, fromY = player.y, fromFuelY = fuelY;
    rewindToQuestionCheckpoint();
    rewindAnim = { t: 0, total: 50, fromX: fromX, fromY: fromY, toX: player.x, toY: player.y, fromFuelY: fromFuelY, toFuelY: fuelY };
    gameState = "rewindingLegacy";
    return;
  }
  rwFrames = rwHistory; rwHistory = []; rwIdx = rwFrames.length - 1; rwTotal = rwFrames.length;
  smokeParticles = []; coinActive = false;
  gameState = "rewinding";
}

function drawRewindEffect() {
  if (gameState === "rewindingLegacy") { drawLegacyRewind(); return; }
  for (var n = 0; n < 2 && rwIdx >= 0; n++) rwApply(rwFrames[rwIdx--]);       // two recorded frames per screen frame = 2x rewind
  separateObstacles();   // no overlapping cars in the replay either
  playGame(true);                                                             // draw the restored moment (no game logic runs)

  // VHS-rewind look on top of the scene
  fill("rgba(40,70,190,0.22)"); noStroke(); rect(0, 0, 400, 400);
  stroke("rgba(255,255,255,0.06)"); strokeWeight(1);
  for (var yy = 0; yy < 400; yy += 4) line(0, yy, 400, yy);
  noStroke();
  fill("rgba(0,0,0,0.55)"); rect(0, 46, 400, 34);
  var pulse = 0.65 + 0.35 * Math.sin(frameCount * 0.6);
  fill("rgba(255,255,255," + pulse + ")"); textAlign(CENTER, CENTER); textSize(22); textStyle(BOLD);
  text(tl("⏪ REWINDING  ", "⏪ REBOBINANDO  ") + (Math.max(0, rwIdx + 1) / 30).toFixed(1) + "s", 200, 63);
  fill("gold"); textSize(15); text(tl("SECOND CHANCE!", "¡OTRO INTENTO!"), 200, 92);
  textStyle(NORMAL);
  fill("rgba(255,255,255,0.25)"); rect(40, 388, 320, 6, 3);
  fill("gold"); rect(40, 388, 320 * (rwTotal ? Math.max(0, rwIdx + 1) / rwTotal : 0), 6, 3);

  if (rwIdx < 0) { rwFrames = []; gameState = "play"; }                       // everything is back where it was: play on
}

// the old short "tween back to the question start" cinematic, kept only as a fallback for the very first seconds of a run
function drawLegacyRewind() {
  rewindAnim.t++;
  var frac = Math.min(1, rewindAnim.t / rewindAnim.total);
  background("#0a0a12"); fill("#181820"); noStroke(); rect(100, 0, 200, 400);
  var ease = 1 - Math.pow(1 - frac, 3), curX = rewindAnim.fromX + (rewindAnim.toX - rewindAnim.fromX) * ease, curY = rewindAnim.fromY + (rewindAnim.toY - rewindAnim.fromY) * ease;
  push(); translate(curX, curY); drawVehicle(0, 0, "car", equipped.car, true, "", false, 0, 0); pop();
  fill("gold"); textAlign(CENTER, CENTER); textSize(30); textStyle(BOLD); text(tl("SECOND CHANCE!", "¡OTRO INTENTO!"), 200, 200); textStyle(NORMAL);
  if (rewindAnim.t >= rewindAnim.total) { rewindAnim = null; gameState = "play"; }
}


// The equipped powerup's Shop symbol, shown in the top-right corner just under the white HUD bar. The one-use powerups (Second Chance,
// Forcefield, Time Freeze) disappear from here as soon as they have been used.
function drawEquippedBoostBadge() {
  var id = equipped.boost;
  if (!id || id === "none") return;
  if (id === "secondchance" && usedSecondChance) return;
  if (id === "shield" && !activeShield) return;
  if (id === "timefreeze" && usedTimeFreeze) return;
  push();
  translate(360, 68);                                              // just left of the halfway point between the road edge (x 300) and the screen edge (x 400)
  noStroke(); fill("rgba(0,0,0,0.5)"); ellipse(0, 0, 38, 38);
  if (id === "shield") { noFill(); stroke("cyan"); strokeWeight(4); ellipse(0, 0, 30, 30); }
  else if (id === "magnet") { fill("gray"); rect(-12, -12, 24, 12); fill("red"); rect(-12, 0, 10, 12); fill("blue"); rect(2, 0, 10, 12); }
  else if (id === "fuelsaver") { noStroke(); fill("#2ecc71"); beginShape(); vertex(2, -13); vertex(-7, 2); vertex(-1, 2); vertex(-3, 13); vertex(8, -3); vertex(1, -3); endShape(CLOSE); }
  else if (id === "secondchance") { noFill(); stroke("gold"); strokeWeight(3); arc(0, 0, 28, 28, -220, 40); fill("gold"); noStroke(); textAlign(CENTER, CENTER); textSize(16); textStyle(BOLD); text("2", 0, 1); textStyle(NORMAL); }
  else if (id === "timefreeze") { noFill(); stroke("#7fdbff"); strokeWeight(3); ellipse(0, 0, 26, 26); stroke("white"); strokeWeight(2); line(0, 0, 0, -9); line(0, 0, 6, 3); }
  else if (id === "doublecoins") { fill("gold"); ellipse(-6, 3, 16, 16); fill("#e6b800"); noFill(); stroke("#b8860b"); strokeWeight(1.5); ellipse(6, -3, 16, 16); }
  pop();
}
