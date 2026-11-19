import {scheduleInstrument,validatePlan,soundingNotes} from './synthesis.js';

// A short lookahead keeps long readings bounded in oscillator count. The audio
// clock owns timing; requestAnimationFrame only renders highlights.
export class Player {
  constructor(onFrame,onEnd,onSilence=()=>{}){this.onFrame=onFrame;this.onEnd=onEnd;this.onSilence=onSilence;this.generation=0;this.sources=[];this.volume=0.7;}
  async play(plan,repeat=false){
    this.stop({releaseAudio:false});
    validatePlan(plan);
    const sounding=soundingNotes(plan);
    const generation=this.generation;
    this.context??=new(window.AudioContext||window.webkitAudioContext)();
    this.master??=this.context.createGain();this.master.gain.value=this.volume;
    if(!this.connected){this.master.connect(this.context.destination);this.connected=true;}
    await this.context.resume();if(generation!==this.generation)return;
    this.plan=plan;this.sounding=sounding;this.repeat=repeat;this.running=true;this.nextIndex=0;this.nextCycle=0;
    this.duration=plan.at(-1).startSeconds+plan.at(-1).durationSeconds;
    this.start=this.context.currentTime+0.06;
    this.pump();this.timer=setInterval(()=>this.pump(),60);
    const frame=()=>{
      if(generation!==this.generation||!this.running)return;
      const now=this.context.currentTime,elapsed=Math.max(0,now-this.start);
      if(!this.repeat&&elapsed>=this.duration){this.running=false;clearInterval(this.timer);this.releaseAudio();this.onEnd();return;}
      const cycle=Math.floor(elapsed/this.duration),position=this.repeat?elapsed%this.duration:elapsed;
      let lo=0,hi=this.plan.length-1,index=0;
      while(lo<=hi){const mid=(lo+hi)>>1;if(this.plan[mid].startSeconds<=position){index=mid;lo=mid+1;}else hi=mid-1;}
      const event=this.plan[index];
      if(now>=this.start){
        if(position>=event.startSeconds&&position<event.startSeconds+event.durationSeconds)this.onFrame(event,cycle,position/this.duration,index);
        else this.onSilence(cycle,position/this.duration,index);
      }
      this.raf=requestAnimationFrame(frame);
    };
    this.raf=requestAnimationFrame(frame);
  }
  pump(){
    if(!this.running)return;
    const now=this.context.currentTime;
    this.sources=this.sources.filter(s=>s.end>now);
    while(this.running){
      if(this.nextIndex>=this.sounding.length){
        if(!this.repeat)return;this.nextIndex=0;this.nextCycle++;
      }
      const e=this.sounding[this.nextIndex],at=this.start+this.nextCycle*this.duration+e.startSeconds;
      if(at>now+0.5)return;
      this.nextIndex++;
      if(at+e.durationSeconds<=now)continue;
      this.scheduleNote(e,at);
    }
  }
  scheduleNote(e,at){
    this.sources.push(scheduleInstrument(this.context,this.master,e,at));
  }
  setVolume(value){this.volume=Math.min(1,Math.max(0,value));if(this.master)this.master.gain.value=this.volume;}
  releaseAudio(){const pending=this.context?.suspend?.();pending?.catch(()=>{});}
  stop({releaseAudio=true}={}){
    this.generation++;this.running=false;clearInterval(this.timer);cancelAnimationFrame(this.raf);
    for(const s of this.sources){try{s.oscillator.stop();}catch{}}this.sources=[];
    if(releaseAudio)this.releaseAudio();
  }
}
