// Literal published text, not a pronunciation generator or an acoustic alignment.
import {KHAN_PRONUNCIATION as source} from './khan-pronunciation-data.js';
import {PHONOLOGY_PROFILES} from './pronunciation-phonology.js';
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const KHAN_PRONUNCIATION=freeze(source);
export const READER_PRONUNCIATION_SOURCES=freeze([
 {id:'mam',name:'Phonetic MAM · selected text style',kind:'mam'},
 ...source.styles.map(s=>({id:'khan-'+s.id,name:s.label+' · Genesis1:1–13',kind:'published-word',reading:s.id})),
 ...PHONOLOGY_PROFILES.map(p=>({id:p.id,name:p.label+' · phonemic text',kind:'phonemic-research',profileId:p.id}))
]);
export function readerPronunciationSource(id){const s=READER_PRONUNCIATION_SOURCES.find(s=>s.id===id);if(!s)throw Error('Unknown reader pronunciation source; no replacement selected.');return s;}
const words=new Map();
for(const verse of source.verses)for(const token of verse.columns[0].tokens)words.set(token.sourceWordId,{verse,token});
export function khanWordEvidence(word,reading){
 if(!source.styles.some(s=>s.id===reading))throw Error('Unknown published Tiberian reading; no other reading substituted.');
 if(!word||typeof word.id!=='string'||typeof word.sourceHebrew!=='string')throw Error('Choose an unchanged marked reader word.');
 const sourceWordId=word.sourceWordId??word.id,hit=words.get(sourceWordId);
 const result={schema:'tropetrain-published-pronunciation-word-v1',wordId:word.id,sourceWordId,hebrew:word.sourceHebrew,reading,status:'no-source-correspondence',sourceId:source.id,source:source.source,entries:[],syllableRanges:null,phonemes:null,noteIds:null,audioTimes:null,review:null,newSingingVoice:null};
 if(!hit)return result;
 if(hit.token.readerHebrew!==word.sourceHebrew)throw Error('Marked Hebrew changed; the published word link needs review.');
 const reference=hit.verse.readings[reading],column=hit.verse.columns.find(c=>c.column===reference.column),token=column?.tokens.find(t=>t.sourceWordId===sourceWordId);
 if(!token||token.readerHebrew!==word.sourceHebrew||column.text.slice(token.start,token.end)!==token.text)throw Error('Published transcription word or exact source range changed.');
 return {...result,status:'word-linked',entries:[{kind:'published-phonetic-word',sourceCellId:column.id,sourceRow:hit.verse.verse,sourceColumn:column.column,
  sourceReference:reference.basis==='explicit-common-reading-per-source-p614'?{column:1,basis:reference.basis}:null,
  sourceForm:false,labels:[],start:token.start,end:token.end,text:token.text,printedPage:column.printedPage,footnotes:token.footnotes,
  sourceMarkedHebrew:null,sourceMarkEquivalence:null,parts:[{sourceUnitId:column.id+'-'+sourceWordId+'-word',text:token.text,join:'',sourceStress:false,sourceMarks:[],hebrewClusterRanges:null,syllableRanges:null}]}]};
}
export function khanVerseForWord(word){
 const hit=words.get(word?.sourceWordId??word?.id);if(!hit)return null;
 if(hit.token.readerHebrew!==word.sourceHebrew)throw Error('Marked Hebrew changed; the published verse link needs review.');
 return hit.verse;
}
