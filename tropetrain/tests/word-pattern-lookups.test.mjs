import test from 'node:test';import assert from 'node:assert/strict';
import {getCorpus} from '../library.js';import {createReadingModel} from '../music.js';
import {createWordPatternIndex,wordPatternCatalogue} from '../word-pattern-lookups.js';
import {patternContextChoices,printedPatternPlan} from '../printed-patterns.js';
const corpus=await getCorpus();
const reading=(bookId='gen',chapter=1,verse=1)=>createReadingModel(corpus.passage([{id:'study',bookId,start:{chapter,verse},end:{chapter,verse}}])).words;
const fixture=texts=>texts.map((sourceHebrew,i)=>({id:'word-'+i,sourceWordId:'source-'+i,sourceHebrew,bookId:'gen',chapter:1,verse:1,sectionId:'study',verseKey:'v1',ordinal:i+1,index:i}));
const noFit=r=>{for(const k of ['musicalWordAllocation','syllableUnderlay','phonemes','audioTimes','musicalReview'])assert.equal(r[k],null,k);};
test('a real marked Torah word opens only documentary sign-context relations, with no musical assignment',()=>{
 const words=reading(),before=structuredClone(words),r=createWordPatternIndex(words).forWord(1);assert.equal(r.status,'sign-lookups');assert.equal(r.selectedWord.id,'gen-1-1-2');assert.equal(r.selectedWord.hebrew,'בָּרָ֣א');assert.equal(r.candidates.length,20);noFit(r);
 for(const c of r.candidates){noFit(c);assert.equal(c.conditionApplicationVerified,false);assert(c.queryIds.includes('munah'));for(const p of c.lookup.matchedSignPositions){const w=words.find(w=>w.id===p.readerWordId);assert.equal(w.sourceHebrew[p.offset],p.char);}assert(c.lookup.words.some(w=>w.id===r.selectedWord.id));}
 assert.deepEqual(words,before);const copy=JSON.parse(JSON.stringify(r));copy.candidates[0].lookup.words[0].hebrew='changed';assert.equal(createWordPatternIndex(words).forWord(1).candidates[0].lookup.words[0].hebrew,words[1].sourceHebrew);
});
test('every source relation comes from an existing supplied query and literal conditions remain unreviewed',()=>{
 const c=wordPatternCatalogue();assert.equal(c.entries.length,82);assert.equal(new Set(c.entries.map(r=>r.queryId)).size,28);assert.equal(c.unmapped.length,35);assert(c.unmapped.some(r=>r.sourceId.includes('idelsohn')));
 for(const e of c.entries){assert(patternContextChoices(e.sourceId,e.modeId).some(q=>q.ids.join('>')===e.queryId));assert(!e.sourceId.includes('idelsohn'));assert.equal(e.conditionApplicationVerified,false);noFit(e);if(e.writtenPlayback){const plan=printedPatternPlan(e.modeId,{sourceId:e.sourceId});assert(plan.length);for(const n of plan){assert.equal(n.wordId,null);assert.equal(n.syllable,null);}}}
 const conditions=c.entries.filter(e=>e.printedCondition);assert(conditions.length>0);assert(conditions.some(e=>e.printedCondition.modernPredicate===null));assert(c.entries.filter(e=>e.sourceId.startsWith('baer')).every(e=>e.sourceReference.record==='docs/BAER-NO105-PATTERNS.json'));c.entries.length=0;assert.equal(wordPatternCatalogue().entries.length,82);
});
test('maqaf preserves an unaccented member, CGJ and raw sign offsets without pretending it carries the matched sign',()=>{
 const words=fixture(['כָּל־','בְּנֵ֣י','יִשְׂרָאֵ֑ל׃']),before=structuredClone(words),r=createWordPatternIndex(words).forWord(0);assert.equal(r.status,'sign-lookups');const pair=r.candidates.find(c=>c.queryId==='munah>etnahta');assert(pair);assert.equal(pair.lookup.includedByMaqafUnit,true);assert.equal(pair.lookup.selectedWordCarriesMatchedSign,false);assert.deepEqual(pair.lookup.words.map(w=>w.hebrew),before.map(w=>w.sourceHebrew));assert.deepEqual(pair.lookup.words.map(w=>w.sourceWordId),before.map(w=>w.sourceWordId));assert.deepEqual(words,before);
 const cgj=fixture(['בָּ֣רָ\u034fא','אֱלֹהִ֑ים']);assert.equal(createWordPatternIndex(cgj).forWord(0).selectedWord.hebrew,cgj[0].sourceHebrew);
});
test('source-derived analysis ignores forged caller accents and retains duplicated positional marks',()=>{
 const words=reading();for(const w of words)w.signAnalysis={signs:[],primary:null};const r=createWordPatternIndex(words).forWord(1);assert.equal(r.candidates.length,20);
 const dup=fixture(['אַ֙ב֙','ג֔']);const d=createWordPatternIndex(dup).forWord(0);assert.equal(d.selectedWord.hebrew,'אַ֙ב֙');assert(d.candidates.length>0);for(const c of d.candidates)for(const p of c.lookup.matchedSignPositions)assert.equal(dup.find(w=>w.id===p.readerWordId).sourceHebrew[p.offset],p.char);
});
test('query matching does not cross verse, section, book or occurrence boundaries',()=>{
 for(const change of [{verse:2},{chapter:2},{bookId:'exo'},{sectionId:'other'},{verseKey:'v2'}]){const words=fixture(['בָּרָ֣א','אֱלֹהִ֑ים']);Object.assign(words[1],change);assert(!createWordPatternIndex(words).forWord(0).candidates.some(c=>c.queryId==='munah>etnahta'));}
 const words=fixture(['בָּרָ֣א','אֱלֹהִ֑ים']);words[1].id=words[0].id;assert.throws(()=>createWordPatternIndex(words),/unique occurrence/);
 const sections=createReadingModel(corpus.passage([{id:'one',bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:1}},{id:'two',bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:1}}])).words;const index=createWordPatternIndex(sections);for(const i of [1,8])for(const c of index.forWord(i).candidates)assert.equal(new Set(c.lookup.words.map(w=>w.sectionId)).size,1);
});
test('withheld and non-Torah units retain the original text and expose no ordinary Torah realization',()=>{
 const words=fixture(['א֥׀','ב֑']);const r=createWordPatternIndex(words).forWord(0);assert.equal(r.status,'source-unit-withheld');assert.equal(r.candidates.length,0);assert(r.sourceUnit.issues.length);noFit(r);
 const missing=fixture(['בָּרָ֣א','אֱלֹהִ֑ים']).map(({bookId,...w})=>w);assert.equal(createWordPatternIndex(missing).forWord(0).status,'source-reference-unavailable');
 const other=fixture(['בָּרָ֣א','אֱלֹהִ֑ים']).map(w=>({...w,bookId:'isa'}));const out=createWordPatternIndex(other).forWord(0);assert.equal(out.status,'outside-torah');assert.deepEqual(out.candidates,[]);assert.equal(out.selectedWord.hebrew,other[0].sourceHebrew);
});
test('stale words, occurrence identity, removed words and invalid cursors are rejected',()=>{
 for(const change of [w=>w[0].sourceHebrew+='֑',w=>w[0].id+='x',w=>w[0].sourceWordId+='x',w=>w.pop(),w=>w[0].sectionId='other']){const words=reading(),index=createWordPatternIndex(words);change(words);assert.throws(()=>index.forWord(1),/changed/);}
 const index=createWordPatternIndex(reading());for(const i of [-1,7,.5,null])assert.throws(()=>index.forWord(i),/Select a word/);assert.throws(()=>createWordPatternIndex([]),/unique occurrence/);
});
