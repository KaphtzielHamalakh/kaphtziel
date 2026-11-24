import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),path='docs/IDELSOHN-NO267-PATTERNS.json',raw=read(path),record=JSON.parse(raw),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(record.schema,'tropetrain-idelsohn-no267-written-study-v1');assert.equal(record.revision,1);
assert.equal(record.source.pdfSha256,'0ab0c051dc4d5c6f2e61a20edf254c492fb2abd0045c6fcb8edd727e107789df');
assert.equal(record.figures.length,26);assert.equal(record.figures.filter(f=>f.status==='written-values').length,21);assert.equal(record.figures.filter(f=>f.status==='pending').length,5);
const notes=record.figures.flatMap(f=>f.components),ids=new Set(),base={whole:4,half:2,quarter:1,eighth:.5,sixteenth:.25};
assert.equal(notes.filter(c=>c.kind==='note').length,138);assert.equal(notes.filter(c=>c.kind==='rest').length,7);assert.equal(notes.filter(c=>c.quarterBeats===null).length,10);
for(const f of record.figures){
 for(const k of ['bibleWordUnderlay','syllableUnderlay','phonemes','actualTuning','sourceRecording','independentReview','modernAccentEquivalent','kinnorEquivalent'])assert.equal(f[k],null);
 if(f.status==='written-values')assert(Math.abs(f.components.reduce((a,c)=>a+c.quarterBeats,0)-f.printedQuarterBeats)<1e-8);else{assert.equal(f.printedQuarterBeats,null);assert(f.pending);}
 for(const c of f.components){
  assert(!ids.has(c.id));ids.add(c.id);assert.equal(c.sourcePdfPage,104);assert.equal(c.sourcePrintedPage,101);
  if(c.quarterBeats!==null){const r=c.rhythm;assert(Math.abs(c.quarterBeats-base[r.type]*(2-2**-r.dots)*r.normal/r.actual)<1e-8);assert(Math.abs(c.quarterBeats-c.quarterBeatFraction.numerator/c.quarterBeatFraction.denominator)<1e-8);}
  if(c.kind==='note'){const p=c.sourcePitch;assert.equal(c.midi,12*(p.octave+1)+{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[p.step]+p.alter);}else{assert.equal(c.kind,'rest');assert.equal(c.midi,undefined);}
 }
}
assert.equal(record.figures.find(f=>f.id.endsWith('sof-pasuq')).sharedSourceGroupId,record.figures.find(f=>f.id.endsWith('maarikh-tarha-row5')).sharedSourceGroupId);
const images={};for(const spec of [record.source,record.source.contextImage]){const bytes=read(spec.image);assert.equal(bytes.length,spec.imageBytes);assert.equal(sha(bytes),spec.imageSha256);images[spec.image]='data:image/jpeg;base64,'+bytes.toString('base64');}
const meta={id:record.id,label:'Idelsohn1929 · No267 · unreviewed instrumental study',sourceCatalog:{id:record.id,revision:record.revision},recordPath:path,unavailable:record.figures.filter(f=>f.status==='pending').map(f=>({cell:f.id,name:f.name,reason:f.pending}))};
// Derive the flat UI index without serializing a second copy of every component.
const out='// Generated from the pinned, unreviewed No267 record. New transcription CC0-1.0.\nconst record='+JSON.stringify(record)+';\nrecord.notes=record.figures.flatMap(f=>f.components.map(c=>({...c,cell:f.id})));\nexport const IDELSOHN_PATTERN_ROW={...'+JSON.stringify(meta)+',record};\nexport const IDELSOHN_PATTERN_IMAGES='+JSON.stringify(images)+';\nexport const IDELSOHN_PATTERN_RECORDS='+JSON.stringify({[path]:'data:application/json;base64,'+raw.toString('base64')})+';\n';
writeFileSync(new URL('idelsohn-pattern-data.js',root),out);console.log('No267:26 indexed source figures/groups,21 unreviewed written-value studies,5 withheld,138 pitches and7 rests. All word/phoneme/tuning/independent-review fields remain null.');
