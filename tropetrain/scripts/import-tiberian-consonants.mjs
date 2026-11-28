import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {HISTORICAL_CATEGORY_INVENTORY as inventory} from '../historical-pronunciation-categories.js';
const root=new URL('../',import.meta.url),read=path=>readFile(new URL(path,root)),sha=b=>createHash('sha256').update(b).digest('hex');
const path='data/phonology/khan-tiberian-consonants.json',bytes=await read(path),record=JSON.parse(bytes);
assert.equal(record.format,'tropetrain-khan-tiberian-consonant-bindings-v1');assert.equal(record.revision,1);
assert.equal(record.source.license,'CC-BY-4.0');assert.equal(record.source.originalPdfSha256,'bcab644037f62795041c3c6e6e37f1c1eb28f29d147b6d2c4409fd6bc3c0da24');
assert.deepEqual(record.scopeBookIds,['gen','exo','lev','num','deu']);
for(const key of ['acceptedPhonemes','acousticRealizations','musicalNotes','voice','review'])assert.equal(record[key],null);
const catalog=new Map(inventory.catalog.map(c=>[c.id,c])),bound=new Set();
for(const r of record.rules){
 assert.equal(r.review,null);assert(r.candidatePhoneme.length>0&&r.candidatePhoneme.length<=3);assert(r.printedPages.every(p=>record.source.printedPages.includes(p)));
 for(const id of r.categoryIds){assert.equal(catalog.get(id)?.kind,'consonant',id);assert(!bound.has(id),id);bound.add(id);}
}
assert.equal(record.rules.length,30);assert.equal(bound.size,57);assert.deepEqual(record.withheldConsonants.map(c=>c.categoryId),['ALEF_1MAPIQ']);
assert.deepEqual(inventory.catalog.filter(c=>c.kind==='consonant'&&!bound.has(c.id)).map(c=>c.id),['ALEF_1MAPIQ']);
assert(record.unassignedVowelsAndCompounds&&record.sourceSilenceOnly);
const pack=await read(record.sourcePack.file);assert.equal(pack.length,record.sourcePack.bytes);assert.equal(sha(pack),record.sourcePack.sha256);
const report={...record,counts:{ruleGroups:30,boundConsonantCategories:57,withheldConsonantCategories:1,sourceSilentCategories:5,unassignedVowelAndCompoundCategories:24,acceptedRealizations:0,newSingingVoices:0},categorySource:{sourceCommit:inventory.sourceCommit,inputSha256:inventory.inputSha256,license:inventory.license},inputs:[{path,sha256:sha(bytes)},{path:record.sourcePack.file,sha256:sha(pack)},{path:'historical-pronunciation-categories.js',sha256:sha(await read('historical-pronunciation-categories.js'))}]};
await writeFile(new URL('docs/KHAN-TIBERIAN-CONSONANTS.json',root),JSON.stringify(report,null,2)+'\n');
await writeFile(new URL('tiberian-consonant-data.js',root),'// Khan2020 CC BY4.0; original unreviewed source-category bindings.\nexport const TIBERIAN_CONSONANT_DATA='+JSON.stringify(report)+';\n');
console.log(JSON.stringify({tiberianConsonantBindings:report.counts,review:null,voice:null}));
