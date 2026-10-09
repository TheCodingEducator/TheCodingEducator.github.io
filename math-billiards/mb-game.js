// Math Billiards - the game: modes (Practice, Vs Computer, Two Players), turns, the aim-solve-shoot loop, mistakes
// shown on the table, growing help, the computer's visible work, menus, the shop, statistics and the tutorial.
(function () {
  var MB = window.MB, V = MB.V, T = MB.T, TB = MB.TABLE, R = MB.R, Rd = MB.Render, $ = MB.$, save = MB.save;
  var W = MB.W, H = MB.H;
  var app = $('#mb'), stage = $('#stage'), cv = $('#cv'), hud = $('#hud'), side = $('#side'), ov = $('#ov');
  MB.calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (MB.calm) stage.classList.add('calm');
  Rd.init(cv);

  // ------------------------------------------------------------------ fitting the 1280 x 720 stage into its box
  var scale = 1, Q = 1;
  function fit() {
    var r = app.getBoundingClientRect(); if (!r.width || !r.height) return;
    scale = Math.min(r.width / W, r.height / H);
    stage.style.transform = 'translate(' + (-W * scale / 2) + 'px,' + (-H * scale / 2) + 'px) scale(' + scale + ')';
    var q = Math.min(2, Math.max(1, (window.devicePixelRatio || 1) * scale));
    if (Math.abs(q - Q) > 0.05 || cv.width !== Math.round(W * q)) { Q = q; cv.width = Math.round(W * Q); cv.height = Math.round(H * Q); Rd.setQ(Q); }
  }
  window.addEventListener('resize', fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(app);
  fit();

  var resetBtn = $('#reset-progress-btn');
  if (resetBtn) resetBtn.addEventListener('click', function () {
    if (!confirm(T('Reset your Math Billiards progress? This erases your coins, cues, tables, ball styles and shot effects on this device. This cannot be undone.',
      '¿Borrar tu progreso de Math Billiards? Se borran tus monedas, tacos, mesas, estilos de bolas y efectos en este dispositivo. No se puede deshacer.'))) return;
    MB.resetSave(); location.reload();
  });

  // ------------------------------------------------------------------ the game state
  var G = {
    mode: null, diff: save.diff, skills: save.skills.slice(), balls: [], phase: 'menu', paused: true,
    aim: { dir: { x: 1, y: 0 }, power: 0.5 }, problem: null, wrongs: 0, wrongX: null, closed: false, t: 0, timer: 0,
    players: [], turn: 0, stats: [], path: [], rightPath: null, lastSkill: null, pocketedNow: [], started: 0, coinsAtStart: 0
  };
  MB.G = G;
  function cue() { return G.balls[0]; }
  function human() { return G.mode !== 'cpu' || G.turn === 0; }
  function newStats() {
    var by = {}; MB.SKILLS.forEach(function (s) { by[s.id] = { q: 0, first: 0 }; });
    return { q: 0, first: 0, wrongs: 0, solved: 0, coins: 0, shots: 0, by: by };
  }
  function curStats() { return G.stats[G.mode === 'two' ? G.turn : 0]; }

  // ------------------------------------------------------------------ little helpers for the screen
  var toastT = null;
  function toast(msg, col) { var t = $('#toast'); if (!msg) return; t.textContent = msg; t.style.color = col || '#eef3fb'; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, msg.length > 40 ? 3200 : 1900); }
  function banner(msg) { var b = $('#banner'); b.innerHTML = '<span>' + msg + '</span>'; MB.say(msg); }
  function coinFly() {
    var c = document.createElement('div'); c.className = 'coinfly'; c.innerHTML = '+1 <i class="cn" aria-hidden="true"></i>'; c.style.left = '1090px'; c.style.top = '250px';
    stage.appendChild(c); setTimeout(function () { c.remove(); }, 1200);
    var chip = $('#hud .coin'); if (chip) { chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); }
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function on(id, fn) { var b = document.getElementById(id); if (b) b.addEventListener('click', function () { MB.Sound.play('click'); fn(); }); }
  function showOv(html, focusSel) {
    ov.innerHTML = html; ov.hidden = false; G.paused = true;
    setTimeout(function () { var f = ov.querySelector(focusSel || '.primary') || ov.querySelector('button'); if (f) f.focus(); }, 30);
  }
  function hideOv() { ov.hidden = true; ov.innerHTML = ''; G.paused = false; }

  // ------------------------------------------------------------------ the top bar
  function modeName() { return G.mode === 'practice' ? T('Practice', 'Práctica') : G.mode === 'cpu' ? T('Vs Computer', 'Contra la computadora') : T('Two Players', 'Dos jugadores'); }
  function diffName() { return MB.DIFFS.filter(function (d) { return d.id === G.diff; })[0].name; }
  function drawHud() {
    hud.hidden = false;
    hud.innerHTML = '<span class="logo">MATH BILLIARDS</span><span class="mode">' + modeName() + ' · ' + diffName() + '</span><span class="grow"></span>' +
      '<span class="chip coin" aria-label="' + T('Coins: ', 'Monedas: ') + save.coins + '"><i class="cn" aria-hidden="true"></i> ' + save.coins + '</span>' +
      '<button class="hbtn" id="h-sound" aria-pressed="' + save.sound + '" aria-label="' + T('Sound', 'Sonido') + '">' + (save.sound ? '🔊' : '🔇') + '</button>' +
      '<button class="hbtn" id="h-menu" aria-label="' + T('Menu (Esc)', 'Menú (Esc)') + '">☰ ' + T('Menu', 'Menú') + '</button>';
    $('#h-sound').addEventListener('click', toggleSound);
    $('#h-menu').addEventListener('click', function () { MB.Sound.play('click'); pauseMenu(); });
  }
  function toggleSound() { save.sound = !save.sound; MB.store(); if (save.sound) { MB.Sound.unlock(); MB.Sound.play('click'); } if (!hud.hidden) drawHud(); }

  // ------------------------------------------------------------------ the side panel
  function rackCanvas(group) {
    var n = G.balls.filter(function (b) { return b.kind === group; }), c = document.createElement('canvas'), r = 9;
    c.width = Math.round(7 * 21 * Q); c.height = Math.round(22 * Q); c.style.width = 7 * 21 + 'px'; c.style.height = '22px';
    var x = c.getContext('2d'); x.scale(Q, Q);
    n.forEach(function (b, i) { x.globalAlpha = b.on ? 1 : 0.18; Rd.ballIcon(x, b.kind, b.num, 11 + i * 21, 11, r); });
    return c;
  }
  function turnCard() {
    if (G.mode === 'practice') return '<div class="sp"><div class="turn"><span class="who">' + T('Practice', 'Práctica') + '</span><span class="tag open">' + diffName() + '</span></div>' +
      '<div class="keys" style="margin-top:6px">' + G.skills.map(function (s) { return MB.SKILLS.filter(function (k) { return k.id === s; })[0].name; }).join(' · ') + '</div></div>';
    var p = G.players[G.turn];
    var tag = p.group ? '<span class="tag ' + p.group + '">' + MB.groupName(p.group) + '</span>' : '<span class="tag open">' + T('Open table', 'Mesa abierta') + '</span>';
    return '<div class="sp"><div class="turn"><span class="who">' + esc(p.name) + '</span>' + tag + '</div>' +
      '<div class="racks"><span>' + T('Red', 'Rojas') + '</span><span id="rk-red"></span><span>' + T('Blue', 'Azules') + '</span><span id="rk-blue"></span></div>' +
      (G.players[0].group ? '<div class="keys" style="margin-top:4px">' + G.players.map(function (q) { return esc(q.name) + ': ' + MB.groupName(q.group); }).join(' · ') + '</div>' : '') + '</div>';
  }
  function fillRacks() {
    var a = $('#rk-red'), b = $('#rk-blue');
    if (a) a.appendChild(rackCanvas('red')); if (b) b.appendChild(rackCanvas('blue'));
  }
  function sideAim() {
    side.hidden = false;
    side.innerHTML = turnCard() +
      '<div class="sp"><div class="phase">' + T('Your shot', 'Tu tiro') + '</div><div class="big">' + T('Aim · Power · Shoot', 'Apunta · Fuerza · Tira') + '</div>' +
      '<ul class="keys k-touch"><li><b>' + T('Aim:', 'Apuntar:') + '</b> ' + T('drag on the table; ◀ ▶ to fine-tune', 'arrastra en la mesa; ◀ ▶ para afinar') + '</li><li><b>' + T('Power:', 'Fuerza:') + '</b> ' + T('the slider', 'el control deslizante') + '</li><li><b>' + T('Shoot:', 'Tirar:') + '</b> ' + T('the button below', 'el botón de abajo') + '</li></ul>' +
      '<ul class="keys k-desk"><li><b>' + T('Aim:', 'Apuntar:') + '</b> ' + T('move the pointer, or', 'mueve el puntero, o') + ' <span class="kbd">←</span> <span class="kbd">→</span> (' + T('Shift = fine', 'Mayús = fino') + ')</li>' +
      '<li><b>' + T('Power:', 'Fuerza:') + '</b> ' + T('hold and drag back, or', 'mantén y arrastra hacia atrás, o') + ' <span class="kbd">↑</span> <span class="kbd">↓</span></li>' +
      '<li><b>' + T('Shoot:', 'Tirar:') + '</b> ' + T('let go, or', 'suelta, o') + ' <span class="kbd">Enter</span> / <span class="kbd">' + T('Space', 'Espacio') + '</span></li></ul></div>' +
      '<div class="sp power"><label for="pw"><span>' + T('Power', 'Fuerza') + '</span><span id="pwv">' + Math.round(G.aim.power * 100) + '%</span></label>' +
      '<input type="range" id="pw" min="5" max="100" step="1" value="' + Math.round(G.aim.power * 100) + '">' +
      '<div class="pbar" aria-hidden="true"><i id="pwbar" style="width:' + Math.round(G.aim.power * 100) + '%"></i></div></div>' +
      '<div class="sp fine"><button class="hbtn" id="b-left" aria-label="' + T('Turn the aim left', 'Girar a la izquierda') + '">◀</button><span>' + T('Fine aim', 'Afinar') + '</span><button class="hbtn" id="b-right" aria-label="' + T('Turn the aim right', 'Girar a la derecha') + '">▶</button></div>' +
      '<div class="grow"></div><button class="go" id="b-shoot">' + T('TAKE THE SHOT ▶', 'TIRAR ▶') + '</button>';
    fillRacks();
    var pw = $('#pw');
    pw.addEventListener('input', function () { G.aim.power = pw.value / 100; powerShown(); });
    $('#b-shoot').addEventListener('click', function () { takeShot(); });
    holdToTurn($('#b-left'), -1); holdToTurn($('#b-right'), 1);
  }
  // the fine-aim buttons: a tap turns the cue a quarter of a degree; holding keeps turning, faster after a moment
  function holdToTurn(btn, sgn) {
    if (!btn) return;
    var timer = null, n = 0;
    function turn() { if (G.phase === 'aim') G.aim.dir = V.rot(G.aim.dir, sgn * (n > 12 ? 1 : 0.25)); n++; }
    function stop() { clearInterval(timer); timer = null; }
    btn.addEventListener('pointerdown', function (e) { e.preventDefault(); n = 0; turn(); stop(); timer = setInterval(turn, 70); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { btn.addEventListener(ev, stop); });
    btn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); n = 0; turn(); } });
  }
  function powerShown() {
    var v = Math.round(G.aim.power * 100), a = $('#pwv'), b = $('#pwbar'), c = $('#pw');
    if (a) a.textContent = v + '%'; if (b) b.style.width = v + '%'; if (c && document.activeElement !== c) c.value = v;
  }
  function sidePlace() {
    side.hidden = false;
    side.innerHTML = turnCard() + '<div class="sp"><div class="phase">' + T('Cue ball in hand', 'Bola blanca en mano') + '</div><div class="big">' + T('Place the cue ball', 'Coloca la bola blanca') + '</div>' +
      '<ul class="keys"><li>' + T('Click a free spot on the table, or move it with the arrow keys and press', 'Haz clic en un lugar libre, o muévela con las flechas y pulsa') + ' <span class="kbd">Enter</span>.</li></ul></div><div class="grow"></div>' +
      '<button class="go" id="b-place">' + T('PLACE IT HERE', 'COLOCAR AQUÍ') + '</button>';
    fillRacks();
    $('#b-place').addEventListener('click', placeCue);
  }
  // the help that comes back with the same problem after each wrong answer
  function hintHtml(p, level) {
    if (level <= 0) return '';
    // level 1: where to look; 2: the relationship and the equation; 3: the operation; 4: the answer. (For equal
    // angles the equation already is the answer, so level 2 says it in words and level 3 gives the number.)
    var sol = MB.solution(p), h = '<div class="hint">', shown = {}, eqFinal = p.final.type === 'eq';
    function eq(t, cls) { if (shown[t]) return ''; shown[t] = 1; return '<span class="eq"' + (cls ? ' style="color:#ffd23f"' : '') + '>' + esc(t) + '</span>'; }
    h += '<span>' + esc(p.look) + '</span>';
    if (level >= 2) sol.lines.forEach(function (l, i) {
      var last = i === sol.lines.length - 1;
      h += '<span class="nm">' + esc(l.name) + '</span><span>' + esc(l.rule) + '</span>';
      if (last && eqFinal && level < 3) h += '<span class="eq">' + T('x = the marked angle', 'x = el ángulo marcado') + '</span>';
      else h += eq(l.eq);
    });
    if (level >= 3) h += eq(sol.op);
    if (level >= 4) h += eq(sol.answer, true);
    return h + '</div>';
  }
  function sideProblem() {
    var p = G.problem;
    side.hidden = false;
    // Beginner names the idea in plain words; the other levels leave it to the student to see
    var lead = G.diff === 'beginner' && G.wrongs === 0 ? '<div class="keys">' + esc(p.look) + '</div>' : '';
    side.innerHTML = turnCard() +
      '<div class="sp"><div class="phase">' + (G.wrongs ? T('Try again', 'Inténtalo de nuevo') : T('Solve for x', 'Halla x')) + '</div>' +
      '<div class="big">' + T('Solve for x', 'Halla x') + '</div>' + lead +
      '<div class="ansrow"><label for="ans" class="xx">x =</label><input id="ans" inputmode="numeric" autocomplete="off" maxlength="3" aria-label="' + T('x in degrees', 'x en grados') + '"><span>°</span></div>' +
      '<div class="msg" id="msg" role="alert"></div>' + hintHtml(p, G.wrongs) + '</div>' +
      '<div class="grow"></div><button class="go" id="b-sub">' + T('SHOOT ▶', 'TIRAR ▶') + '</button>' +
      (G.wrongs === 0 ? '<button class="go alt" id="b-reaim">' + T('◀ Change my aim (Esc)', '◀ Cambiar el tiro (Esc)') + '</button>' : '');
    fillRacks();
    var inp = $('#ans');
    inp.addEventListener('input', function () { var v = inp.value.replace(/[^0-9]/g, '').slice(0, 3); if (v !== inp.value) inp.value = v; $('#msg').textContent = ''; MB.Sound.play('type'); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); submit(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); reAim(); }
    });
    $('#b-sub').addEventListener('click', submit);
    on('b-reaim', reAim);
    setTimeout(function () { inp.focus(); }, 40);
  }
  function sideExplain() {
    var p = G.problem, x = G.wrongX, two = G.mode === 'two', slip = MB.slip(p, x);
    side.hidden = false;
    side.innerHTML = turnCard() +
      '<div class="sp"><div class="phase">' + T('What happened', 'Qué pasó') + '</div>' +
      '<div class="cmp"><div class="yours">' + T('Your answer', 'Tu respuesta') + '<b>' + x + '°</b></div><div class="right">' + T('Correct answer', 'Respuesta correcta') + '<b>' + p.x + '°</b></div></div>' +
      '<div class="eqline bad">' + esc(MB.wrongEq(p, x)) + '</div><div class="eqline good">' + esc(MB.rightEq(p)) + '</div>' +
      (slip ? '<div class="slip">' + esc(slip) + '</div>' : '') +
      '<div class="legend"><span><i style="background:#ff5a5a"></i>' + x + '°</span><span><i style="background:#7dffb0"></i>' + p.x + '°</span></div>' +
      hintHtml(p, Math.max(1, G.wrongs)) + '</div><div class="grow"></div>' +
      '<button class="go" id="b-cont">' + (two ? T('NEXT PLAYER ▶', 'SIGUIENTE JUGADOR ▶') : T('TRY THE SAME SHOT AGAIN ▶', 'REPETIR EL MISMO TIRO ▶')) + '</button>';
    fillRacks();
    $('#b-cont').addEventListener('click', explainDone);
    setTimeout(function () { var b = $('#b-cont'); if (b) b.focus(); }, 40);
    MB.say(T('Your answer, ' + x + ' degrees, sent the ball the wrong way. The correct answer is ' + p.x + ' degrees. ', 'Tu respuesta, ' + x + ' grados, mandó la bola por otro camino. La respuesta correcta es ' + p.x + ' grados. ') + MB.rightEq(p) + '. ' + p.look);
  }
  function sideAI() {
    side.hidden = false;
    side.innerHTML = turnCard() + '<div class="sp"><div class="phase">' + T('Computer’s turn', 'Turno de la computadora') + '</div>' +
      '<div class="big" id="ai-head">' + T('Thinking…', 'Pensando…') + '</div><ol class="steps" id="ai-steps"></ol></div><div class="grow"></div>' +
      '<div class="keys" style="text-align:center">' + T('Press', 'Pulsa') + ' <span class="kbd">Enter</span> ' + T('to go faster', 'para ir más rápido') + '</div>';
    fillRacks();
  }
  function sideMsg(head, sub) {
    side.hidden = false;
    side.innerHTML = turnCard() + '<div class="sp"><div class="big">' + head + '</div>' + (sub ? '<div class="keys">' + sub + '</div>' : '') + '</div>';
    fillRacks();
  }

  // ------------------------------------------------------------------ setting up a table
  function practiceTable() {
    var balls = [MB.Ball('cue', 0, 0, 0)], kinds = ['red', 'blue'], n = MB.randi(4, 7), nums = { red: [1, 2, 3, 4, 5, 6, 7], blue: [1, 2, 3, 4, 5, 6, 7] };
    MB.shuffle(nums.red); MB.shuffle(nums.blue);
    for (var tries = 0; tries < 200; tries++) {
      var x = MB.rand(TB.x0 + 60, TB.x1 - 60), y = MB.rand(TB.y0 + 50, TB.y1 - 50);
      if (MB.freeSpot(balls.slice(1), x, y)) { balls[0].x = x; balls[0].y = y; break; }
    }
    var placed = 0;
    for (tries = 0; tries < 600 && placed < n; tries++) {
      var px = MB.rand(TB.x0 + 18, TB.x1 - 18), py = MB.rand(TB.y0 + 18, TB.y1 - 18);
      if (!MB.freeSpot(balls, px, py) || V.dist(balls[0], { x: px, y: py }) < 80) continue;
      var kind = placed === 0 && Math.random() < 0.3 ? 'eight' : kinds[placed % 2];
      balls.push(MB.Ball(kind, kind === 'eight' ? 8 : nums[kind].pop(), px, py)); placed++;
    }
    return balls;
  }
  function aimAtNearest() {
    var c = cue(), near = null, nd = 1e9;
    G.balls.forEach(function (b) { if (b !== c && b.on) { var d = V.dist(b, c); if (d < nd) { nd = d; near = b; } } });
    if (near) G.aim.dir = V.norm(V.sub(near, c));
  }

  // ------------------------------------------------------------------ starting a mode
  function startMode(mode) {
    G.mode = mode; G.diff = save.diff; G.skills = save.skills.slice();
    G.stats = [newStats(), newStats()]; G.started = Date.now(); G.coinsAtStart = save.coins;
    G.turn = 0; G.inHand = false; G.over = false; G.lastSkill = null; G.cpuShots = 0;
    if (mode === 'practice') {
      G.players = [{ name: T('You', 'Tú'), group: null }];
      newPracticeTable();
    } else {
      G.balls = MB.rackBalls(); G.breakShot = true;
      G.players = mode === 'cpu'
        ? [{ name: T('You', 'Tú'), group: null }, { name: T('Computer', 'Computadora'), group: null, cpu: true }]
        : [{ name: T('Player 1', 'Jugador 1'), group: null }, { name: T('Player 2', 'Jugador 2'), group: null }];
      G.aim.dir = { x: 1, y: 0 }; G.aim.power = 1;
      hideOv(); drawHud(); startTurn(true);
    }
  }
  function newPracticeTable() {
    G.balls = practiceTable(); G.aim.power = 0.5; aimAtNearest();
    hideOv(); drawHud(); Rd.camHome(); setPhase('aim');
    MB.say(T('New table. Aim your shot.', 'Mesa nueva. Apunta tu tiro.'));
  }
  function startTurn(first) {
    var p = G.players[G.turn];
    if (!first || G.mode === 'two' || p.cpu) banner(G.mode === 'cpu' ? (p.cpu ? T('Computer’s turn', 'Turno de la computadora') : T('Your turn', 'Tu turno')) : T(p.name + '’s turn', 'Turno de ' + p.name));
    MB.Sound.play('turn');
    Rd.camHome();
    if (G.inHand) {
      G.inHand = false;
      var c = cue(); c.on = true; c.pocket = null; c.vx = c.vy = 0; c.sinkT = 0;
      if (p.cpu) { aiPlace(); return; }
      G.ghost = { x: (TB.x0 + TB.x1) * 0.5 - 200, y: (TB.y0 + TB.y1) / 2 }; c.x = -999; c.y = -999;
      setPhase('place'); return;
    }
    if (p.cpu) { setPhase('ai-think'); return; }
    if (!first) aimAtNearest();
    setPhase('aim');
  }
  function setPhase(ph) {
    G.phase = ph; G.timer = 0;
    if (ph === 'aim') { sideAim(); cv.setAttribute('aria-label', T('The pool table. Aim with the arrow keys, set the power with up and down, then press Enter.', 'La mesa de billar. Apunta con las flechas, ajusta la fuerza con arriba y abajo, y pulsa Enter.')); if (document.activeElement === document.body || !document.activeElement || side.contains(document.activeElement)) cv.focus({ preventScroll: true }); }
    else if (ph === 'place') { sidePlace(); cv.focus({ preventScroll: true }); }
    else if (ph === 'problem') sideProblem();
    else if (ph === 'explain') sideExplain();
    else if (ph === 'ai-think') sideAI();
  }

  // ------------------------------------------------------------------ the shot: aim -> problem
  function chooseSkill() {
    var list = G.skills.length ? G.skills : ['comp'];
    var opts = list.length > 1 ? list.filter(function (s) { return s !== G.lastSkill; }) : list;
    G.lastSkill = MB.pick(opts); return G.lastSkill;
  }
  function takeShot() {
    if (G.phase !== 'aim' || G.paused) return;
    if (G.aim.power < 0.04) { toast(T('Add some power first', 'Primero añade fuerza'), '#ffd23f'); return; }
    MB.Sound.play('click');
    var p = MB.makeProblem(cue(), G.aim.dir, G.diff, chooseSkill(), G.balls);
    G.problem = p; G.aim.dir = p.aim; G.wrongs = 0; G.wrongX = null;
    G.snapshot = MB.cloneBalls(G.balls);
    var st = curStats(); st.q++; st.by[p.skill].q++;
    frameProblem();
    setPhase('problem');
    MB.say(p.sr + ' ' + T('Solve for x.', 'Halla x.'));
  }
  function frameProblem() {
    var p = G.problem, pts = [p.V];
    if (p.C) pts.push(p.C); else pts.push(V.add(p.V, V.mul(p.aim, 170)));
    p.els.forEach(function (e) { if (e.t === 'arc') pts.push(V.add(e.at, V.mul(V.norm(V.add(e.u, e.v)), (e.r || 48) + 30))); });
    Rd.camFrame(pts, 95);
  }
  function reAim() {
    if (G.phase !== 'problem' || G.wrongs > 0) return;
    var st = curStats(); st.q--; st.by[G.problem.skill].q--;
    G.problem = null; Rd.camHome(); setPhase('aim'); cv.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------------ answering
  var submitLock = false;
  function submit() {
    if (G.phase !== 'problem' || submitLock) return;
    var inp = $('#ans'), msg = $('#msg'), raw = (inp.value || '').trim();
    if (raw === '') { msg.textContent = T('Type a number for x first.', 'Primero escribe un número para x.'); inp.focus(); return; }
    var v = parseInt(raw, 10);
    if (isNaN(v) || String(v) !== raw.replace(/^0+(?=\d)/, '')) { msg.textContent = T('Type a whole number, like 35.', 'Escribe un número entero, como 35.'); inp.focus(); return; }
    if (v < 1 || v > 179) { msg.textContent = T('Angles here are between 1° and 179°.', 'Aquí los ángulos están entre 1° y 179°.'); inp.focus(); return; }
    submitLock = true; setTimeout(function () { submitLock = false; }, 400);
    var p = G.problem, st = curStats();
    inp.disabled = true;
    if (v === p.x) {
      MB.Sound.play('correct');
      if (G.wrongs === 0) { st.first++; st.by[p.skill].first++; }
      st.solved++; st.coins++; st.shots++;
      save.coins++; save.totals.questions++; if (G.wrongs === 0) save.totals.firstTry++; MB.store();
      setTimeout(function () { MB.Sound.play('coin'); }, 180);
      drawHud(); coinFly();
      toast(T('Correct! x = ', '¡Correcto! x = ') + p.x + '°', '#7dffb0');
      sideMsg('✓ ' + T('Correct! x = ', '¡Correcto! x = ') + p.x + '°', T('Here goes your shot.', 'Ahí va tu tiro.') + ' <i class="cn" aria-hidden="true"></i> +1');
      MB.say(T('Correct. x is ' + p.x + ' degrees. Here goes your shot.', 'Correcto. x mide ' + p.x + ' grados. Ahí va tu tiro.'));
      G.closed = false; G.demoWrong = false;
      strike(p.aim, G.aim.power);
    } else {
      MB.Sound.play('wrong');
      G.wrongs++; G.wrongX = v; st.wrongs++; if (G.mode === 'two') st.shots++;
      MB.say(T('x = ' + v + ' degrees. Watch where that angle sends the ball.', 'x = ' + v + ' grados. Mira a dónde manda la bola ese ángulo.'));
      // first the cue swings from the aimed line to where the wrong angle points, then that shot plays out
      G.closed = true; G.demoWrong = true;
      G.swing = { from: p.aim, to: MB.dirFor(p, v), t: 0 };
      sideMsg(T('x = ', 'x = ') + v + '°', T('Watch where your angle sends the ball.', 'Mira a dónde manda la bola tu ángulo.'));
      G.phase = 'swing'; G.timer = 0;
    }
  }
  // the cue pulls back and strikes; then the balls roll
  function strike(dir, power) {
    G.shot = { dir: V.norm(dir), power: power, t: 0 };
    G.aim.dir = G.shot.dir;
    Rd.camHome();
    G.phase = 'strike'; G.timer = 0;
  }
  function launch() {
    var c = cue(), sp = MB.speedFor(G.shot.power) * (G.breakShot ? 1.4 : 1);   // (a break hits harder than any other shot)
    c.vx = G.shot.dir.x * sp; c.vy = G.shot.dir.y * sp;
    MB.Sound.play('cue', G.shot.power);
    var fx = MB.equipped('fx');
    if (fx.puff) Rd.burst(c.x - G.shot.dir.x * (R + 4), c.y - G.shot.dir.y * (R + 4), fx.puff, 14, 60);
    G.path = [{ x: c.x, y: c.y }]; G.pocketedNow = []; G.ev = []; G.leftBefore = { red: MB.Rules.left(G.balls, 'red'), blue: MB.Rules.left(G.balls, 'blue') };
    G.phase = 'roll'; G.timer = 0;
  }
  function explainDone() {
    if (G.phase !== 'explain') return;
    MB.Sound.play('click');
    G.closed = false; G.rightPath = null;
    if (G.mode === 'two') {
      // a wrong answer ends the turn (the balls stay where the demonstration left them; nothing could drop)
      G.problem = null; G.turn = 1 - G.turn; startTurn(); return;
    }
    // the same table, the same shot, the same x, with more help
    G.balls = MB.cloneBalls(G.snapshot); G.aim.dir = G.problem.aim;
    frameProblem(); setPhase('problem');
    MB.say(T('The same shot again. ', 'El mismo tiro otra vez. ') + G.problem.look + ' ' + T('Solve for x.', 'Halla x.'));
  }

  // ------------------------------------------------------------------ after the balls stop
  function onStop() {
    var c = cue();
    if (G.demoWrong) {
      G.demoWrong = false;
      // where the right answer would have sent the cue ball, from the same spot (for the side-by-side picture)
      var sim = MB.simulate(G.snapshot, 0, G.problem.aim, G.aim.power, { closed: true });
      G.rightPath = sim.path;
      frameProblem(); Rd.camFrame([G.problem.V, G.path[G.path.length - 1], G.rightPath[G.rightPath.length - 1]].concat(G.problem.C ? [G.problem.C] : []), 90);
      setPhase('explain');
      return;
    }
    var pk = G.pocketedNow;
    if (G.mode === 'practice') {
      var n = pk.filter(function (b) { return b.kind !== 'cue'; }).length;
      if (n) toast(n === 1 ? T('Pocketed!', '¡Dentro!') : T(n + ' balls pocketed!', '¡' + n + ' bolas dentro!'), '#7dffb0');
      else toast(T('Shot played. New table!', 'Tiro hecho. ¡Mesa nueva!'), '#eef3fb');
      G.phase = 'pause'; G.timer = 0; G.after = newPracticeTable; G.wait = 1.1;
      return;
    }
    G.breakShot = false;
    var res = MB.Rules.resolve(G, pk);
    var msg = res.msg.filter(Boolean).join(' ');
    if (msg) { toast(msg, res.over ? '#ffd23f' : '#eef3fb'); MB.say(msg); }
    if (res.over) { G.phase = 'pause'; G.timer = 0; G.wait = 1.6; G.after = function () { endGame(res.winner); }; return; }
    if (res.inHand) G.inHand = true;
    if (!res.keep) G.turn = 1 - G.turn;
    G.phase = 'pause'; G.timer = 0; G.wait = 1.0; G.after = function () { startTurn(); };
  }

  // ------------------------------------------------------------------ cue ball in hand
  function placeCue() {
    if (G.phase !== 'place') return;
    var c = cue(), g = G.ghost;
    if (!MB.freeSpot(G.balls, g.x, g.y, c)) { toast(T('Pick a free spot on the cloth', 'Elige un lugar libre en la mesa'), '#ff8a8a'); MB.Sound.play('wrong'); return; }
    c.x = g.x; c.y = g.y; c.on = true; MB.Sound.play('click');
    aimAtNearest(); setPhase('aim');
  }
  function aiPlace() {
    var c = cue(), best = null;
    for (var i = 0; i < 60; i++) {
      var x = MB.rand(TB.x0 + 40, TB.x1 - 40), y = MB.rand(TB.y0 + 40, TB.y1 - 40);
      if (!MB.freeSpot(G.balls, x, y, c)) continue;
      c.x = x; c.y = y;
      var s = MB.aiChoose(G), sim = MB.simulate(G.balls, 0, s.dir, s.power, {});
      if (sim.pocketed.some(function (b) { return b.kind === (G.players[G.turn].group || b.kind) && b.kind !== 'cue' && b.kind !== 'eight'; })) { best = { x: x, y: y }; break; }
      if (!best) best = { x: x, y: y };
    }
    if (best) { c.x = best.x; c.y = best.y; } else { c.x = (TB.x0 + TB.x1) / 2; c.y = (TB.y0 + TB.y1) / 2; }
    c.on = true;
    toast(T('The computer places the cue ball.', 'La computadora coloca la bola blanca.'));
    setPhase('ai-think');
  }

  // ------------------------------------------------------------------ the computer's turn: think, solve (showing every step), aim, shoot
  function aiStep(dt) {
    var A = G.ai;
    if (G.phase === 'ai-think') {
      if (G.timer < 0.8) return;
      var shot = MB.aiChoose(G), p = MB.makeProblem(cue(), shot.dir, G.diff, chooseSkill(), G.balls);
      G.problem = p; G.ai = { power: shot.power, step: 0, t: 0, lines: buildAiLines(p), fromDir: G.aim.dir, fromPow: G.aim.power };
      frameProblem(); G.phase = 'ai-solve'; G.timer = 0;
      $('#ai-head').textContent = T('Solving for x', 'Hallando x');
      MB.say(T('The computer aims and gets this angle problem. ', 'La computadora apunta y le toca este problema. ') + p.sr);
      return;
    }
    if (G.phase === 'ai-solve') {
      if (G.timer > (A.step === 0 ? 0.9 : 1.15)) {
        G.timer = 0;
        if (A.step < A.lines.length) {
          var li = A.lines[A.step], ol = $('#ai-steps');
          if (ol) { var el = document.createElement('li'); el.className = li.cls || ''; el.textContent = li.text; ol.appendChild(el); }
          MB.Sound.play('think'); MB.say(li.text); A.step++;
        } else {
          G.phase = 'ai-aim'; G.timer = 0; Rd.camHome();
          $('#ai-head').textContent = T('Aiming…', 'Apuntando…');
        }
      }
      return;
    }
    if (G.phase === 'ai-aim') {
      // the cue turns to the line, the power builds, then the strike
      var k = Math.min(1, G.timer / 1.1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      var a0 = V.ang(A.fromDir), a1 = V.ang(G.problem.aim), da = ((a1 - a0) % 360 + 540) % 360 - 180;
      G.aim.dir = V.dir(a0 + da * e);
      G.aim.power = A.fromPow + (A.power - A.fromPow) * Math.min(1, Math.max(0, (G.timer - 0.6) / 0.6));
      if (G.timer > 1.5) { G.aim.dir = G.problem.aim; G.aim.power = A.power; G.closed = false; G.demoWrong = false; G.cpuShots = (G.cpuShots || 0) + 1; strike(G.problem.aim, A.power); }
    }
  }
  function buildAiLines(p) {
    var sol = MB.solution(p), out = [];
    sol.lines.forEach(function (l) { out.push({ text: l.name, cls: 'nm' }); out.push({ text: l.eq }); });
    if (p.final.type === 'sum') out.push({ text: sol.op });
    if (out[out.length - 1].text !== sol.answer) out.push({ text: sol.answer });
    out.push({ text: T('Computer’s answer: ', 'Respuesta de la computadora: ') + p.x + '°', cls: 'ans' });
    return out;
  }

  // ------------------------------------------------------------------ the main loop
  var last = 0;
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    G.t += dt;
    if (!G.paused) update(dt);
    draw(dt);
    requestAnimationFrame(frame);
  }
  function update(dt) {
    G.timer += dt;
    Rd.camStep(dt, MB.calm);
    if (G.phase.indexOf('ai-') === 0) aiStep(dt);
    else if (G.phase === 'swing') {
      var k = Math.min(1, G.timer / 0.9), a0 = V.ang(G.swing.from), a1 = V.ang(G.swing.to), da = ((a1 - a0) % 360 + 540) % 360 - 180;
      G.aim.dir = V.dir(a0 + da * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2));
      if (G.timer > 1.6) strike(G.swing.to, G.aim.power);
    } else if (G.phase === 'strike') {
      if (G.timer > (MB.calm ? 0.12 : 0.32)) launch();
    } else if (G.phase === 'roll') {
      var ev = [];
      MB.advance(G.balls, dt, { closed: G.closed }, ev);
      ev.forEach(function (e) {
        if (e.type === 'clack') MB.Sound.play('clack', e.s);
        else if (e.type === 'cushion') MB.Sound.play('cushion', e.s);
        else if (e.type === 'pocket') {
          MB.Sound.play('pocket'); G.pocketedNow.push(e.ball);
          var fx = MB.equipped('fx'), pc = MB.POCKETS[e.pocket].c;
          if (fx.fireworks) { Rd.burst(pc.x, pc.y, '#ffd23f', 26, 200); Rd.burst(pc.x, pc.y, '#62e3ff', 18, 160); }
          else Rd.burst(pc.x, pc.y, 'rgba(255,255,255,0.8)', 8, 70);
        }
      });
      var c = cue();
      if (c.on) {
        var lp = G.path[G.path.length - 1];
        if (!lp || V.dist(lp, c) > 3) G.path.push({ x: c.x, y: c.y });
        var fx2 = MB.equipped('fx');
        if (fx2.trail && (c.vx || c.vy) && !G.demoWrong) Rd.trailDot(c.x, c.y, fx2.trail, fx2.col, G.t);
      }
      var sinking = G.balls.some(function (b) { return !b.on && b.pocket !== null && b.sinkT < 1; });
      if (!MB.moving(G.balls) && !sinking) { G.timer = 0; onStop(); }
    } else if (G.phase === 'pause') {
      if (G.timer > G.wait && G.after) { var f = G.after; G.after = null; f(); }
    }
  }
  function draw(dt) {
    Rd.begin();
    if (!G.balls.length) { drawTitleBg(); return; }
    var c = cue(), ph = G.phase;
    Rd.world(function (ctx) {
      Rd.table();
      if (G.closed && (ph === 'swing' || ph === 'strike' || ph === 'roll')) Rd.blocked(G.t);
      if (ph === 'roll' && G.demoWrong) Rd.path(G.path, 'rgba(255,90,90,0.8)', 3, null);
      Rd.balls(G.balls, dt);
      Rd.particles(dt);
      if (ph === 'aim') { Rd.preview(G.balls, c, G.aim.dir, G.aim.power); Rd.cue(c, G.aim.dir, 6 + (G.drag ? G.aim.power * 70 : G.aim.power * 18)); }
      else if (ph === 'place') { Rd.ghost(G.ghost, MB.freeSpot(G.balls, G.ghost.x, G.ghost.y, c)); }
      else if (ph === 'problem') { Rd.cue(c, G.aim.dir, 10, 0.35); Rd.diagram(G.problem, { hint: G.wrongs }, G.t); }
      else if (ph === 'swing') { Rd.diagram(G.problem, { wrong: G.wrongX, hint: 0, hideShot: false }, G.t); Rd.cue(c, G.aim.dir, 10 + Math.min(1, G.timer / 0.9) * 30); }
      else if (ph === 'strike') {
        var k = G.timer / (MB.calm ? 0.12 : 0.32), pull = k < 0.7 ? 18 + G.shot.power * 60 * (k / 0.7) : (18 + G.shot.power * 60) * (1 - (k - 0.7) / 0.3);
        Rd.cue(c, G.shot.dir, Math.max(0, pull));
      }
      else if (ph === 'explain') {
        Rd.diagram(G.problem, { wrong: G.wrongX, reveal: true, hint: Math.max(1, G.wrongs), fills: true }, G.t);
        // where each answer sends the cue ball: green for the right angle, red for the wrong one
        if (G.rightPath) Rd.path(G.rightPath, 'rgba(125,255,176,0.95)', 4 / Rd.cam.z, [12 / Rd.cam.z, 7 / Rd.cam.z]);
        Rd.path(G.path, 'rgba(255,90,90,0.95)', 4 / Rd.cam.z, null);
      }
      else if (ph === 'ai-solve') { Rd.cue(c, G.aim.dir, 10, 0.3); Rd.diagram(G.problem, { solve: G.ai && G.ai.step >= 2, reveal: G.ai && G.ai.step >= G.ai.lines.length }, G.t); }
      else if (ph === 'ai-aim') { Rd.preview(G.balls, c, G.aim.dir, G.aim.power); Rd.cue(c, G.aim.dir, 6 + Math.max(0, G.timer - 0.6) / 0.9 * G.aim.power * 70); }
      else if (ph === 'ai-think') { Rd.cue(c, G.aim.dir, 8, 0.8); }
    });
  }
  // the title screen's background: a table with a rack, slowly lit
  var titleBalls = null;
  function drawTitleBg() {
    if (!titleBalls) titleBalls = MB.rackBalls();
    Rd.world(function () { Rd.table(); Rd.balls(titleBalls, 0); Rd.cue(titleBalls[0], { x: 1, y: 0 }, 14 + Math.sin(G.t * 2) * 10); });
  }

  // ------------------------------------------------------------------ input: pointer
  function stagePoint(e) {
    var r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  function overTable(s) { return s.x < 990 && s.y > 64; }
  G.drag = null;
  cv.addEventListener('pointermove', function (e) {
    if (G.paused) return;
    var s = stagePoint(e), w = Rd.toWorld(s), c = cue();
    if (G.phase === 'place') { G.ghost = { x: MB.clamp(w.x, TB.x0 + R, TB.x1 - R), y: MB.clamp(w.y, TB.y0 + R, TB.y1 - R) }; return; }
    if (G.phase !== 'aim' || !c) return;
    if (G.touchAim) {   // a finger on the table: the cue follows it (touch screens set the power with the slider)
      if (V.dist(w, c) > R * 1.6) G.aim.dir = V.norm(V.sub(w, c));
      return;
    }
    if (G.drag) {
      // pulling back: the farther the pointer goes back from where it was pressed, the harder the shot
      var back = V.dot(V.sub(G.drag.start, w), G.aim.dir);
      G.aim.power = MB.clamp(G.drag.p0 + back / 170, 0.03, 1); G.drag.moved = Math.abs(back) > 6 || G.drag.moved; powerShown();
      return;
    }
    if (e.pointerType !== 'touch' && overTable(s) && V.dist(w, c) > R * 1.6) G.aim.dir = V.norm(V.sub(w, c));
  });
  cv.addEventListener('pointerdown', function (e) {
    if (G.paused) return;
    var s = stagePoint(e), w = Rd.toWorld(s), c = cue();
    cv.focus({ preventScroll: true });
    if (G.phase === 'place') { G.ghost = { x: MB.clamp(w.x, TB.x0 + R, TB.x1 - R), y: MB.clamp(w.y, TB.y0 + R, TB.y1 - R) }; placeCue(); return; }
    if (G.phase === 'explain') { explainDone(); return; }
    if (G.phase.indexOf('ai-') === 0) { G.timer += 2; return; }
    if (G.phase !== 'aim' || !overTable(s)) return;
    if (e.pointerType === 'touch') {
      // touch: drag anywhere to aim; nothing fires until the Take the shot button (no accidental shots)
      if (V.dist(w, c) > R * 1.6) G.aim.dir = V.norm(V.sub(w, c));
      G.touchAim = true;
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      return;
    }
    G.drag = { start: w, p0: 0.03, moved: false };
    G.aim.power = 0.03; powerShown();
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
  });
  function endDrag(e) {
    G.touchAim = false;
    if (!G.drag) return;
    var d = G.drag; G.drag = null;
    if (G.phase === 'aim' && d.moved && G.aim.power > 0.05 && e.type === 'pointerup') takeShot();
    else if (G.phase === 'aim' && !d.moved && e.pointerType !== 'touch') { G.aim.power = Math.max(G.aim.power, 0.5); powerShown(); }
  }
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);

  // ------------------------------------------------------------------ input: keyboard
  document.addEventListener('keydown', function (e) {
    if (!G.mode && ov.hidden) return;
    var k = e.key, tgt = e.target, inField = tgt && (tgt.tagName === 'INPUT' && tgt.type !== 'range');
    if (k === 'Escape') {
      if (!ov.hidden) { if (G.mode && G.pausedMenu) { e.preventDefault(); resume(); } return; }
      if (G.phase === 'problem') { e.preventDefault(); reAim(); return; }
      if (G.mode) { e.preventDefault(); pauseMenu(); }
      return;
    }
    if (!ov.hidden || G.paused || inField) return;
    var isRange = tgt && tgt.type === 'range';
    if (G.phase === 'aim') {
      if ((k === 'ArrowLeft' || k === 'ArrowRight') && !isRange) {
        e.preventDefault(); var step = e.shiftKey ? 0.1 : (e.repeat ? 1.2 : 0.5);
        G.aim.dir = V.rot(G.aim.dir, k === 'ArrowLeft' ? -step : step);
      } else if ((k === 'ArrowUp' || k === 'ArrowDown') && !isRange) {
        e.preventDefault(); G.aim.power = MB.clamp(G.aim.power + (k === 'ArrowUp' ? 0.05 : -0.05), 0.05, 1); powerShown();
      } else if (k === 'Enter' || k === ' ') {
        if (tgt && tgt.tagName === 'BUTTON' && tgt.id !== 'b-shoot') return;
        e.preventDefault(); if (!e.repeat) takeShot();
      }
    } else if (G.phase === 'place') {
      var mv = { ArrowLeft: [-6, 0], ArrowRight: [6, 0], ArrowUp: [0, -6], ArrowDown: [0, 6] }[k];
      if (mv) { e.preventDefault(); var f = e.shiftKey ? 3 : 1; G.ghost = { x: MB.clamp(G.ghost.x + mv[0] * f, TB.x0 + R, TB.x1 - R), y: MB.clamp(G.ghost.y + mv[1] * f, TB.y0 + R, TB.y1 - R) }; }
      else if ((k === 'Enter' || k === ' ') && !e.repeat) { e.preventDefault(); placeCue(); }
    } else if (G.phase === 'explain') {
      if ((k === 'Enter' || k === ' ') && !e.repeat) { e.preventDefault(); explainDone(); }
    } else if (G.phase.indexOf('ai-') === 0) {
      if ((k === 'Enter' || k === ' ') && !e.repeat) { e.preventDefault(); G.timer += 2; }
    }
  });

  // ------------------------------------------------------------------ menus
  function showTitle() {
    G.mode = null; G.balls = []; G.phase = 'menu'; hud.hidden = true; side.hidden = true; G.pausedMenu = false; Rd.camHome();
    showOv('<div class="card title-card"><div class="tag">' + T('Angle relationships · Grade 8', 'Relaciones entre ángulos · 8.º grado') + '</div>' +
      '<div class="logo-big">MATH BILLIARDS</div>' +
      '<p>' + T('Aim your shot. Solve for x. Your angle decides where the ball goes.', 'Apunta tu tiro. Halla x. Tu ángulo decide a dónde va la bola.') + '</p>' +
      '<div class="modes">' +
      '<button class="mode-b" id="m-practice"><span class="ic" aria-hidden="true">🎯</span><b>' + T('Practice', 'Práctica') + '</b><span>' + T('No rules. A new table every shot.', 'Sin reglas. Mesa nueva en cada tiro.') + '</span></button>' +
      '<button class="mode-b" id="m-cpu"><span class="ic" aria-hidden="true">🖥️</span><b>' + T('Vs Computer', 'Contra la computadora') + '</b><span>' + T('Classroom 8-ball. Watch it solve too.', '8-ball de clase. Mírala resolver.') + '</span></button>' +
      '<button class="mode-b" id="m-two"><span class="ic" aria-hidden="true">👥</span><b>' + T('Two Players', 'Dos jugadores') + '</b><span>' + T('Classroom 8-ball on one device.', '8-ball de clase en un dispositivo.') + '</span></button></div>' +
      '<div class="btns"><button class="bt" id="m-shop"><i class="cn" aria-hidden="true"></i> ' + save.coins + ' · ' + T('Shop', 'Tienda') + '</button><button class="bt" id="m-how">' + T('How to Play', 'Cómo jugar') + '</button>' +
      '<button class="bt" id="m-set">' + T('Settings', 'Ajustes') + '</button></div></div>', '#m-practice');
    on('m-practice', function () { showSetup('practice'); });
    on('m-cpu', function () { showSetup('cpu'); });
    on('m-two', function () { showSetup('two'); });
    on('m-shop', function () { showShop(showTitle); });
    on('m-how', function () { showTutorial(showTitle); });
    on('m-set', function () { showSettings(showTitle); });
  }
  function showSetup(mode) {
    var diff = save.diff, skills = save.skills.slice();
    function draw() {
      showOv('<div class="card"><div class="tag">' + (mode === 'practice' ? T('Practice', 'Práctica') : mode === 'cpu' ? T('Vs Computer', 'Contra la computadora') : T('Two Players', 'Dos jugadores')) + '</div>' +
        '<h2>' + T('Choose your practice', 'Elige tu práctica') + '</h2>' +
        '<div class="sec" id="dl">' + T('1. Difficulty', '1. Dificultad') + '</div><div class="opts three" role="radiogroup" aria-labelledby="dl">' +
        MB.DIFFS.map(function (d) { return '<button class="opt" role="radio" data-d="' + d.id + '" aria-checked="' + (d.id === diff) + '"><span class="ck" aria-hidden="true">' + (d.id === diff ? '●' : '') + '</span><span><b>' + d.name + '</b><span>' + d.blurb + '</span></span></button>'; }).join('') + '</div>' +
        '<div class="sec" id="sl">' + T('2. Skills (pick one or more)', '2. Habilidades (elige una o más)') + '</div><div class="opts four" role="group" aria-labelledby="sl">' +
        MB.SKILLS.map(function (s) { var onn = skills.indexOf(s.id) >= 0; return '<button class="opt" data-s="' + s.id + '" aria-pressed="' + onn + '"><span class="ck" aria-hidden="true">' + (onn ? '✓' : '') + '</span><span><b>' + s.long + '</b></span></button>'; }).join('') + '</div>' +
        '<p id="setmsg" style="min-height:1.4em;color:#ffd23f;margin-top:8px" aria-live="polite"></p>' +
        '<div class="btns"><button class="bt primary" id="s-go">' + T('START ▶', 'EMPEZAR ▶') + '</button><button class="bt" id="s-back">' + T('Back', 'Volver') + '</button></div></div>', '#s-go');
      [].forEach.call(ov.querySelectorAll('[data-d]'), function (b) { b.addEventListener('click', function () { MB.Sound.play('click'); diff = b.getAttribute('data-d'); draw(); var nb = ov.querySelector('[data-d="' + diff + '"]'); if (nb) nb.focus(); }); });
      [].forEach.call(ov.querySelectorAll('[data-s]'), function (b) {
        b.addEventListener('click', function () {
          MB.Sound.play('click'); var s = b.getAttribute('data-s'), i = skills.indexOf(s);
          if (i >= 0) { if (skills.length === 1) { $('#setmsg').textContent = T('Keep at least one skill.', 'Deja al menos una habilidad.'); return; } skills.splice(i, 1); } else skills.push(s);
          b.setAttribute('aria-pressed', String(i < 0)); b.querySelector('.ck').textContent = i < 0 ? '✓' : ''; $('#setmsg').textContent = '';
        });
      });
      on('s-back', showTitle);
      on('s-go', function () {
        save.diff = diff; save.skills = MB.SKILLS.map(function (s) { return s.id; }).filter(function (s) { return skills.indexOf(s) >= 0; }); MB.store();
        var go = function () { startMode(mode); };
        var thenRules = mode === 'practice' ? go : function () { showRules(go); };
        if (!save.tutorialSeen) showTutorial(thenRules, true); else thenRules();
      });
    }
    draw();
  }
  function showRules(next) {
    showOv('<div class="card"><div class="tag">' + T('Before you break', 'Antes de empezar') + '</div><h2>' + T('Classroom 8-Ball', '8-Ball de clase') + '</h2>' +
      '<p>' + T('A <b>modified</b> version of 8-ball pool for classroom math practice.', 'Una versión <b>modificada</b> del 8-ball para practicar matemáticas en clase.') + '</p>' +
      '<ul class="rules">' +
      '<li><span class="ic">🔴🔵</span>' + T('Red balls and blue balls are the two groups.', 'Las bolas rojas y las azules son los dos grupos.') + '</li>' +
      '<li><span class="ic">🎱</span>' + T('The first ball you pocket picks your color.', 'La primera bola que metes decide tu color.') + '</li>' +
      '<li><span class="ic">✅</span>' + T('Pocket your color to keep shooting.', 'Mete tu color para seguir tirando.') + '</li>' +
      '<li><span class="ic">⚫</span>' + T('The black 8-ball is last. Sink it early and you lose.', 'La bola 8 negra va al final. Si la metes antes, pierdes.') + '</li>' +
      '<li><span class="ic">🚫</span>' + T('No calling pockets. No fouls.', 'No hay que cantar tronera. No hay faltas.') + '</li>' +
      '<li><span class="ic">⚪</span>' + T('Cue ball in a pocket? The turn passes, and the next player places it anywhere.', '¿La blanca entra? Pasa el turno y el siguiente la coloca donde quiera.') + '</li>' +
      '<li style="grid-column:1/-1"><span class="ic">📐</span><b>' + T('Every shot is an angle problem: aim, solve for x, then the shot plays.', 'Cada tiro es un problema de ángulos: apunta, halla x y el tiro se juega.') + '</b></li></ul>' +
      (G.modeHint === 'two' ? '' : '') +
      '<div class="btns"><button class="bt primary" id="r-go">' + T('BREAK! ▶', '¡A JUGAR! ▶') + '</button>' + (next === resume ? '' : '<button class="bt" id="r-back">' + T('Back', 'Volver') + '</button>') + '</div></div>', '#r-go');
    on('r-go', next); on('r-back', showTitle);
  }
  // the tutorial: seven short steps with a picture each
  var TUT = [
    { h: T('1. Aim the cue', '1. Apunta el taco'), p: T('Move the pointer (or the arrow keys) to point the cue. Aim anywhere you like: there are no pockets to call.', 'Mueve el puntero (o las flechas) para apuntar el taco. Apunta a donde quieras: no hay que cantar tronera.'),
      svg: '<circle cx="90" cy="110" r="9" fill="#f6f3ea"/><circle cx="205" cy="70" r="9" fill="#d3202f"/><line x1="90" y1="110" x2="190" y2="76" stroke="#fff" stroke-width="2.5" stroke-dasharray="2 7" stroke-linecap="round"/><line x1="78" y1="114" x2="-10" y2="144" stroke="#ead2a0" stroke-width="6" stroke-linecap="round"/>' },
    { h: T('2. Set the power', '2. Elige la fuerza'), p: T('Hold and drag back to pull the cue back (or use ↑ ↓). The farther back, the harder the shot.', 'Mantén y arrastra hacia atrás para tirar el taco (o usa ↑ ↓). Cuanto más atrás, más fuerte.'),
      svg: '<circle cx="150" cy="100" r="9" fill="#f6f3ea"/><line x1="128" y1="100" x2="20" y2="100" stroke="#ead2a0" stroke-width="6" stroke-linecap="round"/><path d="M60 125 L30 125" stroke="#ffd23f" stroke-width="3"/><path d="M36 119 L28 125 L36 131" fill="none" stroke="#ffd23f" stroke-width="3"/><rect x="200" y="40" width="22" height="110" rx="6" fill="#0b1428"/><rect x="200" y="80" width="22" height="70" rx="6" fill="#ffd23f"/>' },
    { h: T('3. Look at the geometry', '3. Mira la geometría'), p: T('Your shot makes angles with a guide line or the cushion. The diagram is drawn on your real shot.', 'Tu tiro forma ángulos con una guía o con la banda. El dibujo está sobre tu tiro real.'),
      svg: '<line x1="40" y1="130" x2="260" y2="130" stroke="#fff" stroke-width="2.5"/><line x1="150" y1="130" x2="230" y2="45" stroke="#ffd23f" stroke-width="3"/><path d="M185 130 A35 35 0 0 0 174 104" fill="none" stroke="#ffd23f" stroke-width="3"/><path d="M120 130 A30 30 0 0 1 162 102" fill="none" stroke="#62e3ff" stroke-width="3"/><text x="196" y="120" fill="#ffd23f" font-size="18" font-weight="900">x°</text><text x="98" y="112" fill="#62e3ff" font-size="18" font-weight="900">133°</text><circle cx="150" cy="130" r="9" fill="#f6f3ea"/>' },
    { h: T('4. Solve for x', '4. Halla x'), p: T('Use the angle relationship. Here the two angles make a straight line: x + 133° = 180°, so x = 47°.', 'Usa la relación entre ángulos. Aquí forman una recta: x + 133° = 180°, así que x = 47°.'),
      svg: '<text x="150" y="85" fill="#fff" font-size="26" font-weight="900" text-anchor="middle">x + 133° = 180°</text><text x="150" y="130" fill="#ffd23f" font-size="30" font-weight="900" text-anchor="middle">x = 47°</text>' },
    { h: T('5. Enter x', '5. Escribe x'), p: T('Type just the number; the ° is already there. Press Enter or Space (or click Shoot).', 'Escribe solo el número; el ° ya está. Pulsa Enter o Espacio (o haz clic en Tirar).'),
      svg: '<text x="70" y="112" fill="#ffd23f" font-size="34" font-weight="900">x =</text><rect x="140" y="76" width="80" height="50" rx="10" fill="#0b1428" stroke="#ffd23f" stroke-width="3"/><text x="180" y="112" fill="#fff" font-size="30" font-weight="900" text-anchor="middle">47</text><text x="226" y="110" fill="#fff" font-size="30" font-weight="900">°</text>' },
    { h: T('6. Watch the shot', '6. Mira el tiro'), p: T('The right answer plays your shot exactly as you aimed. Real pool physics decides the rest; a good angle can still miss!', 'La respuesta correcta juega tu tiro tal como apuntaste. La física decide el resto; ¡un buen ángulo puede fallar!'),
      svg: '<circle cx="70" cy="140" r="9" fill="#f6f3ea"/><path d="M70 140 L200 70" stroke="#7dffb0" stroke-width="3" stroke-dasharray="8 6"/><circle cx="210" cy="64" r="9" fill="#d3202f"/><circle cx="268" cy="22" r="14" fill="#000"/>' },
    { h: T('7. Learn from mistakes', '7. Aprende de los errores'), p: T('A wrong x sends the ball where that angle really points. You’ll see why, get help, and try the same shot again.', 'Un x equivocado manda la bola a donde apunta ese ángulo. Verás por qué, recibirás ayuda y repetirás el mismo tiro.'),
      svg: '<circle cx="80" cy="140" r="9" fill="#f6f3ea"/><path d="M80 140 L220 60" stroke="#7dffb0" stroke-width="3" stroke-dasharray="8 6"/><path d="M80 140 L250 120" stroke="#ff5a5a" stroke-width="3"/><text x="230" y="150" fill="#ff8a8a" font-size="18" font-weight="900">55°</text><text x="190" y="50" fill="#7dffb0" font-size="18" font-weight="900">35°</text>' }
  ];
  function showTutorial(next, firstTime) {
    var i = 0;
    function draw() {
      var s = TUT[i];
      showOv('<div class="card"><div class="tag">' + T('How to play', 'Cómo jugar') + '</div><h2>' + T('Aim. Solve x. Shoot.', 'Apunta. Halla x. Tira.') + '</h2>' +
        '<div class="tut"><svg viewBox="0 0 300 190" role="img" aria-label="' + esc(s.h) + '">' + s.svg + '</svg><div><h3>' + s.h + '</h3><p>' + s.p + '</p></div></div>' +
        '<div class="dots" aria-hidden="true">' + TUT.map(function (_, k) { return '<i class="' + (k === i ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
        '<div class="btns">' + (i > 0 ? '<button class="bt" id="t-prev">◀ ' + T('Back', 'Atrás') + '</button>' : '') +
        '<button class="bt primary" id="t-next">' + (i < TUT.length - 1 ? T('Next ▶', 'Siguiente ▶') : firstTime ? T('Let’s play! ▶', '¡A jugar! ▶') : T('Done', 'Listo')) + '</button>' +
        (i < TUT.length - 1 ? '<button class="bt" id="t-skip">' + T('Skip', 'Saltar') + '</button>' : '') + '</div></div>', '#t-next');
      MB.say(s.h + '. ' + s.p);
      on('t-prev', function () { i--; draw(); });
      on('t-next', function () { if (i < TUT.length - 1) { i++; draw(); } else finish(); });
      on('t-skip', finish);
    }
    function finish() { save.tutorialSeen = true; MB.store(); next(); }
    draw();
  }
  function showSettings(back) {
    function draw() {
      showOv('<div class="card" style="width:620px"><div class="tag">' + T('Settings', 'Ajustes') + '</div><h2>' + T('Settings', 'Ajustes') + '</h2>' +
        '<div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">' +
        '<button class="switch" role="switch" id="st-sound" aria-checked="' + save.sound + '"><span>🔊 ' + T('Sound', 'Sonido') + '</span><span class="st">' + (save.sound ? T('ON', 'SÍ') : T('OFF', 'NO')) + '</span></button>' +
        '<button class="bt" id="st-how">' + T('How to Play', 'Cómo jugar') + '</button><button class="bt" id="st-rules">' + T('Classroom 8-Ball Rules', 'Reglas del 8-Ball de clase') + '</button></div>' +
        '<div class="btns"><button class="bt primary" id="st-back">' + T('Done', 'Listo') + '</button></div></div>', '#st-sound');
      on('st-sound', function () { toggleSound(); draw(); });
      on('st-how', function () { showTutorial(draw); });
      on('st-rules', function () { showRulesInfo(draw); });
      on('st-back', back);
    }
    draw();
  }
  function showRulesInfo(back) { showRules(back); var b = $('#r-go'); if (b) b.textContent = T('Got it', 'Entendido'); var bb = $('#r-back'); if (bb) bb.remove(); }
  function pauseMenu() {
    if (!G.mode || !ov.hidden) return;
    G.pausedMenu = true;
    showOv('<div class="card" style="width:560px"><div class="tag">' + modeName() + '</div><h2>' + T('Paused', 'En pausa') + '</h2>' +
      '<div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">' +
      '<button class="bt primary" id="p-res">' + T('Resume', 'Seguir') + '</button>' +
      '<button class="switch" role="switch" id="p-sound" aria-checked="' + save.sound + '"><span>🔊 ' + T('Sound', 'Sonido') + '</span><span class="st">' + (save.sound ? T('ON', 'SÍ') : T('OFF', 'NO')) + '</span></button>' +
      '<button class="bt" id="p-how">' + T('How to Play', 'Cómo jugar') + '</button>' +
      (G.mode !== 'practice' ? '<button class="bt" id="p-rules">' + T('Rules', 'Reglas') + '</button>' : '') +
      '<button class="bt" id="p-end">' + (G.mode === 'practice' ? T('End practice and see my results', 'Terminar y ver mis resultados') : T('End game and see results', 'Terminar el juego y ver resultados')) + '</button>' +
      '<button class="bt" id="p-menu">' + T('Main menu', 'Menú principal') + '</button></div></div>', '#p-res');
    on('p-res', resume);
    on('p-sound', function () { toggleSound(); G.pausedMenu = false; ov.hidden = true; pauseMenu(); });
    on('p-how', function () { showTutorial(function () { G.pausedMenu = false; ov.hidden = true; pauseMenu(); }); });
    on('p-rules', function () { showRules(function () { G.pausedMenu = false; ov.hidden = true; pauseMenu(); }); var b = $('#r-go'); if (b) b.textContent = T('Back', 'Volver'); var bb = $('#r-back'); if (bb) bb.remove(); });
    on('p-end', function () { G.pausedMenu = false; endGame(null); });
    on('p-menu', function () { G.pausedMenu = false; showTitle(); });
  }
  function resume() {
    G.pausedMenu = false; hideOv(); drawHud();
    if (G.phase === 'problem') { var i = $('#ans'); if (i) i.focus(); } else cv.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------------ results
  function pctCell(n, d) {
    if (!d) return '<span class="pct" style="color:var(--muted)">—</span>';
    var p = Math.round(100 * n / d), c = p >= 80 ? 'g' : p >= 40 ? 'y' : 'r', w = p >= 80 ? T('Strong', 'Fuerte') : p >= 40 ? T('Growing', 'Creciendo') : T('Keep practicing', 'Sigue practicando');
    return '<span class="pct ' + c + '">' + p + '% · ' + w + '</span>';
  }
  function statBlock(st, who) {
    var html = (who ? '<div class="sec">' + esc(who) + '</div>' : '') +
      '<div class="stats"><div><b>' + st.q + '</b><span>' + T('Questions attempted', 'Preguntas intentadas') + '</span></div>' +
      '<div><b>' + st.first + '</b><span>' + T('Correct on the first try', 'Correctas al primer intento') + '</span></div>' +
      '<div><b>' + st.wrongs + '</b><span>' + T('Incorrect attempts', 'Intentos incorrectos') + '</span></div>' +
      '<div><b>' + (st.q ? Math.round(100 * st.first / st.q) + '%' : '—') + '</b><span>' + T('Accuracy', 'Precisión') + '</span></div></div>' +
      '<div class="skillrows"><div class="skillrow head"><span>' + T('Skill', 'Habilidad') + '</span><span>' + T('Questions', 'Preguntas') + '</span><span>' + T('Correct', 'Correctas') + '</span><span>' + T('Percent correct', 'Porcentaje') + '</span></div>' +
      MB.SKILLS.filter(function (s) { return G.skills.indexOf(s.id) >= 0; }).map(function (s) {
        var b = st.by[s.id];
        return '<div class="skillrow"><span>' + s.long + '</span><span>' + b.q + '</span><span>' + b.first + '</span>' + pctCell(b.first, b.q) + '</div>';
      }).join('') + '</div>';
    return html;
  }
  function endGame(winner) {
    G.phase = 'over'; G.paused = true;
    var secs = Math.round((Date.now() - G.started) / 1000), dur = Math.floor(secs / 60) + ':' + ('0' + secs % 60).slice(-2);
    var coins = save.coins - G.coinsAtStart, head, sub = '';
    if (G.mode === 'practice') head = T('Practice results', 'Resultados de la práctica');
    else if (winner === null || winner === undefined) head = T('Game ended', 'Juego terminado');
    else {
      head = G.mode === 'cpu' ? (winner === 0 ? T('You win!', '¡Ganaste!') : T('The computer wins this time', 'Esta vez gana la computadora')) : T(G.players[winner].name + ' wins!', '¡Gana ' + G.players[winner].name + '!');
      if (G.mode !== 'cpu' || winner === 0) { MB.Sound.play('win'); if (!MB.calm) for (var i = 0; i < 5; i++) setTimeout(function () { Rd.burst(MB.rand(200, 800), MB.rand(200, 520), MB.pick(['#ffd23f', '#62e3ff', '#7dffb0', '#ff8ae0']), 30, 220); }, i * 220); }
      else MB.Sound.play('lose');
      save.totals.games++; if (G.mode === 'cpu' && winner === 0) save.totals.wins++; MB.store();
    }
    if (G.mode !== 'practice') sub = '<p>' + T('Game time ', 'Duración ') + dur + ' · ' + T('Shots: ', 'Tiros: ') + G.players.map(function (p, k) { return esc(p.name) + ' ' + (G.mode === 'cpu' && k === 1 ? G.cpuShots || 0 : G.stats[k].shots); }).join(', ') + ' · <i class="cn" aria-hidden="true"></i> +' + coins + '</p>';
    else sub = '<p>' + T('Time ', 'Tiempo ') + dur + ' · <i class="cn" aria-hidden="true"></i> +' + coins + ' ' + (coins === 1 ? T('coin earned', 'moneda ganada') : T('coins earned', 'monedas ganadas')) + '</p>';
    var blocks = G.mode === 'two' ? statBlock(G.stats[0], G.players[0].name) + statBlock(G.stats[1], G.players[1].name) : statBlock(G.stats[0], '');
    showOv('<div class="card" style="width:900px"><div class="tag">' + modeName() + ' · ' + diffName() + '</div><h2>' + head + '</h2>' + sub + blocks +
      '<div class="btns"><button class="bt primary" id="e-again">' + T('Play again', 'Jugar otra vez') + '</button><button class="bt" id="e-shop"><i class="cn" aria-hidden="true"></i> ' + T('Shop', 'Tienda') + '</button><button class="bt" id="e-menu">' + T('Main menu', 'Menú principal') + '</button></div></div>', '#e-again');
    var card = ov.querySelector('.card'); if (card && card.scrollHeight > 690) { card.style.zoom = Math.max(0.62, Math.floor(690 / card.scrollHeight * 100) / 100); card.style.maxHeight = 'none'; }
    MB.say(head + '. ' + card.textContent.slice(0, 400));
    var mode = G.mode;
    on('e-again', function () { if (mode === 'practice') startMode(mode); else showRules(function () { startMode(mode); }); });
    on('e-shop', function () { showShop(showTitle); });
    on('e-menu', showTitle);
  }

  // ------------------------------------------------------------------ the shop
  function preview(cat, it) {
    var c = document.createElement('canvas'); c.width = 440; c.height = 140; var x = c.getContext('2d'); x.scale(2, 2);
    if (cat === 'table') {
      x.fillStyle = it.wood; Rd.rr(x, 4, 4, 212, 62, 12); x.fill(); x.fillStyle = it.cush; x.fillRect(16, 14, 188, 42); x.fillStyle = it.cloth; x.fillRect(20, 18, 180, 34);
      if (it.neon) { x.strokeStyle = it.neon; x.lineWidth = 2; Rd.rr(x, 5, 5, 210, 60, 11); x.stroke(); }
      x.fillStyle = '#000'; [[18, 16], [110, 14], [202, 16], [18, 54], [110, 56], [202, 54]].forEach(function (p) { x.beginPath(); x.arc(p[0], p[1], 4, 0, 7); x.fill(); });
      Rd.ballIcon(x, 'red', 3, 80, 36, 7); Rd.ballIcon(x, 'blue', 5, 130, 30, 7);
    } else if (cat === 'cue') {
      x.save(); x.translate(200, 35);
      var L = 190; [[0, 2, it.tip], [2, 8, '#f4f1e8'], [8, L * 0.58, it.shaft], [L * 0.58, L * 0.6, it.ring], [L * 0.6, L * 0.76, it.wrap], [L * 0.76, L * 0.78, it.ring], [L * 0.78, L, it.butt]].forEach(function (s) {
        var wa = 1.6 + s[0] / L * 3.4, wb = 1.6 + s[1] / L * 3.4; x.fillStyle = s[2]; x.beginPath(); x.moveTo(-s[0], -wa); x.lineTo(-s[1], -wb); x.lineTo(-s[1], wb); x.lineTo(-s[0], wa); x.fill();
      });
      if (it.glow) { x.globalAlpha = 0.35; x.strokeStyle = it.glow; x.lineWidth = 8; x.beginPath(); x.moveTo(-10, 0); x.lineTo(-L, 0); x.stroke(); }
      x.restore();
    } else if (cat === 'balls') {
      var keep = save.equip.balls; save.equip.balls = it.id;
      Rd.setQ(Q);   // (rebuild the ball pictures in this style for the preview)
      Rd.ballIcon(x, 'red', 1, 40, 35, 16); Rd.ballIcon(x, 'blue', 2, 85, 35, 16); Rd.ballIcon(x, 'eight', 8, 130, 35, 16); Rd.ballIcon(x, 'cue', 0, 175, 35, 16);
      save.equip.balls = keep; Rd.setQ(Q);
    } else {
      x.fillStyle = '#1f7a45'; Rd.rr(x, 4, 4, 212, 62, 10); x.fill();
      for (var i = 0; i < 18; i++) {
        var px = 30 + i * 9, col = it.trail === 'rainbow' ? 'hsl(' + i * 20 + ',90%,65%)' : it.col || it.puff || 'transparent';
        if (it.id === 'none') break;
        if (it.puff && !it.trail) { if (i > 4) break; x.fillStyle = it.puff; x.globalAlpha = 0.6; x.beginPath(); x.arc(30 + Math.cos(i) * 8, 35 + Math.sin(i * 2) * 8, 4, 0, 7); x.fill(); continue; }
        x.globalAlpha = i / 18; x.fillStyle = col; x.beginPath(); x.arc(px, 35 + (it.trail === 'sparks' ? Math.sin(i * 1.7) * 6 : 0), it.trail === 'comet' ? 2 + i / 5 : 2.5, 0, 7); x.fill();
      }
      x.globalAlpha = 1; Rd.ballIcon(x, 'cue', 0, 196, 35, 9);
      if (it.fireworks) { x.fillStyle = '#ffd23f'; for (i = 0; i < 10; i++) { x.beginPath(); x.arc(196 + Math.cos(i * 0.63) * 18, 35 + Math.sin(i * 0.63) * 18, 1.6, 0, 7); x.fill(); } }
    }
    return c;
  }
  function showShop(back) {
    var tab = 'cue';
    function draw(msg, flash) {
      var cat = MB.SHOP.filter(function (c) { return c.id === tab; })[0];
      showOv('<div class="card" style="width:860px"><div class="tag">' + T('Shop · everything is just for looks', 'Tienda · todo es solo de aspecto') + '</div><h2><i class="cn" aria-hidden="true"></i> ' + save.coins + ' ' + T('coins', 'monedas') + '</h2>' +
        '<p style="font-size:16px">' + T('Earn 1 coin for every correct answer.', 'Gana 1 moneda por cada respuesta correcta.') + '</p>' +
        '<div class="shop-tabs" role="tablist">' + MB.SHOP.map(function (c) { return '<button role="tab" data-t="' + c.id + '" aria-selected="' + (c.id === tab) + '">' + c.name + '</button>'; }).join('') + '</div>' +
        '<div class="items" id="items"></div><p id="shopmsg" style="min-height:1.5em;color:#ffd23f;margin-top:10px" aria-live="polite">' + (msg || '') + '</p>' +
        '<div class="btns"><button class="bt primary" id="sh-back">' + T('Done', 'Listo') + '</button></div></div>', flash ? '[data-i="' + flash + '"]' : '[aria-selected=true]');
      var box = $('#items');
      cat.items.forEach(function (it) {
        var own = MB.owns(tab, it.id), eq = save.equip[tab] === it.id, b = document.createElement('button');
        b.className = 'item' + (eq ? ' on' : '') + (flash === it.id ? ' bought' : ''); b.setAttribute('data-i', it.id);
        b.appendChild(preview(tab, it));
        var st = eq ? '<span class="eq">✓ ' + T('Equipped', 'Equipado') + '</span>' : own ? '<span>' + T('Owned · click to use', 'Tuyo · clic para usar') + '</span>' : '<span class="price"><i class="cn" aria-hidden="true"></i> ' + it.price + '</span>';
        b.insertAdjacentHTML('beforeend', '<b>' + it.name + '</b>' + st);
        b.setAttribute('aria-label', it.name + ', ' + (eq ? T('equipped', 'equipado') : own ? T('owned', 'tuyo') : it.price + T(' coins', ' monedas')));
        b.addEventListener('click', function () {
          if (!own) {
            if (save.coins < it.price) { MB.Sound.play('wrong'); $('#shopmsg').textContent = T('You need ' + (it.price - save.coins) + (it.price - save.coins === 1 ? ' more coin' : ' more coins') + '. Solve more shots!', 'Te ' + (it.price - save.coins === 1 ? 'falta 1 moneda' : 'faltan ' + (it.price - save.coins) + ' monedas') + '. ¡Resuelve más tiros!'); return; }
            save.coins -= it.price; save.owned.push(tab + ':' + it.id); MB.Sound.play('buy');
          } else MB.Sound.play('click');
          save.equip[tab] = it.id; MB.store(); Rd.setQ(Q);
          draw(it.name + ': ' + (own ? T('equipped.', 'equipado.') : T('bought and equipped!', '¡comprado y equipado!')), it.id);
        });
        box.appendChild(b);
      });
      [].forEach.call(ov.querySelectorAll('[data-t]'), function (b) { b.addEventListener('click', function () { MB.Sound.play('click'); tab = b.getAttribute('data-t'); draw(); }); });
      on('sh-back', function () { if (G.mode) drawHud(); back(); });
    }
    draw();
  }

  // ------------------------------------------------------------------ cheat code (same combo as the other games): Shift + T + A + V
  (function () {
    var down = {};
    addEventListener('keyup', function (e) { delete down[e.code]; });
    addEventListener('blur', function () { down = {}; });
    addEventListener('keydown', function (e) {
      down[e.code] = true;
      if (e.repeat || !e.shiftKey || !down.KeyT || !down.KeyA || !down.KeyV) return;
      down = {};
      save.coins = 999999;
      MB.SHOP.forEach(function (c) { c.items.forEach(function (it) { if (it.price && save.owned.indexOf(c.id + ':' + it.id) < 0) save.owned.push(c.id + ':' + it.id); }); });
      MB.store(); MB.Sound.play('buy');
      toast(T('Max coins · every cosmetic unlocked', 'Monedas al máximo · todo desbloqueado'), '#ffd23f');
      if (!hud.hidden) drawHud();
      if (!ov.hidden && !G.mode) showTitle();
    });
  })();

  // ------------------------------------------------------------------ start
  showTitle();
  requestAnimationFrame(frame);
})();
