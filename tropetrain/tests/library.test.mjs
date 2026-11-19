import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getCorpus,createAssignment,parseAssignment} from '../library.js';
import {createReadingModel} from '../music.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const corpus=await getCorpus();
const range=(bookId,c,v,endC=c,endV=v)=>({bookId,start:{chapter:c,verse:v},end:{chapter:endC,verse:endV}});
test('passages can reach the first and final verses of every Torah book',()=>{
  for(const book of corpus.books){
    const finalChapter=book.chapters.at(-1),finalVerse=finalChapter.verses.at(-1);
    for(const [c,v] of [[1,1],[finalChapter.number,finalVerse.number]]){
      const p=corpus.passage([range(book.id,c,v)]);
      assert.equal(p.verses.length,1);assert.equal(p.verses[0].reference,`${book.name} ${c}:${v}`);
      assert.ok(p.verses[0].words.every(w=>w.bookId===book.id&&w.chapter===c&&w.verse===v));
    }
  }
});
test('cross-chapter ranges and ordered sections preserve their distinct boundaries',()=>{
  const p=corpus.passage([{...range('gen',1,31,2,2),id:'a'},{...range('deu',34,12),id:'b'}]);
  assert.deepEqual(p.verses.map(v=>v.reference),['Genesis 1:31','Genesis 2:1','Genesis 2:2','Deuteronomy 34:12']);
  const m=createReadingModel(p),sectionEnd=m.words.findIndex(w=>w.sectionId==='b')-1;
  assert.equal(m.bounds(0,0,'aliyah')[1],sectionEnd);
  assert.equal(m.words[m.bounds(0,0,'verse')[1]].reference,'Genesis 1:31');
});
test('overlapping sections have unique occurrence IDs and retain canonical source IDs',()=>{
  const p=corpus.passage([{...range('gen',1,1),id:'first'},{...range('gen',1,1),id:'again'}]);
  const words=p.verses.flatMap(v=>v.words);assert.equal(new Set(words.map(w=>w.id)).size,14);
  assert.equal(new Set(words.map(w=>w.sourceWordId)).size,7);
  assert.equal(words[0].sourceHebrew,words[7].sourceHebrew);
});
test('invalid references, backwards ranges and all-hidden readings fail explicitly',()=>{
  for(const r of [range('gen',0,1),range('gen',1,99),range('gen',2,1,1,1),range('missing',1,1),range('gen',true,1)])assert.throws(()=>corpus.passage([r]));
  assert.throws(()=>corpus.passage([{...range('gen',1,1),hidden:true}]),/Show at least one/);
});
test('assignment interchange preserves boundaries and excludes personal key and tempo',()=>{
  const sections=corpus.passage([{...range('gen',1,1,1,3),id:'one',label:'First aliyah'}, {...range('deu',6,4),id:'two',hidden:true}]).ranges;
  const assignment=createAssignment('Tutor test',sections,{view:'parallel',groups:false,signClasses:true,tempo:42,transpose:3});
  const roundtrip=parseAssignment(JSON.stringify(assignment),corpus);
  assert.deepEqual(roundtrip.sections,sections);assert.equal(roundtrip.displayPreferences.view,'parallel');
  assert.equal(roundtrip.musicalPreferences.pronunciationId,null);
  assert.equal(roundtrip.displayPreferences.signClasses,true);
  delete assignment.displayPreferences.signClasses;assert.equal(parseAssignment(JSON.stringify(assignment),corpus).displayPreferences.signClasses,false);
  assert.equal('tempo' in assignment,false);assert.equal('transpose' in assignment,false);
  assignment.musicalPreferences.melodyId='unimplemented-historical-system';
  assert.throws(()=>parseAssignment(JSON.stringify(assignment),corpus),/not yet implemented/);
});
test('all Torah reading words retain exact source strings through syllable and event generation',()=>{
  const original=JSON.parse(readFileSync(new URL('./fixtures/demo-event-hashes-v1.json',import.meta.url),'utf8'));
  let wordCount=0,unresolved=0;
  for(const book of corpus.books){
    const lastChapter=book.chapters.at(-1),lastVerse=lastChapter.verses.at(-1);
    const p=corpus.passage([range(book.id,1,1,lastChapter.number,lastVerse.number)]),m=createReadingModel(p);
    const sourceWords=p.verses.flatMap(v=>v.words);
    assert.equal(m.words.length,sourceWords.length);
    for(const [i,w] of m.words.entries()){
      assert.equal(w.sourceHebrew,sourceWords[i].sourceHebrew);
      assert.equal(w.syllables.map(s=>s.sourceHebrew).join(''),w.sourceHebrew);
      assert.ok(w.syllables.every(s=>s.phonemes===null));
      if(w.analysisStatus==='unsegmented')unresolved++;wordCount++;
    }
    const eventWords=new Set(m.events.map(e=>e.wordId));assert.equal(eventWords.size,m.words.length);
    assert.equal(m.events.length,original.books[book.id].events);
    assert.equal(createHash('sha256').update(JSON.stringify(m.events)).digest('hex'),original.books[book.id].sha256,'Source analysis must preserve every original demo event.');
  }
  assert.ok(wordCount>79000);console.log(`Full-corpus alignment: ${wordCount} reading words; ${unresolved} explicitly unresolved words.`);
});
