# TropeTrain v0.35 · independent Hebrew-span correspondence

Candidate based on v0.34 code496ce893/records7a40ab62; only /tropetrain changes. Full reconstruction remains active/incomplete; printing deferred.

## Implementation and source bounds

Original common-boundary bridge keeps both original syllable sequences, marked Hebrew and event IDs. Per-source-row/column paths retain alternatives, repeat references, stress, source category plans and shared consonant references. Different divisions have null individual note allocation, phonemes and audio times. No normalization, approximate spelling, interpolated source unit or borrowed melody is used. Existing exact-syllable links, all source packets, recordings/times, source-score notes and full-Torah original-demo events remain unchanged.

Whole-Torah independent audit:79,985words/5,853source records; both styles cover77,782words fully by common spans,226,205of231,178events.5,705events have different divisions;4,973events have no common span. Remaining2,059source-only word forms,142missing correspondences and2combined words remain unassigned. Minimal groups186,936Sephardic/186,960Ashkenazic preserve the source’s different syllable counts. All52Cohen and145Baer components have common-span comparisons; their2/6different opening components still have no individual exact-syllable links. The ordinary demonstration remains newly composed music, not traditional melody coverage.

Marked-Hebrew SHA256e7491f5d7f89cc94bb4e39b63e42d53b8219d1970846839f4822df4c3bc1728c and original-demo event SHA2566870929024d0c2289f7d9ef1879a7908ac0ee04280c528d64c89d85956f4ba3d unchanged. Source and structural audit:docs/PRONUNCIATION-SCORE-GROUPS.json.

## Validation

290full automated checks/0failures/0skips;10new meaningful checks cover literal Cohen/Baer mismatches, unchanged individual links, independent styles/controls, source variants/repeats/categories/shared consonants, repeated occurrence IDs, gaps/source-only/combined refusals, partial event pages, malformed marks/ranges/holes and a synthetic2:3overlap. The final build/test log is /private/tmp/tropetrain-check-v35-final.log. An early pre-build new-test run had8/10passing: the hole fixture removed a terminal rather than interior unit and the portable evidence had not yet been built. Corrected fixture and completed builds passed all290. Final display wrap and error-state robustness checked in the latest build; no partial build published.

Normal and standalone previews show unchanged וַֽיְהִי־, printed wa/j’ and source vay in an explicit2score/1source shared-span row, while individual notes stay unlinked. Both existing source styles retain exact52reader words, noteIDs/pitches/beats and group boundaries. Muted repeated word playback continues on the same G-sharp4 clock during style changes: normal9.845%→24.265%, standalone9.15%→22.69%. Key+2/tempo72 changes only the source instrument toB-flat4/B4; restoredkey0/60BPM. Cohen’s all13word example retains its separate Wa/ye/vay span. Gen8:20word8 clears the table with an explicit no-correspondence refusal; word7keeps shared bet written ownership; Deut1:27word2keeps both qamats/repeat source columns. Both distributions root/body fit319/1280 with actual widths checked; viewport reset. No console errors observed. A recent-reading menu auto-resets after opening, so AXsetValue reported nonretention; fresh state confirmed the correct passage and no duplicate action was taken. NativeSave/download/direct-file-origin and auditory/cantorial/linguistic/acoustic review remain pending.

## Publication

App-only publication, exact public-byte verification, public normal/standalone browser checks and guarded output sync follow. No new traditional system, historical pronunciation preset, phoneme or singing voice claimed. Full inventory remains active.
