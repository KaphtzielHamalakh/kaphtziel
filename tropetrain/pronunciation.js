import {loadPronunciationData} from './pronunciation-data.js';
import {loadPronunciationUnderlayData} from './pronunciation-underlay-data.js';
import {PronunciationUnderlay} from './pronunciation-underlay.js';
import {sourcePronunciationStudy} from './pronunciation-structure.js';
import {loadPronunciationSegmentData} from './pronunciation-segment-data.js';
import {PronunciationSegments} from './pronunciation-segments.js';
export const PRONUNCIATION_STYLES=Object.freeze([
 {id:'sephardic',name:'Sephardic · Phonetic MAM text'},
 {id:'ashkenazic',name:'Ashkenazic · Phonetic MAM text'}
]);
export function pronunciationStyle(value){return PRONUNCIATION_STYLES.some(s=>s.id===value)?value:'sephardic';}
export function inlineSourceText(nodes){
 if(nodes===null)return '';
 return nodes.map(node=>typeof node==='string'?node:node.kind==='superscript-e'?'ᵉ':inlineSourceText(node.content)).join('');
}
export class PronunciationLibrary {
 constructor(data,{underlay=null,segments=null}={}){
  if(data?.format!=='tropetrain-pronunciation-display-v1'||![1,2,3].includes(data.revision))throw Error('Unsupported pronunciation source revision.');
  this.sourceCommit=data.sourceCommit;this.groups=data.groups;this.byWord=new Map();
  this.underlay=underlay?new PronunciationUnderlay(underlay,data.sourceCommit):null;
  if(segments&&!underlay)throw Error('Checked Hebrew underlay is required for pronunciation source rules.');
  this.segments=segments?new PronunciationSegments(segments,data.sourceCommit):null;
  for(const group of data.groups){
   if(group.readerIds.length!==group.readerHebrew.length||!group.rows.length)throw Error('Invalid pronunciation correspondence.');
   group.readerIds.forEach((id,index)=>{
    if(this.byWord.has(id))throw Error('Overlapping pronunciation correspondence.');
    this.byWord.set(id,{group,index});
   });
  }
 }
 at(word){
  const hit=this.byWord.get(word?.sourceWordId??word?.id);
  if(!hit)return null;
  if(hit.group.readerHebrew[hit.index]!==word.sourceHebrew)throw Error('The Hebrew source changed; this pronunciation link needs review.');
  return hit.group;
 }
 study(word,style){
  const group=this.at(word);
  if(!group)return null;
  const study=sourcePronunciationStudy(group,{sourceCommit:this.sourceCommit,word,style});
  const aligned=this.underlay?this.underlay.apply(study):study;
  return this.segments?this.segments.apply(aligned):aligned;
 }
}
let promise;
export function getPronunciationLibrary(){return promise??=Promise.all([loadPronunciationData(),loadPronunciationUnderlayData(),loadPronunciationSegmentData()]).then(([data,underlay,segments])=>new PronunciationLibrary(data,{underlay,segments}));}
