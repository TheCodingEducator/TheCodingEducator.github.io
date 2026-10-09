// ---------- CHALLENGE BANK ----------
var challenges = [
  // ---- Translations (algebraic notation) ----
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate: (x + 3, y + 2)", "Traslada: (x + 3, y + 2)"), dx:3,  dy:2,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate: (x - 4, y + 1)", "Traslada: (x - 4, y + 1)"), dx:-4, dy:1,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate: (x + 2, y - 3)", "Traslada: (x + 2, y - 3)"), dx:2,  dy:-3, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate: (x - 1, y - 4)", "Traslada: (x - 1, y - 4)"), dx:-1, dy:-4, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate: (x + 5, y - 2)", "Traslada: (x + 5, y - 2)"), dx:5,  dy:-2, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate: (x + 1, y + 3)", "Traslada: (x + 1, y + 3)"), dx:1,  dy:3,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate: (x - 3, y + 4)", "Traslada: (x - 3, y + 4)"), dx:-3, dy:4,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate: (x + 4, y + 3)", "Traslada: (x + 4, y + 3)"), dx:4,  dy:3,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate: (x - 2, y - 2)", "Traslada: (x - 2, y - 2)"), dx:-2, dy:-2, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate: (x + 3, y - 1)", "Traslada: (x + 3, y - 1)"), dx:3,  dy:-1, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate: (x - 5, y + 3)", "Traslada: (x - 5, y + 3)"), dx:-5, dy:3,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate: (x + 2, y + 4)", "Traslada: (x + 2, y + 4)"), dx:2,  dy:4,  type:"translate" },
  // ---- Translations (natural language) ----
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate 3 units left and 2 units down", "Traslada 3 unidades a la izquierda y 2 unidades hacia abajo"),  dx:-3, dy:-2, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate 4 units right and 1 unit up", "Traslada 4 unidades a la derecha y 1 unidad hacia arriba"),    dx:4,  dy:1,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate 2 units left and 3 units up", "Traslada 2 unidades a la izquierda y 3 unidades hacia arriba"),    dx:-2, dy:3,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate 5 units right and 1 unit down", "Traslada 5 unidades a la derecha y 1 unidad hacia abajo"),  dx:5,  dy:-1, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate 1 unit right and 4 units up", "Traslada 1 unidad a la derecha y 4 unidades hacia arriba"),    dx:1,  dy:4,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate 3 units right and 4 units down", "Traslada 3 unidades a la derecha y 4 unidades hacia abajo"), dx:3,  dy:-4, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate 4 units left and 3 units up", "Traslada 4 unidades a la izquierda y 3 unidades hacia arriba"),    dx:-4, dy:3,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate 2 units right and 2 units up", "Traslada 2 unidades a la derecha y 2 unidades hacia arriba"),   dx:2,  dy:2,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate 1 unit left and 1 unit down", "Traslada 1 unidad a la izquierda y 1 unidad hacia abajo"),    dx:-1, dy:-1, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate 3 units left and 1 unit down", "Traslada 3 unidades a la izquierda y 1 unidad hacia abajo"),   dx:-3, dy:-1, type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate 4 units right and 2 units up", "Traslada 4 unidades a la derecha y 2 unidades hacia arriba"),   dx:4,  dy:2,  type:"translate" },
  { topic:"Translation", r:0, g:180, b:255, label:tl("Translate 2 units right and 5 units down", "Traslada 2 unidades a la derecha y 5 unidades hacia abajo"), dx:2,  dy:-5, type:"translate" },
  // ---- Reflections ----
  { topic:"Reflection", r:220, g:80, b:200, label:tl("Reflect over the x-axis", "Refleja sobre el eje x"), type:"reflect_x" },
  { topic:"Reflection", r:220, g:80, b:200, label:tl("Reflect over the y-axis", "Refleja sobre el eje y"), type:"reflect_y" },
  { topic:"Reflection", r:220, g:80, b:200, label:tl("Reflect over the x-axis", "Refleja sobre el eje x"), type:"reflect_x" },
  { topic:"Reflection", r:220, g:80, b:200, label:tl("Reflect over the y-axis", "Refleja sobre el eje y"), type:"reflect_y" },
  { topic:"Reflection", r:220, g:80, b:200, label:tl("Reflect over the x-axis", "Refleja sobre el eje x"), type:"reflect_x" },
  { topic:"Reflection", r:220, g:80, b:200, label:tl("Reflect over the y-axis", "Refleja sobre el eje y"), type:"reflect_y" },
  // ---- Rotations about the origin — Practice, Genius in Training, Head-to-Head ----
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 90° CCW about the origin", "Gira 90° antihorario sobre el origen"),  cx:0, cy:0, type:"rot90ccw" },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 90° CW about the origin", "Gira 90° horario sobre el origen"),   cx:0, cy:0, type:"rot90cw"  },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 90° CCW about the origin", "Gira 90° antihorario sobre el origen"),  cx:0, cy:0, type:"rot90ccw" },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 90° CW about the origin", "Gira 90° horario sobre el origen"),   cx:0, cy:0, type:"rot90cw"  },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 180° about the origin", "Gira 180° sobre el origen"),     cx:0, cy:0, type:"rot180"   },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 180° about the origin", "Gira 180° sobre el origen"),     cx:0, cy:0, type:"rot180"   },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 180° about the origin", "Gira 180° sobre el origen"),     cx:0, cy:0, type:"rot180"   },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 360° about the origin", "Gira 360° sobre el origen"),     cx:0, cy:0, type:"rot360"   },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 360° about the origin", "Gira 360° sobre el origen"),     cx:0, cy:0, type:"rot360"   },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 360° about the origin", "Gira 360° sobre el origen"),     cx:0, cy:0, type:"rot360"   },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 270° CCW about the origin", "Gira 270° antihorario sobre el origen"), cx:0, cy:0, type:"rot270ccw" },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 270° CW about the origin", "Gira 270° horario sobre el origen"),  cx:0, cy:0, type:"rot270cw"  },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 270° CCW about the origin", "Gira 270° antihorario sobre el origen"), cx:0, cy:0, type:"rot270ccw" },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 270° CW about the origin", "Gira 270° horario sobre el origen"),  cx:0, cy:0, type:"rot270cw"  },
  // ---- Rotations about non-origin centers — Geometry Genius only ----
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 90° CCW about point (1,1)", "Gira 90° antihorario sobre el punto (1,1)"),   cx:1,  cy:1,  type:"rot90ccw", geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 90° CW about point (1,1)", "Gira 90° horario sobre el punto (1,1)"),    cx:1,  cy:1,  type:"rot90cw",  geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 180° about point (1,1)", "Gira 180° sobre el punto (1,1)"),      cx:1,  cy:1,  type:"rot180",   geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 90° CCW about point (-1,2)", "Gira 90° antihorario sobre el punto (-1,2)"),  cx:-1, cy:2,  type:"rot90ccw", geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 90° CW about point (2,-1)", "Gira 90° horario sobre el punto (2,-1)"),   cx:2,  cy:-1, type:"rot90cw",  geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 180° about point (-1,-1)", "Gira 180° sobre el punto (-1,-1)"),    cx:-1, cy:-1, type:"rot180",   geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 90° CCW about point (1,-1)", "Gira 90° antihorario sobre el punto (1,-1)"),  cx:1,  cy:-1, type:"rot90ccw", geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 90° CW about point (-1,1)", "Gira 90° horario sobre el punto (-1,1)"),   cx:-1, cy:1,  type:"rot90cw",  geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 180° about point (2,1)", "Gira 180° sobre el punto (2,1)"),      cx:2,  cy:1,  type:"rot180",   geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 90° CCW about point (0,2)", "Gira 90° antihorario sobre el punto (0,2)"),   cx:0,  cy:2,  type:"rot90ccw", geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 90° CW about point (2,0)", "Gira 90° horario sobre el punto (2,0)"),    cx:2,  cy:0,  type:"rot90cw",  geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 180° about point (-2,1)", "Gira 180° sobre el punto (-2,1)"),     cx:-2, cy:1,  type:"rot180",   geometryOnly:true },
  // 270° non-origin
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 270° CCW about point (1,1)", "Gira 270° antihorario sobre el punto (1,1)"),  cx:1,  cy:1,  type:"rot270ccw", geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 270° CW about point (1,1)", "Gira 270° horario sobre el punto (1,1)"),   cx:1,  cy:1,  type:"rot270cw",  geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 270° CCW about point (-1,2)", "Gira 270° antihorario sobre el punto (-1,2)"), cx:-1, cy:2,  type:"rot270ccw", geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 270° CW about point (2,-1)", "Gira 270° horario sobre el punto (2,-1)"),  cx:2,  cy:-1, type:"rot270cw",  geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 270° CCW about point (0,2)", "Gira 270° antihorario sobre el punto (0,2)"),  cx:0,  cy:2,  type:"rot270ccw", geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 270° CW about point (2,0)", "Gira 270° horario sobre el punto (2,0)"),   cx:2,  cy:0,  type:"rot270cw",  geometryOnly:true },
  // 360° non-origin — answer is back to the starting point
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 360° about point (1,1)", "Gira 360° sobre el punto (1,1)"),      cx:1,  cy:1,  type:"rot360",    geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 360° about point (-1,2)", "Gira 360° sobre el punto (-1,2)"),     cx:-1, cy:2,  type:"rot360",    geometryOnly:true },
  { topic:"Rotation", r:80, g:220, b:120, label:tl("Rotate 360° about point (2,-1)", "Gira 360° sobre el punto (2,-1)"),     cx:2,  cy:-1, type:"rot360",    geometryOnly:true }
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

function resetGame() {
  if (window.SiteResults) SiteResults.reset();
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
      drawTag(midX1, lbY1, sDist + (sDist!==1 ? tl(" units", " unidades") : tl(" unit", " unidad")), 80,210,255);
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
      drawTag(midX2, lbY2, pDist + " unit" + (pDist!==1?"s":""), 80,255,170);
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
      drawTag(boxX1+27, midY1, sDist2 + " unit" + (sDist2!==1?"s":""), 80,210,255);
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
      drawTag(boxX2+27, midY2, pDist2 + " unit" + (pDist2!==1?"s":""), 80,255,170);
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

// Translation colors: horizontal (x) part is red, vertical (y) part is
// green - the same colors the on-grid arrows/labels use, so the challenge
// text and what's drawn as the player moves visibly match.
var TRANS_X_COL = [255,110,110], TRANS_Y_COL = [80,255,160];

// Splits a translation challenge's text into colored pieces. Returns null
// for anything that isn't a translation, so callers fall back to plain text.
function translationLabelParts(label, baseCol) {
  var m = /^(Translate: \()(x [+-] \d+)(, )(y [+-] \d+)(\))$/.exec(label) ||
          /^(Translate )(\d+ units? (?:left|right))( and )(\d+ units? (?:up|down))()$/.exec(label);
  if (!m) return null;
  return [
    {t:m[1], c:baseCol}, {t:m[2], c:TRANS_X_COL}, {t:m[3], c:baseCol},
    {t:m[4], c:TRANS_Y_COL}, {t:m[5], c:baseCol}
  ];
}

// Drop-in for fitText(challengeLabel, ...): centered, shrunk to fit, with
// translation labels drawn in their x/y colors.
function drawChallengeLabel(str, cx, y, maxW, maxSize, baseCol) {
  var parts = (curCh() && curCh().type==="translate") ? translationLabelParts(str, baseCol) : null;
  if (!parts) { fill(baseCol[0],baseCol[1],baseCol[2]); fitText(str,cx,y,maxW,maxSize); return; }
  var sz = maxSize, total;
  do {
    textSize(sz); total = 0;
    for (var i=0;i<parts.length;i++) total += textWidth(parts[i].t);
    if (total<=maxW || sz<=7) break;
    sz--;
  } while (true);
  textAlign(LEFT,CENTER);
  var x = cx - total/2;
  for (var j=0;j<parts.length;j++) {
    fill(parts[j].c[0],parts[j].c[1],parts[j].c[2]);
    text(parts[j].t, x, y);
    x += textWidth(parts[j].t);
  }
  textAlign(CENTER,CENTER);
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
    stroke(255,90,90,190); strokeWeight(2); line(sxPX,syPY,cxPX,syPY);
    var ax=dxU>0?cxPX-6:cxPX+6;
    fill(255,90,90,210); noStroke();
    triangle(cxPX,syPY,ax,syPY-4,ax,syPY+4);
    var midHX=constrain((sxPX+cxPX)/2, LBL_MIN_X, LBL_MAX_X);
    var lbY=constrain(syPY+(cyPY>syPY?-14:14), LBL_MIN_Y, LBL_MAX_Y);
    var hLabel=isAlgebraic ? ("x "+(dxU>0?"+ ":"- ")+Math.abs(dxU))
                           : ((Math.abs(dxU)===1?tl("1 unit", "1 unidad"):Math.abs(dxU)+tl(" units", " unidades"))+(dxU>0?tl(" right", " a la derecha"):tl(" left", " a la izquierda")));
    drawTag(midHX, lbY, hLabel, 255,110,110);
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
                           : ((Math.abs(dyU)===1?tl("1 unit", "1 unidad"):Math.abs(dyU)+tl(" units", " unidades"))+(dyU>0?tl(" up", " hacia arriba"):tl(" down", " hacia abajo")));
    drawTag(lbX, midVY, vLabel, 80,255,160);
  }
}
