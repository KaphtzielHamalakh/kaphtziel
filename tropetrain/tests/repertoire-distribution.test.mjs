import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('normal and standalone bundles embed the exact complete additional Hebrew library without extra data requests',()=>{
  const bundle=read('app.bundle.js'),standalone=restoredPortableHtml(read('TropeTrain.html'));
  const encoded=bundle.match(/repertoireEncoded\s*=\s*"([A-Za-z0-9+/=]+)"/);assert.ok(encoded);
  const data=JSON.parse(gunzipSync(Buffer.from(encoded[1],'base64')));
  assert.deepEqual(data.manifest,JSON.parse(read('data/repertoire/manifest.json')));assert.equal(data.books.length,26);
  for(const book of data.books)assert.deepEqual(book,JSON.parse(read(`data/repertoire/${book.id}.json`)));
  assert.ok(standalone.includes(encoded[1]));
  assert.doesNotMatch(bundle,/import\(["']\.\/repertoire-data\.js["']\)/);
});

test('the built repertoire decoder round-trips through Web Streams and explicitly refuses missing gzip support',async()=>{
  const bundle=read('app.bundle.js'),repertoireEncoded=bundle.match(/repertoireEncoded\s*=\s*"([A-Za-z0-9+/=]+)"/)[1];
  const decoder=bundle.match(/async function loadRepertoire\(\)\s*\{[\s\S]*?\}(?=\s*var repertoireEncoded;)/)[0];
  const context={repertoireEncoded,atob,Uint8Array,Response,Blob,DecompressionStream};
  const loaded=await vm.runInNewContext('('+decoder+')()',context);
  assert.equal(JSON.stringify(loaded),gunzipSync(Buffer.from(repertoireEncoded,'base64')).toString());
  await assert.rejects(vm.runInNewContext('('+decoder+')()',{...context,DecompressionStream:undefined}),/current browser with gzip support/);
});

test('standalone and offline normal build retain exact repertoire evidence and source audit',()=>{
  const html=restoredPortableHtml(read('TropeTrain.html')),worker=read('sw.js');
  const embedded=[...html.matchAll(/href="data:application\/json;base64,([A-Za-z0-9+/=]+)"/g)].map(match=>Buffer.from(match[1],'base64').toString());
  for(const name of ['REPERTOIRE-SOURCES.json','REPERTOIRE-AUDIT.json']){
    assert.ok(embedded.includes(read('docs/'+name)),name+' survives moving the standalone file');
    assert.ok(worker.includes('./docs/'+name));assert.ok(!html.includes('href="./docs/'+name+'"'));
  }
});
