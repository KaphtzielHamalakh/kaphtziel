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
 rooms.d3.puzzle='block';rooms.d3.block={x:96,y:80};rooms.d3.plate={x:128,y:80};for(let x=2;x<14;x++)rooms.d3.tiles[3][x]='~';
 rooms.d4.dim=true;for(let y=2;y<9;y++)for(let x=2;x<14;x++)if(y!==5&&x!==8)rooms.d4.tiles[y][x]='O';
 rooms.d5.spawns=[{type:'bruiser',x:160,y:88}];rooms.d5.chest={x:128,y:48,reward:'dreidel'};
 rooms.d6.puzzle='switch';rooms.d6.switch={x:128,y:40};for(let x=2;x<14;x++)rooms.d6.tiles[3][x]='O';rooms.d6.tiles[3][7]='.';rooms.d6.tiles[3][8]='.';
 rooms.d7.spawns=[{type:'split',x:96,y:72},{type:'split',x:160,y:112}];rooms.d7.chest={x:128,y:48,reward:'key'};
 rooms.d8.chest={x:112,y:64,reward:'compass'};
 rooms.d9.spawns=[{type:'rock',x:96,y:72},{type:'grunt',x:176,y:112}];
 rooms.d10.spawns=[{type:'slime',x:80,y:64},{type:'slime',x:176,y:112}];
 rooms.d11.boss=true;rooms.d11.basin={x:64,y:112};
 return {rooms,link};
})();
if(typeof module!=='undefined')module.exports=World;
