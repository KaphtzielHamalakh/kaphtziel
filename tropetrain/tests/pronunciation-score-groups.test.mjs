import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {getCorpus} from '../library.js';import {createReadingModel} from '../music.js';import {PronunciationLibrary} from '../pronunciation.js';import {linkPronunciationScoreGroups as link} from '../pronunciation-score-groups.js';import {linkPronunciationToNotes} from '../pronunciation-note-links.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),data=p=>JSON.parse(gunzipSync(read(p))),lib=new PronunciationLibrary(data('data/pronunciation/torah-display.json.gz'),{underlay:data('data/pronunciation/torah-underlay.json.gz'),segments:data('data/pronunciation/torah-segments.json.gz')}),corpus=await getCorpus();
const modelAt=(bookId,chapter,verse,opts={})=>createReadingModel(corpus.passage([{id:'group-test',bookId,start:{chapter,verse},end:{chapter,verse}}]),opts),model=modelAt('gen',22,1,{melodyId:'cohen-1902-gen22-ending'}),plan=model.buildPlan(0,12,{tempo:60});
test('Cohen Wa/ye and source vay share a common Hebrew span without individual note allocations',()=>{
 for(const style of ['sephardic','ashkenazic']){const report=link(plan,model.words,lib,style);assert.equal(report.counts.eventsInCommonSpans,52);assert.equal(report.counts.eventsInDifferentDivisions,2);const g=report.words[0].groups[0];assert.equal(g.hebrew,'וַיְ');assert.deepEqual(g.scoreSyllables.map(s=>s.hebrew),['וַ','יְ']);assert.deepEqual(g.sourceUnits.map(u=>u.text),['vay']);assert.deepEqual(g.scoreSyllables.map(s=>s.printedLyrics),[['Wa'],['ye']]);assert.equal(g.individualNoteAllocation,null);assert.equal(g.phonemes,null);assert.equal(g.audioTimes,null);assert.ok(g.sourceUnits[0].sourceSegments);}
 const old=linkPronunciationToNotes(plan,model.words,lib,'sephardic');assert.equal(old.counts.linkedNotes,50);assert.equal(old.counts.unlinkedNotes,2);
});
test('Baer keeps all 145 notes and three different opening divisions independently in both styles',()=>{
 const m=createReadingModel(corpus.passage([{id:'baer',bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:5}}]),{melodyId:'baer-1894-gen1-1-5'}),p=m.buildPlan(0,51),before=JSON.stringify([m,p]);
 for(const style of ['sephardic','ashkenazic']){const r=link(p,m.words,lib,style);assert.equal(r.counts.eventsInCommonSpans,145);assert.equal(r.counts.eventsInDifferentDivisions,6);assert.equal(r.words.flatMap(w=>w.groups).filter(g=>g.relation==='different-syllable-divisions').length,3);}
 assert.equal(JSON.stringify([m,p]),before);
});
test('style changes retain group and note IDs, marked spans and source stress while musical controls remain independent',()=>{
 const a=link(plan,model.words,lib,'sephardic'),b=link(plan,model.words,lib,'ashkenazic'),before=JSON.stringify([plan,model]);
 const stable=r=>r.words.flatMap(w=>w.groups.map(g=>[g.id,g.eventIds,g.hebrew,g.scoreSyllables,g.sourceUnits.map(u=>[u.sourceStress,u.writtenSpan]) ]));assert.deepEqual(stable(a),stable(b));assert.notDeepEqual(a.words.flatMap(w=>w.groups.map(g=>g.sourceUnits.map(u=>u.text))),b.words.flatMap(w=>w.groups.map(g=>g.sourceUnits.map(u=>u.text))));
 assert.deepEqual(link(model.buildPlan(0,12,{tempo:120,transpose:7}),model.words,lib,'sephardic'),a);assert.equal(JSON.stringify([plan,model]),before);
});
test('group exports retain source alternatives, literal repeat references, category plans and geminate ownership',()=>{
 const m=modelAt('deu',1,27),r=link(m.buildPlan(1,1),m.words,lib,'ashkenazic'),groups=r.words[0].groups;assert.ok(groups.some(g=>g.sourceReference));assert.ok(groups.some(g=>g.sourceColumn===2));
 const variants=groups.flatMap(g=>g.sourceUnits.flatMap(u=>u.sourceSegments.variants));assert.ok(variants.some(v=>v.segments.some(s=>s.categoryId==='QAMATS_Q')));assert.ok(variants.some(v=>v.segments.some(s=>s.categoryId==='QAMATS_G')));
 const shared=link(plan,model.words,lib,'sephardic').words.flatMap(w=>w.groups).find(g=>g.sourceUnits.some(u=>u.hebrewUnderlay.variants.some(v=>v.sharesNextConsonant)));assert.ok(shared);assert.equal(shared.sourceUnits.flatMap(u=>u.hebrewClusterRanges.filter(r=>r.role==='written').map(r=>r.text)).join(''),shared.hebrew);assert.ok(shared.sourceUnits.some(u=>u.hebrewClusterRanges.some(r=>r.role==='shared-consonant')));
});
test('repeated assignment occurrences have distinct group/event IDs and identical canonical evidence',()=>{
 const section={bookId:'gen',start:{chapter:22,verse:1},end:{chapter:22,verse:1}},m=createReadingModel(corpus.passage([{...section,id:'first'},{...section,id:'second'}]),{melodyId:'cohen-1902-gen22-ending'}),r=link(m.buildPlan(0,25),m.words,lib,'ashkenazic');assert.equal(r.counts.eventsInCommonSpans,104);const a=r.words[0].groups[0],b=r.words[13].groups[0];assert.notEqual(a.id,b.id);assert.notDeepEqual(a.eventIds,b.eventIds);assert.equal(a.sourceWordId,b.sourceWordId);assert.deepEqual(a.sourceUnits,b.sourceUnits);
});
test('source-only forms, missing words and combined units remain explicitly unassigned',()=>{
 const m=modelAt('gen',8,20),p=m.buildPlan(7,7),r=link(p,m.words,lib,'sephardic');assert.equal(r.words[0].reason,'no-source-correspondence');assert.equal(r.counts.eventsInCommonSpans,0);
 const c=modelAt('deu',32,6),cr=link(c.buildPlan(0,1),c.words,lib,'sephardic');assert.ok(cr.words.every(w=>w.reason==='no-individual-word-units'));
 const d=modelAt('gen',2,4),i=d.words.findIndex(w=>w.sourceHebrew.replace(/[^א-ת]/gu,'')==='יהוה'),dr=link(d.buildPlan(i,i),d.words,lib,'sephardic');assert.equal(dr.words[0].reason,'source-only-written-form');assert.equal(dr.counts.eventsInCommonSpans,0);
});
test('partial event pages retain complete shared syllables while claiming only the included events',()=>{
 const r=link(plan.slice(1,2),model.words,lib,'sephardic'),g=r.words[0].groups[0];assert.equal(r.counts.eventsInCommonSpans,1);assert.equal(g.scoreSyllables.length,2);assert.deepEqual(g.scoreSyllables[0].eventIds,[]);assert.deepEqual(g.eventIds,[plan[1].id]);assert.equal(g.sourceUnits[0].text,'vay');
});
test('altered marks, lyrics, duplicate IDs, malformed ranges and holes are refused',()=>{
 assert.throws(()=>link([{...plan[0],syllable:'וָ'}],model.words,lib,'sephardic'),/original Hebrew/);assert.throws(()=>link([plan[0],plan[0]],model.words,lib,'sephardic'),/Duplicate/);assert.throws(()=>link([{...plan[0],wordId:'other'}],model.words,lib,'sephardic'),/word occurrences/);assert.throws(()=>link(plan,model.words,lib,'unsupported'),/Unsupported/);
 const adapt=fn=>({sourceCommit:lib.sourceCommit,study:(w,s)=>{const x=structuredClone(lib.study(w,s));fn(x,s);return x;}});
 const bad=adapt((x,s)=>{x.rows[0].styles[s][0].units[0].hebrewClusterRanges[0].text='changed';});assert.throws(()=>link(plan.slice(0,1),model.words,bad,'sephardic'),/original marked Hebrew/);
 const hole=adapt((x,s)=>{const cell=x.rows[0].styles[s][0];cell.units.splice(1,1);});const result=link(plan.filter(e=>e.sourceWordId==='gen-22-1-3'),model.words,hole,'sephardic');assert.equal(result.counts.eventsInCommonSpans,0);assert.ok(result.words[0].paths.some(p=>p.status==='noncontiguous-source-path'));
});
test('a genuine many-to-many overlap retains both sequences and partitions only at common boundaries',()=>{
 const w={id:'example',sourceHebrew:'אָבָגָדָ',syllables:[{id:'a',sourceHebrew:'אָבָ'},{id:'b',sourceHebrew:'גָדָ'}]},p=w.syllables.map((s,i)=>({id:'e'+i,wordIndex:0,wordId:w.id,syllableId:s.id,syllable:s.sourceHebrew})),boundaries=[[0,2],[2,6],[6,8]],units=boundaries.map(([start,end],i)=>({id:'u'+i,readerWordId:w.id,text:'u'+i,hebrewClusterRanges:[{readerWordId:w.id,start,end,text:w.sourceHebrew.slice(start,end),role:'written'}]})),source={sourceCommit:'fixture',study:()=>({rows:[{number:1,styles:{sephardic:[{column:1,units}]}}]})};
 const r=link(p,[w],source,'sephardic'),g=r.words[0].groups[0];assert.equal(g.scoreSyllables.length,2);assert.equal(g.sourceUnits.length,3);assert.equal(g.individualNoteAllocation,null);assert.equal(g.hebrew,w.sourceHebrew);
});
test('full Torah audit preserves Hebrew/events, bounds both printed examples and embeds the exact evidence in standalone',()=>{
 const bytes=read('docs/PRONUNCIATION-SCORE-GROUPS.json'),r=JSON.parse(bytes);assert.equal(r.words,79985);assert.equal(r.verses,5853);assert.equal(r.markedWordSha256,'e7491f5d7f89cc94bb4e39b63e42d53b8219d1970846839f4822df4c3bc1728c');assert.equal(r.originalDemoEventSha256,'6870929024d0c2289f7d9ef1879a7908ac0ee04280c528d64c89d85956f4ba3d');
 for(const input of r.inputs)assert.equal(createHash('sha256').update(read(input.path)).digest('hex'),input.sha256);
 for(const style of ['sephardic','ashkenazic']){assert.equal(r.originalDemo[style].events,231178);assert.equal(r.boundedPrinted['cohen-1902-gen22-ending'][style].eventsInCommonSpans,52);assert.equal(r.boundedPrinted['baer-1894-gen1-1-5'][style].eventsInCommonSpans,145);}
 assert.ok(read('TropeTrain.html').includes('data:application/json;base64,'+bytes.toString('base64')));
});
