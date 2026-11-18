import { words, bounds, consonantal, buildPlan, noteName, melody } from './music.js';
import { passage } from './passage.js';
import { Player } from './audio.js';

const $=id=>document.getElementById(id);
const state={cursor:0,anchor:0,view:'pointed',scope:'group',tempo:84,transpose:0,repeat:false,groups:true,rangeLow:60,rangeHigh:72};
try{
  const saved=JSON.parse(localStorage.getItem('tropetrain-practice-v1'));
  if(saved){
    for(const k of ['cursor','anchor'])if(Number.isInteger(saved[k])&&saved[k]>=0&&saved[k]<words.length)state[k]=saved[k];
    if(['pointed','consonantal','parallel'].includes(saved.view))state.view=saved.view;
    if(['word','group','verse','selection','passage'].includes(saved.scope))state.scope=saved.scope;
    for(const [key,min,max] of [['tempo',40,160],['transpose',-12,12],['rangeLow',36,84],['rangeHigh',36,84]])if(Number.isInteger(saved[key])&&saved[key]>=min&&saved[key]<=max)state[key]=saved[key];
    for(const k of ['groups','repeat'])if(typeof saved[k]==='boolean')state[k]=saved[k];
  }
}catch{/* Storage is optional, including in private browsing. */}
let chooseEnd=false,plan=[],activeId=null,playingBounds=null;
const persist=()=>{try{localStorage.setItem('tropetrain-practice-v1',JSON.stringify(state));}catch{}};
const label=i=>`1:${words[i].verse} · word ${Number(words[i].id.split('-').at(-1))}`;
function setActive(id){
  if(id===activeId)return;activeId=id;
  document.querySelectorAll('[data-word]').forEach(el=>el.classList.toggle('active',el.dataset.word===id));
}
const player=new Player((event,cycle,progress)=>{
  setActive(event.wordId);
  document.querySelectorAll('[data-event]').forEach(el=>el.classList.toggle('active',el.dataset.event===event.id));
  $('progress').style.width=`${progress*100}%`;
  const nextStatus=`${state.repeat?`Loop ${cycle+1} · `:''}Playing ${label(event.wordIndex)} · ${noteName(event.midi)}`;
  // The visual status updates on notes; the live region only announces transport.
  $('status').textContent=nextStatus;
},()=>{
  setActive(null);$('progress').style.width='100%';
  document.querySelectorAll('[data-event]').forEach(el=>el.classList.remove('active'));
  $('status').setAttribute('aria-live','polite');
  $('status').textContent=`Finished at ${label(playingBounds[1])}.`;
  $('play').innerHTML='<span aria-hidden="true">▶</span> Play';
});
function stop(message='Stopped. Your selection is kept.'){
  player.stop();setActive(null);$('progress').style.width='0%';
  document.querySelectorAll('[data-event]').forEach(el=>el.classList.remove('active'));
  $('status').setAttribute('aria-live','polite');$('status').textContent=message;
  $('play').innerHTML='<span aria-hidden="true">▶</span> Play';
}
async function play(){
  playingBounds=bounds(state.cursor,state.anchor,state.scope);
  plan=buildPlan(...playingBounds,state);renderSequence();
  $('status').setAttribute('aria-live','off');
  $('play').innerHTML='<span aria-hidden="true">▶</span> Restart';
  try{await player.play(plan,state.repeat);}catch(error){stop(`Audio unavailable: ${error.message}. Try a browser with Web Audio support.`);}
}
function selectWord(index,extend=false){
  stop('Ready to listen.');
  if(extend||chooseEnd){state.cursor=index;state.scope='selection';chooseEnd=false;}
  else{state.cursor=index;state.anchor=index;}
  render();
}
function wordButton(w,plain){
  const b=document.createElement('button');
  b.className=`word group-${w.group%2?'odd':'even'}${w.groupEnd?' group-end':''}`;
  b.dataset.word=w.id;b.dataset.index=w.index;
  b.textContent=plain?consonantal(w.sourceHebrew):w.sourceHebrew;
  b.lang='he';b.dir='rtl';
  b.title=`${w.reference}, word ${w.id.split('-').at(-1)} · ${w.accent}`;
  b.setAttribute('aria-label',`${b.textContent}, ${w.reference}, word ${w.id.split('-').at(-1)}`);
  b.addEventListener('click',e=>selectWord(w.index,e.shiftKey));
  b.addEventListener('dblclick',()=>{state.cursor=w.index;state.anchor=w.index;state.scope='word';render();play();});
  b.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
      e.preventDefault();const i=Math.max(0,Math.min(words.length-1,w.index+(e.key==='ArrowLeft'?1:-1)));
      selectWord(i,e.shiftKey);
      document.querySelector(`[data-word="${words[i].id}"]`).focus();
    }
  });
  return b;
}
function renderReader(){
  $('reader').replaceChildren();$('reader').classList.toggle('guides',state.groups);
  if(state.view==='parallel'){
    const headings=document.createElement('div');headings.className='parallel-headings';
    headings.innerHTML='<span>Consonantal practice</span><span>Pointed source</span>';$('reader').append(headings);
  }
  for(const verse of passage.verses){
    const row=document.createElement('div');row.className='verse';
    const number=document.createElement('span');number.className='verse-number';number.textContent=`${verse.number}`;row.append(number);
    const lines=document.createElement('div');if(state.view==='parallel')lines.className='parallel-lines';
    for(const plain of state.view==='parallel'?[true,false]:[state.view==='consonantal']){
      const line=document.createElement('div');line.className='hebrew-line';line.lang='he';line.dir='rtl';
      for(const word of words.filter(w=>w.verse===verse.number)){line.append(wordButton(word,plain),document.createTextNode(' '));}
      lines.append(line);
    }
    row.append(lines);$('reader').append(row);
  }
  const note=document.createElement('p');note.className='layout-note';
  note.textContent='Group guides: major practice divisions only. '+(state.view==='pointed'?'Source marks are preserved verbatim.':'Consonantal practice uses print letters and responsive lines; this is not a scroll facsimile.');
  $('reader').append(note);updateSelection();
}
function updateSelection(){
  const [start,end]=bounds(state.cursor,state.anchor,state.scope);
  document.querySelectorAll('[data-word]').forEach(el=>{
    const i=Number(el.dataset.index);el.classList.toggle('selected',i>=start&&i<=end);
    el.classList.toggle('cursor',i===state.cursor);el.classList.toggle('active',el.dataset.word===activeId);
    el.setAttribute('aria-pressed',String(i>=start&&i<=end));
  });
  $('selection-label').textContent=state.scope==='selection'?`Selected ${label(start)} to ${label(end)}`:`Cursor: Genesis ${label(state.cursor)}`;
  $('span-preview').textContent=`Genesis ${label(start)} to ${label(end)} · ${end-start+1} word${end>start?'s':''}`;
  $('end-selection').setAttribute('aria-pressed',String(chooseEnd));
  $('end-selection').textContent=chooseEnd?'Click the last word':'Choose span end';
  const w=words[state.cursor];$('current-word').textContent=w.sourceHebrew;
  $('current-reference').textContent=`${w.reference} · word ${w.id.split('-').at(-1)}`;
  $('accent-name').textContent=w.accent;
  $('group-name').textContent=`Practice group ${w.group+1} · ${w.id}`;
}
function renderSequence(){
  plan=buildPlan(...bounds(state.cursor,state.anchor,state.scope),state);
  $('event-count').textContent=`${plan.length} events · ${(plan.at(-1).startSeconds+plan.at(-1).durationSeconds).toFixed(2)} s`;
  $('note-ribbon').replaceChildren();$('event-rows').replaceChildren();
  for(const e of plan){
    const chip=document.createElement('div');chip.className='note-chip';chip.dataset.event=e.id;
    const pitch=document.createElement('span');pitch.className='pitch';pitch.textContent=noteName(e.midi);
    const stem=document.createElement('span');stem.className='note-stem';stem.setAttribute('aria-hidden','true');
    const syllable=document.createElement('span');syllable.className='syllable';syllable.lang='he';syllable.dir='rtl';syllable.textContent=e.syllable;
    const length=document.createElement('span');length.className='length';length.textContent=`${e.beats} beats`;
    chip.append(pitch,stem,syllable,length);$('note-ribbon').append(chip);
    const row=document.createElement('tr');row.dataset.event=e.id;
    for(const [i,value] of [e.wordId,e.syllable,noteName(e.midi),e.midi,e.startBeat.toFixed(2),e.beats,e.durationSeconds.toFixed(3)].entries()){
      const cell=document.createElement('td');cell.textContent=value;
      if(i===1){cell.lang='he';cell.dir='rtl';}row.append(cell);
    }
    $('event-rows').append(row);
  }
  const out=plan.filter(e=>e.midi<state.rangeLow||e.midi>state.rangeHigh).length;
  $('range-report').textContent=state.rangeLow>state.rangeHigh?'Lowest note must be below highest note.':`${out} of ${plan.length} notes outside ${noteName(state.rangeLow)}–${noteName(state.rangeHigh)}.`;
}
function render(){
  for(const key of ['scope','tempo','transpose'])$(key).value=state[key];
  for(const key of ['repeat','groups'])$(key).checked=state[key];
  $('range-low').value=state.rangeLow;$('range-high').value=state.rangeHigh;
  $('tempo-value').textContent=`${state.tempo} BPM`;
  $('transpose-value').textContent=`${state.transpose>0?'+':''}${state.transpose} semitone${Math.abs(state.transpose)!==1?'s':''}`;
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));
  renderReader();renderSequence();persist();
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;render();}));
$('groups').addEventListener('change',e=>{state.groups=e.target.checked;render();});
$('scope').addEventListener('change',e=>{stop('Ready to listen.');state.scope=e.target.value;render();});
$('end-selection').addEventListener('click',()=>{chooseEnd=!chooseEnd;updateSelection();});
$('play').addEventListener('click',play);$('stop').addEventListener('click',()=>stop());
$('repeat').addEventListener('change',e=>{const running=player.running;state.repeat=e.target.checked;persist();if(running)play();});
function changeSound(key,value,min,max){
  if(!Number.isFinite(value))return;const running=player.running;
  state[key]=Math.min(max,Math.max(min,Math.round(value)));stop('Settings changed. Ready to listen.');render();if(running)play();
}
$('tempo').addEventListener('input',e=>changeSound('tempo',Number(e.target.value),40,160));
$('transpose').addEventListener('change',e=>changeSound('transpose',Number(e.target.value),-12,12));
$('pitch-up').addEventListener('click',()=>changeSound('transpose',state.transpose+1,-12,12));
$('pitch-down').addEventListener('click',()=>changeSound('transpose',state.transpose-1,-12,12));
for(const [id,key] of [['range-low','rangeLow'],['range-high','rangeHigh']]){
  for(let midi=36;midi<=84;midi++){const o=document.createElement('option');o.value=midi;o.textContent=noteName(midi);$(id).append(o);}
  $(id).addEventListener('change',e=>{state[key]=Number(e.target.value);renderSequence();persist();});
}
$('download').addEventListener('click',()=>{
  const [start,end]=bounds(state.cursor,state.anchor,state.scope);
  const exported={format:'tropetrain-events-v1',textSource:{...passage,verses:undefined},melody,
    pronunciation:{id:null,status:'not implemented'},vocalRange:{low:state.rangeLow,high:state.rangeHigh,mode:'advisory'},
    tempo:state.tempo,transpose:state.transpose,startWordId:words[start].id,endWordId:words[end].id,
    words:words.slice(start,end+1),events:plan};
  const url=URL.createObjectURL(new Blob([JSON.stringify(exported,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='tropetrain-genesis-events.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){stop();return;}if(e.key==='F2'){e.preventDefault();stop();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&player.running)stop('Paused because this tab is hidden. Press Play to restart the span.');});
render();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{$('offline-status').textContent='Local audio · available offline after first load';}).catch(()=>{});
