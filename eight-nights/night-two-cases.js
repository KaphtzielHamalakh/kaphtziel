{
 const ok=(v,message)=>assert.ok(v,message);
 // Old Night One JSON saves migrate without discarding earned items.
 const old=fresh();delete old.flame2;delete old.bombBag;delete old.bombs;delete old.map2;delete old.compass2;old.flame=true;old.max=8;old.hp=8;
 ok(valid(old),'old save remains valid');state=normalize(old);ok(state.flame&&!state.flame2&&state.bombs===0,'migration defaults');
 ok(!valid({...state,bombs:9}),'reject excess bombs');ok(!valid({...state,flame2:'yes'}),'reject malformed progress');
 state=fresh();state.mallet=true;mode='play';enter('f1');enemies=[];p.x=80;p.y=80;interact();ok(state.keys===1,'furnace first key');
 mode='play';enter('f3');ok(door('e'),'open guard door');ok(state.keys===0,'first key consumed');enemies=[];p.x=128;p.y=64;interact();ok(state.bombBag&&state.bombs===8&&state.equipped==='bombs','bomb bag acquired');
 mode='play';enter('f5');ok(!door('w'),'cracked flue sealed');ok(door('s'),'can retreat without bombs');enter('f5');p.x=48;p.y=88;cooldown=0;item();ok(state.bombs===7&&bombs.length===1,'placement costs one bomb');p.x=128;p.y=136;for(let i=0;i<90;i++)update();ok(state.solved.includes('f5'),'fuse opens cracked flue');ok(door('w'),'cracked flue passable');
 // Oven sequence resets after a mistake, and gates only the north exit.
 p.x=128;p.y=64;interact();ok(leverProgress===0,'wrong first oven resets');for(const i of [0,2,1]){p.x=room.levers[i].x;p.y=64;interact();}ok(state.solved.includes('f6'),'oven sequence');
 enter('f7');enemies=[];p.x=128;p.y=64;interact();ok(state.keys===1,'second key');mode='play';enter('f6');ok(door('n'),'second key door');ok(state.keys===0,'second key consumed');
 enter('f10');ok(!door('n'),'statue blocks north');explode({x:64,y:64});ok(!state.solved.includes('f10'),'wrong statue does nothing');explode({x:128,y:64});ok(state.solved.includes('f10'),'hollow statue reveals exit');
 // Empty-bag recovery prevents bomb puzzles and the boss from becoming impossible.
 enter('f4');enemies=[];state.bombs=0;p.x=128;p.y=64;interact();ok(state.bombs===8,'supply chest refills empty bag');mode='play';
 // Telegraph, bouncing roll, exposed eye and exactly three bomb hits.
 enter('f13');let e=enemies[0];p.inv=1000;e.t=0;update();ok(e.phase==='roll','rolling boss starts after tell');e.x=229;e.vx=2;update();ok(e.vx<0,'rolling boss bounces');e.t=0;update();ok(e.phase==='eye'&&shots.some(s=>s.type==='fire'),'eye exposes with fire cone');
 e.inv=0;hit(e,2);ok(e.hp===6,'hammer cannot hurt eye');e.phase='roll';explode({x:e.x,y:e.y});ok(e.hp===6,'rolling boss resists bombs');
 for(let i=0;i<3;i++){e.inv=0;e.phase='eye';explode({x:e.x,y:e.y});}ok(state.flame2&&!state.flame&&state.max===8&&mode==='ceremony','second night works before first night');action('KeyZ');ok(room.id==='flats2','return to furnace region');
 mode='play';enter('d11');e=enemies[0];e.phase='rest';for(let i=0;i<6;i++){e.inv=0;hit(e,1);}ok(state.flame&&state.flame2&&state.max===10,'both nights in reverse order');
 mode='play';enter('f9');state.hp=1;p.inv=0;hurt(2);action('KeyZ');ok(room.id==='f0'&&state.hp===10&&state.flame2,'furnace death checkpoint');
 // Heat has a warning phase before damage and respects invulnerability.
 enter('f3');p.x=80;p.y=64;p.inv=0;state.hp=10;time=90;update();ok(state.hp===10,'warning heat is safe');time=125;update();ok(state.hp===9,'hot griddle damages');update();ok(state.hp===9,'heat respects damage grace');
 for(const id of Object.keys(World.rooms)){enter(id);draw();}
 console.log('PASS: Night Two keys, bombs/fuses/refills, oven order, cracked and statue gates, boss phases/immunities, both campaign orders, heat and save migration');
}
