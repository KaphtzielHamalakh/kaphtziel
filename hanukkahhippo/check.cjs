const fs=require('fs'),vm=require('vm'),assert=require('assert');
const noop=()=>{}; const element=()=>({addEventListener:noop,setAttribute:noop,querySelectorAll:()=>[],classList:{toggle:noop,contains:()=>false},getContext:()=>({}),dataset:{}});
const events={};const document={getElementById:element,createElement:element,body:element(),addEventListener:(n,f)=>events[n]=f};
const sandbox={document,window:{addEventListener:noop,matchMedia:()=>({matches:true,addEventListener:noop})},navigator:{audioSession:{}},requestAnimationFrame:noop,console,assert};
vm.createContext(sandbox);
const src=fs.readFileSync(__dirname+'/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
vm.runInContext(src,sandbox);
vm.runInContext(`
let resumes=0,starts=0;
window.AudioContext=class {
 constructor(){this.state='suspended';this.sampleRate=44100;this.destination={};}
 resume(){resumes++;this.state='running';return Promise.resolve();}
 createBuffer(){return {};}
 createBufferSource(){return {connect(){},disconnect(){},start(){starts++;}};}
};
sfx.init();assert.equal(navigator.audioSession.type,'playback');assert.equal(resumes,1);assert.equal(starts,1);
sfx.ctx.state='interrupted';sfx.init();assert.equal(resumes,2);
sfx.ctx.state='suspended';sfx.playTone(440,'square',.1);assert.equal(resumes,2);
sfx.ctx=null; window.AudioContext=undefined;
const layouts=new Set();
for(let night=1;night<=9;night++) {
 stats.night=night;buildLevel(night);boss=null;gameState='PLAY';
 const original=map.map(r=>r.slice());
 layouts.add(JSON.stringify(original));
 const letters=items.filter(i=>i.type==='letter');assert.equal(letters.length,4);
 const surfaces=[];
 for(let y=1;y<15;y++)for(let x=0;x<175;x++)if(map[y][x]&&!map[y-1][x])surfaces.push([x,y]);
 const visited=new Set(['2,13']), queue=[[2,13]], found=new Set();let exit=false;
 while(queue.length){
  const [sx,sy]=queue.shift();
  for(const dir of [-1,1])for(const speed of [1.75,2.65])for(const jump of [false,true]){
   map=original.map(r=>r.slice());player=new Hippo(sx*16,sy*16-15);player.vx=dir*speed;
   player.vy=jump?-(5.25+speed*.2):0;
   for(let tick=0;tick<75;tick++){
    player.vy=Math.min(6.5,player.vy+(player.vy<0?.22:.33));player.moveAndCollide();
    for(const l of letters)if(aabb(player,{...l,w:13,h:13}))found.add(l.letterIdx);
    if(player.x>132*16&&player.grounded)exit=true;
    if(player.y>240)break;
    if(player.grounded){
     const x=Math.floor((player.x+7)/16), y=Math.round((player.y+15)/16),key=x+','+y;
     if(!visited.has(key)){visited.add(key);queue.push([x,y]);}
     if(jump||tick>12)break;
    }
   }
  }
 }
 assert(exit,'Night '+night+' exit unreachable');assert.equal(found.size,4,'Night '+night+' letters unreachable: '+[...found]);
 for(let x=136;x<175;x++)assert.equal(original[13][x],1);
 console.log('Night '+night+': exit and all four letters reachable, safe arena ('+visited.size+' reachable landing positions)');
}
assert.equal(layouts.size,9);console.log('PASS: audio session, suspended/interrupted resume, suspended tone guard, nine distinct traversable courses');
`,sandbox,{timeout:120000});
