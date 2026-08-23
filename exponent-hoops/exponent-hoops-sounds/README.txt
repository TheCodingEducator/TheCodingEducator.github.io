Exponent Hoops plays sound effects from Code.org's own hosted sound
library (URLs like "sound://category_hits/retro_game_hit_block_3.mp3"),
which isn't reachable outside Code.org's environment.

exponent-hoops-shim.js's playSound()/stopSound() instead look for a
same-named file right in this folder (e.g.
"exponent-hoops-sounds/retro_game_hit_block_3.mp3"). If a file isn't
here, that sound just silently doesn't play - everything else keeps
working.

All files were pulled from Code.org's public sound-library API
(studio.code.org/api/v1/sound-library/<category>/<name>.mp3).

Original Code.org sounds (in-game events):

  retro_game_hit_block_3.mp3              - shot blocked by defender (2P)
  vibrant_game_positive_achievement_1.mp3 - made basket
  power_down_1.mp3                        - missed shot

Round 2 - menu/UI and Versus-mode sounds added for moments that had
none before:

  vibrant_ui_tap_1.mp3               - mode select buttons (Solo / Versus)
  perfect_clean_app_button_click.mp3 - pause menu buttons (Resume / Main Menu)
  vibrant_game_start_with_tone_hum.mp3 - 2P instructions "press to start"
  vibrant_game_achievement_2.mp3     - steal success (2P)
  Double_Whistle_SFX.mp3             - shot clock violation / turnover (2P)
  slight_negative_select_1.mp3       - defender wrong-answer lockout (2P)

Failed steal attempts were intentionally left silent (no sound chosen
for that event).
