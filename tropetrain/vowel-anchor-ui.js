import {loadVowelAnchors,validateVowelAnchors,vowelWordView,vowelAnchorsAvailable} from './vowel-anchors.js';

export function mountVowelAnchorReview(){
 const $=id=>document.getElementById(id),panel=$('vowel-anchor-review'),cache=new Map();
 let generation=0,record=null,draft=null,index=0,consonants=null,packet=null;
 function draw(){
  const available=!!draft&&!!consonants&&vowelAnchorsAvailable(record);panel.hidden=!available;
  $('vowel-anchor-hebrew').textContent=available?draft.words[index].hebrew:'';
  $('vowel-anchor-hebrew').dataset.wordId=available?draft.words[index].id:'';
  $('vowel-anchor-caption-hebrew').textContent=available?draft.words[index].hebrew:'';
  $('vowel-anchor-caption-hebrew').dataset.wordId=available?draft.words[index].id:'';
  $('vowel-anchor-rows').replaceChildren();if(!available)return;
  $('vowel-anchor-load').disabled=!!packet;
  if(!packet){$('vowel-anchor-count').textContent='Load optional observations to compare model vowel text with the source syllables.';return;}
  const view=vowelWordView(packet,index,$('pronunciation-style').value);
  const count=view.word.candidateVowels.length,nuclei=view.word.sourceVowels.length;
  const pending=view.rows.filter(r=>r.unsplitCompound).length;
  $('vowel-anchor-count').textContent=`${count} provisional model ${count===1?'observation':'observations'} for ${nuclei} source vowel ${nuclei===1?'category':'categories'}.${pending?` ${pending} compound source ${pending===1?'unit is':'units are'} kept unsplit.`:''} Vowel quality, quantity, stress and sung boundaries remain unreviewed.`;
  for(const row of view.rows){
   const source=row.source,tr=document.createElement('tr');tr.dataset.sourceUnit=source.sourceUnitId;
   const hebrew=document.createElement('td'),b=document.createElement('b');b.lang='he';b.dir='rtl';b.className='vowel-source-hebrew';
   // Reader spelling and every accent remain exact; source variants are extra evidence.
   b.textContent=source.parentSyllableReaderRanges.filter(r=>r.role==='written').map(r=>r.text).join('');hebrew.append(b);
   if(source.parentSyllableReaderRanges.some(r=>r.role==='shared-consonant')){const note=document.createElement('small');note.textContent='Shares the next consonant';hebrew.append(note);}
   if(!source.sourceMarkedTextEqualsWrittenRanges){const note=document.createElement('small'),variant=document.createElement('b');variant.lang='he';variant.dir='rtl';variant.textContent=source.sourceHebrew.text;note.append(document.createTextNode('Source marks differ: '),variant);hebrew.append(note);}
   const text=document.createElement('td'),unit=document.createElement(source.sourceStress?'strong':'span');unit.lang='en';unit.dir='ltr';unit.textContent=source.sourceUnitText;text.append(unit);
   const label=document.createElement('small');label.textContent=source.categoryLabel+' · source transcription';text.append(label);
   const model=document.createElement('td');
   if(!row.observations.length){const missing=document.createElement('small');missing.textContent=row.unsplitCompound?'Compound unit kept intact; no separate vowel observation':'No unambiguous observation';model.append(missing);}
   for(const observation of row.observations){const raw=document.createElement('span');raw.className='vowel-model-observation';raw.lang='und-fonipa';raw.dir='ltr';raw.textContent=observation.modelText;model.append(raw);if(observation.crossWordAnchorContext){const note=document.createElement('small');note.textContent='Uses a neighboring word’s consonant as context';model.append(note);}}
   tr.append(hebrew,text,model);$('vowel-anchor-rows').append(tr);
  }
 }
 $('vowel-anchor-load').addEventListener('click',async()=>{
  if(!draft||!consonants||!vowelAnchorsAvailable(record))return;
  const current=generation,chosen=record,expected=draft,prior=consonants;$('vowel-anchor-load').disabled=true;$('vowel-anchor-status').textContent='Loading checked structural vowel observations…';
  try{const value=await loadVowelAnchors(chosen,expected,prior);if(current!==generation)return;packet=value;cache.set(chosen.id,value);draw();$('vowel-anchor-status').textContent='Model vowel observations loaded. Source text, accents, syllables, shared consonants and your timing draft stay unchanged.';}
  catch(error){if(current===generation){$('vowel-anchor-load').disabled=false;$('vowel-anchor-status').textContent=error.message;}}
 });
 return {select(nextRecord,nextDraft,nextIndex,nextConsonants){
  if(record?.id!==nextRecord?.id||record?.audio.sha256!==nextRecord?.audio.sha256){generation++;packet=null;$('vowel-anchor-status').textContent='';}
  record=nextRecord;draft=nextDraft;index=nextIndex;consonants=nextConsonants;
  if(draft&&consonants&&!packet&&cache.has(record.id))packet=validateVowelAnchors(cache.get(record.id),draft,consonants);
  draw();
 }};
}
