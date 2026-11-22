import {sourceSyllableChoices,createSyllableTimingDraft,syllableTimingKey,parseSyllableTimingDraft,setSyllableBoundary,captureSyllableBoundary,draftSyllableSpan} from './syllable-timing-draft.js';
export function mountSyllableTiming({getWord,getPronunciation,getReferences,position,hasSource,loadSource,audition,stop}){
 const $=id=>document.getElementById(id),panel=$('syllable-timing-review');
 let contextKey=null,generation=0,draft=null,expected=null,choices=[],word=null,study=null,style=null,record=null,selected=0,available=false,loadJob=null;
 const message=text=>{$('syllable-timing-status').textContent=text;};
 const clearExport=()=>{$('syllable-timing-json').value='';$('syllable-timing-download').hidden=true;$('syllable-timing-download').removeAttribute('href');};
 function save(){
  clearExport();
  try{localStorage.setItem(syllableTimingKey(draft),JSON.stringify(draft));message('Personal syllable draft saved on this device. No source times, phonemes or musical notes were changed.');}
  catch{message('Device storage unavailable. Prepare and copy the draft JSON to retain your annotations.');}
 }
 function draw(){
  $('syllable-timing-editor').hidden=!draft;
  for(const id of ['load','whole','audition','capture-start','capture-end','prepare','import'])$(`syllable-timing-${id}`).disabled=!draft||['whole','audition'].includes(id)&&!available||id==='load'&&(available||!!loadJob);
  $('syllable-timing-cancel').hidden=!loadJob;
  if(!draft)return;
  const unit=draft.units[selected];$('syllable-timing-unit').value=String(selected);
  $('syllable-timing-text').textContent=unit.sourceText;
  $('syllable-timing-hebrew').textContent=unit.hebrewClusterRanges?unit.hebrewClusterRanges.filter(r=>r.role==='written').map(r=>r.text).join(' '):'No exact written range; source text only.';
  $('syllable-timing-unit-note').textContent=[unit.sourceStress?'Source primary stress.':'',unit.hebrewUnderlay?.variants.some(v=>v.sharesNextConsonant||v.sharesPreviousConsonant)?'Shared consonant retained; no phoneme split or timing inferred.':''].filter(Boolean).join(' ');
  for(const k of ['start','end']){const el=$(`syllable-timing-${k}`);el.value=unit[k]??'';el.min=draft.word.startSeconds;el.max=draft.word.endSeconds;}
  $('syllable-timing-count').textContent=`${draft.units.filter(u=>u.start!==null&&u.end!==null).length} / ${draft.units.length} source units have two personal boundaries. All other boundaries remain blank.`;
  $('syllable-timing-audition').disabled=!available||unit.start===null||unit.end===null;
  $('syllable-timing-load').textContent=available?'Original recording available':`Load original recording · ${(record.audio.bytes/1048576).toFixed(1)} MB`;
 }
 function choose(id){
  expected=createSyllableTimingDraft({library:getReferences(),word,study,style,choiceId:id});draft=expected;record=getReferences().byId.get(draft.source.recordingId);selected=0;clearExport();
  let saved;try{saved=localStorage.getItem(syllableTimingKey(expected));}catch{}
  if(saved){try{draft=parseSyllableTimingDraft(saved,expected);message('Personal syllable draft restored. Text style and source variant keep separate annotations; linguistic and musical review remain pending.');}catch(error){message('Saved draft withheld: '+error.message);}}
  else message('No syllable times assigned. Listen to the original chant and enter or capture your own boundaries.');
  $('syllable-timing-unit').replaceChildren();draft.units.forEach((unit,i)=>{const option=document.createElement('option');option.value=i;option.textContent=`${i+1} · ${unit.sourceText}${unit.sourceStress?' · source stress':''}`;$('syllable-timing-unit').append(option);});draw();
 }
 async function refresh(){
  const w=getWord(),p=getPronunciation(w),refs=getReferences(),next=JSON.stringify([w?.id,w?.sourceHebrew,p?.style,!!p?.study,!!refs,panel.open]);
  if(next===contextKey)return;contextKey=next;const current=++generation;loadJob?.abort();loadJob=null;draft=expected=record=null;available=false;clearExport();draw();
  $('syllable-timing-word').textContent=w?.sourceHebrew??'';$('syllable-timing-window').textContent='';$('syllable-timing-variant').replaceChildren();
  if(!panel.open){message('Open this panel to annotate the selected word in the original chant.');return;}
  try{
   if(!p?.study)throw Error('Source pronunciation correspondence is still loading or unavailable for this selected word.');
   word=w;study=p.study;style=p.style;choices=sourceSyllableChoices(study,word,style);
   if(!choices.length)throw Error('No individually owned source syllables; combined source words remain unsplit.');
   for(const choice of choices){const option=document.createElement('option');option.value=choice.id;option.textContent=choice.label;$('syllable-timing-variant').append(option);}
   choose(choices[0].id);record=refs.byId.get(draft.source.recordingId);
   $('syllable-timing-window').textContent=`${word.reference} · canonical ${draft.word.id} · occurrence ${draft.word.occurrenceId}. ${draft.word.startSeconds.toFixed(6)}–${draft.word.endSeconds.toFixed(6)} source seconds in ${record.title}.${draft.word.timingPolicy?' Original interval outside ambiguous timestamps; no corrected or acoustically approved boundary.':''} Recording Hebrew: ${draft.word.recordingHebrew} (${draft.word.sourceComparison}). Selected style labels source text only; the recorded pronunciation stays unchanged.`;
   const ready=await hasSource(record);if(current!==generation)return;available=ready;draw();
  }catch(error){if(current===generation){draft=expected=null;draw();message(error.message);}}
 }
 panel.addEventListener('toggle',refresh);
 $('syllable-timing-variant').addEventListener('change',()=>{try{choose($('syllable-timing-variant').value);}catch(error){message(error.message);}});
 $('syllable-timing-unit').addEventListener('change',()=>{selected=Number($('syllable-timing-unit').value);draw();});
 for(const key of ['start','end']){
  $(`syllable-timing-${key}`).addEventListener('change',()=>{try{const value=$(`syllable-timing-${key}`).value;draft=setSyllableBoundary(draft,selected,key,value===''?null:Number(value));save();}catch(error){message(error.message);}draw();});
  $(`syllable-timing-capture-${key}`).addEventListener('click',()=>{try{draft=captureSyllableBoundary(draft,selected,key,position());save();if(draft.units[selected][key+'Basis']==='muted-clock')message('Muted-clock annotation saved; it is not evidence of a sung syllable boundary.');}catch(error){message(error.message);}draw();});
 }
 $('syllable-timing-clear').addEventListener('click',()=>{for(const key of ['start','end'])draft=setSyllableBoundary(draft,selected,key,null);save();draw();});
 $('syllable-timing-load').addEventListener('click',async()=>{
  if(loadJob||!record)return;const source=record,job=new AbortController(),current=generation;loadJob=job;draw();message('Loading and checking the unchanged original recording…');
  try{await loadSource(source,job.signal);if(current===generation&&!job.signal.aborted){available=true;message('Original source loaded and checksum checked. Press Play original word when ready.');}}
  catch(error){if(current===generation)message(job.signal.aborted?'Source loading cancelled.':error.message);}
  finally{if(loadJob===job){loadJob=null;draw();}}
 });
 $('syllable-timing-cancel').addEventListener('click',()=>loadJob?.abort());
 async function play(span){const current=generation;try{await audition({word,draft,span});if(current===generation)message('Auditioning your interval in the unchanged original chant at original pitch and speed. Use reference/chant volume to listen; zero volume uses a muted clock.');}catch(error){if(current===generation)message(error.message);}}
 $('syllable-timing-whole').addEventListener('click',()=>play({start:draft.word.startSeconds,end:draft.word.endSeconds}));
 $('syllable-timing-audition').addEventListener('click',()=>{try{play(draftSyllableSpan(draft,selected));}catch(error){message(error.message);}});
 $('syllable-timing-stop').addEventListener('click',()=>stop());
 $('syllable-timing-prepare').addEventListener('click',()=>{const text=JSON.stringify(draft,null,2)+'\n';$('syllable-timing-json').value=text;const a=$('syllable-timing-download');a.href='data:application/json;charset=utf-8,'+encodeURIComponent(text);a.download=`${draft.word.id}-${style}-${draft.pronunciation.choiceId}-syllable-draft.json`;a.hidden=false;message('Unreviewed draft JSON prepared. Source units, shared consonants and marked Hebrew are retained; no phonemes or musical notes are assigned.');});
 $('syllable-timing-import').addEventListener('click',()=>{try{draft=parseSyllableTimingDraft($('syllable-timing-json').value,expected);save();draw();}catch(error){message('Draft not imported: '+error.message);}});
 return {refresh,cancelLoading(){loadJob?.abort();}};
}
