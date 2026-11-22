// Original software CC0-1.0; generated source-measurement adaptations CC BY-SA3.0.
import {sourceTimingPolicy} from './source-word-windows.js';
import {SourcePitchStore,pitchManifest,pitchWordWindow} from './source-pitch.js';
import {CONTOUR_RENDERING,contourSemitones} from './source-contour.js';
import {SOURCE_CONTOUR_WORKER_SOURCE} from './source-contour-worker-data.js';
const check=signal=>{if(signal?.aborted)throw new DOMException('Stopped','AbortError');};
export const contourSupported=()=>typeof Worker!=='undefined'&&!!globalThis.crypto?.subtle&&typeof DecompressionStream!=='undefined';
export function renderContourWorker(data,semitones,{signal,onProgress=()=>{},makeWorker,workerSource=SOURCE_CONTOUR_WORKER_SOURCE}={}){
 check(signal);contourSemitones(semitones);
 if(!makeWorker&&!workerSource)throw Error('The embedded measured-tone renderer is unavailable.');
 return new Promise((resolve,reject)=>{
  let worker,url,settled=false;
  const cleanup=()=>{settled=true;signal?.removeEventListener('abort',abort);if(worker){worker.onmessage=null;worker.onerror=null;worker.terminate();}if(url)URL.revokeObjectURL(url);};
  const fail=e=>{if(settled)return;cleanup();reject(e);},abort=()=>fail(new DOMException('Stopped','AbortError'));
  try{
   if(makeWorker)worker=makeWorker();else{url=URL.createObjectURL(new Blob([workerSource],{type:'text/javascript'}));worker=new Worker(url);}
   worker.onerror=()=>fail(Error('The measured-tone renderer could not start.'));
   worker.onmessage=event=>{
    if(settled||signal?.aborted)return;const value=event.data;
    if(value?.type==='progress'){if(Number.isFinite(value.value)&&value.value>=0&&value.value<=1)onProgress(value.value);return;}
    if(value?.type==='error'){fail(Error(value.message??'Measured-tone preparation failed.'));return;}
    if(value?.type==='result'){if(!(value.buffer instanceof ArrayBuffer)||value.buffer.byteLength!==44+data.decodedPcm.frames*2){fail(Error('The measured-tone renderer returned invalid audio.'));return;}cleanup();resolve(value);}
   };
   signal?.addEventListener('abort',abort,{once:true});check(signal);worker.postMessage({data,semitones});
  }catch(error){fail(error);}
 });
}
export class SourceContourStore {
 constructor({pitchStore=new SourcePitchStore(),render=renderContourWorker,makeUrl=blob=>URL.createObjectURL(blob),revokeUrl=url=>URL.revokeObjectURL(url),onProgress=()=>{},onReady=()=>{},maxEntries=2,maxBytes=96*1048576}={}){
  Object.assign(this,{pitchStore,render,makeUrl,revokeUrl,onProgress,onReady,maxEntries,maxBytes});this.cache=new Map();this.wordCache=new Map();
 }
 async url(record,{signal,semitones=0}={}){
  check(signal);contourSemitones(semitones);const entry=pitchManifest.records.find(r=>r.id===record?.id);
  if(!sourceTimingPolicy(record).eligibleWords||entry?.wordTiming!==record?.status||record.audio?.sha1!==entry.sourceAudio.sha1||record.audio.bytes!==entry.sourceAudio.bytes)throw Error('Measured-tone source or word timings need review; no audio is substituted.');
  const key=JSON.stringify([record.id,entry.sha256,CONTOUR_RENDERING.revision,semitones]);
  if(this.cache.has(key)){const hit=this.cache.get(key);this.cache.delete(key);this.cache.set(key,hit);this.onReady(hit.metadata);return hit.url;}
  this.onProgress(0,'Reading and verifying source measurements');const data=await this.pitchStore.get(record.id);check(signal);
  if(data.sourceAudio.sha1!==record.audio.sha1||data.sourceAudio.bytes!==record.audio.bytes)throw Error('The measured-tone source differs from the recording.');
  const result=await this.render(data,semitones,{signal,onProgress:value=>this.onProgress(value,'Preparing measured sine tones')});check(signal);
  const m=result.metadata;
  if(m?.schema!=='tropetrain-measured-tone-render-v1'||m.revision!==CONTOUR_RENDERING.revision||m.recordingId!==record.id||m.frames!==data.decodedPcm.frames||m.sampleRate!==16000||m.durationSeconds!==data.decodedPcm.durationSeconds||m.semitones!==semitones||m.assignedMeasurementFrames!==data.counts.periodicFrames||m.unassignedMeasurementFrames!==data.counts.unassignedFrames||result.buffer?.byteLength!==44+m.frames*2)throw Error('Measured-tone rendering changed its source timeline or parameters.');
  const blob=new Blob([result.buffer],{type:'audio/wav'}),metadata={...m,measurementFile:entry.file,measurementSha256:entry.sha256,implementationSha256:data.implementationSha256,referencePacketSha256:data.referencePacketSha256,sourceAudio:data.sourceAudio,decodedPcm:data.decodedPcm,rights:data.rights,sourcePerformance:'PocketTorah source recording; estimated frequencies only. No Kinnor preset or independently pronounced voice.'};
  const url=this.makeUrl(blob);this.cache.set(key,{url,metadata,bytes:blob.size});let bytes=[...this.cache.values()].reduce((n,x)=>n+x.bytes,0);
  while(this.cache.size>1&&(this.cache.size>this.maxEntries||bytes>this.maxBytes)){const first=this.cache.keys().next().value,old=this.cache.get(first);this.cache.delete(first);bytes-=old.bytes;this.revokeUrl(old.url);}
  this.onReady(metadata);return url;
 }
 wordSummary(entry,word){
  const data=this.pitchStore.cache.get(entry?.recording?.id);if(!data)return null;
  const key=JSON.stringify([data.id,word.id,word.sourceWordId,word.sourceHebrew]);
  if(!this.wordCache.has(key)){
   const w=pitchWordWindow(data,entry,word);if(this.wordCache.size>=256)this.wordCache.delete(this.wordCache.keys().next().value);
   this.wordCache.set(key,{wordId:w.wordId,occurrenceId:w.occurrenceId,hebrew:w.hebrew,sourceHebrew:w.sourceHebrew,comparison:w.comparison,startSeconds:w.startSeconds,endSeconds:w.endSeconds,endKind:w.endKind,measuredFrameOnsets:w.series.length,totalFrameOnsets:w.frames});
  }
  return this.wordCache.get(key);
 }
 clear(){for(const e of this.cache.values())this.revokeUrl(e.url);this.cache.clear();this.wordCache.clear();}
}
