import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {eventRhythm} from '../score-data.js';
const record=JSON.parse(await readFile(new URL('../docs/PRINTED-PATTERNS.json',import.meta.url),'utf8'));
assert.equal(record.id,'cohen-1902-munah-revia');assert.equal(record.revision,1);
assert.equal(record.notes.length,8);assert.equal(record.source.page,540);assert.equal(record.source.year,1902);
assert.equal(record.pronunciation,null);assert.equal(record.syllableUnderlay,null);
assert.equal(new Set(record.notes.map(n=>n.id)).size,record.notes.length);
for(const note of record.notes){
  assert.ok(['munah','revia'].includes(note.cell));assert.ok(Number.isInteger(note.midi));
  assert.ok(note.sourceLocation);eventRhythm({beats:note.quarterBeats,sourceRhythm:note.rhythm});
}
assert.deepEqual(record.notes.map(n=>n.cell),['munah','munah','munah','revia','revia','revia','revia','revia']);
assert.equal(record.notes.reduce((n,e)=>n+e.quarterBeats,0),7.5);
for(const id of ['munah-slur','revia-slur'])assert.deepEqual(record.notes.filter(n=>n.slur?.id===id).map(n=>n.slur.phase),['start','stop']);
const image=await readFile(new URL('../'+record.source.image,import.meta.url));
assert.equal(createHash('sha256').update(image).digest('hex'),record.source.imageSha256);
const context=await readFile(new URL('../'+record.source.contextImage.image,import.meta.url));
assert.equal(createHash('sha256').update(context).digest('hex'),record.source.contextImage.sha256);
await writeFile(new URL('../printed-pattern-data.js',import.meta.url),'// Generated from the source-checked record; do not edit.\nexport const PRINTED_PATTERNS = '+JSON.stringify(record)+';\n');
console.log('Validated eight untexted printed pattern components and source image.');
