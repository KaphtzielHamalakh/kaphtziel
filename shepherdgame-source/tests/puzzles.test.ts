import {describe,it,expect} from 'vitest';
import {makeRoom} from '../src/levels';
import {puzzleHit,puzzleSong,updatePuzzle,realmRoutes,routeMap} from '../src/realmDesign';
const player={x:24,y:186,ground:true};
const object=(r:ReturnType<typeof makeRoom>,id:string)=>r.entities.find(e=>e.id===id)!;
const hit=(r:ReturnType<typeof makeRoom>,id:string,t=0)=>puzzleHit(r,object(r,id),t,1);
const tick=(r:ReturnType<typeof makeRoom>,n=1)=>{for(let i=0;i<n;i++)updatePuzzle(r,{...player},i);};
describe('individual worlds and puzzles',()=>{
 it('has eight distinct non-overlapping stage routes and sixteen puzzle mechanisms',()=>{
  expect(new Set(realmRoutes.map(x=>JSON.stringify(x))).size).toBe(8);
  for(let realm=0;realm<8;realm++){const map=routeMap(realm);expect(new Set(map.map(x=>`${x.x},${x.y}`)).size).toBe(10);expect(new Set(map.map(x=>x.room)).size).toBe(10);}
  expect(new Set(Array.from({length:8},(_,r)=>[2,5].map(i=>makeRoom(r,i).puzzleState!.kind)).flat()).size).toBe(16);
 });
 it('requires both shade bells and both pressure marks',()=>{const r=makeRoom(0,2);hit(r,'shade-west');tick(r);expect(r.puzzleState!.solved).toBe(false);hit(r,'shade-east');tick(r);expect(r.puzzleState!.solved).toBe(true);const w=makeRoom(0,5);object(w,'mark-west').active=true;tick(w);expect(w.puzzleState!.solved).toBe(false);object(w,'mark-east').active=true;tick(w);expect(w.puzzleState!.solved).toBe(true);});
 it('resets crystal order on a wrong hit, then accepts 2-1-3',()=>{const r=makeRoom(1,5);hit(r,'crystal-1');expect(r.puzzleState!.progress).toBe(0);for(const id of ['crystal-2','crystal-1','crystal-3'])hit(r,id);tick(r);expect(r.puzzleState!.solved).toBe(true);});
 it('propagates cap ignition through the barrel into the wall',()=>{const r=makeRoom(2,2);hit(r,'vent-cap');tick(r);expect(object(r,'blast-barrel').active).toBe(true);expect(object(r,'blast-wall').active).toBe(true);expect(r.puzzleState!.solved).toBe(true);});
 it('raises the weighted lift and expires conductor charges',()=>{const r=makeRoom(2,5);object(r,'weight').active=true;tick(r,80);expect(object(r,'weight-lift').y).toBe(128);const c=makeRoom(3,2);hit(c,'stone-a');hit(c,'stone-b');tick(c);expect(c.puzzleState!.solved).toBe(true);tick(c,600);expect(c.puzzleState!.solved).toBe(false);});
 it('requires both songs and the specified wind directions',()=>{const r=makeRoom(4,2);puzzleSong(r,'DLR');tick(r);expect(r.puzzleState!.solved).toBe(false);puzzleSong(r,'RUL');object(r,'harp-seal').active=true;tick(r);expect(r.puzzleState!.solved).toBe(true);const v=makeRoom(4,5);for(let i=0;i<3;i++)hit(v,'west-vane');hit(v,'east-vane');tick(v);expect(v.puzzleState!.solved).toBe(true);});
 it('drains correct sluices and steers a barrel into its dock',()=>{const r=makeRoom(5,2);for(const id of ['valve-1','valve-3','valve-2'])hit(r,id);tick(r);expect(r.waterLine).toBe(188);expect(r.puzzleState!.solved).toBe(true);const b=makeRoom(5,5);for(let i=0;i<7;i++){hit(b,'current-barrel');tick(b,35);}expect(object(b,'barrel-dock').active).toBe(true);});
 it('rejects off-beat drums and dark wards',()=>{const r=makeRoom(6,2);hit(r,'drum-1',16);expect(r.puzzleState!.progress).toBe(0);for(const id of ['drum-1','drum-3','drum-2'])hit(r,id,0);tick(r);expect(r.puzzleState!.solved).toBe(true);const w=makeRoom(6,5);hit(w,'mask-3');expect(object(w,'mask-3').hp).toBe(2);object(w,'escort-lantern').x=184;hit(w,'mask-3');expect(object(w,'mask-3').hp).toBe(1);});
 it('drops and settles the hanging stone, and resets every puzzle on re-entry',()=>{const r=makeRoom(7,5);hit(r,'stone-clasp');tick(r,90);expect(object(r,'hanging-stone').y).toBe(160);expect(object(r,'hanging-stone').active).toBe(true);for(let realm=0;realm<8;realm++)for(const i of [2,5])expect(makeRoom(realm,i).puzzleState!.solved).toBe(false);});
});
