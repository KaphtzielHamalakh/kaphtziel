import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {ReferenceLibrary} from '../reference-library.js';
import {chantCoverage,chantPracticePlan,practiceAudioMode} from '../recorded-practice.js';
import {RecordingPlayer} from '../recorded-reference.js';
const read=name=>readFileSync(new URL('../'+name,import.meta.url));
const library=new ReferenceLibrary(JSON.parse(gunzipSync(read('data/references/torah-library.json.gz'))));

test('every Torah word stays mapped; exact source-timed coverage and all eight gaps are inspectable without inventing timestamps',()=>{
 const coverage=chantCoverage(library);assert.deepEqual(coverage,JSON.parse(read('docs/CHANT-COVERAGE.json')));
 assert.ok(restoredPortableHtml(read('TropeTrain.html')).toString().includes(read('docs/CHANT-COVERAGE.json').toString('base64')));
 assert.equal(coverage.words,79985);assert.equal(coverage.sourceTimedWords,79194);assert.equal(coverage.reviewWords,791);assert.equal(coverage.gaps.length,8);
 assert.equal(coverage.books.length,5);assert.equal(coverage.books[0].sourceTimedWords,20614);
 assert.equal(coverage.sourceTimedWords+coverage.reviewWords,coverage.words);
 for(const record of library.recordings){
  const words=record.words.map((w,i)=>({id:w.id+'@occurrence',sourceWordId:w.id,sourceHebrew:w.uxlcHebrew,index:i})),before=JSON.stringify(words);
  if(record.status==='aligned'){
   const plan=chantPracticePlan(library,words,0,words.length-1);assert.equal(plan.words,words.length);assert.deepEqual(plan.records,[record]);assert.equal(plan.bytes,record.audio.bytes);
   assert.equal(plan.rows[0].occurrenceId,words[0].id);
  }else if(library.timingPolicy(record).eligibleWords){assert(chantPracticePlan(library,words,0,0));assert.throws(()=>chantPracticePlan(library,words,0,words.length-1),/unreliable source timings/);}
  else assert.throws(()=>chantPracticePlan(library,words,0,0),/unreliable source timings/);
  assert.equal(JSON.stringify(words),before);
 }
});
test('recorded mode is independent of a melody/Accent identifier and rejects unsupported text instead of substituting another sound',()=>{
 assert.equal(practiceAudioMode('recorded'),'recorded');for(const v of ['Galician','cohen-1902-gen22-ending',null,{}])assert.equal(practiceAudioMode(v),'instrument');
 assert.throws(()=>chantPracticePlan(null,[],0,0),/catalog is loading/);
 assert.throws(()=>chantPracticePlan(library,[{id:'isa-40-1-1',sourceHebrew:'נַחֲמ֥וּ'}],0,0),/No recorded reference/);
 const word=library.byWord.get('gen-1-1-1').word;assert.throws(()=>chantPracticePlan(library,[{id:word.id,sourceHebrew:'ב'}],0,0),/source changed/);
});
class Media extends EventTarget {
 constructor(){super();this.readyState=1;this.duration=10;this.currentTime=0;this.paused=true;this.volume=0;this.plays=0;}
 async play(){this.plays++;this.paused=false;}
 pause(){this.paused=true;}
}
function fixture(){
 let wall=0,n=0,ended=0;const media=new Media(),frames=new Map(),seen=[],errors=[];
 const player=new RecordingPlayer(media,{clock:()=>wall,frame:fn=>{frames.set(++n,fn);return n;},cancelFrame:id=>frames.delete(id),onWord:w=>seen.push(w?.occurrenceId??null),onEnd:()=>ended++,onError:e=>errors.push(e)});
 return {player,media,seen,errors,setTime:value=>wall=value,get ended(){return ended;},get frames(){return frames.size;},step(){const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn());}};
}
const row=(index,start,end,id='source')=>({recordingId:id,referenceIndex:index,startSeconds:start,endSeconds:end,occurrenceId:id+'-'+index});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('zero-volume word chanting follows the source clock and naturally finishes without calling media.play',async()=>{
 const f=fixture();await f.player.play([row(0,2,3),row(1,3,4)]);assert.equal(f.media.plays,0);assert.equal(f.seen.at(-1),'source-0');
 f.setTime(1);f.step();assert.equal(f.seen.at(-1),'source-1');assert.equal(f.media.currentTime,2);
 f.setTime(2);f.step();assert.equal(f.ended,1);assert.equal(f.player.running,false);assert.equal(f.frames,0);assert.equal(f.media.paused,true);
});
test('muted chanting crosses file/assignment boundaries, repeats and stops while retaining occurrence IDs',async()=>{
 const f=fixture();await f.player.play([row(0,1,2,'one'),row(3,4,5,'two')],true);
 f.setTime(1);f.step();await settle();assert.equal(f.seen.at(-1),'two-3');assert.equal(f.media.currentTime,4);
 f.setTime(2);f.step();await settle();assert.equal(f.seen.at(-1),'one-0');assert.equal(f.media.plays,0);
 f.player.repeat=false;f.setTime(3);f.step();await settle();f.setTime(4);f.step();assert.equal(f.ended,1);assert.equal(f.frames,0);
});
test('recorded volume transitions preserve word position and original playback rate, and Stop invalidates stale unmute',async()=>{
 const f=fixture();await f.player.play([row(0,2,8)]);f.setTime(1.25);f.step();await f.player.setVolume(.3);assert.equal(f.media.currentTime,3.25);assert.equal(f.media.playbackRate,1);assert.equal(f.media.plays,1);
 f.media.currentTime=4;await f.player.setVolume(0);f.setTime(2);f.step();assert.equal(f.player.now(),4.75);assert.equal(f.media.paused,true);
 let reject;f.media.play=()=>new Promise((_,fail)=>reject=fail);const pending=f.player.setVolume(.3);f.player.stop();reject(Error('late failure'));await pending;assert.equal(f.errors.length,0);assert.equal(f.frames,0);
});
test('a late sound transition from the preceding recording cannot stop the next segment',async()=>{
 const f=fixture(),pending=[];await f.player.play([row(0,0,1,'one'),row(0,2,3,'two')]);
 f.media.play=()=>{f.media.paused=false;return new Promise((resolve,reject)=>pending.push({resolve,reject}));};
 const old=f.player.setVolume(.3);f.media.currentTime=1;f.step();await settle();assert.equal(pending.length,2);
 pending[0].reject(Error('previous segment'));await old;assert.equal(f.player.running,true);assert.equal(f.errors.length,0);
 pending[1].resolve();await settle();f.player.stop();assert.equal(f.frames,0);
});
