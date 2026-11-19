import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {getCorpus} from '../library.js';
import {ACCENT_CATALOG,analyzeSourceSigns,SIGN_ANALYSIS} from '../accents.js';

const corpus=await getCorpus(),counts=new Map(),unmarked=[],other={},books=[];let words=0;
for(const book of corpus.books){
  let bookWords=0;
  for(const chapter of book.chapters)for(const verse of chapter.verses)for(const token of verse.tokens){
    if(token.kind==='k'||!/[א-ת]/u.test(token.sourceHebrew))continue;words++;bookWords++;
    const text=token.sourceHebrew,analysis=analyzeSourceSigns(text),seen=new Set();
    // Count raw encoded characters independently of the interpretation API.
    const raw=[...text.matchAll(/[\u0591-\u05ae]/gu)];assert.equal(analysis.signs.length,raw.length);
    raw.forEach((match,i)=>{
      const char=match[0],point=char.codePointAt(0),definition=ACCENT_CATALOG.find(s=>s.point===point);
      assert.ok(definition,`Unknown source accent ${point}`);assert.equal(analysis.signs[i].char,char);assert.equal(analysis.signs[i].offset,match.index);
      const count=counts.get(point)??{code:definition.code,id:definition.id,name:definition.name,occurrences:0,words:0,example:{id:token.id,sourceHebrew:text}};
      count.occurrences++;if(!seen.has(point)){count.words++;seen.add(point);}counts.set(point,count);
    });
    for(const char of text)if('ֽ־׀׃͏‍'.includes(char)){const code=`U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')}`;other[code]=(other[code]??0)+1;}
    if(!/[\u0591-\u05ae\u05bd\u05c3]/u.test(text)&&!text.endsWith('־'))unmarked.push({id:token.id,sourceHebrew:text,kind:token.kind});
  }
  books.push({id:book.id,readingWords:bookWords});
}
const report={edition:corpus.manifest.edition,analysis:SIGN_ANALYSIS,readingWords:words,books,
  cantillationCodepoints:[...counts.entries()].sort(([a],[b])=>a-b).map(([,value])=>value),otherSourceCharacters:other,
  unmarkedWords:unmarked,scope:'Preferred reading forms (w/q); ketiv retained in source corpus, excluded from this reading-word census. Counts describe this edition, not a universal verse or musical-motif count.'};
await writeFile(new URL('../docs/SOURCE-SIGN-AUDIT.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(`${words} reading words; ${counts.size} cantillation codepoints; ${unmarked.length} unmarked words. All character offsets preserved.`);
