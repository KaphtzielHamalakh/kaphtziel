import {getPronunciationLibrary,PRONUNCIATION_STYLES,pronunciationStyle,inlineSourceText} from './pronunciation.js';
import {PRONUNCIATION_SUMMARY} from './pronunciation-summary.js';
export function mountPronunciationStudy(){
 const $=id=>document.getElementById(id),key='tropetrain-pronunciation-text-v1';
 let saved;try{saved=JSON.parse(localStorage.getItem(key));}catch{}
 let style=pronunciationStyle(saved?.style),word=null,listening=false,library=null,error=null,lastKey=null;
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
 function render(){
  const current=JSON.stringify([style,word?.id,word?.sourceHebrew,word?.reference,listening,!!library,error]);if(current===lastKey)return;lastKey=current;
  $('pronunciation-target').textContent=word?`${word.reference} · word ${word.ordinal} · ${listening?'listening word':'selected word'}`:'Choose a Hebrew word.';
  $('pronunciation-reader-word').textContent=word?.sourceHebrew??'';
  $('pronunciation-rows').replaceChildren();$('pronunciation-source-rows').replaceChildren();$('pronunciation-json').textContent='';
  if(error){$('pronunciation-status').textContent=error;return;}
  if(!library){$('pronunciation-status').textContent='Loading the local pronunciation source…';return;}
  if(!word){$('pronunciation-status').textContent='Choose a Hebrew word.';return;}
  let group;try{group=library.at(word);}catch(e){$('pronunciation-status').textContent=e.message;return;}
  if(!group){$('pronunciation-status').textContent='No checked source correspondence for this word. The selected style is kept; no transcription is substituted.';return;}
  $('pronunciation-status').textContent=`Phonetic MAM display ${group.displayChapter}:${group.displayVerse} · source row${group.rows.length===1?'':'s'} ${group.rows.map(r=>r.number).join(', ')} · ${group.readerIds.length} reader word${group.readerIds.length===1?'':'s'}. ${group.flags.includes('documented-reading-form')?'The source uses a documented reading form. ':''}${group.flags.includes('source-text-difference')?'Source Hebrew differs; compare the exact forms below. ':''}${group.flags.includes('source-group')?'The transcription is for the complete group; syllable-to-word allocation is not inferred.':''}`;
  for(const row of group.rows){
   const item=document.createElement('div');item.className='pronunciation-row';columns(item,row.transcriptions[style],false);
   if(!row.transcriptions[style].some(cell=>cell!==null&&inlineSourceText(cell).trim()&&inlineSourceText(cell).trim()!=='—')){const note=document.createElement('small');note.textContent='This source row supplies no transcription for the selected style. Source cells are retained above.';item.append(note);}
   $('pronunciation-rows').append(item);
   const source=document.createElement('div');source.className='pronunciation-row';columns(source,row.hebrew,true);$('pronunciation-source-rows').append(source);
  }
  $('pronunciation-json').textContent=JSON.stringify({sourceCommit:library.sourceCommit,license:'CC-BY-SA-4.0',group},null,2);
 }
 $('pronunciation-style').addEventListener('change',()=>{style=pronunciationStyle($('pronunciation-style').value);try{localStorage.setItem(key,JSON.stringify({style}));}catch{}render();});
 getPronunciationLibrary().then(value=>{library=value;render();}).catch(e=>{error=e.message;render();});
 return {showWord(value,{following=false}={}){word=value;listening=following;render();}};
}
