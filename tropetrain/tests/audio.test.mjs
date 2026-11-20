import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Player} from '../audio.js';
import {buildPlan,frequency} from '../music.js';

function fakeAudio({resumeResult=()=>Promise.resolve()}={}){
  const originals=Object.fromEntries(['window','requestAnimationFrame','cancelAnimationFrame','setInterval','clearInterval'].map(k=>[k,globalThis[k]]));
  let now=10,id=0,suspends=0,resumes=0,contexts=0;const nodes=[],frames=new Map(),timers=new Map();
  const gains=()=>({gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}});
  globalThis.window={AudioContext:class{
    constructor(){contexts++;}
    get currentTime(){return now;}destination={};resume(){resumes++;return resumeResult();}suspend(){suspends++;return Promise.resolve();}
    createOscillator(){const n={frequency:{},connect(){},disconnect(){},start(at){this.startAt=at;},stop(at){this.stopAt=at;this.cancelled=at===undefined;}};nodes.push(n);return n;}
    createGain(){return gains();}
  }};
  globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
  globalThis.setInterval=fn=>{timers.set(++id,fn);return id;};globalThis.clearInterval=id=>timers.delete(id);
  return {nodes,frames,timers,get now(){return now;},get contexts(){return contexts;},get suspends(){return suspends;},get resumes(){return resumes;},tick(time,{render=true}={}){now=time;for(const fn of [...timers.values()])fn();if(render){const callbacks=[...frames.values()];frames.clear();for(const fn of callbacks)fn();}},
    restore(){for(const [key,value] of Object.entries(originals))globalThis[key]=value;}};
}

test('audio-clock playback schedules each selected event and stops at the exact boundary',async()=>{
  const env=fakeAudio(),seen=[];let ends=0;const player=new Player(e=>seen.push(e.wordId),()=>ends++);
  try{
    const plan=buildPlan(1,3,{tempo:84,transpose:1}),duration=plan.at(-1).startSeconds+plan.at(-1).durationSeconds;
    await player.play(plan);assert.ok(env.nodes.length>0&&env.nodes.length<plan.length);
    for(let t=10.06;t<10.06+duration+.05;t+=.02)env.tick(t);
    assert.equal(env.nodes.length,plan.length);assert.equal(ends,1);assert.equal(player.running,false);
    assert.deepEqual([...new Set(seen)],['gen-1-1-2','gen-1-1-3','gen-1-1-4']);
    plan.forEach((e,i)=>{assert.equal(env.nodes[i].frequency.value,frequency(e.midi));assert.ok(Math.abs(env.nodes[i].startAt-(10.06+e.startSeconds))<1e-10);assert.ok(env.nodes[i].stopAt<=10.06+duration+1e-10);});
    assert.equal(env.timers.size,0);
  }finally{player.stop();env.restore();}
});

test('repeat stays on the audio clock and returns to the selected first word',async()=>{
  const env=fakeAudio(),seen=[];const player=new Player((e,cycle)=>seen.push([e.wordId,cycle]),()=>{});
  try{
    const plan=buildPlan(1,3,{tempo:160}),duration=plan.at(-1).startSeconds+plan.at(-1).durationSeconds;
    await player.play(plan,true);
    for(let t=10.06;t<10.06+duration*2+.1;t+=.02)env.tick(t);
    assert.ok(seen.some(([word,cycle])=>word==='gen-1-1-2'&&cycle===1));
    assert.ok(Math.abs(env.nodes[plan.length].startAt-(10.06+duration))<1e-10);
    player.stop();assert.ok(player.sources.length===0);assert.equal(env.timers.size,0);
    assert.ok(env.nodes.some(n=>n.cancelled));
  }finally{player.stop();env.restore();}
});

test('long readings keep a bounded audio queue even when visual frames are delayed',async()=>{
  const env=fakeAudio(),player=new Player(()=>{},()=>{});
  try{
    const plan=Array.from({length:10000},(_,i)=>({midi:62,startSeconds:i/10,durationSeconds:.1,wordId:'long'}));
    await player.play(plan);assert.ok(env.nodes.length<=6);
    for(let t=10.1;t<12;t+=.05){env.tick(t,{render:false});assert.ok(player.sources.length<=7);}
    assert.ok(env.nodes.length>15&&env.nodes.length<30);player.stop();assert.equal(env.timers.size,0);
  }finally{player.stop();env.restore();}
});

test('invalid note timing is rejected before starting sound',async()=>{
  const env=fakeAudio(),player=new Player(()=>{},()=>{});
  try{await assert.rejects(player.play([]),/no notes/);await assert.rejects(player.play([{midi:62,startSeconds:0,durationSeconds:0}]),/invalid timing/);assert.equal(env.nodes.length,0);}
  finally{player.stop();env.restore();}
});

test('printed tied components use one oscillator and rests emit silence frames without shifting the clock',async()=>{
 const env=fakeAudio(),seen=[],rests=[];let ends=0;
 const player=new Player(e=>seen.push(e.id),()=>ends++,(cycle,progress)=>rests.push([cycle,progress]));
 const plan=[{id:'a',wordId:'word',syllableId:'syllable',midi:64,startSeconds:0,durationSeconds:.5,beats:.5,tieId:'held',tieStart:true},
  {id:'b',wordId:'word',syllableId:'syllable',midi:64,startSeconds:.5,durationSeconds:.5,beats:.5,tieId:'held',tieStop:true},
  {id:'c',wordId:'next',syllableId:'next-s',midi:67,startSeconds:1.5,durationSeconds:.5,beats:.5}];
 try{
  await player.play(plan);env.tick(10.66);assert.equal(env.nodes.length,1);assert.equal(env.nodes[0].stopAt,11.06);assert.equal(seen.at(-1),'b');
  env.tick(11.26);assert.equal(rests.length,1);assert.equal(seen.at(-1),'b');
  env.tick(11.66);assert.equal(env.nodes.length,2);assert.equal(env.nodes[1].startAt,11.56);assert.equal(seen.at(-1),'c');
  env.tick(12.07);assert.equal(ends,1);assert.equal(player.running,false);
 }finally{player.stop();env.restore();}
});

test('completion and explicit stop suspend idle device audio; a new play resumes it without an internal suspend',async()=>{
 const env=fakeAudio(),player=new Player(()=>{},()=>{}),plan=buildPlan(0,0,{tempo:160});
 try{
  await player.play(plan);assert.equal(env.resumes,1);assert.equal(env.suspends,0);
  env.tick(10.06+plan.at(-1).startSeconds+plan.at(-1).durationSeconds+.01);assert.equal(player.running,false);assert.equal(env.suspends,1);
  await player.play(plan);assert.equal(env.resumes,2);assert.equal(env.suspends,1);
  player.stop();assert.equal(env.suspends,2);await player.play(plan);assert.equal(env.resumes,3);assert.equal(env.suspends,2);
 }finally{player.stop();env.restore();}
});

test('zero-volume practice advances notes, rests and repeats without allocating any audio device',async()=>{
 const env=fakeAudio();let wall=0,ends=0;const seen=[],rests=[],player=new Player((e,c)=>seen.push([e.id,c]),()=>ends++,(c)=>rests.push(c),{wallClock:()=>wall});
 const plan=[{id:'a',wordId:'first',midi:64,beats:.5,startSeconds:0,durationSeconds:.5},{id:'b',wordId:'last',midi:67,beats:.5,startSeconds:1,durationSeconds:.5}];
 try{
  player.setVolume(0);await player.play(plan);assert.equal(env.contexts,0);assert.equal(env.resumes,0);assert.equal(env.nodes.length,0);
  wall=.1;env.tick(10);assert.deepEqual(seen.at(-1),['a',0]);
  wall=.8;env.tick(10);assert.equal(rests.length,1);
  wall=1.2;env.tick(10);assert.deepEqual(seen.at(-1),['b',0]);
  wall=1.57;env.tick(10);assert.equal(ends,1);assert.equal(player.running,false);assert.equal(env.timers.size,0);
  await player.play(plan,true);wall+=1.7;env.tick(10);assert.deepEqual(seen.at(-1),['a',1]);assert.equal(env.contexts,0);
  player.stop();assert.equal(env.timers.size,0);assert.equal(env.frames.size,0);
 }finally{player.stop();env.restore();}
});

test('unmuting resumes the current note tail and later mute/unmute cycles keep the same musical position',async()=>{
 const env=fakeAudio();let wall=0;const seen=[],player=new Player(e=>seen.push(e.id),()=>{},undefined,{wallClock:()=>wall});
 const plan=[{id:'held',wordId:'one',midi:64,startSeconds:0,durationSeconds:2},{id:'next',wordId:'two',midi:67,startSeconds:2,durationSeconds:1}];
 try{
  player.setVolume(0);await player.play(plan);wall=.56;env.tick(10);assert.equal(seen.at(-1),'held');
  await player.setVolume(.5);assert.equal(env.contexts,1);assert.equal(env.nodes[0].frequency.value,frequency(64));assert.equal(env.nodes[0].startAt,10);assert.equal(env.nodes[0].stopAt,11.5);
  wall=1.06;env.tick(10.5);assert.equal(seen.at(-1),'held');player.setVolume(0);assert.ok(env.nodes[0].cancelled);
  wall=1.86;env.tick(10.5);assert.equal(seen.at(-1),'held');
  await player.setVolume(.25);assert.equal(env.resumes,2);assert.equal(env.nodes.at(-2).frequency.value,frequency(64));assert.ok(env.nodes.at(-2).startAt>=env.now);assert.ok(Math.abs(env.nodes.at(-2).stopAt-10.7)<1e-8);
  env.tick(10.8);assert.equal(seen.at(-1),'next');assert.equal(env.nodes.at(-1).frequency.value,frequency(67));
 }finally{player.stop();env.restore();}
});

test('Stop cancels a pending unmute before any oscillator or stale highlight can start',async()=>{
 let resolve;const gate=new Promise(r=>{resolve=r;}),env=fakeAudio({resumeResult:()=>gate});let wall=0;const seen=[];
 const player=new Player(e=>seen.push(e.id),()=>{},undefined,{wallClock:()=>wall});
 try{
  player.setVolume(0);await player.play([{id:'note',midi:64,startSeconds:0,durationSeconds:2}]);
  wall=.2;env.tick(10);const pending=player.setVolume(.5);assert.equal(env.contexts,1);player.stop();const count=seen.length;
  resolve();await pending;wall=1;env.tick(10);assert.equal(env.nodes.length,0);assert.equal(seen.length,count);assert.equal(player.running,false);assert.equal(env.timers.size,0);
 }finally{resolve();player.stop();env.restore();}
});

test('returning to zero while an unmute is pending preserves muted timing and releases device audio',async()=>{
 let resolve;const gate=new Promise(r=>{resolve=r;}),env=fakeAudio({resumeResult:()=>gate});let wall=0;const seen=[];
 const player=new Player(e=>seen.push(e.id),()=>{},undefined,{wallClock:()=>wall});
 try{
  player.setVolume(0);await player.play([{id:'first',midi:64,startSeconds:0,durationSeconds:1},{id:'second',midi:67,startSeconds:1,durationSeconds:1}]);
  wall=.2;env.tick(10);const pending=player.setVolume(.5);player.setVolume(0);resolve();await pending;
  assert.equal(env.nodes.length,0);assert.equal(env.suspends,1);wall=1.2;env.tick(10);assert.equal(seen.at(-1),'second');assert.equal(player.running,true);
 }finally{resolve();player.stop();env.restore();}
});
