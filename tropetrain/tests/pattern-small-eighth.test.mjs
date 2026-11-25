import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import engine from 'web-audio-engine';
import {IDELSOHN_PATTERN_ROW} from '../idelsohn-pattern-data.js';
import {IDELSOHN_PATTERN_ID} from '../idelsohn-patterns.js';
import {availablePatternModes,allPatternModes,printedPatternPlan,patternSource} from '../printed-patterns.js';
import {PATTERN_SMALL_EIGHTH_STUDY,hasPatternSmallEighthStudy,patternSmallEighthTiming,validatePatternSmallEighthEvent} from '../source-pattern-small-eighth.js';
import {SMALL_EIGHTH_STUDY,validateSmallEighthEvent} from '../source-small-eighth.js';
import {eventRhythm} from '../score-data.js';
import {staffMarkup} from '../staff.js';
import {patternEventDocument} from '../pattern-study-ui.js';
import {validatePlan,soundingNotes} from '../synthesis.js';
import {renderWav} from '../wav.js';
const id=s=>'idelsohn1929-267-'+s,record=IDELSOHN_PATTERN_ROW.record,figure=s=>record.figures.find(f=>f.id===id(s)),build=(s,o={})=>printedPatternPlan(id(s),{sourceId:IDELSOHN_PATTERN_ID,tempo:84,smallPatternDemo:true,...o}),copy=structuredClone,near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const original=JSON.stringify(record);
test('only two exact pending figures gain an explicit original timing option; default21 and all5 historical gaps remain unchanged',()=>{
 assert.equal(availablePatternModes(IDELSOHN_PATTERN_ID).length,21);assert.equal(availablePatternModes(IDELSOHN_PATTERN_ID,{smallPatternDemo:true}).length,23);assert.equal(allPatternModes(IDELSOHN_PATTERN_ID).length,26);
 assert.equal(record.figures.filter(f=>f.status==='pending').length,5);
 for(const s of ['paseq','jetib'])for(const flag of [undefined,false,1,'true'])assert.throws(()=>build(s,{smallPatternDemo:flag,graceDemo:true,repeatDemo:true}),/withheld/);
 for(const s of ['shofar-mehuppakh','maarikh-tarha-row3','zaqef-gadol'])assert.throws(()=>build(s,{graceDemo:true,repeatDemo:true}),/withheld/);
 assert.equal(JSON.stringify(record),original);
});
test('both original studies keep three distinct source attacks, printed slur, measured eighths and null historical small-note duration',()=>{
 for(const [s,pitches]of [['paseq',[69,74,69]],['jetib',[74,74,69]]]){
  const p=build(s);assert.deepEqual(p.map(e=>e.midi),pitches);assert.equal(soundingNotes(p).length,3);assert.equal(p[1].sourceSlurs[0].phase,'start');assert.equal(p[2].sourceSlurs[0].phase,'stop');
  assert.deepEqual(p.map(e=>e.sourceQuarterBeatFraction),[{numerator:1,denominator:2},{numerator:1,denominator:2},null]);assert.deepEqual(p.map(e=>e.sourceWrittenRhythm),figure(s).components.map(c=>c.rhythm));
  near(p[0].durationSeconds,30/84);near(p[1].durationSeconds,30/84);assert.equal(p[2].durationSeconds,.08);near(validatePlan(p),60/84+.08);assert.equal(p[2].sourceQuarterBeats,null);assert.equal(p[2].sourcePatternSmallEighth.role,null);assert.deepEqual(p[2].performanceTiming,PATTERN_SMALL_EIGHTH_STUDY);validatePatternSmallEighthEvent(p[2]);
  for(const e of p)for(const k of ['wordId','sourceWordId','syllableId','syllable','phonemes','independentReview','sourceActualTuning'])assert.equal(e[k],null);
 }
 assert.equal(JSON.stringify(record),original);
});
test('user tempo scales measured values while80ms stays fixed; key shifts only sounding pitch and pronunciation/range never enter source timing',()=>{
 const a=build('jetib'),b=build('jetib',{tempo:168,transpose:5,pronunciation:'ashkenazic',rangeLow:0,rangeHigh:1});assert.deepEqual(b.map(e=>e.midi),a.map(e=>e.midi+5));assert.deepEqual(b.map(e=>e.sourcePitch),a.map(e=>e.sourcePitch));near(b[0].durationSeconds,a[0].durationSeconds/2);near(b[1].durationSeconds,a[1].durationSeconds/2);assert.equal(b[2].durationSeconds,.08);near(validatePlan(b),60/168+.08);validatePatternSmallEighthEvent(b[2]);
 for(const o of [{tempo:0},{tempo:NaN},{transpose:.5},{transpose:37}])assert.throws(()=>build('paseq',o),/Invalid/);
});
test('source eligibility refuses changed pitch, duration, glyph, slur, count, source page, tuplets and claimed review instead of broadening to other figures',()=>{
 assert(!hasPatternSmallEighthStudy(figure('zarqa')));assert(!hasPatternSmallEighthStudy(null));
 for(const change of [f=>f.components[2].midi++,f=>f.components[2].printedSmallNote.sourceDuration=.08,f=>f.components[0].quarterBeats=.25,f=>f.components[2].rhythm.type='quarter',f=>f.components[1].slurs[0].phase='end',f=>f.components.pop(),f=>f.components[2].sourcePdfPage=105,f=>f.unresolvedTuplet={printedNumber:3},f=>f.independentReview='accepted',f=>f.components[2].printedSmallNote.role='grace',f=>f.components[2].printedSmallNote.extra=true]){const f=copy(figure('paseq'));change(f);assert.throws(()=>hasPatternSmallEighthStudy(f),/source|small-note/);}
 const f=figure('paseq');assert.throws(()=>patternSmallEighthTiming(f,f.components[2],{tempo:84}),/withheld/);assert.throws(()=>patternSmallEighthTiming(f,{...f.components[2]},{tempo:84,smallPatternDemo:true}),/component/);
});
test('rendering guard rejects source/word/role/timing forgeries and the No268 timing flag cannot certify a No267 small note',()=>{
 const good=build('paseq')[2];
 for(const change of [e=>e.sourceProfile='idelsohn-1929-vol5-no268',e=>e.sourceCell=id('jetib'),e=>e.wordId='gen-1-1-1',e=>e.syllable='אָ',e=>e.phonemes=['a'],e=>e.sourcePatternSmallEighth.role='grace',e=>e.sourceQuarterBeats=.5,e=>e.sourceQuarterBeatFraction={numerator:1,denominator:2},e=>e.sourceWrittenRhythm.type='quarter',e=>e.sourceRhythm.actual=3,e=>e.sourcePitch.step='B',e=>e.durationSeconds=.1,e=>e.performanceTiming={...SMALL_EIGHTH_STUDY},e=>e.sourceSlurs[0].phase='start',e=>e.sourceGrace={}]){const e=copy(good);change(e);assert.throws(()=>eventRhythm(e),/pattern|Pattern/);}
 assert.throws(()=>validateSmallEighthEvent(good),/small eighth|Small-eighth/);assert.notEqual(PATTERN_SMALL_EIGHTH_STUDY.id,SMALL_EIGHTH_STUDY.id);assert.equal(JSON.stringify(record),original);
});
test('staff keeps the final small eighth and source slur without calling its unknown role a grace or assigning lyrics',()=>{
 for(const s of ['paseq','jetib']){const p=build(s),svg=staffMarkup(p,[],0,3,{untexted:true});assert.equal((svg.match(/class="staff-note"/g)||[]).length,3);assert(svg.includes('data-source-timing="unmeasured-small-eighth"'));assert(svg.includes('unmeasured printed small eighth; original 80 ms study; source role unspecified'));assert(svg.includes('Printed slur; notes remain distinct'));assert(svg.includes('study 80 ms'));assert(!svg.includes('unmeasured printed grace'));assert(svg.includes('no word or syllable underlay'));assert.equal(eventRhythm(p[2]).type,'eighth');}
});
test('pattern JSON separates original timing from the unchanged pending source, independent controls and null pronunciation/voice fitting',()=>{
 const p=build('paseq'),d=patternEventDocument(patternSource(IDELSOHN_PATTERN_ID,id('paseq')),id('paseq'),{tempo:84,transpose:0,volume:0,rangeLow:60,rangeHigh:72},p,p);
 assert.equal(d.source.selectedFigure.status,'pending');assert.equal(d.source.selectedFigure.components[2].quarterBeats,null);assert.equal(d.timingDemonstration,null);assert.equal(d.repeatDemonstration,null);assert.deepEqual(d.smallEighthTimingDemonstration,PATTERN_SMALL_EIGHTH_STUDY);for(const k of ['pronunciation','phonemes','syllableUnderlay'])assert.equal(d[k],null);assert.equal(d.events[2].sourcePatternSmallEighth.role,null);assert.equal(d.events[2].sourceQuarterBeatFraction,null);assert.equal(JSON.stringify(record),original);
});
test('real instrument rendering retains both measured intervals and the last80ms at different tempos without merging repeatedD5 attacks',async()=>{
 for(const tempo of [84,168]){const p=build('jetib',{tempo}),wav=await renderWav(p,{volume:.1,sampleRate:8000,createContext:(length,rate)=>new engine.OfflineAudioContext(1,length,rate)});assert.equal(wav.frames,Math.ceil((60/tempo+.08)*8000));assert(wav.peak>0);assert.equal(soundingNotes(p).length,3);const bytes=await wav.blob.arrayBuffer(),view=new DataView(bytes);let energy=0;const start=Math.ceil(60/tempo*8000)+40;for(let n=start;n<Math.min(wav.frames,start+400);n++)energy+=Math.abs(view.getInt16(44+n*2,true));assert(energy>0,'the final small eighth must sound rather than become an empty gap');}
});
