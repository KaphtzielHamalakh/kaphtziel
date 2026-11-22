import {PRONUNCIATION_REPERTOIRE_UNDERLAY} from './pronunciation-repertoire-underlay-summary.js';
export async function loadPronunciationRepertoireUnderlayBook(bookId){
 const expected=PRONUNCIATION_REPERTOIRE_UNDERLAY.books.find(b=>b.bookId===bookId);
 if(!expected)throw Error('Choose a supported pronunciation underlay book.');
 const response=await fetch(new URL('./data/pronunciation/repertoire-underlay/'+bookId+'.json.gz',import.meta.url));
 if(!response.ok)throw Error('This book’s pronunciation underlay is unavailable.');
 const bytes=new Uint8Array(await response.arrayBuffer());
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(bytes.length!==expected.packetBytes||hash!==expected.packetSha256)throw Error('This book’s pronunciation underlay checksum changed.');
 return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
}
