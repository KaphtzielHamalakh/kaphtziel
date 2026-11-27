import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import {shareProgramImages} from '../scripts/share-program-images.mjs';
import {packPortableProgram} from '../scripts/pack-portable-program.mjs';
import {restorePortableProgramImages} from '../portable-program-images.js';
import {startPortableProgram} from '../portable-program-loader.js';
const uri='data:image/png;base64,AQIDBA==',other='data:image/jpeg;base64,BQYHCA==';
function fixture(){
 const program=`globalThis.source={image:'${uri}',hebrew:'בְּרֵאשִׁ֖ית',review:null};`,packed=packPortableProgram(program),html=`<img id="source" src="${uri}" alt="Original scan"><img id="other" src="${other}"><a href="#source" data-embedded-image="source">Full original</a>${packed.markup}`,shared=shareProgramImages(html,program),nodes=new Map(),targets=[],links=[],executed=[],context={};
 const make=tag=>({tag,attrs:{},hidden:true,textContent:'',children:[],setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;},appendChild(n){this.children.push(n);}});
 const image=make('img');image.setAttribute('data-portable-program-image','0');targets.push(image);nodes.set('source',image);
 const link=make('a');link.setAttribute('data-embedded-image','source');link.setAttribute('href','#source');links.push(link);
 nodes.set('portable-program-images-proof',{textContent:JSON.stringify(shared.proof)});
 for(const id of ['portable-program-proof','portable-program-data'])nodes.set(id,{textContent:shared.html.match(new RegExp('id="'+id+'"[^>]*>([^<]+)'))[1]});
 const status=make('p');nodes.set('startup-status',status);
 const doc={getElementById:id=>nodes.get(id),querySelectorAll:q=>q==='img[data-portable-program-image]'?targets:q==='a[data-embedded-image]'?links:[],createElement:make,body:{appendChild(n){executed.push(n.textContent);vm.runInNewContext(n.textContent,context);}}};
 return {program,packed,shared,nodes,targets,links,image,link,doc,executed,context,status,options:{document:doc,subtle:webcrypto.subtle}};
}
test('only an exact complete image already in the normal program is shared; other images and source text remain literal',()=>{
 const f=fixture();assert.equal(f.shared.count,1);assert.equal(f.shared.html.split(uri).length,1);assert(f.shared.html.includes(`src="${other}"`));assert(f.shared.html.includes('alt="Original scan"'));assert.equal(f.shared.proof.records[0].bytes,4);assert.equal(f.shared.proof.records[0].uses,1);assert(!f.shared.html.includes(`id="source" src=`));assert.throws(()=>shareProgramImages(f.shared.html,f.program),/already shared/);
});
test('the shared source image and its full-resolution link recover exact bytes before any application execution',async()=>{
 const f=fixture(),r=await restorePortableProgramImages(f.program,f.options);assert.equal(r.restored,1);assert.equal(r.sourceBytes,4);assert.equal(f.image.getAttribute('src'),uri);assert.equal(f.link.getAttribute('href'),uri);assert.equal(f.executed.length,0);
});
test('changed program, raw image digest, missing image envelope and unknown bindings fail without partial image writes',async()=>{
 for(const kind of ['program','raw-sha','envelope','binding','link']){
  const f=fixture();let program=f.program;
  if(kind==='program')program+=' ';if(kind==='raw-sha'){const p=JSON.parse(f.nodes.get('portable-program-images-proof').textContent);p.records[0].sha256='0'.repeat(64);f.nodes.get('portable-program-images-proof').textContent=JSON.stringify(p);}if(kind==='envelope')f.nodes.delete('portable-program-images-proof');if(kind==='binding')f.image.setAttribute('data-portable-program-image','9');if(kind==='link')f.link.setAttribute('data-embedded-image','missing');
  await assert.rejects(restorePortableProgramImages(program,f.options),undefined,kind);assert.equal(f.image.getAttribute('src'),null,kind);assert.equal(f.link.getAttribute('href'),'#source',kind);assert.equal(f.executed.length,0);
 }
});
test('portable image failure withholds the program and exposes the existing recovery link',async()=>{
 const f=fixture();f.image.setAttribute('data-portable-program-image','7');const result=await startPortableProgram(null,{...f.options,beforeStart:({program})=>restorePortableProgramImages(program,f.options)});assert.equal(result.started,false);assert.equal(f.executed.length,0);assert.equal(f.status.hidden,false);assert.equal(f.status.children[0].href,'https://kaphtziel.com/tropetrain/');
});
test('the actual inline portable initializer restores images then executes the unchanged program with Hebrew and null review retained',async()=>{
 const f=fixture(),loader=f.shared.html.match(/id="portable-program-loader">([\s\S]*?)<\/script>/)[1];const r=await vm.runInNewContext(loader,{document:f.doc,DecompressionStream,crypto:webcrypto,Uint8Array,TextEncoder,TextDecoder,Blob,atob});assert(r.started);assert.equal(r.evidence.sharedImages.restored,1);assert.deepEqual(f.executed,[f.program]);assert.equal(f.context.source.image,uri);assert.equal(f.context.source.hebrew,'בְּרֵאשִׁ֖ית');assert.equal(f.context.source.review,null);assert.equal(f.image.getAttribute('src'),uri);assert.equal(f.link.getAttribute('href'),uri);
});
test('a page without shared images retains the existing portable initialization contract',async()=>{
 const f=fixture();f.nodes.delete('portable-program-images-proof');f.targets.length=0;assert.deepEqual(await restorePortableProgramImages(f.program,f.options),{restored:0});assert.equal(shareProgramImages('<img src="'+other+'">',f.program).count,0);
});
