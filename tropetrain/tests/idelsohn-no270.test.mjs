import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {NO270_RECORD as record} from '../idelsohn-no270-data.js';
import {IDELSOHN_NO270,no270ScoreWord} from '../idelsohn-no270-score.js';
import {getCorpus} from '../library.js';import {createReadingModel} from '../music.js';
import {musicXml,midiFile,MIDI_PPQ} from '../music-exports.js';import {staffMarkup} from '../staff.js';
import {validatePlan,instrumentForPlan} from '../synthesis.js';
const corpus=await getCorpus(),range={id:'no270-test',bookId:'gen',start:{chapter:25,verse:19},end:{chapter:25,verse:20}},passage=corpus.passage([range]),model=createReadingModel(passage,{melodyId:IDELSOHN_NO270.id});
const plan=(options={})=>model.buildPlan(0,26,{tempo:60,transpose:0,...options}),context={title:'No270 literal candidate',tempo:60,melody:IDELSOHN_NO270};
test('No270 retains two complete canonical verses, all75 note candidates/60 group indices and all unknown review/phoneme fields',()=>{
 assert.deepEqual(model.words.map(w=>[w.sourceWordId,w.sourceHebrew]),record.words.map(w=>[w.id,w.sourceHebrew]));assert.equal(model.words.length,27);assert.equal(record.components.length,75);assert.equal(record.words.reduce((n,w)=>n+w.printedUnits.length,0),60);
 const p=plan();assert.equal(p.length,75);assert.equal(new Set(p.map(e=>e.sourceWordId)).size,27);
 for(const e of p){assert.equal(e.syllableId,null);assert.equal(e.syllable,null);assert.equal(e.phonemes,null);assert.equal(e.sourceWordCorrespondence.acceptedSyllableMapping,null);assert.equal(e.sourceWordCorrespondence.independentReview,null);assert.equal(e.sourceWordCorrespondence.acceptedPhonemes,null);assert(e.sourceLatinIndexReading);}
 for(const k of ['review','acceptedSyllableMapping','phonemes','singingVoice','completeTraditionGrammar','kinnorPreset'])assert.equal(record[k],null);
 assert.equal(IDELSOHN_NO270.coverage.length,27);assert(!IDELSOHN_NO270.coverage.includes('gen-24-49-1'));
});
test('literal head positions and explicit source crosses preserve nominal quarter steps and candidate carry without conventional double-sharp substitution',()=>{
 const p=plan();assert.deepEqual(p.filter(e=>!Number.isInteger(e.midi)).map(e=>[e.sourceNoteId,e.midi]),[['idelsohn270-c30',67.5],['idelsohn270-c34',67.5],['idelsohn270-c50',67.5]]);
 assert.deepEqual(p.slice(0,7).map(e=>e.midi),[72,69,67,65,67,69,69]);assert.deepEqual(p.slice(0,7).map(e=>e.beats),[.5,.75,.25,.25,.25,.5,.75]);
 assert.equal(p[26].midi,71);assert.equal(p[33].sourceAccidentalOrigin,'candidate-carry-from-component-30');assert.equal(p[38].midi,67);assert.equal(p[42].midi,71);assert.equal(p[46].midi,71);assert.equal(p[50].midi,67);assert.equal(p.at(-1).midi,69);assert.equal(p.at(-1).beats,2);
 assert.equal(instrumentForPlan(p).tuningReview,null);assert.match(instrumentForPlan(p).tuning,/24-TET/);assert.equal(record.pitchReading.actualHistoricalTuning,null);
});
test('complete written clocks, source system breaks and cross-word tuplets never merge words or add rests/ornament timing',()=>{
 const p=plan(),first=model.buildPlan(0,8,{tempo:60,transpose:0});assert.equal(first.length,24);assert(Math.abs(validatePlan(first)-12.5)<1e-10);assert(Math.abs(validatePlan(p)-41.75)<1e-10);
 for(const ids of [[26,27,28],[31,32,33],[39,40,41],[68,69,70]]){const group=ids.map(i=>p[i-1]);assert(group.every(e=>e.sourceRhythm.actual===3&&e.sourceRhythm.normal===2));assert(Math.abs(group.reduce((n,e)=>n+e.beats,0)-1)<1e-10);assert.equal(new Set(group.map(e=>e.wordId)).size>1,ids[0]!==68);}
 for(const i of [18,56]){assert.equal(p[i-1].wordId,p[i].wordId);assert.equal(p[i].startSeconds,p[i-1].startSeconds+p[i-1].durationSeconds);}
 assert(p.every(e=>!e.sourceRestsBefore&&!e.sourceRestsAfter&&!e.sourceGrace&&!e.sourceFermata));
});
test('semitone transposition changes every quarter pitch equally, tempo changes clocks only, and repeated assignments retain distinct occurrence IDs',()=>{
 const base=plan(),up=plan({transpose:1}),fast=plan({tempo:120});assert.deepEqual(up.map(e=>e.midi),base.map(e=>e.midi+1));assert.deepEqual(up.map(e=>[e.id,e.syllable,e.durationSeconds,e.sourceWordId]),base.map(e=>[e.id,e.syllable,e.durationSeconds,e.sourceWordId]));assert.deepEqual(fast.map(e=>e.midi),base.map(e=>e.midi));assert.deepEqual(fast.map(e=>e.durationSeconds),base.map(e=>e.durationSeconds/2));
 const repeated=createReadingModel(corpus.passage([{...range,id:'a'},{...range,id:'b'}]),{melodyId:IDELSOHN_NO270.id}),p=repeated.buildPlan(0,53,{tempo:60,transpose:0});assert.equal(p.length,150);assert.equal(new Set(p.map(e=>e.id)).size,150);assert.equal(new Set(repeated.words.map(w=>w.id)).size,54);assert(Math.abs(validatePlan(p)-83.5)<1e-9);
});
test('notation and MIDI retain all source components and fractional pitches, with no accepted syllable or singing claims',()=>{
 const p=plan(),xml=musicXml(p,model.words,context);assert.equal((xml.match(/<note id=/g)||[]).length,75);assert.equal((xml.match(/<accidental>quarter-sharp/g)||[]).length,3);assert.equal((xml.match(/<time-modification>/g)||[]).length,12);assert.equal((xml.match(/<slur type="start"/g)||[]).length,4);assert.match(xml,/unreviewed-source-Latin-group-index/);
 const svg=Array.from({length:7},(_,i)=>staffMarkup(p,model.words,i*12,12)).join('');assert.equal((svg.match(/class="staff-note"/g)||[]).length,75);assert.equal((svg.match(/\ue282/g)||[]).length,3);assert(!svg.includes('undefined'));
 const bytes=midiFile(p,model.words,context);let at=22,tick=0,bend=8192;const heard=[];const v=()=>{let n=0,b;do{b=bytes[at++];n=n*128+(b&127);}while(b&128);return n;};while(at<bytes.length){tick+=v();const status=bytes[at++];if(status===255){at++;const length=v();at+=length;}else{const a=bytes[at++],b=bytes[at++];if(status===0xe0)bend=a+b*128;if(status===0x90)heard.push({midi:a+(bend-8192)/4096,tick});}}assert.deepEqual(heard,p.map(e=>({midi:e.midi,tick:Math.round(e.startBeat*MIDI_PPQ)})));assert.equal(bend,8192);
});
test('changed marked Hebrew is refused and the exact primary crop and all source/compiler pins remain reproducible',()=>{
 const w=model.words[0];assert.equal(no270ScoreWord({...w,sourceHebrew:w.sourceHebrew.replace(/\u059b/u,'')}),null);
 const sha=b=>createHash('sha256').update(b).digest('hex');for(const pin of record.inputs)assert.equal(sha(readFileSync(new URL('../'+pin.path,import.meta.url))),pin.sha256,pin.path);
 assert.equal(record.source.sourceLocalityLabel,'Gibraltar');assert.match(record.pitchReading.accidentalCarryPolicy,/Candidate/);assert.match(record.words[0].printedUnitReading,/unreviewed/);
});
