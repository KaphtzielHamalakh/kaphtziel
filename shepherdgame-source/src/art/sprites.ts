export const DAVID=[
'........111111..........',
'......1155555511........',
'.....155665565551.......',
'.....156555655551.......',
'.....155522255551.......',
'.....152277227221.......',
'......12271227121.......',
'......1222282221........',
'.......122882211........',
'........122221..........',
'......1139993311........',
'.....133399333331.......',
'....12333933333221......',
'....12213333331221......',
'....12213344331221......',
'.....111444444111.......',
'......143AA3431.........',
'......133AA3331.........',
'......133333331.........',
'......133113331.........',
'.......1211121..........',
'.......1211121..........',
'......122111221.........',
'......122111221.........',
'.....14441114441........',
'.....11111111111........',
'........................',
'........................'];
export const ENEMY=['....1111....','...133331...','..13223231..','.1332233331.','133333333331','132133312331','133333333331','.1333333331.','..13333331..','..12211221..','.1222112221.','.1111111111.'];
const cache=new Map<string,HTMLCanvasElement>();
export function raster(rows:string[],colors:string[]){const key=rows.join('')+colors.join();if(cache.has(key))return cache.get(key)!;const c=document.createElement('canvas');c.width=rows[0].length;c.height=rows.length;const x=c.getContext('2d')!;rows.forEach((r,y)=>[...r].forEach((v,i)=>{if(v!=='.'){x.fillStyle=colors[parseInt(v,16)]||'#fff';x.fillRect(i,y,1,1);}}));cache.set(key,c);return c;}
export function david(ctx:CanvasRenderingContext2D,x:number,y:number,face:number,tunic:string,shadow:string,frame:number,mode:string){
 ctx.save();ctx.translate(Math.floor(x+7),Math.floor(y+22));ctx.scale(face,1);
 const colors=['','#0c1020','#d9946f',tunic,shadow,'#873b2f','#bd6543','#fff1cb','#a85c49','#ecd2a1','#685040'];
 const f=(xx:number,yy:number,w:number,h:number,c:string)=>{ctx.fillStyle=c;ctx.fillRect(xx,yy,w,h);};
 if(mode==='slide'){ctx.drawImage(raster(DAVID,colors),0,0,24,19,-13,-12,24,12);f(-11,-3,20,3,shadow);f(7,-4,6,3,'#0c1020');}
 else {
 const animated=['run','jump','fall','climb'].includes(mode);
 ctx.drawImage(raster(animated?DAVID.map((row,i)=>i>=20?'.'.repeat(24):row):DAVID,colors),-12,-27);
 if(mode==='run'||mode==='jump'||mode==='fall'||mode==='climb'){

  const n=Math.floor(frame/6)%4;
  const legs=mode==='run'?[[[-5,-7,4,5],[3,-6,4,5]],[[-8,-7,4,4],[5,-5,4,3]],[[-4,-6,4,5],[1,-7,4,5]],[[0,-6,4,4],[-7,-5,4,3]]][n]:mode==='climb'?[[[-5,-6,4,4],[3,-10,4,4]],[[-5,-10,4,4],[3,-6,4,4]]][n%2]:[[-6,-8,4,4],[2,-5,4,4]];
  for(const [xx,yy,w,h] of legs){f(xx-1,yy-1,w+2,h+2,'#0c1020');f(xx,yy,w,h,'#d9946f');f(xx-1,yy+h,w+3,2,shadow);}
 }
 if(mode==='climb'){f(-10,-23,3,5,'#d9946f');f(7,-21-(Math.floor(frame/10)%2)*4,3,5,'#d9946f');}
 else if(mode==='fire'){f(4,-19,12,5,'#0c1020');f(4,-18,11,3,'#d9946f');f(14,-25,1,8,'#e1c18a');f(11,-27,5,2,'#82664b');}
 else if(mode==='lyre'){f(5,-23,11,14,'#0c1020');f(6,-23,2,13,'#e2bc6a');f(14,-23,2,13,'#e2bc6a');f(6,-12,10,2,'#e2bc6a');for(let i=0;i<3;i++)f(9+i*2,-23,1,12,'#e8d3a1');f(6,-17+(frame%16<8?0:2),5,2,'#d9946f');}
 else {f(8,-17,1,9,'#bea06b');f(7,-9,3,2,'#6d4c37');}
 }
 ctx.restore();
}
export function enemySprite(kind:string,realm:number,id=''){
 const k='enemy'+kind+realm+id;if(cache.has(k))return cache.get(k)!;
 const c=document.createElement('canvas');c.width=32;c.height=32;const g=c.getContext('2d')!;
 const colors=['#d28e50','#9fc8dd','#d1bb71','#66bfc1','#a389b7','#70b9a3','#bd87b8','#bc805e'];
 const color=colors[realm],ink='#0c1020',light='#f4dfb1';
 const f=(x:number,y:number,w:number,h:number,col:string)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
 const box=(x:number,y:number,w:number,h:number,col:string)=>{f(x-1,y-1,w+2,h+2,ink);f(x,y,w,h,col);f(x+1,y+1,w-2,1,light);};
 if(id==='lion'||id==='bear'||kind==='animal'){
  box(7,12,21,11,color);box(3,8,12,13,id==='lion'?'#9b633c':color);box(6,11,10,9,'#d3a36b');f(5,7,4,4,ink);f(12,7,4,4,ink);f(4,15,3,3,ink);f(8,12,2,2,light);for(const x of [9,22])box(x,23,4,6,color);
 }else if(kind==='flyer'){
  for(let i=0;i<5;i++){box(i*2,5+i*2,5,8,color);box(25-i*2,5+i*2,5,8,color);}box(11,12,10,13,color);f(13,15,2,3,light);f(18,15,2,3,light);f(15,21,3,3,ink);
 }else if(kind==='turret'){
  box(3,23,26,7,color);box(6,11,20,12,color);for(let i=0;i<4;i++)f(8+i*5,14,2,7,ink);box(9,4,14,7,color);f(5,5,5,4,light);f(13,6,6,3,ink);
 }else{
  box(8,13,16,13,color);box(9,4,14,12,color);box(4,15,5,10,color);box(24,15,5,10,color);box(7,26,7,5,color);box(19,26,7,5,color);f(7,1,3,7,light);f(22,1,3,7,light);f(11,8,4,3,ink);f(18,8,4,3,ink);f(12,8,2,1,light);f(19,8,2,1,light);f(14,13,5,2,ink);for(let i=0;i<3;i++){f(11,18+i*3,10,1,ink);}if(kind==='shield')box(1,14,7,17,'#ac9f72');
 }
 cache.set(k,c);return c;
}
