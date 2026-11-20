import {Corpus,getCorpus,createAssignment,parseAssignment} from './library.js';

// The existing getCorpus() remains Torah-only. Whole-Torah searches, source
// counts, scroll layout and recorded references must not expand implicitly.
let promise;
export function getRepertoireCorpus(){
  return promise??=Promise.all([getCorpus(),import('./repertoire-data.js').then(m=>m.loadRepertoire())])
    .then(([torah,extra])=>new Corpus({
      manifest:{...torah.manifest,scope:'Torah, Prophets and five Megillot',
        sourceManifests:[torah.manifest,extra.manifest],books:[...torah.manifest.books,...extra.manifest.books]},
      books:[...torah.books,...extra.books]
    })).catch(error=>{promise=undefined;throw error;});
}

const torahIds=new Set(['gen','exo','lev','num','deu']);
export const READING_TYPES=Object.freeze([
  Object.freeze({id:'torah',label:'Torah',limit:100,repertoire:'torah'}),
  Object.freeze({id:'haftarah',label:'Haftarah',limit:5,repertoire:'prophets'}),
  Object.freeze({id:'megillah',label:'Megillah',limit:2,repertoire:'megillot'})
]);
const types=Object.freeze(Object.fromEntries(READING_TYPES.map(type=>[type.id,type])));
const bookRepertoire=book=>torahIds.has(book.id)?'torah':book.repertoire;
export const isTorahReading=ranges=>Array.isArray(ranges)&&ranges.length>0&&ranges.every(range=>torahIds.has(range.bookId));
export function booksForReadingType(readingType,corpus){
  const type=Object.hasOwn(types,readingType)?types[readingType]:null;
  if(!type)throw Error('Choose Torah, haftarah or Megillah as the assignment reading type.');
  return corpus.books.filter(book=>bookRepertoire(book)===type.repertoire);
}
export function readingTypeForRanges(ranges,corpus){
  if(!Array.isArray(ranges)||!ranges.length)throw Error('A reading needs at least one section.');
  const choices=new Set(ranges.map(range=>{
    const book=corpus.byId.get(range?.bookId);
    if(!book)throw Error('Choose a book in the available library.');
    return READING_TYPES.find(type=>type.repertoire===bookRepertoire(book))?.id;
  }));
  if(choices.size!==1||choices.has(undefined))throw Error('Each assignment must use one reading type. Open a separate assignment for another repertoire.');
  return [...choices][0];
}
export function reorderReadingSection(ranges,sectionId,direction){
  if(!Array.isArray(ranges)||![-1,1].includes(direction))throw Error('Choose a section and move it one place earlier or later.');
  const index=ranges.findIndex(range=>range.id===sectionId),target=index+direction;
  if(index<0||target<0||target>=ranges.length)throw Error('This section cannot move further in that direction.');
  const result=[...ranges];[result[index],result[target]]=[result[target],result[index]];return result;
}
export function validateReadingSections(readingType,sections,corpus){
  const type=Object.hasOwn(types,readingType)?types[readingType]:null;
  if(!type)throw Error('Choose Torah, haftarah or Megillah as the assignment reading type.');
  if(!Array.isArray(sections)||sections.length<1||sections.length>type.limit)throw Error(`${readingType} assignments need between 1 and ${type.limit} ordered sections.`);
  const ranges=sections.map((range,i)=>corpus.range(range,i));
  for(const range of ranges){
    const book=corpus.byId.get(range.bookId);
    const repertoire=bookRepertoire(book);
    if(repertoire!==type.repertoire)throw Error(`${book.name} is outside the ${readingType} assignment repertoire. Its text was not replaced.`);
  }
  // Includes the all-hidden and duplicate section ID guards. Section order and
  // separate occurrences are intentional, including repeats across books.
  return corpus.passage(ranges).ranges;
}

export function parseRepertoireAssignment(text,corpus){
  if(typeof text!=='string'||text.length>2_000_000)throw Error('Assignment file is too large.');
  let data;try{data=JSON.parse(text);}catch{throw Error('This file is not valid assignment JSON.');}
  if(data?.format==='tropetrain-assignment-v1'){
    const assignment=parseAssignment(text,corpus);
    validateReadingSections('torah',assignment.sections,corpus);
    return {...assignment,readingType:'torah'};
  }
  if(data?.format!=='tropetrain-assignment-v2')throw Error('Unsupported assignment format. Use a TropeTrain assignment export.');
  const sections=validateReadingSections(data.readingType,data.sections,corpus);
  // Reuse existing strict musical/display validation; unknown melody or
  // pronunciation IDs are refused instead of being silently substituted.
  const assignment=parseAssignment(JSON.stringify({...data,format:'tropetrain-assignment-v1',sections}),corpus);
  return {...assignment,format:'tropetrain-assignment-v2',readingType:data.readingType};
}

export function createRepertoireAssignment(title,readingType,sections,preferences,corpus){
  const ranges=validateReadingSections(readingType,sections,corpus);
  const assignment=createAssignment(title,ranges,preferences);
  assignment.format='tropetrain-assignment-v2';assignment.readingType=readingType;
  assignment.musicalPreferences.pronunciationId=preferences?.pronunciationId??null;
  return parseRepertoireAssignment(JSON.stringify(assignment),corpus);
}

// XML k/q runs describe written and preferred reading alternatives. They do
// not assert one-to-one word/syllable alignment. In particular, retain k-only
// and q-only runs, rather than dropping them from a written/reading view.
export function writtenReadingGroups(tokens){
  if(!Array.isArray(tokens))throw Error('Source tokens are required.');
  const groups=[];let pending=null;
  const flush=()=>{
    if(!pending)return;
    const {written,reading}=pending;
    groups.push({...pending,status:written.length?(reading.length?'ketiv-qere':'written-only'):'reading-only'});
    pending=null;
  };
  for(const token of tokens){
    if(token.kind==='w'){
      flush();groups.push({id:token.id,written:[token],reading:[token],status:'same'});
    }else if(token.kind==='k'){
      if(pending?.reading.length)flush();
      pending??={id:token.id,written:[],reading:[]};pending.written.push(token);
    }else if(token.kind==='q'){
      pending??={id:token.id,written:[],reading:[]};pending.reading.push(token);
    }else throw Error('Unknown source token kind; written/reading correspondence was not inferred.');
  }
  flush();return groups;
}
