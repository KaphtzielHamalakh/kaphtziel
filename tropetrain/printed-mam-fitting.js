// Original personal display proposals. Never changes source notes, syllables or phones.
import {FIT_SOURCES,FIT_SOURCES_SHA256} from './printed-mam-fit-data.js';
export const FIT_DRAFT_SCHEMA='tropetrain-personal-printed-mam-fit-v1';
export const FIT_DRAFT_LIMIT=350000;
const copy=v=>structuredClone(v),canonicalValue=v=>Array.isArray(v)?v.map(canonicalValue):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonicalValue(v[k])])):v,equal=(a,b)=>JSON.stringify(canonicalValue(a))===JSON.stringify(canonicalValue(b));
const sourceWords=new Map(FIT_SOURCES.words.map(w=>[w.sourceWordId,w]));
const canonical=w=>w?.sourceWordId??w?.id;
const wordOrder=new Map(FIT_SOURCES.words.map((w,i)=>[w.sourceWordId,i]));
const origins=new Set(['manual','original-ordinal-proposal','original-whole-word-proposal']);
export const FIT_IDENTITY=Object.freeze({sourceRecord:'docs/PRINTED-MAM-FITTING-SOURCES.json',sourceSha256:FIT_SOURCES_SHA256,printedScoreId:FIT_SOURCES.printedScoreId,printedUnderlayId:FIT_SOURCES.printedUnderlayId,mamSourceCommit:FIT_SOURCES.mamSource.sourceCommit,sourceInputs:copy(FIT_SOURCES.sources),markedWords:FIT_SOURCES.words.map(w=>[w.sourceWordId,w.sourceHebrew])});
export const isFittingProfile=profile=>profile?.id===FIT_IDENTITY.printedScoreId;
const rootKeys=['schema','revision','source','bindings','acceptedMapping','phonemes','audioTimes','voice','review'];
const bindingKeys=['sourceWordId','printedStart','printedEnd','mamStart','mamEnd','origin','comment'];
function keys(value,expected,label){if(!value||typeof value!=='object'||Array.isArray(value)||!equal(Object.keys(value).sort(),[...expected].sort()))throw Error(label+' has unexpected or missing fields.');}
function integer(value,low,high,label){if(!Number.isInteger(value)||value<low||value>high)throw Error(label+' is outside the complete source units for this word.');}
function checkedBinding(b){
 keys(b,bindingKeys,'Fitting');const w=sourceWords.get(b.sourceWordId);if(!w)throw Error('This fitting word is outside the exact No268 source.');
 integer(b.printedStart,1,w.printedGroups.length,'First printed group');integer(b.printedEnd,b.printedStart,w.printedGroups.length,'Last printed group');integer(b.mamStart,1,w.mamUnits.length,'First MAM unit');integer(b.mamEnd,b.mamStart,w.mamUnits.length,'Last MAM unit');
 if(!origins.has(b.origin)||typeof b.comment!=='string'||b.comment.length>500)throw Error('Fitting origin or comment is invalid.');return w;
}
function ordered(bindings){return [...bindings].sort((a,b)=>wordOrder.get(a.sourceWordId)-wordOrder.get(b.sourceWordId)||a.printedStart-b.printedStart);}
export function blankFittingDraft(){return {schema:FIT_DRAFT_SCHEMA,revision:1,source:copy(FIT_IDENTITY),bindings:[],acceptedMapping:null,phonemes:null,audioTimes:null,voice:null,review:null};}
export function validateFittingDraft(draft){
 keys(draft,rootKeys,'Personal fitting draft');if(draft.schema!==FIT_DRAFT_SCHEMA||draft.revision!==1||!equal(draft.source,FIT_IDENTITY))throw Error('The fitting draft no longer matches the exact printed score, MAM sources and marked Hebrew. No source was rebound.');
 for(const k of ['acceptedMapping','phonemes','audioTimes','voice','review'])if(draft[k]!==null)throw Error('A personal proposal cannot certify source fitting, phonemes, sound times, voice or review.');
 if(!Array.isArray(draft.bindings)||draft.bindings.length>93)throw Error('The fitting draft has too many source bindings.');
 let previous=null;
 for(const b of ordered(draft.bindings)){checkedBinding(b);if(previous?.sourceWordId===b.sourceWordId&&(b.printedStart<=previous.printedEnd||b.mamStart<=previous.mamEnd))throw Error('Fittings must follow source order without overlapping printed groups or MAM spans. Combine a complete span in one fitting; gaps stay unassigned.');previous=b;}
 return draft;
}
export function parseFittingDraft(text){if(typeof text!=='string'||text.length>FIT_DRAFT_LIMIT)throw Error('Personal fitting JSON is too large.');let d;try{d=JSON.parse(text);}catch{throw Error('Personal fitting JSON is not valid JSON.');}validateFittingDraft(d);return copy(d);}
export function serializeFittingDraft(draft){validateFittingDraft(draft);return JSON.stringify(draft,null,2)+'\n';}
export function fittingWord(word){const w=sourceWords.get(canonical(word));return w&&w.sourceHebrew===word?.sourceHebrew?w:null;}
export function fitBinding(draft,sourceWordId,printedIndex){validateFittingDraft(draft);return draft.bindings.find(b=>b.sourceWordId===sourceWordId&&printedIndex>=b.printedStart&&printedIndex<=b.printedEnd)??null;}
export function saveFitting(draft,binding){
 validateFittingDraft(draft);checkedBinding(binding);const next=copy(draft);next.bindings=next.bindings.filter(b=>b.sourceWordId!==binding.sourceWordId||b.printedEnd<binding.printedStart||b.printedStart>binding.printedEnd);next.bindings.push(copy(binding));next.bindings=ordered(next.bindings);validateFittingDraft(next);return next;
}
export function clearWordFittings(draft,sourceWordId){validateFittingDraft(draft);if(!sourceWords.has(sourceWordId))throw Error('Choose a source word.');const next=copy(draft);next.bindings=next.bindings.filter(b=>b.sourceWordId!==sourceWordId);return next;}
export function fillBlankWordProposals(draft){
 validateFittingDraft(draft);const next=copy(draft),occupied=new Set(next.bindings.map(b=>b.sourceWordId));
 for(const w of sourceWords.values()){
  if(occupied.has(w.sourceWordId))continue;
  if(w.printedGroups.length===w.mamUnits.length){for(const u of w.printedGroups)next.bindings.push({sourceWordId:w.sourceWordId,printedStart:u.index,printedEnd:u.index,mamStart:u.index,mamEnd:u.index,origin:'original-ordinal-proposal',comment:''});}
  else next.bindings.push({sourceWordId:w.sourceWordId,printedStart:1,printedEnd:w.printedGroups.length,mamStart:1,mamEnd:w.mamUnits.length,origin:'original-whole-word-proposal',comment:''});
 }
 next.bindings=ordered(next.bindings);validateFittingDraft(next);return next;
}
export function fittingCoverage(draft){
 validateFittingDraft(draft);let printed=0,mam=0;const words=new Set();for(const b of draft.bindings){printed+=b.printedEnd-b.printedStart+1;mam+=b.mamEnd-b.mamStart+1;words.add(b.sourceWordId);}
 return {proposedPrintedGroups:printed,totalPrintedGroups:93,proposedMamUnits:mam,totalMamUnits:94,wordsWithProposals:words.size,totalWords:39,acceptedMappings:0};
}
export function fittingFollow(event,word,plan,draft,style){
 validateFittingDraft(draft);if(!['sephardic','ashkenazic'].includes(style))throw Error('Choose one of the existing MAM text styles.');
 if(event?.sourceProfile!==FIT_SOURCES.printedScoreId)return null;const w=fittingWord(word);if(!w||event.wordId!==word.id||event.sourceWordId!==w.sourceWordId)throw Error('The fitting no longer matches this exact marked Hebrew occurrence.');
 if(event.syllableId!==null||event.syllable!==null||event.phonemes!==null)throw Error('The source score must retain null accepted syllable and phoneme fitting.');
 if(event.sourcePrintedSyllableIndex===null)return {status:'untexted-source-note',eventId:event.id,wordId:word.id,units:[],phonemes:null,audioTimes:null,review:null};
 const group=w.printedGroups.find(g=>g.index===event.sourcePrintedSyllableIndex);if(!group?.noteIds.includes(event.sourceNoteId))throw Error('The event is not a member of its printed source group.');
 const b=fitBinding(draft,w.sourceWordId,group.index);if(!b)return {status:'no-personal-fitting',eventId:event.id,wordId:word.id,units:[],phonemes:null,audioTimes:null,review:null};
 const groups=w.printedGroups.filter(g=>g.index>=b.printedStart&&g.index<=b.printedEnd),ids=groups.flatMap(g=>g.noteIds),chosen=plan.filter(e=>e.wordId===word.id&&ids.includes(e.sourceNoteId));
 if(!equal(chosen.map(e=>e.sourceNoteId),ids))return {status:'incomplete-personal-span',eventId:event.id,wordId:word.id,sourceWordId:w.sourceWordId,binding:copy(b),units:[],individualNoteAllocation:null,phonemes:null,audioTimes:null,voice:null,review:null};
 for(const e of chosen){const g=groups.find(g=>g.noteIds.includes(e.sourceNoteId));if(e.sourceProfile!==FIT_SOURCES.printedScoreId||e.sourceWordId!==w.sourceWordId||e.sourcePrintedSyllableIndex!==g.index||e.syllableId!==null||e.syllable!==null||e.phonemes!==null)throw Error('The proposed span contains changed source events.');}
 const path=w.mamPaths.find(p=>p.style===style),units=path.units.slice(b.mamStart-1,b.mamEnd).map(u=>({...copy(u),text:u.sourceText})),first=w.mamUnits[b.mamStart-1],last=w.mamUnits[b.mamEnd-1];
 return {status:'personal-printed-fit',eventId:event.id,wordId:word.id,sourceWordId:w.sourceWordId,wordIds:[word.id],style,binding:copy(b),printedGroupIds:groups.map(g=>g.id),sourceNoteIds:ids,units,hebrew:word.sourceHebrew.slice(first.writtenRange.start,last.writtenRange.end),writtenRange:{start:first.writtenRange.start,end:last.writtenRange.end},sourceRow:path.sourceRow,sourceColumn:path.sourceColumn,sourceReference:copy(path.sourceReference),acceptedMapping:null,individualNoteAllocation:null,phonemes:null,audioTimes:null,voice:null,review:null};
}
export function fittingExport(draft,{enabled=false}={}){validateFittingDraft(draft);return {status:'unreviewed-personal-display-proposals',enabled,coverage:fittingCoverage(draft),draft:copy(draft),individualNoteAllocation:null,phonemes:null,audioTimes:null,voice:null,review:null};}
export {FIT_SOURCES};
