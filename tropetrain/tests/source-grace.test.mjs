import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import engine from 'web-audio-engine';
import {BAER_PATTERN_ROW} from '../baer-pattern-data.js';
import {baerComponentRoutes} from '../baer-notation.js';
import {BAER_PATTERN_ID,baerPatternPlan,printedPatternDuration} from '../baer-patterns.js';
import {availablePatternModes,printedPatternPlan} from '../printed-patterns.js';
import {GRACE_DEMO,validateGraceEvent} from '../source-grace.js';
import {eventRhythm} from '../score-data.js';
import {staffMarkup} from '../staff.js';
import {validatePlan,soundingNotes} from '../synthesis.js';
import {renderWav} from '../wav.js';

const data=BAER_PATTERN_ROW.record,id='telisha-qetana',figure=data.figures.find(f=>f.id===id);
const components=data.notes.filter(n=>n.cell===id);
const plan=options=>printedPatternPlan(id,{sourceId:BAER_PATTERN_ID,tempo:60,transpose:0,graceDemo:true,...options});
const close=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} differs from ${b}`);

test('literal Telisha Qetana keeps twelve printed pitches, three unmeasured small notes and every prior component',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(data.notes.slice(0,217))).digest('hex'),'c9bc42a357794d26cf816839f491e6a96ae84bf6f9e830d6c701dd2b2d2e8438');
 assert.equal(figure.status,'unmeasured-grace');assert.equal(figure.review,null);assert.equal(figure.wordApplication,null);
 assert.deepEqual(components.map(n=>n.midi),[65,65,65,65,65,65,67,65,64,69,65,60]);
 assert.deepEqual(components.map(n=>n.quarterBeats),[.25,.5,.75,.25,.5,1,null,null,null,.5,.5,1]);
 assert.deepEqual(components.filter(n=>n.grace).map(n=>[n.rhythm.type,n.grace.printedSize,n.grace.printedBeams,n.grace.duration,n.grace.stealTimePrevious,n.grace.stealTimeFollowing]),Array.from({length:3},()=>['32nd','small',3,null,null,null]));
 assert.equal(components.filter(n=>!n.grace).reduce((b,n)=>b+n.quarterBeats,0),5.25);
 assert.throws(()=>baerComponentRoutes(data,figure),/Unmeasured/);
 assert.equal(baerComponentRoutes(data,figure,{allowUnmeasuredGrace:true})[0].components.length,12);
});

test('unmeasured notation never becomes default playback and an explicit demo enables only the transcribed grace figure',()=>{
 assert(!availablePatternModes(BAER_PATTERN_ID).some(m=>m.id===id));
 assert(availablePatternModes(BAER_PATTERN_ID,{graceDemo:true}).some(m=>m.id===id));
 for(const flag of [undefined,false,'true',1])assert.throws(()=>baerPatternPlan(id,{graceDemo:flag}),/optional original instrumental/);
 for(const f of data.figures.filter(f=>!['transcribed','unmeasured-grace'].includes(f.status)))assert.throws(()=>baerPatternPlan(f.id,{graceDemo:true}),/awaits literal notation or timing review/);
 assert.equal(plan().length,12);assert.equal(availablePatternModes(BAER_PATTERN_ID).length,32);
});

test('original eighty-millisecond timing is separate from source rhythm, tempo, key and null word allocation',()=>{
 const before=JSON.stringify(data),a=plan(),b=plan({tempo:120}),key=plan({transpose:2});
 close(printedPatternDuration(a),5.49);close(printedPatternDuration(b),2.865);close(validatePlan(a),5.49);
 assert.equal(soundingNotes(a).length,12);
 for(let i=0;i<a.length;i++){
  assert.equal(key[i].midi,a[i].midi+2);assert.equal(key[i].startSeconds,a[i].startSeconds);assert.equal(key[i].id,a[i].id);
  assert.deepEqual(key[i].sourcePitch,a[i].sourcePitch);assert.deepEqual(b[i].sourceRhythm,a[i].sourceRhythm);
  for(const name of ['wordId','sourceWordId','syllableId','syllable','phonemes'])assert.equal(a[i][name],null);
  if(a[i].sourceGrace){
   assert.equal(a[i].durationSeconds,.08);assert.equal(b[i].durationSeconds,.08);assert.equal(a[i].sourceQuarterBeats,null);
   assert.equal(a[i].performanceTiming.id,GRACE_DEMO.id);assert.equal(a[i].performanceTiming.sourceDuration,null);assert.equal(a[i].performanceTiming.review,null);
   assert(Object.isFrozen(a[i].sourceGrace));assert(Object.isFrozen(a[i].performanceTiming));
   assert.deepEqual(eventRhythm(a[i]),components[i].rhythm);
  }else close(b[i].durationSeconds,a[i].durationSeconds/2);
 }
 assert.equal(JSON.stringify(data),before);
});

test('incomplete or altered grace groups fail instead of acquiring ordinary thirty-second-note durations',()=>{
 for(const mutation of ['missing','order','anchor','duration','ratio','beam']){
  const record=structuredClone(data),f=record.figures.find(f=>f.id===id),n=record.notes.find(n=>n.cell===id&&n.grace);
  if(mutation==='missing')record.notes.splice(record.notes.indexOf(n),1);
  if(mutation==='order')n.grace.order=3;
  if(mutation==='anchor')n.grace.nextComponentId='baer105-1w-zarqa-1';
  if(mutation==='duration')n.quarterBeats=.125;
  if(mutation==='ratio')n.grace.stealTimePrevious=10;
  if(mutation==='beam')n.grace.printedBeams=2;
  assert.throws(()=>baerComponentRoutes(record,f,{allowUnmeasuredGrace:true}),/grace|Grace/);
 }
});

test('engraving and inspection preserve small grace shapes and reject missing demo provenance or invented word fitting',()=>{
 const p=plan(),svg=staffMarkup(p,[],0,p.length,{untexted:true});
 assert.equal((svg.match(/rx="3.8" ry="2.6"/g)||[]).length,3);
 assert.equal((svg.match(/data-source-timing="unmeasured-grace"/g)||[]).length,3);
 assert.equal((svg.match(/data-performance-timing="original-grace-demo-80ms-v1"/g)||[]).length,3);
 for(const c of components)assert(svg.includes(`data-event="${c.id}"`));
 const g=p.find(e=>e.sourceGrace);
 for(const mutation of ['provenance','source-duration','word','rhythm']){
  const bad=structuredClone(g);
  if(mutation==='provenance')delete bad.performanceTiming;
  if(mutation==='source-duration')bad.sourceQuarterBeats=.125;
  if(mutation==='word')bad.wordId='num-35-5-7';
  if(mutation==='rhythm')delete bad.sourceRhythm;
  assert.throws(()=>validateGraceEvent(bad),/grace|Grace/);assert.throws(()=>eventRhythm(bad),/grace|Grace/);
 }
});

test('offline synthesis sounds each explicitly timed grace without opening an audio device',async()=>{
 const p=plan(),rate=8000,r=await renderWav(p,{sampleRate:rate,createContext:(length,sampleRate)=>new engine.OfflineAudioContext(1,length,sampleRate)}),view=new DataView(await r.blob.arrayBuffer());
 assert.equal(r.frames,43920);
 for(const e of p.filter(e=>e.sourceGrace)){
  const from=Math.ceil((e.startSeconds+.015)*rate),to=Math.floor((e.startSeconds+.06)*rate);
  assert(Array.from({length:to-from},(_,i)=>view.getInt16(44+(from+i)*2,true)).some(sample=>sample!==0));
 }
});

test('muted live playback visits all twelve source IDs and finishes on the explicit demonstration clock',async t=>{
 let player,clock=0;const original=globalThis.cancelAnimationFrame;globalThis.cancelAnimationFrame=()=>{};
 t.after(()=>{player?.stop();if(original===undefined)delete globalThis.cancelAnimationFrame;else globalThis.cancelAnimationFrame=original;});
 const {Player}=await import('../audio.js'),p=plan(),seen=[];
 player=new Player(e=>seen.push(e.id),()=>seen.push('finished'),null,{wallClock:()=>clock});player.setVolume(0);await player.play(p,false);
 for(const e of p){clock=player.start+e.startSeconds+e.durationSeconds/2;player.paint();}
 clock=player.start+5.5;player.paint();
 assert.deepEqual(seen,[...p.map(e=>e.id),'finished']);assert.equal(player.context,undefined);
});
