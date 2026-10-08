// Bank Shot: Angle Golf - the drawn scenery around each hole.
// Each hole names its ground (grass, flagstones, a cave, space, sand, a reef...) and a list of props to
// place around it. The props are drawn here with simple shapes (towers, tents, a dragon, rockets, a space
// station, palm trees, crabs, boats...), fitted into the open ground around the hole's outline so nothing
// covers the green. The same hole always gets the same picture (a seeded random).

function sceneRng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function scenePip(x, y, poly) {
  var c = false;
  for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    var a = poly[i], b = poly[j];
    if (((a.y > y) !== (b.y > y)) && (x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x)) c = !c;
  }
  return c;
}
function sceneEdgeDist(x, y, poly) {
  var best = 1e9;
  for (var i = 0; i < poly.length; i++) {
    var a = poly[i], b = poly[(i + 1) % poly.length], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    var t = l2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2)) : 0;
    var d = Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
    if (d < best) best = d;
  }
  return best;
}

// how big each prop is (its footprint radius) by default
var PROP_SIZE = {
  tower: 34, wall: 40, tree: 26, pine: 22, bush: 15, flowers: 14, tent: 32, banner: 18, hay: 16, well: 22, barrel: 12,
  rock: 14, treasure: 20, bones: 12, campfire: 16, fence: 26, dragon: 60, sheep: 14, wheat: 26, torch: 10, crystal: 16,
  cauldron: 18,
  rocket: 44, module: 40, solar: 34, dish: 26, satellite: 20, planet: 46, moon: 28, asteroid: 16, beacon: 9, comet: 30,
  astronaut: 18, crate: 14,
  palm: 34, umbrella: 26, towel: 20, sandcastle: 26, shell: 8, starfish: 9, ball: 10, bucket: 10, crab: 12, lifeguard: 30,
  boat: 30, buoy: 9, wave: 20, surfboard: 14, seagull: 10, cooler: 12, stall: 32, coral: 16, fish: 10
};
// props that sit in water (on a sea hole they go on the water, everything else needs land)
var WATER_PROPS = { boat: 1, buoy: 1, wave: 1, fish: 1, coral: 1 };
var FLYING_PROPS = { seagull: 1, comet: 1 };
var SCENE_SCALE = 1.35;   // every prop is drawn a third bigger than its base size
var SCENE_FILLERS = {
  grass: ['bush', 'flowers', 'rock', 'flowers'], stone: ['barrel', 'rock'], cave: ['rock', 'bones'],
  space: ['asteroid', 'beacon'], void: ['asteroid'], sand: ['shell', 'starfish', 'shell', 'rock'],
  sunset: ['shell', 'starfish'], ocean: ['wave', 'fish'], reef: ['fish', 'coral'], boardwalk: ['ball', 'cooler']
};

// ---------------------------------------------------------------- grounds
function drawSceneGround(g, h, th, rnd) {
  var k, ground = h.ground || th.ground || 'grass';
  g.noStroke();
  if (ground === 'grass') {
    g.fill('#3f5a32'); g.rect(0, 0, 700, 700);
    for (k = 0; k < 26; k++) { g.fill(70 + rnd() * 30, 110 + rnd() * 30, 55, 60); g.ellipse(rnd() * 700, rnd() * 700, 60 + rnd() * 120, 40 + rnd() * 80); }
    g.strokeWeight(2);
    for (k = 0; k < 260; k++) {
      var gx = rnd() * 700, gy = rnd() * 700;
      g.stroke(90 + rnd() * 40, 140 + rnd() * 40, 70, 150); g.line(gx, gy, gx - 3, gy - 7); g.line(gx, gy, gx + 3, gy - 6);
    }
    g.noStroke();
    for (k = 0; k < 40; k++) { g.fill(['#f4e285', '#f28fb0', '#ffffff', '#c9a2f2'][k % 4]); g.circle(rnd() * 700, rnd() * 700, 3.5); }
  } else if (ground === 'stone') {   // castle flagstones
    g.fill('#4a4a52'); g.rect(0, 0, 700, 700);
    for (var y = 0; y < 700; y += 34) for (var x = -(y / 34 % 2) * 26; x < 700; x += 52) {
      var v = 70 + rnd() * 22; g.fill(v, v, v + 8); g.rect(x + 2, y + 2, 48, 30, 4);
    }
  } else if (ground === 'cave') {
    g.fill('#2b2420'); g.rect(0, 0, 700, 700);
    for (k = 0; k < 70; k++) { g.fill(60 + rnd() * 30, 48 + rnd() * 20, 40, 120); g.ellipse(rnd() * 700, rnd() * 700, 30 + rnd() * 90, 20 + rnd() * 60); }
    for (k = 0; k < 30; k++) { g.fill(255, 120, 40, 18); g.circle(rnd() * 700, rnd() * 700, 40 + rnd() * 60); }   // the glow of the dragon's fire
  } else if (ground === 'space' || ground === 'void') {
    g.fill(ground === 'void' ? '#040212' : '#060a1c'); g.rect(0, 0, 700, 700);
    var neb = ground === 'void' ? [[150, 60, 220], [220, 60, 160]] : [[60, 80, 200], [130, 60, 210], [40, 140, 200]];
    for (k = 0; k < 18; k++) { var nc = neb[k % neb.length]; g.fill(nc[0], nc[1], nc[2], 14); g.ellipse(rnd() * 700, rnd() * 700, 160 + rnd() * 260, 100 + rnd() * 180); }
    for (k = 0; k < 220; k++) { g.fill(255, 255, 255, 60 + rnd() * 190); g.circle(rnd() * 700, rnd() * 700, rnd() < 0.08 ? 2.8 : 1.3); }
    for (k = 0; k < 6; k++) {   // bright twinkles
      var sx = rnd() * 700, sy = rnd() * 700; g.stroke(255, 255, 255, 160); g.strokeWeight(1); g.line(sx - 5, sy, sx + 5, sy); g.line(sx, sy - 5, sx, sy + 5); g.noStroke();
    }
  } else if (ground === 'sand' || ground === 'sunset') {
    g.fill('#e8cc8e'); g.rect(0, 0, 700, 700);
    g.noFill(); g.strokeWeight(1.5);
    for (k = 0; k < 90; k++) { g.stroke(200, 170, 110, 90); var rx = rnd() * 700, ry = rnd() * 700; g.arc(rx, ry, 40 + rnd() * 30, 10, 200, 340); }
    g.noStroke();
    for (k = 0; k < 260; k++) { g.fill(210, 180, 120, 120); g.circle(rnd() * 700, rnd() * 700, 1.5 + rnd() * 2.5); }
    if (ground === 'sunset') { for (k = 0; k < 20; k++) { g.fill(255, 120, 60, 9); g.rect(0, 0, 700, 40 + k * 30); } }
  } else if (ground === 'reef') {
    g.fill('#2bb3c9'); g.rect(0, 0, 700, 700);
    for (k = 0; k < 40; k++) { g.fill(255, 255, 255, 18); g.ellipse(rnd() * 700, rnd() * 700, 80 + rnd() * 140, 20 + rnd() * 30); }
    for (k = 0; k < 120; k++) { g.fill(240, 220, 170, 120); g.circle(rnd() * 700, rnd() * 700, 2 + rnd() * 3); }
  } else if (ground === 'ocean') {
    g.fill('#1593b8'); g.rect(0, 0, 700, 700);
    g.noFill(); g.strokeWeight(2);
    for (k = 0; k < 60; k++) { g.stroke(255, 255, 255, 50 + rnd() * 60); g.arc(rnd() * 700, rnd() * 700, 22 + rnd() * 20, 10, 200, 340); }
    g.noStroke();
  } else if (ground === 'boardwalk') {
    g.fill('#9c6b3f'); g.rect(0, 0, 700, 700);
    for (var py = 0; py < 700; py += 18) { g.fill(140 + rnd() * 30, 95 + rnd() * 20, 55, 255); g.rect(0, py + 1, 700, 16); g.fill(80, 50, 25, 120); for (var px = rnd() * 80; px < 700; px += 120 + rnd() * 60) g.rect(px, py + 1, 2, 16); }
  }
  // the sea along the top of a beach hole
  if (h.seaTop) {
    g.fill('#1fa3c4'); g.rect(0, 0, 700, h.seaTop);
    g.fill('#57c9e0'); g.rect(0, h.seaTop - 18, 700, 10);
    g.fill(255, 255, 255, 200);
    for (var fx = 0; fx < 700; fx += 26) g.ellipse(fx + 13, h.seaTop - 4, 30, 9);
    g.stroke(255, 255, 255, 110); g.strokeWeight(2); g.noFill();
    for (k = 0; k < 16; k++) g.arc(rnd() * 700, 20 + rnd() * (h.seaTop - 50), 26, 9, 200, 340);
    g.noStroke();
  }
  // a castle wall along the top of a medieval hole
  if (h.castleTop) {
    var cy = h.castleTop;
    g.fill('#6e6f78'); g.rect(0, 0, 700, cy);
    for (var bx = 0; bx < 700; bx += 40) { g.fill('#82838c'); g.rect(bx + 3, cy - 18, 26, 18); }
    g.fill('#5a5b63'); for (var wy = 6; wy < cy - 18; wy += 16) for (var wx = (wy % 32) ? 0 : 20; wx < 700; wx += 40) g.rect(wx + 1, wy, 38, 14, 2);
    g.fill(0, 0, 0, 60); g.rect(0, cy, 700, 8);
  }
}

// ---------------------------------------------------------------- props
function propShadow(g, x, y, w, hh) { g.noStroke(); g.fill(0, 0, 0, 60); g.ellipse(x + 4, y + 4, w, hh); }

function drawProp(g, type, x, y, s, rnd) {
  var k = s / (PROP_SIZE[type] || 20);   // scale factor against the default size
  g.push(); g.translate(x, y); g.scale(k); g.noStroke();
  var D = SCENE_DRAW[type];
  if (D) D(g, rnd);
  g.pop();
}

var SCENE_DRAW = {
  // ---- medieval
  tower: function (g, r) {
    propShadow(g, 0, 30, 70, 22);
    g.fill('#8d8f98'); g.rect(-26, -20, 52, 50); g.ellipse(0, 30, 52, 14);
    g.fill('#a3a5ad'); g.rect(-26, -20, 14, 50);
    g.stroke(70, 72, 80, 120); g.strokeWeight(1.2);
    for (var yy = -12; yy < 30; yy += 10) g.line(-26, yy, 26, yy);
    g.noStroke();
    g.fill('#3a2a1a'); g.rect(-6, 12, 12, 18, 6, 6, 0, 0);
    g.fill('#1b1b22'); g.rect(-4, -8, 8, 10, 4, 4, 0, 0);
    var roof = r() < 0.5 ? '#b23a3a' : '#2f5fb3';
    g.fill(roof); g.triangle(-32, -18, 32, -18, 0, -62);
    g.fill(255, 255, 255, 40); g.triangle(-32, -18, -8, -18, 0, -62);
    g.stroke('#4a3a2a'); g.strokeWeight(2); g.line(0, -62, 0, -80); g.noStroke();
    g.fill(r() < 0.5 ? '#f2c94c' : '#e8e8e8'); g.triangle(0, -80, 18, -75, 0, -70);
  },
  wall: function (g) {
    propShadow(g, 0, 14, 90, 12);
    g.fill('#7f8189'); g.rect(-40, -12, 80, 26);
    for (var i = 0; i < 5; i++) g.rect(-40 + i * 18, -22, 10, 10);
    g.stroke(60, 62, 70, 110); g.strokeWeight(1); g.line(-40, 0, 40, 0); g.noStroke();
  },
  tree: function (g, r) {
    propShadow(g, 0, 20, 52, 16);
    g.fill('#6b4423'); g.rect(-5, 0, 10, 22, 2);
    var c = [['#2f6b2f', '#3f8a3a', '#5aa64a'], ['#356b28', '#4b8a33', '#6aa84a']][r() < 0.5 ? 0 : 1];
    g.fill(c[0]); g.circle(-12, -6, 30); g.circle(12, -6, 30); g.circle(0, -20, 34);
    g.fill(c[1]); g.circle(-6, -14, 22); g.circle(8, -18, 18);
    g.fill(c[2]); g.circle(-8, -22, 10);
    if (r() < 0.4) { g.fill('#c0392b'); g.circle(6, -8, 5); g.circle(-10, -2, 5); }   // apples
  },
  pine: function (g) {
    propShadow(g, 0, 22, 40, 12);
    g.fill('#5a3a1e'); g.rect(-3, 10, 6, 14);
    g.fill('#1f4d2b'); g.triangle(-20, 14, 20, 14, 0, -10); g.triangle(-16, 2, 16, 2, 0, -22); g.triangle(-12, -10, 12, -10, 0, -32);
    g.fill(255, 255, 255, 30); g.triangle(-20, 14, -2, 14, 0, -10);
  },
  bush: function (g) {
    propShadow(g, 0, 8, 34, 10);
    g.fill('#2e6b30'); g.circle(-8, 0, 18); g.circle(8, 0, 18); g.circle(0, -6, 20);
    g.fill('#4a9142'); g.circle(-4, -8, 9);
  },
  flowers: function (g, r) {
    var cols = ['#f28fb0', '#f4e285', '#ffffff', '#c9a2f2', '#ff7b54'];
    g.fill('#3e7a34'); g.ellipse(0, 4, 30, 14);
    for (var i = 0; i < 9; i++) {
      var a = r() * 360, d = r() * 11, fx = Math.cos(a * Math.PI / 180) * d, fy = Math.sin(a * Math.PI / 180) * d * 0.5;
      g.fill(cols[i % cols.length]); for (var p = 0; p < 5; p++) g.circle(fx + Math.cos(p * 72 * Math.PI / 180) * 2.4, fy + Math.sin(p * 72 * Math.PI / 180) * 2.4, 3.2);
      g.fill('#f2c94c'); g.circle(fx, fy, 2);
    }
  },
  tent: function (g, r) {
    propShadow(g, 0, 22, 70, 16);
    var c = r() < 0.5 ? ['#b23a3a', '#f2ead3'] : ['#2f5fb3', '#f2ead3'];
    for (var i = 0; i < 6; i++) { g.fill(c[i % 2]); g.quad(0, -30, 0, -30, -30 + i * 10, 22, -20 + i * 10, 22); }
    g.fill(c[0]); g.triangle(-30, 22, -30, 22, 0, -30);
    g.fill('#3a2a1a'); g.triangle(-7, 22, 7, 22, 0, 4);
    g.stroke('#4a3a2a'); g.strokeWeight(2); g.line(0, -30, 0, -44); g.noStroke();
    g.fill('#f2c94c'); g.triangle(0, -44, 14, -40, 0, -36);
  },
  banner: function (g, r) {
    propShadow(g, 0, 24, 20, 6);
    g.stroke('#5a3a1e'); g.strokeWeight(3); g.line(0, 24, 0, -30); g.line(-12, -26, 12, -26); g.noStroke();
    var c = ['#b23a3a', '#2f5fb3', '#3e8a4a', '#7a3fb3'][Math.floor(r() * 4)];
    g.fill(c); g.beginShape(); g.vertex(-11, -26); g.vertex(11, -26); g.vertex(11, 6); g.vertex(0, 0); g.vertex(-11, 6); g.endShape(CLOSE);
    g.fill('#f2c94c'); g.circle(0, -14, 9);
  },
  hay: function (g) {
    propShadow(g, 0, 10, 36, 10);
    g.fill('#d9b44a'); g.rect(-16, -10, 32, 20, 6);
    g.stroke(170, 130, 40); g.strokeWeight(1.2); for (var i = -12; i <= 12; i += 6) g.line(i, -8, i + 2, 8); g.noStroke();
    g.fill('#8a5a2a'); g.rect(-16, -3, 32, 3);
  },
  well: function (g) {
    propShadow(g, 0, 14, 50, 16);
    g.fill('#7f8189'); g.ellipse(0, 6, 40, 18); g.fill('#1f3a6b'); g.ellipse(0, 4, 28, 10);
    g.stroke('#5a3a1e'); g.strokeWeight(3); g.line(-16, 4, -16, -26); g.line(16, 4, 16, -26); g.noStroke();
    g.fill('#8a3a2a'); g.triangle(-24, -22, 24, -22, 0, -38);
  },
  barrel: function (g) {
    propShadow(g, 0, 10, 26, 8);
    g.fill('#8a5a2a'); g.rect(-10, -12, 20, 22, 5); g.fill('#a8743a'); g.ellipse(0, -12, 20, 7);
    g.fill('#4a3a2a'); g.rect(-10, -6, 20, 2.5); g.rect(-10, 4, 20, 2.5);
  },
  rock: function (g, r) {
    propShadow(g, 0, 6, 30, 10);
    var v = 110 + r() * 30; g.fill(v, v - 4, v - 10);
    g.beginShape(); g.vertex(-14, 6); g.vertex(-10, -6); g.vertex(0, -11); g.vertex(12, -5); g.vertex(14, 6); g.endShape(CLOSE);
    g.fill(255, 255, 255, 50); g.triangle(-10, -6, 0, -11, -3, -2);
  },
  treasure: function (g) {
    propShadow(g, 0, 12, 46, 12);
    g.fill('#d4a017'); g.ellipse(0, 6, 40, 14);
    for (var i = 0; i < 9; i++) { g.fill(i % 2 ? '#f2c94c' : '#e0b030'); g.ellipse(-14 + (i * 7) % 28, 2 - (i % 3) * 3, 9, 5); }
    g.fill('#6b4423'); g.rect(-10, -16, 20, 14, 3); g.fill('#f2c94c'); g.rect(-10, -11, 20, 2); g.rect(-2, -12, 4, 5);
    g.fill('#4fd1ff'); g.circle(12, -2, 5); g.fill('#ff5d8f'); g.circle(-14, -1, 5);
  },
  bones: function (g, r) {
    g.push(); g.rotate(r() * 180);
    g.fill('#eee6d2'); g.rect(-9, -1.5, 18, 3); g.circle(-9, -2, 4); g.circle(-9, 2, 4); g.circle(9, -2, 4); g.circle(9, 2, 4);
    g.pop();
  },
  campfire: function (g) {
    propShadow(g, 0, 8, 36, 10);
    g.fill(255, 140, 40, 40); g.circle(0, -4, 44);
    g.stroke('#5a3a1e'); g.strokeWeight(4); g.line(-12, 8, 12, 2); g.line(-12, 2, 12, 8); g.noStroke();
    g.fill('#ff5a1f'); g.triangle(-9, 4, 9, 4, 0, -20);
    g.fill('#ffb02e'); g.triangle(-5, 4, 5, 4, 0, -11);
    g.fill('#fff1a8'); g.triangle(-2, 4, 2, 4, 0, -4);
  },
  fence: function (g) {
    propShadow(g, 0, 8, 56, 6);
    g.fill('#8a5a2a');
    for (var i = -24; i <= 24; i += 12) g.rect(i - 2, -12, 4, 18, 1);
    g.rect(-26, -8, 52, 3); g.rect(-26, -1, 52, 3);
  },
  dragon: function (g) {
    propShadow(g, 0, 26, 110, 26);
    g.fill('#2f7a3f');
    g.beginShape(); g.vertex(30, 10); g.vertex(70, 20); g.vertex(78, 6); g.vertex(66, 14); g.vertex(36, 0); g.endShape(CLOSE);   // tail
    g.fill('#3d9450'); g.ellipse(10, 6, 70, 40);                                            // body
    g.fill('#2a6a37'); g.triangle(-4, -4, 36, -6, 6, -58); g.triangle(16, -4, 44, -2, 40, -46);   // wings
    g.fill('#4fae5f'); g.ellipse(14, 12, 44, 18);                                           // belly
    g.fill('#3d9450'); g.ellipse(-30, -14, 30, 24); g.rect(-30, -14, 20, 18);               // neck and head
    g.fill('#f2c94c'); g.triangle(-36, -26, -30, -24, -32, -36); g.triangle(-26, -26, -20, -24, -22, -36);   // horns
    g.fill('#fff'); g.circle(-34, -16, 7); g.fill('#111'); g.circle(-35, -16, 3);
    g.fill('#ff5a1f'); g.triangle(-44, -8, -44, -2, -70, -12); g.fill('#ffb02e'); g.triangle(-44, -7, -44, -3, -60, -9);   // fire
    g.fill('#2a6a37'); for (var i = 0; i < 4; i++) g.triangle(-6 + i * 12, -12, 2 + i * 12, -12, -2 + i * 12, -20);       // spikes
  },
  sheep: function (g) {
    propShadow(g, 0, 10, 30, 8);
    g.fill('#2a2a2a'); g.rect(-8, 4, 3, 8); g.rect(5, 4, 3, 8);
    g.fill('#f4f1ea'); g.circle(-6, 0, 14); g.circle(4, -2, 16); g.circle(8, 3, 12); g.circle(-2, 4, 12);
    g.fill('#2a2a2a'); g.ellipse(-13, -2, 9, 10); g.fill('#fff'); g.circle(-15, -3, 2);
  },
  wheat: function (g, r) {
    g.fill('#c9a347'); g.ellipse(0, 0, 60, 36);
    g.stroke('#e3c35a'); g.strokeWeight(1.5);
    for (var i = 0; i < 26; i++) { var wx = (r() - 0.5) * 50, wy = (r() - 0.5) * 28; g.line(wx, wy + 5, wx + 1, wy - 5); }
    g.noStroke();
  },
  torch: function (g) {
    g.fill(255, 150, 40, 45); g.circle(0, -14, 30);
    g.fill('#5a3a1e'); g.rect(-2, -8, 4, 22);
    g.fill('#ff5a1f'); g.triangle(-5, -8, 5, -8, 0, -22); g.fill('#ffd166'); g.triangle(-2, -8, 2, -8, 0, -15);
  },
  crystal: function (g, r) {
    var c = r() < 0.5 ? [150, 90, 255] : [80, 200, 255];
    g.fill(c[0], c[1], c[2], 50); g.circle(0, -4, 34);
    g.fill(c[0], c[1], c[2]); g.quad(-4, 8, 4, 8, 3, -18, -3, -18); g.quad(-12, 8, -5, 8, -9, -8, -13, -6); g.quad(5, 8, 12, 8, 13, -6, 9, -10);
    g.fill(255, 255, 255, 120); g.triangle(-3, -18, 0, -18, -1, 4);
  },
  cauldron: function (g) {
    propShadow(g, 0, 12, 40, 10);
    g.fill('#2a2a30'); g.ellipse(0, 2, 36, 26); g.fill('#3fd96b'); g.ellipse(0, -8, 30, 9);
    g.fill(120, 255, 150, 160); g.circle(-6, -14, 7); g.circle(4, -18, 5); g.circle(8, -12, 4);
    g.fill(255, 140, 40); g.triangle(-10, 14, -4, 14, -7, 8); g.triangle(4, 14, 10, 14, 7, 8);
  },

  // ---- space
  rocket: function (g) {
    propShadow(g, 0, 40, 50, 12);
    g.fill('#ff8a3d'); g.triangle(-8, 34, 8, 34, 0, 56); g.fill('#ffd166'); g.triangle(-4, 34, 4, 34, 0, 48);
    g.fill('#e8edf5'); g.rect(-12, -22, 24, 56, 10, 10, 4, 4);
    g.fill('#d64545'); g.triangle(-12, 14, -12, 34, -24, 34); g.triangle(12, 14, 12, 34, 24, 34); g.triangle(-12, -18, 12, -18, 0, -44);
    g.fill('#2b8ad6'); g.circle(0, -2, 13); g.fill(255, 255, 255, 120); g.circle(-2, -4, 4);
    g.fill('#b8c2d1'); g.rect(-12, 24, 24, 4);
  },
  module: function (g, r) {
    propShadow(g, 0, 22, 90, 16);
    g.fill('#c9d2e0'); g.rect(-40, -16, 80, 34, 12);
    g.fill('#a9b4c6'); g.rect(-40, 6, 80, 12, 0, 0, 12, 12);
    g.stroke(130, 140, 160); g.strokeWeight(1); for (var i = -26; i <= 26; i += 13) g.line(i, -16, i, 18); g.noStroke();
    for (var w = -30; w <= 30; w += 15) { g.fill('#203a6b'); g.circle(w, -4, 7); g.fill(120, 220, 255, 150); g.circle(w - 1, -5, 3); }
    g.fill('#8a95a8'); g.rect(-48, -6, 8, 14, 2); g.rect(40, -6, 8, 14, 2);
    g.fill(r() < 0.5 ? '#ff5d8f' : '#5fe3ff'); g.circle(30, -12, 4);
  },
  solar: function (g) {
    propShadow(g, 0, 14, 76, 12);
    g.stroke('#9aa4b5'); g.strokeWeight(3); g.line(-34, 0, 34, 0); g.noStroke();
    for (var s = -1; s <= 1; s += 2) {
      g.fill('#1d3f8f'); g.rect(s < 0 ? -36 : 6, -14, 30, 28, 2);
      g.stroke(120, 170, 255, 140); g.strokeWeight(1);
      for (var i = 1; i < 4; i++) g.line((s < 0 ? -36 : 6) + i * 7.5, -14, (s < 0 ? -36 : 6) + i * 7.5, 14);
      g.line(s < 0 ? -36 : 6, 0, s < 0 ? -6 : 36, 0); g.noStroke();
    }
    g.fill('#c9d2e0'); g.rect(-6, -8, 12, 16, 3);
  },
  dish: function (g) {
    propShadow(g, 0, 20, 46, 12);
    g.fill('#8a95a8'); g.rect(-3, 0, 6, 20); g.rect(-12, 18, 24, 4, 2);
    g.fill('#e1e7f0'); g.arc(0, -4, 48, 34, 0, 180, CHORD); g.fill('#c4ccd9'); g.arc(0, -4, 40, 24, 0, 180, CHORD);
    g.stroke('#8a95a8'); g.strokeWeight(2); g.line(0, -4, 0, -22); g.noStroke(); g.fill('#ff5d8f'); g.circle(0, -23, 5);
  },
  satellite: function (g) {
    g.push(); g.rotate(-20);
    g.fill('#1d3f8f'); g.rect(-30, -6, 18, 12, 2); g.rect(12, -6, 18, 12, 2);
    g.fill('#d4a73a'); g.rect(-10, -9, 20, 18, 3);
    g.fill('#e1e7f0'); g.circle(0, -12, 8);
    g.pop();
  },
  planet: function (g, r) {
    var c = [['#d9823b', '#f0a65a'], ['#4f7bd9', '#7ea3f0'], ['#a35bd9', '#c48ff0']][Math.floor(r() * 3)];
    g.fill(c[0]); g.circle(0, 0, 70); g.fill(c[1]); g.arc(0, 0, 70, 70, 180, 360, CHORD);
    g.fill(255, 255, 255, 35); g.circle(-12, -14, 26);
    g.noFill(); g.stroke(235, 220, 190, 200); g.strokeWeight(4); g.ellipse(0, 4, 108, 26); g.noStroke();
    g.fill(c[0]); g.arc(0, 0, 70, 70, 10, 170, CHORD);   // the front of the planet over the ring
  },
  moon: function (g) {
    g.fill('#c9c6bd'); g.circle(0, 0, 50); g.fill('#aaa69c'); g.circle(-8, -6, 12); g.circle(10, 8, 9); g.circle(6, -12, 6);
    g.fill(255, 255, 255, 40); g.circle(-10, -10, 20);
  },
  asteroid: function (g, r) {
    var v = 100 + r() * 30; g.fill(v, v - 6, v - 14);
    g.beginShape(); for (var i = 0; i < 8; i++) { var a = i * 45 * Math.PI / 180, rr = 12 + r() * 6; g.vertex(Math.cos(a) * rr, Math.sin(a) * rr); } g.endShape(CLOSE);
    g.fill(v - 30, v - 34, v - 40); g.circle(-3, 2, 6); g.circle(5, -4, 4);
  },
  beacon: function (g, r) {
    var c = r() < 0.5 ? [95, 227, 255] : [255, 106, 213];
    g.fill(c[0], c[1], c[2], 50); g.circle(0, -6, 26);
    g.fill('#8a95a8'); g.rect(-2, -4, 4, 14); g.fill(c[0], c[1], c[2]); g.circle(0, -6, 7);
  },
  comet: function (g, r) {
    g.push(); g.rotate(-30 + r() * 60);
    for (var i = 0; i < 10; i++) { g.fill(160, 220, 255, 22); g.ellipse(-8 - i * 5, 0, 40 - i * 3, 10 - i * 0.6); }
    g.fill('#e8f6ff'); g.circle(14, 0, 10);
    g.pop();
  },
  astronaut: function (g) {
    propShadow(g, 0, 18, 26, 8);
    g.fill('#e8edf5'); g.rect(-9, -2, 18, 18, 5); g.rect(-13, 0, 5, 12, 2); g.rect(8, 0, 5, 12, 2);
    g.rect(-8, 14, 6, 6, 2); g.rect(2, 14, 6, 6, 2);
    g.fill('#e8edf5'); g.circle(0, -10, 18); g.fill('#203a6b'); g.ellipse(1, -10, 12, 9); g.fill(120, 220, 255, 150); g.circle(-1, -12, 3);
    g.fill('#ff5d8f'); g.rect(-4, 4, 8, 4);
  },
  crate: function (g) {
    propShadow(g, 0, 10, 28, 8);
    g.fill('#5c6b85'); g.rect(-11, -11, 22, 22, 2); g.fill('#ffd166'); g.rect(-11, -2, 22, 4);
    g.stroke('#3e4a60'); g.strokeWeight(1.5); g.line(-11, -11, 11, 11); g.noStroke();
  },

  // ---- summer
  palm: function (g, r) {
    propShadow(g, 10, 30, 60, 14);
    g.stroke('#8a5a2a'); g.strokeWeight(7); g.noFill();
    g.bezier(0, 30, 2, 10, 8, -10, 16, -26);
    g.stroke('#6b4423'); g.strokeWeight(2); for (var t = 0.15; t < 1; t += 0.15) { var px = bezierPoint(0, 2, 8, 16, t), py = bezierPoint(30, 10, -10, -26, t); g.line(px - 3, py, px + 3, py); }
    g.noStroke();
    var greens = ['#2f8a3f', '#3fa14f'];
    for (var i = 0; i < 6; i++) {
      var a = -170 + i * 50 + r() * 10;
      g.push(); g.translate(16, -26); g.rotate(a);
      g.fill(greens[i % 2]); g.ellipse(18, 0, 38, 10); g.fill(0, 0, 0, 30); g.triangle(2, 0, 34, 0, 18, 4);
      g.pop();
    }
    g.fill('#6b4423'); g.circle(13, -22, 6); g.circle(19, -21, 6);
  },
  umbrella: function (g, r) {
    var c = [['#ff5d8f', '#ffffff'], ['#ff8a3d', '#ffffff'], ['#1fa3c4', '#ffd166']][Math.floor(r() * 3)];
    g.fill(0, 0, 0, 50); g.ellipse(8, 10, 52, 30);
    for (var i = 0; i < 8; i++) { g.fill(c[i % 2]); g.arc(0, 0, 52, 52, i * 45, i * 45 + 45, PIE); }
    g.fill('#6b4423'); g.circle(0, 0, 5);
  },
  towel: function (g, r) {
    g.push(); g.rotate(-20 + r() * 40);
    var c = [['#ff5d8f', '#ffd166'], ['#1fa3c4', '#ffffff'], ['#7a3fb3', '#5fe3ff']][Math.floor(r() * 3)];
    for (var i = 0; i < 5; i++) { g.fill(c[i % 2]); g.rect(-14 + i * 5.6, -22, 5.6, 44); }
    g.pop();
  },
  sandcastle: function (g) {
    propShadow(g, 0, 16, 56, 12);
    g.fill('#d9b46a'); g.rect(-22, -6, 44, 22, 2);
    for (var i = 0; i < 3; i++) { g.rect(-22 + i * 16, -20, 12, 16, 1); g.rect(-22 + i * 16, -24, 4, 4); g.rect(-14 + i * 16, -24, 4, 4); }
    g.fill('#b8954f'); g.rect(-5, 4, 10, 12, 5, 5, 0, 0);
    g.stroke('#6b4423'); g.strokeWeight(1.5); g.line(0, -20, 0, -32); g.noStroke(); g.fill('#ff5d8f'); g.triangle(0, -32, 9, -29, 0, -26);
  },
  shell: function (g, r) {
    g.push(); g.rotate(r() * 360);
    g.fill('#f7d6c4'); g.arc(0, 2, 16, 16, 180, 360, PIE); g.fill('#e8b49a');
    for (var i = 0; i < 4; i++) g.triangle(0, 2, -7 + i * 4.6, -4, -5 + i * 4.6, -4);
    g.pop();
  },
  starfish: function (g, r) {
    g.push(); g.rotate(r() * 72);
    g.fill('#ff8a3d'); g.beginShape();
    for (var i = 0; i < 10; i++) { var a = (-90 + i * 36) * Math.PI / 180, rr = i % 2 ? 4 : 10; g.vertex(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.endShape(CLOSE); g.fill('#ffb47a'); g.circle(0, 0, 4);
    g.pop();
  },
  ball: function (g) {
    propShadow(g, 0, 6, 20, 6);
    var c = ['#ff5d8f', '#ffffff', '#1fa3c4', '#ffffff', '#ffd166', '#ffffff'];
    for (var i = 0; i < 6; i++) { g.fill(c[i]); g.arc(0, 0, 20, 20, i * 60, i * 60 + 60, PIE); }
    g.fill(255, 255, 255, 120); g.circle(-3, -3, 5);
  },
  bucket: function (g) {
    propShadow(g, 0, 8, 22, 6);
    g.fill('#1fa3c4'); g.quad(-8, -8, 8, -8, 6, 8, -6, 8); g.fill('#57c9e0'); g.ellipse(0, -8, 16, 5);
    g.noFill(); g.stroke('#555'); g.strokeWeight(1.5); g.arc(0, -8, 16, 14, 180, 360); g.noStroke();
  },
  crab: function (g) {
    propShadow(g, 0, 6, 28, 8);
    g.stroke('#c0392b'); g.strokeWeight(2);
    for (var i = -1; i <= 1; i += 2) for (var l = 0; l < 3; l++) g.line(i * 8, -1 + l * 3, i * 14, 2 + l * 4);
    g.noStroke(); g.fill('#e74c3c'); g.ellipse(0, 0, 20, 14);
    g.fill('#e74c3c'); g.circle(-12, -8, 7); g.circle(12, -8, 7);
    g.fill('#fff'); g.circle(-3, -7, 4); g.circle(3, -7, 4); g.fill('#111'); g.circle(-3, -7, 2); g.circle(3, -7, 2);
  },
  lifeguard: function (g) {
    propShadow(g, 0, 30, 60, 14);
    g.stroke('#f2f2f2'); g.strokeWeight(3); g.line(-16, 30, -10, -2); g.line(16, 30, 10, -2); g.line(-14, 18, 14, 18); g.noStroke();
    g.fill('#e74c3c'); g.rect(-16, -22, 32, 22, 3); g.fill('#f2f2f2'); g.rect(-12, -18, 24, 10, 2);
    g.fill('#c0392b'); g.triangle(-20, -22, 20, -22, 0, -36);
    g.stroke('#6b4423'); g.strokeWeight(2); g.line(14, -30, 14, -48); g.noStroke(); g.fill('#ffd166'); g.triangle(14, -48, 26, -44, 14, -40);
  },
  boat: function (g, r) {
    g.fill(255, 255, 255, 80); g.ellipse(0, 10, 66, 10);
    g.fill(r() < 0.5 ? '#c0392b' : '#2f5fb3'); g.quad(-26, 2, 26, 2, 18, 12, -18, 12);
    g.stroke('#6b4423'); g.strokeWeight(2); g.line(0, 2, 0, -32); g.noStroke();
    g.fill('#ffffff'); g.triangle(2, -30, 2, -2, 22, -2); g.fill('#f2f2f2'); g.triangle(-2, -26, -2, -2, -16, -2);
  },
  buoy: function (g) {
    g.fill(255, 255, 255, 70); g.ellipse(0, 6, 26, 8);
    g.fill('#e74c3c'); g.circle(0, 0, 16); g.fill('#fff'); g.rect(-8, -2, 16, 4);
  },
  wave: function (g) {
    g.noFill(); g.stroke(255, 255, 255, 170); g.strokeWeight(3);
    g.arc(-8, 0, 20, 12, 180, 360); g.arc(8, 0, 20, 12, 180, 360); g.noStroke();
  },
  surfboard: function (g, r) {
    g.push(); g.rotate(-25 + r() * 50);
    var c = ['#ff8a3d', '#ff5d8f', '#1fa3c4', '#ffd166'][Math.floor(r() * 4)];
    g.fill(0, 0, 0, 50); g.ellipse(4, 4, 14, 44); g.fill(c); g.ellipse(0, 0, 14, 44); g.fill('#ffffff'); g.rect(-1, -18, 2, 36);
    g.pop();
  },
  seagull: function (g) {
    g.noFill(); g.stroke('#f5f5f5'); g.strokeWeight(2.5);
    g.arc(-6, 0, 12, 8, 180, 330); g.arc(6, 0, 12, 8, 210, 360); g.noStroke();
  },
  cooler: function (g) {
    propShadow(g, 0, 10, 28, 8);
    g.fill('#1fa3c4'); g.rect(-12, -8, 24, 18, 3); g.fill('#ffffff'); g.rect(-12, -10, 24, 6, 2); g.fill('#555'); g.rect(-4, -12, 8, 3, 1);
  },
  stall: function (g, r) {
    propShadow(g, 0, 26, 70, 12);
    g.fill('#f2ead3'); g.rect(-26, -6, 52, 30, 2);
    var c = [['#ff5d8f', '#ffffff'], ['#1fa3c4', '#ffffff'], ['#ff8a3d', '#ffffff']][Math.floor(r() * 3)];
    for (var i = 0; i < 7; i++) { g.fill(c[i % 2]); g.rect(-30 + i * 8.6, -20, 8.6, 14); }
    for (var j = 0; j < 7; j++) { g.fill(c[j % 2]); g.arc(-25.7 + j * 8.6, -6, 8.6, 8, 0, 180, PIE); }
    g.fill('#6b4423'); g.rect(-24, 10, 48, 4);
    g.fill('#ffd166'); g.circle(-12, 4, 7); g.fill('#ff5d8f'); g.circle(0, 4, 7); g.fill('#7dffb0'); g.circle(12, 4, 7);
  },
  coral: function (g, r) {
    var c = ['#ff7e9d', '#ffb347', '#c48ff0'][Math.floor(r() * 3)];
    g.stroke(c); g.strokeWeight(4); g.noFill();
    g.line(0, 12, 0, -6); g.line(0, 2, -9, -8); g.line(0, -2, 9, -12); g.line(-9, -8, -12, -16); g.line(9, -12, 12, -18);
    g.noStroke(); g.fill(c); g.circle(-12, -16, 6); g.circle(12, -18, 6); g.circle(0, -6, 6);
  },
  fish: function (g, r) {
    g.push(); g.rotate(r() * 360);
    var c = ['#ff8a3d', '#ffd166', '#5fe3ff', '#ff5d8f'][Math.floor(r() * 4)];
    g.fill(c); g.ellipse(0, 0, 18, 9); g.triangle(-8, 0, -15, -5, -15, 5);
    g.fill('#111'); g.circle(5, -1, 2);
    g.pop();
  }
};

// Fits the hole's props into the open space around the green (after the ground is painted).
function placeSceneProps(g, h, rnd) {
  var poly = h.fairwayPoly, placed = [];
  var water = function (x, y) {
    if (h.ground === 'ocean' || h.ground === 'reef') return true;
    if (h.seaTop && y < h.seaTop - 8) return true;
    return (h.decor || []).some(function (d) { return d.e === 'moat' && y > d.y - 6 && y < d.y + d.h + 6; });
  };
  var list = [];
  (h.scenery || []).forEach(function (it) { for (var n = 0; n < (it[1] || 1); n++) list.push(it[0]); });
  list.sort(function (a, b) { return (PROP_SIZE[b] || 20) - (PROP_SIZE[a] || 20); });   // big ones first
  // then small fillers that suit the ground, tucked into whatever room is left
  var fill = SCENE_FILLERS[h.ground || 'grass'] || [];
  for (var n2 = 0; n2 < 18 && fill.length; n2++) list.push(fill[n2 % fill.length]);
  list.forEach(function (type) {
    var r = (PROP_SIZE[type] || 20) * SCENE_SCALE, wantWater = !!WATER_PROPS[type], flying = !!FLYING_PROPS[type];
    for (var tries = 0; tries < 500; tries++) {
      var x = r + rnd() * (700 - 2 * r), y = 92 + r * 0.6 + rnd() * (700 - 92 - r * 1.6);
      if (x < 150 && y > 610) continue;                                        // the Menu button
      if (scenePip(x, y, poly) || sceneEdgeDist(x, y, poly) < r + 12) continue; // off the green, with a margin
      if (!flying && water(x, y) !== wantWater) continue;
      if (placed.some(function (p) { return Math.hypot(p.x - x, p.y - y) < (p.r + r) * 0.85; })) continue;
      placed.push({ x: x, y: y, r: r });
      drawProp(g, type, x, y, r, rnd);
      break;
    }
  });
}
