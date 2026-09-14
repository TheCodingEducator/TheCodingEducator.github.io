// ============================================================
//  Let's Get to the Point — Transformation Game
//  8th Grade: Translations, Reflections, Rotations
//  Paste this entire file into Code.org Game Lab
// ============================================================

var inputSprite = createSprite(-999, -999);
inputSprite.visible = false;

// ---------- MOUSE STATE ----------
var mouseHeld = false;
var mouseJustReleased = false;
var mouseHeldFrames = 999;

// ---------- GRID SETTINGS ----------
var CELL = 30;
var ORIGIN_X = 200;
var ORIGIN_Y = 221;

function toPixelX(gx) { return ORIGIN_X + gx * CELL; }
function toPixelY(gy) { return ORIGIN_Y - gy * CELL; }
function toGridX(px)  { return Math.round((px - ORIGIN_X) / CELL); }
function toGridY(py)  { return Math.round((ORIGIN_Y - py) / CELL); }

var GRID_MIN = -5;
var GRID_MAX = 5;

// ---------- GAME MODE ----------
// PRACTICE | GENIUS | GEOMETRY | HEADTOHEAD
// Menu navigation — 4 modes in a row: 0=PRACTICE 1=GENIUS 2=GEOMETRY 3=HEADTOHEAD
var gameMode = "GENIUS";

// Skill filter — applies to GENIUS, GEOMETRY, and PRACTICE modes
var skillTranslations = true;
var skillReflections  = true;
var skillRotations    = true;
var skillFocusIdx = 0; // 0=Translations 1=Rotations 2=Reflections 3=StartButton
var modeIndex = 1;
var modeIds = ["PRACTICE", "GENIUS", "GEOMETRY", "HEADTOHEAD"];
// Start screen keyboard focus: false = one of the 4 mode cards
// (left/right cycles modeIndex, as before), true = the Shop bar below
// them (DOWN moves focus there, UP moves back).
var startFocusIsShop = false;

// Practice mode hint + question counter
var practiceHintType = ""; // "", "cwccw", "degrees", "rotation_other", "generic"
var practiceQNum = 0;      // total questions served in current practice session
var srSel = 1; // SPEED_RESULT button focus: 0=MENU, 1=PLAY AGAIN

// ---------- GAME STATE ----------
var STATE = "START";
var score = 0;
var lives = 3;
var round = 0;
var TOTAL_ROUNDS = 3;

// Speed timer + high scores (GENIUS and GEOMETRY)
var timerStart    = 0;
var timerFinished = 0;
var prevBest      = 0;   // best before this attempt (for comparison on result screen)
var hsGenius      = 0;   // personal best seconds, 0 = no record
var hsGeometry    = 0;
var newHighScore  = false;

var startGX = 0, startGY = 0;
var targetGX = 0, targetGY = 0;
var challengeLabel = "";
var topicLabel = "";
var topicR = 150, topicG = 150, topicB = 150;
var feedbackCorrect = false;
var equivalentRotation = false; // correct endpoint reached via alternate rotation path

// ---------- WRONG-ANSWER TRANSFORMATION DEMO ----------
// Plays right after a (non-rotation) WRONG answer, before the FEEDBACK
// card and the retry - an animated replay of what the CORRECT
// transformation actually does, so the player sees it happen instead of
// only reading the right coordinates. A correct answer shows no visual
// at all - the player already knows where it went, they just placed it
// there. Rotation is skipped either way since the tracing-paper
// mini-game already IS that animation, performed live by the player.
var DEMO_DURATION = 40; // frames
var ROTATION_DEMO_DURATION = 55; // rotations get a bit longer - up to a full 360° sweep to read
var demoStartFrame = 0;
var lockedGX = 0, lockedGY = 0;
var showingTimer = 0;

// Grid-based player
var playerGX = 0, playerGY = 0;
var moveCooldown = 0;

// GEOMETRY mode: smooth pixel movement
var playerPX = ORIGIN_X, playerPY = ORIGIN_Y;
var PLAYER_SPEED = 4;

// GEOMETRY multi-vertex shape (translation questions only)
var geomShapeOffsets = []; // [{ox,oy}] grid offsets from vertex 0 (vertex 0 implicit at {0,0})
var geomShapeType   = ""; // "triangle", "quad", or "" (single point)
var shapePXMin = 0, shapePXMax = 400, shapePYMin = 0, shapePYMax = 400;
var SHAPE_COLORS = [[255,220,50],[80,160,255],[255,80,120],[80,255,160]];

// Head-To-Head
var p1GX = 0, p1GY = 0;  // arrows + Enter, red
var p2GX = 0, p2GY = 0;  // WASD   + Space, blue
var p1wins = 0, p2wins = 0;
var roundWinner = 0;      // 0=none 1=P1 2=P2

// Practice
var practiceAttempts = 0;
// Session-only progress bar for Practice mode - climbs +8 per correct
// answer (never drops on a miss - Practice is the low-stakes mode) and
// unlocks harder challenges into the pool once it crosses 50 (see
// buildPracticeOrder). Resets to 0 at the start of every fresh session.
var practiceMastery = 0;

// ---------- COSMETICS (player skins) ----------
// Skin 0 is always free/owned as a starter default; every other skin is
// bought in the Shop with coins earned from streaks (see SKIN_PRICE /
// ownedSkins below) - a play-progress/preference state, not a
// performance record, so it's fine to persist client-side without
// touching the "no accounts, no permanent record" design of the game.
// `style` picks the extra visual flourish drawn by drawSkinnedFace().
var PLAYER_SKINS = [
  { name:"Classic Yellow", r:255, g:220, b:50,  style:"plain"      },
  { name:"Cool Blue",      r:80,  g:180, b:255, style:"plain"      },
  { name:"Hot Pink",       r:255, g:90,  b:180, style:"sparkle"    },
  { name:"Lime Green",     r:140, g:230, b:60,  style:"spots"      },
  { name:"Sunset Orange",  r:255, g:140, b:50,  style:"gradient"   },
  { name:"Royal Purple",   r:170, g:100, b:255, style:"crown"      },
  { name:"Fire Red",       r:255, g:80,  b:40,  style:"fire"       },
  { name:"Ice Blue",       r:150, g:220, b:255, style:"halo"       },
  { name:"Robot Silver",   r:190, g:200, b:210, style:"robot"      },
  { name:"Alien Green",    r:110, g:220, b:110, style:"alien"      },
  { name:"Cool Shades",    r:210, g:180, b:130, style:"sunglasses" },
  { name:"Rainbow Burst",  r:255, g:255, b:255, style:"rainbow"    }
];
var SKIN_PRICE = 3;

// ---------- COINS / STREAK / OWNED SKINS ----------
// Session-crossing progress (a play-currency + unlock list), not a
// record of right/wrong answers - persisted the same way the skin
// preference already was.
var coins = 0;
var ownedSkins = [0]; // skin 0 is always owned
var currentStreak = 0; // consecutive correct answers, non-H2H modes; resets on a miss
function loadCoinsAndSkins() {
  try {
    var c = localStorage.getItem('lgttp_coins');
    if (c!==null) { var n=parseInt(c,10); if (!isNaN(n)&&n>=0) coins=n; }
    var o = localStorage.getItem('lgttp_owned_skins');
    if (o!==null) { var arr=JSON.parse(o); if (Array.isArray(arr)) ownedSkins=arr; }
    // The streak persists across page reloads too, same as coins/skins -
    // it only ever breaks on an actual wrong answer, never on a mode
    // switch or a fresh visit.
    var s = localStorage.getItem('lgttp_streak');
    if (s!==null) { var sn=parseInt(s,10); if (!isNaN(sn)&&sn>=0) currentStreak=sn; }
    // Genius/Geometry best times - these are the game's whole "beat your
    // best time" hook, so they should survive a reload same as anything
    // else here; previously only held in memory and lost on refresh.
    var hg = localStorage.getItem('lgttp_hs_genius');
    if (hg!==null) { var hgn=parseFloat(hg); if (!isNaN(hgn)&&hgn>=0) hsGenius=hgn; }
    var hm = localStorage.getItem('lgttp_hs_geometry');
    if (hm!==null) { var hmn=parseFloat(hm); if (!isNaN(hmn)&&hmn>=0) hsGeometry=hmn; }
  } catch (e) {}
  if (ownedSkins.indexOf(0)===-1) ownedSkins.push(0);
}
function saveCoinsAndSkins() {
  try {
    localStorage.setItem('lgttp_coins', String(coins));
    localStorage.setItem('lgttp_owned_skins', JSON.stringify(ownedSkins));
    localStorage.setItem('lgttp_streak', String(currentStreak));
    localStorage.setItem('lgttp_hs_genius', String(hsGenius));
    localStorage.setItem('lgttp_hs_geometry', String(hsGeometry));
  } catch (e) {}
}
loadCoinsAndSkins();

// Awards a coin every 3rd consecutive correct answer (3, 6, 9, ...).
// Wrong answers reset the streak to 0 elsewhere, right where
// feedbackCorrect is determined.
var coinPopup = 0; // frames remaining to show the "+1 coin!" toast
function registerCorrectForStreak() {
  currentStreak++;
  if (currentStreak%3===0) {
    coins++;
    coinPopup = 60;
  }
  saveCoinsAndSkins(); // persists the streak itself every time, not just on a coin award
}
function resetStreak() {
  currentStreak = 0;
  saveCoinsAndSkins();
}
// ---------- SOUND (synthesized retro/chiptune SFX - no audio files) ----------
var _sfxCtx = null;
function _sfxEnsureCtx() {
  if (!_sfxCtx) {
    try { _sfxCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (_sfxCtx.state === 'suspended') { try { _sfxCtx.resume(); } catch (e) {} }
  return _sfxCtx;
}
// Browsers block audio until a real user gesture occurs - this game's very
// first interaction is always a click or keypress on the Start screen, so
// creating/resuming the context there covers every later playSound() call.
window.addEventListener('pointerdown', _sfxEnsureCtx, { once:true });
window.addEventListener('keydown', _sfxEnsureCtx, { once:true });

// One synthesized tone: frequency in Hz, duration in seconds, oscillator
// waveform, peak volume (0-1), an optional start delay (seconds, so a
// multi-note chime can be scheduled without setTimeout), and an optional
// end frequency for a quick upward/downward glide (a "wrong answer" buzz).
function _sfxTone(freq, dur, type, vol, delay, glideTo) {
  var ctx = _sfxEnsureCtx();
  if (!ctx) return;
  var t0 = ctx.currentTime + (delay || 0);
  var osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type || 'square';
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.linearRampToValueAtTime(glideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

function playSound(name) {
  // Each transformation gets its own short "flavor" sound leading into
  // the shared 3-note correct chime, so the ear picks up on WHICH kind
  // of move just happened, not just that it was right.
  if (name === 'correct' || name === 'correct_translate') {
    _sfxTone(300, 0.08, 'sine', 0.07, 0, 480);     // quick upward slide/whoosh
    _sfxTone(523.25, 0.09, 'square', 0.12, 0.07);
    _sfxTone(659.25, 0.09, 'square', 0.12, 0.16);
    _sfxTone(783.99, 0.16, 'square', 0.13, 0.25);
    return;
  }
  if (name === 'correct_reflect') {
    _sfxTone(680, 0.06, 'triangle', 0.08, 0, 240);  // quick downward "flip"
    _sfxTone(523.25, 0.09, 'square', 0.12, 0.06);
    _sfxTone(659.25, 0.09, 'square', 0.12, 0.15);
    _sfxTone(783.99, 0.16, 'square', 0.13, 0.24);
    return;
  }
  if (name === 'correct_rotate') {
    _sfxTone(260, 0.045, 'sawtooth', 0.05, 0);      // three quick rising blips = a "spin"
    _sfxTone(340, 0.045, 'sawtooth', 0.05, 0.045);
    _sfxTone(440, 0.05,  'sawtooth', 0.06, 0.09);
    _sfxTone(523.25, 0.09, 'square', 0.12, 0.15);
    _sfxTone(659.25, 0.09, 'square', 0.12, 0.24);
    _sfxTone(783.99, 0.16, 'square', 0.13, 0.33);
    return;
  }
  if (name === 'wrong') { _sfxTone(190, 0.22, 'sawtooth', 0.12, 0, 90); return; }
  if (name === 'newRecord') {
    var notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
    for (var i = 0; i < notes.length; i++) _sfxTone(notes[i], 0.15, 'square', 0.13, i * 0.1);
    return;
  }
  if (name === 'h2hWin') {
    _sfxTone(392.00, 0.12, 'square', 0.13, 0);     // G4
    _sfxTone(523.25, 0.12, 'square', 0.13, 0.12);  // C5
    _sfxTone(659.25, 0.24, 'square', 0.14, 0.24);  // E5
    return;
  }
}

function correctSoundFor(ch) {
  if (isRotation(ch)) return 'correct_rotate';
  if (ch.type==="reflect_x"||ch.type==="reflect_y") return 'correct_reflect';
  return 'correct_translate';
}

var currentSkinIdx = 0;
function loadSkin() {
  try {
    var v = localStorage.getItem('lgttp_skin');
    if (v !== null) { var n = parseInt(v,10); if (!isNaN(n) && n>=0 && n<PLAYER_SKINS.length) currentSkinIdx = n; }
  } catch (e) {}
}
// Equips an owned skin. Returns false (no-op) if it hasn't been bought.
function equipSkin(idx) {
  if (ownedSkins.indexOf(idx)===-1) return false;
  currentSkinIdx = idx;
  try { localStorage.setItem('lgttp_skin', String(idx)); } catch (e) {}
  return true;
}
// Buys AND equips an unowned skin if there are enough coins. Returns
// false if already owned or too expensive.
function buySkin(idx) {
  if (ownedSkins.indexOf(idx)!==-1) return false;
  if (coins < SKIN_PRICE) return false;
  coins -= SKIN_PRICE;
  ownedSkins.push(idx);
  saveCoinsAndSkins();
  equipSkin(idx);
  return true;
}
loadSkin();

// ---------- TRACING PAPER STATE ----------
var tracingActive = false;
var tracingPhase = "DONE";
var centerGX = 0, centerGY = 0;
var centerSet = false;
var pencilX = 200, pencilY = 221;
var pencilGX = 0, pencilGY = 0;
var paperAngle = 0;
var paperSignedAngle = 0;
var paperDirection = "CCW";
var paperSnappedAngle = 0;
var paperPointGX = 0, paperPointGY = 0;

// ---------- CHALLENGE BANK ----------
var challenges = [
  // ---- Translations (algebraic notation) ----
  { topic:"Translation", r:0, g:180, b:255, label:"Translate: (x + 3, y + 2)", dx:3,  dy:2,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate: (x - 4, y + 1)", dx:-4, dy:1,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate: (x + 2, y - 3)", dx:2,  dy:-3, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate: (x - 1, y - 4)", dx:-1, dy:-4, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate: (x + 5, y - 2)", dx:5,  dy:-2, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate: (x + 1, y + 3)", dx:1,  dy:3,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate: (x - 3, y + 4)", dx:-3, dy:4,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate: (x + 4, y + 3)", dx:4,  dy:3,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate: (x - 2, y - 2)", dx:-2, dy:-2, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate: (x + 3, y - 1)", dx:3,  dy:-1, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate: (x - 5, y + 3)", dx:-5, dy:3,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate: (x + 2, y + 4)", dx:2,  dy:4,  type:"translate" },
  // ---- Translations (natural language) ----
  { topic:"Translation", r:0, g:180, b:255, label:"Translate 3 units left and 2 units down",  dx:-3, dy:-2, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate 4 units right and 1 unit up",    dx:4,  dy:1,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate 2 units left and 3 units up",    dx:-2, dy:3,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate 5 units right and 1 unit down",  dx:5,  dy:-1, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate 1 unit right and 4 units up",    dx:1,  dy:4,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate 3 units right and 4 units down", dx:3,  dy:-4, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate 4 units left and 3 units up",    dx:-4, dy:3,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate 2 units right and 2 units up",   dx:2,  dy:2,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate 1 unit left and 1 unit down",    dx:-1, dy:-1, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate 3 units left and 1 unit down",   dx:-3, dy:-1, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate 4 units right and 2 units up",   dx:4,  dy:2,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:"Translate 2 units right and 5 units down", dx:2,  dy:-5, type:"translate" },
  // ---- Reflections ----
  { topic:"Reflection", r:220, g:80, b:200, label:"Reflect over the x-axis", type:"reflect_x" },
  { topic:"Reflection", r:220, g:80, b:200, label:"Reflect over the y-axis", type:"reflect_y" },
  { topic:"Reflection", r:220, g:80, b:200, label:"Reflect over the x-axis", type:"reflect_x" },
  { topic:"Reflection", r:220, g:80, b:200, label:"Reflect over the y-axis", type:"reflect_y" },
  { topic:"Reflection", r:220, g:80, b:200, label:"Reflect over the x-axis", type:"reflect_x" },
  { topic:"Reflection", r:220, g:80, b:200, label:"Reflect over the y-axis", type:"reflect_y" },
  // ---- Rotations about the origin — Practice, Genius in Training, Head-to-Head ----
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 90° CCW about the origin",  cx:0, cy:0, type:"rot90ccw" },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 90° CW about the origin",   cx:0, cy:0, type:"rot90cw"  },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 90° CCW about the origin",  cx:0, cy:0, type:"rot90ccw" },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 90° CW about the origin",   cx:0, cy:0, type:"rot90cw"  },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 180° about the origin",     cx:0, cy:0, type:"rot180"   },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 180° about the origin",     cx:0, cy:0, type:"rot180"   },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 180° about the origin",     cx:0, cy:0, type:"rot180"   },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 360° about the origin",     cx:0, cy:0, type:"rot360"   },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 360° about the origin",     cx:0, cy:0, type:"rot360"   },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 360° about the origin",     cx:0, cy:0, type:"rot360"   },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 270° CCW about the origin", cx:0, cy:0, type:"rot270ccw" },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 270° CW about the origin",  cx:0, cy:0, type:"rot270cw"  },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 270° CCW about the origin", cx:0, cy:0, type:"rot270ccw" },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 270° CW about the origin",  cx:0, cy:0, type:"rot270cw"  },
  // ---- Rotations about non-origin centers — Geometry Genius only ----
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 90° CCW about point (1,1)",   cx:1,  cy:1,  type:"rot90ccw", geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 90° CW about point (1,1)",    cx:1,  cy:1,  type:"rot90cw",  geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 180° about point (1,1)",      cx:1,  cy:1,  type:"rot180",   geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 90° CCW about point (-1,2)",  cx:-1, cy:2,  type:"rot90ccw", geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 90° CW about point (2,-1)",   cx:2,  cy:-1, type:"rot90cw",  geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 180° about point (-1,-1)",    cx:-1, cy:-1, type:"rot180",   geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 90° CCW about point (1,-1)",  cx:1,  cy:-1, type:"rot90ccw", geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 90° CW about point (-1,1)",   cx:-1, cy:1,  type:"rot90cw",  geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 180° about point (2,1)",      cx:2,  cy:1,  type:"rot180",   geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 90° CCW about point (0,2)",   cx:0,  cy:2,  type:"rot90ccw", geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 90° CW about point (2,0)",    cx:2,  cy:0,  type:"rot90cw",  geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 180° about point (-2,1)",     cx:-2, cy:1,  type:"rot180",   geometryOnly:true },
  // 270° non-origin
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 270° CCW about point (1,1)",  cx:1,  cy:1,  type:"rot270ccw", geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 270° CW about point (1,1)",   cx:1,  cy:1,  type:"rot270cw",  geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 270° CCW about point (-1,2)", cx:-1, cy:2,  type:"rot270ccw", geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 270° CW about point (2,-1)",  cx:2,  cy:-1, type:"rot270cw",  geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 270° CCW about point (0,2)",  cx:0,  cy:2,  type:"rot270ccw", geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 270° CW about point (2,0)",   cx:2,  cy:0,  type:"rot270cw",  geometryOnly:true },
  // 360° non-origin — answer is back to the starting point
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 360° about point (1,1)",      cx:1,  cy:1,  type:"rot360",    geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 360° about point (-1,2)",     cx:-1, cy:2,  type:"rot360",    geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:"Rotate 360° about point (2,-1)",     cx:2,  cy:-1, type:"rot360",    geometryOnly:true }
];

// challengePool is built per-mode in buildOrder()
var challengePool = [];
var challengeOrder = [];

function applyChallenge(ch, x, y) {
  if (ch.type === "translate")   return { x: x+ch.dx, y: y+ch.dy };
  if (ch.type === "reflect_x")   return { x: x,  y: -y };
  if (ch.type === "reflect_y")   return { x: -x, y: y  };
  var dx = x - ch.cx, dy = y - ch.cy;
  if (ch.type === "rot90ccw")  return { x: ch.cx-dy,  y: ch.cy+dx  }; // 90° CCW
  if (ch.type === "rot90cw")   return { x: ch.cx+dy,  y: ch.cy-dx  }; // 90° CW
  if (ch.type === "rot180")    return { x: ch.cx-dx,  y: ch.cy-dy  }; // 180°
  if (ch.type === "rot270ccw") return { x: ch.cx+dy,  y: ch.cy-dx  }; // 270° CCW = 90° CW
  if (ch.type === "rot270cw")  return { x: ch.cx-dy,  y: ch.cy+dx  }; // 270° CW  = 90° CCW
  if (ch.type === "rot360")    return { x: x, y: y };                  // 360° = back to start
  return { x: x, y: y };
}

function isRotation(ch) {
  return ch && (ch.type==="rot90ccw"  || ch.type==="rot90cw"  ||
                ch.type==="rot180"    || ch.type==="rot270ccw" ||
                ch.type==="rot270cw"  || ch.type==="rot360");
}

// ---------- SHUFFLE ----------
function shuffleArr(arr) {
  var a = arr.slice();
  for (var i = a.length-1; i > 0; i--) {
    var j = Math.floor(Math.random()*(i+1));
    var tmp=a[i]; a[i]=a[j]; a[j]=tmp;
  }
  return a;
}

function buildOrder() {
  // Build mode-specific pool and split by type
  challengePool = [];
  var transIdx = [], rotIdx = [], refIdx = [];
  for (var i = 0; i < challenges.length; i++) {
    var ch = challenges[i];
    if (ch.geometryOnly && gameMode !== "GEOMETRY") continue;
    if (gameMode === "GENIUS" && ch.noGenius) continue;
    if (gameMode === "GEOMETRY" && isRotation(ch) && ch.cx === 0 && ch.cy === 0) continue;
    var idx = challengePool.length;
    challengePool.push(ch);
    if (ch.type === "translate")          transIdx.push(idx);
    else if (ch.topic === "Rotation")     rotIdx.push(idx);
    else if (ch.topic === "Reflection")   refIdx.push(idx);
  }
  // Fixed 3-round sequence: Translation → Rotation → Reflection
  challengeOrder = [
    transIdx[Math.floor(Math.random() * transIdx.length)],
    rotIdx  [Math.floor(Math.random() * rotIdx.length)],
    refIdx  [Math.floor(Math.random() * refIdx.length)]
  ];
}

function buildPracticeOrder() {
  challengePool = [];
  // Non-origin rotation centers (normally Geometry Genius only) phase
  // into Practice's own pool once the mastery meter crosses 50 - a real
  // difficulty step using already-authored harder content, rather than
  // a separate escalation system.
  var unlockHarder = practiceMastery >= 50;
  for (var i = 0; i < challenges.length; i++) {
    var ch = challenges[i];
    if (ch.geometryOnly && !unlockHarder) continue;
    if (ch.noGenius) continue;
    challengePool.push(ch);
  }
  var types = [];
  if (skillTranslations) types.push("Translation");
  if (skillRotations)    types.push("Rotation");
  if (skillReflections)  types.push("Reflection");
  if (types.length === 0) types = ["Translation","Rotation","Reflection"];
  TOTAL_ROUNDS = 5;
  challengeOrder = [];
  var lastType = "";
  var lastIdx = -1;
  for (var r = 0; r < TOTAL_ROUNDS; r++) {
    var tp = types[Math.floor(Math.random()*types.length)];
    if (types.length > 1 && tp === lastType)
      tp = types[(types.indexOf(tp)+1) % types.length];
    lastType = tp;
    var pool2 = [];
    for (var j = 0; j < challengePool.length; j++) {
      if (challengePool[j].topic === tp && j !== lastIdx) pool2.push(j);
    }
    // Fallback: if there's only one challenge of this type, allow the repeat
    if (pool2.length === 0) {
      for (var j = 0; j < challengePool.length; j++) {
        if (challengePool[j].topic === tp) pool2.push(j);
      }
    }
    var chosen = pool2.length > 0 ? pool2[Math.floor(Math.random()*pool2.length)] : 0;
    challengeOrder.push(chosen);
    lastIdx = chosen;
  }
}

// Detect which specific mistake the practice player made and return a hint type string
function detectPracticeHint() {
  var ch = curCh();

  // ---- ROTATIONS ----
  if (isRotation(ch)) {
    // CW/CCW confusion: correct amount, wrong direction
    var oppType = (ch.type==="rot90ccw") ? "rot90cw" : (ch.type==="rot90cw") ? "rot90ccw" : "";
    if (oppType !== "") {
      var oppResult = applyChallenge({type:oppType,cx:ch.cx,cy:ch.cy}, startGX, startGY);
      if (lockedGX === oppResult.x && lockedGY === oppResult.y) return "cwccw";
    }
    // Wrong degree amount: landed on a valid rotation multiple, just the wrong one
    var rdx = startGX-ch.cx, rdy = startGY-ch.cy;
    var rotCandidates = [
      {x:ch.cx-rdy, y:ch.cy+rdx},
      {x:ch.cx+rdy, y:ch.cy-rdx},
      {x:ch.cx-rdx, y:ch.cy-rdy},
      {x:startGX,   y:startGY  }
    ];
    for (var k = 0; k < rotCandidates.length; k++) {
      if (lockedGX===rotCandidates[k].x && lockedGY===rotCandidates[k].y) return "degrees";
    }
    return "rotation_other";
  }

  // ---- REFLECTIONS ----
  if (ch.type==="reflect_x" || ch.type==="reflect_y") {
    // Didn't move at all
    if (lockedGX===startGX && lockedGY===startGY) return "reflect_no_move";
    // Reflected over the other axis instead
    var wrongAxisType = (ch.type==="reflect_x") ? "reflect_y" : "reflect_x";
    var wrongAxisResult = applyChallenge({type:wrongAxisType}, startGX, startGY);
    if (lockedGX===wrongAxisResult.x && lockedGY===wrongAxisResult.y) return "reflect_wrong_axis";
    return "reflect_other";
  }

  // ---- TRANSLATIONS ----
  if (ch.type==="translate") {
    var correct = applyChallenge(ch, startGX, startGY);
    // Didn't move
    if (lockedGX===startGX && lockedGY===startGY) return "translate_no_move";
    // Went exact opposite direction (both axes negated)
    if (lockedGX===startGX-ch.dx && lockedGY===startGY-ch.dy) return "translate_negated";
    // Only moved x correctly, forgot y
    if (lockedGX===correct.x && lockedGY===startGY) return "translate_missing_y";
    // Only moved y correctly, forgot x
    if (lockedGX===startGX && lockedGY===correct.y) return "translate_missing_x";
    // Swapped x and y amounts
    if (ch.dx!==ch.dy && lockedGX===startGX+ch.dy && lockedGY===startGY+ch.dx) return "translate_swapped";
    // Correct y, but x direction flipped
    if (lockedGX===startGX-ch.dx && lockedGY===correct.y) return "translate_wrong_x";
    // Correct x, but y direction flipped
    if (lockedGX===correct.x && lockedGY===startGY-ch.dy) return "translate_wrong_y";
    return "translate_other";
  }

  return "generic";
}

// ---------- CURRENT CHALLENGE HELPER ----------
function curCh() { return challengePool[challengeOrder[round]]; }

// ---------- LOAD ROUND ----------
function loadRound() {
  var ch = curCh();
  topicLabel    = ch.topic;
  challengeLabel = ch.label.replace("about", Math.random()<0.5 ? "about" : "around");
  topicR = ch.r; topicG = ch.g; topicB = ch.b;

  var attempts = 0, sx, sy, t;
  do {
    sx = Math.floor(Math.random()*11) - 5;
    sy = Math.floor(Math.random()*11) - 5;
    t  = applyChallenge(ch, sx, sy);
    attempts++;
  } while (attempts < 300 && (
    (sx===0 && sy===0) ||
    t.x < GRID_MIN || t.x > GRID_MAX ||
    t.y < GRID_MIN || t.y > GRID_MAX ||
    (gameMode!=="GEOMETRY" && ch.type==="reflect_x" && sy===0) ||
    (gameMode!=="GEOMETRY" && ch.type==="reflect_y" && sx===0) ||
    (isRotation(ch) && sx===ch.cx && sy===ch.cy) ||
    (isRotation(ch) && (sx-ch.cx)*(sx-ch.cx)+(sy-ch.cy)*(sy-ch.cy) > 20) ||
    ((gameMode==="GEOMETRY"||gameMode==="GENIUS") && isRotation(ch) && (sx===0 || sy===0 || Math.abs(sx)>4 || Math.abs(sy)>4))
  ));

  startGX=sx; startGY=sy;
  targetGX=t.x; targetGY=t.y;
  playerGX=startGX; playerGY=startGY;
  playerPX=toPixelX(startGX); playerPY=toPixelY(startGY);
  generateGeomShape();
  p1GX=startGX; p1GY=startGY;
  p2GX=startGX; p2GY=startGY;
  roundWinner=0;
  practiceAttempts=0;
  moveCooldown=0;

  if (isRotation(ch)) {
    tracingActive=true; tracingPhase="PENCIL";
    paperAngle=0; paperSignedAngle=0; paperSnappedAngle=0;
    centerSet=false;
    paperPointGX=startGX; paperPointGY=startGY;
    pencilGX=0; pencilGY=0;
    pencilX=toPixelX(pencilGX); pencilY=toPixelY(pencilGY);
  } else {
    tracingActive=false; tracingPhase="DONE";
  }

  geomInputX=""; geomInputY=""; geomInputField="x";
  equivalentRotation=false;
  if(gameMode==="PRACTICE") practiceQNum++;
  // Head-to-Head gets extra frames here for a "3-2-1-GO" countdown (see
  // the SHOWING render block) before the race actually starts.
  showingTimer = (gameMode==="HEADTOHEAD") ? 120 : 90;
  STATE="SHOWING";
}

function resetRound() {
  playerGX=startGX; playerGY=startGY;
  playerPX=toPixelX(startGX); playerPY=toPixelY(startGY);
  p1GX=startGX; p1GY=startGY;
  p2GX=startGX; p2GY=startGY;
  roundWinner=0; practiceAttempts=0;
  var ch=curCh();
  if (isRotation(ch)) {
    tracingActive=true; tracingPhase="PENCIL";
    paperAngle=0; paperSignedAngle=0; paperSnappedAngle=0;
    paperDirection="CCW";
    pencilGX=0; pencilGY=0;
    pencilX=toPixelX(0); pencilY=toPixelY(0);
    centerSet=false;
  }
  moveCooldown=0;
  STATE="MOVING";
}

// Load a NEW challenge of the same topic type for this round (wrong-answer retry)
function reloadRoundSameType() {
  var curTopic = curCh().topic;
  var curIdx   = challengeOrder[round];
  var pool = [];
  for (var k = 0; k < challengePool.length; k++) {
    if (challengePool[k].topic === curTopic && k !== curIdx) pool.push(k);
  }
  if (pool.length === 0) pool.push(curIdx); // fallback: same challenge, fresh start
  challengeOrder[round] = pool[Math.floor(Math.random() * pool.length)];
  loadRound();
}

function resetGame() {
  score=0; round=0;
  p1wins=0; p2wins=0;
  newHighScore=false; timerFinished=0; practiceHintType=""; practiceQNum=0;
  // currentStreak is intentionally NOT reset here - it carries across
  // mode switches and fresh sessions alike, breaking only on an actual
  // wrong answer (see registerCorrectForStreak / the two spots that set
  // currentStreak=0). practiceMastery is Practice-specific and does
  // reset each session, same as before.
  practiceMastery=0;
  // Keep player-chosen skills for PRACTICE; reset to all-on for other modes
  if (gameMode !== "PRACTICE") {
    skillTranslations=true; skillRotations=true; skillReflections=true;
  }
  lives = (gameMode==="GENIUS"||gameMode==="GEOMETRY"||gameMode==="PRACTICE") ? 999 : 3;
  if (gameMode==="PRACTICE") { buildPracticeOrder(); }
  else { TOTAL_ROUNDS=3; buildOrder(); }
  timerStart = Date.now();
  loadRound();
}

// ---------- ROTATION MATH ----------
// How far off an exact right-angle multiple the player's angle is
// allowed to be and still count as landing exactly there - just enough
// to absorb GEOMETRY mode's continuous ±2°/frame overshoot, never wide
// enough to reach into the neighboring multiple. Non-GEOMETRY modes
// move in fixed 15° steps, so every reachable angle that ISN'T itself a
// multiple of 90 (60°, 75°, 105°, ...) sits at least 15° from the
// nearest one - safely outside this tolerance either way.
var ROTATION_SNAP_TOLERANCE = 5;

// True only when paperSignedAngle is genuinely close to SOME multiple
// of 90 - not just "closer to this one than the others." The old
// unconditional Math.round(angle/90)*90 treated anything up to 44° off
// (nearly half of a full quarter-turn) as if it were exactly there, so
// rotating only 60° of a required 90° still snapped to - and scored as
// - a perfect 90°.
function nearestRightAngle(angleDeg) {
  var nearest = Math.round(angleDeg/90)*90;
  return Math.abs(angleDeg-nearest) <= ROTATION_SNAP_TOLERANCE ? nearest : null;
}

function getTracingAnswer() {
  var dx=paperPointGX-centerGX, dy=paperPointGY-centerGY;
  var s=nearestRightAngle(paperSignedAngle);
  // Not close enough to any right-angle multiple at all - NaN can never
  // equal a real target coordinate, so this fails the correctness check
  // unconditionally. Returning the un-rotated point here instead (as a
  // previous version of this function did) was indistinguishable from a
  // GENUINE 0°/360° answer, so an arbitrary bad angle like 45° could
  // slip through as correct on a rot360 question (whose target IS the
  // un-rotated point) even though it isn't remotely close to 0 or 360.
  if (s===null) return {x:NaN, y:NaN};
  var absS = Math.abs(s)%360;
  if (absS===0) return {x:paperPointGX, y:paperPointGY};
  if (s>0) {
    if (absS===90)  return {x:centerGX-dy, y:centerGY+dx};
    if (absS===180) return {x:centerGX-dx, y:centerGY-dy};
    if (absS===270) return {x:centerGX+dy, y:centerGY-dx};
  } else {
    if (absS===90)  return {x:centerGX+dy, y:centerGY-dx};
    if (absS===180) return {x:centerGX-dx, y:centerGY-dy};
    if (absS===270) return {x:centerGX-dy, y:centerGY+dx};
  }
  return {x:NaN, y:NaN};
}

// Returns true if the player's current paperSignedAngle matches the
// rotation amount the challenge actually asks for.
function isCorrectRotationAmount(ch) {
  var s = nearestRightAngle(paperSignedAngle);
  if (s===null) return false;
  if (ch.type === "rot90ccw")  return s === 90;
  if (ch.type === "rot90cw")   return s === -90;
  if (ch.type === "rot180")    return Math.abs(s) === 180; // either direction OK
  if (ch.type === "rot270ccw") return s === 270;
  if (ch.type === "rot270cw")  return s === -270;
  if (ch.type === "rot360")    return Math.abs(s) === 360;
  return true;
}

// ---------- TRACING PAPER INTERACTION ----------
function handleTracingInteraction() {
  var ch=curCh();
  if (!isRotation(ch)) return;
  var maxRot = (gameMode==="GEOMETRY") ? 720 : 360;

  if (tracingPhase==="PENCIL") {
    if (moveCooldown>0) { moveCooldown--; return; }
    var ngx=pencilGX, ngy=pencilGY;
    if      ((keyDown("left")||keyDown("a")) &&ngx>GRID_MIN) ngx--;
    else if ((keyDown("right")||keyDown("d"))&&ngx<GRID_MAX) ngx++;
    else if ((keyDown("up")||keyDown("w"))   &&ngy<GRID_MAX) ngy++;
    else if ((keyDown("down")||keyDown("s")) &&ngy>GRID_MIN) ngy--;
    if (ngx!==pencilGX||ngy!==pencilGY) { pencilGX=ngx; pencilGY=ngy; moveCooldown=3; }
    pencilX=toPixelX(pencilGX); pencilY=toPixelY(pencilGY);
    return;
  }

  if (tracingPhase==="PAPER") {
    if (gameMode==="GEOMETRY") {
      // Smooth continuous rotation — no cooldown, small step per frame
      if (keyDown("up")||keyDown("w"))   { paperSignedAngle+=2; paperDirection="CW";  }
      if (keyDown("down")||keyDown("s")) { paperSignedAngle-=2; paperDirection="CCW"; }
    } else {
      if (moveCooldown>0) { moveCooldown--; return; }
      var rotFirst=keyWentDown("up")||keyWentDown("w")||keyWentDown("down")||keyWentDown("s");
      if (keyDown("up")||keyDown("w")) {
        paperSignedAngle+=15; paperDirection="CW";  moveCooldown=rotFirst?8:3;
      } else if (keyDown("down")||keyDown("s")) {
        paperSignedAngle-=15; paperDirection="CCW"; moveCooldown=rotFirst?8:3;
      }
    }
    if (paperSignedAngle> maxRot) paperSignedAngle= maxRot;
    if (paperSignedAngle<-maxRot) paperSignedAngle=-maxRot;
    paperAngle=((paperSignedAngle%360)+360)%360;
    paperSnappedAngle=Math.round(paperSignedAngle/90)*90;
  }
}

// ---------- GEOMETRY TYPED INPUT HANDLERS ----------
function handleGeomInput() {
  var digits = ["0","1","2","3","4","5","6","7","8","9"];
  for (var i = 0; i < digits.length; i++) {
    if (keyWentDown(digits[i])) {
      if (geomInputField === "x") geomInputX += digits[i];
      else                        geomInputY += digits[i];
    }
  }
  // Minus: toggles negative prefix
  if (keyWentDown("-")) {
    if (geomInputField === "x")
      geomInputX = (geomInputX === "") ? "-" : (geomInputX[0]==="-" ? geomInputX.slice(1) : "-"+geomInputX);
    else
      geomInputY = (geomInputY === "") ? "-" : (geomInputY[0]==="-" ? geomInputY.slice(1) : "-"+geomInputY);
  }
  // Backspace
  if (keyWentDown("backspace")) {
    if (geomInputField === "y" && geomInputY.length === 0) {
      geomInputField = "x";           // back to x field when y is empty
    } else if (geomInputField === "x") {
      geomInputX = geomInputX.slice(0, -1);
    } else {
      geomInputY = geomInputY.slice(0, -1);
    }
  }
  // Comma: advance to y field
  if (keyWentDown(",")) geomInputField = "y";
}

function parseGeomAnswer() {
  var x = parseInt(geomInputX, 10);
  var y = parseInt(geomInputY, 10);
  if (isNaN(x) || isNaN(y)) return null;
  return { x: x, y: y };
}

// ---------- REFLECTION DISTANCE HELPER ----------
// Shows how far the start point is from the axis, and how far the player
// currently is on the other side — both as labelled line segments.
function drawReflectionDistances() {
  if (gameMode === "GEOMETRY") return; // hard mode: no scaffolding
  var ch = curCh();
  if (gameMode === "GENIUS" || gameMode === "PRACTICE") {
    // Show once player reaches or crosses the axis
    if (ch.type === "reflect_y" && playerGX * startGX > 0) return;
    if (ch.type === "reflect_x" && playerGY * startGY > 0) return;
  } else {
    // Other modes: only show while on the axis
    if (ch.type === "reflect_y" && playerGX !== 0) return;
    if (ch.type === "reflect_x" && playerGY !== 0) return;
  }

  // Keeps every label's box on-screen and clear of the top HUD / bottom
  // instruction bar (or the left/right edges, for the x-axis case),
  // regardless of how close to a grid edge the point is.
  var LBL_MIN_Y=100, LBL_MAX_Y=368, LBL_MIN_X=8, LBL_MAX_X=400-8-54;

  // ---- Y-AXIS REFLECTION: horizontal distances ----
  if (ch.type === "reflect_y") {
    var axPX = toPixelX(0);

    // --- Start → axis (fixed, cyan) ---
    var sDist = Math.abs(startGX);
    if (sDist > 0) {
      var sxPX = toPixelX(startGX), syPY = toPixelY(startGY);
      stroke(80, 210, 255, 200); strokeWeight(2);
      line(sxPX, syPY, axPX, syPY);
      // tick marks at each end
      line(sxPX, syPY-5, sxPX, syPY+5);
      line(axPX, syPY-5, axPX, syPY+5);
      // label above
      var midX1 = constrain((sxPX + axPX) / 2, LBL_MIN_X+28, LBL_MAX_X+54-28);
      var lbY1 = constrain(syPY-15, LBL_MIN_Y, LBL_MAX_Y);
      fill(0,0,0,170); noStroke(); rect(midX1-28, lbY1-7, 56, 14, 4);
      fill(80,210,255); textSize(9); textAlign(CENTER,CENTER); noStroke();
      text(sDist + " unit" + (sDist!==1?"s":""), midX1, lbY1);
    }

    // --- Axis → player (dynamic, green), only when player has left the axis ---
    var pDist = Math.abs(playerGX);
    if (pDist > 0) {
      var pxPX = toPixelX(playerGX), pyPY = toPixelY(playerGY);
      stroke(80, 255, 170, 200); strokeWeight(2);
      line(axPX, pyPY, pxPX, pyPY);
      line(axPX, pyPY-5, axPX, pyPY+5);
      line(pxPX, pyPY-5, pxPX, pyPY+5);
      // label below
      var midX2 = constrain((axPX + pxPX) / 2, LBL_MIN_X+28, LBL_MAX_X+54-28);
      var lbY2 = constrain(pyPY+15, LBL_MIN_Y, LBL_MAX_Y);
      fill(0,0,0,170); noStroke(); rect(midX2-28, lbY2-7, 56, 14, 4);
      fill(80,255,170); textSize(9); textAlign(CENTER,CENTER); noStroke();
      text(pDist + " unit" + (pDist!==1?"s":""), midX2, lbY2);
    }
  }

  // ---- X-AXIS REFLECTION: vertical distances ----
  if (ch.type === "reflect_x") {
    var axPY = toPixelY(0);

    // --- Start → axis (fixed, cyan) ---
    var sDist2 = Math.abs(startGY);
    if (sDist2 > 0) {
      var sxPX2 = toPixelX(startGX), syPY2 = toPixelY(startGY);
      stroke(80, 210, 255, 200); strokeWeight(2);
      line(sxPX2, syPY2, sxPX2, axPY);
      line(sxPX2-5, syPY2, sxPX2+5, syPY2);
      line(sxPX2-5, axPY,  sxPX2+5, axPY);
      // label to the right
      var midY1 = constrain((syPY2 + axPY) / 2, LBL_MIN_Y-7, LBL_MAX_Y+7);
      var boxX1 = constrain(sxPX2+6, LBL_MIN_X, LBL_MAX_X);
      fill(0,0,0,170); noStroke(); rect(boxX1, midY1-7, 54, 14, 4);
      fill(80,210,255); textSize(9); textAlign(LEFT,CENTER); noStroke();
      text(sDist2 + " unit" + (sDist2!==1?"s":""), boxX1+4, midY1);
    }

    // --- Axis → player (dynamic, green) ---
    var pDist2 = Math.abs(playerGY);
    if (pDist2 > 0) {
      var pxPX2 = toPixelX(playerGX), pyPY2 = toPixelY(playerGY);
      stroke(80, 255, 170, 200); strokeWeight(2);
      line(pxPX2, axPY, pxPX2, pyPY2);
      line(pxPX2-5, axPY,  pxPX2+5, axPY);
      line(pxPX2-5, pyPY2, pxPX2+5, pyPY2);
      // label to the left
      var midY2 = constrain((axPY + pyPY2) / 2, LBL_MIN_Y-7, LBL_MAX_Y+7);
      var boxX2 = constrain(pxPX2-60, LBL_MIN_X, LBL_MAX_X);
      fill(0,0,0,170); noStroke(); rect(boxX2, midY2-7, 54, 14, 4);
      fill(80,255,170); textSize(9); textAlign(RIGHT,CENTER); noStroke();
      text(pDist2 + " unit" + (pDist2!==1?"s":""), boxX2+48, midY2);
    }
  }
}

// ---------- GEOMETRY SHAPE HELPERS ----------
function isGeomShapeValid(pts) {
  var n = pts.length;
  // No duplicate vertices
  for (var i = 0; i < n; i++)
    for (var j = i+1; j < n; j++)
      if (pts[i].ox===pts[j].ox && pts[i].oy===pts[j].oy) return false;
  // All consecutive cross-products same sign (convex polygon)
  var sign = 0;
  for (var i = 0; i < n; i++) {
    var a=pts[i], b=pts[(i+1)%n], c=pts[(i+2)%n];
    var cross=(b.ox-a.ox)*(c.oy-a.oy)-(b.oy-a.oy)*(c.ox-a.ox);
    if (cross===0) return false; // collinear edge
    var s=cross>0?1:-1;
    if (sign===0) sign=s; else if (s!==sign) return false;
  }
  // Minimum area >= 2 sq units
  var area=0;
  for (var i=0;i<n;i++){var j=(i+1)%n;area+=pts[i].ox*pts[j].oy-pts[j].ox*pts[i].oy;}
  return Math.abs(area)/2 >= 2;
}

function computeShapeBounds() {
  if (geomShapeType==="") {
    shapePXMin=toPixelX(GRID_MIN); shapePXMax=toPixelX(GRID_MAX);
    shapePYMin=toPixelY(GRID_MAX); shapePYMax=toPixelY(GRID_MIN);
    return;
  }
  var all=[{ox:0,oy:0}].concat(geomShapeOffsets);
  var minOX=0,maxOX=0,minOY=0,maxOY=0;
  for (var i=0;i<all.length;i++){
    if(all[i].ox<minOX)minOX=all[i].ox;
    if(all[i].ox>maxOX)maxOX=all[i].ox;
    if(all[i].oy<minOY)minOY=all[i].oy;
    if(all[i].oy>maxOY)maxOY=all[i].oy;
  }
  // playerGX must stay in [-5-minOX, 5-maxOX] so all verts remain on grid
  shapePXMin=toPixelX(-5-minOX); shapePXMax=toPixelX(5-maxOX);
  shapePYMin=toPixelY(5-maxOY);  shapePYMax=toPixelY(-5-minOY);
}

function generateGeomShape() {
  var ch=curCh();
  if (gameMode!=="GEOMETRY"||ch.type!=="translate") {
    geomShapeType=""; geomShapeOffsets=[]; computeShapeBounds(); return;
  }
  // Valid grid-offset range: vertex must land on grid both before AND after translation
  var oxMin=Math.max(Math.max(-5-startGX,-5-targetGX),-3);
  var oxMax=Math.min(Math.min(5-startGX, 5-targetGX), 3);
  var oyMin=Math.max(Math.max(-5-startGY,-5-targetGY),-3);
  var oyMax=Math.min(Math.min(5-startGY, 5-targetGY), 3);
  if (oxMax-oxMin<2||oyMax-oyMin<2) {
    geomShapeType=""; geomShapeOffsets=[]; computeShapeBounds(); return;
  }
  geomShapeType=Math.random()<0.5?"triangle":"quad";
  var extra=geomShapeType==="triangle"?2:3;
  for (var attempt=0;attempt<300;attempt++){
    var all=[{ox:0,oy:0}];
    for (var i=0;i<extra;i++){
      all.push({
        ox:Math.floor(Math.random()*(oxMax-oxMin+1))+oxMin,
        oy:Math.floor(Math.random()*(oyMax-oyMin+1))+oyMin
      });
    }
    // Sort vertices by angle from centroid to form a convex polygon
    var ccx=0,ccy=0;
    for (var i=0;i<all.length;i++){ccx+=all[i].ox;ccy+=all[i].oy;}
    ccx/=all.length; ccy/=all.length;
    all.sort(function(a,b){
      return Math.atan2(a.oy-ccy,a.ox-ccx)-Math.atan2(b.oy-ccy,b.ox-ccx);
    });
    if (!isGeomShapeValid(all)) continue;
    // Rotate array so vertex 0 (ox===0, oy===0) is first
    var z=0;
    for (var i=0;i<all.length;i++){if(all[i].ox===0&&all[i].oy===0){z=i;break;}}
    var sorted=all.slice(z).concat(all.slice(0,z));
    geomShapeOffsets=sorted.slice(1);
    computeShapeBounds(); return;
  }
  geomShapeType=""; geomShapeOffsets=[]; computeShapeBounds();
}

function drawGeomShape(basePX, basePY, showLabels) {
  if (geomShapeType==="") return;
  var all=[{ox:0,oy:0}].concat(geomShapeOffsets);
  var n=all.length;
  var pv=[];
  for (var i=0;i<n;i++){
    var pvx=basePX+all[i].ox*CELL, pvy=basePY-all[i].oy*CELL;
    pv.push({x:pvx, y:pvy, gx:toGridX(pvx), gy:toGridY(pvy)});
  }
  // Filled, semi-transparent polygon
  var sc=SHAPE_COLORS[0];
  fill(sc[0],sc[1],sc[2],18); stroke(200,210,255,160); strokeWeight(2);
  if (n===3) { triangle(pv[0].x,pv[0].y,pv[1].x,pv[1].y,pv[2].x,pv[2].y); }
  else       { quad(pv[0].x,pv[0].y,pv[1].x,pv[1].y,pv[2].x,pv[2].y,pv[3].x,pv[3].y); }
  // Vertex smiley faces
  for (var i=0;i<n;i++){
    var c=SHAPE_COLORS[i%4];
    var lbl=showLabels?"("+pv[i].gx+", "+pv[i].gy+")":"";
    drawFaceAt(pv[i].x,pv[i].y,c[0],c[1],c[2],lbl);
  }
}

// ---------- TRANSLATION HELPER (GENIUS / PRACTICE mode) ----------
function drawTranslationHelper() {
  var ch=curCh();
  if (ch.type!=="translate") return;
  var sxPX=toPixelX(startGX), syPY=toPixelY(startGY);
  var cxPX=toPixelX(playerGX), cyPY=toPixelY(playerGY);
  var dxU=playerGX-startGX, dyU=playerGY-startGY;
  // Algebraic labels contain "(x"; natural language contain "units"
  var isAlgebraic = (ch.label.indexOf("(x") !== -1);

  // Keeps every label's full box on-screen and clear of the top HUD /
  // bottom instruction bar, regardless of how close to a grid edge the
  // start or current point is - a point near y=-5 or y=5 used to push
  // its label's text under one of those opaque bars, invisible even
  // though it "drew" there.
  var LBL_MIN_Y=100, LBL_MAX_Y=368, LBL_MIN_X=38, LBL_MAX_X=362;

  // Horizontal leg
  if (dxU!==0) {
    stroke(80,200,255,180); strokeWeight(2); line(sxPX,syPY,cxPX,syPY);
    var ax=dxU>0?cxPX-6:cxPX+6;
    fill(80,200,255,200); noStroke();
    triangle(cxPX,syPY,ax,syPY-4,ax,syPY+4);
    var midHX=constrain((sxPX+cxPX)/2, LBL_MIN_X, LBL_MAX_X);
    var lbY=constrain(syPY+(cyPY>syPY?-14:14), LBL_MIN_Y, LBL_MAX_Y);
    var hLabel=isAlgebraic ? ("x "+(dxU>0?"+ ":"- ")+Math.abs(dxU))
                           : ((Math.abs(dxU)===1?"1 unit":Math.abs(dxU)+" units")+(dxU>0?" right":" left"));
    fill(0,0,0,160); noStroke(); rect(midHX-30,lbY-8,60,16,4);
    fill(80,200,255); textSize(9); textAlign(CENTER,CENTER); noStroke();
    text(hLabel,midHX,lbY);
  }

  // Vertical leg
  if (dyU!==0) {
    stroke(80,255,160,180); strokeWeight(2); line(cxPX,syPY,cxPX,cyPY);
    var ay=dyU>0?cyPY+6:cyPY-6;
    fill(80,255,160,200); noStroke();
    triangle(cxPX,cyPY,cxPX-4,ay,cxPX+4,ay);
    var midVY=constrain((syPY+cyPY)/2, LBL_MIN_Y, LBL_MAX_Y);
    var lbX=constrain(cxPX+(cxPX<300?34:-34), LBL_MIN_X, LBL_MAX_X);
    var vLabel=isAlgebraic ? ("y "+(dyU>0?"+ ":"- ")+Math.abs(dyU))
                           : ((Math.abs(dyU)===1?"1 unit":Math.abs(dyU)+" units")+(dyU>0?" up":" down"));
    fill(0,0,0,160); noStroke(); rect(lbX-30,midVY-8,60,16,4);
    fill(80,255,160); textSize(9); textAlign(CENTER,CENTER); noStroke();
    text(vLabel,lbX,midVY);
  }
}

// ---------- DRAW TRACING PAPER ----------
function drawTracingPaper() {
  var ch=curCh();
  if (!isRotation(ch)) return;
  var showDeg=(gameMode!=="GEOMETRY");

  if (tracingPhase==="PENCIL") {
    // Starts right below whichever HUD height the current mode actually
    // uses (Practice's is taller, for its mastery bar) so this banner
    // never sits partly hidden under it.
    var bannerTop = hudHeight()+4;
    fill(10,20,60,230); stroke(80,120,220); strokeWeight(1); rect(10,bannerTop,380,32,8);
    fill(180,210,255); textSize(11); textAlign(CENTER,CENTER); noStroke();
    text("STEP 1: Use arrow keys to move pencil to center of rotation",200,bannerTop+12);
    fill(140,170,220); textSize(10);
    text("Then press SPACE to pin it there",200,bannerTop+26);
    for (var gx2=GRID_MIN;gx2<=GRID_MAX;gx2++)
      for (var gy2=GRID_MIN;gy2<=GRID_MAX;gy2++) {
        noFill(); stroke(80,120,200,80); strokeWeight(1);
        ellipse(toPixelX(gx2),toPixelY(gy2),10,10);
      }
    var spx=toPixelX(pencilGX),spy=toPixelY(pencilGY);
    fill(255,220,60,60); noStroke(); ellipse(spx,spy,24,24);
    fill(255,220,60); textSize(9); textAlign(CENTER,BOTTOM); noStroke();
    text("("+pencilGX+","+pencilGY+")",spx,spy-18);
    drawPencil(pencilX,pencilY);
    // Ends well above the bottom instruction bar (376-400) - it used to
    // reach into that bar's territory and visually collide with its
    // "Arrow keys: move pencil..." hint text.
    if (drawButton(140,340,120,28,"CONFIRM CENTER",0,140,60)) confirmCenter();
    return;
  }

  if (tracingPhase==="PAPER") {
    var cx=toPixelX(centerGX), cy=toPixelY(centerGY);
    var ang=paperAngle;
    var ptPX=toPixelX(paperPointGX)-toPixelX(centerGX);
    var ptPY=toPixelY(paperPointGY)-toPixelY(centerGY);

    function p2s(px,py){return{x:cx+px*cos(ang)+py*sin(ang),y:cy-px*sin(ang)+py*cos(ang)};}

    var rp=p2s(ptPX,ptPY); var rpx=rp.x,rpy=rp.y;
    var pad=36, hs=Math.max(Math.abs(ptPX),Math.abs(ptPY))+pad;
    var c0=p2s(-hs,-hs),c1=p2s(hs,-hs),c2=p2s(hs,hs),c3=p2s(-hs,hs);
    fill(180,210,255,50); stroke(120,170,255,160); strokeWeight(2);
    quad(c0.x,c0.y,c1.x,c1.y,c2.x,c2.y,c3.x,c3.y);

    // Determine whether the top-right arrow could ever leave the canvas
    // during a full 360° rotation. Its tip/base each trace circles of radius r
    // around the paper center (cx, cy). If that circle breaches any edge, show
    // a second arrow at the bottom-left so one is always visible.
    var arAcx=hs-pad*0.6, arAcy=-hs+pad*0.6;
    var rTip  = Math.sqrt(arAcx*arAcx + (arAcy-16)*(arAcy-16));
    var rBase = Math.sqrt(arAcx*arAcx + (arAcy+16)*(arAcy+16));
    var rMax  = Math.max(rTip, rBase);
    var couldGoOff = (cx-rMax < 8 || cx+rMax > 392 ||
                      cy-rMax < 68 || cy+rMax > 378);

    // Primary arrow — top-right corner, always drawn
    var aBase=p2s(arAcx,arAcy+16), aTip=p2s(arAcx,arAcy-16);
    var adx=aTip.x-aBase.x, ady=aTip.y-aBase.y;
    var al=Math.sqrt(adx*adx+ady*ady);
    if(al>0){adx/=al;ady/=al;}
    stroke(255,80,80,230); strokeWeight(3); line(aBase.x,aBase.y,aTip.x,aTip.y);
    fill(255,80,80,230); noStroke();
    triangle(aTip.x,aTip.y,
             aTip.x-adx*12-ady*5,aTip.y-ady*12+adx*5,
             aTip.x-adx*12+ady*5,aTip.y-ady*12-adx*5);

    // Second arrow — bottom-left corner, only when top-right could go off-screen
    if (couldGoOff) {
      var bcx=-hs+pad*0.6, bcy=hs-pad*0.6;
      var bBase=p2s(bcx,bcy+16), bTip=p2s(bcx,bcy-16);
      var bdx=bTip.x-bBase.x, bdy=bTip.y-bBase.y;
      var bl=Math.sqrt(bdx*bdx+bdy*bdy);
      if(bl>0){bdx/=bl;bdy/=bl;}
      stroke(255,80,80,230); strokeWeight(3); line(bBase.x,bBase.y,bTip.x,bTip.y);
      fill(255,80,80,230); noStroke();
      triangle(bTip.x,bTip.y,
               bTip.x-bdx*12-bdy*5,bTip.y-bdy*12+bdx*5,
               bTip.x-bdx*12+bdy*5,bTip.y-bdy*12-bdx*5);
    }

    // Radius arms
    var sPX=toPixelX(paperPointGX),sPY=toPixelY(paperPointGY);
    // Yellow radius arms and arc — hidden in Geometry Genius
    if (gameMode!=="GEOMETRY") {
      stroke(220,180,0); strokeWeight(2);
      line(cx,cy,sPX,sPY); line(cx,cy,rpx,rpy);

      // Right-angle square at 90°
      if (Math.abs(Math.round(paperSignedAngle))%360===90) {
        var sqSz=12;
        var a1l=Math.sqrt((sPX-cx)*(sPX-cx)+(sPY-cy)*(sPY-cy));
        var u1x=a1l>0?(sPX-cx)/a1l:1, u1y=a1l>0?(sPY-cy)/a1l:0;
        var a2l=Math.sqrt((rpx-cx)*(rpx-cx)+(rpy-cy)*(rpy-cy));
        var u2x=a2l>0?(rpx-cx)/a2l:0, u2y=a2l>0?(rpy-cy)/a2l:1;
        var sp1x=cx+u1x*sqSz,sp1y=cy+u1y*sqSz;
        var sp2x=sp1x+u2x*sqSz,sp2y=sp1y+u2y*sqSz;
        var sp3x=cx+u2x*sqSz,sp3y=cy+u2y*sqSz;
        stroke(255,220,0); strokeWeight(2); noFill();
        line(sp1x,sp1y,sp2x,sp2y); line(sp2x,sp2y,sp3x,sp3y);
      }
    }

    // Rotated point - matches whichever skin the player has equipped,
    // scaled down to fit the paper's smaller marker (drawSkinnedFace's
    // own face is 30px across; this spot is 18px), so a rotation looks
    // like their own point turning, not a generic yellow placeholder.
    var rpSkin = PLAYER_SKINS[currentSkinIdx];
    noStroke(); fill(rpSkin.r,rpSkin.g,rpSkin.b,40); ellipse(rpx,rpy,27,27);
    push();
    translate(rpx,rpy);
    scale(0.6);
    drawSkinnedFace(0,0,rpSkin,"");
    pop();

    // Coordinate label — hidden in Geometry Genius
    if (gameMode!=="GEOMETRY") {
      var aLen=Math.sqrt((rpx-cx)*(rpx-cx)+(rpy-cy)*(rpy-cy));
      var aUX=aLen>0?(rpx-cx)/aLen:1, aUY=aLen>0?(rpy-cy)/aLen:0;
      var clx=Math.max(38,Math.min(362,rpx+aUX*48));
      var cly=Math.max(70,Math.min(376,rpy+aUY*48));
      fill(0,0,0,200); noStroke(); rect(clx-26,cly-8,52,16,4);
      fill(80,220,255); noStroke(); textSize(10); textAlign(CENTER,CENTER);
      var aGX=Math.round((rpx-ORIGIN_X)/CELL*10)/10;
      var aGY=Math.round((ORIGIN_Y-rpy)/CELL*10)/10;
      text("("+aGX+","+aGY+")",clx,cly);
    }

    // Angle arc — hidden in Geometry Genius
    var origAng=Math.atan2(ptPY,ptPX)*180/3.14159265;
    var sweep=-paperSignedAngle;
    if (gameMode!=="GEOMETRY") {
      noFill(); stroke(220,180,0); strokeWeight(3);
      for (var ai=0;ai<48;ai++) {
        var a1d=origAng+(sweep/48)*ai, a2d=origAng+(sweep/48)*(ai+1);
        line(cx+cos(a1d)*44,cy+sin(a1d)*44,cx+cos(a2d)*44,cy+sin(a2d)*44);
      }
    }

    // Degree label (hidden in GEOMETRY mode)
    if (showDeg) {
      var mDeg=origAng+sweep*0.5;
      var alx=Math.max(38,Math.min(362,cx+cos(mDeg)*66));
      var aly=Math.max(70,Math.min(376,cy+sin(mDeg)*66));
      fill(0,0,0,200); noStroke(); rect(alx-28,aly-9,56,18,6);
      fill(255,200,60); noStroke(); textSize(10); textAlign(CENTER,CENTER);
      var absDeg=Math.abs(Math.round(paperSignedAngle));
      var arcLbl=absDeg===0?"0°":paperSignedAngle>0?absDeg+"° CCW":absDeg+"° CW";
      text(arcLbl,alx,aly);
    }

    drawPencil(cx,cy);
    fill(255,60,60); noStroke(); ellipse(cx,cy,10,10);
    fill(255); ellipse(cx,cy,4,4);

    if (drawButton(8,350,130,26,"< Change Center",60,30,100)) {
      tracingPhase="PENCIL";
      pencilX=toPixelX(centerGX); pencilY=toPixelY(centerGY);
      pencilGX=centerGX; pencilGY=centerGY;
      centerSet=false; paperAngle=0; paperSignedAngle=0; paperDirection="CCW";
    }
  }
}

function confirmCenter(){
  centerGX=pencilGX; centerGY=pencilGY;
  pencilX=toPixelX(centerGX); pencilY=toPixelY(centerGY);
  centerSet=true; tracingPhase="PAPER";
  paperAngle=0; paperSignedAngle=0; paperSnappedAngle=0; paperDirection="CCW"; moveCooldown=0;
}

function drawButton(bx,by,bw,bh,lbl,r,g,b){
  var hov=(mouseX>=bx&&mouseX<=bx+bw&&mouseY>=by&&mouseY<=by+bh);
  fill(hov?r+40:r,hov?g+40:g,hov?b+40:b);
  stroke(Math.max(r-40,0),Math.max(g-40,0),Math.max(b-40,0)); strokeWeight(2);
  rect(bx,by,bw,bh,10);
  fill(255); noStroke(); textSize(11); textAlign(CENTER,CENTER);
  text(lbl,bx+bw/2,by+bh/2);
  return hov&&mouseWentDown("left");
}

function drawPencil(px,py){
  fill(60,50,40); noStroke(); triangle(px-3,py-4,px+3,py-4,px,py+2);
  fill(220,180,120); stroke(160,120,60); strokeWeight(1);
  quad(px-4,py-10,px+4,py-10,px+3,py-4,px-3,py-4);
  fill(255,210,40); stroke(180,140,0); strokeWeight(1); rect(px-6,py-38,12,28,1);
  stroke(200,160,0,160); strokeWeight(1);
  line(px-6,py-34,px+6,py-34); line(px-6,py-28,px+6,py-28);
  line(px-6,py-22,px+6,py-22); line(px-6,py-16,px+6,py-16);
  fill(190,195,200); stroke(140,145,150); strokeWeight(1); rect(px-6,py-42,12,6,1);
  stroke(230,235,240,180); strokeWeight(1); line(px-4,py-41,px+4,py-41);
  fill(255,150,160); stroke(200,100,120); strokeWeight(1); rect(px-5,py-50,10,10,2);
  fill(40,35,30); noStroke(); ellipse(px,py+1,3,3);
}

// ---------- DRAW GRID ----------
function drawGrid(){
  background(12,16,38);
  stroke(30,40,80); strokeWeight(1);
  for(var gx=GRID_MIN;gx<=GRID_MAX;gx++)
    line(toPixelX(gx),toPixelY(GRID_MIN),toPixelX(gx),toPixelY(GRID_MAX));
  for(var gy=GRID_MIN;gy<=GRID_MAX;gy++)
    line(toPixelX(GRID_MIN),toPixelY(gy),toPixelX(GRID_MAX),toPixelY(gy));

  if(gameMode!=="GEOMETRY"&&STATE!=="START"&&STATE!=="WIN"&&STATE!=="GAMEOVER"&&challengeOrder.length>0){
    var ch=curCh();
    if(ch&&(ch.type==="reflect_x"||ch.type==="reflect_y")){
      var pulse=(sin(frameCount*4)+1)/2;
      var gAlpha=Math.floor(20+pulse*200), cAlpha=Math.floor(100+pulse*155);
      var gW=6+pulse*14;
      if(ch.type==="reflect_x"){
        stroke(255,230,0,gAlpha); strokeWeight(gW);
        line(toPixelX(GRID_MIN),toPixelY(0),toPixelX(GRID_MAX),toPixelY(0));
        stroke(255,220,0,cAlpha); strokeWeight(3);
        line(toPixelX(GRID_MIN),toPixelY(0),toPixelX(GRID_MAX),toPixelY(0));
      }
      if(ch.type==="reflect_y"){
        stroke(255,230,0,gAlpha); strokeWeight(gW);
        line(toPixelX(0),toPixelY(GRID_MIN),toPixelX(0),toPixelY(GRID_MAX));
        stroke(255,220,0,cAlpha); strokeWeight(3);
        line(toPixelX(0),toPixelY(GRID_MIN),toPixelX(0),toPixelY(GRID_MAX));
      }
    }
    // Head-to-Head skips the tracing-paper mini-game for speed, so a
    // rotation question there gets no other visual aid at all - a giant
    // circle around the rotation center shows both players that the
    // correct answer must land SOMEWHERE on it (rotation preserves
    // distance from center), without giving away the exact angle.
    if(gameMode==="HEADTOHEAD"&&ch&&isRotation(ch)){
      var rcx=toPixelX(ch.cx), rcy=toPixelY(ch.cy);
      var rDist=Math.sqrt(Math.pow(startGX-ch.cx,2)+Math.pow(startGY-ch.cy,2));
      var rr=rDist*CELL;
      var rPulse=(sin(frameCount*4)+1)/2;
      noFill();
      stroke(255,230,0,Math.floor(30+rPulse*110)); strokeWeight(4+rPulse*5);
      ellipse(rcx,rcy,rr*2,rr*2);
      stroke(255,220,0,190); strokeWeight(2);
      ellipse(rcx,rcy,rr*2,rr*2);
    }
  }

  stroke(80,100,180); strokeWeight(2);
  line(toPixelX(GRID_MIN),toPixelY(0),toPixelX(GRID_MAX),toPixelY(0));
  line(toPixelX(0),toPixelY(GRID_MIN),toPixelX(0),toPixelY(GRID_MAX));
  fill(80,100,160); noStroke(); textSize(8); textAlign(CENTER,CENTER);
  for(var lx=GRID_MIN;lx<=GRID_MAX;lx++)
    if(lx!==0)text(lx,toPixelX(lx),toPixelY(0)+11);
  textAlign(RIGHT,CENTER);
  for(var ly=GRID_MIN;ly<=GRID_MAX;ly++)
    if(ly!==0)text(ly,toPixelX(0)-5,toPixelY(ly));
  textSize(10); textAlign(CENTER,CENTER);
  text("x",toPixelX(GRID_MAX)+10,toPixelY(0));
  text("y",toPixelX(0)+14,toPixelY(GRID_MAX)+12);
}

// Only Practice needs extra HUD height (for its mastery bar) - coins and
// streak now live INLINE in the challenge label row for every mode, so
// they no longer need a row of their own. Shared with drawTracingPaper's
// PENCIL-phase banner so nothing it draws ever starts above where the
// HUD (whichever height applies) actually ends.
function hudHeight() { return gameMode==="PRACTICE" ? 76 : 62; }

// ---------- HUD ----------
function drawHUD(){
  var hudH = hudHeight();
  fill(8,12,30); noStroke(); rect(0,0,400,hudH);
  stroke(40,60,120); strokeWeight(1); line(0,hudH,400,hudH);

  // Three equal pills centered across the full width
  // Layout: |8px| pill1(118) |15px| pill2(118) |15px| pill3(118) |8px|
  var pY=4, pH=22, pW=118, pCY=15;
  noStroke(); textAlign(CENTER,CENTER);

  if(gameMode==="HEADTOHEAD"){
    fill(55,10,10);    rect(8,  pY,pW,pH,7);
    fill(255,100,100); textSize(12); text("P1: "+p1wins+" wins",  67, pCY);
    fill(20,20,50);    rect(141,pY,pW,pH,7);
    fill(210,210,255); textSize(12); text("Round "+(round+1)+" / "+TOTAL_ROUNDS, 200,pCY);
    fill(10,10,55);    rect(274,pY,pW,pH,7);
    fill(100,160,255); textSize(12); text("P2: "+p2wins+" wins",  333,pCY);
  } else if(gameMode==="PRACTICE"){
    fill(topicR,topicG,topicB,200); rect(8,  pY,pW,pH,7);
    fill(255);         textSize(13); text(topicLabel,             67, pCY);
    fill(50,38,0);     rect(141,pY,pW,pH,7);
    fill(255,210,60);  textSize(13); text("Q #"+practiceQNum, 200,pCY);
    // Pill 3: active skills indicator (no timer)
    var skStr=(skillTranslations?"T ":"")+(skillRotations?"R ":"")+(skillReflections?"F":"");
    fill(20,0,40);     rect(274,pY,pW,pH,7);
    fill(200,160,255); textSize(11); text("Skills: "+skStr.trim(), 333,pCY);
  } else {
    // Pill 1: Transformation type (topic colour background)
    fill(topicR,topicG,topicB,200); rect(8,  pY,pW,pH,7);
    fill(255);         textSize(13); text(topicLabel,             67, pCY);
    // Pill 2: Round number
    fill(50,38,0);     rect(141,pY,pW,pH,7);
    fill(255,210,60);  textSize(13); text("Round "+(round+1)+" / "+TOTAL_ROUNDS, 200,pCY);
    // Pill 3: Timer
    var te=(timerFinished>0?timerFinished:(Date.now()-timerStart)/1000);
    fill(0,25,50);     rect(274,pY,pW,pH,7);
    fill(0,220,255);   textSize(13); text(te.toFixed(2)+" s",     333,pCY);
  }

  // Challenge label row - coins on the left, streak on the right, the
  // challenge text itself centered in the narrower space between them
  // (every mode except Head-to-Head, which doesn't track either).
  fill(20,35,90); noStroke(); rect(8,28,384,28,6);
  fill(255,255,255); textAlign(CENTER,CENTER);
  if (gameMode!=="HEADTOHEAD") {
    fitText(challengeLabel,200,43,250,13);
    drawCoinLabel(30, 43, coins, 12);
    if (currentStreak>=2) {
      noStroke(); textAlign(CENTER,CENTER);
      fill(255,140,60); textSize(12);
      text("🔥"+currentStreak, 370, 43);
    }
    if (coinPopup>0) {
      var popT=coinPopup/60;
      fill(255,220,80,Math.floor(255*popT)); noStroke(); textAlign(CENTER,CENTER);
      textSize(10+Math.floor((1-popT)*3));
      text("+1!", 30, 43-14-(1-popT)*6);
      coinPopup--;
    }
  } else {
    fitText(challengeLabel,200,43,364,13);
  }

  // Practice mastery bar - the one extra row hudHeight() makes room for
  if (gameMode==="PRACTICE") {
    var mbX=40, mbY=62, mbW=320, mbH=10;
    fill(20,25,45); noStroke(); rect(mbX,mbY,mbW,mbH,5);
    var mbFillW=mbW*(practiceMastery/100);
    var mbCol = practiceMastery>=50 ? color(255,200,60) : color(90,180,255);
    fill(mbCol); rect(mbX,mbY,mbFillW,mbH,5);
    noFill(); stroke(80,100,150); strokeWeight(1); rect(mbX,mbY,mbW,mbH,5);
    fill(200,215,255); noStroke(); textSize(8); textAlign(CENTER,CENTER);
    text(practiceMastery>=50?"MASTERY "+practiceMastery+"% — harder questions unlocked!":"MASTERY "+practiceMastery+"%", 200, mbY+mbH/2);
  }

  // Bottom bar
  fill(8,12,30); noStroke(); rect(0,376,400,24);
  stroke(40,55,110); strokeWeight(1); line(0,376,400,376);

  if(STATE==="MOVING"){
    fill(140,160,220); textSize(9); textAlign(CENTER,CENTER); noStroke();
    var ch=curCh();
    // MENU button always visible — shift hint text right so it doesn't overlap
    var hintCX = 235;
    if(gameMode==="HEADTOHEAD"){
      text("P1: Arrows + Enter   |   P2: WASD + Space",200,388);
    } else if(isRotation(ch)&&tracingPhase==="PAPER"){
      if(gameMode!=="GEOMETRY") text("UP=CCW  DOWN=CW  |  SPACE: submit",hintCX,388);
      else text("SPACE: submit answer",hintCX,388);
    } else if(isRotation(ch)&&tracingPhase==="PENCIL"){
      text("Arrow keys: move pencil  |  SPACE: confirm center",hintCX,388);
    } else {
      text("Arrow keys: move  |  SPACE: submit",hintCX,388);
    }
  }

  // MENU button — bottom-left corner, all modes
  if(STATE==="SHOWING"||STATE==="MOVING"||STATE==="FEEDBACK"){
    var mbHov=(mouseX>=5&&mouseX<=61&&mouseY>=379&&mouseY<=395);
    fill(mbHov?110:65,mbHov?55:35,mbHov?155:110);
    stroke(120,70,180); strokeWeight(1); rect(5,379,56,16,6);
    fill(255); noStroke(); textSize(9); textAlign(CENTER,CENTER);
    text("MENU",33,388);
    if(mbHov&&mouseWentDown("left")) STATE="START";
  }
}

// ---------- DRAW HELPERS ----------
function drawStartMarker(){
  if (geomShapeType!==""&&gameMode==="GEOMETRY") {
    // Show shape at start position (dim outline + per-vertex rings)
    var all=[{ox:0,oy:0}].concat(geomShapeOffsets);
    var n=all.length;
    var pv=[];
    for(var i=0;i<n;i++) pv.push({x:toPixelX(startGX+all[i].ox),y:toPixelY(startGY+all[i].oy)});
    noFill(); stroke(150,180,255,80); strokeWeight(1);
    if(n===3){triangle(pv[0].x,pv[0].y,pv[1].x,pv[1].y,pv[2].x,pv[2].y);}
    else     {quad(pv[0].x,pv[0].y,pv[1].x,pv[1].y,pv[2].x,pv[2].y,pv[3].x,pv[3].y);}
    for(var i=0;i<n;i++){
      var c=SHAPE_COLORS[i%4];
      noFill(); stroke(c[0],c[1],c[2],90); strokeWeight(1); ellipse(pv[i].x,pv[i].y,24,24);
      fill(c[0],c[1],c[2],160); noStroke(); textSize(9); textAlign(CENTER,BOTTOM);
      text("("+(startGX+all[i].ox)+", "+(startGY+all[i].oy)+")",pv[i].x,pv[i].y-14);
    }
    return;
  }
  var px=toPixelX(startGX),py=toPixelY(startGY);
  noFill(); stroke(150,180,255); strokeWeight(1); ellipse(px,py,28,28);
  fill(150,180,255); noStroke(); textSize(9); textAlign(CENTER,BOTTOM);
  text("("+startGX+", "+startGY+")",px,py-16);
}

function drawFaceAt(px,py,fr,fg,fb,label){
  fill(fr,fg,fb); stroke(Math.max(fr-60,0),Math.max(fg-60,0),Math.max(fb-60,0));
  strokeWeight(2); ellipse(px,py,30,30);
  fill(30,30,80); noStroke();
  ellipse(px-6,py-4,5,5); ellipse(px+6,py-4,5,5);
  fill(255); ellipse(px-5,py-5,2,2); ellipse(px+7,py-5,2,2);
  stroke(30,30,80); strokeWeight(2); noFill();
  for(var si=0;si<12;si++){
    var a1=25+(130/12)*si, a2=25+(130/12)*(si+1);
    line(px+cos(a1)*8,py+2+sin(a1)*6,px+cos(a2)*8,py+2+sin(a2)*6);
  }
  // Coord label
  var tw=label.length*6+8;
  var labelAbove=(py-38>66);
  var tagY=labelAbove?py-38:py+26;
  var textY=labelAbove?py-25:py+39;
  fill(0,0,0); noStroke(); rect(px-tw/2,tagY,tw,14,4);
  fill(80,220,255); textSize(9); textAlign(CENTER,BOTTOM); text(label,px,textY);
}

// Draws the equipped skin's face plus its own extra flourish (see the
// `style` field on PLAYER_SKINS) - the base anatomy matches drawFaceAt
// exactly so the coordinate label positioning stays identical; only the
// decoration drawn behind/on/around it differs per skin.
function drawSkinnedFace(px, py, skin, label) {
  var fr=skin.r, fg=skin.g, fb=skin.b, style=skin.style||"plain";

  // ---- Behind the face ----
  if (style==="halo") {
    // Pulses close against the face's own 30px edge (34-38px diameter)
    // instead of floating well outside it (was 44-50px).
    var haloPulse=(sin(frameCount*3)+1)/2;
    noFill(); stroke(200,240,255,Math.floor(120+haloPulse*100)); strokeWeight(3);
    ellipse(px,py,34+haloPulse*4,34+haloPulse*4);
  }
  if (style==="fire") {
    noStroke();
    for (var fi=0; fi<10; fi++){
      var fa=fi*36+frameCount*2;
      var flick=(sin(frameCount*8+fi)+1)/2;
      fill(255,120+flick*80,30,200);
      var fx1=px+cos(fa)*13, fy1=py+sin(fa)*13;
      var fx2=px+cos(fa)*(19+flick*6), fy2=py+sin(fa)*(19+flick*6);
      triangle(fx1+cos(fa+90)*3,fy1+sin(fa+90)*3, fx1+cos(fa-90)*3,fy1+sin(fa-90)*3, fx2,fy2);
    }
  }
  if (style==="galaxy") {
    noStroke();
    for (var gi=0; gi<8; gi++){
      var ga=gi*45+frameCount;
      fill(255,255,255,150); ellipse(px+cos(ga)*15,py+sin(ga)*15,2,2);
    }
  }
  if (style==="rainbow") {
    // One fixed ring right at the face's own edge (30px face -> 36px
    // ring), not six growing rings spiraling outward - the colors cycle
    // which segment they're in, but the ring itself never moves.
    noFill(); strokeWeight(3);
    var rbColors=[[255,80,80],[255,180,60],[255,240,80],[100,220,120],[100,180,255],[180,120,255]];
    var ringD=36;
    for (var rbi=0;rbi<6;rbi++){
      var rc=rbColors[(rbi+Math.floor(frameCount/6))%6];
      stroke(rc[0],rc[1],rc[2],220);
      arc(px,py,ringD,ringD, rbi*60, rbi*60+62);
    }
  }

  // ---- Base face ----
  if (style==="gradient") {
    // A true radial gradient centered exactly on (px,py) - the old
    // version faked a "glow" with a second circle offset a few pixels
    // down-right, which read as off-center and made it harder to tell
    // exactly which grid point the marker was sitting on.
    noStroke();
    var grad = drawingContext.createRadialGradient(px,py,2, px,py,15);
    grad.addColorStop(0, 'rgb('+Math.min(255,fr+60)+','+Math.min(255,fg+70)+','+Math.min(255,fb+60)+')');
    grad.addColorStop(1, 'rgb('+fr+','+fg+','+fb+')');
    drawingContext.fillStyle = grad;
    drawingContext.beginPath();
    drawingContext.arc(px,py,15,0,Math.PI*2);
    drawingContext.fill();
    noFill(); stroke(Math.max(fr-60,0),Math.max(fg-60,0),Math.max(fb-60,0)); strokeWeight(2);
    ellipse(px,py,30,30);
  } else {
    fill(fr,fg,fb); stroke(Math.max(fr-60,0),Math.max(fg-60,0),Math.max(fb-60,0));
    strokeWeight(2); ellipse(px,py,30,30);
  }
  if (style==="spots") {
    noStroke(); fill(Math.max(fr-80,0),Math.max(fg-80,0),Math.max(fb-80,0),170);
    ellipse(px-7,py-8,5,5); ellipse(px+6,py+7,4,4); ellipse(px-4,py+8,3,3); ellipse(px+8,py-6,3,3);
  }
  if (style==="stripes") {
    stroke(Math.max(fr-90,0),Math.max(fg-90,0),Math.max(fb-90,0),150); strokeWeight(2);
    line(px-13,py-8,px+2,py+13); line(px-6,py-13,px+9,py+8); line(px+1,py-13,px+13,py+2);
  }

  // ---- Face features ----
  noStroke();
  if (style==="robot") {
    fill(30,30,40); rect(px-9,py-6,6,5,1); rect(px+3,py-6,6,5,1);
    fill(120,220,255); rect(px-8,py-5,4,3,1); rect(px+4,py-5,4,3,1);
    stroke(Math.max(fr-60,0),Math.max(fg-60,0),Math.max(fb-60,0)); strokeWeight(2); noFill();
    line(px,py-15,px,py-19);
    noStroke(); fill(255,60,60); ellipse(px,py-20,4,4);
    stroke(60,60,70); strokeWeight(1.5); noFill(); line(px-6,py+4,px+6,py+4);
  } else if (style==="alien") {
    fill(20,50,20); ellipse(px-6,py-3,7,9); ellipse(px+6,py-3,7,9);
    fill(255,255,255,220); ellipse(px-6,py-4,2,2); ellipse(px+6,py-4,2,2);
    stroke(Math.max(fr-60,0),Math.max(fg-60,0),Math.max(fb-60,0)); strokeWeight(2);
    line(px-4,py-15,px-7,py-20); line(px+4,py-15,px+7,py-20);
    noStroke(); fill(255,220,80); ellipse(px-7,py-21,3,3); ellipse(px+7,py-21,3,3);
    stroke(30,60,30); strokeWeight(1.5); noFill(); line(px-4,py+5,px+4,py+5);
  } else if (style==="sunglasses") {
    fill(20,20,25); rect(px-11,py-6,9,6,2); rect(px+2,py-6,9,6,2);
    fill(230,240,255,90); rect(px-10,py-5,7,3,1); rect(px+3,py-5,7,3,1);
    stroke(20,20,25); strokeWeight(2); line(px-2,py-4,px+2,py-4);
    stroke(30,30,80); strokeWeight(1); noFill();
    for(var smi=0;smi<10;smi++){ var sma1=25+(130/10)*smi, sma2=25+(130/10)*(smi+1);
      line(px+cos(sma1)*5,py+1.5+sin(sma1)*3.5,px+cos(sma2)*5,py+1.5+sin(sma2)*3.5); }
  } else {
    fill(30,30,80);
    ellipse(px-3.5,py-2.5,3,3); ellipse(px+3.5,py-2.5,3,3);
    fill(255); ellipse(px-3,py-3,1,1); ellipse(px+4,py-3,1,1);
    stroke(30,30,80); strokeWeight(1); noFill();
    for(var msi=0;msi<10;msi++){ var ma1=25+(130/10)*msi, ma2=25+(130/10)*(msi+1);
      line(px+cos(ma1)*5,py+1.5+sin(ma1)*3.5,px+cos(ma2)*5,py+1.5+sin(ma2)*3.5); }
  }

  // ---- On top of the face ----
  if (style==="sparkle") {
    textAlign(CENTER,CENTER); textSize(10); noStroke();
    for (var spi=0; spi<3; spi++){
      var sang=spi*120+frameCount*4;
      var srad=17+sin(frameCount*6+spi)*2;
      fill(255,255,255,200);
      text("✦",px+cos(sang)*srad,py+sin(sang)*srad);
    }
  }
  if (style==="crown") {
    fill(255,215,0); stroke(200,160,0); strokeWeight(1);
    triangle(px-9,py-15, px-9,py-24, px-4,py-17);
    triangle(px-4,py-17, px,py-26, px+4,py-17);
    triangle(px+4,py-17, px+9,py-24, px+9,py-15);
    rect(px-9,py-15,18,4,1);
  }

  // ---- Coordinate label (same as drawFaceAt) - skipped when label is empty ----
  if (label) {
    var tw=label.length*6+8;
    var labelAbove=(py-38>66);
    var tagY=labelAbove?py-38:py+26;
    var textY=labelAbove?py-25:py+39;
    fill(0,0,0); noStroke(); rect(px-tw/2,tagY,tw,14,4);
    fill(80,220,255); textSize(9); textAlign(CENTER,BOTTOM); text(label,px,textY);
  }
}

function drawPlayer(){
  if (gameMode==="GEOMETRY"&&geomShapeType!=="") {
    drawGeomShape(playerPX,playerPY,true);
    return;
  }
  var px,py,gx,gy;
  if(gameMode==="GEOMETRY"){
    px=playerPX; py=playerPY;
    gx=toGridX(playerPX); gy=toGridY(playerPY);
  } else {
    px=toPixelX(playerGX); py=toPixelY(playerGY);
    gx=playerGX; gy=playerGY;
  }
  var sk=PLAYER_SKINS[currentSkinIdx];
  drawSkinnedFace(px,py,sk,"("+gx+", "+gy+")");
}

function drawTarget(){
  if (geomShapeType!==""&&gameMode==="GEOMETRY") {
    var all=[{ox:0,oy:0}].concat(geomShapeOffsets);
    var n=all.length;
    var pv=[];
    for(var i=0;i<n;i++) pv.push({x:toPixelX(targetGX+all[i].ox),y:toPixelY(targetGY+all[i].oy)});
    var pulse=abs(sin(frameCount*0.1))*6;
    noFill(); stroke(255,220,0,200); strokeWeight(2+pulse/4);
    if(n===3){triangle(pv[0].x,pv[0].y,pv[1].x,pv[1].y,pv[2].x,pv[2].y);}
    else     {quad(pv[0].x,pv[0].y,pv[1].x,pv[1].y,pv[2].x,pv[2].y,pv[3].x,pv[3].y);}
    for(var i=0;i<n;i++){
      var c=SHAPE_COLORS[i%4];
      noFill(); stroke(c[0],c[1],c[2]); strokeWeight(2); ellipse(pv[i].x,pv[i].y,30+pulse,30+pulse);
      fill(c[0],c[1],c[2]); noStroke(); textSize(9); textAlign(CENTER,BOTTOM);
      text("("+(targetGX+all[i].ox)+", "+(targetGY+all[i].oy)+")",pv[i].x,pv[i].y-16);
    }
    return;
  }
  var px=toPixelX(targetGX),py=toPixelY(targetGY);
  var pulse=abs(sin(frameCount*0.1))*8;
  noFill(); stroke(255,220,0); strokeWeight(2); ellipse(px,py,30+pulse,30+pulse);
  fill(255,220,0); noStroke(); textSize(9); textAlign(CENTER,BOTTOM);
  text("("+targetGX+", "+targetGY+")",px,py-16);
}

function drawLockedMarker(){
  if (geomShapeType!==""&&gameMode==="GEOMETRY") {
    var all=[{ox:0,oy:0}].concat(geomShapeOffsets);
    var n=all.length;
    var pv=[];
    for(var i=0;i<n;i++) pv.push({x:toPixelX(lockedGX+all[i].ox),y:toPixelY(lockedGY+all[i].oy)});
    // Shape outline at locked position
    if(feedbackCorrect){stroke(0,255,120);}else{stroke(255,60,60);}
    noFill(); strokeWeight(3);
    if(n===3){triangle(pv[0].x,pv[0].y,pv[1].x,pv[1].y,pv[2].x,pv[2].y);}
    else     {quad(pv[0].x,pv[0].y,pv[1].x,pv[1].y,pv[2].x,pv[2].y,pv[3].x,pv[3].y);}
    // Dot at each vertex
    for(var i=0;i<n;i++){
      if(feedbackCorrect){fill(0,255,120);}else{fill(255,60,60);}
      stroke(255); strokeWeight(2); ellipse(pv[i].x,pv[i].y,20,20);
    }
    return;
  }
  var px=toPixelX(lockedGX),py=toPixelY(lockedGY);
  if(feedbackCorrect){fill(0,255,120);}else{fill(255,60,60);}
  stroke(255); strokeWeight(2); ellipse(px,py,22,22);
}

// Demonstrates the CORRECT transformation after a wrong answer, before
// the retry. A translation slides axis-aligned only - never diagonally -
// moving horizontally first and then vertically, in the same (x, y)
// order the algebra is written in. A reflection instead scales the
// marker through zero across the reflection axis so it reads as the
// point actually flipping over that line, like a card turning on a
// hinge - the position itself already moves in a straight line
// perpendicular to the axis for a reflection (only one coordinate ever
// changes), so the flip-scale is what turns that plain slide into
// something that visibly reads as "flipping," not just "sliding."
function drawAnswerDemo(){
  var t = constrain((frameCount-demoStartFrame)/DEMO_DURATION, 0, 1);
  var ch = curCh();
  var gx, gy, flipSX=1, flipSY=1;

  if (ch.type==="reflect_x" || ch.type==="reflect_y") {
    var eased = t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
    gx = startGX+(targetGX-startGX)*eased;
    gy = startGY+(targetGY-startGY)*eased;
    var flip = cos(t*180); // 1 -> 0 (edge-on, right at the axis) -> -1 (fully flipped over)
    if (ch.type==="reflect_x") flipSY = flip; else flipSX = flip;
  } else {
    // Translation: horizontal leg first (x: start -> target), then
    // vertical leg second (y: start -> target) - an L-shaped path, each
    // leg independently eased so the direction change at the elbow
    // doesn't read as a sudden jump in speed.
    var segT = t*2;
    if (segT < 1) {
      var e1 = segT<0.5 ? 2*segT*segT : 1-Math.pow(-2*segT+2,2)/2;
      gx = startGX+(targetGX-startGX)*e1;
      gy = startGY;
    } else {
      var lt = segT-1;
      var e2 = lt<0.5 ? 2*lt*lt : 1-Math.pow(-2*lt+2,2)/2;
      gx = targetGX;
      gy = startGY+(targetGY-startGY)*e2;
    }
  }

  var px = toPixelX(gx), py = toPixelY(gy);
  var sk = PLAYER_SKINS[currentSkinIdx];
  if (flipSX!==1 || flipSY!==1) {
    push();
    translate(px,py);
    scale(flipSX, flipSY);
    drawSkinnedFace(0,0,sk,"("+Math.round(gx)+", "+Math.round(gy)+")");
    pop();
  } else {
    drawSkinnedFace(px,py,sk,"("+Math.round(gx)+", "+Math.round(gy)+")");
  }
}

// The demo's target sweep for each rotation type, in the same signed
// (positive = CCW, negative = CW) convention paperSignedAngle already
// uses - see getTracingAnswer's own comment for the derivation. 180 is
// swept CCW by convention; a half-turn looks identical either way.
function rotationDemoSweep(ch) {
  if (ch.type==="rot90ccw")  return 90;
  if (ch.type==="rot90cw")   return -90;
  if (ch.type==="rot180")    return 180;
  if (ch.type==="rot270ccw") return 270;
  if (ch.type==="rot270cw")  return -270;
  if (ch.type==="rot360")    return 360;
  return 0;
}

// Replays the CORRECT rotation on the very same tracing-paper visual
// the player just used to answer - reuses drawTracingPaper() wholesale
// by driving its paperAngle/paperSignedAngle state programmatically
// (sweeping 0 -> the real answer's angle) instead of from player input,
// so the player watches the point actually rotate around the center
// instead of only reading the correct final coordinates. Safe to
// overwrite centerGX/GY and paperPointGX/GY here - resetRound()/
// loadRound() fully reinitialize all of this before the player's next
// real attempt either way.
function drawRotationAnswerDemo(){
  var ch = curCh();
  var t = constrain((frameCount-demoStartFrame)/ROTATION_DEMO_DURATION, 0, 1);
  var eased = t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
  centerGX = ch.cx; centerGY = ch.cy;
  paperPointGX = startGX; paperPointGY = startGY;
  paperSignedAngle = rotationDemoSweep(ch) * eased;
  paperAngle = ((paperSignedAngle % 360) + 360) % 360;
  tracingPhase = "PAPER";
  drawTracingPaper();
}

function drawPracticeHintGraphic(hintType, yShift) {
  yShift = yShift || 0;
  push(); translate(0, yShift);
  // CW / CCW diagram
  if (hintType==="cwccw") {
    var hy=262;
    fill(255,200,60); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("You rotated the right amount but the wrong direction!",200,197);

    // --- CW side (left): full circle + arrow at TOP pointing RIGHT + arrow at BOTTOM pointing LEFT ---
    var lcx=110, lcy=hy, lr=40;
    fill(50,20,0,180); noStroke(); ellipse(lcx,lcy,lr*2+18,lr*2+18);
    noFill(); stroke(255,140,60); strokeWeight(3); ellipse(lcx,lcy,lr*2,lr*2);
    // Arrow at top (-90°): CW tangent = RIGHT (0°)
    var cwTopX=lcx+cos(-90)*lr, cwTopY=lcy+sin(-90)*lr;
    fill(255,120,50); noStroke();
    triangle(cwTopX,cwTopY,
             cwTopX+cos(150)*12, cwTopY+sin(150)*12,
             cwTopX+cos(-150)*12,cwTopY+sin(-150)*12);
    // Arrow at bottom (90°): CW tangent = LEFT (180°)
    var cwBotX=lcx+cos(90)*lr, cwBotY=lcy+sin(90)*lr;
    fill(255,120,50); noStroke();
    triangle(cwBotX,cwBotY,
             cwBotX+cos(330)*12, cwBotY+sin(330)*12,
             cwBotX+cos(30)*12,  cwBotY+sin(30)*12);
    fill(255,180,60); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("CW",lcx,lcy);
    fill(255,140,60); textSize(12);
    text("Clockwise",lcx,lcy+lr+15);
    text("(like a clock)",lcx,lcy+lr+29);

    // --- CCW side (right): full circle + arrow at TOP pointing LEFT + arrow at BOTTOM pointing RIGHT ---
    var rcx=290, rcy=hy, rr=40;
    fill(0,20,60,180); noStroke(); ellipse(rcx,rcy,rr*2+18,rr*2+18);
    noFill(); stroke(100,180,255); strokeWeight(3); ellipse(rcx,rcy,rr*2,rr*2);
    // Arrow at top (-90°): CCW tangent = LEFT (180°)
    var ccwTopX=rcx+cos(-90)*rr, ccwTopY=rcy+sin(-90)*rr;
    fill(100,180,255); noStroke();
    triangle(ccwTopX,ccwTopY,
             ccwTopX+cos(330)*12, ccwTopY+sin(330)*12,
             ccwTopX+cos(30)*12,  ccwTopY+sin(30)*12);
    // Arrow at bottom (90°): CCW tangent = RIGHT (0°)
    var ccwBotX=rcx+cos(90)*rr, ccwBotY=rcy+sin(90)*rr;
    fill(100,180,255); noStroke();
    triangle(ccwBotX,ccwBotY,
             ccwBotX+cos(150)*12, ccwBotY+sin(150)*12,
             ccwBotX+cos(-150)*12,ccwBotY+sin(-150)*12);
    fill(160,210,255); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("CCW",rcx,rcy);
    fill(100,180,255); textSize(12);
    text("Counter-Clockwise",rcx,rcy+rr+15);
    text("(opposite of clock)",rcx,rcy+rr+29);
  }

  // Wrong degree amount diagram
  if (hintType==="degrees") {
    fill(220,220,255); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("Each 90° = one right-angle turn.",200,198);

    // Diagram: center + 4 arms at 90° intervals, showing 0°=start, 90°, 180°, 270°
    // - matching the CURRENT question's actual turn direction, not always
    // clockwise, so a CCW question's diagram doesn't mislabel which way
    // 90/180/270 actually go.
    var degCh=curCh();
    var isCCWDeg=(degCh.type==="rot90ccw"||degCh.type==="rot270ccw");
    var dcx=200, dcy=287, dr=48;
    // Arms - screen angles: -90=up, 0=right, 90=down, 180=left. Start is
    // always up; CW then goes up->right->down->left, CCW up->left->down->right.
    var armAngles = isCCWDeg ? [-90,180,90,0] : [-90,0,90,180];
    var armLabels=["Start: 0°","90°","180°","270°"];
    var armColors=[[180,180,220],[100,220,120],[255,180,60],[220,100,100]];
    for(var ri=0;ri<4;ri++){
      stroke(armColors[ri][0],armColors[ri][1],armColors[ri][2]); strokeWeight(2.5);
      var ax=dcx+cos(armAngles[ri])*dr, ay=dcy+sin(armAngles[ri])*dr;
      line(dcx,dcy,ax,ay);
      fill(armColors[ri][0],armColors[ri][1],armColors[ri][2]); noStroke();
      ellipse(ax,ay,8,8);
      textSize(11); textAlign(CENTER,CENTER);
      // Label pushed further out along the same direction as its own arm,
      // so it reads correctly regardless of which side that arm ends up on.
      text(armLabels[ri],ax+cos(armAngles[ri])*14,ay+sin(armAngles[ri])*14);
    }
    fill(80,80,140); noStroke(); ellipse(dcx,dcy,10,10);
  }

  // rotation_other
  if (hintType==="rotation_other") {
    fill(255,200,60); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("Make sure you set the center of rotation first,",200,210);
    text("then rotate the paper until the point hits the target!",200,228);
  }

  // ---- REFLECTION HINTS ----
  if (hintType==="reflect_wrong_axis") {
    var ch2=curCh();
    var correctAxis=(ch2.type==="reflect_x")?"x-axis":"y-axis";
    var wrongAxis  =(ch2.type==="reflect_x")?"y-axis":"x-axis";
    fill(255,100,100); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("You reflected over the "+wrongAxis+"!",200,200);
    fill(255,200,60); textSize(12);
    text("This question asks you to reflect over the "+correctAxis+".",200,218);
    // Mini axis diagram
    var axcx=200, axcy=272, axr=34;
    stroke(80,80,80); strokeWeight(1);
    line(axcx-axr-14,axcy,axcx+axr+14,axcy);
    line(axcx,axcy-axr-14,axcx,axcy+axr+14);
    if(ch2.type==="reflect_x"){
      stroke(100,220,255); strokeWeight(3); line(axcx-axr,axcy,axcx+axr,axcy);
      fill(100,220,255); noStroke(); textSize(10); text("x-axis ← reflect over this!",axcx,axcy+axr+16);
      fill(180,80,80); textSize(10); text("y-axis",axcx+axr+18,axcy-7);
    } else {
      stroke(100,220,255); strokeWeight(3); line(axcx,axcy-axr,axcx,axcy+axr);
      fill(100,220,255); noStroke(); textSize(10); text("y-axis ← reflect over this!",axcx,axcy-axr-12);
      fill(180,80,80); textSize(10); text("x-axis",axcx+axr+18,axcy-7);
    }
    fill(255,220,60); noStroke(); ellipse(axcx-16,axcy-16,7,7);
    fill(255,220,60); textSize(9); text("you",axcx-16,axcy-26);
  }

  if (hintType==="reflect_no_move") {
    fill(255,200,60); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("You didn't move!",200,205);
    fill(220,220,255); textSize(12);
    text("Reflecting means flipping the point across the axis.",200,224);
    text("Move to the other side and submit.",200,242);
  }

  if (hintType==="reflect_other") {
    fill(255,200,60); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("Reflecting flips the point straight across the axis.",200,210);
    fill(220,220,255); textSize(12);
    text("Only one coordinate changes — the other stays the same.",200,229);
  }

  // ---- TRANSLATION HINTS ----
  if (hintType==="translate_negated") {
    fill(255,100,100); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("You went the exact OPPOSITE direction!",200,205);
    fill(255,200,60); textSize(12);
    text("+ x means RIGHT,  − x means LEFT",200,226);
    text("+ y means UP,  − y means DOWN",200,244);
  }

  if (hintType==="translate_wrong_x") {
    var ch3=curCh();
    var xDir=(ch3.dx>0)?"right":"left";
    fill(255,150,80); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("Your left/right direction was wrong!",200,205);
    fill(255,200,60); textSize(12);
    text("The x value "+(ch3.dx>0?"+":"−")+Math.abs(ch3.dx)+" means "+(Math.abs(ch3.dx)===1?"1 unit":Math.abs(ch3.dx)+" units")+" "+xDir+".",200,226);
    text("Positive x (+) = RIGHT,  Negative x (−) = LEFT",200,244);
  }

  if (hintType==="translate_wrong_y") {
    var ch4=curCh();
    var yDir=(ch4.dy>0)?"up":"down";
    fill(255,150,80); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("Your up/down direction was wrong!",200,205);
    fill(255,200,60); textSize(12);
    text("The y value "+(ch4.dy>0?"+":"−")+Math.abs(ch4.dy)+" means "+(Math.abs(ch4.dy)===1?"1 unit":Math.abs(ch4.dy)+" units")+" "+yDir+".",200,226);
    text("Positive y (+) = UP,  Negative y (−) = DOWN",200,244);
  }

  if (hintType==="translate_missing_y") {
    fill(255,200,60); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("You only moved left/right!",200,205);
    fill(220,220,255); textSize(12);
    text("Don't forget to also move up or down.",200,226);
    text("Translations move BOTH x and y.",200,244);
  }

  if (hintType==="translate_missing_x") {
    fill(255,200,60); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("You only moved up/down!",200,205);
    fill(220,220,255); textSize(12);
    text("Don't forget to also move left or right.",200,226);
    text("Translations move BOTH x and y.",200,244);
  }

  if (hintType==="translate_swapped") {
    fill(255,150,80); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("You swapped the x and y values!",200,205);
    fill(255,200,60); textSize(12);
    text("The FIRST number (x) = move LEFT or RIGHT.",200,226);
    text("The SECOND number (y) = move UP or DOWN.",200,244);
  }

  if (hintType==="translate_no_move") {
    fill(255,200,60); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("You didn't move!",200,210);
    fill(220,220,255); textSize(12);
    text("Use the arrow keys to slide the point.",200,231);
  }

  if (hintType==="translate_other") {
    fill(255,200,60); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("Count the units carefully!",200,210);
    fill(220,220,255); textSize(12);
    text("Move exactly the right amount in each direction.",200,229);
  }

  if (hintType==="generic") {
    fill(255,200,60); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("Review the challenge label and try again!",200,218);
  }
  pop();
}

function drawFeedback(){
  var diagramHints={"cwccw":1,"degrees":1,"reflect_wrong_axis":1};
  // Show hint graphic: always for rotation errors; for PRACTICE on all wrong types
  var showRotHint = !feedbackCorrect && isRotation(curCh()) && practiceHintType!=="";
  var hasHint = showRotHint || (gameMode==="PRACTICE"&&!feedbackCorrect&&practiceHintType!=="");
  // A rot360 question answered by not turning the paper at all - 0° and
  // 360° are the same rotation, so this is fully correct, not a fluke.
  var isZeroFor360 = feedbackCorrect && curCh().type==="rot360" && Math.round(paperSignedAngle/90)*90===0;

  // All cards share the same width; heights are chosen so the card stays within y=60..375.
  // Center of available space = (60+375)/2 = 217.5 → 218.
  var cardW=340, cardH;
  if     (hasHint&&diagramHints[practiceHintType])  cardH=310; // top≈63  bottom≈373
  else if(hasHint)                                  cardH=260; // top≈88  bottom≈348
  else if(gameMode==="HEADTOHEAD")                  cardH=240; // top≈98  bottom≈338
  else if(feedbackCorrect&&(equivalentRotation||isZeroFor360)) cardH=240; // top≈98  bottom≈338
  else if(feedbackCorrect)                          cardH=200; // top≈118 bottom≈318
  else                                              cardH=210; // top≈113 bottom≈323

  var cardX=Math.round(200-cardW/2);   // = 30
  var cardY=Math.round(218-cardH/2);
  var cx=200;
  var bw=cardW-32; // 16 px buffer each side

  // Semi-transparent card — low alpha so grid/answer dots show through
  fill(0,0,0,45); noStroke(); rect(cardX+4,cardY+4,cardW,cardH,14);
  if(feedbackCorrect){fill(0,130,60,115);stroke(0,220,120);}
  else               {fill(130,20,20,115);stroke(220,60,60);}
  strokeWeight(2); rect(cardX,cardY,cardW,cardH,14);
  noStroke(); textAlign(CENTER,CENTER);

  // ---- HEAD TO HEAD ----
  if(gameMode==="HEADTOHEAD"){
    var wName=roundWinner===1?"Player 1":"Player 2";
    if(roundWinner===1){fill(255,100,100);}else{fill(100,160,255);}
    fitText(wName+" scores!",cx,cardY+44,bw,22);
    fill(255); fitText("Correct: ("+targetGX+", "+targetGY+")",cx,cardY+100,bw,20);
    fill(255,220,60); fitText("P1: "+p1wins+"  |  P2: "+p2wins,cx,cardY+132,bw,20);
    stroke(255,255,255,50); strokeWeight(1);
    line(cardX+20,cardY+157,cardX+cardW-20,cardY+157); noStroke();
    fill(200,220,255); fitText("SPACE or ENTER",cx,cardY+196,bw,15);
    return;
  }

  // ---- CORRECT via a 0° "rotation" on a 360° question ----
  if(feedbackCorrect&&isZeroFor360){
    fill(255); fitText("CORRECT!",cx,cardY+44,bw,28);
    fill(230,250,255); fitText("("+lockedGX+", "+lockedGY+")",cx,cardY+96,bw,22);
    fill(255,230,80); fitText("Nice! A rotation of 0 degree is the same",cx,cardY+140,bw,14);
    fitText("as 360 degrees! A full circle!",cx,cardY+158,bw,14);
    fill(200,220,255); fitText("SPACE to continue",cx,cardY+208,bw,15);
    return;
  }

  // ---- CORRECT with equivalent rotation (other direction, same endpoint) ----
  if(feedbackCorrect&&equivalentRotation){
    fill(255); fitText("CORRECT!",cx,cardY+44,bw,28);
    fill(230,250,255); fitText("("+lockedGX+", "+lockedGY+")",cx,cardY+96,bw,22);
    fill(255,230,80); fitText("Nice — going the other direction",cx,cardY+140,bw,14);
    fitText("reaches the same point!",cx,cardY+158,bw,14);
    fill(200,220,255); fitText("SPACE to continue",cx,cardY+208,bw,15);
    return;
  }

  // ---- CORRECT (all non-H2H modes) ----
  if(feedbackCorrect){
    fill(255); fitText("CORRECT!",cx,cardY+44,bw,28);
    fill(230,250,255); fitText("("+lockedGX+", "+lockedGY+")",cx,cardY+100,bw,22);
    fill(200,220,255); fitText("SPACE to continue",cx,cardY+163,bw,15);
    return;
  }

  // ---- WRONG: rotation hint (all modes) ----
  // cardH=310 for diagram hints, 260 for text hints; prompt anchored 28px from card bottom.
  if(showRotHint){
    fill(255); fitText("NOT QUITE!",cx,cardY+30,bw,22);
    fill(230,250,255); fitText("You: ("+lockedGX+", "+lockedGY+")",cx,cardY+60,bw,16);
    fitText("Correct: ("+targetGX+", "+targetGY+")",cx,cardY+82,bw,16);
    drawPracticeHintGraphic(practiceHintType, cardY-90);
    var contLabel=(gameMode==="GEOMETRY")?"SPACE to continue":"SPACE to try again";
    fill(200,220,255); fitText(contLabel,cx,cardY+cardH-28,bw,15);
    return;
  }

  // ---- WRONG: PRACTICE non-rotation hints ----
  if(gameMode==="PRACTICE"){
    fill(255); fitText("NOT QUITE!",cx,cardY+30,bw,22);
    fill(230,250,255); fitText("You chose ("+lockedGX+", "+lockedGY+")",cx,cardY+60,bw,15);
    fitText("Correct: ("+targetGX+", "+targetGY+")",cx,cardY+82,bw,15);
    drawPracticeHintGraphic(practiceHintType, cardY-90);
    fill(200,220,255); fitText("SPACE to try again",cx,cardY+cardH-28,bw,15);
    return;
  }

  // ---- WRONG: GENIUS ----
  if(gameMode==="GENIUS"){
    fill(255); fitText("NOT QUITE!",cx,cardY+40,bw,22);
    fill(230,250,255); fitText("You: ("+lockedGX+", "+lockedGY+")",cx,cardY+90,bw,20);
    fitText("Correct: ("+targetGX+", "+targetGY+")",cx,cardY+118,bw,20);
    fill(200,220,255); fitText("SPACE to try again",cx,cardY+178,bw,15);
    return;
  }

  // ---- WRONG: GEOMETRY / default ----
  fill(255); fitText("NOT QUITE!",cx,cardY+40,bw,22);
  fill(230,250,255); fitText("You: ("+lockedGX+", "+lockedGY+")",cx,cardY+90,bw,20);
  fitText("Correct: ("+targetGX+", "+targetGY+")",cx,cardY+118,bw,20);
  fill(200,220,255); fitText("SPACE to continue",cx,cardY+178,bw,15);
}

// ---------- SKILL SELECT SCREEN ----------
function drawSkillSelect() {
  background(10, 15, 38);
  stroke(25, 35, 70); strokeWeight(1);
  for(var gx=0;gx<=400;gx+=30) line(gx,0,gx,400);
  for(var gy=0;gy<=400;gy+=30) line(0,gy,400,gy);

  // Title
  var modeLabel = (gameMode==="GENIUS") ? "Genius in Training" :
                  (gameMode==="PRACTICE") ? "Practice Mode" : "Geometry Genius";
  fill(0,50,120); stroke(0,140,220); strokeWeight(2); rect(20,16,360,62,12);
  fill(0,220,255); noStroke(); textSize(16); textAlign(CENTER,CENTER);
  text(modeLabel, 200, 36);
  fill(140,180,255); textSize(10);
  text("Choose which skills to practice:", 200, 57);

  var skills = [
    { label:"Translations", desc:"SLIDING up, down, left, and right",    r:0,   g:180, b:255, flag:skillTranslations  },
    { label:"Rotations",    desc:"TURNING around a center of rotation", r:80,  g:220, b:120, flag:skillRotations     },
    { label:"Reflections",  desc:"FLIPPING over a line of reflection",  r:220, g:80,  b:200, flag:skillReflections   }
  ];

  var rowH = 80, startY = 96;
  for (var i = 0; i < 3; i++) {
    var sk = skills[i];
    var by = startY + i * (rowH + 8);
    var hov = (mouseX>=40 && mouseX<=360 && mouseY>=by && mouseY<=by+rowH);
    if(hov) skillFocusIdx = i;

    // Row background
    fill(sk.flag ? 14 : 8, sk.flag ? 26 : 12, sk.flag ? 60 : 28);
    stroke(sk.r, sk.g, sk.b, sk.flag ? 210 : 60);
    strokeWeight(sk.flag ? 2 : 1);
    rect(40, by, 320, rowH, 12);

    // Focus highlight
    if(skillFocusIdx === i){
      noFill(); stroke(255,220,60); strokeWeight(3);
      rect(40, by, 320, rowH, 12);
    }

    // Checkbox
    fill(sk.flag ? sk.r : 25, sk.flag ? sk.g : 25, sk.flag ? sk.b : 25);
    stroke(sk.r, sk.g, sk.b); strokeWeight(2);
    rect(62, by+25, 30, 30, 5);
    if (sk.flag) {
      stroke(255); strokeWeight(3); noFill();
      line(68, by+40, 75, by+48);
      line(75, by+48, 86, by+32);
    }

    // Label + description
    fill(sk.flag ? 255 : 110); noStroke();
    textSize(14); textAlign(LEFT, CENTER);
    text(sk.label, 106, by+30);
    fill(sk.flag ? 180 : 70); textSize(9);
    text(sk.desc, 106, by+50);

    // ON / OFF tag
    fill(sk.flag ? sk.r : 50, sk.flag ? sk.g : 50, sk.flag ? sk.b : 50);
    noStroke(); rect(308, by+28, 34, 18, 8);
    fill(sk.flag ? 0 : 160); textSize(9); textAlign(CENTER,CENTER);
    text(sk.flag ? "ON" : "OFF", 325, by+37);

    // Click to toggle
    if (hov && mouseWentDown("left")) {
      if (i===0) skillTranslations = !skillTranslations;
      if (i===1) skillRotations    = !skillRotations;
      if (i===2) skillReflections  = !skillReflections;
    }
  }

  var anyOn = skillTranslations || skillReflections || skillRotations;
  var startHov = (mouseX>=120 && mouseX<=280 && mouseY>=358 && mouseY<=394);
  if(startHov) skillFocusIdx = 3;
  if (!anyOn) {
    fill(255,80,80); textSize(10); textAlign(CENTER,CENTER); noStroke();
    text("Select at least one skill to continue", 200, 372);
  } else {
    var startFocused = (skillFocusIdx === 3);
    fill(startFocused?50:0, startFocused?180:130, startFocused?100:60);
    stroke(0,200,100); strokeWeight(startFocused?3:2);
    rect(120,358,160,36,18);
    if(startFocused){ noFill(); stroke(255,220,60); strokeWeight(2); rect(123,361,154,30,16); }
    fill(255); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("START", 200, 376);
    if(startHov && mouseWentDown("left")) resetGame();
  }
  drawSprites();
}

// ---------- SKIN SELECT SCREEN (cosmetics — all free/unlocked) ----------
var shopMsg = "", shopMsgTimer = 0; // brief "not enough coins" feedback

function drawShop() {
  background(10, 15, 38);
  stroke(25, 35, 70); strokeWeight(1);
  for(var gx=0;gx<=400;gx+=30) line(gx,0,gx,400);
  for(var gy=0;gy<=400;gy+=30) line(0,gy,400,gy);

  fill(0,50,120); stroke(0,140,220); strokeWeight(2); rect(20,8,360,50,12);
  fill(0,220,255); noStroke(); textAlign(CENTER,CENTER);
  fitText("SHOP: Get a Streak of 3 for a Coin!", 200, 24, 340, 15);
  drawCoinLabel(200, 46, coins, 14);
  textAlign(CENTER,CENTER);

  var cols=3, cardW=104, cardH=62, gapX=6, gapY=6;
  var gridW=cols*cardW+(cols-1)*gapX, startX=(400-gridW)/2, startY=64;
  for (var i=0;i<PLAYER_SKINS.length;i++) {
    var sk=PLAYER_SKINS[i];
    var col=i%cols, row=Math.floor(i/cols);
    var bx=startX+col*(cardW+gapX), by=startY+row*(cardH+gapY);
    var owned=(ownedSkins.indexOf(i)!==-1);
    var sel=(i===currentSkinIdx);
    var hov=(mouseX>=bx&&mouseX<=bx+cardW&&mouseY>=by&&mouseY<=by+cardH);

    fill(sel?18:10, sel?30:14, sel?70:32);
    stroke(sk.r,sk.g,sk.b, sel?230:(hov?150:owned?90:50)); strokeWeight(sel?3:hov?2:1);
    rect(bx,by,cardW,cardH,10);
    if (sel) { noFill(); stroke(255,220,60); strokeWeight(2); rect(bx+2,by+2,cardW-4,cardH-4,8); }

    // p5's push()/pop() doesn't track raw canvas globalAlpha, so it has
    // to be reset back to 1 explicitly right after - left at 0.35 it
    // would silently fade out every draw call for the rest of the frame.
    var fcx=bx+cardW/2, fcy=by+22;
    if (!owned) drawingContext.globalAlpha=0.35;
    drawSkinnedFace(fcx,fcy,sk,"");
    if (!owned) drawingContext.globalAlpha=1;

    fill(sel?255:owned?200:130); noStroke(); textSize(9); textAlign(CENTER,CENTER);
    fitText(sk.name, bx+cardW/2, by+45, cardW-10, 9);
    if (sel)       { fill(255,220,60); textSize(8); text("EQUIPPED", bx+cardW/2, by+56); }
    else if (owned){ fill(140,220,160); textSize(8); text("OWNED", bx+cardW/2, by+56); }
    else           { drawCoinLabel(bx+cardW/2, by+56, SKIN_PRICE, 9); }

    if (hov && mouseWentDown("left")) {
      if (owned) { equipSkin(i); }
      else if (!buySkin(i)) { shopMsg="Not enough coins!"; shopMsgTimer=60; }
    }
  }

  if (shopMsgTimer>0) {
    fill(255,90,90); noStroke(); textSize(11); textAlign(CENTER,CENTER);
    text(shopMsg, 200, 336);
    shopMsgTimer--;
  }

  // BACK button
  var backHov=(mouseX>=150&&mouseX<=250&&mouseY>=360&&mouseY<=392);
  fill(backHov?70:40, backHov?80:40, backHov?170:130); stroke(100,120,220); strokeWeight(2);
  rect(150,360,100,32,16);
  fill(255); noStroke(); textSize(12); textAlign(CENTER,CENTER);
  text("BACK", 200, 377);
  if (backHov && mouseWentDown("left")) STATE="START";

  drawSprites();
}

// A hand-drawn coin (the 🪙 emoji doesn't render in this environment -
// shows as a missing-glyph box - so the coin balance is drawn as a
// small vector icon instead, matching the game's existing hand-drawn
// art style everywhere else).
function drawCoinIcon(x, y, r) {
  noStroke(); fill(255,200,40); ellipse(x,y,r*2,r*2);
  noFill(); stroke(200,150,0); strokeWeight(1); ellipse(x,y,r*2,r*2);
  noStroke(); fill(255,230,120); ellipse(x-r*0.28,y-r*0.28,r*0.7,r*0.7);
}
// Coin icon + number, centered as one unit around (cx, cy).
function drawCoinLabel(cx, cy, count, size, col) {
  size = size || 13;
  var str = String(count);
  textSize(size);
  var numW = textWidth(str);
  var iconR = size*0.42;
  var totalW = iconR*2 + 4 + numW;
  var iconX = cx - totalW/2 + iconR, numX = cx + totalW/2 - numW/2;
  drawCoinIcon(iconX, cy, iconR);
  fill(col||[255,215,60]); noStroke(); textAlign(CENTER,CENTER); textSize(size);
  text(str, numX, cy+1);
}

// Shrink font until str fits within maxW, then draw centered at (cx, y)
function fitText(str, cx, y, maxW, maxSize) {
  var sz = maxSize;
  textSize(sz);
  while (textWidth(str) > maxW && sz > 7) { sz--; textSize(sz); }
  text(str, cx, y);
}

// ---------- START / MODE SELECT ----------
function drawStart(){
  background(6,10,26);
  var t=frameCount;

  // Starfield
  for(var si=0;si<50;si++){
    var sx2=(si*97+si*si*3)%400, sy2=(si*137+si*17)%400;
    var tw=(sin(t*0.04+si*1.3)+1)*0.5;
    fill(180+tw*75,200+tw*55,255,Math.floor(40+tw*160));
    noStroke(); ellipse(sx2,sy2,2+tw,2+tw);
  }

  // Animated confetti dots (same as new-record screen)
  var p2m=(sin(t*3)+1)*0.5;
  for(var ci=0;ci<24;ci++){
    var cfx=((ci*53)+Math.floor(sin(t*0.8+ci*15)*30)+200)%400;
    var cfy=(ci*19+t*0.7)%400;
    var crs=[255,255,0,80,60,200], cgs=[60,200,255,200,255,60], cbs=[60,60,255,60,100,255];
    fill(crs[ci%6],cgs[ci%6],cbs[ci%6]); noStroke();
    rect(cfx,cfy,7,7,2);
  }
  fill(255,200,0,Math.floor(p2m*18)); noStroke(); rect(0,0,400,400);

  // Faint grid + axes
  var axA=Math.floor(16+sin(t*1.5)*6);
  stroke(50,90,190,axA); strokeWeight(1);
  for(var gx=0;gx<=400;gx+=40)line(gx,0,gx,400);
  for(var gy=0;gy<=400;gy+=40)line(0,gy,400,gy);
  stroke(70,120,240,axA*2); strokeWeight(2);
  line(200,0,200,400); line(0,200,400,200);

  // ---- TITLE AREA ----
  var glow=(sin(t*2)+1)*0.5;
  fill(0,160+glow*70,255,Math.floor(glow*70));
  noStroke(); textSize(20); textAlign(CENTER,CENTER);
  text("Let's Get to the Point",200,22);
  fill(0,220,255); textSize(20);
  text("Let's Get to the Point",200,20);
  fill(100,160,255); textSize(10);
  text("Rigid Transformations",200,38);

  // Glowing divider
  var dg=(sin(t*3)+1)*0.5;
  stroke(0,130+dg*90,255,Math.floor(70+dg*110)); strokeWeight(1);
  line(8,52,392,52);

  // ---- MODE CARDS ----
  var modes=[
    {id:"PRACTICE",   tier:"LEARNING",  name:"Practice",
     tag1:"Your own pace!",   tag2:"No timer",
     f1:"Choose your skills", f2:"Helpful hints",
     icon:"✓", ir:220, ig:180, ib:255,
     r:70, g:20,  b:120},
    {id:"GENIUS",     tier:"GENIUS IN", name:"Training",
     tag1:"Solo practice",    tag2:"Beat your best time!",
     f1:"Hints & retries",    f2:"Extra Supports",
     icon:"★", ir:180, ig:220, ib:255,
     r:0,  g:100, b:200},
    {id:"GEOMETRY",   tier:"GEOMETRY",  name:"Genius",
     tag1:"Challenge mode!",  tag2:"Prove yourself!",
     f1:"Advanced Questions",  f2:"Fewer supports",
     icon:"◆", ir:140, ig:255, ib:180,
     r:0,  g:150, b:65},
    {id:"HEADTOHEAD", tier:"HEAD TO",   name:"Head!",
     tag1:"Head-to-head!",    tag2:"Race to win!",
     f1:"Fastest one wins!",  f2:"Best 2 out of 3",
     icon:"VS", ir:255, ig:160, ib:160,
     r:160,g:25,  b:25}
  ];

  var bw=92, bh=293, gap=4, startX=8, cardTop=57;
  for(var mi=0;mi<4;mi++){
    var m=modes[mi];
    var bx2=startX+mi*(bw+gap), by2=cardTop;
    var cx=bx2+bw/2;
    var sel=(gameMode===m.id);
    var hov=(mouseX>=bx2&&mouseX<=bx2+bw&&mouseY>=by2&&mouseY<=by2+bh);
    if(hov) startFocusIsShop=false;
    var p2=(sin(t*3)+1)*0.5;

    // Card glow
    if(sel){
      fill(m.r,m.g,m.b,Math.floor(18+p2*32)); noStroke();
      rect(bx2-6,by2-6,bw+12,bh+12,18);
    }

    // Card body
    var bR=sel?Math.min(255,m.r+50):hov?Math.min(255,m.r+25):m.r;
    var bG=sel?Math.min(255,m.g+50):hov?Math.min(255,m.g+25):m.g;
    var bB=sel?Math.min(255,m.b+50):hov?Math.min(255,m.b+25):m.b;
    fill(bR,bG,bB);
    stroke(sel?255:hov?200:110,sel?255:hov?180:85,sel?220:hov?90:55);
    strokeWeight(sel?3:hov?2:1);
    rect(bx2,by2,bw,bh,14);

    // Gold keyboard-focus border - only on the mode cards while focus
    // hasn't moved down to the Shop bar (see startFocusIsShop)
    if(sel&&!startFocusIsShop){
      noFill(); stroke(255,220,60,Math.floor(130+p2*125));
      strokeWeight(3); rect(bx2+3,by2+3,bw-6,bh-6,12);
    }

    // Header strip (taller for larger name)
    fill(Math.min(255,m.r+90),Math.min(255,m.g+90),Math.min(255,m.b+90));
    noStroke(); rect(bx2,by2,bw,58,14);
    rect(bx2,by2+44,bw,14);

    // Tier (small, dim) + name (larger, bright) — both inside strip, away from edges
    fill(255,255,255,180); noStroke(); textAlign(CENTER,CENTER);
    fitText(m.tier, cx, by2+18, bw-12, 10);
    fill(255);
    fitText(m.name, cx, by2+41, bw-12, 17);

    // Divider below header
    stroke(255,255,255,50); strokeWeight(1);
    line(bx2+12,by2+58,bx2+bw-12,by2+58);

    // Two-line tagline — shrink to fit inside card edges
    fill(255,240,140); noStroke(); textAlign(CENTER,CENTER);
    fitText(m.tag1, cx, by2+76, bw-12, 11);
    fitText(m.tag2, cx, by2+92, bw-12, 11);

    // Thin divider
    stroke(255,255,255,28); strokeWeight(1);
    line(bx2+18,by2+106,bx2+bw-18,by2+106);

    // Feature lines — shrink to fit inside card edges
    fill(sel?255:215,sel?250:235,255); noStroke(); textAlign(CENTER,CENTER);
    fitText(m.f1, cx, by2+124, bw-12, 11);
    fitText(m.f2, cx, by2+142, bw-12, 11);

    // Icon area — glowing circles + large symbol
    var iconY=by2+213;
    fill(m.ir,m.ig,m.ib,Math.floor(sel?20+p2*20:10)); noStroke();
    ellipse(cx,iconY,92,92);
    fill(m.ir,m.ig,m.ib,Math.floor(sel?42+p2*32:22)); noStroke();
    ellipse(cx,iconY,60,60);
    fill(m.ir,m.ig,m.ib,Math.floor(sel?185+p2*70:105));
    noStroke(); textAlign(CENTER,CENTER);
    textSize(m.icon==="VS"?36:52);
    text(m.icon,cx,iconY+(m.icon==="VS"?2:4));

    // High score tag (GENIUS and GEOMETRY only)
    if(m.id==="GENIUS"||m.id==="GEOMETRY"){
      var hs2=(m.id==="GENIUS"?hsGenius:hsGeometry);
      fill(0,0,0,120); noStroke(); rect(bx2+14,by2+bh-64,bw-28,16,5);
      fill(hs2>0?[255,220,100]:[120,120,160]);
      if(hs2>0)fill(255,220,100); else fill(130,140,180);
      textSize(9); textAlign(CENTER,CENTER); noStroke();
      text(hs2>0?"Best: "+hs2.toFixed(2)+"s":"No record yet",cx,by2+bh-56);
    }

    // PLAY button
    var pA=sel?Math.floor(190+p2*65):hov?155:85;
    fill(255,220,60,pA); noStroke();
    rect(bx2+12,by2+bh-46,bw-24,28,10);
    if(sel){
      noFill(); stroke(255,255,255,Math.floor(80+p2*80));
      strokeWeight(1); rect(bx2+14,by2+bh-44,bw-28,24,8);
    }
    fill(sel?10:35); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text("PLAY",cx,by2+bh-32);

    if(hov&&mouseWentDown("left")){
      gameMode=m.id; modeIndex=mi;
      if(gameMode==="PRACTICE"){
        skillTranslations=true; skillRotations=true; skillReflections=true;
        skillFocusIdx=0; STATE="SKILL_SELECT";
      } else { resetGame(); }
    }
  }

  // SHOP bar — big and flat, right under the play-button row, so it
  // reads as a real destination rather than a small icon easy to miss.
  var shopBarY=356, shopBarH=36;
  var shopHov=(mouseX>=20&&mouseX<=380&&mouseY>=shopBarY&&mouseY<=shopBarY+shopBarH);
  if(shopHov) startFocusIsShop=true;
  var shopPulse=(sin(t*3)+1)/2;
  fill(shopHov?70:40, shopHov?50:30, shopHov?140:100);
  stroke(180,140,255,Math.floor(150+shopPulse*90)); strokeWeight(shopHov?2.5:2);
  rect(20,shopBarY,360,shopBarH,14);
  // Same gold keyboard-focus ring the mode cards use, shown here instead
  // once DOWN has moved focus onto the Shop bar
  if(startFocusIsShop){
    noFill(); stroke(255,220,60,Math.floor(130+shopPulse*125));
    strokeWeight(3); rect(23,shopBarY+3,354,shopBarH-6,12);
  }
  noStroke(); textAlign(CENTER,CENTER);
  fill(255); textSize(20); text("🎨",50,shopBarY+shopBarH/2+1);
  fill(220,200,255); textSize(17); textStyle(BOLD); text("SHOP",205,shopBarY+shopBarH/2+1); textStyle(NORMAL);
  drawCoinLabel(352, shopBarY+shopBarH/2+1, coins, 13);
  if(shopHov&&mouseWentDown("left")){STATE="SHOP";}

  drawSprites();
}

// ---------- SPEED RESULT SCREEN ----------
function drawSpeedResult(){
  var t=frameCount;
  background(6,10,26);

  // Stars
  for(var si=0;si<50;si++){
    var sx2=(si*97+si*si*3)%400, sy2=(si*137+si*17)%400;
    var tw=(sin(t*0.04+si*1.3)+1)*0.5;
    fill(180+tw*75,200+tw*55,255,Math.floor(40+tw*160));
    noStroke(); ellipse(sx2,sy2,2+tw,2+tw);
  }

  var modeName=(gameMode==="GENIUS")?"Genius in Training":"Geometry Genius";
  var p2=(sin(t*3)+1)*0.5;

  if(newHighScore){
    // Animated confetti
    for(var ci=0;ci<24;ci++){
      var cfx=((ci*53)+Math.floor(sin(t*0.8+ci*15)*30)+200)%400;
      var cfy=(ci*19+t*0.7)%400;
      var crs=[255,255,0,80,60,200]; var cgs=[60,200,255,200,255,60]; var cbs=[60,60,255,60,100,255];
      fill(crs[ci%6],cgs[ci%6],cbs[ci%6]); noStroke();
      rect(cfx,cfy,7,7,2);
    }

    // Pulsing golden glow overlay
    fill(255,200,0,Math.floor(p2*22)); noStroke(); rect(0,0,400,400);

    // Title
    var cr=Math.floor(210+sin(t*2)*45), cg2=Math.floor(190+sin(t*2+120)*65);
    // Glow layer
    fill(255,220,0,Math.floor(p2*70)); textSize(40); textAlign(CENTER,CENTER); noStroke();
    text("NEW RECORD!",200,48);
    fill(cr,cg2,50); textSize(36);
    text("NEW RECORD!",200,46);

    // Animated star
    var starScale=1+p2*0.18;
    fill(255,220,60,Math.floor(180+p2*75)); textSize(Math.floor(52*starScale));
    text("★",200,108+(sin(t*2)*5));

    // Time — large
    fill(0,220,255); textSize(42); noStroke();
    text(timerFinished.toFixed(2)+"s",200,182);
    fill(140,220,255); textSize(13);
    text("NEW BEST — "+modeName,200,208);

    // Previous record comparison
    stroke(255,200,0,50); strokeWeight(1); line(50,222,350,222); noStroke();
    if(prevBest>0){
      fill(255,200,80); textSize(18);
      text("Previous best:  "+prevBest.toFixed(2)+"s",200,252);
      var imp=((prevBest-timerFinished)/prevBest*100);
      fill(120,255,160); textSize(22);
      text(imp.toFixed(1)+"% faster!",200,283);
    } else {
      fill(180,255,180); textSize(22);
      text("First record set!",200,262);
      fill(140,220,150); textSize(13);
      text("You're on the board!",200,288);
    }

  } else {
    // Non-record screen — evenly spaced layout
    var curBest=(gameMode==="GENIUS"?hsGenius:hsGeometry);

    // Title
    fill(0,180,255); textSize(32); textAlign(CENTER,CENTER); noStroke();
    text("GREAT JOB!",200,40);

    // Mode label
    fill(140,200,255); textSize(13);
    text(modeName,200,68);

    // Divider
    stroke(80,140,255,60); strokeWeight(1); line(40,82,360,82); noStroke();

    // YOUR TIME
    fill(100,200,255); textSize(12); textAlign(CENTER,CENTER); noStroke();
    text("YOUR TIME",200,100);
    fill(0,220,255); textSize(42);
    text(timerFinished.toFixed(2)+"s",200,136);

    if(curBest>0){
      // Divider
      stroke(80,140,255,60); strokeWeight(1); line(60,158,340,158); noStroke();

      // BEST TIME
      fill(220,190,60); textSize(12); textAlign(CENTER,CENTER); noStroke();
      text("BEST TIME",200,176);
      fill(255,220,80); textSize(42);
      text(curBest.toFixed(2)+"s",200,212);

      // Divider
      stroke(255,100,100,60); strokeWeight(1); line(60,232,340,232); noStroke();

      // SLOWER THAN YOUR BEST
      var pctSlower=((timerFinished-curBest)/curBest*100);
      fill(220,100,100); textSize(12); textAlign(CENTER,CENTER); noStroke();
      text("SLOWER THAN YOUR BEST",200,252);
      fill(255,120,120); textSize(38);
      text("+"+pctSlower.toFixed(1)+"%",200,287);
    } else {
      // No record yet
      stroke(80,180,80,60); strokeWeight(1); line(60,194,340,194); noStroke();
      fill(180,255,180); textSize(20);
      text("No record yet!",200,240);
      fill(140,220,140); textSize(12);
      text("Finish again to set your first best time",200,268);
    }
  }

  // Buttons: MENU (left) | PLAY AGAIN (right)
  var r1h=(mouseX>=60&&mouseX<=185&&mouseY>=308&&mouseY<=344);
  var r2h=(mouseX>=215&&mouseX<=340&&mouseY>=308&&mouseY<=344);
  var s1=(srSel===0); // keyboard focus on MENU
  var s2=(srSel===1); // keyboard focus on PLAY AGAIN

  // MENU button
  fill(s1?75:r1h?60:40, s1?115:r1h?90:60, s1?215:r1h?180:150);
  stroke(s1?255:80, s1?230:110, s1?90:210); strokeWeight(s1?3:2);
  rect(60,308,125,36,13);
  if(s1){ noFill(); stroke(255,220,60,190); strokeWeight(2); rect(62,310,121,32,11); }
  fill(255); noStroke(); textSize(12); textAlign(CENTER,CENTER);
  text("MENU",122,326);

  // PLAY AGAIN button
  fill(s2?10:r2h?0:20, s2?210:r2h?190:140, s2?125:r2h?110:70);
  stroke(s2?80:0, s2?255:210, s2?80:110); strokeWeight(s2?3:2);
  rect(215,308,125,36,13);
  if(s2){ noFill(); stroke(255,220,60,190); strokeWeight(2); rect(217,310,121,32,11); }
  fill(255); noStroke(); textSize(12);
  text("PLAY AGAIN",277,326);

  fill(150,170,220); textSize(9);
  text("◄ ► = switch   SPACE = select",200,365);

  if(r1h&&mouseWentDown("left")){ STATE="START"; }
  if(r2h&&mouseWentDown("left")){ resetGame(); }

  drawSprites();
}

function drawWin(){
  background(8,14,35);
  var t=frameCount;

  // Post-match flourish for a decisive Head-to-Head result — confetti
  // burst (same visual language as the new-high-score screen) behind
  // everything else, plus a pulsing trophy next to the winner's name
  // below. Skipped for a tie, which has nothing to celebrate.
  var h2hWinner = gameMode==="HEADTOHEAD" && p1wins!==p2wins;
  if (h2hWinner) {
    for(var ci=0;ci<28;ci++){
      var cfx=((ci*53)+Math.floor(sin(t*0.8+ci*15)*30)+200)%400;
      var cfy=(ci*19+t*0.9)%400;
      var crs=[255,255,0,80,60,200], cgs=[60,200,255,200,255,60], cbs=[60,60,255,60,100,255];
      fill(crs[ci%6],cgs[ci%6],cbs[ci%6]); noStroke();
      rect(cfx,cfy,7,7,2);
    }
  }

  if(gameMode==="PRACTICE"){
    fill(20,0,50); stroke(140,80,220); strokeWeight(2); rect(30,60,340,260,16);
    fill(200,140,255); noStroke(); textSize(26); textAlign(CENTER,CENTER);
    text("PRACTICE COMPLETE!",200,106);
    fill(180,200,255); textSize(12);
    text("You finished all "+TOTAL_ROUNDS+" questions.",200,136);
    // CHANGE SKILLS button (left)
    var ws1=(mouseX>=44&&mouseX<=188&&mouseY>=190&&mouseY<=228);
    fill(ws1?50:30,ws1?60:35,ws1?160:120); stroke(80,80,210); strokeWeight(2);
    rect(44,190,144,38,12);
    fill(255); noStroke(); textSize(10); text("CHANGE SKILLS",116,209);
    // PRACTICE AGAIN button (right)
    var ws2=(mouseX>=212&&mouseX<=356&&mouseY>=190&&mouseY<=228);
    fill(ws2?0:10,ws2?160:110,ws2?90:60); stroke(0,190,90); strokeWeight(2);
    rect(212,190,144,38,12);
    fill(255); noStroke(); textSize(10); text("PRACTICE AGAIN",284,209);
    fill(200,220,255); textSize(9); text("(same skills)",284,226);
    // MENU button (center, below)
    var ws3=(mouseX>=130&&mouseX<=270&&mouseY>=248&&mouseY<=278);
    fill(ws3?40:20,ws3?50:30,ws3?130:90); stroke(60,80,180); strokeWeight(2);
    rect(130,248,140,30,10);
    fill(255); noStroke(); textSize(10); text("MAIN MENU",200,263);
    if(ws1&&mouseWentDown("left")){skillFocusIdx=0;STATE="SKILL_SELECT";}
    if(ws2&&mouseWentDown("left")){resetGame();}
    if(ws3&&mouseWentDown("left")){STATE="START";}
    drawSprites(); return;
  }

  fill(10,50,30); stroke(0,180,90); strokeWeight(2); rect(30,75,340,240,16);
  fill(80,255,160); noStroke(); textSize(26); textAlign(CENTER,CENTER);
  text("YOU WIN!",200,120);
  fill(200,240,255); textSize(12);
  text("All "+TOTAL_ROUNDS+" rounds complete!",200,152);
  if(gameMode==="HEADTOHEAD"){
    var w=p1wins>p2wins?"Player 1 wins!":p2wins>p1wins?"Player 2 wins!":"It's a tie!";
    fill(p1wins>p2wins?[255]:[100],p1wins>p2wins?[100]:[160],p1wins>p2wins?[100]:[255]);
    if(p1wins>p2wins)fill(255,100,100);
    else if(p2wins>p1wins)fill(100,160,255);
    else fill(255,220,100);
    textSize(16); text(w,200,186);
    fill(200,220,255); textSize(12);
    text("P1: "+p1wins+" rounds   P2: "+p2wins+" rounds",200,212);
    if (h2hWinner) {
      var pulse=(sin(t*4)+1)*0.5;
      fill(255,220,60,Math.floor(150+pulse*105));
      textSize(Math.floor(30+pulse*4));
      text("🏆", 200, 240);
    }
  } else {
    fill(200,240,255); textSize(14); text("All 3 rounds complete!",200,186);
  }
  fill(0,120,55); stroke(0,180,90); strokeWeight(2); rect(125,270,150,36,17);
  fill(255); noStroke(); textSize(12); text("Play Again (SPACE)",200,288);
  drawSprites();
}

function drawGameOver(){
  background(18,5,5);
  fill(50,8,8); stroke(180,40,40); strokeWeight(2); rect(30,80,340,200,16);
  fill(255,80,80); noStroke(); textSize(26); textAlign(CENTER,CENTER); text("GAME OVER",200,130);
  fill(200,220,255); textSize(11);
  text("Round "+(round+1)+" of "+TOTAL_ROUNDS,200,175);
  fill(0,80,130); stroke(0,140,200); strokeWeight(2); rect(125,248,150,34,17);
  fill(255); noStroke(); textSize(12); text("Try Again (SPACE)",200,265);
  drawSprites();
}

// ---------- MAIN DRAW LOOP ----------
function draw(){
  drawSprites();

  // Mouse tracking
  mouseJustReleased=false;
  if(mouseWentDown("left")){mouseHeld=true;mouseHeldFrames=0;}
  else{mouseHeldFrames++;if(mouseHeldFrames>1&&mouseHeld){mouseJustReleased=true;mouseHeld=false;}}

  // ---- ESCAPE: return to menu ----
  if(keyWentDown("escape")&&STATE!=="START"){STATE="START";return;}

  // ---- TIMEOUT: 600 s auto-return to menu ----
  if((gameMode==="GENIUS"||gameMode==="GEOMETRY") &&
     (STATE==="SHOWING"||STATE==="MOVING"||STATE==="FEEDBACK") &&
     (Date.now()-timerStart)/1000 >= 300){
    STATE="START"; return;
  }

  // ---- SPACE ----
  if(keyWentDown("space")){
    if(STATE==="START"){
      if(startFocusIsShop){ STATE="SHOP"; return; }
      if(gameMode==="PRACTICE"){skillTranslations=true;skillRotations=true;skillReflections=true;skillFocusIdx=0;STATE="SKILL_SELECT";}else{resetGame();}
      return;
    }
    if(STATE==="SKILL_SELECT"){
      if(skillFocusIdx===0){ skillTranslations=!skillTranslations; return; }
      if(skillFocusIdx===1){ skillRotations=!skillRotations;       return; }
      if(skillFocusIdx===2){ skillReflections=!skillReflections;   return; }
      if(skillFocusIdx===3){ var anyOn2=skillTranslations||skillRotations||skillReflections; if(anyOn2)resetGame(); return; }
    }
    if(STATE==="SPEED_RESULT"){ if(srSel===0){STATE="START";}else{resetGame();} return; }
    if(STATE==="MOVING"){
      var ch=curCh();
      if(gameMode==="HEADTOHEAD"){
        // P2 submits with Space
        if(p2GX===targetGX&&p2GY===targetGY){
          roundWinner=2; p2wins++;
          feedbackCorrect=true; lockedGX=p2GX; lockedGY=p2GY;
          playSound(correctSoundFor(ch));
          STATE="FEEDBACK";
        }
        return;
      }
      if(isRotation(ch)&&tracingPhase==="PENCIL"){ confirmCenter(); return; }
      if(isRotation(ch)&&tracingPhase==="PAPER"){
        var ans=getTracingAnswer(); lockedGX=ans.x; lockedGY=ans.y;
      } else if(gameMode==="GEOMETRY"){
        lockedGX=toGridX(playerPX); lockedGY=toGridY(playerPY);
      } else {
        lockedGX=playerGX; lockedGY=playerGY;
      }
      feedbackCorrect=(lockedGX===targetGX&&lockedGY===targetGY);
      // Landing on the right coordinates isn't enough on its own for a
      // rotation - a wrong center combined with a wrong angle can
      // coincidentally land on the same point as the real answer. The
      // center actually pinned down has to be the real one too - except
      // for rot360, where a 0°/360° turn is the identity for ANY center,
      // so the center genuinely doesn't matter there.
      if(feedbackCorrect && isRotation(ch) && ch.type!=="rot360" && tracingPhase==="PAPER" && (centerGX!==ch.cx||centerGY!==ch.cy)){
        feedbackCorrect=false;
      }
      // Correct endpoint via alternate rotation path → praise but still fully correct
      if(feedbackCorrect && isRotation(curCh()) && tracingPhase==="PAPER"){
        if(!isCorrectRotationAmount(curCh())) equivalentRotation=true;
      }
      practiceAttempts++;
      // score tracking removed
      if(feedbackCorrect&&round===TOTAL_ROUNDS-1&&(gameMode==="GENIUS"||gameMode==="GEOMETRY"))
        timerFinished=(Date.now()-timerStart)/1000;
      if(!feedbackCorrect&&gameMode!=="GENIUS"&&gameMode!=="GEOMETRY"&&gameMode!=="PRACTICE") lives--;
      if(!feedbackCorrect) practiceHintType=detectPracticeHint();
      if(feedbackCorrect) registerCorrectForStreak(); else resetStreak();
      if(gameMode==="PRACTICE"&&feedbackCorrect) practiceMastery=Math.min(100,practiceMastery+8);
      playSound(feedbackCorrect?correctSoundFor(ch):'wrong');
      if(!feedbackCorrect){ demoStartFrame=frameCount; STATE=isRotation(curCh())?"ROTATION_DEMO":"ANSWER_DEMO"; } else { STATE="FEEDBACK"; }
      return;
    }
    if(STATE==="FEEDBACK"){
      if((gameMode==="GENIUS"||gameMode==="PRACTICE")&&!feedbackCorrect){ practiceHintType=""; resetRound(); STATE="MOVING"; return; }
      if(gameMode==="GEOMETRY"&&!feedbackCorrect){ reloadRoundSameType(); return; }
      if(lives<=0){ STATE="GAMEOVER"; return; }
      round++;
      if(round>=TOTAL_ROUNDS){
        if(gameMode==="GENIUS"||gameMode==="GEOMETRY"){
          prevBest=(gameMode==="GENIUS"?hsGenius:hsGeometry);
          if(gameMode==="GENIUS"){
            if(hsGenius===0||timerFinished<hsGenius){hsGenius=timerFinished;newHighScore=true;}
          } else {
            if(hsGeometry===0||timerFinished<hsGeometry){hsGeometry=timerFinished;newHighScore=true;}
          }
          if(newHighScore) saveCoinsAndSkins();
          playSound(newHighScore?'newRecord':'correct');
          srSel=1; STATE="SPEED_RESULT";
        } else if(gameMode==="PRACTICE"){
          buildPracticeOrder(); round=0; loadRound();
        } else { STATE="WIN"; }
      } else { loadRound(); }
      return;
    }
    if(STATE==="WIN"||STATE==="GAMEOVER"||STATE==="SPEED_RESULT"){ if(gameMode==="PRACTICE"){skillFocusIdx=0;STATE="SKILL_SELECT";}else{STATE="START";} return; }
  }

  // ---- ENTER: H2H P1 submit + advance; all other modes mirror SPACE ----
  if(keyWentDown("enter")){
    if(gameMode==="HEADTOHEAD"){
      if(STATE==="MOVING"){
        if(p1GX===targetGX&&p1GY===targetGY){
          roundWinner=1; p1wins++;
          feedbackCorrect=true; lockedGX=p1GX; lockedGY=p1GY;
          playSound(correctSoundFor(curCh()));
          STATE="FEEDBACK";
        }
      } else if(STATE==="FEEDBACK"){
        round++;
        if(round>=TOTAL_ROUNDS){ if(p1wins!==p2wins) playSound('h2hWin'); STATE="WIN"; }else{loadRound();}
      }
    } else {
      // Non-H2H: Enter acts like Space
      if(STATE==="START"){
      if(startFocusIsShop){ STATE="SHOP"; return; }
      if(gameMode==="PRACTICE"){skillTranslations=true;skillRotations=true;skillReflections=true;skillFocusIdx=0;STATE="SKILL_SELECT";}else{resetGame();}
      return;
    }
      if(STATE==="SKILL_SELECT"){
        if(skillFocusIdx===0){ skillTranslations=!skillTranslations; return; }
        if(skillFocusIdx===1){ skillRotations=!skillRotations;       return; }
        if(skillFocusIdx===2){ skillReflections=!skillReflections;   return; }
        if(skillFocusIdx===3){ var anyOn3=skillTranslations||skillRotations||skillReflections; if(anyOn3)resetGame(); return; }
      }
      if(STATE==="SPEED_RESULT"){ if(srSel===0){STATE="START";}else{resetGame();} return; }
      if(STATE==="MOVING"){
        var ec=curCh();
        if(isRotation(ec)&&tracingPhase==="PENCIL"){ confirmCenter(); return; }
        if(isRotation(ec)&&tracingPhase==="PAPER"){
          var ea=getTracingAnswer(); lockedGX=ea.x; lockedGY=ea.y;
        } else if(gameMode==="GEOMETRY"){
          lockedGX=toGridX(playerPX); lockedGY=toGridY(playerPY);
        } else {
          lockedGX=playerGX; lockedGY=playerGY;
        }
        feedbackCorrect=(lockedGX===targetGX&&lockedGY===targetGY);
        // Landing on the right coordinates isn't enough on its own for a
        // rotation - a wrong center combined with a wrong angle can
        // coincidentally land on the same point as the real answer. The
        // center actually pinned down has to be the real one too - except
        // for rot360, where a 0°/360° turn is the identity for ANY center,
        // so the center genuinely doesn't matter there.
        if(feedbackCorrect && isRotation(ec) && ec.type!=="rot360" && tracingPhase==="PAPER" && (centerGX!==ec.cx||centerGY!==ec.cy)){
          feedbackCorrect=false;
        }
        // Correct endpoint via alternate rotation path → praise but still fully correct
        if(feedbackCorrect&&isRotation(curCh())&&tracingPhase==="PAPER"){
          if(!isCorrectRotationAmount(curCh())) equivalentRotation=true;
        }
        practiceAttempts++;
        // score tracking removed
        if(feedbackCorrect&&round===TOTAL_ROUNDS-1&&(gameMode==="GENIUS"||gameMode==="GEOMETRY"))
          timerFinished=(Date.now()-timerStart)/1000;
        if(!feedbackCorrect&&gameMode!=="GENIUS"&&gameMode!=="GEOMETRY"&&gameMode!=="PRACTICE") lives--;
        if(!feedbackCorrect) practiceHintType=detectPracticeHint();
        if(feedbackCorrect) registerCorrectForStreak(); else resetStreak();
        if(gameMode==="PRACTICE"&&feedbackCorrect) practiceMastery=Math.min(100,practiceMastery+8);
        playSound(feedbackCorrect?correctSoundFor(ec):'wrong');
        if(!feedbackCorrect){ demoStartFrame=frameCount; STATE=isRotation(curCh())?"ROTATION_DEMO":"ANSWER_DEMO"; } else { STATE="FEEDBACK"; }
        return;
      }
      if(STATE==="FEEDBACK"){
        if((gameMode==="GENIUS"||gameMode==="PRACTICE")&&!feedbackCorrect){ practiceHintType=""; resetRound(); STATE="MOVING"; return; }
      if(gameMode==="GEOMETRY"&&!feedbackCorrect){ reloadRoundSameType(); return; }
        if(lives<=0){ STATE="GAMEOVER"; return; }
        round++;
        if(round>=TOTAL_ROUNDS){
          if(gameMode==="GENIUS"||gameMode==="GEOMETRY"){
            prevBest=(gameMode==="GENIUS"?hsGenius:hsGeometry);
            if(gameMode==="GENIUS"){
              if(hsGenius===0||timerFinished<hsGenius){hsGenius=timerFinished;newHighScore=true;}
            } else {
              if(hsGeometry===0||timerFinished<hsGeometry){hsGeometry=timerFinished;newHighScore=true;}
            }
            if(newHighScore) saveCoinsAndSkins();
            playSound(newHighScore?'newRecord':'correct');
            srSel=1; STATE="SPEED_RESULT";
          } else if(gameMode==="PRACTICE"){
            buildPracticeOrder(); round=0; loadRound();
          } else { STATE="WIN"; }
        } else { loadRound(); }
        return;
      }
      if(STATE==="WIN"||STATE==="GAMEOVER"||STATE==="SPEED_RESULT"){ if(gameMode==="PRACTICE"){skillFocusIdx=0;STATE="SKILL_SELECT";}else{STATE="START";} return; }
    }
  }

  // Menu arrow-key navigation
  if(STATE==="START"){
    if(keyWentDown("right")) modeIndex = (modeIndex+1)%4;
    if(keyWentDown("left"))  modeIndex = (modeIndex+3)%4;
    gameMode = modeIds[modeIndex];
    if(keyWentDown("down")) startFocusIsShop = true;
    if(keyWentDown("up"))   startFocusIsShop = false;
  }
  if(STATE==="SPEED_RESULT"){
    if(keyWentDown("left")||keyWentDown("right")) srSel = 1 - srSel;
  }
  if(STATE==="SKILL_SELECT"){
    if(keyWentDown("down")) skillFocusIdx=(skillFocusIdx+1)%4;
    if(keyWentDown("up"))   skillFocusIdx=(skillFocusIdx+3)%4;
  }

  // Early exits
  if(STATE==="START"){drawStart();return;}
  if(STATE==="SHOP"){drawShop();return;}
  if(STATE==="SKILL_SELECT"){drawSkillSelect();return;}
  if(STATE==="SPEED_RESULT"){drawSpeedResult();return;}
  if(STATE==="WIN"){drawWin();return;}
  if(STATE==="GAMEOVER"){drawGameOver();return;}

  // SHOWING
  if(STATE==="SHOWING"){
    showingTimer--;
    if(showingTimer<=0){STATE="MOVING";moveCooldown=0;}
    drawGrid();
    var ppx=toPixelX(startGX),ppy=toPixelY(startGY);
    var pulse=abs(sin(frameCount*0.15))*10;
    noFill(); stroke(255,220,60); strokeWeight(3); ellipse(ppx,ppy,36+pulse,36+pulse);
    if(gameMode==="HEADTOHEAD"){
      drawFaceAt(toPixelX(p1GX),toPixelY(p1GY),255,80,80,"P1");
      drawFaceAt(toPixelX(p2GX),toPixelY(p2GY),80,160,255,"P2");
    } else { drawPlayer(); }
    var scW=340,scH=215,scX=200-scW/2,scY=218-scH/2;
    fill(0,0,0,45); noStroke(); rect(scX+4,scY+4,scW,scH,14);
    fill(0,40,130,115); stroke(100,160,255); strokeWeight(2); rect(scX,scY,scW,scH,14);
    noStroke(); textAlign(CENTER,CENTER);
    var sbw=scW-32;
    fill(255,220,60);
    if(geomShapeType!==""&&gameMode==="GEOMETRY")
      fitText("Move the whole figure!",200,scY+42,sbw,22);
    else
      fitText("Start: ("+startGX+", "+startGY+")",200,scY+42,sbw,22);
    fill(200,230,255); fitText(challengeLabel,200,scY+100,sbw,17);
    fill(160,200,255);
    if(isRotation(curCh()))fitText("Place pencil at center, then rotate!",200,scY+152,sbw,14);
    else if(geomShapeType!==""&&gameMode==="GEOMETRY")fitText("Apply the translation to all vertices",200,scY+152,sbw,14);
    else fitText("Get ready...",200,scY+152,sbw,14);
    // Head-to-Head: big "3-2-1-GO" countdown on top of everything else,
    // building a little race-start tension before the timer unfreezes.
    if(gameMode==="HEADTOHEAD"){
      var cdRemain=showingTimer, cdLabel, cdCol, cdPhaseT;
      if(cdRemain>90){ cdLabel="3"; cdCol=[255,90,90]; cdPhaseT=(120-cdRemain)/30; }
      else if(cdRemain>60){ cdLabel="2"; cdCol=[255,190,60]; cdPhaseT=(90-cdRemain)/30; }
      else if(cdRemain>30){ cdLabel="1"; cdCol=[120,255,140]; cdPhaseT=(60-cdRemain)/30; }
      else { cdLabel="GO!"; cdCol=[255,230,60]; cdPhaseT=(30-cdRemain)/30; }
      var cdPop=1+Math.max(0,0.4-cdPhaseT*0.4);
      noStroke(); textAlign(CENTER,CENTER);
      fill(0,0,0,150); textSize(Math.floor(70*cdPop)); text(cdLabel,202,204);
      fill(cdCol[0],cdCol[1],cdCol[2]); textSize(Math.floor(70*cdPop)); text(cdLabel,200,202);
    }
    drawHUD(); drawSprites(); return;
  }

  // ANSWER_DEMO — short animated replay of the CORRECT transformation
  // after a wrong answer, before FEEDBACK and the retry. No target ring
  // is shown - the animation itself is the only reveal of where it goes.
  if(STATE==="ANSWER_DEMO"){
    drawGrid();
    drawStartMarker();
    drawAnswerDemo();
    drawHUD();
    drawSprites();
    if(frameCount-demoStartFrame>=DEMO_DURATION) STATE="FEEDBACK";
    return;
  }

  // ROTATION_DEMO — same idea as ANSWER_DEMO, but for a wrong rotation:
  // replays the CORRECT rotation on the same tracing-paper visual the
  // player just used, sweeping it from 0 to the real answer's angle.
  if(STATE==="ROTATION_DEMO"){
    drawGrid();
    drawStartMarker();
    drawRotationAnswerDemo();
    drawHUD();
    drawSprites();
    if(frameCount-demoStartFrame>=ROTATION_DEMO_DURATION) STATE="FEEDBACK";
    return;
  }

  // MOVING — input
  var c=curCh();
  if(STATE==="MOVING"){
    if(gameMode==="HEADTOHEAD"){
      // P1: arrow keys (keyWentDown for grid-locked)
      if(keyWentDown("left") &&p1GX>GRID_MIN)p1GX--;
      if(keyWentDown("right")&&p1GX<GRID_MAX)p1GX++;
      if(keyWentDown("up")   &&p1GY<GRID_MAX)p1GY++;
      if(keyWentDown("down") &&p1GY>GRID_MIN)p1GY--;
      // P2: WASD
      if(keyWentDown("a")&&p2GX>GRID_MIN)p2GX--;
      if(keyWentDown("d")&&p2GX<GRID_MAX)p2GX++;
      if(keyWentDown("w")&&p2GY<GRID_MAX)p2GY++;
      if(keyWentDown("s")&&p2GY>GRID_MIN)p2GY--;
    } else if(isRotation(c)){
      // Rotations always use the tracing paper — regardless of mode
      handleTracingInteraction();
    } else if(gameMode==="GEOMETRY"){
      // Smooth pixel movement — clamp so every shape vertex stays on the grid
      var pxL=geomShapeType!==""?shapePXMin:toPixelX(GRID_MIN);
      var pxR=geomShapeType!==""?shapePXMax:toPixelX(GRID_MAX);
      var pyU=geomShapeType!==""?shapePYMin:toPixelY(GRID_MAX);
      var pyD=geomShapeType!==""?shapePYMax:toPixelY(GRID_MIN);
      if(keyDown("left")||keyDown("a")) playerPX=Math.max(pxL,playerPX-PLAYER_SPEED);
      if(keyDown("right")||keyDown("d"))playerPX=Math.min(pxR,playerPX+PLAYER_SPEED);
      if(keyDown("up")||keyDown("w"))   playerPY=Math.max(pyU,playerPY-PLAYER_SPEED);
      if(keyDown("down")||keyDown("s")) playerPY=Math.min(pyD,playerPY+PLAYER_SPEED);
    } else {
      // Hold-to-repeat: first press moves immediately with a longer initial delay,
      // then repeats quickly while the key stays held.
      if (moveCooldown > 0) { moveCooldown--; }
      if (moveCooldown === 0) {
        var transFirst=(keyWentDown("left")||keyWentDown("a")||keyWentDown("right")||keyWentDown("d")||
                        keyWentDown("up")||keyWentDown("w")||keyWentDown("down")||keyWentDown("s"));
        var transMoved=false;
        if      ((keyDown("left")||keyDown("a")) &&playerGX>GRID_MIN){playerGX--;transMoved=true;}
        else if ((keyDown("right")||keyDown("d"))&&playerGX<GRID_MAX){playerGX++;transMoved=true;}
        else if ((keyDown("up")||keyDown("w"))   &&playerGY<GRID_MAX){playerGY++;transMoved=true;}
        else if ((keyDown("down")||keyDown("s")) &&playerGY>GRID_MIN){playerGY--;transMoved=true;}
        if (transMoved) moveCooldown = transFirst ? 12 : 5;
      }
    }
  }

  // RENDER
  drawGrid();
  if((gameMode==="GENIUS"||gameMode==="PRACTICE")&&STATE==="MOVING"&&c.type==="translate") drawTranslationHelper();
  if(STATE==="MOVING"&&(c.type==="reflect_x"||c.type==="reflect_y")) drawReflectionDistances();
  drawStartMarker();
  if(isRotation(c)&&STATE==="MOVING"&&gameMode!=="HEADTOHEAD") drawTracingPaper();
  // Wrong-answer FEEDBACK skips the yellow target ring - the ANSWER_DEMO/
  // ROTATION_DEMO animation just shown already revealed where it goes, so
  // a lingering ring here would just be redundant clutter on top of that.
  if(STATE==="FEEDBACK"){ if(feedbackCorrect) drawTarget(); drawLockedMarker(); }
  if(gameMode==="HEADTOHEAD"){
    drawFaceAt(toPixelX(p1GX),toPixelY(p1GY),255,80,80,"P1 ("+p1GX+","+p1GY+")");
    drawFaceAt(toPixelX(p2GX),toPixelY(p2GY),80,160,255,"P2 ("+p2GX+","+p2GY+")");
  } else if(!isRotation(c)||tracingPhase!=="PAPER"){
    drawPlayer();
  }
  if(STATE==="FEEDBACK")drawFeedback();
  drawHUD();
  drawSprites();
}
