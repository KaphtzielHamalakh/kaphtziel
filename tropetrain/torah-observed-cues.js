import {TORAH_OBSERVED_CUES as summary} from './torah-observed-cues-summary.js';
import {loadWordSupportPacket} from './word-support-data.js';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const choose=values=>[...values].sort((a,b)=>b.chunkInteriorSeconds-a.chunkInteriorSeconds||a.sourceSampleRange[0]-b.sourceSampleRange[0]||b.exactContext.letters-a.exactContext.letters||a.point-b.point)[0];
const evidenceFor=study=>study?.evidenceSetId?summary.evidenceSets?.find(e=>e.id===study.evidenceSetId):summary;
export function referenceObservedCueStudy(record){
 const study=summary.records.find(s=>s.recordId===record?.id);
 if(!study||!evidenceFor(study)||record.audio?.sha1!==study.source.sha1||record.audio.bytes!==study.source.bytes||!same(record.coverage,study.candidateCoverage)||record.timingSource?.sha256!==study.originalTimingSourceSha256)return null;
 return study;
}
export function validateReferenceObservedCues(value,record){
 const study=referenceObservedCueStudy(record);
 if(!study||value?.format!=='tropetrain-source-observed-cues-v1'||value.status!=='unreviewed-listening-cues'||value.recordId!==record.id||!same(value.source,study.source))throw Error('Listening cues belong to a different original recording.');
 const evidence=evidenceFor(study);
 if(!same(value.candidateCoverage,study.candidateCoverage)||!same(value.rules,evidence.rules)||!same(value.models,evidence.models)||!same(value.controls,evidence.controls)||value.wholeTorahSearchWords!==79985||value.frontendMismatchRetained!==true)throw Error('The source-only listening-cue evidence differs.');
 if(value.sourceClockFitted!==false||value.sourceEditionCompared!==false||value.wordDurationInferred!==false||value.boundaryAutofill!==false||['actualRecordingCoverage','acceptedWordTimes','phonemes','syllableAlignment','musicalNotes','newVoice','review','trainingHeldOut'].some(k=>value[k]!==null))throw Error('Research cues cannot certify word timing, music or pronunciation.');
 if(!Array.isArray(value.words)||value.words.length!==record.words.length||value.words.length!==study.readerWords)throw Error('Listening-cue word count differs from this reading.');
 let count=0;
 for(let i=0;i<value.words.length;i++){
  const w=value.words[i],original=record.words[i];
  if(w?.id!==original.id||w.hebrew!==original.uxlcHebrew||w.approvedBoundary!==null||w.review!==null)throw Error('Listening-cue identity, marked Hebrew or review differs.');
  if(w.cue===null){if(!['no-complete-ctc-letter-anchor','no-complete-whisper-letter-anchor','conflicting-observed-locations','point-outside-native-source-clock','insufficient-local-signal'].includes(w.withheldReason))throw Error('A missing listening cue needs its evidence gap.');continue;}
  const c=w.cue;
  if(!c||w.withheldReason!==null||c.wordStart!==null||c.wordEnd!==null||c.review!==null||!same(w.observations,c.allModelObservations))throw Error('Listening cues have no word extent or approval.');
  const all=[];
  for(const family of ['ctc','whisper']){
   const observations=c.allModelObservations?.[family];
   if(!Array.isArray(observations)||!observations.length)throw Error('Both recognizers must supply literal context.');
   for(const o of observations){
    const x=o?.exactContext,s=o?.sourceSampleRange,margin=Array.isArray(s)?Math.min(o.point-s[0]/16000,s[1]/16000-o.point):NaN;
    if(o.wordId!==w.id||o.hebrew!==w.hebrew||!Number.isFinite(o.point)||o.point<0||o.point>=study.source.duration||!Number.isInteger(x?.letters)||x.letters<12||!Number.isInteger(x.fullWords)||x.fullWords<3||x.someEightLetterContextUniqueAcrossWholeTorah!==true||!Array.isArray(s)||s.length!==2||!s.every(Number.isInteger)||s[0]<0||s[1]<=s[0]||!Number.isFinite(margin)||margin<.25||Math.abs(margin-o.chunkInteriorSeconds)>1e-8||!/^[a-f0-9]{64}$/.test(o.observationSha256))throw Error('Literal word context or the unchanged source clip differs.');
    all.push(o.point);
   }
   if(!same(c[family],choose(observations)))throw Error('The cue must use the most interior observed point without fitting clocks.');
  }
  const spread=Math.max(...all)-Math.min(...all),delta=Math.abs(c.ctc.point-c.whisper.point),signal=c.localSignal;
  if(spread>.75||spread!==c.allObservationSpreadSeconds||delta!==c.clockDifferenceSeconds||c.point!==c.ctc.point)throw Error('Conflicting observed locations cannot become a listening cue.');
  if(!Number.isFinite(signal?.rms)||signal.rms<=0||!Number.isFinite(signal.rmsDbfs)||signal.rmsDbfs< -55||Math.abs(20*Math.log10(signal.rms)-signal.rmsDbfs)>1e-8||signal.speechOrPhonemeConfirmed!==false)throw Error('The listening point lacks sufficient unreviewed local signal.');
  if(!same(c.context,{start:Math.max(0,c.point-2),end:Math.min(study.source.duration,c.point+2)}))throw Error('A cue must retain exactly two seconds of listening context on each side.');
  count++;
 }
 if(count!==study.agreedListeningCues)throw Error('The source-specific listening-cue count differs.');
 return structuredClone(value);
}
export async function loadReferenceObservedCues(record,{readPacket=loadWordSupportPacket}={}){
 const study=referenceObservedCueStudy(record);if(!study)throw Error('No listening-cue study exists for this original.');
 const bytes=await readPacket(study.packet.file),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(bytes.length!==study.packet.bytes||hash!==study.packet.sha256)throw Error('Listening-cue packet checksum differs.');
 const text=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
 return validateReferenceObservedCues(JSON.parse(text),record);
}
export function referenceObservedCueForWord(value,word){
 const found=value?.words?.find(w=>w.id===(word?.sourceWordId??word?.id));
 if(!found||found.hebrew!==word?.sourceHebrew)throw Error('Choose the unchanged reader word for this original.');
 return structuredClone(found);
}
export function referenceObservedCueContext(value,word){
 const cue=referenceObservedCueForWord(value,word).cue;
 if(!cue||cue.wordStart!==null||cue.wordEnd!==null||!Number.isFinite(cue.point)||!same(cue.context,{start:Math.max(0,cue.point-2),end:Math.min(value.source.duration,cue.point+2)}))throw Error('This word has no concordant listening cue. Word playback remains withheld.');
 return {...cue.context};
}
