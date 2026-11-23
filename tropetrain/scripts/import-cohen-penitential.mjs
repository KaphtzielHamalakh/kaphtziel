import{readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';import assert from'node:assert/strict';import{validateSourceSmallNote}from'../source-small-note.js';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root)),record=JSON.parse(await read('docs/COHEN-PENITENTIAL-SCORE.json')),verse=JSON.parse(await read('data/torah/gen.json')).chapters[21].verses[0],bars=Array(13).fill(0),ids=new Set();
assert.equal(record.id,'cohen-1902-gen22-penitential');assert.equal(record.words.length,13);assert.equal(record.notes.length,50);
for(const[i,w]of record.words.entries()){
 assert.equal(w.id,verse.tokens[i].id);assert.equal(w.sourceHebrew,verse.tokens[i].sourceHebrew);assert.equal(w.lengths.reduce((a,b)=>a+b,0),(w.sourceHebrew.match(/[א-ת]/gu)??[]).length);
 for(const n of w.notes){assert(!ids.has(n.id));ids.add(n.id);assert.equal(n.wordId,w.id);assert(Number.isInteger(n.syllableIndex)&&n.syllableIndex>=0&&n.syllableIndex<w.lengths.length);const p=n.pitch,r=n.rhythm;assert.equal(12*(p.octave+1)+{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[p.step]+p.alter,n.midi);
  if(n.smallNote){validateSourceSmallNote(n);assert.equal(n.id,'cohen-p547-penitential-n011');assert.equal(n.midi,72);assert.equal(n.beatFraction,null);}
  else{const value={half:2,quarter:1,eighth:.5,'16th':.25,'32nd':.125}[r.type];assert(value&&Math.abs(value*(r.dots?1.5:1)*r.normal/r.actual-n.quarterBeats)<1e-9);assert(n.quarterBeats>0);}
  assert(Number.isInteger(n.bar)&&n.bar>=0&&n.bar<13);bars[n.bar]+=(n.quarterBeats??0)+(n.restAfterBeats??0);assert(!n.tieId,'Do not turn the printed slurs between different pitches into ties.');
 }
}
assert.deepEqual(record.words.flatMap(w=>w.notes),record.notes);const expected=[1,4,4,3,3,3,3,3,3,3,4,4,3];assert(bars.every((n,i)=>Math.abs(n-expected[i])<1e-8));assert.deepEqual(record.notation.barQuarterBeats,expected);assert.deepEqual(record.notation.meterByBar,[4,4,4,3,3,3,3,3,3,3,4,4,4]);
assert.equal(record.notes.filter(n=>n.smallNote).length,1);assert.equal(record.notes.filter(n=>n.restAfterBeats).length,6);assert.equal(record.notes.reduce((a,n)=>a+(n.restAfterBeats??0),0),2.75);assert.equal(record.notes.filter(n=>n.fermata).length,1);assert.equal(record.notation.unresolvedMarks.length,1);assert.equal(record.notation.unresolvedMarks[0].semanticKind,null);assert.equal(record.notation.unresolvedMarks[0].realization,null);
for(const[key,phase,count]of [['slurId','slurPhase',6],['tupletId','tupletPhase',3]]){const groups=Map.groupBy(record.notes.filter(n=>n[key]),n=>n[key]);assert.equal(groups.size,count);for(const a of groups.values()){assert.equal(a[0][phase],'start');assert.equal(a.at(-1)[phase],'stop');}}
for(const scan of[record.scan,record.secondScan]){const raw=await read(scan.file);assert.equal(raw.length,scan.bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),scan.sha256);}
await writeFile(new URL('cohen-penitential-data.js',root),'// Literal1902source pitches; unresolved mark and small-note timing remain explicit. See docs/COHEN-PENITENTIAL-SCORE.json.\nexport const cohenPenitentialWords='+JSON.stringify(record.words)+';\n');
console.log('Cohen penitential source:13unchanged words/49measured notes+1small quarter/41measured beats/6rests; one unresolved/unrealized mark; no coda or full-system claim.');
