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
 it('uses distinct, reciprocal world maps with safe vertical landings',()=>{
  for(let r=0;r<8;r++)for(let i=0;i<10;i++){const room=makeRoom(r,i);for(const [d,exit] of Object.entries(room.exits??{})){
   const target=makeRoom(r,exit.room),op={left:'right',right:'left',up:'down',down:'up'}[d] as 'left'|'right'|'up'|'down';
   expect(target.exits?.[op]?.room).toBe(i);
   if(d==='up'){expect(room.tiles[0][Math.floor(exit.x/16)]).toBe('H');}
   if(d==='down'){const row=Math.round((exit.y!+22)/16);expect(room.tiles[row][Math.floor(exit.x/16)]).toBe('=');}
  }}
 });
 it('keeps the tutorial and fortress template separate from the realm authoring',()=>{
  expect(prologueRoom(0).scene).toBeUndefined();expect(makeRoom(0,6,false).ascentX).toBeUndefined();
 });
});
