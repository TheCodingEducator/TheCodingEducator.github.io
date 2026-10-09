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
    text(tl("STEP 1: Use arrow keys to move pencil to center of rotation", "PASO 1: Usa las flechas para llevar el lápiz al centro de rotación"),200,bannerTop+12);
    fill(140,170,220); textSize(10);
    text(tl("Then press SPACE to pin it there", "Luego presiona ESPACIO para fijarlo ahí"),200,bannerTop+26);
    for (var gx2=GRID_MIN;gx2<=GRID_MAX;gx2++)
      for (var gy2=GRID_MIN;gy2<=GRID_MAX;gy2++) {
        noFill(); stroke(80,120,200,80); strokeWeight(1);
        ellipse(toPixelX(gx2),toPixelY(gy2),10,10);
      }
    var spx=toPixelX(pencilGX),spy=toPixelY(pencilGY);
    fill(255,220,60,60); noStroke(); ellipse(spx,spy,24,24);
    drawTag(spx, spy-24, "("+pencilGX+","+pencilGY+")", 255,220,60);
    drawPencil(pencilX,pencilY);
    // Ends well above the bottom instruction bar (376-400) - it used to
    // reach into that bar's territory and visually collide with its
    // "Arrow keys: move pencil..." hint text.
    if (drawButton(140,340,120,28,tl("CONFIRM CENTER", "CONFIRMAR CENTRO"),0,140,60)) confirmCenter();
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
      var arcLbl=absDeg===0?"0°":paperSignedAngle>0?absDeg+tl("° CCW", "° antihorario"):absDeg+tl("° CW", "° horario");
      text(arcLbl,alx,aly);
    }

    drawPencil(cx,cy);
    fill(255,60,60); noStroke(); ellipse(cx,cy,10,10);
    fill(255); ellipse(cx,cy,4,4);

    if (drawButton(8,350,130,26,tl("< Change Center (C)", "< Cambiar centro (C)"),60,30,100) || keyWentDown("c")) {   // C key = the same as clicking it
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
    fill(255,100,100); textSize(12); text("P1: "+p1wins+tl(" wins", " victorias"),  67, pCY);
    fill(20,20,50);    rect(141,pY,pW,pH,7);
    fill(210,210,255); textSize(12); text(tl("Round ", "Ronda ")+(round+1)+" / "+TOTAL_ROUNDS, 200,pCY);
    fill(10,10,55);    rect(274,pY,pW,pH,7);
    fill(100,160,255); textSize(12); text("P2: "+p2wins+tl(" wins", " victorias"),  333,pCY);
  } else if(gameMode==="PRACTICE"){
    fill(topicR,topicG,topicB,200); rect(8,  pY,pW,pH,7);
    fill(255);         textSize(13); text(topicName(topicLabel),              67, pCY);
    fill(50,38,0);     rect(141,pY,pW,pH,7);
    fill(255,210,60);  textSize(13); text(tl("Q #", "P #")+practiceQNum, 200,pCY);
    // Pill 3: active skills indicator (no timer)
    var skStr=(skillTranslations?"T ":"")+(skillRotations?"R ":"")+(skillReflections?"F":"");
    fill(20,0,40);     rect(274,pY,pW,pH,7);
    fill(200,160,255); textSize(11); text(tl("Skills: ", "Destrezas: ")+skStr.trim(), 333,pCY);
  } else {
    // Pill 1: Transformation type (topic colour background)
    fill(topicR,topicG,topicB,200); rect(8,  pY,pW,pH,7);
    fill(255);         textSize(13); text(topicName(topicLabel),              67, pCY);
    // Pill 2: Round number
    fill(50,38,0);     rect(141,pY,pW,pH,7);
    fill(255,210,60);  textSize(13); text(tl("Round ", "Ronda ")+(round+1)+" / "+TOTAL_ROUNDS, 200,pCY);
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
    drawChallengeLabel(challengeLabel,200,43,250,13,[255,255,255]);
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
    drawChallengeLabel(challengeLabel,200,43,364,13,[255,255,255]);
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
    text(practiceMastery>=50?tl("MASTERY ", "DOMINIO ")+practiceMastery+tl("% — harder questions unlocked!", "% — ¡preguntas más difíciles desbloqueadas!"):tl("MASTERY ", "DOMINIO ")+practiceMastery+"%", 200, mbY+mbH/2);
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
      text(h2hOnCircle()?tl("UP = CCW   DOWN = CW  |  P1: W/S + Space   P2: Arrows + Enter", "ARRIBA = antihorario   ABAJO = horario  |  J1: W/S + Espacio   J2: Flechas + Enter"):tl("P1: WASD + Space   |   P2: Arrows + Enter", "J1: WASD + Espacio   |   J2: Flechas + Enter"),200,388);
    } else if(isRotation(ch)&&tracingPhase==="PAPER"){
      if(gameMode!=="GEOMETRY") text(tl("UP=CCW  DOWN=CW  |  SPACE: submit", "ARRIBA=antihorario  ABAJO=horario  |  ESPACIO: enviar"),hintCX,388);
      else text(tl("SPACE: submit answer", "ESPACIO: enviar respuesta"),hintCX,388);
    } else if(isRotation(ch)&&tracingPhase==="PENCIL"){
      text(tl("Arrow keys: move pencil  |  SPACE: confirm center", "Flechas: mover el lápiz  |  ESPACIO: confirmar centro"),hintCX,388);
    } else {
      text(tl("Arrow keys: move  |  SPACE: submit", "Flechas: mover  |  ESPACIO: enviar"),hintCX,388);
    }
  }

  // MENU button — bottom-left corner, all modes
  if(STATE==="SHOWING"||STATE==="MOVING"||STATE==="FEEDBACK"){
    var mbHov=(mouseX>=5&&mouseX<=61&&mouseY>=379&&mouseY<=395);
    fill(mbHov?110:65,mbHov?55:35,mbHov?155:110);
    stroke(120,70,180); strokeWeight(1); rect(5,379,56,16,6);
    fill(255); noStroke(); textSize(9); textAlign(CENTER,CENTER);
    text(tl("MENU", "MENÚ"),33,388);
    if(mbHov&&mouseWentDown("left")){ exitConfirmPending=true; exitConfirmSel=1; }
  }
}

function drawExitConfirmOverlay(){
  fill(8,10,18); noStroke(); rect(0,0,400,400);
  fill(255); textAlign(CENTER,CENTER); textSize(20);
  text(tl("Exit to Main Menu?", "¿Salir al menú principal?"),200,150);
  fill(180,190,220); textSize(13);
  text(tl("Your progress this round will be lost.", "Se perderá tu progreso en esta ronda."),200,178);

  var hoverYes=(mouseX>=60&&mouseX<=190&&mouseY>=225&&mouseY<=270);
  var hoverNo=(mouseX>=210&&mouseX<=340&&mouseY>=225&&mouseY<=270);
  if(hoverYes) exitConfirmSel=0;
  if(hoverNo) exitConfirmSel=1;
  var selYes=(exitConfirmSel===0), selNo=(exitConfirmSel===1);
  fill(selYes?220:180,60,60); stroke(255); strokeWeight(selYes?4:2); rect(60,225,130,45,10);
  fill(selNo?40:20,selNo?190:150,selNo?90:70); stroke(255); strokeWeight(selNo?4:2); rect(210,225,130,45,10);
  fill(255); noStroke(); textSize(14);
  text(tl("YES, EXIT", "SÍ, SALIR"),125,247); text(tl("CANCEL", "CANCELAR"),275,247);
  fill(180,190,220); textSize(10);
  text(tl("Arrow keys: choose  |  Enter/Space: confirm  |  Esc: cancel", "Flechas: elegir  |  Enter/Espacio: confirmar  |  Esc: cancelar"),200,300);

  if(mouseWentDown("left")){
    if(hoverYes){ exitConfirmPending=false; STATE="START"; }
    else if(hoverNo){ exitConfirmPending=false; }
  }
  if(keyWentDown("left")||keyWentDown("right")||keyWentDown("up")||keyWentDown("down")) exitConfirmSel=1-exitConfirmSel;
  if(keyWentDown("escape")){ exitConfirmPending=false; return; }
  if(keyWentDown("space")||keyWentDown("enter")){
    if(exitConfirmSel===0){ exitConfirmPending=false; STATE="START"; }
    else { exitConfirmPending=false; }
  }
}

function drawTimeoutPopup(){
  fill(8,10,18); noStroke(); rect(0,0,400,400);
  fill(255); textAlign(CENTER,CENTER); textStyle(BOLD); textSize(22);
  if(timeoutPopupState==="expired"){
    text(tl("Time Expired", "Se acabó el tiempo"),200,165);
    fill(180,190,220); textSize(13); textStyle(NORMAL);
    text(tl("This session has been open a while.", "Esta sesión lleva un buen rato abierta."),200,192);

    var hoverMenu=(mouseX>=150&&mouseX<=250&&mouseY>=225&&mouseY<=268);
    fill(hoverMenu?"#1f8f4a":"#27ae60"); stroke(255); strokeWeight(2); rect(150,225,100,43,10);
    fill(255); noStroke(); textSize(15); textStyle(BOLD);
    text(tl("MENU", "MENÚ"),200,247); textStyle(NORMAL);

    if((mouseWentDown("left")&&hoverMenu)||keyWentDown("space")||keyWentDown("enter")){ timeoutPopupState="none"; STATE="START"; }
  } else {
    text(tl("Still there?", "¿Sigues ahí?"),200,165);
    fill(180,190,220); textSize(13); textStyle(NORMAL);
    text(tl("Tap below or press SPACE to keep going.", "Toca abajo o presiona ESPACIO para seguir."),200,192);

    var hoverYes=(mouseX>=100&&mouseX<=300&&mouseY>=225&&mouseY<=270);
    fill(hoverYes?"#229954":"#27ae60"); stroke(255); strokeWeight(2); rect(100,225,200,45,10);
    fill(255); noStroke(); textSize(16); textStyle(BOLD);
    text(tl("YES, I'M HERE", "SÍ, AQUÍ ESTOY"),200,247); textStyle(NORMAL);

    if((mouseWentDown("left")&&hoverYes)||keyWentDown("space")||keyWentDown("enter")){ timeoutPopupState="none"; timerStart=Date.now(); }
  }
}

// ---------- DRAW HELPERS ----------

// ---------- LABEL COLLISION AVOIDANCE ----------
// Several markers on the grid (start point, current point, target,
// translation/reflection distance callouts) can all land on or near the
// same spot, especially early in a translation/reflection when the player
// hasn't moved far from the start point yet - their little black-background
// coordinate/distance tags used to just draw on top of each other and
// become unreadable. resetLabelPlacement() clears the list of tags placed
// this frame; placeLabelPos() nudges a requested tag position to the
// nearest nearby spot that doesn't overlap any tag already placed this
// frame, trying progressively farther offsets until it finds a clear one.
var frameLabelRects = [];
function resetLabelPlacement(){ frameLabelRects = []; }
function labelRectsOverlap(a,b){ return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }
function placeLabelPos(cx, cy, w, h){
  var step=h+3;
  var candidates=[
    {x:0,y:0},
    {x:0,y:step},{x:0,y:-step},{x:w+4,y:0},{x:-(w+4),y:0},
    {x:w+4,y:step},{x:-(w+4),y:step},{x:w+4,y:-step},{x:-(w+4),y:-step},
    {x:0,y:step*2},{x:0,y:-step*2},{x:w+4,y:step*2},{x:-(w+4),y:step*2},
    {x:0,y:step*3},{x:0,y:-step*3}
  ];
  for (var i=0;i<candidates.length;i++){
    var tx=cx+candidates[i].x, ty=cy+candidates[i].y;
    var box={x:tx-w/2, y:ty-h/2, w:w, h:h};
    var collide=false;
    for (var j=0;j<frameLabelRects.length;j++){
      if (labelRectsOverlap(box, frameLabelRects[j])) { collide=true; break; }
    }
    if (!collide){ frameLabelRects.push(box); return {x:tx, y:ty}; }
  }
  // Every candidate collided - draw at the original spot rather than
  // searching forever; still counts as "placed" so later tags avoid it.
  frameLabelRects.push({x:cx-w/2, y:cy-h/2, w:w, h:h});
  return {x:cx, y:cy};
}
// A small black-background coordinate/distance tag, centered at (cx,cy),
// automatically nudged clear of any other tag already drawn this frame.
function drawTag(cx, cy, txt, r, g, b){
  var w=txt.length*6+14, h=15;
  var pos=placeLabelPos(cx, cy, w, h);
  fill(0,0,0,180); noStroke(); rect(pos.x-w/2, pos.y-h/2, w, h, 4);
  fill(r,g,b); textSize(9); textAlign(CENTER,CENTER); noStroke();
  text(txt, pos.x, pos.y);
}

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
      drawTag(pv[i].x, pv[i].y-20, "("+(startGX+all[i].ox)+", "+(startGY+all[i].oy)+")", c[0],c[1],c[2]);
    }
    return;
  }
  var px=toPixelX(startGX),py=toPixelY(startGY);
  noFill(); stroke(150,180,255); strokeWeight(1); ellipse(px,py,28,28);
  drawTag(px, py-22, "("+startGX+", "+startGY+")", 150,180,255);
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
  var labelAbove=(py-38>66);
  var tagCY=labelAbove?py-31:py+33;
  drawTag(px, tagCY, label, 80,220,255);
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
    // Twinkling stars scattered just outside the face's own edge, at a
    // few different radii/sizes so they read as a starfield rather than
    // a single ring sitting exactly on the circle boundary (which would
    // be half-covered by the base fill drawn right after this).
    noStroke();
    for (var gi=0; gi<10; gi++){
      var ga=gi*36+frameCount*0.6;
      var gr=18+((gi*7)%9);
      var gtw=(sin(frameCount*5+gi*2)+1)/2;
      fill(255,255,255,Math.floor(90+gtw*140));
      ellipse(px+cos(ga)*gr,py+sin(ga)*gr,1.5+gtw*1.5,1.5+gtw*1.5);
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
  } else if (style==="panda") {
    // Big round black eye patches instead of small default dots
    fill(20,20,25); ellipse(px-6,py-3,9,10); ellipse(px+6,py-3,9,10);
    fill(255); ellipse(px-6,py-4,3,3); ellipse(px+6,py-4,3,3);
    fill(20,20,25); ellipse(px-6,py-4.5,1.6,1.6); ellipse(px+6,py-4.5,1.6,1.6);
    stroke(30,30,80); strokeWeight(1); noFill();
    for(var pdi=0;pdi<10;pdi++){ var pda1=25+(130/10)*pdi, pda2=25+(130/10)*(pdi+1);
      line(px+cos(pda1)*5,py+1.5+sin(pda1)*3.5,px+cos(pda2)*5,py+1.5+sin(pda2)*3.5); }
  } else if (style==="ninja") {
    // A dark mask covers the lower face, just narrow eye slits visible.
    // Given a light stroke of its own so its edge still reads clearly
    // even on a skin whose base color is already dark.
    fill(15,15,18); stroke(120,120,135); strokeWeight(1); rect(px-9,py-1,18,15,6);
    stroke(255,255,255,220); strokeWeight(1.5); noFill();
    line(px-6,py-3,px-2,py-3); line(px+2,py-3,px+6,py-3);
  } else if (style==="pirate") {
    // One normal eye, the other under a patch with a strap across the face
    fill(30,30,80); ellipse(px-3.5,py-2.5,3,3); fill(255); ellipse(px-3,py-3,1,1);
    fill(20,20,20); ellipse(px+4,py-2.5,7,7);
    stroke(20,20,20); strokeWeight(2); line(px-6,py-6,px+7,py-1);
    stroke(30,30,80); strokeWeight(1); noFill();
    for(var pri=0;pri<10;pri++){ var pra1=25+(130/10)*pri, pra2=25+(130/10)*(pri+1);
      line(px+cos(pra1)*5,py+1.5+sin(pra1)*3.5,px+cos(pra2)*5,py+1.5+sin(pra2)*3.5); }
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
  if (style==="panda") {
    // Round ears peeking out from behind the top corners of the head -
    // given a light stroke so they stay visible against a dark background
    // too, not just against the (usually pale) face.
    fill(20,20,25); stroke(150,150,160); strokeWeight(1);
    ellipse(px-11,py-12,10,10); ellipse(px+11,py-12,10,10);
  }
  if (style==="ninja") {
    // Headband with knotted tails flicking off to the side
    fill(180,30,30); stroke(120,15,15); strokeWeight(1);
    rect(px-11,py-14,22,5,2); noStroke();
    triangle(px+11,py-13, px+19,py-8, px+11,py-9);
    triangle(px+11,py-9, px+18,py-2, px+10,py-5);
  }
  if (style==="pirate") {
    // Triangular bandana knotted at the back
    fill(150,30,30); stroke(100,15,15); strokeWeight(1);
    triangle(px-11,py-13, px+11,py-13, px,py-24);
    rect(px-11,py-15,22,4,2); noStroke();
    triangle(px+11,py-14, px+18,py-9, px+11,py-10);
  }
  if (style==="wizard") {
    // Tall pointed hat, slightly tipped, with a small star
    fill(70,40,130); stroke(40,20,80); strokeWeight(1);
    rect(px-11,py-15,22,4,2);
    triangle(px-8,py-14, px+8,py-14, px-1,py-34);
    fill(255,215,0); noStroke(); textAlign(CENTER,CENTER); textSize(7);
    text("★", px-1, py-22);
  }
  if (style==="astronaut") {
    // A glass helmet dome (with a highlight streak) and a small antenna
    noFill(); stroke(200,220,255,200); strokeWeight(2);
    ellipse(px,py,34,34);
    noStroke(); fill(255,255,255,60);
    arc(px,py,30,30,200,260);
    stroke(180,180,190); strokeWeight(2); line(px+9,py-13,px+9,py-20);
    noStroke(); fill(255,60,60); ellipse(px+9,py-21,4,4);
  }
  if (style==="vampire") {
    // Two small fangs below the mouth, and a widow's-peak hairline
    fill(255); noStroke();
    triangle(px-3,py+4, px-1,py+4, px-2,py+8);
    triangle(px+1,py+4, px+3,py+4, px+2,py+8);
    fill(Math.max(fr-70,0),Math.max(fg-70,0),Math.max(fb-70,0));
    triangle(px-6,py-15, px+6,py-15, px,py-9);
  }
  if (style==="unicorn") {
    // A spiral-striped horn and a flowing rainbow mane tuft
    fill(255,250,230); stroke(230,210,150); strokeWeight(1);
    triangle(px-3,py-14, px+3,py-14, px,py-27);
    stroke(255,200,220); strokeWeight(1.5); noFill();
    line(px-2,py-16,px+1,py-20); line(px-1,py-19,px+2,py-23);
    var maneColors=[[255,120,150],[255,190,110],[255,240,120],[150,230,150],[130,190,255]];
    noStroke();
    for(var uni=0;uni<5;uni++){
      fill(maneColors[uni][0],maneColors[uni][1],maneColors[uni][2]);
      ellipse(px+10+uni*1.2, py-8+uni*4, 6,6);
    }
  }
  if (style==="knight") {
    // Steel helmet dome over the top of the face (eyes stay visible below
    // the visor line), with a red plume
    fill(150,155,170); stroke(225,228,240); strokeWeight(1.5);
    arc(px,py-5,32,32,180,360,CHORD);
    stroke(60,60,75); strokeWeight(2); line(px-15,py-5,px+15,py-5);
    fill(220,40,50); stroke(140,20,30); strokeWeight(1);
    triangle(px-3,py-20, px+3,py-20, px+9,py-31);
    triangle(px-3,py-20, px+3,py-20, px+2,py-29);
  }
  if (style==="bee") {
    // Translucent wings, antennae, and black stripes across the top/bottom
    fill(190,235,255,200); stroke(150,200,235); strokeWeight(1);
    ellipse(px-11,py-19,9,14); ellipse(px+11,py-19,9,14);
    stroke(30,30,30); strokeWeight(1.5); noFill();
    line(px-4,py-14,px-8,py-24); line(px+4,py-14,px+8,py-24);
    noStroke(); fill(30,30,30);
    ellipse(px-8,py-25,3.5,3.5); ellipse(px+8,py-25,3.5,3.5);
    stroke(30,30,30); strokeWeight(3);
    line(px-10,py-11,px+10,py-11); line(px-12,py+9,px+12,py+9);
  }
  if (style==="clown") {
    // A rainbow tuft of hair across the top and a big red nose
    var clownColors=[[255,80,80],[255,180,60],[255,240,80],[100,220,120],[100,180,255]];
    noStroke();
    for(var cli=0;cli<5;cli++){
      fill(clownColors[cli][0],clownColors[cli][1],clownColors[cli][2]);
      ellipse(px-14+cli*7, py-14, 8,8);
    }
    fill(255,40,40); stroke(180,20,20); strokeWeight(1);
    ellipse(px,py+2,7,7);
  }

  // ---- Coordinate label (same as drawFaceAt) - skipped when label is empty ----
  if (label) {
    var labelAbove=(py-38>66);
    var tagCY=labelAbove?py-31:py+33;
    drawTag(px, tagCY, label, 80,220,255);
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
      drawTag(pv[i].x, pv[i].y-22, "("+(targetGX+all[i].ox)+", "+(targetGY+all[i].oy)+")", c[0],c[1],c[2]);
    }
    return;
  }
  var px=toPixelX(targetGX),py=toPixelY(targetGY);
  var pulse=abs(sin(frameCount*0.1))*8;
  noFill(); stroke(255,220,0); strokeWeight(2); ellipse(px,py,30+pulse,30+pulse);
  drawTag(px, py-24, "("+targetGX+", "+targetGY+")", 255,220,0);
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
    text(tl("You rotated the right amount but the wrong direction!", "¡Giraste bien la cantidad, pero al revés!"),200,197);

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
    text(tl("CW","↻"),lcx,lcy);
    fill(255,140,60); textSize(12);
    text(tl("Clockwise", "Horario"),lcx,lcy+lr+15);
    text(tl("(like a clock)", "(como el reloj)"),lcx,lcy+lr+29);

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
    text(tl("CCW","↺"),rcx,rcy);
    fill(100,180,255); textSize(12);
    text(tl("Counter-Clockwise", "Antihorario"),rcx,rcy+rr+15);
    text(tl("(opposite of clock)", "(al revés del reloj)"),rcx,rcy+rr+29);
  }

  // Wrong degree amount diagram
  if (hintType==="degrees") {
    fill(220,220,255); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text(tl("Each 90° = one right-angle turn.", "Cada 90° = un giro de ángulo recto."),200,198);

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
    var armLabels=[tl("Start: 0°", "Inicio: 0°"),"90°","180°","270°"];
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
    text(tl("Make sure you set the center of rotation first,", "Primero fija el centro de rotación,"),200,210);
    text(tl("then rotate the paper until the point hits the target!", "¡luego gira el papel hasta que el punto llegue a la meta!"),200,228);
  }

  // ---- REFLECTION HINTS ----
  if (hintType==="reflect_wrong_axis") {
    var ch2=curCh();
    var correctAxis=(ch2.type==="reflect_x")?tl("x-axis", "eje x"):tl("y-axis", "eje y");
    var wrongAxis  =(ch2.type==="reflect_x")?tl("y-axis", "eje y"):tl("x-axis", "eje x");
    fill(255,100,100); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text(tl("You reflected over the ", "¡Reflejaste sobre el ")+wrongAxis+"!",200,200);
    fill(255,200,60); textSize(12);
    text(tl("This question asks you to reflect over the ", "Esta pregunta pide reflejar sobre el ")+correctAxis+".",200,218);
    // Mini axis diagram
    var axcx=200, axcy=272, axr=34;
    stroke(80,80,80); strokeWeight(1);
    line(axcx-axr-14,axcy,axcx+axr+14,axcy);
    line(axcx,axcy-axr-14,axcx,axcy+axr+14);
    if(ch2.type==="reflect_x"){
      stroke(100,220,255); strokeWeight(3); line(axcx-axr,axcy,axcx+axr,axcy);
      fill(100,220,255); noStroke(); textSize(10); text(tl("x-axis ← reflect over this!", "eje x ← ¡refleja sobre este!"),axcx,axcy+axr+16);
      fill(180,80,80); textSize(10); text(tl("y-axis", "eje y"),axcx+axr+18,axcy-7);
    } else {
      stroke(100,220,255); strokeWeight(3); line(axcx,axcy-axr,axcx,axcy+axr);
      fill(100,220,255); noStroke(); textSize(10); text(tl("y-axis ← reflect over this!", "eje y ← ¡refleja sobre este!"),axcx,axcy-axr-12);
      fill(180,80,80); textSize(10); text(tl("x-axis", "eje x"),axcx+axr+18,axcy-7);
    }
    fill(255,220,60); noStroke(); ellipse(axcx-16,axcy-16,7,7);
    fill(255,220,60); textSize(9); text("you",axcx-16,axcy-26);
  }

  if (hintType==="reflect_no_move") {
    fill(255,200,60); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text(tl("You didn't move!", "¡No te moviste!"),200,205);
    fill(220,220,255); textSize(12);
    text(tl("Reflecting means flipping the point across the axis.", "Reflejar es voltear el punto al otro lado del eje."),200,224);
    text(tl("Move to the other side and submit.", "Muévete al otro lado y envía."),200,242);
  }

  if (hintType==="reflect_other") {
    fill(255,200,60); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text(tl("Reflecting flips the point straight across the axis.", "Reflejar voltea el punto en línea recta al otro lado del eje."),200,210);
    fill(220,220,255); textSize(12);
    text(tl("Only one coordinate changes — the other stays the same.", "Solo cambia una coordenada — la otra se queda igual."),200,229);
  }

  // ---- TRANSLATION HINTS ----
  if (hintType==="translate_negated") {
    fill(255,100,100); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text(tl("You went the exact OPPOSITE direction!", "¡Fuiste en la dirección exactamente CONTRARIA!"),200,205);
    fill(255,200,60); textSize(12);
    text(tl("+ x means RIGHT,  − x means LEFT", "+ x es DERECHA,  − x es IZQUIERDA"),200,226);
    text(tl("+ y means UP,  − y means DOWN", "+ y es ARRIBA,  − y es ABAJO"),200,244);
  }

  if (hintType==="translate_wrong_x") {
    var ch3=curCh();
    var xDir=(ch3.dx>0)?tl("right","a la derecha"):tl("left","a la izquierda");
    fill(255,150,80); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text(tl("Your left/right direction was wrong!", "¡Tu dirección izquierda/derecha estuvo mal!"),200,205);
    fill(255,200,60); textSize(12);
    text(tl("The x value ", "El valor x ")+(ch3.dx>0?"+":"−")+Math.abs(ch3.dx)+tl(" means ", " significa ")+(Math.abs(ch3.dx)===1?tl("1 unit", "1 unidad"):Math.abs(ch3.dx)+tl(" units", " unidades"))+" "+xDir+".",200,226);
    text(tl("Positive x (+) = RIGHT,  Negative x (−) = LEFT", "x positiva (+) = DERECHA,  x negativa (−) = IZQUIERDA"),200,244);
  }

  if (hintType==="translate_wrong_y") {
    var ch4=curCh();
    var yDir=(ch4.dy>0)?tl("up","hacia arriba"):tl("down","hacia abajo");
    fill(255,150,80); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text(tl("Your up/down direction was wrong!", "¡Tu dirección arriba/abajo estuvo mal!"),200,205);
    fill(255,200,60); textSize(12);
    text(tl("The y value ", "El valor y ")+(ch4.dy>0?"+":"−")+Math.abs(ch4.dy)+tl(" means ", " significa ")+(Math.abs(ch4.dy)===1?tl("1 unit", "1 unidad"):Math.abs(ch4.dy)+tl(" units", " unidades"))+" "+yDir+".",200,226);
    text(tl("Positive y (+) = UP,  Negative y (−) = DOWN", "y positiva (+) = ARRIBA,  y negativa (−) = ABAJO"),200,244);
  }

  if (hintType==="translate_missing_y") {
    fill(255,200,60); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text(tl("You only moved left/right!", "¡Solo te moviste a la izquierda/derecha!"),200,205);
    fill(220,220,255); textSize(12);
    text(tl("Don't forget to also move up or down.", "No olvides moverte también arriba o abajo."),200,226);
    text(tl("Translations move BOTH x and y.", "Las traslaciones mueven x Y y."),200,244);
  }

  if (hintType==="translate_missing_x") {
    fill(255,200,60); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text(tl("You only moved up/down!", "¡Solo te moviste arriba/abajo!"),200,205);
    fill(220,220,255); textSize(12);
    text(tl("Don't forget to also move left or right.", "No olvides moverte también a la izquierda o derecha."),200,226);
    text(tl("Translations move BOTH x and y.", "Las traslaciones mueven x Y y."),200,244);
  }

  if (hintType==="translate_swapped") {
    fill(255,150,80); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text(tl("You swapped the x and y values!", "¡Intercambiaste los valores de x y y!"),200,205);
    fill(255,200,60); textSize(12);
    text(tl("The FIRST number (x) = move LEFT or RIGHT.", "El PRIMER número (x) = mover a la IZQUIERDA o DERECHA."),200,226);
    text(tl("The SECOND number (y) = move UP or DOWN.", "El SEGUNDO número (y) = mover ARRIBA o ABAJO."),200,244);
  }

  if (hintType==="translate_no_move") {
    fill(255,200,60); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text(tl("You didn't move!", "¡No te moviste!"),200,210);
    fill(220,220,255); textSize(12);
    text(tl("Use the arrow keys to slide the point.", "Usa las flechas para deslizar el punto."),200,231);
  }

  if (hintType==="translate_other") {
    fill(255,200,60); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text(tl("Count the units carefully!", "¡Cuenta las unidades con cuidado!"),200,210);
    fill(220,220,255); textSize(12);
    text(tl("Move exactly the right amount in each direction.", "Muévete exactamente lo necesario en cada dirección."),200,229);
  }

  if (hintType==="generic") {
    fill(255,200,60); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text(tl("Review the challenge label and try again!", "¡Revisa el reto y vuelve a intentarlo!"),200,218);
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
    var wName=roundWinner===1?tl("Player 1", "Jugador 1"):tl("Player 2", "Jugador 2");
    if(roundWinner===1){fill(255,100,100);}else{fill(100,160,255);}
    fitText(wName+tl(" scores!", " ¡anota!"),cx,cardY+44,bw,22);
    fill(255); fitText(tl("Correct: (", "Correcto: (")+targetGX+", "+targetGY+")",cx,cardY+100,bw,20);
    fill(255,220,60); fitText("P1: "+p1wins+"  |  P2: "+p2wins,cx,cardY+132,bw,20);
    stroke(255,255,255,50); strokeWeight(1);
    line(cardX+20,cardY+157,cardX+cardW-20,cardY+157); noStroke();
    fill(200,220,255); fitText(tl("SPACE or ENTER", "ESPACIO o ENTER"),cx,cardY+196,bw,15);
    return;
  }

  // ---- CORRECT via a 0° "rotation" on a 360° question ----
  if(feedbackCorrect&&isZeroFor360){
    fill(255); fitText(tl("CORRECT!", "¡CORRECTO!"),cx,cardY+44,bw,28);
    fill(230,250,255); fitText("("+lockedGX+", "+lockedGY+")",cx,cardY+96,bw,22);
    fill(255,230,80); fitText(tl("Nice! A rotation of 0 degree is the same", "¡Bien! Una rotación de 0 grados es igual"),cx,cardY+140,bw,14);
    fitText(tl("as 360 degrees! A full circle!", "a una de 360 grados. ¡Una vuelta completa!"),cx,cardY+158,bw,14);
    fill(200,220,255); fitText(tl("SPACE to continue", "ESPACIO para continuar"),cx,cardY+208,bw,15);
    return;
  }

  // ---- CORRECT with equivalent rotation (other direction, same endpoint) ----
  if(feedbackCorrect&&equivalentRotation){
    fill(255); fitText(tl("CORRECT!", "¡CORRECTO!"),cx,cardY+44,bw,28);
    fill(230,250,255); fitText("("+lockedGX+", "+lockedGY+")",cx,cardY+96,bw,22);
    fill(255,230,80); fitText(tl("Nice — going the other direction", "¡Bien! Ir en la otra dirección"),cx,cardY+140,bw,14);
    fitText(tl("reaches the same point!", "¡llega al mismo punto!"),cx,cardY+158,bw,14);
    fill(200,220,255); fitText(tl("SPACE to continue", "ESPACIO para continuar"),cx,cardY+208,bw,15);
    return;
  }

  // ---- CORRECT (all non-H2H modes) ----
  if(feedbackCorrect){
    fill(255); fitText(tl("CORRECT!", "¡CORRECTO!"),cx,cardY+44,bw,28);
    fill(230,250,255); fitText("("+lockedGX+", "+lockedGY+")",cx,cardY+100,bw,22);
    fill(200,220,255); fitText(tl("SPACE to continue", "ESPACIO para continuar"),cx,cardY+163,bw,15);
    return;
  }

  // ---- WRONG: rotation hint (all modes) ----
  // cardH=310 for diagram hints, 260 for text hints; prompt anchored 28px from card bottom.
  if(showRotHint){
    fill(255); fitText(tl("NOT QUITE!", "¡CASI!"),cx,cardY+30,bw,22);
    fill(230,250,255); fitText(tl("You: (", "Tú: (")+lockedGX+", "+lockedGY+")",cx,cardY+60,bw,16);
    fitText(tl("Correct: (", "Correcto: (")+targetGX+", "+targetGY+")",cx,cardY+82,bw,16);
    drawPracticeHintGraphic(practiceHintType, cardY-90);
    var contLabel=(gameMode==="GEOMETRY")?tl("SPACE to continue", "ESPACIO para continuar"):tl("SPACE to try again", "ESPACIO para reintentar");
    fill(200,220,255); fitText(contLabel,cx,cardY+cardH-28,bw,15);
    return;
  }

  // ---- WRONG: PRACTICE non-rotation hints ----
  if(gameMode==="PRACTICE"){
    fill(255); fitText(tl("NOT QUITE!", "¡CASI!"),cx,cardY+30,bw,22);
    fill(230,250,255); fitText(tl("You chose (", "Elegiste (")+lockedGX+", "+lockedGY+")",cx,cardY+60,bw,15);
    fitText(tl("Correct: (", "Correcto: (")+targetGX+", "+targetGY+")",cx,cardY+82,bw,15);
    drawPracticeHintGraphic(practiceHintType, cardY-90);
    fill(200,220,255); fitText(tl("SPACE to try again", "ESPACIO para reintentar"),cx,cardY+cardH-28,bw,15);
    return;
  }

  // ---- WRONG: GENIUS ----
  if(gameMode==="GENIUS"){
    fill(255); fitText(tl("NOT QUITE!", "¡CASI!"),cx,cardY+40,bw,22);
    fill(230,250,255); fitText(tl("You: (", "Tú: (")+lockedGX+", "+lockedGY+")",cx,cardY+90,bw,20);
    fitText(tl("Correct: (", "Correcto: (")+targetGX+", "+targetGY+")",cx,cardY+118,bw,20);
    fill(200,220,255); fitText(tl("SPACE to try again", "ESPACIO para reintentar"),cx,cardY+178,bw,15);
    return;
  }

  // ---- WRONG: GEOMETRY / default ----
  fill(255); fitText(tl("NOT QUITE!", "¡CASI!"),cx,cardY+40,bw,22);
  fill(230,250,255); fitText(tl("You: (", "Tú: (")+lockedGX+", "+lockedGY+")",cx,cardY+90,bw,20);
  fitText(tl("Correct: (", "Correcto: (")+targetGX+", "+targetGY+")",cx,cardY+118,bw,20);
  fill(200,220,255); fitText(tl("SPACE to continue", "ESPACIO para continuar"),cx,cardY+178,bw,15);
}

// ---------- HEAD-TO-HEAD ROTATION CIRCLE ----------
// On rotation rounds a player's point is confined to the yellow circle
// (centered on the rotation center, through the start point) and can be
// anywhere on it, not just grid intersections. Submitting only wins when
// the point is very close to the correct answer.
var H2H_SPIN_DEG = 3;        // degrees per frame while a spin key is held
var H2H_WIN_DIST = 0.4;      // grid units from the target that still counts

function h2hOnCircle() {
  var ch=curCh();
  return gameMode==="HEADTOHEAD" && ch && isRotation(ch);
}
function h2hSpin(gx, gy, dir) {
  var ch=curCh();
  var r=Math.sqrt(Math.pow(startGX-ch.cx,2)+Math.pow(startGY-ch.cy,2));
  var a=Math.atan2(gy-ch.cy, gx-ch.cx)+dir*H2H_SPIN_DEG*Math.PI/180;
  return { x: ch.cx+r*Math.cos(a), y: ch.cy+r*Math.sin(a) };
}
function h2hAtTarget(gx, gy) {
  if (!h2hOnCircle()) return gx===targetGX && gy===targetGY;
  return Math.sqrt(Math.pow(gx-targetGX,2)+Math.pow(gy-targetGY,2)) <= H2H_WIN_DIST;
}
// Whole numbers print as-is; in-between positions on the circle get 1 decimal
function h2hFmt(v) { var r=Math.round(v*10)/10; return String(r); }

// ---------- HEAD-TO-HEAD INTRO POPUP ----------
// Shown every time Head-to-Head is picked from the menu, before the match
// starts, so nobody launches it alone by accident.
var h2hIntroFrame = 0;
function beginModeFromMenu() {
  if (gameMode==="GEOMETRY" && geometryLocked()) { lockNoticeFrame=frameCount; playSound('wrong'); return; }
  if (gameMode==="HEADTOHEAD") { h2hIntroFrame=frameCount; STATE="H2H_INTRO"; }
  else resetGame();
}

function drawH2HIntro() {
  background(10,15,38);
  stroke(25,35,70); strokeWeight(1);
  for(var gx=0;gx<=400;gx+=30) line(gx,0,gx,400);
  for(var gy=0;gy<=400;gy+=30) line(0,gy,400,gy);

  // Panel + header
  fill(20,12,22); stroke(220,70,70); strokeWeight(3); rect(12,8,376,384,16);
  fill(170,30,30); noStroke(); rect(12,8,376,56,16); rect(12,40,376,24);
  fill(255); textAlign(CENTER,CENTER); textStyle(BOLD);
  fitText(tl("HEAD-TO-HEAD: 2 PLAYERS!", "CARA A CARA: ¡2 JUGADORES!"),200,26,350,21);
  textStyle(NORMAL); fill(255,225,225); fitText(tl("A two-player battle - you can't play this one alone", "Una batalla de dos jugadores: no se puede jugar solo"),200,50,350,11);

  // The big, can't-miss requirement
  fill(60,45,0); stroke(255,220,60); strokeWeight(3); rect(24,74,352,62,12);
  var pulse=(sin(frameCount*5)+1)/2;
  noFill(); stroke(255,220,60,Math.floor(60+pulse*160)); strokeWeight(2); rect(20,70,360,70,14);
  fill(255,225,80); noStroke(); textStyle(BOLD);
  fitText(tl("BEFORE YOU START:", "ANTES DE EMPEZAR:"),200,90,330,13);
  fill(255); fitText(tl("Make sure 2 players are ready", "Asegúrate de que haya 2 jugadores listos"),200,109,330,16);
  fitText(tl("at THIS SAME computer!", "¡en ESTA MISMA computadora!"),200,127,330,16);
  textStyle(NORMAL);

  // Controls for each player
  fill(60,14,14); stroke(255,100,100); strokeWeight(2); rect(24,148,170,50,10);
  fill(15,20,65); stroke(100,160,255); rect(206,148,170,50,10);
  noStroke(); textStyle(BOLD);
  fill(255,120,120); fitText(tl("PLAYER 1", "JUGADOR 1"),109,163,150,13);
  fill(120,170,255); fitText(tl("PLAYER 2", "JUGADOR 2"),291,163,150,13);
  textStyle(NORMAL); fill(255);
  fitText(tl("W A S D + SPACE", "W A S D + ESPACIO"),109,183,155,12);
  fitText(tl("Arrow keys + ENTER", "Flechas + ENTER"),291,183,155,12);

  // Instructions
  fill(0,220,255); textStyle(BOLD); fitText(tl("HOW TO PLAY", "CÓMO JUGAR"),200,214,300,13); textStyle(NORMAL);
  var lines=[
    tl("1. A point and a challenge appear on the grid.", "1. Aparecen un punto y un reto en la cuadrícula."),
    tl("2. Race to move YOUR point to the correct spot.", "2. Corre a llevar TU punto al lugar correcto."),
    tl("    (Rotations: hold UP = CCW or DOWN = CW to", "    (Rotaciones: mantén ARRIBA = antihorario o ABAJO = horario"),
    tl("    slide around the yellow circle. W/S or arrows.)", "    para girar por el círculo amarillo. W/S o flechas.)"),
    tl("3. Very close? Press your submit key.", "3. ¿Muy cerca? Presiona tu tecla de enviar."),
    tl("4. First player to submit the right spot wins", "4. El primero en enviar el lugar correcto gana"),
    tl("    the round. Best 2 out of 3 wins the match!", "    la ronda. ¡Gana el mejor de 3!")
  ];
  fill(225,235,255); textAlign(LEFT,CENTER); textSize(11);
  for(var li=0;li<lines.length;li++) text(lines[li],32,234+li*16);
  textAlign(CENTER,CENTER);

  var startNow=drawButton(50,342,150,34,tl("START GAME", "EMPEZAR"),0,140,60);
  var goBack=drawButton(215,342,135,34,tl("BACK", "ATRÁS"),60,30,100);
  var canKey=(frameCount-h2hIntroFrame)>3;
  if(startNow||(canKey&&(keyWentDown("space")||keyWentDown("enter")))) resetGame();
  else if(goBack) STATE="START";
  fill(160,180,230); noStroke(); textSize(9); textAlign(CENTER,CENTER);
  text(tl("Press SPACE or ENTER to start  |  ESC to go back", "ESPACIO o ENTER para empezar  |  ESC para regresar"),200,384);
  drawSprites();
}
