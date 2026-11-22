import {chantPracticePlan} from './recorded-practice.js';
import {pitchManifest} from './source-pitch.js';
const entries=new Map(pitchManifest.records.map(e=>[e.id,e]));
export function measuredPracticePlan(library,words,start,end){
 const plan=chantPracticePlan(library,words,start,end);
 for(const row of plan.rows){
  const source=entries.get(row.recordingId),record=library.byId.get(row.recordingId),duration=source?.durationSeconds,last=row.endSeconds??duration;
  if(source?.wordTiming!=='aligned'||source.sourceAudio.sha1!==record.audio.sha1||source.sourceAudio.bytes!==record.audio.bytes||!Number.isFinite(row.startSeconds)||!Number.isFinite(last)||row.startSeconds<0||row.startSeconds>=last||last>duration)throw Error(`Source measurements do not cover ${row.id}; word timing review is required. No boundary is changed.`);
 }
 return plan;
}

// Both main source-audio modes share the same independent duration guard.
export const sourceTimedPracticePlan=measuredPracticePlan;
