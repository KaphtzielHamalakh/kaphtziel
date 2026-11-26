import {observedWordCuesAvailable,loadObservedWordCues,validateObservedWordCues,observedWordCueContext} from './observed-word-cues.js';
export function mountObservedWordCues({onAudition}){
 const $=id=>document.getElementById(id),cache=new Map();let record=null,draft=null,selected=0,available=false,value=null,generation=0,loading=false;
 function draw(){
  const word=draft?.words[selected],visible=!!word&&observedWordCuesAvailable(record);$('observed-cues-panel').hidden=!visible;
  if(!visible)return;
  const observed=value?.words[selected],cue=observed?.cue;$('observed-cues-load').disabled=loading||!!value;$('observed-cues-audition').disabled=!available||!cue;
  $('observed-cues-word').textContent=cue?`${word.hebrew} · listening cue ${cue.point.toFixed(3)} seconds. Two model clocks: ${cue.ctc.point.toFixed(3)} / ${cue.whisper.point.toFixed(3)} seconds; difference ${cue.clockDifferenceSeconds.toFixed(3)} seconds. No heard onset or word duration is assigned.`:observed?`${word.hebrew} · no agreed listening cue for this word (${observed.withheldReason}). Word boundaries remain unassigned.`:'Load the sparse listening-cue study. Only three of the 358 candidate words have concordant cues; other words remain without a cue.';
 }
 $('observed-cues-load').addEventListener('click',async()=>{
  if(!draft||!observedWordCuesAvailable(record)||loading)return;const epoch=generation,original=record,expected=draft;loading=true;draw();$('observed-cues-status').textContent='Checking the source-specific listening-cue packet…';
  try{const next=await loadObservedWordCues(original,expected);if(epoch!==generation)return;value=next;cache.set(original.id,next);$('observed-cues-status').textContent='Three unreviewed cues loaded; 355 candidate words have no cue. No personal boundaries were filled.';}
  catch(error){if(epoch===generation)$('observed-cues-status').textContent=error.message;}
  finally{if(epoch===generation){loading=false;draw();}}
 });
 $('observed-cues-audition').addEventListener('click',()=>{try{onAudition(observedWordCueContext(value,selected));$('observed-cues-status').textContent='Auditioning the unchanged original with two seconds of context on each side of a model cue. This is not a word interval; personal boundaries stay unchanged.';}catch(error){$('observed-cues-status').textContent=error.message;}});
 return {select(nextRecord,nextDraft,index,isAvailable){
  if(record?.id!==nextRecord?.id||draft!==nextDraft){generation++;loading=false;record=nextRecord;draft=nextDraft;value=null;$('observed-cues-status').textContent='';const cached=cache.get(record?.id);if(cached&&draft)value=validateObservedWordCues(cached,draft);}
  selected=index;available=isAvailable;draw();
 }};
}
