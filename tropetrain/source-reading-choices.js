// Explicit choices among literal source readings. This is neither a melody
// preset nor a pronunciation voice; the unselected source study is retained.
import {transcriptionStructure} from './pronunciation-structure.js';
export const SOURCE_READING_CHOICES=Object.freeze({
 qamats:Object.freeze(['קמץ-ד','קמץ-ס']),
 cantillation:Object.freeze(['טעם תחתון','טעם עליון'])
});
export function readingChoices(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!Object.hasOwn(SOURCE_READING_CHOICES,k)))throw Error('Unknown source reading choice.');
 const result={qamats:value.qamats??null,cantillation:value.cantillation??null};
 for(const[k,v]of Object.entries(result))if(v!==null&&!SOURCE_READING_CHOICES[k].includes(v))throw Error('Unknown source reading choice.');
 return result;
}
export function chooseSourceStudy(study,choices){
 const policy=readingChoices(choices);if(!study||!Object.values(policy).some(v=>v!==null))return study;
 if(study.sourceSelection)throw Error('A source selection cannot be applied twice.');
 const chosenRows=[];let incompatible=false;
 const rows=study.rows.map(row=>{
  const raw=study.sourceGroup.rows.find(r=>r.number===row.number);if(!raw)throw Error('Source reading row changed.');
  const columns=raw.hebrew.map((nodes,i)=>({column:i+1,...transcriptionStructure(nodes)})).filter(c=>c.text!==null);
  let selected=columns;const requested=[];
  for(const[k,allowed]of Object.entries(SOURCE_READING_CHOICES)){
   const values=new Set(columns.flatMap(c=>c.marks.filter(m=>m.kind==='reading'&&allowed.includes(m.label)).map(m=>m.label)));
   if(values.size>1&&policy[k]!==null){requested.push({kind:k,label:policy[k]});selected=selected.filter(c=>c.marks.some(m=>m.kind==='reading'&&m.label===policy[k]));}
  }
  if(!requested.length)return row;
  if(!selected.length)incompatible=true;
  const keep=new Set(selected.map(c=>c.column));
  chosenRows.push({number:row.number,requested,hebrewColumns:[...keep],sourceReadings:columns.map(c=>({column:c.column,text:c.text,labels:c.marks.filter(m=>m.kind==='reading').map(m=>m.label)}))});
  return {...row,styles:Object.fromEntries(Object.entries(row.styles).map(([style,cells])=>[style,cells.flatMap(cell=>{
   if(!cell.units.length)return[cell];
   const membership=cell.units.map(u=>u.hebrewUnderlay.variants.some(v=>keep.has(v.hebrewColumn)));
   if(!membership.some(Boolean))return[];
   if(!membership.every(Boolean))throw Error('A source choice cannot discard part of a transcription path.');
   const units=cell.units.map(unit=>{
    const variants=unit.hebrewUnderlay.variants.filter(v=>keep.has(v.hebrewColumn)),candidate=variants[0].readerRanges;
    const readerRanges=candidate&&variants.every(v=>JSON.stringify(v.readerRanges)===JSON.stringify(candidate))?structuredClone(candidate):null;
    return {...unit,hebrewClusterRanges:readerRanges,hebrewUnderlay:{...unit.hebrewUnderlay,status:readerRanges?'exact-reader-clusters':variants.some(v=>v.readerRanges)?'variant-reader-difference':'source-only',variants:structuredClone(variants)},
     ...(unit.sourceSegments?{sourceSegments:{...unit.sourceSegments,variants:structuredClone(unit.sourceSegments.variants.filter(v=>keep.has(v.hebrewColumn)))}}:{})};
   });
   return[{...cell,units}];
  })]))};
 });
 if(!chosenRows.length)return study;
 return {...study,rows,sourceSelection:{schema:'tropetrain-source-reading-selection-v1',policy,rows:chosenRows,incompatible,
  scope:'Selected source columns only. Original reader Hebrew/accents and the complete original study remain unchanged. A source label is not a historical musical realization.',
  originalStudy:structuredClone(study),phonemes:null,sourceTiming:null,voice:null,review:null}};
}
export function readingStudyForWord(word,library,style){
 return chooseSourceStudy(library.study(word,style),word.sourceSyllableUnderlay?.sourceReadingChoices??{});
}
