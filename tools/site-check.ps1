# Site check: run before every push, from the site's folder:
#
#   powershell -ExecutionPolicy Bypass -File tools\site-check.ps1          # report only
#   powershell -ExecutionPolicy Bypass -File tools\site-check.ps1 -Fix     # also update the ?v= versions
#
# 1. Versions. Every page's local <script src> and stylesheet <link href> carries ?v=<first 8 characters of the file's
#    SHA-256>. A file that changes gets a new version automatically, so browsers never pair a new page with an old cached
#    script (or the other way round). -Fix rewrites them; without -Fix, any out-of-date version is reported.
#
# 2. The checklist every game must meet (each game's look and feel stays its own - this only checks the shared parts):
#    - a teacher guide, a worksheet and an exit ticket (guide.html, worksheet.html, exit-ticket.html)
#    - Spanish (<html data-langs="en es">)
#    - the shared site files: site-lang.js, site-keyboard.js, site-layout.js, site-layout.css, site-fullscreen.js
#    - no copy of its own of the fullscreen code (it comes from site-fullscreen.js)
#    - recorded sound files play through site-sound.js (no "new Audio(" in the game's own scripts)
#    - on-screen joystick / number pad built with site-controls.js, and every keypad / touch button shown only on phones
#      and tablets: the strict test (hover: none) and (pointer: coarse), never a loose "either one" or "any touchscreen"
#    - the game page is the folder's index.html (studentmathgames.com/<game>/), listed on the home page and in sitemap.xml
#    - every page has a <title>
#    - public wording: "student devices" (not "Chromebook"), the teacher "designs" games (never "codes" them), no "AI"
#
# Exit code 0 = everything passed, 1 = something needs attention.
param([switch]$Fix)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$utf8 = New-Object System.Text.UTF8Encoding $false
$problems = New-Object System.Collections.Generic.List[string]
function Problem($msg) { $problems.Add($msg) | Out-Null }
function ReadText($path) { [System.IO.File]::ReadAllText((Resolve-Path $path), $utf8) }

# ---------- 0. Unit packs (built from the worksheets; see tools/unit-packs.ps1) ----------
. (Join-Path $PSScriptRoot 'unit-packs.ps1')

# ---------- 1. Versions ----------
$hashCache = @{}
function ShortHash($file) {
  if (-not $hashCache.ContainsKey($file)) { $hashCache[$file] = (Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.Substring(0, 8).ToLower() }
  return $hashCache[$file]
}
# (Google's site-verification file must stay exactly as Google made it)
$pages = Get-ChildItem -Recurse -Filter *.html | Where-Object { $_.FullName -notmatch '\\(\.git|tools)\\' -and $_.Name -notmatch '^google[0-9a-f]+\.html$' }
$pattern = '(<script\b[^>]*\bsrc="|<link\b[^>]*\brel="stylesheet"[^>]*\bhref="|<link\b[^>]*\bhref=")([^"#?]+\.(?:js|css))(\?v=[^"]*)?"'
$stamped = 0
foreach ($p in $pages) {
  $text = [System.IO.File]::ReadAllText($p.FullName, $utf8)
  $dir = $p.DirectoryName
  $new = [regex]::Replace($text, $pattern, {
    param($m)
    $url = $m.Groups[2].Value
    if ($url -match '^(https?:)?//') { return $m.Value }
    $file = [System.IO.Path]::GetFullPath((Join-Path $dir $url))
    if (-not (Test-Path -LiteralPath $file)) { Problem "$($p.FullName.Substring($root.Length + 1)): links to a missing file: $url"; return $m.Value }
    return $m.Groups[1].Value + $url + '?v=' + (ShortHash $file) + '"'
  })
  if ($new -ne $text) {
    $rel = $p.FullName.Substring($root.Length + 1)
    if ($Fix) { [System.IO.File]::WriteAllText($p.FullName, $new, $utf8); $stamped++ }
    else { Problem "${rel}: script/stylesheet versions are out of date (run with -Fix)" }
  }
}
if ($Fix) { Write-Host "Versions: updated $stamped page(s)." }

# ---------- 2. The checklist ----------
$homePage = ReadText 'index.html'
$sitemap = ReadText 'sitemap.xml'
$games = Get-ChildItem -Directory | Where-Object {
  $main = Join-Path $_.FullName 'index.html'
  (Test-Path $main) -and ((ReadText $main) -match 'id="game-canvas-slot"|class="game-frame"')
}
foreach ($g in $games) {
  $name = $g.Name
  $mainRel = "$name/index.html"
  $main = ReadText $mainRel
  foreach ($f in 'guide.html', 'worksheet.html', 'exit-ticket.html') {
    if (-not (Test-Path "$name/$f")) { Problem "${name}: no $f" }
  }
  if ($main -notmatch 'data-langs="en es"') { Problem "${name}: no Spanish (data-langs=""en es"")" }
  foreach ($s in 'site-lang.js', 'site-keyboard.js', 'site-layout.js', 'site-layout.css', 'site-fullscreen.js') {
    if ($main -notmatch [regex]::Escape("../$s")) { Problem "${name}: doesn't load ../$s" }
  }
  if ($main -match 'function toggleFullscreen') { Problem "${name}: has its own copy of the fullscreen code (use ../site-fullscreen.js)" }
  $own = Get-ChildItem $g.FullName -Filter *.js | Where-Object { $_.Name -notmatch '\.min\.js$' }
  foreach ($js in $own) {
    $t = [System.IO.File]::ReadAllText($js.FullName, $utf8)
    if ($t -match 'new Audio\(') { Problem "${name}: $($js.Name) plays sound files itself (use SiteSound from ../site-sound.js)" }
    if ($js.Name -match 'mobile-controls\.js$') {
      if ($t -notmatch 'SiteControls\.create') { Problem "${name}: $($js.Name) builds its own controls (use SiteControls from ../site-controls.js)" }
      if ($main -notmatch '\.\./site-controls\.js') { Problem "${name}: doesn't load ../site-controls.js" }
    }
    if ($t -match 'SiteSound\.' -and $main -notmatch '\.\./site-sound\.js') { Problem "${name}: uses SiteSound but doesn't load ../site-sound.js" }
    if ($t -match "\(hover: none\), \(pointer: coarse\)|'\(pointer: ?coarse\)'") { Problem "${name}: $($js.Name) uses a loose touch test (use '(hover: none) and (pointer: coarse)' so keypads only show on phones and tablets)" }
  }
  if ($main -match '@media \(hover: none\), \(pointer: coarse\)|@media \(pointer: ?coarse\)') { Problem "${name}: its page uses a loose touch test in its CSS (use '(hover: none) and (pointer: coarse)')" }
  if ($homePage -notmatch [regex]::Escape("$name/")) { Problem "${name}: not listed on the home page" }
  if ($sitemap -notmatch [regex]::Escape("/$name/")) { Problem "${name}: not in sitemap.xml" }
}

# ---------- Every page: a title, and the public wording rules ----------
foreach ($p in $pages) {
  $rel = $p.FullName.Substring($root.Length + 1)
  $text = [System.IO.File]::ReadAllText($p.FullName, $utf8)
  if ($text -notmatch '<title>[^<]+</title>') { Problem "${rel}: no <title>" }
  # only what visitors can read: drop scripts, styles and comments
  $visible = [regex]::Replace($text, '(?s)<script\b.*?</script>|<style\b.*?</style>|<!--.*?-->', ' ')
  if ($visible -match '(?i)chromebook') { Problem "${rel}: says ""Chromebook"" (say ""student devices"")" }
  if ($visible -match '(?i)\b(codes|coded|coding)\s+(the\s+|these\s+|this\s+|each\s+|every\s+)?(game|games)\b') { Problem "${rel}: says the games are coded (say ""designs"")" }
  if ($visible -cmatch '\bAI\b') { Problem "${rel}: mentions AI" }
  # search engines: every real page (not a redirect, the 404 page or Google's verification files) names itself as the
  # canonical address, in the same form the sitemap uses (/about, /game/, /game/guide), and is listed in the sitemap
  if ($text -match 'http-equiv="refresh"' -or $rel -eq '404.html' -or $rel -match '^google[0-9a-f]+\.html$') { continue }
  $path = $rel -replace '\\', '/'
  $url = 'https://studentmathgames.com/' + $(if ($path -eq 'index.html') { '' } elseif ($path -match '^(.*/)index\.html$') { $Matches[1] } else { $path -replace '\.html$', '' })
  $canon = [regex]::Match($text, '<link rel="canonical" href="([^"]*)"').Groups[1].Value
  if ($canon -ne $url) { Problem "${rel}: canonical should be $url (it is '$canon')" }
  if ($sitemap -notmatch [regex]::Escape("<loc>$url</loc>")) { Problem "${rel}: not in sitemap.xml ($url)" }
}

# ---------- Sitemap dates ----------
# Each sitemap entry's <lastmod> is the day its page last changed: today if it has changes not yet committed, otherwise
# the date of its last commit. Fresh, honest dates help search engines know which pages to crawl again.
$dirty = @{}
(git status --porcelain) | ForEach-Object { $dirty[($_.Substring(3).Trim('"') -replace '\\', '/')] = $true }
$today = (Get-Date).ToString('yyyy-MM-dd')
$newMap = [regex]::Replace($sitemap, '<loc>https://studentmathgames\.com/([^<]*)</loc>(\s*)<lastmod>[^<]*</lastmod>', {
  param($m)
  $p = $m.Groups[1].Value
  $file = if ($p -eq '') { 'index.html' } elseif ($p.EndsWith('/')) { $p + 'index.html' } else { $p + '.html' }
  $date = if ($dirty[$file]) { $today } else { (git log -1 --format=%cs -- $file) }
  if (-not $date) { $date = $today }
  return "<loc>https://studentmathgames.com/$p</loc>" + $m.Groups[2].Value + "<lastmod>$date</lastmod>"
})
if ($newMap -ne $sitemap) {
  if ($Fix) { [System.IO.File]::WriteAllText((Join-Path $root 'sitemap.xml'), $newMap, $utf8); Write-Host 'Sitemap: updated the last-changed dates.' }
  else { Problem 'sitemap.xml: some last-changed dates are out of date (run with -Fix)' }
}

# ---------- Report ----------
Write-Host ("Checked {0} games and {1} pages." -f $games.Count, $pages.Count)
if ($problems.Count -eq 0) { Write-Host 'Everything passed.'; exit 0 }
Write-Host ("{0} thing(s) need attention:" -f $problems.Count)
$problems | Sort-Object -Unique | ForEach-Object { Write-Host "  - $_" }
exit 1
