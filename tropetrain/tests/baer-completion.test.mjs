import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import engine from 'web-audio-engine';
import {BAER_PATTERN_ROW} from '../baer-pattern-data.js';
import {baerPatternPlan,printedPatternBeats,printedPatternDuration,printedPatternRests,printedRestAt} from '../baer-patterns.js';
import {baerComponentRoutes} from '../baer-notation.js';
import {staffMarkup} from '../staff.js';
import {renderWav} from '../wav.js';
import {validatePlan} from '../synthesis.js';
import {sourceLookupPattern} from '../accent-context.js';
const data=BAER_PATTERN_ROW.record,plan=(id,options={})=>baerPatternPlan(id,{tempo:60,transpose:0,...options}),modes=['munah-before-mahpakh','mahpakh-pashta-zaqef','mahpakh-pashta-zaqef:lower','section-ending','section-ending:lower'];

test('the new source routes preserve all175 prior components and the full32-cell inventory',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(data.notes.slice(0,175))).digest('hex'),'892ff95cf68c97ab348321e80e4161da8eff1f9001d864df55d7b7492e083220');
 for(const queries of Object.values(data.matchingQueries))for(const q of queries)assert.deepEqual(sourceLookupPattern(q.ids).ids,q.ids);assert.deepEqual(data.matchingQueries.paseq,[]);
 assert.equal(data.revision,5);assert.equal(data.notes.length,229);assert.equal(data.figures.length,32);assert.equal(data.figures.filter(f=>f.status==='transcribed').length,27);assert.equal(data.figures.filter(f=>f.status==='unmeasured-grace').length,1);assert.equal(data.notes.filter(n=>n.kind==='note').length,215);assert.equal(data.notes.filter(n=>n.kind==='rest').length,14);
});

test('Munah before Mahpakh assigns the triplet only to the three secondary-beamed sixteenths',()=>{
 const p=plan('munah-before-mahpakh');assert.deepEqual(p.map(n=>n.midi),[70,72,70,69,67,72,69]);assert.deepEqual(p.map(n=>n.beats),[1,.5,1/6,1/6,1/6,.5,.5]);
 assert.deepEqual(p.filter(n=>n.sourceRhythm.actual===3).map(n=>n.sourceComponentNumber),[3,4,5]);assert.deepEqual(p.filter(n=>n.sourceRhythm.actual===3).map(n=>n.sourceTupletPhase),['start','continue','stop']);
 assert.equal(p[1].sourceSlurs[0].phase,'start');assert.equal(p[6].sourceSlurs[0].phase,'stop');assert.equal(p[0].sourceSlurs,undefined);assert.equal(p[5].sourceTupletId,undefined);assert(Math.abs(printedPatternBeats(p)-4)<1e-12);assert.equal(printedPatternRests(p).length,1);assert.equal(printedPatternRests(p)[0].rhythm.type,'quarter');assert.equal(printedRestAt(p,3.5).sourceComponentNumber,8);
});

test('Mahpakh/Pashta/Zaqef keeps two complete monophonic source lines and six shared physical heads',()=>{
 const a=plan('mahpakh-pashta-zaqef'),b=plan('mahpakh-pashta-zaqef:lower');assert.deepEqual(a.map(n=>n.midi),[69,62,65,65,72,69,69,69,65,65,67,65]);assert.deepEqual(b.map(n=>n.midi),[69,60,65,65,69,65,69,65,65,65]);
 assert(a.every(n=>n.beats===.5));assert.deepEqual(b.map(n=>n.beats),[.5,.5,.5,.5,1,.5,.5,.5,.5,1]);assert.equal(new Set([...a,...b].map(n=>n.id)).size,16);assert.equal(a.filter(n=>b.some(x=>x.id===n.id)).length,6);
 for(const route of[a,b]){assert.equal(printedPatternBeats(route),6);assert.equal(route.filter(n=>n.sourceBar===1).reduce((n,e)=>n+e.beats,0),3);assert.equal(route.filter(n=>n.sourceBar===2).reduce((n,e)=>n+e.beats,0),2.5);assert.equal(route[0].sourceBar,undefined);}
});

test('the printed ending keeps both initial Sof heads, two interior eighth rests and a separate final eighth rest',()=>{
 const a=plan('section-ending'),b=plan('section-ending:lower');assert.deepEqual(a.map(n=>n.midi),[65,72,65,67,65,64,62,69,62,69,69,65,69,62]);assert.deepEqual(b.map(n=>n.midi),[65,72,65,67,65,64,62,69,62,69,69,65,67,62]);
 assert.deepEqual(a.map(n=>n.beats),[.5,1,.5,.75,.25,.25,.25,1,.25,.25,.5,.5,1.5,1]);
 for(const route of[a,b]){const rests=printedPatternRests(route);assert.deepEqual(rests.map(r=>r.startSeconds),[4.5,5,9.5]);assert(rests.every(r=>r.beats===.5&&r.rhythm.type==='eighth'));assert.equal(new Set(rests.map(r=>r.id)).size,3);assert.equal(printedRestAt(route,4.75).id,rests[0].id);assert.equal(printedRestAt(route,5.25).id,rests[1].id);assert.equal(printedRestAt(route,5.5),null);assert.equal(printedRestAt(route,9.75).id,rests[2].id);assert.equal(printedPatternDuration(route),10);assert.equal(validatePlan(route),10);assert.equal(route[12].sourceSlurs[0].phase,'start');assert.equal(route[13].sourceSlurs[0].phase,'stop');}
 assert.equal(a.filter(n=>b.some(x=>x.id===n.id)).length,13);assert.notEqual(a[12].id,b[12].id);assert.equal(a[13].id,b[13].id);
});

test('source tuplets, alternate heads and independent rest glyphs survive actual staff rendering',()=>{
 const munah=staffMarkup(plan('munah-before-mahpakh'),[],0,7,{untexted:true});assert.match(munah,/3:2/);assert.equal((munah.match(/class="staff-rest"/g)??[]).length,1);
 for(const mode of['section-ending','section-ending:lower']){const p=plan(mode),svg=staffMarkup(p,[],0,p.length,{untexted:true});assert.equal((svg.match(/class="staff-rest"/g)??[]).length,3);assert.equal((svg.match(/data-source-slur=/g)??[]).length,2);for(const r of printedPatternRests(p))assert(svg.includes(`data-rest="${r.id}"`));assert(svg.includes(p[12].id));}
});

test('all five new routes keep their original identities under independent key and tempo without acquiring word or voice bindings',()=>{
 for(const id of modes){const a=plan(id),b=plan(id,{tempo:120,transpose:1,pronunciation:'unused',rangeLow:10,rangeHigh:20});assert.equal(b.length,a.length);for(const[i,n]of a.entries()){assert.equal(b[i].id,n.id);assert.equal(b[i].midi,n.midi+1);assert.equal(b[i].startSeconds,n.startSeconds/2);assert.equal(b[i].durationSeconds,n.durationSeconds/2);for(const k of['wordId','sourceWordId','syllableId','syllable','phonemes'])assert.equal(n[k],null);}assert(Math.abs(validatePlan(b)-validatePlan(a)/2)<1e-10);}
 const f=data.figures.find(f=>f.id==='section-ending'),bad=structuredClone(data);bad.notes.find(n=>n.id===f.variants[0].componentIds[0]).quarterBeats=null;assert.throws(()=>baerComponentRoutes(bad,f),/Unmeasured/);
});

test('rendered instrumental ending has exact digital silence across both distinct interior rests and the final rest',async()=>{
 const p=plan('section-ending'),out=await renderWav(p,{sampleRate:8000,createContext:(length,rate)=>new engine.OfflineAudioContext(1,length,rate)}),v=new DataView(await out.blob.arrayBuffer());assert.equal(out.frames,80000);
 for(const [start,end]of[[4.6,4.9],[5.1,5.4],[9.6,9.9]])for(let i=Math.round(start*8000);i<Math.round(end*8000);i++)assert.equal(v.getInt16(44+i*2,true),0);
 assert(Array.from({length:1200},(_,i)=>v.getInt16(44+(Math.round(5.6*8000)+i)*2,true)).some(x=>x!==0));
});

test('five default-disabled source cells keep unassigned grace timing or explicit notation/application gaps',()=>{
 const pending=data.figures.filter(f=>f.status!=='transcribed');assert.deepEqual(pending.map(f=>f.id),['pashta-zaqef-after-predecessors','pazer','telisha-qetana','shalshelet','qarnei-yerah-pair']);for(const f of pending){assert.equal(f.review,null);assert.equal(f.wordApplication,null);assert.throws(()=>plan(f.id),/awaits literal notation or timing review/);if(f.status==='unmeasured-grace'){assert.equal(data.notes.filter(n=>n.cell===f.id&&n.grace).length,3);assert(data.notes.filter(n=>n.cell===f.id&&n.grace).every(n=>n.quarterBeats===null));}else assert.equal(data.notes.some(n=>n.cell===f.id),false);}
 for(const name of['app.bundle.js','TropeTrain.html'])assert(readFileSync(new URL('../'+name,import.meta.url),'utf8').includes('baer105-1w-section-ending-18'));
});

test('spanning tuplet decorations stay outside each interactive note button',()=>{
 for(const mode of ['munah-before-mahpakh','zarqa','munah-before-merkha-tevir']){
  const p=plan(mode),svg=staffMarkup(p,[],0,p.length,{untexted:true}),buttons=[...svg.matchAll(/<g class="staff-note"[^>]*>[\s\S]*?<\/g>/g)].map(m=>m[0]);
  assert.equal(buttons.length,p.length);assert(buttons.every(button=>!button.includes('tuplet-bracket')));const decorations=svg.replace(/<g class="staff-note"[^>]*>[\s\S]*?<\/g>/g,'');assert.match(decorations,/class="tuplet-bracket"/);assert.match(decorations,/class="rhythm-ratio"/);
 }
});
