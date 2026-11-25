import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
test('both finished distributions retain fresh personal group-word evidence, blank source times and independent old timing controls',()=>{
 const path='docs/RECORDING-GROUP-WORD-DRAFT.json',raw=read(path),report=JSON.parse(raw),normal=read('index.html').toString(),portable=restoredPortableHtml(read('TropeTrain.html')).toString();assert.equal(report.schema,'tropetrain-recording-group-word-draft-evidence-v1');assert.deepEqual(report.counts,{completeOriginalGroups:5,blankPersonalWords:43,personalBoundariesDistributed:0,additionalIndividualSourceTimes:0});for(const row of report.inputs)assert.equal(createHash('sha256').update(read(row.path)).digest('hex'),row.sha256,row.path);
 for(const group of report.groups){for(const k of ['sourceWordTimes','personalWordTimes','syllableTimes','review'])assert.equal(group[k],null);assert.equal(group.wordIds.length,group.readerHebrew.length);}
 for(const html of [normal,portable])for(const id of ['recording-group-timing-select','recording-group-timing-capture-start','recording-group-timing-capture-end','recording-group-timing-audition','recording-group-timing-whole','recording-group-timing-json','syllable-timing-review','word-timing-review','recording-groups'])assert(html.includes('id="'+id+'"'),id);
 assert(normal.includes('href="./'+path+'"'));assert(portable.includes('data:application/json;base64,'+raw.toString('base64')));assert(portableFileBytes()<100*1024*1024);
});
