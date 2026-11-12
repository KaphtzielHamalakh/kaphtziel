import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});const page=await b.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/shepherdgame/?test');await page.waitForFunction(()=>window.elah);
for(let realm=0;realm<8;realm++)for(const ri of [2,5]){
 const result=await page.evaluate(({realm,ri})=>{const g=window.elah;g.startRealm(realm);g.enterRoom(ri);g.setInvincible(100000);g.setWeapon(-1);g.step([],25);
  const get=id=>g.get().entities.find(e=>e.id===id);
  const fire=id=>{const e=get(id);g.setPlayer({x:e.x-40,y:e.y-6,vy:0,ground:false,wasMoving:false});g.step(['right'],1);g.fire();g.step([],18);};
  const forward=g.get().room.forward,blocked=!g.portalTravel(forward)&&g.get().roomIndex===ri;
  if(realm===0&&ri===2){g.setPlayer({x:24,y:186,vy:0,ground:true});g.step(['right'],1);g.fire();g.step([],65);if(!get('shade-east').active)return {bad:'ricochet did not reach the high bell'};fire('shade-west');}
  if(realm===0&&ri===5){g.setPlayer({x:50,y:186,vy:0,ground:true});g.step(['right'],25);if(get('block-west').x<=64)return {bad:'block cannot be pushed'};g.setEntity('block-west',{x:104});g.setEntity('block-east',{x:184});g.setPlayer({x:24,y:186});g.step([],2);}
  if(realm===1&&ri===2)g.playSong('DLR');
  if(realm===1&&ri===5)for(const id of ['crystal-2','crystal-1','crystal-3'])fire(id);
  if(realm===2&&ri===2)fire('vent-cap');
  if(realm===2&&ri===5){g.setEntity('counterweight',{x:112});g.setPlayer({x:156,y:170,vy:0,ground:true});g.step([],75);if(Math.abs(g.get().p.y+22-128)>.5)return {bad:'weighted lift does not carry the player',p:g.get().p,lift:get('weight-lift')};g.step(['right'],1);g.fire();g.step([],20);}
  if(realm===3&&ri===2){fire('stone-a');fire('stone-b');}
  if(realm===3&&ri===5){fire('bridge-charge');g.setPlayer({x:44,y:186,vy:0,ground:true,wasMoving:false});g.step(['right','jump'],24);g.step(['jump'],24);g.step([],1);g.step(['right','jump'],28);g.step(['jump'],16);if(Math.abs(g.get().p.y+22-160)>.5)return {bad:'cannot jump onto the storm bridge',p:g.get().p};g.step([],1);g.step(['jump'],8);g.fire();g.step([],26);}
  if(realm===4&&ri===2){g.setSave({morning:true});g.playSong('RUL');g.playSong('UDU');}
  if(realm===4&&ri===5){for(let i=0;i<3;i++)fire('west-vane');fire('east-vane');}
  if(realm===5&&ri===2)for(const id of ['valve-1','valve-3','valve-2'])fire(id);
  if(realm===5&&ri===5){for(let i=0;i<9&&!g.get().room.puzzle.solved;i++){fire('current-barrel');g.step([],30);}}
  if(realm===6&&ri===2){for(const id of ['drum-1','drum-3','drum-2']){const progress=g.get().room.puzzle.progress;for(let n=0;n<8&&g.get().room.puzzle.progress===progress;n++)fire(id);}}
  if(realm===6&&ri===5){fire('mask-3');if(get('mask-3').hp!==2)return {bad:'dark ward accepted damage'};for(const id of ['mask-1','mask-2','mask-3']){g.setEntity('escort-lantern',{x:get(id).x-24});fire(id);fire(id);}}
  if(realm===7&&ri===2)for(const id of ['post-3','post-1','post-2'])fire(id);
  if(realm===7&&ri===5){fire('stone-clasp');g.step([],75);g.setPlayer({x:124,y:162,vy:0,ground:true,wasMoving:false});g.step(['right','jump'],24);g.step(['jump'],24);if(Math.abs(g.get().p.y+22-160)>.5)return {bad:'cannot jump onto the fallen stone',p:g.get().p};g.step([],1);g.step(['jump'],8);g.fire();g.step([],26);}
  g.step([],2);const state=g.get(),solved=state.room.puzzle.solved;const target=state.room.exits[forward].room;const left=solved&&g.portalTravel(forward)&&g.get().roomIndex===target;
  return {blocked,solved,left,kind:state.room.puzzle.kind,entities:state.entities.filter(e=>['gate','release','bridge-bell','cliff-bell'].includes(e.id)).map(e=>({id:e.id,active:e.active})),progress:state.room.puzzle.progress};
 },{realm,ri});assert.ok(result.blocked&&result.solved&&result.left,`Puzzle ${realm}/${ri}: ${JSON.stringify(result)}`);console.log(`Realm ${realm+1} ${ri===2?'A':'B'} ${result.kind}: locked, solved, exit opened PASS`);
}
assert.deepEqual(errors,[]);await b.close();
