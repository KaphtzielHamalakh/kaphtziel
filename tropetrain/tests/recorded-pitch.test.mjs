import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transposeRecordedChannels,recordedPitchWav,recordedSemitones,RECORDED_PITCH_ENGINE} from '../recorded-pitch.js';

function fixture(rate=44100){return Float32Array.from({length:rate*4},(_,i)=>{const t=i/rate;return t>=.5&&t<1.5||t>=2&&t<2.5||t>=3.8&&t<3.95?.3*Math.sin(2*Math.PI*220*t):0;});}
function energyRuns(x,rate){const step=Math.round(rate*.005),runs=[];for(let i=0;i<x.length;i+=step){let sum=0;for(let j=i;j<Math.min(i+step,x.length);j++)sum+=x[j]**2;const on=Math.sqrt(sum/step)>.03;if(on&&!runs.at(-1)?.open)runs.push({start:i/rate,open:true});else if(!on&&runs.at(-1)?.open){runs.at(-1).end=i/rate;runs.at(-1).open=false;}}const grouped=[];for(const run of runs){const previous=grouped.at(-1);if(previous&&run.start-previous.end<=.01)previous.end=run.end;else grouped.push({...run});}return grouped;}
function estimatedHz(x,rate,expected){const start=Math.round(rate*.75),n=Math.round(rate*.5),power=f=>{let re=0,im=0;for(let i=0;i<n;i++){const v=x[start+i]*(.5-.5*Math.cos(2*Math.PI*i/(n-1))),p=2*Math.PI*f*i/rate;re+=v*Math.cos(p);im+=v*Math.sin(p);}return Math.hypot(re,im);};const points=Array.from({length:17},(_,i)=>({f:expected-4+i*.5,p:power(expected-4+i*.5)})),best=points.reduce((a,b)=>a.p>b.p?a:b);const a=power(best.f-.1),b=best.p,c=power(best.f+.1);return best.f+.05*(a-c)/(a-2*b+c);}

test('the WASM loader is the exact pinned official source surrounded only by the MIT notice and ESM export',()=>{
 const text=readFileSync(new URL('../vendor/signalsmith-stretch/core.mjs',import.meta.url),'utf8'),begin=text.indexOf('// BEGIN pinned loader\n')+'// BEGIN pinned loader\n'.length,end=text.lastIndexOf('\nexport default SignalsmithStretch;'),raw=Buffer.from(text.slice(begin,end));
 assert.equal(raw.length,98451);assert.equal(createHash('sha1').update(`blob ${raw.length}\0`).update(raw).digest('hex'),RECORDED_PITCH_ENGINE.wasmLoaderGitBlob);assert.match(text,/Copyright \(c\) 2022 Geraint Luff/);assert.match(text,/Permission is hereby granted/);
 const evidence=JSON.parse(readFileSync(new URL('../docs/RECORDED-PITCH-PROCESSING.json',import.meta.url)));assert.equal(evidence.engine.sourceRevision,RECORDED_PITCH_ENGINE.revision);assert.equal(evidence.engine.vendoredFileSha256,createHash('sha256').update(text).digest('hex'));assert.equal(evidence.qualifiedReview.HebrewPronunciation,null);
});
test('zero transposition bypasses the engine and leaves every original sample bit-exact',async()=>{
 const input=fixture(8000),before=new Uint8Array(input.buffer).slice();const result=await transposeRecordedChannels([input],8000,0,{createEngine:()=>{throw Error('must not start');}});
 assert.equal(result.channels[0],input);assert.deepEqual(new Uint8Array(input.buffer),before);assert.equal(result.metadata.processed,false);assert.equal(result.metadata.trimmedLatencyFrames,0);
});
test('bounded musical pitch shifts retain exact duration and source burst positions, with documented approximate tuning',async()=>{
 const input=fixture(),snapshot=input.slice(),before=energyRuns(input,44100);
 for(const semitones of [-12,-6,-3,3,6,12]){
  const result=await transposeRecordedChannels([input],44100,semitones),output=result.channels[0],runs=energyRuns(output,44100),target=220*2**(semitones/12),observed=estimatedHz(output,44100,target);
  assert.equal(output.length,input.length);assert.equal(result.metadata.frames,input.length);assert.equal(result.metadata.trimmedLatencyFrames,result.metadata.inputLatencyFrames+result.metadata.outputLatencyFrames);assert.equal(result.metadata.formantCompensation,true);assert.equal(result.metadata.review,null);assert.equal(runs.length,before.length);
  before.forEach((run,i)=>{assert.ok(Math.abs(run.start-runs[i].start)<=.02);assert.ok(Math.abs(run.end-runs[i].end)<=.02);});
  assert.ok(Math.abs(1200*Math.log2(observed/target))<20,`${semitones}: ${observed}Hz, target ${target}Hz`);
 }
 assert.deepEqual(input,snapshot);
});
test('latency trimming and tail drain keep the final source burst at several decoder sample rates',async()=>{
 for(const rate of [8000,16000,48000]){const input=fixture(rate),result=await transposeRecordedChannels([input],rate,-3),runs=energyRuns(result.channels[0],rate);assert.equal(result.channels[0].length,rate*4);assert.ok(runs.at(-1).start>=3.77&&runs.at(-1).start<=3.83);assert.ok(runs.at(-1).end>=3.92&&runs.at(-1).end<=3.98);}
});
test('stereo source channels retain distinct content and equal lengths without changing the inputs',async()=>{
 const left=fixture(16000),right=Float32Array.from(left,(_,i)=>.2*Math.sin(2*Math.PI*330*i/16000)),snapshot=right.slice(),r=await transposeRecordedChannels([left,right],16000,3);assert.equal(r.channels.length,2);assert.equal(r.channels[0].length,left.length);assert.equal(r.channels[1].length,right.length);assert.notDeepEqual(r.channels[0],r.channels[1]);assert.deepEqual(right,snapshot);
 const observed=estimatedHz(r.channels[1],16000,330*2**.25);assert.ok(Math.abs(observed/(330*2**.25)-1)<.02);
});
test('invalid pitch, unsupported channel shapes and nonfinite samples refuse processing',async()=>{
 for(const v of [-13,13,.5,NaN,Infinity,'3',null])assert.throws(()=>recordedSemitones(v),/whole-number/);
 for(const channels of [[],[new Float32Array(0)],[new Float32Array(2),new Float32Array(1)],[new Float32Array(2),new Float32Array(2),new Float32Array(2)]])await assert.rejects(transposeRecordedChannels(channels,16000,3),/channels/);
 await assert.rejects(transposeRecordedChannels([new Float32Array(20)],1000,3),/sample rate/);await assert.rejects(transposeRecordedChannels([new Float32Array([1,NaN])],16000,3),/nonfinite/);
});
test('processing checkpoints can abort before ready output and do not mutate source samples',async()=>{
 const input=fixture(8000),snapshot=input.slice();let progress=0;await assert.rejects(transposeRecordedChannels([input],8000,3,{onProgress:()=>progress++,check:()=>{if(progress)throw new DOMException('Stopped','AbortError');}}),{name:'AbortError'});assert.equal(progress,1);assert.deepEqual(input,snapshot);
});
test('processed PCM encoding preserves frame count/channel order and attenuates peaks instead of clipping',()=>{
 const left=Float32Array.of(2,0,-2),right=Float32Array.of(-2,1,2),before=left.slice(),wav=recordedPitchWav([left,right],16000),v=new DataView(wav.buffer);
 assert.equal(wav.peakGain,.49);assert.equal(wav.buffer.byteLength,56);assert.equal(v.getUint32(4,true),48);assert.equal(v.getUint16(22,true),2);assert.equal(v.getUint32(24,true),16000);assert.equal(v.getUint32(40,true),12);assert.ok(v.getInt16(44,true)>32000);assert.ok(v.getInt16(46,true)<-32000);assert.equal(v.getInt16(48,true),0);assert.deepEqual(left,before);
 assert.throws(()=>recordedPitchWav([Float32Array.of(Infinity)],16000),/nonfinite/);
});
test('silence stays silent with exact length and no nonfinite output',async()=>{const r=await transposeRecordedChannels([new Float32Array(800)],8000,-12);assert.equal(r.channels[0].length,800);assert.ok(r.channels[0].every(x=>x===0));assert.equal(r.metadata.peak,0);});
