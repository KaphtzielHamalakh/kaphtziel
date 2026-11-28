// Independent physical-artifact recovery for source-image retention assertions.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
import {decodePortableProgramTransport} from '../scripts/decode-portable-program.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
let cached;
export function programSourceImages(){
 if(cached)return cached;
 const raw=readFileSync(new URL('../TropeTrain.html',import.meta.url),'utf8'),proof=JSON.parse(raw.match(/<script id="portable-source-image-proof"[^>]*>([^<]+)<\/script>/)?.[1]??'null');
 assert.equal(proof?.format,'tropetrain-program-source-images-v1');assert.equal(proof.encoding,'gzip+html-base93');assert(Number.isSafeInteger(proof.packetBytes)&&proof.packetBytes>0&&proof.packetBytes<=128*1024*1024);assert(Number.isSafeInteger(proof.gzipBytes)&&proof.gzipBytes>0&&proof.gzipBytes<=64*1024*1024);
 const encoded=raw.match(/<script id="portable-source-image-data"[^>]*>([^<]+)<\/script>/)?.[1];assert(encoded,'complete source-image transport is present');
 const gzip=decodePortableProgramTransport(encoded,{format:'tropetrain-portable-program-v3',encoding:proof.encoding,gzipBytes:proof.gzipBytes});assert.equal(sha(gzip),proof.gzipSha256);
 const bytes=gunzipSync(gzip,{maxOutputLength:proof.packetBytes});assert.equal(bytes.length,proof.packetBytes);assert.equal(sha(bytes),proof.packetSha256);const packet=JSON.parse(bytes.toString('utf8'));assert.equal(packet.format,proof.format);assert.equal(packet.records.length,proof.imageCount);
 const records=new Map();for(const r of packet.records){assert(!records.has(r.key));assert.equal(r.key,sha(Buffer.from(r.dataUri)));assert.equal(r.key,r.dataUriSha256);assert.equal(Buffer.byteLength(r.dataUri),r.dataUriBytes);const original=readFileSync(new URL('../'+r.path,import.meta.url));assert.equal(original.length,r.bytes);assert.equal(sha(original),r.sha256);assert(Buffer.from(r.dataUri.split(',')[1],'base64').equals(original));records.set(r.key,r);}
 cached={proof,records};return cached;
}
export function assertProgramSourceImage(program,uri,path=null){
 const text=program.toString();if(text.includes(uri))return;
 const key=sha(Buffer.from(uri)),record=programSourceImages().records.get(key);assert(record,'portable edition retains the complete original source URI');assert.equal(record.dataUri,uri);if(path!==null)assert.equal(sha(readFileSync(new URL('../'+path,import.meta.url))),record.sha256);
 assert(text.includes(key),'normal program contains the pinned image identity');assert(text.includes(record.path),'normal program uses the identical canonical source file');assert(readFileSync(new URL('../sw.js',import.meta.url),'utf8').includes('./'+record.path),'normal offline cache retains the entire image');
}
