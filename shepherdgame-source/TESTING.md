# Verification — first release

## Automated checks completed

- `npm run build`: strict TypeScript check and production Vite static build.
- `npm test`: nine tests; all 2,560 valid password states round-trip, single-cell
  corruptions reject, physics constants/variable jump/slide/water behavior,
  eight boss weaknesses, both puzzle-room reset bells and link references.
- `tests/browser.mjs` in headless Chromium: title → slots → difficulty → story →
  tutorial; keyboard movement and jumping; three-pellet cap; pause/resume;
  each realm boss's 4× weakness; Goliath armor and stone damage; all three final
  phases; Morning-song epilogue and ending transition; no JavaScript page errors.
- The same script uses Chromium mobile emulation and CDP multi-touch to hold
  movement and FIRE, then add JUMP simultaneously; movement/jump and zero page
  scroll confirmed. Landscape screenshot inspected at 844×390 CSS pixels.
- `tests/rooms.mjs`: every one of 16 main-path puzzle gates responds to sling
  shots and the eight tower gates respond to their intended power. This uses
  test-harness positioning and simulation, not complete player traversal.
- `tests/audio.mjs`: an original one-second 220 Hz sine encoded with ffmpeg as
  MP3 was intercepted as title.mp3; WebAudio decoded it and created a looping
  source. Missing realm files leave gameplay active and warn only once per ID.
  The test tone was kept outside the repository and is not shipped as music.
- Title, stage and mobile screenshots inspected for pixel scaling and control
  layout. No external art, fonts or runtime dependencies.

Browser test commands, with a local dev server running:

```
npx playwright install chromium
node tests/browser.mjs
node tests/rooms.mjs
ffmpeg -f lavfi -i 'sine=frequency=220:duration=1' -codec:a libmp3lame -q:a 8 /tmp/elah-test.mp3 -y
node tests/audio.mjs
```

The harness is enabled only by `?test` and exposes state manipulation. Normal
sessions do not expose it. These tests cover systems and transitions; they do
not establish complete manual playtesting or 60fps on all supported hardware.
Firefox and WebKit browser packages were downloaded, but their launch was
unavailable in the build environment because required system libraries were
missing. Safari/iOS is not claimed as verified.

## Manual acceptance checklist still required

- [ ] Play all of Bethlehem with keyboard, gamepad and touch, without harness.
- [ ] Zin: traverse both puzzles and defeat Ketev with sling only.
- [ ] Hermon: traverse both puzzles and defeat Shemihazah with sling only.
- [ ] Sodom: traverse both puzzles and defeat Gafrit with sling only.
- [ ] Resheph: traverse both puzzles and defeat Resheph with sling only.
- [ ] Edom: learn Morning, traverse both puzzles and defeat Lilith with sling only.
- [ ] Jaffa: traverse both puzzles and defeat Leviathan with sling only.
- [ ] Night: traverse both puzzles and defeat Agrat with sling only.
- [ ] Azazel: traverse both puzzles and defeat Azazel with sling only.
- [ ] Replay all eight alcoves with the correct powers; collect all fragments.
- [ ] Finish Elah, charging while moving/jumping and replenishing at the brook.
- [ ] Complete tower, all rematches, three-phase Ashmedai and Saul, without harness.
- [ ] Test three save slots, browser reload, reset and manual password transcription.
- [ ] Test options and remapped bindings; saved touch layout after reload.
- [ ] iPhone Safari: full playthrough, diagonals, three fingers, interruptions,
  landscape/portrait, safe areas, home-screen launch, sound unlocking.
- [ ] Android Chrome: same full playthrough and touch behavior.
- [ ] Firefox and Safari: stable frame timing on real supported devices.
- [ ] Listen to supplied tracks across loop boundaries and tune manifest padding.
- [ ] Verify all detailed spec deviations in DECISIONS.md before declaring 1:1
  implementation of the attached game specification.

## Connected-screen revision

`node tests/traversal.mjs` passes for all eight realms: walking up stairs,
climbing into the upper terrace, traversing its stairs to the gate, returning
left, descending the shaft, and crossing ordinary room boundaries in both
horizontal directions. The ascent uses simulated directional input without
teleporting between the staircase and its ladder. The return-shaft position is
set directly to isolate descent. Updated title, realm and portrait screenshots
were visually inspected. Desktop/multi-touch and puzzle/tower regression scripts
were rerun successfully. Physical phone and Firefox/Safari checks remain pending.

## Author-supplied soundtrack verification

- `node tests/uploaded-music.mjs`: all five actual MP3 files decode in Chromium;
  title and stage select reuse Main Theme #1 without restarting; all eight realm
  states load their assigned tracks and loop them, with no JavaScript page errors.
- `node tests/audio.mjs`: separately mocks unavailable files to keep verifying
  missing-track silence and one-warning behavior after the soundtrack is added.
- Original uploaded bytes are retained in both source and generated static output.
  Exact musical loop seams have not been tuned; the full tracks loop for now.

## Realm geography verification

- `npm test`: 13 tests pass, including all existing physics/password checks and
  terrain uniqueness, material/feature placement, shaft connectivity and
  tutorial/fortress isolation.
- `node tests/traversal.mjs`: 48 redesigned opening/road/gauntlet/shelter/gate/
  upper routes cross in both directions through actual game physics using
  movement, jumping and the sling, with combat damage disabled. Upper-room
  forward starts use the arrival shaft and climb normally. Shaft descent and
  lower-room ascent are separately checked from positioned test starts.
- All eight distinct shafts connect up/down; screen boundaries and the fortress
  power-gated ladder round trip still work.
- Dry shore and submerged ship-hull tests verify different jump velocities and
  correct local water detection.
- Existing puzzle-gate and eight-power tower interactions, desktop campaign and
  multitouch movement/fire/jump regression checks pass.
- All eight realm screenshots visually inspected for distinguishable foreground
  terrain, scenery, room composition and readable environmental signals.
- Full difficulty-balanced human playthroughs and physical iOS/Android tests
  remain required; geometry tests deliberately separate combat from traversal.

## Mobile fit revision

`node tests/mobile-fit.mjs` verifies six mobile viewport sizes, aspect ratio,
full-width portrait fit, full-height landscape fit, control bounds, no horizontal
page overflow, rotation, scaled menu hit targets and preserved desktop integer
scaling. Measured examples: 390×844 now shows a 390×365.6 game (previously
256×240); 844×390 shows a 416×390 game (previously 256×240). Existing desktop
and simultaneous touch movement/fire/jump regression tests also pass. Physical
safe-area devices and Safari remain manual checks.

## Ketev platform regression

`node tests/ketev-platforms.mjs` verifies a normal running jump from the floor,
a stable landing on each perch, and a sling hit from both platforms in the
first fight and rematch. The boss is held still and player damage disabled to
isolate jump, collision, standing and projectile behavior. Production build
passes with the restored platforms.

## Audio, distinct puzzles and touch display revision

- `npm test`: 22 tests cover core behavior, reciprocal realm routes, puzzle
  geometry, distinct mechanics and preserved Ketev platforms.
- `tests/reliability.mjs`: simulated MP3 503 recovers without reload; decoded
  music produces a nonzero waveform; old music continues during delayed loads;
  missing boss music falls back to uploaded music; a trusted gesture resumes a
  suspended context without restarting its source; pause volume restores.
  Saved screen sizing, Reset to Fit and Chromium touch pinch suppression pass.
- `tests/puzzle-play.mjs`: all 16 mechanisms block the forward exit until solved
  and open the correct exit afterward. Uses real projectiles, songs, timing,
  lift riding, ricochet and platform jumps, plus controlled positioning fixtures.
- `tests/realm-geography.mjs`: all 136 directed room connections and 56 non-puzzle
  room routes pass. Traversal uses real movement with damage disabled; solved
  puzzle fixtures isolate connections. This is not a full combat playthrough.
- `tests/rooms.mjs`: puzzle checks plus all eight fortress power gates pass.
- Desktop campaign, simultaneous three-finger movement/fire/jump, six mobile
  viewport fits, uploaded music assignments and Ketev perch regressions pass.

Chromium automation covers these changes. Firefox/WebKit cannot launch in this
container because required shared libraries are absent. Physical iPhone/Safari
interruption recovery, device gestures and full difficulty balance remain manual
checks; no physical-device compatibility claim is made.
