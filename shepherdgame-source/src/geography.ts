import type {Room,Entity} from './levels';

type Profile={scenes:string[],titles:string[],floors:number[][],climb:number,descent:number};
export const geography:Profile[]=[
 {scenes:['dunes','sandstone-cave','oasis','sun-canyon','oasis','sandstone-cave','mesa','mesa','sun-temple','mesa'],titles:['THE SUNBAKED DUNES','THE SHADED PASSAGE','THE AWNING BELL','THE EXPOSED CANYON','THE HIDDEN OASIS','SHADOWS IN THE STONE','THE SANDSTONE ASCENT','THE NOONDAY TEMPLE','THE CAPTIVE SUN','THE HIGH MESA'],floors:[[13,13,13,13,12,12,13,13,11,11,11,13,13,13,13,13],[13,13,13,12,12,13,13,13,13,12,12,13,13,13,13,13],[13,13,13,12,12,12,13,13,11,11,12,13,13,13,13,13]],climb:12,descent:2},
 {scenes:['snowfield','ice-cave','frozen-falls','ice-cave','snowfield','frozen-falls','frozen-falls','snowfield','ice-cave','snowfield'],titles:['THE FROZEN FOOTHILLS','THE BLUE ICE CAVERN','THE SLEEPING IBEX','THE ICICLE GROTTO','THE WATCHER SHELTER','THE FROZEN WATERFALL','THE WATCHER SPINE','THE SUMMIT GATE','THE WATCHER THRONE','THE HIGH SNOW SHELVES'],floors:[[13,13,13,12,11,11,12,13,13,12,10,10,12,13,13,13],[13,13,13,13,11,11,13,13,12,12,10,10,12,13,13,13],[13,13,13,12,12,13,11,11,11,12,13,12,12,13,13,13]],climb:4,descent:11},
 {scenes:['salt-flats','sulfur-cave','salt-ruins','sulfur-cave','salt-ruins','sulfur-cave','sulfur-chimney','salt-ruins','sulfur-cave','sulfur-chimney'],titles:['THE BROKEN SALT ROAD','THE SULFUR VENTS','THE BARREL COURTYARD','THE SMOLDERING FOUNDRY','THE SALT SANCTUARY','THE CRACKED RESERVOIR','THE BASALT CHIMNEY','THE BRIMSTONE GATE','THE SMOKING THRONE','THE SALT PILLAR WALK'],floors:[[13,13,13,13,11,11,13,13,12,12,13,13,11,12,13,13],[13,13,13,14,14,12,12,13,13,14,12,12,13,13,13,13],[13,13,13,12,12,13,13,13,12,12,13,13,13,13,13,13]],climb:10,descent:3},
 {scenes:['storm-shrine','storm-tower','storm-shrine','storm-tower','storm-shrine','storm-tower','storm-tower','storm-shrine','storm-shrine','sky-bridges'],titles:['THE SHATTERED CAUSEWAY','THE STORM CONDUCTORS','THE LIGHTNING BELLS','THE THUNDER GALLERY','THE INSULATED REFUGE','THE STANDING STONE SEAL','THE SHRINE SPIRE','THE STORM CROWN GATE','THE LIGHTNING ALTAR','THE HIGH SKY BRIDGES'],floors:[[13,13,13,14,12,12,14,14,12,12,13,11,12,13,13,13],[13,13,13,12,12,14,14,12,12,14,14,12,12,13,13,13],[13,13,13,14,12,12,13,13,13,12,12,13,13,13,13,13]],climb:7,descent:12},
 {scenes:['thorn-garden','ruined-arches','thorn-garden','ruined-arches','moon-shrine','ruined-arches','vine-tower','moon-shrine','moon-shrine','ruined-roofs'],titles:['THE THORN GARDENS','THE FALLEN ARCADES','THE WIND CARVED BELLS','THE OWL COURTYARD','THE SHRINE OF MORNING','THE ROOTBOUND CHAMBER','THE VINE CLIMB','THE OWL MASK GATE','THE SCREECHER ROOST','THE BROKEN ROOFTOPS'],floors:[[13,13,13,13,12,12,12,13,13,12,12,13,13,13,13,13],[13,13,13,12,12,13,13,11,11,12,13,13,12,12,13,13],[13,13,13,12,12,13,13,13,12,12,13,12,12,13,13,13]],climb:13,descent:4},
 {scenes:['tidal-shore','sunken-ship','sluice','sunken-ship','tidal-shore','coral-cave','tidal-well','tidal-shore','deep-temple','aqueduct'],titles:['THE TIDAL SHORE','THE SUNKEN HULL','THE SLUICE BELLS','THE DROWNED CARGO HOLD','THE BREATHING COVE','THE CORAL LABYRINTH','THE FLOODED WELL','THE SEA SERPENT GATE','THE DEEP COIL','THE ANCIENT AQUEDUCT'],floors:[[13,13,13,13,14,14,14,14,14,13,12,12,13,13,13,13],[13,13,13,14,14,14,12,12,14,14,14,12,12,13,13,13],[13,13,13,14,14,13,13,14,14,13,13,14,14,13,13,13]],climb:6,descent:10},
 {scenes:['lantern-market','night-roofs','lantern-market','night-roofs','lantern-plaza','night-roofs','lantern-tower','lantern-plaza','lantern-plaza','night-roofs'],titles:['THE EMPTY LANTERN MARKET','THE MIDNIGHT ROOFS','THE LANTERN CART SEAL','THE SHADOW ARCADES','THE GOLDEN LANTERN PLAZA','THE DRUM COURTYARD','THE BELL TOWER','THE CHARIOT GATE','THE DARK CHARIOT','THE SHADOW SKYLINE'],floors:[[13,13,13,13,12,12,13,14,14,12,12,13,12,12,13,13],[13,13,13,12,12,14,14,12,12,14,14,12,12,13,13,13],[13,13,13,13,12,12,13,13,13,12,12,13,13,13,13,13]],climb:2,descent:2},
 {scenes:['red-gorge','rope-bridge','red-gorge','rock-cave','rock-cave','red-gorge','red-gorge','red-gorge','rock-cave','rope-bridge'],titles:['THE RED ROCK GORGE','THE SCAPEGOAT BRIDGES','THE CALMING CROSSING','THE BOULDER CAVERN','THE CANYON SHELTER','THE ECHOING RAVINE','THE CLIFF SWITCHBACKS','THE RED CORD GATE','THE STONE HUSK','THE HIGH ROPE BRIDGES'],floors:[[13,13,13,12,12,14,14,12,12,13,11,11,12,13,13,13],[13,13,13,14,14,12,12,14,14,12,12,13,13,13,13,13],[13,13,13,12,12,13,13,13,12,12,13,13,13,13,13,13]],climb:11,descent:5}
];

export function applyGeography(realm:number,index:number,room:Room):Room{
 const profile=geography[realm];room.title=profile.titles[index];room.scene=profile.scenes[index];room.ascentX=profile.climb*16+1;room.descentX=profile.descent*16+1;room.exitY=106;
 if(realm===5)room.waterLine=[206,96,144,48,176,80,144,176,48,120][index];
 const grid=room.tiles.map(r=>[...r]);let baseHeights=Array(16).fill(13);
 const stamp=(x:number,y:number,w:number,h=1,tile='#')=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(yy>=0&&yy<15&&xx>=0&&xx<16)grid[yy][xx]=tile;};
 const add=(type:string,id:string,x:number,y:number,w=16,h=16,hp=1)=>{const e:Entity={type,id,x,y,w,h,hp,active:false,timer:0,originX:x,originY:y};room.entities.push(e);return e;};
 const ground=(heights:number[],ice=false)=>{baseHeights=[...heights];for(let y=0;y<15;y++)for(let x=0;x<16;x++)grid[y][x]=y>=heights[x]?(ice&&y===heights[x]?'I':'#'):'.';};
 const ladder=(col:number,from=0,to=13,carve=false)=>{const end=carve?to:Math.min(to,baseHeights[col]);if(end>from)stamp(col,from,1,end-from,'H');};
 const remove=(types:string[])=>{room.entities=room.entities.filter(e=>!types.includes(e.type));};
 const stairs=(x:number,count:number,startY:number,dir=1)=>{for(let i=0;i<count;i++)add('step','geo-stair-'+x+'-'+i,x+i*16,startY-i*8*dir,16,240-(startY-i*8*dir));};
 const ledge=(x:number,y:number,w:number,kind='=')=>stamp(x,y,w,1,kind);
 const shelters=()=>{add('shade','shade-awning',64,104,48,6);add('shade','shade-rock',174,112,42,6);};
 if([0,1,3].includes(index)){
  remove(['step','sun','icicle','vent','lightning','gust','current','rhythm','crumble','plate']);
  ground(profile.floors[index===0?0:index===1?1:2],realm===1);
  if(realm===0){
   shelters();if(index===1){stamp(6,11,2);ledge(3,9,3);ladder(4,9,13);}
   else{ledge(index===0?5:3,8,3);add('sun','hazard-sun',0,192,256,16);}
  }
  if(realm===1){ledge(5,index===1?6:8,3,'I');ledge(10,index===1?5:7,3,'I');ladder(index===1?6:11,7,13);if(index!==0){add('icicle','ice-fall-a',120,40,8,16);add('icicle','ice-fall-b',204,64,8,16);}}
  if(realm===2){for(const x of [58,144,202]){const vent=add('vent','vent-'+x,x,196,16,12);vent.timer=x;}ledge(5,10,3);ledge(10,8,3);if(index===1)stamp(0,2,16,2);}
  if(realm===3){ledge(4,9,2);ledge(9,7,3);ladder(10,7,13);for(const x of [86,183]){const strike=add('lightning','strike-'+x,x,192,20,16);strike.timer=x;}if(index===1)ledge(1,5,4);}
  if(realm===4){ledge(4,index===1?8:10,3);ledge(10,8,4);ladder(11,8,13);add('gust','courtyard-wind',100,192,32,16);if(index===1){stamp(5,4,2,2);stamp(10,3,3,2);}}
  if(realm===5){ledge(3,10,3);ladder(4,10,14);ledge(9,7,4);if(index===1){stamp(2,3,2,4);stamp(12,2,2,4);ledge(5,5,4);}
   add('current','sea-current',112,188,32,16);const raft=add('lift','tide-raft',96,160,40,6);raft.vy=.25;}
  if(realm===6){ledge(3,10,3);ledge(9,8,3);ladder(10,8,13);for(const x of [50,146,218])add('lantern','lantern-'+x,x,114,10,28);add('rhythm','shadow-balcony',112,128,40,6);if(index===1)ledge(6,6,4);}
  if(realm===7){for(const x of [64,128])add('crumbling','rope-span-'+x,x,168,40,6);ledge(10,8,3);ladder(11,8,13);if(index===1){stamp(0,2,3,5);stamp(13,2,3,5);}}
 }
 if(index===2||index===5){
  // The bell/lyre solutions remain base-kit accessible; realm-specific upper routes are optional.
  if(realm===0)shelters();
  if(realm===1){ledge(2,6,3,'I');add('icicle','puzzle-icicle',212,32,6,14);}
  if(realm===2){ledge(2,7,3);add('vent','puzzle-vent',202,196,16,12);}
  if(realm===3){ledge(3,5,4);add('lantern','shrine-lamp',206,68,10,20);}
  if(realm===4){ledge(2,7,3);ladder(3,7,11);}
  if(realm===5){ledge(3,6,3);add('lift','sluice-float',144,92,28,6);}
  if(realm===6){add('lantern','seal-lantern',75,124,10,24);ledge(2,6,3);}
  if(realm===7)add('crumbling','seal-rope',48,104,36,6);
 }
 if(index===4||index===7){
  ground(Array(16).fill(13),realm===1);remove(['step']);
  if(index===4){
   const spots=[[5,10,4],[8,9,4],[4,10,5],[9,8,4],[6,9,4],[8,10,5],[4,10,4],[7,9,4]][realm];ledge(spots[0],spots[1],spots[2]);ladder(spots[0]+1,spots[1],13);
   const oil=room.entities.find(e=>e.type==='oil');if(oil){oil.x=(spots[0]+1)*16+3;oil.y=spots[1]*16-18;}
  }else{
   // Each final approach has a different silhouette, keeping the door landing clear.
   if(realm===0||realm===7){stamp(5,5,2,3);ledge(8,9,3);}
   if(realm===1){ledge(3,8,4,'I');stamp(0,2,2,3,'I');}
   if(realm===2){stamp(3,2,3,3);add('vent','gate-vent',104,196,16,12);}
   if(realm===3){ledge(5,5,5);stamp(9,6,1,2);}
   if(realm===4){ledge(4,7,3);ladder(5,7,13);}
   if(realm===5)ledge(5,7,5);
   if(realm===6){ledge(3,8,4);add('lantern','gate-lantern',178,130,10,24);}
  }
 }
 if(index===6){
  ground(Array(16).fill(13),realm===1);remove(['step','flyer']);
  const col=profile.climb;
  if(realm===0)stairs(48,9,200);
  if(realm===1){ledge(2,11,3,'I');ledge(7,9,4,'I');ledge(1,6,4,'I');ledge(8,4,5,'I');ladder(9,4,13);}
  if(realm===2){ledge(2,11,4);ledge(8,8,4);ledge(3,5,4);ledge(10,3,4);ladder(4,5,13);}
  if(realm===3){ledge(1,11,4);ledge(9,9,5);ledge(2,6,4);ledge(9,3,5);}
  if(realm===4){stairs(48,8,200);ledge(5,5,4);ladder(6,5,12);ledge(12,3,3);}
  if(realm===5){ledge(1,10,4);ledge(9,7,5);ledge(2,4,3);add('lift','well-float',136,160,40,6);}
  if(realm===6){ledge(5,11,4);ledge(10,8,4);ledge(4,5,4);ledge(10,2,4);ladder(11,2,13);}
  if(realm===7){stairs(48,7,200);ledge(8,7,5);ledge(3,4,4);ladder(4,4,13);}
  ladder(col,0,13,true);room.vertical=true;
 }
 if(index===9){
  remove(['step','honey']);
  // Eight genuinely different upper-screen landforms. Adjacent rises are at most 32px.
  const tops=[
   [13,13,13,13,12,12,11,11,10,10,9,9,8,8,8,8],
   [13,13,13,12,12,11,11,10,10,9,9,9,8,8,8,8],
   [13,13,13,13,11,11,12,12,10,10,10,9,8,8,8,8],
   [13,13,13,12,12,10,10,12,12,10,10,9,8,8,8,8],
   [13,13,13,13,12,12,10,10,11,11,9,9,8,8,8,8],
   [13,13,13,14,14,12,12,10,10,11,11,9,8,8,8,8],
   [13,13,13,12,12,10,10,11,11,9,9,9,8,8,8,8],
   [13,13,13,14,12,12,13,11,11,10,10,9,8,8,8,8]
  ][realm];ground(tops,realm===1);
  ladder(profile.descent,2,15,true);
  if(realm===0)shelters();
  if(realm===3)ledge(4,6,5);
  if(realm===4){ledge(3,6,4);ladder(4,6,13);}
  if(realm===5)add('lift','aqueduct-float',120,144,32,6);
  if(realm===6){add('rhythm','roof-shadow',104,96,40,6);add('lantern','roof-lantern',208,74,10,24);}
  if(realm===7)add('crumbling','upper-rope',80,144,48,6);
  add('honey','upper-honey',220,106,8,10);
 }
 if(index===8){
  ground(Array(16).fill(13),realm===1);
  const arenas=[[[3,11,2],[11,11,2]],[[2,11,3],[11,9,3]],[[4,11,2],[10,11,2]],[[3,9,3],[10,9,3]],[[2,10,3],[11,8,3]],[[2,10,3],[7,8,3],[12,10,3]],[[3,11,2],[11,11,2]],[[2,10,3],[7,11,2],[12,10,2]]][realm];
  // Ketev's original solid perches sit 32px above the floor, within a normal jump.
  for(const [x,y,w] of arenas)ledge(x,y,w,realm===0?'#':'=');
 }
 room.tiles=grid.map(r=>r.join(''));
 for(const e of room.entities){if(['vent','lightning'].includes(e.type)||index===0&&e.type==='honey'){const col=Math.min(15,Math.floor((e.x+e.w/2)/16));let row=13;for(let y=10;y<15;y++)if(['#','I'].includes(grid[y][col])){row=y;break;}e.y=row*16-(e.type==='honey'?24:e.h);e.originY=e.y;}}
 // Place enemies and pickups on their authored ground, rather than inside a raised terrace.
 for(const e of room.entities){if(['walker','turret','mini'].includes(e.type)){
  const col=Math.max(0,Math.min(15,Math.floor((e.x+e.w/2)/16)));let row=13;
  for(let y=8;y<15;y++)if(['#','I'].includes(grid[y][col])){row=y;break;}
  e.y=row*16-e.h;e.originY=e.y;
 }}
 return room;
}
