import {TOLDOT_OBSERVED_CUES} from './toldot-observed-cues-summary.js';
export {TOLDOT_OBSERVED_CUES};
export function withToldotPassageEvidence(record){
  if(record.id!==TOLDOT_OBSERVED_CUES.recordId)return record;
  return {...record,linkedSourcePassageEvidence:{candidateCoverage:TOLDOT_OBSERVED_CUES.candidateCoverage,
    sourcePack:TOLDOT_OBSERVED_CUES.sourcePack,originalSha256:TOLDOT_OBSERVED_CUES.originalSha256,
    actualRecordingBoundsConfirmed:false,sourceEditionCompared:false,acceptedWordTimes:null,review:null,
    textOpenLabel:'Open Genesis 27:28–28:4 text candidate · unreviewed',
    wordTimingNotice:'Linked reading candidate. The companion text lists Genesis 27:28–28:4; exact recording endpoints and text-edition correspondence remain unreviewed. Three sparse agreement cues locate listening context, never word boundaries.'},
    coverageLabel:'Genesis 27:28–28:4 · linked reading candidate · unreviewed',
    coverageStatus:'The companion source lists these 23 verses. Exact recording endpoints and text-edition correspondence remain unreviewed. Only three sparse listening cues are supplied; no word boundaries are assigned.'};
}
