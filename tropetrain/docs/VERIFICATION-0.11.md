# Printed accent patterns and device-free muted practice · v0.11.0

November 20, 2026. Full reconstruction remains incomplete and active.

## Source and event evidence

Cohen 1902 printed p. 540 row 1A (“Pentateuch / Ashkenazim,1902”) distinguishes two Munaḥ forms. Only the plain “Resting” column and adjacent Revia are transcribed: C5 quarter/B4 half/G4 quarter, then A4 dotted-quarter/G4 sixteenth/F-sharp4 sixteenth/E4 quarter/E4 eighth. Eight components total 7.5 quarter beats. Printed slurs are retained as slurs, never joins/ties; all 8 notes remain separate attacks. No complete-bar or expressive-timing interpretation is asserted for these recitative columns. Exact record and image hashes are in PRINTED-PATTERNS.json; both selected columns and the complete row are retained as unretouched Poppler crops, with scale/coordinates and pinned PDF hash. Other cells remain reference images without playable data.

Source headings name accents but do not determine complete Bible-word/syllable underlay. All word/syllable/phoneme fields in these events remain explicitly null. New untexted staff has no invented lyrics, melisma allocation or word-navigation links. Source location, MIDI pitch, duration and slur are inspectable. The main Bible melody choices remain unchanged; this is not a Kinnor preset or full tradition. Independent musical, transcription and underlay review remain pending; modern instrument, tuning and regularized timing are approximations.

## Transport and automated evidence

Initial real-time browser checks at volume 0 did not advance either the new pattern clock or preexisting main instrument clock, so they are not recorded as passes. Startup/cancellation reporting and ownership were improved. Muted instrumental practice now uses a monotonic clock without allocating an AudioContext/oscillator; a 16 ms timer advances highlights and ends/repeats. Audible playback remains audio-clock based with a bounded queue. Muting/unmuting retains musical position, including the remaining tail of a held note, without negative audio timestamps. Pending activation is generation-guarded and cancelled by Stop or a return to zero.

All 92 checks pass in the final `npm run check`, including ten audio checks for device-free notes/rests/repeat, repeated mute transitions/current-note tail, Stop during activation and return to zero during activation. The build/importers and all prior corpus, source, score, reference and export invariants pass. Existing full-corpus/demo hashes, source strings and fixed-reference timing remain unchanged.

## Normal UI evidence

All instrument/reference gains stayed0. These are silent timing/highlight checks, not acoustic or expert review.

- New panel restored55 BPM / +1 preferences and retained existing Bible source/assignment occurrence IDs. The source crop loaded at 769 pixels.
- Five-noteRevia at 160 BPM completed; full 8-note pair at 60 BPM completed and cleared highlights. Separate 3-note Munaḥ showed C5/B4/G4 and4 quarter beats.
- Every displayed MIDI pitch rose exactly 1 while duration/IDs stayedfixed. Tempo 40 preserved pitches and made the full pair11.25 seconds. Returning 60 BPM / transpose 0 restored the source pitches.
- Changing toconsonantal while pattern playback ran kept the Bible selection/source and highlighted only the pattern staff. No Bible word was falsely aligned.
- Stop/restart, loop7 andEscape passed. Bible→pattern andpattern→Bible were exclusive; the Bible firstword finished at its proper boundary in muted mode.
- Pattern→recorded-reference stopped pattern highlighting; reference→pattern paused HTMLmedia and removed source-word highlighting. FinalStop left media paused and both gains 0.
- Find source combination selected whole-Torah Munaḥ/Revia and found 1,377 matches. Selecting Genesis 1:9 words 1–2 kept the Cohen verse source selected and disabled unsupported Bible playback. No table motif was assigned automatically.

Final local and HTTP-served standalone checks passed: both source crops loaded at their exact natural dimensions (769 × 330 and 2649 × 460), all eight notes were inspectable, and the source record was embedded in the standalone. Muted playback completed, Stop/replay worked, and replay completed with no active highlights. At 320, 390 and 1280 pixels, document width matched viewport width; the score overflow stayed inside its horizontal scroll pane. Both builds captured no warnings/errors. Final Stop left both gains at 0. Publication and returning-live verification follow. Positive-gain audible browser transitions, file Save dialogs and direct file-origin UI were not tested in this iteration. Full contextual melody systems, six pronunciation grammars, singing and the complete remaining roadmap are still pending.
