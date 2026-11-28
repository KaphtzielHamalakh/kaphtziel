import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {captureAuditInputs,verifyAuditInputs} from './audit-inputs.mjs';
import {PronunciationLibrary} from '../pronunciation.js';
import {phonologyWordProposal} from '../pronunciation-phonology.js';
import {TIBERIAN_CONSONANT_EVIDENCE as evidence,TIBERIAN_CONSONANT_PROFILE as profile} from '../tiberian-consonants.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),load=n=>JSON.parse(gunzipSync(read('data/pronunciation/'+n+'.json.gz')));
const inputPaths=['scripts/audit-tiberian-consonants.mjs','scripts/audit-inputs.mjs','data/phonology/khan-tiberian-consonants.json','tiberian-consonants.js','tiberian-consonant-data.js','pronunciation-phonology.js','pronunciation-phonology-reader.js','pronunciation-phonology-ui.js','historical-pronunciation-categories.js','pronunciation-stress.js','source-joint-syllables.js','data/pronunciation/torah-display.json.gz','data/pronunciation/torah-underlay.json.gz','data/pronunciation/torah-segments.json.gz',evidence.sourcePack.file];
const starting=captureAuditInputs(root,inputPaths),lib=new PronunciationLibrary(load('torah-display'),{underlay:load('torah-underlay'),segments:load('torah-segments')}),results=[];
for(const style of ['sephardic','ashkenazic']){
 const m={sourceStyle:style,groups:0,readerWords:0,routes:0,units:0,categoryReferences:0,consonantCandidateReferences:0,sourceSilentReferences:0,unassignedReferences:0,events:0,sharedEvents:0,sourceGeminateEvents:0,sourceOnlyUnits:0,collectiveUnits:0,consonantCategories:{},unassignedCategories:{}},hash=createHash('sha256');
 for(const group of lib.groups){
  const word={id:group.readerIds[0],sourceHebrew:group.readerHebrew[0]},study=lib.study(word,style),before=JSON.stringify(study),report=phonologyWordProposal(study,word,style,profile.id),expected=new Map(),seen=new Set();
  for(const row of study.rows)for(const cell of row.styles[style])for(const unit of cell.units)for(const branch of unit.sourceSegments.variants)for(const segment of branch.segments)expected.set(segment.id,{segment,unit,branch});
  assert.equal(report.hebrew,word.sourceHebrew);assert.equal(report.playable,false);assert.equal(report.source.id,evidence.source.id);
  for(const key of ['phonemes','notes','audioTimes','phonologicalReview','acousticReview','cantorialReview','singingVoice'])assert.equal(report[key],null);
  m.groups++;m.readerWords+=group.readerIds.length;m.routes+=report.routes.length;
  for(const route of report.routes){
   const events=new Map(route.events.map(e=>[e.id,e]));assert.equal(events.size,route.events.length);m.events+=events.size;
   for(const event of route.events){
    assert.notEqual(event.rule,'degemination');assert.equal(event.acousticGemination,null);
    for(const key of ['phonemes','enginePhones','quantity','duration','noteIds','audioTimes','review'])assert.equal(event[key],null);
    if(event.sourceSegmentIds.length===2){m.sharedEvents++;assert(event.sourceGemination);}
    if(event.sourceGemination)m.sourceGeminateEvents++;
   }
   for(const unit of route.units){
    m.units++;if(unit.readerRanges===null)m.sourceOnlyUnits++;if(unit.ownerWordId===null)m.collectiveUnits++;
    assert.equal(unit.vowelYodProposal,null);
    for(const fragment of unit.fragments){
     const o=expected.get(fragment.source.id);assert(o);assert(!seen.has(fragment.source.id));seen.add(fragment.source.id);
     assert.deepEqual(fragment.source,o.segment);assert.deepEqual(unit.readerRanges,o.branch.readerRanges);assert.deepEqual(unit.letterClusterBindings,o.branch.letterClusterBindings);assert.deepEqual(unit.sourceHebrew,o.branch.sourceHebrew);assert.deepEqual(unit.sourceLabels,o.branch.sourceLabels);assert.equal(unit.sourceText,o.unit.text);assert.equal(unit.sourceStress,o.unit.sourceStress);assert.equal(route.hebrewColumn,o.branch.hebrewColumn);
     const event=events.get(fragment.eventId),p=fragment.proposal;assert(event.sourceSegmentIds.includes(fragment.source.id)&&event.sourceUnitIds.includes(unit.sourceUnitId));
     for(const key of ['phonemes','ipa','enginePhones','quantity','duration','noteIds','audioTimes','review'])assert.equal(p[key],null);
     m.categoryReferences++;
     if(p.candidatePhonemes===null){m.unassignedReferences++;m.unassignedCategories[fragment.source.categoryId]=(m.unassignedCategories[fragment.source.categoryId]??0)+1;assert(fragment.source.kind!=='consonant'||fragment.source.categoryId==='ALEF_1MAPIQ');}
     else if(p.candidatePhonemes.length===0){m.sourceSilentReferences++;assert(['silent-letter','silent-vowel-sign'].includes(fragment.source.kind));assert.equal(p.rule,'source-silent-category');assert.equal(p.evidence.sourceCommit,evidence.categorySource.sourceCommit);}
     else{m.consonantCandidateReferences++;m.consonantCategories[fragment.source.categoryId]=(m.consonantCategories[fragment.source.categoryId]??0)+1;assert.equal(fragment.source.kind,'consonant');assert.equal(p.candidatePhonemes.length,1);assert.equal(p.evidence.sourceId,evidence.source.id);assert(p.evidence.printedPages.every(n=>evidence.source.printedPages.includes(n)));}
     hash.update(JSON.stringify([fragment.source.id,unit.ownerWordId,unit.readerRanges,unit.letterClusterBindings,p.candidatePhonemes,event.id,event.sourceSegmentIds,event.sourceGemination])+'\n');
    }
   }
  }
  assert.equal(seen.size,expected.size,'No source branch or category disappears.');assert.equal(JSON.stringify(study),before,'Original source study is immutable.');
 }
 assert.equal(m.groups,68504);assert.equal(m.readerWords,79985);assert.equal(m.routes,68719);assert.equal(m.units,194272);assert.equal(m.categoryReferences,518726);assert.equal(m.events,500476);assert.equal(m.sharedEvents,18250);assert.equal(m.unassignedCategories.ALEF_1MAPIQ,2);m.unseenBoundConsonantCategories=evidence.rules.flatMap(r=>r.categoryIds).filter(id=>!m.consonantCategories[id]);assert.equal(Object.keys(m.consonantCategories).length,55);assert.deepEqual(m.unseenBoundConsonantCategories,['FPE_1DAG_QAL','RESH_1DAG']);assert(m.unassignedReferences>0&&m.sourceSilentReferences>0&&m.sourceOnlyUnits>0&&m.collectiveUnits>0);assert.equal(m.consonantCandidateReferences+m.sourceSilentReferences+m.unassignedReferences,m.categoryReferences);
 results.push({...m,sourceBindingSha256:hash.digest('hex')});console.log(JSON.stringify({tiberianConsonants:results.at(-1)}));
}
const report={format:'tropetrain-khan-tiberian-consonant-coverage-v1',revision:1,profile,source:evidence.source,sourcePack:evidence.sourcePack,results,method:'Both source text styles, every Torah source group and all original source branches. Exact source marked Hebrew, word/syllable IDs, category identities, written ranges, letter bindings, stress and reciprocal shared halves are retained. Phoneme inventory types do not assign acoustic allophones, vowel readings, gemination duration, note ownership or recording times.',invariants:{all79985ReaderWordsRetained:true,allBranchesAndCategoryReferencesRetained:true,allSourceStudiesUnchanged:true,sourceSilenceDistinctFromUnknown:true,sourceGeminationRetained:true,sourceOnlyRangesStayNull:true,collectiveOwnershipUnsplit:true,newSingingVoices:0,newMelodySystems:0,qualifiedReview:null,acceptedPhonemes:null,acousticTiming:null},pending:'Complete source-specific vowels, sheva/contextual phonetics, source-edition comparison, exceptional consonants, prosody and gemination, independent linguistic/cantorial review and reusable aligned singing material. No Kinnor Accent equivalence or complete tradition grammar is established.',inputs:verifyAuditInputs(root,starting)};
writeFileSync(new URL('docs/KHAN-TIBERIAN-CONSONANT-COVERAGE.json',root),JSON.stringify(report,null,2)+'\n');
