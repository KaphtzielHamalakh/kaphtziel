// Original personal display proposals, bound to No266 and one exact reading section.
// Source notes, Hebrew, MAM units, phones and sound times are never edited.
import {NO266_FIT_SOURCES as source,NO266_FIT_SOURCES_SHA256} from './no266-mam-fit-data.js';
const copy=v=>structuredClone(v),canonicalValue=v=>Array.isArray(v)?v.map(canonicalValue):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonicalValue(v[k])])):v,equal=(a,b)=>JSON.stringify(canonicalValue(a))===JSON.stringify(canonicalValue(b));
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const NO266_FIT_SOURCES=freeze(source),NO266_FIT_SCHEMA='tropetrain-no266-personal-mam-fit-v1',NO266_FIT_LIMIT=350000;
const sourceWords=new Map(source.words.map(w=>[w.sourceWordId,w])),wordOrder=new Map(source.words.map((w,i)=>[w.sourceWordId,i])),origins=new Set(['manual','original-ordinal-proposal','original-whole-word-proposal']);
export const NO266_FIT_IDENTITY=freeze({sourceRecord:'docs/IDELSOHN-NO266-MAM-PARTITIONS.json',sourceSha256:NO266_FIT_SOURCES_SHA256,printedScoreId:source.printedScoreId,printedGroupsId:source.printedGroupsId,mamSourceCommit:source.mamSource.sourceCommit,sourceInputs:copy(source.sources),markedWords:source.words.map(w=>[w.sourceWordId,w.sourceHebrew])});
export const isNo266FittingProfile=profile=>profile?.id===NO266_FIT_IDENTITY.printedScoreId;
const rootKeys=['schema','revision','source','context','bindings','acceptedMapping','phonemes','audioTimes','voice','review'],bindingKeys=['wordId','sourceWordId','printedStart','printedEnd','mamStart','mamEnd','origin','comment'];
function keys(v,expected,label){if(!v||typeof v!=='object'||Array.isArray(v)||!equal(Object.keys(v).sort(),[...expected].sort()))throw Error(label+' has unexpected or missing fields.');}
function identifier(v,label){if(typeof v!=='string'||!v.length||v.length>1024)throw Error(label+' is invalid.');}
function integer(v,low,high,label){if(!Number.isInteger(v)||v<low||v>high)throw Error(label+' is outside the complete source units for this occurrence.');}
export function no266FittingWord(word){const w=sourceWords.get(word?.sourceWordId??word?.id);return w?.sourceHebrew===word?.sourceHebrew?w:null;}
export function no266FittingOccurrenceId(word){const w=no266FittingWord(word);if(!w)throw Error('Choose an unchanged marked No266 occurrence.');identifier(word.sectionId,'Reading section');return `${w.sourceWordId}@${word.sectionId}`;}
export function validateNo266FittingContext(context){
 keys(context,['sectionId','occurrences'],'No266 fitting context');identifier(context.sectionId,'Reading section');
 if(!Array.isArray(context.occurrences)||!context.occurrences.length||context.occurrences.length>39)throw Error('Choose a section containing covered No266 words.');
 const ids=new Set();let previous=-1;
 for(const o of context.occurrences){keys(o,['wordId','sourceWordId','sourceHebrew'],'Word occurrence');if(typeof o.wordId!=='string'||o.wordId.length>2048)throw Error('Word occurrence is invalid.');const w=sourceWords.get(o.sourceWordId),order=wordOrder.get(o.sourceWordId);if(!w||o.wordId!==`${o.sourceWordId}@${context.sectionId}`||w.sourceHebrew!==o.sourceHebrew||ids.has(o.wordId)||order<=previous)throw Error('No266 context has changed words, marks, duplicate occurrences or source order.');ids.add(o.wordId);previous=order;}
 return context;
}
export function no266FittingContext(words,word,profile){
 if(!isNo266FittingProfile(profile)||!no266FittingWord(word))return null;
 if(!Array.isArray(words)||!words.some(w=>w.id===word.id&&w.sectionId===word.sectionId&&w.sourceHebrew===word.sourceHebrew&&(w.sourceWordId??w.id)===(word.sourceWordId??word.id)))throw Error('The selected No266 word is outside this reading occurrence.');
 const context={sectionId:word.sectionId,occurrences:words.filter(w=>w.sectionId===word.sectionId&&no266FittingWord(w)).map(w=>({wordId:no266FittingOccurrenceId(w),sourceWordId:w.sourceWordId??w.id,sourceHebrew:w.sourceHebrew}))};validateNo266FittingContext(context);return freeze(context);
}
export function no266FittingStorageKey(context){validateNo266FittingContext(context);return 'tropetrain-no266-personal-mam-fit-v1:'+JSON.stringify([NO266_FIT_IDENTITY.printedScoreId,context.sectionId,context.occurrences.map(o=>[o.wordId,o.sourceWordId,o.sourceHebrew])]);}
const occurrence=(context,wordId)=>context.occurrences.find(o=>o.wordId===wordId);
const contextWords=context=>context.occurrences.map(o=>({...o,source:sourceWords.get(o.sourceWordId)}));
function checkedBinding(b,context){
 keys(b,bindingKeys,'No266 fitting');const o=occurrence(context,b.wordId),w=sourceWords.get(b.sourceWordId);if(!o||!w||o.sourceWordId!==b.sourceWordId)throw Error('The fitting is outside this exact No266 section and occurrence.');
 integer(b.printedStart,1,w.printedGroups.length,'First printed group');integer(b.printedEnd,b.printedStart,w.printedGroups.length,'Last printed group');integer(b.mamStart,1,w.mamUnits.length,'First MAM unit');integer(b.mamEnd,b.mamStart,w.mamUnits.length,'Last MAM unit');
 if(!origins.has(b.origin)||typeof b.comment!=='string'||b.comment.length>500)throw Error('Fitting origin or comment is invalid.');return w;
}
function ordered(bindings,context){const order=new Map(context.occurrences.map((o,i)=>[o.wordId,i]));return [...bindings].sort((a,b)=>order.get(a.wordId)-order.get(b.wordId)||a.printedStart-b.printedStart);}
export function blankNo266FittingDraft(context){validateNo266FittingContext(context);return {schema:NO266_FIT_SCHEMA,revision:1,source:copy(NO266_FIT_IDENTITY),context:copy(context),bindings:[],acceptedMapping:null,phonemes:null,audioTimes:null,voice:null,review:null};}
export function validateNo266FittingDraft(draft,context){
 validateNo266FittingContext(context);keys(draft,rootKeys,'Personal No266 fitting draft');if(draft.schema!==NO266_FIT_SCHEMA||draft.revision!==1||!equal(draft.source,NO266_FIT_IDENTITY)||!equal(draft.context,context))throw Error('The fitting no longer matches the exact No266 source, section, occurrences and marked Hebrew. No source or reading was rebound.');
 for(const k of ['acceptedMapping','phonemes','audioTimes','voice','review'])if(draft[k]!==null)throw Error('A personal proposal cannot certify fitting, phonemes, sound times, voice or review.');
 const limit=contextWords(context).reduce((n,w)=>n+w.source.printedGroups.length,0);if(!Array.isArray(draft.bindings)||draft.bindings.length>limit)throw Error('The fitting draft has too many source bindings.');
 for(const b of draft.bindings)checkedBinding(b,context);let previous=null;
 for(const b of ordered(draft.bindings,context)){if(previous?.wordId===b.wordId&&(b.printedStart<=previous.printedEnd||b.mamStart<=previous.mamEnd))throw Error('Fittings must follow source order without overlapping printed groups or MAM spans. Combine a complete span; gaps stay unassigned.');previous=b;}return draft;
}
export function parseNo266FittingDraft(text,context){if(typeof text!=='string'||text.length>NO266_FIT_LIMIT)throw Error('Personal No266 fitting JSON is too large.');let d;try{d=JSON.parse(text);}catch{throw Error('Personal No266 fitting JSON is not valid JSON.');}validateNo266FittingDraft(d,context);return copy(d);}
export function serializeNo266FittingDraft(draft,context){validateNo266FittingDraft(draft,context);return JSON.stringify(draft,null,2)+'\n';}
export function no266FitBinding(draft,wordId,printedIndex,context){validateNo266FittingDraft(draft,context);return draft.bindings.find(b=>b.wordId===wordId&&printedIndex>=b.printedStart&&printedIndex<=b.printedEnd)??null;}
export function saveNo266Fitting(draft,binding,context){validateNo266FittingDraft(draft,context);checkedBinding(binding,context);const next=copy(draft);next.bindings=next.bindings.filter(b=>b.wordId!==binding.wordId||b.printedEnd<binding.printedStart||b.printedStart>binding.printedEnd);next.bindings.push(copy(binding));next.bindings=ordered(next.bindings,context);validateNo266FittingDraft(next,context);return next;}
export function clearNo266WordFittings(draft,wordId,context){validateNo266FittingDraft(draft,context);if(!occurrence(context,wordId))throw Error('Choose a source occurrence in this section.');const next=copy(draft);next.bindings=next.bindings.filter(b=>b.wordId!==wordId);return next;}
export function fillBlankNo266WordProposals(draft,context){
 validateNo266FittingDraft(draft,context);const next=copy(draft),occupied=new Set(next.bindings.map(b=>b.wordId));
 for(const w of contextWords(context)){if(occupied.has(w.wordId))continue;const base={wordId:w.wordId,sourceWordId:w.sourceWordId,comment:''};if(w.source.printedGroups.length===w.source.mamUnits.length)for(const g of w.source.printedGroups)next.bindings.push({...base,printedStart:g.index,printedEnd:g.index,mamStart:g.index,mamEnd:g.index,origin:'original-ordinal-proposal'});else next.bindings.push({...base,printedStart:1,printedEnd:w.source.printedGroups.length,mamStart:1,mamEnd:w.source.mamUnits.length,origin:'original-whole-word-proposal'});}
 next.bindings=ordered(next.bindings,context);validateNo266FittingDraft(next,context);return next;
}
export function no266FittingCoverage(draft,context){validateNo266FittingDraft(draft,context);let printed=0,mam=0;const words=new Set();for(const b of draft.bindings){printed+=b.printedEnd-b.printedStart+1;mam+=b.mamEnd-b.mamStart+1;words.add(b.wordId);}const rows=contextWords(context);return {proposedPrintedGroups:printed,totalPrintedGroups:rows.reduce((n,w)=>n+w.source.printedGroups.length,0),proposedMamUnits:mam,totalMamUnits:rows.reduce((n,w)=>n+w.source.mamUnits.length,0),wordsWithProposals:words.size,totalWords:rows.length,acceptedMappings:0};}
function checkedEvent(e,word,w,context){
 const o=occurrence(context,no266FittingOccurrenceId(word));
 if(e.sourceProfile!==source.printedScoreId||word.sectionId!==context.sectionId||o?.sourceWordId!==w.sourceWordId||o?.sourceHebrew!==word.sourceHebrew||e.wordId!==word.id||e.sourceWordId!==w.sourceWordId||e.sourceWordCorrespondence?.sourceHebrew!==word.sourceHebrew||e.sourceWordCorrespondence?.acceptedSyllableMapping!==null||e.sourceWordCorrespondence?.acceptedPhonemes!==null||e.sourceWordCorrespondence?.independentReview!==null||e.syllableId!==null||e.syllable!==null||e.phonemes!==null||e.independentReview!==null)throw Error('The fitting no longer matches this exact No266 source event and marked Hebrew occurrence.');
}
export function no266FittingFollow(event,word,plan,draft,context,style){
 validateNo266FittingDraft(draft,context);if(!['sephardic','ashkenazic'].includes(style))throw Error('Choose one of the existing MAM text styles.');if(event?.sourceProfile!==source.printedScoreId)return null;
 const w=no266FittingWord(word);if(!w)throw Error('Choose an unchanged marked No266 word.');checkedEvent(event,word,w,context);if(!Array.isArray(plan)||!plan.some(e=>e.id===event.id&&e.wordId===word.id&&e.sourceNoteId===event.sourceNoteId))throw Error('The followed event is outside this playback selection.');
 const empty={eventId:event.id,wordId:word.id,fittingWordId:no266FittingOccurrenceId(word),sourceProfile:source.printedScoreId,sourceWordId:w.sourceWordId,units:[],acceptedMapping:null,individualNoteAllocation:null,phonemes:null,audioTimes:null,voice:null,review:null};
 if(event.sourcePrintedSyllableIndex===null){if(!w.unassignedSourceNoteIds.includes(event.sourceNoteId)||!event.sourceNo266Parenthetical)throw Error('This source note has no verified unassigned-group identity.');return {...empty,status:'unassigned-source-group'};}
 const group=w.printedGroups.find(g=>g.index===event.sourcePrintedSyllableIndex);if(!group?.noteIds.includes(event.sourceNoteId)||event.sourcePrintedSyllableId!==`${word.id}-${w.printedWordId}-printed${group.index}`||event.sourcePrintedUnitLabel!=='printed source group')throw Error('The event is not a member of its No266 printed source group.');
 const b=no266FitBinding(draft,no266FittingOccurrenceId(word),group.index,context);if(!b)return {...empty,status:'no-personal-fitting'};
 const groups=w.printedGroups.filter(g=>g.index>=b.printedStart&&g.index<=b.printedEnd),ids=groups.flatMap(g=>g.noteIds),chosen=plan.filter(e=>e.wordId===word.id&&ids.includes(e.sourceNoteId));
 if(!equal(chosen.map(e=>e.sourceNoteId),ids))return {...empty,status:'incomplete-personal-span',binding:copy(b)};
 for(const e of chosen){checkedEvent(e,word,w,context);const g=groups.find(g=>g.noteIds.includes(e.sourceNoteId));if(e.sourcePrintedSyllableIndex!==g.index||e.sourcePrintedSyllableId!==`${word.id}-${w.printedWordId}-printed${g.index}`||e.sourcePrintedUnitLabel!=='printed source group')throw Error('The proposed span contains changed source-group events.');}
 const path=w.mamPaths.find(p=>p.style===style),units=path.units.slice(b.mamStart-1,b.mamEnd).map(u=>({...copy(u),text:u.sourceText})),first=w.mamUnits[b.mamStart-1],last=w.mamUnits[b.mamEnd-1];
 return {...empty,status:'personal-printed-fit',wordIds:[word.id],sectionId:context.sectionId,style,binding:copy(b),printedGroupIds:groups.map(g=>g.id),sourceNoteIds:ids,units,hebrew:word.sourceHebrew.slice(first.writtenRange.start,last.writtenRange.end),writtenRange:{start:first.writtenRange.start,end:last.writtenRange.end},sourceRow:path.sourceRow,sourceColumn:path.sourceColumn,sourceReference:copy(path.sourceReference)};
}
export function no266FittingExport(draft,context,{enabled=false}={}){validateNo266FittingDraft(draft,context);return {status:'unreviewed-personal-no266-display-proposals',sourceProfile:source.printedScoreId,enabled,coverage:no266FittingCoverage(draft,context),draft:copy(draft),acceptedMapping:null,individualNoteAllocation:null,phonemes:null,audioTimes:null,voice:null,review:null};}
