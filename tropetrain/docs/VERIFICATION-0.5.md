# Source-sign inspection and search · v0.5.0

November 19, 2026. The full reconstruction remains active and incomplete. No historical melody, singing voice or pronunciation realization was added.

## Automated evidence

`npm run check`: **41 passing checks**. An independent raw-character census covers all 79,985 preferred reading words, checks source offsets and repeated marks, and records all 25 cantillation codepoints found in this UXLC edition. The generated census is SOURCE-SIGN-AUDIT.json; regenerate with `node scripts/audit-source-signs.mjs`.

Regression hashes compare all **231,178** demonstration events with committed v0.4 results across all five books. Pitches, beats, syllable strings and source/occurrence IDs remain unchanged. Search checks cover rare marks, missing marks, qere versus ketiv, repeated assigned sections and unsupported queries. Assignment display preferences preserve compatibility with earlier files and stay independent of personal key, speed and range.

## Normal browser flow

Used the in-app browser, ordinary app controls and read-only DOM observations. Audio stayed stopped and muted.

| Check | Observed result |
| --- | --- |
| Zarqa | Genesis 1:7 word 2 retains אֱלֹהִים֮; U+05AE shown as postpositive Zarqa, Unicode ZINOR, position 9, with postpositive/stress warning. Whole-Torah search: 365 words / 365 positions. |
| Helper | Separate U+0598 query: ten words/positions, two result pages; Genesis 17:20 word 1 opened with meteg separate. 40 BPM/+1/volume 0 remained fixed. |
| Rare marks | Yeraḥ ben yomo and Qarnei fara each returned one result, Numbers 35:5 words 7 and 8. |
| Unmarked | Seven matching words. Exodus 4:2 reading word 4 preserved qere מַה, canonical ID exo-4-2-5 and written מזה; no accent invented. |
| Repeated signs | Genesis 1:2 word 3 retained both Pashta marks, positions 3/7, with repeat warning. |
| Combined context | Genesis 1:14 word 14 retained Munaḥ/Zakef; Genesis 1:21 word 9 retained meteg, CGJ, Munaḥ and paseq; Genesis 5:29 word 6 retained two distinct disjunctives. Context limits are explicit. |
| Assigned duplicates | Two copies of Genesis 1:2 gave two matching words / four Pashta positions; section-specific accessible links selected the correct occurrence in section 2. |
| Saved preferences | Saving/loading sign classes restored frames while keeping personal 55 BPM/+1/volume 0. Earlier assignment schema defaults frames off. |
| Restore/views | Reload preserved sections/cursor/display; parallel view retained both pointed and consonantal source-linked words. No-match result disabled Next. |
| Keyboard | Enter on a result selected its source word; focus remained visibly outlined despite sign-class frames. Source table region accepted focus and horizontal arrow scrolling. |
| Narrow screens | At 320 and 390 pixels, document width matched viewport. At 320, a 400-pixel source table stayed within a 250-pixel focusable scroll region. Temporary override reset. |
| Standalone | Embedded full-Torah build found Qarnei fara and navigated to Numbers 35:5 word 8; source inspector and 390-pixel layout worked. No captured warnings/errors. |

## Limits

Character recognition and source-guide prose classes are verified against encoding documentation and literal corpus characters. Full contextual hierarchy, legarmeh decisions, poetic systems, exceptional tunes, syllabification and musical realizations still need reviewed rules. Silluq-position identification is deliberately limited to a final meteg character before a literal sof pasuq in the same word. Mark positions count encoded source characters, including combining marks; they are not syllable or stress positions.

All music remains the original instrumental demonstration. The six historical Accent labels and the recovered melody catalog are reference evidence only. No archive executable or proprietary music is shipped. File-origin interaction, screen-reader review, assignment file dialogs, external notation-app import, printing and offline network-failure recovery remain pending. Earlier waveform and score checks are documented in VERIFICATION-0.4.md.

Publication and returning-live-tab verification are pending at this checkpoint.
