import test from'node:test';import assert from'node:assert/strict';import{readFileSync as read}from'node:fs';import{gunzipSync as gz}from'node:zlib';
import{PronunciationLibrary}from'../pronunciation.js';import{SourceSyllableUnderlay}from'../source-syllable-underlay.js';import{chooseSourceStudy,readingChoices,readingStudyForWord}from'../source-reading-choices.js';import{getCorpus}from'../library.js';import{createReadingModel}from'../music.js';import{linkPronunciationToNotes,notePronunciationText}from'../pronunciation-note-links.js';import{linkPronunciationProposalsToNotes}from'../pronunciation-note-proposals.js';import{readerPronunciationWord}from'../pronunciation-reader.js';import{pronunciationFollow}from'../pronunciation-follow.js';
const j=n=>JSON.parse(gz(read(new URL('../data/pronunciation/'+n+'.json.gz',import.meta.url)))),lib=new PronunciationLibrary(j('torah-display'),{underlay:j('torah-underlay'),segments:j('torah-segments')}),corpus=await getCorpus();
const w=id=>{const h=lib.byWord.get(id);return{id,sourceHebrew:h.group.readerHebrew[h.index]};},policy=(qamats='קמץ-ד',cantillation='טעם תחתון')=>({qamats,cantillation}),adapter=p=>new SourceSyllableUnderlay(lib,{allowSourceReadings:true,sourceReadingChoices:p});
const model=(id,p)=>{const[book,ch,v]=id.split('-');return createReadingModel(corpus.passage([{id:'choice-test',bookId:book,start:{chapter:+ch,verse:+v},end:{chapter:+ch,verse:+v}}]),{sourceUnderlay:adapter(p)});};
test('explicit qamats source alternatives select three versus four syllables without changing Hebrew, and retain all original branches',()=>{
 const word=w('gen-32-18-6'),original=lib.study(word,'sephardic'),before=JSON.stringify(original),a=adapter(policy()).word(word),b=adapter(policy('קמץ-ס')).word(word);assert.equal(a.status,'available');assert.equal(a.syllables.length,3);assert.equal(b.syllables.length,4);assert.equal(a.hebrew,word.sourceHebrew);assert.equal(b.hebrew,word.sourceHebrew);assert.equal(JSON.stringify(original),before);assert.deepEqual(a.sourceChoiceEvidence.originalSourceGroup,original.sourceGroup);assert.equal(a.sourceChoiceEvidence.originalPaths.length,4);assert.equal(new SourceSyllableUnderlay(lib).word(word).reason,'conflicting-source-paths');
});
test('lower and upper text choices retain dual accents and source stress, without claiming a musical setting',()=>{
 const word=w('exo-20-3-1'),a=adapter(policy()).word(word),b=adapter(policy('קמץ-ד','טעם עליון')).word(word);assert.equal(a.syllables[0].stress,false);assert.equal(b.syllables[0].stress,true);assert.equal(a.syllables.map(s=>s.sourceHebrew).join(''),word.sourceHebrew);assert.equal(b.syllables.map(s=>s.sourceHebrew).join(''),word.sourceHebrew);assert.equal(a.voice,null);assert.equal(a.review,null);
});
test('Hebrew source branches sharing one transcription remain selectable with null written ranges',()=>{
 const word=w('deu-5-12-8'),a=adapter(policy()).word(word),b=adapter(policy('קמץ-ד','טעם עליון')).word(word);assert.equal(a.sourceReadingHebrew,'אֲדֹנָ֥י');assert.equal(b.sourceReadingHebrew,'אֲדֹנָ֣י');assert(a.syllables.every(s=>s.writtenRange===null));assert.equal(a.hebrew,word.sourceHebrew);assert.equal(a.sourceChoiceEvidence.originalPaths[0].units[0].hebrewUnderlay.variants.length,2);
});
test('literal reading variants with CGJ retain the entire canonical text and separate reading word ranges',()=>{
 const word=w('gen-13-3-13');for(const p of[policy(),policy('קמץ-ס')]){const r=adapter(p).word(word);assert.equal(r.status,'available');assert.equal(r.hebrew,word.sourceHebrew);assert(word.sourceHebrew.includes('\u034f'));assert(r.syllables.every(s=>s.writtenRange===null));for(const s of r.syllables)assert.equal(r.sourceReadingHebrew.slice(s.sourceReadingRange.start,s.sourceReadingRange.end),s.sourceHebrew);}
});
test('six maqaf source-reading endings have complete word ownership while combined syllables remain unsplit',()=>{
 for(const id of['gen-14-8-13','gen-27-38-7','deu-4-25-16','deu-17-2-19','deu-25-19-11','deu-32-7-6']){const word=w(id),r=adapter({}).word(word);assert.equal(r.status,'available');assert(r.sourceReadingHebrew.endsWith('־'));assert(r.syllables.every(s=>s.writtenRange===null));assert.equal(r.hebrew,word.sourceHebrew);}
 for(const id of['deu-32-6-1','deu-32-6-2']){const r=adapter(policy()).word(w(id));assert.equal(r.reason,'combined-source-form');assert.equal(r.syllables.length,0);assert(r.unallocatedSourceUnits.length>0);}
});
test('both MAM styles and two regional research profiles independently follow each selected source path, retaining null phones/timing',()=>{
 for(const id of['gen-32-18-6','gen-13-3-13','exo-20-3-1','deu-5-12-8'])for(const p of[policy(),policy('קמץ-ס','טעם עליון')]){
 const m=model(id,p),i=m.words.findIndex(x=>x.sourceWordId===id),word=m.words[i],plan=m.buildPlan(i,i),before=JSON.stringify(plan),texts=[];
 for(const style of['sephardic','ashkenazic']){const r=linkPronunciationToNotes(plan,m.words,lib,style);assert.equal(r.counts.linkedNotes,plan.length);assert(r.words[0].sourceChoiceEvidence.originalPaths.length>0);texts.push(r.links.map(notePronunciationText));for(const [n,l]of r.links.entries())assert.notEqual(pronunciationFollow(plan[n],word,l,style).status,'unlinked');
 const selected=readingStudyForWord(word,lib,style),reader=readerPronunciationWord(word,selected,style);assert(reader.entries.length>0);assert(reader.sourceSelection.originalStudy);for(const profile of['katz-1993-northeastern-formal','katz-1993-mideastern-formal']){const q=linkPronunciationProposalsToNotes(plan,m.words,lib,style,profile);assert.equal(q.counts.linkedNotes,plan.length);assert(q.wordEvidence[0].evidence.sourceSelection.originalStudy);assert.equal(q.phonemes,null);assert.equal(q.audioTimes,null);assert.equal(q.voice,null);}}
 assert.equal(JSON.stringify(plan),before);assert.deepEqual(plan[0].sourceSyllableLink.sourceReadingChoices,p);
 }
});
test('no choices leave source studies exact; unknown choices and repeated projections fail closed',()=>{
 const word=w('gen-32-18-6'),study=lib.study(word,'sephardic');assert.strictEqual(chooseSourceStudy(study,{}),study);assert.throws(()=>readingChoices({qamats:'first'}),/Unknown/);assert.throws(()=>readingChoices({melody:'x'}),/Unknown/);assert.throws(()=>chooseSourceStudy(chooseSourceStudy(study,policy()),policy()),/twice/);const plain=lib.study(w('gen-1-1-2'),'sephardic');assert.strictEqual(chooseSourceStudy(plain,policy()),plain);
});
test('source choices change original underlay syllables while tempo, transposition and vocal range remain separate',()=>{
 const m=model('gen-32-18-6',policy()),i=m.words.findIndex(x=>x.sourceWordId==='gen-32-18-6'),a=m.buildPlan(i,i,{tempo:80,transpose:0}),b=m.buildPlan(i,i,{tempo:40,transpose:2});assert.equal(a.length,b.length);for(let n=0;n<a.length;n++){assert.equal(b[n].midi,a[n].midi+2);assert.equal(b[n].durationSeconds,a[n].durationSeconds*2);assert.equal(b[n].syllable,a[n].syllable);assert.deepEqual(b[n].sourceSyllableLink,a[n].sourceSyllableLink);}
});

test('stale note policy cannot be relinked by reusing note and unit identities',()=>{
 const m=model('gen-32-18-6',policy()),i=m.words.findIndex(x=>x.sourceWordId==='gen-32-18-6'),plan=m.buildPlan(i,i),bad={...plan[0],sourceSyllableLink:{...plan[0].sourceSyllableLink,sourceReadingChoices:policy('קמץ-ס')}};assert.throws(()=>linkPronunciationToNotes([bad],m.words,lib,'sephardic'),/note choice changed/);
});
test('whole Torah audit checks all four policy combinations, original source reports and unassigned voices',()=>{
 const a=JSON.parse(read(new URL('../docs/SOURCE-READING-CHOICES.json',import.meta.url)));assert.equal(a.results.length,4);for(const r of a.results){assert.equal(r.counts.readerWords,79985);assert.equal(r.counts.availableWords,79983);assert.equal(r.counts.withheldWords,2);assert.equal(r.counts.unaffectedReportsExact,79748);assert.equal(r.counts.phonemicNoteChecks,r.counts.selectedNotes*4);}assert.equal(a.singingVoice,null);assert.equal(a.historicalMelodyGrammar,null);assert.equal(a.review,null);
});
