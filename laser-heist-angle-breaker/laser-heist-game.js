// Laser Heist: Angle Breaker
// Each room: three laser puzzles, then a sneak. In a puzzle the student types the missing angle and the laser fires at
// exactly that angle; a hit knocks out one piece of the room's security (cameras, guard radios, or the locked shortcut
// doors and the guards' route plans). Then the student sneaks past the guards to the exit. Every room can be finished
// with all the security on; the math decides how hard it is.
// Progress (stars, diamonds, suits and lasers) is saved in this browser only and never sent anywhere.
(function () {
  'use strict';
  var T = window.tl || function (en) { return en; };
  var $ = function (s) { return document.querySelector(s); };
  var app = $('#lh'), stage = $('#stage'), cv = $('#cv'), ctx = cv.getContext('2d');
  var W = 1280, H = 720;
  var TAU = Math.PI * 2, D2R = Math.PI / 180;

  // ------------------------------------------------------------------ saved progress (this device only)
  var SAVE_KEY = 'laserheist_save';
  function fresh() { return { v: 1, stars: {}, diamonds: 0, owned: ['agent', 'cyan'], suit: 'agent', laser: 'cyan', bestStreak: 0, sound: true }; }
  var save = (function () {
    try { var s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1) return Object.assign(fresh(), s); } catch (e) {}
    return fresh();
  })();
  function store() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      localStorage.setItem('laserheist_unlocked_skins', JSON.stringify(save.owned));   // read by My Stats
      localStorage.setItem('laserheist_best_streak', String(save.bestStreak));
      if (save.highScore) localStorage.setItem('laserheist_high_score', String(save.highScore));   // the best Challenge score, also read by My Stats
    } catch (e) {}
  }
  var reset = $('#reset-progress-btn');
  if (reset) reset.addEventListener('click', function () {
    if (!confirm(T('Reset your Laser Heist progress? This erases your stars, diamonds, suits and lasers on this device. This cannot be undone.',
      '¿Borrar tu progreso de Laser Heist? Se borran tus estrellas, diamantes, trajes y láseres en este dispositivo. No se puede deshacer.'))) return;
    ['laserheist_save', 'laserheist_high_score', 'laserheist_best_streak', 'laserheist_unlocked_skins'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    save = fresh();
    location.reload();
  });

  // ------------------------------------------------------------------ cosmetics
  var SUITS = [
    { id: 'agent', name: T('Agent', 'Agente'), body: '#2c3a5c', trim: '#4fe3ff', cost: 0 },
    { id: 'shadow', name: T('Shadow', 'Sombra'), body: '#1a1426', trim: '#b57bff', cost: 12 },
    { id: 'crimson', name: T('Crimson', 'Carmesí'), body: '#5a1426', trim: '#ff5d7a', cost: 18 },
    { id: 'arctic', name: T('Arctic', 'Ártico'), body: '#c9dcef', trim: '#3a8fd8', cost: 24 },
    { id: 'jungle', name: T('Jungle', 'Selva'), body: '#1f4a2c', trim: '#9cf06a', cost: 24 },
    { id: 'gold', name: T('Gold', 'Oro'), body: '#6b5214', trim: '#ffd166', cost: 40 }
  ];
  var LASERS = [
    { id: 'cyan', name: T('Cyan', 'Cian'), col: '#4fe3ff', cost: 0 },
    { id: 'magenta', name: T('Magenta', 'Magenta'), col: '#ff4fa3', cost: 10 },
    { id: 'lime', name: T('Lime', 'Lima'), col: '#9cff4f', cost: 10 },
    { id: 'violet', name: T('Violet', 'Violeta'), col: '#b57bff', cost: 15 },
    { id: 'gold', name: T('Gold', 'Oro'), col: '#ffd166', cost: 20 },
    { id: 'rainbow', name: T('Rainbow', 'Arcoíris'), col: 'rainbow', cost: 50 }
  ];
  function suit() { return SUITS.filter(function (s) { return s.id === save.suit; })[0] || SUITS[0]; }
  function laserCol(t) {
    var l = LASERS.filter(function (s) { return s.id === save.laser; })[0] || LASERS[0];
    return l.col === 'rainbow' ? 'hsl(' + Math.round((t * 120) % 360) + ',100%,62%)' : l.col;
  }

  // ------------------------------------------------------------------ sound: made here, for this game only
  var Sound = (function () {
    var ac = null, master = null;
    function ctxA() {
      if (!ac) {
        try { var AC = window.AudioContext || window.webkitAudioContext; ac = new AC(); master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination); } catch (e) { ac = null; }
      }
      if (ac && ac.state === 'suspended') ac.resume();
      return ac;
    }
    function tone(type, f1, f2, dur, vol, delay) {
      var a = ctxA(); if (!a || !save.sound) return;
      var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f1, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    }
    function noise(dur, vol, freq, q, delay, type) {
      var a = ctxA(); if (!a || !save.sound) return;
      var t = a.currentTime + (delay || 0), n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      s.buffer = b; f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }
    var fx = {
      click: function () { tone('sine', 1500, 1100, 0.05, 0.12); },
      type: function () { tone('square', 2200, 0, 0.025, 0.04); },
      servo: function () { tone('sawtooth', 140, 260, 0.4, 0.06); noise(0.4, 0.04, 900, 2); },
      fire: function () { tone('sawtooth', 1800, 260, 0.45, 0.18); tone('square', 900, 120, 0.5, 0.06); noise(0.3, 0.12, 4200, 1.5); },
      spark: function () { noise(0.35, 0.35, 3200, 0.8); tone('square', 1200, 300, 0.2, 0.08, 0.05); },
      // a correct shot: a quick zap that climbs into a bright lock-on chime, with sparkle on top
      hit: function () {
        tone("sawtooth", 600, 1800, 0.12, 0.1);
        noise(0.15, 0.2, 3500, 1);
        [1047, 1319, 1568, 2093].forEach(function (f, i) { tone("square", f, 0, 0.12, 0.07, 0.08 + i * 0.07); tone("sine", f * 2, 0, 0.18, 0.04, 0.08 + i * 0.07); });
        noise(0.5, 0.1, 7000, 0.7, 0.3, "highpass");
      },
      powerdown: function () { tone('sine', 700, 60, 0.9, 0.22, 0.15); tone('triangle', 350, 40, 0.9, 0.12, 0.15); },
      miss: function () { noise(0.25, 0.22, 600, 1.2); tone('square', 220, 130, 0.3, 0.1); },
      gem: function () { [1568, 2093, 2637].forEach(function (f, i) { tone('triangle', f, 0, 0.18, 0.13, i * 0.06); }); },
      seen: function () { tone('sine', 880, 1320, 0.14, 0.14); },
      alarm: function () { for (var i = 0; i < 4; i++) tone('square', i % 2 ? 560 : 760, 0, 0.16, 0.12, i * 0.17); },
      caught: function () { tone('sawtooth', 220, 70, 0.8, 0.2); noise(0.6, 0.18, 300, 0.7); },
      smoke: function () { noise(1.1, 0.25, 500, 0.6, 0, 'lowpass'); },
      decoy: function () { [0, 0.25, 0.5].forEach(function (d) { tone('sine', 1046, 0, 0.12, 0.12, d); }); },
      door: function () { tone('sawtooth', 90, 180, 0.5, 0.1); noise(0.5, 0.08, 400, 1); },
      star: function (i) { tone('sine', [988, 1319, 1760][i] || 1760, 0, 0.5, 0.18); tone('triangle', ([988, 1319, 1760][i] || 1760) * 2, 0, 0.3, 0.05); },
      win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone('triangle', f, 0, 0.32, 0.14, i * 0.09); }); },
      tick: function () { tone("square", 1700, 0, 0.04, 0.07); tone("sine", 850, 0, 0.06, 0.06, 0.01); },
      exit: function () { tone('sine', 440, 880, 0.35, 0.15); tone('sine', 660, 1320, 0.35, 0.1, 0.1); }
    };
    return { play: function (n, a) { try { if (fx[n]) fx[n](a); } catch (e) {} }, unlock: ctxA };
  })();
  ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { if (save.sound) Sound.unlock(); }, { once: true }); });

  // ------------------------------------------------------------------ fitting the 1280 x 720 stage into the box
  var scale = 1, Q = 1;
  function fit() {
    var r = app.getBoundingClientRect();
    if (!r.width || !r.height) return;
    scale = Math.min(r.width / W, r.height / H);
    stage.style.transform = 'translate(' + (-W * scale / 2) + 'px,' + (-H * scale / 2) + 'px) scale(' + scale + ')';
    var q = Math.min(2, Math.max(1, (window.devicePixelRatio || 1) * scale));
    if (Math.abs(q - Q) > 0.05 || cv.width !== Math.round(W * q)) {
      Q = q; cv.width = Math.round(W * Q); cv.height = Math.round(H * Q);
      staticLayer = null; gridLayer = null; cityLayer = null;
    }
  }
  window.addEventListener('resize', fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(app);

  // ------------------------------------------------------------------ the story: five vaults, one floor of Vex Tower each
  // rels: the angle relationships on that floor. theme: the colors of its rooms in the sneak.
  var VAULTS = [
    { id: 1, name: T('The Gallery', 'La Galería'), rels: ['comp'], topic: T('Complementary angles', 'Ángulos complementarios'),
      tip: T('Every turret here is a right angle split in two. The two parts add to 90°.', 'Cada torreta aquí es un ángulo recto dividido en dos. Las dos partes suman 90°.'),
      brief: T('Viktor Vex stole the Prism of Euclid and locked it at the top of Vex Tower. Floor 1 is his art gallery. Every security turret here is set to a right angle, split into two parts: two complementary angles that add to 90°. Find the missing angle to aim your laser.',
        'Viktor Vex robó el Prisma de Euclides y lo encerró en lo alto de la Torre Vex. El piso 1 es su galería de arte. Cada torreta de seguridad está fijada en un ángulo recto dividido en dos partes: dos ángulos complementarios que suman 90°. Halla el ángulo que falta para apuntar tu láser.'),
      theme: { f1: '#0c1a34', f2: '#0e1d3a', w1: '#1a2b4e', w2: '#22375f', edge: '79,227,255', c1: '#25395f', c2: '#3d5a8c', lamp: '120,170,255', crate: 'box' } },
    { id: 2, name: T('Server Room', 'Sala de servidores'), rels: ['supp'], topic: T('Supplementary angles', 'Ángulos suplementarios'),
      tip: T('Every turret here sits on a straight line. The two angles add to 180°.', 'Cada torreta aquí está sobre una línea recta. Los dos ángulos suman 180°.'),
      brief: T('Floor 2 holds Vex’s computers: rows of humming server racks and cooling fans. His turrets here sit on straight beams, so each beam is split into two supplementary angles that add to 180°.',
        'El piso 2 guarda las computadoras de Vex: filas de servidores que zumban y ventiladores. Aquí sus torretas están sobre vigas rectas, así que cada viga se divide en dos ángulos suplementarios que suman 180°.'),
      theme: { f1: '#081f1c', f2: '#0a2420', w1: '#123530', w2: '#18463e', edge: '125,255,176', c1: '#0f2b28', c2: '#2f7d68', lamp: '90,255,190', crate: 'rack' } },
    { id: 3, name: T('Laser Lab', 'Laboratorio láser'), rels: ['vert'], topic: T('Vertical angles', 'Ángulos opuestos por el vértice'),
      tip: T('Two beams cross at every turret. The angles across from each other are equal.', 'En cada torreta se cruzan dos rayos. Los ángulos opuestos son iguales.'),
      brief: T('Floor 3 is the lab where Vex builds his lasers. Here two beams cross at every turret, making an X. The angles across from each other, called vertical angles, are always equal.',
        'El piso 3 es el laboratorio donde Vex fabrica sus láseres. Aquí dos rayos se cruzan en cada torreta y forman una X. Los ángulos opuestos, llamados opuestos por el vértice, siempre son iguales.'),
      theme: { f1: '#150d2a', f2: '#190f31', w1: '#281848', w2: '#33205a', edge: '181,123,255', c1: '#2a1c4e', c2: '#6a48b8', lamp: '200,140,255', crate: 'lab' } },
    { id: 4, name: T('Rail Yard', 'Patio de trenes'), rels: ['corr', 'alt'], topic: T('Parallel lines: corresponding and alternate angles', 'Paralelas: ángulos correspondientes y alternos'),
      tip: T('Two parallel rails cut by a crossing track. Corresponding angles and alternate interior angles are equal.', 'Dos rieles paralelos cortados por una vía. Los ángulos correspondientes y los alternos internos son iguales.'),
      brief: T('Floor 4 is Vex’s private rail yard, where his armored train loads the loot. Every turret sits where a crossing track cuts two parallel rails. Angles in the same position at each crossing (corresponding) are equal, and so are angles between the rails on opposite sides of the track (alternate interior).',
        'El piso 4 es el patio de trenes privado de Vex, donde su tren blindado carga el botín. Cada torreta está donde una vía cruza dos rieles paralelos. Los ángulos en la misma posición en cada cruce (correspondientes) son iguales, y también los ángulos entre los rieles en lados opuestos de la vía (alternos internos).'),
      theme: { f1: '#1c130d', f2: '#21170f', w1: '#382214', w2: '#472c19', edge: '255,160,80', c1: '#5a2a1c', c2: '#b85a2f', lamp: '255,180,100', crate: 'container' } },
    { id: 5, name: T('Penthouse Vault', 'Bóveda del ático'), rels: ['coint'], topic: T('Parallel lines: co-interior angles', 'Paralelas: ángulos colaterales internos'),
      tip: T('Parallel lines again. Angles between the lines, on the same side of the crossing line, add to 180°.', 'Otra vez paralelas. Los ángulos entre las rectas, del mismo lado de la transversal, suman 180°.'),
      brief: T('The top floor: Vex’s penthouse, all gold and marble. The Prism is in the last room. These turrets use parallel lines too, but here the two angles between the lines on the same side of the crossing line are co-interior: they add to 180°. The boss room mixes every angle you’ve learned.',
        'El último piso: el ático de Vex, todo oro y mármol. El Prisma está en la última sala. Estas torretas también usan paralelas, pero aquí los dos ángulos entre las rectas, del mismo lado de la transversal, son colaterales internos: suman 180°. La sala del jefe mezcla todos los ángulos que has aprendido.'),
      theme: { f1: '#14100a', f2: '#18130b', w1: '#2a2210', w2: '#382d14', edge: '255,209,102', c1: '#3a3018', c2: '#b8913e', lamp: '255,220,140', crate: 'statue' } }
  ];

  // Sneak maps: 32 x 16 tiles. # wall, c crate (blocks sight), s shadow (hide), P start, E exit, d diamond,
  // D shortcut door (opens when the blueprints panel is hit), . floor.
  // Guards: a list of [col,row] stops; loop: true walks the loop, otherwise back and forth.
  // Cameras: on a wall tile, facing dir (degrees, 0 = east, 90 = south), sweeping +/- sweep.
  var ROOMS = {
    1: [
      { name: T('The Lobby', 'El vestíbulo'),
        map: [
          '################################',
          '#P.....s.....#.................#',
          '#......s.....#..d..............#',
          '#..cc..s.....#.........cc......#',
          '#..cc........D.........cc......#',
          '#............#.................#',
          '#............#.................#',
          '######..######.....d...........#',
          '#............########...########',
          '#..d.........#.................#',
          '#.....cc.....#.................#',
          '#.....cc.....#.......cc....ss..#',
          '#............#.......cc....ssE.#',
          '#............#.............ss..#',
          '#ssss.........................d#',
          '################################'],
        guards: [{ path: [[16, 9], [27, 9], [27, 13], [16, 13]], loop: true }],
        cams: [{ c: 0, r: 11, dir: 0, sweep: 45 }],
        lamps: [[6, 4], [20, 4], [6, 11], [22, 10]] },
      { name: T('Sculpture Hall', 'Sala de esculturas'),
        map: [
          '################################',
          '#P....#...........#...........d#',
          '#.....#...........#............#',
          '#..s..#....cc.....#....cc......#',
          '#..s..#....cc.....D....cc......#',
          '#..s..............#............#',
          '#.....#...........#............#',
          '#.....#...d.......######..######',
          '#.....#...........#............#',
          '###.###....cc.....#............#',
          '#.....#....cc.....#.....ccc....#',
          '#.....#...........#.....ccc....#',
          '#..d..#...........#............#',
          '#.....######..#####.........ssE#',
          '#sssss.......................ss#',
          '################################'],
        guards: [{ path: [[8, 2], [16, 2], [16, 12], [8, 12]], loop: true },
                 { path: [[20, 9], [29, 9], [29, 12], [20, 12]], loop: true }],
        cams: [{ c: 18, r: 6, dir: 180, sweep: 40 }],
        lamps: [[12, 6], [24, 4], [24, 10], [3, 11]] },
      { name: T('Security Wing', 'Ala de seguridad'),
        map: [
          '################################',
          '#P.........#.........#........d#',
          '#..........#.........#.........#',
          '#..cc..s...#...cc....#...cc....#',
          '#..cc..s...D...cc....D...cc....#',
          '#......s...#.........#.........#',
          '#..........#.........#.........#',
          '###..#######...###########..####',
          '#..............................#',
          '#..d...........cc..............#',
          '#.....cc.......cc.......cc.....#',
          '#.....cc................cc.....#',
          '#######..#######..#######..#####',
          '#ssss..........................#',
          '#ssss.......................ssE#',
          '################################'],
        guards: [{ path: [[2, 8], [29, 8]], loop: false },
                 { path: [[6, 13], [26, 13]], loop: false }],
        cams: [{ c: 0, r: 9, dir: 0, sweep: 35 }, { c: 31, r: 13, dir: 180, sweep: 20 }],
        lamps: [[6, 3], [16, 3], [26, 3], [10, 9], [22, 9], [16, 13]] },
      { name: T('The Curator’s Office', 'La oficina del curador'), boss: true,
        map: [
          '################################',
          '#P...s.......#.......#.........#',
          '#....s..cc...#..d....#...ccc...#',
          '#....s..cc...#.......#...ccc...#',
          '#............D.......D.........#',
          '#####..#######..cc...#.........#',
          '#............#..cc...####..#####',
          '#..d.........#.......#.........#',
          '#....ccc.....###..####....d....#',
          '#....ccc.....................cc#',
          '#............................cc#',
          '####..#########..#######..######',
          '#..............................#',
          '#ss....cc.........cc.........E.#',
          '#ss....cc.........cc........ss.#',
          '################################'],
        guards: [{ path: [[15, 1], [19, 1], [19, 7], [15, 7]], loop: true },
                 { path: [[2, 10], [27, 10]], loop: false },
                 { path: [[3, 12], [29, 12]], loop: false }],
        cams: [{ c: 31, r: 7, dir: 180, sweep: 30 }, { c: 0, r: 13, dir: 0, sweep: 25 }],
        lamps: [[8, 3], [17, 3], [27, 4], [9, 9], [22, 9], [12, 13], [24, 13]] }
    ],
    // Floor 2: the Server Room (supplementary angles). c = server racks.
    2: [
      { name: T('Cooling Bay', 'Zona de enfriamiento'),
        map: [
          '################################',
          '#P..s....#..........#.........d#',
          '#...s....#..cc..cc..#..........#',
          '#........#..cc..cc..#....cc....#',
          '#........D..........D....cc....#',
          '#..cc....#..........#..........#',
          '#..cc....#..cc..cc..#..........#',
          '#........#..cc..cc..####..######',
          '#####..###..........#..........#',
          '#........#####..#####..........#',
          '#..d.....................cc....#',
          '#.....cc.............ss.cc.....#',
          '#.....cc.....cc......ss........#',
          '#............cc..........ssss..#',
          '#sss.....................ssssE.#',
          '################################'],
        guards: [{ path: [[11, 1], [18, 1], [18, 8], [11, 8]], loop: true },
                 { path: [[2, 10], [23, 10]], loop: false }],
        cams: [{ c: 31, r: 11, dir: 180, sweep: 30 }],
        lamps: [[5, 4], [14, 4], [26, 5], [8, 11], [20, 12]] },
      { name: T('Data Hall', 'Sala de datos'),
        map: [
          '################################',
          '#P.......#.............#......d#',
          '#..ss....#..c..c..c..c.#.......#',
          '#..ss....#.............#..cc...#',
          '#........#..c..c..c..c.#..cc...#',
          '#........D.............D.......#',
          '#..cc....#..c..c..c..c.#.......#',
          '#..cc....#.............#..ss...#',
          '#........#..c..c..c..c.#..ss...#',
          '####..####.............###..####',
          '#..............d...............#',
          '#....cc..............cc........#',
          '#....cc......ccc.....cc........#',
          '#............ccc...............#',
          '#ss.........................ssE#',
          '################################'],
        guards: [{ path: [[10, 1], [22, 1], [22, 5], [10, 5]], loop: true },
                 { path: [[1, 10], [29, 10]], loop: false },
                 { path: [[25, 1], [29, 1], [29, 8], [25, 8]], loop: true }],
        cams: [{ c: 0, r: 12, dir: 0, sweep: 30 }],
        lamps: [[5, 3], [16, 3], [27, 5], [8, 12], [24, 12]] },
      { name: T('Backup Vault', 'Bóveda de respaldo'),
        map: [
          '################################',
          '#P...#.........#.........#....d#',
          '#....#..ccc....#....cc...#.....#',
          '#....#..ccc....#....cc...#.....#',
          '#..................ss.....D....#',
          '#....#.........#....ss...#.....#',
          '#....#....cc...#.........#.....#',
          '##.###....cc...######..###..####',
          '#..........................s...#',
          '#..d....cc..........cc.....s...#',
          '#.......cc..........cc.........#',
          '#####..######..########..#######',
          '#..............................#',
          '#ss....cc.....ss.....cc......E.#',
          '#ss....cc.....ss.....cc.......s#',
          '################################'],
        guards: [{ path: [[1, 8], [29, 8]], loop: false },
                 { path: [[30, 12], [1, 12]], loop: false },
                 { path: [[12, 1], [14, 1], [14, 6], [12, 6]], loop: true }],
        cams: [{ c: 31, r: 9, dir: 180, sweep: 30 }],
        lamps: [[3, 4], [12, 3], [21, 4], [14, 9], [16, 13]] },
      { name: T('The Mainframe Core', 'El núcleo central'), boss: true,
        map: [
          '################################',
          '#P..s.......#........#........d#',
          '#...s..cc...#..cccc..#...cc....#',
          '#...s..cc...#..cccc..#...cc....#',
          '#...........D........D.........#',
          '#####..######........######..###',
          '#..........#..........#........#',
          '#..cc......#...ss.....#....cc..#',
          '#..cc..........ss..............#',
          '#..........#..........#........#',
          '####..########..##..######..####',
          '#..............................#',
          '#...cc....cc.........cc....cc..#',
          '#...cc....cc.........cc....cc..#',
          '#ss..........................sE#',
          '################################'],
        guards: [{ path: [[13, 1], [19, 1], [19, 9], [13, 9]], loop: true },
                 { path: [[1, 11], [30, 11]], loop: false },
                 { path: [[1, 6], [9, 6], [9, 9], [1, 9]], loop: true }],
        cams: [{ c: 0, r: 8, dir: 0, sweep: 30 }, { c: 31, r: 7, dir: 180, sweep: 30 }],
        lamps: [[6, 3], [16, 6], [26, 3], [6, 8], [26, 8], [15, 12]] }
    ],
    // Floor 3: the Laser Lab (vertical angles). c = lab benches.
    3: [
      { name: T('Prism Workshop', 'Taller de prismas'),
        map: [
          '################################',
          '#P.........#..........#.......d#',
          '#..cc..ss..#..c....c..#..cc....#',
          '#..cc..ss..#..........#..cc....#',
          '#..........D..c....c..D........#',
          '#..........#..........#........#',
          '######..####..c....c..####..####',
          '#..............................#',
          '#....cc.........ss.........cc..#',
          '#....cc.........ss.........cc..#',
          '#..............................#',
          '###..######..#######..######..##',
          '#........#..........#..........#',
          '#..d.....#....cc....#....ss....#',
          '#ss.................#....ssE...#',
          '################################'],
        guards: [{ path: [[1, 7], [30, 7]], loop: false },
                 { path: [[30, 10], [1, 10]], loop: false },
                 { path: [[12, 1], [20, 1], [20, 5], [12, 5]], loop: true }],
        cams: [{ c: 31, r: 8, dir: 180, sweep: 30 }],
        lamps: [[5, 4], [16, 3], [27, 4], [10, 8], [22, 8], [26, 13]] },
      { name: T('Mirror Maze', 'Laberinto de espejos'),
        map: [
          '################################',
          '#P..#......#......#......#....d#',
          '#...#..cc..#..cc..#..cc..#.....#',
          '#...#..cc.....cc.....cc..#..s..#',
          '#...#......#......#......#..s..#',
          '#......cc..#..cc..#..cc........#',
          '#...#......#......#......#.....#',
          '#...#####..####..####..###..####',
          '#..............................#',
          '#..ss....cc......cc......cc....#',
          '#..ss....cc......cc......cc....#',
          '#..............................#',
          '#####..#####..######..#####..###',
          '#..d.....#.........#.........sE#',
          '#........#....ss...#.........ss#',
          '################################'],
        guards: [{ path: [[1, 8], [30, 8]], loop: false },
                 { path: [[30, 11], [1, 11]], loop: false },
                 { path: [[20, 14], [28, 14]], loop: false }],
        cams: [{ c: 31, r: 9, dir: 180, sweep: 30 }],
        lamps: [[8, 4], [15, 4], [22, 4], [12, 9], [24, 9], [25, 13]] },
      { name: T('Beam Chamber', 'Cámara de rayos'),
        map: [
          '################################',
          '#P......s......#..............d#',
          '#.......s......#...cc....cc....#',
          '#..cc...s..cc..#...cc....cc....#',
          '#..cc......cc..D...............#',
          '#..............#....ss....ss...#',
          '#######..#######....ss....ss...#',
          '#..............#...............#',
          '#..d...cc......####..#####..####',
          '#......cc......................#',
          '#..............................#',
          '####..######..######..######..##',
          '#.....#...........#............#',
          '#..cc.#....cc.....#.....cc.....#',
          '#..cc......cc...........cc...sE#',
          '################################'],
        guards: [{ path: [[17, 1], [29, 1], [29, 7], [17, 7]], loop: true },
                 { path: [[1, 10], [30, 10]], loop: false },
                 { path: [[19, 12], [30, 12]], loop: false }],
        cams: [{ c: 0, r: 9, dir: 0, sweep: 30 }, { c: 31, r: 9, dir: 180, sweep: 25 }],
        lamps: [[6, 4], [22, 4], [10, 9], [24, 10], [9, 13], [25, 13]] },
      { name: T('Dr. Vex’s Lab', 'El laboratorio del Dr. Vex'), boss: true,
        map: [
          '################################',
          '#P..s...#.........#...........d#',
          '#...s...#..c...c..#..cc...cc...#',
          '#...s...D.........D............#',
          '#.......#..c...c..#..cc...cc...#',
          '#..cc...#.........#............#',
          '#..cc...####...####...######..##',
          '#..............................#',
          '#..d..cc.......ss.......cc.....#',
          '#.....cc.......ss.......cc.....#',
          '#..............................#',
          '###..#######..######..######..##',
          '#.........#.........#..........#',
          '#..ss.....#...cc....#....cc....#',
          '#..ss...............#....cc..sE#',
          '################################'],
        guards: [{ path: [[1, 7], [30, 7]], loop: false },
                 { path: [[30, 10], [1, 10]], loop: false },
                 { path: [[9, 1], [17, 1], [17, 5], [9, 5]], loop: true },
                 { path: [[21, 12], [30, 12]], loop: false }],
        cams: [{ c: 0, r: 8, dir: 0, sweep: 30 }, { c: 31, r: 9, dir: 180, sweep: 25 }],
        lamps: [[5, 3], [13, 3], [25, 3], [10, 8], [20, 8], [15, 13], [26, 13]] }
    ],
    // Floor 4: the Rail Yard (corresponding and alternate angles). c = shipping containers, t = train tracks.
    4: [
      { name: T('Freight Platform', 'Andén de carga'), rels: ['corr'],
        map: [
          '################################',
          '#P.....................#......d#',
          '#..cccc....cccc....s...#.......#',
          '#..cccc....cccc....s...D..ccc..#',
          '#..................s...#..ccc..#',
          '#tttttttttttttttttttttttttttttt#',
          '#..............................#',
          '#####..#########..#####..#######',
          '#..............................#',
          '#tttttttttttttttttttttttttttttt#',
          '#...cccc.....cccc.....cccc.....#',
          '#...cccc.....cccc.....cccc.....#',
          '#..............................#',
          '#..d.....ss..........ss........#',
          '#........ss..........ss......E.#',
          '################################'],
        guards: [{ path: [[1, 5], [30, 5]], loop: false },
                 { path: [[30, 9], [1, 9]], loop: false },
                 { path: [[1, 12], [30, 12]], loop: false }],
        cams: [{ c: 31, r: 8, dir: 180, sweep: 30 }],
        lamps: [[8, 3], [26, 3], [12, 8], [24, 8], [8, 13], [24, 13]] },
      { name: T('Signal Box', 'Caseta de señales'), rels: ['alt'],
        map: [
          '################################',
          '#P...#..........#.............d#',
          '#....#..cc..cc..#...cc....cc...#',
          '#....D..........D..............#',
          '#....#..cc..cc..#...cc....cc...#',
          '#....#..........#..............#',
          '#....######..####..########..###',
          '#tttttttttttttttttttttttttttttt#',
          '#..............................#',
          '###..########..######..#####..##',
          '#.........#..........#.........#',
          '#..cc.....#...ss.....#...cc....#',
          '#..cc..........ss..........cc..#',
          '#.........#..........#.........#',
          '#ss.......#......d...#.......sE#',
          '################################'],
        guards: [{ path: [[1, 7], [30, 7]], loop: false },
                 { path: [[7, 1], [15, 1], [15, 5], [7, 5]], loop: true },
                 { path: [[11, 10], [20, 10], [20, 13], [11, 13]], loop: true }],
        cams: [{ c: 31, r: 11, dir: 180, sweep: 30 }],
        lamps: [[3, 4], [12, 3], [24, 3], [15, 8], [5, 12], [16, 12], [26, 12]] },
      { name: T('Switching Yard', 'Patio de maniobras'), rels: ['corr', 'alt'],
        map: [
          '################################',
          '#P..s.......#..................#',
          '#...s..cc...#..cccc....cccc...d#',
          '#...s..cc...#..cccc....cccc....#',
          '#...........D..................#',
          '#tttttttttttttttttttttttttttttt#',
          '#..............................#',
          '######..######..cccc..######..##',
          '#.....................cccc.....#',
          '#tttttttttttttttttttttttttttttt#',
          '#..............................#',
          '#..cc....cccc.....cccc.....cc..#',
          '#..cc....cccc.....cccc.....cc..#',
          '#..d...........ss..............#',
          '#ss............ss............sE#',
          '################################'],
        guards: [{ path: [[1, 5], [30, 5]], loop: false },
                 { path: [[30, 9], [1, 9]], loop: false },
                 { path: [[3, 13], [28, 13]], loop: false }],
        cams: [{ c: 31, r: 6, dir: 180, sweep: 25 }],
        lamps: [[6, 3], [20, 3], [10, 8], [26, 8], [6, 12], [22, 13]] },
      { name: T('The Vex Express', 'El Expreso Vex'), boss: true, rels: ['corr', 'alt'],
        map: [
          '################################',
          '#P....#.......................d#',
          '#.....#..cccccc....cccccc......#',
          '#..s..D..cccccc....cccccc......#',
          '#..s..#........................#',
          '#..s..#tttttttttttttttttttttttt#',
          '#.....#........................#',
          '###..####..######..######..#####',
          '#..............................#',
          '#tttttttttttttttttttttttttttttt#',
          '#..cccccc....cccccc....cccccc..#',
          '#..............................#',
          '#####..######..######..######..#',
          '#..............................#',
          '#..d.....ss..........ss......E.#',
          '################################'],
        guards: [{ path: [[8, 4], [30, 4]], loop: false },
                 { path: [[1, 8], [30, 8]], loop: false },
                 { path: [[30, 11], [1, 11]], loop: false },
                 { path: [[1, 13], [30, 13]], loop: false }],
        cams: [{ c: 31, r: 9, dir: 180, sweep: 25 }, { c: 0, r: 14, dir: 0, sweep: 15 }],
        lamps: [[3, 2], [14, 1], [26, 6], [10, 8], [22, 8], [8, 13], [24, 13]] }
    ],
    // Floor 5: the Penthouse (co-interior angles; the boss mixes everything). c = statues and planters.
    5: [
      { name: T('Grand Foyer', 'Gran vestíbulo'),
        map: [
          '################################',
          '#P....s.....#.........#.......d#',
          '#.....s..c..#..c...c..#..c..c..#',
          '#.....s.....#.........#........#',
          '#..c.....c..D..c...c..D..c..c..#',
          '#...........#.........#........#',
          '#####..######...ss....######..##',
          '#...............ss.............#',
          '#..cc......cc.......cc......cc.#',
          '#..cc......cc.......cc......cc.#',
          '#..............................#',
          '###..######..########..#####..##',
          '#.........#............#.......#',
          '#..d..c...#....c..c....#...ss..#',
          '#ss.......#............#...ssE.#',
          '################################'],
        guards: [{ path: [[1, 7], [30, 7]], loop: false },
                 { path: [[30, 10], [1, 10]], loop: false },
                 { path: [[13, 1], [21, 1], [21, 5], [13, 5]], loop: true },
                 { path: [[24, 12], [30, 12]], loop: false }],
        cams: [{ c: 31, r: 8, dir: 180, sweep: 30 }],
        lamps: [[6, 3], [17, 3], [27, 3], [8, 8], [24, 8], [15, 13], [27, 13]] },
      { name: T('The Art Vault', 'La bóveda de arte'),
        map: [
          '################################',
          '#P..#.....................#...d#',
          '#...#..c....c....c....c...#....#',
          '#...D.....................D....#',
          '#...#..c....c....c....c...#....#',
          '#...#.....................#....#',
          '#...########..######..#####....#',
          '#..............................#',
          '#ss..cc......cc......cc......ss#',
          '#ss..cc......cc......cc......ss#',
          '#..............................#',
          '#######..#######..########..####',
          '#.........#...........#........#',
          '#..d......#...ss..ss..#........#',
          '#.........................ss..E#',
          '################################'],
        guards: [{ path: [[5, 1], [25, 1], [25, 5], [5, 5]], loop: true },
                 { path: [[1, 7], [30, 7]], loop: false },
                 { path: [[30, 10], [1, 10]], loop: false },
                 { path: [[11, 12], [21, 12]], loop: false }],
        cams: [{ c: 31, r: 13, dir: 180, sweep: 25 }],
        lamps: [[10, 3], [20, 3], [3, 8], [16, 8], [28, 8], [16, 13], [27, 13]] },
      { name: T('Rooftop Garden', 'Jardín de la azotea'), rels: ['coint', 'corr', 'alt'],
        map: [
          '################################',
          '#P.......ss.......ss..........d#',
          '#..cc....ss..cc...ss...cc......#',
          '#..cc........cc........cc......#',
          '#..............................#',
          '#.....cc.........cc.........cc.#',
          '#.....cc.........cc.........cc.#',
          '#..............................#',
          '#ss.....cc...ss.....cc...ss....#',
          '#ss.....cc...ss.....cc...ss....#',
          '#..............................#',
          '#...cc.......cc.......cc.......#',
          '#...cc.......cc.......cc.......#',
          '#..d...........................#',
          '#.....ss.........ss.........ssE#',
          '################################'],
        guards: [{ path: [[1, 4], [30, 4]], loop: false },
                 { path: [[30, 7], [1, 7]], loop: false },
                 { path: [[1, 10], [30, 10]], loop: false },
                 { path: [[30, 13], [1, 13]], loop: false }],
        cams: [{ c: 31, r: 10, dir: 180, sweep: 30 }],
        lamps: [[8, 4], [20, 4], [14, 7], [26, 7], [8, 10], [20, 10], [14, 13]] },
      { name: T('The Prism Room', 'La sala del Prisma'), boss: true, rels: ['comp', 'supp', 'vert', 'corr', 'alt', 'coint'],
        map: [
          '################################',
          '#P..s....#............#.......d#',
          '#...s....#..cc....cc..#..cc....#',
          '#...s....D............D..cc....#',
          '#........#..cc....cc..#........#',
          '####..####............####..####',
          '#.............ssss.............#',
          '#..cc.........ssss.........cc..#',
          '#..cc......................cc..#',
          '#..............................#',
          '####..######..####..######..####',
          '#.........#..........#.........#',
          '#..cc.....#...cc.....#.....cc..#',
          '#..cc..........cc..............#',
          '#ss.......#..........#.......sE#',
          '################################'],
        guards: [{ path: [[10, 1], [21, 1], [21, 8], [10, 8]], loop: true },
                 { path: [[1, 9], [30, 9]], loop: false },
                 { path: [[11, 11], [20, 11]], loop: false },
                 { path: [[22, 11], [30, 11], [30, 13], [22, 13]], loop: true }],
        cams: [{ c: 0, r: 7, dir: 0, sweep: 30 }, { c: 31, r: 7, dir: 180, sweep: 30 }],
        lamps: [[5, 3], [16, 3], [27, 3], [15, 7], [6, 8], [26, 8], [15, 12]] }
    ]
  };

  // ------------------------------------------------------------------ angle questions
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  // The angle relationships, one or two per floor. sum: the two angles add to that; eq: the two angles are equal.
  var RELS = {
    comp: { name: T('Complementary angles', 'Ángulos complementarios'), sum: 90,
      rule: T('Two angles that make a right angle: they add to 90°.', 'Dos ángulos que forman un ángulo recto: suman 90°.'),
      why: T('The two angles make a right angle:', 'Los dos ángulos forman un ángulo recto:') },
    supp: { name: T('Supplementary angles', 'Ángulos suplementarios'), sum: 180,
      rule: T('Two angles that make a straight line: they add to 180°.', 'Dos ángulos que forman una línea recta: suman 180°.'),
      why: T('The two angles make a straight line:', 'Los dos ángulos forman una línea recta:') },
    vert: { name: T('Vertical angles', 'Ángulos opuestos por el vértice'), eq: true,
      rule: T('Where two lines cross, the angles across from each other are equal.', 'Donde se cruzan dos rectas, los ángulos opuestos son iguales.'),
      why: T('Vertical angles are equal:', 'Los ángulos opuestos por el vértice son iguales:') },
    corr: { name: T('Corresponding angles', 'Ángulos correspondientes'), eq: true,
      rule: T('Parallel lines: angles in the same position at each crossing are equal.', 'Rectas paralelas: los ángulos en la misma posición en cada cruce son iguales.'),
      why: T('Corresponding angles are equal:', 'Los ángulos correspondientes son iguales:') },
    alt: { name: T('Alternate interior angles', 'Ángulos alternos internos'), eq: true,
      rule: T('Parallel lines: angles between the lines, on opposite sides of the transversal, are equal.', 'Rectas paralelas: los ángulos entre las rectas, en lados opuestos de la transversal, son iguales.'),
      why: T('Alternate interior angles are equal:', 'Los ángulos alternos internos son iguales:') },
    coint: { name: T('Co-interior angles', 'Ángulos colaterales internos'), sum: 180,
      rule: T('Parallel lines: angles between the lines, on the same side of the transversal, add to 180°.', 'Rectas paralelas: los ángulos entre las rectas, del mismo lado de la transversal, suman 180°.'),
      why: T('Co-interior angles add to 180°:', 'Los ángulos colaterales internos suman 180°:') }
  };

  // A question: the given angle (known), the angle the laser must turn to reach the panel (trueAngle), and what the
  // student types: x itself, or (in a boss room) x where the angle is x + d or x − d. The laser always turns the whole
  // angle, so it fires exactly where the student's answer points.
  // Its picture (q.scene) is drawn in its own flat frame (y up) and then turned and maybe mirrored onto the screen.
  var ARM = 250, SEC = function (t) { return [[0, t], [t, 180 - t], [180, t], [180 + t, 180 - t]]; };   // the four angles at a crossing
  function pol(v, a, r) { return [v[0] + Math.cos(a * D2R) * r, v[1] + Math.sin(a * D2R) * r]; }
  function makeQuestion(rel, boss) {
    var R = RELS[rel], q = { rel: rel }, k, sc = { segs: [], arcs: [] }, V = [0, 0];
    q.sense = Math.random() < 0.5 ? 1 : -1;
    q.base = rnd(0, 23) * 15;
    if (rel === 'comp' || rel === 'supp') {
      var S = R.sum;
      do { k = boss ? rnd(2, S === 90 ? 7 : 16) * 10 + pick([0, 0, 5]) : rnd(S === 90 ? 12 : 25, S === 90 ? 78 : 155); } while (k === 45 || k === 90 || k >= S - 8);
      q.known = k; q.trueAngle = S - k;
      sc.segs.push([V, pol(V, 0, ARM + 40)], [V, pol(V, S, ARM + 40)]);
      if (S === 180) sc.segs.push([V, pol(V, 180, ARM + 40)]);
      sc.dash = [V, pol(V, k, ARM - 10)];
      if (S === 90) sc.box = { v: V, a0: 0 };
      sc.arcs.push({ v: V, a0: 0, sw: k, r: 70, lr: 128, known: true }, { v: V, a0: k, sw: S - k, r: 104, lr: 162 });
      sc.turret = { v: V, rest: k }; sc.sumArc = { v: V, a0: 0, sw: S, r: 205, lr: 234 };
    } else if (rel === 'vert') {
      do { k = boss ? rnd(4, 15) * 10 + pick([0, 0, 5]) : rnd(30, 150); } while (k === 90);
      q.known = k; q.trueAngle = k;
      sc.segs.push([pol(V, 180, ARM + 40), pol(V, 0, ARM + 40)], [pol(V, k + 180, ARM + 40), pol(V, k, ARM + 40)]);
      sc.arcs.push({ v: V, a0: 0, sw: k, r: 70, lr: 122, known: true }, { v: V, a0: 180, sw: k, r: 70, lr: 122 });
      sc.turret = { v: V, rest: 180 };
    } else {   // parallel lines cut by a transversal: the given angle at the top crossing, x at the bottom one (the turret)
      var t; do { t = rnd(40, 140); } while (t > 80 && t < 100);
      // x never ends on the crossing line toward the top crossing, so the panel can't cover the given angle
      var pairs = rel === 'corr' ? [[1, 1], [2, 2], [3, 3]] : rel === 'alt' ? [[3, 1]] : [[2, 1]];
      var pr = pick(pairs), sec = SEC(t), V2 = V, V1 = pol(V, t, 250), LL = 230;
      q.known = sec[pr[0]][1]; q.trueAngle = sec[pr[1]][1];
      sc.segs.push([pol(V2, 180, LL), pol(V2, 0, LL)], [pol(V1, 180, LL), pol(V1, 0, LL)], [pol(V2, t + 180, 90), pol(V1, t, 90)]);
      sc.par = [V1, V2, LL];   // little arrow marks show the lines are parallel
      sc.arcs.push({ v: V1, a0: sec[pr[0]][0], sw: sec[pr[0]][1], r: 58, lr: 98, known: true }, { v: V2, a0: sec[pr[1]][0], sw: sec[pr[1]][1], r: 76, lr: 116 });
      sc.turret = { v: V2, rest: sec[pr[1]][0] }; sc.panelR = 150;
      q.base = pick([-20, -15, -10, -5, 0, 5, 10, 15, 20]) + (Math.random() < 0.5 ? 0 : 180);   // the parallel lines stay roughly level
      if (rel === 'coint') sc.sumNote = true;
      k = q.known;
    }
    // a boss writes the other angle as x + d or x − d (small numbers, so it works out in your head)
    q.offset = 0; q.xLabel = 'x';
    if (boss) {
      var d = rnd(1, 9), plus = Math.random() < 0.6;
      if (plus && q.trueAngle - d < 5) d = Math.max(1, q.trueAngle - 5);   // keep x at least a few degrees
      q.offset = plus ? d : -d; q.xLabel = plus ? 'x + ' + d : 'x − ' + d;
    }
    q.answer = q.trueAngle - q.offset;
    q.knownLabel = k + '°';
    sc.arcs[1].lab = q.xLabel; sc.arcs[0].lab = q.knownLabel;
    sc.panel = { v: sc.turret.v, dir: sc.turret.rest + q.trueAngle, r: sc.panelR || ARM };
    q.scene = sc;
    // words
    var x = q.xLabel, Sx = R.sum;
    q.ask = boss ? T('One angle is <b>' + k + '°</b> and the other is <b>' + x + '</b>. Find <b>x</b>.', 'Un ángulo mide <b>' + k + '°</b> y el otro <b>' + x + '</b>. Halla <b>x</b>.')
      : T('The marked angle is <b>' + k + '°</b>. Find <b>x</b> to aim the laser at the panel.', 'El ángulo marcado mide <b>' + k + '°</b>. Halla <b>x</b> para apuntar el láser al panel.');
    q.sr = R.name + '. ' + (boss ? T('One angle is ' + k + ' degrees and the other is ' + x.replace('−', 'minus').replace('+', 'plus') + '. Find x.', 'Un ángulo mide ' + k + ' grados y el otro ' + x.replace('−', 'menos').replace('+', 'más') + '. Halla x.')
      : T('The marked angle is ' + k + ' degrees. Find x.', 'El ángulo marcado mide ' + k + ' grados. Halla x.'));
    var undo = q.offset > 0 ? T('Take away ' + q.offset + ' to undo the + ' + q.offset + ':', 'Resta ' + q.offset + ' para deshacer el + ' + q.offset + ':')
      : T('Add ' + (-q.offset) + ' to undo the − ' + (-q.offset) + ':', 'Suma ' + (-q.offset) + ' para deshacer el − ' + (-q.offset) + ':');
    var xs = q.offset ? '(' + x + ')' : 'x';
    if (Sx) {
      q.steps = [[R.why, k + '° + ' + xs + ' = ' + Sx + '°'],
        [T('Take ' + k + '° away from ' + Sx + '°:', 'Resta ' + k + '° de ' + Sx + '°:'), x + ' = ' + Sx + '° − ' + k + '° = ' + q.trueAngle + '°']];
    } else {
      q.steps = [[R.why, x + ' = ' + k + '°']];
    }
    q.steps.push(q.offset ? [undo, 'x = <b>' + q.answer + '°</b>'] : [T('So:', 'Entonces:'), 'x = <b>' + q.answer + '°</b>']);
    return q;
  }
  function mistakeNote(q, v) {
    var R = RELS[q.rel];
    if (q.offset && v === q.trueAngle) return T('That’s the whole angle, ' + q.xLabel + '. Now find <b>x</b>.', 'Ese es el ángulo completo, ' + q.xLabel + '. Ahora halla <b>x</b>.');
    if (R.sum) {
      var other = R.sum === 90 ? 180 : 90;
      if (v === other - q.known - q.offset) return T('That’s ' + other + '° − ' + q.known + '°. ' + R.name + ' add to <b>' + R.sum + '°</b>, not ' + other + '°.', 'Eso es ' + other + '° − ' + q.known + '°. Los ' + R.name.toLowerCase() + ' suman <b>' + R.sum + '°</b>, no ' + other + '°.');
      if (v === q.known) return T('That’s the same as the given angle. These two angles add to <b>' + R.sum + '°</b>; they aren’t equal.', 'Es igual al ángulo dado. Estos dos ángulos suman <b>' + R.sum + '°</b>; no son iguales.');
    } else if (v === 180 - q.known - q.offset) {
      return T('That’s 180° − ' + q.known + '°. ' + R.name + ' are <b>equal</b>; they don’t add to 180°.', 'Eso es 180° − ' + q.known + '°. Los ' + R.name.toLowerCase() + ' son <b>iguales</b>; no suman 180°.');
    }
    return '';
  }

  // ------------------------------------------------------------------ game state
  var G = {
    screen: 'title', vault: 1, room: 0, paused: false, t: 0,
    streak: 0, smoke: 0, decoy: 0,
    mode: 'story', prac: null, ch: null,
    puzzle: null, sneak: null, calm: matchMedia('(prefers-reduced-motion: reduce)').matches
  };
  app.classList.toggle('calm', G.calm);
  var keys = { up: false, down: false, left: false, right: false };
  var parts = [];   // sparks and dust

  function say(msg) { var l = $('#live'); l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 50); }
  var toastTimer = 0;
  function toast(msg, col) { var t = $('#toast'); t.textContent = msg; t.style.color = col || '#e6f0ff'; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800); }
  function starsFor(v, r) { return save.stars[v + '-' + r] || 0; }
  function vaultStars(v) { var n = 0; (ROOMS[v] || []).forEach(function (_, i) { n += starsFor(v, i); }); return n; }
  function unlocked(v, r) { return r === 0 || starsFor(v, r - 1) > 0; }
  // a floor opens once the boss room of the floor below has been cleared
  function floorOpen(v) { return v === 1 || starsFor(v - 1, (ROOMS[v - 1] || []).length - 1) > 0; }

  // ------------------------------------------------------------------ overlays (title, map, briefing, results, shop, pause)
  var ovMain = $('#ov-main'), ovTitle = $('#ov-title');
  function showOv(el, html, focusSel) {
    [ovMain, ovTitle].forEach(function (o) { if (o !== el) o.hidden = true; });
    ovMain.classList.remove("clear");
    el.innerHTML = html; el.hidden = false;
    var f = el.querySelector(focusSel || '.primary') || el.querySelector('button:not([disabled])');
    if (f) setTimeout(function () { f.focus(); }, 30);
  }
  function hideOv() { ovMain.hidden = true; ovTitle.hidden = true; }
  // arrow keys move between the buttons of whatever card is showing
  document.addEventListener('keydown', function (e) {
    if (window.isPageControlKey && isPageControlKey(e)) return;
    var ov = !ovMain.hidden ? ovMain : !ovTitle.hidden ? ovTitle : null;
    if (!ov || !/^Arrow/.test(e.key)) return;
    var bs = [].slice.call(ov.querySelectorAll('button:not([disabled])'));
    if (!bs.length) return;
    var i = bs.indexOf(document.activeElement);
    e.preventDefault();
    var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    bs[(i + d + bs.length) % bs.length].focus();
  });
  function on(id, fn) { var b = document.getElementById(id); if (b) b.addEventListener('click', function () { Sound.play('click'); fn(); }); }

  function showTitle() {
    G.screen = 'title'; G.paused = false;
    $('#hud').hidden = true; $('#qpanel').hidden = true; $('#gadgets').hidden = true;
    var total = 0; Object.keys(save.stars).forEach(function (k) { total += save.stars[k]; });
    showOv(ovTitle, '<div class="title-wrap">' +
      '<div class="case">' + T('Case file 001 · Top secret', 'Expediente 001 · Alto secreto') + '</div>' +
      '<div class="title-logo"><span class="cut">LASER HEIST</span><b>' + T('ANGLE BREAKER', 'ROMPEÁNGULOS') + '</b></div>' +
      '<p class="pitch">' + T('Viktor Vex stole the <b>Prism of Euclid</b>. It’s locked at the top of his tower. Aim your laser with angles, knock out the security, and sneak past the guards to get it back.',
        'Viktor Vex robó el <b>Prisma de Euclides</b>. Está encerrado en lo alto de su torre. Apunta tu láser con ángulos, apaga la seguridad y pasa sin que te vean los guardias para recuperarlo.') + '</p>' +
      '<div class="tbtns"><button class="bt primary big" id="b-play">&#9654; ' + (total ? T('CONTINUE MISSION', 'CONTINUAR MISIÓN') : T('START MISSION', 'EMPEZAR MISIÓN')) + '</button>' +
      '<span class="brk"></span><button class="bt" id="b-prac">' + T('PRACTICE', 'PRÁCTICA') + '</button><button class="bt" id="b-chal">' + T('CHALLENGE', 'DESAFÍO') + '</button>' +
      '<button class="bt" id="b-shop">&#9670; ' + T('SHOP', 'TIENDA') + '</button><button class="bt" id="b-how">' + T('HOW TO PLAY', 'CÓMO JUGAR') + '</button></div>' +
      '<div class="tstats"><span>&#9733; ' + total + ' ' + (total === 1 ? T('star', 'estrella') : T('stars', 'estrellas')) + '</span><span>&#9670; ' + save.diamonds + ' ' + (save.diamonds === 1 ? T('diamond', 'diamante') : T('diamonds', 'diamantes')) + '</span>' +
      (save.highScore ? '<span>' + T('Best challenge: ', 'Récord del desafío: ') + save.highScore + '</span>' : '') + '</div></div>');
    on('b-play', showMap); on('b-shop', function () { showShop(showTitle); }); on('b-how', function () { showHow(showTitle); });
    on('b-prac', showPracticeSetup); on('b-chal', startChallenge);
    cv.setAttribute('aria-label', T('Vex Tower at night, with the Prism glowing at the top', 'La Torre Vex de noche, con el Prisma brillando en lo alto'));
  }
  function showHow(back) {
    showOv(ovMain, '<div class="card"><div class="tag">' + T('How to play', 'Cómo jugar') + '</div><h2>' + T('Every room has two parts', 'Cada sala tiene dos partes') + '</h2>' +
      '<p><b style="color:#4fe3ff">1. ' + T('Laser puzzle.', 'Rompecabezas láser.') + '</b> ' + T('Type the missing angle and fire. The laser goes exactly where you aim. Each hit knocks out one security system: the <b>cameras</b>, the guards’ <b>radios</b> (slower, shorter-sighted guards), or the <b>blueprints</b> (shortcut doors open and guard routes are shown).',
        'Escribe el ángulo que falta y dispara. El láser va justo a donde apuntas. Cada acierto apaga un sistema: las <b>cámaras</b>, las <b>radios</b> de los guardias (más lentos y ven menos lejos) o los <b>planos</b> (se abren puertas de atajo y se ven las rutas).') + '</p>' +
      '<p><b style="color:#ff4fa3">2. ' + T('The sneak.', 'El escape.') + '</b> ' + T('Move with the arrow keys or WASD. Stay out of the light cones, hide in shadows and behind crates, grab diamonds, and reach the exit. If a guard sees you, the alert meter fills; hide and it drains.',
        'Muévete con las flechas o WASD. Evita los conos de luz, escóndete en las sombras y detrás de las cajas, toma diamantes y llega a la salida. Si un guardia te ve, la alerta se llena; escóndete y baja.') + '</p>' +
      '<p>' + T('Get 3 right in a row for a <b>smoke bomb</b> (key 1), 5 in a row for a <b>decoy</b> (key 2). Spend diamonds in the shop.', 'Acierta 3 seguidas para ganar una <b>bomba de humo</b> (tecla 1) y 5 seguidas para un <b>señuelo</b> (tecla 2). Gasta diamantes en la tienda.') + '</p>' +
      '<div class="btns"><button class="bt primary" id="b-back">' + T('GOT IT', 'ENTENDIDO') + '</button></div></div>');
    on('b-back', back);
  }
  // The tower menu: the floors stacked into Vex Tower (Floor 1 at the bottom, the Prism at the top), and the chosen
  // floor's rooms as vault doors beside it
  function showMap() {
    G.mode = 'story';
    G.mode = 'story'; G.screen = 'map'; $('#hud').hidden = true; $('#qpanel').hidden = true; $('#gadgets').hidden = true;
    var v = G.vault, rooms = ROOMS[v] || [], vt = VAULTS[v - 1];
    var floors = VAULTS.slice().reverse().map(function (f) {
      var max = (ROOMS[f.id] || []).length * 3, here = f.id === v;
      return '<button class="floor' + (here ? ' here' : '') + (floorOpen(f.id) ? '' : ' locked') + '" data-v="' + f.id + '"' + (floorOpen(f.id) ? '' : ' disabled') + ' aria-label="' + T('Floor ', 'Piso ') + f.id + ': ' + f.name + (floorOpen(f.id) ? '' : T(', locked: clear the boss room on the floor below', ', cerrado: supera la sala del jefe del piso de abajo')) + '"' + '>' +
        '<span class="fn">' + f.id + '</span><span class="fname">' + f.name + '</span>' +
        '<span class="fst">' + (floorOpen(f.id) ? '&#9733; ' + vaultStars(f.id) + '/' + max : '&#128274;') + '</span>' +
        (here ? '<span class="you" aria-hidden="true"></span>' : '') + '</button>';
    }).join('');
    var doors = rooms.map(function (rm, i) {
      var s = starsFor(v, i), ok = unlocked(v, i);
      return '<button class="door' + (rm.boss ? ' boss' : '') + (s ? ' done' : '') + '" data-r="' + i + '"' + (ok ? '' : ' disabled') +
        ' aria-label="' + (rm.boss ? T('Boss room: ', 'Sala del jefe: ') : T('Room ', 'Sala ') + (i + 1) + ': ') + rm.name + (ok ? ', ' + s + T(' of 3 stars', ' de 3 estrellas') : ', ' + T('locked', 'cerrada')) + '">' +
        '<span class="wheel" aria-hidden="true">' + (ok ? (rm.boss ? '&#9760;' : (i + 1)) : '&#128274;') + '</span>' +
        '<span class="dname">' + (rm.boss ? T('BOSS', 'JEFE') : T('ROOM ', 'SALA ') + (i + 1)) + '</span><span class="dsub">' + rm.name + '</span>' +
        '<span class="dst" aria-hidden="true">' + [0, 1, 2].map(function (k) { return '<i class="' + (k < s ? 'on' : '') + '">&#9733;</i>'; }).join('') + '</span></button>';
    }).join('');
    var html = '<div class="tower-screen">' +
      '<div class="tower"><div class="spire" aria-hidden="true"><div class="prism"></div></div>' + floors + '<div class="lobby" aria-hidden="true">' + T('VEX TOWER', 'TORRE VEX') + '</div></div>' +
      '<div class="floor-info"><div class="tag">' + T('Floor ', 'Piso ') + v + ' · ' + vt.topic + '</div>' +
      '<h2>' + vt.name + '</h2><p>' + vt.tip + '</p>' +
      '<div class="doors">' + doors + '</div>' +
      '<div class="btns"><button class="bt" id="b-shop">&#9670; ' + save.diamonds + ' · ' + T('SHOP', 'TIENDA') + '</button><button class="bt" id="b-home">' + T('TITLE', 'INICIO') + '</button></div></div></div>';
    var firstOpen = 0; rooms.forEach(function (_, i) { if (unlocked(v, i) && starsFor(v, i) === 0 && !firstOpen) firstOpen = i + 1; });
    showOv(ovMain, html, '.door[data-r="' + Math.max(0, firstOpen - 1) + '"]');
    ovMain.classList.add('clear');
    [].forEach.call(ovMain.querySelectorAll('.floor:not([disabled])'), function (b) {
      b.addEventListener('click', function () { var nv = +b.getAttribute('data-v'); if (nv === G.vault) return; Sound.play('click'); G.vault = nv; showMap(); });
    });
    [].forEach.call(ovMain.querySelectorAll('.door'), function (b) {
      b.addEventListener('click', function () { Sound.play('click'); var r = +b.getAttribute('data-r'); if (r === 0 && !starsFor(v, 0)) showBrief(r); else startRoom(r); });
    });
    on('b-shop', function () { showShop(showMap); }); on('b-home', showTitle);
    cv.setAttribute('aria-label', T('Vex Tower: choose a floor and a room', 'Torre Vex: elige un piso y una sala'));
  }
  function showBrief(r) {
    var vt = VAULTS[G.vault - 1];
    showOv(ovMain, '<div class="card"><div class="tag">' + T('Mission briefing · Floor ', 'Misión · Piso ') + vt.id + '</div><h2>' + vt.name + '</h2><p>' + vt.brief + '</p>' +
      '<div class="btns"><button class="bt primary" id="b-go">' + T('START MISSION', 'EMPEZAR MISIÓN') + '</button></div></div>');
    on('b-go', function () { startRoom(r); });
    say(vt.name + '. ' + $('#ov-main p').textContent);
  }
  function showShop(back) {
    function tile(list, kind) {
      return list.map(function (it) {
        var own = save.owned.indexOf(kind + ':' + it.id) >= 0 || it.cost === 0, eq = save[kind] === it.id;
        var sw = kind === 'suit' ? 'background:' + it.body + ';box-shadow:inset 0 0 0 4px ' + it.trim
          : 'background:' + (it.col === 'rainbow' ? 'conic-gradient(red,orange,yellow,lime,cyan,blue,magenta,red)' : it.col) + ';box-shadow:0 0 12px ' + (it.col === 'rainbow' ? '#fff' : it.col);
        return '<button class="item' + (eq ? ' on' : '') + '" data-k="' + kind + '" data-id="' + it.id + '" aria-pressed="' + eq + '"><span class="sw" style="' + sw + '"></span>' + it.name +
          '<span class="cost">' + (eq ? T('Wearing', 'Puesto') : own ? T('Owned', 'Tuyo') : '&#9670; ' + it.cost) + '</span></button>';
      }).join('');
    }
    showOv(ovMain, '<div class="card" style="width:820px"><div class="tag">' + T('Gadget shop', 'Tienda') + '</div><h2>&#9670; ' + save.diamonds + ' ' + T('diamonds', 'diamantes') + '</h2>' +
      '<div class="shop"><div><h3>' + T('SUITS', 'TRAJES') + '</h3><div class="items">' + tile(SUITS, 'suit') + '</div></div>' +
      '<div><h3>' + T('LASERS', 'LÁSERES') + '</h3><div class="items">' + tile(LASERS, 'laser') + '</div></div></div>' +
      '<p id="shop-msg" style="min-height:1.5em;margin-top:14px;font-size:18px" aria-live="polite"></p>' +
      '<div class="btns"><button class="bt primary" id="b-back">' + T('DONE', 'LISTO') + '</button></div></div>', '.item.on');
    [].forEach.call(ovMain.querySelectorAll('.item'), function (b) {
      b.addEventListener('click', function () {
        var kind = b.getAttribute('data-k'), id = b.getAttribute('data-id'), list = kind === 'suit' ? SUITS : LASERS;
        var it = list.filter(function (x) { return x.id === id; })[0], own = it.cost === 0 || save.owned.indexOf(kind + ':' + id) >= 0;
        if (!own) {
          if (save.diamonds < it.cost) { Sound.play('miss'); $('#shop-msg').textContent = T('You need ' + (it.cost - save.diamonds) + ' more diamonds. Grab them in the rooms!', 'Te faltan ' + (it.cost - save.diamonds) + ' diamantes. ¡Búscalos en las salas!'); return; }
          save.diamonds -= it.cost; save.owned.push(kind + ':' + id); Sound.play('gem');
        } else Sound.play('click');
        save[kind] = id; store();
        showShop(back);
        $('#shop-msg').textContent = it.name + ': ' + T('equipped.', 'equipado.');
      });
    });
    on('b-back', back);
  }

  // ------------------------------------------------------------------ HUD
  function hud() {
    var h = $('#hud'), rm = ROOMS[G.vault][G.room];
    var where = G.mode === 'practice' ? T('Practice', 'Práctica') + ' · ' + (G.prac.rels.length > 2 ? G.prac.rels.length + T(' angle types', ' tipos de ángulos') : G.prac.rels.map(function (r) { return RELS[r].name; }).join(' + '))
      : (G.mode === 'challenge' ? T('Challenge', 'Desafío') + ' · ' : '') + T('Floor ', 'Piso ') + G.vault + ' · ' + (rm.boss ? T('Boss: ', 'Jefe: ') : T('Room ', 'Sala ') + (G.room + 1) + ': ') + rm.name;
    var html = '<span class="where">' + where + '</span><span class="grow"></span>';
    if (G.mode === 'challenge') html += '<span class="chip">' + T('SCORE ', 'PUNTOS ') + '<b id="score">' + G.ch.score + '</b></span><span class="chip" aria-label="' + G.ch.lives + T(' lives', ' vidas') + '">' + hearts() + '</span>';
    if (G.screen === 'sneak') {
      var S = G.sneak;
      html += '<span class="chip' + (S.camOff ? ' off' : '') + '" title="' + T('Cameras', 'Cámaras') + '">&#128249; ' + (S.camOff ? T('OFF', 'NO') : T('ON', 'SÍ')) + '</span>' +
        '<span class="chip' + (S.radioOff ? ' off' : '') + '">&#128225; ' + (S.radioOff ? T('JAMMED', 'BLOQ.') : T('ON', 'SÍ')) + '</span>' +
        '<span class="chip' + (S.mapOn ? ' off' : '') + '">&#128682; ' + (S.mapOn ? T('OPEN', 'ABIERTAS') : T('LOCKED', 'CERRADAS')) + '</span>' +
        '<span class="chip timer" id="timer" role="timer" aria-label="' + T('Time left', 'Tiempo restante') + '">0:30</span>' +
        '<span>' + T('ALERT', 'ALERTA') + '</span><span class="meter"><i id="meter"></i></span>'
    }
    html += '<span class="chip gem">&#9670; <b id="gems">' + (save.diamonds + (G.sneak && G.screen === 'sneak' ? G.sneak.got : 0)) + '</b></span>' +
      '<button class="btn-menu" id="b-menu" aria-label="' + T('Menu (Esc)', 'Menú (Esc)') + '">&#9776; ' + T('MENU', 'MENÚ') + '</button>';
    h.innerHTML = html; h.hidden = false;
    on('b-menu', openPause);
  }
  function gadgetsUI() {
    var g = $('#gadgets');
    g.hidden = G.screen !== 'sneak';
    g.innerHTML = '<button id="b-smoke"' + (G.smoke ? '' : ' disabled') + '>&#128168; ' + T('Smoke', 'Humo') + ' ×' + G.smoke + ' <kbd>[1]</kbd></button>' +
      '<button id="b-decoy"' + (G.decoy ? '' : ' disabled') + '>&#128266; ' + T('Decoy', 'Señuelo') + ' ×' + G.decoy + ' <kbd>[2]</kbd></button>';
    $('#b-smoke').addEventListener('click', useSmoke); $('#b-decoy').addEventListener('click', useDecoy);
  }

  // ------------------------------------------------------------------ the laser puzzle
  var PANELS = [
    { id: 'cam', name: T('Cameras', 'Cámaras'), icon: '&#128249;', short: 'CAM', tip: T('Cameras off', 'Cámaras apagadas'), effect: T('The cameras are offline.', 'Las cámaras están apagadas.') },
    { id: 'radio', name: T('Guard radios', 'Radios'), icon: '&#128225;', short: 'RADIO', tip: T('Slower guards', 'Guardias lentos'), effect: T('Radios jammed: the guards are slower and can’t see as far.', 'Radios bloqueadas: los guardias son más lentos y no ven tan lejos.') },
    { id: 'map', name: T('Blueprints', 'Planos'), icon: '&#128506;', short: 'MAP', tip: T('Doors open', 'Puertas abiertas'), effect: T('Blueprints stolen: the shortcut doors are open and the guards’ routes are shown.', 'Planos robados: las puertas de atajo están abiertas y se ven las rutas de los guardias.') }
  ];
  function startRoom(r) {
    G.room = r; G.screen = 'puzzle'; G.paused = false; hideOv();
    $("#gadgets").hidden = true;
    var rm = ROOMS[G.vault][r], rels = rm.rels || VAULTS[G.vault - 1].rels;
    // three questions; in a room with more than one relationship, each one comes up before any repeats
    var order = rels.slice().sort(function () { return Math.random() - 0.5; });
    var qs = [0, 1, 2].map(function (i) { return makeQuestion(order[i % order.length], rm.boss); });
    G.puzzle = { i: 0, hits: [false, false, false], firstTry: true, qs: qs, phase: 'ask', anim: 0, typed: null, aim: null };
    G.puzzle.aim = wa(qs[0], qs[0].scene.turret.rest);
    placeDiagram(qs[0]);
    hud(); renderQ();
    cv.setAttribute('aria-label', T('A laser turret on a hologram of the angle diagram', 'Una torreta láser sobre un holograma del diagrama de ángulos'));
  }
  function renderQ() {
    var P = G.puzzle, q = P.qs[P.i], pn = PANELS[P.i], last = P.i === 2;
    var box = $('#qpanel');
    box.innerHTML = '<div class="tag">' + (P.practice ? T('Practice · ', 'Práctica · ') + G.prac.right + T(' of ', ' de ') + G.prac.total + T(' right', ' bien')
        : T('Panel ', 'Panel ') + (P.i + 1) + T(' of 3', ' de 3') + ' · ' + pn.icon + ' ' + pn.name) + '</div>' +
      '<h2>' + RELS[q.rel].name + '</h2><p class="rule">' + RELS[q.rel].rule + '</p>' +
      '<p class="ask">' + q.ask + '</p>' +
      '<div class="row"><label class="sr-only" for="ans">' + T('x in degrees', 'x en grados') + '</label><span style="font-size:28px;font-weight:900">x =</span><input id="ans" inputmode="numeric" autocomplete="off" maxlength="5"><span class="deg">°</span>' +
      '<button class="fire" id="b-fire">' + T('FIRE', 'DISPARAR') + '</button></div><div class="err" id="err" role="alert"></div>' +
      '<div class="fb" id="fb" aria-live="polite"></div>' +
      (P.practice ? '' : '<div class="panels">' + PANELS.map(function (p, i) {
        return '<span class="' + (i < P.i ? (P.hits[i] ? 'hit' : 'miss') : i === P.i ? 'now' : '') + '">' + p.icon + ' ' + p.short + (i < P.i ? (P.hits[i] ? ' &#10003;' : ' &#10007;') : '') + '<small>' + p.tip + '</small></span>';
      }).join('') + '</div>');
    box.hidden = false;
    var inp = $('#ans');
    inp.addEventListener('input', function () { inp.value = inp.value.replace(/[^0-9.]/g, ''); $('#err').textContent = ''; Sound.play('type'); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); fire(); } });
    $('#b-fire').addEventListener('click', fire);
    setTimeout(function () { inp.focus(); }, 30);
    say((P.practice ? '' : T('Panel ', 'Panel ') + (P.i + 1) + ', ' + pn.name + '. ') + q.sr);
  }
  function fire() {
    var P = G.puzzle; if (!P || P.phase !== 'ask') return;
    var inp = $('#ans'), v = parseFloat(inp.value);
    if (inp.value === '' || isNaN(v)) { $('#err').textContent = T('Type an angle first.', 'Escribe primero un ángulo.'); inp.focus(); return; }
    if (v < 0 || v > 180) { $('#err').textContent = T('This turret turns from 0° to 180°.', 'Esta torreta gira de 0° a 180°.'); inp.focus(); return; }
    var q = P.qs[P.i];
    P.typed = v; P.phase = 'turn'; P.anim = 0; P.from = wa(q, q.scene.turret.rest); P.to = P.from + q.sense * (v + (q.offset || 0));   // a boss angle is x + d: the turret turns the whole angle
    P.hit = Math.abs(v - q.answer) < 0.5;
    inp.disabled = true; $('#b-fire').disabled = true;
    Sound.play('servo');
  }
  function puzzleResult() {
    var P = G.puzzle, q = P.qs[P.i], pn = PANELS[P.i];
    P.hits[P.i] = P.hit;
    if (P.practice) { G.prac.total++; if (P.hit) G.prac.right++; }
    var fb = $('#fb');
    if (P.hit) {
      G.streak++; save.bestStreak = Math.max(save.bestStreak, G.streak); store();
      var bonus = '';
      addScore(100);
      if (!P.practice && G.streak % 5 === 0) { G.decoy++; bonus = T(' Streak of ' + G.streak + ': you earned a decoy!', ' ¡Racha de ' + G.streak + ': ganaste un señuelo!'); }
      else if (!P.practice && G.streak % 3 === 0) { G.smoke++; bonus = T(' Streak of ' + G.streak + ': you earned a smoke bomb!', ' ¡Racha de ' + G.streak + ': ganaste una bomba de humo!'); }
      fb.className = 'fb good';
      fb.innerHTML = '&#10003; ' + T('Direct hit! ', '¡Impacto directo! ') + (P.practice ? T('That’s right: x = ', 'Correcto: x = ') + q.answer + '°.' : pn.effect + (G.mode === 'challenge' ? ' +100' : '') + bonus);
    } else {
      G.streak = 0; P.firstTry = false;
      var note = mistakeNote(q, P.typed);
      fb.className = 'fb bad';
      fb.innerHTML = '&#10007; ' + T('Missed! ', '¡Fallaste! ') + (note ? note + ' ' : '') + (P.practice ? '' : T(pn.name + ' stay on.', pn.name + ' siguen encendidas.'));
      // how to do it: for angles that add up, the whole angle as a bar split into its two parts; for equal angles, two
      // matching bars. Then the steps, one at a time.
      var R = RELS[q.rel], work = document.createElement('div');
      work.className = 'work';
      work.innerHTML = '<div class="wt">' + T('How to solve it', 'Cómo resolverlo') + '</div>' +
        (R.sum ? '<div class="brace">' + R.sum + '°</div>' +
          '<div class="wbar" aria-hidden="true"><span class="wk" style="flex:' + q.known + '">' + q.knownLabel + '</span><span class="wx" style="flex:' + q.trueAngle + '">' + q.xLabel + '</span></div>'
          : '<div class="weq" aria-hidden="true"><div class="wbar"><span class="wk" style="flex:1">' + q.knownLabel + '</span></div><b>=</b><div class="wbar"><span class="wx" style="flex:1">' + q.xLabel + '</span></div></div>') +
        '<ol>' + q.steps.map(function (s, i) { return '<li style="animation-delay:' + (0.3 + i * 0.7) + 's">' + s[0] + ' <span class="eq">' + s[1] + '</span></li>'; }).join('') + '</ol>';
      fb.after(work);
      // make room: the answer box and the rule aren't needed once the shot is fired (the answer is repeated above)
      ['#qpanel .row', '#qpanel .rule', '#err'].forEach(function (s) { var e = $(s); if (e) e.style.display = 'none'; });
      fb.innerHTML = T('You typed <b>x = ', 'Escribiste <b>x = ') + P.typed + '</b>. ' + fb.innerHTML;
      say(fb.textContent + " " + work.querySelector("ol").textContent);
    }
    if (P.hit) say(fb.textContent);   // (a miss is read with its worked steps above)
    var last = P.i === 2;
    var row = document.createElement('div'); row.className = 'btns'; row.style.marginTop = '14px';
    row.innerHTML = '<button class="fire" id="b-next">' + (P.practice ? T('NEXT QUESTION', 'SIGUIENTE') : last ? T('START THE SNEAK', 'EMPEZAR EL ESCAPE') : T('NEXT PANEL', 'SIGUIENTE PANEL')) + ' &#9656;</button>';
    fb.after(row);
    $('#b-next').addEventListener('click', nextPanel);
    setTimeout(function () { var b = $('#b-next'); if (b) b.focus(); }, 30);
  }
  function nextPanel() {
    var P = G.puzzle; if (!P || P.phase !== 'done') return;
    if (P.practice) { Sound.play('click'); return practiceQuestion(); }
    Sound.play('click');
    if (P.i < 2) {
      P.i++; P.phase = 'ask'; P.typed = null; P.hit = false;
      var q = P.qs[P.i]; P.aim = wa(q, q.scene.turret.rest);
      placeDiagram(q);
      renderQ();
    } else startSneak();
  }

  // ------------------------------------------------------------------ the sneak
  var TS = 36, OX = 64, OY = 82, COLS = 32, ROWS = 16;   // the room, centered below the top bar with room for the gadget buttons underneath
  var RING = 1.25 * 36;   // a guard's red ring: step inside it and they notice you at once
  function tileAt(S, c, r) { if (!(r >= 0) || !(c >= 0)) return "#"; if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return '#'; return S.grid[r][c]; }
  function solid(S, ch) { return ch === '#' || ch === 'c' || (ch === 'D' && !S.mapOn); }
  function solidPx(S, x, y) { return solid(S, tileAt(S, Math.floor((x - OX) / TS), Math.floor((y - OY) / TS))); }
  function cpx(c) { return OX + (c + 0.5) * TS; } function rpx(r) { return OY + (r + 0.5) * TS; }

  function startSneak() {
    var P = G.puzzle, rm = ROOMS[G.vault][G.room];
    G.screen = 'sneak'; $('#qpanel').hidden = true; $('#qpanel').innerHTML = '';
    var S = G.sneak = { camOff: P.hits[0], radioOff: P.hits[1], mapOn: P.hits[2], firstTry: P.firstTry, allHit: P.hits.every(Boolean),
      grid: rm.map.map(function (row) { return row.split(''); }), got: 0, gems: [], meter: 0, spotted: false, caught: 0, t: 0, smokeT: 0, smokeAt: null, decoyT: 0, decoyAt: null, intro: 1.6 };
    S.grid.forEach(function (row, r) { row.forEach(function (ch, c) {
      if (ch === 'P') { S.start = [cpx(c), rpx(r)]; row[c] = '.'; }
      if (ch === 'E') { S.exit = [cpx(c), rpx(r)]; row[c] = '.'; }
      if (ch === 'd') { S.gems.push({ x: cpx(c), y: rpx(r), got: false }); row[c] = '.'; }
    }); });
    resetSneak(S);
    staticLayer = null;
    hud(); gadgetsUI();
    var off = [];
    if (S.camOff) off.push(T('cameras off', 'cámaras apagadas'));
    if (S.radioOff) off.push(T('radios jammed', 'radios bloqueadas'));
    if (S.mapOn) off.push(T('shortcut doors open', 'puertas de atajo abiertas'));
    toast(off.length ? off.join(' · ').toUpperCase() : T('ALL SECURITY ACTIVE: STAY SHARP', 'TODA LA SEGURIDAD ACTIVA: CUIDADO'), off.length ? '#7dffb0' : '#ff9ad0');
    say(T('The sneak. ', 'El escape. ') + (off.length ? off.join(', ') + '. ' : T('All security is active. ', 'Toda la seguridad está activa. ')) +
      T('Reach the exit. ', 'Llega a la salida. ') + rm.guards.length + T(' guards.', ' guardias.'));
    cv.setAttribute('aria-label', T('Top-down map of the room: reach the exit without being seen', 'Mapa de la sala visto desde arriba: llega a la salida sin que te vean'));
    cv.focus();
  }
  function resetSneak(S) {
    var rm = ROOMS[G.vault][G.room];
    S.px = S.start[0]; S.py = S.start[1]; S.face = 0; S.meter = 0; S.seenBy = null; S.smokeT = 0; S.decoyT = 0; S.chase = 0;
    // one diamond per run, in one of the room's diamond spots; and a 30-second clock to hurry the agent along
    S.got = 0; S.gems.forEach(function (g) { g.got = false; g.on = false; });
    if (S.gems.length) S.gems[Math.floor(Math.random() * S.gems.length)].on = true;
    S.time = 30; S.tick = 6;
    var spd = (S.radioOff ? 1.05 : 1.75) * TS, range = (S.radioOff ? 3.6 : 5.4) * TS;
    S.guards = rm.guards.map(function (g) {
      var pts = g.path.map(function (p) { return [cpx(p[0]), rpx(p[1])]; });
      return { pts: pts, loop: g.loop, i: 1, dir: 1, x: pts[0][0], y: pts[0][1], face: Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]), wait: 0, spd: spd, range: range, sees: false, state: 'walk', look: 0 };
    });
    S.cams = rm.cams.map(function (c) { return { x: cpx(c.c), y: rpx(c.r), dir: c.dir * D2R, sweep: c.sweep * D2R, ph: Math.random() * TAU, range: 6.5 * TS, sees: false }; });
  }
  function clearLine(S, x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0, d = Math.sqrt(dx * dx + dy * dy), n = Math.ceil(d / 8);
    for (var i = 1; i < n; i++) { var ch = tileAt(S, Math.floor((x0 + dx * i / n - OX) / TS), Math.floor((y0 + dy * i / n - OY) / TS)); if ((ch === "#" || ch === "c" || (ch === "D" && !S.mapOn)) && d * i / n > 24) return false; }   // (a camera sits in its own wall tile)
    return true;
  }
  function angDiff(a, b) { var d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
  function canSee(S, ex, ey, face, half, range) {
    if (S.smokeT > 0 && Math.hypot(S.px - S.smokeAt[0], S.py - S.smokeAt[1]) < 70) return false;
    var dx = S.px - ex, dy = S.py - ey, d = Math.sqrt(dx * dx + dy * dy);
    if (d > range) return false;
    var onShadow = tileAt(S, Math.floor((S.px - OX) / TS), Math.floor((S.py - OY) / TS)) === 's';
    if (onShadow && d > 1.6 * TS) return false;
    if (d > 18 && Math.abs(angDiff(Math.atan2(dy, dx), face)) > half) return false;
    return clearLine(S, ex, ey, S.px, S.py);
  }
  function sneakStep(dt) {
    var S = G.sneak; S.t += dt;
    if (S.intro > 0) { S.intro -= dt; }
    else if (S.time > 0) {
      S.time = Math.max(0, S.time - dt);
      if (S.time < S.tick && S.time > 0) { S.tick = Math.floor(S.time); Sound.play("tick"); }
      if (S.time === 0) { toast(T("HURRY!", "¡APÚRATE!"), "#ffd166"); say(T("Time's up. Hurry to the exit!", "Se acabó el tiempo. ¡Corre a la salida!")); }
    }
    var tm = $("#timer"); if (tm) { var sec = Math.ceil(S.time); tm.textContent = "0:" + (sec < 10 ? "0" : "") + sec; tm.className = "chip timer" + (S.time <= 10 ? " low" : ""); }
    if (S.chase > 0) return chaseStep(S, dt);   // spotted: the chase plays out on its own
    // the agent
    var mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), my = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (mx || my) {
      var l = Math.sqrt(mx * mx + my * my), sp = 3.4 * TS * dt;
      var nx = S.px + mx / l * sp, ny = S.py + my / l * sp, R = 12;
      if (!solidPx(S, nx - R, S.py - R) && !solidPx(S, nx + R, S.py - R) && !solidPx(S, nx - R, S.py + R) && !solidPx(S, nx + R, S.py + R)) S.px = nx;
      if (!solidPx(S, S.px - R, ny - R) && !solidPx(S, S.px + R, ny - R) && !solidPx(S, S.px - R, ny + R) && !solidPx(S, S.px + R, ny + R)) S.py = ny;
      S.face = Math.atan2(my, mx);
      if (!G.calm && Math.random() < dt * 10) parts.push({ x: S.px - mx * 10, y: S.py - my * 10, vx: 0, vy: 0, life: 0.5, max: 0.5, col: 'rgba(120,170,255,', size: 3 });
    }
    if (S.smokeT > 0) S.smokeT -= dt;
    if (S.decoyT > 0) S.decoyT -= dt;
    // guards
    // how fast the alert fills: faster the closer you are to whoever sees you (from 0.6 a second at the edge of
    // their sight to 3.6 a second right beside them); stepping inside a guard's red ring alerts them at once
    var seen = false, rate = 0, bumped = false;
    function feel(x, y, range) { var d = Math.hypot(S.px - x, S.py - y); rate = Math.max(rate, 0.6 + 3 * Math.max(0, 1 - d / range)); }
    S.guards.forEach(function (g) {
      if (Math.hypot(S.px - g.x, S.py - g.y) < RING && clearLine(S, g.x, g.y, S.px, S.py)) bumped = true;
      var looking = canSee(S, g.x, g.y, g.face, 34 * D2R, g.range);
      g.sees = looking;
      if (looking) {
        seen = true; feel(g.x, g.y, g.range);
        g.state = 'alert'; g.face += angDiff(Math.atan2(S.py - g.y, S.px - g.x), g.face) * Math.min(1, dt * 5);
        return;
      }
      if (S.decoyT > 0 && Math.hypot(S.decoyAt[0] - g.x, S.decoyAt[1] - g.y) < 8 * TS) {
        g.state = 'decoy'; g.face += angDiff(Math.atan2(S.decoyAt[1] - g.y, S.decoyAt[0] - g.x), g.face) * Math.min(1, dt * 4); return;
      }
      if (g.state === 'alert') { g.state = 'wait'; g.wait = 1.2; }
      if (g.wait > 0) { g.wait -= dt; g.face += Math.sin(S.t * 2.2) * dt * 1.2; if (g.wait <= 0) g.state = 'walk'; return; }
      g.state = 'walk';
      var tx = g.pts[g.i][0], ty = g.pts[g.i][1], dx = tx - g.x, dy = ty - g.y, d = Math.sqrt(dx * dx + dy * dy), want = Math.atan2(dy, dx);
      g.face += angDiff(want, g.face) * Math.min(1, dt * 6);
      if (Math.abs(angDiff(want, g.face)) > 0.6) return;   // turn before walking on
      var step = g.spd * dt;
      if (d <= step) {
        g.x = tx; g.y = ty; g.wait = 0.7;
        if (g.loop) g.i = (g.i + 1) % g.pts.length;
        else { if (g.i + g.dir < 0 || g.i + g.dir >= g.pts.length) g.dir *= -1; g.i += g.dir; }
      } else { g.x += dx / d * step; g.y += dy / d * step; }
    });
    // cameras
    S.cams.forEach(function (c) {
      c.ang = c.dir + Math.sin(S.t * 0.9 + c.ph) * c.sweep;
      c.sees = !S.camOff && canSee(S, c.x, c.y, c.ang, 24 * D2R, c.range);
      if (c.sees) { seen = true; feel(c.x, c.y, c.range); }
    });
    // the alert meter: fills while anyone sees you (faster up close), drains while hidden
    var before = S.meter;
    if (bumped) { S.meter = 1; S.spotted = true; }
    else if (seen) { S.meter += dt * rate; S.spotted = true; }
    else S.meter = Math.max(0, S.meter - dt * 0.38);                  // drains while hidden
    if (seen && before === 0) { Sound.play('seen'); say(T('You’ve been seen! Hide!', '¡Te vieron! ¡Escóndete!')); }
    if (S.meter >= 1) { S.meter = 1; S.chase = 0.5; S.chaseClose = bumped; Sound.play("alarm"); toast(T("SPOTTED!", "¡TE VIERON!"), "#ff4fa3"); say(T("Spotted! The guards are coming!", "¡Te vieron! ¡Vienen los guardias!")); return; }
    var m = $('#meter'); if (m) m.style.width = Math.round(S.meter * 100) + '%';
    // diamonds
    S.gems.forEach(function (g) {
      if (g.on && !g.got && Math.hypot(g.x - S.px, g.y - S.py) < 24) {
        g.got = true; S.got++; Sound.play('gem'); burst(g.x, g.y, '#b8f3ff', 14);
        var e = $('#gems'); if (e) e.textContent = save.diamonds + S.got;
        say(T('Diamond! ', '¡Diamante! ') + S.got);
      }
    });
    // the exit
    if (Math.hypot(S.exit[0] - S.px, S.exit[1] - S.py) < 22) roomDone();
  }
  // The alarm: for half a second every guard sprints at the agent, and every camera with a clear view swings round to
  // follow them. The agent can still run. Then they're caught.
  function chaseStep(S, dt) {
    S.chase -= dt;
    // the agent bolts on their own, straight away from the nearest guard (sliding along walls)
    var near = null, nd = 1e9;
    S.guards.forEach(function (g) { var d = Math.hypot(S.px - g.x, S.py - g.y); if (d < nd) { nd = d; near = g; } });
    if (near) {
      var ax = S.px - near.x, ay = S.py - near.y, al = Math.hypot(ax, ay) || 1, sp = 5 * TS * dt, R = 12;
      var nx = S.px + ax / al * sp, ny = S.py + ay / al * sp;
      if (!solidPx(S, nx - R, S.py - R) && !solidPx(S, nx + R, S.py - R) && !solidPx(S, nx - R, S.py + R) && !solidPx(S, nx + R, S.py + R)) S.px = nx;
      if (!solidPx(S, S.px - R, ny - R) && !solidPx(S, S.px + R, ny - R) && !solidPx(S, S.px - R, ny + R) && !solidPx(S, S.px + R, ny + R)) S.py = ny;
      S.face = Math.atan2(ay, ax);
      if (!G.calm) parts.push({ x: S.px, y: S.py, vx: 0, vy: 0, life: 0.35, max: 0.35, col: 'rgba(255,120,180,', size: 4 });
    }
    S.guards.forEach(function (g) {
      var dx = S.px - g.x, dy = S.py - g.y, d = Math.sqrt(dx * dx + dy * dy), want = Math.atan2(dy, dx);
      g.state = 'alert'; g.sees = true;
      g.face += angDiff(want, g.face) * Math.min(1, dt * 12);
      if (d > 14) {
        var step = Math.min(d - 14, 7 * TS * dt), nx = g.x + dx / d * step, ny = g.y + dy / d * step;
        if (!solidPx(S, nx, g.y)) g.x = nx;   // they run around walls, not through them
        if (!solidPx(S, g.x, ny)) g.y = ny;
      }
    });
    S.cams.forEach(function (c) {
      if (S.camOff || Math.hypot(S.px - c.x, S.py - c.y) > 9 * TS || !clearLine(S, c.x, c.y, S.px, S.py)) return;
      c.ang += angDiff(Math.atan2(S.py - c.y, S.px - c.x), c.ang) * Math.min(1, dt * 14); c.sees = true;
    });
    if (S.chase <= 0) { S.chase = 0; caught(S.chaseClose); }
  }
  function caught(tooClose) {
    var S = G.sneak; S.caught++;
    if (G.mode === 'challenge') {
      G.ch.lives--;
      if (G.ch.lives <= 0) { Sound.play('caught'); return challengeOver(); }
    }
    Sound.play("caught");
    shake = G.calm ? 0 : 0.5;
    toast(tooClose ? T("TOO CLOSE! STAY OUT OF THE RED RING", "¡MUY CERCA! NO ENTRES AL ANILLO ROJO") : T("CAUGHT! TRY THE SNEAK AGAIN", "¡TE ATRAPARON! INTENTA DE NUEVO"), "#ff4fa3");
    say(T('Caught! The sneak starts over. Your security panels stay off.', '¡Te atraparon! El escape empieza de nuevo. Tus paneles siguen apagados.'));
    resetSneak(S); S.intro = 1.2;
    if (G.mode === 'challenge') { hud(); toast(T('CAUGHT! ', '¡ATRAPADO! ') + G.ch.lives + (G.ch.lives === 1 ? T(' LIFE LEFT', ' VIDA') : T(' LIVES LEFT', ' VIDAS')), '#ff4fa3'); }
    var e = $('#gems'); if (e) e.textContent = save.diamonds;
  }
  function useSmoke() {
    var S = G.sneak; if (G.screen !== 'sneak' || !G.smoke || !S) return;
    G.smoke--; S.smokeT = 5; S.smokeAt = [S.px, S.py]; Sound.play('smoke'); gadgetsUI();
    say(T('Smoke bomb! You’re hidden inside the cloud for 5 seconds.', '¡Bomba de humo! Estás oculto en la nube por 5 segundos.'));
  }
  function useDecoy() {
    var S = G.sneak; if (G.screen !== 'sneak' || !G.decoy || !S) return;
    G.decoy--; S.decoyT = 5; S.decoyAt = [S.px, S.py]; Sound.play('decoy'); gadgetsUI();
    say(T('Decoy dropped. Nearby guards look at it for 5 seconds. Move away!', 'Señuelo listo. Los guardias cercanos lo miran por 5 segundos. ¡Aléjate!'));
  }
  function roomDone() {
    if (G.mode === 'challenge') return challengeRoomDone();
    var S = G.sneak, key = G.vault + '-' + G.room, rm = ROOMS[G.vault][G.room];
    G.screen = 'result'; $('#gadgets').hidden = true;
    var earned = [true, S.allHit, !S.spotted], n = earned.filter(Boolean).length, prev = save.stars[key] || 0;
    save.stars[key] = Math.max(prev, n); save.diamonds += S.got; store();
    Sound.play('exit');
    var last = G.room === ROOMS[G.vault].length - 1;
    var lines = [T('Reached the exit', 'Llegaste a la salida'), T('Hit all 3 security panels', 'Acertaste los 3 paneles'), T('Never spotted', 'Nunca te vieron')];
    showOv(ovMain, '<div class="card"><div class="tag">' + (rm.boss ? T('Boss room cleared', 'Sala del jefe superada') : T('Room cleared', 'Sala superada')) + '</div><h2>' + rm.name + '</h2>' +
      '<div class="stars" aria-hidden="true">' + earned.map(function (e, i) { return '<i class="' + (e ? 'on' : '') + '" style="animation-delay:' + (0.2 + i * 0.35) + 's">&#9733;</i>'; }).join('') + '</div>' +
      '<ul class="starlist">' + lines.map(function (l, i) { return '<li class="' + (earned[i] ? 'on' : '') + '">' + l + '</li>'; }).join('') + '</ul>' +
      '<p>&#9670; +' + S.got + ' ' + T('diamonds', 'diamantes') + (S.caught ? ' · ' + T('caught ', 'atrapado ') + S.caught + '×' : '') + '</p>' +
      '<div class="btns">' + (last ? '<button class="bt primary" id="b-next">' + T('FLOOR CLEARED!', '¡PISO SUPERADO!') + '</button>' : '<button class="bt primary" id="b-next">' + T('NEXT ROOM', 'SIGUIENTE SALA') + ' &#9656;</button>') +
      '<button class="bt" id="b-again">' + T('REPLAY', 'REPETIR') + '</button><button class="bt" id="b-map">' + T('FLOOR MAP', 'MAPA') + '</button></div></div>');
    earned.forEach(function (e, i) { if (e) setTimeout(function () { Sound.play('star', i); }, 250 + i * 350); });
    say(T('Room cleared. ', 'Sala superada. ') + n + T(' of 3 stars. ', ' de 3 estrellas. ') + S.got + T(' diamonds.', ' diamantes.'));
    on('b-next', function () { if (last) floorDone(); else startRoom(G.room + 1); });
    on('b-again', function () { startRoom(G.room); });
    on('b-map', showMap);
    hud();
  }
  function floorDone() {
    Sound.play('win');
    var v = G.vault, vt = VAULTS[v - 1];
    if (v < VAULTS.length) {
      var up = VAULTS[v], left = VAULTS.length - v;
      showOv(ovMain, '<div class="card"><div class="tag">' + T('Floor ', 'Piso ') + v + T(' cleared', ' superado') + '</div><h2>' + vt.name + T(' is yours', ': ¡superado!') + '</h2>' +
        '<p>' + T('The stairs are open. Next up, Floor ' + (v + 1) + ': <b>' + up.name + '</b> (' + up.topic.toLowerCase() + '). The Prism is ' + left + (left === 1 ? ' floor' : ' floors') + ' up.',
          'Las escaleras están abiertas. Sigue el piso ' + (v + 1) + ': <b>' + up.name + '</b> (' + up.topic.toLowerCase() + '). El Prisma está ' + left + (left === 1 ? ' piso' : ' pisos') + ' más arriba.') + '</p>' +
        '<p>' + T('Go back for any stars you missed, or spend your diamonds in the shop.', 'Vuelve por las estrellas que te faltan o gasta tus diamantes en la tienda.') + '</p>' +
        '<div class="btns"><button class="bt primary" id="b-up">' + T('TO FLOOR ', 'AL PISO ') + (v + 1) + ' &#9650;</button><button class="bt" id="b-map">' + T('TOWER', 'TORRE') + '</button><button class="bt" id="b-shop">' + T('SHOP', 'TIENDA') + '</button></div></div>');
      on('b-up', function () { G.vault = v + 1; showMap(); });
    } else {
      // the top of the tower: the Prism is back
      var total = 0, max = 0;
      VAULTS.forEach(function (f) { total += vaultStars(f.id); max += (ROOMS[f.id] || []).length * 3; });
      showOv(ovMain, '<div class="card win-card"><div class="prism-big" aria-hidden="true"></div><div class="tag">' + T('Mission complete', 'Misión cumplida') + '</div>' +
        '<h2>' + T('You got the Prism back!', '¡Recuperaste el Prisma!') + '</h2>' +
        '<p>' + T('Viktor Vex never saw you coming. You cracked every floor of his tower with complementary, supplementary, vertical, corresponding, alternate and co-interior angles, and the Prism of Euclid is safe.',
          'Viktor Vex nunca te vio venir. Superaste cada piso de su torre con ángulos complementarios, suplementarios, opuestos por el vértice, correspondientes, alternos y colaterales, y el Prisma de Euclides está a salvo.') + '</p>' +
        '<p style="font-size:24px;color:#ffd166">&#9733; ' + total + ' / ' + max + T(' stars', ' estrellas') + '</p>' +
        '<p>' + T('Go back for every star, or show off a new suit from the shop.', 'Vuelve por todas las estrellas o luce un traje nuevo de la tienda.') + '</p>' +
        '<div class="btns"><button class="bt primary" id="b-map">' + T('TOWER', 'TORRE') + '</button><button class="bt" id="b-shop">' + T('SHOP', 'TIENDA') + '</button></div></div>');
      if (!G.calm) for (var i = 0; i < 6; i++) setTimeout(function () { burst(200 + Math.random() * 880, 120 + Math.random() * 300, pick(['#ffd166', '#4fe3ff', '#ff4fa3', '#7dffb0']), 30); }, i * 250);
    }
    say($('#ov-main .card').textContent);
    on('b-map', showMap); on('b-shop', function () { showShop(showMap); });
  }


  // ------------------------------------------------------------------ Practice: just the laser puzzles, any mix of angle types, no sneak, no timer
  var REL_ORDER = ['comp', 'supp', 'vert', 'corr', 'alt', 'coint'];
  function showPracticeSetup() {
    var chosen = (save.practiceRels || ['comp', 'supp']).slice();
    function draw() {
      showOv(ovMain, '<div class="card" style="width:820px"><div class="tag">' + T('Practice', 'Práctica') + '</div><h2>' + T('Choose the angles to practice', 'Elige los ángulos para practicar') + '</h2>' +
        '<p>' + T('Just the laser puzzles: no guards, no timer. A wrong answer shows how to solve it.', 'Solo los rompecabezas láser: sin guardias ni reloj. Si fallas, verás cómo resolverlo.') + '</p>' +
        '<div class="picks" role="group" aria-label="' + T('Angle types', 'Tipos de ángulos') + '">' + REL_ORDER.map(function (r) {
          var on = chosen.indexOf(r) >= 0;
          return '<button class="pick' + (on ? ' on' : '') + '" data-r="' + r + '" aria-pressed="' + on + '"><b>' + RELS[r].name + '</b><span>' + RELS[r].rule + '</span></button>';
        }).join('') + '</div>' +
        '<p id="pick-msg" style="min-height:1.4em;color:#ffd166;margin:10px 0 0" aria-live="polite"></p>' +
        '<div class="btns"><button class="bt primary" id="b-go">' + T('START PRACTICE', 'EMPEZAR') + '</button><button class="bt" id="b-all">' + T('PICK ALL', 'TODOS') + '</button><button class="bt" id="b-back">' + T('BACK', 'VOLVER') + '</button></div></div>', '#b-go');
      [].forEach.call(ovMain.querySelectorAll('.pick'), function (b) {
        b.addEventListener('click', function () {
          Sound.play('click'); var r = b.getAttribute('data-r'), i = chosen.indexOf(r);
          if (i >= 0) chosen.splice(i, 1); else chosen.push(r);
          b.classList.toggle('on', i < 0); b.setAttribute('aria-pressed', String(i < 0));
          $('#pick-msg').textContent = '';
        });
      });
      on('b-all', function () { chosen = REL_ORDER.slice(); draw(); });
      on('b-back', showTitle);
      on('b-go', function () {
        if (!chosen.length) { $('#pick-msg').textContent = T('Pick at least one angle type.', 'Elige al menos un tipo de ángulo.'); return; }
        save.practiceRels = chosen.slice(); store();
        G.mode = 'practice'; G.prac = { rels: chosen.slice(), right: 0, total: 0 };
        practiceQuestion();
      });
    }
    draw();
  }
  function practiceQuestion() {
    G.screen = 'puzzle'; G.paused = false; hideOv(); $('#gadgets').hidden = true;
    var q = makeQuestion(pick(G.prac.rels), Math.random() < 0.25);   // now and then, the "x + 3" kind from the boss rooms
    G.puzzle = { i: 0, practice: true, hits: [false], firstTry: true, qs: [q], phase: 'ask', anim: 0, typed: null, aim: wa(q, q.scene.turret.rest) };
    placeDiagram(q);
    hud(); renderQ();
    cv.setAttribute('aria-label', T('A laser turret on a hologram of the angle diagram', 'Una torreta láser sobre un holograma del diagrama de ángulos'));
  }

  // ------------------------------------------------------------------ Challenge: random rooms from the whole tower, 3 lives, the best score is saved
  function startChallenge() {
    G.mode = 'challenge'; G.ch = { score: 0, lives: 3, rooms: 0, last: '' };
    G.streak = 0; G.smoke = 0; G.decoy = 0;
    challengeRoom();
  }
  function challengeRoom() {
    var v, r;
    do { v = rnd(1, VAULTS.length); r = rnd(0, ROOMS[v].length - 1); } while (v + '-' + r === G.ch.last);
    G.ch.last = v + '-' + r; G.vault = v;
    startRoom(r);
  }
  function addScore(n) { if (G.mode === 'challenge') { G.ch.score += n; var e = $('#score'); if (e) e.textContent = G.ch.score; } }
  function challengeRoomDone() {
    var S = G.sneak, bonus = 200 + (S.spotted ? 0 : 100) + S.got * 50;
    G.screen = 'result'; $('#gadgets').hidden = true;
    addScore(bonus); G.ch.rooms++;
    save.diamonds += S.got; store();
    Sound.play('exit');
    showOv(ovMain, '<div class="card"><div class="tag">' + T('Challenge · room ', 'Desafío · sala ') + G.ch.rooms + T(' cleared', ' superada') + '</div><h2>+' + bonus + '</h2>' +
      '<ul class="starlist">' +
      '<li class="on">' + T('Reached the exit: +200', 'Llegaste a la salida: +200') + '</li>' +
      '<li class="' + (S.spotted ? '' : 'on') + '">' + T('Never spotted: +100', 'Nunca te vieron: +100') + '</li>' +
      '<li class="' + (S.got ? 'on' : '') + '">' + T('Diamond: +50', 'Diamante: +50') + '</li></ul>' +
      '<p style="font-size:26px">' + T('Score ', 'Puntos ') + '<b>' + G.ch.score + '</b> &nbsp; ' + hearts() + '</p>' +
      '<div class="btns"><button class="bt primary" id="b-next">' + T('NEXT ROOM', 'SIGUIENTE SALA') + ' &#9656;</button><button class="bt" id="b-end">' + T('END RUN', 'TERMINAR') + '</button></div></div>');
    say(T('Room cleared. Plus ', 'Sala superada. Más ') + bonus + T('. Score ', '. Puntos ') + G.ch.score + '.');
    on('b-next', challengeRoom); on('b-end', challengeOver);
    hud();
  }
  function hearts() { var s = ''; for (var i = 0; i < 3; i++) s += '<span style="color:' + (i < G.ch.lives ? '#ff4fa3' : '#2a3a5e') + '">&#9829;</span>'; return s; }
  function challengeOver() {
    G.screen = 'result'; G.paused = false; $('#gadgets').hidden = true; $('#qpanel').hidden = true;
    var best = save.highScore || 0, isBest = G.ch.score > best;
    if (isBest) save.highScore = G.ch.score;
    store();
    Sound.play(isBest ? 'win' : 'caught');
    showOv(ovMain, '<div class="card"><div class="tag">' + T('Challenge over', 'Fin del desafío') + '</div><h2>' + (isBest ? T('New best score!', '¡Nuevo récord!') : T('Run complete', 'Fin de la partida')) + '</h2>' +
      '<p style="font-size:48px;font-weight:900;color:#ffd166;margin:4px 0">' + G.ch.score + '</p>' +
      '<p>' + G.ch.rooms + (G.ch.rooms === 1 ? T(' room cleared', ' sala superada') : T(' rooms cleared', ' salas superadas')) + ' · ' + T('best ', 'récord ') + Math.max(best, G.ch.score) + '</p>' +
      '<div class="btns"><button class="bt primary" id="b-again">' + T('PLAY AGAIN', 'JUGAR OTRA VEZ') + '</button><button class="bt" id="b-home">' + T('TITLE', 'INICIO') + '</button></div></div>');
    say(T('Challenge over. Score ', 'Fin del desafío. Puntos ') + G.ch.score + '.');
    on('b-again', startChallenge); on('b-home', showTitle);
  }

  // ------------------------------------------------------------------ pause menu
  function openPause() {
    if (G.screen !== 'puzzle' && G.screen !== 'sneak') return;
    G.paused = true;
    showOv(ovMain, '<div class="card" style="width:520px"><div class="tag">' + T('Paused', 'Pausa') + '</div><h2>' + T('Mission on hold', 'Misión en pausa') + '</h2><div class="btns" style="flex-direction:column">' +
      '<button class="bt primary" id="p-resume">' + T('RESUME', 'CONTINUAR') + '</button>' +
      '<button class="bt" id="p-restart">' + (G.mode === 'practice' ? T('CHANGE ANGLES', 'CAMBIAR ÁNGULOS') : G.mode === 'challenge' ? T('END RUN', 'TERMINAR') : T('RESTART ROOM', 'REINICIAR SALA')) + '</button>' +
      '<button class="bt" id="p-how">' + T('HOW TO PLAY', 'CÓMO JUGAR') + '</button>' +
      '<button class="bt" id="p-sound" aria-pressed="' + save.sound + '">' + (save.sound ? T('SOUND: ON', 'SONIDO: SÍ') : T('SOUND: OFF', 'SONIDO: NO')) + '</button>' +
      '<button class="bt" id="p-map">' + T('MENU', 'MENÚ') + '</button></div><p style="margin-top:14px;font-size:17px">' + T('Press Esc to resume.', 'Pulsa Esc para continuar.') + '</p></div>', '#p-resume');
    on('p-resume', closePause);
    on('p-restart', function () { G.paused = false; if (G.mode === 'practice') showPracticeSetup(); else if (G.mode === 'challenge') challengeOver(); else startRoom(G.room); });
    on('p-how', function () { showHow(openPauseAgain); });
    on('p-sound', function () { save.sound = !save.sound; store(); openPauseAgain(); setTimeout(function () { $('#p-sound').focus(); }, 40); });
    on('p-map', function () { G.paused = false; if (G.mode === 'story') showMap(); else showTitle(); });
  }
  function openPauseAgain() { G.paused = false; openPause(); }
  function closePause() {
    G.paused = false; ovMain.hidden = true;
    if (G.screen === 'puzzle') { var i = $('#ans'); if (i && !i.disabled) i.focus(); else { var b = $('#b-next'); if (b) b.focus(); } }
    else cv.focus();
  }

  // ------------------------------------------------------------------ keyboard
  var KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  document.addEventListener('keydown', function (e) {
    if (window.isPageControlKey && isPageControlKey(e)) return;
    if (e.key === 'Escape') {
      if (G.paused) { e.preventDefault(); closePause(); return; }
      if (G.screen === 'puzzle' || G.screen === 'sneak') { e.preventDefault(); openPause(); }
      return;
    }
    if (G.paused || G.screen !== 'sneak') return;
    var k = KEYMAP[e.code];
    if (k) { keys[k] = true; e.preventDefault(); }
    if (e.key === '1' || e.code === 'Space') { e.preventDefault(); useSmoke(); }
    if (e.key === '2') { e.preventDefault(); useDecoy(); }
  });
  document.addEventListener('keyup', function (e) { var k = KEYMAP[e.code]; if (k) keys[k] = false; });
  window.addEventListener('blur', function () { keys.up = keys.down = keys.left = keys.right = false; });

  // ------------------------------------------------------------------ drawing
  var staticLayer = null, gridLayer = null, shake = 0;
  function layer() { var c = document.createElement('canvas'); c.width = Math.round(W * Q); c.height = Math.round(H * Q); var x = c.getContext('2d'); x.setTransform(Q, 0, 0, Q, 0, 0); return { c: c, x: x }; }
  function backdrop() {
    if (!gridLayer) {
      var L = layer(), x = L.x;
      var g = x.createRadialGradient(W / 2, H * 0.45, 80, W / 2, H / 2, W * 0.75);
      g.addColorStop(0, '#0d1d3d'); g.addColorStop(1, '#040915');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.lineWidth = 1;
      for (var i = 0; i <= W; i += 32) { x.strokeStyle = i % 128 ? 'rgba(79,227,255,0.05)' : 'rgba(79,227,255,0.11)'; x.beginPath(); x.moveTo(i + 0.5, 0); x.lineTo(i + 0.5, H); x.stroke(); }
      for (var j = 0; j <= H; j += 32) { x.strokeStyle = j % 128 ? 'rgba(79,227,255,0.05)' : 'rgba(79,227,255,0.11)'; x.beginPath(); x.moveTo(0, j + 0.5); x.lineTo(W, j + 0.5); x.stroke(); }
      gridLayer = L;
    }
    ctx.drawImage(gridLayer.c, 0, 0, W, H);
  }
  // ---- the hologram: each question's picture, turned and maybe mirrored, and fitted into the space left of the
  // question box (x 30-800, y 80-705)
  var DX = 400, DY = 400, DZ = 1;
  function wa(q, a) { return q.base + q.sense * a; }                                   // an angle, on screen (math degrees)
  function wp(q, p) {                                                                  // a point, on screen
    var x = p[0] * DZ, y = q.sense * p[1] * DZ, b = q.base * D2R;
    return [DX + x * Math.cos(b) - y * Math.sin(b), DY - (x * Math.sin(b) + y * Math.cos(b))];
  }
  function wpol(q, v, a, r) { var c = wp(q, v); return [c[0] + Math.cos(wa(q, a) * D2R) * r * DZ, c[1] - Math.sin(wa(q, a) * D2R) * r * DZ]; }
  function placeDiagram(q) {
    var sc = q.scene, pts = [];
    DX = 0; DY = 0; DZ = 1;
    sc.segs.forEach(function (s) { pts.push(wp(q, s[0]), wp(q, s[1])); });
    sc.arcs.forEach(function (a) { pts.push(wpol(q, a.v, a.a0 + a.sw / 2, a.lr + 22)); });
    var pc = wpol(q, sc.panel.v, sc.panel.dir, sc.panel.r); pts.push([pc[0] - 42, pc[1] - 34], [pc[0] + 42, pc[1] + 34]);
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    DZ = Math.min(1, 750 / (x1 - x0), 610 / (y1 - y0));   // shrink a big picture a little to fit
    DX = Math.round(415 - (x0 + x1) / 2 * DZ); DY = Math.round(392 - (y0 + y1) / 2 * DZ);
  }
  function glowLine(x0, y0, x1, y1, col, w, blur) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.shadowColor = col; ctx.shadowBlur = blur || 0;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore();
  }
  function sArc(q, v, a0, sw, r, col, w) {   // an angle mark from a0, turning sw degrees
    var c = wp(q, v), s0 = -wa(q, a0) * D2R, s1 = -wa(q, a0 + sw) * D2R;
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.beginPath();
    ctx.arc(c[0], c[1], r * DZ, s0, s1, q.sense > 0); ctx.stroke(); ctx.restore();
  }
  function tag(text, p, col, size) {
    ctx.save(); ctx.font = '800 ' + (size || 28) + 'px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var w = ctx.measureText(text).width + 16;
    ctx.fillStyle = 'rgba(5,11,24,0.85)'; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    roundRect(p[0] - w / 2, p[1] - 19, w, 38, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.fillText(text, p[0], p[1] + 1); ctx.restore();
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function parMark(p, ang, col) {   // the little arrowhead that marks a line as parallel
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(-ang * D2R); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(-8, -8); ctx.lineTo(2, 0); ctx.lineTo(-8, 8); ctx.stroke(); ctx.restore();
  }

  function drawPuzzle(t, dt) {
    var Pz = G.puzzle, q = Pz.qs[Pz.i], sc = q.scene, tv = wp(q, sc.turret.v);
    backdrop();
    // the hologram plate under the turret
    ctx.save();
    var hg = ctx.createRadialGradient(tv[0], tv[1], 10, tv[0], tv[1], 330);
    hg.addColorStop(0, 'rgba(79,227,255,0.16)'); hg.addColorStop(1, 'rgba(79,227,255,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(tv[0], tv[1], 330, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(79,227,255,0.18)'; ctx.lineWidth = 1;
    [120, 200, 290].forEach(function (r, i) { ctx.setLineDash([4, 10 + i * 4]); ctx.lineDashOffset = (G.calm ? 0 : t * (i % 2 ? -20 : 14)); ctx.beginPath(); ctx.arc(tv[0], tv[1], r, 0, TAU); ctx.stroke(); });
    ctx.setLineDash([]); ctx.restore();

    var white = 'rgba(220,235,255,0.95)';
    sc.segs.forEach(function (s) { var a = wp(q, s[0]), b = wp(q, s[1]); glowLine(a[0], a[1], b[0], b[1], white, 4, 10); });
    if (sc.par) {   // arrow marks on both parallel lines
      var pm = q.sense > 0 ? q.base : q.base;
      [sc.par[0], sc.par[1]].forEach(function (v) { var m = wpol(q, v, 0, sc.par[2] * 0.62); parMark(m, wa(q, 0), white); });
    }
    if (sc.dash) { var d0 = wp(q, sc.dash[0]), d1 = wp(q, sc.dash[1]); ctx.save(); ctx.setLineDash([10, 8]); glowLine(d0[0], d0[1], d1[0], d1[1], 'rgba(255,209,102,0.9)', 3, 6); ctx.restore(); }
    if (sc.box) {   // the right-angle box
      var c1 = wpol(q, sc.box.v, 0, 42), c3 = wpol(q, sc.box.v, 90, 42), o = wp(q, sc.box.v), c2 = [c1[0] + c3[0] - o[0], c1[1] + c3[1] - o[1]];
      ctx.save(); ctx.strokeStyle = white; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(c1[0], c1[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(c3[0], c3[1]); ctx.stroke(); ctx.restore();
    }
    // the two marked angles: the given one (yellow) and x (blue)
    sc.arcs.forEach(function (a) {
      var col = a.known ? '#ffd166' : '#4fe3ff';
      sArc(q, a.v, a.a0, a.sw, a.r, col, 3);
      tag(a.lab, wpol(q, a.v, a.a0 + a.sw / 2, a.lr), col, a.known ? 26 : 28);
    });
    // the panel, where the right angle ends
    var pp = wpol(q, sc.panel.v, sc.panel.dir, sc.panel.r), pn = Pz.practice ? { short: T('TARGET', 'BLANCO') } : PANELS[Pz.i], down = Pz.hit && (Pz.phase === 'done' || (Pz.phase === 'beam' && Pz.anim > 0.18));   // green the moment the beam reaches it
    ctx.save(); ctx.translate(pp[0], pp[1]);
    ctx.shadowColor = down ? '#7dffb0' : '#ff4fa3'; ctx.shadowBlur = down ? 6 : 18 + (G.calm ? 0 : Math.sin(t * 6) * 6);
    ctx.fillStyle = down ? '#12301f' : '#2a0f2a'; ctx.strokeStyle = down ? '#7dffb0' : '#ff4fa3'; ctx.lineWidth = 3;
    roundRect(-38, -30, 76, 60, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = down ? '#7dffb0' : '#ff9ad0'; ctx.font = '700 ' + (down ? 14 : 18) + 'px Rajdhani, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(down ? 'OFFLINE' : pn.short, 0, -6);
    ctx.fillStyle = down ? '#3a6' : (G.calm || Math.floor(t * 3) % 2 ? '#ff4fa3' : '#5a1838'); ctx.beginPath(); ctx.arc(0, 14, 5, 0, TAU); ctx.fill();
    ctx.restore();

    // the turret: turning, then firing
    if (Pz.phase === 'turn') {
      Pz.anim += dt / 0.55; var k = Math.min(1, Pz.anim), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      Pz.aim = Pz.from + (Pz.to - Pz.from) * e;
      if (k >= 1) { Pz.phase = 'beam'; Pz.anim = 0; Sound.play('fire'); }
    }
    var lc = laserCol(t), dist = Math.hypot(pp[0] - tv[0], pp[1] - tv[1]);
    if (Pz.phase === 'beam' || Pz.phase === 'done') {
      if (Pz.phase === 'beam') Pz.anim += dt;
      var reach = Math.min(1, Pz.anim / 0.18), len = (Pz.hit ? dist - 34 : 560) * reach;
      var end = [tv[0] + Math.cos(Pz.aim * D2R) * len, tv[1] - Math.sin(Pz.aim * D2R) * len];
      var fl = G.calm ? 1 : 0.85 + Math.random() * 0.15;
      glowLine(tv[0], tv[1], end[0], end[1], lc, 12 * fl, 30);
      glowLine(tv[0], tv[1], end[0], end[1], '#ffffff', 3.5, 6);
      if (Pz.phase === 'beam' && Pz.anim > 0.18 && !Pz.boom) {
        Pz.boom = true;
        if (Pz.hit) { burst(end[0], end[1], lc, G.calm ? 10 : 40); Sound.play("hit"); shake = G.calm ? 0 : 0.25; }
        else { burst(end[0], end[1], '#ffd166', 12); Sound.play('miss'); }
      }
      if (Pz.phase === 'beam' && Pz.anim > 1.0) { Pz.phase = 'done'; Pz.boom = false; puzzleResult(); }
      if (Pz.phase === 'done' && !Pz.hit) {   // the right line, so the miss can be compared
        var ga = wa(q, sc.panel.dir), good = [tv[0] + Math.cos(ga * D2R) * (dist - 34), tv[1] - Math.sin(ga * D2R) * (dist - 34)];
        ctx.save(); ctx.setLineDash([6, 8]); glowLine(tv[0], tv[1], good[0], good[1], 'rgba(125,255,176,0.8)', 3, 8); ctx.restore();
        tag(q.offset ? 'x = ' + q.answer : q.answer + '°', [pp[0], pp[1] - 56], '#7dffb0', 22);
        if (sc.sumArc) {   // the whole angle lit up, so the two parts can be seen adding to 90° or 180°
          sArc(q, sc.sumArc.v, sc.sumArc.a0, sc.sumArc.sw, sc.sumArc.r, 'rgba(230,240,255,0.7)', 2.5);
          tag(RELS[q.rel].sum + '°', wpol(q, sc.sumArc.v, sc.sumArc.a0 + sc.sumArc.sw * 0.25, sc.sumArc.lr), '#e6f0ff', 22);
        }
      }
    }
    // turret body
    ctx.save(); ctx.translate(tv[0], tv[1]); ctx.rotate(-Pz.aim * D2R);
    ctx.shadowColor = lc; ctx.shadowBlur = 16;
    ctx.fillStyle = '#16264a'; ctx.strokeStyle = lc; ctx.lineWidth = 3;
    roundRect(-6, -11, 58, 22, 6); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.fillStyle = '#0d1a35'; ctx.strokeStyle = lc; ctx.lineWidth = 3; ctx.shadowColor = lc; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(tv[0], tv[1], 24, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = lc; ctx.beginPath(); ctx.arc(tv[0], tv[1], 7, 0, TAU); ctx.fill(); ctx.restore();
  }

  // the room's walls, floor, crates and shadows: drawn once per room into a layer
  function buildStatic(S) {
    var L = layer(), x = L.x, rm = ROOMS[G.vault][G.room], th = VAULTS[G.vault - 1].theme;
    x.fillStyle = '#050b18'; x.fillRect(0, 0, W, H);
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var ch = S.grid[r][c], X = OX + c * TS, Y = OY + r * TS;
      if (ch !== '#') {
        x.fillStyle = (c + r) % 2 ? th.f1 : th.f2; x.fillRect(X, Y, TS, TS);
        x.strokeStyle = 'rgba(' + th.edge + ',0.07)'; x.lineWidth = 1; x.strokeRect(X + 0.5, Y + 0.5, TS - 1, TS - 1);
      }
    }
    // pools of lamplight
    x.globalCompositeOperation = 'lighter';
    (rm.lamps || []).forEach(function (l) {
      var gx = cpx(l[0]), gy = rpx(l[1]), g = x.createRadialGradient(gx, gy, 4, gx, gy, 150);
      g.addColorStop(0, 'rgba(' + th.lamp + ',0.22)'); g.addColorStop(1, 'rgba(' + th.lamp + ',0)');
      x.fillStyle = g; x.beginPath(); x.arc(gx, gy, 150, 0, TAU); x.fill();
    });
    x.globalCompositeOperation = 'source-over';
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
      ch = S.grid[r][c]; X = OX + c * TS; Y = OY + r * TS;
      if (ch === 's') {
        x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(X, Y, TS, TS);
        x.strokeStyle = 'rgba(160,120,255,0.12)'; x.lineWidth = 2;
        for (var k = -TS; k < TS; k += 10) { x.beginPath(); x.moveTo(X + Math.max(0, k), Y + Math.max(0, -k)); x.lineTo(X + Math.min(TS, k + TS), Y + Math.min(TS, TS - k)); x.stroke(); }
      }
      if (ch === 't') {   // train tracks: two rails and the wooden ties
        x.fillStyle = 'rgba(90,60,40,0.55)'; for (var tk = 4; tk < TS; tk += 10) x.fillRect(X + tk, Y + 8, 5, TS - 16);
        x.fillStyle = 'rgba(200,190,180,0.55)'; x.fillRect(X, Y + 11, TS, 3); x.fillRect(X, Y + TS - 14, TS, 3);
      }
      if (ch === 'c') {   // the floor's obstacle: a crate, a server rack, a lab bench, a shipping container or a statue
        x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(X + 6, Y + 8, TS, TS);
        x.fillStyle = th.c1; x.fillRect(X + 2, Y + 2, TS - 4, TS - 4);
        x.strokeStyle = th.c2; x.lineWidth = 2; x.strokeRect(X + 3, Y + 3, TS - 6, TS - 6);
        if (th.crate === 'rack') {
          for (var ly = Y + 8; ly < Y + TS - 6; ly += 6) { x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(X + 6, ly, TS - 12, 3); x.fillStyle = (c * 7 + ly) % 3 ? '#7dffb0' : '#ffd166'; x.fillRect(X + TS - 10, ly, 3, 3); }
        } else if (th.crate === 'lab') {
          x.fillStyle = 'rgba(181,123,255,0.35)'; x.beginPath(); x.arc(X + TS / 2, Y + TS / 2, 8, 0, TAU); x.fill();
          x.strokeStyle = 'rgba(220,190,255,0.6)'; x.beginPath(); x.arc(X + TS / 2, Y + TS / 2, 8, 0, TAU); x.stroke();
        } else if (th.crate === 'container') {
          x.fillStyle = ['#7a2f22', '#2f5a7a', '#3f6a3a', '#8a6a2a'][(Math.floor(c / 2) + r) % 4]; x.fillRect(X + 3, Y + 3, TS - 6, TS - 6);
          x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 1; for (var cx = X + 7; cx < X + TS - 4; cx += 5) { x.beginPath(); x.moveTo(cx, Y + 4); x.lineTo(cx, Y + TS - 4); x.stroke(); }
        } else if (th.crate === 'statue') {
          x.fillStyle = '#1e1a10'; x.fillRect(X + 2, Y + 2, TS - 4, TS - 4);
          x.fillStyle = '#d9b45c'; x.beginPath(); x.arc(X + TS / 2, Y + TS / 2 - 3, 7, 0, TAU); x.fill(); x.fillRect(X + TS / 2 - 6, Y + TS / 2 + 3, 12, 8);
        } else {
          x.strokeStyle = th.c2; x.globalAlpha = 0.7; x.beginPath(); x.moveTo(X + 5, Y + 5); x.lineTo(X + TS - 5, Y + TS - 5); x.moveTo(X + TS - 5, Y + 5); x.lineTo(X + 5, Y + TS - 5); x.stroke(); x.globalAlpha = 1;
        }
      }
    }
    // walls: a raised top with a lit edge where they meet the floor
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
      ch = S.grid[r][c]; X = OX + c * TS; Y = OY + r * TS;
      if (ch === '#') {
        x.fillStyle = th.w1; x.fillRect(X, Y, TS, TS);
        x.fillStyle = th.w2; x.fillRect(X, Y, TS, TS - 8);
        var open = function (dc, dr) { var n = tileAt(S, c + dc, r + dr); return n !== '#'; };
        x.strokeStyle = 'rgba(' + th.edge + ',0.45)'; x.lineWidth = 2; x.beginPath();
        if (open(0, 1)) { x.moveTo(X, Y + TS - 1); x.lineTo(X + TS, Y + TS - 1); }
        if (open(0, -1)) { x.moveTo(X, Y + 1); x.lineTo(X + TS, Y + 1); }
        if (open(1, 0)) { x.moveTo(X + TS - 1, Y); x.lineTo(X + TS - 1, Y + TS); }
        if (open(-1, 0)) { x.moveTo(X + 1, Y); x.lineTo(X + 1, Y + TS); }
        x.stroke();
      }
      if (ch === 'D') {
        if (S.mapOn) { x.fillStyle = 'rgba(125,255,176,0.12)'; x.fillRect(X, Y, TS, TS); x.strokeStyle = 'rgba(125,255,176,0.6)'; x.setLineDash([4, 4]); x.strokeRect(X + 2, Y + 2, TS - 4, TS - 4); x.setLineDash([]); }
        else { x.fillStyle = '#3a1630'; x.fillRect(X, Y, TS, TS); x.strokeStyle = '#ff4fa3'; x.lineWidth = 2; x.strokeRect(X + 3, Y + 3, TS - 6, TS - 6);
          x.fillStyle = '#ff4fa3'; x.font = '700 14px Rajdhani, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('LOCK', X + TS / 2, Y + TS / 2); }
      }
    }
    staticLayer = L;
  }
  function cone(S, x0, y0, face, half, range) {
    var pts = [[x0, y0]], n = 30;
    for (var i = 0; i <= n; i++) {
      var a = face - half + (2 * half) * i / n, ca = Math.cos(a), sa = Math.sin(a), d = 0;
      while (d < range) { d += 6; var ch = tileAt(S, Math.floor((x0 + ca * d - OX) / TS), Math.floor((y0 + sa * d - OY) / TS)); if ((ch === "#" || ch === "c" || (ch === "D" && !S.mapOn)) && d > 24) break; }
      pts.push([x0 + ca * Math.min(d, range), y0 + sa * Math.min(d, range)]);
    }
    return pts;
  }
  function fillCone(pts, x0, y0, range, rgb, alpha) {
    var g = ctx.createRadialGradient(x0, y0, 6, x0, y0, range);
    g.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fill();
  }
  function drawSneak(t) {
    var S = G.sneak;
    if (!staticLayer) buildStatic(S);
    ctx.drawImage(staticLayer.c, 0, 0, W, H);
    // guard routes, when the blueprints panel was hit
    if (S.mapOn) S.guards.forEach(function (g) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,209,102,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([3, 9]); ctx.beginPath();
      g.pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
      if (g.loop) ctx.closePath(); ctx.stroke(); ctx.restore();
    });
    // the exit
    var ex = S.exit, pulse = G.calm ? 0.6 : 0.5 + Math.sin(t * 4) * 0.3;
    ctx.save(); ctx.shadowColor = '#7dffb0'; ctx.shadowBlur = 24; ctx.strokeStyle = 'rgba(125,255,176,' + (0.5 + pulse * 0.5) + ')'; ctx.lineWidth = 3;
    roundRect(ex[0] - 18, ex[1] - 18, 36, 36, 6); ctx.stroke(); ctx.fillStyle = 'rgba(125,255,176,' + (0.12 + pulse * 0.15) + ')'; ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#7dffb0'; ctx.font = '700 13px Rajdhani, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(T('EXIT', 'SALIDA'), ex[0], ex[1]); ctx.restore();
    // diamonds
    S.gems.forEach(function (g, i) {
      if (g.got || !g.on) return;
      var b = G.calm ? 0 : Math.sin(t * 3 + i) * 3, s = 9 + (G.calm ? 0 : Math.sin(t * 5 + i) * 1.5);
      ctx.save(); ctx.translate(g.x, g.y + b); ctx.shadowColor = '#b8f3ff'; ctx.shadowBlur = 16;
      var dg = ctx.createLinearGradient(-s, -s, s, s); dg.addColorStop(0, '#ffffff'); dg.addColorStop(1, '#4fe3ff');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.moveTo(0, -s * 1.3); ctx.lineTo(s, 0); ctx.lineTo(0, s * 1.3); ctx.lineTo(-s, 0); ctx.closePath(); ctx.fill(); ctx.restore();
    });
    // cameras and their cones
    S.cams.forEach(function (c) {
      if (!S.camOff) { var pts = cone(S, c.x, c.y, c.ang, 24 * D2R, c.range); fillCone(pts, c.x, c.y, c.range, c.sees ? '255,79,163' : '79,227,255', c.sees ? 0.42 : 0.24); }
      ctx.save(); ctx.translate(c.x, c.y);
      ctx.save(); ctx.rotate(S.camOff ? c.dir + 0.5 : c.ang);   // a switched-off camera droops to one side
      ctx.fillStyle = S.camOff ? '#3a4258' : '#2b3d66'; ctx.strokeStyle = S.camOff ? '#8a93a8' : (c.sees ? '#ff4fa3' : '#4fe3ff'); ctx.lineWidth = 2.5;
      roundRect(-11, -10, 30, 20, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = S.camOff ? '#11141c' : '#0b1630'; ctx.beginPath(); ctx.arc(14, 0, 6, 0, TAU); ctx.fill();   // the lens
      if (!S.camOff) { ctx.fillStyle = G.calm || Math.floor(t * 2) % 2 ? '#ff4fa3' : '#7a1e4c'; ctx.beginPath(); ctx.arc(-4, 0, 3, 0, TAU); ctx.fill(); }
      ctx.restore();
      if (S.camOff) {   // a clear OFF tag beside it
        ctx.fillStyle = 'rgba(40,10,20,0.9)'; ctx.strokeStyle = '#ff5d7a'; ctx.lineWidth = 1.5;
        roundRect(-16, -32, 32, 16, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ff9aac'; ctx.font = '700 12px Rajdhani, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(T('OFF', 'NO'), 0, -23.5);
      }
      ctx.restore();
    });
    // guards: flashlight cones first, then bodies
    S.guards.forEach(function (g) {
      var pts = cone(S, g.x, g.y, g.face, 34 * D2R, g.range);
      fillCone(pts, g.x, g.y, g.range, g.sees ? '255,79,163' : '255,214,120', g.sees ? 0.45 : 0.26);
    });
    if (S.decoyT > 0) {
      var r = 10 + ((t * 40) % 30);
      ctx.save(); ctx.strokeStyle = 'rgba(255,209,102,' + (1 - r / 40) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(S.decoyAt[0], S.decoyAt[1], r, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(S.decoyAt[0], S.decoyAt[1], 6, 0, TAU); ctx.fill(); ctx.restore();
    }
    S.guards.forEach(function (g) {
      ctx.save(); ctx.translate(g.x, g.y);
      // the red ring: step inside and this guard notices you at once
      ctx.fillStyle = 'rgba(255,60,90,0.10)'; ctx.strokeStyle = 'rgba(255,70,100,0.75)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, RING, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(3, 5, 16, 13, 0, 0, TAU); ctx.fill();
      ctx.rotate(g.face);
      ctx.fillStyle = '#39465f'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 16, 0, 0, TAU); ctx.fill();   // shoulders
      ctx.fillStyle = '#1d2638'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();                // cap
      ctx.fillStyle = '#11182a'; ctx.fillRect(5, -6, 7, 12);                                          // brim
      ctx.fillStyle = '#ffd166'; ctx.fillRect(10, 9, 8, 4);                                           // flashlight
      ctx.restore();
      if (g.state === 'alert' || g.state === 'wait' || g.state === 'decoy') {
        ctx.save(); ctx.font = '800 22px Nunito, sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = g.state === 'alert' ? (S.meter > 0.55 ? '#ff4fa3' : '#ffd166') : '#ffd166';
        ctx.fillText(g.state === 'alert' && S.meter > 0.55 ? '!' : '?', g.x, g.y - 24); ctx.restore();
      }
    });
    // the agent
    var su = suit();
    ctx.save(); ctx.translate(S.px, S.py);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(3, 5, 14, 11, 0, 0, TAU); ctx.fill();
    // a soft ring under the agent so they're always easy to find
    ctx.strokeStyle = su.trim; ctx.globalAlpha = 0.55 + (G.calm ? 0 : Math.sin(t * 5) * 0.25); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 21, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.rotate(S.face);
    ctx.shadowColor = su.trim; ctx.shadowBlur = 16;
    ctx.fillStyle = su.body; ctx.beginPath(); ctx.ellipse(0, 0, 12, 16, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = su.trim; ctx.lineWidth = 2; ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = '#0b0f18'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = su.trim; ctx.lineWidth = 3.5; ctx.shadowColor = su.trim; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(0, 0, 8, -0.75, 0.75); ctx.stroke();   // goggles
    ctx.restore();
    // smoke
    if (S.smokeT > 0) {
      ctx.save();
      for (var i = 0; i < 9; i++) {
        var a = i / 9 * TAU + t * 0.3, rr = 30 + Math.sin(t * 2 + i) * 8;
        ctx.fillStyle = 'rgba(170,180,200,' + Math.min(0.35, S.smokeT * 0.12) + ')';
        ctx.beginPath(); ctx.arc(S.smokeAt[0] + Math.cos(a) * rr * 0.8, S.smokeAt[1] + Math.sin(a) * rr * 0.8, 34, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    // the alert glow at the screen's edges
    if (S.meter > 0) {
      var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.7);
      vg.addColorStop(0, 'rgba(255,79,163,0)'); vg.addColorStop(1, 'rgba(255,79,163,' + (S.meter * 0.55 * (G.calm ? 0.7 : 0.8 + Math.sin(t * 10) * 0.2)) + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    if (S.intro > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(1, S.intro); ctx.font = '700 72px Rajdhani, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#e6f0ff';
      ctx.shadowColor = '#4fe3ff'; ctx.shadowBlur = 24; ctx.fillText(T('SNEAK!', '¡ESCAPA!'), W / 2, H / 2 + 20); ctx.restore();
    }
  }
  // The title and tower screens: Vex Tower at night over the city. Searchlights sweep the sky, a laser scan runs down
  // the tower, the stolen Prism spins at the top, and (on the title) an agent ziplines across to the tower.
  var cityLayer = null, TOWER_X = 930;
  function seeded(n) { var x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
  function buildCity() {
    var L = layer(), x = L.x;
    var sky = x.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#02040c'); sky.addColorStop(0.55, '#0b1440'); sky.addColorStop(1, '#2a1240');
    x.fillStyle = sky; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 140; i++) { x.fillStyle = 'rgba(220,235,255,' + (0.25 + seeded(i) * 0.6) + ')'; x.fillRect(seeded(i + 7) * W, seeded(i + 13) * H * 0.55, seeded(i + 3) < 0.9 ? 1.5 : 2.5, seeded(i + 3) < 0.9 ? 1.5 : 2.5); }
    var mg = x.createRadialGradient(1150, 105, 10, 1150, 105, 160);   // the moon
    mg.addColorStop(0, 'rgba(230,240,255,0.95)'); mg.addColorStop(0.28, 'rgba(200,220,255,0.85)'); mg.addColorStop(0.3, 'rgba(160,190,255,0.18)'); mg.addColorStop(1, 'rgba(160,190,255,0)');
    x.fillStyle = mg; x.beginPath(); x.arc(1150, 105, 160, 0, TAU); x.fill();
    // two layers of skyline, the near one darker with more lit windows
    [[0.62, '#0c1638', 0.18, 1], [0.74, '#060b1f', 0.35, 2]].forEach(function (ly, li) {
      var bx = -20, n = 0;
      while (bx < W + 20) {
        var bw = 50 + seeded(n + li * 50) * 90, bh = H * (0.18 + seeded(n * 3 + li) * (li ? 0.3 : 0.4));
        var top = H * ly[0] - bh * (li ? 0.5 : 0.9) + (li ? 120 : 0);
        if (Math.abs(bx + bw / 2 - TOWER_X) > 120 || li === 0) {
          x.fillStyle = ly[1]; x.fillRect(bx, top, bw, H - top);
          for (var wy = top + 10; wy < H - 8; wy += 16) for (var wx = bx + 8; wx < bx + bw - 10; wx += 14) {
            var s = seeded(wx * 0.37 + wy * 1.7 + li);
            if (s < ly[2]) { x.fillStyle = s < ly[2] * 0.25 ? 'rgba(79,227,255,0.55)' : 'rgba(255,200,110,' + (0.35 + s) + ')'; x.fillRect(wx, wy, 6, 8); }
          }
          if (seeded(n + 99) < 0.3) { x.fillStyle = '#ff4fa3'; x.fillRect(bx + bw / 2 - 1, top - 14, 2, 14); }   // antennas
        }
        bx += bw + 4; n++;
      }
    });
    cityLayer = L;
  }
  function drawCity(t, mode) {
    if (!cityLayer) buildCity();
    ctx.drawImage(cityLayer.c, 0, 0, W, H);
    var calm = G.calm, tx = TOWER_X;
    // searchlights from the street, sweeping the sky
    [[260, 0.5, '160,200,255'], [640, -0.38, '255,120,190'], [1180, 0.31, '160,200,255']].forEach(function (s, i) {
      var a = -Math.PI / 2 + Math.sin(t * (calm ? 0 : s[1]) + i * 2) * 0.55, len = 900, spread = 0.07;
      var g = ctx.createLinearGradient(s[0], H, s[0] + Math.cos(a) * len, H + Math.sin(a) * len);
      g.addColorStop(0, 'rgba(' + s[2] + ',0.28)'); g.addColorStop(1, 'rgba(' + s[2] + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(s[0], H);
      ctx.lineTo(s[0] + Math.cos(a - spread) * len, H + Math.sin(a - spread) * len); ctx.lineTo(s[0] + Math.cos(a + spread) * len, H + Math.sin(a + spread) * len); ctx.closePath(); ctx.fill();
    });
    if (mode === 'title') {
      // Vex Tower: a tall, tapering spire with neon edges and lit floors
      var top = 120, base = H;
      ctx.save();
      var tg = ctx.createLinearGradient(tx - 110, 0, tx + 110, 0);
      tg.addColorStop(0, '#0a1230'); tg.addColorStop(0.5, '#141f4a'); tg.addColorStop(1, '#070d24');
      ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(tx - 110, base); ctx.lineTo(tx - 62, top + 60); ctx.lineTo(tx, top); ctx.lineTo(tx + 62, top + 60); ctx.lineTo(tx + 110, base); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ff4fa3'; ctx.lineWidth = 2; ctx.shadowColor = '#ff4fa3'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(tx - 110, base); ctx.lineTo(tx - 62, top + 60); ctx.lineTo(tx, top); ctx.lineTo(tx + 62, top + 60); ctx.lineTo(tx + 110, base); ctx.stroke();
      ctx.shadowBlur = 0;
      for (var fy = top + 90; fy < base; fy += 26) {
        var half = 62 + (fy - top - 60) / (base - top - 60) * 48;
        for (var k = -3; k <= 3; k++) {
          var lit = seeded(fy * 0.1 + k * 3.3 + (calm ? 0 : Math.floor(t * 0.5 + k))) ;
          ctx.fillStyle = lit < 0.18 ? 'rgba(255,209,102,0.85)' : lit < 0.3 ? 'rgba(79,227,255,0.5)' : 'rgba(79,227,255,0.08)';
          ctx.fillRect(tx + k * half / 3.6 - 5, fy, 10, 12);
        }
      }
      // a red laser scan running down the tower
      var sy = top + 60 + ((calm ? 0.4 : (t * 0.22) % 1) * (base - top - 60)), sh = 62 + (sy - top - 60) / (base - top - 60) * 48;
      glowLine(tx - sh, sy, tx + sh, sy, '#ff3b6b', 2.5, 16);
      // the Prism, spinning at the top
      var pa = calm ? 0 : t * 1.4, py = top - 34;
      ctx.save(); ctx.translate(tx, py);
      var hue = (t * 60) % 360;
      ctx.shadowColor = 'hsl(' + hue + ',100%,70%)'; ctx.shadowBlur = 36;
      var w = 22 * Math.abs(Math.cos(pa)) + 6;
      var pg = ctx.createLinearGradient(-w, -26, w, 26);
      pg.addColorStop(0, 'hsl(' + hue + ',100%,75%)'); pg.addColorStop(0.5, '#ffffff'); pg.addColorStop(1, 'hsl(' + ((hue + 140) % 360) + ',100%,70%)');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(w, 22); ctx.lineTo(-w, 22); ctx.closePath(); ctx.fill();
      ctx.restore();
      var halo = ctx.createRadialGradient(tx, py, 4, tx, py, 120);
      halo.addColorStop(0, 'rgba(255,255,255,0.25)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(tx, py, 120, 0, TAU); ctx.fill();
      // the agent on a zipline, from a rooftop on the left to the tower
      var z0 = [560, 330], z1 = [tx - 70, 250];
      ctx.strokeStyle = 'rgba(200,220,255,0.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(z0[0], z0[1]); ctx.lineTo(z1[0], z1[1]); ctx.stroke();
      var zk = calm ? 0.55 : (t * 0.12) % 1, ax = z0[0] + (z1[0] - z0[0]) * zk, ay = z0[1] + (z1[1] - z0[1]) * zk;
      ctx.fillStyle = '#05070f'; ctx.strokeStyle = suit().trim; ctx.lineWidth = 1.5; ctx.shadowColor = suit().trim; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(ax, ay + 8, 5, 0, TAU); ctx.fill(); ctx.stroke();                     // head
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay + 6); ctx.stroke();                      // hand on the line
      ctx.fillRect(ax - 4, ay + 13, 8, 14);                                                          // body
      ctx.beginPath(); ctx.moveTo(ax - 2, ay + 27); ctx.lineTo(ax - 7, ay + 38); ctx.moveTo(ax + 2, ay + 27); ctx.lineTo(ax + 6, ay + 37); ctx.stroke();
      ctx.restore();
    }
    // a soft fog over the street, and a darker wash behind the menus
    var fog = ctx.createLinearGradient(0, H * 0.7, 0, H);
    fog.addColorStop(0, 'rgba(60,30,90,0)'); fog.addColorStop(1, 'rgba(60,30,90,0.45)');
    ctx.fillStyle = fog; ctx.fillRect(0, H * 0.7, W, H * 0.3);
    if (mode === 'title') {
      var lw = ctx.createLinearGradient(0, 0, 720, 0);
      lw.addColorStop(0, 'rgba(2,4,12,0.7)'); lw.addColorStop(1, 'rgba(2,4,12,0)');
      ctx.fillStyle = lw; ctx.fillRect(0, 0, 720, H);
    } else { ctx.fillStyle = 'rgba(2,4,12,0.45)'; ctx.fillRect(0, 0, W, H); }
  }
  function burst(x, y, col, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, s = 60 + Math.random() * 260;
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.5, max: 0.9, col: col, size: 2 + Math.random() * 3 });
    }
  }
  function drawParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      if (p.col.indexOf('rgba(') === 0) ctx.fillStyle = p.col + (p.life / p.max * 0.5) + ')'; else ctx.fillStyle = p.col;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ main loop
  var last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    if (!G.paused) G.t += dt;
    var t = G.t;
    ctx.setTransform(Q, 0, 0, Q, 0, 0);
    if (shake > 0 && !G.paused) { shake -= dt; ctx.translate((Math.random() - 0.5) * 12 * shake, (Math.random() - 0.5) * 12 * shake); }
    if (G.screen === 'sneak' && !G.paused) sneakStep(dt);
    if (G.screen === 'puzzle') drawPuzzle(t, G.paused ? 0 : dt);
    else if ((G.screen === 'sneak' || G.screen === 'result') && G.sneak) drawSneak(t);
    else drawCity(t, G.screen === 'title' ? 'title' : 'map');
    drawParts(G.paused ? 0 : dt);
  }

  // ------------------------------------------------------------------ touch controls (phones and tablets)
  window.addEventListener('load', function () {
    if (!window.SiteControls) return;
    SiteControls.create({
      joystick: true, numpad: ['backspace', 'enter'], keys: keys,
      onKey: function (k) {
        var inp = $('#ans');
        if (k === 'enter') { if (G.puzzle && G.puzzle.phase === 'done') nextPanel(); else fire(); return; }
        if (!inp || inp.disabled) return;
        if (k === 'backspace') inp.value = inp.value.slice(0, -1); else if (/^\d$/.test(k) && inp.value.length < 5) inp.value += k;
      },
      show: function () { return { joystick: G.screen === 'sneak' && !G.paused, numpad: G.screen === 'puzzle' && !G.paused }; }
    });
  });

  fit();
  showTitle();
  requestAnimationFrame(frame);

})();
