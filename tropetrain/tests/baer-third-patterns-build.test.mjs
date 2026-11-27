import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BAER_THIRD_PATTERN_ROW as row} from '../baer-third-pattern-data.js';
import {portableProgramBytes,restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
test('both finished distributions retain third-row drafts, every source image/gap, and safe instrumental WAV preparation controls',()=>{
 const normal=read('app.bundle.js'),html=read('index.html').toString(),raw=read('TropeTrain.html'),portable=restoredPortableHtml(raw);
 for(const body of[html,portable]){assert(body.includes('id="baer-third-pattern-open" disabled'));assert(body.includes('href="#baer-third-pattern-study"'));assert(body.includes('literal drafts for all 29 source figures'));for(const id of['pattern-wav-prepare','pattern-wav-link','pattern-wav-status'])assert(body.includes('id="'+id+'"'));assert(body.includes('Export does not play audio.'));}
 assert(normal.includes(Buffer.from(row.id)));assert(normal.includes(Buffer.from('data:audio/wav;base64,')));assert(portable.includes('data:application/json;base64,'+read(row.recordPath).toString('base64')));for(const p of Object.values(row.record.source.pages)){assert(normal.includes(Buffer.from('data:image/png;base64,'+read(p.image).toString('base64'))));assert.equal(sha(read(p.image)),p.imageSha256);}
 assert(portable.includes('data:text/plain;base64,'+read('assets/scores/baer-no105-third-NOTICE.txt').toString('base64')));assert.deepEqual(portableProgramBytes(raw).bytes,normal);assert(portableFileBytes()<100*1024*1024-4*1024*1024);assert(read('sw.js').toString().includes('tropetrain-v107-baer-third-literal-r2'));
});
test('wholeTorah lookup ownership and all97previous manual choices remain unchanged; only42unmapped third-row choices append',()=>{
 const r=JSON.parse(read('docs/WORD-PATTERN-LOOKUPS.json'));assert.equal(r.assignmentSha256,'fd23caa9d6fd78b132f47e574ae54d65996464bd2de3ac6c37dadaa5a66d7940');assert.equal(r.counts.readerWords,79985);assert.equal(r.counts.lookupRelations,287099);assert.equal(r.counts.acceptedMusicalWordMappings,0);assert.equal(r.catalogue.unmappedFigureModes.length,139);assert.equal(sha(JSON.stringify(r.catalogue.unmappedFigureModes.slice(0,97))),'555a6bdcf842c93237ef8e3888e097306d1ca7cff7dad404f6736b9a58014838');assert(r.catalogue.unmappedFigureModes.slice(97).every(x=>x.sourceId===row.id));assert.equal(row.record.figures.filter(f=>f.status==='unresolved-route').length,0);
 for(const path of['baer-third-patterns.js','baer-third-pattern-data.js','docs/BAER-NO105-THIRD-PATTERNS.json','data/notation/baer-no105-third-transcription.json','scripts/import-baer-third-patterns.mjs'])assert.equal(r.inputs.find(x=>x.path===path)?.sha256,sha(read(path)));
});


test('both distributions retain the exact revision1source and delta archive beside revision2and its complete page34excerpt',()=>{
 const html=read('index.html').toString(),portable=restoredPortableHtml(read('TropeTrain.html'));
 for(const[path,mime]of[['docs/BAER-NO105-THIRD-PATTERNS-R1.json','application/json'],['assets/scores/baer-no105-third-r1-sources.zip','application/zip'],['assets/scores/baer-no105-third-R2-NOTICE.txt','text/plain']]){assert(html.includes('href="./'+path+'"'));assert(portable.includes('data:'+mime+';base64,'+read(path).toString('base64')));assert(read('sw.js').toString().includes('./'+path));}
 assert(portableProgramBytes(read('TropeTrain.html')).proof.format==='tropetrain-portable-program-v3');assert.equal(row.record.revision,2);assert.equal(row.record.source.pages['34'].image,'assets/scores/baer-no105-third-p34-complete.png');assert.equal(row.record.source.pages['34'].inspectionCrop[3],1275);
});
