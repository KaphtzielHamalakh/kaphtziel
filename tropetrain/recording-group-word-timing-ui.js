import {marksWord} from './scroll-layout-ui.js';

export function mountRecordingGroupWordTiming({getWords,getCursor,getDrafts,getReferences,position,hasSource,loadSource,audition,stop,onSourceReady}){
 const $=id=>document.getElementById(id),panel=$('recording-group-timing-review');
 let draft=null,selected=0,record=null,available=false,loadJob=null,generation=0,contextKey=null,contextWords=null;
 const message=text=>{$('recording-group-timing-status').textContent=text;};
 const clearExport=()=>{$('recording-group-timing-json').value='';$('recording-group-timing-download').hidden=true;$('recording-group-timing-download').removeAttribute('href');};
 const checked=()=>getDrafts().validate(draft,getWords(),getCursor());
 function follow(current=position()){
  const review=current&&draft&&current.reviewBasis==='original-recording-group-review'&&current.groupId===draft.group.id&&current.recordingId===draft.source.recordingId?current:null;
  const word=review?.kind==='word'?draft.words.find(w=>w.occurrenceId===review.occurrenceId&&w.hebrew===review.hebrew):null;
  document.querySelectorAll('[data-word]').forEach(el=>el.classList.toggle('timing-draft-active',!!word&&marksWord(el,word.occurrenceId)));
  $('recording-group-timing-clock').textContent=review?`${review.kind==='word'?'Personal draft word · '+review.hebrew:'Complete original group'} · ${review.seconds.toFixed(6)} source seconds${review.mode==='muted'?' · muted clock; not evidence of a heard boundary':''}. ${word?'The dotted highlight follows your draft, not an original word timestamp.':'No individual sounding word is assigned.'}`:'Review playback is stopped. Personal marks do not change the original recording or its word-timing gaps.';
 }
 function save(){
  clearExport();
  try{localStorage.setItem(getDrafts().key(draft,getWords(),getCursor()),JSON.stringify(checked()));message('Personal word draft saved on this device. Original source times, syllables and review status are unchanged.');}
  catch(error){message('Draft could not be saved on this device: '+error.message+' Prepare and copy the JSON to retain valid annotations.');}
 }
 function draw(){
  $('recording-group-timing-editor').hidden=!draft;
  for(const action of ['load','whole','audition','capture-start','capture-end','prepare','import'])$(`recording-group-timing-${action}`).disabled=!draft||['whole','audition'].includes(action)&&!available||action==='load'&&(available||!!loadJob);
  $('recording-group-timing-cancel').hidden=!loadJob;
  if(!draft){follow(null);return;}
  const word=draft.words[selected];$('recording-group-timing-select').value=String(selected);$('recording-group-timing-word').textContent=word.hebrew;
  $('recording-group-timing-identity').textContent=`Canonical ${word.id} · occurrence ${word.occurrenceId}. Recording text: ${word.recordingHebrew} (${word.sourceComparison}). Original word times: unassigned.`;
  for(const key of ['start','end']){const el=$(`recording-group-timing-${key}`);el.value=word[key]??'';el.min=draft.group.startSeconds;el.max=draft.group.endSeconds;}
  $('recording-group-timing-count').textContent=`${draft.words.filter(w=>w.start!==null&&w.end!==null).length} / ${draft.words.length} words have two personal boundaries. No missing boundary is inferred.`;
  $('recording-group-timing-audition').disabled=!available||word.start===null||word.end===null;
  $('recording-group-timing-load').textContent=available?'Original recording available':`Load original recording · ${(record.audio.bytes/1048576).toFixed(1)} MB`;
  $('recording-group-timing-previous').disabled=selected===0;$('recording-group-timing-next').disabled=selected===draft.words.length-1;follow();
 }
 function pendingFields(){
  const values={};
  for(const key of ['start','end']){const el=$(`recording-group-timing-${key}`);if(el.validity.badInput)throw Error('Finish entering a valid source-second boundary.');const value=el.value===''?null:Number(el.value);if(value!==draft.words[selected][key])values[key]=value;}
  return {changed:Object.keys(values).length>0,next:getDrafts().setBoundaries(draft,getWords(),getCursor(),selected,values)};
 }
 function commitFields(){
  const {changed,next}=pendingFields();
  if(changed){stop();draft=next;save();}
  return checked();
 }
 async function refresh(){
  const words=getWords(),cursor=getCursor(),word=words[cursor],service=getDrafts(),key=JSON.stringify([panel.open,word?.id,word?.sourceHebrew,!!service]);
  if(key===contextKey&&words===contextWords)return;contextKey=key;contextWords=words;
  const current=++generation;loadJob?.abort();loadJob=null;
  if(position()?.reviewBasis==='original-recording-group-review')stop();
  draft=record=null;available=false;selected=0;clearExport();$('recording-group-timing-select').replaceChildren();$('recording-group-timing-window').textContent='';draw();
  if(!panel.open){message('Open this panel at a complete original recording timing group to mark personal word boundaries.');return;}
  try{
   if(!service)throw Error('Original recording timing-group evidence is still loading.');
   draft=service.create(words,cursor);record=getReferences().byId.get(draft.source.recordingId);selected=Math.max(0,draft.words.findIndex(w=>w.occurrenceId===word.id));
   let saved,legacy=false;try{saved=localStorage.getItem(service.key(draft,words,cursor));if(!saved){const old=localStorage.getItem(service.legacyKey(draft,words,cursor)),restored=old&&service.restoreLegacy(old,words,cursor);if(restored){draft=restored;legacy=true;}}}catch{}
   if(saved){try{draft=service.parse(saved,words,cursor);message('Personal draft restored for this exact recording group and occurrence. All source times and review gaps remain unchanged.');}catch(error){message('Saved draft withheld: '+error.message);}}
   else if(legacy){try{localStorage.setItem(service.key(draft,words,cursor),JSON.stringify(draft));message('Personal draft restored for this exact recording group and section. Its older saved copy is retained; source times and review gaps are unchanged.');}catch{message('Personal draft restored for this exact section. Device saving is unavailable; prepare and copy the JSON to keep it.');}}
   else message('All personal word boundaries are blank for this reading section. Listen to the complete original group, then enter or capture your own unreviewed marks.');
   for(const [i,w]of draft.words.entries()){const option=document.createElement('option');option.value=String(i);option.textContent=`${i+1} · ${w.hebrew}`;$('recording-group-timing-select').append(option);}
   $('recording-group-timing-window').textContent=`${record.title} · ${draft.words.length} words together · original ${draft.group.startSeconds.toFixed(6)}–${draft.group.endSeconds.toFixed(6)} seconds. Every original member-word time remains unassigned. These personal annotations do not establish pronunciation equivalence or a musical review.`;
   draw();const ready=await hasSource(record);if(current!==generation)return;available=ready;draw();
  }catch(error){if(current===generation){draft=record=null;draw();message(error.message);}}
 }
 panel.addEventListener('toggle',refresh);
 function select(index){try{commitFields();if(position()?.kind==='word')stop();selected=index;draw();}catch(error){draw();message(error.message);}}
 $('recording-group-timing-select').addEventListener('change',()=>select(Number($('recording-group-timing-select').value)));
 for(const [action,delta]of [['previous',-1],['next',1]])$(`recording-group-timing-${action}`).addEventListener('click',()=>select(selected+delta));
 for(const key of ['start','end']){
  $(`recording-group-timing-${key}`).addEventListener('input',()=>{clearExport();message('Boundary edited. Leave the field, audition or prepare the draft to validate and save it.');try{const word=pendingFields().next.words[selected];$('recording-group-timing-audition').disabled=!available||word.start===null||word.end===null;}catch{$('recording-group-timing-audition').disabled=true;}});
  $(`recording-group-timing-${key}`).addEventListener('change',()=>{try{commitFields();}catch(error){message(error.message);}draw();});
  $(`recording-group-timing-capture-${key}`).addEventListener('click',()=>{try{commitFields();const current=position();draft=getDrafts().capture(draft,getWords(),getCursor(),selected,key,current);if(current.kind==='word')stop();save();if(current.mode==='muted')message('Muted-clock mark saved as a personal draft; it is not evidence of a heard word boundary.');}catch(error){message(error.message);}draw();});
 }
 $('recording-group-timing-clear').addEventListener('click',()=>{try{stop();draft=getDrafts().setBoundaries(draft,getWords(),getCursor(),selected,{start:null,end:null});save();draw();}catch(error){message(error.message);}});
 $('recording-group-timing-load').addEventListener('click',async()=>{
  if(loadJob||!record)return;const source=record,current=generation,job=new AbortController();loadJob=job;draw();message('Loading and checksum-checking the unchanged original recording…');
  try{await loadSource(source,job.signal);if(current===generation&&!job.signal.aborted){available=true;message('Original recording loaded and checksum checked. Press Play complete original group when ready.');onSourceReady();}}
  catch(error){if(current===generation)message(job.signal.aborted?'Source loading cancelled.':error.message);}
  finally{if(loadJob===job){loadJob=null;draw();}}
 });
 $('recording-group-timing-cancel').addEventListener('click',()=>loadJob?.abort());
 async function play(kind){
  const current=generation;
  try{commitFields();draw();await audition({draft,kind,wordIndex:selected});if(current===generation)message(kind==='word'?'Auditioning a personal word interval in the unchanged chant. The dotted highlight follows your unreviewed boundaries.':'Playing the complete original group at original pitch and speed. No individual sounding word is assigned.');}
  catch(error){if(current===generation)message(error.message);}
 }
 $('recording-group-timing-whole').addEventListener('click',()=>play('original-group'));
 $('recording-group-timing-audition').addEventListener('click',()=>play('word'));
 $('recording-group-timing-stop').addEventListener('click',()=>stop());
 $('recording-group-timing-prepare').addEventListener('click',()=>{try{commitFields();draw();const text=JSON.stringify(checked(),null,2)+'\n';$('recording-group-timing-json').value=text;const a=$('recording-group-timing-download');a.href='data:application/json;charset=utf-8,'+encodeURIComponent(text);a.download=draft.group.id+'-personal-word-draft.json';a.hidden=false;message('Personal draft JSON prepared. Source text, word-time gaps, pronunciation evidence and independent review are unchanged.');}catch(error){clearExport();message('Draft not prepared: '+error.message);}});
 $('recording-group-timing-import').addEventListener('click',()=>{try{const value=getDrafts().parse($('recording-group-timing-json').value,getWords(),getCursor());stop();draft=value;save();draw();message('Personal draft imported for this exact original group and occurrence. Source word times remain unassigned; no review is certified.');}catch(error){message('Draft not imported: '+error.message);}});
 return {refresh,follow,cancelLoading(){loadJob?.abort();}};
}
