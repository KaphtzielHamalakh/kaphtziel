import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),json=async f=>JSON.parse(await readFile(new URL(f,root),'utf8'));
const source=await json('docs/KHAN-TIBERIAN-GENESIS.json'),book=await json('data/torah/gen.json'),all=new Map(book.chapters[0].verses.flatMap(v=>v.tokens.filter(t=>['w','q'].includes(t.kind)).map(t=>[t.id,t])));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const require=(yes,message)=>{if(!yes)throw Error('Published pronunciation: '+message);};
require(source.schema==='tropetrain-published-pronunciation-v1'&&source.revision===1&&source.verses.length===13,'source identity or complete excerpt changed.');
require(source.source.license==='CC-BY-4.0'&&source.source.originalPdfSha256==='bcab644037f62795041c3c6e6e37f1c1eb28f29d147b6d2c4409fd6bc3c0da24','source provenance changed.');
let words=0,columns=0;const shared=[];
for(const [i,v]of source.verses.entries()){
 require(v.verse===i+1&&v.chapter===1&&v.id===`gen-1-${i+1}`,'verse identity changed.');
 const reader=book.chapters[0].verses[i].tokens.filter(t=>['w','q'].includes(t.kind));words+=reader.length;columns+=v.columns.length;if(v.columns.length===1)shared.push(v.verse);
 for(const [j,c]of v.columns.entries()){
  require(c.column===j+1&&c.tokens.length===reader.length&&c.coordinateUnit==='UTF-16','printed column inventory changed.');let text='';
  for(const [n,t]of c.tokens.entries()){
   const w=all.get(t.sourceWordId);require(w&&w.id===reader[n].id&&w.sourceHebrew===t.readerHebrew&&t.printedConsonants===w.sourceHebrew.replace(/[^א-ת]/gu,''),'word identity, marks, source consonants or order changed.');
   require(n===0?t.join==='':[' ','-'].includes(t.join),'source join changed.');text+=t.join;require(t.start===text.length&&t.end===t.start+t.text.length,'source word offsets changed.');text+=t.text;
   for(const key of ['sourceMarkedHebrew','sourceMarkEquivalence','syllableRanges','phonemes','noteIds','audioTimes','review'])require(t[key]===null,'unreviewed word acquired inferred sound, source marks or timing.');
  }
  require(text===c.text,'source text no longer reconstructs.');
 }
 for(const reading of ['forte-lene','extended-forte']){const ref=v.readings[reading];require(v.columns.some(c=>c.column===ref.column),'missing source column cannot use a fallback.');if(v.columns.length===1)require(ref.column===1&&ref.basis==='explicit-common-reading-per-source-p614','one common reading must retain explicit primary provenance.');}
}
require(words===159&&columns===21&&JSON.stringify(shared)==='[3,5,8,9,13]','complete source coverage changed.');
require(sha(JSON.stringify(source.verses.map(v=>[v.id,v.columns.map(c=>[c.column,c.text])])))==='14f4985aa528ad8c6009feaead1ac33ddafc414b8364cd7aa406004a9140536b','a phonetic character, length, stress, glide or join changed.');
const pack=await readFile(new URL(source.sourcePack.file,root));require(pack.length===source.sourcePack.bytes&&sha(pack)===source.sourcePack.sha256,'reusable source pages changed.');
await writeFile(new URL('khan-pronunciation-data.js',root),'// Khan2020 source phonetic text CC BY4.0; original exact word bindings. See docs/KHAN-TIBERIAN-GENESIS.json.\nexport const KHAN_PRONUNCIATION='+JSON.stringify(source)+';\n');
console.log('Published Tiberian transcriptions:159words/318style links/21columns exact; no syllable or audio times assigned.');
