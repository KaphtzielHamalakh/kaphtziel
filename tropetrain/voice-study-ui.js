import {VOICE_STUDIES,voiceStudy,voiceRecording,voiceAudioRecord,voiceCoverage,voiceCoverageLabel,voiceSpan,restoreVoicePreferences} from './voice-studies.js';
import {VoiceStudyPlayer} from './voice-study-player.js';
import {ReferenceAudioStore} from './reference-audio-store.js';
import {mountWordTimingDraft} from './word-timing-ui.js';
import {mountAsaelSourceFinder} from './asael-source-finder.js';

export function mountVoiceStudies({beforePlay,onOpenText}){
  const $=id=>document.getElementById(id),key='tropetrain-voice-studies-v1';
  let saved;try{saved=JSON.parse(localStorage.getItem(key));}catch{}
  const prefs=restoreVoicePreferences(saved);let record,study,runtimeRecord,loading=null,opening=false,request=0;
  const media=$('voice-study-audio'),audioBase=$('voice-studies').dataset.audioBase||location.href;
  const included=VOICE_STUDIES.recordings.find(r=>r.id==='fellman-rh-2018-gen-22-1');
  const store=new ReferenceAudioStore({openingUrl:media.getAttribute('src'),includedUrls:{[included.audio.sha1]:$('voice-studies').dataset.includedVerse}});
  let playhead=null;
  const timing=mountWordTimingDraft({position:()=>playhead?{...playhead,seconds:player.running?player.now():playhead.seconds}:null,onAudition:span=>playSpan(span,false)});
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify(prefs));}catch{}};
  const time=n=>`${Math.floor(n/60)}:${Math.floor(n%60).toString().padStart(2,'0')}`;
  const player=new VoiceStudyPlayer(media,{
    onPosition:(position,cycle,mode)=>{
      playhead={recordId:record.id,seconds:position,mode};
      $('voice-study-position').textContent=`${prefs.repeat?`Loop ${cycle+1} · `:''}${time(position)} / ${time(player.end)}${mode==='muted'?' · muted clock, audio device unused':''}`;
    },
    onEnd:()=>{$('voice-study-status').textContent='Recording span finished. Reader word selection is unchanged.';},
    onError:error=>{opening=false;$('voice-study-status').textContent=`Recording unavailable: ${error.message}`;readiness();}
  });
  function stop(){
    const active=opening||player.running||player.starting||loading;
    request++;loading?.abort();loading=null;opening=false;player.stop();$('voice-study-cancel').hidden=true;if(record)readiness();
    if(active)$('voice-study-status').textContent='Recording stopped. Reader word selection is unchanged.';
  }
  function options(id,items,value){
    $(id).replaceChildren();for(const item of items){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;$(id).append(option);}
    $(id).value=value;
  }
  async function readiness(){
    const selected=record.id,current=++request;
    try{
      const available=await store.has(runtimeRecord);if(current!==request||record.id!==selected)return;
      $('voice-study-play').disabled=!available;$('voice-study-load').disabled=available||!!loading;
      timing.setAvailable(available);
      $('voice-study-load').textContent=available?'Recording available':`Load recording · ${(record.audio.bytes/1048576).toFixed(1)} MB`;
      $('voice-study-remove').disabled=!!store.included(runtimeRecord)||!available;
      $('voice-study-storage').textContent=store.included(runtimeRecord)?'This original recording is included with the app.':available?
        (store.saved.has(record.audio.sha1)?'Original checksum verified on playback; saved on this device.':'Original recording loaded for this session.'):
        'Load this original when ready. Its checksum is verified before playback; device storage keeps it offline when available.';
    }catch(error){$('voice-study-storage').textContent=error.message;}
  }
  function showSpan(){
    const span=prefs.spans[record.id]??{start:0,end:null};
    $('voice-study-start').value=span.start;$('voice-study-end').value=span.end??'';
    for(const id of ['voice-study-start','voice-study-end'])$(id).max=record.audio.estimatedDurationSeconds.toFixed(3);
    $('voice-study-position').textContent=`Source duration about ${time(record.audio.estimatedDurationSeconds)}. No word or syllable timing is assigned.`;
  }
  function render(){
    stop();study=voiceStudy(prefs.studyId);record=voiceRecording(prefs.studyId,prefs.pronunciationId,prefs.deliveryId);runtimeRecord=voiceAudioRecord(record,audioBase);
    playhead=null;timing.select(record,voiceCoverage(record));
    const delivery=study.deliveries.find(d=>d.id===prefs.deliveryId);
    $('voice-study-kind').textContent=delivery.kind==='spoken'?'Spoken pronunciation study · without melody':'Chanted reference · recorded voice';
    $('voice-study-description').textContent=study.description;$('voice-study-limits').textContent=study.limits;
    $('voice-study-coverage').textContent=`${voiceCoverageLabel(record)?voiceCoverageLabel(record)+' · ':''}${record.coverageStatus??study.coverageStatus}`;
    const uploadYear=record.sourceUploadYear??(record.studyId==='asael-bereshit'?record.year:null);
    $('voice-study-creator').textContent=`${record.performer} · ${uploadYear?`source upload ${uploadYear} · performance date not established`:record.year??'performance date not established'}`;
    $('voice-study-source').href=record.sourceUrl;$('voice-study-source').textContent='Original performance source';
    $('voice-study-book').href=study.sourceUrl;$('voice-study-book').textContent=study.sourceTitle;
    $('voice-study-license').href=record.license.url;$('voice-study-license').textContent=record.license.id;
    $('voice-study-hash-label').textContent=record.audio.sha256?'Selected original SHA-256:':'Selected original SHA-1 (checked on loading):';
    $('voice-study-hash').textContent=record.audio.sha256??record.audio.sha1;
    const note=study.catalogNotes?.find(n=>n.recordId===record.id)?.text;
    $('voice-study-catalog-note').textContent=note?`Catalog passage note, retained as written: ${note}. ${record.catalogPassageEvidence?.discrepancy??'Source boundaries and edition correspondence require review.'}`:'';
    $('voice-study-catalog-note').hidden=!note;
    $('voice-study-open').disabled=!voiceCoverage(record);$('voice-study-open').textContent=voiceCoverage(record)?`${record.catalogPassageEvidence?'Open catalog passage · ': 'Open '}${voiceCoverageLabel(record)} text${record.catalogPassageEvidence?' · unreviewed':''}`:
      record.sourceCatalogRow?'Passage mapping pending':'Table names · no Bible passage mapping';
    $('voice-study-delivery-label').textContent=study.deliveryLabel??'Recorded delivery';
    $('voice-study-volume').value=prefs.volume;$('voice-study-volume-value').textContent=`${prefs.volume}%`;
    $('voice-study-repeat').checked=prefs.repeat;player.setVolume(prefs.volume/100);
    $('voice-study-status').textContent='Choose a span in seconds, then Play. The reader’s musical settings and Hebrew selection stay separate.';
    showSpan();readiness();persist();
  }
  function readSpan(){
    const start=$('voice-study-start').value===''?NaN:Number($('voice-study-start').value),end=$('voice-study-end').value===''?null:Number($('voice-study-end').value);
    voiceSpan(start,end,record.audio.estimatedDurationSeconds);return {start,end};
  }
  function saveSpan(){
    stop();try{prefs.spans[record.id]=readSpan();persist();$('voice-study-status').textContent='Seconds span kept. Press Play when ready.';}
    catch(error){$('voice-study-status').textContent=error.message;}
    readiness();
  }
  function studyOptions(){
    const items=[...VOICE_STUDIES.studies];if(!items.some(s=>s.id===prefs.studyId))items.push(voiceStudy(prefs.studyId));
    options('voice-study-choice',items,prefs.studyId);
  }
  studyOptions();
  const populate=()=>{const s=voiceStudy(prefs.studyId);options('voice-study-pronunciation',s.pronunciations,prefs.pronunciationId);options('voice-study-delivery',s.deliveries,prefs.deliveryId);};
  populate();render();
  function chooseStudy(id){
    prefs.studyId=id;const s=voiceStudy(prefs.studyId);
    studyOptions();
    prefs.pronunciationId=s.pronunciations[0].id;prefs.deliveryId=s.deliveries[0].id;populate();render();
  }
  $('voice-study-choice').addEventListener('change',()=>chooseStudy($('voice-study-choice').value));
  $('asael-study-open').addEventListener('click',()=>chooseStudy('asael-bereshit'));
  mountAsaelSourceFinder({selectedStudy:prefs.studyId,onChooseStudy:chooseStudy});
  for(const [id,field] of [['voice-study-pronunciation','pronunciationId'],['voice-study-delivery','deliveryId']])
    $(id).addEventListener('change',()=>{prefs[field]=$(id).value;render();});
  for(const id of ['voice-study-start','voice-study-end'])$(id).addEventListener('change',saveSpan);
  $('voice-study-whole').addEventListener('click',()=>{prefs.spans[record.id]={start:0,end:null};render();});
  $('voice-study-repeat').addEventListener('change',()=>{prefs.repeat=$('voice-study-repeat').checked;player.repeat=prefs.repeat;persist();});
  $('voice-study-volume').addEventListener('input',()=>{prefs.volume=Number($('voice-study-volume').value);$('voice-study-volume-value').textContent=`${prefs.volume}%`;player.setVolume(prefs.volume/100);persist();});
  $('voice-study-load').addEventListener('click',async()=>{
    if(loading)return;const selected=runtimeRecord,job=new AbortController();loading=job;$('voice-study-load').disabled=true;$('voice-study-cancel').hidden=false;
    $('voice-study-status').textContent='Loading and verifying the original source recording…';
    try{await store.load(selected,{signal:job.signal});if(loading===job)$('voice-study-status').textContent='Original recording loaded and checksum verified. Press Play when ready.';}
    catch(error){if(loading===job)$('voice-study-status').textContent=job.signal.aborted?'Recording load cancelled.':error.message;}
    finally{if(loading===job){loading=null;$('voice-study-cancel').hidden=true;readiness();}}
  });
  $('voice-study-cancel').addEventListener('click',()=>{loading?.abort();});
  async function playSpan(span,repeat=prefs.repeat){
    beforePlay();const selected=runtimeRecord,current=++request;opening=true;
    $('voice-study-status').textContent='Opening the selected recording span…';
    try{
      const url=await store.url(selected);if(current!==request)return;
      const kind=study.deliveries.find(d=>d.id===prefs.deliveryId).kind;
      $('voice-study-status').textContent=`${kind==='spoken'?'Spoken study, without melody':'Chanted source recording'} · original recorded pitch and timing${prefs.volume===0?' · muted at 0%':''}.`;
      await player.play(url,{...span,repeat,expectedDuration:selected.audio.estimatedDurationSeconds});
    }catch(error){if(current===request){stop();$('voice-study-status').textContent=error.message;readiness();}}
    finally{if(current===request)opening=false;}
  }
  $('voice-study-play').addEventListener('click',()=>{
    try{playSpan(readSpan());}catch(error){$('voice-study-status').textContent=error.message;}
  });
  $('voice-study-stop').addEventListener('click',()=>{stop();$('voice-study-status').textContent='Recording stopped. Reader word selection is unchanged.';readiness();});
  $('voice-study-remove').addEventListener('click',async()=>{const selected=runtimeRecord;stop();await store.remove(selected);$('voice-study-status').textContent='Saved copy removed. Load it again when needed.';readiness();});
  $('voice-study-open').addEventListener('click',()=>{if(voiceCoverage(record))onOpenText(structuredClone(voiceCoverage(record)));});
  return {stop,get running(){return opening||player.running||player.starting;},get loading(){return !!loading;}};
}
