import {jointEventCorrespondence} from './event-correspondence.js';
import {jointSourceStudy} from './source-joint-syllables.js';
export function linkJointSourceNote(event,words,library,style){
 const {group,syllable}=jointEventCorrespondence(event,words),study=jointSourceStudy(group,words,library,style),units=[];
 for(const path of group.paths.filter(p=>p.style===style)){
  const wanted=path.units.find(u=>syllable.sourceUnitIds.includes(u.sourceUnitId));if(!wanted)throw Error('Joint note has no source unit in this style.');
  const cell=study.rows.find(r=>r.number===path.sourceRow).styles[style].find(c=>c.column===path.sourceColumn),unit=cell.units.find(u=>u.id===wanted.sourceUnitId);
  units.push({sourceUnitId:unit.id,text:unit.text,sourceRow:path.sourceRow,sourceColumn:path.sourceColumn,sourceStress:unit.sourceStress,labels:[...new Set(unit.hebrewUnderlay.variants.flatMap(v=>v.labels))],sourceReference:structuredClone(cell.sourceReference??null),sourceMarks:structuredClone(unit.sourceMarks),hebrewClusterRanges:null,readerWordId:null,sharesNextConsonant:unit.hebrewUnderlay.variants.some(v=>v.sharesNextConsonant),sharesPreviousConsonant:unit.hebrewUnderlay.variants.some(v=>v.sharesPreviousConsonant)});
 }
 return {eventId:event.id,wordId:null,sourceWordId:null,wordIds:group.wordIds.slice(),sourceWordIds:group.sourceWordIds.slice(),jointGroupId:group.id,sourceGroupId:group.sourceGroupId,syllableId:syllable.id,hebrew:syllable.sourceHebrew,hebrewRange:null,status:'source-reading-group',reason:null,
  readerHebrew:group.readerHebrew.slice(),sourceReadingHebrew:group.sourceReadingHebrew,sourceReadingRange:structuredClone(syllable.sourceReadingRange),alignmentLevel:'source-reading-group',individualWordAllocation:null,units};
}
