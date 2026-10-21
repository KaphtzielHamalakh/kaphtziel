'use strict';
// A new arrangement of the traditional, public-domain Maoz Tzur melody.
// Original bass, counterline, arpeggios and scene variations; no game-theme quotation.
const MusicEngine=(()=>{
 const theme=[[67,1],[72,2],[72,1],[71,1],[72,1],[74,2],[76,2],[76,1],[74,1],[72,2],[74,1],[76,1],[77,2],[77,1],[76,1],[74,2],[76,1],[77,1],[79,2],[79,1],[77,1],[76,2],[74,1],[72,1],[71,1],[69,1],[67,2],[72,4]];
 const answer=[[79,2],[79,1],[81,1],[79,2],[77,2],[76,2],[76,1],[77,1],[76,2],[74,2],[72,2],[71,2],[72,4],[0,4]];
 const melody=[];for(const[n,d]of [...theme,...answer]){melody.push(n);for(let i=1;i<d;i++)melody.push(null);}
 let context=null,next=0,step=0,scene='',voices=[];
 const midi=n=>440*Math.pow(2,(n-69)/12);
 function stop(){for(const v of voices){try{v.gain.gain.setValueAtTime(0,context.currentTime);v.osc.stop();}catch{}}voices=[];next=0;}
 function voice(ctx,n,start,duration,type,volume){if(!n)return;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(midi(n),start);gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime?.(volume,start+.015);if(!gain.gain.linearRampToValueAtTime)gain.gain.setValueAtTime(volume,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);osc.connect(gain);gain.connect(ctx.destination);const v={osc,gain};voices.push(v);osc.onended=()=>{voices=voices.filter(x=>x!==v);osc.disconnect?.();gain.disconnect?.();};osc.start(start);osc.stop(start+duration+.02);}
 function tick(){
  if(!sound||!audio||audio.state!=='running'||document.hidden)return;
  const now=Number.isFinite(audio.currentTime)?audio.currentTime:time/60;
  const kind=mode==='files'?'world':room?.boss&&!hasFlame(nightOf())?'boss':room?.kind==='dungeon'?'dungeon':room?.kind==='town'||room?.kind==='home'?'town':'world';
  if(context!==audio||scene!==kind){if(context)stop();context=audio;scene=kind;step=0;next=now+.02;}
  if(next<now-.5)next=now+.02;
  const bpm=kind==='boss'?104:kind==='dungeon'?68:kind==='town'?72:76,duration=30/bpm;
  const minor=kind==='dungeon'||room?.kind==='town'&&state.belial||room&&!regionLit()&&room.kind!=='town'&&room.kind!=='home';
  const transform=n=>minor&&[4,9,11].includes(n%12)?n-1:n;
  let scheduled=0;
  while(next<now+.12&&scheduled++<4){
   const phrase=Math.floor(step/8)%4,roots=[48,53,55,48],root=roots[phrase],chord=[root,root+(minor?3:4),root+7,root+12];
   const note=melody[step%melody.length];let hold=1;while(hold<8&&melody[(step+hold)%melody.length]===null)hold++;if(note!==null)voice(audio,note?transform(note):0,next,duration*hold*.9,'square',kind==='boss'?.030:.025);
   if(step%2===0)voice(audio,root-12+(step%8===4?7:0),next,duration*1.7,'triangle',.045);
   voice(audio,chord[[0,2,1,3][step%4]]+12,next+duration*.04,duration*.55,'triangle',.014);
   if(step%8===6)voice(audio,transform((note||72)-12),next,duration*1.5,'square',.008);
   if(kind==='boss'&&step%2===1)voice(audio,36,next,.035,'sawtooth',.012);
   next+=duration;step++;
  }
 }
 return {tick,stop,melody,midi};
})();
