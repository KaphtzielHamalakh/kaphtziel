import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {getCorpus} from '../library.js';
import {VOICE_STUDIES,voiceCoverage,voiceCoverageLabel,voiceRecording} from '../voice-studies.js';
import {createWordTimingDraft,validateWordTimingDraft,setWordBoundary,parseWordTimingDraft,draftWordSpan} from '../word-timing-draft.js';
import {ReferenceAudioStore} from '../reference-audio-store.js';

const record=voiceRecording('fellman-rh-2018','as-recorded','gen-22-1'),coverage=voiceCoverage(record);
const corpus=await getCorpus(),words=corpus.passage([{...coverage,id:'review'}]).verses.flatMap(v=>v.words);
const fixture=()=>createWordTimingDraft(record,coverage,words);
const bytes=name=>readFileSync(new URL('../'+name,import.meta.url));
test('64 source verse payloads retain exact original hashes, documentary scope, uncredited performer and null musical/phonological alignment',()=>{
  const manifest=JSON.parse(bytes('docs/FELLMAN-RH-2018.json')),records=VOICE_STUDIES.recordings.filter(r=>r.studyId==='fellman-rh-2018');
  assert.equal(manifest.recordings.length,64);assert.equal(records.length,64);assert.equal(manifest.sourceDocument.sha256,'18488d9dbbe4e2e2bb096338d46a4140a8c626bf60bf6e01b523c8845d3bec78');
  let size=0;const scopes=new Set();
  for(const r of records){
    const raw=bytes(r.audio.file),native=manifest.recordings.find(e=>e.file===r.sourceVerseAsset);
    assert.equal(raw.length,r.audio.bytes);size+=raw.length;
    for(const h of ['sha1','sha256'])assert.equal(createHash(h).update(raw).digest('hex'),r.audio[h]);
    assert.deepEqual(voiceCoverage(r),{bookId:native.chapter===29?'num':'gen',start:{chapter:native.chapter,verse:native.verse},end:{chapter:native.chapter,verse:native.verse}});
    assert.match(r.performer,/not separately credited/);assert.equal(r.sourceDocumentAuthor,'Len Fellman');assert.equal(r.year,2018);
    assert.equal(r.sourceReadingEnd,native.sourceEndingSuffix);assert.equal(r.license.id,'CC-BY-SA-4.0');assert.ok(r.audio.estimatedDurationSeconds>0);
    for(const k of ['timedWords','syllableAlignment','phonemes','musicalNotes','independentReview'])assert.equal(r[k],null);
    scopes.add(r.deliveryId);
  }
  assert.equal(size,20102828);assert.equal(scopes.size,64);assert.equal(records.filter(r=>r.sourceReadingEnd).length,11);
  for(const [book,c,n] of [['gen',21,34],['gen',22,24],['num',29,6]])for(let v=1;v<=n;v++)assert.ok(scopes.has(`${book}-${c}-${v}`));
});
test('a source-recording word draft preserves every exact Hebrew mark and canonical word ID without inferred times',()=>{
  const draft=fixture();assert.equal(draft.words.length,13);assert.equal(draft.status,'draft');
  assert.deepEqual(draft.words.map(w=>[w.id,w.hebrew]),words.map(w=>[w.sourceWordId,w.sourceHebrew]));
  assert.ok(draft.words.every(w=>w.start===null&&w.end===null));assert.equal(draft.sourceEditionCompared,false);
  assert.equal(draft.phonemes,null);assert.equal(draft.musicalNotes,null);assert.equal(draft.syllableAlignment,null);
  assert.equal(voiceCoverageLabel(record),'Genesis 22:1');assert.equal(voiceCoverageLabel(voiceRecording('foreman-genesis','forte-lene','spoken')),'Genesis 1:1–13');
});
test('only explicit personal word intervals can be auditioned; editing never fills another boundary',()=>{
  const original=fixture(),one=setWordBoundary(original,0,'start',.6),two=setWordBoundary(one,0,'end',1.2);
  assert.deepEqual(draftWordSpan(two,0),{start:.6,end:1.2});assert.throws(()=>draftWordSpan(two,1),/both boundaries/);
  assert.throws(()=>draftWordSpan(one,0),/both boundaries/);assert.equal(original.words[0].start,null);
  assert.equal(two.words[1].start,null);assert.equal(two.words[1].end,null);assert.equal(two.status,'draft');
  assert.deepEqual(parseWordTimingDraft(JSON.stringify(two),original),two);
});
test('word timing drafts refuse altered source identity, corpus marks and canonical word order',()=>{
  const expected=fixture();
  for(const [key,value] of [['sha1','0'.repeat(40)],['sha256','0'.repeat(64)],['bytes',1],['id','another-take'],['duration',100]]){
    const bad=structuredClone(expected);bad.source[key]=value;assert.throws(()=>validateWordTimingDraft(bad,expected),/different source/);
  }
  const bad=structuredClone(expected);bad.words[0].hebrew=bad.words[0].hebrew.replace(/[\u0591-\u05bd]/u,'');assert.throws(()=>validateWordTimingDraft(bad,expected),/marked Hebrew/);
  const swapped=structuredClone(expected);[swapped.words[0],swapped.words[1]]=[swapped.words[1],swapped.words[0]];assert.throws(()=>validateWordTimingDraft(swapped,expected),/identity/);
  const passage=structuredClone(expected);passage.coverage.start.verse=2;assert.throws(()=>validateWordTimingDraft(passage,expected),/passage differs/);
});
test('nonfinite, out of range, reversed and overlapping word boundaries are refused, including across missing words',()=>{
  const base=setWordBoundary(setWordBoundary(fixture(),0,'start',.5),0,'end',1.5);
  for(const value of [-1,NaN,Infinity,'2',record.audio.estimatedDurationSeconds+.1])assert.throws(()=>setWordBoundary(base,1,'start',value));
  assert.throws(()=>setWordBoundary(base,0,'end',.5));assert.throws(()=>setWordBoundary(base,1,'start',1.4),/overlaps/);
  const endOnly=setWordBoundary(base,2,'end',2);assert.throws(()=>setWordBoundary(endOnly,1,'start',2.5),/overlaps/);
  const cleared=setWordBoundary(base,0,'end',null);assert.equal(cleared.words[0].end,null);
  assert.deepEqual(draftWordSpan(setWordBoundary(base,1,'end',record.audio.estimatedDurationSeconds),0),{start:.5,end:1.5});
});
test('a draft cannot certify its own review, edition comparison, phonemes or musical notes, even when all words have times',()=>{
  const expected=fixture();
  for(const [key,value] of [['status','reviewed'],['sourceEditionCompared',true],['phonemes',[]],['musicalNotes',[]],['syllableAlignment',[]],['independentReview',{name:'self'}],['timingBasis','source-verified']]){
    const bad=structuredClone(expected);bad[key]=value;assert.throws(()=>validateWordTimingDraft(bad,expected),/unreviewed/);
  }
  const complete=structuredClone(expected);complete.words.forEach((w,i)=>{w.start=i;w.end=i+.5;});
  assert.equal(validateWordTimingDraft(complete,expected).status,'draft');assert.throws(()=>parseWordTimingDraft('x'.repeat(1000001),expected),/smaller/);
});
test('separate included source originals resolve by hash and do not cross-wire Seed and the verse clip',async()=>{
  const verse=record,seed=VOICE_STUDIES.recordings.find(r=>r.id==='seed-esther-2011');
  const store=new ReferenceAudioStore({openingUrl:'seed-data',includedUrls:{[verse.audio.sha1]:'verse-data'},cache:{keys:async()=>[]}});
  assert.equal(await store.has(verse),true);assert.equal(await store.url(verse),'verse-data');
  assert.equal(await store.url({...seed,audio:{...seed.audio,localFile:'seed'}}),'seed-data');
  assert.equal(await store.has(VOICE_STUDIES.recordings.find(r=>r.id==='fellman-rh-2018-gen-22-2')),false);
});
test('normal and portable builds include exactly the original Genesis 22:1 verse preview and an explicit draft UI',()=>{
  const normal=bytes('index.html').toString(),portable=bytes('TropeTrain.html').toString(),worker=bytes('sw.js').toString();
  const match=portable.match(/data-included-verse="data:audio\/mpeg;base64,([A-Za-z0-9+/=]+)"/);assert.ok(match);
  assert.deepEqual(Buffer.from(match[1],'base64'),bytes(record.audio.file));
  for(const id of ['word-timing-select','word-timing-capture-start','word-timing-capture-end','word-timing-audition','word-timing-import','word-timing-json'])assert.ok(normal.includes(`id="${id}"`));
  assert.ok(worker.includes(record.audio.file));
  assert.ok(!worker.includes('fellman-rh-2018/RH1-21-01H.mp3'));
  assert.ok(!normal.includes('.swf'));assert.ok(!portable.includes('application/x-shockwave-flash'));
});
