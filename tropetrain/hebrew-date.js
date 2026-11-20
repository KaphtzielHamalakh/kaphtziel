// Original navigation around the browser's ECMA-402 Hebrew calendar.
// Civil service dates use proleptic Gregorian days in UTC, without sunset.
export const DATE_LIMITS=Object.freeze({first:'0001-01-01',last:'9999-12-31',firstHebrewYear:3761,lastHebrewYear:13760});
const DAY=86400000,MIN=Math.floor(Date.parse(DATE_LIMITS.first+'T12:00:00Z')/DAY),MAX=Math.floor(Date.parse(DATE_LIMITS.last+'T12:00:00Z')/DAY);
const MONTH_NAMES={Tishri:'Tishrei',Tishrei:'Tishrei',Heshvan:'Cheshvan',Cheshvan:'Cheshvan',Kislev:'Kislev',Tevet:'Tevet',Shevat:"Sh'vat",Shvat:"Sh'vat","Sh'vat":"Sh'vat",Adar:'Adar','Adar I':'Adar I','Adar II':'Adar II',Nisan:'Nisan',Iyar:'Iyyar',Iyyar:'Iyyar',Sivan:'Sivan',Tamuz:'Tamuz',Tammuz:'Tamuz',Av:'Av',Elul:'Elul'};
const isoDay=number=>new Date(number*DAY+DAY/2).toISOString().slice(0,10);
export class HebrewDateNavigator{
  constructor({DateTimeFormat=Intl.DateTimeFormat}={}){
    this.formatter=new DateTimeFormat('en-US-u-ca-hebrew',{timeZone:'UTC',numberingSystem:'latn',year:'numeric',month:'long',day:'numeric'});
    if(this.formatter.resolvedOptions().calendar!=='hebrew')throw Error('This browser does not provide a Hebrew calendar. Civil month lookup remains available.');
    this.years=new Map();
    for(const [iso,year,month,day] of [['0001-01-01',3761,'Tevet',18],['2022-07-30',5782,'Av',2],['2024-02-10',5784,'Adar I',1],['2024-03-11',5784,'Adar II',1],['2026-11-20',5787,'Kislev',10],['9999-12-31',13760,'Cheshvan',28]]){
      const actual=this.fromGregorian(iso);if(actual.year!==year||actual.month!==month||actual.day!==day)throw Error('This browser’s Hebrew calendar differs from the checked source examples. Civil month lookup remains available.');
    }
  }
  fromGregorian(iso){
    if(typeof iso!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(iso)||iso<DATE_LIMITS.first||iso>DATE_LIMITS.last)throw Error('Choose a civil date from0001-01-01 through9999-12-31.');
    const date=new Date(iso+'T12:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==iso)throw Error('This civil date does not exist.');
    const parts=Object.fromEntries(this.formatter.formatToParts(date).map(p=>[p.type,p.value]));
    const year=Number(parts.year),day=Number(parts.day),month=MONTH_NAMES[parts.month];
    if(!Number.isInteger(year)||!Number.isInteger(day)||day<1||day>30||!month)throw Error('This browser returned an unsupported Hebrew calendar date.');
    return {iso,year,month,day,label:`${day} ${month} ${year}`};
  }
  year(year){
    year=Number(year);if(!Number.isInteger(year)||year<DATE_LIMITS.firstHebrewYear||year>DATE_LIMITS.lastHebrewYear)throw Error('Choose a Hebrew year from3761 through13760. The first and last years are partial within the supported civil dates.');
    if(this.years.has(year))return this.years.get(year);
    const firstOf=target=>{let low=MIN,high=MAX+1;while(low<high){const mid=low+Math.floor((high-low)/2);if(this.fromGregorian(isoDay(mid)).year<target)low=mid+1;else high=mid;}return low;};
    const begin=firstOf(year),end=firstOf(year+1),months=[];
    for(let day=begin;day<end;day++){
      const value=this.fromGregorian(isoDay(day));if(value.year!==year)throw Error('The browser calendar did not return a continuous Hebrew year.');
      let month=months.at(-1);if(month?.id!==value.month){month={id:value.month,label:value.month,days:[]};months.push(month);}
      month.days.push({day:value.day,iso:value.iso});
    }
    const value={year,months,days:end-begin,partialStart:begin===MIN,partialEnd:end===MAX+1,start:isoDay(begin),end:isoDay(end-1)};
    this.years.set(year,value);while(this.years.size>4)this.years.delete(this.years.keys().next().value);
    return value;
  }
  fromHebrew(year,month,day){
    if(typeof day==='string'&&!/^\d+$/.test(day))throw Error('Choose a whole Hebrew day.');
    day=Number(day);if(!Number.isInteger(day)||day<1||day>30)throw Error('Choose an existing Hebrew day.');
    const found=this.year(year).months.find(m=>m.id===month)?.days.find(d=>d.day===day);
    if(!found)throw Error('This Hebrew date does not exist within the supported civil range. No day was rolled forward.');
    return this.fromGregorian(found.iso);
  }
}
