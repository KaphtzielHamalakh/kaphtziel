import { frequency } from './music.js';

// Schedule against the audio clock; DOM timers never determine musical timing.
export class Player {
  constructor(onFrame,onEnd){this.onFrame=onFrame;this.onEnd=onEnd;this.generation=0;this.sources=[];}
  async play(plan,repeat=false){
    this.stop();
    const generation=this.generation;
    this.context ??= new (window.AudioContext||window.webkitAudioContext)();
    await this.context.resume();
    if(generation!==this.generation)return;
    this.plan=plan;this.repeat=repeat;this.cycle=0;this.running=true;
    this.duration=plan.at(-1).startSeconds+plan.at(-1).durationSeconds;
    this.start=this.context.currentTime+0.06;
    this.schedule(this.start);
    this.next=this.start+this.duration;
    // Schedule one cycle ahead to keep repeats on the same audio clock.
    if(this.repeat){this.schedule(this.next);this.next+=this.duration;}
    const frame=()=>{
      if(generation!==this.generation || !this.running)return;
      const now=this.context.currentTime;
      this.sources=this.sources.filter(s=>s.end>now);
      if(this.repeat && now+0.2>=this.next){this.schedule(this.next);this.next+=this.duration;}
      const elapsed=Math.max(0,now-this.start);
      if(!this.repeat && elapsed>=this.duration){this.running=false;this.onEnd();return;}
      const cycle=Math.floor(elapsed/this.duration);
      const position=this.repeat?elapsed%this.duration:elapsed;
      const event=this.plan.find(e=>position>=e.startSeconds && position<e.startSeconds+e.durationSeconds);
      if(event && now>=this.start)this.onFrame(event,cycle,position/this.duration);
      this.raf=requestAnimationFrame(frame);
    };
    this.raf=requestAnimationFrame(frame);
  }
  schedule(start){
    for(const e of this.plan){
      const oscillator=this.context.createOscillator(), gain=this.context.createGain();
      oscillator.type='triangle';oscillator.frequency.value=frequency(e.midi);
      const at=start+e.startSeconds, end=at+e.durationSeconds;
      gain.gain.setValueAtTime(0,at);
      gain.gain.linearRampToValueAtTime(.16,at+Math.min(.012,e.durationSeconds/4));
      gain.gain.setValueAtTime(.12,Math.max(at+.012,end-.025));
      gain.gain.linearRampToValueAtTime(0,end);
      oscillator.connect(gain);gain.connect(this.context.destination);
      oscillator.start(at);oscillator.stop(end);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      this.sources.push({oscillator,end});
    }
  }
  stop(){
    this.generation++;this.running=false;cancelAnimationFrame(this.raf);
    for(const s of this.sources){try{s.oscillator.stop();}catch{}}
    this.sources=[];
  }
}
