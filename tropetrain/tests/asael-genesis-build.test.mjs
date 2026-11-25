import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{restoredPortableHtml,portableProgramBytes,portableFileBytes}from'./portable-artifact.mjs';
import{ASAEL_GENESIS_PASSAGES}from'../asael-genesis-passage-data.js';
import{ASAEL_GENESIS_WORD_SUPPORT}from'../asael-genesis-word-support-summary.js';
const version=JSON.parse(readFileSync(new URL('../package.json',import.meta.url))).version;
const read=n=>readFileSync(new URL('../'+n,import.meta.url));
test('normal and portable builds retain every new source byte and all four support packets without bundling optional originals',()=>{
 const normal=read('index.html').toString(),portable=restoredPortableHtml(read('TropeTrain.html')).toString(),program=read('app.bundle.js');
 assert.deepEqual(portableProgramBytes(read('TropeTrain.html')).bytes,program);
 for(const html of[normal,portable]){assert(html.includes('v'+version));assert(html.includes('id="word-timing-source-status"'));assert(html.includes('Genesis passage candidates and unresolved source discrepancies'));assert(html.includes('no corrected range or reviewed word timing is assigned'));}
 for(const n of['docs/ASAEL-GENESIS-PASSAGES.json','docs/ASAEL-GENESIS-WORD-SUPPORT.json',ASAEL_GENESIS_PASSAGES.sourcePack.file,'assets/voice-studies/asael-genesis-passages-NOTICE.txt']){
  const mime=n.endsWith('.zip')?'application/zip':n.endsWith('.txt')?'text/plain':'application/json';assert(portable.includes('data:'+mime+';base64,'+read(n).toString('base64')),n);
 }
 for(const r of ASAEL_GENESIS_WORD_SUPPORT.records)assert(program.includes(Buffer.from(read(r.file).toString('base64'))),r.file);
 const sw=read('sw.js').toString();assert(sw.includes('tropetrain-v95-genesis-recorded-melodies'));assert(!sw.includes('upload.wikimedia.org'));assert(portableFileBytes()<100*1024*1024);assert(104857600-portableFileBytes()>8*1024*1024);
});
