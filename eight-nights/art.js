'use strict';
// Original pixel artwork. Collision and room geometry remain in world.js.
const LETTERS={A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['111','010','010','010','010','010','111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','11001','10101','10011','10011','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','11011','10001'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],'0':['01110','10001','10011','10101','11001','10001','01110'],'1':['010','110','010','010','010','010','111'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11110','00001','00001','01110','00001','00001','11110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','10000','11110','00001','00001','11110'],'6':['01110','10000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00001','01110'],':':['0','1','0','0','1','0','0'],'.':['0','0','0','0','0','1','1'],"'":['1','1','0','0','0','0','0'],'-':['000','000','000','111','000','000','000'],'/':['00001','00001','00010','00100','01000','10000','10000'],'!':['1','1','1','1','1','0','1'],'?':['1110','0001','0010','0100','0100','0000','0100'],'>':['100','010','001','010','100','000','000'],'<':['001','010','100','010','001','000','000'],' ':['000','000','000','000','000','000','000']};
function pixelText(value,x,y,color,size){
 const valueText=String(value).toUpperCase().replace(/[’‘]/g,"'").replace(/—/g,'-');
 if(size<7||Array.from(valueText).some(c=>!LETTERS[c])){ctx.fillStyle=color;ctx.font='bold '+size+'px monospace';ctx.fillText(value,x,y);return;}
 const scale=size>=14?2:1,width=Array.from(valueText).reduce((sum,c)=>sum+(LETTERS[c][0].length+1)*scale,0)-scale;
 let xx=ctx.textAlign==='center'?x-width/2:ctx.textAlign==='right'?x-width:x;
 for(const c of valueText){const glyph=LETTERS[c];for(let row=0;row<7;row++)for(let col=0;col<glyph[row].length;col++)if(glyph[row][col]==='1')rect(xx+col*scale,y-7*scale+row*scale,scale,scale,color);xx+=(glyph[0].length+1)*scale;}
}
function bevel(x,y,w,h,base,light,shade){rect(x,y,w,h,shade);rect(x,y,w-1,h-1,base);rect(x+1,y+1,w-3,1,light);rect(x+1,y+1,1,h-3,light);rect(x+2,y+h-3,w-3,1,shade);rect(x+w-3,y+2,1,h-3,shade);}
function groundShadow(x,y,width=14){rect(x-width/2,y+5,width,3,'#152a2b55');rect(x-width/2+2,y+8,width-4,1,'#152a2b33');}
function drawTile(c,x,y,dungeon,bright,night){
 if(c==='W'&&room.puzzle==='drain'&&state.solved.includes(room.id))c='.';
 const xx=x*16,yy=y*16,teal=night===1||night===3;
 const floor=dungeon?(teal?'#247a7f':'#745044'):room.kind==='flats'?(bright?'#c49a64':'#81725c'):(bright?'#c6bc86':'#7c8e82');
 rect(xx,yy,16,16,floor);
 if(dungeon){rect(xx,yy,16,1,teal?'#14434d':'#3f3437');rect(xx,yy,1,16,teal?'#14434d':'#3f3437');rect(xx+1,yy+1,14,1,teal?'#55a3a2':'#ab7e5b');rect(xx+1,yy+1,1,14,teal?'#55a3a2':'#ab7e5b');rect(xx+14,yy+2,1,13,teal?'#1a5c68':'#543c3b');rect(xx+2,yy+14,13,1,teal?'#1a5c68':'#543c3b');if((x*7+y)%11===0){rect(xx+5,yy+6,3,1,teal?'#31888a':'#895c48');rect(xx+8,yy+7,1,2,teal?'#31888a':'#895c48');}}
 else{const seed=x*13+y*7;for(let i=0;i<3;i++){const dx=(seed+i*7)%14,dy=(seed*3+i*5)%14;rect(xx+dx,yy+dy,1,1,bright?'#aa9e70':'#6b8077');}}
 if(c==='W'){rect(xx,yy,16,16,'#286b87');rect(xx+1,yy+1,14,1,'#6cb8bd');rect(xx+2+(time%60<30?0:2),yy+7,8,1,'#8bc7c4');rect(xx+5,yy+12,7,1,'#3e91a7');return;}
 if(c==='#'){
  if(dungeon){const base=teal?'#2d9297':'#937253',hi=teal?'#70d2ca':'#cfaa77',dark=teal?'#103e55':'#493e3b';bevel(xx,yy,16,16,base,hi,dark);rect(xx+3,yy+3,10,2,hi);rect(xx+3,yy+3,2,10,base);rect(xx+3,yy+12,10,2,dark);rect(xx+12,yy+3,2,11,dark);rect(xx+5,yy+5,7,7,teal?'#287a87':'#806344');}
  else{rect(xx+1,yy+11,15,5,'#253d3855');bevel(xx,yy,16,14,bright?'#6f8a55':'#486962',bright?'#b6c080':'#7a9b82',bright?'#344d3c':'#29434b');for(let i=0;i<3;i++){rect(xx+3+i*4,yy+4+i%2*3,2,4,bright?'#869f63':'#5e7b6b');}}
 }else if(c==='T'){
  groundShadow(xx+9,yy+7,15);rect(xx+7,yy+8,4,8,'#66513a');rect(xx+7,yy+9,1,6,'#aa8c5a');rect(xx+1,yy+2,14,11,bright?'#254f3e':'#24494a');rect(xx+3,yy,10,14,bright?'#367151':'#356663');rect(xx+2,yy+4,12,6,bright?'#438254':'#467a6c');rect(xx+4,yy+2,5,3,bright?'#8cb77b':'#84a18a');rect(xx+3,yy+7,3,2,bright?'#699f63':'#648e7c');rect(xx+11,yy+6,3,6,'#254d43');rect(xx+6,yy+12,6,2,'#23483b');
 }else if(c==='~'){rect(xx,yy,16,16,'#594d32');rect(xx+1,yy+2,14,12,'#927b40');rect(xx+2,yy+3,12,2,'#c7ac59');rect(xx+3+(time%60<30?0:2),yy+9,8,1,'#d8bd65');rect(xx,yy+14,16,2,'#493d2d');}
 else if(c==='O'){rect(xx,yy,16,16,'#0a2536');rect(xx,yy,16,2,'#0b1728');rect(xx,yy,2,16,'#0b1728');rect(xx+2,yy+14,14,1,'#529290');}
 else if(c==='H'){const phase=heatPhase();bevel(xx+1,yy+1,15,15,phase===2?'#a74535':phase===1?'#9c6b42':'#654b40',phase===2?'#ffbd68':'#b18e64','#3b3134');for(let i=0;i<3;i++)rect(xx+4+i*4,yy+5,1,7,phase===2?'#f5a355':phase===1?'#e1a957':'#352e31');}
}
function itemIcon(item,x,y){
 if(item==='mallet'){rect(x-1,y-2,3,14,'#ac7546');bevel(x-7,y-8,15,8,'#b3b8c2','#f0e2be','#596b86');rect(x-5,y-6,4,2,'#fff0d0');}
 else if(item==='shamash'){rect(x-1,y-2,3,11,'#e1c692');rect(x-3,y+9,7,2,'#937748');flame(x,y-1);}
 else if(item==='dreidel'){rect(x-1,y-9,2,4,'#ebc477');bevel(x-5,y-5,11,10,'#668fc1','#b4d8e7','#354a81');rect(x-2,y+5,5,2,'#779ac9');rect(x,y+7,1,2,'#c6b77c');rect(x-1,y-3,3,1,'#f0d897');rect(x+1,y-2,1,4,'#f0d897');}
 else if(item==='bombs'){rect(x-5,y-3,11,9,'#9c4c69');rect(x-3,y-5,7,12,'#d28b8b');rect(x-2,y-3,4,2,'#f7d8bb');rect(x-3,y-7,6,2,'#cbad6a');rect(x+2,y-10,1,3,'#e6c679');}
 else if(item==='strength'){bevel(x-6,y-4,13,11,'#bb8d55','#e5c17e','#634b3d');rect(x-3,y-8,3,6,'#d9b772');rect(x+1,y-8,3,6,'#d9b772');}
 else if(item==='coin'){bevel(x-3,y-5,7,10,'#d3a847','#fff0a0','#806033');rect(x,y-3,1,6,'#f9dc7b');}
 else if(item==='key'){rect(x-3,y-5,6,5,'#c3ccda');rect(x-1,y-4,2,2,'#1e2b41');rect(x-1,y,2,6,'#c3ccda');rect(x+1,y+3,3,2,'#c3ccda');}
}
function drawMiniMap(){
 const ox=8,oy=18;bevel(ox-2,oy-2,65,32,'#172b36','#3f5e69','#0b1521');
 if(room?.kind==='dungeon'){
  const n=nightOf(),mapped=state[n===1?'map':'map'+n],compass=state[n===1?'compass':'compass'+n];
  const rooms=Object.values(World.rooms).filter(r=>r.kind==='dungeon'&&nightOf(r)===n),minY=Math.min(...rooms.map(r=>r.grid[1]));
  for(const r of rooms){if(!mapped&&!state.seen.includes(r.id))continue;const x=ox+12+(r.grid[0]+1)*12,y=oy+2+(r.grid[1]-minY)*3;rect(x,y,8,2,r.id===room.id?'#f1ca7e':'#6f9292');if(compass&&r.boss)rect(x+3,y,2,2,'#ee9c70');}
 }else{
  const positions={town:[5,2],home:[5,2],river0:[4,2]};for(let i=0;i<8;i++)positions['grove'+i]=[6+i%4,i<4?2:1];for(let i=0;i<4;i++){positions['flats'+i]=[6+i,3];positions['marsh'+i]=[5+i,4];positions['hills'+i]=[3-i,2];}
  for(const[id,[x,y]]of Object.entries(positions)){const seen=state.seen.includes(id),active=room?.id===id;rect(ox+x*6,oy+2+y*5,4,4,active?'#eacd87':seen?'#6c9292':'#293e4b');if(active)rect(ox+x*6+1,oy+3+y*5,2,2,'#e9f0c8');}
 }
}
function drawHUD(){
 rect(0,0,256,64,'#080e19');rect(0,62,256,2,'#324a68');text(heroName(),8,10,'#dce0e8',7);drawMiniMap();
 itemIcon('coin',81,20);text(String(state.gelt).padStart(3,'0'),89,23,'#ecdcad',7);
 itemIcon('key',81,35);text(String(state.keys).padStart(2,'0'),89,38,'#d9e0ea',7);
 itemIcon('bombs',81,50);text(String(state.bombs).padStart(2,'0'),89,53,'#e5c5b7',7);
 for(const [label,x,item]of [['B',119,state.equipped],['A',151,state.mallet?'mallet':null]]){text(label,x+8,11,'#c1d4ee',8);bevel(x,15,27,37,'#101c30','#6486d4','#253967');rect(x+3,18,21,31,'#080f1e');if(item)itemIcon(item,x+13,32);}
 text('- LIFE -',185,16,'#e99a87',7);for(let i=0;i<state.max/2;i++)heart(187+(i%5)*12,26+Math.floor(i/5)*10,state.hp>=i*2+2,state.hp===i*2+1);
 text('LIGHT '+flameCount()+'/8',185,54,'#ddc28a',7);text('C:ITEM',119,60,'#819bbd',5);
}
function shadedHippo(x,y,color,face){
 groundShadow(x,y,17);const player=color==='#909fc7';const tunic=player?({blue:'#547dc2',green:'#638a62',gold:'#b58b47'}[state.tunic]||'#547dc2'):'#91816b';
 const walking=player&&[...keys].some(k=>k.startsWith('Arrow')),step=walking?Math.floor(time/9)%2:0;
 rect(x-6,y+4,5,5-step,'#516384');rect(x+2,y+4,5,4+step,'#516384');rect(x-5,y+5,3,2,'#a4b7ce');rect(x+3,y+5,3,2,'#a4b7ce');
 bevel(x-6,y-2,13,9,tunic,'#9bb4d3','#354d70');rect(x-4,y+4,9,1,'#d9b770');rect(x,y+3,2,3,'#f0d596');
 rect(x-6,y-11,4,4,'#7f90b3');rect(x+3,y-11,4,4,'#7f90b3');rect(x-5,y-10,2,2,'#d8c4ce');rect(x+4,y-10,2,2,'#d8c4ce');
 rect(x-5,y-9,11,8,color);rect(x-4,y-9,7,2,'#bdcbe0');rect(x+4,y-7,2,5,'#657b9f');
 if(face!=='n'){rect(x-7,y-3,15,6,'#bdc4d6');rect(x-6,y-3,12,2,'#e0dce1');rect(x-6,y+2,12,1,'#8194b1');rect(x-4,y-7,3,3,'#eef1e6');rect(x+2,y-7,3,3,'#eef1e6');rect(x-3+(face==='w'?-1:0),y-6,1,2,'#182c46');rect(x+3+(face==='e'?1:0),y-6,1,2,'#182c46');rect(x-5,y-1,2,1,'#5e7493');rect(x+4,y-1,2,1,'#5e7493');rect(x-5,y+1,2,2,'#fff4d7');rect(x+4,y+1,2,2,'#fff4d7');}
 else{rect(x-4,y-6,8,4,'#8d9fc2');rect(x-3,y-6,6,1,'#a9bad6');}
 rect(x-3,y-12,7,2,player?tunic:'#b1a083');rect(x-2,y-12,4,1,'#b0c7da');
}
function drawTownSet(){
 groundShadow(49,42,54);bevel(26,21,44,28,'#c5bc96','#ede0b5','#777555');
 for(let y=24;y<46;y+=6){rect(28,y,40,1,'#aaa381');for(let x=30+(y%12?0:6);x<67;x+=12)rect(x,y,1,5,'#a6a080');}
 bevel(22,12,52,17,'#825b4a','#c58c65','#433d3d');for(let y=15;y<27;y+=4){rect(24,y,48,1,'#aa7455');for(let x=25+(y%8?0:4);x<71;x+=8)rect(x,y,1,3,'#5c4540');}
 bevel(30,31,9,9,'#efc579','#fff1ba','#785b42');rect(34,32,1,7,'#836948');rect(31,35,7,1,'#836948');flame(34,34);
 rect(43,31,12,17,'#42454a');rect(45,33,8,15,'#192f3c');rect(44,47,12,2,'#b0b397');
 groundShadow(121,96,24);bevel(109,83,23,17,'#879a93','#cfceb3','#4e686b');rect(113,87,15,8,'#225a70');rect(115,88,10,1,'#80b9bf');rect(118,91,8,1,'#a8d0c8');
 rect(112,76,2,9,'#756649');rect(129,76,2,9,'#756649');bevel(110,73,23,5,'#8e7151','#c6a075','#514d42');
}
function enemyHighlights(e){
 if(e.inv>0&&time%4<2)return;const x=Math.round(e.x),y=Math.round(e.y);
 if(['shabriri','azazel','arm'].includes(e.type))return;
 if(e.type==='slime'||e.type==='split'){rect(x-3,y-4,5,1,'#e0cc91');rect(x-5,y+4,10,1,'#716b44');}
 else if(!['boss','ketev'].includes(e.type)){rect(x-4,y-10,7,2,'#a8be8c');rect(x+4,y-5,2,5,'#516e59');rect(x-5,y+5,4,3,'#4b4941');rect(x+2,y+5,4,3,'#4b4941');rect(x-2,y,5,1,'#d6b47d');if(e.type==='rock'){bevel(x+6,y-2,6,6,'#9caaa7','#d5ceac','#4f6670');}else{rect(x+7,y-3,2,10,'#917148');bevel(x+5,y-6,6,6,'#a4afa5','#e3d3a7','#465f69');}}
}
