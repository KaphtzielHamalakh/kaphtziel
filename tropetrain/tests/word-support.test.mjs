import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';import{createHash}from'node:crypto';
import{WORD_SUPPORT,loadWordSupport,validateWordSupport,wordSupportAvailable,wordSupportContext}from'../word-support.js';
import{voiceRecording,voiceCoverage,VOICE_STUDIES}from'../voice-studies.js';
import{getCorpus}from'../library.js';import{createWordTimingDraft,parseWordTimingDraft}from'../word-timing-draft.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex'),corpus=await getCorpus();
const pairs=['ashkenazic-as-recorded','israeli-as-recorded'].map(style=>{const record=voiceRecording('asael-bereshit',style,'ashkenazic-melody'),coverage=voiceCoverage(record),words=corpus.passage([{...coverage,id:'support-check'}]).verses.flatMap(v=>v.words);return{record,draft:createWordTimingDraft(record,coverage,words)};});
const packets=pairs.map(({record})=>JSON.parse(gunzipSync(read(WORD_SUPPORT.records.find(r=>r.recordId===record.id).file))));

test('both hash-pinned optional packets preserve every469marked word and bind to distinct unchanged source clocks',async()=>{
 assert.equal(WORD_SUPPORT.records.length,2);assert.equal(WORD_SUPPORT.newSingingVoice,null);assert.equal(WORD_SUPPORT.review,null);
 for(let i=0;i<2;i++){
  const{record,draft}=pairs[i],before=JSON.stringify(draft),entry=WORD_SUPPORT.records[i],bytes=read(entry.file);assert.equal(bytes.length,entry.bytes);assert.equal(hash(bytes),entry.sha256);
  assert(wordSupportAvailable(record));const data=await loadWordSupport(record,draft);assert.equal(data.words.length,469);
  assert.deepEqual(data.words.map(w=>[w.id,w.hebrew]),draft.words.map(w=>[w.id,w.hebrew]));assert.equal(JSON.stringify(draft),before);
  assert(data.words.every(w=>w.approvedBoundary===null&&w.review===null));assert(draft.words.every(w=>w.start===null&&w.end===null));
 }
 assert.notEqual(packets[0].source.duration,packets[1].source.duration);assert.notEqual(packets[0].words.at(-1).modelSupport.start,packets[1].words.at(-1).modelSupport.start);
 assert.equal(hash(read(WORD_SUPPORT.sourcePack.file)),WORD_SUPPORT.sourcePack.sha256);
});

test('wrong original, changed accent, different word order and forged review cannot enter the word-support study',()=>{
 assert.throws(()=>validateWordSupport(packets[0],pairs[1].draft),/different source/);
 for(const mutate of [p=>p.words[0].hebrew=p.words[0].hebrew.replace('֖',''),p=>p.words.reverse(),p=>p.words[0].approvedBoundary={start:0,end:1},p=>p.words[0].review='approved',p=>p.timedWords=[],p=>p.phonemes=[],p=>p.independentReview='approved',p=>p.model.revision='invented']){
  const value=structuredClone(packets[0]);mutate(value);assert.throws(()=>validateWordSupport(value,pairs[0].draft));
 }
});

test('invalid or overlapping support intervals fail instead of filling temporal gaps or stretching a source clock',()=>{
 for(const mutate of [p=>p.words[0].modelSupport.start=-1,p=>p.words[0].modelSupport.end=Infinity,p=>p.words[0].modelSupport.end=p.source.duration+1,p=>p.words[1].modelSupport.start=0,p=>p.words[0].evidence.lettersWithArgmaxSupport=99]){
  const value=structuredClone(packets[0]);mutate(value);assert.throws(()=>validateWordSupport(value,pairs[0].draft));
 }
});

test('context audition adds exactly one second and respects each original duration without certifying a word span',()=>{
 for(const p of packets){
  assert.equal(wordSupportContext(p,0).start,0);const last=wordSupportContext(p,p.words.length-1);assert.equal(last.end,p.source.duration);
  const mid=p.words[20].modelSupport,span=wordSupportContext(p,20);assert.equal(span.start,Math.max(0,mid.start-1));assert.equal(span.end,Math.min(p.source.duration,mid.end+1));
 }
 assert.throws(()=>wordSupportContext(packets[0],-1));assert.throws(()=>wordSupportContext(packets[0],0,0));
 assert.throws(()=>parseWordTimingDraft(JSON.stringify(packets[0]),pairs[0].draft),/Only unreviewed word-timing drafts/);
});

test('model evidence keeps its measured errors and unsupported letters explicit, with no new source voice or historical grammar',()=>{
 const a=packets[0].diagnostics,b=packets[1].diagnostics;assert.equal(a.wordsWithNoArgmaxSupportedLetters,24);assert.equal(b.wordsWithNoArgmaxSupportedLetters,7);
 assert.equal(a.wordsWithEveryLetterHavingSomeArgmaxSupport,159);assert.equal(b.wordsWithEveryLetterHavingSomeArgmaxSupport,270);
 assert(a.greedyCharacterErrorRateWithoutSpaces>.45&&a.greedyCharacterErrorRateWithoutSpaces<.46);assert(b.greedyCharacterErrorRateWithoutSpaces>.22&&b.greedyCharacterErrorRateWithoutSpaces<.23);
 for(const p of packets)for(const key of ['timedWords','syllableAlignment','phonemes','musicalNotes','independentReview'])assert.equal(p[key],null);
 assert.equal(wordSupportAvailable(voiceRecording('foreman-genesis','forte-lene','spoken')),false);assert.equal(VOICE_STUDIES.recordings.length,72);
});

test('a bad packet checksum is rejected before parsing or changing a personal draft',async()=>{
 const{record,draft}=pairs[0],before=JSON.stringify(draft);
 await assert.rejects(loadWordSupport(record,draft,{readPacket:async()=>new Uint8Array([1,2,3])}),/checksum/);assert.equal(JSON.stringify(draft),before);
});

test('normal and portable UI present opt-in context review with the source evidence and without model weight downloads',()=>{
 const normal=read('index.html').toString(),portable=restoredPortableHtml(read('TropeTrain.html')).toString(),sw=read('sw.js').toString();
 for(const id of ['word-support-panel','word-support-load','word-support-audition','word-support-word','word-support-status']){assert(normal.includes(`id="${id}"`));assert(portable.includes(`id="${id}"`));}
 assert(portable.includes('href="data:application/zip;base64,'+read(WORD_SUPPORT.sourcePack.file).toString('base64')+'"'));assert(!sw.includes('model.safetensors'));
 assert(portableFileBytes()<100*1024*1024);
});
