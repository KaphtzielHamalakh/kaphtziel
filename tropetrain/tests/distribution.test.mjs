import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('downloaded entry point uses a classic bundle instead of file-origin ES modules',()=>{
  const html=read('index.html'), bundle=read('app.bundle.js');
  assert.doesNotMatch(html,/type=["']module["']/);
  assert.match(html,/<script defer src="\.\/app\.bundle\.js\?v=[0-9.]+"><\/script>/);
  assert.doesNotMatch(bundle,/^\s*(?:import|export)\s/m);
  assert.doesNotThrow(()=>new vm.Script(bundle));
  assert.match(html,/id="startup-status"/);
});
test('browser bundle embeds the same complete Torah data as the source corpus',()=>{
  const bundle=read('app.bundle.js');
  const manifest=JSON.parse(read('data/torah/manifest.json'));
  const candidates=[...bundle.matchAll(/var encoded\w*\s*=\s*"(H4sI[A-Za-z0-9+/=]+)"/g)]
    .map(match=>JSON.parse(gunzipSync(Buffer.from(match[1],'base64')).toString('utf8')))
    .filter(data=>data.manifest?.edition===manifest.edition&&Array.isArray(data.books)&&data.books.length===manifest.books.length&&data.books.every((book,i)=>book.id===manifest.books[i].id));
  assert.equal(candidates.length,1,'Exactly one complete Torah corpus is embedded, independently of other compressed data.');
  const data=candidates[0];
  assert.deepEqual(data.manifest,manifest);
  for(const book of data.books)assert.deepEqual(book,JSON.parse(read(`data/torah/${book.id}.json`)));
});
test('page assets and offline cache use the release version to avoid mixed upgrades',()=>{
  const version=JSON.parse(read('package.json')).version,html=read('index.html'),worker=read('sw.js');
  for(const asset of ['app.bundle.js','style.css']){
    assert.ok(html.includes(`./${asset}?v=${version}`));
    assert.ok(worker.includes(`./${asset}?v=${version}`));
  }
  assert.ok(html.includes(`v${version}`));
});
test('standalone HTML embeds runtime, source Hebrew, CSS and font',()=>{
  const html=read('TropeTrain.html');
  assert.ok(!/<script[^>]+src=/.test(html),'Standalone script is embedded.');
  assert.ok(!/<link[^>]+rel="stylesheet"/.test(html),'Standalone CSS is embedded.');
  assert.match(html,/data:font\/ttf;base64,/);
  assert.match(html,/data:font\/otf;base64,/);
  assert.match(html,/Reserved Font Name/);
  assert.match(html,/בְּרֵאשִׁ֖ית/);
  assert.match(html,/id="compact-play"/);
  assert.match(html,/dataset\.ready/);
  assert.ok(html.includes(read('app.bundle.js').replaceAll('</script','<\\/script')),'Script contents survive HTML embedding without replacement-string expansion.');
});
test('standalone reference audio is losslessly embedded with source attribution and offline assets',()=>{
  const html=read('TropeTrain.html'),worker=read('sw.js');
  const encoded=html.match(/id="reference-audio" src="data:audio\/mpeg;base64,([A-Za-z0-9+/=]+)"/);
  assert.ok(encoded);assert.deepEqual(Buffer.from(encoded[1],'base64'),readFileSync(new URL('../assets/references/Bereshit-1.mp3',import.meta.url)));
  assert.match(html,/Not-a-Box Media Lab/);assert.match(html,/CC BY-SA 3\.0/);assert.match(html,/755c6e9918ba2021bba8b33c46db309c115620d6/);
  assert.ok(!/src="\.\/assets\/references\//.test(html),'Standalone recording is embedded.');
  assert.ok(worker.includes('./assets/references/Bereshit-1.mp3'));assert.ok(worker.includes('./assets/references/NOTICE.txt'));
});

test('whole-Torah source library survives lossless bundling and standalone embedding',()=>{
  const bundle=read('app.bundle.js'),encoded=bundle.match(/var referenceEncoded\s*=\s*"([A-Za-z0-9+/=]+)"/);
  assert.ok(encoded,'Packed reference library is embedded.');
  const original=readFileSync(new URL('../data/references/torah-library.json.gz',import.meta.url));
  assert.deepEqual(Buffer.from(encoded[1],'base64'),original);
  const library=JSON.parse(gunzipSync(original));assert.equal(library.recordings.length,378);assert.equal(library.audit.readerWords,79985);
  assert.ok(read('TropeTrain.html').includes(encoded[1]),'Standalone retains the complete source catalog without an extra network dependency.');
});

test('standalone carries the full evidence map and roadmap without a sibling documentation folder',()=>{
 const html=read('TropeTrain.html'),roadmap=read('docs/RESEARCH.md').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 assert.ok(html.includes('href="#standalone-roadmap"'));assert.ok(html.includes('id="standalone-roadmap"'));
 assert.ok(html.includes(roadmap),'The full inventory and evidence survive moving the standalone file.');
 assert.ok(!html.includes('href="./docs/RESEARCH.md"'));
});
