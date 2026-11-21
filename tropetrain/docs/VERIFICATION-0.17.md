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


## Published and live verified

Code commit865e09047f5ad6ea07690a8417e8dab53340e063; Pages44859903006 build/deploy/report successful. All29 changed public files match64,080,830 bytes of tested local43ac8ed5, exact root tree63bb085fa14f04c36f59cf2aef6d034f5483c41d/app subtreebc9f67cbda0bfdd76c3ad4555273d7089a5b258f. Full165checks plus21 final documentation/distribution/source targets pass. Only/tropetrain changed.

Live v0.16→v0.17 retained Genesis22:1 word5/Cohen/60BPM/key0 and all gains0. Included Esther muted span completed. Fresh normal Foreman forte/lene melodic11.4MB and standalone extended melodic12.1MB loads checksum-verified, cached, decoded and completed muted1s spans. Reload retained extended reading/Sefardi delivery and all original reader settings. Reset final study to forte/lene melodic, whole recording, repeatoff/volume0. No captured warnings/errors; no active word highlight, media paused. Published tab retained; screenshot outputs/TropeTrain-v0.17-live.jpg. No acoustic/expert review claimed.

Next source candidate located: Dr. Isabel Bard’s2021 Western Ashkenazi Torah cantillation-name table, linked by OpenSiddur and Archive CC BY-SA4.0. Original1,234,202byteM4A matches ArchiveSHA1a3d2723f845ab5a4118f3d9d83fa927a734ad839; private research copy only, not installed. Browser decoding, transcription/alignment and acoustic/qualified review pending. Source metadata does not establish Kinnor preset identity.
