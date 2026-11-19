# Complete Torah reference library · v0.7.0

November 19, 2026. Full reconstruction remains unfinished. Fixed original recordings are references; independent historical melody/pronunciation profiles and singing synthesis are not implemented.

## Source and automated evidence

**63 checks pass.** The independent source verifier reads the original source ZIP and checks all 384 file hashes, all 79,986 WLC source words, exact token/mark/editorial-code preservation and ordering, every UXLC ID/raw string, all usable starts/ends and all original timing errors. The 79,985 reader units correspond to the source without changing either edition. Source data and packed library reproduce byte-for-byte from checksum-pinned originals.

The library covers 54 portions / 378 recordings. All 378 original URLs passed current HTTPS HEAD delivery, expected-length and browser-access checks; results are in REFERENCE-HTTP-AUDIT.json. File size and SHA-1 are checked when audio is explicitly loaded. The availability audit did not download the collection or establish musical accuracy.

New tests also cover the full Genesis selection across 84 files, reordered/repeated occurrence IDs, cross-file transitions at actual media ends, cancellation while a source resolves, decode/load errors, wrong-size/wrong-hash downloads, corrupt saved bytes, explicit reload, persistent-cache reuse and bounded transient URL/memory sets. All 231,178 original instrumental events remain unchanged under the existing full-corpus regression hashes. Standalone embeds the complete source catalog, opening MP3 and attribution notices losslessly.

## Normal UI evidence

All actual playback stayed muted. No acoustic review is claimed.

| Check | Observed result |
| --- | --- |
| Startup/catalog | Saved reading/settings restored; 54 portion choices, seven aliyot each, and 370 source-timed / eight complete-take-only statuses displayed. |
| Download/verification | Vaethanan 6 loaded from Archive, passed byte/hash checks and saved to IndexedDB. Play remained disabled until complete. |
| Cached reload | Reload restored the saved recording and Play availability; source was a local blob URL. |
| Deuteronomy playback | Deuteronomy 6:4 word 1 displayed שְׁמַ֖ע, highlighted its stable ID and played from source time 1.000 s. Decoded media duration 411.6375 s. |
| Two-file span | Selected Genesis 2:3 final word through 2:4 first word. Player finished Bereshit 1 at actual media end, switched to Bereshit 2, followed its first word and finished. Decoded durations 449.515 and 201.11675 s. |
| Original timing fault | Shemot 1 showed 181 source words / 182 timestamps. Word/span Play stayed disabled. Complete original played from zero without timed word highlights; decoded duration 187.48075 s. |
| Remove/cancel | Removing Shemot’s saved copy re-enabled Load and disabled complete playback. Immediate cancellation of Vaethanan 2’s 4.1 MB load recovered controls and kept completed files. |
| Word boundaries | Numbers 12:9 retained WLC וַיִּֽחַר אַ֧ף beside UXLC וַיִּֽחַרְאַ֧ף, identifying two source word units. |
| Verse numbering | UXLC Exodus 20:14 word 1 retained its ID and showed original WLC 20:13 word 3 separately. |
| Standalone | Embedded catalog initialized all recordings; bundled opening audio stayed embedded. Saved Deuteronomy original played with the same source word/duration. |
| Narrow layouts | At 320/390 pixels, body width matched viewport; 320-pixel reference panel width 286. Temporary override reset. |
| Diagnostics/state | No captured warnings/errors. Instrument and reference volumes remained zero; Stop/Escape used and all playback stopped. |

## Limits and remaining work

370 files have matching counts and ordered starts; none has been independently reviewed acoustically in this project. Eight original files require timing review: Shemot 1/5/7, Tetzaveh 1/3, Shmini 6, Nasso 4 and Eikev 3. Full original takes remain usable; no timestamps were guessed or silently corrected.

Only three non-bundled originals were actually downloaded/hashed in local browser checks. Every other file is checked before use. All source-described styles/reader attribution remain distinct from reviewed realizations or Kinnor equivalence. No individual reader attribution, pitch/phoneme transcription, community pronunciation grammar or singer synthesis is inferred.

Persistent cache and blob playback after reload were demonstrated. Full network-failure testing, direct file-origin UI, additional devices, screen-reader review, notation-app import, printing and assignment file dialogs remain pending. If browser storage fails, transient audio memory is limited to three files; large selections require working device storage. Cached copies can be removed and downloaded again. Browser frame/native-media timing is not sample-accurate editing.

Publication and returning-live-tab checks are pending at this checkpoint. All original scope and roadmap requirements remain active.
