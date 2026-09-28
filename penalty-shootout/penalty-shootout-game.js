// Pro Penalty Shootout: answer a square-root question to earn each penalty kick, then aim and time the shot.
// A shootout is 5 kicks. The 3D stadium uses three.js (drawing) and cannon.js (ball physics).
(function () {
  'use strict';
  var T = window.tl || function (en) { return en; };

  // ---------- Settings and saved stats (localStorage, keys start with penaltyshootout_) ----------
  var KICKS = 5;
  var SKILLS = [
    { id: 'sqrt', name: T('Square Roots', 'Raíces cuadradas'), ex: '√81 = ?' },
    { id: 'square', name: T('Squaring Numbers', 'Elevar al cuadrado'), ex: '9² = ?' },
    { id: 'area', name: T('Side of a Square', 'Lado de un cuadrado'), ex: T('Area 81 → side?', 'Área 81 → ¿lado?') },
    { id: 'estimate', name: T('Estimating Square Roots', 'Estimar raíces cuadradas'), ex: T('√50 is between 7 and ?', '√50 está entre 7 y ?') },
    { id: 'cube', name: T('Cube Roots', 'Raíces cúbicas'), ex: '∛64 = ?' }
  ];
  function load(key, fallback) {
    try { var v = localStorage.getItem('penaltyshootout_' + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function save(key, val) { try { localStorage.setItem('penaltyshootout_' + key, JSON.stringify(val)); } catch (e) {} }

  var skillOn = load('skills', [true, false, false, false, false]);
  if (!Array.isArray(skillOn) || skillOn.length !== SKILLS.length) skillOn = [true, false, false, false, false];
  var level = load('level', 'rookie') === 'pro' ? 'pro' : 'rookie';

  // ---------- DOM ----------
  var $ = function (id) { return document.getElementById(id); };
  var app = $('ps'), canvas = $('ps-canvas');
  var scrMenu = $('scr-menu'), scrQ = $('scr-q'), scrExp = $('scr-exp'), scrOver = $('scr-over');
  var qIn = $('q-in'), msg = $('msg'), chance = $('chance'), aimHint = $('aimhint'), hud = $('hud');
  var isTouch = window.matchMedia && matchMedia('(hover: none), (pointer: coarse)').matches;
  if (isTouch) { qIn.readOnly = true; qIn.setAttribute('inputmode', 'none'); }   // the on-screen pad instead of the phone keyboard

  function show(el) { el.hidden = false; }
  function hide(el) {
    if (el.contains(document.activeElement)) { document.activeElement.blur(); focusGame(); }
    el.hidden = true;
  }
  function focusGame() { try { canvas.focus({ preventScroll: true }); } catch (e) {} }

  // ---------- Game state ----------
  var STATE = { MENU: 0, MATH: 1, EXPLANATION: 2, AIMING: 3, CHARGING: 4, KICKING: 5, RESULT: 6, OVER: 7 };
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

  function errorRadiusFor(p) { return 2.5 - p * 2.35; }   // big circle at 0 power, tiny at full

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
    var standMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    var backGeo = new THREE.BoxGeometry(100, 1, 2), sideGeo = new THREE.BoxGeometry(2, 1, 100);
    for (i = 1; i <= 15; i++) {
      var b = new THREE.Mesh(backGeo, standMat); b.position.set(0, i, -20 - i * 2); scene.add(b);
      var l = new THREE.Mesh(sideGeo, standMat); l.position.set(-45 - i * 2, i, 20); scene.add(l);
      var r = new THREE.Mesh(sideGeo, standMat); r.position.set(45 + i * 2, i, 20); scene.add(r);
    }
    createCrowd();

    var board = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 1), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    board.position.set(0, 25, -40);
    scene.add(board);
  }

  function createCrowd() {
    var count = 12000, pos = new Float32Array(count * 3), colors = new Float32Array(count * 3);
    var palette = [0xef4444, 0x3b82f6, 0xffffff, 0xeab308, 0x0f172a].map(function (h) { return new THREE.Color(h); });
    for (var i = 0; i < count; i++) {
      var section = Math.random(), row = Math.floor(Math.random() * 15) + 1, x, z;
      if (section < 0.4) { x = (Math.random() - 0.5) * 96; z = -20 - row * 2 + Math.random() * 1.5; }
      else if (section < 0.7) { x = -45 - row * 2 + Math.random() * 1.5; z = -30 + Math.random() * 96; }
      else { x = 45 + row * 2 + Math.random() * 1.5; z = -30 + Math.random() * 96; }
      pos[i * 3] = x; pos[i * 3 + 1] = row + Math.random() * 0.5; pos[i * 3 + 2] = z;
      var col = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.45, vertexColors: true })));

    // Camera flashes in the crowd
    var fc = 120, fpos = new Float32Array(fc * 3), phase = new Float32Array(fc);
    for (i = 0; i < fc; i++) {
      var s = Math.floor(Math.random() * count) * 3;
      fpos[i * 3] = pos[s]; fpos[i * 3 + 1] = pos[s + 1]; fpos[i * 3 + 2] = pos[s + 2];
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

  function createKeeper(mats) {
    keeperGroup = new THREE.Group();
    var shirt = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.8 });
    var shorts = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    var skin = new THREE.MeshStandardMaterial({ color: 0xfcb096 });
    var gloves = new THREE.MeshStandardMaterial({ color: 0xffffff });
    var bootMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    kTorso = new THREE.Group();
    kTorso.position.y = 1.0;
    var torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.25), shirt);
    torso.position.y = 0.35; torso.castShadow = true;
    kTorso.add(torso);
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), skin);
    head.position.y = 0.825; head.castShadow = true;
    kTorso.add(head);

    var makeArm = function (x) {
      var arm = new THREE.Group();
      arm.position.set(x, 0.65, 0);
      var a = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), shirt); a.position.y = -0.25; a.castShadow = true;
      var g = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), gloves); g.position.y = -0.6; g.castShadow = true;
      arm.add(a, g); kTorso.add(arm);
      return arm;
    };
    var makeLeg = function (x) {
      var leg = new THREE.Group();
      leg.position.set(x, 0, 0);
      var l = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), shorts); l.position.y = -0.45; l.castShadow = true;
      var b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 0.3), bootMat); b.position.set(0, -0.95, 0.05); b.castShadow = true;
      leg.add(l, b); kTorso.add(leg);
      return leg;
    };
    kLArm = makeArm(-0.3); kRArm = makeArm(0.3); kLLeg = makeLeg(-0.15); kRLeg = makeLeg(0.15);
    keeperGroup.add(kTorso);
    scene.add(keeperGroup);

    keeperBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: mats.keeperMat });
    keeperBody.addShape(new CANNON.Box(new CANNON.Vec3(0.4, 0.95, 0.3)), new CANNON.Vec3(0, 0.95, 0));
    resetKeeper();
    world.addBody(keeperBody);
  }

  function createReferee() {
    var ref = new THREE.Group();
    var shirt = new THREE.MeshStandardMaterial({ color: 0xeadb00, roughness: 0.9 });
    var shorts = new THREE.MeshStandardMaterial({ color: 0x111111 });
    var skin = new THREE.MeshStandardMaterial({ color: 0x8d5524 });
    var part = function (w, h, d, mat, x, y) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, 0); m.castShadow = true; ref.add(m);
    };
    part(0.4, 0.6, 0.25, shirt, 0, 1.3); part(0.25, 0.25, 0.25, skin, 0, 1.7);
    part(0.12, 0.5, 0.12, shirt, -0.28, 1.3); part(0.12, 0.5, 0.12, shirt, 0.28, 1.3);
    part(0.15, 0.6, 0.15, shorts, -0.12, 0.7); part(0.15, 0.6, 0.15, shorts, 0.12, 0.7);
    ref.position.set(4, 0, 7);
    ref.lookAt(0, 0, 11);   // watching the ball, standing upright
    scene.add(ref);
  }

  function createLeg() {
    legGroup = new THREE.Group();
    var boot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.35), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    boot.position.set(0, 0.06, -0.1);
    var sock = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.8), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    sock.position.set(0, 0.5, 0);
    legGroup.add(boot, sock);
    legGroup.position.set(0.2, 1.0, PENALTY_DIST + 0.5);
    legGroup.visible = false;
    scene.add(legGroup);
  }

  // ---------- Questions ----------
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  var rad = function (n) { return '<span class="rt">√<span class="rad">' + n + '</span></span>'; };
  var crad = function (n) { return '<span class="rt">∛<span class="rad">' + n + '</span></span>'; };

  function makeQuestion() {
    var active = [];
    for (var i = 0; i < SKILLS.length; i++) if (skillOn[i]) active.push(SKILLS[i].id);
    var pro = level === 'pro', maxRoot = pro ? 15 : 10;
    for (var tries = 0; tries < 40; tries++) {
      var skill = active[Math.floor(Math.random() * active.length)], q = { skill: skill }, r, a, n;
      if (skill === 'sqrt') {
        r = rnd(pro ? 4 : 2, maxRoot); q.r = r; q.answer = r;
        q.html = T('What is ', '¿Cuánto es ') + rad(r * r) + T('?', '?');
        q.plain = '√' + (r * r) + ' = ?';
      } else if (skill === 'square') {
        r = rnd(pro ? 4 : 2, maxRoot); q.r = r; q.answer = r * r;
        q.html = T('What is ', '¿Cuánto es ') + r + '<sup>2</sup>?';
        q.plain = r + '² = ?';
      } else if (skill === 'area') {
        r = rnd(pro ? 4 : 2, maxRoot); q.r = r; q.answer = r;
        q.html = '<span class="qsm">' + T('A square has an area of <b>' + r * r + '</b> square units.<br>How long is each side?',
          'Un cuadrado tiene un área de <b>' + r * r + '</b> unidades cuadradas.<br>¿Cuánto mide cada lado?') + '</span>';
        q.plain = T('A square with area ' + r * r + ' has sides of ?', 'Un cuadrado de área ' + r * r + ' tiene lados de ?');
      } else if (skill === 'estimate') {
        a = rnd(pro ? 3 : 1, maxRoot - 1); n = rnd(a * a + 1, (a + 1) * (a + 1) - 1);
        q.a = a; q.n = n; q.low = Math.random() < 0.5;   // ask for the smaller or the larger whole number
        q.answer = q.low ? a : a + 1;
        var blank = '<b class="blank">?</b>';
        q.html = rad(n) + T(' is between ', ' está entre ') + (q.low ? blank : a) + T(' and ', ' y ') + (q.low ? a + 1 : blank);
        q.plain = '√' + n + T(' is between ', ' está entre ') + (q.low ? '?' : a) + T(' and ', ' y ') + (q.low ? a + 1 : '?');
        q.sub = T('Type the missing whole number.', 'Escribe el número entero que falta.');
      } else {
        r = rnd(pro ? 3 : 2, pro ? 10 : 5); q.r = r; q.answer = r;
        q.html = T('What is ', '¿Cuánto es ') + crad(r * r * r) + '?';
        q.plain = '∛' + (r * r * r) + ' = ?';
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
    $('q-sub').textContent = question.sub || T('Type a whole number.', 'Escribe un número entero.');
    qIn.value = '';
    hideAimHud();
    show(scrQ);
    state = STATE.MATH;
    if (!isTouch) qIn.focus({ preventScroll: true });
  }

  function submitAnswer() {
    if (state !== STATE.MATH) return;
    var val = parseInt(qIn.value, 10);
    if (isNaN(val)) { qIn.classList.remove('shake'); void qIn.offsetWidth; qIn.classList.add('shake'); return; }
    hide(scrQ);
    if (val === question.answer) {
      rightCount++;
      startAiming();
    } else {
      missed.push({ q: question.plain, you: val, ans: question.answer });
      showExplanation(val);
    }
  }

  // ---------- Wrong answer: show why ----------
  function gridHTML(r, px, layers) {
    var cells = '';
    for (var i = 0; i < r * r; i++) cells += '<i style="animation-delay:' + Math.round(i * 1000 / (r * r)) + 'ms"></i>';
    return '<div class="grid" style="grid-template-columns:repeat(' + r + ',' + px + 'px);grid-template-rows:repeat(' + r + ',' + px + 'px)">' + cells + '</div>' +
      '<div class="gcap">' + r + ' × ' + r + (layers ? T(' squares in each layer, ', ' cuadrados en cada capa, ') + r + T(' layers', ' capas') : '') + '</div>';
  }

  function showExplanation(given) {
    state = STATE.EXPLANATION;
    var q = question, r = q.r, body = '', lines = [];
    $('exp-you').innerHTML = T('You answered <b>' + given + '</b>. The answer is <b class="ok">' + q.answer + '</b>.',
      'Respondiste <b>' + given + '</b>. La respuesta es <b class="ok">' + q.answer + '</b>.');
    var px = Math.max(6, Math.floor(Math.min(200, app.clientHeight * 0.3) / (r || 1)));

    if (q.skill === 'sqrt' || q.skill === 'square' || q.skill === 'area') {
      body = gridHTML(r, px, false);
      if (q.skill === 'sqrt') {
        lines.push(T('A square root is the side length of a square with that area.', 'La raíz cuadrada es el lado de un cuadrado con esa área.'));
        lines.push(r + ' × ' + r + ' = ' + r * r + T(', so ', ', entonces ') + '√' + r * r + ' = <b class="ok">' + r + '</b>');
      } else if (q.skill === 'square') {
        lines.push(r + '<sup>2</sup>' + T(' means ', ' significa ') + r + ' × ' + r + T(': a square with sides of ', ': un cuadrado con lados de ') + r + '.');
        lines.push(r + ' × ' + r + ' = <b class="ok">' + r * r + '</b>' + T(' squares', ' cuadrados'));
      } else {
        lines.push(T('Side × side = area. Which number times itself makes ', 'Lado × lado = área. ¿Qué número por sí mismo da ') + r * r + '?');
        lines.push(r + ' × ' + r + ' = ' + r * r + T(', so each side is ', ', así que cada lado mide ') + '<b class="ok">' + r + '</b>');
      }
    } else if (q.skill === 'cube') {
      body = gridHTML(r, px, true);
      lines.push(T('A cube root asks: which number, used 3 times, multiplies to ', 'Una raíz cúbica pregunta: ¿qué número, multiplicado 3 veces, da ') + r * r * r + '?');
      lines.push(r + ' × ' + r + ' × ' + r + ' = ' + r * r * r + T(', so ', ', entonces ') + '∛' + r * r * r + ' = <b class="ok">' + r + '</b>');
    } else {
      var a = q.a, lo = a * a, hi = (a + 1) * (a + 1), pct = Math.round((q.n - lo) / (hi - lo) * 100);
      body = '<div class="nl"><div class="nl-bar"></div>' +
        '<div class="nl-tick" style="left:0"><b>' + lo + '</b><span>' + a + '²</span></div>' +
        '<div class="nl-tick" style="left:100%"><b>' + hi + '</b><span>' + (a + 1) + '²</span></div>' +
        '<div class="nl-pt" style="left:' + pct + '%"><b>' + q.n + '</b></div></div>';
      lines.push(a + ' × ' + a + ' = ' + lo + T(' and ', ' y ') + (a + 1) + ' × ' + (a + 1) + ' = ' + hi);
      lines.push(lo + ' < ' + q.n + ' < ' + hi + T(', so ', ', entonces ') + '√' + q.n + T(' is between ', ' está entre ') +
        '<b class="ok">' + a + '</b>' + T(' and ', ' y ') + '<b class="ok">' + (a + 1) + '</b>');
    }
    $('exp-visual').innerHTML = body;
    $('exp-lines').innerHTML = lines.map(function (l) { return '<p>' + l + '</p>'; }).join('');
    show(scrExp);
    $('exp-go').focus({ preventScroll: true });
  }

  function closeExplanation() {
    if (state !== STATE.EXPLANATION) return;
    hide(scrExp);
    executeKick(true);   // missed the math: the shot goes wild
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
    playSound('whistle');
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
      var errR = errorRadiusFor(aimPower) * Math.sqrt(Math.random()), errA = Math.random() * Math.PI * 2;
      x += Math.cos(errA) * errR;
      y = Math.max(BALL_RADIUS, y + Math.sin(errA) * errR);
    }

    // Inverse ballistics: the velocity that carries the ball from the spot to (x, y) on the goal line
    var g = 9.81, t = Math.sqrt(x * x + PENALTY_DIST * PENALTY_DIST) / speed;
    ballBody.velocity.set(x / t, (y - BALL_RADIUS + 0.5 * g * t * t) / t, -PENALTY_DIST / t);
    ballBody.angularVelocity.set(-PENALTY_DIST / t * 2, 0, 0);

    var pct = keeperDecision(x, y, t, aimX, aimY);
    if (!isAutoMiss) {
      $('chance-n').textContent = pct;
      chance.className = pct > 65 ? 'good' : pct > 35 ? 'mid' : 'bad';
      chance.hidden = false;
    }
  }

  // ---------- Keeper: the scoring chance decides the save ----------
  var keeperTarget = { x: 0, y: 0 }, keeperDiving = false, keeperReactionDelay = 0, keeperDiveTime = 0, keeperDiveDuration = 0.6;

  function keeperDecision(targetX, targetY, flight, aimX, aimY) {
    keeperStartX = keeperBody.position.x;
    keeperStartY = keeperBody.position.y;
    var offTarget = Math.abs(targetX) > GOAL_WIDTH / 2 + BALL_RADIUS * 2 || targetY > GOAL_HEIGHT + BALL_RADIUS * 2;

    // Where it was aimed: corners are hardest to save, the middle is easiest
    var ax = Math.abs(aimX), base = 25;
    if (ax > 2.5 && ax < 3.66 && aimY > 1.5 && aimY < 2.44) base = 95;
    else if (ax > 2.5 && ax < 3.66 && aimY < 0.8) base = 80;
    else if (ax > 1.8 || aimY > 1.6) base = 55;

    var timing = 0.3 + aimPower * 0.7;                     // a big circle means a weak, sloppy strike
    var er = errorRadiusFor(aimPower), penalty = 0;          // and a circle spilling past the frame costs more
    if (ax + er > GOAL_WIDTH / 2) penalty += (ax + er - GOAL_WIDTH / 2) * 15;
    if (aimY + er > GOAL_HEIGHT) penalty += (aimY + er - GOAL_HEIGHT) * 15;
    if (level === 'pro') base -= 5;                          // Pro keepers are a little sharper

    var pct = Math.max(1, Math.min(99, Math.round(base * timing - penalty)));
    if (offTarget) pct = 0;
    var goesIn = Math.random() * 100 < pct;

    if (!goesIn && !offTarget) {
      // a save: the keeper gets there just as the ball does
      keeperTarget = { x: targetX, y: Math.min(targetY, GOAL_HEIGHT) };
      var intercept = flight * ((PENALTY_DIST - 0.5) / PENALTY_DIST);
      keeperReactionDelay = intercept * 0.1;
      keeperDiveDuration = intercept * 0.9;
      enforceSave = true;
      keeperBody.collisionResponse = true;
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
    return pct;
  }

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
    var tilt = Math.abs(keeperTarget.x) > 0.5 ? (x / (GOAL_WIDTH / 2)) * -(Math.PI / 2.3) : 0;
    keeperBody.position.set(x, y, keeperBody.position.z);
    keeperBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), tilt);

    keeperGroup.position.copy(keeperBody.position);
    keeperGroup.quaternion.copy(keeperBody.quaternion);
    kTorso.position.y = 1.0;
    if (keeperTarget.x < 0) {
      kLArm.rotation.set(0, 0, Math.PI - 0.4); kRArm.rotation.set(-0.5, 0, 0.5);
      kLLeg.rotation.set(0, 0, -0.2); kRLeg.rotation.set(-0.3, 0, 0.3);
    } else {
      kRArm.rotation.set(0, 0, -Math.PI + 0.4); kLArm.rotation.set(-0.5, 0, -0.5);
      kRLeg.rotation.set(0, 0, 0.2); kLLeg.rotation.set(-0.3, 0, -0.3);
    }
  }

  function keeperIdle() {
    var time = clock.elapsedTime, bob = Math.sin(time * 6);
    kTorso.position.y = 1.0 + Math.abs(bob) * 0.08;
    kLLeg.rotation.set(-0.1 + bob * 0.05, 0, 0);
    kRLeg.rotation.set(-0.1 + bob * 0.05, 0, 0);
    kLArm.rotation.set(0.3, 0, 0.4);
    kRArm.rotation.set(0.3, 0, -0.4);
    keeperGroup.position.copy(keeperBody.position);
    keeperGroup.quaternion.copy(keeperBody.quaternion);
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
    var now = performance.now();
    if (now - lastHitTime > 500 && other.shapes[0] instanceof CANNON.Cylinder) { playSound('woodwork'); lastHitTime = now; }
  }

  // ---------- Result of each kick ----------
  function checkResult() {
    if (resultDecided) return;
    var p = ballBody.position, v = ballBody.velocity;
    var crossed = p.z + BALL_RADIUS < -0.05;   // the whole ball over the line
    var inPosts = p.x > -GOAL_WIDTH / 2 && p.x < GOAL_WIDTH / 2, underBar = p.y < GOAL_HEIGHT;
    if (crossed && p.z > -3 && inPosts && underBar) { kickResult('goal'); return; }

    var wide = p.z < -BALL_RADIUS && (!inPosts || !underBar);
    var stopped = v.lengthSquared() < 2 && Math.abs(v.z) < 1;
    var away = v.z > 0.5 && p.z > -0.5 && p.z < 8;
    var gone = Math.abs(p.x) > 30 || p.z < -15 || p.y < -1;
    if (wide || stopped || away || gone) kickResult(hitKeeper ? 'saved' : 'miss');
  }

  function kickResult(kind) {
    resultDecided = true;
    state = STATE.RESULT;
    results[kickNum] = kind;
    if (kind === 'goal') { goals++; playSound('cheer'); } else playSound('groan');
    msg.textContent = kind === 'goal' ? T('GOAL!', '¡GOL!') : kind === 'saved' ? T('SAVED', '¡ATAJADA!') : T('MISS', 'FUERA');
    msg.className = kind;
    msg.hidden = false;
    kickNum++;
    drawHud();
    resultTimeout = setTimeout(function () { if (state === STATE.RESULT) skipResult(); }, 2200);
  }

  function skipResult() {
    clearTimeout(resultTimeout);
    msg.hidden = true;
    chance.hidden = true;
    nextKick();
  }

  function drawHud() {
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
    if (level === 'pro' && goals > load('pro_best', 0)) save('pro_best', goals);

    $('over-title').textContent = goals >= 4 ? T('CHAMPION!', '¡CAMPEÓN!') : goals >= 2 ? T('FULL TIME', 'FINAL DEL PARTIDO') : T('KEEP PRACTICING', 'SIGUE PRACTICANDO');
    $('over-goals').textContent = goals + ' / ' + KICKS;
    $('over-right').textContent = rightCount + ' / ' + KICKS;
    $('over-best').textContent = newBest ? T('New best!', '¡Nuevo récord!') : T('Best: ', 'Récord: ') + Math.max(best, goals) + ' / ' + KICKS;
    $('over-best').className = newBest ? 'best new' : 'best';
    var list = $('over-missed');
    if (missed.length) {
      list.innerHTML = '<h3>' + T('Questions to review', 'Preguntas para repasar') + '</h3>' + missed.map(function (m) {
        return '<li><span class="mq">' + m.q.replace('?', '<b class="ok">' + m.ans + '</b>') + '</span><span class="you">' + T('you said ', 'dijiste ') + m.you + '</span></li>';
      }).join('');
      list.hidden = false;
    } else {
      list.innerHTML = '<p class="allok">' + T('Every question right. Great work!', '¡Todas las preguntas bien. Excelente trabajo!') + '</p>';
      list.hidden = false;
    }
    show(scrOver);
    $('over-again').focus({ preventScroll: true });
  }

  function showMenu() {
    state = STATE.MENU;
    hide(scrOver); hide(scrQ); hide(scrExp);
    hud.hidden = true;
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
      b.innerHTML = '<span class="chk" aria-hidden="true"></span><span class="nm">' + s.name + '</span><span class="ex">' + s.ex + '</span>';
      b.addEventListener('click', function () {
        skillOn[i] = !skillOn[i];
        b.setAttribute('aria-pressed', String(skillOn[i]));
        $('skill-err').hidden = true;
        save('skills', skillOn);
        playSound('blip');
      });
      list.appendChild(b);
    });
    var lv = document.querySelectorAll('#ps .seg button');
    Array.prototype.forEach.call(lv, function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-level') === level));
      b.addEventListener('click', function () {
        level = b.getAttribute('data-level');
        save('level', level);
        Array.prototype.forEach.call(lv, function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        playSound('blip');
      });
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
        ballBody.position.z = 0.8;
        ballBody.velocity.set((Math.random() - 0.5) * 4, -1, 2 + Math.random() * 3);
        enforceSave = false;
      }
      ballMesh.position.copy(ballBody.position);
      ballMesh.quaternion.copy(ballBody.quaternion);
      checkResult();
    }

    updateKeeper(delta);

    if (rainParticles) {
      var rp = rainParticles.geometry.attributes.position.array;
      for (var i = 1; i < rp.length; i += 3) { rp[i] -= 25 * delta; if (rp[i] < 0) rp[i] = 40; }
      rainParticles.geometry.attributes.position.needsUpdate = true;
    }
    flashParticles.material.uniforms.time.value = clock.elapsedTime;
    renderer.render(scene, camera);
  }

  // ---------- Input ----------
  canvas.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    unlockAudio();
    aimAt(e.clientX, e.clientY);
    startCharge();
  });
  canvas.addEventListener('mousemove', function (e) { aimAt(e.clientX, e.clientY); });
  window.addEventListener('mouseup', endCharge);

  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();   // no pretend mouse clicks afterwards
    unlockAudio();
    var t = e.touches[0];
    aimAt(t.clientX, t.clientY);
    startCharge();
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) { e.preventDefault(); var t = e.touches[0]; aimAt(t.clientX, t.clientY); }, { passive: false });
  canvas.addEventListener('touchend', function (e) { e.preventDefault(); endCharge(); }, { passive: false });
  canvas.addEventListener('touchcancel', endCharge);

  var AIM_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, KeyA: 1, KeyD: 1, KeyW: 1, KeyS: 1 };
  window.addEventListener('keydown', function (e) {
    if (window.isPageControlKey && isPageControlKey(e)) return;
    unlockAudio();
    var tag = e.target && e.target.tagName, go = e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter';
    if (state === STATE.MATH) {
      if (go && tag !== 'BUTTON') { e.preventDefault(); submitAnswer(); return; }
      if (tag !== 'INPUT') {   // typing works even when the answer box isn't focused
        if (/^[0-9]$/.test(e.key) && qIn.value.length < 3) { qIn.value += e.key; e.preventDefault(); }
        else if (e.key === 'Backspace') { qIn.value = qIn.value.slice(0, -1); e.preventDefault(); }
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
    else startCharge();
  });
  window.addEventListener('keyup', function (e) {
    keysDown[e.code] = false;
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') endCharge();
  });
  window.addEventListener('blur', function () { keysDown = {}; endCharge(); });

  qIn.addEventListener('input', function () { qIn.value = qIn.value.replace(/[^0-9]/g, '').slice(0, 3); });
  $('q-go').addEventListener('click', submitAnswer);
  Array.prototype.forEach.call(document.querySelectorAll('#q-pad button'), function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-k');
      if (k === 'back') qIn.value = qIn.value.slice(0, -1);
      else if (k === 'go') submitAnswer();
      else if (qIn.value.length < 3) qIn.value += k;
    });
  });
  $('exp-go').addEventListener('click', closeExplanation);
  $('btn-start').addEventListener('click', function () { unlockAudio(); tryStart(); });
  $('over-again').addEventListener('click', startShootout);
  $('over-menu').addEventListener('click', showMenu);

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
