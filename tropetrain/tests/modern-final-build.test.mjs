import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),json=p=>JSON.parse(read(p));
test('the full-Torah final-consonant audit is fresh and only the eligible ordinary final category gains a proposal',()=>{
 const a=json('docs/MODERN-FINAL-CONSONANTS.json');assert.equal(a.schema,'tropetrain-modern-final-consonants-audit-v1');assert.equal(a.results.length,2);
 for(const input of a.inputs)assert.equal(createHash('sha256').update(read(input.path)).digest('hex'),input.sha256,input.path);
 for(const r of a.results){assert.equal(r.readerWords,79985);assert.equal(r.sourceWordIdentitiesChecked,79985);assert.equal(r.optionalFinalLossReferences,583);assert.deepEqual(r.optionalFinalLossCategories,{AYIN_0DAG:583});assert(r.affectedReaderWords>0&&r.affectedReaderWords<=583);assert.equal(r.unassignedReferences,20378);assert.equal(r.unassignedCategories.SHEVA_NA,19557);assert.equal(r.unassignedCategories.HE_1MAPIQ,657);assert.equal(r.unassignedCategories.AYIN_0DAG,151);assert.equal(r.sharedEvents,18250);assert.equal(r.combinedWords,2);}
 const baseline=json('tests/fixtures/phonology-v81-modern-baseline.json');assert.deepEqual(json('docs/MODERN-PHONOLOGY.json').results,baseline.auditResults);
});
test('all four reading policies keep every Torah word and original note linked with no acoustic allocation',()=>{
 const a=json('docs/MODERN-FINAL-NOTE-LINKS.json'),base=json('docs/MODERN-PHONOLOGY-NOTE-LINKS.json');assert.equal(a.results.length,8);
 for(const input of a.inputs)assert.equal(createHash('sha256').update(read(input.path)).digest('hex'),input.sha256,input.path);
 for(const [i,r]of a.results.entries()){assert.equal(r.chapters,187);assert.equal(r.readerWords,79985);assert.equal(r.individualWords,79983);assert.equal(r.jointWords,2);assert.equal(r.uncoveredWords,0);assert.equal(r.linkedNotes,r.notes);assert.equal(r.jointNotes,4);assert.equal(r.notes,base.results[i].notes);assert.equal(r.noteReferences,base.results[i].noteReferences);assert.deepEqual(r.policy,base.results[i].policy);}
 for(const k of ['acceptedPhonemes','enginePhones','acousticTiming','newSingingVoice','review'])assert.equal(a.invariants[k],null);
});
test('normal and portable builds expose the same optional policy and embed its exact source and note evidence',()=>{
 const index=read('index.html').toString(),bundle=read('app.bundle.js').toString(),portable=read('TropeTrain.html').toString(),version=json('package.json').version;
 assert(index.includes('v'+version));for(const text of[bundle,portable]){assert(text.includes('phonikud-modern-final-consonants'));assert(text.includes('modern-optional-final-consonant-loss'));assert(text.includes('Optional word-final glottal/h loss'));}
 for(const path of['docs/MODERN-FINAL-CONSONANTS.json','docs/MODERN-FINAL-NOTE-LINKS.json'])assert(portable.includes('data:application/json;base64,'+read(path).toString('base64')),path);
 assert(Buffer.byteLength(portable)<100*1024*1024);
});
