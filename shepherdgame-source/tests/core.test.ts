import {describe,it,expect} from 'vitest';
import {motion,C,type Body} from '../src/config';
import {encode,decode} from '../src/engine/save';
import {realms} from '../src/data/realms';
import {makeRoom} from '../src/levels';
const body=():Body=>({x:0,y:0,vx:0,vy:0,ground:true,wasMoving:false,slide:0,climbing:false});
describe('specified movement',()=>{
 it('moves one pixel on the first frame, then 1.375',()=>{const p=body();motion(p,1,false,false,false);expect(p.vx).toBe(1);motion(p,1,false,false,false);expect(p.vx).toBe(1.375);motion(p,0,false,false,false);expect(p.vx).toBe(0);motion(p,-1,false,false,false);expect(p.vx).toBe(-1);});
 it('launches with -4.875 and applies .25 gravity per frame',()=>{const p=body();motion(p,0,true,true,false);expect(p.vy).toBe(C.jump+C.gravity);expect(p.ground).toBe(false);});
 it('cuts rising velocity on release and clamps terminal speed',()=>{const p=body();p.vy=-3;motion(p,0,false,false,false);expect(p.vy).toBe(.25);p.vy=6.99;motion(p,0,false,false,false);expect(p.vy).toBe(7);});
 it('slides 26 frames and prevents jumping under a ceiling',()=>{const p=body();motion(p,1,false,true,true);expect(p.slide).toBe(26);expect(p.vx).toBe(2.5);motion(p,1,true,true,false,true);expect(p.slide).toBe(25);expect(p.vy).toBeGreaterThan(0);for(let i=0;i<25;i++)motion(p,1,false,false,false);expect(p.slide).toBe(0);});
 it('uses specified underwater gravity and terminal velocity',()=>{const p=body();motion(p,0,true,true,false,false,true);expect(p.vy).toBeCloseTo(-3.42);p.vy=1.99;motion(p,0,false,false,false,false,true);expect(p.vy).toBe(2);});
});
describe('password',()=>{it('round trips all 2560 valid states',()=>{for(let mask=0;mask<256;mask++)for(let oil=0;oil<5;oil++)for(const morning of [false,true]){const v={mask,oil,morning};const d=decode(encode(v));expect(d).not.toBeNull();expect(d).toMatchObject(v);}});it('rejects altered cells and invalid digits',()=>{const p=encode({mask:149,oil:3,morning:true});for(let i=0;i<36;i++){const a=[...p];a[i]=(a[i]+1)%6;expect(decode(a)).toBeNull();}expect(decode([])).toBeNull();expect(decode(Array(36).fill(7))).toBeNull();});});
describe('campaign data',()=>{it('gives each demon exactly one distinct weakness',()=>{expect(realms.map(r=>r.weak)).toEqual([6,0,1,7,5,3,4,2]);});it('has reset bells and links in both puzzle rooms of every realm',()=>{for(let r=0;r<8;r++)for(const i of [2,5]){const room=makeRoom(r,i);expect(room.entities.some(e=>e.type==='reset')).toBe(true);expect(room.entities.filter(e=>e.requires).every(e=>[...(e.requires?.all||[]),...(e.requires?.any||[])].every(id=>room.entities.some(o=>o.id===id)))).toBe(true);}});});
