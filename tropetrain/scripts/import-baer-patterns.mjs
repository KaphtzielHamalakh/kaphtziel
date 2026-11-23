import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {baerComponentRoutes} from '../baer-notation.js';
import {validateSourceGrace} from '../source-grace.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),path='docs/BAER-NO105-PATTERNS.json',raw=read(path),record=JSON.parse(raw);
assert.equal(record.schema,'tropetrain-baer-first-setting-patterns-v1');assert.equal(record.revision,6);assert.equal(record.figures.length,32);assert.equal(record.notes.length,308);
assert.equal(createHash('sha256').update(JSON.stringify(record.notes.slice(0,60))).digest('hex'),'569bf9de5d372768293f9014be1ff4494c426caa2d3659302e8d9bf92a38d658');
assert.equal(createHash('sha256').update(JSON.stringify(record.notes.slice(0,123))).digest('hex'),'5ca568e983c9c011d137220daed66be158d1a89aec4355d860d472038918b3d2');
assert.equal(createHash('sha256').update(JSON.stringify(record.notes.slice(0,175))).digest('hex'),'892ff95cf68c97ab348321e80e4161da8eff1f9001d864df55d7b7492e083220');
assert.equal(createHash('sha256').update(JSON.stringify(record.notes.slice(0,217))).digest('hex'),'c9bc42a357794d26cf816839f491e6a96ae84bf6f9e830d6c701dd2b2d2e8438');
assert.equal(createHash('sha256').update(JSON.stringify(record.notes.slice(0,229))).digest('hex'),'7a94e66c91000c3d0d08ccc79d8f25083c40004b5ae98aea9a4f263f56736c4e');
const ids=new Set(),figures=new Map(record.figures.map(f=>[f.id,f])),base={whole:4,half:2,quarter:1,eighth:.5,'16th':.25,'32nd':.125};
for(const n of record.notes){
 assert(!ids.has(n.id));ids.add(n.id);assert(['transcribed','unmeasured-grace'].includes(figures.get(n.cell)?.status));assert(['note','rest'].includes(n.kind));
 const r=n.rhythm;if(n.grace)validateSourceGrace(n);else assert.equal(n.quarterBeats,base[r.type]*(2-2**-r.dots)*r.normal/r.actual);
 if(n.kind==='note'){const p=n.sourcePitch;assert.equal(n.midi,12*(p.octave+1)+{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[p.step]+p.alter);}else assert.equal(n.midi,undefined);
}
assert.equal(record.figures.filter(f=>f.status==='transcribed').length,27);assert.equal(record.notes.filter(n=>n.kind==='rest').length,16);
for(const figure of record.figures){
 if(figure.status==='transcribed')baerComponentRoutes(record,figure);
 else if(figure.status==='unmeasured-grace'){const route=baerComponentRoutes(record,figure,{allowUnmeasuredGrace:true})[0].components;assert.equal(route.filter(n=>n.grace).length,figure.unmeasuredGraceNotes);assert(Math.abs(route.filter(n=>!n.grace).reduce((b,n)=>b+n.quarterBeats,0)-figure.sourceMeasuredQuarterBeats)<1e-10);}
 else assert.equal(record.notes.some(n=>n.cell===figure.id),false);
}
const metrical=record.notes.filter(n=>n.cell==='merkha-kefula');
for(const bar of [1,2,3])assert.equal(metrical.filter(n=>n.sourceBar===bar).reduce((b,n)=>b+n.quarterBeats,0),3);
const images={};
for(const spec of [...Object.values(record.source.pages),...Object.values(record.source.detailImages??{}),record.source.contextImage]){
 const bytes=read(spec.image);assert.equal(createHash('sha256').update(bytes).digest('hex'),spec.imageSha256??spec.sha256);assert.equal(bytes.length,spec.imageBytes??spec.bytes);
 images[spec.image]='data:image/'+(spec.image.endsWith('.jpg')?'jpeg':'png')+';base64,'+bytes.toString('base64');
}
const principle=record.notationPrinciple.source,preface=read(principle.file);
assert.equal(preface.length,principle.bytes);assert.equal(createHash('sha256').update(preface).digest('hex'),principle.sha256);
images[principle.file]='data:image/png;base64,'+preface.toString('base64');
const row={id:record.id,label:'Baer [1894] · No105 · first printed setting',sourceCatalog:{id:record.id,revision:record.revision},recordPath:path,unavailable:record.figures.filter(f=>!['transcribed','unmeasured-grace'].includes(f.status)).map(f=>({cell:f.id,name:f.name,reason:f.pending})),record};
const out='// Generated from the unchanged, source-pinned Baer record. New transcription CC0-1.0.\nexport const BAER_PATTERN_ROW='+JSON.stringify(row)+';\nexport const BAER_PATTERN_IMAGES='+JSON.stringify(images)+';\nexport const BAER_PATTERN_RECORDS='+JSON.stringify({[path]:'data:application/json;base64,'+raw.toString('base64')})+';\n';
writeFileSync(new URL('baer-pattern-data.js',root),out);console.log('Validated32-cell literal inventory:27fully measured and5unmeasured-grace figures;308physical components. All229prior components exact. Source repeat count null; optional original two-pass demonstration. Optional80ms grace timing is original, not historical. No word or phoneme allocation.');
