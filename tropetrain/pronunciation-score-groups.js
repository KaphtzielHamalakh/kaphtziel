// Original structural correspondence between independent Hebrew underlays.
// A common span is not an individual syllable, phoneme or acoustic allocation.
import {PRONUNCIATION_STYLES} from './pronunciation.js';
const canonical=w=>w.sourceWordId??w.id;
function scoreRanges(word){
 let end=0;
 const ranges=word.syllables.map(s=>{const start=end;end+=s.sourceHebrew.length;return {syllableId:s.id,hebrew:s.sourceHebrew,start,end};});
 if(ranges.map(r=>r.hebrew).join('')!==word.sourceHebrew)throw Error('Score syllables do not reproduce the original marked Hebrew.');
 return ranges;
}
function sourceSpan(unit,word){
 if(unit.hebrewClusterRanges==null)return null;
 const written=[];
 for(const r of unit.hebrewClusterRanges){
  if(r.readerWordId!==canonical(word)||!['written','shared-consonant'].includes(r.role)||!Number.isInteger(r.start)||!Number.isInteger(r.end)||r.start<0||r.start>=r.end||r.end>word.sourceHebrew.length||word.sourceHebrew.slice(r.start,r.end)!==r.text)throw Error('Pronunciation ranges do not match the original marked Hebrew.');
  if(r.role==='written')written.push(r);
 }
 if(!written.length||written.some((r,i)=>i&&written[i-1].end!==r.start))throw Error('Pronunciation written ranges are not contiguous.');
 return {start:written[0].start,end:written.at(-1).end};
}
export function linkPronunciationScoreGroups(events,words,library,style){
 if(!PRONUNCIATION_STYLES.some(s=>s.id===style))throw Error('Unsupported pronunciation text style.');
 const prepared=new Map(),seen=new Set();
 for(const event of events){
  if(seen.has(event.id))throw Error('Duplicate score event ID.');seen.add(event.id);
  const word=words[event.wordIndex];
  if(!word||word.id!==event.wordId||(event.sourceWordId??event.wordId)!==canonical(word))throw Error('Score notes do not match their Hebrew word occurrences.');
  if(!prepared.has(word.id))prepared.set(word.id,{word,ranges:scoreRanges(word),events:[]});
  const item=prepared.get(word.id),range=item.ranges.find(r=>r.syllableId===event.syllableId);
  if(!range||range.hebrew!==event.syllable)throw Error('Score event syllable no longer matches its original Hebrew.');
  item.events.push(event);
 }
 const results=[...prepared.values()].map(({word,ranges,events:notes})=>{
  const study=library.study(word,style),groups=[],paths=[];
  if(study)for(const row of study.rows)for(const cell of row.styles[style]){
   const owned=cell.units.filter(u=>u.readerWordId===canonical(word));
   if(!owned.length)continue;
   const units=owned.map(unit=>({unit,span:sourceSpan(unit,word)}));
   // Do not bridge past an unresolved word form, gap, overlap or alternative.
   if(units.some(u=>!u.span)){paths.push({row:row.number,column:cell.column,status:'source-only-written-form'});continue;}
   if(units.some((u,i)=>i&&units[i-1].span.end!==u.span.start)){paths.push({row:row.number,column:cell.column,status:'noncontiguous-source-path'});continue;}
   const first=units[0].span.start,last=units.at(-1).span.end;
   const boundaries=new Set(ranges.flatMap(r=>[r.start,r.end]));
   const common=[...new Set([first,...units.map(u=>u.span.end)].filter(b=>boundaries.has(b)))].sort((a,b)=>a-b);
   if(common[0]!==first||common.at(-1)!==last){paths.push({row:row.number,column:cell.column,status:'incomplete-common-span'});continue;}
   for(let i=1;i<common.length;i++){
    const start=common[i-1],end=common[i],score=ranges.filter(r=>r.start>=start&&r.end<=end),source=units.filter(u=>u.span.start>=start&&u.span.end<=end);
    if(!score.length||!source.length||score[0].start!==start||score.at(-1).end!==end||source[0].span.start!==start||source.at(-1).span.end!==end)throw Error('Common Hebrew span is incomplete.');
    const groupNotes=notes.filter(e=>score.some(r=>r.syllableId===e.syllableId));
    if(!groupNotes.length)continue;
    groups.push({id:`${word.id}-r${row.number}-c${cell.column}-${start}-${end}`,wordId:word.id,sourceWordId:canonical(word),hebrew:word.sourceHebrew.slice(start,end),hebrewRange:{start,end},relation:score.length===1&&source.length===1?'same-written-syllable':'different-syllable-divisions',sourceRow:row.number,sourceColumn:cell.column,sourceReference:structuredClone(cell.sourceReference??null),
     scoreSyllables:score.map(r=>({...r,eventIds:groupNotes.filter(e=>e.syllableId===r.syllableId).map(e=>e.id),printedLyrics:[...new Set(groupNotes.filter(e=>e.syllableId===r.syllableId).map(e=>e.sourceLyric).filter(Boolean))]})),
     sourceUnits:source.map(({unit,span})=>({...structuredClone(unit),writtenSpan:{...span}})),eventIds:groupNotes.map(e=>e.id),individualNoteAllocation:score.length===1&&source.length===1?'equal-written-span':null,phonemes:null,audioTimes:null});
   }
   paths.push({row:row.number,column:cell.column,status:'checked-common-spans'});
  }
  return {wordId:word.id,sourceWordId:canonical(word),hebrew:word.sourceHebrew,groups,paths,reason:groups.length?null:!study?'no-source-correspondence':paths.some(p=>p.status==='source-only-written-form')?'source-only-written-form':paths.length?'incomplete-source-path':'no-individual-word-units',eventIds:notes.map(e=>e.id)};
 });
 const groups=results.flatMap(w=>w.groups),covered=new Set(groups.flatMap(g=>g.eventIds)),different=new Set(groups.filter(g=>g.relation==='different-syllable-divisions').flatMap(g=>g.eventIds));
 return {format:'tropetrain-pronunciation-score-groups-v1',revision:1,style,sourceCommit:library.sourceCommit,dataLicense:'CC-BY-SA-4.0',
  method:'Minimal common spans at boundaries shared by both unchanged marked-Hebrew underlays. Each source row/column remains a separate path. Shared consonants do not own the written letter twice. Different divisions retain all original syllables and do not allocate an individual source unit to a note.',
  review:'Structural text correspondence only; independent linguistic, cantorial and acoustic review pending. No pronunciation is synthesized or retimed.',phonemes:null,audioTimes:null,
  counts:{events:events.length,eventsInCommonSpans:covered.size,eventsInDifferentDivisions:different.size,eventsWithoutCommonSpan:events.length-covered.size,groups:groups.length},words:results};
}
