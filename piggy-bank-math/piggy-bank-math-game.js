var gameState = "menu";
var difficulty = "easy";
var targetAmount = 0;
var currentTotal = 0;
var message = "";
var challengeText = "";
var clickHistory = [];
var animations = [];
var allowedCoins = ["penny", "nickel", "dime", "quarter"];

var solvedCount = 0;
var roundScored = false;
var blockStartTime = 0;
var overTargetCount = 0;

var bestTimeEasy = null;
var bestTimeHard = null;
var resultsTime = 0;
var resultsPreviousBest = null;
var resultsIsNewRecord = false;

var coinValues = { penny: 1, nickel: 5, dime: 10, quarter: 25 };
var confettiColors = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"];
var confettiParticles = [];
var coinClickSound = "sounds/pop.mp3";

var easyBtn = createSprite(200, 140, 220, 55);
easyBtn.shapeColor = "limegreen";

var hardBtn = createSprite(200, 205, 220, 55);
hardBtn.shapeColor = "orange";

var piggyBank = createSprite(200, 130, 150, 100);
piggyBank.visible = false;

var penny = createSprite(80, 350, 40, 40);
penny.visible = false;

var nickel = createSprite(160, 350, 48, 48);
nickel.visible = false;

var dime = createSprite(240, 350, 34, 34);
dime.visible = false;

var quarter = createSprite(320, 350, 60, 60);
quarter.visible = false;

var clearBtn = createSprite(75, 275, 70, 30);
clearBtn.shapeColor = "red";
clearBtn.visible = false;

var undoBtn = createSprite(200, 275, 70, 30);
undoBtn.shapeColor = "orange";
undoBtn.visible = false;

var nextBtn = createSprite(325, 275, 70, 30);
nextBtn.shapeColor = "limegreen";
nextBtn.visible = false;

var menuBtn = createSprite(40, 20, 60, 26);
menuBtn.shapeColor = "gray";
menuBtn.visible = false;

var resultsMenuBtn = createSprite(120, 320, 140, 45);
resultsMenuBtn.shapeColor = "gray";
resultsMenuBtn.visible = false;

var playAgainBtn = createSprite(280, 320, 140, 45);
playAgainBtn.shapeColor = "limegreen";
playAgainBtn.visible = false;

function draw() {
  background("lightblue");

  if (gameState === "menu") {
    drawMenu();
  } else if (gameState === "game") {
    drawGame();
  } else if (gameState === "results") {
    drawResults();
  } else if (gameState === "gameover") {
    drawGameOver();
  }
}

function drawMenu() {
  drawSprites();

  textAlign(CENTER, CENTER);
  fill("black");
  noStroke();

  textSize(26);
  text("Piggy Bank Math", 200, 45);

  textSize(16);
  text("Select your difficulty:", 200, 85);

  textSize(20);
  fill("white");
  text("Penny Prospect", easyBtn.x, easyBtn.y);
  text("Coin Captain", hardBtn.x, hardBtn.y);

  fill("black");
  textSize(15);
  text("Best times (4 questions)", 200, 250);

  textSize(14);
  text("Penny Prospect: " + formatTime(bestTimeEasy), 200, 270);
  text("Coin Captain: " + formatTime(bestTimeHard), 200, 288);

  if (mouseWentDown("leftButton")) {
    if (mouseIsOver(easyBtn)) {
      difficulty = "easy";
      startGame();
    }
    if (mouseIsOver(hardBtn)) {
      difficulty = "hard";
      startGame();
    }
  }
}

function startGame() {
  gameState = "game";
  easyBtn.visible = false;
  hardBtn.visible = false;
  clearBtn.visible = true;
  undoBtn.visible = true;
  menuBtn.visible = true;
  solvedCount = 0;
  overTargetCount = 0;
  blockStartTime = millis();
  setupNextLevel();
}

function backToMenu() {
  gameState = "menu";
  easyBtn.visible = true;
  hardBtn.visible = true;
  clearBtn.visible = false;
  undoBtn.visible = false;
  nextBtn.visible = false;
  menuBtn.visible = false;
}

function setupNextLevel() {
  currentTotal = 0;
  clickHistory = [];
  animations = [];
  nextBtn.visible = false;
  roundScored = false;

  if (difficulty === "easy") {
    allowedCoins = ["penny", "nickel", "dime", "quarter"];
    challengeText = "";
    do {
      targetAmount = randomNumber(1, 99);
    } while (minCoinsToMake(targetAmount, allowedCoins) < 3);
  } else {
    var challengeRoll = randomNumber(1, 4);

    if (challengeRoll === 1) {
      challengeText = "Challenge: Use only Pennies and Nickels!";
      allowedCoins = ["penny", "nickel"];
      do {
        targetAmount = randomNumber(51, 99);
      } while (minCoinsToMake(targetAmount, allowedCoins) < 3);
    } else if (challengeRoll === 2) {
      challengeText = "Challenge: Use only Dimes and Pennies!";
      allowedCoins = ["penny", "dime"];
      do {
        targetAmount = randomNumber(51, 199);
      } while (minCoinsToMake(targetAmount, allowedCoins) < 3);
    } else if (challengeRoll === 3) {
      challengeText = "Challenge: Use only Dimes and Nickels!";
      allowedCoins = ["nickel", "dime"];
      do {
        targetAmount = randomNumber(11, 39) * 5;
      } while (minCoinsToMake(targetAmount, allowedCoins) < 3);
    } else {
      challengeText = "Challenge: Use only Quarters and Nickels!";
      allowedCoins = ["nickel", "quarter"];
      do {
        targetAmount = Math.round(randomNumber(11, 100) * 5 / 5) * 5;
      } while (minCoinsToMake(targetAmount, allowedCoins) < 3);
    }
  }
}

function minCoinsToMake(amount, coins) {
  var denomsLargestFirst = [25, 10, 5, 1];
  var remaining = amount;
  var count = 0;

  for (var i = 0; i < denomsLargestFirst.length; i++) {
    var value = denomsLargestFirst[i];
    var hasCoin = false;
    for (var j = 0; j < coins.length; j++) {
      if (coinValues[coins[j]] === value) { hasCoin = true; }
    }
    if (hasCoin) {
      count += Math.floor(remaining / value);
      remaining = remaining % value;
    }
  }

  return count;
}

function drawGame() {
  if ((millis() - blockStartTime) / 1000 >= 300) {
    backToMenu();
    return;
  }

  drawPiggyBank();
  drawSprites();
  drawCoins();
  updateAndDrawAnimations();
  checkClicks();

  if (currentTotal === targetAmount) {
    message = "Great Job! You matched it!";
    nextBtn.visible = true;
    if (!roundScored) {
      roundScored = true;
      solvedCount += 1;
      if (solvedCount >= 4) {
        showResultsScreen();
        return;
      }
    }
  } else if (currentTotal > targetAmount) {
    message = "Oops, too much! Undo or Clear.";
    nextBtn.visible = false;
  } else {
    message = "Click the coins to match the target!";
    nextBtn.visible = false;
  }

  drawText();
}

function showResultsScreen() {
  var elapsedSeconds = (millis() - blockStartTime) / 1000;
  var previousBest = (difficulty === "easy") ? bestTimeEasy : bestTimeHard;

  resultsTime = elapsedSeconds;
  resultsPreviousBest = previousBest;
  resultsIsNewRecord = (previousBest === null) || (elapsedSeconds < previousBest);

  checkAndSaveBestTime(elapsedSeconds);
  solvedCount = 0;
  blockStartTime = millis();

  gameState = "results";
  clearBtn.visible = false;
  undoBtn.visible = false;
  nextBtn.visible = false;
  menuBtn.visible = false;
  resultsMenuBtn.visible = true;
  playAgainBtn.visible = true;

  confettiParticles = [];
  if (resultsIsNewRecord) {
    for (var i = 0; i < 60; i++) {
      spawnConfettiParticle(randomNumber(-400, 400));
    }
  }
}

function spawnConfettiParticle(startY) {
  confettiParticles.push({
    x: randomNumber(0, 400),
    y: startY,
    vy: randomNumber(2, 5),
    vx: randomNumber(-1, 1),
    size: randomNumber(4, 9),
    rotation: randomNumber(0, 360),
    spin: randomNumber(-6, 6),
    col: confettiColors[randomNumber(0, confettiColors.length - 1)]
  });
}

function updateAndDrawConfetti() {
  for (var i = 0; i < confettiParticles.length; i++) {
    var p = confettiParticles[i];
    p.y += p.vy;
    p.x += p.vx;
    p.rotation += p.spin;

    if (p.y > 400) {
      p.y = randomNumber(-40, -10);
      p.x = randomNumber(0, 400);
    }

    push();
    translate(p.x, p.y);
    rotate(radians(p.rotation));
    noStroke();
    fill(p.col);
    rect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    pop();
  }
}

function continueToNextRound() {
  gameState = "game";
  clearBtn.visible = true;
  undoBtn.visible = true;
  menuBtn.visible = true;
  resultsMenuBtn.visible = false;
  playAgainBtn.visible = false;
  confettiParticles = [];
  overTargetCount = 0;
  setupNextLevel();
}

function checkResultsClicks() {
  if (mouseWentDown("leftButton") && mouseIsOver(playAgainBtn)) {
    continueToNextRound();
  }

  if (mouseWentDown("leftButton") && mouseIsOver(resultsMenuBtn)) {
    resultsMenuBtn.visible = false;
    playAgainBtn.visible = false;
    confettiParticles = [];
    backToMenu();
  }

  if (keyWentDown("enter") || keyWentDown("space")) {
    continueToNextRound();
  }
}

function drawResults() {
  drawSprites();
  checkResultsClicks();

  textAlign(CENTER, CENTER);
  noStroke();

  if (resultsIsNewRecord) {
    push();
    translate(200, 130);
    var pulse = 1 + 0.06 * sin(frameCount * 0.15);
    scale(pulse);
    stroke("#ffd700");
    strokeWeight(3);
    for (var a = 0; a < 360; a += 30) {
      var rad = radians(a + frameCount);
      line(0, 0, cos(rad) * 110, sin(rad) * 110);
    }
    noStroke();
    pop();

    fill("#b8860b");
    textSize(28);
    text("Congratulations!", 200, 110);

    fill("#ff9800");
    textSize(24);
    text("New Record!", 200, 145);
  } else {
    fill("black");
    textSize(28);
    text("Round Complete!", 200, 120);
  }

  fill("black");
  textSize(18);
  text("Your time: " + formatTime(resultsTime), 200, 195);

  if (resultsPreviousBest !== null) {
    var bestLabel = resultsIsNewRecord ? "Previous best: " : "Best time: ";
    textSize(15);
    fill("#333333");
    text(bestLabel + formatTime(resultsPreviousBest), 200, 220);
  }

  fill("white");
  textSize(16);
  text("Menu", resultsMenuBtn.x, resultsMenuBtn.y);
  text("Play Again", playAgainBtn.x, playAgainBtn.y);

  if (resultsIsNewRecord) {
    updateAndDrawConfetti();
  }
}

function drawGameOver() {
  drawSprites();
  checkGameOverClicks();

  textAlign(CENTER, CENTER);
  noStroke();

  fill("red");
  textSize(32);
  text("Game Over!", 200, 120);

  fill("black");
  textSize(18);
  text("You went over the target twice.", 200, 180);

  fill("white");
  textSize(16);
  text("Menu", resultsMenuBtn.x, resultsMenuBtn.y);
  text("Try Again", playAgainBtn.x, playAgainBtn.y);
}

function checkGameOverClicks() {
  if (mouseWentDown("leftButton") && mouseIsOver(playAgainBtn)) {
    resultsMenuBtn.visible = false;
    playAgainBtn.visible = false;
    startGame();
  }

  if (mouseWentDown("leftButton") && mouseIsOver(resultsMenuBtn)) {
    resultsMenuBtn.visible = false;
    playAgainBtn.visible = false;
    backToMenu();
  }

  if (keyWentDown("enter") || keyWentDown("space")) {
    resultsMenuBtn.visible = false;
    playAgainBtn.visible = false;
    startGame();
  }
}

function drawPiggyBank() {
  var pigColor = getPigColor();
  var shadeColor = lerpColor(pigColor, color(0, 0, 0), 0.15);
  var darkShadeColor = lerpColor(pigColor, color(0, 0, 0), 0.35);
  noStroke();

  push();
  translate(200, 155);
  scale(0.65);
  translate(-215, -200);

  fill(pigColor);
  rect(150, 180, 22, 115, 6);
  rect(280, 180, 22, 110, 6);

  fill("#222222");
  rect(150, 283, 22, 14, 4);
  rect(280, 278, 22, 14, 4);

  fill(pigColor);
  rect(58, 181, 84, 48, 20);
  ellipse(215, 200, 250, 170);
  beginShape();
  vertex(112, 108);
  vertex(146, 136);
  quadraticVertex(150, 141, 145, 148);
  vertex(110, 158);
  quadraticVertex(98, 153, 99, 128);
  endShape(CLOSE);

  fill(shadeColor);
  beginShape();
  vertex(118, 122);
  vertex(138, 138);
  quadraticVertex(140, 141, 137, 145);
  vertex(115, 150);
  quadraticVertex(108, 147, 109, 132);
  endShape(CLOSE);

  fill(shadeColor);
  rect(70, 192, 50, 26, 13);
  fill(darkShadeColor);
  ellipse(83, 205, 6, 6);
  ellipse(97, 205, 6, 6);

  fill("#222222");
  ellipse(140, 175, 16, 16);

  fill("#3a3536");
  rect(170, 130, 90, 16, 8);

  noFill();
  stroke(pigColor);
  strokeWeight(7);
  strokeCap(ROUND);
  beginShape();
  vertex(330, 183);
  bezierVertex(358, 160, 382, 168, 380, 188);
  bezierVertex(378, 205, 358, 210, 353, 196);
  bezierVertex(350, 187, 362, 183, 366, 190);
  endShape();
  noStroke();

  pop();
}

function getPigColor() {
  if (currentTotal === targetAmount) {
    return rgb(50, 205, 50);
  }

  if (currentTotal > targetAmount) {
    return rgb(255, 0, 0);
  }

  var percentOff = (targetAmount - currentTotal) / targetAmount;
  var gValue = Math.floor(255 * (1 - percentOff));

  return rgb(255, gValue, 0);
}

function drawCoins() {
  var allCoins = [
    {type: "penny", sprite: penny},
    {type: "nickel", sprite: nickel},
    {type: "dime", sprite: dime},
    {type: "quarter", sprite: quarter}
  ];

  for (var i = 0; i < allCoins.length; i++) {
    var coin = allCoins[i];
    var isAllowed = allowedCoins.indexOf(coin.type) !== -1;
    drawSingleCoin(coin.type, coin.sprite.x, coin.sprite.y, isAllowed);
  }
}

var coinNames = { penny: "Penny", nickel: "Nickel", dime: "Dime", quarter: "Quarter" };
var coinCentLabels = { penny: "1¢", nickel: "5¢", dime: "10¢", quarter: "25¢" };
var coinSizes = { penny: 40, nickel: 48, dime: 34, quarter: 60 };

function drawSingleCoin(type, x, y, active) {
  var mainColor, strokeCol, textCol, nameCol;
  var size = coinSizes[type];

  if (active || active === undefined) {
    mainColor = (type === "penny") ? "#B87333" : "#C0C0C0";
    strokeCol = "black";
    textCol = "black";
    nameCol = "black";
  } else {
    mainColor = "#888888";
    strokeCol = "#555555";
    textCol = "#444444";
    nameCol = "#555555";
  }

  fill(mainColor);
  stroke(strokeCol);
  strokeWeight(2);
  ellipse(x, y, size, size);

  noFill();
  strokeWeight(1);
  ellipse(x, y, size * 0.8, size * 0.8);

  fill(nameCol);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(13);
  text(coinNames[type], x, y - size / 2 - 12);

  if (difficulty !== "hard") {
    fill(textCol);
    noStroke();
    textAlign(CENTER, CENTER);
    if (type === "dime") { textSize(14); }
    else if (type === "quarter") { textSize(20); }
    else { textSize(16); }
    text(coinCentLabels[type], x, y);
  }

  if (!(active || active === undefined)) {
    stroke("red");
    strokeWeight(4);
    var r = size * 0.42;
    line(x - r, y - r, x + r, y + r);
    line(x - r, y + r, x + r, y - r);
    noStroke();
  }
}

function checkClicks() {
  if (mouseWentDown("leftButton")) {
    var previousTotal = currentTotal;

    if (mouseIsOver(penny) && allowedCoins.indexOf("penny") !== -1) {
      currentTotal += 1; clickHistory.push(1); spawnAnimation("penny", penny.x, penny.y, "+1¢");
    }
    if (mouseIsOver(nickel) && allowedCoins.indexOf("nickel") !== -1) {
      currentTotal += 5; clickHistory.push(5); spawnAnimation("nickel", nickel.x, nickel.y, "+5¢");
    }
    if (mouseIsOver(dime) && allowedCoins.indexOf("dime") !== -1) {
      currentTotal += 10; clickHistory.push(10); spawnAnimation("dime", dime.x, dime.y, "+10¢");
    }
    if (mouseIsOver(quarter) && allowedCoins.indexOf("quarter") !== -1) {
      currentTotal += 25; clickHistory.push(25); spawnAnimation("quarter", quarter.x, quarter.y, "+25¢");
    }

    // Only the moment a coin click lands the total exactly on target --
    // the same instant the piggy bank itself turns green (see
    // getPigColor's currentTotal === targetAmount check) -- not on
    // every coin click like before. Gated on the total actually
    // CHANGING this click, so it doesn't replay on an unrelated click
    // (Undo, a miss) while the bank happens to already be sitting on
    // target from an earlier click.
    if (currentTotal !== previousTotal && currentTotal === targetAmount) {
      playSound(coinClickSound);
    }

    if (previousTotal <= targetAmount && currentTotal > targetAmount) {
      overTargetCount++;
      if (overTargetCount >= 2) {
        gameState = "gameover";
        clearBtn.visible = false;
        undoBtn.visible = false;
        nextBtn.visible = false;
        menuBtn.visible = false;
        resultsMenuBtn.visible = true;
        playAgainBtn.visible = true;
      }
    }

    if (mouseIsOver(menuBtn)) {
      backToMenu();
      return;
    }

    if (mouseIsOver(clearBtn)) {
      currentTotal = 0;
      clickHistory = [];
    }

    if (mouseIsOver(undoBtn)) {
      if (clickHistory.length > 0) {
        var lastCoin = clickHistory.pop();
        currentTotal -= lastCoin;
        spawnUndoAnimation(lastCoin);
      }
    }

    if (mouseIsOver(nextBtn) && nextBtn.visible === true) {
      setupNextLevel();
    }
  }

  if ((keyWentDown("enter") || keyWentDown("space")) && nextBtn.visible === true) {
    setupNextLevel();
  }
}

function spawnAnimation(type, startX, startY, label) {
  animations.push({
    type: "coin", coinType: type, x: startX, y: startY, text: label, state: "flying", life: 30
  });
}

function spawnUndoAnimation(val) {
  var label = "-" + val + "¢";

  animations.push({
    type: "undoText", text: label, x: 200, y: 130, life: 40
  });
}

function checkAndSaveBestTime(seconds) {
  if (difficulty === "easy") {
    if (bestTimeEasy === null || seconds < bestTimeEasy) {
      bestTimeEasy = seconds;
    }
  } else {
    if (bestTimeHard === null || seconds < bestTimeHard) {
      bestTimeHard = seconds;
    }
  }
}

function updateAndDrawAnimations() {
  var slotX = 200;
  var slotY = 115;

  for (var i = animations.length - 1; i >= 0; i--) {
    var anim = animations[i];

    if (anim.type === "coin") {
      if (anim.state === "flying") {
        var dx = slotX - anim.x;
        var dy = slotY - anim.y;
        var dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 10) {
          anim.state = "floatingText";
        } else {
          anim.x += dx * 0.15;
          anim.y += dy * 0.15;
          drawSingleCoin(anim.coinType, anim.x, anim.y, true);
        }
      } else if (anim.state === "floatingText") {
        anim.y -= 1;
        anim.life -= 1;
        fill("green"); noStroke(); textSize(20); textAlign(CENTER, CENTER);
        text(anim.text, anim.x, anim.y);

        if (anim.life <= 0) animations.splice(i, 1);
      }
    } else if (anim.type === "undoText") {
      anim.y -= 1;
      anim.life -= 1;
      fill("red"); noStroke(); textSize(24); textAlign(CENTER, CENTER);
      text(anim.text, anim.x, anim.y);

      if (anim.life <= 0) animations.splice(i, 1);
    }
  }
}

function formatMoney(cents) {
  if (cents < 100) {
    return cents + "¢";
  } else {
    return "$" + (cents / 100).toFixed(2);
  }
}

function formatDollars(cents) {
  return "$" + (cents / 100).toFixed(2);
}

function formatTime(seconds) {
  if (seconds === null || seconds === undefined) {
    return "--";
  }
  return seconds.toFixed(1) + "s";
}

function drawText() {
  textAlign(CENTER, CENTER);

  textSize(16);
  noStroke();
  if (currentTotal === targetAmount) {
    fill("limegreen");
  } else if (currentTotal > targetAmount) {
    fill("red");
  } else {
    fill("black");
  }
  text(message, 200, 20);

  textSize(22);
  fill("black");
  text("Target: " + formatMoney(targetAmount), 200, 45);

  if (challengeText !== "") {
    fill("red");
    textSize(13);
    text(challengeText, 200, 70);
  }

  textSize(22);
  fill("black");
  var bankLabel = (difficulty === "hard") ? formatDollars(currentTotal) : formatMoney(currentTotal);
  text("Bank: " + bankLabel, 200, 245);

  textSize(14);
  fill("white");
  text("CLEAR", clearBtn.x, clearBtn.y);
  text("UNDO", undoBtn.x, undoBtn.y);

  fill("black");
  if (nextBtn.visible) {
    text("NEXT", nextBtn.x, nextBtn.y);
  }

  if (menuBtn.visible) {
    fill("white");
    textSize(13);
    text("Menu", menuBtn.x, menuBtn.y);
  }

  fill("white");
  noStroke();
  rect(4, 87, 100, 36, 8);

  fill("black");
  textSize(16);
  text("Coins: " + clickHistory.length, 54, 105);

  fill("white");
  noStroke();
  rect(296, 87, 100, 36, 8);

  fill("#b8860b");
  var liveElapsed = (millis() - blockStartTime) / 1000;

  textSize(18);
  text(solvedCount + "/4 solved", 346, 97);

  textSize(13);
  text("Time: " + liveElapsed.toFixed(1) + "s", 346, 116);

  fill("white");
  textSize(14);
  text("Over Target:", 346, 180);

  if (overTargetCount >= 1) { stroke("red"); } else { stroke("#888888"); }
  strokeWeight(4);
  line(318, 192, 334, 208);
  line(318, 208, 334, 192);

  if (overTargetCount >= 2) { stroke("red"); } else { stroke("#888888"); }
  strokeWeight(4);
  line(358, 192, 374, 208);
  line(358, 208, 374, 192);
  noStroke();
}
