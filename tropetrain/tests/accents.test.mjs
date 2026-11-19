import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getCorpus} from '../library.js';
import {createReadingModel} from '../music.js';
import {analyzeSourceSigns,ACCENT_CATALOG,sourceClassLabel} from '../accents.js';
import {findSignsInReading,findSignsInCorpus} from '../sign-search.js';
const corpus=await getCorpus();
const reading=(bookId,chapter,verse)=>corpus.passage([{bookId,start:{chapter,verse},end:{chapter,verse}}]);

test('UXLC postpositive Zarqa and its distinct stress helper are recognized without replacing either codepoint',()=>{
  const zarqa=createReadingModel(reading('gen',1,7)).words.find(w=>w.sourceWordId==='gen-1-7-2');
  assert.equal(zarqa.sourceHebrew,'אֱלֹהִים֮');assert.match(zarqa.accent,/Zarqa \(postpositive\)/);
  assert.equal(zarqa.signAnalysis.signs[0].code,'U+05AE');assert.equal(zarqa.signAnalysis.className,'D3');
  const helper=createReadingModel(reading('gen',17,20)).words[0];
  assert.equal(helper.signAnalysis.signs[0].code,'U+0598');assert.equal(helper.signAnalysis.signs[0].id,'zarqa-helper');
  assert.equal(helper.signAnalysis.className,'helper');assert.notEqual(helper.signAnalysis.signs[0].id,zarqa.signAnalysis.signs[0].id);
});
test('different and repeated signs retain their source order, offsets and multiplicity',()=>{
  const mixed=analyzeSourceSigns('וּלְמ֣וֹעֲדִ֔ים');assert.deepEqual(mixed.signs.map(s=>s.id),['munah','zakef-katon']);
  assert.match(mixed.label,/^Munaḥ \+ Zakef katon/);
  assert.match(mixed.warnings.join(' '),/combined reading is not inferred/);
  const repeated=analyzeSourceSigns('תֹ֙הוּ֙');assert.deepEqual(repeated.signs.map(s=>s.id),['pashta','pashta']);
  assert.equal(repeated.className,'D3');assert.match(repeated.warnings.join(' '),/Repeated/);
  for(const text of ['וֽ͏ַיְהִי־','וּלְמ֣וֹעֲדִ֔ים','תֹ֙הוּ֙','נֽ‍ָא']){
    const a=analyzeSourceSigns(text);for(const s of [...a.signs,...a.marks])assert.equal(text.slice(s.offset,s.offset+s.char.length),s.char);
  }
});
test('verse-closing Silluq position does not erase meteg, punctuation or source shaping controls',()=>{
  const a=analyzeSourceSigns('בָּֽרָֽא׃');assert.deepEqual(a.marks.map(s=>s.id),['meteg','silluq','sof-pasuq']);
  assert.equal(a.className,'D1');assert.equal(a.label,'Silluq position');
  assert.ok(!analyzeSourceSigns('בָּֽרָא').marks.some(s=>s.id==='silluq'));
  assert.ok(!analyzeSourceSigns('ארץ׃').marks.some(s=>s.id==='silluq'));
  assert.match(analyzeSourceSigns('ארץ׃').label,/no Silluq/);
  const shaping=analyzeSourceSigns('וֽ͏ַיְהִי־');assert.ok(shaping.marks.some(s=>s.id==='cgj'));assert.match(shaping.label,/maqaf/);
});
test('paseq composites and several disjunctives remain context-dependent',()=>{
  const a=analyzeSourceSigns('הַ֣י ׀');assert.equal(a.className,'ambiguous');assert.match(a.warnings.join(' '),/can form legarmeh/);
  assert.match(sourceClassLabel(a.className),/Context required/);
  const b=analyzeSourceSigns('א֖ב֑');assert.equal(b.className,'multiple');assert.match(b.warnings.join(' '),/Several disjunctive/);
  for(const entry of ACCENT_CATALOG){const s=analyzeSourceSigns('א'+entry.char).signs[0];assert.equal(s.code,entry.code);assert.equal(s.id,entry.id);}
});
test('every raw Torah cantillation codepoint is recognized at its exact source offset',()=>{
  const census=JSON.parse(readFileSync(new URL('../docs/SOURCE-SIGN-AUDIT.json',import.meta.url),'utf8')),counts=new Map();let words=0;
  for(const book of corpus.books)for(const chapter of book.chapters)for(const verse of chapter.verses)for(const token of verse.tokens){
    if(token.kind==='k'||!/[א-ת]/u.test(token.sourceHebrew))continue;words++;
    const raw=[...token.sourceHebrew.matchAll(/[\u0591-\u05ae]/gu)],parsed=analyzeSourceSigns(token.sourceHebrew).signs;
    assert.equal(parsed.length,raw.length);
    raw.forEach((m,i)=>{assert.equal(parsed[i].char,m[0]);assert.equal(parsed[i].offset,m.index);counts.set(parsed[i].code,(counts.get(parsed[i].code)??0)+1);});
  }
  assert.equal(words,79985);assert.equal(counts.size,25);assert.equal(words,census.readingWords);
  assert.deepEqual(Object.fromEntries(counts),Object.fromEntries(census.cantillationCodepoints.map(s=>[s.code,s.occurrences])));
  assert.equal(counts.get('U+05AE'),365);assert.equal(counts.get('U+0598'),10);
});
test('sign search distinguishes encoded occurrences from words and repeated assigned sections',async()=>{
  const r={bookId:'gen',start:{chapter:1,verse:2},end:{chapter:1,verse:2}},model=createReadingModel(corpus.passage([{...r,id:'first'},{...r,id:'again'}]));
  const hits=findSignsInReading(model.words,'pashta');assert.equal(hits.length,2);assert.equal(hits[0].count,2);assert.notEqual(hits[0].occurrenceId,hits[1].occurrenceId);assert.equal(hits[0].sourceWordId,hits[1].sourceWordId);
  const zarqa=await findSignsInCorpus(corpus,'zarqa'),helper=await findSignsInCorpus(corpus,'zarqa-helper');
  assert.equal(zarqa.length,365);assert.equal(helper.length,10);assert.equal(zarqa[0].sourceWordId,'gen-1-7-2');assert.equal(zarqa[0].word.ordinal,2);
  for(const id of ['yerah-ben-yomo','qarnei-fara']){const rare=await findSignsInCorpus(corpus,id);assert.equal(rare.length,1);assert.equal(rare[0].word.reference,'Numbers 35:5');}
  const unmarked=await findSignsInCorpus(corpus,'unmarked');assert.equal(unmarked.length,7);assert.equal(unmarked[0].sourceWordId,'exo-4-2-5');
  assert.ok(unmarked.every(h=>h.word.kind!=='k'));assert.throws(()=>findSignsInReading(model.words,'invented-sign'),/Choose a source sign/);
});
