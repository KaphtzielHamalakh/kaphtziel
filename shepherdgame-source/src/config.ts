export const C={width:256,height:240,hz:60,walk:1.375,inch:1,jump:-4.875,gravity:.25,terminal:7,slide:2.5,slideFrames:26,climb:.75,widthPlayer:14,heightPlayer:22,slideHeight:12,health:28,lives:3,knockSpeed:1,knockFrames:16,invincible:90,pelletSpeed:4,pelletCap:3,lyreNotes:[293.66,349.23,440,587.33]};
export type Body={x:number,y:number,vx:number,vy:number,ground:boolean,wasMoving:boolean,slide:number,climbing:boolean};
export function motion(p:Body,dir:number,jumpHeld:boolean,jumpPressed:boolean,down:boolean,underCeiling=false,water=false){
 if(p.slide>0){p.slide--;p.vx=C.slide*(p.vx<0?-1:1);if(jumpPressed&&!underCeiling){p.slide=0;p.vy=water?-3.5:C.jump;p.ground=false;}}
 else if(down&&jumpPressed&&p.ground){p.slide=C.slideFrames;p.vx=C.slide*(dir||Math.sign(p.vx)||1);}
 else {p.vx=dir*(p.wasMoving?C.walk:C.inch);if(jumpPressed&&p.ground){p.vy=water?-3.5:C.jump;p.ground=false;}}
 p.wasMoving=dir!==0;
 if(!jumpHeld&&p.vy<0)p.vy=0;
 p.vy=Math.min(p.vy+(water?.08:C.gravity),water?2:C.terminal);
 return p;
}
