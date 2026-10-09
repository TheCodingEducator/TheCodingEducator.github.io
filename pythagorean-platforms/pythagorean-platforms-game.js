(() => {
  const TAU = Math.PI * 2;
  const FT = tl(" ft", " pies");   // the unit after every length
  // Every vine hangs from the canopy at the same height (ANCHOR_Y). A problem's triangle is the jungle itself:
  //   leg a (coral) = distance straight across to the next platform, leg b (green) = how far the anchor is above you,
  //   hypotenuse c (blue) = the rope from your hands to the anchor. The next platform sits right under the anchor,
  //   one rope length down - so a short rope keeps you high in the trees and a long one swings you low.
  const VIEW_H = 19, BODY = 1.25, SAND_Y = 33.5, ANCHOR_Y = 11;
  // world units per foot: World 4 uses one fixed scale; the other worlds size each triangle so its whole figure
  // (rope square above, leg square hanging below: 2a + b feet tall) fits on screen as big as possible
  const fitK = p => Math.min(1.6, 17 / (2 * p.a + p.b));
  const WORLD_K = { w0: fitK, w1: fitK, w2: fitK, w3: 1, w4: fitK };
  const GRAV = 85, ROPE_SPEED = 115, THORN_GAP = 0.25;
  const SKIES = {
    w0: ['#b3e6d6', '#f8eebb', '#8cc6a6', '#5aa272'],
    w1: ['#9fdcc9', '#f3e4a6', '#7fb89a', '#4f9467'],
    w2: ['#a6d3e8', '#e2f0dc', '#86b7a8', '#4c8a6c'],
    w3: ['#e7b98a', '#f6dca4', '#b99a7a', '#8a7a55'],
    w4: ['#c3cdf0', '#f4e1ea', '#9aa7c9', '#5f6f9a']
  };
  const cvs = document.getElementById('game');
  const ctx = cvs.getContext('2d');
  const nbCap = document.getElementById('nb-cap');
  const workEl = document.getElementById('work');
  const promptEl = document.getElementById('prompt');
  const choicesEl = document.getElementById('choices');
  const msgEl = document.getElementById('msg');
  const stripEl = document.getElementById('strip');
  const endEl = document.getElementById('end-actions');
  const againBtn = document.getElementById('again-btn');
  const otherBtn = document.getElementById('other-btn');
  const whereEl = document.getElementById('where');
  const helpBtn = document.getElementById('help-btn'), helpEl = document.getElementById('help');
  helpBtn.addEventListener('click', () => { helpEl.hidden = !helpEl.hidden; helpBtn.setAttribute('aria-expanded', String(!helpEl.hidden)); });
  helpEl.addEventListener('pointerdown', e => { e.stopPropagation(); helpEl.hidden = true; helpBtn.setAttribute('aria-expanded', 'false'); });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, S = 20, baseS = 20, DPR = 1, viewH = VIEW_H;
  let zoom = 1;                       // camera zoom: <1 to fit a big triangle, >1 for the slow-motion close-up
  const applyZoom = () => { S = baseS * zoom; viewH = H / S; };
  function resize() {
    const r = cvs.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cvs.width = Math.round(W * DPR); cvs.height = Math.round(H * DPR);
    baseS = Math.min(H / VIEW_H, W / 26) || 20;   // (the box can measure 0 while the page is still laying out)
    applyZoom();
  }
  const viewW = () => W / S;
  new ResizeObserver(resize).observe(cvs);
  resize();

  // saved progress (this device only): best score, best combo, and the worlds finished - shown on the site's My Stats page
  const store = {
    get(k, d) { try { const v = localStorage.getItem('grapplerope_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { if (window.grappleRopeResetting) return; try { localStorage.setItem('grapplerope_' + k, JSON.stringify(v)); } catch (e) {} }
  };
  function saveWin() {
    const done = store.get('worlds_done', []);
    if (!done.includes(mode)) { done.push(mode); store.set('worlds_done', done); }
    store.set('best_score', Math.max(store.get('best_score', 0), score));
    store.set('best_combo', Math.max(store.get('best_combo', 0), bestCombo));
  }
  const rnd = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const fmt = n => Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : n.toFixed(1);

  // ---------- sound ----------
  let ac = null;
  function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } return ac; }
  function tone(f1, f2, dur, type = 'sine', vol = 0.12, delay = 0) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const sfx = {
    // the rope throw and the swing: a bright rising "whee" (it used to be a falling buzz, which sounded like a mistake)
    thwip: () => { tone(520, 1040, 0.18, 'triangle', 0.07); tone(780, 1560, 0.16, 'sine', 0.04, 0.05); },
    clack: () => tone(1320, 1760, 0.08, 'triangle', 0.05),   // the rope catches: a short rising chime
    perfect: () => { tone(523, 523, 0.12, 'triangle', 0.1); tone(659, 659, 0.12, 'triangle', 0.1, 0.08); tone(784, 784, 0.22, 'triangle', 0.1, 0.16); },
    miss: () => tone(320, 70, 0.45, 'sawtooth', 0.06),
    splash: () => tone(200, 50, 0.5, 'sine', 0.15),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.25, 'triangle', 0.1, i * 0.11))
  };

  sfx.step = () => tone(660, 990, 0.09, 'triangle', 0.08);
  // a correct answer's rope throw and swing: a soft rising swoosh with a little sparkle (G, C, E) on top
  sfx.whoosh = () => { tone(300, 900, 0.35, 'sine', 0.06); tone(450, 1350, 0.3, 'triangle', 0.035, 0.04); [1568, 2093, 2637].forEach((f, i) => tone(f, f, 0.18, 'sine', 0.035, 0.22 + i * 0.06)); };
  sfx.pour = () => { tone(300, 600, 0.35, 'sine', 0.06); tone(450, 900, 0.3, 'sine', 0.04, 0.1); };
  sfx.oops = () => tone(260, 180, 0.2, 'square', 0.05);
  // the slow motion starts with a magic sparkle: a quick upward run of bell notes (C E G C E G)
  sfx.sparkle = () => [1047, 1319, 1568, 2093, 2637, 3136].forEach((f, i) => tone(f, f, 0.35, 'triangle', 0.05, i * 0.07));
  sfx.chime = () => tone(880, 1320, 0.18, 'triangle', 0.07);
  // the BANG: a burst of noise over a deep boom
  sfx.bang = () => {
    const a = audio(); if (!a) return;
    try {
      const n = Math.floor(a.sampleRate * 0.6), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      const src = a.createBufferSource(), g = a.createGain(); src.buffer = buf; g.gain.value = 0.35;
      src.connect(g).connect(a.destination); src.start();
    } catch (e) {}
    tone(95, 32, 0.9, 'sine', 0.4); tone(170, 45, 0.45, 'square', 0.08);
    [784, 988, 1175].forEach((f, i) => tone(f, f, 0.3, 'triangle', 0.07, 0.12 + i * 0.07));
  };

  // ---------- state ----------
  let mode = 'w1', ledges = [], problems = [];
  let idx = 0, score = 0, combo = 0, bestCombo = 0, perfects = 0, misses = 0;
  let state = 'aim', st = 0;
  const P = { x: 0, y: 0, vx: 0, vy: 0, rot: 0 };
  let rope = null, outcome = null, failKind = null, guess = null, P0 = null, landFrom = null;
  let camX = 0, camY = 0, shake = 0;
  let popups = [], parts = [], explain = null;
  let wrongs = new Set(), aimTime = 0;
  // canyon-figure animation: current values ease toward targets
  const nb = { aF: 0, bF: 0, pour: 0, side: 0, reveal: 1, sym: 0, num: 0, crumble: 0 };
  const nbT = { aF: 0, bF: 0, pour: 0, side: 0, reveal: 1, sym: 0, num: 0, crumble: 0 };
  const leaves = Array.from({ length: 14 }, (_, i) => ({ x: rnd(i), y: rnd(i + 50), s: 0.6 + rnd(i + 9) * 0.8, p: rnd(i + 3) * TAU }));

  const HOP_A = 2, HOP_B = 3.2;   // small swings between step platforms
  const cur = () => ledges[idx];
  const anchorOf = l => ({ x: l.ax, y: l.ay });
  let cine = null, timeScale = 1;  // the slow-motion close-up after the final answer
  const ri = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  // ---------- problems: each step of the written solution is one swing ----------
  // [a, b]: a = distance across (kept to 9 or less so the square on the rope stays below the canopy), b = anchor height
  const TRIPLES = [[3, 4], [4, 3], [6, 8], [8, 6], [5, 12], [9, 12], [8, 15]];
  // Worlds 1 to 3: four different small triangles, one for each problem (the smallest first-world favorites plus 5-12-13 and 9-12-15)
  const SMALL_TRIPLES = [[3, 4], [4, 3], [6, 8], [8, 6], [5, 12], [12, 5], [9, 12], [12, 9]];
  // World 5's triangles: bigger than 3-4-5, but every square is on the perfect-squares list (up to 17² = 289)
  const BIG_TRIPLES = [[6, 8], [8, 6], [5, 12], [12, 5], [9, 12], [12, 9], [8, 15], [15, 8]];
  const PLAN = { w0: ['hyp', 'hyp', 'hyp', 'hyp'], w1: ['hyp', 'hyp', 'hyp', 'hyp'], w2: ['hyp', 'hyp', 'hyp', 'hyp'], w3: ['leg', 'hyp', 'leg', 'leg'],
    w4: ['hyp', 'leg', 'hyp', 'leg'] };   // World 5 shuffles this order every game
  // the five worlds as the World Map and the header show them
  const WORLDS = [
    { m: 'w0', name: tl('Rope Count', 'Cuenta la cuerda'), short: tl('Count the squares · type c', 'Cuenta cuadrados · escribe c'),
      blurb: tl('Count the 1-foot squares along the rope and type how long it is. The best place to start!', 'Cuenta los cuadrados de 1 pie a lo largo de la cuerda y escribe cuánto mide. ¡El mejor lugar para empezar!'), chips: [tl('1 question per canyon', '1 pregunta por cañón'), tl('Type the answer', 'Escribe la respuesta'), tl('Count squares', 'Cuenta cuadrados')], sample: tl('Count the blue squares: <span class="cc">c</span> = <span class="bl">5</span> ft', 'Cuenta los cuadrados azules: <span class="cc">c</span> = <span class="bl">5</span> pies') },
    { m: 'w1', name: tl('Tile Grove', 'Bosque de fichas'), short: tl('Every step · tile squares', 'Cada paso · cuadrados con fichas'),
      blurb: tl('Solve a² + b² = c² one step at a time while tiles fill the squares on each side.', 'Resuelve a² + b² = c² paso a paso mientras las fichas llenan los cuadrados de cada lado.'), chips: [tl('Every step', 'Cada paso'), tl('2 choices', '2 opciones'), tl('Tile squares', 'Cuadrados con fichas')], sample: tl('<span class="ca">3²</span> + <span class="cb">4²</span> = <span class="cc">c²</span> → <span class="cc">c</span> = √25 = 5 ft', '<span class="ca">3²</span> + <span class="cb">4²</span> = <span class="cc">c²</span> → <span class="cc">c</span> = √25 = 5 pies') },
    { m: 'w2', name: tl('Waterfall Cliffs', 'Acantilados de la cascada'), short: tl('Count squares · 4 choices · timed', 'Cuenta cuadrados · 4 opciones · con tiempo'),
      blurb: tl('Count one unlabeled side, pick from four answers, and type the rope length before the rope frays.', 'Cuenta un lado sin número, elige entre cuatro respuestas y escribe el largo de la cuerda antes de que se deshilache.'), chips: [tl('4 choices', '4 opciones'), tl('Timed', 'Con tiempo'), tl('Fewer hints', 'Menos pistas')], sample: tl('Count <span class="cb">b</span> = 8, then type <span class="cc">c</span> = <span class="bl">10</span> ft', 'Cuenta <span class="cb">b</span> = 8 y luego escribe <span class="cc">c</span> = <span class="bl">10</span> pies') },
    { m: 'w3', name: tl('Temple Ruins', 'Ruinas del templo'), short: tl('Formula given · missing legs · timed', 'Fórmula dada · catetos que faltan · con tiempo'),
      blurb: tl('The numbers are carved on a temple door. Find the missing distance a to open it before the rope frays.', 'Los números están tallados en la puerta de un templo. Halla la distancia a que falta para abrirla antes de que la cuerda se deshilache.'), chips: [tl('Missing legs', 'Catetos que faltan'), tl('Timed', 'Con tiempo'), tl('Subtract squares', 'Resta cuadrados')], sample: tl('<span class="ca">a²</span> = <span class="cc">13²</span> − <span class="cb">5²</span> → <span class="ca">a</span> = 12 ft', '<span class="ca">a²</span> = <span class="cc">13²</span> − <span class="cb">5²</span> → <span class="ca">a</span> = 12 pies') },
    { m: 'w4', name: tl('Summit', 'La cumbre'), short: tl('Fill in the blanks · step hints', 'Llena los espacios · pistas por paso'),
      blurb: tl('Type the missing number in every line of the math. Step hints and the perfect-squares list are there to help.', 'Escribe el número que falta en cada línea. Las pistas por paso y la lista de cuadrados perfectos te ayudan.'), chips: [tl('Fill in the blanks', 'Llena los espacios'), tl('Bigger triangles', 'Triángulos más grandes'), tl('Step hints', 'Pistas por paso')], sample: '<span class="ca">a²</span> + <span class="bl">576</span> = <span class="cc">625</span>' }
  ];
  // color coding: leg a = coral, leg b = green, hypotenuse c = blue, everywhere a number appears
  const A = x => `<span class="ca">${x}</span>`, B = x => `<span class="cb">${x}</span>`, C = x => `<span class="cc">${x}</span>`;
  const plain = html => html.replace(/<[^>]+>/g, '');
  // a real square root: the sign plus a bar that runs over the whole number
  // the radical sign as a drawing stretched to the height of the number: a small tick, a thick stroke down to the
  // bottom, and a thin stroke up that meets the bar (the bar is the top border of the number)
  const RAD_SVG = '<svg class="rs" viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true">' +
    '<path class="thin" d="M0.6 58 L2.6 51"/><path class="thick" d="M2.6 51 L5.4 97"/><path class="thin" d="M5.4 97 L9.3 1.2 L10.5 1.2"/></svg>';
  const rad = inner => `<span class="rad" role="img" aria-label="${tl('square root of ' + plain(String(inner)), 'raíz cuadrada de ' + plain(String(inner)))}">${RAD_SVG}<span class="ri">${inner}</span></span>`;
  const radHTML = text => text.replace(/√(\d+(?:\.\d+)?)/g, (m, n) => rad(n));
  // one line of the written solution: the right line plus one wrong line (with its hint), or a list of [wrong, hint] pairs
  const step = (key, name, right, wrong, hint) => {
    const wrongs = (Array.isArray(wrong) ? wrong : [[wrong, hint]]).filter(([w], i, all) => plain(w) !== plain(right) && all.findIndex(([v]) => plain(v) === plain(w)) === i);
    return { key, name, line: right, choices: shuffle([{ label: plain(right), html: right, ok: true }, ...wrongs.map(([w, h]) => ({ label: plain(w), html: w, ok: false, hint: h }))]) };
  };

  // Problems never repeat: no question comes twice in one world, and the same triangle (either way round)
  // can't come twice in a row, even across a new game
  // A triangle is one question, whichever way round it's drawn and whether it asks for the rope or the distance:
  // each world uses every triangle at most once, and a new world doesn't start with the triangle the last one ended on.
  let usedTriangles = new Set(), lastTriangle = '';
  const triangleKey = ([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`;
  function makeProblem(type, i) {
    if (i === 0) usedTriangles = new Set();   // a new world
    const pool = mode === 'w4' ? BIG_TRIPLES : mode === 'w3' ? TRIPLES : SMALL_TRIPLES;
    let choices = pool.filter(t => !usedTriangles.has(triangleKey(t)));
    if (!choices.length) choices = pool;   // (never happens: every pool has at least 4 different triangles)
    const notLast = choices.filter(t => triangleKey(t) !== lastTriangle);
    if (notLast.length) choices = notLast;
    const [a, b] = pick(choices);
    usedTriangles.add(triangleKey([a, b])); lastTriangle = triangleKey([a, b]);
    const p = problemFor(type, a, b);
    p.steps = buildSteps(p);
    return p;
  }
  function problemFor(type, a, b) {
    const sum = a * a + b * b, c = Math.sqrt(sum);
    const p = { type, a, b, sum, c, done: 0, work: [] };
    if (mode === 'w2') p.count = pick(['a', 'b']);   // the leg students find by counting squares
    return p;
  }

  // Each step's wrong answers are drawn at random from a pool of common mistakes, so they change from problem to problem.
  // World 2 shows three of them (four answers in all); Worlds 1 and 3 show one.
  function wrongsFrom(right, pool) {
    const seen = new Set([plain(right)]);
    const ok = shuffle(pool.filter(Boolean).slice()).filter(([w]) => { const k = plain(w); if (seen.has(k)) return false; seen.add(k); return true; });
    return ok.slice(0, mode === 'w2' ? 3 : 1);
  }
  // World 5: every step is a line of the solution with one blank to type in. Which number is blanked out (and how the
  // line is written) is picked at random, so the same triangle never reads the same way twice.
  function blankSteps(p) {
    const { type, a, b, sum, c } = p, aa = a * a, bb = b * b, cc2 = c * c;
    // pre / post: the line around the blank; ans: what goes in it; line: the finished line for the worked solution
    const blank = (key, pre, post, ans, why) => ({ key, name: tl('Fill in the blank', 'Llena el espacio'), line: pre + ans + post,
      typed: { blank: true, pre, post, ans, why }, choices: [] });
    const sqWhy = n => v => v === 2 * n ? tl(`${n}² means ${n} × ${n}, not ${n} × 2. ${n} × ${n} = ${n * n}.`, `${n}² significa ${n} × ${n}, no ${n} × 2. ${n} × ${n} = ${n * n}.`) : `${n}² = ${n} × ${n} = ${n * n}.`;
    const rootWhy = (area, r) => v => v === area ? tl(`${area} is the area of the square. Its side is the square root: ${r} × ${r} = ${area}, so √${area} = ${r}.`, `${area} es el área del cuadrado. Su lado es la raíz cuadrada: ${r} × ${r} = ${area}, así que √${area} = ${r}.`)
      : v === area / 2 ? tl(`A square root is not half. ${r} × ${r} = ${area}, so √${area} = ${r}.`, `Una raíz cuadrada no es la mitad. ${r} × ${r} = ${area}, así que √${area} = ${r}.`)
      : tl(`Check: ${fmt(v)} × ${fmt(v)} = ${fmt(v * v)}, not ${area}. ${r} × ${r} = ${area}, so √${area} = ${r}.`, `Revisa: ${fmt(v)} × ${fmt(v)} = ${fmt(v * v)}, no ${area}. ${r} × ${r} = ${area}, así que √${area} = ${r}.`);
    const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];
    if (type === 'leg') {
      return [
        pickOne([
          blank('square', `${A('a²')} + `, ` = ${C(cc2)}`, bb, sqWhy(b)),
          blank('square', `${A('a²')} + ${B(bb)} = `, '', cc2, sqWhy(c)),
          blank('square', `${A('a²')} + ${B(b + '²')} = ${C(c + '²')} → ${A('a²')} + `, ` = ${C(cc2)}`, bb, sqWhy(b))
        ]),
        pickOne([
          blank('subtract', `${A('a²')} = ${C(cc2)} − ${B(bb)} = `, '', aa, v => v === cc2 + bb ? tl(`To get a² alone, subtract: ${cc2} − ${bb} = ${aa}.`, `Para dejar a² sola, resta: ${cc2} − ${bb} = ${aa}.`) : tl(`Check the subtraction: ${cc2} − ${bb} = ${aa}.`, `Revisa la resta: ${cc2} − ${bb} = ${aa}.`)),
          blank('subtract', tl(`${A('a²')} + ${B(bb)} = ${C(cc2)}, so ${A('a²')} = `, `${A('a²')} + ${B(bb)} = ${C(cc2)}, así que ${A('a²')} = `), '', aa, v => tl(`What adds to ${bb} to make ${cc2}? ${cc2} − ${bb} = ${aa}.`, `¿Qué se suma a ${bb} para dar ${cc2}? ${cc2} − ${bb} = ${aa}.`))
        ]),
        pickOne([
          blank('root', `${A('a')} = ${rad(A(aa))} = `, FT, a, rootWhy(aa, a)),
          blank('root', tl(`${A('a')} × ${A('a')} = ${A(aa)}, so ${A('a')} = `, `${A('a')} × ${A('a')} = ${A(aa)}, así que ${A('a')} = `), FT, a, rootWhy(aa, a))
        ])
      ];
    }
    return [
      pickOne([
        blank('square', `${A(a + '²')} + ${B(b + '²')} = `, ` + ${B(bb)}`, aa, sqWhy(a)),
        blank('square', `${A(a + '²')} + ${B(b + '²')} = ${A(aa)} + `, '', bb, sqWhy(b))
      ]),
      pickOne([
        blank('add', `${A(aa)} + ${B(bb)} = `, ` = ${C('c²')}`, sum, v => v === a + b ? tl(`Add the squares, not the sides: ${aa} + ${bb} = ${sum}.`, `Suma los cuadrados, no los lados: ${aa} + ${bb} = ${sum}.`) : tl(`Check the addition: ${aa} + ${bb} = ${sum}.`, `Revisa la suma: ${aa} + ${bb} = ${sum}.`)),
        blank('add', `${C('c²')} = ${A(aa)} + ${B(bb)} = `, '', sum, v => tl(`Check the addition: ${aa} + ${bb} = ${sum}.`, `Revisa la suma: ${aa} + ${bb} = ${sum}.`))
      ]),
      pickOne([
        blank('root', `${C('c')} = ${rad(C(sum))} = `, FT, c, rootWhy(sum, c)),
        blank('root', tl(`${C('c')} × ${C('c')} = ${C(sum)}, so ${C('c')} = `, `${C('c')} × ${C('c')} = ${C(sum)}, así que ${C('c')} = `), FT, c, rootWhy(sum, c))
      ])
    ];
  }
  function buildSteps(p) {
    const { type, a, b, sum, c } = p, out = [];
    const add = (key, name, right, pool) => out.push(step(key, name, right, wrongsFrom(right, pool)));
    const ft = x => x + FT;
    if (mode === 'w4') return blankSteps(p);
    if (mode === 'w0') {   // the first world: one question - count the 1-ft squares along the rope's square and type c
      return [{ key: 'countc', name: tl('Count the squares along the rope c', 'Cuenta los cuadrados a lo largo de la cuerda c'), typed: { c, sum, est: false, count: true },
        line: `${C('c')} = ${C(ft(c))}`, choices: [] }];
    }
    if (mode === 'w1') {   // only World 2 (Tile Grove) asks for the formula
      add('formula', tl('Pick the formula', 'Elige la fórmula'), `${A('a²')} + ${B('b²')} = ${C('c²')}`, [
        [`${A('a')} + ${B('b')} = ${C('c')}`, tl('Adding the sides does not work. The squares of the legs add up to the square of the hypotenuse.', 'Sumar los lados no funciona. Los cuadrados de los catetos suman el cuadrado de la hipotenusa.')],
        [`(${A('a')} + ${B('b')})² = ${C('c²')}`, tl('Square each leg by itself, then add: a² + b² = c².', 'Eleva cada cateto al cuadrado por separado y luego suma: a² + b² = c².')],
        [`${A('a²')} + ${B('b²')} = ${C('c')}`, tl('The hypotenuse gets squared too: a² + b² = c².', 'La hipotenusa también se eleva al cuadrado: a² + b² = c².')],
        [`${A('a²')} + ${C('c²')} = ${B('b²')}`, tl('c is the hypotenuse - the rope, across from the right angle. Its square goes by itself: a² + b² = c².', 'c es la hipotenusa - la cuerda, frente al ángulo recto. Su cuadrado va solo: a² + b² = c².')],
        [`${A('2a')} + ${B('2b')} = ${C('2c')}`, tl('Squaring means times itself, not times 2: a² + b² = c².', 'Elevar al cuadrado es multiplicar por sí mismo, no por 2: a² + b² = c².')],
        [`${A('a²')} × ${B('b²')} = ${C('c²')}`, tl('Add the two squares - don\'t multiply them: a² + b² = c².', 'Suma los dos cuadrados - no los multipliques: a² + b² = c².')]
      ]);
    }
    if (mode === 'w2') {   // World 2: one leg isn't labeled - count the 1-ft squares along it
      const n = p.count === 'a' ? a : b, L = p.count === 'a' ? A : B, sq = p.count === 'a' ? 'coral' : tl('green', 'verde');
      const miscount = tl(`Count the squares along one edge of the ${sq} square, corner to corner - there are ${n}.`, `Cuenta los cuadrados a lo largo de un borde del cuadrado ${sq}, de esquina a esquina - hay ${n}.`);
      add('count', tl(`Count the squares along ${p.count}`, `Cuenta los cuadrados a lo largo de ${p.count}`), `${L(p.count)} = ${L(ft(n))}`, [
        [`${L(p.count)} = ${L(ft(n - 1))}`, miscount], [`${L(p.count)} = ${L(ft(n + 1))}`, miscount],
        n > 2 && [`${L(p.count)} = ${L(ft(n - 2))}`, miscount], [`${L(p.count)} = ${L(ft(n + 2))}`, miscount],
        [`${L(p.count)} = ${L(ft(n * n))}`, tl(`${n * n} is every square inside the ${sq} square (its area). Count only the ones along one edge: ${n}.`, `${n * n} son todos los cuadrados dentro del cuadrado ${sq} (su área). Cuenta solo los de un borde: ${n}.`)],
        [`${L(p.count)} = ${L(ft(2 * n))}`, tl(`${2 * n} counts two edges of the ${sq} square. Count just one edge: ${n}.`, `${2 * n} cuenta dos bordes del cuadrado ${sq}. Cuenta solo un borde: ${n}.`)],
        [`${L(p.count)} = ${L(ft(4 * n))}`, tl(`${4 * n} goes all the way around the ${sq} square. Count just one edge: ${n}.`, `${4 * n} le da toda la vuelta al cuadrado ${sq}. Cuenta solo un borde: ${n}.`)]
      ]);
    }
    if (type === 'leg') {   // the rope c and the anchor height b are known: find a, the distance to the next platform
      add('sub', tl('Plug in what you know', 'Sustituye lo que sabes'), `${A('a²')} + ${B(b + '²')} = ${C(c + '²')}`, [
        [`${B(b + '²')} + ${C(c + '²')} = ${A('a²')}`, tl(`${c} is the rope, the hypotenuse - the longest side. It goes by itself: a² + ${b}² = ${c}².`, `${c} es la cuerda, la hipotenusa - el lado más largo. Va sola: a² + ${b}² = ${c}².`)],
        [`${A('a')} + ${B(b)} = ${C(c)}`, tl(`Square every side: a² + ${b}² = ${c}².`, `Eleva cada lado al cuadrado: a² + ${b}² = ${c}².`)],
        [`${A('a²')} + ${B(b + '²')} = ${C(c)}`, tl(`The rope is squared too: a² + ${b}² = ${c}².`, `La cuerda también se eleva al cuadrado: a² + ${b}² = ${c}².`)],
        [`${A('a²')} − ${B(b + '²')} = ${C(c + '²')}`, tl(`The squares of the legs add up to the square of the rope: a² + ${b}² = ${c}².`, `Los cuadrados de los catetos suman el cuadrado de la cuerda: a² + ${b}² = ${c}².`)]
      ]);
      add('square', tl('Square the numbers', 'Eleva los números al cuadrado'), `${A('a²')} + ${B(b * b)} = ${C(c * c)}`, [
        [`${A('a²')} + ${B(2 * b)} = ${C(2 * c)}`, tl(`Squaring means times itself, not times 2: ${b}² = ${b * b} and ${c}² = ${c * c}.`, `Elevar al cuadrado es multiplicar por sí mismo, no por 2: ${b}² = ${b * b} y ${c}² = ${c * c}.`)],
        [`${A('a²')} + ${B(b * b)} = ${C(c)}`, tl(`Square the rope too: ${c}² = ${c * c}.`, `Eleva la cuerda al cuadrado también: ${c}² = ${c * c}.`)],
        [`${A('a²')} + ${B(b)} = ${C(c * c)}`, tl(`Square the ${b} too: ${b}² = ${b * b}.`, `Eleva el ${b} al cuadrado también: ${b}² = ${b * b}.`)],
        [`${A('a²')} + ${B(b * b)} = ${C(2 * c)}`, tl(`${c}² means ${c} × ${c} = ${c * c}, not ${c} × 2.`, `${c}² significa ${c} × ${c} = ${c * c}, no ${c} × 2.`)]
      ]);
      const aa = a * a;
      add('subtract', tl('Get a² by itself', 'Deja a² sola'), `${A('a²')} = ${C(c * c)} − ${B(b * b)} = ${A(aa)}`, [
        [`${A('a²')} = ${C(c * c)} + ${B(b * b)} = ${A(c * c + b * b)}`, tl(`To get a² alone, subtract ${b * b} from both sides: ${c * c} − ${b * b} = ${aa}.`, `Para dejar a² sola, resta ${b * b} de ambos lados: ${c * c} − ${b * b} = ${aa}.`)],
        [`${A('a²')} = (${C(c)} − ${B(b)})² = ${A((c - b) * (c - b))}`, tl(`Subtract the squares, not the sides: ${c * c} − ${b * b} = ${aa}.`, `Resta los cuadrados, no los lados: ${c * c} − ${b * b} = ${aa}.`)],
        [`${A('a²')} = ${C(c * c)} − ${B(b * b)} = ${A(aa + 10)}`, tl(`Check the subtraction: ${c * c} − ${b * b} = ${aa}.`, `Revisa la resta: ${c * c} − ${b * b} = ${aa}.`)],
        [`${A('a²')} = ${C(c * c)} − ${B(b * b)} = ${A(aa - 1)}`, tl(`Check the subtraction: ${c * c} − ${b * b} = ${aa}.`, `Revisa la resta: ${c * c} − ${b * b} = ${aa}.`)],
        [`${A('a²')} = ${C(c * c)} − ${B(b * b)} = ${A(aa + 1)}`, tl(`Check the subtraction: ${c * c} − ${b * b} = ${aa}.`, `Revisa la resta: ${c * c} − ${b * b} = ${aa}.`)]
      ]);
      const aRoot = v => `${A('a')} = ${rad(A(aa))} = ${A(ft(v))}`;   // every choice in the same form
      add('root', tl('Take the square root', 'Saca la raíz cuadrada'), aRoot(a), [
        [aRoot(aa), tl(`${aa} is a², not a. Take the square root: √${aa} = ${a}, because ${a} × ${a} = ${aa}.`, `${aa} es a², no a. Saca la raíz cuadrada: √${aa} = ${a}, porque ${a} × ${a} = ${aa}.`)],
        aa % 2 === 0 && aa / 2 !== a && [aRoot(aa / 2), tl(`A square root is not half. ${a} × ${a} = ${aa}, so √${aa} = ${a}.`, `Una raíz cuadrada no es la mitad. ${a} × ${a} = ${aa}, así que √${aa} = ${a}.`)],
        [aRoot(c - b), tl(`Sides don't subtract like that - only their squares do. ${a} × ${a} = ${aa}, so √${aa} = ${a}.`, `Los lados no se restan así - solo sus cuadrados. ${a} × ${a} = ${aa}, así que √${aa} = ${a}.`)],
        [aRoot(2 * a), tl(`Check: ${2 * a} × ${2 * a} = ${4 * aa}, not ${aa}. √${aa} = ${a}.`, `Revisa: ${2 * a} × ${2 * a} = ${4 * aa}, no ${aa}. √${aa} = ${a}.`)],
        [aRoot(a + 1), tl(`Check: ${a + 1} × ${a + 1} = ${(a + 1) * (a + 1)}, not ${aa}. √${aa} = ${a}.`, `Revisa: ${a + 1} × ${a + 1} = ${(a + 1) * (a + 1)}, no ${aa}. √${aa} = ${a}.`)],
        [aRoot(a - 1), tl(`Check: ${a - 1} × ${a - 1} = ${(a - 1) * (a - 1)}, not ${aa}. √${aa} = ${a}.`, `Revisa: ${a - 1} × ${a - 1} = ${(a - 1) * (a - 1)}, no ${aa}. √${aa} = ${a}.`)],
        [aRoot(a + 2), tl(`Check: ${a + 2} × ${a + 2} = ${(a + 2) * (a + 2)}, not ${aa}. √${aa} = ${a}.`, `Revisa: ${a + 2} × ${a + 2} = ${(a + 2) * (a + 2)}, no ${aa}. √${aa} = ${a}.`)]
      ]);
      return out;
    }
    add('sub', tl('Plug in the legs', 'Sustituye los catetos'), `${A(a + '²')} + ${B(b + '²')} = ${C('c²')}`, [
      [`${A(a)} + ${B(b)} = ${C('c²')}`, tl(`Keep the squares: each leg gets squared, so it is ${a}² + ${b}² = c².`, `Conserva los cuadrados: cada cateto se eleva al cuadrado, así que es ${a}² + ${b}² = c².`)],
      [`${A(a + '²')} + ${B(b + '²')} = ${C('c')}`, tl(`The hypotenuse is squared too: ${a}² + ${b}² = c².`, `La hipotenusa también se eleva al cuadrado: ${a}² + ${b}² = c².`)],
      [`${A(a + '²')} + ${C('c²')} = ${B(b + '²')}`, tl(`c is the rope - the hypotenuse, across from the right angle. It goes by itself: ${a}² + ${b}² = c².`, `c es la cuerda - la hipotenusa, frente al ángulo recto. Va sola: ${a}² + ${b}² = c².`)],
      [`(${A(a)} + ${B(b)})² = ${C('c²')}`, tl(`Square each leg by itself, then add: ${a}² + ${b}² = c².`, `Eleva cada cateto al cuadrado por separado y luego suma: ${a}² + ${b}² = c².`)],
      [`${A(a + '²')} × ${B(b + '²')} = ${C('c²')}`, tl(`Add the squares - don't multiply them: ${a}² + ${b}² = c².`, `Suma los cuadrados - no los multipliques: ${a}² + ${b}² = c².`)]
    ]);
    add('square', tl('Square each leg', 'Eleva cada cateto al cuadrado'), `${A(a * a)} + ${B(b * b)} = ${C('c²')}`, [
      [`${A(2 * a)} + ${B(2 * b)} = ${C('c²')}`, tl(`${a}² means ${a} × ${a} = ${a * a}, not ${a} × 2.`, `${a}² significa ${a} × ${a} = ${a * a}, no ${a} × 2.`)],
      [`${A(a * a)} + ${B(b)} = ${C('c²')}`, tl(`Square both legs: ${b}² = ${b} × ${b} = ${b * b}.`, `Eleva ambos catetos al cuadrado: ${b}² = ${b} × ${b} = ${b * b}.`)],
      [`${A(a)} + ${B(b * b)} = ${C('c²')}`, tl(`Square both legs: ${a}² = ${a} × ${a} = ${a * a}.`, `Eleva ambos catetos al cuadrado: ${a}² = ${a} × ${a} = ${a * a}.`)],
      [`${A(a * a)} + ${B(2 * b)} = ${C('c²')}`, tl(`${b}² means ${b} × ${b} = ${b * b}, not ${b} × 2.`, `${b}² significa ${b} × ${b} = ${b * b}, no ${b} × 2.`)],
      [`${A(2 * a)} + ${B(b * b)} = ${C('c²')}`, tl(`${a}² means ${a} × ${a} = ${a * a}, not ${a} × 2.`, `${a}² significa ${a} × ${a} = ${a * a}, no ${a} × 2.`)],
      [`${A(a * b)} + ${B(a * b)} = ${C('c²')}`, tl(`Square each leg by itself: ${a} × ${a} = ${a * a} and ${b} × ${b} = ${b * b}, not ${a} × ${b}.`, `Eleva cada cateto al cuadrado por separado: ${a} × ${a} = ${a * a} y ${b} × ${b} = ${b * b}, no ${a} × ${b}.`)]
    ]);
    const slip = tl(`Check the addition: ${a * a} + ${b * b} = ${sum}.`, `Revisa la suma: ${a * a} + ${b * b} = ${sum}.`);
    add('add', tl('Add the squares', 'Suma los cuadrados'), `${C(sum)} = ${C('c²')}`, [
      [`${C(sum + 10)} = ${C('c²')}`, slip], sum > 10 && [`${C(sum - 10)} = ${C('c²')}`, slip],
      [`${C(sum + 1)} = ${C('c²')}`, slip], [`${C(sum - 1)} = ${C('c²')}`, slip], [`${C(sum + 2)} = ${C('c²')}`, slip],
      [`${C(a * a * b * b)} = ${C('c²')}`, tl(`Add the squares - don't multiply them: ${a * a} + ${b * b} = ${sum}.`, `Suma los cuadrados - no los multipliques: ${a * a} + ${b * b} = ${sum}.`)],
      [`${C((a + b) * (a + b))} = ${C('c²')}`, tl(`Add the squares ${a * a} + ${b * b}, not (${a} + ${b})².`, `Suma los cuadrados ${a * a} + ${b * b}, no (${a} + ${b})².`)],
      [`${C(a + b)} = ${C('c²')}`, tl(`Add the squares, not the sides: ${a * a} + ${b * b} = ${sum}.`, `Suma los cuadrados, no los lados: ${a * a} + ${b * b} = ${sum}.`)]
    ]);
    if (mode === 'w2') {   // World 2 types the rope length instead of picking it
      const est = type === 'est';
      out.push({ key: 'root', name: est ? tl('Type c to the nearest foot', 'Escribe c al pie más cercano') : tl('Type the rope length c', 'Escribe el largo de la cuerda c'), typed: { c, sum, est },
        line: est ? `${C('c')} = ${rad(C(sum))} ≈ ${C(ft(Math.round(c)))}` : `${C('c')} = ${rad(C(sum))} = ${C(ft(c))}`, choices: [] });
      return out;
    }
    if (type === 'est') {
      const f = Math.floor(c), why = tl(`${f}² = ${f * f} and ${f + 1}² = ${(f + 1) * (f + 1)}. ${sum} is between them, so c is between ${f} and ${f + 1}.`, `${f}² = ${f * f} y ${f + 1}² = ${(f + 1) * (f + 1)}. ${sum} está entre ellos, así que c está entre ${f} y ${f + 1}.`);
      add('root', tl('Estimate the square root', 'Estima la raíz cuadrada'), `${f} < ${C('c')} < ${f + 1}`, [
        f > 1 && [`${f - 1} < ${C('c')} < ${f}`, why], [`${f + 1} < ${C('c')} < ${f + 2}`, why], f > 2 && [`${f - 2} < ${C('c')} < ${f - 1}`, why]
      ]);
    } else {
      // every choice has the same form, c = √sum = ? ft, so only the math (not the look) gives the answer away
      const cRoot = v => `${C('c')} = ${rad(C(sum))} = ${C(ft(v))}`;
      add('root', tl('Take the square root', 'Saca la raíz cuadrada'), cRoot(c), [
        [cRoot(sum), tl(`${sum} is c², not c. Take the square root: √${sum} = ${c}, because ${c} × ${c} = ${sum}.`, `${sum} es c², no c. Saca la raíz cuadrada: √${sum} = ${c}, porque ${c} × ${c} = ${sum}.`)],
        sum % 2 === 0 && sum / 2 !== c && [cRoot(sum / 2), tl(`A square root is not half. ${c} × ${c} = ${sum}, so √${sum} = ${c}.`, `Una raíz cuadrada no es la mitad. ${c} × ${c} = ${sum}, así que √${sum} = ${c}.`)],
        [cRoot(a + b), tl(`The rope isn't the two legs added together. ${c} × ${c} = ${sum}, so √${sum} = ${c}.`, `La cuerda no es la suma de los dos catetos. ${c} × ${c} = ${sum}, así que √${sum} = ${c}.`)],
        [cRoot(2 * c), tl(`Check: ${2 * c} × ${2 * c} = ${4 * sum}, not ${sum}. √${sum} = ${c}.`, `Revisa: ${2 * c} × ${2 * c} = ${4 * sum}, no ${sum}. √${sum} = ${c}.`)],
        [cRoot(c + 1), tl(`Check: ${c + 1} × ${c + 1} = ${(c + 1) * (c + 1)}, not ${sum}. √${sum} = ${c}.`, `Revisa: ${c + 1} × ${c + 1} = ${(c + 1) * (c + 1)}, no ${sum}. √${sum} = ${c}.`)],
        [cRoot(c - 1), tl(`Check: ${c - 1} × ${c - 1} = ${(c - 1) * (c - 1)}, not ${sum}. √${sum} = ${c}.`, `Revisa: ${c - 1} × ${c - 1} = ${(c - 1) * (c - 1)}, no ${sum}. √${sum} = ${c}.`)],
        [cRoot(c + 2), tl(`Check: ${c + 2} × ${c + 2} = ${(c + 2) * (c + 2)}, not ${sum}. √${sum} = ${c}.`, `Revisa: ${c + 2} × ${c + 2} = ${(c + 2) * (c + 2)}, no ${sum}. √${sum} = ${c}.`)]
      ]);
    }
    return out;
  }

  // how a typed rope length went wrong, for the hint
  function typedHint(t, v) {
    if (t.count) {   // the first world: counting the squares along the rope's square
      if (Math.abs(v - t.sum) < 0.01) return tl(`${t.sum} is c² - the area, not the length. Count the blue squares along the rope: ${t.c}.`, `${t.sum} es c² - el área, no el largo. Cuenta los cuadrados azules a lo largo de la cuerda: ${t.c}.`);
      if (Math.abs(v - 2 * t.c) < 0.01) return tl(`${2 * t.c} is double. Count each blue square along the rope once: ${t.c}.`, `${2 * t.c} es el doble. Cuenta cada cuadrado azul de la cuerda una sola vez: ${t.c}.`);
      if (Math.abs(v - 4 * t.c) < 0.01) return tl(`${4 * t.c} is too many. Count only the blue squares along the rope: ${t.c}.`, `${4 * t.c} son demasiados. Cuenta solo los cuadrados azules a lo largo de la cuerda: ${t.c}.`);
      return tl(`Count the blue squares along the rope, end to end - there are ${t.c}.`, `Cuenta los cuadrados azules a lo largo de la cuerda, de punta a punta - hay ${t.c}.`);
    }
    const f = Math.floor(t.c), near = t.sum - f * f < (f + 1) * (f + 1) - t.sum ? f : f + 1;
    if (Math.abs(v - t.sum) < 0.01) return tl(`${t.sum} is c², the area of the big square. Take the square root: √${t.sum}${t.est ? ' ≈ ' + Math.round(t.c) : ' = ' + t.c}.`, `${t.sum} es c², el área del cuadrado grande. Saca la raíz cuadrada: √${t.sum}${t.est ? ' ≈ ' + Math.round(t.c) : ' = ' + t.c}.`);
    if (Math.abs(v - t.sum / 2) < 0.01) return tl(`A square root is not half. Find the number that times itself makes ${t.sum}.`, `Una raíz cuadrada no es la mitad. Halla el número que multiplicado por sí mismo da ${t.sum}.`);
    if (t.est) return tl(`${f}² = ${f * f} and ${f + 1}² = ${(f + 1) * (f + 1)}. ${t.sum} is closer to ${near * near}, so c ≈ ${near}.`, `${f}² = ${f * f} y ${f + 1}² = ${(f + 1) * (f + 1)}. ${t.sum} está más cerca de ${near * near}, así que c ≈ ${near}.`);
    return tl(`Check: c × c has to equal ${t.sum}. ${fmt(v)} × ${fmt(v)} = ${fmt(v * v)}.`, `Revisa: c × c tiene que dar ${t.sum}. ${fmt(v)} × ${fmt(v)} = ${fmt(v * v)}.`);
  }

  // Place every platform and anchor. Each problem's step platforms climb or drop evenly from where the last big swing
  // landed to its own canyon edge, which sits b below the canopy anchors. The big swing lands right under the anchor,
  // c below it - so the answer decides how high or low you swing.
  function layout(scale) {
    const kOf = p => typeof scale === 'function' ? scale(p) : scale;
    let x = 3, y = ANCHOR_Y + ledges[0].prob.b * kOf(ledges[0].prob), startY = y;
    for (const l of ledges) {
      l.x = x;
      if (l.final) { l.y = y; break; }
      const p = l.prob, K = kOf(p), last = p.steps.length - 1, edgeY = ANCHOR_Y + p.b * K;
      if (l.si === 0) startY = y;
      const levelAt = si => last ? startY + (edgeY - startY) * si / last : edgeY;
      l.y = levelAt(l.si);
      if (l.kind === 'canyon') { l.k = K; l.ax = x + p.a * K; l.ay = ANCHOR_Y; x = l.ax; y = ANCHOR_Y + p.c * K; }
      else { x += 2 * HOP_A; y = levelAt(l.si + 1); l.ax = l.x + HOP_A; l.ay = Math.min(l.y, y) - HOP_B; }
      l.nx = x; l.ny = y;                      // where this swing lands
      l.rope = Math.hypot(l.x - l.ax, l.y - l.ay);
    }
    // every swing ends standing on top of the next platform (in World 1 there are no steps between canyons,
    // so the next canyon's edge can sit higher or lower than the bottom of the swing - the rope reels to reach it)
    ledges.forEach((l, i) => { const n = ledges[i + 1]; if (n && !l.final) { l.nx = n.x; l.ny = n.y; } });
  }

  // results by skill (site-results.js): each step of the theorem, shown when a world is finished
  if (window.SiteResults) SiteResults.setup([{ id: 'countc', en: 'Counting squares on the rope', es: 'Contar cuadrados en la cuerda' }, { id: 'square', en: 'Squaring the sides', es: 'Elevar los lados al cuadrado' }, { id: 'add', en: 'Adding the squares (a² + b²)', es: 'Sumar los cuadrados (a² + b²)' }, { id: 'subtract', en: 'Subtracting to find a leg', es: 'Restar para hallar un cateto' }, { id: 'root', en: 'Taking the square root', es: 'Sacar la raíz cuadrada' }, { id: 'other', en: 'Other steps', es: 'Otros pasos' }]);
  const PY_SKILLS = ['countc', 'square', 'add', 'subtract', 'root'];
  function startGame(m) {
    if (window.SiteResults) SiteResults.reset();
    mode = m;
    const wi = WORLDS.findIndex(w => w.m === m);
    whereEl.innerHTML = tl(`World ${wi + 1} · ${WORLDS[wi].name}<small>${WORLDS[wi].short}</small>`, `Mundo ${wi + 1} · ${WORLDS[wi].name}<small>${WORLDS[wi].short}</small>`);
    problems = (m === 'w4' ? shuffle(PLAN[m].slice()) : PLAN[m]).map((type, i) => makeProblem(type, i));
    ledges = [];
    problems.forEach((p, pi) => {
      const last = p.steps.length - 1;
      p.steps.forEach((s, si) => { if (si < last) ledges.push({ kind: 'hop', prob: p, pi, si }); });
      // the last step is answered at the canyon edge, and the right answer is the big swing.
      // The canyon is a true scale drawing of the triangle (one scale per world), so bigger answers really are bigger swings.
      ledges.push({ kind: 'canyon', prob: p, pi, si: last });
    });
    ledges.push({ final: true });
    layout(WORLD_K[m]);
    idx = 0; score = 0; combo = 0; bestCombo = 0; perfects = 0; misses = 0;
    popups = []; parts = []; explain = null; cine = null; timeScale = 1;
    renderStrip();
    resetSwing(false);
    camX = P.x - viewW() * 0.18; camY = camTargetY();
    msgEl.textContent = '';
    refreshPanel();
  }

  function notebookTargets(p) {
    const done = new Set(p.steps.slice(0, p.done).map(s => s.key));
    const t = { sym: mode !== 'w1' || done.has('formula') ? 1 : 0, num: done.has('sub') ? 1 : 0, reveal: 1, aF: 0, bF: 0, pour: 0, side: done.has('root') || done.has('countc') ? 1 : 0, crumble: 0 };
    if (p.type === 'leg') { t.bF = done.has('square') ? 1 : 0; t.pour = t.bF; t.aF = done.has('subtract') ? 1 : 0; }
    else { t.aF = t.bF = done.has('square') ? 1 : 0; t.pour = done.has('add') ? 1 : 0; }
    return t;
  }

  function resetSwing(keepWrongs) {
    const l = cur();
    P.x = l.x; P.y = l.y; P.vx = P.vy = 0; P.rot = 0;
    rope = null; outcome = null; failKind = null; explain = null;
    state = 'aim'; st = 0; fray = 0;
    if (!keepWrongs) wrongs = new Set();
    if (!l.final) {
      const fresh = l.si === 0 && l.prob.done === 0;
      Object.assign(nbT, notebookTargets(l.prob));
      if (fresh) Object.assign(nb, nbT);
    }
  }

  function renderStrip() {
    if (mode === 'w3' || mode === 'w0') { stripEl.hidden = true; return; }
    stripEl.hidden = false;
    let h = tl('<span class="lbl">Perfect squares</span>', '<span class="lbl">Cuadrados perfectos</span>');
    for (let n = 1; n <= (mode === 'w4' ? 17 : 15); n++) h += `<span class="sq"><i>${n}²=</i>${n * n}</span>`;
    stripEl.innerHTML = h;
  }

  // ---------- panel ----------
  function refreshPanel() {
    const aiming = state === 'aim';
    endEl.hidden = state !== 'win';
    if (state === 'win') {
      workEl.innerHTML = '';
      promptEl.innerHTML = tl(`Temple reached! ${perfects} steps right, best combo x${bestCombo}, score ${score} (your best: ${store.get('best_score', score)}).`, `¡Llegaste al templo! ${perfects} pasos correctos, mejor combo x${bestCombo}, puntaje ${score} (tu récord: ${store.get('best_score', score)}).`);
      choicesEl.hidden = true;
      otherBtn.hidden = mode === 'w4';
      // keyboard players land on a button right away (the next world, or Play again after the last world)
      if (!screenOpen()) setTimeout(() => { if (state === 'win' && !screenOpen()) (otherBtn.hidden ? againBtn : otherBtn).focus({ preventScroll: true }); }, 60);
      nbCap.textContent = tl('Nice work. The next world gives you less help.', 'Buen trabajo. El siguiente mundo te da menos ayuda.');
      return;
    }
    const l = cur(), p = l.prob;
    // just the goal - the side lengths are all labeled on the picture (the problem number is on the game screen)
    const given = p.type === 'leg' ? tl(`Find the distance ${A('a')}, in feet.`, `Halla la distancia ${A('a')}, en pies.`) : tl(`Find the rope ${C('c')}, in feet.`, `Halla la cuerda ${C('c')}, en pies.`);
    workEl.innerHTML = `<li class="given">${given}</li>` + p.work.map(w => `<li class="done">${w}</li>`).join('');
    workEl.scrollTop = workEl.scrollHeight;
    if (state === 'explain') {
      promptEl.textContent = tl('Tap the game or press Enter to try that step again.', 'Toca el juego o presiona Enter para intentar ese paso otra vez.');
      choicesEl.hidden = true;
    } else {
      const s = p.steps[l.si];
      promptEl.textContent = `${tl("Step", "Paso")} ${l.si + 1} ${tl("of", "de")} ${p.steps.length} · ${s.name}${l.kind === 'canyon' ? (mode === 'w3' ? tl(' — open the temple door!', ' — ¡abre la puerta del templo!') : tl(' — the big swing!', ' — ¡el gran salto!')) : ''}`;
      choicesEl.hidden = false;
      choicesEl.innerHTML = '';
      if (s.typed) {   // World 2's last step: type the rope length
        const f = document.createElement('form');
        f.className = 'typed';
        f.innerHTML = s.typed.blank   // World 5: the blank sits right inside the line of math
          ? `<span class="blank-line">${s.typed.pre}<input id="typed-ans" inputmode="numeric" autocomplete="off" maxlength="6" aria-label="${tl('the missing number', 'el número que falta')}">${s.typed.post}</span><button class="btn" type="submit">${l.kind === 'canyon' ? tl('Swing!', '¡Salta!') : tl('Go!', '¡Va!')}</button>`
          : `<label for="typed-ans">${C('c')} ${s.typed.est ? '≈' : '='}</label><input id="typed-ans" inputmode="decimal" autocomplete="off" maxlength="6" aria-label="${tl('rope length c in feet', 'largo de la cuerda c en pies')}"><span>${FT.trim()}</span><button class="btn" type="submit">${tl('Swing!', '¡Salta!')}</button>`;
        const inp = f.querySelector('input');
        inp.disabled = !aiming; f.querySelector('button').disabled = !aiming;
        inp.addEventListener('input', () => { inp.value = inp.value.replace(/[^0-9.]/g, ''); });
        f.addEventListener('submit', e => { e.preventDefault(); submitTyped(inp); });
        choicesEl.appendChild(f);
        if (aiming && !screenOpen() && !matchMedia('(hover: none) and (pointer: coarse)').matches) setTimeout(() => inp.focus({ preventScroll: true }), 30);
      }
      choicesEl.classList.toggle('four', s.choices.length > 2);
      s.choices.forEach((ch, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn eq' + (wrongs.has(ch.label) ? ' wrong' : '');
        b.innerHTML = ch.html;
        b.disabled = !aiming || wrongs.has(ch.label);
        b.addEventListener('click', () => answer(ch));
        choicesEl.appendChild(b);
      });
    }
    nbCap.textContent = caption(l);
  }

  function caption(l) {
    const p = l.prob;
    if (state === 'explain') return tl('Look at the canyon: the two small squares fill the big one exactly.', 'Mira el cañón: los dos cuadrados pequeños llenan exactamente el grande.');
    if (mode === 'w2') return '';   // World 3: no step hints
    const k = p.steps[l.si].key;
    if (k === 'countc') return tl('Count the blue squares along the rope.', 'Cuenta los cuadrados azules a lo largo de la cuerda.');
    if (k === 'formula') return tl('The two small squares fill the big one.', 'Los dos cuadrados pequeños llenan el grande.');
    if (k === 'sub') return tl('Use the side lengths on the picture.', 'Usa las longitudes de los lados del dibujo.');
    if (k === 'square') return tl('Area = side × side.', 'Área = lado × lado.');
    if (k === 'add') return tl('Pour both squares into the big one.', 'Vierte ambos cuadrados en el grande.');
    if (k === 'subtract') return tl('Big square − small square.', 'Cuadrado grande − cuadrado pequeño.');
    return p.type === 'est' ? tl(`Which two squares is ${p.sum} between?`, `¿Entre qué dos cuadrados está ${p.sum}?`) : tl('Side = √ area.', 'Lado = √ área.');
  }

  // ---------- actions ----------
  function answer(ch) {
    if (state !== 'aim') return;
    audio();
    const l = cur(); if (l.final || wrongs.has(ch.label)) return;
    const p = l.prob, s = p.steps[l.si];
    guess = ch; aimTime = st;
    if (window.SiteResults) SiteResults.record(PY_SKILLS.indexOf(s.key) >= 0 ? s.key : 'other', !!ch.ok);
    if (ch.ok) {
      p.work.push(s.line);
      p.done = l.si + 1;
      Object.assign(nbT, notebookTargets(p));
      if (l.kind === 'canyon') nbT.crumble = 1;   // job done: the squares fall away (or the door slides open)
      if (s.key === 'add' || (s.key === 'square' && p.type === 'leg')) sfx.pour(); else sfx.step();
      msgEl.textContent = '';
      fire(true);
    } else {
      wrongs.add(ch.label); combo = 0;
      msgEl.innerHTML = radHTML(ch.hint);
      fire(false);
    }
    refreshPanel();
  }

  // a typed answer (World 2's last step) is checked like a choice: exact for a whole-number rope, nearest foot for an estimate
  function submitTyped(inp) {
    if (state !== 'aim') return;
    const l = cur(), t = l.prob.steps[l.si].typed, v = parseFloat(inp.value);
    if (!t) return;
    if (!isFinite(v)) { inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); inp.focus(); return; }
    if (t.blank) {   // World 5: exactly the missing number
      const ok = Math.abs(v - t.ans) < 0.01;
      answer({ label: 'typed ' + v, html: fmt(v), ok, hint: ok ? '' : t.why(v) });
      return;
    }
    const ok = t.est ? Math.abs(v - t.c) <= 0.5 : Math.abs(v - t.c) < 0.01;
    answer({ label: 'typed ' + v, html: `c = ${fmt(v)}${FT}`, ok, hint: ok ? '' : typedHint(t, v) });
  }

  // World 2's fraying rope: each step has a time limit; run out and the rope snaps (you redo the step)
  let fray = 0;
  // typed answers get 25 s; answer choices get 20 s on problem 1, then 3 s less on each problem after (20, 17, 14, 11)
  const timedWorld = () => mode === 'w2' || mode === 'w3';   // Worlds 3 and 4 race the fraying rope
  const frayLimit = () => { const l = cur(); if (!l || l.final) return 20; return l.prob.steps[l.si].typed ? 25 : Math.max(5, 20 - 3 * l.pi); };
  const frayEl = document.createElement('div');
  frayEl.className = 'fray'; frayEl.hidden = true; frayEl.innerHTML = '<i></i><span></span>';
  choicesEl.parentNode.insertBefore(frayEl, choicesEl);
  function snap() {
    combo = 0; misses++;
    guess = { hint: tl('Too slow - the rope frayed and snapped! Try that step again a little faster.', 'Muy lento - ¡la cuerda se deshilachó y se rompió! Intenta ese paso otra vez un poco más rápido.') };
    msgEl.textContent = guess.hint;
    fire(false, 'snap');
    refreshPanel();
  }
  function renderFray() {
    const l = cur(), on = timedWorld() && state === 'aim' && l && !l.final;
    frayEl.hidden = !on;
    if (!on) return;
    const left = Math.max(0, frayLimit() - fray), k = left / frayLimit();
    frayEl.firstChild.style.width = (k * 100).toFixed(1) + '%';
    frayEl.classList.toggle('low', k < 0.3);
    frayEl.lastChild.textContent = tl(`Rope frays in ${Math.ceil(left)}s`, `La cuerda se rompe en ${Math.ceil(left)} s`);
  }

  function fire(ok, kind) {
    const l = cur(); const c = l.rope; const A = anchorOf(l);
    failKind = ok ? null : (kind || 'miss');
    outcome = ok ? 'perfect' : 'short';
    P0 = { x: P.x, y: P.y };
    const dx = A.x - P.x, dy = A.y - P.y, dl = Math.hypot(dx, dy);
    rope = { len: 0, max: ok ? c : c * 0.55, dir: { x: dx / dl, y: dy / dl }, tip: { x: P.x, y: P.y, vx: 0, vy: 0 }, phase: 'extend' };
    if (!ok) { P.vx = 5; P.vy = -8; }
    state = 'fire'; st = 0;
    if (ok) sfx.whoosh(); else sfx.thwip();   // the sparkle whoosh is saved for a right answer
  }

  againBtn.addEventListener('click', () => startGame(mode));
  otherBtn.addEventListener('click', () => startGame({ w0: 'w1', w1: 'w2', w2: 'w3', w3: 'w4' }[mode] || 'w4'));
  cvs.addEventListener('pointerdown', () => { audio(); if (state === 'explain' && st > 0.4) retry(); });
  // ---------- title screen and world map ----------
  const titleScreen = document.getElementById('title-screen'), mapScreen = document.getElementById('map-screen');
  const trailEl = document.getElementById('trail'), mapBack = document.getElementById('map-back'), wcGo = document.getElementById('wc-go');
  const NODE_POS = [[11, 80], [31, 58], [51, 72], [71, 44], [89, 20]];   // % across / down the trail, climbing to the summit
  let mapSel = 0, mapFrom = 'title';
  const screenOpen = () => !titleScreen.hidden || !mapScreen.hidden;
  const setInert = on => document.querySelectorAll('.app > header, .app > .main').forEach(el => { el.inert = on; });
  const nodes = WORLDS.map((w, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'node'; b.setAttribute('role', 'option');
    b.style.left = NODE_POS[i][0] + '%'; b.style.top = NODE_POS[i][1] + '%';
    b.innerHTML = `<span class="me" aria-hidden="true">🧗</span><span class="num" style="background:${SKIES[w.m][0]}">${i + 1}</span>` +
      `<span class="plank" aria-hidden="true"></span><span class="nname">${w.name}</span>`;
    b.addEventListener('click', () => { if (mapSel === i) startWorld(i); else selectWorld(i, true); });
    trailEl.appendChild(b);
    if (i === WORLDS.length - 1) { const f = document.createElement('span'); f.className = 'flag'; f.textContent = '🚩'; f.setAttribute('aria-hidden', 'true'); f.style.left = (NODE_POS[i][0] + 4) + '%'; f.style.top = (NODE_POS[i][1] - 9) + '%'; trailEl.appendChild(f); }
    return b;
  });
  function selectWorld(i, focus) {
    mapSel = Math.max(0, Math.min(WORLDS.length - 1, i));
    const w = WORLDS[mapSel], done = store.get('worlds_done', []).includes(w.m);
    nodes.forEach((b, j) => { b.classList.toggle('sel', j === mapSel); b.setAttribute('aria-selected', String(j === mapSel)); });
    document.getElementById('world-card').style.setProperty('--wc', SKIES[w.m][3]);
    document.getElementById('wc-kicker').textContent = tl(`World ${mapSel + 1} of ${WORLDS.length}`, `Mundo ${mapSel + 1} de ${WORLDS.length}`);
    document.getElementById('wc-name').textContent = w.name;
    document.getElementById('wc-blurb').textContent = w.blurb;
    document.getElementById('wc-chips').innerHTML = w.chips.map(c => `<span>${c}</span>`).join('');
    document.getElementById('wc-sample').innerHTML = w.sample;
    const prog = document.getElementById('wc-progress');
    prog.textContent = done ? tl('✓ Finished - play it again any time', '✓ Terminado - juégalo otra vez cuando quieras') : mapSel === 0 ? tl('Start here!', '¡Empieza aquí!') : tl('Not finished yet', 'Aún sin terminar');
    prog.classList.toggle('won', done);
    wcGo.textContent = tl(`Start World ${mapSel + 1} ▶`, `Empezar mundo ${mapSel + 1} ▶`);
    if (focus) nodes[mapSel].focus({ preventScroll: true });
  }
  function refreshMapMarks() {
    const done = store.get('worlds_done', []);
    nodes.forEach((b, i) => {
      let mark = b.querySelector('.done');
      if (done.includes(WORLDS[i].m) && !mark) { mark = document.createElement('span'); mark.className = 'done'; mark.textContent = '✓'; mark.setAttribute('aria-label', 'finished'); b.appendChild(mark); }
    });
  }
  function showTitle() {
    const done = store.get('worlds_done', []).length, best = store.get('best_score', 0);
    document.getElementById('title-stats').textContent = done || best ? tl(`Worlds finished: ${done} / ${WORLDS.length}`, `Mundos terminados: ${done} / ${WORLDS.length}`) + (best ? tl(` · Best score ${best}`, ` · Mejor puntaje ${best}`) : '') : '';
    mapScreen.hidden = true; titleScreen.hidden = false; setInert(true);
    document.getElementById('title-start').focus({ preventScroll: true });
  }
  function showMap(from) {
    mapFrom = from;
    mapBack.innerHTML = from === 'game' ? tl('&larr; Back to the game', '&larr; Volver al juego') : tl('&larr; Title', '&larr; Título');
    refreshMapMarks();
    // start on the world being played, or else the first one not finished yet
    const done = store.get('worlds_done', []);
    const next = WORLDS.findIndex(w => !done.includes(w.m));
    selectWorld(from === 'game' ? WORLDS.findIndex(w => w.m === mode) : next < 0 ? 0 : next, false);
    titleScreen.hidden = true; mapScreen.hidden = false; setInert(true);
    nodes[mapSel].focus({ preventScroll: true });
  }
  // ---------- the title screen's explorer: a real pendulum ----------
  // The rope swings under gravity (angle'' = -k·sin(angle)), so it speeds up on the way down and slows as it climbs.
  // The explorer leans back, pushes off one platform with just enough speed to reach the other, and lands. The body
  // hangs from one hand and follows the rope like a spring with damping, so it trails through the swing, and on
  // landing it keeps some of its momentum and sways before settling upright.
  const tRope = titleScreen.querySelector('.swing'), tBody = titleScreen.querySelector('.swinger');
  let tFace = titleScreen.querySelector('.char[data-char="explorer"] .face');
  const T_ENDS = [-28.75 * Math.PI / 180, 53.64 * Math.PI / 180];   // rope angles that put the feet on each plank
  const T_K = 4.2;                                                  // gravity / rope length
  const T_STAND = 1.6, T_CROUCH = 0.4;                              // seconds on a platform; the lean before pushing off
  const tsw = { th: T_ENDS[0], om: 0, phi: 0, phv: 0, at: 0, state: 'stand', t: 0.5, lookLeft: true };
  function titleTick(dt) {
    if (reduceMotion) return;
    const s = tsw, dir = s.at === 0 ? 1 : -1;
    let phiGoal = 0;
    if (s.state === 'stand') {
      s.t += dt;
      if (s.t > T_STAND - T_CROUCH) phiGoal = -0.16 * dir;   // lean back, ready to push off
      if (s.t >= T_STAND) {
        const a = T_ENDS[s.at], b = T_ENDS[1 - s.at];
        // just enough speed to climb to the far platform, plus a little, so it arrives still moving
        s.om = dir * Math.sqrt(0.16 + Math.max(0, 2 * T_K * (Math.cos(a) - Math.cos(b))));
        s.state = 'swing';
      }
    } else {
      const n = Math.ceil(dt / 0.004), h = dt / n;   // small steps keep the motion smooth on a slow frame
      for (let i = 0; i < n && s.state === 'swing'; i++) {
        s.om += -T_K * Math.sin(s.th) * h;
        s.th += s.om * h;
        const goal = T_ENDS[1 - s.at];
        if ((s.om > 0 && s.th >= goal) || (s.om < 0 && s.th <= goal)) {   // landed: the body carries on a little
          s.th = goal; s.phv += s.om * 0.9; s.om = 0; s.at = 1 - s.at; s.state = 'stand'; s.t = 0;
        }
      }
      if (s.state === 'swing') phiGoal = 0.45 * s.th;   // hanging from the hand, the body leans with the rope
    }
    s.phv += (55 * (phiGoal - s.phi) - 8 * s.phv) * dt;
    s.phi += s.phv * dt;
    const deg = r => (r * 180 / Math.PI).toFixed(2);
    // look toward the next platform: where the swing is going, and after landing (a moment later) back the other way
    const lookLeft = s.state === 'swing' ? s.om > 0 : (s.t < 0.35 ? s.at === 1 : s.at === 0);
    if (lookLeft !== s.lookLeft) { s.lookLeft = lookLeft; tFace.setAttribute('transform', lookLeft ? tFace.dataset.mirror : ''); }
    tRope.setAttribute('transform', `rotate(${deg(s.th)} 832 0)`);
    tBody.setAttribute('transform', `rotate(${deg(s.phi - s.th)} 832 179)`);
  }
  // ---------- choose your swinger: the safari explorer or the monkey buddy (saved on this device) ----------
  let character = 'explorer';
  const pickBtns = [...titleScreen.querySelectorAll('.t-pick button')];
  function setCharacter(c, focus) {
    character = c === 'monkey' ? 'monkey' : 'explorer';
    store.set('character', character);
    pickBtns.forEach(b => {
      const on = b.dataset.char === character;
      b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    titleScreen.querySelectorAll('.title-scene .char').forEach(g => { g.style.display = g.dataset.char === character ? '' : 'none'; });
    tFace = titleScreen.querySelector(`.title-scene .char[data-char="${character}"] .face`);
    tsw.lookLeft = undefined;   // re-aim the new face on the next frame
    tFace.setAttribute('transform', tFace.dataset.mirror);
  }
  pickBtns.forEach(b => b.addEventListener('click', () => { audio(); setCharacter(b.dataset.char, true); }));
  setCharacter(store.get('character', 'explorer'), false);
  function hideScreens() { titleScreen.hidden = true; mapScreen.hidden = true; setInert(false); last = performance.now(); }
  function startWorld(i) { audio(); hideScreens(); startGame(WORLDS[i].m); }
  document.getElementById('title-start').addEventListener('click', () => { audio(); showMap('title'); });
  titleScreen.addEventListener('click', e => { if (!e.target.closest('button')) { audio(); showMap('title'); } });
  mapBack.addEventListener('click', () => { if (mapFrom === 'game') hideScreens(); else showTitle(); });
  wcGo.addEventListener('click', () => startWorld(mapSel));
  document.getElementById('map-btn').addEventListener('click', () => showMap('game'));
  document.getElementById('map-end-btn').addEventListener('click', () => showMap('game'));
  // keys on the two screens: the title starts with Enter / Space; the map walks the trail with the arrows (or 1-5)
  document.addEventListener('keydown', e => {
    if (window.isPageControlKey && window.isPageControlKey(e)) return;   // keys for the page's own controls (All games, Fullscreen, notes...)
    if (!screenOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    const onBtn = e.target && e.target.tagName === 'BUTTON';
    if (!titleScreen.hidden) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {   // switch swinger
        e.preventDefault();
        setCharacter(character === 'explorer' ? 'monkey' : 'explorer', !!(e.target.closest && e.target.closest('.t-pick')));
      }
      if ((e.key === 'Enter' || e.key === ' ') && !onBtn) { e.preventDefault(); audio(); showMap('title'); }
      e.stopImmediatePropagation();
      return;
    }
    const dir = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (dir) { e.preventDefault(); selectWorld(mapSel + dir, true); }
    else if (/^[1-5]$/.test(e.key)) selectWorld(+e.key - 1, true);
    else if (e.key === 'Escape') { e.preventDefault(); if (mapFrom === 'game') hideScreens(); else showTitle(); }
    else if ((e.key === 'Enter' || e.key === ' ') && !onBtn) { e.preventDefault(); startWorld(mapSel); }
    e.stopImmediatePropagation();   // the game underneath doesn't see keys meant for the map
  }, true);

  document.addEventListener('keydown', e => {
    if (window.isPageControlKey && window.isPageControlKey(e)) return;   // keys for the page's own controls (All games, Fullscreen, notes...)
    if (e.key === 'Escape' && !helpEl.hidden) {   // the How-to-play panel closes from the keyboard too
      helpEl.hidden = true; helpBtn.setAttribute('aria-expanded', 'false'); helpBtn.focus(); return;
    }
    if (e.target && e.target.closest && e.target.closest('.reset-progress, .teaching-notes, .standards-panel')) return;   // leave page controls alone
    if (e.key === 'Escape' && state !== 'explain') { e.preventDefault(); showMap('game'); return; }   // Esc in a world opens the World Map
    if (state === 'win') {   // world finished: the arrow keys move between Play again / Next world / World map, Enter or Space picks
      const btns = [...endEl.querySelectorAll('button')].filter(b => !b.hidden);
      const dir = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
      const at = btns.indexOf(document.activeElement);
      if (dir && btns.length) { e.preventDefault(); btns[at < 0 ? 0 : (at + dir + btns.length) % btns.length].focus(); }
      else if ((e.key === 'Enter' || e.key === ' ') && at < 0 && btns.length) { e.preventDefault(); btns[0].click(); }
      return;
    }
    if (state === 'explain' && st > 0.4 && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); retry(); return; }
    if (e.target && e.target.id === 'typed-ans') return;   // typing the rope length
    const l = cur(), s = state === 'aim' && l && !l.final ? l.prob.steps[l.si] : null;
    if (!s || s.typed) return;
    const n = s.choices.length;
    // number keys pick an answer directly (1 = first); with two answers the left/right arrows pick,
    // with more the arrow keys move between the answers and Enter picks
    let pickIdx = { '1': 0, '2': 1, '3': 2, '4': 3 }[e.key];
    if (pickIdx === undefined && n === 2) pickIdx = { ArrowLeft: 0, ArrowRight: 1 }[e.key];
    if (pickIdx !== undefined && pickIdx < n) {
      e.preventDefault();
      const ch = s.choices[pickIdx];
      if (ch && !wrongs.has(ch.label)) answer(ch);
      return;
    }
    // four answers sit in a 2 x 2 grid: each arrow key moves to the answer in that direction (up goes up, and so on)
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (dir && n > 2) {
      e.preventDefault();
      const btns = [...choicesEl.querySelectorAll('button:not(:disabled)')];
      const cur = btns.indexOf(document.activeElement);
      if (cur < 0) { if (btns[0]) btns[0].focus(); return; }
      const box = b => { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
      const from = box(btns[cur]);
      let best = null, bestScore = Infinity;
      btns.forEach((b, i) => {
        if (i === cur) return;
        const to = box(b), along = (to.x - from.x) * dir[0] + (to.y - from.y) * dir[1];
        const across = Math.abs(dir[0] ? to.y - from.y : to.x - from.x);
        if (along <= 4) return;                       // only answers that really are in that direction
        const score = along + across * 3;
        if (score < bestScore) { bestScore = score; best = b; }
      });
      if (best) best.focus();
    }
  });

  function retry() { resetSwing(true); msgEl.textContent = ''; refreshPanel(); }

  function popup(text, x, y, color, size = 1) { popups.push({ text, x, y, t: 0, color, size }); }
  function burst(x, y, colors, n, speed = 8) {
    if (reduceMotion) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = speed * (0.3 + Math.random());
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4, life: 0.6 + Math.random() * 0.6, t: 0, c: colors[i % colors.length], r: 0.12 + Math.random() * 0.14 });
    }
  }

  // A swing is an arc around the anchor, from where you stand to where you land (the rope lets out or reels in a little
  // on the small hops between platforms at different heights). The big swing starts from rest and speeds up toward the
  // bottom of the arc, straight under the anchor, like a real pendulum.
  function startSwing() {
    const l = cur(), A = anchorOf(l), big = l.kind === 'canyon';
    const th0 = Math.atan2(P.x - A.x, P.y - A.y), th1 = Math.atan2(l.nx - A.x, l.ny - A.y);
    const r0 = Math.hypot(P.x - A.x, P.y - A.y), r1 = Math.hypot(l.nx - A.x, l.ny - A.y);
    rope.phase = 'attached'; rope.R = r0;
    rope.kin = { A, th0, th1, r0, r1, u: 0, T: big ? 1.1 + 0.035 * r0 : 0.55 + 0.03 * r0, big };
    state = 'swing'; st = 0;
    if (big) startCine(l);
  }

  function land() {
    const l = cur();
    state = 'land'; st = 0; landFrom = { x: P.x, y: P.y };
    rope = null;
    const lx = l.nx, ly = l.ny;
    if (l.kind === 'canyon') {
      combo++; bestCombo = Math.max(bestCombo, combo); perfects++;
      const pts = 200 + 10 * (combo - 1);
      score += pts;
      popup(tl(`+${pts}  Canyon crossed!`, `+${pts}  ¡Cañón cruzado!`), lx, ly - 1.4, '#f2b530', 1.2);
      burst(lx, ly, ['#f2b530', '#fff1b8', '#7ccf6b', '#e0734a'], 30, 10);
      sfx.win();
      return;
    }
    combo++; bestCombo = Math.max(bestCombo, combo); perfects++;
    const fast = aimTime < 2 ? 50 : aimTime < 4 ? 20 : 0;
    const pts = 50 + 10 * (combo - 1) + fast;
    score += pts;
    popup(`+${pts}`, lx, ly - 1.2, '#f2b530', 0.95);
    if (combo >= 3 && combo % 3 === 0) popup(`Combo x${combo}`, lx, ly - 2.4, '#ffffff', 0.85);
    burst(lx, ly, ['#f2b530', '#fff1b8'], 8, 5);
    sfx.perfect();
  }

  function fail() {
    const l = cur(), p = l.prob, s = p.steps[l.si];
    misses++; combo = 0;
    const snapped = failKind === 'snap';   // a snapped rope is about speed, so it doesn't give the answer away
    explain = { title: snapped ? tl('Too slow! The rope snapped.', '¡Muy lento! Se rompió la cuerda.') : tl('Wrong step! The rope missed.', '¡Paso equivocado! La cuerda falló.'), hint: guess && guess.hint ? guess.hint : '',
      work: snapped ? tl('You get a fresh rope - same step.', 'Tienes una cuerda nueva - mismo paso.') : tl(`Right step: ${plain(s.line)}`, `Paso correcto: ${plain(s.line)}`), full: '' };
    state = 'explain'; st = 0;
    refreshPanel();
    // the explanation is drawn on the game; a screen reader hears it too
    if (window.SiteSR) SiteSR.say([explain.title, explain.hint, explain.work, tl('Press Enter to try that step again.', 'Presiona Enter para intentar ese paso otra vez.')].filter(Boolean).map(function (t) { return plain(String(t).replace(/<span class="rad"[^>]*aria-label="([^"]*)"[^>]*>.*?<span class="ri">.*?<\/span><\/span>/g, ' $1 ')); }).join(' '));
  }

  // ---------- update ----------
  function update(dt) {
    st += dt;
    if (timedWorld() && state === 'aim' && cur() && !cur().final && (fray += dt) >= frayLimit()) snap();   // the fraying rope
    const l = cur();
    const A = l && !l.final ? anchorOf(l) : null;

    if (state === 'fire') {
      rope.len = Math.min(rope.max, rope.len + ROPE_SPEED * dt);
      if (outcome === 'short') {
        P.vy += GRAV * dt; P.x += P.vx * dt; P.y += P.vy * dt;
        if (rope.phase === 'extend') {
          rope.tip.x = P0.x + rope.dir.x * rope.len; rope.tip.y = P0.y + rope.dir.y * rope.len;
          if (rope.len >= rope.max) {
            rope.phase = 'limp'; rope.tip.vx = rope.dir.x * 3; rope.tip.vy = 0;
            popup(failKind === 'snap' ? tl('Snapped!', '¡Se rompió!') : failKind === 'miss' ? tl('Missed!', '¡Falló!') : tl('Too short!', '¡Muy corta!'), rope.tip.x, rope.tip.y - 0.8, '#ffd0c0'); sfx.miss();
          }
        } else {
          rope.tip.vy += GRAV * dt; rope.tip.x += rope.tip.vx * dt; rope.tip.y += rope.tip.vy * dt;
        }
        if (P.y + BODY > SAND_Y) { state = 'sink'; st = 0; burst(P.x, SAND_Y, ['#e0c07a', '#b98f4f'], 16, 6); sfx.splash(); shake = 0.3; }
      } else {
        rope.tip.x = P0.x + rope.dir.x * rope.len; rope.tip.y = P0.y + rope.dir.y * rope.len;
        if (rope.len >= rope.max) { sfx.clack(); startSwing(); }
      }
    } else if (state === 'swing') {
      const k = rope.kin;
      k.u = Math.min(1, k.u + dt / k.T);
      // the big swing starts from rest and is fastest at the bottom; the small hops ease in and out
      const e = k.big ? 1 - Math.cos(k.u * Math.PI / 2) : (1 - Math.cos(k.u * Math.PI)) / 2;
      const th = k.th0 + (k.th1 - k.th0) * e, r = k.r0 + (k.r1 - k.r0) * e;
      rope.R = r;
      P.x = k.A.x + r * Math.sin(th); P.y = k.A.y + r * Math.cos(th); P.rot = -th * 0.8;
      if (k.u >= 1) land();
    } else if (state === 'land') {
      const k = Math.min(1, st / 0.18), e = 1 - (1 - k) * (1 - k);
      const L = { x: l.nx, y: l.ny };
      P.x = landFrom.x + (L.x - landFrom.x) * e; P.y = landFrom.y + (L.y - landFrom.y) * e; P.rot *= (1 - k);
      if (st > 0.32) {
        idx++;
        if (cur().final) {
          state = 'win'; st = 0; P.x = cur().x; P.y = cur().y; P.rot = 0;
          saveWin();
          if (window.SiteResults) setTimeout(() => SiteResults.show({ title: tl('World results', 'Resultados del mundo') }), 1600);
          burst(cur().x + 2.5, cur().y - 1, ['#f2b530', '#fff1b8', '#e0734a', '#7ccf6b'], 50, 12);
          sfx.win();
        } else resetSwing(false);
        refreshPanel();
      }
    } else if (state === 'hurt') {
      P.vy += GRAV * dt; P.x += P.vx * dt; P.y += P.vy * dt; P.rot += dt * 6;
      if (rope) rope.phase = 'limp-attached';
      if (P.y + BODY > SAND_Y) { P.y = SAND_Y - BODY; state = 'sink'; st = 0; burst(P.x, SAND_Y, ['#e0c07a', '#b98f4f'], 12, 5); sfx.splash(); }
    } else if (state === 'sink') {
      P.y += dt * 1.4;
      if (st > 0.7) fail();
    } else if (state === 'explain') {
      if (st > 8) retry();
    }

    parts.forEach(p => { p.t += dt; p.vy += 25 * dt; p.x += p.vx * dt; p.y += p.vy * dt; });
    parts = parts.filter(p => p.t < p.life);
    popups.forEach(p => p.t += dt);
    popups = popups.filter(p => p.t < 1.6);
  }

  // ---------- camera (runs on real time, so it keeps moving smoothly during slow motion) ----------
  // keep the explorer and the canyon figure in view together, zooming out for big triangles; follow a fall into the quicksand
  function figBounds() {
    const L = figureLedge(); if (!L) return null;
    if (mode === 'w0') { const r = rowBounds(L, 1.2); r.bot = Math.max(r.bot, L.ny + BODY + 1.2); return r; }
    const p = L.prob, kk = L.k;
    return { left: L.x - p.b * kk - 0.6, right: L.x + (p.a + Math.max(p.a, p.b)) * kk + 0.6, top: L.y - (p.a + p.b) * kk - 0.6, bot: Math.max(L.y + p.a * kk, L.ny + BODY) + 0.5 };
  }
  // World 1 draws just a row of unit squares along each side, so its figure is much smaller than the big squares
  function rowBounds(L, pad) {
    const p = L.prob, kk = L.k;
    return { left: L.x - (p.b / p.c) * kk - pad - 1, right: L.x + (p.a + 1) * kk + pad, top: L.y - (p.b + p.a / p.c) * kk - pad - 0.6, bot: Math.max(L.y + kk, L.ny + BODY) + pad + 0.6 };   // (down to the landing platform too)
  }
  function cineBounds() {
    const t = cine.tri;
    return { left: t.x0 - 2.4, right: t.ax + 3.4, top: t.ay - 2.4, bot: t.y0 + 3.4 };
  }
  // Counting steps: frame just the square being counted, close up, so its grid squares are big and easy to count
  // (the first world counts along the rope's tilted square; World 3 counts along one leg's square)
  function countBounds() {
    const l = cur(); if ((mode !== 'w2' && mode !== 'w0') || !l || l.final || (state !== 'aim' && state !== 'explain')) return null;
    const p = l.prob, key = p.steps[l.si].key, L = figureLedge(), kk = L.k;
    if (key === 'countc') return rowBounds(L, 1.6);
    if (key !== 'count') return null;
    if (p.count === 'a') return { left: L.x - 2, right: L.x + p.a * kk + 2, top: L.y - 2.6, bot: L.y + p.a * kk + 1.6 };
    return { left: L.ax - 3.8, right: L.ax + p.b * kk + 1.6, top: L.ay - 1.8, bot: L.y + 1.8 };
  }
  const fitZoom = (b, lo, hi) => { const z = Math.min(hi, H / ((b.bot - b.top) * baseS), W / ((b.right - b.left) * baseS)); return isFinite(z) ? Math.max(lo, z) : 1; };
  function zoomTarget() {
    if (cine && cine.t < CINE.out) return fitZoom(cineBounds(), 0.6, 2.4);   // the slow-motion close-up
    const cb = countBounds(); if (cb) return fitZoom(cb, 0.8, 1.9);
    const f = focusBounds();
    const busy = state === 'aim' || state === 'fire' || state === 'explain' || state === 'swing';
    return f && busy ? fitZoom(f, 0.5, 1.8) : 1;   // as close as the squares and the explorer allow - no room for the platforms ahead
  }
  // what the camera frames while a problem is being solved: the canyon's squares plus the explorer, and nothing further on
  function focusBounds() {
    const f = figBounds(); if (!f) return null;
    return { left: Math.min(f.left, P.x - 1.6), right: Math.max(f.right, P.x + 1.6), top: Math.min(f.top, P.y - 1.6), bot: Math.max(f.bot, P.y + 2.2) };
  }
  function camTargetX() {
    const vw = viewW();
    if (cine && cine.t < CINE.out) { const b = cineBounds(); return (b.left + b.right) / 2 - vw / 2; }
    const cb = countBounds(); if (cb) return (cb.left + cb.right) / 2 - vw / 2;
    const f = figBounds();
    let t = P.x - vw * 0.18;
    if (f && (state === 'aim' || state === 'fire' || state === 'explain')) {
      const b = focusBounds();   // keep the squares and the explorer centered
      t = (b.left + b.right) / 2 - vw / 2;
    }
    return Math.max(0, t);
  }
  function camTargetY() {
    if (cine && cine.t < CINE.out) { const b = cineBounds(); return (b.top + b.bot) / 2 - viewH / 2; }
    const cb = countBounds(); if (cb) return (cb.top + cb.bot) / 2 - viewH / 2;
    const f = figBounds();
    let t = P.y - viewH * 0.62;
    if (f && state !== 'swing' && state !== 'land') t = f.bot - f.top > viewH ? f.top : (f.top + f.bot) / 2 - viewH / 2;
    t = Math.max(t, P.y + 3 - viewH);
    t = Math.min(t, P.y - 2.5);
    return Math.min(Math.max(-3, t), SAND_Y + 1.8 - viewH);
  }
  function updateCamera(dt) {
    // if the camera ever ended up with a bad value (e.g. set before the game box had a size), snap it back into place
    if (!isFinite(zoom)) { zoom = 1; applyZoom(); }
    if (!isFinite(camX) || !isFinite(camY)) { camX = camTargetX(); camY = camTargetY(); }
    const kz = 1 - Math.exp(-dt * 3);
    zoom += (zoomTarget() - zoom) * kz; applyZoom();
    const k = 1 - Math.exp(-dt * 3.5);
    camX += (camTargetX() - camX) * k;
    camY += (camTargetY() - camY) * k;
    shake = Math.max(0, shake - dt);
  }

  // ---------- drawing ----------
  const sx = x => (x - camX) * S, sy = y => (y - camY) * S;
  function blob(x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
  function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

  function drawSky(time) {
    const sk = SKIES[mode];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, sk[0]); g.addColorStop(0.7, sk[1]); g.addColorStop(1, sk[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // sun
    ctx.fillStyle = 'rgba(255,248,210,0.7)';
    ctx.beginPath(); ctx.arc(W * 0.78, H * 0.28, S * 2.4, 0, TAU); ctx.fill();
    layer(0.15, 7, 17, sk[2], 3, 7, 1.6, 2.6, 11);
    layer(0.4, 5.5, 21, sk[3], 4, 9, 1.8, 2.8, 37);
  }
  function layer(f, spacing, baseY, color, hMin, hMax, rMin, rMax, seed) {
    const off = camX * f, start = Math.floor(off / spacing) - 2, n = Math.ceil(viewW() / spacing) + 5;
    ctx.fillStyle = color;
    ctx.fillRect(0, sy(baseY), W, H - sy(baseY));
    ctx.beginPath();
    for (let i = start; i < start + n; i++) {
      const x = (i * spacing + rnd(i * 3 + seed) * spacing * 0.6 - off) * S;
      const h = hMin + (hMax - hMin) * rnd(i * 7 + seed), r = (rMin + (rMax - rMin) * rnd(i * 11 + seed)) * S;
      const top = sy(baseY - h);
      ctx.rect(x - 0.22 * S, top, 0.44 * S, sy(baseY) - top);
      blob(x, top, r); blob(x - r * 0.75, top + r * 0.4, r * 0.72); blob(x + r * 0.75, top + r * 0.35, r * 0.78);
    }
    ctx.fill();
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(20,50,30,0.07)'; ctx.lineWidth = 1;
    ctx.beginPath();
    const x0 = Math.floor(camX);
    for (let x = x0; x <= x0 + viewW() + 1; x++) { ctx.moveTo(sx(x), 0); ctx.lineTo(sx(x), sy(SAND_Y)); }
    for (let y = 1; y < SAND_Y; y++) { ctx.moveTo(0, sy(y)); ctx.lineTo(W, sy(y)); }
    ctx.stroke();
  }

  function drawCanopy() {
    const start = Math.floor(camX / 1.6) - 2, n = Math.ceil(viewW() / 1.6) + 4;
    ctx.fillStyle = '#2e6b3f'; ctx.beginPath();
    for (let i = start; i < start + n; i++) blob(sx(i * 1.6 + rnd(i) * 0.6), sy(0.2 + rnd(i + 5) * 0.7), (1.1 + rnd(i + 9) * 0.6) * S);
    ctx.fill();
    ctx.fillStyle = '#3f8a52'; ctx.beginPath();
    for (let i = start; i < start + n; i++) blob(sx(i * 1.6 + 0.5 + rnd(i + 2) * 0.4), sy(0.1 + rnd(i + 7) * 0.4), (0.7 + rnd(i + 4) * 0.4) * S);
    ctx.fill();
  }

  function drawAnchors(time) {
    const now = cur();
    ledges.forEach((l, i) => {
      if (l.final) return;
      if (!now.final && l.pi > now.pi) return;     // later problems' vines stay hidden so the canyon figure reads clearly
      const A = anchorOf(l);
      if (sx(A.x) < -60 || sx(A.x) > W + 60) return;
      ctx.strokeStyle = '#356e36'; ctx.lineWidth = 0.16 * S; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx(A.x), sy(0.6));
      ctx.quadraticCurveTo(sx(A.x + 0.5), sy((A.y + 0.6) / 2), sx(A.x), sy(A.y - 0.35)); ctx.stroke();
      // leaves on vine
      ctx.fillStyle = '#4f9a4a';
      for (let k = 1; k < A.y - 0.5; k += 1.3) { ctx.beginPath(); ctx.ellipse(sx(A.x + (k % 2 ? 0.3 : -0.1) + 0.2), sy(k), 0.28 * S, 0.12 * S, k % 2 ? 0.5 : -0.5, 0, TAU); ctx.fill(); }
      const active = i === idx && (state === 'aim' || state === 'fire');
      if (active && !reduceMotion) { ctx.shadowColor = '#ffe27a'; ctx.shadowBlur = S * (0.8 + 0.5 * Math.sin(time * 5)); }
      ctx.strokeStyle = i < idx ? '#b9913f' : '#f2b530'; ctx.lineWidth = 0.14 * S;
      ctx.beginPath(); ctx.arc(sx(A.x), sy(A.y), 0.34 * S, 0, TAU); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff4c2'; ctx.beginPath(); ctx.arc(sx(A.x - 0.12), sy(A.y - 0.14), 0.07 * S, 0, TAU); ctx.fill();
    });
  }

  function drawBrambles() {
    ledges.forEach(l => {
      if (l.final || l.kind === 'canyon') return;
      const A = anchorOf(l); const top = A.y + l.rope + BODY + THORN_GAP;
      const x = sx(A.x); if (x < -80 || x > W + 80) return;
      const w = 0.8 * S;
      ctx.fillStyle = '#29472a';
      ctx.beginPath(); ctx.moveTo(x - w, sy(SAND_Y)); ctx.lineTo(x - w * 0.8, sy(top + 0.5));
      ctx.quadraticCurveTo(x, sy(top - 0.3), x + w * 0.8, sy(top + 0.5)); ctx.lineTo(x + w, sy(SAND_Y)); ctx.fill();
      ctx.fillStyle = '#b3462f';
      for (let y = top; y < SAND_Y - 0.3; y += 0.7) {
        const side = ((y - top) / 0.7) % 2 < 1 ? -1 : 1;
        const ex = x + side * w * 0.85;
        ctx.beginPath(); ctx.moveTo(ex, sy(y)); ctx.lineTo(ex + side * 0.45 * S, sy(y + 0.1)); ctx.lineTo(ex, sy(y + 0.3)); ctx.fill();
      }
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.moveTo(x + k * 0.4 * S - 0.12 * S, sy(top + 0.15)); ctx.lineTo(x + k * 0.4 * S, sy(top - 0.35)); ctx.lineTo(x + k * 0.4 * S + 0.12 * S, sy(top + 0.15)); ctx.fill();
      }
    });
  }

  function drawLedges(time) {
    ledges.forEach(l => {
      const x = sx(l.x); const top = sy(l.y + BODY);
      if (l.final) {
        if (x > W + 40) return;
        const w = 7 * S, left = x - 1.2 * S;
        ctx.fillStyle = '#8e937c'; ctx.fillRect(left, top, w, sy(SAND_Y) - top);
        ctx.strokeStyle = '#6e725f'; ctx.lineWidth = 2;
        for (let r = 0; r * 0.9 < SAND_Y - l.y - BODY; r++) {
          const y = top + r * 0.9 * S; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + w, y); ctx.stroke();
          for (let c = (r % 2) * 0.9; c < 7; c += 1.8) { ctx.beginPath(); ctx.moveTo(left + c * S, y); ctx.lineTo(left + c * S, y + 0.9 * S); ctx.stroke(); }
        }
        // temple doorway
        ctx.fillStyle = '#a6ab93'; ctx.fillRect(left + 3.2 * S, top - 4.6 * S, 3.4 * S, 4.6 * S);
        ctx.fillStyle = '#3b3d31'; ctx.beginPath(); ctx.moveTo(left + 4.1 * S, top); ctx.lineTo(left + 4.1 * S, top - 2.8 * S);
        ctx.arc(left + 4.9 * S, top - 2.8 * S, 0.8 * S, Math.PI, 0); ctx.lineTo(left + 5.7 * S, top); ctx.fill();
        // chest
        const cx = x + 2.2 * S;
        if (!reduceMotion) { ctx.shadowColor = '#ffd55a'; ctx.shadowBlur = S * (1 + 0.4 * Math.sin(time * 3)); }
        ctx.fillStyle = '#8a4e22'; ctx.fillRect(cx - 0.8 * S, top - 1.1 * S, 1.6 * S, 1.1 * S);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#f2b530'; ctx.fillRect(cx - 0.8 * S, top - 0.75 * S, 1.6 * S, 0.16 * S); ctx.fillRect(cx - 0.12 * S, top - 0.9 * S, 0.24 * S, 0.34 * S);
        ctx.fillStyle = '#a4642e'; ctx.beginPath(); ctx.ellipse(cx, top - 1.1 * S, 0.8 * S, 0.35 * S, 0, Math.PI, 0); ctx.fill();
        return;
      }
      if (x < -80 || x > W + 80) return;
      ctx.fillStyle = '#6e4526'; ctx.fillRect(x - 0.24 * S, top, 0.48 * S, sy(SAND_Y) - top);   // thin posts and slim tops
      ctx.strokeStyle = '#5a371d'; ctx.lineWidth = Math.max(1, 0.06 * S);
      for (let y = top + S; y < sy(SAND_Y); y += 1.1 * S) { ctx.beginPath(); ctx.moveTo(x - 0.16 * S, y); ctx.quadraticCurveTo(x, y + 0.14 * S, x + 0.16 * S, y); ctx.stroke(); }
      ctx.fillStyle = '#9b6a3a'; rrect(x - 1.2 * S, top, 2.4 * S, 0.26 * S, 0.12 * S); ctx.fill();
      ctx.fillStyle = '#5fae55'; rrect(x - 1.25 * S, top - 0.06 * S, 2.5 * S, 0.14 * S, 0.07 * S); ctx.fill();
    });
  }

  function drawSand(time) {
    const y0 = sy(SAND_Y);
    ctx.fillStyle = '#d6b06a';
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, y0);
    for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, y0 + Math.sin((x / S + camX) * 1.3 + time * 1.5) * 0.12 * S);
    ctx.lineTo(W, H); ctx.fill();
    ctx.strokeStyle = 'rgba(150,110,50,0.45)'; ctx.lineWidth = 2;
    for (let r = 0; r < 3; r++) {
      ctx.beginPath();
      for (let x = 0; x <= W + 10; x += 12) {
        const yy = y0 + (0.5 + r * 0.55) * S + Math.sin((x / S + camX) * 0.9 + time + r * 2) * 0.1 * S;
        x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
      }
      ctx.stroke();
    }
    // ferns along the edge
    ctx.fillStyle = '#3c7d3f';
    const start = Math.floor(camX / 2.3) - 1, n = Math.ceil(viewW() / 2.3) + 3;
    for (let i = start; i < start + n; i++) {
      const fx = sx(i * 2.3 + rnd(i + 21)); const h = (0.6 + rnd(i + 31) * 0.6) * S;
      ctx.beginPath(); ctx.moveTo(fx - 0.5 * S, y0 + 2); ctx.quadraticCurveTo(fx - 0.3 * S, y0 - h, fx, y0 - h * 1.1);
      ctx.quadraticCurveTo(fx + 0.3 * S, y0 - h, fx + 0.5 * S, y0 + 2); ctx.fill();
    }
  }

  function drawRope() {
    if (!rope) return;
    const hx = sx(P.x), hy = sy(P.y);
    let tx, ty, sag = 0;
    const A = anchorOf(cur());
    if (rope.phase === 'extend' || rope.phase === 'limp') { tx = sx(rope.tip.x); ty = sy(rope.tip.y); if (rope.phase === 'limp') sag = 1.2 * S; }
    else {
      tx = sx(A.x); ty = sy(A.y);
      if (rope.phase === 'slack') sag = Math.max(0, rope.R - Math.hypot(P.x - A.x, P.y - A.y)) * 0.55 * S;
      if (rope.phase === 'limp-attached') sag = 1.5 * S;
    }
    const mx = (hx + tx) / 2, my = (hy + ty) / 2 + sag;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#6b4423'; ctx.lineWidth = Math.max(2, 0.17 * S);
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
    ctx.strokeStyle = '#b07a42'; ctx.lineWidth = Math.max(1, 0.07 * S); ctx.setLineDash([0.25 * S, 0.25 * S]);
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
    ctx.setLineDash([]);
    if (rope.phase === 'extend' || rope.phase === 'limp') {
      ctx.fillStyle = '#c9ced6'; ctx.beginPath(); ctx.arc(tx, ty, 0.2 * S, 0, TAU); ctx.fill();
    }
  }

  // the monkey buddy (chosen on the title screen): same size and hand position as the explorer, so every swing,
  // drop and landing works the same. The hand is at (0,0); the feet are about 1.2 units below it.
  function drawMonkey(u, flail, time) {
    const BROWN = '#8b5a33', TAN = '#e0b98a', DARK = '#6b4226';
    const kick = flail ? Math.sin(time * 20) * 0.12 * u : (state === 'swing' ? 0.08 * u : 0);
    ctx.lineCap = 'round';
    // tail, curled up behind
    ctx.strokeStyle = DARK; ctx.lineWidth = 0.07 * u;
    ctx.beginPath(); ctx.moveTo(0.02 * u, 0.98 * u); ctx.quadraticCurveTo(-0.34 * u, 1.0 * u, -0.26 * u, 0.72 * u);
    ctx.quadraticCurveTo(-0.2 * u, 0.56 * u, -0.08 * u, 0.62 * u); ctx.stroke();
    // legs and feet
    ctx.strokeStyle = BROWN; ctx.lineWidth = 0.1 * u;
    ctx.beginPath(); ctx.moveTo(-0.07 * u, 0.94 * u); ctx.lineTo(-0.1 * u - kick, 1.14 * u); ctx.moveTo(0.09 * u, 0.94 * u); ctx.lineTo(0.12 * u + kick, 1.14 * u); ctx.stroke();
    ctx.fillStyle = TAN;
    ctx.beginPath(); ctx.ellipse(-0.1 * u - kick, 1.17 * u, 0.08 * u, 0.045 * u, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(0.14 * u + kick, 1.17 * u, 0.08 * u, 0.045 * u, 0, 0, TAU); ctx.fill();
    // body and belly
    ctx.fillStyle = BROWN; ctx.beginPath(); ctx.ellipse(0.02 * u, 0.78 * u, 0.17 * u, 0.21 * u, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(0.05 * u, 0.81 * u, 0.1 * u, 0.14 * u, 0, 0, TAU); ctx.fill();
    // arms: one long arm up to the rope, the other hanging out (both wave when it falls)
    ctx.strokeStyle = BROWN; ctx.lineWidth = 0.075 * u;
    ctx.beginPath();
    if (flail) {
      const w = Math.sin(time * 18) * 0.15 * u;
      ctx.moveTo(-0.12 * u, 0.64 * u); ctx.lineTo(-0.36 * u, 0.24 * u + w); ctx.moveTo(0.15 * u, 0.64 * u); ctx.lineTo(0.38 * u, 0.24 * u - w);
    } else {
      ctx.moveTo(-0.1 * u, 0.64 * u); ctx.lineTo(0, 0.04 * u); ctx.moveTo(0.16 * u, 0.66 * u); ctx.lineTo(0.28 * u, 0.86 * u);
    }
    ctx.stroke();
    if (!flail) { ctx.fillStyle = TAN; ctx.beginPath(); ctx.arc(0.29 * u, 0.89 * u, 0.05 * u, 0, TAU); ctx.fill(); }
    // ears, head, face
    ctx.fillStyle = BROWN;
    ctx.beginPath(); ctx.arc(-0.14 * u, 0.42 * u, 0.075 * u, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0.2 * u, 0.42 * u, 0.075 * u, 0, TAU); ctx.fill();
    ctx.fillStyle = TAN;
    ctx.beginPath(); ctx.arc(-0.14 * u, 0.42 * u, 0.04 * u, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0.2 * u, 0.42 * u, 0.04 * u, 0, TAU); ctx.fill();
    ctx.fillStyle = BROWN; ctx.beginPath(); ctx.arc(0.03 * u, 0.43 * u, 0.17 * u, 0, TAU); ctx.fill();
    ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(0.07 * u, 0.48 * u, 0.12 * u, 0.1 * u, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1a0c';
    ctx.beginPath(); ctx.arc(0.03 * u, 0.43 * u, 0.024 * u, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0.12 * u, 0.43 * u, 0.024 * u, 0, TAU); ctx.fill();
    ctx.strokeStyle = DARK; ctx.lineWidth = 0.022 * u;
    ctx.beginPath(); ctx.arc(0.075 * u, 0.5 * u, 0.045 * u, 0.25, Math.PI - 0.25); ctx.stroke();
    // the hand on the rope
    if (!flail) { ctx.fillStyle = TAN; ctx.beginPath(); ctx.arc(0, 0, 0.075 * u, 0, TAU); ctx.fill(); }
  }
  function drawExplorer(time) {
    const x = sx(P.x), y = sy(P.y);
    const u = S;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(P.rot);
    const bob = state === 'aim' && !reduceMotion ? Math.sin(time * 3) * 0.03 * u : 0;
    ctx.translate(0, bob);
    const flail = (state === 'fire' && outcome === 'short') || state === 'hurt' || state === 'drop';
    if (character === 'monkey') { drawMonkey(u, flail, time); ctx.restore(); return; }
    // backpack
    ctx.fillStyle = '#8a5a2e'; rrect(-0.34 * u, 0.58 * u, 0.2 * u, 0.36 * u, 0.06 * u); ctx.fill();
    // legs
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 0.13 * u; ctx.lineCap = 'round';
    const kick = flail ? Math.sin(time * 20) * 0.12 * u : (state === 'swing' ? 0.08 * u : 0);
    ctx.beginPath(); ctx.moveTo(-0.08 * u, 0.95 * u); ctx.lineTo(-0.1 * u - kick, 1.18 * u); ctx.moveTo(0.08 * u, 0.95 * u); ctx.lineTo(0.1 * u + kick, 1.18 * u); ctx.stroke();
    ctx.fillStyle = '#3d2a17';
    ctx.beginPath(); ctx.ellipse(-0.1 * u - kick + 0.03 * u, 1.2 * u, 0.1 * u, 0.06 * u, 0, 0, TAU); ctx.ellipse(0.1 * u + kick + 0.05 * u, 1.2 * u, 0.1 * u, 0.06 * u, 0, 0, TAU); ctx.fill();
    // torso
    ctx.fillStyle = '#d9b26f'; rrect(-0.19 * u, 0.56 * u, 0.38 * u, 0.42 * u, 0.1 * u); ctx.fill();
    ctx.fillStyle = '#7a5a33'; ctx.fillRect(-0.19 * u, 0.86 * u, 0.38 * u, 0.07 * u);
    ctx.fillStyle = '#d2553a'; ctx.beginPath(); ctx.moveTo(-0.13 * u, 0.56 * u); ctx.lineTo(0.13 * u, 0.56 * u); ctx.lineTo(0, 0.7 * u); ctx.fill();
    // arms
    ctx.strokeStyle = '#e8b98d'; ctx.lineWidth = 0.1 * u;
    ctx.beginPath();
    if (flail) {
      const w = Math.sin(time * 18) * 0.15 * u;
      ctx.moveTo(-0.16 * u, 0.62 * u); ctx.lineTo(-0.38 * u, 0.2 * u + w); ctx.moveTo(0.16 * u, 0.62 * u); ctx.lineTo(0.38 * u, 0.2 * u - w);
    } else {
      ctx.moveTo(-0.16 * u, 0.62 * u); ctx.lineTo(-0.02 * u, 0.02 * u); ctx.moveTo(0.16 * u, 0.62 * u); ctx.lineTo(0.22 * u, 0.9 * u);   // one hand on the rope, the other down at the side
    }
    ctx.stroke();
    // head
    ctx.fillStyle = '#e8b98d'; ctx.beginPath(); ctx.arc(0.02 * u, 0.4 * u, 0.17 * u, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1a0c'; ctx.beginPath(); ctx.arc(0.1 * u, 0.4 * u, 0.028 * u, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 0.025 * u;
    ctx.beginPath(); ctx.arc(0.08 * u, 0.46 * u, 0.05 * u, 0.2, Math.PI - 0.6); ctx.stroke();
    // pith helmet
    ctx.fillStyle = '#efe0b4';
    ctx.beginPath(); ctx.ellipse(0.02 * u, 0.3 * u, 0.3 * u, 0.07 * u, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0.02 * u, 0.28 * u, 0.19 * u, 0.16 * u, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#b9864a'; ctx.fillRect(-0.17 * u, 0.25 * u, 0.38 * u, 0.04 * u);
    // hands
    if (!flail) { ctx.fillStyle = '#e8b98d'; ctx.beginPath(); ctx.arc(0, 0, 0.08 * u, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0.225 * u, 0.93 * u, 0.06 * u, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  // canvas text where "√N" is drawn as a radical sign with a bar over N (textBaseline must be 'middle')
  function mathParts(text) {
    const parts = []; let last = 0;
    text.replace(/√(\d+(?:\.\d+)?)/g, (m, n, i) => { if (i > last) parts.push({ t: text.slice(last, i) }); parts.push({ r: n }); last = i + m.length; });
    if (last < text.length) parts.push({ t: text.slice(last) });
    return parts;
  }
  // a textbook radical: sign width, gap before the digits, and how far the bar runs past them (all in font sizes)
  const RAD = { w: 0.56, gap: 0.06, over: 0.12 };
  function mathWidth(c, text, fs) {
    return mathParts(text).reduce((w, p) => w + (p.t !== undefined ? c.measureText(p.t).width : c.measureText(p.r).width + fs * (RAD.w + RAD.gap + RAD.over)), 0);
  }
  function fillMath(c, text, x, y, fs, align = 'center', stroke = false) {
    const w = mathWidth(c, text, fs);
    let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const prev = c.textAlign; c.textAlign = 'left';
    for (const p of mathParts(text)) {
      if (p.t !== undefined) { if (stroke) c.strokeText(p.t, cx, y); c.fillText(p.t, cx, y); cx += c.measureText(p.t).width; continue; }
      // size the sign to the digits' real height, so the bar sits just above them and the hook reaches just below
      const m = c.measureText(p.r), aw = m.width;
      const asc = m.actualBoundingBoxAscent || fs * 0.36, desc = m.actualBoundingBoxDescent || fs * 0.36;
      const top = y - asc - fs * 0.16, bot = y + desc + fs * 0.1, h = bot - top, rw = fs * RAD.w;
      const tick = [cx, top + 0.6 * h], knee = [cx + rw * 0.2, top + 0.52 * h], foot = [cx + rw * 0.46, bot], peak = [cx + rw * 0.94, top];
      const barEnd = cx + rw + fs * RAD.gap + aw + fs * RAD.over;
      const thin = Math.max(1.4, fs * 0.075), thick = Math.max(2.2, fs * 0.13);
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      if (stroke) {   // the same outline the surrounding text gets, drawn underneath
        c.lineWidth = thick + c.lineWidth;
        c.beginPath(); c.moveTo(...tick); c.lineTo(...knee); c.lineTo(...foot); c.lineTo(...peak); c.lineTo(barEnd, top); c.stroke();
      }
      c.strokeStyle = c.fillStyle;
      c.lineWidth = thin; c.beginPath(); c.moveTo(...tick); c.lineTo(...knee); c.stroke();                          // small tick
      c.lineWidth = thick; c.beginPath(); c.moveTo(...knee); c.lineTo(...foot); c.stroke();                         // thick stroke down
      c.lineWidth = thin; c.beginPath(); c.moveTo(...foot); c.lineTo(...peak); c.lineTo(barEnd, top); c.stroke();  // thin stroke up, then the bar
      c.restore();
      const dx = cx + rw + fs * RAD.gap;
      if (stroke) c.strokeText(p.r, dx, y);
      c.fillText(p.r, dx, y);
      cx = barEnd;
    }
    c.textAlign = prev;
  }

  // how big chip() will draw a label, so labels can sit right beside a line instead of on top of it
  function chipSize(text, size = 1) {
    const fs = Math.max(12, Math.min(22, S * 0.8)) * size;
    ctx.font = `800 ${fs}px Nunito, system-ui, sans-serif`;
    return { w: mathWidth(ctx, text, fs) + fs * 0.9, h: fs * 1.5 };
  }
  // where the a and b labels go: just inside the triangle, beside their side, so they never cover the squares' areas
  const aTagAt = (text, x, y, size) => [x, y - chipSize(text, size).h / 2 - 5];   // above side a (the ground)
  const bTagAt = (text, x, y, size) => [x - chipSize(text, size).w / 2 - 6, y];   // left of side b (the cliff)
  function chip(text, x, y, bg = '#1f3a28', fg = '#fff6d8', size = 1) {
    const fs = Math.max(12, Math.min(22, S * 0.8)) * size;
    ctx.font = `800 ${fs}px Nunito, system-ui, sans-serif`;
    const w = mathWidth(ctx, text, fs) + fs * 0.9, h = fs * 1.5;
    ctx.fillStyle = bg; rrect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; fillMath(ctx, text, x, y + 1, fs);
  }

  function drawTriangle(time) {
    return;   // (the step prompt already says "the big swing", and the picture stays uncluttered)
    const l = cur(); if (!l || l.final || l.kind !== 'canyon' || state !== 'aim' || st < 1.3 || mode === 'w2') return;   // (World 2's prompt already says it)
    chip(mode === 'w3' ? tl('Last step opens the door!', '¡El último paso abre la puerta!') : tl('Last step = big swing!', '¡Último paso = gran salto!'), sx(P.x) - 4.6 * S, sy(P.y) + 2.6 * S, '#1f3a28', '#fff6d8', 1.05);
  }

  function drawPopups() {
    popups.forEach(p => {
      const k = p.t / 1.6;
      ctx.globalAlpha = Math.min(1, (1 - k) * 2);
      const fs = Math.max(14, S * 0.95) * p.size;
      ctx.font = `400 ${fs}px "Lilita One", system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const x = sx(p.x), y = sy(p.y) - k * 1.8 * S;
      ctx.lineWidth = fs * 0.22; ctx.strokeStyle = 'rgba(20,30,15,0.85)'; ctx.lineJoin = 'round';
      ctx.strokeText(p.text, x, y); ctx.fillStyle = p.color; ctx.fillText(p.text, x, y);
      ctx.globalAlpha = 1;
    });
  }

  function drawParts() {
    parts.forEach(p => {
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), p.r * S, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawLeaves(time, dt) {
    if (reduceMotion) return;
    ctx.fillStyle = 'rgba(70,140,70,0.55)';
    leaves.forEach(f => {
      f.y += dt * 0.04 * f.s; if (f.y > 1.05) { f.y = -0.05; f.x = Math.random(); }
      const x = ((f.x * W + Math.sin(time + f.p) * 20 - camX * S * 0.6) % W + W) % W;
      ctx.save(); ctx.translate(x, f.y * H); ctx.rotate(Math.sin(time * 2 + f.p));
      ctx.beginPath(); ctx.ellipse(0, 0, 0.3 * S * f.s, 0.13 * S * f.s, 0, 0, TAU); ctx.fill(); ctx.restore();
    });
  }

  function drawHUD() {
    const fs = Math.max(13, Math.min(20, S * 0.75));
    ctx.font = `800 ${fs}px Nunito, system-ui, sans-serif`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const pad = fs * 0.7, h = fs * 1.9;
    const items = [tl(`Score ${score}`, `Puntos ${score}`), `Combo x${combo}`];
    let x = 12;
    items.forEach((t, i) => {
      const w = ctx.measureText(t).width + pad * 2;
      ctx.fillStyle = 'rgba(16,38,26,0.78)'; rrect(x, 12, w, h, h / 2); ctx.fill();
      ctx.fillStyle = i === 1 && combo >= 2 ? '#f2b530' : '#f4ecd2'; ctx.fillText(t, x + pad, 12 + h / 2 + 1);
      x += w + 8;
    });
    const total = ledges.length - 1;
    const l0 = cur(); const t = l0.final ? tl('Temple!', '¡Templo!') : l0.kind === 'canyon' ? tl(`Problem ${l0.pi + 1} / ${problems.length} · big swing`, `Problema ${l0.pi + 1} / ${problems.length} · gran salto`) : tl(`Problem ${l0.pi + 1} / ${problems.length} · step ${l0.si + 1}`, `Problema ${l0.pi + 1} / ${problems.length} · paso ${l0.si + 1}`);
    const w = ctx.measureText(t).width + pad * 2;
    // on narrow screens the problem counter drops to a second row instead of overlapping
    const ry = x + w + 8 > W - 12 ? 12 + h + 6 : 12, rx = ry === 12 ? W - w - 12 : 12;
    ctx.fillStyle = 'rgba(16,38,26,0.78)'; rrect(rx, ry, w, h, h / 2); ctx.fill();
    ctx.fillStyle = '#f4ecd2'; ctx.fillText(t, rx + pad, ry + h / 2 + 1);
  }

  function wrapLines(c, text, maxW) {
    const words = text.split(' '), out = [];
    let line = '';
    words.forEach(w => {
      const t = line ? line + ' ' + w : w;
      if (c.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    });
    if (line) out.push(line);
    return out;
  }

  function drawExplain() {
    if (state !== 'explain' || !explain) return;
    const e = explain;
    ctx.fillStyle = 'rgba(10,25,15,0.45)'; ctx.fillRect(0, 0, W, H);
    const cw = Math.min(W - 32, 560);
    const big = Math.max(18, Math.min(32, cw / 16)), mid = Math.max(14, Math.min(20, cw / 27)), sm = Math.max(12, Math.min(15, cw / 36));
    ctx.font = `700 ${mid}px Nunito, system-ui, sans-serif`;
    const hint = e.hint ? wrapLines(ctx, e.hint, cw - 40) : [];
    ctx.font = `800 ${mid}px Nunito, system-ui, sans-serif`;
    const full = e.full ? wrapLines(ctx, e.full, cw - 40) : [];
    const workL = wrapLines(ctx, e.work, cw - 40);
    const lh = mid * 1.45;
    const ch = big * 2.1 + (hint.length + full.length + workL.length) * lh + mid * 0.8 + sm * 2.6;
    const x = (W - cw) / 2, y = Math.max(8, (H - ch) / 2);
    ctx.fillStyle = '#fff4d6'; rrect(x, y, cw, ch, 18); ctx.fill();
    ctx.strokeStyle = '#6b3f10'; ctx.lineWidth = 3; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c4512c'; ctx.font = `400 ${big}px "Lilita One", system-ui, sans-serif`;
    ctx.fillText(e.title, W / 2, y + big * 1.1, cw - 24);
    let yy = y + big * 2.1 + lh / 2;
    ctx.fillStyle = '#4a3a20'; ctx.font = `700 ${mid}px Nunito, system-ui, sans-serif`;
    hint.forEach(t => { fillMath(ctx, t, W / 2, yy, mid); yy += lh; });
    yy += mid * 0.4;
    ctx.fillStyle = '#1f6b34'; ctx.font = `800 ${mid}px Nunito, system-ui, sans-serif`;
    full.forEach(t => { fillMath(ctx, t, W / 2, yy, mid); yy += lh; });
    workL.forEach(t => { fillMath(ctx, t, W / 2, yy, mid); yy += lh; });
    ctx.fillStyle = '#6b5a3a'; ctx.font = `700 ${sm}px Nunito, system-ui, sans-serif`;
    ctx.fillText(tl('Tap or press Enter to try that step again.', 'Toca o presiona Enter para intentar ese paso otra vez.'), W / 2, yy + sm * 0.6, cw - 24);
  }

  // ---------- the proof, built into the canyon: a square on every side of the triangle ----------
  const GOLD = '#f2b530', GREEN = '#6cc05c', INK = '#3a2a14';
  const CORAL = '#f4917a', A_INK = '#b0351f', B_INK = '#1d6b25', C_INK = '#1f5fbf';

  // the canyon for the problem being solved right now
  function figureLedge() {
    const l = cur(); if (!l || l.final) return null;
    return ledges.find(q => q.kind === 'canyon' && q.pi === l.pi) || null;
  }

  function drawProofWorld(time) {
    const L = figureLedge(); if (!L) return;
    const p = L.prob, a = p.a, b = p.b, sum = p.sum, cc = p.c;
    const kk = L.k;                      // world units per unit of the problem
    const k = kk * S;                   // pixels per unit
    const X = x => sx(L.x + x * kk), Yp = y => sy(L.y - y * kk);
    const c = ctx;
    const tiles = mode === 'w1', door = mode === 'w3';
    const cr = nb.crumble;
    const pt = (O, u, v, s, t) => [X(O[0] + u[0] * s + v[0] * t), Yp(O[1] + u[1] * s + v[1] * t)];
    function quad(O, u, v, s0, s1, t0, t1) {
      const q = [pt(O, u, v, s0, t0), pt(O, u, v, s1, t0), pt(O, u, v, s1, t1), pt(O, u, v, s0, t1)];
      c.beginPath(); c.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) c.lineTo(q[i][0], q[i][1]); c.closePath();
    }
    const sqA = { O: [0, 0], u: [a, 0], v: [0, -a], n: a };
    const sqB = { O: [a, 0], u: [0, b], v: [b, 0], n: b };
    const sqC = { O: [0, 0], u: [a, b], v: [-b, a] };
    const center = s => pt(s.O, s.u, s.v, 0.5, 0.5);
    const edge = Math.max(2, 0.1 * S);

    // World 3: the figure is carved into a temple door that slides down into the canyon once solved
    if (door) {
      const pad = 0.8;
      const x0 = X(-b - pad), x1 = X(a + b + pad), y0 = Yp(a + b + pad), y1 = Yp(-a - pad);
      const drop = cr * cr * 24 * S;
      c.save();
      c.globalAlpha = 1 - cr * 0.7;
      c.translate(0, drop);
      c.fillStyle = '#9a9478'; c.fillRect(x0, y0, x1 - x0, y1 - y0);
      c.strokeStyle = 'rgba(70,62,45,0.35)'; c.lineWidth = 1.5;
      const bh = Math.max(14, 0.9 * S);
      for (let y = y0, r = 0; y < y1; y += bh, r++) {
        c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
        for (let x = x0 + (r % 2 ? bh : 0); x < x1; x += bh * 2) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, Math.min(y1, y + bh)); c.stroke(); }
      }
      c.strokeStyle = '#5a5340'; c.lineWidth = Math.max(4, 0.3 * S); c.strokeRect(x0, y0, x1 - x0, y1 - y0);
      c.fillStyle = '#5a5340'; c.font = `400 ${Math.max(14, 0.75 * S)}px "Lilita One", system-ui, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(tl('TEMPLE DOOR', 'PUERTA DEL TEMPLO'), (x0 + x1) / 2, y0 + Math.max(14, 0.75 * S));
      c.restore();
    }

    c.save();
    c.globalAlpha = 1 - cr;
    c.translate(0, cr * cr * 7 * S);
    // the 1-ft grid inside a square (side n ft) - shown in every world so students can count the squares along a side
    function gridLines(s, n) {
      c.strokeStyle = door ? 'rgba(255,248,230,0.32)' : 'rgba(58,42,20,0.38)'; c.lineWidth = Math.max(1, 0.035 * S);
      c.beginPath();
      for (let i = 1; i < n; i++) {
        let p1 = pt(s.O, s.u, s.v, i / n, 0), p2 = pt(s.O, s.u, s.v, i / n, 1); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]);
        p1 = pt(s.O, s.u, s.v, 0, i / n); p2 = pt(s.O, s.u, s.v, 1, i / n); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]);
      }
      c.stroke();
    }
    // one label per square, in its middle: what the square stands for ("3²", then "9 ft²") - its side's length is on the triangle
    function squareLabel(x, y, area, fs, ink) {
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.strokeStyle = 'rgba(255,248,230,0.95)';
      c.font = `800 ${fs}px Nunito, system-ui, sans-serif`; c.lineWidth = Math.max(3, fs * 0.22);
      c.fillStyle = ink; c.strokeText(area, x, y); c.fillText(area, x, y);
    }
    function legSquare(s, fill, color, label, ink) {
      quad(s.O, s.u, s.v, 0, 1, 0, 1);
      c.fillStyle = door ? 'rgba(45,38,25,0.55)' : 'rgba(255,248,230,0.35)'; c.fill();
      const drain = 1 - 0.6 * nb.pour;
      if (tiles) {
        const n = s.n, shown = Math.round(n * n * fill);
        c.globalAlpha = (1 - cr) * drain;
        for (let t = 0; t < shown; t++) {
          const i = t % n, j = Math.floor(t / n);
          quad(s.O, s.u, s.v, (i + 0.06) / n, (i + 0.94) / n, (j + 0.06) / n, (j + 0.94) / n);
          c.fillStyle = color; c.fill();
          c.strokeStyle = 'rgba(58,42,20,0.35)'; c.lineWidth = 1; c.stroke();
        }
        c.globalAlpha = 1 - cr;
      } else if (fill > 0) {
        c.globalAlpha = (1 - cr) * drain * Math.min(1, fill);
        quad(s.O, s.u, s.v, 0, 1, 0, 1); c.fillStyle = color; c.fill();
        c.globalAlpha = 1 - cr;
      }
      gridLines(s, s.n);
      quad(s.O, s.u, s.v, 0, 1, 0, 1);
      c.strokeStyle = door ? '#3b3526' : '#4b4032'; c.lineWidth = edge; c.stroke();
      if (label) {
        const [lx, ly] = center(s);
        squareLabel(lx, ly, label, Math.max(14, Math.min(38, s.n * k * 0.26)), ink);
      }
    }
    // World 1: no big squares and no areas - just one row of 1-ft squares along each side, to count and read the lengths
    function unitRow(O, u, v, n, fill, line) {
      for (let i = 0; i < n; i++) {
        quad(O, u, v, i / n, (i + 1) / n, 0, 1);
        c.fillStyle = fill; c.fill();
        c.strokeStyle = line; c.lineWidth = Math.max(2, 0.07 * S); c.stroke();
      }
    }
    const hard = mode === 'w2';   // World 3: the squares show "?" until their areas are worked out
    if (mode === 'w0') {
      unitRow([0, 0], [a, 0], [0, -1], a, '#ff9a80', '#b8492c');
      unitRow([a, 0], [0, b], [1, 0], b, '#8fdd89', '#2f7d2a');
      unitRow([0, 0], [a, b], [-b / cc, a / cc], cc, '#8cc3ff', '#2d63a8');
    } else {
      // each square shows what it stands for: 3² (or a² when that side is the missing one), then its area once squared
      const legLabel = (n, f, letter, known) => f > 0.5 ? `${n * n}${FT}²` : hard ? '?' : known ? `${n}²` : `${letter}²`;
      legSquare(sqA, nb.aF, CORAL, legLabel(a, nb.aF, 'a', p.type !== 'leg'), A_INK);   // in a missing-leg problem, a is the unknown
      legSquare(sqB, nb.bF, GREEN, legLabel(b, nb.bF, 'b', true), B_INK);

      // the big stone frame on the hypotenuse; the leg squares pour into it from the rope side outward
      quad(sqC.O, sqC.u, sqC.v, 0, 1, 0, 1);
      c.fillStyle = door ? 'rgba(45,38,25,0.55)' : 'rgba(230,240,255,0.3)'; c.fill();
      const cInt = Number.isInteger(cc);
      if (cInt) {
        // the big square fills one 1-ft tile at a time: a² coral tiles, then b² green tiles, so every square can be counted
        const n = cc, shown = Math.round(sum * nb.pour);
        for (let t = 0; t < shown; t++) {
          const i = t % n, j = Math.floor(t / n);
          quad(sqC.O, sqC.u, sqC.v, (i + 0.06) / n, (i + 0.94) / n, (j + 0.06) / n, (j + 0.94) / n);
          c.fillStyle = t < a * a ? CORAL : GREEN; c.fill();
          c.strokeStyle = 'rgba(58,42,20,0.35)'; c.lineWidth = 1; c.stroke();
        }
      } else if (nb.pour > 0.001) {
        const f1 = nb.pour * (a * a) / sum, f2 = nb.pour;
        quad(sqC.O, sqC.u, sqC.v, 0, 1, 0, f1); c.fillStyle = CORAL; c.fill();
        quad(sqC.O, sqC.u, sqC.v, 0, 1, f1, f2); c.fillStyle = GREEN; c.fill();
      }
      gridLines(sqC, cc);   // 1-ft grid in the rope's square too (when c isn't whole, the last row is partly cut off)
      quad(sqC.O, sqC.u, sqC.v, 0, 1, 0, 1);
      c.strokeStyle = '#4d5b6e'; c.lineWidth = Math.max(4, 0.26 * S); c.setLineDash(nb.pour > 0.5 ? [] : [0.5 * S, 0.35 * S]); c.stroke(); c.setLineDash([]);
      if (p.type === 'est' && nb.side > 0.5) {
        const f = Math.floor(cc) / cc;
        quad(sqC.O, sqC.u, sqC.v, 0, f, 0, f);
        c.strokeStyle = '#8a3b22'; c.lineWidth = 2; c.setLineDash([6, 5]); c.stroke(); c.setLineDash([]);
      }
      const [cx0, cy0] = center(sqC);
      const cLabel = nb.pour > 0.5 ? `${sum}${FT}²` : hard ? '?' : p.type === 'leg' ? `${cc}²` : 'c²';
      squareLabel(cx0, cy0, cLabel, Math.max(14, Math.min(42, cc * k * 0.22)), C_INK);
    }

    // triangle edges: ground, cliff wall, and the rope line
    c.strokeStyle = '#fffbe8'; c.lineWidth = Math.max(2, 0.09 * S);
    c.beginPath(); c.moveTo(X(0), Yp(0)); c.lineTo(X(a), Yp(0)); c.lineTo(X(a), Yp(b)); c.stroke();
    const rq = Math.min(0.6 * S, k * 0.5);
    c.beginPath(); c.moveTo(X(a) - rq, Yp(0)); c.lineTo(X(a) - rq, Yp(0) - rq); c.lineTo(X(a), Yp(0) - rq); c.stroke();
    if (nb.side > 0.02) {
      c.globalAlpha = (1 - cr) * nb.side;
      c.strokeStyle = '#8cc8ff'; c.lineWidth = Math.max(4, 0.22 * S);
      c.beginPath(); c.moveTo(X(0), Yp(0)); c.lineTo(X(a), Yp(b)); c.stroke();
      c.globalAlpha = 1 - cr;
    }

    // the side lengths, on the middle of each of the triangle's own sides: only the number, in a tag of the side's color.
    // An unknown side reads "?" (World 3's leg being counted is left to its close-up)
    const counted = mode === 'w2' && p.done < 1 ? p.count : null;
    const aVal = p.type === 'leg' && nb.side <= 0.5 ? '?' : String(a);
    const cVal = p.type === 'leg' || nb.side > 0.5 ? String(cc) : '?';
    const fsN = Math.max(22, Math.min(32, 1.1 * S));
    c.font = `800 ${fsN}px Nunito, system-ui, sans-serif`;
    const tagW = text => Math.max(fsN * 1.35, c.measureText(text).width + fsN * 0.7), tagH = fsN * 1.3;
    function sideNum(text, x, y, ink, line) {
      c.font = `800 ${fsN}px Nunito, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const w = tagW(text), h = tagH;
      c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
      c.fillStyle = '#fffaf0'; c.fill(); c.lineWidth = Math.max(2.5, fsN * 0.14); c.strokeStyle = line; c.stroke();
      c.fillStyle = ink; c.fillText(text, x, y + fsN * 0.04);
    }
    const tags = [];
    if (counted !== 'a') tags.push([aVal, (X(0) + X(a)) / 2, Yp(0)]);
    if (counted !== 'b') tags.push([String(b), X(a), (Yp(0) + Yp(b)) / 2]);
    if (counted !== 'a') sideNum(aVal, (X(0) + X(a)) / 2, Yp(0), A_INK, '#ff7a5c');
    if (counted !== 'b') sideNum(String(b), X(a), (Yp(0) + Yp(b)) / 2, B_INK, '#4fae45');
    // the rope's tag starts at its middle and slides along the rope until it clears the other two (long, thin triangles)
    const clear = (x, y) => tags.every(([t, tx, ty]) => Math.abs(x - tx) > (tagW(cVal) + tagW(t)) / 2 + 4 || Math.abs(y - ty) > tagH + 4);
    let cx1 = (X(0) + X(a)) / 2, cy1 = (Yp(0) + Yp(b)) / 2;
    for (const f of [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.18]) {
      const x = X(a * f), y = Yp(b * f);
      if (clear(x, y)) { cx1 = x; cy1 = y; break; }
    }
    sideNum(cVal, cx1, cy1, C_INK, '#5aa9ff');

    c.restore();
  }

  // World 2's counting step: redraw the square being counted on top of the platforms, so no pillar hides its grid
  function drawCountSquare() {
    if (mode !== 'w2' || !countBounds()) return;
    const L = figureLedge(), p = L.prob, kk = L.k, isA = p.count === 'a', n = isA ? p.a : p.b;
    const x0 = sx(isA ? L.x : L.ax), y0 = sy(isA ? L.y : ANCHOR_Y), side = n * kk * S;
    const c = ctx;
    c.save();
    c.fillStyle = 'rgba(255,248,230,0.94)'; c.fillRect(x0, y0, side, side);
    c.strokeStyle = 'rgba(58,42,20,0.5)'; c.lineWidth = Math.max(1, 0.04 * S);
    c.beginPath();
    for (let i = 1; i < n; i++) { const d = side * i / n; c.moveTo(x0 + d, y0); c.lineTo(x0 + d, y0 + side); c.moveTo(x0, y0 + d); c.lineTo(x0 + side, y0 + d); }
    c.stroke();
    c.strokeStyle = isA ? '#e0734a' : '#4fae45'; c.lineWidth = Math.max(3, 0.14 * S); c.strokeRect(x0, y0, side, side);
    const t = `${p.count} = ?`;   // right over the side's own label, just inside the triangle
    chip(t, ...(isA ? aTagAt(t, x0 + side / 2, y0, 1.2) : bTagAt(t, x0, y0 + side / 2, 1.2)), isA ? '#fff0ec' : '#eaf7e6', isA ? A_INK : B_INK, 1.2);
    c.restore();
  }

  function updateNotebook(dt) {
    const rate = reduceMotion ? 1 : 1 - Math.exp(-dt * 3.2);
    ['aF', 'bF', 'side', 'reveal', 'sym', 'num'].forEach(key => { nb[key] += (nbT[key] - nb[key]) * rate; });
    // pour at a steady speed so it reads as tiles flowing in
    const step = reduceMotion ? 1 : dt * 1.4;
    nb.pour = nbT.pour > nb.pour ? Math.min(nbT.pour, nb.pour + step) : nbT.pour;
    nb.crumble = nbT.crumble > nb.crumble ? Math.min(1, nb.crumble + (reduceMotion ? 1 : dt * 0.9)) : nbT.crumble;
  }

  // ---------- the slow-motion close-up after the final answer ----------
  // Time slows, the camera zooms onto the triangle, the two known sides light up with their lengths, the missing side
  // draws itself in... and BANG - its length pops onto it. Then time speeds back up and the swing finishes.
  const CINE = { known1: 0.5, known2: 0.9, draw: 1.3, bang: 2.2, out: 2.9, end: 3.5 };
  function startCine(l) {
    cine = { t: 0, p: l.prob, tri: { x0: l.x, y0: l.y, ax: l.ax, ay: l.ay }, banged: false, chimes: 0 };
    sfx.sparkle();
  }
  const cineScale = t => t < 0.5 ? 1 - 0.9 * t / 0.5 : t < CINE.out ? 0.1 : t < CINE.end ? 0.1 + 0.9 * (t - CINE.out) / (CINE.end - CINE.out) : 1;
  function cineSides() {
    const { p, tri: T } = cine;
    return {
      a: { p0: [T.x0, T.y0], p1: [T.ax, T.y0], col: '#ff7a5c', ink: A_INK, bg: '#fff0ec', name: 'distance', txt: `a = ${p.a}${FT}` },
      b: { p0: [T.ax, T.y0], p1: [T.ax, T.ay], col: '#5fd35a', ink: B_INK, bg: '#eaf7e6', name: 'height', txt: `b = ${p.b}${FT}` },
      c: { p0: [T.x0, T.y0], p1: [T.ax, T.ay], col: '#5aa9ff', ink: C_INK, bg: '#e6f0ff', name: 'rope', txt: p.type === 'est' ? `c = √${p.sum} ≈ ${fmt(Math.round(p.c * 10) / 10)}${FT}` : `c = ${p.c}${FT}` }
    };
  }
  const cineMissing = () => cine.p.type === 'leg' ? 'a' : 'c';
  function stepCine(dt) {
    if (!cine) return;
    const before = cine.t;
    cine.t += dt;
    timeScale = cineScale(cine.t);
    // a soft chime as each known side lights up
    [CINE.known1, CINE.known2].forEach(t0 => { if (before < t0 && cine.t >= t0) sfx.chime(); });
    if (!cine.banged && cine.t >= CINE.bang) {
      cine.banged = true;
      const s = cineSides()[cineMissing()], mx = (s.p0[0] + s.p1[0]) / 2, my = (s.p0[1] + s.p1[1]) / 2;
      sfx.bang(); shake = reduceMotion ? 0 : 0.6;
      burst(mx, my, [s.col, '#ffffff', '#f2b530', s.col], 70, 16);
      cine.boom = { x: mx, y: my };
    }
    if (cine.t >= CINE.end) { cine = null; timeScale = 1; }
  }
  function sideLabelPos(key, s) {
    const T = cine.tri, mx = (s.p0[0] + s.p1[0]) / 2, my = (s.p0[1] + s.p1[1]) / 2;
    if (key === 'a') return [T.x0 + (T.ax - T.x0) * 0.62, my - 0.95];   // inside the triangle near the right angle, clear of the explorer
    if (key === 'b') return [mx + 1.9, my];
    const vx = mx - T.ax, vy = my - T.y0, vl = Math.hypot(vx, vy) || 1;   // away from the right angle
    return [mx + vx / vl * 1.5, my + vy / vl * 1.5];
  }
  // drawn in the world (moves with the camera and the shake)
  function drawCine() {
    if (!cine) return;
    const t = cine.t, sides = cineSides(), miss = cineMissing();
    const known = ['a', 'b', 'c'].filter(k => k !== miss);
    const appear = { [known[0]]: CINE.known1, [known[1]]: CINE.known2, [miss]: CINE.draw };
    const fade = t > CINE.out ? Math.max(0, 1 - (t - CINE.out) / (CINE.end - CINE.out)) : 1;
    const T = cine.tri, rq = 0.7;
    ctx.save();
    ctx.globalAlpha = fade;
    // right-angle marker
    ctx.strokeStyle = '#fffbe8'; ctx.lineWidth = Math.max(2, 0.08 * S);
    ctx.beginPath(); ctx.moveTo(sx(T.ax - rq), sy(T.y0)); ctx.lineTo(sx(T.ax - rq), sy(T.y0 - rq)); ctx.lineTo(sx(T.ax), sy(T.y0 - rq)); ctx.stroke();
    ['a', 'b', 'c'].forEach(key => {
      const s = sides[key], t0 = appear[key];
      if (t < t0) return;
      const isMiss = key === miss;
      const f = isMiss ? Math.min(1, (t - t0) / (CINE.bang - 0.05 - t0)) : Math.min(1, (t - t0) / 0.3);
      const ex = s.p0[0] + (s.p1[0] - s.p0[0]) * f, ey = s.p0[1] + (s.p1[1] - s.p0[1]) * f;
      // the side: a dark outline, then a glowing colored stroke
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(20,20,20,0.55)'; ctx.lineWidth = Math.max(7, 0.42 * S);
      ctx.beginPath(); ctx.moveTo(sx(s.p0[0]), sy(s.p0[1])); ctx.lineTo(sx(ex), sy(ey)); ctx.stroke();
      if (!reduceMotion) { ctx.shadowColor = s.col; ctx.shadowBlur = S * (isMiss && cine.banged ? 1.4 : 0.7); }
      ctx.strokeStyle = s.col; ctx.lineWidth = Math.max(5, 0.28 * S);
      ctx.beginPath(); ctx.moveTo(sx(s.p0[0]), sy(s.p0[1])); ctx.lineTo(sx(ex), sy(ey)); ctx.stroke();
      ctx.shadowBlur = 0;
      if (isMiss && f < 1) {   // a spark racing along the side as it draws in
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sx(ex), sy(ey), 0.26 * S * (1 + 0.3 * Math.sin(time * 40)), 0, TAU); ctx.fill();
      }
      // the label: known sides fade in; the missing side reads "?" until the BANG, then its length pops on
      const [lx, ly] = sideLabelPos(key, s);
      if (isMiss && !cine.banged) {
        ctx.globalAlpha = fade * Math.min(1, (t - t0) / 0.3);
        chip(`${key} = ?`, sx(lx), sy(ly), s.bg, s.ink, 1.35);
      } else {
        const k = isMiss ? Math.min(1, (t - CINE.bang) / 0.25) : f;
        const pop = isMiss ? 1 + 0.6 * Math.max(0, 1 - (t - CINE.bang) / 0.35) : 1;
        ctx.globalAlpha = fade * k;
        chip(s.txt, sx(lx), sy(ly), isMiss ? s.col : s.bg, isMiss ? '#ffffff' : s.ink, 1.35 * pop);
      }
      ctx.globalAlpha = fade;
    });
    // the shockwave
    if (cine.boom && !reduceMotion) {
      const k = Math.min(1, (t - CINE.bang) / 0.7);
      ctx.globalAlpha = (1 - k) * fade;
      ctx.strokeStyle = sides[miss].col; ctx.lineWidth = Math.max(3, 0.35 * S * (1 - k));
      ctx.beginPath(); ctx.arc(sx(cine.boom.x), sy(cine.boom.y), (0.5 + k * 7) * S, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, 0.15 * S * (1 - k));
      ctx.beginPath(); ctx.arc(sx(cine.boom.x), sy(cine.boom.y), (0.3 + k * 4.5) * S, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  // drawn over everything (no shake): movie letterbox bars, the flash, and the headline
  function drawCineOverlay() {
    if (!cine) return;
    const t = cine.t;
    const bars = Math.min(1, t / 0.4) * (t > CINE.out ? Math.max(0, 1 - (t - CINE.out) / 0.5) : 1);
    const bh = H * 0.09 * bars;
    ctx.fillStyle = '#05080a'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
    if (bars > 0.3 && !cine.banged) {
      ctx.globalAlpha = Math.min(1, (bars - 0.3) * 2);
      const fs = Math.max(11, bh * 0.36);
      ctx.font = `800 ${fs}px Nunito, system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f2b530'; ctx.fillText(tl('● SLOW MOTION', '● CÁMARA LENTA'), 16, H - bh / 2);   // in the bottom bar, clear of the score badges
      ctx.globalAlpha = 1;
    }
    if (cine.banged) {
      const k = (t - CINE.bang);
      if (!reduceMotion && k < 0.35) { ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - k / 0.35)})`; ctx.fillRect(0, 0, W, H); }
      const s = cineSides()[cineMissing()];
      const fade = t > CINE.out ? Math.max(0, 1 - (t - CINE.out) / 0.5) : 1;
      const fs = Math.max(22, Math.min(54, W / 14)) * (1 + 0.5 * Math.max(0, 1 - k / 0.3));
      ctx.globalAlpha = fade;
      ctx.font = `400 ${fs}px "Lilita One", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const head = cineMissing() === 'a' ? tl(`DISTANCE ${s.txt}!`, `¡DISTANCIA ${s.txt}!`) : tl(`ROPE ${s.txt}!`, `¡CUERDA ${s.txt}!`);
      ctx.lineWidth = fs * 0.2; ctx.strokeStyle = '#1a1206'; ctx.lineJoin = 'round';
      const y = Math.max(bh + fs * 0.8, H * 0.2);
      ctx.fillStyle = s.col; fillMath(ctx, head, W / 2, y, fs, 'center', true);   // outlined, with a drawn radical for √
      ctx.globalAlpha = 1;
    }
  }

  function drawWin(time) {
    if (state !== 'win') return;
    const fs = Math.max(22, Math.min(46, W / 16));
    ctx.font = `400 ${fs}px "Lilita One", system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const y = H * 0.32 + (reduceMotion ? 0 : Math.sin(time * 2) * 4);
    ctx.lineWidth = fs * 0.2; ctx.strokeStyle = '#3b2208'; ctx.lineJoin = 'round';
    ctx.strokeText(tl('Temple treasure reached!', '¡Llegaste al tesoro del templo!'), W / 2, y); ctx.fillStyle = '#f2b530'; ctx.fillText(tl('Temple treasure reached!', '¡Llegaste al tesoro del templo!'), W / 2, y);
    ctx.font = `800 ${fs * 0.45}px Nunito, system-ui, sans-serif`;
    const line = tl(`${perfects} perfect · ${misses} misses · best combo x${bestCombo} · score ${score}`, `${perfects} perfectos · ${misses} fallos · mejor combo x${bestCombo} · puntaje ${score}`);
    ctx.lineWidth = fs * 0.12; ctx.strokeText(line, W / 2, y + fs * 0.9); ctx.fillStyle = '#fff6d8'; ctx.fillText(line, W / 2, y + fs * 0.9);
  }

  let last = performance.now(), time = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!screenOpen()) tick(dt);   // the world waits (timer and all) while the title or map is up
    else if (!titleScreen.hidden) titleTick(dt);
    requestAnimationFrame(frame);
  }
  function tick(dt) {
    time += dt;
    if (W > 0 && H > 0) {
      stepCine(dt);
      update(dt * timeScale);        // the world slows down during the close-up...
      updateNotebook(dt);
      updateCamera(dt);              // ...but the camera keeps moving in real time
      renderFray();
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const sh = shake > 0 && !reduceMotion ? shake * 10 : 0;
      ctx.save();
      if (sh) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
      drawSky(time);
      drawGrid();
      drawCanopy();
      drawAnchors(time);             // vines first, so they pass behind the squares and their numbers
      const figFront = mode === 'w0' || mode === 'w2' || mode === 'w4';   // these worlds draw the figure in front of the platforms
      if (!figFront) drawProofWorld(time);
      drawBrambles();
      drawLedges(time);
      drawSand(time);
      if (figFront) drawProofWorld(time);   // so no platform hides a number
      drawCountSquare();
      drawTriangle(time);
      drawRope();
      drawExplorer(time);
      drawCine();
      drawParts();
      drawPopups();
      drawLeaves(time, dt);
      ctx.restore();
      drawCineOverlay();
      drawHUD();
      drawExplain();
      drawWin(time);
    }
  }

  startGame('w0');
  showTitle();
  requestAnimationFrame(frame);
  // small hook for automated checks
  window.GR = {
    right() { this.pick(true); }, wrong() { this.pick(false); },
    pick(ok) {
      const l = cur(); if (state !== 'aim' || l.final) return;
      const s = l.prob.steps[l.si];
      if (s.typed) { const inp = document.getElementById('typed-ans'); inp.value = String(s.typed.blank ? (ok ? s.typed.ans : s.typed.ans + 1) : ok ? (s.typed.est ? Math.round(s.typed.c) : s.typed.c) : s.typed.sum); submitTyped(inp); }
      else answer(s.choices.find(c => c.ok === ok));
    },
    get fray() { return fray; },
    get state() { return state; }, get cine() { return cine; }, get idx() { return idx; }, get zoom() { return zoom; },
    get cam() { return { camX, camY, S, viewH, W, H }; }, step(dt) { tick(dt); },
    ledges: () => ledges, P, startGame, showTitle, showMap, startWorld, titleTick, setCharacter, get character() { return character; }, get tsw() { return tsw; }, get screen() { return !titleScreen.hidden ? 'title' : !mapScreen.hidden ? 'map' : 'game'; }
  };
})();
