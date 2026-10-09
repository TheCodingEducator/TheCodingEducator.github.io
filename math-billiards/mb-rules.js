// Math Billiards - the classroom version of 8-ball, and the computer player.
//
// Rules (kept simple on purpose): red balls and blue balls are the two groups; the first group ball pocketed decides
// who has which color; pocket your own color to keep shooting; the black 8-ball is last, and pocketing it before your
// color is cleared loses. No called pockets, no fouls; if the cue ball drops, the turn passes and the next player
// places the cue ball anywhere.
(function () {
  var MB = window.MB, V = MB.V, R = MB.R, TB = MB.TABLE, T = MB.T;

  MB.Rules = {
    // the balls of one color still on the table
    left: function (balls, group) { return balls.filter(function (b) { return b.on && b.kind === group; }).length; },
    // what the shooter may aim at right now
    targets: function (balls, group) {
      if (!group) return balls.filter(function (b) { return b.on && (b.kind === 'red' || b.kind === 'blue'); });
      var mine = balls.filter(function (b) { return b.on && b.kind === group; });
      return mine.length ? mine : balls.filter(function (b) { return b.on && b.kind === 'eight'; });
    },
    // After a shot: pocketed (in the order they dropped), the groups, who shot. Returns what happens next.
    resolve: function (g, pocketed) {
      var me = g.players[g.turn], them = g.players[1 - g.turn], out = { msg: [], keep: false, inHand: false, over: false };
      var cue = pocketed.some(function (b) { return b.kind === 'cue'; });
      var eight = pocketed.some(function (b) { return b.kind === 'eight'; });
      var colored = pocketed.filter(function (b) { return b.kind === 'red' || b.kind === 'blue'; });
      // the first colored ball decides the groups
      if (!me.group && colored.length) {
        me.group = colored[0].kind; them.group = me.group === 'red' ? 'blue' : 'red';
        out.msg.push(T(me.name + ' is ' + MB.groupName(me.group) + '!', '¡' + me.name + ' tiene las ' + MB.groupName(me.group) + '!'));
        out.assigned = true;
      }
      if (eight) {
        // the 8-ball wins only if your color was already cleared before this shot
        var cleared = me.group && g.leftBefore[me.group] === 0;
        out.over = true; out.winner = cleared ? g.turn : 1 - g.turn;
        out.msg.push(cleared ? T(me.name + ' sinks the 8-ball and wins!', '¡' + me.name + ' mete la bola 8 y gana!')
          : T('The 8-ball went in too early. ' + them.name + ' wins!', 'La bola 8 entró antes de tiempo. ¡Gana ' + them.name + '!'));
        return out;
      }
      var mine = me.group ? colored.filter(function (b) { return b.kind === me.group; }).length : colored.length;
      if (cue) {
        out.inHand = true;
        out.msg.push(T('The cue ball dropped. ' + them.name + ' places it anywhere.', 'La bola blanca entró. ' + them.name + ' la coloca donde quiera.'));
      } else if (mine > 0) {
        out.keep = true;
        out.msg.push(T('Pocketed! ' + me.name + ' shoots again.', '¡Dentro! ' + me.name + ' tira otra vez.'));
      }
      if (!out.keep && !cue) out.msg.push(colored.length ? T('No ' + MB.groupName(me.group) + ' ball went in.', 'No entró ninguna bola ' + MB.groupSingle(me.group) + '.') : '');
      return out;
    }
  };
  MB.groupName = function (g) { return g === 'red' ? T('Red', 'rojas') : g === 'blue' ? T('Blue', 'azules') : ''; };
  MB.groupSingle = function (g) { return g === 'red' ? T('red', 'roja') : g === 'blue' ? T('blue', 'azul') : ''; };

  // ------------------------------------------------------------------ the computer player
  // It always solves the angle problem correctly, but its aim and its feel for power are only human: a small random
  // error on every shot, so it misses sometimes. aimError (degrees) can be turned up or down for an easier or harder
  // opponent.
  MB.AI = { aimError: { beginner: 0.8, intermediate: 0.6, challenge: 0.45 }, powerError: 0.12 };
  function gauss() { var u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function clearPath(balls, a, b, skip) {
    var ab = V.sub(b, a), L = V.len(ab), u = V.mul(ab, 1 / (L || 1));
    for (var i = 0; i < balls.length; i++) {
      var o = balls[i]; if (!o.on || skip.indexOf(o) >= 0) continue;
      var t = V.dot(V.sub(o, a), u); if (t < 0 || t > L) continue;
      if (V.len(V.sub(V.sub(o, a), V.mul(u, t))) < 2 * R + 1) return false;
    }
    return true;
  }
  // the point to send a ball at for each pocket: a little way inside the mouth
  function aimPoint(p) {
    var mid = V.mul(V.add(p.e1, p.e2), 0.5);
    return V.add(p.c, V.mul(V.sub(mid, p.c), 0.35));
  }
  MB.aiChoose = function (g) {
    var balls = g.balls, cue = balls[0], me = g.players[g.turn], targets = MB.Rules.targets(balls, me.group), cands = [];
    if (g.breakShot) {
      var apex = balls.filter(function (b) { return b.on && b.kind !== 'cue'; }).sort(function (a, b) { return a.x - b.x; })[0];
      return finish(g, V.norm(V.sub(apex, cue)), 0.95);
    }
    targets.forEach(function (tb) {
      MB.POCKETS.forEach(function (p) {
        var ap = aimPoint(p), toP = V.norm(V.sub(ap, tb)), ghost = V.sub(tb, V.mul(toP, 2 * R));
        if (ghost.x < TB.x0 + R || ghost.x > TB.x1 - R || ghost.y < TB.y0 + R || ghost.y > TB.y1 - R) return;
        var toG = V.sub(ghost, cue), dG = V.len(toG); if (dG < 1) return;
        var dirC = V.mul(toG, 1 / dG), cut = V.between(dirC, toP); if (cut > 72) return;
        if (!clearPath(balls, cue, ghost, [cue, tb]) || !clearPath(balls, tb, ap, [cue, tb])) return;
        var dP = V.dist(tb, ap), c = Math.cos(cut * MB.D2R);
        var need = Math.sqrt(2 * 230 * (dG + dP / (c * c)) * 1.25) + 220;
        cands.push({ dir: dirC, power: MB.clamp((need - MB.MIN_SPEED) / (MB.MAX_SPEED - MB.MIN_SPEED), 0.18, 0.92), score: (dG + 1.6 * dP) / (c * c) });
      });
    });
    cands.sort(function (a, b) { return a.score - b.score; });
    // check the best few by playing them out of sight; keep the first that works without dropping the cue ball or
    // the 8-ball by mistake
    var pick = null;
    for (var i = 0; i < Math.min(6, cands.length) && !pick; i++) {
      var sim = MB.simulate(balls, 0, cands[i].dir, cands[i].power, {});
      var good = sim.pocketed.some(function (b) { return targets.some(function (t) { return t.kind === b.kind && t.num === b.num; }); });
      var bad = sim.pocketed.some(function (b) { return b.kind === 'cue' || (b.kind === 'eight' && targets[0].kind !== 'eight'); });
      if (good && !bad) pick = cands[i];
    }
    if (!pick && cands.length) pick = cands[0];
    if (!pick) {
      // nothing to pot: a gentle shot straight at the nearest ball it may hit
      var near = targets.slice().sort(function (a, b) { return V.dist(a, cue) - V.dist(b, cue); })[0] || balls.filter(function (b) { return b.on && b.kind !== 'cue'; })[0];
      pick = { dir: V.norm(V.sub(near, cue)), power: 0.45 };
    }
    return finish(g, pick.dir, pick.power);
  };
  function finish(g, dir, power) {
    var err = MB.AI.aimError[g.diff] || 1;
    return { dir: V.rot(dir, gauss() * err * 0.6), power: MB.clamp(power * (1 + gauss() * MB.AI.powerError * 0.5), 0.12, 1) };
  }
})();
