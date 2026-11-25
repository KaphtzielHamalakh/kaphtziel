import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {HebrewDateNavigator,DATE_LIMITS} from '../hebrew-date.js';
const navigator=new HebrewDateNavigator();
const sources=JSON.parse(await readFile(new URL('../docs/HEBREW-DATE-SOURCES.json',import.meta.url)));
const expected=[];
for(const entry of sources.fixtures){
 const raw=await readFile(new URL('../'+entry.file,import.meta.url)),data=JSON.parse(raw);
 if(data.hdates)for(const [iso,value] of Object.entries(data.hdates))expected.push({iso,year:value.hy,month:value.hm,day:value.hd});
 else expected.push({iso:`${String(data.gy).padStart(4,'0')}-${String(data.gm).padStart(2,'0')}-${String(data.gd).padStart(2,'0')}`,year:data.hy,month:data.hm,day:data.hd});
}
test('all577 independent primary conversion examples agree in both directions',()=>{
 assert.equal(expected.length,577);
 for(const value of expected){
  const actual=navigator.fromGregorian(value.iso);assert.deepEqual({iso:actual.iso,year:actual.year,month:actual.month,day:actual.day},value);
  assert.equal(navigator.fromHebrew(value.year,value.month,value.day).iso,value.iso);
 }
});
test('date source responses and offline source pack preserve original bytes and notices',async()=>{
 for(const entry of sources.fixtures){const raw=await readFile(new URL('../'+entry.file,import.meta.url));assert.equal(raw.length,entry.bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),entry.sha256);}
 const raw=await readFile(new URL('../'+sources.sourcePack.file,import.meta.url));assert.equal(raw.length,sources.sourcePack.bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),sources.sourcePack.sha256);
 const root=fileURLToPath(new URL('../',import.meta.url));
 const check=execFileSync('python3',['-c',`import json,zipfile,pathlib,sys
r=pathlib.Path(sys.argv[1]);s=json.loads((r/'docs/HEBREW-DATE-SOURCES.json').read_text())
with zipfile.ZipFile(r/s['sourcePack']['file']) as z:
 assert len(z.namelist())==8
 for e in s['fixtures']:assert z.read(pathlib.Path(e['file']).name)==(r/e['file']).read_bytes()
 assert json.loads(z.read('SOURCES.json'))['license']=='CC BY4.0'
print('verified')`,root],{encoding:'utf8'});assert.equal(check.trim(),'verified');
});
test('complete Metonic cycle has consecutive day/month/year boundaries without automatic rollover',()=>{
 const lengths=new Set();
 for(let year=5780;year<5799;year++){
  const value=navigator.year(year);assert.equal(value.partialStart,false);assert.equal(value.partialEnd,false);assert([12,13].includes(value.months.length));assert([353,354,355,383,384,385].includes(value.days));lengths.add(value.days);
  const dates=value.months.flatMap(m=>{assert([29,30].includes(m.days.length));assert.equal(m.days[0].day,1);return m.days;});
  assert.equal(dates.length,value.days);
  for(let i=1;i<dates.length;i++)assert.equal(Date.parse(dates[i].iso)-Date.parse(dates[i-1].iso),86400000);
  assert.equal(Date.parse(navigator.year(year+1).start)-Date.parse(value.end),86400000);
  for(const month of value.months){assert.equal(navigator.fromHebrew(year,month.id,month.days.length).iso,month.days.at(-1).iso);if(month.days.length===29)assert.throws(()=>navigator.fromHebrew(year,month.id,30),/does not exist/);}
 }
 assert.equal(lengths.size,6);
});
test('AdarI/II and named service dates retain exact calendar identities',()=>{
 const leap=navigator.year(5784);assert.equal(leap.months.length,13);assert(leap.months.some(m=>m.id==='Adar I'));assert(leap.months.some(m=>m.id==='Adar II'));assert(!leap.months.some(m=>m.id==='Adar'));
 assert.equal(navigator.fromHebrew(5784,'Adar I',1).iso,'2024-02-10');assert.equal(navigator.fromHebrew(5784,'Adar II',14).iso,'2024-03-24');assert.equal(navigator.fromHebrew(5782,'Av',2).iso,'2022-07-30');assert.equal(navigator.fromHebrew(5782,'Nisan',22).iso,'2022-04-23');
 assert.throws(()=>navigator.fromHebrew(5786,'Adar I',1),/does not exist/);
});
test('partial boundary years and invalid civil/Hebrew dates refuse unsupported rollover',()=>{
 const first=navigator.year(3761),last=navigator.year(13760);assert(first.partialStart);assert(last.partialEnd);assert.equal(first.start,DATE_LIMITS.first);assert.equal(last.end,DATE_LIMITS.last);assert.equal(first.months[0].days[0].day,18);assert.equal(last.months.at(-1).days.at(-1).day,28);
 assert.throws(()=>navigator.fromHebrew(3761,'Tevet',17),/does not exist/);assert.throws(()=>navigator.fromHebrew(13760,'Cheshvan',29),/does not exist/);
 for(const iso of ['0000-01-01','10000-01-01','2024-02-30','1900-02-29','2026-13-01','2026-01-00','2026-1-1'])assert.throws(()=>navigator.fromGregorian(iso));
 for(const year of [0,3760,13761,5784.5])assert.throws(()=>navigator.year(year));
 for(const day of [-1,0,31,2.5,'2x'])assert.throws(()=>navigator.fromHebrew(5784,'Adar II',day));
});
test('unsupported or contradictory browser calendars disable Hebrew navigation explicitly',()=>{
 class Unsupported{resolvedOptions(){return {calendar:'gregory'};}}
 assert.throws(()=>new HebrewDateNavigator({DateTimeFormat:Unsupported}),/Civil month lookup remains/);
 class Contradictory{resolvedOptions(){return {calendar:'hebrew'};}formatToParts(){return [{type:'year',value:'5784'},{type:'month',value:'Adar I'},{type:'day',value:'1'}];}}
 assert.throws(()=>new HebrewDateNavigator({DateTimeFormat:Contradictory}),/differs from the checked/);
});
test('standalone embeds date evidence and the original comparison source pack',async()=>{
 const html=restoredPortableHtml(await readFile(new URL('../TropeTrain.html',import.meta.url),'utf8'));
 const evidence=await readFile(new URL('../docs/HEBREW-DATE-SOURCES.json',import.meta.url));const pack=await readFile(new URL('../'+sources.sourcePack.file,import.meta.url));
 assert(html.includes('data:application/json;base64,'+evidence.toString('base64')));assert(html.includes('data:application/zip;base64,'+pack.toString('base64')));
});
