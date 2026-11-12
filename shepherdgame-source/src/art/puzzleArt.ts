import type {Entity,Room} from '../levels';
import {text} from './font';
export function drawPuzzleObject(ctx:CanvasRenderingContext2D,e:Entity,room:Room,clock:number):boolean{
 const types=['latchBell','crystal','valve','drum','support','cap','barrel','counterlift','conductor','timedbridge','vane','floatbarrel','dock','lanterncart','ward','anchor','fallingStone','songstone'];
 if(!types.includes(e.type))return false;if(e.hp<=0)return true;
 const x=Math.floor(e.x),y=Math.floor(e.y),gold='#edcf83',ink='#121725',lit=e.active?gold:'#9aa7b4';
 const f=(xx:number,yy:number,w:number,h:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(Math.floor(xx),Math.floor(yy),w,h);};
 const box=(xx:number,yy:number,w:number,h:number,color:string)=>{f(xx-1,yy-1,w+2,h+2,ink);f(xx,yy,w,h,color);f(xx+1,yy+1,w-2,1,gold);};
 if(e.type==='latchBell'){box(x+2,y+4,10,8,lit);box(x+4,y,6,5,lit);f(x+6,y+12,3,3,gold);}
 if(e.type==='crystal'){for(let i=0;i<10;i++)f(x+5-Math.floor(Math.min(i,9-i)/2),y+4+i,2+Math.floor(Math.min(i,9-i)/2)*2,1,lit);text(ctx,String(e.value),x+4,y-9,gold);}
 if(e.type==='valve'){box(x+2,y+5,12,12,lit);f(x+7,y+2,2,18,gold);f(x-1,y+10,20,2,gold);text(ctx,String(e.value),x+5,y-9,gold);}
 if(e.type==='drum'){box(x,y+4,16,14,e.active?gold:'#86687c');f(x,y+4,16,3,lit);f(x+2,y+16,12,2,gold);text(ctx,String(e.value),x+5,y-7,gold);if(clock%30<11||clock%30>=26)f(x+3,y-13,10,3,gold);}
 if(e.type==='support'){box(x+4,y,5,24,e.active?gold:'#b17a61');f(x-1,y+4,16,2,'#be665f');text(ctx,String(e.value),x+3,y-9,gold);}
 if(e.type==='conductor'){box(x+1,y,14,24,e.active?'#6edbda':'#536b80');for(let i=0;i<4;i++)f(x+5+(i%2)*4,y+4+i*4,4,2,lit);if(e.active)text(ctx,String(Math.ceil(e.timer/60)),x+4,y-10,gold);}
 if(e.type==='vane'){box(x+6,y+10,3,14,'#82675b');text(ctx,['U','R','D','L'][e.value??0],x+4,y,lit,2);text(ctx,['U','R','D','L'][e.target??0],x+5,y+27,gold);}
 if((['barrel','floatbarrel'].includes(e.type))&&(!e.active||e.type==='floatbarrel')){box(x,y+2,e.w,e.h-3,'#a67d52');f(x,y+6,e.w,2,'#d6bb87');f(x,y+e.h-6,e.w,2,'#d6bb87');f(x+6,y+4,1,e.h-8,'#644e40');}
 if(e.type==='cap'){box(x,y+7,16,10,lit);f(x+5,y,7,8,'#c58b57');text(ctx,'X',x+6,y+8,ink);}
 if(e.type==='dock'){f(x,y+e.h-2,e.w,2,lit);f(x,y,2,e.h,lit);f(x+e.w-2,y,2,e.h,lit);text(ctx,'O',x+9,y+7,lit);}
 if(e.type==='lanterncart'){f(x-34,y-45,92,65,'#eed29b16');box(x,y+12,e.w,8,'#9e7b56');box(x+9,y-28,8,13,gold);f(x+12,y-15,2,27,'#b99561');box(x+2,y+22,4,3,lit);box(x+e.w-6,y+22,4,3,lit);}
 if(e.type==='ward'){const lamp=room.entities.find(o=>o.type==='lanterncart'),bright=lamp&&Math.abs(lamp.x+12-(x+8))<=60;box(x,y,16,20,bright?'#b4a1c4':'#44394f');f(x+3,y+5,3,3,bright?gold:ink);f(x+10,y+5,3,3,bright?gold:ink);f(x+6,y+12,5,2,ink);}
 if(e.type==='songstone'){box(x,y,16,30,e.active?'#c5b98d':'#756586');text(ctx,'H',x+5,y+8,gold);}
 if(e.type==='counterlift'||e.type==='timedbridge'&&e.active){box(x,y,e.w,5,'#6f8e98');for(let i=0;i<e.w;i+=8)f(x+i,y+2,6,1,gold);if(e.type==='counterlift')f(x+e.w/2,y-40,1,39,'#806a59');}
 if(e.type==='anchor'){box(x,y,16,12,lit);text(ctx,'X',x+5,y+3,ink);}
 if(e.type==='fallingStone'){box(x,y,e.w,e.h,'#ad775f');for(let yy=8;yy<e.h;yy+=9)f(x+3,y+yy,e.w-6,1,'#603e42');}
 return true;
}
