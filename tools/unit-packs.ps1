# Unit packs: one printable page per teaching unit with every worksheet and exit ticket for that unit, and all of
# their answer keys at the end. Run from site-check.ps1 (dot-sourced), which passes -Fix through: with -Fix the
# pages in units/ are rebuilt from the games' own worksheet.html and exit-ticket.html; without it, a pack that no
# longer matches its worksheets is reported. Never edit units/*.html by hand: change a game's worksheet instead.
#
# To add a unit or a game to a unit, edit $units below (and the matching unit on teachers.html).
#
# A unit can also have extra printables that aren't from a game (like station activities): put their <article
# class="sheet ..."> pages in tools/unit-extras/<slug>.html and name them in the unit's 'extra' below. They print after
# the worksheets, and their answer keys (class "key") after the other keys. tools/unit-extras/angle-relationships.html
# holds the Angle Puzzle Stations, drawn from printables/angle-puzzle-stations-with-answer-key.pdf; if that PDF
# changes, redraw the stations there too.

$units = @(
  @{ slug = 'lines-and-slope'; name = 'Lines and Slope'; grades = 'Grade 8'; std = '8.EE.B.6, 8.F.A.3'; games = @('linear-world-cup') },
  @{ slug = 'angle-relationships'; name = 'Angle Relationships'; grades = 'Grades 7-8'; std = '7.G.B.5, 8.G.A.5'; games = @('bank-shot-angle-golf', 'math-billiards', 'laser-heist-angle-breaker'); extra = 'the Angle Puzzle Stations (one landscape page per station, to print and laminate)' },
  @{ slug = 'transformations-and-similarity'; name = 'Transformations and Similarity'; grades = 'Grade 8'; std = '8.G.A.1, 8.G.A.2, 8.G.A.3, 8.G.A.4'; games = @('lets-get-to-the-point', 'transformania', 'similarity-builder') },
  @{ slug = 'pythagorean-theorem'; name = 'The Pythagorean Theorem'; grades = 'Grade 8'; std = '8.G.B.6, 8.G.B.7'; games = @('pythagorean-platforms') },
  @{ slug = 'solving-equations'; name = 'Solving Equations'; grades = 'Grades 6-8'; std = '6.EE.B.7, 7.EE.B.4a, 8.EE.C.7b'; games = @('tip-the-scales') },
  @{ slug = 'exponents-and-roots'; name = 'Exponents and Roots'; grades = 'Grades 6-8'; std = '6.EE.A.1, 8.EE.A.1, 8.EE.A.2, 8.NS.A.2'; games = @('exponent-racer', 'exponent-hoops', 'rooted-to-the-spot') },
  @{ slug = 'ratios-and-proportions'; name = 'Ratios and Proportions'; grades = 'Grades 6-7'; std = '6.RP.A.3, 7.RP.A.2'; games = @('proportional-plates') },
  @{ slug = 'coordinate-plane'; name = 'The Coordinate Plane'; grades = 'Grades 5-6'; std = '5.G.A.1, 5.G.A.2, 6.NS.C.6, 6.NS.C.8'; games = @('battle-on-the-coordinate-plane') },
  @{ slug = 'multiplication-and-area'; name = 'Multiplication and Area'; grades = 'Grade 3'; std = '3.MD.C.7, 3.OA.C.7'; games = @('area-artist') },
  @{ slug = 'money'; name = 'Money'; grades = 'Grade 2'; std = '2.MD.C.8'; games = @('piggy-bank-math') }
)

function PackEsc($s) { return $s.Replace('&', '&amp;').Replace('"', '&quot;') }
$packDir = Join-Path $root 'units'
if (-not (Test-Path $packDir)) { if ($Fix) { New-Item -ItemType Directory $packDir | Out-Null } }
$packsChanged = 0
foreach ($u in $units) {
  $sheets = New-Object System.Collections.Generic.List[string]
  $keys = New-Object System.Collections.Generic.List[string]
  $gameNames = @()
  foreach ($g in $u.games) {
    $gameNames += [regex]::Match((ReadText "$g/guide.html"), '<a class="play-btn" href="\./">&#9654; Play ([^<]+)</a>').Groups[1].Value
    # in teaching order; a game that doesn't have one of these yet just skips it
    foreach ($part in 'pre-assessment', 'notes', 'entry-ticket', 'worksheet', 'exit-ticket') {
      if (-not (Test-Path "$g/$part.html")) { continue }
      $text = ReadText "$g/$part.html"
      foreach ($m in [regex]::Matches($text, '(?s)<article class="sheet[^"]*".*?</article>')) {
        # ids are per page; in a pack each one gets its game and part in front so none repeat
        $a = [regex]::Replace($m.Value, '\b(id|aria-labelledby)="([A-Za-z0-9_-]+)"', { param($x) $x.Groups[1].Value + '="' + "$g-$part-" + $x.Groups[2].Value + '"' })
        if ($a -match '^<article class="sheet key"') { $keys.Add($a) } else { $sheets.Add($a) }
      }
    }
  }
  if ($u.extra) {
    foreach ($m in [regex]::Matches((ReadText "tools/unit-extras/$($u.slug).html"), '(?s)<article class="sheet[^"]*".*?</article>')) {
      if ($m.Value -match '^<article class="sheet[^"]*\bkey\b') { $keys.Add($m.Value) } else { $sheets.Add($m.Value) }
    }
  }
  $title = "$($u.name) Unit Pack: Worksheets and Exit Tickets, $($u.grades) (Free, Printable, with Answer Keys)"
  $list = ($gameNames | ForEach-Object { $_ }) -join ', '
  $desc = "Every free printable worksheet and exit ticket for $($u.name.ToLower()) ($($u.grades.ToLower()), CCSS $($u.std)) in one page, with all the answer keys at the end. From the games: $list."
  if ($u.extra) { $short = $u.extra -replace ' \(.*', ''; $desc = $desc.Replace(' in one page,', ", plus $short, in one page,") }
  $extraNote = if ($u.extra) { " It also has $($u.extra)." } else { "" }
  $url = "https://studentmathgames.com/units/$($u.slug)"
  $links = ($u.games | ForEach-Object { $i = [array]::IndexOf($u.games, $_); "<a href=""../$_/"">$($gameNames[$i])</a>" }) -join ' &middot; '
  $html = @"
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>$(PackEsc $title)</title>
<meta name="description" content="$(PackEsc $desc)">
<link rel="canonical" href="$url">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="../apple-touch-icon.png">
<meta name="theme-color" content="#fffaf0">
<meta property="og:title" content="$(PackEsc $title)">
<meta property="og:type" content="article">
<meta property="og:url" content="$url">
<meta property="og:image" content="https://studentmathgames.com/og/site.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="../worksheet.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4317154407082893" crossorigin="anonymous"></script>
<script data-goatcounter="https://studentmathgames.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
</head>
<body>
<!-- Made by tools/unit-packs.ps1 from each game's worksheet.html and exit-ticket.html: don't edit this file by hand. -->

<div class="toolbar">
  <a class="home" href="../">Free Online Math Games</a>
  <a href="../teachers">For teachers</a>
  <button type="button" id="print-btn">&#128424; Print or save as PDF</button>
</div>
<p class="note"><b>$($u.name) unit pack</b> ($($u.grades) &middot; CCSS $($u.std)): every printable for this unit (worksheets and exit tickets, plus pre-assessments, visual notes and entry tickets where a game has them), ready to print in one go.$extraNote The answer keys print at the end, each on its own page, so you can leave them off. To make a PDF, click Print and choose "Save as PDF." Games: $links</p>

$($sheets -join "`n`n")

$($keys -join "`n`n")

<script src="../worksheet.js"></script>
<script src="../worksheet-art.js"></script>
</body>
</html>
"@
  $html = $html -replace "`r`n", "`n"
  $file = Join-Path $packDir "$($u.slug).html"
  $old = if (Test-Path $file) { [System.IO.File]::ReadAllText($file, $utf8) } else { '' }
  # (compare without the ?v= stamps, which the Versions step adds right after this)
  if (($old -replace '\?v=[0-9a-f]{8}', '') -ne $html) {
    if ($Fix) { [System.IO.File]::WriteAllText($file, $html, $utf8); $packsChanged++ }
    else { Problem "units/$($u.slug).html: out of date with its worksheets (run with -Fix)" }
  }
}
if ($Fix -and $packsChanged) { Write-Host "Unit packs: rebuilt $packsChanged." }
