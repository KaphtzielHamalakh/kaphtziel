import{readFileSync,writeFileSync}from'node:fs';import{gunzipSync}from'node:zlib';import{createHash}from'node:crypto';import assert from'node:assert/strict';
import{PronunciationLibrary}from'../pronunciation.js';import{SourceSyllableUnderlay}from'../source-syllable-underlay.js';
import{getCorpus}from'../library.js';import{createReadingModel}from'../music.js';import{linkPronunciationToNotes}from'../pronunciation-note-links.js';import{linkPronunciationProposalsToNotes}from'../pronunciation-note-proposals.js';import{PHONOLOGY_PROFILES}from'../pronunciation-phonology.js';
const j=n=>JSON.parse(gunzipSync(readFileSync(new URL('../data/pronunciation/'+n+'.json.gz',import.meta.url)))),lib=new PronunciationLibrary(j('torah-display'),{underlay:j('torah-underlay'),segments:j('torah-segments')}),old=new SourceSyllableUnderlay(lib),adapter=new SourceSyllableUnderlay(lib,{allowSourceReadings:true}),corpus=await getCorpus();
const counts={chapters:0,readerWords:0,writtenWords:0,sourceReadingWords:0,availableWords:0,withheldWords:0,addedSourceSyllables:0,addedNotes:0,sourceTextNoteChecks:0,phonemicProfileNoteChecks:0},gaps={},remaining=[],examples=[],hash=createHash('sha256');
for(const book of corpus.books.values())for(const chapter of book.chapters){
 const p=corpus.passage([{id:'reading-audit-'+book.id+'-'+chapter.number,bookId:book.id,start:{chapter:chapter.number,verse:1},end:{chapter:chapter.number,verse:chapter.verses.at(-1).number}}]),m=createReadingModel(p,{sourceUnderlay:adapter}),before=JSON.stringify(p);counts.chapters++;
 for(const w of m.words){
  counts.readerWords++;const r=w.sourceSyllableUnderlay,previous=old.word(w);assert.equal(r.hebrew,w.sourceHebrew);
  if(previous.status==='available'){counts.writtenWords++;assert.deepEqual(r,previous);}
  if(r.status!=='available'){counts.withheldWords++;gaps[r.reason]=(gaps[r.reason]??0)+1;remaining.push({id:w.sourceWordId??w.id,hebrew:w.sourceHebrew,reason:r.reason});continue;}
  counts.availableWords++;
  if(r.alignmentLevel!=='source-reading-word')continue;
  counts.sourceReadingWords++;counts.addedSourceSyllables+=w.syllables.length;assert.equal(previous.reason,'source-only-written-form');assert(w.syllables.every(s=>s.writtenRange===null));assert.equal(w.syllables.map(s=>s.sourceHebrew).join(''),r.sourceReadingHebrew);
  for(const s of w.syllables)assert.equal(r.sourceReadingHebrew.slice(s.sourceReadingRange.start,s.sourceReadingRange.end),s.sourceHebrew);
  const plan=m.buildPlan(w.index,w.index,{tempo:84,transpose:0}),notesBefore=JSON.stringify(plan);counts.addedNotes+=plan.length;
  for(const style of['sephardic','ashkenazic']){
   const text=linkPronunciationToNotes(plan,m.words,lib,style);assert.equal(text.counts.linkedNotes,plan.length);counts.sourceTextNoteChecks+=text.counts.linkedNotes;
   for(const l of text.links){assert.equal(l.status,'source-reading-word');assert.equal(l.hebrewRange,null);assert.equal(l.readerHebrew,w.sourceHebrew);assert(l.units.every(u=>u.hebrewClusterRanges===null));}
   for(const profile of PHONOLOGY_PROFILES){const phon=linkPronunciationProposalsToNotes(plan,m.words,lib,style,profile.id);assert.equal(phon.counts.linkedNotes,plan.length);counts.phonemicProfileNoteChecks+=phon.counts.linkedNotes;assert(phon.links.every(l=>l.status==='source-reading-word'&&l.phonology.audioTimes===null));assert.equal(phon.voice,null);}
  }
  assert.equal(JSON.stringify(plan),notesBefore);hash.update(JSON.stringify([w.sourceWordId??w.id,w.sourceHebrew,r.sourceReadingHebrew,w.syllables.map(s=>[s.sourceHebrew,s.sourceUnitIds,s.sourceReadingRange,s.stress])])+'\n');
  if(examples.length<6)examples.push({id:w.sourceWordId??w.id,hebrew:w.sourceHebrew,reading:r.sourceReadingHebrew,syllables:w.syllables.map(s=>s.sourceHebrew)});
 }
 assert.equal(JSON.stringify(p),before);
}
assert.equal(counts.readerWords,79985);assert.equal(counts.writtenWords,77790);assert.equal(counts.sourceReadingWords,2172);assert.equal(counts.availableWords,79962);assert.equal(counts.withheldWords,23);
const record={schema:'tropetrain-source-reading-playback-audit-v1',revision:1,counts,gaps,remaining,examples,sourceReadingAssignmentSha256:hash.digest('hex'),priorWrittenAssignmentSha256:'a7b487372767d724032a352c9e5f258a56de607aaf4582ff1685134cb928de66',
 source:{project:'Phonetic MAM by Benjamin Denckla, Hebrew Wikisource',commit:lib.sourceCommit,url:'https://github.com/bdenckla/MAM-basics/tree/6f0612ed2109d32e288d7c0ca41ae3dbfaad702b',license:'CC-BY-SA-4.0',attribution:'Hebrew Wikisource; MAM prepared by Seth (Avi) Kadish with Erel Segal-Halevi and Benjamin Denckla',attributionUrl:'https://en.wikisource.org/wiki/User:Dovi/Miqra_according_to_the_Masorah#beginning',notice:'assets/pronunciation/NOTICE.txt'},
 method:'Opt-in extension only. All original source paths and both transcription styles must agree on complete source-reading syllables and stress. Source word ownership and a documented reader letter form must agree. Source-reading offsets belong to the source form; displayed Hebrew is unchanged, and written syllable ranges remain null. All 77,790 previous written-word reports are deeply identical.',
 invariants:{markedHebrewUnchanged:true,sourceBranchesRetained:true,sourceStressRetained:true,priorWrittenReportsExact:true,writtenSyllableRangesForDifferentForms:null,acceptedPhonemes:null,acousticAllocation:null,singingVoice:null,historicalMelodyGrammar:null,review:null},
 performance:{melodyId:'original-demo-01',kind:'original-instrumental-demonstration',sourceDurationsAssigned:false},
 pending:'The remaining23words retain source-only, conflicting or combined evidence. Independent linguistic/cantorial review, complete historical melody grammars and reusable reviewed singing voices for independent pronunciation styles remain pending. Research phonemic candidates retain every unresolved category and null acoustic realization.'};
writeFileSync(new URL('../docs/SOURCE-READING-PLAYBACK.json',import.meta.url),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({sourceReadingPlayback:counts,gaps,assignmentSha256:record.sourceReadingAssignmentSha256}));
