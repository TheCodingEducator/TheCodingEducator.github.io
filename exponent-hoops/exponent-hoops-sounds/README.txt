Exponent Hoops plays sound effects from Code.org's own hosted sound
library (URLs like "sound://category_hits/retro_game_hit_block_3.mp3"),
which isn't reachable outside Code.org's environment.

exponent-hoops-shim.js's playSound()/stopSound() instead look for a
same-named file right in this folder (e.g.
"exponent-hoops-sounds/retro_game_hit_block_3.mp3"). If a file isn't
here, that sound just silently doesn't play - everything else keeps
working.

These files were pulled from Code.org's public sound-library API
(studio.code.org/api/v1/sound-library/<category>/<name>.mp3) to match
what the original Code.org project used:

  retro_game_hit_block_3.mp3          - shot blocked by defender (2P)
  vibrant_game_positive_achievement_1.mp3 - made basket
  power_down_1.mp3                    - missed shot
