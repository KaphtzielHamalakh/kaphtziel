const REASONS={'no-source-correspondence':'No checked pronunciation correspondence for this word.','source-only-written-form':'The pronunciation source has no exact written range for this word form.','incomplete-source-path':'A complete shared Hebrew span is unavailable.','no-individual-word-units':'The source form is combined or has no individually owned units.'};
export function renderPronunciationScoreGroups(target,report,word){
 target.replaceChildren();
 const item=report?.words?.find(w=>w.wordId===word?.id),message=document.createElement('p');
 message.className='muted';
 if(!item){message.textContent=report?.error??'Select a word included in the current score span.';target.append(message);return;}
 const hebrew=document.createElement('p');hebrew.lang='he';hebrew.dir='rtl';hebrew.className='pronunciation-group-hebrew';hebrew.textContent=item.hebrew;target.append(hebrew);
 if(!item.groups.length){message.textContent=REASONS[item.reason]??'No checked common span.';target.append(message);return;}
 message.textContent='Each row relates the same marked Hebrew span. Different syllable divisions stay separate; a common span does not assign a pronunciation syllable to each note.';target.append(message);
 const table=document.createElement('table');table.className='pronunciation-score-groups';
 const head=document.createElement('thead'),hr=document.createElement('tr');
 for(const text of ['Marked Hebrew','Score syllables','Pronunciation source','Correspondence']){const th=document.createElement('th');th.scope='col';th.textContent=text;hr.append(th);}head.append(hr);table.append(head);
 const body=document.createElement('tbody');
 for(const group of item.groups){
  const row=document.createElement('tr');row.dataset.groupId=group.id;row.dataset.relation=group.relation;
  const h=document.createElement('td');h.lang='he';h.dir='rtl';h.textContent=group.hebrew;row.append(h);
  const score=document.createElement('td');
  group.scoreSyllables.forEach((s,i)=>{if(i)score.append(document.createTextNode(' | '));const span=document.createElement('span');span.lang='he';span.dir='rtl';span.textContent=s.hebrew;score.append(span);if(s.printedLyrics.length){const lyric=document.createElement('small');lyric.dir='ltr';lyric.textContent=' ('+s.printedLyrics.join(' / ')+')';score.append(lyric);}});row.append(score);
  const source=document.createElement('td');source.dir='ltr';
  group.sourceUnits.forEach((u,i)=>{if(i)source.append(document.createTextNode(' · '));const span=document.createElement(u.sourceStress?'strong':'span');span.textContent=u.text;source.append(span);
   const cues=[u.sourceStress?'Primary stress':'',u.hebrewUnderlay?.variants.some(v=>v.sharesNextConsonant)?'Shares consonant with next source unit':'',u.hebrewUnderlay?.variants.some(v=>v.sharesPreviousConsonant)?'Shares consonant with previous source unit':''].filter(Boolean);
   if(cues.length){const cue=document.createElement('small');cue.textContent=cues.join(' · ');source.append(cue);}
  });
  const provenance=document.createElement('small');provenance.textContent=`Row ${group.sourceRow}, column ${group.sourceColumn}${group.sourceReference?' · original repeat reference retained':''}`;source.append(provenance);row.append(source);
  const relation=document.createElement('td');relation.textContent=group.relation==='different-syllable-divisions'?`${group.scoreSyllables.length} score / ${group.sourceUnits.length} source syllables · shared span only`:'Same written syllable';row.append(relation);body.append(row);
 }
 table.append(body);const scroll=document.createElement('div');scroll.className='table-scroll';scroll.append(table);target.append(scroll);
}
