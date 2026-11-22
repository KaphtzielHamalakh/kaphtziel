import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {PronunciationLibrary} from '../pronunciation.js';import {ReferenceLibrary} from '../reference-library.js';
import {sourceSyllableChoices,createSyllableTimingDraft,syllableTimingKey,validateSyllableTimingDraft,setSyllableBoundary,captureSyllableBoundary,parseSyllableTimingDraft,draftSyllableSpan} from '../syllable-timing-draft.js';
const json=path=>JSON.parse(gunzipSync(readFileSync(new URL('../'+path,import.meta.url))));
const p=new PronunciationLibrary(json('data/pronunciation/torah-display.json.gz'),{underlay:json('data/pronunciation/torah-underlay.json.gz'),segments:json('data/pronunciation/torah-segments.json.gz')}),r=new ReferenceLibrary(json('data/references/torah-library.json.gz'));
function word(id,occurrenceId=id){const hit=p.byWord.get(id);return {id:occurrenceId,sourceWordId:id,sourceHebrew:hit.group.readerHebrew[hit.index],index:0};}
function fixture(id='gen-1-1-1',style='sephardic',occurrence=id){const w=word(id,occurrence),study=p.study(w,style),choices=sourceSyllableChoices(study,w,style);return createSyllableTimingDraft({library:r,word:w,study,style,choiceId:choices[0]?.id});}
const edit=(draft,index,start,end)=>setSyllableBoundary(setSyllableBoundary(draft,index,'start',start),index,'end',end);
test('real opening syllables retain exact text, accents, ownership, stress, shared underlay and source identity with no inferred times',()=>{
 const d=fixture(),w=word('gen-1-1-1'),s=p.study(w,'sephardic'),before=JSON.stringify(s),choice=sourceSyllableChoices(s,w,'sephardic')[0];
 assert.equal(d.word.hebrew,'בְּרֵאשִׁ֖ית');assert.equal(d.word.startSeconds,2.028362);assert.equal(d.word.endSeconds,3.3519);
 assert.equal(d.source.audioSha1,'755c6e9918ba2021bba8b33c46db309c115620d6');assert.equal(d.source.audioBytes,1798060);assert.equal(d.source.measuredDurationSeconds,449.5150625);
 assert.deepEqual(d.units.map(u=>[u.sourceText,u.sourceStress]),[['bᵉ',false],['ré',false],['shít',true]]);
 assert(d.units.every(u=>u.start===null&&u.end===null&&u.startBasis===null&&u.endBasis===null));assert.deepEqual(d.units.map(({start,end,startBasis,endBasis,...u})=>u),choice.units);assert.equal(JSON.stringify(s),before);
});
test('timing styles and reading occurrences have separate keys and refuse one another’s annotations',()=>{
 const a=fixture(),b=fixture('gen-1-1-1','ashkenazic'),again=fixture('gen-1-1-1','sephardic','assignment-repeat');
 assert.equal(b.units[2].sourceText,'shís');assert.equal(a.word.hebrew,b.word.hebrew);assert.notEqual(syllableTimingKey(a),syllableTimingKey(b));assert.notEqual(syllableTimingKey(a),syllableTimingKey(again));
 assert.throws(()=>validateSyllableTimingDraft(a,b),/style/);assert.throws(()=>validateSyllableTimingDraft(a,again),/occurrence/);
 assert.equal(b.units[0].start,null);assert.equal(again.units[0].start,null);
});
test('a selected alternate source cell is kept separately rather than merging competing syllable rows',()=>{
 let found;
 for(const group of p.groups){for(const id of group.readerIds){if(!r.byWord.has(id))continue;const w=word(id),s=p.study(w,'sephardic'),choices=sourceSyllableChoices(s,w,'sephardic');if(choices.length>1){found={w,s,choices};break;}}if(found)break;}
 assert(found);const a=createSyllableTimingDraft({library:r,word:found.w,study:found.s,style:'sephardic',choiceId:found.choices[0].id}),b=createSyllableTimingDraft({library:r,word:found.w,study:found.s,style:'sephardic',choiceId:found.choices[1].id});
 assert.notEqual(syllableTimingKey(a),syllableTimingKey(b));assert.deepEqual(a.units.map(u=>u.sourceUnitId),found.choices[0].units.map(u=>u.sourceUnitId));assert.deepEqual(b.units.map(u=>u.sourceUnitId),found.choices[1].units.map(u=>u.sourceUnitId));assert.throws(()=>validateSyllableTimingDraft(a,b));
});
test('source-only reading forms gain no written ranges and shared words remain unsplit',()=>{
 const d=fixture('gen-4-18-9');assert(d.units.length);assert(d.units.every(u=>u.hebrewClusterRanges===null));
 for(const id of ['deu-32-6-1','deu-32-6-2']){const w=word(id),s=p.study(w,'sephardic');assert.deepEqual(sourceSyllableChoices(s,w,'sephardic'),[]);assert.throws(()=>createSyllableTimingDraft({library:r,word:w,study:s,style:'sephardic',choiceId:'r1-c1'}),/unsplit/);}
 const shared=fixture('gen-2-21-10');assert(shared.units.some(u=>u.hebrewUnderlay.variants.some(v=>v.sharesNextConsonant||v.sharesPreviousConsonant)));assert(shared.units.every(u=>u.start===null));
});
test('word windows outside measured audio and source timing gaps refuse syllable drafts without clipping',()=>{
 for(const id of ['gen-28-4-1','gen-28-4-16'])assert.throws(()=>fixture(id),/word timing review/);
 const bad=r.recordings.find(x=>x.status!=='aligned'),id=bad.words[0].id;assert.throws(()=>fixture(id),/unreliable source timings/);
});
test('editing one syllable never supplies its neighbors or changes the original word window',()=>{
 const base=fixture(),one=edit(base,0,2.1,2.3),last=edit(one,2,3,3.3);
 assert.deepEqual(draftSyllableSpan(last,0),{start:2.1,end:2.3});assert.deepEqual(draftSyllableSpan(last,2),{start:3,end:3.3});assert.throws(()=>draftSyllableSpan(last,1),/both/);
 assert.equal(base.units[0].start,null);assert.equal(last.units[1].start,null);assert.equal(last.units[1].end,null);assert.deepEqual(last.word,base.word);assert.equal(last.units[0].startBasis,'typed');
 assert.deepEqual(parseSyllableTimingDraft(JSON.stringify(last),base),last);
});
test('fractional captures retain source seconds and distinguish audible and muted clocks',()=>{
 const d=fixture(),a=captureSyllableBoundary(d,0,'start',{recordingId:d.source.recordingId,mode:'audio',seconds:d.word.startSeconds}),b=captureSyllableBoundary(a,0,'end',{recordingId:d.source.recordingId,mode:'muted',seconds:2.233456789});
 assert.equal(a.units[0].start,2.028362);assert.equal(a.units[0].startBasis,'audio-clock');assert.equal(b.units[0].end,2.233456789);assert.equal(b.units[0].endBasis,'muted-clock');
 for(const pos of [null,{recordingId:'another',mode:'audio',seconds:2.2},{recordingId:d.source.recordingId,mode:'measured',seconds:2.2},{recordingId:d.source.recordingId,mode:'audio',seconds:3.5}])assert.throws(()=>captureSyllableBoundary(d,0,'start',pos));
});
test('out-of-window, nonfinite, reversed and overlapping boundaries are rejected even across blank units',()=>{
 const d=edit(fixture(),0,2.1,2.3);
 for(const n of [-1,NaN,Infinity,'2.4',2.028361,3.351901])assert.throws(()=>setSyllableBoundary(d,1,'start',n));
 assert.throws(()=>setSyllableBoundary(d,1,'start',2.29),/overlaps/);assert.throws(()=>setSyllableBoundary(d,2,'end',2.2),/overlaps/);assert.throws(()=>setSyllableBoundary(d,0,'end',2.1),/follow/);
 const later=setSyllableBoundary(d,2,'start',3);assert.throws(()=>setSyllableBoundary(later,1,'end',3.1),/overlaps/);
 const cleared=setSyllableBoundary(d,0,'end',null);assert.equal(cleared.units[0].endBasis,null);assert.equal(setSyllableBoundary(d,2,'end',d.word.endSeconds).units[2].end,3.3519);
});
test('import refuses changed source, marked Hebrew, unit identity, ranges, stress and shared consonants',()=>{
 const d=fixture();
 for(const mutate of [x=>x.source.audioSha1='0'.repeat(40),x=>x.source.audioBytes++,x=>x.source.measuredPcmSha256='bad',x=>x.word.hebrew=x.word.hebrew.replace('֖',''),x=>x.word.startSeconds=2,x=>x.pronunciation.sourceCommit='new',x=>x.units[0].sourceText='b',x=>x.units[2].sourceStress=false,x=>x.units[0].hebrewClusterRanges[0].end=4,x=>x.units[0].hebrewUnderlay.variants[0].sharesNextConsonant=true,x=>x.units.reverse()]){const bad=structuredClone(d);mutate(bad);assert.throws(()=>validateSyllableTimingDraft(bad,d));}
});
test('a completed draft cannot certify phonemes, notes, source edition or independent review',()=>{
 let d=fixture();d=edit(d,0,d.word.startSeconds,2.3);d=edit(d,1,2.3,2.8);d=edit(d,2,2.8,d.word.endSeconds);
 assert.equal(d.status,'personal-unreviewed');for(const [key,value] of [['status','reviewed'],['phonemes',[]],['musicalNotes',[]],['sourceEditionCompared',true],['independentReview',{name:'self'}],['extraApproval',true]]){const bad=structuredClone(d);bad[key]=value;assert.throws(()=>validateSyllableTimingDraft(bad,d));}
 const bad=structuredClone(d);bad.units[0].startBasis='verified';assert.throws(()=>validateSyllableTimingDraft(bad,d),/annotation basis/);assert.throws(()=>parseSyllableTimingDraft('x'.repeat(1000001),d),/smaller/);
});
test('portable and normal apps contain source timing controls, embedded format evidence and original-only preview routing',()=>{
 const normal=readFileSync(new URL('../index.html',import.meta.url),'utf8'),portable=readFileSync(new URL('../TropeTrain.html',import.meta.url),'utf8'),app=readFileSync(new URL('../app.js',import.meta.url),'utf8'),doc=readFileSync(new URL('../docs/SYLLABLE-TIMING-DRAFT.json',import.meta.url));
 for(const id of ['syllable-timing-review','syllable-timing-unit','syllable-timing-variant','syllable-timing-capture-start','syllable-timing-audition','syllable-timing-json','syllable-timing-import','syllable-timing-download']){assert(normal.includes(`id="${id}"`));assert(portable.includes(`id="${id}"`));}
 assert(portable.includes(doc.toString('base64')));
});
