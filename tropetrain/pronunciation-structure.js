// Source display structure only: no phoneme, Hebrew-cluster or musical inference.
import {alignSourceWordBoundaries,groupReaderLetterForms} from './pronunciation-word-alignment.js';
import {resolvePronunciationRepeats,PRONUNCIATION_REPEAT_EVIDENCE} from './pronunciation-repeats.js';
export function transcriptionStructure(nodes){
 if(nodes===null)return {status:'missing',text:null,units:[],boundaries:[],marks:[]};
 if(!Array.isArray(nodes))throw Error('Invalid pronunciation source cell.');
 let text='';const marks=[];
 function visit(items,path=[]){
  items.forEach((node,index)=>{
   const sourcePath=[...path,index];
   if(typeof node==='string'){text+=node;return;}
   if(!node||!['stressed','superscript-e','reading'].includes(node.kind))throw Error('Unsupported pronunciation source markup.');
   const start=text.length;
   if(node.kind==='superscript-e')text+='ᵉ';
   else{
    if(!Array.isArray(node.content)||node.kind==='reading'&&typeof node.label!=='string')throw Error('Invalid pronunciation source markup.');
    visit(node.content,[...sourcePath,'content']);
   }
   marks.push({kind:node.kind,start,end:text.length,path:sourcePath,...(node.kind==='reading'?{label:node.label}:{})});
  });
 }
 visit(nodes);
 const status=text===''?'empty':text==='—'?'repeat-mark':'present';
 if(status!=='present')return {status,text,units:[],boundaries:[],marks};
 const units=[],boundaries=[];
 function unit(start,end){
  if(start===end)return;
  const sourceMarks=marks.filter(m=>m.start<end&&m.end>start);
  const value=text.slice(start,end);
  units.push({number:units.length+1,text:value,start,end,
   sourceStress:sourceMarks.some(m=>m.kind==='stressed'),
   sourceMarks:sourceMarks.map(m=>({...m})),
   acutePositions:[...value.matchAll(/\u0301/gu)].map(m=>start+m.index),
   brevePositions:[...value.matchAll(/\u0306/gu)].map(m=>start+m.index)});
 }
 let start=0;
 for(const match of text.matchAll(/[·\-\s]/gu)){
  unit(start,match.index);
  boundaries.push({text:match[0],start:match.index,end:match.index+match[0].length,kind:match[0]==='·'?'syllable-dot':match[0]==='-'?'source-join':'space'});
  start=match.index+match[0].length;
 }
 unit(start,text.length);
 return {status,text,units,boundaries,marks};
}

export function sourcePronunciationStudy(group,{sourceCommit,word,style}){
 if(!['sephardic','ashkenazic'].includes(style))throw Error('Unsupported pronunciation text style.');
 const sourceWordId=word?.sourceWordId??word?.id,index=group.readerIds.indexOf(sourceWordId);
 if(index<0||group.readerHebrew[index]!==word.sourceHebrew)throw Error('The Hebrew source changed; this pronunciation link needs review.');
 if(group.writtenReadVariants){
  if(group.writtenReadVariants.some(v=>!group.readerIds.includes(v.readerWordId)))throw Error('Explicit written/read pronunciation owner needs review.');
  group.readerHebrew.forEach((_,i)=>groupReaderLetterForms(group,i));
 }
 const singleWord=group.readerIds.length===1;
 function cellStructure(nodes,style,row,column){
  const cell=transcriptionStructure(nodes),id=`${group.id}-${style}-r${row}-c${column+1}`;
  const alignment={readerWordId:singleWord?group.readerIds[0]:null,phonemes:null,hebrewClusterRanges:null,noteIds:null,audioTimes:null};
  return {id,column:column+1,...cell,...alignment,units:cell.units.map(unit=>({id:`${id}-u${unit.number}`,...unit,...alignment}))};
 }
 const rows=group.rows.map(row=>({number:row.number,styles:Object.fromEntries(['sephardic','ashkenazic'].map(id=>[id,row.transcriptions[id].map((cell,column)=>cellStructure(cell,id,row.number,column))]))}));
 const resolved=resolvePronunciationRepeats(group,rows);
 const aligned=alignSourceWordBoundaries(group,resolved,group.rows.map(row=>row.hebrew.map(transcriptionStructure)));
 return {
  format:'tropetrain-pronunciation-study-v1',revision:3,sourceCommit,license:'CC-BY-SA-4.0',
  attribution:'Hebrew Wikisource · Miqra according to the Masorah; Phonetic MAM by Benjamin Denckla, with Seth (Avi) Kadish and Erel Segal-Halevi.',
  selectedStyle:style,selection:{sourceWordId,occurrenceId:word.id,sourceHebrew:word.sourceHebrew},
  groupId:group.id,readerIds:[...group.readerIds],readerHebrew:[...group.readerHebrew],
  alignmentScope:singleWord?'single-reader-word':aligned.wordAlignment.styles[style].status==='word-aligned'?'source-word-boundaries':aligned.wordAlignment.styles[style].status==='partly-word-aligned'?'partial-source-word-boundaries':'complete-reader-group',
  rows:aligned.rows,wordAlignment:aligned.wordAlignment,repeatEvidence:PRONUNCIATION_REPEAT_EVIDENCE,
  sourceGroup:group,
  review:'Source display structure and correspondence only; independent linguistic and correspondence review pending. Word IDs require consensus across all literal Hebrew readings and all exact documented reader-form paths, with explicit transcription joins. Combined or conflicting source words remain unsplit. Dots, joins, stress and all source marks stay literal; phonemes, Hebrew-cluster mapping, note alignment and audio times remain unassigned.'
 };
}
