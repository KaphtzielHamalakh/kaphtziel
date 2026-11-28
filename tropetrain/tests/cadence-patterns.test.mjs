import {assertProgramSourceImage} from './program-source-image-artifact.mjs';
import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {PRINTED_PATTERN_CATALOG,PATTERN_IMAGE_DATA,availablePatternModes,printedPatternPlan,patternContextChoices,patternEvidence} from '../printed-patterns.js';import {eventPitchName} from '../score-data.js';import {staffMarkup} from '../staff.js';import {soundingNotes,validatePlan} from '../synthesis.js';import {Player} from '../audio.js';import {getCorpus} from '../library.js';import {findCombinationsInCorpus} from '../accent-context.js';import {createReadingModel,melodyProfiles} from '../music.js';import {passage} from '../passage.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url)),rows=PRINTED_PATTERN_CATALOG.rows.slice(12),row=l=>rows.find(r=>r.id.includes('-I-'+l+'-')),plan=(l,mode='munah-etnahta',opts={})=>printedPatternPlan(mode,{sourceId:row(l).id,tempo:60,...opts});
const expected={A:{m:[[64,71,67],[.5,.5,.5]],e:[[64,64,67,62],[.25,.25,.5,.5]]},B:{m:[[64,64],[.5,1]],e:[[64,67,69,67],[.25,.25,.5,.5]]},C:{m:[[68,68],[.5,1]],e:[[68,68,69],[.25,.25,1]]},D:{m:[[67,67],[.5,1]],e:[[67,67,67,69],[.25,.25,.25,.75]]},E:{m:[[64,64],[.5,1]],e:[[64,64,66],[.25,.25,1]]},F:{m:[[66,66],[.5,1]],e:[[67,67,62],[.25,.25,1]]}};
test('six continued cadence records add twelve figures and34components while all twelve prior source records stay exact',()=>{
 assert.equal(rows.length,6);assert.equal(rows.reduce((n,r)=>n+r.record.notes.length,0),34);assert.equal(rows.flatMap(r=>r.unavailable).length,0);assert.equal(PRINTED_PATTERN_CATALOG.revision,3);
 const raw=JSON.parse(read('docs/PRINTED-PATTERN-CATALOG.json'));assert.equal(createHash('sha256').update(JSON.stringify(raw.rows.slice(0,12))).digest('hex'),'4a5fc220a42300cf9dce13e487c44f8dc786399e48ee153f24df4a84a8d82f33');
 for(const r of rows)assert.deepEqual(availablePatternModes(r.id).map(m=>m.id),['munah-etnahta','munah-before-etnahta','etnahta']);
 assert.deepEqual(melodyProfiles.map(p=>p.id),['original-demo-01','cohen-1902-gen22-ending','baer-1894-gen1-1-5','cohen-1902-gen22-prophetical','baer-1894-gen22-19','cohen-1902-gen22-penitential','idelsohn-1929-vol5-no268','idelsohn-1929-vol5-no266','baer-1894-no111-gen2-3-upper','baer-1894-no111-gen2-3-lower','baer-1894-no111-exo13-21-written','baer-1894-no46-deu11-21-upper','baer-1894-no46-deu11-21-lower']);
});
test('literal source pitches, repeated attacks and dotted/16th values match both page parts independently',()=>{
 for(const [letter,spec] of Object.entries(expected))for(const [key,mode] of [['m','munah-before-etnahta'],['e','etnahta']]){const p=plan(letter,mode);assert.deepEqual(p.map(e=>e.midi),spec[key][0]);assert.deepEqual(p.map(e=>e.beats),spec[key][1]);assert.equal(validatePlan(p),1.5);assert.equal(soundingNotes(p).length,p.length);assert.ok(p.every(e=>!e.tieId));}
 assert.equal(plan('D','etnahta').at(-1).sourceRhythm.dots,1);assert.equal(plan('D','etnahta').at(-1).sourceRhythm.type,'eighth');
 for(const letter of Object.keys(expected))assert.equal(validatePlan(plan(letter)),3);
});
test('the Munaḥ page turn retains first-note542 and all remaining543 locations without moving source boundaries',()=>{
 for(const r of rows){const letter=r.id.match(/-I-([A-F])-/)[1],p=plan(letter);assert.equal(p[0].sourcePage,542);assert.ok(p.slice(1).every(e=>e.sourcePage===543));assert.match(p[0].sourceLocation,/p\.542/);assert.match(p.at(-1).sourceLocation,/p\.543/);assert.deepEqual(r.record.source.pdfPages,[580,581]);assert.match(r.record.source.pdfPageConvention,/one-based/);assert.equal(r.record.source.continuationImage.image,'assets/scores/cohen-1902-etnahta-ending-p543.png');}
 const a=plan('A');assert.deepEqual(a.slice(1,3).map(e=>e.sourceSlurPhase),['start','stop']);assert.equal(a[1].sourceSlurId,a[2].sourceSlurId);
});
test('G-sharp evidence survives the page turn and repeated G-sharps do not become A-flats at the source key',()=>{
 const p=plan('C');assert.deepEqual(p.map(eventPitchName),['G♯4','G♯4','G♯4','G♯4','A4']);assert.ok(p.slice(0,4).every(e=>e.sourceAccidentalEvidence.includes('G-sharp')));const svg=staffMarkup(p,[],0,p.length,{untexted:true});assert.match(svg,/G♯4/);assert.doesNotMatch(svg,/A♭4/);
 const raised=plan('C','munah-etnahta',{transpose:3,tempo:120});for(let i=0;i<p.length;i++){assert.equal(raised[i].midi,p[i].midi+3);assert.deepEqual(raised[i].sourcePitch,p[i].sourcePitch);assert.equal(raised[i].durationSeconds,p[i].durationSeconds/2);}
});
test('six source fermatas engrave independently and never fabricate a fixed hold length',()=>{
 for(const r of rows){const letter=r.id.match(/-I-([A-F])-/)[1],p=plan(letter),fermata=p.at(-1);assert.deepEqual(fermata.sourceFermata,{shape:'normal',placement:'above',duration:'unspecified'});assert.equal(p.filter(e=>e.sourceFermata).length,1);assert.ok(Object.isFrozen(fermata.sourceFermata));assert.equal((staffMarkup(p,[],0,p.length,{untexted:true}).match(/class="staff-fermata"/g)||[]).length,1);assert.equal(validatePlan(p),3);const prefix=plan(letter,'munah-before-etnahta');assert.doesNotMatch(staffMarkup(prefix,[],0,prefix.length,{untexted:true}),/class="staff-fermata"/);}
 const bad=plan('A').map(e=>({...e}));bad.at(-1).sourceFermata={shape:'normal',placement:'above',duration:'double'};assert.throws(()=>staffMarkup(bad,[],0,bad.length,{untexted:true}),/Unsupported printed fermata/);
});
test('both source page images are byte exact and both evidence links work without a substituted old row',()=>{
 const values=[['assets/scores/cohen-1902-etnahta-leading-p542.png','12eb72a917b7e0f0bef2e3bc03e57b039a7f079ddbd4742150a26af91de9ee43'],['assets/scores/cohen-1902-etnahta-ending-p543.png','70ecb2c899cc5cd48db5bc22284cda20477f88371923b62913cb1c301ae9f6b4']];
 for(const [file,sha] of values){assert.equal(createHash('sha256').update(read(file)).digest('hex'),sha);assert.deepEqual(Buffer.from(PATTERN_IMAGE_DATA[file].split(',')[1],'base64'),read(file));assertProgramSourceImage(read('app.bundle.js'),PATTERN_IMAGE_DATA[file],file);}
 assert.deepEqual(Buffer.from(patternEvidence(row('A').id,'continuation').bytes),read(values[1][0]));assert.deepEqual(Buffer.from(patternEvidence(row('A').id,'columns').bytes),read(values[0][0]));assert.throws(()=>patternEvidence(PRINTED_PATTERN_CATALOG.rows[0].id,'continuation'),/unavailable/);
});
test('cadence lookup selects the literal adjacent source context without applying untexted notes to Torah words',async()=>{
 for(const r of rows)for(const mode of availablePatternModes(r.id)){assert.deepEqual(patternContextChoices(r.id,mode.id).map(q=>q.ids),[['munah','etnahta']]);const p=printedPatternPlan(mode.id,{sourceId:r.id});assert.ok(p.every(e=>e.wordId===null&&e.syllableId===null&&e.syllable===null&&e.phonemes===null));}
 const before=JSON.stringify(createReadingModel(passage)),hits=await findCombinationsInCorpus(await getCorpus(),'munah>etnahta');assert.ok(hits.length>0);assert.ok(hits[0].atoms.map(a=>a.id).join('>')==='munah>etnahta');assert.equal(JSON.stringify(createReadingModel(passage)),before);
});
test('muted playback reaches and finishes the last fermata note at the unchanged written duration',async()=>{
 const old=global.cancelAnimationFrame;global.cancelAnimationFrame=()=>{};let now=0,ended=false;const frames=[],player=new Player(e=>frames.push(e),()=>{ended=true;},()=>{},{wallClock:()=>now});player.setVolume(0);
 try{const p=plan('A');await player.play(p);now=player.start+2.75;player.paint();assert.equal(frames.at(-1).id,p.at(-1).id);assert.equal(frames.at(-1).sourceFermata.duration,'unspecified');now=player.start+3.01;player.paint();assert.equal(ended,true);assert.equal(player.running,false);assert.equal(player.context,undefined);}finally{player.stop();global.cancelAnimationFrame=old;}
});
