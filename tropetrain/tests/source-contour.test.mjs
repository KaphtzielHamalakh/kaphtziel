import test from 'node:test';import assert from 'node:assert/strict';import {renderSourceContour,contourGeometry} from '../source-contour.js';
const fixture=({frames=16000,series=Array.from({length:100},(_,i)=>[i,2200,9900])}={})=>({id:'synthetic-original-test',parameters:{sampleRate:16000,hop:160,frequencyUnitHz:.1,periodicityUnit:.0001},decodedPcm:{sampleRate:16000,channels:1,bitsPerSample:16,frames,durationSeconds:frames/16000},counts:{frames:Math.ceil(frames/160),periodicFrames:series.length,unassignedFrames:Math.ceil(frames/160)-series.length},series});
const pcm=buffer=>new Int16Array(buffer.slice(44));
function frequency(samples,start=1600,end=14400){let crossings=0;for(let i=start+1;i<end;i++)if(samples[i-1]<=0&&samples[i]>0)crossings++;return crossings*16000/(end-start);}
test('measured tones retain exact PCM geometry, RIFF fields and input measurements without inventing notes or phonemes',()=>{
 const data=fixture(),before=JSON.stringify(data),r=renderSourceContour(data),v=new DataView(r.buffer);assert.equal(r.buffer.byteLength,32044);assert.equal(v.getUint32(24,true),16000);assert.equal(v.getUint32(40,true),32000);assert.equal(r.metadata.frames,16000);assert.equal(r.metadata.durationSeconds,1);assert.equal(r.metadata.assignedSamples,16000);assert.equal(r.metadata.mutedSamples,0);assert.equal(r.metadata.phonemes,null);assert.equal(r.metadata.musicalNotes,null);assert.equal(r.metadata.traditionalGrammar,null);assert.equal(JSON.stringify(data),before);
});
test('independent pitch multiplication changes sinusoidal frequency and preserves every frame and duration',()=>{
 const data=fixture();for(const semitones of [-12,-1,0,1,12]){const r=renderSourceContour(data,semitones);assert(Math.abs(frequency(pcm(r.buffer))-220*2**(semitones/12))<1.6);assert.equal(r.metadata.durationSeconds,1);assert.equal(r.metadata.frames,16000);assert.equal(r.metadata.semitones,semitones);}
});
test('unassigned measurement cells stay zero and discontinuous runs do not bridge gaps or extend a final partial cell',()=>{
 const data=fixture({frames:1000,series:[[1,2200,9900],[2,2210,9800],[5,3300,9700],[6,3310,9600]]}),r=renderSourceContour(data),s=pcm(r.buffer);assert.equal(r.metadata.runs,2);assert.equal(r.metadata.assignedSamples,520);assert.equal(r.metadata.mutedSamples,480);assert.equal(s.length,1000);
 assert([...s.slice(0,160),...s.slice(480,800)].every(x=>x===0));assert(s.slice(160,480).some(x=>x!==0));assert(s.slice(800).some(x=>x!==0));for(const i of [160,479,800,999])assert.equal(s[i],0);assert(s.every(x=>Math.abs(x)<=6554));
});
test('a take with no assigned frequencies stays a timed zero waveform rather than receiving a guessed pitch',()=>{
 const r=renderSourceContour(fixture({frames:320,series:[]}));assert(pcm(r.buffer).every(x=>x===0));assert.equal(r.metadata.assignedSamples,0);assert.equal(r.metadata.mutedSamples,320);assert.equal(r.metadata.durationSeconds,.02);
});
test('malformed measurements, inconsistent duration, excessive allocation and unsupported pitch are refused',()=>{
 for(const change of [x=>x.series[0][0]=-1,x=>x.series[1][0]=0,x=>x.series[0][1]=640,x=>x.series[0][2]=8999,x=>x.decodedPcm.frames=1e10,x=>x.decodedPcm.durationSeconds+=.01,x=>x.parameters.hop=80]){const d=fixture();change(d);assert.throws(()=>contourGeometry(d));}
 for(const pitch of [13,-13,.5,NaN,'0'])assert.throws(()=>renderSourceContour(fixture(),pitch));
});
