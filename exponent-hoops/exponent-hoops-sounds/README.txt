Exponent Hoops plays sound effects from Code.org's own hosted sound
library (URLs like "sound://category_hits/retro_game_hit_block_3.mp3"),
which isn't reachable outside Code.org's environment.

gamelab-shim.js's playSound()/stopSound() instead look for a same-named
file right in this folder (e.g. "sounds/retro_game_hit_block_3.mp3").
If a file isn't here, that sound just silently doesn't play - everything
else keeps working.

To restore audio, drop in your own royalty-free equivalents named exactly:

  retro_game_hit_block_3.mp3
  vibrant_game_positive_achievement_1.mp3
  power_down_1.mp3
