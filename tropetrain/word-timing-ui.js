import {getCorpus} from './library.js';
import {recordingIdentity,createWordTimingDraft,parseWordTimingDraft,setWordBoundary,draftWordSpan} from './word-timing-draft.js';
import {wordSupportAvailable,loadWordSupport,wordSupportContext,validateWordSupport} from './word-support.js';
import {mountObservedWordCues} from './observed-word-cues-ui.js';
import {mountPhoneticWordReview} from './phonetic-word-ui.js';

export function mountWordTimingDraft({position,onAudition}){
  const $=id=>document.getElementById(id),panel=$('word-timing-review');
  let generation=0,draft=null,record=null,selected=0,available=false,retainedWordId=null,support=null;
  const supportCache=new Map();
  const phonetic=mountPhoneticWordReview(),observed=mountObservedWordCues({onAudition});
  const key=()=>`tropetrain-word-timing-draft-v1:${recordingIdentity(record).sha256}`;
  const message=text=>{$('word-timing-status').textContent=text;};
  function save(){
    try{localStorage.setItem(key(),JSON.stringify(draft));message('Draft saved on this device. Source edition, musical notes and phonology remain unreviewed.');}
    catch{message('Device storage unavailable. Copy the draft JSON to retain these annotations.');}
  }
  function draw(){
    phonetic.select(record,draft,selected);observed.select(record,draft,selected,available);
    const word=draft?.words[selected];$('word-timing-editor').hidden=!word;
    $('word-support-panel').hidden=!word||!wordSupportAvailable(record);
    if(!word)return;
    retainedWordId=word.id;
    $('word-timing-word').textContent=word.hebrew;$('word-timing-id').textContent=word.id;
    $('word-timing-select').value=String(selected);
    for(const k of ['start','end']){$(`word-timing-${k}`).value=word[k]??'';$(`word-timing-${k}`).max=draft.source.duration;}
    const complete=draft.words.filter(w=>w.start!==null&&w.end!==null).length;
    $('word-timing-count').textContent=`${complete} / ${draft.words.length} words have two draft boundaries. No boundaries are inferred.`;
    $('word-timing-audition').disabled=!available||word.start===null||word.end===null;
    $('word-timing-previous').disabled=selected===0;$('word-timing-next').disabled=selected===draft.words.length-1;
    const candidate=support?.words[selected];$('word-support-load').disabled=!!support;
    $('word-support-audition').disabled=!available||!candidate;
    $('word-support-word').textContent=candidate?
      `Model support ${candidate.modelSupport.start.toFixed(3)}–${candidate.modelSupport.end.toFixed(3)} seconds. ${candidate.evidence.lettersWithArgmaxSupport}/${candidate.evidence.targetLetters} written letters have direct model agreement. ${candidate.evidence.lettersWithArgmaxSupport===0?'No directly supported letters; this location is especially uncertain. ':''}Onsets and sung tails need listening review.`:
      'Load the optional study to locate this word for listening review. Saved boundaries stay unchanged.';
  }
  function update(boundary,value){
    try{draft=setWordBoundary(draft,selected,boundary,value);save();}
    catch(error){message(error.message);}
    draw();
  }
  for(const boundary of ['start','end']){
    $(`word-timing-${boundary}`).addEventListener('change',()=>{
      const value=$(`word-timing-${boundary}`).value;update(boundary,value===''?null:Number(value));
    });
    $(`word-timing-capture-${boundary}`).addEventListener('click',()=>{
      const current=position();
      if(!current||current.recordId!==record?.id){message('Play this source recording before using its playhead.');return;}
      update(boundary,Math.round(current.seconds*1000)/1000);
      if(current.mode==='muted')message('Muted-clock boundary saved as a personal draft; it is not evidence of a sung word boundary.');
    });
  }
  $('word-timing-select').addEventListener('change',()=>{selected=Number($('word-timing-select').value);draw();});
  for(const [id,delta] of [['previous',-1],['next',1]])$(`word-timing-${id}`).addEventListener('click',()=>{selected+=delta;draw();});
  $('word-timing-clear').addEventListener('click',()=>{
    if(!draft)return;const next=structuredClone(draft);next.words[selected].start=null;next.words[selected].end=null;draft=next;save();draw();
  });
  $('word-timing-audition').addEventListener('click',()=>{try{onAudition(draftWordSpan(draft,selected));message('Auditioning a personal draft interval in the unchanged source recording.');}catch(error){message(error.message);}});
  $('word-timing-export').addEventListener('click',()=>{
    $('word-timing-json').value=JSON.stringify(draft,null,2);message('Draft JSON prepared below. Copy it to save or share for review.');
  });
  $('word-timing-import').addEventListener('click',()=>{
    try{draft=parseWordTimingDraft($('word-timing-json').value,draft);save();draw();}
    catch(error){message(`Draft not imported: ${error.message}`);}
  });
  $('word-support-load').addEventListener('click',async()=>{
    if(!draft||!wordSupportAvailable(record))return;
    const current=generation,selectedRecord=record,expected=draft;$('word-support-load').disabled=true;
    $('word-support-status').textContent='Loading source-specific model support…';
    try{
      const value=await loadWordSupport(selectedRecord,expected);if(current!==generation)return;
      support=value;supportCache.set(selectedRecord.id,value);draw();
      $('word-support-status').textContent='Unreviewed model support loaded. Listen with context, then enter heard boundaries yourself. No draft times were filled.';
    }catch(error){if(current===generation){$('word-support-load').disabled=false;$('word-support-status').textContent=error.message;}}
  });
  $('word-support-audition').addEventListener('click',()=>{
    try{onAudition(wordSupportContext(support,selected));$('word-support-status').textContent='Auditioning model support with one second of context on each side. The interval is not a confirmed word or syllable duration.';}
    catch(error){$('word-support-status').textContent=error.message;}
  });
  return {
    setAvailable(value){available=value;draw();},
    selectWord(wordId,expectedHebrew){
      const index=draft?.words.findIndex(w=>w.id===wordId)??-1;
      if(expectedHebrew!==undefined&&(index<0||draft.words[index].hebrew!==expectedHebrew))return false;
      retainedWordId=wordId;if(index<0)return false;selected=index;draw();return true;
    },
    async select(nextRecord,coverage){
      const keepOpen=panel.open&&JSON.stringify(draft?.coverage)===JSON.stringify(coverage);
      const current=++generation;record=nextRecord;draft=null;support=null;selected=0;available=false;draw();
      $('word-timing-source-status').textContent=nextRecord.linkedSourcePassageEvidence?.wordTimingNotice??(nextRecord.linkedSourcePassageEvidence?'Linked reading candidate. The companion text lists Numbers 19:1–17; exact recording endpoints and text-edition correspondence remain unreviewed. Automatic hints never fill heard boundaries.':nextRecord.catalogPassageEvidence?(coverage?'Catalog passage candidate. These exact reader words follow the source catalog; recording content and edition correspondence are unreviewed. Automatic support does not fill heard boundaries.':'The source passage is withheld because documentary and acoustic evidence disagree. No corrected passage or word draft is assigned.'):'');
      $('word-timing-json').value='';$('word-timing-select').replaceChildren();
      $('word-support-status').textContent='';
      $('word-timing-empty').hidden=!!coverage;panel.open=keepOpen;
      if(!coverage){message(nextRecord.sourceCatalogRow?'Exact source passage boundaries are not established for this recording. Word timing remains unassigned.':'Cantillation-name tables have no Bible-word mapping.');return;}
      message('Loading unchanged source-passage reader words…');
      try{
        const corpus=await getCorpus();if(current!==generation)return;
        const passage=corpus.passage([{...coverage,id:'word-timing-review'}]);
        draft=createWordTimingDraft(nextRecord,coverage,passage.verses.flatMap(v=>v.words));
        let saved;try{saved=localStorage.getItem(key());}catch{}
        if(saved){try{draft=parseWordTimingDraft(saved,draft);message('Personal draft restored; source edition and boundaries remain unreviewed.');}catch(error){message(`Saved draft withheld: ${error.message}`);}}
        else message('No word times assigned. Enter boundaries from the original recording; every saved mark remains an unreviewed draft.');
        selected=Math.max(0,draft.words.findIndex(w=>w.id===retainedWordId));
        const cached=supportCache.get(nextRecord.id);support=cached?validateWordSupport(cached,draft):null;
        draft.words.forEach((w,i)=>{const option=document.createElement('option');option.value=i;option.textContent=`${i+1} · ${w.hebrew} · ${w.id}`;$('word-timing-select').append(option);});
        draw();
      }catch(error){if(current===generation)message(error.message);}
    }
  };
}
