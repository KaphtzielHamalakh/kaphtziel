import {VOICE_STUDIES} from './voice-study-data.js';
import {ASAEL_SOURCE_CATALOG} from './asael-source-catalog-data.js';
import {withAsaelPassageEvidence} from './asael-passage-records.js';
import {GENESIS_MELODY_COMPARISON} from './genesis-melody-comparison-data.js';
import {SOURCE_READERS} from './source-readers-data.js';
import {withChukatPassageEvidence} from './chukat-passage-records.js';
export {VOICE_STUDIES};
export const VOICE_FEATURED_STUDIES=[...VOICE_STUDIES.studies,GENESIS_MELODY_COMPARISON.study,SOURCE_READERS.studies.find(s=>s.id===SOURCE_READERS.featuredStudyId)];
export const VOICE_SOURCE_STUDIES=[...VOICE_FEATURED_STUDIES,...ASAEL_SOURCE_CATALOG.studies,...SOURCE_READERS.studies.filter(s=>s.id!==SOURCE_READERS.featuredStudyId)];
export const VOICE_SOURCE_RECORDINGS=[...VOICE_STUDIES.recordings,...ASAEL_SOURCE_CATALOG.recordings].map(withAsaelPassageEvidence).concat(GENESIS_MELODY_COMPARISON.recording,SOURCE_READERS.recordings).map(withChukatPassageEvidence);

export function voiceStudy(id){
  const study=VOICE_SOURCE_STUDIES.find(s=>s.id===id);
  if(!study)throw Error('Choose an available source study.');
  return study;
}
export function voiceRecording(studyId,pronunciationId,deliveryId){
  const study=voiceStudy(studyId);
  if(!study.pronunciations.some(p=>p.id===pronunciationId)||!study.deliveries.some(d=>d.id===deliveryId))
    throw Error('This source does not provide that pronunciation and delivery.');
  const recording=VOICE_SOURCE_RECORDINGS.find(r=>(r.studyId===studyId||study.recordingIds?.includes(r.id))&&r.pronunciationId===pronunciationId&&r.deliveryId===deliveryId);
  if(!recording)throw Error('This source performance is unavailable.');
  return recording;
}
// Enumerate actual provided pairs; a choice never substitutes a missing pair.
export function voiceCombinations(studyId){
  const study=voiceStudy(studyId);
  return VOICE_SOURCE_RECORDINGS.filter(r=>r.studyId===studyId||study.recordingIds?.includes(r.id)).map(r=>({
    id:r.id,pronunciationId:r.pronunciationId,deliveryId:r.deliveryId,
    name:`${study.deliveries.find(d=>d.id===r.deliveryId).name} · ${study.pronunciations.find(p=>p.id===r.pronunciationId).name}`
  }));
}
export function voiceChoices(studyId,pronunciationId,deliveryId){
  const study=voiceStudy(studyId),provided=(p,d)=>{try{voiceRecording(studyId,p,d);return true;}catch{return false;}};
  return {pronunciations:study.pronunciations.map(p=>({...p,disabled:!provided(p.id,deliveryId)})),
    deliveries:study.deliveries.map(d=>({...d,disabled:!provided(pronunciationId,d.id)}))};
}
export function voiceAudioRecord(recording,base){
  return {...recording,title:`${voiceStudy(recording.studyId).name} · ${recording.deliveryId}`,audio:{...recording.audio,
    url:new URL(recording.audio.file,base).href,localFile:recording.id==='seed-esther-2011'?recording.audio.filename:null}};
}
export function voiceCoverage(record){return record.coverage??record.linkedSourcePassageEvidence?.candidateCoverage??voiceStudy(record.studyId).coverage;}
export function voiceCoverageLabel(record){
  if(record.coverageLabel)return record.coverageLabel;
  const coverage=voiceCoverage(record);if(!coverage)return null;
  const name={gen:'Genesis',num:'Numbers'}[coverage.bookId]??coverage.bookId;
  const a=coverage.start,z=coverage.end;
  return `${name} ${a.chapter}:${a.verse}${a.chapter===z.chapter&&a.verse===z.verse?'':`–${a.chapter===z.chapter?'':z.chapter+':'}${z.verse}`}`;
}
export function voiceSpan(start,end,duration){
  if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(start)||start<0||start>=duration)
    throw Error('Choose a start time inside this recording.');
  const last=end===null||end===''?duration:end;
  if(!Number.isFinite(last)||last<=start||last>duration+.001)
    throw Error('Choose an end time after the start and within this recording.');
  return {start,end:Math.min(last,duration)};
}
export function restoreVoicePreferences(saved){
  const defaults={studyId:'seed-esther',pronunciationId:'as-recorded',deliveryId:'esther-table',volume:0,repeat:false,spans:{}};
  if(!saved||typeof saved!=='object')return defaults;
  let record;try{record=voiceRecording(saved.studyId,saved.pronunciationId,saved.deliveryId);}catch{return defaults;}
  const spans={};
  for(const candidate of VOICE_SOURCE_RECORDINGS){
    const span=saved.spans?.[candidate.id];if(!span)continue;
    try{const checked=voiceSpan(span.start,span.end,candidate.audio.estimatedDurationSeconds);spans[candidate.id]={start:checked.start,end:span.end===null?null:checked.end};}catch{}
  }
  return {...defaults,studyId:saved.studyId,pronunciationId:record.pronunciationId,deliveryId:record.deliveryId,
    volume:Number.isInteger(saved.volume)&&saved.volume>=0&&saved.volume<=100?saved.volume:0,
    repeat:typeof saved.repeat==='boolean'?saved.repeat:false,spans};
}
