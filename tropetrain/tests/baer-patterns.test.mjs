import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import engine from 'web-audio-engine';
import {BAER_PATTERN_ROW,BAER_PATTERN_IMAGES} from '../baer-pattern-data.js';
import {BAER_PATTERN_ID,baerPatternModes,baerPatternPlan,printedRestAt,printedPatternDuration,printedPatternBeats,printedPatternRests} from '../baer-patterns.js';
import {PRINTED_PATTERN_CATALOG,PRINTED_PATTERN_SOURCES,availablePatternModes,allPatternModes,patternSource,patternEvidence,printedPatternPlan,patternContextChoices} from '../printed-patterns.js';
import {staffMarkup} from '../staff.js';
import {validatePlan,soundingNotes} from '../synthesis.js';
import {renderWav} from '../wav.js';
const data=BAER_PATTERN_ROW.record,read=p=>readFileSync(new URL('../'+p,import.meta.url));
const plan=(mode,options={})=>printedPatternPlan(mode,{sourceId:BAER_PATTERN_ID,tempo:60,transpose:0,...options});

test('Baer source inventory keeps32cells, twenty-seven measured figures and five source-timing/application gaps apart from the existing Cohen catalogue',()=>{
 assert.equal(data.figures.length,32);assert.equal(data.figures.filter(f=>f.status==='transcribed').length,27);assert.equal(BAER_PATTERN_ROW.unavailable.length,0);
 assert.equal(PRINTED_PATTERN_CATALOG.rows.length,18);assert.equal(PRINTED_PATTERN_SOURCES.length,20);
 assert.equal(allPatternModes(BAER_PATTERN_ID).length,38);assert.equal(availablePatternModes(BAER_PATTERN_ID).length,32); // one adjacent-column pair
 assert.equal(data.notes.length,308);assert.equal(data.notes.filter(n=>n.kind==='note').length,292);assert.equal(data.notes.filter(n=>n.kind==='rest').length,16);
 for(const f of data.figures.filter(f=>f.status!=='transcribed')){assert.ok(f.pending);if(f.status!=='unmeasured-grace')assert.equal(data.notes.some(n=>n.cell===f.id),false);else assert.equal(data.notes.filter(n=>n.cell===f.id&&n.grace).length,f.unmeasuredGraceNotes);assert.throws(()=>plan(f.id),/awaits literal notation or timing review/);}
});

test('each source image reconstructs its exact byte hash and current-mode evidence shows the correct printed page and MIME',()=>{
 for(const spec of [...Object.values(data.source.pages),...Object.values(data.source.detailImages),data.source.contextImage]){
  const raw=read(spec.image);assert.equal(createHash('sha256').update(raw).digest('hex'),spec.imageSha256??spec.sha256);assert.deepEqual(Buffer.from(BAER_PATTERN_IMAGES[spec.image].split(',')[1],'base64'),raw);
 }
 const a=patternEvidence(BAER_PATTERN_ID,'columns','revia'),b=patternEvidence(BAER_PATTERN_ID,'columns','qarnei-yerah-pair');
 assert.equal(a.file,data.source.pages['31'].image);assert.equal(a.mime,'image/png');assert.equal(b.file,data.source.detailImages['rare-first'].image);assert.equal(b.mime,'image/png');assert.equal(patternEvidence(BAER_PATTERN_ID,'context','qarnei-yerah-pair').file,data.source.pages['36'].image);
 assert.equal(patternSource(BAER_PATTERN_ID,'revia').record.source.page,31);assert.equal(patternSource(BAER_PATTERN_ID,'qarnei-yerah-pair').record.source.page,36);
 assert.deepEqual(JSON.parse(patternEvidence(BAER_PATTERN_ID,'record','revia').text),data);
});

test('a leading eighth rest precedes Munah, and the Revia dotted eighth rest keeps its own source identity and exact window',()=>{
 const p=plan('munah-revia-pair');assert.equal(p[0].midi,67);assert.equal(p[0].startSeconds,.5);assert.equal(p[0].sourceComponentNumber,2);
 assert.equal(printedRestAt(p,.1).sourceComponentNumber,1);assert.equal(printedRestAt(p,.1).rhythm.type,'eighth');assert.equal(printedRestAt(p,.5),null);
 const rest=printedPatternRests(p).find(r=>r.rhythm.dots===1);assert.equal(rest.durationSeconds,.75);assert.equal(rest.startSeconds,2);assert.strictEqual(printedRestAt(p,2.4),rest);assert.equal(printedRestAt(p,2.75),null);
 assert.equal(printedPatternDuration(p),5);assert.equal(validatePlan(p),5);assert.equal(p.length,9);assert.equal(printedPatternRests(p).length,2);
});

test('a literal final half rest extends playback, inspection and repeat extent rather than disappearing after the final note',()=>{
 const p=plan('munah-four-glyphs');assert.equal(p[0].startSeconds,.5);assert.equal(p.at(-1).startSeconds+p.at(-1).durationSeconds,2);assert.equal(p.at(-1).endingRestSeconds,2);
 assert.equal(printedPatternDuration(p),4);assert.equal(printedPatternBeats(p),4);assert.equal(validatePlan(p),4);
 assert.equal(printedRestAt(p,3).rhythm.type,'half');assert.equal(printedRestAt(p,4),null);assert.equal(printedRestAt(p,-1),null);
 assert.equal(printedRestAt(p,4%printedPatternDuration(p)).sourceComponentNumber,1);
});

test('staff renders selectable leading, dotted and final rests with their actual eighth/half glyphs and printed source IDs',()=>{
 const p=plan('munah-revia-pair'),svg=staffMarkup(p,[],0,p.length,{untexted:true});assert.equal((svg.match(/class="staff-rest"/g)||[]).length,2);assert.ok(svg.includes('rest-dot'));assert.ok(svg.includes('data-rest="baer105-1w-munah-before-revia-1"'));
 const half=plan('munah-four-glyphs'),halfSvg=staffMarkup(half,[],0,half.length,{untexted:true});assert.ok(halfSvg.includes('\ue4e4'));assert.equal((halfSvg.match(/class="staff-rest"/g)||[]).length,2);
 const tail=plan('paseq');assert.equal(printedPatternRests(tail).at(-1).rhythm.type,'eighth');assert.ok(staffMarkup(tail,[],0,tail.length,{untexted:true}).includes('baer105-1w-paseq-5'));
});

test('quintuplet pitches/rhythms and all source IDs stay independent of transposition, tempo, range and pronunciation',()=>{
 const a=plan('zarqa'),b=plan('zarqa',{transpose:1}),c=plan('zarqa',{tempo:120});assert.deepEqual(a.map(e=>e.midi),[65,64,65,67,69,67,65,64,62]);
 assert.equal(a.filter(e=>e.sourceRhythm.actual===5).length,5);assert.ok(a.filter(e=>e.sourceRhythm.actual===5).every(e=>e.beats===.2&&e.sourceRhythm.normal===4));assert.equal(printedPatternDuration(a),4);
 for(let i=0;i<a.length;i++){assert.equal(b[i].midi,a[i].midi+1);assert.equal(b[i].startSeconds,a[i].startSeconds);assert.equal(c[i].midi,a[i].midi);assert.equal(c[i].durationSeconds,a[i].durationSeconds/2);assert.equal(b[i].id,a[i].id);for(const key of ['wordId','sourceWordId','syllableId','syllable','phonemes'])assert.equal(a[i][key],null);}
 assert.equal(soundingNotes(a).length,9);assert.ok(Object.isFrozen(a[0]));assert.ok(Object.isFrozen(a[0].sourceRhythm));
});

test('source figure queries are lookups, not inferred word fitting; unresolved context and historical heading order stay explicit',()=>{
 assert.deepEqual(patternContextChoices(BAER_PATTERN_ID,'munah-revia-pair')[0].ids,['munah','revia']);assert.deepEqual(patternContextChoices(BAER_PATTERN_ID,'munah-four-glyphs'),[]);assert.deepEqual(patternContextChoices(BAER_PATTERN_ID,'segol')[0].ids,['segolta']);
 assert.equal(data.applicationIssue.readerExample[0].id,'num-35-5-7');assert.equal(data.applicationIssue.readerExample[0].hebrew,'אַלְפַּ֪יִם');assert.equal(data.applicationIssue.readerExample[1].hebrew,'בָּֽאַמָּ֟ה');assert.equal(data.pronunciation,null);assert.equal(data.syllableUnderlay,null);
 for(const bad of [{tempo:0},{transpose:1.5},{transpose:40}])assert.throws(()=>baerPatternPlan('zarqa',bad),/Invalid pattern/);
});

test('offline audio contains exact digital silence for the leading and final source rests without opening an audio device',async()=>{
 const p=plan('munah-four-glyphs'),rate=8000,r=await renderWav(p,{sampleRate:rate,createContext:(length,rate)=>new engine.OfflineAudioContext(1,length,rate)}),raw=await r.blob.arrayBuffer(),view=new DataView(raw);
 assert.equal(r.frames,32000);assert.equal(validatePlan(p),4);
 const samples=Float32Array.from({length:r.frames},(_,i)=>view.getInt16(44+i*2,true));assert.ok(samples.slice(0,4000).every(s=>s===0));assert.ok(samples.slice(4100,15500).some(s=>s!==0));assert.ok(samples.slice(16100).every(s=>s===0));
});

test('muted live player visits leading rest, notes, final rest and the next loop in their source-clock order',async t=>{
 let player;const original=globalThis.cancelAnimationFrame;globalThis.cancelAnimationFrame=()=>{};t.after(()=>{player?.stop();if(original===undefined)delete globalThis.cancelAnimationFrame;else globalThis.cancelAnimationFrame=original;});
 const {Player}=await import('../audio.js');let clock=0;const p=plan('munah-four-glyphs'),seen=[];
 player=new Player((event,cycle)=>seen.push(['note',event.id,cycle]),()=>seen.push(['end']), (cycle,progress)=>seen.push(['rest',printedRestAt(p,progress*4)?.id,cycle]),{wallClock:()=>clock});player.setVolume(0);await player.play(p,true);
 for(const seconds of [.25,.75,2.5,4.25]){clock=player.start+seconds;player.paint();}
 player.stop();assert.deepEqual(seen.map(x=>x[0]),['rest','note','rest','rest']);assert.equal(seen[0][1],'baer105-1w-munah-four-glyphs-1');assert.equal(seen[2][1],'baer105-1w-munah-four-glyphs-5');assert.equal(seen[3][2],1);assert.equal(player.context,undefined);
});

test('both distributions embed the exact new source record and image bytes without altering the original Cohen catalogue',()=>{
 const bundle=read('app.bundle.js').toString(),portable=restoredPortableHtml(read('TropeTrain.html')).toString();
 for(const spec of [...Object.values(data.source.pages),...Object.values(data.source.detailImages),data.source.contextImage])for(const html of [bundle,portable])assert.ok(html.includes(read(spec.image).toString('base64')),spec.image);
 assert.ok(portable.includes(read('docs/BAER-NO105-PATTERNS.json').toString('base64')));assert.equal(PRINTED_PATTERN_CATALOG.rows.length,18);
});
