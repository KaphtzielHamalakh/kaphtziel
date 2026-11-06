import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});const p=await b.newPage();await p.goto('http://localhost:5173/shepherdgame/?test');await p.waitForFunction(()=>window.elah);
// Aim from physically reachable positions: floor, jump, and first 32px ledge.
for(let realm=0;realm<8;realm++)for(const ri of [2,5]){
const result=await p.evaluate(({realm,ri})=>{const g=window.elah;g.startRealm(realm);g.enterRoom(ri);g.step([],30);g.setWeapon(-1);
 const e=g.get().entities.find(e=>e.id==='bell');
 if(realm%4===0&&ri===2){g.setPlayer({x:75,y:186,vy:0,ground:true});g.fire();g.step([],55);}else{g.setPlayer({x:e.x-55,y:e.y-8,vy:0,ground:false});g.fire();g.step([],30);}
 const first=g.get().entities.find(e=>e.id==='gate')?.active;
 // Song of Opening's base-kit branch and the animal calming branch are separate.
 g.playSong('UDU');g.playSong('DLR');
 return {gate:first,entities:g.get().entities.map(e=>({id:e.id,type:e.type,active:e.active})),state:g.get().state};},{realm,ri});assert.ok(result.gate,`Realm ${realm}, room ${ri}: ${JSON.stringify(result)}`);
}
console.log('All 16 main-path puzzle gates respond to sling-only solutions PASS');
// Every fortress obstacle responds to its required power without depending on another slot.
for(let n=0;n<8;n++){
 const result=await p.evaluate(n=>{const g=window.elah;g.setSave({mask:255,prologue:true,fortress:1,morning:true});g.startFortress();g.enterRoom(n);g.step([],25);g.setWeapon(n);g.setPlayer({x:184,y:186,ground:true,vy:0});g.fire();g.step([],18);g.advanceRoom();return g.get();},n);
 assert.ok(result.roomIndex===n+1||n===7&&result.state==='rematches',`Tower ${n}: ${result.notice}`);
}
console.log('Eight power tower interactions PASS');await b.close();
