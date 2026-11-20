# Related readings and source numbering · v0.16.0 candidate

November 20, 2026. Published browser-tested release; deployment verification is recorded below. Full reconstruction active and incomplete. No speaker output.

## Implemented and sourced

Calendar services now offer structured default, Sephardic, Chabad and triennial haftarah text selections plus Megillah text. These labels select passage boundaries, not melody or pronunciation presets. Every source unit/book/boundary/count is checked before its text button is enabled; citations without usable structured boundaries remain reference-only. Exact array order, numbered keys, full variant snapshots, source notes/context, service Hebrew names, response URL/hash and selected unit interval survive sharing. Source snapshots are internally checked metadata, not signed or independently refetched provider responses.

Adjacent same-book Megillah units form one contiguous tutor section; all original units remain inspectable. Discontinuous or overlapping units stay separate, with the existing five-section haftarah/two-section Megillah limits and distinct occurrence IDs. Related-only services no longer get a misleading weekday-Torah subtitle. The pending v0.15 reader/date features and entire original roadmap remain in scope.

Eight unchanged attributed Hebcal response examples are bundled, including the newly fetched June/August/October 2022 Diaspora records and promoted March 2024 Israel regression fixture. They cover all five complete scrolls, cross-book haftarot, variants and ErevPurim. `CALENDAR-RELATED-AUDIT.json` records 100 choices: 98 source-reference/count checks pass; both July 30 triennial `I Kings 9:2-9, 9:4-5a` variants remain reference-only. No partial verse is expanded, omitted or silently replaced. All uncached months still require explicit network loading; twelve loaded responses can be cached.

The primary API documentation licenses generated data under CC BY4.0 and its public type documentation identifies structured variant fields. Exact new file hashes/URLs are in CALENDAR-SOURCES.json. No provider engine code is imported.

## Numbering defect found and corrected

The initial expanded full check passed 144/145. Vaetchanan's source Deuteronomy 5:19–6:3 has 15 verses, while those same numeric UXLC coordinates cover 18 records. Further inspection showed that equal counts also permit wrong endpoints in these chapters: Shavuot source Exodus 20:15–23 needs UXLC 20:18–26. Tests were strengthened and the underlying mapping corrected; the count check was not relaxed.

The map explicitly relates Hebcal-linked Sefaria/Miqra according to the Masorah coordinates to the unchanged UXLC Exodus 20 and Deuteronomy 5 records. All 53 complete source preferred-letter sequences match the mapped 59 UXLC records. Comparison-only processing removes presentation/section markers and ketiv display, then compares preferred Hebrew letters; it does not rewrite displayed Hebrew, Unicode mark order, ketiv/qere, word IDs, syllables or events. Every boundary/target word ID and source/target hash is retained. Source verse counts and target record counts are validated separately, including ranges crossing an affected chapter without changed numeric endpoints.

`TORAH-NUMBERING-SOURCES.json` records both private comparison-response hashes, source version/license metadata, official Wikisource CC BY-SA4.0 rights metadata, primary links, method and limits. The new numeric map is under CC BY-SA4.0. No Sefaria response, English translation or site markup is distributed. Its reproduction script is `scripts/import-torah-numbering.py --source-dir ...`. The primary UXLC supplement explains nonuniform numbering, combined marks and the need for care with upper/lower systems; the map does not choose or musically realize either system.

The older pinned PocketTorah source splits its own Deuteronomy 5:21/22 at a different location inside UXLC5:24. That original source data and audio/timing metadata remain unchanged; it was not used alone to derive the map. The new comparison independently verifies source5:21→UXLC5:24 and source5:22→UXLC5:25.

Calendar selections expose original and UXLC coordinates/counts in their section details. Mapped readings label verse playback as ending at a UXLC verse record. Manual UXLC ranges remain unchanged. Legacy calendar claims intersecting the two affected chapters require reopening from the current source rather than guessing their namespace.

## Assignment and recovery behavior

Assignments containing new source snapshots or numbering maps use format v3, so older versions refuse them instead of silently dropping provenance. Ordinary typed v2 and legacy Torah v1 remain supported. Changed boundaries, ordering, counts, unsupported map revisions/editions and contradictory source claims refuse import. Personal tempo, key, range and volumes remain separate; a bounded Cohen study stays selected and unplayable outside its actual coverage.

If a saved practice reading cannot restore, its exact original serialized record is retained for review/export. Up to eight distinct recovery originals can be stored; the original primary practice key is not overwritten by the fallback view. A new explicit reading can replace current practice state. Storage failure leaves the recovery in memory and exposes export; normal UI/file-dialog verification remains pending.

## Verification

All **154 npm-run-check tests pass**, zero failures/skips. Final documentation-only rebuild and all45 targeted source/distribution/calendar/date/recovery checks pass. Four generated source/map/audit files reproduce byte-identically. Coverage includes all eight raw response hashes, 100 related choices, complete five-scroll text, cross-book ordering, source-snapshot v3 round trips/tamper refusal, repeated occurrence IDs, 53 map boundary/letter hashes, Vaetchanan/Shavuot endpoints, source/target count differences, legacy ambiguity refusal, missing/incompatible map refusal, exact embedded evidence and raw recovery preservation/dedup/quota behavior. Prior complete Torah and additional-repertoire event/text invariants pass: 231,615 reading words, 6,132 explicitly unresolved draft words, null phonemes. Source Torah JSON, musical fixtures, syllable and audio modules remain unchanged. HTML parsing found 202/204 unique IDs in normal/standalone builds at the code checkpoint; this does not establish layout or browser behavior.

The first attempt to derive a map from old reference coordinates correctly stopped on the two within-record boundary differences. The final map uses the independent licensed Hebrew comparison. The presentation parser also required explicit handling of a small paseq tag; all 53 comparisons then passed. These were source-preparation findings, not browser QA.

## Open gates

CUA remains unavailable. All v0.15 normal UI/standalone/mobile/playback/reload gates carry forward, plus:

- Bundled April16,2022 Diaspora: open default Joshua3:5–7 /5:2–6:1 /6:27, then its distinct two-section Sephardic reading. Musical source/pronunciation/key/speed/range/volumes must stay selected.
- Bundled October1 and YomKippur Mincha: verify Hosea/Micah and Jonah/Micah order, source Hebrew/context and v3 save/reload/export/import.
- Each bundled full scroll opens as one text section with every chapter unit retained; March23 ErevPurim opens Esther without inventing Torah divisions. July30 partial triennial references stay disabled and complete.
- August13 Vaetchanan annual/triennial and June5 Shavuot show both coordinate systems and correct first/last source words, without altering marks. Verify the UXLC-record playback label. Rejected old ambiguous state must remain recoverable/exportable.
- Repeat key flows in HTTP standalone, verify all source/map/license links and offline content, then responsive fit at320/390/1280, muted short playback/Stop/replay/completion and return-state behavior. File-origin, Save dialogs, acoustic and independent musical/phonetic/scribal review remain pending.
- Publish only after normal UI gates pass; verify connected GitHub/Pages/deployed bytes and a returning live session. Stop playback and any owned preview server at teardown.

All 32 ordinary Torah melodic systems, the other recovered catalog realizations, six pronunciation grammars/voices, singing, upper/lower/contextual review, broader calendar/congregational validation, blessings, curriculum, print and the full RESEARCH.md inventory remain unfinished. This is progress toward the complete app, not a completion claim.


## Normal browser release checks · November 20

Browser-client accessibility testing restored. Both HTTP entry points opened; 31-book selection, marked Hebrew/source alternatives, named/reordered/hidden cross-book sections, save/reload/recent recall, all five full sourced scrolls, ordered Hosea/Micah and Jonah/Micah, calendar variants, mapped Vaetchanan/Shavuot references, partial-verse refusal, Adar I/II invalid-day handling and Purim divisions passed. Tempo/key/mutes retained; muted demo and Cohen word completion/replay/Stop passed. Root/body fit320/390/1280; source scroll pane intentionally scrolls. 65pattern/365Zarqa regression passed. No captured warn/error. File chooser stalled; no import/export dialog success claimed.

Tested exact candidate ef13e62 through the official installed browser client and existing in-app tab. Both normal and self-contained HTTP builds share restored practice state. Full-scroll source/verse counts and correct mapped Torah endpoints were observed; no new music was supplied. Source-alternative and mobile rendering screenshot is retained in the workspace outputs. Screenshot is browser rendering evidence, not qualified glyph/scribal approval. Narrow sourced-scroll panes intentionally retain horizontal scrolling.

The older Open gates section records the earlier unavailable-CUA checkpoint. Core reading/calendar/persistence/numbering/responsive/muted-playback gates above now pass. Five-section/two-section limits, assignment tamper guards and saved-practice recovery retain automated evidence; file chooser stalled before import, export Save dialog and legacy recovery UI remain pending. Positive-gain acoustics, file origin and expert review remain pending. No critical app failure was found in tested flows.


## Published release

Code commit `263906ae277108356b3936f21f65cc5d034ee592`, GitHub Pages run `44820701429`: successful build and deployment. All91 served changed files exactly match38,122,752 tested bytes, including normal/standalone builds, all added Hebrew data, source/license records and runtime modules. `.gitignore` is a changed repository file intentionally excluded from public hosting by Jekyll; it is not a runtime asset.

Live v0.13→v0.16 retained Genesis22:1 word5/Cohen/60BPM/key0/both gains0. Isaiah40:1–3 opened with Cohen explicitly unavailable. Bundled June6 fullRuth1:1–4:22 opened85verses/1295words and retained source identity after reload; Cohen remained selected/unavailable, no substitution. No captured browser warnings/errors.

Only `/tropetrain/` changed. Rollback is the prior main commit3788302e329d1b157d2dde0cf99f61b3bb5b7c1e (v0.13), using a new leased publication commit/ref update; preserve personal practice/recovery storage. No outstanding critical runtime defect was found in tested flows. All earlier musical/phonetic/singer and remaining roadmap limitations persist.

Restored Genesis22:1 word5/Cohen/60BPM/key0/mutes. Muted live playback naturally finished atword5; Stop left activeWords0 and both gains0. Viewport reset; published tab retained. Browser screenshot outputs/TropeTrain-v0.16-live.jpg.
