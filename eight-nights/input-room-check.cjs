const fs=require('fs'),vm=require('vm'),assert=require('assert');
const noop=()=>{},windowEvents={},documentEvents={},elements={},storage={};let hitTarget=null;
const ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop});
function element(key){return {dataset:key?{key}:{},events:{},addEventListener(n,f){(this.events[n]??=[]).push(f);},setPointerCapture(){if(this.throwCapture)throw Error('no capture');},setAttribute:noop,focus:noop,getContext:()=>ctx,closest(selector){return selector==='.touch'||selector==='[data-key]'?this:null;}};}
const buttons=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyZ','KeyX','KeyC'].map(element);
const sandbox={console,assert,document:{getElementById:id=>elements[id]??=element(),querySelectorAll:()=>buttons,elementFromPoint:()=>hitTarget,addEventListener:(n,f)=>(documentEvents[n]??=[]).push(f),hidden:false},window:{addEventListener:(n,f)=>(windowEvents[n]??=[]).push(f)},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},requestAnimationFrame:noop,setTimeout:noop,Blob,URL};
vm.createContext(sandbox);for(const name of ['world.js','game.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+name,'utf8'),sandbox);
const run=code=>vm.runInContext(code,sandbox,{timeout:30000});
function event(extra={}){return {pointerId:1,preventDefault(){this.prevented=true;},target:{tagName:'BUTTON'},...extra};}
function fire(target,name,e){for(const f of target[name]||[])f(e);}
const right=buttons[3],left=buttons[2],a=buttons[4];run("state=fresh();state.mallet=true;mode='play';enter('town');");
fire(right.events,'pointerdown',event());fire(a.events,'pointerdown',event({pointerId:2}));fire(windowEvents,'pointerup',event({pointerId:2}));assert.equal(run("keys.has('ArrowRight')"),true);fire(windowEvents,'pointerup',event());assert.equal(run('keys.size'),0);
fire(right.events,'pointerdown',event());fire(right.events,'pointerdown',event({pointerId:2}));fire(right.events,'lostpointercapture',event());assert.equal(run("keys.has('ArrowRight')"),true);fire(windowEvents,'pointercancel',event({pointerId:2}));assert.equal(run('keys.size'),0);
right.throwCapture=true;fire(right.events,'pointerdown',event());assert.equal(run("keys.has('ArrowRight')"),true);fire(windowEvents,'pointerup',event());right.throwCapture=false;
fire(windowEvents,'keydown',event({code:'KeyD',target:{tagName:'CANVAS'}}));fire(right.events,'pointerdown',event());fire(windowEvents,'pointerup',event());assert.equal(run("keys.has('ArrowRight')"),true);fire(windowEvents,'keyup',event({code:'KeyD'}));assert.equal(run('keys.size'),0);
fire(right.events,'pointerdown',event());hitTarget=left;fire(windowEvents,'pointermove',event());assert.equal(run("keys.has('ArrowLeft')&&!keys.has('ArrowRight')"),true);hitTarget=null;fire(windowEvents,'pointermove',event());assert.equal(run('keys.size'),0);
for(const name of ['blur','pagehide','orientationchange']){run("mode='play'");fire(right.events,'pointerdown',event());fire(windowEvents,name,event());assert.equal(run('keys.size'),0);assert.equal(run('mode'),'inventory');}
run("mode='play'");fire(right.events,'pointerdown',event());const menu=event({target:right});fire(documentEvents,'contextmenu',menu);assert.equal(menu.prevented,true);assert.equal(run('keys.size'),0);const touch=event();fire(right.events,'touchstart',touch);assert.equal(touch.prevented,true);
run("say('A hint.');");fire(right.events,'pointerdown',event());assert.equal(run('mode'),'dialogue');fire(windowEvents,'pointerup',event());fire(a.events,'pointerdown',event());assert.equal(run('mode'),'play');fire(windowEvents,'pointerup',event());
run(`
// A held hammer repeats after its cooldown; dialogue clears all held sources.
enter('d0');p.x=128;p.y=88;p.face='e';enemies=[{type:'bruiser',x:144,y:88,hp:4,inv:0,stun:1000,t:100}];state.hp=4;
`);fire(a.events,'pointerdown',event());run('for(let i=0;i<42;i++)update();');assert.ok(run('enemies.length===0||enemies[0].hp<=1'));fire(windowEvents,'pointerup',event());
run(`
let transitions=0,turns=0;
const all=Object.keys(World.rooms);const doorIds=[...new Set(all.flatMap(id=>Object.values(World.rooms[id].exits).map(e=>[id,e.to].sort().join(':'))))];
// Drive the actual movement routine into every exit, including near each jamb.
for(const id of all)for(const [dir,exit]of Object.entries(World.rooms[id].exits))for(const offset of [-16,-8,0,8,16]){
 state=fresh();state.solved=all;state.doors=doorIds;mode='play';
 const vertical=dir==='n'||dir==='s';enter(id,vertical?128+offset:dir==='w'?24:232,vertical?(dir==='n'?24:152):88+offset);enemies=[];
 for(let i=0;i<75&&room.id===id;i++)movePlayer(dir);
 assert.equal(room.id,exit.to,id+' '+dir+' offset '+offset);assert.ok(walkable(p.x,p.y),'valid arrival');transitions++;
}
// Check real, unsolved puzzle escape routes without keys or dungeon items.
for(const [id,back,forward]of [['d3','s','e'],['d6','e','n'],['f5','s','w'],['f6','e','n'],['f10','w','n']]){
 state=fresh();mode='play';enter(id);enemies=[];assert.equal(door(forward),false,id+' forward stays shut');assert.equal(door(back),true,id+' retreat stays open');
}
// Turn at obstacle edges on either axis: collision must stay valid.
for(const id of all){state=fresh();enter(id);enemies=[];for(let y=24;y<160;y+=8)for(let x=24;x<240;x+=8)if(walkable(x,y))for(const dir of ['n','s','e','w']){
 p.x=x;p.y=y;p.face=dir==='n'||dir==='s'?'e':'n';movePlayer(dir);assert.ok(walkable(p.x,p.y),id+' turn '+dir);turns++;
}}
state=fresh();enter('d3',112,164);assert.ok(walkable(p.x,p.y),'repair a saved jamb overlap');p.x=112;p.y=154;for(let i=0;i<40&&room.id==='d3';i++)movePlayer('s');assert.equal(room.id,'d1','escape screenshot doorway');
state=fresh();enter('d3');p.x=80;p.y=80;for(let i=0;i<8;i++)move(1.25,0);assert.ok(state.solved.includes('d3'),'stone still pushes');assert.ok(door('e'),'solved gate opens');
console.log('PASS: '+transitions+' physical exit approaches, '+turns+' obstacle turns, unsolved retreats, saved-position repair and oil-channel escape');
`);
console.log('PASS: multi-touch, global release/cancel, lost capture, capture failure, keyboard/touch overlap, slide, interruptions, selection suppression, modal input and held hammer');
