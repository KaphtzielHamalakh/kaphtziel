import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Player} from '../audio.js';
import {buildPlan,frequency} from '../music.js';

function fakeAudio(){
  const originals=Object.fromEntries(['window','requestAnimationFrame','cancelAnimationFrame','setInterval','clearInterval'].map(k=>[k,globalThis[k]]));
  let now=10,id=0;const nodes=[],frames=new Map(),timers=new Map();
  const gains=()=>({gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}});
  globalThis.window={AudioContext:class{
    get currentTime(){return now;}destination={};resume(){return Promise.resolve();}
    createOscillator(){const n={frequency:{},connect(){},disconnect(){},start(at){this.startAt=at;},stop(at){this.stopAt=at;this.cancelled=at===undefined;}};nodes.push(n);return n;}
    createGain(){return gains();}
  }};
  globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
  globalThis.setInterval=fn=>{timers.set(++id,fn);return id;};globalThis.clearInterval=id=>timers.delete(id);
  return {nodes,frames,timers,get now(){return now;},tick(time,{render=true}={}){now=time;for(const fn of [...timers.values()])fn();if(render){const callbacks=[...frames.values()];frames.clear();for(const fn of callbacks)fn();}},
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
