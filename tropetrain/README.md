# TropeTrain · reconstruction in progress

Independent reconstruction of the teaching workflow of Kinnor’s desktop TropeTrainer. All five Torah books are available for reading and original instrumental demonstration playback. Independent historical melody/phonetic profiles and synthesized singing remain pending. A separate licensed PocketTorah recording library covers all Torah portions.

For a downloaded copy, open **TropeTrain.html**. It embeds the reader, audio code, Hebrew and fonts and does not need a server. `index.html` also uses a classic bundle so file-origin module restrictions no longer leave it silently empty. The published app is <https://kaphtziel.com/tropetrain/>.

For development, from the repository root:

```sh
python3 -m http.server 8765
```

Open <http://localhost:8765/tropetrain/>. The checked-in browser bundle runs without installation. After changing source modules, build and test from this directory. Python 3 is used by the independent XML/source-pack audit:

```sh
npm ci
npm run check
```

Try **Genesis 1:1–3**. Click **בָּרָ֣א** (1:1, word 2), select **End of group**, then **Play**. It ends after **אֱלֹהִ֑ים** (word 3). Select **End of verse** to end after **הָאָֽרֶץ׃** (word 7).

Open **Choose a passage or assignment** to select any Torah range by book/chapter/verse, including a range crossing chapters. **Add as section** builds an ordered reading across multiple ranges/books. **Tutor assignments & sections** can save/load a named assignment, jump to or hide sections, and import/export the versioned JSON format. Eight recent readings are remembered. Student tempo, transposition, volume and comfort range are independent of saved assignment settings.

Long readings use pages of eight verses and 128 inspectable note events and 12 staff notes. The full span remains selected and exportable; paging does not truncate it. **Follow playback** changes the displayed page as the active word moves. A bounded audio lookahead avoids allocating a whole book's oscillators at once.

**Inspect source signs** lists every encoded accent and related source mark at the cursor, including repeated marks and their original character positions. **Sign classes** adds optional frames using the source guide’s prose classes; combined or context-dependent signs are labeled separately. This is source inspection, not a complete syntactic analysis or a verified melody.

Open **Find a source sign**, choose **Entire Torah**, then **Zarqa (postpositive)**. The current UXLC edition has 365 matching words. **Go to word** opens an example without changing key, speed or volume. The distinct **Zarqa stress helper** has ten matches. Try **Qarnei fara** to reach Numbers 35:5 word 8. In **This reading**, repeated assignment sections retain separate occurrence links, and counts distinguish matching words from encoded positions.


The opening passage retains manual draft syllable fixtures. Other words use source-aligned havarotjs analysis, explicitly unreviewed; unresolved boundaries remain labeled as one word unit. Ketiv and qere are stored separately. The inspector shows written forms for qere words, and source enlarged-letter annotations are retained. These are not complete pronunciation grammars.

To loop across the first group boundary, click word 2, then Shift-click **אֵ֥ת** (word 4), check **Repeat this span**, and press **Play**. Touch users can click **Choose span end** and then word 4. Press **Stop** or Escape to stop. Use **+** once to transpose one semitone; use **Tempo** to slow down. View buttons preserve the selection and source marks.

The staff, note ribbon and expandable event table show the same events that drive audio and highlighting. **Download note sequence** exports the marked words, draft Hebrew syllables, stable IDs, current pitches, beats and durations as JSON. Draft roman labels are internal editorial aids; phonemes remain null until reviewed. There is no speech substitution.


Use **Recording** in the navigation for PocketTorah references across the entire Torah: **54 portions, 378 takes**. Choose **Reference portion** and **Reference aliyah**, then **Open selected reading**. Choose a cursor/span with the usual boundary controls. **Load recordings** shows the count and download size; it verifies each original file before saving it on this device. Then raise **Reference volume** when ready and use **Play reference span**. Reference volume starts at zero and remains independent of instrument volume. **Play complete recording** plays the selected unmodified take, including its opening/closing sound, without timed highlights.

For a concrete example, choose **Va’ethanan → Aliyah 6 → Open selected reading**, which opens **Deuteronomy 6:4–25**. Select **End of word** for a short test, load the 1.6 MB recording, then play the reference. Its verified device copy remains available after reload. **Remove saved recording** removes only that cached file; it can be loaded again. **Cancel reference loading** aborts unfinished downloads and keeps complete files. The app does not download the 366 MB collection at startup. The full catalog and source comparisons are embedded; the opening MP3 is included in the app/standalone copy. Other recordings need an initial network download and browser storage for persistent offline use. If storage is unavailable, fallback memory is limited to three recordings.

Source-timed spans can cross recording files and ordered/repeated assigned sections. Stop, Escape and hiding the tab stop audio; starting instrumental/reference playback stops the other. Each take retains its original key, tempo and pronunciation. Instrument key/tempo/range controls do not transform recorded audio. This is source-described Avery–Binder-style material, not an independent Kinnor preset or pronunciation profile. Individual reader attribution and acoustic/musical review remain pending; staff and synthesized exports still represent the original instrumental demonstration.

All 79,985 UXLC reader units correspond to 79,986 WLC source words, preserving both editions, marks, original tokens, written variants and editorial codes. The Decalogue has verse-numbering differences, explicitly shown for 393 word references. Numbers 12:9 has two WLC words corresponding to one UXLC unit. There are 169 source-mark differences and 430 joiner-only differences. The reader’s Hebrew is never overwritten. The catalog/source pack reproduces byte-for-byte from 384 checksum-pinned original files.

**370** takes have matching word/timestamp counts and strictly increasing source starts. **Eight** have original timing errors: Shemot 1/5/7, Tetzaveh 1/3, Shmini 6, Nasso 4 and Eikev 3. Those recordings offer complete-take listening while word/span playback remains disabled pending review. No missing boundary is guessed. All 378 endpoints passed HTTP availability, original-size and browser-access checks; individual audio content is checked against its source checksum when loaded. This does not establish acoustic or musical accuracy.

Use **Score** in the navigation to find the playback staff. It shows a treble clef, explicit accidentals and exact note durations. The demo’s 0.6/0.9 beat values are retained as individual 5:3 quarter-note tuplets. Hebrew is written once for a melisma and continued by extension lines; a new score page repeats its continuing syllable for context. Click a note, or focus it and press Enter, to go to the corresponding Hebrew word. This notation is a score of the original demonstration, not a transcribed traditional chant.

Open **Save music and audio** to prepare **MusicXML**, **MIDI**, or a **WAV** file. The Save links appear after preparation. MusicXML and MIDI preserve source words, exact syllable strings, canonical/occurrence IDs and musical settings in their metadata. MIDI uses 4,800 ticks per beat and UTF-8 lyric bytes; support for Hebrew display and instrument timbre varies by MIDI player. MusicXML uses 10,000 divisions per beat. Neither format changes the displayed source text.

WAV renders the same triangle instrument/envelope as live playback, once through the selected span at the current key, tempo and instrument volume. At 0% volume it produces silence, explicitly labeled before export. A duration/file-size estimate appears before rendering. Long audio is rendered in short batches ending at note boundaries; **Cancel audio export** cancels between batches. RIFF WAV’s 4 GB limit is enforced; for larger selections export sections separately. Stop/Escape also pauses any exported audio preview. A generated file is invalidated when its selection, key, tempo or volume changes. Range guidance remains advisory.

Preferences and cursor/span endpoints are saved locally when storage is available. A service worker caches the app for later offline use; no remote API or account is required to practice. Changing tempo, transposition, repeat or scope during playback restarts or stops the current span explicitly; switching views preserves active playback. Hiding the tab stops sound, since background display timing cannot be trusted.

See [evidence and full roadmap](docs/RESEARCH.md), [v0.7 verification](docs/VERIFICATION-0.7.md), [continuation log](docs/PROGRESS.md) and [structured state](docs/STATE.json). Runtime modules and compressed Torah data are bundled into a classic script with a pinned esbuild development dependency. A current browser with DecompressionStream support is needed for the embedded full corpus; the opening passage still initializes if that feature is absent. The app is an isolated directory in the existing static GitHub Pages site; the parent homepage and domain configuration are unchanged. Narrow screens have a persistent Play/Stop bar and a Controls link.


### Printed score study (v0.8)

Click **Open the six-note score study** below the recorded-reference panel. It opens Genesis 22:1 and selects its final two words, וַיֹּ֥אמֶר הִנֵּֽנִי׃. Choose tempo 60 and transpose 0 to compare E4–B4–A4 / E4–G4–G4 with the original 1902 Cohen scan. Play/repeat, source-preserving Hebrew views and exports use the same six events. The printed durations total 7.5 quarter-note beats. Tempo, key and range are independent; no singing or pronunciation profile is added.

This is a bounded, independently unreviewed source transcription, not an entire traditional system or Kinnor preset. The source calls for flexible tempo; playback regularizes timing. The separately printed untexted coda is excluded. Selecting an uncovered word disables source playback/export. Switch **Musical source** back to **Original demonstration 01** for original-demo practice anywhere. Inspect PRINTED-SCORE.json and the original scan for provenance; TIMING-HISTORY.json records why eight PocketTorah takes still lack trustworthy word timing.


### Complete printed verse (v0.9)

Use **Printed study → Open the printed verse study** for all 13 words of Genesis 22:1. At tempo 60 / transpose 0, it is 44 seconds: 52 printed components, 50 sounding notes, four rests and two held ties. Word/group/verse/span/repeat and score exports use this same source sequence. Rests clear highlights; ties hold one pitch without re-attack. Stop/natural completion suspend idle instrument output, and Play resumes it.

Two independent 1902 scans support the manually checked transcription; both are included. Exact source words, source rhythms/locations, bar totals and provenance are in PRINTED-SCORE.json. Run `node scripts/import-printed-score.mjs` to validate/regenerate its source fixture; build does this automatically. MusicXML retains source measures/meters and exact tuplets/ties/rests. The standalone embeds both images and the full evidence map/roadmap.

This revision expands the earlier two-word excerpt; the final six pitches/durations/IDs are unchanged. The legacy profile ID remains for existing assignments. Regularized tempo, modern tuning/instrument and draft source-cluster underlay remain approximate; independent musical/transcription/underlay review is pending. The untexted coda and general rules for other verses are excluded. All 32 Torah systems, six Accent realizations, singing and remaining roadmap work remain unfinished.
