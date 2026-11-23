import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import engine from 'web-audio-engine';
import {BAER_PATTERN_ROW} from '../baer-pattern-data.js';
import {baerPatternPlan,printedPatternDuration,printedPatternBeats,printedPatternRests} from '../baer-patterns.js';
import {patternContextChoices} from '../printed-patterns.js';
import {staffMarkup} from '../staff.js';
import {printedPatternRange} from '../pattern-range.js';
import {renderWav} from '../wav.js';
import {validatePlan} from '../synthesis.js';
const data=BAER_PATTERN_ROW.record,plan=(id,options={})=>baerPatternPlan(id,{tempo:60,transpose:0,...options});

test('all60 previously published Baer components retain exact IDs, pitches, source values, rests, slurs and tuplets',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(data.notes.slice(0,60))).digest('hex'),'569bf9de5d372768293f9014be1ff4494c426caa2d3659302e8d9bf92a38d658');
 assert.equal(data.revision,3);assert.equal(data.revisionHistory[1].newComponents,63);assert.equal(data.revisionHistory[1].addedFigures.length,8);
 assert.equal(data.notes.filter(n=>n.rhythm.type==='32nd').length,4);
});

test('new literal source examples preserve their unequal written extents without meter padding',()=>{
 const fixtures={
  'mahpakh-pashta-without-zaqef':{midi:[69,62,65,65,69,67,70,69],beats:3},
  'pashta-zaqef-one-word':{midi:[65,72,69,69,67,69,72,69,65],beats:3},
  'merkha-tipha':{midi:[60,67,67,69,62,62],beats:3.5},
  'munah-etnahta':{midi:[62,65,65,62,65,60],beats:2.5},
  'merkha-tevir':{midi:[65,69,67,62,60,62,65],beats:3},
  'qadma-azla':{midi:[65,69,69,69,72,71,74,72],beats:3},
  'azla-geresh':{midi:[65,65,62,64,65,67,69,70,72],beats:3.5},
  'gershayim':{midi:[65,69,72,72,70,69,70,72],beats:5}
 };
 for(const [id,f] of Object.entries(fixtures)){const p=plan(id);assert.deepEqual(p.map(e=>e.midi),f.midi,id);assert.ok(Math.abs(printedPatternBeats(p)-f.beats)<1e-8,id);assert.ok(Math.abs(validatePlan(p)-f.beats)<1e-8,id);}
});

test('five new three-in-two groups retain each literal sixteenth and slur endpoint under independent key and tempo',()=>{
 let groups=0,units=0;
 for(const id of ['pashta-zaqef-one-word','qadma-azla','azla-geresh']){
  const a=plan(id),b=plan(id,{transpose:1,tempo:120});
  for(const [i,e] of a.entries()){
   assert.equal(b[i].midi,e.midi+1);assert.equal(b[i].durationSeconds,e.durationSeconds/2);assert.equal(b[i].sourceTupletId,e.sourceTupletId);assert.equal(b[i].sourceSlurPhase,e.sourceSlurPhase);
   if(e.sourceRhythm.actual===3){units++;assert.equal(e.sourceRhythm.normal,2);assert.equal(e.sourceRhythm.type,'16th');assert.equal(e.beats,1/6);}
   if(e.sourceTupletPhase==='start'){groups++;const peers=a.filter(n=>n.sourceTupletId===e.sourceTupletId);assert.equal(peers.length,3);assert.equal(peers.at(-1).sourceTupletPhase,'stop');}
   for(const field of ['wordId','sourceWordId','syllableId','syllable','phonemes'])assert.equal(e[field],null);
  }
 }
 assert.equal(groups,5);assert.equal(units,15);
});

test('written B-natural cancels the source flat while the single-word condition remains documentary',()=>{
 const n=plan('qadma-azla')[5];assert.equal(n.midi,71);assert.deepEqual(n.sourcePitch,{step:'B',alter:0,octave:4});assert.match(n.sourceAccidentalEvidence,/Printed B-natural/);
 const one=plan('pashta-zaqef-one-word');assert.equal(one[0].sourceCondition.literal,'auf einem Worte');assert.equal(one[0].sourceCondition.modernPredicate,null);assert.equal(Object.isFrozen(one[0].sourceCondition),true);
 assert.deepEqual(patternContextChoices(data.id,'pashta-zaqef-one-word'),[]);
});

test('above and inverted below fermatas preserve unknown hold lengths and their written playback duration',()=>{
 const a=plan('mahpakh-pashta-without-zaqef'),b=plan('pashta-zaqef-one-word');
 assert.deepEqual(a.at(-1).sourceFermata,{shape:'normal',placement:'below',duration:'unspecified'});assert.equal(a.at(-1).beats,.25);
 assert.equal(b.at(-1).sourceFermata.placement,'above');assert.equal(b.at(-1).beats,1/6);assert.ok(Object.isFrozen(a.at(-1).sourceFermata));
 const below=staffMarkup(a,[],0,a.length,{untexted:true}),above=staffMarkup(b,[],0,b.length,{untexted:true});
 assert.match(below,/staff-fermata below/);assert.match(below,/Printed inverted fermata below the staff; hold length unspecified/);assert.match(above,/Printed fermata; hold length unspecified/);
 assert.equal(printedPatternDuration(a),3);assert.ok(Math.abs(printedPatternDuration(b)-3)<1e-8);
});

test('range-guide changes stay advisory while independent transposition moves every source pitch',()=>{
 const p=plan('qadma-azla'),before=JSON.stringify(p),narrow=printedPatternRange(p,60,72),wide=printedPatternRange(p,60,74);
 assert.deepEqual([narrow.status,narrow.min,narrow.max,narrow.below,narrow.above],['outside-guide',65,74,0,1]);assert.equal(wide.status,'within-guide');assert.equal(JSON.stringify(p),before);
 const lower=plan('qadma-azla',{transpose:-2});assert.equal(printedPatternRange(lower,60,72).status,'within-guide');assert.deepEqual(lower.map(e=>e.midi),p.map(e=>e.midi-2));
 assert.equal(printedPatternRange(p,74,60).status,'invalid-guide');assert.equal(printedPatternRange([],60,72).status,'no-pattern');
});

test('new triplet figure audio retains its final source rest as exact digital silence',async()=>{
 const p=plan('azla-geresh'),rest=printedPatternRests(p).at(-1),rate=8000;
 assert.equal(rest.beats,.5);assert.equal(rest.rhythm.type,'eighth');assert.ok(Math.abs(rest.startSeconds-3)<1e-8);
 const output=await renderWav(p,{sampleRate:rate,createContext:(length,rate)=>new engine.OfflineAudioContext(1,length,rate)}),view=new DataView(await output.blob.arrayBuffer());
 assert.equal(output.frames,28000);assert.ok(Array.from({length:3500},(_,i)=>view.getInt16(44+(24500+i)*2,true)).every(v=>v===0));
 assert.ok(Array.from({length:20000},(_,i)=>view.getInt16(44+i*2,true)).some(v=>v!==0));
});
