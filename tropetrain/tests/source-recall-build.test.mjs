import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
test('normal and portable recall controls retain exact source evidence, unassigned sound/reviews and the real host byte limit',()=>{
 const html=restoredPortableHtml(read('TropeTrain.html')).toString(),normal=read('index.html').toString(),raw=read('docs/SOURCE-RECALL.json'),audit=JSON.parse(raw);
 assert.equal(audit.counts.readerWords,79985);assert.equal(audit.counts.verses,5853);assert.equal(audit.counts.includedWords+audit.counts.withheldWords,79985);assert.equal(audit.counts.splitMaqafCards,0);
 for(const key of ['melody','pronunciation','phonemes','audioTimes','singingVoice','musicalReview','phonologicalReview'])assert.equal(audit[key],null);
 for(const row of audit.inputs)assert.equal(createHash('sha256').update(read(row.path)).digest('hex'),row.sha256,row.path);
 for(const id of ['recall-dialog','recall-open','recall-question','recall-answer-word','recall-choices','recall-listen','recall-reveal','recall-next']){assert(html.includes('id="'+id+'"'));assert(normal.includes('id="'+id+'"'));}
 assert(html.includes('data:application/json;base64,'+raw.toString('base64')));assert(!html.includes('href="./docs/SOURCE-RECALL.json"'));assert(html.includes('v'+JSON.parse(read('package.json')).version));assert(portableFileBytes()<100*1024*1024);
});
