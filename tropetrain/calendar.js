import {calendarExamples} from './calendar-example-data.js';

export const CALENDAR_SOURCE=Object.freeze({provider:'Hebcal.com',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',documentation:'https://www.hebcal.com/home/4277/leyning-torah-reading-api'});
const BOOKS={Genesis:'gen',Exodus:'exo',Leviticus:'lev',Numbers:'num',Deuteronomy:'deu'};
export function monthRequest(month,region){
  if(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||Number(month.slice(0,4))<1)throw Error('Choose a Gregorian month between years0001 and9999.');
  if(!['Diaspora','Israel'].includes(region))throw Error('Choose Israel or Diaspora.');
  const [year,m]=month.split('-').map(Number),leap=year%4===0&&(year%100!==0||year%400===0);
  const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1];
  const end=month+'-'+String(days).padStart(2,'0');
  const start=month+'-01';
  const url=`https://www.hebcal.com/leyning?cfg=json&start=${start}&end=${end}&i=${region==='Israel'?'on':'off'}`;
  return {month,region,start,end,url,key:month+'/'+region};
}
export function parseCalendarResponse(raw,request){
  if(typeof raw!=='string'||raw.length>1_000_000)throw Error('Calendar response is too large.');
  let data;try{data=JSON.parse(raw);}catch{throw Error('Calendar response is not valid JSON.');}
  if(data?.range?.start!==request.start||data?.range?.end!==request.end||data?.location!==request.region||!Array.isArray(data.items)||data.items.length>200)throw Error('Calendar response has a different date range or schedule.');
  for(const item of data.items){
    if(!item||typeof item!=='object'||typeof item.date!=='string'||item.date<request.start||item.date>request.end||!/^\d{4}-\d{2}-\d{2}$/.test(item.date)||!item.name||typeof item.name.en!=='string'||!item.name.en||item.name.en.length>200||typeof item.hdate!=='string')throw Error('Calendar contains an invalid reading record.');
    if(!['fullkriyah','weekday','triennial','megillah','haft'].some(key=>item[key]&&typeof item[key]==='object')&&typeof item.haftara!=='string')throw Error('A calendar record has no Torah divisions or related reading references.');
  }
  return data;
}
export function readingDivisions(item,cycle){
  if(!['annual','triennial'].includes(cycle))throw Error('Choose an annual or triennial cycle.');
  let field,label;
  if(item.weekday){field='weekday';label='Weekday divisions';}
  else if(cycle==='triennial'&&item.type==='shabbat'){
    if(!item.triennial)throw Error('The source has no triennial divisions for this reading.');
    field='triennial';label=`Triennial · year ${item.triYear??'unspecified'}`;
  }else{field='fullkriyah';label=item.type==='shabbat'?'Annual divisions':'Festival / special divisions';}
  const units=item[field];if(!units||typeof units!=='object'||Array.isArray(units))throw Error('Related reading only: the source has no Torah divisions for this service.');
  const keys=Object.keys(units);
  if(!keys.length||keys.some(key=>!/^([1-9]|M)$/.test(key)))throw Error('This source division structure is not supported; no ranges were substituted.');
  const entries=keys.sort((a,b)=>a==='M'?1:b==='M'?-1:Number(a)-Number(b)).map(key=>({key,label:key==='M'?'Maftir':`Aliyah ${key}`,unit:units[key]}));
  return {field,label,entries};
}
export function calendarRanges(item,cycle,record,corpus,onlyKey=null){
  const divisions=readingDivisions(item,cycle);
  const entries=onlyKey===null?divisions.entries:divisions.entries.filter(e=>e.key===onlyKey);
  if(!entries.length)throw Error('Choose an available aliyah.');
  return entries.map(({key,label,unit})=>{
    const point=value=>{if(typeof value!=='string'||!/^\d+:\d+$/.test(value))throw Error('Partial-verse divisions cannot yet be opened without losing source boundaries.');const [chapter,verse]=value.split(':').map(Number);return {chapter,verse};};
    if(!unit||!BOOKS[unit.k])throw Error('This division needs a book outside the current Torah library.');
    const range=corpus.range({id:`hebcal-${item.date.replaceAll('-','')}-${record.region.toLowerCase()}-${divisions.field}-${key}`,bookId:BOOKS[unit.k],start:point(unit.b),end:point(unit.e),label:`${item.name.en} · ${label}`});
    const actual=corpus.passage([range]).verses.length;
    if(!Number.isInteger(unit.v)||unit.v!==actual)throw Error(`${unit.k} ${unit.b}–${unit.e}: source verse count differs from UXLC. Review the edition numbering before opening.`);
    range.divisionSource={provider:'Hebcal.com',url:record.url,sha256:record.sha256,retrieved:record.retrieved,serviceDate:item.date,region:record.region,cycle:divisions.field,aliyah:key};
    return range;
  });
}
export async function calendarHash(raw){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));return Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
}
export class CalendarStore{
  constructor({fetcher=globalThis.fetch?.bind(globalThis),storage=null,examples=calendarExamples,now=()=>new Date().toISOString()}={}){this.fetcher=fetcher;this.storage=storage;this.examples=examples;this.now=now;this.memory=new Map();}
  async checked(record,request,origin){
    if(record.url!==request.url||record.region!==request.region||record.month!==request.month||await calendarHash(record.raw)!==record.sha256)throw Error('Saved calendar data failed its source checksum.');
    return {...record,data:parseCalendarResponse(record.raw,request),origin};
  }
  async load(month,region,{refresh=false,signal}={}){
    const request=monthRequest(month,region);let damaged=false;
    if(!refresh){
      let saved=this.memory.get(request.key);try{saved??=JSON.parse(this.storage?.getItem('tropetrain-calendar-v1/'+request.key)||'null');}catch{damaged=true;}
      if(saved)try{return await this.checked(saved,request,'Saved on this device');}catch{damaged=true;}
      const example=this.examples.find(x=>x.month===month&&x.region===region);
      if(example)return this.checked(example,request,'Bundled source example');
    }
    let response;
    try{response=await this.fetcher(request.url,{signal,credentials:'omit',referrerPolicy:'no-referrer'});}catch(error){if(signal?.aborted)throw error;throw Error(`${damaged?'Saved data failed validation. ':''}Could not load this month. Connect to the internet or choose a bundled example. Your open reading is kept.`);}
    if(!response.ok)throw Error(`Calendar service returned HTTP${response.status}. Your open reading is kept.`);
    const raw=await response.text();parseCalendarResponse(raw,request);
    const record={month,region,url:request.url,raw,sha256:await calendarHash(raw),retrieved:this.now()};
    this.memory.set(request.key,record);while(this.memory.size>12)this.memory.delete(this.memory.keys().next().value);
    let persisted=false;
    try{if(this.storage){const indexKey='tropetrain-calendar-months-v1';const old=JSON.parse(this.storage.getItem(indexKey)||'[]');const keys=[request.key,...(Array.isArray(old)?old:[]).filter(x=>typeof x==='string'&&x!==request.key)].slice(0,12);for(const key of old)if(!keys.includes(key))this.storage.removeItem('tropetrain-calendar-v1/'+key);this.storage.setItem('tropetrain-calendar-v1/'+request.key,JSON.stringify(record));this.storage.setItem(indexKey,JSON.stringify(keys));persisted=true;}}catch{}
    return {...record,data:parseCalendarResponse(raw,request),origin:persisted?'Loaded from Hebcal · saved on this device':'Loaded from Hebcal · memory only'};
  }
}
