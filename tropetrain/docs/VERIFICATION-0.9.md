# Complete printed verse and held notes · v0.9.0

November 19, 2026. Full reconstruction remains unfinished. This is a bounded instrumental transcription of one printed example; it does not implement a full traditional grammar, community pronunciation or singing voice.

## Source and automated evidence

The independent 1902 volume copy at https://archive.org/details/jewishencyclopedia03sing was downloaded in resumed segments and verified against Archive SHA-1 cbf09fe8bcf3a6349eac4c013bde04413f7b841d (75,621,345 bytes). PDF page 577 bears printed page 539; source leaf 583 differs because leaves are omitted from the PDF. Rendered with Poppler and visually compared to the preserved first scan. The small ring in the first copy’s pickup is absent from the second. Both source images remain available without retouching. The alternate is explicitly a rendered crop.

All 13 words of Genesis 22:1 have 52 printed note components, 50 sounding attacks, four eighth rests, two tied pairs and 44 quarter-note beats. Every printed bar balances: 1,4,4,3,3,3,3,3,3,3,3,4,4,3. The separate untexted coda is excluded. Exact source-letter allocation and original marked strings are retained; English source underlay is separate. Phonemes stay null. Independent transcription, Hebrew underlay, contextual musical and performance review remain pending.

73 full-suite checks pass. After the final standalone wrapping fix, distribution/source targeted checks also pass. All original full-Torah event/source integrity checks remain intact. New checks verify all 52 manually checked pitches, exact printed rhythms and bar totals, syllable/source identity, uncovered/changed-source refusal, stable six-note ending, unique occurrence/tie IDs in repeated assignments, key/speed independence, staff rest/tie/half-note rendering, MIDI’s 50 attacks and exact held/gap timing, and both scan embeddings.

The first tied phrase’s offline WAV matches a separately specified single-held-note reference byte-for-byte. Source rest samples are actual digital zero. Fake audio-clock tests verify one oscillator per tied pair, notation-component highlights through the held note, silence callbacks during rests and exact source onsets/stopping. Stop and natural completion suspend idle instrument output; subsequent Play resumes it without an extra internal suspend.

Full, raised, first-word and partial MusicXML files validate against the official 4.0 schema. Initially the validator could not fetch two remote imports; an offline copy redirects only those dependency URLs to the unchanged local schema files. No validation rules were changed. Exports preserve source bars/meters, ties and rests with 4,800 divisions, exactly supporting thirds and the demo’s fifths. Staff is derived engraving, not a facsimile.

## Normal UI evidence

Both instrument/reference volumes stayed at 0 throughout; no acoustic or qualified reader review is claimed.

- Full printed-verse button selected all 13 source words and displayed 52 events / 22.00 s at 120 BPM. Playback finished at word 13. During a printed pause, active word/note highlight counts were both zero.
- First word displayed seven printed components/one tie, ended at 1.75 s at 120 BPM, and omitted the following rest. Internal group from word 2 finished at word 4; final word alone finished at word 13. The group observation wait ended before playback; the same playback was inspected afterward and confirmed finished at word 4, without a restart.
- Selected words 4–5 cross a practice-group boundary. Repeat reached loop 16, and changing to consonantal view preserved selection/IDs and continued the loop. Stop removed highlights.
- All 52 displayed MIDI pitches rose exactly +1; Hebrew, IDs, beats and seconds were unchanged. At 40 BPM the same source pitches totaled 66.00 s.
- At 60 BPM, MusicXML/MIDI downloads were prepared and a 1,940,444-byte, 44.00-second WAV was generated, explicitly silent at 0%. File dialogs and notation-program import were not exercised.
- Opening Genesis 22:2 disabled source Play with an explicit coverage message and cleared prepared exports. Switching to the original demo re-enabled it; opening the source study recovered full coverage.
- Both scans loaded at original widths 2313 and 1285; source section fit 320/390 viewports. Temporary overrides reset.
- Standalone embedded both scans and the entire evidence map/full roadmap. First-word Stop/restart and replay after natural completion both finished correctly. New inline roadmap initially overflowed at 320; enabled wrapping and rechecked both roadmap/license sections open with body width 320.
- No captured warnings/errors. Audio stopped, zero volumes, viewport reset.

## Remaining limits

Rhythm is regularized to chosen BPM; modern 12-TET/A4=440 and triangle instrument are approximations. Source underlay and transcription are not independently reader-reviewed. No coda underlay, rules for other verses, Kinnor-equivalent preset, pronunciation grammar or singer is inferred. The previous six-note source ending keeps its pitches/durations/IDs in revision 2. Direct file-origin UI, network-failure/device/accessibility testing and the complete remaining roadmap are still pending.

Publication/live verification pending at this checkpoint.
