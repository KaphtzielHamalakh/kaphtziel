# First two nights: implementation scope

Based on Benjamin Newman's attached *The Legend of Hanukkah Hippo: The Eight Nights — Game Design Outline* (October 19, 2026). This file summarizes the implemented milestone; it is not a reproduction of the complete outline.

Harry carries Bubbe's shamash from Judea to the Great Olive and enters the Oil Press. He recovers the Dreidel, solves the press and crystal gates, defeats Shibta and brings the First Flame back to the Great Menorah. The grove changes from a muted blue palette to green, and Harry gains a Heart Container.

Core rules: four-way movement on 16×11-tile screens, 60 Hz simulation, lane adjustment when changing axes, three starting hearts, a short-range mallet and full-health hammer throw, directional pan, readable darkness, persistent items and keys, automatic saves, keyboard and touch from the first chapter.

The Oil Press has twelve connected rooms, two small keys, a map, a compass, one dim crossing, a single-push oil-channel puzzle, a ranged crystal, splitting slimes, the Bruiser guarding the Dreidel, and Shibta. Shibta signals three lunges and rests after the third; six mallet hits recover the flame. A washing basin provides one second of contact protection per visit.

Future campaign, in the supplied outline's order: Latke Furnace / Ketev Meriri, Sunken Mikveh / Shabriri, Gelt Mines / Azazel, Dreidel Tower / Agrat bat Mahlat, Frozen Hall / Samael, Dark Library / the Dybbuk, Goblin Keep / Lilith, then the Temple / Asmodeus. Future systems include the full 96-screen overworld, item gates, Judea's shops and side quests, the Lamplighter, Belial's visits, the Temple oil gauntlet, and the Shammai Quest.

## Night Two expansion

Four Frying Flats screens lead to a fourteen-room Latke Furnace. Implemented: two keys, independent map/compass, Jelly Bombs (eight-bomb bag, 90-tick fuse, self-damaging area blast), a cracked-flue gate, left/right/middle oven order, a forward-facing hollow statue, warning/hot griddles and Ketev Meriri. Ketev telegraphs, rolls and bounces, then stops to expose its heart-eye and breathe a cone. Three bombs during that opening recover the Second Flame. The Flats brighten, and the Great Menorah shows both recovered lights.

The first two nights accept either completion order. Local saves preserve the original key and schema version; optional Night Two fields receive defaults on load. The furnace's supply chest gives a free refill only when the bag is empty, preventing exhaustion in this preview before the full shop/drop economy exists. Later campaign systems and nights remain unimplemented.
