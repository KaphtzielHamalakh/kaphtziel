// Original source-sign navigation. This never allocates a figure's notes to a word.
import {analyzeSourceSigns} from './accents.js';
import {analyzeAccentContext,findCombinationsInReading,sourceLookupPattern} from './accent-context.js';
import {PRINTED_PATTERN_SOURCES,allPatternModes,patternSource,patternContextChoices,printedPatternPlan} from './printed-patterns.js';
const torahBooks=new Set(['gen','exo','lev','num','deu']);
const wordCopy=w=>({id:w.id,sourceWordId:w.sourceWordId??w.id,hebrew:w.sourceHebrew,bookId:w.bookId,chapter:w.chapter,verse:w.verse,ordinal:w.ordinal,sectionId:w.sectionId??null,verseKey:w.verseKey??null});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const noAllocation=()=>({musicalWordAllocation:null,syllableUnderlay:null,phonemes:null,audioTimes:null,musicalReview:null});
let catalogue;
export function wordPatternCatalogue(){
 if(catalogue)return structuredClone(catalogue);
 const entries=[],unmapped=[];
 for(const source of PRINTED_PATTERN_SOURCES)for(const mode of allPatternModes(source.id)){
  const row=patternSource(source.id,mode.id),record=row.record,queries=patternContextChoices(source.id,mode.id);
  if(!queries.length){unmapped.push({sourceId:source.id,modeId:mode.id,sourceLabel:row.label,figureLabel:mode.name,reason:'No checked modern sign lookup is supplied for this figure. Its manual source study is unchanged.'});continue;}
  let writtenPlayback=false;try{writtenPlayback=printedPatternPlan(mode.id,{sourceId:source.id}).length>0;}catch{}
  const condition=record.selectedFigure?.sourceCondition??record.conditions?.[mode.id]??null;
  for(const q of queries){const query=sourceLookupPattern(q.ids);entries.push({id:`${source.id}:${mode.id}:${query.id}`,sourceId:source.id,modeId:mode.id,sourceLabel:row.label,figureLabel:mode.name,queryId:query.id,queryIds:query.ids,queryLabel:q.label,
   sourceReference:{record:source.id==='baer-1894-no105-first-setting'?'docs/BAER-NO105-PATTERNS.json':row.recordPath??'docs/PRINTED-PATTERN-CATALOG.json',revision:record.revision??row.sourceCatalog?.revision??null,page:record.source.page??null,url:record.source.url??null},
   printedCondition:condition?structuredClone(condition):null,conditionApplicationVerified:false,writtenPlayback,
   timingStatus:writtenPlayback?'Written values can be studied separately; historical timing and word fitting remain unreviewed.':'This figure needs an explicit existing timing or repeat choice, or further source evidence. No choice is enabled automatically.',...noAllocation()});}
 }
 catalogue={entries,unmapped,limits:'Encoded sign contexts only. Lookup is neither a verified source predicate nor musical word coverage. No word, syllable, phoneme or sound-time allocation is inferred.'};return structuredClone(catalogue);
}
export function createWordPatternIndex(words){
 if(!Array.isArray(words)||!words.length||words.some(w=>typeof w?.id!=='string'||typeof w.sourceHebrew!=='string')||new Set(words.map(w=>w.id)).size!==words.length)throw Error('An unchanged reading with unique occurrence IDs is required.');
 const snapshot=words.map(wordCopy),analysisWords=words.map(w=>({...w,signAnalysis:analyzeSourceSigns(w.sourceHebrew)})),context=analyzeAccentContext(analysisWords),catalog=wordPatternCatalogue(),byQuery=new Map(),byWord=words.map(()=>[]);
 for(const entry of catalog.entries){if(!byQuery.has(entry.queryId))byQuery.set(entry.queryId,[]);byQuery.get(entry.queryId).push(entry);}
 for(const [queryId,entries]of byQuery)for(const hit of findCombinationsInReading(analysisWords,queryId,context)){
  const first=hit.words[0];if(!torahBooks.has(first.bookId)||hit.words.some(w=>w.bookId!==first.bookId||w.chapter!==first.chapter||w.verse!==first.verse||(w.sectionId??null)!==(first.sectionId??null)||(w.verseKey??null)!==(first.verseKey??null)))continue;
  const sourceWords=hit.words.map(wordCopy),positions=hit.atoms.flatMap(a=>a.positions.map(p=>({signId:a.id,readerWordId:p.wordId,sourceWordId:p.sourceWordId,offset:p.offset,char:p.char})));
  for(let index=hit.start;index<=hit.end;index++)for(const entry of entries){
   const carries=positions.some(p=>p.readerWordId===words[index].id);
   byWord[index].push({...entry,lookup:{startIndex:hit.start,endIndex:hit.end,words:sourceWords,matchedSignPositions:positions,withinWord:hit.withinWord,includesMaqaf:hit.includesMaqaf,includesOtherSigns:hit.includesOtherSigns,selectedWordCarriesMatchedSign:carries,includedByMaqafUnit:!carries&&hit.includesMaqaf}});
  }
 }
 function forWord(index){
  if(!Number.isInteger(index)||index<0||index>=words.length)throw Error('Select a word in the current reading.');
  if(words.length!==snapshot.length||words.some((w,i)=>!same(wordCopy(w),snapshot[i])))throw Error('The marked reading or occurrence identity changed. Reopen its source lookups.');
  const word=snapshot[index],unit=context.units[context.wordContexts[index].unitIndex],status=!word.bookId?'source-reference-unavailable':!torahBooks.has(word.bookId)?'outside-torah':!unit.qualified?'source-unit-withheld':byWord[index].length?'sign-lookups':'no-supplied-lookup';
  return {format:'tropetrain-word-pattern-lookups-v1',status,selectedWord:structuredClone(word),sourceUnit:{wordIds:unit.wordIndices.map(i=>snapshot[i].id),hebrew:unit.wordIndices.map(i=>snapshot[i].hebrew),issues:[...unit.issues],qualified:unit.qualified},
   candidates:status==='sign-lookups'?structuredClone(byWord[index]):[],limits:catalog.limits,...noAllocation()};
 }
 return Object.freeze({forWord});
}
