# TropeTrain · first playable milestone

Independent reconstruction of the teaching workflow of Kinnor’s desktop TropeTrainer. Original instrumental demonstration only. No historical melody, singing voice or pronunciation preset is implemented.

From the repository root:

```sh
python3 -m http.server 8765
```

Open <http://localhost:8765/tropetrain/>. No install or build is required. Run checks with:

```sh
node --test tropetrain/tests/*.test.mjs
```

Try **Genesis 1:1–3**. Click **בָּרָ֣א** (1:1, word 2), select **End of group**, then **Play**. It ends after **אֱלֹהִ֑ים** (word 3). Select **End of verse** to end after **הָאָֽרֶץ׃** (word 7).

To loop across the first group boundary, click word 2, then Shift-click **אֵ֥ת** (word 4), check **Repeat this span**, and press **Play**. Touch users can click **Choose span end** and then word 4. Press **Stop** or Escape to stop. Use **+** once to transpose one semitone; use **Tempo** to slow down. View buttons preserve the selection and source marks.

The note ribbon and expandable event table show the same events that drive audio and highlighting. **Download note sequence** exports the marked words, draft Hebrew syllables, stable IDs, current pitches, beats and durations as JSON. Draft roman labels are internal editorial aids; phonemes remain null until reviewed. There is no speech substitution.

Preferences and cursor/span endpoints are saved locally when storage is available. A service worker caches the app for later offline use; no remote API or account is required to practice. Changing tempo, transposition, repeat or scope during playback restarts or stops the current span explicitly; switching views preserves active playback. Hiding the tab stops sound, since background display timing cannot be trusted.

See [evidence and full roadmap](docs/RESEARCH.md) and [verification record](docs/VERIFICATION.md). Runtime sources are buildless ES modules. The app is an isolated directory in the existing static GitHub Pages site; the parent homepage and domain configuration are unchanged.
