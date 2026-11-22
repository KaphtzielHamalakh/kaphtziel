import {getHaftarahLibrary,restoreHaftarahPreferences,haftarahSections} from './haftarah-reference.js';
import {RecordingPlayer} from './recorded-reference.js';
import {ReferenceAudioStore} from './reference-audio-store.js';
import {RecordedPitchStore,pitchProcessingSupported} from './recorded-pitch-store.js';
export function mountHaftarah({beforePlay,onOpen,selection,onWord}){
 const $=id=>document.getElementById(id),key='tropetrain-haftarah-practice-v1',media=$('haftarah-audio');
 let saved;try{saved=JSON.parse(localStorage.getItem(key));}catch{}
 let library=null,prefs=null,record=null,rows=null,available=false,loadJob=null,opening=false,revision=0,readyRevision=0,selectionWords=null,selectionBounds=null;
 const store=new ReferenceAudioStore({openingUrl:media.getAttribute('src')});
 const persist=()=>{try{localStorage.setItem(key,JSON.stringify(prefs));}catch{}};
 const status=text=>{$('haftarah-status').textContent=text;};
 const pitchStore=new RecordedPitchStore({sourceStore:store,
  onProgress:(value,text)=>{if(opening)$('haftarah-pitch-status').textContent=`${text} · ${Math.round(value*100)}%`;},
  onReady:metadata=>{if(metadata.recordingId===record?.id&&metadata.semitones===prefs?.semitones){$('haftarah-pitch-status').textContent=`Prepared ${metadata.semitones>0?'+':''}${metadata.semitones} semitones · ${metadata.durationSeconds.toFixed(3)} source seconds. Processed sound review pending.`;$('haftarah-pitch-metadata').textContent=JSON.stringify(metadata,null,2);}}
 });
 const player=new RecordingPlayer(media,{
  onWord:word=>{onWord(word);$('haftarah-source-word').textContent=word?.sourceHebrew??'';$('haftarah-source-comparison').textContent=word?`${word.id} · ${word.comparison}. Marked reader: ${word.uxlcHebrew}. Original recorded words and reader text are retained separately.`:'';},
  onEnd:()=>{opening=false;status('Haftarah source playback finished. Reader selection is kept.');readiness();},
  onError:error=>{opening=false;status('Haftarah source unavailable: '+error.message);readiness();},
  onLoading:id=>status(`Opening ${library.byId.get(id).title}…`),
  onRecording:()=>status(`Playing ${record.title} · ${prefs.rate}% source speed · ${prefs.semitones===0?'original pitch':(prefs.semitones>0?'+':'')+prefs.semitones+' semitones · processed sound'} · original recorded pronunciation${prefs.volume===0?' · muted clock':''}.`),
  resolveSource:(id,options)=>pitchStore.url(library.record(id),{...options,semitones:prefs.semitones})
 });
 function stop(){revision++;opening=false;loadJob?.abort();player.stop();$('haftarah-cancel').hidden=true;if(record)readiness();}
 function span(){
  rows=null;const current=selection();selectionWords=current.words;selectionBounds=[current.start,current.end];
  try{rows=library.selection(record.id,current.words,current.start,current.end);$('haftarah-span').textContent=`${rows.length} source-timed reader word${rows.length===1?'':'s'} in this selected span. Source times and edition comparison await acoustic review.`;}
  catch(error){$('haftarah-span').textContent=error.message;}
 }
 async function readiness(){
  if(!record)return;const current=++readyRevision,source=record;
  try{const ready=await store.has(source);if(current!==readyRevision||source!==record)return;available=ready;
   $('haftarah-load').disabled=ready||!!loadJob;$('haftarah-load').textContent=ready?'Haftarah original available':`Load original · ${(source.audio.bytes/1048576).toFixed(1)} MB`;
   $('haftarah-whole').disabled=!ready;$('haftarah-play').disabled=!ready||!rows;$('haftarah-remove').disabled=!!store.included(source)||!ready;
   $('haftarah-storage').textContent=store.included(source)?'This unchanged original is included with both builds.':ready?(store.saved.has(source.audio.sha1)?'Original checksum checked on playback; saved on this device.':'Original loaded for this session.'):'Load only this original when ready; its byte count and SHA1 are checked before use.';
  }catch(error){status(error.message);}
 }
 function render(){
  stop();record=library.record(prefs.recordingId);$('haftarah-choice').value=record.id;
  $('haftarah-open').disabled=!record.readerSectionsValid;
  $('haftarah-coverage').textContent=`Source passage: ${record.sourceCoverage}${record.sections.length>1?' · '+record.sections.length+' ordered source sections':''}. ${record.status==='source-timed'?'Source timestamp count and order checked.':'Source word timings require review; use complete-recording playback.'} ${record.missingReaderWords.length?record.missingReaderWords.length+' reader word form remains unmapped.':''}${record.readerSectionsValid?'':' The original source passage definition exceeds this reader; opening it is withheld.'}`;
  $('haftarah-source-metadata').textContent=JSON.stringify({source:library.source.source,creator:library.source.creator,projectCredits:library.source.projectCredits,individualReader:null,originalCommit:library.source.originalCommit,recordingId:record.id,sections:record.sections,sourceCoverage:record.sourceCoverage,alternativeSourceCoverage:record.alternativeSourceCoverage,coverageIssues:record.coverageIssues,audio:record.audio,timingSource:record.timingSource,issues:record.issues,missingReaderWords:record.missingReaderWords,review:{acoustic:null,musical:null,phonological:null}},null,2);
  $('haftarah-source-link').href=record.audio.url;$('haftarah-source-link').textContent='Original '+record.audio.filename;
  $('haftarah-volume').value=prefs.volume;$('haftarah-volume-value').textContent=`${prefs.volume}%`;player.setVolume(prefs.volume/100);
  $('haftarah-rate').disabled=!player.canPreservePitch;if(!player.canPreservePitch)prefs.rate=100;$('haftarah-rate').value=prefs.rate;player.setRate(prefs.rate/100);
  $('haftarah-pitch').value=prefs.semitones;$('haftarah-repeat').checked=prefs.repeat;
  const supported=pitchProcessingSupported();for(const option of $('haftarah-pitch').options)option.disabled=Number(option.value)!==0&&!supported;
  if(!supported&&prefs.semitones!==0){prefs.semitones=0;$('haftarah-pitch').value='0';}
  $('haftarah-pitch-status').textContent=prefs.semitones===0?'Original media requested. No pitch-processed derivative is used.':'Press Play to prepare this source at the selected pitch; its pronunciation stays as recorded.';$('haftarah-pitch-metadata').textContent='';
  span();readiness();persist();status('Open this source reading to select words, or play its complete original. No singing voice or traditional grammar is synthesized.');
 }
 async function play(whole){
  if(!record||!available)return;
  let chosen;try{const current=selection();chosen=whole?null:library.selection(record.id,current.words,current.start,current.end);}catch(error){status(error.message);return;}
  beforePlay();stop();const current=revision;opening=true;$('haftarah-cancel').hidden=false;player.setRate(prefs.rate/100);player.setVolume(prefs.volume/100);
  if(whole)await player.playWhole(record.id,prefs.repeat);else await player.play(chosen,prefs.repeat);
  if(current===revision){opening=false;$('haftarah-cancel').hidden=true;}
 }
 $('haftarah-choice').addEventListener('change',()=>{prefs.recordingId=$('haftarah-choice').value;render();});
 $('haftarah-open').addEventListener('click',()=>{if(record)onOpen(haftarahSections(record));});
 $('haftarah-load').addEventListener('click',async()=>{
  if(!record||loadJob)return;const selected=record,current=revision,job=new AbortController();loadJob=job;$('haftarah-cancel').hidden=false;$('haftarah-load').disabled=true;status('Loading and verifying the unchanged Haftarah original…');
  try{await store.load(selected,{signal:job.signal});if(current===revision)status('Haftarah original loaded and checksum checked. Press Play when ready.');}
  catch(error){if(current===revision)status(job.signal.aborted?'Haftarah loading cancelled.':error.message);}
  finally{if(loadJob===job){loadJob=null;$('haftarah-cancel').hidden=true;readiness();}}
 });
 $('haftarah-cancel').addEventListener('click',()=>{stop();status('Haftarah preparation stopped. Source data and reader selection are kept.');});
 $('haftarah-play').addEventListener('click',()=>play(false));$('haftarah-whole').addEventListener('click',()=>play(true));$('haftarah-stop').addEventListener('click',()=>{stop();status('Haftarah recording stopped. Reader selection is kept.');});
 $('haftarah-volume').addEventListener('input',()=>{if(!prefs)return;prefs.volume=Number($('haftarah-volume').value);$('haftarah-volume-value').textContent=`${prefs.volume}%`;player.setVolume(prefs.volume/100);persist();});
 $('haftarah-rate').addEventListener('change',()=>{try{const rate=Number($('haftarah-rate').value);player.setRate(rate/100);prefs.rate=rate;persist();if(player.running)status(`Haftarah source speed ${rate}%; pitch preservation requested. Original source word seconds unchanged.`);}catch(error){status(error.message);}});
 $('haftarah-pitch').addEventListener('change',()=>{stop();prefs.semitones=Number($('haftarah-pitch').value);persist();$('haftarah-pitch-metadata').textContent='';$('haftarah-pitch-status').textContent=prefs.semitones===0?'Original media requested.':'Press Play to prepare the selected pitch. Processed sound review remains pending.';});
 $('haftarah-repeat').addEventListener('change',()=>{prefs.repeat=$('haftarah-repeat').checked;player.repeat=prefs.repeat;persist();});
 $('haftarah-remove').addEventListener('click',async()=>{const source=record;stop();await store.remove(source);status('Saved Haftarah original removed from this device.');readiness();});
 getHaftarahLibrary().then(value=>{library=value;prefs=restoreHaftarahPreferences(saved,library);
  for(const source of library.records){const option=document.createElement('option');option.value=source.id;option.textContent=`${source.title} · ${source.sourceCoverage}${source.status==='timing-review'?' · complete take only':''}`;$('haftarah-choice').append(option);}
  for(const id of ['haftarah-choice','haftarah-open'])$(id).disabled=false;
  $('haftarah-catalog').textContent=`${library.records.length} unchanged source takes · ${library.records.filter(r=>r.status==='source-timed').length} with structurally usable source word times · ${library.audit.sourceTimedMappedWordOccurrences.toLocaleString()} mapped timed word occurrences; overlapping verses keep their separate recordings. Acoustic/musical/phonological review remains pending.`;render();
 }).catch(error=>status(error.message));
 return {stop,refresh(){if(!record)return;const current=selection();if(current.words!==selectionWords||current.start!==selectionBounds?.[0]||current.end!==selectionBounds?.[1]){span();readiness();}},get running(){return opening||player.running||player.starting;},get loading(){return !!loadJob;}};
}
