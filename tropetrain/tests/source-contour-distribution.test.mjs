import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('both distributions embed the complete tone worker and carry its source/rights limits',()=>{
 const script=read('app.bundle.js'),html=read('TropeTrain.html'),match=script.match(/(?:var|const|let) SOURCE_CONTOUR_WORKER_SOURCE = ((?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'));/);
 assert(match,'Worker must be embedded without an extra network dependency.');const worker=runInNewContext(match[1],Object.create(null));assert(worker.includes('renderSourceContour'));assert(worker.includes('self.onmessage'));assert(!worker.includes('importScripts('));assert(html.includes(match[1]));assert(html.includes(read('docs/MEASURED-TONES.json').trim().replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'))||html.includes(Buffer.from(read('docs/MEASURED-TONES.json')).toString('base64')));assert(read('index.html').includes('Measured tones · source estimate'));
});
test('coverage retains every source-timed word and withholds all eight timing gaps',()=>{
 const x=JSON.parse(read('docs/MEASURED-TONE-COVERAGE.json'));assert.equal(x.sourceTimedWords,77174);assert.equal(x.sourceTimedRecordings,370);assert.equal(x.withheldRecordings,8);assert.equal(x.withheldWords,2811);assert.equal(x.measuredTimeWords,77158);assert.equal(x.durationReviewWords.length,16);assert.equal(x.wordsWithMeasuredFrameOnsets+x.wordsWithoutMeasuredFrameOnsets,77158);assert(x.wordsWithoutMeasuredFrameOnsets>0);assert.equal(x.review.musical,null);assert(read('TropeTrain.html').includes(Buffer.from(read('docs/MEASURED-TONE-COVERAGE.json')).toString('base64')));
});
