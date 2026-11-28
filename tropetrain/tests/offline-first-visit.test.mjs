import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const code=readFileSync(new URL('../sw.js',import.meta.url),'utf8'),origin='http://localhost:8808',scope=origin+'/tropetrain/';
function worker(saved){const handlers={},seen=[];const cache={async match(request){const url=typeof request==='string'?request:request.url;seen.push(url);return saved.get(url);}};vm.runInNewContext(code,{URL,Response,location:{origin},self:{registration:{scope},addEventListener(name,handler){handlers[name]=handler;}},caches:{async open(name){assert.equal(name,'tropetrain-v109-baer-no46-full-word-study');return cache;}},fetch:async()=>{throw Error('Preview is stopped');}});return {seen,request(path,mode='navigate',method='GET'){let response;handlers.fetch({request:{url:new URL(path,scope).href,method,mode},respondWith(value){response=value;}});return response;}};}

test('a versioned first-visit root or index navigation recovers the current cached app page',async()=>{
 for(const path of ['?v=0.100.0','index.html?v=0.100.0']){const w=worker(new Map([[scope+'index.html',new Response('current version')]]));assert.equal(await(await w.request(path)).text(),'current version');assert.equal(w.seen.at(-1),scope+'index.html');}
 const w=worker(new Map([[scope,new Response('cached root')]]));assert.equal(await(await w.request('?v=0.100.0')).text(),'cached root');
});

test('an exact cached portable document is preserved and missing scripts or portable pages never receive the normal HTML',async()=>{
 const path='TropeTrain.html?v=0.100.0',w=worker(new Map([[scope+path,new Response('exact portable')],[scope+'index.html',new Response('normal app')]]));assert.equal(await(await w.request(path)).text(),'exact portable');
 for(const [path,mode]of [['app.bundle.js?v=missing','same-origin'],['TropeTrain.html?v=missing','navigate'],['unrelated.html','navigate']]){const empty=worker(new Map([[scope+'index.html',new Response('normal app')]]));assert.equal((await empty.request(path,mode)).type,'error');}
});

test('offline fallback does not intercept another origin or non-GET requests',()=>{
 const w=worker(new Map());assert.equal(w.request('https://example.org/tropetrain/?v=0.100.0'),undefined);assert.equal(w.request('?v=0.100.0','navigate','POST'),undefined);assert.deepEqual(w.seen,[]);
});
