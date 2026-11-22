import {transposeRecordedChannels,recordedPitchWav} from './recorded-pitch.js';
self.onmessage=async event=>{
  try{
    const {channels,sampleRate,semitones}=event.data;
    const result=await transposeRecordedChannels(channels,sampleRate,semitones,{onProgress:value=>self.postMessage({type:'progress',value})});
    const wav=recordedPitchWav(result.channels,sampleRate);
    self.postMessage({type:'result',buffer:wav.buffer,metadata:{...result.metadata,peakGain:wav.peakGain,channels:wav.channels}},[wav.buffer]);
  }catch(error){self.postMessage({type:'error',message:error?.message??'Pitch processing failed.'});}
};
