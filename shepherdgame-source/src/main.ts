import './style.css';
import {guardGameGestures,installDisplayPanel} from './engine/display';
import {C,motion,type Body} from './config';
import {Input,type Key} from './engine/input';
import {Audio} from './engine/audio/audio';
import {musicManifest} from './engine/audio/musicManifest';
import {fresh,read,write,encode,decode,options,saveOptions,type Save} from './engine/save';
import {text} from './art/font';
import {david,enemySprite} from './art/sprites';
import {demonSprite} from './art/demons';
import {landscape,stoneTile} from './art/landscape';
import {realms,songs,psalms} from './data/realms';
import {story} from './data/text';
import {drawPuzzleObject} from './art/puzzleArt';
import {opposite,routeMap,puzzleHit,puzzleSong,updatePuzzle,type Direction} from './realmDesign';
import {makeRoom,prologueRoom,type Room,type Entity} from './levels';
const canvas=document.querySelector<HTMLCanvasElement>('#screen')!,ctx=canvas.getContext('2d')!;
ctx.imageSmoothingEnabled=false;
const input=new Input(),audio=new Audio();input.onGesture=()=>audio.unlock();
let opt=options();
function applyOptions(){document.body.classList.toggle('always-touch',opt.touch===1);document.body.classList.toggle('no-touch',opt.touch===2);document.documentElement.style.setProperty('--control-opacity',String(opt.opacity));document.documentElement.style.setProperty('--control-scale',String(opt.scale));for(const el of document.querySelectorAll<HTMLElement>('#controller>*')){const id=el.id||el.dataset.key||'';el.style.transform=`scale(${opt.scale})`;if(opt.layout[id]){el.style.left=opt.layout[id].x+'px';el.style.top=opt.layout[id].y+'px';el.style.right='auto';el.style.bottom='auto';}}saveOptions(opt);audio.volumes();}
applyOptions();
function resize(){
 const mobile=matchMedia('(pointer:coarse)').matches||document.body.classList.contains('touch')||opt.touch===1;
 const viewport=window.visualViewport;const nativeScale=viewport?.scale??1;
 const portrait=mobile&&(nativeScale===1?(viewport?.height??innerHeight):innerHeight)>(nativeScale===1?(viewport?.width??innerWidth):innerWidth);
 document.body.classList.toggle('phone-portrait',portrait);
 const game=document.querySelector<HTMLElement>('#game')!,style=getComputedStyle(game);
 const px=(value:string)=>Number.parseFloat(value)||0;
 const width=Math.min(game.clientWidth,nativeScale===1?(viewport?.width??innerWidth):innerWidth)-px(style.paddingLeft)-px(style.paddingRight);
 const height=Math.min(game.clientHeight,nativeScale===1?(viewport?.height??innerHeight):innerHeight)-px(style.paddingTop)-px(style.paddingBottom)-(portrait?220:0);
 const fit=Math.min(width/256,Math.max(1,height)/240);
 // Phones use all the available room; desktop retains whole-pixel scaling.
 const scale=(mobile?fit:(fit>=1?Math.floor(fit):fit))*opt.screenScale;
 canvas.style.width=256*scale+'px';canvas.style.height=240*scale+'px';
 document.body.classList.toggle('controls-overlap',mobile&&!portrait&&(width-256*scale)/2<190);
}
addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);addEventListener('orientationchange',resize);
addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){document.body.classList.add('touch');resize();}});
resize();document.querySelector('#dismiss')!.addEventListener('click',()=>document.querySelector<HTMLElement>('#rotate')!.style.setProperty('display','none'));
document.querySelector('#fullscreen')!.addEventListener('click',()=>{if(document.fullscreenElement)void document.exitFullscreen();else document.querySelector('#game')!.requestFullscreen?.().catch(()=>{});});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='stage'){state='pause';audio.paused=true;audio.volumes();}else if(!document.hidden)audio.unlock();});
type State='title'|'slots'|'difficulty'|'select'|'stage'|'pause'|'options'|'story'|'intro'|'power'|'password'|'gameover'|'ending'|'sound'|'remap'|'layout'|'rematches'|'map';
let state:State='title',returnOptions:State='title',t=0,stateTime=0,select=0,menu=0,slot=0,save:Save=fresh(),realm=0,roomIndex=0,room:Room=makeRoom(0,0),campaign:'prologue'|'realms'|'elah'|'tower'|'rematch'|'final'|'saul'='prologue';
let visited=new Set<number>();
let hp=28,lives=3,energy=Array(8).fill(28),companionEnergy=28,weapon=-1,face=1,invul=0,knock=0,throwing=0,charge=0,stones=5,refill=0,checkpoint=0,respawnX=24,slideFace=1,frame=0,transition=0,transitionDir=1,doorWait=0,verticalTransition=false;
let p:Body={x:24,y:180,vx:0,vy:0,ground:false,wasMoving:false,slide:0,climbing:false};
type Shot={x:number,y:number,vx:number,vy:number,life:number,power:number,damage:number,bounce:number,enemy:boolean};
let shots:Shot[]=[],particles:{x:number,y:number,vx:number,vy:number,life:number,color:string}[]=[],drops:Entity[]=[],boss:{x:number,y:number,hp:number,max:number,frame:number,hit:number,phase:number,stun:number}|null=null;
let bubbleRide=0,iceVX=0,dropFrames=0;const veilHits=new Set<string>();
let notes='',noteTime=0,notice='',noticeTime=0,lightTime=0,veil=0,saulSongs=0,rematchMask=0,companion:{x:number,y:number,kind:number,time:number}|null=null;
let storyLines:string[]=[],storyNext=()=>{},passwordGrid=encode(fresh()),passwordEdit=false,passwordCursor=0,soundCursor=0,endingPanel=0;
const hitAreas:{x:number,y:number,w:number,h:number,action:()=>void}[]=[];
const count=(n:number)=>n.toString(2).replace(/0/g,'').length;
function change(s:State){if(s!=='stage')audio.duck(false);if(['stage','select','title','intro','power'].includes(s))audio.paused=false;else if(s==='pause'||s==='map')audio.paused=true;audio.volumes();state=s;stateTime=0;menu=0;}
function tell(lines:string[],next:()=>void){storyLines=lines;storyNext=next;change('story');}
function notify(s:string){notice=s;noticeTime=180;}
function tune(id:string){void audio.play(id);if(id==='stage_select')void audio.load('boss');}
function saveGame(){write(slot,save);}
function startSlot(n:number,newGame=false){slot=n;save=newGame?fresh():read(n)||fresh();lives=save.difficulty===0?5:3;hp=28;energy.fill(28);companionEnergy=28;weapon=-1;if(!save.prologue){change('difficulty');}else{change('select');tune('stage_select');}}
function beginPrologue(){campaign='prologue';realm=0;checkpoint=0;roomIndex=0;tell(story.prologue,()=>{enterRoom(0);tune('prologue');});}
function startRealm(n:number){visited.clear();if(weapon===8)weapon=-1;realm=n;campaign='realms';checkpoint=0;hp=28;enterRoom(0);tune(realms[n].track);}
function enterRoom(n:number,fromLeft=false){visited.add(n);roomIndex=n;state='stage';audio.paused=false;audio.volumes();stateTime=0;shots=[];drops=[];boss=null;doorWait=0;room=campaign==='prologue'?prologueRoom(n):makeRoom(realm,n,campaign==='realms'||campaign==='rematch');p.x=fromLeft?224:24;p.y=180;p.vy=0;p.slide=0;dropFrames=0;p.wasMoving=false;respawnX=p.x;transition=18;transitionDir=fromLeft?-1:1;verticalTransition=false;notes='';
 if(campaign==='elah'){room.title=['THE PHILISTINE LINES','THE BROOK','GOLIATH'][Math.min(n,2)];if(n===0){room.entities.filter(e=>e.type==='walker').forEach(e=>e.type='shield');}if(n===1){room=makeRoom(5,4,false);room.title='THE BROOK';room.entities=[];tell(story.brook,()=>{stones=5;weapon=8;change('stage');});}if(n===2){room=makeRoom(7,8,false);room.title='GOLIATH';startBoss();}}
 if(campaign==='tower'){room.title='TOWER OF SHADOWS '+(n+1);realm=n%8;room=makeRoom(realm,6,false);room.title='TOWER OF SHADOWS '+(n+1);const obj=['thorn','water','cracked','standing','windmill','basin','shadow','socket'][n];room.entities.push({id:'required',type:obj,x:218,y:160,w:16,h:48,hp:1,active:false,timer:0,power:n});}
 if(campaign==='final'){room=makeRoom(6,8,false);room.title='ASHMEDAI THE KING';startBoss();}
 if(campaign==='saul'){room=makeRoom(6,8,false);room.entities=[];room.title='THE LYRE IN THE PALACE';p.x=24;tune('saul');}
 if(campaign==='realms'&&n===8||campaign==='rematch')startBoss();
 if(campaign==='realms'&&n===4||n===7){checkpoint=n;hp=Math.min(28,hp+10);energy=energy.map(e=>Math.min(28,e+10));}
}
function startBoss(){boss={x:190,y:132,hp:campaign==='elah'?40:28,max:campaign==='elah'?40:28,frame:-100,hit:0,phase:0,stun:0};if(campaign!=='elah'&&campaign!=='final')change('intro');tune(campaign==='elah'?'goliath':campaign==='final'?'ashmedai_final':'boss');void audio.jingle('jingle_boss_intro');}
function spark(x:number,y:number,color:string,n=10){for(let i=0;i<n;i++){const a=Math.PI*2*i/n;particles.push({x,y,vx:Math.cos(a)*1.5,vy:Math.sin(a)*1.5,life:35,color});}}
function rect(x:number,y:number,w:number,h:number,c:string){ctx.fillStyle=c;ctx.fillRect(Math.floor(x),Math.floor(y),w,h);}
function overlap(a:{x:number,y:number,w:number,h:number},b:{x:number,y:number,w:number,h:number}){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function playerBox(){return {x:p.x,y:p.y+(p.slide?10:0),w:14,h:p.slide?12:22};}
function lockedExitLadder(x:number,y:number){return room.forward==='up'&&!!room.puzzleState&&!room.puzzleState.solved&&Math.floor(x/16)===Math.floor((room.exits?.up?.x??-100)/16)&&y<192;}
function tile(x:number,y:number){if(x<0||x>=256||lockedExitLadder(x,y))return '.';return room.tiles[Math.floor(y/16)]?.[Math.floor(x/16)]||'.';}
const blockKinds=['gate','harp','block','crate','thorn','cracked','shadow','sand','water','ice','bossgate','step','lanterncart'];
type Solid={x:number,y:number,w:number,h:number,oneWay?:boolean};
const solidTile=(v:string)=>v==='#'||v==='I';
function waterSurface(){return room.waterLine===undefined?256:room.waterLine+(room.scene==='tidal-shore'?Math.sin(t/150)*5:0);}
function submerged(){return campaign==='realms'&&p.y+11>waterSurface();}
function solids(){const a:Solid[]=[];room.tiles.forEach((r,y)=>[...r].forEach((v,x)=>{if(solidTile(v)||v==='=')a.push({x:x*16,y:y*16,w:16,h:v==='='?5:16,oneWay:v==='='});}));
 for(const e of room.entities){if((blockKinds.includes(e.type)&&!e.active&&(e.type!=='shadow'||veil===0))||(e.type==='animal'&&e.active)||e.type==='light'&&lightTime>0)a.push(e);
 if(e.type==='counterlift'||e.type==='floatbarrel'||e.type==='fallingStone'||e.type==='timedbridge'&&e.active)a.push({...e,oneWay:true});
 if(e.type==='rhythm'&&Math.floor(t/(3600/(musicManifest.realm_night.bpm||120)))%4<2||e.type==='lift'||e.type==='crumbling'&&!e.active)a.push({...e,oneWay:true});
 if(e.type==='water'&&e.active)a.push({...e,h:4,oneWay:true});}if(companion)a.push({x:companion.x,y:companion.y,w:28,h:8,oneWay:true});return a;}
function updatePlatforms(){for(const e of room.entities){
 if(e.type==='lift'){const old=e.y;e.y=(e.originY??160)+Math.sin(t/80)*22;const dy=e.y-old;if(p.ground&&Math.abs(p.y+22-old)<2&&p.x+14>e.x&&p.x<e.x+e.w)p.y+=dy;}
 if(e.type==='crumbling'){const standing=p.ground&&Math.abs(p.y+22-e.y)<2&&p.x+14>e.x&&p.x<e.x+e.w;if(standing||e.timer>0)e.timer++;if(e.timer>35)e.active=true;if(e.timer>180){e.timer=0;e.active=false;}}
 }}

function damage(n:number,from:number){if(invul||veil||state!=='stage')return;hp-=Math.max(1,Math.round(n*(save.difficulty===0?.5:save.difficulty===2?1.5:1)));invul=C.invincible+C.knockFrames;knock=C.knockFrames;p.vx=p.x<from?-1:1;p.vy=-2;audio.sfx('hurt');spark(p.x+7,p.y+8,'#e3b282',5);if(hp<=0)die();}
function die(){lives--;audio.sfx('death');if(lives<=0){change('gameover');void audio.jingle('jingle_game_over');}else{hp=28;invul=120;enterRoom(checkpoint);notify('THE FLOCK STILL NEEDS YOU.');}}
function fire(){
 if(campaign==='elah'&&roomIndex>=1){if(charge>=40&&stones>0){stones--;shots.push({x:p.x+7,y:p.y+6,vx:face*5,vy:0,life:100,power:8,damage:8,bounce:0,enemy:false});audio.sfx('fire');}return;}
 if(weapon===8)return;
 if(weapon===9||weapon===10){if(companionEnergy<4)return;companionEnergy-=4;companion={x:p.x+face*28,y:p.y+12,kind:weapon,time:weapon===9?600:300};audio.sfx('bell');return;}
 if(shots.filter(s=>!s.enemy&&s.power<0).length>=3&&weapon<0)return;
 if(shots.filter(s=>!s.enemy).length>=6)return;
 if(weapon>=0){if(energy[weapon]<realms[weapon].cost){audio.tone(90,.08);return;}if(weapon===7&&!p.ground)return;energy[weapon]-=realms[weapon].cost;}
 if(weapon===6){veil=12;veilHits.clear();p.vx=face*4;for(const e of room.entities)if(Math.abs(e.x-p.x)<64)powerObject(e,6);}
 if(weapon===7){spark(p.x,p.y+20,realms[7].color,18);for(const e of room.entities)if(['walker','turret','mini','shield'].includes(e.type))hurtEnemy(e,2);for(const e of room.entities)powerObject(e,7);if(boss&&boss.y>150)hitBoss(2,7);}
 else shots.push({x:p.x+(face===1?14:-6),y:p.y+8,vx:face*(weapon===3?6:weapon===2?2:4),vy:weapon===2?-4:weapon===5&&input.is('up')?-2:0,life:weapon===2?40:weapon===4?20:80,power:weapon,damage:weapon<0?1:realms[weapon].damage,bounce:0,enemy:false});
 if(weapon===5&&input.is('up'))bubbleRide=180;throwing=12;audio.sfx('fire');
}
function cycle(d:number){const list=[-1,...realms.map((_,i)=>i).filter(i=>save.mask&(1<<i)),...(count(save.mask)>=1?[9]:[]),...(count(save.mask)>=4?[10]:[])];weapon=list[(list.indexOf(weapon)+d+list.length)%list.length];notify(weapon===9?'AYIL THE RAM':weapon===10?'THE DOVE':weapon<0?'SLING':realms[weapon].power);audio.sfx('switch');}
function powerObject(e:Entity,power:number){const map:Record<string,number[]>={thorn:[0],brazier:[0],ice:[0],water:[1],cracked:[2],barrel:[0,2],standing:[3],windmill:[4],crate:[0,4],torch:[4,5],curtain:[5],basin:[5],shadow:[6],moon:[6],stalactite:[7],socket:[7],sand:[4]};if(map[e.type]?.includes(power)){e.active=true;e.timer=power===1?480:600;audio.sfx('bell');spark(e.x+8,e.y+8,'#f7dc9c');}}
function playSong(s:string){if(s==='DLR'){room.entities.filter(e=>e.type==='animal').forEach(e=>e.active=true);notify('SONG OF THE FOLD');}else if(s==='UDU'){room.entities.filter(e=>e.type==='harp').forEach(e=>e.active=true);notify('SONG OF OPENING');}else if(s==='RUL'&&save.morning){lightTime=600;if(campaign==='saul'&&p.x>100){saulSongs++;if(saulSongs===3){tell(story.saul,()=>{change('ending');endingPanel=0;tune('coronation');});}}if(campaign==='final'&&boss&&boss.phase===2){boss.stun=180;spark(boss.x,boss.y,'#f4e3b2',24);}notify('SONG OF MORNING');}else {audio.tone(85,.3);notify('THE SONG FADES.');return;}puzzleSong(room,s);updatePuzzle(room,p,t);void audio.jingle('jingle_song_learned');}
function hurtEnemy(e:Entity,n:number){if(e.hp<=0)return;e.hp-=n;if(e.hp<=0){spark(e.x+e.w/2,e.y+e.h/2,realms[realm].light,16);audio.sfx('hit');const roll=Math.random();if(roll>.75){const d={...e,type:roll<.87?'honey':roll<.95?'energy':roll<.98?'jar':'life',w:8,h:10};drops.push(d);}if(campaign==='prologue'&&e.type==='mini'){notify(e.id==='lion'?'THE LION IS CALM.':'THE BEAR IS CALM.');}}}
function hitBoss(n:number,power:number){if(!boss||boss.hit>0||boss.frame<0)return;if(campaign==='elah'){const taunt=boss.frame%240>145&&boss.frame%240<215;if(power!==8||!taunt){audio.sfx('bell');return;}}
 let weak=campaign==='final'?(boss.phase===0?3:boss.phase===1?0:-2):realms[realm].weak;
 if(power===weak){n*=4;boss.stun=Math.max(boss.stun,18);}if(campaign==='final'&&boss.phase===2&&boss.stun)n*=2;
 boss.hp-=n;boss.hit=12;audio.sfx('hit');spark(boss.x,boss.y,realms[realm].light,6);
 if(boss.hp<=0){if(campaign==='final'&&boss.phase<2){boss.phase++;boss.hp=28;boss.frame=0;spark(boss.x,boss.y,'#f4e3b2',32);notify(boss.phase===1?'THE THRONE SHATTERS!':'PLAY THE SONG OF MORNING!');return;}bossDefeated();}}
function bossDefeated(){if(!boss)return;spark(boss.x,boss.y,'#f1d890',40);boss=null;shots=[];hp=28;energy.fill(28);companionEnergy=28;void audio.jingle('jingle_stage_clear');
 if(campaign==='elah'){save.fortress=1;saveGame();tell(['THE GIANT FALLS.','A SHADOW RISES FROM THE SMOKE.','ASHMEDAI HAS BEEN REVEALED.'],()=>{campaign='tower';realm=0;checkpoint=0;enterRoom(0);tune('ashmedai_hall');});return;}
 if(campaign==='rematch'){rematchMask|=1<<realm;if(rematchMask===255){save.fortress=3;saveGame();tell(['THE EIGHT SPARKS SHINE.','THE THRONE AWAITS.'],()=>{campaign='final';enterRoom(8);});}else {change('rematches');tune('ashmedai_hall');}return;}
 if(campaign==='final'){save.fortress=4;saveGame();campaign='saul';saulSongs=0;save.morning=true;tell(['THE SPARKS RISE AS ONE.','BUT A SHADOW LINGERS','IN THE PALACE OF SAUL.'],()=>enterRoom(8));return;}
 save.mask|=1<<realm;weapon=realm;saveGame();change('power');void audio.jingle('jingle_get_power');}
function portalTravel(direction:Direction){
 const portal=room.exits?.[direction];if(!portal||boss)return false;
 if(portal.forward&&room.puzzleState&&!room.puzzleState.solved){notify(room.puzzleState.hint[0]);return false;}
 const door=room.entities.find(e=>e.type==='bossgate');if(portal.forward&&door&&!door.active){notify('THE GATE IS OPENING');return false;}
 if(portal.forward&&realm===4&&roomIndex===4&&!save.morning){save.morning=true;saveGame();notify('MORNING: RIGHT UP LEFT');}
 enterRoom(portal.room,direction==='left');
 const incoming=room.exits?.[opposite[direction]];
 if(direction==='up'||direction==='down'){
  p.x=incoming?.x??33;p.y=direction==='up'?(incoming?.y??186)-2:20;p.climbing=true;p.vy=0;
  verticalTransition=true;transitionDir=direction==='up'?1:-1;
 }else{
  p.x=direction==='right'?24:224;const col=direction==='right'?1:14;let top=15;
  while(top>0&&solidTile(room.tiles[top-1]?.[col]??'.'))top--;p.y=Math.min(186,top*16-22);p.vy=0;
 }
 return true;
}
function travelHorizontal(direction:number){
 if(campaign==='realms'&&room.exits){if(!portalTravel(direction<0?'left':'right'))p.x=direction<0?0:242;return;}
 if(boss){p.x=direction<0?0:242;return;}
 if(direction<0){
  if(campaign==='realms'&&roomIndex>0){
   const n=roomIndex===7?9:roomIndex===9?-1:roomIndex-1;
   if(n>=0){enterRoom(n,true);if(n===9)p.y=room.exitY??106;}else p.x=0;
  }else if((campaign==='prologue'||campaign==='elah'||campaign==='tower')&&roomIndex>0)enterRoom(roomIndex-1,true);
  else p.x=0;
  return;
 }
 if(campaign==='tower'||campaign==='realms'&&roomIndex===6){p.x=242;notify('CLIMB UP TO THE NEXT SCREEN');return;}
 if(campaign==='realms'&&roomIndex===9){if(p.y>(room.exitY??106)+24){p.x=242;return;}const arrivalY=room.exitY??106;enterRoom(7);p.y=arrivalY;return;}
 advanceRoom();
}
function verticalTravel(){
 if(campaign==='realms'&&room.exits){
  if(boss)return false;
  const up=room.exits.up,down=room.exits.down;
  if(up&&input.is('up')&&Math.abs(p.x-up.x)<=12&&p.y<=18){if(portalTravel('up'))return true;p.y=20;p.vy=0;}
  if(down&&Math.abs(p.x-down.x)<=12&&p.y>=(down.y??198)-2&&(input.is('down')||p.y>226)){if(portalTravel('down'))return true;p.y=down.y??196;p.vy=0;}
  return false;
 }
 if(campaign==='tower'){
  if(input.is('up')&&p.x>=184&&p.x<=208&&p.y<=18){advanceRoom();if(state==='stage'){p.x=193;p.y=180;verticalTransition=true;}return true;}
  if(roomIndex>0&&input.is('down')&&p.x>=184&&p.x<=208&&p.y>=180){enterRoom(roomIndex-1);p.x=193;p.y=20;verticalTransition=true;transitionDir=-1;return true;}
  return false;
 }
 if(campaign!=='realms')return false;
 if(roomIndex===6&&input.is('up')&&Math.abs(p.x-(room.ascentX??193))<=12&&p.y<=18){
  enterRoom(9);p.x=room.descentX??34;p.y=198;p.climbing=true;p.vy=-C.climb;verticalTransition=true;transitionDir=1;return true;
 }
 if(roomIndex===9&&Math.abs(p.x-(room.descentX??33))<=12&&p.y>=198&&(input.is('down')||p.y>226)){
  enterRoom(6);p.x=room.ascentX??194;p.y=20;p.climbing=true;p.vy=C.climb;verticalTransition=true;transitionDir=-1;return true;
 }
 return false;
}
function advanceRoom(){if(campaign==='realms'&&room.forward){portalTravel(room.forward);return;}if(campaign==='prologue'){if(room.entities.some(e=>e.type==='mini'&&e.hp>0)){p.x=238;return;}if(roomIndex<2){enterRoom(roomIndex+1);return;}tell(story.anointing,()=>{tune('anointing');tell([...story.breaking,...story.charge],()=>{save.prologue=true;saveGame();change('select');tune('stage_select');});});return;}
 if(campaign==='elah'){if(roomIndex<2){enterRoom(roomIndex+1);return;}}
 if(campaign==='tower'){const e=room.entities.find(e=>e.id==='required');if(e&&!e.active){p.x=232;notify('USE '+realms[roomIndex].power);return;}if(roomIndex<7){enterRoom(roomIndex+1);return;}save.fortress=2;saveGame();rematchMask=0;change('rematches');return;}
 if(campaign==='realms'&&roomIndex<8){enterRoom(roomIndex+1);return;}p.x=238;}
function updateStage(){
 frame++;if(noticeTime>0)noticeTime--;if(lightTime>0)lightTime--;if(invul>0)invul--;if(throwing>0)throwing--;if(veil>0)veil--;if(noteTime>0)noteTime--;else notes='';
 if(input.hit('pause')){change('pause');audio.paused=true;audio.volumes();return;}
 if(transition>0){transition--;return;}
 updatePlatforms();if(dropFrames>0)dropFrames--;
 if(input.hit('prev'))cycle(-1);if(input.hit('next'))cycle(1);
 const lyre=input.is('lyre');audio.duck(lyre);
 if(lyre){for(const [key,n,f] of [['up','U',3],['left','L',1],['right','R',2],['down','D',0]] as [Key,string,number][]){if(input.hit(key)){notes+=n;noteTime=150;audio.tone(C.lyreNotes[f],.3,'triangle');if(notes.length===3){playSong(notes);notes='';}}}p.vx=0;}
 else {
  const dir=Number(input.is('right'))-Number(input.is('left'));if(dir)face=dir;
  const ladder=tile(p.x+7,p.y+12)==='H'||tile(p.x+7,p.y+22)==='H';
  if(ladder&&(input.is('up')||input.is('down'))){p.climbing=true;p.vy=(Number(input.is('down'))-Number(input.is('up')))*C.climb;p.vx=dir*C.climb;p.y+=p.vy;p.x+=p.vx;if(!dir)p.x=Math.floor((p.x+7)/16)*16+1;p.ground=false;if(input.hit('jump')){p.climbing=false;p.vy=C.jump;}}
  else {p.climbing=false;if(input.is('down')&&input.hit('jump')&&p.ground&&solids().some(o=>o.oneWay&&Math.abs(p.y+22-o.y)<1&&p.x+14>o.x&&p.x<o.x+o.w)){dropFrames=12;p.slide=0;p.ground=false;p.y+=1;p.vy=1;}if(knock>0){knock--;p.vy=Math.min(7,p.vy+C.gravity);}else{const ce=solids().some(s=>!s.oneWay&&overlap({x:p.x,y:p.y,w:14,h:10},s));motion(p,dir,input.is('jump'),input.hit('jump')&&dropFrames===0,input.is('down'),ce,submerged());if(tile(p.x+7,p.y+23)==='I'&&campaign==='realms'&&p.ground){iceVX+=(dir*C.walk-iceVX)/24;p.vx=iceVX;}else iceVX=p.vx;if(veil)p.vx=face*4;if(bubbleRide>0){bubbleRide--;p.vy=-1.4;}}
   if(input.hit('jump')){audio.sfx('jump');if(companion&&companion.kind===9&&Math.abs(p.x-companion.x)<32){p.vy=-7;companion=null;}}
   const b=solids();p.x+=p.vx;for(const s of b){if(!s.oneWay&&overlap(playerBox(),s)){const e=room.entities.find(e=>e===s);if(e&&['block','crate','lanterncart'].includes(e.type)){const next={...e,x:e.x+Math.sign(p.vx)*.5};if(next.x>0&&next.x+next.w<220&&!b.some(o=>o!==s&&overlap(next,o)))e.x=next.x;}
    const rise=p.y+22-s.y;const isStep=room.entities.some(e=>e===s&&e.type==='step');
    if(isStep&&p.ground&&rise>0&&rise<=8.1&&!b.some(o=>!o.oneWay&&o!==s&&overlap({x:p.x,y:p.y-rise,w:14,h:22},o))){p.y-=rise;p.vy=0;}else p.x=p.vx>0?s.x-14:s.x+s.w;
   }}const previousFeet=p.y+22;p.y+=p.vy;p.ground=false;for(const s of b){if((!s.oneWay||dropFrames===0&&p.vy>=0&&previousFeet<=s.y+.5)&&overlap(playerBox(),s)){if(p.vy>=0){p.y=s.y-22;p.ground=true;if(p.vy>2)audio.sfx('land');}else p.y=s.y+s.h-(p.slide?10:0);p.vy=0;}}
  }
  if(input.hit('fire')&&!(campaign==='elah'&&roomIndex>=1))fire();if(weapon===4&&input.is('fire')&&t%10===0)fire();
  if(campaign==='elah'&&roomIndex>=1){if(input.is('fire')){charge++;if(charge===40)audio.tone(880,.2);if(charge%10===0&&charge<40)audio.tone(200+charge*10,.1);}if(input.released.has('fire')){fire();charge=0;}if(p.x<60&&input.is('down')){refill++;if(refill>=30){stones=Math.min(5,stones+1);refill=0;audio.sfx('bell');}}else refill=0;}
 }
 if(verticalTravel())return;
 if(p.x>242)travelHorizontal(1);if(p.x<0)travelHorizontal(-1);
 if(p.y>240){if(save.difficulty===0){p.x=respawnX;p.y=160;p.vy=0;damage(4,128);}else die();return;}
 if(companion){companion.time--;if(companion.kind===10)companion.x+=face*.65;if(companion.time<=0)companion=null;}
 updateEntities();updateShots();updateBoss();
 if(campaign==='saul'&&p.x>110&&saulSongs<3&&t%180===0)notify('LYRE: RIGHT UP LEFT');
}
function updateEntities(){
 const pb=playerBox();
 for(const e of [...room.entities,...drops]){
 if(e.hp<=0)continue;if(e.type!=='crumbling'&&e.type!=='conductor')e.timer++;
 if(['walker','shield','mini','animal','flyer','turret'].includes(e.type)){
  if(e.type==='animal'&&e.active)continue;
  if(e.type==='flyer'){e.x=e.originX!+Math.sin(e.timer/30)*32;e.y=e.originY!+Math.sin(e.timer/20)*20;}
  if(['walker','mini','animal','shield'].includes(e.type)){const speed=e.type==='mini'?1:.5;e.x+=Math.sin(e.timer/60)>0?speed:-speed;if(e.x<64)e.x=64;if(e.x>222-e.w)e.x=222-e.w;if(e.type==='mini'&&e.timer%120===0){e.y=140;shots.push({x:e.x,y:180,vx:-2,vy:0,life:100,power:-1,damage:3,enemy:true,bounce:0});}const terrain=solids().filter(o=>!o.oneWay||o.y>=e.y+e.h-1);const contact=terrain.find(o=>overlap(e,o));if(contact){if(e.y+e.h-contact.y<=3)e.y=contact.y-e.h;else e.x=e.originX??e.x;}else{const below=terrain.filter(o=>e.x+e.w>o.x&&e.x<o.x+o.w&&o.y>=e.y+e.h).sort((a,b)=>a.y-b.y)[0];if(below)e.y=Math.min(e.y+1,below.y-e.h);}}
  if(e.type==='turret'&&e.timer%100===0){shots.push({x:e.x,y:e.y+5,vx:p.x<e.x?-2:2,vy:0,life:120,power:-1,damage:2,enemy:true,bounce:0});}
  if(overlap(pb,e)){if(veil&&!veilHits.has(e.id)){veilHits.add(e.id);hurtEnemy(e,2);}else damage(e.type==='mini'?4:2,e.x);}
 }
 if(['honey','jar','energy','life','oil','fragment','morning'].includes(e.type)&&overlap(pb,e)){
  if(e.type==='honey')hp=Math.min(28,hp+2);if(e.type==='jar')hp=28;if(e.type==='energy'){if(weapon>=0&&weapon<8)energy[weapon]=Math.min(28,energy[weapon]+10);else companionEnergy=Math.min(28,companionEnergy+10);}if(e.type==='life')lives++;if(e.type==='oil')save.oil=Math.min(4,save.oil+1);
  if(e.type==='fragment'){const barrier=room.entities.find(o=>o.id==='alcove');if(barrier&&!barrier.active)continue;save.fragments|=1<<realm;notify(psalms[realm]);saveGame();}
  if(e.type==='morning'){save.morning=true;saveGame();notify('MORNING: RIGHT UP LEFT');void audio.jingle('jingle_song_learned');}
  e.hp=0;audio.sfx('pickup');
 }
 if(e.type==='pressure')e.active=overlap({...e,y:e.y-2,h:6},pb)||room.entities.some(o=>['block','crate'].includes(o.type)&&overlap({...e,y:e.y-2,h:6},o));
 if(e.requires)e.active=(e.requires.all?.every(id=>room.entities.find(o=>o.id===id)?.active)??false)||(e.requires.any?.some(id=>room.entities.find(o=>o.id===id)?.active)??false);
 if(e.type==='bossgate'&&(room.exits?Math.hypot(p.x+7-(e.x+e.w/2),p.y+11-(e.y+e.h/2))<48:p.x>190)){doorWait++;if(doorWait===1)audio.noise(.4);if(doorWait>40)e.active=true;}
 if(e.type==='sun'&&t%360===0&&!room.entities.some(o=>o.type==='shade'&&p.x+7>=o.x&&p.x+7<o.x+o.w&&p.y>o.y))damage(2,128);
 if(e.type==='vent'&&e.timer%180>120&&overlap(pb,{...e,y:e.y-30,h:46}))damage(3,e.x);
 if(e.type==='lightning'&&e.timer%240===120&&Math.abs(p.x-e.x)<24)damage(3,e.x);
 if(e.type==='icicle'){if(e.y<0){if(e.timer>150){e.y=e.originY??32;e.timer=0;}}else if(e.active||Math.abs(p.x-e.x)<22&&e.timer>30){e.active=true;e.y+=3;if(overlap(pb,e))damage(2,e.x);if(solidTile(tile(e.x+3,e.y+e.h))||e.y>224){spark(e.x,e.y,'#bce3eb',4);e.y=-32;e.active=false;e.timer=0;}}}
 if(e.type==='gust'&&t%240<100&&!input.is('lyre')&&!p.climbing){const nx=p.x+.35;const bb={...playerBox(),x:nx};if(!solids().some(o=>!o.oneWay&&overlap(bb,o)))p.x=nx;}
 if(e.type==='current'&&submerged()&&!p.climbing){const nx=p.x+.18*Math.sin(t/160);if(!solids().some(o=>!o.oneWay&&overlap({...playerBox(),x:nx},o)))p.x=nx;}
 if(e.type==='curtain'&&!e.active&&overlap(pb,e))damage(3,e.x);
 if(e.type==='crumble'&&overlap(pb,{...e,y:e.y-22,h:22})&&e.timer%180>130)p.y+=2;
 }
updatePuzzle(room,p,t);
}
function updateShots(){
 for(const s of shots){s.life--;s.x+=s.vx;s.y+=s.vy;if(s.power===2)s.vy+=.16;
 if(s.enemy){if(overlap(playerBox(),{...s,w:6,h:6})){damage(s.damage,s.x);s.life=0;}continue;}
 const size=s.power===8?8:6,box={...s,w:size,h:size};
 for(const e of room.entities){if(e.hp<=0||!overlap(box,e))continue;
  if(e.type==='plate'&&s.bounce<3&&s.power<0){s.bounce++;if(e.type==='plate'){const vx=s.vx;s.vx=-s.vy;s.vy=-vx;}else s.vx=-s.vx;s.x+=s.vx*2;s.y+=s.vy*2;audio.sfx('bell');break;}
  const feedback=puzzleHit(room,e,t,Math.sign(s.vx)||face,s.damage);if(feedback){notify(feedback);audio.sfx(e.type==='barrel'||e.type==='cap'?'explode':'bell');spark(e.x+8,e.y+8,'#e9d294',4);s.life=0;break;}
  if(e.type==='bell'){e.active=!e.active;for(const id of e.links||[]){const o=room.entities.find(o=>o.id===id);if(o&&!o.requires)o.active=e.active;}audio.sfx('bell');s.life=0;}
  if(e.type==='reset'){enterRoom(roomIndex);notify('ROOM RESET');s.life=0;return;}
  if(['walker','mini','flyer','turret','shield'].includes(e.type)){
   if(e.type==='shield'&&s.vx<0&&p.y>e.y-10){audio.sfx('bell');}else{if(s.power===4){if(e.type!=='mini'){e.x+=Math.sign(s.vx)*12;hurtEnemy(e,1);}}else hurtEnemy(e,s.damage);if(s.power===1){e.type='block';e.active=false;e.hp=1;e.w=18;e.h=18;}if(s.power===3){const other=room.entities.find(o=>o!==e&&o.hp>0&&['walker','flyer','turret'].includes(o.type)&&Math.abs(o.x-e.x)<64);if(other)hurtEnemy(other,2);}}
   s.life=0;
  }
  powerObject(e,s.power);
 }
 if(boss&&overlap(box,{x:boss.x-16,y:boss.y-24,w:40,h:48})){hitBoss(s.power===4&&realm!==6?0:s.damage,s.power);s.life=0;}
 if(solidTile(tile(s.x,s.y))){if(s.power===0){s.y-=4;s.vy=-2;s.vx=0;}else s.life=0;}
 if(s.power===2&&s.life<=0){audio.sfx('explode');spark(s.x,s.y,realms[2].color,16);for(const e of room.entities)if(Math.hypot(e.x-s.x,e.y-s.y)<36){powerObject(e,2);if(['walker','mini','turret'].includes(e.type))hurtEnemy(e,3);}}
 }
 shots=shots.filter(s=>s.life>0&&s.x>-16&&s.x<272&&s.y>-16&&s.y<240);
}
function updateBoss(){if(!boss)return;boss.frame++;if(veil&&overlap(playerBox(),{x:boss.x-16,y:boss.y-24,w:40,h:48})&&!veilHits.has('boss')){veilHits.add('boss');hitBoss(2,6);}if(boss.frame<0){if(boss.frame%4===0)audio.tone(120+(boss.frame+100)*3,.025);return;}if(boss.hit>0)boss.hit--;if(boss.stun>0){boss.stun--;return;}
 const f=boss.frame,speed=save.difficulty===2?.75:1,period=Math.floor(90*speed);let bx=190,by=160;
 if(campaign==='elah'){bx=196;by=f%240>145?154:95;if(f%240===80)shots.push({x:210,y:194,vx:-3,vy:0,life:90,power:-1,damage:4,enemy:true,bounce:0});if(f%240===20){for(let i=0;i<3;i++)shots.push({x:40+i*60,y:32,vx:0,vy:2,life:100,power:-1,damage:3,enemy:true,bounce:0});}}
 else {
  const patterns=campaign==='final'?boss.phase+3:realm;
  switch(patterns%8){
  case 0:bx=160+Math.sin(f/45)*55;by=115+Math.sin(f/23)*30;break;
  case 1:bx=128+Math.sin(f/60)*88;by=f%180<80?70:174;break;
  case 2:bx=170+Math.sin(f/30)*45;by=180-Math.abs(Math.sin(f/45))*95;break;
  case 3:bx=Math.floor(f/120)%2?64:204;by=145;break;
  case 4:bx=128+Math.sin(f/55)*85;by=95+Math.sin(f/28)*30;break;
  case 5:bx=176+Math.sin(f/70)*50;by=135+Math.sin(f/32)*38;break;
  case 6:bx=128+Math.sin(f/32)*92;by=f%240<120?180:110;break;
  case 7:bx=128+Math.sin(f/70)*90;by=180-Math.abs(Math.sin(f/70))*55;break;
  }
  if(f%period===0){const dx=p.x-bx,dy=p.y-by,len=Math.hypot(dx,dy)||1;const n=boss.hp<10?5:3;for(let i=0;i<n;i++){const a=Math.atan2(dy,dx)+(i-(n-1)/2)*.22;shots.push({x:bx,y:by,vx:Math.cos(a)*1.6,vy:Math.sin(a)*1.6,life:160,power:-1,damage:2,enemy:true,bounce:0});}void len;}
  if(f%240===180&&realm===3){shots.push({x:p.x,y:32,vx:0,vy:3,life:100,power:-1,damage:3,enemy:true,bounce:0});}
 }
 boss.x=bx;boss.y=by;if(overlap(playerBox(),{x:bx-16,y:by-24,w:32,h:48}))damage(4,bx);
}
function activate(){audio.unlock();if(state==='title'){if(menu===0){change('slots');}if(menu===1){passwordGrid=Array(36).fill(0);passwordEdit=true;change('password');}if(menu===2){returnOptions='title';change('options');}}
 else if(state==='slots')startSlot(menu);
 else if(state==='difficulty'){save.difficulty=menu;saveGame();beginPrologue();}
 else if(state==='select'){if(select===8){if(save.mask===255)startFortress();else notify('FREE ALL EIGHT SPARKS');}else startRealm(select);}
 else if(state==='story')storyNext();
 else if(state==='intro')change('stage');
 else if(state==='power'){passwordGrid=encode(save);passwordEdit=false;change('password');}
 else if(state==='password'){if(passwordEdit){const decoded=decode(passwordGrid);if(decoded){save=decoded;saveGame();change('select');tune('stage_select');}else notify('INVALID PASSWORD');}else {change('select');tune('stage_select');}}
 else if(state==='pause')pauseAction();else if(state==='map')change('pause');
 else if(state==='options')optionAction(1);
 else if(state==='gameover'){if(menu===0){lives=save.difficulty===0?5:3;hp=28;energy.fill(28);enterRoom(checkpoint);}else if(menu===1){passwordGrid=encode(save);passwordEdit=false;change('password');}else {change('title');tune('title');}}
 else if(state==='sound'){const id=Object.keys(musicManifest)[soundCursor];tune(id);}
 else if(state==='remap'){const keys:Key[]=['left','right','up','down','jump','fire','lyre','pause','prev','next'];input.remap=keys[menu];notify('PRESS A KEY');}
 else if(state==='rematches'){if(rematchMask&(1<<select)){hp=28;energy.fill(28);notify('HEALTH AND ENERGY RESTORED');}else {realm=select;campaign='rematch';enterRoom(8);}}
}
function startFortress(){hp=28;checkpoint=0;if(save.fortress>=4){campaign='saul';saulSongs=0;enterRoom(8);}else if(save.fortress>=3){campaign='final';enterRoom(8);}else if(save.fortress>=2){change('rematches');select=0;rematchMask=0;}else if(save.fortress===1){campaign='tower';realm=0;enterRoom(0);tune('ashmedai_hall');}else{campaign='elah';realm=7;weapon=8;stones=5;enterRoom(0);tune('elah');}}
function pauseAction(){if(menu===0){change('stage');audio.paused=false;audio.volumes();}else if(menu===1)cycle(1);else if(menu===2){if(save.oil>0){save.oil--;hp=28;audio.sfx('pickup');saveGame();}}else if(menu===3){returnOptions='pause';change('options');}else if(menu===4){if(campaign==='realms')change('map');else notify('REALM MAP AVAILABLE IN REALMS');}else if(menu===5){saveGame();audio.paused=false;audio.volumes();change('select');tune('stage_select');}}
function optionAction(dir:number){switch(menu){case 0:opt.music=Math.max(0,Math.min(1,Math.round((opt.music+.1*dir)*10)/10));break;case 1:opt.sfx=Math.max(0,Math.min(1,Math.round((opt.sfx+.1*dir)*10)/10));break;case 2:opt.reduceFlash=!opt.reduceFlash;break;case 3:opt.shake=!opt.shake;break;case 4:opt.touch=(opt.touch+dir+3)%3;break;case 5:opt.haptics=!opt.haptics;break;case 6:opt.showNotes=!opt.showNotes;break;case 7:displayPanel.open();break;case 8:change('remap');break;case 9:change('sound');soundCursor=0;break;case 10:change(returnOptions);break;}applyOptions();resize();}
input.onRemap=(key,code)=>{opt.keys[key]=code;for(const [c,k] of Object.entries(input.mapping))if(k===key)delete input.mapping[c];input.mapping[code]=key;saveOptions(opt);notify('KEY SAVED');};
function update(){t++;stateTime++;input.update();if(t%30===0){const repair=document.querySelector<HTMLButtonElement>('#sound-recover')!;repair.hidden=!audio.ctx||audio.ctx.state==='running'&&(!!audio.source||audio.ended||!!audio.loading)||(options().music===0&&options().sfx===0);}if(!document.querySelector<HTMLElement>('#display-panel')!.hidden)return;if(t%60===0)resize();
 for(const q of particles){q.x+=q.vx;q.y+=q.vy;q.life--;}particles=particles.filter(q=>q.life>0);
 if(state!=='stage'&&noticeTime>0)noticeTime--;
 if(state==='stage'){updateStage();return;}
 if(state==='layout'){if(input.hit('pause')){applyOptions();change('options');}if(input.hit('prev')){opt.opacity=Math.max(.2,opt.opacity-.1);applyOptions();}if(input.hit('next')){opt.opacity=Math.min(1,opt.opacity+.1);applyOptions();}if(input.hit('up')){opt.scale=Math.min(1.5,opt.scale+.05);applyOptions();}if(input.hit('down')){opt.scale=Math.max(.75,opt.scale-.05);applyOptions();}return;}
 if(state==='ending'){if(stateTime>240||input.hit('pause')||input.hit('jump')){endingPanel++;stateTime=0;if(endingPanel===4)tune('credits');if(endingPanel>7){save.fortress=5;saveGame();change('title');tune('title');}}return;}
 if(state==='intro'&&stateTime>180){change('stage');return;}
 if(state==='password'){if(input.hit('left'))passwordCursor=(passwordCursor+35)%36;if(input.hit('right'))passwordCursor=(passwordCursor+1)%36;if(input.hit('up'))passwordCursor=(passwordCursor+30)%36;if(input.hit('down'))passwordCursor=(passwordCursor+6)%36;if(input.hit('fire')&&passwordEdit)passwordGrid[passwordCursor]=(passwordGrid[passwordCursor]+1)%6;if(input.hit('pause')||input.hit('jump'))activate();return;}
 if(state==='select'||state==='rematches'){
 const positions=[0,1,2,3,5,6,7,8,4];let grid=positions[select];if(input.hit('left'))grid=(grid+8)%9;if(input.hit('right'))grid=(grid+1)%9;if(input.hit('up'))grid=(grid+6)%9;if(input.hit('down'))grid=(grid+3)%9;select=positions.indexOf(grid);if(state==='rematches'&&select===8)select=0;
 }else if(state==='sound'){if(input.hit('up'))soundCursor=(soundCursor+Object.keys(musicManifest).length-1)%Object.keys(musicManifest).length;if(input.hit('down'))soundCursor=(soundCursor+1)%Object.keys(musicManifest).length;if(input.hit('lyre'))change('options');}
 else {const lengths:Partial<Record<State,number>>={title:3,slots:3,difficulty:3,pause:6,options:11,gameover:3,remap:10};const n=lengths[state]||1;if(input.hit('up'))menu=(menu+n-1)%n;if(input.hit('down'))menu=(menu+1)%n;if(state==='options'&&(input.hit('left')||input.hit('right')))optionAction(input.hit('left')?-1:1);}
 if(input.hit('pause')||input.hit('jump')||input.hit('fire'))activate();
}
function bg(r=realms[realm],title=false,stage=false){const i=realms.indexOf(r);ctx.drawImage(landscape(Math.max(0,i),title,campaign==='prologue',stage?room.scene:undefined),0,0);}

function panel(x:number,y:number,w:number,h:number){rect(x,y,w,h,'#0d111e');rect(x,y,w,1,'#b49b65');rect(x,y+h-1,w,1,'#b49b65');rect(x,y,1,h,'#b49b65');rect(x+w-1,y,1,h,'#b49b65');}
function label(s:string,x:number,y:number,c='#f4e3b2',scale=1,center=false){text(ctx,s,x,y,c,scale,center);}
function button(s:string,x:number,y:number,w:number,h:number,on:boolean,action:()=>void){rect(x,y,w,h,on?'#4a3f39':'#192231');if(on){rect(x,y,2,h,'#e7c573');label('>',x+5,y+Math.floor((h-7)/2),'#e7c573');}label(s,x+w/2,y+Math.floor((h-7)/2),on?'#ffe7a1':'#a7a7b1',1,true);hitAreas.push({x,y,w,h,action});}
function lines(a:string[],y:number,c='#f4e3b2',step=13){a.forEach((s,i)=>label(s,128,y+i*step,c,1,true));}
function sheep(x:number,y:number){rect(x,y,14,8,'#e9dfbd');rect(x-3,y+2,5,5,'#6d6a77');rect(x+2,y+8,2,4,'#907d77');rect(x+10,y+8,2,4,'#907d77');}
function titleScreen(){bg(realms[1],true);rect(126,14,2,12,'#f5df9a');rect(121,19,12,2,'#f5df9a');label('KAPHTZIEL PRESENTS',128,37,'#a9acb9',1,true);label('SHEPHERD',128,58,'#f0d38c',3,true);label('OF ELAH',128,85,'#f0d38c',3,true);label('A SLING. A SONG. EIGHT SPARKS.',128,118,'#b6b6c3',1,true);
 ['BEGIN / SAVE SLOTS','CONTINUE WITH PASSWORD','OPTIONS'].forEach((s,i)=>button(s,46,137+i*18,164,16,menu===i,()=>{menu=i;activate();}));david(ctx,115,211,1,'#d0aa70','#87654a',0,'idle');sheep(45,215);sheep(187,217);label('Z JUMP  X FIRE  C LYRE',128,231,'#7f8a9f',1,true);}
function stageSelect(rematches=false){bg(realms[6]);label(rematches?'HALL OF THE EIGHT':'CHOOSE YOUR PATH',128,10,'#e8ca85',1,true);const positions=[0,1,2,3,5,6,7,8];
 for(let i=0;i<8;i++){const pos=positions[i],x=40+(pos%3)*62,y=30+Math.floor(pos/3)*56,r=realms[i],done=rematches?rematchMask&(1<<i):save.mask&(1<<i);rect(x,y,52,48,i===select?'#e8c879':'#5d5c73');rect(x+2,y+2,48,44,r.sky);rect(x+1,y+1,50,2,'#f4d49a');rect(x+1,y+3,2,43,'#ae8c56');rect(x+49,y+3,2,43,'#55456b');for(const dx of [3,45])for(const dy of [3,41]){rect(x+dx,y+dy,4,4,'#2b2237');rect(x+dx+1,y+dy+1,2,2,'#efd18c');}if(done){label('+',x+26,y+12,r.light,3,true);}else drawBoss(i,x+26,y+24,.65);label(r.boss.split(' ')[0].slice(0,8),x+26,y+37,r.light,1,true);hitAreas.push({x,y,w:52,h:48,action:()=>{select=i;activate();}});}
 const x=102,y=86;rect(x,y,52,48,select===8?'#e8c879':'#5d5c73');rect(x+2,y+2,48,44,'#20273b');david(ctx,x+19,y+10,select<4?-1:1,'#d0aa70','#87654a',0,'idle');label(rematches?'REFILL':save.mask===255?'ELAH':'DAVID',128,y+37,'#e8ca85',1,true);hitAreas.push({x,y,w:52,h:48,action:()=>{if(rematches){hp=28;energy.fill(28);notify('HEALTH AND ENERGY RESTORED');}else{select=8;activate();}}});
 label(select===8?'VALLEY OF ELAH':realms[select].name,128,204,'#f4e3b2',1,true);label(`${count(rematches?rematchMask:save.mask)}/8 SPARKS FREED`,128,219,'#a9a6b4',1,true);hitAreas.push({x:0,y:225,w:256,h:15,action:()=>{returnOptions='select';change('options');}});label('START: TRAVEL     TAP HERE: OPTIONS',128,232,'#81849b',1,true);}
function drawBoss(i:number,x:number,y:number,scale=1){
 ctx.save();ctx.translate(Math.floor(x),Math.floor(y));ctx.scale(scale,scale);
 ctx.drawImage(demonSprite(i,Math.floor(t/24)%2),-32,-36);ctx.restore();
}

function renderTiles(){const r=realms[realm];room.tiles.forEach((row,y)=>[...row].forEach((v,x)=>{
 if(solidTile(v))ctx.drawImage(stoneTile(realm,!solidTile(room.tiles[y-1]?.[x]??'.'),x%3),x*16,y*16);
 if(v==='='){rect(x*16,y*16,16,5,'#252435');rect(x*16,y*16,16,1,r.light);rect(x*16+1,y*16+1,6,2,r.ground);rect(x*16+9,y*16+1,6,2,r.ground);}
 if(v==='H'){if(lockedExitLadder(x*16,y*16))return;const vine=realm===4&&campaign==='realms';rect(x*16+2,y*16,3,16,'#101420');rect(x*16+11,y*16,3,16,'#101420');rect(x*16+3,y*16,1,16,vine?'#8eaa64':r.light);rect(x*16+12,y*16,1,16,vine?'#596f47':r.light);for(let j=0;j<3;j++){rect(x*16+3,y*16+j*6,10,3,r.back);rect(x*16+3,y*16+j*6,10,1,vine?'#8eaa64':r.light);}}
 }));}
function weather(){
 const water=waterSurface();if(water<240){rect(0,water,256,240-water,'#1d657c99');for(let x=0;x<256;x+=12)rect(x,water+Math.sin((x+t)/18)*2,8,1,'#94d5ce');for(let i=0;i<12;i++){const y=water+((220-i*19-t*.25)%(240-water)+(240-water))%(240-water);rect((i*41+27)%256,y,2,2,'#71b6bd');}}
 if(campaign!=='realms')return;
 for(let i=0;i<18;i++){const x=(i*47+t*(realm===3?1.3:.2))%256,y=((i*31+t*(realm===1?.3:realm===3?2:-.25))%200+200)%200+18;
 if(realm===1)rect(x,y,1,2,'#aec8df');if(realm===3){rect(x,y,1,5,'#83a6b5');rect(x-1,y+4,1,2,'#83a6b5');}if(realm===2)rect(x,y,1,2,'#bda16e');if(realm===7&&i<8)rect(x,170+i*3,4,1,'#af7158');}
}

function renderEntity(e:Entity){if(e.hp<=0)return;if(drawPuzzleObject(ctx,e,room,t))return;const r=realms[realm],x=e.x,y=e.y;
 switch(e.type){case 'shade':rect(x,y,e.w,4,r.back);rect(x,y,e.w,1,r.light);for(let i=0;i<e.w;i+=8)rect(x+i,y+3,4,3,r.ground);break;case 'lift':case 'crumbling':if(!e.active){const shake=e.type==='crumbling'&&e.timer>15?t%2:0;rect(x+shake,y,e.w,5,r.back);rect(x+shake,y,e.w,1,r.light);for(let i=0;i<e.w;i+=8)rect(x+i+shake,y+1,6,2,r.ground);if(e.type==='crumbling'){rect(x,y-5,e.w,1,r.light);}}break;case 'step':for(let yy=0;yy<e.h;yy+=16)ctx.drawImage(stoneTile(realm,yy===0,Math.floor(e.x/16)%3),Math.floor(e.x),Math.floor(e.y+yy));break;case 'walker':case 'flyer':case 'turret':case 'shield':case 'mini':case 'animal':{if(e.type==='animal'&&e.active){sheep(x,y);break;}const image=enemySprite(e.type,realm,e.id);const w=Math.max(22,e.w),h=Math.max(24,e.h);ctx.drawImage(image,Math.floor(x+(e.w-w)/2),Math.floor(y+e.h-h),w,h);if(e.type==='shield')rect(x-2,y+4,4,14,r.light);break;}
 case 'bell':case 'reset':rect(x+5,y-6,2,22,r.ground);rect(x+1,y+4,12,8,e.active?'#ffe1a0':'#b9975c');rect(x+4,y,6,6,'#c9a365');rect(x+5,y+12,3,2,'#f8d98e');if(e.type==='reset')label('R',x+3,y-8,'#e4c284');break;
 case 'plate':rect(x,y,16,16,'#6f553e');for(let i=0;i<14;i++)rect(x+14-i,y+i,2,2,'#d1b773');break;
 case 'gate':case 'bossgate':case 'harp':if(!e.active){rect(x,y,e.w,e.h,r.back);for(let i=0;i<e.h;i+=8)rect(x,y+i,e.w,1,r.light);if(e.type==='harp')label('H',x+5,y+20,'#dfbd7b');}break;
 case 'block':case 'crate':rect(x,y,e.w,e.h,r.ground);rect(x+2,y+2,e.w-4,e.h-4,r.back);label('X',x+5,y+8,r.light);break;
 case 'pressure':rect(x,y,e.w,4,e.active?'#f5d688':r.back);break;
 case 'honey':case 'jar':rect(x+1,y,6,10,'#e1b255');rect(x+2,y+2,4,2,'#fff1af');break;
 case 'energy':rect(x+2,y,4,10,'#8bdfd4');rect(x,y+3,8,4,'#c5fff0');break;
 case 'oil':label('O',x,y,'#f1c977',2);break;case 'life':label('+',x,y,'#f1c977',2);break;
 case 'morning':label('M',x,y,'#f1e4a7',2);break;
 case 'fragment':if(!(save.fragments&(1<<realm))){rect(x,y,8,12,'#f4dfac');rect(x+2,y+2,4,1,'#8c684b');rect(x+2,y+5,4,1,'#8c684b');}break;
 case 'checkpoint':rect(x+4,y,2,32,'#ae8e61');rect(x+6,y,15,10,'#f4d990');break;
 case 'lantern':rect(x,y,10,16,'#d7ae5e');rect(x+2,y+3,6,9,'#f9dea0');break;
 case 'sun':if(t%360>300){label('SUN!',116,32,r.light);rect(0,202,256,3,'#cf804b');}break;
 case 'vent':rect(x,y,24,16,r.back);if(e.timer%180>120)for(let i=0;i<4;i++)rect(x+i*6,y-20+(t+i)%6,4,24,'#e9aa5b');break;
 case 'lightning':if(e.timer%240>60&&e.timer%240<120){label('!',x+8,y-28,'#e4db99',2);rect(x,y+e.h-3,20,2,'#c6e7e1');}break;
 case 'icicle':rect(x,y,5,12,'#bce3eb');break;
 case 'gust':case 'current':for(let i=0;i<5;i++)rect((t+i*50)%256,70+i*24,9,1,r.light);break;
 case 'rhythm':if(Math.floor(t/(3600/(musicManifest.realm_night.bpm||120)))%4<2)rect(x,y,32,5,r.color);break;
 case 'crumble':rect(x,y,32,8,r.ground);break;
 case 'light':if(lightTime>0)rect(x,y,e.w,5,'#f1dea2');break;
 default:if(!e.active){rect(x,y,e.w,e.h,e.type==='water'?'#579da9':e.type==='shadow'?'#392747':e.type==='thorn'?'#557344':e.type==='curtain'?'#b6583f':r.ground);label(['standing','windmill','basin','socket'].includes(e.type)?'+':'X',x+4,y+8,r.light);}}
}
function hud(){rect(0,0,256,17,'#0d111e');label(campaign==='prologue'?'BETHLEHEM':campaign==='elah'?'VALLEY OF ELAH':campaign==='final'?'ASHMEDAI':campaign==='saul'?'SAUL':realms[realm].name,128,5,'#dfcfab',1,true);rect(5,24,10,61,'#11121d');for(let i=0;i<28;i++)rect(7,81-i*2,6,1,hp>i?'#e7bf68':'#443a38');if(weapon>=0&&weapon<8){rect(18,24,10,61,'#11121d');for(let i=0;i<28;i++)rect(20,81-i*2,6,1,energy[weapon]>i?realms[weapon].color:'#443a38');}if(boss){rect(241,24,10,85,'#11121d');const fill=boss.frame<0?Math.floor((100+boss.frame)/100*boss.max):boss.hp;for(let i=0;i<boss.max;i++)rect(243,105-i*2,6,1,fill>i?'#d3a2b6':'#443a38');}
 label(weapon===8?'STONES '+stones:weapon===9?'AYIL':weapon===10?'DOVE':weapon<0?'SLING':realms[weapon].power,36,21,'#e0d4b6');if(campaign==='elah'&&charge>0)rect(36,32,Math.min(40,charge),3,'#fff1ba');}
function renderStage(){bg(realms[realm],false,true);weather();renderTiles();for(const e of [...room.entities,...drops])renderEntity(e);
 if(campaign==='prologue'){sheep(60,196);sheep(89,196);}
 if(campaign==='elah'&&roomIndex>=1){rect(16,206,40,5,'#62a2ba');label('BROOK',35,193,'#9cd8e0',1,true);}
 if(companion){if(companion.kind===9)sheep(companion.x,companion.y);else{rect(companion.x,companion.y,28,5,'#b69d65');rect(companion.x+8,companion.y-8,10,4,'#e8e1c2');}}
 if(campaign==='saul'){const c=['#221d38','#514354','#8d776a','#d3bb8a'][saulSongs];rect(190,140,32,66,c);rect(184,161,44,6,'#b89d5e');rect(197,132,15,20,'#d0a582');rect(198,128,14,5,'#dabc69');if(saulSongs<3){rect(190+Math.sin(t/25)*8,116,30-saulSongs*5,10,'#171524');}rect(128,206,22,2,'#ecd48e');}
 if(boss){if(campaign==='elah'){rect(boss.x-24,64,44,90,'#8c7453');rect(boss.x-22,154,16,54,'#6a5747');rect(boss.x+6,154,16,54,'#6a5747');rect(boss.x-20,boss.y-20,40,32,'#b79463');rect(boss.x-22,boss.y-27,44,12,'#8d7b56');rect(boss.x-10,boss.y-10,5,4,'#171524');rect(boss.x+7,boss.y-10,5,4,'#171524');if(boss.frame%240>145){rect(boss.x-2,boss.y-18,6,4,'#fff1ba');label('COME TO ME!',156,42,'#f2daaa');}}else if(campaign==='final'){drawBoss(3,boss.x,boss.y,boss.phase===2?2:1.3);rect(boss.x-17,boss.y-38,34,7,boss.phase===0?realms[3].color:realms[0].color);for(let i=0;i<4;i++)rect(boss.x-17+i*10,boss.y-45,5,10,'#e0bf6c');if(boss.stun)label('LIGHT!',boss.x,70,'#fff1c2',1,true);}else if(!boss.hit||t%4<2)drawBoss(realm,boss.x,boss.y);}
 for(const s of shots){const color=s.enemy?'#efb0aa':s.power<0?'#d7d8cc':s.power===8?'#fff2b5':realms[s.power].color;rect(s.x,s.y,s.power===8?8:6,s.power===8?8:6,'#11121d');rect(s.x+1,s.y+1,s.power===8?6:4,s.power===8?6:4,color);rect(s.x+1,s.y+1,2,1,'#fff5ce');}
 if(invul===0||Math.floor(t/2)%2===0)david(ctx,p.x,p.y,face,weapon>=0&&weapon<8?realms[weapon].color:'#d1b17b',weapon>=0&&weapon<8?realms[weapon].shadow:'#87654a',t,input.is('lyre')?'lyre':p.climbing?'climb':p.slide?'slide':throwing?'fire':!p.ground?(p.vy<0?'jump':'fall'):Math.abs(p.vx)>.1?'run':'idle');
 if(charge>0)for(let i=0;i<3;i++)rect(p.x+7+Math.cos(t/4+i*2)*12,p.y-5+Math.sin(t/4+i*2)*4,2,2,'#f6dda0');
 if(input.is('lyre')){panel(48,52,160,46);label('LYRE  U L R D',128,60,'#e9cd8c',1,true);label(notes,128,75,'#f3e2b1',1,true);if(opt.showNotes)label('FOLD DLR  OPEN UDU',128,87,'#9ba8b5',1,true);}
 if(campaign==='realms'&&room.exits&&!boss){
  if(room.exits.up)label('UP',room.exits.up.x+7,27,'#ffe8aa',1,true);
  if(room.exits.down)label('DOWN',room.exits.down.x+7,Math.min(203,(room.exits.down.y??198)-10),'#ffe8aa',1,true);
  if(room.exits.left)label('<',3,111,'#ffe8aa');if(room.exits.right)label('>',247,111,'#ffe8aa');
 }

 hud();if(room.puzzleState){panel(24,214,208,26);lines(room.puzzleState.solved?['PATH OPEN: '+room.forward!.toUpperCase(),'R BELL RESETS THIS ROOM']:room.puzzleState.hint,219,'#e7d2a6',11);}else if(stateTime<150&&!noticeTime)label(room.title,128,225,'#e7d2a6',1,true);
 if(transition>0){const w=transition*15;if(verticalTransition)rect(0,transitionDir===1?240-w:17,256,w,'#0d111e');else rect(transitionDir===1?256-w:0,17,w,223,'#0d111e');}
}
function render(){hitAreas.length=0;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,256,240);
 if(state==='title')titleScreen();
 if(state==='slots'){bg(realms[1]);lines(['CHOOSE A SAVE SLOT','AUTOSAVES AFTER EACH SPARK'],28);for(let i=0;i<3;i++){const s=read(i);button(`SLOT ${i+1}  ${s?count(s.mask)+'/8 SPARKS':'NEW ADVENTURE'}`,30,76+i*40,196,28,menu===i,()=>startSlot(i));}button('RESET SELECTED SLOT',40,206,176,18,false,()=>startSlot(menu,true));}
 if(state==='difficulty'){bg(realms[0]);lines(['CHOOSE YOUR WAY'],35);['SHEPHERD - GENTLE','NORMAL - THE JOURNEY','WARRIOR - CHALLENGING'].forEach((s,i)=>button(s,30,85+i*35,196,26,menu===i,()=>{menu=i;activate();}));}
 if(state==='select'||state==='rematches')stageSelect(state==='rematches');
 if(state==='stage')renderStage();
 if(state==='story'){bg(realms[campaign==='prologue'?1:realm]);rect(122,24,12,70,'#b7a986');david(ctx,122,78,1,'#d1b17b','#87654a',t,'idle');let yy=118;for(const line of storyLines){label(line,128,yy,'#f1ddb0',1,true);yy+=13;}button('CONTINUE',68,213,120,18,true,activate);}
 if(state==='intro'){bg();drawBoss(realm,128,100,1.6);label(realms[realm].boss.slice(0,Math.floor(stateTime/3)),128,162,realms[realm].light,1,true);label('FREE THE CAPTIVE SPARK',128,190,'#a8a3af',1,true);}
 if(state==='power'){bg();rect(111,18,34,126,'#b7a986');david(ctx,121,112,1,realms[realm].color,realms[realm].shadow,t,'idle');for(let i=0;i<8;i++)rect(128+Math.sin(t/20+i)*24,30+(t+i*15)%90,2,2,'#f7e3a8');lines(['DAVID FREED THE SPARK',`OF ${realms[realm].boss}.`,'YOU GOT '+realms[realm].power+'!'],154);button('RECORD PASSWORD',40,208,176,20,true,activate);}
 if(state==='password'){bg(realms[6]);label(passwordEdit?'ENTER PASSWORD':'YOUR PASSWORD',128,14,'#efd28d',1,true);const colors=['#e6cf85','#b8c1dd','#c8aa7e','#86b28c','#dd9569','#7cbecb'];const symbols=['+','H','O','Y','F','W'];for(let i=0;i<36;i++){const x=59+i%6*23,y=34+Math.floor(i/6)*23;rect(x,y,20,20,passwordEdit&&i===passwordCursor?'#8e744e':'#303247');label(symbols[passwordGrid[i]],x+7,y+6,colors[passwordGrid[i]]);hitAreas.push({x,y,w:20,h:20,action:()=>{if(passwordEdit){passwordCursor=i;passwordGrid[i]=(passwordGrid[i]+1)%6;}}});}label(passwordEdit?'TAP CELL TO CYCLE ICON':'TAKE A SCREENSHOT TO KEEP',128,181,'#a9a6b5',1,true);button(passwordEdit?'LOAD PASSWORD':'CHOOSE YOUR PATH',36,201,184,23,true,activate);}
 if(state==='pause'){renderStage();panel(28,35,200,180);label('DAVID / PAUSE',128,44,'#efd28d',1,true);label(`LIVES ${lives}   OIL ${save.oil}/4`,128,58,'#a6a4b4',1,true);['RESUME','POWER: '+(weapon===9?'AYIL':weapon===10?'DOVE':weapon<0?'SLING':weapon===8?'FIVE STONES':realms[weapon].power),'USE HORN OF OIL','OPTIONS','REALM MAP','SAVE / REALM SELECT'].forEach((s,i)=>button(s,36,72+i*16,184,15,menu===i,()=>{menu=i;pauseAction();}));label('LYRE: HOLD C + DIRECTIONS',128,175,'#a6a4b4',1,true);label('FOLD DLR / OPEN UDU',128,187,'#e0c998',1,true);if(save.morning)label('MORNING RUL',128,199,'#e0c998',1,true);}
 if(state==='map'){bg();label(realms[realm].name,128,10,'#efd28d',1,true);const nodes=routeMap(realm),minX=Math.min(...nodes.map(n=>n.x)),minY=Math.min(...nodes.map(n=>n.y)),maxX=Math.max(...nodes.map(n=>n.x)),maxY=Math.max(...nodes.map(n=>n.y));
 const size=Math.min(38,200/Math.max(1,maxX-minX),145/Math.max(1,maxY-minY)),xy=(n:typeof nodes[number])=>({x:28+(n.x-minX)*size,y:39+(n.y-minY)*size});
 for(let i=1;i<nodes.length;i++){const a=xy(nodes[i-1]),b=xy(nodes[i]);rect(Math.min(a.x,b.x)+6,Math.min(a.y,b.y)+6,Math.abs(a.x-b.x)+2,Math.abs(a.y-b.y)+2,'#7e786c');}
 for(const n of nodes){const v=xy(n);rect(v.x,v.y,15,15,n.room===roomIndex?'#e9c879':visited.has(n.room)?'#869497':'#394557');label(n.room===2?'A':n.room===5?'B':n.room===7?'G':n.room===8?'K':String(n.room),v.x+5,v.y+4,'#101827');}
 label('A/B PUZZLES  G GATE  K BOSS',128,201,'#c3baa2',1,true);button('BACK TO PAUSE',50,220,156,16,true,()=>change('pause'));}
 if(state==='options'){bg(realms[1]);label('OPTIONS',128,10,'#efd28d',1,true);const list=[`MUSIC < ${Math.round(opt.music*100)} >`,`SFX < ${Math.round(opt.sfx*100)} >`,`REDUCE FLASH ${opt.reduceFlash?'ON':'OFF'}`,`SCREEN SHAKE ${opt.shake?'ON':'OFF'}`,`TOUCH ${['AUTO','ALWAYS','OFF'][opt.touch]}`,`HAPTICS ${opt.haptics?'ON':'OFF'}`,`SHOW SONG INPUT ${opt.showNotes?'ON':'OFF'}`,'SCREEN / TOUCH OPTIONS','REMAP KEYS','SOUND TEST','BACK'];list.forEach((s,i)=>button(s,26,27+i*18,204,16,menu===i,()=>{menu=i;optionAction(1);}));}
 if(state==='sound'){bg(realms[5]);label('SOUND TEST',128,12,'#efd28d',1,true);const ids=Object.keys(musicManifest);const first=Math.max(0,Math.min(ids.length-10,soundCursor-4));ids.slice(first,first+10).forEach((id,j)=>{const i=first+j;const missing=audio.missing.has(id);button(id.toUpperCase().slice(0,24)+(missing?' !':''),8,33+j*17,240,15,soundCursor===i,()=>{soundCursor=i;activate();});});label('! = NOT FOUND',128,209,'#9a9dac',1,true);button('BACK',90,222,76,16,false,()=>change('options'));}
 if(state==='remap'){bg(realms[1]);label(input.remap?'PRESS A KEY':'REMAP KEYBOARD',128,12,'#efd28d',1,true);const keys:Key[]=['left','right','up','down','jump','fire','lyre','pause','prev','next'];keys.forEach((k,i)=>button(k.toUpperCase()+': '+(opt.keys[k]||Object.keys(input.mapping).find(c=>input.mapping[c]===k)),20,32+i*17,216,15,menu===i,()=>{menu=i;activate();}));button('BACK',80,214,96,18,false,()=>change('options'));}
 if(state==='layout'){bg(realms[1]);lines(['DRAG THE TOUCH CONTROLS','POWER: OPACITY - / +','UP / DOWN: RESIZE','START TO SAVE'],70);label(`SIZE ${Math.round(opt.scale*100)} OPACITY ${Math.round(opt.opacity*100)}`,128,134,'#dfc78c',1,true);button('RESET LAYOUT',70,160,116,20,false,()=>{opt.layout={};opt.scale=1;opt.opacity=.55;document.querySelectorAll<HTMLElement>('#controller>*').forEach(el=>{el.style.left='';el.style.top='';el.style.right='';el.style.bottom='';});applyOptions();});button('SAVE / BACK',70,190,116,20,false,()=>{applyOptions();change('options');});document.body.classList.add('touch');}
 if(state==='gameover'){bg(realms[6]);label('THE FLOCK STILL',128,55,'#efd28d',2,true);label('NEEDS YOU.',128,78,'#efd28d',2,true);['CONTINUE','PASSWORD','TITLE'].forEach((s,i)=>button(s,64,130+i*26,128,22,menu===i,()=>{menu=i;activate();}));}
 if(state==='ending'){bg(realms[endingPanel<4?0:1],true);const panelIndex=endingPanel;if(panelIndex<4){if(panelIndex===0){david(ctx,124,164,1,'#d1b17b','#87654a',t,'idle');sheep(45,180);sheep(200,180);}if(panelIndex===1){for(let y=120;y<204;y+=6)rect(100-(y-120)/4,y,56+(y-120)/2,6,'#caa36c');david(ctx,123,125,1,'#d1b17b','#87654a',t,'run');}if(panelIndex===2||panelIndex===3){rect(110,140,38,60,'#916247');rect(105,160,48,5,'#d1ac64');david(ctx,122,165,1,'#a06896','#5e4169',t,'lyre');rect(123,137,13,5,'#edce79');for(let i=0;i<3;i++)rect(123+i*5,133,3,5,'#edce79');}lines(panelIndex===3?story.ending.slice(3):[story.ending[panelIndex]],52,'#eed7a1');}else if(panelIndex===4){lines(['SHEPHERD OF ELAH','AN ORIGINAL ADVENTURE','KAPHTZIEL STUDIOS','','CODE, PIXELS AND SYNTHESIS','CREATED FOR THE WEB','','MUSIC: AUTHOR SUPPLIED'],40);for(let i=0;i<8;i++)drawBoss(i,20+i*30,185,.35);}else if(panelIndex===5&&save.fragments===255){david(ctx,120,165,1,'#a06896','#5e4169',t,'lyre');lines(['THE EIGHT FRAGMENTS BECOME','A SONG OF THANKSGIVING.'],60);}else{label('THE END',128,85,'#efd28d',3,true);label('AND DAVID REIGNED',128,130,'#cfc4b0',1,true);label('OVER ALL ISRAEL.',128,145,'#cfc4b0',1,true);}label('START TO CONTINUE',128,226,'#868da0',1,true);}
 for(const q of particles)rect(q.x,q.y,2,2,q.color);
 if(noticeTime>0){panel(4,221,248,18);label(notice.slice(0,40),128,227,'#f0d89e',1,true);}
}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();audio.unlock();const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*256/r.width,y=(e.clientY-r.top)*240/r.height;const a=[...hitAreas].reverse().find(a=>x>=a.x&&x<a.x+a.w&&y>=a.y&&y<a.y+a.h);a?.action();canvas.focus({preventScroll:true});});
// In the layout editor pointer motion repositions the DOM controls themselves.
for(const el of document.querySelectorAll<HTMLElement>('#controller>*')){let drag:number|null=null,dx=0,dy=0;el.addEventListener('pointerdown',e=>{if(state!=='layout')return;drag=e.pointerId;const r=el.getBoundingClientRect();dx=e.clientX-r.left;dy=e.clientY-r.top;},true);el.addEventListener('pointermove',e=>{if(state!=='layout'||drag!==e.pointerId)return;const id=el.id||el.dataset.key||'';opt.layout[id]={x:Math.max(0,Math.min(innerWidth-el.offsetWidth,e.clientX-dx)),y:Math.max(0,Math.min(innerHeight-el.offsetHeight,e.clientY-dy))};applyOptions();});el.addEventListener('pointerup',()=>drag=null);}
guardGameGestures(document.querySelector<HTMLElement>('#game')!);
let screenReturn:State|null=null,screenWasPaused=false;
const displayPanel=installDisplayPanel({get:()=>opt.screenScale,set:value=>{opt.screenScale=Math.max(.6,Math.min(1,value));saveOptions(opt);resize();},
 open:()=>{input.clear();screenReturn=state;screenWasPaused=audio.paused;if(state==='stage')change('pause');audio.paused=true;audio.volumes();},
 close:()=>{input.clear();if(screenReturn)change(screenReturn);audio.paused=screenWasPaused;audio.volumes();screenReturn=null;},
 resetControls:()=>{opt.layout={};opt.scale=1;opt.opacity=.55;document.querySelectorAll<HTMLElement>('#controller>*').forEach(el=>{el.style.left='';el.style.top='';el.style.right='';el.style.bottom='';});applyOptions();},
 arrange:()=>{change('layout');notify('DRAG CONTROLS. START TO SAVE.');}});
document.querySelector('#sound-recover')!.addEventListener('click',()=>audio.retry());
let last=0,acc=0;function loop(now:number){if(!last)last=now;acc+=Math.min(100,now-last);last=now;while(acc>=1000/60){update();acc-=1000/60;}render();requestAnimationFrame(loop);}tune('title');requestAnimationFrame(loop);
// Explicit opt-in test harness; absent from normal sessions.
if(new URLSearchParams(location.search).has('test'))Object.assign(window,{elah:{get:()=>({state,p:{...p},hp,lives,realm,roomIndex,campaign,clock:t,room:{tiles:room.tiles,scene:room.scene,exits:room.exits,forward:room.forward,puzzle:room.puzzleState,ascentX:room.ascentX,descentX:room.descentX,waterLine:room.waterLine,exitY:room.exitY},submerged:submerged(),shots:shots.map(s=>({...s})),save:{...save},boss:boss&&{...boss},notes,notice,entities:room.entities.map(e=>({...e}))}),startRealm:(n:number)=>{save.prologue=true;startRealm(n);},setSave:(s:Partial<Save>)=>{Object.assign(save,s);},startFortress,enterRoom,damage,playSong,fire,advanceRoom,hitBoss,setPlayer:(a:Partial<Body>)=>Object.assign(p,a),setWeapon:(n:number)=>weapon=n,setState:(s:State)=>change(s),setBoss:(b:object)=>Object.assign(boss!,b),setCampaign:(c:typeof campaign)=>campaign=c,setHP:(n:number)=>hp=n,setInvincible:(n:number)=>invul=n,audioService:audio,setEntity:(id:string,a:Partial<Entity>)=>{const e=room.entities.find(e=>e.id===id);if(e)Object.assign(e,a);},activate,portalTravel,travelHorizontal,verticalTravel,audio:()=>({state:audio.ctx?.state,current:audio.current,file:audio.sourceFile,loading:!!audio.loading,ended:audio.ended,loaded:!!audio.source,loop:audio.source?.loop,music:audio.musicBus?.gain.value,missing:[...audio.missing]}),step:(keys:Key[],n=1)=>{input.keyboard=new Set(keys);for(let i=0;i<n;i++)update();input.keyboard.clear();}}});
