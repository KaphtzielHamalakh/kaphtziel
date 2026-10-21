'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const SAVE='kaphtziel-eight-nights-v1', dirs={n:[0,-1],s:[0,1],w:[-1,0],e:[1,0]};
const keys=new Set();let mode='title',dialogue=[],time=0,acc=0,last=null,room,enemies=[],shots=[],drops=[],swing=0,cooldown=0,lit=false,basinTime=0,audio=null,sound=false,notes=0,bombs=[],blasts=[],leverProgress=0,ceremonyNight=1;
const fresh=()=>({version:1,name:'',tunic:'blue',seen:[],room:'town',x:120,y:112,face:'s',hp:6,max:6,gelt:0,keys:0,mallet:false,dreidel:false,map:false,compass:false,flame:false,flame2:false,flame3:false,flame4:false,snorkel:false,band:false,map3:false,map4:false,compass3:false,compass4:false,belial:false,valves:[1,0,1],rail:0,scaleWeight:0,plates:[],enemyMemory:{},bombBag:false,bombs:0,map2:false,compass2:false,equipped:'shamash',opened:[],cleared:[],solved:[],doors:[]});
let state=fresh(),p={x:120,y:112,face:'s',inv:0};
function valid(s){return s&&s.version===1&&Object.hasOwn(World.rooms,s.room)&&Number.isFinite(s.x)&&s.x>=8&&s.x<=248&&Number.isFinite(s.y)&&s.y>=8&&s.y<=168&&[6,8,10,12,14].includes(s.max)&&Number.isFinite(s.hp)&&s.hp>=0&&s.hp<=s.max&&Number.isInteger(s.keys)&&s.keys>=0&&s.keys<=10&&Number.isInteger(s.gelt)&&s.gelt>=0&&s.gelt<=255&&['n','s','e','w'].includes(s.face)&&['shamash','dreidel','bombs','strength'].includes(s.equipped)&&['mallet','dreidel','map','compass','flame'].every(k=>typeof s[k]==='boolean')&&['flame2','flame3','flame4','snorkel','band','map2','compass2','map3','map4','compass3','compass4','belial'].every(k=>s[k]===undefined||typeof s[k]==='boolean')&&(s.bombs===undefined||Number.isInteger(s.bombs)&&s.bombs>=0&&s.bombs<=8)&&(s.name===undefined||typeof s.name==='string'&&Array.from(s.name).length<=12)&&(s.tunic===undefined||['blue','green','gold'].includes(s.tunic))&&(s.seen===undefined||Array.isArray(s.seen)&&s.seen.every(id=>typeof id==='string'&&Object.hasOwn(World.rooms,id)))&&validCampaignState(s)&&['opened','cleared','solved','doors'].every(k=>Array.isArray(s[k])&&s[k].every(v=>typeof v==='string'));}
function normalize(s){return {...fresh(),...s};}
function heroName(){return state.name||'ADVENTURER';}
function flameCount(){return [1,2,3,4].filter(hasFlame).length;}
function regionLit(){return hasFlame(nightOf());}
function save(){rememberEnemies();state.room=room.id;state.x=p.x;state.y=p.y;state.face=p.face;try{if(typeof saveActiveProfile==='function'&&activeSlot!==null)saveActiveProfile();else localStorage.setItem(SAVE,JSON.stringify(state));}catch{document.getElementById('status').textContent='Storage unavailable · export to keep progress';}}
// iOS routes a playback session independently of the phone's silent switch.
// Start a buffer and resume synchronously within a real input gesture.
function updateSoundButton(){const active=sound&&audio?.state==='running';const b=document.getElementById('sound');b.textContent=!sound?'Sound: off':active?'Sound: on':'Sound: tap to retry';b.setAttribute('aria-pressed',String(active));}
function unlockAudio(){
 if(!sound)return;
 try{
  if(navigator.audioSession)navigator.audioSession.type='playback';
  if(!audio||audio.state==='closed'){
   const Audio=window.AudioContext||window.webkitAudioContext;
   if(!Audio)throw Error('Web Audio unavailable');
   audio=new Audio();audio.onstatechange=updateSoundButton;
  }
  const resumed=audio.resume();
  const buffer=audio.createBuffer(1,1,audio.sampleRate);
  const source=audio.createBufferSource();source.buffer=buffer;source.connect(audio.destination);source.onended=()=>source.disconnect();source.start(0);
  updateSoundButton();
  Promise.resolve(resumed).then(()=>{updateSoundButton();tone(660,.14,'triangle');}).catch(()=>{updateSoundButton();});
 }catch{document.getElementById('status').textContent='Audio unavailable · tap Sound to retry';updateSoundButton();}
}
function recoverAudio(event){if(event?.target?.closest?.('#sound'))return;if(sound&&(!audio||audio.state!=='running'))unlockAudio();}
window.addEventListener('pointerdown',recoverAudio,{capture:true});
window.addEventListener('keydown',recoverAudio,{capture:true});
function tone(freq=440,length=.08,type='square'){if(!sound||!audio||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);g.gain.setValueAtTime(.08,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+length);}
function say(...lines){dialogue=lines;mode='dialogue';clearInput();}
function enter(id,x=128,y=136){
 rememberEnemies();room=World.rooms[id];if(!state.seen.includes(id))state.seen.push(id);p.x=x;p.y=y;p.heldRock=false;repairPosition();p.inv=45;lit=false;basinTime=0;shots=[];drops=[];bombs=[];blasts=[];leverProgress=0;swing=0;cooldown=0;
 enemies=roomEnemies(room);if(room.boss&&!hasFlame(nightOf())){enemies=[newBoss(room)];if(room.bossKind==='shabriri')spawnArms(enemies[0]);}
 encounterOwner=state;document.getElementById('status').textContent=room.name;
 document.getElementById('chapter').textContent=['','✦ NIGHT ONE · THE OIL PRESS','✦ NIGHT TWO · THE LATKE FURNACE','✦ NIGHT THREE · THE SUNKEN MIKVEH','✦ NIGHT FOUR · THE GELT MINES'][nightOf()];save();
}
function begin(){if(typeof showProfiles==='function')showProfiles();canvas.focus({preventScroll:true});}
function hurt(amount,source){if(p.inv>0||mode!=='play')return;state.hp=Math.max(0,state.hp-amount);p.inv=30;tone(100,.16,'sawtooth');if(source){const dx=p.x-source.x,dy=p.y-source.y,len=Math.hypot(dx,dy)||1;move(dx/len*10,dy/len*10);}if(state.hp<=0){mode='dead';clearInput();save();}}
function reward(item){if(item==='bombBag'){state.bombBag=true;state.bombs=8;state.equipped='bombs';}else if(item==='key')state.keys++;else if(['map','compass','dreidel','map2','compass2','map3','map4','compass3','compass4','snorkel','band'].includes(item))state[item]=true;tone(784,.25);save();say(...({snorkel:['The Snorkel! You can walk river bottoms.','Under water you are safe from sweeping arms.','Stand on dry ground to swing the hammer.'],band:['The Strength Band! C selects STRENGTH.','X lifts a nearby boulder; X throws it.','Carry stones to plates and place with A.'],map3:['The Sunken Mikveh map.'],map4:['The Gelt Mines survey map.'],compass3:['Shabriri waits beyond the final drain.'],compass4:['Azazel waits beyond the forge.'],bombBag:['Jelly Bombs! X places one; stand clear.','A short fuse. Cracked stone yields to jelly.','Return to this chest if your bag runs dry.'],map2:['The Latke Furnace map.'],compass2:['The compass points to Ketev Meriri.'],key:['A small key. It opens one locked door.'],map:['The Oil Press map. Open your inventory.'],compass:['A compass. The flame waits in the far north.'],dreidel:['The Dreidel! X throws; C changes items.','Stun enemies. Strike distant crystals.']}[item]||[item]));}
function interact(){if(cooldown<=0&&campaignInteract()){cooldown=18;return true;}const npc=(room.npcs||[]).find(n=>Math.hypot(p.x-n.x,p.y-n.y)<25);if(npc){if(campaignNPC(npc.who))return true;if(npc.who==='Judah'){state.mallet=true;save();say('JUDAH: My zayde’s mallet.','Don’t lose it. Don’t drop it on your foot.','East, east. The hollow olive leads down.');}else if(npc.who==='Bubbe'){state.hp=state.max;save();say(state.flame?'BUBBE: One light more than yesterday.':'BUBBE: Warm your hands. Eat something.','Her stove restores all your hearts.');}else if(npc.who==='Hillel')say('HILLEL: Add a light each night.',state.flame?'South of the first grove: the furnace.':'A spinning thing reaches where hands cannot.');else if(npc.who==='Baker'){if(!state.bombBag)say('THE BAKER: My guard keeps the jelly bag.','South and east. Find the smoking flue.');else if(state.bombs>=8)say('Your jelly bag is already full.');else if(state.gelt>=20){state.gelt-=20;state.bombs=Math.min(8,state.bombs+4);save();say('Four jelly bombs. Twenty gelt. No tasting.');}else say('Four jelly bombs cost twenty gelt.','The furnace supply chest is free if empty.');}else if(npc.who==='Cook')say('THE COOK: Cold hands first.','Left oven. Right oven. Then the middle.','Only the cook facing the door is hollow.');else say('THE SAGE: The oil goes where the stone lets it.');return true;}
 if(room.levers&&!state.solved.includes(room.id)){const index=room.levers.findIndex(l=>Math.hypot(p.x-l.x,p.y-l.y)<22);if(index>=0){leverProgress=index===room.order[leverProgress]?leverProgress+1:0;tone(leverProgress?500:130,.1);if(leverProgress===room.order.length){state.solved.push(room.id);save();hint('The ovens fall quiet. The north shutter opens.');}return true;}}
 const c=room.chest;if(c?.reward==='bombBag'&&state.opened.includes(room.id)&&state.bombs===0&&Math.hypot(p.x-c.x,p.y-c.y)<25){state.bombs=8;save();say('The baker left another bag of jelly bombs.');return true;}if(c&&!state.opened.includes(room.id)&&!enemies.length&&Math.hypot(p.x-c.x,p.y-c.y)<25){state.opened.push(room.id);reward(c.reward);return true;}return false;}
function attack(){if(underwater()){hint('Walk onto dry ground to attack.');return;}if(interact()||!state.mallet||cooldown>0)return;cooldown=20;swing=12;tone(180,.06,'triangle');const [dx,dy]=dirs[p.face];for(const e of enemies)if(Math.hypot(e.x-(p.x+dx*16),e.y-(p.y+dy*16))<(isBoss(e)?28:22))hit(e,1,dx,dy);if(state.hp===state.max&&!shots.some(s=>s.type==='hammer'))shots.push({type:'hammer',x:p.x,y:p.y,dx:dx*3,dy:dy*3,t:100});}
function item(){if(underwater()){hint('You cannot use weapons under water.');return;}if(cooldown>0)return;cooldown=22;if(state.equipped==='strength'){if(p.heldRock){const[dx,dy]=dirs[p.face];shots.push({type:'boulder',x:p.x,y:p.y,dx:dx*3,dy:dy*3,t:90});p.heldRock=false;tone(180,.1);}else if(state.band&&(room.rocks||[]).some(r=>Math.hypot(p.x-r.x,p.y-r.y)<26)){p.heldRock=true;tone(320,.1);}else hint('Stand beside a rock pile to lift a boulder.');return;}if(state.equipped==='bombs'){if(state.bombs>0&&bombs.length<2){state.bombs--;bombs.push({x:p.x,y:p.y,t:90});tone(180,.06);save();}else hint(state.bombs===0?'Your jelly bag is empty. Return to its chest.':'Two bombs at a time.');return;}if(state.equipped==='shamash'){if(!lit){lit=true;tone(560,.18,'triangle');if(room.dim)say('The shamash reveals a path through the dark.');}}else if(state.dreidel&&!shots.some(s=>s.type==='dreidel')){const[dx,dy]=dirs[p.face];shots.push({type:'dreidel',x:p.x,y:p.y,dx:dx*2.6,dy:dy*2.6,t:62});tone(650,.1,'triangle');}}
function hit(e,damage,dx=0,dy=0,source='hammer'){if(e.inv>0||e.hp<=0)return;if(e.type==='shabriri'&&e.phase!=='eye')return;if(e.type==='azazel'&&e.phase!=='stunned')return;if(e.type==='ketev'&&(source!=='bomb'||e.phase!=='eye')){tone(130,.04);return;}if(e.type==='boss'&&e.phase!=='rest'){tone(130,.04);return;}e.hp-=damage;e.inv=18;if(!isBoss(e)){const nx=e.x+dx*10,ny=e.y+dy*10;if(walkable(nx,ny)){e.x=nx;e.y=ny;}}tone(250,.08);if(e.hp<=0){if(e.type==='split')for(let i=0;i<2;i++)enemies.push({type:'slime',x:e.x+(i?7:-7),y:e.y,hp:1,t:25,stun:0,inv:0});if(isBoss(e)){winFlame(nightOf());}else if(e.type!=='arm')drops.push({x:e.x,y:e.y,type:room.night===2&&state.bombBag&&Math.random()<.3?'bomb':Math.random()<.35?'heart':'gelt'});rememberEnemies(true);save();}else if(e.type==='shabriri'){e.phase='arms';enemies=enemies.filter(a=>a.type!=='arm');spawnArms(e);}else if(e.type==='azazel'){e.phase='burrow';e.t=65;}}
function walkable(x,y){if(x<6||x>250||y<6||y>170)return false;for(const[ox,oy]of [[-5,-4],[5,-4],[-5,5],[5,5]]){let c=room.tiles[Math.floor((y+oy)/16)]?.[Math.floor((x+ox)/16)];if(!c||'#T~O'.includes(c)||c==='W'&&!state.snorkel&&!(room.puzzle==='drain'&&state.solved.includes(room.id)))return false;}if(room.heavy&&!state.solved.includes(room.id)&&Math.abs(x-room.heavy.x)<12&&Math.abs(y-room.heavy.y)<12)return false;if(room.block&&!state.solved.includes(room.id)&&Math.abs(x-room.block.x)<12&&Math.abs(y-room.block.y)<12)return false;return true;}
function move(dx,dy){let nx=p.x+dx,ny=p.y+dy;
 if(room.block&&!state.solved.includes(room.id)&&Math.abs(nx-room.block.x)<13&&Math.abs(ny-room.block.y)<13){if(dx>0&&Math.abs(p.y-room.block.y)<8){state.solved.push(room.id);tone(330,.2);save();}}
 if(walkable(nx,ny)){p.x=nx;p.y=ny;}}
function repairPosition(){
 if(walkable(p.x,p.y))return;
 let best=null,distance=Infinity;
 for(let y=8;y<=168;y+=4)for(let x=8;x<=248;x+=4){const d=(x-p.x)**2+(y-p.y)**2;if(d<distance&&walkable(x,y)){best={x,y};distance=d;}}
 if(best){p.x=best.x;p.y=best.y;}
}
function movePlayer(dir){
 const [dx,dy]=dirs[dir];
 if(dx&&dirs[p.face][0]===0){const y=p.y+(Math.round(p.y/8)*8-p.y)*.45;if(walkable(p.x,y))p.y=y;}
 if(dy&&dirs[p.face][1]===0){const x=p.x+(Math.round(p.x/8)*8-p.x)*.45;if(walkable(x,p.y))p.x=x;}
 // A thumb need not line up with a doorway to the exact pixel.
 if(room.exits[dir]){
  const near=dir==='n'?p.y<25:dir==='s'?p.y>151:dir==='w'?p.x<25:p.x>231;
  if(near&&dy&&Math.abs(p.x-128)<24)move(Math.sign(128-p.x)*Math.min(1.25,Math.abs(128-p.x)),0);
  if(near&&dx&&Math.abs(p.y-88)<24)move(0,Math.sign(88-p.y)*Math.min(1.25,Math.abs(88-p.y)));
 }
 p.face=dir;move(dx*1.25,dy*1.25);
 if(p.x<13&&dir==='w')door('w');else if(p.x>243&&dir==='e')door('e');else if(p.y<13&&dir==='n')door('n');else if(p.y>163&&dir==='s')door('s');
}
function door(dir){if(room.puzzle&&!state.solved.includes(room.id)&&room.gate===dir&&['valves','drain','mirror','rails','heavy','plates','scales'].includes(room.puzzle)){hint(campaignObjective());return false;}const e=room.exits[dir];if(!e)return false;if((room.puzzle&&(!room.gate||room.gate===dir)&&!state.solved.includes(room.id))||enemies.length&&room.kind==='dungeon'){hint(room.puzzle==='block'?'Push the stone east onto the brass plate.':room.puzzle==='switch'?'Strike the north crystal with the Dreidel.':room.puzzle==='ovens'?'Left oven, right oven, middle. Use A.':room.puzzle==='crack'?'A jelly bomb will open the cracked flue.':room.puzzle==='statue'?'Bomb the cook who faces the door.':'The doors are sealed. Clear the room.');return false;}
 const id=[room.id,e.to].sort().join(':');if(e.locked&&!state.doors.includes(id)){if(!state.keys){hint('A small key is needed.');return false;}state.keys--;state.doors.push(id);tone(300,.15);}
 const x=dir==='e'?12:dir==='w'?244:128,y=dir==='s'?12:dir==='n'?164:88;enter(e.to,x,y);return true;}
let hintTimer=0;function hint(s){if(hintTimer<=0){document.getElementById('status').textContent=s;hintTimer=120;}}
function action(code){if(code.startsWith('Arrow'))return;if(code==='Enter'||code==='Escape'){if(mode==='play')mode='inventory';else if(mode==='inventory')mode='play';clearInput();return;}if(mode==='title'){begin();return;}if(mode==='files')return;if(mode==='dialogue'){dialogue.shift();if(!dialogue.length)mode='play';return;}if(mode==='dead'){state.hp=state.max;p.face='s';enter(room.kind==='dungeon'?['','d0','f0','m0','l0'][nightOf()]:'town');mode='play';return;}if(mode==='ceremony'){
 const n=ceremonyNight;enter(['','grove1','flats2','marsh2','hills2'][n],128,88);mode='play';
 if(n===4)say('The fourth branch catches on the hill.','BELIAL: The King sends his regards.','He takes the light from Judea’s windows.','Four flames recovered. The journey continues.');
 else say('Another branch catches on the hill.',['','The Olive Groves brighten.','The Frying Flats glow with warm light.','The Hippo Marsh wakes in the light.'][n],n===3?'The river bottom opens the western hills.':'Another stronghold waits beyond Judea.');return;
}if(mode!=='play')return;if(code==='KeyZ'||code==='Space')attack();if(code==='KeyX')item();if(code==='KeyC'){const items=['shamash',...(state.dreidel?['dreidel']:[]),...(state.bombBag?['bombs']:[]),...(state.band?['strength']:[])];state.equipped=items[(items.indexOf(state.equipped)+1)%items.length];tone(440,.04);}}
const aliases={KeyW:'ArrowUp',KeyA:'ArrowLeft',KeyS:'ArrowDown',KeyD:'ArrowRight'};
const controls=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyZ','Space','KeyX','KeyC','Enter','Escape'];
// Track input by physical key and pointer, not by button. One finger releasing
// must not cancel another finger, and every cancellation path must release it.
const keyboardHeld=new Map(),touchHeld=new Map();
function syncInput(){keys.clear();for(const code of [...keyboardHeld.values(),...touchHeld.values()]){keys.delete(code);keys.add(code);}}
function clearInput(){keyboardHeld.clear();touchHeld.clear();keys.clear();}
function releasePointer(event){if(touchHeld.delete(event.pointerId))syncInput();}
function pressPointer(event,button){
 event.preventDefault();if(touchHeld.has(event.pointerId))return;
 const code=button.dataset.key;touchHeld.set(event.pointerId,code);syncInput();
 try{button.setPointerCapture(event.pointerId);}catch{} // Global release still works.
 action(code);
}
window.addEventListener('keydown',event=>{
 const code=aliases[event.code]||event.code;
 if(mode==='files')return;
 if(!controls.includes(code)||/INPUT|TEXTAREA/.test(event.target.tagName))return;
 event.preventDefault();if(keyboardHeld.has(event.code)||event.repeat)return;
 keyboardHeld.set(event.code,code);syncInput();action(code);
});
window.addEventListener('keyup',event=>{keyboardHeld.delete(event.code);syncInput();});
window.addEventListener('pointerup',releasePointer,{capture:true});
window.addEventListener('pointercancel',releasePointer,{capture:true});
window.addEventListener('pointermove',event=>{
 const code=touchHeld.get(event.pointerId);if(!code?.startsWith('Arrow'))return;
 event.preventDefault();const target=document.elementFromPoint?.(event.clientX,event.clientY)?.closest('[data-key]');
 if(target?.dataset.key.startsWith('Arrow'))touchHeld.set(event.pointerId,target.dataset.key);else touchHeld.delete(event.pointerId);
 syncInput();
},{passive:false});
function suspend(){if(room&&mode==='inventory')save();clearInput();if(mode==='play'){mode='inventory';save();}last=null;acc=0;}
window.addEventListener('blur',suspend);window.addEventListener('pagehide',suspend);window.addEventListener('orientationchange',suspend);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
for(const button of document.querySelectorAll('[data-key]')){
 button.addEventListener('pointerdown',event=>pressPointer(event,button));
 for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,releasePointer);
 button.addEventListener('touchstart',event=>event.preventDefault(),{passive:false});
}
for(const name of ['contextmenu','selectstart'])document.addEventListener(name,event=>{if(event.target.closest?.('.touch')){event.preventDefault();if(name==='contextmenu')clearInput();}});
document.getElementById('start').onclick=()=>{if(mode==='title')begin();else if(mode!=='inventory')action('KeyZ');else mode='play';canvas.focus();};document.getElementById('pause').onclick=()=>{action('Enter');canvas.focus();};
document.getElementById('sound').onclick=()=>{if(sound&&audio?.state==='running'){sound=false;MusicEngine.stop();updateSoundButton();}else{sound=true;unlockAudio();}};
document.getElementById('export').onclick=()=>{if(!room){hint('Begin your journey before exporting.');return;}save();const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='eight-nights-'+heroName().replace(/[^a-z0-9-]/gi,'_')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.getElementById('import').onclick=()=>{suspend();const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{if(input.files[0].size>524288)throw Error();const s=JSON.parse(await input.files[0].text());if(!valid(s))throw Error();state=normalize(s);p.face=s.face;enter(s.room,s.x,s.y);mode='play';}catch{document.getElementById('status').textContent='Invalid save file · progress kept';}};input.click();};
function heatPhase(){const phase=time%180;return phase<80?0:phase<120?1:2;}
function explode(b){blasts.push({x:b.x,y:b.y,t:14});tone(85,.2,'sawtooth');if(Math.abs(p.x-b.x)<24&&Math.abs(p.y-b.y)<24)hurt(2,b);for(const e of enemies)if(Math.abs(e.x-b.x)<32&&Math.abs(e.y-b.y)<32)hit(e,2,0,0,'bomb');if(room.target&&Math.hypot(b.x-room.target.x,b.y-room.target.y)<30&&!state.solved.includes(room.id)){state.solved.push(room.id);tone(700,.2);save();hint('The stone breaks. A passage opens.');}}
function update(){time++;MusicEngine.tick();if(hintTimer>0&&!--hintTimer)document.getElementById('status').textContent=room?.name||'The Eight Nights';if(mode!=='play')return;if(p.inv>0)p.inv--;if(cooldown>0)cooldown--;if(swing>0)swing--;
 if(!walkable(p.x,p.y))repairPosition();
 const directionKeys={ArrowUp:'n',ArrowDown:'s',ArrowLeft:'w',ArrowRight:'e'};
 const heldDirections=[...keys].filter(code=>directionKeys[code]);
 const dir=directionKeys[heldDirections.at(-1)];
 if(dir)movePlayer(dir);
 if(mode==='play'&&(keys.has('KeyZ')||keys.has('Space'))&&cooldown<=0)attack();
 const portal=room.portal;if(portal&&Math.hypot(p.x-portal.x,p.y-portal.y)<10){const to=portal.to;enter(to,portal.arrivalX??(to==='town'?48:128),portal.arrivalY??(to==='town'?64:to==='home'?120:to==='grove1'?80:136));return;}
 updateCampaign();
 if(room.spring&&Math.hypot(p.x-room.spring.x,p.y-room.spring.y)<16){state.hp=state.max;}
 if(room.kind==='home'&&p.x>180&&p.y<65){state.hp=state.max;}
 if(room.basin&&Math.hypot(p.x-room.basin.x,p.y-room.basin.y)<12)basinTime++;else basinTime=0;
 if(room.tiles[Math.floor(p.y/16)]?.[Math.floor(p.x/16)]==='H'&&heatPhase()===2)hurt(1);
 for(const b of bombs){b.t--;if(b.t===0)explode(b);}bombs=bombs.filter(b=>b.t>0);blasts=blasts.filter(b=>--b.t>0);
 for(const e of enemies){if(e.hp<=0)continue;e.inv=Math.max(0,e.inv-1);if(e.stun>0){e.stun--;continue;}e.t--;let dx=p.x-e.x,dy=p.y-e.y,len=Math.hypot(dx,dy)||1;
 if(campaignBossStep(e,dx,dy,len)){}
 else if(e.type==='ketev'){if(e.phase==='tell'&&e.t<=0){e.phase='roll';e.t=115;e.vx=dx/len*2.1;e.vy=dy/len*2.1;}else if(e.phase==='roll'){e.x+=e.vx;e.y+=e.vy;if(e.x<28||e.x>228){e.vx*=-1;e.x=Math.max(28,Math.min(228,e.x));}if(e.y<28||e.y>148){e.vy*=-1;e.y=Math.max(28,Math.min(148,e.y));}if(e.t<=0){e.phase='eye';e.t=150;for(const a of [-.3,0,.3]){const angle=Math.atan2(dy,dx)+a;shots.push({type:'fire',x:e.x,y:e.y,dx:Math.cos(angle)*1.5,dy:Math.sin(angle)*1.5,t:100});}}}else if(e.phase==='eye'&&e.t<=0){e.phase='tell';e.t=60;}}
 else if(e.type==='boss'){if(e.phase==='tell'&&e.t<=0){e.phase='lunge';e.t=25;e.vx=dx/len*2.4;e.vy=dy/len*2.4;}else if(e.phase==='lunge'){e.x=Math.max(24,Math.min(232,e.x+e.vx));e.y=Math.max(24,Math.min(152,e.y+e.vy));if(e.t<=0){e.lunges++;e.phase=e.lunges%3===0?'rest':'tell';e.t=e.phase==='rest'?100:40;}}else if(e.phase==='rest'&&e.t<=0){e.phase='tell';e.t=60;}}
 else {if(e.type==='rock'&&e.t<=0){shots.push({type:'stone',x:e.x,y:e.y,dx:dx/len*1.6,dy:dy/len*1.6,t:150});e.t=100;}if(e.type!=='rock'){const speed=e.type==='slime'?.32:e.type==='bruiser'?.5:.6;let nx=e.x+dx/len*speed,ny=e.y+dy/len*speed;if(walkable(nx,ny)){e.x=nx;e.y=ny;}}}
 if(Math.hypot(p.x-e.x,p.y-e.y)<(isBoss(e)?19:12)&&!(basinTime>0&&basinTime<=60)&&!(underwater()&&['arm','water','shabriri'].includes(e.type))&&!(e.type==='azazel'&&e.phase==='burrow'))hurt((isBoss(e)||e.type==='bruiser')?2:room.kind==='grove'&&!state.flame?2:1,e);
 }
 for(const s of shots){s.t--;if(s.type==='dreidel'&&s.t<31){const dx=p.x-s.x,dy=p.y-s.y,len=Math.hypot(dx,dy)||1;s.dx=dx/len*3;s.dy=dy/len*3;if(len<7)s.t=0;}s.x+=s.dx;s.y+=s.dy;if(s.type==='hammer'&&'#T'.includes(room.tiles[Math.floor(s.y/16)]?.[Math.floor(s.x/16)]||'#'))s.t=0;if(s.x<0||s.x>256||s.y<0||s.y>176)s.t=0;
 if((s.type==='stone'||s.type==='fire')&&Math.hypot(p.x-s.x,p.y-s.y)<9){const [fx,fy]=dirs[p.face],front=(s.x-p.x)*fx+(s.y-p.y)*fy>0;if(!front||swing>0||s.type==='fire')hurt(s.type==='fire'?2:1,s);else tone(220,.04);s.t=0;}
 if(s.t>0&&s.type!=='stone'&&s.type!=='fire')for(const e of enemies)if(e.hp>0&&Math.hypot(s.x-e.x,s.y-e.y)<(isBoss(e)?19:11)){if(s.type==='dreidel'){e.stun=isBoss(e)?15:90;}else if(s.type==='boulder'){if(e.type==='azazel'&&['surface','cart'].includes(e.phase)){e.phase='stunned';e.t=130;e.inv=0;tone(200,.2);}else if(!isBoss(e))hit(e,2,Math.sign(s.dx),Math.sign(s.dy));s.t=0;}else{hit(e,1,Math.sign(s.dx),Math.sign(s.dy));s.t=0;}}
 if(s.type==='dreidel'&&room.switch&&Math.hypot(s.x-room.switch.x,s.y-room.switch.y)<12&&!state.solved.includes(room.id)){state.solved.push(room.id);tone(880,.2);save();}
 }
 shots=shots.filter(s=>s.t>0);const before=enemies.length;enemies=enemies.filter(e=>e.hp>0);if(before&&!enemies.length&&room.kind==='dungeon'&&!state.cleared.includes(room.id)){state.cleared.push(room.id);tone(660,.2);save();}
 drops=drops.filter(d=>{if(Math.hypot(p.x-d.x,p.y-d.y)<12){if(d.type==='bomb')state.bombs=Math.min(8,state.bombs+1);else if(d.type==='heart')state.hp=Math.min(state.max,state.hp+2);else state.gelt=Math.min(255,state.gelt+1);tone(880,.04);return false;}return true;});if(time%300===0)save();

}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);}function text(s,x,y,c='#f2e5c4',size=8){pixelText(s,x,y,c,size);}function center(s,y,c,size=8){ctx.textAlign='center';text(s,128,y,c,size);ctx.textAlign='left';}
function heart(x,y,full,half=false){rect(x+1,y,2,1,full?'#ed8f98':'#45515c');rect(x+4,y,2,1,full?'#ed8f98':'#45515c');rect(x,y+1,7,3,full?'#ed8f98':'#45515c');rect(x+1,y+4,5,1,full?'#ed8f98':'#45515c');rect(x+2,y+5,3,1,full?'#ed8f98':'#45515c');rect(x+3,y+6,1,1,full?'#ed8f98':'#45515c');if(half)rect(x,y+1,3,4,'#ed8f98');}
function flame(x,y){rect(x-1,y-5,3,6,'#e8a44e');rect(x,y-8,1,5,'#f7e0a1');rect(x,y-3,1,3,'#fff7d9');}
function hippo(x,y,color='#889dc1',face='s'){shadedHippo(x,y,color,face);}
function menorah(x,y,count){rect(x-21,y,42,2,'#d2a963');rect(x-1,y-14,2,27,'#d2a963');rect(x-9,y+12,18,2,'#d2a963');for(let i=0;i<9;i++){const xx=x-20+i*5,yy=y-(i===4?16:10);rect(xx,yy,1,y-yy,'#d2a963');if(i===4||(i<4?i:i-1)<count)flame(xx,yy);}}
function drawWorld(){const bright=!['grove','flats','marsh','hills','river'].includes(room.kind)||regionLit(), dungeon=room.kind==='dungeon';const floor=dungeon?(room.night===2?'#493a37':'#3c3935'):bright?'#64735b':'#3b5058',wall=dungeon?'#77715b':bright?'#8b9674':'#5c7071';rect(0,0,256,176,floor);
 for(let y=0;y<11;y++)for(let x=0;x<16;x++)drawTile(room.tiles[y][x],x,y,dungeon,bright,room.night);
 for(const entity of [...(room.npcs||[]),...enemies])groundShadow(entity.x,entity.y,entity.type==='boss'||entity.type==='ketev'?28:16);
 if(room.kind==='town'){rect(24,16,48,32,'#c0af85');rect(20,16,56,9,'#74584b');rect(45,33,9,15,'#314149');rect(31,29,8,7,'#edc981');flame(35,30);rect(111,83,18,16,'#9a9c84');rect(115,87,10,8,'#4b777e');menorah(128,34,flameCount());text('BUBBE',29,59,'#f1d89d',6);text('EAST: OIL PRESS >',148,160,'#e5d7aa',6);}
 if(room.kind==='town')drawTownSet();
 if(room.kind==='home'){rect(184,24,30,32,'#927b5e');rect(189,39,20,12,'#352e30');flame(198,47);rect(48,48,20,20,'#897658');rect(40,120,32,20,'#717667');text('STOVE',185,67,'#e8cb8b',6);}
 if(room.portal){const{x,y}=room.portal;rect(x-9,y-8,18,16,'#27313b');rect(x-7,y-6,14,12,'#17252d');for(let i=0;i<3;i++)rect(x-6,y+i*3,12,1,'#7c7d61');if(room.id==='grove1'){rect(x-17,y-18,9,28,'#756b51');rect(x+8,y-18,9,28,'#756b51');text('THE GREAT OLIVE',83,24,'#e8d4a1',6);}}
 if(room.spring){rect(112,67,32,25,'#6d9b9d');flame(128,78);}
 if(room.gate&&!state.solved.includes(room.id)){const g=room.gate;if(g==='n'||g==='s'){for(let i=0;i<4;i++)rect(114+i*8,g==='n'?0:168,3,8,'#b69d66');}else{for(let i=0;i<4;i++)rect(g==='w'?0:248,82+i*8,8,3,'#b69d66');}}
 if(room.block){const solved=state.solved.includes(room.id),b=room.block;rect(121,73,14,14,'#b5a260');bevel((solved?128:b.x)-7,b.y-7,14,14,'#91a59c','#d5d4af','#3c5b64');rect((solved?128:b.x)-5,b.y-5,10,3,'#bec0a1');}
 if(room.switch){const s=room.switch;rect(s.x-4,s.y-4,8,8,state.solved.includes(room.id)?'#e8cb7c':'#6bbed1');}
 if(room.basin){rect(53,103,22,18,'#b0b7a3');rect(56,106,16,12,basinTime>60?'#496f7c':'#84bfbd');}
 for(const n of room.npcs||[]){hippo(n.x,n.y,n.who==='Bubbe'?'#b5a2a3':'#b3af98');text(n.who.toUpperCase(),n.x-15,n.y-16,'#f0dfb3',5);}
 if(room.chest&&!state.opened.includes(room.id)){const c=room.chest;groundShadow(c.x,c.y,17);bevel(c.x-7,c.y-5,14,11,enemies.length?'#665e4d':'#ba9451','#edce86','#684b36');rect(c.x-7,c.y-1,14,2,'#3d3731');rect(c.x-1,c.y-1,2,4,'#e9d18e');}
 if(room.target){const t=room.target;rect(t.x-9,t.y-9,18,18,state.solved.includes(room.id)?'#35342f':'#a18b73');if(!state.solved.includes(room.id)){if(room.puzzle==='crack'){for(let i=0;i<4;i++)rect(t.x-2+i%2*3,t.y-7+i*4,2,4,'#362d30');}else{for(const x of [64,128,192]){rect(x-6,56,12,15,'#b3a18b');rect(x-4,52,8,7,'#b3a18b');rect(x-3,59,2,2,'#423930');if(x===128)rect(x+2,59,2,2,'#423930');}}}}
 if(room.levers)for(let i=0;i<3;i++){const l=room.levers[i],off=state.solved.includes(room.id)||room.order.slice(0,leverProgress).includes(i);rect(l.x-9,l.y-7,18,18,'#92725a');rect(l.x-6,l.y-2,12,9,'#362d32');if(!off)flame(l.x,l.y+5);text(String(i+1),l.x-2,l.y+20,'#ebd3a1',7);}
 for(const b of bombs){rect(b.x-4,b.y-4,8,7,b.t%15<7?'#eeaa79':'#ad6674');rect(b.x-2,b.y-6,4,2,'#e5c386');}for(const b of blasts){rect(b.x-21,b.y-21,42,42,b.t%4<2?'#eab67c':'#a55b6b');}
 for(const d of drops){if(d.type==='heart')heart(d.x-3,d.y-3,true);else if(d.type==='bomb'){rect(d.x-4,d.y-3,8,6,'#c5808e');}else{rect(d.x-3,d.y-4,6,8,'#e6bc61');rect(d.x-1,d.y-2,2,4,'#a17c3b');}}
 for(const e of enemies){if(e.inv>0&&time%4<2)continue;if(['shabriri','azazel','arm'].includes(e.type))continue;const x=Math.round(e.x),y=Math.round(e.y);if(e.type==='ketev'){rect(x-13,y-10,26,23,'#9c8d5c');rect(x-10,y-14,20,28,'#a79c6b');for(let i=0;i<4;i++)rect(x-10+i*6,y-8+i%2*5,3,3,'#716b45');rect(x-5,y-1,10,8,e.phase==='eye'?'#f3bc8b':'#554b3a');if(e.phase==='eye')rect(x-1,y+1,3,4,'#301e2b');if(e.phase==='tell')text('!',x-2,y-20,'#f6d8a1',10);}else if(e.type==='slime'||e.type==='split'){rect(x-6,y-2,12,7,'#ab9d5d');rect(x-4,y-5,8,6,'#c0b174');rect(x-3,y,2,2,'#2b3634');rect(x+2,y,2,2,'#2b3634');}else{const boss=e.type==='boss',w=boss?12:e.type==='bruiser'?9:6,c=boss?(e.phase==='rest'?'#a6a18b':'#ab8170'):'#83a478';rect(x-w,y-5,w*2,13,c);rect(x-w-3,y-8,6,5,c);rect(x+w-3,y-8,6,5,c);rect(x-w+2,y-11,w*2-4,10,c);rect(x-5,y-7,3,2,'#f6d68a');rect(x+3,y-7,3,2,'#f6d68a');rect(x-4,y+2,8,3,'#394c48');if(boss){rect(x-17,y+(e.phase==='tell'?-20:-1),5,11,'#d6c5a1');rect(x+13,y+(e.phase==='tell'?-20:-1),5,11,'#d6c5a1');if(e.phase==='rest')text('...',x-5,y-19,'#e8d7a1');}}}
 drawCampaign();
 for(const e of enemies)enemyHighlights(e);
 if(!(p.inv>0&&time%6<3))hippo(p.x,p.y,'#909fc7',p.face);
 if(underwater()){rect(p.x-7,p.y-9,15,17,'#3d9caf66');rect(p.x+8,p.y-13,2,2,'#c6e5d9');}
 const[fx,fy]=dirs[p.face];if(swing>0){rect(p.x+fx*15-2,p.y+fy*15-2,4,10,'#b08a50');rect(p.x+fx*18-6,p.y+fy*18-5,12,6,'#c4c1a2');}else{rect(p.x+fx*8-3,p.y+fy*8-2,6,6,'#b4b0a0');}
 for(const s of shots){if(s.type==='boulder'){bevel(s.x-5,s.y-5,11,10,'#909a93','#d4d2b3','#4a5964');}else if(s.type==='hammer'){rect(s.x-4,s.y-4,8,6,'#c6c5ad');rect(s.x-1,s.y+2,2,5,'#a68b56');}else if(s.type==='dreidel'){rect(s.x-3,s.y-4,6,7,'#e8bd63');rect(s.x-1,s.y-6,2,2,'#e8bd63');rect(s.x-1,s.y+3,2,2,'#e8bd63');}else rect(s.x-2,s.y-2,4,4,s.type==='fire'?'#f3ab68':'#c2bda4');}
 if((['grove','flats','marsh','hills','river'].includes(room.kind)&&!regionLit())||(room.dim&&!lit)){const gradient=ctx.createRadialGradient(p.x,p.y,15,p.x,p.y,58);gradient.addColorStop(0,'rgba(12,23,43,0)');gradient.addColorStop(1,'rgba(12,23,43,.34)');ctx.fillStyle=gradient;ctx.fillRect(0,0,256,176);}
 if(room.boss&&!(hasFlame(nightOf()))){text(['','SHIBTA','KETEV MERIRI','SHABRIRI','AZAZEL'][nightOf()],18,19,'#e9c68a',7);const e=enemies[0];if(e)for(let i=0;i<6;i++)rect((nightOf()===1?64:108)+i*6,14,4,4,i<e.hp?'#e59a85':'#35434a');}
}
function panel(){rect(16,24,224,132,'#101f2e');rect(18,26,220,1,'#bea169');rect(18,153,220,1,'#bea169');}
function currentObjective(){return campaignObjective();}

function draw(){const objective=currentObjective(),label=document.getElementById('objective');if(label.textContent!==objective)label.textContent=objective;rect(0,0,256,256,'#101c2a');ctx.save();ctx.translate(0,64);if(room)drawWorld();else{for(let i=0;i<40;i++)rect((i*73)%256,(i*37)%176,1,1,'#66828d');menorah(128,126,0);hippo(128,152);}
 if(mode==='title'){rect(17,12,222,87,'#162734');center('THE LEGEND OF',30,'#a6b7b6',8);center('HANUKKAH HIPPO',49,'#ebce8d',15);center('THE EIGHT NIGHTS',65,'#b9c7ba',8);center('Z / TAP BEGIN TO CARRY THE LIGHT',88,'#ead6a4',7);}
 if(mode==='dialogue'){rect(5,117,246,54,'#132432');rect(6,118,244,1,'#d5b775');const words=dialogue[0].split(' ');let line='',y=134;for(const word of words){if((line+word).length>37){text(line,14,y,'#efe4c7',7);y+=11;line='';}line+=word+' ';}text(line,14,y,'#efe4c7',7);text('Z / A  >',205,163,'#c5ac77',6);}
 if(mode==='inventory'){panel();center(heroName()+"’S SATCHEL",43,'#e9c47c',10);text('A  '+(state.mallet?'WOODEN MALLET':'FIND JUDAH'),30,61);text('B  '+state.equipped.toUpperCase(),30,75);text('DREIDEL '+(state.dreidel?'YES':'—')+'   KEYS '+state.keys,30,89);text('FLAMES '+flameCount()+'/8  GELT '+state.gelt,30,103);if(state[nightOf()===1?'map':'map'+nightOf()]){const ids=Object.keys(World.rooms).filter(id=>id.startsWith(['','d','f','m','l'][nightOf()])&&World.rooms[id].kind==='dungeon');for(const id of ids){const r=World.rooms[id],minY=Math.min(...ids.map(id=>World.rooms[id].grid[1])),x=166+(r.grid[0]+1)*17,y=54+(r.grid[1]-minY)*8;rect(x,y,10,9,state.cleared.includes(id)?'#c5a666':'#53686b');if(room.id===id)rect(x+3,y+2,4,4,'#f6e5bb');if(state[nightOf()===1?'compass':'compass'+nightOf()]&&r.boss)flame(x+5,y+5);}}text('BOMBS '+state.bombs+'/8'+(state.snorkel?' SNORKEL':'')+(state.band?' BAND':''),30,117,'#d1ac8e',7);text('ENTER / PAUSE TO RETURN',30,138,'#c0b18f',7);}
 if(mode==='dead'){panel();center('THE LIGHT WAITS FOR YOU.',63,'#e9c47c',10);center('Your items and progress are safe.',89,'#b5c5c4',7);center('Z / A TO CONTINUE',124,'#ead6a4',8);}
 if(mode==='ceremony'){rect(0,0,256,176,'#192c39');menorah(128,96,flameCount());center('FLAME '+ceremonyNight+' RESTORED',32,'#f4d48d',12);center('Another region wakes in the light.',133,'#d8dec4',7);center('Z / A TO RETURN',157,'#c2b998',7);}
 ctx.restore();drawHUD();text(room?.name||'THE EIGHT NIGHTS',8,251,'#b4c3ba',6);}

function loop(t){requestAnimationFrame(loop);if(document.hidden){last=null;return;}if(last===null)last=t;acc+=Math.min(t-last,100);last=t;while(acc>=1000/60){update();acc-=1000/60;}draw();}requestAnimationFrame(loop);
