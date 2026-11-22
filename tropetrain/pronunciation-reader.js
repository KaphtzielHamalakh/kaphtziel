// Original word display projection of existing, separately sourced units.
// Never resyllabifies Hebrew or assigns phonemes, notes or acoustic times.
import {PRONUNCIATION_STYLES} from './pronunciation.js';

export const READER_PRONUNCIATION_MESSAGES=Object.freeze({
 'no-source-correspondence':'No source text',
 'no-style-transcription':'No text in this style',
 'combined-source-form':'Combined source form'
});

export function readerPronunciationWord(word,study,style){
 if(!PRONUNCIATION_STYLES.some(s=>s.id===style))throw Error('Unsupported pronunciation text style.');
 const sourceWordId=word.sourceWordId??word.id;
 const result={wordId:word.id,sourceWordId,hebrew:word.sourceHebrew,style,status:'no-source-correspondence',entries:[],sourceCommit:study?.sourceCommit??null,license:'CC-BY-SA-4.0',review:'Source text and word correspondence only; independent linguistic review pending. No phonemes, musical notes, voice or acoustic timing inferred.'};
 if(!study)return result;
 const index=study.readerIds.indexOf(sourceWordId);
 if(index<0||study.readerHebrew[index]!==word.sourceHebrew)throw Error('The Hebrew source changed; this pronunciation link needs review.');
 let transcribed=false;
 for(const row of study.rows)for(const cell of row.styles[style]){
  transcribed||=cell.units.length>0;
  // Consecutive owned units retain their original internal joins. Never join
  // across another word or an unowned unit, and never copy a whole source group.
  let segment=null,previousIndex=-2;
  cell.units.forEach((unit,unitIndex)=>{
   if(unit.readerWordId!==sourceWordId)return;
   if(cell.text.slice(unit.start,unit.end)!==unit.text)throw Error('Pronunciation text no longer matches its source offsets.');
   for(const range of unit.hebrewClusterRanges??[]){
    if(range.readerWordId!==sourceWordId||!['written','shared-consonant'].includes(range.role)||!Number.isInteger(range.start)||!Number.isInteger(range.end)||range.start<0||range.start>=range.end||range.end>word.sourceHebrew.length||word.sourceHebrew.slice(range.start,range.end)!==range.text)
     throw Error('Pronunciation ranges do not match the original marked Hebrew.');
   }
   if(unitIndex!==previousIndex+1){
    segment={sourceCellId:cell.id,sourceRow:row.number,sourceColumn:cell.column,sourceReference:cell.sourceReference??null,start:unit.start,end:unit.end,text:'',labels:[],sourceForm:false,parts:[]};
    result.entries.push(segment);
   }
   const join=segment.parts.length?cell.text.slice(segment.end,unit.start):'';
   const labels=unit.hebrewUnderlay?.variants.flatMap(v=>v.labels)??unit.sourceMarks.filter(m=>m.kind==='reading').map(m=>m.label);
   segment.parts.push({sourceUnitId:unit.id,text:unit.text,join,sourceStress:unit.sourceStress,sourceMarks:unit.sourceMarks,hebrewClusterRanges:unit.hebrewClusterRanges??null,sharesNextConsonant:unit.hebrewUnderlay?.variants.some(v=>v.sharesNextConsonant)??false,sharesPreviousConsonant:unit.hebrewUnderlay?.variants.some(v=>v.sharesPreviousConsonant)??false});
   segment.labels=[...new Set([...segment.labels,...labels])];
   segment.sourceForm||=unit.hebrewClusterRanges==null;
   segment.end=unit.end;segment.text=cell.text.slice(segment.start,segment.end);previousIndex=unitIndex;
  });
 }
 const variants=study.sourceGroup?.writtenReadVariants?.filter(v=>v.readerWordId===sourceWordId)??[];
 if(variants.length)for(const entry of result.entries)entry.writtenReadVariant=variants[0];
 const edition=study.sourceGroup?.editionWordLinks?.find(v=>v.readerWordId===sourceWordId);
 if(edition)for(const entry of result.entries)entry.editionWordLink=edition;
 result.status=result.entries.length?'word-linked':transcribed?'combined-source-form':'no-style-transcription';
 return result;
}

export function appendReaderPronunciation(target,report){
 target.replaceChildren();target.lang='en';target.dir='ltr';target.className='reader-word-pronunciation';target.dataset.pronunciationStatus=report.status;
 if(report.status!=='word-linked'){
  target.classList.add('unlinked');target.textContent=READER_PRONUNCIATION_MESSAGES[report.status];
  target.title=report.status==='combined-source-form'?'The source keeps this pronunciation combined across words. Select the Hebrew word for the complete source group.':'No transcription is substituted from another style or an approximate spelling.';return;
 }
 for(const entry of report.entries){
  const line=document.createElement('span');line.className='reader-pronunciation-entry';line.dataset.sourceCell=entry.sourceCellId;
  line.title=`Source row ${entry.sourceRow}, column ${entry.sourceColumn}${entry.sourceReference?' · same transcription as column '+entry.sourceReference.column:''}${entry.sourceForm?' · source reading form; written range unresolved':''}. Source text only; independent linguistic review pending.`;
  const text=document.createElement('span');text.className='reader-pronunciation-text';
  for(const part of entry.parts){
   text.append(document.createTextNode(part.join));const token=document.createElement(part.sourceStress?'strong':'span');token.textContent=part.text;token.dataset.sourceUnit=part.sourceUnitId;text.append(token);
  }
  line.append(text);
  if(entry.labels.length){const labels=document.createElement('small');labels.lang='he';labels.dir='rtl';labels.textContent=entry.labels.join(' / ');line.append(labels);}
  if(entry.sourceForm){const label=document.createElement('small');label.textContent=entry.editionWordLink?'Different source spelling':entry.writtenReadVariant?'Written/read source variant':'Source reading form';if(entry.editionWordLink)label.title=`Reader ${entry.editionWordLink.readerHebrew}; MAM ${entry.editionWordLink.primaryHebrew}. Contextual word correspondence only; the source transcription retains its own spelling and has no written syllable range or sound assignment.`;else if(entry.writtenReadVariant)label.title=`UXLC written ${entry.writtenReadVariant.writtenHebrew}; preferred reading ${entry.writtenReadVariant.readerHebrew}. Source pronunciation retains its own form; written ranges remain unresolved.`;line.append(label);}
  target.append(line);
 }
}
