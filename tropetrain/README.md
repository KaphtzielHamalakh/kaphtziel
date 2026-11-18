# TropeTrain · reconstruction in progress

Independent reconstruction of the teaching workflow of Kinnor’s desktop TropeTrainer. Original instrumental demonstration only. No historical melody, singing voice or pronunciation preset is implemented.

For a downloaded copy, open **TropeTrain.html**. It embeds the reader, audio code, Hebrew and font and does not need a server. `index.html` also uses a classic bundle so file-origin module restrictions no longer leave it silently empty. The published app is <https://kaphtziel.com/tropetrain/>.

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

To loop across the first group boundary, click word 2, then Shift-click **אֵ֥ת** (word 4), check **Repeat this span**, and press **Play**. Touch users can click **Choose span end** and then word 4. Press **Stop** or Escape to stop. Use **+** once to transpose one semitone; use **Tempo** to slow down. View buttons preserve the selection and source marks.

The note ribbon and expandable event table show the same events that drive audio and highlighting. **Download note sequence** exports the marked words, draft Hebrew syllables, stable IDs, current pitches, beats and durations as JSON. Draft roman labels are internal editorial aids; phonemes remain null until reviewed. There is no speech substitution.

Preferences and cursor/span endpoints are saved locally when storage is available. A service worker caches the app for later offline use; no remote API or account is required to practice. Changing tempo, transposition, repeat or scope during playback restarts or stops the current span explicitly; switching views preserves active playback. Hiding the tab stops sound, since background display timing cannot be trusted.

See [evidence and full roadmap](docs/RESEARCH.md), [verification record](docs/VERIFICATION.md), [continuation log](docs/PROGRESS.md) and [structured state](docs/STATE.json). Runtime source modules are bundled into a classic script with a pinned esbuild development dependency. The app is an isolated directory in the existing static GitHub Pages site; the parent homepage and domain configuration are unchanged. Narrow screens have a persistent Play/Stop bar and a Controls link so transport remains discoverable.
