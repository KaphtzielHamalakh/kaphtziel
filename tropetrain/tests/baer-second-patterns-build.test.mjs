import {assertProgramSourceImage} from './program-source-image-artifact.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BAER_SECOND_PATTERN_ROW} from '../baer-second-pattern-data.js';
import {portableProgramBytes,restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
test('both distributions retain the exact second-row record, all six source images and independent manual-study controls',()=>{
 const normal=read('app.bundle.js'),html=read('index.html').toString(),raw=read('TropeTrain.html'),portable=restoredPortableHtml(raw),row=BAER_SECOND_PATTERN_ROW;
 assert(html.includes('id="baer-second-pattern-open" disabled'));assert(html.includes('href="#baer-second-pattern-study"'));assert(html.includes(row.recordPath));assert(portable.includes('data:application/json;base64,'+read(row.recordPath).toString('base64')));assert(normal.includes(Buffer.from(row.id)));
 for(const p of Object.values(row.record.source.pages)){const uri='data:image/png;base64,'+read(p.image).toString('base64');assertProgramSourceImage(normal,uri,p.image);assert.equal(sha(read(p.image)),p.imageSha256);}
 assert(portable.includes('data:text/plain;base64,'+read('assets/scores/baer-no105-second-NOTICE.txt').toString('base64')));assert.equal(portableProgramBytes(raw).proof.format,'tropetrain-portable-program-v3');assert.deepEqual(portableProgramBytes(raw).bytes,normal);assert(portableFileBytes()<100*1024*1024-4*1024*1024);assert(read('sw.js').toString().includes('tropetrain-v111-idelsohn-no270-quarter-tones'));
});
test('all Torah lookup assignments and the62old unmapped records are preserved; only35new manual routes append',()=>{
 const r=JSON.parse(read('docs/WORD-PATTERN-LOOKUPS.json'));assert.equal(r.assignmentSha256,'fd23caa9d6fd78b132f47e574ae54d65996464bd2de3ac6c37dadaa5a66d7940');assert.equal(r.counts.readerWords,79985);assert.equal(r.counts.lookupRelations,287099);assert.equal(r.counts.acceptedMusicalWordMappings,0);assert.equal(r.catalogue.unmappedFigureModes.length,139);assert.equal(sha(JSON.stringify(r.catalogue.unmappedFigureModes.slice(0,62))),'34494cf69c35a641095e18846701dfad09685ee02efa9d32af02fa2d3301f747');assert(r.catalogue.unmappedFigureModes.slice(62,97).every(x=>x.sourceId===BAER_SECOND_PATTERN_ROW.id));
 for(const file of['baer-second-patterns.js','baer-second-pattern-data.js','docs/BAER-NO105-SECOND-PATTERNS.json','data/notation/baer-no105-second-transcription.json','scripts/import-baer-second-patterns.mjs'])assert.equal(r.inputs.find(x=>x.path===file)?.sha256,sha(read(file)));
});
