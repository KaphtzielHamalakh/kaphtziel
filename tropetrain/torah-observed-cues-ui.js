import {referenceObservedCueStudy,loadReferenceObservedCues,referenceObservedCueForWord,referenceObservedCueContext} from './torah-observed-cues.js';
export function mountReferenceObservedCues({onAudition}){
 const $=id=>document.getElementById(id),cache=new Map();let record=null,word=null,ready=false,value=null,generation=0,loading=false;
 function draw(){
  const study=referenceObservedCueStudy(record);$('reference-cues-panel').hidden=!study;if(!study)return;
  $('reference-cues-load').disabled=loading||!!value;
  let observed=null;
  try{if(value&&word)observed=referenceObservedCueForWord(value,word);}catch{}
  $('reference-cues-audition').disabled=!ready||!observed?.cue;
  $('reference-cues-word').textContent=!word?'Open this recording’s reading and select a Hebrew word.':!value?`${word.sourceHebrew} · ${study.agreedListeningCues} of ${study.readerWords} candidate words have a research cue. Load the separate study to inspect this word.`:!observed?'This marked reader word differs from the source study. No cue is available.':observed.cue?`${word.sourceHebrew} · listening point ${observed.cue.point.toFixed(3)} seconds · model difference ${observed.cue.clockDifferenceSeconds.toFixed(3)} seconds · ${observed.cue.allModelObservations.ctc.length+observed.cue.allModelObservations.whisper.length} retained observations. This point is not a heard onset or word interval.`:`${word.sourceHebrew} · no concordant listening cue (${observed.withheldReason}). Original playback limits remain in place.`;
  $('reference-cues-original').textContent=ready?'Original recording loaded. Cue auditions keep its key, speed and pronunciation.':'Load the original recording using Load recordings below before auditioning a cue.';
 }
 $('reference-cues-load').addEventListener('click',async()=>{
  if(loading||!referenceObservedCueStudy(record))return;const epoch=generation,selected=record;loading=true;draw();$('reference-cues-status').textContent='Checking this original’s separate listening-cue evidence…';
  try{const next=await loadReferenceObservedCues(selected);if(epoch!==generation)return;value=next;cache.set(selected.id,next);$('reference-cues-status').textContent='Research cues loaded. No original timing or personal boundary was changed.';}
  catch(error){if(epoch===generation)$('reference-cues-status').textContent=error.message;}
  finally{if(epoch===generation){loading=false;draw();}}
 });
 $('reference-cues-audition').addEventListener('click',async()=>{
  const epoch=generation,selected=record,selectedWord=word;
  try{const context=referenceObservedCueContext(value,selectedWord);await onAudition(selected,selectedWord,context);if(epoch===generation)$('reference-cues-status').textContent='Auditioning the unchanged original with two seconds of context on each side of a research point. No timed word highlighting or boundary assignment.';}
  catch(error){if(epoch===generation)$('reference-cues-status').textContent=error.message;}
 });
 return {select(nextRecord,nextWord,isReady){
  if(record?.id!==nextRecord?.id){generation++;loading=false;record=nextRecord;value=cache.get(record?.id)??null;$('reference-cues-status').textContent='';}
  word=nextWord;ready=isReady;draw();
 }};
}
