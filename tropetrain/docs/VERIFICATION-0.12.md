# Written scroll lines and source identities · v0.12.0

November 20, 2026. Full reconstruction remains active and incomplete.

## Source audit

Pinned tikkun.io MIT source commit57ba104e8de055cf92d3cf6aa91245bd92b34d60. All 248 selected files match original Git-blob hashes. Source pack631859 bytes/SHA25666496d896fe1fa78695b0041e1d1874d5b841727f2dbab450924559c36254b50. Original unchanged ShlomoStam.ttf153568 bytes/SHA2560fac9f72fde2efc182ae6723930823b159813574cd1c3a2f5b05f44ed7a2299e; author README and font nameID13 supply OFL1.1. Complete copyright/license notices, reserved names and byte hashes are preserved.

All 79,985 preferred reading IDs are covered. Derived written letters exactly reproduce every UXLC w/k letter in order. All original source strings/marks, k/q identities, variants and editorial notes remain unchanged. There are 132 explicit edition-difference groups:125 spelling groups and seven word-division groups. Source has 10,292 rows, 70 two-cell poetry rows and 405 rows with paragraph fragments; unusual row counts are retained. Four source-enlarged letters remain mapped, with no others inferred. Raw source data and audit remain inspectable. Widths are approximate; no manuscript, kosher-scroll or Kinnor-layout equivalence is claimed.

## Automated checks

Initial 99 full checks passed. Normal UI then exposed a missing ketiv link on the second consecutive qere and a misleading single-word class on shared written units. Both were corrected; another 99 full checks passed. The final `npm run check` passes all 100 checks, including real font-glyph coverage for every Hebrew letter/final form and exact mapping of all four source-enlarged letters. Existing full-corpus event hashes and all prior playback/export/source checks remain unchanged.

## Normal UI checks

All gains stayed 0; these are timing/highlight checks, not acoustic review. The browser could not attach a new preview tab; the existing IABtab1 was navigated to local HTTP, retaining production preferences in their separate origin storage. Button Space activation worked; Enter did not activate some toggle buttons, so its unchanged state was not counted as a pass.

- Genesis22:1 showed source column22 lines8–9 with the original source/span/tempo/key/mutes intact.
- Genesis30:11 writtenבגד selected qere words3–4. Loop3 showed the written unit active for the second qere alongside pointedגָ֑ד. Stop cleared highlights; the second qere inspector retained writtenבגד.
- Playing just qere word4 while switching to consonantal kept the exact one-word span and ended at word4.
- Numbers12:9 displayedויחר / אף as two layout pieces sharing one UXLC reading ID; both highlighted, and playback ended at word1.
- Genesis14:17 writtenכדרלעמר selected UXLC words9–10. Genesis8:20 preserved writtenהטהורה and pointedהַטְּהוֹרָ֗ה while the inspector explicitly showed layoutהטהרה.
- Exodus15:1 retained its three-fragment/two-fragment poetry rows; Deuteronomy32:1 retained two source cells.
- At320,390 and1280 pixels, body/root widths matched viewport width. Wide source rows overflow only their own pane.
- A local QA assignment saved the scroll/parallel display choice; restoring it retained the separate musical source and personal tempo.

Browser screenshot capture failed. An independent Pillow specimen displayed the original font’s Hebrew/final-form glyphs and crowns; it was not a browser screenshot and used reversed plain Hebrew because RAQM was unavailable. Qualified scribal review and browser glyph/spacing visual review remain pending. No captured warnings/errors during these checks. Final rebuilt HTTP standalone preserved the scroll preference and embedded source-record/ZIP links. Genesis30:11 shared written-unit playback completed at word4; Stop/replay/Escape passed. All four enlarged letters were checked in the actual UI: Leviticus11:42 ו, Numbers27:5 ן and Deuteronomy6:4 ע/ד. Reload restored scroll/parallel and separate personal tempo. Native Return submitted passage forms after a fresh accessibility snapshot; batched submissions that did not change the passage were not counted. Restored full Genesis22:1, Cohen source,60BPM/key0, both gains0, no active highlights, viewport reset. Publication and live-returning verification are next. Full traditional melody grammars, six pronunciations, singing and all remaining roadmap requirements are unfinished.


## Publication and live browser

Code commit `b9fa77266200a06024a8610516e5198bfadce394`; [Pages run44784787546](https://github.com/KaphtzielHamalakh/kaphtziel/actions/runs/44784787546) succeeded. All28 changed release resources match tested bytes (26,193,887bytes). Returning v0.11→v0.12 retained Genesis22:1 word5, Cohen source,60BPM/key0/both zero gains. Side by side and Sourced scroll lines showed columns22:8–9; muted source playback naturally ended atword5. Stop left active0, source/key/tempo unchanged and no captured warnings/errors. Screenshot capture unavailable; no release screenshot claimed. A read-only font-list DOM probe was unsupported, so it adds no font-load/visual evidence. Exact original font bytes/glyph mappings remain independently tested; browser spacing and qualified scribal review stay pending.
