import {musicManifest} from './musicManifest';
import {options} from '../save';

export class Audio {
 ctx:AudioContext|null=null; musicBus:GainNode|null=null; sfxBus:GainNode|null=null;
 cache=new Map<string,AudioBuffer|null>(); pending=new Map<string,Promise<AudioBuffer|null>>();
 missing=new Set<string>(); failures=new Map<string,number>(); warned=new Set<string>();
 current=''; source:AudioBufferSourceNode|null=null; gain:GainNode|null=null;
 sourceFile=''; generation=0; ducked=false; paused=false; jingleDucks=0;
 loading:Promise<void>|null=null; loadingId=''; ended=false; retryTimer:ReturnType<typeof setTimeout>|null=null; retries=0;
 constructor(){
  for(const event of ['pointerdown','touchend','keydown'])window.addEventListener(event,()=>this.unlock(),{capture:true,passive:true});
  window.addEventListener('online',()=>this.retry());
  window.addEventListener('pageshow',()=>this.unlock());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.unlock();});
 }
 unlock(){
  if(!this.ctx||this.ctx.state==='closed'){
   const Constructor=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
   if(!Constructor)return;
   this.ctx=new Constructor();this.musicBus=this.ctx.createGain();this.sfxBus=this.ctx.createGain();
   this.musicBus.connect(this.ctx.destination);this.sfxBus.connect(this.ctx.destination);this.source=null;this.gain=null;this.loading=null;
   this.ctx.onstatechange=()=>{if(this.ctx?.state==='running'){this.volumes();this.ensure();}};this.volumes();
  }
  // Safari can report "interrupted" as well as "suspended" after backgrounding.
  if(this.ctx.state!=='running')void this.ctx.resume().then(()=>this.ensure()).catch(()=>{});
  this.ensure();
 }
 ensure(){if(this.ctx&&this.current&&!this.source&&!this.loading&&!this.ended)void this.play(this.current,true);}
 retry(){this.failures.clear();this.missing.clear();this.retries=0;this.ended=false;this.unlock();if(!this.loading)void this.play(this.current,true);}
 volumes(){if(!this.ctx||!this.musicBus||!this.sfxBus)return;const o=options();this.musicBus.gain.setTargetAtTime(o.music*(this.ducked||this.jingleDucks>0?.35:1)*(this.paused?.4:1),this.ctx.currentTime,.1);this.sfxBus.gain.value=o.sfx;}
 duck(v:boolean){if(v!==this.ducked){this.ducked=v;this.volumes();}}
 tone(freq=440,duration=.1,type:OscillatorType='square',end=0){if(!this.ctx||!this.sfxBus||this.ctx.state!=='running')return;const c=this.ctx,o=c.createOscillator(),g=c.createGain();if(type==='square'){const real=new Float32Array(33),imag=new Float32Array(33),duty=.25;for(let n=1;n<33;n++)imag[n]=2*Math.sin(n*Math.PI*duty)/(n*Math.PI);o.setPeriodicWave(c.createPeriodicWave(real,imag));}else o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(20,end),c.currentTime+duration);g.gain.setValueAtTime(.08,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(this.sfxBus);o.onended=()=>{o.disconnect();g.disconnect();};o.start();o.stop(c.currentTime+duration);}
 noise(duration=.15){if(!this.ctx||!this.sfxBus||this.ctx.state!=='running')return;const c=this.ctx,b=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=c.createBufferSource(),g=c.createGain();g.gain.value=.1;s.buffer=b;s.connect(g);g.connect(this.sfxBus);s.onended=()=>{s.disconnect();g.disconnect();};s.start();}
 sfx(id:string){if(['hit','explode','hurt','death'].includes(id))this.noise(id==='death'?.4:.12);else this.tone(id==='jump'?230:id==='bell'?880:id==='fire'?600:440,.12,'square',id==='jump'?650:110);}
 async loadFile(file:string):Promise<AudioBuffer|null>{
  if(!this.ctx)return null;
  if(this.cache.has(file)){const b=this.cache.get(file)!;this.cache.delete(file);this.cache.set(file,b);return b;}
  if(this.pending.has(file))return this.pending.get(file)!;
  if((this.failures.get(file)??0)>Date.now())return null;
  const promise=Promise.resolve().then(async()=>{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);try{
   const response=await fetch(import.meta.env.BASE_URL+'music/'+file,{signal:controller.signal});
   if(!response.ok){this.failures.set(file,Date.now()+(response.status===404?60000:1500));throw Error(String(response.status));}
   const buffer=await this.ctx!.decodeAudioData(await response.arrayBuffer());this.cache.set(file,buffer);this.failures.delete(file);
   const bytes=()=>[...this.cache.values()].reduce((n,b)=>n+(b?b.length*b.numberOfChannels*4:0),0);
   while(this.cache.size>1&&(this.cache.size>6||bytes()>96*1024*1024))this.cache.delete(this.cache.keys().next().value!);
   return buffer;
  }catch{
   if(!this.failures.has(file))this.failures.set(file,Date.now()+1500);
   if(!this.warned.has(file)){console.warn('Music unavailable: '+file+' (will retry)');this.warned.add(file);}return null;
  }finally{clearTimeout(timeout);this.pending.delete(file);}});
  this.pending.set(file,promise);return promise;
 }
 async load(id:string){const m=musicManifest[id];if(!m)return null;const buffer=await this.loadFile(m.file);if(!buffer)this.missing.add(id);else this.missing.delete(id);return buffer;}
 async play(id:string,force=false):Promise<void>{
  const m=musicManifest[id];if(!m)return;
  if(this.current===id&&this.loading)return this.loading;
  if(!force&&this.current===id&&this.source)return;
  this.current=id;this.ended=false;
  if(!this.ctx)return;
  const gen=++this.generation;this.loadingId=id;
  const task=(async()=>{
   let file=m.file,buffer=await this.load(id);
   if(!buffer&&m.fallbackFile){file=m.fallbackFile;buffer=await this.loadFile(file);}
   if(gen!==this.generation||!this.ctx)return;
   if(!buffer){
    if(this.retries<2){this.retries++;if(this.retryTimer)clearTimeout(this.retryTimer);this.retryTimer=setTimeout(()=>{this.retryTimer=null;if(this.current===id&&!this.loading)void this.play(id,true);},2000);}
    return; // Keep the previous track audible while a new download is unavailable.
   }
   this.retries=0;if(this.retryTimer){clearTimeout(this.retryTimer);this.retryTimer=null;}
   if(this.source&&this.sourceFile===file&&this.source.loop===m.loop&&!force)return;
   const c=this.ctx,old=this.source,oldGain=this.gain;
   const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.loop=m.loop;
   source.loopStart=m.loopStart;source.loopEnd=m.loopEnd??buffer.duration;
   gain.gain.setValueAtTime(0,c.currentTime);gain.gain.linearRampToValueAtTime(m.volume,c.currentTime+.5);
   source.connect(gain);gain.connect(this.musicBus!);
   source.onended=()=>{source.disconnect();gain.disconnect();if(this.source===source){this.source=null;this.gain=null;this.ended=!m.loop;}};
   source.start(0,Math.min(m.trimStart,Math.max(0,buffer.duration-.01)));
   this.source=source;this.gain=gain;this.sourceFile=file;
   if(old&&oldGain){oldGain.gain.cancelScheduledValues(c.currentTime);oldGain.gain.setTargetAtTime(0,c.currentTime,.12);try{old.stop(c.currentTime+.5);}catch{}}
  })();
  this.loading=task;
  try{await task;}finally{if(this.loading===task){this.loading=null;this.loadingId='';}}
 }
 async jingle(id:string){if(!this.ctx)return;const buffer=await this.load(id);if(!buffer){[0,1,2,3].forEach(v=>setTimeout(()=>this.tone(id.includes('over')?660-v*130:330+v*165,.18,'triangle'),v*100));return;}
  const source=this.ctx.createBufferSource();source.buffer=buffer;source.connect(this.sfxBus!);this.jingleDucks++;this.volumes();
  source.onended=()=>{source.disconnect();this.jingleDucks=Math.max(0,this.jingleDucks-1);this.volumes();};source.start();
 }
}
