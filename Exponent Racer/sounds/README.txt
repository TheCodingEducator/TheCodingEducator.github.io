Exponent Racer plays sound effects from Code.org's own hosted sound
library (URLs like "sound://category_hits/retro_game_simple_impact_1.mp3"),
which isn't reachable outside Code.org's environment.

gamelab-shim.js's playSound()/stopSound() instead look for a same-named
file right in this folder (e.g. "sounds/retro_game_simple_impact_1.mp3").
If a file isn't here, that sound just silently doesn't play - everything
else keeps working.

To restore audio, drop in your own royalty-free equivalents named exactly:

  bounce_1.mp3
  go_male.mp3
  f1_race.mp3
  retro_game_simple_impact_1.mp3
  peaceful_win_1.mp3
  lighthearted_bonus_objective_1.mp3
  click_pop_1.mp3
  energy_bar_recharge_4.mp3
  rain_thunderstorm_calm.mp3
  formula_1_car_pass_by.mp3
  coin_1.mp3
  click.mp3
