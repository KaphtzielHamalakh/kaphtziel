import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {decodePortableProgramTransport} from './decode-portable-program.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

export async function auditPortableProgramImages(root){
 const html=await readFile(path.join(root,'TropeTrain.html'),'utf8'),normal=await readFile(path.join(root,'app.bundle.js'));
 const imageMatch=html.match(/<script id="portable-program-images-proof" type="application\/json">([^<]+)<\/script>/);assert(imageMatch,'Shared images have their complete identity record');const proof=JSON.parse(imageMatch[1]);assert.equal(proof.format,'tropetrain-portable-program-images-v1');assert.equal(proof.programBytes,normal.length);assert.equal(proof.programSha256,sha(normal));
 const envelope=html.match(/<script id="portable-program-proof" type="application\/json">([^<]+)<\/script><script id="portable-program-data" type="application\/octet-stream">([^<]+)<\/script>/);assert(envelope);const programProof=JSON.parse(envelope[1]),gzip=decodePortableProgramTransport(envelope[2],programProof);assert.equal(gzip.length,programProof.gzipBytes);assert.equal(sha(gzip),programProof.gzipSha256);const recovered=gunzipSync(gzip);assert.deepEqual(recovered,normal);assert.equal(sha(recovered),proof.programSha256);
 const sources=new Map();for(const entry of await readdir(path.join(root,'assets/scores'),{withFileTypes:true})){if(!entry.isFile())continue;const file='assets/scores/'+entry.name,bytes=await readFile(path.join(root,file));const digest=sha(bytes);sources.set(digest,{file,bytes});}
 const uris=[...new Set(normal.toString('utf8').match(/data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/]+={0,2}/g)??[])],records=[];let uses=0;
 for(const [index,r]of proof.records.entries()){
  assert.equal(r.id,String(index));const original=uris.find(uri=>sha(Buffer.from(uri))===r.dataUriSha256);assert(original,'Original complete image exists in the unchanged program');const bytes=Buffer.from(original.split(',')[1],'base64');assert.equal(bytes.length,r.bytes);assert.equal(sha(bytes),r.sha256);assert.equal(original.length,r.dataUriBytes);const source=sources.get(r.sha256);assert(source,'Shared image must match a retained canonical source asset');assert.deepEqual(bytes,source.bytes);
  const ids=[];for(const match of html.matchAll(/<img\b[^>]*>/g)){const tag=match[0],binding=tag.match(/\bdata-portable-program-image="([0-9]+)"/);if(binding?.[1]!==r.id)continue;assert(!/\bsrc=/.test(tag),'Shared src is restored before application execution');const id=tag.match(/\bid="([^"]+)"/)?.[1];assert(id,'Each source image remains addressable');ids.push(id);}
  assert.equal(ids.length,r.uses);uses+=ids.length;records.push({...r,canonicalSourcePath:source.file,elementIds:ids,allOriginalBytesExact:true});
 }
 assert.equal(uses,proof.imageCount);assert.equal([...html.matchAll(/\bdata-portable-program-image="[^"]+"/g)].length,uses);
 const inputs=[];for(const file of ['scripts/decode-portable-program.mjs','scripts/audit-portable-program-images.mjs','scripts/share-program-images.mjs','scripts/pack-portable-program.mjs','portable-program-images.js','portable-program-loader.js','scripts/build.mjs','index.html','app.bundle.js',...records.map(r=>r.canonicalSourcePath)].sort())inputs.push({path:file,sha256:sha(await readFile(path.join(root,file)))});
 const report={format:'tropetrain-portable-program-images-audit-v1',status:'lossless-packaging-no-musical-change',inputs,records,imageCount:uses,completeSourceImagesRetained:true,normalProgramBytes:normal.length,normalProgramSha256:sha(normal),avoidedDuplicateDataUriBytes:records.reduce((n,r)=>n+r.dataUriBytes*r.uses,0),historicalRealizationsAdded:0,singingVoicesAdded:0};await writeFile(path.join(root,'docs/PORTABLE-PROGRAM-IMAGES.json'),JSON.stringify(report,null,2)+'\n');console.log(`Portable source images: ${uses} exact originals shared with the unchanged program.`);return report;
}
