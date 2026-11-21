import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {PRINTED_PATTERN_CATALOG,availablePatternModes,printedPatternPlan,patternContextChoices,PATTERN_IMAGE_DATA} from '../printed-patterns.js';
import {staffMarkup} from '../staff.js';import {eventPitchName,eventPitchSpelling} from '../score-data.js';import {validatePlan,soundingNotes} from '../synthesis.js';import {Player} from '../audio.js';import {createReadingModel,melodyProfiles} from '../music.js';import {passage} from '../passage.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url)),rows=PRINTED_PATTERN_CATALOG.rows.slice(6,12),source=l=>rows.find(r=>r.id.includes('-I-'+l+'-'));
const plan=(l,mode='yetiv',opts={})=>printedPatternPlan(mode,{sourceId:source(l).id,tempo:60,...opts});
test('the continued source keeps six labeled rows, ten checked figures and two exact unresolved cells',()=>{
 assert.equal(rows.length,6);assert.equal(rows.reduce((n,r)=>n+r.record.notes.length,0),45);assert.equal(rows.reduce((n,r)=>n+r.record.notes.filter(e=>e.kind==='rest').length,0),6);
 assert.deepEqual(rows.map(r=>availablePatternModes(r.id).map(m=>m.id)),[['yetiv','zakef-preceded'],['yetiv','zakef-preceded'],['yetiv','zakef-preceded'],['zakef-preceded'],['yetiv'],['yetiv','zakef-preceded']]);
 assert.throws(()=>plan('D'),/no checked transcription/);assert.throws(()=>plan('E','zakef-preceded'),/no checked transcription/);assert.throws(()=>plan('A','pair'),/no checked transcription/);
 assert.ok(rows.every(r=>r.record.source.page===541&&r.record.source.pdfPage===579&&r.record.reviewStatus.includes('pending')));assert.ok(rows.flatMap(r=>r.unavailable).every(r=>r.neededEvidence&&r.reason));
});
test('checked source pitches, written sharps and literal note/rest durations remain distinct from complete traditions',()=>{
 const expected={A:{yetiv:[[67,74,71,null,69],[.5,1.5,.5,.5,.5]],'zakef-preceded':[[74,69,69,71,67],[.5,.5,.5,.5,.5]]},B:{yetiv:[[64,67,67,null,69],[.5,1.5,.5,.5,.5]],'zakef-preceded':[[69,71,67],[1,.5,1]]},C:{yetiv:[[69,69,68,null,68],[.5,.5,1.5,.5,.5]],'zakef-preceded':[[68,66,68,69],[.5,.5,.5,1]]},D:{'zakef-preceded':[[67,60,69],[1,.5,1]]},E:{yetiv:[[69,67,66,null,67],[.5,1.5,.5,1,1]]},F:{yetiv:[[67,74,62,null,null,67],[.5,.5,.5,.5,1,.5]],'zakef-preceded':[[72,71,69,67],[.5,.5,.5,1]]}};
 for(const [letter,figures] of Object.entries(expected))for(const [mode,[pitches,beats]] of Object.entries(figures)){
  const notes=source(letter).record.notes.filter(n=>n.cell===mode);assert.deepEqual(notes.map(n=>n.midi),pitches);assert.deepEqual(notes.map(n=>n.quarterBeats),beats);assert.ok(notes.every(n=>n.sourceLocation.includes('p.541, row I.'+letter)));
 }
 assert.deepEqual(melodyProfiles.map(p=>p.id),['original-demo-01','cohen-1902-gen22-ending','baer-1894-gen1-1-5']);
});
test('separate source rests remain silent gaps and independently inspectable symbols, including the two Bagdad rests',()=>{
 const f=plan('F'),e=plan('E');assert.equal(f.length,4);assert.equal(validatePlan(f),3.5);assert.deepEqual(f[2].sourceRestsAfter.map(r=>r.beats),[.5,1]);assert.equal(f[3].startSeconds-(f[2].startSeconds+f[2].durationSeconds),1.5);
 const svg=staffMarkup(f,[],0,f.length,{untexted:true});assert.equal((svg.match(/class="staff-rest"/g)||[]).length,2);assert.equal((svg.match(/data-rest=/g)||[]).length,2);assert.match(svg,/Rest; 0.5 beats/);assert.match(svg,/Rest; 1 beats/);assert.equal(e[2].sourceRestsAfter[0].rhythm.type,'quarter');
 const invalid=f.map(n=>({...n}));invalid[2].sourceRestsAfter=[{...f[2].sourceRestsAfter[0],beats:2}];assert.throws(()=>staffMarkup(invalid,[],0,invalid.length,{untexted:true}),/rest values and score gap/);
});
test('one held source tie merges its two G components while slurs and repeated untied pitches retain attacks',()=>{
 const b=plan('B'),a=plan('A','zakef-preceded');assert.equal(b.length,4);assert.equal(soundingNotes(b).length,3);assert.equal(soundingNotes(b)[1].durationSeconds,2);assert.deepEqual(soundingNotes(b)[1].notationEventIds,[b[1].id,b[2].id]);
 assert.equal(soundingNotes(a).length,5);assert.equal(a[1].midi,a[2].midi);assert.equal(a[1].tieId,undefined);assert.equal((staffMarkup(b,[],0,b.length,{untexted:true}).match(/aria-label="Tie: hold the same pitch"/g)||[]).length,1);
});
test('untransposed source G-sharps engrave as G-sharps and transposition leaves original spelling evidence intact',()=>{
 const c=plan('C','zakef-preceded'),raised=plan('C','zakef-preceded',{transpose:2});assert.deepEqual(c.map(eventPitchName),['G♯4','F♯4','G♯4','A4']);assert.match(staffMarkup(c,[],0,c.length,{untexted:true}),/G♯4/);assert.doesNotMatch(staffMarkup(c,[],0,c.length,{untexted:true}),/A♭4/);
 for(let i=0;i<c.length;i++){assert.equal(raised[i].midi,c[i].midi+2);assert.deepEqual(raised[i].sourcePitch,c[i].sourcePitch);assert.equal(raised[i].beats,c[i].beats);}assert.throws(()=>eventPitchSpelling({...c[0],midi:69}),/spelling and sounding MIDI disagree/);
});
test('conditional lookup retains both printed predecessor alternatives without applying the figure to all Zaqef words',()=>{
 for(const r of rows){assert.deepEqual(r.record.conditions['zakef-preceded'].precededBy,['zakef-unspecified','munah']);if(r!==source('E'))assert.deepEqual(patternContextChoices(r.id,'zakef-preceded').map(q=>q.ids),[['zakef-katon','zakef-katon'],['zakef-gadol','zakef-katon'],['munah','zakef-katon']]);}
 assert.deepEqual(patternContextChoices(source('E').id,'zakef-preceded'),[]);assert.deepEqual(patternContextChoices(source('D').id,'yetiv'),[]);assert.deepEqual(patternContextChoices(source('A').id,'yetiv').map(q=>q.ids),[['yetiv']]);
});
test('new source choices, pace, pitch and rest evidence preserve Hebrew/accents, musical source and absent pronunciation underlay',()=>{
 const model=createReadingModel(passage),before=JSON.stringify(model),records=JSON.stringify(rows);
 for(const r of rows)for(const mode of availablePatternModes(r.id)){
  const p=printedPatternPlan(mode.id,{sourceId:r.id,tempo:40,transpose:-2,rangeLow:30,rangeHigh:50,pronunciation:'ashkenazic'});assert.ok(validatePlan(p)>0);
  for(const e of p)for(const key of ['wordId','sourceWordId','syllableId','syllable','phonemes'])assert.equal(e[key],null);
  assert.equal(r.record.pronunciation,null);assert.equal(r.record.syllableUnderlay,null);
 }
 assert.equal(JSON.stringify(model),before);assert.equal(JSON.stringify(rows),records);
});
test('the muted player reports both rest intervals and the following note without creating an audio context',async()=>{
 const old=global.cancelAnimationFrame;global.cancelAnimationFrame=()=>{};let now=0;const notes=[],silence=[];const player=new Player(e=>notes.push(e.id),()=>{},(_cycle,_progress,index)=>silence.push(index),{wallClock:()=>now});player.setVolume(0);
 try{const p=plan('F');await player.play(p);for(const time of [.2,1.75,2.5,3.1]){now=player.start+time;player.paint();}assert.deepEqual(silence,[2,2]);assert.equal(notes.at(-1),p[3].id);assert.equal(player.context,undefined);}finally{player.stop();global.cancelAnimationFrame=old;}
});
test('the added source image is unchanged and embedded, and all legacy records keep their canonical data hash',()=>{
 const raw=JSON.parse(read('docs/PRINTED-PATTERN-CATALOG.json'));assert.equal(createHash('sha256').update(JSON.stringify(raw.rows.slice(0,6))).digest('hex'),'79888bc4c582f8f500425549ed2786ba5dd657877f643d53f3d95e57e70f89b7');
 const path='assets/scores/cohen-1902-conditional-p541.png',bytes=read(path),url=PATTERN_IMAGE_DATA[path];assert.deepEqual(Buffer.from(url.split(',')[1],'base64'),bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),'704356faa350292d8ae72d0cc50f13c1646968d3dbace9c317b5e34a8b4cf447');assert.ok(read('TropeTrain.html').toString().includes(url));
});
