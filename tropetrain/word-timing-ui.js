import {getCorpus} from './library.js';
import {createWordTimingDraft,parseWordTimingDraft,setWordBoundary,draftWordSpan} from './word-timing-draft.js';

export function mountWordTimingDraft({position,onAudition}){
  const $=id=>document.getElementById(id),panel=$('word-timing-review');
  let generation=0,draft=null,record=null,selected=0,available=false;
  const key=()=>`tropetrain-word-timing-draft-v1:${record.audio.sha256}`;
  const message=text=>{$('word-timing-status').textContent=text;};
  function save(){
    try{localStorage.setItem(key(),JSON.stringify(draft));message('Draft saved on this device. Source edition, musical notes and phonology remain unreviewed.');}
    catch{message('Device storage unavailable. Copy the draft JSON to retain these annotations.');}
  }
  function draw(){
    const word=draft?.words[selected];$('word-timing-editor').hidden=!word;
    if(!word)return;
    $('word-timing-word').textContent=word.hebrew;$('word-timing-id').textContent=word.id;
    $('word-timing-select').value=String(selected);
    for(const k of ['start','end']){$(`word-timing-${k}`).value=word[k]??'';$(`word-timing-${k}`).max=draft.source.duration;}
    const complete=draft.words.filter(w=>w.start!==null&&w.end!==null).length;
    $('word-timing-count').textContent=`${complete} / ${draft.words.length} words have two draft boundaries. No boundaries are inferred.`;
    $('word-timing-audition').disabled=!available||word.start===null||word.end===null;
    $('word-timing-previous').disabled=selected===0;$('word-timing-next').disabled=selected===draft.words.length-1;
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
  return {
    setAvailable(value){available=value;draw();},
    async select(nextRecord,coverage){
      const current=++generation;record=nextRecord;draft=null;selected=0;available=false;draw();
      $('word-timing-json').value='';$('word-timing-select').replaceChildren();
      $('word-timing-empty').hidden=!!coverage;panel.open=false;
      if(!coverage){message(nextRecord.sourceCatalogRow?'Exact source passage boundaries are not established for this recording. Word timing remains unassigned.':'Cantillation-name tables have no Bible-word mapping.');return;}
      message('Loading unchanged source-passage reader words…');
      try{
        const corpus=await getCorpus();if(current!==generation)return;
        const passage=corpus.passage([{...coverage,id:'word-timing-review'}]);
        draft=createWordTimingDraft(nextRecord,coverage,passage.verses.flatMap(v=>v.words));
        let saved;try{saved=localStorage.getItem(key());}catch{}
        if(saved){try{draft=parseWordTimingDraft(saved,draft);message('Personal draft restored; source edition and boundaries remain unreviewed.');}catch(error){message(`Saved draft withheld: ${error.message}`);}}
        else message('No word times assigned. Enter boundaries from the original recording; every saved mark remains an unreviewed draft.');
        draft.words.forEach((w,i)=>{const option=document.createElement('option');option.value=i;option.textContent=`${i+1} · ${w.hebrew} · ${w.id}`;$('word-timing-select').append(option);});
        draw();
      }catch(error){if(current===generation)message(error.message);}
    }
  };
}
