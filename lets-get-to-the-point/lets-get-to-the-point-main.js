// ---------- MAIN DRAW LOOP ----------
// results by skill (site-results.js): translations, reflections and rotations, shown once when a game ends
if (window.SiteResults) SiteResults.setup([{ id: 'translate', en: 'Translations', es: 'Traslaciones' }, { id: 'reflect', en: 'Reflections', es: 'Reflexiones' }, { id: 'rotate', en: 'Rotations', es: 'Rotaciones' }]);
function noteMove(ch, ok) { if (window.SiteResults && ch) SiteResults.record(isRotation(ch) ? 'rotate' : (ch.type === 'reflect_x' || ch.type === 'reflect_y') ? 'reflect' : 'translate', ok); }
var lgStateWas = '', lgResultsShown = true;
function watchGameEnd() {
  var inGame = STATE === 'MOVING' || STATE === 'FEEDBACK' || STATE === 'ANSWER_DEMO' || STATE === 'ROTATION_DEMO';
  if (inGame) lgResultsShown = false;
  else if (!lgResultsShown && window.SiteResults && ['MOVING', 'FEEDBACK', 'ANSWER_DEMO', 'ROTATION_DEMO'].indexOf(lgStateWas) >= 0) {
    lgResultsShown = true;
    setTimeout(function () { SiteResults.show({ title: tl('Your results', 'Tus resultados') }); }, STATE === 'START' ? 0 : 1200);
  }
  lgStateWas = STATE;
}
function draw(){
  watchGameEnd();
  if(exitConfirmPending){ drawExitConfirmOverlay(); return; }

  // ---- TIMEOUT: ask if they're still there at 300s, force back to menu
  // at 999s if that check just sits there unanswered ----
  if((gameMode==="GENIUS"||gameMode==="GEOMETRY") &&
     (STATE==="SHOWING"||STATE==="MOVING"||STATE==="FEEDBACK")){
    var elapsedSec=(Date.now()-timerStart)/1000;
    if(elapsedSec>=999){ timeoutPopupState="expired"; }
    else if(elapsedSec>=300 && timeoutPopupState==="none"){ timeoutPopupState="stillThere"; }
  }
  if(timeoutPopupState!=="none"){ drawTimeoutPopup(); return; }

  // Cleared exactly once per real frame, regardless of which STATE branch
  // below ends up running - every drawTag() call this frame checks against
  // (and adds to) this same list, so labels drawn from different STATE
  // branches (SHOWING, ANSWER_DEMO/ROTATION_DEMO, the main MOVING/FEEDBACK
  // render) never collide with stale entries left over from a previous frame.
  resetLabelPlacement();

  drawSprites();

  // Mouse tracking
  mouseJustReleased=false;
  if(mouseWentDown("left")){mouseHeld=true;mouseHeldFrames=0;}
  else{mouseHeldFrames++;if(mouseHeldFrames>1&&mouseHeld){mouseJustReleased=true;mouseHeld=false;}}

  // ---- ESCAPE: return to menu (confirm first if a round is in progress) ----
  if(keyWentDown("escape")&&STATE!=="START"){
    if(STATE==="SHOWING"||STATE==="MOVING"||STATE==="FEEDBACK"){ exitConfirmPending=true; exitConfirmSel=1; }
    else { STATE="START"; }
    return;
  }

  // ---- The tl("new mode unlocked!", "¡nuevo modo desbloqueado!") pop-up: any key or click closes it (and does nothing else) ----
  if(unlockPopup && STATE==="SPEED_RESULT"){
    if(keyWentDown("space")||keyWentDown("enter")||mouseWentDown("left")){ unlockPopup=false; return; }
  }

  // ---- SPACE (or the on-screen touch action button) ----
  if(keyWentDown("space")){
    if(STATE==="START"){
      if(startFocusIsShop){ STATE="SHOP"; return; }
      if(gameMode==="PRACTICE"){skillTranslations=false;skillRotations=false;skillReflections=false;skillFocusIdx=0;STATE="SKILL_SELECT";}else{beginModeFromMenu();}
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
        // P1 (WASD) submits with Space
        if(h2hAtTarget(p1GX,p1GY)){
          roundWinner=1; p1wins++;
          feedbackCorrect=true; lockedGX=targetGX; lockedGY=targetGY;
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
      practiceAttempts++; noteMove(ch, feedbackCorrect);
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
      if((gameMode==="GENIUS"||gameMode==="GEOMETRY"||gameMode==="PRACTICE")&&!feedbackCorrect){ practiceHintType=""; resetRound(); STATE="MOVING"; return; }
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
          if(gameMode==="GENIUS") countGeniusCompletion();   // a full Genius in Training run counts toward unlocking Geometry Genius
          srSel=1; STATE="SPEED_RESULT";
        } else if(gameMode==="PRACTICE"){
          buildPracticeOrder(); round=0; loadRound();
        } else { STATE="WIN"; }
      } else { loadRound(); }
      return;
    }
    if(STATE==="WIN"||STATE==="GAMEOVER"||STATE==="SPEED_RESULT"){ if(gameMode==="PRACTICE"){skillFocusIdx=0;STATE="SKILL_SELECT";}else{STATE="START";} return; }
  }

  // ---- ENTER: H2H P2 (arrows) submit + advance; all other modes mirror SPACE ----
  if(keyWentDown("enter")){
    if(gameMode==="HEADTOHEAD"){
      if(STATE==="MOVING"){
        if(h2hAtTarget(p2GX,p2GY)){
          roundWinner=2; p2wins++;
          feedbackCorrect=true; lockedGX=targetGX; lockedGY=targetGY;
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
      if(gameMode==="PRACTICE"){skillTranslations=false;skillRotations=false;skillReflections=false;skillFocusIdx=0;STATE="SKILL_SELECT";}else{beginModeFromMenu();}
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
        practiceAttempts++; noteMove(ec, feedbackCorrect);
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
        if((gameMode==="GENIUS"||gameMode==="GEOMETRY"||gameMode==="PRACTICE")&&!feedbackCorrect){ practiceHintType=""; resetRound(); STATE="MOVING"; return; }
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
            if(gameMode==="GENIUS") countGeniusCompletion();   // a full Genius in Training run counts toward unlocking Geometry Genius
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
  if(STATE==="H2H_INTRO"){drawH2HIntro();return;}
  if(STATE==="SKILL_SELECT"){drawSkillSelect();return;}
  if(STATE==="SPEED_RESULT"){drawSpeedResult(); if(unlockPopup) drawUnlockPopup(); return;}
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
      fitText(tl("Move the whole figure!", "¡Mueve toda la figura!"),200,scY+42,sbw,22);
    else
      fitText(tl("Start: (", "Inicio: (")+startGX+", "+startGY+")",200,scY+42,sbw,22);
    drawChallengeLabel(challengeLabel,200,scY+100,sbw,17,[200,230,255]);
    fill(160,200,255);
    if(isRotation(curCh()))fitText(tl("Place pencil at center, then rotate!", "¡Pon el lápiz en el centro y luego gira!"),200,scY+152,sbw,14);
    else if(geomShapeType!==""&&gameMode==="GEOMETRY")fitText(tl("Apply the translation to all vertices", "Aplica la traslación a todos los vértices"),200,scY+152,sbw,14);
    else fitText(tl("Get ready...", "Prepárate..."),200,scY+152,sbw,14);
    // Head-to-Head: big "3-2-1-GO" countdown on top of everything else,
    // building a little race-start tension before the timer unfreezes.
    if(gameMode==="HEADTOHEAD"){
      var cdRemain=showingTimer, cdLabel, cdCol, cdPhaseT;
      if(cdRemain>90){ cdLabel="3"; cdCol=[255,90,90]; cdPhaseT=(120-cdRemain)/30; }
      else if(cdRemain>60){ cdLabel="2"; cdCol=[255,190,60]; cdPhaseT=(90-cdRemain)/30; }
      else if(cdRemain>30){ cdLabel="1"; cdCol=[120,255,140]; cdPhaseT=(60-cdRemain)/30; }
      else { cdLabel=tl("GO!", "¡YA!"); cdCol=[255,230,60]; cdPhaseT=(30-cdRemain)/30; }
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
    if(gameMode==="HEADTOHEAD"&&h2hOnCircle()){
      // Rotation rounds: each player's point can only ride the yellow
      // circle. ONLY up/down rotate it (W/S for P1, up/down arrows for
      // P2): UP = counterclockwise, DOWN = clockwise, same as the tracing
      // paper. Left/right deliberately do nothing so students never
      // confuse left/right with CW/CCW.
      var p2Spin=(keyDown("up")?1:0)-(keyDown("down")?1:0);
      var p1Spin=(keyDown("w")?1:0)-(keyDown("s")?1:0);
      if(p2Spin) { var n2=h2hSpin(p2GX,p2GY,p2Spin); p2GX=n2.x; p2GY=n2.y; }
      if(p1Spin) { var n1=h2hSpin(p1GX,p1GY,p1Spin); p1GX=n1.x; p1GY=n1.y; }
    } else if(gameMode==="HEADTOHEAD"){
      // P2: arrow keys (keyWentDown for grid-locked)
      if(keyWentDown("left") &&p2GX>GRID_MIN)p2GX--;
      if(keyWentDown("right")&&p2GX<GRID_MAX)p2GX++;
      if(keyWentDown("up")   &&p2GY<GRID_MAX)p2GY++;
      if(keyWentDown("down") &&p2GY>GRID_MIN)p2GY--;
      // P1: WASD
      if(keyWentDown("a")&&p1GX>GRID_MIN)p1GX--;
      if(keyWentDown("d")&&p1GX<GRID_MAX)p1GX++;
      if(keyWentDown("w")&&p1GY<GRID_MAX)p1GY++;
      if(keyWentDown("s")&&p1GY>GRID_MIN)p1GY--;
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
    drawFaceAt(toPixelX(p1GX),toPixelY(p1GY),255,80,80,"P1 ("+h2hFmt(p1GX)+","+h2hFmt(p1GY)+")");
    drawFaceAt(toPixelX(p2GX),toPixelY(p2GY),80,160,255,"P2 ("+h2hFmt(p2GX)+","+h2hFmt(p2GY)+")");
  } else if(!isRotation(c)||tracingPhase!=="PAPER"){
    drawPlayer();
  }
  if(STATE==="FEEDBACK")drawFeedback();
  drawHUD();
  drawSprites();
}


// ---------- CHEAT CODE (same combo in every game) ----------
// Hold Shift and press T, A, V together at ANY time while the game is open: max coins, every skin owned, and the harder practice challenges unlocked.
(function () {
  var down = {};
  addEventListener('keyup', function (e) { delete down[e.code]; });
  addEventListener('blur', function () { down = {}; });
  addEventListener('keydown', function (e) {
    down[e.code] = true;
    if (e.repeat || !e.shiftKey || !down.KeyT || !down.KeyA || !down.KeyV) return;
    down = {};
    coins = 999; cheatCoinsUsed = true; practiceMastery = 100;
    ownedSkins = PLAYER_SKINS.map(function (s, i) { return i; });
    saveCoinsAndSkins();
    try { playSound("sound://category_achievements/peaceful_win_1.mp3"); } catch (err) {}
  });
})();
