import type {Room,Entity} from './levels';
export type Direction='left'|'right'|'up'|'down';
export type Portal={room:number,x:number,y?:number,forward:boolean};
export type Puzzle={kind:string,hint:string[],progress:number,order?:string[],solved:boolean,baseWater?:number};
export const opposite:Record<Direction,Direction>={left:'right',right:'left',up:'down',down:'up'};
export const realmRoutes:{rooms:number[],directions:Direction[]}[]=[
 {rooms:[0,1,2,3,4,5,6,9,7,8],directions:['right','right','down','left','down','right','right','up','right']},
 {rooms:[0,2,1,6,4,3,5,9,7,8],directions:['right','up','left','up','right','up','right','down','right']},
 {rooms:[0,1,3,2,4,6,5,9,7,8],directions:['right','down','right','right','up','right','down','down','left']},
 {rooms:[0,6,1,2,4,9,3,5,7,8],directions:['up','right','up','left','up','right','right','down','right']},
 {rooms:[0,1,4,2,6,5,3,9,7,8],directions:['right','up','right','down','right','up','up','left','up']},
 {rooms:[0,1,2,4,3,5,9,6,7,8],directions:['right','down','down','left','down','right','right','up','right']},
 {rooms:[0,4,1,2,9,3,5,6,7,8],directions:['right','up','right','up','left','up','right','right','down']},
 {rooms:[0,1,6,2,4,9,5,3,7,8],directions:['right','up','left','up','right','right','up','left','up']}
];
export function routeMap(realm:number){const route=realmRoutes[realm];let x=0,y=0;return route.rooms.map((room,i)=>{if(i){const d=route.directions[i-1];x+=d==='right'?1:d==='left'?-1:0;y+=d==='down'?1:d==='up'?-1:0;}return {room,x,y};});}
const newEntity=(type:string,id:string,x:number,y:number,w=16,h=16,hp=1):Entity=>({type,id,x,y,w,h,hp,active:false,timer:0,originX:x,originY:y});

export function applyRealmDesign(realm:number,index:number,room:Room):Room{
 const route=realmRoutes[realm],position=route.rooms.indexOf(index);if(position<0)return room;
 if(index===2||index===5)buildPuzzle(realm,index,room);
 const grid=room.tiles.map(row=>[...row]);room.exits={};room.ascentX=undefined;room.descentX=undefined;
 // Remove the previous universal climb/return shaft. Every connection now comes from the realm map.
 if(index===6||index===9){for(let y=0;y<15;y++)for(let x=0;x<16;x++)if(grid[y][x]==='H')grid[y][x]=y>=(room.floorHeights?.[x]??13)?(realm===1&&y===(room.floorHeights?.[x]??13)?'I':'#'):'.';}
 for(const edge of [position-1,position]){
  if(edge<0||edge>=route.directions.length)continue;
  const outgoing=edge===position,direction=outgoing?route.directions[edge]:opposite[route.directions[edge]];
  const target=outgoing?route.rooms[edge+1]:route.rooms[edge];
  // Shared columns line ladders up between the two connected screens.
  const col=2+(realm*3+edge*5)%12;
  room.exits[direction]={room:target,x:col*16+1,forward:outgoing};
  if(direction==='up'||direction==='down'){
   if(direction==='up'){for(let y=0;y<13;y++)grid[y][col]='H';room.ascentX=col*16+1;}
   else {
    // A covered floor hatch is safe to stand on; DOWN deliberately crosses it.
    let row=15;while(row>2&&['#','I'].includes(grid[row-1][col]))row--;
    row=Math.min(14,row);for(let y=row;y<14;y++)grid[y][col]='H';grid[row][col]='=';
    room.exits[direction]!.y=row*16-22;room.descentX=col*16+1;
   }
   room.entities=room.entities.filter(e=>e.type!=='step'||e.x+e.w<=col*16||e.x>=(col+1)*16);
  }
 }
 room.forward=route.directions[position];
 const gate=room.entities.find(e=>e.id==='gate'||e.type==='bossgate');
 if(gate&&room.forward){
  if(room.forward==='right'){gate.x=240;gate.y=112;gate.w=16;gate.h=96;}
  if(room.forward==='left'){gate.x=0;gate.y=112;gate.w=16;gate.h=96;}
  if(room.forward==='up'){gate.x=room.exits.up!.x-1;gate.y=0;gate.w=16;gate.h=16;}
  if(room.forward==='down'){gate.x=room.exits.down!.x-1;gate.y=224;gate.w=16;gate.h=16;}
 }
 room.tiles=grid.map(row=>row.join(''));return room;
}

function buildPuzzle(realm:number,index:number,room:Room){
 const optional=room.entities.filter(e=>e.id==='alcove'||e.id==='fragment');room.entities=[];
 const g=Array.from({length:15},(_,y)=>Array(16).fill(y>=13?'#':'.'));
 const shelf=(x:number,y:number,n:number)=>{for(let i=x;i<x+n;i++)g[y][i]='=';};
 const ladder=(x:number,from:number)=>{for(let y=from;y<13;y++)g[y][x]='H';};
 const add=(type:string,id:string,x:number,y:number,w=16,h=16,hp=1)=>{const e=newEntity(type,id,x,y,w,h,hp);room.entities.push(e);return e;};
 const require=(ids:string[])=>{add('gate','gate',240,112,16,96).requires={all:ids};};
 const puzzle=(kind:string,hint:string[],order?:string[])=>{room.puzzleState={kind,hint,order,progress:0,solved:false};};
 add('reset','reset',8,176,12,16);
 if(realm===0&&index===2){
  puzzle('shade-link',['RING BOTH SHADE BELLS','THE HIGH BELL NEEDS A BOUNCE']);
  add('latchBell','shade-west',80,176,12,16);add('latchBell','shade-east',160,104,12,16);
  add('plate','mirror',160,184,16,16);add('shade','west-awning',64,96,48,6);add('shade','east-awning',160,80,48,6);
  shelf(4,9,3);require(['shade-west','shade-east']);
 }
 if(realm===0&&index===5){
  puzzle('shadow-weights',['PUSH A BLOCK ON EACH MARK','MOVE THE FAR BLOCK FIRST']);
  add('block','block-west',64,184,24,24);add('block','block-east',128,184,24,24);
  add('pressure','mark-west',104,204,24,4);add('pressure','mark-east',184,204,24,4);
  shelf(4,7,3);shelf(10,6,3);require(['mark-west','mark-east']);
 }
 if(realm===1&&index===2){
  puzzle('ibex-step',['CALM THE IBEX WITH THE LYRE','FOLD: DOWN LEFT RIGHT']);
  add('animal','ibex',112,184,32,24,6);shelf(8,9,4);shelf(3,11,3);require(['ibex']);
 }
 if(realm===1&&index===5){
  puzzle('crystal-order',['CRYSTAL ORDER: 2 1 3','WRONG NOTE RESETS THE SEAL'],['crystal-2','crystal-1','crystal-3']);
  for(const [i,x,y] of [[1,72,176],[2,136,144],[3,200,112]])add('crystal','crystal-'+i,x,y,12,24).value=i;
  shelf(5,11,3);shelf(10,9,3);ladder(6,11);require(['crystal-1','crystal-2','crystal-3']);
 }
 if(realm===2&&index===2){
  puzzle('vent-blast',['SHOOT THE VENT CAP','THE BARREL BREAKS THE WALL']);
  add('cap','vent-cap',96,176,16,20).links=['blast-barrel'];
  add('barrel','blast-barrel',144,184,20,24).links=['blast-wall'];add('cracked','blast-wall',168,128,16,80);
  shelf(4,9,3);require(['blast-wall']);
 }
 if(realm===2&&index===5){
  puzzle('counterweight',['WEIGH THE PLATE TO RAISE LIFT','RING THE HIGH RELEASE BELL']);
  add('block','counterweight',64,184,24,24);add('pressure','weight',112,204,24,4);
  add('counterlift','weight-lift',152,192,32,6).links=['weight'];add('latchBell','release',208,104,12,16);
  shelf(12,8,3);require(['weight','release']);
 }
 if(realm===3&&index===2){
  puzzle('conductors',['CHARGE BOTH STONES','CROSS BEFORE THE CHARGE FADES']);
  add('conductor','stone-a',80,174,16,24);add('conductor','stone-b',184,142,16,24);
  shelf(8,11,3);shelf(3,8,3);require(['stone-a','stone-b']);
 }
 if(realm===3&&index===5){
  puzzle('storm-bridge',['CHARGE THE BRIDGE SWITCH','CROSS AND RING THE HIGH BELL']);
  add('conductor','bridge-charge',64,180,16,24);add('timedbridge','storm-span',104,160,72,6).links=['bridge-charge'];
  shelf(4,11,2);add('latchBell','bridge-bell',208,112,12,16);require(['bridge-charge','bridge-bell']);
 }
 if(realm===4&&index===2){
  puzzle('two-songs',['MORNING REVEALS THE LIGHT','OPENING UNSEALS THE GATE']);
  add('songstone','dawn',80,172,16,32).song='RUL';add('harp','harp-seal',184,152,16,56);
  add('light','morning-step',112,168,32,6);add('light','morning-step-2',160,136,32,6);require(['dawn','harp-seal']);
 }
 if(realm===4&&index===5){
  puzzle('wind-vanes',['ALIGN THE WIND VANES','WEST: L   EAST: R']);
  const west=add('vane','west-vane',80,160,16,24);west.value=0;west.target=3;
  const east=add('vane','east-vane',184,128,16,24);east.value=0;east.target=1;
  shelf(7,11,3);shelf(11,9,3);require(['west-vane','east-vane']);
 }
 if(realm===5&&index===2){
  puzzle('sluice-order',['DRAIN THE SLUICES: 1 3 2','WRONG VALVE FLOODS THE ROOM'],['valve-1','valve-3','valve-2']);room.waterLine=80;room.puzzleState!.baseWater=80;
  for(const [i,x,y] of [[1,72,160],[2,128,184],[3,192,120]])add('valve','valve-'+i,x,y,16,24).value=i;
  shelf(4,10,3);shelf(10,8,3);require(['valve-1','valve-2','valve-3']);
 }
 if(realm===5&&index===5){
  puzzle('current-barrel',['SHOOT THE BARREL INTO ITS DOCK','SHORT SHOTS STEER THE CURRENT']);room.waterLine=80;
  add('floatbarrel','current-barrel',64,128,20,20);add('dock','barrel-dock',184,128,24,24);
  shelf(3,11,3);ladder(4,11);shelf(9,9,3);require(['barrel-dock']);
 }
 if(realm===6&&index===2){
  puzzle('drum-beat',['DRUM ORDER: 1 3 2','HIT WHILE THE BEAT IS LIT'],['drum-1','drum-3','drum-2']);
  for(const [i,x] of [[1,72],[2,136],[3,200]])add('drum','drum-'+i,x,176,16,24).value=i;
  shelf(5,8,5);require(['drum-1','drum-2','drum-3']);
 }
 if(realm===6&&index===5){
  puzzle('lantern-escort',['PUSH THE LANTERN CART','HIT MASKS ONLY IN ITS LIGHT']);
  add('lanterncart','escort-lantern',56,184,24,24);
  for(const [i,x] of [[1,112],[2,160],[3,208]])add('ward','mask-'+i,x,160,16,20,2);
  shelf(3,9,3);require(['mask-1','mask-2','mask-3']);
 }
 if(realm===7&&index===2){
  puzzle('rope-order',['ROPE SUPPORTS: 3 1 2','A WRONG POST DROPS THE BRIDGE'],['post-3','post-1','post-2']);
  for(const [i,x,y] of [[1,72,152],[2,128,176],[3,192,136]])add('support','post-'+i,x,y,12,24).value=i;
  add('timedbridge','rope-span',88,128,112,6).links=['post-1','post-2','post-3'];shelf(5,11,3);require(['post-1','post-2','post-3']);
 }
 if(realm===7&&index===5){
  puzzle('falling-step',['SHOOT THE HANGING STONE CLASP','USE THE STONE TO REACH BELL']);
  add('anchor','stone-clasp',120,144,16,16);add('fallingStone','hanging-stone',144,64,24,48).links=['stone-clasp'];
  for(let i=0;i<3;i++)add('step','foothold-'+i,96+i*16,200-i*8,16,40+i*8);
  add('latchBell','cliff-bell',208,112,12,12);require(['stone-clasp','hanging-stone','cliff-bell']);
 }
 if(index===5)for(const e of optional){e.x=e.id==='alcove'?16:40;e.y=e.id==='alcove'?64:80;room.entities.push(e);}
 room.floorHeights=Array(16).fill(13);room.tiles=g.map(row=>row.join(''));
}

export function puzzleHit(room:Room,e:Entity,clock:number,direction:number,damage=1):string|null{
 const p=room.puzzleState;if(!p)return null;
 if(e.type==='latchBell'){e.active=true;return 'THE BELL RINGS';}
 if(['crystal','valve','drum','support'].includes(e.type)){
  if(p.solved)return 'THE SEAL IS OPEN';
  if(e.type==='drum'&&clock%30>10&&clock%30<26)return 'WAIT FOR THE LIT BEAT';
  if(p.order?.[p.progress]===e.id){e.active=true;p.progress++;if(p.progress===p.order.length)p.solved=true;return p.progress===p.order.length?'THE SEAL IS OPEN':'CORRECT '+p.progress;}
  p.progress=0;for(const item of room.entities)if(p.order?.includes(item.id))item.active=false;return 'WRONG ORDER - TRY AGAIN';
 }
 if(e.type==='cap'){e.active=true;for(const id of e.links??[]){const barrel=room.entities.find(x=>x.id===id);if(barrel)barrel.active=true;}return 'THE VENT IGNITES';}
 if(e.type==='conductor'){e.active=true;e.timer=600;return 'CHARGE: TEN SECONDS';}
 if(e.type==='vane'){e.value=((e.value??0)+1)%4;e.active=e.value===e.target;return e.active?'WIND ALIGNED':'WIND TURNS';}
 if(e.type==='floatbarrel'&&!e.active){e.vx=Math.max(-1.8,Math.min(1.8,(e.vx??0)+direction*1.2));return 'THE CURRENT SHIFTS';}
 if(e.type==='lanterncart'){e.x=Math.max(40,Math.min(208,e.x+direction*6));return 'THE LANTERN MOVES';}
 if(e.type==='ward'){
  const cart=room.entities.find(x=>x.type==='lanterncart');if(!cart||Math.abs(cart.x+12-(e.x+8))>60)return 'BRING THE LANTERN CLOSER';
  e.hp-=damage;if(e.hp<=0)e.active=true;return e.active?'A SHADOW IS FREED':'THE LIT MASK CRACKS';
 }
 if(e.type==='anchor'){e.active=true;return 'THE STONE FALLS';}
 return null;
}
export function puzzleSong(room:Room,song:string){for(const e of room.entities)if(e.type==='songstone'&&e.song===song)e.active=true;}
export function updatePuzzle(room:Room,player:{x:number,y:number,ground:boolean},clock:number){
 const p=room.puzzleState;if(!p)return;
 const find=(id:string)=>room.entities.find(e=>e.id===id);
 for(const e of room.entities){
  if(e.type==='conductor'&&e.active){e.timer=Math.max(0,e.timer-1);if(e.timer===0)e.active=false;}
  if(e.type==='barrel'&&e.active)for(const id of e.links??[]){const wall=find(id);if(wall)wall.active=true;}
  if(e.type==='timedbridge')e.active=(e.links??[]).every(id=>find(id)?.active);
  if(e.type==='counterlift'){
   const old=e.y,target=(e.links??[]).every(id=>find(id)?.active)?128:192;e.y+=Math.sign(target-e.y)*Math.min(1,Math.abs(target-e.y));
   if(player.ground&&Math.abs(player.y+22-old)<2&&player.x+14>e.x&&player.x<e.x+e.w)player.y+=e.y-old;
  }
  if(e.type==='floatbarrel'&&!e.active){const old=e.x;e.x=Math.max(40,Math.min(216,e.x+(e.vx??0)));e.vx=(e.vx??0)*.97;
   if(player.ground&&Math.abs(player.y+22-e.y)<2&&player.x+14>old&&player.x<old+e.w)player.x+=e.x-old;
   const dock=find('barrel-dock');if(dock&&Math.abs(e.x-dock.x)<10){e.x=dock.x;e.active=true;e.vx=0;dock.active=true;}
  }
  if(e.type==='fallingStone'&&!e.active&&(e.links??[]).every(id=>find(id)?.active)){
   e.vy=Math.min(5,(e.vy??0)+.25);e.y=Math.min(208-e.h,e.y+e.vy);if(e.y+e.h>=208){e.active=true;e.vy=0;}
  }
 }
 if(p.kind==='sluice-order')room.waterLine=(p.baseWater??80)+p.progress*36;
 const gate=find('gate');if(gate?.requires){gate.active=(gate.requires.all??[]).every(id=>find(id)?.active);p.solved=gate.active;}
 void clock;
}
