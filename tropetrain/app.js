import {getSourcePhraseLibrary} from './source-phrases.js';
import {mountSourceRecall} from './source-recall-ui.js';
import {mountSourcePhrases} from './source-phrase-ui.js';
import {isJointEvent,eventNavigationIndex} from './event-correspondence.js';
import {JOINT_COVERAGE_SUMMARY} from './joint-coverage-summary.js';
import {createReadingModel,consonantal,noteName,melodyProfiles} from './music.js';
import {PRINTED_SCORE} from './printed-score.js';
import {BAER_SCORE} from './baer-score.js';
import {COHEN_PROPHETICAL} from './cohen-prophetical-score.js';
import {COHEN_PENITENTIAL} from './cohen-penitential-score.js';
import {IDELSOHN_SCORE} from './idelsohn-score.js';
import {printedWordStudy,printedWordPhoto,printedUnitContext} from './printed-underlay.js';
import {PRINTED_UNDERLAY_IMAGE,PRINTED_UNDERLAY_EVIDENCE} from './printed-underlay-data.js';
import {IDELSOHN_SCORE_IMAGE,IDELSOHN_SCORE_EVIDENCE} from './idelsohn-score-data.js';
import {SMALL_EIGHTH_STUDY} from './source-small-eighth.js';
import {SMALL_NOTE_STUDY} from './source-small-note.js';
import {BAER_HIGH_HOLIDAY} from './baer-high-holiday-score.js';
import {isPrintedScore} from './printed-score-registry.js';
import {beatLabel,eventPitchName} from './score-data.js';
import {passage as openingPassage} from './passage.js';
import {getCorpus,defaultRange} from './library.js';
import {getRepertoireCorpus,READING_TYPES,booksForReadingType,readingTypeForRanges,validateReadingSections,isTorahReading,reorderReadingSection,createRepertoireAssignment,parseRepertoireAssignment} from './repertoire.js';
import {sourceAlternatives} from './source-alternatives.js';
import {relatedDefinition} from './related-source.js';
import {practiceRecovery,latestPracticeRecovery,savePracticeRecovery} from './practice-recovery.js';
import {Player} from './audio.js';
import {staffMarkup,STAFF_PAGE} from './staff.js';
import {musicXml,midiFile} from './music-exports.js';
import {renderWav,wavSummary} from './wav.js';
import {instrument,soundingNotes,validatePlan} from './synthesis.js';
import {SIGN_ANALYSIS,sourceClassLabel} from './accents.js';
import {SIGN_QUERIES,findSignsInReading,findSignsInCorpus} from './sign-search.js';
import {RecordingPlayer} from './recorded-reference.js';
import {getReferenceLibrary} from './reference-library.js';
import {ReferenceAudioStore} from './reference-audio-store.js';
import {CONTEXT_ANALYSIS} from './accent-context.js';
import {mountCombinationTools} from './combination-ui.js';
import {mountPatternStudy} from './pattern-study-ui.js';
import {getScrollLayout} from './scroll-layout.js';
import {scrollPane,marksWord,writtenUnitClass} from './scroll-layout-ui.js';
import {mountCalendar} from './calendar-ui.js';
import {mountVoiceStudies} from './voice-study-ui.js';
import {mountPronunciationStudy} from './pronunciation-ui.js';
import {NOTE_LINK_REASONS} from './pronunciation-note-links.js';
import {renderPronunciationScoreGroups} from './pronunciation-score-groups-ui.js';
import {appendReaderPronunciation} from './pronunciation-reader.js';
import {practiceAudioMode,chantPracticePlan,chantCoverage} from './recorded-practice.js';
import {RecordedPitchStore,pitchProcessingSupported} from './recorded-pitch-store.js';
import {sourceTimedPracticePlan} from './measured-practice.js';
import {createRecordingTimingGroups} from './recording-timing-groups.js';
import {createRecordingGroupWordDrafts} from './recording-group-word-draft.js';
import {mountRecordingGroupWordTiming} from './recording-group-word-timing-ui.js';
import {SourceContourStore,contourSupported} from './source-contour-store.js';
import {mountSourcePitch} from './source-pitch-ui.js';
import {mountSyllableTiming} from './syllable-timing-ui.js';
import {groupTimingPreview} from './syllable-group-timing.js';
import {mountHaftarah} from './haftarah-ui.js';
import {getPronunciationLibrary} from './pronunciation.js';
import {SourceSyllableUnderlay,SOURCE_SYLLABLE_UNDERLAY,SOURCE_SYLLABLE_GAPS} from './source-syllable-underlay.js';

import {readingChoices} from './source-reading-choices.js';

const $=id=>document.getElementById(id),VERSE_PAGE=8,NOTE_PAGE=128;
let readerPronunciation=false;
try{const saved=JSON.parse(localStorage.getItem('tropetrain-reader-pronunciation-v1'));if(typeof saved?.enabled==='boolean')readerPronunciation=saved.enabled;}catch{}
$('reader-pronunciation').checked=readerPronunciation;
let sourceSyllablesEnabled=false,sourceReadingsEnabled=false,sourceJointEnabled=false,sourceReadingChoices=readingChoices(),sourceSyllableAdapter=null,sourceSyllableError=null,sourceSyllableRequest=0;
try{const saved=JSON.parse(localStorage.getItem('tropetrain-source-syllables-v1'));sourceSyllablesEnabled=saved?.enabled===true;sourceReadingsEnabled=saved?.allowSourceReadings===true;sourceJointEnabled=saved?.allowJointSources===true;sourceReadingChoices=readingChoices(saved?.sourceReadingChoices??{});}catch{}
function makeReadingModel(value,settings){return createReadingModel(value,{...settings,...(sourceSyllablesEnabled?{sourceUnderlay:sourceSyllableAdapter}:{})});}
const state={cursor:0,anchor:0,printedSyllableIndex:1,view:'pointed',scrollLayout:false,scope:'group',tempo:84,transpose:0,volume:70,repeat:false,groups:true,signClasses:false,signQuery:'etnahta',findScope:'reading',
  rangeLow:60,rangeHigh:72,referenceVolume:0,chantRate:100,chantTranspose:0,recordingTimingGroups:false,readerPage:0,notePage:0,staffPage:0,followPlayback:true,ranges:null,melodyId:'original-demo-01',practiceAudio:'instrument',readingType:'torah'};
let restoredReadingType,originalPracticeText=null;
try{
  originalPracticeText=localStorage.getItem('tropetrain-practice-v1');const saved=JSON.parse(originalPracticeText);
  if(saved){
    state.practiceAudio=practiceAudioMode(saved.practiceAudio);
    if(Number.isInteger(saved.chantTranspose)&&saved.chantTranspose>=-12&&saved.chantTranspose<=12)state.chantTranspose=saved.chantTranspose;
    if([50,65,75,85,100,115,125,150].includes(saved.chantRate))state.chantRate=saved.chantRate;
    for(const [key,min,max] of [['cursor',0,1000000],['anchor',0,1000000],['printedSyllableIndex',1,20],['tempo',40,160],['transpose',-12,12],['volume',0,100],['referenceVolume',0,100],['rangeLow',36,84],['rangeHigh',36,84],['readerPage',0,100000]])
      if(Number.isInteger(saved[key])&&saved[key]>=min&&saved[key]<=max)state[key]=saved[key];
    if(['pointed','consonantal','parallel'].includes(saved.view))state.view=saved.view;
    if(['word','printed-syllable','source-unit','group','verse','aliyah','selection','passage'].includes(saved.scope))state.scope=saved.scope;
    for(const key of ['repeat','groups','followPlayback','signClasses','scrollLayout','recordingTimingGroups'])if(typeof saved[key]==='boolean')state[key]=saved[key];
    if(['reading','torah'].includes(saved.findScope))state.findScope=saved.findScope;
    if(SIGN_QUERIES.some(q=>q.id===saved.signQuery))state.signQuery=saved.signQuery;
    if(Array.isArray(saved.ranges))state.ranges=saved.ranges;
    if(READING_TYPES.some(type=>type.id===saved.readingType))state.readingType=restoredReadingType=saved.readingType;
    if(melodyProfiles.some(p=>p.id===saved.melodyId))state.melodyId=saved.melodyId;
  }
}catch{}
const restore={cursor:state.cursor,anchor:state.anchor,readerPage:state.readerPage,ranges:state.ranges,readingType:restoredReadingType};
state.readingType='torah';
let passage={...openingPassage,title:'Genesis 1:1–3',ranges:[structuredClone(defaultRange)]};
let model=makeReadingModel(passage,state),{words,bounds,buildPlan}=model;
state.cursor=Math.min(state.cursor,words.length-1);state.anchor=Math.min(state.anchor,words.length-1);state.readerPage=0;
let corpus,chooseEnd=false,plan=[],activeId=null,activeWordIds=[],activeEventId=null,activeInstrumentEvent=null,playingBounds=null;
let recent=loadArray('tropetrain-recent-v1'),assignments=loadArray('tropetrain-assignments-v1');
let restoringReading=!!restore.ranges;
let practiceRecoveryRecord=null;try{practiceRecoveryRecord=latestPracticeRecovery(localStorage);}catch{}
let exportsKey=null,wavJob=null;
const exportUrls=new Map();
let findGeneration=0,findHits=[],findPage=0,findWords=null;
let sourceRecallTools=null,sourcePhraseTools=null,combinationTools=null,patternTools=null,voiceStudyTools=null,pronunciationTools=null,sourcePitchTools=null,syllableTimingTools=null,haftarahTools=null,recordingGroupTimingTools=null,recordingGroupWordDrafts=null;
let scorePronunciation=true,scorePronunciationReport=null,scoreGroupReport=null,inspectedScoreEventId=null;
try{const saved=JSON.parse(localStorage.getItem('tropetrain-score-pronunciation-v1'));if(typeof saved?.enabled==='boolean')scorePronunciation=saved.enabled;}catch{}
$('score-pronunciation').checked=scorePronunciation;
let pronunciationSpanFollowing=false;
try{pronunciationSpanFollowing=JSON.parse(localStorage.getItem('tropetrain-pronunciation-span-follow-v1'))?.enabled===true;}catch{}
$('pronunciation-span-follow').checked=pronunciationSpanFollowing;
let smallNoteDemo=false;try{const saved=JSON.parse(localStorage.getItem('tropetrain-cohen-small-note-v1'));smallNoteDemo=saved?.policyId===SMALL_NOTE_STUDY.id&&saved.enabled===true;}catch{}
$('printed-small-note-demo').checked=smallNoteDemo;
let smallEighthDemo=false;try{const saved=JSON.parse(localStorage.getItem('tropetrain-no268-small-eighth-v1'));smallEighthDemo=saved?.policyId===SMALL_EIGHTH_STUDY.id&&saved.enabled===true;}catch{}
$('printed-small-eighth-demo').checked=smallEighthDemo;
$('idelsohn-underlay-image').src=PRINTED_UNDERLAY_IMAGE;$('idelsohn-underlay-evidence').href=PRINTED_UNDERLAY_EVIDENCE;
$('idelsohn-score-image').src=IDELSOHN_SCORE_IMAGE;$('idelsohn-score-evidence').href=IDELSOHN_SCORE_EVIDENCE;
let scrollLayout=null,scrollMessage='Sourced scroll lines are loading.';
let referenceLibrary=null,recordingTimingGroups=null,recordingTimingGroupError=null,selectedReferenceId=null,referenceActiveIds=[],referencePlan=null,referenceRequired=[],referenceReady=false,referenceUiGeneration=0,referenceLoadJob=null;
let chantPlan=null,chantReady=false,chantGeneration=0,chantPlayRequest=0,recordedPracticeRunning=false,lastProcessedPitch=null,lastMeasuredTone=null;
const isSourcePractice=()=>state.practiceAudio==='recorded'||state.practiceAudio==='measured';
const sourcePracticeName=()=>state.practiceAudio==='measured'?'Measured tones':'Recorded chant';
const referenceStore=new ReferenceAudioStore({openingUrl:$('reference-audio').getAttribute('src')});
const recordedPitchStore=new RecordedPitchStore({sourceStore:referenceStore,
  onProgress:(value,message)=>{$('chant-pitch-status').textContent=`${message} · ${Math.round(value*100)}%`;if(recordedPracticeRunning)$('chant-pitch-cancel').hidden=false;},
  onReady:metadata=>{
    lastProcessedPitch=metadata;
    $('chant-pitch-cancel').hidden=true;$('chant-pitch-details').hidden=false;
    $('chant-pitch-status').textContent=`Prepared ${metadata.semitones>0?'+':''}${metadata.semitones} semitones · ${metadata.durationSeconds.toFixed(3)} source seconds · formant compensation requested. Processed sound review pending.`;
    $('chant-pitch-metadata').textContent=JSON.stringify(metadata,null,2);
  }
});
const sourceContourStore=new SourceContourStore({
  onProgress:(value,message)=>{$('chant-pitch-status').textContent=`${message} · ${Math.round(value*100)}%`;if(recordedPracticeRunning)$('chant-pitch-cancel').hidden=false;},
  onReady:metadata=>{lastMeasuredTone=metadata;$('chant-pitch-cancel').hidden=true;$('measured-tone-details').hidden=false;$('measured-tone-metadata').textContent=JSON.stringify(metadata,null,2);$('chant-pitch-status').textContent=`Prepared measured tones · ${metadata.durationSeconds.toFixed(3)} source seconds · ${metadata.assignedMeasurementFrames} measured / ${metadata.unassignedMeasurementFrames} unassigned frames. Approximation; review pending.`;}
});
const chantPitchLabel=()=>state.practiceAudio==='measured'?`${state.chantTranspose>0?'+':''}${state.chantTranspose} semitones · measured tones` :state.chantTranspose===0?'original pitch requested':`${state.chantTranspose>0?'+':''}${state.chantTranspose} semitones · processed recording`;
const referencePlayer=new RecordingPlayer($('reference-audio'),{
  onWord:word=>{
    referenceActiveIds=word?[word.occurrenceId]:[];
    if(word&&state.followPlayback){const page=Math.floor(words[word.wordIndex].verseIndex/VERSE_PAGE);if(page!==state.readerPage){state.readerPage=page;renderReader();}}
    document.querySelectorAll('[data-word]').forEach(el=>el.classList.toggle('reference-active',referenceActiveIds.some(id=>marksWord(el,id))));
    if(word){renderRecordedWord(word);pronunciationTools?.showWord(words[word.wordIndex],{following:true});}else pronunciationTools?.showWord(words[state.cursor]);
    if(recordedPracticeRunning&&state.practiceAudio==='measured'&&word){
      const w=words[word.wordIndex],summary=sourceContourStore.wordSummary(referenceLibrary.at(w),w);
      $('measured-tone-window').textContent=summary?`${summary.hebrew} · ${summary.measuredFrameOnsets} measured / ${summary.totalFrameOnsets} frame onsets in this source word window. ${summary.measuredFrameOnsets?'Only assigned measurement cells make tones.':'No measured frequency onset in this window; missing measurements do not establish silence.'} No syllable timing is inferred.`:'';
    }
    if(word&&recordedPracticeRunning){$('status').textContent=`${sourcePracticeName()} · ${state.chantRate}% speed · ${chantPitchLabel()} · ${label(word.wordIndex)}${state.referenceVolume===0?' · muted clock':''}`;$('progress').style.width=`${100*(word.wordIndex-playingBounds[0]+1)/(playingBounds[1]-playingBounds[0]+1)}%`;}
    recordingGroupTimingTools?.follow();
  },
  onGroup:(group,clock)=>{
    referenceActiveIds=group?.occurrenceIds??[];
    if(group&&state.followPlayback){const page=Math.floor(words[group.firstIndex].verseIndex/VERSE_PAGE);if(page!==state.readerPage){state.readerPage=page;renderReader();}}
    document.querySelectorAll('[data-word]').forEach(el=>el.classList.toggle('reference-active',referenceActiveIds.some(id=>marksWord(el,id))));
    if(group){
      $('reference-word').textContent=group.recordingHebrew.join(' ');
      $('reference-word-label').textContent=`Complete recording timing group · ${group.wordIds.length} words · ${group.startSeconds.toFixed(6)}–${group.endSeconds.toFixed(6)} original seconds`;
      $('reference-source-comparison').textContent='The whole group is highlighted together. Individual word and syllable times remain unassigned; source text, timestamps and recording remain unchanged.';
      if(recordedPracticeRunning){$('status').textContent=`Recorded chant · complete timing group · ${group.wordIds.length} words together · ${Math.round(clock.progress*100)}% of group · individual word times unassigned${state.referenceVolume===0?' · muted clock':''}`;$('progress').style.width=`${clock.progress*100}%`;}
    }
    recordingGroupTimingTools?.follow();
  },
  onEnd:()=>{$('reference-status').textContent='Reference playback finished. Your selection is kept.';say('Recorded reference finished. Your selection is kept.');recordedPracticeRunning=false;transportLabel(false);},
  onError:error=>{$('chant-pitch-cancel').hidden=true;if(state.practiceAudio==='measured'||state.chantTranspose!==0)$('chant-pitch-status').textContent=`Source preparation unavailable: ${error.message}`;$('reference-status').textContent=`Reference unavailable: ${error.message}`;recordedPracticeRunning=false;transportLabel(false);say(`${sourcePracticeName()} unavailable: ${error.message}`);renderReference({keepChoice:true});renderChantPractice();},
  onLoading:id=>{$('reference-status').textContent=`Opening ${referenceLibrary?.byId.get(id)?.title??'reference'}…`;},
  onRecording:id=>{if(id){selectedReferenceId=id;syncReferencePickers();renderReferencePlaybackStatus(id);}},
  resolveSource:(id,options)=>recordedPracticeRunning&&state.practiceAudio==='measured'?sourceContourStore.url(referenceLibrary.byId.get(id),{...options,semitones:state.chantTranspose}):recordedPracticeRunning&&state.chantTranspose!==0?recordedPitchStore.url(referenceLibrary.byId.get(id),{...options,semitones:state.chantTranspose}):referenceStore.url(referenceLibrary.byId.get(id),options)
});
function renderReferencePlaybackStatus(id){
  $('reference-status').textContent=`Playing ${referenceLibrary.byId.get(id).title} · ${recordedPracticeRunning?`${state.chantRate}% speed · ${chantPitchLabel()}`:'original recorded key and tempo'} · ${recordedPracticeRunning&&state.practiceAudio==='measured'?'sine-tone approximation · no pronunciation voice':recordedPracticeRunning&&state.chantTranspose!==0?'source performance · processed timbre unreviewed':'original pronunciation'}${state.referenceVolume===0?' · muted at 0%':''}.`;
}
function loadArray(key){try{const data=JSON.parse(localStorage.getItem(key));return Array.isArray(data)?data.filter(item=>item&&typeof item==='object'&&typeof item.title==='string').slice(0,100):[];}catch{return [];}}
function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
function persist(){if(!restoringReading)store('tropetrain-practice-v1',{...state,ranges:passage.ranges});}
const label=i=>`${words[i].chapter}:${words[i].verse} · word ${words[i].ordinal}`;
const fullLabel=i=>`${words[i].bookName} ${label(i)}`;
const say=text=>{$('status').setAttribute('aria-live','polite');$('status').textContent=text;};
const player=new Player((event,cycle,progress,index)=>{
  const navigationIndex=eventNavigationIndex(event);
  if(state.followPlayback){
    const page=Math.floor(words[navigationIndex].verseIndex/VERSE_PAGE);
    if(page!==state.readerPage){state.readerPage=page;renderReader();}
    const notePage=Math.floor(index/NOTE_PAGE);
    if(notePage!==state.notePage){state.notePage=notePage;renderNotes();}
    const staffPage=Math.floor(index/STAFF_PAGE);
    if(staffPage!==state.staffPage){state.staffPage=staffPage;renderStaff();}
  }
  activeInstrumentEvent=event;
  setActive(isJointEvent(event)?event.wordIds:event.wordId,event.id);
  pronunciationTools?.showWord(words[navigationIndex],{following:true});
  $('progress').style.width=`${progress*100}%`;
  $('status').textContent=`${state.repeat?`Loop ${cycle+1} · `:''}Playing ${isJointEvent(event)?label(navigationIndex)+' through word '+words[event.wordIndices.at(-1)].ordinal+' · shared source word':label(navigationIndex)} · ${eventPitchName(event)}`;
},()=>{
  pronunciationTools?.showWord(words[state.cursor]);
  setActive(null,null);$('progress').style.width='100%';say(`Finished at ${label(playingBounds[1])}.`);transportLabel(false);
},(cycle,progress)=>{
  setActive(null,null);$('progress').style.width=`${progress*100}%`;
  $('status').textContent=`${state.repeat?`Loop ${cycle+1} · `:''}Rest · the next source note follows the printed pause.`;
},{onError:error=>stop(`Audio unavailable: ${error.message}`)});
function transportLabel(running){$('play').innerHTML=running?'<span aria-hidden="true">▶</span> Restart':'<span aria-hidden="true">▶</span> Play';}
function renderPronunciationFollow(){
  renderPrintedSyllableFollow();
  const hint='Instrument notes can highlight source syllables with an exact marked-Hebrew match. This is text correspondence; a singing voice and acoustic syllable timing are pending.';
  let report=null,error=null;
  const readerSource=pronunciationTools?.readerStatus();
  if(activeInstrumentEvent&&!model.profile.wordOnly&&readerSource?.kind!=='published-word')try{
    report=pronunciationTools?.followNote(activeInstrumentEvent,words);
    if(pronunciationSpanFollowing&&report?.status==='unlinked'&&report.reason==='different-syllable-boundaries')report=pronunciationTools?.followSpan(activeInstrumentEvent,words,plan)??report;
  }catch(e){error=e.message;}
  const unitIds=new Set(['exact-written-span','source-reading-word','source-reading-group','common-written-span'].includes(report?.status)?report.units.map(u=>u.sourceUnitId):[]);
  for(const el of $('reader').querySelectorAll('.reader-word-pronunciation [data-source-unit]')){
    const button=el.closest('.pronunciation-word')?.querySelector('.word');
    const shared=el.closest('.reader-source-group');
    const active=!!report&&unitIds.has(el.dataset.sourceUnit)&&(report.status==='source-reading-group'?shared?.dataset.jointGroup===report.jointGroupId:button?.dataset.word===report.wordId);
    el.classList.toggle('pronunciation-syllable-active',active);
    el.classList.toggle('pronunciation-span-active',active&&report.status==='common-written-span');
    if(active)el.setAttribute('aria-current','true');else el.removeAttribute('aria-current');
  }
  const spanContent=$('pronunciation-span-content');spanContent.replaceChildren();spanContent.hidden=report?.status!=='common-written-span';
  const groups=new Set(report?.status==='common-written-span'?report.paths.map(p=>p.groupId):[]);
  for(const row of $('score-word-alignment-content').querySelectorAll('[data-group-id]')){
    const active=groups.has(row.dataset.groupId);row.classList.toggle('pronunciation-span-active',active);
    if(active)row.setAttribute('aria-current','true');else row.removeAttribute('aria-current');
  }
  const status=$('pronunciation-follow-status');
  status.dataset.event=activeInstrumentEvent?.id??'';status.dataset.followWord=activeInstrumentEvent?.wordId??'';
  status.dataset.followStatus=error?'review-needed':report?.status??(activeInstrumentEvent?'loading':'idle');
  if(readerSource?.kind==='published-word'){status.dataset.followStatus='published-word-only';status.textContent='Published Tiberian text follows whole words. Syllable and note highlighting is unassigned for this source; the instrument and recordings keep their own pronunciation and melody.';return;}
  status.dataset.followWords=JSON.stringify(report?.wordIds??(report?.wordId?[report.wordId]:[]));
  if(report?.status==='common-written-span'){
    status.textContent=`${readerSource.kind==='phonemic-research'?readerSource.name:pronunciationTools.scoreStatus().name} · complete shared Hebrew span. All source syllables in each displayed alternative follow together; individual note allocation and acoustic timing remain unassigned.`;
    for(const path of report.paths){
      const line=document.createElement('p');line.dataset.groupId=path.groupId;line.dataset.followEvent=report.eventId;
      const hebrew=document.createElement('span');hebrew.lang='he';hebrew.dir='rtl';hebrew.textContent=path.hebrew;line.append(hebrew,document.createTextNode(' → '));
      const text=document.createElement('span');text.lang=report.profileId?'und-fonipa':'en';text.dir='ltr';text.textContent=path.sourceUnits.map(u=>u.text).join(' · ');line.append(text);
      const scope=document.createElement('small');scope.textContent=`${path.scoreSyllables.length} score / ${path.sourceUnits.length} source syllables · row ${path.sourceRow}, column ${path.sourceColumn}${path.hebrewColumn?' · Hebrew branch '+path.hebrewColumn:''} · whole span only`;line.append(scope);spanContent.append(line);
    }
    return;
  }
  if(report?.status==='source-reading-group'){status.textContent=`${readerSource.name} · shared source syllable ${report.hebrew} · both displayed words together. Individual word ownership, written syllable ranges, sung phones and acoustic timing remain unassigned.`;return;}
  if(report?.status==='source-reading-word'){status.textContent=`${readerSource.name} · source reading ${report.hebrew} · word-level correspondence to the unchanged displayed Hebrew. Source text follows the instrument; written syllable ranges, sung phones and acoustic timing remain unassigned.`;return;}
  if(readerSource?.kind==='phonemic-research'&&report?.status==='exact-written-span'){status.textContent=`${readerSource.name} · ${report.hebrew} · existing exact source-syllable correspondence. Research text follows the instrument; candidate sounds, shared consonants and silences have no assigned acoustic timing or singing voice.`;return;}
  if(model.profile.wordOnly){status.textContent='Idelsohn No268 highlights whole-word correspondence candidates. Pronunciation syllables and acoustic timing are unassigned; independent pronunciation text stays in the reader.';return;}
  status.textContent=error?`Pronunciation highlighting unavailable: ${error}`:!activeInstrumentEvent?hint:!report?'Loading source syllable correspondence…':report.status==='exact-written-span'?`${pronunciationTools.scoreStatus().name} · ${report.hebrew} → ${[...new Set(report.units.map(u=>u.text))].join(' / ')} · exact written-span match. Text follows the instrument; no sung syllable is implied.`:`${report.hebrew} · ${NOTE_LINK_REASONS[report.reason]} No pronunciation syllable is highlighted.`;
}
function setActive(wordId,eventId){
  if(!eventId)activeInstrumentEvent=null;
  const ids=Array.isArray(wordId)?wordId:wordId?[wordId]:[],key=ids.join('\u0000');
  if(key!==activeId){activeId=key;activeWordIds=ids;document.querySelectorAll('[data-word]').forEach(el=>el.classList.toggle('active',ids.some(id=>marksWord(el,id))));}
  if(eventId!==activeEventId){activeEventId=eventId;document.querySelectorAll('[data-event]').forEach(el=>el.classList.toggle('active',el.dataset.event===eventId));}
  renderPronunciationFollow();
}
function stop(message='Stopped. Your selection is kept.',{preservePattern=false,preserveVoiceStudy=false,preserveHaftarah=false}={}){
  syllableTimingTools?.cancelLoading();recordingGroupTimingTools?.cancelLoading();if(!preserveHaftarah)haftarahTools?.stop();
  if(!$('chant-pitch-cancel').hidden)$('chant-pitch-status').textContent='Preparation stopped. Original recordings are unchanged.';
  $('measured-tone-window').textContent='';
  $('chant-pitch-cancel').hidden=true;recordedPracticeRunning=false;chantPlayRequest++;pronunciationTools?.showWord(words[state.cursor]);
  if(!preservePattern)patternTools?.stop();
  if(!preserveVoiceStudy)voiceStudyTools?.stop();
  referenceLoadJob?.abort();player.stop();if(referencePlayer.running||referencePlayer.starting)$('reference-status').textContent='Reference stopped. Your selection is kept.';referencePlayer.stop();$('wav-preview').pause();setActive(null,null);$('progress').style.width='0%';say(message);transportLabel(false);
}
async function play(){
  haftarahTools?.stop();
  if(isSourcePractice())return playChantPractice();
  patternTools?.stop();
  voiceStudyTools?.stop();
  referencePlayer.stop();$('reference-status').textContent='';$('wav-preview').pause();
  playingBounds=bounds(state.cursor,state.anchor,state.scope);if(!renderSequence()){stop($('musical-source-status').textContent);return;}
  $('status').setAttribute('aria-live','off');transportLabel(true);player.setVolume(state.volume/100);
  try{await player.play(plan,state.repeat);}catch(error){stop(`Audio unavailable: ${error.message}`);}
}
function selectWord(index,extend=false){
  stop('Ready to listen.');
  if(extend||chooseEnd){state.cursor=index;state.scope='selection';chooseEnd=false;}
  else{if(index!==state.cursor)state.printedSyllableIndex=1;state.cursor=index;state.anchor=index;}
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
function wordButton(w,plain,piece=null){
  const linked=piece?.words??[w],end=linked.at(-1);
  const b=document.createElement('button');b.className=`word group-${w.group%2?'odd':'even'}${end.groupEnd?' group-end':''}${w.kind==='q'?' qere-word':''}`;
  b.dataset.word=w.id;b.dataset.index=w.index;b.dataset.signClass=w.signAnalysis.className??'';setWordText(b,w,plain);b.lang='he';b.dir='rtl';
  if(piece){
    b.textContent=piece.written;b.dataset.linkedWords=linked.map(word=>word.id).join(' ');b.dataset.endIndex=end.index;b.dataset.signClass=writtenUnitClass(linked);
    if(piece.letterSizes?.length){
      b.replaceChildren();let offset=0;
      for(const size of piece.letterSizes){b.append(document.createTextNode(piece.written.slice(offset,size.index)));const span=document.createElement('span');span.className=`source-letter-${size.size}`;span.textContent=piece.written[size.index];b.append(span);offset=size.index+1;}
      b.append(document.createTextNode(piece.written.slice(offset)));
    }
  }
  const position=linked.length>1?`words ${w.ordinal}–${end.ordinal}`:`word ${w.ordinal}`;
  const classes=linked.length>1?'Written unit · separate reading-word classes in the pointed pane':sourceClassLabel(b.dataset.signClass);
  b.title=`${w.reference}, ${position} · ${linked.map(word=>word.accent).join(' / ')} · ${classes}`;b.setAttribute('aria-label',`${b.textContent}, ${w.reference}, ${position}${piece?.variant?', written variant':''}`);
  b.addEventListener('click',e=>{
    if(e.shiftKey||chooseEnd||linked.length===1){selectWord((e.shiftKey||chooseEnd)?end.index:w.index,e.shiftKey);return;}
    stop('Written unit selected with its corresponding reading words.');state.cursor=w.index;state.anchor=end.index;state.scope='selection';state.readerPage=Math.floor(w.verseIndex/VERSE_PAGE);state.notePage=0;state.staffPage=0;render();
  });
  b.addEventListener('dblclick',()=>{state.cursor=w.index;state.anchor=end.index;state.scope=linked.length>1?'selection':'word';state.notePage=0;render();play();});
  b.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
      e.preventDefault();const i=Math.max(0,Math.min(words.length-1,(e.key==='ArrowLeft'?end.index+1:w.index-1)));selectWord(i,e.shiftKey);
      [...document.querySelectorAll('[data-word]')].find(el=>marksWord(el,words[i].id))?.focus();
    }
  });return b;
}
function renderReader(){
  $('reader').replaceChildren();$('reader').classList.toggle('guides',state.groups);$('reader').classList.toggle('sign-classes',state.signClasses);$('class-guide').hidden=!state.signClasses;
  const pages=Math.ceil(passage.verses.length/VERSE_PAGE);state.readerPage=Math.min(state.readerPage,pages-1);
  const first=state.readerPage*VERSE_PAGE,last=Math.min(first+VERSE_PAGE,passage.verses.length);
  const torahReading=isTorahReading(passage.ranges),useScroll=!!scrollLayout&&torahReading&&state.scrollLayout&&state.view!=='pointed';
  let pointedTarget=$('reader');
  if(state.view==='parallel'){
    const headings=document.createElement('div');headings.className='parallel-headings';headings.innerHTML=useScroll?'<span>Written scroll letters</span><span>Pointed UXLC source</span>':'<span>Consonantal practice</span><span>Pointed source</span>';$('reader').append(headings);
  }
  if(useScroll){
    const visible=words.filter(w=>w.verseIndex>=first&&w.verseIndex<last),rows=scrollLayout.excerpt(visible);
    const pane=scrollPane(rows,{makeButton:piece=>wordButton(piece.words[0],true,piece)});
    if(state.view==='parallel'){
      const pair=document.createElement('div');pair.className='source-parallel';pointedTarget=document.createElement('div');pointedTarget.className='pointed-source-pane';pair.append(pane,pointedTarget);$('reader').append(pair);
    }else $('reader').append(pane);
  }
  for(let verseIndex=first;verseIndex<last&&(!useScroll||state.view==='parallel');verseIndex++){
    const verse=passage.verses[verseIndex],row=document.createElement('div');row.className='verse';
    const number=document.createElement('span');number.className='verse-number';number.textContent=`${verse.chapter??1}:${verse.number}`;number.title=verse.reference;row.append(number);
    const lines=document.createElement('div');if(state.view==='parallel'&&!useScroll)lines.className='parallel-lines';
    for(const plain of useScroll?[false]:state.view==='parallel'?[true,false]:[state.view==='consonantal']){
      const line=document.createElement('div');line.className='hebrew-line';line.lang='he';line.dir='rtl';
      for(const word of words.filter(w=>w.verseIndex===verseIndex))line.append(wordButton(word,plain),document.createTextNode(' '));
      lines.append(line);
    }
    row.append(lines);pointedTarget.append(row);
  }
  const note=document.createElement('p');note.className='layout-note';note.textContent='Group guides: major practice divisions only. '+(useScroll?'Line/gap positions follow the cited 245-column layout; written letters remain UXLC. Edition differences and excerpted lines are labeled. Shlomo Stam is a typeset scribal font; widths are approximate and scrolls vary.':torahReading&&state.scrollLayout&&state.view==='pointed'?'Choose Consonantal or Side by side to see the sourced written scroll lines. Source marks stay unchanged.':state.view==='pointed'?'Source marks are preserved verbatim.':'Consonantal practice follows the preferred reading. Written/read alternatives remain separate below; these responsive lines are not a scroll facsimile.');$('reader').append(note);
  $('reader-page-label').textContent=`Verses ${first+1}–${last} of ${passage.verses.length}`;
  $('reader-previous').disabled=state.readerPage===0;$('reader-next').disabled=state.readerPage===pages-1;
  renderAlternatives(passage.verses.slice(first,last));
  updateSelection();
  renderReaderPronunciation();
}
function renderReaderPronunciation(){
  $('reader').querySelectorAll('.reader-source-group').forEach(el=>el.remove());
  const buttons=[...$('reader').querySelectorAll('.hebrew-line .word')],source=pronunciationTools?.readerStatus(),counts={linked:0,sourceForm:0,combined:0,unassigned:0,review:0},seen=new Set();
  for(const [index,button] of buttons.entries()){
    const word=words[Number(button.dataset.index)];
    const oldId=button.dataset.pronunciationDescription;
    const described=(button.getAttribute('aria-describedby')??'').split(/\s+/).filter(id=>id&&id!==oldId);
    if(!readerPronunciation){
      const wrapper=button.closest('.pronunciation-word');if(wrapper)wrapper.replaceWith(button);
      if(described.length)button.setAttribute('aria-describedby',described.join(' '));else button.removeAttribute('aria-describedby');
      delete button.dataset.pronunciationDescription;continue;
    }
    let wrapper=button.closest('.pronunciation-word');
    if(!wrapper){wrapper=document.createElement('span');wrapper.className='pronunciation-word';button.replaceWith(wrapper);wrapper.append(button);}
    let label=wrapper.querySelector('.reader-word-pronunciation');
    if(!label){label=document.createElement('span');wrapper.append(label);}
    label.id=`reader-pronunciation-${index}-${word.id}`;label.className='reader-word-pronunciation';
    button.dataset.pronunciationDescription=label.id;button.setAttribute('aria-describedby',[...described,label.id].join(' '));
    try{
      const report=pronunciationTools?.readerText(word);
      if(report){
        appendReaderPronunciation(label,report);
        if(word.sourceJointGroup&&report.status==='combined-source-form'){label.textContent='Shared source reading below';label.title='This source pronunciation belongs jointly to the complete group of written words. No individual syllable owner is assigned.';}
        if(!seen.has(word.id)){seen.add(word.id);if(report.status==='word-linked'){counts.linked++;counts.sourceForm+=report.entries.some(e=>e.sourceForm);}else counts[report.status==='combined-source-form'?'combined':'unassigned']++;}
      }else{label.textContent=source?.error?'Source text unavailable':'Loading source text…';label.lang='en';label.dir='ltr';}
    }catch(error){label.textContent='Source link needs review';label.title=error.message;label.lang='en';label.dir='ltr';if(!seen.has(word.id)){seen.add(word.id);counts.review++;}}
  }
  if(readerPronunciation)for(const group of model.sourceJointGroups??[]){
    if(!group.wordIds.every(id=>buttons.some(b=>marksWord(b,id))))continue;
    const panel=document.createElement('section');panel.className='reader-source-group';panel.dataset.jointGroup=group.id;panel.lang='en';panel.dir='ltr';
    const title=document.createElement('h4'),first=words[group.navigationWordIndex],last=words[group.wordIndices.at(-1)];title.textContent=`Shared source pronunciation · ${first.reference}, words ${first.ordinal}–${last.ordinal}`;
    const hebrew=document.createElement('p');hebrew.lang='he';hebrew.dir='rtl';hebrew.textContent=group.readerHebrew.join(' ');
    const text=document.createElement('div');try{const report=pronunciationTools?.readerGroup(group,words);if(report)appendReaderPronunciation(text,report);else text.textContent=source?.kind==='published-word'?'No joint text in this published transcription.':'Preparing the shared source text…';}catch(error){text.textContent='Shared source link needs review';text.title=error.message;}
    const note=document.createElement('p');note.className='muted';note.textContent='One complete source pronunciation word; every syllable corresponds to both written words together. The displayed Hebrew and accents are unchanged. Individual word ownership and acoustic timing remain unassigned.';
    const select=document.createElement('button');select.textContent='Select complete shared source word';select.addEventListener('click',()=>{stop('Complete shared source word selected.');state.cursor=group.wordIndices[0];state.anchor=group.wordIndices.at(-1);state.scope='source-unit';state.notePage=0;state.staffPage=0;render();});
    panel.append(title,hebrew,text,note,select);(buttons.find(b=>marksWord(b,group.wordIds[0]))?.closest('.verse')??$('reader')).append(panel);
  }
  $('reader-pronunciation-status').textContent=!readerPronunciation?'Pronunciation text under the words is hidden.':!buttons.length?'Choose Pointed or Side by side to see pronunciation text with the preferred reading. Written scroll letters keep their separate source.':source?.error?source.error:!seen.size?'Loading local pronunciation text…':`${source.name} · ${counts.linked} word-linked on this page${counts.sourceForm?`, including ${counts.sourceForm} source reading forms`:''}; ${counts.combined} combined and ${counts.unassigned} without individual source text${counts.review?`; ${counts.review} links need review`:''}. ${source.kind==='phonemic-research'?'Research phonemic candidates: ? unresolved, ∅ source silence, (∅) proposed consonant loss, ↔ one shared consonant event. Dots and bold preserve source syllables and stress; linguistic review, voice and sound timing remain unassigned.':'Stress and alternatives follow the source; linguistic review is pending.'} Recordings retain their original pronunciation.`;
  renderPronunciationFollow();
}
function renderAlternatives(verses){
  const groups=sourceAlternatives(verses,words),target=$('written-reading-rows');target.replaceChildren();
  $('written-reading-count').textContent=`${groups.length} group${groups.length===1?'':'s'} on this page`;
  for(const group of groups){
    const row=document.createElement('section');row.className='source-alternative';row.dataset.alternative=group.id;
    const heading=document.createElement('h4');heading.textContent=group.reference;
    if(passage.ranges.length>1)heading.textContent+=` · section ${passage.ranges.findIndex(range=>range.id===group.sectionId)+1}`;
    const written=document.createElement('div'),reading=document.createElement('div');
    for(const [line,title] of [[written,'Written source'],[reading,'Preferred reading']]){const label=document.createElement('p');label.className='alternative-label';label.textContent=title;line.append(label);}
    const writtenWords=document.createElement('div');writtenWords.lang='he';writtenWords.dir='rtl';writtenWords.className='alternative-hebrew';
    for(const token of group.written){const span=document.createElement('span');span.dataset.sourceToken=token.id;setWordText(span,token,false);writtenWords.append(span,document.createTextNode(' '));}
    if(group.written.length)written.append(writtenWords);
    else{const empty=document.createElement('p');empty.className='muted';empty.textContent='No written counterpart in this source.';written.append(empty);}
    const readingWords=document.createElement('div');readingWords.lang='he';readingWords.dir='rtl';readingWords.className='alternative-hebrew';
    for(const {token,word} of group.reading){const element=word?wordButton(word,false):document.createElement('span');if(!word)setWordText(element,token,false);readingWords.append(element,document.createTextNode(' '));}
    if(group.reading.length)reading.append(readingWords);
    else{const empty=document.createElement('p');empty.className='muted';empty.textContent='Written only; no preferred-reading word or playback target.';reading.append(empty);}
    const pair=document.createElement('div');pair.className='alternative-pair';pair.append(written,reading);
    const note=document.createElement('p');note.className='muted';note.textContent=group.status==='ketiv-qere'?'The source groups these written/read alternatives. Word and syllable correspondence is not inferred.':group.status==='written-only'?'This source token is retained separately from the reading sequence.':'This reading token is retained without inventing a written form.';
    row.append(heading,pair,note);target.append(row);
  }
  if(!groups.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='No written/read alternative groups in the displayed verses.';target.append(empty);}
}
function updateSelection(){
  const [start,end]=bounds(state.cursor,state.anchor,state.scope);
  document.querySelectorAll('[data-word]').forEach(el=>{
    const i=Number(el.dataset.index),last=Number(el.dataset.endIndex??i),selected=last>=start&&i<=end;el.classList.toggle('selected',selected);el.classList.toggle('cursor',i<=state.cursor&&last>=state.cursor);
    el.classList.toggle('active',activeWordIds.some(id=>marksWord(el,id)));el.setAttribute('aria-pressed',String(selected));
    el.classList.toggle('reference-active',referenceActiveIds.some(id=>marksWord(el,id)));
  });
  $('selection-label').textContent=state.scope==='selection'?`Selected ${fullLabel(start)} to ${fullLabel(end)}`:`Cursor: ${fullLabel(state.cursor)}`;
  $('span-preview').textContent=`${fullLabel(start)} to ${fullLabel(end)} · ${end-start+1} word${end>start?'s':''}`+(state.scope==='source-unit'&&words[state.cursor].sourceJointGroup?' · complete shared pronunciation word; both written words play together'+(start<state.cursor?' including the word before the cursor':''):'');
  $('compact-span').textContent=state.scope==='printed-syllable'?`${words[start].bookName} ${words[start].chapter}:${words[start].verse} · printed syllable ${state.printedSyllableIndex}`:`${words[start].bookName} ${words[start].chapter}:${words[start].verse} · ${end-start+1} words`;
  $('end-selection').setAttribute('aria-pressed',String(chooseEnd));$('end-selection').textContent=chooseEnd?'Click the last word':'Choose span end';
  const w=words[state.cursor];$('current-word').textContent=w.sourceHebrew;$('current-reference').textContent=`${w.reference} · word ${w.ordinal}`;
  $('accent-name').textContent=w.accent;$('group-name').textContent=`Practice group ${w.group+1} · ${w.sourceWordId??w.id}`;
  $('source-variant').textContent=w.kind==='q'?`Reading form (qere). ${(w.writtenVariants||[]).length?`Source written group: ${w.writtenVariants.map(t=>t.sourceHebrew).join(' ')}. Word/syllable correspondence is not inferred.`:'No written counterpart in this source.'}`:'';
  const locations=isTorahReading(passage.ranges)?scrollLayout?.locations(w)??[]:[];
  $('source-layout-detail').textContent=locations.length?locations.map(({row,piece})=>`Layout column ${row.page}, line ${row.line}${piece.variant?' · written variant':''}${piece.status!=='exact'?` · ${piece.status}: layout ${piece.layoutSource}, UXLC written ${piece.written}`:''}`).join('; '):'';
  $('alignment-status').textContent=w.sourceSyllableUnderlay?w.sourceSyllableUnderlay.status==='available'?w.sourceSyllableUnderlay.alignmentLevel==='source-reading-word'?`${w.syllables.length} source reading syllables · ${w.sourceSyllableUnderlay.sourceReadingHebrew} · word-level correspondence only; displayed Hebrew unchanged, written syllable ranges unassigned`:`${w.syllables.length} source syllables · exact written spans and stress agreed by both MAM text styles · review pending`:`Source syllable underlay unavailable: ${SOURCE_SYLLABLE_GAPS[w.sourceSyllableUnderlay.reason]}`:w.analysisStatus==='unsegmented'?'Syllable boundaries unresolved; word shown as one aligned unit.':`${w.syllables.length} draft syllables · ${w.analysisStatus==='draft-manual'?'manual fixture':'automatic analysis'} · not reader-reviewed`;
  if(w.sourceJointGroup)$('alignment-status').textContent=`${w.sourceJointGroup.syllables.length} shared source syllables · ${w.sourceJointGroup.sourceReadingHebrew} · complete group only; both written words together, no individual syllable allocation`;
  pronunciationTools?.showWord(w);
  renderSourceSigns(w);
  renderReference();
}
function syncReferencePickers(){
  const selected=referenceLibrary?.byId.get(selectedReferenceId);if(!selected)return;
  $('reference-portion').value=selected.partId;
  if($('reference-aliyah').dataset.part!==selected.partId){
    $('reference-aliyah').replaceChildren();
    for(const id of referenceLibrary.parts.find(p=>p.id===selected.partId).recordingIds){const record=referenceLibrary.byId.get(id),option=document.createElement('option');option.value=id;option.textContent=`Aliyah ${record.number}${referenceLibrary.timingPolicy(record).kind==='partial-original-windows'?' · partial word timings':record.status!=='aligned'?' · complete take only':''}`;$('reference-aliyah').append(option);}
    $('reference-aliyah').dataset.part=selected.partId;
  }
  $('reference-aliyah').value=selected.id;
  $('reference-title').textContent=selected.title;
  const timing=referenceLibrary.timingPolicy(selected);
  $('reference-timing-status').textContent=timing.kind==='partial-original-windows'?`${timing.eligibleWords} original word intervals available; ${timing.withheldWords} words touching ambiguous timestamps withheld. Selections crossing a withheld word cannot play. Raw timings/status are unchanged; acoustic review pending.`:selected.status==='aligned'?'Source word timings available · acoustic review pending':`Word timing needs review: ${selected.issues.map(i=>i.kind==='word-count'?`${i.sourceWords} source words / ${i.timings} timestamps`:'non-increasing timestamps').join('; ')}. Complete-recording playback is available without timed highlights.`;
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
  $('reference-volume').value=state.referenceVolume;$('reference-volume-value').textContent=`${state.referenceVolume}%`;referencePlayer.setVolume(state.referenceVolume/100);
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
function renderRecordingTimingGroups(){
  $('recording-group-controls').hidden=state.practiceAudio!=='recorded';
  $('recording-groups').checked=state.recordingTimingGroups;
  let group=null,message=recordingTimingGroupError??'Original recording timing groups are loading.';
  if(recordingTimingGroups){
    try{group=recordingTimingGroups.at(words,state.cursor);message=group?`${group.wordIds.length} words share one original ${group.startSeconds.toFixed(6)}–${group.endSeconds.toFixed(6)} second recording interval. Their individual word and syllable times are unassigned. Select the complete group to hear it together.`:'No complete ambiguous recording timing group at this cursor in the open section. Ordinary word timings keep their existing availability; a clipped group stays unavailable. Open the complete source reading if the group extends beyond this section.';}
    catch(error){message=error.message;}
  }
  $('recording-group-status').textContent=message;
  $('recording-group-select').disabled=!state.recordingTimingGroups||!group;
}
function selectedChantPlan(){
  if(state.scope==='printed-syllable')throw Error('Printed source syllables are an instrumental notation study. Choose a word, verse or other source-timed scope for the original recording. No recorded syllable times are assigned.');
  const limits=bounds(state.cursor,state.anchor,state.scope);
  if(state.practiceAudio==='recorded'&&state.recordingTimingGroups){
    if(!recordingTimingGroups)throw Error(recordingTimingGroupError??'Complete recording timing groups are loading.');
    return recordingTimingGroups.plan(words,...limits,{allowTimingGroups:true});
  }
  return sourceTimedPracticePlan(referenceLibrary,words,...limits);
}
function chantPlanLabel(selected){
  return selected.groups?.length?`${selected.timedWords} source-timed words + ${selected.groupWords} words in ${selected.groups.length} complete recording timing group(s). Individual group-word times remain unassigned.`:`${selected.words} source-timed word${selected.words===1?'':'s'}`;
}
function renderChantPractice(){
  const generation=++chantGeneration,tones=state.practiceAudio==='measured';
  renderRecordingTimingGroups();
  $('chant-volume').value=state.referenceVolume;$('chant-volume-value').textContent=`${state.referenceVolume}%`;
  if(!isSourcePractice())return;
  $('chant-load').hidden=tones;$('chant-cancel').hidden=tones||!referenceLoadJob;
  document.querySelector('label[for="chant-pitch"]').textContent=tones?'Tone pitch':'Chant pitch';
  document.querySelector('label[for="chant-speed"]').textContent=tones?'Tone speed':'Chant speed';
  document.querySelector('label[for="chant-volume"]').textContent=tones?'Tone volume':'Chant volume';
  $('chant-pitch').querySelector('option[value="0"]').textContent=tones?'0 · measured source frequencies':'0 · original pitch';
  $('source-practice-note').textContent=tones?'Sine tones follow estimated frequencies in the PocketTorah performance. Unassigned measurement cells are muted; gaps do not establish original silence or rests. No note quantization, gap filling, singing voice, Kinnor preset or general melody grammar is supplied. Instrument melody/key/BPM/range and pronunciation text remain independent.':'PocketTorah’s original voice, melody and pronunciation. Chant speed preserves the selected pitch using your browser’s audio processing. Instrument melody/key/tempo/range remain separate. This recording does not synthesize the selected instrumental melody or a Kinnor Accent style.';
  $('chant-pitch-note').textContent=tones?'Each measured frequency is held for its original 10ms cell; 2ms run-edge fades reduce clicks. Tone pitch multiplies those frequencies without moving source word boundaries. Missing measurements and octave errors remain uncorrected. Preparation is cancellable.':'Optional processed recording, independent of the instrument key, chant speed and pronunciation text. Formant compensation is requested; processed pitch and vocal timbre are approximate and await review. Changing pitch stops playback; press Play to prepare it. Reference previews below keep original pitch.';
  const supported=tones?contourSupported():pitchProcessingSupported();$('chant-pitch').disabled=!supported;
  if(!supported)state.chantTranspose=0;$('chant-pitch').value=state.chantTranspose;
  $('measured-tone-details').hidden=!tones||!lastMeasuredTone;$('chant-pitch-details').hidden=tones||state.chantTranspose===0;
  if(tones){
    if(!referencePlayer.running&&!referencePlayer.starting)$('chant-pitch-status').textContent=supported?`Press Play to prepare measured sine tones at ${state.chantTranspose>0?'+':''}${state.chantTranspose} semitones. No original audio download is needed.`:'This browser lacks measured-tone rendering.';
  }else{
    if(state.chantTranspose===0)$('chant-pitch-status').textContent=supported?'Original pitch · original recording.':'This browser lacks recorded pitch processing. Original pitch remains available.';
    if(state.chantTranspose!==0&&!referencePlayer.running&&!referencePlayer.starting&&lastProcessedPitch?.semitones!==state.chantTranspose){$('chant-pitch-status').textContent=`Press Play to prepare ${state.chantTranspose>0?'+':''}${state.chantTranspose} semitones. Original recordings remain unchanged.`;$('chant-pitch-details').hidden=true;}
  }
  if(!referencePlayer.starting)$('chant-pitch-cancel').hidden=true;
  $('chant-speed').disabled=!referencePlayer.canPreservePitch;if(!referencePlayer.canPreservePitch)state.chantRate=100;$('chant-speed').value=state.chantRate;
  $('chant-speed-note').textContent=referencePlayer.canPreservePitch?'Percentage of source time, independent of instrument BPM and key. Pitch preservation is requested from the browser; processing can affect sound. Source word timings remain unchanged. Recording previews below always retain original speed.':'This browser lacks pitch-preserving speed control. Source practice uses100%.';
  chantPlan=null;chantReady=false;for(const id of ['play','compact-play','chant-load'])$(id).disabled=true;
  try{chantPlan=selectedChantPlan();}
  catch(error){$('chant-readiness').textContent=error.message;return;}
  const selected=chantPlan;
  if(tones){chantReady=supported;for(const id of ['play','compact-play'])$(id).disabled=!chantReady;$('chant-readiness').textContent=`${selected.words} source-timed word${selected.words===1?'':'s'} · ${selected.records.length} source measurement${selected.records.length===1?'':'s'}. ${supported?'Ready to prepare tones with Play. Measurement packets load locally or from this site; the portable build carries every packet.':'A browser with workers and gzip support is required.'} Estimated frequency and source-word acoustic review pending.`;return;}
  $('chant-readiness').textContent='Checking saved chant audio…';
  Promise.all(selected.records.map(record=>referenceStore.has(record))).then(available=>{
    if(generation!==chantGeneration||state.practiceAudio!=='recorded')return;
    const missing=selected.records.filter((_,i)=>!available[i]),bytes=missing.reduce((n,r)=>n+r.audio.bytes,0);chantReady=!missing.length;
    for(const id of ['play','compact-play'])$(id).disabled=!chantReady;
    $('chant-load').disabled=chantReady||!!referenceLoadJob;$('chant-load').textContent=missing.length?`Load chant audio · ${(bytes/1048576).toFixed(1)} MB`:'Chant audio ready';
    $('chant-readiness').textContent=`${chantPlanLabel(selected)} · ${selected.records.length} recording${selected.records.length===1?'':'s'}. ${referenceLoadJob?'Loading and verifying…':chantReady?'Ready for Play.':`${missing.length} recording${missing.length===1?'':'s'} to load.`} Acoustic review pending.`;
  }).catch(error=>{if(generation===chantGeneration)$('chant-readiness').textContent=error.message;});
}
async function playChantPractice(){
  stop(`Preparing the selected ${sourcePracticeName().toLowerCase()}.`);
  const request=++chantPlayRequest;let selected;
  try{selected=selectedChantPlan();
    if(state.practiceAudio!=='measured'&&!(await Promise.all(selected.records.map(r=>referenceStore.has(r)))).every(Boolean))throw Error('Load chant audio for this span first.');
  }catch(error){if(request===chantPlayRequest){say(error.message);renderChantPractice();}return;}
  if(request!==chantPlayRequest)return;
  playingBounds=bounds(state.cursor,state.anchor,state.scope);recordedPracticeRunning=true;
  try{referencePlayer.setRate(state.chantRate/100);}catch(error){recordedPracticeRunning=false;say(error.message);return;}
  referencePlayer.setVolume(state.referenceVolume/100);transportLabel(true);
  if(selected.segments)await referencePlayer.playSegments(selected.segments,state.repeat);
  else await referencePlayer.play(selected.rows,state.repeat);
}
function renderChantCoverage(){
  const coverage=chantCoverage(referenceLibrary);
  $('chant-coverage-summary').textContent=`${coverage.sourceTimedWords.toLocaleString()} of ${coverage.words.toLocaleString()} Torah words have structurally consistent source timings; ${coverage.reviewWords.toLocaleString()} words in ${coverage.gaps.length} takes await timing review. Five takes now expose ${coverage.gaps.reduce((n,g)=>n+g.sourceTimedWords,0).toLocaleString()} unchanged intervals outside ambiguous regions. No missing times are guessed.`;
  $('chant-coverage-summary').append(document.createTextNode(' An independent source-duration check withholds all16Genesis28:4words in both main source-audio modes; original source metadata is retained.'));
  $('joint-coverage-summary').textContent=`${JOINT_COVERAGE_SUMMARY.withChantAndPronunciation.toLocaleString()} words have both source-timed chanting and individual pronunciation units; ${JOINT_COVERAGE_SUMMARY.withChantAndWrittenRanges.toLocaleString()} also have exact written Hebrew ranges. Text styles keep their own evidence; the recording retains its original pronunciation. Independent review is pending.`;
  $('chant-gap-list').replaceChildren();
  for(const gap of coverage.gaps){
    const item=document.createElement('li'),button=document.createElement('button');button.textContent=`Open ${gap.title} · ${gap.reviewWords} withheld${gap.sourceTimedWords?` / ${gap.sourceTimedWords} original intervals available`:''}`;
    const openWord=id=>libraryAction(()=>{applyRanges([{id:'timing-review',...gap.coverage,label:gap.title}]);state.scope='word';state.cursor=words.findIndex(w=>(w.sourceWordId??w.id)===id);if(state.cursor<0)throw Error('The source word is outside this reading.');state.anchor=state.cursor;state.readerPage=Math.floor(words[state.cursor].verseIndex/VERSE_PAGE);render();});
    button.addEventListener('click',()=>libraryAction(()=>applyRanges([{id:'timing-review',...gap.coverage,label:gap.title}])));item.append(button);
    if(gap.firstAvailableWordId){const first=document.createElement('button');first.textContent=`Try first available word · ${gap.title}`;first.addEventListener('click',()=>openWord(gap.firstAvailableWordId));item.append(' ',first);}
    const blocked=document.createElement('button');blocked.textContent=`Inspect first withheld word · ${gap.title}`;blocked.addEventListener('click',()=>openWord(gap.firstWithheldWordId));item.append(' ',blocked);$('chant-gap-list').append(item);
  }
}
$('practice-audio').addEventListener('change',e=>{stop('Practice audio changed.');state.practiceAudio=practiceAudioMode(e.target.value);render();});
$('recording-groups').addEventListener('change',e=>{stop('Recording timing-group choice changed.');state.recordingTimingGroups=e.target.checked;persist();renderChantPractice();});
$('recording-group-select').addEventListener('click',()=>{
  try{
    const group=recordingTimingGroups?.at(words,state.cursor);
    if(state.practiceAudio!=='recorded'||!state.recordingTimingGroups||!group)throw Error('Enable complete recording timing groups and choose a complete group in this section.');
    stop('Complete recording timing group selected. Press Play when ready.');state.cursor=group.firstIndex;state.anchor=group.lastIndex;state.scope='selection';state.readerPage=Math.floor(words[state.cursor].verseIndex/VERSE_PAGE);state.notePage=0;state.staffPage=0;chooseEnd=false;render();$('reader').focus();
  }catch(error){$('recording-group-status').textContent=error.message;}
});
$('chant-load').addEventListener('click',()=>{if(chantPlan){stop('Loading chant audio.');loadReferenceRecords(chantPlan.records);}});
$('chant-cancel').addEventListener('click',()=>referenceLoadJob?.abort());
$('chant-pitch').addEventListener('change',e=>{stop('Source pitch changed. Press Play to prepare it.');state.chantTranspose=Number(e.target.value);persist();renderChantPractice();});
$('chant-pitch-cancel').addEventListener('click',()=>stop('Pitch preparation cancelled.'));
$('chant-speed').addEventListener('change',e=>{
  const percent=Number(e.target.value);
  try{if(recordedPracticeRunning)referencePlayer.setRate(percent/100);state.chantRate=percent;persist();if(recordedPracticeRunning){renderReferencePlaybackStatus(selectedReferenceId);say(`${sourcePracticeName()} · ${percent}% speed · ${chantPitchLabel()} · source timing.`);}}
  catch(error){e.target.value=state.chantRate;say(error.message);}
});
function renderSourceSigns(word){
  combinationTools?.showWord(word.index);
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
    const pitch=document.createElement('span');pitch.className='pitch';pitch.textContent=eventPitchName(e);
    const stem=document.createElement('span');stem.className='note-stem';stem.setAttribute('aria-hidden','true');
    const syllable=document.createElement('span');syllable.className='syllable';syllable.lang='he';syllable.dir='rtl';syllable.textContent=e.syllable;
    const length=document.createElement('span');length.className='length';length.textContent=`${beatLabel(e.beats)} beats`;chip.append(pitch,stem,syllable,length);chip.classList.toggle('active',e.id===activeEventId);$('note-ribbon').append(chip);
    const row=document.createElement('tr');row.dataset.event=e.id;row.classList.toggle('active',e.id===activeEventId);
    for(const [i,value] of [isJointEvent(e)?e.wordIds.join(' + '):e.wordId,e.sourceWordCorrespondence?'Unassigned · word candidate':e.syllable,eventPitchName(e),e.midi,e.startBeat.toFixed(2),beatLabel(e.beats),e.durationSeconds.toFixed(3)].entries()){
      const cell=document.createElement('td');cell.textContent=value;if(i===1){cell.lang='he';cell.dir='rtl';}row.append(cell);
    }$('event-rows').append(row);
  }
  $('note-page-label').textContent=plan.length?`Notes ${from+1}–${to} of ${plan.length}`:'No notes in this span';$('notes-previous').disabled=from===0;$('notes-next').disabled=to===plan.length;
}
function renderPrintedSyllableStudy(){
  const source=model.profile.id===IDELSOHN_SCORE.id?printedWordStudy(words[state.cursor]):null,box=$('printed-syllable-study');
  box.hidden=!source;$('scope').querySelector('option[value="printed-syllable"]').disabled=!source||state.practiceAudio!=='instrument';
  if(!source){$('printed-syllable-photo').replaceChildren();return;}
  state.printedSyllableIndex=Math.min(source.sourceSyllableCount,Math.max(1,state.printedSyllableIndex));
  const select=$('printed-syllable-index');select.replaceChildren();
  for(const unit of source.units){const option=document.createElement('option');option.value=unit.index;option.textContent=`Printed syllable ${unit.index} of ${source.sourceSyllableCount} · ${unit.noteIds.length} note${unit.noteIds.length===1?'':'s'}`;select.append(option);}
  select.value=state.printedSyllableIndex;select.disabled=state.practiceAudio!=='instrument';$('printed-syllable-select').disabled=state.practiceAudio!=='instrument';
  $('printed-syllable-word').textContent=`${words[state.cursor].reference} · word ${words[state.cursor].ordinal} · ${words[state.cursor].sourceHebrew}`;
  $('printed-syllable-photo').innerHTML=printedWordPhoto(words[state.cursor]);
  const untexted=model.events.filter(e=>e.wordId===words[state.cursor].id&&e.sourcePrintedSyllableIndex===null).length;
  $('printed-syllable-status').textContent=`${source.sourceSyllableCount} indexed syllables in the original Latin underlay. Select one to isolate its written notes${untexted?`; ${untexted} untexted small note stays outside these groups`:''}. Hebrew/MAM syllable fitting, phonetic transcription and a singing voice remain unassigned.`;
}
function renderPrintedSyllableFollow(){
  const e=activeEventId?activeInstrumentEvent:null;
  $('printed-syllable-follow').textContent=!e||e.sourceProfile!==IDELSOHN_SCORE.id?'':e.sourcePrintedSyllableIndex===null?'This small note has no printed syllable assignment.':`${words[e.wordIndex].reference} · word ${words[e.wordIndex].ordinal} · printed source syllable ${e.sourcePrintedSyllableIndex}. Original instrument timing; Hebrew/phoneme fitting unassigned.`;
}
function renderSequence(){
  renderPrintedSyllableStudy();
  let unavailable=null;
  try{if(state.scope==='source-unit'&&(!sourceSyllablesEnabled||!model.sourceSyllableUnderlay))throw Error('Whole source pronunciation word requires source syllable underlay in the original instrumental demonstration. Choose another scope for this mode.');plan=buildPlan(...bounds(state.cursor,state.anchor,state.scope),{...state,smallNoteDemo,smallEighthDemo,printedSyllableIndex:state.scope==='printed-syllable'?state.printedSyllableIndex:null});}catch(error){plan=[];unavailable=error.message;}
  for(const id of ['download','prepare-musicxml','prepare-midi'])$(id).disabled=!!unavailable;
  for(const id of ['play','compact-play'])$(id).disabled=isSourcePractice()?!chantReady:!!unavailable;
  $('musical-source-status').textContent=unavailable??(model.sourceSyllableUnderlay?model.sourceSyllableUnderlay.sourceReadingWords?'Original instrumental demonstration with consensus source syllables and documented source readings. Differing readings have word-level correspondence; displayed Hebrew and accents are unchanged, with no invented written syllable ranges.':SOURCE_SYLLABLE_UNDERLAY.summary:null)??model.profile.summary??(model.profile.id===BAER_SCORE.id?'Printed Genesis 1:1–5 · Baer [1894], No. 939 · source transcription, review pending · six unspecified fermatas · regularized recitative timing.':model.profile.id===PRINTED_SCORE.id?'Printed Genesis 22:1 · source transcription, review pending · printed rests/ties · regularized tempo · no added coda.':'Original demonstration · newly composed pitches; syllables unreviewed.');
  if(unavailable){
    $('event-count').textContent='No sourced notes for this span';renderNotes();renderStaff();updateExportSummary();
    $('range-report').textContent='Select a covered span to inspect its range.';return false;
  }
  const duration=validatePlan(plan);
  $('event-count').textContent=`${plan.length} events · ${duration.toFixed(2)} s`;renderNotes();renderStaff();updateExportSummary();
  const out=plan.filter(e=>e.midi<state.rangeLow||e.midi>state.rangeHigh).length;
  $('range-report').textContent=state.rangeLow>state.rangeHigh?'Lowest note must be below highest note.':`${out} of ${plan.length} notes outside ${noteName(state.rangeLow)}–${noteName(state.rangeHigh)}.`;
  return true;
}
function renderStaff(){
  state.staffPage=Math.min(state.staffPage,Math.max(0,Math.ceil(plan.length/STAFF_PAGE)-1));
  const from=state.staffPage*STAFF_PAGE,to=Math.min(from+STAFF_PAGE,plan.length);
  let linkError=null;scorePronunciationReport=null;
  if(scorePronunciation&&!model.profile.wordOnly)try{scorePronunciationReport=pronunciationTools?.linkNotes(plan.slice(from,to),words)??null;}catch(error){linkError=error.message;}
  const linkMap=scorePronunciationReport?new Map(scorePronunciationReport.links.map(l=>[l.eventId,l])):null;
  $('pitch-staff').innerHTML=staffMarkup(plan,words,from,STAFF_PAGE,{pronunciationLinks:linkMap});
  const source=pronunciationTools?.scoreStatus();
  const research=scorePronunciationReport?.kind==='phonemic-research';
  $('score-pronunciation-summary').textContent=!scorePronunciation?'Pronunciation text on the score is hidden. Hebrew and musical settings are kept.':linkError?`Score text links unavailable: ${linkError}`:source?.error?source.error:!scorePronunciationReport?'Loading pronunciation text for the score…':research?`${source.name} · ${scorePronunciationReport.counts.linkedNotes} of ${scorePronunciationReport.counts.notes} notes on this page reference the same source syllables; ${scorePronunciationReport.counts.unlinkedNotes} remain unlinked. ? unresolved, ∅ source silence, (∅) proposed loss, ↔ one shared consonant. These are phonemic research candidates; sound timing, singing voice and independent review remain unassigned.`:`${source.name} · ${scorePronunciationReport.counts.linkedNotes} of ${scorePronunciationReport.counts.notes} notes on this page have pronunciation text matching their Hebrew syllable; ${scorePronunciationReport.counts.unlinkedNotes} remain unlinked. Repeated notes can share one source unit. Independent underlay review is pending.`;
  $('score-pronunciation-download').disabled=!scorePronunciationReport?.links.length;
  const inspected=scorePronunciationReport?.links.find(l=>l.eventId===inspectedScoreEventId)??scorePronunciationReport?.links[0];
  $('score-pronunciation-detail').textContent=!inspected?'':inspected.status==='unlinked'?`${inspected.hebrew} · ${NOTE_LINK_REASONS[inspected.reason]}`:research?`${inspected.hebrew} · ${inspected.phonology.paths.map(p=>`${p.text} (source ${p.sourceText}; row ${p.sourceRow}, column ${p.sourceColumn}, Hebrew branch ${p.hebrewColumn})`).join(' / ')}. Exact source-unit note references; shared candidates are one abstract event. No acoustic delivery or repeated consonant is inferred from a melisma.`:`${inspected.hebrew} · ${inspected.units.map(u=>`${u.text} (source row ${u.sourceRow}, column ${u.sourceColumn}${u.labels.length?', '+u.labels.join('/') :''}${u.sharesNextConsonant?', shared consonant with next unit':''}${u.sharesPreviousConsonant?', shared consonant with previous unit':''})`).join(' / ')}. ${inspected.alignmentLevel==='source-reading-word'?'Source reading syllable with word-level correspondence; written syllable ranges remain unassigned':'Exact written-span correspondence'}; no phoneme or acoustic timing is assigned.`;
  if(scorePronunciationReport?.links.some(l=>l.alignmentLevel==='source-reading-word')){$('score-pronunciation-summary').textContent=`${source.name} · ${scorePronunciationReport.counts.linkedNotes} of ${scorePronunciationReport.counts.notes} notes on this page have source-unit text links. Different source reading forms have word-level correspondence with null written syllable ranges. ${research?'Incomplete phonemic research candidates; ':''}Linguistic review, acoustic timing and singing voice remain unassigned.`;$('score-pronunciation-detail').textContent+=' Source reading syllable; word correspondence only, no written-span assignment.';}
  if(scorePronunciationReport?.links.some(l=>l.status==='source-reading-group')){$('score-pronunciation-summary').textContent=`${source.name} · ${scorePronunciationReport.counts.linkedNotes} of ${scorePronunciationReport.counts.notes} notes have source-unit text links. Shared source syllables correspond to the complete group of displayed words; individual word ownership and written syllable ranges are null. ${research?'Incomplete research candidates; ':''}singing voice, acoustic timing and independent review remain pending.`;if(inspected?.status==='source-reading-group')$('score-pronunciation-detail').textContent=`${inspected.hebrew} · ${inspected.units.map(u=>u.text).join(' / ')} · complete shared source word. Both displayed words remain together; no individual word or written syllable allocation.`;}
  if(model.profile.wordOnly)$('score-pronunciation-summary').textContent='Whole Hebrew words indicate lexical source-word candidates only. Hebrew syllable and phoneme fitting are unassigned; printed Latin indices do not supply them. Choose pronunciation text independently in the reader.';
  scoreGroupReport=null;
  if(!model.profile.wordOnly)try{scoreGroupReport=pronunciationTools?.groupNotes(plan.filter(e=>e.wordId===words[state.cursor]?.id),words)??null;}catch(error){scoreGroupReport={error:error.message,words:[]};}
  renderPronunciationScoreGroups($('score-word-alignment-content'),scoreGroupReport,words[state.cursor]);
  if(model.profile.wordOnly)$('score-word-alignment-content').textContent='This printed score has candidate whole-word correspondence only. Hebrew syllable and pronunciation fitting remain unassigned; the reader keeps its independent pronunciation source.';
  $('score-word-alignment-download').disabled=!scoreGroupReport?.words.length;
  $('staff-page-label').textContent=plan.length?`Score notes ${from+1}–${to} of ${plan.length}`:'No score notes in this span';
  $('staff-previous').disabled=from===0;$('staff-next').disabled=to===plan.length;
  $('pitch-staff').querySelectorAll('[data-word-index]').forEach(el=>{
    el.classList.toggle('active',el.dataset.event===activeEventId);
    const activate=()=>{inspectedScoreEventId=el.dataset.event;if(el.dataset.jointGroup){stop('Complete shared source word selected from the score.');state.cursor=Number(el.dataset.wordIndex);state.anchor=words[state.cursor].sourceJointGroup.wordIndices.at(-1);state.scope='source-unit';render();}else selectWord(Number(el.dataset.wordIndex));};el.addEventListener('click',activate);
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
  });
}
function exportContext(){
  const [start,end]=bounds(state.cursor,state.anchor,state.scope);
  return {title:`${fullLabel(start)} to ${fullLabel(end)}`,melody:model.profile,instrument,signAnalysis:SIGN_ANALYSIS,pronunciation:{id:null,status:'not implemented'},
    ...(sourcePhraseTools?.matchSelection()?{sourcePhrase:sourcePhraseTools.matchSelection()}:{}),
    ...(plan.some(e=>e.sourceSmallNote)?{smallNoteStudy:{...SMALL_NOTE_STUDY}}:{}),
    ...(state.scope==='printed-syllable'?{printedSourceUnit:printedUnitContext(plan)}:{}),
    ...(model.profile.wordOnly?{wordCorrespondence:'lexical-source-word-candidate',syllableMapping:null,phonemes:null,independentReview:null}:{}),
    ...(plan.some(e=>e.sourceSmallEighth)?{smallEighthStudy:{...SMALL_EIGHTH_STUDY}}:{}),
    ...(model.sourceSyllableUnderlay?{syllableUnderlay:model.sourceSyllableUnderlay}:{}),
    ...(model.sourceJointGroups?.length?{sourceJointGroups:model.sourceJointGroups}:{}),
    textSource:{...passage,verses:undefined},vocalRange:{low:state.rangeLow,high:state.rangeHigh,mode:'advisory'},
    tempo:state.tempo,transpose:state.transpose,volume:state.volume};
}
function clearNoteEventExport(){$('note-events-save').hidden=true;$('note-events-save').removeAttribute('href');}
function clearExports(){
  wavJob?.abort();wavJob=null;
  $('wav-preview').pause();$('wav-preview').removeAttribute('src');$('wav-preview').hidden=true;
  clearNoteEventExport();
  for(const [id,url] of exportUrls){URL.revokeObjectURL(url);$(id).hidden=true;$(id).removeAttribute('href');}exportUrls.clear();
  $('export-status').textContent='';$('prepare-wav').disabled=false;$('cancel-wav').hidden=true;
}
function updateExportSummary(){
  const key=JSON.stringify([passage.ranges,bounds(state.cursor,state.anchor,state.scope),state.scope==='printed-syllable'?state.printedSyllableIndex:null,state.melodyId,!!model.profile.requiresSmallNoteTiming&&smallNoteDemo,!!model.profile.requiresSmallEighthTiming&&smallEighthDemo,model.sourceSyllableUnderlay?.id??null,model.sourceSyllableUnderlay?.availableWords??null,model.sourceSyllableUnderlay?.sourceReadingChoices??null,model.sourceSyllableUnderlay?.allowJointSources??false,state.tempo,state.transpose,state.volume,sourcePhraseTools?.matchSelection()?.id??null]);
  if(key!==exportsKey){clearExports();exportsKey=key;}
  try{
    const s=wavSummary(plan);
    const count=isPrintedScore(model.profile.id)?`${plan.length} printed components · ${soundingNotes(plan).length} sounding notes`:`${plan.length} notes`;
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
$('wav-preview').addEventListener('play',()=>{haftarahTools?.stop();voiceStudyTools?.stop();patternTools?.stop();player.stop();if(referencePlayer.running||referencePlayer.starting)$('reference-status').textContent='Reference stopped.';referencePlayer.stop();setActive(null,null);transportLabel(false);say('Playing the exported instrumental audio.');});
$('reference-play').addEventListener('click',async()=>{
  if(!referencePlan||!referenceReady)return;const selected=referencePlan;stop('Listening to the recorded reference.');
  referencePlayer.setRate(1);await referencePlayer.play(selected,state.repeat);
});
$('reference-full').addEventListener('click',async()=>{
  const id=selectedReferenceId;stop('Listening to the complete recording.');$('reference-word').textContent='';$('reference-word-label').textContent='Complete unmodified recording · timed word highlighting is off.';$('reference-source-comparison').textContent='The recording retains its original text, key, tempo and pronunciation.';
  referencePlayer.setRate(1);await referencePlayer.playWhole(id,state.repeat);
});
$('reference-stop').addEventListener('click',()=>stop());
$('reference-open').addEventListener('click',()=>libraryAction(()=>{
  const selected=referenceLibrary.byId.get(selectedReferenceId);applyRanges([{id:'recorded-reference',...selected.coverage,label:selected.title}]);
}));
$('reference-portion').addEventListener('change',e=>{const part=referenceLibrary.parts.find(p=>p.id===e.target.value);selectedReferenceId=part.recordingIds[0];renderReference({keepChoice:true});});
$('reference-aliyah').addEventListener('change',e=>{selectedReferenceId=e.target.value;renderReference({keepChoice:true});});
async function loadReferenceRecords(required){
  if(referenceLoadJob)return;const job=new AbortController();referenceLoadJob=job;renderChantPractice();$('reference-cancel-load').hidden=false;$('reference-load').disabled=true;
  try{
    await referenceStore.ready;
    const missing=[];for(const record of required)if(!await referenceStore.has(record))missing.push(record);
    if(!referenceStore.storageAvailable&&missing.length>3)throw Error('Device storage is unavailable. Load a smaller span of at most three recordings for this session.');
    for(const [i,record] of missing.entries()){
      $('reference-status').textContent=`Loading ${i+1} of ${missing.length}: ${record.title}…`;
      const result=await referenceStore.load(record,{signal:job.signal});
      if(!result.saved&&missing.length>3)throw Error('This browser could not save the recordings. Load a smaller span for this session.');
    }
    if(referenceLoadJob===job)$('reference-status').textContent='Recordings loaded and source checksums verified. Press Play when ready.';
  }catch(error){if(referenceLoadJob===job)$('reference-status').textContent=job.signal.aborted?'Reference loading cancelled. Completed recordings are kept.':error.message;}
  finally{if(referenceLoadJob===job){referenceLoadJob=null;$('reference-cancel-load').hidden=true;renderReference({keepChoice:true});renderChantPractice();if(state.practiceAudio==='recorded')say($('reference-status').textContent);}}
}
$('reference-load').addEventListener('click',()=>loadReferenceRecords(referenceRequired));
$('reference-cancel-load').addEventListener('click',()=>referenceLoadJob?.abort());
$('reference-remove').addEventListener('click',async()=>{const record=referenceLibrary.byId.get(selectedReferenceId);stop();await referenceStore.remove(record);$('reference-status').textContent=`Removed the saved copy of ${record.title}. You can load it again.`;renderReference({keepChoice:true});renderChantPractice();});
for(const id of ['reference-volume','chant-volume'])$(id).addEventListener('input',e=>{state.referenceVolume=Number(e.target.value);referencePlayer.setVolume(state.referenceVolume/100);for(const control of ['reference-volume','chant-volume'])$(control).value=state.referenceVolume;for(const output of ['reference-volume-value','chant-volume-value'])$(output).textContent=`${state.referenceVolume}%`;persist();});
function render(){
  for(const key of ['scope','tempo','transpose','volume'])$(key).value=state[key];
  for(const key of ['repeat','groups','sign-classes'])$(key).checked=state[key==='sign-classes'?'signClasses':key];$('follow-playback').checked=state.followPlayback;
  $('range-low').value=state.rangeLow;$('range-high').value=state.rangeHigh;
  $('tempo-value').textContent=`${state.tempo} BPM`;$('transpose-value').textContent=`${state.transpose>0?'+':''}${state.transpose} semitone${Math.abs(state.transpose)!==1?'s':''}`;$('volume-value').textContent=`${state.volume}%`;
  $('passage-title').textContent=passage.title;$('word-count').textContent=`${passage.verses.length} verse${passage.verses.length===1?'':'s'} · ${words.length} words`;
  const printed=isPrintedScore(model.profile.id),baer=model.profile.id===BAER_SCORE.id;
  $('musical-source').value=state.melodyId;$('melody-name').textContent=model.profile.name;
  $('printed-small-eighth-controls').hidden=!model.profile.requiresSmallEighthTiming;$('printed-small-eighth-demo').checked=smallEighthDemo;$('printed-small-eighth-demo').disabled=state.practiceAudio!=='instrument';
  $('printed-small-eighth-status').textContent=smallEighthDemo?'Original timing enabled: 80 ms added for each small C4 eighth. Measured notes and rests keep their written values. Source duration, role, slash and stealing ratio remain unassigned.':'Two printed small C4 eighths have no assigned duration or role. First six words play without them. The full passage requires this optional original timing study.';
  $('printed-small-note-controls').hidden=!model.profile.requiresSmallNoteTiming;$('printed-small-note-demo').checked=smallNoteDemo;$('printed-small-note-demo').disabled=state.practiceAudio!=='instrument';
  $('printed-small-note-status').textContent=smallNoteDemo?'Original written-pitch study enabled: 80 ms for the small quarter note, added between unchanged measured notes. The adjacent source mark is unresolved and not realized; historical interpretation, duration, fermata hold and musical review remain pending.':'This printed example contains a small quarter note with no assigned source duration and an unresolved adjacent mark. Enable the explicit original study to hear all written pitches; the mark remains unrealized. Other complete spans keep their measured notation.';
  $('scope').querySelector('option[value="source-unit"]').disabled=printed||!sourceSyllablesEnabled;
  $('source-syllables').checked=sourceSyllablesEnabled;$('source-syllables').disabled=printed;
  $('source-joint').checked=sourceJointEnabled;$('source-joint').disabled=printed||!sourceSyllablesEnabled||!sourceReadingsEnabled;
  $('source-joint-status').textContent=sourceJointEnabled&&sourceReadingsEnabled?'Shared source words enabled. Select the complete shared word or a span containing all its written words. Playback never splits a source syllable or silently extends an individual-word selection.':'Optional: keep a source pronunciation word shared by several written words together. Choose Whole source pronunciation word to select it explicitly.';
  $('source-readings').checked=sourceReadingsEnabled;$('source-readings').disabled=printed||!sourceSyllablesEnabled;
  for(const kind of ['qamats','cantillation']){$('source-choice-'+kind).value=sourceReadingChoices[kind]??'';$('source-choice-'+kind).disabled=printed||!sourceSyllablesEnabled;}
  $('source-choices-status').textContent=Object.values(sourceReadingChoices).some(v=>v!==null)?'Selected source text: '+Object.values(sourceReadingChoices).filter(Boolean).join(' · ')+'. Original Hebrew and accents are retained. Source syllables/stress may change the original demonstration notes. Pronunciation text style remains independent. All original alternatives remain in the evidence.':'Consensus only: conflicting source readings remain unavailable. Choose a documented source alternative to include it. These are text readings; historical musical realization and singing voices remain pending.';
  $('source-readings-status').textContent=!sourceReadingsEnabled?'Optional: include documented source readings with word-level correspondence. The displayed Hebrew keeps its original letters and accents.':`Source reading forms enabled. Different spellings retain null written syllable ranges; the staff identifies their source reading syllables. Pitches and timing remain an original instrumental demonstration.`;
  $('source-syllables-status').textContent=printed?'Printed scores use their printed syllable underlay.':!sourceSyllablesEnabled?'Use source syllables to compare the original motif with both pronunciation text styles.':sourceSyllableError?`Source syllables unavailable: ${sourceSyllableError}`:!sourceSyllableAdapter?'Preparing source syllables…':sourceReadingsEnabled?`${model.sourceSyllableUnderlay.availableWords} of ${words.length} words have source syllables, including ${model.sourceSyllableUnderlay.sourceReadingWords} documented source reading forms with word-level correspondence. ${model.sourceSyllableUnderlay.unavailableWords} remain unavailable.`:`${model.sourceSyllableUnderlay.availableWords} of ${words.length} words have consensus written syllables. ${model.sourceSyllableUnderlay.unavailableWords} remain unavailable. Source-only forms, combined words and conflicting paths keep their original evidence.`;
  if(!printed&&sourceSyllablesEnabled&&sourceSyllableAdapter&&sourceJointEnabled&&sourceReadingsEnabled)$('source-syllables-status').textContent=`${model.sourceSyllableUnderlay.availableWords} individually covered words plus ${model.sourceSyllableUnderlay.jointWordOccurrences} words in ${model.sourceSyllableUnderlay.jointGroups} shared source group(s). ${words.length-model.sourceSyllableUnderlay.coveredWords} without a playable source correspondence. Only complete shared groups can play.`;
  $('music-badge').textContent=printed?'Printed score study':'Instrumental demo';
  $('music-notice').textContent=printed?'A bounded transcription of the complete printed Genesis 22:1 example, all 13 words. Musical and Hebrew underlay review is pending. This is an instrumental study; no full tradition or singing voice is claimed.':'This original motif tests the practice workflow. It is not a historical cantillation melody. Syllable divisions are drafts awaiting review.';
  $('score-description').textContent=printed?'The staff, note list and exports use the same notes, rests and ties transcribed from Cohen’s 1902 printed Genesis 22:1 example. Hebrew underlay is a source-preserving draft.':'The staff, note list and exports use the playback sequence. This is the original instrumental demonstration with unreviewed Hebrew syllables.';
  if(model.sourceSyllableUnderlay?.sourceReadingWords){$('music-notice').textContent='Original instrumental motif. Documented source readings retain the complete displayed Hebrew and accents. Staff lyrics use the source reading syllables; written syllable ranges remain unassigned for those words. Pronunciation styles change text independently. Source durations, historical word fitting and a singing voice remain pending.';$('score-description').textContent='Staff and note list use the original instrumental sequence. Differing source reading forms are word-linked; their syllable text belongs to the source reading, not a segmentation of the displayed Hebrew.';}
  else if(model.sourceJointGroups?.length){$('music-notice').textContent='Original instrumental demonstration. Shared source pronunciation words retain all displayed Hebrew and accents together. No syllable is assigned to an individual written word; source timing, sung phones, historical musical fitting and a singing voice remain pending.';$('score-description').textContent='The shared source reading is one complete pronunciation word. Staff lyrics use its original source syllables and stress; all listed Hebrew words remain jointly linked, with no individual written syllable ranges.';}
  else if(model.sourceSyllableUnderlay){$('music-notice').textContent='This original instrumental motif uses exact written source syllables shared by both Phonetic MAM text styles. Pitches and tone durations are original demonstration choices. Linguistic and musical review is pending; phonemes and singing voice remain unassigned.';$('score-description').textContent='The staff, note list and exports share the original instrumental sequence and consensus source syllables. Original Hebrew, source stress, alternatives and shared consonant references are retained.';}
  if(state.practiceAudio==='recorded'){$('music-badge').textContent='Recorded chant';$('music-notice').textContent='PocketTorah chant follows the source word timings. The original performance keeps its own melody and pronunciation. Chant speed is independent of instrument BPM and key; chant pitch can process the source independently, and the browser is asked to preserve that pitch at the selected speed. Acoustic timing and processed sound review are pending.';$('score-description').textContent='Instrument score only; no pitches have been transcribed from the recording. '+$('score-description').textContent;}
  $('score-help').textContent=printed?'Click a note to go to its Hebrew word. Printed durations use a regular quarter-note beat here; the source calls for flexible timing. Ties hold one pitch without a new attack; rests clear the active highlight. The separately printed untexted coda is omitted.':'Click a note to go to its Hebrew word. Each accidental is explicit. The demo’s 0.6 and 0.9 beats use individual 5:3 quarter-note tuplets; lengths are also written below. Lines under the lyrics continue one syllable across several notes.';
  if(baer){
    $('music-notice').textContent=BAER_SCORE.description+' Independent transcription, musical and Hebrew underlay review is pending.';
    $('score-description').textContent='The staff, note list and exports use the same 145 source notes across Genesis 1:1–5. The two pronunciation text styles remain independent of these notes; differing source syllable divisions stay unlinked.';
    $('score-help').textContent='Click a note to go to its Hebrew word. '+BAER_SCORE.performanceNote+' Slurs keep distinct attacks; no ties or notes for other verses are inferred.';
    if(state.practiceAudio==='recorded'){$('music-notice').textContent='PocketTorah chant keeps its own original melody and pronunciation. The separate Baer instrumental study is not the recording’s melody.';$('score-description').textContent='Instrument score only; no pitches have been transcribed from the recording. '+$('score-description').textContent;}
  }
  if(model.profile.id===COHEN_PENITENTIAL.id){
    $('music-notice').textContent='Cohen’s penitential Genesis 22:1written-pitch study:49 measured notes and one small C5 quarter, with an unresolved adjacent mark. The optional original 80 ms small-note timing is not historical; the mark is not realized. All 13 Hebrew words/accents remain exact. No complete High Holiday system or singing voice.';
    $('score-description').textContent='The staff and exports retain the source pitches, printed rhythms, six rests, six slurs, three tuplets and one unspecified fermata. A question mark flags the unresolved source mark; inspect the original scan. Independent notation, underlay and musical review is pending.';
    $('score-help').textContent='The small printed quarter is shown at small size. Its optional80ms timing is an original study policy; no source duration or stealing ratio is assigned. MusicXML preserves it as an unmeasured grace element with the performance clock in metadata. The adjacent source mark remains unresolved/unrealized. Source fermata hold is unspecified; untexted coda omitted.';
    if(state.practiceAudio==='recorded'){$('music-notice').textContent='PocketTorah keeps its own recorded melody and pronunciation. The separate Cohen penitential written-pitch study is not this recording’s musical realization.';$('score-description').textContent='Instrument score only. '+$('score-description').textContent;}
  }
  if(model.profile.id===COHEN_PROPHETICAL.id){
    $('music-notice').textContent=COHEN_PROPHETICAL.description+' Independent transcription, musical and Hebrew underlay review remains pending.';
    $('score-description').textContent='The staff, note list and exports use the same 51 printed components of Cohen’s p. 547 hypothetical prophetical setting of Genesis 22:1. The original 13 Hebrew words/accents and both pronunciation text styles remain independent of these notes.';
    $('score-help').textContent='Click a note to go to its Hebrew word. '+COHEN_PROPHETICAL.performanceNote+' Ties hold one attack; slurs retain distinct attacks. '+COHEN_PROPHETICAL.evidenceNote;
    if(state.practiceAudio==='recorded'){$('music-notice').textContent='PocketTorah retains its own year-round Torah melody and pronunciation. The separate hypothetical prophetical instrument score is not this recording’s melody.';$('score-description').textContent='Instrument score only. '+$('score-description').textContent;}
  }
  if(model.profile.id===BAER_HIGH_HOLIDAY.id){
    $('music-notice').textContent=BAER_HIGH_HOLIDAY.description;
    $('score-description').textContent='The staff, note list and exports retain the same46printed notes and five rests of Genesis22:19. The unequal triplet and slur across two words keep their source identities. Pronunciation text styles remain independent; different underlay divisions stay unlinked.';
    $('score-help').textContent='Click a note to go to its Hebrew word. '+BAER_HIGH_HOLIDAY.performanceNote+' Printed lyric fragments je/l’ and ja/cha remain separate note annotations within their Hebrew syllables; no new phonemes are assigned.';
    if(state.practiceAudio==='recorded'){$('music-notice').textContent='PocketTorah retains its original year-round melody and pronunciation. The separate Baer High Holiday instrument score is not this recording’s melody.';$('score-description').textContent='Instrument score only. '+$('score-description').textContent;}
  }
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));
  $('scroll-layout').checked=state.scrollLayout;$('scroll-layout').disabled=!scrollLayout||!isTorahReading(passage.ranges);
  $('scroll-layout-status').textContent=isTorahReading(passage.ranges)?scrollMessage:'Sourced scroll layout covers Torah only. Your scroll-layout preference is kept for Torah readings.';
  $('reading-type-label').textContent=`${READING_TYPES.find(type=>type.id===state.readingType).label} · practice reader`;
  $('scope').querySelector('option[value="verse"]').textContent=passage.ranges.some(range=>range.divisionSource?.referenceMapping)?'End of UXLC verse record':'End of verse';
  $('haftarah-reader-link').hidden=state.readingType!=='haftarah';
  if(state.practiceAudio==='measured'){
    if(!printed&&sourceSyllablesEnabled&&sourceSyllableAdapter&&sourceJointEnabled&&sourceReadingsEnabled)$('source-syllables-status').textContent=`${model.sourceSyllableUnderlay.availableWords} individually covered words plus ${model.sourceSyllableUnderlay.jointWordOccurrences} words in ${model.sourceSyllableUnderlay.jointGroups} shared source group(s). ${words.length-model.sourceSyllableUnderlay.coveredWords} without a playable source correspondence. Only complete shared groups can play.`;
  $('music-badge').textContent='Measured tone reference';$('music-notice').textContent='Sine-tone approximation of estimated PocketTorah frequencies, with original source word timings. Unassigned cells are muted, without identifying rests or silence. No reviewed note/syllable transcription, singing voice or complete traditional melody grammar. Pronunciation text is independent.';
    $('score-description').textContent='Separate instrument score only; measured tones do not assign source frequencies to these notes or syllables. '+$('score-description').textContent;
  }
  $('practice-audio').value=state.practiceAudio;
  $('chant-practice').hidden=!isSourcePractice();
  renderReader();renderSequence();renderChantPractice();sourcePhraseTools?.refresh();sourceRecallTools?.refresh();persist();if(findWords!==words&&state.findScope==='reading')refreshSignSearch({reset:true});combinationTools?.readingChanged();patternTools?.refresh();sourcePitchTools?.refresh();syllableTimingTools?.refresh();recordingGroupTimingTools?.refresh();haftarahTools?.refresh();
}
function rememberReading(){
  const key=ranges=>JSON.stringify(ranges.map(r=>({bookId:r.bookId,start:r.start,end:r.end,hidden:r.hidden})));
  recent=[{title:passage.title,readingType:state.readingType,ranges:passage.ranges},...recent.filter(r=>r.ranges&&key(r.ranges)!==key(passage.ranges))].slice(0,8);store('tropetrain-recent-v1',recent);renderPickers();
}
function applyRanges(ranges,{remember=true,restoreCursor=null,readingType}={}){
  if(!corpus)throw Error('The reading library is still loading.');
  const nextType=readingType??readingTypeForRanges(ranges,corpus),checked=validateReadingSections(nextType,ranges,corpus);
  const nextPassage=corpus.passage(checked),nextModel=makeReadingModel(nextPassage,state);
  if(remember)restoringReading=false;
  stop('Reading opened. Ready to listen.');passage=nextPassage;model=nextModel;state.readingType=nextType;({words,bounds,buildPlan}=model);
  const formRange=passage.ranges.at(-1);syncReadingForm(nextType,formRange.bookId);
  for(const [id,value] of [['start-chapter',formRange.start.chapter],['start-verse',formRange.start.verse],['end-chapter',formRange.end.chapter],['end-verse',formRange.end.verse]])$(id).value=value;
  state.cursor=restoreCursor&&words[restoreCursor.cursor]?restoreCursor.cursor:0;state.anchor=restoreCursor&&words[restoreCursor.anchor]?restoreCursor.anchor:state.cursor;
  state.readerPage=Math.floor(words[state.cursor].verseIndex/VERSE_PAGE);state.notePage=0;state.staffPage=0;chooseEnd=false;render();renderSections();if(remember)rememberReading();
  const unresolved=words.filter(w=>w.analysisStatus==='unsegmented').length;
  $('library-message').textContent=`Opened ${passage.title}. ${unresolved?`${unresolved} word${unresolved===1?' has':'s have'} unresolved syllable boundaries. `:''}Syllables are unreviewed; the recorded reference is separate.`;
  if(passage.ranges.some(range=>range.divisionSource?.referenceMapping))$('library-message').textContent+=' Calendar and UXLC verse numbers differ here; inspect Source/UXLC verse numbering under Tutor assignments & sections.';
}
function updateBookLimits({reset=false}={}){
  const book=corpus?.byId.get($('book').value);if(!book)return;
  $('start-chapter').max=book.chapters.length;$('end-chapter').max=book.chapters.length;
  if(reset){$('start-chapter').value=1;$('start-verse').value=1;$('end-chapter').value=1;$('end-verse').value=Math.min(3,book.chapters[0].verses.length);}
}
function syncReadingForm(readingType,bookId){
  $('reading-type').value=readingType;
  const books=booksForReadingType(readingType,corpus),selected=bookId??$('book').value;
  $('book').replaceChildren();
  for(const book of books){const option=document.createElement('option');option.value=book.id;option.textContent=`${book.name} · ${book.hebrewName}`;$('book').append(option);}
  if(books.some(book=>book.id===selected))$('book').value=selected;
  updateBookLimits({reset:!bookId});updateReadingFormStatus();
}
function updateReadingFormStatus(){
  const type=READING_TYPES.find(type=>type.id===$('reading-type').value),sameType=type.id===state.readingType;
  $('append-section').disabled=!corpus||!sameType||passage.ranges.length>=type.limit;
  $('append-section').title=!sameType?'Open a passage of this reading type before adding sections.':passage.ranges.length>=type.limit?`This reading already has the maximum ${type.limit} sections.`:'';
  $('reading-form-note').textContent=`${type.label}: up to ${type.limit} ordered sections. ${sameType?'Add as section appends to the open reading.':'Open passage starts a separate reading of this type.'} This text choice adds no traditional melody or pronunciation.`;
  const active=READING_TYPES.find(type=>type.id===state.readingType);
  $('assignment-reading-type').textContent=`${active.label} · ${passage.ranges.length} of ${active.limit} sections`;
}
function rangeFromForm(){return {id:`section-${globalThis.crypto?.randomUUID?.()||Date.now()}`,bookId:$('book').value,
  start:{chapter:Number($('start-chapter').value),verse:Number($('start-verse').value)},end:{chapter:Number($('end-chapter').value),verse:Number($('end-verse').value)},label:`Section ${passage.ranges.length+1}`};}
function libraryAction(fn){try{fn();}catch(error){$('library-message').textContent=error.message;}}
function showPracticeRecovery(){
  $('practice-recovery').hidden=!practiceRecoveryRecord;
  if(practiceRecoveryRecord)$('practice-recovery-message').textContent=`${practiceRecoveryRecord.reason} The original saved practice record is retained for review; its source ranges were not substituted.`;
}
function retainPracticeRecovery(error){
  if(!originalPracticeText)return;
  practiceRecoveryRecord=practiceRecovery(originalPracticeText,error.message);
  let saved=false;try{saved=savePracticeRecovery(localStorage,practiceRecoveryRecord);}catch{}
  showPracticeRecovery();
  if(!saved)$('practice-recovery-message').textContent+=' Backup storage is unavailable. Export this recovery record before replacing the open practice state.';
}
function renderSections(){
  $('sections').replaceChildren();
  updateReadingFormStatus();
  for(const [index,range] of passage.ranges.entries()){
    const row=document.createElement('div');row.className='section-row';
    const check=document.createElement('input');check.type='checkbox';check.checked=!range.hidden;check.setAttribute('aria-label',`Show ${range.label||'section '+(index+1)}`);
    check.addEventListener('change',()=>libraryAction(()=>{try{applyRanges(passage.ranges.map(r=>r.id===range.id?{...r,hidden:!check.checked}:r),{remember:false});}finally{renderSections();}}));
    const title=document.createElement('span');title.textContent=`${range.label||`Section ${index+1}`} · ${corpus?corpus.describe(range):passage.title}`;
    const name=document.createElement('input');name.type='text';name.value=range.label;name.maxLength=120;name.className='section-name';name.setAttribute('aria-label',`Name of section ${index+1}`);
    name.addEventListener('change',()=>libraryAction(()=>applyRanges(passage.ranges.map(r=>r.id===range.id?{...r,label:name.value}:r),{remember:false,restoreCursor:{cursor:state.cursor,anchor:state.anchor}})));
    const jump=document.createElement('button');jump.textContent='Go to section';jump.disabled=!!range.hidden;jump.addEventListener('click',()=>{const i=words.findIndex(w=>w.sectionId===range.id);if(i>=0)selectWord(i);});
    row.append(check,title,name,jump);
    if(passage.ranges.length>1){
      for(const [direction,text] of [[-1,'Move earlier'],[1,'Move later']]){
        const move=document.createElement('button');move.textContent=text;move.disabled=index+direction<0||index+direction>=passage.ranges.length;move.setAttribute('aria-label',`${text}: ${range.label||'section '+(index+1)}`);
        move.addEventListener('click',()=>libraryAction(()=>applyRanges(reorderReadingSection(passage.ranges,range.id,direction))));row.append(move);
      }
      const remove=document.createElement('button');remove.textContent='Remove section';remove.addEventListener('click',()=>libraryAction(()=>applyRanges(passage.ranges.filter(r=>r.id!==range.id))));row.append(remove);
    }
    if(range.relatedSource)row.append(rangeSourceDetails(range.relatedSource));
    if(range.divisionSource?.referenceMapping)row.append(rangeNumberingDetails(range));
    $('sections').append(row);
  }
}
function rangeNumberingDetails(range){
  const mapping=range.divisionSource.referenceMapping,unit=mapping.sourceUnit,details=document.createElement('details');details.className='section-provenance';
  const summary=document.createElement('summary');summary.textContent='Source/UXLC verse numbering';details.append(summary);
  const source=document.createElement('p');source.textContent=`Hebcal source: ${unit.k} ${unit.b}–${unit.e} · ${mapping.sourceVerseCount} source verses.`;details.append(source);
  const target=document.createElement('p');target.textContent=`Reader: ${corpus.describe(range)} · ${mapping.uxlcVerseRecords} UXLC source records.`;details.append(target);
  const note=document.createElement('p');note.textContent='The explicit coordinate map preserves every UXLC word, mark and ID. Verse playback follows UXLC records. Upper/lower cantillation is not selected or musically realized by this map.';details.append(note);
  const link=document.createElement('a');link.href='#calendar-details';link.textContent='Numbering map, sources and license in calendar source details';details.append(link);return details;
}
function rangeSourceDetails(source){
  const details=document.createElement('details');details.className='section-provenance';
  const summary=document.createElement('summary');summary.textContent='Calendar reading source';details.append(summary);
  const context=document.createElement('p');context.textContent=`Hebcal.com · ${source.serviceName.en} · ${source.serviceDate} · ${source.region} · ${relatedDefinition(source.variant).label}`;details.append(context);
  if(source.serviceName.he){const hebrew=document.createElement('p');hebrew.lang='he';hebrew.dir='rtl';hebrew.className='source-service-hebrew';hebrew.textContent=source.serviceName.he;details.append(hebrew);}
  if(source.sourceSummary!==undefined){const citation=document.createElement('p');citation.textContent=`Source citation: ${source.sourceSummary}`;details.append(citation);}
  if(typeof source.serviceContext?.note==='string'){const note=document.createElement('p');note.textContent=source.serviceContext.note;details.append(note);}
  const list=document.createElement('ol');
  for(const [index,{key,unit}] of source.units.entries()){
    const entry=document.createElement('li');entry.textContent=`${unit.k} ${unit.b}–${unit.e} · ${unit.v} source verses · unit ${key}${index>=source.selection.first&&index<=source.selection.last?' · in this section':''}`;
    for(const field of ['reason','note'])if(typeof unit[field]==='string'){const note=document.createElement('p');note.textContent=unit[field];entry.append(note);}
    list.append(entry);
  }
  details.append(list);const hash=document.createElement('p');hash.textContent=`Retained response SHA-256: ${source.sha256}`;details.append(hash);
  const link=document.createElement('a');link.href=source.url;link.textContent='Original Hebcal response';link.target='_blank';link.rel='noopener noreferrer';details.append(link);return details;
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
  $(id).addEventListener('change',e=>{state[key]=Number(e.target.value);renderSequence();patternTools?.rangeChanged();persist();});
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;render();}));
$('groups').addEventListener('change',e=>{state.groups=e.target.checked;render();});
$('sign-classes').addEventListener('change',e=>{state.signClasses=e.target.checked;render();});
$('scroll-layout').addEventListener('change',e=>{state.scrollLayout=e.target.checked;render();});
for(const query of SIGN_QUERIES){const option=document.createElement('option');option.value=query.id;option.textContent=query.name;$('sign-query').append(option);}
for(const profile of melodyProfiles){const option=document.createElement('option');option.value=profile.id;option.textContent=profile.name;$('musical-source').append(option);}
$('printed-small-eighth-demo').addEventListener('change',()=>{stop('Small-eighth study changed.');smallEighthDemo=$('printed-small-eighth-demo').checked;store('tropetrain-no268-small-eighth-v1',{enabled:smallEighthDemo,policyId:SMALL_EIGHTH_STUDY.id});render();});
$('printed-small-note-demo').addEventListener('change',()=>{stop('Small-note study changed.');smallNoteDemo=$('printed-small-note-demo').checked;store('tropetrain-cohen-small-note-v1',{enabled:smallNoteDemo,policyId:SMALL_NOTE_STUDY.id});render();});
$('musical-source').addEventListener('change',e=>{
  stop('Musical source changed.');state.melodyId=e.target.value;model=makeReadingModel(passage,state);({words,bounds,buildPlan}=model);state.notePage=0;state.staffPage=0;render();
});
async function prepareSourceSyllables(){
 const request=++sourceSyllableRequest;sourceSyllableError=null;stop('Syllable underlay changed.');
 model=makeReadingModel(passage,state);({words,bounds,buildPlan}=model);state.notePage=0;state.staffPage=0;render();
 if(sourceSyllableAdapter&&(sourceSyllableAdapter.allowSourceReadings!==sourceReadingsEnabled||sourceSyllableAdapter.allowJointSources!==sourceJointEnabled||JSON.stringify(sourceSyllableAdapter.sourceReadingChoices)!==JSON.stringify(sourceReadingChoices))){sourceSyllableAdapter=new SourceSyllableUnderlay(sourceSyllableAdapter.library,{allowSourceReadings:sourceReadingsEnabled,sourceReadingChoices,allowJointSources:sourceJointEnabled});model=makeReadingModel(passage,state);({words,bounds,buildPlan}=model);render();}
 if(!sourceSyllablesEnabled||sourceSyllableAdapter)return;
 try{const library=await getPronunciationLibrary();sourceSyllableAdapter=new SourceSyllableUnderlay(library,{allowSourceReadings:sourceReadingsEnabled,sourceReadingChoices,allowJointSources:sourceJointEnabled});}
 catch(error){if(request===sourceSyllableRequest){sourceSyllableError=error.message;render();}return;}
 if(request!==sourceSyllableRequest||!sourceSyllablesEnabled||isPrintedScore(state.melodyId))return;
 stop('Source syllables ready. Press Play to hear the original instrumental demonstration.');model=makeReadingModel(passage,state);({words,bounds,buildPlan}=model);render();
}
for(const kind of ['qamats','cantillation'])$('source-choice-'+kind).addEventListener('change',()=>{sourceReadingChoices=readingChoices({...sourceReadingChoices,[kind]:$('source-choice-'+kind).value||null});store('tropetrain-source-syllables-v1',{enabled:sourceSyllablesEnabled,allowSourceReadings:sourceReadingsEnabled,sourceReadingChoices,allowJointSources:sourceJointEnabled});prepareSourceSyllables();});
$('source-joint').addEventListener('change',()=>{sourceJointEnabled=$('source-joint').checked;store('tropetrain-source-syllables-v1',{enabled:sourceSyllablesEnabled,allowSourceReadings:sourceReadingsEnabled,sourceReadingChoices,allowJointSources:sourceJointEnabled});prepareSourceSyllables();});
$('source-readings').addEventListener('change',()=>{sourceReadingsEnabled=$('source-readings').checked;try{localStorage.setItem('tropetrain-source-syllables-v1',JSON.stringify({enabled:sourceSyllablesEnabled,allowSourceReadings:sourceReadingsEnabled,sourceReadingChoices,allowJointSources:sourceJointEnabled}));}catch{}prepareSourceSyllables();});
$('source-syllables').addEventListener('change',()=>{sourceSyllablesEnabled=$('source-syllables').checked;try{localStorage.setItem('tropetrain-source-syllables-v1',JSON.stringify({enabled:sourceSyllablesEnabled,allowSourceReadings:sourceReadingsEnabled,sourceReadingChoices,allowJointSources:sourceJointEnabled}));}catch{}prepareSourceSyllables();});
$('source-study-open').addEventListener('click',()=>libraryAction(()=>{
  state.melodyId=PRINTED_SCORE.id;
  applyRanges([{id:'cohen-study',bookId:'gen',start:{chapter:22,verse:1},end:{chapter:22,verse:1},label:'Printed score context'}]);
  state.anchor=words.length-1;state.cursor=0;state.scope='selection';render();
  $('reader').focus();$('practice').scrollIntoView();
}));
$('cohen-penitential-open').addEventListener('click',()=>libraryAction(()=>{
  state.melodyId=COHEN_PENITENTIAL.id;state.practiceAudio='instrument';
  applyRanges([{id:'cohen-penitential-study',bookId:'gen',start:{chapter:22,verse:1},end:{chapter:22,verse:1},label:'Cohen penitential written-pitch example'}]);
  state.anchor=words.length-1;state.cursor=0;state.scope='selection';render();$('reader').focus();$('practice').scrollIntoView();
}));
$('prophetical-study-open').addEventListener('click',()=>libraryAction(()=>{
  state.melodyId=COHEN_PROPHETICAL.id;state.practiceAudio='instrument';
  applyRanges([{id:'cohen-prophetical-study',bookId:'gen',start:{chapter:22,verse:1},end:{chapter:22,verse:1},label:'Cohen hypothetical prophetical example'}]);
  state.anchor=words.length-1;state.cursor=0;state.scope='selection';render();
  $('reader').focus();$('practice').scrollIntoView();
}));
function openIdelsohnScore(all=false){libraryAction(()=>{
  state.melodyId=IDELSOHN_SCORE.id;state.practiceAudio='instrument';
  applyRanges([{id:'idelsohn-no268',bookId:'exo',start:{chapter:12,verse:21},end:{chapter:12,verse:22},label:'Idelsohn No268 source-word study'}],{readingType:'torah'});
  state.cursor=0;state.anchor=all?words.length-1:5;state.scope='selection';render();$('reader').focus();$('practice').scrollIntoView();
});}
$('idelsohn-score-open').addEventListener('click',()=>openIdelsohnScore());
$('idelsohn-score-all').addEventListener('click',()=>openIdelsohnScore(true));
$('baer-study-open').addEventListener('click',()=>libraryAction(()=>{
  state.melodyId=BAER_SCORE.id;state.practiceAudio='instrument';
  applyRanges([{id:'baer-study',bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:5},label:'Baer No939 worked example'}]);
  state.anchor=words.length-1;state.cursor=0;state.scope='selection';render();
  $('reader').focus();$('practice').scrollIntoView();
}));
$('baer-high-holiday-open').addEventListener('click',()=>libraryAction(()=>{
  state.melodyId=BAER_HIGH_HOLIDAY.id;state.practiceAudio='instrument';
  applyRanges([{id:'baer-high-holiday',bookId:'gen',start:{chapter:22,verse:19},end:{chapter:22,verse:19},label:'Baer No113 second setting'}]);
  state.anchor=words.length-1;state.cursor=0;state.scope='selection';render();
  $('reader').focus();$('practice').scrollIntoView();
}));
$('khan-pronunciation-open').addEventListener('click',()=>libraryAction(()=>{
  applyRanges([{id:'khan-pronunciation',bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:13},label:'Published Tiberian pronunciation examples · Genesis1:1–13'}],{readingType:'torah'});
  state.cursor=0;state.anchor=0;state.scope='word';render();$('reader').focus();$('practice').scrollIntoView();
}));
$('implicit-reading-open').addEventListener('click',()=>libraryAction(()=>{
  applyRanges([{id:'implicit-reading',bookId:'gen',start:{chapter:4,verse:18},end:{chapter:4,verse:18},label:'Documented source reading · Genesis4:18'}],{readingType:'torah'});
  state.cursor=8;state.anchor=8;state.scope='word';render();
  $('reader').focus();$('practice').scrollIntoView();
}));
for(const [id,key] of [['sign-query','signQuery'],['find-scope','findScope']])$(id).addEventListener('change',e=>{state[key]=e.target.value;persist();refreshSignSearch({reset:true});});
for(const [id,delta] of [['sign-previous',-1],['sign-next',1]])$(id).addEventListener('click',()=>{findPage+=delta;renderSignResults();});
$('printed-syllable-index').addEventListener('change',()=>{stop('Printed source syllable selected.');state.printedSyllableIndex=Number($('printed-syllable-index').value);state.scope='printed-syllable';state.notePage=0;state.staffPage=0;render();});
$('printed-syllable-select').addEventListener('click',()=>{stop('Printed source syllable selected.');state.scope='printed-syllable';state.notePage=0;state.staffPage=0;render();});
$('scope').addEventListener('change',e=>{stop('Ready to listen.');state.scope=e.target.value;state.notePage=0;render();});
$('end-selection').addEventListener('click',()=>{chooseEnd=!chooseEnd;updateSelection();});
for(const id of ['play','compact-play'])$(id).addEventListener('click',play);
for(const id of ['stop','compact-stop'])$(id).addEventListener('click',()=>stop());
$('repeat').addEventListener('change',e=>{const running=player.running;state.repeat=e.target.checked;referencePlayer.repeat=state.repeat;patternTools?.setRepeat(state.repeat);persist();if(running)play();});
$('follow-playback').addEventListener('change',e=>{state.followPlayback=e.target.checked;persist();});
function changeSound(key,value,min,max){
  if(!Number.isFinite(value))return;const running=player.running;state[key]=Math.min(max,Math.max(min,Math.round(value)));
  stop('Settings changed. Ready to listen.');render();if(running)play();
}
$('tempo').addEventListener('input',e=>changeSound('tempo',Number(e.target.value),40,160));
$('transpose').addEventListener('change',e=>changeSound('transpose',Number(e.target.value),-12,12));
$('pitch-up').addEventListener('click',()=>changeSound('transpose',state.transpose+1,-12,12));$('pitch-down').addEventListener('click',()=>changeSound('transpose',state.transpose-1,-12,12));
$('volume').addEventListener('input',e=>{state.volume=Number(e.target.value);player.setVolume(state.volume/100);patternTools?.volumeChanged();$('volume-value').textContent=`${state.volume}%`;persist();});
// A prepared audio file is a snapshot. Changing volume must not leave a stale
// file labelled with the new settings.
$('volume').addEventListener('input',updateExportSummary);
for(const [id,delta] of [['reader-previous',-1],['reader-next',1]])$(id).addEventListener('click',()=>{state.readerPage+=delta;state.followPlayback=false;$('follow-playback').checked=false;renderReader();persist();});
for(const [id,delta] of [['notes-previous',-1],['notes-next',1]])$(id).addEventListener('click',()=>{state.notePage+=delta;renderNotes();});
$('pronunciation-span-follow').addEventListener('change',()=>{pronunciationSpanFollowing=$('pronunciation-span-follow').checked;store('tropetrain-pronunciation-span-follow-v1',{enabled:pronunciationSpanFollowing});renderPronunciationFollow();});
$('score-pronunciation').addEventListener('change',()=>{scorePronunciation=$('score-pronunciation').checked;try{localStorage.setItem('tropetrain-score-pronunciation-v1',JSON.stringify({enabled:scorePronunciation}));}catch{}renderStaff();});
$('score-word-alignment-download').addEventListener('click',()=>{
  if(scoreGroupReport?.words.length)download('tropetrain-word-score-alignment.json',{...scoreGroupReport,musicalSource:{id:model.profile.id,revision:model.profile.revision}});
});
$('score-pronunciation-download').addEventListener('click',()=>{
  if(!scorePronunciationReport?.links.length)return;
  const from=state.staffPage*STAFF_PAGE;
  download('tropetrain-score-page-text-links.json',{...scorePronunciationReport,musicalSource:{id:model.profile.id,revision:model.profile.revision},scope:{kind:'score-page',from:from+1,to:from+scorePronunciationReport.links.length,totalNotes:plan.length}});
});
for(const [id,delta] of [['staff-previous',-1],['staff-next',1]])$(id).addEventListener('click',()=>{state.staffPage+=delta;renderStaff();});
$('download').addEventListener('click',()=>{
  const [start,end]=bounds(state.cursor,state.anchor,state.scope);
  let pronunciationResearch;
  try{pronunciationResearch=model.profile.wordOnly?null:pronunciationTools?.proposalNotes(plan,words)??null;}catch(error){say(`Pronunciation note references unavailable: ${error.message}`);return;}
  const data={format:'tropetrain-events-v1',textSource:{...passage,verses:undefined},melody:model.profile,instrument,signAnalysis:SIGN_ANALYSIS,contextAnalysis:CONTEXT_ANALYSIS,pronunciation:{id:null,status:'not implemented'},
    ...(sourcePhraseTools?.matchSelection()?{sourcePhrase:sourcePhraseTools.matchSelection()}:{}),
    ...(model.sourceSyllableUnderlay?{syllableUnderlay:model.sourceSyllableUnderlay}:{}),
    ...(model.sourceJointGroups?.length?{sourceJointGroups:model.sourceJointGroups}:{}),
    ...(pronunciationResearch?{pronunciationResearch}:{}),
    vocalRange:{low:state.rangeLow,high:state.rangeHigh,mode:'advisory'},tempo:state.tempo,transpose:state.transpose,
    ...(state.scope==='printed-syllable'?{printedSourceUnit:printedUnitContext(plan)}:{}),
    ...(model.profile.wordOnly?{wordCorrespondence:'lexical-source-word-candidate',syllableMapping:null,phonemes:null,independentReview:null}:{}),
    ...(plan.some(e=>e.sourceSmallEighth)?{smallEighthStudy:{...SMALL_EIGHTH_STUDY}}:{}),
    startWordId:words[start].id,endWordId:words[end].id,words:words.slice(start,end+1),events:plan};
  const link=$('note-events-save');link.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(data,null,2)+'\n');link.hidden=false;
  download('tropetrain-note-events.json',data);
});
$('reading-form').addEventListener('submit',e=>{e.preventDefault();libraryAction(()=>applyRanges([{...rangeFromForm(),label:'Reading'}],{readingType:$('reading-type').value}));});
$('append-section').addEventListener('click',()=>libraryAction(()=>applyRanges([...passage.ranges,rangeFromForm()],{readingType:$('reading-type').value})));
$('reading-type').addEventListener('change',()=>libraryAction(()=>syncReadingForm($('reading-type').value)));
$('book').addEventListener('change',()=>updateBookLimits({reset:true}));
$('recent-readings').addEventListener('change',e=>{if(e.target.value!=='')libraryAction(()=>{const recentReading=recent[Number(e.target.value)];applyRanges(recentReading.ranges,{readingType:recentReading.readingType});});});
$('save-assignment').addEventListener('click',()=>libraryAction(()=>{
  if(!corpus)throw Error('The library is still loading.');
  const assignment=createRepertoireAssignment($('assignment-title').value,state.readingType,passage.ranges,state,corpus);assignments=[assignment,...assignments].slice(0,100);
  store('tropetrain-assignments-v1',assignments);renderPickers();$('library-message').textContent=`Saved “${assignment.title}” on this device.`;
}));
$('saved-assignments').addEventListener('change',e=>{if(e.target.value!=='')libraryAction(()=>{
  const saved=parseRepertoireAssignment(JSON.stringify(assignments[Number(e.target.value)]),corpus);state.view=saved.displayPreferences.view;state.groups=saved.displayPreferences.groups;state.signClasses=saved.displayPreferences.signClasses;
  state.melodyId=saved.musicalPreferences.melodyId;state.scrollLayout=saved.displayPreferences.scrollLayout;
  applyRanges(saved.sections,{readingType:saved.readingType});$('assignment-title').value=saved.title;
});});
$('export-assignment').addEventListener('click',()=>libraryAction(()=>{
  if(!corpus)throw Error('The library is still loading.');
  download('tropetrain-assignment.json',createRepertoireAssignment($('assignment-title').value,state.readingType,passage.ranges,state,corpus));
}));
$('export-practice-recovery').addEventListener('click',()=>{if(practiceRecoveryRecord)download('tropetrain-practice-recovery.json',practiceRecoveryRecord);});
$('import-assignment').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{if(!corpus)throw Error('The library is still loading.');if(file.size>2_000_000)throw Error('Assignment file is too large.');const assignment=parseRepertoireAssignment(await file.text(),corpus);
    state.melodyId=assignment.musicalPreferences.melodyId;state.scrollLayout=assignment.displayPreferences.scrollLayout;
    state.view=assignment.displayPreferences.view;state.groups=assignment.displayPreferences.groups;state.signClasses=assignment.displayPreferences.signClasses;applyRanges(assignment.sections,{readingType:assignment.readingType});$('assignment-title').value=assignment.title;
  }catch(error){$('library-message').textContent=error.message;}finally{e.target.value='';}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='F2'){if(e.key==='F2')e.preventDefault();stop();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)patternTools?.stop();if(document.hidden&&(player.running||referencePlayer.running||referencePlayer.starting||voiceStudyTools?.running||voiceStudyTools?.loading||haftarahTools?.running||haftarahTools?.loading||!$('wav-preview').paused))stop('Paused because this tab is hidden. Press Play to restart the span.');});
if(matchMedia('(min-width: 761px)').matches)$('library-options').open=true;
combinationTools=mountCombinationTools({getModel:()=>model,getCorpus,selectHit:(hit,wholeTorah)=>{
  if(wholeTorah)libraryAction(()=>{
    const point={chapter:hit.word.chapter,verse:hit.word.verse};
    applyRanges([{id:'combination-example',bookId:hit.word.bookId,start:point,end:point,label:'Source combination example'}]);
  });
  const ids=wholeTorah?hit.sourceWordIds:hit.occurrenceIds;
  const start=words.findIndex(w=>(wholeTorah?w.sourceWordId??w.id:w.id)===ids[0]);
  const end=words.findIndex(w=>(wholeTorah?w.sourceWordId??w.id:w.id)===ids.at(-1));
  if(start<0||end<start)return;
  stop('Source combination selected. Press Play to hear the selected musical source.');
  state.anchor=end;state.cursor=start;state.scope='selection';state.readerPage=Math.floor(words[start].verseIndex/VERSE_PAGE);state.notePage=0;state.staffPage=0;render();
  document.querySelector(`[data-word="${words[start].id}"]`)?.focus();$('reader').scrollIntoView({block:'start'});
}});
patternTools=mountPatternStudy({getSettings:()=>state,beforePlay:()=>stop('Listening to the printed pattern. Bible-word selection is kept.',{preservePattern:true}),findPattern:id=>combinationTools.findPattern(id)});
pronunciationTools=mountPronunciationStudy({onChange:()=>{clearNoteEventExport();renderStaff();renderReaderPronunciation();sourceRecallTools?.refreshPronunciation();syllableTimingTools?.refresh();recordingGroupTimingTools?.follow();}});
sourcePitchTools=mountSourcePitch({getWord:()=>words[state.cursor],getReferences:()=>referenceLibrary});
syllableTimingTools=mountSyllableTiming({getWord:()=>words[state.cursor],getWords:()=>words,getPronunciation:word=>pronunciationTools.timingStudy(word),getReferences:()=>referenceLibrary,
  position:()=>referencePlayer.running&&!recordedPracticeRunning?{recordingId:referencePlayer.currentSegment.recordingId,seconds:referencePlayer.now(),mode:referencePlayer.mode}:null,
  hasSource:record=>referenceStore.has(record),loadSource:(record,signal)=>referenceStore.load(record,{signal}),stop:()=>stop(),
  audition:async({word,draft,span})=>{
    const previewRequest=++chantPlayRequest;
    const index=words.findIndex(w=>w.id===word.id&&w.sourceHebrew===word.sourceHebrew);
    if(index<0)throw Error('The selected reading changed; reopen this timing draft.');
    const joint=draft.revision===2,groupPreview=()=>{const p=pronunciationTools.timingStudy(words[index]);return groupTimingPreview({library:referenceLibrary,words,study:p?.study,style:p?.style,draft,span});};
    const checked=joint?groupPreview():sourceTimedPracticePlan(referenceLibrary,words,index,index),row=joint?null:checked.rows[0],record=joint?checked.record:checked.records[0];
    if(!joint&&(row.recordingId!==draft.source.recordingId||row.id!==draft.word.id||!(span.start>=draft.word.startSeconds&&span.start<span.end&&span.end<=draft.word.endSeconds)))throw Error('Draft interval differs from the unchanged source word.');
    if(!await referenceStore.has(record))throw Error('Load the original recording before auditioning this interval.');
    if(previewRequest!==chantPlayRequest||words[index]?.id!==word.id||words[index]?.sourceHebrew!==word.sourceHebrew)throw Error('Source preview was superseded by a stop or reading change.');
    if(joint)groupPreview();
    stop('Listening to a personal source-syllable draft. Source pronunciation and timing remain unchanged.');
    referencePlayer.setRate(1);referencePlayer.setVolume(state.referenceVolume/100);
    if(joint)await referencePlayer.playSegments([checked.segment],false);
    else await referencePlayer.play([{...row,startSeconds:span.start,endSeconds:span.end}],false);
    if(!referencePlayer.running)throw Error('The source interval could not start; review the recorded-reference status.');
  }
});
recordingGroupTimingTools=mountRecordingGroupWordTiming({getWords:()=>words,getCursor:()=>state.cursor,getDrafts:()=>recordingGroupWordDrafts,getReferences:()=>referenceLibrary,
  position:()=>{
    if(!referencePlayer.running||recordedPracticeRunning)return null;
    const segment=referencePlayer.currentSegment,review=segment.recordingGroupReview;
    return review?{...review,recordingId:segment.recordingId,seconds:referencePlayer.now(),mode:referencePlayer.mode}:null;
  },
  hasSource:record=>referenceStore.has(record),loadSource:(record,signal)=>referenceStore.load(record,{signal}),stop:()=>stop(),onSourceReady:()=>{renderReference({keepChoice:true});renderChantPractice();},
  audition:async({draft,kind,wordIndex})=>{
    const request=++chantPlayRequest,preview=()=>recordingGroupWordDrafts.preview(draft,words,state.cursor,{kind,wordIndex});
    const checked=preview();
    if(!await referenceStore.has(checked.record))throw Error('Load the original recording before auditioning this draft.');
    if(request!==chantPlayRequest)throw Error('Source preview was superseded by a stop or reading change.');
    const current=preview();
    stop('Listening to an unreviewed recording-group word draft. Original word times remain unassigned.');
    referencePlayer.setRate(1);referencePlayer.setVolume(state.referenceVolume/100);await referencePlayer.playSegments([current.segment],false);
    if(!referencePlayer.running)throw Error('The original review interval could not start; review the recorded-reference status.');
  }
});
$('reader-pronunciation').addEventListener('change',()=>{readerPronunciation=$('reader-pronunciation').checked;try{localStorage.setItem('tropetrain-reader-pronunciation-v1',JSON.stringify({enabled:readerPronunciation}));}catch{}renderReaderPronunciation();recordingGroupTimingTools?.follow();});
voiceStudyTools=mountVoiceStudies({beforePlay:()=>stop('Listening to a source voice study. Bible-word selection is kept.',{preserveVoiceStudy:true}),
  onOpenText:range=>libraryAction(()=>applyRanges([{id:'voice-study-text',...range,label:'Source voice-study passage'}],{readingType:'torah'}))});
haftarahTools=mountHaftarah({beforePlay:()=>stop('Listening to a Haftarah source recording. Instrument settings and reader selection are kept.',{preserveHaftarah:true}),
  selection:()=>{const [start,end]=bounds(state.cursor,state.anchor,state.scope);return {words,start,end};},
  onOpen:sections=>libraryAction(()=>applyRanges(sections,{readingType:'haftarah'})),
  onWord:word=>{
    const occurrence=word?.occurrenceId??null;
    if(word&&state.followPlayback&&words[word.wordIndex]?.id===occurrence){const page=Math.floor(words[word.wordIndex].verseIndex/VERSE_PAGE);if(page!==state.readerPage){state.readerPage=page;renderReader();}}
    document.querySelectorAll('[data-word]').forEach(el=>el.classList.toggle('haftarah-active',marksWord(el,occurrence)));
    if(word&&words[word.wordIndex]?.id===occurrence)pronunciationTools?.showWord(words[word.wordIndex],{following:true});else pronunciationTools?.showWord(words[state.cursor]);
  }
});
sourcePhraseTools=mountSourcePhrases({getWords:()=>words,getCursor:()=>state.cursor,getSelection:()=>bounds(state.cursor,state.anchor,state.scope),onSelect:selection=>{
  stop('Source phrase selected. Press Play when ready.');state.cursor=selection.startIndex;state.anchor=selection.endIndex;state.scope='selection';state.readerPage=Math.floor(words[state.cursor].verseIndex/VERSE_PAGE);state.notePage=0;state.staffPage=0;chooseEnd=false;render();$('reader').focus();
}});
sourceRecallTools=mountSourceRecall({getWords:()=>words,getCursor:()=>state.cursor,playButton:$('play'),
 getPlayback:()=>({enabled:!$('play').disabled,label:state.practiceAudio==='recorded'?'Recorded chant':state.practiceAudio==='measured'?'Measured instrumental tones':model.profile.name??model.profile.id,message:isSourcePractice()?$('chant-readiness').textContent:$('musical-source-status').textContent}),
 getPronunciation:card=>{
  if(!readerPronunciation)return {enabled:false};
  const source=pronunciationTools?.readerStatus(),selected=words.slice(card.startIndex,card.endIndex+1),group=(model.sourceJointGroups??[]).find(g=>g.wordIndices[0]===card.startIndex&&g.wordIndices.at(-1)===card.endIndex);
  const rows=group?[{label:'Complete shared source pronunciation word · both written words together',wordIds:group.wordIds.slice(),report:pronunciationTools?.readerGroup(group,words),message:source?.kind==='published-word'?'No shared-word text in this published transcription.':source?.error??'Preparing the shared source text…'}]:selected.map(word=>({label:`Word ${word.ordinal}`,wordIds:[word.id],report:pronunciationTools?.readerText(word)}));
  return {enabled:true,name:source?.name??'Source pronunciation text',note:source?.kind==='phonemic-research'?'Incomplete research text; unresolved sounds, source branches and shared consonants remain explicit. No singing voice or acoustic timing is assigned.':'Original source syllables, stress and alternatives. Pronunciation text is independent of the selected melody; recordings keep their own pronunciation.',rows};
 },
 onStop:()=>stop(),onListen:()=>play(),onSelect:card=>{
  stop('Recall word group selected. Press Listen when ready.');state.cursor=card.startIndex;state.anchor=card.endIndex;state.scope='selection';state.readerPage=Math.floor(words[state.cursor].verseIndex/VERSE_PAGE);state.notePage=0;state.staffPage=0;chooseEnd=false;render();
 }});
mountCalendar({getCorpus,getReadingCorpus:getRepertoireCorpus,onOpen:(ranges,title,options)=>{applyRanges(ranges,options);$('assignment-title').value=title;}});
render();renderSections();renderPickers();showPracticeRecovery();if(state.findScope==='torah')refreshSignSearch();document.documentElement.dataset.ready='true';$('startup-status').hidden=true;
getRepertoireCorpus().then(value=>{
  getSourcePhraseLibrary(value).then(library=>{sourcePhraseTools.setLibrary(library);exportsKey=null;updateExportSummary();}).catch(error=>sourcePhraseTools.unavailable(error));
  corpus=value;syncReadingForm('torah','gen');$('reading-type').disabled=false;$('book').disabled=false;
  $('library-status').textContent='31 books · 606 chapters · text available offline';$('open-reading').disabled=false;
  $('source-study-open').disabled=false;
  $('baer-study-open').disabled=false;$('idelsohn-score-open').disabled=false;$('idelsohn-score-all').disabled=false;
  $('baer-high-holiday-open').disabled=false;
  $('implicit-reading-open').disabled=false;
  $('khan-pronunciation-open').disabled=false;
  $('prophetical-study-open').disabled=false;
  $('cohen-penitential-open').disabled=false;
  let restoreFailed=false;
  if(restore.ranges){try{applyRanges(restore.ranges,{remember:false,restoreCursor:restore,readingType:restore.readingType});}catch(error){restoreFailed=true;retainPracticeRecovery(error);$('library-message').textContent=`Saved reading could not be restored: ${error.message}`;}}
  restoringReading=restoreFailed;persist();
  renderSections();
}).catch(error=>{$('library-status').textContent='Opening passage only';$('library-message').textContent=error.message;});
getReferenceLibrary().then(value=>{
  referenceLibrary=value;$('reference-portion').replaceChildren();
  for(const part of value.parts){const option=document.createElement('option');option.value=part.id;option.textContent=part.name;$('reference-portion').append(option);}
  $('reference-library-status').textContent=`${value.parts.length} portions · ${value.recordings.length} recordings · ${value.source.audit.alignedRecordings} with source word timings · ${[...value.timingPolicies.values()].filter(p=>p.kind==='partial-original-windows').length} with partial original intervals · ${[...value.timingPolicies.values()].filter(p=>p.kind==='withheld').length} complete-take only`;
  $('reference-open').disabled=false;$('reference-portion').disabled=false;$('reference-aliyah').disabled=false;renderReference();renderChantCoverage();renderChantPractice();sourcePitchTools?.refresh();syllableTimingTools?.refresh();haftarahTools?.refresh();
  createRecordingTimingGroups(value).then(groups=>{recordingTimingGroups=groups;renderChantPractice();}).catch(error=>{recordingTimingGroupError=error.message;renderChantPractice();});
  createRecordingGroupWordDrafts(value).then(drafts=>{recordingGroupWordDrafts=drafts;recordingGroupTimingTools?.refresh();}).catch(error=>{$('recording-group-timing-status').textContent=error.message;});
}).catch(error=>{$('reference-library-status').textContent=error.message;});
getScrollLayout().then(value=>{scrollLayout=value;scrollMessage='245-column layout reference · exact written UXLC letters · edition differences flagged';$('scroll-layout').disabled=false;render();}).catch(error=>{scrollMessage=`Sourced scroll lines unavailable: ${error.message}`;$('scroll-layout-status').textContent=scrollMessage;});
if(location.protocol==='file:')$('offline-status').textContent='Local file · ready without a server';
else if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{$('offline-status').textContent='Local instrument & reading text · available offline after first load';}).catch(()=>{});
if(sourceSyllablesEnabled)prepareSourceSyllables();
