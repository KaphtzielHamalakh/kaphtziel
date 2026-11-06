export type Entity={id:string,type:string,x:number,y:number,w:number,h:number,hp:number,active:boolean,timer:number,links?:string[],requires?:{all?:string[],any?:string[]},power?:number,vx?:number,vy?:number,originX?:number,originY?:number};
export type Room={tiles:string[],entities:Entity[],title:string,puzzle:boolean,vertical:boolean};
export function entity(type:string,id:string,x:number,y:number,w=16,h=16,hp=1):Entity{return {id,type,x,y,w,h,hp,active:false,timer:0,originX:x,originY:y};}
export function makeRoom(realm:number,index:number):Room{
 const tiles=Array.from({length:15},()=>Array(16).fill('.'));const entities:Entity[]=[];const put=(type:string,id:string,x:number,y:number,w=16,h=16,hp=1)=>{const e=entity(type,id,x,y,w,h,hp);entities.push(e);return e;};
 for(let x=0;x<16;x++){tiles[13][x]='#';tiles[14][x]='#';}
 const platform=(x:number,y:number,n:number)=>{if(y===10)y=11;else if(y===8)y=9;for(let i=x;i<x+n;i++)tiles[y][i]='#';};
 const ladder=(x:number,y:number,n:number)=>{for(let i=y;i<y+n;i++)tiles[i][x]='H';};
 const puzzle=index===2||index===5;
 const titles=['OUTER REACHES','THE BROKEN ROAD','THE FIRST SEAL','THE GAUNTLET','SANCTUARY','THE SECOND SEAL','THE HEIGHTS','THE SPARK GATE','THE CAPTIVE SPARK'];
 if(index===0){platform(6,10,3);platform(12,8,3);put('walker','enemy0',138,190,14,16,2);put('honey','honey',202,112,8,10);}
 if(index===1){platform(4,10,3);platform(9,8,3);platform(13,10,3);put('flyer','enemy1',164,100,16,16,2);put('turret','enemy2',214,192,16,16,3);put('plate','reflect',120,168).timer=1;}
 if(index===2){
  const variant=realm%4;
  const bell=put('bell','bell',160,160,12,16);bell.links=['gate'];
  put('gate','gate',224,128,16,80).requires={any:['bell']};
  put('reset','reset',38,176,12,16);
  if(variant===0){put('plate','plate',136,184).timer=1;bell.x=136;bell.y=104;platform(6,9,2);}
  if(variant===1){put('animal','animal',112,190,28,18,6);platform(9,10,3);bell.x=170;bell.y=132;}
  if(variant===2){const p=put('pressure','pressure',144,204,24,4);p.links=['gate'];entities.find(e=>e.id==='gate')!.requires={any:['pressure','bell']};put('block','block',88,184,24,24);bell.x=186;bell.y=172;}
  if(variant===3){put('harp','harp',194,120,16,88);entities.find(e=>e.id==='gate')!.requires={any:['harp','bell']};platform(6,10,3);}
 }
 if(index===3){platform(3,10,3);platform(8,8,3);platform(12,10,3);put('mini','miniboss',158,176,28,32,10);put('flyer','flyer',94,76,16,16,2);}
 if(index===4){put('checkpoint','checkpoint',40,176);put('honey','refill',104,184,10,12);put('energy','energy',136,184,10,12);if(realm===4)put('morning','morning',184,176,20,24);put('oil','oil',200,122,10,16);platform(10,10,4);}
 if(index===5){
  put('reset','reset',32,176,12,16);put('bell','bell',130,128,12,16).links=['gate'];put('gate','gate',224,128,16,80).requires={all:['bell']};platform(6,10,3);platform(11,8,3);
  put('block','block',70,184,24,24);put('plate','plate',172,176).timer=1;
  const powers=[0,2,5,6,7,2,4,1];const kinds=['thorn','cracked','curtain','shadow','stalactite','cracked','sand','water'];const e=put(kinds[realm],'alcove',186,128,16,48);e.power=powers[realm];put('fragment','fragment',204,152,8,12).power=powers[realm];
  if(realm===4)put('light','light',148,152,32,6);
 }
 if(index===6){platform(2,10,4);platform(8,7,4);platform(3,4,4);platform(13,4,3);ladder(4,10,3);ladder(9,7,6);ladder(5,4,6);put('flyer','flyer',128,92,16,16,2);put('turret','turret',174,96,16,16,3);}
 if(index===7){put('checkpoint','checkpoint',40,176);put('honey','honey',100,184,10,12);put('energy','energy',130,184,10,12);put('bossgate','bossgate',224,96,16,112);}
 if(index===8){platform(3,10,2);platform(11,10,2);}
 if(!puzzle&&index!==4&&index!==7&&index!==8){
  const kinds=['sun','icicle','vent','lightning','gust','current','rhythm','crumble'];put(kinds[realm],'hazard',120,realm===1?32:192,32,16);
  if(realm===6)put('lantern','lantern',172,118,10,28);
 }
 return {tiles:tiles.map(r=>r.join('')),entities,title:titles[index],puzzle,vertical:index===6};
}
export function prologueRoom(index:number):Room{const r=makeRoom(0,index===0?0:index===1?2:8);r.title=['THE FIELDS OF JESSE','THE LION AT THE FOLD','THE BEAR IN THE HILLS'][index]||'BETHLEHEM';r.entities=r.entities.filter(e=>['honey','plate'].includes(e.type));if(index>0)r.entities.push(entity('mini',index===1?'lion':'bear',164,176,28,32,index===1?8:12));return r;}
