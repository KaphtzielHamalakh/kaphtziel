import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import {FIT_SOURCES,FIT_SOURCES_SHA256} from '../printed-mam-fit-data.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('both builds retain exact source partitions, original key facsimiles and reusable notice while personal fits and voices remain unreviewed',()=>{
 const raw=read('docs/PRINTED-MAM-FITTING-SOURCES.json');assert.equal(sha(raw),FIT_SOURCES_SHA256);assert.deepEqual(JSON.parse(raw),FIT_SOURCES);
 const normal=read('app.bundle.js').toString(),portable=restoredPortableHtml(read('TropeTrain.html')).toString(),page=read('index.html').toString();
 for(const text of [normal,portable]){
  assert(text.includes(FIT_SOURCES_SHA256),'exact fitting-source identity retained');
  for(const key of FIT_SOURCES.phoneticKey.pages){const bytes=read(key.image);assert.equal(sha(bytes),key.imageSha256);assert.equal(bytes.length,key.imageBytes);assert(text.includes(bytes.toString('base64')),'complete original key facsimile retained');}
 }
 for(const html of [page,portable])for(const id of ['printed-fit-editor','printed-fit-enabled','printed-fit-from','printed-fit-to','printed-fit-mam-from','printed-fit-mam-to','printed-fit-undo','printed-fit-json','printed-fit-key-viewer'])assert(html.includes('id="'+id+'"'),id);
 const notice=read('assets/pronunciation/printed-mam-fitting-NOTICE.txt');assert(portable.includes('data:text/plain;base64,'+notice.toString('base64')),'portable attribution is available offline');assert(!portable.includes('href="./assets/pronunciation/printed-mam-fitting-NOTICE.txt"'),'no broken local notice link');
 assert(page.indexOf('id="printed-fit-key-viewer"')<page.indexOf('src="./app.bundle.js?'),'key dialog exists before inline portable program starts');
 for(const w of FIT_SOURCES.words)for(const k of ['acceptedMapping','phonemes','audioTimes','voice','review'])assert.equal(w[k],null);
 assert(portableFileBytes()<100*1024*1024,'complete portable below actual host limit');
});
