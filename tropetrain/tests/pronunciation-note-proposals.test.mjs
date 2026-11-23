import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';
import{PronunciationLibrary}from'../pronunciation.js';import{SourceSyllableUnderlay}from'../source-syllable-underlay.js';import{getCorpus}from'../library.js';import{createReadingModel}from'../music.js';
import{linkPronunciationProposalsToNotes as link}from'../pronunciation-note-proposals.js';import{linkPronunciationToNotes,notePronunciationText}from'../pronunciation-note-links.js';import{staffMarkup,staffNotes}from'../staff.js';
const j=n=>JSON.parse(gunzipSync(readFileSync(new URL('../data/pronunciation/'+n+'.json.gz',import.meta.url)))),lib=new PronunciationLibrary(j('torah-display'),{underlay:j('torah-underlay'),segments:j('torah-segments')}),adapter=new SourceSyllableUnderlay(lib),ne='katz-1993-northeastern-formal',me='katz-1993-mideastern-formal';
const model=async(chapter,verse,{bookId='gen',source=true}={})=>createReadingModel((await getCorpus()).passage([{id:'study',bookId,start:{chapter,verse},end:{chapter,verse}}]),source?{sourceUnderlay:adapter}:{});
const full=m=>m.buildPlan(0,m.words.length-1,{tempo:84,transpose:0});

test('existing regional candidates reference actual source-syllable notes without replacing original source text',async()=>{
 const m=await model(1,1),p=full(m),before=JSON.stringify({words:m.words,notes:p}),a=link(p,m.words,lib,'sephardic',ne),b=link(p,m.words,lib,'sephardic',me);
 assert.equal(a.counts.linkedNotes,p.length);assert.equal(b.counts.linkedNotes,p.length);
 const first=a.links.find(l=>l.sourceWordId==='gen-1-1-2'),second=b.links.find(l=>l.eventId===first.eventId);
 assert.equal(first.hebrew,'בָּ');assert.equal(first.phonology.text,'bɔ');assert.equal(second.phonology.text,'bu');assert.equal(first.units[0].text,'ba');assert.equal(notePronunciationText(first),'bɔ');
 for(const report of[a,b])for(const l of report.links){assert.equal(l.status,'exact-written-span');for(const path of l.phonology.paths){assert(l.units.some(u=>u.sourceUnitId===path.sourceUnitId));for(const r of path.references){const event=report.sourceEvents.find(e=>e.id===r.proposalEventKey);assert(event.sourceSegmentIds.includes(r.sourceSegmentId));assert(event.noteReferences.some(n=>n.noteId===l.eventId&&n.sourceUnitId===path.sourceUnitId&&n.sourceSegmentId===r.sourceSegmentId));}}}
 assert.equal(JSON.stringify({words:m.words,notes:p}),before);
});
test('shared halves and melismas reference one abstract event without creating sound times or repeated consonants',async()=>{
 const m=await model(8,20),index=m.words.findIndex(w=>w.sourceWordId==='gen-8-20-7'),p=m.buildPlan(index,index),r=link(p,m.words,lib,'sephardic',ne);
 assert(r.counts.sharedEvents>0);assert(r.counts.unassignedEvents>0);assert(r.links.some(l=>l.phonology.text.includes('↔')));assert(r.links.some(l=>l.phonology.text.includes('?')));
 for(const event of r.sourceEvents.filter(e=>e.sourceSegmentIds.length>1)){assert.equal(event.sourceSegmentIds.length,2);assert(new Set(event.noteReferences.map(n=>n.sourceSegmentId)).size===2);}
 const opening=await model(1,1),end=full(opening),report=link(end,opening.words,lib,'sephardic',ne);
 assert(report.sourceEvents.some(e=>new Set(e.noteReferences.map(n=>n.noteId)).size>1&&e.sourceUnitIds.length===1));assert.equal(new Set(report.sourceEvents.map(e=>e.id)).size,report.sourceEvents.length);
 for(const e of[...r.sourceEvents,...report.sourceEvents])for(const k of['phonemes','enginePhones','quantity','duration','noteIds','audioTimes','review'])assert.equal(e[k],null);
 assert.equal(r.voice,null);assert.equal(r.phonemes,null);
});
test('independent profiles and MAM styles preserve every pitch, duration, word, source path and stress',async()=>{
 const m=await model(11,4),p=full(m),before=JSON.stringify(p),variants=[];
 for(const style of['sephardic','ashkenazic'])for(const profile of[ne,me]){const r=link(p,m.words,lib,style,profile);assert.equal(r.links.length,44);assert.equal(r.counts.linkedNotes,44);assert.deepEqual(r.links.map(l=>l.eventId),p.map(e=>e.id));for(const w of r.wordEvidence)for(const entry of w.entries)for(const part of entry.parts)assert.equal(typeof part.sourceStress,'boolean');variants.push(r);}
 assert.equal(JSON.stringify(p),before);assert.deepEqual(variants[0].links.map(l=>l.hebrew),variants[3].links.map(l=>l.hebrew));
 const up=m.buildPlan(0,m.words.length-1,{tempo:84,transpose:1}),slow=m.buildPlan(0,m.words.length-1,{tempo:42,transpose:0});
 assert.deepEqual(link(up,m.words,lib,'sephardic',ne),variants[0]);assert.deepEqual(link(slow,m.words,lib,'sephardic',ne),variants[0]);
 for(const [i,e]of p.entries()){assert.equal(up[i].midi,e.midi+1);assert.equal(up[i].durationSeconds,e.durationSeconds);assert.equal(slow[i].midi,e.midi);assert.equal(slow[i].durationSeconds,e.durationSeconds*2);}
});
test('source-only forms and combined words retain complete unallocated routes and receive no substitute proposals',async()=>{
 const m=await model(13,3,{source:false}),index=m.words.findIndex(w=>w.sourceWordId==='gen-13-3-13'),r=link(m.buildPlan(index,index),m.words,lib,'sephardic',ne);
 assert.equal(r.words[0].hebrew,'אֽ͏ָהֳלוֹ֙');assert.equal(r.counts.linkedNotes,0);assert.equal(r.sourceEvents.length,0);assert(r.links.every(l=>l.phonology===null&&l.reason==='source-only-written-form'));
 assert(r.wordEvidence[0].entries.some(e=>e.parts.every(p=>p.hebrewClusterRanges===null)));
 const combined=await model(32,6,{bookId:'deu',source:false}),c=link(combined.buildPlan(0,1),combined.words,lib,'ashkenazic',me);
 assert.equal(c.counts.linkedNotes,0);assert.equal(c.sourceEvents.length,0);assert.equal(c.wordEvidence.length,2);assert(c.wordEvidence.every(w=>w.entries.length===0&&w.evidence.routes.some(r=>r.units.some(u=>u.ownerWordId===null))));assert.deepEqual(c.words.map(w=>w.hebrew),['הֲ־','לַיְהוָה֙']);
});
test('repeated assignment occurrences keep distinct note references and selection does not invent acoustic segmentation',async()=>{
 const point={bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:1}},m=createReadingModel((await getCorpus()).passage([{id:'a',...point},{id:'b',...point}]),{sourceUnderlay:adapter}),p=full(m),r=link(p,m.words,lib,'sephardic',ne);
 assert.equal(r.words.length,14);assert.notEqual(m.words[0].id,m.words[7].id);assert.equal(m.words[0].sourceWordId,m.words[7].sourceWordId);
 assert(r.sourceEvents.some(e=>new Set(e.noteReferences.map(n=>n.wordId)).size===2&&new Set(e.noteReferences.map(n=>n.sourceWordId)).size===1));
 const selected=p.filter(e=>e.wordIndex===8),s=link(selected,m.words,lib,'sephardic',ne);assert(s.links.every(l=>l.wordId===m.words[8].id));assert(s.sourceEvents.every(e=>e.noteReferences.every(n=>selected.some(p=>p.id===n.noteId))));assert(s.sourceEvents.every(e=>e.audioTimes===null));
});
test('changed Hebrew, repeated note IDs, mismatched syllables and changed source stress fail closed',async()=>{
 const m=await model(1,1),p=m.buildPlan(1,1);
 assert.throws(()=>link([],m.words,lib,'sephardic','invented-profile'),/Unknown phonological/);assert.throws(()=>link([p[0],p[0]],m.words,lib,'sephardic',ne),/Duplicate/);
 assert.throws(()=>link([{...p[0],syllable:'ברא'}],m.words,lib,'sephardic',ne),/syllable/);
 const words=structuredClone(m.words);words[1].sourceHebrew='ברא';assert.throws(()=>link(p,words,lib,'sephardic',ne),/Hebrew|syllables/);
 let count=0;const changed={sourceCommit:lib.sourceCommit,study(w,s){const x=lib.study(w,s);if(++count>1)x.rows[0].styles[s][0].units[0].sourceStress=!x.rows[0].styles[s][0].units[0].sourceStress;return x;}};
 assert.throws(()=>link(p,m.words,changed,'sephardic',ne),/source-unit correspondence/);
});
test('staff underlay exposes the chosen research profile while original MAM links and all notes remain intact',async()=>{
 const m=await model(1,1),p=full(m),plain=linkPronunciationToNotes(p,m.words,lib,'sephardic'),before=JSON.stringify(plain),r=link(p,m.words,lib,'sephardic',ne),map=new Map(r.links.map(l=>[l.eventId,l])),svg=staffMarkup(p,m.words,0,p.length,{pronunciationLinks:map});
 assert(svg.includes('data-phonology-profile="'+ne+'"'));assert(svg.includes('lang="und-fonipa"'));assert(svg.includes('bɔ'));assert(svg.includes('∅'));assert.equal(JSON.stringify(plain),before);assert(plain.links.every(l=>!Object.hasOwn(l,'phonology')));
 assert.deepEqual(staffNotes(p,m.words,0,p.length,{pronunciationLinks:map}).map(e=>[e.id,e.midi,e.beats,e.syllable]),staffNotes(p,m.words,0,p.length).map(e=>[e.id,e.midi,e.beats,e.syllable]));
});
test('exact text links without source category evidence remain unavailable as phonemic proposals',async()=>{
 const m=await model(1,1),p=full(m),textOnly=new PronunciationLibrary(j('torah-display'),{underlay:j('torah-underlay')}),r=link(p,m.words,textOnly,'sephardic',ne);
 assert(r.links.every(l=>l.sourceTextStatus==='exact-written-span'&&l.status==='unlinked'&&l.reason==='no-phonemic-proposal-route'&&l.phonology===null));assert.equal(r.counts.linkedNotes,0);assert.equal(r.sourceEvents.length,0);assert(r.links.every(l=>notePronunciationText(l)===null));assert(r.wordEvidence.every(w=>w.evidence.sourceCategoryStatus==='source-categories-unavailable'));
});
test('every covered Torah note retains the pinned independent proposal correspondence and all unresolved nulls',()=>{
 const audit=JSON.parse(readFileSync(new URL('../docs/PRONUNCIATION-NOTE-PROPOSALS.json',import.meta.url)));
 assert.deepEqual(audit.coverage,{chapters:187,readerWords:79985,availableWords:77790,withheldWords:2195,sourceSyllables:187261,coveredSpans:2359,notes:224269});
 assert.deepEqual(audit.gaps,{'source-only-written-form':2181,'conflicting-source-paths':12,'combined-source-form':2});
 const pins={['sephardic|'+ne]:'a63f7c4c10e43f7d066325025177cae3b071e540bb5f739fe7e144197fcbfaab',['sephardic|'+me]:'cb5c661c2f40048cd78da704b6661eb000ebed2e2bbf6bf80acd15be6d89d5df',['ashkenazic|'+ne]:'a7e4296d7c59e128492c6bd1cb9be81e7e72f07d0662708e1b2d727ea0de1148',['ashkenazic|'+me]:'74ce494860a458335f3030cf71631a141d473ac92f88364b849e063d00911ba8'};
 assert.equal(audit.results.length,4);for(const r of audit.results){assert.equal(r.assignmentSha256,pins[r.sourceStyle+'|'+r.profileId]);assert.equal(r.linkedNotes,224269);assert.equal(r.unlinkedNotes,0);assert.equal(r.wordEvidenceRecords,77790);assert.equal(r.sourceEventRecords,485111);assert.equal(r.noteReferences,613006);assert.equal(r.sharedEventRecords,18185);assert.equal(r.unassignedEventRecords,r.profileId===ne?20248:20387);}
 for(const key of['acceptedPhonemes','acousticAllocation','newSingingVoice','review'])assert.equal(audit.invariants[key],null);
});
