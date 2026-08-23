var gameState = "start";
var gameMode = "";
var score = 0;
var totalCoins = 0;
var fuel = 50, maxFuel = 50, questionTimeLimit = 8, speed = 1, roadOffset = 0, frameCounter = 0;
var moveCooldown = 0, gameOverReason = "", wrongAnswersList = [], strikes = 0;
var finishLineY = -100, winCarAccel = 0, engineSoundPlayed = false;
var maxVelocityPromptShown = false;

// Shop & Customization Variables
var activeShield = false, shopTab = "cars", shopScrollY = 0;

var unlockedItems = {
  cars: ["red", "blue", "green", "purple", "orange", "pink", "white", "yellow", "black", "superhero"],
  trails: ["none"],
  boosts: ["none"]
};

var equipped = { car: "red", trail: "none", boost: "none", world: "default" };

var shopData = {
  cars: [
    { id: "red", name: "Red Car", price: 100 }, { id: "blue", name: "Blue Car", price: 100 },
    { id: "green", name: "Green Car", price: 100 }, { id: "purple", name: "Purple Car", price: 100 },
    { id: "orange", name: "Orange Car", price: 100 }, { id: "pink", name: "Pink Car", price: 100 },
    { id: "yellow", name: "Yellow Car", price: 100 }, { id: "black", name: "Black Car", price: 100 },
    { id: "white", name: "White Car", price: 100 }, { id: "superhero", name: "Superhero", price: 1000 }
  ],

  trails: [
    { id: "none", name: "Exhaust", price: 300 }, { id: "fire", name: "Fire Trail", price: 300 },
    { id: "blue", name: "Blue Smoke", price: 300 }, { id: "red", name: "Red Smoke", price: 300 },
    { id: "pink", name: "Pink Smoke", price: 300 }, { id: "bubbles", name: "Bubbles", price: 500 },
    { id: "money", name: "Money Trail", price: 500 }
  ],
  boosts: [
    { id: "none", name: "No Powerup", price: 500 },
    { id: "shield", name: "Forcefield", price: 500 },
    { id: "magnet", name: "Coin Magnet", price: 500 }
  ],
};

// Race Start Variables
var startSequencePhase = 0, startTimer = 0, startLineY = 0, currentStartSpeed = 0;

// Weathering & Road Patch Variables
var playerWater = 0, playerSand = 0, roadPatches = [], lightningFrames = 0;
var lightningPath = { main: [], branches: [] };
var stormPhase = 0, stormSoundPlaying = false;

// Coin Pop-up HUD Variables
var coinPopupTimer = 0, coinPopupValue = "", coinPopupColor = "";

// Variables to track unlocks for specific skills
var unlockedHardSkills = [false, false, false, false, false, false];
var hasUnlockedHardMode = false, correctAnswersCount = 0;

var lanes = [128, 200, 272];
var base, exponent, answer, expressionString, explanationString;
var fuelOptions = [null, null, null], fuelY = -100, zoomFrames = 0, maxZoomFrames = 100;
var shakeFrames = 0, damageFrames = 0, dayPhase = 1.0, lightPoles = [-100, 100, 300, 500];

// Top-to-Bottom Biome Transition Variables
var oldBiome = "forest", newBiome = "forest";
var biomeTransitionY = 500, currentScoreMilestone = 0;

// Road details and signs
var roadDecorations = [], spawnSignNext = false;
var signMessages = ["KEEP\nIT UP!", "MATH\nRULES!", "GREAT\nJOB!", "YOU GOT\nTHIS!", "KEEP\nGOING", "AMAZING", "YOU'RE\nAWESOME", "YOU LOVE\nMATH!", "Mr. Hardy\n= GOAT!", "EXPONENT\nEXPERT!"];
var lastSignMessage = "", lastPickedAnswer = "", lastQuestionString = "", pauseTimer = 0;

var skillStates = [true, true, true, true, true, true], showSkillError = false;

var player = createSprite(200, 350, 26, 43); player.visible = false;
var targetCarX = 200, targetCarY = 350;

var coinSprite = createSprite(-100, -100, 20, 20); coinSprite.visible = false;
var coinActive = false;

var obstacles = createGroup();
var sideTrees = [];
for (var i = 0; i < 8; i++) {
  sideTrees.push({ x: randomNumber(-10, 75), y: i * 110 - 50, s: randomNumber(12, 22), type: randomNumber(0,4), seed: randomNumber(0, 1000), isSign: false });
  sideTrees.push({ x: randomNumber(325, 410), y: i * 110 - 20, s: randomNumber(12, 22), type: randomNumber(0,4), seed: randomNumber(0, 1000), isSign: false });
}
var smokeParticles = [];

function formatExponent(expNum) {
  var map = {"-":"⁻", "0":"⁰", "1":"¹", "2":"²", "3":"³", "4":"⁴", "5":"⁵", "6":"⁶", "7":"⁷", "8":"⁸", "9":"⁹"};
  var s = String(expNum), res = "";
  for (var i = 0; i < s.length; i++) res += map[s[i]] || s[i];
  return res;
}

// Draws text that may contain formatExponent()'s superscript characters, but
// renders those digits as scaled-down/raised REGULAR digits instead of using
// the Unicode superscript glyphs directly. Unicode superscript characters
// come from two different blocks (¹²³ vs ⁰⁴⁵⁶⁷⁸⁹) that many fonts - even
// well-designed ones - render with inconsistent size/baseline/style, which
// looks broken (mismatched digits) especially on mobile. Regular digits 0-9
// are always a unified, consistent glyph set in any font, so drawing scaled
// copies of those instead guarantees a consistent look everywhere.
var SUP_TO_NORMAL = {"⁻":"-", "⁰":"0", "¹":"1", "²":"2", "³":"3", "⁴":"4", "⁵":"5", "⁶":"6", "⁷":"7", "⁸":"8", "⁹":"9"};

// Empirically-measured (not guessed) relationship between a digit's font
// size and its actual rendered ink, via pixel-scanning a live canvas: ink
// height is ~0.68x the font size, and for TOP vertical alignment the ink's
// visual center sits ~0.35x the font size below the y that was passed in
// (for CENTER alignment the visual center already matches y directly).
var DIGIT_INK_HEIGHT_RATIO = 0.68;
var TOP_ALIGN_CENTER_OFFSET_RATIO = 0.35;

function drawSupText(str, x, y, hAlign, vAlign, circleType, circleStroke, circleStrokeWeight) {
  if (hAlign === undefined) hAlign = CENTER;
  if (vAlign === undefined) vAlign = CENTER;
  if (circleStroke === undefined) circleStroke = "blue";
  if (circleStrokeWeight === undefined) circleStrokeWeight = 3;

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
  var layout = []; // {left, width, size, centerY} per segment, for circleType below
  for (s = 0; s < segments.length; s++) {
    textSize(segments[s].isSup ? supSize : baseSize);
    var w = textWidth(segments[s].text);
    layout.push({ width: w, size: segments[s].isSup ? supSize : baseSize, isSup: segments[s].isSup });
    totalWidth += w;
  }

  var startX;
  if (hAlign === CENTER) startX = x - totalWidth / 2;
  else if (hAlign === RIGHT) startX = x - totalWidth;
  else startX = x;

  textAlign(LEFT, vAlign);
  var cursorX = startX;
  for (s = 0; s < segments.length; s++) {
    var seg = segments[s];
    var segY = seg.isSup ? (y - supRaise) : y;
    textSize(layout[s].size);
    text(seg.text, cursorX, segY);
    layout[s].left = cursorX;
    layout[s].centerY = (vAlign === TOP) ? (segY + layout[s].size * TOP_ALIGN_CENTER_OFFSET_RATIO) : segY;
    cursorX += layout[s].width;
  }

  textSize(baseSize);
  textAlign(hAlign, vAlign);

  // Draw a circle around the base digit ("B"), the exponent digit ("E"), or
  // both together ("P") - positioned/sized from the same layout just used to
  // draw the text, so it always matches regardless of font size or position.
  // Only meaningful for the base+exponent (2-segment) vocab strings this is
  // actually used for.
  if (circleType && layout.length === 2) {
    push();
    noFill(); stroke(circleStroke); strokeWeight(circleStrokeWeight);

    var baseSeg = layout[0], expSeg = layout[1];
    var baseCenterX = baseSeg.left + baseSeg.width / 2;
    var expCenterX = expSeg.left + expSeg.width / 2;

    if (circleType === "B") {
      ellipse(baseCenterX, baseSeg.centerY, baseSeg.width * 1.5, baseSeg.size * 1.05);
    } else if (circleType === "E") {
      ellipse(expCenterX, expSeg.centerY, expSeg.width * 1.7, expSeg.size * 1.3);
    } else if (circleType === "P") {
      var baseInkHalf = (baseSeg.size * DIGIT_INK_HEIGHT_RATIO) / 2;
      var expInkHalf = (expSeg.size * DIGIT_INK_HEIGHT_RATIO) / 2;
      var top = expSeg.centerY - expInkHalf;
      var bottom = baseSeg.centerY + baseInkHalf;
      var pCenterX = startX + totalWidth / 2;
      var pCenterY = (top + bottom) / 2;
      ellipse(pCenterX, pCenterY, totalWidth * 1.2, (bottom - top) * 1.25);
    }
    pop();
  }
}


var menuExponents = [];
for(var j=0; j<10; j++) {
  menuExponents.push({x: randomNumber(0,400), y: randomNumber(0,400), val: randomNumber(2,9) + formatExponent(randomNumber(2,5)), speed: randomNumber(1,3)});
}

function drawTides(yTop, yBottom) {
  fill("rgba(0, 119, 190, 0.75)"); noStroke();
  var waveOffset = Math.sin(frameCounter * 0.05) * 8;
  var w1 = 30 + waveOffset; var w2 = 30 - waveOffset;
  rect(0, yTop, w1, yBottom - yTop); rect(400 - w2, yTop, w2, yBottom - yTop);
  fill("rgba(255, 255, 255, 0.5)");
  rect(w1, yTop, 4, yBottom - yTop); rect(400 - w2 - 4, yTop, 4, yBottom - yTop);
}

function draw() {
  textFont("sans-serif");

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
      // Check if we hit 75 points on easy mode to trigger the popup
      if (score >= 75 && gameMode === "easy" && !maxVelocityPromptShown) {
          maxVelocityPromptShown = true;
          gameState = "maxVelocityPrompt";
      } else {
          playGame(false);
      }
  }
  else if (gameState === "maxVelocityPrompt") drawMaxVelocityPrompt();
  else if (gameState === "paused") drawPausedScreen();
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

  drawMenuButton(40, 200, 140, 60, "#27ae60", "STREET RACING");
  if (hardLocked) drawMenuButton(220, 200, 140, 60, "#7f8c8d", "LOCKED", "(Score 75+ in\nStreet Racing)");
  else drawMenuButton(220, 200, 140, 60, "#e74c3c", "MAXIMUM\nVELOCITY");

  drawMenuButton(150, 280, 100, 45, "#8e44ad", "SHOP");

  noStroke(); fill("gold"); ellipse(25, 25, 24, 24); fill("yellow"); ellipse(25, 25, 16, 16);
  fill("white"); textAlign(LEFT, CENTER); textSize(24); textStyle(BOLD);
  text("$" + (totalCoins / 100).toFixed(2), 45, 26); textStyle(NORMAL);

  if (keyDown("shift") && (keyWentDown("u") || keyWentDown("U"))) {
    hasUnlockedHardMode = true; for (var k = 0; k < 6; k++) unlockedHardSkills[k] = true;
    totalCoins += 5000; playSound("sound://category_achievements/peaceful_win_1.mp3");
  }

  if (mouseWentDown("leftButton")) {
    if (mouseX > 40 && mouseX < 180 && mouseY > 200 && mouseY < 260) { gameMode = "easy"; skillStates = [true, true, true, true, true, true]; gameState = "skillSelect"; }
    if (!hardLocked && mouseX > 220 && mouseX < 360 && mouseY > 200 && mouseY < 260) { gameMode = "hard"; for (var s = 0; s < 6; s++) skillStates[s] = unlockedHardSkills[s]; gameState = "skillSelect"; }
    if (mouseX > 130 && mouseX < 270 && mouseY > 280 && mouseY < 325) { gameState = "shop"; shopScrollY = 0; }
  }
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

          if (shopTab === "cars") {
              translate(50, yPos + 10); // Car specific position
              scale(0.5); // Scale down the car so it fits
              drawVehicle(0, 0, "car", item.id, true, "", false, 0, 0);
          } else if (shopTab === "trails") {
              translate(50, yPos + 20); // Centered vertically next to the text
              if (item.id === "none") { fill("gray"); ellipse(0, 0, 15, 15); }
              else if (item.id === "fire") { fill("orange"); ellipse(0, 0, 25, 25); fill("yellow"); ellipse(0, 0, 15, 15); }
              else if (item.id === "bubbles") { fill("cyan"); ellipse(0, 0, 20, 20); noFill(); stroke("white"); ellipse(5, -5, 6, 6); }
              else if (item.id === "money") { fill("green"); rect(-15, -10, 30, 20); fill("white"); textAlign(CENTER, CENTER); textSize(16); text("$", 0, 0); }
              else { fill(item.id); ellipse(0, 0, 25, 25); }
          } else if (shopTab === "boosts") {
              translate(50, yPos + 20); // Centered vertically next to the text
              if (item.id === "none") { fill("gray"); textAlign(CENTER, CENTER); textSize(20); text("X", 0, 0); }
              else if (item.id === "shield") { noFill(); stroke("cyan"); strokeWeight(4); ellipse(0, 0, 30, 30); }
              else if (item.id === "magnet") { fill("gray"); rect(-12, -12, 24, 12); fill("red"); rect(-12, 0, 10, 12); fill("blue"); rect(2, 0, 10, 12); }
          }
          pop();


    fill("white"); noStroke(); textAlign(LEFT, CENTER); textSize(18); textStyle(BOLD);
    text(item.name, 75, yPos + 20); // Moved text to X=75 to make room for picture!
    textStyle(NORMAL);


        var isUnlocked = (unlockedItems[shopTab].indexOf(item.id) !== -1);
        var isEquipped = (equipped[shopTab.slice(0, -1)] === item.id);
        var btnColor = isEquipped ? "#27ae60" : (isUnlocked ? "#f1c40f" : "#e74c3c");
        var textColor = (isUnlocked && !isEquipped) ? "black" : "white";
        var btnText = isEquipped ? "EQUIPPED" : (isUnlocked ? "EQUIP" : (item.price === 0 ? "FREE" : ("BUY $" + (item.price/100).toFixed(2))));

        fill(btnColor); stroke("black"); strokeWeight(2); rect(245, yPos + 5, 110, 30);
        fill(textColor); noStroke(); textAlign(CENTER, CENTER); textSize(14); textStyle(BOLD); text(btnText, 300, yPos + 20); textStyle(NORMAL);

        if (mouseWentDown("leftButton") && mouseX > 245 && mouseX < 355 && mouseY > yPos + 5 && mouseY < yPos + 35) {
          if (mouseY >= 110 && mouseY <= 350) {
              if (!isUnlocked) {
                if (totalCoins >= item.price) {
                  totalCoins -= item.price; unlockedItems[shopTab].push(item.id); equipped[shopTab.slice(0, -1)] = item.id; playSound("sound://category_achievements/lighthearted_bonus_objective_1.mp3");
                }
              } else if (!isEquipped) {
                equipped[shopTab.slice(0, -1)] = item.id; playSound("sound://category_pop/click_pop_1.mp3");
              }
          }
        }
    }
  }

  // Header Masks
  fill("#34495e"); noStroke(); rect(0, 0, 400, 110);
  fill("rgba(0, 0, 0, 0.5)"); rect(0,0,400,60);
  fill("white"); textAlign(CENTER, CENTER); textSize(28); textStyle(BOLD); text("SHOP", 200, 32); textStyle(NORMAL);
  noStroke(); fill("gold"); ellipse(25, 45, 20, 20); fill("yellow"); ellipse(25, 45, 14, 14);
  fill("white"); textAlign(LEFT, CENTER); textSize(18); textStyle(BOLD);
  text("$" + (totalCoins / 100).toFixed(2), 40, 46); textStyle(NORMAL);

  // Tabs
  var tabs = [
    { id: "cars", name: "CARS", x: 60, w: 80 },
    { id: "trails", name: "TRAILS", x: 150, w: 90 },
    { id: "boosts", name: "BOOSTS", x: 250, w: 90 }
  ];



  for (var t = 0; t < tabs.length; t++) {
    var tb = tabs[t]; var isSel = (shopTab === tb.id);
    fill(isSel ? "#3498db" : "#7f8c8d"); stroke("white"); strokeWeight(2); rect(tb.x, 70, 90, 30);
    fill("white"); noStroke(); textAlign(CENTER, CENTER); textSize(14); textStyle(BOLD); text(tb.name, tb.x + 45, 85); textStyle(NORMAL);
    if (mouseWentDown("leftButton") && mouseX > tb.x && mouseX < tb.x + 90 && mouseY > 70 && mouseY < 100) { shopTab = tb.id; shopScrollY = 0; }
  }

  // Footer Mask
  fill("#34495e"); noStroke(); rect(0, 350, 400, 100);
  fill("#95a5a6"); stroke("black"); strokeWeight(2); rect(100, 365, 200, 30);
  fill("black"); noStroke(); textSize(18); textStyle(BOLD); text("BACK TO MENU", 200, 380); textStyle(NORMAL);

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
  background("#2c3e50"); fill("white"); textAlign(CENTER, CENTER); textSize(28); textStyle(BOLD); text("SELECT SKILLS", 200, 50); textStyle(NORMAL);

  var skillNames = ["Evaluating Powers", "Multiplying and Dividing Powers", "Power of a Power", "Negative Exponents", "Exponents of Zero and One", "Vocabulary"];
  for (var i = 0; i < 6; i++) {
    var y = 75 + (i * 42); var isLocked = (gameMode === "hard" && !unlockedHardSkills[i]);
    fill(isLocked ? "#bdc3c7" : "white"); stroke("black"); strokeWeight(2); rect(20, y, 360, 36);
    fill(isLocked ? "#7f8c8d" : "black"); noStroke(); textAlign(LEFT, CENTER); textSize(15); textStyle(BOLD);
    var displayName = skillNames[i]; if (isLocked) displayName += " (LOCKED)";
    text(displayName, 30, y + 18); textStyle(NORMAL);
    fill(isLocked ? "#bdc3c7" : "white"); stroke("black"); strokeWeight(2); rect(340, y + 5, 26, 26);
    if (skillStates[i] && !isLocked) { stroke("green"); strokeWeight(4); line(346, y + 18, 351, y + 26); line(351, y + 26, 362, y + 10); }
    else if (isLocked) { stroke("#7f8c8d"); strokeWeight(3); line(346, y + 11, 360, y + 25); line(360, y + 11, 346, y + 25); }
    if (mouseWentDown("leftButton") && !isLocked && mouseX > 20 && mouseX < 380 && mouseY > y && mouseY < y + 36) { skillStates[i] = !skillStates[i]; showSkillError = false; }
  }

  if (showSkillError) { fill("red"); noStroke(); textAlign(CENTER, CENTER); textSize(15); textStyle(BOLD); text("Select at least 1 skill to begin!", 200, 335); textStyle(NORMAL); }
  else if (gameMode === "hard") { fill("#e74c3c"); noStroke(); textAlign(CENTER, CENTER); textSize(12); textStyle(BOLD); text("WARNING: Maximum Velocity includes\nnegative powers and exponents!", 200, 335); textStyle(NORMAL); }

  fill("gray"); stroke("white"); strokeWeight(2); rect(40, 350, 140, 40); fill("white"); noStroke(); textAlign(CENTER, CENTER); textSize(18); textStyle(BOLD); text("Menu", 110, 370);
  fill("#27ae60"); stroke("white"); strokeWeight(2); rect(220, 350, 140, 40); fill("white"); noStroke(); textAlign(CENTER, CENTER); textSize(18); textStyle(BOLD); text("Confirm", 290, 370); textStyle(NORMAL);

  // Handle Button Clicks
  if (mouseWentDown("leftButton")) {
    if (mouseY > 350 && mouseY < 390) {
      if (mouseX > 40 && mouseX < 180) {
        gameState = "start";
      } else if (mouseX > 220 && mouseX < 360) {
        var anyCheckedClick = false;
        for (var j = 0; j < 6; j++) { if (skillStates[j]) anyCheckedClick = true; }
        if (!anyCheckedClick) showSkillError = true; else { showSkillError = false; startGame(); }
      }
    }
  }

  // Keyboard shortcut to start game
  if (keyWentDown("space") || keyWentDown("enter")) {
    var anyChecked = false;
    for (var j = 0; j < 6; j++) { if (skillStates[j]) anyChecked = true; }
    if (!anyChecked) showSkillError = true; else { showSkillError = false; startGame(); }
  }
}

function drawMenuButton(x, y, w, h, color, label, sublabel) {
  fill("rgba(0,0,0,0.3)"); rect(x+3, y+3, w, h); fill(color); stroke("white"); strokeWeight(2); rect(x, y, w, h);
  noStroke(); fill("white"); textAlign(CENTER, CENTER);
  if (sublabel) { textSize(16); textStyle(BOLD); text(label, x + w/2, y + h/3 - 4); textSize(12); textStyle(NORMAL); text(sublabel, x + w/2, y + (h*2/3) + 2); }
  else { textSize(16); textStyle(BOLD); text(label, x + w/2, y + h/2); textStyle(NORMAL); }
}

function startGame() {
  gameState = "play"; score = 0; correctAnswersCount = 0;
  if (gameMode === "hard") questionTimeLimit = 6; else questionTimeLimit = 8;
  zoomFrames = 0; shakeFrames = 0; startSequencePhase = 1; startTimer = 120; startLineY = 280; currentStartSpeed = 0;
  expressionString = "GET READY!"; fuelY = -1000;
  lightningFrames = 0; lightningPath = { main: [], branches: [] }; stormPhase = 0; coinPopupTimer = 0;
  damageFrames = 0; dayPhase = 1.0; lightPoles = [-100, 100, 300, 500]; gameOverReason = ""; wrongAnswersList = []; strikes = 0;
  roadDecorations = []; lastSignMessage = ""; lastPickedAnswer = ""; lastQuestionString = "";
  playerWater = 0; playerSand = 0; activeShield = (equipped.boost === "shield");

  roadPatches = []; for (var rp = 0; rp < 8; rp++) roadPatches.push({ x: randomNumber(110, 290), y: rp * 60, s: randomNumber(40, 90) });
  sideTrees = [];
  for (var t = 0; t < 8; t++) {
      sideTrees.push({ x: randomNumber(-10, 75), y: t * 110 - 50, s: randomNumber(12, 22), type: randomNumber(0,4), seed: randomNumber(0, 1000), isSign: false });
      sideTrees.push({ x: randomNumber(325, 410), y: t * 110 - 20, s: randomNumber(12, 22), type: randomNumber(0,4), seed: randomNumber(0, 1000), isSign: false });
  }

  currentScoreMilestone = 0;

  if (gameMode === "hard") {
      oldBiome = "city"; newBiome = "city"; oldBgColor = [90, 100, 110]; newBgColor = [90, 100, 110];
  } else {
      oldBiome = "forest"; newBiome = "forest"; oldBgColor = [0, 128, 0]; newBgColor = [0, 128, 0];
  }

  biomeTransitionY = 500;


  if (gameMode === "easy") { fuel = 50; maxFuel = 50; } else { fuel = 30; maxFuel = 30; }
  speed = 16 / questionTimeLimit; frameCounter = 0;

  player.x = 200; player.y = 350; targetCarX = 200; targetCarY = player.y;

  obstacles.destroyEach(); smokeParticles = [];
}

// Highly optimized static mapping to resolve and cache math values on creation instead of parsing on-the-fly.
function getMathVal(val) {
  if (val === null || val === undefined) return NaN;
  if (typeof val === "number") return val;
  var s = String(val);
  if (s.indexOf("—") !== -1) {
    var parts = s.split("\n—\n"); return getMathVal(parts[0]) / getMathVal(parts[1]);
  }
  var evalMap = "⁻⁰¹²³⁴⁵⁶⁷⁸⁹", normMap = "-0123456789";
  var bStr = "", eStr = "", inExp = false;
  for (var i = 0; i < s.length; i++) {
    var idx = evalMap.indexOf(s[i]);
    if (idx !== -1) { inExp = true; eStr += normMap[idx]; } else { if (!inExp) bStr += s[i]; }
  }
  if (eStr !== "") {
    var isNeg = false;
    if (bStr[0] === "-" && bStr.indexOf("(") === -1) { isNeg = true; bStr = bStr.substring(1); }
    var res = Math.pow(Number(bStr.replace(/[\(\)]/g, "")), Number(eStr));
    return isNeg ? -res : res;
  }
  return Number(s);
}

function resetQuestion() {
  var answerFormat = "normal", currentBase = 1, currentExp = 1, valid = false, trickPool = [], currentOp = -1, powerOfPowerSumTrick = null;
  var activeSkills = []; for (var i = 0; i < 6; i++) { if (skillStates[i]) activeSkills.push(i); }
  if (activeSkills.length === 0) activeSkills = [0, 1, 2, 3, 4, 5];

  while (!valid) {
    var pickedSkill = activeSkills[randomNumber(0, activeSkills.length - 1)];

    if (pickedSkill === 0) {
      exponent = randomNumber(2, 6); base = randomNumber(2, 10);
      if (gameMode === "hard") {
        var hardType = randomNumber(0, 1);
        if (hardType === 0) {
          answer = Math.pow(-base, exponent);
          if (Math.abs(answer) <= 100) {
            expressionString = "(-" + base + ")" + formatExponent(exponent); currentBase = base; currentExp = exponent; answerFormat = "normal";
            var arr = []; for(var i=0; i<exponent; i++) arr.push("(-" + base + ")"); explanationString = "Parentheses mean the negative is grouped:\n" + arr.join(" × "); valid = true;
          }
        } else {
          answer = -1 * Math.pow(base, exponent);
          if (Math.abs(answer) <= 100) {
            expressionString = "-" + base + formatExponent(exponent); currentBase = base; currentExp = exponent; answerFormat = "normal";
            var arr = []; for(var i=0; i<exponent; i++) arr.push(base); explanationString = "No parentheses? Do the exponent FIRST,\nthen make it negative:\n-(" + arr.join(" × ") + ")"; valid = true;
          }
        }
      } else {
        if (Math.pow(base, exponent) <= 100) {
          answer = Math.pow(base, exponent); expressionString = base + formatExponent(exponent); currentBase = base; currentExp = exponent; answerFormat = "normal";
          var arr = []; for(var i=0; i<exponent; i++) arr.push(base); explanationString = base + " multiplied by itself " + exponent + " times:\n" + arr.join(" × "); valid = true;
        }
      }
    }
    else if (pickedSkill === 1 || pickedSkill === 2) {
      answerFormat = "string_power";
      var op = (pickedSkill === 1) ? randomNumber(0, 1) : 2; currentOp = op; var symType = randomNumber(0, 1); var exp1, exp2, trueExp;
      if (gameMode === "easy") {
        base = randomNumber(2, 15);
        if (op === 0) { exp1 = randomNumber(2, 9); exp2 = randomNumber(2, 10 - exp1); }
        else if (op === 1) { exp1 = randomNumber(2, 10); exp2 = randomNumber(2, exp1); }
        else { exp1 = randomNumber(2, 5); exp2 = randomNumber(2, 5); if (exp1 * exp2 === exp1 + exp2) { exp1 = 3; exp2 = 2; } }
      } else {
        base = randomNumber(2, 25);
        if (op === 0) { exp1 = randomNumber(-8, 8); exp2 = randomNumber(-8, 8); }
        else if (op === 1) { exp1 = randomNumber(-8, 8); exp2 = randomNumber(-8, 8); }
        else { exp1 = randomNumber(-5, 5); exp2 = randomNumber(-5, 5); if (exp1 * exp2 === exp1 + exp2) { exp1 = -2; exp2 = 3; } }
      }
      if (op === 0) {
        trueExp = exp1 + exp2; var multSym = symType === 0 ? " × " : " · "; expressionString = base + formatExponent(exp1) + multSym + base + formatExponent(exp2);
        var strExp2 = exp2 < 0 ? "(" + exp2 + ")" : exp2; explanationString = "When multiplying powers with the same base,\nADD the exponents: " + exp1 + " + " + strExp2 + " = " + trueExp;
      } else if (op === 1) {
        trueExp = exp1 - exp2; var divSym = symType === 0 ? " ÷ " : " / "; expressionString = base + formatExponent(exp1) + divSym + base + formatExponent(exp2);
        var strExp2 = exp2 < 0 ? "(" + exp2 + ")" : exp2; explanationString = "When dividing powers with the same base,\nSUBTRACT the exponents: " + exp1 + " - " + strExp2 + " = " + trueExp;
      } else {
        trueExp = exp1 * exp2; powerOfPowerSumTrick = base + formatExponent(exp1 + exp2); expressionString = "(" + base + formatExponent(exp1) + ")" + formatExponent(exp2);
        var strExp2 = exp2 < 0 ? "(" + exp2 + ")" : exp2; explanationString = "Power of a Power Rule:\nMULTIPLY the exponents: " + exp1 + " × " + strExp2 + " = " + trueExp;
      }
      answer = base + formatExponent(trueExp); currentBase = base;
      if (op === 0) { trickPool.push(base + formatExponent(exp1 - exp2)); trickPool.push(base + formatExponent(exp1 * exp2)); }
      else if (op === 1) { trickPool.push(base + formatExponent(exp1 + exp2)); trickPool.push(base + formatExponent(exp1 * exp2)); }
      else { trickPool.push(base + formatExponent(exp1 + exp2)); trickPool.push(base + formatExponent(exp1 - exp2)); }
      if (exp2 !== 0 && exp1 % exp2 === 0) trickPool.push(base + formatExponent(exp1 / exp2));
      trickPool.push(base + formatExponent(trueExp + 1)); trickPool.push(base + formatExponent(trueExp - 1)); valid = true;
    }
    else if (pickedSkill === 3) {
      base = randomNumber(2, 10); exponent = randomNumber(1, 6);
      if (Math.pow(base, exponent) <= 100) {
        currentBase = base; currentExp = exponent; expressionString = base + formatExponent("-" + exponent); answerFormat = "exp_fraction";
        answer = "1\n—\n" + base + formatExponent(exponent); explanationString = "A negative exponent flips the base\nto the denominator:\n1 / " + base + formatExponent(exponent) + " = 1 / " + Math.pow(base, exponent); valid = true;
      }
    }
    else if (pickedSkill === 4) {
      exponent = randomNumber(0, 1); base = randomNumber(2, 15);
      if (gameMode === "hard") {
        var hardType = randomNumber(0, 1);
        if (hardType === 0) { answer = Math.pow(-base, exponent); expressionString = "(-" + base + ")" + formatExponent(exponent); currentBase = base; currentExp = exponent; answerFormat = "normal"; }
        else { answer = -1 * Math.pow(base, exponent); expressionString = "-" + base + formatExponent(exponent); currentBase = base; currentExp = exponent; answerFormat = "normal"; }
      } else { answer = Math.pow(base, exponent); expressionString = base + formatExponent(exponent); currentBase = base; currentExp = exponent; answerFormat = "normal"; }
      if (exponent === 0) { explanationString = "Rule: Any number to the power\nof 0 is ALWAYS 1"; if (gameMode === "hard" && expressionString[0] === "-" && expressionString[1] !== "(") { explanationString = "Negative is OUTSIDE the power of 0.\n-(1) = -1"; } }
      else { explanationString = "Rule: Any number to the power of 1\nis ALWAYS the base number"; } valid = true;
    }
    else if (pickedSkill === 5) {
      base = randomNumber(2, 9); exponent = randomNumber(2, 9); var powerStr = base + formatExponent(exponent); var qType = randomNumber(0, 2);
      if (qType === 0) { expressionString = "Identify: BASE"; answer = "[B]" + powerStr; explanationString = "The BASE is the regular-sized number\nthat gets multiplied repeatedly."; }
      else if (qType === 1) { expressionString = "Identify: EXPONENT"; answer = "[E]" + powerStr; explanationString = "The EXPONENT is the small, raised\nnumber telling how many times to multiply."; }
      else { expressionString = "Identify: POWER"; answer = "[P]" + powerStr; explanationString = "The POWER is the entire expression,\ncombining the base and the exponent."; }
      answerFormat = "vocab"; trickPool = ["[B]" + powerStr, "[E]" + powerStr, "[P]" + powerStr]; trickPool.splice(trickPool.indexOf(answer), 1); valid = true;
    }
    if (valid && expressionString === lastQuestionString) { valid = false; trickPool = []; }
  }

  lastQuestionString = expressionString;
  if (answerFormat === "normal") { answer = Math.round(answer * 100) / 100; }
  var correctNumericValue = (answerFormat === "normal") ? answer : Math.pow(currentBase, currentExp);

  if (gameMode === "hard") {
    if (answerFormat === "normal") { trickPool.push(answer * -1); trickPool.push(currentBase * currentExp); trickPool.push((currentBase * currentExp) * -1); }
    else if (answerFormat === "exp_fraction") { trickPool.push("-" + currentBase + formatExponent(currentExp)); trickPool.push("-1\n—\n" + currentBase + formatExponent(currentExp));
      var fakeDenom = currentBase * currentExp; if (fakeDenom === correctNumericValue) fakeDenom += (currentBase > 2 ? -1 : 1); trickPool.push("1\n—\n" + fakeDenom); }
  }

  var cLane = randomNumber(0, 2);
  fuelOptions = [null, null, null]; fuelOptions[cLane] = answer;
  var forcedLane = -1;
  if (currentOp === 2 && powerOfPowerSumTrick !== null) {
      var others = []; for(var i=0; i<3; i++) if(i !== cLane) others.push(i);
      forcedLane = others[randomNumber(0, 1)]; fuelOptions[forcedLane] = powerOfPowerSumTrick;
  }

  if (answerFormat === "vocab") {
    var tIdx = 0; for (var k = 0; k < 3; k++) { if (k !== cLane) { fuelOptions[k] = trickPool[tIdx]; tIdx++; } }
  } else {
    var ansMath = getMathVal(answer);
    for (var k = 0; k < 3; k++) {
      if (k !== cLane && k !== forcedLane) {
        var isUnique = false, wrongVal, attempts = 0;
        var existingCache = []; for (var f = 0; f < 3; f++) { if (fuelOptions[f] !== null) { existingCache.push({ s: String(fuelOptions[f]), v: getMathVal(fuelOptions[f]) }); } }

        while (!isUnique && attempts < 100) {
          attempts++;
          if ((gameMode === "hard" || answerFormat === "string_power") && trickPool.length > 0 && attempts < 30) { wrongVal = trickPool[randomNumber(0, trickPool.length - 1)]; }
          else {
            if (answerFormat === "exp_fraction") { var wBase = currentBase + randomNumber(-2, 2); if (wBase < 2) wBase = 2; var wExp = currentExp + randomNumber(-1, 2); if (wExp < 1) wExp = 1; wrongVal = "1\n—\n" + wBase + formatExponent(wExp); }
            else if (answerFormat === "string_power") { var rExp = trueExp + randomNumber(-6, 6); if (rExp === trueExp) rExp += 2; wrongVal = currentBase + formatExponent(rExp); }
            else { wrongVal = answer + randomNumber(-15, 15); if (wrongVal === answer) wrongVal += 2; }
          }
          if (attempts > 80) {
            if (answerFormat === "string_power") { wrongVal = currentBase + formatExponent(attempts); }
            else if (answerFormat === "exp_fraction") { wrongVal = "1\n—\n" + currentBase + formatExponent(attempts); }
            else { var aVal = getMathVal(answer); wrongVal = (isNaN(aVal) ? 0 : aVal) + attempts; }
          }

          isUnique = true; var wvStr = String(wrongVal); var wvMath = getMathVal(wrongVal);
          if (wvMath === ansMath || isNaN(wvMath) || wvStr === String(answer)) { isUnique = false; }
          else { for (var c = 0; c < existingCache.length; c++) { if (existingCache[c].v === wvMath || existingCache[c].s === wvStr) { isUnique = false; break; } } }
        }
        fuelOptions[k] = wrongVal;
      }
    }
  }

  fuelY = -350;
  var obsLimit1 = fuelY - 200, obsLimit2 = fuelY + 200;

  for (var o = obstacles.length - 1; o >= 0; o--) { // Optimized reverse loop for garbage cleanup
    var ob = obstacles.get(o);
    if (ob.y > obsLimit1 && ob.y < obsLimit2) { ob.destroy(); }
  }

  var safeLanes = [0, 1, 2]; safeLanes.splice(cLane, 1);
  var sy = fuelY - 250;
  spawnObstacle(lanes[safeLanes[randomNumber(0, safeLanes.length - 1)]], sy, false);
}

function spawnObstacle(x, y, isMerging) {
  var startX = x;
  if (isMerging) { if (x === 128) startX = 40; else if (x === 272) startX = 360; else startX = randomNumber(0, 1) === 0 ? 40 : 360; }
  var obs = createSprite(startX, y, 26, 43);
  obs.visible = false; obs.targetX = x; obs.intentX = x; obs.signalTimer = 0;
  obs.isMerging = isMerging; obs.hasSwerved = false; obs.swerveCooldown = randomNumber(40, 180);
  obs.water = 0; obs.sand = 0;
  var types = ["car", "truck"]; obs.obsType = types[randomNumber(0, 1)];
  var carColors = ["blue", "purple", "white", "fuchsia", "teal", "orange"];
  obs.carColor = carColors[randomNumber(0, 5)];
  obstacles.add(obs);
}

function drawDeepScene(b, yTop, yBottom) {
    if (yTop >= yBottom) return;

    var bCol = [0, 128, 0]; // Default: Forest Green

    if (b === "city" || b === "rain") {
        bCol = [90, 100, 110];
    } else if (b === "desert") {
        bCol = [194, 178, 128];
    } else if (b === "snow") {
        bCol = [224, 247, 250];
    } else if (b === "beach") {
        bCol = [238, 214, 175];
    }

    fill("rgb(" + bCol[0] + "," + bCol[1] + "," + bCol[2] + ")");
    noStroke();
    rect(0, yTop, 400, yBottom - yTop);
}


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
        var targetSpeed = 16 / questionTimeLimit; currentStartSpeed += 0.05;
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

    if (gameMode === "easy" && score >= 75) {
      for (var i = 0; i < 6; i++) { if (skillStates[i] && !unlockedHardSkills[i]) { unlockedHardSkills[i] = true; hasUnlockedHardMode = true; } }
    }

    roadOffset += (activeSpeed * 5 * currentSpeedMult * dir);
    if (roadOffset > 60) roadOffset -= 60; if (roadOffset < -60) roadOffset += 60;

    if (startSequencePhase === 0) {
        fuel -= 0.04;
        if (moveCooldown > 0) moveCooldown--;

        if ((keyWentDown("left") || keyWentDown("a")) && targetCarX > 128) { targetCarX -= 72; moveCooldown = 8; }
        else if ((keyDown("left") || keyDown("a")) && targetCarX > 128 && moveCooldown === 0) { targetCarX -= 72; moveCooldown = 2; }
        if ((keyWentDown("right") || keyWentDown("d")) && targetCarX < 272) { targetCarX += 72; moveCooldown = 8; }
        else if ((keyDown("right") || keyDown("d")) && targetCarX < 272 && moveCooldown === 0) { targetCarX += 72; moveCooldown = 2; }
        if ((keyWentDown("up") || keyWentDown("w")) && targetCarY > 50) { targetCarY -= 24; moveCooldown = 8; }
        else if ((keyDown("up") || keyDown("w")) && targetCarY > 50 && moveCooldown === 0) { targetCarY -= 24; moveCooldown = 2; }
        if ((keyWentDown("down") || keyWentDown("s")) && targetCarY < 350) { targetCarY += 24; moveCooldown = 8; }
        else if ((keyDown("down") || keyDown("s")) && targetCarY < 350 && moveCooldown === 0) { targetCarY += 24; moveCooldown = 2; }

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

    if (fuel <= 0 && startSequencePhase === 0) { fuel = 0; if (gameOverReason === "") gameOverReason = "Ran out of gas!"; gameState = "over"; return; }

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
        } else {
            strikes++;
            if (strikes >= 3) { gameOverReason = "3 Strikes!"; gameState = "over"; return; }
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
             score += (cValue / 10); totalCoins += cValue;
             coinPopupValue = "+$" + (cValue / 100).toFixed(2); coinPopupColor = rgbColor; coinPopupTimer = 60;
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
       if (fuelOptions[pLane] === answer) { score += 10; fuel = Math.min(fuel + 25, maxFuel); correctAnswersCount++;
          if (score >= 200 && gameMode === "easy") {
            gameState = "winSequence"; finishLineY = -100; winCarAccel = 0; engineSoundPlayed = false; speed = 2;
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
            speed = 16 / questionTimeLimit; resetQuestion();
          }
        } else {
          lastPickedAnswer = fuelOptions[pLane];
          var cleanQ = expressionString.replace(/\n/g, " "); var cleanA = String(answer).replace(/\n—\n/g, "/").replace(/\n/g, " "); var cleanP = String(fuelOptions[pLane]).replace(/\n—\n/g, "/").replace(/\n/g, " ");
          wrongAnswersList.push({ q: cleanQ, a: cleanA, picked: cleanP });
          strikes++; playSound("sound://category_hits/retro_game_simple_impact_1.mp3");
          if (strikes >= 3) gameOverReason = "3 Strikes! I'm sure your brain is exhaust-ed.";
          shakeFrames = 30; gameState = "paused"; pauseTimer = 150;
          coinActive = false; coinSprite.x = -100; coinSprite.velocityX = 0;
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
        if (tree.signText === "BRILLIANT" || tree.signText === "YOU'RE\nAWESOME" || tree.signText === "AMAZING" || tree.signText === "Mr. Hardy\n= GOAT!" || tree.signText === "EXPONENT\nEXPERT!") textSize(11);
        else if (tree.signText === "YOU GOT\nTHIS!" || tree.signText === "YOU LOVE\nMATH!") textSize(12); else textSize(14);
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
    fill("yellow"); stroke("black"); strokeWeight(3); textSize(30); textAlign(CENTER, CENTER); textStyle(BOLD); text("FINISH", 200, finishLineY + 20); textStyle(NORMAL); noStroke();
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
      var fParts = optStr.split("\n—\n"); textSize(19); drawSupText(fParts[0], targetX, fuelY - 10);
      stroke("black"); strokeWeight(2); line(targetX - 10, fuelY + 2, targetX + 10, fuelY + 2);
      noStroke(); drawSupText(fParts[1], targetX, fuelY + 21); // pushed down from +14: the denominator's exponent digit is raised, so it needs extra clearance below the bar
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
    var emitFreq = (equipped.trail !== "none") ? 2 : 5;
    if (frameCounter % emitFreq === 0) {
      var dy = (activeSpeed * 4 * currentSpeedMult + 2) * dir;
      var py = player.y + 41;
      var emitPoints = (equipped.car === "superhero") ? [player.x] : [player.x - 8, player.x + 8];
      for (var ep = 0; ep < emitPoints.length; ep++) {
          var px = emitPoints[ep] + randomNumber(-2, 2);
          if (equipped.trail === "fire") {
        // Shoots tight, fast streams out of dual exhaust positions behind the car
        smokeParticles.push({ type: "fire", x: player.x - 7, y: player.y + 40, size: randomNumber(5, 8), alpha: 1.0, dy: dy * 1.3, dx: randomNumber(-4, 4) / 10 });
        smokeParticles.push({ type: "fire", x: player.x + 7, y: player.y + 40, size: randomNumber(5, 8), alpha: 1.0, dy: dy * 1.3, dx: randomNumber(-4, 4) / 10 });
    }

          else if (equipped.trail === "blue") { smokeParticles.push({ type: "glow", c: "0,150,255,", x: px, y: py, size: randomNumber(4, 8), alpha: 0.9, dy: dy }); }
          else if (equipped.trail === "red") { smokeParticles.push({ type: "glow", c: "255,50,50,", x: px, y: py, size: randomNumber(4, 8), alpha: 0.9, dy: dy }); }
          else if (equipped.trail === "pink") { smokeParticles.push({ type: "glow", c: "255,105,180,", x: px, y: py, size: randomNumber(4, 8), alpha: 0.9, dy: dy }); }
          else if (equipped.trail === "bubbles") { smokeParticles.push({ type: "bubbles", x: px, y: py, size: randomNumber(3, 8), alpha: 0.9, dy: dy * 0.6, phase: randomNumber(0, 100) }); }
          else if (equipped.trail === "money") {
             if (frameCounter % 6 === 0) {
                 for (var i = 0; i < 2; i++) {
                   smokeParticles.push({ type: "money", x: player.x + randomNumber(-15, 15), y: player.y + 35, size: randomNumber(7, 11), alpha: 1.0, dy: dy * randomNumber(7, 12) / 10, dx: randomNumber(-30, 30) / 10, rot: randomNumber(0, 360), rotSpeed: randomNumber(-8, 8) });
                 }
             }
          }
          else { smokeParticles.push({ type: "smoke", x: px, y: py, size: randomNumber(3, 6), alpha: 1.0, dy: dy }); }
      }
    }
  }

  for (var s = smokeParticles.length - 1; s >= 0; s--) {
    var p = smokeParticles[s];
    if (!isFrozen) {
        p.y += p.dy;
        if (p.type === "spark") { p.x += p.dx; p.alpha -= 0.1; }
        else if (p.type === "fire") { p.size -= 0.24; p.alpha -= 0.05; p.x += Math.sin(frameCounter * 0.4 + p.y * 0.15) * 0.8 + p.dx; }
        else if (p.type === "glow") { p.size -= 0.15; p.alpha -= 0.06; }
        else if (p.type === "bubbles") { p.x += Math.sin(p.phase + p.y * 0.05) * 1.5; p.size += 0.05; p.alpha -= 0.04; }
        else if (p.type === "money") { p.alpha -= 0.03; p.x += p.dx; p.rot += p.rotSpeed; }
        else { p.size += 0.3; p.alpha -= 0.05; }
    }

    if (p.alpha <= 0 || p.size <= 0) {
        if (!isFrozen) smokeParticles.splice(s, 1);
    }
    else {
        if (p.type === "fire") {
            noStroke();

            // Layer 1: Soft Outer Red Glow Edge
            fill("rgba(231, 76, 60, " + (p.alpha * 0.45) + ")");
            ellipse(p.x, p.y, p.size * 2.8 + randomNumber(-1,1), p.size * 3.4 + randomNumber(-1,1));

            // Layer 2: Core Bright Orange Flame Body
            fill("rgba(255, 120, 0, " + p.alpha + ")");
            ellipse(p.x, p.y, p.size * 2.0, p.size * 2.5);

            // Layer 3: Blazing White Afterburner Center (Only visible close to exhaust tips)
            if (p.alpha > 0.45) {
                fill("rgba(255, 255, 255, " + (p.alpha * 0.95) + ")");
                ellipse(p.x + randomNumber(-1,1), p.y - 1, p.size * 1.1, p.size * 1.4);
            }
        }

        else if (p.type === "spark") { fill("rgba(255, 200, 0, " + p.alpha + ")"); noStroke(); rect(p.x, p.y, p.size, p.size * 2); }
        else if (p.type === "glow") { fill("rgba(" + p.c + (p.alpha * 0.4) + ")"); noStroke(); ellipse(p.x, p.y, p.size * 2.5, p.size * 2.5); fill("rgba(255,255,255," + p.alpha + ")"); ellipse(p.x, p.y, p.size, p.size); }
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
        fill("rgba(255,255,255," + alphaGo + ")"); textAlign(CENTER, CENTER); textSize(50); textStyle(BOLD); text("GO!", 200, 204); textStyle(NORMAL);
    }
  }

  stroke("black"); strokeWeight(2); fill("white"); rect(-2, -2, 404, 47);
  fill("black"); noStroke(); textAlign(LEFT, CENTER); textSize(20); text("Score: " + score, 10, 23);
  stroke("black"); strokeWeight(1); fill("black"); rect(310, 10, 80, 25);
  if (fuel > 25) fill("lime"); else if (fuel > 10) fill("yellow"); else { if (Math.floor(frameCounter / 4) % 2 === 0) fill("red"); else fill("white"); }
  rect(310, 10, (fuel / maxFuel) * 80, 25);
  noStroke(); fill("black"); textAlign(CENTER, CENTER); textSize(15); textStyle(BOLD); text("FUEL", 350, 24); textStyle(NORMAL);
  noStroke(); fill("black"); textAlign(CENTER, CENTER);

  if (expressionString.indexOf("Identify:") === 0) { textSize(18); drawSupText(expressionString, 200, 23); }
  else if (expressionString.length >= 20) { textSize(15); drawSupText(expressionString, 200, 23); }
  else if (expressionString.length > 14) { textSize(19); drawSupText(expressionString, 200, 23); }
  else { textSize(24); drawSupText(expressionString, 200, 23); }

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

  if (!isFrozen && zoomFrames > 0) { zoomFrames--; if (zoomFrames === 0) speed = 16 / questionTimeLimit; }

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
  fill("black"); noStroke(); textAlign(CENTER, CENTER); textSize(14); textStyle(BOLD); text("MENU", 40, 375); textStyle(NORMAL);
  if (mouseWentDown("leftButton") && mouseX > 10 && mouseX < 70 && mouseY > 360 && mouseY < 390) gameState = "start";
}

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
  var h4 = explanationString.split('\n').length * 18; if (explanationString.indexOf("A negative exponent flips") === 0) h4 = 80;
  var h5 = 14;
  var totalContentHeight = h1 + h2 + h3 + h4 + h5; var gap = (bottomY - topY - totalContentHeight) / 4;

  var currentY = topY;
  noStroke(); fill("red"); textSize(30); textStyle(BOLD); text("INCORRECT!", 200, currentY); textStyle(NORMAL);

  currentY += h1 + gap;
  fill("white"); if (expressionString.indexOf("Identify:") === 0) textSize(18); else textSize(22); drawSupText("Question: " + expressionString, 200, currentY, CENTER, TOP);

  currentY += h2 + gap;
  var leftY = currentY; var rightY = currentY;

  fill("red"); textSize(18); textStyle(BOLD); text("Your Answer:", 100, leftY); textStyle(NORMAL); leftY += 20;
  if (pickedIsFraction) {
    var pParts = pAns.split("\n—\n"); fill("white"); textSize(18); drawSupText(pParts[0], 100, leftY, CENTER, TOP); stroke("white"); strokeWeight(2); line(90, leftY + 22, 110, leftY + 22); noStroke(); drawSupText(pParts[1], 100, leftY + 35, CENTER, TOP); leftY += 60;
  } else if (pIsVocab) {
    fill("white"); textSize(22); drawSupText(pAns, 100, leftY, CENTER, TOP, pCircleType); noStroke(); leftY += 30;
  } else { fill("white"); textSize(22); drawSupText(pAns, 100, leftY, CENTER, TOP); leftY += 30; }

  fill("lime"); textSize(18); textStyle(BOLD); text("Correct Answer:", 300, rightY); textStyle(NORMAL); rightY += 20;
  if (correctIsFraction) {
    var cParts = cAns.split("\n—\n"); fill("white"); textSize(18); drawSupText(cParts[0], 300, rightY, CENTER, TOP); stroke("white"); strokeWeight(2); line(290, rightY + 22, 310, rightY + 22); noStroke(); drawSupText(cParts[1], 300, rightY + 35, CENTER, TOP); rightY += 60;
  } else if (cIsVocab) {
    fill("white"); textSize(22); drawSupText(cAns, 300, rightY, CENTER, TOP, cCircleType); noStroke(); rightY += 30;
  } else { fill("white"); textSize(22); drawSupText(cAns, 300, rightY, CENTER, TOP); rightY += 30; }

  currentY += h3 + gap;

  if (explanationString.indexOf("A negative exponent flips") === 0) {
    var expParts = explanationString.split(":\n"); fill("lime"); textSize(15); textLeading(18); text(expParts[0] + ":", 200, currentY);
    var eqY = currentY + 40; var eqParts = expParts[1].split(" = "); var leftDenom = eqParts[0].substring(4); var rightDenom = eqParts[1].substring(4);
    text("1", 150, eqY); stroke("lime"); strokeWeight(2); line(138, eqY + 22, 162, eqY + 22); noStroke(); drawSupText(leftDenom, 150, eqY + 34, CENTER, TOP);
    text("=", 200, eqY + 12); text("1", 250, eqY); stroke("lime"); strokeWeight(2); line(238, eqY + 22, 262, eqY + 22); noStroke(); drawSupText(rightDenom, 250, eqY + 34, CENTER, TOP);
  } else { fill("lime"); textSize(15); textLeading(18); text(explanationString, 200, currentY); }

  currentY += h4 + gap;
  fill("white"); textSize(14); textStyle(BOLD);

  if (pauseTimer > 0) {
    pauseTimer--; var secondsLeft = Math.ceil(pauseTimer / 30); text("Wait " + secondsLeft + " seconds to continue...", 200, currentY);
  } else {
    if (Math.floor(Date.now() / 500) % 2 === 0) { if (strikes >= 3) text("Press any key to finish", 200, currentY); else text("Press any key to continue", 200, currentY); }
    if (keyWentDown("left") || keyWentDown("a") || keyWentDown("right") || keyWentDown("d") || keyWentDown("up") || keyWentDown("w") || keyWentDown("down") || keyWentDown("s") || keyWentDown("space") || keyWentDown(" ") || keyWentDown("enter") || keyWentDown("Enter")) {
      if (strikes >= 3) gameState = "over"; else { shakeFrames = 15; damageFrames = 90; resetQuestion(); moveCooldown = 15; gameState = "play"; }
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

  noStroke(); fill("red"); textSize(32); textStyle(BOLD); text("GAME OVER", 200, currentY); textStyle(NORMAL); currentY += h1 + gap;
  fill("yellow"); textSize(14); text(gameOverReason, 200, currentY); currentY += h2 + gap;

  var displayMode = gameMode === "easy" ? "STREET RACING" : "MAXIMUM VELOCITY";
  fill("orange"); textSize(14); text("MODE: " + displayMode, 200, currentY);
  fill("white"); textSize(22); text("Final Score: " + score, 200, currentY + 20); currentY += h3 + gap;

  fill("cyan"); textSize(16); text("Mistakes to Review:", 200, currentY);
  var reviewStartY = currentY + 25;
  if (wrongAnswersList.length === 0) {
    fill("lime"); textSize(14); if (gameOverReason === "Crashed into an enemy car!") text("No math mistakes made.", 200, reviewStartY); else text("No mistakes made… except driving ones", 200, reviewStartY);
  } else {
    for (var w = 0; w < maxShow; w++) {
      var wa = wrongAnswersList[wrongAnswersList.length - 1 - w]; var itemY = reviewStartY + (w * 35);
      fill("white"); noStroke(); textAlign(LEFT, TOP);
      var qText = wa.q; if (qText.indexOf("Identify: ") === 0) qText = qText.replace("Identify: ", "");
      var fullQ = "Q: " + qText; if (fullQ.length > 22) textSize(14); else if (fullQ.length > 17) textSize(16); else textSize(18);
      drawSupText(fullQ, 35, itemY + 4, LEFT, TOP); textSize(16); fill("#ff6b6b"); text("You:", 180, itemY + 5); fill("#2ecc71"); text("Cor:", 280, itemY + 5);
      drawReviewItem(wa.picked, 230, itemY + 12); drawReviewItem(wa.a, 330, itemY + 12); textAlign(CENTER, TOP);
    }
    if (wrongAnswersList.length > 3) { fill("gray"); textSize(10); text("+ " + (wrongAnswersList.length - 3) + " more unlisted mistake(s)", 200, reviewStartY + (maxShow * 35)); }
  }
  currentY += h4 + gap; var btnY = currentY;

  fill("gray"); stroke("black"); strokeWeight(2); rect(40, btnY, 150, 40); fill("white"); noStroke(); textSize(20); textAlign(CENTER, CENTER); textStyle(BOLD); text("Menu", 115, btnY + 20);
  fill("green"); stroke("black"); strokeWeight(2); rect(210, btnY, 150, 40); fill("white"); noStroke(); textSize(20); textAlign(CENTER, CENTER); textStyle(BOLD); text("Play Again", 285, btnY + 20); textStyle(NORMAL);

  if (mouseWentDown("leftButton")) {
    if (mouseY > btnY && mouseY < btnY + 40) { if (mouseX > 40 && mouseX < 190) gameState = "start"; else if (mouseX > 210 && mouseX < 360) startGame(); }
  }
  if (keyWentDown("space") || keyWentDown("enter")) startGame();
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


  if (dayPhase > 0) {
    noStroke(); fill("rgba(0, 0, 0, " + (dayPhase * 0.4).toFixed(2) + ")");
    var shadowStretchX = (1 - dayPhase) * 30; var shadowStretchW = (1 - dayPhase) * 15;
    if (type === "car") rect(cx - 10 + shadowStretchX, cy + 5, 26 + shadowStretchW, 43);
    else if (type === "truck") rect(cx - 11 + shadowStretchX, cy, 28 + shadowStretchW, 60);
  }
  if (type === "car") {
    noStroke(); fill("rgba(255, 255, 0, 0.4)");
    ellipse(cx - 7, cy - 3, 14, 14); ellipse(cx + 7, cy - 3, 14, 14);
    stroke("black"); strokeWeight(1); fill("black");
    rect(cx - 16, cy + 7, 6, 12); rect(cx + 10, cy + 7, 6, 12); rect(cx - 16, cy + 26, 6, 12); rect(cx + 10, cy + 26, 6, 12);

    fill(color); rect(cx - 13, cy, 26, 43);
    fill("rgba(255,255,255,0.2)"); rect(cx - 10, cy + 10, 20, 22);
    fill("lightblue"); rect(cx - 8, cy + 7, 16, 7); rect(cx - 8, cy + 29, 16, 6);

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

    fill("yellow"); ellipse(cx - 7, cy + 1, 6, 6); ellipse(cx + 7, cy + 1, 6, 6);
    fill("red"); ellipse(cx - 7, cy + 42, 6, 6); ellipse(cx + 7, cy + 42, 6, 6);

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
        playSound("sound://category_vehicles/formula_1_car_pass_by.mp3");
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
  text("YOU WIN!", 200, 100);

  // Display the Final Score
  fill("white");
  textSize(24);
  text("Final Score: " + score, 200, 170);

  // Display Coins
  fill("yellow");
  textSize(20);
  text("Total Wealth: $" + (totalCoins / 100).toFixed(2), 200, 210);

  // Prompt for Hard Mode
  if (gameMode === "easy") {
    fill("cyan");
    textSize(16);
    textStyle(BOLD);
    text("Try MAXIMUM VELOCITY for bigger rewards!", 200, 255);
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
  text("Menu", 115, 320);

  // Draw Play Again Button
  fill("green");
  stroke("black");
  strokeWeight(2);
  rect(210, 300, 150, 40);
  fill("white");
  noStroke();
  textSize(20);
  textStyle(BOLD);
  text("Play Again", 285, 320);
  textStyle(NORMAL);

// Handle Button Clicks
  if (mouseWentDown("leftButton")) {
    if (mouseY > 300 && mouseY < 340) {
      if (mouseX > 40 && mouseX < 190) {
         gameState = "start";
      } else if (mouseX > 210 && mouseX < 360) {
         startGame();
      }
    }
  }

  // Allow keyboard shortcuts to restart
  if (keyWentDown("space") || keyWentDown("enter")) {
    startGame();
  }
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
  text("🔥 UNLOCKED! 🔥", 200, 80);

  fill("white");
  textSize(22);
  text("MAXIMUM VELOCITY MODE", 200, 130);

  fill("lightgray");
  textSize(16);
  textStyle(NORMAL);
  text("You have mastered the basics.\nAre you ready for the ultimate challenge?\n(Bigger risks, much bigger rewards!)", 200, 180);

  // --- BIG GREEN BUTTON (Start Max Velocity) ---
  fill("lime");
  stroke("white");
  strokeWeight(3);
  rect(40, 250, 320, 60, 10);

  fill("black");
  noStroke();
  textSize(20);
  textStyle(BOLD);
  text("START MAXIMUM VELOCITY", 200, 280);

  // --- SMALL GRAY BUTTON (Continue) ---
  fill("gray");
  stroke("white");
  strokeWeight(2);
  rect(100, 340, 200, 40, 10);

  fill("white");
  noStroke();
  textSize(16);
  textStyle(NORMAL);
  text("Continue Normal Mode", 200, 360);

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
        playSound("sound://category_pop/click.mp3"); // Optional sound
        gameState = "play"; // Unpause and keep going
    }
  }
}
