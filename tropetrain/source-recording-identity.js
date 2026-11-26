import {TOLDOT_OBSERVED_CUES} from './toldot-observed-cues-summary.js';

// The catalog object stays unchanged. A separately verified original digest may
// be used only for the exact source identity it was measured from.
export function sourceRecordingSha256(record){
  if(record?.audio?.sha256)return record.audio.sha256;
  const source=TOLDOT_OBSERVED_CUES.source,a=record?.audio;
  return record?.id===source.id&&a?.bytes===source.bytes&&a.sha1===source.sha1&&a.estimatedDurationSeconds===source.duration?source.sha256:null;
}
