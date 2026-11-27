import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import engine from 'web-audio-engine';
import {BAER_THIRD_PATTERN_ROW as row,BAER_THIRD_PATTERN_IMAGES as images,BAER_THIRD_PATTERN_RECORDS as records} from '../baer-third-pattern-data.js';
import {BAER_SECOND_PATTERN_ROW as parent} from '../baer-second-pattern-data.js';
import {baerThirdPatternModes as modes,baerThirdPatternPlan as plan} from '../baer-third-patterns.js';
import {baerPatternModes,baerPatternPlan,printedPatternBeats,printedPatternDuration,printedPatternRests} from '../baer-patterns.js';
import {baerSecondPatternModes,baerSecondPatternPlan} from '../baer-second-patterns.js';
import {validatePlan,soundingNotes} from '../synthesis.js';
import {renderWav} from '../wav.js';
import {availablePatternModes,patternContextChoices,printedPatternPlan,PRINTED_PATTERN_SOURCES} from '../printed-patterns.js';
import {wordPatternCatalogue} from '../word-pattern-lookups.js';
const data=row.record,read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex'),p=(id,o={})=>plan(id,{tempo:60,transpose:0,...o});
test('all29third-row columns remain in the private inventory; unresolved7supply no fabricated routes, fitting or voices',()=>{
 assert.equal(data.figures.length,29);assert.equal(data.figures.filter(f=>f.status==='transcribed').length,21);assert.equal(data.figures.filter(f=>f.status==='unmeasured-grace').length,1);assert.equal(data.figures.filter(f=>f.status==='unresolved-route').length,7);assert.equal(data.notes.length,149);assert.equal(modes().length,35);assert.deepEqual(data.figures.map(f=>f.id),parent.record.figures.map(f=>f.id));
 for(const f of data.figures.filter(f=>f.status==='unresolved-route')){assert.equal(f.realizedComponents,0);assert.equal(f.coherentMonophonicRoutes,0);assert.match(f.pending,/require|inspect|resolution|resolved/i);assert.throws(()=>p(f.id,{graceDemo:true,repeatDemo:true}),/awaits literal notation/);}
 for(const k of['review','wordApplication','pronunciation','syllableUnderlay','phonemes'])assert.equal(data[k],null);assert.deepEqual(data.matchingQueries,{});assert(data.figures.every(f=>f.sourceSetting==='3. W.'&&f.review===null&&f.wordApplication===null));
});
test('literal third-row dto references preserve immediate and transitive source identities; written pickups override only their own first component',()=>{
 const byId=new Map(parent.record.notes.map(n=>[n.id,n]));let count=0;
 for(const n of data.notes.filter(n=>n.sourceNotation.method==='literal-dto-reference')){const old=byId.get(n.sourceNotation.parentComponentId);assert(old);assert.equal(n.sourceNotation.parentRecord,'docs/BAER-NO105-SECOND-PATTERNS.json');assert.equal(n.sourceNotation.parentSha256,'082909dd3e39f0ff45d92e0518b7a9b34909edddcf6574b159b6c08d3e4df9e2');for(const k of['midi','sourcePitch','quarterBeats','rhythm'])assert.deepEqual(n[k],old[k]);assert.deepEqual(n.sourceNotation.transitiveSourceNotation,old.sourceNotation??null);count++;}
 assert(count>30);assert.equal(p('mahpakh-pashta-without-zaqef')[0].midi,69);assert.equal(baerSecondPatternPlan('mahpakh-pashta-without-zaqef')[0].midi,65);
});
test('Zarqa keeps the eighth-note triplet, B-flat key and alternative initial quarter rather than importing earlier tuplets',()=>{
 const a=p('zarqa'),b=p('zarqa:lower');assert.deepEqual(a.map(n=>n.midi),[65,67,69,70,72,69,65,67,65,64,62]);assert.deepEqual(b.map(n=>n.midi),[67,69,70,72,69,65,67,65,64,62]);assert.equal(printedPatternBeats(a),4);assert.equal(printedPatternBeats(b),4);assert.equal(a[1].sourcePrintedHead.id,b[0].sourcePrintedHead.id);assert.notEqual(a[1].id,b[0].id);assert.equal(a[1].beats,.5);assert.equal(b[0].beats,1);assert(a.slice(4,7).every(n=>n.sourceRhythm.type==='eighth'&&n.sourceRhythm.actual===3&&n.beats===1/3));
});
test('Segol sharp belongs only to its lower alternative; plainMunah keeps ordinary and triplet durations on the same physical head',()=>{
 assert.deepEqual(p('segol').map(n=>n.midi),[67,64,69,67]);assert.deepEqual(p('segol:lower').map(n=>n.midi),[67,66,69,67]);for(const id of['segol','segol:lower']){assert.equal(printedPatternBeats(p(id)),3);assert.deepEqual(printedPatternRests(p(id)).map(r=>r.beats),[1]);}
 const a=p('munah-plain'),b=p('munah-plain:lower');assert.deepEqual(a.map(n=>n.midi),[65,65,67,69,65]);assert.deepEqual(b.map(n=>n.midi),[67,62,67,65]);assert.equal(printedPatternBeats(a),4);assert.equal(printedPatternBeats(b),4);assert.equal(a[2].sourcePrintedHead.id,b[2].sourcePrintedHead.id);assert.equal(a[2].beats,1/3);assert.equal(b[2].beats,.5);
});
test('every resolved route retains monophonic clocks and null word/phoneme fields; unmeasured grace timing remains opt-in and independent',()=>{
 let routes=0;
 for(const m of modes().filter(m=>m.status!=='unresolved-route')){if(m.status==='unmeasured-grace')assert.throws(()=>p(m.id),/unmeasured|timing review/);const a=p(m.id,{graceDemo:true}),b=p(m.id,{graceDemo:true,tempo:120,transpose:1});routes++;assert.equal(a.length,b.length);validatePlan(a);validatePlan(b);for(let i=0;i<a.length;i++){assert.equal(b[i].id,a[i].id);assert.equal(b[i].midi,a[i].midi+1);assert.deepEqual(b[i].sourcePitch,a[i].sourcePitch);for(const k of['wordId','sourceWordId','syllableId','syllable','phonemes'])assert.equal(a[i][k],null);assert.equal(b[i].durationSeconds,a[i].sourceGrace?.kind==='unmeasured'?.08:a[i].durationSeconds/2);}}
 assert.equal(routes,28);
});
test('new equal-pitch printed ties retain source components and hold attacks; all interior/final rests remain exact',async()=>{
 const q=p('telisha-qetana'),ending=p('section-ending');assert.equal(q.length,7);assert.equal(soundingNotes(q).length,6);assert(q.at(-2).tieStart&&q.at(-1).tieStop);assert.equal(q.at(-1).midi,60);assert.equal(printedPatternBeats(q),5.25);
 assert.equal(ending.length,9);assert.equal(soundingNotes(ending).length,7);assert.equal(printedPatternBeats(ending),9.5);assert.deepEqual(printedPatternRests(ending).map(r=>r.beats),[.5,.5,.5]);const rate=8000,r=await renderWav(ending,{sampleRate:rate,createContext:(length,rate)=>new engine.OfflineAudioContext(1,length,rate)}),v=new DataView(await r.blob.arrayBuffer());assert.equal(r.frames,76000);assert.equal(printedPatternDuration(ending),9.5);for(const rest of printedPatternRests(ending))for(let i=Math.ceil((rest.startSeconds+.04)*rate);i<Math.floor((rest.startSeconds+rest.durationSeconds-.04)*rate);i++)assert.equal(v.getInt16(44+i*2,true),0);
});
test('all new crop/context input pins and embedded canonical bytes remain exact; native inspection metadata is separate from review',()=>{
 for(const r of data.inputs)assert.equal(sha(read(r.path)),r.sha256);for(const r of Object.values(data.source.pages)){const b=Buffer.from(images[r.image].split(',')[1],'base64');assert.deepEqual(b,read(r.image));assert.equal(sha(b),r.imageSha256);assert.deepEqual(read(r.contextImage.image),read(parent.record.source.pages[r.page??Object.keys(data.source.pages).find(k=>data.source.pages[k]===r)].image));}
 assert.deepEqual(JSON.parse(Buffer.from(records[row.recordPath].split(',')[1],'base64').toString()),data);assert.equal(data.nativeSourceRasters.length,6);assert(data.nativeSourceRasters.every(r=>r.size[0]===3868&&r.size[1]===5677));assert.equal(data.review,null);
});

test('all38first-setting and35second-setting accepted event plans remain exact',()=>{
 const a=baerPatternModes().map(m=>({mode:m.id,plan:baerPatternPlan(m.id,{tempo:60,transpose:0,graceDemo:true,repeatDemo:true})})),b=baerSecondPatternModes().map(m=>({mode:m.id,plan:baerSecondPatternPlan(m.id,{tempo:60,transpose:0,graceDemo:true})}));assert.equal(a.length,38);assert.equal(b.length,35);assert.equal(sha(JSON.stringify(a)),'afd9a5f31d41ea34a4023132d977207d9445f992bd1893d77637616984bd249f');assert.equal(sha(JSON.stringify(b)),'3d3d652173deaaa6d72ea20dfba2fae5477e785501b9f564d5254c8ac5c9b42b');assert.equal(sha(JSON.stringify([...a,...b].map(({mode,plan})=>({mode,sounding:soundingNotes(plan)})))),'3e629a1312d21fe55c79bc59ae4c13f3e139f2ef978e3f249b9f4004c6ca297a');
});

test('third-row catalogue choices remain manual, all seven gaps fail closed and every prior lookup/unmapped entry remains exact',()=>{
 const id=row.id,c=wordPatternCatalogue();assert.equal(PRINTED_PATTERN_SOURCES.find(r=>r.id===id)?.id,id);assert.equal(availablePatternModes(id).length,27);assert.equal(availablePatternModes(id,{graceDemo:true}).length,28);
 assert.equal(c.entries.length,82);assert.equal(sha(JSON.stringify(c.entries)),'f4020aa821e5b248c641d947753575d179b6f0586f64b36196fc5aeabb567824');assert.equal(sha(JSON.stringify(c.unmapped.slice(0,97))),'555a6bdcf842c93237ef8e3888e097306d1ca7cff7dad404f6736b9a58014838');assert.equal(c.unmapped.length,132);assert(c.unmapped.slice(97).every(x=>x.sourceId===id));
 for(const m of modes()){assert.deepEqual(patternContextChoices(id,m.id),[]);if(m.status==='unresolved-route'){assert(!availablePatternModes(id,{graceDemo:true,repeatDemo:true,smallPatternDemo:true}).some(x=>x.id===m.id));assert.throws(()=>printedPatternPlan(m.id,{sourceId:id,graceDemo:true,repeatDemo:true}),/awaits literal notation/);}else assert.deepEqual(printedPatternPlan(m.id,{sourceId:id,tempo:60,transpose:0,graceDemo:true}),p(m.id,{graceDemo:true}));}
});
