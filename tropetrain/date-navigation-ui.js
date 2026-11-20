import {HebrewDateNavigator} from './hebrew-date.js';
export function mountDateNavigation({onFindDate}){
  const $=id=>document.getElementById(id),civil=$('service-date'),year=$('hebrew-year'),month=$('hebrew-month'),day=$('hebrew-day'),message=$('date-navigation-status');let navigator,yearData;
  const readyMessage='Date conversion stays on this device. Find readings loads the chosen service month when it is not already saved.';
  function showCivil(){try{const value=navigator.fromGregorian(civil.value);$('civil-hebrew-date').textContent=value.label;message.textContent=readyMessage;}catch(error){$('civil-hebrew-date').textContent=error.message;}}
  function showHebrew(){try{const value=navigator.fromHebrew(yearData.year,month.value,day.value);$('hebrew-civil-date').textContent=`Civil service date: ${value.iso}`;message.textContent=readyMessage;}catch(error){$('hebrew-civil-date').textContent=error.message;}}
  function fillDays(preferred=day.value){
    day.replaceChildren();const days=yearData.months.find(m=>m.id===month.value)?.days||[];
    const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose a day';day.append(placeholder);
    for(const value of days){const option=document.createElement('option');option.value=value.day;option.textContent=value.day;day.append(option);}
    if(days.some(x=>String(x.day)===String(preferred)))day.value=preferred;showHebrew();
  }
  function showYear(preferredMonth=month.value,preferredDay=day.value){
    const next=navigator.year(year.value);yearData=next;month.replaceChildren();
    const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose a month';month.append(placeholder);
    for(const value of next.months){const option=document.createElement('option');option.value=value.id;const partial=value.days[0].day!==1||(next.partialEnd&&value===next.months.at(-1));option.textContent=`${value.label} · ${value.days.length}${partial?' supported days · partial':' days'}`;month.append(option);}
    if(next.months.some(x=>x.id===preferredMonth))month.value=preferredMonth;
    fillDays(preferredDay);$('hebrew-year-summary').textContent=`${next.year} · ${next.months.length} months · ${next.days} supported days · ${next.start} to ${next.end}${next.partialStart||next.partialEnd?' · partial boundary year':''}`;
    message.textContent=readyMessage;
  }
  const now=new Date(),today=`${String(now.getFullYear()).padStart(4,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;civil.value=today;
  try{navigator=new HebrewDateNavigator();const value=navigator.fromGregorian(today);year.value=value.year;showYear(value.month,value.day);showCivil();}
  catch(error){message.textContent=error.message;for(const id of ['hebrew-year','show-hebrew-year','hebrew-month','hebrew-day','find-hebrew-date'])$(id).disabled=true;}
  civil.addEventListener('change',()=>{if(navigator)showCivil();});
  $('civil-date-form').addEventListener('submit',e=>{e.preventDefault();try{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(civil.value)||civil.value<'0001-01-01'||civil.value>'9999-12-31')throw Error('Choose an existing civil service date.');
    const date=new Date(civil.value+'T12:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==civil.value)throw Error('This civil date does not exist.');
    if(navigator)showCivil();onFindDate(civil.value);
  }catch(error){message.textContent=error.message;}});
  $('hebrew-year-form').addEventListener('submit',e=>{e.preventDefault();try{showYear();}catch(error){message.textContent=error.message;}});
  month.addEventListener('change',()=>{if(yearData)fillDays();});day.addEventListener('change',showHebrew);
  $('hebrew-date-form').addEventListener('submit',e=>{e.preventDefault();try{
    if(Number(year.value)!==yearData?.year)throw Error('Choose Show Hebrew year to apply the edited year first.');
    const value=navigator.fromHebrew(yearData.year,month.value,day.value);civil.value=value.iso;showCivil();onFindDate(value.iso);
  }catch(error){message.textContent=error.message;}});
}
