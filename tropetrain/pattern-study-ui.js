import {PRINTED_PATTERNS,PATTERN_MODES,printedPatternPlan} from './printed-patterns.js';
import {Player} from './audio.js';
import {staffMarkup} from './staff.js';
import {noteName} from './music.js';
import {beatLabel} from './score-data.js';

export function mountPatternStudy({getSettings,beforePlay,findPattern}){
  const $=id=>document.getElementById(id);let plan=[],settingsKey=null,selectedId=null,starting=false,request=0;
  const setActive=id=>{$('pattern-staff').querySelectorAll('[data-event]').forEach(el=>el.classList.toggle('active',el.dataset.event===id));};
  const player=new Player((event,cycle,_progress,index)=>{
    setActive(event.id);$('pattern-status').textContent=`${player.repeat?`Loop ${cycle+1} · `:''}Printed note ${index+1} of ${plan.length} · ${noteName(event.midi)}.`;
  },()=>{starting=false;setActive(null);$('pattern-status').setAttribute('aria-live','polite');$('pattern-status').textContent='Printed pattern finished. Bible-word selection is unchanged.';},undefined,{onError:error=>{stop();$('pattern-status').textContent=`Pattern audio unavailable: ${error.message}`;}});
  function inspect(event){
    selectedId=event.id;$('pattern-note-detail').textContent=`${event.sourceLocation} · ${noteName(event.midi)} (MIDI ${event.midi}) · ${beatLabel(event.beats)} quarter-note beats · ${event.durationSeconds.toFixed(3)} seconds. No syllable or phoneme allocation is asserted.`;
  }
  function stop(message='Printed pattern stopped.'){
    const wasRunning=player.running||starting;request++;starting=false;player.stop();setActive(null);$('pattern-status').setAttribute('aria-live','polite');
    if(wasRunning)$('pattern-status').textContent=message;
  }
  function refresh(){
    const state=getSettings(),mode=$('pattern-mode').value,key=JSON.stringify([mode,state.tempo,state.transpose]);
    $('pattern-settings').textContent=`Uses instrument controls above: ${state.tempo} BPM · transpose ${state.transpose>0?'+':''}${state.transpose} · instrument volume ${state.volume}%. Fixed recordings and the Bible reading’s musical source are separate.`;
    player.setVolume(state.volume/100);if(key===settingsKey)return;stop('Pattern settings changed. Press Play printed pattern to hear them.');settingsKey=key;
    plan=printedPatternPlan(mode,state);$('pattern-staff').innerHTML=staffMarkup(plan,[],0,12,{untexted:true});
    $('pattern-summary').textContent=`${plan.length} printed notes · ${plan.reduce((n,e)=>n+e.beats,0)} quarter-note beats · ${(plan.at(-1).startSeconds+plan.at(-1).durationSeconds).toFixed(2)} seconds. Printed slurs are shown; the instrument articulates the individual notes.`;
    for(const el of $('pattern-staff').querySelectorAll('[data-event]')){
      const event=plan.find(e=>e.id===el.dataset.event);el.addEventListener('click',()=>inspect(event));
      el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect(event);}});
    }
    inspect(plan.find(e=>e.id===selectedId)??plan[0]);
  }
  for(const mode of PATTERN_MODES){const option=document.createElement('option');option.value=mode.id;option.textContent=mode.name;$('pattern-mode').append(option);}
  $('pattern-mode').addEventListener('change',refresh);
  $('pattern-play').addEventListener('click',async()=>{
    beforePlay();refresh();const state=getSettings(),current=++request;starting=true;$('pattern-status').setAttribute('aria-live','off');$('pattern-status').textContent='Starting the printed pattern…';
    player.setVolume(state.volume/100);
    try{
      await player.play(plan,state.repeat);if(current!==request)return;starting=false;
      if($('pattern-status').textContent==='Starting the printed pattern…')$('pattern-status').textContent=player.running?'Playing the printed pattern.':'Pattern playback was cancelled before it began.';
    }catch(error){if(current!==request)return;stop();$('pattern-status').textContent=`Pattern unavailable: ${error.message}`;}
  });
  $('pattern-stop').addEventListener('click',()=>{stop();$('pattern-status').textContent='Printed pattern stopped. Bible-word selection is unchanged.';});
  $('pattern-find').addEventListener('click',()=>findPattern(PRINTED_PATTERNS.matchingQuery.join('>')));
  $('pattern-download').addEventListener('click',()=>{
    refresh();const state=getSettings(),record={format:'tropetrain-untexted-pattern-v1',source:PRINTED_PATTERNS,mode:$('pattern-mode').value,
      tempo:state.tempo,transpose:state.transpose,volume:state.volume,pronunciation:null,phonemes:null,syllableUnderlay:null,
      vocalRange:{low:state.rangeLow,high:state.rangeHigh,mode:'advisory'},events:plan};
    const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='tropetrain-printed-pattern.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  refresh();
  for(const id of ['pattern-mode','pattern-play','pattern-stop','pattern-find','pattern-download'])$(id).disabled=false;
  return {stop,refresh,setRepeat:value=>{player.repeat=value;},volumeChanged:()=>refresh()};
}
