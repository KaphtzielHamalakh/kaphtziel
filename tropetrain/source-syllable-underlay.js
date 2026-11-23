import {sourceJointGroups} from './source-joint-syllables.js';
// Original consensus adapter for existing CC-BY-SA source syllable facts.
// It assigns written spans to an ORIGINAL instrumental demonstration only.
import {sourceReadingSyllables} from './source-reading-syllables.js';
import {readingChoices,chooseSourceStudy} from './source-reading-choices.js';
export const SOURCE_SYLLABLE_UNDERLAY=Object.freeze({id:'mam-consensus-written-syllables-v1',revision:1,
 sourceCommit:'6f0612ed2109d32e288d7c0ca41ae3dbfaad702b',dataLicense:'CC-BY-SA-4.0',
 name:'Phonetic MAM · consensus written syllables',review:null,phonemes:null,voice:null,
 inputSha256:'a1a0590524bd5545a24a1bb405f4e26d7a8a0412f87fb37ce9b14c0cb2c880c2',
 computationSourceSha256:'357314571720309945b3c7e1a2b33582a34dfbc6a497a02309af8c8572fcafaf',
 summary:'Original Torah instrumental demonstration using exact written spans agreed by both source text styles. Source-only, combined and conflicting syllable paths remain unavailable. Linguistic and musical review is pending.'});
export const SOURCE_SYLLABLE_GAPS=Object.freeze({
 'loading':'Source syllables are loading.',
 'no-source-correspondence':'No checked Torah source syllables for this word.',
 'combined-source-form':'Source syllables remain combined across words.',
 'source-only-written-form':'Source syllables have no exact written ranges for this word.',
 'missing-source-style':'One source text style has no individual syllable path.',
 'incomplete-source-path':'A source syllable path does not cover the complete marked word.',
 'conflicting-source-paths':'The source paths disagree on written syllable boundaries or stress.'
});
const canonical=word=>word.sourceWordId??word.id;
const signature=path=>JSON.stringify(path.units.map(u=>[u.start,u.end,u.sourceStress]));
function pathForWord(cell,row,style,word){
 const owned=cell.units.filter(u=>u.readerWordId===canonical(word));if(!owned.length)return null;
 const boundaries=new Set([0,word.sourceHebrew.length,...[...word.sourceHebrew.matchAll(/[א-ת]/gu)].map(m=>m.index)]);
 const path={sourceRow:row.number,sourceColumn:cell.column,style,sourceCellId:cell.id,sourceReference:structuredClone(cell.sourceReference??null),units:[],gap:null};
 for(const unit of owned){
  const provenance={sourceUnitId:unit.id,sourceText:unit.text,sourceStress:unit.sourceStress,
   hebrewClusterRanges:structuredClone(unit.hebrewClusterRanges),hebrewUnderlay:structuredClone(unit.hebrewUnderlay),sourceMarks:structuredClone(unit.sourceMarks)};
  if(unit.hebrewClusterRanges==null){path.gap='source-only-written-form';path.units.push({...provenance,start:null,end:null});continue;}
  const written=[];
  for(const range of unit.hebrewClusterRanges){
   if(range.readerWordId!==canonical(word)||!['written','shared-consonant'].includes(range.role)||!Number.isInteger(range.start)||!Number.isInteger(range.end)||range.start<0||range.start>=range.end||range.end>word.sourceHebrew.length||!boundaries.has(range.start)||!boundaries.has(range.end)||word.sourceHebrew.slice(range.start,range.end)!==range.text)
    throw Error('Source syllable ranges no longer match the original marked Hebrew.');
   if(range.role==='written')written.push(range);
  }
  if(!written.length||written.some((r,i)=>i&&written[i-1].end!==r.start)){path.gap??='incomplete-source-path';path.units.push({...provenance,start:null,end:null});continue;}
  path.units.push({...provenance,start:written[0].start,end:written.at(-1).end});
 }
 if(!path.gap&&(path.units[0].start!==0||path.units.at(-1).end!==word.sourceHebrew.length||path.units.some((u,i)=>i&&path.units[i-1].end!==u.start)))path.gap='incomplete-source-path';
 return path;
}
export function sourceSyllableWord(word,studies){
 if(!word||typeof word.id!=='string'||typeof word.sourceHebrew!=='string')throw Error('Choose an unchanged marked Hebrew word.');
 const id=canonical(word),result={sourceWordId:id,hebrew:word.sourceHebrew,status:'unavailable',reason:'no-source-correspondence',paths:[],syllables:[],source:SOURCE_SYLLABLE_UNDERLAY,
  unallocatedSourceUnits:[],phonemes:null,acousticTimes:null,voice:null,review:null};
 if(studies===null)return {...result,reason:'loading'};
 const available=Object.entries(studies).filter(([,s])=>s!==null);
 if(!available.length)return result;
 if(available.length!==2||!['sephardic','ashkenazic'].every(s=>Object.hasOwn(studies,s)))throw Error('Both original source text styles are required for consensus.');
 for(const [style,study]of available){
  const i=study.readerIds.indexOf(id);
  if(!['sephardic','ashkenazic'].includes(style)||study.sourceCommit!==SOURCE_SYLLABLE_UNDERLAY.sourceCommit||i<0||study.readerHebrew[i]!==word.sourceHebrew||study.hebrewUnderlay?.inputSha256!==SOURCE_SYLLABLE_UNDERLAY.inputSha256||study.hebrewUnderlay.computationSourceSha256!==SOURCE_SYLLABLE_UNDERLAY.computationSourceSha256)
   throw Error('Source syllable evidence or marked word correspondence changed.');
  for(const row of study.rows)for(const cell of row.styles[style]){
   const p=pathForWord(cell,row,style,word);if(p)result.paths.push(p);
   for(const unit of cell.units.filter(u=>u.readerWordId===null))result.unallocatedSourceUnits.push({style,sourceRow:row.number,sourceColumn:cell.column,sourceCellId:cell.id,unit:structuredClone(unit),ownerWordId:null});
  }
 }
 if(!result.paths.length)return {...result,reason:'combined-source-form'};
 const gap=result.paths.find(p=>p.gap)?.gap;
 if(gap)return {...result,reason:gap};
 if(!['sephardic','ashkenazic'].every(s=>result.paths.some(p=>p.style===s)))return {...result,reason:'missing-source-style'};
 if(new Set(result.paths.map(signature)).size!==1)return {...result,reason:'conflicting-source-paths'};
 const units=result.paths[0].units;
 const syllables=units.map((u,i)=>({sourceHebrew:word.sourceHebrew.slice(u.start,u.end),stress:u.sourceStress,roman:null,phonemes:null,
  reviewStatus:'source-computed-consensus',analyzer:SOURCE_SYLLABLE_UNDERLAY.name,
  writtenRange:{start:u.start,end:u.end},sourceUnitIds:result.paths.map(p=>p.units[i].sourceUnitId),sourcePathIndices:result.paths.map((_,n)=>n),
  sourceSyllablePosition:i,sourceUnderlayId:SOURCE_SYLLABLE_UNDERLAY.id,acousticTimes:null,review:null}));
 if(syllables.map(s=>s.sourceHebrew).join('')!==word.sourceHebrew)throw Error('Source syllables must reproduce all original marks.');
 return {...result,status:'available',reason:null,syllables};
}
export class SourceSyllableUnderlay{
 constructor(library,{allowSourceReadings=false,sourceReadingChoices={},allowJointSources=false}={}){if(!library||library.sourceCommit!==SOURCE_SYLLABLE_UNDERLAY.sourceCommit||!library.underlay)throw Error('Checked source syllable library required.');this.library=library;this.allowJointSources=allowJointSources;this.allowSourceReadings=allowSourceReadings;this.sourceReadingChoices=readingChoices(sourceReadingChoices);this.groups=new Map();}
 jointGroups(words){return this.allowJointSources&&this.allowSourceReadings?sourceJointGroups(words,this.library,{source:SOURCE_SYLLABLE_UNDERLAY,sourceReadingChoices:this.sourceReadingChoices}):[];}
 word(word){
  if(!word||typeof word.id!=='string'||typeof word.sourceHebrew!=='string')return sourceSyllableWord(word,null);
  if(!['gen','exo','lev','num','deu'].includes(canonical(word).split('-')[0]))return sourceSyllableWord(word,{sephardic:null,ashkenazic:null});
  const group=this.library.at(word);if(!group)return sourceSyllableWord(word,{sephardic:null,ashkenazic:null});
  let studies=this.groups.get(group.id);
  if(!studies){studies=Object.fromEntries(['sephardic','ashkenazic'].map(s=>[s,this.library.study(word,s)]));if(this.groups.size>=128)this.groups.delete(this.groups.keys().next().value);this.groups.set(group.id,studies);}
  const selected=Object.fromEntries(Object.entries(studies).map(([style,study])=>[style,chooseSourceStudy(study,this.sourceReadingChoices)]));
  let result=sourceSyllableWord(word,selected);
  if(this.allowSourceReadings)result=sourceReadingSyllables(word,selected,result);
  if(Object.values(selected).some(s=>s.sourceSelection)){
   const original=sourceSyllableWord(word,studies);
   result={...result,sourceReadingChoices:structuredClone(this.sourceReadingChoices),sourceChoiceEvidence:{
    policy:structuredClone(this.sourceReadingChoices),selectedRows:structuredClone(selected.sephardic.sourceSelection?.rows??selected.ashkenazic.sourceSelection.rows),
    originalPaths:original.paths,originalUnallocatedSourceUnits:original.unallocatedSourceUnits,originalSourceGroup:structuredClone(studies.sephardic.sourceGroup),review:null}};
  }
  return result;
 }
}
