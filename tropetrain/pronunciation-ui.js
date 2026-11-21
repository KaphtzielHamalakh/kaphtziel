import {getPronunciationLibrary,PRONUNCIATION_STYLES,pronunciationStyle,inlineSourceText} from './pronunciation.js';
import {PRONUNCIATION_SUMMARY} from './pronunciation-summary.js';
export function mountPronunciationStudy(){
 const $=id=>document.getElementById(id),key='tropetrain-pronunciation-text-v1';
 let saved;try{saved=JSON.parse(localStorage.getItem(key));}catch{}
 let style=pronunciationStyle(saved?.style),word=null,listening=false,library=null,error=null,lastKey=null,study=null;
 for(const s of PRONUNCIATION_STYLES){const option=document.createElement('option');option.value=s.id;option.textContent=s.name;$('pronunciation-style').append(option);}
 $('pronunciation-style').value=style;
 $('pronunciation-coverage').textContent=`${PRONUNCIATION_SUMMARY.mappedWords.toLocaleString()} of ${PRONUNCIATION_SUMMARY.readerWords.toLocaleString()} Torah words linked to source groups. Unmatched words remain unassigned. Correspondence and linguistic review are pending.`;
 function appendInline(parent,nodes){
  for(const node of nodes){
   if(typeof node==='string'){parent.append(document.createTextNode(node));continue;}
   if(node.kind==='superscript-e'){const sup=document.createElement('sup');sup.textContent='e';parent.append(sup);continue;}
   if(!['stressed','reading'].includes(node.kind))throw Error('Unsupported source transcription markup.');
   const span=document.createElement(node.kind==='stressed'?'strong':'span');
   if(node.kind==='reading'){
    span.className='pronunciation-reading';const label=document.createElement('span');label.className='pronunciation-reading-label';label.lang='he';label.dir='rtl';label.textContent=node.label+' · ';span.append(label);
   }
   appendInline(span,node.content);parent.append(span);
  }
 }
 function columns(parent,cells,hebrew){
  for(const [index,cell] of cells.entries()){
   if(cell===null)continue;
   const box=document.createElement('div');box.className='pronunciation-cell';box.lang=hebrew?'he':'en';box.dir=hebrew?'rtl':'ltr';
   const label=document.createElement('small');label.textContent=`Source column ${index+1}`;label.lang='en';label.dir='ltr';box.append(label);
   const text=document.createElement('div');appendInline(text,cell);box.append(text);parent.append(box);
  }
 }
 function structure(){
  const scope=$('pronunciation-unit-scope');
  scope.textContent=study.alignmentScope==='single-reader-word'?'These source units correspond to the selected Hebrew word. Their individual Hebrew letters and musical notes are not assigned.':'These source units correspond to the complete Hebrew group below. They are not divided among its individual words.';
  const group=document.createElement('p');group.className='pronunciation-group-hebrew';group.lang='he';group.dir='rtl';group.textContent=study.readerHebrew.join(' ');$('pronunciation-units').append(group);
  for(const row of study.rows)for(const cell of row.styles[style]){
   const box=document.createElement('div');box.className='pronunciation-unit-cell';
   const title=document.createElement('p');title.className='muted';title.textContent=`Source row ${row.number} · column ${cell.column}`;box.append(title);
   const labels=[...new Set(cell.marks.filter(m=>m.kind==='reading').map(m=>m.label))];
   if(labels.length){const label=document.createElement('p');label.lang='he';label.dir='rtl';label.textContent=labels.join(' · ');box.append(label);}
   if(cell.status!=='present'){
    const message=document.createElement('p');message.textContent=cell.status==='missing'?'No source cell in this column.':cell.status==='unavailable'?'The source gives — for this style.':'The source cell is empty.';box.append(message);
   }else{
    const list=document.createElement('ol');list.className='pronunciation-unit-list';list.lang='en';list.dir='ltr';
    for(const unit of cell.units){
     const li=document.createElement('li');li.className=unit.sourceStress?'source-stressed':'';
     const value=document.createElement('span');value.className='pronunciation-unit-text';
     const supers=unit.sourceMarks.filter(m=>m.kind==='superscript-e');
     let position=unit.start;
     for(const mark of supers.sort((a,b)=>a.start-b.start)){
      value.append(document.createTextNode(cell.text.slice(position,mark.start)));const sup=document.createElement('sup');sup.textContent='e';value.append(sup);position=mark.end;
     }
     value.append(document.createTextNode(cell.text.slice(position,unit.end)));li.append(value);
     if(unit.sourceStress){const stress=document.createElement('small');stress.textContent='Primary stress';li.append(stress);}
     const cues=[unit.acutePositions.length?'acute mark':'',unit.brevePositions.length?'breve mark':'',supers.length?'superscript e':''].filter(Boolean);
     li.setAttribute('aria-label',`Source unit ${unit.number}: ${unit.text}${unit.sourceStress?', primary stress':''}${cues.length?', '+cues.join(', '):''}`);list.append(li);
    }
    box.append(list);
    const joins=cell.boundaries.filter(b=>b.kind!=='syllable-dot');
    if(joins.length){const note=document.createElement('p');note.className='muted';note.textContent=`Source joins retained: ${joins.map(b=>b.kind==='space'?'space':b.text).join(', ')}. They do not assign units to individual Hebrew words.`;box.append(note);}
   }
   $('pronunciation-units').append(box);
  }
 }
 function render(){
  const current=JSON.stringify([style,word?.id,word?.sourceHebrew,word?.reference,listening,!!library,error]);if(current===lastKey)return;lastKey=current;
  $('pronunciation-target').textContent=word?`${word.reference} · word ${word.ordinal} · ${listening?'listening word':'selected word'}`:'Choose a Hebrew word.';
  $('pronunciation-reader-word').textContent=word?.sourceHebrew??'';
  $('pronunciation-rows').replaceChildren();$('pronunciation-source-rows').replaceChildren();$('pronunciation-json').textContent='';
  $('pronunciation-units').replaceChildren();$('pronunciation-unit-scope').textContent='Choose a word with source correspondence.';$('pronunciation-export').disabled=true;study=null;
  if(error){$('pronunciation-status').textContent=error;return;}
  if(!library){$('pronunciation-status').textContent='Loading the local pronunciation source…';return;}
  if(!word){$('pronunciation-status').textContent='Choose a Hebrew word.';return;}
  let group;try{group=library.at(word);}catch(e){$('pronunciation-status').textContent=e.message;return;}
  if(!group){$('pronunciation-status').textContent='No checked source correspondence for this word. The selected style is kept; no transcription is substituted.';return;}
  $('pronunciation-status').textContent=`Phonetic MAM display ${group.displayChapter}:${group.displayVerse} · source row${group.rows.length===1?'':'s'} ${group.rows.map(r=>r.number).join(', ')} · ${group.readerIds.length} reader word${group.readerIds.length===1?'':'s'}. ${group.match==='forced-between-verse-anchors'?'Matched within a verse with text differences; unmatched words stay unassigned. ':''}${group.flags.includes('documented-reading-form')?'The source uses a documented reading form. ':''}${group.flags.includes('source-text-difference')?'Source Hebrew differs; compare the exact forms below. ':''}${group.flags.includes('source-group')?'The transcription is for the complete group; syllable-to-word allocation is not inferred.':''}`;
  for(const row of group.rows){
   const item=document.createElement('div');item.className='pronunciation-row';columns(item,row.transcriptions[style],false);
   if(!row.transcriptions[style].some(cell=>cell!==null&&inlineSourceText(cell).trim()&&inlineSourceText(cell).trim()!=='—')){const note=document.createElement('small');note.textContent='This source row supplies no transcription for the selected style. Source cells are retained above.';item.append(note);}
   $('pronunciation-rows').append(item);
   const source=document.createElement('div');source.className='pronunciation-row';columns(source,row.hebrew,true);$('pronunciation-source-rows').append(source);
  }
  study=library.study(word,style);structure();$('pronunciation-export').disabled=false;
  $('pronunciation-json').textContent=JSON.stringify({sourceCommit:library.sourceCommit,license:'CC-BY-SA-4.0',group},null,2);
 }
 $('pronunciation-export').addEventListener('click',()=>{
  if(!study)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(study,null,2)],{type:'application/json;charset=utf-8'})),a=document.createElement('a');
  a.href=url;a.download=`tropetrain-pronunciation-${study.selection.sourceWordId}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 $('pronunciation-style').addEventListener('change',()=>{style=pronunciationStyle($('pronunciation-style').value);try{localStorage.setItem(key,JSON.stringify({style}));}catch{}render();});
 getPronunciationLibrary().then(value=>{library=value;render();}).catch(e=>{error=e.message;render();});
 return {showWord(value,{following=false}={}){word=value;listening=following;render();}};
}
