import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
// The loopback server intentionally exposes only the generated game directory.
// Map the deployed /shepherdgame/ prefix onto that directory for this local check.
await p.route('**/shepherdgame/**',r=>r.continue({url:r.request().url().replace('/shepherdgame/','/')}));
await p.goto('http://127.0.0.1:4173/shepherdgame/?test');await p.waitForFunction(()=>window.elah);await p.keyboard.press('Enter');await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>window.elah.get().state),'slots');assert.deepEqual(errors,[]);console.log('Generated static production game loads with correct asset paths and menus PASS');await b.close();
