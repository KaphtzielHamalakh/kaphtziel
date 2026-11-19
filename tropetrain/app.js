import {createReadingModel,consonantal,noteName,melodyProfiles} from './music.js';
import {PRINTED_SCORE} from './printed-score.js';
import {beatLabel} from './score-data.js';
import {passage as openingPassage} from './passage.js';
import {getCorpus,defaultRange,createAssignment,parseAssignment} from './library.js';
import {Player} from './audio.js';
import {staffMarkup,STAFF_PAGE} from './staff.js';
import {musicXml,midiFile} from './music-exports.js';
import {renderWav,wavSummary} from './wav.js';
import {instrument,soundingNotes} from './synthesis.js';
import {SIGN_ANALYSIS,sourceClassLabel} from './accents.js';
import {SIGN_QUERIES,findSignsInReading,findSignsInCorpus} from './sign-search.js';
import {RecordingPlayer} from './recorded-reference.js';
import {getReferenceLibrary} from './reference-library.js';
import {ReferenceAudioStore} from './reference-audio-store.js';

const $=id=>document.getElementById(id),VERSE_PAGE=8,NOTE_PAGE=128;
const state={cursor:0,anchor:0,view:'pointed',scope:'group',tempo:84,transpose:0,volume:70,repeat:false,groups:true,signClasses:false,signQuery:'etnahta',findScope:'reading',
  rangeLow:60,rangeHigh:72,referenceVolume:0,readerPage:0,notePage:0,staffPage:0,followPlayback:true,ranges:null,melodyId:'original-demo-01'};
try{
  const saved=JSON.parse(localStorage.getItem('tropetrain-practice-v1'));
  if(saved){
    for(const [key,min,max] of [['cursor',0,1000000],['anchor',0,1000000],['tempo',40,160],['transpose',-12,12],['volume',0,100],['referenceVolume',0,100],['rangeLow',36,84],['rangeHigh',36,84],['readerPage',0,100000]])
      if(Number.isInteger(saved[key])&&saved[key]>=min&&saved[key]<=max)state[key]=saved[key];
    if(['pointed','consonantal','parallel'].includes(saved.view))state.view=saved.view;
    if(['word','group','verse','aliyah','selection','passage'].includes(saved.scope))state.scope=saved.scope;
    for(const key of ['repeat','groups','followPlayback','signClasses'])if(typeof saved[key]==='boolean')state[key]=saved[key];
    if(['reading','torah'].includes(saved.findScope))state.findScope=saved.findScope;
    if(SIGN_QUERIES.some(q=>q.id===saved.signQuery))state.signQuery=saved.signQuery;
    if(Array.isArray(saved.ranges))state.ranges=saved.ranges;
    if(melodyProfiles.some(p=>p.id===saved.melodyId))state.melodyId=saved.melodyId;
  }
}catch{}
const restore={cursor:state.cursor,anchor:state.anchor,readerPage:state.readerPage,ranges:state.ranges};
let passage={...openingPassage,title:'Genesis 1:1–3',ranges:[structuredClone(defaultRange)]};
let model=createReadingModel(passage,state),{words,bounds,buildPlan}=model;
state.cursor=Math.min(state.cursor,words.length-1);state.anchor=Math.min(state.anchor,words.length-1);state.readerPage=0;
let corpus,chooseEnd=false,plan=[],activeId=null,activeEventId=null,playingBounds=null;
let recent=loadArray('tropetrain-recent-v1'),assignments=loadArray('tropetrain-assignments-v1');
let restoringReading=!!restore.ranges;
let exportsKey=null,wavJob=null;
const exportUrls=new Map();
let findGeneration=0,findHits=[],findPage=0,findWords=null;
let referenceLibrary=null,selectedReferenceId=null,referenceActiveId=null,referencePlan=null,referenceRequired=[],referenceReady=false,referenceUiGeneration=0,referenceLoadJob=null;
const referenceStore=new ReferenceAudioStore({openingUrl:$('reference-audio').getAttribute('src')});
const referencePlayer=new RecordingPlayer($('reference-audio'),{
  onWord:word=>{
    referenceActiveId=word?.occurrenceId??null;
    if(word&&state.followPlayback){const page=Math.floor(words[word.wordIndex].verseIndex/VERSE_PAGE);if(page!==state.readerPage){state.readerPage=page;renderReader();}}
    document.querySelectorAll('[data-word]').forEach(el=>el.classList.toggle('reference-active',el.dataset.word===referenceActiveId));
    if(word)renderRecordedWord(word);
  },
  onEnd:()=>{$('reference-status').textContent='Reference playback finished. Your selection is kept.';say('Recorded reference finished. Your selection is kept.');},
  onError:error=>{$('reference-status').textContent=`Reference unavailable: ${error.message}`;renderReference({keepChoice:true});},
  onLoading:id=>{$('reference-status').textContent=`Opening ${referenceLibrary?.byId.get(id)?.title??'reference'}…`;},
  onRecording:id=>{if(id){selectedReferenceId=id;syncReferencePickers();$('reference-status').textContent=`Playing ${referenceLibrary.byId.get(id).title} · original recorded key, tempo and pronunciation${state.referenceVolume===0?' · muted at 0%':''}.`;}},
  resolveSource:(id,options)=>referenceStore.url(referenceLibrary.byId.get(id),options)
});
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
    const staffPage=Math.floor(index/STAFF_PAGE);
    if(staffPage!==state.staffPage){state.staffPage=staffPage;renderStaff();}
  }
  setActive(event.wordId,event.id);
  $('progress').style.width=`${progress*100}%`;
  $('status').textContent=`${state.repeat?`Loop ${cycle+1} · `:''}Playing ${label(event.wordIndex)} · ${noteName(event.midi)}`;
},()=>{
  setActive(null,null);$('progress').style.width='100%';say(`Finished at ${label(playingBounds[1])}.`);transportLabel(false);
},(cycle,progress)=>{
  setActive(null,null);$('progress').style.width=`${progress*100}%`;
  $('status').textContent=`${state.repeat?`Loop ${cycle+1} · `:''}Rest · the next source note follows the printed pause.`;
});
function transportLabel(running){$('play').innerHTML=running?'<span aria-hidden="true">▶</span> Restart':'<span aria-hidden="true">▶</span> Play';}
function setActive(wordId,eventId){
  if(wordId!==activeId){activeId=wordId;document.querySelectorAll('[data-word]').forEach(el=>el.classList.toggle('active',el.dataset.word===wordId));}
  if(eventId!==activeEventId){activeEventId=eventId;document.querySelectorAll('[data-event]').forEach(el=>el.classList.toggle('active',el.dataset.event===eventId));}
}
function stop(message='Stopped. Your selection is kept.'){
  referenceLoadJob?.abort();player.stop();if(referencePlayer.running||referencePlayer.starting)$('reference-status').textContent='Reference stopped. Your selection is kept.';referencePlayer.stop();$('wav-preview').pause();setActive(null,null);$('progress').style.width='0%';say(message);transportLabel(false);
}
async function play(){
  referencePlayer.stop();$('reference-status').textContent='';$('wav-preview').pause();
  playingBounds=bounds(state.cursor,state.anchor,state.scope);if(!renderSequence()){stop($('musical-source-status').textContent);return;}
  $('status').setAttribute('aria-live','off');transportLabel(true);player.setVolume(state.volume/100);
  try{await player.play(plan,state.repeat);}catch(error){stop(`Audio unavailable: ${error.message}`);}
}
function selectWord(index,extend=false){
  stop('Ready to listen.');
  if(extend||chooseEnd){state.cursor=index;state.scope='selection';chooseEnd=false;}
  else{state.cursor=index;state.anchor=index;}
  state.readerPage=Math.floor(words[index].verseIndex/VERSE_PAGE);state.notePage=0;state.staffPage=0;render();
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
  b.dataset.word=w.id;b.dataset.index=w.index;b.dataset.signClass=w.signAnalysis.className??'';setWordText(b,w,plain);b.lang='he';b.dir='rtl';
  b.title=`${w.reference}, word ${w.ordinal} · ${w.accent} · ${sourceClassLabel(w.signAnalysis.className)}`;b.setAttribute('aria-label',`${b.textContent}, ${w.reference}, word ${w.ordinal}`);
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
  $('reader').replaceChildren();$('reader').classList.toggle('guides',state.groups);$('reader').classList.toggle('sign-classes',state.signClasses);$('class-guide').hidden=!state.signClasses;
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
    el.classList.toggle('reference-active',el.dataset.word===referenceActiveId);
  });
  $('selection-label').textContent=state.scope==='selection'?`Selected ${fullLabel(start)} to ${fullLabel(end)}`:`Cursor: ${fullLabel(state.cursor)}`;
  $('span-preview').textContent=`${fullLabel(start)} to ${fullLabel(end)} · ${end-start+1} word${end>start?'s':''}`;
  $('compact-span').textContent=`${words[start].bookName} ${words[start].chapter}:${words[start].verse} · ${end-start+1} words`;
  $('end-selection').setAttribute('aria-pressed',String(chooseEnd));$('end-selection').textContent=chooseEnd?'Click the last word':'Choose span end';
  const w=words[state.cursor];$('current-word').textContent=w.sourceHebrew;$('current-reference').textContent=`${w.reference} · word ${w.ordinal}`;
  $('accent-name').textContent=w.accent;$('group-name').textContent=`Practice group ${w.group+1} · ${w.sourceWordId??w.id}`;
  $('source-variant').textContent=w.kind==='q'?`Reading form (qere). Written form: ${(w.writtenVariants||[]).map(t=>t.sourceHebrew).join(' ')||'see source edition'}`:'';
  $('alignment-status').textContent=w.analysisStatus==='unsegmented'?'Syllable boundaries unresolved; word shown as one aligned unit.':`${w.syllables.length} draft syllables · ${w.analysisStatus==='draft-manual'?'manual fixture':'automatic analysis'} · not reader-reviewed`;
  renderSourceSigns(w);
  renderReference();
}
function syncReferencePickers(){
  const selected=referenceLibrary?.byId.get(selectedReferenceId);if(!selected)return;
  $('reference-portion').value=selected.partId;
  if($('reference-aliyah').dataset.part!==selected.partId){
    $('reference-aliyah').replaceChildren();
    for(const id of referenceLibrary.parts.find(p=>p.id===selected.partId).recordingIds){const record=referenceLibrary.byId.get(id),option=document.createElement('option');option.value=id;option.textContent=`Aliyah ${record.number}${record.status!=='aligned'?' · timing review':''}`;$('reference-aliyah').append(option);}
    $('reference-aliyah').dataset.part=selected.partId;
  }
  $('reference-aliyah').value=selected.id;
  $('reference-title').textContent=selected.title;
  $('reference-timing-status').textContent=selected.status==='aligned'?'Source word timings available · acoustic review pending':`Word timing needs review: ${selected.issues.map(i=>i.kind==='word-count'?`${i.sourceWords} source words / ${i.timings} timestamps`:'non-increasing timestamps').join('; ')}. Complete-recording playback is available without timed highlights.`;
}
function renderRecordedWord(word){
  const record=referenceLibrary?.byId.get(word.recordingId),names={gen:'Genesis',exo:'Exodus',lev:'Leviticus',num:'Numbers',deu:'Deuteronomy'},book=names[record?.bookId]??'Genesis';
  $('reference-word').textContent=word.sourceHebrew;
  $('reference-word-label').textContent=`Recording source · ${book} ${word.chapter}:${word.verse} · word ${word.ordinal}${word.sourceWords?.length>1?` · ${word.sourceWords.length} source word units`:''}${Number.isFinite(word.startSeconds)?` · ${word.startSeconds.toFixed(3)} s`:''}`;
  let comparison=word.comparison==='source-boundaries'?`Two WLC source word units correspond to one UXLC unit: ${word.uxlcHebrew}. Both original words and their marks are retained.`:word.comparison==='source-difference'?`Source marks differ. UXLC has ${word.uxlcHebrew}; the recording’s WLC text has ${word.sourceHebrew}. Neither source is replaced.`:word.comparison==='joiner-only'?'The editions differ only by an encoded combining grapheme joiner; both exact strings are retained.':'This word’s displayed source string matches UXLC exactly.';
  if(word.readerChapter!==undefined&&(word.readerChapter!==word.chapter||word.readerVerse!==word.verse))comparison+=` Verse numbering differs: the reader calls this ${book} ${word.readerChapter}:${word.readerVerse}.`;
  $('reference-source-comparison').textContent=comparison;
}
function renderReference({keepChoice=false}={}){
  const generation=++referenceUiGeneration;
  $('reference-volume').value=state.referenceVolume;$('reference-volume-value').textContent=`${state.referenceVolume}%`;$('reference-audio').volume=state.referenceVolume/100;
  if(!referenceLibrary)return;
  const atCursor=referenceLibrary.at(words[state.cursor]);
  if(!keepChoice&&!referencePlayer.running&&!referencePlayer.starting)selectedReferenceId=atCursor?.recording.id??selectedReferenceId;
  selectedReferenceId??=referenceLibrary.recordings[0].id;syncReferencePickers();
  const selected=referenceLibrary.byId.get(selectedReferenceId);
  try{
    const [start,end]=bounds(state.cursor,state.anchor,state.scope);
    if(!words.slice(start,end+1).some(word=>referenceLibrary.at(word)?.recording.id===selected.id))throw Error('The selected recording is outside this reader span. Open selected reading, or load and play its complete take.');
    referencePlan=referenceLibrary.selection(words,start,end);referenceRequired=referenceLibrary.recordsFor(referencePlan);
    if(!referenceRequired.some(r=>r.id===selected.id))throw Error('Open the selected reading to align a span, or load and play its complete recording.');
    const differences=referencePlan.filter(w=>w.comparison==='source-difference'||w.comparison==='source-boundaries').length;
    $('reference-coverage').textContent=`${referencePlan.length.toLocaleString()} selected word${referencePlan.length===1?'':'s'} · ${referenceRequired.length} recording${referenceRequired.length===1?'':'s'}.${differences?` ${differences} source-mark or word-boundary differences are retained.`:''}`;
  }catch(error){referencePlan=null;referenceRequired=[selected];$('reference-coverage').textContent=error.message;}
  if(!referencePlayer.running&&!referencePlayer.starting){if(atCursor?.recording.id===selected.id)renderRecordedWord(atCursor.word);else{$('reference-word').textContent='';$('reference-word-label').textContent='Open the selected reading to compare its source words.';$('reference-source-comparison').textContent='';}}
  referenceReady=false;$('reference-play').disabled=true;$('reference-full').disabled=true;$('reference-load').disabled=true;$('reference-remove').disabled=true;
  Promise.all(referenceRequired.map(r=>referenceStore.has(r))).then(async availability=>{
    const selectedReady=await referenceStore.has(selected);if(generation!==referenceUiGeneration)return;
    const missing=referenceRequired.filter((r,i)=>!availability[i]);referenceReady=missing.length===0;
    $('reference-play').disabled=!referencePlan||!referenceReady;$('reference-full').disabled=!selectedReady;
    $('reference-load').disabled=!!referenceLoadJob||!missing.length;
    const size=missing.reduce((n,r)=>n+r.audio.bytes,0);$('reference-load').textContent=missing.length?`Load ${missing.length} recording${missing.length===1?'':'s'} · ${(size/1048576).toFixed(1)} MB`:'Recordings loaded';
    $('reference-storage').textContent=selected.audio.localFile?'Opening recording included with the app.':selectedReady?(referenceStore.saved.has(selected.audio.sha1)?'Selected recording saved on this device.':'Selected recording loaded for this session.'):`Selected recording needs a ${(selected.audio.bytes/1048576).toFixed(1)} MB download. Files are checksum-checked before use and saved on this device when storage is available.`;
    $('reference-remove').disabled=!!selected.audio.localFile||!selectedReady;
  }).catch(error=>{$('reference-storage').textContent=error.message;});
}
function renderSourceSigns(word){
  const analysis=word.signAnalysis;$('source-class').textContent=sourceClassLabel(analysis.className);
  $('source-sign-rows').replaceChildren();$('source-sign-warnings').replaceChildren();
  for(const sign of [...analysis.signs,...analysis.marks].sort((a,b)=>a.offset-b.offset)){
    const row=document.createElement('tr');
    const glyph=/[\u034f\u200d]/u.test(sign.char)?'invisible':/\p{Mark}/u.test(sign.char)?'◌'+sign.char:sign.char;
    for(const [i,value] of [glyph,sign.code,sign.name,sign.proseClass??sign.role,sign.offset+1].entries()){
      const cell=document.createElement('td');cell.textContent=value;
      if(i===2){const unicode=document.createElement('small');unicode.textContent=sign.unicodeName;cell.append(unicode);}
      if(i===0&&glyph!=='invisible'){cell.lang='he';cell.dir='rtl';}row.append(cell);
    }
    $('source-sign-rows').append(row);
  }
  if(!analysis.signs.length&&!analysis.marks.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=5;cell.textContent='No listed cantillation, punctuation or shaping sign is encoded in this word.';row.append(cell);$('source-sign-rows').append(row);}
  for(const text of analysis.warnings){const li=document.createElement('li');li.textContent=text;$('source-sign-warnings').append(li);}
}
async function refreshSignSearch({reset=false}={}){
  const generation=++findGeneration;findWords=words;if(reset)findPage=0;
  $('sign-query').value=state.signQuery;$('find-scope').value=state.findScope;
  $('sign-results').replaceChildren();$('sign-result-status').textContent=state.findScope==='torah'?'Searching the Torah…':'Searching this reading…';
  $('sign-previous').disabled=true;$('sign-next').disabled=true;
  try{
    const hits=state.findScope==='torah'?await findSignsInCorpus(await getCorpus(),state.signQuery):findSignsInReading(words,state.signQuery);
    if(generation!==findGeneration)return;findHits=hits;renderSignResults();
  }catch(error){if(generation===findGeneration)$('sign-result-status').textContent=error.message;}
}
function renderSignResults(){
  findPage=Math.min(findPage,Math.max(0,Math.ceil(findHits.length/8)-1));
  const first=findPage*8,last=Math.min(first+8,findHits.length),count=findHits.reduce((n,h)=>n+h.count,0);
  $('sign-result-status').textContent=`${findHits.length.toLocaleString()} word${findHits.length===1?'':'s'}${state.signQuery==='unmarked'?' without an accent, meteg or final maqaf':` · ${count.toLocaleString()} source position${count===1?'':'s'}`}. ${findHits.length?`Showing ${first+1}–${last}.`:'No matches.'}`;
  $('sign-results').replaceChildren();$('sign-previous').disabled=first===0;$('sign-next').disabled=last===findHits.length;
  for(const hit of findHits.slice(first,last)){
    const row=document.createElement('li'),text=document.createElement('span'),ref=document.createElement('span'),button=document.createElement('button');
    text.className='sign-result-word';text.lang='he';text.dir='rtl';setWordText(text,hit.word,false);
    const section=state.findScope==='reading'&&passage.ranges.length>1?passage.ranges.findIndex(r=>r.id===hit.word.sectionId)+1:null;
    ref.textContent=`${hit.word.reference} · word ${hit.word.ordinal}${section?` · section ${section}`:''}${hit.count>1?` · ${hit.count} signs`:''}`;
    button.textContent='Go to word';button.setAttribute('aria-label',`Go to ${hit.word.reference} word ${hit.word.ordinal}${section?` in section ${section}`:''}`);
    button.addEventListener('click',()=>{
      if(state.findScope==='torah')libraryAction(()=>{
        const point={chapter:hit.word.chapter,verse:hit.word.verse};
        applyRanges([{id:'sign-example',bookId:hit.word.bookId,start:point,end:point,label:'Sign example'}]);
        const index=words.findIndex(w=>(w.sourceWordId??w.id)===hit.sourceWordId);if(index>=0)selectWord(index);
      });
      else{const index=words.findIndex(w=>w.id===hit.occurrenceId);if(index>=0)selectWord(index);else refreshSignSearch({reset:true});}
      const cursor=document.querySelector(`[data-word="${words[state.cursor].id}"]`);cursor?.focus();$('reader').scrollIntoView({block:'start'});
    });
    row.append(text,ref,button);$('sign-results').append(row);
  }
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
    const length=document.createElement('span');length.className='length';length.textContent=`${beatLabel(e.beats)} beats`;chip.append(pitch,stem,syllable,length);chip.classList.toggle('active',e.id===activeEventId);$('note-ribbon').append(chip);
    const row=document.createElement('tr');row.dataset.event=e.id;row.classList.toggle('active',e.id===activeEventId);
    for(const [i,value] of [e.wordId,e.syllable,noteName(e.midi),e.midi,e.startBeat.toFixed(2),beatLabel(e.beats),e.durationSeconds.toFixed(3)].entries()){
      const cell=document.createElement('td');cell.textContent=value;if(i===1){cell.lang='he';cell.dir='rtl';}row.append(cell);
    }$('event-rows').append(row);
  }
  $('note-page-label').textContent=plan.length?`Notes ${from+1}–${to} of ${plan.length}`:'No notes in this span';$('notes-previous').disabled=from===0;$('notes-next').disabled=to===plan.length;
}
function renderSequence(){
  let unavailable=null;
  try{plan=buildPlan(...bounds(state.cursor,state.anchor,state.scope),state);}catch(error){plan=[];unavailable=error.message;}
  for(const id of ['play','compact-play','download','prepare-musicxml','prepare-midi'])$(id).disabled=!!unavailable;
  $('musical-source-status').textContent=unavailable??(model.profile.id===PRINTED_SCORE.id?'Printed Genesis 22:1 · source transcription, review pending · printed rests/ties · regularized tempo · no added coda.':'Original demonstration · newly composed pitches; syllables unreviewed.');
  if(unavailable){
    $('event-count').textContent='No sourced notes for this span';renderNotes();renderStaff();updateExportSummary();
    $('range-report').textContent='Select a covered span to inspect its range.';return false;
  }
  const duration=plan.at(-1).startSeconds+plan.at(-1).durationSeconds;
  $('event-count').textContent=`${plan.length} events · ${duration.toFixed(2)} s`;renderNotes();renderStaff();updateExportSummary();
  const out=plan.filter(e=>e.midi<state.rangeLow||e.midi>state.rangeHigh).length;
  $('range-report').textContent=state.rangeLow>state.rangeHigh?'Lowest note must be below highest note.':`${out} of ${plan.length} notes outside ${noteName(state.rangeLow)}–${noteName(state.rangeHigh)}.`;
  return true;
}
function renderStaff(){
  state.staffPage=Math.min(state.staffPage,Math.max(0,Math.ceil(plan.length/STAFF_PAGE)-1));
  const from=state.staffPage*STAFF_PAGE,to=Math.min(from+STAFF_PAGE,plan.length);
  $('pitch-staff').innerHTML=staffMarkup(plan,words,from);
  $('staff-page-label').textContent=plan.length?`Score notes ${from+1}–${to} of ${plan.length}`:'No score notes in this span';
  $('staff-previous').disabled=from===0;$('staff-next').disabled=to===plan.length;
  $('pitch-staff').querySelectorAll('[data-word-index]').forEach(el=>{
    el.classList.toggle('active',el.dataset.event===activeEventId);
    const activate=()=>selectWord(Number(el.dataset.wordIndex));el.addEventListener('click',activate);
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
  });
}
function exportContext(){
  const [start,end]=bounds(state.cursor,state.anchor,state.scope);
  return {title:`${fullLabel(start)} to ${fullLabel(end)}`,melody:model.profile,instrument,signAnalysis:SIGN_ANALYSIS,pronunciation:{id:null,status:'not implemented'},
    textSource:{...passage,verses:undefined},vocalRange:{low:state.rangeLow,high:state.rangeHigh,mode:'advisory'},
    tempo:state.tempo,transpose:state.transpose,volume:state.volume};
}
function clearExports(){
  wavJob?.abort();wavJob=null;
  $('wav-preview').pause();$('wav-preview').removeAttribute('src');$('wav-preview').hidden=true;
  for(const [id,url] of exportUrls){URL.revokeObjectURL(url);$(id).hidden=true;$(id).removeAttribute('href');}exportUrls.clear();
  $('export-status').textContent='';$('prepare-wav').disabled=false;$('cancel-wav').hidden=true;
}
function updateExportSummary(){
  const key=JSON.stringify([passage.ranges,bounds(state.cursor,state.anchor,state.scope),state.melodyId,state.tempo,state.transpose,state.volume]);
  if(key!==exportsKey){clearExports();exportsKey=key;}
  try{
    const s=wavSummary(plan);
    const count=model.profile.id===PRINTED_SCORE.id?`${plan.length} printed components · ${soundingNotes(plan).length} sounding notes`:`${plan.length} notes`;
    $('export-summary').textContent=`${count} · ${s.duration.toFixed(2)} seconds · ${state.tempo} BPM · ${state.transpose>0?'+':''}${state.transpose} semitones · volume ${state.volume}% · WAV about ${(s.bytes/1048576).toFixed(2)} MB.${state.volume===0?' The WAV will be silent at 0% volume.':''}`;
  }catch(error){$('export-summary').textContent=error.message;$('prepare-wav').disabled=true;}
}
function readyDownload(id,data,type,extension){
  if(exportUrls.has(id))URL.revokeObjectURL(exportUrls.get(id));
  const blob=data instanceof Blob?data:new Blob([data],{type}),url=URL.createObjectURL(blob);
  exportUrls.set(id,url);$(id).href=url;$(id).download=`tropetrain-${words[bounds(state.cursor,state.anchor,state.scope)[0]].sourceWordId??words[state.cursor].id}-${state.tempo}bpm-${state.transpose}st.${extension}`;$(id).hidden=false;
  return blob.size;
}
for(const type of ['musicxml','midi'])$('prepare-'+type).addEventListener('click',async()=>{
  const key=exportsKey,selected=plan,sourceWords=words,context=exportContext(),button=$('prepare-'+type);button.disabled=true;
  $('export-status').textContent='Preparing '+(type==='midi'?'MIDI notes':'MusicXML score')+'…';
  try{
    await new Promise(resolve=>setTimeout(resolve,0));if(key!==exportsKey)return;
    const data=type==='midi'?midiFile(selected,sourceWords,context):musicXml(selected,sourceWords,context);
    const size=readyDownload('save-'+type,data,type==='midi'?'audio/midi':'application/vnd.recordare.musicxml+xml',type==='midi'?'mid':'musicxml');
    $('export-status').textContent=`${type==='midi'?'MIDI notes':'MusicXML score'} ready · ${selected.length} notes · ${size.toLocaleString()} bytes. Use the Save link.`;
  }catch(error){$('export-status').textContent=`Export unavailable: ${error.message}`;}finally{button.disabled=false;}
});
$('prepare-wav').addEventListener('click',async()=>{
  stop('Preparing an audio file.');wavJob?.abort();const job=new AbortController();wavJob=job;
  $('prepare-wav').disabled=true;$('cancel-wav').hidden=false;
  try{
    const result=await renderWav(plan,{volume:state.volume/100,signal:job.signal,onProgress:p=>{$('export-status').textContent=`Rendering WAV · ${Math.round(p*100)}%`;}});
    if(wavJob!==job)return;
    readyDownload('save-wav',result.blob,'audio/wav','wav');$('wav-preview').src=exportUrls.get('save-wav');$('wav-preview').hidden=false;
    $('export-status').textContent=`WAV ready · ${result.duration.toFixed(2)} seconds · ${result.bytes.toLocaleString()} bytes · ${result.peak===0?'silent (volume 0%)':'instrumental audio'}. Preview or save the file.`;
  }catch(error){if(wavJob===job)$('export-status').textContent=job.signal.aborted?'Audio export cancelled.':`Audio export unavailable: ${error.message}`;}
  finally{if(wavJob===job){wavJob=null;$('prepare-wav').disabled=false;$('cancel-wav').hidden=true;}}
});
$('cancel-wav').addEventListener('click',()=>wavJob?.abort());
$('wav-preview').addEventListener('play',()=>{player.stop();if(referencePlayer.running||referencePlayer.starting)$('reference-status').textContent='Reference stopped.';referencePlayer.stop();setActive(null,null);transportLabel(false);say('Playing the exported instrumental audio.');});
$('reference-play').addEventListener('click',async()=>{
  if(!referencePlan||!referenceReady)return;const selected=referencePlan;stop('Listening to the recorded reference.');
  await referencePlayer.play(selected,state.repeat);
});
$('reference-full').addEventListener('click',async()=>{
  const id=selectedReferenceId;stop('Listening to the complete recording.');$('reference-word').textContent='';$('reference-word-label').textContent='Complete unmodified recording · timed word highlighting is off.';$('reference-source-comparison').textContent='The recording retains its original text, key, tempo and pronunciation.';
  await referencePlayer.playWhole(id,state.repeat);
});
$('reference-stop').addEventListener('click',()=>stop());
$('reference-open').addEventListener('click',()=>libraryAction(()=>{
  const selected=referenceLibrary.byId.get(selectedReferenceId);applyRanges([{id:'recorded-reference',...selected.coverage,label:selected.title}]);
}));
$('reference-portion').addEventListener('change',e=>{const part=referenceLibrary.parts.find(p=>p.id===e.target.value);selectedReferenceId=part.recordingIds[0];renderReference({keepChoice:true});});
$('reference-aliyah').addEventListener('change',e=>{selectedReferenceId=e.target.value;renderReference({keepChoice:true});});
$('reference-load').addEventListener('click',async()=>{
  if(referenceLoadJob)return;const job=new AbortController();referenceLoadJob=job;$('reference-cancel-load').hidden=false;$('reference-load').disabled=true;
  try{
    await referenceStore.ready;
    const missing=[];for(const record of referenceRequired)if(!await referenceStore.has(record))missing.push(record);
    if(!referenceStore.storageAvailable&&missing.length>3)throw Error('Device storage is unavailable. Load a smaller span of at most three recordings for this session.');
    for(const [i,record] of missing.entries()){
      $('reference-status').textContent=`Loading ${i+1} of ${missing.length}: ${record.title}…`;
      const result=await referenceStore.load(record,{signal:job.signal});
      if(!result.saved&&missing.length>3)throw Error('This browser could not save the recordings. Load a smaller span for this session.');
    }
    if(referenceLoadJob===job)$('reference-status').textContent='Recordings loaded and source checksums verified. Press Play when ready.';
  }catch(error){if(referenceLoadJob===job)$('reference-status').textContent=job.signal.aborted?'Reference loading cancelled. Completed recordings are kept.':error.message;}
  finally{if(referenceLoadJob===job){referenceLoadJob=null;$('reference-cancel-load').hidden=true;renderReference({keepChoice:true});}}
});
$('reference-cancel-load').addEventListener('click',()=>referenceLoadJob?.abort());
$('reference-remove').addEventListener('click',async()=>{const record=referenceLibrary.byId.get(selectedReferenceId);stop();await referenceStore.remove(record);$('reference-status').textContent=`Removed the saved copy of ${record.title}. You can load it again.`;renderReference({keepChoice:true});});
$('reference-volume').addEventListener('input',e=>{state.referenceVolume=Number(e.target.value);$('reference-audio').volume=state.referenceVolume/100;$('reference-volume-value').textContent=`${state.referenceVolume}%`;persist();});
function render(){
  for(const key of ['scope','tempo','transpose','volume'])$(key).value=state[key];
  for(const key of ['repeat','groups','sign-classes'])$(key).checked=state[key==='sign-classes'?'signClasses':key];$('follow-playback').checked=state.followPlayback;
  $('range-low').value=state.rangeLow;$('range-high').value=state.rangeHigh;
  $('tempo-value').textContent=`${state.tempo} BPM`;$('transpose-value').textContent=`${state.transpose>0?'+':''}${state.transpose} semitone${Math.abs(state.transpose)!==1?'s':''}`;$('volume-value').textContent=`${state.volume}%`;
  $('passage-title').textContent=passage.title;$('word-count').textContent=`${passage.verses.length} verse${passage.verses.length===1?'':'s'} · ${words.length} words`;
  const printed=model.profile.id===PRINTED_SCORE.id;
  $('musical-source').value=state.melodyId;$('melody-name').textContent=model.profile.name;
  $('music-badge').textContent=printed?'Printed score study':'Instrumental demo';
  $('music-notice').textContent=printed?'A bounded transcription of the complete printed Genesis 22:1 example, all 13 words. Musical and Hebrew underlay review is pending. This is an instrumental study; no full tradition or singing voice is claimed.':'This original motif tests the practice workflow. It is not a historical cantillation melody. Syllable divisions are drafts awaiting review.';
  $('score-description').textContent=printed?'The staff, note list and exports use the same notes, rests and ties transcribed from Cohen’s 1902 printed Genesis 22:1 example. Hebrew underlay is a source-preserving draft.':'The staff, note list and exports use the playback sequence. This is the original instrumental demonstration with unreviewed Hebrew syllables.';
  $('score-help').textContent=printed?'Click a note to go to its Hebrew word. Printed durations use a regular quarter-note beat here; the source calls for flexible timing. Ties hold one pitch without a new attack; rests clear the active highlight. The separately printed untexted coda is omitted.':'Click a note to go to its Hebrew word. Each accidental is explicit. The demo’s 0.6 and 0.9 beats use individual 5:3 quarter-note tuplets; lengths are also written below. Lines under the lyrics continue one syllable across several notes.';
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));
  renderReader();renderSequence();persist();if(findWords!==words&&state.findScope==='reading')refreshSignSearch({reset:true});
}
function rememberReading(){
  const key=ranges=>JSON.stringify(ranges.map(r=>({bookId:r.bookId,start:r.start,end:r.end,hidden:r.hidden})));
  recent=[{title:passage.title,ranges:passage.ranges},...recent.filter(r=>r.ranges&&key(r.ranges)!==key(passage.ranges))].slice(0,8);store('tropetrain-recent-v1',recent);renderPickers();
}
function applyRanges(ranges,{remember=true,restoreCursor=null}={}){
  if(!corpus)throw Error('The Torah library is still loading.');
  const nextPassage=corpus.passage(ranges),nextModel=createReadingModel(nextPassage,state);
  stop('Reading opened. Ready to listen.');passage=nextPassage;model=nextModel;({words,bounds,buildPlan}=model);
  if(passage.ranges.length===1){
    const range=passage.ranges[0];$('book').value=range.bookId;
    for(const [id,value] of [['start-chapter',range.start.chapter],['start-verse',range.start.verse],['end-chapter',range.end.chapter],['end-verse',range.end.verse]])$(id).value=value;
  }
  state.cursor=restoreCursor&&words[restoreCursor.cursor]?restoreCursor.cursor:0;state.anchor=restoreCursor&&words[restoreCursor.anchor]?restoreCursor.anchor:state.cursor;
  state.readerPage=Math.floor(words[state.cursor].verseIndex/VERSE_PAGE);state.notePage=0;state.staffPage=0;chooseEnd=false;render();renderSections();if(remember)rememberReading();
  const unresolved=words.filter(w=>w.analysisStatus==='unsegmented').length;
  $('library-message').textContent=`Opened ${passage.title}. ${unresolved?`${unresolved} words have unresolved syllable boundaries. `:''}Musical source: ${model.profile.name}. Syllables are unreviewed; the recorded reference is separate.`;
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
$('sign-classes').addEventListener('change',e=>{state.signClasses=e.target.checked;render();});
for(const query of SIGN_QUERIES){const option=document.createElement('option');option.value=query.id;option.textContent=query.name;$('sign-query').append(option);}
for(const profile of melodyProfiles){const option=document.createElement('option');option.value=profile.id;option.textContent=profile.name;$('musical-source').append(option);}
$('musical-source').addEventListener('change',e=>{
  stop('Musical source changed.');state.melodyId=e.target.value;model=createReadingModel(passage,state);({words,bounds,buildPlan}=model);state.notePage=0;state.staffPage=0;render();
});
$('source-study-open').addEventListener('click',()=>libraryAction(()=>{
  state.melodyId=PRINTED_SCORE.id;
  applyRanges([{id:'cohen-study',bookId:'gen',start:{chapter:22,verse:1},end:{chapter:22,verse:1},label:'Printed score context'}]);
  state.anchor=words.length-1;state.cursor=0;state.scope='selection';render();
  $('reader').focus();$('practice').scrollIntoView();
}));
for(const [id,key] of [['sign-query','signQuery'],['find-scope','findScope']])$(id).addEventListener('change',e=>{state[key]=e.target.value;persist();refreshSignSearch({reset:true});});
for(const [id,delta] of [['sign-previous',-1],['sign-next',1]])$(id).addEventListener('click',()=>{findPage+=delta;renderSignResults();});
$('scope').addEventListener('change',e=>{stop('Ready to listen.');state.scope=e.target.value;state.notePage=0;render();});
$('end-selection').addEventListener('click',()=>{chooseEnd=!chooseEnd;updateSelection();});
for(const id of ['play','compact-play'])$(id).addEventListener('click',play);
for(const id of ['stop','compact-stop'])$(id).addEventListener('click',()=>stop());
$('repeat').addEventListener('change',e=>{const running=player.running;state.repeat=e.target.checked;referencePlayer.repeat=state.repeat;persist();if(running)play();});
$('follow-playback').addEventListener('change',e=>{state.followPlayback=e.target.checked;persist();});
function changeSound(key,value,min,max){
  if(!Number.isFinite(value))return;const running=player.running;state[key]=Math.min(max,Math.max(min,Math.round(value)));
  stop('Settings changed. Ready to listen.');render();if(running)play();
}
$('tempo').addEventListener('input',e=>changeSound('tempo',Number(e.target.value),40,160));
$('transpose').addEventListener('change',e=>changeSound('transpose',Number(e.target.value),-12,12));
$('pitch-up').addEventListener('click',()=>changeSound('transpose',state.transpose+1,-12,12));$('pitch-down').addEventListener('click',()=>changeSound('transpose',state.transpose-1,-12,12));
$('volume').addEventListener('input',e=>{state.volume=Number(e.target.value);player.setVolume(state.volume/100);$('volume-value').textContent=`${state.volume}%`;persist();});
// A prepared audio file is a snapshot. Changing volume must not leave a stale
// file labelled with the new settings.
$('volume').addEventListener('input',updateExportSummary);
for(const [id,delta] of [['reader-previous',-1],['reader-next',1]])$(id).addEventListener('click',()=>{state.readerPage+=delta;state.followPlayback=false;$('follow-playback').checked=false;renderReader();persist();});
for(const [id,delta] of [['notes-previous',-1],['notes-next',1]])$(id).addEventListener('click',()=>{state.notePage+=delta;renderNotes();});
for(const [id,delta] of [['staff-previous',-1],['staff-next',1]])$(id).addEventListener('click',()=>{state.staffPage+=delta;renderStaff();});
$('download').addEventListener('click',()=>{
  const [start,end]=bounds(state.cursor,state.anchor,state.scope);
  download('tropetrain-note-events.json',{format:'tropetrain-events-v1',textSource:{...passage,verses:undefined},melody:model.profile,instrument,signAnalysis:SIGN_ANALYSIS,pronunciation:{id:null,status:'not implemented'},
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
  const saved=parseAssignment(JSON.stringify(assignments[Number(e.target.value)]),corpus);state.view=saved.displayPreferences.view;state.groups=saved.displayPreferences.groups;state.signClasses=saved.displayPreferences.signClasses;
  state.melodyId=saved.musicalPreferences.melodyId;
  applyRanges(saved.sections);$('assignment-title').value=saved.title;
});});
$('export-assignment').addEventListener('click',()=>download('tropetrain-assignment.json',createAssignment($('assignment-title').value,passage.ranges,state)));
$('import-assignment').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{if(file.size>2_000_000)throw Error('Assignment file is too large.');const assignment=parseAssignment(await file.text(),corpus);
    state.melodyId=assignment.musicalPreferences.melodyId;
    state.view=assignment.displayPreferences.view;state.groups=assignment.displayPreferences.groups;state.signClasses=assignment.displayPreferences.signClasses;applyRanges(assignment.sections);$('assignment-title').value=assignment.title;
  }catch(error){$('library-message').textContent=error.message;}finally{e.target.value='';}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='F2'){if(e.key==='F2')e.preventDefault();stop();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(player.running||referencePlayer.running||referencePlayer.starting||!$('wav-preview').paused))stop('Paused because this tab is hidden. Press Play to restart the span.');});
if(matchMedia('(min-width: 761px)').matches)$('library-options').open=true;
render();renderSections();renderPickers();if(state.findScope==='torah')refreshSignSearch();document.documentElement.dataset.ready='true';$('startup-status').hidden=true;
getCorpus().then(value=>{
  corpus=value;$('book').replaceChildren();
  for(const book of corpus.books){const o=document.createElement('option');o.value=book.id;o.textContent=`${book.name} · ${book.hebrewName}`;$('book').append(o);}
  $('library-status').textContent='5 books · 187 chapters · available offline';$('open-reading').disabled=false;$('append-section').disabled=false;
  $('source-study-open').disabled=false;
  if(restore.ranges){try{applyRanges(restore.ranges,{remember:false,restoreCursor:restore});}catch(error){$('library-message').textContent=`Saved reading could not be restored: ${error.message}`;}}
  restoringReading=false;persist();
  renderSections();
}).catch(error=>{$('library-status').textContent='Opening passage only';$('library-message').textContent=error.message;});
getReferenceLibrary().then(value=>{
  referenceLibrary=value;$('reference-portion').replaceChildren();
  for(const part of value.parts){const option=document.createElement('option');option.value=part.id;option.textContent=part.name;$('reference-portion').append(option);}
  $('reference-library-status').textContent=`${value.parts.length} portions · ${value.recordings.length} recordings · ${value.source.audit.alignedRecordings} with source word timings · ${value.source.audit.timingReviewRecordings.length} complete-take only`;
  $('reference-open').disabled=false;$('reference-portion').disabled=false;$('reference-aliyah').disabled=false;renderReference();
}).catch(error=>{$('reference-library-status').textContent=error.message;});
if(location.protocol==='file:')$('offline-status').textContent='Local file · ready without a server';
else if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{$('offline-status').textContent='Local audio & Torah text · available offline after first load';}).catch(()=>{});
