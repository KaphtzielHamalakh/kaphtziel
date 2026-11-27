import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {portableProgramBytes,restoredPortableHtml} from './portable-artifact.mjs';
const root=new URL('../',import.meta.url),read=file=>readFileSync(new URL(file,root)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('actual portable shares complete original source images with its exact normal program and retains every canonical source asset',()=>{
 const html=read('TropeTrain.html').toString(),normal=read('app.bundle.js'),decoded=portableProgramBytes(html),report=JSON.parse(read('docs/PORTABLE-PROGRAM-IMAGES.json')),envelope=html.match(/<script id="portable-program-images-proof" type="application\/json">([^<]+)<\/script>/);assert(envelope,'The physical artifact contains its source-image envelope');const proof=JSON.parse(envelope[1]);assert.equal(proof.imageCount,3);assert.equal([...html.matchAll(/data-portable-program-image="[0-9]+"/g)].length,3);assert.deepEqual(proof.records,report.records.map(({canonicalSourcePath,elementIds,allOriginalBytesExact,...r})=>r));assert.deepEqual(decoded.bytes,normal);assert.equal(report.normalProgramSha256,sha(normal));assert.equal(report.imageCount,3);assert(report.completeSourceImagesRetained);assert.equal(report.historicalRealizationsAdded,0);assert.equal(report.singingVoicesAdded,0);
 assert.deepEqual(report.records.map(r=>r.canonicalSourcePath).sort(),['assets/scores/cohen-1902-munah-revia.png','assets/scores/cohen-1902-pentateuch-row-a.png','assets/scores/idelsohn-1929-no268.jpg']);
 const logical=restoredPortableHtml(html);for(const r of report.records){const bytes=read(r.canonicalSourcePath);assert.equal(bytes.length,r.bytes);assert.equal(sha(bytes),r.sha256);const uri=(r.canonicalSourcePath.endsWith('.jpg')?'data:image/jpeg;base64,':'data:image/png;base64,')+bytes.toString('base64');assert(normal.toString().includes(uri));for(const id of r.elementIds){const tag=logical.match(new RegExp('<img\\b[^>]*id="'+id+'"[^>]*>'))?.[0];assert(tag?.includes('src="'+uri+'"'));}assert(r.allOriginalBytesExact);}
 for(const input of report.inputs)assert.equal(sha(read(input.path)),input.sha256,input.path);assert(report.avoidedDuplicateDataUriBytes>1100000);assert(Buffer.byteLength(html)<100*1024*1024);
});
