import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});const page=await b.newPage({viewport:{width:1024,height:768}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/shepherdgame/?test');await page.waitForFunction(()=>window.elah);
// Controlled puzzle fixtures isolate every directional screen connection. Puzzle solving has its own suite.
let checked=0;
for(let realm=0;realm<8;realm++)for(let room=0;room<10;room++){
 const results=await page.evaluate(({realm,room})=>{const g=window.elah;g.startRealm(realm);g.enterRoom(room);g.setInvincible(100000);if(room===8)return [];
  const exits=g.get().room.exits;return Object.entries(exits).map(([direction,exit])=>({direction,target:exit.room,x:exit.x,y:exit.y}));
 },{realm,room});
 for(const exit of results){const r=await page.evaluate(({realm,room,exit})=>{const g=window.elah;g.startRealm(realm);g.enterRoom(room);g.setInvincible(100000);g.step([],25);
   for(const e of g.get().entities){if(e.id!=='gate')g.setEntity(e.id,{active:true,timer:100000,...(e.type==='ward'?{hp:0}:{})});}
   for(const [block,x] of [['block-west',104],['block-east',184],['counterweight',112]])g.setEntity(block,{x});
   g.step([],2);const x=exit.direction==='left'?0:exit.direction==='right'?242:exit.x;
   const y=exit.direction==='up'?18:exit.direction==='down'?exit.y:room===9&&exit.direction==='right'?106:186;g.setPlayer({x,y,vy:0,ground:false});g.step([exit.direction],1);
   return {room:g.get().roomIndex,state:g.get().state,p:g.get().p};
  },{realm,room,exit});assert.equal(r.room,exit.target,`Realm ${realm} room ${room} ${exit.direction}: ${JSON.stringify(r)}`);checked++;}
}
console.log(`${checked} directional screen connections, including return paths, PASS`);
// Walk/jump through the existing main-run terrain; climbing is used for vertical exits.
for(let realm=0;realm<8;realm++)for(const room of [0,1,3,4,6,7,9]){
 const result=await page.evaluate(({realm,room})=>{const g=window.elah;g.startRealm(realm);g.enterRoom(room);g.setInvincible(100000);g.step([],25);let jump=0,last=-100,stuck=0,wasJump=false;
  for(let n=0;n<1800;n++){
   const s=g.get();if(s.roomIndex!==room||s.state!=='stage')return {ok:true};
   const d=s.room.forward,portal=s.room.exits[d];if(!portal)return {ok:true};
   const target=d==='left'?0:d==='right'?244:portal.x;
   if((d==='up'||d==='down')&&Math.abs(s.p.x-target)<1){g.step(d==='down'&&s.p.ground&&s.p.y<portal.y-2?['down','jump']:[d],1);continue;}
   const keys=[s.p.x>target?'left':'right'];if(Math.abs(s.p.x-last)<.1)stuck++;else stuck=0;last=s.p.x;
   if(jump>0){keys.push('jump');jump--;}else if(wasJump){/* release between deliberate jumps */}else if(s.p.ground&&(stuck>2||n%12===0)){keys.push('jump');jump=25;}
   wasJump=keys.includes('jump');g.step(keys,1);
  }return {ok:false,p:g.get().p,forward:g.get().room.forward};
 },{realm,room});assert.ok(result.ok,`Realm ${realm} room ${room}: ${JSON.stringify(result)}`);
}
console.log('56 non-puzzle rooms reach their differently oriented forward exits using actual movement, with damage disabled PASS');
for(let realm=0;realm<8;realm++){await page.evaluate(realm=>{window.elah.startRealm(realm);window.elah.enterRoom(2);window.elah.setInvincible(0);},realm);await page.waitForTimeout(350);await page.screenshot({path:`/tmp/elah-puzzle-${realm}.png`});}
assert.deepEqual(errors,[]);await b.close();
