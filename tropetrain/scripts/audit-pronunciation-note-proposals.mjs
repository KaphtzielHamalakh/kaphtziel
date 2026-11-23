import{readFileSync,writeFileSync}from'node:fs';import{gunzipSync}from'node:zlib';import{createHash}from'node:crypto';import assert from'node:assert/strict';
import{getCorpus}from'../library.js';import{createReadingModel}from'../music.js';import{PronunciationLibrary}from'../pronunciation.js';import{SourceSyllableUnderlay}from'../source-syllable-underlay.js';
import{PHONOLOGY_PROFILES,PHONOLOGY_SOURCE}from'../pronunciation-phonology.js';import{linkPronunciationProposalsToNotes}from'../pronunciation-note-proposals.js';
const j=n=>JSON.parse(gunzipSync(readFileSync(new URL('../data/pronunciation/'+n+'.json.gz',import.meta.url)))),lib=new PronunciationLibrary(j('torah-display'),{underlay:j('torah-underlay'),segments:j('torah-segments')}),adapter=new SourceSyllableUnderlay(lib),corpus=await getCorpus();
const coverage={chapters:0,readerWords:0,availableWords:0,withheldWords:0,sourceSyllables:0,coveredSpans:0,notes:0},gaps={};
const results=['sephardic','ashkenazic'].flatMap(sourceStyle=>PHONOLOGY_PROFILES.map(p=>({sourceStyle,profileId:p.id,notes:0,linkedNotes:0,unlinkedNotes:0,wordEvidenceRecords:0,sourceEventRecords:0,unassignedEventRecords:0,sourceSilentEventRecords:0,proposedAbsenceEventRecords:0,sharedEventRecords:0,noteReferences:0,maxResearchTextCodePoints:0,longestTextExample:null,hash:createHash('sha256')})));
for(const book of corpus.books.values())for(const chapter of book.chapters){
 const m=createReadingModel(corpus.passage([{id:'audit-'+book.id+'-'+chapter.number,bookId:book.id,start:{chapter:chapter.number,verse:1},end:{chapter:chapter.number,verse:chapter.verses.at(-1).number}}]),{sourceUnderlay:adapter});
 coverage.chapters++;coverage.readerWords+=m.words.length;
 for(const w of m.words){const s=w.sourceSyllableUnderlay;if(s.status==='available'){coverage.availableWords++;coverage.sourceSyllables+=w.syllables.length;}else{coverage.withheldWords++;gaps[s.reason]=(gaps[s.reason]??0)+1;}}
 let start=0;
 while(start<m.words.length){
  if(m.words[start].sourceSyllableUnderlay.status!=='available'){start++;continue;}
  let end=start;while(end+1<m.words.length&&m.words[end+1].sourceSyllableUnderlay.status==='available')end++;
  const plan=m.buildPlan(start,end,{tempo:84,transpose:0}),before=JSON.stringify(plan),byId=new Map(plan.map(e=>[e.id,e]));coverage.coveredSpans++;coverage.notes+=plan.length;
  for(const result of results){
   const report=linkPronunciationProposalsToNotes(plan,m.words,lib,result.sourceStyle,result.profileId),c=report.counts;
   assert.equal(c.linkedNotes,plan.length);assert.equal(c.unlinkedNotes,0);assert.equal(report.voice,null);assert.equal(report.phonemes,null);assert.equal(report.audioTimes,null);assert.equal(report.review,null);
   result.notes+=c.notes;result.linkedNotes+=c.linkedNotes;result.unlinkedNotes+=c.unlinkedNotes;result.wordEvidenceRecords+=report.wordEvidence.length;
   result.sourceEventRecords+=c.sourceEvents;result.unassignedEventRecords+=c.unassignedEvents;result.sourceSilentEventRecords+=c.sourceSilentEvents;result.proposedAbsenceEventRecords+=c.proposedAbsenceEvents;result.sharedEventRecords+=c.sharedEvents;
   for(const link of report.links){const note=byId.get(link.eventId);assert(note);assert.equal(link.hebrew,note.syllable);assert.equal(link.wordId,note.wordId);assert.equal(link.sourceWordId,note.sourceWordId);assert.equal(link.phonology.phonemes,null);assert.equal(link.phonology.duration,null);assert.equal(link.phonology.audioTimes,null);const length=[...link.phonology.text].length;if(length>result.maxResearchTextCodePoints){result.maxResearchTextCodePoints=length;result.longestTextExample={wordId:link.sourceWordId,hebrew:link.hebrew,text:link.phonology.text};}}
   for(const event of report.sourceEvents){
    for(const field of['phonemes','enginePhones','quantity','duration','noteIds','audioTimes','review'])assert.equal(event[field],null);
    for(const reference of event.noteReferences){result.noteReferences++;assert(byId.has(reference.noteId));assert(event.sourceUnitIds.includes(reference.sourceUnitId));assert(event.sourceSegmentIds.includes(reference.sourceSegmentId));}
   }
   for(const word of report.wordEvidence){assert.equal(word.hebrew,m.words.find(w=>w.id===word.wordId).sourceHebrew);assert.equal(word.phonemes,null);assert.equal(word.audioTimes,null);}
   result.hash.update(JSON.stringify({links:report.links,sourceEvents:report.sourceEvents,wordEvidence:report.wordEvidence})+'\n');
  }
  assert.equal(JSON.stringify(plan),before,'Pronunciation must not mutate any note or musical time.');start=end+1;
 }
 if(coverage.chapters%25===0)console.log(JSON.stringify({chapters:coverage.chapters,words:coverage.readerWords,notes:coverage.notes}));
}
assert.equal(coverage.readerWords,79985);assert.equal(coverage.availableWords,77790);assert.equal(coverage.withheldWords,2195);assert.equal(coverage.sourceSyllables,187261);
const inputs=['pronunciation-note-proposals.js','pronunciation-note-links.js','pronunciation-phonology-reader.js','pronunciation-phonology.js','source-syllable-underlay.js','music.js'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex')}));
const record={schema:'tropetrain-pronunciation-note-proposals-audit-v1',revision:1,coverage,gaps,source:PHONOLOGY_SOURCE,profiles:PHONOLOGY_PROFILES,
 results:results.map(({hash,...r})=>({...r,assignmentSha256:hash.digest('hex')})),inputs,
 method:'Every Torah chapter, every contiguous span of words with consensus source syllables, and actual original-demo buildPlan notes, in both MAM source styles and both existing research profiles. All source-unit/marked-Hebrew references are checked. Musical events and all accepted-phone/acoustic-timing nulls are preserved. Each assignment digest includes complete word evidence, every alternative route, note link and abstract event reference.',
 counting:'Event-record counts sum the abstract event registries of independent covered spans; they are not counts of distinct approved sounds across Torah. Shared and repeated-note references do not generate another abstract source event within a span. Withheld words retain their source-only, conflicting or combined evidence outside playable spans.',
 invariants:{originalMarkedHebrew:true,notesUnchanged:true,sourceBranchesRetained:true,sourceStressRetained:true,sharedEventsNotReplayed:true,acceptedPhonemes:null,acousticAllocation:null,newSingingVoice:null,review:null},
 attribution:'Source syllable/category correspondence: Hebrew Wikisource / Phonetic MAM, Benjamin Denckla, CC-BY-SA-4.0. Existing original linguistic fact implementation cites Katz1993. No source table, scan, new audio or phonological rule is imported.',
 pending:'Qualified linguistic/cantorial review, exact mobile sheva and other unresolved categories, phonetic transitions and allophones, sustained reusable singing material and phone-to-note performance timing. These two incomplete source-defined profiles establish no equivalence to any of the six Kinnor menu labels.'};
writeFileSync(new URL('../docs/PRONUNCIATION-NOTE-PROPOSALS.json',import.meta.url),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({coverage,results:record.results}));
