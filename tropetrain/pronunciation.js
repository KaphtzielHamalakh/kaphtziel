import {loadPronunciationData} from './pronunciation-data.js';
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
 constructor(data){
  if(data?.format!=='tropetrain-pronunciation-display-v1'||![1,2].includes(data.revision))throw Error('Unsupported pronunciation source revision.');
  this.sourceCommit=data.sourceCommit;this.groups=data.groups;this.byWord=new Map();
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
}
let promise;
export function getPronunciationLibrary(){return promise??=loadPronunciationData().then(data=>new PronunciationLibrary(data));}
