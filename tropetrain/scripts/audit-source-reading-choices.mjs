import{readFileSync as read,writeFileSync as write}from'node:fs';import{gunzipSync as gz}from'node:zlib';import{createHash}from'node:crypto';import assert from'node:assert/strict';import{PronunciationLibrary}from'../pronunciation.js';import{SourceSyllableUnderlay}from'../source-syllable-underlay.js';import{getCorpus}from'../library.js';import{createReadingModel}from'../music.js';import{linkPronunciationToNotes}from'../pronunciation-note-links.js';import{linkPronunciationProposalsToNotes}from'../pronunciation-note-proposals.js';
const j=n=>JSON.parse(gz(read(new URL('../data/pronunciation/'+n+'.json.gz',import.meta.url)))),lib=new PronunciationLibrary(j('torah-display'),{underlay:j('torah-underlay'),segments:j('torah-segments')}),corpus=await getCorpus(),base=new SourceSyllableUnderlay(lib,{allowSourceReadings:true});
const results=[];
for(const qamats of['קמץ-ד','קמץ-ס'])for(const cantillation of['טעם תחתון','טעם עליון']){
 const policy={qamats,cantillation},adapter=new SourceSyllableUnderlay(lib,{allowSourceReadings:true,sourceReadingChoices:policy}),counts={readerWords:0,availableWords:0,withheldWords:0,sourceReadingWords:0,selectedWords:0,selectedNotes:0,textNoteChecks:0,phonemicNoteChecks:0,unaffectedReportsExact:0},remaining=[],hash=createHash('sha256');
 for(const book of corpus.books.values())for(const chapter of book.chapters){
  const p=corpus.passage([{id:'choices-'+book.id+'-'+chapter.number,bookId:book.id,start:{chapter:chapter.number,verse:1},end:{chapter:chapter.number,verse:chapter.verses.at(-1).number}}]),before=JSON.stringify(p),m=createReadingModel(p,{sourceUnderlay:adapter});
  for(const w of m.words){
   counts.readerWords++;const r=w.sourceSyllableUnderlay;assert.equal(r.hebrew,w.sourceHebrew);
   if(r.status!=='available'){counts.withheldWords++;remaining.push({id:w.sourceWordId??w.id,hebrew:w.sourceHebrew,reason:r.reason});continue;}counts.availableWords++;if(r.alignmentLevel==='source-reading-word')counts.sourceReadingWords++;
   hash.update(JSON.stringify([w.sourceWordId??w.id,w.sourceHebrew,r.alignmentLevel??'written',w.syllables.map(s=>[s.sourceHebrew,s.stress,s.writtenRange,s.sourceReadingRange??null,s.sourceUnitIds])])+'\n');
   if(!r.sourceChoiceEvidence){assert.deepEqual(r,base.word(w));counts.unaffectedReportsExact++;continue;}counts.selectedWords++;
   assert.deepEqual(r.sourceChoiceEvidence.originalSourceGroup,lib.at(w));assert.equal(r.sourceChoiceEvidence.review,null);
   const plan=m.buildPlan(w.index,w.index),saved=JSON.stringify(plan);counts.selectedNotes+=plan.length;
   for(const style of['sephardic','ashkenazic']){
    const text=linkPronunciationToNotes(plan,m.words,lib,style);assert.equal(text.counts.linkedNotes,plan.length);counts.textNoteChecks+=plan.length;assert(text.words[0].sourceChoiceEvidence.originalPaths.length>0);
    for(const profile of['katz-1993-northeastern-formal','katz-1993-mideastern-formal']){const phon=linkPronunciationProposalsToNotes(plan,m.words,lib,style,profile);assert.equal(phon.counts.linkedNotes,plan.length);counts.phonemicNoteChecks+=plan.length;assert.equal(phon.voice,null);assert.equal(phon.audioTimes,null);assert(phon.wordEvidence[0].evidence.sourceSelection.originalStudy);}
   }
   assert.equal(JSON.stringify(plan),saved);
  }
  assert.equal(JSON.stringify(p),before);
 }
 assert.equal(counts.readerWords,79985);assert.equal(counts.availableWords,79983);assert.equal(counts.withheldWords,2);assert.deepEqual(remaining.map(x=>x.id),['deu-32-6-1','deu-32-6-2']);
 results.push({policy,counts,remaining,assignmentSha256:hash.digest('hex')});console.log(JSON.stringify(results.at(-1)));
}
const inputs=['source-reading-choices.js','source-reading-syllables.js','source-syllable-underlay.js','pronunciation-note-links.js','pronunciation-note-proposals.js','pronunciation-reader.js','pronunciation-phonology.js','music.js'].map(path=>({path,sha256:createHash('sha256').update(read(new URL('../'+path,import.meta.url))).digest('hex')}));
const record={schema:'tropetrain-source-reading-choices-audit-v1',revision:1,sourceCommit:lib.sourceCommit,sourceLicense:'CC-BY-SA-4.0',sourceUrl:'https://github.com/bdenckla/MAM-basics/tree/6f0612ed2109d32e288d7c0ca41ae3dbfaad702b/Phonetic-MAM',attribution:'Hebrew Wikisource; MAM prepared by Seth (Avi) Kadish with Erel Segal-Halevi and Benjamin Denckla',results,inputs,
 method:'Explicit literal source labels select complete Hebrew columns consistently across both text styles, never a first-column guess. All source syllable/stress alternatives remain in originalStudy and sourceChoiceEvidence. Six maqaf-ending reading words include their own separator; exact complete-word ownership and original row offsets are retained. Displayed Hebrew/accents remain unchanged. Different reading spellings have null written syllable ranges. No source phones/timing/voice is assigned.',
 pending:'The first source syllable in Deuteronomy32:6 spans two written words; both remain combined and withheld from individual-word underlay. Independent linguistic/cantorial review, six historical pronunciation grammars/voices and contextual musical realizations remain pending.',phonemes:null,sourceTiming:null,singingVoice:null,historicalMelodyGrammar:null,review:null};write(new URL('../docs/SOURCE-READING-CHOICES.json',import.meta.url),JSON.stringify(record,null,2)+'\n');
