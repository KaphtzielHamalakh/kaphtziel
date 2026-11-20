import {relatedReadingChoices,relatedReadingRanges,relatedUnitLabel} from './calendar-related.js';
import {relatedUnits} from './related-source.js';
const el=(tag,text,className)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};

export function calendarRelatedPanel({item,record,getReadingCorpus,onOpen,isCurrent,showStatus}){
  const choices=relatedReadingChoices(item);if(!choices.length)return null;
  const panel=el('div',undefined,'calendar-related');
  panel.append(el('p','Reading variants choose passage boundaries. Melody, pronunciation, key, range and speed stay selected.','muted'));
  for(const choice of choices){
    const row=el('section',undefined,'calendar-related-reading');
    row.append(el('h4',`${choice.label}${choice.year?` · source year ${choice.year}`:''}`));
    if(choice.summary)row.append(el('p',`Source citation: ${choice.summary}`));
    try{
      const {units}=relatedUnits(choice.value),list=el('ol');
      for(const {key,unit} of units){
        const line=el('li',`${relatedUnitLabel(unit)} · source unit ${key}`);
        for(const field of ['reason','note'])if(typeof unit?.[field]==='string')line.append(el('p',unit[field],'muted'));
        list.append(line);
      }
      row.append(list);
    }catch{
      if(choice.value!==undefined&&!choice.summary)row.append(el('pre',JSON.stringify(choice.value,null,2),'calendar-raw-reference'));
    }
    const button=el('button',`Open ${choice.type==='megillah'?'Megillah':'haftarah'} text`);button.type='button';button.disabled=true;
    button.setAttribute('aria-label',`Open ${item.date} ${item.name.en} ${choice.label}`);
    const outcome=el('p','Checking the structured source against UXLC…','muted');row.append(button,outcome);panel.append(row);
    void (async()=>{
      try{
        const corpus=await getReadingCorpus(),checked=relatedReadingRanges(item,choice.field,record,corpus);if(!isCurrent())return;
        button.disabled=false;outcome.textContent=`${checked.ranges.length} tutor section${checked.ranges.length===1?'':'s'} · ${checked.verses} source verses · ${checked.sourceUnits} original source unit${checked.sourceUnits===1?'':'s'}. References match UXLC; no musical realization is added.`;
      }catch(error){if(isCurrent())outcome.textContent=`Reference only: ${error.message}`;}
    })();
    button.addEventListener('click',async()=>{
      button.disabled=true;
      try{
        const corpus=await getReadingCorpus(),checked=relatedReadingRanges(item,choice.field,record,corpus);if(!isCurrent())return;
        await onOpen(checked.ranges,`${item.name.en} · ${item.date} · ${choice.label}`,{readingType:checked.readingType});
        if(isCurrent())showStatus(`Opened ${choice.label} · ${item.date} · ${checked.ranges.length} section${checked.ranges.length===1?'':'s'}. Musical source, pronunciation and personal settings are kept. No audio started.`);
      }catch(error){if(isCurrent())showStatus(error.message);}finally{if(isCurrent())button.disabled=false;}
    });
  }
  return panel;
}
