import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {originalWordWindow} from '../source-word-windows.js';
import {ReferenceLibrary} from '../reference-library.js';import {measuredPracticePlan} from '../measured-practice.js';import {practiceAudioMode} from '../recorded-practice.js';
const lib=new ReferenceLibrary(JSON.parse(gunzipSync(readFileSync(new URL('../data/references/torah-library.json.gz',import.meta.url)))));
test('measured mode stays independent of historical melody and pronunciation labels',()=>{
 assert.equal(practiceAudioMode('measured'),'measured');assert.equal(practiceAudioMode('recorded'),'recorded');for(const v of ['Galician','Avery/Binder','Sephardi Traditional',null])assert.equal(practiceAudioMode(v),'instrument');
});
test('every exact source word is audited against measured duration;16overflow words and791ambiguous/mismatched words stay withheld',()=>{
 let fit=0,overflow=0,review=0;
 for(const record of lib.recordings){const before=JSON.stringify(record),words=record.words.map((w,index)=>({id:w.id+'@again',sourceWordId:w.id,sourceHebrew:w.uxlcHebrew,index}));
  for(const [i,w] of words.entries()){
   const window=originalWordWindow(record,record.words[i],lib.timingPolicy(record));
   if(!window){assert.throws(()=>measuredPracticePlan(lib,words,i,i),/unreliable/);review++;continue;}
   if(record.id==='pt-portion-06-6'&&i>=record.words.findIndex(x=>x.id==='gen-28-4-1')){assert.throws(()=>measuredPracticePlan(lib,words,i,i),/word timing review/);overflow++;continue;}
   const p=measuredPracticePlan(lib,words,i,i);fit++;assert.equal(p.rows[0].occurrenceId,w.id);assert.equal(p.rows[0].uxlcHebrew,w.sourceHebrew);assert.equal(p.rows[0].startSeconds,window.startSeconds);assert.equal(p.rows[0].endSeconds,window.endSeconds);
  }
  assert.equal(JSON.stringify(record),before);
 }
 assert.deepEqual({fit,overflow,review},{fit:79178,overflow:16,review:791});
});
test('an overflowing multiword selection refuses playback instead of clipping or shifting source boundaries',()=>{
 const r=lib.byId.get('pt-portion-06-6'),words=r.words.map((w,index)=>({id:w.id,sourceHebrew:w.uxlcHebrew,index}));assert(measuredPracticePlan(lib,words,0,0));assert.throws(()=>measuredPracticePlan(lib,words,0,words.length-1),/gen-28-4-1/);
});
