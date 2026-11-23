// Original exact-span bridge. This relates two existing text underlays; it
// neither changes the score syllables nor allocates phonemes or recorded time.
import {PRONUNCIATION_STYLES} from './pronunciation.js';

export const NOTE_LINK_REASONS=Object.freeze({
 'no-source-correspondence':'No checked pronunciation correspondence for this word.',
 'no-style-transcription':'This source has no transcription in the selected text style.',
 'combined-source-form':'The source pronunciation remains combined across words.',
 'source-only-written-form':'The pronunciation uses a source form without an exact written Hebrew range.',
 'different-syllable-boundaries':'The pronunciation and score divide the written Hebrew differently. Their syllables remain unchanged.',
 'no-exact-unit':'No pronunciation unit has exactly this score syllable’s written Hebrew range.',
 'no-phonemic-proposal-route':'No phonemic research route is linked to this exact source unit. No text or sound is substituted.'
});
const sourceId=word=>word.sourceWordId??word.id;
function syllableRanges(word){
 let offset=0;
 const ranges=word.syllables.map(s=>{const start=offset;offset+=s.sourceHebrew.length;return {...s,start,end:offset};});
 if(ranges.map(r=>r.sourceHebrew).join('')!==word.sourceHebrew)throw Error('Score syllables do not reproduce the original marked Hebrew.');
 return ranges;
}
function writtenSpan(unit,word){
 if(unit.hebrewClusterRanges===null||unit.hebrewClusterRanges===undefined)return null;
 const ranges=unit.hebrewClusterRanges;
 for(const r of ranges){
  if(r.readerWordId!==sourceId(word)||!['written','shared-consonant'].includes(r.role)||!Number.isInteger(r.start)||!Number.isInteger(r.end)||r.start<0||r.start>=r.end||r.end>word.sourceHebrew.length||word.sourceHebrew.slice(r.start,r.end)!==r.text)
   throw Error('Pronunciation ranges do not match the original marked Hebrew.');
 }
 const written=ranges.filter(r=>r.role==='written');
 if(!written.length)throw Error('A pronunciation link needs a written Hebrew range.');
 for(let i=1;i<written.length;i++)if(written[i-1].end!==written[i].start)throw Error('Pronunciation written ranges are not contiguous.');
 return {start:written[0].start,end:written.at(-1).end};
}
export function linkPronunciationToNotes(plan,words,library,style){
 if(!PRONUNCIATION_STYLES.some(s=>s.id===style))throw Error('Unsupported pronunciation text style.');
 const prepared=new Map(),seen=new Set();
 const links=plan.map(event=>{
  if(seen.has(event.id))throw Error('Duplicate score event ID.');seen.add(event.id);
  const word=words[event.wordIndex];
  if(!word||word.id!==event.wordId||(event.sourceWordId??event.wordId)!==sourceId(word))throw Error('Score notes do not match their Hebrew word occurrences.');
  if(!prepared.has(word.id)){
   const ranges=syllableRanges(word),study=library.study(word,style);
   const units=study?.rows.flatMap(row=>row.styles[style].flatMap(cell=>cell.units.map(unit=>({unit,row:row.number,column:cell.column,reference:cell.sourceReference??null,labels:[...new Set(unit.hebrewUnderlay?.variants.flatMap(v=>v.labels)??[])]}))))??[];
   const owned=units.filter(u=>u.unit.readerWordId===sourceId(word)).map(u=>({...u,span:writtenSpan(u.unit,word)}));
   prepared.set(word.id,{word,ranges,study,units,owned});
  }
  const {ranges,study,units,owned}=prepared.get(word.id),range=ranges.find(s=>s.id===event.syllableId);
  if(!range||range.sourceHebrew!==event.syllable)throw Error('Score event syllable no longer matches its original Hebrew.');
  const matches=owned.filter(u=>u.span?.start===range.start&&u.span.end===range.end);
  const reason=matches.length?null:!study?'no-source-correspondence':!units.length?'no-style-transcription':!owned.length?'combined-source-form':owned.every(u=>!u.span)?'source-only-written-form':owned.some(u=>u.span&&u.span.start<range.end&&u.span.end>range.start)?'different-syllable-boundaries':'no-exact-unit';
  return {eventId:event.id,wordId:word.id,sourceWordId:sourceId(word),syllableId:range.id,hebrew:range.sourceHebrew,hebrewRange:{start:range.start,end:range.end},status:matches.length?'exact-written-span':'unlinked',reason,
   units:matches.map(({unit,row,column,reference,labels})=>({sourceUnitId:unit.id,text:unit.text,sourceRow:row,sourceColumn:column,sourceStress:unit.sourceStress,labels,sourceReference:reference,sourceMarks:structuredClone(unit.sourceMarks),hebrewClusterRanges:structuredClone(unit.hebrewClusterRanges),sharesNextConsonant:unit.hebrewUnderlay?.variants.some(v=>v.sharesNextConsonant)??false,sharesPreviousConsonant:unit.hebrewUnderlay?.variants.some(v=>v.sharesPreviousConsonant)??false}))};
 });
 return {format:'tropetrain-pronunciation-note-links-v1',revision:1,style,sourceCommit:library.sourceCommit,
  pronunciationSource:{project:'Phonetic MAM by Benjamin Denckla; Hebrew Wikisource / Miqra according to the Masorah',dataLicense:'CC-BY-SA-4.0',notice:'assets/pronunciation/NOTICE.txt'},
  method:'Equal half-open UTF16 ranges in the unchanged marked Hebrew, independently in each source text style. Shared consonant references are retained separately from written ownership. No syllable splitting, merging or pronunciation substitution.',
  review:'Structural text correspondence only. Score syllabification, pronunciation and musical underlay need independent review. No phoneme, vocal delivery or acoustic alignment is inferred.',
  phonemes:null,audioTimes:null,words:[...prepared.values()].map(({word:w})=>({wordId:w.id,sourceWordId:sourceId(w),hebrew:w.sourceHebrew})),
  counts:{notes:links.length,linkedNotes:links.filter(l=>l.status==='exact-written-span').length,unlinkedNotes:links.filter(l=>l.status==='unlinked').length},links};
}
export function notePronunciationText(link){return link?.status==='exact-written-span'?Object.hasOwn(link,'phonology')?link.phonology?.text??null:[...new Set(link.units.map(u=>u.text))].join(' / '):null;}
