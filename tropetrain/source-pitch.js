// Measurement adaptation: CC BY-SA 3.0. This is evidence, not a musical score.
import {SOURCE_PITCH_MANIFEST} from './source-pitch-manifest.js';
export const pitchManifest=SOURCE_PITCH_MANIFEST;
export function validatePitchRecord(data,entry){
 const p=pitchManifest.parameters,c=data?.counts;
 if(!entry||data?.schema!=='tropetrain-source-pitch-measurement-v1'||data.revision!==1||data.id!==entry.id||data.implementationSha256!==pitchManifest.implementationSha256||data.referencePacketSha256!==pitchManifest.referencePacketSha256||JSON.stringify(data.parameters)!==JSON.stringify(p))throw Error('Pitch evidence version or source changed.');
 if(JSON.stringify(data.sourceAudio)!==JSON.stringify(entry.sourceAudio)||data.decodedPcm?.sha256!==entry.pcmSha256||data.decodedPcm.durationSeconds!==entry.durationSeconds||JSON.stringify(c)!==JSON.stringify(entry.counts))throw Error('Pitch evidence input or counts changed.');
 if(data.alignment?.kind!=='source-recording-time-only'||['syllableTimes','phonemes','musicalNotes','traditionalGrammar'].some(k=>data.alignment[k]!==null)||data.rights?.adaptationLicense!=='CC-BY-SA-3.0')throw Error('Unsupported pitch evidence alignment or rights.');
 if(!Number.isInteger(c.frames)||c.frames!==Math.ceil(data.decodedPcm.frames/p.hop)||c.frames!==c.periodicFrames+c.unassignedFrames||c.belowRmsFrames>c.unassignedFrames||data.series?.length!==c.periodicFrames)throw Error('Invalid pitch evidence frame counts.');
 let previous=-1;
 for(const row of data.series){if(!Array.isArray(row)||row.length!==3||!row.every(Number.isInteger)||row[0]<=previous||row[0]>=c.frames||row[1]<p.minHz/p.frequencyUnitHz||row[1]>p.maxHz/p.frequencyUnitHz||row[2]<9000||row[2]>10000)throw Error('Invalid pitch measurement.');previous=row[0];}
 return data;
}
export function pitchWordWindow(data,entry,readerWord){
 if(!entry||entry.recording.id!==data.id||entry.recording.audio.sha1!==data.sourceAudio.sha1)throw Error('The pitch and recording sources differ.');
 if(entry.word.uxlcHebrew!==readerWord.sourceHebrew||(readerWord.sourceWordId??readerWord.id)!==entry.word.id)throw Error('The marked Hebrew changed; correspondence needs review.');
 if(entry.recording.status!=='aligned')throw Error('Source word timings need review. Use the complete recording; no word pitch window is assigned.');
 const word=entry.word,start=word.startSeconds,end=word.endSeconds??data.decodedPcm.durationSeconds;
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>data.decodedPcm.durationSeconds+.1)throw Error('Source word bounds need review.');
 const hop=data.parameters.hop/data.parameters.sampleRate,first=Math.ceil(start/hop),last=Math.min(data.counts.frames,Math.ceil(end/hop));
 return {wordId:word.id,occurrenceId:readerWord.id,hebrew:readerWord.sourceHebrew,sourceHebrew:word.sourceHebrew,comparison:word.comparison,startSeconds:start,endSeconds:end,endKind:word.endSeconds===null?'recording end; not a reviewed word offset':'source word boundary',frames:Math.max(0,last-first),series:data.series.filter(row=>row[0]>=first&&row[0]<last),syllableTimes:null,phonemes:null,musicalNotes:null};
}
export function pitchFrame(row){
 if(!row)return null;
 const hz=row[1]*pitchManifest.parameters.frequencyUnitHz;
 return {frame:row[0],seconds:row[0]*pitchManifest.parameters.hop/pitchManifest.parameters.sampleRate,hz,periodicity:row[2]*pitchManifest.parameters.periodicityUnit};
}
export class SourcePitchStore {
 constructor({read,hash,decode,maxEntries=4}={}){
  this.cache=new Map();this.pending=new Map();this.maxEntries=maxEntries;
  this.read=read??(async entry=>{
   const embedded=document.getElementById('source-pitch-packets');
   if(embedded){this.embedded??=JSON.parse(embedded.textContent);const text=this.embedded[entry.id];if(!text)throw Error('Embedded pitch evidence is absent.');return Uint8Array.from(atob(text),c=>c.charCodeAt(0));}
   const response=await fetch(new URL('./data/pitch/'+entry.file,document.baseURI));if(!response.ok)throw Error('Pitch evidence could not be loaded.');return new Uint8Array(await response.arrayBuffer());
  });
  this.hash=hash??(async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join(''));
  this.decode=decode??(async bytes=>JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()));
 }
 async get(id){
  const entry=pitchManifest.records.find(r=>r.id===id);if(!entry)throw Error('No pitch evidence for this recording.');
  if(this.cache.has(id)){const data=this.cache.get(id);this.cache.delete(id);this.cache.set(id,data);return data;}
  if(this.pending.has(id))return this.pending.get(id);
  const job=(async()=>{const bytes=await this.read(entry);if(bytes.length!==entry.bytes||await this.hash(bytes)!==entry.sha256)throw Error('Pitch evidence checksum failed.');const data=validatePitchRecord(await this.decode(bytes),entry);this.cache.set(id,data);while(this.cache.size>this.maxEntries)this.cache.delete(this.cache.keys().next().value);return data;})();
  this.pending.set(id,job);try{return await job;}finally{this.pending.delete(id);}
 }
}
