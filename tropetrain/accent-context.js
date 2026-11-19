import {analyzeSourceSigns,SEARCH_SIGNS} from './accents.js';

export const CONTEXT_ANALYSIS=Object.freeze({id:'uxlc-adjacent-combinations',revision:1,
  sources:['https://www.tanach.us/Pages/Coding.html','https://archive.org/details/treatiseonaccent00wickuoft'],
  historicalReference:'Wickes, 1887, printed pp. 9–12. Maqaf units and repeated positional signs; no proposed textual corrections applied.',
  scope:'Derived adjacent source-sign combinations, not a full syntactic hierarchy, melodic grammar or verified Kinnor chart.'});
const positional=new Set(['pashta','segolta','zarqa','telisha-gedola','telisha-qetana']);
export const COMBINATION_SIGNS=Object.freeze(SEARCH_SIGNS.filter(s=>s.proseClass));
const definitions=new Map(COMBINATION_SIGNS.map(s=>[s.id,s]));
export const FEATURED_COMBINATIONS=Object.freeze([
  ['munah','etnahta'],['merkha','tipha'],['merkha','silluq'],['munah','zakef-katon'],
  ['mahapakh','pashta'],['darga','tevir'],['qadma','geresh'],['munah','revia'],['munah','zarqa'],
  ['yerah-ben-yomo','qarnei-fara'],['merkha','tipha','munah','etnahta'],
  ['zarqa','munah','segolta'],['qadma','mahapakh','pashta','munah','zakef-katon']
].map(ids=>Object.freeze({id:ids.join('>'),ids:Object.freeze(ids)})));
export const combinationName=ids=>ids.map(id=>definitions.get(id)?.name??id).join(' → ');
export const combinationGlyphs=ids=>ids.map(id=>'◌'+definitions.get(id).char).join('  ');
function query(value){
  const ids=Array.isArray(value)?value:String(value).split('>');
  if(ids.length<2||ids.length>32||ids.some(id=>!definitions.has(id)))throw Error('Choose a source combination from the chart.');
  return ids;
}
const verseIdentity=w=>w.verseKey??[w.bookId,w.chapter,w.verse,w.sectionId].join(':');
const joined=w=>/־[\s\u034f\u200d]*$/u.test(w.sourceHebrew);

// Every source word belongs to exactly one unit, including unresolved units.
// Sign positions are never deleted: folding a positional duplicate creates one
// search atom holding all original records. It does not infer stress or music.
export function analyzeAccentContext(words){
  const units=[],runs=[],wordContexts=Array(words.length);let pending=null;
  for(let i=0;i<words.length;i++){
    const word=words[i],key=verseIdentity(word);
    if(!pending)pending={id:`unit:${word.id}`,verseKey:key,wordIndices:[],atoms:[],issues:[],foldedPositions:0};
    const unit=pending;unit.wordIndices.push(i);
    const analysis=word.signAnalysis??analyzeSourceSigns(word.sourceHebrew);
    const raw=[...analysis.signs,...analysis.marks.filter(s=>s.id==='silluq')].sort((a,b)=>a.offset-b.offset);
    const groups=new Map();
    for(const sign of raw){
      const position={...sign,wordIndex:i,wordId:word.id,sourceWordId:word.sourceWordId??word.id};
      if(sign.role==='helper')continue;
      if(!sign.proseClass){unit.issues.push('poetic-or-unclassified-sign');continue;}
      if(!groups.has(sign.id))groups.set(sign.id,[]);groups.get(sign.id).push(position);
    }
    for(const [id,positions] of groups){
      if(positions.length>1&&!positional.has(id))unit.issues.push('unresolved-repeated-sign');
      if(positions.length>1)unit.foldedPositions+=positional.has(id)?positions.length-1:0;
      unit.atoms.push({id,proseClass:positions[0].proseClass,positions});
    }
    if(analysis.marks.some(s=>s.id==='paseq'))unit.issues.push('paseq-context');
    if(analysis.marks.some(s=>s.id==='sof-pasuq')&&i+1<words.length&&verseIdentity(words[i+1])===key)unit.issues.push('internal-verse-closing-mark');
    if(word.sourceHebrew.includes('־')&&!joined(word))unit.issues.push('internal-maqaf');
    if(joined(word)&&raw.some(s=>s.proseClass))unit.issues.push('accented-maqaf-prefix');
    const continueUnit=joined(word)&&i+1<words.length&&verseIdentity(words[i+1])===key;
    if(joined(word)&&!continueUnit)unit.issues.push('dangling-maqaf');
    if(continueUnit)continue;
    if(!unit.atoms.length)unit.issues.push('no-functional-accent');
    const disjunctives=unit.atoms.filter(a=>a.proseClass.startsWith('D'));
    if(disjunctives.length>1)unit.issues.push('multiple-disjunctives');
    if(disjunctives.length&&unit.atoms.at(-1)!==disjunctives[0])unit.issues.push('sign-order-needs-context');
    unit.issues=[...new Set(unit.issues)];unit.qualified=!unit.issues.length;unit.index=units.length;
    for(const n of unit.wordIndices)wordContexts[n]={unitIndex:unit.index,runIndex:null};
    units.push(unit);pending=null;
  }
  // These are only C*→D source runs. Numerical disjunctive ranks cannot by
  // themselves determine the full hierarchical tree or its melodic cadences.
  let runUnits=[];
  for(const unit of units){
    if(!unit.qualified||runUnits.length&&unit.verseKey!==runUnits[0].verseKey)runUnits=[];
    if(!unit.qualified)continue;runUnits.push(unit);
    if(unit.atoms.at(-1).proseClass.startsWith('D')){
      const run={id:`run:${runUnits[0].id}`,unitIndices:runUnits.map(u=>u.index),wordIndices:runUnits.flatMap(u=>u.wordIndices),atoms:runUnits.flatMap(u=>u.atoms)};
      const index=runs.length;runs.push(run);for(const n of run.wordIndices)wordContexts[n].runIndex=index;runUnits=[];
    }
  }
  return {analysis:CONTEXT_ANALYSIS,units,runs,wordContexts};
}
function streams(context){
  const result=[];let stream=[],key=null;
  for(const unit of context.units){
    if(!unit.qualified||key!==unit.verseKey){if(stream.length)result.push(stream);stream=[];}
    key=unit.verseKey;if(unit.qualified)stream.push(...unit.atoms.map(atom=>({...atom,unitIndex:unit.index})));
  }
  if(stream.length)result.push(stream);return result;
}
function hitFor(words,context,atoms){
  const unitIndices=[...new Set(atoms.map(a=>a.unitIndex))];
  const selected=unitIndices.flatMap(n=>context.units[n].wordIndices),start=selected[0],end=selected.at(-1),slice=words.slice(start,end+1);
  return {start,end,word:slice[0],words:slice,occurrenceIds:slice.map(w=>w.id),sourceWordIds:slice.map(w=>w.sourceWordId??w.id),
    atoms,withinWord:new Set(atoms.flatMap(a=>a.positions.map(p=>p.wordId))).size===1,
    includesOtherSigns:unitIndices.some(n=>context.units[n].atoms.some(a=>!atoms.some(b=>a.positions===b.positions))),
    includesMaqaf:slice.some(joined)};
}
export function findCombinationsInReading(words,value,context=analyzeAccentContext(words)){
  const ids=query(value),hits=[];
  for(const stream of streams(context))for(let i=0;i<=stream.length-ids.length;i++){
    if(ids.every((id,j)=>stream[i+j].id===id))hits.push(hitFor(words,context,stream.slice(i,i+ids.length)));
  }
  return hits;
}
const caches=new WeakMap();
function cacheFor(corpus){let cache=caches.get(corpus);if(!cache){cache={queries:new Map()};caches.set(corpus,cache);}return cache;}
export async function visitCorpusContext(corpus,visit){
  let count=0;
  for(const book of corpus.books){
    const last=book.chapters.at(-1),passage=corpus.passage([{id:'context-index',bookId:book.id,start:{chapter:1,verse:1},end:{chapter:last.number,verse:last.verses.at(-1).number}}]);
    for(const verse of passage.verses){visit(verse.words,analyzeAccentContext(verse.words),verse);if(++count%200===0)await new Promise(resolve=>setTimeout(resolve,0));}
    await new Promise(resolve=>setTimeout(resolve,0));
  }
}
export async function findCombinationsInCorpus(corpus,value){
  const ids=query(value),key=ids.join('>'),cache=cacheFor(corpus).queries;
  if(cache.has(key))return cache.get(key);
  const promise=(async()=>{
    const hits=[];await visitCorpusContext(corpus,(words,context)=>hits.push(...findCombinationsInReading(words,ids,context)));return hits;
  })();
  if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(key,promise);
  try{return await promise;}catch(error){cache.delete(key);throw error;}
}
export async function getCombinationCatalogue(corpus){
  const cache=cacheFor(corpus);if(cache.catalogue)return cache.catalogue;
  cache.catalogue=(async()=>{
    const counts=new Map();
    await visitCorpusContext(corpus,(_words,context)=>{
      for(const run of context.runs)for(let i=0;i<run.atoms.length-1;i++){
        const ids=run.atoms.slice(i).map(a=>a.id),id=ids.join('>');
        const entry=counts.get(id)??{id,ids,count:0};entry.count++;counts.set(id,entry);
      }
    });
    return [...counts.values()].sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id));
  })();
  try{return await cache.catalogue;}catch(error){cache.catalogue=null;throw error;}
}
