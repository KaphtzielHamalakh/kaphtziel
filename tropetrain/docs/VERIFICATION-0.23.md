# TropeTrain v0.23 pronunciation structure verification · November21,2026

## Scope and source

Source units/stress inspector and current-word/group study export, independent of melody and recordings. Pinned Phonetic MAM 6f0612ed2109d32e288d7c0ca41ae3dbfaad702b, data CC BY-SA4. Original source JSONs, existing79,806links/179unassigned, marked Hebrew/accents/syllable drafts and all musical/audio material unchanged. No source implementation copied/executed. Pinned primary README was rechecked online; its display schema provides no extra phonological verdict layer.

Study data retains both styles, original AST, source/occurrence/unit IDs, source paths, UTF16half-open offsets and exact dot/hyphen/space boundaries. Explicit primary stress differs from literal acute/breve marks. Single-word groups link units to that whole word; shared groups keep unit-word IDs null. Hebrew-cluster ranges, phonemes, note IDs and audio times remain null. This is an intermediate source structure, not six Kinnor pronunciation grammars or independent singing.

## Automated verification

Final build plus **195/195 tests passed, 0 failures, 0 skips**. Six new checks exercise stress/acute/superscript distinctions, qamats alternate labels/breve/missing columns, whole-group refusal/internal joins, all139,196cells reconstructed losslessly against source AST with136,848stress/324reading/38,921superscript-e spans, text/syllable/musical independence and occurrence IDs, unsupported markup/style/changed-text refusal. A stale footer label was caught and corrected before the final passing suite. Existing source correspondence audit still compares original JSONs and exact marked reader words. PRONUNCIATION-STRUCTURE.json records exact input hash/counts; derived totals include alternate cells and shared groups, not an accuracy score.

## Normal browser verification

Normal and standalone preview v0.23: Gen8:20word7 source units hab/bᵉ/hé/ma↔mo followed independent styles while Hebrew הַבְּהֵמָ֣ה, OriginalDemo/key0/tempo84 and fixed recorded voice stayed separate. During muted recorded Endword Play, source units followed listening word; style changed ma→mo, Escape stopped. Word8 cleared units and disabled export without changing style. Deut32:6word1/2 showed same complete הֲ־ לַיְהוָה֙ group and no invented split. Deut1:27word2 preserved two Sephardic readings (10units/two primary marks); Ashkenazic column2 remained literal dash/unavailable. Standalone reload retained passage/cursor/style; Gen1:1word1 acute ré stayed distinct from primary shís. Printed Epair Play/Escape regression passed. Root/body/viewport319 and1280 fit; no captured warnings/errors, all four gains0/stopped, viewport reset. Native Save-dialog/file-origin and independent linguistic/acoustic review remain pending.

## Release gate and remaining work

Connected GitHub only/tropetrain update with current-main lease, successful Pages, exact public bytes and published normal/standalone UI checks required before claiming live. Rollback to preceding runtime d4cc829cf79cbbad8ed48ea514658e89437b25a9 if startup or source-study selection fails. No data migration; saved preference keys unchanged. No positive audio gain used. Full goal remains active/incomplete: reviewed linguistic/musical/contextual grammar, word/syllable/note/audio alignment, six Kinnor phonetic profiles/voices, independent singing and remaining roadmap. Printing deferred; native file-save/file-origin checks pending.
