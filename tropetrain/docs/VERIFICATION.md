# First milestone verification

Verified November 18, 2026, through the normal interface in the Codex in-app browser at `http://127.0.0.1:8765/tropetrain/`. No test hook or direct mutation of app state was used for these UI checks. DOM reads inspected the rendered event table and visible status text. Sound was stopped after verification. Musical authenticity and singing have not been verified.

## Interface checks

| Check | Action and observed result |
| --- | --- |
| First word | Clicked Genesis 1:1 word 1, selected End of word and Play. The status finished at word 1. |
| Inside a group | Clicked word 2, End of group, Play. The preview covered words 2–3; the status finished at word 3. |
| Verse boundary | Clicked word 2, End of verse, Play. The preview covered words 2–7; the status finished at word 7. |
| Final verse word | Clicked word 7, End of verse, Play. The preview covered only word 7; the status finished there. |
| Cross-group selection | Clicked word 2 and Shift-clicked word 4. Selection became words 2–4 across the etnaḥta division after word 3. |
| Repeat restart | Checked Repeat and played words 2–4. At 160 BPM the observed note/status sequence traversed words 2, 3, 4, then Loop 2 word 2. The active Hebrew element had stable ID `gen-1-1-2`. Stop ended the loop. Earlier repeats at 42 BPM also advanced through multiple cycles. |
| Transposition | Read all 8 rendered events of selected words 2–4 at transpose 0. Clicked + once. Every MIDI value rose by exactly 1; syllables, word IDs, beat positions and durations stayed identical. |
| Tempo | Used the Tempo slider through its keyboard controls to change 84 to 42 BPM. Every rendered pitch stayed fixed; displayed seconds doubled within the table’s rounding precision. |
| View preservation | While words 2–4 repeated, switched Pointed to Consonantal to Side by side. The span label stayed words 2–4; both parallel active elements had the same source word ID, with marked text retained on the pointed side. Returned to Pointed after stopping. |
| Stop | Stop cleared active playback and reported that the selection was kept. No automatic playback occurs on page load. |
| Runtime | No captured browser warnings/errors at the checked stage. The local index responded HTTP 200. |

The observed viewport was approximately 378 pixels wide. The narrow layout was visually inspected, including Hebrew marks. A separate wide desktop viewport, other browsers, screen readers and mobile devices were not independently tested. The event table verifies UI wiring; it is not an acoustic measurement of the speaker output. No qualified reader has reviewed the demonstration as chant, and it makes no tradition claim.

## Code-only checks

`node --test tropetrain/tests/*.test.mjs`: **8 passing tests**.

- All 27 source word strings equal the archived XML excerpt exactly, including repeated signs, maqaf and sof pasuq. All syllables concatenate exactly to their source word and have note-event links.
- Boundaries are inclusive and correct for first/internal/final words, both selection directions and every possible contiguous span in the passage.
- All 83 events shift by one semitone without other event changes. Halving tempo doubles exact second values with pitches, beats and text fixed.
- Consonantal transformation leaves the source objects and musical plans unchanged.
- A fake Web Audio clock verifies oscillator frequencies, absolute starts, end times at the boundary, scheduled repeat restarts and cancellation of future sources. It does not certify real speaker output or musical authenticity.
- Module syntax checks for app/service worker and Git whitespace checks passed.

Offline caching, local preference persistence, JSON download contents, touch span-end selection and comfort-range guidance are implemented but were not independently exercised end to end in the UI. The original music and draft syllabification remain explicitly labeled. The complete feature inventory and evidence needed for the next stages are in [RESEARCH.md](RESEARCH.md).
