# SHEPHERD OF ELAH — Game Design & Build Spec (for Codex)

> **To Codex:** This file is the complete design for a retro 8-bit action-platformer. Build it as a browser game exactly as specified. Where this document gives numbers, use them. Where it leaves something open, choose the simplest option that keeps the NES feel, and write down your choice in `DECISIONS.md`. Work through the milestones in Section 14 in order. Each one must be playable before you start the next.

---

## 0. One-Paragraph Pitch

A side-scrolling 8-bit action-platformer in the tradition of the classic NES "pick-a-stage, take-the-boss's-power" games. The player is **David, the shepherd boy of Bethlehem**, armed with a **sling** that fires small stone pellets. Eight demons have broken loose across the land, each holding a **stolen holy spark**. David picks any of eight realms, fights and solves his way through it, defeats the demon at the end, and **frees its spark, gaining its power** (fire, frost, brimstone bombs, lightning, and more). Each power works both as a weapon and as a tool for puzzles. After the eight realms he faces Goliath in the Valley of Elah, then Ashmedai, king of demons. The game ends with David crowned king.

**Hard rule:** This is an original game. Do **not** use any Capcom/Mega Man names, sprites, music, sound effects, logos, or level layouts. Match the *genre and era* (NES-style pixel art, stage select, boss-power loop). Everything you make must be your own.

---

## 1. Tone & Story

### 1.1 Tone
Mythic and a little eerie, never grim. Think illuminated manuscript crossed with an 8-bit cartridge. The demons are strange and menacing but stylized; nothing is gory. Defeated enemies burst into smoke and sparks, never blood. God is never shown. Divine presence appears only as light, wind, or a voice in text.

### 1.2 Plot

**Prologue — The Fields of Bethlehem (tutorial stage).**
David guards his father Jesse's flock. A lion and then a bear raid the fold. These are the two tutorial mini-bosses that teach shooting, jumping, and dodging. That night the prophet Samuel arrives and anoints David with oil from a horn. A spirit of light comes on him, and he can now see what others can't.

**The Breaking.**
King Saul is tormented by an evil spirit (*ruach ra'ah*). In the game's mythology, this spirit's arrival cracks an ancient seal. **Eight demons** escape into eight realms of the land. Each one swallows a **holy spark**, and the land around it starts to rot: wells go dry, mountains freeze, cities fall dark. Samuel tells David that the sparks have to be freed, and that whoever frees all eight can stand against what is coming.

**The Eight Realms.** The player chooses the order (Section 5).

**The Valley of Elah (Fortress, part 1).**
With all eight sparks in hand, David reaches the Valley of Elah, where the Philistine giant Goliath has been swollen with demonic power. David goes down to the brook and picks up **five smooth stones**. In this section they're a special limited weapon (Section 4.4).

**The Hall of Ashmedai (Fortress, part 2).**
Goliath's fall reveals who was behind him: **Ashmedai, king of the demons**, who planned to use the broken seal to take the throne of Israel. A tower gauntlet leads to a boss rematch hall, then to Ashmedai himself in three phases.

**The Lyre in the Palace (Epilogue set piece).**
Back at Saul's palace, the evil spirit is still on the king. There's no combat here. The player plays David's lyre (*kinnor*) and the spirit leaves (1 Samuel 16:23). It's a quiet, musical scene.

**Ending — The Crown.**
Years pass in a short montage of still pixel panels with text. David is crowned king. The final screen shows King David on a throne with his lyre and his sling hung on the wall behind him. Roll credits over a chiptune arrangement of the main theme.

### 1.3 Lore Notes (for the author to verify)
These are flavor sources for the designer. Codex should use only the names and the in-game descriptions in Section 5.
- Lion and bear: 1 Samuel 17:34–36.
- Anointing: 1 Samuel 16:13. Ruddy appearance: 16:12. Lyre and evil spirit: 16:14–23.
- Five smooth stones: 1 Samuel 17:40.
- Demon sources are listed per boss in Section 5. **"Gafrit" is invented for this game** (from Hebrew *gofrit*, sulfur/brimstone). Ashmedai is traditionally tied to Solomon. Putting him in David's story is a deliberate liberty.
- Theme: each demon is a husk holding a captured spark, and freeing the spark repairs the land. In-game, this appears only as the words "spark" and "freed." No lecture text.

---

## 2. Platform & Tech Stack

- **Target:** Desktop and mobile browsers (Chrome, Firefox, Safari, iOS Safari, Android Chrome). Touch controls are a core feature (Section 3.2.1).
- **Language:** TypeScript.
- **Build:** Vite. `npm run dev` for development, `npm run build` for a static `dist/` that can be deployed to GitHub Pages.
- **Rendering:** HTML5 Canvas 2D. No game engine, no WebGL, no external art or audio files.
- **Art pipeline:** All sprites and tiles are **defined in code** as character-grid strings, with each character mapped to a palette index (Section 9.4). They're rasterized once at startup into offscreen canvases.
- **Audio:** WebAudio API. **Music** comes from MP3 files the author will supply later (made in Suno) and drop into `/public/music/` (Section 10.2). **Sound effects and lyre notes** use a small NES-style synth in code (Section 10.1).
- **Persistence:** `localStorage` save slots plus a classic **password** system (Section 8.4).
- **No runtime dependencies** beyond Vite/TypeScript dev tooling. A test runner (Vitest) is allowed.

### 2.1 Project Structure
```
/src
  main.ts                 // boot, game loop
  config.ts               // all tunable constants (physics, damage, etc.)
  engine/
    loop.ts               // fixed 60 Hz update, render interpolation off
    input.ts              // keyboard + gamepad → abstract buttons
    renderer.ts           // 256x240 framebuffer, integer scaling
    camera.ts
    collision.ts          // tile + AABB
    audio/
      synth.ts            // 2 pulse, 1 triangle, 1 noise channel (SFX + lyre)
      music.ts            // MP3 loading, intro+loop playback, crossfades
      musicManifest.ts    // track IDs → filenames, loop points, volume
      sfx.ts
    save.ts               // localStorage + password encode/decode
  art/
    palette.ts            // NES-like master palette
    sprites/*.ts          // character-grid sprite definitions
    tiles/*.ts            // tilesets per realm
    font.ts               // 8x8 bitmap font
  game/
    states/               // Title, StageSelect, Stage, BossIntro, GetPower, Map, Ending...
    player/
    weapons/
    enemies/
    bosses/
    puzzles/              // switch, block, basin, brazier, etc.
    hud.ts
  levels/
    *.ts                  // level data (tile strings + entity lists)
  data/
    text.ts               // all dialogue/story text in one place
/public
  music/                  // author-supplied MP3s (Section 10.2); empty at first
/tests
DECISIONS.md
README.md
```

---

## 3. Core Feel & Controls

### 3.1 Resolution & Timing
- Internal resolution **256×240**, NES-style. Use the top 16 px for the HUD band and leave the rest for play (or use an overlay HUD in the classic vertical-bar style, see Section 9.6).
- **Fixed 60 updates/second.** All physics values below are in **pixels per frame** at 60 fps.
- Scale the canvas by the largest integer that fits the window. Nearest-neighbor only, no smoothing. Letterbox in black.

### 3.2 Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Move | ← → (or A/D) | D-pad / left stick |
| Climb ladder / vine | ↑ ↓ (or W/S) | D-pad |
| Jump | Z (or Space) | A / Cross |
| Fire | X (or J) | B / Square |
| Cycle power left/right | Q / E | LB / RB |
| Power menu (pause) | Enter | Start |
| Raise lyre (song mode) | C | Y / Triangle |
| Slide | ↓ + Jump | ↓ + A |

Remapping is a nice-to-have (Milestone 12).

### 3.2.1 Touchscreen Controls (required)
The game must be fully playable on phones and tablets with an on-screen controller.

- **Detection:** Show the touch controller automatically when the first `touchstart` event fires, or when `matchMedia('(pointer: coarse)')` matches. Hide it if a keyboard key or gamepad is used, and show it again on the next touch. Include a settings toggle: Auto / Always On / Off.
- **Layout (landscape, primary):** The game canvas is centered and scaled to the largest integer multiple that fits. Controls sit in the side margins or overlay the bottom corners with 35% opacity when there's no margin.
  - **Left side:** an 8-way **D-pad**, 140×140 CSS px, so the player can press up+right and similar diagonals. Use a "dead zone" of 18% in the center. The thumb can slide between directions without lifting.
  - **Right side:** two large round buttons in a classic diagonal: **JUMP** (lower right, 72 px) and **FIRE** (to its left and slightly higher, 72 px). Above them, a smaller **LYRE** button (52 px).
  - **Top corners:** small **◄ POWER ►** cycle buttons (top left) and **PAUSE/START** (top right), 44 px minimum.
  - **Slide:** D-pad down + JUMP, same as on keyboard.
- **Portrait:** Put the canvas at the top of the screen and the controls in the bottom area underneath it, using the same layout. Show a small "rotate for best play" hint once, dismissible.
- **Multi-touch:** Track each touch by `identifier`. The player must be able to hold a direction, hold FIRE (for the Five Smooth Stones charge), and tap JUMP at the same time.
- **Feel:**
  - Buttons register on `touchstart`, never on `touchend`. Zero added latency.
  - Visual press state (button brightens/insets).
  - Optional haptics via `navigator.vibrate(10)` on JUMP/FIRE, with a settings toggle that defaults off.
  - Touch zones are larger than the drawn buttons (+16 px padding) so near-misses still count.
- **Lyre on touch:** While LYRE is held, the D-pad plays the four notes. Show the note arrows on screen during song mode.
- **Menus:** Title, stage select, password grid, and pause menu are all fully navigable by tapping directly on items, as well as by D-pad.
- **Browser behavior:**
  - `touch-action: none` on the game container.
  - Prevent pinch-zoom, double-tap zoom, text selection, long-press callouts, and pull-to-refresh.
  - Use a "tap to start" screen so the WebAudio context unlocks on the first user gesture (required on iOS Safari).
  - Support the Fullscreen API with a fullscreen button. On iOS, which lacks it for non-video elements, add web app manifest + `apple-mobile-web-app-capable` meta so it can be added to the home screen and run full screen.
  - Handle safe-area insets (`env(safe-area-inset-*)`) so controls aren't hidden under notches or home bars.
- **Customization (Milestone 12):** A layout editor in options to drag buttons, resize them (75–150%), and set opacity (20–100%), saved to localStorage.
- **Implementation:** Draw the controller as a DOM/SVG overlay above the canvas, not on the 256×240 canvas. That keeps the controls crisp at any screen density, and the game resolution stays clean. The overlay feeds the same abstract button state as keyboard and gamepad in `input.ts`.

### 3.3 Player Physics (put every value in `config.ts`)
- Walk speed: **1.375 px/frame**. No acceleration: instant start, instant stop. Classic NES crispness matters most here.
- On the first frame of movement from standstill, move **1 px only** (the "inch step"). This lets players make precise adjustments.
- Jump initial velocity: **−4.875 px/frame**.
- Gravity: **+0.25 px/frame²**. Terminal fall speed: **7 px/frame**.
- **Variable jump:** releasing Jump while rising sets vertical velocity to 0 immediately.
- Full air control at walk speed.
- Slide: **2.5 px/frame for 26 frames**. Hitbox shrinks to half height so David can pass through 1-tile gaps. The slide can't be canceled by a jump unless David is out from under a ceiling.
- Ladders/vines: climb speed **0.75 px/frame**. Firing on a ladder is allowed (David faces left or right).
- Hitbox: **14×22 px** standing, **14×12 px** sliding. Sprite is 24×24.

### 3.4 Damage & Health
- Health: **28 units**, shown as a vertical bar of 28 ticks.
- On hit: knockback **1 px/frame away for 16 frames**, then **90 frames of invincibility** with sprite flicker (visible every other 2 frames).
- Bottomless pits and spikes kill instantly. That's genre-standard. Spikes are always telegraphed by tile art.
- Lives start at **3**. Checkpoints are placed at mid-stage and before the boss gate.

---

## 4. Weapons & Powers

### 4.1 The Sling (default weapon)
- Fires a **small round stone pellet**: a 6×6 sprite, light grey with a dark outline and a 1-px highlight.
- Speed: **4 px/frame**, horizontal, straight.
- **Max 3 pellets on screen.** Firing is blocked while 3 exist. This cap defines the game's rhythm. Don't raise it.
- Damage: **1** to standard enemies.
- Firing animation: David's arm whips forward. Hold the "throwing" pose for 12 frames after each shot.
- **Ricochet rule (puzzle hook):** pellets bounce off **bronze shield plates** at 45° or 90° depending on the plate tile's angle. Every other solid surface destroys the pellet. This is the base kit's main puzzle tool.
- Infinite ammo.

### 4.2 Power Energy
- Each freed power has **28 units** of energy. Each use costs the amount listed below.
- Equipping a power **palette-swaps David's tunic** to that power's two colors. This is a core visual signature of the genre.
- Energy refills from dropped **spark motes** (small: +2, large: +10).

### 4.3 The Eight Powers

Every power needs **(a) a combat role** and **(b) at least one puzzle role**. Puzzle objects are defined in Section 6.

| # | Power | From | Cost | Combat behavior | Puzzle uses |
|---|---|---|---|---|---|
| 1 | **Noon Scorch** (fire) | Ketev Meriri | 1 | A fire wave that hugs the ground and climbs walls it hits, travels ~8 tiles. Dmg 2. | Burns **thorn hedges**, lights **braziers**, melts **ice blocks** |
| 2 | **Hermon Frost** (ice) | Shemihazah | 2 | Ice shard fired straight. Freezes small enemies into **ice blocks** for 5 s, and you can stand on them. Dmg 1 (frozen enemies shatter on the next hit). | Freezes **water surfaces** into walkable platforms for 8 s. Freezes falling water into pillars |
| 3 | **Brimstone** (bombs) | Gafrit | 2 | A lobbed sulfur clay pot (arc: vx 2, vy −4) that explodes after 40 frames or on contact. 32×32 blast, dmg 3. | Breaks **cracked stone walls/floors**. Sets off **brimstone barrels** |
| 4 | **Flash Arrow** (lightning) | Resheph | 1 | A fast bolt (6 px/frame) that **chains** to one extra enemy within 4 tiles. Dmg 2. | Charges **standing stones** (activates gates/lifts for 10 s). Fires across gaps instantly |
| 5 | **Screech Gale** (wind) | Lilith | 1 per 10 frames held | Hold to blow a cone of wind 5 tiles long. Pushes light enemies and projectiles back. Dmg 0 to big enemies, knocks small fliers away. | Pushes **wicker crates** and **sail-carts**, spins **windmill wheels**, blows out **demon-fire torches**, clears **sand drifts** |
| 6 | **Deep Bubble** (water) | Leviathan | 2 | A big bubble rolls along the floor and bounces up stairs. Traps a small enemy and carries it off-screen. Dmg 2 to bosses. | Fills **stone basins**, which raises **floating platforms**. Puts out **fire curtains**. David can **ride a bubble** upward for 3 s when it's fired straight up (↑ + Fire) |
| 7 | **Night Veil** (shadow) | Agrat bat Mahalat | 4 | Short shadow-dash (3 tiles, 12 frames) with invincibility, passing through enemies and dealing 2 dmg to each. | Passes through **shadow walls** (purple-black tiles). Lets David stand on **moonlight platforms** only while the veil is active |
| 8 | **Cliff Stone** (earth) | Azazel | 3 | A ground-pound quake that hits every grounded enemy on screen for 2 dmg. Must be grounded to use. | Drops **stalactites** (they become platforms or crush blockers). Raises **stone pillars** from carved sockets. Shakes loose **hanging bridges** |

### 4.4 Special Limited Weapon: The Five Smooth Stones
- Available **only** in the Valley of Elah section.
- Exactly **5 ammo**. A charged throw: hold Fire for 40 frames, and David whirls the sling over his head (a distinct animation and rising pitch sound), then releases.
- Projectile: 8×8, white-gold glow, 5 px/frame, dmg 8.
- Only these stones can hit Goliath's **forehead weak point**. Everything else just plinks off his armor (a "tink" sound and spark effect).
- If David runs out of stones, a **brook** in the arena lets him pick up more one at a time (walk into the water, hold ↓ for 30 frames). This means the fight can't be lost by running out of ammo.

### 4.5 The Lyre (Kinnor) — Song Mode
- Hold **C** to raise the lyre. David can't move while it's up. Enemies keep moving, so play it in safe moments.
- While the lyre is up, press **3 directional inputs** to play a song. Each direction plays a note (↑ = high, ← = mid-low, → = mid-high, ↓ = low) through the triangle channel.
- **Three songs**, learned through the story:
  1. **Song of the Fold** (↓ ← →): learned in the Prologue. **Calms** possessed animals. A calmed animal becomes harmless and some act as platforms (sheep, a sleeping ibex) or helpers.
  2. **Song of Opening** (↑ ↓ ↑): taught by Samuel after the anointing. Opens **sealed harp-gates** marked with a carved lyre glyph.
  3. **Song of Morning** (→ ↑ ←): found in a hidden alcove in Lilith's realm (mandatory story item, impossible to miss). Reveals **hidden light-platforms** for 10 s in darkened rooms. It's also the song played in the Saul epilogue.
- A wrong sequence plays a sour chord and nothing happens. Show the song list and inputs on the pause menu so players never have to memorize them.

### 4.6 Animal Companions (genre "support utility")
- **Ayil the Ram**: unlocked after the first boss. Select from the power menu (cost 4 of a shared "Companion" energy bar, which refills like weapons). Ayil appears and stands still. Jumping on his back launches David with a **high spring jump** (vy −7).
- **The Dove**: unlocked after the fourth boss. Summons a dove carrying a woven mat that flies horizontally in the direction David faces, as a moving platform for 5 s.

---

## 5. The Eight Realms & Their Demons

All eight are open after the Prologue. The stage select is a **3×3 grid**: eight demon portraits around the center, and a portrait of David in the center that looks toward the cursor. That's an homage to the format, not a copy.

### 5.1 Weakness Cycle
Each demon takes **4× damage** from one power and gets a hit-flinch. Each realm is beatable with the sling alone.

```
Noon Scorch   → Shemihazah (frost giant melts)
Hermon Frost  → Gafrit    (cools the brimstone)
Brimstone     → Azazel    (shatters his stone)
Cliff Stone   → Resheph   (grounds the lightning)
Flash Arrow   → Leviathan (water conducts)
Deep Bubble   → Lilith    (soaks her wings)
Screech Gale  → Agrat     (blows her chariot off course)
Night Veil    → Ketev     (shade overcomes the noonday demon)
```

### 5.2 Realm Template
Every realm follows this pattern:
1. **Opening run.** Teaches the realm's hazard. ~2 screens.
2. **Puzzle Room A.** Solvable with the sling, lyre, and David's moves only.
3. **Gauntlet.** Enemies plus the hazard at full intensity. ~3 screens.
4. **Mid-checkpoint.**
5. **Puzzle Room B.** Harder, still base-kit solvable. Contains a **hidden alcove** that needs a specific *other* power to reach, holding a collectible (Section 8.2).
6. **Climb or descent section.** A vertical scroll.
7. **Pre-boss checkpoint**, then a **boss gate** (a two-stage stone door with a slow grinding sound).
8. **Boss arena:** a single screen, locked.

**Target length:** 5–8 minutes for a first-time player.

---

### Realm 1 — WILDERNESS OF ZIN · Boss: **KETEV MERIRI**, the Noonday Demon
- **Lore:** The "bitter destruction" that strikes at noon, a demon of midday heat in rabbinic readings of Deuteronomy 32:24 and Psalm 91:6.
- **Look:** Cracked red-gold desert. A white sky that pulses brighter. Bleached bones in the foreground tiles. Palette: sand, ochre, bone white, deep red.
- **Hazard:** **Sun pulses.** Every 6 s the screen flashes white, and any tile marked "exposed" damages David for 2 if he stands on it. Rock overhangs and awnings provide **shade** tiles.
- **Enemies:** Sand-imps (hop toward the player), vulture spirits (dive in a sine path), heat mirages (fake platforms that vanish when touched, with a slight shimmer tell).
- **Puzzle A:** Ricochet pellets off bronze plates to hit a bell switch that opens a shade awning across a long exposed run.
- **Puzzle B:** Push two stone blocks so their shadows cover the path at the right moment of the pulse cycle. Hidden alcove behind a **thorn hedge** (needs Noon Scorch, so it's a return trip; fine).
- **Boss — Ketev Meriri:** A floating sun-disc with a scowling face and four flame-ribbon arms. 28 HP.
  - Pattern 1: Drifts in a figure-eight and drops fireballs in 3-shot bursts.
  - Pattern 2: Rises off-screen. The arena floor heats in a sweeping band (telegraphed by red shimmer 45 frames ahead). David has to jump between two shade pillars.
  - Pattern 3 (below 10 HP): Moves twice as fast and adds a ring of 8 slow fireballs.
- **Grants:** Noon Scorch.

### Realm 2 — MOUNT HERMON · Boss: **SHEMIHAZAH**, Fallen Watcher of the Heights
- **Lore:** Leader of the Watchers who descended on Mount Hermon (1 Enoch 6).
- **Look:** Icy cliffs, a pale blue night sky with large stars, a frozen waterfall. Palette: white, ice blue, navy, violet.
- **Hazard:** **Slippery ice.** On ice tiles David slides 24 frames to a stop at walk speed and has delayed acceleration. Also **falling icicles** that drop when David passes beneath (shadow tell on the ground).
- **Enemies:** Frost wisps (orbit then charge), ice-shell beetles (shell blocks shots from the front), snow-wraiths (rise out of drifts).
- **Puzzle A:** Calm a possessed mountain ibex with the Song of the Fold. It stops charging and sleeps, and David uses its back as a step to reach a ledge.
- **Puzzle B:** Freezing wind columns push David sideways. He has to time crossings between gusts while ricocheting pellets to hit three bells in order. Hidden alcove needs **Brimstone** to break a cracked ice floor.
- **Boss — Shemihazah:** A towering winged figure of ice with a cracked crown. 28 HP.
  - Pattern 1: Dives across the arena diagonally and leaves icicle spikes on the floor for 3 s.
  - Pattern 2: Hovers and fires a spread of 5 ice shards.
  - Pattern 3: Freezes the floor (ice physics) and slams down, causing a shockwave you have to jump.
- **Grants:** Hermon Frost.

### Realm 3 — SALT FLATS OF SODOM · Boss: **GAFRIT**, the Brimstone Demon *(invented)*
- **Look:** Dead Sea salt pillars, sulfur vents, smoldering ruins. Palette: yellow sulfur, salt white, charcoal, orange.
- **Hazard:** **Sulfur vents** erupt on a cycle (bubbling tell, then a pillar of fire). **Salt-pillar statues** stand in the background. Some are enemies that come alive.
- **Enemies:** Pot-goblins (throw clay pots that explode), salt sentries (stationary, fire salt crystals in 3 directions), cinder bats.
- **Puzzle A:** Push a brimstone barrel onto a pressure plate, then trigger a vent beneath a second barrel to blast open a wall. Vents can be triggered by shooting their caps.
- **Puzzle B:** Conveyor-like sliding salt floors carry crates. Arrange crates under a high ledge using wall switches that reverse the conveyors. Hidden alcove behind a **fire curtain** (needs **Deep Bubble**).
- **Boss — Gafrit:** A squat, horned demon made of cracked basalt with glowing yellow seams, carrying a smoking pot. 28 HP.
  - Pattern 1: Lobs 3 bombs in arcs of different heights.
  - Pattern 2: Leaps to the ceiling and drops, creating floor cracks that erupt with fire.
  - Pattern 3: Rolls into a ball and bounces around the arena walls.
- **Grants:** Brimstone.

### Realm 4 — HIGH PLACE OF RESHEPH · Boss: **RESHEPH**, Lord of Flame and Plague-Arrows
- **Lore:** A Canaanite deity whose name the Hebrew Bible uses for flame, plague, and lightning-bolts (e.g. Habakkuk 3:5, Psalm 78:48, Song of Songs 8:6).
- **Look:** A ruined hilltop shrine during a thunderstorm. Black clouds, rain streaks, lightning-lit silhouettes of standing stones. Palette: storm grey, electric cyan, white, dark green.
- **Hazard:** **Lightning strikes.** A bright ground marker appears 60 frames before a bolt lands. Also **charged water puddles** that damage on contact when lit.
- **Enemies:** Storm hounds (charge along the ground), arrow-spirits (fire bolts in straight lines), cloud jellies (float and drop sparks).
- **Puzzle A:** A gate opens only while two **standing stones** are lit. Use a lightning strike to charge one by luring a strike-marker near it. Then use a pellet ricochet to ring a bell that redirects a strike to the other.
- **Puzzle B:** A dark tower climb where platforms are visible only during lightning flashes (every 3 s). Hidden alcove behind a **shadow wall** (needs **Night Veil**).
- **Boss — Resheph:** A tall figure with a gazelle-horned crown, a bow of lightning, and a cape of storm cloud. 28 HP.
  - Pattern 1: Fires 3 lightning arrows at David's position (aimed, 30 frames apart).
  - Pattern 2: Teleports to the screen edge and calls 4 strikes across the floor in sequence (left to right).
  - Pattern 3: Electrifies the floor for 2 s. David must stand on the two insulated stone blocks.
- **Grants:** Flash Arrow.

### Realm 5 — RUINS OF EDOM · Boss: **LILITH**, the Night Screecher
- **Lore:** Named in Isaiah 34:14 among creatures of desolate Edom. The later legend makes her a demon of night and the owl.
- **Look:** Overgrown desert ruins at dusk turning to night, owls on broken columns, thorny vines. Palette: dusk purple, rust, bone, olive.
- **Hazard:** **Wind gusts** from offscreen that push David (flag-and-sand-particle tell). **Darkness rooms** where the only light is a small radius around David.
- **Enemies:** Owl-spirits (swoop in pairs), thorn crawlers, jackal shades (pack of 3, run and leap).
- **Story item:** The **Song of Morning** is in this realm, in a lit shrine on the main path.
- **Puzzle A:** Use the gusts: jump at the right moment to ride a gust across a gap too wide to jump unaided. Bells shift the gust direction.
- **Puzzle B:** In darkness rooms, play the Song of Morning to reveal light-platforms for 10 s. Ring bells to reset the song cooldown (8 s). Hidden alcove needs **Cliff Stone** to drop a stalactite as a step.
- **Boss — Lilith:** A woman-shaped silhouette with great owl wings and long dark hair that moves like smoke. 28 HP. *(Keep the design non-sexualized: a robed figure, shrouded, with an owl mask.)*
  - Pattern 1: Glides across the top of the screen and drops feather darts.
  - Pattern 2: Screech: a gust that pushes David toward a wall of thorns.
  - Pattern 3: Splits into 3 owl shapes. Only the one with glowing eyes is real.
- **Grants:** Screech Gale.

### Realm 6 — DEPTHS OFF JAFFA · Boss: **LEVIATHAN**
- **Lore:** The primordial sea serpent (Isaiah 27:1, Job 40–41, Psalm 104:26).
- **Look:** A coastline descending into an underwater realm: kelp, a sunken ship, bioluminescent creatures. Palette: deep teal, navy, sea green, coral.
- **Hazard:** **Underwater physics:** gravity 0.08, max fall 2, jump −3.5 sustained, so jumps go higher and slower. **Currents** push horizontally. **Tide rise/fall** sections change the water line.
- **Enemies:** Spiny urchins (stationary, fire spines when approached), eel spirits (dart out of holes), anglerfish shades (lure light, then lunge).
- **Puzzle A:** Pull levers to open sluice gates in the right order so the water level drops and opens the path. A wrong order floods spikes into reach.
- **Puzzle B:** Steer a floating barrel through a current maze by shooting it (each hit nudges it) to block a spike vent. Hidden alcove behind a **cracked wall** (needs **Brimstone**).
- **Boss — Leviathan:** A huge coiled serpent. The arena is a single screen with the serpent's coils as moving platforms. 28 HP, with a head weak point.
  - Pattern 1: Head rises and fires a stream of water bubbles in an arc.
  - Pattern 2: Coils shift across the arena (platforms move).
  - Pattern 3: Lunges horizontally across the screen. David must stand on top of a coil to dodge.
- **Grants:** Deep Bubble.

### Realm 7 — CITY OF NIGHT · Boss: **AGRAT BAT MAHALAT**, Dancer of the Dark Chariot
- **Lore:** A queen of demons in Talmudic lore (Pesachim 112b) who roams at night with a host of spirits.
- **Look:** An abandoned city at midnight with lanterns, purple fog, and empty market stalls. Palette: black, deep purple, lantern gold, magenta.
- **Hazard:** **Lantern zones.** Shadow creatures can only be harmed when they're inside lantern light. **Shifting shadow platforms** appear and vanish on a 4-beat rhythm synced to the stage music.
- **Enemies:** Shadow hounds (immune outside light), drum spirits (beat in rhythm and fire shockwaves on the beat), possessed masks (float and spin).
- **Puzzle A:** Push lantern carts to light the path. Enemies become hittable and hidden platforms appear.
- **Puzzle B:** A rhythm puzzle. Shoot drums in the sequence shown by flashing banners on a wall to open the gate. Hidden alcove needs **Screech Gale** to blow away a sand drift.
- **Boss — Agrat:** A whirling figure in a chariot of shadow drawn by two spectral horses, circling the arena. 28 HP. Keep it stylized and non-sexualized: veiled dancer, chariot, ribbons.
  - Pattern 1: The chariot races across the floor. David must jump over it.
  - Pattern 2: She leaps from the chariot and dances, throwing crescent blades in a spiral.
  - Pattern 3: The arena goes dark except for a lantern above David. She's only visible in its light.
- **Grants:** Night Veil.

### Realm 8 — CLIFF OF AZAZEL · Boss: **AZAZEL**
- **Lore:** From the scapegoat ritual (Leviticus 16), later traditions tie Azazel to a wilderness cliff and to the Watchers.
- **Look:** A sheer canyon, crumbling cliffs, a scapegoat rope bridge, swirling red dust. Palette: rust, dark brown, red, pale sky.
- **Hazard:** **Crumbling platforms** (shake for 30 frames before falling). **Rockslides** from above (dust tell). Vertical climb sections.
- **Enemies:** Rock goats (charge and ram), boulder spirits (roll down slopes), dust devils (spin and pull David toward them).
- **Puzzle A:** Calm a herd of possessed goats with the Song of the Fold so they stop charging. They then line up as a moving bridge across a chasm.
- **Puzzle B:** Shoot support posts in the right order to drop a rope bridge into position without dropping it into the gorge. Hidden alcove needs **Hermon Frost** to freeze a falling waterfall into a climbable pillar.
- **Boss — Azazel:** A huge goat-headed figure wrapped in a red cord, with stone arms. 28 HP.
  - Pattern 1: Slams his fists and boulders drop from the ceiling.
  - Pattern 2: Charges across the arena horns-first. He's stunned when he hits a wall, which is the moment to strike.
  - Pattern 3: Breaks the arena floor, leaving only 3 platforms.
- **Grants:** Cliff Stone.

---

## 6. Puzzle System

### 6.1 Puzzle Design Rules
1. **Every main-path puzzle is solvable with the base kit** (sling, jump, slide, lyre, already-unlocked companions). No softlocks, ever. Optional alcoves are the only place a specific power is required.
2. **Readable at a glance.** Every interactive object has a distinct tile and a visible state change (lit/unlit, open/closed).
3. **Reset on room re-entry.** Leaving and returning resets the room's puzzle state. Add a **reset bell** (a small bronze bell on a post) in every puzzle room that resets it on hit.
4. **Fail fast.** Fail states (crate stuck, wrong order) should be obvious and fixable within seconds.

### 6.2 Puzzle Object Catalog
Each object is its own class in `/src/game/puzzles/`, with `update`, `render`, `onHit(weaponType)`, and `getState`/`setState` methods.

| Object | Behavior |
|---|---|
| **Bell switch** | Toggles a linked target when hit by any projectile. Variants: momentary (resets after N frames) and toggle |
| **Bronze shield plate** | Reflects sling pellets. Angle set per tile: `/`, `\`, `|`, `—` |
| **Pressure plate** | Active while David, a crate, a barrel, or a frozen enemy is on it |
| **Pushable stone block** | David pushes at 0.5 px/frame by walking into it. Falls with gravity |
| **Wicker crate** | Light. Can be pushed by walking or by Screech Gale. Burns with Noon Scorch |
| **Brazier** | Lit by Noon Scorch or another lit brazier's flame (chain). Lit braziers open linked doors |
| **Thorn hedge** | Blocks movement. Burned by Noon Scorch (and respawns on room reset) |
| **Ice block** | Solid. Melted by Noon Scorch |
| **Water surface** | Frozen by Hermon Frost for 8 s, becoming a solid platform |
| **Cracked wall/floor** | Destroyed by Brimstone |
| **Brimstone barrel** | Explodes when hit by fire or bombs. Destroys cracked walls in a 3×3 tile radius |
| **Standing stone** | Charged by Flash Arrow or lightning. Stays lit for 10 s |
| **Windmill wheel** | Spun by Screech Gale. Raises a linked lift while spinning |
| **Demon-fire torch** | Blocks a passage with flame. Put out by Screech Gale or Deep Bubble |
| **Fire curtain** | Damaging barrier. Put out by Deep Bubble |
| **Stone basin** | Filled by Deep Bubble. Raises a linked floating platform |
| **Shadow wall** | Passable only during Night Veil |
| **Moonlight platform** | Solid only during Night Veil |
| **Stalactite** | Dropped by Cliff Stone. Becomes a platform when landed |
| **Pillar socket** | Raises a stone pillar with Cliff Stone |
| **Sand drift** | Blown away by Screech Gale |
| **Harp-gate** | Opens with Song of Opening |
| **Light-platform** | Hidden until Song of Morning is played (10 s) |
| **Possessed animal** | Calmed with Song of the Fold. Then becomes passive / a platform / a helper |
| **Reset bell** | Resets all puzzle objects in the current room |

### 6.3 Puzzle Data Format
Puzzle objects live in the level entity list with an `id` and a `links: string[]` array. For example, a bell with `links: ["door_3"]` toggles `door_3`. Support `AND` / `OR` link groups: `{ "type": "door", "id": "door_3", "requires": { "all": ["brazier_1", "brazier_2"] } }`.

---

## 7. Enemies — Common Rules
- Enemies spawn when their spawn point enters the camera +16 px, and despawn when they're 64 px off-screen. They respawn when the spawn point scrolls off and back on (classic NES behavior).
- Standard HP: 1–4. Contact damage: 2–4. Projectile damage: 2–3.
- Drops on death (random): 75% nothing, 12% small health honey drop (+2 HP), 6% small spark mote (+2 energy), 3% large honey jar (+10 HP), 2% large spark (+10 energy), 2% 1-up (a small David head icon).
- Each enemy gets **one clear behavior** and **one clear tell**. Keep AI simple and readable, NES-style.
- Every realm needs at least **3 enemy types** plus one **mini-boss** in the gauntlet section (a bigger enemy with ~10 HP and 2 attack patterns, for example a giant sand-imp, an ice ram, a sulfur golem).

---

## 8. Progression, Items & Saves

### 8.1 Items
- **Honey drop / honey jar:** restores health.
- **Spark mote (small/large):** restores the equipped power's energy (or Companion energy if a companion is equipped).
- **Horn of Oil** (energy-tank equivalent): carry up to 4. From the pause menu, use one to refill all health. Placed in hidden alcoves and on hard-to-reach main-path ledges.
- **1-up:** a David head icon.

### 8.2 Collectibles (Optional)
- **Psalm fragments:** one per realm, in the hidden alcove (8 total). Collecting all 8 unlocks a short **bonus credits scene** of David composing on the lyre, plus the **Sound Test** menu.
- Each fragment shows one short public-domain Psalm verse on pickup (use KJV or JPS 1917 wording; keep each to one line). Put the verses in `data/text.ts` with references.

### 8.3 Story Gating
- The prologue must be cleared first.
- All 8 realms are open after the prologue, in any order.
- The Fortress unlocks when all 8 sparks are freed.
- Completed realms can be replayed from stage select (to collect alcoves).

### 8.4 Saving
- **3 localStorage save slots**: autosave after each boss and each fortress section.
- **Password system (homage):** after each boss, show a **6×6 grid password** using small icons (star, lyre, sling, olive branch, flame, wave). Encode: which bosses are beaten (8 bits), Horns of Oil carried (0–4, 3 bits), Song of Morning acquired (1 bit), and a checksum (4 bits). The Title screen offers "Continue (Password)" where players place icons on the grid. Codex: implement encode/decode with unit tests.

---

## 9. Graphics

### 9.1 Overall Style
- **NES-authentic constraints**, enforced by convention in the art data (no need for hardware emulation):
  - Sprites: **3 colors + transparent** per sprite (David is drawn in two overlapping sprite layers like NES heroes, so he gets more colors).
  - Background tiles: **16×16 metatiles** made of **8×8 tiles**, each 16×16 block using one **4-color palette** (3 colors + shared background color).
  - **Max 4 background palettes and 4 sprite palettes per realm.**
- Strong black outlines on sprites. Flat colors, no gradients, no anti-aliasing.
- Background: single flat sky color, plus one layer of decorative background tiles (no parallax, or at most a simple 2-layer parallax for skies only. Codex can choose, note it in DECISIONS.md).

### 9.2 Master Palette
Use a 54-color NES-like palette defined in `art/palette.ts`. Don't copy any specific emulator's exact palette table. Approximate a 1980s TV look: slightly desaturated primaries, warm whites, deep but not pure blacks for outlines (`#0A0A0A` is fine for outlines; screen black `#000000`).

### 9.3 David
- **Sprite size:** 24×24 for the main body.
- **Look:** Ruddy, curly red-brown hair (1 Sam 16:12, "ruddy"), bright eyes, a short tan shepherd's tunic belted with a rope, sandals, and a shepherd's pouch at the hip. The sling is in his right hand. The pellet is visibly small and round.
- **Palette (default):** skin tone, tunic tan, tunic shadow brown, hair red-brown. When a power is equipped, swap **tunic color + tunic shadow** (Section 9.5).
- **Animation frames:**
  - Idle: 2 frames (blink every ~3 s).
  - Run: 4 frames.
  - Jump: 1 frame (rising) + 1 frame (falling).
  - Throw: 1 frame overlay pose (arm extended, sling whipping) usable during idle, run, jump, climb.
  - Slide: 1 frame.
  - Climb: 2 frames (alternate).
  - Hurt: 1 frame.
  - Lyre: 1 frame (lyre raised) + 2-frame strum.
  - Whirl (Five Smooth Stones charge): 3 frames, sling spinning overhead.
  - Teleport-in / out equivalent: David descends in a **column of light** at stage start and ascends at the end. Make it a vertical beam effect, a 4-frame materialize.

### 9.4 Sprite Data Format
Define sprites as arrays of strings where each character is a palette slot. `.` is transparent.
```ts
export const DAVID_IDLE_0 = {
  w: 24, h: 24,
  palette: ['transparent', 'outline', 'skin', 'tunic', 'tunicShadow', 'hair'],
  rows: [
    "........111111..........",
    ".......15555551.........",
    // ...
  ]
};
```
`palette` names map to the current realm/weapon palette, which makes palette swaps trivial. Write a `rasterize(sprite, paletteMap)` utility that builds an `HTMLCanvasElement` once and caches it per palette.

### 9.5 Power Palettes (David's tunic when equipped)
| Power | Tunic | Shadow |
|---|---|---|
| Sling (default) | tan | brown |
| Noon Scorch | orange | red |
| Hermon Frost | ice blue | navy |
| Brimstone | sulfur yellow | charcoal |
| Flash Arrow | cyan | grey |
| Screech Gale | lavender | dusk purple |
| Deep Bubble | sea green | teal |
| Night Veil | black | magenta |
| Cliff Stone | rust | dark brown |

### 9.6 HUD
- **Vertical bars** at top-left, the genre-standard look: a health bar (28 ticks, honey gold), then the current power's energy bar (in the power's tunic color) right beside it, shown only when a power is equipped.
- Small David head icon + lives count at bottom-left during pause only.
- A boss health bar appears on the right side when a boss fight starts. It fills tick by tick with a rising tone, which is the genre's signature tension beat.
- Font: 8×8 bitmap, uppercase-only, defined in `art/font.ts`.

### 9.7 Screens
- **Title:** Night sky over the hills of Bethlehem, a single star, a silhouette of David with a sling and a few sheep. Title text: **SHEPHERD OF ELAH** in large chunky pixel letters, with "PRESS START" blinking.
- **Stage select:** 3×3 grid. Each demon portrait is a 32×32 bust in its own realm palette. Defeated demons are replaced by a lit spark icon. Center: David looking toward the cursor.
- **Boss intro:** The demon's name types out letter by letter with a sting, over a starfield in the realm's colors. The demon does a 1-second pose.
- **Get Power screen:** David stands in a column of light. The spark spirals into him and his tunic flashes through the new palette. Text: "DAVID FREED THE SPARK OF [DEMON]. YOU GOT [POWER]!" Then a short demo of the power on a dummy target.
- **Map interstitial (optional, nice):** after each boss, a pixel map of the land shows the freed realm's color returning.

---

## 10. Audio

### 10.1 Synth (SFX and lyre only)
Emulate NES-style channels with WebAudio. The synth handles every sound effect and the player-performed lyre notes. It does **not** play music.
- **2 pulse channels:** square waves with selectable duty cycle (12.5%, 25%, 50%) via `PeriodicWave`.
- **1 triangle channel:** the lyre notes and low SFX.
- **1 noise channel:** explosions, hits, and impacts (white-noise buffer through a gain envelope; use a shorter looped buffer for a "metallic" variant).
- **Lyre tuning:** The four lyre notes are set in `config.ts` as frequencies (default: D4, F4, A4, D5). The author may retune these to match the Suno tracks once they exist.

### 10.2 Music: Author-Supplied MP3s
The author will generate all music in Suno and supply it as MP3 files later. Codex builds the full playback system now, works with **no music files present**, and picks up files automatically once they're dropped in.

**File location and naming.** Files go in `/public/music/` using the exact filenames in the table in 10.3. Codex must also write a `/public/music/README.md` that repeats the table, so the author knows what to name each file.

**Manifest.** `musicManifest.ts` maps each track ID to:
```ts
{
  id: 'realm_zin',
  file: 'realm_zin.mp3',
  loop: true,
  loopStart: 0,      // seconds; where the loop restarts (after any intro)
  loopEnd: null,     // seconds; null = end of file
  volume: 1.0,       // per-track trim, 0–1.5
}
```
The author edits `loopStart`/`loopEnd`/`volume` by hand after hearing each track. Document this in the README.

**Playback rules:**
- Load with `fetch` → `decodeAudioData` → play through an `AudioBufferSourceNode`, using its `loop`, `loopStart` and `loopEnd` properties. That gives a **gapless loop**. Do **not** use an `<audio>` element for looping music, since it leaves a gap at the loop point.
- **MP3 padding:** MP3 encoding adds a little silence at the start and end, which causes an audible hiccup at the loop point. The manifest's `loopStart`/`loopEnd` fix this. Also add a `trimStart` field (default 0) to skip leading silence on first play.
- **Lazy loading:** Load only the tracks needed for the current state and the next likely one (e.g. on stage select, preload the boss theme). Cache decoded buffers, and keep at most ~6 in memory on mobile.
- **Missing files:** If a file 404s or fails to decode, log a console warning once and play **silence**, never crash or block. The game must be fully playable with an empty `/public/music/` folder.
- **Transitions:** 0.5 s crossfade between looping tracks. Jingles (non-looping) play over a ducked or stopped music track, then the music resumes or the next state's track starts.
- **Ducking:** While the lyre is raised, duck music to 35% so the player's notes are clear. Restore over 0.3 s when lowered.
- **Pause:** Pausing drops music to 40% (or stops it; choose and log in `DECISIONS.md`). Unpausing restores it.
- **Boss sync:** The boss track starts when the boss health bar begins filling (Section 9.6).
- **Mobile:** Music starts only after the tap-to-start unlock. Resume the `AudioContext` on `visibilitychange` when the tab returns.
- **Volume:** Separate Music and SFX volume sliders in options (defaults: Music 70%, SFX 80%), saved to localStorage.
- **Sound Test** (Milestone 12) lists every manifest track and plays it, marking missing files as "NOT FOUND."

### 10.3 Track List (filenames + Suno direction)
The style notes double as starting prompts for Suno. Overall direction for the score: **8-bit chiptune**, NES-era, with an ancient Near Eastern flavor: **Phrygian dominant / Freygish** and **harmonic minor** modes, fast arpeggios, driving bass, a strong hook melody. No vocals. The title theme's main motif should recur across tracks where possible.

| Track ID | File | Loops | Style direction |
|---|---|---|---|
| title | `title.mp3` | yes | Main theme. Heroic, mysterious, Freygish hook |
| stage_select | `stage_select.mp3` | yes | Short, upbeat, anticipatory |
| prologue | `prologue.mp3` | yes | Pastoral, major key, gentle shepherd melody (the one major-key stage) |
| anointing | `anointing.mp3` | yes | Slow, sacred, awe |
| realm_zin | `realm_zin.mp3` | yes | Desert heat, relentless drive |
| realm_hermon | `realm_hermon.mp3` | yes | Icy, high arpeggios, cold and spacious |
| realm_sodom | `realm_sodom.mp3` | yes | Heavy, smoldering, ominous |
| realm_resheph | `realm_resheph.mp3` | yes | Stormy, fast, electric |
| realm_edom | `realm_edom.mp3` | yes | Haunted ruins at dusk, eerie |
| realm_jaffa | `realm_jaffa.mp3` | yes | Underwater, flowing, slower tempo |
| realm_night | `realm_night.mp3` | yes | Midnight city, dance rhythm, strong steady beat (the shadow platforms sync to it, see note) |
| realm_azazel | `realm_azazel.mp3` | yes | Rugged canyon, pounding |
| boss | `boss.mp3` | yes | Shared demon boss fight, urgent |
| elah | `elah.mp3` | yes | Valley of Elah, battle march |
| goliath | `goliath.mp3` | yes | Giant boss, heavy and slow-building |
| ashmedai_hall | `ashmedai_hall.mp3` | yes | Demonic tower, dark grandeur |
| ashmedai_final | `ashmedai_final.mp3` | yes | Final boss, epic |
| saul | `saul.mp3` | yes | Quiet, sorrowful, sparse; leaves room for the player's lyre |
| coronation | `coronation.mp3` | no | Triumphant major-key arrangement of the title theme |
| credits | `credits.mp3` | no | Credits roll |
| jingle_get_power | `jingle_get_power.mp3` | no | 3–5 s |
| jingle_stage_clear | `jingle_stage_clear.mp3` | no | 3–5 s |
| jingle_boss_intro | `jingle_boss_intro.mp3` | no | 2–4 s sting |
| jingle_game_over | `jingle_game_over.mp3` | no | 3–5 s |
| jingle_song_learned | `jingle_song_learned.mp3` | no | 3–5 s, played when a lyre song is learned |

**Rhythm sync (City of Night).** The shifting shadow platforms in Realm 7 run on a 4-beat cycle. Put a `bpm` field in that track's manifest entry (default 120). The platform timer runs off the game clock at that BPM, not off audio analysis, so it works even if the file is missing. The author sets the real BPM once the track exists.

**Fallback jingles:** If a jingle file is missing, play a short synth stand-in (a rising arpeggio for get-power/stage-clear, a descending one for game over), so these moments never go silent.

### 10.4 SFX List
Sling throw (short "whip" pulse sweep), pellet hit on enemy, pellet ricochet (bright ping), pellet dissipate, jump (rising blip), land, hurt, death (spark burst), enemy death (puff), item pickup, health fill (ticks), energy fill, power switch, each power's fire sound (8), explosion, bell switch (bell tone), door grind, gate open, lyre notes (4) + wrong-song sour chord, stone whirl (rising pitch), Goliath armor "tink," boss bar fill, pause.

---

## 11. The Fortress

### 11.1 Valley of Elah
- **Stage 1: The Philistine Lines.** A siege-camp run with Philistine shield-bearers (block from the front, must be hit from above or behind), spear throwers, and war chariots. Ends at the brook.
- **The Brook:** cutscene. David kneels and picks up five smooth stones (Section 4.4). Text: "HE CHOSE FIVE SMOOTH STONES OUT OF THE BROOK."
- **Boss — GOLIATH:** A giant two screens tall. The camera zooms out to show him (render him as a large multi-part sprite; the arena is one screen and he fills the right half). Bronze helmet, scale armor, spear like a weaver's beam. HP 40, but **only Five Smooth Stones hitting his forehead do damage** (8 per hit = 5 hits).
  - Pattern 1: Spear thrust along the floor (telegraphed by drawing back). Jump it.
  - Pattern 2: Stomps, which drop rocks from the cliff above.
  - Pattern 3: His shield-bearer appears and blocks shots at intervals. Time your throw when the shield drops.
  - The forehead opening is only exposed when he leans down to taunt (every ~4 s, a "taunt" text bubble appears).
  - On defeat: Goliath falls slowly in a big crash, the screen shakes, and he dissolves into black smoke. **No blood or gore.** The smoke forms a face that laughs: Ashmedai revealed.

### 11.2 Hall of Ashmedai
- **Stage 2: The Tower of Shadows.** A vertical climb through a demonic tower that remixes hazards from all 8 realms. Every power has at least one required use here (the realm's power is now guaranteed to be available, so this isn't a softlock).
- **Stage 3: Boss Rematch Hall.** Eight doors, each leading to a rematch with one demon. Clear all eight in any order. A health/energy refill room sits in the center.
- **Stage 4: Ashmedai's Throne.**
- **Final boss — ASHMEDAI, King of the Demons:**
  - **Look:** A crowned figure on a floating throne. Rooster-like feet (a nod to the legend), dark royal robes, and a crown of black flame. Make him visually distinct from every other boss: larger, regal, unsettling.
  - **Phase 1 (28 HP):** Seated on the throne. Fires projectiles in patterns pulled from 4 of the 8 demons (one at a time, telegraphed by the color of his crown flame). Phase 1 weakness: **Flash Arrow**.
  - **Phase 2 (28 HP):** Throne shatters. He walks and leaps around the arena, swinging a flaming scepter and summoning shadow hounds. Weakness: **Noon Scorch**.
  - **Phase 3 (28 HP):** He grows to fill the background, and only his head and two hands are targets. The arena floor breaks into platforms. Weakness: **Song of Morning** played successfully stuns him for 3 s and makes him take double damage from everything during that window. This is the climax: the lyre beats the king of demons.
  - On defeat: a burst of light. The 8 sparks rise and join into one, and the screen fades to white.

---

## 12. Epilogue & Ending

### 12.1 Saul's Palace (non-combat)
- A small playable room: Saul's throne room. Saul sits in darkness, with a faint shadow shape moving around him.
- David walks to a marked spot and raises his lyre. The player must play the **Song of Morning** 3 times. With each play, the room brightens and the shadow shrinks.
- On the third, the shadow leaves through the window as a flock of black birds turning into white ones (a stylized effect). Saul's sprite relaxes.
- Text: "SO SAUL WAS REFRESHED, AND WAS WELL, AND THE EVIL SPIRIT DEPARTED FROM HIM." (1 Sam 16:23, KJV.)

### 12.2 Coronation
- A montage of 4 still pixel panels (each fades in, holds 4 s, fades out), one line of text each:
  1. David leading the people, sling at his belt.
  2. A road to Hebron.
  3. The crown placed on David's head. Elders around him; the anointing horn of oil echoes the prologue.
  4. King David on his throne in Jerusalem, lyre in hand, sling hanging on the wall behind him.
- Final text: **"AND DAVID REIGNED OVER ALL ISRAEL."** (Paraphrase of 2 Sam 8:15.)
- Credits roll over the ending theme, showing each demon defeated with its realm restored.
- After credits: "THE END". If all 8 Psalm fragments were found, play the bonus lyre-composing scene, then "THE END".

---

## 13. Difficulty & Accessibility
- **Normal** is the designed difficulty described in this doc.
- **Easy ("Shepherd")**: half damage taken, 5 lives, more drops, no instant-kill pits (falling returns David to the last solid ground with -4 HP).
- **Hard ("Warrior")**: 1.5× damage, faster boss patterns, no Horns of Oil in shops/alcoves (still found as main-path rewards only).
- Options: screen shake on/off, flash reduction (replaces full-screen flashes with a dim pulse; **required**, given the lightning and sun-pulse hazards), music/SFX volume, show input on song mode.

---

## 14. Build Milestones (do these in order)

Each milestone ends with a playable build and a short note added to `DECISIONS.md`.

1. **Engine skeleton.** Vite + TS project. 256×240 canvas, integer scaling, fixed 60 Hz loop, input (keyboard + gamepad + **touch overlay per 3.2.1**), tap-to-start audio unlock, state machine with Title → Test Room. Test on a real phone from this milestone on.
2. **David moves.** Sprite rasterizer + palette system, David idle/run/jump/fall/slide/climb with exact physics from 3.3. Tile collision on a test room built from a tile string.
3. **The sling.** Pellets, 3-on-screen cap, throw pose, hit/despawn, ricochet off bronze plates. A test enemy (walks back and forth, 2 HP).
4. **HUD + damage.** Health bar, hurt/knockback/invincibility, death, lives, checkpoint respawn, game over.
5. **Camera + level format.** Scrolling with room-based transitions (horizontal and vertical screen-scroll transitions, NES-style), entity spawning/despawning rules from Section 7.
6. **Audio.** Synth + all SFX. MP3 music system per 10.2 (manifest, gapless loop, crossfade, ducking, missing-file silence, fallback jingles). Test with one placeholder MP3 (any short royalty-free test loop, or a generated sine tone) and with an empty folder. Write `/public/music/README.md`.
7. **Prologue stage.** Full playable tutorial: Bethlehem fields, lion and bear mini-bosses, Samuel anointing scene with text, Song of the Fold + Song of Opening learned, lyre mode working.
8. **Puzzle framework.** All base-kit puzzle objects (bell, plate, pressure plate, pushable block, crate, reset bell, harp-gate, possessed animal) with link/requires logic and room reset.
9. **Stage select + first realm.** Choose Wilderness of Zin. Build the full realm per template, the Ketev boss, boss bar fill, Get Power screen, Noon Scorch with combat + puzzle uses, power palette swap.
10. **Remaining seven realms.** One at a time: realm, enemies, mini-boss, boss, power, puzzle objects. After each, verify the weakness cycle and that the realm is beatable with the sling only.
11. **Fortress + ending.** Valley of Elah, Five Smooth Stones, Goliath, Tower, rematch hall, Ashmedai three phases, Saul epilogue, coronation, credits.
12. **Polish.** Save slots, passwords, difficulty modes, options (flash reduction required), companions (Ram, Dove), Horns of Oil, Psalm fragments, Sound Test, key remapping, touch layout editor.

---

## 15. Acceptance Criteria (must all pass)
- [ ] Runs at a steady 60 fps on a mid-range laptop in Chrome, Firefox, and Safari.
- [ ] All art and sound effects are generated from code. The only external assets are the author's MP3s in `/public/music/`.
- [ ] The game runs and is completable with `/public/music/` empty, with no errors beyond one warning per missing file.
- [ ] Dropping a correctly named MP3 into `/public/music/` makes it play in the right place with no code change. Loops are gapless at the manifest loop points.
- [ ] David's physics match Section 3.3 values (verified by unit tests on the physics step).
- [ ] Never more than 3 sling pellets on screen.
- [ ] All 8 realms are completable using only the sling and base kit (play-tested; write a test checklist in `TESTING.md`).
- [ ] Each boss takes 4× damage from exactly the power listed in 5.1.
- [ ] Each power has at least one combat use and one puzzle use that appears in at least two realms.
- [ ] Each puzzle room has a reset bell, and puzzle state resets on room re-entry.
- [ ] Equipping a power swaps David's tunic palette.
- [ ] Password encode/decode is round-trip tested for all valid states and rejects invalid checksums.
- [ ] Flash reduction option removes all full-screen white flashes.
- [ ] No Capcom/Mega Man names, sprites, music, or level layouts anywhere.
- [ ] No gore. Defeated enemies and bosses dissolve into smoke, light, or sparks.
- [ ] `npm run build` produces a static site that runs from GitHub Pages.
- [ ] Full game is completable on an iPhone (Safari) and an Android phone (Chrome) using only the touch controller, including diagonal D-pad input, hold-FIRE charging while moving, and lyre songs.
- [ ] No page zoom, scroll, or text selection is triggered by gameplay touches. Controls clear notches and home bars.

---

## 16. Text Bank (for `data/text.ts`)
Keep all on-screen text in one file, uppercase, short lines (max 28 characters per line at 8×8).

- Title: "SHEPHERD OF ELAH"
- Prologue open: "BETHLEHEM. THE FIELDS OF JESSE."
- After bear: "THE LORD THAT DELIVERED ME / FROM THE PAW OF THE LION / AND THE BEAR..." (1 Sam 17:37, KJV, shortened)
- Samuel: "ARISE, ANOINT HIM: FOR THIS IS HE." (1 Sam 16:12, KJV)
- The Breaking: "A SPIRIT TROUBLES THE KING. / THE SEAL IS BROKEN. / EIGHT HAVE ESCAPED."
- Samuel's charge: "FREE THE SPARKS, DAVID. / WHAT IS BROKEN CAN BE MENDED."
- Stage select: "CHOOSE YOUR PATH"
- Get Power: "DAVID FREED THE SPARK / OF [NAME]. / YOU GOT [POWER]!"
- Fortress unlock: "THE GIANT WAITS / IN THE VALLEY OF ELAH."
- Goliath taunt bubble: "COME TO ME!" (paraphrase of 1 Sam 17:44)
- David reply (pre-fight): "I COME TO THEE IN THE NAME / OF THE LORD OF HOSTS." (1 Sam 17:45, KJV, shortened)
- Game over: "THE FLOCK STILL NEEDS YOU." with CONTINUE / PASSWORD / TITLE.
- Ending lines: per Section 12.

---

*End of spec. When anything is ambiguous: keep it simple, keep it NES-like, keep it readable, and log the decision.*
