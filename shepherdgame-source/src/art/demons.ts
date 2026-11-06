import {realms} from '../data/realms';
const cache=new Map<string,HTMLCanvasElement>();
// Original hand-built pixel silhouettes. Small stamps are rasterized once, then reused.
export function demonSprite(index:number,frame=0){const key=index+':'+frame;if(cache.has(key))return cache.get(key)!;const canvas=document.createElement('canvas');canvas.width=64;canvas.height=72;const g=canvas.getContext('2d')!,r=realms[index],ink='#0c1020',a=r.color,b=r.shadow,h=r.light;
 const f=(x:number,y:number,w:number,hh:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,hh);};
 const box=(x:number,y:number,w:number,hh:number,c:string)=>{f(x-1,y-1,w+2,hh+2,ink);f(x,y,w,hh,c);f(x+1,y+1,w-2,1,h);f(x+w-3,y+2,2,hh-3,b);};
 const oval=(x:number,y:number,rx:number,ry:number,c:string)=>{for(let yy=-ry;yy<=ry;yy++){const w=Math.floor(Math.sqrt(1-yy*yy/(ry*ry))*rx);f(x-w,y+yy,w*2+1,1,c);}};
 const eye=(x:number,y:number)=>{f(x-1,y-1,6,5,ink);f(x,y,4,2,h);f(x+1,y,1,2,'#fff0bc');};
 const horn=(x:number,y:number,d:number)=>{for(let i=0;i<9;i++){f(x+Math.floor(i/3)*d,y-i,4,3,ink);f(x+1+Math.floor(i/3)*d,y-i,2,2,h);}};
 const wing=(x:number,y:number,d:number)=>{for(let i=0;i<8;i++){const xx=x+d*i*2,yy=y+i+frame*2;f(xx,yy,5,17-i,ink);f(xx+1,yy+1,3,13-i,i%2?a:b);f(xx+1,yy+2,2,2,h);}};
 if(index===0){for(let n=0;n<12;n++){const aa=n*Math.PI/6+frame*.12,x=Math.round(32+Math.cos(aa)*25),y=Math.round(33+Math.sin(aa)*25);box(x-2,y-2,4,7,n%2?a:h);}oval(32,34,20,21,ink);oval(32,34,18,19,a);oval(30,31,15,16,h);oval(33,35,14,15,a);for(let yy=20;yy<48;yy+=5)f(17,yy,3,2,b);f(21,27,9,3,b);f(35,27,9,3,b);eye(23,31);eye(37,31);f(31,32,2,8,b);f(24,44,17,3,ink);f(26,45,4,2,h);f(37,45,3,2,h);}
 else if(index===5){for(let i=5;i>=0;i--){const x=32+Math.round(Math.sin(i*1.4+frame*.2)*14),y=63-i*6;oval(x,y,13,7,ink);oval(x,y-1,11,5,a);f(x-5,y-3,9,2,h);for(let j=0;j<3;j++)f(x-7+j*6,y+1,2,2,b);}box(18,15,28,20,a);horn(18,19,-1);horn(42,19,1);eye(23,22);eye(37,22);box(15,32,35,10,b);f(19,32,28,2,h);for(let i=0;i<4;i++)f(22+i*6,33,2,4,h);f(30,40,2,8,'#c46a70');f(25,47,7,1,'#c46a70');}
 else {
  if(index===1||index===4){wing(14,26,-1);wing(46,26,1);}
  if(index===6){box(7,54,49,8,b);for(const x of [15,45]){oval(x,65,6,6,ink);oval(x,65,4,4,a);f(x,61,1,9,h);f(x-4,65,9,1,h);}box(8,45,5,10,a);box(51,45,5,10,a);}
  box(23,50,7,13,b);box(35,50,7,13,b);box(20,61,11,5,a);box(35,61,11,5,a);
  if(index===2||index===7){box(13,32,10,18,b);box(43,32,10,18,b);box(11,46,12,8,a);box(43,46,12,8,a);}else{box(16,30,8,18,b);box(42,30,8,18,b);box(15,45,8,6,a);box(43,45,8,6,a);}
  box(23,27,20,28,index===4?b:a);for(let i=0;i<4;i++){f(25,33+i*5,14,1,b);f(25,34+i*5,5,1,h);}box(23,51,20,4,b);f(30,51,5,4,h);
  box(23,11,20,18,index===4?h:a);f(26,14,4,3,h);f(24,26,18,3,b);eye(26,19);eye(36,19);f(31,21,2,5,b);f(29,27,8,1,ink);
  if(index===1){for(let i=0;i<4;i++)box(23+i*5,7-i%2*3,4,6,h);f(29,29,2,11,h);f(35,29,2,8,h);}
  if(index===2){horn(22,14,-1);horn(42,14,1);for(let i=0;i<5;i++){f(23+i*4,36+i%2*5,2,5,h);}box(48,45,12,12,b);f(48,45,12,2,h);f(52,38,2,5,a);}
  if(index===3){horn(23,12,-1);horn(41,12,1);box(53,28,2,34,h);f(47,28,7,2,h);f(47,60,7,2,h);f(47,29,1,31,a);}
  if(index===4){for(let i=0;i<6;i++)f(20+i*4,13,3,4,ink);f(30,24,5,7,a);f(22,8,20,4,b);for(let i=0;i<4;i++)f(18+i*9,36,2,14,h);}
  if(index===6){f(20,8,26,5,b);f(23,12,20,4,a);for(let i=0;i<5;i++)f(22+i*5,29,2,5,h);f(20,33,6,14,b);f(40,33,7,14,b);}
  if(index===7){horn(21,15,-1);horn(43,15,1);box(26,26,14,10,b);f(29,32,8,3,h);for(let i=0;i<5;i++){f(21,38+i*4,24,2,'#b5594e');}f(24,37,2,20,h);}
 }
 cache.set(key,canvas);return canvas;
}
