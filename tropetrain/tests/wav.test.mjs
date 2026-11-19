import {test} from 'node:test';
import assert from 'node:assert/strict';
import engine from 'web-audio-engine';
import {renderWav,wavSummary,pcm16,audioBatches} from '../wav.js';
import {buildPlan,frequency} from '../music.js';
import {scheduleInstrument} from '../synthesis.js';
const createContext=(length,rate)=>new engine.OfflineAudioContext(1,length,rate);
const tone=(midi=69,duration=1)=>[{midi,startSeconds:0,durationSeconds:duration}];
function fundamental(samples,rate){
  const first=Math.floor(samples.length*.15),last=Math.floor(samples.length*.85),crossings=[];
  for(let i=first+1;i<last;i++)if(samples[i-1]<=0&&samples[i]>0)crossings.push(i);
  return rate*(crossings.length-1)/(crossings.at(-1)-crossings[0]);
}
async function samplesOf(result){const raw=await result.blob.arrayBuffer(),v=new DataView(raw);return Float32Array.from({length:(raw.byteLength-44)/2},(_,i)=>v.getInt16(44+i*2,true)/32768);}
test('WAV has a valid PCM header, exact frame count and the requested audible pitch without device playback',async()=>{
  const r=await renderWav(tone(),{createContext,volume:.7}),raw=await r.blob.arrayBuffer(),v=new DataView(raw),s=await samplesOf(r);
  assert.equal(new TextDecoder().decode(raw.slice(0,4)),'RIFF');assert.equal(v.getUint32(4,true)+8,raw.byteLength);
  assert.equal(new TextDecoder().decode(raw.slice(8,12)),'WAVE');assert.equal(v.getUint16(20,true),1);assert.equal(v.getUint16(22,true),1);
  assert.equal(v.getUint32(24,true),22050);assert.equal(v.getUint16(34,true),16);assert.equal(v.getUint32(40,true),22050*2);
  assert.ok(r.peak>.09&&r.peak<.2);assert.ok(Math.abs(fundamental(s,22050)-440)<1);
  assert.equal(s[0],0);assert.ok(Math.abs(s.at(-1))<.001);
});
test('WAV transposition changes pitch while duration stays fixed; longer notes keep their pitch',async()=>{
  const a=await renderWav(tone(70),{createContext}),b=await renderWav(tone(70,2),{createContext});
  assert.equal(b.frames,a.frames*2);
  assert.ok(Math.abs(fundamental(await samplesOf(a),22050)-frequency(70))<1);
  assert.ok(Math.abs(fundamental(await samplesOf(b),22050)-frequency(70))<1);
});
test('zero instrument volume produces actual digital silence',async()=>{
  const r=await renderWav(buildPlan(0,6),{createContext,volume:0});assert.equal(r.peak,0);
  assert.ok((await samplesOf(r)).every(v=>v===0));
});
test('long WAV rendering batches at note boundaries and matches one-context rendering',async()=>{
  const plan=Array.from({length:70},(_,i)=>({midi:60+i%8,startSeconds:i*.41,durationSeconds:.41})),batches=[...audioBatches(plan)];
  assert.equal(batches.length,2);assert.equal(batches.flatMap(b=>b.events).length,70);
  assert.equal(batches[0].frames,batches[1].startFrame);
  const result=await renderWav(plan,{createContext,sampleRate:8000});
  const one=createContext(result.frames,8000),master=one.createGain();master.gain.value=.7;master.connect(one.destination);
  for(const e of plan)scheduleInstrument(one,master,e,e.startSeconds);
  const full=(await one.startRendering()).getChannelData(0),chunked=await samplesOf(result);
  let max=0;for(let i=0;i<full.length;i++)max=Math.max(max,Math.abs(full[i]-chunked[i]));
  assert.ok(max<.0001,`Maximum chunk difference ${max}`);
});
test('audio export cancellation and invalid spans fail explicitly',async()=>{
  const controller=new AbortController();controller.abort();await assert.rejects(renderWav(tone(),{createContext,signal:controller.signal}),/abort/i);
  assert.throws(()=>wavSummary([]),/no notes/);assert.throws(()=>wavSummary(tone(),0),/sample rate/);
  assert.throws(()=>wavSummary([{midi:60,startSeconds:0,durationSeconds:1000000000}]),/file-size limit/);
  await assert.rejects(renderWav(tone(),{createContext,volume:2}),/volume/);
  const v=new DataView(pcm16(Float32Array.of(-2,-1,0,1,2)));assert.deepEqual(Array.from({length:5},(_,i)=>v.getInt16(i*2,true)),[-32768,-32768,0,32767,32767]);
});
test('cancelling after a rendered batch releases the export before another context is allocated',async()=>{
  const signal=new AbortController();let contexts=0,updates=0;
  const plan=Array.from({length:70},(_,i)=>({midi:60,startSeconds:i*.41,durationSeconds:.41}));
  await assert.rejects(renderWav(plan,{sampleRate:8000,signal:signal.signal,createContext:(...args)=>{contexts++;return createContext(...args);},onProgress:()=>{updates++;signal.abort();}}),/abort/i);
  assert.equal(contexts,1);assert.equal(updates,1);
});
