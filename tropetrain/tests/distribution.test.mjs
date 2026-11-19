import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('downloaded entry point uses a classic bundle instead of file-origin ES modules',()=>{
  const html=read('index.html'), bundle=read('app.bundle.js');
  assert.doesNotMatch(html,/type=["']module["']/);
  assert.match(html,/<script defer src="\.\/app\.bundle\.js\?v=0\.4\.0"><\/script>/);
  assert.doesNotMatch(bundle,/^\s*(?:import|export)\s/m);
  assert.doesNotThrow(()=>new vm.Script(bundle));
  assert.match(html,/id="startup-status"/);
});
test('browser bundle embeds the same complete Torah data as the source corpus',()=>{
  const bundle=read('app.bundle.js');
  const encoded=bundle.match(/var encoded = "([A-Za-z0-9+/=]+)"/);
  assert.ok(encoded,'Embedded gzip corpus is present.');
  const data=JSON.parse(gunzipSync(Buffer.from(encoded[1],'base64')).toString('utf8'));
  assert.deepEqual(data.manifest,JSON.parse(read('data/torah/manifest.json')));
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
  assert.doesNotMatch(html,/<script[^>]+src=/);
  assert.doesNotMatch(html,/<link[^>]+rel="stylesheet"/);
  assert.match(html,/data:font\/ttf;base64,/);
  assert.match(html,/data:font\/otf;base64,/);
  assert.match(html,/Reserved Font Name/);
  assert.match(html,/בְּרֵאשִׁ֖ית/);
  assert.match(html,/id="compact-play"/);
  assert.match(html,/dataset\.ready/);
  assert.ok(html.includes(read('app.bundle.js').replaceAll('</script','<\\/script')),'Script contents survive HTML embedding without replacement-string expansion.');
});
