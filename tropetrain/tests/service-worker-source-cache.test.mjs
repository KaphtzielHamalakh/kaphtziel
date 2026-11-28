import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const scope='https://example.test/tropetrain/';
function fixture(){
 const listeners={},stores=new Map(),deleted=[],network=[],state={offline:false,skip:0,claim:0};
 const key=x=>typeof x==='string'?new URL(x,scope).href:x.url;
 const cache=name=>{if(!stores.has(name))stores.set(name,new Map());const items=stores.get(name);return {async addAll(files){for(const file of files)items.set(key(file),new Response('included'));},async match(request){return items.get(key(request))?.clone();},async put(request,response){items.set(key(request),response);}};};
 const self={registration:{scope},addEventListener(type,fn){listeners[type]=fn;},async skipWaiting(){state.skip++;},clients:{async claim(){state.claim++;}}};
 const context={self,URL,Response,location:{origin:new URL(scope).origin},caches:{async open(name){return cache(name);},async keys(){return [...stores.keys()];},async delete(name){deleted.push(name);return stores.delete(name);}},async fetch(request,options){const url=key(request);network.push({url,options});if(state.offline)throw Error('server unavailable');return new Response('server:'+url,{headers:{'content-type':url.includes('TropeTrain.html')?'text/html':'application/octet-stream'}});}};
 const info=vm.runInNewContext(readFileSync(new URL('../sw.js',import.meta.url),'utf8')+'\n({CACHE,VERSION,FILES});',context);
 async function lifecycle(type){const waits=[];listeners[type]({waitUntil:p=>waits.push(p)});await Promise.all(waits);}
 async function message(type){const waits=[],results=[];listeners.message({data:{type},ports:[{postMessage:r=>results.push(r)}],waitUntil:p=>waits.push(p)});await Promise.all(waits);return results[0];}
 async function request(path,{mode='cors'}={}){let response;const waits=[],r={url:new URL(path,scope).href,method:'GET',mode};listeners.fetch({request:r,respondWith:p=>{response=p;},waitUntil:p=>waits.push(p)});const result=await response;await Promise.all(waits);return result;}
 return {info,stores,cache,deleted,network,state,lifecycle,message,request};
}
test('the new worker activates only after complete caching and preserves separate original-recording caches',async()=>{
 const f=fixture();f.stores.set('tropetrain-v109-baer-no46-full-word-study',new Map());f.stores.set('tropetrain-source-audio-v1',new Map());f.stores.set('other-app-cache',new Map());
 await f.lifecycle('install');assert.equal(f.state.skip,1);assert.equal(f.stores.get(f.info.CACHE).size,new Set(f.info.FILES).size);await f.lifecycle('activate');assert.equal(f.state.claim,1);assert.deepEqual(f.deleted,['tropetrain-v109-baer-no46-full-word-study']);assert(f.stores.has('tropetrain-source-audio-v1'));assert(f.stores.has('other-app-cache'));
 assert.equal((await f.message('tropetrain-offline-status')).ready,true);
 f.stores.get(f.info.CACHE).delete(new URL('./assets/scores/baer-no105-third-p35.png',scope).href);assert.equal((await f.message('tropetrain-offline-status')).ready,false);
});
test('versioned programs and exact source facsimiles reopen from cache, while unversioned navigation still checks for new releases',async()=>{
 const f=fixture();await f.lifecycle('install');for(const file of ['app.bundle.js?v=0.112.0','style.css?v=0.112.0','assets/scores/baer-no105-second-p30.png']){assert.equal(await(await f.request(file)).text(),'included');assert.equal(f.network.length,0);}
 await f.request('./',{mode:'navigate'});assert.equal(f.network.length,1);
 await f.request('app.bundle.js?v=0.109.0');assert.equal(f.network.length,2,'a different version cannot reuse the current program');
 f.state.offline=true;assert.equal(await(await f.request('index.html?uncached=1',{mode:'navigate'})).text(),'included');assert.equal((await f.request('assets/scores/baer-no105-first-p30.png')).status,200);
});
test('HTTP portable-page saving is complete, uses the existing HTTP cache, deduplicates concurrent requests and supports offline reopening',async()=>{
 const f=fixture();await f.lifecycle('install');const results=await Promise.all([f.message('tropetrain-save-portable'),f.message('tropetrain-save-portable')]);assert(results.every(r=>r.ready&&r.version==='0.112.0'));assert.equal(f.network.length,1);assert.equal(f.network[0].options.cache,'force-cache');
 f.state.offline=true;const r=await f.request('TropeTrain.html?v=0.112.0',{mode:'navigate'});assert.equal(r.status,200);assert.match(await r.text(),/server:/);assert.equal(f.network.length,1);assert.equal((await f.message('tropetrain-save-portable')).ready,true);assert.equal(f.network.length,1);
 const missing=fixture();await missing.lifecycle('install');missing.state.offline=true;assert.equal((await missing.message('tropetrain-save-portable')).ready,false);
});
