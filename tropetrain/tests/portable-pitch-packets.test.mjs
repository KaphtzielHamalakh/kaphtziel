import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {createHash,webcrypto} from 'node:crypto';import {gzipSync,gunzipSync} from 'node:zlib';
import {packPortablePitchPackets} from '../scripts/pack-portable-pitch-packets.mjs';
import {packPortableProgram,encodePortableProgramBytes93} from '../scripts/pack-portable-program.mjs';
import {decodePortableProgramTransport} from '../scripts/decode-portable-program.mjs';
import {restorePortablePitchPackets} from '../portable-pitch-packet-loader.js';
const sha=b=>createHash('sha256').update(b).digest('hex'),sample={'pt-portion-01-1':Buffer.from('unchanged gzip bytes fixture').toString('base64'),'pt-portion-54-7':'AAEC/w=='};
function fixture(original=JSON.stringify(sample)){
 const packed=packPortablePitchPackets(original),nodes=new Map(),appended=[],target={tagName:'SCRIPT',type:'application/json',textContent:''};nodes.set('source-pitch-packets',target);nodes.set('portable-pitch-packet-proof',{textContent:JSON.stringify(packed.proof)});nodes.set('portable-pitch-packet-data',{textContent:packed.markup.match(/id="portable-pitch-packet-data"[^>]*>([^<]+)<\/script>/)[1]});
 const doc={getElementById:id=>nodes.get(id),createElement:()=>({}),body:{appendChild:n=>{appended.push(n);if(n.id)nodes.set(n.id,n);}}};return {packed,nodes,appended,target,doc,options:{document:doc,subtle:webcrypto.subtle,inflate:DecompressionStream,required:true},original};
}
test('exact original JSON and every opaque source packet survive independent dense/gzip decoding and runtime restoration',async()=>{
 const f=fixture(),p=f.packed.proof,gzip=decodePortableProgramTransport(f.nodes.get('portable-pitch-packet-data').textContent,{format:'tropetrain-portable-program-v3',encoding:p.encoding,gzipBytes:p.gzipBytes});assert.equal(sha(gzip),p.gzipSha256);assert.equal(gunzipSync(gzip).toString(),f.original);
 const result=await restorePortablePitchPackets(f.options);assert.equal(result.restored,2);assert.equal(f.target.textContent,f.original);assert.deepEqual(JSON.parse(f.target.textContent),sample);assert.equal(f.appended.length,0);await assert.rejects(()=>restorePortablePitchPackets(f.options),/repeated/);
});
test('missing carriers, target replacement and wrong format or count fail before modifying the original data slot',async()=>{
 for(const id of ['portable-pitch-packet-proof','portable-pitch-packet-data','source-pitch-packets']){const f=fixture();f.nodes.delete(id);await assert.rejects(()=>restorePortablePitchPackets(f.options));assert.equal(f.target.textContent,'');}
 for(const change of [{format:'other'},{encoding:'raw'},{recordCount:1},{recordCount:513},{packetBytes:64*1024*1024+1},{gzipBytes:0}]){const f=fixture();f.nodes.get('portable-pitch-packet-proof').textContent=JSON.stringify({...f.packed.proof,...change});await assert.rejects(()=>restorePortablePitchPackets(f.options));assert.equal(f.target.textContent,'');}
 const f=fixture();f.target.type='text/javascript';await assert.rejects(()=>restorePortablePitchPackets(f.options));assert.equal(f.target.textContent,'');
});
test('changed hashes, truncated transport, noncanonical padding and wrong output bounds cannot produce partial pitch data',async()=>{
 for(const field of ['packetSha256','gzipSha256']){const f=fixture();f.nodes.get('portable-pitch-packet-proof').textContent=JSON.stringify({...f.packed.proof,[field]:'0'.repeat(64)});await assert.rejects(()=>restorePortablePitchPackets(f.options));assert.equal(f.target.textContent,'');}
 for(const change of [s=>s.slice(0,-1),s=>s+'!',s=>'<'+s.slice(1)]){const f=fixture();f.nodes.get('portable-pitch-packet-data').textContent=change(f.nodes.get('portable-pitch-packet-data').textContent);await assert.rejects(()=>restorePortablePitchPackets(f.options));assert.equal(f.target.textContent,'');}
 for(const delta of [-1,1]){const f=fixture();f.nodes.get('portable-pitch-packet-proof').textContent=JSON.stringify({...f.packed.proof,packetBytes:Buffer.byteLength(f.original)+delta});await assert.rejects(()=>restorePortablePitchPackets(f.options));assert.equal(f.target.textContent,'');}
});
test('malformed JSON, invalid UTF8, noncanonical base64 and unexpected packet identities are rejected atomically',async()=>{
 for(const object of [{'__unexpected__':'AA=='},{'pt-portion-01-1':'AB=='},{'pt-portion-01-1':'not base64!'},['AA==']]){let f;try{f=fixture(JSON.stringify(object));}catch{continue;}await assert.rejects(()=>restorePortablePitchPackets(f.options));assert.equal(f.target.textContent,'');}
 for(const raw of [Buffer.from('{bad JSON'),Buffer.from([0xc3,0x28])]){const f=fixture(),gzip=gzipSync(raw);f.nodes.get('portable-pitch-packet-proof').textContent=JSON.stringify({...f.packed.proof,packetBytes:raw.length,packetSha256:sha(raw),gzipBytes:gzip.length,gzipSha256:sha(gzip)});f.nodes.get('portable-pitch-packet-data').textContent=encodePortableProgramBytes93(gzip);await assert.rejects(()=>restorePortablePitchPackets(f.options));assert.equal(f.target.textContent,'');}
});
test('the actual emitted startup restores original pitch data before appending the exact program; missing data refuses startup',async()=>{
 const f=fixture(),program='/* original executable fixture */',packed=packPortableProgram(program,{pitchPackets:true});for(const id of ['portable-program-proof','portable-program-data'])f.nodes.set(id,{textContent:packed.markup.match(new RegExp('id="'+id+'"[^>]*>([^<]*)<\\/script>'))[1]});const status={hidden:true,setAttribute(){},appendChild(){}};f.nodes.set('startup-status',status);const executed=[],append=f.doc.body.appendChild;f.doc.body.appendChild=n=>{if(n.id==='portable-recovered-program'){assert.equal(f.target.textContent,f.original);executed.push(n.textContent);}append(n);};
 const loader=packed.markup.match(/id="portable-program-loader">([\s\S]*?)<\/script>/)[1],globals={document:f.doc,DecompressionStream,crypto:webcrypto,Uint8Array,TextEncoder,TextDecoder,Blob,atob,btoa};const result=await vm.runInNewContext(loader,globals);assert(result.started);assert.deepEqual(executed,[program]);assert.equal(result.evidence.pitchPackets.restored,2);
 const g=fixture();g.nodes.delete('portable-pitch-packet-proof');for(const id of ['portable-program-proof','portable-program-data'])g.nodes.set(id,f.nodes.get(id));g.nodes.set('startup-status',status);const failed=await vm.runInNewContext(loader,{...globals,document:g.doc});assert.equal(failed.started,false);assert.equal(g.target.textContent,'');assert(!g.appended.some(n=>n.id==='portable-recovered-program'));
});
