import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {ReferenceLibrary} from '../reference-library.js';import {JOINT_COVERAGE_SUMMARY} from '../joint-coverage-summary.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url)),report=JSON.parse(read('docs/JOINT-CHANT-PRONUNCIATION.json')),library=new ReferenceLibrary(JSON.parse(gunzipSync(read('data/references/torah-library.json.gz'))));
test('joint source coverage distinguishes written range, unit ownership and recording timing with complete counts',()=>{
 assert.equal(report.words,79985);assert.deepEqual(report.matrix,{'timed/word-owned/written-range':77023,'timed/word-owned/source-only':2169,'timing-review/word-owned/written-range':779,'timing-review/word-owned/source-only':12,'timed/group-only/source-only':2});
 assert.equal(Object.values(report.matrix).reduce((n,c)=>n+c,0),79985);assert.equal(JOINT_COVERAGE_SUMMARY.withChantAndPronunciation,79192);assert.equal(JOINT_COVERAGE_SUMMARY.withChantAndWrittenRanges,77023);assert.equal(JOINT_COVERAGE_SUMMARY.timedWithoutOwner,2);assert.equal(JOINT_COVERAGE_SUMMARY.timingReviewWords,791);
 for(const input of report.inputs)assert.equal(createHash('sha256').update(read(input.path)).digest('hex'),input.sha256);
});
test('every listed joint gap retains exact source IDs/marked Hebrew and final media endpoints remain explicitly open',()=>{
 assert.equal(report.timedWithoutPronunciationOwner.length,2);assert.equal(new Set(report.timedWithoutPronunciationOwner.map(g=>g.id)).size,2);
 for(const gap of report.timedWithoutPronunciationOwner){const {word,recording}=library.byWord.get(gap.id);assert.equal(recording.status,'aligned');assert.equal(gap.hebrew,word.uxlcHebrew);assert.equal(gap.recordingId,recording.id);}
 assert.deepEqual(report.timedWithoutPronunciationOwner.filter(g=>g.pronunciation==='combined-source-form').map(g=>g.id),['deu-32-6-1','deu-32-6-2']);
 let open=0;for(const recording of library.recordings.filter(r=>r.status==='aligned'))for(const word of recording.words){assert.ok(Number.isFinite(word.startSeconds));if(word.endSeconds===null){open++;assert.equal(word.id,recording.words.at(-1).id);}else assert.ok(word.endSeconds>word.startSeconds);}
 assert.equal(open,370);assert.equal(report.terminalOnsets,375);assert.match(report.limits,/decoded media duration/);
});
test('joint evidence and summary are portable in the standalone without new data requests',()=>{
 const html=read('TropeTrain.html').toString(),bundle=read('app.bundle.js').toString();assert.ok(html.includes('data:application/json;base64,'+read('docs/JOINT-CHANT-PRONUNCIATION.json').toString('base64')));for(const artifact of [html,bundle]){const block=artifact.match(/(?:var|const) JOINT_COVERAGE_SUMMARY\s*=\s*(\{[^}]+\})/u)?.[1];assert.ok(block);assert.deepEqual(JSON.parse(block),JOINT_COVERAGE_SUMMARY);}assert.ok(read('index.html').toString().includes('joint-coverage-summary'));
});
