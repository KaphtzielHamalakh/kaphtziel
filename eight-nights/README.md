# The Legend of Hanukkah Hippo: The Eight Nights

An original, dependency-free Canvas adventure for kaphtziel.com. These first four playable chapters follow the opening milestones in the supplied outline (see [milestone notes](DESIGN.md)). The existing `/hanukkahhippo/` platformer remains a separate game.

## Play locally

From the repository root, run `python3 -m http.server 8000`, then visit `http://localhost:8000/eight-nights/`. Static hosting needs no build or external assets.

Move with arrows/WASD, hammer or talk with Z/Space, use your item with X, change item with C, and pause with Enter/Escape. Touch buttons provide the same actions. Enable sound explicitly. Returning from a hidden tab pauses; press Pause to resume.

Talk to Judah at the well for the mallet. Walk east twice and enter the Great Olive. Collect two keys, push the press stone east, use the shamash in the dim crossing, defeat the Bruiser for the Dreidel, and throw it north at the crystal. Shibta raises her claws before each of three lunges; strike during her rest. The basin grants one second of cover per visit. Recovering the first flame adds a heart and brightens all eight grove screens.

## Included / next milestones

Included: Judea exterior, Bubbe's interior and healing stove, eight connected grove screens, twelve Oil Press rooms, two keys and persistent locks, block and ranged-switch gates, map/compass, hammer throw at full health, directional pan, splitting slimes, ranged enemies, Shibta, first-flame ceremony, touch controls, original synthesized audio, local persistence and JSON save import/export.

This is a four-chapter preview, not the completed eight-night campaign. Nights Five–Eight, the full town/economy, 96-screen overworld, second quest and final Temple remain future work. Room layouts, boss tuning, sprite detail, lighting and sound still need human playtesting. The first block puzzle uses a single push; lighting has a readable dim tint and reveal action, rather than hidden floor collision.

`world.js` authors 16×11 rooms and their graph; `game.js` contains simulation/rendering; `style.css` handles the responsive cabinet. Original pixel sprites are drawn in code. The three-file store uses `kaphtziel-eight-nights-slots-v1`; the former `kaphtziel-eight-nights-v1` single save is retained for migration and backup. Progress survives death. Export a save before clearing browser storage.

## Validation

Run `node eight-nights/logic-check.cjs` for collision reachability, progression through both keys and puzzles, Dreidel acquisition, boss phases, flame, death recovery, save validation, and rendering branch smoke checks (mock Canvas).

For actual browser checks install Playwright externally (`npm install --no-save playwright`), start the local server above and run `node eight-nights/check.cjs`. Set `CHROMIUM_PATH` to your Chromium executable if it is not `/usr/bin/chromium`. This checks keyboard movement, progression, desktop and touch startup, reload persistence and mobile overflow; it writes local screenshots. Logic progression uses direct fixture placement to isolate systems, so it does not replace a full manual playthrough.

Authoring environment result: JavaScript syntax and logic checks passed. Chromium launch and local HTTP binding were blocked by sandbox socket restrictions, so browser, real-device audio/touch and visual checks remain outstanding.

## Night Two: The Latke Furnace

From the first grove east of Judea, take the southern exit to the Frying Flats, then travel east twice to the smoking flue. This route is open before Night One is complete. The furnace adds fourteen rooms, a second map and compass, two keys, two griddle crossings, Jelly Bombs, a cracked flue, the three ovens, the hollow cook and Ketev Meriri.

Place bombs with X while equipped; the fuse lasts 1.5 seconds and the blast can hurt the hero. Bomb the cracked flue to open the west exit. Use A at the ovens in left, right, middle order. Bomb the central, forward-facing statue to open the next stair. Ketev rolls and bounces, then exposes its eye and breathes fire; three bomb hits during that opening defeat it. The griddle darkens, glows in warning, then heats. Keep to the safe edges.

The bomb supply chest refills an entirely empty bag without charge so a missed boss attempt cannot permanently exhaust the chapter's ammunition. The baker in the Flats sells four for twenty gelt. This free refill is a preview-specific concession to the limited economy. First-chapter saves migrate automatically; both nights can be completed in either order. The second flame restores the Flats and gives one additional heart.

Run `node eight-nights/night-two-check.cjs` for the first chapter regression suite plus bomb fuses, both puzzle gates, oven order, ammunition recovery, Ketev's phases/immunities, both boss completion orders, heat damage and old-save migration. Browser checks remain unverified under the socket restrictions described above.

## Mobile viewport and audio

Touch devices use a compact header and a play area sized to the small viewport (`svh`), with safe-area space reserved for the home indicator. The canvas scales within the available area; the controller row stays with it. Landscape puts controls beside the playfield. Information below the game remains scrollable.

Audio is opt-in. The Sound tap requests an iOS playback audio session where supported, resumes Web Audio and starts a one-sample buffer inside the gesture. Later game input recovers suspended/interrupted audio. The button shows a retry label until the context is running. Music continues in the inventory. Run `node eight-nights/mobile-check.cjs` for mocked audio activation/recovery checks; physical iPhone speaker routing and Safari toolbar sizing still need device confirmation.

## Input and room-exit regression sweep

Touch input is tracked per pointer, with global release/cancel handling and capture-loss recovery. iOS selection and long-press callouts are suppressed only on the controller. Sliding off an arrow releases it; sliding onto another arrow changes direction. Keyboard and touch sources remain independent. Pausing, dialogue, page hiding and orientation changes clear held inputs. Holding A repeats the hammer at its normal cooldown.

Puzzle shutters block only the forward exit; the oil-channel room keeps its south exit available and the crystal room keeps its east/west routes available. Locked key doors and combat shutters retain their existing rules. Visible bars mark unsolved puzzle shutters. Turning cannot snap the hero into a wall, doorway approaches guide him between the jambs, and loading a position inside an obstacle moves him to the nearest valid spot without resetting progress.

Run `node eight-nights/input-room-check.cjs` for 780 physical doorway approaches, 131,768 collision-safe turns, unsolved-puzzle retreats, saved-position repair, oil-channel escape and the touch/keyboard release scenarios. These are simulation/event-fixture checks, not physical Safari validation.

## Three named adventures and graphics

The file screen offers exactly three local saves. Register a name (up to twelve characters) and choose a blue, green or gold tunic using the screen keyboard or normal typing. Each file has independent health, items, coins, maps, puzzle/door state and flames. Save slots returns to this screen. Rename keeps progress; Erase requires confirmation and affects only the chosen file. Exports include the hero name; importing asks before replacing the active file and never chooses a different file.

The original single-save key is retained as a backup. On the first visit, a valid original save is copied to File 1 and asks for a name. Erasing a file does not resurrect the legacy save. Names and tunics persist across reloads. Saves are local to the browser/device; export to move one elsewhere.

`art.js` draws original shaded pixel tiles, beveled teal/amber dungeon masonry, textured ground, trees, object shadows, tunic sprites, bitmap lettering and the HUD. The 256×256 frame reserves 64 pixels for the hero name, room map, coin/key/bomb counts, framed B/A item icons, hearts and recovered lights. Game collisions and the 16×11 room geometry remain unchanged.

Run `node eight-nights/profiles-check.cjs` for legacy migration, required names, three-file isolation, switching, color persistence, renaming, erasure, reload and shaded/HUD render checks. Existing progression, input and audio suites also run. Canvas artwork has been rendered with a real Canvas implementation and visually inspected; physical Safari and browser UI confirmation remain outstanding.

## Monster return delay

Non-boss encounters keep a per-file snapshot of surviving monsters for three minutes after a kill. Leaving and returning, reloading, and changing save files do not immediately restore defeated monsters. Partially damaged survivors and splitting-slime children are included. The timer uses wall-clock time; an expired screen repopulates on its next entry. Cleared dungeon combat rooms and defeated bosses remain permanently cleared. Each save file has independent encounter memory.

## Music

`music.js` contains a new slow arrangement of the traditional public-domain *Maoz Tzur* melody, with original triangle-wave bass, arpeggios and a quieter counterline. Town/overworld tempos are 72/76 BPM, dungeons 68 BPM, and bosses use a faster 104 BPM variation. Sustained lead notes replace the old eight-note loop. Minor coloring, scene changes and Belial's dimmed town vary the arrangement. The accompaniment aims for a classic adventure-game feel without quoting a commercial game's melody. Existing mobile playback activation, interruption recovery and the Sound control remain in place. Scheduling uses a bounded Web Audio look-ahead and stops active voices on mute.

## Night Three: The Sunken Mikveh

Take the south exit from Judea, then travel east twice to the stilt hut. Sixteen rooms include three keys, map/compass, low/high/low valves, a bridge Bruiser guarding the Snorkel, a submerged drain, current, mirrored pool switches and a dim pool. With the Snorkel the hero walks on water bottoms and is protected from surface arms; weapons can only be used from dry ground. The river west of Judea is then crossable, even before Shabriri is defeated.

Shabriri's arms sweep around the pool. Break each arm (the Dreidel stuns), then strike the exposed eye. Each eye hit shrinks the demon's name and brings back fewer arms. Six stages recover the Third Flame and brighten the marsh. Death continues at the bathhouse entrance.

## Night Four: The Gelt Mines

Cross the western river bottom with the Snorkel and head west twice to the mine entrance. Sixteen rooms include three keys, survey map/compass, a rail-junction switch, a guard holding the Strength Band, a heavy boulder, three plates, the honest scales, a dim gallery and a short cart-platform ride. Choose STRENGTH with C; X lifts a nearby rock or throws the carried one. A places carried rocks on plates. The scales use three provided brass coins, avoiding a permanent currency gate in the preview. This is a carry-and-place puzzle and a short cart transfer, rather than the outline's optional full Sokoban and scrolling cart sequences.

Azazel burrows, surfaces and throws stones. Throw a boulder while he is above ground, then hammer during the stun. At low health he rides the rails; a thrown rock stops the cart. The Fourth Flame brightens the hills and triggers Belial's visit: Judea's windows go dim. The full Lamplighter quest remains a later milestone.

## Four-night verification

Run `node eight-nights/four-nights-check.cjs` for temporary encounter persistence/expiry, splitting slimes, reloads, Snorkel river gating, both new dungeons' three-key routes, item acquisition, valve/drain/mirror/rail/boulder/plate/scale/cart mechanics, boss vulnerabilities, flames, Belial and continue/save behavior. `profiles-check.cjs` also checks that killed monsters in one file do not affect another. `music-check.cjs` verifies the longer score, instrument layers, pitch variety, bounded scheduling, interruption recovery, mute and boss arrangement. The earlier input, chapter and mobile-audio suites remain regression checks.

The campaign now contains 81 screens, including 58 dungeon rooms. Rendering has been inspected using real Canvas output. Browser UI/device sound and a complete human playthrough remain outstanding.
