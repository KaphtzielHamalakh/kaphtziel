import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {BAER_PATTERN_ROW} from '../baer-pattern-data.js';
import {baerPatternPlan,baerPatternWrittenPlan,printedPatternDuration,printedPatternRests,printedRestAt} from '../baer-patterns.js';
import {baerComponentRoutes} from '../baer-notation.js';
import {availablePatternModes,patternEvidence} from '../printed-patterns.js';
import {sourceRepeatBounds,REPEAT_DEMO} from '../source-repeat.js';
import {validatePlan} from '../synthesis.js';
import {staffMarkup} from '../staff.js';
import {patternEventDocument} from '../pattern-study-ui.js';
import {baerPatternSource} from '../baer-patterns.js';
const d=BAER_PATTERN_ROW.record,ids=['pashta-zaqef-after-predecessors','pazer','pazer:lower','shalshelet','qarnei-yerah-pair'];
const plan=(id,options={})=>baerPatternPlan(id,{tempo:60,graceDemo:true,repeatDemo:true,...options});
const close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('the actual download document keeps the literal repeat staff and performed events without self-referencing its initializer',()=>{
 for(const id of ['shalshelet','pazer:lower','qarnei-yerah-pair']){
  const events=plan(id),written=baerPatternWrittenPlan(id,{tempo:60,graceDemo:true}),row=baerPatternSource(id),doc=patternEventDocument(row,id,{tempo:60,transpose:0,volume:0,rangeLow:60,rangeHigh:72},events,written),copy=JSON.parse(JSON.stringify(doc));
  assert.equal(copy.events.length,id==='shalshelet'?41:id==='pazer:lower'?18:25);assert.equal(copy.pronunciation,null);assert.equal(copy.phonemes,null);assert.equal(copy.syllableUnderlay,null);
  if(id==='shalshelet'){assert.equal(copy.sourceWrittenEvents.length,27);assert.equal(copy.source.selectedFigure.repeat.sourceCount,null);assert.equal(copy.repeatDemonstration.passes,2);assert.equal(copy.repeatDemonstration.sourceCount,null);}else{assert.equal(copy.sourceWrittenEvents,null);assert.equal(copy.repeatDemonstration,null);}
 }
});

test('the last four literal figures preserve all229previous components and leave all source review and word fitting unassigned',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(d.notes.slice(0,229))).digest('hex'),'7a94e66c91000c3d0d08ccc79d8f25083c40004b5ae98aea9a4f263f56736c4e');
 assert.equal(d.figures.length,32);assert.equal(d.notes.length,308);assert(d.figures.every(f=>['transcribed','unmeasured-grace'].includes(f.status)));
 assert(d.figures.every(f=>f.review===null&&f.wordApplication===null));assert.equal(d.figures.filter(f=>f.status==='unmeasured-grace').length,5);
});
test('conditional Pashta retains the separate slashed small G4 between measured A4 and F4',()=>{
 const p=plan(ids[0]);assert.deepEqual(p.map(e=>e.midi),[65,72,67,69,67,65]);assert.deepEqual(p.map(e=>e.sourceGrace?null:e.beats),[.5,1,.5,.5,null,.5]);assert.equal(p[4].sourceGrace.slash,true);assert.equal(p[4].sourceGrace.printedBeams,1);close(printedPatternDuration(p),3.08);
 assert.match(staffMarkup(p,[],0,p.length,{untexted:true}),/grace-slash/);
});
test('Pazer keeps three distinct triplets, two unmeasured graces and two monophonic alternatives',()=>{
 const a=plan('pazer'),b=plan('pazer:lower');assert.equal(a.length,18);assert.equal(b.length,18);assert.deepEqual(a.map(e=>e.midi),[65,65,67,69,70,72,74,76,77,74,72,76,74,72,70,72,70,72]);
 assert.deepEqual(b.map(e=>e.midi),a.map((e,i)=>i===15?67:e.midi));assert.equal(a.filter(e=>e.sourceRhythm.actual===3).length,9);assert.equal(a.filter(e=>e.sourceGrace).length,2);assert.equal(a[0].sourceRhythm.type,'16th');assert.equal(a.at(-1).sourceRhythm.dots,1);close(printedPatternDuration(a),4.16);close(printedPatternDuration(b),4.16);
 assert.equal(a.filter(e=>b.some(n=>n.id===e.id)).length,17);assert.notEqual(a[15].id,b[15].id);assert.equal(a[1].sourceSlurs[0].phase,'start');assert.equal(a.at(-1).sourceSlurs[0].phase,'stop');
});
test('Shalshelet keeps the literal27components, both repeat boundaries, B natural, final triplet, three graces and fermata',()=>{
 const p=baerPatternWrittenPlan('shalshelet',{tempo:60,graceDemo:true}),f=d.figures.find(f=>f.id==='shalshelet');assert.equal(p.length,27);assert.equal(f.repeat.sourceCount,null);
 assert.deepEqual(p.map(e=>e.midi),[65,65,65,67,69,70,72,74,76,77,74,76,74,72,71,72,65,67,69,67,69,67,65,64,62,67,65]);
 assert.equal(p[2].sourceRepeatStart.id,f.repeat.id);assert.equal(p[15].sourceRepeatEnd.id,f.repeat.id);assert.equal(p[14].sourcePitch.alter,0);assert.match(p[14].sourceAccidentalEvidence,/natural/);assert.equal(p[15].sourceFermata.duration,'unspecified');assert.equal(p.filter(e=>e.sourceGrace).length,3);assert(p[25].sourceGrace.slash);assert.deepEqual(p.filter(e=>e.sourceRhythm.actual===3).map(e=>e.sourceComponentNumber),[23,24,25]);close(printedPatternDuration(p),8.24);
 const svg=staffMarkup(p,[],0,p.length,{untexted:true});assert.equal((svg.match(/data-repeat-direction=/g)??[]).length,2);assert.match(svg,/numeric count unspecified/);assert.match(svg,/Printed fermata/);assert.equal((svg.match(/data-event=/g)??[]).length,27);
});
test('an explicit original repeat choice unfolds only the marked section with unique occurrence IDs and exact source references',()=>{
 assert.throws(()=>baerPatternPlan('shalshelet',{graceDemo:true}),/two-pass repeat/);assert(!availablePatternModes(d.id,{graceDemo:true}).some(m=>m.id==='shalshelet'));assert(availablePatternModes(d.id,{graceDemo:true,repeatDemo:true}).some(m=>m.id==='shalshelet'));
 const p=plan('shalshelet');assert.equal(p.length,41);assert.equal(new Set(p.map(e=>e.id)).size,41);assert.equal(p.filter(e=>e.repeatPass===1).length,14);assert.equal(p.filter(e=>e.repeatPass===2).length,14);assert.equal(p.filter(e=>e.sourceGrace).length,5);close(printedPatternDuration(p),12.4);close(validatePlan(p),12.4);
 assert.deepEqual(p.slice(2,16).map(e=>e.sourceComponentId),p.slice(16,30).map(e=>e.sourceComponentId));assert(p.slice(2,30).every(e=>e.sourceRepeat.sourceCount===null&&e.performanceRepeat.id===REPEAT_DEMO.id&&e.performanceRepeat.sourceCount===null&&e.performanceRepeat.review===null));assert.equal(p[30].sourceComponentNumber,17);assert.equal(p.at(-1).sourceComponentNumber,27);
});
test('source repeat validation rejects invented counts, absent boundaries and split grace groups',()=>{
 const f=d.figures.find(f=>f.id==='shalshelet'),c=d.notes.filter(n=>n.cell===f.id);
 for(const repeat of [{...f.repeat,sourceCount:2},{...f.repeat,startComponentId:'missing'},{...f.repeat,endComponentId:c[11].id},{...f.repeat,endComponentId:c[10].id}])assert.throws(()=>sourceRepeatBounds(c,repeat),/source repeat/);
 assert.deepEqual(sourceRepeatBounds(c,f.repeat),{start:2,end:15});assert.equal(baerComponentRoutes(d,f,{allowUnmeasuredGrace:true})[0].components.length,27);
});
test('the rare-sign pair keeps its leading and interior eighth rests, small32nds and final slashed grace without inferred Hebrew underlay',()=>{
 const p=plan('qarnei-yerah-pair');assert.equal(p.length,25);assert.deepEqual(p.map(e=>e.midi),[65,65,67,65,64,65,67,64,60,69,67,65,67,65,64,65,69,60,65,67,69,67,65,67,65]);assert.equal(p.filter(e=>e.sourceGrace).length,3);assert.deepEqual(p.filter(e=>e.sourceGrace).map(e=>e.sourceRhythm.type),['32nd','32nd','eighth']);assert.equal(printedPatternRests(p).length,2);assert.equal(printedRestAt(p,.1).sourceComponentNumber,1);close(printedPatternDuration(p),9.24);assert.equal(p.at(-1).sourceSlurs[0].phase,'stop');assert.equal(p[11].sourceSlurs[0].phase,'start');assert(p.every(e=>e.wordId===null&&e.syllable===null&&e.phonemes===null));
 const ev=patternEvidence(d.id,'columns','qarnei-yerah-pair');assert.equal(ev.name,'baer-no105-rare-first-detail.png');assert.equal(ev.bytes.length,209252);assert.match(d.figures.find(f=>f.id==='qarnei-yerah-pair').contextPending,/Numbers35:5/);
});
test('tempo, transposition and pronunciation stay independent across every new route, with80msgraces and unknown source timing exact',()=>{
 const before=JSON.stringify(d);
 for(const id of ids){const a=plan(id),b=plan(id,{tempo:120,transpose:2,pronunciation:'unused',rangeLow:1,rangeHigh:2});for(const [i,n]of a.entries()){
  assert.equal(b[i].id,n.id);assert.equal(b[i].midi,n.midi+2);assert.deepEqual(b[i].sourcePitch,n.sourcePitch);assert.deepEqual(b[i].sourceRhythm,n.sourceRhythm);if(n.sourceGrace){assert.equal(b[i].durationSeconds,.08);assert.equal(b[i].sourceQuarterBeats,null);assert.equal(b[i].sourceGrace.duration,null);}else close(b[i].durationSeconds,n.durationSeconds/2);
  for(const k of ['wordId','sourceWordId','syllableId','syllable','phonemes'])assert.equal(b[i][k],null);
 }close(validatePlan(b),printedPatternDuration(b));}
 assert.equal(JSON.stringify(d),before);
});
test('muted playback visits both repeat passes while mapping repeated notes to the same literal staff ID',async t=>{
 let clock=0,player;const old=globalThis.cancelAnimationFrame;globalThis.cancelAnimationFrame=()=>{};t.after(()=>{player?.stop();if(old===undefined)delete globalThis.cancelAnimationFrame;else globalThis.cancelAnimationFrame=old;});
 const {Player}=await import('../audio.js'),p=plan('shalshelet'),seen=[];player=new Player(e=>seen.push([e.id,e.sourceComponentId,e.repeatPass??null]),()=>seen.push('finished'),null,{wallClock:()=>clock});player.setVolume(0);await player.play(p,false);
 for(const e of p){clock=player.start+e.startSeconds+e.durationSeconds/2;player.paint();}clock=player.start+12.5;player.paint();assert.deepEqual(seen,[...p.map(e=>[e.id,e.sourceComponentId,e.repeatPass??null]),'finished']);assert.equal(player.context,undefined);
});
