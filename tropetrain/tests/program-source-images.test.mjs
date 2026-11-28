import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import vm from 'node:vm';
import {build} from 'esbuild';
import {programSourceImagePlugin,sourceImagePacket,packSourceImagePacket} from '../scripts/program-source-images.mjs';
import {decodePortableProgramTransport} from '../scripts/decode-portable-program.mjs';
import {restorePortableSourceImages} from '../portable-source-image-loader.js';
import {programSourceImage,loadProgramSourceImage} from '../program-source-images.js';
import {packPortableProgram} from '../scripts/pack-portable-program.mjs';
const root=new URL('../',import.meta.url).pathname,sha=b=>createHash('sha256').update(b).digest('hex');
const image=Buffer.from([137,80,78,71,13,10,26,10]),uri='data:image/png;base64,'+image.toString('base64');
const record={key:sha(Buffer.from(uri)),path:'assets/scores/fixture.png',mime:'image/png',bytes:image.length,sha256:sha(image),dataUriBytes:Buffer.byteLength(uri),dataUriSha256:sha(Buffer.from(uri)),dataUri:uri,uses:1};
function fixture(rows=[record],change={}){
 const packet=JSON.stringify({format:'tropetrain-program-source-images-v1',records:rows}),packed=packSourceImagePacket(packet),nodes=new Map(),appended=[];
 nodes.set('portable-source-image-proof',{textContent:JSON.stringify({...packed.proof,...change})});nodes.set('portable-source-image-data',{textContent:packed.markup.match(/id="portable-source-image-data"[^>]*>([^<]*)<\/script>/)[1]});nodes.set('portable-program-data',{textContent:'portable marker'});
 const doc={getElementById:id=>nodes.get(id),createElement:()=>({}),body:{appendChild:n=>{appended.push(n);if(n.id)nodes.set(n.id,n);}}};
 return {doc,nodes,appended,packed,packet,options:{document:doc,subtle:webcrypto.subtle,inflate:DecompressionStream}};
}
test('source-image packet independently recovers each exact original byte and canonical data URI',async()=>{
 const f=fixture(),encoded=f.nodes.get('portable-source-image-data').textContent,gzip=decodePortableProgramTransport(encoded,{format:'tropetrain-portable-program-v3',encoding:'gzip+html-base93',gzipBytes:f.packed.proof.gzipBytes});
 assert.equal(gunzipSync(gzip).toString(),f.packet);const result=await restorePortableSourceImages(f.options);assert.equal(result.restored,1);assert.equal(result.sourceBytes,image.length);assert.equal(programSourceImage(record.key,record.path,{document:f.doc}),uri);assert.equal(f.appended.length,1);assert.equal(f.appended[0].type,'application/json');
});
test('normal pages use canonical source files while portable pages never fall back to missing network images',()=>{
 assert.equal(programSourceImage(record.key,record.path,{document:{getElementById:()=>null}}),record.path);
 const missing={getElementById:id=>id==='portable-program-data'?{}:null};assert.throws(()=>programSourceImage(record.key,record.path,{document:missing}),/missing/);
 for(const path of ['https://example.com/image.png','assets/../private.png','/assets/image.png','assets/image.png?x=1'])assert.throws(()=>programSourceImage(record.key,path),/Invalid/);
});
test('on-demand image loading checks the compiled original identity, retries failures and reuses verified bytes',async()=>{
 const path='assets/scores/load-test.png';programSourceImage(record.key,path,{document:{getElementById:()=>null}});let calls=0;
 const request=async()=>{calls++;return new Response(image);},options={fetch:request,subtle:webcrypto.subtle};assert.equal(await loadProgramSourceImage(path,options),uri);assert.equal(await loadProgramSourceImage(path,options),uri);assert.equal(calls,1);
 const retry='assets/scores/retry-test.png';programSourceImage(record.key,retry,{document:{getElementById:()=>null}});await assert.rejects(()=>loadProgramSourceImage(retry,{fetch:async()=>new Response('wrong'),subtle:webcrypto.subtle}),/checksum/);assert.equal(await loadProgramSourceImage(retry,options),uri);
 await assert.rejects(()=>loadProgramSourceImage('https://example.com/image.png',options),/unavailable/);
 const partial='assets/scores/partial-test.png';programSourceImage(record.key,partial,{document:{getElementById:()=>null}});await assert.rejects(()=>loadProgramSourceImage(partial,{fetch:async()=>new Response(image,{status:206}),subtle:webcrypto.subtle}),/could not load/);
});
test('the compiled real pattern-evidence consumer recovers the complete original image before preparing its download',async()=>{
 const plugin=await programSourceImagePlugin(root),compiled=await build({stdin:{contents:"export {loadPatternEvidence} from './printed-patterns.js';",resolveDir:root,loader:'js'},bundle:true,format:'iife',globalName:'EvidenceFixture',write:false,platform:'browser',plugins:[plugin.plugin]});
 const expected=readFileSync(root+'assets/scores/baer-no105-third-p30.png'),requests=[],context=vm.createContext({document:{getElementById:()=>null},crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,Blob,atob,btoa,fetch:async path=>{requests.push(path);assert.equal(path,'assets/scores/baer-no105-third-p30.png');return new Response(expected);}});vm.runInContext(compiled.outputFiles[0].text,context);
 const result=await context.EvidenceFixture.loadPatternEvidence('baer-1894-no105-third-setting','columns','zarqa');assert.equal(requests.length,1);assert(Buffer.from(result.bytes).equals(expected));assert.equal(result.url,'data:image/png;base64,'+expected.toString('base64'));assert.equal(result.file,'assets/scores/baer-no105-third-p30.png');assert.equal(result.text,null);
});
test('build substitution changes only image delivery, preserving Hebrew, notes, nulls and earlier common-image contracts',async()=>{
 const plugin=await programSourceImagePlugin(root),file='assets/scores/idelsohn-1929-no266.jpg',bytes=readFileSync(root+file),imageUri='data:image/jpeg;base64,'+bytes.toString('base64'),legacy='data:image/jpeg;base64,'+readFileSync(root+'assets/scores/idelsohn-1929-no268.jpg').toString('base64');
 const data={hebrew:'בְּרֵאשִׁ֖ית',notes:[60,67,65],phonemes:null,review:null,image:imageUri,oldImage:legacy},source='export const data='+JSON.stringify(data)+';',changed=plugin.transform(source,root+'fixture-data.js');assert(changed.includes(legacy));assert(!changed.includes(imageUri));assert.equal(plugin.records().length,1);
 const compiled=await build({stdin:{contents:changed,resolveDir:root,loader:'js'},bundle:true,format:'iife',globalName:'ImageFixture',write:false,platform:'browser'}),normal=vm.createContext({document:{getElementById:()=>null}});vm.runInContext(compiled.outputFiles[0].text,normal);const actual=JSON.parse(JSON.stringify(normal.ImageFixture.data));assert.deepEqual({...actual,image:imageUri},data);assert.equal(actual.image,file);
 const f=fixture(plugin.records());await restorePortableSourceImages(f.options);const portable=vm.createContext({document:f.doc});vm.runInContext(compiled.outputFiles[0].text,portable);assert.deepEqual(JSON.parse(JSON.stringify(portable.ImageFixture.data)),data);
 assert.throws(()=>plugin.transform('export const missing="data:image/png;base64,AQIDBA==";',root+'fixture.js'),/no exact canonical asset/);
});
test('invalid source envelopes, missing packets and changed transport fail before exposing any image',async()=>{
 for(const change of [{format:'unknown'},{encoding:'gzip+base64'},{packetBytes:0},{packetBytes:128*1024*1024+1},{gzipBytes:64*1024*1024+1},{imageCount:257},{packetSha256:'0'.repeat(64)},{gzipSha256:'0'.repeat(64)}]){const f=fixture([record],change);await assert.rejects(()=>restorePortableSourceImages(f.options));assert.equal(f.appended.length,0);}
 const f=fixture();f.nodes.delete('portable-source-image-data');await assert.rejects(()=>restorePortableSourceImages(f.options));assert.equal(f.appended.length,0);
 assert.deepEqual(await restorePortableSourceImages({document:{getElementById:()=>null}}),{restored:0});await assert.rejects(()=>restorePortableSourceImages({document:{getElementById:()=>null},required:true}));
 for(const mutate of [s=>s.slice(1),s=>'<'+s.slice(1),s=>s+'!',s=>s.slice(0,-1)+' ']){const f=fixture();f.nodes.get('portable-source-image-data').textContent=mutate(f.nodes.get('portable-source-image-data').textContent);await assert.rejects(()=>restorePortableSourceImages(f.options));assert.equal(f.appended.length,0);}
});
test('complete source identity, paths, MIME, raw image hashes and unique keys are checked atomically',async()=>{
 for(const change of [{key:'0'.repeat(64)},{path:'assets/../image.png'},{path:'https://example.com/image.png'},{mime:'text/html'},{bytes:image.length+1},{sha256:'0'.repeat(64)},{dataUriSha256:'0'.repeat(64)},{dataUriBytes:record.dataUriBytes+1},{dataUri:uri.slice(0,-1)+'A'}]){const f=fixture([{...record,...change}]);await assert.rejects(()=>restorePortableSourceImages(f.options));assert.equal(f.appended.length,0);}
 const otherBytes=Buffer.from([1,2,3]),otherUri='data:image/png;base64,'+otherBytes.toString('base64'),other={...record,key:sha(Buffer.from(otherUri)),dataUriSha256:sha(Buffer.from(otherUri)),dataUri:otherUri,dataUriBytes:Buffer.byteLength(otherUri),bytes:otherBytes.length,sha256:'0'.repeat(64)};
 const atomic=fixture([record,other]);await assert.rejects(()=>restorePortableSourceImages(atomic.options));assert.equal(atomic.appended.length,0,'a later bad image exposes none of the earlier valid images');
 const f=fixture([record,record]);await assert.rejects(()=>restorePortableSourceImages(f.options));assert.equal(f.appended.length,0);
});
test('decompression bounds, actual gzip validity and exact UTF8 are enforced without creating a store',async()=>{
 const f=fixture();const original=gzipSync(Buffer.from(f.packet)),bad=original.subarray(0,-8),proof={...f.packed.proof,gzipBytes:bad.length,gzipSha256:sha(bad)};const {encodePortableProgramBytes93}=await import('../scripts/pack-portable-program.mjs');f.nodes.get('portable-source-image-proof').textContent=JSON.stringify(proof);f.nodes.get('portable-source-image-data').textContent=encodePortableProgramBytes93(bad);await assert.rejects(()=>restorePortableSourceImages(f.options));assert.equal(f.appended.length,0);
 for(const change of [{packetBytes:1},{packetBytes:f.packed.proof.packetBytes+1}]){const g=fixture([record],change);await assert.rejects(()=>restorePortableSourceImages(g.options));assert.equal(g.appended.length,0);}
 const g=fixture(),raw=Buffer.from([0xc3,0x28]),gzip=gzipSync(raw);g.nodes.get('portable-source-image-proof').textContent=JSON.stringify({...g.packed.proof,packetBytes:raw.length,packetSha256:sha(raw),gzipBytes:gzip.length,gzipSha256:sha(gzip)});g.nodes.get('portable-source-image-data').textContent=encodePortableProgramBytes93(gzip);await assert.rejects(()=>restorePortableSourceImages(g.options));assert.equal(g.appended.length,0);
});
test('the actual emitted loader verifies source images before executing the exact program; missing images refuse startup',async()=>{
 const f=fixture(),program='globalThis.sourceImage="'+record.key+'";',packed=packPortableProgram(program,{sourceImages:true});for(const id of ['portable-program-proof','portable-program-data'])f.nodes.set(id,{textContent:packed.markup.match(new RegExp('id="'+id+'"[^>]*>([^<]*)<\\/script>'))[1]});
 const status={hidden:true,setAttribute(){},appendChild(){}},executed=[];f.nodes.set('startup-status',status);const original=f.doc.body.appendChild;f.doc.body.appendChild=n=>{if(n.id==='portable-recovered-program'){assert(f.nodes.has('program-source-image-store'));executed.push(n.textContent);}original(n);};
 const loader=packed.markup.match(/id="portable-program-loader">([\s\S]*?)<\/script>/)[1],context={document:f.doc,DecompressionStream,crypto:webcrypto,Uint8Array,TextEncoder,TextDecoder,Blob,atob,btoa};const result=await vm.runInNewContext(loader,context);assert(result.started);assert.deepEqual(executed,[program]);assert.equal(result.evidence.sourceImages.restored,1);
 const g=fixture();g.nodes.delete('portable-source-image-proof');g.nodes.delete('portable-source-image-data');for(const id of ['portable-program-proof','portable-program-data'])g.nodes.set(id,f.nodes.get(id));g.nodes.set('startup-status',status);const failed=await vm.runInNewContext(loader,{...context,document:g.doc});assert.equal(failed.started,false);assert(!g.appended.some(n=>n.id==='portable-recovered-program'));
});
