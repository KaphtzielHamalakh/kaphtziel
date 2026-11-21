# TropeTrain v0.17 verification · November 20, 2026

## Scope and source evidence

Five unchanged source recordings (35,549,994 bytes) are pinned by SHA-1/SHA-256 in VOICE-STUDIES.json: Gabriel Kretzmer Seed’s Esther cantillation-name table, Open Siddur (2011), CC BY-SA4.0; Alex Foreman’s four Genesis1:1–13 readings published with Geoffrey Khan (2020), CC BY4.0. The copyright page explicitly credits Foreman’s recorded material. The primary resource list identifies two Tiberian dagesh readings, each with and without a source-labeled Sefardi melody. Later direct PDF checks returned405; the earlier primary text verification and this retrieval limitation remain recorded. No PDF transcription, independent acoustic/phonetic review or correspondence to Kinnor’s six Accent labels is claimed.

The new source-study panel separates published pronunciation reading and recorded delivery criteria. Fixed recordings retain original pitch, timing and voice. They do not add complete melody rules, singing synthesis or independently transposable recorded voice. Spoken delivery is explicitly marked without melody. No word/syllable timings, note allocation or phoneme grammar are inferred. Main Hebrew/source IDs, syllables, range, tempo, key and musical selection remain unchanged. All historical labels and the full roadmap remain in RESEARCH.md; printing follows melody/pronunciation in priority.

## Automated checks

All165 full npm-run-check checks pass,0fail/0skip, including11 meaningful new source/player checks: exact original bytes/rights, independent selector cross-product, null allocations, bounded preferences/spans, muted clock without media.play, original rate, natural completion/repeat, cancellation, loading/decode/duration errors and stale unmute promises. Existing complete Torah/repertoire/event invariants pass. An old distribution assertion initially matched the first embedded audio instead of the PocketTorah reference; anchoring to reference-audio fixed that test’s oversized binary diff/OOM. No source-audio corruption was found.

## Normal interface checks

Official in-app browser client; accessibility actions and read-only DOM verification. Both normal HTTP and self-contained HTTP builds tested. All four Foreman originals explicitly loaded, checksum-verified, decoded and cached; Seed included original decoded. Short spans played at0% using the muted clock and naturally completed. No audible output or acoustic approval is claimed.

- Dagesh reading changes preserve recorded delivery; delivery changes preserve dagesh reading. Original DOI and Spoken/Chanted label follow the selected recording.
- Seconds span .25–1.25 repeats through multiple loops. Invalid start2/end1 refuses playback. Whole-recording reset restores start0/blankend. Repeat can be turned off.
- Source Open Genesis1:1–13 opens13verses/159words and stops the recording. Main original demonstration/84BPM/key0/instrument0 remain selected. No Bible-word timing is invented.
- Study Stop, compact global Stop, Escape and main instrument Play stop the source recording. Source Play stops instrument highlights; audio element remains paused at0%.
- Reload retains source/pronunciation/delivery/span/volume0, cached availability and reader settings. Removing an optional saved source disables Play; explicit Load restores its checksum-verified copy without autoplay.
- The standalone build restores and plays a cached original. Its first prepublication optional load correctly returned404 while the publishedv0.16 did not yet contain the new asset. Live standalone first-load verification follows publication.
- Expanded source notices show the attribution, reuse license, checksum and null-alignment limits. At320/390/1280 pixels, root/body widths equal viewport; study inputs stay within their panel. Screenshot: outputs/TropeTrain-v0.17-mobile.jpg.
- No captured browser warning/error in the final local normal session. All study/instrument/reference gains remain0; viewport reset.

Hidden-tab stop is implemented and transport cancellation unit-tested, but no actual browser visibility-transition result is claimed. File-origin, import/export dialogs and legacy practice-recovery UI remain pending from v0.16. Independent acoustic, musical, phonetic and scribal review remain pending.

## Release procedure

Only /tropetrain changes. Publish tested subtree using connected GitHub tools with an expected-main lease; verify Pages build/deploy and exact public asset bytes. Test returning live state, new source selection/load/muted playback, then standalone optional first-load. Roll back on failed startup, failed original checksum/decoding or broken existing playback by publishing the prior v0.16 tree (main3722c3a7f3c3139402622b8fec27ca1ba4ec1dc6) through a new leased commit. Preserve practice/cache state.

Deployment and live verification pending at this local checkpoint. The full reconstruction remains active and incomplete: all recovered contextual melody systems, six reviewed Kinnor pronunciation grammars/voices, singing and the remaining roadmap are unfinished.
