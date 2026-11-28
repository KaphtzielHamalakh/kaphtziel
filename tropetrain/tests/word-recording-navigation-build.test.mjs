import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {restoredPortableHtml,portableProgramBytes,portableFileBytes} from './portable-artifact.mjs';
const read=n=>readFileSync(new URL('../'+n,import.meta.url));
test('normal and portable readers expose the same exact-word comparison with opt-in audio and current cache',()=>{
 const physical=read('TropeTrain.html'),normal=read('index.html').toString(),portable=restoredPortableHtml(physical).toString();
 assert.deepEqual(portableProgramBytes(physical).bytes,read('app.bundle.js'));
 for(const html of [normal,portable]){for(const id of ['word-recording-study','word-recording-status','word-recording-choice','word-recording-open','word-recording-example'])assert(html.includes('id="'+id+'"'));assert(html.includes('id="word-recording-open" type="button" hidden disabled'));assert(html.includes('Opening a study does not play or download audio.'));assert(html.includes('href="#word-recording-study"'));}
 assert(read('sw.js').toString().includes('tropetrain-v108-baer-no111-word-study'));assert(!read('sw.js').toString().includes('model.safetensors'));assert(100*1024*1024-portableFileBytes(physical)>4*1024*1024);
});
