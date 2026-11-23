import {validateJointStudy} from './source-joint-syllables.js';
// Display existing proposals at their exact source word and syllable links.
// No phonological rule, resyllabification, note or sound time is introduced.
import {phonologyWordProposal} from './pronunciation-phonology.js';

export function readerPhonologyWord(word,study,sourceStyle,profileId,{jointGroup=null}={}){
 if(jointGroup)validateJointStudy(study,jointGroup,sourceStyle);
 const original=phonologyWordProposal(study,word,sourceStyle,profileId),evidence=jointGroup?{...original,wordId:null,sourceWordId:null,wordIds:jointGroup.wordIds.slice(),sourceWordIds:jointGroup.sourceWordIds.slice(),hebrew:jointGroup.readerHebrew.slice(),jointGroupId:jointGroup.id,individualWordAllocation:null}:original;
 const result={schema:'tropetrain-reader-phonology-proposal-v1',wordId:word.id,sourceWordId:evidence.sourceWordId,
  hebrew:evidence.hebrew,style:sourceStyle,profile:evidence.profile,status:'no-source-correspondence',entries:[],
  sourceCommit:evidence.sourceCommit,source:evidence.source,sourceDataLicense:evidence.sourceDataLicense,evidence,
  phonemes:null,noteIds:null,audioTimes:null,review:null,newSingingVoice:null};
 if(jointGroup)Object.assign(result,{schema:'tropetrain-reader-phonology-group-proposal-v1',wordId:null,wordIds:jointGroup.wordIds.slice(),sourceWordIds:jointGroup.sourceWordIds.slice(),jointGroupId:jointGroup.id,individualWordAllocation:null});
 for(const route of evidence.routes){
  const owned=route.units.filter(u=>jointGroup?u.ownerWordId===null&&jointGroup.syllables.some(s=>s.sourceUnitIds.includes(u.sourceUnitId)):u.ownerWordId===result.sourceWordId);
  if(!owned.length)continue;
  const events=new Map(route.events.map(e=>[e.id,e]));
  const entry={kind:jointGroup?'phonemic-research-group':'phonemic-research-word',sourceCellId:route.id,sourceRow:route.sourceRow,sourceColumn:route.sourceColumn,
   hebrewColumn:route.hebrewColumn,sourceReference:null,sourceForm:owned.some(u=>u.readerRanges===null),
   labels:[...new Set(owned.flatMap(u=>u.sourceLabels))],parts:[],text:'',profileId,review:null};
  for(const unit of owned){
   for(const range of unit.readerRanges??[]){
    if(range.readerWordId!==result.sourceWordId||!['written','shared-consonant'].includes(range.role)||
     !Number.isInteger(range.start)||!Number.isInteger(range.end)||range.start<0||range.start>=range.end||
     range.end>word.sourceHebrew.length||word.sourceHebrew.slice(range.start,range.end)!==range.text)
     throw Error('Phonemic proposal no longer matches its original marked Hebrew ranges.');
   }
   const references=unit.fragments.map(fragment=>{
    const event=events.get(fragment.eventId);
    if(!event||!event.sourceSegmentIds.includes(fragment.source.id)||!event.sourceUnitIds.includes(unit.sourceUnitId))
     throw Error('Phonemic proposal source event correspondence changed.');
    const sharedReference=event.sourceSegmentIds[0]!==fragment.source.id;
    const soundStatus=event.candidatePhonemes===null?'unresolved':event.candidatePhonemes.length?'candidate-phonemes':fragment.proposal.rule==='source-silent-category'?'source-silent':'proposed-absence';
    const text=sharedReference?(soundStatus==='unresolved'?'↔?':'↔'):soundStatus==='unresolved'?'?':soundStatus==='source-silent'?'∅':soundStatus==='proposed-absence'?'(∅)':event.candidatePhonemes.join('');
    return {sourceSegmentId:fragment.source.id,eventId:event.id,part:fragment.source.part,sharedReference,
     candidatePhonemes:structuredClone(event.candidatePhonemes),soundStatus,text};
   });
   entry.parts.push({sourceUnitId:unit.sourceUnitId,text:references.map(r=>r.text).join(''),join:entry.parts.length?' · ':'',
    sourceText:unit.sourceText,sourceStress:unit.sourceStress,sourceMarks:structuredClone(unit.sourceLabels),
    hebrewClusterRanges:structuredClone(unit.readerRanges),sourceHebrew:structuredClone(unit.sourceHebrew),
    letterClusterBindings:structuredClone(unit.letterClusterBindings),references});
  }
  entry.text=entry.parts.map(p=>p.join+p.text).join('');result.entries.push(entry);
 }
 result.status=result.entries.length?jointGroup?'group-linked':'word-linked':evidence.routes.length?'combined-source-form':'no-source-correspondence';
 return result;
}
