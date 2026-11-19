# Score and portable instrumental exports · v0.4.0

November 19, 2026. Full reconstruction remains incomplete. No traditional melody, singing voice or pronunciation realization was added.

## Automated and independent checks

`npm run check`: **35 passing checks**, including the full-corpus invariants from v0.3. The new checks verify every semitone spelling, exact original-demo rhythm values, staff/source identity through transposition, lyric/melisma mapping, source variants and repeated occurrences in score metadata, decoded MIDI pitches/onsets/note-offs/tempo/UTF-8 lyrics, and explicit rejection of conflicting timing.

Actual waveform rendering is exercised using development-only web-audio-engine 0.13.4. Tests measure a 440 Hz reference and +1-semitone pitch, exact PCM frame counts, independent duration, actual zero-volume silence, correct clipping, pre-start and between-batch cancellation. A 70-note export rendered in separate batches matches one-context rendering within 0.0001 normalized amplitude. This verifies the instrumental demo, not community chanting.

The opening 83-note / 67-syllable MusicXML fixture passed official W3C MusicXML 4.0 XSD validation with lxml. Raw schemas came from `w3c/musicxml` tag `v4.0`; formatted web listings are not directly valid XSD.

## Normal browser flow

Used the in-app browser. Instrumental playback/preview checks used digital silence; a nonzero-volume WAV was rendered without playing it.

| Check | Evidence |
| --- | --- |
| Staff rendering | Numbers 27:5 displayed treble clef, all accidentals, pitches, original 0.6/0.9/0.5 beat durations and exact Hebrew underlay. |
| Paging/melisma | Page 13–14 continued the final syllable from page 1–12; Hebrew context remained available. |
| Keyboard navigation | Enter on a staff note selected Numbers 27:5 word 6 and its source inspector. |
| Independent controls | +1 semitone changed every visible pitch with text/durations fixed; 40 BPM changed three final notes to 2.25 seconds. |
| Prepared files | MusicXML, MIDI and WAV Save links appeared with filenames carrying source start ID, BPM and semitone shift. |
| Stale snapshot handling | Key and volume changes paused/cleared preview and removed prepared file links. |
| Audio preview | Browser metadata reported 6.642857 seconds for the zero-volume 14-note export; native Play worked and Stop paused it. |
| Nonzero audio | Created a three-note, 2.25-second WAV at volume 50% without playing it; returned volume to 0%. |
| Cancellation | Opened Genesis 1:1–2:3, 469 words / 1,368 events, at 40 BPM. Estimate 1,327.95 seconds / 55.85 MB. Create WAV followed by Cancel produced “Audio export cancelled”; controls recovered. |
| Responsive layout | At 390 and 320 pixels, body width matched viewport. At 320, the 402-pixel score was confined to a 286-pixel scroll container. Temporary override reset. Desktop 1280 pixels also had no body overflow. |
| Restore | Reload restored the source passage/cursor and personal settings; single-range form now matches the restored book and references. |
| Standalone | Complete self-contained HTML initialized the 469-word passage, staff and embedded font; no captured warnings/errors. File-URL tool policy still prevents direct file-origin observation. |

## Captured browser exports

Browser-generated files were saved through documented media/file download controls and inspected independently, not reconstructed from source for this check.

- `tropetrain-num-27-5-6-40bpm-1st.musicxml`: official 4.0 XSD valid. Three notes with source ID `num-27-5-6`, exact source יְהוָֽה׃, tempo 40, transpose +1, MIDI pitches 66/65/63.
- Matching `.mid`: three note-ons at ticks 0/2400/4800, 4,800 ticks per beat; 1,500,000 microseconds per quarter = 40 BPM.
- Matching `.wav`, generated at 50% volume: 99,270 bytes, mono 16-bit PCM, 22,050 Hz, 49,613 samples = 2.250022676 seconds. Measured pitches 370.021/349.245/311.105 Hz, each within 1 Hz of the requested MIDI pitches. Peak 0.078735, no output-device playback used.

Browser file-capture calls succeeded but were very slow despite requested timeouts; avoid repeating them for routine checks. Raw artifacts remain in Downloads and copies are in task outputs/review-0.4.

## Remaining limits

Live v0.4 publication/upgrade verification is pending at this checkpoint. Independent notation-app import, printed output, screen reader and another physical device are not verified. MIDI timbre and UTF-8 Hebrew display depend on the receiving application; WAV preserves this application’s instrument. MusicXML/MIDI resolution is explicit; the current score exporter rejects noninteger MIDI pitches rather than silently rounding them. Staff spelling is an equal-tempered demo spelling, not a tradition’s reviewed enharmonic/tuning analysis.

WAV batches bound working float buffers; the resulting file still needs memory proportional to its encoded size. The RIFF file-size limit is enforced. No singing, blessings, reviewed transliteration, historical melody rules, or community pronunciation is implemented. Assignment file-dialog flows, offline network-failure recovery and the rest of the full roadmap remain pending.

## Published verification

Release commit `6f06ee6a76d1476accf234e680cabfb69ba591dc`; GitHub Pages run `44466529434` succeeded. Seven live assets matched source bytes. The returning live tab displayed v0.4.0 and staff, prepared MusicXML and a silent WAV for Deuteronomy 6:4 word 1, with browser duration 1.071429 seconds and no captured warnings/errors. Audio stopped, volume 0. Screenshot: outputs/TropeTrain-score-0.4.png.

A separate existing source-analysis defect was identified in Genesis 1:7 word 2: U+05AE is omitted from the inspector’s accent names. Raw Hebrew, alignment and demo event preservation are unaffected, but sign interpretation is incomplete. This is the next accuracy task, not a verified complete hierarchy.
