import {CHUKAT_SOURCE_PASSAGES} from './chukat-passage-data.js';
export {CHUKAT_SOURCE_PASSAGES};
export function withChukatPassageEvidence(record){
  const evidence=CHUKAT_SOURCE_PASSAGES.recordings.find(r=>r.recordId===record.id);
  if(!evidence)return record;
  // Keep the source record's actual coverage:null. This is a derived reader
  // candidate, supported by linked text divisions and independent chapter anchors.
  return {...record,linkedSourcePassageEvidence:{...evidence,candidateCoverage:CHUKAT_SOURCE_PASSAGES.candidateCoverage,
    sourceType:CHUKAT_SOURCE_PASSAGES.sourceType,primarySources:CHUKAT_SOURCE_PASSAGES.primarySources,
    sourcePack:CHUKAT_SOURCE_PASSAGES.sourcePack},
    coverageLabel:'Numbers 19:1–17 · linked reading candidate · unreviewed',
    coverageStatus:'The companion source lists these 17 verses. Independent recognition supports Numbers 19 as a chapter; exact recording endpoints and text-edition correspondence remain unreviewed. No word boundaries are assigned.'};
}
