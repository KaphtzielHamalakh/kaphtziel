import {VOICE_STUDIES} from './voice-study-data.js';
import {ASAEL_SOURCE_CATALOG} from './asael-source-catalog-data.js';
import {withAsaelPassageEvidence} from './asael-passage-records.js';
export {VOICE_STUDIES};
export const VOICE_SOURCE_STUDIES=[...VOICE_STUDIES.studies,...ASAEL_SOURCE_CATALOG.studies];
export const VOICE_SOURCE_RECORDINGS=[...VOICE_STUDIES.recordings,...ASAEL_SOURCE_CATALOG.recordings].map(withAsaelPassageEvidence);

export function voiceStudy(id){
  const study=VOICE_SOURCE_STUDIES.find(s=>s.id===id);
  if(!study)throw Error('Choose an available source study.');
  return study;
}
export function voiceRecording(studyId,pronunciationId,deliveryId){
  const study=voiceStudy(studyId);
  if(!study.pronunciations.some(p=>p.id===pronunciationId)||!study.deliveries.some(d=>d.id===deliveryId))
    throw Error('This source does not provide that pronunciation and delivery.');
  const recording=VOICE_SOURCE_RECORDINGS.find(r=>r.studyId===studyId&&r.pronunciationId===pronunciationId&&r.deliveryId===deliveryId);
  if(!recording)throw Error('This source performance is unavailable.');
  return recording;
}
export function voiceAudioRecord(recording,base){
  return {...recording,title:`${voiceStudy(recording.studyId).name} · ${recording.deliveryId}`,audio:{...recording.audio,
    url:new URL(recording.audio.file,base).href,localFile:recording.id==='seed-esther-2011'?recording.audio.filename:null}};
}
export function voiceCoverage(record){return record.coverage??voiceStudy(record.studyId).coverage;}
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
  return {...defaults,studyId:record.studyId,pronunciationId:record.pronunciationId,deliveryId:record.deliveryId,
    volume:Number.isInteger(saved.volume)&&saved.volume>=0&&saved.volume<=100?saved.volume:0,
    repeat:typeof saved.repeat==='boolean'?saved.repeat:false,spans};
}
