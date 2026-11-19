# TropeTrain · reconstruction in progress

Independent reconstruction of the teaching workflow of Kinnor’s desktop TropeTrainer. All five Torah books are available for reading and original instrumental demonstration playback. Independent historical melody/phonetic profiles and synthesized singing remain pending. A separate licensed PocketTorah opening recording is available as a reference.

For a downloaded copy, open **TropeTrain.html**. It embeds the reader, audio code, Hebrew and fonts and does not need a server. `index.html` also uses a classic bundle so file-origin module restrictions no longer leave it silently empty. The published app is <https://kaphtziel.com/tropetrain/>.

For development, from the repository root:

```sh
python3 -m http.server 8765
```

Open <http://localhost:8765/tropetrain/>. The checked-in browser bundle runs without installation. After changing source modules, build and test from this directory:

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


Use **Recording** in the navigation to open the sourced PocketTorah reference for **Genesis 1:1–2:3**. **Open Genesis 1:1–2:3** loads its passage; choose a cursor/span with the usual boundary controls, raise **Reference volume** when ready, then **Play reference span**. Reference volume starts at zero and stays independent of instrument volume. Stop, Escape and hiding the tab stop both players; starting either player stops the other. Repeat follows the chosen span, including discontinuous and repeated assigned sections.

This unmodified take retains its recorded key, tempo and pronunciation. Instrument key/tempo/range controls remain separate and do not transform the recording. It is a source-described Avery–Binder-style recording, not a Kinnor preset or an independent pronunciation profile. Individual reader attribution and acoustic word-boundary/musical review remain pending. The staff and synthesized exports still represent the original instrumental demonstration.

The reference uses WLC 4.14 text and source-provided word starts. The UXLC reader remains unchanged. Both exact source strings are retained; the reference panel shows its WLC word and explains differences. Of 469 positions, 458 display strings match, ten differ only by joiners, and Genesis 1:11 word 5 has WLC zakef katon versus UXLC revia. No accent is silently substituted. The original MP3/timing file, source excerpt, alignment data and checksums are available under assets/references and data/references. See the visible attribution and licenses. The standalone HTML embeds the complete MP3 and notices.

Use **Score** in the navigation to find the playback staff. It shows a treble clef, explicit accidentals and exact note durations. The demo’s 0.6/0.9 beat values are retained as individual 5:3 quarter-note tuplets. Hebrew is written once for a melisma and continued by extension lines; a new score page repeats its continuing syllable for context. Click a note, or focus it and press Enter, to go to the corresponding Hebrew word. This notation is a score of the original demonstration, not a transcribed traditional chant.

Open **Save music and audio** to prepare **MusicXML**, **MIDI**, or a **WAV** file. The Save links appear after preparation. MusicXML and MIDI preserve source words, exact syllable strings, canonical/occurrence IDs and musical settings in their metadata. MIDI uses 4,800 ticks per beat and UTF-8 lyric bytes; support for Hebrew display and instrument timbre varies by MIDI player. MusicXML uses 10,000 divisions per beat. Neither format changes the displayed source text.

WAV renders the same triangle instrument/envelope as live playback, once through the selected span at the current key, tempo and instrument volume. At 0% volume it produces silence, explicitly labeled before export. A duration/file-size estimate appears before rendering. Long audio is rendered in short batches ending at note boundaries; **Cancel audio export** cancels between batches. RIFF WAV’s 4 GB limit is enforced; for larger selections export sections separately. Stop/Escape also pauses any exported audio preview. A generated file is invalidated when its selection, key, tempo or volume changes. Range guidance remains advisory.

Preferences and cursor/span endpoints are saved locally when storage is available. A service worker caches the app for later offline use; no remote API or account is required to practice. Changing tempo, transposition, repeat or scope during playback restarts or stops the current span explicitly; switching views preserves active playback. Hiding the tab stops sound, since background display timing cannot be trusted.

See [evidence and full roadmap](docs/RESEARCH.md), [v0.6 verification](docs/VERIFICATION-0.6.md), [continuation log](docs/PROGRESS.md) and [structured state](docs/STATE.json). Runtime modules and compressed Torah data are bundled into a classic script with a pinned esbuild development dependency. A current browser with DecompressionStream support is needed for the embedded full corpus; the opening passage still initializes if that feature is absent. The app is an isolated directory in the existing static GitHub Pages site; the parent homepage and domain configuration are unchanged. Narrow screens have a persistent Play/Stop bar and a Controls link.
