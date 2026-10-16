// Battle on the Coordinate Plane: the connection for playing a friend on another computer.
// The two computers connect to each other directly (WebRTC, set up through the free PeerJS service). One player hosts
// and gets a short game code; the other types the code to join. Only game moves are sent (a point, hit or miss, a
// sunk ship); there are no names, accounts or chat. The PeerJS library loads only when someone chooses online play.
//
// The game uses it like this:
//   var net = BattleNet.create({ open: fn, message: fn(msg), close: fn, error: fn(err) });
//   net.host().then(function (code) { ... show the code ... });     // or: net.join(code).then(...)
//   net.send({ t: 'shot', x: 2, y: -1 });                           // every message is an object with a type, t
//   net.close();
(function () {
  var LIB = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';
  var PREFIX = 'studentmathgames-battle-';     // so codes can't collide with other sites on the same service
  var ABC = 'ACDEFHJKMNPRTUVWXY34679';         // no look-alikes: 0/O, 1/I/L, 2/Z, 5/S, 8/B, 6/G
  var CODE_LEN = 5;
  var libP = null;

  function loadLib() {
    if (window.Peer) return Promise.resolve();
    if (libP) return libP;
    libP = new Promise(function (ok, fail) {
      var s = document.createElement('script');
      s.src = LIB; s.async = true;
      s.onload = function () { if (window.Peer) ok(); else { libP = null; fail({ type: 'lib' }); } };
      s.onerror = function () { libP = null; fail({ type: 'lib' }); };
      document.head.appendChild(s);
    });
    return libP;
  }
  function makeCode() { var c = ''; for (var i = 0; i < CODE_LEN; i++) c += ABC.charAt(Math.floor(Math.random() * ABC.length)); return c; }
  function clean(code) { return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN); }

  function Net(on) { this.on = on || {}; this.peer = null; this.conn = null; this.closed = false; this.code = ''; }
  Net.prototype.emit = function (name, arg) { var f = this.on[name]; if (f) try { f(arg); } catch (e) { setTimeout(function () { throw e; }); } };

  // Host: get a code from the service, then wait for one opponent to connect with it
  Net.prototype.host = function () {
    var self = this;
    return loadLib().then(function () {
      return new Promise(function (ok, fail) {
        var tries = 0, opened = false;
        (function attempt() {
          var code = makeCode(), peer = new window.Peer(PREFIX + code, { debug: 0 });
          self.peer = peer;
          peer.on('open', function () { opened = true; self.code = code; ok(code); });
          peer.on('connection', function (c) {
            if (self.conn || self.closed) { c.on('open', function () { c.close(); }); return; }   // one opponent per game
            self.wire(c);
          });
          peer.on('error', function (e) {
            if (!opened && e && e.type === 'unavailable-id' && tries++ < 4) { peer.destroy(); attempt(); return; }   // that code is taken: try another
            if (!opened) fail(e || {}); else if (!self.conn) self.emit('error', e || {});
          });
        })();
      });
    });
  };

  // Join: connect to the host with the code they were given
  Net.prototype.join = function (code) {
    var self = this;
    code = clean(code);
    return loadLib().then(function () {
      return new Promise(function (ok, fail) {
        var done = false, peer = self.peer = new window.Peer({ debug: 0 });
        function finish(err) { if (done) return; done = true; if (err) fail(err); else ok(); }
        peer.on('open', function () {
          self.code = code;
          self.wire(peer.connect(PREFIX + code, { reliable: true, serialization: 'json' }), function () { finish(); });
        });
        peer.on('error', function (e) { if (!done) finish(e || {}); else if (!self.conn || !self.conn.open) self.lost(); });
        setTimeout(function () { finish({ type: 'timeout' }); }, 15000);
      });
    });
  };

  Net.prototype.wire = function (c, opened) {
    var self = this;
    self.conn = c;
    // a heartbeat: a closed tab or a lost network is not always reported, so 15 seconds of silence counts as gone
    c.on('open', function () {
      self.seen = Date.now();
      self.beat = setInterval(function () { self.send({ t: 'ping' }); if (Date.now() - self.seen > 15000) self.lost(); }, 3000);
      if (opened) opened();
      self.emit('open');
    });
    c.on('data', function (d) {
      if (typeof d === 'string') try { d = JSON.parse(d); } catch (e) { return; }
      if (d && typeof d === 'object' && typeof d.t === 'string') {
        self.seen = Date.now();
        if (d.t === 'ping') return;
        if (d.t === 'bye') { self.lost(); return; }
        self.emit('message', d);
      }
    });
    c.on('close', function () { self.lost(); });
    c.on('error', function () { self.lost(); });
  };
  Net.prototype.send = function (m) { if (this.conn && this.conn.open) try { this.conn.send(m); } catch (e) {} };
  // the other side left or the connection dropped
  Net.prototype.lost = function () {
    if (this.closed) return;
    this.closed = true;
    this.emit('close');
    this.destroy();
  };
  // we are leaving: tell the other side first, so they hear at once instead of after a time-out
  Net.prototype.close = function () {
    if (this.closed) return;
    this.closed = true;
    this.send({ t: 'bye' });
    var self = this;
    setTimeout(function () { self.destroy(); }, 250);
  };
  Net.prototype.destroy = function () {
    clearInterval(this.beat);
    try { if (this.conn) this.conn.close(); } catch (e) {}
    try { if (this.peer) this.peer.destroy(); } catch (e) {}
  };

  window.BattleNet = {
    create: function (on) { return new Net(on); },
    clean: clean,
    codeLength: CODE_LEN,
    // online play is still being built: it shows only when the page is opened with ?online at the end of its address
    enabled: /[?&]online\b/.test(location.search)
  };
})();
