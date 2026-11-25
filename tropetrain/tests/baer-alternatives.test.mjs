import {restoredPortableHtml} from './portable-artifact.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import engine from 'web-audio-engine';
import {BAER_PATTERN_ROW} from '../baer-pattern-data.js';
import {baerComponentRoutes} from '../baer-notation.js';
import {baerPatternPlan,printedPatternBeats,printedPatternRests,printedRestAt} from '../baer-patterns.js';
import {patternEvidence,patternContextChoices} from '../printed-patterns.js';
import {validatePlan,soundingNotes} from '../synthesis.js';
import {staffMarkup} from '../staff.js';
import {renderWav} from '../wav.js';
const data=BAER_PATTERN_ROW.record,plan=(id,options={})=>baerPatternPlan(id,{tempo:60,transpose:0,...options});
const modes=['segol','segol:lower','munah-before-merkha-tevir','telisha-gedola','darga-tevir','darga-tevir:lower','merkha-kefula'];

test('all123 prior Baer components remain exact while the original primary preface supplies a separate source for alternatives',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(data.notes.slice(0,123))).digest('hex'),'5ca568e983c9c011d137220daed66be158d1a89aec4355d860d472038918b3d2');
 const p=data.notationPrinciple.source,raw=readFileSync(new URL('../'+p.file,import.meta.url)),evidence=patternEvidence(data.id,'preface','segol');
 assert.equal(raw.length,268701);assert.equal(createHash('sha256').update(raw).digest('hex'),'17ac5b0858a3b07f54fc2abfd2ce18ee8e3b70639e32733936704b0b046b2531');
 assert.deepEqual(Buffer.from(evidence.bytes),raw);assert.equal(evidence.mime,'image/png');assert.equal(data.notationPrinciple.sourcePage,'IX');
 assert.match(data.notationPrinciple.literalGerman,/zwei verschiedene Weisen/);assert.equal(data.notationPrinciple.musicalReview,null);
 for(const n of ['app.bundle.js','TropeTrain.html'])assert.ok(restoredPortableHtml(readFileSync(new URL('../'+n,import.meta.url),'utf8')).includes(raw.toString('base64')));
});

test('Segol keeps two monophonic stem-lines and shared physical heads without merging them into a chord or composite melody',()=>{
 const a=plan('segol'),b=plan('segol:lower');
 assert.deepEqual(a.map(e=>e.midi),[67,67,65,69,67]);assert.deepEqual(a.map(e=>e.beats),[1,.5,.5,.5,.5]);
 assert.deepEqual(b.map(e=>e.midi),[67,60,69,65]);assert.deepEqual(b.map(e=>e.beats),[1,.5,.5,1]);
 assert.equal(a[0].id,b[0].id);assert.equal(a[3].id,b[2].id);assert.equal(a[0].sourceVariant.id,'upper');assert.equal(b[0].sourceVariant.id,'lower');
 assert.equal(printedPatternBeats(a),3);assert.equal(printedPatternBeats(b),3);
 assert.deepEqual(patternContextChoices(data.id,'segol:lower')[0].ids,['segolta']);
 for(const route of [a,b])for(let i=1;i<route.length;i++)assert.equal(route[i].startSeconds,route[i-1].startSeconds+route[i-1].durationSeconds);
});

test('Darga alternatives retain their common phrase, exact sixteenth rest and explicit G4 or D4 head before Tevir',()=>{
 const a=plan('darga-tevir'),b=plan('darga-tevir:lower');
 assert.deepEqual(a.map(e=>e.midi),[65,72,70,69,67,65,69,67,67,62,60,62,65]);
 assert.deepEqual(b.map(e=>e.midi),[65,72,70,69,67,65,69,67,62,62,60,62,65]);
 assert.deepEqual(a.map(e=>e.beats),[.25,.5,.25,.25,.25,.25,.5,.5,.25,1,.25,.25,.5]);
 assert.equal(printedPatternBeats(a),5.25);assert.equal(printedPatternBeats(b),5.25);
 const rest=printedPatternRests(a)[0];assert.equal(rest.startSeconds,2.75);assert.equal(rest.beats,.25);assert.equal(rest.rhythm.type,'16th');
 assert.equal(printedRestAt(a,2.8).id,rest.id);assert.equal(printedRestAt(a,3),null);assert.equal(a[8].startSeconds,3);
 assert.equal(b[8].startSeconds,3);assert.notEqual(a[8].id,b[8].id);assert.equal(a[9].id,b[9].id);
});

test('Munah before Mercha or Tevir keeps the source triplet, B-flat, slur and same-pitch tie as different musical facts',()=>{
 const p=plan('munah-before-merkha-tevir'),attacks=soundingNotes(p);
 assert.deepEqual(p.map(e=>e.midi),[65,70,69,67,67]);assert.deepEqual(p.map(e=>e.beats),[1,1/3,1/3,1/3,2]);
 assert.equal(p.filter(e=>e.sourceRhythm.actual===3).length,3);assert.equal(p[1].sourceTupletPhase,'start');assert.equal(p[3].sourceTupletPhase,'stop');
 assert.equal(p[3].tieStart,true);assert.equal(p[4].tieStop,true);assert.equal(p[3].tieId,p[4].tieId);assert.equal(attacks.length,4);
 assert.ok(Math.abs(attacks.at(-1).durationSeconds-7/3)<1e-8);assert.ok(Math.abs(validatePlan(p)-4)<1e-8);
 const svg=staffMarkup(p,[],0,p.length,{untexted:true});assert.match(svg,/Tie: hold the same pitch/);assert.match(svg,/Printed slur; notes remain distinct/);assert.match(svg,/3:2/);
});

test('Telisha gedola retains the leading sixteenth rest, both dotted eighths and the complete seven-note ending slur',()=>{
 const p=plan('telisha-gedola');assert.equal(p.length,12);assert.equal(p[0].startSeconds,.25);assert.equal(printedPatternBeats(p),5.5);
 assert.deepEqual(p.map(e=>e.midi),[65,65,65,65,65,65,67,69,67,65,67,65]);
 assert.deepEqual(p.map(e=>e.beats),[.25,.5,.75,.25,1,.75,.25,.5,.25,.25,.25,.25]);
 assert.equal(printedPatternRests(p)[0].rhythm.type,'16th');assert.equal(p[5].sourceSlurs[0].phase,'start');assert.equal(p.at(-1).sourceSlurs[0].phase,'stop');
 assert.equal(p.filter(e=>e.sourceSlurs?.length).length,7);assert.equal(p.some(e=>e.sourceGrace||e.sourceRhythm.type==='32nd'),false);
});

test('Mercha kefula keeps three printed 3/4 bars, B-flats and all three nested source slurs without inventing a hold or repeat',()=>{
 const p=plan('merkha-kefula');assert.deepEqual(p.map(e=>e.midi),[70,69,67,69,70,72,74,72,69,72,70,67]);
 assert.deepEqual(p.map(e=>e.beats),[.75,.25,.75,.25,.75,.25,1,1,1,1,1,1]);assert.equal(printedPatternBeats(p),9);
 for(const bar of [1,2,3])assert.equal(p.filter(e=>e.sourceBar===bar).reduce((s,e)=>s+e.beats,0),3);
 const arcs=p.flatMap(e=>e.sourceSlurs??[]);assert.equal(new Set(arcs.map(a=>a.id)).size,3);assert.equal(arcs.filter(a=>a.phase==='start').length,3);
 assert.equal((staffMarkup(p,[],0,p.length,{untexted:true}).match(/data-source-slur=/g)||[]).length,3);
 assert.equal(soundingNotes(p).length,12);assert.ok(Object.isFrozen(p[0].sourceSlurs));assert.ok(Object.isFrozen(p[0].sourceSlurs[0]));
});

test('new source routes remain independent of pronunciation, range and tempo while transposition moves every pitch consistently',()=>{
 for(const id of modes){
  const a=plan(id),b=plan(id,{tempo:120,transpose:2,rangeLow:10,rangeHigh:20,pronunciation:'unused'});
  for(const [i,e] of a.entries()){
   assert.equal(b[i].id,e.id);assert.equal(b[i].midi,e.midi+2);assert.equal(b[i].durationSeconds,e.durationSeconds/2);assert.equal(b[i].startSeconds,e.startSeconds/2);
   assert.deepEqual(b[i].sourcePitch,e.sourcePitch);assert.deepEqual(b[i].sourceRhythm,e.sourceRhythm);assert.deepEqual(b[i].sourceVariant,e.sourceVariant);
   for(const key of ['wordId','sourceWordId','syllableId','syllable','phonemes'])assert.equal(e[key],null);
  }
 }
});

test('source route validation rejects dropped, duplicated, foreign, unmeasured and falsely tied components rather than manufacturing a melody',()=>{
 const f=data.figures.find(f=>f.id==='segol'),clone=()=>structuredClone(f);
 let v=clone();v.variants[0].componentIds[0]='not-a-source-component';assert.throws(()=>baerComponentRoutes(data,v),/missing or different/);
 v=clone();v.variants[0].componentIds.push(v.variants[0].componentIds[0]);assert.throws(()=>baerComponentRoutes(data,v),/each component once/);
 v=clone();v.variants[1].componentIds.pop();assert.throws(()=>baerComponentRoutes(data,v),/omitted/);
 const tied=structuredClone(data),mf=tied.figures.find(f=>f.id==='munah-before-merkha-tevir'),tail=tied.notes.find(n=>n.cell===mf.id&&n.tie?.phase==='stop');tail.midi=69;
 assert.throws(()=>baerComponentRoutes(tied,mf),/adjacent equal pitches/);
 const unmeasured=structuredClone(data);unmeasured.notes.find(n=>n.cell===f.id).quarterBeats=null;assert.throws(()=>baerComponentRoutes(unmeasured,f),/explicit timing evidence/);
 const slur=structuredClone(data),t=slur.figures.find(f=>f.id==='telisha-gedola');slur.notes.findLast(n=>n.cell===t.id).slurs[0].phase='continue';assert.throws(()=>baerComponentRoutes(slur,t),/both endpoints/);
});

test('rendered Darga audio preserves its interior sixteenth rest as exact digital silence without opening an audio device',async()=>{
 const p=plan('darga-tevir:lower'),rate=8000,output=await renderWav(p,{sampleRate:rate,createContext:(length,rate)=>new engine.OfflineAudioContext(1,length,rate)}),view=new DataView(await output.blob.arrayBuffer());
 assert.equal(output.frames,42000);assert.ok(Array.from({length:2000},(_,i)=>view.getInt16(44+(22000+i)*2,true)).every(n=>n===0));
 assert.ok(Array.from({length:1200},(_,i)=>view.getInt16(44+(20500+i)*2,true)).some(n=>n!==0));
 assert.ok(Array.from({length:1200},(_,i)=>view.getInt16(44+(24100+i)*2,true)).some(n=>n!==0));
});

test('Mercha kefula outer phrase slur encloses both smaller slurs without crossing them or leaving the SVG',()=>{
 for(const transpose of [-12,0,12]){
  const p=plan('merkha-kefula',{transpose}),svg=staffMarkup(p,[],0,p.length,{untexted:true});
  const arcs=new Map([...svg.matchAll(/<path[^>]*data-source-slur="([^"]+)"[^>]*d="([^"]+)"/g)].map(m=>[m[1],m[2].match(/-?\d+(?:\.\d+)?/g).map(Number)]));
  assert.equal(arcs.size,3);
  const point=(a,t)=>a.length===6?{x:(1-t)**2*a[0]+2*(1-t)*t*a[2]+t*t*a[4],y:(1-t)**2*a[1]+2*(1-t)*t*a[3]+t*t*a[5]}:{x:(1-t)**3*a[0]+3*(1-t)**2*t*a[2]+3*(1-t)*t*t*a[4]+t**3*a[6],y:(1-t)**3*a[1]+3*(1-t)**2*t*a[3]+3*(1-t)*t*t*a[5]+t**3*a[7]};
  const outer=arcs.get('baer105-merkha-kefula-outer');
  for(const id of ['baer105-merkha-kefula-inner-1','baer105-merkha-kefula-inner-2'])for(let i=0;i<=200;i++){
   const inside=point(arcs.get(id),i/200);let lo=0,hi=1;
   for(let j=0;j<50;j++){const t=(lo+hi)/2;if(point(outer,t).x<inside.x)lo=t;else hi=t;}
   const enclosing=point(outer,(lo+hi)/2);
   assert.ok(enclosing.y<=inside.y+1e-7,`${id}: nested arcs cross at${i}/200`);
   assert.ok(enclosing.y>=0&&enclosing.y<=250,'Outer slur leaves the visible staff.');
  }
 }
});
