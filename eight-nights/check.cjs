const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000/eight-nights/');
 await page.locator('.slot-play').first().click();await page.locator('#hero-name').fill('MIRIAM');await page.locator('#name-done').click();await page.keyboard.press('z');await page.keyboard.press('z');await page.keyboard.press('z');
 assert.equal(await page.evaluate(()=>mode),'play');
 await page.evaluate(()=>{p.x=64;p.y=88;attack();});
 assert.equal(await page.evaluate(()=>state.mallet),true);
 await page.evaluate(()=>{dialogue=[];mode='play';enter('grove0',32,88);});
 const x=await page.evaluate(()=>p.x);await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');assert.ok(await page.evaluate(()=>p.x)>x);
 const results=await page.evaluate(()=>{
 const ok=(value,msg)=>{if(!value)throw Error(msg);};
 // BFS over player-sized collision samples verifies every doorway and chest is reachable.
 for(const r of Object.values(World.rooms)){room=r;state.solved=Object.keys(World.rooms);const pass=(x,y)=>walkable(x,y);const points=[];for(const d of Object.keys(r.exits))points.push(d==='n'?[128,12]:d==='s'?[128,164]:d==='w'?[12,88]:[244,88]);if(r.chest)points.push([r.chest.x,r.chest.y+16]);if(points.length>1){const queue=[points[0]],seen=new Set();while(queue.length){const [x,y]=queue.shift(),key=x+','+y;if(seen.has(key)||!pass(x,y))continue;seen.add(key);for(const [dx,dy]of [[4,0],[-4,0],[0,4],[0,-4]]){const nx=x+dx,ny=y+dy;if(nx>=8&&nx<=248&&ny>=8&&ny<=168&&!seen.has(nx+','+ny))queue.push([nx,ny]);}}for(const[x,y]of points)ok(seen.has(x+','+y),r.id+' unreachable '+x+','+y);}}
 state=fresh();state.mallet=true;mode='play';enter('d1');enemies=[];p.x=80;p.y=80;interact();ok(state.keys===1,'first key');mode='play';enter('d3');p.x=80;p.y=80;move(1.25,0);move(1.25,0);move(1.25,0);move(1.25,0);ok(state.solved.includes('d3'),'block puzzle');
 enter('d4');ok(door('n'),'key door');ok(state.keys===0,'key spent');ok(state.doors.length===1,'door persisted');
 enemies=[];p.x=128;p.y=64;interact();ok(state.dreidel,'dreidel chest');mode='play';enter('d6');state.equipped='dreidel';p.x=128;p.y=80;p.face='n';cooldown=0;item();for(let i=0;i<25;i++)update();ok(state.solved.includes('d6'),'ranged switch');
 enter('d7');enemies=[];p.x=128;p.y=64;interact();ok(state.keys===1,'second key');mode='play';enter('d6');ok(door('n'),'second locked door');
 enter('d11');let boss=enemies[0];boss.t=0;update();ok(boss.phase==='lunge','boss telegraph');for(let i=0;i<170;i++){p.inv=100;update();}ok(boss.lunges>=3,'three lunges');boss.phase='tell';hit(boss,1);ok(boss.hp===6,'armored tell');boss.phase='rest';for(let i=0;i<6;i++){boss.inv=0;hit(boss,1);}ok(state.flame&&state.max===8&&mode==='ceremony','first flame');action('KeyZ');ok(room.id==='grove1','return after flame');mode='play';enter('d9');state.hp=1;p.inv=0;hurt(2);ok(mode==='dead','death');action('KeyZ');ok(room.id==='d0'&&state.flame&&state.dreidel,'continue preserves progress');save();ok(valid(JSON.parse(localStorage.getItem(SAVE))),'save validation');ok(!valid({...state,max:100}),'reject invalid save');return 'Traversal, both keys, block, Dreidel, boss, flame, death and saves passed';
 });
 console.log(results);assert.deepEqual(errors,[]);await page.evaluate(()=>{state.name='MIRIAM';save();});
 await page.screenshot({path:__dirname+'/desktop.png'});
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await mobile.goto('http://127.0.0.1:8000/eight-nights/');await mobile.locator('.slot-play').first().tap();await mobile.locator('#name-keys button').filter({hasText:/^A$/}).tap();await mobile.tap('#name-done');await mobile.tap('[data-key="KeyZ"]');await mobile.tap('[data-key="KeyZ"]');await mobile.tap('[data-key="KeyZ"]');assert.equal(await mobile.evaluate(()=>mode),'play');assert.ok(await mobile.locator('.touch').isVisible());const controls=await mobile.locator('.touch').boundingBox();assert.ok(controls.y+controls.height<=844,'controls stay inside visible portrait viewport');await mobile.setViewportSize({width:844,height:390});await mobile.waitForTimeout(100);const landscape=await mobile.locator('.touch').boundingBox();assert.ok(landscape.y+landscape.height<=390,'controls stay inside landscape viewport');assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.screenshot({path:__dirname+'/mobile.png',fullPage:true});
 await page.reload();await page.locator('.slot-play').first().click();assert.equal(await page.evaluate(()=>state.flame),true);assert.equal(await page.evaluate(()=>state.dreidel),true);assert.equal(await page.evaluate(()=>state.name),'MIRIAM');await page.click('#files');await page.locator('.slot-play').nth(1).click();await page.fill('#hero-name','AVI');await page.click('#name-done');assert.equal(await page.evaluate(()=>state.gelt),0);assert.equal(await page.evaluate(()=>state.flame),false);console.log('Desktop, touch, reload persistence, no page errors: passed');await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
