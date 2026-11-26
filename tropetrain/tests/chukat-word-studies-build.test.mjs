import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{restoredPortableHtml,portableProgramBytes,portableFileBytes}from'./portable-artifact.mjs';import{CHUKAT_WORD_SUPPORT as support}from'../chukat-word-support-summary.js';
const read=n=>readFileSync(new URL('../'+n,import.meta.url));
test('finished normal and portable word study preserves exact program, current feature entry and all new source evidence',()=>{
 const normal=read('index.html').toString(),physical=read('TropeTrain.html'),portable=restoredPortableHtml(physical).toString(),program=read('app.bundle.js'),version=JSON.parse(read('package.json')).version;
 assert.deepEqual(portableProgramBytes(physical).bytes,program);
 for(const html of[normal,portable]){assert(html.includes('v'+version));for(const id of['chukat-word-study','chukat-word-study-open','nombody-chukat-open','word-support-load','word-support-audition'])assert(html.includes('id="'+id+'"'));assert(html.includes('href="#chukat-word-study"'));assert(html.includes('255 unchanged Hebrew words'));assert(html.includes('exact performance endpoints'));assert(html.includes('blank personal word boundaries'));}
 for(const [path,mime]of[['docs/CHUKAT-SOURCE-PASSAGES.json','application/json'],['docs/CHUKAT-WORD-SUPPORT.json','application/json'],['assets/voice-studies/chukat-word-sources.zip','application/zip'],['assets/voice-studies/chukat-word-NOTICE.txt','text/plain']]){assert(normal.includes('href="./'+path+'"'));assert(portable.includes('data:'+mime+';base64,'+read(path).toString('base64')));assert(read('sw.js').toString().includes('./'+path));}
 for(const r of support.records){assert(program.includes(Buffer.from(read(r.file).toString('base64'))));assert(read('sw.js').toString().includes('./'+r.file));}
 assert(read('sw.js').toString().includes('tropetrain-v100-word-recording-navigation'));assert(portableFileBytes(physical)<100*1024*1024);
});
