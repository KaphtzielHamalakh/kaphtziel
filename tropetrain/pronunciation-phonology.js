// Original implementation of attributed linguistic facts. No source table or audio is copied.
import {HISTORICAL_CATEGORY_INVENTORY as inventory} from './historical-pronunciation-categories.js';
import {MAQAF_STRESS_SOURCE,sourceMaqafChain} from './pronunciation-stress.js';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const PHONOLOGY_SOURCE=freeze({id:'katz-1993-phonology',author:'Dovid Katz',title:'The Phonology of Ashkenazic',year:1993,
 book:'Hebrew in Ashkenaz: A Language in Exile, edited by Lewis Glinert',url:'https://www.dovidkatz.net/dovid/PDFLinguistics/1993b.pdf',
 sha256:'789b83c2c5eedc097c334edeb6ea42268a0b90e25b8ee887b2d21af3452ecb24',
 rights:'Copyright reference, privately inspected; no PDF, scan, OCR or protected table redistributed. Original code records attributed linguistic facts.',
 scanLimits:'The supplied scan repeats printed pages49and52; printed page50 is appended as PDF page48. No rule here relies on page50.',
 scope:'Schematic Northeastern and Mideastern Formal Ashkenazic. Local variation remains; no equivalence to a Kinnor Accent label or reviewed singing voice is established.'});
export const PHONOLOGY_PROFILES=freeze([
 {id:'katz-1993-northeastern-formal',label:'Northeastern Formal Ashkenazic · research',region:'northeastern'},
 {id:'katz-1993-mideastern-formal',label:'Mideastern Formal Ashkenazic · research',region:'mideastern'}
].map(p=>({...p,sourceId:PHONOLOGY_SOURCE.id,status:'source-based-proposal',kinnorAccentId:null,playable:false,singingVoice:null,review:null})));
const catalog=new Map(inventory.catalog.map(c=>[c.id,c]));
export function phonologyProfile(id){const p=PHONOLOGY_PROFILES.find(p=>p.id===id);if(!p)throw Error('Unknown phonological research profile; no replacement selected.');return p;}
const consonants={BET_0DAG:'v',BET_1DAG_QAL:'b',BET_1DAG_XAZAQ:'b',DALET_0DAG:'d',DALET_1DAG_QAL:'d',DALET_1DAG_XAZAQ:'d',
 FKAF_0DAG:'x',FKAF_1DAG_QAL:'k',FKAF_1DAG_XAZAQ:'k',FMEM_0DAG:'m',FNUN_0DAG:'n',FPE_0DAG:'f',FPE_1DAG_QAL:'p',FTSADI_0DAG:'t͡s',
 GIMEL_0DAG:'g',GIMEL_1DAG_QAL:'g',GIMEL_1DAG_XAZAQ:'g',HE_0MAPIQ_CON:'h',KAF_0DAG:'x',KAF_1DAG_QAL:'k',KAF_1DAG_XAZAQ:'k',
 LAMED_0DAG:'l',LAMED_1DAG:'l',MEM_0DAG:'m',MEM_1DAG:'m',NUN_0DAG:'n',NUN_1DAG:'n',PE_0DAG:'f',PE_1DAG_QAL:'p',PE_1DAG_XAZAQ:'p',
 QOF_0DAG:'k',QOF_1DAG:'k',RESH_0DAG:'r',RESH_1DAG:'r',SAMEKH_0DAG:'s',SAMEKH_1DAG:'s',SIN_0DAG:'s',SIN_1DAG:'s',
 TAV_0DAG:'s',TAV_1DAG_QAL:'t',TAV_1DAG_XAZAQ:'t',TET_0DAG:'t',TET_1DAG:'t',TRUESHIN_0DAG:'ʃ',TRUESHIN_1DAG:'ʃ',
 TSADI_0DAG:'t͡s',TSADI_1DAG:'t͡s',VAV_0DAGOSD_CON:'v',VAV_1DAG:'v',XET_0DAG:'x',YOD_0DAG_CON:'j',YOD_1DAG:'j',ZAYIN_0DAG:'z',ZAYIN_1DAG:'z'};
const proposal=(candidatePhonemes,rule,pages,reason=null,alternatives=null)=>({status:candidatePhonemes===null?'unassigned':'proposed',candidatePhonemes,rule,
 evidence:{sourceId:PHONOLOGY_SOURCE.id,printedPages:pages},reason,alternatives,phonemes:null,ipa:null,enginePhones:null,quantity:null,duration:null,noteIds:null,audioTimes:null,review:null});
function realize(segment,context,profile){
 const id=segment.categoryId,kind=segment.kind,me=profile.region==='mideastern';
 if(kind==='silent-letter'||kind==='silent-vowel-sign')return proposal([],'source-silent-category',[69,71]);
 if(id==='ALEF_0MAPIQ_CON'||id==='AYIN_0DAG')return proposal([],'phonemic-guttural-loss',[69],'A phonetic glottal stop or lexical hiatus treatment is not assigned.');
 if(consonants[id])return proposal([consonants[id]],'consonant-correspondence',[68,69,70,72],id.startsWith('RESH')?'Abstract /r/ only; an acoustic allophone is unassigned.':null);
 if(id==='SHEVA_NA'||id.startsWith('VARIKA_'))return proposal(null,'mobile-sheva-needs-local-evidence',[74],'The source describes multiple formal sheva qualities; no exact regional target is selected.');
 if(id==='YOD_0DAG_PART2_OF_DIPHTHONG'&&context.vowelYod?.yodSegmentId===segment.id)return proposal(['j'],'postvocalic-yod-after-patah-or-qamats',[68,71],'An abstract /j/ constituent after source patah or qamats. The complete phonetic transition, quantity and note allocation remain unassigned.');
 if(kind==='diphthong-part')return proposal(null,'source-diphthong-sequence-needs-evidence',[67,68,69],'This source sequence needs a complete contextual correspondence; no vowel plus glide is guessed.');
 if(id==='ALEF_1MAPIQ'||id==='HE_1MAPIQ'||id==='ALEF_SHURUQ_VOWEL')return proposal(null,'special-category-needs-evidence',[69,70,71],'This special source category needs an explicit regional realization.');
 if(id==='FPP_PATAX_XET')return proposal(['a','x'],'furtive-patah-and-chet',[67,68,70]);
 if(id==='FPP_PATAX_AYIN')return proposal(['a'],'furtive-patah-and-ayin-loss',[67,68,69]);
 if(id==='FPP_PATAX_MAPIQ_HE')return proposal(null,'furtive-patah-mappiq-needs-evidence',[67,68,71],'Patah quality /a/ is supported; the complete final consonant realization remains unassigned.');
 if(id==='PATAX'||id==='XPATAX')return proposal(['a'],'patah-quality',[67,68,71]);
 if(id==='XSEGOL')return proposal(['ɛ'],'hataf-segol-quality',[67,68,71]);
 if(id==='XQAMATS'||id==='QAMATS_Q')return proposal(['ɔ'],'short-qamats-quality',[67,68,71]);
 if(id==='QAMATS_G'){
  if(!me)return proposal(['ɔ'],'northeastern-qamats',[67]);
  if(context.historicalClosure==='unknown')return proposal(null,'mideastern-qamats-context-missing',[68,71],'Historical syllable closure is unresolved.',['u','ɔ']);
  return proposal([context.historicalClosure==='closed'||context.beforeYodOrMappiq?'ɔ':'u'],'mideastern-qamats-context',[68,71]);
 }
 if(id==='SEGOL_V'){
  if(!me)return proposal(['ɛ'],'northeastern-segol',[67]);
  if(context.historicalClosure!=='closed'&&context.maqafPrimary?.wordHasMeteg)return proposal(null,'mideastern-segol-maqaf-meteg-needs-evidence',[67,68,72,73],'The joined group excludes a separate primary accent, but this word retains meteg. Secondary stress or full-vowel quality is not inferred.',['ɛ','ej']);
  if(context.historicalClosure==='closed'||context.primaryStress===false)return proposal(['ɛ'],'mideastern-segol-not-stressed-open',[67,68,72,73]);
  if(context.historicalClosure==='open'&&context.primaryStress===true)return proposal(['ej'],'mideastern-segol-stressed-open',[67,68,72,73]);
  return proposal(null,'mideastern-segol-context-missing',[67,68,72,73],'Historical open-syllable stress is not established.',['ɛ','ej']);
 }
 if(id==='TSERE')return proposal([me?'aj':'ej'],'regional-tsere',[67,68]);
 if(id==='XOLAM_HASER'||id==='VAV_XOLAM')return proposal([me?'ɔj':'ej'],'regional-holam',[67,68]);
 if(id==='XIRIQ_G'||id==='XIRIQ_Q')return proposal(['i'],'hiriq-quality',[67,68],'Vowel quantity and acoustic duration are unassigned.');
 if(id==='SHURUQ'||id==='QUBUTS')return proposal([me?'i':'u'],'regional-shuruq-qubuts',[65,67,68],'Vowel quantity and acoustic duration are unassigned.');
 return proposal(null,'category-needs-evidence',[],'No implemented source rule.');
}
const isNucleus=s=>s.kind==='vowel'||s.kind==='vowel-consonant-pair'||s.kind==='diphthong-part'&&!s.categoryId.startsWith('YOD_');
function vowelYodContext(segments){
 const yod=segments.at(-1),vowel=segments.at(-2);
 if(yod?.categoryId!=='YOD_0DAG_PART2_OF_DIPHTHONG'||yod.part!=='whole'||vowel?.part!=='whole'||!['PATAX','QAMATS_G'].includes(vowel.categoryId)||segments.filter(isNucleus).length!==1)return null;
 return {vowelSegmentId:vowel.id,yodSegmentId:yod.id,vowelCategoryId:vowel.categoryId,
  basis:'Original adjacent whole source categories in one source syllable; Katz1993 pp.68,71 treats postvocalic yod as consonantal /j/. Source-category adaptation is a proposal requiring review.'};
}
function unitContext(unit,variant,units,maqaf){
 const segments=variant.segments,nuclei=segments.map((s,i)=>isNucleus(s)?i:-1).filter(i=>i>=0);
 const tail=nuclei.length===1?segments.slice(nuclei[0]+1):[];
 const closed=tail.some(s=>s.kind==='consonant'||s.kind==='vowel-consonant-pair'||s.categoryId==='YOD_0DAG_PART2_OF_DIPHTHONG')||nuclei.length===1&&segments[nuclei[0]].kind==='vowel-consonant-pair';
 const marked=unit.readerWordId!==null&&units.some(u=>u.readerWordId===unit.readerWordId&&u.sourceStress);
 const maqafPrimary=!unit.sourceStress&&!marked&&maqaf&&unit.readerWordId!==maqaf.primaryWordId?{...maqaf,
  precedingWordId:unit.readerWordId,wordHasMeteg:maqaf.precedingMetegWordIds.includes(unit.readerWordId),
  basis:'A complete marked-reader maqaf chain with exactly one explicit source primary in its final word. Original source stress and word ownership are unchanged.'}:null;
 return {historicalClosure:nuclei.length!==1?'unknown':closed?'closed':'open',
  closureBasis:'Original source categories before consonant loss and degemination; shared first halves close the preceding syllable.',
  beforeYodOrMappiq:tail.some(s=>['YOD_0DAG_CON','YOD_1DAG','YOD_0DAG_PART2_OF_DIPHTHONG','HE_1MAPIQ'].includes(s.categoryId)),
  primaryStress:unit.sourceStress?true:marked||maqafPrimary?false:null,stressBasis:unit.sourceStress?'explicit-source-primary':marked?'another-primary-in-same-source-word':maqafPrimary?'source-maqaf-primary-in-final-word':'not-established',maqafPrimary,
  posttonicReduction:false,penultimateStressShift:false,vowelYod:vowelYodContext(segments)};
}
function compileRoute(study,row,cell,column,style,profile){
 const route={id:`${study.groupId}-${style}-r${row.number}-c${cell.column}-h${column}`,sourceRow:row.number,sourceColumn:cell.column,hebrewColumn:column,units:[],events:[],gaps:[]};
 const records=new Map(),maqaf=sourceMaqafChain(study,cell.units,column);
 for(const unit of cell.units){
  const variant=unit.sourceSegments.variants.find(v=>v.hebrewColumn===column);
  if(!variant){route.gaps.push({reason:'incomplete-source-route',sourceUnitId:unit.id});continue;}
  const context=unitContext(unit,variant,cell.units,maqaf);
  const record={sourceUnitId:unit.id,ownerWordId:unit.readerWordId,sourceText:unit.text,sourceStress:unit.sourceStress,sourceLabels:structuredClone(variant.sourceLabels),
   sourceHebrew:structuredClone(variant.sourceHebrew),readerRanges:structuredClone(variant.readerRanges),letterClusterBindings:structuredClone(variant.letterClusterBindings),context,fragments:[]};
  for(const segment of variant.segments){
   const category=catalog.get(segment.categoryId);
   if(!category||category.label!==segment.label||category.kind!==segment.kind||!['whole','first-half-shared','second-half-shared'].includes(segment.part)||segment.part!=='whole'&&!category.geminate||records.has(segment.id))throw Error('Source pronunciation category, part or identity changed.');
   const fragment={source:structuredClone(segment),proposal:realize(segment,context,profile),eventId:null};record.fragments.push(fragment);records.set(segment.id,{fragment,unit:record,category});
  }
  route.units.push(record);
 }
 const flat=[...records.values()];
 for(const item of flat){
  const {fragment,unit,category}=item;if(fragment.eventId!==null)continue;
  let members=[item];const s=fragment.source;
  if(s.part!=='whole'){
   const matches=flat.filter(other=>other.fragment.source.categoryId===s.categoryId&&other.unit.sourceUnitId===s.sharedWithUnitId&&other.fragment.source.sharedWithUnitId===unit.sourceUnitId&&other.fragment.source.part===(s.part==='first-half-shared'?'second-half-shared':'first-half-shared'));
   if(matches.length!==1){fragment.proposal=proposal(null,'shared-consonant-counterpart-missing',[72],'A reciprocal source half is required; no second consonant or fallback is created.');route.gaps.push({reason:'shared-consonant-counterpart-missing',sourceSegmentIds:[s.id]});}
   else members=[item,matches[0]].sort((a,b)=>a.fragment.source.part==='first-half-shared'?-1:b.fragment.source.part==='first-half-shared'?1:0);
  }
  const eventId=members.map(m=>m.fragment.source.id).join('+'),event={id:eventId,sourceSegmentIds:members.map(m=>m.fragment.source.id),sourceUnitIds:members.map(m=>m.unit.sourceUnitId),
   candidatePhonemes:fragment.proposal.candidatePhonemes,rule:category.geminate?'degemination':fragment.proposal.rule,evidence:{sourceId:PHONOLOGY_SOURCE.id,printedPages:category.geminate?[72]:fragment.proposal.evidence.printedPages},
   phonemes:null,enginePhones:null,quantity:null,duration:null,noteIds:null,audioTimes:null,review:null};
  for(const m of members)m.fragment.eventId=eventId;
  route.events.push(event);
 }
 // Sequences reference the existing two events. They add no phone, shared half,
 // vowel-point range, timing, contraction, or duplicate event.
 for(let i=0;i<route.units.length;i++){
  const unit=route.units[i];
  unit.vowelYodProposal=null;
  if(unit.context.vowelYod){
   const ids=[unit.context.vowelYod.vowelSegmentId,unit.context.vowelYod.yodSegmentId],members=ids.map(id=>unit.fragments.find(f=>f.source.id===id));
   if(members.every(f=>f.proposal.candidatePhonemes!==null))unit.vowelYodProposal={sourceSegmentIds:ids,eventIds:members.map(f=>f.eventId),
    candidatePhonemes:members.flatMap(f=>f.proposal.candidatePhonemes),evidence:{sourceId:PHONOLOGY_SOURCE.id,printedPages:[67,68,71]},
    status:'source-based-constituent-proposal',phonemes:null,enginePhones:null,quantity:null,duration:null,noteIds:null,audioTimes:null,review:null};
  }
  if(unit.fragments.some(f=>f.source.kind==='diphthong-part'))route.gaps.push({reason:unit.vowelYodProposal?'vowel-yod-phonetics-needs-review':'unreviewed-diphthong-sequence',sourceUnitIds:[unit.sourceUnitId],evidence:{sourceId:PHONOLOGY_SOURCE.id,printedPages:[68,71]}});
  const next=route.units[i+1];if(!next||unit.ownerWordId!==next.ownerWordId)continue;
  const end=unit.fragments.filter(f=>f.proposal.candidatePhonemes?.length).at(-1),start=next.fragments.find(f=>f.proposal.candidatePhonemes?.length);
  const onset=next.fragments.slice(0,next.fragments.findIndex(f=>isNucleus(f.source)));
  if(end&&start&&isNucleus(end.source)&&isNucleus(start.source)&&onset.some(f=>['ALEF_0MAPIQ_CON','AYIN_0DAG'].includes(f.source.categoryId)))route.gaps.push({reason:'hiatus-phonetics-needs-review',sourceUnitIds:[unit.sourceUnitId,next.sourceUnitId],evidence:{sourceId:PHONOLOGY_SOURCE.id,printedPages:[69]}});
 }
 return route;
}
export function phonologyWordProposal(study,word,sourceStyle,profileId){
 const profile=phonologyProfile(profileId);
 if(!['sephardic','ashkenazic'].includes(sourceStyle))throw Error('Unknown source text style.');
 if(!word||typeof word.id!=='string'||typeof word.sourceHebrew!=='string')throw Error('Choose an unchanged marked Hebrew word.');
 const sourceWordId=word.sourceWordId??word.id,index=study?.readerIds.indexOf(sourceWordId);
 if(study&&(study.sourceCommit!==inventory.sourceCommit||index<0||study.readerHebrew[index]!==word.sourceHebrew))throw Error('The marked Hebrew or source word correspondence changed.');
 const routes=[];
 if(study?.sourceSegments){
  if(study.sourceSegments.inputSha256!==inventory.inputSha256)throw Error('Source category evidence changed.');
  for(const row of study.rows)for(const cell of row.styles[sourceStyle]){
   const columns=[...new Set(cell.units.flatMap(u=>u.sourceSegments.variants.map(v=>v.hebrewColumn)))];
   for(const column of columns){const route=compileRoute(study,row,cell,column,sourceStyle,profile);for(const unit of route.units){unit.selected=unit.ownerWordId===sourceWordId||unit.ownerWordId===null;unit.occurrenceId=unit.ownerWordId===sourceWordId?word.id:null;}routes.push(route);}
  }
 }
 const fragments=routes.flatMap(r=>r.units.filter(u=>u.selected).flatMap(u=>u.fragments));
 return {schema:'tropetrain-phonology-word-proposal-v1',revision:2,wordId:word.id,sourceWordId,hebrew:word.sourceHebrew,selectedTranscriptionStyle:sourceStyle,
  profile:structuredClone(profile),source:structuredClone(PHONOLOGY_SOURCE),prosodySources:[structuredClone(MAQAF_STRESS_SOURCE)],sourceCommit:study?.sourceCommit??null,categoryInputSha256:study?.sourceSegments?.inputSha256??null,sourceDataLicense:'CC-BY-SA-4.0',
  sourceCategoryStatus:study?.sourceSegments?'source-categories-available':'source-categories-unavailable',routes,
  counts:{routes:routes.length,categoryReferences:fragments.length,proposedReferences:fragments.filter(f=>f.proposal.candidatePhonemes!==null).length,unassignedReferences:fragments.filter(f=>f.proposal.candidatePhonemes===null).length,
   proposedEvents:routes.reduce((n,r)=>n+r.events.filter(e=>e.candidatePhonemes!==null).length,0),contextGaps:routes.reduce((n,r)=>n+r.gaps.length,0),reviewedRealizations:0},
  phonemes:null,notes:null,audioTimes:null,phonologicalReview:null,acousticReview:null,cantorialReview:null,playable:false,singingVoice:null,
  limits:'Phonemic candidates only, with all original branches and syllable/letter bindings retained. Unknown is distinct from source-silent. No penultimate stress shift, quantity, engine phones, note allocation or audio timing is assigned. Historical Kinnor labels remain separate. Independent linguistic and cantorial review is pending.'};
}
