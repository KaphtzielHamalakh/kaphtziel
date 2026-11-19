import {scheduleInstrument,validatePlan} from './synthesis.js';

export function wavSummary(plan,sampleRate=22050){
  const duration=validatePlan(plan);
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>96000)throw Error('Invalid audio sample rate.');
  const frames=Math.ceil(duration*sampleRate),bytes=44+frames*2;
  if(bytes-8>0xffffffff)throw Error('This span exceeds the WAV file-size limit. Export its assigned sections separately.');
  return {duration,sampleRate,frames,bytes};
}
export function wavHeader(frames,sampleRate){
  const buffer=new ArrayBuffer(44),view=new DataView(buffer);
  const text=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,36+frames*2,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);
  view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);
  view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,frames*2,true);return buffer;
}
export function pcm16(samples){
  const out=new ArrayBuffer(samples.length*2),view=new DataView(out);
  for(let i=0;i<samples.length;i++){const v=Math.min(1,Math.max(-1,samples[i]));view.setInt16(i*2,Math.round(v*(v<0?32768:32767)),true);}
  return out;
}
// Batches end at note onsets, so a sustained oscillator is never restarted at
// an arbitrary chunk boundary. Only one short float buffer exists at a time.
export function* audioBatches(plan,sampleRate=22050,seconds=20){
  const {frames}=wavSummary(plan,sampleRate);let first=0,startFrame=0;
  while(first<plan.length){
    let end=first+1;
    while(end<plan.length&&plan[end].startSeconds-startFrame/sampleRate<seconds)end++;
    const endFrame=end<plan.length?Math.floor(plan[end].startSeconds*sampleRate):frames;
    yield {startFrame,frames:endFrame-startFrame,events:plan.slice(first,end)};
    startFrame=endFrame;first=end;
  }
}
export async function renderWav(plan,{volume=.7,sampleRate=22050,signal,onProgress=()=>{},createContext}={}){
  if(!Number.isFinite(volume)||volume<0||volume>1)throw Error('Invalid instrument volume.');
  const summary=wavSummary(plan,sampleRate),parts=[wavHeader(summary.frames,sampleRate)];
  createContext??=(length,rate)=>new (window.OfflineAudioContext||window.webkitOfflineAudioContext)(1,length,rate);
  let peak=0;
  for(const batch of audioBatches(plan,sampleRate)){
    signal?.throwIfAborted();
    const context=createContext(batch.frames,sampleRate),master=context.createGain();master.gain.value=volume;master.connect(context.destination);
    for(const e of batch.events)scheduleInstrument(context,master,e,e.startSeconds-batch.startFrame/sampleRate);
    const buffer=await context.startRendering();signal?.throwIfAborted();
    const samples=buffer.getChannelData(0);for(const v of samples)peak=Math.max(peak,Math.abs(v));
    parts.push(pcm16(samples));onProgress((batch.startFrame+batch.frames)/summary.frames);
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  signal?.throwIfAborted();
  return {...summary,peak,blob:new Blob(parts,{type:'audio/wav'})};
}
