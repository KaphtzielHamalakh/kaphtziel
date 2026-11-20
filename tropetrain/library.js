import {loadCorpus} from './library-data.js';
import {PRINTED_SCORE} from './printed-score.js';
import {preserveRelatedSource} from './related-source.js';
import {preserveNumberingMapping,rangeNeedsNumbering} from './torah-numbering.js';

export const defaultRange=Object.freeze({id:'opening',bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:3},label:'Opening verses'});
const integer=n=>(typeof n==='number'||(typeof n==='string'&&/^\d+$/.test(n)))&&Number.isInteger(Number(n))&&Number(n)>0;
const compare=(a,b)=>a.chapter-b.chapter||a.verse-b.verse;
export class Corpus {
  constructor({manifest,books}){this.manifest=manifest;this.books=books;this.byId=new Map(books.map(b=>[b.id,b]));}
  range(input,index=0){
    if(!input||typeof input!=='object')throw Error('A passage range is required.');
    const book=this.byId.get(input.bookId);if(!book)throw Error('Choose a book in the available library.');
    const points={};
    for(const key of ['start','end']){
      const p=input[key];if(!p||!integer(p.chapter)||!integer(p.verse))throw Error('Chapter and verse must be positive whole numbers.');
      const chapter=Number(p.chapter),verse=Number(p.verse);
      if(!book.chapters[chapter-1]?.verses[verse-1])throw Error(`${book.name} ${chapter}:${verse} does not exist in this edition.`);
      points[key]={chapter,verse};
    }
    if(compare(points.start,points.end)>0)throw Error('The end of a section must follow its start.');
    const range={id:typeof input.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(input.id)?input.id:`section-${index+1}`,
      bookId:book.id,start:points.start,end:points.end,label:typeof input.label==='string'?input.label.slice(0,120):`Section ${index+1}`,hidden:input.hidden===true};
    const source=input.divisionSource;
    if(source!==undefined){
      if(!['gen','exo','lev','num','deu'].includes(book.id)||input.relatedSource!==undefined)throw Error('Torah aliyah provenance cannot be attached to another repertoire or combined with a related-reading source claim.');
      if(source?.provider!=='Hebcal.com'||!/^https:\/\/www\.hebcal\.com\/leyning\?[^\s]{1,300}$/.test(source.url)||!/^[a-f0-9]{64}$/.test(source.sha256)||!/^\d{4}-\d{2}-\d{2}$/.test(source.serviceDate)||!['Diaspora','Israel'].includes(source.region)||!['fullkriyah','triennial','weekday'].includes(source.cycle)||!/^([1-9]|M)$/.test(source.aliyah)||typeof source.retrieved!=='string'||source.retrieved.length>40)throw Error('This section has invalid calendar-source metadata.');
      range.divisionSource=Object.fromEntries(['provider','url','sha256','retrieved','serviceDate','region','cycle','aliyah'].map(key=>[key,source[key]]));
      if(source.referenceMapping!==undefined)range.divisionSource.referenceMapping=preserveNumberingMapping(source.referenceMapping,range,this);
      else if(rangeNeedsNumbering(range))throw Error('This saved calendar section has ambiguous source/UXLC numbering. Reopen it from the current calendar source; no boundaries were substituted.');
    }
    if(input.relatedSource!==undefined)range.relatedSource=preserveRelatedSource(input.relatedSource,range,this);
    return range;
  }
  describe(range){
    const b=this.byId.get(range.bookId),a=range.start,z=range.end;
    if(compare(a,z)===0)return `${b.name} ${a.chapter}:${a.verse}`;
    return `${b.name} ${a.chapter}:${a.verse}–${a.chapter===z.chapter?'':z.chapter+':'}${z.verse}`;
  }
  passage(inputs){
    if(!Array.isArray(inputs)||!inputs.length||inputs.length>100)throw Error('A reading needs between 1 and 100 sections.');
    const ranges=inputs.map((r,i)=>this.range(r,i));
    if(new Set(ranges.map(r=>r.id)).size!==ranges.length)throw Error('Section identifiers must be unique.');
    const verses=[],sourceIds=new Set(),repeatedIds=new Set();
    for(const range of ranges.filter(r=>!r.hidden)){
      const book=this.byId.get(range.bookId);
      for(const chapter of book.chapters){
        if(chapter.number<range.start.chapter||chapter.number>range.end.chapter)continue;
        for(const verse of chapter.verses){
          const point={chapter:chapter.number,verse:verse.number};
          if(compare(point,range.start)<0||compare(point,range.end)>0)continue;
          let previousKetiv=[],qereActive=false;
          const reading=[];
          for(const token of verse.tokens){
            if(token.kind==='k'){if(qereActive)previousKetiv=[];qereActive=false;previousKetiv.push(token);continue;}
            if(!/[א-ת]/u.test(token.sourceHebrew))continue;
            const word={...token,sourceWordId:token.id,ordinal:reading.length+1,
              ...(token.kind==='q'?{writtenVariants:previousKetiv}:{}),
              bookId:book.id,bookName:book.name,chapter:chapter.number,verse:verse.number,
              sectionId:range.id,reference:`${book.name} ${chapter.number}:${verse.number}`};
            if(sourceIds.has(token.id))repeatedIds.add(token.id);sourceIds.add(token.id);
            reading.push(word);qereActive=token.kind==='q';if(!qereActive)previousKetiv=[];
          }
          verses.push({id:`${book.id}-${chapter.number}-${verse.number}@${range.id}`,number:verse.number,
            chapter:chapter.number,bookId:book.id,bookName:book.name,
            reference:`${book.name} ${chapter.number}:${verse.number}`,sectionId:range.id,sectionLabel:range.label,
            words:reading,sourceTokens:verse.tokens,markers:verse.markers});
        }
      }
    }
    if(!verses.length)throw Error('Show at least one section to practice.');
    for(const verse of verses)for(const w of verse.words)if(repeatedIds.has(w.sourceWordId))w.id=`${w.sourceWordId}@${w.sectionId}`;
    return {edition:this.manifest.edition,source:'https://www.tanach.us/',terms:this.manifest.license,
      sourceBooks:[...new Set(ranges.map(r=>r.bookId))].map(id=>this.manifest.books.find(b=>b.id===id)),
      title:ranges.length===1?this.describe(ranges[0]):`${ranges.length} assigned sections`,ranges,verses};
  }
}
let promise;
export function getCorpus(){return promise??=loadCorpus().then(data=>new Corpus(data));}

export function parseAssignment(text,corpus){
  if(typeof text!=='string'||text.length>2_000_000)throw Error('Assignment file is too large.');
  let data;try{data=JSON.parse(text);}catch{throw Error('This file is not valid assignment JSON.');}
  if(data?.format!=='tropetrain-assignment-v1')throw Error('Unsupported assignment format. Use a TropeTrain assignment export.');
  const passage=corpus.passage(data.sections);
  const melodyId=data.musicalPreferences?.melodyId??'original-demo-01';
  const pronunciationId=data.musicalPreferences?.pronunciationId??null;
  if(!['original-demo-01',PRINTED_SCORE.id].includes(melodyId)||pronunciationId!==null)throw Error('This assignment requests a melody or pronunciation that is not yet implemented. Its settings were not replaced.');
  return {format:data.format,id:typeof data.id==='string'?data.id.slice(0,100):'imported',
    title:typeof data.title==='string'?data.title.slice(0,120):'Imported assignment',sections:passage.ranges,
    musicalPreferences:{melodyId,pronunciationId},
    displayPreferences:{view:['pointed','consonantal','parallel'].includes(data.displayPreferences?.view)?data.displayPreferences.view:'pointed',groups:data.displayPreferences?.groups!==false,signClasses:data.displayPreferences?.signClasses===true,scrollLayout:data.displayPreferences?.scrollLayout===true}};
}
export function createAssignment(title,sections,displayPreferences={}){
  return {format:'tropetrain-assignment-v1',id:globalThis.crypto?.randomUUID?.()||`assignment-${Date.now()}`,
    title:(String(title).trim()||'Untitled assignment').slice(0,120),sections,
    musicalPreferences:{melodyId:displayPreferences.melodyId??'original-demo-01',pronunciationId:null},
    displayPreferences:{view:displayPreferences.view||'pointed',groups:displayPreferences.groups!==false,signClasses:displayPreferences.signClasses===true,scrollLayout:displayPreferences.scrollLayout===true}};
}
