# Source combinations and example lookup · v0.10.0

November 19, 2026. Full reconstruction remains active and incomplete. This release adds source-context lookup, not a traditional melodic realization or the historical Kinnor combination chart.

## Primary evidence and structural audit

Wickes 1887 printed pp. 9 and 12 were visually checked in the primary scan. Page 12 describes maqaf and positional repetition; an earlier OCR page-location assumption of p. 14 was corrected against the scan. The new code preserves source strings and every original sign position, groups maqaf words, and folds only recognized repeated positional signs within one word for derived search. It does not infer stress or apply editorial emendations. Numeric source classes do not establish a full hierarchy. CONTEXT-SOURCES.json records hash/version/rights and limits.

SOURCE-CONTEXT-AUDIT.json covers all 79,985 preferred reading words. There are 68,511 source units, 67,966 qualified units and 545 excluded units; 11,073 units contain maqaf joins, 936 positional repeats are grouped, and 43,669 complete C*→D runs yield 65 distinct suffix patterns. Exclusion reasons can overlap. Unqualified words remain in the reader and raw sign inspector. Catalogue count is edition-derived and is not Kinnor’s approximately 70-entry teaching chart.

83 automated checks pass, including all preexisting full-Torah demo event hashes. New fixtures exercise maqaf joins, positional repeats, separate Zarqa helper, exact offsets, within/across-word combinations, qere/written preservation, ambiguous context barriers, verse/section boundaries, repeated occurrence IDs and full preferred-word coverage. Independently requested common/rare pattern searches agree with generated catalogue counts. No test establishes musical, stress or reader review.

## Normal UI and standalone

All audio remained muted at 0%; no acoustic review is claimed.

- Genesis 22:1 Munaḥ→Zakef found three source matches: words 3–4, word 5, words 9–10. The one-word example selects unchanged source ID gen-22-1-5, retains the Cohen source, shows its six notes and ends at word 5. The first observation wait ended before playback; inspection of the same playback confirmed natural completion and no active highlights.
- Entire-Torah Yeraḥ-ben-yomo→Qarnei-fara found exactly Numbers 35:5 words 7–8. Choose random example selected it without sound. Source identity, 55 BPM, +1 key and zero volumes remained unchanged. Cohen playback stayed explicitly disabled outside its coverage; no fallback source was selected.
- The longer Munaḥ→Yeraḥ-ben-yomo→Qarnei-fara query selects Numbers 35:5 words 4–8, including three maqaf-linked words. Switching to side-by-side preserves the five IDs in both columns.
- Chart reports 65 patterns, 20 per page; next page displays 21–40 with changed pattern rows. It states source-derived status and historical/musical limits.
- Standalone initialized the full corpus and chart at 390 pixels and reproduced the rare lookup/random selection. Genesis 1:21 paseq showed explicit context/exclusion while retaining its raw word. Genesis 1:2 repeated Pashta remained two original rows at encoded positions 3 and 7 and one derived search sign.
- Body/root widths matched 320 and 390 viewports with new panels open. Mobile glyph row spacing was improved after visual inspection; final recheck recorded below. Temporary viewport reset.

File-origin, broad device/network-failure/accessibility checks, independent linguistic and musical review, every traditional melody, six pronunciation profiles, singer and the rest of the roadmap remain pending. Existing major practice groups, syllables and note pitches/timing are unchanged.

## Publication

Final small-markup build passes all 83 checks. Duplicate assigned sections show separate section 1/2 results; selecting section 2 retained only its two occurrence IDs. Final 320-pixel chart glyph row spans 250 pixels, with body/root still 320; viewport reset. No captured warnings/errors. Connected GitHub publication, Pages confirmation and live upgrade checks are next.


Published commit `4153cb1697dcd9b3d92addafa88909d5bbd043a5`; Pages run `44597603344` succeeded. All 20 checked deployed files matched tested bytes (17,237,056 bytes), including standalone, new modules, source provenance/audit and generated runtime.

Returning live tab upgraded v0.9→v0.10 and retained Genesis 22:1 full span, Cohen source, 60 BPM, transpose 0 and both volumes 0. The new source query found all three Munaḥ/Zakef examples. Selecting word 5 retained its exact source ID and six notes; muted playback finished at word 5 with no active highlights and both media paused. No captured warnings/errors. Viewport reset; live tab retained with the source search open. Screenshot: outputs/TropeTrain-combinations-0.10.png. Full objective remains unfinished and active.
