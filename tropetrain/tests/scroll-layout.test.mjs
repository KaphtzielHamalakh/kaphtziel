import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ScrollLayout} from '../scroll-layout.js';
import {marksWord,linkedWordIds,writtenUnitClass} from '../scroll-layout-ui.js';
import {Corpus,createAssignment,parseAssignment} from '../library.js';
import {createReadingModel} from '../music.js';
import {encoded} from '../scroll-layout-data.js';

const read=name=>readFileSync(new URL('../'+name,import.meta.url));
const json=name=>JSON.parse(read(name));
const manifest=json('data/torah/manifest.json'),books=manifest.books.map(book=>json('data/torah/'+book.file));
const corpus=new Corpus({manifest,books});
const data=JSON.parse(gunzipSync(read('data/layout/torah-layout.json.gz'))),layout=new ScrollLayout(data);
const pieces=data.rows.flatMap(row=>row.cells.flat(2));
const letters=text=>text.replace(/[^א-ת]/gu,'');
const passage=(bookId,chapter,verse)=>corpus.passage([{id:'study',bookId,start:{chapter,verse},end:{chapter,verse}}]);
const wordsAt=(book,chapter,verse)=>createReadingModel(passage(book,chapter,verse)).words;

test('all 79,985 preferred reading IDs are covered while all written UXLC letters remain exact',()=>{
 const expectedIds=new Set();
 for(const book of books){
  const tokens=book.chapters.flatMap(c=>c.verses.flatMap(v=>v.tokens));
  for(const token of tokens)if(['w','q'].includes(token.kind)&&letters(token.sourceHebrew))expectedIds.add(token.id);
  const expected=tokens.filter(t=>['w','k'].includes(t.kind)).map(t=>letters(t.sourceHebrew)).join('');
  assert.equal(pieces.filter(p=>p.book===book.id).map(p=>p.written).join(''),expected,book.id);
 }
 assert.equal(expectedIds.size,79985);
 assert.deepEqual(new Set(layout.byWord.keys()),expectedIds);
 assert.equal(layout.byPiece.size,pieces.length);
 assert.ok(pieces.every(p=>p.readingIds.length&&p.writtenIds.length&&p.written));
 assert.deepEqual(pieces.filter(p=>p.letterSizes?.length).map(p=>[p.readingIds[0],p.written[p.letterSizes[0].index]]),[['lev-11-42-4','ו'],['num-27-5-4','ן'],['deu-6-4-1','ע'],['deu-6-4-6','ד']]);
});

test('the complete source row structure, poetry columns and explicit differences survive import',()=>{
 const audit=json('docs/SCROLL-LAYOUT-AUDIT.json');
 assert.equal(new Set(data.rows.map(row=>row.page)).size,245);
 assert.equal(data.rows.length,10292);
 assert.equal(data.rows.filter(row=>row.cells.length===2).length,70);
 assert.equal(data.rows.filter(row=>row.cells.some(cell=>cell.length>1)).length,405);
 assert.deepEqual(audit.unusualPages,{'61':43,'78':40,'111':43,'148':43,'200':43});
 assert.equal(audit.differenceGroups,132);
 assert.equal(audit.differences.filter(d=>d.kind==='word-division').length,7);
 const word=layout.byWord.get('gen-8-20-8')[0].piece;
 assert.equal(word.written,'הטהורה');assert.equal(word.layoutSource,'הטהרה');assert.equal(word.status,'spelling-difference');
});

test('written variants retain every qere ID without inventing letter-to-syllable allocation',()=>{
 for(const [book,chapter,verse,written] of [['gen',30,11,'בגד'],['exo',4,2,'מזה'],['deu',33,2,'אשדת']]){
  const words=wordsAt(book,chapter,verse),rows=layout.excerpt(words);
  const unit=rows.flatMap(row=>row.cells.flat(2)).find(p=>p.written===written);
  assert.ok(unit,written);assert.equal(unit.variant,true);assert.equal(unit.words.length,2);
  assert.ok(unit.words.every(w=>w.kind==='q'));assert.deepEqual(unit.words.map(w=>w.sourceWordId),unit.readingIds);
  assert.equal(unit.words[1].writtenVariants[0].sourceHebrew,unit.words[0].writtenVariants[0].sourceHebrew);
  assert.equal(writtenUnitClass(unit.words),'multiple');
  assert.equal(unit.syllables,undefined);assert.equal(unit.phonemes,undefined);
 }
});

test('joined and split source word boundaries preserve all reading identities',()=>{
 const joined=layout.byWord.get('gen-14-17-9')[0].piece;
 assert.equal(joined.written,'כדרלעמר');assert.equal(joined.status,'word-division');
 assert.deepEqual(joined.readingIds,['gen-14-17-9','gen-14-17-10']);
 const split=layout.byWord.get('num-12-9-1').map(e=>e.piece);
 assert.deepEqual(split.map(p=>p.written),['ויחר','אף']);assert.ok(split.every(p=>p.readingIds[0]==='num-12-9-1'));
 const nearBracket=layout.byWord.get('num-23-13-5')[0].piece;
 assert.equal(nearBracket.written,'לך');assert.ok(!nearBracket.written.includes('נא'));
});

test('layout excerpts preserve assignment order and separate repeated occurrences',()=>{
 const ranges=[{id:'first',bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:3}},{id:'second',bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:1}}];
 const model=createReadingModel(corpus.passage(ranges)),rows=layout.excerpt(model.words);
 assert.deepEqual(rows.filter(row=>row.sectionId==='first').map(row=>row.line),[1,2,3,4]);
 assert.equal(rows.filter(row=>row.sectionId==='first').at(-1).partial,true);
 assert.deepEqual(rows.filter(row=>row.sectionId==='second').map(row=>row.line),[1]);
 const rendered=rows.flatMap(row=>row.cells.flat(2).flatMap(piece=>piece.words.map(w=>w.id)));
 assert.ok(rendered.includes('gen-1-1-1@first'));assert.ok(rendered.includes('gen-1-1-1@second'));
 assert.throws(()=>layout.excerpt([{id:'unavailable',sectionId:'test'}]),/unavailable/);
});

test('a written unit highlights for either reading alias and layout preferences cannot change musical events',()=>{
 const element={dataset:{word:'q1',linkedWords:'q1 q2'}};
 assert.deepEqual(linkedWordIds(element),['q1','q2']);assert.equal(marksWord(element,'q2'),true);assert.equal(marksWord(element,null),false);assert.equal(marksWord(element,'q3'),false);
 const p=passage('gen',30,11),plain=createReadingModel(p),scroll=createReadingModel(p,{scrollLayout:true});
 assert.deepEqual(scroll.events,plain.events);assert.deepEqual(scroll.words,plain.words);
 const saved=createAssignment('Written variant',p.ranges,{view:'parallel',scrollLayout:true,melodyId:'original-demo-01'});
 const parsed=parseAssignment(JSON.stringify(saved),corpus);
 assert.equal(parsed.displayPreferences.scrollLayout,true);assert.equal(parsed.musicalPreferences.pronunciationId,null);
 delete saved.displayPreferences.scrollLayout;
 assert.equal(parseAssignment(JSON.stringify(saved),corpus).displayPreferences.scrollLayout,false);
});

test('packed layout and original font/source attribution are lossless in the standalone distribution',()=>{
 const compressed=read('data/layout/torah-layout.json.gz');assert.deepEqual(Buffer.from(encoded,'base64'),compressed);
 const audit=json('docs/SCROLL-LAYOUT-AUDIT.json');assert.equal(createHash('sha256').update(gunzipSync(compressed)).digest('hex'),audit.dataSha256);
 const sources=json('docs/SCROLL-SOURCES.json'),font=read('assets/ShlomoStam.ttf');
 assert.equal(createHash('sha256').update(font).digest('hex'),sources.font.fontSha256);
 assert.equal(createHash('sha256').update(read('assets/ShlomoStam-OFL.txt')).digest('hex'),sources.font.licenseSha256);
 assert.match(read('assets/ShlomoStam-OFL.txt').toString(),/additional Reserved Font Name Shlomo/);
 assert.match(read('assets/layout/tikkun-MIT.txt').toString(),/Copyright \(c\) 2015 Akiva Gordon/);
 const html=restoredPortableHtml(read('TropeTrain.html')).toString();assert.ok(html.includes(encoded));assert.ok(html.includes(font.toString('base64')));
 assert.ok(html.includes(read('assets/layout/tikkun-torah-sources.zip').toString('base64')));
 assert.ok(html.includes(Buffer.from(read('docs/SCROLL-SOURCES.json')).toString('base64')));
 assert.doesNotMatch(html,/href="\.\/(?:assets\/(?:ShlomoStam|layout)|docs\/SCROLL-SOURCES)/);
});

test('the unchanged scribal font has real glyph mappings for every Hebrew letter and final form',()=>{
 const font=read('assets/ShlomoStam.ttf');let cmap;
 for(let i=0;i<font.readUInt16BE(4);i++)if(font.toString('ascii',12+i*16,16+i*16)==='cmap')cmap=font.readUInt32BE(20+i*16);
 assert.ok(cmap);let table;
 for(let i=0;i<font.readUInt16BE(cmap+2);i++){
  const record=cmap+4+i*8,offset=cmap+font.readUInt32BE(record+4);
  if(font.readUInt16BE(record)===3&&font.readUInt16BE(offset)===4){table=offset;break;}
 }
 assert.ok(table,'Unicode BMP character map is present.');
 const n=font.readUInt16BE(table+6)/2,endBase=table+14,startBase=endBase+n*2+2,deltaBase=startBase+n*2,rangeBase=deltaBase+n*2;
 for(let cp=0x05d0;cp<=0x05ea;cp++){
  let glyph=0;
  for(let i=0;i<n;i++)if(cp>=font.readUInt16BE(startBase+2*i)&&cp<=font.readUInt16BE(endBase+2*i)){
   const delta=font.readInt16BE(deltaBase+2*i),range=font.readUInt16BE(rangeBase+2*i);
   glyph=range?font.readUInt16BE(rangeBase+2*i+range+2*(cp-font.readUInt16BE(startBase+2*i))):(cp+delta)&65535;
   if(range&&glyph)glyph=(glyph+delta)&65535;break;
  }
  assert.ok(glyph,`U+${cp.toString(16)} has an actual font glyph.`);
 }
});
