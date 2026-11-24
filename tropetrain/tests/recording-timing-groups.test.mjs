import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {execFileSync} from 'node:child_process';
import {ReferenceLibrary} from '../reference-library.js';import {createRecordingTimingGroups} from '../recording-timing-groups.js';import {RECORDING_TIMING_GROUP_PINS} from '../recording-timing-group-pins.js';import {sourceTimedPracticePlan} from '../measured-practice.js';import {chantCoverage} from '../recorded-practice.js';import {RecordingPlayer,referenceWordAt} from '../recorded-reference.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url)),packed=JSON.parse(gunzipSync(read('data/references/torah-library.json.gz'))),library=()=>new ReferenceLibrary(structuredClone(packed)),lib=library(),groups=await createRecordingTimingGroups(lib);
const reader=(record,section='first')=>record.words.map((w,index)=>({id:w.id+'@'+section,sourceWordId:w.id,sourceHebrew:w.uxlcHebrew,index,sectionId:section}));
const cases=()=>RECORDING_TIMING_GROUP_PINS.map(p=>{const record=lib.byId.get(p.recordingId),words=reader(record),source=p.groups[0],first=words.findIndex(w=>w.sourceWordId===source.wordIds[0]);return {record,words,source,first,last:first+source.wordIds.length-1};});

test('five whole recording groups retain 43 exact marked words and original ZIP endpoints without any individual word times',()=>{
 const original=JSON.parse(execFileSync('python3',[new URL('./source-word-windows-audit.py',import.meta.url).pathname],{encoding:'utf8'})),before=JSON.stringify(packed);let total=0;
 for(const {record,words,source,first,last} of cases()){
  const group=groups.at(words,first+1);assert(group);assert.deepEqual(group.wordIds,source.wordIds);assert.deepEqual(group.readerHebrew,source.readerHebrew);assert.deepEqual(group.occurrenceIds,words.slice(first,last+1).map(w=>w.id));
  const rows=original[record.id].windows;assert.equal(group.startSeconds,rows[first][1]);assert.equal(group.endSeconds,rows[last][2]);assert.equal(group.sourceStartIndex,rows[first][3]);assert.equal(group.sourceEndIndex,rows[last][4]);assert(group.endSeconds<=group.measuredDurationSeconds);
  for(const key of ['individualWordTimes','syllableTimes','phonemes','acousticReview','musicalReview'])assert.equal(group[key],null);
  const plan=groups.plan(words,first,last,{allowTimingGroups:true});assert.equal(plan.rows.length,0);assert.equal(plan.timedWords,0);assert.equal(plan.groupWords,source.wordIds.length);assert.equal(plan.segments.length,1);assert.deepEqual(plan.segments[0].words,[]);assert.equal(referenceWordAt(plan.segments[0],group.startSeconds+.01),null);
  for(const w of record.words.slice(first,last+1)){assert.equal(w.startSeconds,null);assert.equal(w.endSeconds,null);}total+=plan.groupWords;
 }
 assert.equal(total,43);assert.equal(JSON.stringify(packed),before);assert.deepEqual(chantCoverage(lib),JSON.parse(read('docs/CHANT-COVERAGE.json')));
});
test('default and individual-word requests stay withheld; every clipped or incomplete group refuses playback',()=>{
 for(const {words,first,last}of cases()){
  assert.throws(()=>groups.plan(words,first,last),/unreliable/);
  for(let i=first;i<=last;i++){assert.throws(()=>sourceTimedPracticePlan(lib,words,i,i),/unreliable/);assert.throws(()=>groups.plan(words,i,i,{allowTimingGroups:true}),/cuts.*group/);}
  for(const [a,b]of [[first+1,last],[first,last-1],[first-1,last-1]])assert.throws(()=>groups.plan(words,a,b,{allowTimingGroups:true}),/cuts.*group/);
  const clipped=words.slice(first+1,last+1).map((w,index)=>({...w,index}));assert.equal(groups.at(clipped,0),null);assert.throws(()=>groups.plan(clipped,0,clipped.length-1,{allowTimingGroups:true}),/cuts/);
 }
});
test('neighbor words keep their own exact windows around a separate collective segment',()=>{
 for(const {words,first,last}of cases()){
  const plan=groups.plan(words,first-1,last+1,{allowTimingGroups:true});assert.equal(plan.segments.length,3);assert.equal(plan.rows.length,2);assert.equal(plan.timedWords,2);assert.equal(plan.words,last-first+3);
  assert.equal(plan.segments[0].end,plan.segments[1].start);assert.equal(plan.segments[1].end,plan.segments[2].start);assert.equal(plan.segments[1].words.length,0);
  const a=sourceTimedPracticePlan(lib,words,first-1,first-1),b=sourceTimedPracticePlan(lib,words,last+1,last+1);assert.deepEqual(plan.rows,[...a.rows,...b.rows]);
 }
});
test('source pins reject changed timings, issues, word text, ownership and audio before or after eligibility is cached',async()=>{
 const mutations=[r=>r.rawStarts[0]+=.1,r=>r.issues[0].before++,r=>r.sourceWordCount++,r=>r.words[0].uxlcHebrew+='א',r=>r.words[0].startSeconds=0,r=>r.words[0].sourceWords[0].sourceHebrew+='א',r=>r.audio.sha1='0'.repeat(40),r=>r.timingSource.gitBlob='0'.repeat(40)];
 for(const mutate of mutations){const altered=library();mutate(altered.byId.get('pt-portion-13-5'));await assert.rejects(()=>createRecordingTimingGroups(altered),/source changed/);}
 const altered=library(),checked=await createRecordingTimingGroups(altered),record=altered.byId.get('pt-portion-13-5'),words=reader(record);record.rawStarts[0]+=.01;assert.throws(()=>checked.at(words,52),/source changed/);
 const origin=library();origin.source.originalCommit='changed';await assert.rejects(()=>createRecordingTimingGroups(origin),/source changed/);
});
test('changed Hebrew, repeated IDs, reordered members and split sections cannot fabricate a complete occurrence',()=>{
 const {words,first,last}=cases()[0];
 for(const change of [x=>x[first].sourceHebrew+='א',x=>x[first+1].id=x[first].id,x=>[x[first],x[first+1]]=[x[first+1],x[first]],x=>x[first+1].sectionId='different',x=>x[first].index++,x=>delete x[first].sourceWordId]){
  const bad=structuredClone(words);change(bad);assert.equal(groups.at(bad,first+1),null);assert.throws(()=>groups.plan(bad,first,last,{allowTimingGroups:true}),/cuts|No recorded reference/);
 }
});
test('repeated complete sections keep separate occurrence sets and identical original recording windows',()=>{
 const {record,source,first,last}=cases()[0],one=reader(record,'one'),two=reader(record,'two').map(w=>({...w,index:w.index+one.length})),words=[...one,...two];
 const a=groups.at(words,first),b=groups.at(words,first+one.length);assert.notDeepEqual(a.occurrenceIds,b.occurrenceIds);assert.deepEqual(a.wordIds,b.wordIds);assert.equal(a.startSeconds,b.startSeconds);assert.equal(a.endSeconds,b.endSeconds);
 const mixed=[...one.slice(first,last),two[last]] .map((w,index)=>({...w,index}));assert.equal(groups.at(mixed,0),null);
 assert.equal(groups.plan(words,first+one.length,last+one.length,{allowTimingGroups:true}).groupWords,source.wordIds.length);
});
test('count-mismatch and duration-overflow words never gain a group or inferred timing, including with the option enabled',()=>{
 let count=0;
 for(const record of lib.recordings.filter(r=>lib.timingPolicy(r).kind==='withheld')){const words=reader(record);for(let i=0;i<words.length;i++){assert.equal(groups.at(words,i),null);assert.throws(()=>groups.plan(words,i,i,{allowTimingGroups:true}),/unreliable/);count++;}}
 assert.equal(count,748);
 const record=lib.byId.get('pt-portion-06-6'),words=reader(record),overflow=words.map((w,i)=>w.sourceWordId.startsWith('gen-28-4-')?i:null).filter(i=>i!==null);assert.equal(overflow.length,16);for(const i of overflow){assert.equal(groups.at(words,i),null);assert.throws(()=>groups.plan(words,i,i,{allowTimingGroups:true}),/measurements.*review/);}
});

class Media extends EventTarget{constructor(){super();this.readyState=1;this.duration=1000;this.currentTime=0;this.paused=true;this.volume=0;this.preservesPitch=true;this.plays=0;}play(){this.paused=false;this.plays++;return Promise.resolve();}pause(){this.paused=true;}}
function playerFixture(){let wall=0,n=0,ended=0;const media=new Media(),frames=new Map(),seen=[],collective=[],errors=[];const player=new RecordingPlayer(media,{clock:()=>wall,frame:fn=>{frames.set(++n,fn);return n;},cancelFrame:id=>frames.delete(id),onWord:w=>seen.push(w),onGroup:(g,c)=>collective.push({group:g,clock:c}),onEnd:()=>ended++,onError:e=>errors.push(e)});return{media,player,seen,collective,errors,get ended(){return ended;},setTime:t=>wall=t,step(){const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn());}};}
const settle=()=>new Promise(r=>setImmediate(r));
test('muted collective playback exposes only a whole-group clock, stops and repeats at exact original outer boundaries',async()=>{
 const {words,first,last}=cases()[0],plan=groups.plan(words,first,last,{allowTimingGroups:true}),segment=plan.segments[0],f=playerFixture(),length=segment.end-segment.start;await f.player.playSegments(plan.segments,true);
 assert.equal(f.media.currentTime,segment.start);assert.equal(f.media.plays,0);assert(f.seen.every(w=>w===null));assert.deepEqual(f.collective.at(-1).group.occurrenceIds,words.slice(first,last+1).map(w=>w.id));
 f.setTime(length/2);f.step();assert(Math.abs(f.collective.at(-1).clock.progress-.5)<1e-10);assert(f.seen.every(w=>w===null));
 f.setTime(length+.001);f.step();await settle();assert.equal(f.media.currentTime,segment.start);assert.equal(f.player.running,true);f.player.repeat=false;f.setTime(2*length+.01);f.step();await settle();assert.equal(f.ended,1);assert.equal(f.player.running,false);assert.equal(f.collective.at(-1).group,null);assert.equal(f.media.paused,true);assert.deepEqual(f.errors,[]);
});
test('mixed source-word and collective segments never assign a group member a word callback or change the source-speed clock',async()=>{
 const {words,first,last}=cases()[0],plan=groups.plan(words,first-1,last+1,{allowTimingGroups:true}),f=playerFixture();f.player.setRate(1.5);await f.player.playSegments(plan.segments,false);assert.equal(f.seen.at(-1).occurrenceId,words[first-1].id);
 const firstDuration=(plan.segments[0].end-plan.segments[0].start)/1.5;f.setTime(firstDuration+.001);f.step();await settle();assert(f.collective.at(-1).group);assert.equal(f.seen.at(-1),null);
 const groupDuration=(plan.segments[1].end-plan.segments[1].start)/1.5;f.setTime(firstDuration+groupDuration+.005);f.step();await settle();assert.equal(f.collective.at(-1).group,null);assert.equal(f.seen.at(-1).occurrenceId,words[last+1].id);assert.equal(f.media.playbackRate,1.5);f.player.stop();assert.equal(f.media.plays,0);assert.deepEqual(f.errors,[]);
});
