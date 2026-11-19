import {createReadingModel,consonantal,noteName,melody} from './music.js';
import {passage as openingPassage} from './passage.js';
import {getCorpus,defaultRange,createAssignment,parseAssignment} from './library.js';
import {Player} from './audio.js';

const $=id=>document.getElementById(id),VERSE_PAGE=8,NOTE_PAGE=128;
const state={cursor:0,anchor:0,view:'pointed',scope:'group',tempo:84,transpose:0,volume:70,repeat:false,groups:true,
  rangeLow:60,rangeHigh:72,readerPage:0,notePage:0,followPlayback:true,ranges:null};
try{
  const saved=JSON.parse(localStorage.getItem('tropetrain-practice-v1'));
  if(saved){
    for(const [key,min,max] of [['cursor',0,1000000],['anchor',0,1000000],['tempo',40,160],['transpose',-12,12],['volume',0,100],['rangeLow',36,84],['rangeHigh',36,84],['readerPage',0,100000]])
      if(Number.isInteger(saved[key])&&saved[key]>=min&&saved[key]<=max)state[key]=saved[key];
    if(['pointed','consonantal','parallel'].includes(saved.view))state.view=saved.view;
    if(['word','group','verse','aliyah','selection','passage'].includes(saved.scope))state.scope=saved.scope;
    for(const key of ['repeat','groups','followPlayback'])if(typeof saved[key]==='boolean')state[key]=saved[key];
    if(Array.isArray(saved.ranges))state.ranges=saved.ranges;
  }
}catch{}
const restore={cursor:state.cursor,anchor:state.anchor,readerPage:state.readerPage,ranges:state.ranges};
let passage={...openingPassage,title:'Genesis 1:1–3',ranges:[structuredClone(defaultRange)]};
let model=createReadingModel(passage),{words,bounds,buildPlan}=model;
state.cursor=Math.min(state.cursor,words.length-1);state.anchor=Math.min(state.anchor,words.length-1);state.readerPage=0;
let corpus,chooseEnd=false,plan=[],activeId=null,activeEventId=null,playingBounds=null;
let recent=loadArray('tropetrain-recent-v1'),assignments=loadArray('tropetrain-assignments-v1');
let restoringReading=!!restore.ranges;
function loadArray(key){try{const data=JSON.parse(localStorage.getItem(key));return Array.isArray(data)?data.filter(item=>item&&typeof item==='object'&&typeof item.title==='string').slice(0,100):[];}catch{return [];}}
function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
function persist(){if(!restoringReading)store('tropetrain-practice-v1',{...state,ranges:passage.ranges});}
const label=i=>`${words[i].chapter}:${words[i].verse} · word ${words[i].ordinal}`;
const fullLabel=i=>`${words[i].bookName} ${label(i)}`;
const say=text=>{$('status').setAttribute('aria-live','polite');$('status').textContent=text;};
const player=new Player((event,cycle,progress,index)=>{
  if(state.followPlayback){
    const page=Math.floor(words[event.wordIndex].verseIndex/VERSE_PAGE);
    if(page!==state.readerPage){state.readerPage=page;renderReader();}
    const notePage=Math.floor(index/NOTE_PAGE);
    if(notePage!==state.notePage){state.notePage=notePage;renderNotes();}
  }
  setActive(event.wordId,event.id);
  $('progress').style.width=`${progress*100}%`;
  $('status').textContent=`${state.repeat?`Loop ${cycle+1} · `:''}Playing ${label(event.wordIndex)} · ${noteName(event.midi)}`;
},()=>{
  setActive(null,null);$('progress').style.width='100%';say(`Finished at ${label(playingBounds[1])}.`);transportLabel(false);
});
function transportLabel(running){$('play').innerHTML=running?'<span aria-hidden="true">▶</span> Restart':'<span aria-hidden="true">▶</span> Play';}
function setActive(wordId,eventId){
  if(wordId!==activeId){activeId=wordId;document.querySelectorAll('[data-word]').forEach(el=>el.classList.toggle('active',el.dataset.word===wordId));}
  if(eventId!==activeEventId){activeEventId=eventId;document.querySelectorAll('[data-event]').forEach(el=>el.classList.toggle('active',el.dataset.event===eventId));}
}
function stop(message='Stopped. Your selection is kept.'){
  player.stop();setActive(null,null);$('progress').style.width='0%';say(message);transportLabel(false);
}
async function play(){
  playingBounds=bounds(state.cursor,state.anchor,state.scope);renderSequence();
  $('status').setAttribute('aria-live','off');transportLabel(true);player.setVolume(state.volume/100);
  try{await player.play(plan,state.repeat);}catch(error){stop(`Audio unavailable: ${error.message}`);}
}
function selectWord(index,extend=false){
  stop('Ready to listen.');
  if(extend||chooseEnd){state.cursor=index;state.scope='selection';chooseEnd=false;}
  else{state.cursor=index;state.anchor=index;}
  state.readerPage=Math.floor(words[index].verseIndex/VERSE_PAGE);state.notePage=0;render();
}
function setWordText(button,word,plain){
  if(plain){button.textContent=consonantal(word.sourceHebrew);return;}
  const sizes=(word.editorialNotes||[]).filter(n=>n.kind==='letterSize').sort((a,b)=>a.offset-b.offset);
  let offset=0;
  for(const size of sizes){
    button.append(document.createTextNode(word.sourceHebrew.slice(offset,size.offset)));
    const span=document.createElement('span');span.className=`source-letter-${size.size}`;span.textContent=word.sourceHebrew.slice(size.offset,size.offset+size.length);button.append(span);offset=size.offset+size.length;
  }
  button.append(document.createTextNode(word.sourceHebrew.slice(offset)));
}
function wordButton(w,plain){
  const b=document.createElement('button');b.className=`word group-${w.group%2?'odd':'even'}${w.groupEnd?' group-end':''}${w.kind==='q'?' qere-word':''}`;
  b.dataset.word=w.id;b.dataset.index=w.index;setWordText(b,w,plain);b.lang='he';b.dir='rtl';
  b.title=`${w.reference}, word ${w.ordinal} · ${w.accent}`;b.setAttribute('aria-label',`${b.textContent}, ${w.reference}, word ${w.ordinal}`);
  b.addEventListener('click',e=>selectWord(w.index,e.shiftKey));
  b.addEventListener('dblclick',()=>{state.cursor=w.index;state.anchor=w.index;state.scope='word';state.notePage=0;render();play();});
  b.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
      e.preventDefault();const i=Math.max(0,Math.min(words.length-1,w.index+(e.key==='ArrowLeft'?1:-1)));selectWord(i,e.shiftKey);
      document.querySelector(`[data-word="${words[i].id}"]`).focus();
    }
  });return b;
}
function renderReader(){
  $('reader').replaceChildren();$('reader').classList.toggle('guides',state.groups);
  const pages=Math.ceil(passage.verses.length/VERSE_PAGE);state.readerPage=Math.min(state.readerPage,pages-1);
  if(state.view==='parallel'){
    const headings=document.createElement('div');headings.className='parallel-headings';headings.innerHTML='<span>Consonantal practice</span><span>Pointed source</span>';$('reader').append(headings);
  }
  const first=state.readerPage*VERSE_PAGE,last=Math.min(first+VERSE_PAGE,passage.verses.length);
  for(let verseIndex=first;verseIndex<last;verseIndex++){
    const verse=passage.verses[verseIndex],row=document.createElement('div');row.className='verse';
    const number=document.createElement('span');number.className='verse-number';number.textContent=`${verse.chapter??1}:${verse.number}`;number.title=verse.reference;row.append(number);
    const lines=document.createElement('div');if(state.view==='parallel')lines.className='parallel-lines';
    for(const plain of state.view==='parallel'?[true,false]:[state.view==='consonantal']){
      const line=document.createElement('div');line.className='hebrew-line';line.lang='he';line.dir='rtl';
      for(const word of words.filter(w=>w.verseIndex===verseIndex))line.append(wordButton(word,plain),document.createTextNode(' '));
      lines.append(line);
    }
    row.append(lines);$('reader').append(row);
  }
  const note=document.createElement('p');note.className='layout-note';note.textContent='Group guides: major practice divisions only. '+(state.view==='pointed'?'Source marks are preserved verbatim.':'Consonantal practice uses print letters and responsive lines; this is not a scroll facsimile.');$('reader').append(note);
  $('reader-page-label').textContent=`Verses ${first+1}–${last} of ${passage.verses.length}`;
  $('reader-previous').disabled=state.readerPage===0;$('reader-next').disabled=state.readerPage===pages-1;
  updateSelection();
}
function updateSelection(){
  const [start,end]=bounds(state.cursor,state.anchor,state.scope);
  document.querySelectorAll('[data-word]').forEach(el=>{
    const i=Number(el.dataset.index),selected=i>=start&&i<=end;el.classList.toggle('selected',selected);el.classList.toggle('cursor',i===state.cursor);
    el.classList.toggle('active',el.dataset.word===activeId);el.setAttribute('aria-pressed',String(selected));
  });
  $('selection-label').textContent=state.scope==='selection'?`Selected ${fullLabel(start)} to ${fullLabel(end)}`:`Cursor: ${fullLabel(state.cursor)}`;
  $('span-preview').textContent=`${fullLabel(start)} to ${fullLabel(end)} · ${end-start+1} word${end>start?'s':''}`;
  $('compact-span').textContent=`${words[start].bookName} ${words[start].chapter}:${words[start].verse} · ${end-start+1} words`;
  $('end-selection').setAttribute('aria-pressed',String(chooseEnd));$('end-selection').textContent=chooseEnd?'Click the last word':'Choose span end';
  const w=words[state.cursor];$('current-word').textContent=w.sourceHebrew;$('current-reference').textContent=`${w.reference} · word ${w.ordinal}`;
  $('accent-name').textContent=w.accent;$('group-name').textContent=`Practice group ${w.group+1} · ${w.sourceWordId??w.id}`;
  $('source-variant').textContent=w.kind==='q'?`Reading form (qere). Written form: ${(w.writtenVariants||[]).map(t=>t.sourceHebrew).join(' ')||'see source edition'}`:'';
  $('alignment-status').textContent=w.analysisStatus==='unsegmented'?'Syllable boundaries unresolved; word shown as one aligned unit.':`${w.syllables.length} draft syllables · ${w.analysisStatus==='draft-manual'?'manual fixture':'automatic analysis'} · not reader-reviewed`;
}
function renderNotes(){
  state.notePage=Math.min(state.notePage,Math.max(0,Math.ceil(plan.length/NOTE_PAGE)-1));
  const from=state.notePage*NOTE_PAGE,to=Math.min(from+NOTE_PAGE,plan.length);
  $('note-ribbon').replaceChildren();$('event-rows').replaceChildren();
  for(const e of plan.slice(from,to)){
    const chip=document.createElement('div');chip.className='note-chip';chip.dataset.event=e.id;
    const pitch=document.createElement('span');pitch.className='pitch';pitch.textContent=noteName(e.midi);
    const stem=document.createElement('span');stem.className='note-stem';stem.setAttribute('aria-hidden','true');
    const syllable=document.createElement('span');syllable.className='syllable';syllable.lang='he';syllable.dir='rtl';syllable.textContent=e.syllable;
    const length=document.createElement('span');length.className='length';length.textContent=`${e.beats} beats`;chip.append(pitch,stem,syllable,length);chip.classList.toggle('active',e.id===activeEventId);$('note-ribbon').append(chip);
    const row=document.createElement('tr');row.dataset.event=e.id;row.classList.toggle('active',e.id===activeEventId);
    for(const [i,value] of [e.wordId,e.syllable,noteName(e.midi),e.midi,e.startBeat.toFixed(2),e.beats,e.durationSeconds.toFixed(3)].entries()){
      const cell=document.createElement('td');cell.textContent=value;if(i===1){cell.lang='he';cell.dir='rtl';}row.append(cell);
    }$('event-rows').append(row);
  }
  $('note-page-label').textContent=`Notes ${from+1}–${to} of ${plan.length}`;$('notes-previous').disabled=from===0;$('notes-next').disabled=to===plan.length;
}
function renderSequence(){
  plan=buildPlan(...bounds(state.cursor,state.anchor,state.scope),state);
  const duration=plan.at(-1).startSeconds+plan.at(-1).durationSeconds;
  $('event-count').textContent=`${plan.length} events · ${duration.toFixed(2)} s`;renderNotes();
  const out=plan.filter(e=>e.midi<state.rangeLow||e.midi>state.rangeHigh).length;
  $('range-report').textContent=state.rangeLow>state.rangeHigh?'Lowest note must be below highest note.':`${out} of ${plan.length} notes outside ${noteName(state.rangeLow)}–${noteName(state.rangeHigh)}.`;
}
function render(){
  for(const key of ['scope','tempo','transpose','volume'])$(key).value=state[key];
  for(const key of ['repeat','groups'])$(key).checked=state[key];$('follow-playback').checked=state.followPlayback;
  $('range-low').value=state.rangeLow;$('range-high').value=state.rangeHigh;
  $('tempo-value').textContent=`${state.tempo} BPM`;$('transpose-value').textContent=`${state.transpose>0?'+':''}${state.transpose} semitone${Math.abs(state.transpose)!==1?'s':''}`;$('volume-value').textContent=`${state.volume}%`;
  $('passage-title').textContent=passage.title;$('word-count').textContent=`${passage.verses.length} verse${passage.verses.length===1?'':'s'} · ${words.length} words`;
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));
  renderReader();renderSequence();persist();
}
function rememberReading(){
  const key=ranges=>JSON.stringify(ranges.map(r=>({bookId:r.bookId,start:r.start,end:r.end,hidden:r.hidden})));
  recent=[{title:passage.title,ranges:passage.ranges},...recent.filter(r=>r.ranges&&key(r.ranges)!==key(passage.ranges))].slice(0,8);store('tropetrain-recent-v1',recent);renderPickers();
}
function applyRanges(ranges,{remember=true,restoreCursor=null}={}){
  if(!corpus)throw Error('The Torah library is still loading.');
  const nextPassage=corpus.passage(ranges),nextModel=createReadingModel(nextPassage);
  stop('Reading opened. Ready to listen.');passage=nextPassage;model=nextModel;({words,bounds,buildPlan}=model);
  state.cursor=restoreCursor&&words[restoreCursor.cursor]?restoreCursor.cursor:0;state.anchor=restoreCursor&&words[restoreCursor.anchor]?restoreCursor.anchor:state.cursor;
  state.readerPage=Math.floor(words[state.cursor].verseIndex/VERSE_PAGE);state.notePage=0;chooseEnd=false;render();renderSections();if(remember)rememberReading();
  const unresolved=words.filter(w=>w.analysisStatus==='unsegmented').length;
  $('library-message').textContent=`Opened ${passage.title}. ${unresolved?`${unresolved} words have unresolved syllable boundaries. `:''}All musical output is the original demonstration; syllables are unreviewed.`;
}
function rangeFromForm(){return {id:`section-${globalThis.crypto?.randomUUID?.()||Date.now()}`,bookId:$('book').value,
  start:{chapter:Number($('start-chapter').value),verse:Number($('start-verse').value)},end:{chapter:Number($('end-chapter').value),verse:Number($('end-verse').value)},label:`Section ${passage.ranges.length+1}`};}
function libraryAction(fn){try{fn();}catch(error){$('library-message').textContent=error.message;}}
function renderSections(){
  $('sections').replaceChildren();
  for(const [index,range] of passage.ranges.entries()){
    const row=document.createElement('div');row.className='section-row';
    const check=document.createElement('input');check.type='checkbox';check.checked=!range.hidden;check.setAttribute('aria-label',`Show ${range.label||'section '+(index+1)}`);
    check.addEventListener('change',()=>libraryAction(()=>{try{applyRanges(passage.ranges.map(r=>r.id===range.id?{...r,hidden:!check.checked}:r),{remember:false});}finally{renderSections();}}));
    const title=document.createElement('span');title.textContent=`${range.label||`Section ${index+1}`} · ${corpus?corpus.describe(range):passage.title}`;
    const jump=document.createElement('button');jump.textContent='Go to section';jump.disabled=!!range.hidden;jump.addEventListener('click',()=>{const i=words.findIndex(w=>w.sectionId===range.id);if(i>=0)selectWord(i);});
    row.append(check,title,jump);
    if(passage.ranges.length>1){const remove=document.createElement('button');remove.textContent='Remove section';remove.addEventListener('click',()=>libraryAction(()=>applyRanges(passage.ranges.filter(r=>r.id!==range.id))));row.append(remove);}
    $('sections').append(row);
  }
}
function renderPickers(){
  for(const [id,items,placeholder] of [['recent-readings',recent,'Choose a recent reading'],['saved-assignments',assignments,'Choose an assignment']]){
    $(id).replaceChildren();const first=document.createElement('option');first.value='';first.textContent=placeholder;$(id).append(first);
    items.forEach((item,index)=>{const o=document.createElement('option');o.value=index;o.textContent=item.title;$(id).append(o);});
  }
}
function download(filename,data){
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
for(const [id,key] of [['range-low','rangeLow'],['range-high','rangeHigh']]){
  for(let midi=36;midi<=84;midi++){const o=document.createElement('option');o.value=midi;o.textContent=noteName(midi);$(id).append(o);}
  $(id).addEventListener('change',e=>{state[key]=Number(e.target.value);renderSequence();persist();});
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;render();}));
$('groups').addEventListener('change',e=>{state.groups=e.target.checked;render();});
$('scope').addEventListener('change',e=>{stop('Ready to listen.');state.scope=e.target.value;state.notePage=0;render();});
$('end-selection').addEventListener('click',()=>{chooseEnd=!chooseEnd;updateSelection();});
for(const id of ['play','compact-play'])$(id).addEventListener('click',play);
for(const id of ['stop','compact-stop'])$(id).addEventListener('click',()=>stop());
$('repeat').addEventListener('change',e=>{const running=player.running;state.repeat=e.target.checked;persist();if(running)play();});
$('follow-playback').addEventListener('change',e=>{state.followPlayback=e.target.checked;persist();});
function changeSound(key,value,min,max){
  if(!Number.isFinite(value))return;const running=player.running;state[key]=Math.min(max,Math.max(min,Math.round(value)));
  stop('Settings changed. Ready to listen.');render();if(running)play();
}
$('tempo').addEventListener('input',e=>changeSound('tempo',Number(e.target.value),40,160));
$('transpose').addEventListener('change',e=>changeSound('transpose',Number(e.target.value),-12,12));
$('pitch-up').addEventListener('click',()=>changeSound('transpose',state.transpose+1,-12,12));$('pitch-down').addEventListener('click',()=>changeSound('transpose',state.transpose-1,-12,12));
$('volume').addEventListener('input',e=>{state.volume=Number(e.target.value);player.setVolume(state.volume/100);$('volume-value').textContent=`${state.volume}%`;persist();});
for(const [id,delta] of [['reader-previous',-1],['reader-next',1]])$(id).addEventListener('click',()=>{state.readerPage+=delta;state.followPlayback=false;$('follow-playback').checked=false;renderReader();persist();});
for(const [id,delta] of [['notes-previous',-1],['notes-next',1]])$(id).addEventListener('click',()=>{state.notePage+=delta;renderNotes();});
$('download').addEventListener('click',()=>{
  const [start,end]=bounds(state.cursor,state.anchor,state.scope);
  download('tropetrain-note-events.json',{format:'tropetrain-events-v1',textSource:{...passage,verses:undefined},melody,pronunciation:{id:null,status:'not implemented'},
    vocalRange:{low:state.rangeLow,high:state.rangeHigh,mode:'advisory'},tempo:state.tempo,transpose:state.transpose,
    startWordId:words[start].id,endWordId:words[end].id,words:words.slice(start,end+1),events:plan});
});
$('reading-form').addEventListener('submit',e=>{e.preventDefault();libraryAction(()=>applyRanges([{...rangeFromForm(),label:'Reading'}]));});
$('append-section').addEventListener('click',()=>libraryAction(()=>applyRanges([...passage.ranges,rangeFromForm()])));
$('book').addEventListener('change',()=>{const b=corpus?.byId.get($('book').value);if(b){$('start-chapter').max=b.chapters.length;$('end-chapter').max=b.chapters.length;}});
$('recent-readings').addEventListener('change',e=>{if(e.target.value!=='')libraryAction(()=>applyRanges(recent[Number(e.target.value)].ranges));});
$('save-assignment').addEventListener('click',()=>libraryAction(()=>{
  if(!corpus)throw Error('The library is still loading.');
  const assignment=createAssignment($('assignment-title').value,passage.ranges,state);assignments=[assignment,...assignments].slice(0,100);
  store('tropetrain-assignments-v1',assignments);renderPickers();$('library-message').textContent=`Saved “${assignment.title}” on this device.`;
}));
$('saved-assignments').addEventListener('change',e=>{if(e.target.value!=='')libraryAction(()=>{
  const saved=parseAssignment(JSON.stringify(assignments[Number(e.target.value)]),corpus);state.view=saved.displayPreferences.view;state.groups=saved.displayPreferences.groups;
  applyRanges(saved.sections);$('assignment-title').value=saved.title;
});});
$('export-assignment').addEventListener('click',()=>download('tropetrain-assignment.json',createAssignment($('assignment-title').value,passage.ranges,state)));
$('import-assignment').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{if(file.size>2_000_000)throw Error('Assignment file is too large.');const assignment=parseAssignment(await file.text(),corpus);
    state.view=assignment.displayPreferences.view;state.groups=assignment.displayPreferences.groups;applyRanges(assignment.sections);$('assignment-title').value=assignment.title;
  }catch(error){$('library-message').textContent=error.message;}finally{e.target.value='';}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='F2'){if(e.key==='F2')e.preventDefault();stop();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&player.running)stop('Paused because this tab is hidden. Press Play to restart the span.');});
if(matchMedia('(min-width: 761px)').matches)$('library-options').open=true;
render();renderSections();renderPickers();document.documentElement.dataset.ready='true';$('startup-status').hidden=true;
getCorpus().then(value=>{
  corpus=value;$('book').replaceChildren();
  for(const book of corpus.books){const o=document.createElement('option');o.value=book.id;o.textContent=`${book.name} · ${book.hebrewName}`;$('book').append(o);}
  $('library-status').textContent='5 books · 187 chapters · available offline';$('open-reading').disabled=false;$('append-section').disabled=false;
  if(restore.ranges){try{applyRanges(restore.ranges,{remember:false,restoreCursor:restore});}catch(error){$('library-message').textContent=`Saved reading could not be restored: ${error.message}`;}}
  restoringReading=false;persist();
  renderSections();
}).catch(error=>{$('library-status').textContent='Opening passage only';$('library-message').textContent=error.message;});
if(location.protocol==='file:')$('offline-status').textContent='Local file · ready without a server';
else if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{$('offline-status').textContent='Local audio & Torah text · available offline after first load';}).catch(()=>{});
