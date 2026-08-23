Exponent Racer plays sound effects from Code.org's own hosted sound
library (URLs like "sound://category_hits/retro_game_simple_impact_1.mp3"),
which isn't reachable outside Code.org's environment.

exponent-racer-shim.js's playSound()/stopSound() instead look for a
same-named file right in this folder (e.g.
"exponent-racer-sounds/retro_game_simple_impact_1.mp3"). If a file
isn't here, that sound just silently doesn't play - everything else
keeps working.

These files were pulled from Code.org's public sound-library API
(studio.code.org/api/v1/sound-library/<category>/<name>.mp3) to match
what the original Code.org project used:

  bounce_1.mp3                       - countdown beep (3, 2, 1)
  go_male.mp3                        - "GO!" voice at race start
  f1_race.mp3                        - race engine background loop
  retro_game_simple_impact_1.mp3     - crash into obstacle / wrong answer
  peaceful_win_1.mp3                 - race won (Easy mode)
  lighthearted_bonus_objective_1.mp3 - shop purchase + roadside coin pickup
  energy_bar_recharge_4.mp3          - correct answer picked
  rain_thunderstorm_calm.mp3         - storm background loop (Hard mode)
  coin_1.mp3                         - "Switch to Hard Mode" button click

Two of the original sounds (click_pop_1.mp3, click.mp3) and one
(formula_1_car_pass_by.mp3, from the "vehicles" category) were removed
from Code.org's library at some point after this project was made, so
these are close substitutes, also from Code.org's library:

  puzzle_game_ui_pop_01.mp3      - shop: equip an already-owned item
  puzzle_game_ui_pop_tiny_01.mp3 - "Continue Normal Mode" button click
  deep_pass_by_whoosh_7_fast.mp3 - win-sequence car zoom-away (layered
  deep_pass_by_whoosh_1.mp3        with the file above)
