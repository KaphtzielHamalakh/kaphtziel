import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('both distributions contain the complete worker/WASM, MIT notice, independent controls and processing evidence',()=>{
 const bundle=read('app.bundle.js'),html=read('TropeTrain.html'),worker=bundle.match(/var RECORDED_PITCH_WORKER_SOURCE\s*=\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*');/);assert.ok(worker,'The worker is embedded, including its WASM, without another runtime fetch.');
 const source=vm.runInNewContext(worker[1],Object.create(null),{timeout:500});assert.equal(typeof source,'string');assert.doesNotThrow(()=>new vm.Script(source));assert.match(source,/Copyright \(c\) 2022 Geraint Luff/);assert.match(source,/WebAssembly/);assert.match(source,/self\.onmessage/);assert.doesNotMatch(source,/^\s*(?:import|export)\s/m);
 for(const id of ['chant-pitch','chant-speed','chant-pitch-cancel','chant-pitch-details']){assert.ok(read('index.html').includes(`id="${id}"`));assert.ok(html.includes(`id="${id}"`));}
 for(const file of ['docs/RECORDED-PITCH-PROCESSING.json','vendor/signalsmith-stretch/NOTICE.txt','vendor/signalsmith-stretch/LICENSE.txt'])assert.ok(html.includes(Buffer.from(read(file)).toString('base64')),file);
 assert.match(read('index.html'),/processed pitch and vocal timbre are approximate/i);
});
