import {loadPronunciationData} from './pronunciation-data.js';
import {loadPronunciationRepertoireBook} from './pronunciation-repertoire-data.js';
import {PRONUNCIATION_REPERTOIRE_SUMMARY} from './pronunciation-repertoire-summary.js';
import {loadPronunciationRepertoireUnderlayBook} from './pronunciation-repertoire-underlay-data.js';
import {PRONUNCIATION_REPERTOIRE_UNDERLAY} from './pronunciation-repertoire-underlay-summary.js';
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
 constructor(data,{underlay=null,underlayInputSha256,segments=null,repertoire=null}={}){
  if(data?.format!=='tropetrain-pronunciation-display-v1'||![1,2,3,4,5].includes(data.revision))throw Error('Unsupported pronunciation source revision.');
  this.sourceCommit=data.sourceCommit;this.groups=data.groups;this.byWord=new Map();
  this.repertoire=repertoire;this.repertoireBooks=new Map((repertoire?.books??[]).map(b=>[b.bookId,b]));this.bookLibraries=new Map();this.bookLoads=new Map();
  if(repertoire&&(typeof repertoire.loadBook!=='function'||this.repertoireBooks.size!==repertoire.books.length))throw Error('Invalid pronunciation source loader.');
  this.underlay=underlay?new PronunciationUnderlay(underlay,data.sourceCommit,underlayInputSha256):null;
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
 bookId(word){return (word?.sourceWordId??word?.id??'').split('-')[0];}
 canLoadBook(word){return this.repertoireBooks.has(this.bookId(word));}
 bookLoaded(word){return this.bookLibraries.has(this.bookId(word));}
 async loadBookFor(word){
  const bookId=this.bookId(word),expected=this.repertoireBooks.get(bookId);
  if(!expected)return false;
  if(this.bookLibraries.has(bookId))return true;
  if(this.bookLoads.has(bookId))return this.bookLoads.get(bookId);
  const loading=(async()=>{
   const [data,underlay]=await Promise.all([this.repertoire.loadBook(bookId),this.repertoire.loadUnderlay?.(bookId)??null]);
   if(data?.bookId!==bookId||data.sourceCommit!==this.sourceCommit||data.license!=='CC-BY-SA-4.0'||!Array.isArray(data.groups)||data.groups.length!==expected.groups||data.groups.some(g=>g.bookId!==bookId||!g.readerIds.every(id=>id.startsWith(bookId+'-'))))throw Error('This pronunciation book’s source identity changed.');
   if(this.repertoire.loadUnderlay){
    const checked=PRONUNCIATION_REPERTOIRE_UNDERLAY.books.find(b=>b.bookId===bookId);
    if(!checked||checked.inputSha256!==expected.packetSha256||underlay?.inputSha256!==checked.inputSha256||underlay.sourceCommit!==this.sourceCommit||underlay.computationSourceSha256!==PRONUNCIATION_REPERTOIRE_UNDERLAY.computationSourceSha256||Object.keys(underlay.groups??{}).length!==expected.groups)throw Error('This pronunciation book’s underlay source changed.');
   }
   const book=new PronunciationLibrary(data,{underlay,underlayInputSha256:expected.packetSha256});
   if(book.byWord.size!==expected.mappedWords)throw Error('This pronunciation book’s word correspondence changed.');
   this.bookLibraries.set(bookId,book);
   while(this.bookLibraries.size>8)this.bookLibraries.delete(this.bookLibraries.keys().next().value);
   return true;
  })();
  this.bookLoads.set(bookId,loading);
  try{return await loading;}finally{if(this.bookLoads.get(bookId)===loading)this.bookLoads.delete(bookId);}
 }
 repertoireAt(word){
  const bookId=this.bookId(word),book=this.bookLibraries.get(bookId);
  if(book){this.bookLibraries.delete(bookId);this.bookLibraries.set(bookId,book);}
  return book;
 }
 at(word){
  const extra=this.repertoireAt(word);if(extra)return extra.at(word);
  const hit=this.byWord.get(word?.sourceWordId??word?.id);
  if(!hit)return null;
  if(hit.group.readerHebrew[hit.index]!==word.sourceHebrew)throw Error('The Hebrew source changed; this pronunciation link needs review.');
  return hit.group;
 }
 study(word,style){
  const extra=this.repertoireAt(word);if(extra)return extra.study(word,style);
  const group=this.at(word);
  if(!group)return null;
  const study=sourcePronunciationStudy(group,{sourceCommit:this.sourceCommit,word,style});
  const aligned=this.underlay?this.underlay.apply(study):study;
  return this.segments?this.segments.apply(aligned):aligned;
 }
}
let promise;
export function getPronunciationLibrary(){return promise??=Promise.all([loadPronunciationData(),loadPronunciationUnderlayData(),loadPronunciationSegmentData()]).then(([data,underlay,segments])=>new PronunciationLibrary(data,{underlay,segments,repertoire:{books:PRONUNCIATION_REPERTOIRE_SUMMARY.books,loadBook:loadPronunciationRepertoireBook,loadUnderlay:loadPronunciationRepertoireUnderlayBook}}));}
