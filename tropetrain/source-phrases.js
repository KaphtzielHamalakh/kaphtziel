import {loadSourcePhrasePacket} from './source-phrase-data.js';
import {SOURCE_PHRASE_DATA} from './source-phrase-summary.js';
export const SOURCE_PHRASE_COMMIT='db6c5c9b46b8f39346f10915ddb1a70dcd429901';
const bookIds=['gen','exo','lev','num','deu'];
const reasons={1:'The marked source verse differs from this edition. Its phrase boundaries are withheld.',2:'The source and reader divide the verse into different numbers of words. Its phrase boundaries are withheld.',3:'The source has no matching verse.',4:'The source structure could not be validated. No replacement hierarchy is inferred.'};
const isReading=w=>['w','q'].includes(w.kind)&&/[א-ת]/u.test(w.sourceHebrew);
const copy=x=>structuredClone(x);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
async function sha256(value){
 if(!globalThis.crypto?.subtle)throw Error('Source phrase verification requires Web Crypto.');
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));
 return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function validateRows(rows,count,book){
 if(!Array.isArray(rows)||!rows.length||rows.length>count)throw Error('Incomplete source phrase endpoints.');
 let end=-1;const seen=new Set(),prefixes=new Set();
 for(const row of rows){
  if(!Array.isArray(row)||row.length!==3)throw Error('Invalid source phrase endpoint.');
  const [i,path,id]=row,parts=typeof path==='string'?path.split('.'):[];
  if(!Number.isInteger(i)||i<=end||i>=count||!/^([0-3])(?:\.[0-3]){0,7}$/.test(path)||seen.has(path)||typeof id!=='string'||!new RegExp('^0'+(bookIds.indexOf(book)+1)+'[A-Za-z0-9]{3}$').test(id))throw Error('Source phrase order, path or identity changed.');
  end=i;seen.add(path);for(let n=1;n<=parts.length;n++)prefixes.add(parts.slice(0,n).join('.'));
 }
 if(end!==count-1||rows.at(-1)[1]!=='0')throw Error('The source phrase hierarchy does not end at the complete verse.');
 for(const prefix of prefixes){
  const indices=rows.map((r,i)=>r[1]===prefix||r[1].startsWith(prefix+'.')?i:-1).filter(i=>i>=0);
  if(indices.some((n,i)=>n!==indices[0]+i))throw Error('Source phrase paths cross.');
  const exact=rows.findIndex(r=>r[1]===prefix);if(exact>=0&&exact!==indices.at(-1))throw Error('Source phrase terminal precedes its subdivisions.');
 }
}
function groupsFromRows(rows,count){
 let start=0;const leaves=rows.map(([end,path,sourceWordId],i)=>{const leaf={kind:'source-phrase',path,start,end,sourceEndWordId:sourceWordId,sourceBoundaryCode:path,leaf:i};start=end+1;return leaf;});
 const groups=[...leaves],prefixes=new Set();
 for(const {path}of leaves){const parts=path.split('.');for(let n=1;n<=parts.length;n++)prefixes.add(parts.slice(0,n).join('.'));}
 for(const prefix of prefixes){const selected=leaves.filter(l=>l.path===prefix||l.path.startsWith(prefix+'.'));if(selected.length>1)groups.push({kind:'source-branch',path:prefix,start:selected[0].start,end:selected.at(-1).end,sourceEndWordId:selected.at(-1).sourceEndWordId,sourceBoundaryCode:selected.at(-1).path});}
 groups.push({kind:'source-verse',path:null,start:0,end:count-1,sourceEndWordId:leaves.at(-1).sourceEndWordId,sourceBoundaryCode:'0'});
 const ranges=new Map();for(const group of groups){const key=group.start+':'+group.end,old=ranges.get(key);if(!old||group.kind==='source-verse')ranges.set(key,group);}
 return [...ranges.values()].sort((a,b)=>(a.end-a.start)-(b.end-b.start)||a.start-b.start);
}
export async function createSourcePhraseLibrary(corpus,packet){
 if(packet?.schema!=='tropetrain-source-phrases-v1'||packet.revision!==1||packet.source?.commit!==SOURCE_PHRASE_COMMIT||packet.source.license!=='CC-BY-4.0'||packet.source.musicalRealization!==null||packet.source.pronunciation!==null||packet.source.review!==null)throw Error('Unsupported source phrase provenance.');
 if(await sha256(packet)!==SOURCE_PHRASE_DATA.packetJsonSha256)throw Error('The pinned source phrase packet changed.');
 const canonical=new Map(),wordToVerse=new Map();let count=0;
 for(const bookId of bookIds){
  const book=corpus.byId?.get(bookId);if(!book)throw Error('Source phrase verification requires the complete Torah corpus.');
  const rows=book.chapters.flatMap(c=>c.verses.map(v=>[`${bookId}-${c.number}-${v.number}`,v.tokens.filter(isReading).map(w=>[w.id,w.sourceHebrew])]));
  if(await sha256(rows)!==packet.readerFingerprints?.[bookId])throw Error('The unchanged Torah text does not match the source phrase comparison.');
  for(const [key,words]of rows){
   const record=packet.records?.[key];if(!Array.isArray(record)||record.length!==3||!Number.isInteger(record[0])||record[0]<0||record[0]>4||record[1]!==words.length)throw Error('Source phrase verse correspondence changed.');
   if(record[0]===0)validateRows(record[2],words.length,bookId);else if(!Number.isInteger(record[2])||record[2]<0)throw Error('Invalid withheld source phrase record.');
   canonical.set(key,{words:copy(words),status:record[0],rows:record[0]===0?copy(record[2]):null,bookId,chapter:Number(key.split('-')[1]),verse:Number(key.split('-')[2])});for(const [id]of words)wordToVerse.set(id,key);count++;
  }
 }
 if(count!==5853||Object.keys(packet.records).length!==count)throw Error('Incomplete source phrase verse inventory.');
 const source=copy(packet.source),fingerprints=copy(packet.readerFingerprints);
 function forWord(words,cursor){
  const target=words?.[cursor];if(!target||target.index!==cursor)return {status:'unavailable',reason:'Choose a word in the current reading.',groups:[]};
  const key=wordToVerse.get(target.sourceWordId??target.id),record=canonical.get(key);
  if(!record)return {status:'unavailable',reason:'Source phrase correspondence is currently checked for Torah only.',groups:[]};
  if(!record)return {status:'unavailable',reason:'The source has no checked verse correspondence.',groups:[]};
  if(typeof target.verseKey!=='string')return {status:'unavailable',reason:'The current verse occurrence is unavailable.',groups:[]};
  const current=words.filter(w=>w.verseKey===target.verseKey),first=current[0]?.index;
  if(current.length!==record.words.length||new Set(current.map(w=>w.id)).size!==current.length||current.some((w,i)=>w.index!==first+i||(w.bookId??record.bookId)!==record.bookId||w.chapter!==record.chapter||w.verse!==record.verse||w.sectionId!==target.sectionId||w.verseIndex!==target.verseIndex||w.ordinal!==i+1||typeof w.id!=='string'||(w.sourceWordId??w.id)!==record.words[i][0]||w.sourceHebrew!==record.words[i][1]))return {status:'unavailable',reason:'A complete unchanged verse occurrence is required. Clipped or changed words are withheld.',groups:[]};
  if(record.status!==0)return {status:'unavailable',reason:reasons[record.status],reasonCode:record.status,verse:key,groups:[]};
  const offset=cursor-first;
  const groups=groupsFromRows(record.rows,current.length).filter(g=>g.start<=offset&&offset<=g.end).map(g=>{
   const selected=current.slice(g.start,g.end+1);return {...g,id:`${target.verseKey}:oshb:${g.kind}:${g.path??'verse'}`,verse:key,verseKey:target.verseKey,
    startIndex:first+g.start,endIndex:first+g.end,wordIds:selected.map(w=>w.id),sourceWordIds:selected.map(w=>w.sourceWordId??w.id),hebrew:selected.map(w=>w.sourceHebrew),
    source:copy(source),readerFingerprint:fingerprints[record.bookId],melody:null,pronunciation:null,phonemes:null,audioTimes:null,review:null};
  });
  return {status:'available',verse:key,groups,source:copy(source)};
 }
 return Object.freeze({source:copy(source),forWord,matchSelection(words,start,end){
  if(!Number.isInteger(start)||!Number.isInteger(end)||start>end)return null;
  return forWord(words,start).groups.find(g=>g.startIndex===start&&g.endIndex===end)??null;
 },verifySelection(words,selection){
  if(!selection||!Number.isInteger(selection.startIndex)||!Number.isInteger(selection.endIndex))throw Error('Choose a current source phrase.');
  const current=forWord(words,selection.startIndex).groups.find(g=>g.id===selection.id&&g.startIndex===selection.startIndex&&g.endIndex===selection.endIndex);
  if(!current||!same(current,selection))throw Error('The source phrase or reading occurrence changed. Select it again.');return current;
 }});
}
export async function getSourcePhraseLibrary(corpus){return createSourcePhraseLibrary(corpus,await loadSourcePhrasePacket());}
