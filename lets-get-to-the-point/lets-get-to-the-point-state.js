// ============================================================
//  Let's Get to the Point — Transformation Game
//  8th Grade: Translations, Reflections, Rotations
//  Paste this entire file into Code.org Game Lab
// ============================================================

var inputSprite = createSprite(-999, -999);
inputSprite.visible = false;

var exitConfirmPending = false;
var exitConfirmSel = 1; // 0=YES EXIT, 1=CANCEL (default) - keyboard focus on the exit-confirm overlay
var timeoutPopupState = "none"; // "none" | "stillThere" | "expired"

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
// the topic is also used as a key (Translation / Rotation / Reflection), so it is only translated where it is drawn
function topicName(t) { return tl(t, { Translation: "Traslación", Rotation: "Rotación", Reflection: "Reflexión" }[t] || t); }
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
var p1GX = 0, p1GY = 0;  // WASD   + Space, red
var p2GX = 0, p2GY = 0;  // arrows + Enter, blue
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
  { name:tl("Classic Yellow", "Amarillo clásico"), r:255, g:220, b:50,  style:"plain"      },
  { name:tl("Cool Blue", "Azul fresco"),      r:80,  g:180, b:255, style:"plain"      },
  { name:tl("Hot Pink", "Rosa intenso"),       r:255, g:90,  b:180, style:"sparkle"    },
  { name:tl("Lime Green", "Verde lima"),     r:140, g:230, b:60,  style:"spots"      },
  { name:tl("Sunset Orange", "Naranja atardecer"),  r:255, g:140, b:50,  style:"gradient"   },
  { name:tl("Royal Purple", "Morado real"),   r:170, g:100, b:255, style:"crown"      },
  { name:tl("Fire Red", "Rojo fuego"),       r:255, g:80,  b:40,  style:"fire"       },
  { name:tl("Ice Blue", "Azul hielo"),       r:150, g:220, b:255, style:"halo"       },
  { name:tl("Robot Silver", "Robot plateado"),   r:190, g:200, b:210, style:"robot"      },
  { name:tl("Alien Green", "Alien verde"),    r:110, g:220, b:110, style:"alien"      },
  { name:tl("Cool Shades", "Lentes de sol"),    r:210, g:180, b:130, style:"sunglasses" },
  { name:tl("Rainbow Burst", "Arcoíris"),  r:255, g:255, b:255, style:"rainbow"    },
  { name:tl("Cosmic Nebula", "Nebulosa cósmica"),  r:90,  g:60,  b:160, style:"galaxy"     },
  { name:tl("Tiger Stripes", "Rayas de tigre"),  r:255, g:150, b:40,  style:"stripes"    },
  { name:tl("Panda Pal", "Panda amigo"),      r:250, g:250, b:250, style:"panda"      },
  { name:tl("Shadow Ninja", "Ninja sombra"),   r:55,  g:55,  b:65,  style:"ninja"      },
  { name:tl("Mystic Wizard", "Mago místico"),  r:130, g:90,  b:200, style:"wizard"     },
  { name:tl("Space Cadet", "Cadete espacial"),    r:225, g:230, b:240, style:"astronaut"  },
  { name:tl("Salty Pirate", "Pirata salado"),   r:205, g:160, b:100, style:"pirate"     },
  { name:tl("Count Dracula", "Conde Drácula"),  r:75,  g:25,  b:35,  style:"vampire"    },
  { name:tl("Magic Unicorn", "Unicornio mágico"),  r:255, g:225, b:245, style:"unicorn"    },
  { name:tl("Brave Knight", "Caballero valiente"),   r:235, g:190, b:150, style:"knight"     },
  { name:tl("Busy Bee", "Abeja ocupada"),       r:255, g:210, b:40,  style:"bee"        },
  { name:tl("Silly Clown", "Payaso chistoso"),    r:255, g:90,  b:110, style:"clown"      }
];
var SKIN_PRICE = 3;

// ---------- COINS / STREAK / OWNED SKINS ----------
// Session-crossing progress (a play-currency + unlock list), not a
// record of right/wrong answers - persisted the same way the skin
// preference already was.
var coins = 0;
var ownedSkins = [0]; // skin 0 is always owned
var currentStreak = 0; // consecutive correct answers, non-H2H modes; resets on a miss
var cheatCoinsUsed = false;
// Geometry Genius opens up only after Genius in Training has been fully
// completed (every round) this many times; the count is saved like the rest.
var GEOMETRY_UNLOCK_RUNS = 3;
var geniusCompletions = 0;
var unlockPopup = false;     // the tl("new mode unlocked!", "¡nuevo modo desbloqueado!") pop-up, shown once, right after the unlocking run
var lockNoticeFrame = -999;  // when someone last tried to open the locked mode (flashes a reminder)
// (anyone who already has a Geometry Genius time from before this lock existed keeps access)
function geometryLocked() { return geniusCompletions < GEOMETRY_UNLOCK_RUNS && !(hsGeometry > 0); }
function countGeniusCompletion() {
  geniusCompletions++;
  if (geniusCompletions === GEOMETRY_UNLOCK_RUNS) unlockPopup = true;
  saveCoinsAndSkins();
}
function loadCoinsAndSkins() {
  try {
    var gd = localStorage.getItem('lgttp_genius_done');
    if (gd!==null) { var gdn=parseInt(gd,10); if (!isNaN(gdn)&&gdn>=0) geniusCompletions=gdn; }
    var c = localStorage.getItem('lgttp_coins');
    if (c!==null) { var n=parseInt(c,10); if (!isNaN(n)&&n>=0) coins=n; }
    var o = localStorage.getItem('lgttp_owned_skins');
    if (o!==null) { var arr=JSON.parse(o); if (Array.isArray(arr)) ownedSkins=arr; }
    var cc = localStorage.getItem('lgttp_cheat_used');
    if (cc!==null) cheatCoinsUsed = (cc==='true');
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
    localStorage.setItem('lgttp_cheat_used', String(cheatCoinsUsed));
    localStorage.setItem('lgttp_genius_done', String(geniusCompletions));
  } catch (e) {}
}
// Safety net: flush whatever's in memory the instant the tab is hidden
// or closed, so nothing earned since the last save is lost even if a
// future code path forgets to call saveCoinsAndSkins().
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') saveCoinsAndSkins();
});
window.addEventListener('pagehide', saveCoinsAndSkins);
loadCoinsAndSkins();

// Awards a coin every 3rd consecutive correct answer (3, 6, 9, ...).
// Wrong answers reset the streak to 0 elsewhere, right where
// feedbackCorrect is determined.
var coinPopup = 0; // frames remaining to show the tl("+1 coin!", "¡+1 moneda!") toast
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
