import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getCorpus} from '../library.js';
import {getRepertoireCorpus,READING_TYPES,booksForReadingType,readingTypeForRanges,isTorahReading,reorderReadingSection,validateReadingSections,createRepertoireAssignment,parseRepertoireAssignment} from '../repertoire.js';
import {sourceAlternatives} from '../source-alternatives.js';
import {createReadingModel} from '../music.js';

const corpus=await getRepertoireCorpus();
const range=(bookId,c,v,id='one')=>({id,bookId,start:{chapter:c,verse:v},end:{chapter:c,verse:v}});
const model=ranges=>createReadingModel(corpus.passage(ranges));

test('reading-type choices have exact book rosters while the original whole-Torah corpus remains separate',async()=>{
  assert.deepEqual(READING_TYPES.map(type=>[type.id,type.limit]),[['torah',100],['haftarah',5],['megillah',2]]);
  assert.deepEqual(READING_TYPES.map(type=>booksForReadingType(type.id,corpus).length),[5,21,5]);
  assert.deepEqual(booksForReadingType('megillah',corpus).map(book=>book.name),['Ruth','Song of Songs','Ecclesiastes','Lamentations','Esther']);
  const ids=READING_TYPES.flatMap(type=>booksForReadingType(type.id,corpus).map(book=>book.id));
  assert.equal(new Set(ids).size,31);
  assert.deepEqual((await getCorpus()).books.map(book=>book.id),['gen','exo','lev','num','deu']);
  assert.throws(()=>booksForReadingType('invented-profile',corpus),/reading type/);
});

test('reading-type inference includes hidden sections and never silently merges repertoires or enables a wrong scroll layout',()=>{
  assert.equal(readingTypeForRanges([range('isa',40,1),range('mic',7,18,'two')],corpus),'haftarah');
  assert.equal(readingTypeForRanges([range('est',1,1),range('rut',1,1,'two')],corpus),'megillah');
  assert.equal(readingTypeForRanges([range('gen',1,1)],corpus),'torah');
  assert.equal(isTorahReading([range('gen',1,1),range('deu',6,4,'two')]),true);
  assert.equal(isTorahReading([range('gen',1,1),{...range('est',1,1,'two'),hidden:true}]),false);
  assert.equal(isTorahReading([]),false);
  assert.throws(()=>readingTypeForRanges([range('gen',1,1),{...range('isa',1,1,'two'),hidden:true}],corpus),/one reading type/);
  assert.throws(()=>readingTypeForRanges([],corpus),/at least one/);
  assert.throws(()=>readingTypeForRanges([range('missing',1,1)],corpus),/available library/);
  assert.throws(()=>validateReadingSections('torah',[range('isa',40,1)],corpus),/outside/);
});

test('written-only source alternatives retain their exact form and never acquire a reading/playback target',()=>{
  const m=model([range('sam2',13,33)]),groups=sourceAlternatives(m.passage.verses,m.words),group=groups.find(g=>g.status==='written-only');
  assert.ok(group);assert.equal(group.written[0].sourceHebrew,'אִם־');assert.deepEqual(group.reading,[]);
  assert.ok(!m.words.some(w=>w.sourceWordId===group.written[0].id));
  assert.ok(!m.events.some(e=>e.sourceWordId===group.written[0].id));
});

test('reading-only source alternatives link to the exact reading occurrence and preserve editorial flags',()=>{
  const m=model([range('jdg',20,13)]),group=sourceAlternatives(m.passage.verses,m.words).find(g=>g.status==='reading-only');
  assert.ok(group);assert.deepEqual(group.written,[]);assert.equal(group.reading.length,1);
  const {token,word}=group.reading[0];assert.equal(token.sourceHebrew,'בְנֵ֣י');
  assert.equal(word,m.words.find(w=>w.sourceWordId===token.id));assert.equal(word.sourceHebrew,token.sourceHebrew);
  assert.deepEqual(token.editorialNotes,[{kind:'editorialCode',offset:1,code:'q'}]);
  assert.ok(m.events.some(event=>event.wordId===word.id));
});

test('unequal written/read groups and repeated sections retain separate occurrence targets',()=>{
  const m=model([range('gen',30,11,'first'),range('gen',30,11,'again')]);
  const groups=sourceAlternatives(m.passage.verses,m.words);assert.equal(groups.length,2);
  assert.notEqual(groups[0].id,groups[1].id);
  for(const [i,g] of groups.entries()){
    assert.equal(g.written.length,1);assert.equal(g.written[0].sourceHebrew,'בגד');assert.equal(g.reading.length,2);
    assert.deepEqual(g.reading.map(r=>r.token.sourceHebrew),['בָּ֣א','גָ֑ד']);
    assert.ok(g.reading.every(r=>r.word.id.endsWith(i===0?'@first':'@again')));
    assert.ok(g.reading.every(r=>r.word.sectionId===g.sectionId));
  }
  const partial=sourceAlternatives(m.passage.verses.slice(1),m.words);assert.equal(partial.length,1);assert.equal(partial[0].sectionId,'again');
  const absent=sourceAlternatives(m.passage.verses,[]);assert.ok(absent.every(g=>g.reading.every(r=>r.word===null)),'No nonexistent word target is fabricated.');
});

test('tutor section reordering preserves source IDs, hidden flags, names and exact cross-book order through interchange',()=>{
  const original=[{...range('hos',14,2,'a'),label:'First'}, {...range('mic',7,18,'b'),label:'Hidden section',hidden:true}, {...range('isa',40,1,'c'),label:'Last'}];
  const snapshot=structuredClone(original),moved=reorderReadingSection(original,'c',-1);
  assert.deepEqual(original,snapshot);assert.deepEqual(moved.map(r=>r.id),['a','c','b']);assert.equal(moved[1],original[2]);
  const saved=createRepertoireAssignment('Ordered haftarah','haftarah',moved,{tempo:55,transpose:4,melodyId:'original-demo-01'},corpus);
  const loaded=parseRepertoireAssignment(JSON.stringify(saved),corpus),p=corpus.passage(loaded.sections);
  assert.deepEqual(p.verses.map(v=>v.reference),['Hosea 14:2','Isaiah 40:1']);
  assert.equal(loaded.sections[2].hidden,true);assert.equal(loaded.sections[2].label,'Hidden section');
  assert.deepEqual(loaded.sections.map(r=>r.id),['a','c','b']);
  assert.throws(()=>reorderReadingSection(original,'a',-1),/cannot move/);
  assert.throws(()=>reorderReadingSection(original,'c',1),/cannot move/);
  assert.throws(()=>reorderReadingSection(original,'missing',1),/cannot move/);
});
