import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Player} from '../audio.js';
import {buildPlan,frequency} from '../music.js';

test('audio clock enforces selected boundaries, repeat start, frequencies and stop',async()=>{
  const nodes=[],frames=[];let now=10;
  globalThis.window={AudioContext:class{
    get currentTime(){return now;}destination={};resume(){return Promise.resolve();}
    createOscillator(){const node={frequency:{},connect(){},disconnect(){},start(at){this.startAt=at;},stop(at){this.stopAt=at;}};nodes.push(node);return node;}
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};}
  }};
  globalThis.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
  globalThis.cancelAnimationFrame=()=>{};
  let last,endCount=0;
  const player=new Player((event,cycle)=>{last={event,cycle};},()=>endCount++);
  const plan=buildPlan(1,3,{tempo:84,transpose:1});
  const duration=plan.at(-1).startSeconds+plan.at(-1).durationSeconds;
  await player.play(plan,false);
  assert.equal(nodes.length,plan.length);
  plan.forEach((e,i)=>{assert.equal(nodes[i].frequency.value,frequency(e.midi));assert.ok(Math.abs(nodes[i].startAt-(10.06+e.startSeconds))<1e-10);assert.ok(nodes[i].stopAt<=10.06+duration+1e-10);});
  now=10.061;frames.shift()();assert.equal(last.event.wordId,'gen-1-1-2');
  now=10.06+duration+1e-7;frames.shift()();assert.equal(endCount,1);assert.equal(player.running,false);
  const count=nodes.length;await player.play(plan,true);
  assert.equal(nodes.length-count,plan.length*2);
  assert.ok(Math.abs(nodes[count+plan.length].startAt-(now+.06+duration))<1e-10);
  now+=.06+duration+.001;frames.shift()();assert.equal(last.cycle,1);assert.equal(last.event.wordId,'gen-1-1-2');
  player.stop();assert.equal(player.running,false);assert.ok(nodes.slice(count).every(n=>n.stopAt===undefined||n.stopAt<=now));
});
