import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import engine from 'web-audio-engine';
import {IDELSOHN_PATTERN_ROW} from '../idelsohn-pattern-data.js';
import {IDELSOHN_PATTERN_ID,idelsohnPatternPlan} from '../idelsohn-patterns.js';
import {allPatternModes,availablePatternModes,patternSource,printedPatternPlan,patternContextChoices,patternEvidence} from '../printed-patterns.js';
import {printedPatternDuration,printedPatternBeats,printedPatternRests,printedRestAt} from '../baer-patterns.js';
import {staffMarkup} from '../staff.js';
import {eventPitchName} from '../score-data.js';
import {validatePlan,soundingNotes} from '../synthesis.js';
import {patternEventDocument} from '../pattern-study-ui.js';
import {renderWav} from '../wav.js';
const record=IDELSOHN_PATTERN_ROW.record,id=s=>'idelsohn1929-267-'+s,plan=(s,opts={})=>printedPatternPlan(id(s),{sourceId:IDELSOHN_PATTERN_ID,tempo:60,...opts}),read=p=>readFileSync(new URL('../'+p,import.meta.url)),close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('No267 keeps all26 indexed groups and every review/word/phoneme/tuning gap explicit',()=>{
 assert.equal(allPatternModes(IDELSOHN_PATTERN_ID).length,26);assert.equal(availablePatternModes(IDELSOHN_PATTERN_ID).length,21);assert.equal(IDELSOHN_PATTERN_ROW.unavailable.length,5);assert.equal(record.notes.length,145);
 assert.equal(record.notes.filter(c=>c.kind==='note').length,138);assert.equal(record.notes.filter(c=>c.kind==='rest').length,7);assert.equal(record.notes.filter(c=>c.quarterBeats===null).length,10);
 for(const f of record.figures)for(const k of ['bibleWordUnderlay','syllableUnderlay','phonemes','actualTuning','sourceRecording','independentReview','modernAccentEquivalent','kinnorEquivalent'])assert.equal(f[k],null);
 for(const m of allPatternModes(IDELSOHN_PATTERN_ID))assert.deepEqual(patternContextChoices(IDELSOHN_PATTERN_ID,m.id),[]);
});
test('all five unresolved figures remain withheld even when unrelated grace/repeat demonstrations are enabled',()=>{
 for(const s of ['shofar-mehuppakh','maarikh-tarha-row3','paseq','jetib','zaqef-gadol']){
  assert.throws(()=>plan(s,{graceDemo:true,repeatDemo:true}),/withheld/);
  assert.equal(patternSource(IDELSOHN_PATTERN_ID,id(s)).record.selectedFigure.status,'pending');
 }
 assert.equal(availablePatternModes(IDELSOHN_PATTERN_ID,{graceDemo:true,repeatDemo:true}).length,21);
});
test('every eligible figure retains exact written pitches and rational timing with no accepted underlay',()=>{
 for(const f of record.figures.filter(f=>f.status==='written-values')){
  const p=idelsohnPatternPlan(f.id,{tempo:60}),notes=f.components.filter(c=>c.kind==='note');close(validatePlan(p),f.printedQuarterBeats);close(printedPatternBeats(p),f.printedQuarterBeats);assert.equal(soundingNotes(p).length,notes.length);
  assert.deepEqual(p.map(e=>e.midi),notes.map(c=>c.midi));assert.deepEqual(p.map(e=>e.sourceWrittenRhythm),notes.map(c=>c.rhythm));assert.deepEqual(p.map(e=>e.sourceQuarterBeatFraction),notes.map(c=>c.quarterBeatFraction));
  for(const e of p)for(const k of ['wordId','sourceWordId','syllableId','syllable','phonemes','independentReview','sourceActualTuning'])assert.equal(e[k],null);
  assert.match(staffMarkup(p,[],0,p.length,{untexted:true}),/no word or syllable underlay/);
 }
});
test('the two definite opening triplets remain exact thirds and the staff closes their brackets and slurs',()=>{
 const p=plan('maqaf-shofar-holekh');assert.deepEqual(p.map(e=>e.beats),[.5,.5,1/3,1/3,1/3,1]);close(printedPatternDuration(p),3);assert.equal(p[4].sourceTupletPhase,'stop');assert.match(staffMarkup(p,[],0,p.length,{untexted:true}),/tuplet-bracket/);
 const z=plan('zarqa');assert.deepEqual(z.map(e=>e.midi),[69,72,74]);assert.equal(z[2].sourceSlurPhase,'stop');assert.match(staffMarkup(z,[],0,z.length,{untexted:true}),/Printed slur; notes remain distinct/);assert.equal(soundingNotes(z).length,3);
});
test('leading and final eighth rests occupy their actual written times without inventing acoustic boundaries',()=>{
 const p=plan('darga-tebir');assert.equal(p[0].startSeconds,.5);close(printedPatternDuration(p),6);assert.equal(printedPatternRests(p).length,2);assert.equal(printedRestAt(p,.25).id,record.figures.find(f=>f.id===id('darga-tebir')).components[0].id);assert.equal(printedRestAt(p,5.75).kind,'rest');assert.equal(printedRestAt(p,.75),null);
 assert.equal(record.figures.filter(f=>f.id===id('darga-tebir')).length,1);assert.match(patternSource(IDELSOHN_PATTERN_ID,id('darga-tebir')).record.selectedFigureContext,/no independent subfigure boundary/);
});
test('accidental scope and sixteenth glyphs retain the literal printed pitch choices',()=>{
 const p=plan('shene-gershin');assert.deepEqual(p.map(eventPitchName),['A4','A4','A4','D5','F5','E5','D5','C♯5','B4']);assert.equal(p[0].sourceRhythm.type,'16th');assert.equal(p[0].sourceWrittenRhythm.type,'sixteenth');assert.equal(p.at(-1).sourcePitch.alter,0);assert(p.at(-1).sourceAccidentalEvidence);
 assert.equal(plan('qadma')[0].midi,70);const q=plan('qarne-fara');assert.deepEqual(q.map(e=>e.midi),[69,77,76,74,73,74,73,70,69,67,70,69,67]);close(printedPatternBeats(q),5.75);assert.match(staffMarkup(q,[],0,q.length,{untexted:true}),/source-slur/);
});
test('the dotted subdivision, Fine and II remain evidence rather than an invented continuation rule',()=>{
 const a=patternSource(IDELSOHN_PATTERN_ID,id('maarikh-tarha-row5')).record.selectedFigure,b=patternSource(IDELSOHN_PATTERN_ID,id('sof-pasuq')).record.selectedFigure;assert.equal(a.sharedSourceGroupId,b.sharedSourceGroupId);assert.equal(b.sourceSeparatorBefore,'printed dotted vertical line');
 assert.equal(patternSource(IDELSOHN_PATTERN_ID,id('sof-parasha')).record.selectedFigure.fineMark.performanceBoundary,null);assert.equal(patternSource(IDELSOHN_PATTERN_ID,id('tebir-II')).record.selectedFigure.afterFineAlternative.automaticContinuation,false);assert.equal(plan('tebir-II').length,4);
});
test('key and tempo change only demonstration pitches and time; pronunciation and range never enter the literal plan',()=>{
 const a=plan('tarsa'),b=plan('tarsa',{transpose:5,tempo:120,pronunciation:'ashkenazic',rangeLow:0,rangeHigh:1});assert.deepEqual(b.map(e=>e.midi),a.map(e=>e.midi+5));assert.deepEqual(b.map(e=>e.beats),a.map(e=>e.beats));assert.deepEqual(b.map(e=>e.startSeconds),a.map(e=>e.startSeconds/2));assert.deepEqual(b.map(e=>e.sourcePitch),a.map(e=>e.sourcePitch));
 for(const opts of [{tempo:0},{tempo:NaN},{transpose:.5},{transpose:37}])assert.throws(()=>plan('zarqa',opts),/Invalid/);
});
test('downloaded event document and original evidence retain source ownership, nulls, and exact crop bytes',()=>{
 const row=patternSource(IDELSOHN_PATTERN_ID,id('sof-pasuq')),p=plan('sof-pasuq'),d=JSON.parse(JSON.stringify(patternEventDocument(row,id('sof-pasuq'),{tempo:60,transpose:0,volume:0,rangeLow:60,rangeHigh:72},p,p)));
 assert.equal(d.source.independentReview,null);assert.equal(d.phonemes,null);assert.equal(d.source.selectedFigure.sourceSeparatorBefore,'printed dotted vertical line');assert.equal(d.sourceCatalog.id,IDELSOHN_PATTERN_ID);assert.equal(d.timingDemonstration,null);assert.equal(d.repeatDemonstration,null);
 assert.deepEqual(Buffer.from(patternEvidence(IDELSOHN_PATTERN_ID,'record').bytes),read('docs/IDELSOHN-NO267-PATTERNS.json'));const image=patternEvidence(IDELSOHN_PATTERN_ID,'columns');assert.equal(image.mime,'image/jpeg');assert.equal(createHash('sha256').update(image.bytes).digest('hex'),record.source.imageSha256);assert.deepEqual(Buffer.from(image.bytes),read(record.source.image));
});
test('the real instrument renderer produces each distinct attack with leading/final rests and the correct total frame count',async()=>{
 const p=plan('darga-row5',{tempo:120}),wav=await renderWav(p,{volume:.1,sampleRate:8000,createContext:(length,rate)=>new engine.OfflineAudioContext(1,length,rate)});assert.equal(wav.frames,10000);assert.equal(wav.bytes,20044);assert(wav.peak>0);const buf=await wav.blob.arrayBuffer(),v=new DataView(buf);for(let i=0;i<1800;i++)assert.equal(v.getInt16(44+i*2,true),0);assert.equal(soundingNotes(p).length,5);
});
test('normal and portable builds embed the exact pinned source record and crop without introducing an unsupported reader preset',()=>{
 for(const file of ['app.bundle.js','TropeTrain.html']){const s=read(file).toString();assert(s.includes(read(record.source.image).toString('base64')));assert(s.includes(read('docs/IDELSOHN-NO267-PATTERNS.json').toString('base64')));}
 const music=read('music.js').toString();assert.equal(music.includes(IDELSOHN_PATTERN_ID),false);assert.match(read('index.html').toString(),/Open Idelsohn No267 instrumental study/);
});
