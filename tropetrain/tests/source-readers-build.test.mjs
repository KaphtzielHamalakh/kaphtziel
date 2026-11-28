import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{restoredPortableHtml,portableProgramBytes,portableFileBytes}from'./portable-artifact.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
test('both finished distributions expose actual source recordings with exact portable evidence and no new bundled audio',()=>{
 const normal=read('index.html').toString(),physical=read('TropeTrain.html'),portable=restoredPortableHtml(physical).toString(),version=JSON.parse(read('package.json')).version;
 assert.deepEqual(portableProgramBytes(physical).bytes,read('app.bundle.js'));
 for(const html of[normal,portable]){assert(html.includes('v'+version));for(const id of['nombody-chukat-open','source-reader-finder','source-reader-book','source-reader-portion','source-reader-reading','source-reader-open','voice-study-recordings','voice-study-source-conflict'])assert(html.includes('id="'+id+'"'));assert(html.includes('Available recorded combinations'));assert(html.includes('exact verse coverage, pronunciation claims and melody realizations await review'));}
 for(const [path,mime]of[['docs/SOURCE-READERS.json','application/json'],['assets/voice-studies/source-readers-sources.zip','application/zip'],['assets/voice-studies/source-readers-NOTICE.txt','text/plain']]){assert(normal.includes('href="./'+path+'"'));assert(portable.includes('data:'+mime+';base64,'+read(path).toString('base64')));assert(read('sw.js').toString().includes('./'+path));}
 assert(read('sw.js').toString().includes('tropetrain-v111-idelsohn-no270-quarter-tones'));assert(portableFileBytes(physical)<100*1024*1024);
});
