import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {getCorpus} from '../library.js';
import {createWordRecordingNavigator} from '../word-recording-navigation.js';
import {VOICE_SOURCE_RECORDINGS,voiceCombinations} from '../voice-studies.js';
import {WORD_SUPPORT} from '../word-support-summary.js';
import {ASAEL_GENESIS_WORD_SUPPORT} from '../asael-genesis-word-support-summary.js';
import {GENESIS_MELODY_WORD_SUPPORT} from '../genesis-melody-word-support-summary.js';
import {CHUKAT_WORD_SUPPORT} from '../chukat-word-support-summary.js';
import {passage as opening} from '../passage.js';
const corpus=await getCorpus(),navigator=createWordRecordingNavigator(corpus),before=JSON.stringify(VOICE_SOURCE_RECORDINGS);
const entries=[...WORD_SUPPORT.records,...ASAEL_GENESIS_WORD_SUPPORT.records,...GENESIS_MELODY_WORD_SUPPORT.records,...CHUKAT_WORD_SUPPORT.records];
const packets=entries.map(e=>({recordId:e.recordId,value:JSON.parse(gunzipSync(readFileSync(new URL('../'+e.file,import.meta.url))))}));
const expected=new Map();for(const {recordId,value} of packets)for(const w of value.words){if(!expected.has(w.id))expected.set(w.id,{hebrew:w.hebrew,records:new Set()});const e=expected.get(w.id);assert.equal(e.hebrew,w.hebrew);e.records.add(recordId);}
function word(bookId,chapter,verse,ordinal=1){return corpus.passage([{id:'test',bookId,start:{chapter,verse},end:{chapter,verse}}]).verses[0].words[ordinal-1];}

test('every fast opening-fixture word has the exact preferred Genesis identity used by the full reader',()=>{
 let count=0;for(const v of opening.verses)for(const [i,w]of v.words.entries()){
  const full=word('gen',1,v.number,i+1);assert.equal(w.id,full.id);assert.equal(w.sourceHebrew,full.sourceHebrew);assert.equal(full.bookId,'gen');assert.equal(full.kind,'w');count++;
 }assert.equal(count,27);
});

test('whole Torah navigation matches every supplied packet word exactly and withholds all other comparisons',()=>{
 assert.deepEqual(navigator.counts,{words:1157,recordings:12,passageRanges:4});assert.equal(expected.size,1157);assert.equal(packets.length,12);
 let count=0,covered=0;for(const bookId of ['gen','exo','lev','num','deu']){
  const book=corpus.books.find(b=>b.id===bookId),last=book.chapters.at(-1);
  for(const w of corpus.passage([{id:'whole',bookId,start:{chapter:1,verse:1},end:{chapter:last.number,verse:last.verses.at(-1).number}}]).verses.flatMap(v=>v.words)){
   count++;const e=expected.get(w.id),match=navigator.forWord(w);assert.equal(match.available,!!e,w.id);
   if(!e){assert.deepEqual(match.studies,[]);continue;}covered++;assert.equal(match.word.hebrew,e.hebrew);assert.deepEqual(new Set(match.recordings),e.records);assert.equal(match.review,null);
   for(const study of match.studies){assert.equal(study.review,null);const actual=new Set(voiceCombinations(study.id).map(r=>r.id));assert(study.recordIds.every(id=>actual.has(id)));}
  }
 }
 assert.equal(count,79985);assert.equal(covered,1157);assert.equal(JSON.stringify(VOICE_SOURCE_RECORDINGS),before);
});

test('changed letters, accents, CGJ, reference and word identity fail closed without replacing reader text',()=>{
 const w=word('gen',1,1),original=JSON.stringify(w);assert(navigator.forWord(w).available);
 for(const changed of [{...w,sourceHebrew:w.sourceHebrew.replace('֖','')},{...w,sourceHebrew:w.sourceHebrew+'\u034f'},{...w,sourceHebrew:'א'},{...w,bookId:'exo'},{...w,chapter:2},{...w,verse:2},{...w,ordinal:2},{...w,kind:'k'},{...w,sourceWordId:'gen-1-1-2'}]){
  assert.equal(navigator.forWord(changed).available,false);assert.throws(()=>navigator.verify(changed,'asael-bereshit'));
 }assert.equal(JSON.stringify(w),original);assert.equal(navigator.forWord(null).available,false);
});

test('repeated assignment occurrences retain canonical word identity and never mutate navigation bindings',()=>{
 const w=word('gen',1,1),occurrence={...w,id:'assignment-second:'+w.id};assert.deepEqual(navigator.forWord(occurrence),navigator.forWord(w));
 const result=navigator.forWord(w);result.word.hebrew='bad';result.studies[0].recordIds.length=0;result.studies[0].coverage.start.verse=99;
 const checked=navigator.verify(w,'asael-bereshit');assert.equal(checked.word.hebrew,w.sourceHebrew);assert.equal(checked.study.recordIds.length,2);assert.equal(checked.study.coverage.start.verse,1);
 checked.study.coverage.end.verse=99;assert.equal(navigator.verify(w,'asael-bereshit').study.coverage.end.verse,3);
});

test('actual supplied source views remain distinct and duplicate subsets do not hide the three-recording comparison',()=>{
 const cases=[['gen',1,1,2],['gen',2,4,3],['gen',5,25,2],['num',19,4,5]];
 for(const [b,c,v,n] of cases){const w=word(b,c,v),match=navigator.forWord(w);assert.equal(match.studies.length,1);assert.equal(match.studies[0].recordIds.length,n);assert.equal(match.recordings.length,n);assert.equal(navigator.verify(w,match.studies[0].id).word.id,w.id);}
 assert.throws(()=>navigator.verify(word('gen',1,1),navigator.forWord(word('num',19,4)).studies[0].id));assert.throws(()=>createWordRecordingNavigator(null));
});
