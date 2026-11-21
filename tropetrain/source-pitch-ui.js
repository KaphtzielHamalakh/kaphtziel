import {SourcePitchStore,pitchManifest,pitchWordWindow,pitchFrame} from './source-pitch.js';
export function mountSourcePitch({getWord,getReferences}){
 const $=id=>document.getElementById(id),store=new SourcePitchStore();let generation=0,currentKey=null,data=null,window=null,recording=null,url=null;
 const set=(id,text)=>$(id).textContent=text;
 function clear(){data=window=recording=null;$('source-pitch-chart').replaceChildren();$('source-pitch-frame').replaceChildren();$('source-pitch-frame').disabled=true;$('source-pitch-export').disabled=true;set('source-pitch-readout','');set('source-pitch-range','');set('source-pitch-word','');}
 function frame(){const value=pitchFrame(window?.series[Number($('source-pitch-frame').value)]);set('source-pitch-readout',value?`${value.seconds.toFixed(3)} s in original recording · ${value.hz.toFixed(1)} Hz · periodicity score ${value.periodicity.toFixed(4)}. This is an estimated fundamental frequency, not an identified musical note.`:'No frame passed the measurement thresholds in this word window.');}
 function chart(){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 800 240');svg.setAttribute('role','img');svg.setAttribute('aria-label',`Estimated fundamental frequency for ${window.hebrew}; ${window.series.length} measured frames of ${window.frames}. Gaps are unassigned, not rests.`);
  const text=(x,y,value)=>{const t=document.createElementNS(ns,'text');t.setAttribute('x',x);t.setAttribute('y',y);t.textContent=value;svg.append(t);};
  for(const hz of [65,110,220,440,600]){const y=205-180*Math.log2(hz/65)/Math.log2(600/65);const l=document.createElementNS(ns,'path');l.setAttribute('d',`M45 ${y}H790`);l.setAttribute('class','pitch-grid');svg.append(l);text(3,y+4,String(hz));}
  const path=document.createElementNS(ns,'path');path.setAttribute('class','pitch-points');
  path.setAttribute('d',window.series.map(row=>{const p=pitchFrame(row),x=45+745*(p.seconds-window.startSeconds)/(window.endSeconds-window.startSeconds),y=205-180*Math.log2(p.hz/65)/Math.log2(600/65);return `M${x.toFixed(2)} ${y.toFixed(2)}h.1`;}).join(''));
  svg.append(path);text(45,232,window.startSeconds.toFixed(3)+' s');text(705,232,window.endSeconds.toFixed(3)+' s');text(3,17,'Hz');$('source-pitch-chart').append(svg);
 }
 async function refresh(){
  if(!$('source-pitch-study').open){generation++;currentKey=null;return;}
  const word=getWord(),refs=getReferences(),key=JSON.stringify([word?.id,word?.sourceHebrew,!!refs]);if(key===currentKey)return;currentKey=key;const request=++generation;clear();
  set('source-pitch-status','Loading pitch evidence for the selected Hebrew word…');
  try{
   if(!refs)throw Error('The recorded-reference catalog is still loading.');const entry=refs.at(word);if(!entry)throw Error('This word has no PocketTorah reference. Pitch evidence covers Torah recordings only.');
   if(entry.recording.status!=='aligned')throw Error('Source word timings need review. Use the complete recording; no word pitch window is assigned.');
   const loaded=await store.get(entry.recording.id);if(request!==generation)return;
   const selected=pitchWordWindow(loaded,entry,word);data=loaded;window=selected;recording=entry.recording;
   set('source-pitch-word',`${word.sourceHebrew}`);set('source-pitch-status',`${recording.title} · ${word.reference}, word ${word.ordinal} · ${selected.series.length} measured / ${selected.frames} source-time frames · ${selected.frames-selected.series.length} unassigned.`);
   set('source-pitch-range',`${selected.startSeconds.toFixed(6)}–${selected.endSeconds.toFixed(6)} source seconds · ${selected.endKind}. Canonical ${selected.wordId}; occurrence ${selected.occurrenceId}. ${selected.comparison==='exact'?'Exact marked source correspondence.':`Recording source Hebrew: ${selected.sourceHebrew} (${selected.comparison}); reader Hebrew and accents are retained.`}`);
   const options=document.createDocumentFragment();for(const [index,row] of selected.series.entries()){const p=pitchFrame(row),o=document.createElement('option');o.value=index;o.textContent=`${p.seconds.toFixed(3)} s · ${p.hz.toFixed(1)} Hz`;options.append(o);}$('source-pitch-frame').append(options);$('source-pitch-frame').disabled=!selected.series.length;frame();chart();$('source-pitch-export').disabled=false;
  }catch(error){if(request===generation){clear();set('source-pitch-status',error.message);}}
 }
 $('source-pitch-study').addEventListener('toggle',refresh);$('source-pitch-frame').addEventListener('change',frame);
 $('source-pitch-export').addEventListener('click',()=>{if(!data||!window)return;if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob([JSON.stringify({schema:'tropetrain-source-pitch-word-study-v1',revision:1,measurementId:data.id,sourceAudio:data.sourceAudio,decodedPcm:data.decodedPcm,parameters:data.parameters,implementationSha256:data.implementationSha256,referencePacketSha256:data.referencePacketSha256,rights:data.rights,limits:data.limits,window},null,2)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${window.wordId}-pitch-evidence.json`;a.click();});
 set('source-pitch-catalog',`${pitchManifest.records.length} original recordings measured offline; source-time evidence only. Independent acoustic and musical review is pending.`);
 return {refresh};
}
