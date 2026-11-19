import {analyzeSourceSigns,SEARCH_SIGNS} from './accents.js';

export const UNMARKED=Object.freeze({id:'unmarked',name:'Unmarked source words',char:null});
export const SIGN_QUERIES=Object.freeze([...SEARCH_SIGNS,UNMARKED]);
const query=id=>{const q=SIGN_QUERIES.find(s=>s.id===id);if(!q)throw Error('Choose a source sign from the list.');return q;};
function occurrences(analysis,id){
  if(id==='unmarked')return !analysis.signs.length&&!analysis.marks.some(s=>['maqaf','meteg','silluq','sof-pasuq'].includes(s.id))?1:0;
  return [...analysis.signs,...analysis.marks].filter(s=>s.id===id).length;
}
export function findSignsInReading(words,id){
  query(id);return words.flatMap((word,wordIndex)=>{
    const count=occurrences(word.signAnalysis??analyzeSourceSigns(word.sourceHebrew),id);
    return count?[{word,wordIndex,occurrenceId:word.id,sourceWordId:word.sourceWordId??word.id,count}]:[];
  });
}
const caches=new WeakMap();
export async function findSignsInCorpus(corpus,id){
  const q=query(id);let cache=caches.get(corpus);if(!cache){cache=new Map();caches.set(corpus,cache);}
  if(cache.has(id))return cache.get(id);
  const result=[];
  for(const book of corpus.books){
    for(const chapter of book.chapters)for(const verse of chapter.verses){
      let ordinal=0;
      for(const token of verse.tokens){
        if(token.kind==='k'||!/[א-ת]/u.test(token.sourceHebrew))continue;ordinal++;
        if(q.char&&!token.sourceHebrew.includes(q.char))continue;
        const count=occurrences(analyzeSourceSigns(token.sourceHebrew),id);if(!count)continue;
        const word={...token,sourceWordId:token.id,bookId:book.id,bookName:book.name,chapter:chapter.number,verse:verse.number,ordinal,
          reference:`${book.name} ${chapter.number}:${verse.number}`};
        result.push({word,sourceWordId:token.id,count});
      }
    }
    // Yield between books; only queries actually requested by the user are
    // cached, and old queries are evicted so a search cannot grow unbounded.
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(id,result);return result;
}
