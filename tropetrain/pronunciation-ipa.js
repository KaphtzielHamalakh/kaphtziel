// Original display/projection code CC0. Separate source-document facts GPL3.
import {SOURCE_IPA_PROPOSAL as data} from './pronunciation-ipa-data.js';
import {PRONUNCIATION_STYLES} from './pronunciation.js';
if(data.schema!=='tropetrain-source-ipa-proposal-v1'||data.revision!==1||data.parameterizedByTextStyle!==false||data.sourceGitBlob!=='ad3d3c368f5197644ef23b3eb92e1ada73d5be58'||data.catalog.length!==87||new Set(data.catalog.map(x=>x.categoryId)).size!==87)throw Error('Source IPA proposal needs review.');
const categories=new Map(data.catalog.map(x=>[x.categoryId,x]));
export const IPA_PROPOSAL_SOURCE=Object.freeze({source:data.source,commit:data.sourceCommit,sourceGitBlob:data.sourceGitBlob,sourceSha256:data.sourceSha256,projectionLicense:data.projectionLicense,parameterizedByTextStyle:false,counts:data.counts});
export function ipaFragment(segment){
 const row=categories.get(segment?.categoryId);
 if(!row||row.label!==segment.label||row.kind!==segment.kind||!['whole','first-half-shared','second-half-shared'].includes(segment.part)||segment.part!=='whole'&&!row.geminate)throw Error('Source IPA category or shared part changed.');
 const value=segment.part==='whole'?row.ipa:row.sharedHalfIpa;
 return {sourceSegmentId:segment.id,categoryId:row.categoryId,label:row.label,part:segment.part,sourceWholeIpa:row.ipa,proposedFragment:value,status:value===null?'withheld-shared-half':'source-proposal',sourceLine:row.sourceLine,sourceComment:row.sourceComment,questioned:row.questioned,sharedWithUnitId:segment.sharedWithUnitId,individualHebrewRange:null,phonemes:null,noteIds:null,audioTimes:null};
}
export function sourceIpaEvidence(study,word,style){
 if(!PRONUNCIATION_STYLES.some(x=>x.id===style))throw Error('Unsupported source transcription style.');
 const sourceWordId=word.sourceWordId??word.id,index=study?.readerIds.indexOf(sourceWordId);
 if(!study?.sourceSegments||study.sourceCommit!==data.sourceCommit||index<0||study.readerHebrew[index]!==word.sourceHebrew)throw Error('The marked Hebrew or source category evidence changed.');
 const units=[];
 for(const row of study.rows)for(const cell of row.styles[style])for(const unit of cell.units){
  if(unit.readerWordId!==sourceWordId&&unit.readerWordId!==null)continue;
  for(const variant of unit.sourceSegments.variants)units.push({sourceUnitId:unit.id,ownerWordId:unit.readerWordId,occurrenceId:unit.readerWordId===sourceWordId?word.id:null,ownership:unit.readerWordId===null?'source-group-shared':'source-word',sourceRow:row.number,sourceColumn:cell.column,hebrewColumn:variant.hebrewColumn,sourceText:unit.text,sourceStress:unit.sourceStress,sourceLabels:structuredClone(variant.sourceLabels),sourceHebrew:structuredClone(variant.sourceHebrew),readerRanges:structuredClone(variant.readerRanges??null),fragments:variant.segments.map(ipaFragment)});
 }
 const fragments=units.flatMap(u=>u.fragments);
 return {schema:'tropetrain-word-ipa-proposal-v1',revision:1,wordId:word.id,sourceWordId,hebrew:word.sourceHebrew,selectedTranscriptionStyle:style,ipaParameterizedByTextStyle:false,source:IPA_PROPOSAL_SOURCE,displayDataLicense:'CC-BY-SA-4.0',sourceProposalLicense:'GPL-3.0-only',phonologicalReview:null,acousticReview:null,phonemes:null,musicalNotes:null,audioTimes:null,
  limits:'One literal source IPA proposal, not an IPA transcription of the selected Sephardic/Ashkenazic text style, a historical Kinnor grammar or a singing voice. Source uncertainties remain explicit. No IPA is allocated to a shared half unless the source value is literally doubled; no new Hebrew ranges, phonemes, note allocation or sound times.',counts:{units:units.length,fragments:fragments.length,questioned:fragments.filter(x=>x.questioned).length,withheldSharedHalves:fragments.filter(x=>x.proposedFragment===null).length},units};
}
export function appendIpaProposal(parent,segments){
 const fragments=segments.map(ipaFragment),details=document.createElement('details');details.className='ipa-proposal';
 const summary=document.createElement('summary');summary.textContent='Source IPA proposal · '+fragments.map(f=>f.proposedFragment===null?'[withheld shared half]':f.proposedFragment||'∅').join(' · ');details.append(summary);
 const intro=document.createElement('p');intro.textContent='This is one source proposal, independent of your transcription text choice. It does not select a voice. Source questions remain unresolved; ∅ means the source table has an empty value.';details.append(intro);
 const list=document.createElement('dl');
 for(const f of fragments){const term=document.createElement('dt');term.textContent=f.label;const value=document.createElement('dd');value.textContent=f.proposedFragment===null?`Shared half withheld; the source lists ${f.sourceWholeIpa} for the whole geminate without defining a half.`:f.proposedFragment||'∅ · empty source value';if(f.sourceComment){const note=document.createElement('small');note.textContent='Source note: '+f.sourceComment;value.append(note);}term.dataset.category=f.categoryId;list.append(term,value);}
 details.append(list);parent.append(details);
}
