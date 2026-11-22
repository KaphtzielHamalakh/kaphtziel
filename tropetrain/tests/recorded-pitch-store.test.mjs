import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {RecordedPitchStore,renderRecordedPitch} from '../recorded-pitch-store.js';
import {recordedPitchWav} from '../recorded-pitch.js';
const original=Uint8Array.of(1,2,3,4),sha1=createHash('sha1').update(original).digest('hex');
const record=Object.freeze({id:'source-one',audio:Object.freeze({sha1,bytes:4}),words:Object.freeze([{id:'gen-1-1-1',sourceHebrew:'בְּרֵאשִׁ֖ית',startSeconds:0,endSeconds:null}])});
const decoded=(duration=.1)=>{const sampleRate=16000,length=Math.round(duration*sampleRate),channel=Float32Array.from({length},(_,i)=>.1*Math.sin(i*.1));return {sampleRate,length,duration:length/sampleRate,numberOfChannels:1,getChannelData:()=>channel};};
function fixture(overrides={}){
 const events=[],revoked=[],ready=[],buffers=[],sourceStore={url:async r=>{events.push('original-url');return 'original:'+r.audio.sha1;},verify:async(r,blob)=>{events.push('verify');const raw=Buffer.from(await blob.arrayBuffer());assert.equal(raw.length,r.audio.bytes);assert.equal(createHash('sha1').update(raw).digest('hex'),r.audio.sha1);}};
 let urls=0;
 const render=async(channels,sampleRate,semitones)=>{events.push('render');buffers.push(channels.map(c=>c.slice()));const wav=recordedPitchWav(channels,sampleRate);return {buffer:wav.buffer,metadata:{frames:channels[0].length,sampleRate,semitones,formantCompensation:true,review:null}};};
 const store=new RecordedPitchStore({sourceStore,fetchFile:async()=>{events.push('fetch');return new Response(original);},decode:async()=>{events.push('decode');return decoded();},probe:async()=>{events.push('probe');return .1;},render,makeUrl:()=>{events.push('url');return 'processed:'+(++urls);},revokeUrl:url=>revoked.push(url),onReady:m=>ready.push(m),...overrides});
 return {store,events,revoked,ready,buffers,sourceStore};
}

test('original pitch uses the original URL without decoding, processing, re-encoding or changing source data',async()=>{
 const f=fixture(),before=JSON.stringify(record);assert.equal(await f.store.url(record,{semitones:0}),'original:'+sha1);assert.deepEqual(f.events,['original-url']);assert.equal(f.store.cache.size,0);assert.equal(JSON.stringify(record),before);
});
test('processed audio is verified before decoding and retains exact original source seconds and null reviews',async()=>{
 const f=fixture(),before=JSON.stringify(record);assert.equal(await f.store.url(record,{semitones:3}),'processed:1');assert.ok(f.events.indexOf('verify')<f.events.indexOf('decode'));assert.ok(f.events.indexOf('decode')<f.events.indexOf('render'));
 const info=f.ready[0];assert.equal(info.sourceSha1,sha1);assert.equal(info.recordingId,record.id);assert.equal(info.frames,1600);assert.equal(info.durationSeconds,.1);assert.equal(info.tailAdjustmentFrames,0);assert.equal(info.acousticReview,null);assert.equal(info.pronunciationEquivalenceReview,null);assert.equal(info.pronunciationTransformation,'none_requested');assert.equal(JSON.stringify(record),before);
});
test('cache keys separate pitch/source identity and ignore pronunciation text style; eviction revokes only session derivatives',async()=>{
 const f=fixture();const one=await f.store.url(record,{semitones:3,style:'sephardic'});assert.equal(await f.store.url(record,{semitones:3,style:'ashkenazic'}),one);assert.equal(f.events.filter(x=>x==='render').length,1);
 await f.store.url(record,{semitones:-3});await f.store.url({...record,id:'other-source-context'},{semitones:3});assert.deepEqual(f.revoked,['processed:1']);assert.equal(f.store.cache.size,2);assert.equal(f.ready.at(-1).recordingId,'other-source-context');
});
test('a source checksum failure refuses processing and never caches a derivative',async()=>{
 const f=fixture({fetchFile:async()=>new Response(Uint8Array.of(1,2,3,5))});await assert.rejects(f.store.url(record,{semitones:3}));assert.equal(f.events.includes('decode'),false);assert.equal(f.events.includes('render'),false);assert.equal(f.store.cache.size,0);assert.equal(f.ready.length,0);
});
test('a native/decoded duration discrepancy refuses to guess a word timeline',async()=>{
 const f=fixture({probe:async()=>.13});await assert.rejects(f.store.url(record,{semitones:3}),/original timeline/);assert.equal(f.events.includes('render'),false);assert.equal(f.store.cache.size,0);
});
test('a small recorded tail adjustment keeps source onsets and sample prefixes untouched',async()=>{
 const source=decoded(),snapshot=source.getChannelData(0).slice(),f=fixture({decode:async()=>source,probe:async()=>.101});await f.store.url(record,{semitones:-3});assert.equal(f.ready[0].tailAdjustmentFrames,16);assert.equal(f.ready[0].frames,1616);assert.deepEqual(f.buffers[0][0].subarray(0,1600),snapshot);assert.ok(f.buffers[0][0].subarray(1600).every(x=>x===0));assert.deepEqual(source.getChannelData(0),snapshot);assert.equal(record.words[0].startSeconds,0);
});
test('Stop during decoding invalidates a late result before a worker or URL can be created',async()=>{
 let resolve,started;const beginning=new Promise(r=>started=r),f=fixture({decode:()=>{started();return new Promise(r=>resolve=r);}}),controller=new AbortController(),pending=f.store.url(record,{semitones:3,signal:controller.signal});await beginning;controller.abort();resolve(decoded());await assert.rejects(pending,{name:'AbortError'});assert.equal(f.events.includes('render'),false);assert.equal(f.events.includes('url'),false);assert.equal(f.ready.length,0);
});
test('a stopped worker terminates and ignores queued progress/results instead of making stale audio ready',async()=>{
 const controller=new AbortController(),events=[];let worker;
 const pending=renderRecordedPitch([new Float32Array(8)],16000,3,{signal:controller.signal,onProgress:v=>events.push(v),makeWorker:()=>worker={terminated:0,terminate(){this.terminated++;},postMessage(value,transfer){this.request=value;this.transfer=transfer;}}});
 const message=worker.onmessage;message({data:{type:'progress',value:.2}});controller.abort();message({data:{type:'result',buffer:new ArrayBuffer(44),metadata:{}}});await assert.rejects(pending,{name:'AbortError'});assert.equal(worker.terminated,1);assert.deepEqual(events,[.2]);assert.equal(worker.onmessage,null);assert.equal(worker.transfer.length,1);
});
test('worker errors and malformed output fail without a source fallback or an unbounded worker',async()=>{
 let worker;const options={makeWorker:()=>worker={terminate(){this.terminated=true;},postMessage(){}}};let pending=renderRecordedPitch([new Float32Array(8)],16000,3,options);worker.onmessage({data:{type:'result',buffer:new ArrayBuffer(4)}});await assert.rejects(pending,/invalid audio/);assert.equal(worker.terminated,true);
 pending=renderRecordedPitch([new Float32Array(8)],16000,3,options);worker.onerror();await assert.rejects(pending,/could not start/);assert.equal(worker.terminated,true);
});
test('returned frame/pitch metadata cannot silently change the selected source timeline',async()=>{
 const f=fixture({render:async()=>({buffer:new ArrayBuffer(44),metadata:{frames:1599,sampleRate:16000,semitones:3,formantCompensation:true}})});await assert.rejects(f.store.url(record,{semitones:3}),/changed the recording timeline/);assert.equal(f.store.cache.size,0);assert.equal(f.ready.length,0);
});
test('clearing processed cache releases its URLs and preserves original access and source marks',async()=>{
 const f=fixture(),snapshot=JSON.stringify(record);await f.store.url(record,{semitones:3});await f.store.url(record,{semitones:-3});f.store.clear();assert.deepEqual(f.revoked,['processed:1','processed:2']);assert.equal(f.store.cache.size,0);assert.equal(await f.store.url(record,{semitones:0}),'original:'+sha1);assert.equal(JSON.stringify(record),snapshot);
});
