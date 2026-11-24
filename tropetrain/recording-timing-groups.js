// Original policy code CC0-1.0; derived PocketTorah correspondence CC BY-SA 3.0.
import {RECORDING_TIMING_GROUP_PINS,RECORDING_TIMING_GROUP_SOURCE} from './recording-timing-group-pins.js';
import {sourceTimingPolicy} from './source-word-windows.js';
import {sourceTimedPracticePlan} from './measured-practice.js';
import {splitReferenceSegments} from './recorded-reference.js';
import {pitchManifest} from './source-pitch.js';

const sha256=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const refuse=()=>{throw Error('The original recording timing-group source changed; complete groups are withheld.');};

// Source identity is checked before eligibility. A retained snapshot also rejects
// later mutations; cached eligibility alone never authorizes changed source data.
export async function createRecordingTimingGroups(library){
 if(library?.source.originalCommit!==RECORDING_TIMING_GROUP_SOURCE.originalCommit||pitchManifest.referencePacketSha256!==RECORDING_TIMING_GROUP_SOURCE.packetSha256)refuse();
 const byWord=new Map(),snapshots=new Map();
 for(const pin of RECORDING_TIMING_GROUP_PINS){
  const record=library?.byId.get(pin.recordingId),serialized=JSON.stringify(record);
  if(!record||await sha256(serialized)!==pin.recordSha256)refuse();
  const measured=pitchManifest.records.find(r=>r.id===record.id),policy=sourceTimingPolicy(record);
  if(policy.kind!=='partial-original-windows'||measured?.wordTiming!==record.status||measured.sourceAudio.sha1!==record.audio.sha1||measured.sourceAudio.bytes!==record.audio.bytes)refuse();
  snapshots.set(record.id,{record,serialized});
  let offset=0;const offsets=record.words.map(w=>{const n=offset;offset+=w.sourceWords.length;return n;});
  for(const group of pin.groups){
   const first=record.words.findIndex(w=>w.id===group.wordIds[0]),last=first+group.wordIds.length-1,members=record.words.slice(first,last+1);
   if(first<1||last+1>=record.words.length||!same(members.map(w=>w.id),group.wordIds)||!same(members.map(w=>w.uxlcHebrew),group.readerHebrew)||members.some(w=>policy.windows.has(w.id)||w.startSeconds!==null||w.endSeconds!==null))refuse();
   const startIndex=offsets[first],endIndex=offsets[last+1],start=record.rawStarts[startIndex],end=record.rawStarts[endIndex];
   const faults=policy.ambiguities.filter(a=>start<=a.highSeconds&&end>=a.lowSeconds);
   if(!same([startIndex,endIndex,start,end],[group.sourceStartIndex,group.sourceEndIndex,group.startSeconds,group.endSeconds])||!Number.isFinite(start)||!Number.isFinite(end)||start<0||!(start<end&&end<=measured.durationSeconds)||!faults.length||faults.some(a=>!(start<a.lowSeconds&&a.highSeconds<end))||record.rawStarts.slice(startIndex,endIndex).some(t=>t<start||t>=end)||!policy.windows.has(record.words[first-1].id)||!policy.windows.has(record.words[last+1].id))refuse();
   const source={...group,recordingId:record.id,referenceStartIndex:first,referenceEndIndex:last,timingSource:structuredClone(record.timingSource),sourceAudio:structuredClone(record.audio),sourceIssues:structuredClone(record.issues),measuredDurationSeconds:measured.durationSeconds};
   for(const id of group.wordIds){if(byWord.has(id))refuse();byWord.set(id,source);}
  }
 }
 function at(words,index){
  const word=words[index],source=byWord.get(word?.sourceWordId??word?.id);if(!source)return null;
  const snapshot=snapshots.get(source.recordingId),record=library.byId.get(source.recordingId);
  if(record!==snapshot.record||JSON.stringify(record)!==snapshot.serialized)refuse();
  const position=source.wordIds.indexOf(word.sourceWordId??word.id),first=index-position,last=first+source.wordIds.length-1,members=words.slice(first,last+1),section=word.sectionId;
  if(first<0||last>=words.length||members.length!==source.wordIds.length||typeof section!=='string'||!section)return null;
  const occurrences=new Set();
  for(const [n,w] of members.entries()){
   const canonical=source.wordIds[n],entry=library.at(w),original=record.words[source.referenceStartIndex+n];
   if((w.sourceWordId??w.id)!==canonical||w.sourceHebrew!==source.readerHebrew[n]||w.index!==first+n||w.sectionId!==section||typeof w.id!=='string'||!w.id||occurrences.has(w.id)||entry?.recording!==record||entry?.word!==original)return null;
   occurrences.add(w.id);
  }
  return {...structuredClone(source),kind:'recording-timing-group',firstIndex:first,lastIndex:last,sectionId:section,occurrenceIds:members.map(w=>w.id),wordIndices:members.map(w=>w.index),recordingHebrew:members.map(w=>library.at(w).word.sourceHebrew),individualWordTimes:null,syllableTimes:null,phonemes:null,acousticReview:null,musicalReview:null};
 }
 function plan(words,start,end,{allowTimingGroups=false}={}){
  if(!allowTimingGroups)return sourceTimedPracticePlan(library,words,start,end);
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>=words.length)throw Error('Choose a valid recording span.');
  const rows=[],groups=[],segments=[],records=new Map();let pending=[];
  const flush=()=>{if(pending.length)segments.push(...splitReferenceSegments(pending));pending=[];};
  for(let index=start;index<=end;index++){
   const candidate=byWord.get(words[index].sourceWordId??words[index].id);
   if(candidate){
    const group=at(words,index);
    if(!group||group.firstIndex!==index||group.lastIndex>end)throw Error('This span cuts an ambiguous recording timing group. Select its complete original group; individual word times remain unassigned.');
    flush();groups.push(group);segments.push({recordingId:group.recordingId,start:group.startSeconds,end:group.endSeconds,words:[],timingGroup:group});records.set(group.recordingId,library.byId.get(group.recordingId));index=group.lastIndex;
   }else{
    const single=sourceTimedPracticePlan(library,words,index,index);rows.push(...single.rows);pending.push(...single.rows);for(const record of single.records)records.set(record.id,record);
   }
  }
  flush();const chosen=[...records.values()];
  return {rows,groups,segments,records:chosen,words:end-start+1,timedWords:rows.length,groupWords:groups.reduce((n,g)=>n+g.wordIds.length,0),bytes:chosen.reduce((n,r)=>n+r.audio.bytes,0)};
 }
 return Object.freeze({at,plan});
}
