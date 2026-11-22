import {HISTORICAL_ACCENT_PROFILES,historicalAccentProfile,historicalWordEvidence} from './historical-pronunciation.js';
export function mountHistoricalPronunciation(){
 const $=id=>document.getElementById(id),key='tropetrain-historical-accent-evidence-v1';
 let profileId=HISTORICAL_ACCENT_PROFILES[0].id,study=null,word=null,sourceStyle='sephardic',report=null;
 try{const saved=JSON.parse(localStorage.getItem(key));if(HISTORICAL_ACCENT_PROFILES.some(p=>p.id===saved?.profileId))profileId=saved.profileId;}catch{}
 for(const profile of HISTORICAL_ACCENT_PROFILES){const option=document.createElement('option');option.value=profile.id;option.textContent=profile.label;$('historical-accent-profile').append(option);}
 $('historical-accent-profile').value=profileId;
 function render(){
  const profile=historicalAccentProfile(profileId);report=null;
  $('historical-accent-observations').replaceChildren();$('historical-accent-word').replaceChildren();$('historical-accent-export').disabled=true;
  $('historical-accent-download').hidden=true;$('historical-accent-download').removeAttribute('href');
  $('historical-accent-label-status').textContent=`${profile.label} · documented label; full pronunciation rules and singing voice pending.`;
  for(const observation of profile.observations){const li=document.createElement('li');li.textContent=observation.description;$('historical-accent-observations').append(li);}
  $('historical-accent-status').textContent='Choose a Hebrew word to inspect its source categories. All 87 category rules for this profile remain unassigned.';
  if(!word)return;
  try{report=historicalWordEvidence(study,word,sourceStyle,profileId);}catch(error){$('historical-accent-status').textContent=error.message;return;}
  const marked=document.createElement('b');marked.lang='he';marked.dir='rtl';marked.textContent=report.hebrew;$('historical-accent-word').append(marked);
  const identity=document.createElement('p');identity.className='muted';identity.textContent=`${report.sourceWordId}${report.wordId!==report.sourceWordId?' · occurrence '+report.wordId:''}`;$('historical-accent-word').append(identity);
  const style=sourceStyle==='sephardic'?'Sephardic':'Ashkenazic';
  $('historical-accent-status').textContent=report.sourceCategoryStatus==='source-categories-available'?`${style} MAM text · ${report.counts.categoryReferences} source category references; ${report.counts.relatedObservationReferences} reference${report.counts.relatedObservationReferences===1?' has':'s have'} related help observations. All ${report.counts.unassignedRealizations} phonetic realizations remain unassigned. These observations do not pronounce this word.`:'No checked source categories for this word. The historical profile choice and marked Hebrew are kept; no categories or sounds are substituted.';
  if(report.units.length){
   const table=document.createElement('table');table.className='historical-accent-table';
   const caption=document.createElement('caption');caption.textContent='Unchanged source syllables and category evidence';table.append(caption);
   const head=document.createElement('tr');for(const text of ['Source syllable','Category and shared part','Related help observation']){const th=document.createElement('th');th.scope='col';th.textContent=text;head.append(th);}const thead=document.createElement('thead');thead.append(head);table.append(thead);
   const body=document.createElement('tbody');
   for(const unit of report.units)for(const fragment of unit.fragments){
    const tr=document.createElement('tr');tr.dataset.sourceSegmentId=fragment.sourceSegmentId;tr.dataset.ownerWordId=unit.ownerWordId??'';
    const syllable=document.createElement('td'),text=document.createElement(unit.sourceStress?'strong':'span');text.textContent=unit.sourceText;syllable.append(text);
    const marked=document.createElement('span');marked.lang='he';marked.dir='rtl';marked.className='historical-accent-hebrew';marked.textContent=unit.readerRanges?unit.readerRanges.filter(r=>r.role==='written').map(r=>r.text).join(' '):unit.sourceHebrew.text;syllable.append(marked);
    const scope=document.createElement('small');scope.textContent=unit.readerRanges?'Written Hebrew syllable':'Source Hebrew · written range unresolved';syllable.append(scope);
    const category=document.createElement('td');category.textContent=fragment.label;const part=document.createElement('small');part.textContent=fragment.part==='whole'?'Whole source category':fragment.part==='first-half-shared'?'First half · shared consonant':'Second half · shared consonant';category.append(part);
    const evidence=document.createElement('td');evidence.textContent=fragment.observations.length?fragment.observations.map(id=>profile.observations.find(o=>o.id===id).description).join(' '):'No related observation in the recovered help.';
    const pending=document.createElement('small');pending.textContent='Pronunciation rule unassigned';evidence.append(pending);tr.append(syllable,category,evidence);body.append(tr);
   }
   table.append(body);$('historical-accent-word').append(table);
  }
  $('historical-accent-export').disabled=false;
 }
 $('historical-accent-profile').addEventListener('change',()=>{profileId=$('historical-accent-profile').value;try{localStorage.setItem(key,JSON.stringify({profileId}));}catch{}render();});
 $('historical-accent-export').addEventListener('click',()=>{
  if(!report)return;const link=$('historical-accent-download');link.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(report,null,2)+'\n');link.download=`${report.sourceWordId}-${profileId}-evidence.json`;link.hidden=false;
 });
 render();return{show(value,currentWord,style){study=value;word=currentWord;sourceStyle=style;render();}};
}
