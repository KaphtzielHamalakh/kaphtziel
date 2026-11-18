# Reconstruction progress log

## 2026-11-18 · Continuation authorized

User requested building and testing in a loop until the full app is complete, including all listed pronunciations, cantorial systems and the entire Torah. User requested durable records so interruptions do not lose progress. Active goal created for this objective. No token or time budget was specified.

Current published commit: `e27cbee71ff22322d8f868f1ce00880527b8d6ab`, at `https://kaphtziel.com/tropetrain/`. Static repository: `KaphtzielHamalakh/kaphtziel`. Checkout: this directory's parent repository, under the task workspace `work/kaphtziel`. Only milestone 1 is implemented; do not confuse its passing checks with full reconstruction completion.

Implemented baseline: Genesis 1:1–3, 27 exact UXLC words, 83 draft syllable-aligned original instrumental events; word/group/verse/span/passsage playback, repeat, independent tempo/transposition, pointed/consonantal/parallel views, local practice preferences, note inspection and JSON export. Eight automated tests passed. Normal UI checks also passed in the in-app browser, including desktop width and downloaded event equality. Historical music and singing remain unimplemented.

New discrepancy: browser inventory shows the user is viewing the downloaded milestone through a `file://` URL in Chrome, while prior successful tests used HTTP/HTTPS. Current HTML depends on ES modules, which are subject to file-origin CORS restrictions. This is a source/entry-point diagnosis, not a claim that a blocked file page was inspected. The browser tool prohibits file-URL observation. Fix the distribution to initialize from an ordinary local file and add visible startup/build status. Also make transport controls easy to discover in the narrow in-app view.

Next: (1) fix startup/distribution and verify HTTP UI, (2) import exact full Torah corpus with edition/rights metadata, (3) add passage selection and tutor assignment persistence, (4) develop reviewed Hebrew/melody/voice data pipeline and research reusable sources, (5) fill the complete roadmap. Preserve priorities in the brief: musical correctness/playback first, tutor workflow next, learning/outputs after.

Research started: official PocketTorah repository and license provenance, Charles Loder's Hebrew text libraries, JTS cantillation materials. Modern tropetrainer.com has a public modern roster but must not be used to establish Kinnor V6 menus or to copy its music. The user's access to original V5/V6 Melody Help, reusable recordings/scores and a qualified reviewer was requested asynchronously; software work continues independently.

Do not mark a tradition or pronunciation playable on name evidence alone. The complete final desktop roster is not yet verified. Record absent source/review rather than inventing realization or filling missing names from modern menus.

## 2026-11-18 · Original program archive located

User does not have original software or a reviewer and explicitly asked for an online archive search. Internet Archive catalog returned Version 3.2 (2005), identifier `Trope_Trainer_Kinnor_Software_Inc._Version_3.2_2005`, and an item labeled Trope Trainer 6 Deluxe, identifier `trope-trainer-6`, uploaded February 18, 2026 and dated 2017 by its uploader. Primary metadata was saved in workspace references. V6 ZIP is 107,822,672 bytes, SHA-1 `5d4917e3dc96e9321c3051f5559f7b4e192fa03c`. No reuse license is declared in the metadata. Treat these as historical references, not permission to ship proprietary recordings/data. No program, registry import or activation procedure has been run. Next inspect ZIP listing/documentation for internal version and Melody Help.

Startup fix implemented in source: classic-script bundle and a self-contained HTML distribution, startup error visibility, version label and narrow-screen transport bar. Eight baseline tests and the build pass. Browser QA and publication of this increment are still pending.
