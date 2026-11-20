import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calendarExamples} from '../calendar-example-data.js';
import {relatedReadingChoices,relatedReadingRanges} from '../calendar-related.js';
import {relatedUnits} from '../related-source.js';
import {getRepertoireCorpus,createRepertoireAssignment,parseRepertoireAssignment} from '../repertoire.js';
import {createReadingModel} from '../music.js';
import {PRINTED_SCORE} from '../printed-score.js';

const corpus=await getRepertoireCorpus();
const record=(month,region='Diaspora')=>calendarExamples.find(record=>record.month===month&&record.region===region);
const reading=(record,date,name)=>JSON.parse(record.raw).items.find(item=>item.date===date&&(!name||item.name.en===name));
const prepare=(month,date,field='haft',region='Diaspora',name)=>{const r=record(month,region),item=reading(r,date,name);assert.ok(item);return {record:r,item,...relatedReadingRanges(item,field,r,corpus)};};

test('all eight pinned source examples expose 100 related choices: 98 exact selections and two explicit partial refusals',()=>{
  assert.equal(calendarExamples.length,8);let choices=0,valid=0;const refused=[];
  for(const r of calendarExamples)for(const item of JSON.parse(r.raw).items)for(const choice of relatedReadingChoices(item)){
    choices++;const before=JSON.stringify(item);
    if(r.month==='2022-07'&&item.date==='2022-07-30'&&choice.field==='triHaft'){
      assert.throws(()=>relatedReadingRanges(item,choice.field,r,corpus),/Partial or ambiguous/);refused.push([r.region,item.date,choice.field]);
    }else{
      const checked=relatedReadingRanges(item,choice.field,r,corpus);valid++;
      assert.equal(corpus.passage(checked.ranges).verses.length,checked.verses);
      for(const range of checked.ranges){
        const source=range.relatedSource;assert.equal(source.sha256,r.sha256);assert.equal(source.url,r.url);assert.equal(source.region,r.region);
        assert.equal(source.serviceDate,item.date);assert.deepEqual(source.serviceName,item.name);
        assert.deepEqual(source.units,relatedUnits(choice.value).units);
        if(item.reason!==undefined)assert.deepEqual(source.serviceContext.reason,item.reason);
        assert.deepEqual(corpus.range(range).relatedSource,source);
      }
    }
    assert.equal(JSON.stringify(item),before,'Checking never normalizes or mutates original source data.');
  }
  assert.equal(choices,100);assert.equal(valid,98);
  assert.deepEqual(refused,[['Diaspora','2022-07-30','triHaft'],['Israel','2022-07-30','triHaft']]);
});

test('Pesach default and Sephardic variants preserve their different ordered discontinuous Joshua passages',()=>{
  const full=prepare('2022-04','2022-04-16'),seph=prepare('2022-04','2022-04-16','seph');
  assert.deepEqual(full.ranges.map(range=>[range.bookId,range.start,range.end]),[
    ['jos',{chapter:3,verse:5},{chapter:3,verse:7}],['jos',{chapter:5,verse:2},{chapter:6,verse:1}],['jos',{chapter:6,verse:27},{chapter:6,verse:27}]
  ]);
  assert.equal(full.verses,19);assert.equal(seph.ranges.length,2);assert.equal(seph.verses,16);
  assert.equal(full.ranges[0].relatedSource.sourceSummary,'Joshua 3:5-7, 5:2-6:1, 6:27');
  assert.deepEqual(full.ranges.map(range=>range.relatedSource.selection),[{first:0,last:0},{first:1,last:1},{first:2,last:2}]);
  assert.equal(seph.ranges[0].relatedSource.reportedTotal.value,16);
});

test('cross-book haftarot keep source order, Roman source names and their exact named service context',()=>{
  const shuva=prepare('2022-10','2022-10-01'),mincha=prepare('2022-10','2022-10-05','haft','Diaspora','Yom Kippur (Mincha)');
  assert.deepEqual(shuva.ranges.map(range=>range.bookId),['hos','mic']);assert.equal(shuva.verses,12);
  assert.deepEqual(mincha.ranges.map(range=>range.bookId),['jon','mic']);assert.equal(mincha.verses,51);
  assert.match(shuva.ranges[0].relatedSource.units[0].unit.reason,/Shabbat Shuva/);
  const r=record('2022-04'),item=JSON.parse(r.raw).items.find(item=>item.haft?.k==='I Samuel');assert.ok(item);
  const checked=relatedReadingRanges(item,'haft',r,corpus);assert.equal(checked.ranges[0].bookId,'sam1');
  assert.equal(checked.ranges[0].relatedSource.units[0].unit.k,'I Samuel');
});

test('all five full scrolls open as contiguous text while every source chapter unit remains in provenance',()=>{
  const books=new Set();let instances=0;
  for(const r of calendarExamples)for(const item of JSON.parse(r.raw).items)if(item.megillah){
    const checked=relatedReadingRanges(item,'megillah',r,corpus);assert.equal(checked.ranges.length,1);instances++;
    const range=checked.ranges[0],book=corpus.byId.get(range.bookId);books.add(book.id);
    assert.deepEqual(range.start,{chapter:1,verse:1});assert.deepEqual(range.end,{chapter:book.chapters.length,verse:book.chapters.at(-1).verses.length});
    assert.equal(checked.verses,book.chapters.reduce((n,c)=>n+c.verses.length,0));
    assert.equal(checked.sourceUnits,book.chapters.length);
    assert.deepEqual(range.relatedSource.units.map(unit=>unit.key),book.chapters.map(chapter=>String(chapter.number)));
    assert.deepEqual(range.relatedSource.selection,{first:0,last:book.chapters.length-1});
  }
  assert.equal(instances,9);assert.deepEqual([...books].sort(),['ecc','est','lam','rut','sng']);
});

test('ErevPurim remains a separate Megillah service with complete Esther text and its own source identity',()=>{
  const checked=prepare('2024-03','2024-03-23','megillah','Israel','Erev Purim');
  assert.equal(checked.readingType,'megillah');assert.equal(checked.ranges[0].bookId,'est');assert.equal(checked.sourceUnits,10);
  assert.equal(checked.verses,167);assert.equal(checked.ranges[0].relatedSource.serviceName.en,'Erev Purim');
  assert.equal(checked.item.fullkriyah,undefined);
});

test('related provenance survives v3 sharing independently of personal key/speed/range and unsupported music is never supplied',()=>{
  const checked=prepare('2022-10','2022-10-01');
  const saved=createRepertoireAssignment('Source haftarah','haftarah',checked.ranges,{melodyId:PRINTED_SCORE.id,view:'parallel',tempo:53,transpose:4,rangeLow:48,rangeHigh:72},corpus);
  const loaded=parseRepertoireAssignment(JSON.stringify(saved),corpus);
  assert.equal(saved.format,'tropetrain-assignment-v3');
  assert.throws(()=>parseRepertoireAssignment(JSON.stringify({...saved,format:'tropetrain-assignment-v2'}),corpus),/requires assignment v3/);
  assert.deepEqual(loaded.sections,saved.sections);assert.equal(loaded.musicalPreferences.melodyId,PRINTED_SCORE.id);assert.equal(loaded.musicalPreferences.pronunciationId,null);
  for(const key of ['tempo','transpose','rangeLow','rangeHigh']){assert.equal(key in loaded,false);assert.equal(key in loaded.musicalPreferences,false);assert.equal(key in loaded.displayPreferences,false);}
  const model=createReadingModel(corpus.passage(loaded.sections),{melodyId:PRINTED_SCORE.id});assert.equal(model.events.length,0);assert.throws(()=>model.buildPlan(0,0),/No notes are substituted/);
});

test('import refuses altered boundaries, count/order/selection tampering and contradictory source claims',()=>{
  const checked=prepare('2022-04','2022-04-16'),base=checked.ranges[0];
  const bad=[
    range=>range.start.verse++,range=>range.relatedSource.units[0].unit.v++,range=>range.relatedSource.units.reverse(),
    range=>range.relatedSource.selection.last=1,range=>range.relatedSource.variant='unsupported',range=>range.relatedSource.readingType='megillah',
    range=>range.relatedSource.serviceDate='2022-02-31',range=>range.relatedSource.sha256='not-a-hash',
    range=>range.relatedSource.reportedTotal={field:'haftaraNumV',value:999}
  ];
  for(const mutate of bad){const range=structuredClone(base);mutate(range);assert.throws(()=>corpus.range(range));}
  const divisionSource={provider:'Hebcal.com',url:checked.record.url,sha256:checked.record.sha256,retrieved:checked.record.retrieved,serviceDate:checked.item.date,region:checked.record.region,cycle:'fullkriyah',aliyah:'1'};
  assert.throws(()=>corpus.range({...base,divisionSource}),/Torah aliyah provenance/);
  const noRelated=structuredClone(base);delete noRelated.relatedSource;assert.throws(()=>corpus.range({...noRelated,divisionSource}),/Torah aliyah provenance/);
});

test('ambiguous citations, unknown source books, absent counts and oversized discontinuous selections never produce replacements',()=>{
  const r=record('2022-04'),original=reading(r,'2022-04-16');
  const textOnly=structuredClone(original);delete textOnly.haft;assert.ok(relatedReadingChoices(textOnly).some(choice=>choice.field==='haft'));
  assert.throws(()=>relatedReadingRanges(textOnly,'haft',r,corpus),/no passage boundaries/);
  for(const unit of [{k:'Unknown Samuel',b:'1:1',e:'1:1',v:1},{k:'Isaiah',b:'1:1',e:'1:1'},{k:'Isaiah',b:'1:1',e:'1:1',v:2},{k:'Isaiah',b:'1:1a',e:'1:1',v:1}])
    assert.throws(()=>relatedReadingRanges({...original,haft:unit},'haft',r,corpus));
  const megillah={1:{k:'Ruth',b:'1:1',e:'1:1',v:1},2:{k:'Ruth',b:'1:3',e:'1:3',v:1},3:{k:'Ruth',b:'1:5',e:'1:5',v:1}};
  assert.throws(()=>relatedReadingRanges({...original,megillah},'megillah',r,corpus),/between 1 and 2/);
});

test('overlapping source passages stay separate occurrences and cannot be forced into one merged range',()=>{
  const r=record('2022-06'),item=reading(r,'2022-06-06');
  const megillah={1:{k:'Ruth',b:'1:1',e:'1:3',v:3},2:{k:'Ruth',b:'1:2',e:'1:4',v:3}};
  const checked=relatedReadingRanges({...item,megillah},'megillah',r,corpus);assert.equal(checked.ranges.length,2);
  const p=corpus.passage(checked.ranges),words=p.verses.flatMap(v=>v.words);
  assert.equal(new Set(words.map(w=>w.id)).size,words.length);assert.ok(new Set(words.map(w=>w.sourceWordId)).size<words.length);
  const forced=structuredClone(checked.ranges[0]);forced.end={chapter:1,verse:4};forced.relatedSource.selection.last=1;
  assert.throws(()=>corpus.range(forced),/Discontinuous source units/);
});

test('the committed related-reading audit names every exact source response and all supported/refused selections',()=>{
  const report=JSON.parse(readFileSync(new URL('../docs/CALENDAR-RELATED-AUDIT.json',import.meta.url),'utf8'));
  assert.equal(report.choices,100);assert.equal(report.checked,98);assert.equal(report.referenceOnly,2);
  assert.deepEqual(report.sourceRecords,calendarExamples.map(({file,sha256,url})=>({file,sha256,url})));
  assert.equal(report.selections.length,100);
  const refused=report.selections.filter(selection=>selection.status==='reference_only');assert.equal(refused.length,2);
  assert.ok(refused.every(selection=>selection.sourceCitation==='I Kings 9:2-9, 9:4-5a'));
});
