import {realms} from '../data/realms';
const scenes=new Map<string,HTMLCanvasElement>();
function surface(w:number,h:number){const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')!] as const;}
export function landscape(realm:number,title=false,pastoral=false,scene?:string){const key=[realm,title,pastoral,scene].join();if(scenes.has(key))return scenes.get(key)!;const [c,g]=surface(256,240),r=realms[realm];const fill=(x:number,y:number,w:number,h:number,color:string)=>{g.fillStyle=color;g.fillRect(Math.floor(x),Math.floor(y),w,h);};
 fill(0,0,256,240,pastoral?'#23395d':r.sky);
 const disc=(x:number,y:number,radius:number,color:string)=>{for(let yy=-radius;yy<=radius;yy++){const w=Math.floor(Math.sqrt(radius*radius-yy*yy));fill(x-w,y+yy,w*2+1,1,color);}};
 const rock=(x:number,y:number,w:number,h:number,color:string)=>{for(let yy=0;yy<h;yy++){const inset=yy<8?Math.max(0,8-yy):0;fill(x+inset,y+yy,w-inset*2,1,color);}for(let j=12;j<h;j+=13){fill(x+3,y+j,w-6,1,r.sky);fill(x+5,y+j+2,Math.max(2,w/3),1,r.ground);}};
 const column=(x:number,y:number,h:number)=>{fill(x,y,14,h,r.back);fill(x+2,y,2,h,r.ground);fill(x+10,y,2,h,r.sky);fill(x-3,y-3,20,5,r.ground);fill(x-3,y+h-4,20,5,r.ground);for(let yy=12;yy<h;yy+=16)fill(x,y+yy,14,1,r.sky);};
 for(let i=0;i<38;i++)fill((i*71+13)%256,(i*29+11)%128,1,1,i%3?r.back:r.light);
 if(realm===0||realm===7){disc(195,70,29,realm===0?'#d79c60':'#b96555');for(let j=0;j<6;j++)fill(162,79+j*4,66,2,r.sky);for(let i=0;i<7;i++)rock(i*44-12,128-(i*17)%54,35+(i%2)*10,140,r.back);for(let i=0;i<6;i++){fill(i*53,178,43,30,r.ground);fill(i*53+2,180,39,2,r.light);for(let j=0;j<4;j++)fill(i*53+j*9,184,1,22,r.back);}}
 if(realm===1){disc(202,50,19,'#c6dbe8');for(let i=0;i<6;i++){const x=i*58-24,peak=66+(i%3)*20;for(let y=peak;y<208;y++){const w=Math.floor((y-peak)*.47);fill(x-w,y,w*2,1,r.back);if(y<peak+18)fill(x-w,y,w*2,1,r.light);else if(y<peak+40)fill(x,y,2,1,r.ground);}}for(let i=0;i<8;i++)fill(i*37+4,143+(i%3)*13,3,70,'#345274');}
 if(realm===2){disc(200,76,26,'#b76d47');for(let i=0;i<9;i++){const x=i*33-9,y=115+(i%3)*15;rock(x,y,22,120,r.back);fill(x+3,y,16,3,r.light);}for(let i=0;i<7;i++){fill(i*41,186,32,18,'#3a3040');fill(i*41+3,186,26,2,'#bf8547');}for(let i=0;i<5;i++){fill(27+i*47,162,3,24,'#8f765b');fill(25+i*47,158,7,3,'#ac9974');}}
 if(realm===3||realm===4||realm===6){if(realm!==3)disc(207,46,17,realm===6?'#cab9ad':'#d09b85');for(let i=0;i<9;i++){const x=i*34-12,y=95+(i*19)%55;fill(x,y,29,113,r.back);fill(x+2,y+3,25,2,r.ground);for(let wy=y+13;wy<195;wy+=20){fill(x+7,wy,5,9,r.sky);fill(x+19,wy,4,9,r.sky);if(realm===6)fill(x+8,wy+2,2,5,'#b79863');}}for(let i=0;i<4;i++)column(i*73+10,127+i%2*14,82);if(realm===3){for(let i=0;i<6;i++){fill(i*48,38+(i%2)*11,45,13,r.back);fill(i*48+7,31+(i%2)*11,28,10,r.back);}}if(realm===4)for(let i=0;i<24;i++){const x=i*11;fill(x,195-(i%4)*4,2,15,r.ground);fill(x-2,192-(i%4)*4,6,3,'#59604c');}}
 if(realm===5){for(let y=18;y<208;y+=24)fill(0,y,256,1,'#1c3a4b');for(let i=0;i<7;i++){const x=i*42+7;column(x,124+(i%3)*13,90);for(let n=0;n<8;n++){fill(x+20+(n%3),192-n*8,2,8,n%2?'#397f79':'#305b69');fill(x+16,192-n*8,7,2,'#397f79');}}for(let i=0;i<24;i++){const x=(i*61)%256,y=50+(i*39)%143;fill(x,y,2,2,'#73b6b0');fill(x+1,y+1,1,1,'#b3dbbb');}fill(65,180,68,13,'#2b4652');fill(77,170,2,24,'#59716a');fill(79,171,29,1,'#8e9f88');}
 if(pastoral||title){fill(0,181,256,59,'#213b3d');for(let x=0;x<256;x++){const y=170+Math.floor(Math.sin(x/36)*12);fill(x,y,1,69,'#263e3d');if(x%11===0)fill(x,y-3,1,5,'#5b7256');}for(let i=0;i<8;i++){fill(i*37,202,2,12,'#ac9161');fill(i*37,205,37,2,'#79684b');}for(let i=0;i<4;i++){fill(i*67+12,150,4,45,'#443b38');for(let n=0;n<4;n++)fill(i*67+n*7,143+n%2*6,15,16,n%2?'#465a49':'#596c4e');}}
 if(scene&&!pastoral&&!title)roomScenery(g,realm,scene);
 scenes.set(key,c);return c;
}
export function stoneTile(realm:number,top:boolean,variant=0){const key='tile'+realm+top+variant;if(scenes.has(key))return scenes.get(key)!;const [c,g]=surface(16,16),r=realms[realm];const f=(x:number,y:number,w:number,h:number,col:string)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
 f(0,0,16,16,'#141624');f(1,1,14,14,r.ground);
 if(realm===0){f(0,0,16,2,r.light);f(0,6,16,1,r.back);f(2,10,13,1,r.back);f(0,14,16,2,r.back);f(2+variant*3,3,5,1,r.light);f(9-variant*2,12,4,1,r.light);}
 if(realm===1){f(0,0,16,3,'#d5e7e7');f(1,3,4,7,'#a9cfe0');f(5,3,6,2,'#bcdde6');f(2,10,2,3,'#a9cfe0');f(13,5,2,9,r.back);f(9,9,3,2,'#86b1d0');}
 if(realm===2){f(0,0,16,2,r.light);for(let i=0;i<3;i++){f(i*6,4+i*3,5,1,'#d5c499');f(i*5+1,7+i*2,1,3,'#615452');}f(0,14,16,2,'#423d43');f(6+variant,12,2,3,'#be8a43');}
 if(realm===3){f(1,1,14,1,r.light);f(1,2,1,12,r.light);f(13,3,2,12,r.back);f(3,4,8,1,r.back);f(4,4,1,7,r.back);f(6,7,5,1,r.light);f(10,7,1,5,r.light);f(3,13,10,1,r.back);}
 if(realm===4){f(1,1,14,1,r.light);f(2,7,13,1,r.back);f(variant%2?5:10,2,1,5,r.back);f(9,8,1,7,r.back);f(0,0,5,3,'#71865b');f(1,2,2,6,'#596e4d');f(12,9,3,5,'#4d6045');}
 if(realm===5){f(1,1,14,1,'#98c4b0');for(let i=0;i<4;i++){const x=2+(i*7+variant*3)%11,y=3+(i*5)%10;f(x,y,3,3,'#23555e');f(x,y,2,1,'#67a59a');}f(1,13,13,2,r.back);if(top){f(2,0,2,4,'#bd9488');f(8,0,3,3,'#779d91');}}
 if(realm===6){f(0,0,16,2,'#bdab85');f(1,3,14,1,r.back);f(2,7,12,1,'#342b48');f(7,4,1,10,r.back);f(2,13,12,2,r.back);f(3,10,2,1,'#8e7894');}
 if(realm===7){f(0,0,16,2,r.light);f(1,2,4,2,r.light);f(0,7,4,6,r.back);f(4,10,3,4,r.back);f(11,4,4,7,r.back);f(7,6,3,2,r.light);f(7+variant,12,2,4,'#4b3137');}
 if(top){f(0,0,16,2,r.light);if(realm===4){f(2,0,4,3,'#7c8f61');f(10,0,3,4,'#536846');}}

 scenes.set(key,c);return c;
}

function roomScenery(g:CanvasRenderingContext2D,realm:number,scene:string){
 const r=realms[realm];const f=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};
 const masonry=(x:number,y:number,w:number,h:number)=>{f(x,y,w,h,r.back);for(let yy=y+8;yy<y+h;yy+=12){f(x,yy,w,1,r.sky);for(let xx=x+(yy%24===8?0:12);xx<x+w;xx+=24)f(xx,yy-11,1,11,r.sky);}};
 const arch=(x:number,y:number,w:number,h:number)=>{masonry(x,y,9,h);masonry(x+w-9,y,9,h);masonry(x+5,y-7,w-10,9);f(x+9,y,2,6,r.ground);f(x+w-11,y,2,6,r.ground);};
 const cave=scene.includes('cave')||scene.includes('grotto')||scene==='coral-cave';
 if(cave){f(0,17,256,223,'#111a29');for(let i=0;i<17;i++){const x=i*16,d=18+(i*13)%27;f(x,17,16,d,r.back);f(x+2,19,12,4,r.ground);for(let n=0;n<d/3;n++)f(x+Math.floor(n/2),32+n*2,14-Math.floor(n),2,r.back);}
  for(let i=0;i<8;i++){const x=i*37-8,h=28+(i*17)%52;f(x,208-h,25,h,r.back);f(x+4,210-h,3,h-6,r.ground);}
  if(realm===1)for(let i=0;i<9;i++){const x=i*31+4,y=57+(i%3)*27;f(x,y,3,34,'#506d9b');f(x+3,y+5,7,27,'#3d5681');f(x+1,y+2,1,29,'#8aaac6');}
  if(realm===2)for(let i=0;i<7;i++){f(i*39,173+(i%3)*6,24,3,'#b47843');f(i*39+4,176+(i%3)*6,17,2,'#dfb56b');}
  if(realm===5)for(let i=0;i<12;i++){f(i*23,180-(i%3)*9,2,27,'#537d76');f(i*23-3,187-(i%3)*9,8,2,'#9b8f91');}
 }
 if(scene==='dunes'||scene==='oasis'){f(0,18,256,190,'#67434a');for(let n=0;n<3;n++)for(let x=0;x<256;x++){const y=124+n*25+Math.floor(Math.sin(x/(39+n*12)+n)*12);f(x,y,1,208-y,n===0?'#8d5b4b':n===1?'#a77352':'#bb8b60');}if(scene==='oasis'){f(52,190,138,6,'#406d78');for(const x of [42,206]){f(x,121,4,76,'#654d3d');for(let i=0;i<5;i++){f(x-24+i*9,113+Math.abs(2-i)*4,15,4,'#5d7454');}}}}
 if(scene==='mesa'||scene==='sun-canyon'){f(0,150,256,58,r.sky);for(let i=0;i<5;i++){const x=i*58-12,y=85+(i%3)*18;masonry(x,y,32,123);f(x-3,y,38,3,r.ground);}}
 if(scene==='frozen-falls'){for(let i=0;i<4;i++){const x=20+i*66;f(x,61,14,144,'#355378');f(x+2,61,4,144,'#6a93b8');f(x+9,61,2,144,'#afcede');for(let y=72;y<200;y+=18)f(x,y,14,2,'#476b91');}}
 if(scene==='salt-ruins'||scene==='salt-flats'){for(let i=0;i<7;i++){const x=6+i*42,y=120+(i%3)*16;masonry(x,y,13,88);f(x-2,y-3,17,5,'#aaa48a');f(x+2,y+5,2,58,'#baac8c');}if(scene==='salt-ruins')arch(78,89,104,115);}
 if(scene==='sulfur-chimney'){f(0,17,256,223,'#29232d');for(const x of [0,192]){masonry(x,17,64,191);for(let y=32;y<208;y+=16)f(x+28,y,3,9,'#ac7e43');}for(let i=0;i<6;i++)f(78+i*19,186-(i%3)*10,2,12,'#897253');}
 if(scene==='storm-tower'||scene==='sky-bridges'){f(0,17,256,191,'#142634');for(const x of [5,105,216]){masonry(x,44+(x%3)*12,33,164);f(x-3,43+(x%3)*12,39,3,'#667d7e');for(let y=64;y<188;y+=26)f(x+12,y,8,15,'#0f1b29');}f(30,106,86,4,'#485c65');f(138,70,83,4,'#485c65');}
 if(scene==='storm-shrine'){arch(40,93,76,115);arch(154,77,64,131);for(let i=0;i<4;i++)f(55+i*48,64+(i%2)*16,2,17,'#6c8a8c');}
 if(['thorn-garden','ruined-arches','moon-shrine','vine-tower','ruined-roofs'].includes(scene)){
  f(0,95,256,113,r.sky);for(let i=0;i<4;i++){const x=i*77-12;arch(x,scene==='ruined-arches'?88:119,52,115);for(let j=0;j<7;j++){f(x+3,114+j*12,2,9,'#405442');f(x+1,116+j*12,6,2,'#5c6f4e');}}if(scene==='moon-shrine'){masonry(92,144,72,56);f(97,138,62,5,'#b59a85');}if(scene==='vine-tower'){masonry(159,42,55,166);for(let y=50;y<190;y+=10)f(165,y,4,7,'#566b48');}}
 if(scene==='sunken-ship'){f(0,17,256,191,'#123140');for(const x of [22,211]){f(x,28,9,180,'#354f54');f(x+2,28,2,180,'#60786d');}for(let i=0;i<7;i++){f(18,56+i*23,204,3,'#3b5a60');f(31+i*28,55,1,149,'#283f4e');}f(115,58,5,149,'#6c8471');for(let i=0;i<6;i++)f(115,62+i*23,28,2,'#6c8471');}
 if(['tidal-shore','aqueduct','sluice','tidal-well','deep-temple'].includes(scene)){
  if(scene==='tidal-shore'){f(0,151,256,57,'#24475b');for(let y=157;y<205;y+=9)for(let x=0;x<256;x+=33)f(x+(y%2)*9,y,18,1,'#4f7c87');}
  else{for(let i=0;i<4;i++)arch(i*75-14,70+(i%2)*28,58,140);if(scene==='sluice')for(let x=53;x<228;x+=32)f(x,104,4,97,'#345d65');}}
 if(scene==='lantern-market'||scene==='lantern-plaza'){for(let i=0;i<5;i++){const x=i*59-13;f(x,151,45,5,'#6b4d69');for(let j=0;j<5;j++)f(x+j*9,145,8,6,j%2?'#775b72':'#443951');f(x+3,156,2,46,r.back);f(x+38,156,2,46,r.back);f(x+18,165,6,11,'#b09563');}}
 if(scene==='night-roofs'||scene==='lantern-tower'){for(let i=0;i<6;i++){const x=i*49-8,y=84+(i*17)%61;masonry(x,y,39,124);f(x-3,y-3,45,5,'#514461');for(let j=0;j<3;j++)f(x+j*13,y-9,6,7,'#514461');for(let yy=y+18;yy<190;yy+=22)f(x+13,yy,5,7,'#b69665');}}
 if(scene==='red-gorge'||scene==='rope-bridge'){f(0,17,256,191,'#302232');for(const [x,w] of [[0,55],[199,57]]){f(x,53,w,155,'#6e4145');f(x+4,54,w-8,3,'#b27b62');for(let y=68;y<208;y+=16){f(x+4,y,w-10,1,'#472d38');f(x+10,y+3,4,7,'#93594d');}}for(let i=0;i<4;i++){f(70+i*35,120-(i%2)*21,13,88,'#55313e');f(72+i*35,120-(i%2)*21,3,72,'#804a49');}if(scene==='rope-bridge'){for(let x=38;x<222;x++){const y=99+Math.floor(Math.sin((x-38)/184*Math.PI)*17);f(x,y,1,1,'#b88d6a');f(x,y+14,1,2,'#715447');if(x%7===0)f(x,y,1,15,'#8c6c55');}}}
}
