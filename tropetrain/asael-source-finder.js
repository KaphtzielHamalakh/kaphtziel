import {ASAEL_SOURCE_CATALOG} from './asael-source-catalog-data.js';

export function sourceCatalogPortions(bookId){return ASAEL_SOURCE_CATALOG.portions.filter(p=>p.bookId===bookId);}
export function sourceCatalogReadings(portionId){return ASAEL_SOURCE_CATALOG.readings.filter(r=>r.portionId===portionId);}

export function mountAsaelSourceFinder({selectedStudy,onChooseStudy}){
  const $=id=>document.getElementById(id),catalog=ASAEL_SOURCE_CATALOG,key='tropetrain-asael-source-finder-v1';
  let saved;try{saved=JSON.parse(localStorage.getItem(key));}catch{}
  const selected=catalog.readings.find(r=>r.studyId===selectedStudy);
  let reading=selected??catalog.readings.find(r=>r.id===saved?.readingId)??catalog.readings[0];
  let portion=catalog.portions.find(p=>p.id===reading.portionId);
  const options=(id,items,value)=>{
    $(id).replaceChildren();for(const item of items){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;$(id).append(option);}$(id).value=value;
  };
  const books=[...new Map(catalog.portions.map(p=>[p.bookId,{id:p.bookId,name:p.bookName}])).values()];
  options('asael-source-book',books,portion.bookId);
  function draw(){
    options('asael-source-portion',sourceCatalogPortions(portion.bookId),portion.id);
    options('asael-source-reading',sourceCatalogReadings(portion.id),reading.id);
    const rows=reading.sourceRowIds.map(id=>catalog.rows.find(row=>row.id===id));
    $('asael-source-selection').textContent=`${portion.bookName} · ${portion.name} · ${reading.name} · ${rows.length} original ${rows.length===1?'performance':'performances'} listed. Choose this study to inspect its recorded pronunciation choices, source license and loading size.`;
    $('asael-source-page').href=portion.sourceUrl;
    try{localStorage.setItem(key,JSON.stringify({readingId:reading.id}));}catch{}
  }
  $('asael-source-count').textContent=`${catalog.counts.sourceReadings} source readings in ${catalog.counts.catalogPages} parashah catalogs, referring to ${catalog.counts.canonicalFiles} original files. Includes related Haftarah and weekday entries. This catalog does not establish complete verse coverage or word timing.`;
  $('asael-source-book').addEventListener('change',()=>{portion=sourceCatalogPortions($('asael-source-book').value)[0];reading=sourceCatalogReadings(portion.id)[0];draw();});
  $('asael-source-portion').addEventListener('change',()=>{portion=catalog.portions.find(p=>p.id===$('asael-source-portion').value);reading=sourceCatalogReadings(portion.id)[0];draw();});
  $('asael-source-reading').addEventListener('change',()=>{reading=catalog.readings.find(r=>r.id===$('asael-source-reading').value);draw();});
  $('asael-source-open').addEventListener('click',()=>{onChooseStudy(reading.studyId);$('voice-study-choice').focus();});
  draw();
}
