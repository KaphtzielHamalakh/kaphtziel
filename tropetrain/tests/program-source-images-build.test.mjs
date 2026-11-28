import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {programSourceImages,assertProgramSourceImage} from './program-source-image-artifact.mjs';
import {portableProgramBytes,portableFileBytes} from './portable-artifact.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
test('both editions preserve every original generated-module facsimile, with exact source data and independently decoded portable bytes',()=>{
 const program=read('app.bundle.js'),images=programSourceImages(),expected=new Map();
 for(const file of readdirSync(new URL('../',import.meta.url)).filter(n=>n.endsWith('-data.js'))){const text=read(file).toString();for(const m of text.matchAll(/(["'])(data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)\1/g))expected.set(sha(Buffer.from(m[2])),m[2]);}
 assert.equal(expected.size,37);assert.equal(images.records.size,34);
 for(const uri of expected.values())assertProgramSourceImage(program,uri);
 for(const [key,r]of images.records){assert(expected.has(key));assert(!program.includes(Buffer.from(r.dataUri)),'large images are outside the initial program');}
 assert.deepEqual(portableProgramBytes(read('TropeTrain.html')).bytes,program);
});
test('the measured source-image delivery inventory pins the real normal program, complete image packet, offline files and unchanged portable reserve',()=>{
 const report=JSON.parse(read('docs/PROGRAM-SOURCE-IMAGES.json')),program=read('app.bundle.js'),images=programSourceImages();
 assert.equal(report.version,JSON.parse(read('package.json')).version);assert.equal(report.normalProgramBytes,program.length);assert.equal(report.normalProgramSha256,sha(program));assert.equal(report.imageCount,34);assert.equal(report.removedInitialProgramImageUriBytes,14848040);assert.deepEqual(report.packet,images.proof);
 for(const r of report.records){const exact=images.records.get(r.key);assert(exact);for(const k of ['path','mime','bytes','sha256','dataUriBytes','dataUriSha256'])assert.equal(r[k],exact[k]);assert.equal(r.allOriginalBytesExact,true);assert.equal(r.uses,1);}
 for(const p of report.inputs)assert.equal(sha(read(p.path)),p.sha256,p.path);
 assert.equal(report.portableHtmlBytes,portableFileBytes());assert.equal(report.physicalHeadroomBytes,100*1024*1024-portableFileBytes());assert.equal(report.unchangedReserveBytes,4194304);assert(report.physicalHeadroomBytes>=report.unchangedReserveBytes);assert.equal(report.newMusicalRealizations,0);assert.equal(report.newSingingVoices,0);
 const sw=read('sw.js').toString();for(const r of images.records.values())assert(sw.includes('./'+r.path));
});
