import test from 'node:test';
import assert from 'node:assert/strict';
import {getCorpus} from '../library.js';
import {createReadingModel} from '../music.js';
import {IDELSOHN_SCORE} from '../idelsohn-score.js';
import {validatePlan} from '../synthesis.js';
import {printedWordStudy,printedWordPhoto,printedUnitContext,PRINTED_UNDERLAY_RECORD} from '../printed-underlay.js';
import {musicXml,midiFile} from '../music-exports.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const corpus=await getCorpus(),range={id:'no268',bookId:'exo',start:{chapter:12,verse:21},end:{chapter:12,verse:22}};
const make=(ranges=[range])=>createReadingModel(corpus.passage(ranges),{melodyId:IDELSOHN_SCORE.id});
test('93 printed syllable groups cover exactly123 texted pitches and9rests while both untexted small notes remain unassigned',()=>{
 const m=make(),seen=new Set(),rests=new Set();let groups=0,beats=0;
 for(const word of m.words){const numbers=[...new Set(m.events.filter(e=>e.wordId===word.id&&e.sourcePrintedSyllableIndex!==null).map(e=>e.sourcePrintedSyllableIndex))];assert.deepEqual(numbers,Array.from({length:numbers.length},(_,i)=>i+1));for(const n of numbers){groups++;const p=m.buildPlan(word.index,word.index,{tempo:60,printedSyllableIndex:n});assert(p.length);assert.equal(new Set(p.map(e=>e.sourcePrintedSyllableId)).size,1);for(const e of p){assert.equal(e.sourcePrintedSyllableIndex,n);assert.equal(e.wordId,word.id);assert.equal(e.syllableId,null);assert.equal(e.syllable,null);assert.equal(e.phonemes,null);assert(!e.sourceSmallEighth);assert(!seen.has(e.sourceNoteId));seen.add(e.sourceNoteId);for(const r of [...e.sourceRestsBefore??[],...e.sourceRestsAfter??[]])rests.add(r.sourceRestId);}beats+=validatePlan(p);}}
 assert.equal(groups,93);assert.equal(seen.size,123);assert.equal(rests.size,9);assert.ok(Math.abs(beats-80.75)<1e-8);assert.equal(m.events.filter(e=>e.sourcePrintedSyllableId===null).length,2);
});
test('Moshe second printed syllable keeps its5 distinct attacks, slur and following eighth rest; key and pace stay independent',()=>{
 const m=make(),a=m.buildPlan(1,1,{tempo:60,printedSyllableIndex:2}),b=m.buildPlan(1,1,{tempo:120,transpose:1,printedSyllableIndex:2});assert.deepEqual(a.map(e=>e.midi),[65,67,65,67,70]);assert.deepEqual(a.map(e=>e.beats),[1,1,.5,.5,1]);assert.equal(a.length,5);assert.equal(validatePlan(a),4.5);assert(a[0].sourceSlurId&&a.at(-1).sourceSlurId===a[0].sourceSlurId);for(const [i,e] of a.entries()){assert.equal(b[i].midi,e.midi+1);assert.equal(b[i].durationSeconds,e.durationSeconds/2);assert.equal(b[i].sourcePrintedSyllableId,e.sourcePrintedSyllableId);}
});
test('printed group selection neither invents a syllable for an untexted note nor changes whole-word timing guards or Hebrew segmentation',()=>{
 const m=make(),before=JSON.stringify(m.words);assert.throws(()=>m.buildPlan(6,6),/unmeasured small eighth/);const p=m.buildPlan(6,6,{tempo:60,printedSyllableIndex:3});assert.equal(p.length,1);assert.equal(p[0].midi,69);assert.equal(validatePlan(p),1);assert.equal(JSON.stringify(m.words),before);assert.throws(()=>m.buildPlan(6,6,{printedSyllableIndex:4}),/no such printed/);assert.throws(()=>m.buildPlan(0,1,{printedSyllableIndex:1}),/one covered/);assert.throws(()=>m.buildPlan(0,0,{printedSyllableIndex:0}),/positive printed/);assert.throws(()=>createReadingModel(corpus.passage([range])).buildPlan(0,0,{printedSyllableIndex:1}),/No268/);
});
test('repeated assignments retain different printed-syllable occurrence IDs with identical source-note membership',()=>{
 const m=make([{...range,id:'first'},{...range,id:'again'}]),a=m.buildPlan(1,1,{printedSyllableIndex:2}),b=m.buildPlan(40,40,{printedSyllableIndex:2});assert.notEqual(a[0].sourcePrintedSyllableId,b[0].sourcePrintedSyllableId);assert.deepEqual(a.map(e=>e.sourceNoteId),b.map(e=>e.sourceNoteId));assert.deepEqual(m.bounds(1,38,'printed-syllable'),[1,1]);
});
test('source-photo windows identify exact words without assigning glyph bounds, phonemes or Hebrew syllables',()=>{
 const m=make(),r=PRINTED_UNDERLAY_RECORD;
 assert.equal(r.words.length,39);assert.equal(r.words.flatMap(w=>w.units).length,93);
 for(const w of m.words){const s=printedWordStudy(w);assert.equal(s.sourceHebrew,w.sourceHebrew);for(const u of s.units){for(const k of ['sourceUnitGlyphBounds','printedUnicode','phonemes','acceptedMamSyllableMapping','independentReview'])assert.equal(u[k],null);}assert.match(printedWordPhoto(w),/Unicode phonetic transcription and Hebrew syllable fitting unassigned/);}
 assert.equal(printedWordStudy({...m.words[0],sourceHebrew:'changed'}),null);assert.equal(printedWordStudy(null),null);
 const image=readFileSync(new URL('../'+r.source.image,import.meta.url));assert.equal(image.length,r.source.imageBytes);assert.equal(createHash('sha256').update(image).digest('hex'),r.source.imageSha256);
 const old=readFileSync(new URL('../'+r.sourceScoreRecord,import.meta.url));assert.equal(createHash('sha256').update(old).digest('hex'),r.sourceScoreRecordSha256);
});
test('isolated printed-unit exports retain source identity, null fitting, all5 pitches and the separate rest',()=>{
 const m=make(),p=m.buildPlan(1,1,{printedSyllableIndex:2}),unit=printedUnitContext(p),context={tempo:84,title:'Printed source unit',melody:IDELSOHN_SCORE,printedSourceUnit:unit};
 assert.equal(unit.printedOrdinal,2);assert.equal(unit.noteIds.length,5);assert.equal(unit.hebrewSyllableId,null);assert.equal(unit.phonemes,null);assert.equal(printedUnitContext(m.buildPlan(1,1)),null);
 const xml=musicXml(p,m.words,context),encoded=xml.match(/<miscellaneous-field name="tropetrain-metadata">([\s\S]*?)<\/miscellaneous-field>/)[1],metadata=JSON.parse(encoded.replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&'));
 assert.deepEqual(metadata.printedSourceUnit,unit);assert.equal(metadata.events.length,5);assert.equal((xml.match(/<pitch>/g)??[]).length,5);assert.equal((xml.match(/<rest\/>/g)??[]).length,1);
 for(const e of metadata.events){assert.equal(e.sourcePrintedSyllableId,unit.id);assert.equal(e.syllableId,null);assert.equal(e.syllable,null);assert.equal(e.phonemes,null);}
 const bytes=midiFile(p,m.words,context);assert.equal(new TextDecoder().decode(bytes.subarray(0,4)),'MThd');assert(new TextDecoder().decode(bytes).includes(unit.id));
});
