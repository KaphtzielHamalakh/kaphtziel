import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pitchManifest,validatePitchRecord,pitchWordWindow,pitchFrame,SourcePitchStore} from '../source-pitch.js';
import {ReferenceLibrary} from '../reference-library.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const refs=new ReferenceLibrary(JSON.parse(gunzipSync(read('data/references/torah-library.json.gz'))));
const entry=pitchManifest.records[0],raw=read('data/pitch/'+entry.file),data=JSON.parse(gunzipSync(raw)),source=refs.byWord.get('gen-1-1-1');
const word={id:'occurrence-2/gen-1-1-1',sourceWordId:'gen-1-1-1',sourceHebrew:source.word.uxlcHebrew};
test('all378 measured packets keep original audio pins, ordered bounded raw measurements and null musical alignment',()=>{
 assert.equal(pitchManifest.records.length,378);assert.equal(hash(read('data/references/torah-library.json.gz')),pitchManifest.referencePacketSha256);let bytes=0,frames=0,periodic=0;
 for(const e of pitchManifest.records){const r=read('data/pitch/'+e.file),d=JSON.parse(gunzipSync(r));assert.equal(r.length,e.bytes);assert.equal(hash(r),e.sha256);assert.equal(validatePitchRecord(d,e),d);assert.equal(e.sourceAudio.sha1,refs.byId.get(e.id).audio.sha1);assert.equal(e.sourceAudio.bytes,refs.byId.get(e.id).audio.bytes);bytes+=r.length;frames+=d.counts.frames;periodic+=d.series.length;}
 assert.equal(bytes,pitchManifest.totals.bytes);assert.equal(frames,pitchManifest.totals.frames);assert.equal(periodic,pitchManifest.totals.periodicFrames);assert.ok(periodic<frames/2);
 const audit=JSON.parse(read('docs/SOURCE-PITCH-SAMPLE-AUDIT.json'));assert.equal(audit.manifestSha256,hash(read('data/pitch/manifest.json')));assert.equal(audit.recordings,378);assert.equal(audit.records.length,378);assert.equal(audit.sampleFrames,3023);assert.equal(audit.assignedFrames+audit.unassignedFrames,audit.sampleFrames);assert.match(audit.limits,/not pitch accuracy/);
});
test('word window intersects exact source times, preserves occurrence and Hebrew, and invents no syllable or musical ownership',()=>{
 const original=JSON.stringify({data,word,source});const w=pitchWordWindow(data,source,word);assert.equal(w.hebrew,word.sourceHebrew);assert.equal(w.wordId,'gen-1-1-1');assert.equal(w.occurrenceId,word.id);assert.equal(w.startSeconds,2.028362);assert.equal(w.endSeconds,3.3519);assert.ok(w.series.length>0);assert.ok(w.series.every(row=>pitchFrame(row).seconds>=w.startSeconds&&pitchFrame(row).seconds<w.endSeconds));assert.equal(w.syllableTimes,null);assert.equal(w.phonemes,null);assert.equal(w.musicalNotes,null);assert.equal(JSON.stringify({data,word,source}),original);
 const second={...word,id:'occurrence-3/gen-1-1-1'};assert.deepEqual(pitchWordWindow(data,source,second).series,w.series);
});
test('timing-review, changed marked Hebrew and mismatched audio/word sources are refused',()=>{
 assert.throws(()=>pitchWordWindow(data,source,{...word,sourceHebrew:word.sourceHebrew+'֑'}),/changed/);
 assert.throws(()=>pitchWordWindow(data,{...source,recording:{...source.recording,status:'timing-review'}},word),/timings need review/);
 assert.throws(()=>pitchWordWindow(data,{...source,recording:{...source.recording,audio:{...source.recording.audio,sha1:'bad'}}},word),/sources differ/);
 assert.throws(()=>pitchWordWindow(data,source,{...word,sourceWordId:'gen-1-1-2'}),/correspondence/);
});
test('terminal null word offset is explicitly the decoded recording boundary, never a syllable time',()=>{
 const last=source.recording.words.at(-1),reader={id:last.id,sourceHebrew:last.uxlcHebrew},window=pitchWordWindow(data,{recording:source.recording,word:last},reader);assert.equal(last.endSeconds,null);assert.equal(window.endSeconds,data.decodedPcm.durationSeconds);assert.match(window.endKind,/recording end.*not a reviewed word offset/);assert.equal(window.syllableTimes,null);
});
test('measurement corruption, unsupported units, reordered frames and inferred phonemes are rejected',()=>{
 for(const change of [d=>d.parameters.hop=80,d=>d.sourceAudio.sha1='bad',d=>d.series[0][1]=100,d=>d.series[1][0]=d.series[0][0],d=>d.alignment.phonemes=[],d=>d.series[0][2]=8999,d=>d.counts.unassignedFrames--]){const d=structuredClone(data);change(d);assert.throws(()=>validatePitchRecord(d,entry));}
 const p=pitchFrame([250,1471,9234]);assert.equal(p.seconds,2.5);assert.ok(Math.abs(p.hz-147.1)<1e-9);assert.ok(Math.abs(p.periodicity-.9234)<1e-9);
});
test('lazy store coalesces requests, verifies bytes before decoding and retries failed loads',async()=>{
 let reads=0,decodes=0;const store=new SourcePitchStore({read:async()=>{reads++;return raw;},hash:async bytes=>hash(bytes),decode:async()=>{decodes++;return data;}});
 const [a,b]=await Promise.all([store.get(entry.id),store.get(entry.id)]);assert.equal(a,b);assert.equal(reads,1);assert.equal(decodes,1);await store.get(entry.id);assert.equal(reads,1);
 let attempts=0;const failed=new SourcePitchStore({read:async()=>{attempts++;return raw;},hash:async()=>attempts===1?'bad':entry.sha256,decode:async()=>data});await assert.rejects(failed.get(entry.id),/checksum failed/);assert.equal(await failed.get(entry.id),data);assert.equal(attempts,2);
});
test('portable distribution embeds every exact packet and evidence while normal view fetches on demand',()=>{
 const html=read('TropeTrain.html').toString(),embedded=JSON.parse(html.match(/<script id="source-pitch-packets" type="application\/json">([\s\S]*?)<\/script>/)[1]);assert.equal(Object.keys(embedded).length,378);
 for(const e of pitchManifest.records)assert.equal(hash(Buffer.from(embedded[e.id],'base64')),e.sha256);
 for(const name of ['SOURCE-PITCH-EVIDENCE','SOURCE-PITCH-SAMPLE-AUDIT'])assert.ok(html.includes(read('docs/'+name+'.json').toString('base64')));assert.ok(!read('index.html').toString().includes('id="source-pitch-packets"'));assert.match(read('sw.js').toString(),/data\/pitch\/pt-portion-01-1.json.gz/);
});
test('original scalar estimator checks sines, harmonics, DC, silence, noise, threshold refusal and frequency limits',()=>{
 const result=execFileSync('python3',[new URL('./pitch-measurement-test.py',import.meta.url).pathname],{encoding:'utf8',stdio:['ignore','pipe','pipe']});assert.equal(result,'');
});
