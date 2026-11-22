import {phoneticWordsAvailable,loadPhoneticWords,validatePhoneticWords,phoneticWordView} from './phonetic-word.js';

export function mountPhoneticWordReview(){
 const $=id=>document.getElementById(id),panel=$('phonetic-word-review'),cache=new Map();
 let generation=0,record=null,draft=null,index=0,packet=null;
 function draw(){
  const available=!!draft&&phoneticWordsAvailable(record);panel.hidden=!available;
  $('phonetic-word-hebrew').textContent=available?draft.words[index].hebrew:'';
  $('phonetic-word-hebrew').dataset.wordId=available?draft.words[index].id:'';
  $('phonetic-word-evidence').replaceChildren();$('phonetic-word-context').replaceChildren();
  if(!available)return;
  const style=$('pronunciation-style').value;
  $('phonetic-word-style').textContent=`Comparing with ${style==='ashkenazic'?'Ashkenazic':'Sephardic'} Phonetic MAM text. This changes the comparison only; the recording keeps its own pronunciation.`;
  $('phonetic-word-load').disabled=!!packet;
  if(!packet){$('phonetic-word-count').textContent='Load the optional phonetic study to compare consonants with this unchanged Hebrew word.';return;}
  const view=phoneticWordView(packet,index,style),word=view.word;
  $('phonetic-word-count').textContent=`${word.candidateConsonants.length} provisional consonant comparisons; ${word.ambiguousConsonantReferences} ambiguous references and ${word.crossModelClockDisagreements} clock disagreements withheld. Vowels and sung boundaries remain unassigned.`;
  if(!word.candidateConsonants.length){const p=document.createElement('p');p.textContent='No unambiguous consonant comparison for this word. Review the original recording; no sound or time has been filled.';$('phonetic-word-evidence').append(p);return;}
  const events=new Map(word.sourceEvents.map(e=>[e.eventId,e])),list=document.createElement('ul');
  for(const candidate of word.candidateConsonants){
   const li=document.createElement('li'),model=document.createElement('span');model.className='phonetic-model-glyph';model.lang='und-fonipa';model.dir='ltr';model.textContent=candidate.modelGlyph;
   const sources=candidate.sourceEventCandidates.map(id=>events.get(id)),ranges=sources.flatMap(e=>e.sourceClusters.flatMap(b=>b.readerClusterRanges??[])),unique=[...new Map(ranges.map(r=>[`${r.readerWordId}:${r.start}:${r.end}`,r])).values()];
   const hebrew=document.createElement('b');hebrew.className='phonetic-source-cluster';hebrew.lang='he';hebrew.dir='rtl';hebrew.textContent=unique.map(r=>r.text).join(' · ')||word.hebrew;
   li.append(hebrew,document.createTextNode(' → model '),model);
   const note=document.createElement('small');note.textContent=!candidate.letterBindingUnique?' · word link only; letter unresolved':sources[0].sourceUnitIds.length===2?' · shared consonant, two source syllables':sources[0].classes.length>1?' · component of one source consonant':' · source consonant comparison';li.append(note);list.append(li);
  }
  $('phonetic-word-evidence').append(list);
  for(const context of view.contexts){
   const p=document.createElement('p');p.className='phonetic-model-context';p.lang='und-fonipa';p.dir='ltr';let offset=0;
   for(const span of context.highlights){p.append(document.createTextNode(context.text.slice(offset,span.start)));const mark=document.createElement('mark');mark.textContent=context.text.slice(span.start,span.end);p.append(mark);offset=span.end;}
   p.append(document.createTextNode(context.text.slice(offset)));$('phonetic-word-context').append(p);
  }
 }
 $('phonetic-word-load').addEventListener('click',async()=>{
  if(!draft||!phoneticWordsAvailable(record))return;
  const current=generation,chosen=record,expected=draft;$('phonetic-word-load').disabled=true;$('phonetic-word-status').textContent='Loading checked source phonetic evidence…';
  try{const value=await loadPhoneticWords(chosen,expected);if(current!==generation)return;packet=value;cache.set(chosen.id,value);draw();$('phonetic-word-status').textContent='Unreviewed model consonants loaded. Hebrew, source syllables and personal timing drafts stay unchanged.';}
  catch(error){if(current===generation){$('phonetic-word-load').disabled=false;$('phonetic-word-status').textContent=error.message;}}
 });
 $('pronunciation-style').addEventListener('change',draw);
 return {select(nextRecord,nextDraft,nextIndex){
  if(record?.id!==nextRecord?.id||record?.audio.sha256!==nextRecord?.audio.sha256){generation++;packet=null;$('phonetic-word-status').textContent='';}
  record=nextRecord;draft=nextDraft;index=nextIndex;
  if(draft&&!packet&&cache.has(record.id))packet=validatePhoneticWords(cache.get(record.id),draft);
  draw();
 }};
}
