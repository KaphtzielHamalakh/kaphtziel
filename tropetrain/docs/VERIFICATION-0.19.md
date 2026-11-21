# TropeTrain v0.19 verification · November20,2026

## Scope and evidence

Explicit main Listenwith recorded/instrument mode, separate chant loading/cancel/volume, main Play/Stop/compact/Escape and source-linked word highlights. Fixed PocketTorah recordings keep their own melody/pronunciation/pitch/pace; no conversion to a selected instrumental melody or Kinnor Accent. Existing marked Hebrew/word IDs/syllables/music and original audio/timing sourcepack remain unchanged. CHANT-COVERAGE.json:77,174/79,985 source-timed words,2,811 blocked across8takes, all5books counted. Gap buttons open exact corresponding UXLC ranges without playback. No timestamps repaired or guessed. Score/export labels identify instrument-only notes.

RecordingPlayer adds a monotonic0%-volume clock without media.play, preserves position/rate1 on sound transitions, and invalidates stale transitions across source files. Personal playback-mode preference is independent of assignments/melody/key/range/tempo; old preferences default to instrument. Main recorded Play cannot silently fall back to an instrument or play a span with unreliable/changed/unmapped source text.

## Tests

Full172checks pass/0fail/0skip after final runtime changes. Six new meaningful checks cover every word in370source-timed/8blocked takes with exact coverage/occurrence identity/text immutability; unsupported/changed text and invalid mode refusal; zero-device source-word timing/natural finish; cross-file/reordered/repeated segments; live volume/rate preservation; and stale unmute cancellation across segments/Stop. Existing corpus/source-hash, audio/checksum/cache/cancel, printed source/rest/tie, calendar/assignment/recovery and distribution invariants pass.

## Local normal interface

Supported in-app AX client, normal and self-contained HTTP. Main group playback starts at Genesis1:1word1, highlights marked Hebrew with media paused at0%, naturally finishes after the selected3words and clears highlight/Restart. Word repeat persists beyond one span; Stop ends it. Cohen remains selected/unavailable for instrument at this text, while explicitly selected recording mode remains playable; no substitution. Opening gapShemot1 shows Exodus1:1–17 and disables main Play with original timing-count issue.

Selected actual two-word spanGenesis2:3word16→2:4word1; only missingBereshit2(804,467bytes) downloaded/checksummed. Main Play crossed from includedBereshit1 toBereshit2; last displayed source אֵ֣לֶּה at1.019244s, naturalcompletion/highlights0/media paused. Reload and standalone retained mode/span/Cohen/84BPM/key0/chant0. Standalone Play/Stop/Escape passed. Main chant and Bard voice-study transports stop one another and clear source highlights. Narrow320/wide1280 root/body equalviewport; viewportreset; no capturedwarnings/errors. No audible output or acoustic approval claimed. Cancel wiring/store cancellation tested in code; an actual interrupted download was not observed in this browser run. File origin/dialog/recovery/visibility-transition and expert review gates remain pending.

## Pronunciation source research

Pinned PhoneticMAM 6f0612ed:5TorahJSONs plusREADME/license/data-rights8files15,069,451bytes match Gitblobs; private candidate only. Data-pathCCBYSA4, codeGPL3, other material separate. No runtime import or Kinnor equivalence. Schema uses displayed Hebrew and source-named Sephardic/Ashkenazic transcription rows; qere/pointing/grouping/verse differences need explicit joins that retain UXLC unchanged. PRONUNCIATION-SOURCES.json records hashes/rights/limits. New ASR research lead does not establish a reusable recording/model corpus.

## Release gate

Publish only/tropetrain with connected GitHub and expected-main lease. Verify Pages build/deploy, changed live bytes, returningv0.18 preferences, main recorded word highlighting/completion/Stop, source gap refusal and standalone. Rollback on startup, original checksum/decoding, stale sound or wrong highlight failure by republishing v0.18tree at2f86d22e483ea5d59f3b8d5cf6575fd670973211; preserve personal practice/cache. No completed full-Torah independent singing/phonetic/melodic claim. Deployment pending at this checkpoint.
