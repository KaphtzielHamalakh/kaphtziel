'use strict';
const RESPAWN_MS=180000;
let encounterOwner=null;
function nightOf(r=room){return r?.night||1;}
function flameFor(n){return n===1?'flame':'flame'+n;}
function hasFlame(n){return !!state[flameFor(n)];}
function isBoss(e){return ['boss','ketev','shabriri','azazel'].includes(e.type);}
function rememberEnemies(killed=false){
 if(!room||room.boss||encounterOwner!==state)return;
 const prior=state.enemyMemory[room.id];
 const until=killed?Date.now()+RESPAWN_MS:prior?.until||Date.now()+RESPAWN_MS;
 state.enemyMemory[room.id]={until,actors:enemies.filter(e=>e.hp>0).map(e=>({type:e.type,x:e.x,y:e.y,hp:e.hp,t:e.t,stun:e.stun,inv:e.inv}))};
}
function roomEnemies(r){
 if(state.cleared.includes(r.id))return [];
 const memory=state.enemyMemory[r.id];if(memory&&memory.until>Date.now())return memory.actors.map(e=>({...e}));
 delete state.enemyMemory[r.id];
 return (r.spawns||[]).map((e,i)=>({...e,hp:e.type==='bruiser'?4:e.type==='split'?2:1,t:30+i*40,stun:0,inv:0}));
}
function underwater(){return !!room&&state.snorkel&&room.tiles[Math.floor(p.y/16)]?.[Math.floor(p.x/16)]==='W'&&!(room.puzzle==='drain'&&state.solved.includes(room.id));}
function newBoss(r){return {type:r.bossKind||'boss',x:128,y:64,hp:6,t:65,phase:r.bossKind==='shabriri'?'arms':r.bossKind==='azazel'?'burrow':'tell',lunges:0,stun:0,inv:0,vx:0,vy:0};}
function spawnArms(boss){const positions=[[64,64],[192,64],[64,120],[192,120]],count=Math.max(1,Math.ceil(boss.hp*2/3));for(let i=0;i<count;i++)enemies.push({type:'arm',x:positions[i][0],y:positions[i][1],baseX:positions[i][0],baseY:positions[i][1],hp:2,t:30+i*35,stun:0,inv:0});}
function winFlame(n){
 ceremonyNight=n;state[flameFor(n)]=true;state.max=6+flameCount()*2;state.hp=state.max;if(!state.cleared.includes(room.id))state.cleared.push(room.id);
 if(n===4)state.belial=true;save();mode='ceremony';clearInput();tone(1046,.6,'triangle');
}
function campaignInteract(){
 if(room.valvePositions&&state.solved.includes(room.id))return false;
 if(room.valvePositions){const i=room.valvePositions.findIndex(v=>Math.hypot(v.x-p.x,v.y-p.y)<23);if(i>=0){state.valves[i]=1-state.valves[i];if(state.valves.join(',')==='0,1,0'&&!state.solved.includes(room.id)){state.solved.push(room.id);hint('Low, high, low. The pool gate opens.');}tone(440+state.valves[i]*220,.1);save();return true;}}
 if(room.railSwitch&&state.solved.includes(room.id))return false;
 if(room.railSwitch&&Math.hypot(p.x-room.railSwitch.x,p.y-room.railSwitch.y)<24){state.rail=(state.rail+1)%3;if(state.rail===2&&!state.solved.includes(room.id))state.solved.push(room.id);hint(['Rails: west siding.','Rails: empty shaft.','Rails: guard platform. East passage open.'][state.rail]);tone(330,.1);save();return true;}
 if(room.heavy&&Math.hypot(p.x-room.heavy.x,p.y-room.heavy.y)<25){if(!state.band)hint('The Strength Band can lift this boulder.');else{if(!state.solved.includes(room.id))state.solved.push(room.id);hint('The boulder lifts. The west passage opens.');save();}return true;}
 if(room.plates&&p.heldRock){const i=room.plates.findIndex(v=>Math.hypot(p.x-v.x,p.y-v.y)<23);if(i>=0){if(!state.plates.includes(i))state.plates.push(i);p.heldRock=false;if(state.plates.length===3&&!state.solved.includes(room.id))state.solved.push(room.id);save();hint('Boulders on plates: '+state.plates.length+'/3.');return true;}}
 if(room.scale&&state.solved.includes(room.id))return false;
 if(room.scale&&Math.hypot(p.x-room.scale.x,p.y-room.scale.y)<25){state.scaleWeight=(state.scaleWeight+1)%4;if(state.scaleWeight===3&&!state.solved.includes(room.id))state.solved.push(room.id);hint('Borrowed brass coins on the scale: '+state.scaleWeight+'/3.');tone(500,.1);save();return true;}
 if(room.cart&&Math.hypot(p.x-128,p.y-88)<24){p.x=128;p.y=28;p.inv=60;hint('The cart carries you to the north platform.');tone(240,.2);return true;}
 return false;
}
function campaignNPC(who){
 const lines={Bathkeeper:['THE BATHKEEPER: South, then east twice.','The stilt hut leads to the Sunken Mikveh.'],WaterSage:['THE SAGE: Low, high, low.','A hippo walks the bottom with a Snorkel.','Break the arms, then strike the eye.'],Miner:['THE MINER: The mine lies two screens west.','Lift the stones the old ways could not.'],MineSage:['THE SURVEYOR: Three plates. Three stones.','Three borrowed coins balance the scales.','When Azazel surfaces, throw a boulder.']};
 if(lines[who]){say(...lines[who]);return true;}return false;
}
function updateCampaign(){
 if(room.submergedSwitch&&state.snorkel&&Math.hypot(p.x-room.submergedSwitch.x,p.y-room.submergedSwitch.y)<12&&!state.solved.includes(room.id)){state.solved.push(room.id);save();hint('The submerged drain opens. The pool empties.');tone(580,.2);}
 if(room.mirrorPlate&&Math.hypot(p.x-room.mirrorPlate.x,p.y-room.mirrorPlate.y)<12&&!state.solved.includes(room.mirrorPlate.to)){state.solved.push(room.mirrorPlate.to);save();hint('A gate opens in the reflected room.');}
 if(room.current&&underwater())move(.25,0);
}
function campaignBossStep(e,dx,dy,len){
 if(e.type==='arm'){e.x=e.baseX+Math.sin((time+e.t)/35)*10;e.y=e.baseY+Math.cos((time+e.t)/45)*6;return true;}
 if(e.type==='shabriri'){
  if(e.phase==='arms'&&!enemies.some(a=>a.type==='arm'&&a.hp>0)){e.phase='eye';e.t=180;tone(700,.1);}
  if(e.phase==='eye'&&e.t<=0){e.phase='arms';spawnArms(e);}return true;
 }
 if(e.type!=='azazel')return false;
 if(e.phase==='burrow'&&e.t<=0){e.phase=e.hp<=2?'cart':'surface';e.t=e.phase==='cart'?150:130;e.x=80+(e.hp%3)*48;e.y=64;}
 else if(e.phase==='surface'){if(e.t%40===0)shots.push({type:'stone',x:e.x,y:e.y,dx:dx/len*1.6,dy:dy/len*1.6,t:100});if(e.t<=0){e.phase='burrow';e.t=65;}}
 else if(e.phase==='cart'){e.x=128+Math.sin(time/23)*90;e.y=80;if(e.t<=0){e.phase='burrow';e.t=60;}}
 else if(e.phase==='stunned'&&e.t<=0){e.phase='burrow';e.t=70;}
 return true;
}
function validCampaignState(s){
 if(s.enemyMemory!==undefined){if(!s.enemyMemory||typeof s.enemyMemory!=='object'||Array.isArray(s.enemyMemory))return false;for(const[id,m]of Object.entries(s.enemyMemory)){if(!World.rooms[id]||!m||!Number.isFinite(m.until)||!Array.isArray(m.actors)||m.actors.length>32||m.actors.some(e=>!e||!['grunt','slime','split','bruiser','rock','water','mine'].includes(e.type)||!Number.isFinite(e.x)||e.x<0||e.x>256||!Number.isFinite(e.y)||e.y<0||e.y>176||!Number.isFinite(e.hp)||e.hp<=0||e.hp>4||!['t','stun','inv'].every(k=>Number.isFinite(e[k]))))return false;}}
 return (s.valves===undefined||Array.isArray(s.valves)&&s.valves.length===3&&s.valves.every(v=>v===0||v===1))&&(s.plates===undefined||Array.isArray(s.plates)&&s.plates.length<=3&&s.plates.every(v=>[0,1,2].includes(v)))&&(s.rail===undefined||[0,1,2].includes(s.rail))&&(s.scaleWeight===undefined||[0,1,2,3].includes(s.scaleWeight));
}
function campaignObjective(){
 if(mode==='files')return 'Choose one of three files, then register your name or continue.';
 if(!state.mallet)return 'Find Judah by the well. Take his mallet before leaving Judea.';
 const n=nightOf();
 if(room?.kind==='river'&&!state.snorkel)return 'The river is too deep. Find the Snorkel in the Sunken Mikveh, south of Judea.';
 if(n===3&&!hasFlame(3)){
  if(room?.id==='m3'&&!state.solved.includes('m3'))return 'A turns a valve. Set the three water levels LOW, HIGH, LOW.';
  if(!state.snorkel)return 'South of Judea, then east twice: enter the stilt hut and find the Snorkel.';
  if(room?.id==='m6'&&!state.solved.includes('m6'))return 'Walk under the water to the central drain switch.';
  if(room?.id==='m11'&&!state.solved.includes('m11'))return 'The gate opens from the plate in the previous mirror pool.';
  return 'Break Shabriri’s sweeping arms, then strike its exposed eye from dry ground.';
 }
 if(n===4&&!hasFlame(4)){
  if(room?.puzzle==='rails'&&!state.solved.includes(room.id))return 'Turn the junction with A until the rails point to the guard platform.';
  if(!state.band)return 'Cross the river bottom, then travel west to the mine. Recover the Strength Band.';
  if(room?.puzzle==='heavy'&&!state.solved.includes(room.id))return 'Stand beside the heavy boulder and press A to lift it.';
  if(room?.puzzle==='plates'&&!state.solved.includes(room.id))return 'Select STRENGTH. X lifts a rock; carry it to a plate and press A.';
  if(room?.puzzle==='scales'&&!state.solved.includes(room.id))return 'A adds a borrowed brass coin. Three coins balance the honest scales.';
  if(room?.cart)return 'Stand at the cart in the center and press A to ride north.';
  return 'Throw a boulder when Azazel surfaces. Hammer him while stunned.';
 }
 if(room?.id==='d3'&&!state.solved.includes('d3'))return 'Push the gray stone east onto the brass plate. The south exit stays open.';
 if(room?.id==='d6'&&!state.solved.includes('d6'))return 'Throw the Dreidel north at the crystal. Return east if you need to find it.';
 if(n===2&&!hasFlame(2)){
  if(!state.bombBag)return 'Find the furnace’s jelly bag. The Bruiser guards it.';
  if(!state.solved.includes('f5'))return 'A jelly bomb opens the cracked flue. Stand clear of the blast.';
  if(!state.solved.includes('f6'))return 'A at the ovens: left, right, middle. The second key is west.';
  if(!state.solved.includes('f10'))return 'Bomb the central, forward-facing cook to open the stair.';
  return 'Ketev rolls, then opens its eye. Land three bombs during that opening.';
 }
 if(!hasFlame(1))return state.dreidel?'Find the second key west of the crystal. Strike Shibta after three lunges.':'East twice from Judea: enter the hollow olive and find the Dreidel.';
 if(!hasFlame(2))return 'South from the first grove, then east twice: the Latke Furnace.';
 if(!hasFlame(3))return 'South from Judea, then east twice: the Sunken Mikveh.';
 if(!hasFlame(4))return 'With the Snorkel, cross the river west of Judea to the Gelt Mines.';
 return 'Four flames restored. Belial has dimmed Judea. Nights Five–Eight are still to come.';
}
function drawCampaign(){
 if(room.valvePositions)room.valvePositions.forEach((v,i)=>{bevel(v.x-8,v.y-8,16,16,'#88a6a2','#d2d5b5','#345d70');rect(v.x-5,v.y-1,11,2,'#d0c98e');rect(v.x-1,v.y-5,2,11,'#d0c98e');text(state.valves[i]?'HIGH':'LOW',v.x-8,v.y+20,'#f0ddb3',5);});
 if(room.submergedSwitch){const v=room.submergedSwitch;bevel(v.x-6,v.y-6,12,12,state.solved.includes(room.id)?'#b8b58b':'#305c78','#99d3c7','#20394f');}
 if(room.mirrorPlate){const v=room.mirrorPlate;bevel(v.x-8,v.y-5,16,10,'#8fbbba','#d3e6d0','#456f7c');}
 if(room.railSwitch||room.cart||room.bossKind==='azazel'){
  rect(24,78,208,2,'#bab6a1');rect(24,88,208,2,'#bab6a1');for(let x=24;x<232;x+=12)rect(x,77,3,14,'#756047');
  if(room.railSwitch){bevel(120,72,16,16,'#858c84','#d9ca8b','#36475c');text(['W','S','E'][state.rail],125,67,'#e7d49d',8);}
  if(room.cart){bevel(115,79,26,15,'#88929c','#d7d7b4','#354657');rect(118,94,5,4,'#283341');rect(133,94,5,4,'#283341');}
 }
 if(room.heavy&&!state.solved.includes(room.id))bevel(room.heavy.x-10,room.heavy.y-9,20,19,'#8a968e','#c6c4a4','#3d5361');
 for(const r of room.rocks||[])bevel(r.x-8,r.y-6,16,14,'#919d98','#d4d2b1','#405363');
 if(room.plates)room.plates.forEach((r,i)=>bevel(r.x-8,r.y-5,16,10,state.plates.includes(i)?'#afb18d':'#53656b','#bcc18f','#2c4351'));
 if(room.scale){const r=room.scale;rect(r.x-1,r.y-16,3,32,'#baa575');rect(r.x-24,r.y-12,48,2,'#dbc58d');rect(r.x-26,r.y-10,13,10,'#9d8e6b');rect(r.x+13,r.y-10,13,10,'#9d8e6b');for(let i=0;i<state.scaleWeight;i++)rect(r.x-24+i*4,r.y-6,3,3,'#e5c875');text('III',r.x+15,r.y-5,'#e6d2a6',7);}
 for(const e of enemies){if(e.inv>0&&time%4<2)continue;
  if(e.type==='arm'){const b=enemies.find(e=>e.type==='shabriri');if(b){for(let i=0;i<8;i++){const t=i/8;rect(b.x+(e.x-b.x)*t-2,b.y+(e.y-b.y)*t-2,5,5,'#357e8c');}}bevel(e.x-6,e.y-5,13,11,e.stun>0?'#a6d2c1':'#599a9c','#c0d7be','#28536d');}
  if(e.type==='shabriri'){const w=10+e.hp;bevel(e.x-w,e.y-12,w*2,25,'#679eab','#b7ded1','#2e5974');rect(e.x-6,e.y-3,13,10,e.phase==='eye'?'#eadca9':'#355f7b');if(e.phase==='eye')rect(e.x-1,e.y-1,3,6,'#1d344d');text(['','I','RI','IRI','RIRI','BRIRI','SHABRIRI'][e.hp]||'SHABRIRI',92,28,'#d9e0b8',7);}
  if(e.type==='azazel'){if(e.phase==='burrow'){rect(e.x-15,e.y+4,30,5,'#293c4e');rect(e.x-11,e.y+2,22,2,'#9d997d');}else{bevel(e.x-11,e.y-10,23,25,e.phase==='stunned'?'#b5b39a':'#978369','#dfc59c','#48505b');rect(e.x-11,e.y-20,4,13,'#ddd1ad');rect(e.x+8,e.y-20,4,13,'#ddd1ad');rect(e.x-15,e.y-22,6,4,'#ddd1ad');rect(e.x+9,e.y-22,6,4,'#ddd1ad');rect(e.x-6,e.y-6,3,3,'#e9be78');rect(e.x+4,e.y-6,3,3,'#e9be78');rect(e.x-3,e.y+3,7,7,'#5b5c59');}}
 }
 if(p.heldRock)bevel(p.x-6,p.y-23,13,11,'#a0aaa2','#dedabb','#526775');
 if(room.kind==='town'&&state.belial){rect(0,0,256,176,'#15263d44');text('THE WINDOWS HAVE GONE DARK',57,153,'#e3c498',6);}
}
