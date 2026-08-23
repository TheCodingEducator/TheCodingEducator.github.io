Exponent Racer plays sound effects from Code.org's own hosted sound
library (URLs like "sound://category_hits/retro_game_simple_impact_1.mp3"),
which isn't reachable outside Code.org's environment.

exponent-racer-shim.js's playSound()/stopSound() instead look for a
same-named file right in this folder (e.g.
"exponent-racer-sounds/retro_game_simple_impact_1.mp3"). If a file
isn't here, that sound just silently doesn't play - everything else
keeps working.

All files were pulled from Code.org's public sound-library API
(studio.code.org/api/v1/sound-library/<category>/<name>.mp3).

Original Code.org sounds (in-race events):

  bounce_1.mp3                       - countdown beep (3, 2, 1)
  go_male.mp3                        - "GO!" voice at race start
  f1_race.mp3                        - race engine background loop
  retro_game_simple_impact_1.mp3     - crash into obstacle / wrong answer
  peaceful_win_1.mp3                 - race won (Easy mode)
  lighthearted_bonus_objective_1.mp3 - shop purchase + roadside coin pickup
  energy_bar_recharge_4.mp3          - correct answer picked
  rain_thunderstorm_calm.mp3         - storm background loop (Hard mode)
  coin_1.mp3                         - "Switch to Hard Mode" button click

Substitutes for 3 original sounds Code.org's library has since removed
(click_pop_1.mp3, click.mp3, and formula_1_car_pass_by.mp3 - the whole
"vehicles" category is gone):

  puzzle_game_ui_pop_01.mp3      - shop: equip an already-owned item
  puzzle_game_ui_pop_tiny_01.mp3 - "Continue Normal Mode" button click
  deep_pass_by_whoosh_7_fast.mp3 - win-sequence car zoom-away (layered
  deep_pass_by_whoosh_1.mp3        with the file above)

Round 2 - menu/UI sounds added for moments that had none before:

  vibrant_ui_tap_1.mp3                       - mode select buttons (start screen)
  app_tab_sound.mp3                          - shop tab switching
  puzzle_game_organic_wood_block_tone_tap_1.mp3 - skill checkbox toggle
  vibrant_game_start_with_tone_hum.mp3       - "Confirm & Start Game" button
  perfect_clean_app_button_click.mp3         - in-race MENU button (quit)
  vibrant_ui_mouse_click_1.mp3               - Game Over / Win screen buttons
  vibrant_game_life_lost_1.mp3               - running out of fuel (game over)
  puzzle_game_secret_unlock_01.mp3           - Maximum Velocity unlock popup appears
