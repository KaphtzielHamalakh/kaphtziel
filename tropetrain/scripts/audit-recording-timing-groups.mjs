import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {execFileSync} from 'node:child_process';
import {captureAuditInputs,verifyAuditInputs} from './audit-inputs.mjs';import {ReferenceLibrary} from '../reference-library.js';import {createRecordingTimingGroups} from '../recording-timing-groups.js';import {RECORDING_TIMING_GROUP_PINS,RECORDING_TIMING_GROUP_SOURCE} from '../recording-timing-group-pins.js';import {getCorpus} from '../library.js';import {sourceTimedPracticePlan} from '../measured-practice.js';
import {chantCoverage} from '../recorded-practice.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),manifest=JSON.parse(read('data/torah/manifest.json'));
const inputs=captureAuditInputs(root,['scripts/audit-inputs.mjs','scripts/audit-recording-timing-groups.mjs','tests/source-word-windows-audit.py','recording-timing-groups.js','recording-timing-group-pins.js','recorded-reference.js','reference-library.js','source-word-windows.js','measured-practice.js','recorded-practice.js','source-pitch.js','source-pitch-manifest.js','data/pitch/manifest.json','data/references/torah-library.json.gz','data/references/torah-sources.zip','data/torah/manifest.json',...manifest.books.map(b=>'data/torah/'+b.file)]);
const packed=JSON.parse(gunzipSync(read('data/references/torah-library.json.gz'))),before=JSON.stringify(packed),lib=new ReferenceLibrary(packed),groups=await createRecordingTimingGroups(lib),corpus=await getCorpus();
const zip=JSON.parse(execFileSync('python3',[new URL('../tests/source-word-windows-audit.py',import.meta.url).pathname],{encoding:'utf8'}));
const report={schema:'tropetrain-recording-timing-groups-v1',revision:1,source:RECORDING_TIMING_GROUP_SOURCE,inputs:null,groups:[],counts:{completeTimingGroups:0,collectivelyCoveredWords:0,additionalIndividualWordTimes:0,unchangedStructurallyTimedWords:79194,unchangedDurationFittingWordWindows:79178,countMismatchWordsStillWithheld:748,durationOverflowWordsStillWithheld:16},method:'Only the five pinned equal-count original takes qualify. Every closed ambiguity run stays complete, bounded by unchanged strictly ordered source starts outside its faults; all internal word/syllable times remain unassigned. Original ZIP endpoints, complete source identity, original marked Torah and measured duration are checked. Opt-in recorded chant only; no interpolation, sorting, clamping or timing repair. No individual highlight inside a group.',review:{acoustic:null,musical:null,phonological:null},limits:'Recorded-span access is not additional word-aligned timing, a new pronunciation voice or a complete contextual melody grammar. Fixed source performances retain their own voice, pronunciation, melody and clock. Measured tones, personal syllable drafts, 748 count-mismatch words and 16 duration-overflow words do not gain inferred boundaries.'};
for(const pin of RECORDING_TIMING_GROUP_PINS){
 const record=lib.byId.get(pin.recordingId),passage=corpus.passage([{id:record.id,...record.coverage,label:record.title}]),words=passage.verses.flatMap(v=>v.words).map((w,index)=>({...w,index}));
 assert.equal(words.length,record.words.length);
 for(const source of pin.groups){
  const first=words.findIndex(w=>(w.sourceWordId??w.id)===source.wordIds[0]),last=first+source.wordIds.length-1,group=groups.at(words,first),plan=groups.plan(words,first,last,{allowTimingGroups:true});assert(group);assert.equal(plan.groupWords,source.wordIds.length);assert.equal(plan.timedWords,0);assert.equal(plan.rows.length,0);assert.equal(plan.segments.length,1);assert.equal(plan.segments[0].words.length,0);
  assert.throws(()=>groups.plan(words,first,last),/unreliable/);for(let i=first;i<=last;i++)assert.throws(()=>sourceTimedPracticePlan(lib,words,i,i),/unreliable/);
  const original=zip[record.id].windows;assert.equal(zip[record.id].equalCount,true);assert.equal(group.startSeconds,original[first][1]);assert.equal(group.endSeconds,original[last][2]);assert.equal(group.sourceStartIndex,original[first][3]);assert.equal(group.sourceEndIndex,original[last][4]);
  const mixed=groups.plan(words,first-1,last+1,{allowTimingGroups:true});assert.equal(mixed.segments.length,3);assert.equal(mixed.timedWords,2);assert.equal(mixed.segments[0].end,mixed.segments[1].start);assert.equal(mixed.segments[1].end,mixed.segments[2].start);
  report.groups.push(group);report.counts.completeTimingGroups++;report.counts.collectivelyCoveredWords+=group.wordIds.length;
 }
}
const coverage=chantCoverage(lib);assert.equal(coverage.sourceTimedWords,79194);assert.equal(coverage.reviewWords,791);let fitting=0,mismatched=0,overflow=0;
for(const record of lib.recordings){
 if(lib.timingPolicy(record).kind==='withheld')mismatched+=record.words.length;
 for(const w of record.words){
  try{sourceTimedPracticePlan(lib,[{id:w.id,sourceHebrew:w.uxlcHebrew,index:0}],0,0);fitting++;}
  catch(error){if(record.status==='aligned'){assert(w.id.startsWith('gen-28-4-'));overflow++;}}
 }
}
assert.equal(fitting,79178);assert.equal(mismatched,748);assert.equal(overflow,16);
report.counts.unchangedStructurallyTimedWords=coverage.sourceTimedWords;report.counts.unchangedDurationFittingWordWindows=fitting;report.counts.countMismatchWordsStillWithheld=mismatched;report.counts.durationOverflowWordsStillWithheld=overflow;
assert.equal(report.counts.completeTimingGroups,5);assert.equal(report.counts.collectivelyCoveredWords,43);assert.equal(JSON.stringify(packed),before);report.inputs=verifyAuditInputs(root,inputs);
writeFileSync(new URL('docs/RECORDING-TIMING-GROUPS.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.counts));
