import {SOURCE_READERS} from './source-readers-data.js';
export {SOURCE_READERS};
export function readerCatalogPortions(bookId){return SOURCE_READERS.portions.filter(p=>p.bookId===bookId);}
export function readerCatalogReadings(portionId){return SOURCE_READERS.readings.filter(r=>r.portionId===portionId);}

export function mountSourceReaderFinder({selectedStudy,onChooseStudy}){
  const $=id=>document.getElementById(id),catalog=SOURCE_READERS,key='tropetrain-source-reader-finder-v1';
  let saved;try{saved=JSON.parse(localStorage.getItem(key));}catch{}
  let reading=catalog.readings.find(r=>r.studyId===selectedStudy)??catalog.readings.find(r=>r.id===saved?.readingId)??catalog.readings[0];
  let portion=catalog.portions.find(p=>p.id===reading.portionId);
  const options=(id,items,value)=>{const select=$(id);select.replaceChildren();for(const item of items){const o=document.createElement('option');o.value=item.id;o.textContent=item.name;select.append(o);}select.value=value;};
  options('source-reader-book',[...new Map(catalog.portions.map(p=>[p.bookId,{id:p.bookId,name:p.bookName}])).values()],portion.bookId);
  function draw(){
    options('source-reader-portion',readerCatalogPortions(portion.bookId),portion.id);
    options('source-reader-reading',readerCatalogReadings(portion.id),reading.id);
    $('source-reader-selection').textContent=`${portion.bookName} · ${reading.name} · ${reading.recordIds.length} listed original ${reading.recordIds.length===1?'recording':'recordings'}. The catalog heading does not establish exact verse coverage. Inspect the individual source attribution and license before loading.`;
    $('source-reader-page').href=portion.sourceUrl;
    try{localStorage.setItem(key,JSON.stringify({readingId:reading.id}));}catch{}
  }
  $('source-reader-count').textContent=`${catalog.counts.catalogRows} catalog rows, ${catalog.counts.sourceReadings} reading/reader entries and ${catalog.counts.canonicalFiles} canonical originals across ${catalog.counts.portions} parashah catalogs in all five books. ${catalog.counts.readerLabels} reader labels and ${catalog.counts.melodyLabels} literal melody labels are source claims; this is not verified full-Torah coverage or a menu of complete melody systems.`;
  $('source-reader-book').addEventListener('change',()=>{portion=readerCatalogPortions($('source-reader-book').value)[0];reading=readerCatalogReadings(portion.id)[0];draw();});
  $('source-reader-portion').addEventListener('change',()=>{portion=catalog.portions.find(p=>p.id===$('source-reader-portion').value);reading=readerCatalogReadings(portion.id)[0];draw();});
  $('source-reader-reading').addEventListener('change',()=>{reading=catalog.readings.find(r=>r.id===$('source-reader-reading').value);draw();});
  $('source-reader-open').addEventListener('click',()=>{onChooseStudy(reading.studyId);$('voice-study-choice').focus();});
  draw();
}
