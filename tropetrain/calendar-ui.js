import {CalendarStore,readingDivisions,calendarRanges} from './calendar.js';
import {mountDateNavigation} from './date-navigation-ui.js';
import {calendarRelatedPanel} from './calendar-related-ui.js';
const el=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
export function mountCalendar({getCorpus,getReadingCorpus=getCorpus,onOpen}){
  const $=id=>document.getElementById(id);let storage;try{storage=localStorage;}catch{}
  const store=new CalendarStore({storage}),month=$('calendar-month'),region=$('calendar-region'),cycle=$('calendar-cycle'),list=$('calendar-readings'),status=$('calendar-status');
  const now=new Date();month.value=`${String(now.getFullYear()).padStart(4,'0')}-${String(now.getMonth()+1).padStart(2,'0')}`;
  let record=null,controller=null,generation=0,filterDate='';
  function clear(){generation++;controller?.abort();record=null;filterDate='';$('calendar-whole-month').hidden=true;list.replaceChildren();$('calendar-source').textContent='';status.textContent='Choose Load month, find a service date, or try a bundled example. Your open reading stays available.';}
  function render(){
    list.replaceChildren();if(!record)return;
    const data=record.data;
    $('calendar-source').textContent=`${record.origin} · ${record.region} · retrieved ${record.retrieved} · SHA-256 ${record.sha256}`;
    const items=filterDate?data.items.filter(item=>item.date===filterDate):data.items;
    $('calendar-whole-month').hidden=!filterDate;
    if(!items.length){status.textContent=filterDate?`No scheduled reading service for ${filterDate} in this source’s ${record.region} schedule. Show the whole month to choose another service.`:'The source returned no reading services in this month.';return;}
    status.textContent=`${items.length} reading service${items.length===1?'':'s'} · ${filterDate||record.month} · ${record.region}. Choose Torah divisions or a related text; the calendar does not select a melody.`;
    for(const item of items){
      const row=el('details',undefined,'calendar-reading');const summary=el('summary',`${item.date} · ${item.hdate} · ${item.name.en}`);row.append(summary);
      if(item.name.he){const he=el('p',item.name.he,'calendar-hebrew');he.lang='he';he.dir='rtl';row.append(he);}
      row.append(el('p',item.summary?`Full reading overview: ${item.summary}`:item.weekday?'Weekday Torah reading':'Related reading service','muted'));
      const sourceNotes=[item.reason,item.note].filter(x=>typeof x==='string');for(const note of sourceNotes)row.append(el('p',note,'muted'));
      let divisions;try{divisions=readingDivisions(item,cycle.value);}catch(error){row.append(el('p',error.message,item.fullkriyah||item.weekday?'calendar-error':'muted'));}
      if(divisions){
        row.append(el('p',divisions.label,'calendar-cycle-label'));
        const controls=el('div',undefined,'calendar-open-controls');
        const label=el('label','Reading to open');const select=el('select');select.setAttribute('aria-label',`${item.date} ${item.name.en} aliyah`);
        const all=el('option',divisions.entries.some(e=>e.key==='M')?'All listed aliyot, including Maftir':'All listed aliyot');all.value='all';select.append(all);
        for(const entry of divisions.entries){const u=entry.unit;const option=el('option',`${entry.label} · ${u.k??'?'} ${u.b??'?'}–${u.e??'?'}`);option.value=entry.key;select.append(option);}
        label.append(select);const button=el('button','Open selected Torah reading');button.type='button';
        button.setAttribute('aria-label',`Open ${item.date} ${item.name.en}`);
        button.addEventListener('click',async()=>{
          const activeRecord=record,activeCycle=cycle.value,activeGeneration=generation;button.disabled=true;
          try{const corpus=await getCorpus();const ranges=calendarRanges(item,activeCycle,activeRecord,corpus,select.value==='all'?null:select.value);
            if(activeGeneration!==generation)return;await onOpen(ranges,`${item.name.en} · ${item.date} · ${divisions.label}`);status.textContent=`Opened ${item.name.en} · ${item.date} · ${ranges.length} section${ranges.length===1?'':'s'}. Musical source, personal key and tempo are kept. No audio started.${ranges.some(range=>range.divisionSource?.referenceMapping)?' Calendar/UXLC verse numbering is mapped explicitly; see the retained source in section details.':''}`;
          }catch(error){if(activeGeneration===generation)status.textContent=error.message;}finally{button.disabled=false;}
        });controls.append(label,button);row.append(controls);
      }
      const activeRecord=record,activeGeneration=generation;
      const refs=calendarRelatedPanel({item,record:activeRecord,getReadingCorpus,onOpen,isCurrent:()=>record===activeRecord&&generation===activeGeneration,showStatus:text=>{status.textContent=text;}});
      if(refs)row.append(refs);
      list.append(row);
    }
  }
  async function load({refresh=false}={}){
    generation++;const own=generation;controller?.abort();controller=new AbortController();const requestController=controller;record=null;list.replaceChildren();$('calendar-source').textContent='';
    const timeout=setTimeout(()=>requestController.abort(),20000);
    status.textContent=refresh?'Refreshing from Hebcal…':'Loading the requested month…';
    try{const result=await store.load(month.value,region.value,{refresh,signal:requestController.signal});if(own!==generation)return;record=result;render();}
    catch(error){if(own===generation)status.textContent=requestController.signal.aborted?'Calendar request timed out. Your open reading is kept; try a bundled example or load again.':error.message;}
    finally{clearTimeout(timeout);}
  }
  $('calendar-form').addEventListener('submit',e=>{e.preventDefault();filterDate='';load();});
  $('calendar-refresh').addEventListener('click',()=>load({refresh:true}));
  for(const input of [month,region])input.addEventListener('change',clear);
  cycle.addEventListener('change',()=>{if(record){generation++;render();}});
  for(const button of document.querySelectorAll('[data-calendar-example]'))button.addEventListener('click',()=>{month.value=button.dataset.calendarExample;if(button.dataset.calendarRegion)region.value=button.dataset.calendarRegion;filterDate='';load();});
  $('calendar-whole-month').addEventListener('click',()=>{generation++;filterDate='';render();});
  mountDateNavigation({onFindDate:iso=>{clear();month.value=iso.slice(0,7);filterDate=iso;load();}});
}
