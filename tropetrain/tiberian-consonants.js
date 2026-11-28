import {TIBERIAN_CONSONANT_DATA as data} from './tiberian-consonant-data.js';
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const TIBERIAN_CONSONANT_SOURCE=freeze(data.source);
export const TIBERIAN_CONSONANT_PROFILE=freeze({id:'khan-2020-tiberian-consonant-inventory',label:'Tiberian consonant inventory · partial research',region:'tiberian-consonant-inventory',sourceId:data.source.id,status:'source-based-consonant-inventory-proposal',scopeBookIds:data.scopeBookIds,consonantsOnly:true,kinnorAccentId:null,playable:false,singingVoice:null,review:null});
export const TIBERIAN_CONSONANT_EVIDENCE=freeze(data);
const rules=new Map(data.rules.flatMap(r=>r.categoryIds.map(id=>[id,r])));
export const isTiberianConsonantProfile=profile=>profile?.id===TIBERIAN_CONSONANT_PROFILE.id;
export const tiberianSupportsWord=word=>/^(gen|exo|lev|num|deu)-\d+-\d+-\d+$/.test(word?.sourceWordId??word?.id??'');
function proposal(candidatePhonemes,rule,evidence,reason=null){return {status:candidatePhonemes===null?'unassigned':'proposed',candidatePhonemes,rule,evidence,reason,alternatives:null,phonemes:null,ipa:null,enginePhones:null,quantity:null,duration:null,noteIds:null,audioTimes:null,review:null};}
export function tiberianMissingSharedConsonant(){return proposal(null,'shared-consonant-counterpart-missing',{sourceId:data.source.id,printedPages:[608,609,610]},'A reciprocal source half is missing. No consonant, duplicate event, duration or fallback is invented.');}
export function tiberianConsonantCorrespondence(segment){
 if(segment.kind==='silent-letter'||segment.kind==='silent-vowel-sign')return proposal([],'source-silent-category',{sourceId:'phonetic-mam-source-categories',...data.categorySource},'The original source category is silent. This preserves source evidence, not independent approval of a Tiberian lexical reading.');
 const r=rules.get(segment.categoryId);
 if(r&&segment.kind==='consonant')return proposal([r.candidatePhoneme],'tiberian-consonant-phoneme-inventory',{sourceId:data.source.id,printedPages:r.printedPages.slice(),section:r.section},'Phoneme-column correspondence only. Source gemination and shared halves remain recorded; acoustic allophones, consonant quantity/duration, vowels and singing are unassigned.');
 return proposal(null,segment.categoryId==='ALEF_1MAPIQ'?'tiberian-special-alef-needs-comparison':'outside-tiberian-consonant-inventory',{sourceId:data.source.id,printedPages:[608,609,610]},segment.categoryId==='ALEF_1MAPIQ'?data.withheldConsonants[0].reason:'Vowels, vowel–consonant compounds and source diphthong constituents are outside this partial consonant inventory. No sound or absence is substituted.');
}
