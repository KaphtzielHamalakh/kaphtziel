import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {GEN24_RECORD as record} from '../idelsohn-gen24-data.js';
import {portableProgramBytes,portableEvidenceBytes,restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
test('finished Genesis24 editions retain the complete bounded source, explicit optional timing and all20 exact marked words without source substitution',()=>{
 const raw=read('TropeTrain.html'),normal=read('app.bundle.js'),portable=restoredPortableHtml(raw),html=read('index.html').toString(),sw=read('sw.js').toString();assert.deepEqual(portableProgramBytes(raw).bytes,normal);assert.deepEqual(JSON.parse(read('docs/IDELSOHN-GEN24-WORD-CANDIDATES.json')),record);for(const pin of record.inputs)assert.equal(sha(read(pin.path)),pin.sha256,pin.path);
 for(const body of[html,portable])for(const id of['idelsohn-gen24-study','gen24-measured-open','gen24-score-all','gen24-small-note-controls','gen24-small-note-demo','gen24-score-image'])assert(body.includes('id="'+id+'"'));
 assert(normal.includes(Buffer.from(record.id)));for(const w of record.words)assert(normal.includes(Buffer.from(w.sourceHebrew)));assert(normal.includes(Buffer.from('original-idelsohn-gen24-small-eighth-80ms-v1')));assert(normal.includes(Buffer.from('gen24SmallNoteDemo')));
 const evidence=portableEvidenceBytes(raw);assert.equal(evidence.records.length,95);assert.equal(evidence.proof.linkCount,98);assert(evidence.records.some(r=>r.bytes.equals(read('docs/IDELSOHN-GEN24-WORD-CANDIDATES.json'))));
 const tag=portable.match(/<img\b[^>]*\bid="gen24-score-image"[^>]*>/)?.[0];assert(tag?.includes('src="data:image/webp;base64,'+read(record.source.image).toString('base64')+'"'));assert(portable.includes('data:text/plain;base64,'+read('assets/scores/idelsohn-gen24-NOTICE.txt').toString('base64')));
 for(const file of[record.source.image,'docs/IDELSOHN-GEN24-WORD-CANDIDATES.json','assets/scores/idelsohn-gen24-NOTICE.txt'])assert(sw.includes('./'+file));assert(sw.includes('tropetrain-v112-idelsohn-gen24-word-study'));assert(portableFileBytes()<=100*1024*1024-4*1024*1024);
 for(const key of['review','acceptedSyllableMapping','phonemes','singingVoice','completeTraditionGrammar','kinnorPreset'])assert.equal(record[key],null);assert.equal(record.source.item,null);assert.equal(record.source.sourceLocalityLabel,null);
});
test('all ten shared full-resolution links retain one marker each, exact old source identities and the new complete crop',()=>{
 const html=read('TropeTrain.html').toString(),links=[...html.matchAll(/<a\b[^>]*\bdata-embedded-image="([^"]+)"[^>]*>/g)];assert.equal(links.length,10);for(const[tag]of links)assert.equal((tag.match(/data-embedded-image=/g)||[]).length,1);assert.equal(links.filter(m=>m[1]==='no270-score-image').length,1);assert.equal(links.filter(m=>m[1]==='gen24-score-image').length,1);assert(read('index.html').toString().includes('href="./assets/scores/idelsohn-1929-no270-gen25.webp"'));assert.equal(record.source.imageBytes,92680);assert.equal(sha(read(record.source.image)),record.source.imageSha256);
});
