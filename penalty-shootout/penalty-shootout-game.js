// Pro Penalty Shootout: answer a square-root question to earn each penalty kick, then aim and time the shot.
// A shootout is 5 kicks. The 3D stadium uses three.js (drawing) and cannon.js (ball physics).
(function () {
  'use strict';
  var T = window.tl || function (en) { return en; };

  // ---------- Settings and saved stats (localStorage, keys start with penaltyshootout_) ----------
  var KICKS = 5, MAX_DIGITS = 5;   // answers go up to 10,000 (100²)
  var SKILLS = [
    { id: 'sqrt', name: T('Square Roots', 'Raíces cuadradas'), ex: '√81 = ?' },
    { id: 'square', name: T('Squaring Numbers', 'Elevar al cuadrado'), ex: '9² = ?' },
    { id: 'area', name: T('Side of a Square', 'Lado de un cuadrado'), ex: T('Area 81 → side?', 'Área 81 → ¿lado?') },
    { id: 'estimate', name: T('Estimating Roots', 'Estimar raíces'), ex: T('√50 is between ? and ?', '√50 está entre ? y ?') },
    { id: 'cube', name: T('Cube Roots', 'Raíces cúbicas'), ex: '∛64 = ?' }
  ];
  function load(key, fallback) {
    try { var v = localStorage.getItem('penaltyshootout_' + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function save(key, val) { try { localStorage.setItem('penaltyshootout_' + key, JSON.stringify(val)); } catch (e) {} }

  var skillOn = load('skills', [true, false, false, false, false]);
  if (!Array.isArray(skillOn) || skillOn.length !== SKILLS.length) skillOn = [true, false, false, false, false];

  // ---------- DOM ----------
  var $ = function (id) { return document.getElementById(id); };
  var app = $('ps'), canvas = $('ps-canvas');
  var scrMenu = $('scr-menu'), scrQ = $('scr-q'), scrExp = $('scr-exp'), scrOver = $('scr-over');
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
  var STATE = { MENU: 0, MATH: 1, EXPLANATION: 2, AIMING: 3, CHARGING: 4, KICKING: 5, RESULT: 6, OVER: 7, WHISTLE: 8 };
  var ENV = { DAY: 0, NIGHT: 1, RAIN: 2 };
  var state = STATE.MENU, env = ENV.DAY;

  var kickNum = 0, goals = 0, rightCount = 0, results = [], missed = [], usedQ = {}, question = null, lastKey = '';
  var aimPower = 0, hitKeeper = false, kickPhase = 0, isAutoMiss = false, resultDecided = false, enforceSave = false;
  var resultTimeout = null, keysDown = {};

  // ---------- Engine ----------
  var scene, camera, renderer, world, clock;
  var ballMesh, ballBody, keeperGroup, keeperBody, legGroup, rainParticles, flashParticles, targetCrosshair, errorCircle;
  var kTorso, kLArm, kRArm, kLLeg, kRLeg, keeperStartX = 0, keeperStartY = 0;

  var GOAL_WIDTH = 7.32, GOAL_HEIGHT = 2.44, POST_RADIUS = 0.06, PENALTY_DIST = 11, BALL_RADIUS = 0.11, BALL_MASS = 0.43;
  var raycaster = new THREE.Raycaster(), mouseVector = new THREE.Vector2();
  var goalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);   // invisible wall on the goal line (z = 0)

  function errorRadiusFor(p) { return 1.9 - p * 1.55; }   // big circle at 0 power, tiny at full

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

    errorCircle = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.12, 64),   // radius 0.1, scaled while charging
      new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthTest: false }));
    errorCircle.renderOrder = 998; errorCircle.visible = false;
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
      scene.fog = new THREE.Fog(0x5ca8df, 60, 250);
      var sun = new THREE.DirectionalLight(0xffffff, 1.2);
      sun.position.set(100, 150, 50);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 1024; sun.shadow.mapSize.height = 1024;
      sun.shadow.camera.near = 10; sun.shadow.camera.far = 300;
      sun.shadow.camera.left = -30; sun.shadow.camera.right = 30; sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
      scene.add(sun);
    } else {
      scene.background = new THREE.Color(0x050510);
      scene.fog = new THREE.Fog(0x050510, 40, 200);
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
    actx.fillStyle = '#3b82f6'; actx.font = 'bold 40px Arial';
    var adText = T('PRO PENALTY MATH', 'PENALES MATEMÁTICOS');
    for (i = 0; i < 2; i++) actx.fillText(adText, 40 + i * 512, 45);
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
    if (crowdWave === null && crowdCheer <= 0 && Math.random() < delta / 25) crowdWave = -55;   // about every 25 seconds
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
    var back = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_WIDTH, GOAL_HEIGHT), netMat(10, 5));
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
    addNet(GOAL_WIDTH / 2, GOAL_HEIGHT / 2, t, 0, GOAL_HEIGHT / 2, -2.4 - t);
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
    kTorso = k.hips; kLArm = k.lArm; kRArm = k.rArm; kLLeg = k.lLeg; kRLeg = k.rLeg;
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

  function makeQuestion() {
    var active = [];
    for (var i = 0; i < SKILLS.length; i++) if (skillOn[i]) active.push(SKILLS[i].id);
    var MAX_SQ = 13, MAX_CUBE = 6;   // one level for everyone: squares and square roots to 13, cube roots to 6
    // now and then, a simple power of ten: √100, √10,000, 10², 100², ∛1,000 (no giant numbers)
    var bigSq = function () { return pick([10, 100]); };
    var bigCube = function () { return 10; };
    var big = function () { return Math.random() < 0.25; };
    for (var tries = 0; tries < 40; tries++) {
      var skill = active[Math.floor(Math.random() * active.length)], q = { skill: skill }, r, a, n;
      if (skill === 'sqrt') {
        r = big() ? bigSq() : rnd(1, MAX_SQ); q.r = r; q.answer = r;
        q.html = T('What is ', '¿Cuánto es ') + rad(fmt(r * r)) + T('?', '?');
        q.plain = '√' + fmt(r * r) + ' = ?';
      } else if (skill === 'square') {
        r = big() ? bigSq() : rnd(1, MAX_SQ); q.r = r; q.answer = r * r;
        q.html = T('What is ', '¿Cuánto es ') + fmt(r) + '<sup>2</sup>?';
        q.plain = fmt(r) + '² = ?';
      } else if (skill === 'area') {
        r = big() ? 10 : rnd(1, MAX_SQ); q.r = r; q.answer = r;
        q.html = '<span class="qsm">' + T('A square has an area of <b>' + fmt(r * r) + '</b> square units.<br>How long is each side?',
          'Un cuadrado tiene un área de <b>' + fmt(r * r) + '</b> unidades cuadradas.<br>¿Cuánto mide cada lado?') + '</span>';
        q.plain = T('A square with area ' + fmt(r * r) + ' has sides of ?', 'Un cuadrado de área ' + fmt(r * r) + ' tiene lados de ?');
      } else if (skill === 'estimate') {
        // a square root (or, about a third of the time, a cube root) that isn't a whole number:
        // the student finds BOTH whole numbers it's between
        q.cube = Math.random() < 0.35;
        var pw = q.cube ? 3 : 2;
        a = q.cube ? rnd(1, MAX_CUBE - 1) : rnd(1, MAX_SQ - 1);   // so the larger whole number is at most 6 or 13
        q.lo = Math.pow(a, pw); q.hi = Math.pow(a + 1, pw);
        n = rnd(q.lo + 1, q.hi - 1);
        q.a = a; q.n = n; q.two = true; q.answer = [a, a + 1];
        var blank = '<b class="blank">?</b>';
        q.html = (q.cube ? crad(n) : rad(n)) + T(' is between ', ' está entre ') + blank + T(' and ', ' y ') + blank;
        q.plain = (q.cube ? '∛' : '√') + n + T(' is between ', ' está entre ') + '?' + T(' and ', ' y ') + '?';
        q.sub = T('Type the two whole numbers it is between.', 'Escribe los dos números enteros entre los que está.');
      } else {
        r = big() ? bigCube() : rnd(1, MAX_CUBE); q.r = r; q.answer = r;
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

  function askQuestion() {
    question = makeQuestion();
    $('q-kick').textContent = T('KICK ', 'TIRO ') + (kickNum + 1) + T(' OF ', ' DE ') + KICKS + ' · ' + skillName(question.skill).toUpperCase();
    $('q-text').innerHTML = question.html;
    $('q-text').classList.toggle('long', !!question.two);
    $('q-sub').textContent = question.sub || T('Type a whole number.', 'Escribe un número entero.');
    qIn.value = ''; qIn2.value = '';
    $('q-and').hidden = qIn2.hidden = !question.two;
    $('q-ans').classList.toggle('two', !!question.two);
    setActiveBox(qIn);
    hideAimHud();
    show(scrQ);
    state = STATE.MATH;
    if (!isTouch) qIn.focus({ preventScroll: true });
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
    if (ok) {
      rightCount++;
      startAiming();   // aim right away, while the referee blows the whistle
      refWhistle();
    } else {
      missed.push({ q: question.plain, you: answerText(given), ans: question.answer });
      showExplanation(answerText(given));
    }
  }

  // ---------- Wrong answer: show why ----------
  // Big sides are drawn in blocks: a side of 30 is 3 blocks of 10, a side of 1000 is 10 blocks of 100
  function blocks(r) { if (r <= 13) return { n: r, b: 1 }; var b = r >= 100 ? r / 10 : 10; return { n: r / b, b: b }; }

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
      T('A cube made of ', 'Un cubo hecho de ') + fmt(rTrue * rTrue * rTrue) + T(' little cubes', ' cubitos') + '">' + svg + '</svg>' +
      '<div class="gcap">' + fmt(rTrue) + ' × ' + fmt(rTrue) + ' × ' + fmt(rTrue) + ' = ' + fmt(rTrue * rTrue * rTrue) + T(' little cubes', ' cubitos') +
      (k.b > 1 ? T('<br>each block is ', '<br>cada bloque es ') + k.b + ' × ' + k.b + ' × ' + k.b + ' = ' + fmt(k.b * k.b * k.b) : '') + '</div>';
  }

  function showExplanation(given) {
    state = STATE.EXPLANATION;
    var q = question, r = q.r, body = '', lines = [];
    $('exp-you').innerHTML = T('You answered <b>' + given + '</b>. The answer is <b class="ok">' + answerText(q.answer) + '</b>.',
      'Respondiste <b>' + given + '</b>. La respuesta es <b class="ok">' + answerText(q.answer) + '</b>.');

    if (q.skill === 'sqrt' || q.skill === 'square' || q.skill === 'area') {
      body = gridHTML(r, Math.min(200, app.clientHeight * 0.3));
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
    } else if (q.skill === 'cube') {
      body = cubeHTML(r, Math.min(220, app.clientHeight * 0.34));
      lines.push(T('A cube root asks: which number, used 3 times, multiplies to ', 'Una raíz cúbica pregunta: ¿qué número, multiplicado 3 veces, da ') + fmt(r * r * r) + '?');
      lines.push(r + ' × ' + r + ' × ' + r + ' = ' + fmt(r * r * r) + T(', so ', ', entonces ') + '∛' + fmt(r * r * r) + ' = <b class="ok">' + r + '</b>');
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
    $('exp-visual').innerHTML = body;
    $('exp-lines').innerHTML = lines.map(function (l) { return '<p>' + roots(l) + '</p>'; }).join('');
    show(scrExp);
    $('exp-go').focus({ preventScroll: true });
  }

  function closeExplanation() {
    if (state !== STATE.EXPLANATION) return;
    hide(scrExp);
    refWhistle(function () { executeKick(true); });   // missed the math: after the whistle, the shot goes wild
  }

  // ---------- Aiming and shooting ----------
  function startAiming() {
    state = STATE.AIMING;
    aimPower = 0;
    show(aimHint);
    chance.hidden = true;
    targetCrosshair.visible = true;
    setAim(0, 1.2);
    focusGame();
  }

  function hideAimHud() { aimHint.hidden = true; chance.hidden = true; }

  function setAim(tx, ty) {
    tx = Math.max(-6, Math.min(6, tx));
    ty = Math.max(0.1, Math.min(4, ty));
    targetCrosshair.position.set(tx, ty, 0);
    errorCircle.position.set(tx, ty, 0);
    var off = ty > GOAL_HEIGHT - 0.1 || Math.abs(tx) > GOAL_WIDTH / 2 - 0.1;
    targetCrosshair.material.color.setHex(off ? 0xff3333 : 0x33ff33);   // red when the aim point itself is off target
  }

  function aimAt(clientX, clientY) {
    if (state !== STATE.AIMING && state !== STATE.CHARGING) return;
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
    if (refWhistleT >= 0 && !refBlown) return;   // no kicking before the whistle (under half a second)
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
    if (isAutoMiss) {
      x = (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 2);
      y = 3.5 + Math.random() * 2;
      speed = 22;
    } else {
      showOdds(shotOdds(aimX, aimY, aimPower), false);   // the chance at the moment of release stays on screen
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
  function beatChance(x, y, power) {
    var dx = Math.min(1, Math.abs(x) / (GOAL_WIDTH / 2)), dy = Math.min(1, y / GOAL_HEIGHT);
    var place = 0.4 + 0.46 * Math.pow(dx, 1.2) + 0.1 * dy + 0.1 * dx * dy;
    var strike = 0.7 + 0.3 * power;
    var p = place * strike;
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

  function keeperDecision(targetX, targetY, flight) {
    keeperStartX = keeperBody.position.x;
    keeperStartY = keeperBody.position.y;
    catching = standingCatch = caught = false;
    var inGoal = !isAutoMiss && onTarget(targetX, targetY);
    var goesIn = inGoal && Math.random() < beatChance(targetX, targetY, aimPower);
    hitPost = false;

    if (inGoal && !goesIn) {
      // a save: the keeper gets there just as the ball does. A shot right at the keeper, or a weak one, is caught.
      standingCatch = Math.abs(targetX) < 1.1;
      catching = standingCatch || aimPower < 0.45;
      keeperTarget = standingCatch ? { x: targetX, y: Math.max(0, targetY - 1.45) } : { x: targetX, y: Math.min(targetY, GOAL_HEIGHT) };
      var intercept = flight * ((PENALTY_DIST - 0.5) / PENALTY_DIST);
      keeperReactionDelay = intercept * 0.1;
      keeperDiveDuration = intercept * 0.9;
      enforceSave = true;
      keeperBody.collisionResponse = !catching;
    } else {
      // a goal (or a miss): the keeper guesses wrong, or dives too late
      if (Math.random() > 0.5) {
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
    catchY = targetY;
  }
  var catchY = 1;

  function updateKeeper(delta) {
    if (!keeperDiving) { keeperIdle(); return; }
    keeperDiveTime += delta;
    if (keeperDiveTime < keeperReactionDelay) { keeperIdle(); return; }

    var diveT = (keeperDiveTime - keeperReactionDelay) / keeperDiveDuration, t = Math.min(1, diveT);
    var ease = 1 - Math.pow(1 - t, 3);
    var x = keeperStartX + (keeperTarget.x - keeperStartX) * ease;
    x = Math.max(-GOAL_WIDTH / 2 + 0.4, Math.min(GOAL_WIDTH / 2 - 0.4, x));
    var y = keeperStartY + (keeperTarget.y - keeperStartY) * Math.sin(t * Math.PI / 2);
    if (diveT > 1) {
      var fall = keeperDiveTime - keeperReactionDelay - keeperDiveDuration;
      y = Math.max(0, y - 0.5 * 15 * fall * fall);
    }
    var tilt = !standingCatch && Math.abs(keeperTarget.x) > 0.5 ? (x / (GOAL_WIDTH / 2)) * -(Math.PI / 2.3) : 0;
    keeperBody.position.set(x, y, keeperBody.position.z);
    keeperBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), tilt);

    keeperGroup.position.copy(keeperBody.position);
    keeperGroup.quaternion.copy(keeperBody.quaternion);
    kTorso.position.y = 1.0;
    if (standingCatch) {
      // both hands out in front, at the height of the ball, to gather it in
      var reach = -(Math.PI / 2 + Math.atan2(catchY - keeperTarget.y - 1.57, 0.45));
      kLArm.rotation.set(reach, 0, 0.18); kRArm.rotation.set(reach, 0, -0.18);
      kLLeg.rotation.set(-0.15, 0, -0.08); kRLeg.rotation.set(-0.15, 0, 0.08);
    } else if (keeperTarget.x < 0) {
      kLArm.rotation.set(0, 0, -(Math.PI - 0.3)); kRArm.rotation.set(0, 0, -(Math.PI - 0.95));   // both arms reach to the left
      kLLeg.rotation.set(0, 0, -0.2); kRLeg.rotation.set(-0.3, 0, 0.3);
    } else {
      kRArm.rotation.set(0, 0, Math.PI - 0.3); kLArm.rotation.set(0, 0, Math.PI - 0.95);   // both arms reach to the right
      kRLeg.rotation.set(0, 0, 0.2); kLLeg.rotation.set(-0.3, 0, -0.3);
    }
  }

  function keeperIdle() {
    var time = clock.elapsedTime, bob = Math.sin(time * 6);
    kTorso.position.y = 1.0 + Math.abs(bob) * 0.08;
    kLLeg.rotation.set(-0.1 + bob * 0.05, 0, -0.1);
    kRLeg.rotation.set(-0.1 + bob * 0.05, 0, 0.1);
    kLArm.rotation.set(0.35, 0, -1.2 - bob * 0.05);   // ready stance: arms spread wide, gloves out
    kRArm.rotation.set(0.35, 0, 1.2 + bob * 0.05);
    keeperGroup.position.copy(keeperBody.position);
    keeperGroup.quaternion.copy(keeperBody.quaternion);
  }

  // A caught ball stays between the keeper's gloves; after a moment the kick is marked CAUGHT
  var handL = new THREE.Vector3(), handR = new THREE.Vector3();
  function holdCaughtBall(delta) {
    keeperGroup.updateMatrixWorld(true);
    kLArm.localToWorld(handL.set(0, -0.6, 0.14));
    kRArm.localToWorld(handR.set(0, -0.6, 0.14));
    ballBody.position.set((handL.x + handR.x) / 2, Math.max(BALL_RADIUS, (handL.y + handR.y) / 2), (handL.z + handR.z) / 2 + 0.06);
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

  // ---------- Result of each kick ----------
  function checkResult() {
    if (resultDecided || caught) return;   // a caught ball is decided once the keeper has hold of it
    var p = ballBody.position, v = ballBody.velocity;
    var crossed = p.z + BALL_RADIUS < -0.05;   // the whole ball over the line
    var inPosts = p.x > -GOAL_WIDTH / 2 && p.x < GOAL_WIDTH / 2, underBar = p.y < GOAL_HEIGHT;
    if (crossed && p.z > -3 && inPosts && underBar) { kickResult('goal'); return; }

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
    msg.textContent = {
      goal: T('GOAL!', '¡GOL!'), saved: T('SAVED', '¡ATAJADA!'), caught: T('CAUGHT!', '¡ATRAPADA!'),
      post: T('OFF THE POST', '¡AL PALO!'), wide: T('WIDE', 'DESVIADO'), over: T('OVER THE BAR', 'POR ENCIMA')
    }[kind] || T('MISS', 'FUERA');
    msg.className = kind === 'goal' ? 'goal' : kind === 'saved' || kind === 'caught' ? 'saved' : 'miss';
    msg.hidden = false;
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
    c.fillStyle = '#60a5fa'; c.font = 'bold 40px Arial';
    c.fillText(T('PRO PENALTY', 'PRO PENALTY'), 256, 62);
    c.fillStyle = '#facc15'; c.font = 'bold 96px Arial';
    c.fillText(inGame ? goals + ' / ' + KICKS : '⚽', 256, 165);
    c.fillStyle = '#e2e8f0'; c.font = 'bold 30px Arial';
    c.fillText(inGame ? T('GOALS', 'GOLES') + ' · ' + T('KICK ', 'TIRO ') + Math.min(kickNum + 1, KICKS) + '/' + KICKS : T('MATH EDITION', 'EDICIÓN MATEMÁTICA'), 256, 222);
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
        save('skills', skillOn);
        playSound('blip');
      });
      list.appendChild(b);
    });
  }

  function tryStart() {
    if (skillOn.indexOf(true) < 0) { $('skill-err').hidden = false; return; }
    startShootout();
  }

  // ---------- Physics reset ----------
  function resetBall() {
    ballBody.position.set(0, BALL_RADIUS, PENALTY_DIST);
    ballBody.velocity.set(0, 0, 0);
    ballBody.angularVelocity.set(0, 0, 0);
    ballBody.quaternion.set(0, 0, 0, 1);
    ballMesh.position.copy(ballBody.position);
    ballMesh.quaternion.set(0, 0, 0, 1);
  }

  function resetKeeper() {
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

    if (state === STATE.AIMING || state === STATE.CHARGING) {   // keyboard aiming
      var dx = (keysDown.ArrowRight || keysDown.KeyD ? 1 : 0) - (keysDown.ArrowLeft || keysDown.KeyA ? 1 : 0);
      var dy = (keysDown.ArrowUp || keysDown.KeyW ? 1 : 0) - (keysDown.ArrowDown || keysDown.KeyS ? 1 : 0);
      if (dx || dy) setAim(targetCrosshair.position.x + dx * 4 * delta, targetCrosshair.position.y + dy * 2.5 * delta);
    }

    if (state === STATE.CHARGING) {
      aimPower += 1.5 * delta;
      if (aimPower > 1) aimPower = 0;   // big → tiny, then starts over
      var er = errorRadiusFor(aimPower);
      errorCircle.scale.set(er / 0.1, er / 0.1, 1);
      errorCircle.material.color.setHex(aimPower < 0.4 ? 0xff3333 : aimPower < 0.75 ? 0xffff33 : 0x33ff33);
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
      world.step(1 / 60, delta, 3);
      // a save is a save, however fast the shot: stop the ball in front of the line
      if (enforceSave && ballBody.position.z < 1.2 && ballBody.velocity.z < 0) {
        hitKeeper = true;
        enforceSave = false;
        if (catching) { caught = true; caughtTime = 0; playSound('catch'); }   // into the gloves (see holdCaughtBall)
        else {
          ballBody.position.z = 0.8;
          ballBody.velocity.set((Math.random() - 0.5) * 4, -1, 2 + Math.random() * 3);
        }
      }
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

  var AIM_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, KeyA: 1, KeyD: 1, KeyW: 1, KeyS: 1 };
  window.addEventListener('keydown', function (e) {
    if (window.isPageControlKey && isPageControlKey(e)) return;
    if (e.key === 'Escape') {   // Esc does what the MENU button does
      if (paused) closePause(); else openPause();
      e.preventDefault();
      return;
    }
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
    if (AIM_KEYS[e.code] && (state === STATE.AIMING || state === STATE.CHARGING)) { keysDown[e.code] = true; e.preventDefault(); return; }
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
