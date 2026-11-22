import {recordedSemitones,RECORDED_PITCH_ENGINE} from './recorded-pitch.js';
import {RECORDED_PITCH_WORKER_SOURCE} from './recorded-pitch-worker-data.js';

const cancelled=signal=>{if(signal?.aborted)throw new DOMException('Stopped','AbortError');};
export function pitchProcessingSupported(){return typeof Worker!=='undefined'&&typeof WebAssembly!=='undefined'&&typeof OfflineAudioContext!=='undefined'&&!!globalThis.crypto?.subtle;}
export async function decodePitchSource(blob,{signal}={}){
  cancelled(signal);const bytes=await blob.arrayBuffer();cancelled(signal);
  const context=new OfflineAudioContext(1,1,44100),decoded=await context.decodeAudioData(bytes);cancelled(signal);return decoded;
}
export async function originalMediaDuration(blob,{signal}={}){
  cancelled(signal);const media=new Audio(),url=URL.createObjectURL(blob);media.preload='metadata';media.volume=0;
  try{return await new Promise((resolve,reject)=>{
    const cleanup=()=>{media.onloadedmetadata=null;media.onerror=null;signal?.removeEventListener('abort',abort);};
    const abort=()=>{cleanup();reject(new DOMException('Stopped','AbortError'));};
    media.onloadedmetadata=()=>{cleanup();Number.isFinite(media.duration)&&media.duration>0?resolve(media.duration):reject(Error('The original recording has no usable duration.'));};
    media.onerror=()=>{cleanup();reject(Error('The original recording metadata could not be decoded.'));};
    signal?.addEventListener('abort',abort,{once:true});media.src=url;
  });}finally{media.pause();media.removeAttribute('src');media.load();URL.revokeObjectURL(url);}
}
export function renderRecordedPitch(channels,sampleRate,semitones,{signal,onProgress=()=>{},workerSource=RECORDED_PITCH_WORKER_SOURCE,makeWorker}={}){
  cancelled(signal);recordedSemitones(semitones);
  if(!makeWorker&&!workerSource)throw Error('The embedded pitch processor is unavailable. Use original pitch.');
  return new Promise((resolve,reject)=>{
    let worker,url,settled=false;
    const cleanup=()=>{settled=true;signal?.removeEventListener('abort',abort);if(worker){worker.onmessage=null;worker.onerror=null;worker.terminate();}if(url)URL.revokeObjectURL(url);};
    const fail=error=>{cleanup();reject(error);},abort=()=>fail(new DOMException('Stopped','AbortError'));
    try{
      if(makeWorker)worker=makeWorker();else{url=URL.createObjectURL(new Blob([workerSource],{type:'text/javascript'}));worker=new Worker(url);}
      worker.onerror=()=>fail(Error('The pitch processor could not start in this browser. Use original pitch.'));
      worker.onmessage=event=>{
        if(settled||signal?.aborted)return;
        const value=event.data;
        if(value?.type==='progress'){if(Number.isFinite(value.value)&&value.value>=0&&value.value<=1)onProgress(value.value);return;}
        if(value?.type==='error'){fail(Error(value.message??'Pitch processing failed.'));return;}
        if(value?.type==='result'){
          if(!(value.buffer instanceof ArrayBuffer)||value.buffer.byteLength<44){fail(Error('The pitch processor returned invalid audio.'));return;}
          cleanup();resolve(value);
        }
      };
      signal?.addEventListener('abort',abort,{once:true});cancelled(signal);
      worker.postMessage({channels,sampleRate,semitones},channels.map(channel=>channel.buffer));
    }catch(error){fail(error);}
  });
}

// At most two session-only derivatives, separate from original device storage.
// Each derived WAV uses the original timeline; transformation is never a source
// pronunciation style, reviewed tradition or replacement master recording.
export class RecordedPitchStore {
  constructor({sourceStore,fetchFile=(...args)=>fetch(...args),decode=decodePitchSource,probe=originalMediaDuration,render=renderRecordedPitch,makeUrl=blob=>URL.createObjectURL(blob),revokeUrl=url=>URL.revokeObjectURL(url),maxEntries=2,maxBytes=128*1048576,onProgress=()=>{},onReady=()=>{}}={}){
    this.sourceStore=sourceStore;this.fetchFile=fetchFile;this.decode=decode;this.probe=probe;this.render=render;this.makeUrl=makeUrl;this.revokeUrl=revokeUrl;this.maxEntries=maxEntries;this.maxBytes=maxBytes;this.onProgress=onProgress;this.onReady=onReady;this.cache=new Map();
  }
  async url(record,{signal,semitones=0}={}){
    recordedSemitones(semitones);cancelled(signal);
    if(semitones===0)return this.sourceStore.url(record,{signal});
    const key=JSON.stringify([record.id,record.audio.sha1,RECORDED_PITCH_ENGINE.revision,semitones,44100,'formant-compensation']);
    if(this.cache.has(key)){const entry=this.cache.get(key);this.cache.delete(key);this.cache.set(key,entry);this.onReady(entry.metadata);return entry.url;}
    this.onProgress(0,'Reading the verified original recording');
    const sourceUrl=await this.sourceStore.url(record,{signal});cancelled(signal);
    const response=await this.fetchFile(sourceUrl,{signal});if(!response.ok)throw Error('The original recording could not be read for pitch processing.');
    const blob=new Blob([await response.arrayBuffer()],{type:'audio/mpeg'});cancelled(signal);await this.sourceStore.verify(record,blob);cancelled(signal);
    this.onProgress(0,'Decoding the verified original recording');
    let [decoded,nativeDuration]=await Promise.all([this.decode(blob,{signal}),this.probe(blob,{signal})]);cancelled(signal);
    const delta=decoded.duration-nativeDuration;
    if(!Number.isFinite(nativeDuration)||nativeDuration<=0||!Number.isFinite(decoded.duration)||Math.abs(delta)>.02)throw Error('The decoded recording differs from its original timeline. Use original pitch; timing review is needed.');
    const targetFrames=Math.round(nativeDuration*decoded.sampleRate);
    const channels=Array.from({length:decoded.numberOfChannels},(_,c)=>{const channel=new Float32Array(targetFrames);channel.set(decoded.getChannelData(c).subarray(0,targetFrames));return channel;});
    const sourceInfo={sampleRate:decoded.sampleRate,duration:decoded.duration,length:decoded.length};decoded=null;
    this.onProgress(0,'Preparing the processed recording');
    const result=await this.render(channels,sourceInfo.sampleRate,semitones,{signal,onProgress:value=>this.onProgress(value,'Preparing the processed recording')});cancelled(signal);
    if(result.metadata?.frames!==targetFrames||result.metadata?.sampleRate!==sourceInfo.sampleRate||result.metadata?.semitones!==semitones||result.metadata?.formantCompensation!==true)throw Error('Pitch processing changed the recording timeline or parameters.');
    const processed=new Blob([result.buffer],{type:'audio/wav'}),metadata={...result.metadata,recordingId:record.id,sourceSha1:record.audio.sha1,sourceBytes:record.audio.bytes,nativeDurationSeconds:nativeDuration,decodedDurationSeconds:sourceInfo.duration,decodedNativeDeltaSeconds:delta,tailAdjustmentFrames:targetFrames-sourceInfo.length,durationSeconds:targetFrames/sourceInfo.sampleRate,sourcePronunciation:'fixed_original_performance',pronunciationTransformation:'none_requested',pronunciationEquivalenceReview:null,acousticReview:null};
    const url=this.makeUrl(processed);this.cache.set(key,{url,bytes:processed.size,metadata});
    let bytes=[...this.cache.values()].reduce((sum,x)=>sum+x.bytes,0);
    while(this.cache.size>1&&(this.cache.size>this.maxEntries||bytes>this.maxBytes)){const first=this.cache.keys().next().value,entry=this.cache.get(first);this.cache.delete(first);bytes-=entry.bytes;this.revokeUrl(entry.url);}
    this.onReady(metadata);return url;
  }
  clear(){for(const entry of this.cache.values())this.revokeUrl(entry.url);this.cache.clear();}
}
