import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {NO111_RECORD as record} from '../baer-no111-data.js';
import {BAER_NO111_PROFILES} from '../baer-no111-score.js';
import {portableProgramBytes,portableEvidenceBytes,restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
test('No111 compiled source pins, word candidates and all unassigned musical-review fields agree with the canonical source record',()=>{
 assert.deepEqual(JSON.parse(read('docs/BAER-NO111-WORD-CANDIDATES.json')),record);
 for(const r of record.inputs)assert.equal(sha(read(r.path)),r.sha256,r.path);
 assert.equal(BAER_NO111_PROFILES.length,3);
 for(const k of ['review','acceptedSyllableMapping','phonemes','singingVoice','completeTraditionGrammar'])assert.equal(record[k],null);
 assert.equal(record.counts.candidateWords,10);assert.equal(record.counts.routeComponentMemberships,52);
});
test('both finished editions retain the bounded No111 controls, exact source/correction evidence and lossless image within the unchanged reserve',()=>{
 const normal=read('app.bundle.js'),raw=read('TropeTrain.html'),portable=restoredPortableHtml(raw),html=read('index.html').toString(),sw=read('sw.js').toString();
 assert.deepEqual(portableProgramBytes(raw).bytes,normal);
 for(const body of [html,portable]){
  for(const id of ['baer-no111-study','no111-gen-upper-open','no111-gen-lower-open','no111-exo-open','no111-grace-demo','no111-grace-status','baer-numbering-correction'])assert(body.includes('id="'+id+'"'),id);
  assert(body.includes('no inferred notes for the rest of either verse'));assert(body.includes('It does not divide the Hebrew to match the print'));
 }
 // Profile IDs are constructed at runtime; the canonical source record is literal.
 // All three complete IDs and their dispatch are checked through the actual UI.
 assert(normal.includes(Buffer.from(record.id)));
 const evidence=portableEvidenceBytes(raw);assert.equal(evidence.records.length,94);assert.equal(evidence.proof.linkCount,97);
 for(const path of ['docs/BAER-NO111-WORD-CANDIDATES.json','docs/BAER-NUMBERING-CORRECTION.json']){
  assert(html.includes('href="./'+path+'"'));assert(evidence.records.some(r=>r.bytes.equals(read(path))));assert(sw.includes('./'+path));
 }
 for(const [path,mime]of [['assets/scores/baer-1894-numbering-before-correction.zip','application/zip'],['assets/scores/baer-no111-NOTICE.txt','text/plain']]){
  assert(html.includes('href="./'+path+'"'));assert(portable.includes('data:'+mime+';base64,'+read(path).toString('base64')));assert(sw.includes('./'+path));
 }
 const image='assets/scores/baer-1894-no111-torah.webp',uri='data:image/webp;base64,'+read(image).toString('base64');
 assert(portable.includes('id="no111-score-image" src="'+uri+'"'));assert(portable.includes('data-embedded-image="no111-score-image"'));assert(sw.includes('./'+image));
 const sharedLinks=[...portable.matchAll(/<a\b[^>]*\bdata-embedded-image="([^"]+)"[^>]*>/g)].map(m=>m[1]).sort();assert.deepEqual(sharedLinks,["cohen-penitential-second-scan","cohen-penitential-second-scan","printed-score-scan","baer-score-scan","pattern-source-scan","pattern-context-scan","no111-score-image","no46-score-image","no270-score-image"].sort());assert.equal(read(image).length,279744);assert.equal(sha(read(image)),record.source.scan.imageSha256);
 assert(portableFileBytes()<=100*1024*1024-4*1024*1024);assert(sw.includes('tropetrain-v111-idelsohn-no270-quarter-tones'));
});
