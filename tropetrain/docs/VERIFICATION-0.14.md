# Hebrew-date navigation · v0.14.0 · verification in progress

November 20, 2026. This increment is not published. The full reconstruction remains active and incomplete.

## Implemented and source checked

Original navigation around the browser’s ECMA-402 Hebrew calendar converts civil service dates in UTC, without copying the provider’s engine. Seven unmodified Hebcal converter responses supply 577 independent comparison dates. Files, URLs, dates, rights and hashes are in HEBREW-DATE-SOURCES.json; the original data pack is embedded in the standalone. Four existing reading examples remain separate. Gregorian dates 0001-01-01 through 9999-12-31 are supported; Hebrew boundary years3761/13760 and truncated boundary months are explicitly partial. Six known source dates are checked at runtime before enabling Hebrew controls. Sunset/location conversion is not calculated.

All116 final-code npm-run-check checks pass. Coverage includes the577 independent forward/inverse pairs, all six year lengths across a full19-year cycle, invalid date/month/day refusal, partial endpoints, absent/contradictory browser-calendar refusal, exact source-pack bytes and embedded distribution evidence. Prior full-Torah musical event hashes are unchanged. An initial fixture wrongly assumed5787 was a common year; corrected to5786. The actual source pairs already passed.

## Normal UI observed before interruption

All gains stayed0. No Play was started in this iteration.

- Hebrew5782/Av2 converted to2022-07-30 and found only Diaspora Matot–Masei.
- Av3 found no scheduled Torah reading forJuly31; Show the whole month restored16 services.
- Tamuz18 found both TzomTammuz and Mincha services onJuly17; records were not collapsed.
- CivilApril23,2022 converted to22Nisan5782 and distinguished Diaspora PesachVIII from Israel AchreiMot.
- An edited year is refused until Show Hebrew year is selected. AdarI30,5784 converted toMarch10; choosingAdarII cleared the unavailable day30 to a placeholder (its final day is29), with no rollover. Valid14AdarII converts toMarch24.
- Year3761/Tevet18 converted to0001-01-01;13760/Cheshvan28 to9999-12-31. The final boundary-month label was then corrected to “supported days · partial.”
- March2024 Israel lookup exposed a real source-schema defect: an ErevPurim Megillah-only record rejected the whole month. Exact17-record response and regression added. After correction, March24 Purim opens three Torah sections Exodus17:8–16; March23 preserves both Vayikra and reference-only ErevPurim. No Torah control is invented for Esther-only records.
- The bounded Cohen source,60BPM/key0 and both mutes remained selected, with explicit refusal outside Genesis22:1.
- Final rebuilt HTTP standalone initializedv0.14, retained threePurim sections/Cohen/60/key0/mutes and displayed5787 with13months/385days. Its date controls opened normally.

## Pending UI and publication

Final standalone boundary-month label/source-link/exact-date opening checks,320/390/1280 responsive checks, final playback/restoration, publication and live returning-state checks remain pending. The CUA namespace was removed during intentional interruption. No alternate browser automation, nativeChrome inspection or file-origin bypass was used. No screenshot or acoustic/qualified-reader review is claimed. Preview session26232 is missing and no8766 listener remains; it was not restarted merely because a wait ended.

The live site remains verifiedv0.13. Do not publish this increment until its pending normal-UI checks can be completed. All32 ordinary Torah systems, other recovered repertoire, six pronunciation realizations, singing, wider calendar/RA-table review and the complete remaining roadmap are still unfinished.
