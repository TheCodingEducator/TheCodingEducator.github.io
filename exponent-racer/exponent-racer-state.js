var gameState = "start";
var exitConfirmPending = false;
var gameMode = "";
var score = 0;
var totalCoins = 0;
var fuel = 50, maxFuel = 50, questionTimeLimit = 8, speed = 1, roadOffset = 0, frameCounter = 0;
var moveCooldown = 0, gameOverReason = "", wrongAnswersList = [], strikes = 0;
var finishLineY = -100, winCarAccel = 0, engineSoundPlayed = false;
var maxVelocityPromptShown = false;

// Shop & Customization Variables
var activeShield = false, shopTab = "cars", shopScrollY = 0, usedSecondChance = false;
var usedTimeFreeze = false, timeFreezeFramesLeft = 0, questionCheckpoint = null;

var unlockedItems = {
  cars: ["red"],
  trails: ["none"],
  boosts: ["none"]
};

var equipped = { car: "red", trail: "none", boost: "none", world: "default" };

// ---------- SAVED PROGRESS (coins, unlocks, equipped cosmetics) ----------
// Purely local to this browser - never sent anywhere, not tied to any
// name or identity, just anonymous play-progress state (same category
// as a game remembering your last settings). Lets a student close the
// tab and come back with their coins/unlocks/hard-mode progress intact
// instead of starting over every visit.
function loadExponentProgress() {
  try {
    var c = localStorage.getItem('exprace_coins');
    if (c!==null) { var n=parseInt(c,10); if (!isNaN(n)&&n>=0) totalCoins=Math.min(999999, n); }
    var u = localStorage.getItem('exprace_unlocked');
    if (u!==null) { var uo=JSON.parse(u); if (uo&&uo.cars&&uo.trails&&uo.boosts) unlockedItems=uo; }
    var e = localStorage.getItem('exprace_equipped');
    if (e!==null) { var eo=JSON.parse(e); if (eo) equipped=Object.assign(equipped,eo); }
    var h = localStorage.getItem('exprace_hard_unlocked');
    if (h!==null) hasUnlockedHardMode = (h==='true');
    var hs = localStorage.getItem('exprace_hard_skills');
    if (hs!==null) { var hsa=JSON.parse(hs); if (Array.isArray(hsa)&&hsa.length===6) unlockedHardSkills=hsa; }
    var hhs = localStorage.getItem('exprace_hard_high_score');
    if (hhs!==null) { var hn=parseInt(hhs,10); if (!isNaN(hn)&&hn>=0) hardHighScore=hn; }
    var cc = localStorage.getItem('exprace_cheat_used');
    if (cc!==null) cheatCoinsUsed = (cc==='true');
  } catch (e2) {}
  // "red" car / "none" trail/boost are always free starter defaults
  if (unlockedItems.cars.indexOf("red")===-1) unlockedItems.cars.push("red");
  if (unlockedItems.trails.indexOf("none")===-1) unlockedItems.trails.push("none");
  if (unlockedItems.boosts.indexOf("none")===-1) unlockedItems.boosts.push("none");
}
function saveExponentProgress() {
  try {
    localStorage.setItem('exprace_coins', String(totalCoins));
    localStorage.setItem('exprace_unlocked', JSON.stringify(unlockedItems));
    localStorage.setItem('exprace_equipped', JSON.stringify(equipped));
    localStorage.setItem('exprace_hard_unlocked', String(hasUnlockedHardMode));
    localStorage.setItem('exprace_hard_skills', JSON.stringify(unlockedHardSkills));
    localStorage.setItem('exprace_hard_high_score', String(hardHighScore));
    localStorage.setItem('exprace_cheat_used', String(cheatCoinsUsed));
  } catch (e) {}
}
// Saves shortly after a burst of coins instead of on the exact frame each one is collected
var saveTimer = 0;
function saveSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(function () { saveTimer = 0; saveExponentProgress(); }, 1200);
}
// Safety net: flush whatever's in memory the instant the tab is hidden
// or closed (switching tabs, closing the browser, navigating away
// mid-run), so nothing earned since the last checkpoint save is lost
// even if a future code path forgets to call saveExponentProgress().
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') saveExponentProgress();
});
window.addEventListener('pagehide', saveExponentProgress);

// The plain flat-color cars are free and never need "buying" - they're
// bundled into one "classic" shop row (see drawShopScreen) that shows all
// of them as a single lineup of clickable swatches instead of 9 separate
// rows, so CLASSIC_CAR_COLORS is the source of truth for both that row and
// for which car ids can be equipped without going through unlock/price logic.
var CLASSIC_CAR_COLORS = ["red", "blue", "green", "purple", "orange", "pink", "yellow", "black"];

var shopData = {
  cars: [
    { id: "classic", name: tl("Classic Colors", "Colores clásicos"), price: 0, isColorPicker: true },
    { id: "ghost", name: tl("Ghost Car", "Auto fantasma"), price: 300 }, { id: "robot", name: "Robot", price: 300 },
    { id: "alien", name: tl("UFO", "OVNI"), price: 300 }, { id: "dragon", name: tl("Dragon", "Dragón"), price: 300 },
    { id: "bird", name: tl("Bird", "Pájaro"), price: 300 }, { id: "swervingtruck", name: tl("Swerving Truck", "Camión zigzag"), price: 300 },
    { id: "plane", name: tl("Crop Duster", "Avioneta"), price: 300 }, { id: "motorcycle", name: tl("Motorcycle", "Moto"), price: 300 },
    { id: "vintage", name: tl("Hamburger Car", "Auto hamburguesa"), price: 300 }, { id: "supercar", name: tl("Supercar", "Superauto"), price: 300 },
    { id: "superhero", name: tl("Superhero", "Superhéroe"), price: 1000 }, { id: "rainbow", name: tl("Rainbow Car", "Auto arcoíris"), price: 1000 }
  ],

  // Ordered cheapest-first / most-expensive-last within each shop tab.
  trails: [
    { id: "none", name: tl("Exhaust", "Humo"), price: 300 }, { id: "fire", name: tl("Fire Trail", "Fuego"), price: 300 },
    { id: "blue", name: tl("Spark Trail", "Chispas"), price: 300 }, { id: "red", name: tl("Ember Trail", "Brasas"), price: 300 },
    { id: "pink", name: tl("Heart Trail", "Corazones"), price: 300 }, { id: "purple", name: tl("Twinkle Trail", "Destellos"), price: 300 },
    { id: "bubbles", name: tl("Bubbles", "Burbujas"), price: 500 },
    { id: "gold", name: tl("Diamond Trail", "Diamantes"), price: 500 }, { id: "ice", name: tl("Snowflake Trail", "Copos de nieve"), price: 500 },
    { id: "rainbow", name: tl("Rainbow Trail", "Arcoíris"), price: 1000 }, { id: "money", name: tl("Money Trail", "Dinero"), price: 1000 }
  ],
  // No Powerup always sits first regardless of price, since it's the
  // "none of these" baseline option, not something being price-compared.
  // Everything else after it is priced by how much of an edge it actually
  // gives in a run. Electric is priced lowest of all - per feedback, fuel
  // almost never actually runs out in practice, so removing that risk
  // entirely isn't worth much. Second Chance protects against the same
  // things Shield does (plus wrong answers) but only comes up on the
  // rarer "already about to fail" moment, so it's priced below Shield/
  // Time Freeze. Magnet and Double Coins never prevent a loss - they're
  // pure economy/QoL.
  boosts: [
    { id: "none", name: tl("No Powerup", "Sin poder"), price: 500 },
    { id: "fuelsaver", name: tl("Electric (No Fuel)", "Eléctrico"), price: 200 },
    { id: "doublecoins", name: tl("Double Coins", "Monedas dobles"), price: 500 },
    { id: "magnet", name: tl("Coin Magnet", "Imán de monedas"), price: 600 },
    { id: "secondchance", name: tl("Second Chance", "Otro intento"), price: 700 },
    { id: "shield", name: tl("Forcefield", "Campo de fuerza"), price: 1000 },
    { id: "timefreeze", name: tl("Time Freeze", "Congelar tiempo"), price: 1000 }
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
var hasUnlockedHardMode = false, correctAnswersCount = 0, hardHighScore = 0, cheatCoinsUsed = false;

var lanes = [128, 200, 272];
function nearestLane(x) {
  var best = lanes[0];
  for (var i = 1; i < lanes.length; i++) { if (Math.abs(x - lanes[i]) < Math.abs(x - best)) best = lanes[i]; }
  return best;
}
var base, exponent, answer, expressionString, explanationString;
var fuelOptions = [null, null, null], fuelY = -100, zoomFrames = 0, maxZoomFrames = 100;
var shakeFrames = 0, damageFrames = 0, dayPhase = 1.0, lightPoles = [-100, 100, 300, 500];

// Top-to-Bottom Biome Transition Variables
var oldBiome = "forest", newBiome = "forest";
var biomeTransitionY = 500, currentScoreMilestone = 0;

// Road details and signs
var roadDecorations = [], spawnSignNext = false;
var signMessages = [tl("KEEP\nIT UP!", "¡SIGUE\nASÍ!"), tl("MATH\nRULES!", "¡VIVAN LAS\nMATES!"), tl("GREAT\nJOB!", "¡BUEN\nTRABAJO!"), tl("YOU GOT\nTHIS!", "¡TÚ\nPUEDES!"), tl("KEEP\nGOING", "¡NO TE\nDETENGAS!"), tl("AMAZING", "¡INCREÍBLE!"), tl("YOU'RE\nAWESOME", "¡ERES\nGENIAL!"), tl("YOU LOVE\nMATH!", "¡AMAS LAS\nMATES!"), "Mr. H\n= GOAT!", tl("EXPONENT\nEXPERT!", "¡GENIO DE\nEXPONENTES!")];
var lastSignMessage = "", lastPickedAnswer = "", lastQuestionString = "", pauseTimer = 0;

var skillStates = [false, false, false, false, false, false], showSkillError = false;   // students pick the skills they want to practice

loadExponentProgress();

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
  // screen readers get the whole power ("3 to the power of 4"), not the separate pieces drawn below
  if (window.SiteSR) { SiteSR.line(str); return SiteSR.quiet(function () { drawSupPieces(str, x, y, hAlign, vAlign, circleType, circleStroke, circleStrokeWeight); }); }
  drawSupPieces(str, x, y, hAlign, vAlign, circleType, circleStroke, circleStrokeWeight);
}
function drawSupPieces(str, x, y, hAlign, vAlign, circleType, circleStroke, circleStrokeWeight) {
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
    var segY = seg.isSup ? (y - supRaise + baseShift) : (y + baseShift);
    textSize(layout[s].size);
    text(seg.text, cursorX, segY);
    layout[s].left = cursorX;
    layout[s].centerY = (vAlign === TOP) ? (segY + layout[s].size * TOP_ALIGN_CENTER_OFFSET_RATIO) : segY;
    if (seg.isSup) layout[s].centerY -= layout[s].size * 0.065;   // the raised digits' ink sits a touch above the text position - centre the circle on the ink itself
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

    // Circles hug the digits: sized from each digit's actual ink height and width plus a small even margin, so it is clear
    // exactly which number is circled (the base circle stops right at the base, the exponent circle sits only around the exponent).
    var PAD = 4;
    function digitCircle(seg, cx, dW) {
      var inkH = seg.size * DIGIT_INK_HEIGHT_RATIO + PAD * 2;
      var inkW = Math.max(seg.width, seg.size * DIGIT_INK_HEIGHT_RATIO) + PAD * 2 + (dW || 0);
      ellipse(cx, seg.centerY, inkW, inkH);
    }
    if (circleType === "B") {
      digitCircle(baseSeg, baseCenterX - 0.5, -1);        // trimmed on the right so it does not run into the exponent
    } else if (circleType === "E") {
      digitCircle(expSeg, expCenterX);
    } else if (circleType === "P") {
      // one ellipse just big enough to enclose both digits (base at lower left, raised exponent at upper right)
      var baseInkHalf = (baseSeg.size * DIGIT_INK_HEIGHT_RATIO) / 2;
      var expInkHalf = (expSeg.size * DIGIT_INK_HEIGHT_RATIO) / 2;
      var top = expSeg.centerY - expInkHalf - PAD;
      var bottom = baseSeg.centerY + baseInkHalf + PAD;
      var left = baseSeg.left - PAD, right = expSeg.left + expSeg.width + PAD;
      ellipse((left + right) / 2, (top + bottom) / 2, (right - left) * 1.3, (bottom - top) * 1.3);
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
