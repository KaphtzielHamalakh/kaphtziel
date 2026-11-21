import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {ReferenceAudioStore} from '../reference-audio-store.js';
class Cache {
  constructor(){this.values=new Map();this.writes=0;}
  async keys(){return [...this.values.keys()];}
  async get(key){return this.values.get(key);}
  async put(key,value){if(this.fail)throw Error('Storage denied');this.writes++;this.values.set(key,value);}
  async delete(key){this.values.delete(key);}
}
function record(n=1){const data=Uint8Array.from([n,2,3,4,5]);return {id:'fixture-'+n,title:'Fixture '+n,data,audio:{filename:'fixture.mp3',url:'https://example.invalid/fixture-'+n,bytes:data.length,sha1:createHash('sha1').update(data).digest('hex'),localFile:null}};}
function storeFor(records,cache=new Cache()){
  const fetched=[],revoked=[];let n=0;
  const store=new ReferenceAudioStore({cache,digest:(...args)=>webcrypto.subtle.digest(...args),fetchFile:async url=>{fetched.push(url);const rec=records.find(r=>r.audio.url===url);return new Response(rec.data);},makeUrl:()=>`blob:fixture-${++n}`,revokeUrl:url=>revoked.push(url),openingUrl:'./included.mp3'});
  return {store,cache,fetched,revoked};
}
test('only explicitly loaded originals are fetched, verified, saved and usable after a new store instance',async()=>{
  const r=record(),first=storeFor([r]);assert.equal(await first.store.has(r),false);assert.equal(first.fetched.length,0);await first.store.load(r);assert.equal(first.cache.writes,1);assert.equal(await first.store.has(r),true);
  const next=storeFor([r],first.cache);assert.equal(await next.store.has(r),true);assert.match(await next.store.url(r),/^blob:/);assert.equal(next.fetched.length,0);
  assert.deepEqual(new Uint8Array(await first.cache.values.get(r.audio.sha1).blob.arrayBuffer()),r.data);
});
test('wrong byte count or checksum is rejected before saving or generating playable URLs',async()=>{
  const r=record(),f=storeFor([r]);f.store.fetchFile=async()=>new Response(new Uint8Array([1]));await assert.rejects(f.store.load(r),/size differs/);assert.equal(f.cache.writes,0);
  f.store.fetchFile=async()=>new Response(new Uint8Array([9,2,3,4,5]));await assert.rejects(f.store.load(r),/checksum differs/);assert.equal(f.cache.writes,0);assert.equal(f.store.urls.size,0);
});
test('original AAC media type survives download and device reuse, while older MP3 records retain their default',async()=>{
  const mp3=record(1),aac=record(2);aac.audio.filename='fixture.m4a';aac.audio.mimeType='audio/mp4';
  const first=storeFor([mp3,aac]),types=[];first.store.makeUrl=blob=>{types.push(blob.type);return 'blob:'+blob.type;};
  for(const r of [mp3,aac]){await first.store.load(r);await first.store.url(r);}
  assert.deepEqual(types,['audio/mpeg','audio/mp4']);
  const next=storeFor([aac],first.cache);next.store.makeUrl=blob=>{assert.equal(blob.type,'audio/mp4');return 'blob:cached-aac';};
  assert.equal(await next.store.url(aac),'blob:cached-aac');assert.equal(next.fetched.length,0);
  assert.deepEqual(new Uint8Array(await first.cache.values.get(aac.audio.sha1).blob.arrayBuffer()),aac.data);
});
test('corrupt saved bytes are invalidated and require an explicit reload',async()=>{
  const r=record(),cache=new Cache();cache.values.set(r.audio.sha1,{blob:new Blob([new Uint8Array([9,2,3,4,5])])});const f=storeFor([r],cache);
  await assert.rejects(f.store.url(r),/checksum differs/);assert.equal(await f.store.has(r),false);assert.equal(f.fetched.length,0);await f.store.load(r);assert.equal(f.fetched.length,1);assert.equal(await f.store.has(r),true);
});
test('cancelled downloads never become playable or saved',async()=>{
  const r=record(),f=storeFor([r]),controller=new AbortController();controller.abort();await assert.rejects(f.store.load(r,{signal:controller.signal}),{name:'AbortError'});assert.equal(f.fetched.length,0);assert.equal(f.cache.writes,0);
  const second=new AbortController();let release;f.store.fetchFile=()=>new Promise(resolve=>release=resolve);const pending=f.store.load(r,{signal:second.signal});await new Promise(resolve=>setImmediate(resolve));second.abort();release(new Response(r.data));await assert.rejects(pending,{name:'AbortError'});assert.equal(f.cache.writes,0);
});
test('URL and fallback-memory working sets stay bounded and removing one recording preserves the others',async()=>{
  const records=[1,2,3,4].map(record),f=storeFor(records);
  for(const r of records){await f.store.load(r);await f.store.url(r);}assert.equal(f.store.urls.size,3);assert.equal(f.revoked.length,1);assert.equal(await f.store.has(records[0]),true);
  await f.store.remove(records[3]);assert.equal(await f.store.has(records[3]),false);assert.equal(await f.store.has(records[2]),true);
  const memory=storeFor(records);memory.cache.fail=true;for(const r of records)await memory.store.load(r);assert.equal(memory.store.memory.size,3);assert.equal(memory.store.storageAvailable,false);assert.equal(await memory.store.has(records[0]),false);assert.equal(await memory.store.has(records[3]),true);
});
