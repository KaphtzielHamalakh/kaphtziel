// Source-data adaptation CC BY-SA 3.0; source timing CC BY-SA 2.5.
import {loadHaftarahData} from './haftarah-reference-data.js';
import {recordingRate} from './recorded-reference.js';
import {recordedSemitones} from './recorded-pitch.js';
export class HaftarahLibrary {
 constructor(data){
  if(data?.schema!=='tropetrain-haftarah-reference-library-v1'||data.revision!==1||data.originalCommit!=='c8540eae1c5e07138aafc89afb571b71326d13dd'||data.records.length!==54)throw Error('Unsupported Haftarah source catalog.');
  this.source={...data,records:undefined};this.audit=data.audit;this.byId=new Map();this.wordMaps=new Map();
  this.records=data.records.map(packed=>{
   const pcm=packed.audio.decodedPcm;
   if(this.byId.has(packed.id)||!['source-timed','timing-review'].includes(packed.status)||packed.audio.measuredDurationSeconds!==pcm.pcmFrames/pcm.pcmSampleRate||pcm.pcmSampleRate!==16000||pcm.pcmChannels!==1||!/^[a-f0-9]{40}$/.test(packed.audio.sha1)||!Number.isInteger(packed.audio.bytes)||packed.audio.bytes<=0||!packed.sections.length)throw Error('Haftarah source identity needs review.');
   const wordMap=new Map(),record={...packed,words:packed.rows.map((row,index)=>{
    const [id,uxlcHebrew,parts,startSeconds,endSeconds]=row;
    const sourceWords=parts.map(([sourceToken,chapter,verse,ordinal,editorialCodes,writtenVariants])=>({id:`wlc-2012-${packed.bookId}-${chapter}-${verse}-${ordinal}`,sourceToken,sourceHebrew:sourceToken.replaceAll('/',''),chapter,verse,ordinal,editorialCodes,writtenVariants}));
    const sourceHebrew=sourceWords.map(p=>p.sourceHebrew).join(' '),comparison=id===null?'unmapped-source-form':sourceWords.length>1?'source-boundaries':sourceHebrew===uxlcHebrew?'exact':sourceHebrew.replaceAll('\u034f','')===uxlcHebrew.replaceAll('\u034f','')?'joiner-only':'source-difference';
    const word={id,uxlcHebrew,recordingId:packed.id,referenceIndex:index,sourceWords,sourceHebrew,comparison,startSeconds,endSeconds};
    if(packed.status==='source-timed'&&(!Number.isFinite(startSeconds)||startSeconds<0||endSeconds!==null&&(!Number.isFinite(endSeconds)||endSeconds<=startSeconds)))throw Error('Haftarah source timestamps need review.');
    if(id!==null){if(typeof id!=='string'||!uxlcHebrew||wordMap.has(id))throw Error('Duplicate Haftarah word in one source recording.');wordMap.set(id,word);}
    return word;
   })};
   this.byId.set(record.id,record);this.wordMaps.set(record.id,wordMap);return record;
  });
 }
 record(id){const record=this.byId.get(id);if(!record)throw Error('Choose an available Haftarah source recording.');return record;}
 selection(id,words,start,end){
  const record=this.record(id),map=this.wordMaps.get(id);
  if(!Array.isArray(words)||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>=words.length)throw Error('Choose a valid reader span.');
  if(record.status!=='source-timed')throw Error(`${record.title} has unreliable source word timings. Complete-recording playback remains available; no word boundary is repaired.`);
  return words.slice(start,end+1).map(word=>{
   const match=map.get(word.sourceWordId??word.id);
   if(!match)throw Error(`This reader span is not fully mapped to ${record.title}. Open this source reading, or use its complete recording. Unmatched forms stay unassigned.`);
   if(match.uxlcHebrew!==word.sourceHebrew)throw Error('The marked reader Hebrew changed; Haftarah source alignment requires review.');
   const last=match.endSeconds??record.audio.measuredDurationSeconds;
   if(!(match.startSeconds<last&&last<=record.audio.measuredDurationSeconds))throw Error('A source word lies outside the measured original audio. No boundary is changed.');
   return {...match,occurrenceId:word.id,wordIndex:word.index};
  });
 }
}
export function restoreHaftarahPreferences(saved,library){
 const result={recordingId:library.records[0].id,volume:0,rate:100,semitones:0,repeat:false};
 if(!saved||typeof saved!=='object')return result;
 if(library.byId.has(saved.recordingId))result.recordingId=saved.recordingId;
 if(Number.isInteger(saved.volume)&&saved.volume>=0&&saved.volume<=100)result.volume=saved.volume;
 if(typeof saved.repeat==='boolean')result.repeat=saved.repeat;
 if([50,65,75,85,100,115,125,150].includes(saved.rate)){recordingRate(saved.rate/100);result.rate=saved.rate;}
 try{recordedSemitones(saved.semitones);result.semitones=saved.semitones;}catch{}
 return result;
}
export function haftarahSections(record){
 if(!record.readerSectionsValid)throw Error('The original passage definition lies outside this reader edition. Complete-recording playback remains available; no replacement passage is inferred.');
 return record.sections.map((span,index)=>({...structuredClone(span),id:`${record.id}-section-${index+1}`,label:`${record.title}${record.sections.length>1?' · source section '+(index+1):''}`}));
}
let promise;
export function getHaftarahLibrary(){return promise??=loadHaftarahData().then(data=>new HaftarahLibrary(data));}
