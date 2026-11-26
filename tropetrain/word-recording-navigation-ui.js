export function mountWordRecordingNavigation({getWord,getNavigator,openStudy,stop,onExample}){
 const $=id=>document.getElementById(id);let context=null,opening=0;
 function refresh(){
  const word=getWord(),navigator=getNavigator(),next=JSON.stringify([word?.id,word?.sourceWordId,word?.sourceHebrew,word?.bookId,word?.chapter,word?.verse,word?.ordinal,word?.kind,!!navigator]);
  if(next===context)return;context=next;opening++;$('word-recording-open').hidden=true;$('word-recording-choice-label').hidden=true;$('word-recording-choice').replaceChildren();
  if(!navigator){$('word-recording-status').textContent='Preparing links to the existing source word studies…';return;}
  const match=navigator.forWord(word);if(!match.available){$('word-recording-status').textContent=match.reason;return;}
  for(const study of match.studies){const option=document.createElement('option');option.value=study.id;option.textContent=`${study.name} · ${study.recordIds.length} original recordings`;$('word-recording-choice').append(option);}
  $('word-recording-choice-label').hidden=match.studies.length<2;$('word-recording-open').hidden=false;$('word-recording-open').disabled=false;
  $('word-recording-open').textContent=`Compare this word in ${match.studies[0].recordIds.length} recordings`;
  $('word-recording-status').textContent='Open this unchanged word in a source study. Each supplied recording keeps its own melody, pronunciation and clock; word timing and musical review remain unapproved.';
 }
 $('word-recording-choice').addEventListener('change',()=>{const match=getNavigator()?.forWord(getWord()),choice=match?.studies.find(s=>s.id===$('word-recording-choice').value);if(choice)$('word-recording-open').textContent=`Compare this word in ${choice.recordIds.length} recordings`;});
 $('word-recording-open').addEventListener('click',async()=>{
  const word=getWord(),current=++opening,occurrence=word?.id,hebrew=word?.sourceHebrew;
  try{
   const selected=getNavigator().verify(word,$('word-recording-choice').value);stop();$('word-recording-open').disabled=true;
   await openStudy({...selected,isCurrent:()=>getWord()?.id===occurrence&&getWord()?.sourceHebrew===hebrew&&current===opening});
   if(current===opening)$('word-recording-status').textContent='This exact reader word is selected in the recording study below. Load an original when ready; automatic hints never fill a personal boundary.';
  }catch(error){if(current===opening)$('word-recording-status').textContent=error.message;}
  finally{if(current===opening)$('word-recording-open').disabled=false;}
 });
 $('word-recording-example').addEventListener('click',()=>{onExample();context=null;refresh();if(!$('word-recording-open').hidden)$('word-recording-open').focus();});
 return {refresh,unavailable(error){context=null;$('word-recording-open').hidden=true;$('word-recording-status').textContent=error.message;}};
}
