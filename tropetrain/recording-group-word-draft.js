// Original annotation policy CC0. PocketTorah text/audio/correspondence keep
// their own attribution. Personal marks never replace the original clocks.
import {createRecordingTimingGroups} from './recording-timing-groups.js';
import {RECORDING_TIMING_GROUP_PINS,RECORDING_TIMING_GROUP_SOURCE} from './recording-timing-group-pins.js';
import {pitchManifest} from './source-pitch.js';

const clone=value=>structuredClone(value),canonical=word=>word.sourceWordId??word.id;
const bases=new Set(['manual-entry','source-playhead','muted-clock']);
const same=(a,b)=>a===b||!!a&&!!b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&same(a[k],b[k]));

export async function createRecordingGroupWordDrafts(library){
 const groups=await createRecordingTimingGroups(library),sourceSnapshot=JSON.stringify(library.source);
 const measurements=new Map(RECORDING_TIMING_GROUP_PINS.map(pin=>{const row=pitchManifest.records.find(r=>r.id===pin.recordingId);return[pin.recordingId,JSON.stringify(row)];}));
 function create(words,index){
  if(JSON.stringify(library.source)!==sourceSnapshot||pitchManifest.referencePacketSha256!==RECORDING_TIMING_GROUP_SOURCE.packetSha256)throw Error('Original recording source identity changed; this draft is withheld.');
  const group=groups.at(words,index);
  if(!group)throw Error('Open a complete original recording timing group in one section before drafting word boundaries.');
  const record=library.byId.get(group.recordingId),measured=pitchManifest.records.find(r=>r.id===record.id),pin=RECORDING_TIMING_GROUP_PINS.find(p=>p.recordingId===record.id);
  if(JSON.stringify(measured)!==measurements.get(record.id))throw Error('Original measured recording identity changed; this draft is withheld.');
  return {schema:'tropetrain-recording-group-word-draft-v1',revision:1,status:'personal-unreviewed',
   source:{recordingId:record.id,originalCommit:RECORDING_TIMING_GROUP_SOURCE.originalCommit,referencePacketSha256:RECORDING_TIMING_GROUP_SOURCE.packetSha256,recordSha256:pin.recordSha256,
    audio:clone(record.audio),measuredDurationSeconds:measured.durationSeconds,measuredPcmSha256:measured.pcmSha256,measurementPacketSha256:measured.sha256,timingSource:clone(record.timingSource)},
   group:{id:group.id,sectionId:group.sectionId,wordIds:group.wordIds.slice(),occurrenceIds:group.occurrenceIds.slice(),readerHebrew:group.readerHebrew.slice(),sourceStartIndex:group.sourceStartIndex,sourceEndIndex:group.sourceEndIndex,startSeconds:group.startSeconds,endSeconds:group.endSeconds,individualWordTimes:null},
   recordingAttribution:Object.fromEntries(['source','creator','projectCredits','individualReader','sourceUrl','audioLicense','timingLicense','alignmentLicense','originalCommit'].map(k=>[k,clone(library.source[k]??null)])),
   sourceEditionCompared:false,recordedPronunciationEquivalent:null,phonemes:null,syllableAlignment:null,musicalNotes:null,independentReview:null,
   words:words.slice(group.firstIndex,group.lastIndex+1).map(w=>{const original=library.at(w).word;return{id:canonical(w),occurrenceId:w.id,hebrew:w.sourceHebrew,recordingHebrew:original.sourceHebrew,sourceComparison:original.comparison,sourceWords:clone(original.sourceWords),originalStartSeconds:null,originalEndSeconds:null,start:null,end:null,startBasis:null,endBasis:null};})};
 }
 function validate(value,words,index){
  const expected=create(words,index);
  if(!value||typeof value!=='object'||Array.isArray(value)||!Array.isArray(value.words)||value.words.length!==expected.words.length)throw Error('A complete personal recording-group word draft is required.');
  const fixed=clone(value);let last=expected.group.startSeconds;
  for(const [i,word] of value.words.entries()){
   if(!word||typeof word!=='object'||Array.isArray(word))throw Error('Draft word identity changed.');
   for(const key of ['start','end']){
    const n=word[key],basis=word[key+'Basis'];
    if(n===null){if(basis!==null)throw Error('A blank boundary must have no annotation basis.');}
    else{
     if(typeof n!=='number'||!Number.isFinite(n)||n<expected.group.startSeconds||n>expected.group.endSeconds)throw Error('Personal word boundaries must stay inside the unchanged original group interval.');
     if(!bases.has(basis))throw Error('Word boundaries require a personal entry or playhead basis; review cannot be certified here.');
     if(n<last)throw Error('Personal word boundaries must follow source order without overlaps. Clear an incorrect mark before replacing it.');
     last=n;
    }
    fixed.words[i][key]=null;fixed.words[i][key+'Basis']=null;
   }
   if(word.start!==null&&word.end!==null&&word.start>=word.end)throw Error('A personal word end must follow its start.');
  }
  if(!same(fixed,expected))throw Error('Draft source, group, marked Hebrew, occurrence or unreviewed evidence fields changed.');
  return clone(value);
 }
 function setBoundaries(value,words,index,wordIndex,values,basis='manual-entry'){
  const next=validate(value,words,index);
  if(!Number.isInteger(wordIndex)||wordIndex<0||wordIndex>=next.words.length||!values||Object.keys(values).some(k=>!['start','end'].includes(k))||!bases.has(basis))throw Error('Choose a personal word boundary.');
  for(const [key,n]of Object.entries(values)){next.words[wordIndex][key]=n;next.words[wordIndex][key+'Basis']=n===null?null:basis;}
  return validate(next,words,index);
 }
 function capture(value,words,index,wordIndex,key,position){
  const checked=validate(value,words,index);
  if(!['start','end'].includes(key)||!position||position.recordingId!==checked.source.recordingId||position.groupId!==checked.group.id||position.reviewBasis!=='original-recording-group-review'||!['audio','muted'].includes(position.mode))throw Error('Play this complete group or its personal draft in the original recording before capturing its playhead.');
  return setBoundaries(checked,words,index,wordIndex,{[key]:position.seconds},position.mode==='muted'?'muted-clock':'source-playhead');
 }
 function preview(value,words,index,{kind,wordIndex}={}){
  const checked=validate(value,words,index);let start=checked.group.startSeconds,end=checked.group.endSeconds,word=null;
  if(kind==='word'){
   word=Number.isInteger(wordIndex)?checked.words[wordIndex]:null;
   if(!word||word.start===null||word.end===null)throw Error('Enter both personal boundaries before auditioning this draft word.');
   start=word.start;end=word.end;
  }else if(kind!=='original-group')throw Error('Choose the complete original group or an explicitly bounded personal word.');
  return {record:library.byId.get(checked.source.recordingId),segment:{recordingId:checked.source.recordingId,start,end,words:[],recordingGroupReview:{reviewBasis:'original-recording-group-review',kind,groupId:checked.group.id,occurrenceId:word?.occurrenceId??null,hebrew:word?.hebrew??null,startSeconds:start,endSeconds:end,status:'personal-unreviewed',individualSourceWordTimes:null,syllableTimes:null,phonemes:null,review:null}}};
 }
 function parse(text,words,index){if(typeof text!=='string'||text.length>1000000)throw Error('Draft JSON must be smaller than 1 MB.');return validate(JSON.parse(text),words,index);}
 return Object.freeze({create,validate,setBoundaries,capture,preview,parse,
  key(value,words,index){const d=validate(value,words,index);return`tropetrain-recording-group-word-draft-v2:${d.source.audio.sha1}:${d.group.id}:${encodeURIComponent(JSON.stringify([d.group.sectionId,d.group.occurrenceIds]))}`;},
  legacyKey(value,words,index){const d=validate(value,words,index);return`tropetrain-recording-group-word-draft-v1:${d.source.audio.sha1}:${d.group.id}:${encodeURIComponent(JSON.stringify(d.group.occurrenceIds))}`;},
  restoreLegacy(text,words,index){try{return parse(text,words,index);}catch{return null;}}
 });
}
