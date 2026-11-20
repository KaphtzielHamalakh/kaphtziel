# Repertoire foundation — unpublished

November 20, 2026. This is working code and data on `codex/tropetrain-repertoire`, based on the published v0.13 records commit `3788302e329d1b157d2dde0cf99f61b3bb5b7c1e`. At this foundation checkpoint, the normal browser UI was not wired to this addition. The later v0.15 candidate integrates it; see VERIFICATION-0.15.md for current status and pending UI gates. The full reconstruction remains active and incomplete.

The separate main checkout has the v0.14 Hebrew-date work, with 116 code checks passing and specific normal UI gates pending. Browser control tools were removed during that verification. Keep the two workstreams separate until their changes can be integrated and checked through the normal interface; do not publish either as fully verified.

## Source coverage

Added the complete text of 21 Prophets books and all five Megillot: 26 books, 419 chapters, 10,041 source verse records, 152,382 w/k/q tokens and 1,673 source markers. Preferred reading has 151,630 w/q words. These are this edition's record counts, not a universal verse-numbering claim. Alongside the five unchanged Torah books, the data layer can reach 31 books. It is not a complete Tanakh. Psalms, Job, Proverbs and the other unlisted books are not imported here.

The primary [UXLC license](https://www.tanach.us/License.html) identifies UXLC 2.6/build 27.7 and permits copying biblical Hebrew without restriction. The [XML documentation](https://www.tanach.us/Pages/XMLFiles.html) identifies the whole-book files, index and ZIP. All 26 directly retrieved XML files exactly match the current publisher ZIP. The five Torah XML files in that ZIP also match the existing Torah manifest hashes. The edited publisher checksum log lacks an entry for this current release: the recorded ZIP SHA256 is a local pin, not a matched publisher checksum. Exact URLs, sizes, hashes and this limitation are in `REPERTOIRE-SOURCES.json`.

Only regenerated biblical Hebrew and factual source metadata/encodings are included. The original XML/TEI headers, ZIP, publisher interface, stylesheets and other site materials stay outside the published app. No Kinnor program or musical assets are imported.

## Implemented core

`getRepertoireCorpus()` lazily adds the new books while leaving `getCorpus()` and its whole-Torah search/chart/layout/reference scope unchanged. Exact marked strings, source token IDs, source editorial notes, boundaries, markers, section order and repeated occurrence IDs survive. Suspended/small letters retain their source flags.

`writtenReadingGroups()` retains eight written-only, nine reading-only and fourteen unequal written/read groups in the added books. These are contiguous XML alternatives; they are not reviewed word/syllable alignments. No missing counterpart is fabricated. Raw tokens remain available independently.

Version-2 assignment functions support typed Torah, haftarah (up to five ordered sections across Prophets books) and Megillah (up to two ordered sections). Legacy version-1 Torah assignments remain readable. Unsupported book/type combinations, duplicate section IDs, all-hidden assignments and unknown musical/phonetic requests are refused. Melody/display preferences remain independent of personal tempo, transposition, volume and comfort range. A saved bounded musical source is retained even when it has no coverage; playback then refuses rather than supplying notes from another source.

## Verification

- All 118 tests pass on the isolated v0.13-based branch: the prior 108 plus ten new repertoire checks, with zero failures/skips. This count does not include the separate eight v0.14 additions.
- A separate minidom source audit confirms every one of 152,382 exact raw token strings/IDs and 1,673 marker positions against the private XML. Import uses ElementTree. Hashes/counts are in `REPERTOIRE-AUDIT.json`; `scripts/verify-repertoire-source.py --source-dir ...` reproduces it.
- Reimport is byte-deterministic across 28 generated files (26 books, manifest and data module). Original Torah files, runtime code and distribution builds remain unchanged.
- All 151,630 preferred reading words keep their exact marked text through draft syllables and original demonstration events; 4,237 words remain explicitly unsegmented. Phonemes remain null. Key and tempo changes preserve Hebrew/IDs. These are digital invariants, not expert linguistic or musical approval.
- The bounded Cohen Genesis 22:1 study produces no events for Isaiah and refuses playback. The Torah reference library likewise refuses an uncovered Isaiah word. No historical preset or singing voice is added.

The first focused test run passed eight and failed two test-harness checks: an exact floating-point timing comparison, and an attempt to use a browser-relative data loader in Node. Corrected to numeric tolerance and the existing packed reference data; application runtime needed no change. The final focused ten and complete 118 pass.

## Next work and limits

Wire a repertoire/reading-type selector and versioned assignments into the app, keep Torah-only search/chart/calendar/reference scope explicit, and provide a truthful written/read view for k-only/q-only and unequal groups. Do not apply the Torah scroll layout to Prophets/Megillot. Connect attributed haftarah variants and Megillah references only after exact source/edition/partial-verse boundaries are represented and checked. Embed the extra text in both normal and standalone builds and verify offline distribution.

Then verify normal UI opening, paging, repeated sections, save/reload/import/export, source refusal, silent playback, all existing personal settings, responsive fit and return-state behavior. Integrate with the pending v0.14 work, complete its recorded UI gates, and publish through the established GitHub workflow only after those checks. CUA is currently unavailable; no alternate browser automation was used and no normal UI result is claimed for this foundation.

All 32 recovered ordinary Torah melody systems, other historical repertoire, six pronunciation grammars/voices, singing, reviewed syllables/contextual hierarchy, full calendar/divisions/tutor/curriculum/print and the complete `RESEARCH.md` roadmap remain active. Text coverage does not establish any musical realization, historical software edition or congregational reading choice.
