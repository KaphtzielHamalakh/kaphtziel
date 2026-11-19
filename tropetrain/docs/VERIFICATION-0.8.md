# Bounded printed-score study · v0.8.0

November 19, 2026. Full reconstruction remains unfinished. No full traditional melody system, pronunciation grammar or singing synthesis is claimed.

67 checks pass (`npm run check`). All previous full-Torah source/event integrity checks remain unchanged. New checks cover six source-record pitches/durations and exact marked underlay, refusal of uncovered or altered words, source/occurrence IDs across repeated sections, independent tempo/transposition, assignment source identity, correct export attribution and open half notes, and scan/hash/standalone integrity.

Primary source: Cohen, Jewish Encyclopedia III (1902), p. 539. Genesis 22:1 final two words; the six printed notes before the untexted coda. E4 eighth, B4 half, A4 quarter / E4 quarter, G4 half, G4 quarter. Original high-resolution scan retained unmodified (2313×1133); bytes/hash in PRINTED-SCORE.json. The article prose says Gen. xxix., inconsistent with its Hebrew/underlay; both observations are recorded. Timing is regularized; no expressive vocal reconstruction or coda attachment is inferred. Independent musical/transcription/underlay review pending.

Normal browser UI, with both volumes 0 throughout:

- Source-study button opened Genesis 22:1 and selected words 12–13. At source key/60 BPM, the displayed six notes totaled 7.50 s and playback finished at word 13.
- Word 13 alone had three notes and finished at its boundary. Repeat of the two-word span reached loop 6. Stop cleared active playback.
- +1 shifted all six MIDI pitches exactly one semitone with unchanged text/IDs/beat durations; 40 BPM preserved pitches and changed total to 11.25 s.
- Side-by-side retained both original word IDs and inclusive selection; the marked source was unchanged.
- Selecting uncovered word 1 disabled source Play and note download with an explicit coverage message. No demo notes substituted.
- MusicXML/MIDI were prepared and offered as blob downloads; a 496,170-byte, 11.25-second WAV was created and identified as silent. Download dialogs/import into notation software were not exercised.
- Standalone restored the selected source/span, embedded the exact 2313-pixel-wide scan and started muted playback with the same six notes. Tested over HTTP; direct file-origin UI remains tool-policy blocked.
- First 320-pixel layout exposed an overflowing badge; wrapped the heading/badge. Recheck: body width equaled 320/390 viewport widths; embedded scan fit. Temporary viewport overrides reset.

The eight original invalid PocketTorah timing files have matching original Android/Webbrowser/iOS blobs. Per-path history contains import/removal and no timing edit. TIMING-HISTORY.json preserves evidence; they remain complete-take only. Fixed recordings remain a separate source with original key/tempo/pronunciation.

Publication/live verification pending at this checkpoint. Full roadmap remains active.
