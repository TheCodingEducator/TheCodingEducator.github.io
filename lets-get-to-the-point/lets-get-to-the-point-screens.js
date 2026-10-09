// ---------- SKILL SELECT SCREEN ----------
function drawSkillSelect() {
  background(10, 15, 38);
  stroke(25, 35, 70); strokeWeight(1);
  for(var gx=0;gx<=400;gx+=30) line(gx,0,gx,400);
  for(var gy=0;gy<=400;gy+=30) line(0,gy,400,gy);

  // Title
  var modeLabel = (gameMode==="GENIUS") ? tl("Genius in Training", "Genio en entrenamiento") :
                  (gameMode==="PRACTICE") ? tl("Practice Mode", "Modo práctica") : tl("Geometry Genius", "Genio de la geometría");
  fill(0,50,120); stroke(0,140,220); strokeWeight(2); rect(20,16,360,62,12);
  fill(0,220,255); noStroke(); textSize(16); textAlign(CENTER,CENTER);
  text(modeLabel, 200, 36);
  fill(140,180,255); textSize(10);
  text(tl("Choose which skills to practice:", "Elige qué destrezas practicar:"), 200, 57);

  var skills = [
    { label:tl("Translations", "Traslaciones"), desc:tl("SLIDING up, down, left, and right", "DESLIZAR arriba, abajo, izquierda y derecha"),    r:0,   g:180, b:255, flag:skillTranslations  },
    { label:tl("Rotations", "Rotaciones"),    desc:tl("TURNING around a center of rotation", "GIRAR alrededor de un centro de rotación"), r:80,  g:220, b:120, flag:skillRotations     },
    { label:tl("Reflections", "Reflexiones"),  desc:tl("FLIPPING over a line of reflection", "VOLTEAR sobre una línea de reflexión"),  r:220, g:80,  b:200, flag:skillReflections   }
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
    text(tl("Select at least one skill to continue", "Elige al menos una destreza para continuar"), 200, 372);
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
var shopMsg = "", shopMsgTimer = 0; // brief tl("not enough coins", "no alcanzan las monedas") feedback
var SKINS_PER_PAGE = 12; // 3 cols x 4 rows per page
var shopPage = 0; // scrolls right/left through PLAYER_SKINS one page at a time
var shopCursor = 0; // keyboard focus in the shop: arrows move it, Space/Enter buys or equips (the page follows it)

function drawShop() {
  background(10, 15, 38);
  stroke(25, 35, 70); strokeWeight(1);
  for(var gx=0;gx<=400;gx+=30) line(gx,0,gx,400);
  for(var gy=0;gy<=400;gy+=30) line(0,gy,400,gy);

  fill(0,50,120); stroke(0,140,220); strokeWeight(2); rect(20,8,360,50,12);
  fill(0,220,255); noStroke(); textAlign(CENTER,CENTER);
  fitText(tl("SHOP: Get a Streak of 3 for a Coin!", "TIENDA: ¡Racha de 3 = 1 moneda!"), 200, 24, 340, 15);
  drawCoinLabel(200, 46, coins, 14);
  textAlign(CENTER,CENTER);

  var totalPages=Math.ceil(PLAYER_SKINS.length/SKINS_PER_PAGE);
  // keyboard: left/right step through the characters, up/down jump a row; Space/Enter buys or equips
  var kR=keyWentDown("right"), kL=keyWentDown("left"), kD=keyWentDown("down"), kU=keyWentDown("up");
  if (kR) shopCursor=Math.min(PLAYER_SKINS.length-1, shopCursor+1);
  if (kL) shopCursor=Math.max(0, shopCursor-1);
  if (kD) shopCursor=Math.min(PLAYER_SKINS.length-1, shopCursor+3);
  if (kU) shopCursor=Math.max(0, shopCursor-3);
  if (kR||kL||kD||kU) shopPage=Math.floor(shopCursor/SKINS_PER_PAGE);
  var shopPick=(keyWentDown("space")||keyWentDown("enter")) ? shopCursor : -1;
  if (shopPage>totalPages-1) shopPage=totalPages-1;
  if (shopPage<0) shopPage=0;
  var pageStart=shopPage*SKINS_PER_PAGE;
  var pageEnd=Math.min(PLAYER_SKINS.length,pageStart+SKINS_PER_PAGE);

  var cols=3, cardW=104, cardH=62, gapX=6, gapY=6;
  var gridW=cols*cardW+(cols-1)*gapX, startX=(400-gridW)/2, startY=64;
  var gridH=4*cardH+3*gapY, gridMidY=startY+gridH/2;

  for (var i=pageStart;i<pageEnd;i++) {
    var sk=PLAYER_SKINS[i];
    var li=i-pageStart;
    var col=li%cols, row=Math.floor(li/cols);
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
    if (sel)       { fill(255,220,60); textSize(8); text(tl("EQUIPPED", "PUESTO"), bx+cardW/2, by+56); }
    else if (owned){ fill(140,220,160); textSize(8); text(tl("OWNED", "TUYO"), bx+cardW/2, by+56); }
    else           { drawCoinLabel(bx+cardW/2, by+56, SKIN_PRICE, 9); }

    if (i===shopCursor) {   // keyboard focus ring
      noFill(); stroke(255,255,255,Math.floor(150+((sin(frameCount*6)+1)*0.5)*105)); strokeWeight(2);
      drawingContext.setLineDash([5,4]); rect(bx-3,by-3,cardW+6,cardH+6,12); drawingContext.setLineDash([]);
    }
    if ((hov && mouseWentDown("left")) || shopPick===i) {
      shopCursor=i;
      if (owned) { equipSkin(i); }
      else if (!buySkin(i)) { shopMsg=tl("Not enough coins!", "¡No alcanzan las monedas!"); shopMsgTimer=60; }
    }
  }

  // ---- SCROLL ARROWS — more characters live off to the right; a left
  // arrow appears once you've scrolled away from the first page ----
  if (totalPages>1) {
    var arrR=16;
    if (shopPage<totalPages-1) {
      var raX=startX+gridW+20, raY=gridMidY;
      var raHov=(dist(mouseX,mouseY,raX,raY)<=arrR);
      fill(raHov?[70,90,180]:[35,45,90]); stroke(120,150,255); strokeWeight(2);
      ellipse(raX,raY,arrR*2,arrR*2);
      fill(255); noStroke(); textAlign(CENTER,CENTER); textSize(16);
      text("▶", raX+1, raY+1);
      if (raHov && mouseWentDown("left")) { shopPage++; shopCursor=shopPage*SKINS_PER_PAGE; }
    }
    if (shopPage>0) {
      var laX=startX-20, laY=gridMidY;
      var laHov=(dist(mouseX,mouseY,laX,laY)<=arrR);
      fill(laHov?[70,90,180]:[35,45,90]); stroke(120,150,255); strokeWeight(2);
      ellipse(laX,laY,arrR*2,arrR*2);
      fill(255); noStroke(); textAlign(CENTER,CENTER); textSize(16);
      text("◀", laX-1, laY+1);
      if (laHov && mouseWentDown("left")) { shopPage--; shopCursor=shopPage*SKINS_PER_PAGE; }
    }
    fill(140,170,255); noStroke(); textSize(8); textAlign(CENTER,CENTER);
    text(tl("Page ", "Página ")+(shopPage+1)+"/"+totalPages, 200, startY-4);
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
  text(tl("BACK", "ATRÁS"), 200, 377);
  fill(150,170,220); textSize(9); text(tl("Arrows: choose  |  SPACE: buy / wear  |  ESC: back", "Flechas: elegir  |  ESPACIO: comprar / usar  |  ESC: atrás"), 200, 350);
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

  if(keyDown("shift")&&keyDown("t")&&keyDown("a")&&keyDown("v")&&!cheatCoinsUsed){
    cheatCoinsUsed=true; coins=999; saveCoinsAndSkins();
  }

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
  text(tl("Rigid Transformations", "Transformaciones rígidas"),200,38);

  // Glowing divider
  var dg=(sin(t*3)+1)*0.5;
  stroke(0,130+dg*90,255,Math.floor(70+dg*110)); strokeWeight(1);
  line(8,52,392,52);

  // ---- MODE CARDS ----
  var modes=[
    {id:"PRACTICE",   tier:tl("LEARNING", "APRENDER"),  name:tl("Practice", "Práctica"),
     tag1:tl("Your own pace!", "¡A tu ritmo!"),   tag2:tl("No timer", "Sin reloj"),
     f1:tl("Choose your skills", "Elige tus destrezas"), f2:tl("Helpful hints", "Pistas útiles"),
     icon:"✓", ir:220, ig:180, ib:255,
     r:70, g:20,  b:120},
    {id:"GENIUS",     tier:tl("GENIUS IN", "GENIO EN"), name:tl("Training", "Entrenamiento"),
     tag1:tl("Solo practice", "Práctica individual"),    tag2:tl("Beat your best time!", "¡Supera tu mejor tiempo!"),
     f1:tl("Hints & retries", "Pistas y reintentos"),    f2:tl("Extra Supports", "Apoyos extra"),
     icon:"★", ir:180, ig:220, ib:255,
     r:0,  g:100, b:200},
    {id:"GEOMETRY",   tier:tl("GEOMETRY", "GENIO DE LA"),  name:tl("Genius", "Geometría"),
     tag1:tl("Challenge mode!", "¡Modo reto!"),  tag2:tl("Prove yourself!", "¡Demuestra lo que sabes!"),
     f1:tl("Advanced Questions", "Preguntas avanzadas"),  f2:tl("Fewer supports", "Menos apoyos"),
     icon:"◆", ir:140, ig:255, ib:180,
     r:0,  g:150, b:65},
    {id:"HEADTOHEAD", tier:tl("HEAD TO", "CARA A"),   name:tl("Head!", "¡Cara!"),
     tag1:tl("2 players battle", "2 jugadores compiten"), tag2:tl("on the same computer!", "¡en la misma computadora!"),
     f1:tl("Fastest one wins!", "¡Gana el más rápido!"),  f2:tl("Best 2 out of 3", "El mejor de 3"),
     icon:"VS", ir:255, ig:160, ib:160,
     r:160,g:25,  b:25}
  ];

  var bw=92, bh=293, gap=4, startX=8, cardTop=57;
  for(var mi=0;mi<4;mi++){
    var m=modes[mi];
    var bx2=startX+mi*(bw+gap), by2=cardTop;
    var cx=bx2+bw/2;
    var sel=(gameMode===m.id);
    // Suppressed once DOWN has moved keyboard focus to the Shop bar, so the
    // previously-selected mode card fully drops its "selected" look (glow,
    // brightened body, lit-up PLAY button) instead of still reading as
    // selected while the Shop also shows its own focus ring - only one
    // thing should look focused at a time.
    var selVisual=sel&&!startFocusIsShop;
    var hov=(mouseX>=bx2&&mouseX<=bx2+bw&&mouseY>=by2&&mouseY<=by2+bh);
    if(hov) startFocusIsShop=false;
    var p2=(sin(t*3)+1)*0.5;

    // Card glow
    if(selVisual){
      fill(m.r,m.g,m.b,Math.floor(18+p2*32)); noStroke();
      rect(bx2-6,by2-6,bw+12,bh+12,18);
    }

    // Card body
    var bR=selVisual?Math.min(255,m.r+50):hov?Math.min(255,m.r+25):m.r;
    var bG=selVisual?Math.min(255,m.g+50):hov?Math.min(255,m.g+25):m.g;
    var bB=selVisual?Math.min(255,m.b+50):hov?Math.min(255,m.b+25):m.b;
    fill(bR,bG,bB);
    stroke(selVisual?255:hov?200:110,selVisual?255:hov?180:85,selVisual?220:hov?90:55);
    strokeWeight(selVisual?3:hov?2:1);
    rect(bx2,by2,bw,bh,14);

    // Gold keyboard-focus border - only on the mode cards while focus
    // hasn't moved down to the Shop bar (see startFocusIsShop)
    if(selVisual){
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
    fill(selVisual?255:215,selVisual?250:235,255); noStroke(); textAlign(CENTER,CENTER);
    fitText(m.f1, cx, by2+124, bw-12, 11);
    fitText(m.f2, cx, by2+142, bw-12, 11);

    // Icon area — glowing circles + large symbol
    var iconY=by2+213;
    fill(m.ir,m.ig,m.ib,Math.floor(selVisual?20+p2*20:10)); noStroke();
    ellipse(cx,iconY,92,92);
    fill(m.ir,m.ig,m.ib,Math.floor(selVisual?42+p2*32:22)); noStroke();
    ellipse(cx,iconY,60,60);
    fill(m.ir,m.ig,m.ib,Math.floor(selVisual?185+p2*70:105));
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
      text(hs2>0?tl("Best: ", "Mejor: ")+hs2.toFixed(2)+"s":tl("No record yet", "Aún sin récord"),cx,by2+bh-56);
    }

    // PLAY button
    var pA=selVisual?Math.floor(190+p2*65):hov?155:85;
    fill(255,220,60,pA); noStroke();
    rect(bx2+12,by2+bh-46,bw-24,28,10);
    if(selVisual){
      noFill(); stroke(255,255,255,Math.floor(80+p2*80));
      strokeWeight(1); rect(bx2+14,by2+bh-44,bw-28,24,8);
    }
    fill(selVisual?10:35); noStroke(); textSize(13); textAlign(CENTER,CENTER);
    text(tl("PLAY", "JUGAR"),cx,by2+bh-32);

    // Geometry Genius stays locked until Genius in Training is fully completed 3 times
    var locked=(m.id==="GEOMETRY"&&geometryLocked());
    if(locked){
      fill(8,12,30,242); noStroke(); rect(bx2,by2+58,bw,bh-58,0,0,14,14);
      var shake=(frameCount-lockNoticeFrame<24)?sin(frameCount*60)*3:0;
      // padlock
      var lx=cx+shake, ly=by2+112;
      noFill(); stroke(255,220,60); strokeWeight(5); arc(lx,ly-6,26,30,180,360);
      noStroke(); fill(255,220,60); rect(lx-17,ly-6,34,28,5);
      fill(8,12,30); ellipse(lx,ly+5,7,7); rect(lx-1.5,ly+5,3,8);
      fill(255); textAlign(CENTER,CENTER);
      fitText(tl("LOCKED", "BLOQUEADO"), cx, by2+154, bw-12, 15);
      fill(200,215,255);
      fitText(tl("Finish Genius", "Termina Genio"), cx, by2+178, bw-10, 11);
      fitText(tl("in Training", "en entrenamiento"), cx, by2+193, bw-10, 11);
      fitText(GEOMETRY_UNLOCK_RUNS+tl(" times", " veces"), cx, by2+208, bw-10, 11);
      // progress toward the unlock
      fill(0,0,0,140); rect(bx2+14,by2+bh-64,bw-28,16,5);
      fill(255,220,100); textSize(10);
      text(Math.min(geniusCompletions,GEOMETRY_UNLOCK_RUNS)+" / "+GEOMETRY_UNLOCK_RUNS+tl(" done", " hechas"),cx,by2+bh-56);
      fill(90,95,120); rect(bx2+12,by2+bh-46,bw-24,28,10);
      fill(200); fitText(tl("LOCKED", "BLOQUEADO"),cx,by2+bh-32,bw-34,13);
    }

    if(hov&&mouseWentDown("left")){
      if(locked){ lockNoticeFrame=frameCount; playSound('wrong'); continue; }
      gameMode=m.id; modeIndex=mi;
      if(gameMode==="PRACTICE"){
        skillTranslations=false; skillRotations=false; skillReflections=false;   // students pick their skills
        skillFocusIdx=0; STATE="SKILL_SELECT";
      } else { beginModeFromMenu(); }
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
  fill(220,200,255); textSize(17); textStyle(BOLD); text(tl("SHOP", "TIENDA"),205,shopBarY+shopBarH/2+1); textStyle(NORMAL);
  drawCoinLabel(352, shopBarY+shopBarH/2+1, coins, 13);
  if(shopHov&&mouseWentDown("left")){STATE="SHOP";}

  drawSprites();
}

// ---------- SPEED RESULT SCREEN ----------
// Shown over the results screen right after the third full Genius in Training run
function drawUnlockPopup(){
  var t=frameCount, p2=(sin(t*3)+1)*0.5;
  fill(0,0,0,170); noStroke(); rect(0,0,400,400);
  // confetti
  for(var ci=0;ci<30;ci++){
    var cfx=((ci*71)+Math.floor(sin(t*0.9+ci*20)*25)+400)%400, cfy=(ci*29+t*1.1)%400;
    var crs=[255,255,0,80,60,200], cgs=[60,200,255,200,255,60], cbs=[60,60,255,60,100,255];
    fill(crs[ci%6],cgs[ci%6],cbs[ci%6]); rect(cfx,cfy,7,7,2);
  }
  var s=1+0.04*p2;
  push(); translate(200,200); scale(s);
  fill(0,150,65,Math.floor(40+p2*40)); rect(-160,-128,320,256,22);
  fill(12,40,28); stroke(140,255,180); strokeWeight(3); rect(-150,-118,300,236,18);
  noStroke(); textAlign(CENTER,CENTER);
  fill(255,220,60); textSize(15); text(tl("NEW MODE UNLOCKED!", "¡NUEVO MODO DESBLOQUEADO!"),0,-92);
  fill(140,255,180,Math.floor(170+p2*85)); textSize(46); text("◆",0,-44);
  fill(255); textSize(28); text(tl("Geometry Genius", "Genio de la geometría"),0,4);
  fill(200,235,215); textSize(12);
  text(tl("You finished Genius in Training ", "Terminaste Genio en entrenamiento ")+GEOMETRY_UNLOCK_RUNS+tl(" times.", " veces."),0,38);
  text(tl("The challenge mode is now open on the menu!", "¡El modo reto ya está abierto en el menú!"),0,56);
  fill(255,220,60,Math.floor(150+p2*105)); textSize(12);
  text(tl("Press SPACE or click to continue", "Presiona ESPACIO o haz clic para continuar"),0,92);
  pop();
}

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

  var modeName=(gameMode==="GENIUS")?tl("Genius in Training", "Genio en entrenamiento"):tl("Geometry Genius", "Genio de la geometría");
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
    text(tl("NEW RECORD!", "¡NUEVO RÉCORD!"),200,48);
    fill(cr,cg2,50); textSize(36);
    text(tl("NEW RECORD!", "¡NUEVO RÉCORD!"),200,46);

    // Animated star
    var starScale=1+p2*0.18;
    fill(255,220,60,Math.floor(180+p2*75)); textSize(Math.floor(52*starScale));
    text("★",200,108+(sin(t*2)*5));

    // Time — large
    fill(0,220,255); textSize(42); noStroke();
    text(timerFinished.toFixed(2)+"s",200,182);
    fill(140,220,255); textSize(13);
    text(tl("NEW BEST — ", "NUEVO RÉCORD — ")+modeName,200,208);

    // Previous record comparison
    stroke(255,200,0,50); strokeWeight(1); line(50,222,350,222); noStroke();
    if(prevBest>0){
      fill(255,200,80); textSize(18);
      text(tl("Previous best:  ", "Récord anterior:  ")+prevBest.toFixed(2)+"s",200,252);
      var imp=((prevBest-timerFinished)/prevBest*100);
      fill(120,255,160); textSize(22);
      text(imp.toFixed(1)+tl("% faster!", "% más rápido!"),200,283);
    } else {
      fill(180,255,180); textSize(22);
      text(tl("First record set!", "¡Primer récord!"),200,262);
      fill(140,220,150); textSize(13);
      text(tl("You're on the board!", "¡Ya estás en la tabla!"),200,288);
    }

  } else {
    // Non-record screen — evenly spaced layout
    var curBest=(gameMode==="GENIUS"?hsGenius:hsGeometry);

    // Title
    fill(0,180,255); textSize(32); textAlign(CENTER,CENTER); noStroke();
    text(tl("GREAT JOB!", "¡BUEN TRABAJO!"),200,40);

    // Mode label
    fill(140,200,255); textSize(13);
    text(modeName,200,68);

    // Divider
    stroke(80,140,255,60); strokeWeight(1); line(40,82,360,82); noStroke();

    // YOUR TIME
    fill(100,200,255); textSize(12); textAlign(CENTER,CENTER); noStroke();
    text(tl("YOUR TIME", "TU TIEMPO"),200,100);
    fill(0,220,255); textSize(42);
    text(timerFinished.toFixed(2)+"s",200,136);

    if(curBest>0){
      // Divider
      stroke(80,140,255,60); strokeWeight(1); line(60,158,340,158); noStroke();

      // BEST TIME
      fill(220,190,60); textSize(12); textAlign(CENTER,CENTER); noStroke();
      text(tl("BEST TIME", "MEJOR TIEMPO"),200,176);
      fill(255,220,80); textSize(42);
      text(curBest.toFixed(2)+"s",200,212);

      // Divider
      stroke(255,100,100,60); strokeWeight(1); line(60,232,340,232); noStroke();

      // SLOWER THAN YOUR BEST
      var pctSlower=((timerFinished-curBest)/curBest*100);
      fill(220,100,100); textSize(12); textAlign(CENTER,CENTER); noStroke();
      text(tl("SLOWER THAN YOUR BEST", "MÁS LENTO QUE TU RÉCORD"),200,252);
      fill(255,120,120); textSize(38);
      text("+"+pctSlower.toFixed(1)+"%",200,287);
    } else {
      // No record yet
      stroke(80,180,80,60); strokeWeight(1); line(60,194,340,194); noStroke();
      fill(180,255,180); textSize(20);
      text(tl("No record yet!", "¡Aún sin récord!"),200,240);
      fill(140,220,140); textSize(12);
      text(tl("Finish again to set your first best time", "Termina otra vez para fijar tu primer récord"),200,268);
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
  text(tl("MENU", "MENÚ"),122,326);

  // PLAY AGAIN button
  fill(s2?10:r2h?0:20, s2?210:r2h?190:140, s2?125:r2h?110:70);
  stroke(s2?80:0, s2?255:210, s2?80:110); strokeWeight(s2?3:2);
  rect(215,308,125,36,13);
  if(s2){ noFill(); stroke(255,220,60,190); strokeWeight(2); rect(217,310,121,32,11); }
  fill(255); noStroke(); textSize(12);
  text(tl("PLAY AGAIN", "JUGAR OTRA VEZ"),277,326);

  fill(150,170,220); textSize(9);
  text(tl("◄ ► = switch   SPACE = select", "◄ ► = cambiar   ESPACIO = elegir"),200,365);

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
    text(tl("PRACTICE COMPLETE!", "¡PRÁCTICA TERMINADA!"),200,106);
    fill(180,200,255); textSize(12);
    text(tl("You finished all ", "Terminaste las ")+TOTAL_ROUNDS+tl(" questions.", " preguntas."),200,136);
    // CHANGE SKILLS button (left)
    var ws1=(mouseX>=44&&mouseX<=188&&mouseY>=190&&mouseY<=228);
    fill(ws1?50:30,ws1?60:35,ws1?160:120); stroke(80,80,210); strokeWeight(2);
    rect(44,190,144,38,12);
    fill(255); noStroke(); textSize(10); text(tl("CHANGE SKILLS", "CAMBIAR DESTREZAS"),116,209);
    // PRACTICE AGAIN button (right)
    var ws2=(mouseX>=212&&mouseX<=356&&mouseY>=190&&mouseY<=228);
    fill(ws2?0:10,ws2?160:110,ws2?90:60); stroke(0,190,90); strokeWeight(2);
    rect(212,190,144,38,12);
    fill(255); noStroke(); textSize(10); text(tl("PRACTICE AGAIN", "PRACTICAR OTRA VEZ"),284,209);
    fill(200,220,255); textSize(9); text(tl("(same skills)", "(mismas destrezas)"),284,226);
    // MENU button (center, below)
    var ws3=(mouseX>=130&&mouseX<=270&&mouseY>=248&&mouseY<=278);
    fill(ws3?40:20,ws3?50:30,ws3?130:90); stroke(60,80,180); strokeWeight(2);
    rect(130,248,140,30,10);
    fill(255); noStroke(); textSize(10); text(tl("MAIN MENU", "MENÚ PRINCIPAL"),200,263);
    if(ws1&&mouseWentDown("left")){skillFocusIdx=0;STATE="SKILL_SELECT";}
    if(ws2&&mouseWentDown("left")){resetGame();}
    if(ws3&&mouseWentDown("left")){STATE="START";}
    drawSprites(); return;
  }

  fill(10,50,30); stroke(0,180,90); strokeWeight(2); rect(30,75,340,240,16);
  fill(80,255,160); noStroke(); textSize(26); textAlign(CENTER,CENTER);
  text(tl("YOU WIN!", "¡GANASTE!"),200,120);
  fill(200,240,255); textSize(12);
  text(tl("All ", "Las ")+TOTAL_ROUNDS+tl(" rounds complete!", " rondas terminadas!"),200,152);
  if(gameMode==="HEADTOHEAD"){
    var w=p1wins>p2wins?tl("Player 1 wins!", "¡Gana el Jugador 1!"):p2wins>p1wins?tl("Player 2 wins!", "¡Gana el Jugador 2!"):tl("It's a tie!", "¡Empate!");
    fill(p1wins>p2wins?[255]:[100],p1wins>p2wins?[100]:[160],p1wins>p2wins?[100]:[255]);
    if(p1wins>p2wins)fill(255,100,100);
    else if(p2wins>p1wins)fill(100,160,255);
    else fill(255,220,100);
    textSize(16); text(w,200,186);
    fill(200,220,255); textSize(12);
    text("P1: "+p1wins+tl(" rounds   P2: ", " rondas   J2: ")+p2wins+tl(" rounds", " rondas"),200,212);
    if (h2hWinner) {
      var pulse=(sin(t*4)+1)*0.5;
      fill(255,220,60,Math.floor(150+pulse*105));
      textSize(Math.floor(30+pulse*4));
      text("🏆", 200, 240);
    }
  } else {
    fill(200,240,255); textSize(14); text(tl("All 3 rounds complete!", "¡Las 3 rondas terminadas!"),200,186);
  }
  fill(0,120,55); stroke(0,180,90); strokeWeight(2); rect(125,270,150,36,17);
  fill(255); noStroke(); textSize(12); text(tl("Play Again (SPACE)", "Otra vez (ESPACIO)"),200,288);
  drawSprites();
}

function drawGameOver(){
  background(18,5,5);
  fill(50,8,8); stroke(180,40,40); strokeWeight(2); rect(30,80,340,200,16);
  fill(255,80,80); noStroke(); textSize(26); textAlign(CENTER,CENTER); text(tl("GAME OVER", "FIN DEL JUEGO"),200,130);
  fill(200,220,255); textSize(11);
  text(tl("Round ", "Ronda ")+(round+1)+tl(" of ", " de ")+TOTAL_ROUNDS,200,175);
  fill(0,80,130); stroke(0,140,200); strokeWeight(2); rect(125,248,150,34,17);
  fill(255); noStroke(); textSize(12); text(tl("Try Again (SPACE)", "Reintentar (ESPACIO)"),200,265);
  drawSprites();
}
