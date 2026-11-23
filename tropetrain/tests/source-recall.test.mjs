import test from 'node:test';
import assert from 'node:assert/strict';
import {getCorpus} from '../library.js';
import {createReadingModel} from '../music.js';
import {createRecallDeck,recallReadingIdentity,recallChoices,checkRecallAnswer,randomRecallIndex} from '../source-recall.js';
const corpus=await getCorpus();
const section=(id='first',bookId='gen',chapter=1,verse=1)=>({id,bookId,start:{chapter,verse},end:{chapter,verse}});
const model=(sections=[section()])=>createReadingModel(corpus.passage(sections));
const synthetic=(hebrew,patch={})=>({id:'gen-1-1-1',sourceWordId:'gen-1-1-1',sourceHebrew:hebrew,index:0,bookId:'gen',chapter:1,verse:1,ordinal:1,sectionId:'first',verseKey:'gen-1-1@first',...patch});
const display=card=>card.words.map(w=>w.clusters.map(c=>c.display).join(''));

test('Genesis1:1 offers seven exact source-character answers without adding a melody or sound assignment',()=>{
 const m=model(),before=JSON.stringify(m),deck=createRecallDeck(m.words);
 assert.deepEqual(deck.cards.map(c=>c.target.id),['tipha','munah','etnahta','merkha','tipha','merkha','silluq']);
 assert.deepEqual(deck.cards.map(c=>c.words[0].hebrew),m.words.map(w=>w.sourceHebrew));
 assert.equal(JSON.stringify(m),before);assert.equal(deck.withheld.length,0);
 for(const card of deck.cards)for(const key of ['melody','pronunciation','phonemes','audioTimes','review'])assert.equal(card[key],null);
});
test('empty boxes retain their exact letter clusters and original above/below positions',()=>{
 for(const [hebrew,id,position,projected]of [['בָּרָ֣א','munah','below','בָּרָא'],['רָקִ֔יעַ','zakef-katon','above','רָקִיעַ']]){
  const card=createRecallDeck([synthetic(hebrew)]).cards[0],slots=card.words[0].clusters.flatMap(c=>c.slots);
  assert.equal(card.target.id,id);assert.equal(slots.length,1);assert.equal(slots[0].position,position);assert.deepEqual(display(card),[projected]);
  assert.equal(card.words[0].clusters.map(c=>c.source).join(''),hebrew);assert.equal(slots[0].offset,hebrew.indexOf(card.target.char));
 }
});
test('Silluq hides only the final verse-closing meteg while CGJ, earlier meteg and vowels remain literal',()=>{
 const hebrew='אָֽ\u034fבֽ׃',card=createRecallDeck([synthetic(hebrew)]).cards[0];
 assert.equal(card.target.id,'silluq');assert.deepEqual(display(card),['אָֽ\u034fב׃']);assert.equal(card.words[0].hebrew,hebrew);
 assert.equal(card.words[0].clusters.flatMap(c=>c.slots)[0].offset,hebrew.lastIndexOf('ֽ'));
});
test('both original Pashta positions stay attached to their letters and receive one source-character name',()=>{
 const hebrew='בָּ֙רָא֙',card=createRecallDeck([synthetic(hebrew)]).cards[0];
 assert.equal(card.target.id,'pashta');assert.equal(card.foldedPositions,1);assert.equal(card.words[0].clusters.flatMap(c=>c.slots).length,2);assert.deepEqual(display(card),['בָּרָא']);assert.equal(card.words[0].hebrew,hebrew);
});
test('maqaf groups select every original word and never divide a shared source pronunciation word',()=>{
 const m=model([section('shared','deu',32,6)]),deck=createRecallDeck(m.words),card=deck.forCursor(0);
 assert.deepEqual([card.startIndex,card.endIndex],[0,1]);assert.deepEqual(card.words.map(w=>w.hebrew),['הֲ־','לַיְהוָה֙']);assert.equal(card.target.id,'pashta');assert.equal(card.words[0].clusters.flatMap(c=>c.slots).length,0);assert.equal(card.words[1].clusters.flatMap(c=>c.slots).length,1);
});
test('unresolved composites, poetic signs, dangling maqaf and several functional accents receive no guessed question',()=>{
 for(const text of ['אָ֣ב ׀','אָ֑֔ב','אָ֬ב','אָ־','אָ֣֨ב','אָב']){
  const deck=createRecallDeck([synthetic(text)]);assert.equal(deck.cards.length,0,text);assert.equal(deck.withheld.length,1);assert(deck.withheld[0].reasons.length);
 }
});
test('cached sign analysis cannot replace the literal source character',()=>{
 const word=synthetic('בָּרָ֣א',{signAnalysis:{signs:[{id:'revia',char:'֗',offset:0,proseClass:'D3'}],marks:[]}});
 assert.equal(createRecallDeck([word]).cards[0].target.id,'munah');
});
test('Shalshelet with its printed paseq is a literal character question while the musical context remains explicit',()=>{
 const text='וַיְמָאֵ֓ן ׀',deck=createRecallDeck([synthetic(text)]),card=deck.cards[0];
 assert.equal(card.target.id,'shalshelet');assert.deepEqual(card.sourceContextWarnings,['paseq-context']);assert.equal(card.words[0].hebrew,text);assert.deepEqual(display(card),['וַיְמָאֵן ׀']);assert.equal(card.melody,null);assert.equal(card.review,null);
});
test('repeated sections keep separate question identities while canonical IDs and marked Hebrew remain the same',()=>{
 const m=model([section(),section('second')]),deck=createRecallDeck(m.words),a=deck.cards[1],b=deck.cards[8];
 assert.notEqual(a.id,b.id);assert.notEqual(a.words[0].id,b.words[0].id);assert.equal(a.words[0].sourceWordId,b.words[0].sourceWordId);assert.equal(a.words[0].hebrew,b.words[0].hebrew);assert.deepEqual([a.startIndex,b.startIndex],[1,8]);
});
test('a changed mark, CGJ, occurrence, source ID or chapter invalidates an existing question before selection or playback',()=>{
 const m=model(),deck=createRecallDeck(m.words),card=deck.cards[1];
 for(const patch of [{sourceHebrew:card.words[0].hebrew+'֗'},{sourceHebrew:card.words[0].hebrew+'\u034f'},{id:'another-occurrence'},{sourceWordId:'gen-1-1-7'},{chapter:2}]){
  const changed=structuredClone(m.words);Object.assign(changed[1],patch);assert.throws(()=>deck.verify(card,changed),/changed reading/);
 }
 assert.throws(()=>deck.verify(undefined,m.words),/changed reading/);assert.throws(()=>deck.verify({...card,review:'accepted'},m.words),/changed reading/);assert.throws(()=>deck.verify({...card,endIndex:4},m.words),/changed reading/);
});
test('out-of-order or duplicate occurrences are rejected and returned source cards are immutable',()=>{
 const m=model(),deck=createRecallDeck(m.words),card=deck.cards[1];
 assert.throws(()=>recallReadingIdentity(m.words.slice(1)),/ordered/);assert.throws(()=>recallReadingIdentity(m.words.map((w,i)=>i===1?{...w,id:m.words[0].id}:w)),/ordered/);
 assert.throws(()=>{card.words[0].hebrew='changed';},TypeError);const copy=deck.verify(card,m.words);copy.words[0].hebrew='changed';assert.equal(deck.cards[1].words[0].hebrew,m.words[1].sourceHebrew);
});
test('four unique deterministic answer choices grade character identity only and leave every review unassigned',()=>{
 const m=model();for(const card of createRecallDeck(m.words).cards){const choices=recallChoices(card);assert.equal(choices.length,4);assert.equal(new Set(choices.map(c=>c.id)).size,4);assert.equal(choices.filter(c=>c.id===card.target.id).length,1);assert.deepEqual(recallChoices(card),choices);
  for(const answer of choices){const result=checkRecallAnswer(card,answer.id);assert.equal(result.correct,answer.id===card.target.id);assert.equal(result.musicalReview,null);assert.equal(result.phonologicalReview,null);}assert.throws(()=>checkRecallAnswer(card,'made-up'),/Choose one/);}
});
test('source-selected playback keeps original notes and independent key and tempo',()=>{
 const m=model(),before=JSON.stringify(m),deck=createRecallDeck(m.words),card=deck.cards[1],a=m.buildPlan(card.startIndex,card.endIndex,{tempo:60}),b=m.buildPlan(card.startIndex,card.endIndex,{tempo:120,transpose:5});
 assert.deepEqual(a.map(e=>e.id),b.map(e=>e.id));for(const [i,event]of b.entries()){assert.equal(event.midi,a[i].midi+5);assert.equal(event.durationSeconds,a[i].durationSeconds/2);}assert.equal(JSON.stringify(m),before);assert.equal(deck.verify(card,m.words).target.id,'munah');
});
test('random questions do not repeat the current card and validate both interval endpoints',()=>{
 for(const current of [0,1,6])for(const random of [0,0.3,0.999999]){const next=randomRecallIndex(7,current,random);assert(next>=0&&next<7&&next!==current);}assert.equal(randomRecallIndex(1,0,0),0);for(const random of [-1,1,NaN])assert.throws(()=>randomRecallIndex(7,1,random),/valid recall/);
});
