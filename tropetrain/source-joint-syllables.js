// A complete source pronunciation word can correspond to several reader words.
// It remains one source word: no syllable receives an individual reader owner.
import {chooseSourceStudy} from './source-reading-choices.js';
import {groupReaderLetterForms} from './pronunciation-word-alignment.js';
import {transcriptionStructure} from './pronunciation-structure.js';
const canonical=w=>w.sourceWordId??w.id,eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),letters=s=>s.replace(/[^א-ת]/gu,'');
function letterCorrespondence(text,forms){let positions=new Set([0]);for(const choices of forms){const next=new Set();for(const p of positions)for(const form of choices)if(text.startsWith(form,p))next.add(p+form.length);positions=next;}return positions.has(text.length);}
export function sourceJointGroups(words,library,{source,sourceReadingChoices={}}){
 const result=[];
 for(let index=0;index<words.length;index++){
  const first=words[index];if(first.sourceSyllableUnderlay?.reason!=='combined-source-form')continue;
  const raw=library.at(first);if(!raw||raw.readerIds.length<2||canonical(first)!==raw.readerIds[0])continue;
  const members=words.slice(index,index+raw.readerIds.length);
  if(members.length!==raw.readerIds.length||members.some((w,i)=>canonical(w)!==raw.readerIds[i]||w.sourceHebrew!==raw.readerHebrew[i]||w.verseKey!==first.verseKey||w.sectionId!==first.sectionId||w.index!==index+i||w.sourceSyllableUnderlay?.reason!=='combined-source-form'))continue;
  const paths=[];
  for(const style of ['sephardic','ashkenazic']){
   const study=chooseSourceStudy(library.study(first,style),sourceReadingChoices),proof=study?.sourceBoundaryWordAlignment?.proof;
   if(!study||study.sourceCommit!==source.sourceCommit||study.hebrewUnderlay?.inputSha256!==source.inputSha256||study.hebrewUnderlay?.computationSourceSha256!==source.computationSourceSha256||!eq(study.readerIds,raw.readerIds)||!eq(study.readerHebrew,raw.readerHebrew)||study.alignmentScope!=='complete-reader-group'||proof?.method!=='all-literal-source-readings-and-all-exact-reader-form-paths'||proof.reason!==null||!proof.variants?.length||proof.variants.some(v=>v.paths!=='1'))throw Error('Joint source word correspondence needs review.');
   for(const row of study.rows)for(const cell of row.styles[style]){
    if(!cell.units.length)continue;
    const segment=cell.wordSegments?.[0];
    if(cell.wordSegments.length!==1||segment.readerWordId!==null||!eq(segment.readerIds,raw.readerIds)||!eq(segment.unitIds,cell.units.map(u=>u.id))||cell.units.some(u=>u.readerWordId!==null||u.hebrewClusterRanges!==null))throw Error('Joint source units cannot acquire individual word owners.');
    const units=cell.units.map(unit=>{
     const variants=unit.hebrewUnderlay?.variants;if(!variants?.length||variants.some(v=>v.readerRanges!==null||!v.source)||new Set(variants.map(v=>JSON.stringify(v.source))).size!==1)throw Error('Joint source syllable paths disagree.');
     const span=variants[0].source;if(!Number.isInteger(span.start)||!Number.isInteger(span.end)||span.start<0||span.start>=span.end)throw Error('Invalid joint source syllable range.');
     return {sourceUnitId:unit.id,sourceText:unit.text,sourceStress:unit.sourceStress,start:span.start,end:span.end,hebrew:span.text,hebrewUnderlay:structuredClone(unit.hebrewUnderlay),sourceMarks:structuredClone(unit.sourceMarks),sourceSegments:structuredClone(unit.sourceSegments)};
    });
    if(units.some((u,i)=>i&&units[i-1].end!==u.start))throw Error('Joint source word has a syllable gap.');
    const text=units.map(u=>u.hebrew).join(''),from=units[0].start,to=units.at(-1).end;
    if(!segment.sourceForms?.length||segment.sourceForms.some(f=>f.text!==text||f.start!==from||f.end!==to)||!letterCorrespondence(letters(text),raw.readerIds.map((_,i)=>groupReaderLetterForms(raw,i))))throw Error('Joint source word lost its complete reader correspondence.');
    const original=raw.rows.find(r=>r.number===row.number);if(!original)throw Error('Joint source row changed.');
    for(const column of new Set(cell.units.flatMap(u=>u.hebrewUnderlay.variants.map(v=>v.hebrewColumn)))){
     const textInRow=transcriptionStructure(original.hebrew[column-1]).text;if(textInRow===null||textInRow.slice(from,to)!==text||from!==0||to!==textInRow.length)throw Error('Joint source word must cover its complete original source form.');
    }
    paths.push({style,sourceRow:row.number,sourceColumn:cell.column,sourceCellId:cell.id,sourceReference:structuredClone(cell.sourceReference??null),wordSegment:structuredClone(segment),sourceReadingHebrew:text,units});
   }
  }
  if(!['sephardic','ashkenazic'].every(s=>paths.some(p=>p.style===s))||new Set(paths.map(p=>JSON.stringify(p.units.map(u=>[u.hebrew,u.sourceStress])))).size!==1)throw Error('Both source text styles must agree on joint source syllables and stress.');
  const id=first.id+'-joint-source',path=paths[0],start=path.units[0].start;
  const group={id,sourceGroupId:raw.id,alignmentLevel:'source-reading-group',wordIds:members.map(w=>w.id),sourceWordIds:raw.readerIds.slice(),wordIndices:members.map(w=>w.index),readerHebrew:raw.readerHebrew.slice(),sourceReadingHebrew:path.sourceReadingHebrew,sourceReadingChoices:structuredClone(sourceReadingChoices),source:structuredClone(source),sourceGroup:structuredClone(raw),paths,
   syllables:path.units.map((u,i)=>({id:id+'-s'+(i+1),sourceHebrew:u.hebrew,stress:u.sourceStress,sourceUnitIds:paths.map(p=>p.units[i].sourceUnitId),sourceReadingRange:{start:u.start-start,end:u.end-start},writtenRange:null,readerWordId:null,phonemes:null,acousticTimes:null,review:null})),
   navigationWordIndex:first.index,navigationWordId:first.id,individualWordAllocation:null,writtenSyllableRanges:null,sourceTiming:null,phonemes:null,voice:null,review:null,
   scope:'One complete source pronunciation word corresponds jointly to all listed unchanged reader words. Every source syllable retains group correspondence only. No individual written syllable, phone or acoustic allocation.'};
  result.push(group);index+=members.length-1;
 }
 return result;
}
export function validateJointStudy(study,group,style){
 if(!study||!['sephardic','ashkenazic'].includes(style)||study.sourceCommit!==group.source.sourceCommit||!eq(study.sourceGroup,group.sourceGroup)||!eq(study.readerIds,group.sourceWordIds)||!eq(study.readerHebrew,group.readerHebrew))throw Error('Joint pronunciation source correspondence changed.');
 const paths=group.paths.filter(p=>p.style===style);if(!paths.length)throw Error('Joint pronunciation style has no source path.');
 for(const path of paths){const cell=study.rows.find(r=>r.number===path.sourceRow)?.styles[style].find(c=>c.column===path.sourceColumn);
  if(!cell||cell.id!==path.sourceCellId||!eq(cell.wordSegments,[path.wordSegment])||cell.units.length!==path.units.length)throw Error('Joint pronunciation word segment changed.');
  for(const [i,u]of cell.units.entries()){const p=path.units[i];if(u.readerWordId!==null||u.hebrewClusterRanges!==null||u.id!==p.sourceUnitId||u.text!==p.sourceText||u.sourceStress!==p.sourceStress||!eq(u.hebrewUnderlay,p.hebrewUnderlay)||!eq(u.sourceSegments,p.sourceSegments)||!eq(u.sourceMarks,p.sourceMarks))throw Error('Joint pronunciation source unit changed.');}
 }
 return study;
}
export function jointSourceStudy(group,words,library,style){
 const word=words[group.navigationWordIndex];if(!word||word.id!==group.navigationWordId)throw Error('Joint pronunciation occurrence changed.');
 return validateJointStudy(chooseSourceStudy(library.study(word,style),group.sourceReadingChoices),group,style);
}
