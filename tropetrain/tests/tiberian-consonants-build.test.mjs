import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
test('the whole-Torah inventory audit retains all branches, original bindings, explicit source silence and unassigned vowels',()=>{
 const r=JSON.parse(read('docs/KHAN-TIBERIAN-CONSONANT-COVERAGE.json'));assert.equal(r.results.length,2);
 for(const pin of r.inputs)assert.equal(sha(read(pin.path)),pin.sha256,pin.path);
 for(const m of r.results){assert.equal(m.groups,68504);assert.equal(m.readerWords,79985);assert.equal(m.routes,68719);assert.equal(m.categoryReferences,518726);assert.equal(m.consonantCandidateReferences,273715);assert.equal(m.sourceSilentReferences,48421);assert.equal(m.unassignedReferences,196590);assert.equal(m.unassignedCategories.ALEF_1MAPIQ,2);assert.equal(m.sharedEvents,18250);assert.equal(m.sourceGeminateEvents,18578);assert.equal(m.sourceOnlyUnits,6261);assert.equal(m.collectiveUnits,4);assert.equal(Object.keys(m.consonantCategories).length,55);assert.deepEqual(m.unseenBoundConsonantCategories,['FPE_1DAG_QAL','RESH_1DAG']);}
 for(const k of ['qualifiedReview','acceptedPhonemes','acousticTiming'])assert.equal(r.invariants[k],null);assert.equal(r.invariants.newSingingVoices,0);assert.equal(r.invariants.newMelodySystems,0);
});
test('normal and portable editions retain exact licensed evidence and a visibly partial independent text profile',()=>{
 const normal=read('index.html').toString(),portable=restoredPortableHtml(read('TropeTrain.html')).toString(),bundle=read('app.bundle.js').toString(),worker=read('sw.js').toString();assert(normal.includes('v0.113.0'));assert(bundle.includes('Tiberian consonant inventory · partial research'));assert(portable.includes('phonology-tiberian-policy'));assert(portable.includes('This is not a complete pronunciation or a singing voice.'));
 for(const path of ['docs/KHAN-TIBERIAN-CONSONANTS.json','docs/KHAN-TIBERIAN-CONSONANT-COVERAGE.json','assets/pronunciation/khan-tiberian-consonants-sources.zip','assets/pronunciation/khan-tiberian-consonants-NOTICE.txt']){const mime=path.endsWith('.json')?'application/json':path.endsWith('.zip')?'application/zip':'text/plain';assert(normal.includes('href="./'+path+'"'));assert(worker.includes('./'+path));assert(portable.includes('data:'+mime+';base64,'+read(path).toString('base64')));assert(!portable.includes('href="./'+path+'"'));}
 assert(portableFileBytes()<=100*1024*1024-4*1024*1024,'Physical portable file retains the unchanged4MiBreserve.');
});
