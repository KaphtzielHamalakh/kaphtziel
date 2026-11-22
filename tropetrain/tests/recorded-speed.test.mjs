import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RecordingPlayer,recordingRate} from '../recorded-reference.js';

class Media extends EventTarget{
 constructor(){super();this.readyState=1;this.duration=20;this.currentTime=0;this.playbackRate=1;this.preservesPitch=false;this.volume=0;this.paused=true;this.plays=0;}
 async play(){this.plays++;this.paused=false;}
 pause(){this.paused=true;}
 load(){}
}
const row=(i,start,end,id='take',occurrence=`gen-1-1-${i+1}@one`)=>Object.freeze({id:`gen-1-1-${i+1}`,occurrenceId:occurrence,wordIndex:i,referenceIndex:i,recordingId:id,startSeconds:start,endSeconds:end,sourceHebrew:'בְּרֵאשִׁ֖ית',uxlcHebrew:'בְּרֵאשִׁ֖ית'});
function fixture(media=new Media(),options={}){
 let clock=0,n=0,ended=0;const frames=new Map(),seen=[],errors=[];
 const player=new RecordingPlayer(media,{clock:()=>clock,frame:f=>{frames.set(++n,f);return n;},cancelFrame:id=>frames.delete(id),onWord:w=>seen.push(w?.occurrenceId??null),onEnd:()=>ended++,onError:e=>errors.push(e),...options});
 return {player,media,seen,errors,time:t=>clock=t,step(){const batch=[...frames.values()];frames.clear();batch.forEach(f=>f());},get ended(){return ended;},get frames(){return frames.size;}};
}
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};

test('recorded rate accepts only finite bounded numbers and refuses bad input without changing playback',()=>{
 const f=fixture();for(const percent of [50,65,75,85,100,115,125,150])assert.equal(recordingRate(percent/100),percent/100);
 f.player.setRate(.75);for(const value of [0,-1,.49,1.51,Infinity,NaN,'0.75',null,{},undefined]){
  assert.throws(()=>f.player.setRate(value),/50% and 150%/);assert.equal(f.player.rate,.75);assert.equal(f.media.playbackRate,.75);
 }
 assert.equal(f.media.preservesPitch,true);assert.equal(f.media.plays,0);
});
test('half-speed muted source clock honors exact source-word and selection-end boundaries without starting audio',async()=>{
 const f=fixture(),rows=[row(0,2,3),row(1,3,4)];f.player.setRate(.5);await f.player.play(rows);
 f.time(1.99);f.step();assert.equal(f.player.now(),2.995);assert.equal(f.seen.at(-1),rows[0].occurrenceId);
 f.time(2);f.step();assert.equal(f.player.now(),3);assert.equal(f.seen.at(-1),rows[1].occurrenceId);
 f.time(4);f.step();assert.equal(f.ended,1);assert.equal(f.player.running,false);assert.equal(f.frames,0);assert.equal(f.media.plays,0);
});
test('live muted speed changes anchor the current source position rather than rescaling elapsed history',async()=>{
 const f=fixture();f.player.setRate(.75);await f.player.play([row(0,2,15)]);f.time(2);assert.equal(f.player.now(),3.5);
 f.player.setRate(1.5);assert.equal(f.player.now(),3.5);f.time(3);assert.equal(f.player.now(),5);
 f.player.setRate(.5);assert.equal(f.player.now(),5);f.time(5);assert.equal(f.player.now(),6);assert.equal(f.media.plays,0);f.player.stop();
});
test('audible rate changes preserve source seconds and explicitly request the original pitch',async()=>{
 const media=new Media();media.volume=.4;const f=fixture(media);f.player.setRate(.65);await f.player.play([row(0,2,8)]);
 assert.equal(media.playbackRate,.65);assert.equal(media.preservesPitch,true);assert.equal(media.plays,1);
 media.currentTime=4.25;f.player.setRate(1.25);assert.equal(f.player.now(),4.25);assert.equal(media.currentTime,4.25);assert.equal(media.playbackRate,1.25);assert.equal(media.preservesPitch,true);
 media.currentTime=8;f.step();assert.equal(f.ended,1);assert.equal(media.paused,true);assert.equal(f.frames,0);
});
test('non-original rates survive mute and unmute without seeking to wall-clock rather than source time',async()=>{
 const f=fixture();f.player.setRate(.5);await f.player.play([row(0,2,15)]);f.time(3);await f.player.setVolume(.3);
 assert.equal(f.media.currentTime,3.5);assert.equal(f.media.playbackRate,.5);assert.equal(f.media.preservesPitch,true);
 f.media.currentTime=5;await f.player.setVolume(0);f.time(5);assert.equal(f.player.now(),6);f.player.setRate(1.5);f.time(6);await f.player.setVolume(.2);
 assert.equal(f.media.currentTime,7.5);assert.equal(f.media.playbackRate,1.5);assert.equal(f.media.plays,2);f.player.stop();assert.equal(f.frames,0);
});
test('speed survives file changes and repeated occurrence IDs while immutable Hebrew and original times remain exact',async()=>{
 const f=fixture(new Media(),{resolveSource:async id=>'verified:'+id});const rows=[row(0,2,3,'one'),row(0,5,6,'two','gen-1-1-1@two')],before=JSON.stringify(rows);
 f.player.setRate(.5);await f.player.play(rows,true);f.time(2);f.step();await settle();assert.equal(f.seen.at(-1),rows[1].occurrenceId);assert.equal(f.media.currentTime,5);assert.equal(f.media.playbackRate,.5);
 f.player.setRate(1.5);f.time(3);f.step();await settle();assert.equal(f.seen.at(-1),rows[0].occurrenceId);assert.equal(f.media.playbackRate,1.5);assert.equal(f.media.currentTime,2);
 f.player.repeat=false;f.time(4);f.step();await settle();f.time(5);f.step();await settle();assert.equal(f.ended,1);assert.equal(f.frames,0);assert.equal(JSON.stringify(rows),before);assert.equal(f.media.plays,0);
});
test('browsers without native pitch preservation retain original-speed playback and reject altered rate',async()=>{
 const media=new Media();delete media.preservesPitch;const f=fixture(media);assert.equal(f.player.canPreservePitch,false);
 assert.throws(()=>f.player.setRate(.75),/cannot preserve/);assert.equal('preservesPitch' in media,false);assert.equal(f.player.rate,1);
 await f.player.play([row(0,2,4)]);f.time(1);assert.equal(f.player.now(),3);assert.equal(media.playbackRate,1);assert.equal(media.plays,0);f.player.stop();
});
test('a browser ignoring its pitch-preservation setter cannot silently enable a different pitch',()=>{
 const media=new Media();Object.defineProperty(media,'preservesPitch',{get:()=>false,set:()=>{}});const f=fixture(media);
 assert.throws(()=>f.player.setRate(.75),/Pitch preservation is unavailable/);assert.equal(f.player.rate,1);assert.equal(media.playbackRate,1);assert.equal(media.plays,0);
});
test('rate changes during source loading apply to the next segment, and Stop invalidates late source readiness',async()=>{
 let resolve;const f=fixture(new Media(),{resolveSource:()=>new Promise(r=>resolve=r)}),rows=[row(0,2,4)];
 const pending=f.player.play(rows);f.player.setRate(1.15);resolve('verified:take');await pending;assert.equal(f.media.playbackRate,1.15);assert.equal(f.player.running,true);f.player.stop();
 const stopped=f.player.play(rows);f.player.setRate(.85);f.player.stop();resolve('verified:late');await stopped;assert.equal(f.media.plays,0);assert.equal(f.player.running,false);assert.equal(f.frames,0);assert.equal(f.errors.length,0);
});
