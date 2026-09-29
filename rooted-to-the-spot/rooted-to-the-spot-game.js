// Rooted to the Spot: answer a square-root question to earn each penalty kick, then aim and time the shot.
// A shootout is 5 kicks. The 3D stadium uses three.js (drawing) and cannon.js (ball physics).
(function () {
  'use strict';
  var T = window.tl || function (en) { return en; };

  // ---------- Settings and saved stats (localStorage, keys start with penaltyshootout_) ----------
  var KICKS = 5, MAX_DIGITS = 9;   // answers go up to 1,000,000 (1,000² and 100³)
  // Three skills. Squares and square roots: √81 = ?, 9² = ? and the side of a square from its area. Cubes and cube roots:
  // ∛64 = ?, 4³ = ? and the edge of a cube from its volume. Estimating: where a square or cube root falls between whole numbers.
  var SKILLS = [
    { id: 'sqrt', name: T('Squares and Square Roots', 'Cuadrados y raíces cuadradas'), ex: T('√81, 9², area 81 → side', '√81, 9², área 81 → lado') },
    { id: 'cube', name: T('Cubes and Cube Roots', 'Cubos y raíces cúbicas'), ex: T('∛64, 4³, volume 64 → edge', '∛64, 4³, volumen 64 → arista') },
    { id: 'estimate', name: T('Estimating Square and Cube Roots', 'Estimar raíces cuadradas y cúbicas'), ex: T('√50 is between ? and ?', '√50 está entre ? y ?') }
  ];
  function load(key, fallback) {
    try { var v = localStorage.getItem('penaltyshootout_' + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function save(key, val) { try { localStorage.setItem('penaltyshootout_' + key, JSON.stringify(val)); } catch (e) {} }

  var skillOn = load('skillset', [false, false, false]);   // nothing picked until the student chooses
  if (!Array.isArray(skillOn) || skillOn.length !== SKILLS.length) skillOn = [false, false, false];   // (an older skill list resets)

  // ---------- DOM ----------
  var $ = function (id) { return document.getElementById(id); };
  var app = $('ps'), canvas = $('ps-canvas');
  var scrTitle = $('scr-title'), scrMenu = $('scr-menu'), scrQ = $('scr-q'), scrExp = $('scr-exp'), scrOver = $('scr-over');
  var qIn = $('q-in'), qIn2 = $('q-in2'), activeIn = null, msg = $('msg'), chance = $('chance'), aimHint = $('aimhint'), hud = $('hud');
  var isTouch = window.matchMedia && matchMedia('(hover: none), (pointer: coarse)').matches;
  if (isTouch) [qIn, qIn2].forEach(function (el) { el.readOnly = true; el.setAttribute('inputmode', 'none'); });   // the on-screen pad instead of the phone keyboard

  function show(el) { el.hidden = false; }
  function hide(el) {
    if (el.contains(document.activeElement)) { document.activeElement.blur(); focusGame(); }
    el.hidden = true;
  }
  function focusGame() { try { canvas.focus({ preventScroll: true }); } catch (e) {} }

  // ---------- Game state ----------
  var STATE = { MENU: 0, MATH: 1, EXPLANATION: 2, AIMING: 3, CHARGING: 4, KICKING: 5, RESULT: 6, OVER: 7, WHISTLE: 8, TITLE: 9 };
  var ENV = { DAY: 0, NIGHT: 1, RAIN: 2 };
  var state = STATE.TITLE, env = ENV.DAY;

  var kickNum = 0, goals = 0, rightCount = 0, results = [], missed = [], usedQ = {}, question = null, lastKey = '';
  var aimPower = 0, hitKeeper = false, kickPhase = 0, isAutoMiss = false, resultDecided = false, enforceSave = false;
  var resultTimeout = null, keysDown = {};

  // ---------- Engine ----------
  var scene, camera, renderer, world, clock;
  var ballMesh, ballBody, keeperGroup, keeperBody, legGroup, rainParticles, flashParticles, targetCrosshair, errorCircle;
  var kTorso, kHead, kLArm, kRArm, kLLeg, kRLeg, keeperStartX = 0, keeperStartY = 0;

  var GOAL_WIDTH = 7.32, GOAL_HEIGHT = 2.44, POST_RADIUS = 0.06, PENALTY_DIST = 11, BALL_RADIUS = 0.11, BALL_MASS = 0.43;
  var raycaster = new THREE.Raycaster(), mouseVector = new THREE.Vector2();
  var goalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);   // invisible wall on the goal line (z = 0)

  var powerShot = false;   // earned by the bonus question: a much tighter (green) aiming circle for this kick
  // Where the ball can land, around the aim point: the circle starts big and shrinks as the power builds.
  // Regular shot (yellow): 4.2 m down to 0.9 m, so even a perfect release scatters. Power shot (green): 2.6 m down to 0.25 m.
  function errorRadiusFor(p) { return powerShot ? 2.6 - p * 2.35 : 4.2 - p * 3.3; }
  var AIM_YELLOW = 0xfacc15, AIM_GREEN = 0x33ff33;

  function initEngine() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    camera.position.set(0, 1.8, PENALTY_DIST + 2.5);
    camera.lookAt(0, GOAL_HEIGHT / 2, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));   // lighter on student devices
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    clock = new THREE.Clock();

    world = new CANNON.World();
    world.gravity.set(0, -9.81, 0);
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.solver.iterations = 30;

    var mats = setupPhysicsMaterials();
    setupEnvironment();
    buildStadium();
    buildGoal(mats);
    createBall(mats);
    createKeeper(mats);
    createReferee();
    createLeg();

    targetCrosshair = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.25, 32),
      new THREE.MeshBasicMaterial({ color: 0x33ff33, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false }));
    targetCrosshair.renderOrder = 999; targetCrosshair.visible = false;
    scene.add(targetCrosshair);

    // The power circle: a green ring filled with see-through green, covering everywhere the ball could land.
    // Radius 0.1, scaled while powering up.
    errorCircle = new THREE.Group();
    var ring = new THREE.Mesh(new THREE.RingGeometry(0.092, 0.1, 64),
      new THREE.MeshBasicMaterial({ color: 0x33ff33, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false }));
    var fill = new THREE.Mesh(new THREE.CircleGeometry(0.092, 64),
      new THREE.MeshBasicMaterial({ color: 0x33ff33, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
    ring.renderOrder = 998; fill.renderOrder = 997;
    errorCircle.add(fill, ring);
    errorCircle.visible = false;
    scene.add(errorCircle);

    world.addEventListener('beginContact', onContact);
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(app);
    window.addEventListener('resize', resize);
    animate();
  }

  // Fit the renderer to the game box. On a tall (portrait) screen the view widens so the whole goal stays in view.
  function resize() {
    var w = Math.max(1, app.clientWidth), h = Math.max(1, app.clientHeight);
    renderer.setSize(w, h, false);
    var aspect = w / h;
    camera.aspect = aspect;
    var needV = 2 * Math.atan(Math.tan(20 * Math.PI / 180) / aspect) * 180 / Math.PI;
    camera.fov = Math.min(95, Math.max(55, needV));
    camera.updateProjectionMatrix();
  }

  function setupPhysicsMaterials() {
    var ballMat = new CANNON.Material('ball'), pitchMat = new CANNON.Material('pitch'), postMat = new CANNON.Material('post');
    var netMat = new CANNON.Material('net'), keeperMat = new CANNON.Material('keeper');
    world.addContactMaterial(new CANNON.ContactMaterial(pitchMat, ballMat, { friction: 0.7, restitution: 0.55 }));
    world.addContactMaterial(new CANNON.ContactMaterial(postMat, ballMat, { friction: 0.2, restitution: 0.85 }));
    world.addContactMaterial(new CANNON.ContactMaterial(netMat, ballMat, { friction: 0.9, restitution: 0.05 }));
    world.addContactMaterial(new CANNON.ContactMaterial(keeperMat, ballMat, { friction: 0.8, restitution: 0.1 }));
    return { ballMat: ballMat, pitchMat: pitchMat, postMat: postMat, netMat: netMat, keeperMat: keeperMat };
  }

  function setupEnvironment() {
    env = [ENV.DAY, ENV.NIGHT, ENV.RAIN][Math.floor(Math.random() * 3)];
    $('weather').textContent = [T('DAY', 'DÍA'), T('NIGHT', 'NOCHE'), T('RAIN', 'LLUVIA')][env];
    scene.add(new THREE.AmbientLight(0xffffff, env === ENV.DAY ? 0.7 : 0.25));

    if (env === ENV.DAY) {
      scene.background = new THREE.Color(0x5ca8df);
      scene.fog = new THREE.Fog(0x5ca8df, 90, 430);   // far enough to see the city, hazy with distance
      var sun = new THREE.DirectionalLight(0xffffff, 1.2);
      sun.position.set(100, 150, 50);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 1024; sun.shadow.mapSize.height = 1024;
      sun.shadow.camera.near = 10; sun.shadow.camera.far = 300;
      sun.shadow.camera.left = -30; sun.shadow.camera.right = 30; sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
      scene.add(sun);
    } else {
      scene.background = new THREE.Color(0x050510);
      scene.fog = new THREE.Fog(0x050510, 70, 400);
      var addSpot = function (x, z, shadows) {   // stadium floodlights; only two cast shadows
        var spot = new THREE.SpotLight(0xffffff, 2.5);
        spot.position.set(x, 60, z);
        spot.target.position.set(0, 0, 0);
        spot.angle = Math.PI / 4; spot.penumbra = 0.6;
        spot.castShadow = shadows;
        spot.shadow.mapSize.width = 1024; spot.shadow.mapSize.height = 1024;
        scene.add(spot); scene.add(spot.target);
        var bulb = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        bulb.position.set(x, 60, z);
        scene.add(bulb);
      };
      addSpot(-60, 30, true); addSpot(60, 30, true); addSpot(-40, -40, false); addSpot(40, -40, false);
      if (env === ENV.RAIN) createRain();
    }
  }

  function createRain() {
    var count = 6000, pos = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = Math.random() * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60 + 5;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    rainParticles = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xcccccc, size: 0.12, transparent: true, opacity: 0.55 }));
    scene.add(rainParticles);
  }

  function buildStadium() {
    // Grass pitch, 10 pixels = 1 meter on a 120 m x 180 m plane
    var c = document.createElement('canvas');
    c.width = 1200; c.height = 1800;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#26541f'; ctx.fillRect(0, 0, 1200, 1800);
    ctx.fillStyle = '#2d6325';
    for (var i = 0; i < 1800; i += 100) ctx.fillRect(0, i, 1200, 50);
    var img = ctx.getImageData(0, 0, 1200, 1800), d = img.data;
    for (i = 0; i < d.length; i += 4) {
      var n = (Math.random() - 0.5) * 15;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);

    ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 5;
    var leftX = 600 - 340, rightX = 600 + 340, centerY = 900 + 525;
    var line = function (x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    line(leftX, 900, rightX, 900); line(leftX, 900, leftX, 1800); line(rightX, 900, rightX, 1800); line(leftX, centerY, rightX, centerY);
    ctx.beginPath(); ctx.arc(600, centerY, 91.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(600, centerY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeRect(600 - 91.5, 900, 183, 55);           // 6-yard box
    ctx.strokeRect(600 - 201.5, 900, 403, 165);         // penalty area
    var arcAngle = Math.asin(55 / 91.5);
    ctx.beginPath(); ctx.arc(600, 1010, 91.5, arcAngle, Math.PI - arcAngle); ctx.stroke();
    ctx.beginPath(); ctx.arc(600, 1010, 5, 0, Math.PI * 2); ctx.fill();   // penalty spot

    var pitch = new THREE.Mesh(new THREE.PlaneGeometry(120, 180), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(c) }));
    pitch.rotation.x = -Math.PI / 2;
    pitch.receiveShadow = true;
    scene.add(pitch);

    // Ad boards
    var ad = document.createElement('canvas');
    ad.width = 1024; ad.height = 64;
    var actx = ad.getContext('2d');
    actx.fillStyle = '#0f172a'; actx.fillRect(0, 0, 1024, 64);
    actx.fillStyle = '#3b82f6'; actx.font = 'bold 34px Arial';
    var adText = 'ROOTED TO THE SPOT';
    for (i = 0; i < 2; i++) actx.fillText(adText, 56 + i * 512, 43);
    var adTex = new THREE.CanvasTexture(ad);
    adTex.wrapS = THREE.RepeatWrapping; adTex.repeat.set(4, 1);
    var adMat = new THREE.MeshLambertMaterial({ map: adTex });
    var wall = function (w, x, z, rotY) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, 0.5), adMat);
      m.position.set(x, 0.75, z); m.rotation.y = rotY; m.receiveShadow = true;
      scene.add(m);
    };
    wall(100, 0, -20, 0); wall(80, -45, 20, Math.PI / 2); wall(80, 45, 20, -Math.PI / 2);

    // Grandstands
    // tiers of seating in two alternating shades
    var standMats = [new THREE.MeshLambertMaterial({ color: 0x1e293b }), new THREE.MeshLambertMaterial({ color: 0x334155 })];
    var backGeo = new THREE.BoxGeometry(100, 1, 2), sideGeo = new THREE.BoxGeometry(2, 1, 100);
    for (i = 1; i <= 15; i++) {
      var sm = standMats[i % 2];
      var b = new THREE.Mesh(backGeo, sm); b.position.set(0, i, -20 - i * 2); scene.add(b);
      var l = new THREE.Mesh(sideGeo, sm); l.position.set(-45 - i * 2, i, 20); scene.add(l);
      var r = new THREE.Mesh(sideGeo, sm); r.position.set(45 + i * 2, i, 20); scene.add(r);
    }
    createCrowd();

    // Big scoreboard behind the goal: lit, showing the shootout's goals and kick
    boardCanvas = document.createElement('canvas');
    boardCanvas.width = 512; boardCanvas.height = 256;
    boardTex = new THREE.CanvasTexture(boardCanvas);
    var frame = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
    var board = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 1),
      [frame, frame, frame, frame, new THREE.MeshBasicMaterial({ map: boardTex }), frame]);
    board.position.set(0, 19, -40);
    scene.add(board);
    [-7, 7].forEach(function (x) {   // the posts it stands on
      var post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 14, 0.8), frame); post.position.set(x, 7, -40.2); scene.add(post);
    });
    updateBoard();
    buildCity();
  }

  // ---------- The city skyline behind the stands ----------
  // High-rise towers all around the stadium. Their windows are drawn on a canvas: blue-grey glass by day, and dark
  // with scattered lit windows at night (glowing through the dark). The tallest have red lights on the roof.
  var beacons = [];
  function windowTexture(night, seed) {
    var c = document.createElement('canvas'); c.width = 64; c.height = 128;
    var ctx = c.getContext('2d'), rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    ctx.fillStyle = night ? '#0b1220' : '#5b6b82'; ctx.fillRect(0, 0, 64, 128);
    for (var y = 4; y < 128; y += 8) for (var x = 3; x < 64; x += 8) {
      if (night) ctx.fillStyle = rnd() < 0.38 ? (rnd() < 0.8 ? '#fde68a' : '#bae6fd') : '#111827';
      else ctx.fillStyle = rnd() < 0.15 ? '#cbd5e1' : '#94a3b8';
      ctx.fillRect(x, y, 5, 5);
    }
    return c;
  }

  function buildCity() {
    var night = env !== ENV.DAY;
    var canvases = [windowTexture(night, 7), windowTexture(night, 91), windowTexture(night, 333)];
    var mats = {};   // one material per window pattern and building size, so the windows keep their shape
    var matFor = function (k, w, h) {
      var key = k + '-' + w + '-' + h;
      if (!mats[key]) {
        var tex = new THREE.CanvasTexture(canvases[k]);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(w / 6, h / 12);
        mats[key] = night
          ? new THREE.MeshLambertMaterial({ color: 0x111827, emissive: 0xffffff, emissiveMap: tex, map: tex })
          : new THREE.MeshLambertMaterial({ map: tex });
      }
      return mats[key];
    };
    var widths = [10, 14, 18, 24], heights = [26, 36, 48, 62, 80];
    var roofMat = new THREE.MeshLambertMaterial({ color: night ? 0x1f2937 : 0x64748b });
    var beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2020 });
    var seed = 11, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    var place = function (x, z, faceY) {
      var w = widths[Math.floor(rnd() * widths.length)], d = widths[Math.floor(rnd() * widths.length)];
      var h = heights[Math.floor(rnd() * heights.length)];
      var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matFor(Math.floor(rnd() * 3), w, h));
      b.position.set(x, h / 2 - 2, z); b.rotation.y = faceY;
      scene.add(b);
      var roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 2, d * 0.6), roofMat);   // a rooftop block
      roof.position.set(x, h - 1, z); roof.rotation.y = faceY; scene.add(roof);
      if (h >= 62) {   // tall ones get an antenna with a red light
        var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 10, 6), roofMat);
        mast.position.set(x, h + 5, z); scene.add(mast);
        var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), beaconMat);
        lamp.position.set(x, h + 10.3, z); scene.add(lamp); beacons.push(lamp);
      }
    };
    // behind the goal, in two staggered rows
    for (var x = -150; x <= 150; x += 19) { place(x + rnd() * 6, -95 - rnd() * 20, 0); place(x + 9 + rnd() * 6, -135 - rnd() * 25, 0); }
    // down both sides
    for (var z = -80; z <= 60; z += 20) {
      place(-100 - rnd() * 15, z + rnd() * 6, 0); place(-140 - rnd() * 20, z + 10, 0);
      place(100 + rnd() * 15, z + rnd() * 6, 0); place(140 + rnd() * 20, z + 10, 0);
    }
    // a few landmark towers
    [[-60, -170, 110], [45, -185, 130], [150, -120, 100]].forEach(function (t) {
      var w = 16, h = t[2];
      var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), matFor(1, w, 80));
      b.position.set(t[0], h / 2 - 2, t[1]); scene.add(b);
      var spire = new THREE.Mesh(new THREE.ConeGeometry(4, 18, 4), roofMat);
      spire.position.set(t[0], h + 7, t[1]); spire.rotation.y = Math.PI / 4; scene.add(spire);
      var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), beaconMat);
      lamp.position.set(t[0], h + 16.5, t[1]); scene.add(lamp); beacons.push(lamp);
    });
  }

  function animateCity() {   // the red roof lights blink
    var on = Math.sin(clock.elapsedTime * 3) > 0.2;
    for (var i = 0; i < beacons.length; i++) beacons[i].visible = on;
  }

  // ---------- The crowd ----------
  // Real fans in the seats: each has a body, a head and two arms, drawn as shared ("instanced") shapes so thousands
  // of them stay fast. They bob a little while waiting, jump with their arms up after a goal, and now and then a wave
  // goes around the back stand.
  var fans = [], crowdParts = null, crowdCheer = 0, crowdWave = null, crowdTick = 0;
  var fanDummy = new THREE.Object3D();
  fanDummy.rotation.order = 'YXZ';

  function createCrowd() {
    var shirts = [0x2563eb, 0x2563eb, 0x1d4ed8, 0xdc2626, 0xdc2626, 0xf8fafc, 0xfacc15, 0x111827, 0x16a34a, 0xf97316]
      .map(function (h) { return new THREE.Color(h); });
    var skins = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0xffdbac, 0x5c3a1e].map(function (h) { return new THREE.Color(h); });
    var addFan = function (x, y, z, face) {
      if (Math.random() < 0.15) return;   // a few empty seats
      fans.push({ x: x + (Math.random() - 0.5) * 0.25, y: y, z: z, face: face, phase: Math.random() * Math.PI * 2,
        shirt: shirts[Math.floor(Math.random() * shirts.length)], skin: skins[Math.floor(Math.random() * skins.length)],
        size: 0.9 + Math.random() * 0.2 });
    };
    for (var row = 1; row <= 15; row++) {
      var seatY = row + 0.5;
      for (var x = -47; x <= 47; x += 1.0) addFan(x, seatY, -20 - row * 2 + 0.2, 0);          // behind the goal, facing the pitch
      for (var z = -28; z <= 30; z += 1.0) {                                                  // the side stands, facing in
        addFan(-45 - row * 2 + 0.2, seatY, z, Math.PI / 2);
        addFan(45 + row * 2 - 0.2, seatY, z, -Math.PI / 2);
      }
    }
    var n = fans.length;
    var torsoGeo = new THREE.BoxGeometry(0.44, 0.62, 0.26);
    var headGeo = new THREE.SphereGeometry(0.13, 6, 5);
    var armGeo = new THREE.BoxGeometry(0.11, 0.5, 0.11); armGeo.translate(0, -0.25, 0);   // turns at the shoulder
    var mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    crowdParts = {
      torso: new THREE.InstancedMesh(torsoGeo, mat, n), head: new THREE.InstancedMesh(headGeo, mat, n),
      armL: new THREE.InstancedMesh(armGeo, mat, n), armR: new THREE.InstancedMesh(armGeo, mat, n)
    };
    fans.forEach(function (f, i) {
      crowdParts.torso.setColorAt(i, f.shirt); crowdParts.armL.setColorAt(i, f.shirt); crowdParts.armR.setColorAt(i, f.shirt);
      crowdParts.head.setColorAt(i, f.skin);
    });
    Object.keys(crowdParts).forEach(function (k) {
      var m = crowdParts[k];
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.instanceColor.needsUpdate = true;
      scene.add(m);
    });
    updateCrowd(0, true);

    // Camera flashes in the crowd
    var fc = 120, fpos = new Float32Array(fc * 3), phase = new Float32Array(fc);
    for (var i = 0; i < fc; i++) {
      var f = fans[Math.floor(Math.random() * n)];
      fpos[i * 3] = f.x; fpos[i * 3 + 1] = f.y + 1.1; fpos[i * 3 + 2] = f.z;
      phase[i] = Math.random();
    }
    var fgeo = new THREE.BufferGeometry();
    fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
    fgeo.setAttribute('alpha', new THREE.BufferAttribute(phase, 1));
    flashParticles = new THREE.Points(fgeo, new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: 'attribute float alpha; varying float vAlpha; uniform float time;' +
        'void main() { vAlpha = sin(time * 15.0 + alpha * 100.0) * 0.5 + 0.5;' +
        'vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = 12.0 * (1.0 / -mv.z) * vAlpha; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vAlpha; void main() { float d = length(gl_PointCoord - vec2(0.5)); if (d > 0.5) discard;' +
        'gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * (0.5 - d) * 2.0); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    scene.add(flashParticles);
  }

  function setFanPart(mesh, i, x, y, z, face, roll, s) {
    fanDummy.position.set(x, y, z);
    fanDummy.rotation.set(0, face, roll);
    fanDummy.scale.setScalar(s);
    fanDummy.updateMatrix();
    mesh.setMatrixAt(i, fanDummy.matrix);
  }

  // t = seconds since the game started. force = draw now even if nothing is happening.
  function updateCrowd(t, force) {
    if (!crowdParts) return;
    var excited = crowdCheer > 0, waving = crowdWave !== null;
    crowdTick++;
    if (!force && !excited && !waving && crowdTick % 4) return;   // waiting: a gentle bob, a few times a second is plenty
    for (var i = 0; i < fans.length; i++) {
      var f = fans[i], s = f.size, lift, arms;
      if (excited) {   // a goal! jump up and down with arms in the air
        lift = Math.max(0, Math.sin(t * 10 + f.phase)) * 0.4 * s;
        arms = 2.5 + 0.35 * Math.sin(t * 12 + f.phase);
      } else {
        lift = Math.max(0, Math.sin(t * 1.5 + f.phase)) * 0.03;
        arms = 0.12;
      }
      if (waving && f.face === 0) {   // the wave: stand up and throw your arms up as it passes
        var d = Math.abs(f.x - crowdWave);
        if (d < 4) { var w = Math.cos(d / 4 * Math.PI / 2); lift = Math.max(lift, w * 0.5); arms = Math.max(arms, w * 2.9); }
      }
      var y = f.y + lift, sx = 0.25 * s * Math.cos(f.face), sz = -0.25 * s * Math.sin(f.face);
      setFanPart(crowdParts.torso, i, f.x, y + 0.31 * s, f.z, f.face, 0, s);
      setFanPart(crowdParts.head, i, f.x, y + 0.78 * s, f.z, f.face, 0, s);
      setFanPart(crowdParts.armL, i, f.x - sx, y + 0.58 * s, f.z - sz, f.face, -arms, s);
      setFanPart(crowdParts.armR, i, f.x + sx, y + 0.58 * s, f.z + sz, f.face, arms, s);
    }
    crowdParts.torso.instanceMatrix.needsUpdate = crowdParts.head.instanceMatrix.needsUpdate = true;
    crowdParts.armL.instanceMatrix.needsUpdate = crowdParts.armR.instanceMatrix.needsUpdate = true;
  }

  function animateCrowd(delta) {
    if (crowdCheer > 0) crowdCheer -= delta;
    if (crowdWave === null && crowdCheer <= 0 && (state === STATE.TITLE || Math.random() < delta / 25)) crowdWave = -55;   // about every 25 seconds (nonstop on the title screen)
    if (crowdWave !== null) { crowdWave += 16 * delta; if (crowdWave > 55) crowdWave = null; }
    updateCrowd(clock.elapsedTime, false);
  }

  function buildGoal(mats) {
    var metal = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.4 });
    var postGeo = new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, GOAL_HEIGHT, 16);
    [-1, 1].forEach(function (s) {
      var p = new THREE.Mesh(postGeo, metal); p.position.set(s * GOAL_WIDTH / 2, GOAL_HEIGHT / 2, 0); p.castShadow = true; scene.add(p);
    });
    var bar = new THREE.Mesh(new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, GOAL_WIDTH + POST_RADIUS * 2, 16), metal);
    bar.rotation.z = Math.PI / 2; bar.position.set(0, GOAL_HEIGHT, 0); bar.castShadow = true; scene.add(bar);

    // Net
    var nc = document.createElement('canvas');
    nc.width = 128; nc.height = 128;
    var nctx = nc.getContext('2d');
    nctx.strokeStyle = 'rgba(255,255,255,0.7)'; nctx.lineWidth = 4;
    nctx.beginPath();
    for (var i = 0; i < 128; i += 16) { nctx.moveTo(i, 0); nctx.lineTo(i + 16, 128); nctx.moveTo(i, 128); nctx.lineTo(i + 16, 0); }
    nctx.stroke();
    var netMat = function (rx, ry) {
      var t = new THREE.CanvasTexture(nc);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
      return new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.85 });
    };
    var back = backNet = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_WIDTH, GOAL_HEIGHT, 36, 12), netMat(10, 5));   // finely divided so it can ripple
    back.position.set(0, GOAL_HEIGHT / 2, -2.4); scene.add(back);
    var top = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_WIDTH, 2.4), netMat(10, 3));
    top.rotation.x = Math.PI / 2; top.position.set(0, GOAL_HEIGHT, -1.2); scene.add(top);
    [-1, 1].forEach(function (s) {
      var side = new THREE.Mesh(new THREE.PlaneGeometry(2.4, GOAL_HEIGHT), netMat(3, 5));
      side.rotation.y = s * -Math.PI / 2; side.position.set(s * GOAL_WIDTH / 2, GOAL_HEIGHT / 2, -1.2); scene.add(side);
    });

    // Physics: posts and crossbar (cannon's cylinders run along z, so they're turned upright / sideways)
    var postShape = new CANNON.Cylinder(POST_RADIUS, POST_RADIUS, GOAL_HEIGHT, 16);
    var qX = new CANNON.Quaternion(); qX.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    [-1, 1].forEach(function (s) {
      var pb = new CANNON.Body({ mass: 0, material: mats.postMat });
      pb.addShape(postShape); pb.quaternion.copy(qX); pb.position.set(s * GOAL_WIDTH / 2, GOAL_HEIGHT / 2, 0);
      world.addBody(pb);
    });
    var cb = new CANNON.Body({ mass: 0, material: mats.postMat });
    cb.addShape(new CANNON.Cylinder(POST_RADIUS, POST_RADIUS, GOAL_WIDTH + POST_RADIUS * 2, 16));
    var qY = new CANNON.Quaternion(); qY.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
    cb.quaternion.copy(qY); cb.position.set(0, GOAL_HEIGHT, 0);
    world.addBody(cb);

    var ground = new CANNON.Body({ mass: 0, material: mats.pitchMat });
    ground.addShape(new CANNON.Plane());
    ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(ground);

    // Net cage colliders (the ball goes inside and stops)
    var t = 0.1;
    var addNet = function (hx, hy, hz, x, y, z) {
      var nb = new CANNON.Body({ mass: 0, material: mats.netMat });
      nb.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy, hz)));
      nb.position.set(x, y, z);
      world.addBody(nb);
    };
    addNet(GOAL_WIDTH / 2, GOAL_HEIGHT / 2, 0.6, 0, GOAL_HEIGHT / 2, -2.4 - 0.6);   // thick, so a fast ball can't skip through
    addNet(t, GOAL_HEIGHT / 2, 1.2, -GOAL_WIDTH / 2 - t, GOAL_HEIGHT / 2, -1.2);
    addNet(t, GOAL_HEIGHT / 2, 1.2, GOAL_WIDTH / 2 + t, GOAL_HEIGHT / 2, -1.2);
    addNet(GOAL_WIDTH / 2, t, 1.2, 0, GOAL_HEIGHT + t, -1.2);
  }

  function createBall(mats) {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#111111';
    var pentagon = function (cx, cy, r) {
      ctx.beginPath();
      for (var k = 0; k < 5; k++) { var a = -Math.PI / 2 + k * Math.PI * 2 / 5; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      ctx.closePath(); ctx.fill();
    };
    for (var i = 0; i < 5; i++) { pentagon(25 + i * 51, 38, 13); pentagon(50 + i * 51, 90, 13); }
    ctx.fillRect(0, 0, 256, 6); ctx.fillRect(0, 122, 256, 6);
    ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 32, 32),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), roughness: 0.6 }));
    ballMesh.castShadow = true;
    scene.add(ballMesh);

    // no damping, so the aim math lands exactly where it's aimed
    ballBody = new CANNON.Body({ mass: BALL_MASS, material: mats.ballMat, linearDamping: 0, angularDamping: 0 });
    ballBody.addShape(new CANNON.Sphere(BALL_RADIUS));
    resetBall();
    world.addBody(ballBody);
  }

  // ---------- People ----------
  // A player built from rounded parts: chest, shoulders, neck, a head with a face and hair, and arms and legs that bend
  // at the elbow and knee. The hips sit 1 m up; each arm and leg is a group that turns at the shoulder or hip.
  function buildPerson(o) {
    var M = function (c, rough) { return new THREE.MeshStandardMaterial({ color: c, roughness: rough || 0.75 }); };
    var shirt = M(o.shirt), trim = M(o.trim), shorts = M(o.shorts), socks = M(o.socks), skin = M(o.skin, 0.6);
    var hair = M(o.hair, 0.95), boots = M(o.boots || 0x111111, 0.35), dark = M(0x1a1a1a, 0.4), white = M(0xf8fafc, 0.5);
    var limb = function (r1, r2, len, mat) {   // hangs down from its group's origin
      var m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, 14), mat); m.position.y = -len / 2; return m;
    };
    var sphere = function (r, mat) { return new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat); };

    var root = new THREE.Group(), hips = new THREE.Group();
    hips.position.y = 1.0;
    root.add(hips);

    var chest = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.155, 0.56, 18), shirt);
    chest.scale.z = 0.6; chest.position.y = 0.32; hips.add(chest);
    var shoulders = sphere(0.205, shirt); shoulders.scale.set(1.08, 0.42, 0.6); shoulders.position.y = 0.58; hips.add(shoulders);
    var collar = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.018, 8, 18), trim);
    collar.rotation.x = Math.PI / 2; collar.position.y = 0.665; hips.add(collar);
    var waist = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.175, 0.18, 18), shorts);
    waist.scale.z = 0.72; waist.position.y = 0.02; hips.add(waist);
    if (o.number) {   // a shirt number on the chest
      var nc = document.createElement('canvas'); nc.width = nc.height = 64;
      var nctx = nc.getContext('2d');
      nctx.fillStyle = o.numberColor || '#111827'; nctx.font = 'bold 48px Arial'; nctx.textAlign = 'center'; nctx.fillText(o.number, 32, 50);
      var num = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(nc), transparent: true }));
      num.position.set(0, 0.4, 0.12); hips.add(num);
    }

    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.12, 12), skin);
    neck.position.y = 0.71; hips.add(neck);
    var head = new THREE.Group(); head.position.y = 0.86; hips.add(head);
    var skull = sphere(0.11, skin); skull.scale.set(0.88, 1.1, 0.96); head.add(skull);
    var hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.116, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), hair);
    hairCap.scale.set(0.92, 1.12, 1.0); hairCap.rotation.x = -0.45; hairCap.position.set(0, 0.012, -0.01); head.add(hairCap);
    [-1, 1].forEach(function (s) {
      var eye = sphere(0.016, white); eye.position.set(s * 0.036, 0.018, 0.095); head.add(eye);
      var pupil = sphere(0.009, dark); pupil.position.set(s * 0.036, 0.018, 0.108); head.add(pupil);
      var brow = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.008, 0.01), hair); brow.position.set(s * 0.037, 0.045, 0.1); head.add(brow);
      var ear = sphere(0.026, skin); ear.scale.set(0.45, 1, 0.8); ear.position.set(s * 0.097, 0.0, 0); head.add(ear);
    });
    var nose = sphere(0.02, skin); nose.scale.set(0.8, 1.1, 1); nose.position.set(0, -0.012, 0.106); head.add(nose);
    var mouth = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.007, 0.008), M(0x7f1d1d, 0.5)); mouth.position.set(0, -0.052, 0.098); head.add(mouth);

    var makeArm = function (side) {
      var arm = new THREE.Group(); arm.position.set(side * 0.235, 0.57, 0); hips.add(arm);
      arm.add(sphere(0.062, shirt));
      if (o.longSleeves) arm.add(limb(0.058, 0.05, 0.3, shirt));
      else { arm.add(limb(0.064, 0.058, 0.13, shirt)); var up = limb(0.05, 0.046, 0.18, skin); up.position.y -= 0.12; arm.add(up); }
      var fore = new THREE.Group(); fore.position.y = -0.3; fore.rotation.x = -0.25; arm.add(fore);   // a slight bend at the elbow
      fore.add(sphere(0.048, o.longSleeves ? shirt : skin));
      fore.add(limb(0.046, 0.038, 0.26, o.longSleeves ? shirt : skin));
      if (o.gloves) {   // big goalkeeper gloves: cuff, palm and thumb
        var cuff = limb(0.05, 0.05, 0.05, trim); cuff.position.y -= 0.24; fore.add(cuff);
        var palm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.05), M(o.gloves, 0.6)); palm.position.y = -0.36; fore.add(palm);
        var thumb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.04), M(o.gloves, 0.6)); thumb.position.set(-side * 0.06, -0.33, 0.01); thumb.rotation.z = side * 0.4; fore.add(thumb);
      } else {
        var hand = sphere(0.042, skin); hand.scale.set(0.8, 1.2, 0.6); hand.position.y = -0.3; fore.add(hand);
      }
      arm.userData.fore = fore;
      return arm;
    };
    var makeLeg = function (side) {
      var leg = new THREE.Group(); leg.position.set(side * 0.095, 0, 0); hips.add(leg);
      leg.add(limb(0.088, 0.082, 0.24, shorts));
      leg.add(limb(0.074, 0.058, 0.45, skin));
      var shin = new THREE.Group(); shin.position.y = -0.45; leg.add(shin);
      shin.add(sphere(0.058, skin));
      var band = limb(0.06, 0.06, 0.05, trim); band.position.y -= 0.04; shin.add(band);
      shin.add(limb(0.058, 0.044, 0.44, socks));
      var boot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.075, 0.25), boots); boot.position.set(0, -0.475, 0.05); shin.add(boot);
      var toe = sphere(0.05, boots); toe.scale.set(1, 0.75, 1); toe.position.set(0, -0.48, 0.16); shin.add(toe);
      leg.userData.shin = shin;   // the knee, so the keeper can bring his knees up
      return leg;
    };
    var p = { root: root, hips: hips, head: head, lArm: makeArm(-1), rArm: makeArm(1), lLeg: makeLeg(-1), rLeg: makeLeg(1) };
    root.traverse(function (m) { if (m.isMesh) m.castShadow = true; });
    return p;
  }

  function createKeeper(mats) {
    keeperGroup = new THREE.Group();
    var k = buildPerson({ shirt: 0xeab308, trim: 0x111827, shorts: 0x111827, socks: 0xeab308, skin: 0xe0ac69, hair: 0x2b1a10,
      longSleeves: true, gloves: 0xf8fafc, number: '1' });
    kTorso = k.hips; kHead = k.head; kLArm = k.lArm; kRArm = k.rArm; kLLeg = k.lLeg; kRLeg = k.rLeg;
    keeperGroup.add(k.root);
    scene.add(keeperGroup);

    keeperBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: mats.keeperMat });
    keeperBody.addShape(new CANNON.Box(new CANNON.Vec3(0.4, 0.95, 0.3)), new CANNON.Vec3(0, 0.95, 0));
    resetKeeper();
    world.addBody(keeperBody);
  }

  // ---------- Referee ----------
  // Stands relaxed (breathing, shifting his weight, looking around) with a whistle in his right hand. Before each kick
  // he lifts it to his mouth, points to the spot, blows, and only then does the kick go ahead.
  var refP = null, refYaw = 0, refWhistleT = -1, refWhistleThen = null, refBlown = false;

  function createReferee() {
    refP = buildPerson({ shirt: 0xa3e635, trim: 0x111111, shorts: 0x111111, socks: 0x111111, skin: 0x8d5524, hair: 0x111111 });
    var ref = refP.root;
    ref.position.set(4, 0, 7);
    ref.lookAt(0, 0, 11);   // watching the ball
    refYaw = ref.rotation.y;
    var whistle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8, roughness: 0.25 }));
    whistle.position.set(0, -0.33, 0.035);
    refP.rArm.userData.fore.add(whistle);
    scene.add(ref);
  }

  // the referee blows the whistle, then `then` runs (start aiming, or take the wild shot)
  // With `then`, play waits for the whistle; without it, the referee just blows it while the student is already aiming.
  function refWhistle(then) {
    if (then) { state = STATE.WHISTLE; hideAimHud(); }
    refWhistleT = 0; refWhistleThen = then || null; refBlown = false;
  }

  function animateReferee(delta) {
    if (!refP) return;
    var t = clock.elapsedTime, p = refP, mix = function (a, b, k) { return a + (b - a) * k; };
    // relaxed: breathing, weight shifting from foot to foot, turning a little and glancing around
    var sway = Math.sin(t * 0.55);
    p.hips.position.y = 1.0 + Math.sin(t * 1.7) * 0.006;
    p.hips.rotation.z = sway * 0.035;
    p.root.rotation.y = refYaw + Math.sin(t * 0.27) * 0.15;
    p.lLeg.rotation.set(Math.sin(t * 0.55 + 1) * 0.03, 0, -0.05 - sway * 0.035);
    p.rLeg.rotation.set(-Math.sin(t * 0.55 + 1) * 0.03, 0, 0.05 - sway * 0.035);
    var headY = Math.sin(t * 0.45 + 1) * 0.4, headX = 0.05 + Math.sin(t * 0.8) * 0.03;
    var lx = 0.08 + Math.sin(t * 1.1) * 0.05, lz = -0.1 - sway * 0.03, lf = -0.3;       // left arm hangs loose
    var rx = -0.3 + Math.sin(t * 1.1 + 2) * 0.04, rz = 0.12, rf = -0.9;                  // right hand holds the whistle at the waist

    if (refWhistleT >= 0) {
      refWhistleT += delta;
      var w = refWhistleT;
      // up (0-0.35 s), hold and blow (0.35-0.9 s), back down (0.9-1.25 s)
      var k = w < 0.35 ? w / 0.35 : w < 0.9 ? 1 : Math.max(0, 1 - (w - 0.9) / 0.35);
      k = k * k * (3 - 2 * k);
      rx = mix(rx, -1.25, k); rz = mix(rz, -0.45, k); rf = mix(rf, -2.3, k);          // whistle to the mouth
      lx = mix(lx, -1.35, k); lz = mix(lz, -0.25, k); lf = mix(lf, -0.15, k);         // other arm points to the spot
      headY = mix(headY, 0, k); headX = mix(headX, -0.05, k);
      if (w >= 0.42 && !refBlown) { refBlown = true; playSound('whistle'); }
      if (w >= 0.9 && refWhistleThen) { var go = refWhistleThen; refWhistleThen = null; go(); }
      if (w >= 1.25) refWhistleT = -1;
    }
    p.head.rotation.set(headX, headY, 0);
    p.lArm.rotation.set(lx, 0, lz); p.lArm.userData.fore.rotation.x = lf;
    p.rArm.rotation.set(rx, 0, rz); p.rArm.userData.fore.rotation.x = rf;
  }

  function createLeg() {
    // the shooter's own kicking leg (first person): it swings from the hip, so the boot is at the bottom
    legGroup = new THREE.Group();
    var M = function (c, rough) { return new THREE.MeshStandardMaterial({ color: c, roughness: rough || 0.7 }); };
    var part = function (geo, mat, y, z) { var m = new THREE.Mesh(geo, mat); m.position.set(0, y, z || 0); legGroup.add(m); return m; };
    part(new THREE.CylinderGeometry(0.1, 0.095, 0.25, 14), M(0x1d4ed8), -0.12);                 // shorts
    part(new THREE.CylinderGeometry(0.08, 0.062, 0.45, 14), M(0xe0ac69, 0.6), -0.3);           // thigh
    part(new THREE.SphereGeometry(0.064, 14, 10), M(0xe0ac69, 0.6), -0.52);                    // knee
    part(new THREE.CylinderGeometry(0.064, 0.064, 0.06, 14), M(0x1d4ed8), -0.57);               // sock band
    part(new THREE.CylinderGeometry(0.062, 0.048, 0.36, 14), M(0xf8fafc), -0.76);              // sock
    part(new THREE.BoxGeometry(0.11, 0.08, 0.26), M(0xef4444, 0.35), -0.97, -0.05);             // boot
    part(new THREE.SphereGeometry(0.055, 14, 10), M(0xef4444, 0.35), -0.975, -0.17).scale.set(1, 0.75, 1);
    part(new THREE.BoxGeometry(0.112, 0.02, 0.12), M(0xf8fafc), -0.95, -0.02);                  // boot stripe
    legGroup.traverse(function (m) { if (m.isMesh) m.castShadow = true; });
    legGroup.position.set(0.22, 1.0, PENALTY_DIST + 0.3);
    legGroup.visible = false;
    scene.add(legGroup);
  }

  // ---------- Questions ----------
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }   // 1000000 → 1,000,000
  // A textbook radical: the sign is drawn as a vector shape and its bar runs over the whole number. A hidden √ or ∛ keeps
  // the text readable for screen readers.
  function rootHTML(n, index) {
    return '<span class="rt' + (index ? ' cube' : '') + '"><span class="rt-sr">' + (index ? '∛' : '√') + '</span>' +
      (index ? '<span class="idx" data-i="' + index + '" aria-hidden="true"></span>' : '') +
      '<svg class="rsym" viewBox="0 0 10 20" preserveAspectRatio="none" aria-hidden="true"><path d="M0.6 11.6 L2.6 10.2 L5.4 19.2 L10 0.5"/></svg>' +
      '<span class="rad">' + n + '</span></span>';
  }
  var rad = function (n) { return rootHTML(n, 0); };
  var crad = function (n) { return rootHTML(n, 3); };
  // turns √81 and ∛64 in a line of text into drawn radicals, and 9² into 9<sup>2</sup>
  function roots(s) {
    return String(s).replace(/√([\d,]+\d|\d)/g, function (m, n) { return rad(n); }).replace(/∛([\d,]+\d|\d)/g, function (m, n) { return crad(n); })
      .replace(/(\d)²/g, '$1<sup>2</sup>').replace(/(\d)³/g, '$1<sup>3</sup>');
  }

  // Real-world versions of "side of a square" and "cube root" questions ({A} is the area or amount)
  var AREA_WORDS = [
    [T('A square garden has an area of <b>{A}</b> square feet.<br>How long is each side?', 'Un jardín cuadrado tiene un área de <b>{A}</b> pies cuadrados.<br>¿Cuánto mide cada lado?'),
      T('A square garden of {A} sq ft has sides of ? ft', 'Un jardín cuadrado de {A} pies² tiene lados de ? pies')],
    [T('A square rug covers <b>{A}</b> square feet of floor.<br>How long is each side?', 'Una alfombra cuadrada cubre <b>{A}</b> pies cuadrados.<br>¿Cuánto mide cada lado?'),
      T('A square rug of {A} sq ft has sides of ? ft', 'Una alfombra cuadrada de {A} pies² tiene lados de ? pies')],
    [T('<b>{A}</b> square tiles cover a square floor in equal rows.<br>How many tiles are in each row?', '<b>{A}</b> baldosas cuadradas cubren un piso cuadrado en filas iguales.<br>¿Cuántas baldosas hay en cada fila?'),
      T('{A} tiles in a square: ? tiles per row', '{A} baldosas en un cuadrado: ? por fila')],
    [T('A square photo has an area of <b>{A}</b> square inches.<br>How wide is it?', 'Una foto cuadrada tiene un área de <b>{A}</b> pulgadas cuadradas.<br>¿Cuánto mide de ancho?'),
      T('A square photo of {A} sq in is ? in wide', 'Una foto cuadrada de {A} pulg² mide ? pulg de ancho')]
  ];
  var CUBE_WORDS = [
    [T('A cube-shaped box is packed with <b>{A}</b> small cubes, no gaps.<br>How many cubes long is each edge?', 'Una caja cúbica está llena con <b>{A}</b> cubitos, sin huecos.<br>¿Cuántos cubitos mide cada arista?'),
      T('A cube box of {A} small cubes: ? cubes per edge', 'Una caja cúbica de {A} cubitos: ? por arista')],
    [T('A cube-shaped fish tank holds <b>{A}</b> cubic feet of water.<br>How long is each edge?', 'Una pecera cúbica contiene <b>{A}</b> pies cúbicos de agua.<br>¿Cuánto mide cada arista?'),
      T('A cube tank of {A} cu ft has edges of ? ft', 'Una pecera cúbica de {A} pies³ tiene aristas de ? pies')],
    [T('<b>{A}</b> sugar cubes are stacked into one big cube.<br>How many cubes tall is it?', '<b>{A}</b> terrones de azúcar se apilan en un cubo grande.<br>¿Cuántos terrones de alto mide?'),
      T('{A} sugar cubes in a big cube: ? cubes tall', '{A} terrones en un cubo grande: ? de alto')]
  ];
  function wordQ(q, list, amount) {
    var w = pick(list);
    q.word = true;
    q.html = '<span class="qsm">' + w[0].replace('{A}', fmt(amount)) + '</span>';
    q.plain = w[1].replace('{A}', fmt(amount));
  }

  // hard = the bonus question for a power shot: bigger numbers, more word problems and "closer to" estimates
  function makeQuestion(hard) {
    var active = [];
    for (var i = 0; i < SKILLS.length; i++) if (skillOn[i]) active.push(SKILLS[i].id);
    // Regular questions: squares and square roots 0-10, cube roots 0-5.
    // Power-shot (challenge) questions: squares and square roots 11-16, cube roots 6-10, and now and then a 1 followed by
    // zeros: √100 up to √100,000,000, 10² to 1,000², areas of 10,000 and 1,000,000, ∛1,000 up to ∛1,000,000,000, 10³ and 100³.
    var LOW_SQ = hard ? 11 : 0, MAX_SQ = hard ? 16 : 10, LOW_CUBE = hard ? 6 : 0, MAX_CUBE = hard ? 10 : 5;
    var bigSq = function () { return pick([10, 100, 1000, 10000]); };   // √100 ... √100,000,000
    var bigCube = function () { return pick([10, 100, 1000]); };      // ∛1,000 ... ∛1,000,000,000
    var big = function () { return hard && Math.random() < 0.3; };
    var wordy = function () { return Math.random() < (hard ? 0.6 : 0.35); };
    for (var tries = 0; tries < 40; tries++) {
      var skill = active[Math.floor(Math.random() * active.length)], q = { cat: skill, bonus: !!hard }, r, a, n;
      // each combined skill asks both ways: a root (√81, ∛64) or a power (9², 4³)
      if (skill === 'sqrt') skill = pick(['sqrt', 'square', 'area']);   // √81, 9², or the side of a square
      if (skill === 'cube') skill = pick(['cube', 'cubed', 'cubeside']);   // ∛64, 4³, or the edge of a cube
      if (skill === 'estimate' && hard) skill = 'closest';               // challenge: "Which whole number is closest to √50?"
      q.skill = skill;
      if (skill === 'sqrt') {
        r = big() ? bigSq() : rnd(LOW_SQ, MAX_SQ); q.r = r; q.answer = r;
        q.html = T('What is ', '¿Cuánto es ') + rad(fmt(r * r)) + T('?', '?');
        q.plain = '√' + fmt(r * r) + ' = ?';
      } else if (skill === 'square') {
        r = big() ? pick([10, 100, 1000]) : rnd(LOW_SQ, MAX_SQ); q.r = r; q.answer = r * r;   // up to 1,000² = 1,000,000
        q.html = T('What is ', '¿Cuánto es ') + fmt(r) + '<sup>2</sup>?';
        q.plain = fmt(r) + '² = ?';
      } else if (skill === 'area') {
        r = big() ? pick([100, 1000]) : rnd(Math.max(1, LOW_SQ), MAX_SQ); q.r = r; q.answer = r;   // areas of 10,000 or 1,000,000
        if (wordy()) wordQ(q, AREA_WORDS, r * r);
        else {
          q.html = '<span class="qsm">' + T('A square has an area of <b>' + fmt(r * r) + '</b> square units.<br>How long is each side?',
            'Un cuadrado tiene un área de <b>' + fmt(r * r) + '</b> unidades cuadradas.<br>¿Cuánto mide cada lado?') + '</span>';
          q.plain = T('A square with area ' + fmt(r * r) + ' has sides of ?', 'Un cuadrado de área ' + fmt(r * r) + ' tiene lados de ?');
        }
      } else if (skill === 'estimate') {
        if (Math.random() < (hard ? 0.5 : 0.3)) {
          // "Is √50 closer to 7 or to 8?" (never a near-tie)
          a = rnd(hard ? 11 : 1, MAX_SQ - 1); q.lo = a * a; q.hi = (a + 1) * (a + 1);   // regular: between 1 and 10; challenge: 11 and 16
          var opts = []; for (var m = q.lo + 1; m < q.hi; m++) if (Math.abs(Math.sqrt(m) - (a + 0.5)) > 0.12) opts.push(m);
          n = pick(opts);
          q.a = a; q.n = n; q.closer = true; q.answer = Math.round(Math.sqrt(n));
          q.html = '<span class="qsm">' + T('Is ' + rad(n) + ' closer to <b>' + a + '</b> or to <b>' + (a + 1) + '</b>?',
            '¿' + rad(n) + ' está más cerca de <b>' + a + '</b> o de <b>' + (a + 1) + '</b>?') + '</span>';
          q.plain = T('√' + n + ' is closer to ?', '√' + n + ' está más cerca de ?');
          q.sub = T('Type the whole number it is closer to.', 'Escribe el número entero más cercano.');
        } else {
          // a square root (or, about a third of the time, a cube root) that isn't a whole number:
          // the student finds BOTH whole numbers it's between
          q.cube = Math.random() < (hard ? 0.5 : 0.35);
          var pw = q.cube ? 3 : 2;
          a = q.cube ? rnd(hard ? 6 : 1, MAX_CUBE - 1) : rnd(hard ? 11 : 1, MAX_SQ - 1);   // regular: up to 10 (cube 5); challenge: 11-16 (cube 6-10)
          q.lo = Math.pow(a, pw); q.hi = Math.pow(a + 1, pw);
          n = rnd(q.lo + 1, q.hi - 1);
          q.a = a; q.n = n; q.two = true; q.answer = [a, a + 1];
          var blank = '<b class="blank">?</b>';
          q.html = (q.cube ? crad(n) : rad(n)) + T(' is between ', ' está entre ') + blank + T(' and ', ' y ') + blank;
          q.plain = (q.cube ? '∛' : '√') + n + T(' is between ', ' está entre ') + '?' + T(' and ', ' y ') + '?';
          q.sub = T('Type the two whole numbers it is between.', 'Escribe los dos números enteros entre los que está.');
        }
      } else if (skill === 'closest') {
        // "Which whole number is closest to √50?" (answer 7): square roots between 11 and 16, cube roots between 6 and 10.
        // Never a near-tie, and for cube roots the root's closeness and the number's closeness always agree.
        q.cube = Math.random() < 0.4;
        var cpw = q.cube ? 3 : 2, root = q.cube ? Math.cbrt : Math.sqrt;
        a = q.cube ? rnd(6, 9) : rnd(11, 15);
        q.lo = Math.pow(a, cpw); q.hi = Math.pow(a + 1, cpw);
        var cands = [];
        for (var cm = q.lo + 1; cm < q.hi; cm++) {
          var rt = root(cm), nearA = rt < a + 0.5, byNumber = (cm - q.lo) < (q.hi - cm);
          if (Math.abs(rt - (a + 0.5)) > 0.12 && nearA === byNumber) cands.push(cm);
        }
        n = pick(cands);
        q.a = a; q.n = n; q.closer = true; q.closest = true; q.answer = Math.round(root(n));
        var sym = q.cube ? crad(fmt(n)) : rad(fmt(n));
        q.html = '<span class="qsm">' + T('Which whole number is closest to ' + sym + '?', '¿Qué número entero está más cerca de ' + sym + '?') + '</span>';
        q.plain = T('The whole number closest to ' + (q.cube ? '∛' : '√') + fmt(n) + ' is ?', 'El entero más cercano a ' + (q.cube ? '∛' : '√') + fmt(n) + ' es ?');
        q.sub = T('Type one whole number.', 'Escribe un número entero.');
      } else if (skill === 'cubeside') {   // the edge of a cube from its volume
        r = big() ? pick([10, 100]) : rnd(Math.max(1, LOW_CUBE), MAX_CUBE); q.r = r; q.answer = r;
        if (r > 1 && r < 100 && wordy()) wordQ(q, CUBE_WORDS, r * r * r);
        else {
          q.html = '<span class="qsm">' + T('A cube has a volume of <b>' + fmt(r * r * r) + '</b> cubic units.<br>How long is each edge?',
            'Un cubo tiene un volumen de <b>' + fmt(r * r * r) + '</b> unidades cúbicas.<br>¿Cuánto mide cada arista?') + '</span>';
          q.plain = T('A cube with volume ' + fmt(r * r * r) + ' has edges of ?', 'Un cubo de volumen ' + fmt(r * r * r) + ' tiene aristas de ?');
        }
      } else if (skill === 'cubed') {   // 4³ = ? (challenge: 6³ to 10³; 10³ = 1,000 is the power of ten)
        r = big() ? pick([10, 100]) : rnd(LOW_CUBE, MAX_CUBE); q.r = r; q.answer = r * r * r;   // up to 100³ = 1,000,000
        q.html = T('What is ', '¿Cuánto es ') + fmt(r) + '<sup>3</sup>?';
        q.plain = fmt(r) + '³ = ?';
      } else {
        r = big() ? bigCube() : rnd(LOW_CUBE, MAX_CUBE); q.r = r; q.answer = r;
        q.html = T('What is ', '¿Cuánto es ') + crad(fmt(r * r * r)) + '?';
        q.plain = '∛' + fmt(r * r * r) + ' = ?';
      }
      q.key = q.plain;
      if (!usedQ[q.key] && q.key !== lastKey) { usedQ[q.key] = true; lastKey = q.key; return q; }
    }
    lastKey = q.key;
    return q;
  }

  function skillName(id) { for (var i = 0; i < SKILLS.length; i++) if (SKILLS[i].id === id) return SKILLS[i].name; return ''; }

  function askQuestion(bonus) {
    question = makeQuestion(!!bonus);
    $('q-kick').textContent = bonus ? T('⚡ BONUS QUESTION · POWER SHOT', '⚡ PREGUNTA EXTRA · TIRO POTENTE')
      : T('KICK ', 'TIRO ') + (kickNum + 1) + T(' OF ', ' DE ') + KICKS + ' · ' + skillName(question.cat).toUpperCase();
    $('q-kick').classList.toggle('bonus', !!bonus);
    $('q-bonus').hidden = !bonus;
    $('q-skip').hidden = !bonus;
    $('q-text').innerHTML = question.html;
    $('q-text').classList.toggle('long', !!question.two);
    $('q-sub').textContent = question.sub || T('Type a whole number.', 'Escribe un número entero.');
    qIn.value = ''; qIn2.value = '';
    $('q-and').hidden = qIn2.hidden = !question.two;
    $('q-ans').classList.toggle('two', !!question.two);
    setActiveBox(qIn);
    // "Is √150 closer to 12 or 13?" is answered by picking one of two buttons (click, tap, or arrow keys and Enter)
    var choice = !!(question.closer && !question.closest);
    scrQ.querySelector('.card').classList.toggle('choice', choice);
    var box = $('q-choices');
    box.innerHTML = ''; box.hidden = !choice;
    if (choice) {
      $('q-sub').textContent = T('Pick the whole number it is closer to.', 'Elige el número entero más cercano.');
      [question.a, question.a + 1].forEach(function (v) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'btn choice'; b.textContent = v;
        b.addEventListener('click', function () { if (state !== STATE.MATH) return; qIn.value = String(v); submitAnswer(); });
        box.appendChild(b);
      });
    }
    hideAimHud();
    show(scrQ);
    state = STATE.MATH;
    if (choice) { if (!isTouch) box.firstChild.focus({ preventScroll: true }); }
    else if (!isTouch) qIn.focus({ preventScroll: true });
  }

  // the answer box the number pad (and typing outside the boxes) fills
  function setActiveBox(el) {
    activeIn = el;
    qIn.classList.toggle('active', !!question && question.two && el === qIn);
    qIn2.classList.toggle('active', el === qIn2);
  }
  function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  function answerText(ans) { return Array.isArray(ans) ? ans[0] + T(' and ', ' y ') + ans[1] : fmt(ans); }

  function submitAnswer() {
    if (state !== STATE.MATH) return;
    var v1 = parseInt(qIn.value, 10), v2 = parseInt(qIn2.value, 10), ok, given;
    if (isNaN(v1)) { shake(qIn); setActiveBox(qIn); if (!isTouch) qIn.focus(); return; }
    if (question.two) {
      if (isNaN(v2)) {   // first box done: on to the second one
        if (activeIn === qIn2) shake(qIn2);
        setActiveBox(qIn2); if (!isTouch) qIn2.focus();
        return;
      }
      ok = Math.min(v1, v2) === question.answer[0] && Math.max(v1, v2) === question.answer[1];   // either order
      given = [v1, v2];
    } else {
      ok = v1 === question.answer;
      given = v1;
    }
    hide(scrQ);
    if (question.bonus) {   // the bonus question: right earns a power shot; wrong just shows why, then a normal shot
      if (ok) { powerShot = true; playSound('blip'); goShoot(); }
      else { missed.push({ q: question.plain, you: answerText(given), ans: question.answer }); showExplanation(answerText(given), given); }
      return;
    }
    if (ok) {
      rightCount++;
      askQuestion(true);   // offer the bonus question (it can be skipped)
    } else {
      missed.push({ q: question.plain, you: answerText(given), ans: question.answer });
      showExplanation(answerText(given), given);
    }
  }

  // to the penalty spot: aim right away, while the referee blows the whistle
  function goShoot() {
    hide(scrQ);
    startAiming();
    refWhistle();
  }
  function skipBonus() { if (state === STATE.MATH && question && question.bonus) goShoot(); }

  // ---------- Wrong answer: show why ----------
  // Sides up to 16 are drawn square by square; a side of 100 is drawn as 10 blocks of 10
  function blocks(r) { if (r <= 16 || r % 10) return { n: r, b: 1 }; var b = r >= 100 ? r / 10 : 10; return { n: r / b, b: b }; }

  function gridHTML(r, sizePx) {
    var k = blocks(r), n = k.n, px = Math.max(6, Math.floor(sizePx / n)), cells = '';
    for (var i = 0; i < n * n; i++) cells += '<i style="animation-delay:' + Math.round(i * 1000 / (n * n)) + 'ms"></i>';
    return '<div class="grid" style="grid-template-columns:repeat(' + n + ',' + px + 'px);grid-template-rows:repeat(' + n + ',' + px + 'px)">' + cells + '</div>' +
      '<div class="gcap">' + fmt(r) + ' × ' + fmt(r) +
      (k.b > 1 ? T('<br>each square is ', '<br>cada cuadrado es ') + k.b + ' × ' + k.b + ' = ' + fmt(k.b * k.b) : '') + '</div>';
  }

  // A cube of r × r × r little cubes, drawn at an angle so its top and two sides show
  function cubeHTML(rTrue, sizePx) {
    var k = blocks(rTrue), r = k.n;
    var s = sizePx / (r * 1.8), c30 = Math.cos(Math.PI / 6), s30 = 0.5;
    var P = function (x, y, z) { return [(x - z) * c30 * s, (x + z) * s30 * s - y * s]; };
    var pts = [], faces = [
      { fill: '#60a5fa', corner: function (u, v) { return P(u, r, v); } },   // top
      { fill: '#3b82f6', corner: function (u, v) { return P(r, r - v, u); } },   // right side
      { fill: '#1d4ed8', corner: function (u, v) { return P(u, r - v, r); } }    // front side
    ];
    var svg = '';
    faces.forEach(function (f) {
      var cs = [f.corner(0, 0), f.corner(r, 0), f.corner(r, r), f.corner(0, r)];
      svg += '<polygon points="' + cs.map(function (p) { return p.join(','); }).join(' ') + '" fill="' + f.fill + '"/>';
      for (var i = 1; i < r; i++) {   // the lines between the little cubes
        var a = f.corner(i, 0), b = f.corner(i, r), c = f.corner(0, i), d = f.corner(r, i);
        svg += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>' +
          '<line x1="' + c[0] + '" y1="' + c[1] + '" x2="' + d[0] + '" y2="' + d[1] + '"/>';
      }
      cs.forEach(function (p) { pts.push(p); });
    });
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var minX = Math.min.apply(null, xs), minY = Math.min.apply(null, ys), w = Math.max.apply(null, xs) - minX, h = Math.max.apply(null, ys) - minY;
    return '<svg class="cube" width="' + Math.round(w + 4) + '" height="' + Math.round(h + 4) + '" viewBox="' + (minX - 2) + ' ' + (minY - 2) + ' ' + (w + 4) + ' ' + (h + 4) + '" role="img" aria-label="' +
      T('A cube made of ', 'Un cubo hecho de ') + fmt(rTrue * rTrue * rTrue) + (rTrue * rTrue * rTrue === 1 ? T(' little cube', ' cubito') : T(' little cubes', ' cubitos')) + '">' + svg + '</svg>' +
      '<div class="gcap">' + fmt(rTrue) + ' × ' + fmt(rTrue) + ' × ' + fmt(rTrue) + ' = ' + fmt(rTrue * rTrue * rTrue) + (rTrue * rTrue * rTrue === 1 ? T(' little cube', ' cubito') : T(' little cubes', ' cubitos')) +
      (k.b > 1 ? T('<br>each block is ', '<br>cada bloque es ') + k.b + ' × ' + k.b + ' × ' + k.b + ' = ' + fmt(k.b * k.b * k.b) : '') + '</div>';
  }

  // When a wrong answer matches a classic mistake, say so first, so the student sees what went wrong.
  function mistakeTip(q, v) {
    var r = q.r, A, tip = '';
    if (q.two) {
      var lo2 = Math.min(v[0], v[1]), hi2 = Math.max(v[0], v[1]);
      if (hi2 - lo2 !== 1) tip = T('The two whole numbers are always next to each other, like 7 and 8.', 'Los dos números enteros siempre van seguidos, como 7 y 8.');
      else tip = T('Check: ', 'Comprueba: ') + lo2 + (q.cube ? '³' : '²') + ' = ' + Math.pow(lo2, q.cube ? 3 : 2) + T(' and ', ' y ') + hi2 + (q.cube ? '³' : '²') + ' = ' + Math.pow(hi2, q.cube ? 3 : 2) +
        T(', so ', ', así que ') + q.n + T(' is not between them.', ' no está entre ellos.');
      return tip;
    }
    if (q.closer) {
      var near = q.answer === q.a ? q.lo : q.hi, far = q.answer === q.a ? q.hi : q.lo;
      return q.n + T(' is only ', ' está a solo ') + Math.abs(q.n - near) + T(' away from ', ' de ') + near + T(', but ', ', pero a ') + Math.abs(far - q.n) +
        T(' away from ', ' de ') + far + '.';
    }
    if (q.skill === 'sqrt' || q.skill === 'area') {
      A = r * r;
      if (v * 2 === A) tip = T('Halving isn\'t the square root: ', 'Dividir entre 2 no es la raíz cuadrada: ') + fmt(A) + ' ÷ 2 = ' + fmt(v) + T(', but ', ', pero ') + fmt(v) + ' × ' + fmt(v) + ' = ' + fmt(v * v) + '.';
      else if (q.skill === 'area' && v * 4 === A) tip = T('Dividing by 4 finds a side from the perimeter (the distance around), not from the area.', 'Dividir entre 4 da el lado a partir del perímetro (la distancia alrededor), no del área.');
      else if (v === A) tip = T('That\'s the area itself. The side is the number that times itself makes ', 'Ese es el área. El lado es el número que por sí mismo da ') + fmt(A) + '.';
      else tip = T('Check by squaring your answer: ', 'Comprueba elevando tu respuesta al cuadrado: ') + fmt(v) + ' × ' + fmt(v) + ' = ' + fmt(v * v) + T(', not ', ', no ') + fmt(A) + '.';
    } else if (q.skill === 'square') {
      if (v === r * 2) tip = r + '² ' + T('means ', 'significa ') + r + ' × ' + r + T(', not ', ', no ') + r + ' × 2.';
      else if (v === r + 2) tip = r + '² ' + T('means ', 'significa ') + r + ' × ' + r + T(', not ', ', no ') + r + ' + 2.';
    } else if (q.skill === 'cube' || q.skill === 'cubeside') {
      A = r * r * r;
      if (v * 3 === A) tip = T('A cube root isn\'t dividing by 3: ', 'La raíz cúbica no es dividir entre 3: ') + fmt(v) + ' × ' + fmt(v) + ' × ' + fmt(v) + ' = ' + fmt(v * v * v) + '.';
      else if (v * v === A) tip = T('That\'s the square root. A cube root uses 3 equal factors: ', 'Esa es la raíz cuadrada. La raíz cúbica usa 3 factores iguales: ') + r + ' × ' + r + ' × ' + r + ' = ' + fmt(A) + '.';
      else if (v === A) tip = T('That\'s the number itself. Which number, used 3 times, multiplies to ', 'Ese es el número. ¿Qué número, multiplicado 3 veces, da ') + fmt(A) + '?';
      else tip = T('Check: ', 'Comprueba: ') + fmt(v) + ' × ' + fmt(v) + ' × ' + fmt(v) + ' = ' + fmt(v * v * v) + T(', not ', ', no ') + fmt(A) + '.';
    } else if (q.skill === 'cubed') {
      if (v === r * 3) tip = r + '³ ' + T('means ', 'significa ') + r + ' × ' + r + ' × ' + r + T(', not ', ', no ') + r + ' × 3.';
      else if (v === r * r) tip = T('That\'s ', 'Eso es ') + r + '². ' + r + '³ ' + T('needs one more ', 'necesita otro ') + r + ': ' + r + ' × ' + r + ' × ' + r + '.';
      else if (v === r + 3) tip = r + '³ ' + T('means ', 'significa ') + r + ' × ' + r + ' × ' + r + T(', not ', ', no ') + r + ' + 3.';
    }
    return tip;
  }

  function showExplanation(given, raw) {
    state = STATE.EXPLANATION;
    var q = question, r = q.r, body = '', lines = [];
    $('exp-you').innerHTML = T('You answered <b>' + given + '</b>. The answer is <b class="ok">' + answerText(q.answer) + '</b>.',
      'Respondiste <b>' + given + '</b>. La respuesta es <b class="ok">' + answerText(q.answer) + '</b>.');
    var tip = raw === undefined ? '' : mistakeTip(q, raw);
    $('exp-tip').innerHTML = tip ? '💡 ' + roots(tip) : '';
    $('exp-tip').hidden = !tip;
    // a missed bonus question just leads to a normal shot, not a wild one
    $('exp-go').textContent = q.bonus ? T('TAKE THE SHOT', 'A TIRAR') : T('WATCH THE MISS', 'VER EL FALLO');
    $('exp-wild').hidden = !!q.bonus;

    if (q.skill === 'sqrt' || q.skill === 'square' || q.skill === 'area') {
      body = gridHTML(r, Math.min(200, Math.max(120, app.clientHeight * 0.3)));
      if (q.skill === 'sqrt') {
        lines.push(T('A square root is the side length of a square with that area.', 'La raíz cuadrada es el lado de un cuadrado con esa área.'));
        lines.push(r + ' × ' + r + ' = ' + fmt(r * r) + T(', so ', ', entonces ') + '√' + fmt(r * r) + ' = <b class="ok">' + r + '</b>');
      } else if (q.skill === 'square') {
        lines.push(r + '<sup>2</sup>' + T(' means ', ' significa ') + r + ' × ' + r + T(': a square with sides of ', ': un cuadrado con lados de ') + r + '.');
        lines.push(r + ' × ' + r + ' = <b class="ok">' + fmt(r * r) + '</b>' + T(' squares', ' cuadrados'));
      } else {
        lines.push(T('Side × side = area. Which number times itself makes ', 'Lado × lado = área. ¿Qué número por sí mismo da ') + fmt(r * r) + '?');
        lines.push(r + ' × ' + r + ' = ' + fmt(r * r) + T(', so each side is ', ', así que cada lado mide ') + '<b class="ok">' + r + '</b>');
      }
    } else if (q.skill === 'cube' || q.skill === 'cubed' || q.skill === 'cubeside') {
      body = cubeHTML(r, Math.min(220, Math.max(130, app.clientHeight * 0.34)));
      if (q.skill === 'cubeside') {
        lines.push(T('Edge × edge × edge = volume. Which number, used 3 times, multiplies to ', 'Arista × arista × arista = volumen. ¿Qué número, multiplicado 3 veces, da ') + fmt(r * r * r) + '?');
        lines.push(r + ' × ' + r + ' × ' + r + ' = ' + fmt(r * r * r) + T(', so each edge is ', ', así que cada arista mide ') + '<b class="ok">' + fmt(r) + '</b>');
      } else if (q.skill === 'cubed') {
        lines.push(r + '<sup>3</sup>' + T(' means ', ' significa ') + r + ' × ' + r + ' × ' + r + T(': a cube with edges of ', ': un cubo con aristas de ') + r + '.');
        lines.push(r + ' × ' + r + ' × ' + r + ' = <b class="ok">' + fmt(r * r * r) + '</b>' + (r * r * r === 1 ? T(' little cube', ' cubito') : T(' little cubes', ' cubitos')));
      } else {
        lines.push(T('A cube root asks: which number, used 3 times, multiplies to ', 'Una raíz cúbica pregunta: ¿qué número, multiplicado 3 veces, da ') + fmt(r * r * r) + '?');
        lines.push(r + ' × ' + r + ' × ' + r + ' = ' + fmt(r * r * r) + T(', so ', ', entonces ') + '∛' + fmt(r * r * r) + ' = <b class="ok">' + r + '</b>');
      }
    } else if (q.closer) {
      var ca = q.a, cb = ca + 1, clo = q.lo, chi = q.hi, cpct = Math.round((q.n - clo) / (chi - clo) * 100);
      var cp = q.cube ? '³' : '²', cs = q.cube ? '∛' : '√', ct = function (x) { return x + ' × ' + x + (q.cube ? ' × ' + x : ''); };
      body = '<div class="nl"><div class="nl-bar"></div>' +
        '<div class="nl-tick" style="left:0"><b>' + fmt(clo) + '</b><span>' + ca + cp + '</span></div>' +
        '<div class="nl-tick" style="left:100%"><b>' + fmt(chi) + '</b><span>' + cb + cp + '</span></div>' +
        '<div class="nl-pt" style="left:' + cpct + '%"><b>' + fmt(q.n) + '</b></div></div>';
      lines.push(ct(ca) + ' = ' + fmt(clo) + T(' and ', ' y ') + ct(cb) + ' = ' + fmt(chi) + T(', so ', ', así que ') + cs + fmt(q.n) + T(' is between ', ' está entre ') + ca + T(' and ', ' y ') + cb + '.');
      lines.push(fmt(q.n) + T(' is closer to ', ' está más cerca de ') + fmt(q.answer === ca ? clo : chi) + T(', so ', ', así que ') + cs + fmt(q.n) + T(' is closer to ', ' está más cerca de ') +
        '<b class="ok">' + q.answer + '</b> (' + cs + fmt(q.n) + ' ≈ ' + (q.cube ? Math.cbrt(q.n) : Math.sqrt(q.n)).toFixed(2) + ').');
    } else {
      var a = q.a, b = a + 1, lo = q.lo, hi = q.hi, pct = Math.round((q.n - lo) / (hi - lo) * 100);
      var pw = q.cube ? '³' : '²', times = function (x) { return x + ' × ' + x + (q.cube ? ' × ' + x : ''); };
      body = '<div class="nl"><div class="nl-bar"></div>' +
        '<div class="nl-tick" style="left:0"><b>' + lo + '</b><span>' + a + pw + '</span></div>' +
        '<div class="nl-tick" style="left:100%"><b>' + hi + '</b><span>' + b + pw + '</span></div>' +
        '<div class="nl-pt" style="left:' + pct + '%"><b>' + q.n + '</b></div></div>';
      lines.push(q.cube ? T('Find the perfect cubes on either side of ', 'Busca los cubos perfectos a cada lado de ') + q.n + ':'
        : T('Find the perfect squares on either side of ', 'Busca los cuadrados perfectos a cada lado de ') + q.n + ':');
      lines.push(times(a) + ' = ' + lo + T(' and ', ' y ') + times(b) + ' = ' + hi);
      lines.push(lo + ' < ' + q.n + ' < ' + hi + T(', so ', ', entonces ') + (q.cube ? '∛' : '√') + q.n + T(' is between ', ' está entre ') +
        '<b class="ok">' + a + '</b>' + T(' and ', ' y ') + '<b class="ok">' + b + '</b>');
    }
    if (r === 0) body = '';   // nothing to draw for 0
    $('exp-visual').innerHTML = body;
    $('exp-lines').innerHTML = lines.map(function (l) { return '<p>' + roots(l) + '</p>'; }).join('');
    show(scrExp);
    $('exp-go').focus({ preventScroll: true });
  }

  function closeExplanation() {
    if (state !== STATE.EXPLANATION) return;
    hide(scrExp);
    if (question.bonus) { goShoot(); return; }         // missed the bonus: a normal shot
    refWhistle(function () { executeKick(true); });   // missed the math: after the whistle, the shot goes wild
  }

  // ---------- Aiming and shooting ----------
  function startAiming() {
    state = STATE.AIMING;
    aimPower = 0;
    show(aimHint);
    $('power-badge').hidden = !powerShot;
    chance.hidden = true;
    targetCrosshair.visible = true;
    var aimColor = powerShot ? AIM_GREEN : AIM_YELLOW;   // yellow for a regular shot, green for a power shot
    targetCrosshair.material.color.setHex(aimColor);
    errorCircle.children.forEach(function (m) { m.material.color.setHex(aimColor); });
    setAim(0, 1.2);
    focusGame();
  }

  function hideAimHud() { aimHint.hidden = true; chance.hidden = true; $('power-badge').hidden = true; }

  function setAim(tx, ty) {
    tx = Math.max(-6, Math.min(6, tx));
    ty = Math.max(0.1, Math.min(4, ty));
    targetCrosshair.position.set(tx, ty, 0);
    errorCircle.position.set(tx, ty, 0);
  }

  function aimAt(clientX, clientY) {
    if (state !== STATE.AIMING) return;   // once the power starts, the aim is locked
    var rect = canvas.getBoundingClientRect();
    mouseVector.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseVector.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseVector, camera);
    var hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(goalPlane, hit)) setAim(hit.x, hit.y);
  }

  function startCharge() {
    if (state === STATE.RESULT && resultDecided) { skipResult(); return; }
    if (state !== STATE.AIMING) return;
    state = STATE.CHARGING;
    aimPower = 0;
    errorCircle.visible = true;
    playSound('blip');
  }

  function endCharge() { if (state === STATE.CHARGING) executeKick(false); }

  function executeKick(autoMiss) {
    state = STATE.KICKING;
    isAutoMiss = autoMiss;
    resultDecided = false;
    kickPhase = 0;
    hitKeeper = false;
    legGroup.visible = true;
    legGroup.rotation.x = -Math.PI / 3;
    aimHint.hidden = true;
  }

  // The leg reaches the ball: work out the shot and launch it
  function launchBall() {
    legGroup.visible = false;
    state = STATE.RESULT;
    playSound('kick');
    targetCrosshair.visible = false;
    errorCircle.visible = false;

    var aimX = targetCrosshair.position.x, aimY = targetCrosshair.position.y;
    var x = aimX, y = aimY, speed = 18 + aimPower * 14;
    shotPower = aimPower;
    if (isAutoMiss) {
      x = (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 2);
      y = 3.5 + Math.random() * 2;
      speed = 22;
    } else {
      releaseOdds = shotOdds(aimX, aimY, aimPower);
      showOdds(releaseOdds, false);   // the chance at the moment of release stays on screen
      var errR = errorRadiusFor(aimPower) * Math.sqrt(Math.random()), errA = Math.random() * Math.PI * 2;
      x += Math.cos(errA) * errR;
      y = Math.max(BALL_RADIUS, y + Math.sin(errA) * errR);
    }

    // Inverse ballistics: the velocity that carries the ball from the spot to (x, y) on the goal line
    var g = 9.81, t = Math.sqrt(x * x + PENALTY_DIST * PENALTY_DIST) / speed;
    ballBody.velocity.set(x / t, (y - BALL_RADIUS + 0.5 * g * t * t) / t, -PENALTY_DIST / t);
    ballBody.angularVelocity.set(-PENALTY_DIST / t * 2, 0, 0);

    keeperDecision(x, y, t);
  }

  // ---------- The scoring chance ----------
  // Chance of scoring = chance the shot is on target × chance it beats the keeper once it is.
  // The shot lands somewhere in the power circle (any spot equally likely), so both parts are worked out over
  // evenly spread points in that circle. The game decides every shot with these same numbers, so the % is honest.
  var DISC = (function () {   // 240 evenly spread points in a circle of radius 1
    var pts = [], n = 240, golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < n; i++) { var r = Math.sqrt((i + 0.5) / n), a = i * golden; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    return pts;
  })();

  // the whole ball clears the posts and the bar (so it can't clip the frame)
  function onTarget(x, y) { var m = BALL_RADIUS + POST_RADIUS; return Math.abs(x) < GOAL_WIDTH / 2 - m && y < GOAL_HEIGHT - m; }

  // Chance a shot landing at (x, y) in the goal beats the keeper. Right at the keeper is easy to stop; the further
  // toward a corner the better, top corners best. A weak (badly timed) shot is easier to stop.
  // ---------- The keeper adapts to the student ----------
  // A rating from 0 (brand new) to 1 (expert), saved on this device and never shown to the student. Everyone starts on an easy
  // keeper; each goal makes him a little better (more for a goal from a hard spot) and each miss or save a little easier,
  // so strong players soon need precise, well-timed corner shots while students who are struggling get an easier keeper.
  // The shown chance always uses the current level, so it stays the true chance.
  var skillRating = Math.max(0, Math.min(1, +load('rating', 0) || 0)), releaseOdds = null;
  function adaptKeeper(kind) {
    if (kind === 'goal') skillRating += 0.05 + (releaseOdds && releaseOdds.total < 0.6 ? 0.03 : 0);
    else skillRating -= 0.05;
    skillRating = Math.max(0, Math.min(1, skillRating));
    save('rating', Math.round(skillRating * 1000) / 1000);
  }

  function beatChance(x, y, power) {
    var dx = Math.min(1, Math.abs(x) / (GOAL_WIDTH / 2)), dy = Math.min(1, y / GOAL_HEIGHT);
    var place = 0.4 + 0.46 * Math.pow(dx, 1.2) + 0.1 * dy + 0.1 * dx * dy;
    var strike = 0.7 + 0.3 * power;
    // level 1: a generous keeper (even a shot at him goes in about 2 times in 3); level 10: a sharp one
    var p = place * strike * (1.2 - 0.45 * skillRating) + 0.12 * (1 - skillRating);
    return Math.max(0.05, Math.min(0.98, p));
  }

  function shotOdds(ax, ay, power) {
    var R = errorRadiusFor(power), on = 0, beat = 0;
    for (var i = 0; i < DISC.length; i++) {
      var x = ax + DISC[i][0] * R, y = Math.max(BALL_RADIUS, ay + DISC[i][1] * R);
      if (onTarget(x, y)) { on++; beat += beatChance(x, y, power); }
    }
    return { on: on / DISC.length, beat: on ? beat / on : 0, total: beat / DISC.length };
  }

  var lastOdds = '';
  function showOdds(o, best) {
    var pct = function (v) { return Math.round(v * 100) + '%'; };
    var total = Math.round(o.total * 100);
    var key = (best ? 'b' : 'c') + total;
    if (key === lastOdds && !chance.hidden) return;   // only touch the page when something changed
    lastOdds = key;
    $('chance-lbl').textContent = best ? T('BEST CHANCE HERE', 'MEJOR PROBABILIDAD AQUÍ') : T('SCORING CHANCE', 'PROBABILIDAD DE GOL');
    $('chance-n').textContent = total;
    chance.className = total > 65 ? 'good' : total > 35 ? 'mid' : 'bad';
    chance.hidden = false;
  }

  // ---------- Keeper: the scoring chance decides the save ----------
  var keeperTarget = { x: 0, y: 0 }, keeperDiving = false, keeperReactionDelay = 0, keeperDiveTime = 0, keeperDiveDuration = 0.6;
  var catching = false, standingCatch = false, caught = false, caughtTime = 0;

  // A catch: the keeper takes a pose that suits the ball's height, and is placed so his gloves are exactly where the
  // ball will be when it reaches them. kind: 'high' (arms up), 'mid' (arms out in front), 'low' (crouch and scoop)
  // or 'dive' (a weak shot to the side, caught at full stretch).
  var catchKind = 'mid', catchDir = 1, catchZ = 1.2, catchTilt = 0;

  function applyCatchPose(kind, dir) {
    var fl = kLArm.userData.fore, fr = kRArm.userData.fore;
    kTorso.position.y = 1.0; kTorso.rotation.set(0, 0, 0);
    kLLeg.userData.shin.rotation.x = kRLeg.userData.shin.rotation.x = 0;   // straight knees for dives and catches
    if (kHead) kHead.rotation.set(0, 0, 0);
    if (kind === 'dive') {
      fl.rotation.x = fr.rotation.x = -0.25;
      if (dir < 0) { kLArm.rotation.set(-0.3, 0, -(Math.PI - 0.35)); kRArm.rotation.set(-0.3, 0, -(Math.PI - 0.75)); kLLeg.rotation.set(0, 0, -0.2); kRLeg.rotation.set(-0.3, 0, 0.3); }
      else { kRArm.rotation.set(-0.3, 0, Math.PI - 0.35); kLArm.rotation.set(-0.3, 0, Math.PI - 0.75); kRLeg.rotation.set(0, 0, 0.2); kLLeg.rotation.set(-0.3, 0, -0.3); }
    } else if (kind === 'high') {
      kLArm.rotation.set(-2.55, 0, 0.16); kRArm.rotation.set(-2.55, 0, -0.16);
      fl.rotation.x = fr.rotation.x = -0.35;
      kLLeg.rotation.set(0, 0, -0.06); kRLeg.rotation.set(0, 0, 0.06);
    } else if (kind === 'mid') {
      kTorso.position.y = 0.97;
      kLArm.rotation.set(-1.1, 0, 0.24); kRArm.rotation.set(-1.1, 0, -0.24);
      fl.rotation.x = fr.rotation.x = -0.8;
      kLLeg.rotation.set(-0.12, 0, -0.08); kRLeg.rotation.set(-0.12, 0, 0.08);
    } else if (kind === 'low') {   // knees bent, body forward, gloves low in front
      kTorso.position.y = 0.72; kTorso.rotation.x = 0.4;
      kLArm.rotation.set(-0.55, 0, 0.18); kRArm.rotation.set(-0.55, 0, -0.18);
      fl.rotation.x = fr.rotation.x = -0.35;
      kLLeg.rotation.set(-1.0, 0, -0.14); kRLeg.rotation.set(-1.0, 0, 0.14);
    } else {   // ground: a deep squat, scooping the ball off the grass
      kTorso.position.y = 0.46; kTorso.rotation.x = 0.9;
      kLArm.rotation.set(-0.95, 0, 0.16); kRArm.rotation.set(-0.95, 0, -0.16);
      fl.rotation.x = fr.rotation.x = -0.2;
      kLLeg.rotation.set(-1.1, 0, -0.2); kRLeg.rotation.set(-1.1, 0, 0.2);
    }
  }

  // where the middle of the keeper's gloves ends up, relative to his feet, in a catch pose (tilted for a dive)
  function gloveOffset(kind, dir, tilt) {
    keeperGroup.position.set(0, 0, 0);
    keeperGroup.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), tilt);
    applyCatchPose(kind, dir);
    keeperGroup.updateMatrixWorld(true);
    kLArm.userData.fore.localToWorld(handL.set(0, -0.36, 0.05));
    kRArm.userData.fore.localToWorld(handR.set(0, -0.36, 0.05));
    return { x: (handL.x + handR.x) / 2, y: (handL.y + handR.y) / 2, z: (handL.z + handR.z) / 2 };
  }

  function diveTilt(x) { return (x / (GOAL_WIDTH / 2)) * -(Math.PI / 2.3); }

  function planCatch(targetX, targetY) {
    var v = ballBody.velocity, g = 9.81;
    var at = function (z) {   // where the ball is when it reaches the plane z, and when
      var t = (PENALTY_DIST - z) / -v.z;
      return { x: v.x * t, y: BALL_RADIUS + v.y * t - 0.5 * g * t * t, t: t };
    };
    catchDir = targetX < 0 ? -1 : 1;
    var off, p, z, best = null;
    if (Math.abs(targetX) >= 1.1) {
      // a dive: lean over just far enough (nearly upright for a high ball, flat out for one along the grass) that
      // the gloves are at the ball's height
      catchKind = 'dive';
      for (var a = 0.25; a <= 1.56; a += 0.06) {
        var tl = -catchDir * a, o = gloveOffset('dive', catchDir, tl), zz = keeperBody.position.z + o.z, pp = at(zz);
        var gap = pp.y - o.y, score = gap >= -0.02 ? gap : -gap * 4;
        if (!best || score < best.score) best = { tilt: tl, off: o, p: pp, z: zz, score: score };
      }
      catchTilt = best.tilt; off = best.off; p = best.p; z = best.z;
    } else {
      // standing: the pose whose gloves come closest to the ball without his feet going below the grass
      ['ground', 'low', 'mid', 'high'].forEach(function (kind) {
        var o = gloveOffset(kind, catchDir, 0), zz = keeperBody.position.z + o.z, pp = at(zz);
        var gap = pp.y - o.y;   // how far the gloves are from the ball, up or down
        var score = Math.abs(gap);   // feet stay on the grass: just the closest gloves
        if (!best || score < best.score) best = { kind: kind, off: o, p: pp, z: zz, score: score };
      });
      catchKind = best.kind; off = best.off; p = best.p; z = best.z;
    }
    keeperTarget = { x: p.x - off.x, y: catchKind === 'dive' ? Math.max(0, p.y - off.y) : 0 };   // only a dive leaves the ground
    catchZ = z;
    keeperReactionDelay = p.t * 0.1;
    keeperDiveDuration = p.t * 0.9;   // the gloves arrive just as the ball does
  }

  // ---------- Goal celebrations: the net ripples, confetti flies ----------
  var backNet = null, netBase = null, rippleT = -1, rippleX = 0, rippleY = 1, rippleDone = false;
  function startRipple(x, y) {
    rippleDone = true;
    if (!backNet) return;
    if (!netBase) netBase = Float32Array.from(backNet.geometry.attributes.position.array);
    rippleT = 0; rippleX = x; rippleY = y;
  }
  function animateRipple(delta) {
    if (rippleT < 0) return;
    rippleT += delta;
    var pos = backNet.geometry.attributes.position, arr = pos.array, fade = Math.exp(-rippleT * 2.2);
    for (var i = 0; i < arr.length; i += 3) {
      var vx = netBase[i], vy = netBase[i + 1] + GOAL_HEIGHT / 2;       // this point of the net, in goal coordinates
      var d = Math.sqrt((vx - rippleX) * (vx - rippleX) + (vy - rippleY) * (vy - rippleY));
      arr[i + 2] = rippleT > 1.6 ? 0 : -0.6 * Math.exp(-d * 1.2) * Math.sin(rippleT * 16 - d * 5) * fade;   // bulges back and wobbles out
    }
    pos.needsUpdate = true;
    if (rippleT > 1.6) rippleT = -1;
  }

  var confetti = null, confettiVel = null, confettiT = -1, CONFETTI_N = 420;
  function celebrate() {
    if (!confetti) {
      var geo = new THREE.BufferGeometry(), cols = new Float32Array(CONFETTI_N * 3);
      var palette = [0xfacc15, 0x22c55e, 0x3b82f6, 0xef4444, 0xffffff, 0xa855f7].map(function (h) { return new THREE.Color(h); });
      for (var i = 0; i < CONFETTI_N; i++) { var c = palette[i % palette.length]; cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CONFETTI_N * 3), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      confetti = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.38, vertexColors: true, transparent: true }));
      confetti.frustumCulled = false;
      scene.add(confetti);
      confettiVel = new Float32Array(CONFETTI_N * 3);
    }
    var p = confetti.geometry.attributes.position.array;
    for (var j = 0; j < CONFETTI_N; j++) {   // bursts up from above the goal
      p[j * 3] = (Math.random() - 0.5) * 6; p[j * 3 + 1] = GOAL_HEIGHT + 0.3 + Math.random() * 0.5; p[j * 3 + 2] = -0.5 + Math.random();
      confettiVel[j * 3] = (Math.random() - 0.5) * 5; confettiVel[j * 3 + 1] = 3 + Math.random() * 5; confettiVel[j * 3 + 2] = (Math.random() - 0.2) * 4;
    }
    confetti.geometry.attributes.position.needsUpdate = true;
    confetti.material.opacity = 1; confetti.visible = true; confettiT = 0;
  }
  function animateConfetti(delta) {
    if (confettiT < 0) return;
    confettiT += delta;
    var p = confetti.geometry.attributes.position.array;
    for (var j = 0; j < CONFETTI_N; j++) {
      confettiVel[j * 3 + 1] -= 6 * delta;                                   // falls...
      confettiVel[j * 3] *= 0.99; confettiVel[j * 3 + 2] *= 0.99;           // ...and drifts
      p[j * 3] += (confettiVel[j * 3] + Math.sin(confettiT * 6 + j) * 0.6) * delta;
      p[j * 3 + 1] = Math.max(0.02, p[j * 3 + 1] + confettiVel[j * 3 + 1] * delta);
      p[j * 3 + 2] += confettiVel[j * 3 + 2] * delta;
    }
    confetti.geometry.attributes.position.needsUpdate = true;
    confetti.material.opacity = Math.max(0, Math.min(1, (3 - confettiT) / 0.8));
    if (confettiT > 3) { confetti.visible = false; confettiT = -1; }
  }

  // ---------- Announcer captions ----------
  // A short line under each result that says what happened and quietly teaches where to aim.
  var lastLandX = 0, lastLandY = 1, shotPower = 1;
  function announcerLine(kind) {
    var ax = Math.abs(lastLandX), corner = ax > 2.5, top = lastLandY > 1.5, middle = ax < 1.1;
    var say = function (list) { return pick(list); };
    if (isAutoMiss) return T('A wrong answer sends the shot wild.', 'Una respuesta incorrecta desvía el tiro.');
    if (kind === 'goal') {
      if (corner && top) return say([T('Top corner! The keeper had no chance!', '¡Por la escuadra! ¡El portero no tuvo opción!'), T('Right into the top corner!', '¡Justo en la escuadra!')]);
      if (corner) return say([T('Low and into the corner!', '¡Bajo y al rincón!'), T('Tucked in by the post!', '¡Pegado al palo!')]);
      if (middle) return T('Straight down the middle... and it\'s in!', 'Por el centro... ¡y entra!');
      return T('Placed past the keeper!', '¡Colocado lejos del portero!');
    }
    if (kind === 'saved' || kind === 'caught') {
      if (middle) return T('Straight at the keeper. Aim for the corners!', 'Directo al portero. ¡Apunta a las esquinas!');
      if (shotPower < 0.45) return T('A little soft. More power next time!', 'Un poco suave. ¡Más potencia la próxima vez!');
      return T('Great save! Try tighter to the post.', '¡Gran atajada! Prueba más pegado al palo.');
    }
    if (kind === 'post') return T('Off the post! So close.', '¡Al palo! Por muy poco.');
    if (kind === 'over') return T('Over the bar. Aim a little lower.', 'Por encima del larguero. Apunta un poco más abajo.');
    if (kind === 'wide') return T('Just wide! Aim a little inside the post.', '¡Desviado! Apunta un poco por dentro del palo.');
    return '';
  }

  var keeperStay = false;
  function keeperDecision(targetX, targetY, flight) {
    lastLandX = targetX; lastLandY = targetY;
    keeperStartX = keeperGroup.position.x;   // wherever his side-to-side lean left him
    keeperStartY = keeperBody.position.y;
    catching = standingCatch = caught = keeperStay = false;
    var inGoal = !isAutoMiss && onTarget(targetX, targetY);
    var goesIn = inGoal && Math.random() < beatChance(targetX, targetY, aimPower);
    hitPost = false;

    if (inGoal && !goesIn) {
      // a save: the keeper gets there just as the ball does. A shot right at the keeper, or a weak one, is caught.
      catching = Math.abs(targetX) < 1.1 || aimPower < 0.45;
      standingCatch = catching && Math.abs(targetX) < 1.1;
      if (catching) planCatch(targetX, targetY);
      else {
        keeperTarget = { x: targetX, y: Math.min(targetY, GOAL_HEIGHT) };
        var intercept = flight * ((PENALTY_DIST - 0.5) / PENALTY_DIST);
        keeperReactionDelay = intercept * 0.1;
        keeperDiveDuration = intercept * 0.9;
      }
      enforceSave = true;
      keeperBody.collisionResponse = !catching;
    } else {
      // a goal (or a miss): the keeper guesses wrong, dives too late, or now and then stays rooted to the spot.
      // (He only stays put when the ball isn't coming at him, so it never passes through him.)
      var r = Math.random();
      if (r < 0.2 && Math.abs(targetX - keeperStartX) > 1.0) {
        keeperStay = true;
      } else if (r < 0.6) {
        keeperTarget = { x: targetX > 0 ? -2 : 2, y: 0 };
        keeperReactionDelay = flight * 0.2; keeperDiveDuration = flight * 1.2;
      } else {
        keeperTarget = { x: targetX * 0.5, y: 0 };
        keeperReactionDelay = flight * 0.5; keeperDiveDuration = flight * 1.5;
      }
      enforceSave = false;
      keeperBody.collisionResponse = false;   // the roll said goal, so the keeper can't block it by accident
    }
    keeperDiving = true;
    keeperDiveTime = 0;
  }

  function updateKeeper(delta) {
    if (!keeperDiving) { keeperIdle(delta); return; }
    keeperDiveTime += delta;
    if (keeperStay || keeperDiveTime < keeperReactionDelay) { keeperIdle(delta); return; }   // rooted: watches it go by

    var diveT = (keeperDiveTime - keeperReactionDelay) / keeperDiveDuration, t = Math.min(1, diveT);
    var ease = 1 - Math.pow(1 - t, 3);
    var x = keeperStartX + (keeperTarget.x - keeperStartX) * ease;
    if (!catching) x = Math.max(-GOAL_WIDTH / 2 + 0.4, Math.min(GOAL_WIDTH / 2 - 0.4, x));   // a catch goes exactly where planned
    var y = keeperStartY + (keeperTarget.y - keeperStartY) * Math.sin(t * Math.PI / 2);
    if (diveT > 1) {
      var fall = keeperDiveTime - keeperReactionDelay - keeperDiveDuration;
      y = Math.max(0, y - 0.5 * 15 * fall * fall);
    }
    var tilt = catching ? (catchKind === 'dive' ? catchTilt * ease : 0)
      : Math.abs(keeperTarget.x) > 0.5 ? diveTilt(x) : 0;
    keeperBody.position.set(x, y, keeperBody.position.z);
    keeperBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), tilt);

    keeperGroup.position.copy(keeperBody.position);
    keeperGroup.quaternion.copy(keeperBody.quaternion);
    kTorso.position.y = 1.0; kTorso.rotation.set(0, 0, 0);
    kLLeg.userData.shin.rotation.x = kRLeg.userData.shin.rotation.x = 0;   // straight knees for dives and catches
    if (kHead) kHead.rotation.set(0, 0, 0);
    if (catching) {
      applyCatchPose(catchKind, catchDir);   // gloves where the ball is going
    } else if (keeperTarget.x < 0) {
      kLArm.userData.fore.rotation.x = kRArm.userData.fore.rotation.x = -0.25;
      kLArm.rotation.set(0, 0, -(Math.PI - 0.3)); kRArm.rotation.set(0, 0, -(Math.PI - 0.95));   // both arms reach to the left
      kLLeg.rotation.set(0, 0, -0.2); kRLeg.rotation.set(-0.3, 0, 0.3);
    } else {
      kLArm.userData.fore.rotation.x = kRArm.userData.fore.rotation.x = -0.25;
      kRArm.rotation.set(0, 0, Math.PI - 0.3); kLArm.rotation.set(0, 0, Math.PI - 0.95);   // both arms reach to the right
      kRLeg.rotation.set(0, 0, 0.2); kLLeg.rotation.set(-0.3, 0, -0.3);
    }
  }

  // While the student aims, the keeper does what real keepers do on the line, picking a move at random (never the same one
  // twice in a row) with a moment in his ready stance between moves:
  //   sway    - rocks gently left and right
  //   shuffle - two quick side-steps out to one side and two straight back (lead foot out, the other foot follows)
  //   hops    - two quick, small jumps bringing his knees up high
  //   clap    - claps his gloves together in front of him
  //   ready   - still, just breathing
  // Every move happens around the center of the goal line and ends back in the center.
  // It's only for show: it never changes the chance or whether a shot is saved. Once the shot is struck he holds still.
  var keeperSway = 0;                          // how far he has shuffled from the middle (visual only)
  var kAct = 'ready', kLastAct = 'ready', kActT = 0, kActDur = 1.5, kFrom = 0, kTo = 0;

  function pickKeeperAct() {
    var acts = ['sway', 'shuffle', 'hops', 'clap', 'shuffle', 'hops'];
    if (kLastAct !== 'ready') { kAct = 'ready'; kActDur = 2.5 + Math.random() * 2; }   // a pause between moves (2.5 to 4.5 s)
    else {
      do { kAct = acts[Math.floor(Math.random() * acts.length)]; } while (kAct === kLastMove);
      kLastMove = kAct;
      kActDur = { sway: 2.2, shuffle: 0.8, hops: 0.95, clap: 0.9 }[kAct];
      kFrom = 0;   // every move starts and ends in the center of the goal line
      kTo = kAct === 'shuffle' ? (Math.random() < 0.5 ? -1 : 1) * 0.45 : 0;   // how far out a shuffle goes
    }
    kLastAct = kAct; kActT = 0;
  }
  var kLastMove = '';

  function keeperIdle(delta) {
    var time = clock.elapsedTime, fl = kLArm.userData.fore, fr = kRArm.userData.fore;
    var shinL = kLLeg.userData.shin, shinR = kRLeg.userData.shin;
    // the ready stance: knees soft, arms out, gloves open
    var x = keeperSway, lift = 0, lean = 0, bodyY = 1.0 + Math.sin(time * 2.2) * 0.006;
    var lx = -0.12, lz = -0.1, rx = -0.12, rz = 0.1, lk = 0.18, rk = 0.18;       // legs: hip swing / splay, and knee bend
    var ax = 0.35, alz = -1.2, arz = 1.2, af = -0.25;                              // arms

    if (!keeperDiving) {
      kActT += (delta || 0);
      if (kActT >= kActDur) pickKeeperAct();
      var u = Math.min(1, kActT / kActDur), s, ph, k;
      if (kAct === 'sway') {
        s = Math.sin(u * Math.PI * 2);
        x = kFrom + s * 0.16; lean = -s * 0.07;
        lz -= s * 0.05; rz -= s * 0.05;
      } else if (kAct === 'shuffle') {
        // four quick steps: two out to the side, then two straight back to the center
        s = Math.min(3.999, u * 4); var step = Math.floor(s); ph = s - step;
        var e = ph * ph * (3 - 2 * ph);
        var stops = [0, 0.5, 1, 0.5, 0];                               // fraction of the way out after each step
        x = kTo * (stops[step] + (stops[step + 1] - stops[step]) * e);
        if (u >= 1) x = 0;
        lift = Math.sin(ph * Math.PI) * 0.03;
        var goingLeft = (step < 2) === (kTo < 0);                      // which way this step moves
        var leadOut = ph < 0.5 ? Math.sin(ph * 2 * Math.PI) : 0;       // lead foot steps out...
        var trailIn = ph >= 0.5 ? Math.sin((ph - 0.5) * 2 * Math.PI) : 0;   // ...then the other foot follows
        if (goingLeft) { lz -= leadOut * 0.35; lk += leadOut * 0.3; rz -= trailIn * 0.2; rk += trailIn * 0.3; }
        else { rz += leadOut * 0.35; rk += leadOut * 0.3; lz += trailIn * 0.2; lk += trailIn * 0.3; }
      } else if (kAct === 'hops') {
        s = u * 2; ph = s - Math.floor(s); if (u >= 1) ph = 0;
        k = Math.sin(ph * Math.PI);
        lift = k * 0.3;                                   // up off the grass...
        lx = rx = -0.12 - k * 1.25;                       // ...knees driving up high
        lk = rk = 0.18 + k * 1.7;
        ax = 0.35 - k * 0.5;                              // arms pump up
      } else if (kAct === 'clap') {
        k = Math.sin(u * Math.PI);                        // arms come in, two claps, back out
        var clap = Math.abs(Math.sin(u * Math.PI * 2));
        ax = 0.35 - k * 1.25; alz = -1.2 + k * (0.95 + clap * 0.15); arz = -alz; af = -0.25 - k * 0.35;
      }
      keeperSway = x;
    }

    // Loose, natural small movements on top of whatever he's doing (like the referee): breathing, shifting his weight,
    // a slight body sway, looking around, and loose arms with the gloves flexing. Small, and only for show.
    var w = Math.sin(time * 0.6), w2 = Math.sin(time * 1.3 + 0.7);
    bodyY += Math.sin(time * 1.9) * 0.008;                         // breathing
    lean += w * 0.03;                                              // weight moves from foot to foot...
    lz += w * 0.025; rz += w * 0.025; lk += Math.max(0, w) * 0.08; rk += Math.max(0, -w) * 0.08;   // ...one knee softens
    ax += w2 * 0.06;                                               // loose arms
    alz += Math.sin(time * 0.9) * 0.07; arz -= Math.sin(time * 0.9 + 1.4) * 0.07;
    var flex = Math.sin(time * 1.7) * 0.1;                         // gloves flexing
    kHead.rotation.set(0.04 + Math.sin(time * 0.8) * 0.03, Math.sin(time * 0.45 + 1) * 0.3, 0);   // looking around

    kTorso.position.y = bodyY;
    kTorso.rotation.set(0, 0, lean);
    kLLeg.rotation.set(lx, 0, lz); kRLeg.rotation.set(rx, 0, rz);
    shinL.rotation.x = lk; shinR.rotation.x = rk;
    kLArm.rotation.set(ax, 0, alz); kRArm.rotation.set(ax, 0, arz);
    fl.rotation.x = af + flex; fr.rotation.x = af - flex;
    keeperGroup.position.copy(keeperBody.position);
    keeperGroup.position.x += x;
    keeperGroup.position.y += lift;
    keeperGroup.quaternion.copy(keeperBody.quaternion);
  }

  // A caught ball stays between the keeper's gloves; after a moment the kick is marked CAUGHT
  var handL = new THREE.Vector3(), handR = new THREE.Vector3();
  function holdCaughtBall(delta) {
    keeperGroup.updateMatrixWorld(true);
    kLArm.userData.fore.localToWorld(handL.set(0, -0.36, 0.05));   // the middle of each glove
    kRArm.userData.fore.localToWorld(handR.set(0, -0.36, 0.05));
    // settle into the gloves over a split second rather than jumping there
    var k = Math.min(1, caughtTime / 0.12 + 0.35);
    var gx = (handL.x + handR.x) / 2, gy = Math.max(BALL_RADIUS, (handL.y + handR.y) / 2), gz = (handL.z + handR.z) / 2 + 0.06;
    var b = ballBody.position;
    ballBody.position.set(b.x + (gx - b.x) * k, b.y + (gy - b.y) * k, b.z + (gz - b.z) * k);
    ballBody.velocity.set(0, 0, 0);
    ballBody.angularVelocity.set(0, 0, 0);
    ballMesh.position.copy(ballBody.position);
    caughtTime += delta;
    if (caughtTime > 0.6 && !resultDecided) kickResult('caught');
  }

  var lastHitTime = 0;
  function onContact(e) {
    var other = e.bodyA === ballBody ? e.bodyB : (e.bodyB === ballBody ? e.bodyA : null);
    if (!other) return;
    if (other === keeperBody && keeperBody.collisionResponse) {
      hitKeeper = true;
      if (ballBody.velocity.z < 0) ballBody.velocity.set(ballBody.velocity.x * 0.2, -1, 2);   // a save can't deflect into the net
    }
    if (state !== STATE.RESULT) return;
    if (other.shapes[0] instanceof CANNON.Cylinder) hitPost = true;
    var now = performance.now();
    if (now - lastHitTime > 500 && other.shapes[0] instanceof CANNON.Cylinder) { playSound('woodwork'); lastHitTime = now; }
  }

  // ---------- The net holds the ball ----------
  // Once the ball has gone into the goal it stays inside the netting (back, sides and roof), however fast it was.
  var ballInNet = false;
  function keepInNet() {
    var p = ballBody.position, v = ballBody.velocity, r = BALL_RADIUS;
    var side = GOAL_WIDTH / 2 - r, back = -2.4 + r, roof = GOAL_HEIGHT - r;
    if (!ballInNet) {
      if (p.z < -r && p.z > -2.6 - r && Math.abs(p.x) < GOAL_WIDTH / 2 && p.y < GOAL_HEIGHT) ballInNet = true;
      else return;
    }
    if (p.z < back) { if (!rippleDone) startRipple(p.x, p.y); p.z = back; if (v.z < 0) v.z = -v.z * 0.08; v.x *= 0.5; }   // the back of the net takes the pace off
    if (p.x > side) { p.x = side; if (v.x > 0) v.x = -v.x * 0.08; }
    if (p.x < -side) { p.x = -side; if (v.x < 0) v.x = -v.x * 0.08; }
    if (p.y > roof) { p.y = roof; if (v.y > 0) v.y = -v.y * 0.08; }
    if (p.z > -r) { p.z = -r; if (v.z > 0) v.z = 0; }   // and it doesn't roll back out
  }

  // ---------- Result of each kick ----------
  function checkResult() {
    if (resultDecided || caught) return;   // a caught ball is decided once the keeper has hold of it
    var p = ballBody.position, v = ballBody.velocity;
    var crossed = p.z + BALL_RADIUS < -0.05;   // the whole ball over the line
    var inPosts = p.x > -GOAL_WIDTH / 2 && p.x < GOAL_WIDTH / 2, underBar = p.y < GOAL_HEIGHT;
    if (crossed && p.z > -3 && inPosts && underBar && !hitKeeper) { kickResult('goal'); return; }   // never a goal after a save

    var wide = p.z < -BALL_RADIUS && (!inPosts || !underBar);
    var stopped = v.lengthSquared() < 2 && Math.abs(v.z) < 1;
    var away = v.z > 0.5 && p.z > -0.5 && p.z < 8;
    var gone = Math.abs(p.x) > 30 || p.z < -15 || p.y < -1;
    if (!(wide || stopped || away || gone)) return;
    // say exactly what happened, so a ball that hits the outside of the side netting isn't mistaken for a goal
    if (hitKeeper) kickResult('saved');
    else if (hitPost) kickResult('post');
    else if (wide && !underBar && inPosts) kickResult('over');
    else if (wide) kickResult(p.y > GOAL_HEIGHT && Math.abs(p.x) < GOAL_WIDTH / 2 + 0.5 ? 'over' : 'wide');
    else kickResult(Math.abs(p.x) > GOAL_WIDTH / 2 ? 'wide' : 'miss');   // e.g. stopped against the outside of the netting
  }
  var hitPost = false;

  function kickResult(kind) {
    resultDecided = true;
    state = STATE.RESULT;
    results[kickNum] = kind;
    if (kind === 'goal') { goals++; playSound('cheer'); crowdCheer = 3; crowdWave = null; } else playSound('groan');
    if (!isAutoMiss) adaptKeeper(kind);   // wild shots after a wrong answer don't count
    msg.textContent = {
      goal: T('GOAL!', '¡GOL!'), saved: T('SAVED', '¡ATAJADA!'), caught: T('CAUGHT!', '¡ATRAPADA!'),
      post: T('OFF THE POST', '¡AL PALO!'), wide: T('WIDE', 'DESVIADO'), over: T('OVER THE BAR', 'POR ENCIMA')
    }[kind] || T('MISS', 'FUERA');
    msg.className = kind === 'goal' ? 'goal' : kind === 'saved' || kind === 'caught' ? 'saved' : 'miss';
    msg.hidden = false;
    var line = announcerLine(kind);
    $('caption').textContent = line; $('caption').hidden = !line;
    if (kind === 'goal') { celebrate(); if (!rippleDone) startRipple(lastLandX, lastLandY); }
    kickNum++;
    drawHud();
    var next = function () {
      if (paused) { resultTimeout = setTimeout(next, 300); return; }   // wait until the menu is closed
      if (state === STATE.RESULT) skipResult();
    };
    resultTimeout = setTimeout(next, 2200);
  }

  function skipResult() {
    clearTimeout(resultTimeout);
    msg.hidden = true;
    $('caption').hidden = true;
    chance.hidden = true;
    nextKick();
  }

  var boardCanvas = null, boardTex = null;
  function updateBoard() {
    if (!boardCanvas) return;
    var c = boardCanvas.getContext('2d'), inGame = !hud.hidden;
    c.fillStyle = '#05070d'; c.fillRect(0, 0, 512, 256);
    c.strokeStyle = '#3b82f6'; c.lineWidth = 8; c.strokeRect(8, 8, 496, 240);
    c.textAlign = 'center';
    c.fillStyle = '#60a5fa'; c.font = 'bold 34px Arial';
    c.fillText('ROOTED TO THE SPOT', 256, 58);
    c.fillStyle = '#facc15'; c.font = 'bold 96px Arial';
    c.fillText(inGame ? goals + ' / ' + KICKS : '⚽', 256, 165);
    c.fillStyle = '#e2e8f0'; c.font = 'bold 30px Arial';
    c.fillText(inGame ? T('GOALS', 'GOLES') + ' · ' + T('KICK ', 'TIRO ') + Math.min(kickNum + 1, KICKS) + '/' + KICKS : T('A PENALTY SHOOTOUT', 'UNA TANDA DE PENALES'), 256, 222);
    boardTex.needsUpdate = true;
  }

  function drawHud() {
    updateBoard();
    $('hud-goals').textContent = goals;
    var dots = '';
    for (var i = 0; i < KICKS; i++) {
      var r = results[i];
      dots += '<span class="dot ' + (r === 'goal' ? 'g' : r ? 'x' : '') + (i === kickNum && state !== STATE.OVER ? ' now' : '') + '">' +
        (r === 'goal' ? '✓' : r ? '✗' : '') + '</span>';
    }
    $('hud-dots').innerHTML = dots;
    $('hud-dots').setAttribute('aria-label', T('Kicks: ', 'Tiros: ') + results.map(function (r) {
      return r === 'goal' ? T('goal', 'gol') : T('no goal', 'sin gol');
    }).join(', '));
  }

  // ---------- Shootout flow ----------
  function startShootout() {
    kickNum = 0; goals = 0; rightCount = 0; results = []; missed = []; usedQ = {};
    hide(scrMenu); hide(scrOver);
    hud.hidden = false;
    drawHud();
    nextKick();
  }

  function nextKick() {
    enforceSave = false;
    powerShot = false;
    $('caption').hidden = true;
    catching = standingCatch = caught = false;
    resultDecided = false;
    legGroup.visible = false;
    resetBall();
    resetKeeper();
    drawHud();
    if (kickNum >= KICKS) showOver(); else askQuestion();
  }

  function showOver() {
    state = STATE.OVER;
    hideAimHud();
    drawHud();
    var best = load('best', 0), newBest = goals > best;
    save('games', load('games', 0) + 1);
    save('goals_total', load('goals_total', 0) + goals);
    if (newBest) save('best', goals);
    if (goals === KICKS) save('perfect', load('perfect', 0) + 1);
    if (rightCount === KICKS) save('allright', load('allright', 0) + 1);

    $('over-title').textContent = goals >= 4 ? T('CHAMPION!', '¡CAMPEÓN!') : goals >= 2 ? T('FULL TIME', 'FINAL DEL PARTIDO') : T('KEEP PRACTICING', 'SIGUE PRACTICANDO');
    $('over-goals').textContent = goals + ' / ' + KICKS;
    $('over-right').textContent = rightCount + ' / ' + KICKS;
    $('over-best').textContent = newBest ? T('New best!', '¡Nuevo récord!') : T('Best: ', 'Récord: ') + Math.max(best, goals) + ' / ' + KICKS;
    $('over-best').className = newBest ? 'best new' : 'best';
    var list = $('over-missed');
    if (missed.length) {
      list.innerHTML = '<h3>' + T('Questions to review', 'Preguntas para repasar') + '</h3>' + missed.map(function (m) {
        var line = m.q;
        [].concat(m.ans).forEach(function (x) { line = line.replace('?', '<b class="ok">' + fmt(x) + '</b>'); });   // fill in each blank
        return '<li><span class="mq">' + roots(line) + '</span><span class="you">' + T('you said ', 'dijiste ') + m.you + '</span></li>';
      }).join('');
      list.hidden = false;
    } else {
      list.innerHTML = '<p class="allok">' + T('Every question right. Great work!', '¡Todas las preguntas bien. Excelente trabajo!') + '</p>';
      list.hidden = false;
    }
    show(scrOver);
    $('over-again').focus({ preventScroll: true });
  }

  // ---------- Title screen ----------
  // The camera sweeps slowly around the stadium while the crowd does the wave. Any key or click blows the whistle and
  // flies the camera down to the penalty spot as the skills menu appears.
  var titleT = 0, titleLeave = -1;
  var camHome = new THREE.Vector3(0, 1.8, PENALTY_DIST + 2.5), lookHome = new THREE.Vector3(0, GOAL_HEIGHT / 2, 0);
  var camTmp = new THREE.Vector3(), lookTmp = new THREE.Vector3();
  function titleOrbit(t, pos, look) {
    var a = Math.sin(t * 0.16) * 0.95;
    pos.set(Math.sin(a) * 17, 6 + Math.sin(t * 0.37) * 1.4, 7 + Math.cos(a) * 12);
    look.set(Math.sin(a) * 3, 2.2, -6);
  }
  function updateTitleCamera(delta) {
    if (state === STATE.TITLE) {
      titleT += delta;
      titleOrbit(titleT, camTmp, lookTmp);
      camera.position.copy(camTmp); camera.lookAt(lookTmp);
    } else if (titleLeave >= 0 && titleLeave < 1) {   // fly down to the spot
      titleLeave = Math.min(1, titleLeave + delta / 1.4);
      var k = titleLeave * titleLeave * (3 - 2 * titleLeave);
      titleOrbit(titleT, camTmp, lookTmp);
      camera.position.lerpVectors(camTmp, camHome, k);
      lookTmp.lerp(lookHome, k);
      camera.lookAt(lookTmp);
    }
  }
  function leaveTitle() {
    if (state !== STATE.TITLE) return;
    unlockAudio();
    playSound('whistle');
    titleLeave = 0;
    hide(scrTitle);
    showMenu();
  }
  if (isTouch) $('btn-title').innerHTML = T('&#9654; TAP TO PLAY', '&#9654; TOCA PARA JUGAR');
  scrTitle.addEventListener('click', leaveTitle);

  // ---------- Pause menu (the MENU button, or Esc) ----------
  var paused = false, scrPause = $('scr-pause');
  function openPause() {
    if (paused || hud.hidden) return;   // only while a shootout is being played
    paused = true;
    show(scrPause);
    $('pause-resume').focus({ preventScroll: true });
  }
  function closePause() {
    if (!paused) return;
    paused = false;
    hide(scrPause);
    clock.getDelta();   // don't count the paused time
    if (state === STATE.MATH && !isTouch) activeIn.focus({ preventScroll: true });
  }
  // stop whatever is happening mid-kick, so the shootout can restart or go back to the skills
  function stopPlay() {
    paused = false; hide(scrPause);
    clearTimeout(resultTimeout);
    refWhistleT = -1; refWhistleThen = null;
    msg.hidden = true;
    hide(scrQ); hide(scrExp);
    hideAimHud();
    targetCrosshair.visible = errorCircle.visible = false;
    legGroup.visible = false;
    clock.getDelta();
  }

  function showMenu() {
    state = STATE.MENU;
    hide(scrOver); hide(scrQ); hide(scrExp);
    hud.hidden = true;
    updateBoard();
    hideAimHud();
    show(scrMenu);
  }

  // ---------- Menu ----------
  function buildMenu() {
    var list = $('skill-list');
    list.innerHTML = '';
    SKILLS.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'skill';
      b.setAttribute('aria-pressed', String(!!skillOn[i]));
      b.innerHTML = '<span class="chk" aria-hidden="true"></span><span class="nm">' + s.name + '</span><span class="ex">' + roots(s.ex) + '</span>';
      b.addEventListener('click', function () {
        skillOn[i] = !skillOn[i];
        b.setAttribute('aria-pressed', String(skillOn[i]));
        $('skill-err').hidden = true;
        save('skillset', skillOn);
        playSound('blip');
      });
      list.appendChild(b);
    });
  }

  function tryStart() {
    if (skillOn.indexOf(true) < 0) { $('skill-err').hidden = false; return; }
    startShootout();
  }

  // A save is a save: once the keeper has touched the ball it can never cross the goal line (a rebound off the post or a
  // bounce back toward the net is turned away), so "SAVED" can never become a goal.
  function keepSavedBallOut() {
    if (!hitKeeper || caught) return;
    var p = ballBody.position, v = ballBody.velocity, line = BALL_RADIUS + 0.25;
    if (p.z < line) {
      p.z = line;
      if (v.z < 1.5) v.z = 1.5 + Math.random();   // rolls back out toward the pitch
    }
  }

  // ---------- Physics reset ----------
  function resetBall() {
    ballInNet = false; rippleDone = false;
    ballBody.position.set(0, BALL_RADIUS, PENALTY_DIST);
    ballBody.velocity.set(0, 0, 0);
    ballBody.angularVelocity.set(0, 0, 0);
    ballBody.quaternion.set(0, 0, 0, 1);
    ballMesh.position.copy(ballBody.position);
    ballMesh.quaternion.set(0, 0, 0, 1);
  }

  function resetKeeper() {
    keeperStay = false;
    keeperBody.position.set(0, 0, 0.5);
    keeperBody.quaternion.set(0, 0, 0, 1);
    keeperBody.collisionResponse = true;
    keeperDiving = false;
    keeperGroup.position.copy(keeperBody.position);
    keeperGroup.quaternion.set(0, 0, 0, 1);
  }

  // ---------- Main loop ----------
  function animate() {
    requestAnimationFrame(animate);
    if (paused) { clock.getDelta(); renderer.render(scene, camera); return; }   // frozen while the menu is open
    var delta = Math.min(clock.getDelta(), 0.05);   // no huge jump after switching tabs

    if (state === STATE.AIMING) {   // keyboard aiming (locked once the power starts)
      var dx = (keysDown.ArrowRight || keysDown.KeyD ? 1 : 0) - (keysDown.ArrowLeft || keysDown.KeyA ? 1 : 0);
      var dy = (keysDown.ArrowUp || keysDown.KeyW ? 1 : 0) - (keysDown.ArrowDown || keysDown.KeyS ? 1 : 0);
      if (dx || dy) setAim(targetCrosshair.position.x + dx * 4 * delta, targetCrosshair.position.y + dy * 2.5 * delta);
    }

    if (state === STATE.CHARGING) {
      aimPower += (1.5 + 1.3 * skillRating) * delta;   // better players get a faster power circle to time
      if (aimPower > 1) aimPower = 0;   // big → tiny, then starts over
      var er = errorRadiusFor(aimPower);
      // the ball's center lands within er, so the ball itself can reach a ball's width further: show all of that
      var shown = (er + BALL_RADIUS) / 0.1;
      errorCircle.scale.set(shown, shown, 1);
    }
    // the scoring chance, live: the best it could be while aiming, the real one while powering up
    if (state === STATE.AIMING) showOdds(shotOdds(targetCrosshair.position.x, targetCrosshair.position.y, 1), true);
    else if (state === STATE.CHARGING) showOdds(shotOdds(targetCrosshair.position.x, targetCrosshair.position.y, aimPower), false);

    if (state === STATE.KICKING) {
      kickPhase += delta * 12;
      legGroup.rotation.x = -Math.PI / 3 + Math.sin(kickPhase) * (Math.PI / 1.5);
      if (kickPhase > Math.PI / 2.5) launchBall();
    }

    if (state === STATE.RESULT) {
      world.step(1 / 120, delta, 8);   // small steps, so a fast ball doesn't skip through the net
      keepInNet();
      // a save is a save, however fast the shot: stop the ball in front of the line
      if (enforceSave && ballBody.position.z < (catching ? catchZ + BALL_RADIUS : 1.2) && ballBody.velocity.z < 0) {
        hitKeeper = true;
        enforceSave = false;
        if (catching) { caught = true; caughtTime = 0; playSound('catch'); }   // into the gloves (see holdCaughtBall)
        else {
          // pushed away: back out toward the pitch with a bounce, and off to the side away from the middle of the goal
          var awayX = ballBody.position.x >= 0 ? 1 : -1;
          ballBody.position.z = 0.9;
          ballBody.velocity.set(awayX * (1 + Math.random() * 2.5), 1.5 + Math.random() * 2, 4.5 + Math.random() * 3);
          keeperBody.collisionResponse = false;   // the ball can't bump off him again and back toward the goal
        }
      }
      keepSavedBallOut();
      ballMesh.position.copy(ballBody.position);
      ballMesh.quaternion.copy(ballBody.quaternion);
      checkResult();
    }

    updateKeeper(delta);
    if (caught && state === STATE.RESULT) holdCaughtBall(delta);

    if (rainParticles) {
      var rp = rainParticles.geometry.attributes.position.array;
      for (var i = 1; i < rp.length; i += 3) { rp[i] -= 25 * delta; if (rp[i] < 0) rp[i] = 40; }
      rainParticles.geometry.attributes.position.needsUpdate = true;
    }
    flashParticles.material.uniforms.time.value = clock.elapsedTime;
    animateCrowd(delta);
    animateReferee(delta);
    animateCity();
    animateRipple(delta);
    animateConfetti(delta);
    updateTitleCamera(delta);
    renderer.render(scene, camera);
  }

  // ---------- Input ----------
  // Click (or tap) once to start the power, and again to shoot, the same as the space bar
  function clickShot(x, y) {
    unlockAudio();
    if (state === STATE.CHARGING) { endCharge(); return; }
    aimAt(x, y);
    startCharge();
  }
  canvas.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    clickShot(e.clientX, e.clientY);
  });
  canvas.addEventListener('mousemove', function (e) { aimAt(e.clientX, e.clientY); });

  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();   // no pretend mouse clicks afterwards
    var t = e.touches[0];
    clickShot(t.clientX, t.clientY);
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) { e.preventDefault(); var t = e.touches[0]; aimAt(t.clientX, t.clientY); }, { passive: false });
  canvas.addEventListener('touchend', function (e) { e.preventDefault(); }, { passive: false });

  // On every screen (menu, question, explanation, final whistle, pause), the arrow keys move between its buttons and
  // answer boxes; Enter or Space presses the one that's highlighted. While aiming, the arrows move the aim instead.
  function moveFocus(dir) {
    var screen = paused ? scrPause : [scrTitle, scrMenu, scrQ, scrExp, scrOver].filter(function (s) { return !s.hidden; })[0];
    if (!screen) return false;
    var items = Array.prototype.filter.call(screen.querySelectorAll('button, input'), function (el) {
      return !el.hidden && !el.disabled && el.offsetParent !== null;
    });
    if (!items.length) return false;
    var i = items.indexOf(document.activeElement);
    i = i < 0 ? (dir > 0 ? 0 : items.length - 1) : (i + dir + items.length) % items.length;
    items[i].focus({ preventScroll: true });
    if (items[i].tagName === 'INPUT') setActiveBox(items[i]);
    return true;
  }

  var AIM_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, KeyA: 1, KeyD: 1, KeyW: 1, KeyS: 1 };
  window.addEventListener('keydown', function (e) {
    if (window.isPageControlKey && isPageControlKey(e)) return;
    if (state === STATE.TITLE) {   // title screen: any key plays (Tab and modifier keys excepted)
      if (/^(Tab|Shift|Control|Alt|Meta|CapsLock)$/.test(e.key)) return;
      e.preventDefault(); leaveTitle(); return;
    }
    if (e.key === 'Escape') {   // Esc does what the MENU button does
      if (paused) closePause(); else openPause();
      e.preventDefault();
      return;
    }
    if (/^Arrow/.test(e.key) && moveFocus(e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1)) { e.preventDefault(); return; }
    if (paused) return;   // the menu's own buttons take Tab, Enter and Space
    unlockAudio();
    var tag = e.target && e.target.tagName, go = e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter';
    if (state === STATE.MATH) {
      if (go && tag !== 'BUTTON') { e.preventDefault(); submitAnswer(); return; }
      if (tag !== 'INPUT') {   // typing works even when the answer box isn't focused
        if (/^[0-9]$/.test(e.key) && activeIn.value.length < MAX_DIGITS) { activeIn.value += e.key; e.preventDefault(); }
        else if (e.key === 'Backspace') { activeIn.value = activeIn.value.slice(0, -1); e.preventDefault(); }
      }
      return;
    }
    if (tag === 'BUTTON' && go) return;   // a focused button presses itself
    if (AIM_KEYS[e.code] && (state === STATE.AIMING || state === STATE.CHARGING)) { if (state === STATE.AIMING) keysDown[e.code] = true; e.preventDefault(); return; }
    if (!go) return;
    e.preventDefault();
    if (e.repeat) return;
    if (state === STATE.MENU) tryStart();
    else if (state === STATE.EXPLANATION) closeExplanation();
    else if (state === STATE.OVER) startShootout();
    else if (state === STATE.CHARGING) endCharge();   // keyboard: one press starts the power, the next press shoots
    else startCharge();
  });
  window.addEventListener('keyup', function (e) { keysDown[e.code] = false; });
  window.addEventListener('blur', function () { keysDown = {}; });

  [qIn, qIn2].forEach(function (el) {
    el.addEventListener('input', function () { el.value = el.value.replace(/[^0-9]/g, '').slice(0, MAX_DIGITS); });
    el.addEventListener('focus', function () { setActiveBox(el); });
    el.addEventListener('click', function () { setActiveBox(el); });   // on a phone, tap a box to fill it with the pad
  });
  $('q-go').addEventListener('click', submitAnswer);
  $('q-skip').addEventListener('click', skipBonus);
  Array.prototype.forEach.call(document.querySelectorAll('#q-pad button'), function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-k');
      if (k === 'back') activeIn.value = activeIn.value.slice(0, -1);
      else if (k === 'go') submitAnswer();
      else if (activeIn.value.length < MAX_DIGITS) activeIn.value += k;
    });
  });
  $('exp-go').addEventListener('click', closeExplanation);
  $('btn-start').addEventListener('click', function () { unlockAudio(); tryStart(); });
  $('over-again').addEventListener('click', startShootout);
  $('over-menu').addEventListener('click', showMenu);
  $('btn-menu').addEventListener('click', function () { if (paused) closePause(); else openPause(); });
  $('pause-resume').addEventListener('click', closePause);
  $('pause-restart').addEventListener('click', function () { stopPlay(); startShootout(); });
  $('pause-skills').addEventListener('click', function () { stopPlay(); showMenu(); });
  // In fullscreen, Esc opens this menu instead of leaving fullscreen (students leave with the Exit Fullscreen button)
  document.addEventListener('fullscreenchange', function () {
    try {
      if (!navigator.keyboard) return;
      if (document.fullscreenElement) navigator.keyboard.lock(['Escape']).catch(function () {});
      else navigator.keyboard.unlock();
    } catch (e) {}
  });

  // ---------- Sound (made on the fly, no files) ----------
  var audioCtx = null, master = null;
  function unlockAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = new AC();
      master = audioCtx.createGain();
      master.gain.value = 0.4;
      master.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }
  function noiseBuffer(secs) {
    var n = Math.floor(audioCtx.sampleRate * secs), buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var src = audioCtx.createBufferSource(); src.buffer = buf;
    return src;
  }
  function playSound(type) {
    if (!audioCtx) return;
    var now = audioCtx.currentTime, osc, gain;
    if (type === 'whistle') {
      osc = audioCtx.createOscillator(); gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2000, now);
      osc.frequency.exponentialRampToValueAtTime(2200, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(2000, now + 0.4);
      var lfo = audioCtx.createOscillator(), lfoGain = audioCtx.createGain();   // the trill of the pea in the whistle
      lfo.frequency.value = 45; lfoGain.gain.value = 100;
      lfo.connect(lfoGain).connect(osc.frequency);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.3);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.connect(gain).connect(master);
      lfo.start(now); lfo.stop(now + 0.4); osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'blip') {
      osc = audioCtx.createOscillator(); gain = audioCtx.createGain();
      osc.type = 'square'; osc.frequency.setValueAtTime(400, now);
      gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain).connect(master);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'kick') {
      osc = audioCtx.createOscillator(); gain = audioCtx.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(120, now); osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
      var thud = noiseBuffer(0.15), filt = audioCtx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 800;
      gain.gain.setValueAtTime(1.0, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain); thud.connect(filt).connect(gain); gain.connect(master);
      osc.start(now); thud.start(now); osc.stop(now + 0.15);
    } else if (type === 'catch') {   // a soft thud into the gloves
      var slap = noiseBuffer(0.12), lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 500;
      gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.9, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      slap.connect(lp).connect(gain).connect(master);
      slap.start(now);
    } else if (type === 'woodwork') {
      osc = audioCtx.createOscillator(); gain = audioCtx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(1000, now); osc.frequency.exponentialRampToValueAtTime(400, now + 0.4);
      gain.gain.setValueAtTime(0.8, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain).connect(master);
      osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'cheer' || type === 'groan') {
      var crowd = noiseBuffer(2.5), bp = audioCtx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = type === 'cheer' ? 600 : 250; bp.Q.value = 0.4;
      gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(type === 'cheer' ? 0.8 : 0.6, now + 0.3);
      gain.gain.linearRampToValueAtTime(0, now + 2.5);
      crowd.connect(bp).connect(gain).connect(master);
      crowd.start(now);
    }
  }

  // ---------- Start ----------
  buildMenu();
  try {
    initEngine();
  } catch (err) {
    $('webgl-err').hidden = false;   // no 3D graphics on this device
  }
})();
