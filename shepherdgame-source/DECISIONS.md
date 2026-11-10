# Release decisions

This is a playable first release of the campaign, not a claim that every
acceptance criterion in GAME_SPEC.md has been met. The campaign and systems are
implemented together; the twelve milestones were not independently released or
tested on physical phones between milestones. The differences below are tracked
explicitly so they can be expanded without losing the supplied design.

## 1 — Engine
Vite and TypeScript; no runtime dependencies. 256×240 framebuffer, fixed 60 Hz
updates, elapsed-time clamp on background stalls, integer CSS scaling. Menus
use the same keyboard/gamepad/touch abstraction as gameplay. No interpolation.
Phones below a 256 CSS pixel viewport are not targeted. Real phone validation
remains required. Touch layout data is stored in CSS pixels for the current
orientation; reset it after changing device/orientation if necessary.

## 2 — Movement and pixels
Physics constants match section 3.3, with gravity applied after jump launch in
the same update. Snowy ground eases velocity over 24 frames. Water uses the
separate specified gravity, jump and terminal values. David uses a cached
character-grid sprite plus code overlays for run, throw, slide and lyre.
Other animation frames are simplified; the compact original bitmap font uses
5×7 glyphs in 6×8 cells for readable menus, rather than 8-pixel-wide glyphs.
Backgrounds use flat realm palettes and original silhouette geometry. Strict
NES subpalette limits and the full 54-color master palette are not enforced.

## 3 — Sling
Three default pellets maximum, finite life, bronze ricochet, throw pose, and
individual power projectiles. Diagonal plate reflection is the first puzzle's
teaching pattern. Four independent plate-angle tile variants remain to expand.

## 4 — Health
28 health, damage scaling by difficulty, knockback, invulnerability, checkpoint
respawn and lives. Shepherd returns falls to solid ground with damage. This
release uses finite screen rooms rather than long scrolling pits. Boss health
fills with tones. Death dissolves into sparks; no gore.

## 5 — Rooms
Nine screens per realm; two base-kit bell/lyre/block puzzles, a miniboss,
checkpoint, optional power alcove, ladder climb, boss gate and boss arena.
Room entry resets all puzzle state. Transition uses a directional wipe rather
than a fully animated horizontal/vertical camera scroll. Rooms are shorter and
more reusable than the specified 5–8 minute authored stages. Realm-specific
puzzle narratives (sluice ordering, shadow carts, wind bell sequences) remain
simplified to shared readable interactions. Enemies are room-local rather than
camera-margin spawners. Despawning is implicit on room change.

## 6 — Audio
WebAudio pulse Fourier waveform, triangle notes and noise SFX; MP3 buffers,
loop metadata, lazy loading, six-buffer cache and crossfades. Missing tracks
warn only once per session. Missing jingles synthesize short arpeggios.
Pause reduces music to 40%, lyre to 35%, volume restores with smoothing.
An empty music folder is supported. No third-party music was added.
Sound Test is always available so the author can check new music immediately.
The synthesis is an approximation, not a hardware channel-limit emulation.

## 7 — Prologue
Three playable screens with lion/bear fights, followed by anointing and breaking
story cards. Animals use the shared miniboss sprite template in this release.
Fold and Opening are available during the tutorial; their timing is simplified.

## 8 — Puzzles
Entity data implements links and AND/OR requirements, bell, reset, plate, block,
pressure plate, harp-gate, calmed animal, optional power barriers and light
platforms. Common power objects use a data-driven on-hit dispatch rather than
separate per-object classes. Room resetting avoids stuck-crate softlocks.
Some catalog objects have generic visual treatment. Complex timed interactions,
barrel chain explosions, water-pillar geometry, and shadow moon-platform behavior
need deeper authoring; not all objects appear in two different realms yet.

## 9 — First realm
Zin has heat warnings, enemies, two puzzle rooms, checkpoint and Ketev. Default
sling can damage all eight realm bosses. Defeat grants Noon Scorch and a tunic
swap. Sparks and passwords are saved on the Get Power screen.

## 10 — Other realms
All eight palettes, tracks, hazards, named bosses and weapon rewards are present.
Boss movement patterns differ, with aimed spread shots and faster low-health
bursts; the exact three bespoke patterns per demon are not all reproduced.
Leviathan's moving coils, Agrat's chariot horses, and Lilith's three decoys remain
simplified art/behavior. Weaknesses match the supplied directed cycle and use
4× damage. Screech Gale pushes small enemies; Agrat receives its damage-bearing
weakness gust. Freezing enemies creates persistent blocks until room reset,
rather than thawing after five seconds. Bomb splash and bubble movement are
simplified. Shadow dash and ground quake both support combat and barriers.

## 11 — Fortress and ending
Elah, a replenishable charged-stone Goliath fight, eight-power tower, refillable
rematch hall, three-phase Ashmedai, three Morning songs at Saul, coronation,
credits and fragment bonus scene are playable. Goliath accepts stones during
his taunt hitbox; forehead aiming is forgiving rather than pixel exact.
Tower rooms reuse the climb template. Ashmedai uses the common projectile
framework, with phase weaknesses and the Morning-song stun in phase three;
custom destructible floor/hands and shadow-hound choreography remain to expand.
Montage art is code-drawn and compact. Fortress sections autosave; individual
rematch victories reset if the browser reloads mid-hall.

## 12 — Persistence and options
Three saves, full valid-state password tests, all difficulties, reduced flashes,
music/SFX options, touch layout editor, keyboard remapping, companions, oil,
fragments and Sound Test are present. No full-screen white flash is used.
Screen shake is an exposed preference, but this release deliberately renders
without shake. Hard mode has damage/faster attacks; distinct oil placement and
increased Shepherd drop rates remain to expand. Returning from a campaign to
realm select restores progression but does not save mid-stage position.

## Hosting
Source lives in shepherdgame-source; the checked-in static Vite output lives in
shepherdgame. The existing GitHub Pages deployment and CNAME are unchanged.
Music files should be added to source/public/music and rebuilt, so later builds
do not erase a file placed only into the generated directory.

## Revision — connected screens and detailed pixel artwork

- Main paths now allow left/right backtracking in the tutorial, realms, Elah and
  tower. Active boss arenas remain locked until their fight concludes.
- Every realm has a tenth, upper terrace screen: the Heights lead up a ladder
  to that terrace; its walk-up stairs lead right to the spark gate. The route
  is reciprocal: gate → terrace → ladder down → Heights. Eight-pixel stone
  stairs support walking ascent without repeated jumps. Tower rooms also
  connect upward and downward through their ladders; advancing upward still
  requires the room's power interaction.
- Added shaded David sprite details, equipment, climb and airborne poses,
  original individual demon sprites, larger enemy drawings and beveled
  portrait frames. Added cached realm-specific scenery and textured tile art.
  These replace the first-release simple geometric rendering, while retaining
  code-generated art, the original characters, and the 256×240 resolution.
- `tests/traversal.mjs` verifies stairs into the ladder, upper-screen travel,
  return from the gate, descent, and ordinary horizontal round trips in all
  eight realms. Shaft descent positioning is set by the harness; the ascent
  walks and climbs using simulated inputs. Chromium desktop, multi-touch and
  existing puzzle/combat regression checks also pass.

## First author-supplied music batch

The five uploaded MP3s are preserved unchanged in public/music. Main Theme #1
plays on the title and stage-select screens. Three Fields of Bethlehem versions
and Main Theme #2 are temporarily distributed across all eight realms, with the
original Fields track also assigned to the tutorial. The exact mapping is in
public/music/README.md and soundtrackAssignments in musicManifest.ts.

Shared assignments reuse buffers by filename and continue playback across title
and stage-select without restarting. Decoded buffers now have a 96 MiB cache
budget in addition to the six-entry cap (one oversized track may remain). This
limits memory use with these longer stereo tracks. Whole-track loops are used
for now; no arbitrary musical loop points or BPM values have been inferred.
Dedicated music slots remain available for future uploads.

## Realm geography revision

The original shared combat-room terrain has been replaced with authored terrain
profiles for each realm in src/geography.ts. Opening roads, secondary roads,
gauntlets, shelters, final approaches, arenas, climbs and upper terraces now
have realm-specific terrain, platform placement, scene art and names. Existing
base-kit puzzle switches and optional power alcoves remain compatible.

| Realm | Geography and environmental identity |
|---|---|
| Zin | Dunes, oasis, shaded sandstone passages, exposed mesas; awnings protect from sun pulses; an optional low passage can be slid under or crossed above. |
| Hermon | Ice shelves, frozen waterfalls, blue ice caves and snowfields; slippery ice is a tile material rather than a global movement modifier; falling icicles break and respawn. |
| Sodom | Salt pillars, lowered vent beds, basalt chimneys and sulfur chambers; staggered vent cycles and elevated bypass ledges. |
| Resheph | Broken causeways, insulated platforms, central shrine spires, storm towers and high sky bridges; marked lightning zones and rain. |
| Edom | Thorn gardens, fallen arches, root-covered masonry, vine climbs, a quiet Morning shrine and broken rooftops. |
| Jaffa | Dry tidal shore, submerged ship hull, sluices, coral caves, flooded well and aqueduct; room-local water depth, currents, rising/falling rafts and land/water physics transitions. |
| City of Night | Lantern markets, plazas, layered roofs, a bell tower and optional rhythmic shadow balconies above a permanent route. |
| Azazel | Red-rock gorges, rocky switchbacks, rope spans, boulder caves and crumbling platforms that rebuild after falling; lower recovery routes prevent mandatory power locks. |

Each realm now has its own climb shaft position and upper-screen return shaft.
One-way ledges can be jumped through from below. Moving rafts carry a standing
player. Optional ladders stop at their supporting ground rather than cutting
unintended holes through it. Tower and tutorial templates remain separate from
the authored realm terrain. All sprite, tile and scenery artwork remains code
rendered; the soundtrack and saved progression formats are unchanged.

The movement tests isolate geometry using invulnerability and simulated inputs;
they are not full combat-balanced manual playthroughs. Some underlying enemy
and boss behavior still uses the shared systems described earlier in this file.
