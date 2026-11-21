import {PRINTED_PATTERNS,PRINTED_PATTERN_CATALOG,PATTERN_IMAGE_DATA,PATTERN_RECORD_DATA,patternSource,availablePatternModes,printedPatternPlan} from './printed-patterns.js';
import {Player} from './audio.js';
import {staffMarkup} from './staff.js';
import {noteName} from './music.js';
import {beatLabel} from './score-data.js';
import {soundingNotes} from './synthesis.js';

export function mountPatternStudy({getSettings,beforePlay,findPattern}){
  const $=id=>document.getElementById(id),preferenceKey='tropetrain-pattern-study-v1';
  let plan=[],settingsKey=null,selectedId=null,starting=false,request=0,saved,activeId=null;
  try{saved=JSON.parse(localStorage.getItem(preferenceKey));}catch{}
  const setActive=id=>{
    if(activeId===id)return;activeId=id;const container=$('pattern-staff');let current;
    container.querySelectorAll('[data-event]').forEach(el=>{const active=el.dataset.event===id;el.classList.toggle('active',active);if(active)current=el;});
    if(current){const hit=current.querySelector('.staff-hit').getBoundingClientRect(),box=container.getBoundingClientRect();if(hit.left<box.left||hit.right>box.right)container.scrollBy({left:hit.left-box.left-(container.clientWidth-hit.width)/2,behavior:'auto'});}
  };
  const player=new Player((event,cycle,_progress,index)=>{
    setActive(event.id);$('pattern-status').textContent=`${player.repeat?`Loop ${cycle+1} · `:''}Printed component ${index+1} of ${plan.length} · ${noteName(event.midi)}.`;
  },()=>{starting=false;setActive(null);$('pattern-status').setAttribute('aria-live','polite');$('pattern-status').textContent='Printed pattern finished. Bible-word selection is unchanged.';},undefined,{onError:error=>{stop();$('pattern-status').textContent=`Pattern audio unavailable: ${error.message}`;}});
  function inspect(event){
    selectedId=event.id;$('pattern-note-detail').textContent=`${event.sourceLocation} · ${noteName(event.midi)} (MIDI ${event.midi}) · ${beatLabel(event.beats)} quarter-note beats · ${event.durationSeconds.toFixed(3)} seconds.${event.tieStart||event.tieStop?' Printed tie: hold this pitch without a new attack.':''} No syllable or phoneme allocation is asserted.`;
  }
  function stop(message='Printed pattern stopped.'){
    const wasRunning=player.running||starting;request++;starting=false;player.stop();setActive(null);$('pattern-status').setAttribute('aria-live','polite');
    if(wasRunning)$('pattern-status').textContent=message;
  }
  function populateModes(previous){
    const options=availablePatternModes($('pattern-source').value);$('pattern-mode').replaceChildren();
    const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose supported columns';placeholder.disabled=true;$('pattern-mode').append(placeholder);
    for(const mode of options){const option=document.createElement('option');option.value=mode.id;option.textContent=mode.name;$('pattern-mode').append(option);}
    $('pattern-mode').value=options.some(m=>m.id===previous)?previous:'';
  }
  function remember(){try{localStorage.setItem(preferenceKey,JSON.stringify({sourceId:$('pattern-source').value,mode:$('pattern-mode').value}));}catch{}}
  function refresh(){
    const state=getSettings(),sourceId=$('pattern-source').value,mode=$('pattern-mode').value,row=patternSource(sourceId),record=row.record,key=JSON.stringify([sourceId,mode,state.tempo,state.transpose]);
    $('pattern-settings').textContent=`Uses instrument controls above: ${state.tempo} BPM · transpose ${state.transpose>0?'+':''}${state.transpose} · instrument volume ${state.volume}%. Fixed recordings and the Bible reading’s musical source are separate.`;
    player.setVolume(state.volume/100);if(key===settingsKey)return;stop('Pattern settings changed. Press Play printed pattern to hear them.');settingsKey=key;
    $('pattern-selected-source').textContent=`${row.label}. ${record.sourceKey}`;
    const cells=[...new Set(record.notes.map(n=>n.cell))].map(c=>c==='munah'?'plain Munaḥ':'Revia');
    $('pattern-availability').textContent=`Transcribed: ${cells.join(' and ')}.${row.unavailable.length?' Awaiting notation evidence: '+row.unavailable.map(p=>p.cell==='munah'?'plain Munaḥ':'Revia').join(', ')+'.':''} Independent musical/transcription review is pending.`;
    const legacy=sourceId===PRINTED_PATTERNS.id;
    $('pattern-source-caption').textContent=legacy?'Printed page 540, row I.A: plain Munaḥ and Revia. The separate context image retains its label and key.':`Printed page 540, ${row.label}. The images retain all six ordinary Torah rows A–F; use the printed row label for comparison. Other figures remain context only.`;
    for(const [imageId,linkId,path] of [['pattern-source-scan','pattern-source-link',record.source.image],['pattern-context-scan','pattern-context-link',record.source.contextImage.image]]){
      const value=PATTERN_IMAGE_DATA[path];if($(imageId).getAttribute('src')!==value)$(imageId).src=value;$(linkId).href=value;
      $(imageId).alt=`Cohen 1902 printed Torah pattern source: ${legacy?'row I.A':'six rows A–F; selected '+row.label}`;
    }
    $('pattern-record-link').href=PATTERN_RECORD_DATA[row.recordPath??'docs/PRINTED-PATTERN-CATALOG.json'];
    const supported=availablePatternModes(sourceId).some(m=>m.id===mode);
    $('pattern-play').disabled=!supported;$('pattern-download').disabled=!supported;
    if(!supported){plan=[];$('pattern-staff').replaceChildren();$('pattern-summary').textContent='Choose a supported printed column. Unresolved figures remain unavailable.';$('pattern-note-detail').textContent='';$('pattern-status').textContent='Choose supported columns for this source row.';return;}
    plan=printedPatternPlan(mode,{...state,sourceId});$('pattern-staff').innerHTML=staffMarkup(plan,[],0,plan.length,{untexted:true});
    $('pattern-summary').textContent=`${plan.length} printed components · ${soundingNotes(plan).length} sounding attacks · ${beatLabel(plan.reduce((n,e)=>n+e.beats,0))} quarter-note beats · ${(plan.at(-1).startSeconds+plan.at(-1).durationSeconds).toFixed(2)} seconds. Ties hold pitches; slurs keep distinct attacks.`;
    for(const el of $('pattern-staff').querySelectorAll('[data-event]')){
      const event=plan.find(e=>e.id===el.dataset.event);el.addEventListener('click',()=>inspect(event));
      el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect(event);}});
    }
    inspect(plan.find(e=>e.id===selectedId)??plan[0]);$('pattern-status').textContent='Ready to compare these printed figures.';
  }
  for(const row of PRINTED_PATTERN_CATALOG.rows){const option=document.createElement('option');option.value=row.id;option.textContent=row.label;$('pattern-source').append(option);}
  $('pattern-source').value=PRINTED_PATTERN_CATALOG.rows.some(r=>r.id===saved?.sourceId)?saved.sourceId:PRINTED_PATTERNS.id;
  populateModes(saved?.mode??'pair');
  $('pattern-source').addEventListener('change',()=>{populateModes($('pattern-mode').value);remember();refresh();});
  $('pattern-mode').addEventListener('change',()=>{remember();refresh();});
  $('pattern-play').addEventListener('click',async()=>{
    beforePlay();refresh();if(!plan.length)return;const state=getSettings(),current=++request;starting=true;$('pattern-status').setAttribute('aria-live','off');$('pattern-status').textContent='Starting the printed pattern…';
    player.setVolume(state.volume/100);
    try{
      await player.play(plan,state.repeat);if(current!==request)return;starting=false;
      if($('pattern-status').textContent==='Starting the printed pattern…')$('pattern-status').textContent=player.running?'Playing the printed pattern.':'Pattern playback was cancelled before it began.';
    }catch(error){if(current!==request)return;stop();$('pattern-status').textContent=`Pattern unavailable: ${error.message}`;}
  });
  $('pattern-stop').addEventListener('click',()=>{stop();$('pattern-status').textContent='Printed pattern stopped. Bible-word selection is unchanged.';});
  $('pattern-find').addEventListener('click',()=>findPattern(patternSource($('pattern-source').value).record.matchingQuery.join('>')));
  $('pattern-download').addEventListener('click',()=>{
    refresh();if(!plan.length)return;const state=getSettings(),row=patternSource($('pattern-source').value),record={format:'tropetrain-untexted-pattern-v1',source:row.record,sourceCatalog:{id:PRINTED_PATTERN_CATALOG.id,revision:PRINTED_PATTERN_CATALOG.revision},mode:$('pattern-mode').value,
      tempo:state.tempo,transpose:state.transpose,volume:state.volume,pronunciation:null,phonemes:null,syllableUnderlay:null,
      vocalRange:{low:state.rangeLow,high:state.rangeHigh,mode:'advisory'},events:plan};
    const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='tropetrain-printed-pattern.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  for(const id of ['pattern-source','pattern-mode','pattern-stop','pattern-find'])$(id).disabled=false;
  refresh();
  return {stop,refresh,setRepeat:value=>{player.repeat=value;},volumeChanged:()=>refresh()};
}
