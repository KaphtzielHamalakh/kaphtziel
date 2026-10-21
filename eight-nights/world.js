'use strict';
// Every room is a 16 × 11 grid. # stone, T olive, ~ water/oil, O pit.
const World = (() => {
 const rooms = {};
 function room(id,name,kind,extra={}) {
  const rows=Array.from({length:11},(_,y)=>Array.from({length:16},(_,x)=>x===0||x===15||y===0||y===10?'#':'.'));
  rooms[id]={id,name,kind,tiles:rows,exits:{},...extra};return rooms[id];
 }
 function link(a,dir,b,locked=false){const opposite={n:'s',s:'n',e:'w',w:'e'};rooms[a].exits[dir]={to:b,locked};rooms[b].exits[opposite[dir]]={to:a,locked};for(const [id,d]of [[a,dir],[b,opposite[dir]]]){const r=rooms[id];if(d==='n'||d==='s'){r.tiles[d==='n'?0:10][7]='.';r.tiles[d==='n'?0:10][8]='.';}else{r.tiles[5][d==='w'?0:15]='.';r.tiles[6][d==='w'?0:15]='.';}}}
 room('town','Judea','town',{npcs:[{x:64,y:104,who:'Judah'},{x:184,y:112,who:'Hillel'}]});
 room('home',"Bubbe’s house",'home',{npcs:[{x:96,y:64,who:'Bubbe'}]});
 rooms.town.portal={x:48,y:40,to:'home'};rooms.home.portal={x:128,y:148,to:'town'};
 for(let i=0;i<8;i++){let r=room('grove'+i,i===1?'The Great Olive':'Olive Groves · '+(i+1),'grove',{spawns:[{type:i%3===0?'rock':'grunt',x:160,y:64},{type:'slime',x:192,y:120}]});for(let y=1;y<10;y++)for(let x=1;x<15;x++){if((x*7+y*11+i*3)%13<3&&y!==5&&y!==6&&x!==7&&x!==8)r.tiles[y][x]='T';} }
 link('town','e','grove0');for(let i=0;i<3;i++)link('grove'+i,'e','grove'+(i+1));for(let i=0;i<4;i++)link('grove'+i,'n','grove'+(i+4));for(let i=4;i<7;i++)link('grove'+i,'e','grove'+(i+1));
 rooms.grove1.portal={x:128,y:48,to:'d0'};rooms.grove1.tiles[3][8]='.';
 rooms.grove6.spring={x:128,y:80};rooms.grove6.tiles[5][8]='.';
 const names=['The cellar steps','The washing room','Map vault','The oil channel','The dim crossing','The Bruiser','The far crystal','The splitting room','Compass vault','The sealed passage','The last barrels','Shibta’s cellar'];
 for(let i=0;i<12;i++)room('d'+i,names[i],'dungeon',{index:i,spawns:[]});
 link('d0','n','d1');link('d1','w','d2');link('d1','n','d3');link('d3','e','d4');link('d4','n','d5',true);link('d5','w','d6');link('d6','w','d7');link('d7','s','d8');link('d6','n','d9',true);link('d9','e','d10');link('d10','n','d11');
 rooms.d0.portal={x:128,y:148,to:'grove1'};
 rooms.d1.chest={x:80,y:64,reward:'key'};rooms.d1.spawns=[{type:'slime',x:160,y:100}];
 rooms.d2.chest={x:112,y:64,reward:'map'};rooms.d2.npcs=[{x:160,y:96,who:'Sage'}];
 rooms.d3.puzzle='block';rooms.d3.gate='e';rooms.d3.block={x:96,y:80};rooms.d3.plate={x:128,y:80};for(let x=2;x<14;x++)rooms.d3.tiles[3][x]='~';
 rooms.d4.dim=true;for(let y=2;y<9;y++)for(let x=2;x<14;x++)if(y!==5&&x!==8)rooms.d4.tiles[y][x]='O';
 rooms.d5.spawns=[{type:'bruiser',x:160,y:88}];rooms.d5.chest={x:128,y:48,reward:'dreidel'};
 rooms.d6.puzzle='switch';rooms.d6.gate='n';rooms.d6.switch={x:128,y:40};for(let x=2;x<14;x++)rooms.d6.tiles[3][x]='O';rooms.d6.tiles[3][7]='.';rooms.d6.tiles[3][8]='.';
 rooms.d7.spawns=[{type:'split',x:96,y:72},{type:'split',x:160,y:112}];rooms.d7.chest={x:128,y:48,reward:'key'};
 rooms.d8.chest={x:112,y:64,reward:'compass'};
 rooms.d9.spawns=[{type:'rock',x:96,y:72},{type:'grunt',x:176,y:112}];
 rooms.d10.spawns=[{type:'slime',x:80,y:64},{type:'slime',x:176,y:112}];
 rooms.d11.boss=true;rooms.d11.basin={x:64,y:112};

 // Night Two: a southern route from the groves, open from the start.
 for(let i=0;i<4;i++){
  const r=room('flats'+i,'Frying Flats · '+(i+1),'flats',{night:2,spawns:[{type:'grunt',x:176,y:72},{type:'slime',x:96,y:120}]});
  for(let y=2;y<9;y++)for(let x=2;x<14;x++)if(y!==5&&y!==6&&x!==7&&x!==8)r.tiles[y][x]='H';
 }
 link('grove0','s','flats0');for(let i=0;i<3;i++)link('flats'+i,'e','flats'+(i+1));
 rooms.flats2.portal={x:128,y:48,to:'f0',arrivalX:128,arrivalY:136};
 rooms.flats0.npcs=[{x:64,y:88,who:'Baker'}];
 const furnaceNames=['The furnace stair','The dough store','The furnace map','The first griddle','The baker’s guard','The cracked flue','The three ovens','The grease cell','The cook’s tablet','The iron passage','The hollow cook','The second griddle','The last oven','Ketev Meriri'];
 for(let i=0;i<14;i++)room('f'+i,furnaceNames[i],'dungeon',{night:2,index:i,spawns:[]});
 link('f0','n','f1');link('f1','w','f2');link('f1','n','f3');link('f3','e','f4',true);link('f4','n','f5');link('f5','w','f6');link('f6','w','f7');link('f7','s','f8');link('f6','n','f9',true);link('f9','e','f10');link('f10','n','f11');link('f11','w','f12');link('f12','n','f13');
 rooms.f0.portal={x:128,y:148,to:'flats2',arrivalX:128,arrivalY:80};
 rooms.f1.spawns=[{type:'grunt',x:176,y:96}];rooms.f1.chest={x:80,y:64,reward:'key'};
 rooms.f2.chest={x:112,y:64,reward:'map2'};
 for(const id of ['f3','f11','f13'])for(let y=3;y<8;y++)for(let x=4;x<12;x++)rooms[id].tiles[y][x]='H';
 rooms.f4.spawns=[{type:'bruiser',x:160,y:88}];rooms.f4.chest={x:128,y:48,reward:'bombBag'};
 rooms.f5.puzzle='crack';rooms.f5.gate='w';rooms.f5.target={x:32,y:88};
 rooms.f6.puzzle='ovens';rooms.f6.gate='n';rooms.f6.levers=[{x:64,y:48},{x:128,y:48},{x:192,y:48}];rooms.f6.order=[0,2,1];
 rooms.f7.spawns=[{type:'split',x:96,y:72},{type:'slime',x:176,y:112}];rooms.f7.chest={x:128,y:48,reward:'key'};
 rooms.f8.chest={x:112,y:64,reward:'compass2'};rooms.f8.npcs=[{x:176,y:96,who:'Cook'}];
 rooms.f9.spawns=[{type:'rock',x:80,y:64},{type:'grunt',x:176,y:112}];
 rooms.f10.puzzle='statue';rooms.f10.gate='n';rooms.f10.target={x:128,y:64};
 rooms.f12.spawns=[{type:'bruiser',x:96,y:72},{type:'split',x:176,y:112}];
 rooms.f13.boss=true;rooms.f13.bossKind='ketev';

 // Nights Three and Four: the marsh is open; the western crossing needs the Snorkel.
 for(let i=0;i<4;i++){
  const r=room('marsh'+i,'Hippo Marsh · '+(i+1),'marsh',{night:3,spawns:[{type:'water',x:176,y:88},{type:'slime',x:80,y:120}]});
  for(let y=2;y<9;y++)for(let x=2;x<14;x++)if(y!==5&&y!==6&&x!==7&&x!==8)r.tiles[y][x]='W';
 }
 link('town','s','marsh0');for(let i=0;i<3;i++)link('marsh'+i,'e','marsh'+(i+1));rooms.marsh2.portal={x:128,y:48,to:'m0',arrivalX:128,arrivalY:136};rooms.marsh0.npcs=[{x:64,y:88,who:'Bathkeeper'}];
 room('river0','The river crossing','river',{night:4,spawns:[]});link('town','w','river0');for(let y=1;y<10;y++)for(let x=6;x<10;x++)rooms.river0.tiles[y][x]='W';
 for(let i=0;i<4;i++){const r=room('hills'+i,'Gelt Hills · '+(i+1),'hills',{night:4,spawns:[{type:'mine',x:176,y:88},{type:'rock',x:80,y:120}]});for(let y=2;y<9;y++)for(let x=2;x<14;x++)if((x*5+y*7+i)%11===0&&y!==5&&y!==6&&x!==7&&x!==8)r.tiles[y][x]='#';}
 link('river0','w','hills0');for(let i=0;i<3;i++)link('hills'+i,'w','hills'+(i+1));rooms.hills2.portal={x:128,y:48,to:'l0',arrivalX:128,arrivalY:136};rooms.hills0.npcs=[{x:128,y:112,who:'Miner'}];rooms.hills3.spring={x:128,y:80};
 const baths=['The mikveh stair','The changing room','The bathhouse map','The three valves','The stepping stones','The bridge Bruiser','The submerged drain','The low pool','The bathhouse compass','The cross-current','The mirror pool','The reflected gate','The dim pool','The final drain','The tentacle court','Shabriri'];
 const mines=['The mine entrance','The ore store','The survey room','The rail junction','The foreman’s guard','The heavy boulder','The three plates','The crystal vault','The miner’s compass','The deep shaft','The honest scales','The dim gallery','The cart platform','The last key','The forge guard','Azazel'];
 for(const [prefix,names,night]of [['m',baths,3],['l',mines,4]]){
  for(let i=0;i<16;i++)room(prefix+i,names[i],'dungeon',{night,index:i,spawns:[]});
  for(const [a,d,b,locked]of [[0,'n',1],[1,'w',2],[1,'n',3],[3,'e',4,true],[4,'n',5],[5,'w',6],[6,'w',7],[7,'s',8],[6,'n',9,true],[9,'e',10],[10,'n',11],[11,'w',12],[12,'n',13],[13,'e',14],[14,'n',15,true]])link(prefix+a,d,prefix+b,!!locked);
  rooms[prefix+'0'].portal={x:128,y:148,to:night===3?'marsh2':'hills2',arrivalX:128,arrivalY:80};
  for(const n of [1,7,13]){rooms[prefix+n].chest={x:128,y:48,reward:'key'};rooms[prefix+n].spawns=[{type:night===3?'water':'mine',x:176,y:104}];}
  rooms[prefix+'2'].chest={x:112,y:64,reward:'map'+night};rooms[prefix+'8'].chest={x:112,y:64,reward:'compass'+night};
  rooms[prefix+'5'].spawns=[{type:'bruiser',x:176,y:88}];rooms[prefix+'5'].chest={x:128,y:48,reward:night===3?'snorkel':'band'};
  rooms[prefix+'9'].spawns=[{type:night===3?'water':'mine',x:176,y:112}];rooms[prefix+'14'].spawns=[{type:'bruiser',x:80,y:80},{type:night===3?'water':'mine',x:176,y:120}];
  rooms[prefix+'12'].dim=true;rooms[prefix+'15'].boss=true;rooms[prefix+'15'].bossKind=night===3?'shabriri':'azazel';
 }
 rooms.m2.npcs=[{x:176,y:104,who:'WaterSage'}];rooms.m3.puzzle='valves';rooms.m3.gate='e';rooms.m3.valvePositions=[{x:64,y:64},{x:128,y:64},{x:192,y:64}];
 rooms.m6.puzzle='drain';rooms.m6.gate='n';rooms.m6.submergedSwitch={x:128,y:80};
 for(const id of ['m4','m6','m9','m10','m11','m12','m15'])for(let y=3;y<8;y++)for(let x=4;x<12;x++)if(id!=='m4'||x!==7&&x!==8)rooms[id].tiles[y][x]='W';
 rooms.m9.current=true;rooms.m10.mirrorPlate={x:64,y:112,to:'m11'};rooms.m11.mirrorPlate={x:192,y:112,to:'m10'};rooms.m11.puzzle='mirror';rooms.m11.gate='w';
 rooms.l2.npcs=[{x:176,y:104,who:'MineSage'}];rooms.l3.puzzle='rails';rooms.l3.gate='e';rooms.l3.railSwitch={x:128,y:80};
 rooms.l5.puzzle='heavy';rooms.l5.gate='w';rooms.l5.heavy={x:80,y:88};
 rooms.l6.puzzle='plates';rooms.l6.gate='n';rooms.l6.plates=[{x:64,y:64},{x:128,y:64},{x:192,y:64}];rooms.l6.rocks=[{x:64,y:120},{x:192,y:120}];
 rooms.l10.puzzle='scales';rooms.l10.gate='n';rooms.l10.scale={x:128,y:80};rooms.l12.cart=true;
 rooms.l15.rocks=[{x:48,y:120},{x:208,y:120}];
 // Derive each dungeon map from its actual room graph.
 for(const start of ['d0','f0','m0','l0']){const queue=[[start,0,0]],seen=new Set();while(queue.length){const[id,x,y]=queue.shift();if(seen.has(id))continue;seen.add(id);rooms[id].grid=[x,y];for(const[d,e]of Object.entries(rooms[id].exits)){const v={n:[0,-1],s:[0,1],w:[-1,0],e:[1,0]}[d];queue.push([e.to,x+v[0],y+v[1]]);}}}
 return {rooms,link};
})();
if(typeof module!=='undefined')module.exports=World;
