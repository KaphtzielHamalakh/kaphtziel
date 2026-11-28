import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {decodePortableProgramTransport} from '../scripts/decode-portable-program.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
test('physical portable pitch envelope independently restores all378 exact original opaque files within the retained reserve',()=>{
 const raw=read('TropeTrain.html'),html=raw.toString(),audit=JSON.parse(read('docs/PORTABLE-PITCH-PACKET-AUDIT.json')),manifest=JSON.parse(read('data/pitch/manifest.json'));
 const p=JSON.parse(html.match(/<script id="portable-pitch-packet-proof" type="application\/json">([^<]+)<\/script>/)[1]),encoded=html.match(/<script id="portable-pitch-packet-data" type="application\/octet-stream">([^<]+)<\/script>/)[1];
 assert.equal(p.format,'tropetrain-source-pitch-packets-v1');assert.equal(p.recordCount,378);assert.equal(p.encoding,'gzip+html-base93');
 const gzip=decodePortableProgramTransport(encoded,{format:'tropetrain-portable-program-v3',encoding:p.encoding,gzipBytes:p.gzipBytes});assert.equal(sha(gzip),p.gzipSha256);
 const bytes=gunzipSync(gzip,{maxOutputLength:p.packetBytes});assert.equal(bytes.length,p.packetBytes);assert.equal(sha(bytes),p.packetSha256);
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),packet=JSON.parse(text);assert.equal(Object.keys(packet).length,378);
 const expected=Object.fromEntries(manifest.records.map(r=>[r.id,read('data/pitch/'+r.file).toString('base64')]));assert.equal(text,JSON.stringify(expected));
 for(const r of manifest.records){const file=Buffer.from(packet[r.id],'base64');assert.deepEqual(file,read('data/pitch/'+r.file));assert.equal(sha(file),r.sha256);}
 assert.deepEqual(audit.packet,p);assert.equal(audit.version,'0.111.0');for(const pin of audit.inputs)assert.equal(sha(read(pin.path)),pin.sha256,pin.path);
 assert(html.includes('<script id="source-pitch-packets" type="application/json"></script>'));assert(raw.length<=100*1024*1024-4*1024*1024);
});
