import{readFile,writeFile}from'node:fs/promises';import{gunzipSync}from'node:zlib';import assert from'node:assert/strict';
import{createHash}from'node:crypto';
import{MAQAF_STRESS_SOURCE}from'../pronunciation-stress.js';
import{PronunciationLibrary}from'../pronunciation.js';import{PHONOLOGY_PROFILES,PHONOLOGY_SOURCE,phonologyWordProposal}from'../pronunciation-phonology.js';
const json=async name=>JSON.parse(gunzipSync(await readFile(new URL('../data/pronunciation/'+name+'.json.gz',import.meta.url))));
const segments=await json('torah-segments'),lib=new PronunciationLibrary(await json('torah-display'),{underlay:await json('torah-underlay'),segments});
const priorKnownPins={"sephardic|katz-1993-northeastern-formal":{"count":498413,"sha256":"50ab66106569ada6c1e8949e47676128d6d0a6eac8a0b509cbbf2a4b6d53f6a3"},"sephardic|katz-1993-mideastern-formal":{"count":498225,"sha256":"d73c345de182d8b73262ab5f694e3e1e0d34537f978058173ce6db77581fd5cc"},"ashkenazic|katz-1993-northeastern-formal":{"count":498413,"sha256":"9e111c89bb067760f478becf7b66a131c0e620eb742c4e2eab18412f262c68ea"},"ashkenazic|katz-1993-mideastern-formal":{"count":498225,"sha256":"53e91f0e44f74bd46d9156a17ea935cd72d337456f7a5ec748a6ef5ca25e50a7"}};
const results=[];
for(const style of ['sephardic','ashkenazic']){
 const hashes=PHONOLOGY_PROFILES.map(()=>createHash('sha256'));
 const metrics=PHONOLOGY_PROFILES.map(p=>({sourceStyle:style,profileId:p.id,groups:0,readerWords:0,routes:0,units:0,categoryReferences:0,proposedReferences:0,unassignedReferences:0,events:0,sharedEvents:0,vowelYodConstituentPairs:0,vowelYodCategories:{},contextGaps:{},unassignedCategories:{},contextualUnassigned:{},closure:{},stress:{},maqafPrimaryUnits:0,maqafMetegUnits:0,newMaqafSegolReferences:0,preservedPriorKnownReferences:0}));
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
     if(u.context.maqafPrimary){m.maqafPrimaryUnits++;if(u.context.maqafPrimary.wordHasMeteg)m.maqafMetegUnits++;assert.equal(u.context.primaryStress,false);assert.equal(u.sourceStress,false);assert.equal(u.context.maqafPrimary.primaryWordId,study.readerIds.at(-1));assert.deepEqual(u.context.maqafPrimary.markedHebrew,study.readerHebrew);assert.equal(u.context.maqafPrimary.review,null);}
     if(u.vowelYodProposal){
      const p=u.vowelYodProposal;m.vowelYodConstituentPairs++;m.vowelYodCategories[u.context.vowelYod.vowelCategoryId]=(m.vowelYodCategories[u.context.vowelYod.vowelCategoryId]??0)+1;
      assert.equal(p.sourceSegmentIds.length,2);assert.equal(new Set(p.eventIds).size,2);assert(p.eventIds.every(id=>eventMap.has(id)));assert.deepEqual(p.candidatePhonemes,p.eventIds.flatMap(id=>eventMap.get(id).candidatePhonemes));
      assert.deepEqual(p.candidatePhonemes,[u.context.vowelYod.vowelCategoryId==='PATAX'?'a':'ɔ','j']);assert.equal(p.phonemes,null);assert.equal(p.enginePhones,null);assert.equal(p.quantity,null);assert.equal(p.duration,null);assert.equal(p.noteIds,null);assert.equal(p.audioTimes,null);assert.equal(p.review,null);
     }
     for(const f of u.fragments){const original=expected.get(f.source.id);assert(original);assert(!seen.has(f.source.id));seen.add(f.source.id);
      assert.deepEqual(f.source,original.s);assert.equal(u.sourceText,original.u.text);assert.equal(u.sourceStress,original.u.sourceStress);assert.deepEqual(u.readerRanges,original.v.readerRanges);assert.deepEqual(u.letterClusterBindings,original.v.letterClusterBindings);
      assert.equal(route.hebrewColumn,original.v.hebrewColumn);assert(eventMap.get(f.eventId).sourceSegmentIds.includes(f.source.id));assert.equal(f.proposal.phonemes,null);assert.equal(f.proposal.enginePhones,null);assert.equal(f.proposal.quantity,null);assert.equal(f.proposal.audioTimes,null);
      if(f.proposal.candidatePhonemes!==null){
       const added=profile.region==='mideastern'&&f.source.categoryId==='SEGOL_V'&&u.context.historicalClosure!=='closed'&&u.context.stressBasis==='source-maqaf-primary-in-final-word';
       if(added){m.newMaqafSegolReferences++;assert.deepEqual(f.proposal.candidatePhonemes,['ɛ']);assert.equal(u.context.maqafPrimary.wordHasMeteg,false);}
       else{m.preservedPriorKnownReferences++;hashes[i].update(JSON.stringify([f.source.id,f.proposal.candidatePhonemes])+'\n');}
      }
      m.categoryReferences++;if(f.proposal.candidatePhonemes===null){m.unassignedReferences++;m.unassignedCategories[f.source.categoryId]=(m.unassignedCategories[f.source.categoryId]??0)+1;m.contextualUnassigned[f.proposal.rule]=(m.contextualUnassigned[f.proposal.rule]??0)+1;}else m.proposedReferences++;
     }
    }
   }
   assert.equal(seen.size,expected.size,'No source branch/category may disappear.');
  }
  assert.equal(JSON.stringify(study),before,'Original source study must remain unchanged.');
 }
 for(const[i,m]of metrics.entries()){m.preservedPriorKnownSha256=hashes[i].digest('hex');const pin=priorKnownPins[style+'|'+m.profileId];assert.equal(m.preservedPriorKnownReferences,pin.count);assert.equal(m.preservedPriorKnownSha256,pin.sha256);}
 results.push(...metrics);
 console.log(JSON.stringify({sourceStyle:style,groups:metrics[0].groups,readerWords:metrics[0].readerWords,proposals:metrics.map(m=>({profile:m.profileId,references:m.categoryReferences,unassigned:m.unassignedReferences,gaps:m.contextGaps}))}));
}
const record={schema:'tropetrain-pronunciation-phonology-v1',revision:3,date:'2026-11-23',source:PHONOLOGY_SOURCE,prosodySources:[MAQAF_STRESS_SOURCE],priorKnownBaseline:{commit:'253c7511d075c9233a496e9b3266442fdeffb460',serialization:'source-order JSON.stringify([sourceSegmentId,candidatePhonemes])+newline for every non-null prior proposal',pins:priorKnownPins},profiles:PHONOLOGY_PROFILES,categorySource:{sourceCommit:segments.sourceCommit,inputSha256:segments.inputSha256,license:'CC-BY-SA-4.0'},results,
 invariants:{exactMarkedHebrewPreserved:true,allSourceBranchesPreserved:true,allSourceSegmentsPreserved:true,sourceStressPreserved:true,sourceRangesAndLetterBindingsPreserved:true,sharedHalvesReferenceOneEvent:true,sourceStudiesUnchanged:true,acousticRealizations:0,playableProfiles:0,reviewedProfiles:0},
 interpretation:'Each style/profile total includes all original source alternatives, not a single chosen reading or a count of finished words. Proposed phonemes are distinct from null approved phonemes. Silence is an empty candidate array; unknown is null. Formal source stress is preserved without invented penultimate stress or posttonic reduction. Closure precedes consonant loss and degemination. A complete same-verse maqaf chain can exclude a separate prefix primary when its final word has the sole explicit source primary. Meteg-bearing prefix words retain unresolved open-segol quality. No source-only form gains a written range.',
 pending:['Qualified linguistic and cantorial review of every contextual correspondence and source stress/closure adaptation.','Secondary/meteg quality and incomplete maqaf source frames remain unresolved. Exact mobile sheva, varika, special alef/mappiq and holam/shuruq–yod sequences; phonetic hiatus and local variation. Patah/qamats–yod constituents now have source-based proposals, not approved phonetic transitions.','Physical vowel quantity, acoustic allophones, reusable sustained singing voice material and phone/syllable/note timings.','Independent complete rules for all six historical Kinnor labels, with evidence establishing label equivalence; the two regional research proposals do not establish it.'],
 noChanges:['Original Hebrew, accents, MAM source packets, source IPA proposal, audio recordings, original timings, melodies, range and transposition.'],newSingingVoice:null,newMelodyGrammar:null};
const dest=new URL('../docs/PRONUNCIATION-PHONOLOGY.json',import.meta.url),text=JSON.stringify(record,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(await readFile(dest,'utf8'),text);else await writeFile(dest,text);
