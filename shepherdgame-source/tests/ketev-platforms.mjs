import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});const page=await browser.newPage();await page.goto('http://127.0.0.1:5173/shepherdgame/?test');await page.waitForFunction(()=>window.elah);
for(const rematch of [false,true])for(const side of ['left','right']){
 const result=await page.evaluate(({rematch,side})=>{const g=window.elah;g.startRealm(0);if(rematch)g.setCampaign('rematch');g.enterRoom(8);g.setState('stage');g.setInvincible(100000);g.setWeapon(-1);g.setBoss({frame:1,x:128,y:168,stun:1000});g.step([],25);
  g.setPlayer({x:side==='left'?24:148,y:186,vy:0,vx:0,ground:true,wasMoving:false});g.step(['right','jump'],24);g.step(['jump'],24);const landing=g.get().p;
  if(side==='right')g.step(['left'],1);g.fire();g.step([],20);
  return {landing,hp:g.get().boss.hp};
 },{rematch,side});assert.equal(result.landing.ground,true);assert.equal(result.landing.y+22,176);assert.equal(result.hp,27);console.log(`${rematch?'Rematch':'First battle'} ${side} platform: normal jump, stable landing and sling hit PASS`);
}
await browser.close();
