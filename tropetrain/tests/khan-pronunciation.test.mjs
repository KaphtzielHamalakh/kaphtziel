import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import {KHAN_PRONUNCIATION as source,READER_PRONUNCIATION_SOURCES,readerPronunciationSource,khanWordEvidence,khanVerseForWord} from '../khan-pronunciation.js';
import {getCorpus} from '../library.js';import {createReadingModel} from '../music.js';
const book=JSON.parse(readFileSync(new URL('../data/torah/gen.json',import.meta.url))),byWord=new Map(book.chapters[0].verses.flatMap(v=>v.tokens.filter(t=>['w','q'].includes(t.kind)).map(w=>[w.id,w])));
const word=id=>{const w=byWord.get(id);return{id:w.id,sourceHebrew:w.sourceHebrew};};
const reading=(id,style='forte-lene')=>khanWordEvidence(word(id),style);

test('all159 published source words have318 exact marked-Hebrew links in both independent streams',()=>{
 let words=0,columns=0;
 for(const verse of source.verses){
  assert.equal(verse.id,`gen-1-${verse.verse}`);assert.equal(verse.chapter,1);columns+=verse.columns.length;
  const actual=book.chapters[0].verses[verse.verse-1].tokens.filter(t=>['w','q'].includes(t.kind));words+=actual.length;
  for(const column of verse.columns){
   assert.deepEqual(column.tokens.map(t=>t.sourceWordId),actual.map(w=>w.id));
   assert.equal(column.tokens.map(t=>t.join+t.text).join(''),column.text);
   let end=0;
   for(const [i,t]of column.tokens.entries()){
    assert.equal(t.readerHebrew,actual[i].sourceHebrew);assert.equal(t.printedConsonants,t.readerHebrew.replace(/[^א-ת]/gu,''));
    assert.equal(t.start,end+t.join.length);assert.equal(column.text.slice(t.start,t.end),t.text);end=t.end;
    for(const style of ['forte-lene','extended-forte']){const r=reading(t.sourceWordId,style);assert.equal(r.status,'word-linked');assert.equal(r.hebrew,t.readerHebrew);assert.equal(r.entries.length,1);}
   }
  }
 }
 assert.equal(words,159);assert.equal(columns,21);assert.equal(source.coverage.styleWordLinks,318);
});

test('only the18 primary printed alternatives differ; dagesh doubling is never applied to other words by a rule',()=>{
 const differences=[];
 for(const v of source.verses)for(const w of v.columns[0].tokens)if(reading(w.sourceWordId).entries[0].text!==reading(w.sourceWordId,'extended-forte').entries[0].text)differences.push(w.sourceWordId);
 assert.deepEqual(differences,['gen-1-1-1','gen-1-1-2','gen-1-2-7','gen-1-2-13','gen-1-4-5','gen-1-4-7','gen-1-4-9','gen-1-6-5','gen-1-6-8','gen-1-6-9','gen-1-7-5','gen-1-7-6','gen-1-10-11','gen-1-11-3','gen-1-11-5','gen-1-11-10','gen-1-12-3','gen-1-12-17']);
 assert.equal(reading('gen-1-1-1').entries[0].text,'baʀ̟eːˈʃiːiθ');assert.equal(reading('gen-1-1-1','extended-forte').entries[0].text,'bbaʀ̟eːˈʃiːiθ');
 assert.equal(reading('gen-1-11-10').entries[0].text,'pʰaˈʀ̟iː');assert.equal(reading('gen-1-11-10','extended-forte').entries[0].text,'ppʰaˈʀ̟iː');
});

test('five explicitly common source verses reference the actual single column, including unchanged stress and length',()=>{
 assert.deepEqual(source.verses.filter(v=>v.columns.length===1).map(v=>v.verse),[3,5,8,9,13]);
 for(const v of source.verses.filter(v=>v.columns.length===1))for(const t of v.columns[0].tokens){
  const a=reading(t.sourceWordId),b=reading(t.sourceWordId,'extended-forte');assert.equal(a.entries[0].sourceReference.basis,b.entries[0].sourceReference.basis);assert.equal(a.entries[0].sourceReference.basis,'explicit-common-reading-per-source-p614');assert.equal(b.entries[0].sourceColumn,1);assert.equal(a.entries[0].sourceCellId,b.entries[0].sourceCellId);assert.equal(a.entries[0].text,b.entries[0].text);
 }
 assert.equal(reading('gen-1-8-3').entries[0].text,'ˌlɔːʀ̟ɔːˈq̟iːjaʕ');
});

test('printed glides, epenthetic vowels, dehiq, retrotracted resh and aspiration are literal whole-word text',()=>{
 assert.equal(reading('gen-1-2-2').entries[0].text,'hɔːɔjˈθɔː');assert.equal(reading('gen-1-2-9').entries[0].text,'vaˈʀ̟uːwaħ');
 assert.equal(reading('gen-1-4-11').entries[0].text,'wuˈveːen');assert.equal(reading('gen-1-11-7').entries[0].text,'mɑzˈrˁiːjaʕ');
 assert.equal(reading('gen-1-11-11').entries[0].text,'ˈʕoːsɛˑ');assert.equal(reading('gen-1-11-12').entries[0].text,'ppʰaˈʀ̟iː');assert.equal(reading('gen-1-11-15').entries[0].text,'zɑrˁʕoː');
 assert.equal(reading('gen-1-9-11').entries[0].text,'haɟɟabbɔːˈʃɔː');
 const v=khanVerseForWord(word('gen-1-11-12'));assert.equal(v.columns[0].tokens[11].join,' ');assert.equal(v.columns[0].tokens[15].join,'-');
 assert.deepEqual(reading('gen-1-11-12').entries[0].footnotes,[20]);assert.deepEqual(reading('gen-1-11-15').entries[0].footnotes,[21]);
});

test('uncovered words, unsupported streams and altered reader accents cannot select approximate or alternate text',()=>{
 const missing=khanWordEvidence(word('gen-1-14-1'),'extended-forte');assert.equal(missing.status,'no-source-correspondence');assert.deepEqual(missing.entries,[]);assert.equal(khanVerseForWord(word('gen-1-14-1')),null);
 assert.throws(()=>khanWordEvidence({...word('gen-1-1-1'),sourceHebrew:'בְּרֵאשִׁית'},'forte-lene'),/Marked Hebrew changed/);
 assert.throws(()=>khanWordEvidence(word('gen-1-1-1'),'galician'),/Unknown published/);assert.throws(()=>readerPronunciationSource('invented'),/Unknown reader/);
 assert.equal(readerPronunciationSource('mam').kind,'mam');assert.equal(READER_PRONUNCIATION_SOURCES.filter(s=>s.kind==='published-word').length,2);
});

test('published text leaves full-mark equivalence, syllable links, accepted phones, note allocation and all audio times null',()=>{
 for(const v of source.verses)for(const c of v.columns)for(const t of c.tokens){
  for(const key of ['sourceMarkedHebrew','sourceMarkEquivalence','syllableRanges','phonemes','noteIds','audioTimes','review'])assert.equal(t[key],null);
  const r=reading(t.sourceWordId);for(const key of ['syllableRanges','phonemes','noteIds','audioTimes','review','newSingingVoice'])assert.equal(r[key],null);
  assert.equal(r.entries[0].parts.length,1);assert.equal(r.entries[0].parts[0].syllableRanges,null);assert.equal(r.entries[0].parts[0].sourceStress,false);
 }
 assert.equal(source.completeGrammar,false);assert.equal(source.kinnorAccentId,null);assert.equal(source.independentReview,null);
});

test('all21 phonetic columns and the reusable source pack match pinned content and attribution',()=>{
 const h=createHash('sha256').update(JSON.stringify(source.verses.map(v=>[v.id,v.columns.map(c=>[c.column,c.text])]))).digest('hex');assert.equal(h,'14f4985aa528ad8c6009feaead1ac33ddafc414b8364cd7aa406004a9140536b');
 const doc=JSON.parse(readFileSync(new URL('../docs/KHAN-TIBERIAN-GENESIS.json',import.meta.url)));assert.deepEqual(doc,source);
 const zip=readFileSync(new URL('../'+source.sourcePack.file,import.meta.url));assert.equal(zip.length,source.sourcePack.bytes);assert.equal(createHash('sha256').update(zip).digest('hex'),source.sourcePack.sha256);assert.equal(zip.readUInt32LE(0),0x04034b50);
 assert.equal(source.source.license,'CC-BY-4.0');assert.match(source.source.attribution,/Geoffrey Khan.*2020/);assert.match(source.source.changes,/line-break hyphen/);assert.equal(source.source.originalPdfBytes,9857295);
});

test('distributed runtime and portable file retain all21 published source columns alongside the MAM source',()=>{
 const bundle=readFileSync(new URL('../app.bundle.js',import.meta.url),'utf8'),portable=restoredPortableHtml(readFileSync(new URL('../TropeTrain.html',import.meta.url),'utf8'));
 assert.ok(bundle.includes(source.id));
 for(const file of ['docs/KHAN-TIBERIAN-GENESIS.json',source.sourcePack.file])assert.ok(portable.includes(readFileSync(new URL('../'+file,import.meta.url)).toString('base64')),'Portable retains exact source evidence bytes.');
 assert.doesNotMatch(portable,/href="\.\/assets\/pronunciation\/khan-/);
 for(const v of source.verses)for(const c of v.columns){assert.ok(bundle.includes(JSON.stringify(c.text)),`${c.id} missing from bundled source`);assert.ok(portable.includes(JSON.stringify(c.text)),`${c.id} missing from portable source`);}
 assert.ok(bundle.includes('torah-display.json.gz')||bundle.includes('pronunciationEncoded'),'Existing MAM source remains separately available.');
});

test('repeated reader occurrences remain distinct and both streams leave music, original words and source data unchanged',async()=>{
 const corpus=await getCorpus(),s={bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:1}},model=createReadingModel(corpus.passage([{id:'a',...s},{id:'b',...s}])),before=JSON.stringify(model),data=JSON.stringify(source),plan=JSON.stringify(model.buildPlan(0,model.words.length-1,{tempo:60,transpose:0}));
 const copies=model.words.filter(w=>w.sourceWordId==='gen-1-1-1');assert.equal(copies.length,2);
 const reports=copies.map(w=>khanWordEvidence(w,'extended-forte'));assert.notEqual(reports[0].wordId,reports[1].wordId);assert.deepEqual(reports[0].entries,reports[1].entries);
 for(const w of model.words)for(const style of ['forte-lene','extended-forte'])khanWordEvidence(w,style);
 assert.equal(JSON.stringify(model),before);assert.equal(JSON.stringify(source),data);assert.equal(JSON.stringify(model.buildPlan(0,model.words.length-1,{tempo:60,transpose:0})),plan);assert.ok(Object.isFrozen(source.verses[0].columns[0].tokens[0]));
});
