# Shepherd of Elah

An original code-drawn 8-bit browser adventure for Kaphtziel Studios.
Live path: https://kaphtziel.com/shepherdgame/

## Develop and publish

Requires Node 22 or later.

```
cd shepherdgame-source
npm ci
npm run dev
npm test
npm run build
```

The build checks TypeScript and writes the static site into `../shepherdgame/`.
Commit both source and generated output. The surrounding site is served from
GitHub Pages; its CNAME and homepage are preserved. There are no runtime packages,
remote fonts, analytics, external images, or required audio downloads.

## Controls

Arrows / WASD move; Z / Space jumps; X / J fires; hold C to raise the lyre.
Q/E cycle powers and companions. Enter pauses. Down + jump slides.
Gamepad D-pad or left stick moves; A jumps, B fires, Y raises lyre,
LB/RB cycle and Start pauses. Menus accept arrows and jump/fire/start,
or direct taps. Keyboard bindings can be changed in Options.

Touch controls appear automatically. Slide your thumb on the D-pad for diagonals.
Hold LYRE and tap directional notes. Separate touch identifiers allow movement,
holding FIRE, and jumping together. Options include layout dragging, size,
opacity, haptics, always-on/off controls and reduced flashes (on by default).
Fullscreen is available at the lower right. On iOS use Add to Home Screen.

## The journey

Complete Bethlehem's lion and bear encounters, then choose eight realms in any
order. Free sparks to earn weapon palettes and powers; optional alcoves hold
Psalm fragments. Shoot bells or play the lyre to open puzzle gates. Shoot the R
bell to reset a puzzle. Each realm has two puzzle rooms, a miniboss, checkpoints,
a climb and a boss. The pause menu records songs and offers Horns of Oil.
Ayil unlocks after one spark, the Dove after four. Revisit realms for fragments.

After eight sparks, select David in the center to enter Elah. Hold FIRE for
40 frames and release a charged stone while Goliath taunts. Hold DOWN in the
brook to replenish stones. The tower uses all eight powers. Clear the rematch
hall and face three phases of Ashmedai. Play the Song of Morning near Saul
three times, then follow David's coronation and credits.

Three local save slots autosave on bosses and fortress sections. Save slots can
be reset from their screen. The six-symbol 6×6 password preserves the eight
sparks, oil and Morning song with checksum validation; it does not preserve
fragments, difficulty or fortress checkpoints. Take a screenshot of the grid.

See [DECISIONS.md](DECISIONS.md) for scope and spec differences and
[TESTING.md](TESTING.md) for evidence and remaining manual checks.
Music installation instructions are in [public/music/README.md](public/music/README.md).
The original supplied specification is retained in [GAME_SPEC.md](GAME_SPEC.md).
