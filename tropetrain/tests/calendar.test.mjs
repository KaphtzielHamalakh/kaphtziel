import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CalendarStore,calendarHash,monthRequest,parseCalendarResponse,readingDivisions,calendarRanges} from '../calendar.js';
import {calendarExamples} from '../calendar-example-data.js';
import {getCorpus,createAssignment,parseAssignment} from '../library.js';
import {createReadingModel} from '../music.js';
const corpus=await getCorpus();
const example=(month,region)=>calendarExamples.find(x=>x.month===month&&x.region===region);
const item=(record,date)=>JSON.parse(record.raw).items.find(x=>x.date===date);

test('Gregorian boundaries include century exceptions and early/final supported years',()=>{
 for(const [month,end] of [['0001-02','28'],['0004-02','29'],['0100-02','28'],['0400-02','29'],['1900-02','28'],['2000-02','29'],['2024-02','29'],['2026-02','28'],['9999-02','28'],['9999-12','31']])assert.equal(monthRequest(month,'Israel').end,month+'-'+end);
 for(const bad of ['0000-01','2026-13','2026-00','2026-1','10000-01','2026-02-01'])assert.throws(()=>monthRequest(bad,'Israel'));
 assert.throws(()=>monthRequest('2026-01','unknown'));
});
test('all four primary calendar examples preserve source bytes, checksums and usable Torah divisions',async()=>{
 const source=JSON.parse(await readFile(new URL('../docs/CALENDAR-SOURCES.json',import.meta.url)));
 for(const record of calendarExamples){
  assert.equal(await calendarHash(record.raw),record.sha256);
  assert.equal(await readFile(new URL('../'+record.file,import.meta.url),'utf8'),record.raw);
  assert.equal(source.bundled.find(x=>x.file===record.file).sha256,record.sha256);
  const data=parseCalendarResponse(record.raw,monthRequest(record.month,record.region));assert(data.items.length>=16);
  for(const reading of data.items)for(const cycle of ['annual','triennial']){
   const ranges=calendarRanges(reading,cycle,record,corpus);
   assert(ranges.length>=3);assert.equal(ranges.length,readingDivisions(reading,cycle).entries.length);
   for(const range of ranges){assert.equal(range.divisionSource.sha256,record.sha256);assert.equal(corpus.range(range).divisionSource.serviceDate,reading.date);}
  }
 }
});
test('Israel/Diaspora festival divergence and later doubled portion stay distinct',()=>{
 const il=example('2022-04','Israel'),dias=example('2022-04','Diaspora');
 assert.equal(item(il,'2022-04-23').name.en,'Achrei Mot');assert.equal(item(dias,'2022-04-23').name.en,'Pesach VIII (on Shabbat)');
 const july=example('2022-07','Diaspora'),israel=example('2022-07','Israel');
 assert.deepEqual(item(july,'2022-07-30').parshaNum,[42,43]);assert.equal(item(july,'2022-07-30').name.en,'Matot-Masei');assert.equal(item(israel,'2022-07-30').name.en,'Masei');
 const tri=calendarRanges(item(july,'2022-07-30'),'triennial',july,corpus);
 assert.deepEqual(tri[0].start,{chapter:33,verse:50});assert.deepEqual(tri.at(-1).start,{chapter:36,verse:10});assert.notDeepEqual(tri[0].start,calendarRanges(item(july,'2022-07-30'),'annual',july,corpus)[0].start);
});
test('festival books, repeated Maftir IDs and source provenance survive assignment sharing',()=>{
 const record=example('2022-04','Diaspora'),ranges=calendarRanges(item(record,'2022-04-16'),'annual',record,corpus);
 assert(ranges.some(r=>r.bookId==='exo'));assert.equal(ranges.at(-1).bookId,'num');
 const july=example('2022-07','Diaspora'),repeated=calendarRanges(item(july,'2022-07-30'),'annual',july,corpus);
 const p=corpus.passage(repeated),words=p.verses.flatMap(v=>v.words),instances=words.filter(w=>w.sourceWordId==='num-36-11-1');
 assert.equal(instances.length,2);assert.equal(new Set(instances.map(w=>w.id)).size,2);
 const assignment=createAssignment('Calendar source',repeated,{melodyId:'cohen-1902-gen22-ending',view:'parallel',scrollLayout:true});
 const restored=parseAssignment(JSON.stringify(assignment),corpus);assert.deepEqual(restored.sections,repeated);assert.equal(restored.musicalPreferences.melodyId,'cohen-1902-gen22-ending');assert.equal(restored.displayPreferences.scrollLayout,true);
 assert.throws(()=>createReadingModel(p,{melodyId:'cohen-1902-gen22-ending'}).buildPlan(0,1),/covers only/);
});
test('standalone retains the calendar evidence and all four independently checksummed examples',async()=>{
 const html=await readFile(new URL('../TropeTrain.html',import.meta.url),'utf8');
 const raw=await readFile(new URL('../docs/CALENDAR-SOURCES.json',import.meta.url));
 assert(html.includes('data:application/json;base64,'+raw.toString('base64')));
 for(const record of calendarExamples)assert(html.includes(record.sha256));
 assert(!html.includes('href="./docs/CALENDAR-SOURCES.json"'));
});
test('calendar refuses wrong schedules, missing triennial, altered counts and partial verses',()=>{
 const r=example('2022-07','Diaspora'),reading=item(r,'2022-07-30');
 assert.throws(()=>parseCalendarResponse(r.raw,monthRequest(r.month,'Israel')),/different/);
 assert.throws(()=>readingDivisions({...reading,triennial:null},'triennial'),/no triennial/);
 const bad=structuredClone(reading);bad.fullkriyah['7'].v++;
 assert.throws(()=>calendarRanges(bad,'annual',r,corpus),/verse count/);
 bad.fullkriyah['7'].e='36:13a';assert.throws(()=>calendarRanges(bad,'annual',r,corpus),/Partial-verse/);
 assert.throws(()=>calendarRanges(reading,'annual',r,corpus,'8'),/available aliyah/);
});
const fakeStorage=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key),values};};
test('bundled data needs no network; saved responses are checksum-checked on offline reload',async()=>{
 let calls=0;const r=example('2022-07','Diaspora'),storage=fakeStorage();
 const store=new CalendarStore({storage,fetcher:async()=>{calls++;return {ok:true,text:async()=>r.raw};},now:()=> '2026-11-20'});
 assert.equal((await store.load(r.month,r.region)).origin,'Bundled source example');assert.equal(calls,0);
 assert.match((await store.load(r.month,r.region,{refresh:true})).origin,/saved on this device/);assert.equal(calls,1);
 const offline=new CalendarStore({storage,examples:[],fetcher:async()=>{throw Error('offline');}});assert.equal((await offline.load(r.month,r.region)).sha256,r.sha256);
 const key='tropetrain-calendar-v1/'+r.month+'/'+r.region;const altered=JSON.parse(storage.getItem(key));altered.raw=altered.raw.replace('Matot-Masei','Altered');storage.setItem(key,JSON.stringify(altered));
 await assert.rejects(new CalendarStore({storage,examples:[],fetcher:async()=>{throw Error('offline');}}).load(r.month,r.region),/failed validation/);
});
test('failed and malformed refreshes preserve the last verified cache',async()=>{
 const r=example('2022-07','Diaspora'),storage=fakeStorage();let fail=false;
 const store=new CalendarStore({storage,examples:[],fetcher:async()=>fail?{ok:true,text:async()=>'{}'}:{ok:true,text:async()=>r.raw}});
 await store.load(r.month,r.region);fail=true;await assert.rejects(store.load(r.month,r.region,{refresh:true}),/different/);
 assert.equal((await store.load(r.month,r.region)).sha256,r.sha256);
 await assert.rejects(new CalendarStore({examples:[],fetcher:async()=>({ok:false,status:429})}).load('2026-11','Israel'),/HTTP429/);
});
