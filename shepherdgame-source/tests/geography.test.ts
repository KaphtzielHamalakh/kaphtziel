import {describe,it,expect} from 'vitest';
import {makeRoom,prologueRoom} from '../src/levels';
import {geography} from '../src/geography';
describe('distinct, connected realm geography',()=>{
 it('gives every world a distinct terrain layout for opening, road, gauntlet and upper screen',()=>{
  for(const room of [0,1,3,9])expect(new Set(geography.map((_,r)=>makeRoom(r,room).tiles.join(''))).size).toBe(8);
 });
 it('uses local ice, water depth, shade, storm platforms and canyon bridges',()=>{
  expect(makeRoom(1,0).tiles.some(row=>row.includes('I'))).toBe(true);
  expect(makeRoom(5,0).waterLine).toBeGreaterThan(makeRoom(5,1).waterLine!);
  expect(makeRoom(0,0).entities.some(e=>e.type==='shade')).toBe(true);
  expect(makeRoom(3,1).tiles.some(row=>row.includes('='))).toBe(true);
  expect(makeRoom(7,1).entities.some(e=>e.type==='crumbling')).toBe(true);
 });
 it('provides reciprocal clear ladder shafts with exits at different positions',()=>{
  expect(new Set(geography.map(p=>p.climb)).size).toBe(8);
  for(let r=0;r<8;r++){
   const lower=makeRoom(r,6),upper=makeRoom(r,9);
   const up=Math.floor(lower.ascentX!/16),down=Math.floor(upper.descentX!/16);
   expect(lower.tiles[0][up]).toBe('H');expect(lower.tiles[12][up]).toBe('H');
   expect(upper.tiles[14][down]).toBe('H');expect(upper.tiles[2][down]).toBe('H');
   expect(upper.tiles[8][14]).toMatch(/[#I]/);
  }
 });
 it('keeps the tutorial and fortress template separate from the realm authoring',()=>{
  expect(prologueRoom(0).scene).toBeUndefined();expect(makeRoom(0,6,false).ascentX).toBeUndefined();
 });
});
