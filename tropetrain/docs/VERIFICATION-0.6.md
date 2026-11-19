# Recorded reference and source comparison · v0.6.0

November 19, 2026. The full reconstruction remains incomplete. A reusable recording is now available separately from the original instrumental practice engine. No independent historical melody/phonetic profile or synthesized singing was added.

## Source and automated evidence

**50 automated checks pass.** They include unchanged hashes for all 231,178 original demo events across the complete Torah, raw source-sign preservation, original MP3/timing checksums, source excerpt comparison, both Hebrew editions, original editorial codes, occurrence-aware/discontinuous reference intervals, source-word boundary lookup, invalid/source-changed coverage rejection, Stop while metadata loads, stopped asynchronous play promises, repeat transitions and recovery after audio errors. The standalone MP3 is compared byte-for-byte with the distributed original.

The original recording and timings have identical Git blobs in the 2012 and current PocketTorah trees. The downloaded MP3 plain SHA-1 also matches the original Internet Archive audio metadata. License evidence comes from the creator’s announcement (2.5 for creative content) and the directly linked Archive collection (3.0 for audio). Complete source/version/hash/rights scope is in RECORDING-SOURCES.json and assets/references/NOTICE.txt. No PocketTorah application code is imported.

The source excerpt test caught XML formatting whitespace introduced inside a mixed-content word by ElementTree.indent; that formatting step was removed. XML editorial x codes are stored separately from Hebrew. Of 469 aligned positions, 458 display strings match UXLC, ten differ only by combining grapheme joiners and one has a different accent. Neither edition is overwritten or silently normalized. Original WLC source tokens retain morphological slashes.

## Normal UI checks

In-app browser, all actual playback at zero volume. No acoustic review is claimed.

| Check | Observed result |
| --- | --- |
| Startup/restore | Saved reading restored after wrapping native animation-frame calls to preserve their browser receiver. Full library and recorded-reference controls initialized. |
| Opening word | Genesis 1:1 word 1 played from source start 2.028362 s; media duration 449.515 s. Automatic stop observed at 3.354841 s versus supplied next-word boundary 3.351900 s. |
| Source disagreement | Genesis 1:11 word 5 showed WLC דֶּ֔שֶׁא in the recording panel and unchanged UXLC דֶּ֗שֶׁא in the reader. Span warning identified the disagreement. |
| Parallel view | Switching to side-by-side preserved reference playback and highlighted corresponding pointed/consonantal source-linked words. Recorded WLC word stayed separate. |
| Independent controls | Reference volume 0→1→0 did not alter instrument volume 0; no audio was playing during that change. +1 key change stopped reference playback and left MP3 source, 55 BPM and personal reference settings intact. The recorded take is not transposed. |
| Unsupported range | Deuteronomy 6:4 disabled Play reference span with an explicit coverage message. No fallback sound or guessed alignment. |
| Assigned occurrences | Last word of one Genesis 1:1 section plus first word of a duplicate section produced two reference intervals. Playback jumped from the first occurrence to the second and finished correctly. Distinct occurrence IDs were observed. |
| Repeat/Stop | Repeat continued through those jumps; the second occurrence was highlighted. Escape stopped reference audio and removed all active reference classes. |
| Standalone/end | Embedded MP3 initialized over HTTP without external audio requests. Genesis 2:3 word 16 played from 445.298362 s and finished at actual media end, 449.515 s. |
| Mutual exclusion | Starting instrumental Play paused the reference. Starting reference playback stopped demo transport and cleared demo note highlights. Stop reference stopped everything. |
| Responsive layout | At 320 and 390 pixels, body width matched viewport; at 320 the reference panel stayed within 286 pixels. Temporary viewport override reset. |
| Browser diagnostics | No captured warnings/errors after the startup correction. Both volumes left at zero, all playback stopped. |

## Limits

The source describes Avery–Binder style. Individual reader attribution for this file is not established; the original project credits multiple readers. File identity, source description and reuse license are separate from musical review. No pitch, syllable or phoneme transcription was inferred. The recording retains its original key, tempo and pronunciation, with separate volume; independent synthetic settings apply to the demo engine.

Source word starts have not been independently reviewed acoustically. Browser media stopping follows animation frames/native media events, not sample-accurate editing; short clips can include breaths or contextual sound. No sample-accurate boundary claim is made. A comparison warning does not establish that a recording realizes the UXLC accent at a differing source position.

Only Genesis 1:1–2:3 is integrated in this release. The full requested musical/pronunciation roster, reusable synthesis voices, reviewed transcriptions and remaining feature inventory are pending. Direct file-origin UI, offline network-failure recovery, screen-reader review, assignment file dialogs, notation-app import and printing remain pending.

## Published verification

Commit `cdd933c5e9ddd6e036bee04e117c3e9f37dfcb7b`; GitHub Pages run `44534366849` succeeded. Ten live assets matched tested bytes: page, versioned bundle/CSS, standalone HTML, service worker, player module, original MP3, attribution notice, alignment JSON and WLC source excerpt.

The returning v0.5 tab upgraded to v0.6, restored Numbers 35:5 and mute settings, and retained the full five-book library. Opening recorded word played from source time and stopped at 3.352635 s; decoded duration was 449.515 s. The live WLC/UXLC disagreement at Genesis 1:11 word 5 was displayed and its reference segment started at the supplied source position. Stop worked. At 1280 pixels, body and viewport widths matched and the full reference panel fit without overlap. Temporary override reset. No captured warnings/errors. Both volumes left at zero and all playback stopped. Task proof: outputs/TropeTrain-recording-0.6.png.
