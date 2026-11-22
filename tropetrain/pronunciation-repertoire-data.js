import {PRONUNCIATION_REPERTOIRE_SUMMARY} from './pronunciation-repertoire-summary.js';
const books=new Set(PRONUNCIATION_REPERTOIRE_SUMMARY.books.map(b=>b.bookId));
export async function loadPronunciationRepertoireBook(bookId){
 if(!books.has(bookId))throw Error('Choose a supported pronunciation source book.');
 const response=await fetch(new URL('./data/pronunciation/repertoire/'+bookId+'.json.gz',import.meta.url));
 if(!response.ok)throw Error('This book’s pronunciation source is unavailable.');
 return JSON.parse(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text());
}
