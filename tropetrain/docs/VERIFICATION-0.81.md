# TropeTrain v0.81 — locally verified; publication pending

The new independent **Modern Hebrew inventory · research** profile is wired to the actual word/group reader, score annotations, pronunciation preview and structural note-reference exports. It adapts only the attributed Phonikud code inventory, pinned a29a75b473b0f132a0bbee41dad38763035211dc, CC BY4.0. The five original code/license blobs independently match their Git hashes. No neural model, dataset, recording or third-party README is included. No biblical source string is passed through the upstream phonemizer or its invented stress/sheva annotations.

Whole-Torah source correspondence passes in both MAM text styles:79,985original words,68,504groups,194,272source-unit plans and518,726category references per style. There are79,983individually owned words and two jointly owned words; the complete shared source word in Deuteronomy32:6 remains unsplit. Exact Hebrew, accents, vowels, CGJ, source branches, stress, syllables, repeated occurrence IDs, letter bindings and all18,250shared-consonant events are retained.497,765references have conditional inventory proposals;20,961remain explicitly unresolved. Source silence, proposed absence, shared references and unknowns stay distinct.

All four existing explicit source-reading policies pass the standalone modern note audit in both text styles: eight results, each187chapters/79,985words, zero uncovered words and all231,981or231,982original-demo notes structurally referenced. The shared source word keeps four original demo notes. These are source-unit references, not phoneme onset/duration or sung-note allocation. Melody, MAM text style, phonemic research profile, key, tempo, comfort range and fixed recordings remain independent.

The older regional profiles retain byte-identical full audit result rows and40complete representative word reports relative to published v0.80. Their44holam/shuruq compound gaps remain open. The modern profile separately proposes2,316strict source vowel–yod constituent pairs, with no assigned phonetic transition or quantity. No Kinnor equivalence, accepted phones, acoustic times, generated singing voice or qualified review is supplied. All six historical pronunciation grammars/voices, complete contextual melody systems and the retained tutor/learning inventory remain required. Printing is deferred. Private MBROLA diagnostics remain frozen.

Local acceptance — 2026-11-24

Packaging resume5066 terminated0 after disk recovery. The complete npm test run81149 terminated0:712 passed,0 failed,0 skipped. Initial full check38338 remains a failed ENOSPC attempt. The first resumed full test25327 had709 passes/3 failures: an obsolete two-profile UI assertion and two stale audit input hashes. The assertion was corrected; source phrase and recall audits were rerun with unchanged counts, then the portable file was rebuilt and the complete suite passed.

Supported unified CUA browser testing is working. Normal and portable each pass196 retained,19 modern inventory and4 small-screen/keyboard checks:438 local UI checks total. Modern source attribution, exact Hebrew/CGJ, two MAM styles, null voice/phones/timing, shared consonant and complete shared-word ownership, both compound cases, unknown final ayin/mappiq/sheva, note/score/MIDI independence, reload without autoplay and320px recall practice pass. All playback was short, muted and stopped; viewport reset. Portable native accessibility exceeded the inspection frame limit; documented DOM snapshots were used successfully. A test helper was corrected to accept embedded source data links and verified their exact SHA256 values. No acoustic/cantorial approval is claimed.

Next: publish only /tropetrain using connected GitHub, verify all Pages jobs and exact public bytes, then run the current full public UI scope. This increment supplies no generated singing or complete historical pronunciation/melody grammar; full roadmap remains active.

Try Genesis1:1, second word **בָּרָ֣א**. Enable **Show pronunciation text under Hebrew words**, then choose **Modern Hebrew inventory · research · phonemic text** in **Reader pronunciation source**. Compare the two MAM text styles without changing the Hebrew; the modern candidates include /b a/ and /ʁ a/. Open **Pronunciation rules preview · research**, choose the modern inventory and prepare the word proposal. Compare the initial word’s unresolved sheva, Genesis12:2word2’s holam–yod, Exodus38:17word8’s shuruq–yod, Deuteronomy6:4word1’s unresolved final ayin and the complete shared source word in Deuteronomy32:6. Existing sound remains the selected instrumental study or fixed recording; this profile generates no sound.

Local preview command:

```sh
python3 -m http.server 8781 --bind 127.0.0.1 --directory /private/tmp/tropetrain-v81-preview
```

Then open http://localhost:8781/tropetrain/. Do not start a second server if the owned preview is already running. The owned preview is active on8781. Git commit, public UI and publication are pending and will be recorded after their checks finish.
