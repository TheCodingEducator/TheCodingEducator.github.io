// Math Billiards - the geometry engine: turns the shot a player has aimed into an angle problem about that very shot.
//
// Every problem is built the same way. There is a reference ray B at a vertex (a guide line through the cue ball, or a
// cushion or its perpendicular where the shot line meets the cushion), and x is the angle from B to the shot's own
// line. So the shot's direction is a function of x:   direction = flip * rotate(B, s * x)
// The right x gives back exactly the aimed direction. A wrong x gives the direction that wrong angle really makes,
// and that is the shot the ball plays: a mistake in the math is a mistake in the path.
//
// The other angles in the picture are measured from the same lines, so every label agrees with the drawing; each
// problem is checked (every arc's measure against its label, the answer against the relationship, and the answer's
// direction against the aim) before it is shown.
(function () {
  var MB = window.MB, V = MB.V, T = MB.T, TB = MB.TABLE, R = MB.R;

  // ------------------------------------------------------------------ the relationships (names and rules)
  var REL = {
    comp: { name: T('Complementary angles', 'Ángulos complementarios'), rule: T('Complementary angles add to 90°.', 'Los ángulos complementarios suman 90°.'),
      look: T('Look at the right angle: the two parts add to 90°.', 'Mira el ángulo recto: las dos partes suman 90°.') },
    supp: { name: T('Supplementary angles (a linear pair)', 'Ángulos suplementarios (par lineal)'), rule: T('Angles on a straight line add to 180°.', 'Los ángulos sobre una recta suman 180°.'),
      look: T('Look at the two angles on the straight line.', 'Mira los dos ángulos sobre la recta.') },
    vert: { name: T('Vertical angles', 'Ángulos opuestos por el vértice'), rule: T('Vertical angles are equal.', 'Los ángulos opuestos por el vértice son iguales.'),
      look: T('Look at the angle straight across where the lines cross.', 'Mira el ángulo de enfrente donde se cruzan las rectas.') },
    corr: { name: T('Corresponding angles', 'Ángulos correspondientes'), rule: T('Corresponding angles are equal.', 'Los ángulos correspondientes son iguales.'),
      look: T('Look at the angle in the same spot at the other crossing.', 'Mira el ángulo en el mismo lugar del otro cruce.') },
    altInt: { name: T('Alternate interior angles', 'Ángulos alternos internos'), rule: T('Alternate interior angles are equal.', 'Los ángulos alternos internos son iguales.'),
      look: T('Look between the parallel lines, on the other side of the shot line.', 'Mira entre las paralelas, al otro lado de la recta del tiro.') },
    altExt: { name: T('Alternate exterior angles', 'Ángulos alternos externos'), rule: T('Alternate exterior angles are equal.', 'Los ángulos alternos externos son iguales.'),
      look: T('Look outside the parallel lines, on the other side of the shot line.', 'Mira fuera de las paralelas, al otro lado de la recta del tiro.') },
    coInt: { name: T('Same-side interior angles', 'Ángulos internos del mismo lado'), rule: T('Same-side interior angles add to 180°.', 'Los ángulos internos del mismo lado suman 180°.'),
      look: T('Look between the parallel lines, on the same side of the shot line.', 'Mira entre las paralelas, del mismo lado de la recta del tiro.') },
    ssExt: { name: T('Same-side exterior angles', 'Ángulos externos del mismo lado'), rule: T('Same-side exterior angles add to 180°.', 'Los ángulos externos del mismo lado suman 180°.'),
      look: T('Look outside the parallel lines, on the same side of the shot line.', 'Mira fuera de las paralelas, del mismo lado de la recta del tiro.') }
  };
  MB.REL = REL;
  MB.SKILLS = [
    { id: 'comp', name: T('Complementary', 'Complementarios'), long: T('Complementary Angles', 'Ángulos complementarios') },
    { id: 'supp', name: T('Supplementary', 'Suplementarios'), long: T('Supplementary Angles', 'Ángulos suplementarios') },
    { id: 'vert', name: T('Vertical', 'Opuestos por el vértice'), long: T('Vertical Angles', 'Ángulos opuestos por el vértice') },
    { id: 'par', name: T('Parallel Lines & Transversals', 'Paralelas y transversales'), long: T('Parallel Lines & Transversals', 'Paralelas y transversales') }
  ];
  MB.DIFFS = [
    { id: 'beginner', name: T('Beginner', 'Principiante'), blurb: T('Clear labels, one step, friendly numbers', 'Etiquetas claras, un paso, números sencillos') },
    { id: 'intermediate', name: T('Intermediate', 'Intermedio'), blurb: T('Bank shots, any whole number, find the relationship', 'Tiros a banda, cualquier número entero, halla la relación') },
    { id: 'challenge', name: T('Challenge', 'Desafío'), blurb: T('Two-step reasoning, fewer marks, extra lines', 'Razonamiento en dos pasos, menos marcas, rectas de más') }
  ];

  // ------------------------------------------------------------------ helpers
  function unit(a, b) { return V.norm(V.sub(b, a)); }
  function railDir(rail) { return unit(rail.a, rail.b); }
  function arc(at, u, v, role, label, value, r) { return { t: 'arc', at: at, u: V.norm(u), v: V.norm(v), role: role, label: label, value: value, r: r || 0 }; }
  function deg(n) { return n + '°'; }
  var recent = [];   // the last few answers, so the same x doesn't come up again and again
  function fresh(x) { return recent.indexOf(x) < 0; }

  // A guide line through the cue ball that makes a nice angle x with the shot. The guide lies close to the table's own
  // directions (along a cushion or straight across), turned a little if needed so that x is a whole number (a
  // multiple of 5 for Beginner). Returns the guide ray B and the turn s with   shot = rotate(B, s * x).
  function guideFor(d, step, lo, hi, avoid90) {
    var ad = V.ang(d), opts = [];
    [0, 90, 180, 270].forEach(function (g0) {
      var th = ((ad - g0) % 360 + 540) % 360 - 180;   // signed turn from the table direction to the shot (-180 to 180)
      var s = th >= 0 ? 1 : -1, ax = Math.abs(th);
      [Math.floor(ax / step) * step, Math.ceil(ax / step) * step].forEach(function (x) {
        if (x < lo || x > hi || (avoid90 && Math.abs(x - 90) < avoid90) || Math.abs(x - ax) > (step > 1 ? 4 : 1)) return;
        opts.push({ x: x, s: s, tilt: Math.abs(x - ax) });
      });
    });
    var good = opts.filter(function (o) { return fresh(o.x); });
    if (!good.length) good = opts;
    if (!good.length) {
      // the shot is too close to the table's directions: use a guide at any direction instead
      var x = step * MB.randi(Math.ceil(Math.max(lo, 25) / step), Math.floor(Math.min(hi, 155) / step));
      while (avoid90 && Math.abs(x - 90) < avoid90) x = step * MB.randi(Math.ceil(lo / step), Math.floor(hi / step));
      good = [{ x: x, s: Math.random() < 0.5 ? 1 : -1, tilt: 0 }];
    }
    good.sort(function (a, b) { return a.tilt - b.tilt; });
    var o = good[Math.random() < 0.7 ? 0 : Math.min(good.length - 1, 1)];
    return { B: V.rot(d, -o.s * o.x), s: o.s, x: o.x };
  }

  // Where the shot's line meets a cushion, and the aim turned (by less than half a degree) so the angle there is whole.
  // The shot line hits the cushion from inside, so the ray from the hit point back to the cue ball is u = -d.
  function railFrame(V0, d) {
    var h = MB.railHit(V0, d), Rr = railDir(h.rail), N = h.rail.n;
    return { C: h.point, dist: h.t, rail: h.rail, R1: Rr, R2: V.neg(Rr), N: N };
  }
  // turn the shot so the angle from ray B (at the cushion) to u = -d is a whole number; returns null if out of range
  function snapAt(B, d, lo, hi) {
    var u = V.neg(d), ex = V.between(B, u), x = Math.round(ex);
    if (x < lo || x > hi) return null;
    var s = V.side(B, u);
    return { x: x, s: s, d: V.neg(V.rot(B, s * x)) };
  }

  // ------------------------------------------------------------------ the problem templates
  // Each returns a problem, or null if this shot can't make that picture well (then another template is tried).
  // A problem: skill, vertex(es), answer x, the reference (B, s, flip) for turning x into a direction, the drawing,
  // and the reasoning (steps and the final relationship  x + m = S  or  x = m).
  function base(skill, ctx, x, B, s, flip, aim) {
    return { skill: skill, diff: ctx.diff, x: x, B: B, s: s, flip: flip, aim: aim, V: ctx.V, els: [], steps: [], final: null, look: '', kind: '' };
  }
  MB.dirFor = function (p, xv) { return V.mul(V.rot(p.B, p.s * xv), p.flip); };

  // --- Complementary
  // Beginner/Intermediate: a right angle at the cue ball (a guide along the table and its perpendicular); the shot
  // splits it into x and a known part.
  function compGuide(ctx) {
    var step = ctx.diff === 'beginner' ? 5 : 1, g = guideFor(ctx.d, step, step > 1 ? 15 : 12, step > 1 ? 75 : 78, 0);
    var P = V.rot(g.B, g.s * 90), d = ctx.d;
    // x is measured from one of the two perpendicular guides (either one), and the known part from the other
    var xFirst = Math.random() < 0.5, xv = xFirst ? g.x : 90 - g.x, k = 90 - xv;
    var p = xFirst ? base('comp', ctx, xv, g.B, g.s, 1, d) : base('comp', ctx, xv, P, -g.s, 1, d);
    var xa = xFirst ? g.B : P, ka = xFirst ? P : g.B;
    p.els.push({ t: 'ray', from: ctx.V, dir: g.B, len: 150, kind: 'guide' }, { t: 'ray', from: ctx.V, dir: P, len: 150, kind: 'guide' });
    p.els.push({ t: 'box', at: ctx.V, u: g.B, v: P });
    p.els.push(arc(ctx.V, xa, d, 'x', 'x°', null), arc(ctx.V, ka, d, 'known', deg(k), k));
    p.steps = [{ rel: 'comp', eq: 'x + ' + deg(k) + ' = 90°' }];
    p.final = { type: 'sum', S: 90, m: k }; p.look = REL.comp.look; p.kind = 'guide';
    p.sr = T('A right angle at the cue ball is split by your shot into ' + k + '° and x.', 'Un ángulo recto en la bola blanca queda dividido por tu tiro en ' + k + '° y x.');
    return p;
  }
  // Intermediate: the bank shot. Where the shot meets the cushion, the cushion and its perpendicular make a right
  // angle; the shot's path makes the angle with the perpendicular and the angle with the cushion.
  function compBank(ctx) {
    var f = railFrame(ctx.V, ctx.d); if (f.dist < 80) return null;
    var u = V.neg(ctx.d), Rk = V.dot(f.R1, u) > 0 ? f.R1 : f.R2;   // the cushion ray on the cue ball's side
    var toNormal = Math.random() < 0.5, B = toNormal ? f.N : Rk;
    var sn = snapAt(B, ctx.d, 14, 76); if (!sn) return null;
    var d = sn.d, x = sn.x, k = 90 - x, uu = V.neg(d), other = toNormal ? Rk : f.N;
    var hit2 = MB.railHit(ctx.V, d); if (hit2.rail !== f.rail) return null; var C = MB.railHit(ctx.V, d).point;
    var p = base('comp', ctx, x, B, sn.s, -1, d);
    p.C = C;
    p.els.push({ t: 'rail', at: C, dir: f.R1, len: 170 }, { t: 'ray', from: C, dir: f.N, len: 120, kind: 'normal' });
    p.els.push({ t: 'box', at: C, u: f.N, v: Rk });
    p.els.push(arc(C, B, uu, 'x', 'x°', null, 58), arc(C, other, uu, 'known', deg(k), k, 82));
    p.steps = [{ rel: 'comp', eq: 'x + ' + deg(k) + ' = 90°' }];
    p.final = { type: 'sum', S: 90, m: k }; p.look = REL.comp.look; p.kind = 'bank';
    p.sr = T('Your shot meets the cushion. The cushion and the line straight out from it make a right angle; your path splits it into ' + k + '° and x.',
      'Tu tiro llega a la banda. La banda y la recta perpendicular forman un ángulo recto; tu trayectoria lo divide en ' + k + '° y x.');
    return p;
  }
  // Challenge: two perpendicular guide lines cross at the cue ball, and so does the shot's line. The known angle is
  // on the cue's side, across from the angle that completes x's right angle: vertical angles first, then complementary.
  function compCross(ctx) {
    var g = guideFor(ctx.d, 1, 13, 77, 0), d = ctx.d, P = V.rot(g.B, g.s * 90), k = 90 - g.x, back = V.neg(d);
    var p = base('comp', ctx, g.x, g.B, g.s, 1, d);
    p.els.push({ t: 'line', at: ctx.V, dir: g.B, len: 140, kind: 'guide' }, { t: 'line', at: ctx.V, dir: P, len: 140, kind: 'guide' },
      { t: 'ray', from: ctx.V, dir: back, len: 140, kind: 'back' });
    p.els.push({ t: 'box', at: ctx.V, u: g.B, v: V.neg(P) });   // marked in a free corner: the guide lines are perpendicular
    p.els.push(arc(ctx.V, g.B, d, 'x', 'x°', null, 52), arc(ctx.V, V.neg(P), back, 'known', deg(k), k, 60), arc(ctx.V, P, d, 'mid', '?', k, 74));
    p.steps = [{ rel: 'vert', eq: '? = ' + deg(k) }, { rel: 'comp', eq: 'x + ' + deg(k) + ' = 90°' }];
    p.final = { type: 'sum', S: 90, m: k }; p.look = T('Find the angle across from ' + k + '°. Then look at the right angle.', 'Busca el ángulo de enfrente de ' + k + '°. Luego mira el ángulo recto.'); p.kind = 'cross';
    p.sr = T('Two perpendicular guide lines and your shot line cross at the cue ball. On the cue side, an angle of ' + k + '° is marked. x is between a guide and your shot.',
      'Dos guías perpendiculares y la recta de tu tiro se cruzan en la bola blanca. Del lado del taco hay un ángulo de ' + k + '°. x está entre una guía y tu tiro.');
    return p;
  }

  // --- Supplementary
  function suppGuide(ctx) {
    var step = ctx.diff === 'beginner' ? 5 : 1, g = guideFor(ctx.d, step, 25, 155, 9), d = ctx.d, k = 180 - g.x;
    var p = base('supp', ctx, g.x, g.B, g.s, 1, d);
    p.els.push({ t: 'line', at: ctx.V, dir: g.B, len: 150, kind: 'guide' });
    // Intermediate sometimes puts the known angle on the far side of the shot (still a linear pair, less obvious)
    p.els.push(arc(ctx.V, g.B, d, 'x', 'x°', null, 50), arc(ctx.V, V.neg(g.B), d, 'known', deg(k), k, 66));
    p.steps = [{ rel: 'supp', eq: 'x + ' + deg(k) + ' = 180°' }];
    p.final = { type: 'sum', S: 180, m: k }; p.look = REL.supp.look; p.kind = 'guide';
    p.sr = T('A straight guide line through the cue ball. Your shot splits the straight angle into ' + k + '° and x.', 'Una guía recta pasa por la bola blanca. Tu tiro divide el ángulo llano en ' + k + '° y x.');
    return p;
  }
  function suppBank(ctx) {
    var f = railFrame(ctx.V, ctx.d); if (f.dist < 80) return null;
    var B = Math.random() < 0.5 ? f.R1 : f.R2, sn = snapAt(B, ctx.d, 18, 162); if (!sn || Math.abs(sn.x - 90) < 8) return null;
    var d = sn.d, x = sn.x, k = 180 - x, C = MB.railHit(ctx.V, d).point, uu = V.neg(d);
    if (MB.railHit(ctx.V, d).rail !== f.rail) return null;
    var p = base('supp', ctx, x, B, sn.s, -1, d); p.C = C;
    p.els.push({ t: 'rail', at: C, dir: f.R1, len: 170 });
    p.els.push(arc(C, B, uu, 'x', 'x°', null, 54), arc(C, V.neg(B), uu, 'known', deg(k), k, 70));
    p.steps = [{ rel: 'supp', eq: 'x + ' + deg(k) + ' = 180°' }];
    p.final = { type: 'sum', S: 180, m: k }; p.look = REL.supp.look; p.kind = 'bank';
    p.sr = T('Your shot meets the cushion, a straight line. Your path makes ' + k + '° with the cushion on one side and x on the other.',
      'Tu tiro llega a la banda, que es una recta. Tu trayectoria forma ' + k + '° con la banda de un lado y x del otro.');
    return p;
  }
  // Challenge: at the cushion, the angle with the perpendicular is known; x is the wide angle with the cushion on
  // the other side. First the complement (the angle with the near side of the cushion), then the straight line.
  function suppNormal(ctx) {
    var f = railFrame(ctx.V, ctx.d); if (f.dist < 80) return null;
    var u0 = V.neg(ctx.d), Rk = V.dot(f.R1, u0) > 0 ? f.R1 : f.R2, Ro = V.neg(Rk);
    var sn = snapAt(Ro, ctx.d, 104, 166); if (!sn) return null;
    var d = sn.d, x = sn.x, i = x - 90, m = 180 - x, C = MB.railHit(ctx.V, d).point, uu = V.neg(d);
    if (MB.railHit(ctx.V, d).rail !== f.rail) return null;
    var p = base('supp', ctx, x, Ro, sn.s, -1, d); p.C = C;
    p.els.push({ t: 'rail', at: C, dir: f.R1, len: 170 }, { t: 'ray', from: C, dir: f.N, len: 120, kind: 'normal' }, { t: 'box', at: C, u: f.N, v: Ro });
    p.els.push(arc(C, f.N, uu, 'known', deg(i), i, 50), arc(C, Rk, uu, 'mid', '?', m, 70), arc(C, Ro, uu, 'x', 'x°', null, 92));
    p.steps = [{ rel: 'comp', eq: '? + ' + deg(i) + ' = 90°,  ? = ' + deg(m) }, { rel: 'supp', eq: 'x + ' + deg(m) + ' = 180°' }];
    p.final = { type: 'sum', S: 180, m: m }; p.look = T('First find the small angle between your path and the cushion. Then use the straight line.', 'Primero halla el ángulo pequeño entre tu trayectoria y la banda. Luego usa la recta.'); p.kind = 'normal';
    p.sr = T('At the cushion, your path makes ' + i + '° with the line straight out from the cushion. x is the wide angle between your path and the cushion.',
      'En la banda, tu trayectoria forma ' + i + '° con la perpendicular a la banda. x es el ángulo amplio entre tu trayectoria y la banda.');
    return p;
  }

  // --- Vertical
  // The shot's line runs on behind the cue ball (along the cue). A guide line crosses it at the ball; the known angle
  // sits on the cue's side, straight across from x.
  function vertGuide(ctx, distract) {
    var step = ctx.diff === 'beginner' ? 5 : 1, g = guideFor(ctx.d, step, 25, 155, 9), d = ctx.d, back = V.neg(d);
    var p = base('vert', ctx, g.x, g.B, g.s, 1, d);
    p.els.push({ t: 'line', at: ctx.V, dir: g.B, len: 150, kind: 'guide' }, { t: 'ray', from: ctx.V, dir: back, len: 150, kind: 'back' });
    p.els.push(arc(ctx.V, g.B, d, 'x', 'x°', null, 50), arc(ctx.V, V.neg(g.B), back, 'known', deg(g.x), g.x, 50));
    if (distract) {
      // a third line through the ball, inside the angle between the shot and the far side of the guide, with its
      // own (true) measure: a distraction to see past
      var room = 180 - g.x, h = MB.randi(Math.max(14, Math.round(room * 0.3)), Math.round(room * 0.7));
      var H = V.rot(d, g.s * h);
      if (V.between(H, V.neg(g.B)) > 12 && h > 12) {
        p.els.push({ t: 'line', at: ctx.V, dir: H, len: 120, kind: 'guide2' }, arc(ctx.V, d, H, 'other', deg(h), h, 74));
      }
    }
    p.steps = [{ rel: 'vert', eq: 'x = ' + deg(g.x) }];
    p.final = { type: 'eq', m: g.x }; p.look = REL.vert.look; p.kind = distract ? 'cross3' : 'guide';
    p.sr = T('Your shot line and a guide line cross at the cue ball. On the cue side, the angle straight across from x is ' + g.x + '°.' + (distract ? ' A third line is also drawn.' : ''),
      'La recta de tu tiro y una guía se cruzan en la bola blanca. Del lado del taco, el ángulo de enfrente de x mide ' + g.x + '°.' + (distract ? ' También hay una tercera recta.' : ''));
    return p;
  }
  // Intermediate: at the cushion. The path's line, carried on past the cushion, crosses the cushion's line.
  function vertBank(ctx) {
    var f = railFrame(ctx.V, ctx.d); if (f.dist < 80) return null;
    var B = Math.random() < 0.5 ? f.R1 : f.R2, sn = snapAt(B, ctx.d, 20, 160); if (!sn || Math.abs(sn.x - 90) < 8) return null;
    var d = sn.d, x = sn.x, C = MB.railHit(ctx.V, d).point, uu = V.neg(d);
    if (MB.railHit(ctx.V, d).rail !== f.rail) return null;
    var p = base('vert', ctx, x, B, sn.s, -1, d); p.C = C;
    p.els.push({ t: 'rail', at: C, dir: f.R1, len: 170 }, { t: 'ray', from: C, dir: d, len: 90, kind: 'ext' });
    p.els.push(arc(C, B, uu, 'x', 'x°', null, 50), arc(C, V.neg(B), d, 'known', deg(x), x, 50));
    p.steps = [{ rel: 'vert', eq: 'x = ' + deg(x) }];
    p.final = { type: 'eq', m: x }; p.look = REL.vert.look; p.kind = 'bank';
    p.sr = T('Your path, carried on past the cushion, crosses the cushion line. Across from x, past the cushion, the angle is ' + x + '°.',
      'Tu trayectoria, prolongada más allá de la banda, cruza la recta de la banda. Enfrente de x, más allá de la banda, el ángulo mide ' + x + '°.');
    return p;
  }

  // --- Parallel lines cut by a transversal (the shot's line)
  // Two parallel lines: one through the cue ball, one farther along the shot (the cushion itself when it's far enough
  // away, else a second guide). Positions at a crossing: which way along the parallel line (rs = +1 or -1) and which
  // way along the shot line (ts = +1 ahead, -1 back). The angle at (rs, ts) is x0 when rs*ts = 1, else 180 - x0.
  var PAIRS = {
    beginner: [['corr', 1], ['altInt', 1]],
    intermediate: [['altInt', 2], ['coInt', 2], ['altExt', 1], ['corr', 1]],
    challenge: [['ssExt', 2], ['two', 2], ['altExt', 1], ['coInt', 1]]
  };
  function parallel(ctx) {
    var list = PAIRS[ctx.diff], bag = [];
    list.forEach(function (e) { for (var i = 0; i < e[1]; i++) bag.push(e[0]); });
    var rel = MB.pick(bag), d = ctx.d, step = ctx.diff === 'beginner' ? 5 : 1;
    var f = railFrame(ctx.V, d), useRail = ctx.diff !== 'beginner' && f.dist >= 130 && f.dist <= 420 && Math.random() < 0.75;
    var Bp, x0, sg, C, aim = d, L2kind;
    if (useRail) {
      // x0 = the angle between the cushion's direction R1 and the shot (ahead), made whole
      var sn = snapAt(f.R1, V.neg(d), 22, 158);   // (snapAt measures from B to -d; pass -d to measure to d itself)
      if (!sn || Math.abs(sn.x - 90) < 10) useRail = false;
      else { aim = V.neg(sn.d); Bp = f.R1; x0 = sn.x; sg = sn.s; C = MB.railHit(ctx.V, aim).point; L2kind = 'rail'; if (MB.railHit(ctx.V, aim).rail !== f.rail) useRail = false; }
    }
    if (!useRail) {
      var g = guideFor(d, step, 28, 152, 10);
      Bp = g.B; x0 = g.x; sg = g.s; aim = d;
      var D = MB.clamp(f.dist * 0.6, 120, 170);
      C = V.add(ctx.V, V.mul(aim, D)); L2kind = 'guide';
    }
    // x's position at the cue ball, and the known one at the far crossing
    var rsV = Math.random() < 0.5 ? 1 : -1, tsV, rsC, tsC;
    if (rel === 'corr') { tsV = MB.pick([1, -1]); rsC = rsV; tsC = tsV; }
    else if (rel === 'altInt') { tsV = 1; rsC = -rsV; tsC = -1; }
    else if (rel === 'altExt') { tsV = -1; rsC = -rsV; tsC = 1; }
    else if (rel === 'coInt') { tsV = 1; rsC = rsV; tsC = -1; }
    else if (rel === 'ssExt') { tsV = -1; rsC = rsV; tsC = 1; }
    else { tsV = MB.pick([1, -1]); rsC = -rsV; tsC = tsV; }   // 'two': corresponding, then a straight line
    var val = function (rs, ts) { return rs * ts === 1 ? x0 : 180 - x0; };
    var x = val(rsV, tsV), k = val(rsC, tsC);
    // x as a turn from the parallel ray rsV*Bp to the shot ray tsV*aim
    var Bx = V.mul(Bp, rsV), tr = V.mul(aim, tsV), s = V.side(Bx, tr);
    var p = base('par', ctx, x, Bx, s, tsV, aim); p.C = C;
    if (L2kind === 'rail') p.els.push({ t: 'rail', at: C, dir: Bp, len: 190 });
    else p.els.push({ t: 'line', at: C, dir: Bp, len: 150, kind: 'guide' });
    p.els.push({ t: 'line', at: ctx.V, dir: Bp, len: 150, kind: 'guide' });
    p.els.push({ t: 'para', at: ctx.V, dir: Bp, off: 105 }, { t: 'para', at: C, dir: Bp, off: 105 });
    p.els.push({ t: 'ray', from: ctx.V, dir: V.neg(aim), len: 95, kind: 'back' }, { t: 'ray', from: C, dir: aim, len: 95, kind: 'ext' });
    p.els.push(arc(ctx.V, Bx, tr, 'x', 'x°', null, 46), arc(C, V.mul(Bp, rsC), V.mul(aim, tsC), 'known', deg(k), k, 46));
    var relName = rel === 'two' ? 'corr' : rel;
    if (rel === 'two') {
      // the angle in the same spot at the cue ball's crossing (corresponding to the known one), then the straight line
      var mid = arc(ctx.V, V.mul(Bp, rsC), V.mul(aim, tsC), 'mid', '?', k, 64);
      p.els.push(mid);
      p.steps = [{ rel: 'corr', eq: '? = ' + deg(k) }, { rel: 'supp', eq: 'x + ' + deg(k) + ' = 180°' }];
      p.final = { type: 'sum', S: 180, m: k };
      p.look = T('Slide the ' + k + '° angle along the shot line to the cue ball. Then look at the straight line.', 'Lleva el ángulo de ' + k + '° por la recta del tiro hasta la bola blanca. Luego mira la recta.');
    } else {
      var sum = rel === 'coInt' || rel === 'ssExt';
      p.steps = [{ rel: relName, eq: sum ? 'x + ' + deg(k) + ' = 180°' : 'x = ' + deg(k) }];
      p.final = sum ? { type: 'sum', S: 180, m: k } : { type: 'eq', m: k };
      p.look = REL[relName].look;
    }
    p.relKey = rel; p.kind = L2kind;
    p.sr = T('Two parallel lines' + (L2kind === 'rail' ? ' (a guide through the cue ball and the cushion)' : '') + ' are crossed by your shot line. At the far crossing, an angle of ' + k + '° is marked; x is at the cue ball.',
      'Dos rectas paralelas' + (L2kind === 'rail' ? ' (una guía por la bola blanca y la banda)' : '') + ' son cortadas por la recta de tu tiro. En el cruce lejano hay un ángulo de ' + k + '°; x está en la bola blanca.');
    return p;
  }

  // which templates each skill can use at each difficulty, most preferred first. "bank" ones need the shot to head
  // for a cushion; they're preferred when the cue ball really goes to the cushion first.
  var PLAN = {
    comp: { beginner: [compGuide], intermediate: [compBank, compGuide], challenge: [compCross, compBank] },
    supp: { beginner: [suppGuide], intermediate: [suppBank, suppGuide], challenge: [suppNormal, suppBank, suppGuide] },
    vert: { beginner: [function (c) { return vertGuide(c, false); }], intermediate: [vertBank, function (c) { return vertGuide(c, false); }], challenge: [function (c) { return vertGuide(c, true); }, vertBank] },
    par: { beginner: [parallel], intermediate: [parallel], challenge: [parallel] }
  };

  // ------------------------------------------------------------------ checking a problem before it is shown
  function verify(p) {
    try {
      if (!(p.x >= 1 && p.x <= 179) || Math.round(p.x) !== p.x) return false;
      // the answer's direction is the aimed direction
      var dx = MB.dirFor(p, p.x); if (V.between(dx, p.aim) > 0.01) return false;
      // every labeled arc measures what its label says (x's arc measures the answer)
      for (var i = 0; i < p.els.length; i++) {
        var e = p.els[i]; if (e.t !== 'arc') continue;
        var m = V.between(e.u, e.v), want = e.role === 'x' ? p.x : e.value;
        if (want === null || want === undefined || Math.abs(m - want) > 0.01) return false;
        if (e.role === 'known' && Math.round(e.value) !== e.value) return false;
      }
      // the relationship gives the answer
      if (p.final.type === 'sum' ? p.x + p.final.m !== p.final.S : p.x !== p.final.m) return false;
      // a right-angle mark really marks a right angle
      for (i = 0; i < p.els.length; i++) if (p.els[i].t === 'box' && Math.abs(V.between(p.els[i].u, p.els[i].v) - 90) > 0.01) return false;
      return true;
    } catch (e) { return false; }
  }

  // ------------------------------------------------------------------ making a problem for a shot
  // ctx: V (the cue ball), d (the aimed direction), diff, skill. firstRail: whether the cue ball meets a cushion first.
  MB.makeProblem = function (cueBall, d, diff, skill, balls) {
    var ctx = { V: { x: cueBall.x, y: cueBall.y }, d: V.norm(d), diff: diff };
    var fc = MB.firstContact(balls || [], ctx.V, ctx.d, cueBall), railFirst = !fc.ball;
    var plan = PLAN[skill][diff].slice();
    if (diff === 'challenge') plan = MB.shuffle(plan.slice(0, 2)).concat(plan.slice(2));   // (a mix of pictures, not always the same one)
    // bank pictures are for shots that really go to the cushion first; otherwise try them last
    if (!railFirst) plan.sort(function (a, b) { return (bankish(a) ? 1 : 0) - (bankish(b) ? 1 : 0); });
    for (var tries = 0; tries < 3; tries++) {
      for (var i = 0; i < plan.length; i++) {
        var p = plan[i](ctx);
        if (p && verify(p)) {
          p.rel = REL[p.steps[p.steps.length - 1].rel];
          recent.push(p.x); if (recent.length > 5) recent.shift();
          return p;
        }
      }
    }
    // (never expected) the simplest picture of all, which always fits
    var q = suppGuide({ V: ctx.V, d: ctx.d, diff: 'intermediate' }); q.rel = REL.supp; q.skill = skill === 'par' ? 'supp' : q.skill;
    return q;
  };
  function bankish(fn) { return fn === compBank || fn === suppBank || fn === vertBank || fn === suppNormal; }

  // ------------------------------------------------------------------ hints and explanations
  // The steps of the solution, as lines of text: the relationship, the equation, the operation, the answer.
  MB.solution = function (p) {
    var f = p.final, lines = [];
    p.steps.forEach(function (st) { lines.push({ name: REL[st.rel].name, rule: REL[st.rel].rule, eq: st.eq }); });
    var op = f.type === 'sum' ? 'x = ' + f.S + '° − ' + f.m + '°' : 'x = ' + f.m + '°';
    return { lines: lines, op: op, answer: 'x = ' + p.x + '°' };
  };
  // what a wrong answer says, as a comparison: 55° + 35° = 90° ... here  55° + 35° ≠ 90°
  MB.wrongEq = function (p, xv) {
    var f = p.final;
    if (f.type === 'sum') return xv + '° + ' + f.m + '° = ' + (xv + f.m) + '° ≠ ' + f.S + '°';
    return xv + '° ≠ ' + f.m + '°';
  };
  MB.rightEq = function (p) {
    var f = p.final;
    if (f.type === 'sum') return p.x + '° + ' + f.m + '° = ' + f.S + '°';
    return p.x + '° = ' + f.m + '°';
  };
  // a likely slip, named (used 90 instead of 180, added instead of subtracted...)
  MB.slip = function (p, xv) {
    var f = p.final;
    if (f.type === 'sum') {
      if (xv === f.m) return T('That’s the angle you were given. x is the other part.', 'Ese es el ángulo que te dieron. x es la otra parte.');
      if (f.S === 180 && xv === 90 - f.m) return T('These add to 180°, not 90°.', 'Estos suman 180°, no 90°.');
      if (f.S === 90 && xv === 180 - f.m) return T('These add to 90°, not 180°.', 'Estos suman 90°, no 180°.');
      if (xv === f.S + f.m) return T('Subtract the known angle; don’t add it.', 'Resta el ángulo conocido; no lo sumes.');
      if (Math.abs(xv - p.x) <= 2) return T('So close: check the subtraction.', 'Muy cerca: revisa la resta.');
    } else {
      if (xv === 180 - f.m) return T('These angles are equal; they don’t add to 180°.', 'Estos ángulos son iguales; no suman 180°.');
      if (xv === 90 - f.m) return T('These angles are equal; they don’t add to 90°.', 'Estos ángulos son iguales; no suman 90°.');
    }
    return '';
  };
})();
