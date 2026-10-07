// Saved stats for every game, shared by the My Stats page and each game's "My stats" pop-out (site-layout.js).
// Everything is read straight out of this browser's localStorage - the same keys each game already saves - and
// read fresh every time it's shown. Nothing here writes new data.
(function () {
  function readNum(key, fallback) {
    var v = localStorage.getItem(key);
    if (v === null) return fallback;
    var n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }
  function readJSON(key, fallback) {
    var v = localStorage.getItem(key);
    if (v === null) return fallback;
    try { var p = JSON.parse(v); return p === null ? fallback : p; } catch (e) { return fallback; }
  }
  function readBool(key) { return localStorage.getItem(key) === 'true'; }
  function has(key) { return localStorage.getItem(key) !== null; }
  function secs(s) { return s === null || s === undefined ? '—' : s.toFixed(2) + 's'; }

  var BRIDGE_CREW_TOTAL = 40;   // Similarity Builder's crew looks (the Site Worker is free)

  // one entry per game that saves progress: its folder (for links), name, icon, and its stats right now
  function read() {
    var lg = {
      played: has('lgttp_coins') || has('lgttp_hs_genius'),
      coins: readNum('lgttp_coins', 0), streak: readNum('lgttp_streak', 0),
      skins: (readJSON('lgttp_owned_skins', [0]) || [0]).length,
      hsGenius: readNum('lgttp_hs_genius', 0), hsGeometry: readNum('lgttp_hs_geometry', 0),
      geniusRuns: readNum('lgttp_genius_done', 0)
    };
    var unl = readJSON('exprace_unlocked', { cars: ['red'], trails: ['none'], boosts: ['none'] }) || {};
    var er = {
      played: has('exprace_coins'), coins: readNum('exprace_coins', 0), hardMode: readBool('exprace_hard_unlocked'),
      items: (unl.cars || []).length + (unl.trails || []).length + (unl.boosts || []).length
    };
    var lh = {
      played: has('laserheist_high_score') || has('laserheist_best_streak'),
      highScore: readNum('laserheist_high_score', 0), bestStreak: readNum('laserheist_best_streak', 0),
      skins: (readJSON('laserheist_unlocked_skins', [0]) || [0]).length
    };
    var pb = {
      played: has('piggybank_best_easy') || has('piggybank_best_hard'),
      bestEasy: has('piggybank_best_easy') ? readNum('piggybank_best_easy', null) : null,
      bestHard: has('piggybank_best_hard') ? readNum('piggybank_best_hard', null) : null
    };
    var sb = {
      played: has('similaritybuilder_best_meters') || has('similaritybuilder_coins'),
      bestMeters: readNum('similaritybuilder_best_meters', 0), bestLevel: readNum('similaritybuilder_best_level', 1),
      bestBridges: readNum('similaritybuilder_best_bridges', 0), bestStreak: readNum('similaritybuilder_best_streak', 0),
      coins: readNum('similaritybuilder_coins', 0), crew: Math.max(1, (readJSON('similaritybuilder_owned', ['crew']) || []).length)
    };
    var pp = {
      played: has('proportionalplates_best_served') || has('proportionalplates_stars'),
      bestServed: readNum('proportionalplates_best_served', 0), bestLevel: readNum('proportionalplates_best_level', 1),
      stars: readNum('proportionalplates_stars', 0)
    };
    var rp = {
      played: has('grapplerope_best_score'), bestScore: readNum('grapplerope_best_score', 0),
      bestCombo: readNum('grapplerope_best_combo', 0), worlds: (readJSON('grapplerope_worlds_done', []) || []).length
    };
    var gal = readJSON('areaartist_gallery', []) || [], cre = readJSON('areaartist_creations', []) || [];
    var aa = {
      played: gal.length > 0 || cre.length > 0, pictures: gal.length, creations: cre.length,
      monet: gal.filter(function (e) { return e.m === 'h'; }).length,
      firstTry: gal.filter(function (e) { return e.n && e.ft === e.n; }).length
    };
    var ps = {
      played: has('penaltyshootout_games'), games: readNum('penaltyshootout_games', 0), best: readNum('penaltyshootout_best', 0),
      goals: readNum('penaltyshootout_goals_total', 0), perfect: readNum('penaltyshootout_perfect', 0),
      allRight: readNum('penaltyshootout_allright', 0)
    };
    var games = [
      { key: 'lgttp', folder: 'lets-get-to-the-point', icon: '🎯', name: "Let's Get to the Point", played: lg.played,
        best: lg.hsGenius > 0 || lg.hsGeometry > 0, coins: lg.coins, rows: [
          ['Coins', lg.coins], ['Current streak', lg.streak], ['Skins owned', lg.skins + ' / 12'],
          ['Best time (Genius in Training)', lg.hsGenius > 0 ? secs(lg.hsGenius) : '—'],
          ['Best time (Geometry Genius)', lg.hsGeometry > 0 ? secs(lg.hsGeometry) : '—'],
          ['Genius in Training finished', lg.geniusRuns + (lg.geniusRuns === 1 ? ' time' : ' times')]] },
      { key: 'exprace', folder: 'exponent-racer', icon: '🏎️', name: 'Exponent Racer', played: er.played,
        best: false, coins: er.coins, rows: [
          ['Coins', er.coins], ['Items unlocked', er.items], ['Hard mode', er.hardMode ? 'Unlocked' : 'Locked']] },
      { key: 'laser', folder: 'laser-heist-angle-breaker', icon: '🔦', name: 'Laser Heist', played: lh.played,
        best: lh.highScore > 0, coins: 0, rows: [
          ['High score', lh.highScore], ['Best streak', lh.bestStreak], ['Skins unlocked', lh.skins + ' / 5']] },
      { key: 'piggy', folder: 'piggy-bank-math', icon: '🐷', name: 'Piggy Bank Math', played: pb.played,
        best: pb.bestEasy !== null || pb.bestHard !== null, coins: 0, rows: [
          ['Best time (Penny Prospect)', secs(pb.bestEasy)], ['Best time (Coin Captain)', secs(pb.bestHard)]] },
      { key: 'bridge', folder: 'similarity-builder', icon: '🌉', name: 'Similarity Builder', played: sb.played,
        best: sb.bestMeters > 0, coins: sb.coins, rows: [
          ['Best distance', sb.bestMeters + ' m'], ['Highest level', sb.bestLevel + ' / 4'], ['Most bridges in a run', sb.bestBridges],
          ['Best streak', sb.bestStreak], ['Coins', sb.coins], ['Crew hired', sb.crew + ' / ' + BRIDGE_CREW_TOTAL]] },
      { key: 'plates', folder: 'proportional-plates', icon: '🍳', name: 'Proportional Plates', played: pp.played,
        best: pp.bestServed > 0, coins: 0, rows: [
          ['Best shift', pp.bestServed + ' orders'], ['Highest level', pp.bestLevel + ' / 5'], ['Stars', pp.stars]] },
      { key: 'artist', folder: 'area-artist', icon: '🎨', name: 'Area Artist', played: aa.played,
        best: aa.firstTry > 0, coins: 0, rows: [
          ['Masterpieces painted', aa.pictures], ['Multiplication Monet masterpieces', aa.monet],
          ['Perfect pictures (every piece right the first time)', aa.firstTry], ['Creations in the studio', aa.creations]] },
      { key: 'rope', folder: 'pythagorean-platforms', icon: '🧗', name: 'Pythagorean Platforms', played: rp.played,
        best: rp.bestScore > 0, coins: 0, rows: [
          ['Best score', rp.bestScore], ['Best combo', 'x' + rp.bestCombo], ['Worlds finished', rp.worlds + ' / 5']] },
      { key: 'penalty', folder: 'rooted-to-the-spot', icon: '⚽', name: 'Rooted to the Spot', played: ps.played,
        best: ps.best > 0, coins: 0, rows: [
          ['Shootouts played', ps.games], ['Best shootout', ps.best + ' / 5 goals'], ['Total goals', ps.goals],
          ['Every question right', ps.allRight + (ps.allRight === 1 ? ' shootout' : ' shootouts')]] }
    ];
    var played = games.filter(function (g) { return g.played; }).length;
    var coinsAll = lg.coins + er.coins + sb.coins;
    // badges: each belongs to one game, or to all games ('all')
    var badges = [
      { game: 'all', icon: '🎮', name: 'First Steps', desc: 'Play any game once', earned: played >= 1 },
      { game: 'all', icon: '🕹️', name: 'Multi-Gamer', desc: 'Save progress in 2+ games', earned: played >= 2 },
      { game: 'all', icon: '🏆', name: 'Completionist', desc: 'Save progress in all ' + games.length + ' tracked games', earned: played >= games.length },
      { game: 'all', icon: '⏱️', name: 'Personal Best', desc: 'Record a best time or high score', earned: games.some(function (g) { return g.best; }) },
      { game: 'all', icon: '🪙', name: 'Coin Collector', desc: 'Earn 20+ coins in total', earned: coinsAll >= 20 },
      { game: 'lgttp', icon: '🔥', name: 'Streak Starter', desc: 'Reach a streak of 3', earned: lg.streak >= 3 },
      { game: 'lgttp', icon: '🌟', name: 'Streak Master', desc: 'Reach a streak of 10', earned: lg.streak >= 10 },
      { game: 'lgttp', icon: '🎨', name: 'Style Icon', desc: 'Own 3+ skins', earned: lg.skins >= 3 },
      { game: 'lgttp', icon: '📐', name: 'Point Master', desc: 'Set a best time in Genius or Geometry mode', earned: lg.hsGenius > 0 || lg.hsGeometry > 0 },
      { game: 'exprace', icon: '🧠', name: 'Hard Mode Hero', desc: 'Unlock Hard Mode', earned: er.hardMode },
      { game: 'laser', icon: '💎', name: 'Laser Legend', desc: 'Unlock 3+ laser skins', earned: lh.skins >= 3 },
      { game: 'piggy', icon: '🐷', name: 'Penny Pincher', desc: 'Set a best time', earned: pb.bestEasy !== null || pb.bestHard !== null },
      { game: 'bridge', icon: '🌉', name: 'First Bridge', desc: 'Play a run', earned: sb.played },
      { game: 'bridge', icon: '🏃', name: 'Marathon Runner', desc: 'Run 300+ meters in one run', earned: sb.bestMeters >= 300 },
      { game: 'bridge', icon: '📏', name: 'Scale Master', desc: 'Reach level 4', earned: sb.bestLevel >= 4 },
      { game: 'bridge', icon: '👷', name: 'Crew Boss', desc: 'Hire 3+ crew members', earned: sb.crew >= 3 },
      { game: 'bridge', icon: '🏗️', name: 'Full Crew', desc: 'Hire all 40 crew looks', earned: sb.crew >= BRIDGE_CREW_TOTAL },
      { game: 'plates', icon: '🍳', name: 'Order Up!', desc: 'Play a shift', earned: pp.played },
      { game: 'plates', icon: '🍽️', name: 'Head Chef', desc: 'Serve 15+ orders in one shift', earned: pp.bestServed >= 15 },
      { game: 'plates', icon: '⭐', name: 'Five-Star Diner', desc: 'Reach level 5', earned: pp.bestLevel >= 5 },
      { game: 'artist', icon: '🖼️', name: 'First Masterpiece', desc: 'Finish a picture', earned: aa.pictures >= 1 },
      { game: 'artist', icon: '🎨', name: 'Gallery Opening', desc: 'Finish 10 pictures', earned: aa.pictures >= 10 },
      { game: 'artist', icon: '🌸', name: 'Monet Master', desc: 'Finish a Multiplication Monet picture', earned: aa.monet >= 1 },
      { game: 'artist', icon: '💯', name: 'Perfect Picture', desc: 'Get every piece of a picture right the first time', earned: aa.firstTry >= 1 },
      { game: 'artist', icon: '🧑‍🎨', name: 'Studio Artist', desc: 'Save a creation in the art studio', earned: aa.creations >= 1 },
      { game: 'rope', icon: '🧗', name: 'First Swing', desc: 'Finish a world', earned: rp.worlds >= 1 },
      { game: 'rope', icon: '🔥', name: 'Swing Streak', desc: 'Get a combo of 15+', earned: rp.bestCombo >= 15 },
      { game: 'rope', icon: '🛕', name: 'Temple Explorer', desc: 'Finish all 5 worlds', earned: rp.worlds >= 5 },
      { game: 'penalty', icon: '⚽', name: 'First Kick', desc: 'Finish a shootout', earned: ps.games >= 1 },
      { game: 'penalty', icon: '🎩', name: 'Hat Trick', desc: 'Score 3+ goals in one shootout', earned: ps.best >= 3 },
      { game: 'penalty', icon: '🧠', name: 'Sharp Shooter', desc: 'Answer every question right in a shootout', earned: ps.allRight >= 1 },
      { game: 'penalty', icon: '🏆', name: 'Perfect Shootout', desc: 'Score all 5 goals', earned: ps.perfect >= 1 },
      { game: 'penalty', icon: '⭐', name: 'Goal Machine', desc: 'Score 25 goals in total', earned: ps.goals >= 25 }
    ];
    var totals = {
      played: played, games: games.length,
      badges: badges.filter(function (b) { return b.earned; }).length, badgesTotal: badges.length,
      coins: coinsAll, records: games.filter(function (g) { return g.best; }).length
    };
    return { games: games, badges: badges, totals: totals };
  }

  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  function badgesHTML(list) {
    return '<div class="ss-badges">' + list.map(function (b) {
      return '<div class="ss-badge ' + (b.earned ? 'earned' : 'locked') + '"><div class="ss-bicon">' + b.icon + '</div>' +
        '<div class="ss-bname">' + esc(b.name) + '</div><div class="ss-bdesc">' + esc(b.desc) + '</div></div>';
    }).join('') + '</div>';
  }
  // one game's card: its stats, then its badges. prefix = how to reach the site root from this page ('' or '../')
  function gameHTML(data, key, prefix, withPlay) {
    var g = data.games.filter(function (x) { return x.key === key; })[0];
    if (!g) return '';
    var mine = data.badges.filter(function (b) { return b.game === key; });
    var earned = mine.filter(function (b) { return b.earned; }).length;
    return '<section class="ss-game" id="stats-' + g.key + '"><h3><span>' + g.icon + '</span> ' + esc(g.name) + '</h3>' +
      (g.played ? '<div class="ss-rows">' + g.rows.map(function (r) {
        return '<div class="ss-row"><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>';
      }).join('') + '</div>' : '<p class="ss-empty">No progress saved yet - play a round and it shows up here.</p>') +
      (mine.length ? '<div class="ss-sub">Badges &middot; ' + earned + ' of ' + mine.length + ' earned</div>' + badgesHTML(mine) : '') +
      (withPlay ? '<a class="ss-play" href="' + prefix + g.folder + '/">Play &rarr;</a>' : '') + '</section>';
  }
  function totalsHTML(data) {
    var t = data.totals;
    var tile = function (n, label) { return '<div class="ss-tile"><b>' + n + '</b><span>' + label + '</span></div>'; };
    return '<div class="ss-tiles">' + tile(t.played + ' / ' + t.games, 'Games played') + tile(t.badges + ' / ' + t.badgesTotal, 'Badges earned') +
      tile(t.coins, 'Coins earned') + tile(t.records + ' / ' + t.games, 'Games with a best score or time') + '</div>';
  }

  // shared look for both places
  var css = [
    '.ss-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:0 0 18px}',
    '.ss-tile{background:#1b1e27;border:1px solid rgba(91,140,255,.35);border-radius:14px;padding:14px 12px;text-align:center}',
    '.ss-tile b{display:block;font-size:26px;color:#f2f3f7}.ss-tile span{font-size:12.5px;color:#9aa0ae}',
    '.ss-badges{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}',
    '.ss-badge{background:#1b1e27;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:10px 8px;text-align:center}',
    '.ss-badge.earned{border-color:rgba(62,161,88,.6);background:linear-gradient(180deg,rgba(62,161,88,.12),#1b1e27 60%)}',
    '.ss-badge.locked{opacity:.4;filter:grayscale(.6)}',
    '.ss-bicon{font-size:26px;line-height:1;margin-bottom:6px}.ss-bname{font-weight:700;font-size:12.5px;color:#f2f3f7;margin-bottom:3px}',
    '.ss-bdesc{font-size:11px;color:#9aa0ae;line-height:1.35}',
    '.ss-game{background:#151821;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px 18px}',
    '.ss-game h3{margin:0 0 10px;font-size:17px;color:#f2f3f7;display:flex;gap:8px;align-items:center}',
    '.ss-rows{margin-bottom:12px}.ss-row{display:flex;justify-content:space-between;gap:12px;font-size:13.5px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06)}',
    '.ss-row:last-child{border-bottom:0}.ss-row span{color:#9aa0ae}.ss-row b{color:#f2f3f7}',
    '.ss-empty{color:#9aa0ae;font-size:13px;font-style:italic;margin:0 0 12px}',
    '.ss-sub{font-size:12px;font-weight:700;color:#9aa0ae;text-transform:uppercase;letter-spacing:.05em;margin:4px 0 8px}',
    '.ss-play{display:inline-block;margin-top:12px;font-size:13px;color:#5b8cff;text-decoration:none}.ss-play:hover{text-decoration:underline}',
    '.ss-all{display:inline-block;margin-top:14px;font-weight:700;font-size:13px;color:#5b8cff;text-decoration:none}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  // which game a page belongs to, from its folder name
  function keyForPage() {
    var m = location.pathname.match(/\/([a-z0-9-]+)\/[^\/]*$/);
    var folder = m ? m[1] : '';
    var g = read().games.filter(function (x) { return x.folder === folder; })[0];
    return g ? g.key : null;
  }

  window.SiteStats = { read: read, gameHTML: gameHTML, badgesHTML: badgesHTML, totalsHTML: totalsHTML, keyForPage: keyForPage };
})();
