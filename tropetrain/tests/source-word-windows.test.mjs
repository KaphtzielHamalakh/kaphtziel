import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {ReferenceLibrary} from '../reference-library.js';import {sourceTimingPolicy,originalWordWindow} from '../source-word-windows.js';import {sourceTimedPracticePlan} from '../measured-practice.js';import {splitReferenceSegments} from '../recorded-reference.js';
import {pitchManifest,pitchWordWindow,SourcePitchStore} from '../source-pitch.js';import {SourceContourStore} from '../source-contour-store.js';import {renderSourceContour} from '../source-contour.js';
import {PronunciationLibrary} from '../pronunciation.js';import {sourceSyllableChoices,createSyllableTimingDraft,syllableTimingKey} from '../syllable-timing-draft.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url)),unpack=f=>JSON.parse(gunzipSync(read(f))),sha=b=>createHash('sha256').update(b).digest('hex'),packed=unpack('data/references/torah-library.json.gz'),lib=new ReferenceLibrary(packed),report=JSON.parse(read('docs/SOURCE-WORD-WINDOWS.json'));
const reader=(w,occurrence='again')=>({id:w.id+'@'+occurrence,sourceWordId:w.id,sourceHebrew:w.uxlcHebrew,index:0}),partial=lib.recordings.filter(r=>lib.timingPolicy(r).kind==='partial-original-windows');
const blocked={
 'pt-portion-13-5':['exo-3-18-11','exo-3-18-12','exo-3-18-13'],
 'pt-portion-13-7':['exo-5-14-5','exo-5-14-6','exo-5-14-7'],
 'pt-portion-20-1':['exo-28-12-13','exo-28-12-14','exo-28-12-15'],
 'pt-portion-35-4':['num-6-17-7','num-6-17-8','num-6-17-9'],
 'pt-portion-46-3':[16,17,18].map(n=>'deu-9-6-'+n).concat(Array.from({length:25},(_,i)=>'deu-9-7-'+(i+1)),[1,2,3].map(n=>'deu-9-8-'+n))
};
test('all2020 new intervals are exact original ZIP endpoints, preserve null raw bounds/status and fit independently measured source duration',()=>{
 const proof=JSON.parse(execFileSync('python3',[new URL('./source-word-windows-audit.py',import.meta.url).pathname],{encoding:'utf8'}));let total=0;const before=JSON.stringify(packed);
 for(const record of partial){const p=lib.timingPolicy(record),expected=new Map(proof[record.id].windows.map(w=>[w[0],w]));assert.equal(proof[record.id].equalCount,true);assert.equal(record.status,'timing-review');
  assert.deepEqual(record.words.filter(w=>!originalWordWindow(record,w,p)).map(w=>w.id),blocked[record.id]);
  for(const w of record.words){assert.equal(w.startSeconds,null);assert.equal(w.endSeconds,null);const window=originalWordWindow(record,w,p);if(!window)continue;
   assert.deepEqual([w.id,window.startSeconds,window.endSeconds,window.sourceStartIndex,window.sourceEndIndex],expected.get(w.id));const plan=sourceTimedPracticePlan(lib,[reader(w)],0,0);assert.equal(plan.rows[0].uxlcHebrew,w.uxlcHebrew);assert.equal(plan.rows[0].occurrenceId,w.id+'@again');total++;
  }
 }
 assert.equal(total,2020);assert.equal(partial.length,5);assert.equal(JSON.stringify(packed),before);
 for(const record of lib.recordings.filter(r=>lib.timingPolicy(r).kind==='withheld')){assert.equal(proof[record.id].equalCount,false);for(const w of record.words)assert.throws(()=>sourceTimedPracticePlan(lib,[reader(w)],0,0),/unreliable/);}
});
test('every crossing span refuses the whole request while explicit ordered discontinuous occurrences retain their identity',()=>{
 for(const record of partial){const rows=record.words.map((w,index)=>({...reader(w),index})),first=record.words.findIndex(w=>w.id===blocked[record.id][0]),last=first+blocked[record.id].length-1;
  assert.throws(()=>sourceTimedPracticePlan(lib,rows,first-1,last+1),/withheld.*selections crossing/i);
  for(let i=first;i<=last;i++)assert.throws(()=>lib.timedAt(rows[i]),/withheld/);
  const chosen=[rows[first-1],rows[last+1],{...rows[first-1],id:'repeat/'+rows[first-1].id}],plan=sourceTimedPracticePlan(lib,chosen,0,2);
  assert.deepEqual(plan.rows.map(w=>w.occurrenceId),chosen.map(w=>w.id));assert.equal(splitReferenceSegments(plan.rows).length,3);assert.equal(plan.rows[0].startSeconds,plan.rows[2].startSeconds);
 }
});
test('cumulative original source units retain merged words unsplit and closed ambiguous endpoints stay withheld',()=>{
 const synthetic=(starts,sizes)=>({status:'timing-review',rawStarts:starts,sourceWordCount:starts.length,issues:starts.slice(0,-1).flatMap((a,i)=>a>=starts[i+1]?[{kind:'non-increasing',sourceIndex:i,before:a,after:starts[i+1]}]:[]),words:sizes.map((n,i)=>({id:'w'+i,referenceIndex:i,uxlcHebrew:'א',sourceWords:Array.from({length:n},()=>({sourceHebrew:'א'})),startSeconds:null,endSeconds:null}))});
 const r=synthetic([0,1,2,3,3,4,5,6,7,8],[2,1,1,1,2,1,1,1]),p=sourceTimingPolicy(r);assert.deepEqual([...p.windows.keys()],['w0','w4','w5','w6','w7']);assert.equal(p.windows.get('w4').sourceStartIndex,5);assert.equal(p.windows.get('w4').sourceEndIndex,7);assert.equal(p.windows.get('w4').startSeconds,4);assert.equal(p.windows.get('w4').endSeconds,6);assert.equal(p.windows.get('w7').endSeconds,null);
 const terminal=sourceTimingPolicy(synthetic([0,1,2,2],[1,1,1,1]));assert.deepEqual([...terminal.windows.keys()],['w0']);
 for(const change of [x=>x.rawStarts.pop(),x=>x.rawStarts[0]=NaN,x=>x.sourceWordCount++,x=>x.issues=[],x=>x.issues[0].sourceIndex++,x=>x.issues.push({kind:'word-count'}),x=>x.words[0].sourceWords=[]]){const bad=structuredClone(r);change(bad);assert.equal(sourceTimingPolicy(bad).eligibleWords,0);}
 const wrong={...r.words[0],uxlcHebrew:'ב'};assert.equal(originalWordWindow(r,wrong,p),null);
});
test('raw pitch windows accept only eligible original intervals; ambiguous words remain unassigned',()=>{
 for(const record of partial){const e=pitchManifest.records.find(e=>e.id===record.id),data=unpack('data/pitch/'+e.file),w=record.words[0],window=pitchWordWindow(data,{recording:record,word:w},reader(w));
  assert.equal(window.startSeconds,record.rawStarts[0]);assert.equal(window.timingPolicy,'partial-original-windows-v1');assert(window.series.every(row=>row[0]*.01>=window.startSeconds&&row[0]*.01<window.endSeconds));assert.equal(window.syllableTimes,null);assert.equal(window.phonemes,null);assert.equal(window.musicalNotes,null);
  const bad=record.words.find(w=>w.id===blocked[record.id][0]);assert.throws(()=>pitchWordWindow(data,{recording:record,word:bad},reader(bad)),/timings need review/);
 }
});
test('measured-tone preparation permits an identified partial take without relabeling its source status or measurement manifest',async()=>{
 const record=lib.byId.get('pt-portion-20-1'),before=JSON.stringify(record),e=pitchManifest.records.find(e=>e.id===record.id),pitchStore=new SourcePitchStore({read:async e=>read('data/pitch/'+e.file),hash:async b=>sha(b),decode:async b=>JSON.parse(gunzipSync(b))});let rendered;
 const store=new SourceContourStore({pitchStore,render:async(d,s)=>{rendered=d.id;return renderSourceContour(d,s);},makeUrl:()=> 'blob:partial-source',revokeUrl:()=>{}});
 assert.equal(await store.url(record),'blob:partial-source');assert.equal(rendered,record.id);assert.equal(e.wordTiming,'timing-review');assert.equal(JSON.stringify(record),before);
 const good=record.words[0],bad=record.words.find(w=>w.id===blocked[record.id][0]);assert.equal(store.wordSummary({recording:record,word:good},reader(good)).wordId,good.id);assert.throws(()=>store.wordSummary({recording:record,word:bad},reader(bad)),/timings need review/);store.clear();
});
test('new original windows keep pronunciation styles and personal syllable drafts independent without inferring boundaries',()=>{
 const p=new PronunciationLibrary(unpack('data/pronunciation/torah-display.json.gz'),{underlay:unpack('data/pronunciation/torah-underlay.json.gz')}),word=reader(lib.byWord.get('exo-3-16-1').word),before=JSON.stringify(word),drafts=[];
 for(const style of ['sephardic','ashkenazic']){const study=p.study(word,style),choices=sourceSyllableChoices(study,word,style);assert(choices.length);const d=createSyllableTimingDraft({library:lib,word,study,style,choiceId:choices[0].id});assert.equal(d.word.hebrew,word.sourceHebrew);assert.equal(d.word.timingPolicy,'partial-original-windows-v1');assert(d.units.every(u=>u.start===null&&u.end===null));assert.equal(d.phonemes,null);assert.equal(d.independentReview,null);drafts.push(d);}
 assert.notEqual(syllableTimingKey(drafts[0]),syllableTimingKey(drafts[1]));assert.deepEqual(drafts[0].word,drafts[1].word);assert.deepEqual(drafts[0].source,drafts[1].source);assert.equal(JSON.stringify(word),before);
});
test('portable evidence lists every original interval and every withheld word with unchanged source pins and null review',()=>{
 assert.equal(report.newOriginalWindows,2020);assert.equal(report.newDurationFittingWindows,2020);assert.equal(report.sourcePacketChanged,false);assert.equal(report.sourceStatusesChanged,false);assert.equal(report.inputs.packetSha256,sha(read('data/references/torah-library.json.gz')));assert.equal(report.inputs.policySha256,sha(read('source-word-windows.js')));
 assert.deepEqual(report.review,{acoustic:null,musical:null,linguistic:null});assert.equal(report.partialTakes.reduce((n,r)=>n+r.withheld.length,0),43);assert.equal(report.completeTakeOnly.reduce((n,r)=>n+r.withheld.length,0),748);
 for(const r of report.partialTakes){assert.deepEqual(r.withheld.map(w=>w.id),blocked[r.id]);assert.equal(r.originalWindows.length,lib.timingPolicy(r.id).eligibleWords);}
 assert(restoredPortableHtml(read('TropeTrain.html')).toString().includes(read('docs/SOURCE-WORD-WINDOWS.json').toString('base64')));assert(read('index.html').toString().includes('href="./docs/SOURCE-WORD-WINDOWS.json"'));
});
