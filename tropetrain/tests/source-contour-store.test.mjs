import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {SourcePitchStore,pitchManifest} from '../source-pitch.js';import {SourceContourStore,renderContourWorker} from '../source-contour-store.js';import {renderSourceContour} from '../source-contour.js';import {ReferenceLibrary} from '../reference-library.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url)),lib=new ReferenceLibrary(JSON.parse(gunzipSync(read('data/references/torah-library.json.gz'))));
const entry=[...pitchManifest.records].filter(r=>r.wordTiming==='aligned').sort((a,b)=>a.durationSeconds-b.durationSeconds)[0],record=lib.byId.get(entry.id);
function setup(extra={}){let ids=0;const revoked=[],ready=[],reads=[],pitchStore=new SourcePitchStore({read:async e=>{reads.push(e.id);return read('data/pitch/'+e.file);},hash:async bytes=>createHash('sha256').update(bytes).digest('hex'),decode:async bytes=>JSON.parse(gunzipSync(bytes))});const store=new SourceContourStore({pitchStore,render:async(d,s)=>renderSourceContour(d,s),makeUrl:()=>`blob:test-${++ids}`,revokeUrl:u=>revoked.push(u),onReady:x=>ready.push(x),...extra});return {store,pitchStore,revoked,ready,reads};}
test('a pinned measurement produces source-identified cached tones at zero pitch without reading original audio',async()=>{
 const f=setup(),a=await f.store.url(record),b=await f.store.url(record);assert.equal(a,b);assert.deepEqual(f.reads,[record.id]);assert.equal(f.ready.length,2);assert.equal(f.ready[0].measurementSha256,entry.sha256);assert.equal(f.ready[0].sourceAudio.sha1,record.audio.sha1);assert.equal(f.ready[0].durationSeconds,entry.durationSeconds);assert.equal(f.ready[0].semitones,0);assert.equal(f.ready[0].acousticReview,null);
});
test('source review gaps, wrong audio hashes and unsupported pitches refuse synthesis without fallback',async()=>{
 const f=setup();for(const bad of [{...record,status:'review'},{...record,id:'absent'},{...record,audio:{...record.audio,sha1:'changed'}}])await assert.rejects(f.store.url(bad),/review/);await assert.rejects(f.store.url(record,{semitones:13}),/pitch/);assert.equal(f.reads.length,0);assert.equal(f.ready.length,0);
});
test('cache eviction and clear revoke generated URLs while leaving measurement/source data intact',async()=>{
 const f=setup({maxEntries:1}),a=await f.store.url(record),b=await f.store.url(record,{semitones:1});assert.notEqual(a,b);assert.deepEqual(f.revoked,[a]);assert.equal(f.reads.length,1);f.store.clear();assert.deepEqual(f.revoked,[a,b]);assert.equal(f.store.cache.size,0);
});
test('aborted preparation cannot publish a late tone URL or ready callback',async()=>{
 let finish,started;const waiting=new Promise(r=>started=r),f=setup({render:(d,s)=>new Promise(resolve=>{finish=()=>resolve(renderSourceContour(d,s));started();})}),control=new AbortController(),job=f.store.url(record,{signal:control.signal});await waiting;control.abort();finish();await assert.rejects(job,{name:'AbortError'});assert.equal(f.ready.length,0);assert.equal(f.store.cache.size,0);
});
test('incorrect rendered source duration or pitch is rejected before URL creation',async()=>{
 for(const field of ['frames','durationSeconds','semitones','assignedMeasurementFrames']){const f=setup({render:async(d,s)=>{const r=renderSourceContour(d,s);r.metadata[field]++;return r;}});await assert.rejects(f.store.url(record),/timeline or parameters/);assert.equal(f.ready.length,0);assert.equal(f.store.cache.size,0);}
});
test('word summaries preserve marked Hebrew and repeated occurrence identities without phoneme times',async()=>{
 const f=setup();await f.store.url(record);const w=record.words[0],reader={id:w.id+'@repeat',sourceWordId:w.id,sourceHebrew:w.uxlcHebrew},a=f.store.wordSummary({recording:record,word:w},reader),b=f.store.wordSummary({recording:record,word:w},{...reader,id:w.id+'@another'});assert.equal(a.hebrew,w.uxlcHebrew);assert.equal(a.startSeconds,w.startSeconds);assert.notEqual(a.occurrenceId,b.occurrenceId);assert.equal(a.wordId,b.wordId);assert.throws(()=>f.store.wordSummary({recording:record,word:w},{...reader,sourceHebrew:'changed'}),/Hebrew changed/);
});
test('worker cancellation terminates generation and rejects invalid returned audio',async()=>{
 const data=JSON.parse(gunzipSync(read('data/pitch/'+entry.file)));let worker;
 const makeWorker=()=>worker={postMessage(){},terminate(){this.stopped=true;}},control=new AbortController(),job=renderContourWorker(data,0,{makeWorker,signal:control.signal});control.abort();await assert.rejects(job,{name:'AbortError'});assert.equal(worker.stopped,true);
 const invalid=renderContourWorker(data,0,{makeWorker});worker.onmessage({data:{type:'result',buffer:new ArrayBuffer(44)}});await assert.rejects(invalid,/invalid audio/);assert.equal(worker.stopped,true);
});
