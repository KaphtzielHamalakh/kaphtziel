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
