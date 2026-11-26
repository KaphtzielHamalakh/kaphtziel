import {TOLDOT_OBSERVED_CUES as summary} from './toldot-observed-cues-summary.js';
import {sourceRecordingSha256} from './source-recording-identity.js';
import {loadWordSupportPacket} from './word-support-data.js';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function observedWordCuesAvailable(record){return record?.id===summary.recordId&&sourceRecordingSha256(record)===summary.source.sha256;}
export function validateObservedWordCues(value,expected){
 if(!value||value.format!=='tropetrain-observed-word-cues-v1'||value.status!=='unreviewed-listening-cues'||value.recordId!==summary.recordId)throw Error('Only this original’s unreviewed listening cues are supported.');
 if(!same(value.source,expected?.source)||!same(value.source,summary.source))throw Error('Listening cues belong to a different source recording.');
 if(!same(value.candidateCoverage,expected.coverage)||!same(value.candidateCoverage,summary.candidateCoverage))throw Error('Listening-cue reading candidate differs.');
 if(value.sourceClockFitted!==false||value.sourceEditionCompared!==false||value.actualRecordingCoverage!==null||['acceptedWordTimes','timedWords','syllableAlignment','phonemes','musicalNotes','newVoice','independentReview'].some(k=>value[k]!==null))throw Error('Listening cues cannot certify boundaries, phonology, music or source coverage.');
 if(!same(value.rules,summary.rules)||!same(value.models,summary.models)||!same(value.negativeControl,summary.negativeControl)||value.wholeTorahSearchWords!==79985)throw Error('Listening-cue research gates or failed control differ.');
 if(!Array.isArray(value.words)||value.words.length!==expected.words.length||value.words.length!==summary.readerWords)throw Error('Listening-cue words differ from the unchanged reader.');
 let count=0;
 for(let i=0;i<value.words.length;i++){
  const w=value.words[i],original=expected.words[i];
  if(w?.id!==original.id||w.hebrew!==original.hebrew)throw Error('Listening-cue identity or marked Hebrew differs from the unchanged reader.');
  if(w.approvedBoundary!==null||w.review!==null)throw Error('Listening cues must remain unreviewed.');
  const c=w.cue;if(c===null){if(!['no-complete-ctc-letter-anchor','no-complete-whisper-letter-anchor','source-model-clocks-disagree','multiple-agreed-occurrences','point-outside-native-source-clock','insufficient-local-signal'].includes(w.withheldReason))throw Error('A missing cue needs its retained evidence gap.');continue;}
  if(!c||w.withheldReason!==null||c.wordStart!==null||c.wordEnd!==null||c.review!==null)throw Error('A listening cue has no word start, end or approval.');
  if(!Number.isFinite(c.point)||c.point<0||c.point>=value.source.duration||c.point!==c.ctc?.point)throw Error('Listening cue is outside the unchanged source clock.');
  for(const name of ['ctc','whisper']){
   const o=c[name],x=o?.exactContext;
   if(o?.wordId!==w.id||o.hebrew!==w.hebrew||!Number.isFinite(o.point)||o.point<0||o.point>=value.source.duration||!Number.isInteger(x?.letters)||x.letters<12||!Number.isInteger(x.fullWords)||x.fullWords<3||x.someEightLetterContextUniqueAcrossWholeTorah!==true)throw Error('Both literal whole-Torah contexts must support this exact word.');
  }
  const delta=Math.abs(c.ctc.point-c.whisper.point);
  if(delta>.75||c.clockDifferenceSeconds!==delta)throw Error('Listening-cue model clocks disagree.');
  const signal=c.localSignal;
  if(!Number.isFinite(signal?.rms)||signal.rms<=0||!Number.isFinite(signal.rmsDbfs)||signal.rmsDbfs< -55||Math.abs(20*Math.log10(signal.rms)-signal.rmsDbfs)>1e-8||signal.speechOrPhonemeConfirmed!==false)throw Error('Listening cue lacks sufficient unreviewed local signal.');
  if(!same(c.context,{start:Math.max(0,c.point-2),end:Math.min(value.source.duration,c.point+2)}))throw Error('Listening cues use exactly two seconds of context on each side.');
  count++;
 }
 if(count!==summary.agreedListeningCues)throw Error('Sparse listening-cue count differs.');
 return structuredClone(value);
}
export async function loadObservedWordCues(record,expected,{readPacket=loadWordSupportPacket}={}){
 if(!observedWordCuesAvailable(record))throw Error('No sparse listening-cue study exists for this original.');
 const entry=summary.packet,bytes=await readPacket(entry.file),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(bytes.length!==entry.bytes||hash!==entry.sha256)throw Error('Listening-cue packet checksum differs.');
 const text=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
 return validateObservedWordCues(JSON.parse(text),expected);
}
export function observedWordCueContext(value,index){
 const cue=value?.words?.[index]?.cue;
 if(!cue||cue.wordStart!==null||cue.wordEnd!==null||!Number.isFinite(cue.point)||!Number.isFinite(value.source?.duration)||!same(cue.context,{start:Math.max(0,cue.point-2),end:Math.min(value.source.duration,cue.point+2)}))throw Error('This word has no agreed listening cue. Its boundaries remain blank.');
 return {...cue.context};
}
