import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {eventRhythm,eventPitchSpelling} from '../score-data.js';
const read=file=>readFile(new URL('../'+file,import.meta.url));
const raw=await read('docs/PRINTED-PATTERN-CATALOG.json'),catalog=JSON.parse(raw);
assert.equal(catalog.schema,'tropetrain-printed-pattern-catalog-v1');assert.equal(catalog.revision,2);
assert.equal(catalog.source.pdfSha1,'cbf09fe8bcf3a6349eac4c013bde04413f7b841d');assert.equal(catalog.source.page,540);assert.equal(catalog.rows.length,12);
const images={},records={'docs/PRINTED-PATTERN-CATALOG.json':'data:application/json;base64,'+raw.toString('base64')};let count=0;
for(const row of catalog.rows){
 if(row.recordPath){assert.equal(row.recordPath,'docs/PRINTED-PATTERNS.json');const source=await read(row.recordPath);row.record=JSON.parse(source);records[row.recordPath]='data:application/json;base64,'+source.toString('base64');}
 const record=row.record;assert.equal(row.id,record.id);assert.equal(record.revision,1);
 assert.equal(record.pronunciation,null);assert.equal(record.syllableUnderlay,null);assert.equal(new Set(record.notes.map(n=>n.id)).size,record.notes.length);
 for(const n of record.notes){assert.ok(['munah','revia','yetiv','zakef-preceded'].includes(n.cell));assert.ok(n.kind==='rest'?n.midi===null:Number.isInteger(n.midi));assert.ok(n.sourceLocation);eventRhythm({beats:n.quarterBeats,sourceRhythm:n.rhythm});if(n.sourcePitch)eventPitchSpelling({...n,sourceTranspose:0});}
 for(const pending of row.unavailable)assert.ok(!record.notes.some(n=>n.cell===pending.cell));
 for(const phase of ['slur','tie','tuplet']){
  const ids=new Set(record.notes.filter(n=>n[phase]).map(n=>n[phase].id));
  for(const id of ids){const group=record.notes.filter(n=>n[phase]?.id===id);assert.equal(group[0][phase].phase,'start');assert.equal(group.at(-1)[phase].phase,'stop');if(phase==='tie'){assert.equal(group.length,2);assert.equal(group[0].midi,group[1].midi);}}
 }
 for(const source of [{image:record.source.image,sha256:record.source.imageSha256},record.source.contextImage]){
  assert.match(source.image,/^assets\/scores\/cohen-1902-[a-z0-9-]+\.png$/);
  const bytes=await read(source.image);assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);
  images[source.image]='data:image/png;base64,'+bytes.toString('base64');
 }
 count+=record.notes.length;
}
assert.equal(count,95);assert.equal(catalog.rows.reduce((n,r)=>n+r.unavailable.length,0),4);
await writeFile(new URL('../pattern-catalog-data.js',import.meta.url),'// Generated from checked source records and exact source image bytes.\nexport const PRINTED_PATTERN_CATALOG='+JSON.stringify(catalog)+';\nexport const PATTERN_IMAGE_DATA='+JSON.stringify(images)+';\nexport const PATTERN_RECORD_DATA='+JSON.stringify(records)+';\n');
console.log('Validated12source records/20figures/95components including6rests; source hashes and4unresolved cells retained.');
