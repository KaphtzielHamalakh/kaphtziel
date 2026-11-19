import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getCorpus} from '../library.js';
import {createReadingModel} from '../music.js';
import {analyzeAccentContext,findCombinationsInReading,findCombinationsInCorpus,getCombinationCatalogue,visitCorpusContext} from '../accent-context.js';
const corpus=await getCorpus();
const reading=(bookId,chapter,verse)=>corpus.passage([{id:'example',bookId,start:{chapter,verse},end:{chapter,verse}}]);
const fixture=texts=>texts.map((sourceHebrew,i)=>({id:`word-${i+1}`,sourceWordId:`source-${i+1}`,sourceHebrew,verseKey:'v1',ordinal:i+1}));

test('maqaf units preserve every source word and all encoded positions',()=>{
  const words=fixture(['כָּל־','בְּנֵ֣י','יִשְׂרָאֵ֑ל׃']),before=structuredClone(words),context=analyzeAccentContext(words);
  assert.equal(context.units.length,2);assert.deepEqual(context.units[0].wordIndices,[0,1]);assert.equal(context.runs.length,1);
  const [hit]=findCombinationsInReading(words,'munah>etnahta',context);
  assert.deepEqual(hit.sourceWordIds,['source-1','source-2','source-3']);assert.equal(hit.start,0);assert.equal(hit.end,2);assert.equal(hit.includesMaqaf,true);
  assert.deepEqual(words,before);
  for(const unit of context.units)for(const atom of unit.atoms)for(const p of atom.positions)assert.equal(words[p.wordIndex].sourceHebrew.slice(p.offset,p.offset+1),p.char);
});
test('positional Pashta duplication is one search atom holding both original records',()=>{
  const words=fixture(['הָפַ֤ךְ','תֹ֙הוּ֙']),context=analyzeAccentContext(words),[hit]=findCombinationsInReading(words,'mahapakh>pashta',context);
  assert.equal(context.units[1].foldedPositions,1);assert.equal(context.units[1].atoms.length,1);assert.equal(hit.atoms[1].positions.length,2);
  assert.deepEqual(hit.atoms[1].positions.map(p=>p.offset),[2,6]);assert.equal(words[1].sourceHebrew,'תֹ֙הוּ֙');
  assert.equal(findCombinationsInReading(words,'pashta>pashta',context).length,0);
});
test('Zarqa helper remains distinct and is never a second functional Zarqa',()=>{
  const words=fixture(['א֣','א֘ב֮']),context=analyzeAccentContext(words),hits=findCombinationsInReading(words,'munah>zarqa',context);
  assert.equal(hits.length,1);assert.equal(context.units[1].atoms.length,1);assert.equal(context.units[1].atoms[0].positions[0].code,'U+05AE');
  assert.equal(findCombinationsInReading(fixture(['א֣','א֘']),'munah>zarqa').length,0);
});
test('the same source combination across words and inside a word remain distinguishable',()=>{
  const model=createReadingModel(reading('gen',22,1)),hits=findCombinationsInReading(model.words,'munah>zakef-katon',model.context);
  assert.equal(hits.length,3);assert.deepEqual(hits.map(h=>h.words.map(w=>w.ordinal)),[[3,4],[5],[9,10]]);
  assert.deepEqual(hits.map(h=>h.withinWord),[false,true,false]);
  assert.equal(hits[1].words[0].sourceHebrew,'וְהָ֣אֱלֹהִ֔ים');
});
test('paseq, multiple disjunctives, unusual repeats and maqaf faults form search barriers',()=>{
  for(const middle of ['א֣ ׀','א֖ב֑','א֣ב֣','א֣־','א־ב֣','א֔ב֣']){
    const words=fixture(['א֤',middle,'א֙']),context=analyzeAccentContext(words);
    assert.ok(context.units.some(u=>!u.qualified),middle);assert.equal(findCombinationsInReading(words,'mahapakh>pashta',context).length,0);
  }
  assert.ok(analyzeAccentContext(fixture(['כָּל־'])).units[0].issues.includes('dangling-maqaf'));
  assert.ok(analyzeAccentContext(fixture(['א֨ב֑׃','ג֑'])).units[0].issues.includes('internal-verse-closing-mark'));
});
test('verse and assigned-section boundaries prevent combinations, while repeated occurrences keep separate IDs',()=>{
  const words=fixture(['א֣','א֑']);words[1].verseKey='v2';assert.equal(findCombinationsInReading(words,'munah>etnahta').length,0);
  const range={bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:1}};
  const model=createReadingModel(corpus.passage([{...range,id:'first'},{...range,id:'again'}]));
  const hits=findCombinationsInReading(model.words,'munah>etnahta',model.context);assert.equal(hits.length,2);
  assert.deepEqual(hits[0].sourceWordIds,hits[1].sourceWordIds);assert.notDeepEqual(hits[0].occurrenceIds,hits[1].occurrenceIds);
  assert.ok(hits[1].occurrenceIds.every(id=>id.endsWith('@again')));
});
test('whole-word selection exposes extra accents and retains qere/source variants',()=>{
  const words=fixture(['א֣ב֤ג֙']),[hit]=findCombinationsInReading(words,'mahapakh>pashta');
  assert.equal(hit.includesOtherSigns,true);assert.equal(hit.withinWord,true);assert.equal(hit.words[0],words[0]);
  const model=createReadingModel(reading('gen',8,17));
  const qere=model.words.find(w=>w.kind==='q'),unit=model.context.units[model.context.wordContexts[qere.index].unitIndex];
  assert.ok(unit.wordIndices.includes(qere.index));assert.ok(qere.writtenVariants.length);assert.equal(qere.sourceHebrew,corpus.passage(reading('gen',8,17).ranges).verses[0].words.find(w=>w.kind==='q').sourceHebrew);
});
test('Torah lookup finds the unique rare combination and its exact original words',async()=>{
  const hits=await findCombinationsInCorpus(corpus,'yerah-ben-yomo>qarnei-fara');assert.equal(hits.length,1);
  assert.equal(hits[0].word.reference,'Numbers 35:5');assert.deepEqual(hits[0].words.map(w=>w.ordinal),[7,8]);
  assert.ok(hits[0].atoms.every(a=>a.positions.every(p=>hits[0].sourceWordIds.includes(p.sourceWordId))));
  assert.throws(()=>findCombinationsInReading([],['invented','etnahta']),/Choose a source combination/);
});
test('catalogue suffix counts agree with independent query matching for common and rare examples',async()=>{
  const catalogue=await getCombinationCatalogue(corpus);assert.ok(catalogue.length>50);
  for(const id of ['munah>etnahta','munah>zakef-katon','yerah-ben-yomo>qarnei-fara']){
    const entry=catalogue.find(e=>e.id===id);assert.ok(entry);
    const hits=await findCombinationsInCorpus(corpus,id);assert.equal(hits.length,entry.count);
  }
  assert.equal(await getCombinationCatalogue(corpus),catalogue);
});
test('all preferred Torah words have exactly one source unit with exact sign offsets, including unresolved cases',async()=>{
  let count=0,unqualified=0;
  await visitCorpusContext(corpus,(words,context)=>{
    const indices=context.units.flatMap(u=>u.wordIndices);assert.deepEqual(indices,words.map((_,i)=>i));count+=words.length;
    for(const unit of context.units){if(!unit.qualified)unqualified++;for(const atom of unit.atoms)for(const p of atom.positions){assert.equal(p.wordId,words[p.wordIndex].id);assert.equal(words[p.wordIndex].sourceHebrew.slice(p.offset,p.offset+1),p.char);}}
    for(const hit of findCombinationsInReading(words,'munah>etnahta',context)){assert.ok(hit.words.every(w=>w.reference===hit.word.reference));assert.ok(hit.words.every(w=>w.sectionId===hit.word.sectionId));}
  });
  assert.equal(count,79985);assert.ok(unqualified>0);
});
