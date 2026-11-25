import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
test('normal and portable distributions contain fresh original timing-group evidence without claiming additional individual word times',()=>{
 const path='docs/RECORDING-TIMING-GROUPS.json',raw=read(path),report=JSON.parse(raw),html=read('index.html').toString(),portable=restoredPortableHtml(read('TropeTrain.html')).toString();
 assert.equal(report.schema,'tropetrain-recording-timing-groups-v1');assert.equal(report.groups.length,5);assert.equal(report.counts.collectivelyCoveredWords,43);assert.equal(report.counts.additionalIndividualWordTimes,0);assert.equal(report.counts.unchangedDurationFittingWordWindows,79178);assert.equal(report.counts.countMismatchWordsStillWithheld,748);assert.equal(report.counts.durationOverflowWordsStillWithheld,16);
 for(const input of report.inputs)assert.equal(createHash('sha256').update(read(input.path)).digest('hex'),input.sha256,input.path);
 for(const group of report.groups){assert.equal(group.individualWordTimes,null);assert.equal(group.syllableTimes,null);assert.equal(group.phonemes,null);assert.equal(group.acousticReview,null);assert.equal(group.wordIds.length,group.occurrenceIds.length);assert.equal(group.wordIds.length,group.readerHebrew.length);}
 assert(html.includes('href="./'+path+'"'));assert(portable.includes('data:application/json;base64,'+raw.toString('base64')));assert(portableFileBytes()<100*1024*1024);
});
