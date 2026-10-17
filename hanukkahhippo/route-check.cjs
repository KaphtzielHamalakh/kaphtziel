const fs=require('fs'),vm=require('vm'),assert=require('assert');
const noop=()=>{}; const element=()=>({addEventListener:noop,setAttribute:noop,querySelectorAll:()=>[],classList:{toggle:noop,contains:()=>false},getContext:()=>({}),dataset:{}});
const events={};const document={getElementById:element,createElement:element,body:element(),addEventListener:(n,f)=>events[n]=f};
const sandbox={document,window:{addEventListener:noop,matchMedia:()=>({matches:true,addEventListener:noop})},navigator:{audioSession:{}},requestAnimationFrame:noop,console,assert};
vm.createContext(sandbox);
const src=fs.readFileSync(__dirname+'/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
vm.runInContext(src,sandbox);
vm.runInContext(`
// Every search edge runs Hippo.update(), with real acceleration and button input.
// Preserve exact landing positions and modified blocks; never snap into a wall.
function route(night, power, checkpoint=false, groundColumn=null, barrier=false, target=null) {
 stats.night=night;buildLevel(night);if(barrier)for(let y=0;y<15;y++)map[y][12]=1;boss=null;enemies=[];sfx.ctx=null;
 clearInputs();gameState='PLAY';player=new Hippo(groundColumn===null?(checkpoint?shamash.x:32):groundColumn*TILE,groundColumn===null?(checkpoint?shamash.y:160):193);
 if(power)player.setPower(power);
 const initialPower=player.power;
 for(let t=0;t<20;t++){player.update();clearJustPressed();}
 const initial={p:{...player},map:map.map(r=>r.slice()),moves:[]};
 const pending=[initial],seen=new Set();let expanded=0,best=0;
 while(pending.length && expanded<18000) {
  pending.sort((a,b)=>a.p.x-b.p.x);
  const node=pending.pop();expanded++;best=Math.max(best,node.p.x);
  if(target ? aabb(node.p,target) : node.p.x>=166*TILE) return {expanded,moves:node.moves};
  for(const action of [{walk:6},{walk:12},{walk:20},{jump:10},{jump:40}]) {
   player=Object.assign(new Hippo(0,0),node.p);map=node.map.map(r=>r.slice());gameState='PLAY';
   clearInputs();keys.ArrowRight=true;keys.KeyX=true;
   let landed=false;
   for(let tick=0;tick<(action.walk||90);tick++) {
    keys.KeyZ=!!action.jump&&tick<action.jump;
    if(action.jump&&tick===0)justPressed.KeyZ=true;
    player.update();clearJustPressed();
    if(gameState!=='PLAY'||player.power!==initialPower||player.y>240)break;
    if(player.grounded && (action.walk?tick===action.walk-1:tick>1)){landed=true;break;}
   }
   if(!landed||gameState!=='PLAY'||player.power!==initialPower)continue;
   if(target && player.x>target.x+32)continue;
   const signature=[Math.round(player.x*2),Math.round(player.y),Math.round(player.vx*10),
     map.map((r,y)=>r.reduce((v,t,x)=>v+(t?x+y*175:0),0)).join(',')].join(':');
   if(seen.has(signature))continue;seen.add(signature);
   pending.push({p:{...player},map:map.map(r=>r.slice()),moves:[...node.moves,action]});
  }
 }
 throw new Error('Night '+night+' power '+power+' checkpoint '+checkpoint+' blocked near column '+(best/16).toFixed(1)+' after '+expanded+' states');
}
for(let night=1;night<=8;night++)for(const power of [0,1])for(const checkpoint of [false,true]) {
 const result=route(night,power,checkpoint);
 console.log('PASS night '+night+', '+(power?'BIG':'SMALL')+', '+(checkpoint?'checkpoint':'start')+': '+result.moves.length+' control sequences ('+result.expanded+' states)');
}

for(const power of [0,1]) {route(3,power,false,70);console.log('PASS: escape screenshot location at ground column 70, power '+power);}
for(const power of [0,1]) {route(3,power,false,64,false,{x:73*TILE,y:7*TILE,w:13,h:13});console.log('PASS: climb screenshot ledge via new terraces, power '+power);}
assert.throws(()=>route(1,0,false,null,true),/blocked/);
console.log('PASS: checker rejects an intentionally sealed course');
`,sandbox,{timeout:120000});
