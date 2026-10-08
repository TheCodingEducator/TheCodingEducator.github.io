// Bank Shot: Angle Golf - the three themed courses, nine holes each.
// Every hole has its own idea inside its world (a drawbridge, a dragon's lair, a black hole, a pier...), and every
// course has one signature moving obstacle: Medieval's windmills, Space's warp portals, Summer's sliding surfboards.
//
// A hole is a closed outline (the green), plus:
//   islands  - solid shapes inside the green (towers, planets, sandcastles); their edges are walls too
//   bumpers  - single wall pieces standing inside the green (fences, panels, breakwaters); a list of
//              [x1, y1, x2, y2], or a chain of points (curved walls) in `chains`
//   rocks    - round obstacles (hedges, asteroids, rocks) {x, y, r}
//   zones    - hills / currents that push the ball {type: 'hill' | 'water', x, y, w, h, dirDeg, strength}
//   obstacles - the course's signature moving pieces (see stepObstacles in the game file)
//   decor    - pictures drawn on and around the hole {e: emoji, x, y, s: size}
// Every wall can be banked off, so every bumper and island edge is part of the angle puzzles.

// ---------------------------------------------------------------- themes
var THEMES = {
  medieval: {
    key: 'medieval', label: tl('Medieval Kingdom', 'Reino medieval'), icon: '🏰',
    blurb: tl('Castles, knights and a dragon. Watch the windmill sails!', 'Castillos, caballeros y un dragón. ¡Cuidado con las aspas del molino!'),
    signature: tl('Windmills: time your shot to slip between the spinning sails.', 'Molinos: calcula el tiro para pasar entre las aspas que giran.'),
    fairwayA: '#4f9a4a', fairwayB: '#62ad59', rough: '#33402a', roughDot: '#3e4d33',
    wall: '#7f8189', wallHi: '#c3c5cc', wallStyle: 'stone',
    island: '#6d7078', islandHi: '#8a8d95',
    bush: '#2a6b2f', bushHi: '#3d8a40', rockStyle: 'hedge',
    water: '#2f6fc0', waterHi: '#78aee8', hill: [150, 95, 50],
    accent: '#c9a227', confetti: ['#c9a227', '#b23a3a', '#2f6fc0', '#e8e2cf']
  },
  space: {
    key: 'space', label: tl('Space Station', 'Estación espacial'), icon: '🚀',
    blurb: tl('Docking bays, black holes and asteroid belts. Warp through the portals!', 'Muelles, agujeros negros y cinturones de asteroides. ¡Viaja por los portales!'),
    signature: tl('Warp portals: roll into a portal and come out of its twin, still going the same way.', 'Portales: entra por un portal y sal por su gemelo, en la misma dirección.'),
    fairwayA: '#2e3f7a', fairwayB: '#38498a', rough: '#060a1c', roughDot: '#ffffff',
    wall: '#2bb8e8', wallHi: '#a8ecff', wallStyle: 'neon',
    island: '#262d45', islandHi: '#3a4466',
    bush: '#77726a', bushHi: '#9b958b', rockStyle: 'asteroid',
    water: '#5b3fd0', waterHi: '#a993ff', hill: [140, 70, 220],
    accent: '#5fe3ff', confetti: ['#5fe3ff', '#ff6ad5', '#ffd166', '#ffffff']
  },
  summer: {
    key: 'summer', label: tl('Summer Beach', 'Playa de verano'), icon: '🏖️',
    blurb: tl('Sandcastles, piers and surf. Dodge the sliding surfboards!', 'Castillos de arena, muelles y olas. ¡Esquiva las tablas de surf!'),
    signature: tl('Surfboards slide back and forth: wait for a gap, or bank off one.', 'Las tablas de surf van y vienen: espera un hueco o rebota en una.'),
    fairwayA: '#46a85f', fairwayB: '#58ba70', rough: '#e8cc8e', roughDot: '#d9b977',
    wall: '#98673a', wallHi: '#d3a56b', wallStyle: 'wood',
    island: '#e2c07a', islandHi: '#f0d699',
    bush: '#7d7a73', bushHi: '#a19d95', rockStyle: 'rock',
    water: '#1fa3c4', waterHi: '#7fe3f5', hill: [205, 160, 90],
    accent: '#ff8a3d', confetti: ['#ff8a3d', '#1fa3c4', '#ffd166', '#ff5d8f']
  },
  practice: {
    key: 'practice', label: tl('Putting Green', 'Green de práctica'), icon: '🎯',
    fairwayA: '#3f9a55', fairwayB: '#66c277', rough: '#256b39', roughDot: '#2c7741',
    wall: '#8a5a34', wallHi: '#b9855a', wallStyle: 'wood',
    island: '#8a5a34', islandHi: '#b9855a',
    bush: '#1f6b34', bushHi: '#2f8c47', rockStyle: 'hedge',
    water: '#2f7bdb', waterHi: '#6db2ff', hill: [150, 95, 50],
    accent: '#3ea158', confetti: ['#3ea158', '#ffd166', '#ffffff']
  }
};

// ---------------------------------------------------------------- shape helpers
function P(x, y) { return { x: x, y: y }; }
function rectPts(x, y, w, h) { return [P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)]; }
// points around a circle or arc (degrees, y-down screen space: 0 = east, 90 = south)
function arcPts(cx, cy, r, a0, a1, n) {
  var out = [];
  for (var i = 0; i <= n; i++) { var a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; out.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); }
  return out;
}
function circlePts(cx, cy, r, n) { return arcPts(cx, cy, r, 0, 360, n).slice(0, n); }
function ellipsePts(cx, cy, rx, ry, n) {
  var out = [];
  for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; out.push(P(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry)); }
  return out;
}
// a corridor of the given half-width along a centerline, as one closed outline
function lanePts(points, w) {
  var c = buildCorridor(points.map(function (p) { return P(p[0], p[1]); }), w);
  return c.left.concat(c.right.slice().reverse());
}
// a rectangle with battlements along its top edge (castle walls, sandcastles)
function crenPts(x, y, w, h, k) {
  var out = [P(x, y + h)], seg = w / (k * 2 - 1);
  for (var i = 0; i < k * 2 - 1; i++) {
    var x0 = x + i * seg, up = i % 2 === 0;
    out.push(P(x0, up ? y : y + 14)); out.push(P(x0 + seg, up ? y : y + 14));
  }
  out.push(P(x + w, y + h));
  return out;
}
function pts(list) { return list.map(function (p) { return P(p[0], p[1]); }); }

// Builds a playable hole from its description: every outline, island and bumper edge becomes a wall.
function makeHole(spec) {
  var walls = [];
  function edges(poly, kind, closed) {
    for (var i = 0; i < poly.length - (closed ? 0 : 1); i++) {
      var a = poly[i], b = poly[(i + 1) % poly.length];
      if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < 0.5) continue;
      walls.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, kind: kind });
    }
  }
  edges(spec.outline, 'rail', true);
  (spec.islands || []).forEach(function (isl) { edges(isl.pts, 'island', true); });
  (spec.bumpers || []).forEach(function (b) { walls.push({ x1: b[0], y1: b[1], x2: b[2], y2: b[3], kind: 'bumper' }); });
  (spec.chains || []).forEach(function (c) { edges(c, 'bumper', false); });
  return {
    par: spec.par, name: spec.name, icon: spec.icon, tip: spec.tip,
    tee: P(spec.tee[0], spec.tee[1]), cup: P(spec.cup[0], spec.cup[1]),
    walls: walls, fairwayPoly: spec.outline,
    islands: spec.islands || [],
    bushes: (spec.rocks || []).map(function (r) { return { x: r[0], y: r[1], r: r[2] }; }),
    zones: spec.zones || [], obstacles: spec.obstacles || [], decor: spec.decor || []
  };
}
function windmill(x, y, r, blades, speed) { return { type: 'windmill', x: x, y: y, r: r, blades: blades, speed: speed }; }
function portal(ax, ay, bx, by, color) { return { type: 'portal', a: P(ax, ay), b: P(bx, by), r: 20, color: color || '#b46bff' }; }
// a board of length len sliding between (x1,y1) and (x2,y2), angled deg, one full trip every `period` seconds
function surfboard(x1, y1, x2, y2, len, deg, period, phase, color) {
  return { type: 'slider', x1: x1, y1: y1, x2: x2, y2: y2, len: len, deg: deg, period: period, phase: phase || 0, color: color || '#ff8a3d' };
}

// ---------------------------------------------------------------- Medieval Kingdom
function buildMedievalCourse() {
  return { key: 'medieval', theme: THEMES.medieval, holes: [
    // 1. The Drawbridge: the green narrows to a bridge over the moat
    makeHole({ par: 2, name: tl('The Drawbridge', 'El puente levadizo'), icon: '🌉',
      tip: tl('Cross the bridge over the moat.', 'Cruza el puente sobre el foso.'),
      outline: pts([[260, 610], [440, 610], [440, 410], [395, 410], [395, 320], [440, 320], [440, 130], [260, 130], [260, 320], [305, 320], [305, 410], [260, 410]]),
      tee: [350, 565], cup: [350, 180],
      zones: [{ type: 'water', x: 305, y: 335, w: 90, h: 60, dirDeg: 0, strength: 0.03 }],
      decor: [{ e: '🏰', x: 350, y: 104, s: 38 }, { e: 'moat', x: 0, y: 320, w: 700, h: 90 }, { e: '🚩', x: 230, y: 150, s: 34 }, { e: '🚩', x: 470, y: 150, s: 34 }, { e: '🛡️', x: 200, y: 520, s: 40 }, { e: '⚔️', x: 500, y: 520, s: 40 }] }),

    // 2. Castle Courtyard: a square yard with a fountain in the middle
    makeHole({ par: 3, name: tl('Castle Courtyard', 'El patio del castillo'), icon: '⛲',
      tip: tl('Bank around the fountain.', 'Rebota alrededor de la fuente.'),
      outline: pts([[160, 160], [560, 160], [560, 560], [250, 560], [250, 625], [160, 625]]),
      islands: [{ pts: circlePts(370, 360, 62, 20), style: 'fountain' }],
      tee: [205, 590], cup: [480, 230],
      decor: [{ e: '⛲', x: 370, y: 360, s: 58 }, { e: '🌹', x: 120, y: 200, s: 30 }, { e: '🌹', x: 600, y: 420, s: 30 }, { e: '🏰', x: 610, y: 600, s: 60 }] }),

    // 3. The Windmill: a four-sailed windmill blocks the lane
    makeHole({ par: 3, name: tl('The Old Windmill', 'El viejo molino'), icon: '🌾',
      tip: tl('Wait for a gap between the sails.', 'Espera un hueco entre las aspas.'),
      outline: pts([[255, 615], [445, 615], [445, 130], [255, 130]]),
      obstacles: [windmill(350, 375, 80, 4, 55)],
      tee: [350, 575], cup: [350, 175],
      decor: [{ e: '🌾', x: 170, y: 260, s: 40 }, { e: '🌾', x: 530, y: 470, s: 40 }, { e: '🐄', x: 160, y: 470, s: 44 }, { e: '🐓', x: 540, y: 240, s: 36 }] }),

    // 4. Jousting Field: a long tilt fence splits the field in two lanes
    makeHole({ par: 3, name: tl('Jousting Field', 'El campo de justas'), icon: '🐎',
      tip: tl('Get around the end of the fence.', 'Rodea el final de la valla.'),
      outline: pts([[80, 255], [620, 255], [620, 485], [80, 485]]),
      bumpers: [[190, 370, 510, 370]],
      tee: [130, 430], cup: [570, 310],
      decor: [{ e: '🐎', x: 350, y: 190, s: 48 }, { e: '🛡️', x: 150, y: 560, s: 40 }, { e: '🏇', x: 520, y: 560, s: 44 }, { e: '🚩', x: 60, y: 230, s: 30 }, { e: '🚩', x: 640, y: 230, s: 30 }] }),

    // 5. The Dragon's Lair: a twisting cave; the cup hides behind a boulder and the dragon's breath pushes the ball
    makeHole({ par: 4, name: tl('The Dragon’s Lair', 'La guarida del dragón'), icon: '🐉',
      tip: tl('The dragon’s breath pushes the ball. The cup hides behind the boulder.', 'El aliento del dragón empuja la bola. El hoyo se esconde tras la roca.'),
      outline: pts([[160, 625], [260, 625], [270, 440], [420, 395], [600, 320], [625, 190], [500, 130], [330, 160], [170, 250]]),
      islands: [{ pts: pts([[395, 215], [470, 200], [505, 248], [462, 292], [405, 278]]), style: 'boulder' }],
      zones: [{ type: 'hill', x: 230, y: 250, w: 130, h: 70, dirDeg: 180, strength: 0.03 }],
      tee: [212, 585], cup: [560, 220],
      decor: [{ e: '🐉', x: 600, y: 470, s: 80 }, { e: '🔥', x: 380, y: 285, s: 26, onGreen: true }, { e: '💰', x: 100, y: 330, s: 34 }, { e: '🦴', x: 420, y: 520, s: 30 }] }),

    // 6. The Wizard's Tower: a round tower room with a curved wall around the cup
    makeHole({ par: 3, name: tl('The Wizard’s Tower', 'La torre del mago'), icon: '🧙',
      tip: tl('Find the opening in the magic wall.', 'Encuentra la abertura del muro mágico.'),
      outline: circlePts(350, 380, 235, 28),
      chains: [arcPts(350, 380, 115, 0, 290, 12)],
      tee: [350, 585], cup: [350, 380],
      decor: [{ e: '🧙', x: 90, y: 160, s: 50 }, { e: '🔮', x: 600, y: 610, s: 38 }, { e: '✨', x: 610, y: 150, s: 34 }, { e: '📜', x: 90, y: 600, s: 34 }] }),

    // 7. The Blacksmith's Forge: a zigzag past the anvil, with hot coals pushing at the turns
    makeHole({ par: 4, name: tl('The Blacksmith’s Forge', 'La forja del herrero'), icon: '⚒️',
      tip: tl('The hot coals push the ball at the corners.', 'Las brasas empujan la bola en las curvas.'),
      outline: lanePts([[150, 575], [555, 575], [555, 395], [145, 395], [145, 200], [575, 200]], 55),
      islands: [{ pts: pts([[315, 380], [395, 380], [380, 410], [330, 410]]), style: 'anvil' }],
      zones: [{ type: 'hill', x: 505, y: 440, w: 100, h: 80, dirDeg: 270, strength: 0.025 },
              { type: 'hill', x: 95, y: 245, w: 100, h: 90, dirDeg: 270, strength: 0.025 }],
      tee: [200, 575], cup: [530, 200],
      decor: [{ e: '⚒️', x: 650, y: 480, s: 40 }, { e: '🔥', x: 60, y: 480, s: 40 }, { e: '🗡️', x: 640, y: 320, s: 36 }, { e: '🛡️', x: 60, y: 120, s: 34 }] }),

    // 8. The Dungeon: three cells with doorways at alternate ends
    makeHole({ par: 4, name: tl('The Dungeon', 'La mazmorra'), icon: '⛓️',
      tip: tl('Find the doorways between the cells.', 'Encuentra las puertas entre las celdas.'),
      outline: pts([[150, 150], [570, 150], [570, 610], [150, 610]]),
      bumpers: [[290, 150, 290, 480], [430, 280, 430, 610]],
      tee: [220, 570], cup: [500, 215],
      decor: [{ e: '⛓️', x: 220, y: 300, s: 34, onGreen: true }, { e: '🗝️', x: 360, y: 560, s: 30, onGreen: true }, { e: '🕯️', x: 100, y: 200, s: 36 }, { e: '🐀', x: 620, y: 560, s: 34 }, { e: '💀', x: 100, y: 470, s: 30 }] }),

    // 9. The Throne Room: a grand hall of pillars with a windmill guarding the throne
    makeHole({ par: 4, name: tl('The Throne Room', 'La sala del trono'), icon: '👑',
      tip: tl('Slip between the pillars and past the spinning sails.', 'Pasa entre los pilares y las aspas que giran.'),
      outline: pts([[200, 625], [500, 625], [540, 560], [540, 140], [160, 140], [160, 560]]),
      rocks: [[235, 290, 17], [465, 290, 17], [235, 440, 17], [465, 440, 17]],
      obstacles: [windmill(350, 280, 70, 3, 70)],
      tee: [350, 585], cup: [350, 180],
      decor: [{ e: '👑', x: 350, y: 95, s: 44 }, { e: 'carpet', x: 320, y: 140, w: 60, h: 485 }, { e: '🚩', x: 110, y: 160, s: 34 }, { e: '🚩', x: 590, y: 160, s: 34 }, { e: '🍗', x: 600, y: 520, s: 34 }, { e: '🏆', x: 100, y: 520, s: 34 }] })
  ] };
}

// ---------------------------------------------------------------- Space Station
function buildSpaceCourse() {
  return { key: 'space', theme: THEMES.space, holes: [
    // 1. Launch Pad: a launch tube with a deflector plate
    makeHole({ par: 2, name: tl('Launch Pad', 'Plataforma de lanzamiento'), icon: '🚀',
      tip: tl('Bank off the deflector plate.', 'Rebota en la placa deflectora.'),
      outline: pts([[270, 615], [430, 615], [430, 130], [270, 130]]),
      bumpers: [[300, 380, 375, 345]],
      tee: [350, 575], cup: [350, 175],
      decor: [{ e: '🚀', x: 160, y: 380, s: 70 }, { e: '🌍', x: 560, y: 520, s: 70 }, { e: '⭐', x: 540, y: 200, s: 26 }] }),

    // 2. The Airlock: two chambers sealed apart; only the portal connects them
    makeHole({ par: 3, name: tl('The Airlock', 'La esclusa'), icon: '🚪',
      tip: tl('The chambers are sealed. Use the portal.', 'Las cámaras están selladas. Usa el portal.'),
      outline: pts([[130, 150], [570, 150], [570, 600], [130, 600]]),
      bumpers: [[130, 375, 570, 375]],
      obstacles: [portal(200, 470, 480, 300, '#b46bff')],
      tee: [470, 555], cup: [230, 215],
      decor: [{ e: '👨‍🚀', x: 620, y: 470, s: 46 }, { e: '🚪', x: 80, y: 375, s: 44 }, { e: '⚠️', x: 620, y: 260, s: 32 }] }),

    // 3. Orbit: a ring around a planet; the cup is on the far side
    makeHole({ par: 3, name: tl('Planet Orbit', 'Órbita planetaria'), icon: '🪐',
      tip: tl('Orbit the planet: bank around it.', 'Orbita el planeta: rebota a su alrededor.'),
      outline: circlePts(350, 385, 232, 28),
      islands: [{ pts: circlePts(350, 385, 95, 22), style: 'planet' }],
      tee: [350, 580], cup: [350, 190],
      decor: [{ e: '🪐', x: 350, y: 385, s: 110, onGreen: true }, { e: '🛰️', x: 90, y: 140, s: 40 }, { e: '🌙', x: 615, y: 615, s: 36 }] }),

    // 4. Asteroid Belt: a field of drifting rocks between the tee and the cup
    makeHole({ par: 3, name: tl('Asteroid Belt', 'Cinturón de asteroides'), icon: '☄️',
      tip: tl('Thread the ball through the asteroids.', 'Pasa la bola entre los asteroides.'),
      outline: pts([[110, 150], [600, 150], [600, 600], [180, 600], [180, 625], [110, 625]]),
      rocks: [[250, 470, 24], [330, 400, 20], [410, 330, 26], [480, 430, 18], [230, 300, 18], [380, 520, 20], [500, 250, 20]],
      tee: [150, 585], cup: [545, 200],
      decor: [{ e: '☄️', x: 640, y: 420, s: 40 }, { e: '🛸', x: 70, y: 330, s: 40 }, { e: '⭐', x: 640, y: 160, s: 24 }] }),

    // 5. Black Hole: gravity fields pull the ball in toward the black hole in the middle
    makeHole({ par: 4, name: tl('The Black Hole', 'El agujero negro'), icon: '🕳️',
      tip: tl('Gravity pulls toward the black hole. Aim around it.', 'La gravedad atrae hacia el agujero negro. Apunta alrededor.'),
      outline: pts([[140, 140], [560, 140], [560, 625], [140, 625]]),
      islands: [{ pts: circlePts(350, 385, 42, 18), style: 'blackhole' }],
      zones: [{ type: 'hill', x: 230, y: 330, w: 70, h: 110, dirDeg: 0, strength: 0.03 },
              { type: 'hill', x: 400, y: 330, w: 70, h: 110, dirDeg: 180, strength: 0.03 },
              { type: 'hill', x: 295, y: 435, w: 110, h: 70, dirDeg: 270, strength: 0.03 },
              { type: 'hill', x: 295, y: 265, w: 110, h: 70, dirDeg: 90, strength: 0.03 }],
      tee: [350, 590], cup: [350, 180],
      decor: [{ e: '🌌', x: 75, y: 380, s: 50 }, { e: '💫', x: 625, y: 380, s: 40 }, { e: '🔭', x: 625, y: 590, s: 36 }] }),

    // 6. Hyperspace Lanes: three sealed lanes linked by one-way portals
    makeHole({ par: 4, name: tl('Hyperspace Lanes', 'Carriles hiperespaciales'), icon: '🌌',
      tip: tl('Each portal jumps you up a lane.', 'Cada portal te sube de carril.'),
      outline: pts([[110, 140], [600, 140], [600, 600], [110, 600]]),
      bumpers: [[110, 295, 600, 295], [110, 450, 600, 450]],
      obstacles: [portal(545, 525, 165, 372, '#ff6ad5'), portal(545, 372, 165, 217, '#5fe3ff')],
      tee: [165, 525], cup: [540, 217],
      decor: [{ e: '🌠', x: 60, y: 220, s: 34 }, { e: '🛸', x: 645, y: 525, s: 36 }, { e: '⚡', x: 60, y: 525, s: 32 }] }),

    // 7. Satellite Dish: a curved dish wall bounces shots in toward the cup
    makeHole({ par: 3, name: tl('Satellite Dish', 'La antena parabólica'), icon: '📡',
      tip: tl('The shield blocks the middle. Bank in off the dish.', 'El escudo tapa el centro. Rebota en la antena.'),
      outline: pts([[130, 140], [570, 140], [570, 610], [130, 610]]),
      chains: [arcPts(350, 330, 170, 200, 340, 12)],
      islands: [{ pts: rectPts(300, 420, 100, 26), style: 'panel' }],
      tee: [350, 570], cup: [350, 300],
      decor: [{ e: '📡', x: 70, y: 380, s: 44 }, { e: '📶', x: 630, y: 380, s: 32 }, { e: '🌍', x: 620, y: 620, s: 40 }] }),

    // 8. Solar Array: rows of tilted solar panels to bank between
    makeHole({ par: 4, name: tl('Solar Array', 'Paneles solares'), icon: '☀️',
      tip: tl('Each tilted panel is a wall to bank off.', 'Cada panel inclinado es una pared para rebotar.'),
      outline: pts([[120, 140], [590, 140], [590, 610], [190, 610], [190, 625], [120, 625]]),
      bumpers: [[200, 250, 260, 290], [330, 290, 390, 250], [460, 250, 520, 290],
                [200, 420, 260, 380], [330, 380, 390, 420], [460, 420, 520, 380],
                [260, 520, 320, 550], [400, 550, 460, 520]],
      tee: [155, 590], cup: [545, 185],
      decor: [{ e: '☀️', x: 640, y: 120, s: 46 }, { e: '🔋', x: 640, y: 420, s: 34 }, { e: '🛰️', x: 60, y: 300, s: 38 }] }),

    // 9. Mission Control: a U-shaped station with a portal shortcut across the middle
    makeHole({ par: 5, name: tl('Mission Control', 'Control de misión'), icon: '🛰️',
      tip: tl('Go the long way round, or find the portal shortcut.', 'Da la vuelta larga o busca el atajo del portal.'),
      outline: lanePts([[150, 590], [150, 175], [550, 175], [550, 590]], 58),
      rocks: [[300, 175, 16], [400, 175, 16]],
      obstacles: [portal(150, 300, 550, 340, '#ffd166')],
      tee: [150, 560], cup: [550, 560],
      decor: [{ e: '🖥️', x: 350, y: 420, s: 50 }, { e: '👨‍🚀', x: 280, y: 520, s: 40 }, { e: '🎛️', x: 420, y: 520, s: 36 }, { e: '🌕', x: 640, y: 110, s: 36 }] })
  ] };
}

// ---------------------------------------------------------------- Summer Beach
function buildSummerCourse() {
  return { key: 'summer', theme: THEMES.summer, holes: [
    // 1. Beach Day: a wide green with one surfboard sliding across
    makeHole({ par: 2, name: tl('Beach Day', 'Día de playa'), icon: '⛱️',
      tip: tl('Time your shot past the surfboard.', 'Calcula el tiro para pasar la tabla.'),
      outline: pts([[230, 615], [470, 615], [470, 135], [230, 135]]),
      obstacles: [surfboard(255, 375, 445, 375, 90, 0, 3.2, 0, '#ff8a3d')],
      tee: [350, 575], cup: [350, 180],
      decor: [{ e: '⛱️', x: 130, y: 250, s: 54 }, { e: '🐚', x: 570, y: 470, s: 34 }, { e: '👙', x: 140, y: 520, s: 34 }, { e: '☀️', x: 590, y: 160, s: 46 }] }),

    // 2. Sandcastle: a big sandcastle sits between the tee and the cup
    makeHole({ par: 3, name: tl('The Sandcastle', 'El castillo de arena'), icon: '🏝️',
      tip: tl('Bank around the sandcastle.', 'Rebota alrededor del castillo de arena.'),
      outline: pts([[140, 150], [560, 150], [560, 600], [140, 600]]),
      islands: [{ pts: crenPts(255, 300, 190, 120, 4), style: 'sandcastle' }],
      tee: [350, 560], cup: [350, 210],
      decor: [{ e: '🏝️', x: 80, y: 520, s: 40 }, { e: '🏖️', x: 620, y: 300, s: 44 }, { e: '🦀', x: 610, y: 560, s: 34 }] }),

    // 3. Tide Pools: currents run up and down across the green
    makeHole({ par: 3, name: tl('Tide Pools', 'Pozas de marea'), icon: '🦀',
      tip: tl('The currents push the ball up and down.', 'Las corrientes empujan la bola arriba y abajo.'),
      outline: pts([[100, 200], [600, 200], [600, 550], [100, 550]]),
      zones: [{ type: 'water', x: 215, y: 200, w: 85, h: 350, dirDeg: 90, strength: 0.025 },
              { type: 'water', x: 400, y: 200, w: 85, h: 350, dirDeg: 270, strength: 0.025 }],
      rocks: [[350, 300, 16], [350, 450, 16]],
      tee: [145, 375], cup: [555, 375],
      decor: [{ e: '🦀', x: 160, y: 140, s: 38 }, { e: '⭐', x: 540, y: 610, s: 30 }, { e: '🐚', x: 350, y: 620, s: 30 }] }),

    // 4. The Pier: a long narrow pier out to a T-shaped end
    makeHole({ par: 3, name: tl('The Pier', 'El muelle'), icon: '🎣',
      tip: tl('A surfboard slides across the end of the pier.', 'Una tabla se desliza al final del muelle.'),
      outline: pts([[310, 615], [390, 615], [390, 230], [520, 230], [520, 140], [180, 140], [180, 230], [310, 230]]),
      obstacles: [surfboard(200, 185, 500, 185, 70, 90, 3.6, 0.5, '#1fa3c4')],
      tee: [350, 580], cup: [470, 185],
      decor: [{ e: 'ocean', x: 0, y: 0, w: 700, h: 700 }, { e: '🎣', x: 250, y: 420, s: 44 }, { e: '🐬', x: 520, y: 430, s: 50 }, { e: '⛵', x: 600, y: 260, s: 40 }] }),

    // 5. Surf's Up: three rows of surfboards sliding at different speeds
    makeHole({ par: 4, name: tl('Surf’s Up', '¡A surfear!'), icon: '🏄',
      tip: tl('Three surfboards, three speeds. Watch the gaps.', 'Tres tablas, tres velocidades. Mira los huecos.'),
      outline: pts([[150, 140], [550, 140], [550, 615], [150, 615]]),
      obstacles: [surfboard(175, 260, 525, 260, 100, 0, 3.0, 0, '#ff8a3d'),
                  surfboard(525, 380, 175, 380, 100, 0, 4.2, 0.3, '#ff5d8f'),
                  surfboard(175, 500, 525, 500, 100, 0, 2.4, 0.6, '#1fa3c4')],
      tee: [350, 580], cup: [350, 185],
      decor: [{ e: '🏄', x: 80, y: 380, s: 50 }, { e: '🌊', x: 620, y: 260, s: 44 }, { e: '🌊', x: 620, y: 500, s: 44 }] }),

    // 6. Lighthouse Point: a pointed headland with the lighthouse in the way
    makeHole({ par: 3, name: tl('Lighthouse Point', 'Punta del faro'), icon: '🗼',
      tip: tl('Bank off the slanted shore around the lighthouse.', 'Rebota en la orilla inclinada alrededor del faro.'),
      outline: pts([[130, 610], [570, 610], [430, 220], [350, 135], [270, 220]]),
      islands: [{ pts: circlePts(350, 420, 38, 16), style: 'lighthouse' }],
      tee: [350, 575], cup: [350, 200],
      decor: [{ e: '🗼', x: 350, y: 410, s: 54, onGreen: true }, { e: 'ocean', x: 0, y: 0, w: 700, h: 700 }, { e: '⛵', x: 140, y: 240, s: 40 }, { e: '🐳', x: 570, y: 280, s: 50 }] }),

    // 7. Boardwalk Arcade: an S-shaped boardwalk lined with pinball posts
    makeHole({ par: 4, name: tl('Boardwalk Arcade', 'Las atracciones del paseo'), icon: '🎡',
      tip: tl('Ping off the posts like a pinball.', 'Rebota en los postes como en un pinball.'),
      outline: lanePts([[150, 580], [545, 580], [545, 395], [160, 395], [160, 200], [565, 200]], 58),
      rocks: [[350, 560, 12], [430, 600, 12], [300, 410, 12], [400, 380, 12], [330, 215, 12]],
      tee: [205, 580], cup: [530, 200],
      decor: [{ e: '🎡', x: 640, y: 470, s: 54 }, { e: '🍦', x: 60, y: 470, s: 36 }, { e: '🎠', x: 640, y: 300, s: 40 }, { e: '🌭', x: 60, y: 300, s: 34 }] }),

    // 8. Snorkel Reef: a reef-shaped lagoon with coral to bank around
    makeHole({ par: 3, name: tl('Snorkel Reef', 'El arrecife'), icon: '🐠',
      tip: tl('Weave between the coral.', 'Zigzaguea entre los corales.'),
      outline: ellipsePts(350, 380, 255, 225, 30),
      islands: [{ pts: pts([[250, 300], [300, 280], [320, 330], [275, 360]]), style: 'coral' },
                { pts: pts([[400, 400], [455, 390], [460, 450], [410, 460]]), style: 'coral' },
                { pts: pts([[330, 470], [370, 490], [345, 530], [310, 510]]), style: 'coral' }],
      zones: [{ type: 'water', x: 230, y: 380, w: 140, h: 60, dirDeg: 0, strength: 0.02 }],
      tee: [140, 380], cup: [555, 380],
      decor: [{ e: '🐠', x: 300, y: 220, s: 34, onGreen: true }, { e: '🐢', x: 460, y: 300, s: 36, onGreen: true }, { e: '🐟', x: 620, y: 610, s: 38 }, { e: '🐙', x: 80, y: 610, s: 40 }] }),

    // 9. Sunset Finale: a long winding boardwalk with surfboards and a tide current
    makeHole({ par: 5, name: tl('Sunset Finale', 'Final al atardecer'), icon: '🌅',
      tip: tl('One last ride: surfboards, currents and corners.', 'Un último paseo: tablas, corrientes y curvas.'),
      outline: lanePts([[580, 575], [165, 575], [165, 385], [540, 385], [540, 190], [165, 190]], 55),
      obstacles: [surfboard(380, 525, 380, 625, 70, 0, 3.0, 0, '#ff5d8f'), surfboard(320, 340, 320, 430, 70, 0, 2.6, 0.5, '#ff8a3d')],
      zones: [{ type: 'water', x: 230, y: 145, w: 160, h: 90, dirDeg: 0, strength: 0.02 }],
      tee: [550, 575], cup: [200, 190],
      decor: [{ e: '🌅', x: 350, y: 95, s: 50 }, { e: '🍹', x: 640, y: 380, s: 36 }, { e: '🎆', x: 60, y: 300, s: 40 }, { e: '🌴', x: 640, y: 160, s: 44 }] })
  ] };
}

var COURSES = [buildMedievalCourse(), buildSpaceCourse(), buildSummerCourse()];

// Reset progress (the button below the game): erases this game's saved records on this device
(function () {
  var btn = document.getElementById('reset-progress-btn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    if (!confirm(tl('Reset your Bank Shot: Angle Golf progress? This erases your best scores, stars and holes in one on this device. This cannot be undone.',
      '¿Borrar tu progreso de Bank Shot: golf de ángulos? Se borran tus mejores marcas, estrellas y hoyos en uno en este dispositivo. No se puede deshacer.'))) return;
    ['bankshot_records', 'bankshot_rounds', 'bankshot_hole_in_ones', 'bankshot_under_par'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    location.reload();
  });
})();
