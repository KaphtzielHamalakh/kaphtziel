import './puzzle-play.mjs';
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});const p=await b.newPage();await p.goto('http://127.0.0.1:5173/shepherdgame/?test');await p.waitForFunction(()=>window.elah);
for(let n=0;n<8;n++){const result=await p.evaluate(n=>{const g=window.elah;g.setSave({mask:255,prologue:true,fortress:1,morning:true});g.startFortress();g.enterRoom(n);g.step([],25);g.setWeapon(n);g.setPlayer({x:184,y:186,ground:true,vy:0});g.fire();g.step([],18);g.advanceRoom();return g.get();},n);assert.ok(result.roomIndex===n+1||n===7&&result.state==='rematches',`Tower ${n}: ${result.notice}`);}console.log('Eight fortress power gates remain functional PASS');await b.close();
