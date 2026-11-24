import {jointSourceStudy} from './source-joint-syllables.js';
import {readingStudyForWord} from './source-reading-choices.js';
// Original correspondence adapter for existing source-based phonemic proposals.
// Note references identify written syllables; they assign no acoustic delivery.
import {linkPronunciationToNotes} from './pronunciation-note-links.js';
import {readerPhonologyWord} from './pronunciation-phonology-reader.js';
import {phonologyProfile,phonologySourceForProfile} from './pronunciation-phonology.js';

export function linkPronunciationProposalsToNotes(plan,words,library,style,profileId){
 const profile=phonologyProfile(profileId),base=linkPronunciationToNotes(plan,words,library,style);
 const prepared=new Map(),events=new Map(),eventSignatures=new Map(),seenReferences=new Map(),byId=new Map(words.map(w=>[w.id,w]));
 for(const word of base.words){
  const original=byId.get(word.wordId);
  prepared.set(word.wordId,readerPhonologyWord(original,readingStudyForWord(original,library,style),style,profileId));
 }
 const jointReports=new Map((base.sourceGroups??[]).map(g=>[g.id,readerPhonologyWord(words[g.navigationWordIndex],jointSourceStudy(g,words,library,style),style,profileId,{jointGroup:g})]));
 const links=base.links.map(link=>{
  const report=link.status==='source-reading-group'?jointReports.get(link.jointGroupId):prepared.get(link.wordId),paths=[];
  if(['exact-written-span','source-reading-word','source-reading-group'].includes(link.status))for(const entry of report.entries)for(const part of entry.parts){
   const sourceUnit=link.units.find(u=>u.sourceUnitId===part.sourceUnitId);if(!sourceUnit)continue;
   if(part.sourceStress!==sourceUnit.sourceStress||JSON.stringify(part.hebrewClusterRanges)!==JSON.stringify(sourceUnit.hebrewClusterRanges))throw Error('Phonemic proposal and note source-unit correspondence changed.');
   const route=report.evidence.routes.find(r=>r.sourceRow===entry.sourceRow&&r.sourceColumn===entry.sourceColumn&&r.hebrewColumn===entry.hebrewColumn);
   if(!route)throw Error('Missing original phonemic proposal route.');
   const references=part.references.map(reference=>{
    const event=route.events.find(e=>e.id===reference.eventId);
    if(!event||!event.sourceSegmentIds.includes(reference.sourceSegmentId)||!event.sourceUnitIds.includes(part.sourceUnitId))throw Error('Phonemic proposal event no longer owns its source reference.');
    const key=JSON.stringify([profileId,style,route.id,event.id]);
    if(!events.has(key)){
     events.set(key,{...structuredClone(event),id:key,sourceEventId:event.id,sourceRouteId:route.id,sourceStyle:style,profileId,noteReferences:[]});eventSignatures.set(key,JSON.stringify(event));seenReferences.set(key,new Set());
    }
    else if(eventSignatures.get(key)!==JSON.stringify(event))throw Error('Phonemic proposal event disagrees across source word references.');
    const binding={noteId:link.eventId,wordId:link.wordId,sourceWordId:link.sourceWordId,...(link.jointGroupId?{jointGroupId:link.jointGroupId,wordIds:link.wordIds.slice(),sourceWordIds:link.sourceWordIds.slice()}:{}),sourceUnitId:part.sourceUnitId,sourceSegmentId:reference.sourceSegmentId,part:reference.part,sharedReference:reference.sharedReference};
    const signature=JSON.stringify(binding);
    if(!seenReferences.get(key).has(signature)){events.get(key).noteReferences.push(binding);seenReferences.get(key).add(signature);}
    return {...structuredClone(reference),proposalEventKey:key};
   });
   paths.push({sourceRouteId:route.id,sourceCellId:entry.sourceCellId,sourceRow:entry.sourceRow,sourceColumn:entry.sourceColumn,hebrewColumn:entry.hebrewColumn,
    sourceUnitId:part.sourceUnitId,sourceText:part.sourceText,text:part.text,sourceStress:part.sourceStress,labels:structuredClone(entry.labels),
    hebrewClusterRanges:structuredClone(part.hebrewClusterRanges),references});
  }
  const linked=paths.length>0;
  return {...link,sourceTextStatus:link.status,sourceTextReason:link.reason,status:linked?link.status:'unlinked',reason:linked?null:link.reason??'no-phonemic-proposal-route',
   phonology:linked?{profileId,text:[...new Set(paths.map(p=>p.text))].join(' / '),paths,phonemes:null,enginePhones:null,quantity:null,duration:null,audioTimes:null,voice:null,review:null}:null};
 });
 const sourceEvents=[...events.values()];
 return {...base,format:'tropetrain-pronunciation-note-proposals-v1',revision:1,kind:'phonemic-research',profile:structuredClone(profile),phonologySource:structuredClone(phonologySourceForProfile(profileId)),
  method:'Exact source-unit identity and unchanged marked-Hebrew ranges connect existing phonemic candidates to note references. All alternative routes and unallocated source units remain in wordEvidence. A shared consonant is one abstract source event with separate note references. Repeated word occurrences retain distinct note IDs. No phoneme onset, duration, melisma repetition or acoustic allocation is inferred.',
  limits:'Incomplete source-defined phonemic proposals only; no Kinnor Accent equivalence, accepted engine phones, singing voice or historical melody realization. Unknown, source silence, proposed loss and shared references remain distinct. Notes keep their original pitches, syllables and timing.',
  review:null,phonemes:null,enginePhones:null,audioTimes:null,voice:null,
  counts:{notes:links.length,linkedNotes:links.filter(l=>l.phonology!==null).length,unlinkedNotes:links.filter(l=>l.phonology===null).length,
   sourceEvents:sourceEvents.length,unassignedEvents:sourceEvents.filter(e=>e.candidatePhonemes===null).length,
   sourceSilentEvents:sourceEvents.filter(e=>e.candidatePhonemes?.length===0&&e.rule==='source-silent-category').length,
   proposedAbsenceEvents:sourceEvents.filter(e=>e.candidatePhonemes?.length===0&&e.rule!=='source-silent-category').length,
   sharedEvents:sourceEvents.filter(e=>e.sourceSegmentIds.length>1).length},
  links,sourceEvents,wordEvidence:[...prepared.values()],...(jointReports.size?{groupEvidence:[...jointReports.values()]}:{})};
}
