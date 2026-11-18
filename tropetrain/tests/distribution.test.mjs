import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('downloaded entry point uses a classic bundle instead of file-origin ES modules',()=>{
  const html=read('index.html'), bundle=read('app.bundle.js');
  assert.doesNotMatch(html,/type=["']module["']/);
  assert.match(html,/<script defer src="\.\/app\.bundle\.js"><\/script>/);
  assert.doesNotMatch(bundle,/^\s*(?:import|export)\s/m);
  assert.doesNotThrow(()=>new vm.Script(bundle));
  assert.match(html,/id="startup-status"/);
});
test('standalone HTML embeds runtime, source Hebrew, CSS and font',()=>{
  const html=read('TropeTrain.html');
  assert.doesNotMatch(html,/<script[^>]+src=/);
  assert.doesNotMatch(html,/<link[^>]+rel="stylesheet"/);
  assert.match(html,/data:font\/ttf;base64,/);
  assert.match(html,/בְּרֵאשִׁ֖ית/);
  assert.match(html,/id="compact-play"/);
  assert.match(html,/dataset\.ready/);
});
