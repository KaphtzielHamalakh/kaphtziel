# Evidence map and reconstruction roadmap

Research date: November 18, 2026. Brief: Rabbi Ben Newman’s supplied `TropeTrainer-Reconstruction.md`, read in full. Its embedded prompt was treated as reference material; implementation scope and publishing authorization came from the user’s chat request. The initial workspace was empty. The requested domain was traced through the connected GitHub account to `KaphtzielHamalakh/kaphtziel`, which has `CNAME: kaphtziel.com`, static HTML subdirectories and no applicable AGENTS.md. This implementation preserves those conventions.

## Evidence levels

The [2011 V5 manual transcription](https://doczz.net/doc/4581174/to-read-the-tropetrainer-v5-installation-and-user-s), pp. 44–52, was directly checked for display modes, Accent and Voice settings, half-step pitch controls, separate melody choice, and playback boundaries. It documents shift-selected spans, repeat, double-click word playback and a Melody Help menu for the active reading type. These establish historical interface behavior, not the pitches of a melody.

All six Accent labels in the brief are present: Ashkenazi Traditional, Ashkenazi Modern, Sephardi, Sephardi Traditional, U.S. Sephardi and Galician. The label evidence does not supply a full pronunciation grammar. Litvak/Lithuanian remains unverified. The preserved 6.0.428 archive now supplies 79 definition labels, including 32 Torah entries, in ORIGINAL-CATALOG.json. These are data-file observations, not yet running-menu observations or a claim that this archive is the final issued build. No historical music has been transcribed or reader-reviewed here, and none of these labels appears as an available sound preset.

The source distinctions and further historical claims below follow the supplied brief; those other references have not all been independently audited in this milestone. A modern product’s recordings or menus are not evidence of Kinnor V6.

## What exists now

| Behavior | Implemented now | Fidelity or evidence still needed |
| --- | --- | --- |
| Marked Hebrew | Complete Torah corpus: five books, 187 chapters, 5,853 source verse records and 79,985 reading words; exact source strings and canonical IDs | UXLC edition attribution is verified; this does not claim it was Kinnor’s electronic edition |
| Reading views | Pointed, consonantal, parallel with consonantal on the left | Print font, responsive lines; neither authentic STaM shapes nor a verified scroll layout |
| Playback | Word, major group, verse, assigned section, arbitrary inclusive span and cursor-to-reading end; repeat and double-click | Major groups use selected disjunctive signs and verse ends; the full contextual cantillation hierarchy remains pending |
| Alignment | All Torah words link to source-preserving manual or automatic draft syllables and demo events; 1,895 words explicitly unresolved | Syllabification, stress, sheva and furtive pataḥ need expert review; phoneme fields intentionally null |
| Melody | Original demonstration 01, revision 1, CC0 | Newly composed fixture; not a traditional melody and not a reproduction of Kinnor |
| Sound | Web Audio triangle oscillators; exact scheduled start/end times | No singer, no DECtalk recreation, no ordinary speech presented as chant; piano timbre remains pending |
| Pitch and speed | Independent integer semitone shift and BPM; advisory comfort range | Range guide does not modify pitch. No historical Voice presets are claimed |
| Notes | Ribbon, inspectable event table, JSON export from the playback sequence | Conventional staff engraving and reviewed sung underlay remain pending |
| Practice state | Local preferences, eight recent readings, named ordered Torah sections, jump/hide and versioned assignment JSON | Calendar/triennial selection and haftarah/Megillah content remain pending; file-dialog UI checks remain pending |

## Reusable materials and revisions

- Hebrew: [Unicode/XML Leningrad Codex](https://www.tanach.us/Books/Genesis.xml), UXLC 2.6, build 27.7 (October 2026), retrieved November 18, 2026. [Terms](https://www.tanach.us/License.html) permit viewing and copying biblical Hebrew without restriction. This is UXLC, not a claim to distribute the WLC edition. `passage.js` records the full source-file SHA-256, metadata and exact words; `genesis-1-1-3.xml` preserves the excerpt’s word structure. XML formatting was regenerated; word text was not normalized. No Tanach.us interface, stylesheets or nontext material were copied.
- Font: unmodified Noto Serif Hebrew variable font from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/notoserifhebrew), retrieved November 18, 2026; SIL Open Font License 1.1 in `assets/OFL.txt`. No external font request is needed at runtime.
- Music: `original-demo-01`, revision 1, composed expressly for this project, dedicated under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Its pitches and timing are test material. `music.js` contains the motif, syllable fixtures and derivation. Concluding practice groups use an invented three-note fall; it is not an etnaḥta or sof-pasuq realization.
- Syllable analysis: [havarotjs 0.25.5](https://github.com/charlesLoder/havarotjs), MIT; full notice in assets/havarotjs-LICENSE.txt and embedded distribution. Analyzer normalization never overwrites source strings. All inferred syllables remain unreviewed.
- Pronunciation: no active profile. Roman labels and stress are draft annotations, not a supported community preset. Range guidance, transposition and tempo are separate fields. Exported JSON retains their independent values.
- Application code is new for this reconstruction. No proprietary recordings, scores, engine assets or Kinnor binaries are distributed or executed by the app. The preserved V6 archive was inspected as a historical research reference; factual definition labels and hashes are recorded separately.

## Evidence to replace the demonstration

Supply a recording of **Genesis 1:1–3**, with permission to reuse/distribute it and a named reader, date, reading type, melody attribution and pronunciation. It should include both ordinary phrase cadences and a clearly specified passage-ending cadence. A matched syllable-aligned score or annotated transcription must state pitches (or relative intervals plus reference key), rhythms, stress, melismas and rests. A qualified reader familiar with the claimed tradition should review the transcription, syllabification, contextual phrasing and exceptions. Record disagreements and reviewer/date per motif; a recording alone does not establish every rule.

For singing synthesis, obtain reusable sung phonemes/syllables or a singing voice with explicit usage rights, plus reviewed mappings for sheva na/naḥ, qamats qatan/gadol, gutturals, stress, maqaf, furtive pataḥ and contextual joins. Test pronunciation independently from melody and transposition. Do not promote a historical menu name to a musical preset on label evidence alone.

For desktop catalog recovery, record version and edition; capture Melody menus and Melody Help separately for ordinary and High Holiday Torah, haftarah, Esther, Eikhah, Ruth, Shir HaShirim and Kohelet. Capture Accent separately. Each record needs exact label, reading type, version, source, attribution, motif-transcription status and musical-review status. Compare matched words/key/tempo/pronunciation. The mobile listing is a lead, not desktop verification.

## Full feature inventory retained as roadmap

The brief’s complete inventory remains in scope after this milestone. Order prioritizes musical correctness and playback, then tutor assignments, then teaching tools and outputs.

| Stage / area | Remaining deliverable | Fidelity check / evidence status |
| --- | --- | --- |
| 2 · Hebrew and singing | Review syllables and stress; pronounced/silent sheva, qamats distinctions, maqaf and joins, multiple signs, melismas, context and exceptional readings; align phonemes and sung notes | Reader-reviewed short clips, identical word IDs through sound/score/highlights; mobile vowel distinctions are leads for desktop checking |
| 3 · Repertoire | Source-attributed melody sets by reading type with motifs, stress, cadences, exceptions and reviewer status | Same text in two melodies with one pronunciation, then two pronunciations with one melody |
| 3 · Historical labels | Ashkenazic – Common (Torah), Moroccan; Binder, Rosowsky, Jacobson, British, Hungarian; Wolff/Portnoy, Avery/Binder; Avery/Binder Mod 2 (Torah), Urstein (haftarah) | Attestations reported in brief; none is a reviewed realization here. Sinai fixture: Avery/Binder Mod 2 or Urstein with U.S. Sephardi. Do not infer missing names from counts of 29/32/over 30 |
| 3 · Voices and sound | Independent pronunciation profiles; bass, baritone, tenor, alto, soprano, child ranges; speech, singing, accompanied singing and instrument modes; separate volume controls; piano | V5 supports labels/modes; recordings and mappings remain pending. Catalog’s 128 sounds requires release-specific confirmation |
| 4 · Editions/content | Assigned verses/melody in Lite; one portion and related readings in Single Parsha; Torah cycle/haftarot in Standard; five scrolls in Megillah; combined Deluxe; applicable blessings | Content manifests and rights review; Tefillah Trainer remains a separate product |
| 4 · Calendar/selection | Perpetual Hebrew calendar; date/year and Israel/Diaspora; weekday/Shabbat/festivals/special readings; doubled portions; annual and RA triennial divisions; alternate haftarot; eight recent readings/tutorials | Test a doubled portion and Israel/Diaspora divergence. Record calendar and division sources independently of music |
| 4 · Tutor assignments | Boundaries by book/chapter/verse per aliyah; named saved readings; jump/hide aliyot; haftarah up to five discontinuous sections across books; Megillah two sections | Verify ordering, missing sections and tutor-selected end-of-aliyah cadences. Assignments carry reading boundaries independently of student speed/key |
| 4 · Interchange | Export/import named assignments with melody and score-display preferences; compatible student installation workflow | Versioned portable format; distinguish V5.0.340 attachment behavior from new interchange implementation |
| 5 · Hebrew and score | Authentic sourced STaM, tikkun scroll-left layout and qualified line-break provenance; optional translation/transliteration; staff underlay in Hebrew/transliteration; adjustable panes, note navigation, haftarah size, score spacing, dalet/resh vowel placement | Trace displayed syllables to the reviewed musical events; separate scroll variation from text correctness |
| 5 · Visual analysis | Custom group colors; conjunctive/weak/strong sign overlay; exceptional-melody underlining; word reference, accent and special-rule inspector | Full hierarchy and exceptions must be reviewed. Current word inspector does not claim those rule interpretations |
| 5 · Curriculum | Torah/haftarah/Megillah tutorials and blessings; etnaḥta, sof pasuq, zakef katon groups; motifs on words and combined verses; random examples; sign recall over/under empty boxes and answer playback; Kadma chart; approximately 70-combination reference chart; find groups in assignment | Reviewed lesson fixtures and reproducible examples; no unsupported curriculum tiles in the app |
| 5 · Print/export | Selected aliyot in pointed/scroll/tikkun; translation/colors; score printing; copy/paste; portable audio using melody/key/voice/speed and optional blessings | Compare printed underlay, notes, sound and highlights. Historical iTunes export, trial sessions, upgrade and sharing rights are distinct workflows, not requirements to recreate obsolete licensing |

## Further references from the supplied brief

These are research leads, not a claim that all contents or reuse rights were verified here:

1. [Kinnor V5 Quick Start Guide](https://pdf4pro.com/cdn/tropetrainertm-kinnor-com-312d7f.pdf).
2. [Developer and collaborator interviews](https://www.inverse.com/input/features/tropetrainer-thomas-buchler-torah-software), for synthesis and history.
3. [Hebrew World period catalog](https://www.hebrewworld.com/catalog/catalog08.pdf) and [WorldCat packaging transcription](https://search.worldcat.org/title/905108583).
4. [Jeffrey Summit, Singing God’s Words, p. 227](https://www.scribd.com/document/1077709611/Singing-God-s-Words-the-Performance-of-Biblical-Chant-in-Contemporary-Judaism-Jeffrey-Summit-Z-Library), names/counts reported in brief; obtain a lawful source for further study.
5. [Farmington Valley teaching resources](https://fvjcsixthgrade.weebly.com/hebrewbnai-mitzvah-resources.html).
6. [Neil Schwartz’s V6 note](https://groups.google.com/g/leining/c/xjW1BebOB28).
7. [Preserved original iOS listing](https://tropetrainer-mobile.appstor.io/), platform-specific.
8. [Sinai Temple 2019 handbook](https://cybermitzvah.sinaitemple.org/wp-content/uploads/2018/12/BnaiMitzvahPreparationBook2019.pdf).
9. [Judaism 101](https://www.jewfaq.org/trop), independent repertoire account.
10. [Current product](https://www.tropetrainer.com/), a separate browser application, not evidence of the final Kinnor release.
