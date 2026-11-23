import {createRecallDeck,recallReadingIdentity,recallChoices,checkRecallAnswer,randomRecallIndex} from './source-recall.js';
import {appendReaderPronunciation} from './pronunciation-reader.js';

export function mountSourceRecall({getWords,getCursor,getPlayback,getPronunciation,onSelect,onListen,onStop,playButton}){
 const $=id=>document.getElementById(id),dialog=$('recall-dialog');
 let deck=null,index=0,card=null,revealed=false,selecting=false,attempts=0,correct=new Set(),answered=false;
 const announce=text=>{$('recall-feedback').textContent=text;};
 function refreshPronunciation({force=false}={}){
  if(!card||!force&&!dialog.open)return;
  const hint=$('recall-pronunciation-hint'),rows=$('recall-pronunciation-rows');rows.replaceChildren();
  try{
   deck.verify(card,getWords());const preview=getPronunciation(card);hint.hidden=!preview.enabled;if(!preview.enabled)return;
   $('recall-pronunciation-source').textContent=preview.name;
   $('recall-pronunciation-note').textContent=preview.note;
   for(const row of preview.rows){
    const section=document.createElement('section');section.dataset.occurrences=row.wordIds.join(' ');
    const label=document.createElement('p');label.textContent=row.label;
    const text=document.createElement('div');
    if(row.report)appendReaderPronunciation(text,row.report);else text.textContent=row.message??'Loading source pronunciation text…';
    section.append(label,text);rows.append(section);
   }
  }catch(error){hint.hidden=false;$('recall-pronunciation-source').textContent='Source pronunciation hint unavailable';$('recall-pronunciation-note').textContent=error.message;}
 }
 function updatePlayback(){
  const playback=getPlayback();$('recall-listen').disabled=!card||!playback.enabled;
  $('recall-sound-status').textContent=playback.enabled?(playback.label+' · Playback keeps your selected sound controls. Recordings retain their own pronunciation.'):playback.message||'Close practice to choose an available audio source.';
 }
 function resetDeck(next){deck=next;index=0;card=null;revealed=false;attempts=0;correct=new Set();answered=false;}
 function refresh({prepare=false}={}){
  if(selecting)return;
  try{
   const words=getWords(),fingerprint=recallReadingIdentity(words);
   if(deck?.fingerprint!==fingerprint){if(dialog.open)dialog.close();resetDeck(null);}
   if(!deck){
    if(!prepare&&!$('source-recall-practice').open){$('recall-open').disabled=true;$('recall-availability').textContent='Open to prepare source-character questions from this reading.';updatePlayback();return;}
    resetDeck(createRecallDeck(words));
   }
   $('recall-open').disabled=!deck.cards.length;
   const skipped=deck.withheld.reduce((sum,u)=>sum+u.wordIds.length,0);
   $('recall-availability').textContent=`${deck.cards.length.toLocaleString()} source word group${deck.cards.length===1?'':'s'} in this reading${skipped?` · ${skipped.toLocaleString()} words left out where this single-accent drill needs interpretation`:''}.`;
   if(dialog.open&&card)deck.verify(card,words);
   updatePlayback();
  }catch(error){if(dialog.open)dialog.close();deck=null;card=null;$('recall-open').disabled=true;$('recall-availability').textContent=error.message;}
 }
 function showQuestion(){
  $('recall-counter').textContent=`Question ${index+1} of ${deck.cards.length.toLocaleString()}`;
  $('recall-score').textContent=`Session: ${correct.size} correct · ${attempts} attempt${attempts===1?'':'s'}`;
  const first=getWords()[card.startIndex],last=getWords()[card.endIndex];
  $('recall-reference').textContent=first.reference===last.reference?first.reference:`${first.reference}–${last.reference}`;
  const line=$('recall-question');line.replaceChildren();
  for(const word of card.words){
   const element=document.createElement('span');element.className='recall-word';element.dataset.occurrence=word.id;
   for(const cluster of word.clusters){
    const letter=document.createElement('span');letter.className='recall-letter';letter.append(document.createTextNode(cluster.display));
    for(const [i,slot]of cluster.slots.entries()){
     const box=document.createElement('span');box.className='recall-slot '+slot.position;box.style.marginInlineStart=(i*.2)+'em';box.setAttribute('role','img');box.setAttribute('aria-label',`Hidden source accent ${slot.position} the letter`);letter.append(box);
    }
    element.append(letter);
   }
   line.append(element);
  }
  $('recall-answer-word').textContent=card.words.map(w=>w.hebrew).join(' ');
  $('recall-answer-name').textContent=card.target.name;
  $('recall-position-note').textContent=[card.foldedPositions?'Repeated source positions share this accent name. Their count does not specify a melody or stress pattern.':'',card.sourceContextWarnings.includes('paseq-context')?'Paseq remains in the original word; this question names the Shalshelet character.':''].filter(Boolean).join(' ');
  const choices=$('recall-choices');choices.replaceChildren();
  for(const option of recallChoices(card)){
   const button=document.createElement('button');button.type='button';button.dataset.answer=option.id;button.textContent=option.name;
   button.addEventListener('click',()=>{
    try{
     deck.verify(card,getWords());if(revealed||answered)return;
     const result=checkRecallAnswer(card,option.id);attempts++;
     button.dataset.correct=String(result.correct);
     if(result.correct){correct.add(card.id);answered=true;reveal(`Correct: ${card.target.name}.`);}
     else {announce('Try another source-character name, or reveal the answer.');$('recall-score').textContent=`Session: ${correct.size} correct · ${attempts} attempts`;}
    }catch(error){announce(error.message);onStop();}
   });choices.append(button);
  }
  $('recall-previous').disabled=index===0;$('recall-next').disabled=index===deck.cards.length-1;$('recall-random').disabled=deck.cards.length<2;
  applyReveal();updatePlayback();refreshPronunciation({force:true});
 }
 function applyReveal(){
  $('recall-question').hidden=revealed;$('recall-answer').hidden=!revealed;$('recall-reveal').disabled=revealed;
  for(const button of $('recall-choices').children)button.disabled=revealed;
  $('recall-listen').textContent=revealed?'Play answer':'Listen';
 }
 function reveal(message){
  deck.verify(card,getWords());revealed=true;applyReveal();$('recall-score').textContent=`Session: ${correct.size} correct · ${attempts} attempt${attempts===1?'':'s'}`;announce(message??`Answer: ${card.target.name}.`);
 }
 function choose(next,{keepAnswer=false}={}){
  const checked=deck.verify(deck.cards[next],getWords());
  if(!keepAnswer||card?.id!==checked.id){revealed=false;answered=false;}
  index=next;card=checked;selecting=true;
  try{onSelect(checked);}finally{selecting=false;}
  showQuestion();announce('Name the hidden source accent. You can listen before revealing it.');
 }
 $('source-recall-practice').addEventListener('toggle',()=>refresh());
 $('recall-open').addEventListener('click',()=>{
  try{refresh({prepare:true});if(!deck?.cards.length)return;const next=deck.indexForCursor(getCursor());choose(next,{keepAnswer:true});dialog.showModal();$('recall-heading').focus();}
  catch(error){$('recall-availability').textContent=error.message;onStop();}
 });
 for(const [id,delta]of [['recall-previous',-1],['recall-next',1]])$(id).addEventListener('click',()=>{try{choose(index+delta);$('recall-heading').focus();}catch(error){announce(error.message);onStop();}});
 $('recall-random').addEventListener('click',()=>{try{choose(randomRecallIndex(deck.cards.length,index));$('recall-heading').focus();}catch(error){announce(error.message);onStop();}});
 $('recall-reveal').addEventListener('click',()=>{try{reveal();}catch(error){announce(error.message);onStop();}});
 $('recall-listen').addEventListener('click',async()=>{
  try{deck.verify(card,getWords());if(!getPlayback().enabled){updatePlayback();return;}await onListen();}
  catch(error){announce(error.message);onStop();}
 });
 $('recall-stop').addEventListener('click',()=>{onStop();announce('Playback stopped. This question is kept.');});
 $('recall-reset').addEventListener('click',()=>{try{attempts=0;correct.clear();choose(index);announce('Session score reset. This question is kept.');}catch(error){announce(error.message);onStop();}});
 $('recall-close').addEventListener('click',()=>dialog.close());
 $('recall-settings').addEventListener('click',()=>{dialog.close();$('practice-audio').focus();});
 dialog.addEventListener('close',()=>{onStop();});
 // Main playback readiness can change after an asynchronous source-audio load.
 new MutationObserver(updatePlayback).observe(playButton,{attributes:true,attributeFilter:['disabled']});
 refresh();return {refresh,refreshPronunciation};
}
