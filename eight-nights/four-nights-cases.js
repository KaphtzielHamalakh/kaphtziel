{
 const ok=(v,m)=>assert.ok(v,m);
 state=fresh();state.mallet=true;mode='play';enter('grove0');const initial=enemies.length;enemies[0].inv=0;hit(enemies[0],10);const killedX=enemies[0].x;enter('town');enter('grove0');assert.equal(enemies.length,initial-1,'one kill survives screen changes');
 const saved=normalize(JSON.parse(JSON.stringify(state)));ok(valid(saved),'temporary encounter validates');state=saved;enter('grove0');assert.equal(enemies.length,initial-1,'temporary kill survives save/reload');
 state.enemyMemory.grove0.until=Date.now()-1;enter('town');enter('grove0');assert.equal(enemies.length,initial,'respawn after three-minute timer expires');
 for(const e of [...enemies]){e.inv=0;hit(e,10);}enter('town');enter('grove0');assert.equal(enemies.length,0,'full overworld clear remembered');
 state=fresh();mode='play';enter('d7');enemies[0].inv=0;hit(enemies[0],2);const splitCount=enemies.filter(e=>e.hp>0).length;enter('d0');enter('d7');assert.equal(enemies.length,splitCount,'split children preserved');
 state=fresh();state.snorkel=false;enter('river0');ok(!walkable(128,88),'river gates without snorkel');state.snorkel=true;ok(walkable(128,88),'snorkel opens river');
 // Walk the intended third-night route, collecting all three keys.
 state=fresh();state.mallet=true;mode='play';enter('m1');enemies=[];p.x=128;p.y=64;interact();assert.equal(state.keys,1);
 mode='play';enter('m3');for(let i=0;i<3;i++){p.x=room.valvePositions[i].x;p.y=80;cooldown=0;interact();}ok(state.solved.includes('m3'),'low/high/low valves');ok(door('e'),'first water key');
 enter('m5');enemies=[];p.x=128;p.y=64;cooldown=0;interact();ok(state.snorkel,'snorkel item');mode='play';enter('m6');p.x=128;p.y=80;updateCampaign();ok(state.solved.includes('m6'),'submerged drain');ok(!underwater(),'drained pool becomes dry');
 enter('m7');enemies=[];p.x=128;p.y=64;cooldown=0;interact();mode='play';enter('m6');ok(door('n'),'second water key');
 enter('m10');p.x=64;p.y=112;updateCampaign();ok(state.solved.includes('m11'),'mirror plate unlocks adjacent room');
 enter('m13');enemies=[];p.x=128;p.y=64;cooldown=0;interact();mode='play';enter('m14');enemies=[];ok(door('n'),'third water key');
 let boss=enemies.find(e=>e.type==='shabriri');ok(boss&&enemies.filter(e=>e.type==='arm').length===4,'Shabriri arms');hit(boss,1);assert.equal(boss.hp,6,'eye protected by arms');
 while(boss.hp>0){for(const arm of enemies.filter(e=>e.type==='arm'&&e.hp>0)){arm.inv=0;hit(arm,2);}boss.inv=0;campaignBossStep(boss,0,0,1);assert.equal(boss.phase,'eye');hit(boss,1);}
 ok(state.flame3&&state.max===8&&mode==='ceremony','third flame without forcing earlier nights');action('KeyZ');assert.equal(room.id,'marsh2');
 // The western mine uses three keys, rail junction, band, boulders and scales.
 mode='play';enter('l1');enemies=[];p.x=128;p.y=64;cooldown=0;interact();mode='play';enter('l3');p.x=128;p.y=88;for(let i=0;i<2;i++){cooldown=0;interact();}ok(state.solved.includes('l3'),'rail junction');ok(door('e'),'first mine key');
 enter('l5');enemies=[];p.x=128;p.y=64;cooldown=0;interact();ok(state.band,'strength band');mode='play';p.x=80;p.y=104;cooldown=0;interact();ok(state.solved.includes('l5'),'heavy boulder');ok(door('w'),'heavy gate');
 for(let i=0;i<3;i++){p.x=64;p.y=120;state.equipped='strength';cooldown=0;item();ok(p.heldRock,'lift rock');p.x=room.plates[i].x;p.y=80;cooldown=0;interact();}ok(state.solved.includes('l6'),'all three plates');
 enter('l7');enemies=[];p.x=128;p.y=64;cooldown=0;interact();mode='play';enter('l6');ok(door('n'),'second mine key');
 enter('l10');p.x=128;p.y=96;for(let i=0;i<3;i++){cooldown=0;interact();}ok(state.solved.includes('l10'),'honest scales');
 enter('l12');p.x=128;p.y=88;cooldown=0;interact();assert.equal(p.y,28,'cart ride');
 enter('l13');enemies=[];p.x=128;p.y=64;cooldown=0;interact();mode='play';enter('l14');enemies=[];ok(door('n'),'third mine key');boss=enemies[0];assert.equal(boss.type,'azazel');
 hit(boss,1);assert.equal(boss.hp,6,'burrow immunity');boss.t=0;campaignBossStep(boss,0,0,1);assert.equal(boss.phase,'surface');
 // Throw a real held boulder, process its collision, then strike during the stun.
 p.x=boss.x;p.y=boss.y+24;p.face='n';p.heldRock=true;cooldown=0;state.equipped='strength';item();p.inv=1000;for(let i=0;i<8;i++)update();assert.equal(boss.phase,'stunned','thrown rock stuns surfaced boss');
 while(boss.hp>2){boss.inv=0;boss.phase='stunned';hit(boss,1);}boss.t=0;campaignBossStep(boss,0,0,1);assert.equal(boss.phase,'cart','Azazel enters rail phase at low health');boss.stun=1;shots.push({type:'boulder',x:boss.x,y:boss.y,dx:0,dy:0,t:30});update();assert.equal(boss.phase,'stunned','rock stops the moving cart');while(boss.hp>0){boss.inv=0;boss.phase='stunned';hit(boss,1);}ok(state.flame4&&state.belial&&state.max===10,'fourth flame and Belial');action('KeyZ');assert.equal(room.id,'hills2');
 state.flame=true;state.flame2=true;state.max=14;state.hp=14;save();ok(valid(JSON.parse(JSON.stringify(state))),'four-night named save validates');
 mode='play';enter('l9');state.hp=1;p.inv=0;hurt(2);action('KeyZ');assert.equal(room.id,'l0','mine continue point');ok(state.flame4&&state.band&&state.snorkel,'death keeps campaign items');
 ok(!valid({...state,enemyMemory:{grove0:{until:123,actors:[{type:'boss',hp:999,x:3,y:3}]}}}),'reject malformed enemy memory');
 assert.equal(Object.values(World.rooms).filter(r=>r.kind==='dungeon'&&r.night===3).length,16);assert.equal(Object.values(World.rooms).filter(r=>r.kind==='dungeon'&&r.night===4).length,16);
 for(const id of Object.keys(World.rooms)){enter(id);draw();}
 console.log('PASS: three-minute individual/split/full-room respawn memory, reload, Snorkel river gate, Nights Three/Four keys/items/puzzles/bosses/flames, Belial, cart, continue, four-night save and render checks');
}
