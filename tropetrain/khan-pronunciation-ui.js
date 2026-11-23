import {KHAN_PRONUNCIATION,READER_PRONUNCIATION_SOURCES,readerPronunciationSource,khanWordEvidence,khanVerseForWord} from './khan-pronunciation.js';
export function mountKhanPronunciation({onChange=()=>{}}={}){
 const $=id=>document.getElementById(id),key='tropetrain-reader-pronunciation-source-v1';let chosen='mam',word=null;
 try{const saved=JSON.parse(localStorage.getItem(key));if(READER_PRONUNCIATION_SOURCES.some(s=>s.id===saved?.source))chosen=saved.source;}catch{}
 for(const s of READER_PRONUNCIATION_SOURCES){const o=document.createElement('option');o.value=s.id;o.textContent=s.name;$('reader-pronunciation-source').append(o);}
 $('reader-pronunciation-source').value=chosen;
 function draw(){
  $('khan-pronunciation-hebrew').textContent=word?.sourceHebrew??'';$('khan-pronunciation-hebrew').dataset.wordId=word?.sourceWordId??word?.id??'';
  $('khan-pronunciation-rows').replaceChildren();$('khan-pronunciation-verse').replaceChildren();$('khan-pronunciation-export').disabled=true;
  $('khan-pronunciation-download').hidden=true;$('khan-pronunciation-download').removeAttribute('href');
  if(!word){$('khan-pronunciation-status').textContent='Choose a word in Genesis1:1–13 to compare the published readings.';return;}
  try{
   const verse=khanVerseForWord(word);
   if(!verse){$('khan-pronunciation-status').textContent='No published transcription for this word in this source excerpt. Your reader source stays selected; no other style is substituted.';return;}
   for(const style of KHAN_PRONUNCIATION.styles){
    const report=khanWordEvidence(word,style.id),entry=report.entries[0],tr=document.createElement('tr');tr.dataset.reading=style.id;
    tr.classList.toggle('khan-selected-reading',chosen==='khan-'+style.id);
    const name=document.createElement('th');name.scope='row';name.textContent=style.label;
    const text=document.createElement('td'),ipa=document.createElement('span');ipa.lang='und-fonipa';ipa.dir='ltr';ipa.className='khan-phonetic-text';ipa.textContent=entry.text;text.append(ipa);
    const reference=document.createElement('small');reference.textContent=`Printed p.${entry.printedPage}, transcription${entry.sourceColumn}${entry.sourceReference?' · source explicitly gives one common reading for both streams':''}${entry.footnotes.length?' · footnotes '+entry.footnotes.join(', '):''}`;text.append(reference);tr.append(name,text);$('khan-pronunciation-rows').append(tr);
   }
   for(const column of verse.columns){const box=document.createElement('p'),label=document.createElement('small'),text=document.createElement('span');label.textContent=`Genesis1:${verse.verse} · printed p.${column.printedPage} · transcription${column.column}`;text.lang='und-fonipa';text.dir='ltr';text.className='khan-phonetic-text';text.textContent='['+column.text+']';box.append(label,text);$('khan-pronunciation-verse').append(box);}
   $('khan-pronunciation-status').textContent=`Both published readings linked to this complete Hebrew word. Reader source: ${readerPronunciationSource(chosen).name}. Syllable and note links, source full-mark equivalence and audio times remain unassigned.`;
   $('khan-pronunciation-export').disabled=false;
  }catch(error){$('khan-pronunciation-status').textContent=error.message;}
 }
 $('reader-pronunciation-source').addEventListener('change',()=>{
  const next=readerPronunciationSource($('reader-pronunciation-source').value);chosen=next.id;
  try{localStorage.setItem(key,JSON.stringify({source:chosen}));}catch{}draw();onChange();
 });
 $('khan-pronunciation-export').addEventListener('click',()=>{
  if(!word)return;const reports=KHAN_PRONUNCIATION.styles.map(s=>khanWordEvidence(word,s.id));if(reports.some(r=>r.status!=='word-linked'))return;
  const a=$('khan-pronunciation-download');a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify({schema:'tropetrain-published-pronunciation-comparison-v1',wordId:word.id,sourceWordId:word.sourceWordId??word.id,hebrew:word.sourceHebrew,readerSource:chosen,reports,sourcePack:KHAN_PRONUNCIATION.sourcePack},null,2)+'\n');a.download=(word.sourceWordId??word.id)+'-published-tiberian-readings.json';a.hidden=false;
 });
 return {showWord(value){word=value;draw();},selected(){return chosen!=='mam';},readerStatus(){return readerPronunciationSource(chosen);},readerText(value){return khanWordEvidence(value,readerPronunciationSource(chosen).reading);}};
}
