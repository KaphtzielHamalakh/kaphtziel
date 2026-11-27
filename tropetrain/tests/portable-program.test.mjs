import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {packPortableProgram,encodePortableProgramBytes} from '../scripts/pack-portable-program.mjs';
import {startPortableProgram} from '../portable-program-loader.js';
import {portableProgramBytes,restoredPortableHtml} from './portable-artifact.mjs';
import {decodePortableProgramTransport} from '../scripts/decode-portable-program.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
test('HTML-safe transport round trips all byte values, four-byte extremes and every final padding length',()=>{
 for(const n of[1,2,3,4,5,255,256,257,4093,4094,4095,4096]){
  const bytes=Buffer.from(Array.from({length:n},(_,i)=>(i*197+255)%256)),encoded=encodePortableProgramBytes(bytes),proof={format:'tropetrain-portable-program-v2',encoding:'gzip+html-base85',gzipBytes:n};
  assert.equal(encoded.length,Math.ceil(n/4)*5);assert(!encoded.includes('<'));assert.equal(Buffer.byteLength(encoded),encoded.length);assert.deepEqual(decodePortableProgramTransport(encoded,proof),bytes);
 }
 for(const bytes of[Buffer.alloc(4),Buffer.alloc(4,255),Buffer.from([128,0,0,0]),Buffer.from([0,0,0,1])])assert.deepEqual(decodePortableProgramTransport(encodePortableProgramBytes(bytes),{format:'tropetrain-portable-program-v2',encoding:'gzip+html-base85',gzipBytes:4}),bytes);
});
function fixture(program='globalThis.sample={hebrew:"אֽ͏ָהֳלוֹ֙ בְּרֵאשִׁ֖ית",phonemes:null,review:null};'){
 const packed=packPortableProgram(program),{proof}=packed,gzip=portableProgramBytes(packed.markup).gzip,nodes=new Map(),context={},executed=[];
 const make=tag=>({tag,hidden:true,textContent:'',children:[],setAttribute(k,v){this[k]=v;},appendChild(n){this.children.push(n);}}),status=make('p');nodes.set('startup-status',status);nodes.set('portable-program-data',{textContent:encodePortableProgramBytes(gzip)});nodes.set('portable-program-proof',{textContent:JSON.stringify(proof)});
 const doc={getElementById:id=>nodes.get(id),createElement:make,body:{appendChild(n){executed.push(n.textContent);vm.runInNewContext(n.textContent,context);}}};
 return {packed,program,proof,gzip,doc,nodes,status,context,executed,options:{document:doc,subtle:webcrypto.subtle}};
}
test('portable wrapper independently recovers the exact original UTF8 program and retains all Hebrew/CGJ/null bytes',async()=>{
 const f=fixture(),decoded=portableProgramBytes(f.packed.markup);assert.equal(decoded.bytes.toString(),f.program);assert.equal(decoded.proof.programSha256,sha(Buffer.from(f.program)));assert(!f.packed.markup.includes(f.program));const result=await startPortableProgram(null,f.options);assert(result.started);assert.deepEqual(f.executed,[f.program]);assert.equal(f.context.sample.hebrew,'אֽ͏ָהֳלוֹ֙ בְּרֵאשִׁ֖ית');assert.equal(f.context.sample.phonemes,null);assert.equal(f.context.sample.review,null);
});
test('the same inline loader emitted in the artifact starts once using only its embedded proof and actual browser-standard gzip API',async()=>{
 const f=fixture(),loader=f.packed.markup.match(/id="portable-program-loader">([\s\S]*?)<\/script>/)[1];const result=await vm.runInNewContext(loader,{document:f.doc,DecompressionStream,crypto:webcrypto,Uint8Array,TextDecoder,Blob,atob});assert(result.started);assert.deepEqual(f.executed,[f.program]);
});
test('corrupted and missing packets never execute a partial program and expose a usable live-trainer recovery link',async()=>{
 for(const kind of ['missing','changed-byte','malformed-proof']){
  const f=fixture();if(kind==='missing')f.nodes.delete('portable-program-data');else if(kind==='changed-byte'){const b=Buffer.from(f.gzip);b[15]^=1;f.nodes.get('portable-program-data').textContent=encodePortableProgramBytes(b);}else f.nodes.get('portable-program-proof').textContent='{';
  const result=await startPortableProgram(null,f.options);assert.equal(result.started,false,kind);assert.equal(f.executed.length,0);assert.equal(f.status.hidden,false);assert.equal(f.status.role,'alert');assert.match(f.status.textContent,/Download a fresh copy/);assert.equal(f.status.children[0].href,'https://kaphtziel.com/tropetrain/');
 }
});
test('unsupported gzip and integrity APIs show recovery without loading a substitute app or musical material',async()=>{
 for(const options of [{inflate:null},{subtle:null}]){const f=fixture(),r=await startPortableProgram(null,{...f.options,...options});assert.equal(r.started,false);assert.equal(f.executed.length,0);assert.equal(f.status.children.length,1);}
});
test('legacy base64 programs still start with identical bytes and the same integrity gates',async()=>{
 const f=fixture();f.nodes.get('portable-program-data').textContent=f.gzip.toString('base64');const r=await startPortableProgram({...f.proof,format:'tropetrain-portable-program-v1',encoding:'gzip+base64'},f.options);assert(r.started);assert.deepEqual(f.executed,[f.program]);
});
test('nonalphabet data, overflow, nonzero padding and mismatched format/encoding never execute',async()=>{
 for(const kind of['character','overflow','padding','format']){
  const f=fixture();let p={...f.proof};
  if(kind==='character'){const n=f.nodes.get('portable-program-data');n.textContent='<'+n.textContent.slice(1);}
  if(kind==='overflow')f.nodes.get('portable-program-data').textContent='~~~~~'+f.nodes.get('portable-program-data').textContent.slice(5);
  if(kind==='padding'){p.gzipBytes=1;p.gzipSha256=sha(Buffer.from([1]));f.nodes.get('portable-program-data').textContent=encodePortableProgramBytes(Buffer.from([1,0,0,1]));}
  if(kind==='format')p.encoding='gzip+base64';
  const r=await startPortableProgram(p,f.options);assert.equal(r.started,false,kind);assert.equal(f.executed.length,0,kind);assert.equal(f.status.hidden,false,kind);
 }
});
test('truncated gzip with a matching transport hash still fails decompression before execution',async()=>{
 const f=fixture(),bytes=f.gzip.subarray(0,-8),proof={...f.proof,gzipBytes:bytes.length,gzipSha256:sha(bytes)};f.nodes.get('portable-program-data').textContent=encodePortableProgramBytes(bytes);const r=await startPortableProgram(proof,f.options);assert.equal(r.started,false);assert.equal(f.executed.length,0);
});
test('decoded size and SHA gates reject extra, missing or changed program bytes',async()=>{
 for(const change of [{programBytes:1},{programBytes:200000},{programSha256:'0'.repeat(64)}]){const f=fixture('globalThis.value="'+'x'.repeat(40000)+'";'),r=await startPortableProgram({...f.proof,...change},f.options);assert.equal(r.started,false);assert.equal(f.executed.length,0);}
});
test('valid gzip carrying invalid UTF8 is withheld instead of normalizing source characters',async()=>{
 const f=fixture(),bytes=Buffer.from([0xc3,0x28]),gzip=gzipSync(bytes);f.nodes.get('portable-program-data').textContent=encodePortableProgramBytes(gzip);const r=await startPortableProgram({...f.proof,programBytes:bytes.length,programSha256:sha(bytes),gzipBytes:gzip.length,gzipSha256:sha(gzip)},f.options);assert.equal(r.started,false);assert.equal(f.executed.length,0);
});
test('logical artifact assertions restore only the program while preserving the exact rest of the page and safe script closing text',()=>{
 const program='globalThis.value="</script>אֽ͏ָהֳלוֹ֙";',packed=packPortableProgram(program),html='<p>בָּרָ֣א</p>'+packed.markup+'<footer>notices</footer>',restored=restoredPortableHtml(html);assert.equal(restored,'<p>בָּרָ֣א</p><script>'+program.replaceAll('</script','<\\/script')+'</script><footer>notices</footer>');
});
test('actual portable artifact independently decodes to the complete normal program byte for byte, within the physical host limit',()=>{
 const html=readFileSync(new URL('../TropeTrain.html',import.meta.url)),normal=readFileSync(new URL('../app.bundle.js',import.meta.url)),decoded=portableProgramBytes(html);assert.deepEqual(decoded.bytes,normal);assert(html.length<100*1024*1024);assert(!/<script[^>]+src=/.test(html.toString()));assert(!/<link[^>]+rel="stylesheet"/.test(html.toString()));assert.equal(sha(normal),decoded.proof.programSha256);assert(decoded.proof.gzipBytes<normal.length);
});
