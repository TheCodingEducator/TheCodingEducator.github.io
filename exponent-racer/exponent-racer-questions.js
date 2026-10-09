function currentQuestionSpeed() {
  return 16 / questionTimeLimit;
}

function startGame() {
  gameState = "play"; score = 0; correctAnswersCount = 0;
  if (gameMode === "hard") questionTimeLimit = 6; else questionTimeLimit = 8;
  zoomFrames = 0; shakeFrames = 0; startSequencePhase = 1; startTimer = 120; startLineY = 280; currentStartSpeed = 0;
  expressionString = tl("GET READY!", "¡PREPÁRATE!"); fuelY = -1000;
  lightningFrames = 0; lightningPath = { main: [], branches: [] }; stormPhase = 0; coinPopupTimer = 0;
  damageFrames = 0; dayPhase = 1.0; lightPoles = [-100, 100, 300, 500]; gameOverReason = ""; wrongAnswersList = []; strikes = 0; if (window.SiteResults) SiteResults.reset();
  roadDecorations = []; lastSignMessage = ""; lastPickedAnswer = ""; lastQuestionString = "";
  playerWater = 0; playerSand = 0; activeShield = (equipped.boost === "shield");
  usedSecondChance = false; usedTimeFreeze = false; timeFreezeFramesLeft = 0; questionCheckpoint = null;

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
  speed = currentQuestionSpeed(); frameCounter = 0;

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

// Fixed (base, exponent) pairs for the Evaluating Powers skill - zero and
// one exponents/bases, then squares up to 10, then a powers-of-ten
// progression and cubes, instead of the old fully-random 2-10 base /
// 2-6 exponent range which could surface awkward, hard-to-place-value
// combinations (e.g. 9^5). Hard mode still applies its usual negative-base
// (in parens) / negative-result (no parens) treatment on top of whichever
// pair gets picked, same as before.
// (0^0, 1^0 and 0^1 are left out: they don't have three different wrong answers that are real mistakes.)
var EVAL_POWER_PAIRS = [
  [2,0],[3,0],[4,0],
  [0,2],[0,3],[0,4],
  [1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],
  [10,3],[10,4],
  [1,3],[2,3],[3,3],[4,3],[5,3]
];

function resetQuestion() {
  var answerFormat = "normal", currentBase = 1, currentExp = 1, valid = false, trickPool = [], currentOp = -1, powerOfPowerSumTrick = null;
  var activeSkills = []; for (var i = 0; i < 6; i++) { if (skillStates[i]) activeSkills.push(i); }
  if (activeSkills.length === 0) activeSkills = [0, 1, 2, 3, 4, 5];

  while (!valid) {
    var pickedSkill = activeSkills[randomNumber(0, activeSkills.length - 1)];
    qSkillIdx = pickedSkill;

    if (pickedSkill === 0) {
      var evalPair = EVAL_POWER_PAIRS[randomNumber(0, EVAL_POWER_PAIRS.length - 1)];
      base = evalPair[0]; exponent = evalPair[1];
      if (gameMode === "hard") {
        var hardType = randomNumber(0, 1);
        if (hardType === 0) {
          answer = Math.pow(-base, exponent);
          expressionString = "(-" + base + ")" + formatExponent(exponent); currentBase = base; currentExp = exponent; answerFormat = "normal";
          if (exponent === 0) { explanationString = tl("Rule: Any number to the power\nof 0 is ALWAYS 1", "Regla: cualquier número elevado\na 0 es SIEMPRE 1"); }
          else { var arr = []; for(var i=0; i<exponent; i++) arr.push("(-" + base + ")"); explanationString = tl("Parentheses mean the negative is grouped:\n", "Los paréntesis agrupan el negativo:\n") + arr.join(" × "); }
          valid = true;
        } else {
          answer = -1 * Math.pow(base, exponent);
          expressionString = "-" + base + formatExponent(exponent); currentBase = base; currentExp = exponent; answerFormat = "normal";
          if (exponent === 0) { explanationString = tl("Negative is OUTSIDE the power of 0.\n-(1) = -1", "El negativo está FUERA de la potencia 0.\n-(1) = -1"); }
          else { var arr = []; for(var i=0; i<exponent; i++) arr.push(base); explanationString = tl("No parentheses? Do the exponent FIRST,\nthen make it negative:\n-(", "¿Sin paréntesis? Haz el exponente PRIMERO\ny luego ponle el negativo:\n-(") + arr.join(" × ") + ")"; }
          valid = true;
        }
      } else {
        answer = Math.pow(base, exponent); expressionString = base + formatExponent(exponent); currentBase = base; currentExp = exponent; answerFormat = "normal";
        if (exponent === 0) { explanationString = tl("Rule: Any number to the power\nof 0 is ALWAYS 1", "Regla: cualquier número elevado\na 0 es SIEMPRE 1"); }
        else { var arr = []; for(var i=0; i<exponent; i++) arr.push(base); explanationString = base + tl(" multiplied by itself ", " multiplicado por sí mismo ") + exponent + tl(" times:\n", " veces:\n") + arr.join(" × "); }
        valid = true;
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
        var strExp2 = exp2 < 0 ? "(" + exp2 + ")" : exp2; explanationString = tl("When multiplying powers with the same base,\nADD the exponents: ", "Al multiplicar potencias de la misma base,\nSUMA los exponentes: ") + exp1 + " + " + strExp2 + " = " + trueExp;
      } else if (op === 1) {
        trueExp = exp1 - exp2; var divSym = symType === 0 ? " ÷ " : " / "; expressionString = base + formatExponent(exp1) + divSym + base + formatExponent(exp2);
        var strExp2 = exp2 < 0 ? "(" + exp2 + ")" : exp2; explanationString = tl("When dividing powers with the same base,\nSUBTRACT the exponents: ", "Al dividir potencias de la misma base,\nRESTA los exponentes: ") + exp1 + " - " + strExp2 + " = " + trueExp;
      } else {
        trueExp = exp1 * exp2; powerOfPowerSumTrick = base + formatExponent(exp1 + exp2); expressionString = "(" + base + formatExponent(exp1) + ")" + formatExponent(exp2);
        var strExp2 = exp2 < 0 ? "(" + exp2 + ")" : exp2; explanationString = tl("Power of a Power Rule:\nMULTIPLY the exponents: ", "Potencia de una potencia:\nMULTIPLICA los exponentes: ") + exp1 + " × " + strExp2 + " = " + trueExp;
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
        answer = "1\n—\n" + base + formatExponent(exponent); explanationString = tl("A negative exponent flips the base\nto the denominator:\n1 / ", "Un exponente negativo pasa la base\nal denominador:\n1 / ") + base + formatExponent(exponent) + " = 1 / " + Math.pow(base, exponent); valid = true;
      }
    }
    else if (pickedSkill === 4) {
      exponent = randomNumber(0, 1); base = randomNumber(2, 15);
      if (gameMode === "hard") {
        var hardType = randomNumber(0, 1);
        if (hardType === 0) { answer = Math.pow(-base, exponent); expressionString = "(-" + base + ")" + formatExponent(exponent); currentBase = base; currentExp = exponent; answerFormat = "normal"; }
        else { answer = -1 * Math.pow(base, exponent); expressionString = "-" + base + formatExponent(exponent); currentBase = base; currentExp = exponent; answerFormat = "normal"; }
      } else { answer = Math.pow(base, exponent); expressionString = base + formatExponent(exponent); currentBase = base; currentExp = exponent; answerFormat = "normal"; }
      if (exponent === 0) { explanationString = tl("Rule: Any number to the power\nof 0 is ALWAYS 1", "Regla: cualquier número elevado\na 0 es SIEMPRE 1"); if (gameMode === "hard" && expressionString[0] === "-" && expressionString[1] !== "(") { explanationString = tl("Negative is OUTSIDE the power of 0.\n-(1) = -1", "El negativo está FUERA de la potencia 0.\n-(1) = -1"); } }
      else { explanationString = tl("Rule: Any number to the power of 1\nis ALWAYS the base number", "Regla: cualquier número elevado a 1\nes SIEMPRE el mismo número"); } valid = true;
    }
    else if (pickedSkill === 5) {
      base = randomNumber(2, 9); exponent = randomNumber(2, 9); var powerStr = base + formatExponent(exponent); var qType = randomNumber(0, 2);
      if (qType === 0) { expressionString = tl("Identify: BASE", "Identifica: BASE"); answer = "[B]" + powerStr; explanationString = tl("The BASE is the regular-sized number\nthat gets multiplied repeatedly.", "La BASE es el número de tamaño normal\nque se multiplica una y otra vez."); }
      else if (qType === 1) { expressionString = tl("Identify: EXPONENT", "Identifica: EXPONENTE"); answer = "[E]" + powerStr; explanationString = tl("The EXPONENT is the small, raised\nnumber telling how many times to multiply.", "El EXPONENTE es el número pequeño y elevado\nque dice cuántas veces multiplicar."); }
      else { expressionString = tl("Identify: POWER", "Identifica: POTENCIA"); answer = "[P]" + powerStr; explanationString = tl("The POWER is the entire expression,\ncombining the base and the exponent.", "La POTENCIA es la expresión completa,\nque combina la base y el exponente."); }
      answerFormat = "vocab"; trickPool = ["[B]" + powerStr, "[E]" + powerStr, "[P]" + powerStr]; trickPool.splice(trickPool.indexOf(answer), 1); valid = true;
    }
    if (valid && expressionString === lastQuestionString) { valid = false; trickPool = []; }
  }

  lastQuestionString = expressionString;
  if (answerFormat === "normal") { answer = Math.round(answer * 100) / 100; }
  var correctNumericValue = (answerFormat === "normal") ? answer : Math.pow(currentBase, currentExp);

  // Every wrong answer is a real student mistake, never a random number. Each question type lists its classic mistakes
  // here, and the wrong answer choices below are picked only from this list.
  if (answerFormat === "normal") {
    var mb = currentBase, me = currentExp, negAns = answer < 0;
    var mistakes = [
      mb * me,                              // multiplied the base by the exponent (3^4 -> 12)
      mb + me,                              // added them (3^4 -> 7)
      Math.pow(me, mb),                     // swapped base and exponent (3^4 -> 4^3 = 64)
      Math.pow(mb, me + 1),                 // one factor too many (3^4 -> 3^5)
      me >= 1 ? Math.pow(mb, me - 1) : NaN, // one factor too few (3^4 -> 3^3)
      mb,                                   // ignored the exponent (3^4 -> 3; 5^0 -> 5)
      me                                    // wrote the exponent (0^3 -> 3)
    ];
    if (negAns) mistakes = mistakes.map(function (v) { return -v; });   // negative results: the same mistakes, sign kept
    if (gameMode === "hard" && answer !== 0) mistakes.push(-answer);     // got the sign wrong
    mistakes.forEach(function (v) {
      if (isFinite(v) && Math.round(v) === v && v !== answer && Math.abs(v) <= 100000 && trickPool.indexOf(v) < 0) trickPool.push(v);
    });
  }
  else if (answerFormat === "exp_fraction") {
    var fb = currentBase, fe = currentExp;
    trickPool.push("-" + fb + formatExponent(fe));                // made it negative instead of a fraction (2^-3 -> -2^3)
    trickPool.push(fb + formatExponent(fe));                      // ignored the negative sign (2^-3 -> 2^3)
    trickPool.push("-1\n—\n" + fb + formatExponent(fe));          // a fraction, but negative
    if (fb * fe !== Math.pow(fb, fe)) trickPool.push("1\n—\n" + (fb * fe));   // multiplied base by exponent (2^-3 -> 1/6)
  }
  else if (answerFormat === "string_power" && currentOp === 0) {
    trickPool.push((currentBase * currentBase) + formatExponent(trueExp));     // multiplied the bases too (2^3 · 2^4 -> 4^7)
  }
  else if (answerFormat === "string_power" && currentOp === 1) {
    trickPool.push(1 + formatExponent(trueExp));                             // divided the bases too (2^6 ÷ 2^2 -> 1^4)
  }

  var cLane = randomNumber(0, 2);
  fuelOptions = [null, null, null]; fuelOptions[cLane] = answer;
  var forcedLane = -1;
  if (currentOp === 2 && powerOfPowerSumTrick !== null) {
      var others = []; for(var i=0; i<3; i++) if(i !== cLane) others.push(i);
      forcedLane = others[randomNumber(0, 1)]; fuelOptions[forcedLane] = powerOfPowerSumTrick;
  }

  // Exponents of Zero and One: always include 0 and 1 as answer choices (whichever
  // of them isn't the correct answer), since those are the classic misconceptions
  // this skill is testing - "does x^0 = 0?" and "does x^1 = 1 or x?". Also applies
  // to Evaluating Powers whenever the curated pair's answer itself is 0 or 1 (e.g.
  // 0^3, 2^0), so those questions deliberately dangle the other of {0,1} as a
  // wrong choice every time instead of leaving it to chance.
  if (pickedSkill === 4 || (pickedSkill === 0 && (getMathVal(answer) === 0 || getMathVal(answer) === 1))) {
    var requiredDistractors = [];
    if (getMathVal(answer) !== 0) requiredDistractors.push(0);
    if (getMathVal(answer) !== 1) requiredDistractors.push(1);
    var openLanes = []; for (var ol = 0; ol < 3; ol++) if (fuelOptions[ol] === null) openLanes.push(ol);
    for (var sIdx = openLanes.length - 1; sIdx > 0; sIdx--) { var rIdx = randomNumber(0, sIdx); var tmpLane = openLanes[sIdx]; openLanes[sIdx] = openLanes[rIdx]; openLanes[rIdx] = tmpLane; }
    for (var rd = 0; rd < requiredDistractors.length && rd < openLanes.length; rd++) {
      fuelOptions[openLanes[rd]] = requiredDistractors[rd];
    }
  }

  if (answerFormat === "vocab") {
    var tIdx = 0; for (var k = 0; k < 3; k++) { if (k !== cLane) { fuelOptions[k] = trickPool[tIdx]; tIdx++; } }
  } else {
    var ansMath = getMathVal(answer);
    for (var k = 0; k < 3; k++) {
      if (fuelOptions[k] === null) {
        var isUnique = false, wrongVal, attempts = 0;
        var existingCache = []; for (var f = 0; f < 3; f++) { if (fuelOptions[f] !== null) { existingCache.push({ s: String(fuelOptions[f]), v: getMathVal(fuelOptions[f]) }); } }

        while (!isUnique && attempts < 100) {
          attempts++;
          if (trickPool.length > 0 && attempts < 60) { wrongVal = trickPool[randomNumber(0, trickPool.length - 1)]; }   // a real mistake
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

  // "10 to the power of something" questions: the ONLY wrong answers are powers of ten (10, 100, 1000 or 10,000), so the choices are all
  // about counting zeros (off-by-one-zero mistakes) rather than random numbers.
  if (answerFormat === "normal" && currentBase === 10 && currentExp >= 1 && pickedSkill !== 4) {
    var tenPows = [10, 100, 1000, 10000].filter(function (v) { return v !== answer; });
    for (var ts = tenPows.length - 1; ts > 0; ts--) { var tr = randomNumber(0, ts), tt = tenPows[ts]; tenPows[ts] = tenPows[tr]; tenPows[tr] = tt; }
    var tenIdx = 0;
    for (var tk = 0; tk < 3; tk++) { if (tk !== cLane) { fuelOptions[tk] = tenPows[tenIdx]; tenIdx++; } }
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

  // Snapshot everything that defines "this question" plus the surrounding
  // game state at the moment it starts, so Second Chance can later rewind
  // back to exactly this point and let the player retry the SAME question
  // instead of just forgiving the strike and moving on to a new one.
  questionCheckpoint = {
    fuelY: fuelY, cLane: cLane, expressionString: expressionString, explanationString: explanationString,
    answer: answer, fuelOptions: fuelOptions.slice(), lastQuestionString: lastQuestionString,
    playerX: nearestLane(player.x), playerY: player.y, fuel: fuel, score: score, totalCoins: totalCoins,
    strikes: strikes, speed: speed, questionTimeLimit: questionTimeLimit
  };
  // A new question: Second Chance's rewind may only go back to here (just after the last question was answered),
  // never far enough to show the previous question's answer choices again.
  rwHistory = [];
}

function rewindToQuestionCheckpoint() {
  var cp = questionCheckpoint;
  if (!cp) return;

  fuelY = cp.fuelY; expressionString = cp.expressionString; explanationString = cp.explanationString;
  answer = cp.answer; fuelOptions = cp.fuelOptions.slice(); lastQuestionString = cp.lastQuestionString;
  var snappedX = nearestLane(cp.playerX);
  player.x = snappedX; player.y = cp.playerY; targetCarX = snappedX; targetCarY = cp.playerY;
  fuel = cp.fuel; score = cp.score; totalCoins = cp.totalCoins; strikes = cp.strikes;
  speed = cp.speed; questionTimeLimit = cp.questionTimeLimit;

  coinActive = false; coinSprite.x = -100; coinSprite.velocityX = 0;

  // Put the road back the way it looked right when the question began -
  // clear whatever obstacles have since scrolled near the fuel line and
  // respawn the single safe-lane obstacle in the same safe lane as before.
  var obsLimit1 = fuelY - 200, obsLimit2 = fuelY + 200;
  for (var o = obstacles.length - 1; o >= 0; o--) {
    var ob = obstacles.get(o);
    if (ob.y > obsLimit1 && ob.y < obsLimit2) { ob.destroy(); }
  }
  var safeLanes = [0, 1, 2]; safeLanes.splice(cp.cLane, 1);
  var sy = fuelY - 250;
  spawnObstacle(lanes[safeLanes[randomNumber(0, safeLanes.length - 1)]], sy, false);
}

var rewindAnim = null;

// Snapshots where the car/fuel-sign visually were the instant Second Chance
// triggers, restores the real game state immediately (rewindToQuestionCheckpoint
// already handles that), then plays a short "rewinding a tape" cinematic that
// visually tweens the car and road backward from the failure point to the
// checkpoint - gameplay itself is already safely back at the checkpoint the
// whole time, this is purely the visual sell of "you just got rewound".
function triggerSecondChanceRewind() {
  var fromX = player.x, fromY = player.y, fromFuelY = fuelY;
  rewindToQuestionCheckpoint();
  rewindAnim = { t: 0, total: 50, fromX: fromX, fromY: fromY, toX: player.x, toY: player.y, fromFuelY: fromFuelY, toFuelY: fuelY };
  gameState = "rewinding";
}

function drawRewindEffect() {
  rewindAnim.t++;
  var frac = Math.min(1, rewindAnim.t / rewindAnim.total);
  var ease = 1 - Math.pow(1 - frac, 3);
  var curX = rewindAnim.fromX + (rewindAnim.toX - rewindAnim.fromX) * ease;
  var curY = rewindAnim.fromY + (rewindAnim.toY - rewindAnim.fromY) * ease;
  var curFuelY = rewindAnim.fromFuelY + (rewindAnim.toFuelY - rewindAnim.fromFuelY) * ease;

  background("#0a0a12");
  fill("#181820"); noStroke(); rect(100, 0, 200, 400);
  fill("#2c2c38"); rect(96, 0, 4, 400); rect(300, 0, 4, 400);

  // Dashed center lines scrolling backward fast, like tape reversing.
  fill("rgba(220,220,255,0.35)");
  var revOffset = ((frameCounter * -16) % 60 + 60) % 60;
  for (var d = -60; d <= 420; d += 60) rect(198, d + revOffset, 4, 30);

  // Faint fuel/answer sign sliding back up off-screen with the tween.
  if (curFuelY > -340 && curFuelY < 420) {
    fill("rgba(241,196,15,0.25)"); rect(110, curFuelY, 180, 30, 4);
  }

  // Speed-streak side lines suggesting fast reverse motion.
  stroke("rgba(150,200,255,0.3)"); strokeWeight(2);
  for (var sline = 0; sline < 5; sline++) {
    var sy2 = ((frameCounter * 11 + sline * 90) % 460) - 40;
    line(60 + sline * 9, sy2, 60 + sline * 9, sy2 - 35);
    line(340 - sline * 9, sy2, 340 - sline * 9, sy2 - 35);
  }
  noStroke();

  // The car itself, tweening backward from the crash/miss spot to the checkpoint.
  push(); translate(curX, curY);
  drawVehicle(0, 0, "car", equipped.car, true, "", false, 0, 0);
  pop();

  // Dark vignette + scanlines for a VHS-rewind look.
  fill("rgba(0,0,0,0.4)"); rect(0, 0, 400, 400);
  stroke("rgba(255,255,255,0.05)"); strokeWeight(1);
  for (var yy = 0; yy < 400; yy += 5) line(0, yy, 400, yy);
  noStroke();

  var pulse = 0.65 + 0.35 * Math.sin(frameCounter * 0.6);
  fill("rgba(255,255,255," + pulse + ")");
  textAlign(CENTER, CENTER); textSize(30); textStyle(BOLD);
  text("⏪ ⏪ ⏪", 200, 55);

  fill("gold"); textSize(32);
  text(tl("SECOND CHANCE!", "¡OTRO INTENTO!"), 200, 200);
  textStyle(NORMAL);

  if (rewindAnim.t >= rewindAnim.total) { rewindAnim = null; gameState = "play"; }
}

// Two cars touch when they are side by side within a car's drawn width and closer than a drawn truck's length plus a small gap.
// The one further up the road (smaller y) is moved back behind the other; repeated until no two cars touch.
function separateObstacles() {
  var GAP_X = 40, GAP_Y = 78;   // from the drawings: wheels reach 18 px to each side; a truck plus the glow of the headlights behind it is about 71 px long
  for (var pass = 0; pass < 4; pass++) {
    var moved = false;
    for (var i = 0; i < obstacles.length; i++) {
      for (var j = i + 1; j < obstacles.length; j++) {
        var a = obstacles.get(i), b = obstacles.get(j);
        if (Math.abs(a.x - b.x) < GAP_X && Math.abs(a.y - b.y) < GAP_Y) {
          var upper = a.y < b.y ? a : b, lower = upper === a ? b : a;
          upper.y = lower.y - GAP_Y;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
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

