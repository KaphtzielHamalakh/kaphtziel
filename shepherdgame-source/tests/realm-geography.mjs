import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1024,height:768}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/shepherdgame/?test');await page.waitForFunction(()=>window.elah);
// Exercise the actual movement/collision step with repeated full jumps, no acquired powers.
// Invulnerability isolates route geometry from combat; puzzle switches are tested separately.
for(let realm=0;realm<8;realm++)for(const ri of [0,1,3,4,7,9]){
 const result=await page.evaluate(({realm,ri})=>{const g=window.elah;g.startRealm(realm);g.enterRoom(ri);g.setInvincible(100000);g.setWeapon(-1);g.step([],25);
  if(ri===9){g.setPlayer({x:g.get().room.descentX,y:198,vy:0});g.step(['up'],135);}
  let jumping=0,lastX=-1,stuck=0;const startRoom=g.get().roomIndex;
  for(let n=0;n<1400;n++){
   const s=g.get();if(s.roomIndex!==startRoom||s.state!=='stage')return {ok:true,n,p:s.p};
   if(s.p.x>241)return {ok:true,n,p:s.p};
   if(Math.abs(s.p.x-lastX)<.05)stuck++;else stuck=0;lastX=s.p.x;
   const keys=['right'];if(jumping>0){keys.push('jump');jumping--;}
   else if(s.p.ground&&(stuck>1||n%12===0)){jumping=25;keys.push('jump');}
   if(n%14===0)keys.push('fire');g.step(keys,1);
  }
  return {ok:false,p:g.get().p,room:g.get().roomIndex,scene:g.get().room.scene};
 },{realm,ri});assert.ok(result.ok,`Unreachable route r${realm} room${ri}: ${JSON.stringify(result)}`);
}
console.log('All 48 opening/road/gauntlet/shelter/gate/upper routes cross using actual movement and sling, with combat disabled PASS');
for(let realm=0;realm<8;realm++){
 const result=await page.evaluate(realm=>{const g=window.elah;g.startRealm(realm);g.enterRoom(6);g.setInvincible(100000);g.step([],25);const x=g.get().room.ascentX;g.setPlayer({x,y:180,vy:0});g.step(['up'],280);const up=g.get().roomIndex;const downX=g.get().room.descentX;g.setPlayer({x:downX,y:198,vy:0});g.step(['down'],25);const down=g.get();return {up,down:down.roomIndex,x:down.p.x,expected:down.room.ascentX};},realm);
 assert.equal(result.up,9);assert.equal(result.down,6);assert.ok(Math.abs(result.x-result.expected)<2);
}
console.log('All eight different ladder shafts connect up/down reciprocally PASS');
for(let realm=0;realm<8;realm++)for(const ri of [0,1,3,4,7,9]){
 const result=await page.evaluate(({realm,ri})=>{const g=window.elah;g.startRealm(realm);g.enterRoom(ri);g.setInvincible(100000);g.setPlayer({x:ri===7?208:224,y:ri===9?106:180,vy:0});g.step([],25);let jumping=0,last=-1,stuck=0;
  for(let n=0;n<1600;n++){const s=g.get();if(s.roomIndex!==ri||ri!==9&&s.p.x<=1)return {ok:true};
   const goal=ri===9?s.room.descentX:0;if(ri===9&&Math.abs(s.p.x-goal)<6){g.step(['down'],1);continue;}
   const direction=s.p.x>goal?'left':'right';if(Math.abs(s.p.x-last)<.05)stuck++;else stuck=0;last=s.p.x;
   const keys=[direction];if(jumping>0){keys.push('jump');jumping--;}else if(s.p.ground&&(stuck>1||n%12===0)){jumping=25;keys.push('jump');}g.step(keys,1);
  }return {ok:false,p:g.get().p,room:g.get().roomIndex};
 },{realm,ri});assert.ok(result.ok,`Reverse route r${realm} room${ri}: ${JSON.stringify(result)}`);
}
console.log('All 48 redesigned routes also support reverse travel PASS');
const water=await page.evaluate(()=>{const g=window.elah;g.startRealm(5);g.step([],25);g.setPlayer({x:24,y:186,vy:0,ground:true});const dry=g.get().submerged;g.step(['jump'],1);const airJump=g.get().p.vy;g.enterRoom(1);g.step([],25);g.setPlayer({x:24,y:186,vy:0,ground:true});const wet=g.get().submerged;g.step(['jump'],1);return {dry,wet,airJump,waterJump:g.get().p.vy};});assert.equal(water.dry,false);assert.equal(water.wet,true);assert.equal(water.airJump,-4.625);assert.ok(Math.abs(water.waterJump+3.42)<.001);console.log('Jaffa shore uses dry-land physics; submerged hull uses water physics PASS');

for(let realm=0;realm<8;realm++){await page.evaluate(realm=>{window.elah.startRealm(realm);window.elah.enterRoom(1);window.elah.setInvincible(0);},realm);await page.waitForTimeout(350);await page.screenshot({path:`/tmp/elah-geography-${realm}.png`});}
assert.deepEqual(errors,[]);await browser.close();
