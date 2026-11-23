import{readFile,writeFile}from'node:fs/promises';import{gunzipSync}from'node:zlib';import assert from'node:assert/strict';
import{PronunciationLibrary}from'../pronunciation.js';import{PHONOLOGY_PROFILES,PHONOLOGY_SOURCE,phonologyWordProposal}from'../pronunciation-phonology.js';
const json=async name=>JSON.parse(gunzipSync(await readFile(new URL('../data/pronunciation/'+name+'.json.gz',import.meta.url))));
const segments=await json('torah-segments'),lib=new PronunciationLibrary(await json('torah-display'),{underlay:await json('torah-underlay'),segments});
const results=[];
for(const style of ['sephardic','ashkenazic']){
 const metrics=PHONOLOGY_PROFILES.map(p=>({sourceStyle:style,profileId:p.id,groups:0,readerWords:0,routes:0,units:0,categoryReferences:0,proposedReferences:0,unassignedReferences:0,events:0,sharedEvents:0,vowelYodConstituentPairs:0,vowelYodCategories:{},contextGaps:{},unassignedCategories:{},contextualUnassigned:{},closure:{},stress:{}}));
 for(const group of lib.groups){
  const word={id:group.readerIds[0],sourceHebrew:group.readerHebrew[0]},study=lib.study(word,style),before=JSON.stringify(study);
  for(const [i,profile]of PHONOLOGY_PROFILES.entries()){
   const report=phonologyWordProposal(study,word,style,profile.id),m=metrics[i];m.groups++;m.readerWords+=group.readerIds.length;m.routes+=report.routes.length;
   assert.equal(report.hebrew,word.sourceHebrew);assert.equal(report.playable,false);assert.equal(report.phonemes,null);
   const expected=new Map(),seen=new Set();
   for(const r of study.rows)for(const c of r.styles[style])for(const u of c.units)for(const v of u.sourceSegments.variants)for(const s of v.segments)expected.set(s.id,{s,u,v});
   for(const route of report.routes){
    const eventMap=new Map(route.events.map(e=>[e.id,e]));m.events+=eventMap.size;m.sharedEvents+=route.events.filter(e=>e.sourceSegmentIds.length===2).length;
    for(const gap of route.gaps)m.contextGaps[gap.reason]=(m.contextGaps[gap.reason]??0)+1;
    for(const u of route.units){
     m.units++;m.closure[u.context.historicalClosure]=(m.closure[u.context.historicalClosure]??0)+1;m.stress[u.context.stressBasis]=(m.stress[u.context.stressBasis]??0)+1;
     if(u.vowelYodProposal){
      const p=u.vowelYodProposal;m.vowelYodConstituentPairs++;m.vowelYodCategories[u.context.vowelYod.vowelCategoryId]=(m.vowelYodCategories[u.context.vowelYod.vowelCategoryId]??0)+1;
      assert.equal(p.sourceSegmentIds.length,2);assert.equal(new Set(p.eventIds).size,2);assert(p.eventIds.every(id=>eventMap.has(id)));assert.deepEqual(p.candidatePhonemes,p.eventIds.flatMap(id=>eventMap.get(id).candidatePhonemes));
      assert.deepEqual(p.candidatePhonemes,[u.context.vowelYod.vowelCategoryId==='PATAX'?'a':'ɔ','j']);assert.equal(p.phonemes,null);assert.equal(p.enginePhones,null);assert.equal(p.quantity,null);assert.equal(p.duration,null);assert.equal(p.noteIds,null);assert.equal(p.audioTimes,null);assert.equal(p.review,null);
     }
     for(const f of u.fragments){const original=expected.get(f.source.id);assert(original);assert(!seen.has(f.source.id));seen.add(f.source.id);
      assert.deepEqual(f.source,original.s);assert.equal(u.sourceText,original.u.text);assert.equal(u.sourceStress,original.u.sourceStress);assert.deepEqual(u.readerRanges,original.v.readerRanges);assert.deepEqual(u.letterClusterBindings,original.v.letterClusterBindings);
      assert.equal(route.hebrewColumn,original.v.hebrewColumn);assert(eventMap.get(f.eventId).sourceSegmentIds.includes(f.source.id));assert.equal(f.proposal.phonemes,null);assert.equal(f.proposal.enginePhones,null);assert.equal(f.proposal.quantity,null);assert.equal(f.proposal.audioTimes,null);
      m.categoryReferences++;if(f.proposal.candidatePhonemes===null){m.unassignedReferences++;m.unassignedCategories[f.source.categoryId]=(m.unassignedCategories[f.source.categoryId]??0)+1;m.contextualUnassigned[f.proposal.rule]=(m.contextualUnassigned[f.proposal.rule]??0)+1;}else m.proposedReferences++;
     }
    }
   }
   assert.equal(seen.size,expected.size,'No source branch/category may disappear.');
  }
  assert.equal(JSON.stringify(study),before,'Original source study must remain unchanged.');
 }
 results.push(...metrics);
 console.log(JSON.stringify({sourceStyle:style,groups:metrics[0].groups,readerWords:metrics[0].readerWords,proposals:metrics.map(m=>({profile:m.profileId,references:m.categoryReferences,unassigned:m.unassignedReferences,gaps:m.contextGaps}))}));
}
const record={schema:'tropetrain-pronunciation-phonology-v1',revision:2,date:'2026-11-22',source:PHONOLOGY_SOURCE,profiles:PHONOLOGY_PROFILES,categorySource:{sourceCommit:segments.sourceCommit,inputSha256:segments.inputSha256,license:'CC-BY-SA-4.0'},results,
 invariants:{exactMarkedHebrewPreserved:true,allSourceBranchesPreserved:true,allSourceSegmentsPreserved:true,sourceStressPreserved:true,sourceRangesAndLetterBindingsPreserved:true,sharedHalvesReferenceOneEvent:true,sourceStudiesUnchanged:true,acousticRealizations:0,playableProfiles:0,reviewedProfiles:0},
 interpretation:'Each style/profile total includes all original source alternatives, not a single chosen reading or a count of finished words. Proposed phonemes are distinct from null approved phonemes. Silence is an empty candidate array; unknown is null. Formal source stress is preserved without invented penultimate stress or posttonic reduction. Closure precedes consonant loss and degemination. No source-only form gains a written range.',
 pending:['Qualified linguistic and cantorial review of every contextual correspondence and source stress/closure adaptation.','Exact mobile sheva, varika, special alef/mappiq and holam/shuruq–yod sequences; phonetic hiatus and local variation. Patah/qamats–yod constituents now have source-based proposals, not approved phonetic transitions.','Physical vowel quantity, acoustic allophones, reusable sustained singing voice material and phone/syllable/note timings.','Independent complete rules for all six historical Kinnor labels, with evidence establishing label equivalence; the two regional research proposals do not establish it.'],
 noChanges:['Original Hebrew, accents, MAM source packets, source IPA proposal, audio recordings, original timings, melodies, range and transposition.'],newSingingVoice:null,newMelodyGrammar:null};
const dest=new URL('../docs/PRONUNCIATION-PHONOLOGY.json',import.meta.url),text=JSON.stringify(record,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(await readFile(dest,'utf8'),text);else await writeFile(dest,text);
