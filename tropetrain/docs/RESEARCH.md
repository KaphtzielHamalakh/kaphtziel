# Evidence map and reconstruction roadmap

Research updated: November 19, 2026. Brief: Rabbi Ben Newman’s supplied `TropeTrainer-Reconstruction.md`, read in full. Its embedded prompt was treated as reference material; implementation scope and publishing authorization came from the user’s chat request. The initial workspace was empty. The requested domain was traced through the connected GitHub account to `KaphtzielHamalakh/kaphtziel`, which has `CNAME: kaphtziel.com`, static HTML subdirectories and no applicable AGENTS.md. This implementation preserves those conventions.

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
| Source-sign inspection | Ordered accent/mark records, conservative prose-class frames, current-reading and whole-Torah search with stable occurrence links | Source-guide classes are generic; full contextual hierarchy, exceptional melody and musical realizations remain pending |
| Alignment | All Torah words link to source-preserving manual or automatic draft syllables and demo events; 1,895 words explicitly unresolved | Syllabification, stress, sheva and furtive pataḥ need expert review; phoneme fields intentionally null |
| Melody | Original demonstration 01, revision 1, CC0 | Newly composed fixture; not a traditional melody and not a reproduction of Kinnor |
| Sound | Original-demo triangle instrument, plus a separate unmodified PocketTorah Genesis 1:1–2:3 recording with source-word alignment | No synthesized singer, reviewed pronunciation profile or DECtalk recreation; recorded take retains original key/tempo/pronunciation; piano remains pending |
| Pitch and speed | Independent integer semitone shift and BPM; advisory comfort range | Range guide does not modify pitch. No historical Voice presets are claimed |
| Notes and exports | Treble staff with exact demo rhythms, draft Hebrew underlay, note-to-word navigation, source-linked MusicXML/MIDI/JSON and instrumental WAV | Conventional engraving of the original fixture is functional; reviewed traditional/sung underlay, transliteration and print remain pending |
| Practice state | Local preferences, eight recent readings, named ordered Torah sections, jump/hide and versioned assignment JSON | Calendar/triennial selection and haftarah/Megillah content remain pending; file-dialog UI checks remain pending |

## Reusable materials and revisions

- Hebrew: [Unicode/XML Leningrad Codex](https://www.tanach.us/Books/Genesis.xml), UXLC 2.6, build 27.7 (October 2026), retrieved November 18, 2026. [Terms](https://www.tanach.us/License.html) permit viewing and copying biblical Hebrew without restriction. This is UXLC, not a claim to distribute the WLC edition. `passage.js` records the full source-file SHA-256, metadata and exact words; `genesis-1-1-3.xml` preserves the excerpt’s word structure. XML formatting was regenerated; word text was not normalized. No Tanach.us interface, stylesheets or nontext material were copied.
- Font: unmodified Noto Serif Hebrew variable font from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/notoserifhebrew), retrieved November 18, 2026; SIL Open Font License 1.1 in `assets/OFL.txt`. No external font request is needed at runtime.
- Music: `original-demo-01`, revision 1, composed expressly for this project, dedicated under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Its pitches and timing are test material. `music.js` contains the motif, syllable fixtures and derivation. Concluding practice groups use an invented three-note fall; it is not an etnaḥta or sof-pasuq realization.
- Music notation font: unmodified [Bravura](https://github.com/steinbergmedia/bravura) from Steinberg Media Technologies GmbH, revision `37b194378b710cc40e406ab6c4b07608bb9548ae`, retrieved November 19, 2026; SIL Open Font License 1.1 in assets/Bravura-OFL.txt. Font SHA-256 `cdf0f893ee1fdb64b7f6713d71ee0dcfc349c0ac01429a8e451b01a9e79f5f3b`. No proprietary Kinnor font was used.
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

## Reusable recording investigation

[Creator Russel Neiss’s April 17, 2012 announcement](https://ejewishphilanthropy.com/torah-on-the-go/) explicitly releases PocketTorah audio and corresponding metadata under Attribution-ShareAlike. The linked license is [CC BY-SA 2.5 Generic](https://creativecommons.org/licenses/by-sa/2.5/); later third-party claims of 4.0 must not replace this primary evidence. Original Dropbox audio/label links returned 404. The [creator’s current repository](https://github.com/rneiss/PocketTorah), inspected at commit `8a23287221dd535966ee9914de9a03e71769a469`, has 444 audio blobs, timing labels and 54 portion records with annual/triennial boundaries. Match file provenance and text/time alignment before shipping. Sefaria describes its PocketTorah recordings as Avery-Binder style; that description does not establish equivalence to a Kinnor preset or an independent pronunciation profile. The opening MP3 is now included as a separate recorded reference in v0.6. Its original 2012 and current Git blobs match, and its plain SHA-1 matches Archive metadata. This establishes file continuity; musical and acoustic boundary review remain pending.

## Musical export evidence

v0.4 staff and MusicXML/MIDI/WAV use the same event pitches, timing and exact Hebrew IDs as playback. Original demo timing is unchanged: individual 5:3 quarter/dotted-quarter values represent 0.6/0.9 beats; cadence events remain 0.5 beats. This is notation of an original fixture, not historical musical verification. Instrument revision 2 uses a shared smooth triangle envelope and 12-tone equal temperament at A4=440 Hz; that tuning is a property of the demo and not a claim about every tradition.

MusicXML follows the [4.0 specification](https://www.w3.org/2021/06/musicxml40/), including [time-modification](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/time-modification/), Hebrew text direction and lyric extensions. Generated files were checked against the official raw v4.0 schema. WAV uses browser OfflineAudioContext without output-device playback during generation. Silent waveform tests use development-only web-audio-engine 0.13.4 (MIT); it is absent from the browser bundle. Detailed measured evidence and remaining limits are recorded in VERIFICATION-0.4.md.


## Original-program archives

The [Internet Archive V3.2 CD item](https://archive.org/details/Trope_Trainer_Kinnor_Software_Inc._Version_3.2_2005) preserves an ISO labeled 2005. The [V6 Deluxe item](https://archive.org/details/trope-trainer-6) contains `TropeTrainer6.zip`, 107,822,672 bytes, SHA-1 `5d4917e3dc96e9321c3051f5559f7b4e192fa03c`; Archive metadata rechecked November 19, 2026. The executable version resources identify product 6.0.428 / file 6.0.428.1. Archive timestamps and uploader descriptions are not independently verified release dates. The archive was inspected as data without execution, installation or registration.

Help files confirm six Accent labels and their illustrative examples. The 79 definition records establish factual catalog labels (32 Torah, 25 haftarah and 22 other entries), recorded with provenance in ORIGINAL-CATALOG.json. This does not establish that every record was exposed in a running menu or that its musical realization has been reviewed. No permissive redistribution license was found; proprietary program, scores, recordings and engine assets are not included in the reconstruction. Continued historical research can inspect lawfully accessible documentation, compare versions and seek rights-cleared scores or recordings.

## Source-sign evidence and limits

[UXLC’s encoding guide](https://www.tanach.us/Pages/Coding.html) and the [Unicode Hebrew chart](https://www.unicode.org/Public/18.0.0/charts/PDF/U0590.pdf) distinguish character names from source-edition roles. For Torah/prose in this edition, U+05AE (Unicode ZINOR) encodes postpositive Zarqa; U+0598 (Unicode ZARQA) is a distinct stress helper. Pashta and other signs can repeat within a source word. The inspector preserves every occurrence and encoded offset; postpositive location alone is not the stressed syllable.

Silluq-position labeling is restricted to the final U+05BD in a source word that also contains a following sof pasuq. Earlier metegs remain separate. Munaḥ with paseq, multiple distinct disjunctives and mixed combinations carry explicit context warnings. These conservative character-level observations do not resolve the full contextual hierarchy or tune. Poetic accent characters are recognized but are not assigned prose classes.

The independent census in SOURCE-SIGN-AUDIT.json covers all 79,985 preferred reading words (w/q), excluding ketiv alternatives from reading counts while retaining them in the corpus. It finds 25 cantillation codepoints, 365 postpositive Zarqa positions, ten stress helpers and seven words with no encoded accent/meteg/final maqaf/sof pasuq. Counts are specific to this source edition. Search never invents a missing accent. All 231,178 original demonstration events remain hash-identical to v0.4; improved sign recognition does not claim a new musical realization. See VERIFICATION-0.5.md.


## Recorded reference provenance · v0.6

The original 2012 app source directly links to [PocketTorah Audio Files on Internet Archive](https://archive.org/details/PockettorahAudioFiles). Its [metadata](https://archive.org/metadata/PockettorahAudioFiles) names Not-a-Box Media Lab, describes Avery-Binder style and links CC BY-SA 3.0. This is additional primary licensing evidence alongside the creator’s announcement linking 2.5 for audio and timing metadata; neither supports silently asserting 4.0. The unmodified audio is distributed under the Archive’s explicit [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/); the original timing file retains its 2.5 release notice. Derived alignment/reference adaptation is offered under 3.0, a later license with the same elements allowed for derivatives by the [2.5 legal code, section 4(b)](https://creativecommons.org/licenses/by-sa/2.5/legalcode.en). Attribution, source URLs, changes and complete checksums accompany the material in assets/references/NOTICE.txt and the standalone HTML.

Pinned original repository commit: [c8540eae1c5e07138aafc89afb571b71326d13dd](https://github.com/rneiss/PocketTorah/tree/c8540eae1c5e07138aafc89afb571b71326d13dd). Opening audio blob ff17c9f12cb79a0eac02889db975de73a27bba09 and timing blob e347386e1b1dbed89e062617f5865b66029a6e62 are identical in 2012 and current revisions. Downloaded MP3 plain SHA-1 755c6e9918ba2021bba8b33c46db309c115620d6 matches Archive metadata. All 432 current timing blobs match preserved 2012 files. Eight current audio blobs match files in that original Git tree. All 444 current audio filenames/sizes also match Archive originals, but name/size agreement is weaker evidence than a hash; only the opening MP3 was independently hashed against Archive in this iteration. Records and evidence scope are in RECORDING-SOURCES.json.

The 2012 WLC 4.14 XML supplies original text and morphological slash separators. The importer retains slash-bearing source tokens, removes slashes only for display, and keeps XML editorial x codes as separate notes. The 469 positions align by verified verse/word ordinal; 458 match UXLC exactly, ten differ only by combining grapheme joiners and Genesis 1:11 word 5 differs in accent. Both strings and the disagreement are visible/preserved. The source excerpt is retained for independent regression checks. Source XML formatting must not insert whitespace inside mixed-content words.

The reference player follows original word starts, ending the final word at actual decoded media duration (449.515 seconds in the tested browser). It reuses selected scopes, repeat and assigned occurrence IDs; discontinuous selections seek between source intervals. Timings remain source-provided and acoustically unreviewed. A source-described style is not an independent review or Kinnor equivalence. The project credits multiple readers; the individual for this MP3 is still unidentified. No pitch, syllable or phoneme transcription or independent musical/phonetic profile has been derived. Instrument settings do not change the recorded take. See VERIFICATION-0.6.md.
