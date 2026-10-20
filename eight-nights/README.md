# The Legend of Hanukkah Hippo: The Eight Nights

An original, dependency-free Canvas adventure for kaphtziel.com. This first playable chapter follows the Night One milestone in the supplied outline (see [milestone notes](DESIGN.md)). The existing `/hanukkahhippo/` platformer remains a separate game.

## Play locally

From the repository root, run `python3 -m http.server 8000`, then visit `http://localhost:8000/eight-nights/`. Static hosting needs no build or external assets.

Move with arrows/WASD, hammer or talk with Z/Space, use your item with X, change item with C, and pause with Enter/Escape. Touch buttons provide the same actions. Enable sound explicitly. Returning from a hidden tab pauses; press Pause to resume.

Talk to Judah at the well for the mallet. Walk east twice and enter the Great Olive. Collect two keys, push the press stone east, use the shamash in the dim crossing, defeat the Bruiser for the Dreidel, and throw it north at the crystal. Shibta raises her claws before each of three lunges; strike during her rest. The basin grants one second of cover per visit. Recovering the first flame adds a heart and brightens all eight grove screens.

## Included / next milestones

Included: Judea exterior, Bubbe's interior and healing stove, eight connected grove screens, twelve Oil Press rooms, two keys and persistent locks, block and ranged-switch gates, map/compass, hammer throw at full health, directional pan, splitting slimes, ranged enemies, Shibta, first-flame ceremony, touch controls, original synthesized audio, local persistence and JSON save import/export.

This is a first chapter preview, not the completed eight-night campaign. Later nights, the full town/economy, 96-screen overworld, second quest and final Temple remain future work. Room layouts, boss tuning, sprite detail, lighting and sound still need human playtesting. The first block puzzle uses a single push; lighting has a readable dim tint and reveal action, rather than hidden floor collision.

`world.js` authors 16×11 rooms and their graph; `game.js` contains simulation/rendering; `style.css` handles the responsive cabinet. Original pixel sprites are drawn in code. Save data uses a separate `kaphtziel-eight-nights-v1` key and survives death. Export a save before clearing browser storage.

## Validation

Run `node eight-nights/logic-check.cjs` for collision reachability, progression through both keys and puzzles, Dreidel acquisition, boss phases, flame, death recovery, save validation, and rendering branch smoke checks (mock Canvas).

For actual browser checks install Playwright externally (`npm install --no-save playwright`), start the local server above and run `node eight-nights/check.cjs`. Set `CHROMIUM_PATH` to your Chromium executable if it is not `/usr/bin/chromium`. This checks keyboard movement, progression, desktop and touch startup, reload persistence and mobile overflow; it writes local screenshots. Logic progression uses direct fixture placement to isolate systems, so it does not replace a full manual playthrough.

Authoring environment result: JavaScript syntax and logic checks passed. Chromium launch and local HTTP binding were blocked by sandbox socket restrictions, so browser, real-device audio/touch and visual checks remain outstanding.
