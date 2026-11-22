import {scheduleInstrument,validatePlan,soundingNotes} from './synthesis.js';

// Audible playback uses the audio clock and a bounded note queue. At zero
// volume, practice follows a monotonic clock without opening an audio device.
export class Player {
  constructor(onFrame,onEnd,onSilence=()=>{},{wallClock=()=>performance.now()/1000,onError=()=>{}}={}){
    this.onFrame=onFrame;this.onEnd=onEnd;this.onSilence=onSilence;this.wallClock=wallClock;this.onError=onError;this.generation=0;this.sources=[];this.volume=0.7;
  }
  async prepareAudio(){
    this.context??=new(window.AudioContext||window.webkitAudioContext)();
    this.master??=this.context.createGain();this.master.gain.value=this.volume;
    if(!this.connected){this.master.connect(this.context.destination);this.connected=true;}
    await this.context.resume();
  }
  now(){return this.clockMode==='muted'?this.wallClock():this.context.currentTime;}
  async play(plan,repeat=false){
    this.stop({releaseAudio:false});
    const duration=validatePlan(plan);
    const sounding=soundingNotes(plan);
    const generation=this.generation;
    if(this.volume>0)await this.prepareAudio();
    if(generation!==this.generation)return;
    if(this.volume===0)this.releaseAudio();
    this.clockMode=this.volume===0?'muted':'audio';
    this.plan=plan;this.sounding=sounding;this.repeat=repeat;this.running=true;this.nextIndex=0;this.nextCycle=0;
    this.duration=duration;
    this.start=this.now()+0.06;
    this.paint=()=>{
      if(generation!==this.generation||!this.running)return;
      const now=this.now(),elapsed=Math.max(0,now-this.start);
      if(!this.repeat&&elapsed>=this.duration){this.running=false;clearInterval(this.timer);this.releaseAudio();this.onEnd();return;}
      const cycle=Math.floor(elapsed/this.duration),position=this.repeat?elapsed%this.duration:elapsed;
      let lo=0,hi=this.plan.length-1,index=0;
      while(lo<=hi){const mid=(lo+hi)>>1;if(this.plan[mid].startSeconds<=position){index=mid;lo=mid+1;}else hi=mid-1;}
      const event=this.plan[index];
      if(now>=this.start){
        if(position>=event.startSeconds&&position<event.startSeconds+event.durationSeconds)this.onFrame(event,cycle,position/this.duration,index);
        else this.onSilence(cycle,position/this.duration,index);
      }
    };
    this.frame=()=>{if(this.clockMode!=='audio'||!this.running)return;this.paint();if(this.running)this.raf=requestAnimationFrame(this.frame);};
    this.pump();this.timer=setInterval(()=>{this.pump();if(this.clockMode==='muted')this.paint();},16);
    if(this.clockMode==='audio')this.raf=requestAnimationFrame(this.frame);
  }
  pump(){
    if(!this.running||this.clockMode==='muted')return;
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
    // Unmuting can enter a held note midway through its duration. Start only
    // the remaining tail; never schedule a negative audio-context time.
    const when=Math.max(at,this.context.currentTime),remaining=at+e.durationSeconds-when;
    if(remaining>0)this.sources.push(scheduleInstrument(this.context,this.master,{...e,durationSeconds:remaining},when));
  }
  async enableSound(generation){
    await this.prepareAudio();
    if(generation!==this.generation||!this.running)return;
    if(this.volume===0){this.releaseAudio();return;}
    if(this.clockMode!=='muted')return;
    const elapsed=Math.max(0,this.wallClock()-this.start),position=this.repeat?elapsed%this.duration:elapsed;
    this.clockMode='audio';this.start=this.context.currentTime-elapsed;this.nextCycle=Math.floor(elapsed/this.duration);
    let lo=0,hi=this.sounding.length;
    while(lo<hi){const mid=(lo+hi)>>1,e=this.sounding[mid];if(e.startSeconds+e.durationSeconds<=position)lo=mid+1;else hi=mid;}
    this.nextIndex=lo;this.pump();this.raf=requestAnimationFrame(this.frame);
  }
  setVolume(value){
    this.volume=Math.min(1,Math.max(0,value));if(this.master)this.master.gain.value=this.volume;
    if(!this.running)return;
    if(this.volume===0&&this.clockMode==='audio'){
      const elapsed=Math.max(0,this.context.currentTime-this.start);this.clockMode='muted';this.start=this.wallClock()-elapsed;cancelAnimationFrame(this.raf);
      for(const s of this.sources){try{s.oscillator.stop();}catch{}}this.sources=[];this.releaseAudio();
    }else if(this.volume>0&&this.clockMode==='muted'){
      const generation=this.generation;
      if(this.audioTransition?.generation===generation)return this.audioTransition.promise;
      let promise;promise=this.enableSound(generation).catch(error=>{if(generation===this.generation){this.stop();this.onError(error);}})
        .finally(()=>{if(this.audioTransition?.promise===promise)this.audioTransition=null;});
      this.audioTransition={generation,promise};return promise;
    }
  }
  releaseAudio(){const pending=this.context?.suspend?.();pending?.catch(()=>{});}
  stop({releaseAudio=true}={}){
    this.generation++;this.running=false;clearInterval(this.timer);cancelAnimationFrame(this.raf);
    for(const s of this.sources){try{s.oscillator.stop();}catch{}}this.sources=[];
    if(releaseAudio)this.releaseAudio();
  }
}
