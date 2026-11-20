import {CalendarStore,readingDivisions,calendarRanges} from './calendar.js';
const el=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
export function mountCalendar({getCorpus,onOpen}){
  const $=id=>document.getElementById(id);let storage;try{storage=localStorage;}catch{}
  const store=new CalendarStore({storage}),month=$('calendar-month'),region=$('calendar-region'),cycle=$('calendar-cycle'),list=$('calendar-readings'),status=$('calendar-status');
  const now=new Date();month.value=`${String(now.getFullYear()).padStart(4,'0')}-${String(now.getMonth()+1).padStart(2,'0')}`;
  let record=null,controller=null,generation=0;
  function clear(){generation++;controller?.abort();record=null;list.replaceChildren();$('calendar-source').textContent='';status.textContent='Choose Load month, or try one of the bundled examples. Your open reading stays available.';}
  function render(){
    list.replaceChildren();if(!record)return;
    const data=record.data;
    $('calendar-source').textContent=`${record.origin} · ${record.region} · retrieved ${record.retrieved} · SHA-256 ${record.sha256}`;
    if(!data.items.length){status.textContent='The source returned no Torah readings in this month.';return;}
    status.textContent=`${data.items.length} reading services · ${record.region}. Choose a service and aliyah; the calendar does not select a melody.`;
    for(const item of data.items){
      const row=el('details',undefined,'calendar-reading');const summary=el('summary',`${item.date} · ${item.hdate} · ${item.name.en}`);row.append(summary);
      if(item.name.he){const he=el('p',item.name.he,'calendar-hebrew');he.lang='he';he.dir='rtl';row.append(he);}
      row.append(el('p',item.summary?`Full reading overview: ${item.summary}`:'Weekday Torah reading','muted'));
      const sourceNotes=[item.reason,item.note].filter(x=>typeof x==='string');for(const note of sourceNotes)row.append(el('p',note,'muted'));
      let divisions;try{divisions=readingDivisions(item,cycle.value);}catch(error){row.append(el('p',error.message,'calendar-error'));}
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
            if(activeGeneration!==generation)return;await onOpen(ranges,`${item.name.en} · ${item.date} · ${divisions.label}`);status.textContent=`Opened ${item.name.en} · ${item.date} · ${ranges.length} section${ranges.length===1?'':'s'}. Musical source, personal key and tempo are kept. No audio started.`;
          }catch(error){if(activeGeneration===generation)status.textContent=error.message;}finally{button.disabled=false;}
        });controls.append(label,button);row.append(controls);
      }
      const refs=el('div',undefined,'calendar-related');
      for(const [field,title] of [['haftara','Haftarah (source default)'],['sephardic','Haftarah · Sephardic variant'],['chabad','Haftarah · Chabad variant'],['triHaftara','Triennial haftarah'],['megillah','Megillah']]){
        const value=item[field];if(typeof value==='string')refs.append(el('p',`${title}: ${value}`));
        else if(value&&typeof value==='object'){
          const units=Array.isArray(value)?value:value.k?[value]:Object.values(value);
          refs.append(el('p',`${title}: ${units.map(u=>`${u.k??''} ${u.b??''}–${u.e??''}`).join('; ')}`));
        }
      }
      if(refs.childNodes.length){refs.append(el('p','Related references only; these books and their melodies are not yet available in the reader. Partial verses and source ordering are retained.','muted'));row.append(refs);}
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
  $('calendar-form').addEventListener('submit',e=>{e.preventDefault();load();});
  $('calendar-refresh').addEventListener('click',()=>load({refresh:true}));
  for(const input of [month,region])input.addEventListener('change',clear);
  cycle.addEventListener('change',()=>{if(record){generation++;render();}});
  for(const button of document.querySelectorAll('[data-calendar-example]'))button.addEventListener('click',()=>{month.value=button.dataset.calendarExample;load();});
}
