import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),path='docs/BAER-NO105-PATTERNS.json',raw=read(path),record=JSON.parse(raw);
assert.equal(record.schema,'tropetrain-baer-first-setting-patterns-v1');assert.equal(record.revision,2);assert.equal(record.figures.length,32);assert.equal(record.notes.length,123);
assert.equal(createHash('sha256').update(JSON.stringify(record.notes.slice(0,60))).digest('hex'),'569bf9de5d372768293f9014be1ff4494c426caa2d3659302e8d9bf92a38d658');
const ids=new Set(),figures=new Map(record.figures.map(f=>[f.id,f])),base={whole:4,half:2,quarter:1,eighth:.5,'16th':.25,'32nd':.125};
for(const n of record.notes){
 assert(!ids.has(n.id));ids.add(n.id);assert.equal(figures.get(n.cell)?.status,'transcribed');assert(['note','rest'].includes(n.kind));
 const r=n.rhythm;assert.equal(n.quarterBeats,base[r.type]*(2-2**-r.dots)*r.normal/r.actual);
 if(n.kind==='note'){const p=n.sourcePitch;assert.equal(n.midi,12*(p.octave+1)+{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[p.step]+p.alter);}else assert.equal(n.midi,undefined);
}
assert.equal(record.figures.filter(f=>f.status==='transcribed').length,19);assert.equal(record.notes.filter(n=>n.kind==='rest').length,8);
const images={};
for(const spec of [...Object.values(record.source.pages),record.source.contextImage]){
 const bytes=read(spec.image);assert.equal(createHash('sha256').update(bytes).digest('hex'),spec.imageSha256??spec.sha256);assert.equal(bytes.length,spec.imageBytes??spec.bytes);
 images[spec.image]='data:image/'+(spec.image.endsWith('.jpg')?'jpeg':'png')+';base64,'+bytes.toString('base64');
}
const row={id:record.id,label:'Baer [1894] · No105 · first printed setting',sourceCatalog:{id:record.id,revision:record.revision},recordPath:path,unavailable:record.figures.filter(f=>f.status!=='transcribed').map(f=>({cell:f.id,name:f.name,reason:f.pending})),record};
const out='// Generated from the unchanged, source-pinned Baer record. New transcription CC0-1.0.\nexport const BAER_PATTERN_ROW='+JSON.stringify(row)+';\nexport const BAER_PATTERN_IMAGES='+JSON.stringify(images)+';\nexport const BAER_PATTERN_RECORDS='+JSON.stringify({[path]:'data:application/json;base64,'+raw.toString('base64')})+';\n';
writeFileSync(new URL('baer-pattern-data.js',root),out);console.log('Validated Baer first-setting32-cell inventory:19transcribed figures/115notes/8rests;13explicit pending cells, no word or phoneme allocation.');
