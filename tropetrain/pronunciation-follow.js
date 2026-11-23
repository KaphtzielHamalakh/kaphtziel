import {jointEventCorrespondence} from './event-correspondence.js';
// A display projection of an already checked exact Hebrew-span bridge.
// Does not allocate phonemes, change syllables or claim recorded timing.
import {PRONUNCIATION_STYLES} from './pronunciation.js';
export function pronunciationFollow(event,word,link,style){
 if(!PRONUNCIATION_STYLES.some(s=>s.id===style))throw Error('Unsupported pronunciation text style.');
 const sourceWordId=word?.sourceWordId??word?.id;
 if(!event||!word||!link||event.wordId!==word.id||link.eventId!==event.id||link.wordId!==word.id||link.sourceWordId!==sourceWordId||(event.sourceWordId??event.wordId)!==sourceWordId||link.syllableId!==event.syllableId||link.hebrew!==event.syllable)throw Error('Pronunciation highlight no longer matches the score occurrence.');
 const range=link.hebrewRange;
 if(link.status==='source-reading-word'){
  const source=event.sourceSyllableLink;
  if(range!==null||source?.alignmentLevel!=='source-reading-word'||source.writtenRange!==null||link.readerHebrew!==word.sourceHebrew||source.readerHebrew!==word.sourceHebrew||link.sourceReadingHebrew!==source.sourceReadingHebrew||JSON.stringify(link.sourceReadingRange)!==JSON.stringify(source.sourceReadingRange)||!link.units?.length||link.units.some(u=>!source.sourceUnitIds.includes(u.sourceUnitId)))throw Error('Source reading highlight lost its word correspondence.');
 }else if(!range||!Number.isInteger(range.start)||!Number.isInteger(range.end)||range.start<0||range.start>=range.end||range.end>word.sourceHebrew.length||word.sourceHebrew.slice(range.start,range.end)!==link.hebrew)throw Error('Pronunciation highlight no longer matches the marked Hebrew.');
 if(!['exact-written-span','source-reading-word','unlinked'].includes(link.status)||link.status!=='unlinked'&&(!link.units?.length||link.reason!==null)||link.status==='unlinked'&&(!link.reason||link.units?.length))throw Error('Invalid pronunciation highlight correspondence.');
 return Object.freeze({eventId:event.id,wordId:word.id,sourceWordId,style,hebrew:link.hebrew,status:link.status,reason:link.reason,
  units:Object.freeze(link.units.map(u=>Object.freeze({sourceUnitId:u.sourceUnitId,text:u.text,sourceStress:u.sourceStress,sourceRow:u.sourceRow,sourceColumn:u.sourceColumn}))),
  phonemes:null,audioTimes:null,review:link.status==='source-reading-word'?'Source reading syllable linked by original source-unit identity at word level. Written syllable ranges and acoustic timing remain unassigned.':'Exact written-span text correspondence only; no acoustic syllable, phoneme, voice or traditional musical realization is inferred.'});
}
export function pronunciationGroupFollow(event,words,link,style){
 if(!PRONUNCIATION_STYLES.some(s=>s.id===style))throw Error('Unsupported pronunciation text style.');
 const {group,syllable}=jointEventCorrespondence(event,words);
 if(link?.eventId!==event.id||link.status!=='source-reading-group'||link.wordId!==null||link.sourceWordId!==null||link.hebrewRange!==null||link.reason!==null||link.jointGroupId!==group.id||link.syllableId!==syllable.id||link.hebrew!==syllable.sourceHebrew||JSON.stringify(link.wordIds)!==JSON.stringify(group.wordIds)||JSON.stringify(link.sourceWordIds)!==JSON.stringify(group.sourceWordIds)||JSON.stringify(link.readerHebrew)!==JSON.stringify(group.readerHebrew)||link.sourceReadingHebrew!==group.sourceReadingHebrew||JSON.stringify(link.sourceReadingRange)!==JSON.stringify(syllable.sourceReadingRange)||!link.units?.length||link.units.some(u=>!syllable.sourceUnitIds.includes(u.sourceUnitId)||u.hebrewClusterRanges!==null||u.readerWordId!==null))throw Error('Joint source highlight lost its complete group correspondence.');
 return Object.freeze({eventId:event.id,wordId:null,sourceWordId:null,wordIds:group.wordIds.slice(),sourceWordIds:group.sourceWordIds.slice(),jointGroupId:group.id,style,hebrew:syllable.sourceHebrew,status:'source-reading-group',reason:null,
  units:link.units.map(u=>({sourceUnitId:u.sourceUnitId,text:u.text,sourceStress:u.sourceStress,sourceRow:u.sourceRow,sourceColumn:u.sourceColumn})),individualWordAllocation:null,phonemes:null,audioTimes:null,review:'Complete source pronunciation word shared by all listed unchanged reader words. No individual word, written syllable or acoustic allocation.'});
}
