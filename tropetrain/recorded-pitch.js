import createModule from './vendor/signalsmith-stretch/core.mjs';

export const RECORDED_PITCH_ENGINE={name:'Signalsmith Stretch',release:'1.3.2',revision:'222093b4cc13ddb4d07c826bc3c1559326091731',wasmLoaderGitBlob:'a12633353a0b2422c2a00835e6239ea6dfe4abaa',license:'MIT'};
export function recordedSemitones(value){
  if(!Number.isInteger(value)||value< -12||value>12)throw Error('Choose a whole-number chant pitch from −12 to +12 semitones.');
  return value;
}
function validate(channels,sampleRate){
  if(!Array.isArray(channels)||channels.length<1||channels.length>2||!channels.every(x=>x instanceof Float32Array&&x.length===channels[0].length)||!channels[0].length)throw Error('Pitch processing needs one or two equal nonempty audio channels.');
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>96000||channels[0].length>sampleRate*3600)throw Error('This source exceeds the supported pitch-processing duration or sample rate.');
}
// Original source seconds stay unchanged. Both halves of reported latency are
// supplied as zero input, then removed from the output; no word times are moved.
export async function transposeRecordedChannels(channels,sampleRate,semitones,{onProgress=()=>{},check=()=>{},createEngine=createModule}={}){
  validate(channels,sampleRate);recordedSemitones(semitones);check();
  if(semitones===0)return {channels,metadata:{processed:false,frames:channels[0].length,sampleRate,semitones:0,inputLatencyFrames:0,outputLatencyFrames:0,trimmedLatencyFrames:0,formantCompensation:false}};
  const m=await createEngine();check();m._presetDefault(channels.length,sampleRate);m._setTransposeSemitones(semitones,0);m._setFormantSemitones(0,true);m._setFormantBase(0);
  const inputLatency=m._inputLatency(),outputLatency=m._outputLatency(),latency=inputLatency+outputLatency;
  if(!Number.isInteger(latency)||latency<0||latency>sampleRate)throw Error('Pitch engine reported invalid latency.');
  const length=channels[0].length,chunk=2048,pointer=m._setBuffers(channels.length,chunk),output=channels.map(()=>new Float32Array(length));let peak=0;
  for(let offset=0;offset<length+latency;offset+=chunk){
    check();
    for(let c=0;c<channels.length;c++){
      const input=new Float32Array(m.HEAP8.buffer,pointer+4*chunk*c,chunk);input.fill(0);const values=channels[c].subarray(offset,Math.min(length,offset+chunk));
      for(const value of values)if(!Number.isFinite(value))throw Error('The decoded recording contains nonfinite samples.');
      input.set(values);
    }
    m._process(chunk,chunk);
    const from=Math.max(0,latency-offset),to=Math.min(chunk,length+latency-offset);
    for(let c=0;c<channels.length;c++){
      const samples=new Float32Array(m.HEAP8.buffer,pointer+4*chunk*(c+channels.length),chunk);
      for(let i=from;i<to;i++){const value=samples[i];if(!Number.isFinite(value))throw Error('Pitch processing produced nonfinite samples.');output[c][offset+i-latency]=value;peak=Math.max(peak,Math.abs(value));}
    }
    if(offset%(chunk*16)===0)onProgress(Math.min(1,(offset+chunk)/(length+latency)));
  }
  check();onProgress(1);
  return {channels:output,metadata:{processed:true,frames:length,sampleRate,semitones,inputLatencyFrames:inputLatency,outputLatencyFrames:outputLatency,trimmedLatencyFrames:latency,formantCompensation:true,formantBase:'engine_estimate',peak,engine:RECORDED_PITCH_ENGINE,review:null}};
}
// A session-only derivative. Never replaces a licensed original in device cache.
export function recordedPitchWav(channels,sampleRate){
  validate(channels,sampleRate);let peak=0;for(const channel of channels)for(const value of channel){if(!Number.isFinite(value))throw Error('Cannot encode nonfinite recording samples.');peak=Math.max(peak,Math.abs(value));}
  const peakGain=peak>.98?.98/peak:1,count=channels.length,frames=channels[0].length,bytes=frames*count*2;
  if(bytes>256*1048576)throw Error('The processed recording is too large for this session. Choose original pitch.');
  const buffer=new ArrayBuffer(44+bytes),view=new DataView(buffer),text=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,36+bytes,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,count,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*count*2,true);view.setUint16(32,count*2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,bytes,true);
  let offset=44;for(let i=0;i<frames;i++)for(let c=0;c<count;c++){const value=channels[c][i]*peakGain;view.setInt16(offset,Math.round(value*(value<0?32768:32767)),true);offset+=2;}
  return {buffer,peakGain,frames,sampleRate,channels:count};
}
