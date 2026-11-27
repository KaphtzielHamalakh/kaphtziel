import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import engine from 'web-audio-engine';
import {BAER_SECOND_PATTERN_ROW} from '../baer-second-pattern-data.js';
import {BAER_PATTERN_ROW} from '../baer-pattern-data.js';
import {BAER_SECOND_PATTERN_ID as id,baerSecondPatternModes as modes} from '../baer-second-patterns.js';
import {baerPatternModes,baerPatternPlan,printedPatternBeats,printedPatternRests,printedPatternDuration} from '../baer-patterns.js';
import {availablePatternModes,printedPatternPlan,patternContextChoices,patternEvidence,patternSource} from '../printed-patterns.js';
import {wordPatternCatalogue} from '../word-pattern-lookups.js';
import {validatePlan} from '../synthesis.js';
import {staffMarkup} from '../staff.js';
import {renderWav} from '../wav.js';
const data=BAER_SECOND_PATTERN_ROW.record,first=BAER_PATTERN_ROW.record,read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex'),plan=(mode,o={})=>printedPatternPlan(mode,{sourceId:id,tempo:60,transpose:0,...o});
test('second-setting inventory is29ordinary source figures, with28measured, one referenced unmeasured grace and every coherent alternative',()=>{
 assert.equal(data.figures.length,29);assert.equal(data.notes.length,218);assert.equal(data.figures.filter(f=>f.status==='transcribed').length,28);assert.equal(data.figures.filter(f=>f.status==='unmeasured-grace').length,1);assert.equal(modes().length,35);assert.equal(availablePatternModes(id).length,34);assert.equal(availablePatternModes(id,{graceDemo:true}).length,35);assert.deepEqual(data.figures.map(f=>f.id),first.figures.slice(0,29).map(f=>f.id));
 assert(data.figures.every(f=>f.sourceSetting==='2. W.'&&f.review===null&&f.wordApplication===null));assert(!data.figures.some(f=>f.page===36));for(const k of['review','wordApplication','phonemes','syllableUnderlay','pronunciation'])assert.equal(data[k],null);
});
test('all38accepted first-setting event plans and82word-context relations remain byte-JSON identical; only new unmapped study entries append',()=>{
 const old=baerPatternModes().map(m=>({mode:m.id,plan:baerPatternPlan(m.id,{tempo:60,transpose:0,graceDemo:true,repeatDemo:true})}));assert.equal(sha(JSON.stringify(old)),'afd9a5f31d41ea34a4023132d977207d9445f992bd1893d77637616984bd249f');assert.equal(sha(read('docs/BAER-NO105-PATTERNS.json')),'f20e917ee8a70c2fa34476c26918ddc98f3d714a8090ebb3cb885dd609dd5089');
 const c=wordPatternCatalogue();assert.equal(c.entries.length,82);assert.equal(sha(JSON.stringify(c.entries)),'f4020aa821e5b248c641d947753575d179b6f0586f64b36196fc5aeabb567824');assert.equal(sha(JSON.stringify(c.unmapped.slice(0,62))),'34494cf69c35a641095e18846701dfad09685ee02efa9d32af02fa2d3301f747');assert.equal(c.unmapped.length,139);assert(c.unmapped.slice(62,97).every(r=>r.sourceId===id));
});
test('every literal dto component retains its exact first-setting note identity, pitch, written duration and uncertainty',()=>{
 const byId=new Map(first.notes.map(n=>[n.id,n]));let refs=0;
 for(const n of data.notes.filter(n=>n.sourceNotation.method==='literal-dto-reference')){const p=byId.get(n.sourceNotation.parentComponentId);assert(p);for(const k of['midi','sourcePitch','quarterBeats','rhythm'])assert.deepEqual(n[k],p[k]);assert.equal(n.sourceNotation.parentSha256,'f20e917ee8a70c2fa34476c26918ddc98f3d714a8090ebb3cb885dd609dd5089');if(p.grace){assert.equal(n.grace.duration,null);assert.equal(n.grace.stealTimeFollowing,null);assert.equal(n.grace.stealTimePrevious,null);}refs++;}
 assert(refs>50);assert.equal(plan('mahpakh-pashta-without-zaqef')[0].midi,65);assert.equal(baerPatternPlan('mahpakh-pashta-without-zaqef')[0].midi,69);
});
test('second-row written pitches, sharp, unequal cell extents and exact leading/final rests follow the inspected source',()=>{
 for(const[mode,midi,beats]of[['zarqa',[64,65,67,67,65,64,62],4],['segol',[62,67,67,66,69,67],4],['munah-plain',[65,65,64,65,67],3],['munah-etnahta',[69,67,62,65],2.5],['merkha-silluq',[69,67,62,65],3],['paseq',[69],2],['section-ending',[65,72,69,65,67,69,65,65,67,62],9.5]]){const p=plan(mode);assert.deepEqual(p.map(n=>n.midi),midi,mode);assert.equal(printedPatternBeats(p),beats);assert.equal(validatePlan(p),beats);}
 assert.equal(plan('segol')[3].sourcePitch.alter,1);assert.equal(plan('segol')[3].sourceAccidentalEvidence,'explicit_sharp_in_second_row');assert.deepEqual(printedPatternRests(plan('paseq')).map(r=>r.beats),[.5,.5]);assert.deepEqual(printedPatternRests(plan('section-ending')).map(r=>r.beats),[.5,.5,.5]);
});
test('Revia and Pazer retain both complete monophonic routes, including common reconvergence notes',()=>{
 const fixtures={'revia':[70,69,67,69,67,65,64,62],'revia:lower':[70,69,67,67,65,64,62],'pazer':[65,65,77,76,74,72,74,72],'pazer:lower':[65,65,77,72,69,72,74,72]};
 for(const[mode,midi]of Object.entries(fixtures)){const p=plan(mode);assert.deepEqual(p.map(n=>n.midi),midi);assert.equal(printedPatternBeats(p),4);assert.equal(validatePlan(p),4);}
 assert.equal(plan('pazer')[5].id,plan('pazer:lower')[5].id);assert.equal(plan('pazer')[5].midi,72);assert.equal(plan('pazer')[5].beats,.5);assert.equal(plan('revia')[2].beats,.25);assert.equal(plan('revia:lower')[3].beats,.5);
});
test('doubled heads, triplet membership and different stem durations stay explicit rather than combining into chords',()=>{
 assert.deepEqual(plan('qadma-azla').map(n=>n.midi),[65,72,72,72,72,67,74,72]);assert.deepEqual(plan('qadma-azla:lower').map(n=>n.midi),[65,69,69,69,69,67,74,72]);assert(plan('qadma-azla').slice(-4).every(n=>n.sourceRhythm.type==='32nd'&&n.beats===.125));
 const a=plan('sof-pasuq'),b=plan('sof-pasuq:lower');assert.deepEqual(a.map(n=>n.midi),[65,67,69,67,69,69,62]);assert.deepEqual(b.map(n=>n.midi),[65,65,67,62]);assert.equal(printedPatternBeats(a),2.5);assert.equal(printedPatternBeats(b),2.5);assert.equal(a[0].sourcePrintedHead.id,b[0].sourcePrintedHead.id);assert.notEqual(a[0].id,b[0].id);assert.equal(a[0].beats,.25);assert.equal(b[0].beats,.5);assert.equal(a.filter(n=>n.sourceTupletId).length,3);assert.equal(b.filter(n=>n.sourceTupletId).length,0);
 for(const mode of modes().filter(m=>m.status==='transcribed')){const p=plan(mode.id);for(let i=1;i<p.length;i++)assert(p[i].startSeconds>=p[i-1].startSeconds+p[i-1].durationSeconds-1e-10);}
});
test('all35routes keep marked-word/phoneme allocation null and transpose/tempo independent while unmeasured timing remains opt-in',()=>{
 for(const m of modes()){
  if(m.status==='unmeasured-grace')assert.throws(()=>plan(m.id),/unmeasured|timing review/);
  const a=plan(m.id,{graceDemo:true}),b=plan(m.id,{graceDemo:true,tempo:120,transpose:1});assert.equal(a.length,b.length);assert.deepEqual(patternContextChoices(id,m.id),[]);
  for(let i=0;i<a.length;i++){assert.equal(b[i].midi,a[i].midi+1);assert.deepEqual(b[i].sourcePitch,a[i].sourcePitch);assert.equal(b[i].id,a[i].id);for(const k of['wordId','sourceWordId','syllableId','syllable','phonemes'])assert.equal(a[i][k],null);if(!a[i].sourceGrace)assert.equal(b[i].durationSeconds,a[i].durationSeconds/2);else assert.equal(a[i].durationSeconds,.08);}
  assert(Object.isFrozen(a[0]));assert(staffMarkup(a,[],0,a.length,{untexted:true}).includes('data-event'));
 }
 assert.equal(plan('pashta-zaqef-after-predecessors',{graceDemo:true}).filter(n=>n.sourceGrace).length,1);
});
test('all new crop, context, preface and source-record evidence links expose exact canonical bytes',()=>{
 for(const input of data.inputs)assert.equal(sha(read(input.path)),input.sha256);
 for(const page of[30,31,32,33,34,35]){const f=data.figures.find(f=>f.page===page),row=patternSource(id,f.id),p=data.source.pages[page],e=patternEvidence(id,'columns',f.id),context=patternEvidence(id,'context',f.id);assert.equal(row.record.source.page,page);assert.equal(e.file,p.image);assert.equal(e.mime,'image/png');assert.deepEqual(Buffer.from(e.bytes),read(p.image));assert.equal(sha(e.bytes),p.imageSha256);assert.equal(context.file,first.source.pages[page].image);assert.deepEqual(Buffer.from(context.bytes),read(context.file));}
 assert.deepEqual(JSON.parse(patternEvidence(id,'record','zarqa').text),data);assert.deepEqual(Buffer.from(patternEvidence(id,'preface','zarqa').bytes),read(data.notationPrinciple.source.file));
});
test('offline rendered ending keeps9.5written beats and digital silence for both interior rests and the final rest',async()=>{
 const p=plan('section-ending'),rate=8000,r=await renderWav(p,{sampleRate:rate,createContext:(length,rate)=>new engine.OfflineAudioContext(1,length,rate)}),view=new DataView(await r.blob.arrayBuffer());assert.equal(r.frames,76000);assert.equal(printedPatternDuration(p),9.5);
 for(const rest of printedPatternRests(p)){const from=Math.ceil((rest.startSeconds+.04)*rate),to=Math.floor((rest.startSeconds+rest.durationSeconds-.04)*rate);assert(to>from);for(let i=from;i<to;i++)assert.equal(view.getInt16(44+i*2,true),0);}
});
