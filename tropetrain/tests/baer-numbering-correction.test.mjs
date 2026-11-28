import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {NUMBERING_CORRECTION as correction,PRIOR_SECOND_SHA,CURRENT_SECOND_SHA,originalParentProvenance as normalize} from './baer-numbering-normalize.mjs';
import {baerPatternModes,baerPatternPlan,printedPatternRests} from '../baer-patterns.js';
import {baerSecondPatternModes,baerSecondPatternPlan} from '../baer-second-patterns.js';
import {baerThirdPatternModes,baerThirdPatternPlan} from '../baer-third-patterns.js';
import {soundingNotes} from '../synthesis.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex'),two=JSON.parse(read('docs/BAER-NO105-SECOND-PATTERNS.json')),three=JSON.parse(read('docs/BAER-NO105-THIRD-PATTERNS.json'));
const snapshot=JSON.parse(execFileSync('python3',['-c',"import zipfile,json,hashlib,sys;z=zipfile.ZipFile(sys.argv[1]);m=json.loads(z.read('SOURCE-MANIFEST.json'));assert len(m['files'])==7;assert all(hashlib.sha256(z.read(r['path'])).hexdigest()==r['sha256'] and len(z.read(r['path']))==r['bytes'] and (z.getinfo(r['path']).external_attr>>16)&0o777==int(r['mode'],8) for r in m['files']);print(json.dumps({'manifest':m,'second':json.loads(z.read('docs/BAER-NO105-SECOND-PATTERNS.json')),'third':json.loads(z.read('docs/BAER-NO105-THIRD-PATTERNS.json'))}))",new URL('../'+correction.priorSnapshot.path,import.meta.url).pathname],{encoding:'utf8',maxBuffer:4*1024*1024}));
test('the correction pins printed36supplement and printed37No111 applications, while preserving exact prior source files and modes',()=>{
 assert.equal(correction.correction.rareSupplement.printedPage,36);assert.equal(correction.correction.workedApplications.printedPage,37);assert.equal(correction.correction.workedApplications.no111.firstWayReference,'1.B.M.C.2V.3. (Genesis2:3)');assert.equal(correction.source.nativePages.length,2);assert.equal(correction.priorSnapshot.bytes,48389);assert.equal(sha(read(correction.priorSnapshot.path)),correction.priorSnapshot.sha256);assert.equal(snapshot.manifest.sourceCommit,'2cc09d73d4d242bb5ee5c666cc5993f89840e7ba');assert.equal(snapshot.manifest.files.find(r=>r.path==='docs/BAER-NO105-SECOND-PATTERNS.json').sha256,PRIOR_SECOND_SHA);
 for(const d of [two,three]){assert.equal(d.sourceMetadataRevision,2);assert.match(d.scope,/No111 begins the word-bearing application examples on printed37/);assert(!d.scope.includes('No111rare-sign'));assert.equal(d.metadataCorrections[0].recordSha256,sha(read('docs/BAER-NUMBERING-CORRECTION.json')));for(const r of d.inputs)assert.equal(sha(read(r.path)),r.sha256,r.path);}
});
test('corrected current reports change only scope, correction provenance and input hashes, preserving every musical object and null review',()=>{
 const omit=d=>Object.fromEntries(Object.entries(d).filter(([k])=>!['inputs','scope','sourceMetadataRevision','metadataCorrections'].includes(k)));
 assert.deepEqual(omit(two),omit(snapshot.second));assert.deepEqual(normalize(omit(three)),omit(snapshot.third));assert.equal(three.inputs.find(r=>r.path==='docs/BAER-NO105-SECOND-PATTERNS.json').sha256,CURRENT_SECOND_SHA);
 for(const d of [two,three])for(const k of ['pronunciation','syllableUnderlay','phonemes','review','wordApplication'])assert.equal(d[k],null);
});
test('all115accepted event, rest and sounding plans retain the frozen full fingerprint after only the exact corrected parent SHA is restored',()=>{
 const rows=[];for(const [source,modes,plan]of [['first',baerPatternModes,baerPatternPlan],['second',baerSecondPatternModes,baerSecondPatternPlan],['third',baerThirdPatternModes,baerThirdPatternPlan]])for(const m of modes()){const p=plan(m.id,{tempo:60,transpose:0,graceDemo:true,repeatDemo:true});rows.push({source,mode:m.id,plan:p,rests:printedPatternRests(p),sounding:soundingNotes(p)});}
 assert.equal(rows.length,115);assert.notEqual(sha(JSON.stringify(rows)),sha(JSON.stringify(normalize(rows))));assert.equal(sha(JSON.stringify(normalize(rows))),'b538a9084735b9b094600a780050720c7a00edd1b83dcaf871901ea8f4323b48');
});
