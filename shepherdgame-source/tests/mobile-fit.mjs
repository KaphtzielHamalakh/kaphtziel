import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});const context=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5173/shepherdgame/?test');await p.waitForFunction(()=>window.elah);
for(const [width,height] of [[390,844],[360,740],[320,568],[844,390],[667,375],[568,320]]){
 await p.setViewportSize({width,height});await p.waitForTimeout(150);
 const rect=await p.locator('canvas').boundingBox();assert.ok(rect.x>=-.5&&rect.y>=-.5);assert.ok(rect.x+rect.width<=width+.5);assert.ok(rect.y+rect.height<=height+.5);assert.ok(Math.abs(rect.width/rect.height-256/240)<.001);
 if(height>width)assert.ok(rect.width>=width*.98,`Portrait game too narrow at ${width}x${height}: ${rect.width}`);else assert.ok(rect.height>=height*.98,`Landscape game too short at ${width}x${height}: ${rect.height}`);
 for(const selector of ['#pad','[data-key=jump]','[data-key=fire]','[data-key=lyre]','[data-key=pause]']){const r=await p.locator(selector).boundingBox();assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=width+.5&&r.y+r.height<=height+.5,`${selector} outside ${width}x${height}`);}
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 console.log(`${width}x${height}: game ${rect.width.toFixed(1)}x${rect.height.toFixed(1)}, controls in bounds PASS`);
 if(width===390||width===844)await p.screenshot({path:`/tmp/elah-large-mobile-${width}.png`});
}
// Tap targets must still correspond to the fractional-size canvas after rotation.
await p.setViewportSize({width:390,height:844});await p.waitForTimeout(150);const r=await p.locator('canvas').boundingBox();await p.touchscreen.tap(r.x+r.width*.5,r.y+r.height*145/240);await p.waitForTimeout(80);assert.equal(await p.evaluate(()=>window.elah.get().state),'slots');
const desktop=await b.newPage({viewport:{width:1024,height:768}});await desktop.goto('http://127.0.0.1:5173/shepherdgame/');const dr=await desktop.locator('canvas').boundingBox();assert.equal(dr.width,768);assert.equal(dr.height,720);assert.deepEqual(errors,[]);console.log('Scaled menu taps and desktop integer scaling PASS');await b.close();
