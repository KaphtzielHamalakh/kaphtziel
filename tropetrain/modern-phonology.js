// Original adaptation of the attributed Phonikud code inventory to existing
// Phonetic MAM source categories. No text normalization or speech model is used.
import {HISTORICAL_CATEGORY_INVENTORY as categorySource} from './historical-pronunciation-categories.js';
export const MODERN_PHONOLOGY_SOURCE=Object.freeze({
 id:'phonikud-modern-inventory',author:'Yakov Kolani, Maxim Melichov, Cobi Calev and Morris Alper',
 title:'Phonikud modern phoneme inventory · source-category adaptation',year:2026,
 url:'https://github.com/phonikud/phonikud/tree/a29a75b473b0f132a0bbee41dad38763035211dc',
 commit:'a29a75b473b0f132a0bbee41dad38763035211dc',license:'CC-BY-4.0',
 files:Object.freeze({lexicon:'phonikud/lexicon.py',letterRules:'phonikud/hebrew.py',wordCleanup:'phonikud/utils.py'}),
 blobs:Object.freeze({lexicon:'d77243234b5df6bd67e2ed4c23f7a3c4a4d7c4f3',letterRules:'6db91fdc8aac4119709763053e3c8fc2de5cdf9f',wordCleanup:'0aeeb9415670b9db9aff21136c9813dc145ab034',license:'2f9844fb9ad34ab57e88a1edcef3cdc0be887b42'}),
 rights:'Phonikud code is CC BY4.0; adapted correspondences are attributed here and in the visible source link. No model, dataset or audio is imported.',
 scope:'Inventory correspondence at original MAM source categories. This is not the upstream whole-word phonemizer or a complete modern pronunciation grammar. Biblical marks are never passed as its invented annotations. Spoken sheva, special categories, final/suffix processing, quantity and acoustic realization remain unresolved.',
 scanLimits:'No scan. Original code sources and exact Git blobs are recorded; no source word or mark is normalized.'
});
export const MODERN_PHONOLOGY_PROFILE=Object.freeze({id:'phonikud-modern-inventory',label:'Modern Hebrew inventory · research',
 region:'modern-inventory',sourceId:MODERN_PHONOLOGY_SOURCE.id,status:'source-based-inventory-adaptation',
 kinnorAccentId:null,playable:false,singingVoice:null,review:null});
export const MODERN_FINAL_SOURCE=Object.freeze({...MODERN_PHONOLOGY_SOURCE,id:'phonikud-optional-final-consonants',
 title:'Phonikud optional word-final glottal/h cleanup · source-category adaptation',
 url:'https://github.com/phonikud/phonikud/blob/a29a75b473b0f132a0bbee41dad38763035211dc/phonikud/utils.py',
 scope:'Only the optional post_normalize final glottal-stop and h deletion rules, adapted to an exact complete single-word source branch. No whole-word phonemizer, suffix rule, ij cleanup, spoken-sheva decision, resyllabification, sound timing or singing voice is supplied. Multiword, source-only and collective boundaries remain unresolved.'});
export const MODERN_FINAL_PROFILE=Object.freeze({...MODERN_PHONOLOGY_PROFILE,id:'phonikud-modern-final-consonants',
 label:'Modern inventory · optional final loss · research',sourceId:MODERN_FINAL_SOURCE.id,
 inventoryProfileId:MODERN_PHONOLOGY_PROFILE.id,finalConsonantPolicy:'single-exact-source-word-terminal-glottal-h-v1'});
export const isModernPhonologyProfile=profile=>[MODERN_PHONOLOGY_PROFILE.id,MODERN_FINAL_PROFILE.id].includes(profile.id);
const consonants=Object.freeze({BET_0DAG:'v',BET_1DAG_QAL:'b',BET_1DAG_XAZAQ:'b',DALET_0DAG:'d',DALET_1DAG_QAL:'d',DALET_1DAG_XAZAQ:'d',
 FKAF_0DAG:'χ',FKAF_1DAG_QAL:'k',FKAF_1DAG_XAZAQ:'k',FMEM_0DAG:'m',FNUN_0DAG:'n',FPE_0DAG:'f',FPE_1DAG_QAL:'p',FTSADI_0DAG:'ts',
 GIMEL_0DAG:'ɡ',GIMEL_1DAG_QAL:'ɡ',GIMEL_1DAG_XAZAQ:'ɡ',HE_0MAPIQ_CON:'h',KAF_0DAG:'χ',KAF_1DAG_QAL:'k',KAF_1DAG_XAZAQ:'k',
 LAMED_0DAG:'l',LAMED_1DAG:'l',MEM_0DAG:'m',MEM_1DAG:'m',NUN_0DAG:'n',NUN_1DAG:'n',PE_0DAG:'f',PE_1DAG_QAL:'p',PE_1DAG_XAZAQ:'p',
 QOF_0DAG:'k',QOF_1DAG:'k',RESH_0DAG:'ʁ',RESH_1DAG:'ʁ',SAMEKH_0DAG:'s',SAMEKH_1DAG:'s',SIN_0DAG:'s',SIN_1DAG:'s',
 TAV_0DAG:'t',TAV_1DAG_QAL:'t',TAV_1DAG_XAZAQ:'t',TET_0DAG:'t',TET_1DAG:'t',TRUESHIN_0DAG:'ʃ',TRUESHIN_1DAG:'ʃ',
 TSADI_0DAG:'ts',TSADI_1DAG:'ts',VAV_0DAGOSD_CON:'v',VAV_1DAG:'v',XET_0DAG:'χ',YOD_0DAG_CON:'j',YOD_1DAG:'j',ZAYIN_0DAG:'z',ZAYIN_1DAG:'z',
 ALEF_0MAPIQ_CON:'ʔ',AYIN_0DAG:'ʔ'});
const vowels=Object.freeze({PATAX:'a',XPATAX:'a',QAMATS_G:'a',QAMATS_Q:'o',XQAMATS:'o',SEGOL_V:'e',XSEGOL:'e',TSERE:'e',XIRIQ_G:'i',XIRIQ_Q:'i',XOLAM_HASER:'o',VAV_XOLAM:'o',SHURUQ:'u',QUBUTS:'u'});
const pairVowels=Object.freeze({PATAX:'a',QAMATS_G:'a',VAV_XOLAM_PART1_OF_YOD_DIPHTHONG:'o',SHURUQ_PART1_OF_YOD_DIPHTHONG:'u'});
export const modernEvidence=(file='lexicon')=>({sourceId:MODERN_PHONOLOGY_SOURCE.id,printedPages:[],file:MODERN_PHONOLOGY_SOURCE.files[file],gitBlob:MODERN_PHONOLOGY_SOURCE.blobs[file]});
const proposal=(candidatePhonemes,rule,reason=null,file='lexicon')=>({status:candidatePhonemes===null?'unassigned':'proposed',candidatePhonemes,rule,evidence:modernEvidence(file),reason,alternatives:null,
 phonemes:null,ipa:null,enginePhones:null,quantity:null,duration:null,noteIds:null,audioTimes:null,review:null});
export const modernMissingSharedConsonant=()=>proposal(null,'shared-consonant-counterpart-missing','A reciprocal source half is required; no second consonant or fallback is created.');
const nucleus=s=>s.kind==='vowel'||s.kind==='vowel-consonant-pair'||s.kind==='diphthong-part'&&!s.categoryId.startsWith('YOD_');
export function modernVowelYodContext(segments){
 const yod=segments.at(-1),vowel=segments.at(-2);
 if(yod?.categoryId!=='YOD_0DAG_PART2_OF_DIPHTHONG'||yod.part!=='whole'||vowel?.part!=='whole'||!pairVowels[vowel.categoryId]||segments.filter(nucleus).length!==1)return null;
 return {vowelSegmentId:vowel.id,yodSegmentId:yod.id,vowelCategoryId:vowel.categoryId,
  basis:'Adjacent whole original source categories in one source syllable. Modern inventory monophthong and yod constituents only; the complete transition, timing and source-category adaptation require review.'};
}
export function modernSourceBoundary(unit,segments,units){
 const last=unit.readerWordId===null?null:units.filter(u=>u.readerWordId===unit.readerWordId).at(-1)?.id===unit.id;
 const meaningful=segments.filter(s=>!['silent-letter','silent-vowel-sign'].includes(s.kind));
 return {finalUnitInSourceWord:last,terminalSegmentId:last===true?meaningful.at(-1)?.id??null:null};
}
export function modernFinalCleanupContext(study,cell,unit,variant){
 const ids=study.readerIds,source=study.sourceGroup,column=variant.hebrewColumn;
 const complete=study.alignmentScope==='single-reader-word'&&ids.length===1&&source?.id===study.groupId&&source.readerIds.length===1&&
  source.readerIds[0]===ids[0]&&source.readerHebrew[0]===study.readerHebrew[0]&&!/[\s־-]/u.test(study.readerHebrew[0])&&
  !/[\s-]/u.test(cell.text)&&cell.units.length>0&&cell.units.every(u=>{
   const ranges=u.sourceSegments.variants.find(v=>v.hebrewColumn===column)?.readerRanges;
   return u.readerWordId===ids[0]&&u.sourceBoundaryReaderWordId===ids[0]&&Array.isArray(ranges)&&ranges.some(r=>r.role==='written')&&
    ranges.every(r=>r.readerWordId===ids[0]&&['written','shared-consonant'].includes(r.role)&&Number.isInteger(r.start)&&Number.isInteger(r.end)&&
     r.start>=0&&r.start<r.end&&r.end<=study.readerHebrew[0].length&&study.readerHebrew[0].slice(r.start,r.end)===r.text);
  });
 const terminal=complete&&cell.units.at(-1).id===unit.id?variant.segments.at(-1):null;
 return {sourceGroupId:study.groupId,completeExactSingleSourceWord:complete,
  terminalSegmentId:terminal?.part==='whole'?terminal.id:null,
  basis:'Complete original single-reader-word group; every source syllable in this branch has an exact written range. No maqaf, multiword/collective boundary, trailing source-silent category or shared half is treated as a terminal consonant.'};
}
export function modernCorrespondence(segment,context,profile=MODERN_PHONOLOGY_PROFILE){
 const id=segment.categoryId;
 if(['silent-letter','silent-vowel-sign'].includes(segment.kind))return {...proposal([],'source-silent-category','Explicit source silence is retained. Modern epenthesis or another spoken reading is not inferred.'),evidence:{sourceId:'phonetic-mam-source-categories',sourceCommit:categorySource.sourceCommit,inputSha256:categorySource.inputSha256,license:categorySource.license,printedPages:[]}};
 if(id==='SHEVA_NA'||id.startsWith('VARIKA_'))return proposal(null,'modern-spoken-sheva-unassigned','Written vocal sheva does not determine modern spoken sheva. No invented Phonikud marker is inserted.');
 if(['ALEF_1MAPIQ','HE_1MAPIQ','ALEF_SHURUQ_VOWEL','FPP_PATAX_MAPIQ_HE'].includes(id))return proposal(null,'modern-special-category-unassigned','The ordinary inventory does not establish this complete biblical source category or final/suffix treatment.');
 if(['HE_0MAPIQ_CON','ALEF_0MAPIQ_CON','AYIN_0DAG'].includes(id)&&
  (context.modernSourceBoundary.finalUnitInSourceWord===null||context.modernSourceBoundary.terminalSegmentId===segment.id)){
  if(profile.finalConsonantPolicy===MODERN_FINAL_PROFILE.finalConsonantPolicy&&
   context.modernFinalCleanup?.completeExactSingleSourceWord===true&&context.modernFinalCleanup.terminalSegmentId===segment.id)
   return {...proposal([],'modern-optional-final-consonant-loss','The source makes final glottal/h deletion optional. This proposal applies only at a complete exact standalone source-word ending; it is not source silence or a complete pronunciation grammar.','wordCleanup'),
    evidence:{...modernEvidence('wordCleanup'),sourceId:MODERN_FINAL_SOURCE.id,sourceFunction:'post_normalize',sourceOption:'use_post_normalize',sourcePattern:id==='HE_0MAPIQ_CON'?'h$':'ʔ$'}};
  return proposal(null,'modern-final-consonant-processing-unassigned','Upstream word cleanup treats final h/glottal stops separately. No suffix or shared-word processing is guessed here.','wordCleanup');
 }
 if(consonants[id])return proposal([consonants[id]],'modern-inventory-consonant');
 if(id==='YOD_0DAG_PART2_OF_DIPHTHONG'&&context.vowelYod?.yodSegmentId===segment.id)return proposal(['j'],'modern-inventory-yod-constituent');
 if(pairVowels[id]&&context.vowelYod?.vowelSegmentId===segment.id)return proposal([pairVowels[id]],'modern-inventory-vowel-constituent');
 if(segment.kind==='diphthong-part')return proposal(null,'modern-compound-context-unassigned','A complete, terminal same-syllable source pair is required.');
 if(vowels[id])return proposal([vowels[id]],'modern-inventory-vowel');
 if(id==='FPP_PATAX_XET')return proposal(['a','χ'],'modern-furtive-patah-chet',null,'letterRules');
 if(id==='FPP_PATAX_AYIN')return proposal(['a'],'modern-furtive-patah-ayin',null,'letterRules');
 return proposal(null,'modern-category-unassigned','No supported inventory correspondence.');
}
