# Full Torah reader · v0.3.0 verification

November 18, 2026. This is a functional reconstruction increment, not completion of the full app. Musical traditions and singing remain unimplemented.

## Automated evidence

`npm run check`: **22 passing tests**. The build runs before tests.

- All five source books are present with 187 sequential chapters and 5,853 source verse records. Generated files match their recorded hashes. IDs are unique; ketiv/qere, editorial markers and enlarged letters remain distinct from exact Hebrew text.
- All **79,985 reading words** were passed through the reading model and note generator. Every syllable array concatenated exactly to its source string; every word had event links. **1,895 words** are explicitly marked unresolved, including divine-name spoken forms. This test proves alignment preservation, not the linguistic correctness of the inferred syllables.
- The embedded browser gzip data was decompressed in a test and compared to every original JSON book and manifest. The standalone HTML embeds the complete runtime and font without a module-loader dependency, with license notices retained.
- Range tests reach the first and final verses of every book, cross chapter boundaries, preserve section order and assign unique occurrence IDs when passages overlap while keeping canonical source IDs.
- Invalid references, backwards ranges and an all-hidden reading are rejected.
- Assignment JSON round trips preserve sections and display/musical settings independently of student tempo/transposition. Unsupported melody/pronunciation requests are rejected instead of silently replaced.
- Fake audio-clock tests cover exact scheduling/stopping, repeated starts, invalid timing, and a 10,000-event reading with bounded queued nodes even when visual frames are delayed. Source pitch/tempo/alignment invariants from the opening milestone still pass.

## Normal UI evidence

Used the Codex in-app browser with volume set to 0% before playback checks. No direct mutation of app state or hidden test hook was used; DOM reads inspected displayed results.

| Check | Observed result |
| --- | --- |
| Library loading | Five books and 187 chapters available; v0.3.0 displayed. |
| Final Torah verse | Opened Deuteronomy 34:12, 12 words. Muted first-word playback finished at word 1. |
| Multiple books | Opened Exodus 20:1–2, Leviticus 11:42, Numbers 27:5, Genesis 8:17 and Deuteronomy 6:4 through the passage form. |
| Source annotations | Enlarged vav in Leviticus 11:42, nun in Numbers 27:5, and ayin/dalet in Deuteronomy 6:4 displayed without dropping source characters. |
| Ketiv/qere | Genesis 8:17 showed qere הַיְצֵ֣א; the inspector separately retained written הוצא. |
| Cross-chapter paging | Genesis 1:31–2:10 opened as 11 verses; pages showed verses 1–8 and 9–11. |
| Span across pages | Selected Genesis 2:7 word 16 through 2:8 word 1 using Choose span end and page navigation. Consonantal and parallel views kept the span. |
| Independent controls | Every displayed event in that span rose exactly one semitone with timing/text fixed; 40 to 160 BPM quartered displayed durations with pitches fixed. |
| Assignment sections | Appended Exodus 20:1–2 after Deuteronomy 34:12. End-of-section playback preview ended at the final Deuteronomy word, not the next book. |
| Save/load | Saved “QA multi-section example.” Loading it restored both sections and kept student tempo 40 BPM and transpose +1 unchanged. |
| Visibility | Hiding the first section left the Exodus span; hiding the final visible section was rejected and the checkbox restored. |
| Invalid reference | Deuteronomy 6:99 produced a precise error and left the previous reading intact. |
| Long reading | Entire Genesis opened: 1,533 verses, 20,614 reading words, 59,539 demo note events. Reader rendered 8 verses and note table 128 rows at a time. Next-note page showed 129–256. Muted playback started and stopped cleanly. |
| Reload | Deuteronomy 6:4, its enlarged letters, key/speed and mute setting restored after the embedded library finished initializing. |
| Recent list | Eight recent readings retained. |
| Desktop | At 1280 × 900 the 922-pixel reader and 300-pixel controls fit without page overflow. Temporary viewport override reset afterwards. |
| Standalone | The self-contained HTML opened Numbers 27:5 with its source annotation, v0.3.0 and no captured warnings/errors. |

## Verification limits

The file-URL browser surface is blocked by tooling policy; the standalone artifact was checked for self-contained contents and initialized over HTTP. Native Chrome automation remains unreliable and was not used. No physical speaker output, singing, historical melody, or community pronunciation was verified. The original demo remains clearly labeled.

Assignment import/export have schema/round-trip code coverage but their browser file-dialog flows were not exercised in this pass. Browser download waits previously stalled, so this is recorded explicitly. Offline recovery with networking disabled, screen-reader use and another physical device remain pending.

## v0.3.1 upgrade regression

The initial v0.3.0 Pages deployment succeeded and index, bundle, standalone, CSS, service worker and corpus manifest matched tested bytes. The returning live browser nevertheless used an older cached unversioned script with new HTML; its library stayed disabled. Versioned runtime/style URLs and matching offline cache entries now separate releases. All 23 checks pass, including version consistency and exact standalone embedding. Local normal UI restored the full library and saved Numbers passage. Live returning-tab verification is pending publication of this patch.
