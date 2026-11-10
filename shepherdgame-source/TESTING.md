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
