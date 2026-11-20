# Repertoire integration and Hebrew dates · v0.15.0 candidate

November 20, 2026. Unpublished. Full reconstruction active and incomplete.

## Implemented candidate

The browser code now opens the complete Torah, all 21 Prophets books and all five Megillot: 31 books, 606 chapters, 15,894 source verse records and 231,615 preferred-reading words. UXLC strings, marks, editorial flags and source IDs are unchanged. The added source provenance and independent DOM audit are in REPERTOIRE-SOURCES.json and REPERTOIRE-AUDIT.json. This is text coverage, not a complete Tanakh or a traditional musical/phonetic realization.

Reading-type/book controls open Torah, haftarah and Megillah passages. Typed assignments retain up to five haftarah sections across Prophets books or two Megillah sections; Torah retains its existing 100-section software bound. Tutor sections can be named, reordered, hidden, removed and selected. Version-2 save/load/import/export and typed recent readings are wired; version-1 Torah exports remain supported. Personal tempo, key, range and volumes remain independent of assignment melody/display preferences.

A separate source-alternatives panel shows raw written/read groups on the current reader page. Written-only forms have no invented reading or playback target. Reading-only forms point to actual preferred-reading occurrences without fabricating written text. Unequal groups do not imply individual word/syllable alignment. Repeated sections keep distinct targets. Small/suspended-letter source flags receive explicit display styles; visual/scribal review is pending. Consonantal practice follows preferred reading; sourced written scroll lines are explicitly Torah-only and their saved preference survives other reading types.

Whole-Torah sign/combination searches, the 65-pattern source chart, Torah scroll layout and PocketTorah recordings continue using the original five-book corpus. No reference recording or historical melody is substituted for a new repertoire passage. The existing bounded Cohen study stays selected outside its coverage and refuses playback.

The pending v0.14 calendar/date work is integrated here. Eighteen exact source/runtime/test files were copied, its calendar HTML section and additional CSS incorporated, and the evidence/source ZIP embedded. The original v0.14 checkout remains intact as a separate backup. The date source and partial-boundary behavior are documented in HEBREW-DATE-SOURCES.json and the historical VERIFICATION-0.14.md. Its previous UI observations do not count as completed v0.15 checks.

Normal and standalone builds embed the same additional gzip corpus without a new data request. Source evidence/audit, date evidence and date source ZIP remain available after moving the standalone file. Cache version and runtime/style URLs agree on 0.15.0.

## Automated evidence

All **135 npm-run-check tests pass**, zero failures/skips: the prior 108, eight calendar/date additions, ten repertoire-foundation checks and nine integration/data/distribution checks. A final documentation-only rebuild and all 26 targeted distribution/calendar/date checks also pass. Prior full-Torah musical event hashes remain unchanged. All 151,630 added reading words preserve exact Hebrew through draft syllables and original demonstration events; 4,237 added words remain explicitly unsegmented and phonemes remain null. The Torah's existing 1,895 unresolved words remain separate.

New coverage includes exact 5/21/5 book choices; mixed/hidden type refusal; Torah-only layout guards; source-only/read-only and unequal/repeated occurrence links; reordered cross-book sections through interchange; exact extra-corpus bundling; standalone source/audit bytes; and the built gzip decoder using Web Streams, including explicit missing-capability refusal. These are code/data checks, not a normal browser session.

The first integration run passed 124/125: one distribution-test regex expected a `var` initializer, while esbuild's lazy module correctly emits a separate declaration and initializer. Corrected the test to inspect the assignment; no decoder/data change was needed. Two more checks brought the repertoire-only suite to 127/127. Integrating the existing calendar/date work brought it to 135/135. HTML parsing also found no duplicate IDs (199 normal, 201 standalone at that checkpoint). No browser layout or glyph result is inferred from these checks.

## Pending normal UI gates

CUA remains unavailable. No alternate browser automation, native Chrome inspection, file-origin bypass, speaker output or deployment occurred. All of these gates remain open:

1. Through HTTP, choose Haftarah → Isaiah 40:1–3; check book/type controls, exact marked words, page navigation, unchanged tempo/key/range/volumes and explicit unavailable-source behavior if Cohen was selected. Choose the original demonstration explicitly for a short muted playback check.
2. Open 2 Samuel 13:33 and inspect written-only `אִם־`; open Judges 20:13 and inspect read-only `בְנֵ֣י`. Written-only text must have no playback target. Genesis 30:11 must retain one written `בגד` group and both qere words. Repeat that verse in two sections and verify separate occurrence links/highlights.
3. Build manual haftarah excerpts from Hosea 14:2, Micah 7:18 and Isaiah 40:1. These are QA excerpts, not a prescribed liturgical sequence. Name/reorder/hide/show sections, save/reload, export/import and recall recent readings. Confirm five-section limit and independent personal settings. Repeat with Megillah → Esther 1:1 and 10:3 and its two-section limit. Invalid/unavailable requests must refuse without substitution.
4. Return to Torah and verify its sourced scroll preference, Zarqa's 365 whole-Torah matches and the 65-pattern source chart. Other book types must not use the Torah scroll layout. Recorded reference spans must remain unavailable outside their actual mapped Torah words; separately selected complete recordings retain their own visible title/source.
5. Complete the v0.14 date gates in this combined build: final partial boundary-month labels; 577-date evidence/source links; exact service-day opening; Adar I/II invalid-day/edited-year refusal; Purim's three Torah sections and ErevPurim reference-only record; Israel/Diaspora and annual/triennial cases.
6. Repeat key checks in the HTTP standalone, inspect source links, and check expanded controls/source alternatives at widths 320/390/1280. Confirm short muted Play/Stop/replay/natural completion and saved reading/settings after reload. File-origin/Save dialogs, positive-gain acoustic and independent musical/phonetic/scribal review remain separate pending checks.
7. Only after passing local UI gates, publish through connected GitHub tools, verify Pages and exact deployed bytes, and test returning v0.13 state and new settings. Restore Genesis 22:1/Cohen/60BPM/key0/both gains0, stop playback and reset any viewport override. Stop an owned preview server at teardown.

The full 79-label historical repertoire, 32 ordinary Torah systems, six pronunciation grammars/voices, singing, reviewed syllables/contextual hierarchy, wider liturgical/RA-table validation, blessings, curriculum, print and the complete RESEARCH.md roadmap remain unfinished. No new historical sound preset is advertised as playable.
