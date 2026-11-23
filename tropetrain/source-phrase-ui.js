const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountSourcePhrases({getWords,getCursor,getSelection,onSelect}){
 const $=id=>document.getElementById(id),select=$('source-phrase-choice'),button=$('source-phrase-select'),status=$('source-phrase-status');
 let library=null,failure=null,choices=[];
 function refresh(){
  const previous=select.value,words=getWords(),result=library?.forWord(words,getCursor());choices=result?.groups??[];
  select.innerHTML=choices.map((g,i)=>`<option value="${i}">${esc((g.kind==='source-verse'?'Whole verse':i===0?'Smallest source phrase':'Larger source phrase')+` · words ${g.start+1}–${g.end+1}`)}</option>`).join('');
  if(choices[Number(previous)])select.value=previous;
  const available=result?.status==='available';select.disabled=button.disabled=!available;
  status.textContent=failure??(!library?'Checking source phrase correspondence…':available?'Complete verse text and accents agree with the source. Select a phrase, then use Play or Repeat with your current sound settings.':result.reason);
  status.dataset.status=available?'available':library||failure?'unavailable':'loading';
  let match=null;try{const [start,end]=getSelection();match=library?.matchSelection(words,start,end);}catch{}
  $('source-phrase-selected').textContent=match?`Selected span matches ${match.kind==='source-verse'?'the whole source verse':'a source phrase'} · words ${match.start+1}–${match.end+1}.`:'';
 }
 button.addEventListener('click',()=>{
  try{const checked=library.verifySelection(getWords(),choices[Number(select.value)]);onSelect(checked);}
  catch(error){status.textContent=error.message;status.dataset.status='unavailable';button.disabled=true;}
 });
 return {refresh,setLibrary(value){library=value;failure=null;refresh();},unavailable(error){library=null;failure=`Source phrases unavailable: ${error.message}`;refresh();},matchSelection(){const [start,end]=getSelection();return library?.matchSelection(getWords(),start,end)??null;}};
}
