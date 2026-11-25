import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {getCorpus} from '../library.js';
import {getRepertoireCorpus,createRepertoireAssignment,parseRepertoireAssignment} from '../repertoire.js';
import {resolveTorahCalendarUnit} from '../torah-numbering.js';
import {calendarRanges} from '../calendar.js';
import {calendarExamples} from '../calendar-example-data.js';

const corpus=await getCorpus(),expanded=await getRepertoireCorpus();
const map=JSON.parse(readFileSync(new URL('../data/calendar/torah-verse-numbering.json',import.meta.url),'utf8'));
const resolve=(bookId,b,e,v)=>resolveTorahCalendarUnit({k:corpus.byId.get(bookId).name,b,e,v},corpus.byId.get(bookId));
test('all 53 source boundary facts retain complete exact UXLC records and pinned preferred-letter sequences',()=>{
  let source=0,target=0;
  for(const table of map.chapters){
    const book=corpus.byId.get(table.bookId),chapter=book.chapters[table.chapter-1];assert.equal(table.sourceSha256,book.sourceSha256);
    assert.equal(table.dataSha256,createHash('sha256').update(readFileSync(new URL(`../data/torah/${table.bookId}.json`,import.meta.url))).digest('hex'));
    assert.equal(table.targetVerseRecords,chapter.verses.length);assert.equal(table.sourceVerseCount,table.mappings.length);let previous=0;
    for(const [index,row] of table.mappings.entries()){
      assert.equal(row.sourceVerse,index+1);assert.equal(row.targetStart,previous+1);assert.ok(row.targetEnd>=row.targetStart);previous=row.targetEnd;
      const tokens=chapter.verses.slice(row.targetStart-1,row.targetEnd).flatMap(verse=>verse.tokens.filter(token=>token.kind!=='k'));
      assert.equal(tokens[0].id,row.firstWordId);assert.equal(tokens.at(-1).id,row.lastWordId);assert.equal(tokens.length,row.readingWords);
      const letters=tokens.map(token=>token.sourceHebrew.replace(/[^א-ת]/gu,'')).join('');
      assert.equal(createHash('sha256').update(letters).digest('hex'),row.preferredLettersSha256);
    }
    assert.equal(previous,chapter.verses.length);source+=table.sourceVerseCount;target+=table.targetVerseRecords;
  }
  assert.equal(source,53);assert.equal(target,59);
});

test('source and UXLC counts/endpoints remain distinct through the two Decalogue mappings',()=>{
  const first=resolve('deu','5:1','5:18',18);assert.deepEqual(first.start,{chapter:5,verse:1});assert.deepEqual(first.end,{chapter:5,verse:21});assert.equal(first.uxlcVerseRecords,21);
  const next=resolve('deu','5:19','6:3',15);assert.deepEqual(next.start,{chapter:5,verse:22});assert.equal(next.uxlcVerseRecords,15);
  assert.deepEqual(resolve('deu','5:21','5:21',1).start,{chapter:5,verse:24});assert.deepEqual(resolve('deu','5:22','5:22',1).start,{chapter:5,verse:25});
  const short=resolve('exo','20:13','20:13',1);assert.deepEqual(short.start,{chapter:20,verse:13});assert.deepEqual(short.end,{chapter:20,verse:16});assert.equal(short.uxlcVerseRecords,4);
  const across=resolve('exo','19:1','21:1',49);assert.equal(across.sourceVerseCount,49);assert.equal(across.uxlcVerseRecords,52);assert.ok(across.mapping);
});

test('Vaetchanan and Shavuot calendar selections have complete mapped endpoints and retain original API units',()=>{
  const record=calendarExamples.find(record=>record.month==='2022-08'&&record.region==='Diaspora'),item=JSON.parse(record.raw).items.find(item=>item.date==='2022-08-13');
  const ranges=calendarRanges(item,'annual',record,corpus);assert.deepEqual(ranges[3].end,{chapter:5,verse:21});assert.deepEqual(ranges[4].start,{chapter:5,verse:22});
  assert.deepEqual(ranges[3].divisionSource.referenceMapping.sourceUnit,item.fullkriyah['4']);assert.equal(ranges[3].divisionSource.referenceMapping.sourceVerseCount,18);assert.equal(ranges[3].divisionSource.referenceMapping.uxlcVerseRecords,21);
  const tri=calendarRanges(item,'triennial',record,corpus);assert.deepEqual(tri[1].start,{chapter:5,verse:22});assert.deepEqual(tri[2].start,{chapter:5,verse:28});
  const june=calendarExamples.find(record=>record.month==='2022-06'),shavuot=JSON.parse(june.raw).items.find(item=>item.date==='2022-06-05');
  const full=calendarRanges(shavuot,'annual',june,corpus);assert.deepEqual(full[3].end,{chapter:20,verse:17});assert.deepEqual(full[4].start,{chapter:20,verse:18});assert.deepEqual(full[4].end,{chapter:20,verse:26});
});

test('mapped Torah assignments require v3 and preserve both namespaces without changing target Hebrew',()=>{
  const record=calendarExamples.find(record=>record.month==='2022-08'),item=JSON.parse(record.raw).items.find(item=>item.date==='2022-08-13');
  const ranges=calendarRanges(item,'annual',record,expanded,'4'),saved=createRepertoireAssignment('Mapped aliyah','torah',ranges,{tempo:55,transpose:2},expanded);
  assert.equal(saved.format,'tropetrain-assignment-v3');const loaded=parseRepertoireAssignment(JSON.stringify(saved),expanded);assert.deepEqual(loaded.sections,ranges);
  const p=expanded.passage(loaded.sections);assert.equal(p.verses.length,21);assert.equal(p.verses.at(-1).number,21);
  for(const verse of p.verses)assert.deepEqual(verse.sourceTokens,expanded.byId.get('deu').chapters[4].verses[verse.number-1].tokens);
  for(const format of ['tropetrain-assignment-v1','tropetrain-assignment-v2'])assert.throws(()=>parseRepertoireAssignment(JSON.stringify({...saved,format}),expanded),/requires assignment v3/);
});

test('legacy ambiguous claims, incompatible Hebrew editions and altered map metadata are refused',()=>{
  const record=calendarExamples.find(record=>record.month==='2022-08'),item=JSON.parse(record.raw).items.find(item=>item.date==='2022-08-13'),range=calendarRanges(item,'annual',record,corpus,'4')[0];
  const legacy=structuredClone(range);delete legacy.divisionSource.referenceMapping;assert.throws(()=>corpus.range(legacy),/ambiguous source\/UXLC numbering/);
  for(const mutate of [r=>r.end.verse--,r=>r.divisionSource.referenceMapping.sourceUnit.v++,r=>r.divisionSource.referenceMapping.revision++,r=>r.divisionSource.referenceMapping.uxlcVerseRecords++]){
    const altered=structuredClone(range);mutate(altered);assert.throws(()=>corpus.range(altered));
  }
  const book={...corpus.byId.get('deu'),sourceSha256:'0'.repeat(64)};
  assert.throws(()=>resolveTorahCalendarUnit({k:'Deuteronomy',b:'5:1',e:'5:1',v:1},book),/needs review/);
  assert.throws(()=>resolve('deu','5:31','5:31',1),/outside/);assert.throws(()=>resolve('deu','5:1a','5:2',2),/Partial-verse/);
});

test('numbering evidence and licensed numeric data remain exact in standalone and offline builds',()=>{
  const html=restoredPortableHtml(readFileSync(new URL('../TropeTrain.html',import.meta.url),'utf8')),worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  const embedded=[...html.matchAll(/href="data:application\/json;base64,([A-Za-z0-9+/=]+)"/g)].map(match=>Buffer.from(match[1],'base64').toString());
  for(const path of ['docs/TORAH-NUMBERING-SOURCES.json','data/calendar/torah-verse-numbering.json','docs/CALENDAR-RELATED-AUDIT.json']){
    assert.ok(embedded.includes(readFileSync(new URL('../'+path,import.meta.url),'utf8')));assert.ok(worker.includes('./'+path));assert.ok(!html.includes('href="./'+path+'"'));
  }
  assert.ok(html.includes('CC BY-SA 4.0'));
});
