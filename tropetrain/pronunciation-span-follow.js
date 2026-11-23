// Original display correspondence. A shared span follows as a whole; none of
// its source syllables receives an individual note or acoustic boundary.
import {linkPronunciationScoreGroups} from './pronunciation-score-groups.js';
import {readerPhonologyWord} from './pronunciation-phonology-reader.js';
import {phonologyProfile,PHONOLOGY_SOURCE} from './pronunciation-phonology.js';

const canonical=w=>w.sourceWordId??w.id;
const signature=e=>[e.id,e.wordId,e.sourceWordId??e.wordId,e.syllableId,e.syllable];
const syllables=w=>w.syllables.map(s=>[s.id,s.sourceHebrew]);
export function compilePronunciationSpanFollow(events,words,library,style,{profileId=null}={}){
 const profile=profileId?phonologyProfile(profileId):null;
 const common=linkPronunciationScoreGroups(events,words,library,style),paths=[],gaps=[];
 for(const item of common.words){
  const word=words.find(w=>w.id===item.wordId);
  const different=item.groups.filter(g=>g.relation==='different-syllable-divisions');
  const proposal=profileId&&different.length?readerPhonologyWord(word,library.study(word,style),style,profileId):null;
  for(const group of different){
   // The live adapter supplies the complete selected word, never a staff page.
   // A partial score span must not acquire a complete-span follower.
   if(group.scoreSyllables.some(s=>!s.eventIds.length)){gaps.push({groupId:group.id,reason:'incomplete-score-span'});continue;}
   const ids=new Set(group.sourceUnits.map(u=>u.id));
   const entries=proposal?proposal.entries.filter(e=>e.sourceRow===group.sourceRow&&e.sourceColumn===group.sourceColumn&&[...ids].every(id=>e.parts.some(p=>p.sourceUnitId===id))):[null];
   if(!entries.length){gaps.push({groupId:group.id,reason:'no-phonemic-proposal-route'});continue;}
   for(const entry of entries){
    const units=group.sourceUnits.map(u=>{
     const part=entry?.parts.find(p=>p.sourceUnitId===u.id);
     if(part&&(part.sourceText!==u.text||part.sourceStress!==u.sourceStress||JSON.stringify(part.hebrewClusterRanges)!==JSON.stringify(u.hebrewClusterRanges)))throw Error('Shared-span pronunciation source changed.');
     return {sourceUnitId:u.id,sourceText:u.text,text:part?.text??u.text,sourceStress:u.sourceStress,sourceMarks:structuredClone(u.sourceMarks),hebrewClusterRanges:structuredClone(u.hebrewClusterRanges),
      ...(part?{references:structuredClone(part.references)}:{}),phonemes:null,noteIds:null,audioTimes:null};
    });
    paths.push({id:group.id+(entry?'-h'+entry.hebrewColumn:''),groupId:group.id,wordId:word.id,sourceWordId:canonical(word),hebrew:group.hebrew,hebrewRange:{...group.hebrewRange},
     sourceRow:group.sourceRow,sourceColumn:group.sourceColumn,sourceReference:structuredClone(group.sourceReference),...(entry?{hebrewColumn:entry.hebrewColumn,profileId}:{}),
     scoreSyllables:structuredClone(group.scoreSyllables),sourceUnits:units,eventIds:group.eventIds.slice(),individualNoteAllocation:null,phonemes:null,audioTimes:null,review:null});
   }
  }
 }
 return {schema:'tropetrain-pronunciation-span-follow-v1',revision:1,style,profileId,...(profile?{profile:structuredClone(profile),phonologySource:structuredClone(PHONOLOGY_SOURCE)}:{}),sourceCommit:common.sourceCommit,dataLicense:common.dataLicense,
  words:common.words.map(item=>{const w=words.find(w=>w.id===item.wordId);return {wordId:w.id,sourceWordId:canonical(w),hebrew:w.sourceHebrew,scoreSyllables:syllables(w)};}),
  events:events.map(signature),paths,gaps,individualNoteAllocation:null,phonemes:null,audioTimes:null,voice:null,review:null,
  method:'Follow each complete common marked-Hebrew span as a whole across its score notes. Both independent syllable divisions, source alternatives and shared-consonant references are retained. No source syllable is assigned to an individual note; this is display correspondence, not an acoustic clock.'};
}

export function pronunciationSpanFollow(event,word,report){
 const expected=report.words.find(w=>w.wordId===word?.id);
 if(!expected||event.wordId!==word.id||expected.sourceWordId!==canonical(word)||expected.hebrew!==word.sourceHebrew||JSON.stringify(expected.scoreSyllables)!==JSON.stringify(syllables(word))||!report.events.some(e=>JSON.stringify(e)===JSON.stringify(signature(event))))throw Error('Shared-span follower no longer matches the original Hebrew score occurrence.');
 const paths=report.paths.filter(p=>p.wordId===word.id&&p.eventIds.includes(event.id));
 if(!paths.length)return null;
 return {eventId:event.id,wordId:word.id,sourceWordId:canonical(word),style:report.style,profileId:report.profileId,status:'common-written-span',reason:null,
  paths:structuredClone(paths),units:[...new Map(paths.flatMap(p=>p.sourceUnits).map(u=>[u.sourceUnitId,u])).values()],
  individualNoteAllocation:null,phonemes:null,audioTimes:null,voice:null,review:null};
}
