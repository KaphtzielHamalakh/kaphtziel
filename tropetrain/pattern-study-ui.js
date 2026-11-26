import {SEPHARDIC_PATTERN_ID} from './sephardic-patterns.js';
import {REPEAT_DEMO} from './source-repeat.js';
import {BAER_PATTERN_ID,baerPatternWrittenPlan} from './baer-patterns.js';
import {GRACE_DEMO} from './source-grace.js';
import {PATTERN_SMALL_EIGHTH_STUDY,hasPatternSmallEighthStudy} from './source-pattern-small-eighth.js';
import {printedRestAt,printedPatternDuration,printedPatternBeats,printedPatternRests} from './baer-patterns.js';
import {PRINTED_PATTERNS,PRINTED_PATTERN_CATALOG,PRINTED_PATTERN_SOURCES,PATTERN_MODES,PATTERN_IMAGE_DATA,PATTERN_RECORD_DATA,allPatternModes,patternImage,patternRecord,patternSource,availablePatternModes,printedPatternPlan,patternEvidence,patternContextChoices} from './printed-patterns.js';
import {Player} from './audio.js';
import {staffMarkup} from './staff.js';
import {beatLabel,eventPitchName} from './score-data.js';
import {soundingNotes} from './synthesis.js';
import {printedPatternRange} from './pattern-range.js';

export function mountPatternStudy({getSettings,beforePlay,findPattern}){
  const $=id=>document.getElementById(id),preferenceKey='tropetrain-pattern-study-v1';
  let plan=[],writtenPlan=[],settingsKey=null,selectedId=null,starting=false,request=0,saved,activeId=null;
  try{saved=JSON.parse(localStorage.getItem(preferenceKey));}catch{}
  function clearExport(){const link=$('pattern-export-link');link.hidden=true;link.removeAttribute('href');}
  function rangeChanged(){clearExport();const s=getSettings();$('pattern-range').textContent=printedPatternRange(plan,s.rangeLow,s.rangeHigh).text;}
  const setActive=id=>{
    if(activeId===id)return;activeId=id;const container=$('pattern-staff');let current;
    container.querySelectorAll('[data-event],[data-rest]').forEach(el=>{const active=(el.dataset.event??el.dataset.rest)===id;el.classList.toggle('active',active);if(active)current=el;});
    if(current){const hit=(current.querySelector('.staff-hit')??current).getBoundingClientRect(),box=container.getBoundingClientRect();if(hit.left<box.left||hit.right>box.right)container.scrollBy({left:hit.left-box.left-(container.clientWidth-hit.width)/2,behavior:'auto'});}
  };
  const player=new Player((event,cycle,_progress,index)=>{
    setActive(event.sourceComponentId??event.id);$('pattern-status').textContent=`${player.repeat?`Loop ${cycle+1} · `:''}Printed component ${event.sourceComponentNumber??index+1} of ${event.sourceComponentCount??plan.length}${event.sourcePage?' · p.'+event.sourcePage:''} · ${eventPitchName(event)}.${event.repeatPass?` Original repeat demonstration · pass ${event.repeatPass} of 2; source count unspecified.`:""}${event.sourcePatternSmallEighth?' Unmeasured printed small eighth; original 80 ms timing; source ornament role unassigned.':event.sourceGrace?' Unmeasured printed grace; original demonstration timing: 80 ms.':''}${event.sourceFermata?' Printed fermata; playback uses the written duration.':''}`;
  },()=>{starting=false;setActive(null);$('pattern-status').setAttribute('aria-live','polite');$('pattern-status').textContent=plan.some(e=>e.sourcePatternSmallEighth)?'Original small-eighth timing study finished. Source duration and ornament role remain unassigned.':plan.some(e=>e.sourceGrace)?'Original instrumental timing demonstration finished. Source grace durations remain unspecified.':'Printed pattern finished. Bible-word selection is unchanged.';},(cycle,progress,index)=>{
    const rest=printedRestAt(plan,progress*player.duration);
    setActive(rest?.id??null);$('pattern-status').textContent=`${player.repeat?`Loop ${cycle+1} · `:''}Printed rest${rest?` · component ${rest.sourceComponentNumber} · ${beatLabel(rest.beats)} quarter-note beats`:''}.`;
  },{onError:error=>{stop();$('pattern-status').textContent=`Pattern audio unavailable: ${error.message}`;}});
  function inspect(event){
    selectedId=event.id;$('pattern-note-detail').textContent=`${event.sourceLocation}${event.sourceVariant?' · '+event.sourceVariant.label:''} · ${event.kind==='rest'?`${event.rhythm.type} rest`:eventPitchName(event)+` (MIDI ${event.midi})`}${event.sourcePatternSmallEighth?' · unmeasured printed small eighth · original instrumental timing: 80 ms; source duration, ornament role and stealing ratio unassigned.':event.sourceGrace?' · unmeasured printed grace · original instrumental demonstration: 80 ms; source duration and stealing ratios remain unspecified.':` · ${beatLabel(event.beats)} quarter-note beats · ${event.durationSeconds.toFixed(3)} seconds.`}${event.tieStart||event.tieStop?' Printed tie: hold this pitch without a new attack.':''}${event.sourceRestsAfter?.length?' Followed by printed rest values: '+event.sourceRestsAfter.map(r=>beatLabel(r.beats)).join(' + ')+'.':''}${event.sourceFermata?' Printed fermata: the hold length is unspecified. Playback regularizes the written duration.':''}${event.sourceAccidentalEvidence?' '+event.sourceAccidentalEvidence.replaceAll('_',' '):''} No syllable or phoneme allocation is asserted.`;
  }
  function stop(message='Printed pattern stopped.'){
    const wasRunning=player.running||starting;request++;starting=false;player.stop();setActive(null);$('pattern-status').setAttribute('aria-live','polite');
    if(wasRunning)$('pattern-status').textContent=message;
  }
  function populateModes(previous){
    const options=allPatternModes($('pattern-source').value);$('pattern-mode').replaceChildren();
    const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose supported columns';placeholder.disabled=true;$('pattern-mode').append(placeholder);
    for(const mode of options){const option=document.createElement('option');option.value=mode.id;option.textContent=mode.name;$('pattern-mode').append(option);}
    $('pattern-mode').value=options.some(m=>m.id===previous)?previous:'';
  }
  function remember(){try{localStorage.setItem(preferenceKey,JSON.stringify({sourceId:$('pattern-source').value,mode:$('pattern-mode').value,context:$('pattern-context-query').value}));}catch{}}
  function contextChoices(){return patternContextChoices($('pattern-source').value,$('pattern-mode').value);}
  function populateContexts(){
    const choices=contextChoices(),previous=$('pattern-context-query').value||saved?.context;
    $('pattern-context-query').replaceChildren();choices.forEach((q,index)=>{const option=document.createElement('option');option.value=q.ids.join('>');option.textContent=q.label;$('pattern-context-query').append(option);});
    $('pattern-context-query').value=choices.some(q=>q.ids.join('>')===previous)?previous:choices[0]?.ids.join('>')??'';
    $('pattern-context-query-label').hidden=choices.length<2;$('pattern-find').disabled=!choices.length;
  }
  function refresh(){
    clearExport();
    const state=getSettings(),sourceId=$('pattern-source').value,mode=$('pattern-mode').value,row=patternSource(sourceId,mode),record=row.record,graceDemo=$('pattern-grace-demo').checked,repeatDemo=$('pattern-repeat-demo').checked,smallPatternDemo=$('pattern-small-eighth-demo').checked,key=JSON.stringify([sourceId,mode,state.tempo,state.transpose,graceDemo,repeatDemo,smallPatternDemo]);
    const smallCandidate=hasPatternSmallEighthStudy(record.selectedFigure),unmeasured=record.selectedFigure?.status==='unmeasured-grace';$('pattern-small-eighth-options').hidden=!smallCandidate;$('pattern-grace-options').hidden=!unmeasured;$('pattern-repeat-options').hidden=!record.selectedFigure?.repeat;
    $('pattern-play').textContent=unmeasured||smallCandidate?'Play timing demonstration':'Play printed pattern';
    $('pattern-settings').textContent=`Uses instrument controls above: ${state.tempo} BPM · transpose ${state.transpose>0?'+':''}${state.transpose} · instrument volume ${state.volume}%. Fixed recordings and the Bible reading’s musical source are separate.`;
    player.setVolume(state.volume/100);if(key===settingsKey)return;stop('Pattern settings changed. Press Play printed pattern to hear them.');settingsKey=key;populateContexts();
    $('pattern-selected-source').textContent=`${row.label}. ${typeof record.sourceKey==='object'?record.sourceKey.label:record.sourceKey}`;
    $('sephardic-pattern-companion').hidden=sourceId!==SEPHARDIC_PATTERN_ID;
    const principle=record.notationPrinciple;$('pattern-alternatives').hidden=!principle;
    if(principle)$('pattern-preface-link').href=patternImage(principle.source.file);else $('pattern-preface-link').removeAttribute('href');
    const cells=[...new Set(record.notes.map(n=>n.cell))].map(c=>allPatternModes(sourceId).find(m=>m.id===c)?.name??c);
    $('pattern-availability').textContent=record.availabilityText?`${record.availabilityText} ${record.selectedFigure?.pending??''} ${record.selectedFigureContext??''}`:record.figures?`${record.figures.filter(f=>f.status==='transcribed').length} fully measured source figures of ${record.figures.length}; ${record.figures.filter(f=>f.status==='unmeasured-grace').length} with unmeasured graces; ${record.figures.filter(f=>!['transcribed','unmeasured-grace'].includes(f.status)).length} other cells remain pending. ${record.selectedFigure?.pending??record.selectedFigure?.contextPending??'Literal source figures only; arbitrary-word fitting and independent musical review remain pending.'}`:`Transcribed: ${cells.join(' and ')}.${row.unavailable.length?' Awaiting notation evidence: '+row.unavailable.map(p=>({munah:'plain Munaḥ',revia:'Revia',yetiv:'Yetib','zakef-preceded':'conditional Zaqef'})[p.cell]).join(', ')+'.':''} ${record.conditions?.[mode]?.subtypeReview?' The source predecessor “Zaqef” has no subtype; subtype searches are lookup candidates.':''} Independent musical/transcription review is pending.`;
    if(smallCandidate&&smallPatternDemo)$('pattern-availability').textContent='21 unreviewed written-value source figures; two additional original small-note timing studies are opt-in. Three figures with other unresolved notation remain withheld. Source small-note duration/role and independent musical review remain unassigned.';
    const legacy=sourceId===PRINTED_PATTERNS.id;
    $('pattern-source-caption').textContent=record.source.caption?`${row.label}. ${record.source.caption}`:legacy?'Printed page 540, row I.A: plain Munaḥ and Revia. The separate context image retains its label and key.':record.source.page===541?`Printed page 541, ${row.label}. The context image retains the p.540 row labels and keys; the continuation keeps their order. Other figures remain context only.`:`Printed page 540, ${row.label}. The images retain the six ordinary Torah rows A–F and their printed keys. Other figures remain context only.`;
    for(const [imageId,linkId,path] of [['pattern-source-scan','pattern-source-link',record.source.image],['pattern-context-scan','pattern-context-link',record.source.contextImage.image]]){
      const value=patternImage(path);if($(imageId).getAttribute('src')!==value)$(imageId).src=value;$(linkId).href=value;
      $(imageId).alt=record.source.imageAlt??(record.figures?`${row.label}, printed p.${record.source.page}; selected first setting with other rows retained as context`:`Cohen 1902 printed Torah pattern source: ${legacy?'row I.A':'six rows A–F; selected '+row.label}`);
    }
    const continuation=record.source.continuationImage;
    $('pattern-continuation').hidden=!continuation;
    if(continuation){$('pattern-continuation-scan').src=patternImage(continuation.image);$('pattern-continuation-link').href=patternImage(continuation.image);}
    else{$('pattern-continuation-scan').removeAttribute('src');$('pattern-continuation-link').removeAttribute('href');}
    $('pattern-record-link').href=patternRecord(row.recordPath??'docs/PRINTED-PATTERN-CATALOG.json');
    $('pattern-primary-link').href=record.source.url;$('pattern-rights').textContent=record.source.rights??'Original printed source public domain; new literal transcription CC0. Independent review pending.';
    const supported=availablePatternModes(sourceId,{graceDemo,repeatDemo,smallPatternDemo}).some(m=>m.id===mode);
    $('pattern-play').disabled=!supported;$('pattern-download').disabled=!supported;
    if(!supported){plan=[];writtenPlan=[];rangeChanged();$('pattern-staff').replaceChildren();$('pattern-summary').textContent='Choose a transcribed printed figure. Pending cells supply no replacement music.';$('pattern-note-detail').textContent='';$('pattern-status').textContent=smallCandidate?'Choose the separate optional original 80 ms small-eighth study to hear this figure; historical duration and ornament role remain unassigned.':unmeasured?'Choose the optional original timing demonstration'+(record.selectedFigure?.repeat?' and two-pass repeat demonstration':'')+' to hear this figure. Source grace durations and numeric repeat count remain unspecified.':record.selectedFigure?.pending??'Choose supported columns for this source row.';return;}
    plan=printedPatternPlan(mode,{...state,sourceId,graceDemo,repeatDemo,smallPatternDemo});writtenPlan=sourceId===BAER_PATTERN_ID?baerPatternWrittenPlan(mode,{...state,graceDemo}):plan;$('pattern-staff').innerHTML=staffMarkup(writtenPlan,[],0,writtenPlan.length,{untexted:true});
    $('pattern-summary').textContent=plan.some(e=>e.sourcePatternSmallEighth)?`${plan.length} distinct source attacks · 1 unmeasured small eighth. Original instrumental study: 80 ms for that small note, plus 1 unchanged measured quarter-note beat · ${printedPatternDuration(plan).toFixed(2)} seconds. Printed order and slur retained; source duration, ornament role, word/phoneme fitting and historical review remain unassigned.`:plan.some(e=>e.sourceGrace)?`${plan.length} ${record.selectedFigure?.repeat?"playback component occurrences":"printed components"} · ${plan.filter(e=>e.sourceGrace).length} ${record.selectedFigure?.repeat?"grace-note occurrences":"unmeasured grace notes"}. Original instrumental demonstration: 80 ms per grace added between ${beatLabel(plan.filter(e=>!e.sourceGrace).reduce((b,e)=>b+e.beats,0))} unchanged measured quarter-note beats · ${printedPatternDuration(plan).toFixed(2)} seconds. Source grace durations remain unspecified; no word or phoneme fitting is assigned.`:`${plan[0].sourceComponentCount??plan.length} printed components · ${printedPatternRests(plan).length} rests · ${soundingNotes(plan).length} sounding attacks · ${beatLabel(printedPatternBeats(plan))} quarter-note beats · ${printedPatternDuration(plan).toFixed(2)} seconds.${plan.some(e=>e.sourceFermata)?' Printed fermata hold length is unspecified; playback uses the written duration.':''} Ties hold pitches; slurs keep distinct attacks.`;
    if(record.selectedFigure?.repeat)$('pattern-summary').textContent+=' Written staff retains 27 literal components and both repeat signs. Playback has 41 component occurrences: introduction once, marked section twice, ending once. The two-pass count is original; source count and fermata hold remain unspecified.';
    for(const el of $('pattern-staff').querySelectorAll('[data-event],[data-rest]')){
      const event=writtenPlan.find(e=>e.id===el.dataset.event)??printedPatternRests(writtenPlan).find(r=>r.id===el.dataset.rest);el.addEventListener('click',()=>inspect(event));
      el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect(event);}});
    }
    rangeChanged();inspect(writtenPlan.find(e=>e.id===selectedId)??printedPatternRests(writtenPlan).find(r=>r.id===selectedId)??writtenPlan[0]);$('pattern-status').textContent=smallCandidate?'Ready: original 80 ms small-eighth timing study; source duration and role unassigned.':record.studyStatus?'Ready: unreviewed instrumental written-value study.':'Ready to compare these printed figures.';
  }
  for(const row of PRINTED_PATTERN_SOURCES){const option=document.createElement('option');option.value=row.id;option.textContent=row.label;$('pattern-source').append(option);}
  $('pattern-source').value=PRINTED_PATTERN_SOURCES.some(r=>r.id===saved?.sourceId)?saved.sourceId:PRINTED_PATTERNS.id;
  populateModes(saved?.mode??'pair');
  const openSephardic=()=>{$('pattern-source').value=SEPHARDIC_PATTERN_ID;$('pattern-grace-demo').checked=false;$('pattern-repeat-demo').checked=false;$('pattern-small-eighth-demo').checked=false;populateModes('no938-zarqa');refresh();remember();$('pattern-study-heading').scrollIntoView({block:'start'});};
  $('sephardic-pattern-open').addEventListener('click',openSephardic);$('sephardic-pattern-open').disabled=false;
  for(const a of document.querySelectorAll('a[href="#sephardic-pattern-study"]'))a.addEventListener('click',openSephardic);if(location.hash==='#sephardic-pattern-study')openSephardic();
  $('idelsohn-pattern-open').addEventListener('click',()=>{$('pattern-source').value='idelsohn-1929-vol5-no267';$('pattern-grace-demo').checked=false;$('pattern-repeat-demo').checked=false;$('pattern-small-eighth-demo').checked=false;populateModes('idelsohn1929-267-zarqa');refresh();remember();$('pattern-study-heading').scrollIntoView({block:'start'});});
  $('pattern-source').addEventListener('change',()=>{$('pattern-grace-demo').checked=false;$('pattern-repeat-demo').checked=false;$('pattern-small-eighth-demo').checked=false;populateModes($('pattern-mode').value);refresh();remember();});
  $('pattern-mode').addEventListener('change',()=>{$('pattern-grace-demo').checked=false;$('pattern-repeat-demo').checked=false;$('pattern-small-eighth-demo').checked=false;refresh();remember();});
  $('pattern-grace-demo').addEventListener('change',()=>refresh());
  $('pattern-repeat-demo').addEventListener('change',()=>refresh());
  $('pattern-small-eighth-demo').addEventListener('change',()=>refresh());
  $('pattern-play').addEventListener('click',async()=>{
    beforePlay();refresh();if(!plan.length)return;const state=getSettings(),current=++request;starting=true;$('pattern-status').setAttribute('aria-live','off');$('pattern-status').textContent='Starting the printed pattern…';
    player.setVolume(state.volume/100);
    try{
      await player.play(plan,state.repeat);if(current!==request)return;starting=false;
      if($('pattern-status').textContent==='Starting the printed pattern…')$('pattern-status').textContent=player.running?'Playing the printed pattern.':'Pattern playback was cancelled before it began.';
    }catch(error){if(current!==request)return;stop();$('pattern-status').textContent=`Pattern unavailable: ${error.message}`;}
  });
  const evidenceUrls=new Map(),viewer=$('pattern-source-viewer');
  for(const [id,kind] of [['pattern-source-link','columns'],['pattern-continuation-link','continuation'],['pattern-context-link','context'],['pattern-record-link','record'],['pattern-preface-link','preface']])$(id).addEventListener('click',event=>{
    event.preventDefault();const evidence=patternEvidence($('pattern-source').value,kind,$('pattern-mode').value);
    $('pattern-viewer-title').textContent=kind==='record'?'Exact source record':kind==='preface'?'Baer’s alternative-line instruction':'Full-resolution printed source';
    $('pattern-viewer-caption').textContent=patternSource($('pattern-source').value).label+' · '+evidence.name;
    $('pattern-viewer-image').hidden=kind==='record';$('pattern-viewer-json').hidden=kind!=='record';
    if(kind==='record')$('pattern-viewer-json').textContent=evidence.text;else{$('pattern-viewer-image').src=evidence.url;$('pattern-viewer-image').alt=$('pattern-viewer-caption').textContent;}
    if(!evidenceUrls.has(evidence.file))evidenceUrls.set(evidence.file,URL.createObjectURL(new Blob([evidence.bytes],{type:evidence.mime})));
    $('pattern-viewer-download').href=evidenceUrls.get(evidence.file);$('pattern-viewer-download').download=evidence.name;
    $('pattern-viewer-body').scrollTop=0;$('pattern-viewer-body').scrollLeft=0;viewer.showModal();
  });
  $('pattern-viewer-close').addEventListener('click',()=>viewer.close());
  $('pattern-stop').addEventListener('click',()=>{stop();$('pattern-status').textContent='Printed pattern stopped. Bible-word selection is unchanged.';});
  $('pattern-context-query').addEventListener('change',remember);
  $('pattern-find').addEventListener('click',()=>{const q=contextChoices().find(q=>q.ids.join('>')===$('pattern-context-query').value);if(q)findPattern(q.ids.join('>'));});
  $('pattern-download').addEventListener('click',()=>{
    refresh();if(!plan.length)return;const state=getSettings(),row=patternSource($('pattern-source').value,$('pattern-mode').value),record=patternEventDocument(row,$('pattern-mode').value,state,plan,writtenPlan);
    const a=$('pattern-export-link');a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(record,null,2));a.hidden=false;a.click();
  });
  for(const id of ['pattern-source','pattern-mode','pattern-stop'])$(id).disabled=false;
  refresh();
  return {stop,refresh,rangeChanged,openFigure(sourceId,mode){
    if(!PRINTED_PATTERN_SOURCES.some(r=>r.id===sourceId)||!allPatternModes(sourceId).some(m=>m.id===mode))throw Error('Choose a supplied printed figure.');
    stop();$('pattern-source').value=sourceId;$('pattern-grace-demo').checked=false;$('pattern-repeat-demo').checked=false;$('pattern-small-eighth-demo').checked=false;populateModes(mode);refresh();remember();$('pattern-study-heading').scrollIntoView({block:'start'});
  },setRepeat:value=>{player.repeat=value;},volumeChanged:()=>refresh()};
}

export function patternEventDocument(row,mode,state,plan,writtenPlan){
 return {format:'tropetrain-untexted-pattern-v1',source:row.record,sourceCatalog:row.sourceCatalog??{id:PRINTED_PATTERN_CATALOG.id,revision:PRINTED_PATTERN_CATALOG.revision},mode,
  tempo:state.tempo,transpose:state.transpose,volume:state.volume,smallEighthTimingDemonstration:plan.some(e=>e.sourcePatternSmallEighth)?{...PATTERN_SMALL_EIGHTH_STUDY}:null,timingDemonstration:plan.some(e=>e.sourceGrace)?{...GRACE_DEMO}:null,repeatDemonstration:plan.some(e=>e.performanceRepeat)?{...REPEAT_DEMO}:null,sourceWrittenEvents:row.record.selectedFigure?.repeat?writtenPlan:null,pronunciation:null,phonemes:null,syllableUnderlay:null,
  vocalRange:{low:state.rangeLow,high:state.rangeHigh,mode:'advisory'},events:plan};
}
