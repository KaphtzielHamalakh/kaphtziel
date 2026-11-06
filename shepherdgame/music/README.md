# Shepherd of Elah music

Drop your author-supplied Suno MP3s here, then run `npm run build` in
`shepherdgame-source` and publish the resulting `shepherdgame` folder.
No code changes are necessary for correctly named files. The initial release
contains no music; missing tracks are silent, with one warning per track.

| ID / filename | Loop | Direction |
|---|---|---|
| title.mp3 | yes | Heroic Freygish main theme |
| stage_select.mp3 | yes | Upbeat anticipation |
| prologue.mp3 | yes | Pastoral major-key shepherd melody |
| anointing.mp3 | yes | Sacred, slow, awe |
| realm_zin.mp3 | yes | Relentless desert heat |
| realm_hermon.mp3 | yes | Spacious icy arpeggios |
| realm_sodom.mp3 | yes | Heavy, ominous sulfur |
| realm_resheph.mp3 | yes | Fast electric storm |
| realm_edom.mp3 | yes | Haunted dusk ruins |
| realm_jaffa.mp3 | yes | Flowing underwater motion |
| realm_night.mp3 | yes | Midnight dance, steady beat |
| realm_azazel.mp3 | yes | Rugged pounding canyon |
| boss.mp3 | yes | Urgent shared demon battle |
| elah.mp3 | yes | Battle march |
| goliath.mp3 | yes | Heavy giant, slow build |
| ashmedai_hall.mp3 | yes | Dark royal tower |
| ashmedai_final.mp3 | yes | Epic final battle |
| saul.mp3 | yes | Sparse and sorrowful, room for lyre |
| coronation.mp3 | no | Triumphant major-key main theme |
| credits.mp3 | no | Closing theme |
| jingle_get_power.mp3 | no | 3–5 seconds |
| jingle_stage_clear.mp3 | no | 3–5 seconds |
| jingle_boss_intro.mp3 | no | 2–4 second sting |
| jingle_game_over.mp3 | no | 3–5 seconds |
| jingle_song_learned.mp3 | no | 3–5 seconds |

Overall: original NES-era 8-bit chiptune, ancient Near Eastern flavor,
Phrygian dominant / Freygish and harmonic minor, strong hook, no vocals.
Reuse the title motif when appropriate.

Edit `src/engine/audio/musicManifest.ts` to set `loopStart`, `loopEnd` (seconds),
`trimStart` (skip MP3 leading padding on initial play), and `volume` (0–1.5).
Null loopEnd means end of buffer. Trim encoder padding at both loop boundaries
by ear. Music uses decoded AudioBuffers, never HTML audio loops. State changes
crossfade over half a second. The lyre ducks music to 35%, pause to 40%.
`realm_night` has a `bpm` value, initially 120. Shadow platforms use the game
clock at this tempo, so they work without a track. Adjust it to your real song.

Sound Test is available in Options and marks failed tracks with `!`.
Missing jingles use a short synthesized arpeggio instead.
