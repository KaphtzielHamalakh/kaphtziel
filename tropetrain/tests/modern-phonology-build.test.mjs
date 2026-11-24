import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';import{fileURLToPath}from'node:url';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),audit=p=>JSON.parse(read('docs/'+p+'.json'));
test('the complete modern correspondence audit retains every original Torah word, branch and explicit phonology gap',()=>{
 const r=audit('MODERN-PHONOLOGY');assert.equal(r.results.length,2);
 const baseline=JSON.parse(read('tests/fixtures/phonology-regional-baseline.json')),regional=audit('PRONUNCIATION-PHONOLOGY');assert.equal(regional.results.length,baseline.publishedAuditResultRows);assert.equal(createHash('sha256').update(JSON.stringify(regional.results)).digest('hex'),baseline.publishedAuditResultsSha256,'All four complete regional audit result rows remain equal to the published v0.80 baseline.');
 for(const row of r.inputs)assert.equal(createHash('sha256').update(read(row.path)).digest('hex'),row.sha256,row.path);
 for(const row of r.results){assert.equal(row.readerWords,79985);assert.equal(row.sourceWordIdentitiesChecked,79985);assert.equal(row.individuallyOwnedWords,79983);assert.equal(row.combinedWords,2);assert.equal(row.sourceUnits,194272);assert.equal(row.categoryReferences,518726);assert.equal(row.sharedEvents,18250);assert.equal(row.constituentPairs,2316);assert.equal(row.unassignedReferences,20961);assert.equal(row.unassignedCategories.SHEVA_NA,19557);assert.equal(row.proposedReferences+row.unassignedReferences,row.categoryReferences);}
 assert.equal(r.source.license,'CC-BY-4.0');assert.equal(r.invariants.acceptedPhonemes,null);assert.equal(r.invariants.acousticTimes,null);assert.equal(r.invariants.newSingingVoice,null);assert.equal(r.invariants.kinnorEquivalence,null);assert.equal(r.invariants.review,null);
});
test('all four existing source-reading choices and both source text styles retain complete, unsplit modern note correspondence',()=>{
 const r=audit('MODERN-PHONOLOGY-NOTE-LINKS'),policies=audit('SOURCE-READING-CHOICES').results.map(x=>x.policy);assert.equal(r.results.length,8);
 for(const row of r.inputs)assert.equal(createHash('sha256').update(read(row.path)).digest('hex'),row.sha256,row.path);
 for(const policy of policies){const rows=r.results.filter(x=>JSON.stringify(x.policy)===JSON.stringify(policy));assert.equal(rows.length,2);assert.deepEqual(rows.map(x=>x.sourceStyle),['sephardic','ashkenazic']);for(const row of rows){assert.equal(row.chapters,187);assert.equal(row.readerWords,79985);assert.equal(row.individualWords,79983);assert.equal(row.jointWords,2);assert.equal(row.uncoveredWords,0);assert.equal(row.jointNotes,4);assert.equal(row.linkedNotes,row.notes);}}
 for(const field of ['acceptedPhonemes','enginePhones','acousticTiming','newSingingVoice','review'])assert.equal(r.invariants[field],null);
});
test('both distributions carry exact modern evidence, reusable code/license and visible attribution within the host size limit',()=>{
 const normal=read('index.html').toString(),portable=read('TropeTrain.html').toString(),worker=read('sw.js').toString(),bundle=read('app.bundle.js').toString();
 for(const path of ['docs/MODERN-PHONOLOGY.json','docs/MODERN-PHONOLOGY-NOTE-LINKS.json','assets/pronunciation/phonikud-NOTICE.txt','assets/pronunciation/phonikud-code-reference.zip']){const mime=path.endsWith('.json')?'application/json':path.endsWith('.zip')?'application/zip':'text/plain';assert(normal.includes('href="./'+path+'"'));assert(worker.includes('./'+path));assert(portable.includes('data:'+mime+';base64,'+read(path).toString('base64')));assert(!portable.includes('href="./'+path+'"'));}
 for(const html of [normal,portable]){assert(html.includes('id="phonology-source-credit"'));assert(html.includes('https://github.com/phonikud/phonikud/tree/a29a75b473b0f132a0bbee41dad38763035211dc'));}
 assert(bundle.includes('Modern Hebrew inventory · research'));assert(read('TropeTrain.html').length<100*1024*1024);assert.equal(read('assets/pronunciation/phonikud-code-reference.zip').readUInt32LE(0),0x04034b50);
});
test('the reference archive contains only the five independently pinned code/license blobs and original provenance, with no model, dataset, audio or README',()=>{
 const script=`import zipfile,json,hashlib,sys
with zipfile.ZipFile(sys.argv[1]) as z:
 rows=[]
 for name in z.namelist():
  raw=z.read(name);rows.append(dict(path=name,bytes=len(raw),gitBlob=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\\0'+raw).hexdigest(),sha256=hashlib.sha256(raw).hexdigest()))
 print(json.dumps(dict(rows=rows,source=json.loads(z.read('SOURCE.json')))))
`;
 const r=JSON.parse(execFileSync('python3',['-c',script,fileURLToPath(new URL('../assets/pronunciation/phonikud-code-reference.zip',import.meta.url))],{encoding:'utf8'})),pins={'phonikud/phonemize.py':'ee565a748d2ae9855b79e0d5de420e4dea0fd9e1','phonikud/hebrew.py':'6db91fdc8aac4119709763053e3c8fc2de5cdf9f','phonikud/lexicon.py':'d77243234b5df6bd67e2ed4c23f7a3c4a4d7c4f3','phonikud/utils.py':'0aeeb9415670b9db9aff21136c9813dc145ab034','LICENSE':'2f9844fb9ad34ab57e88a1edcef3cdc0be887b42'};
 assert.deepEqual(r.rows.map(x=>x.path).sort(),[...Object.keys(pins),'SOURCE.json'].sort());assert.equal(r.source.commit,'a29a75b473b0f132a0bbee41dad38763035211dc');assert.equal(r.source.sourceTextChanged,false);assert.equal(r.source.newSingingVoice,null);assert(r.source.license.includes('CC-BY-4.0')&&r.source.license.includes('code only'));
 for(const row of r.rows.filter(x=>x.path!=='SOURCE.json')){assert.equal(row.gitBlob,pins[row.path]);const declared=r.source.files.find(x=>x.path===row.path);assert.equal(declared.included,true);for(const field of ['bytes','gitBlob','sha256'])assert.equal(row[field],declared[field]);}
 assert.equal(r.source.files.find(x=>x.path==='README.md').included,false);
});
