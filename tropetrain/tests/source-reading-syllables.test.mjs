import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';
import{PronunciationLibrary}from'../pronunciation.js';import{SourceSyllableUnderlay,sourceSyllableWord}from'../source-syllable-underlay.js';import{sourceReadingSyllables}from'../source-reading-syllables.js';import{getCorpus}from'../library.js';import{createReadingModel}from'../music.js';import{linkPronunciationToNotes,notePronunciationText}from'../pronunciation-note-links.js';import{linkPronunciationProposalsToNotes}from'../pronunciation-note-proposals.js';import{pronunciationFollow}from'../pronunciation-follow.js';import{staffMarkup}from'../staff.js';
const j=n=>JSON.parse(gunzipSync(readFileSync(new URL('../data/pronunciation/'+n+'.json.gz',import.meta.url)))),lib=new PronunciationLibrary(j('torah-display'),{underlay:j('torah-underlay'),segments:j('torah-segments')}),adapter=new SourceSyllableUnderlay(lib,{allowSourceReadings:true}),old=new SourceSyllableUnderlay(lib),corpus=await getCorpus();
const word=id=>{const h=lib.byWord.get(id);return{id,sourceHebrew:h.group.readerHebrew[h.index]};},studies=w=>Object.fromEntries(['sephardic','ashkenazic'].map(s=>[s,lib.study(w,s)]));
const passage=()=>corpus.passage([{id:'study',bookId:'gen',start:{chapter:2,verse:4},end:{chapter:2,verse:4}}]);
test('different source readings retain exact displayed Hebrew and null written syllable ranges behind explicit opt-in',()=>{
 const w=word('gen-2-4-8'),r=adapter.word(w);assert.equal(old.word(w).reason,'source-only-written-form');assert.equal(r.hebrew,'יְהוָ֥ה');assert.equal(r.sourceReadingHebrew,'אֲדֹנָ֥י');assert.equal(r.alignmentLevel,'source-reading-word');assert.deepEqual(r.syllables.map(s=>s.sourceHebrew),['אֲ','דֹ','נָ֥י']);assert(r.syllables.every(s=>s.writtenRange===null&&s.sourceUnitIds.length===2&&s.phonemes===null&&s.acousticTimes===null));assert.deepEqual(r.paths,old.word(w).paths);
 const covered=word('gen-1-1-2');assert.deepEqual(adapter.word(covered),old.word(covered));
});
test('source reading notes follow both independent text styles and regional candidates without acoustic timing',()=>{
 const p=passage(),before=JSON.stringify(p),m=createReadingModel(p,{sourceUnderlay:adapter}),i=m.words.findIndex(w=>w.sourceWordId==='gen-2-4-8'),plan=m.buildPlan(i,i,{tempo:60}),w=m.words[i];assert(plan.length>=3);
 const labels=[];for(const style of['sephardic','ashkenazic']){
  const r=linkPronunciationToNotes(plan,m.words,lib,style);assert.equal(r.counts.linkedNotes,plan.length);labels.push(r.links.map(notePronunciationText));
  for(const[e,l]of plan.map((e,i)=>[e,r.links[i]])){assert.equal(l.hebrewRange,null);assert.equal(l.status,'source-reading-word');assert.equal(e.sourceSyllableLink.writtenRange,null);assert.equal(e.sourceSyllableLink.readerHebrew,w.sourceHebrew);assert.equal(pronunciationFollow(e,w,l,style).status,'source-reading-word');}
  for(const profile of['katz-1993-northeastern-formal','katz-1993-mideastern-formal']){const r=linkPronunciationProposalsToNotes(plan,m.words,lib,style,profile);assert.equal(r.counts.linkedNotes,plan.length);assert(r.links.every(l=>l.hebrewRange===null&&l.phonology.duration===null));assert.equal(r.voice,null);}
 }
 assert.notDeepEqual(labels[0],labels[1]);assert.equal(JSON.stringify(p),before);assert.equal(m.words[i].sourceHebrew,'יְהוָ֥ה');
 const up=m.buildPlan(i,i,{tempo:120,transpose:3});for(const[n,e]of plan.entries()){assert.equal(up[n].midi,e.midi+3);assert.equal(up[n].durationSeconds,e.durationSeconds/2);assert.deepEqual(up[n].sourceSyllableLink,e.sourceSyllableLink);}
});
test('source branches, source word boundary, spelling and stress disagreements cannot be silently selected',()=>{
 const w=word('gen-2-4-8'),s=studies(w),base=sourceSyllableWord(w,s),before=JSON.stringify(s);
 const mismatch=structuredClone(base);mismatch.paths[1].units[1].sourceStress=!mismatch.paths[1].units[1].sourceStress;assert.equal(sourceReadingSyllables(w,s,mismatch).status,'unavailable');
 const unknown=structuredClone(base);for(const p of unknown.paths)for(const u of p.units)for(const v of u.hebrewUnderlay.variants)v.source.text='ב';assert.equal(sourceReadingSyllables(w,s,unknown).status,'unavailable');
 const part=structuredClone(base);for(const p of part.paths)p.units.shift();assert.equal(sourceReadingSyllables(w,s,part).status,'unavailable');
 const stolen=structuredClone(s);stolen.sephardic.rows[0].styles.sephardic[0].units[0].readerWordId='wrong';assert.throws(()=>sourceReadingSyllables(w,stolen,base),/ownership/);assert.equal(JSON.stringify(s),before);
});
test('remaining CGJ, combined and conflicting words stay withheld; score labels distinguish reading from written syllables',()=>{
 for(const id of['gen-13-3-13','gen-32-18-6','deu-32-6-1','deu-32-6-2']){const w=word(id),r=adapter.word(w);assert.equal(r.status,'unavailable');assert.equal(r.reason,old.word(w).reason);assert.equal(r.hebrew,w.sourceHebrew);}
 const m=createReadingModel(passage(),{sourceUnderlay:adapter}),i=m.words.findIndex(w=>w.sourceWordId==='gen-2-4-8'),plan=m.buildPlan(i,i),r=linkPronunciationToNotes(plan,m.words,lib,'ashkenazic'),svg=staffMarkup(plan,m.words,0,plan.length,{pronunciationLinks:new Map(r.links.map(l=>[l.eventId,l]))});assert(svg.includes('data-syllable-alignment="source-reading-word"'));assert(svg.includes('word correspondence only'));assert(svg.includes('יְהוָ֥ה'));assert(svg.includes('נָ֥י'));
});
test('altered note/source identity and false written spans fail closed while repeated occurrences keep their own highlights',()=>{
 const p=passage(),m=createReadingModel(corpus.passage([{...p.ranges[0],id:'one'},{...p.ranges[0],id:'two'}]),{sourceUnderlay:adapter}),ix=m.words.map((w,i)=>(w.sourceWordId==='gen-2-4-8'?i:-1)).filter(i=>i>=0);assert.equal(ix.length,2);
 const a=m.buildPlan(ix[0],ix[0]),b=m.buildPlan(ix[1],ix[1]);assert.notEqual(a[0].id,b[0].id);assert.deepEqual(a[0].sourceSyllableLink.sourceUnitIds,b[0].sourceSyllableLink.sourceUnitIds);
 const r=linkPronunciationToNotes(a,m.words,lib,'sephardic');assert.throws(()=>pronunciationFollow(b[0],m.words[ix[1]],r.links[0],'sephardic'),/occurrence/);
 assert.throws(()=>linkPronunciationToNotes([{...a[0],sourceSyllableLink:{...a[0].sourceSyllableLink,writtenRange:{start:0,end:2}}}],m.words,lib,'sephardic'),/reading note correspondence/);
 const bad={...r.links[0],readerHebrew:'יהוה'};assert.throws(()=>pronunciationFollow(a[0],m.words[ix[0]],bad,'sephardic'),/word correspondence/);
});
test('joined source rows keep original row offsets separately from intervals inside each complete reading word',()=>{
 const w=word('gen-4-1-14'),r=adapter.word(w);assert.equal(r.alignmentLevel,'source-reading-word');assert.equal(r.sourceReadingHebrew,'אֲדֹנָֽי׃');assert.equal(r.syllables[0].sourceReadingRange.start,0);assert.equal(r.paths[0].units[0].hebrewUnderlay.variants[0].source.start,4);
 for(const s of r.syllables){assert.equal(r.sourceReadingHebrew.slice(s.sourceReadingRange.start,s.sourceReadingRange.end),s.sourceHebrew);assert.equal(s.writtenRange,null);}
 assert.equal(r.hebrew,w.sourceHebrew);
});
test('stale source reading text, stress, source ranges and note provenance cannot reuse old unit IDs',()=>{
 const m=createReadingModel(passage(),{sourceUnderlay:adapter}),i=m.words.findIndex(w=>w.sourceWordId==='gen-2-4-8'),p=m.buildPlan(i,i),w=m.words[i];
 for(const change of[u=>u.text='changed',u=>u.sourceStress=!u.sourceStress,u=>u.hebrewUnderlay.variants[0].source.end++]){
  const bad={sourceCommit:lib.sourceCommit,study:(word,style)=>{const s=structuredClone(lib.study(word,style));for(const row of s.rows)for(const c of row.styles[style])for(const u of c.units)if(u.id===p[0].sourceSyllableLink.sourceUnitIds[0])change(u);return s;}};
  assert.throws(()=>linkPronunciationToNotes(p,m.words,bad,'sephardic'),/pronunciation path changed/);
 }
 const wrong={...p[0],sourceSyllableLink:{...p[0].sourceSyllableLink,sourceReadingRange:{start:1,end:2}}};assert.throws(()=>linkPronunciationToNotes([wrong],m.words,lib,'sephardic'),/note correspondence changed/);
 const r=linkPronunciationToNotes(p,m.words,lib,'sephardic');assert.throws(()=>pronunciationFollow(p[0],w,{...r.links[0],sourceReadingRange:{start:1,end:2}},'sephardic'),/word correspondence/);
});
test('the all-Torah audit preserves prior coverage and verifies every added source reading in four independent combinations',()=>{
 const r=JSON.parse(readFileSync(new URL('../docs/SOURCE-READING-PLAYBACK.json',import.meta.url)));assert.equal(r.counts.readerWords,79985);assert.equal(r.counts.writtenWords,77790);assert.equal(r.counts.sourceReadingWords,2178);assert.equal(r.counts.availableWords,79968);assert.equal(r.counts.withheldWords,17);assert.equal(r.remaining.length,17);assert.equal(r.counts.phonemicProfileNoteChecks,r.counts.addedNotes*4);assert.equal(r.counts.sourceTextNoteChecks,r.counts.addedNotes*2);assert.equal(r.invariants.writtenSyllableRangesForDifferentForms,null);assert.equal(r.invariants.singingVoice,null);assert.equal(r.invariants.historicalMelodyGrammar,null);assert.equal(r.priorWrittenAssignmentSha256,'a7b487372767d724032a352c9e5f258a56de607aaf4582ff1685134cb928de66');
});
