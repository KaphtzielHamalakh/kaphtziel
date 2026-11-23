// Original adapter of pinned MAM source readings. Written Hebrew is never split
// against a different spelling: these correspondences stop at word ownership.
import {groupReaderLetterForms} from './pronunciation-word-alignment.js';
const letters=text=>text.replace(/[^א-ת]/gu,'');
export function sourceReadingSyllables(word,studies,result){
 if(result.reason!=='source-only-written-form'||!result.paths.length)return result;
 const id=word.sourceWordId??word.id,readings=[];
 for(const path of result.paths){
  const study=studies[path.style],group=study.sourceGroup,index=group.readerIds.indexOf(id);
  if(index<0||group.readerHebrew[index]!==word.sourceHebrew)throw Error('Source reading word ownership changed.');
  const forms=groupReaderLetterForms(group,index),units=[];
  for(const unit of path.units){
   const variants=unit.hebrewUnderlay?.variants;
   if(!variants?.length||variants.some(v=>!v.source||v.readerRanges!==null))return result;
   const values=variants.map(v=>({text:v.source.text,start:v.source.start,end:v.source.end,column:v.hebrewColumn}));
   if(new Set(values.map(v=>JSON.stringify([v.text,v.start,v.end]))).size!==1)return result;
   units.push({...values[0],sourceUnitId:unit.sourceUnitId,sourceStress:unit.sourceStress});
  }
  // A complete source word, explicit source word ownership, and a documented
  // alternate letter form are all required. Similar spelling is insufficient.
  const text=units.map(u=>u.text).join('');
  if(!text||letters(text)===letters(word.sourceHebrew)||!forms.includes(letters(text)))return result;
  const row=study.rows.find(r=>r.number===path.sourceRow),cell=row?.styles[path.style].find(c=>c.column===path.sourceColumn);
  if(!cell||units.some(u=>cell.units.find(x=>x.id===u.sourceUnitId)?.readerWordId!==id))throw Error('Source reading units lost their word ownership.');
  if(units.some((u,i)=>i&&units[i-1].end!==u.start))return result;
  const sourceRow=group.rows.find(r=>r.number===path.sourceRow),plain=nodes=>nodes.map(n=>typeof n==='string'?n:plain(n.content)).join('');
  for(const column of new Set(path.units.flatMap(u=>u.hebrewUnderlay.variants.map(v=>v.hebrewColumn)))){
   const raw=sourceRow?.hebrew[column-1];if(!raw)return result;
   const source=plain(raw),from=units[0].start,to=units.at(-1).end;
   if(source.slice(from,to)!==text||from>0&&!/[־\s]/u.test(source[from-1])||to<source.length&&!/[־\s]/u.test(source[to])&&!/[־\s]/u.test(source[to-1]))return result;
  }
  readings.push({path,units,text});
 }
 const signature=r=>JSON.stringify(r.units.map(u=>[u.text,u.sourceStress]));
 if(!['sephardic','ashkenazic'].every(style=>readings.some(r=>r.path.style===style))||new Set(readings.map(signature)).size!==1)return result;
 const first=readings[0];
 return {...result,status:'available',reason:null,alignmentLevel:'source-reading-word',sourceReadingHebrew:first.text,
  wordCorrespondence:{sourceWordId:id,readerHebrew:word.sourceHebrew,sourceReadingHebrew:first.text,
   method:'Pinned source word ownership and documented reader letter form; every source branch and both transcription styles agree on source syllables and stress.',
   writtenSyllableRanges:null,review:null},
  syllables:first.units.map((u,i)=>({sourceHebrew:u.text,stress:u.sourceStress,roman:null,phonemes:null,
   reviewStatus:'source-reading-word-correspondence',analyzer:result.source.name,writtenRange:null,
   sourceReadingRange:{start:u.start-first.units[0].start,end:u.end-first.units[0].start},sourceReadingHebrew:first.text,
   sourceUnitIds:readings.map(r=>r.units[i].sourceUnitId),sourcePathIndices:readings.map((_,n)=>n),
   sourceSyllablePosition:i,sourceUnderlayId:result.source.id,alignmentLevel:'source-reading-word',acousticTimes:null,review:null}))};
}
