import {voiceSpan} from './voice-studies.js';

// A seconds-based source player. Muted practice never calls media.play().
// Recorded sound is always played at its original speed and pitch.
export class VoiceStudyPlayer {
  constructor(media,{clock=()=>performance.now()/1000,frame=fn=>requestAnimationFrame(fn),cancelFrame=id=>cancelAnimationFrame(id),
    onPosition=()=>{},onEnd=()=>{},onError=()=>{}}={}){
    Object.assign(this,{media,clock,frame,cancelFrame,onPosition,onEnd,onError});
    this.volume=0;this.generation=0;this.running=false;this.starting=false;this.position=0;
    media.addEventListener('ended',()=>{if(this.running&&this.mode==='audio')this.boundary();});
    media.addEventListener('error',()=>{if(this.running)this.fail(Error('The source recording could not be decoded.'));});
  }
  now(){return this.mode==='muted'?this.anchorPosition+Math.max(0,this.clock()-this.anchorClock):this.media.currentTime;}
  stop(){
    if(this.running)this.position=Math.min(this.end,this.now());
    this.generation++;this.running=false;this.starting=false;this.pending?.abort();this.pending=null;this.enabling=null;
    this.cancelFrame(this.raf);this.media.pause();
  }
  fail(error){this.stop();this.onError(error);}
  async metadata(signal){
    if(this.media.readyState>=1)return;
    await new Promise((resolve,reject)=>{
      const cleanup=()=>{this.media.removeEventListener('loadedmetadata',ready);this.media.removeEventListener('error',failed);signal.removeEventListener('abort',aborted);};
      const ready=()=>{cleanup();resolve();},failed=()=>{cleanup();reject(Error('The source recording could not be loaded.'));},
        aborted=()=>{cleanup();reject(new DOMException('Stopped','AbortError'));};
      this.media.addEventListener('loadedmetadata',ready,{once:true});this.media.addEventListener('error',failed,{once:true});
      signal.addEventListener('abort',aborted,{once:true});this.media.load();
    });
  }
  async play(url,{start=0,end=null,repeat=false,expectedDuration=null}={}){
    this.stop();const generation=this.generation,pending=new AbortController();this.pending=pending;this.starting=true;
    try{
      if(this.media.getAttribute('src')!==url)this.media.src=url;
      await this.metadata(pending.signal);if(generation!==this.generation)return;
      const duration=this.media.duration;
      if(expectedDuration!==null&&(!Number.isFinite(duration)||Math.abs(duration-expectedDuration)>.5))throw Error('Decoded duration differs from this source recording.');
      const span=voiceSpan(start,end,duration);Object.assign(this,span);this.repeat=repeat;this.cycle=0;this.position=span.start;
      this.media.playbackRate=1;this.media.volume=this.volume;this.media.currentTime=span.start;
      this.mode=this.volume===0?'muted':'audio';this.anchorClock=this.clock();this.anchorPosition=span.start;
      this.running=true;this.starting=false;
      if(this.mode==='audio')await this.media.play();
      if(generation!==this.generation||!this.running)return;
      this.tick(generation);
    }catch(error){if(generation===this.generation){this.stop();if(error.name!=='AbortError')this.onError(error);}}
  }
  tick(generation){
    if(generation!==this.generation||!this.running)return;
    this.position=this.now();
    if(this.position>=this.end){this.boundary();return;}
    this.onPosition(this.position,this.cycle,this.mode);this.raf=this.frame(()=>this.tick(generation));
  }
  boundary(){
    if(!this.running)return;
    this.cancelFrame(this.raf);
    if(!this.repeat){this.position=this.end;this.stop();this.position=this.end;this.onPosition(this.position,this.cycle,this.mode);this.onEnd();return;}
    const elapsed=Math.max(0,this.now()-this.start),length=this.end-this.start;
    this.cycle+=Math.max(1,Math.floor(elapsed/length));this.position=this.start+elapsed%length;
    this.anchorPosition=this.position;this.anchorClock=this.clock();this.media.currentTime=this.position;
    const generation=this.generation;
    if(this.mode==='audio'&&this.media.paused){
      this.media.play().then(()=>{if(generation===this.generation&&this.running)this.tick(generation);})
        .catch(error=>{if(generation===this.generation)this.fail(error);});
    }else this.tick(generation);
  }
  async setVolume(value){
    this.volume=Number.isFinite(value)?Math.min(1,Math.max(0,value)):0;this.media.volume=this.volume;
    if(!this.running)return;
    if(this.volume===0&&this.mode==='audio'){
      this.position=this.media.currentTime;this.anchorPosition=this.position;this.anchorClock=this.clock();this.mode='muted';this.media.pause();
    }else if(this.volume>0&&this.mode==='muted'&&!this.enabling){
      const generation=this.generation;this.position=this.now();this.media.currentTime=this.position;
      const transition={generation};this.mode='audio';this.enabling=transition;
      try{await this.media.play();if(generation===this.generation&&this.running&&this.volume===0){this.anchorPosition=this.media.currentTime;this.anchorClock=this.clock();this.mode='muted';this.media.pause();}}
      catch(error){if(generation===this.generation)this.fail(error);}
      finally{if(this.enabling===transition)this.enabling=null;}
    }
  }
}
