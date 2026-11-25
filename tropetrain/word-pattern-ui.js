import {createWordPatternIndex,wordPatternCatalogue} from './word-pattern-lookups.js';
const PAGE=8;
export function mountWordPatterns({getModel,onOpenFigure,onExample}){
 const $=id=>document.getElementById(id),panel=$('word-pattern-study'),catalog=wordPatternCatalogue();let indexedWords=null,index=null,cursor=0,page=0,record=null;
 const sourceChoices=[...new Map(catalog.entries.map(e=>[e.sourceId,{id:e.sourceId,name:e.sourceLabel}])).values()];
 for(const source of sourceChoices){const option=document.createElement('option');option.value=source.id;option.textContent=source.name;$('word-pattern-source').append(option);}
 const empty={ 'source-reference-unavailable':'Open a library passage or the Genesis example to inspect its complete source context. This opening fixture has no complete book reference.', 'outside-torah':'These inspected figures are Torah source tables. No Haftarah or scroll setting is inferred for this word.', 'source-unit-withheld':'This source unit needs interpretation and is excluded from sign lookup. Its original Hebrew and marks are retained.', 'no-supplied-lookup':'No checked source-sign query relates this word’s current context to these figures. This does not establish whether a musical setting exists.'};
 function clearDownload(){const a=$('word-pattern-download');a.hidden=true;a.removeAttribute('href');}
 function draw(){
  clearDownload();const words=getModel().words;
  try{
   if(indexedWords!==words){indexedWords=words;index=createWordPatternIndex(words);}
   record=index.forWord(cursor);$('word-pattern-word').textContent=record.selectedWord.hebrew;$('word-pattern-reference').textContent=words[cursor].reference+' · word '+words[cursor].ordinal;
   const filter=$('word-pattern-source').value,rows=record.candidates.filter(c=>!filter||c.sourceId===filter),pages=Math.max(1,Math.ceil(rows.length/PAGE));page=Math.min(page,pages-1);$('word-pattern-results').replaceChildren();
   $('word-pattern-status').textContent=record.status!=='sign-lookups'?empty[record.status]:`${rows.length} printed-figure lookups in this sign context${filter?' for this source':''} · ${rows.length?page*PAGE+1:0}–${Math.min((page+1)*PAGE,rows.length)}. No musical word assignment is made.`;
   $('word-pattern-unit').textContent=record.sourceUnit.issues.length?'Source issues: '+record.sourceUnit.issues.join(', '):record.sourceUnit.wordIds.length>1?'The whole maqaf-linked unit is retained; a related sign may be on another joined word.':'Original source sign positions are retained. A table heading is not a syllable or note allocation.';
   $('word-pattern-previous').disabled=page===0;$('word-pattern-next').disabled=page>=pages-1;$('word-pattern-export').disabled=false;
   for(const candidate of rows.slice(page*PAGE,(page+1)*PAGE)){
    const li=document.createElement('li'),name=document.createElement('strong'),text=document.createElement('p'),context=document.createElement('p'),note=document.createElement('p'),button=document.createElement('button');
    name.textContent=candidate.sourceLabel+' · '+candidate.figureLabel;text.textContent='Matched sign lookup: '+candidate.queryLabel;context.lang='he';context.dir='rtl';context.className='sign-result-word';context.textContent=candidate.lookup.words.map(w=>w.hebrew).join(' ');
    note.className='muted';note.textContent=(candidate.lookup.includedByMaqafUnit?'The selected word is included through its maqaf unit; the matched sign is on another word. ':candidate.lookup.includesOtherSigns?'The selected whole words also contain other signs. ':'')+(candidate.printedCondition?'Printed condition retained, application unreviewed: '+(candidate.printedCondition.literal?(candidate.printedCondition.literal+(candidate.printedCondition.english?' ('+candidate.printedCondition.english+')':'')):candidate.printedCondition.english??candidate.printedCondition.basis??'See the original source record')+'. ':'')+candidate.timingStatus;
    button.textContent='Open printed figure';button.setAttribute('aria-label','Open '+candidate.sourceLabel+' · '+candidate.figureLabel);button.addEventListener('click',()=>onOpenFigure(candidate.sourceId,candidate.modeId));li.append(name,text,context,note,button);$('word-pattern-results').append(li);
   }
  }catch(error){record=null;$('word-pattern-word').textContent='';$('word-pattern-reference').textContent='';$('word-pattern-unit').textContent='';$('word-pattern-previous').disabled=true;$('word-pattern-next').disabled=true;$('word-pattern-results').replaceChildren();$('word-pattern-status').textContent=error.message;$('word-pattern-export').disabled=true;}
 }
 panel.addEventListener('toggle',()=>{if(panel.open)draw();});$('word-pattern-source').addEventListener('change',()=>{page=0;draw();});
 for(const [id,step]of[['previous',-1],['next',1]])$('word-pattern-'+id).addEventListener('click',()=>{page+=step;draw();});
 $('word-pattern-example').addEventListener('click',()=>onExample());
 $('word-pattern-export').addEventListener('click',()=>{draw();if(!record)return;const a=$('word-pattern-download');a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(record,null,2));a.hidden=false;});
 for(const a of document.querySelectorAll('a[href="#word-pattern-study"]'))a.addEventListener('click',()=>{panel.open=true;});if(location.hash==='#word-pattern-study')panel.open=true;
 return {showWord(next){cursor=next;page=0;clearDownload();if(panel.open)draw();}};
}
