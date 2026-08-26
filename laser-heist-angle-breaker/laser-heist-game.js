// ================================================================
// LASER HEIST: ANGLE BREAKER
// A Code.org Game Lab game about angle relationships:
// supplementary, complementary, vertical, and parallel-lines-with-
// a-transversal angles. Built for Code.org Game Lab (JS mode).
//
// STORY: You're running a heist crew. Every room hides a different
// security system, and every system runs on angles:
//   - Laser Grids (COMPLEMENTARY) -- a beam clips a corner mirror
//     and splits into two paths that always sum to 90 degrees.
//     Know one, know exactly where the other one is aimed.
//   - Watch Teams (SUPPLEMENTARY) -- two guards eyeball a hallway
//     from opposite ends, their combined sightline a flat 180
//     degrees. Work out how much of that line is dead space and
//     the crew slips through the gap.
//   - Security Cameras (VERTICAL ANGLES) -- two cameras stare at
//     each other across the floor. Their blind spots sit directly
//     opposite one another -- equal angles, dead ahead.
//   - Duct Crawl (PARALLEL LINES + TRANSVERSAL) -- two parallel
//     ventilation duct runs, linked by one diagonal connector duct
//     the crew crawls through. Work the crossing angles right and
//     you know exactly which vent you'll come out of.
// Get it right and you drop into a Pac-Man-style sneak room: the
// danger/safe wedge you just solved for becomes a real stationary
// camera cone somewhere in the maze (a different room cell every
// time, not always the center), TWO roaming patrol guards add
// their own moving cones, and you take direct control of the robber
// (arrow keys / WASD) to route through the safe gap and reach a
// glowing exit door -- whose side, and your own start side, both
// change every time. Get spotted mid-sneak and it costs a life: a
// short chase plays out (the robber fleeing off screen with every
// guard on their tail) and then the crew moves straight on to the
// next puzzle -- one catch ends the run at this room.
// Get the ANSWER wrong and it costs a life too -- run out and the
// heist is over.
//
// COMPATIBILITY NOTES (read this if something doesn't run):
//  - Assumes angleMode(DEGREES) is supported (standard in Game Lab's
//    p5-based engine). If not, replace degree values passed to
//    rotate()/arc() with radians via a `deg * Math.PI / 180` helper.
//  - Assumes `mouseIsPressed`, `mouseX`, `mouseY` are available as
//    globals, and `keyDown("a")`-style string keys work for polling.
//    This file does its OWN edge-detection (down-this-frame-but-not-
//    last-frame) on top of those polling primitives, so it does NOT
//    depend on keyWentDown()/mouseWentDown() existing at all.
//  - The illuminated guard/camera cones (drawIlluminatedCone) are
//    built from plain triangle() calls -- the most basic fill
//    primitive available -- rather than beginShape()/vertex(), since
//    that custom-shape API is less consistently available.
//  - Sounds are wrapped in playSfx() which calls playSound() inside
//    a try/catch. Upload matching files in the Game Lab "Assets"
//    panel (or delete the playSfx calls) -- see the SOUND ASSET
//    NAMES list near the bottom of this file.
// ================================================================


// ----------------------------------------------------------------
// SECTION 1: CANVAS + VISUAL CONFIG
// ----------------------------------------------------------------
var CANVAS_W = 400;
var CANVAS_H = 400;

var COLOR_BG            = [8, 10, 22];
var COLOR_BG_GRID       = [18, 22, 40];
var COLOR_PANEL         = [16, 20, 36];
var COLOR_PANEL_BORDER  = [60, 70, 110];
var COLOR_LASER_RED     = [255, 45, 60];
var COLOR_LASER_GREEN   = [60, 255, 140];
var COLOR_LASER_BLUE    = [70, 170, 255];
var COLOR_LASER_GOLD    = [255, 205, 60];
var COLOR_TEXT_MAIN     = [230, 235, 250];
var COLOR_TEXT_DIM      = [140, 150, 175];
var COLOR_TEXT_WARN     = [255, 90, 90];
var COLOR_TEXT_GOOD     = [90, 255, 150];
var COLOR_BUTTON        = [30, 38, 66];
var COLOR_BUTTON_HOVER  = [46, 58, 96];
var COLOR_BUTTON_BORDER = [90, 110, 170];

// The sneak room reads as a hedge maze at night, lit only by the
// camera's and guards' own cones -- a dark slate path between
// near-black hedges, not a sunny daytime garden.
var COLOR_MAZE_PATH      = [40, 44, 52];
var COLOR_MAZE_SHADOW    = [10, 11, 15];
var COLOR_HEDGE_DARK     = [10, 20, 12];

// A stationary camera's cone reads as cold electronic light -- cyan,
// not the guards' warm gold -- so the two hazard types are
// distinguishable at a glance even before you notice which one is
// actually moving.
var COLOR_CAMERA_BEAM    = [90, 210, 255];

// A calmer, more "informational aside" cyan than the gold rule hint
// -- distinct enough that a returning player can tell at a glance
// "this is the real-world tie-in line, not a rule I need to act on."
var COLOR_FIELD_NOTE     = [140, 195, 230];

// The hiding-spot bushes -- a shade lighter/greener than the hedge
// walls so they read as a distinct, inviting patch of foliage rather
// than just more wall.
var COLOR_BUSH           = [34, 70, 36];
var COLOR_BUSH_HIGHLIGHT = [52, 100, 52];

// ---- Room styles ----
// The sneak room's whole environment (walls, floor, hiding spots) is
// re-skinned per style, picked once when the maze is generated (see
// startSneakingPhase) -- a hedge maze with bushes to duck into reads
// fine as an outdoor perimeter, but the same bushes stop making sense
// the moment the walls are supposed to be an indoor vault corridor
// instead. Every style swaps its own matched set (drawMazeWalls,
// drawSneakingScene's floor, and the hiding-spot icon), never mixing
// pieces from two styles in the same room. Guards/cameras/the robber
// itself stay the same security equipment regardless -- only the
// building around them changes.
var ROOM_STYLE_HEDGE = "hedge"; // outdoor perimeter: hedge walls, gravel path, bushes to hide in
var ROOM_STYLE_VAULT = "vault"; // indoor corridor: riveted metal walls, tiled floor, storage crates to hide behind
var ROOM_STYLES = [ROOM_STYLE_HEDGE, ROOM_STYLE_VAULT];
var currentRoomStyle = ROOM_STYLE_HEDGE;

var COLOR_VAULT_WALL         = [50, 55, 68];
var COLOR_VAULT_WALL_SEAM    = [82, 90, 108];
var COLOR_VAULT_FLOOR        = [24, 26, 33];
var COLOR_CRATE              = [92, 68, 42];
var COLOR_CRATE_HIGHLIGHT    = [126, 96, 58];

// Unlockable laser color skins, unlocked at score thresholds.
var LASER_SKINS = [
  { name: "Ruby Red",     unlockScore: 0,    color: [255, 45, 60] },
  { name: "Emerald Grid", unlockScore: 800,  color: [60, 255, 140] },
  { name: "Sapphire Net", unlockScore: 2000, color: [70, 170, 255] },
  { name: "Gold Vault",   unlockScore: 4000, color: [255, 205, 60] },
  { name: "Void Purple",  unlockScore: 7000, color: [180, 90, 255] }
];


// ----------------------------------------------------------------
// SECTION 2: GAME STATE MACHINE CONSTANTS
// ----------------------------------------------------------------
var STATE_TITLE            = "TITLE";
var STATE_INSTRUCTIONS     = "INSTRUCTIONS";
var STATE_MODE_SELECT      = "MODE_SELECT";
var STATE_LEVEL_INTRO      = "LEVEL_INTRO";
var STATE_PLAYING          = "PLAYING";
var STATE_LEVEL_COMPLETE   = "LEVEL_COMPLETE";
var STATE_PAUSE            = "PAUSE";
var STATE_GAME_OVER        = "GAME_OVER";
var STATE_VICTORY          = "VICTORY";
var STATE_HIGH_SCORES      = "HIGH_SCORES";
var STATE_CHALLENGE_INTRO  = "CHALLENGE_INTRO";
var STATE_PRACTICE_SETUP   = "PRACTICE_SETUP";
var STATE_PRACTICE_PLAY    = "PRACTICE_PLAY";

var gameState = STATE_TITLE;
var previousState = STATE_TITLE;


// ----------------------------------------------------------------
// SECTION 3: LEVEL DEFINITIONS
// ----------------------------------------------------------------
// Each level introduces one angle relationship through a different
// piece of the heist. Sector 5 mixes all four together as the
// "vault boss" round.
var LEVELS = [
  {
    id: 0,
    name: "Sector 1: Laser Grid Corner",
    type: "complementary",
    puzzlesToClear: 4,
    timeLimit: 16,
    introText: [
      "A tripwire laser clips a corner mirror and splits",
      "into two beams that always sum to 90 degrees.",
      "Know one beam's angle and you know exactly where",
      "the other one is sweeping -- and where it isn't."
    ]
  },
  {
    id: 1,
    name: "Sector 2: Watch Team Hallway",
    type: "supplementary",
    puzzlesToClear: 4,
    timeLimit: 18,
    introText: [
      "Two guards watch this hallway from opposite doors --",
      "together their sightline is a flat 180-degree line.",
      "Read the active guard's watched angle, then work out",
      "how wide the dead-space gap is before the crew moves."
    ]
  },
  {
    id: 2,
    name: "Sector 3: Camera Crossfire",
    type: "vertical",
    puzzlesToClear: 5,
    timeLimit: 16,
    introText: [
      "Two security cameras face each other across the",
      "floor, sweeping crossed cones of view. Angles directly",
      "opposite each other (vertical angles) are always",
      "equal -- adjacent ones are always supplementary."
    ]
  },
  {
    id: 3,
    name: "Sector 4: Duct Crawl",
    type: "parallel",
    puzzlesToClear: 6,
    timeLimit: 20,
    introText: [
      "Two parallel ventilation runs, linked by one diagonal",
      "connector duct cutting through both -- a transversal",
      "forming eight angles. Corresponding, alternate, and",
      "co-interior rules all apply. Watch the lit pair."
    ]
  },
  {
    id: 4,
    name: "Sector 5: The Vault Core",
    type: "mixed",
    puzzlesToClear: 8,
    timeLimit: 15,
    introText: [
      "Guards, lasers, cameras, and duct crawls --",
      "every system, randomized. This is the final lock",
      "on the vault. Stay sharp -- lives are limited",
      "and every mistake costs one."
    ]
  }
];


// ----------------------------------------------------------------
// SECTION 4: CORE GAME STATE VARIABLES
// ----------------------------------------------------------------
var currentLevelIndex   = 0;
var puzzlesSolvedInLevel = 0;
var currentPuzzle        = null;

// Tracks which relationship types this play session has already seen
// at least one puzzle of -- the very first one of each type gets a
// slower timer and an on-screen rule reminder (see
// FIRST_OF_TYPE_TIME_MULTIPLIER/PUZZLE_HINTS and
// markPuzzleFirstOfTypeIfNew), never reset mid-session, so replaying
// a sector or revisiting a type in Challenge/mixed play doesn't keep
// re-triggering it once you've actually seen it once.
var seenPuzzleTypes = {};
var FIRST_OF_TYPE_TIME_MULTIPLIER = 1.5;
var PUZZLE_HINTS = {
  supplementary: "Supplementary angles add up to 180 degrees.",
  complementary: "Complementary angles add up to 90 degrees.",
  vertical: "Vertical angles (directly across from each other) are equal.",
  parallel: "Matching-position angles are equal; angles on the same side between the lines add up to 180 degrees."
};

// A one-line real-world tie-in shown on every puzzle after the first
// of its type (which gets PUZZLE_HINTS's rule reminder instead -- see
// drawPuzzleContextLine) -- the heist framing is fun, but naming the
// actual profession that uses this exact math is what makes "why does
// this matter" a real answer instead of implied.
var PUZZLE_FIELD_NOTES = {
  supplementary: "Field Note: security techs aim two cameras this way to cover a straight hallway with zero blind spot.",
  complementary: "Field Note: carpenters use this to cut corner trim that meets flush at a perfect right angle.",
  vertical: "Field Note: surveyors and pilots fix a position using two crossing sightlines like this.",
  parallel: "Field Note: civil engineers use this exact math for streets that cut diagonally across a city grid."
};

var currentScore   = 0;
var sessionHighScore = 0;
var bestStreakEver  = 0;

var lives    = 3;
var maxLives = 3;

var streak        = 0;
var scoreMultiplier = 1;

var timerValue = 0;   // seconds remaining on current puzzle
var timerMax   = 15;
var lastFrameMillis = 0;

// Once true, the current puzzle's timer stops counting down and a
// wrong answer retries the SAME puzzle instead of moving to a new
// one -- see updatePuzzleTimer() and retrySamePuzzle().
var hasFailedThisPuzzle = false;

// The player answers by typing the number of degrees and pressing
// ENTER -- this is the only way to submit an answer.
var answerInput = "";
var ANSWER_MAX_DIGITS = 3;

var feedbackMessage = "";
var feedbackColor   = COLOR_TEXT_GOOD;
var feedbackTimer   = 0;

// Practice mode: no timer, no score, no lives -- just questions from
// whichever angle skills the player checked off, with immediate
// right/wrong feedback and an automatic advance to the next one.
var practiceSkills = { supplementary: true, complementary: true, vertical: true, parallel: true };
var practiceAttempted = 0;
var practiceCorrect = 0;
var practiceFeedbackShown = false;
var practiceFeedbackText = "";
var practiceFeedbackColor = COLOR_TEXT_GOOD;
var PRACTICE_ADVANCE_DELAY = 1.8; // seconds of feedback shown before the next question loads
var practiceAdvanceTimer = 0;

var shakeTimer     = 0;
var shakeMagnitude = 0;

// Heist scene: a correct lock-in first plays a brief reaction right
// on the puzzle screen -- the robber visibly slips through the SAFE
// wedge (the one you just solved for) and out toward the door -- then
// hands you direct control for the sneak-past-the-guards minigame. A
// wrong answer plays the mirror image: the robber walks into the
// WATCHED wedge instead, gets spotted, and a guard chases them off
// screen. This is what makes solving the angle feel like it actually
// did something, instead of just scoring points in the background.
var PUZZLE_PHASE_AIMING      = "AIMING";
var PUZZLE_PHASE_ESCAPING    = "ESCAPING";
var PUZZLE_PHASE_MAZE_REVEAL = "MAZE_REVEAL";
var PUZZLE_PHASE_SNEAKING    = "SNEAKING";
var PUZZLE_PHASE_CAUGHT      = "CAUGHT";
var puzzlePhase   = PUZZLE_PHASE_AIMING;
var phaseTimer    = 0;
var CAUGHT_DURATION = 100; // frames the "spotted, then chased off" reaction takes -- long enough for both beats (see computeCaughtScenePositions)
var pendingAdvance  = null; // what to do once the current phase finishes

var ESCAPE_DURATION = 1.1; // seconds -- the "slips through the safe wedge and out the door" reaction after a correct answer
var escapeTimer = 0;

// Which screen edge the chasing guard rushes in from on a wrong
// answer -- rolled once per CAUGHT phase (see handleWrongAnswer) so
// the guard's entrance and the flee direction stay consistent for the
// whole reaction instead of flickering between edges every frame.
var caughtGuardFromLeft = true;

var isChallengeMode = false;
var challengeDifficulty = 1;
var challengePuzzlesSolved = 0;

var currentSkinIndex = 0;
var unlockedSkinIndices = [0];

var menuSelectedIndex = 0;

// Input edge-detection bookkeeping (see COMPATIBILITY NOTES above).
var prevKeys = {};
var prevMouseIsPressed = false;
var mouseClickedEdge = false;

var TRACKED_KEYS = [
  "0","1","2","3","4","5","6","7","8","9",
  "backspace","delete","enter","return",
  "up","down","left","right","space",
  "s","p","escape","y","n",
  "a","d","w"
];


// ----------------------------------------------------------------
// SECTION 6: SCREEN SHAKE (visual feedback on wrong answers)
// ----------------------------------------------------------------
function triggerShake(magnitude, durationFrames) {
  shakeMagnitude = magnitude;
  shakeTimer = durationFrames;
}

function updateShake() {
  if (shakeTimer > 0) {
    shakeTimer -= 1;
  } else {
    shakeMagnitude = 0;
  }
}

function getShakeOffsetX() {
  return shakeTimer > 0 ? random(-shakeMagnitude, shakeMagnitude) : 0;
}

function getShakeOffsetY() {
  return shakeTimer > 0 ? random(-shakeMagnitude, shakeMagnitude) : 0;
}


// ----------------------------------------------------------------
// SECTION 7: SOUND HELPERS
// ----------------------------------------------------------------
// Built-in Game Lab sound library URLs (sound://category/file.mp3).
// No asset upload needed -- these play directly from the library.
var SOUND_URLS = {
  correct:  "sound://category_bell/vibrant_game_correct_answer_1.mp3",
  wrong:    "sound://category_alerts/cartoon_negative_bling.mp3",
  gameover: "sound://category_music/game_over_2.mp3",
  levelup:  "sound://category_achievements/melodic_win_1.mp3",
  // A short synthesized blip rather than a library file (see
  // laser-heist-shim.js's playSound) -- it needs to repeat every
  // fraction of a second while a near-miss lasts without ever
  // getting grating, which a generated tone can be tuned for far
  // more precisely than picking through a library for the closest fit.
  tension:  "synth://tension_blip"
};

function playSfx(name) {
  var url = SOUND_URLS[name];
  if (!url) { return; }
  try {
    playSound(url);
  } catch (e) {
    // Sound library unavailable in this environment -- safe to ignore.
  }
}


// ----------------------------------------------------------------
// SECTION 8: STORAGE (high score persistence)
// ----------------------------------------------------------------
// Game Lab's JS runs in a sandboxed interpreter with no access to
// real browser globals (window, localStorage, document, etc.) --
// touching them crashes the interpreter itself, even inside a
// try/catch. So these are in-memory only: score/streak/skins reset
// each time the program is run. That's fine for a single play
// session; it just won't survive a page refresh.
function loadHighScores() {
  // Nothing to load -- session starts fresh every run.
}

function saveHighScores() {
  // Nothing to persist -- sessionHighScore/bestStreakEver/
  // unlockedSkinIndices already live in memory for this run.
}

function checkSkinUnlocks() {
  for (var i = 0; i < LASER_SKINS.length; i++) {
    if (currentScore >= LASER_SKINS[i].unlockScore && unlockedSkinIndices.indexOf(i) === -1) {
      unlockedSkinIndices.push(i);
      showFeedback("SKIN UNLOCKED: " + LASER_SKINS[i].name, COLOR_LASER_GOLD, 90);
    }
  }
}

// ----------------------------------------------------------------
// SECTION 9: UTILITY FUNCTIONS
// ----------------------------------------------------------------
function randomInt(min, max) {
  return Math.floor(random(min, max + 1));
}

function clampNum(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function normalizeAngle180(angleDeg) {
  var a = angleDeg % 360;
  if (a < 0) { a += 360; }
  return a;
}

function formatSeconds(sec) {
  var s = Math.max(0, Math.ceil(sec));
  return s + "s";
}

function isInsideRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

function showFeedback(msg, colorRGB, durationFrames) {
  feedbackMessage = msg;
  feedbackColor = colorRGB;
  feedbackTimer = durationFrames;
}


// ----------------------------------------------------------------
// SECTION 10: KEY / MOUSE EDGE DETECTION
// ----------------------------------------------------------------
function keyEdge(keyName) {
  var now = safeKeyDown(keyName);
  var prev = !!prevKeys[keyName];
  return now && !prev;
}

// Raw poll of keyDown() that never throws, even if this Game Lab
// build doesn't recognize a given key name.
function safeKeyDown(keyName) {
  try { return !!keyDown(keyName); } catch (e) { return false; }
}

function updateInputEdgeTracking() {
  for (var i = 0; i < TRACKED_KEYS.length; i++) {
    var k = TRACKED_KEYS[i];
    var down = false;
    try { down = keyDown(k); } catch (e) { down = false; }
    prevKeys[k] = down;
  }
  prevMouseIsPressed = (typeof mouseIsPressed !== "undefined") ? mouseIsPressed : false;
}

function computeMouseClickEdge() {
  var isPressed = (typeof mouseIsPressed !== "undefined") ? mouseIsPressed : false;
  return isPressed && !prevMouseIsPressed;
}

function enterKeyEdge() {
  return keyEdge("enter") || keyEdge("return");
}

// Called by Game Lab on every real key-down browser event, regardless
// of frame rate -- unlike keyDown() polling (which only sees whatever
// is held at the instant each draw() frame happens to check), this
// can't ever miss a fast tap. Queues exactly one maze step; see
// stepQueued/stepQueuedDGr/stepQueuedDGc and updateSneakingPhase.
function keyPressed() {
  if (gameState !== STATE_PLAYING || puzzlePhase !== PUZZLE_PHASE_SNEAKING) { return; }
  if (safeKeyDown("left") || safeKeyDown("a")) {
    stepQueued = true; stepQueuedDGr = 0; stepQueuedDGc = -2;
  } else if (safeKeyDown("right") || safeKeyDown("d")) {
    stepQueued = true; stepQueuedDGr = 0; stepQueuedDGc = 2;
  } else if (safeKeyDown("up") || safeKeyDown("w")) {
    stepQueued = true; stepQueuedDGr = -2; stepQueuedDGc = 0;
  } else if (safeKeyDown("down") || safeKeyDown("s")) {
    stepQueued = true; stepQueuedDGr = 2; stepQueuedDGc = 0;
  }
}


// ----------------------------------------------------------------
// SECTION 11: BUTTON UI HELPER
// ----------------------------------------------------------------
function drawButton(x, y, w, h, label, isHovered) {
  if (isHovered) {
    fill(COLOR_BUTTON_HOVER[0], COLOR_BUTTON_HOVER[1], COLOR_BUTTON_HOVER[2]);
  } else {
    fill(COLOR_BUTTON[0], COLOR_BUTTON[1], COLOR_BUTTON[2]);
  }
  stroke(COLOR_BUTTON_BORDER[0], COLOR_BUTTON_BORDER[1], COLOR_BUTTON_BORDER[2]);
  strokeWeight(2);
  rect(x, y, w, h, 6);
  noStroke();
  fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  textAlign(CENTER, CENTER);
  textSize(14);
  text(label, x + w / 2, y + h / 2);
}

// A consistent bordered content box -- used across the menu screens
// to visually group a block of stats/text/controls instead of
// leaving it floating directly on the busy background grid, the same
// way the answer box and practice checkboxes already read as
// distinct panels rather than bare text.
function drawScreenPanel(x, y, w, h) {
  noStroke();
  fill(COLOR_PANEL[0], COLOR_PANEL[1], COLOR_PANEL[2], 235);
  rect(x, y, w, h, 8);
  stroke(COLOR_PANEL_BORDER[0], COLOR_PANEL_BORDER[1], COLOR_PANEL_BORDER[2]);
  strokeWeight(1.5);
  noFill();
  rect(x, y, w, h, 8);
}

function buttonClicked(x, y, w, h) {
  return mouseClickedEdge && isInsideRect(mouseX, mouseY, x, y, w, h);
}

function buttonHovered(x, y, w, h) {
  return isInsideRect(mouseX, mouseY, x, y, w, h);
}


// ----------------------------------------------------------------
// SECTION 12: ANGLE DRAWING PRIMITIVES
// ----------------------------------------------------------------
function drawLaserLine(x1, y1, x2, y2, colorRGB, weight) {
  stroke(colorRGB[0], colorRGB[1], colorRGB[2]);
  strokeWeight(weight || 3);
  line(x1, y1, x2, y2);
  // faint glow pass
  stroke(colorRGB[0], colorRGB[1], colorRGB[2], 70);
  strokeWeight((weight || 3) + 4);
  line(x1, y1, x2, y2);
}

function drawAngleArc(cx, cy, radius, startDeg, endDeg, colorRGB) {
  noFill();
  stroke(colorRGB[0], colorRGB[1], colorRGB[2]);
  strokeWeight(2);
  arc(cx, cy, radius * 2, radius * 2, startDeg, endDeg);
}

function drawAngleLabel(cx, cy, bisectorDeg, radius, labelText, colorRGB) {
  var rad = bisectorDeg * Math.PI / 180;
  var lx = cx + Math.cos(rad) * (radius + 16);
  var ly = cy + Math.sin(rad) * (radius + 16);
  noStroke();
  fill(colorRGB[0], colorRGB[1], colorRGB[2]);
  textAlign(CENTER, CENTER);
  textSize(15);
  text(labelText, lx, ly);
}

function pointOnCircle(cx, cy, radius, angleDeg) {
  var rad = angleDeg * Math.PI / 180;
  return { x: cx + Math.cos(rad) * radius, y: cy + Math.sin(rad) * radius };
}

// The standard geometry "little square" symbol that marks a right
// angle -- proof, not just a claim, that the two arms starting at
// baseDeg and baseDeg+90 really do meet at exactly 90 degrees.
function drawRightAngleMarker(cx, cy, baseDeg, size) {
  var p1 = pointOnCircle(cx, cy, size, baseDeg);
  var p2 = pointOnCircle(cx, cy, size * Math.SQRT2, baseDeg + 45);
  var p3 = pointOnCircle(cx, cy, size, baseDeg + 90);
  noFill();
  stroke(255, 255, 255);
  strokeWeight(1.5);
  line(p1.x, p1.y, p2.x, p2.y);
  line(p2.x, p2.y, p3.x, p3.y);
}

// A guard standing watch -- used to dress up the supplementary
// "watch team" diagrams. facingDeg points the guard inward, toward
// the hallway they're covering.
// The body stays upright always -- rotating a standing figure
// sideways just makes them look like they fell over. No separate
// direction indicator on the guard itself; the illuminated cone
// drawn alongside it already shows which way it's facing.
function drawGuardIcon(x, y) {
  push();
  translate(x, y);

  var jacket = [115, 100, 55];
  var skin = [210, 180, 130];

  // Legs, drawn first so the torso below covers where they attach.
  stroke(60, 45, 20);
  strokeWeight(2.5);
  line(-2, 10, -2, 14);
  line(2, 10, 2, 14);
  noStroke();

  // Arms hang at the sides, ending in a small hand - drawn before the
  // torso rect so it covers the shoulder attachment point cleanly.
  fill(jacket[0], jacket[1], jacket[2]);
  rect(-8, -2, 3, 9, 1.5);
  rect(5, -2, 3, 9, 1.5);
  fill(skin[0], skin[1], skin[2]);
  ellipse(-6.5, 8, 4, 4);
  ellipse(6.5, 8, 4, 4);

  fill(jacket[0], jacket[1], jacket[2]);
  rect(-5, -3, 10, 13, 2);
  fill(skin[0], skin[1], skin[2]);
  ellipse(0, -9, 9, 9);
  fill(70, 55, 25);
  rect(-6, -13, 12, 4, 1);

  pop();
}

// A security camera -- used to dress up the vertical-angle
// "camera crossfire" diagrams.
// isOn defaults to true (every decorative call in the puzzle diagrams
// omits it, and those cameras are always "on") -- the sneak maze's
// stationary cameras are the only caller that ever passes false, when
// isCameraOn(cam) says this one is mid-cycle-off.
function drawCameraIcon(x, y, facingDeg, isOn) {
  var on = isOn !== false;
  push();
  translate(x, y);
  rotate(facingDeg);
  noStroke();
  fill(42, 46, 64);
  rect(-9, -6, 18, 12, 3);
  fill(on ? 90 : 60, on ? 225 : 65, on ? 255 : 72);
  ellipse(8, 0, 8, 8);
  fill(on ? 255 : 90, on ? 60 : 65, on ? 60 : 72);
  ellipse(-6, -7, 3, 3);
  pop();
}

// A vent grate set into the side of a duct run -- used to dress up
// the parallel-lines-with-transversal diagrams.
function drawVentGrateIcon(x, y) {
  noStroke();
  fill(90, 95, 105);
  rect(x - 8, y - 6, 16, 12, 1);
  stroke(40, 44, 50);
  strokeWeight(1);
  line(x - 6, y - 3, x + 6, y - 3);
  line(x - 6, y, x + 6, y);
  line(x - 6, y + 3, x + 6, y + 3);
}

// A straight run of ductwork -- drawn as a filled band with edge
// lines and a few seam ticks, instead of a single thin line, so it
// actually reads as a duct rather than an abstract wall.
function drawDuctRun(x1, x2, y, halfThickness) {
  noStroke();
  fill(32, 36, 46);
  rect(x1, y - halfThickness, x2 - x1, halfThickness * 2);
  stroke(COLOR_TEXT_DIM[0], COLOR_TEXT_DIM[1], COLOR_TEXT_DIM[2]);
  strokeWeight(1.5);
  line(x1, y - halfThickness, x2, y - halfThickness);
  line(x1, y + halfThickness, x2, y + halfThickness);
  stroke(COLOR_TEXT_DIM[0], COLOR_TEXT_DIM[1], COLOR_TEXT_DIM[2], 130);
  strokeWeight(1);
  for (var sx = x1 + 20; sx < x2; sx += 40) {
    line(sx, y - halfThickness, sx, y + halfThickness);
  }
}

// The diagonal connector duct joining the two parallel runs -- a
// thick dark body with a lighter center seam, instead of a plain
// line, so it reads as a physical crawlable duct. Wide enough for
// drawSpyCrawling to actually fit inside it, not just symbolically
// overlap it.
function drawDuctConnector(x1, y1, x2, y2) {
  stroke(60, 66, 78);
  strokeWeight(22);
  line(x1, y1, x2, y2);
  stroke(140, 148, 160);
  strokeWeight(7);
  line(x1, y1, x2, y2);
}

// The riveted flange where the connector duct meets a parallel run.
function drawDuctJoint(x, y) {
  noStroke();
  fill(150, 158, 170);
  ellipse(x, y, 24, 24);
  stroke(60, 66, 78);
  strokeWeight(1.5);
  noFill();
  ellipse(x, y, 24, 24);
  noStroke();
  fill(90, 95, 105);
  ellipse(x, y, 9, 9);
}


// ----------------------------------------------------------------
// SECTION 13: PUZZLE GENERATION -- SUPPLEMENTARY
// ----------------------------------------------------------------
function generateSupplementaryPuzzle() {
  var known = randomInt(15, 165);
  var missing = 180 - known;
  var knownIsFirst = random(0, 1) < 0.5;
  return {
    type: "supplementary",
    relationshipName: "Supplementary Angles",
    ruleText: "Supplementary angles sum to 180 degrees.",
    knownValue: known,
    correctAnswer: missing,
    knownIsFirst: knownIsFirst,
    baseAngleDeg: randomInt(0, 40) // rotates the whole diagram for variety
  };
}

function drawSupplementaryDiagram(puzzle, cx, cy) {
  var base = puzzle.baseAngleDeg;
  var radius = 90;

  // The line of sight splitting the hallway. Its position depends
  // on WHICH side is known vs. the target, so the drawn wedge sizes
  // always match their labels (fixed a bug where these could
  // mismatch).
  var firstWedgeSize = puzzle.knownIsFirst ? puzzle.knownValue : puzzle.correctAnswer;
  var splitAngle = base + firstWedgeSize;
  var knownRange = puzzle.knownIsFirst ? [base, splitAngle] : [splitAngle, base + 180];
  var targetRange = puzzle.knownIsFirst ? [splitAngle, base + 180] : [base, splitAngle];
  var knownBisector = (knownRange[0] + knownRange[1]) / 2;

  // The camera sits at the vertex, its lens facing straight down
  // the middle of its own watched cone -- the illuminated wedge is
  // its actual sightline, not just a labeled arc. Every diagram's
  // vertex is a camera now, for consistency with the sneak minigame.
  drawIlluminatedCone(cx, cy, radius, knownRange[0], knownRange[1], COLOR_LASER_RED);
  drawAngleArc(cx, cy, radius, targetRange[0], targetRange[1], COLOR_TEXT_GOOD);

  var p1 = pointOnCircle(cx, cy, radius, base + 180);
  var p2 = pointOnCircle(cx, cy, radius, base);
  drawLaserLine(p1.x, p1.y, p2.x, p2.y, COLOR_TEXT_DIM, 2);

  var p3 = pointOnCircle(cx, cy, radius, splitAngle);
  drawLaserLine(cx, cy, p3.x, p3.y, COLOR_LASER_RED, 3);

  // Supplementary angles can land on an exact right angle (a 90/90
  // split) unlike complementary or vertical, where the generated
  // values can never actually hit 90 -- when they do, mark it with
  // the same little square used to prove a right angle everywhere
  // else, not just a number that happens to say "90".
  if (puzzle.knownValue === 90) { drawRightAngleMarker(cx, cy, knownRange[0], 15); }
  if (puzzle.correctAnswer === 90) { drawRightAngleMarker(cx, cy, targetRange[0], 15); }

  drawCameraIcon(cx, cy, knownBisector);

  var firstBisector = base + firstWedgeSize / 2;
  var secondBisector = splitAngle + (180 - firstWedgeSize) / 2;

  if (puzzle.knownIsFirst) {
    drawAngleLabel(cx, cy, firstBisector, 34, puzzle.knownValue + "°", COLOR_LASER_GOLD);
    drawAngleLabel(cx, cy, secondBisector, 50, "?", COLOR_TEXT_WARN);
  } else {
    drawAngleLabel(cx, cy, firstBisector, 34, "?", COLOR_TEXT_WARN);
    drawAngleLabel(cx, cy, secondBisector, 50, puzzle.knownValue + "°", COLOR_LASER_GOLD);
  }
}


// ----------------------------------------------------------------
// SECTION 14: PUZZLE GENERATION -- COMPLEMENTARY
// ----------------------------------------------------------------
function generateComplementaryPuzzle() {
  var known = randomInt(5, 85);
  var missing = 90 - known;
  var knownIsFirst = random(0, 1) < 0.5;
  return {
    type: "complementary",
    relationshipName: "Complementary Angles",
    ruleText: "Complementary angles sum to 90 degrees.",
    knownValue: known,
    correctAnswer: missing,
    knownIsFirst: knownIsFirst,
    baseAngleDeg: randomInt(0, 40)
  };
}

function drawComplementaryDiagram(puzzle, cx, cy) {
  var base = puzzle.baseAngleDeg;
  var radius = 90;

  // The actual bounce path -- splitting the 90 degrees into the
  // known angle and the target angle (same known/target fix as
  // the supplementary diagram above).
  var firstWedgeSize = puzzle.knownIsFirst ? puzzle.knownValue : puzzle.correctAnswer;
  var splitAngle = base + firstWedgeSize;
  var knownRange = puzzle.knownIsFirst ? [base, splitAngle] : [splitAngle, base + 90];
  var targetRange = puzzle.knownIsFirst ? [splitAngle, base + 90] : [base, splitAngle];
  var knownBisector = (knownRange[0] + knownRange[1]) / 2;

  // The camera's lit field is the known wedge -- step in there and
  // it sees you.
  drawIlluminatedCone(cx, cy, radius, knownRange[0], knownRange[1], COLOR_LASER_RED);
  drawAngleArc(cx, cy, radius, targetRange[0], targetRange[1], COLOR_TEXT_GOOD);

  // The incoming tripwire beam and the outer 90-degree reference
  // boundary it's confined to once it clips the corner mirror.
  var armA = pointOnCircle(cx, cy, radius, base);
  var armB = pointOnCircle(cx, cy, radius, base + 90);
  drawLaserLine(cx, cy, armA.x, armA.y, COLOR_LASER_RED, 3);
  drawLaserLine(cx, cy, armB.x, armB.y, COLOR_TEXT_DIM, 1.5);

  // Proof it's really 90 degrees, not just a claim.
  drawRightAngleMarker(cx, cy, base, 15);

  var p3 = pointOnCircle(cx, cy, radius, splitAngle);
  drawLaserLine(cx, cy, p3.x, p3.y, COLOR_LASER_BLUE, 3);

  // The camera sits at the vertex, facing the middle of its own
  // watched cone -- every diagram's vertex is a camera now, for
  // consistency with the sneak minigame.
  drawCameraIcon(cx, cy, knownBisector);

  var firstBisector = base + firstWedgeSize / 2;
  var secondBisector = splitAngle + (90 - firstWedgeSize) / 2;

  if (puzzle.knownIsFirst) {
    drawAngleLabel(cx, cy, firstBisector, 30, puzzle.knownValue + "°", COLOR_LASER_GOLD);
    drawAngleLabel(cx, cy, secondBisector, 46, "?", COLOR_TEXT_WARN);
  } else {
    drawAngleLabel(cx, cy, firstBisector, 30, "?", COLOR_TEXT_WARN);
    drawAngleLabel(cx, cy, secondBisector, 46, puzzle.knownValue + "°", COLOR_LASER_GOLD);
  }
}


// ----------------------------------------------------------------
// SECTION 15: PUZZLE GENERATION -- VERTICAL ANGLES (2 crossing lines)
// ----------------------------------------------------------------
function generateVerticalPuzzle() {
  var theta = randomInt(4, 176); // one of the four angles -- anything above 3 degrees, perpendicular included
  // The four angles around the crossing, in order: theta, 180-theta, theta, 180-theta
  var slots = ["A", "B", "C", "D"]; // A opposite C, B opposite D
  var values = {
    A: theta,
    B: 180 - theta,
    C: theta,
    D: 180 - theta
  };
  var knownSlot = slots[randomInt(0, 3)];
  var remaining = slots.filter(function (s) { return s !== knownSlot; });
  var targetSlot = remaining[randomInt(0, remaining.length - 1)];

  var relationship;
  if ((knownSlot === "A" && targetSlot === "C") || (knownSlot === "C" && targetSlot === "A") ||
      (knownSlot === "B" && targetSlot === "D") || (knownSlot === "D" && targetSlot === "B")) {
    relationship = "Vertical Angles (equal)";
  } else {
    relationship = "Linear Pair (supplementary)";
  }

  return {
    type: "vertical",
    relationshipName: relationship,
    ruleText: "Vertical angles are equal; adjacent angles on a line are supplementary.",
    knownSlot: knownSlot,
    targetSlot: targetSlot,
    knownValue: values[knownSlot],
    correctAnswer: values[targetSlot],
    theta: theta,
    baseAngleDeg: randomInt(0, 80)
  };
}

function drawVerticalDiagram(puzzle, cx, cy) {
  var base = puzzle.baseAngleDeg;
  var radius = 95;

  // Two crossing sightlines carve out the four blind-spot angles --
  // the drawn spread is the puzzle's own theta, so the wedge you see
  // always actually matches the degree value on the label instead of
  // a fixed placeholder shape.
  var spread = puzzle.theta;

  // Slot angle ranges (going counter-clockwise from base):
  // A: base -> base+spread
  // B: base+spread -> base+180
  // C: base+180 -> base+180+spread
  // D: base+180+spread -> base+360
  var slotRanges = {
    A: [base, base + spread],
    B: [base + spread, base + 180],
    C: [base + 180, base + 180 + spread],
    D: [base + 180 + spread, base + 360]
  };
  var knownRange = slotRanges[puzzle.knownSlot];
  var knownBisector = (knownRange[0] + knownRange[1]) / 2;

  // The camera sits at the vertex, its lens pointed straight down
  // the middle of the sweep it's actually watching.
  drawIlluminatedCone(cx, cy, radius, knownRange[0], knownRange[1], COLOR_LASER_RED);

  var p1 = pointOnCircle(cx, cy, radius, base);
  var p2 = pointOnCircle(cx, cy, radius, base + 180);
  var p3 = pointOnCircle(cx, cy, radius, base + spread);
  var p4 = pointOnCircle(cx, cy, radius, base + spread + 180);
  drawLaserLine(p1.x, p1.y, p2.x, p2.y, COLOR_TEXT_DIM, 1.5);
  drawLaserLine(p3.x, p3.y, p4.x, p4.y, COLOR_LASER_BLUE, 2.5);

  drawCameraIcon(cx, cy, knownBisector);

  var order = ["A", "B", "C", "D"];
  for (var i = 0; i < order.length; i++) {
    var slot = order[i];
    var range = slotRanges[slot];
    var bisector = (range[0] + range[1]) / 2;
    var labelStr;
    var labelColor;
    if (slot === puzzle.knownSlot) {
      labelStr = puzzle.knownValue + "°";
      labelColor = COLOR_LASER_GOLD;
    } else if (slot === puzzle.targetSlot) {
      labelStr = "?";
      labelColor = COLOR_TEXT_WARN;
      drawAngleArc(cx, cy, 32, range[0], range[1], COLOR_TEXT_GOOD);
    } else {
      labelStr = "";
      labelColor = COLOR_TEXT_DIM;
    }
    if (labelStr !== "") {
      drawAngleLabel(cx, cy, bisector, 32, labelStr, labelColor);
      // theta can land exactly on 90 now that the perpendicular case
      // is no longer excluded -- when it does, mark it the same way
      // supplementary does, right on whichever labeled wedge is
      // actually a right angle.
      if (range[1] - range[0] === 90) { drawRightAngleMarker(cx, cy, range[0], 15); }
    }
  }
}


// ----------------------------------------------------------------
// SECTION 16: PUZZLE GENERATION -- PARALLEL LINES + TRANSVERSAL
// ----------------------------------------------------------------
// 8 angles are produced at two intersections (A = upper line, B =
// lower line) by one transversal. Positions at each intersection:
// topLeft, topRight, bottomRight, bottomLeft (clockwise).
// Because the two lines are parallel, the SAME position always has
// the SAME value at both intersections -- this single fact is what
// makes every classic relationship (corresponding, alternate
// interior/exterior, co-interior) fall out correctly below.
function angleValueForPosition(position, theta) {
  // theta = the angle (0-180) the downward-pointing transversal ray
  // makes with the rightward horizontal ray. That pins down all four
  // real wedges around a joint exactly: bottomRight sits between the
  // rightward ray and the downward transversal ray (size theta),
  // topLeft is its vertical-angle twin on the opposite side (also
  // theta); bottomLeft and topRight split the remaining 180-theta.
  if (position === "topLeft" || position === "bottomRight") {
    return theta;
  }
  return 180 - theta;
}

function classifyParallelRelationship(posKnown, intKnown, posTarget, intTarget) {
  if (intKnown === intTarget) {
    var oppositePairs = { topLeft: "bottomRight", bottomRight: "topLeft", topRight: "bottomLeft", bottomLeft: "topRight" };
    if (oppositePairs[posKnown] === posTarget) {
      return { name: "Vertical Angles", equal: true };
    }
    return { name: "Linear Pair", equal: false };
  }

  if (posKnown === posTarget) {
    return { name: "Corresponding Angles", equal: true };
  }

  var interiorPositionsA = { bottomLeft: true, bottomRight: true }; // interior at upper line
  var interiorPositionsB = { topLeft: true, topRight: true };       // interior at lower line
  var knownIsInterior = (intKnown === "A") ? !!interiorPositionsA[posKnown] : !!interiorPositionsB[posKnown];
  var targetIsInterior = (intTarget === "A") ? !!interiorPositionsA[posTarget] : !!interiorPositionsB[posTarget];

  var leftSide = { topLeft: true, bottomLeft: true };
  var knownLeft = !!leftSide[posKnown];
  var targetLeft = !!leftSide[posTarget];
  var sameSide = knownLeft === targetLeft;

  if (knownIsInterior && targetIsInterior) {
    if (sameSide) {
      return { name: "Co-Interior Angles (Same-Side Interior)", equal: false };
    }
    return { name: "Alternate Interior Angles", equal: true };
  }

  if (!knownIsInterior && !targetIsInterior) {
    if (sameSide) {
      return { name: "Co-Exterior Angles (Same-Side Exterior)", equal: false };
    }
    return { name: "Alternate Exterior Angles", equal: true };
  }

  // One interior, one exterior, not aligned by the cases above.
  return { name: "Angle Pair", equal: false };
}

function generateParallelPuzzle() {
  // Kept away from very shallow angles (near 0/180) on purpose -- not
  // a math restriction (every theta strictly between 0 and 180 is a
  // valid transversal), but a diagram-space one: the two duct runs
  // are a fixed 100px apart, so a shallow crossing needs a much wider
  // diagonal duct to actually reach both of them, and a fixed-size
  // canvas can't grow to fit that. 30-150 keeps the two joints
  // comfortably within the drawn duct runs at every value (see
  // drawParallelDiagram) while still varying the wedge sizes a lot,
  // including the perpendicular case at theta=90.
  var theta = randomInt(30, 150);
  var positions = ["topLeft", "topRight", "bottomRight", "bottomLeft"];
  var intersections = ["A", "B"];

  var knownPos = positions[randomInt(0, 3)];
  var knownInt = intersections[randomInt(0, 1)];
  var targetPos, targetInt, relationship;
  do {
    targetPos = positions[randomInt(0, 3)];
    targetInt = intersections[randomInt(0, 1)];
    relationship = classifyParallelRelationship(knownPos, knownInt, targetPos, targetInt);
    // Co-Exterior (same-side exterior) is a real relationship but not
    // one this game quizzes on -- by request, only Vertical, Linear
    // Pair, Corresponding, Co-Interior, Alternate Interior, and
    // Alternate Exterior ever get asked. Reject and re-roll the
    // target position/intersection instead of relabeling it, since
    // Co-Exterior genuinely isn't any of those (it's supplementary,
    // not equal, so it can't just be renamed to Alternate Exterior).
  } while ((targetPos === knownPos && targetInt === knownInt) ||
    relationship.name === "Co-Exterior Angles (Same-Side Exterior)");

  var knownValue = angleValueForPosition(knownPos, theta);
  var targetValue = angleValueForPosition(targetPos, theta);

  return {
    type: "parallel",
    relationshipName: relationship.name,
    ruleText: relationship.equal
      ? relationship.name + " are equal."
      : relationship.name + " are supplementary (sum to 180°).",
    theta: theta,
    knownPos: knownPos,
    knownInt: knownInt,
    targetPos: targetPos,
    targetInt: targetInt,
    knownValue: knownValue,
    correctAnswer: targetValue,
    baseAngleDeg: 0
  };
}

function drawParallelDiagram(puzzle, cx, cy) {
  var halfWidth = 130;
  var lineAY = cy - 50;
  var lineBY = cy + 50;

  // Two parallel ventilation duct runs, vents included -- wide enough
  // for drawSpyCrawling to visibly fit inside one, not just a thin
  // line standing in for a duct.
  drawDuctRun(cx - halfWidth, cx + halfWidth, lineAY, 11);
  drawDuctRun(cx - halfWidth, cx + halfWidth, lineBY, 11);
  var grateOffsets = [-90, 0, 90];
  for (var g = 0; g < grateOffsets.length; g++) {
    drawVentGrateIcon(cx + grateOffsets[g], lineAY);
    drawVentGrateIcon(cx + grateOffsets[g], lineBY);
  }

  // Where the connector duct actually meets each run, computed
  // directly from the fixed 100px vertical gap and theta -- NOT by
  // drawing some fixed-length segment centered on (cx,cy) and then
  // asking where the infinite line through it crosses each run. That
  // used to be how this worked, and for a shallow theta the segment
  // itself never reached one or both runs at all, while the "meets
  // here" point was still computed by extrapolating way past the
  // segment's actual drawn ends -- the joint (and its "?"/angle
  // label) would land nowhere near the visible duct. Computing the
  // two ends directly instead means the drawn duct's ends and the
  // joints are always the exact same points, by construction (theta
  // is kept away from the very-shallow angles where "two runs 100px
  // apart" would need an unreasonably wide duct regardless -- see
  // generateParallelPuzzle).
  var thetaRad = puzzle.theta * Math.PI / 180;
  var dx = Math.cos(thetaRad);
  var dy = Math.sin(thetaRad); // never near 0 given generateParallelPuzzle's theta range
  var halfDrop = 50 / dy;
  var intersectA = { x: cx - dx * halfDrop, y: lineAY };
  var intersectB = { x: cx + dx * halfDrop, y: lineBY };

  // The drawn duct extends a little past each joint on both ends --
  // reads as a real connector piece running INTO each vent run,
  // rather than stopping dead exactly at the rivet.
  var overhang = 26;
  var p1 = { x: intersectA.x - dx * overhang, y: intersectA.y - dy * overhang };
  var p2 = { x: intersectB.x + dx * overhang, y: intersectB.y + dy * overhang };
  drawDuctConnector(p1.x, p1.y, p2.x, p2.y);

  drawParallelSlotLabels(puzzle, intersectA.x, intersectA.y, "A");
  drawParallelSlotLabels(puzzle, intersectB.x, intersectB.y, "B");

  drawDuctJoint(intersectA.x, intersectA.y);
  drawDuctJoint(intersectB.x, intersectB.y);

  // The crew member actually crawling the connector duct, right now
  // -- this is the physical version of "figure out the angle to know
  // which way through the ducts" the puzzle is asking about, not an
  // abstract diagram floating apart from the story. Drawn last (on
  // top of the joints/labels) and kept clear of both ends -- see
  // crawlMargin -- so it never covers the flange, arc, or number it's
  // crawling toward. Only while still aiming -- once you've actually
  // answered, drawHeistScene's own escaping/caught reactions take
  // over showing the crew member, so this doesn't double up with them.
  if (puzzlePhase === PUZZLE_PHASE_AIMING) {
    var ductLength = Math.sqrt(Math.pow(intersectB.x - intersectA.x, 2) + Math.pow(intersectB.y - intersectA.y, 2));
    var crawlMargin = 34;
    var crawlRange = Math.max(ductLength - crawlMargin * 2, 10);
    var phase = ((typeof millis === "function") ? millis() : 0) * 0.0012;
    var crawlS = crawlMargin + crawlRange * (0.5 + 0.5 * Math.sin(phase));
    var crawlX = intersectA.x + dx * crawlS;
    var crawlY = intersectA.y + dy * crawlS;
    var movingTowardB = Math.cos(phase) >= 0;
    var crawlFacing = movingTowardB ? puzzle.theta : puzzle.theta + 180;
    drawSpyCrawling(crawlX, crawlY, crawlFacing);
  }
}

// The horizontal duct (rays at 0 deg/right and 180 deg/left) and the
// diagonal connector (rays at theta deg -- always pointing below the
// horizontal since 0 < theta < 180 -- and its opposite, 180+theta
// deg, pointing above it) meet at each joint and, going around the
// point, split it into exactly four wedges, each bounded by one
// horizontal ray and one transversal ray. That pairing of bounding
// rays is the actual definition of "top-left/top-right/bottom-left/
// bottom-right" at a transversal crossing, so each position maps to
// exactly one of the four -- no guessing between two same-sized
// wedges required:
//   bottomRight: rightward ray -> downward transversal ray
//   bottomLeft:  downward transversal ray -> leftward ray
//   topLeft:     leftward ray -> upward transversal ray
//   topRight:    upward transversal ray -> rightward ray
function resolveParallelWedge(position, theta) {
  if (position === "bottomRight") { return { start: 0, end: theta }; }
  if (position === "bottomLeft") { return { start: theta, end: 180 }; }
  if (position === "topLeft") { return { start: 180, end: 180 + theta }; }
  if (position === "topRight") { return { start: 180 + theta, end: 360 }; }
  return null;
}

function drawParallelSlotLabels(puzzle, px, py, intersectionId) {
  var positions = ["topLeft", "topRight", "bottomRight", "bottomLeft"];
  for (var i = 0; i < positions.length; i++) {
    var pos = positions[i];
    var isKnown = (pos === puzzle.knownPos && intersectionId === puzzle.knownInt);
    var isTarget = (pos === puzzle.targetPos && intersectionId === puzzle.targetInt);
    if (!isKnown && !isTarget) { continue; }

    var wedge = resolveParallelWedge(pos, puzzle.theta);
    if (!wedge) { continue; }

    var labelStr = isKnown ? (puzzle.knownValue + "°") : "?";
    var labelColor = isKnown ? COLOR_LASER_GOLD : COLOR_TEXT_WARN;
    var bisector = (wedge.start + wedge.end) / 2;

    // The arc makes the exact wedge visible, and the label sits
    // dead-center on its bisector -- so it's unambiguous which
    // angle the number belongs to, not just "somewhere near this
    // corner."
    drawAngleArc(px, py, 16, wedge.start, wedge.end, labelColor);
    drawAngleLabel(px, py, bisector, 16, labelStr, labelColor);

    // theta can land exactly on 90 now that the perpendicular case
    // is no longer excluded -- mark it the same way every other
    // diagram does. Smaller than the other diagrams' markers since
    // this one's whole wedge only has a 16px radius to work with.
    if (wedge.end - wedge.start === 90) { drawRightAngleMarker(px, py, wedge.start, 8); }
  }
}


// ----------------------------------------------------------------
// SECTION 17: PUZZLE GENERATION -- MIXED (boss level / challenge)
// ----------------------------------------------------------------
function generateMixedPuzzle() {
  var pick = randomInt(0, 3);
  if (pick === 0) { return generateSupplementaryPuzzle(); }
  if (pick === 1) { return generateComplementaryPuzzle(); }
  if (pick === 2) { return generateVerticalPuzzle(); }
  return generateParallelPuzzle();
}

function generatePuzzleForLevel(levelType) {
  if (levelType === "supplementary") { return generateSupplementaryPuzzle(); }
  if (levelType === "complementary") { return generateComplementaryPuzzle(); }
  if (levelType === "vertical") { return generateVerticalPuzzle(); }
  if (levelType === "parallel") { return generateParallelPuzzle(); }
  return generateMixedPuzzle();
}

function drawDiagramForPuzzle(puzzle, cx, cy) {
  if (puzzle.type === "supplementary") { drawSupplementaryDiagram(puzzle, cx, cy); }
  else if (puzzle.type === "complementary") { drawComplementaryDiagram(puzzle, cx, cy); }
  else if (puzzle.type === "vertical") { drawVerticalDiagram(puzzle, cx, cy); }
  else if (puzzle.type === "parallel") { drawParallelDiagram(puzzle, cx, cy); }
}


// ----------------------------------------------------------------
// SECTION 18: SCORING + STREAK LOGIC
// ----------------------------------------------------------------
function computeMultiplierFromStreak(s) {
  if (s >= 10) { return 4; }
  if (s >= 6) { return 3; }
  if (s >= 3) { return 2; }
  return 1;
}

function addScoreForCorrectAnswer() {
  var basePoints = 100;
  var timeRatio = clampNum(timerValue / timerMax, 0, 1);
  var timeBonus = Math.round(50 * timeRatio);
  scoreMultiplier = computeMultiplierFromStreak(streak);
  var total = (basePoints + timeBonus) * scoreMultiplier;
  currentScore += total;
  if (currentScore > sessionHighScore) {
    sessionHighScore = currentScore;
  }
  checkSkinUnlocks();
  return total;
}

function applyWrongAnswerPenalty() {
  streak = 0;
  scoreMultiplier = 1;
  lives -= 1;
  triggerShake(6, 14);
  playSfx("wrong");
}


// ----------------------------------------------------------------
// SECTION 20: LEVEL / PUZZLE FLOW
// ----------------------------------------------------------------
function startLevel(levelIndex) {
  currentLevelIndex = levelIndex;
  puzzlesSolvedInLevel = 0;
  gameState = STATE_LEVEL_INTRO;
}

function beginPlayingCurrentLevel() {
  gameState = STATE_PLAYING;
  loadNextPuzzle();
}

// Flags puzzle.isFirstOfType the first time this session a given
// relationship type comes up, so both the timer (see
// applyTimerForCurrentPuzzle) and the on-screen hint (see
// drawSkillNameBanner) know to slow down and explain the rule.
function markPuzzleFirstOfTypeIfNew(puzzle) {
  puzzle.isFirstOfType = !seenPuzzleTypes[puzzle.type];
  seenPuzzleTypes[puzzle.type] = true;
}

// Sets timerMax/timerValue from a base per-puzzle time limit,
// stretched by FIRST_OF_TYPE_TIME_MULTIPLIER when currentPuzzle is
// the first of its relationship type this session -- extra room to
// actually read the hint (see PUZZLE_HINTS) instead of racing the
// clock on a rule you're seeing for the first time.
function applyTimerForCurrentPuzzle(baseTimeLimit) {
  var limit = currentPuzzle.isFirstOfType ? baseTimeLimit * FIRST_OF_TYPE_TIME_MULTIPLIER : baseTimeLimit;
  timerMax = limit;
  timerValue = limit;
}

function loadNextPuzzle() {
  var level = LEVELS[currentLevelIndex];
  currentPuzzle = generatePuzzleForLevel(level.type);
  markPuzzleFirstOfTypeIfNew(currentPuzzle);
  answerInput = "";
  applyTimerForCurrentPuzzle(level.timeLimit);
  hasFailedThisPuzzle = false;
  puzzlePhase = PUZZLE_PHASE_AIMING;
  phaseTimer = 0;
}

// Returns to AIMING on the exact same puzzle after a non-fatal
// wrong answer, instead of generating a new one. The timer stays
// frozen (see updatePuzzleTimer) since hasFailedThisPuzzle is now
// true, so retrying never costs any additional time.
function retrySamePuzzle() {
  answerInput = "";
  puzzlePhase = PUZZLE_PHASE_AIMING;
  phaseTimer = 0;
}

function submitAnswer() {
  if (!currentPuzzle || answerInput === "") { return; }
  var value = parseInt(answerInput, 10);
  if (value === currentPuzzle.correctAnswer) {
    handleCorrectAnswer();
  } else {
    handleWrongAnswer();
  }
}

function handleCorrectAnswer() {
  var gained = addScoreForCorrectAnswer();
  streak += 1;
  if (streak > bestStreakEver) { bestStreakEver = streak; }
  showFeedback("+" + gained + "  STREAK x" + scoreMultiplier, COLOR_TEXT_GOOD, 40);
  playSfx("correct");
  puzzlesSolvedInLevel += 1;

  // The score updates immediately, but advancing to the next room
  // waits for a brief "slips through the safe wedge" reaction (see
  // updateEscapingPhase) and then actually sneaking the robber past
  // the guard -- see startSneakingPhase. That's what makes the
  // correct angle feel like it actually opened a path, not just
  // added points.
  if (isChallengeMode) {
    challengePuzzlesSolved += 1;
    if (challengePuzzlesSolved % 5 === 0) {
      challengeDifficulty += 1;
    }
    pendingAdvance = "NEXT_PUZZLE";
  } else {
    var level = LEVELS[currentLevelIndex];
    pendingAdvance = (puzzlesSolvedInLevel >= level.puzzlesToClear) ? "COMPLETE_LEVEL" : "NEXT_PUZZLE";
  }

  puzzlePhase = PUZZLE_PHASE_ESCAPING;
  escapeTimer = ESCAPE_DURATION;
}

// Runs every frame during the post-correct-answer reaction -- see
// drawHeistScene's PUZZLE_PHASE_ESCAPING branch for what's actually
// drawn. Once it finishes, the sneak minigame begins for real.
function updateEscapingPhase(dt) {
  escapeTimer -= dt;
  if (escapeTimer <= 0) {
    startSneakingPhase();
  }
}

function handleWrongAnswer() {
  applyWrongAnswerPenalty();
  answerInput = "";
  hasFailedThisPuzzle = true;

  if (lives <= 0) {
    // The heist is over either way, so it's fine to reveal the
    // answer here -- there's no more retry to spoil.
    showFeedback("Correct answer: " + currentPuzzle.correctAnswer + "°", COLOR_TEXT_WARN, 50);
    pendingAdvance = "GAME_OVER";
  } else {
    // Same puzzle, another shot -- don't give away the answer.
    showFeedback("Not quite -- try again!", COLOR_TEXT_WARN, 40);
    pendingAdvance = "RETRY_SAME_PUZZLE";
  }
  puzzlePhase = PUZZLE_PHASE_CAUGHT;
  phaseTimer = CAUGHT_DURATION;
  caughtGuardFromLeft = random(0, 1) < 0.5;
}

// Runs every frame while the spy is reacting to being spotted after
// a wrong answer. Once the reaction finishes, it carries out
// whatever the answer actually earned: the next puzzle, or game
// over. (The SNEAKING phase has its own update function, since it's
// player-controlled and runs on real time instead of a frame count.)
function updateCaughtPhase() {
  phaseTimer -= 1;
  if (phaseTimer <= 0) {
    resolvePendingAdvance();
  }
}

function resolvePendingAdvance() {
  var action = pendingAdvance;
  pendingAdvance = null;

  if (action === "COMPLETE_LEVEL") {
    completeLevel();
    return;
  }
  if (action === "GAME_OVER") {
    triggerGameOver();
    return;
  }
  if (action === "RETRY_SAME_PUZZLE") {
    retrySamePuzzle();
    return;
  }

  loadNextPuzzle();
  if (isChallengeMode) {
    applyTimerForCurrentPuzzle(Math.max(6, 15 - challengeDifficulty));
  }
}

function completeLevel() {
  playSfx("levelup");
  saveHighScores();
  if (currentLevelIndex >= LEVELS.length - 1) {
    gameState = STATE_VICTORY;
  } else {
    gameState = STATE_LEVEL_COMPLETE;
  }
}

function triggerGameOver() {
  playSfx("gameover");
  saveHighScores();
  gameState = STATE_GAME_OVER;
}

function resetFullGame() {
  currentLevelIndex = 0;
  currentScore = 0;
  lives = maxLives;
  streak = 0;
  scoreMultiplier = 1;
  isChallengeMode = false;
  challengeDifficulty = 1;
  challengePuzzlesSolved = 0;
  puzzlesSolvedInLevel = 0;
}

function startChallengeMode() {
  resetFullGame();
  isChallengeMode = true;
  challengeDifficulty = 1;
  challengePuzzlesSolved = 0;
  gameState = STATE_PLAYING;
  loadNextPuzzle();
  applyTimerForCurrentPuzzle(Math.max(6, 15 - challengeDifficulty));
}


// ----------------------------------------------------------------
// SECTION 21: TIMER UPDATE (per-frame countdown during PLAYING)
// ----------------------------------------------------------------
function updatePuzzleTimer(dt) {
  // Once you've gotten this puzzle wrong at least once, the clock
  // stops -- retrying costs you another life if you're wrong again,
  // but never any more time.
  if (hasFailedThisPuzzle) { return; }
  timerValue -= dt;
  if (timerValue <= 0) {
    timerValue = 0;
    handleWrongAnswer();
  }
}

// ----------------------------------------------------------------
// SECTION 21B: HEIST SCENE (the sneak-past-the-guards minigame)
// ----------------------------------------------------------------
// This is the payoff for answering correctly: the danger wedge you
// just calculated becomes a literal illuminated cone cast from the
// guard/camera/laser sitting at the vertex, and you take direct
// control of the robber to actually dodge it and reach the exit.
// Getting spotted mid-sneak costs a life and plays a short chase
// animation -- the robber flees off screen with every guard on their
// tail -- and then it's straight on to the next puzzle. One catch
// ends the run at this room.
var SPY_START_X = 28;
var SPY_END_X   = 372;

var ROOM_LEFT = 6, ROOM_RIGHT = 394, ROOM_TOP = 58, ROOM_BOTTOM = 306;
var ROOM_CENTER_X = (ROOM_LEFT + ROOM_RIGHT) / 2;
var ROOM_CENTER_Y = (ROOM_TOP + ROOM_BOTTOM) / 2;
var ROBBER_RADIUS = 7; // nominal solid footprint, used for sprite scale (see SPRITE_MAZE_SCALE)
var SPRITE_MAZE_SCALE = 1.1;
var ROBBER_SPEED = 130; // pixels/second -- only used by the caught/fleeing chase sequence now

// Movement is grid-stepped, not free-roaming: one key press moves the
// robber exactly one cell in that direction (a whole corridor's
// length -- two super-grid units, room-cell to room-cell), animated
// as a short tween rather than an instant jump so it still reads as
// motion. Holding a direction auto-repeats the step once the current
// one finishes; nothing ever slides a fraction of a cell.
var ROBBER_STEP_DURATION = 0.09; // seconds for one cell-to-cell step

// A single step (0.09s) is much shorter than a natural human tap - a
// quick, deliberate press easily lasts 150-250ms, long enough to keep
// the direction "held" through two or three step completions and
// send the robber blowing straight past a turn the player meant to
// take. See robberHeldDir/robberHeldDuration and tryStartRobberStep():
// the FIRST step of any press always fires immediately (via
// stepQueued/keyEdge), but a direction has to stay continuously held
// for this long before a SECOND step is allowed to auto-chain - the
// same tap-vs-repeat distinction as ordinary keyboard key-repeat, so
// one quick tap reliably means exactly one cell, and only a
// deliberate hold runs continuously down a corridor.
var ROBBER_REPEAT_DELAY = 0.22;
var robberHeldDir = null;
var robberHeldDuration = 0;

var robberX = ROOM_LEFT + 20;
var robberY = ROOM_CENTER_Y;
var robberCellGr = 1, robberCellGc = 1; // current room cell, kept in lockstep with robberX/Y
var robberStepFromX = robberX, robberStepFromY = robberY;
var robberStepToX = robberX, robberStepToY = robberY;
var robberStepT = 1; // 1 = at rest on robberCellGr/Gc, not mid-step

// A single quick tap can land between two draw() polls and never
// show up as "down" during either one's keyDown() check -- polling
// alone can miss it. keyPressed() instead fires on the actual
// browser key-down EVENT no matter how brief the tap was, so it
// queues the step here; updateSneakingPhase consumes (and clears)
// this on its next frame, guaranteeing a single press always
// produces exactly one step.
var stepQueuedDGr = 0, stepQueuedDGc = 0;
var stepQueued = false;

var sneakWasSpotted    = false;

var SNEAK_DOOR_RADIUS = 16;
var sneakStartX = 0, sneakStartY = 0;
var sneakStartCellGr = 1, sneakStartCellGc = 1; // spawn's room cell -- guards steer clear of it, see isTooCloseToSpawn
var sneakDoorX  = 0, sneakDoorY  = 0;

// A brief window right when you gain control where nothing can spot
// you yet -- so a guard that happens to be facing your start point
// never catches you before you've had a chance to move.
var SNEAK_GRACE_PERIOD = 1.3; // seconds
var sneakGraceTimer = 0;

// A brief green pulse right at the spawn point when the maze first
// appears -- so the player can find their own character immediately
// instead of hunting the new maze for it. Purely visual, unrelated to
// SNEAK_GRACE_PERIOD (which is about safety, not visibility) - see
// drawSpawnPulse.
var SPAWN_PULSE_DURATION = 1.0; // seconds
var spawnPulseTimer = 0;

// One camera per maze has its watched direction picked by the angle
// the player just solved for, instead of at random (see
// setupStationaryCameras) -- a brief gold callout points it out when
// the maze first appears, same lifespan pattern as spawnPulseTimer,
// so a correct answer visibly buys real information, not just a pass
// to the next room.
var LINKED_CAMERA_CALLOUT_DURATION = 1.6; // seconds
var linkedCameraCalloutTimer = 0;

// PUZZLE_PHASE_MAZE_REVEAL: a brief cinematic between ESCAPING and
// real SNEAKING control -- instead of the maze just replacing the
// puzzle diagram outright, the view opens zoomed in tight on the
// linked camera (see setupStationaryCameras) and eases out to the
// normal full-room framing, so the very first thing the player sees
// in the new room is the exact hazard their answer just set, not
// something they stumble onto three corridors later. See
// startSneakingPhase/updateMazeRevealPhase/drawMazeRevealScene.
var MAZE_REVEAL_DURATION = 1.1; // seconds
var mazeRevealTimer = 0;
var MAZE_REVEAL_ZOOM_START = 2.4; // how tight the opening framing is; 1.0 is the normal, unzoomed view

// Getting spotted costs a life and plays a short chase animation --
// the caught robber flees off screen with every guard on their
// tail -- and one catch ends the run at this room; the crew moves
// straight on to the next puzzle once it plays out.
var SNEAK_CHASE_DURATION = 1.4; // seconds -- a bit longer since everyone moves slower now
var sneakChaseTimer = 0;
var sneakFleeDirX = 0, sneakFleeDirY = 0;

var PATROL_GUARD_COUNT = 5; // up from 4 -- now that stationary cameras (below) add a genuinely different kind of hazard, and bushes give the player a real tool to duck into, there's room to push the roaming threat further too
var patrolGuards = [];

// The current room's corridor graph (see buildRoomGraph), kept
// around after setup so a guard that reaches a room cell can look up
// its real neighbors and wander off toward a random one -- an actual
// unpredictable search of the maze instead of a fixed back-and-forth
// on one corridor.
var sneakRoomAdj = null;

// A small proximity ring around every patrol guard -- step inside
// it and they notice you regardless of which way they're looking.
var GUARD_ALERT_RADIUS = 20;

// ---- Stationary cameras ----
// Fixed position, fixed facing, permanent cone -- unlike a guard's
// cone (which sweeps clear again and again, so waiting it out always
// eventually works), a camera's coverage never lets up. See
// setupStationaryCameras/ensureCameraFreePath: placement always
// leaves a genuine camera-free ROUTE to the door -- that guarantee is
// built assuming every camera is always on, so it holds regardless of
// the cycling below, which only ever makes an individual camera less
// of a threat, never more. On top of that baseline, each camera also
// cycles on and off in real time (see isCameraOn) -- a real, timeable
// second option for a corridor a camera happens to watch, not just
// something you have to route around, or duck past through a bush
// (see SAFE_ZONE_COUNT).
var STATIONARY_CAMERA_COUNT = 3; // up from 2 -- with only 2, the spawn/door safety margins (isTooCloseToSpawn, avoidCells) often ate up every candidate actually on the natural route, leaving a real chunk of mazes where neither camera was ever relevant to a normal playthrough at all
var CAMERA_CONE_RADIUS = 62;
var CAMERA_CONE_WIDTH = 62;

// A linked camera's cone width IS a real puzzle value in degrees --
// not a proxy or a threshold pick, the literal same number (see
// setupStationaryCameras's linkedSpecs). These bounds are a sanity
// floor/ceiling only, not a difficulty clamp -- they match the true
// full range every puzzle generator can ever produce (theta's own
// randomInt(4, 176) in generateVerticalPuzzle is the widest), so a
// real puzzle's two linked cones always add up to exactly 90/180 with
// no exceptions; this only guards against a degenerate value if a
// future puzzle type ever fell outside that range.
var LINKED_CAMERA_CONE_WIDTH_MIN = 4;
var LINKED_CAMERA_CONE_WIDTH_MAX = 176;

// role -> {color, label} for a linked camera's ring/cone/callout (see
// setupStationaryCameras's linkedSpecs and startSneakingPhase). Red
// for "known" matches the known angle's own wedge color on the
// diagram screen; gold for "answer" matches its existing HUD hint
// color -- each role's maze color is the same color that value
// already wore on the puzzle screen, not a new color introduced here.
var LINKED_CAMERA_ROLE_INFO = {
  known:  { color: COLOR_LASER_RED,  label: "GIVEN ANGLE" },
  answer: { color: COLOR_LASER_GOLD, label: "YOUR ANGLE" }
};

// Each camera is on for CAMERA_CYCLE_ON_SECONDS, then dark for
// CAMERA_CYCLE_OFF_SECONDS, on a repeating loop -- driven by
// millis(), so it needs no per-frame update of its own, just a random
// per-camera cycleOffset (see setupStationaryCameras) so they don't
// all blink together.
var CAMERA_CYCLE_ON_SECONDS = 5;
var CAMERA_CYCLE_OFF_SECONDS = 2;
var CAMERA_CYCLE_TOTAL_SECONDS = CAMERA_CYCLE_ON_SECONDS + CAMERA_CYCLE_OFF_SECONDS;

function isCameraOn(cam) {
  var t = (typeof millis === "function") ? millis() / 1000 : 0;
  var phase = (t + cam.cycleOffset) % CAMERA_CYCLE_TOTAL_SECONDS;
  return phase < CAMERA_CYCLE_ON_SECONDS;
}

var stationaryCameras = [];

// ---- Safe zones (hiding bushes) ----
// A handful of room cells dressed as dark foliage patches where the
// robber is immune to every hazard's cone -- see isRobberInSafeZone,
// checked first thing in checkForSpotting. Purely a bonus tool for
// the player, not something maze generation depends on for
// solvability (see ensureCameraFreePath) -- a real shortcut through
// danger you can choose to use, not a puzzle piece you're forced to.
var SAFE_ZONE_COUNT = 3;
var SAFE_ZONE_RADIUS = 16; // pixels -- roughly half a room cell, so you're covered once your sprite is actually standing in the bush, not the instant a step toward it begins
var safeZoneCells = [];

// ---- Near-miss tension feedback ----
// A guard/camera cone that comes close without actually catching you
// pulses the screen edge and blips a soft tone -- see
// computeTensionActive/isNearMissWithHazard (padding the real catch
// radius/angle by these margins) and updateSneakingPhase, which
// drives the repeat timer. Makes a close call FEEL close, instead of
// the only signal being either total safety or getting caught.
var TENSION_RADIUS_MARGIN = 22;
var TENSION_ANGLE_MARGIN = 16;
var TENSION_BLIP_INTERVAL = 0.5; // seconds between blips while a near-miss lasts
var tensionActive = false;
var tensionBlipTimer = 0;

// ---- Pac-Man-style maze ----
// The room is divided into a grid using the classic "odd cells are
// rooms, even cells are walls" representation: a MAZE_ROWS x
// MAZE_COLS grid of rooms becomes a (2*ROWS+1) x (2*COLS+1) super-
// grid, where carving a wall at an even/odd position opens a
// corridor between the two rooms on either side of it.
// Sized for a quick round: small enough that a solve takes seconds
// once the route is timed right, not minutes, while still leaving
// real branching (several rooms per row/column, not just a couple of
// forks). A much larger grid was the main reason a single blocked
// corridor could cost such a long wait - the fewer total steps
// between start and door, the faster a spotted opening actually
// pays off.
var MAZE_COLS = 6;
var MAZE_ROWS = 4;
var mazeGridCols = MAZE_COLS * 2 + 1;
var mazeGridRows = MAZE_ROWS * 2 + 1;
var mazeCellW = (ROOM_RIGHT - ROOM_LEFT) / mazeGridCols;
var mazeCellH = (ROOM_BOTTOM - ROOM_TOP) / mazeGridRows;
var mazeWalls = []; // mazeWalls[row][col] === true means blocked
var mazeWallRects = []; // flat {x,y} list of wall cells, cached per maze

function superGridToPixel(gr, gc) {
  return {
    x: ROOM_LEFT + (gc + 0.5) * mazeCellW,
    y: ROOM_TOP + (gr + 0.5) * mazeCellH
  };
}

// Randomized recursive backtracker: carves a spanning tree through
// every room cell, which by construction guarantees every room is
// reachable from every other room -- there is ALWAYS a route to the
// exit door, no matter how the maze comes out.
function generateMaze() {
  var r, c;
  mazeWalls = [];
  for (r = 0; r < mazeGridRows; r++) {
    var row = [];
    for (c = 0; c < mazeGridCols; c++) { row.push(true); }
    mazeWalls.push(row);
  }

  var visited = [];
  for (r = 0; r < MAZE_ROWS; r++) {
    var vrow = [];
    for (c = 0; c < MAZE_COLS; c++) { vrow.push(false); }
    visited.push(vrow);
  }
  for (r = 0; r < MAZE_ROWS; r++) {
    for (c = 0; c < MAZE_COLS; c++) {
      mazeWalls[r * 2 + 1][c * 2 + 1] = false;
    }
  }

  var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  var stack = [{ r: randomInt(0, MAZE_ROWS - 1), c: randomInt(0, MAZE_COLS - 1) }];
  visited[stack[0].r][stack[0].c] = true;

  while (stack.length > 0) {
    var cur = stack[stack.length - 1];
    var options = [];
    for (var d = 0; d < dirs.length; d++) {
      var nr = cur.r + dirs[d][0];
      var nc = cur.c + dirs[d][1];
      if (nr >= 0 && nr < MAZE_ROWS && nc >= 0 && nc < MAZE_COLS && !visited[nr][nc]) {
        options.push({ r: nr, c: nc, dr: dirs[d][0], dc: dirs[d][1] });
      }
    }
    if (options.length > 0) {
      var pick = options[randomInt(0, options.length - 1)];
      mazeWalls[cur.r * 2 + 1 + pick.dr][cur.c * 2 + 1 + pick.dc] = false;
      visited[pick.r][pick.c] = true;
      stack.push({ r: pick.r, c: pick.c });
    } else {
      stack.pop();
    }
  }

  // Extra openings for loops instead of a pure tree of dead ends, so
  // there are genuinely several real routes through, not just the one
  // spanning-tree path plus a token detour or two - that's what keeps
  // a single guard's corridor from being able to wall off the only
  // way through for a long stretch. This only ever REMOVES walls, so
  // the guaranteed connectivity from the spanning tree above can only
  // ever improve, never break.
  //
  // Picking uniformly random (row, col) positions here (the previous
  // approach) mostly wasted attempts: only cells with mixed row/col
  // parity are genuine connectors between two adjacent rooms at all
  // (an even-even cell is a corner/pillar that connects nothing, and
  // an odd-odd cell is a room cell that's already open) - roughly
  // half of random picks landed on a position that could never do
  // anything, and most of the rest landed on a connector the spanning
  // tree had already opened. The actual number of NEW routes added
  // came out far lower than intended, which is why paths still felt
  // like there was usually only one way through even after raising
  // the nominal percentage. Collecting every genuine CLOSED connector
  // first and opening a large, fixed fraction of THOSE guarantees a
  // real, predictable amount of extra connectivity regardless of maze
  // size or how lucky the random picks would have been.
  var closedConnectors = [];
  for (var cr = 1; cr < mazeGridRows - 1; cr++) {
    for (var cc = 1; cc < mazeGridCols - 1; cc++) {
      if (!mazeWalls[cr][cc]) { continue; } // already open (part of the spanning tree, or a room cell)
      var crOdd = (cr % 2 === 1), ccOdd = (cc % 2 === 1);
      if (crOdd !== ccOdd) { closedConnectors.push({ r: cr, c: cc }); } // exactly one of row/col odd = a genuine connector position
    }
  }
  // 0.55 (opening more than half of every closed connector) turned
  // out to make the maze feel closer to an open room with a few
  // obstacles than an actual maze with real navigation choices -
  // trimmed back down for more genuine dead ends and wrong turns,
  // while still comfortably above the ~1-2 effective loops the
  // original flawed random-cell approach produced.
  var shuffledConnectors = shuffleArrayCopy(closedConnectors);
  var extra = Math.ceil(shuffledConnectors.length * 0.38);
  for (var e = 0; e < extra; e++) {
    mazeWalls[shuffledConnectors[e].r][shuffledConnectors[e].c] = false;
  }

  rebuildMazeWallCache();
}

// Rebuilds the flat wall-cell cache used by drawMazeWalls from
// whatever mazeWalls currently is. Called once after the initial
// generation.
// Every wall cell renders as its FULL cell span now, no inset --
// movement is grid-stepped (see ROBBER_STEP_DURATION), so the robber
// only ever occupies a room cell's exact center and jumps straight to
// an adjacent one. Insetting walls to look "thin" used to matter for
// a continuously-sliding collision circle, but with stepped movement
// it only ever created a visual gap that LOOKED like a squeeze-through
// opening but wasn't an actual graph edge -- an inaccessible-looking
// opening next to a solid wall. A full, uninset block means every gap
// in the wall pattern is exactly a real corridor (an open connector
// cell -- see collectOpenEdges) and nothing else. Guard/camera vision
// (castRayDistance) uses these exact same bounds too.
function isWallCellAt(gr, gc) {
  if (gr < 0 || gr >= mazeGridRows || gc < 0 || gc >= mazeGridCols) { return true; }
  return mazeWalls[gr][gc];
}

function getWallCellBounds(gr, gc) {
  var cellLeft = ROOM_LEFT + gc * mazeCellW;
  var cellTop = ROOM_TOP + gr * mazeCellH;
  return {
    left: cellLeft,
    right: cellLeft + mazeCellW,
    top: cellTop,
    bottom: cellTop + mazeCellH
  };
}

function rebuildMazeWallCache() {
  mazeWallRects = [];
  for (var r = 0; r < mazeGridRows; r++) {
    for (var c = 0; c < mazeGridCols; c++) {
      if (mazeWalls[r][c]) {
        mazeWallRects.push(getWallCellBounds(r, c));
      }
    }
  }
}

// Exact ray-vs-rectangle entry distance (the standard "slab" test),
// clamped to [tMin,tMax] -- returns null if the ray doesn't actually
// cross rect within that window. dx/dy must be non-zero (see
// castRayDistance, which nudges them off zero before calling this).
function rayRectEntry(vx, vy, dx, dy, rect, tMin, tMax) {
  var tx1 = (rect.left - vx) / dx;
  var tx2 = (rect.right - vx) / dx;
  if (tx1 > tx2) { var tmp = tx1; tx1 = tx2; tx2 = tmp; }
  var ty1 = (rect.top - vy) / dy;
  var ty2 = (rect.bottom - vy) / dy;
  if (ty1 > ty2) { var tmp2 = ty1; ty1 = ty2; ty2 = tmp2; }
  var tEnter = Math.max(tx1, ty1, tMin);
  var tExit = Math.min(tx2, ty2, tMax);
  if (tEnter <= tExit + 0.001) { return Math.max(tEnter, tMin); }
  return null;
}

// Finds exactly how far (vx,vy) can look along angleDeg before
// hitting a wall (or maxRadius, if it never does) -- this is what
// stops a guard/camera's cone, and what hasLineOfSight is built on,
// at a wall instead of letting sight pass straight through.
//
// This walks the actual grid cells the ray crosses (a standard DDA
// line traversal -- the same technique used for tile-based
// raycasting), so it can never step clean over a wall no matter how
// thin the wall is rendered, and tests each wall cell it reaches
// against its EXACT rendered bounds (getWallCellBounds) via
// rayRectEntry -- an exact intersection, not a fixed-step
// approximation. Since it only visits
// the handful of cells actually along the ray (at most a few for
// these cone radii) instead of marching pixel-by-pixel across the
// whole distance, this is also cheaper than the fixed-step approach
// it replaced, not just more accurate.
function castRayDistance(vx, vy, angleDeg, maxRadius) {
  var rad = angleDeg * Math.PI / 180;
  var dx = Math.cos(rad);
  var dy = Math.sin(rad);
  if (dx === 0) { dx = 0.000001; }
  if (dy === 0) { dy = 0.000001; }

  var gc = Math.floor((vx - ROOM_LEFT) / mazeCellW);
  var gr = Math.floor((vy - ROOM_TOP) / mazeCellH);
  var stepC = dx > 0 ? 1 : -1;
  var stepR = dy > 0 ? 1 : -1;

  var nextBoundX = ROOM_LEFT + (gc + (stepC > 0 ? 1 : 0)) * mazeCellW;
  var nextBoundY = ROOM_TOP + (gr + (stepR > 0 ? 1 : 0)) * mazeCellH;
  var tMaxX = (nextBoundX - vx) / dx;
  var tMaxY = (nextBoundY - vy) / dy;
  var tDeltaX = Math.abs(mazeCellW / dx);
  var tDeltaY = Math.abs(mazeCellH / dy);

  var iterations = 0;
  while (iterations < 128) {
    iterations++;
    var tEnterCell;
    if (tMaxX < tMaxY) {
      tEnterCell = tMaxX;
      gc += stepC;
      tMaxX += tDeltaX;
    } else {
      tEnterCell = tMaxY;
      gr += stepR;
      tMaxY += tDeltaY;
    }
    if (tEnterCell > maxRadius) { break; }
    var tExitCell = Math.min(tMaxX, tMaxY, maxRadius);
    if (isWallCellAt(gr, gc)) {
      var hit = rayRectEntry(vx, vy, dx, dy, getWallCellBounds(gr, gc), tEnterCell, tExitCell);
      if (hit !== null) { return hit; }
    }
  }
  return maxRadius;
}

// Same idea, but between two specific points -- used so a guard or
// camera can never spot the robber through a wall even when the
// robber falls within cone angle and radius. Built directly on
// castRayDistance's exact wall test: if the clear distance in that
// direction reaches (or passes) the robber, there's nothing solid in
// between.
function hasLineOfSight(x1, y1, x2, y2) {
  var dx = x2 - x1, dy = y2 - y1;
  var dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) { return true; }
  var angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
  return castRayDistance(x1, y1, angleDeg, dist) >= dist - 0.5;
}

// Every open corridor connecting two adjacent room cells -- used to
// keep patrol guards moving along real corridors instead of cutting
// through walls.
function collectOpenEdges() {
  var edges = [];
  for (var r = 0; r < mazeGridRows; r++) {
    for (var c = 0; c < mazeGridCols; c++) {
      if (mazeWalls[r][c]) { continue; }
      var rOdd = (r % 2 === 1), cOdd = (c % 2 === 1);
      if (rOdd && !cOdd && c > 0 && c < mazeGridCols - 1) {
        edges.push({ aR: r, aC: c - 1, bR: r, bC: c + 1 });
      } else if (!rOdd && cOdd && r > 0 && r < mazeGridRows - 1) {
        edges.push({ aR: r - 1, aC: c, bR: r + 1, bC: c });
      }
    }
  }
  return edges;
}

// True if the room cell at (gr,gc) IS targetGr/targetGc, or is one
// step away from it (shares a corridor with it) -- used to keep
// guard patrols off of both the cell itself and its immediate
// neighbors, not just the exact cell.
function isCellNear(gr, gc, targetGr, targetGc) {
  if (gr === targetGr && gc === targetGc) { return true; }
  var dr = Math.abs(gr - targetGr);
  var dc = Math.abs(gc - targetGc);
  return (dr === 2 && dc === 0) || (dr === 0 && dc === 2);
}

// The four actual corner rooms of the maze -- the exit door and the
// spawn point always land on opposite ones (see pickDoorCell/
// pickStartCell), so every crossing genuinely spans the whole maze
// diagonally instead of sometimes landing on two border cells that
// happen to be close together despite being on different edges.
function collectCornerRoomCells() {
  var maxGr = (MAZE_ROWS - 1) * 2 + 1;
  var maxGc = (MAZE_COLS - 1) * 2 + 1;
  return [
    { gr: 1, gc: 1 },
    { gr: 1, gc: maxGc },
    { gr: maxGr, gc: 1 },
    { gr: maxGr, gc: maxGc }
  ];
}

// The corner diagonally opposite a given one -- flips each axis
// between its two possible corner values independently, so it works
// regardless of which specific corner was passed in.
function oppositeCornerCell(cell) {
  var maxGr = (MAZE_ROWS - 1) * 2 + 1;
  var maxGc = (MAZE_COLS - 1) * 2 + 1;
  return { gr: cell.gr === 1 ? maxGr : 1, gc: cell.gc === 1 ? maxGc : 1 };
}

// Picks a random corner room for the exit door -- cameras and guards
// are placed afterward, always steering clear of wherever this lands
// (see setupStationaryCameras/setupPatrolGuards), so any corner is as
// good as any other here.
function pickDoorCell() {
  var corners = collectCornerRoomCells();
  var pick = corners[randomInt(0, corners.length - 1)];
  var p = superGridToPixel(pick.gr, pick.gc);
  pick.px = p.x;
  pick.py = p.y;
  return pick;
}

// Always the corner diagonally opposite the door -- the maximum
// possible distance across this maze, guaranteeing every crossing is
// a real one rather than sometimes lucking into two nearby corners.
// avoidCell is unused (startSneakingPhase always passes null) but
// kept in the signature since callers already rely on this shape.
function pickStartCell(doorCell, avoidCell) {
  var opp = oppositeCornerCell(doorCell);
  var p = superGridToPixel(opp.gr, opp.gc);
  opp.px = p.x;
  opp.py = p.y;
  return opp;
}

// Builds a room-cell graph from the maze's open corridors, for the
// reachability check below.
function buildRoomGraph(edges) {
  var adj = {};
  for (var i = 0; i < edges.length; i++) {
    var e = edges[i];
    var keyA = e.aR + "," + e.aC;
    var keyB = e.bR + "," + e.bC;
    if (!adj[keyA]) { adj[keyA] = []; }
    if (!adj[keyB]) { adj[keyB] = []; }
    adj[keyA].push({ gr: e.bR, gc: e.bC, idx: i });
    adj[keyB].push({ gr: e.aR, gc: e.aC, idx: i });
  }
  return adj;
}

// BFS from startCell to doorCell using only corridors NOT marked in
// blockedIdx -- this is what actually proves a guard-free path
// exists, rather than just hoping one does.
function isReachableAvoidingEdges(adj, startCell, doorCell, blockedIdx) {
  var startKey = startCell.gr + "," + startCell.gc;
  var doorKey = doorCell.gr + "," + doorCell.gc;
  if (startKey === doorKey) { return true; }
  var visited = {};
  visited[startKey] = true;
  var queue = [startKey];
  while (queue.length > 0) {
    var cur = queue.shift();
    var neighbors = adj[cur] || [];
    for (var i = 0; i < neighbors.length; i++) {
      var nb = neighbors[i];
      if (blockedIdx[nb.idx]) { continue; }
      if (nb.gr + "," + nb.gc === doorKey) { return true; }
      var key = nb.gr + "," + nb.gc;
      if (!visited[key]) {
        visited[key] = true;
        queue.push(key);
      }
    }
  }
  return false;
}

// Finds ONE actual route (as a list of edge indices) from startCell
// to doorCell avoiding blockedIdx, via BFS with predecessor
// tracking. Used to find the "natural" path through the maze so
// guards can be placed ON it -- crossing paths with the player on
// purpose -- rather than scattered wherever happens to leave every
// route untouched.
function findPathEdges(adj, startCell, doorCell, blockedIdx) {
  var startKey = startCell.gr + "," + startCell.gc;
  var doorKey = doorCell.gr + "," + doorCell.gc;
  if (startKey === doorKey) { return []; }

  var visited = {};
  var cameFromEdge = {};
  var cameFromKey = {};
  visited[startKey] = true;
  var queue = [startKey];

  while (queue.length > 0) {
    var cur = queue.shift();
    if (cur === doorKey) { break; }
    var neighbors = adj[cur] || [];
    for (var i = 0; i < neighbors.length; i++) {
      var nb = neighbors[i];
      if (blockedIdx[nb.idx]) { continue; }
      var key = nb.gr + "," + nb.gc;
      if (visited[key]) { continue; }
      visited[key] = true;
      cameFromEdge[key] = nb.idx;
      cameFromKey[key] = cur;
      queue.push(key);
    }
  }

  if (!visited[doorKey]) { return []; }
  var path = [];
  var cur2 = doorKey;
  while (cur2 !== startKey) {
    path.push(cameFromEdge[cur2]);
    cur2 = cameFromKey[cur2];
  }
  return path;
}

// True if start and door are connected by more than just one
// fragile route: finds a path, then checks that removing any SINGLE
// edge along it still leaves a way through. If some edge on the
// path is a bridge (its removal disconnects start from door
// entirely), there's currently only one real way through.
function hasTwoDistinctPaths(adj, startCell, doorCell, excludedIdx) {
  var pathEdges = findPathEdges(adj, startCell, doorCell, excludedIdx);
  if (pathEdges.length === 0) { return false; }
  for (var i = 0; i < pathEdges.length; i++) {
    var testBlocked = {};
    for (var key in excludedIdx) { testBlocked[key] = true; }
    testBlocked[pathEdges[i]] = true;
    if (!isReachableAvoidingEdges(adj, startCell, doorCell, testBlocked)) {
      return false;
    }
  }
  return true;
}

// Repairs the maze in place (opening a few more walls, same as the
// generation-time loop openings -- only ever removes walls) until
// hasTwoDistinctPaths passes, so there's always a real alternate
// route to fall back on from the spawn point, not just a single
// corridor the whole crossing depends on. Rebuilds allEdges/adj/the
// wall render cache each time something changes, since new openings
// can shift which edges exist. Returns the final {edges, adj} to
// keep using.
function ensureTwoDistinctPaths(edges, adj, startCell, doorCell, excludedIdx) {
  // Each hasTwoDistinctPaths call can run several BFS passes (one to
  // find a path, one more per edge on it to prove it's not a bridge),
  // and Game Lab's interpreter is slow enough per-operation that a
  // worst-case run through a large ceiling here was actually showing
  // up as a real, noticeable pause right after answering correctly.
  // 15 is still generous -- the maze's own baseline loop-openings
  // usually mean this passes on the very first check anyway.
  var maxRepairs = 15;
  for (var attempt = 0; attempt < maxRepairs; attempt++) {
    if (hasTwoDistinctPaths(adj, startCell, doorCell, excludedIdx)) { break; }
    var er = randomInt(1, mazeGridRows - 2);
    var ec = randomInt(1, mazeGridCols - 2);
    mazeWalls[er][ec] = false;
    edges = collectOpenEdges();
    adj = buildRoomGraph(edges);
  }
  rebuildMazeWallCache();
  return { edges: edges, adj: adj };
}

// True if (px,py) falls inside any stationary camera's cone -- the
// same radius/angle/line-of-sight test checkForSpotting uses for the
// real robber, just against an arbitrary point instead.
function isPointCameraCovered(px, py, cameras) {
  for (var c = 0; c < cameras.length; c++) {
    var cam = cameras[c];
    var dx = px - cam.x, dy = py - cam.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= cam.coneRadius) { continue; }
    var ang = Math.atan2(dy, dx) * 180 / Math.PI;
    var half = cam.coneWidth / 2;
    if (isAngleInWedge(ang, cam.facing - half, cam.facing + half) && hasLineOfSight(cam.x, cam.y, px, py)) {
      return true;
    }
  }
  return false;
}

// Every open corridor that's unsafe to route through -- either its
// own doorway (the midpoint between the two rooms it connects) falls
// inside a camera's cone, OR one of those two ROOM CELLS does. The
// room-cell half of this matters just as much as the doorway half:
// movement always passes exactly through each room cell's center
// (see superGridToPixel/robberStepFromX etc.), so a camera covering a
// room's center makes every corridor touching that room just as
// unsafe as one whose own doorway is watched, even when the doorway
// midpoint itself tests clear. Missing this originally let
// ensureCameraFreePath certify a route "camera-free" that still
// walked the robber straight through a watched room in the middle -
// confirmed via direct testing (checked every room cell along a
// certified-safe route, not just the corridor midpoints) before this
// fix. Same {edgeIndex: true} shape the two-path repair and guard
// placement already use.
function computeCameraBlockedIdx(edges, cameras) {
  var blocked = {};
  if (cameras.length === 0) { return blocked; }

  var cellCoverage = {};
  function isCellCovered(gr, gc) {
    var key = gr + "," + gc;
    if (cellCoverage[key] === undefined) {
      var p = superGridToPixel(gr, gc);
      cellCoverage[key] = isPointCameraCovered(p.x, p.y, cameras);
    }
    return cellCoverage[key];
  }

  for (var i = 0; i < edges.length; i++) {
    var e = edges[i];
    var mid = edgeMidCell(e);
    var midP = superGridToPixel(mid.gr, mid.gc);
    if (isPointCameraCovered(midP.x, midP.y, cameras) || isCellCovered(e.aR, e.aC) || isCellCovered(e.bR, e.bC)) {
      blocked[i] = true;
    }
  }
  return blocked;
}

// Same repair idea as ensureTwoDistinctPaths (open more walls, never
// close any, until a real route exists) but proving a camera-free
// route specifically. Recomputes which edges the cameras cover FRESH
// every attempt from the live geometry, rather than reusing a static
// index map -- collectOpenEdges() rebuilds its list from scratch on
// every repair, which can shift every edge's index, so a map
// computed before a repair would silently point at the wrong
// corridors after one happens. This is also what makes the cameras
// "always avoidable outright": however they land, there's always a
// genuinely independent way to the door that never enters either
// one's cone.
function ensureCameraFreePath(edges, adj, startCell, doorCell, cameras) {
  var blockedIdx = computeCameraBlockedIdx(edges, cameras);
  if (cameras.length > 0) {
    // Higher than ensureTwoDistinctPaths's own 15 -- this check now
    // blocks every edge touching a camera-covered ROOM, not just a
    // covered doorway (see computeCameraBlockedIdx), so with 3
    // cameras it can take a few more real openings to clear. Two of
    // those cameras can now both be linked to a puzzle's own numbers
    // (see setupStationaryCameras's linkedSpecs) and so both
    // genuinely wide at once -- measured the two-distinct-path
    // guarantee's fallback-to-one-route rate at ~5% under that harder
    // constraint (up from ~3% with only one linked camera), and
    // raising this from 60 to 90 barely moved it (4.7%, within noise
    // for the sample size) -- the remaining fallback rate is a real
    // maze-capacity limit at this room size, not a budget one. Kept
    // the higher ceiling anyway since it's still cheap (~1.6ms per
    // maze generation even here) and can't hurt; the single-route
    // guarantee (never zero) held with 0 failures across every test
    // run including explicit worst-case constructions, so this is an
    // accepted trade-off, not an unsolved bug.
    var maxRepairs = 90;
    for (var attempt = 0; attempt < maxRepairs; attempt++) {
      if (hasTwoDistinctPaths(adj, startCell, doorCell, blockedIdx)) { break; }

      // Pick uniformly among genuinely CLOSED connector cells, not any
      // random (row,col) in the grid -- most cells are pillars or
      // already-open rooms where flipping mazeWalls does nothing, so a
      // plain random pick burns through the repair budget on no-ops
      // (the same bug generateMaze's own extra-loop-opening code had,
      // fixed there by filtering to real connectors first).
      var closedConnectors = [];
      for (var cr = 1; cr < mazeGridRows - 1; cr++) {
        for (var cc = 1; cc < mazeGridCols - 1; cc++) {
          if (!mazeWalls[cr][cc]) { continue; }
          var crOdd = (cr % 2 === 1), ccOdd = (cc % 2 === 1);
          if (crOdd !== ccOdd) { closedConnectors.push({ r: cr, c: cc }); }
        }
      }
      if (closedConnectors.length === 0) { break; } // nothing left to open

      var pick = closedConnectors[randomInt(0, closedConnectors.length - 1)];
      mazeWalls[pick.r][pick.c] = false;
      edges = collectOpenEdges();
      adj = buildRoomGraph(edges);
      blockedIdx = computeCameraBlockedIdx(edges, cameras);
    }
    rebuildMazeWallCache();
  }
  return { edges: edges, adj: adj, blockedIdx: blockedIdx };
}

// Fisher-Yates shuffle, used to try candidate corridors in random
// order without repeats.
function shuffledIndexes(count) {
  var arr = [];
  for (var i = 0; i < count; i++) { arr.push(i); }
  for (var j = arr.length - 1; j > 0; j--) {
    var k = randomInt(0, j);
    var tmp = arr[j];
    arr[j] = arr[k];
    arr[k] = tmp;
  }
  return arr;
}

// Turns a list into a random-order copy without disturbing the
// original -- built on shuffledIndexes so there's one shuffle
// implementation instead of two.
function shuffleArrayCopy(arr) {
  var order = shuffledIndexes(arr.length);
  var result = [];
  for (var i = 0; i < order.length; i++) { result.push(arr[order[i]]); }
  return result;
}

// The grid-space midpoint of a corridor edge -- used only as a
// position to measure spread-out-ness between guards, not a real
// cell (can land on a half-integer between two room cells).
function edgeMidCell(edge) {
  return { gr: (edge.aR + edge.bR) / 2, gc: (edge.aC + edge.bC) / 2 };
}

function gridCellDistance(a, b) {
  var dr = a.gr - b.gr, dc = a.gc - b.gc;
  return Math.sqrt(dr * dr + dc * dc);
}

// Places STATIONARY_CAMERA_COUNT fixed cameras, each sitting in the
// middle of one open corridor (edgeMidCell -- the doorway between the
// two rooms it connects) and facing into whichever of those two rooms
// gets picked, so its cone washes over that room and the doorway
// itself. Spread apart the same greedy-ish way as guards (skipping a
// candidate too close to one already chosen, unless candidates are
// running out) and kept off avoidCells and the spawn's own wide
// berth, same rules as guard placement. Only sets stationaryCameras
// and computes each cone's cached point list (see computeConePoints)
// -- the actual solvability guarantee is ensureCameraFreePath, called
// separately once cameras are placed.
//
// linkedSpecs: an array of 0-2 {angle, pickB, role} objects -- the
// FIRST N cameras placed (N = linkedSpecs.length) each reuse one real
// number from the puzzle instead of random values, so the maze
// reflects not just the answer but the whole relationship it came
// from. See startSneakingPhase, which builds this from
// currentPuzzle.knownValue (role "known") and .correctAnswer (role
// "answer") -- since those two numbers are related BY CONSTRUCTION
// (they sum to 90/180, or are equal, depending on the puzzle type),
// giving each its own real camera means the two resulting cones
// carry that exact same relationship into the room: complementary
// puzzles produce two cones that literally sum to 90 degrees,
// supplementary/linear-pair/co-interior ones to 180, and vertical's
// equal-angle case produces two cones of the SAME width. Each spec's
// pickB steers which of the two corridor-adjacent rooms that camera
// watches (a camera can only ever face one of two directions here,
// so the exact degree can't become the exact facing); angle becomes
// the cone's actual angular width, UNCLAMPED -- the literal same
// number reused as the same kind of measurement, not a discretized
// or rescaled stand-in for it, so the on-screen cones really do add
// up to the number the diagram taught, not an approximation of it.
// An empty/missing array means no puzzle to link to (every camera
// fully random, the original behavior).
function setupStationaryCameras(edges, adj, startCell, doorCell, avoidCells, linkedSpecs) {
  stationaryCameras = [];
  if (edges.length === 0) { return; }
  var specs = linkedSpecs || [];

  var candidateIdx = [];
  for (var ci = 0; ci < edges.length; ci++) {
    var edge = edges[ci];
    if (isTooCloseToSpawn(edge.aR, edge.aC) || isTooCloseToSpawn(edge.bR, edge.bC)) { continue; }
    var blockedByAvoid = false;
    for (var ai = 0; ai < avoidCells.length; ai++) {
      var ac = avoidCells[ai];
      if (isCellNear(edge.aR, edge.aC, ac.gr, ac.gc) || isCellNear(edge.bR, edge.bC, ac.gr, ac.gc)) {
        blockedByAvoid = true;
        break;
      }
    }
    if (!blockedByAvoid) { candidateIdx.push(ci); }
  }
  if (candidateIdx.length === 0) { return; }

  // Biased toward the natural start->door route, same idea
  // setupPatrolGuards already uses for its first guard -- a camera
  // that happens to land somewhere the player was never going to walk
  // near doesn't add any real challenge, however technically
  // "avoidable" it is. Still just a bias (shuffled within each
  // group), not a guarantee -- ensureCameraFreePath is what actually
  // has to make routing around it possible.
  var pathEdges = findPathEdges(adj, startCell, doorCell, {});
  var onPath = [], offPath = [];
  for (var opi = 0; opi < candidateIdx.length; opi++) {
    if (pathEdges.indexOf(candidateIdx[opi]) !== -1) { onPath.push(candidateIdx[opi]); } else { offPath.push(candidateIdx[opi]); }
  }
  var shuffled = shuffleArrayCopy(onPath).concat(shuffleArrayCopy(offPath));
  var chosenCells = [];
  for (var si = 0; si < shuffled.length && stationaryCameras.length < STATIONARY_CAMERA_COUNT; si++) {
    var e = edges[shuffled[si]];
    var mid = edgeMidCell(e);
    var tooClose = false;
    for (var k = 0; k < chosenCells.length; k++) {
      if (gridCellDistance(mid, chosenCells[k]) < 3) { tooClose = true; break; }
    }
    var remainingSlots = STATIONARY_CAMERA_COUNT - stationaryCameras.length;
    var remainingCandidates = shuffled.length - si;
    if (tooClose && remainingCandidates > remainingSlots) { continue; }

    var pMid = superGridToPixel(mid.gr, mid.gc);
    var pa = superGridToPixel(e.aR, e.aC);
    var pb = superGridToPixel(e.bR, e.bC);
    var spec = stationaryCameras.length < specs.length ? specs[stationaryCameras.length] : null;
    var target = spec ? (spec.pickB ? pb : pa) : (randomInt(0, 1) === 0 ? pa : pb);
    var facing = Math.atan2(target.y - pMid.y, target.x - pMid.x) * 180 / Math.PI;

    var linkedWidth = spec ? clampNum(spec.angle, LINKED_CAMERA_CONE_WIDTH_MIN, LINKED_CAMERA_CONE_WIDTH_MAX) : CAMERA_CONE_WIDTH;

    var camera = {
      x: pMid.x, y: pMid.y,
      facing: facing,
      coneWidth: linkedWidth,
      coneRadius: CAMERA_CONE_RADIUS,
      isPlayerLinked: !!spec,
      linkRole: spec ? spec.role : null,
      // Its own random point in the on/off cycle (see isCameraOn) so
      // cameras don't all blink in lockstep -- each one independently
      // goes dark for CAMERA_CYCLE_OFF_SECONDS out of every
      // CAMERA_CYCLE_TOTAL_SECONDS.
      cycleOffset: random(0, CAMERA_CYCLE_TOTAL_SECONDS)
    };
    camera.conePoints = computeConePoints(camera.x, camera.y, camera.coneRadius, camera.facing - camera.coneWidth / 2, camera.facing + camera.coneWidth / 2, 10);
    stationaryCameras.push(camera);
    chosenCells.push(mid);
  }
}

// Picks SAFE_ZONE_COUNT room cells to dress as hiding bushes, well
// clear of avoidCells (start/door) -- see isRobberInSafeZone for the
// actual immunity check. Random rather than targeted at any specific
// hazard's coverage on purpose: solvability never depends on a bush
// being in any particular spot (see ensureCameraFreePath), so this
// can just scatter them for variety instead of needing to reason
// about which corridors happen to need rescuing.
function setupSafeZones(avoidCells) {
  safeZoneCells = [];
  var allRoomCells = [];
  for (var r = 0; r < MAZE_ROWS; r++) {
    for (var c = 0; c < MAZE_COLS; c++) {
      allRoomCells.push({ gr: r * 2 + 1, gc: c * 2 + 1 });
    }
  }
  var shuffled = shuffleArrayCopy(allRoomCells);
  for (var i = 0; i < shuffled.length && safeZoneCells.length < SAFE_ZONE_COUNT; i++) {
    var cell = shuffled[i];
    var blocked = false;
    for (var ai = 0; ai < avoidCells.length; ai++) {
      if (isCellNear(cell.gr, cell.gc, avoidCells[ai].gr, avoidCells[ai].gc)) { blocked = true; break; }
    }
    if (blocked) { continue; }
    var p = superGridToPixel(cell.gr, cell.gc);
    safeZoneCells.push({ gr: cell.gr, gc: cell.gc, px: p.x, py: p.y });
  }
}

// True once the robber's actual sprite position (not just the cell
// it's stepping toward) is physically inside a bush -- see
// SAFE_ZONE_RADIUS. Checked first thing in checkForSpotting and
// again in computeTensionActive, so hiding suppresses both an actual
// catch and the near-miss warning that would otherwise fire right
// next to one.
function isRobberInSafeZone() {
  for (var i = 0; i < safeZoneCells.length; i++) {
    var dx = robberX - safeZoneCells[i].px;
    var dy = robberY - safeZoneCells[i].py;
    if (Math.sqrt(dx * dx + dy * dy) < SAFE_ZONE_RADIUS) { return true; }
  }
  return false;
}

// Several roaming guards, Pac-Man-ghost style, each patrolling back
// and forth along ONE real open corridor of the maze -- never
// through a wall, never on a corridor the camera's cone already
// covers (alreadyBlockedIdx), and never anywhere near avoidCells
// (the start point and the exit door, so neither end of the
// crossing can ever be watched).
//
// The first guard is placed ON the natural route from start to door
// whenever possible -- a genuine "weave past with real timing"
// challenge instead of a hazard you'd never even walk near. Every
// guard after that is greedily placed as far (in grid cells) as
// possible from every guard already chosen, so with more than one
// guard on the map they end up spread across the maze instead of a
// shuffle happening to cluster several of them in the same corner.
// This is still always fair: a guard patrols back and forth and is
// never anywhere permanently, so a corridor it covers is only ever
// blocked some of the time, never all of it -- and however many
// guards end up on the two proven camera-safe routes (see
// ensureTwoDistinctPaths), waiting for each one's cone to swing
// clear always eventually gets you through. The camera is the one
// thing that's ALWAYS avoidable outright -- it never moves, so if it
// were the only way through, no amount of timing would ever fix
// that (see startSneakingPhase's retry loop instead).
function setupPatrolGuards(edges, adj, avoidCells, startCell, doorCell, alreadyBlockedIdx) {
  patrolGuards = [];
  if (edges.length === 0) { return; }

  var candidateIdx = [];
  for (var ci = 0; ci < edges.length; ci++) {
    if (alreadyBlockedIdx[ci]) { continue; }
    var edge = edges[ci];
    // A wider berth around the spawn point specifically (see
    // isTooCloseToSpawn/SPAWN_GUARD_MIN_STEPS) than the plain
    // immediate-neighbor check used for avoidCells in general (which
    // still covers the door) -- no initial guard corridor is allowed
    // to even start within sight-ish range of where the player spawns.
    if (isTooCloseToSpawn(edge.aR, edge.aC) || isTooCloseToSpawn(edge.bR, edge.bC)) { continue; }
    var blockedByAvoid = false;
    for (var ai = 0; ai < avoidCells.length; ai++) {
      var ac = avoidCells[ai];
      if (isCellNear(edge.aR, edge.aC, ac.gr, ac.gc) || isCellNear(edge.bR, edge.bC, ac.gr, ac.gc)) {
        blockedByAvoid = true;
        break;
      }
    }
    if (!blockedByAvoid) { candidateIdx.push(ci); }
  }
  if (candidateIdx.length === 0) { return; }

  var pathEdges = findPathEdges(adj, startCell, doorCell, alreadyBlockedIdx);
  var onPathSet = {};
  for (var pi = 0; pi < pathEdges.length; pi++) { onPathSet[pathEdges[pi]] = true; }

  // One guard per zone, zones laid out in a grid that covers the
  // maze's actual shape (more columns than rows for a wider-than-tall
  // maze) rather than picking each new guard just to be far from the
  // ones already chosen -- greedy farthest-point selection optimizes
  // pairwise distance, which tends to push guards out toward a few
  // extreme corners instead of genuinely covering the whole maze, and
  // was leaving real gaps down the middle. Each zone's guard is
  // whichever valid candidate corridor is closest to that zone's own
  // center, with a small on-path bonus (never enough to override a
  // genuinely closer off-path option) so a guard still often ends up
  // crossing the player's natural route the way the single greedy
  // seed guard used to.
  var zoneCount = PATROL_GUARD_COUNT;
  var zoneCols = Math.max(1, Math.round(Math.sqrt(zoneCount * MAZE_COLS / MAZE_ROWS)));
  var zoneRows = Math.max(1, Math.ceil(zoneCount / zoneCols));
  var zoneCenters = [];
  for (var zr = 0; zr < zoneRows && zoneCenters.length < zoneCount; zr++) {
    for (var zc = 0; zc < zoneCols && zoneCenters.length < zoneCount; zc++) {
      var roomRow = clampNum(Math.round(((zr + 0.5) / zoneRows) * MAZE_ROWS - 0.5), 0, MAZE_ROWS - 1);
      var roomCol = clampNum(Math.round(((zc + 0.5) / zoneCols) * MAZE_COLS - 0.5), 0, MAZE_COLS - 1);
      zoneCenters.push({ gr: roomRow * 2 + 1, gc: roomCol * 2 + 1 });
    }
  }
  zoneCenters = shuffleArrayCopy(zoneCenters); // don't always fill zones in the same reading order

  var chosenIdx = [];
  var chosenCells = [];
  var claimed = {};
  var ON_PATH_BONUS = 1.5; // grid cells -- enough to win a close tie, not enough to reach across a whole zone for it
  for (var zi = 0; zi < zoneCenters.length && chosenIdx.length < PATROL_GUARD_COUNT; zi++) {
    var zoneCenter = zoneCenters[zi];
    var bestIdx = -1, bestScore = Infinity;
    for (var ci2 = 0; ci2 < candidateIdx.length; ci2++) {
      var cIdx = candidateIdx[ci2];
      if (claimed[cIdx]) { continue; }
      var mid2 = edgeMidCell(edges[cIdx]);
      var score = gridCellDistance(mid2, zoneCenter) - (onPathSet[cIdx] ? ON_PATH_BONUS : 0);
      if (score < bestScore) { bestScore = score; bestIdx = cIdx; }
    }
    if (bestIdx === -1) { continue; } // every remaining candidate already claimed by an earlier zone
    claimed[bestIdx] = true;
    chosenIdx.push(bestIdx);
    chosenCells.push(edgeMidCell(edges[bestIdx]));
  }

  // Each guard starts on one of the picked corridors and stays
  // posted near it - see updatePatrolGuards/pickNextWanderCell, which
  // sends it wandering to a random neighboring room cell within
  // HOME_RANGE_STEPS of homeCell every time it arrives somewhere,
  // using sneakRoomAdj.
  for (var i = 0; i < chosenIdx.length; i++) {
    var chosen = edges[chosenIdx[i]];
    var guard = {
      fromCell: { gr: chosen.aR, gc: chosen.aC },
      toCell: { gr: chosen.bR, gc: chosen.bC },
      homeCell: chosenCells[i],
      progress: random(0, 1),
      speed: GUARD_SPEED_PX_BASE + i * 2, // pixels/sec
      coneWidth: 50,
      coneRadius: 55
    };
    var pa = superGridToPixel(guard.fromCell.gr, guard.fromCell.gc);
    var pb = superGridToPixel(guard.toCell.gr, guard.toCell.gc);
    guard.x = pa.x + (pb.x - pa.x) * guard.progress;
    guard.y = pa.y + (pb.y - pa.y) * guard.progress;
    guard.facing = Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180 / Math.PI;
    patrolGuards.push(guard);
  }
}

// Guard turn rate -- how many degrees per second a guard's body
// (and therefore their cone) can rotate. At the ends of a patrol
// corridor the guard's walking direction reverses instantly, but
// this makes them physically turn around over well under a second
// instead of snapping 180 degrees in a single frame, so the cone
// visibly sweeps as they do it without the turn itself eating into
// the player's window to move.
var GUARD_TURN_SPEED = 170; // degrees per second

// Base guard walking speed in pixels/second (each guard gets a
// slightly different one so they don't all move in lockstep) - now
// combined with the short home-range leash (see HOME_RANGE_STEPS),
// this means a guard reliably sweeps back past its own post every
// few seconds instead of the corridor staying blocked (or open) for
// an unpredictably long stretch.
var GUARD_SPEED_PX_BASE = 15;

// Steps `current` toward `target` by at most maxStepDeg, always the
// short way around the circle.
function rotateTowardAngle(current, target, maxStepDeg) {
  var diff = target - current;
  diff = ((diff % 360) + 540) % 360 - 180;
  if (diff > maxStepDeg) { diff = maxStepDeg; }
  if (diff < -maxStepDeg) { diff = -maxStepDeg; }
  return current + diff;
}

function cellKey(gr, gc) { return gr + "," + gc; }

// Minimum distance, in whole room-cell steps, a guard is ever allowed
// to wander toward the player's spawn point. Room cells are 2
// super-grid units apart, hence the /2. Trimmed down to match the
// smaller maze (see MAZE_COLS/MAZE_ROWS) - the old radius-3 exclusion
// zone could swallow a large fraction of a maze this size, leaving
// too few corridor candidates for setupPatrolGuards to actually place
// PATROL_GUARD_COUNT guards on.
var SPAWN_GUARD_MIN_STEPS = 2;

function isTooCloseToSpawn(gr, gc) {
  var dr = (gr - sneakStartCellGr) / 2;
  var dc = (gc - sneakStartCellGc) / 2;
  return Math.sqrt(dr * dr + dc * dc) < SPAWN_GUARD_MIN_STEPS;
}

// How far (in whole room-cell steps) a guard is ever allowed to
// wander from the corridor it was originally posted to before it's
// pulled back toward it - see pickNextWanderCell. A guard that can
// wander anywhere in the maze can end up gone for a very long,
// unpredictable time, leaving its post's corridor open for so long
// (or blocked for so long, if it happens to loiter right there) that
// timing it becomes pure luck instead of a learnable rhythm. Keeping
// it on a short leash means it reliably sweeps back past the same
// spot again and again at a roughly consistent interval - something
// a player can actually watch, count, and time a dash around.
var HOME_RANGE_STEPS = 2; // tried 3 briefly - combined with the extra guard and tighter maze below, a totally-blind walk got caught in every test trial, well past "slightly harder". Back to 2, which still leaves the maze/guard-count changes doing the actual work.

// Where a guard heads next after arriving at arrivedCell: a real
// neighbor from the room graph, biased to stay within HOME_RANGE_STEPS
// of homeCell (the corridor it was originally posted on) rather than
// an unrestricted wander across the whole maze - close enough to a
// short back-and-forth patrol that its rhythm becomes learnable, but
// still picking among 2-3 real options each time (not a fixed
// metronome) so it's not perfectly predictable either. Falls back to
// forward motion outside the range, then any safe neighbor, then any
// neighbor at all, only when the home-range pool is empty (e.g. a
// dead end right at the edge of its leash).
function pickNextWanderCell(arrivedCell, cameFromCell, homeCell) {
  var neighbors = (sneakRoomAdj && sneakRoomAdj[cellKey(arrivedCell.gr, arrivedCell.gc)]) || [];
  if (neighbors.length === 0) { return cameFromCell || arrivedCell; }

  var forwardHome = [], anyHome = [], forwardSafe = [], anySafe = [];
  for (var i = 0; i < neighbors.length; i++) {
    var nb = neighbors[i];
    var isBacktrack = cameFromCell && nb.gr === cameFromCell.gr && nb.gc === cameFromCell.gc;
    var tooClose = isTooCloseToSpawn(nb.gr, nb.gc);
    var inRange = !homeCell || gridCellDistance(nb, homeCell) <= HOME_RANGE_STEPS;
    if (!tooClose) {
      anySafe.push(nb);
      if (!isBacktrack) { forwardSafe.push(nb); }
      if (inRange) {
        anyHome.push(nb);
        if (!isBacktrack) { forwardHome.push(nb); }
      }
    }
  }

  var pool = forwardHome.length > 0 ? forwardHome
    : anyHome.length > 0 ? anyHome
    : forwardSafe.length > 0 ? forwardSafe
    : anySafe.length > 0 ? anySafe
    : neighbors;
  var pick = pool[randomInt(0, pool.length - 1)];
  return { gr: pick.gr, gc: pick.gc };
}

// Guards walk continuously from fromCell to toCell; on arrival they
// pick a new neighboring cell within HOME_RANGE_STEPS of their post
// to head to next (see pickNextWanderCell) - a short, learnable loop
// rather than turning around on cue OR wandering the whole maze.
function updatePatrolGuards(dt) {
  var maxStep = GUARD_TURN_SPEED * dt;
  for (var i = 0; i < patrolGuards.length; i++) {
    var g = patrolGuards[i];
    var pa = superGridToPixel(g.fromCell.gr, g.fromCell.gc);
    var pb = superGridToPixel(g.toCell.gr, g.toCell.gc);
    var edgeLen = Math.sqrt((pb.x - pa.x) * (pb.x - pa.x) + (pb.y - pa.y) * (pb.y - pa.y));
    g.progress += edgeLen > 0.01 ? (g.speed * dt) / edgeLen : 1;

    if (g.progress >= 1) {
      g.progress = 0;
      var arrivedCell = g.toCell;
      var cameFromCell = g.fromCell;
      g.fromCell = arrivedCell;
      g.toCell = pickNextWanderCell(arrivedCell, cameFromCell, g.homeCell);
      pa = superGridToPixel(g.fromCell.gr, g.fromCell.gc);
      pb = superGridToPixel(g.toCell.gr, g.toCell.gc);
    }

    var prevX = g.x, prevY = g.y;
    g.x = pa.x + (pb.x - pa.x) * g.progress;
    g.y = pa.y + (pb.y - pa.y) * g.progress;
    var vx = g.x - prevX, vy = g.y - prevY;
    if (Math.abs(vx) > 0.001 || Math.abs(vy) > 0.001) {
      var targetFacing = Math.atan2(vy, vx) * 180 / Math.PI;
      g.facing = rotateTowardAngle(g.facing, targetFacing, maxStep);
    }
  }
}

// Is angleDeg inside [startDeg, endDeg]? Handles wraparound past 360
// the same way the vertical diagram's slot D range does.
function isAngleInWedge(angleDeg, startDeg, endDeg) {
  var span = endDeg - startDeg;
  var rel = angleDeg - startDeg;
  rel = ((rel % 360) + 360) % 360;
  return rel <= span;
}

// Checks the robber against every roaming patrol guard and reports
// WHO caught them (position), not just whether -- the chase
// animation needs somewhere for the guard to lurch from.
function checkForSpotting() {
  if (isRobberInSafeZone()) { return { caught: false, x: 0, y: 0 }; }

  for (var i = 0; i < patrolGuards.length; i++) {
    var g = patrolGuards[i];
    var gdx = robberX - g.x;
    var gdy = robberY - g.y;
    var gdist = Math.sqrt(gdx * gdx + gdy * gdy);

    // Get this close and the guard notices you no matter which way
    // they're facing -- a personal-space alert on top of the cone.
    // A wall between you still protects you, same as the cone does.
    if (gdist < GUARD_ALERT_RADIUS && hasLineOfSight(g.x, g.y, robberX, robberY)) {
      return { caught: true, x: g.x, y: g.y };
    }

    if (gdist < g.coneRadius) {
      var gang = Math.atan2(gdy, gdx) * 180 / Math.PI;
      var half = g.coneWidth / 2;
      if (isAngleInWedge(gang, g.facing - half, g.facing + half) &&
          hasLineOfSight(g.x, g.y, robberX, robberY)) {
        return { caught: true, x: g.x, y: g.y };
      }
    }
  }

  // Cameras have no personal-space alert (they're not "aware" the
  // way a guard is) -- just the cone itself, same angle/radius/
  // line-of-sight test as a guard's, and only while actually on (see
  // isCameraOn) -- a dark camera sees nothing, full stop.
  for (var c = 0; c < stationaryCameras.length; c++) {
    var cam = stationaryCameras[c];
    if (!isCameraOn(cam)) { continue; }
    var cdx = robberX - cam.x;
    var cdy = robberY - cam.y;
    var cdist = Math.sqrt(cdx * cdx + cdy * cdy);
    if (cdist < cam.coneRadius) {
      var cang = Math.atan2(cdy, cdx) * 180 / Math.PI;
      var chalf = cam.coneWidth / 2;
      if (isAngleInWedge(cang, cam.facing - chalf, cam.facing + chalf) &&
          hasLineOfSight(cam.x, cam.y, robberX, robberY)) {
        return { caught: true, x: cam.x, y: cam.y };
      }
    }
  }

  return { caught: false, x: 0, y: 0 };
}

// True when the robber is close enough to a hazard's cone to feel
// the danger -- padded past the real catch radius/angle by
// TENSION_RADIUS_MARGIN/TENSION_ANGLE_MARGIN -- without the hazard
// having actually caught them. Shared by both guards and cameras
// since it only reads x/y/facing/coneRadius/coneWidth, which both
// hazard objects have.
function isNearMissWithHazard(hz) {
  var dx = robberX - hz.x, dy = robberY - hz.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  if (dist >= hz.coneRadius + TENSION_RADIUS_MARGIN) { return false; }
  var ang = Math.atan2(dy, dx) * 180 / Math.PI;
  var half = hz.coneWidth / 2 + TENSION_ANGLE_MARGIN;
  return isAngleInWedge(ang, hz.facing - half, hz.facing + half) && hasLineOfSight(hz.x, hz.y, robberX, robberY);
}

// Whether the near-miss pulse/blip should be active right now --
// false while hidden in a bush (see isRobberInSafeZone), since
// there's nothing to warn about there.
function computeTensionActive() {
  if (isRobberInSafeZone()) { return false; }
  var i;
  for (i = 0; i < patrolGuards.length; i++) {
    if (isNearMissWithHazard(patrolGuards[i])) { return true; }
  }
  for (i = 0; i < stationaryCameras.length; i++) {
    if (isCameraOn(stationaryCameras[i]) && isNearMissWithHazard(stationaryCameras[i])) { return true; }
  }
  return false;
}

// A filled, glowing wedge -- the guard/camera/laser's actual cast
// light, not just an outline. Built as a triangle fan since that's
// the safest drawing primitive to assume Game Lab supports.
function drawIlluminatedCone(vx, vy, radius, startDeg, endDeg, colorRGB) {
  var steps = 14;
  noStroke();
  fill(colorRGB[0], colorRGB[1], colorRGB[2], 55);
  var prevOuter = pointOnCircle(vx, vy, radius, startDeg);
  for (var i = 1; i <= steps; i++) {
    var d = startDeg + (endDeg - startDeg) * (i / steps);
    var curr = pointOnCircle(vx, vy, radius, d);
    triangle(vx, vy, prevOuter.x, prevOuter.y, curr.x, curr.y);
    prevOuter = curr;
  }
  fill(colorRGB[0], colorRGB[1], colorRGB[2], 100);
  var prevInner = pointOnCircle(vx, vy, radius * 0.35, startDeg);
  for (var j = 1; j <= steps; j++) {
    var dj = startDeg + (endDeg - startDeg) * (j / steps);
    var currInner = pointOnCircle(vx, vy, radius * 0.35, dj);
    triangle(vx, vy, prevInner.x, prevInner.y, currInner.x, currInner.y);
    prevInner = currInner;
  }
}

// The wall-clipped outline of an illuminated wedge, as a list of
// points -- split out from the actual drawing so a cone whose
// origin and angles never change (the stationary camera) can have
// its rays cast ONCE and just redraw the cached points every frame,
// instead of re-marching every ray 60 times a second for a shape
// that never moves.
function computeConePoints(vx, vy, radius, startDeg, endDeg, steps) {
  var pts = [];
  for (var i = 0; i <= steps; i++) {
    var d = startDeg + (endDeg - startDeg) * (i / steps);
    var clipped = castRayDistance(vx, vy, d, radius);
    pts.push(pointOnCircle(vx, vy, clipped, d));
  }
  return pts;
}

// A single wedge -- one field of view per hazard, not a dim outer
// layer plus a separate brighter inner one (which read as two
// overlapping cones).
function drawConePoints(vx, vy, pts, colorRGB) {
  noStroke();
  fill(colorRGB[0], colorRGB[1], colorRGB[2], 75);
  for (var j = 1; j < pts.length; j++) {
    triangle(vx, vy, pts[j - 1].x, pts[j - 1].y, pts[j].x, pts[j].y);
  }
}

// Same illuminated wedge, but stopped dead by the maze's walls --
// used for the roaming patrol guards, whose origin and facing change
// every frame so their rays can't be cached like the camera's.
function drawIlluminatedConeClipped(vx, vy, radius, startDeg, endDeg, colorRGB, steps) {
  var pts = computeConePoints(vx, vy, radius, startDeg, endDeg, steps || 8);
  drawConePoints(vx, vy, pts, colorRGB);
}

// A soft, gently pulsing red glow radiating out from a guard --
// built from layered translucent circles (denser near the guard,
// fading out toward the edge) since plain radial gradients aren't a
// safe assumption for Game Lab's drawing API.
function drawGuardAura(x, y, baseRadius) {
  var t = (typeof millis === "function") ? millis() : 0;
  var pulse = 1 + Math.sin(t * 0.006) * 0.12;
  var radius = baseRadius * pulse;
  var layers = 4;
  noStroke();
  for (var i = layers; i >= 1; i--) {
    var r = radius * (i / layers);
    var alpha = 100 - (i / layers) * 75;
    fill(255, 40, 60, alpha);
    ellipse(x, y, r * 2, r * 2);
  }
}

// Kept small and centered close to (x,y) at the default scale on
// purpose -- movement in the maze snaps exactly from one room cell's
// center to the next (see ROBBER_STEP_DURATION), so the sprite only
// needs to read clearly within roughly ROBBER_RADIUS of that point,
// not spill into a neighboring wall or corridor. Callers showing the
// robber somewhere OTHER than the maze (like standing at the door
// during the question itself) can pass a bigger sizeScale so it
// doesn't look like an ant next to the puzzle.
function drawSpySprite(x, y, isFlashing, sizeScale) {
  var suitColor  = isFlashing ? [255, 70, 70]   : [35, 45, 78];
  var visorColor = isFlashing ? [255, 210, 210] : [90, 225, 255];

  push();
  translate(x, y);
  scale(sizeScale || 1);

  stroke(suitColor[0], suitColor[1], suitColor[2]);
  strokeWeight(2.5);
  line(-2, 5, -2, 7);
  line(2, 5, 2, 7);
  // Arms - hang slightly out from the torso down to about hand level,
  // drawn before the torso rect below so it covers the shoulder join.
  line(-3.5, 0, -4.5, 4);
  line(3.5, 0, 4.5, 4);

  noStroke();
  fill(suitColor[0], suitColor[1], suitColor[2]);
  rect(-3, -1, 6, 7, 2);

  fill(suitColor[0], suitColor[1], suitColor[2]);
  ellipse(0, -4, 7, 7);

  // Visor -- the only bright spot on an otherwise stealthy figure.
  fill(visorColor[0], visorColor[1], visorColor[2]);
  rect(-2.5, -5, 5, 1.5, 1);

  pop();
}

// A belly-down crawling pose, drawn along the local +x axis and then
// rotated by the caller to match whichever duct it's crawling
// through -- rotating the upright drawSpySprite wholesale would just
// make it look like it fell over, not like it's actually moving
// through a duct. Used by drawParallelDiagram to put the crew member
// physically inside the connector duct between the two angle
// intersections, instead of just standing off to the side of the
// diagram waiting.
function drawSpyCrawling(x, y, facingDeg) {
  var suitColor = [35, 45, 78];
  var visorColor = [90, 225, 255];

  push();
  translate(x, y);
  rotate(facingDeg);

  // Limbs first so the body covers their attachment points -- two
  // reaching forward, two pushing off behind, the classic low-crawl
  // silhouette.
  stroke(suitColor[0], suitColor[1], suitColor[2]);
  strokeWeight(2.5);
  line(5, -3, 11, -7);
  line(5, 3, 11, 7);
  line(-5, -3, -11, -7);
  line(-5, 3, -11, 7);

  noStroke();
  fill(suitColor[0], suitColor[1], suitColor[2]);
  ellipse(0, 0, 21, 10);
  ellipse(10, 0, 8, 8);

  // Visor -- leading edge, so it reads as facing/looking the
  // direction it's crawling.
  fill(visorColor[0], visorColor[1], visorColor[2]);
  ellipse(12, 0, 3.5, 3.5);

  pop();
}

function drawExitDoor(x, y, isActive) {
  var glow = isActive ? COLOR_TEXT_GOOD : COLOR_TEXT_DIM;
  noFill();
  stroke(glow[0], glow[1], glow[2]);
  strokeWeight(isActive ? 3 : 1.5);
  rect(x - 9, y - 24, 18, 48, 4);
  if (isActive) {
    noStroke();
    fill(glow[0], glow[1], glow[2], 50);
    rect(x - 9, y - 24, 18, 48, 4);
  }
}

// The idle pose shown while you're still aiming -- the robber just
// waits at the door.
var SPY_IDLE_SCALE = 2.8; // bigger while you're still solving the angle -- no maze collision to fit inside here
var SPY_REACT_SCALE = 2.1; // a touch smaller for the escaping/caught reactions, which actually move around the scene

// The same {cx, cy, radius, knownRange, targetRange} shape every
// vertex-based diagram (supplementary/complementary/vertical) already
// computes internally to draw its own cone/arc -- pulled out here so
// the escaping/caught reactions walk through the EXACT wedge the
// diagram actually drew, not a separate approximation of it. Returns
// null for "parallel", a structurally different two-intersection
// diagram whose own crawling animation already lives in
// drawParallelDiagram -- see its PUZZLE_PHASE_AIMING gate.
function getPuzzleWedgeGeometry(puzzle) {
  if (!puzzle) { return null; }
  var cx = CANVAS_W / 2, cy = 160;
  var base = puzzle.baseAngleDeg;

  if (puzzle.type === "supplementary") {
    var w1 = puzzle.knownIsFirst ? puzzle.knownValue : puzzle.correctAnswer;
    var split = base + w1;
    return {
      cx: cx, cy: cy, radius: 90,
      knownRange: puzzle.knownIsFirst ? [base, split] : [split, base + 180],
      targetRange: puzzle.knownIsFirst ? [split, base + 180] : [base, split]
    };
  }
  if (puzzle.type === "complementary") {
    var w2 = puzzle.knownIsFirst ? puzzle.knownValue : puzzle.correctAnswer;
    var split2 = base + w2;
    return {
      cx: cx, cy: cy, radius: 90,
      knownRange: puzzle.knownIsFirst ? [base, split2] : [split2, base + 90],
      targetRange: puzzle.knownIsFirst ? [split2, base + 90] : [base, split2]
    };
  }
  if (puzzle.type === "vertical") {
    var spread = puzzle.theta;
    var slotRanges = {
      A: [base, base + spread],
      B: [base + spread, base + 180],
      C: [base + 180, base + 180 + spread],
      D: [base + 180 + spread, base + 360]
    };
    return { cx: cx, cy: cy, radius: 95, knownRange: slotRanges[puzzle.knownSlot], targetRange: slotRanges[puzzle.targetSlot] };
  }
  return null;
}

// Where the robber sprite sits at a given 0..1 progress through the
// post-correct-answer reaction: out from the vertex along the middle
// of the SAFE wedge (targetRange -- the one whose angle the player
// just correctly worked out), then curving over to the exit door.
// Falls back to a fairly direct line toward the door for puzzle types
// with no single-vertex wedge geometry (parallel).
function lerp(a, b, t) { return a + (b - a) * t; }

function quadBezierPoint(p0, c, p1, t) {
  var mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * c.x + t * t * p1.x,
    y: mt * mt * p0.y + 2 * mt * t * c.y + t * t * p1.y
  };
}

function normalizeAngleDeg(a) { return ((a % 360) + 360) % 360; }

function pointAtAngleDist(cx, cy, angleDeg, dist) {
  var rad = angleDeg * Math.PI / 180;
  return { x: cx + Math.cos(rad) * dist, y: cy + Math.sin(rad) * dist };
}

// Where the exit door itself sits -- X is always the same fixed spot
// near the right edge (matching the established "enter left, exit
// right" reading direction), but Y leans up or down depending on
// which way the SAFE wedge (targetRange) actually points, clamped to
// a range that never collides with the HUD above or the answer
// box/hint text below. This is what makes the door only make sense to
// reach by heading toward the safe wedge -- not a fixed prop the
// escape path detours around, but a real consequence of which wedge
// this puzzle's answer actually opened up. Parallel-type puzzles (no
// single vertex/wedge) keep the plain historical fixed spot.
var DOOR_Y_BASE = 160;
var DOOR_Y_SWING = 78; // how far the door can lean up/down from center
var DOOR_Y_MIN = 100;  // clears the skill-name banner above
var DOOR_Y_MAX = 232;  // clears the answer box/hint text below
function computeDoorPositionForPuzzle(puzzle) {
  var geo = getPuzzleWedgeGeometry(puzzle);
  if (!geo) { return { x: SPY_END_X + 10, y: DOOR_Y_BASE }; }
  var targetBisector = normalizeAngleDeg((geo.targetRange[0] + geo.targetRange[1]) / 2);
  var lean = Math.sin(targetBisector * Math.PI / 180) * DOOR_Y_SWING;
  return { x: SPY_END_X + 10, y: clampNum(DOOR_Y_BASE + lean, DOOR_Y_MIN, DOOR_Y_MAX) };
}

// The journey a correct answer plays out: starting from wherever the
// robber was already standing (not a teleport to the vertex), one
// smooth snake -- curving in past the camera's cone while easing
// toward the safe wedge's own direction, then peeling away along that
// exact line out to the door -- rather than a stiff orbit-dip-retreat
// sequence that reads as backtracking. Ends holding at the door while
// drawHeistScene shrinks the sprite away ("disappearing into it").
//
// Still geometrically safe, not just a heuristic: for the whole first
// leg, distance from the vertex only ever DECREASES from the robber's
// real starting distance down to innerRadius (never below it), and
// innerRadius already clears the cone's own reach -- so regardless of
// how the angle changes at the same time, the cone is never entered.
// The second leg holds the angle fixed at the safe wedge's bisector
// the whole way out, which by definition is a different angular slice
// than the watched wedge at every radius.
function computeEscapePoint(puzzle, progress) {
  var startPt = { x: SPY_START_X, y: 160 + 14 };
  var doorPt = computeDoorPositionForPuzzle(puzzle);
  var geo = getPuzzleWedgeGeometry(puzzle);

  if (!geo) {
    // Parallel-type puzzles have no single vertex/cone -- just a
    // gentle, fairly direct arc toward the door.
    var mid0 = { x: (startPt.x + doorPt.x) / 2, y: 160 - 30 };
    var ctrl0 = { x: startPt.x + (mid0.x - startPt.x) * 0.5, y: startPt.y - 20 };
    if (progress < 0.45) { return quadBezierPoint(startPt, ctrl0, mid0, progress / 0.45); }
    if (progress < 0.82) { return { x: lerp(mid0.x, doorPt.x, (progress - 0.45) / 0.37), y: lerp(mid0.y, doorPt.y, (progress - 0.45) / 0.37) }; }
    return doorPt;
  }

  var targetBisector = normalizeAngleDeg((geo.targetRange[0] + geo.targetRange[1]) / 2);

  var startDx = startPt.x - geo.cx, startDy = startPt.y - geo.cy;
  var startDist = Math.sqrt(startDx * startDx + startDy * startDy);
  var startAngle = normalizeAngleDeg(Math.atan2(startDy, startDx) * 180 / Math.PI);

  var doorDx = doorPt.x - geo.cx, doorDy = doorPt.y - geo.cy;
  var doorDist = Math.sqrt(doorDx * doorDx + doorDy * doorDy);

  var margin = 18;
  var innerRadius = Math.min(geo.radius + margin, startDist); // never ASKS the spiral to grow past where it already started

  function ease(t) { return t * t * (3 - 2 * t); }

  if (progress < 0.55) {
    var t1 = ease(progress / 0.55);
    var diff = ((targetBisector - startAngle + 540) % 360) - 180;
    var ang = startAngle + diff * t1;
    var rad = lerp(startDist, innerRadius, t1);
    return pointAtAngleDist(geo.cx, geo.cy, ang, rad);
  }
  if (progress < 0.82) {
    var t2 = ease((progress - 0.55) / 0.27);
    var rad2 = lerp(innerRadius, doorDist, t2);
    return pointAtAngleDist(geo.cx, geo.cy, targetBisector, rad2);
  }
  return doorPt;
}

// Mirror image of computeEscapePoint for the first beat of a wrong
// answer: from the vertex, into the WATCHED wedge (knownRange) --
// where the player misjudged the danger, hence getting caught.
function computeCaughtApproachPoint(puzzle, progress) {
  var geo = getPuzzleWedgeGeometry(puzzle);
  if (!geo) {
    return { x: SPY_START_X + 40 * progress, y: 160 };
  }
  var bisector = (geo.knownRange[0] + geo.knownRange[1]) / 2 * Math.PI / 180;
  var dist = geo.radius * 0.55 * progress;
  return { x: geo.cx + Math.cos(bisector) * dist, y: geo.cy + Math.sin(bisector) * dist };
}

// Full CAUGHT-phase scene for a given 0..1 total progress through
// CAUGHT_DURATION: an approach beat (walking into the watched wedge),
// then a chase beat (a guard rushes in from whichever edge
// caughtGuardFromLeft picked, closes in, and both flee off the
// opposite edge together) -- the same "guard right behind, both exit
// the frame" language the maze's own chase animation already uses.
var CAUGHT_APPROACH_FRACTION = 0.32;
function computeCaughtScenePositions(puzzle, totalProgress) {
  if (totalProgress < CAUGHT_APPROACH_FRACTION) {
    var p = totalProgress / CAUGHT_APPROACH_FRACTION;
    return { spy: computeCaughtApproachPoint(puzzle, p), guard: null, flashing: false };
  }

  var geo = getPuzzleWedgeGeometry(puzzle);
  var cy = geo ? geo.cy : 160;
  var chaseP = (totalProgress - CAUGHT_APPROACH_FRACTION) / (1 - CAUGHT_APPROACH_FRACTION);
  var spotPt = computeCaughtApproachPoint(puzzle, 1);

  var guardStart = caughtGuardFromLeft ? { x: -20, y: cy } : { x: CANVAS_W + 20, y: cy };
  var closeP = Math.min(chaseP / 0.45, 1);
  var guardX = guardStart.x + (spotPt.x - guardStart.x) * closeP;
  var guardY = guardStart.y + (spotPt.y - guardStart.y) * closeP;

  var fleeDirX = caughtGuardFromLeft ? 1 : -1;
  var fleeP = Math.max(0, (chaseP - 0.45) / 0.55);
  var fleeDist = fleeP * 260;

  return {
    spy: { x: spotPt.x + fleeDirX * fleeDist, y: spotPt.y + fleeDist * 0.15 },
    guard: { x: guardX + fleeDirX * fleeDist * 0.92, y: guardY + fleeDist * 0.15 },
    flashing: true
  };
}

// How much of the escape reaction is spent holding at the door while
// the sprite shrinks away into it -- matches computeEscapePoint's own
// final leg, which starts holding position at exactly this point too.
var ESCAPE_DOOR_ENTER_START = 0.82;

function drawHeistScene(sceneY, puzzle) {
  var doorPt = computeDoorPositionForPuzzle(puzzle);

  if (puzzlePhase === PUZZLE_PHASE_ESCAPING) {
    var escProgress = clampNum(1 - (escapeTimer / ESCAPE_DURATION), 0, 1);
    var doorActive = escProgress > ESCAPE_DOOR_ENTER_START * 0.7;
    drawExitDoor(doorPt.x, doorPt.y, doorActive);

    var escPt = computeEscapePoint(puzzle, escProgress);
    // Shrinks smoothly to nothing over the final leg -- "disappearing
    // into it" rather than just stopping in front of the door.
    var enterT = clampNum((escProgress - ESCAPE_DOOR_ENTER_START) / (1 - ESCAPE_DOOR_ENTER_START), 0, 1);
    var shrink = 1 - enterT;
    if (shrink > 0.02) {
      drawSpySprite(escPt.x, escPt.y, false, SPY_REACT_SCALE * shrink);
    }
    return;
  }

  drawExitDoor(doorPt.x, doorPt.y, false);

  if (puzzlePhase === PUZZLE_PHASE_CAUGHT) {
    var totalProgress = clampNum(1 - (phaseTimer / CAUGHT_DURATION), 0, 1);
    var scene = computeCaughtScenePositions(puzzle, totalProgress);
    drawSpySprite(scene.spy.x, scene.spy.y, scene.flashing, SPY_REACT_SCALE);
    if (scene.guard) {
      push();
      translate(scene.guard.x, scene.guard.y);
      scale(2.2);
      drawGuardIcon(0, 0);
      pop();
      noStroke();
      fill(255, 60, 60);
      textAlign(CENTER, CENTER);
      textSize(14);
      text("!", scene.guard.x, scene.guard.y - 42);
    }
    return;
  }

  // Idle pose while still aiming -- parallel-type puzzles already
  // show the crew member crawling INSIDE the duct diagram itself
  // (see drawParallelDiagram), so a second, static spy waiting off to
  // the side here would just be a redundant duplicate.
  if (!puzzle || puzzle.type !== "parallel") {
    drawSpySprite(SPY_START_X, sceneY + 14, false, SPY_IDLE_SCALE);
  }
}

// Kicks off the Pac-Man-style sneak minigame right after a correct
// answer. Generates a fresh maze, always guaranteed fully connected;
// the door lands on a random border room cell; the start point lands
// on a different, far-away border cell each time; a few room cells
// become hiding bushes (setupSafeZones); and both roaming patrol
// guards and fixed security cameras go up as hazards, all kept away
// from the spawn point specifically (see isTooCloseToSpawn).
//
// ensureTwoDistinctPaths opens a few more walls if needed so there's
// always a genuinely second, independent route from the spawn point
// to the door, never just one fragile corridor the whole crossing
// depends on. ensureCameraFreePath does the same thing again
// afterward specifically for the cameras just placed, since (unlike
// a guard) a camera's coverage never lets up -- see its own comment
// for why that needs a completely separate check.
function startSneakingPhase() {
  currentRoomStyle = ROOM_STYLES[randomInt(0, ROOM_STYLES.length - 1)];
  generateMaze();
  var allEdges = collectOpenEdges();
  var adj = buildRoomGraph(allEdges);

  var doorCell = pickDoorCell();
  var startCell = pickStartCell(doorCell, null);

  sneakDoorX = doorCell.px;
  sneakDoorY = doorCell.py;

  robberX = startCell.px;
  robberY = startCell.py;
  robberCellGr = startCell.gr;
  robberCellGc = startCell.gc;
  robberStepFromX = robberX;
  robberStepFromY = robberY;
  robberStepToX = robberX;
  robberStepToY = robberY;
  robberStepT = 1;
  stepQueued = false; // don't carry a leftover queued step into the new room
  robberHeldDir = null; robberHeldDuration = 0; // don't let a key already held from the previous room skip its repeat delay in this one
  sneakStartX = startCell.px;
  sneakStartY = startCell.py;
  sneakStartCellGr = startCell.gr;
  sneakStartCellGc = startCell.gc;

  var avoidCells = [
    { gr: startCell.gr, gc: startCell.gc },
    { gr: doorCell.gr, gc: doorCell.gc }
  ];

  // The maze's spanning tree already guarantees full connectivity, so
  // there's always at least one route -- this opens a few more walls
  // (never closes any) until a genuinely SECOND, independent route
  // exists too, so there's always a real alternate way to the exit.
  var repaired = ensureTwoDistinctPaths(allEdges, adj, startCell, doorCell, {});
  allEdges = repaired.edges;
  adj = repaired.adj;

  setupSafeZones(avoidCells);

  // The just-solved puzzle carries TWO related numbers, not just the
  // one the student typed -- the given/known value and the calculated
  // answer, related BY CONSTRUCTION (every puzzle generator sets them
  // to sum to 90 or 180, or -- vertical's "equal" case, parallel's
  // equal-classified relationships -- to literally match). Both now
  // get their own real camera (see setupStationaryCameras's
  // linkedSpecs), so the maze shows the actual RELATIONSHIP the
  // puzzle taught, not just one number pulled out of it: a
  // complementary puzzle's two cones really do sum to 90 degrees in
  // the room, a supplementary/linear-pair one to 180, and a vertical
  // "equal angles" puzzle produces two cones of the identical width.
  // Each value's own direction-pick (which of its camera's two valid
  // corridor directions it watches) reuses the same per-type midpoint
  // split as before, applied independently to that value -- complementary
  // values never reach 90 at all, so a flat 90 threshold would be
  // degenerate for that type specifically.
  var linkedSpecs = [];
  if (currentPuzzle && typeof currentPuzzle.correctAnswer === "number" && typeof currentPuzzle.knownValue === "number") {
    var linkedThreshold = currentPuzzle.type === "complementary" ? 45 : 90;
    linkedSpecs.push({ angle: currentPuzzle.knownValue, pickB: currentPuzzle.knownValue >= linkedThreshold, role: "known" });
    linkedSpecs.push({ angle: currentPuzzle.correctAnswer, pickB: currentPuzzle.correctAnswer >= linkedThreshold, role: "answer" });
  }

  // Cameras go up onto the already-two-path maze, then get their own
  // repair pass -- see ensureCameraFreePath -- so there's always a
  // route that never enters either one's cone, on top of the
  // baseline guarantee above.
  setupStationaryCameras(allEdges, adj, startCell, doorCell, avoidCells, linkedSpecs);
  var camRepaired = ensureCameraFreePath(allEdges, adj, startCell, doorCell, stationaryCameras);
  allEdges = camRepaired.edges;
  adj = camRepaired.adj;

  // Kept around so a guard's random wander (see updatePatrolGuards)
  // can look up real neighbors of whatever cell it just arrived at.
  sneakRoomAdj = adj;

  // camRepaired.blockedIdx marks every corridor a camera already
  // covers, computed fresh against this final edge list -- guards
  // never get posted to double up on ground a camera's watching for
  // free (see setupPatrolGuards's own comment).
  setupPatrolGuards(allEdges, adj, avoidCells, startCell, doorCell, camRepaired.blockedIdx);

  // sneakGraceTimer deliberately isn't started here -- it starts once
  // MAZE_REVEAL hands off to real SNEAKING (see updateMazeRevealPhase),
  // so the cinematic below doesn't eat into the player's actual
  // invulnerability window.
  sneakChaseTimer = 0;
  sneakWasSpotted = false;
  tensionActive = false;
  tensionBlipTimer = 0;
  spawnPulseTimer = SPAWN_PULSE_DURATION;
  linkedCameraCalloutTimer = linkedSpecs.length > 0 ? LINKED_CAMERA_CALLOUT_DURATION : 0;

  // Skip straight to normal SNEAKING if there are no linked cameras to
  // reveal (currentPuzzle missing knownValue/correctAnswer -- shouldn't
  // happen in real play, but degrades gracefully instead of running a
  // zoom-out cinematic toward nothing).
  var linkedCams = stationaryCameras.filter(function (c) { return c.isPlayerLinked; });
  if (linkedCams.length > 0) {
    mazeRevealTimer = MAZE_REVEAL_DURATION;
    puzzlePhase = PUZZLE_PHASE_MAZE_REVEAL;
  } else {
    sneakGraceTimer = SNEAK_GRACE_PERIOD;
    puzzlePhase = PUZZLE_PHASE_SNEAKING;
  }
}

// Attempts to begin exactly one grid step from whatever direction is
// queued (a real key-down event, see keyPressed) or, failing that,
// currently held AND already past ROBBER_REPEAT_DELAY (see
// robberHeldDir/robberHeldDuration, updated once per frame in
// updateSneakingPhase). Returns false (and starts nothing) if there's
// no directional input at all, the hold hasn't cleared the repeat
// delay yet, or the connecting corridor cell is a wall. Split out
// from updateSneakingPhase so a step that finishes mid-frame can
// immediately try to chain into another one using leftover time,
// instead of only ever checking input once per frame.
function tryStartRobberStep() {
  var stepDGr = 0, stepDGc = 0;
  if (stepQueued) {
    // A real key-down event already queued this step (see
    // keyPressed) -- guaranteed to catch it even if the tap was
    // shorter than one draw() frame. This is always a fresh press,
    // never a repeat, so it's exempt from the repeat-delay gate below.
    stepDGr = stepQueuedDGr;
    stepDGc = stepQueuedDGc;
    stepQueued = false;
  } else if (keyEdge("left") || keyEdge("a")) { stepDGc = -2; }
  else if (keyEdge("right") || keyEdge("d")) { stepDGc = 2; }
  else if (keyEdge("up") || keyEdge("w")) { stepDGr = -2; }
  else if (keyEdge("down") || keyEdge("s")) { stepDGr = 2; }
  else if (robberHeldDuration >= ROBBER_REPEAT_DELAY) {
    if (safeKeyDown("left") || safeKeyDown("a")) { stepDGc = -2; }
    else if (safeKeyDown("right") || safeKeyDown("d")) { stepDGc = 2; }
    else if (safeKeyDown("up") || safeKeyDown("w")) { stepDGr = -2; }
    else if (safeKeyDown("down") || safeKeyDown("s")) { stepDGr = 2; }
  }

  if (stepDGr === 0 && stepDGc === 0) { return false; }

  // The cell directly between the current room cell and the target
  // one IS the corridor wall between them -- open iff that maze cell
  // isn't solid.
  var midGr = robberCellGr + stepDGr / 2;
  var midGc = robberCellGc + stepDGc / 2;
  if (isWallCellAt(midGr, midGc)) { return false; }

  robberCellGr += stepDGr;
  robberCellGc += stepDGc;
  var stepTarget = superGridToPixel(robberCellGr, robberCellGc);
  robberStepFromX = robberX;
  robberStepFromY = robberY;
  robberStepToX = stepTarget.x;
  robberStepToY = stepTarget.y;
  robberStepT = 0;
  return true;
}

// Ticks the brief zoom-out cinematic (see PUZZLE_PHASE_MAZE_REVEAL's
// own comment) -- no player input, no guard/spotting logic runs yet,
// just the same fade timers the real sneaking phase also ticks
// (spawn pulse, the linked-camera callout) so both finish naturally
// whether or not their duration outlasts the cinematic itself. Hands
// off to real SNEAKING, starting the invulnerability grace period
// fresh, once the reveal finishes.
function updateMazeRevealPhase(dt) {
  if (spawnPulseTimer > 0) { spawnPulseTimer -= dt; }
  if (linkedCameraCalloutTimer > 0) { linkedCameraCalloutTimer -= dt; }
  mazeRevealTimer -= dt;
  if (mazeRevealTimer <= 0) {
    sneakGraceTimer = SNEAK_GRACE_PERIOD;
    puzzlePhase = PUZZLE_PHASE_SNEAKING;
  }
}

function updateSneakingPhase(dt) {
  if (spawnPulseTimer > 0) { spawnPulseTimer -= dt; }
  if (linkedCameraCalloutTimer > 0) { linkedCameraCalloutTimer -= dt; }

  // A chase animation in progress overrides everything else -- no
  // player input, no exit check, until it plays out.
  if (sneakChaseTimer > 0) {
    updateChaseAnimation(dt);
    return;
  }

  // Tracks how long the current direction has been continuously held,
  // for tryStartRobberStep()'s repeat-delay gate (see
  // ROBBER_REPEAT_DELAY) - switching direction (or releasing) resets
  // the clock, same as it would for any hold-to-repeat control.
  var curHeldDir = (safeKeyDown("left") || safeKeyDown("a")) ? "left"
    : (safeKeyDown("right") || safeKeyDown("d")) ? "right"
    : (safeKeyDown("up") || safeKeyDown("w")) ? "up"
    : (safeKeyDown("down") || safeKeyDown("s")) ? "down"
    : null;
  if (curHeldDir !== null && curHeldDir === robberHeldDir) {
    robberHeldDuration += dt;
  } else {
    robberHeldDir = curHeldDir;
    robberHeldDuration = 0;
  }

  // Grid-stepped movement: a key press moves the robber exactly one
  // full cell, tweened smoothly rather than an instant jump. A step
  // that finishes partway through a frame immediately chains into
  // the next one using whatever time is left over, instead of
  // waiting for the following frame -- that's what keeps holding a
  // direction feeling like one continuous glide through a corridor
  // rather than a beat of hesitation at every cell boundary.
  var remainingDt = dt;
  var stepChainGuard = 0;
  while (remainingDt > 0 && stepChainGuard < 8) {
    stepChainGuard++;
    if (robberStepT < 1) {
      var deltaT = remainingDt / ROBBER_STEP_DURATION;
      var neededT = 1 - robberStepT;
      if (deltaT >= neededT) {
        robberStepT = 1;
        robberX = robberStepToX;
        robberY = robberStepToY;
        remainingDt -= neededT * ROBBER_STEP_DURATION;
      } else {
        robberStepT += deltaT;
        robberX = robberStepFromX + (robberStepToX - robberStepFromX) * robberStepT;
        robberY = robberStepFromY + (robberStepToY - robberStepFromY) * robberStepT;
        remainingDt = 0;
      }
    } else if (!tryStartRobberStep()) {
      break; // no queued/held direction, or the way is blocked -- nothing more to do this frame
    }
  }

  updatePatrolGuards(dt);

  if (sneakGraceTimer > 0) {
    sneakGraceTimer -= dt;
    tensionActive = false;
    tensionBlipTimer = 0;
  } else {
    var spot = checkForSpotting();
    if (spot.caught) {
      tensionActive = false;
      startChaseSequence(spot.x, spot.y);
      return;
    }

    // A near miss pulses the screen and blips a tone on a short
    // repeat timer -- see TENSION_BLIP_INTERVAL -- rather than every
    // frame, which would just be a constant tone the whole time a
    // cone stays close.
    tensionActive = computeTensionActive();
    if (tensionActive) {
      tensionBlipTimer -= dt;
      if (tensionBlipTimer <= 0) {
        playSfx("tension");
        tensionBlipTimer = TENSION_BLIP_INTERVAL;
      }
    } else {
      tensionBlipTimer = 0;
    }
  }

  var ddx = robberX - sneakDoorX;
  var ddy = robberY - sneakDoorY;
  var reachedExit = Math.sqrt(ddx * ddx + ddy * ddy) < SNEAK_DOOR_RADIUS;
  if (reachedExit) {
    finishSneaking();
  }
}

// Being spotted costs a life -- the crew tripped an alarm mid-heist,
// not a free mistake -- and kicks off a short chase: the robber
// flees off screen with every guard on their tail. This one room's
// attempt is over either way once it plays out.
function startChaseSequence(chaserX, chaserY) {
  sneakWasSpotted = true;
  triggerShake(6, 14);
  playSfx("wrong");
  lives -= 1;
  showFeedback("CAUGHT! -1 LIFE", COLOR_TEXT_WARN, 40);

  var dx = robberX - chaserX;
  var dy = robberY - chaserY;
  var mag = Math.sqrt(dx * dx + dy * dy);
  if (mag < 0.01) { dx = 1; dy = 0; mag = 1; }
  sneakFleeDirX = dx / mag;
  sneakFleeDirY = dy / mag;

  sneakChaseTimer = SNEAK_CHASE_DURATION;
}

// The robber sprints off the edge of the room (ignoring walls and
// bounds on purpose -- that's the "off screen" part) while EVERY
// guard actively pursues -- each one steers straight at the
// robber's CURRENT position every frame (not a single fixed
// direction picked at the start), so they visibly close in and,
// since the robber is fleeing in a straight line, naturally end up
// falling in directly behind them by the time the animation ends.
// One catch ends the run at this room: once it plays out, either
// the heist is over (out of lives) or the crew just moves on to
// whatever the correct answer already earned -- the next puzzle, or
// clearing the sector -- same as reaching the door would.
function updateChaseAnimation(dt) {
  var fleeSpeed = ROBBER_SPEED * 1.3;
  robberX += sneakFleeDirX * fleeSpeed * dt;
  robberY += sneakFleeDirY * fleeSpeed * dt;

  var guardChaseSpeed = fleeSpeed * 1.05; // just fast enough to close the gap
  for (var i = 0; i < patrolGuards.length; i++) {
    var g = patrolGuards[i];
    var dx = robberX - g.x;
    var dy = robberY - g.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.01) {
      g.x += (dx / dist) * guardChaseSpeed * dt;
      g.y += (dy / dist) * guardChaseSpeed * dt;
      g.facing = Math.atan2(dy, dx) * 180 / Math.PI;
    }
  }

  sneakChaseTimer -= dt;
  if (sneakChaseTimer <= 0) {
    sneakChaseTimer = 0;
    if (lives <= 0) {
      triggerGameOver();
      return;
    }
    resolvePendingAdvance();
  }
}

// Only ever called once the robber has actually reached the door --
// there's no time limit to run out on anymore, so this always means
// success. The bonus just reflects whether you got there clean.
function finishSneaking() {
  if (!sneakWasSpotted) {
    currentScore += 40;
    showFeedback("CLEAN GETAWAY! +40", COLOR_TEXT_GOOD, 45);
  } else {
    currentScore += 15;
    showFeedback("MADE IT THROUGH! +15", COLOR_TEXT_GOOD, 45);
  }
  if (currentScore > sessionHighScore) { sessionHighScore = currentScore; }
  checkSkinUnlocks();
  resolvePendingAdvance();
}

function drawDoorMarker(x, y) {
  noStroke();
  fill(COLOR_TEXT_GOOD[0], COLOR_TEXT_GOOD[1], COLOR_TEXT_GOOD[2], 60);
  ellipse(x, y, 28, 28);
  noFill();
  stroke(COLOR_TEXT_GOOD[0], COLOR_TEXT_GOOD[1], COLOR_TEXT_GOOD[2]);
  strokeWeight(3);
  ellipse(x, y, 18, 18);
  noStroke();
  fill(COLOR_TEXT_GOOD[0], COLOR_TEXT_GOOD[1], COLOR_TEXT_GOOD[2]);
  textAlign(CENTER, CENTER);
  textSize(8);
  text("EXIT", x, y + 16);
}

// A one-second exit-colored pulse right at the spawn point, the
// instant the maze appears -- same COLOR_TEXT_GOOD as the exit door
// itself, so it reads as "you start here" using the same visual
// language rather than a brand new color meaning something new. An
// expanding, fading ring plus a fading core dot -- see
// spawnPulseTimer/SPAWN_PULSE_DURATION, set once in
// startSneakingPhase and ticked down every frame in
// updateSneakingPhase.
function drawSpawnPulse(x, y) {
  if (spawnPulseTimer <= 0) { return; }
  var progress = 1 - (spawnPulseTimer / SPAWN_PULSE_DURATION);

  // Three staggered rings instead of one -- reads as an actively
  // rippling pulse, not just a single circle quietly fading out. Each
  // ring runs the same expand-and-fade arc, just started a beat later
  // than the one before it.
  var ringCount = 3;
  for (var i = 0; i < ringCount; i++) {
    var ringProgress = progress - i * 0.18;
    if (ringProgress < 0 || ringProgress > 1) { continue; }
    var ringRadius = 8 + ringProgress * 34;
    var ringAlpha = 235 * (1 - ringProgress);
    noFill();
    stroke(COLOR_TEXT_GOOD[0], COLOR_TEXT_GOOD[1], COLOR_TEXT_GOOD[2], ringAlpha);
    strokeWeight(4);
    ellipse(x, y, ringRadius * 2, ringRadius * 2);
  }

  // A bright core with a white-hot center -- strongest right at
  // spawn, fading out over just the first beat so it reads as a
  // quick flash rather than lingering the whole second.
  var coreAlpha = 255 * Math.max(0, 1 - progress / 0.6);
  noStroke();
  fill(COLOR_TEXT_GOOD[0], COLOR_TEXT_GOOD[1], COLOR_TEXT_GOOD[2], coreAlpha);
  ellipse(x, y, 16, 16);
  fill(255, 255, 255, coreAlpha * 0.85);
  ellipse(x, y, 7, 7);
}

// A thin gold ring around the one camera the puzzle answer actually
// controls (see setupStationaryCameras) -- drawn every frame for as
// long as that camera exists, unlike the callout below, so the
// player can still pick it out of the other cameras well after the
// callout text has faded.
// colorArr distinguishes the two linked cameras -- COLOR_LASER_GOLD
// for the "answer" role (the number the student calculated) and
// COLOR_LASER_RED for the "known" role (the number the puzzle gave
// them), matching the same red the known angle's own wedge already
// uses on the diagram screen, so the color carries its meaning over
// rather than introducing a new one. See LINKED_CAMERA_ROLE_COLORS.
function drawLinkedCameraRing(x, y, colorArr) {
  noFill();
  stroke(colorArr[0], colorArr[1], colorArr[2], 170);
  strokeWeight(2);
  ellipse(x, y, 26, 26);
}

// A small persistent "62°" readout next to the linked camera's ring,
// shown for as long as the camera exists (not just the brief callout
// below) -- coneWidthDeg is always the camera's ACTUAL rendered cone
// width (already clamped, see setupStationaryCameras), never the raw
// unclamped puzzle value, so the number on screen always matches the
// cone actually drawn. Offset opposite the camera's own facing so it
// never sits on top of the illuminated cone, then clamped to stay
// clear of the room bounds for cameras placed near an edge.
function drawLinkedCameraDegreeLabel(x, y, facingDeg, coneWidthDeg, colorArr) {
  var awayRad = (facingDeg + 180) * Math.PI / 180;
  var lx = clampNum(x + Math.cos(awayRad) * 18, ROOM_LEFT + 16, ROOM_RIGHT - 16);
  var ly = clampNum(y + Math.sin(awayRad) * 18, ROOM_TOP + 10, ROOM_BOTTOM - 10);
  noStroke();
  fill(colorArr[0], colorArr[1], colorArr[2], 220);
  textAlign(CENTER, CENTER);
  textSize(9);
  text(Math.round(coneWidthDeg) + "°", lx, ly);
}

// "YOUR ANGLE: 62°" / "GIVEN ANGLE: 28°" fades in over each linked
// camera the moment its maze appears -- see
// linkedCameraCalloutTimer/LINKED_CAMERA_CALLOUT_DURATION, set in
// startSneakingPhase and ticked down in updateMazeRevealPhase/
// updateSneakingPhase. Clamped away from the top HUD edge since a
// camera can land in the maze's very first room row. The persistent
// degree label above stays on screen after this fades, so the
// connection isn't lost once the callout's gone.
function drawLinkedCameraCallout(x, y, coneWidthDeg, colorArr, labelPrefix) {
  var progress = 1 - (linkedCameraCalloutTimer / LINKED_CAMERA_CALLOUT_DURATION);
  var alpha = 255 * Math.min(1, (1 - progress) * 2.5);
  var labelY = Math.max(y - 20, ROOM_TOP + 12);
  noStroke();
  fill(colorArr[0], colorArr[1], colorArr[2], alpha);
  textAlign(CENTER, CENTER);
  textSize(9);
  text(labelPrefix + ": " + Math.round(coneWidthDeg) + "°", x, labelY);
}

// The maze walls themselves -- solid blocks the robber and the
// patrol guards both have to go around, Pac-Man style. A flat dark
// hedge-green fill, one rect per cell -- there can be well over a
// hundred of these on screen at once with the denser grid, so this
// deliberately skips per-cell texture (a shadow + leafy flecks, tried
// earlier) that multiplied every wall cell's draw cost 5x for a
// detail nobody could see at this scale anyway. The color alone
// still reads as hedge, not the old tech-panel gray.
function drawMazeWalls() {
  noStroke();
  if (currentRoomStyle === ROOM_STYLE_VAULT) {
    fill(COLOR_VAULT_WALL[0], COLOR_VAULT_WALL[1], COLOR_VAULT_WALL[2]);
  } else {
    fill(COLOR_HEDGE_DARK[0], COLOR_HEDGE_DARK[1], COLOR_HEDGE_DARK[2]);
  }
  for (var i = 0; i < mazeWallRects.length; i++) {
    var b = mazeWallRects[i];
    rect(b.left, b.top, b.right - b.left, b.bottom - b.top);
  }

  // Riveted panel seams -- matches the same riveted-metal language
  // already used for duct joints elsewhere in the game, instead of
  // the hedge style's flat, textureless fill.
  if (currentRoomStyle === ROOM_STYLE_VAULT) {
    stroke(COLOR_VAULT_WALL_SEAM[0], COLOR_VAULT_WALL_SEAM[1], COLOR_VAULT_WALL_SEAM[2], 130);
    strokeWeight(1);
    for (var j = 0; j < mazeWallRects.length; j++) {
      var wb = mazeWallRects[j];
      var midX = (wb.left + wb.right) / 2, midY = (wb.top + wb.bottom) / 2;
      if (wb.right - wb.left > wb.bottom - wb.top) {
        line(wb.left + 3, midY, wb.right - 3, midY);
      } else {
        line(midX, wb.top + 3, midX, wb.bottom - 3);
      }
    }
    noStroke();
  }
}

// The MAZE_REVEAL cinematic: the same drawSneakingScene() the real
// sneaking phase uses, just wrapped in a zoom/pan transform that
// starts tight on the linked camera and eases out to the normal,
// unzoomed framing. Built as a "zoom to point" transform anchored at
// the room's own center (ROOM_LEFT/RIGHT/TOP/BOTTOM's midpoint) --
// at progress 1 the focus point equals that anchor and the zoom
// equals 1, which makes the whole transform a mathematical identity
// (net translate of zero, scale of one), so the final frame here is
// pixel-identical to how the room renders once real SNEAKING takes
// over -- no visible seam at the handoff.
function drawMazeRevealScene() {
  var progress = 1 - clampNum(mazeRevealTimer / MAZE_REVEAL_DURATION, 0, 1);
  var eased = progress * progress * (3 - 2 * progress);

  var anchorX = (ROOM_LEFT + ROOM_RIGHT) / 2;
  var anchorY = (ROOM_TOP + ROOM_BOTTOM) / 2;

  var linkedCams = stationaryCameras.filter(function (c) { return c.isPlayerLinked; });
  var startFocusX = anchorX, startFocusY = anchorY, startZoom = 1;
  if (linkedCams.length > 0) {
    // Two linked cameras (known + answer, see startSneakingPhase)
    // usually sit at different points in the room -- frame the
    // midpoint of BOTH instead of just one, and pick a starting zoom
    // that's tight enough to feel like a reveal but never so tight it
    // clips either camera out of frame, whichever way they happen to
    // land relative to each other.
    var xs = linkedCams.map(function (c) { return c.x; });
    var ys = linkedCams.map(function (c) { return c.y; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    startFocusX = (minX + maxX) / 2;
    startFocusY = (minY + maxY) / 2;
    var boxMargin = 90; // room for each camera's cone/ring/degree label, not just its center point
    var fitZoomX = (ROOM_RIGHT - ROOM_LEFT) / (maxX - minX + boxMargin);
    var fitZoomY = (ROOM_BOTTOM - ROOM_TOP) / (maxY - minY + boxMargin);
    startZoom = clampNum(Math.min(fitZoomX, fitZoomY, MAZE_REVEAL_ZOOM_START), 1.3, MAZE_REVEAL_ZOOM_START);
  }

  var zoom = startZoom + (1 - startZoom) * eased;
  var focusX = startFocusX + (anchorX - startFocusX) * eased;
  var focusY = startFocusY + (anchorY - startFocusY) * eased;

  push();
  translate(anchorX, anchorY);
  scale(zoom);
  translate(-focusX, -focusY);
  drawSneakingScene();
  pop();
}

function drawSneakingScene() {
  // The floor and outer border both follow currentRoomStyle too --
  // a gravel path inside a hedge perimeter, or a tiled floor inside a
  // vault corridor's own wall color, never a mismatched pairing.
  var floorColor = currentRoomStyle === ROOM_STYLE_VAULT ? COLOR_VAULT_FLOOR : COLOR_MAZE_PATH;
  var borderColor = currentRoomStyle === ROOM_STYLE_VAULT ? COLOR_VAULT_WALL : COLOR_HEDGE_DARK;

  noStroke();
  fill(floorColor[0], floorColor[1], floorColor[2]);
  rect(ROOM_LEFT, ROOM_TOP, ROOM_RIGHT - ROOM_LEFT, ROOM_BOTTOM - ROOM_TOP, 6);

  noFill();
  stroke(borderColor[0], borderColor[1], borderColor[2]);
  strokeWeight(2);
  rect(ROOM_LEFT, ROOM_TOP, ROOM_RIGHT - ROOM_LEFT, ROOM_BOTTOM - ROOM_TOP, 6);

  drawMazeWalls();
  drawSafeZones();
  drawDoorMarker(sneakDoorX, sneakDoorY);
  drawSpawnPulse(sneakStartX, sneakStartY);

  // Cameras never move, so their cone's point list was already cast
  // once at placement time (see setupStationaryCameras) -- this just
  // redraws the cached points, no fresh ray-marching per frame. The
  // cone itself only shows while the camera's actually on (see
  // isCameraOn) -- dark means genuinely blind, not just dim.
  for (var c = 0; c < stationaryCameras.length; c++) {
    var cam = stationaryCameras[c];
    var camOn = isCameraOn(cam);
    // A linked camera (see setupStationaryCameras's linkedSpecs) gets
    // a color/label pulled from its role instead of the generic cyan
    // every unlinked camera uses -- a lasting visual thread from "the
    // number from the puzzle" to "the hazard it actually controls,"
    // not just a one-time callout.
    var roleInfo = cam.linkRole ? LINKED_CAMERA_ROLE_INFO[cam.linkRole] : null;
    var camConeColor = roleInfo ? roleInfo.color : COLOR_CAMERA_BEAM;
    if (camOn) { drawConePoints(cam.x, cam.y, cam.conePoints, camConeColor); }
    if (roleInfo) {
      drawLinkedCameraRing(cam.x, cam.y, roleInfo.color);
      drawLinkedCameraDegreeLabel(cam.x, cam.y, cam.facing, cam.coneWidth, roleInfo.color);
    }
    drawCameraIcon(cam.x, cam.y, cam.facing, camOn);
    if (roleInfo && linkedCameraCalloutTimer > 0) { drawLinkedCameraCallout(cam.x, cam.y, cam.coneWidth, roleInfo.color, roleInfo.label); }
  }

  // The roaming patrol guards -- each radiating a small red alert
  // aura -- get inside it and they notice you no matter which way
  // they're looking, on top of whatever their wall-clipped cone
  // already covers. A guard's position and facing change every
  // frame, so its cone gets re-cast fresh each time (see
  // castRayDistance).
  for (var i = 0; i < patrolGuards.length; i++) {
    var g = patrolGuards[i];
    var half = g.coneWidth / 2;
    drawIlluminatedConeClipped(g.x, g.y, g.coneRadius, g.facing - half, g.facing + half, COLOR_LASER_GOLD, 8);
    drawGuardAura(g.x, g.y, GUARD_ALERT_RADIUS);
    drawGroundShadow(g.x, g.y, 7);
    drawGuardIcon(g.x, g.y);
  }

  if (sneakChaseTimer > 0) {
    drawChaseAnimation();
  } else {
    drawGroundShadow(robberX, robberY, 8);
    drawSpySprite(robberX, robberY, false, SPRITE_MAZE_SCALE);
    if (isRobberInSafeZone()) {
      // A soft veil over the sprite, tinted to match whichever hiding
      // spot this room style actually uses -- the visible tell that
      // you're actually concealed right now, not just standing near
      // one.
      var hideTint = currentRoomStyle === ROOM_STYLE_VAULT ? COLOR_CRATE : COLOR_BUSH;
      noStroke();
      fill(hideTint[0], hideTint[1], hideTint[2], 150);
      ellipse(robberX, robberY, 26, 22);
    }
  }

  drawTensionPulse();
}

// A small cluster of dark, overlapping foliage blobs -- a hiding
// spot the robber can duck into (see isRobberInSafeZone) to become
// immune to every hazard's cone. Drawn right on the path, after the
// walls but before any hazard cone, so cones/sprites still render on
// top of it -- this is a gameplay rule, not a rendering occluder.
function drawBushIcon(x, y) {
  noStroke();
  fill(COLOR_BUSH[0], COLOR_BUSH[1], COLOR_BUSH[2]);
  ellipse(x - 6, y + 2, 16, 12);
  ellipse(x + 6, y + 2, 16, 12);
  ellipse(x, y - 3, 18, 14);
  fill(COLOR_BUSH_HIGHLIGHT[0], COLOR_BUSH_HIGHLIGHT[1], COLOR_BUSH_HIGHLIGHT[2]);
  ellipse(x - 4, y - 2, 8, 6);
  ellipse(x + 5, y, 7, 5);
}

// The Vault Corridor style's hiding spot -- a couple of stacked
// shipping crates, the indoor equivalent of the hedge style's bush:
// a plausible thing to duck behind inside a building, planks and
// strapping included so it doesn't read as just a plain brown box.
function drawCrateIcon(x, y) {
  noStroke();
  fill(COLOR_CRATE[0], COLOR_CRATE[1], COLOR_CRATE[2]);
  rect(x - 10, y - 4, 13, 12, 1);
  rect(x + 1, y - 9, 11, 15, 1);
  fill(COLOR_CRATE_HIGHLIGHT[0], COLOR_CRATE_HIGHLIGHT[1], COLOR_CRATE_HIGHLIGHT[2]);
  rect(x - 10, y - 4, 13, 3);
  rect(x + 1, y - 9, 11, 3);
  stroke(COLOR_MAZE_SHADOW[0], COLOR_MAZE_SHADOW[1], COLOR_MAZE_SHADOW[2]);
  strokeWeight(1);
  line(x - 3.5, y - 4, x - 3.5, y + 8);
  line(x + 6.5, y - 9, x + 6.5, y + 6);
  noStroke();
}

function drawSafeZones() {
  var drawIcon = currentRoomStyle === ROOM_STYLE_VAULT ? drawCrateIcon : drawBushIcon;
  for (var i = 0; i < safeZoneCells.length; i++) {
    drawIcon(safeZoneCells[i].px, safeZoneCells[i].py);
  }
}

// A pulsing red glow around the room's border while a near-miss is
// active (see computeTensionActive) -- confined to the maze rect
// itself so it never bleeds into the HUD above it.
function drawTensionPulse() {
  if (!tensionActive) { return; }
  var t = (typeof millis === "function") ? millis() : 0;
  var pulse = 0.5 + 0.5 * Math.sin(t * 0.012);
  var baseAlpha = 40 + pulse * 55;
  var w = ROOM_RIGHT - ROOM_LEFT, h = ROOM_BOTTOM - ROOM_TOP;
  var layers = 5;
  noFill();
  for (var i = 0; i < layers; i++) {
    var inset = i * 3;
    stroke(255, 30, 40, baseAlpha * (1 - i / layers));
    strokeWeight(3);
    rect(ROOM_LEFT + inset, ROOM_TOP + inset, w - inset * 2, h - inset * 2, 6);
  }
}

// A small dark ellipse under a character's feet -- cheap depth cue,
// consistent with the hedges' own dropped shadows.
function drawGroundShadow(x, y, r) {
  noStroke();
  fill(COLOR_MAZE_SHADOW[0], COLOR_MAZE_SHADOW[1], COLOR_MAZE_SHADOW[2], 110);
  ellipse(x + 2, y + 3, r * 2, r);
}

// The guard who spotted the robber lurches after them (with an
// alert "!" overhead) while the robber sprints off screen -- drawn
// last/on top and deliberately allowed to go past the room bounds.
function drawChaseAnimation() {
  for (var i = 0; i < patrolGuards.length; i++) {
    var g = patrolGuards[i];
    drawGuardIcon(g.x, g.y);
    noStroke();
    fill(255, 60, 60);
    textAlign(CENTER, CENTER);
    textSize(14);
    text("!", g.x, g.y - 20);
  }

  drawSpySprite(robberX, robberY, true, SPRITE_MAZE_SCALE);
}


// ----------------------------------------------------------------
// SECTION 22: HUD DRAWING
// ----------------------------------------------------------------
// Top HUD height -- covers the two stat rows plus the meters row as
// one clean panel, instead of the meters spilling out past the
// panel's own bottom edge into open background the way they used to.
var HUD_PANEL_HEIGHT = 56;

function drawHUD() {
  noStroke();
  fill(COLOR_PANEL[0], COLOR_PANEL[1], COLOR_PANEL[2]);
  rect(0, 0, CANVAS_W, HUD_PANEL_HEIGHT);
  stroke(COLOR_PANEL_BORDER[0], COLOR_PANEL_BORDER[1], COLOR_PANEL_BORDER[2]);
  strokeWeight(1);
  line(0, HUD_PANEL_HEIGHT, CANVAS_W, HUD_PANEL_HEIGHT);
  // A light inner divider between the stat rows and the meters row,
  // so the two are read as separate groups instead of one crowded
  // block -- "how you're doing" up top, "how much time/risk is left"
  // below.
  stroke(COLOR_PANEL_BORDER[0], COLOR_PANEL_BORDER[1], COLOR_PANEL_BORDER[2], 90);
  strokeWeight(1);
  line(8, 34, CANVAS_W - 8, 34);

  textAlign(LEFT, CENTER);
  textSize(13);
  noStroke();
  fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  text("SCORE " + currentScore, 8, 13);

  fill(COLOR_TEXT_DIM[0], COLOR_TEXT_DIM[1], COLOR_TEXT_DIM[2]);
  textSize(11);
  var levelLabel;
  if (isChallengeMode) {
    levelLabel = "CHALLENGE Lv." + challengeDifficulty + "  (run: " + challengePuzzlesSolved + ")";
  } else {
    var lvl = LEVELS[currentLevelIndex];
    var roomNumber = Math.min(puzzlesSolvedInLevel + 1, lvl.puzzlesToClear);
    levelLabel = lvl.name + "  (room " + roomNumber + "/" + lvl.puzzlesToClear + ")";
  }
  text(levelLabel, 8, 27);

  drawLivesIcons(CANVAS_W - 8, 13);
  drawStreakBadge(CANVAS_W - 8, 27);

  // No per-puzzle timer while sneaking (or during the reveal
  // cinematic leading into it) -- nothing to show in this row at all
  // then, same as a frozen retry.
  if (puzzlePhase === PUZZLE_PHASE_SNEAKING || puzzlePhase === PUZZLE_PHASE_MAZE_REVEAL) { return; }

  if (hasFailedThisPuzzle && puzzlePhase === PUZZLE_PHASE_AIMING) {
    noStroke();
    fill(COLOR_TEXT_DIM[0], COLOR_TEXT_DIM[1], COLOR_TEXT_DIM[2]);
    textAlign(CENTER, CENTER);
    textSize(10);
    text("TIME FROZEN -- RETRY!", CANVAS_W / 2, 45);
    return;
  }

  var timerRatio = clampNum(timerValue / timerMax, 0, 1);
  var timerColor = timerRatio < 0.25 ? COLOR_TEXT_WARN : COLOR_LASER_GREEN;
  drawLabeledMeter("TIME", 8, 45, CANVAS_W - 16, timerRatio, timerColor, false);
}

// A small caption immediately to the left of its own mini-bar,
// instead of an unlabeled strip of color a player has to already
// know the meaning of -- isCritical swaps the caption to a warning
// color rather than adding a separate floating line of text above
// the bar, which would need more vertical room than this row has.
function drawLabeledMeter(label, x, y, w, ratio, barColorArr, isCritical) {
  var labelColor = isCritical ? COLOR_TEXT_WARN : COLOR_TEXT_DIM;
  noStroke();
  fill(labelColor[0], labelColor[1], labelColor[2]);
  textAlign(LEFT, CENTER);
  textSize(8);
  text(label, x, y);
  var labelW = textWidth(label) + 6;
  var barX = x + labelW, barW = Math.max(w - labelW, 10);

  fill(30, 30, 30);
  rect(barX, y - 3.5, barW, 7);
  fill(barColorArr[0], barColorArr[1], barColorArr[2]);
  rect(barX, y - 3.5, barW * clampNum(ratio, 0, 1), 7);
}

function drawSkillNameBanner(puzzle, y) {
  if (!puzzle || !puzzle.relationshipName) { return; }
  noStroke();
  fill(COLOR_TEXT_DIM[0], COLOR_TEXT_DIM[1], COLOR_TEXT_DIM[2]);
  textAlign(CENTER, CENTER);
  textSize(11);
  text(puzzle.relationshipName, CANVAS_W / 2, y);
}

// The rule reminder shown only on the very first puzzle of a
// relationship type this session (see markPuzzleFirstOfTypeIfNew) --
// paired with the slower timer from applyTimerForCurrentPuzzle, so
// there's actually time to read it before the clock matters.
// The very first puzzle of a type gets the rule reminder (paired with
// the slower timer from applyTimerForCurrentPuzzle, so there's
// actually time to read it) -- every puzzle after that gets a
// real-world Field Note instead, so the "why does this matter"
// answer isn't a one-time thing you see once and never again.
function drawPuzzleContextLine(puzzle, y) {
  if (!puzzle) { return; }
  var isFirst = puzzle.isFirstOfType;
  var line = isFirst ? PUZZLE_HINTS[puzzle.type] : PUZZLE_FIELD_NOTES[puzzle.type];
  if (!line) { return; }
  var color = isFirst ? COLOR_LASER_GOLD : COLOR_FIELD_NOTE;
  noStroke();
  fill(color[0], color[1], color[2]);
  textAlign(CENTER, CENTER);
  textSize(11);
  // text()'s (x, y) is the wrap box's TOP-LEFT corner whenever a width
  // is passed -- textAlign only controls how each line sits inside
  // that box, not where the box itself sits. Centering the box here
  // means starting it at CANVAS_W/2 minus half its own width, not at
  // CANVAS_W/2 itself (which ran the whole box off the right edge).
  var boxW = CANVAS_W - 40;
  text(line, (CANVAS_W - boxW) / 2, y, boxW);
}

function drawLivesIcons(rightX, y) {
  textAlign(RIGHT, CENTER);
  textSize(13);
  noStroke();
  fill(COLOR_TEXT_WARN[0], COLOR_TEXT_WARN[1], COLOR_TEXT_WARN[2]);
  var heartStr = "";
  for (var i = 0; i < lives; i++) { heartStr += "♥ "; }
  for (var j = lives; j < maxLives; j++) { heartStr += "♡ "; }
  text(heartStr, rightX, y);
}

function drawStreakBadge(rightX, y) {
  textAlign(RIGHT, CENTER);
  textSize(11);
  noStroke();
  fill(COLOR_LASER_GOLD[0], COLOR_LASER_GOLD[1], COLOR_LASER_GOLD[2]);
  text("STREAK " + streak + " (x" + computeMultiplierFromStreak(streak) + ")", rightX, y);
}

// ----------------------------------------------------------------
// SECTION 23: ANSWER INPUT (typing is the only way to answer)
// ----------------------------------------------------------------
function drawAnswerBox(cx, cy) {
  var boxW = 120;
  var boxH = 34;
  var boxX = cx - boxW / 2;
  var boxY = cy - boxH / 2;

  stroke(COLOR_PANEL_BORDER[0], COLOR_PANEL_BORDER[1], COLOR_PANEL_BORDER[2]);
  strokeWeight(2);
  fill(COLOR_PANEL[0], COLOR_PANEL[1], COLOR_PANEL[2]);
  rect(boxX, boxY, boxW, boxH, 6);

  noStroke();
  fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  textAlign(CENTER, CENTER);
  textSize(20);
  var displayStr = answerInput.length > 0 ? (answerInput + "°") : "?";
  text(displayStr, boxX + boxW / 2, boxY + boxH / 2);

  fill(COLOR_TEXT_DIM[0], COLOR_TEXT_DIM[1], COLOR_TEXT_DIM[2]);
  textSize(10);
  text("Type the degrees, ENTER to submit", cx, boxY + boxH + 14);
}

// Shown in place of the answer box during the sneak minigame.
function drawSneakPrompt(cx, cy) {
  noStroke();
  fill(COLOR_TEXT_GOOD[0], COLOR_TEXT_GOOD[1], COLOR_TEXT_GOOD[2]);
  textAlign(CENTER, CENTER);
  textSize(13);
  text("Correct! Sneak to the green exit!", cx, cy - 6);

  fill(COLOR_TEXT_DIM[0], COLOR_TEXT_DIM[1], COLOR_TEXT_DIM[2]);
  textSize(10);
  text("Arrow keys / WASD -- dodge the camera & patrol guards", cx, cy + 12);
}

function handleAnswerTyping() {
  for (var d = 0; d <= 9; d++) {
    if (keyEdge(String(d))) {
      if (answerInput.length < ANSWER_MAX_DIGITS) {
        answerInput += String(d);
      }
    }
  }
  if (keyEdge("backspace") || keyEdge("delete")) {
    answerInput = answerInput.slice(0, -1);
  }
  if (enterKeyEdge()) {
    submitAnswer();
  }
}


// ----------------------------------------------------------------
// SECTION 24: SCREEN -- TITLE
// ----------------------------------------------------------------
function drawTitleScreen() {
  drawBackgroundGrid();

  noStroke();
  fill(COLOR_LASER_GOLD[0], COLOR_LASER_GOLD[1], COLOR_LASER_GOLD[2]);
  textAlign(CENTER, CENTER);
  textSize(30);
  text("LASER HEIST", CANVAS_W / 2, 90);
  textSize(18);
  fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  text("ANGLE BREAKER", CANVAS_W / 2, 120);

  var statsW = 220, statsH = 28, statsX = CANVAS_W / 2 - statsW / 2, statsY = 148;
  drawScreenPanel(statsX, statsY, statsW, statsH);
  textSize(11);
  fill(COLOR_TEXT_DIM[0], COLOR_TEXT_DIM[1], COLOR_TEXT_DIM[2]);
  text("Best Score: " + sessionHighScore + "   Best Streak: " + bestStreakEver, CANVAS_W / 2, statsY + statsH / 2);

  var btnW = 180, btnH = 34, btnX = CANVAS_W / 2 - btnW / 2;
  var playY = 200, howY = 244, scoreY = 288;

  drawButton(btnX, playY, btnW, btnH, "START HEIST", buttonHovered(btnX, playY, btnW, btnH));
  drawButton(btnX, howY, btnW, btnH, "HOW TO PLAY", buttonHovered(btnX, howY, btnW, btnH));
  drawButton(btnX, scoreY, btnW, btnH, "HIGH SCORES", buttonHovered(btnX, scoreY, btnW, btnH));

  if (buttonClicked(btnX, playY, btnW, btnH)) {
    gameState = STATE_MODE_SELECT;
  }
  if (buttonClicked(btnX, howY, btnW, btnH)) {
    previousState = STATE_TITLE;
    gameState = STATE_INSTRUCTIONS;
  }
  if (buttonClicked(btnX, scoreY, btnW, btnH)) {
    gameState = STATE_HIGH_SCORES;
  }
}

function drawBackgroundGrid() {
  stroke(COLOR_BG_GRID[0], COLOR_BG_GRID[1], COLOR_BG_GRID[2]);
  strokeWeight(1);
  for (var gx = 0; gx <= CANVAS_W; gx += 20) {
    line(gx, 0, gx, CANVAS_H);
  }
  for (var gy = 0; gy <= CANVAS_H; gy += 20) {
    line(0, gy, CANVAS_W, gy);
  }
}


// ----------------------------------------------------------------
// SECTION 25: SCREEN -- MODE SELECT
// ----------------------------------------------------------------
// A full mode option as one card -- name and caption both live inside
// the same bordered box (instead of a button with a separate caption
// floating below it, which at this screen's old spacing landed
// exactly on top of the NEXT button down) and the whole card is the
// click target, not just its upper half.
function drawModeCard(x, y, w, h, title, caption, isHovered) {
  fill(isHovered ? COLOR_BUTTON_HOVER[0] : COLOR_BUTTON[0], isHovered ? COLOR_BUTTON_HOVER[1] : COLOR_BUTTON[1], isHovered ? COLOR_BUTTON_HOVER[2] : COLOR_BUTTON[2]);
  stroke(COLOR_BUTTON_BORDER[0], COLOR_BUTTON_BORDER[1], COLOR_BUTTON_BORDER[2]);
  strokeWeight(2);
  rect(x, y, w, h, 8);

  noStroke();
  fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  textAlign(CENTER, CENTER);
  textSize(15);
  text(title, x + w / 2, y + 21);

  fill(COLOR_TEXT_DIM[0], COLOR_TEXT_DIM[1], COLOR_TEXT_DIM[2]);
  textSize(9);
  // Same wrap-box-is-top-left-anchored gotcha as drawPuzzleContextLine:
  // box must start at x + 12 (half of the 24px margin) to stay
  // centered in the card, not at the card's own center.
  text(caption, x + 12, y + h - 16, w - 24);
}

function drawModeSelectScreen() {
  drawBackgroundGrid();
  noStroke();
  fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  textAlign(CENTER, CENTER);
  textSize(20);
  text("CHOOSE YOUR HEIST", CANVAS_W / 2, 76);

  var cardW = 280, cardH = 62, cardX = CANVAS_W / 2 - cardW / 2, gap = 14;
  var campaignY = 104, challengeY = campaignY + cardH + gap, practiceY = challengeY + cardH + gap;

  drawModeCard(cardX, campaignY, cardW, cardH, "CAMPAIGN (5 Sectors)", "Teaches each angle type step by step.", buttonHovered(cardX, campaignY, cardW, cardH));
  drawModeCard(cardX, challengeY, cardW, cardH, "CHALLENGE (Endless)", "All four types mixed, speeds up forever.", buttonHovered(cardX, challengeY, cardW, cardH));
  drawModeCard(cardX, practiceY, cardW, cardH, "PRACTICE MODE", "No timer, no lives, no score -- pick your skills.", buttonHovered(cardX, practiceY, cardW, cardH));

  var backW = 90, backH = 26;
  var backX = 10, backY = CANVAS_H - 36;
  drawButton(backX, backY, backW, backH, "< BACK", buttonHovered(backX, backY, backW, backH));

  if (buttonClicked(cardX, campaignY, cardW, cardH)) {
    resetFullGame();
    startLevel(0);
  }
  if (buttonClicked(cardX, challengeY, cardW, cardH)) {
    gameState = STATE_CHALLENGE_INTRO;
  }
  if (buttonClicked(cardX, practiceY, cardW, cardH)) {
    gameState = STATE_PRACTICE_SETUP;
  }
  if (buttonClicked(backX, backY, backW, backH)) {
    gameState = STATE_TITLE;
  }
}


// ----------------------------------------------------------------
// SECTION 25B: PRACTICE MODE (no timer, no score, no lives)
// ----------------------------------------------------------------
var PRACTICE_SKILL_OPTIONS = [
  { key: "supplementary", label: "Supplementary Angles" },
  { key: "complementary", label: "Complementary Angles" },
  { key: "vertical", label: "Vertical Angles" },
  { key: "parallel", label: "Parallel Lines + Transversal" }
];

function anyPracticeSkillSelected() {
  for (var i = 0; i < PRACTICE_SKILL_OPTIONS.length; i++) {
    if (practiceSkills[PRACTICE_SKILL_OPTIONS[i].key]) { return true; }
  }
  return false;
}

function drawPracticeSetupScreen() {
  drawBackgroundGrid();
  noStroke();
  fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  textAlign(CENTER, CENTER);
  textSize(20);
  text("PRACTICE MODE", CANVAS_W / 2, 46);

  textSize(11);
  fill(COLOR_TEXT_DIM[0], COLOR_TEXT_DIM[1], COLOR_TEXT_DIM[2]);
  text("Check off which skills you want to work on:", CANVAS_W / 2, 70);

  var boxSize = 20;
  var rowW = 260;
  var rowH = 38;
  var startY = 98;
  var boxX = CANVAS_W / 2 - rowW / 2;

  var panelW = rowW + 40;
  drawScreenPanel(CANVAS_W / 2 - panelW / 2, startY - 12, panelW, PRACTICE_SKILL_OPTIONS.length * rowH + 24);

  for (var i = 0; i < PRACTICE_SKILL_OPTIONS.length; i++) {
    var opt = PRACTICE_SKILL_OPTIONS[i];
    var y = startY + i * rowH;
    var checked = practiceSkills[opt.key];
    var rowHovered = buttonHovered(boxX, y, rowW, boxSize);

    if (rowHovered) {
      noStroke();
      fill(COLOR_BUTTON_HOVER[0], COLOR_BUTTON_HOVER[1], COLOR_BUTTON_HOVER[2], 120);
      rect(boxX - 6, y - 5, rowW + 12, boxSize + 10, 4);
    }

    stroke(COLOR_PANEL_BORDER[0], COLOR_PANEL_BORDER[1], COLOR_PANEL_BORDER[2]);
    strokeWeight(2);
    fill(COLOR_PANEL[0], COLOR_PANEL[1], COLOR_PANEL[2]);
    rect(boxX, y, boxSize, boxSize, 4);
    if (checked) {
      noStroke();
      fill(COLOR_TEXT_GOOD[0], COLOR_TEXT_GOOD[1], COLOR_TEXT_GOOD[2]);
      rect(boxX + 4, y + 4, boxSize - 8, boxSize - 8, 2);
    }

    noStroke();
    fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
    textAlign(LEFT, CENTER);
    textSize(13);
    text(opt.label, boxX + boxSize + 12, y + boxSize / 2);

    if (buttonClicked(boxX, y, rowW, boxSize)) {
      practiceSkills[opt.key] = !practiceSkills[opt.key];
    }
  }

  var anySelected = anyPracticeSkillSelected();
  var btnW = 200, btnH = 36;
  var btnX = CANVAS_W / 2 - btnW / 2;
  var btnY = startY + PRACTICE_SKILL_OPTIONS.length * rowH + 16;
  var startLabel = anySelected ? "START PRACTICE" : "SELECT AT LEAST ONE";
  drawButton(btnX, btnY, btnW, btnH, startLabel, anySelected && buttonHovered(btnX, btnY, btnW, btnH));
  if (anySelected && buttonClicked(btnX, btnY, btnW, btnH)) {
    practiceAttempted = 0;
    practiceCorrect = 0;
    loadPracticePuzzle();
    gameState = STATE_PRACTICE_PLAY;
  }

  var backW = 90, backH = 26, backX = 10, backY = CANVAS_H - 36;
  drawButton(backX, backY, backW, backH, "< BACK", buttonHovered(backX, backY, backW, backH));
  if (buttonClicked(backX, backY, backW, backH)) {
    gameState = STATE_TITLE;
  }
}

// Picks a random puzzle from whichever skills are checked, reusing
// the exact same generators as the main game -- practice mode is
// just those puzzles without a timer, score, or lives attached.
function loadPracticePuzzle() {
  var types = [];
  for (var i = 0; i < PRACTICE_SKILL_OPTIONS.length; i++) {
    if (practiceSkills[PRACTICE_SKILL_OPTIONS[i].key]) { types.push(PRACTICE_SKILL_OPTIONS[i].key); }
  }
  if (types.length === 0) { types.push("supplementary"); } // safety net; UI shouldn't allow this

  var type = types[randomInt(0, types.length - 1)];
  currentPuzzle = generatePuzzleForLevel(type);
  answerInput = "";
  practiceFeedbackShown = false;
  practiceAdvanceTimer = 0;
}

function submitPracticeAnswer() {
  if (!currentPuzzle || answerInput === "") { return; }
  var value = parseInt(answerInput, 10);
  practiceAttempted += 1;

  if (value === currentPuzzle.correctAnswer) {
    practiceCorrect += 1;
    practiceFeedbackText = "Correct! " + currentPuzzle.correctAnswer + "°";
    practiceFeedbackColor = COLOR_TEXT_GOOD;
    playSfx("correct");
  } else {
    practiceFeedbackText = "Not quite -- it was " + currentPuzzle.correctAnswer + "°";
    practiceFeedbackColor = COLOR_TEXT_WARN;
    playSfx("wrong");
  }
  practiceFeedbackShown = true;
  practiceAdvanceTimer = PRACTICE_ADVANCE_DELAY;
}

function handlePracticeAnswerTyping() {
  for (var d = 0; d <= 9; d++) {
    if (keyEdge(String(d))) {
      if (answerInput.length < ANSWER_MAX_DIGITS) {
        answerInput += String(d);
      }
    }
  }
  if (keyEdge("backspace") || keyEdge("delete")) {
    answerInput = answerInput.slice(0, -1);
  }
  if (enterKeyEdge()) {
    submitPracticeAnswer();
  }
}

function drawPracticeScreen(dt) {
  drawBackgroundGrid();
  if (currentPuzzle) {
    drawDiagramForPuzzle(currentPuzzle, CANVAS_W / 2, 160);
  }

  noStroke();
  fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  textAlign(CENTER, CENTER);
  textSize(13);
  text("PRACTICE MODE", CANVAS_W / 2, 16);

  fill(COLOR_TEXT_DIM[0], COLOR_TEXT_DIM[1], COLOR_TEXT_DIM[2]);
  textSize(10);
  text("Correct " + practiceCorrect + " / " + practiceAttempted + " attempted", CANVAS_W / 2, 32);

  if (currentPuzzle) {
    drawSkillNameBanner(currentPuzzle, 46);
  }

  if (practiceFeedbackShown) {
    practiceAdvanceTimer -= dt;
    noStroke();
    fill(practiceFeedbackColor[0], practiceFeedbackColor[1], practiceFeedbackColor[2]);
    textAlign(CENTER, CENTER);
    textSize(15);
    text(practiceFeedbackText, CANVAS_W / 2, 90);
    if (practiceAdvanceTimer <= 0) {
      loadPracticePuzzle();
    }
  } else {
    drawAnswerBox(CANVAS_W / 2, 325);
    handlePracticeAnswerTyping();
  }

  var menuW = 90, menuH = 24, menuX = 8, menuY = CANVAS_H - 32;
  drawButton(menuX, menuY, menuW, menuH, "MENU", buttonHovered(menuX, menuY, menuW, menuH));
  if (buttonClicked(menuX, menuY, menuW, menuH)) {
    gameState = STATE_TITLE;
  }

  var skillsW = 118, skillsH = 24, skillsX = CANVAS_W - 8 - skillsW, skillsY = CANVAS_H - 32;
  drawButton(skillsX, skillsY, skillsW, skillsH, "CHANGE SKILLS", buttonHovered(skillsX, skillsY, skillsW, skillsH));
  if (buttonClicked(skillsX, skillsY, skillsW, skillsH)) {
    gameState = STATE_PRACTICE_SETUP;
  }
}


// ----------------------------------------------------------------
// SECTION 26: SCREEN -- INSTRUCTIONS
// ----------------------------------------------------------------
// Grouped under short, colored section headers instead of a single
// undifferentiated wall of 24 lines separated only by blank-line
// gaps -- a reader can find "how do I answer" or "what happens if I
// get caught" at a glance instead of hunting through a block.
var INSTRUCTIONS_SECTIONS = [
  { header: "THE SETUP", lines: [
    "Every room runs on a different security system:",
    "guards (supplementary), corner lasers (complementary),",
    "cameras (vertical), and duct crawls (parallel lines)."
  ]},
  { header: "ANSWERING", lines: [
    "Type the missing angle's degrees with the number keys,",
    "then press ENTER. BACKSPACE fixes a mistyped digit."
  ]},
  { header: "THE SNEAK", lines: [
    "Get it right and you steer the robber through a maze",
    "-- arrow keys / WASD -- dodging cameras and roaming",
    "guards to reach the exit. Get spotted, lose a life."
  ]},
  { header: "MISTAKES", lines: [
    "A wrong answer costs a life -- run out and the heist",
    "ends. You'll retry the SAME puzzle, clock frozen,",
    "after your first miss on it."
  ]},
  { header: "TIP", lines: [
    "Watch for the red aura around each guard -- get that",
    "close and they'll spot you no matter which way they face."
  ]}
];

function drawInstructionsScreen() {
  drawBackgroundGrid();
  noStroke();
  fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  textAlign(CENTER, CENTER);
  textSize(18);
  text("HOW TO PLAY", CANVAS_W / 2, 34);

  var panelY = 48, panelH = 296;
  drawScreenPanel(20, panelY, CANVAS_W - 40, panelH);

  var y = panelY + 20;
  for (var s = 0; s < INSTRUCTIONS_SECTIONS.length; s++) {
    var section = INSTRUCTIONS_SECTIONS[s];
    noStroke();
    fill(COLOR_LASER_GOLD[0], COLOR_LASER_GOLD[1], COLOR_LASER_GOLD[2]);
    textAlign(CENTER, CENTER);
    textSize(10);
    text(section.header, CANVAS_W / 2, y);
    y += 15;

    fill(COLOR_TEXT_DIM[0], COLOR_TEXT_DIM[1], COLOR_TEXT_DIM[2]);
    textSize(9);
    for (var i = 0; i < section.lines.length; i++) {
      text(section.lines[i], CANVAS_W / 2, y);
      y += 12;
    }
    y += 8; // breathing room before the next section's header
  }

  var backW = 120, backH = 30, backX = CANVAS_W / 2 - backW / 2, backY = CANVAS_H - 34;
  drawButton(backX, backY, backW, backH, "BACK", buttonHovered(backX, backY, backW, backH));
  if (buttonClicked(backX, backY, backW, backH)) {
    gameState = previousState;
  }
}


// ----------------------------------------------------------------
// SECTION 27: SCREEN -- LEVEL INTRO
// ----------------------------------------------------------------
function drawLevelIntroScreen() {
  drawBackgroundGrid();
  var level = LEVELS[currentLevelIndex];

  noStroke();
  fill(COLOR_LASER_GOLD[0], COLOR_LASER_GOLD[1], COLOR_LASER_GOLD[2]);
  textAlign(CENTER, CENTER);
  textSize(20);
  text(level.name, CANVAS_W / 2, 90);

  drawScreenPanel(40, 116, CANVAS_W - 80, level.introText.length * 18 + 36);
  textSize(12);
  fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  for (var i = 0; i < level.introText.length; i++) {
    text(level.introText[i], CANVAS_W / 2, 140 + i * 18);
  }

  var btnW = 170, btnH = 36, btnX = CANVAS_W / 2 - btnW / 2, btnY = 240;
  drawButton(btnX, btnY, btnW, btnH, "ENTER SECTOR", buttonHovered(btnX, btnY, btnW, btnH));
  if (buttonClicked(btnX, btnY, btnW, btnH) || enterKeyEdge()) {
    beginPlayingCurrentLevel();
  }
}


// ----------------------------------------------------------------
// SECTION 28: SCREEN -- CHALLENGE INTRO
// ----------------------------------------------------------------
function drawChallengeIntroScreen() {
  drawBackgroundGrid();
  noStroke();
  fill(COLOR_LASER_GOLD[0], COLOR_LASER_GOLD[1], COLOR_LASER_GOLD[2]);
  textAlign(CENTER, CENTER);
  textSize(20);
  text("CHALLENGE MODE", CANVAS_W / 2, 100);

  var lines = [
    "All four angle types, fully randomized.",
    "Every 5 solves, the timer gets faster.",
    "How long can you keep the vault quiet?"
  ];
  drawScreenPanel(40, 126, CANVAS_W - 80, lines.length * 18 + 36);
  textSize(12);
  fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  for (var i = 0; i < lines.length; i++) {
    text(lines[i], CANVAS_W / 2, 150 + i * 18);
  }

  var btnW = 170, btnH = 36, btnX = CANVAS_W / 2 - btnW / 2, btnY = 230;
  drawButton(btnX, btnY, btnW, btnH, "BEGIN", buttonHovered(btnX, btnY, btnW, btnH));
  if (buttonClicked(btnX, btnY, btnW, btnH) || enterKeyEdge()) {
    startChallengeMode();
  }
}


// ----------------------------------------------------------------
// SECTION 29: SCREEN -- PLAYING (core gameplay)
// ----------------------------------------------------------------
function drawPlayingScreen(dt) {
  updateShake();

  // The countdown and the answer box only respond while you're
  // actually waiting to call the angle. A correct answer hands you
  // the robber to steer through the sneak minigame; a wrong one
  // plays a brief caught reaction. Either way, input is locked to
  // that phase until the next room loads.
  var isAiming = (puzzlePhase === PUZZLE_PHASE_AIMING);
  var isSneaking = (puzzlePhase === PUZZLE_PHASE_SNEAKING);
  var isEscaping = (puzzlePhase === PUZZLE_PHASE_ESCAPING);
  var isMazeReveal = (puzzlePhase === PUZZLE_PHASE_MAZE_REVEAL);
  if (isAiming) {
    updatePuzzleTimer(dt);
  } else if (isSneaking) {
    updateSneakingPhase(dt);
  } else if (isEscaping) {
    updateEscapingPhase(dt);
  } else if (isMazeReveal) {
    updateMazeRevealPhase(dt);
  } else if (puzzlePhase === PUZZLE_PHASE_CAUGHT) {
    updateCaughtPhase();
  }

  push();
  translate(getShakeOffsetX(), getShakeOffsetY());

  if (isSneaking) {
    // The maze fully replaces the puzzle diagram here -- drawing
    // both was redundant clutter (a leftover camera/guard icon
    // sitting in the middle of the maze) and, since the diagram's
    // own cone rendering isn't cheap, a real chunk of the lag during
    // the sneak room. The background grid is skipped too -- the
    // maze room's opaque floor covers almost the whole canvas, so
    // the grid was mostly 40 wasted line() calls a frame hidden
    // underneath it; the plain dark background() clear underneath
    // the thin remaining margin reads fine on its own.
    drawSneakingScene();
  } else if (isMazeReveal) {
    drawMazeRevealScene();
  } else {
    drawBackgroundGrid();
    if (currentPuzzle) {
      drawDiagramForPuzzle(currentPuzzle, CANVAS_W / 2, 160);
    }
    drawHeistScene(160, currentPuzzle);
  }
  pop();

  drawHUD();
  if (isSneaking || isMazeReveal) {
    drawSneakPrompt(CANVAS_W / 2, 325);
  } else if (!isEscaping) {
    if (currentPuzzle) {
      drawSkillNameBanner(currentPuzzle, 58);
      drawPuzzleContextLine(currentPuzzle, 283);
    }
    drawAnswerBox(CANVAS_W / 2, 325);
    if (isAiming) {
      handleAnswerTyping();
    }
  }

  if (keyEdge("p") || keyEdge("escape")) {
    previousState = STATE_PLAYING;
    gameState = STATE_PAUSE;
  }

  if (feedbackTimer > 0) {
    feedbackTimer -= 1;
    noStroke();
    fill(feedbackColor[0], feedbackColor[1], feedbackColor[2]);
    textAlign(CENTER, CENTER);
    textSize(14);
    text(feedbackMessage, CANVAS_W / 2, 90);
  }
}


// ----------------------------------------------------------------
// SECTION 30: SCREEN -- LEVEL COMPLETE
// ----------------------------------------------------------------
// A vault door that physically cracks open a little more with each
// sector cleared -- the tangible, persistent payoff for every angle
// you've solved so far, not just a number going up.
function drawVaultDoor(cx, cy, radius, progressRatio) {
  var gap = progressRatio * radius * 0.9;

  noStroke();
  fill(COLOR_LASER_GOLD[0], COLOR_LASER_GOLD[1], COLOR_LASER_GOLD[2], 40 + progressRatio * 130);
  ellipse(cx, cy, radius * 1.3, radius * 1.3);

  push();
  translate(cx - gap, cy);
  noFill();
  stroke(COLOR_PANEL_BORDER[0], COLOR_PANEL_BORDER[1], COLOR_PANEL_BORDER[2]);
  strokeWeight(3);
  arc(0, 0, radius * 2, radius * 2, 90, 270);
  stroke(COLOR_TEXT_DIM[0], COLOR_TEXT_DIM[1], COLOR_TEXT_DIM[2]);
  strokeWeight(1.5);
  ellipse(0, 0, radius * 0.5, radius * 0.5);
  pop();

  push();
  translate(cx + gap, cy);
  noFill();
  stroke(COLOR_PANEL_BORDER[0], COLOR_PANEL_BORDER[1], COLOR_PANEL_BORDER[2]);
  strokeWeight(3);
  arc(0, 0, radius * 2, radius * 2, 270, 450);
  stroke(COLOR_TEXT_DIM[0], COLOR_TEXT_DIM[1], COLOR_TEXT_DIM[2]);
  strokeWeight(1.5);
  ellipse(0, 0, radius * 0.5, radius * 0.5);
  pop();

  noStroke();
  fill(COLOR_TEXT_DIM[0], COLOR_TEXT_DIM[1], COLOR_TEXT_DIM[2]);
  textAlign(CENTER, CENTER);
  textSize(9);
  text(Math.round(progressRatio * 100) + "% BREACHED", cx, cy + radius + 16);
}

function drawLevelCompleteScreen() {
  drawBackgroundGrid();
  noStroke();
  fill(COLOR_TEXT_GOOD[0], COLOR_TEXT_GOOD[1], COLOR_TEXT_GOOD[2]);
  textAlign(CENTER, CENTER);
  textSize(22);
  text("SECTOR CLEARED", CANVAS_W / 2, 100);

  drawScreenPanel(CANVAS_W / 2 - 110, 122, 220, 52);
  textSize(13);
  fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  text("Score: " + currentScore, CANVAS_W / 2, 140);
  text("Best Streak: " + bestStreakEver, CANVAS_W / 2, 160);

  var btnW = 170, btnH = 36, btnX = CANVAS_W / 2 - btnW / 2, btnY = 210;
  drawButton(btnX, btnY, btnW, btnH, "NEXT SECTOR", buttonHovered(btnX, btnY, btnW, btnH));
  if (buttonClicked(btnX, btnY, btnW, btnH) || enterKeyEdge()) {
    startLevel(currentLevelIndex + 1);
  }

  var vaultProgress = (currentLevelIndex + 1) / LEVELS.length;
  drawVaultDoor(CANVAS_W / 2, 325, 45, vaultProgress);
}


// ----------------------------------------------------------------
// SECTION 31: SCREEN -- VICTORY
// ----------------------------------------------------------------
function drawVictoryScreen() {
  drawBackgroundGrid();
  noStroke();
  fill(COLOR_LASER_GOLD[0], COLOR_LASER_GOLD[1], COLOR_LASER_GOLD[2]);
  textAlign(CENTER, CENTER);
  textSize(24);
  text("VAULT CRACKED!", CANVAS_W / 2, 100);

  drawScreenPanel(CANVAS_W / 2 - 130, 122, 260, 72);
  textSize(13);
  fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  text("Final Score: " + currentScore, CANVAS_W / 2, 140);
  text("Best Streak: " + bestStreakEver, CANVAS_W / 2, 160);
  text("You mastered every angle relationship.", CANVAS_W / 2, 180);

  var btnW = 200, btnH = 34, btnX = CANVAS_W / 2 - btnW / 2;
  var challengeY = 220, titleY = 262;
  drawButton(btnX, challengeY, btnW, btnH, "TRY CHALLENGE MODE", buttonHovered(btnX, challengeY, btnW, btnH));
  drawButton(btnX, titleY, btnW, btnH, "MAIN MENU", buttonHovered(btnX, titleY, btnW, btnH));

  if (buttonClicked(btnX, challengeY, btnW, btnH)) {
    gameState = STATE_CHALLENGE_INTRO;
  }
  if (buttonClicked(btnX, titleY, btnW, btnH)) {
    gameState = STATE_TITLE;
  }

  drawVaultDoor(CANVAS_W / 2, 340, 30, 1);
}


// ----------------------------------------------------------------
// SECTION 32: SCREEN -- GAME OVER
// ----------------------------------------------------------------
function drawGameOverScreen() {
  drawBackgroundGrid();
  noStroke();
  fill(COLOR_TEXT_WARN[0], COLOR_TEXT_WARN[1], COLOR_TEXT_WARN[2]);
  textAlign(CENTER, CENTER);
  textSize(24);
  text("ALARM TRIPPED", CANVAS_W / 2, 100);

  drawScreenPanel(CANVAS_W / 2 - 110, 122, 220, 72);
  textSize(13);
  fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  text("Score: " + currentScore, CANVAS_W / 2, 140);
  text("High Score: " + sessionHighScore, CANVAS_W / 2, 160);
  text("Best Streak: " + bestStreakEver, CANVAS_W / 2, 180);

  var btnW = 170, btnH = 34, btnX = CANVAS_W / 2 - btnW / 2;
  var retryY = 220, titleY = 262;
  var retryLabel = isChallengeMode ? "RETRY CHALLENGE" : "RETRY SECTOR";
  drawButton(btnX, retryY, btnW, btnH, retryLabel, buttonHovered(btnX, retryY, btnW, btnH));
  drawButton(btnX, titleY, btnW, btnH, "MAIN MENU", buttonHovered(btnX, titleY, btnW, btnH));

  if (buttonClicked(btnX, retryY, btnW, btnH)) {
    if (isChallengeMode) {
      startChallengeMode();
    } else {
      var failedLevel = currentLevelIndex;
      resetFullGame();
      startLevel(failedLevel);
    }
  }
  if (buttonClicked(btnX, titleY, btnW, btnH)) {
    gameState = STATE_TITLE;
  }
}


// ----------------------------------------------------------------
// SECTION 33: SCREEN -- PAUSE
// ----------------------------------------------------------------
function drawPauseScreen() {
  noStroke();
  fill(0, 0, 0, 190);
  rect(0, 0, CANVAS_W, CANVAS_H);

  fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  textAlign(CENTER, CENTER);
  textSize(20);
  text("PAUSED", CANVAS_W / 2, 130);

  var btnW = 160, btnH = 32, btnX = CANVAS_W / 2 - btnW / 2;
  var resumeY = 180, menuY = 222;
  drawButton(btnX, resumeY, btnW, btnH, "RESUME", buttonHovered(btnX, resumeY, btnW, btnH));
  drawButton(btnX, menuY, btnW, btnH, "QUIT TO MENU", buttonHovered(btnX, menuY, btnW, btnH));

  if (buttonClicked(btnX, resumeY, btnW, btnH) || keyEdge("p")) {
    gameState = STATE_PLAYING;
  }
  if (buttonClicked(btnX, menuY, btnW, btnH)) {
    gameState = STATE_TITLE;
  }
}


// ----------------------------------------------------------------
// SECTION 34: SCREEN -- HIGH SCORES
// ----------------------------------------------------------------
function drawHighScoresScreen() {
  drawBackgroundGrid();
  noStroke();
  fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  textAlign(CENTER, CENTER);
  textSize(20);
  text("HIGH SCORES", CANVAS_W / 2, 80);

  drawScreenPanel(CANVAS_W / 2 - 140, 106, 280, 100);
  textSize(14);
  fill(COLOR_TEXT_MAIN[0], COLOR_TEXT_MAIN[1], COLOR_TEXT_MAIN[2]);
  text("Best Score: " + sessionHighScore, CANVAS_W / 2, 130);
  text("Best Streak: " + bestStreakEver, CANVAS_W / 2, 155);

  textSize(12);
  fill(COLOR_LASER_GOLD[0], COLOR_LASER_GOLD[1], COLOR_LASER_GOLD[2]);
  text("Laser Skins Unlocked: " + unlockedSkinIndices.length + "/" + LASER_SKINS.length, CANVAS_W / 2, 185);

  var backW = 120, backH = 30, backX = CANVAS_W / 2 - backW / 2, backY = CANVAS_H - 44;
  drawButton(backX, backY, backW, backH, "BACK", buttonHovered(backX, backY, backW, backH));
  if (buttonClicked(backX, backY, backW, backH)) {
    gameState = STATE_TITLE;
  }
}


// ----------------------------------------------------------------
// SECTION 35: MAIN GAME LOOP
// ----------------------------------------------------------------
function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  try { angleMode(DEGREES); } catch (e) { /* fine, we compute in degrees manually */ }
  textAlign(CENTER, CENTER);
  loadHighScores();
  lastFrameMillis = (typeof millis === "function") ? millis() : 0;
}

function draw() {
  var nowMillis = (typeof millis === "function") ? millis() : lastFrameMillis + 33;
  var dt = (nowMillis - lastFrameMillis) / 1000;
  if (dt <= 0 || dt > 1) { dt = 1 / 30; }
  lastFrameMillis = nowMillis;

  mouseClickedEdge = computeMouseClickEdge();

  background(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);

  if (gameState === STATE_TITLE) { drawTitleScreen(); }
  else if (gameState === STATE_MODE_SELECT) { drawModeSelectScreen(); }
  else if (gameState === STATE_INSTRUCTIONS) { drawInstructionsScreen(); }
  else if (gameState === STATE_LEVEL_INTRO) { drawLevelIntroScreen(); }
  else if (gameState === STATE_CHALLENGE_INTRO) { drawChallengeIntroScreen(); }
  else if (gameState === STATE_PLAYING) { drawPlayingScreen(dt); }
  else if (gameState === STATE_LEVEL_COMPLETE) { drawLevelCompleteScreen(); }
  else if (gameState === STATE_VICTORY) { drawVictoryScreen(); }
  else if (gameState === STATE_GAME_OVER) { drawGameOverScreen(); }
  else if (gameState === STATE_PAUSE) { drawPauseScreen(); }
  else if (gameState === STATE_HIGH_SCORES) { drawHighScoresScreen(); }
  else if (gameState === STATE_PRACTICE_SETUP) { drawPracticeSetupScreen(); }
  else if (gameState === STATE_PRACTICE_PLAY) { drawPracticeScreen(dt); }

  updateInputEdgeTracking();
}
