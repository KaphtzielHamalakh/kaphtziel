import {ALL_PHONOLOGY_PROFILES as PHONOLOGY_PROFILES,phonologyWordProposal} from './pronunciation-phonology.js';
export function mountPhonologyPreview(){
 const $=id=>document.getElementById(id),key='tropetrain-phonology-preview-v1';
 let profileId=PHONOLOGY_PROFILES[0].id,study=null,word=null,style='sephardic',report=null;
 try{const saved=JSON.parse(localStorage.getItem(key));if(PHONOLOGY_PROFILES.some(p=>p.id===saved?.profileId))profileId=saved.profileId;}catch{}
 for(const p of PHONOLOGY_PROFILES){const option=document.createElement('option');option.value=p.id;option.textContent=p.label;$('phonology-profile').append(option);}
 $('phonology-profile').value=profileId;
 function render(){
  report=null;$('phonology-word').replaceChildren();$('phonology-export').disabled=true;$('phonology-download').hidden=true;$('phonology-download').removeAttribute('href');
  $('phonology-status').textContent='Choose a Hebrew word to compare source-based phonemic proposals.';if(!word)return;
  try{report=phonologyWordProposal(study,word,style,profileId);}catch(e){$('phonology-status').textContent=e.message;return;}
  const credit=$('phonology-source-credit');credit.replaceChildren();const sourceLink=document.createElement('a');sourceLink.href=report.source.url;sourceLink.textContent=report.source.title;credit.append(sourceLink,document.createTextNode(report.source.license?' · '+report.source.license+' · source-category adaptation; review pending.':' · attributed linguistic facts; review pending.'));
  const marked=document.createElement('b');marked.lang='he';marked.dir='rtl';marked.textContent=report.hebrew;$('phonology-word').append(marked);
  $('phonology-status').textContent=report.sourceCategoryStatus==='source-categories-unavailable'?'No checked source categories for this word. The marked Hebrew is retained; no pronunciation is substituted.':`${report.counts.proposedReferences} of ${report.counts.categoryReferences} selected category references have phonemic proposals; ${report.counts.unassignedReferences} remain unassigned. ${report.counts.contextGaps} source-group sequence issue${report.counts.contextGaps===1?'':'s'} need review. All acoustic realizations remain unassigned.`;
  for(const route of report.routes){
   if(!route.units.some(u=>u.selected))continue;
   const section=document.createElement('section'),title=document.createElement('p');title.className='muted';title.textContent=`Source row ${route.sourceRow} · transcription column ${route.sourceColumn} · Hebrew branch ${route.hebrewColumn}`;section.append(title);
   const list=document.createElement('ol');list.className='phonology-unit-list';
   for(const unit of route.units.filter(u=>u.selected)){
    const li=document.createElement('li');li.dataset.sourceUnitId=unit.sourceUnitId;
    const hebrew=document.createElement('span');hebrew.lang='he';hebrew.dir='rtl';hebrew.className='pronunciation-hebrew-underlay';
    hebrew.textContent=unit.readerRanges?unit.readerRanges.filter(r=>r.role==='written').map(r=>r.text).join(' '):unit.sourceHebrew.text;li.append(hebrew);
    const source=document.createElement('small');source.textContent=`Source ${unit.sourceText} · ${unit.readerRanges?'written Hebrew':'source Hebrew; written range unresolved'}${unit.ownerWordId===null?' · shared unsplit group':''}`;li.append(source);
    const values=unit.fragments.map(f=>{
     const p=f.proposal,shared=f.source.part!=='whole';
     return `${p.candidatePhonemes===null?'? '+f.source.categoryId:p.candidatePhonemes.length?p.candidatePhonemes.join(''):'∅'}${shared?' [shared]':''}`;
    });
    const candidate=document.createElement('p');candidate.className='phonology-candidate';candidate.textContent=values.join(' · ');li.append(candidate);
    const context=document.createElement('small');context.textContent=`Historical syllable ${unit.context.historicalClosure} · primary stress ${unit.context.primaryStress===null?'not established':unit.context.primaryStress?'marked':unit.context.maqafPrimary?'in the final joined word':'on another syllable'}`;li.append(context);
    if(unit.context.maqafPrimary){
     const evidence=unit.context.maqafPrimary,note=document.createElement('p');note.className='muted phonology-maqaf';
     const joined=document.createElement('span');joined.lang='he';joined.dir='rtl';joined.textContent=evidence.markedHebrew.join(' ');note.append(joined,document.createTextNode(' · One primary-accent group. The source records its primary stress on the final word. Original word and syllable links are retained.'));
     if(evidence.wordHasMeteg)note.append(document.createTextNode(' Meteg is retained in this word; secondary stress or full-vowel realization still needs review.'));
     const source=document.createElement('a');source.href=report.prosodySources[0].url;source.textContent=' Maqaf and meteg evidence (§16).';note.append(source);li.append(note);
    }
    if(unit.vowelYodProposal){const pair=document.createElement('small');pair.className='phonology-vowel-yod';pair.textContent=`Vowel–yod constituents: /${unit.vowelYodProposal.candidatePhonemes.join(' + ')}/ · ${report.profile.region==='modern-inventory'?'Phonikud inventory adaptation':'Katz1993 pp.67–68,71'}. Same source syllable and two existing events; phonetic transition and singing remain unassigned.`;li.append(pair);}
    const gaps=unit.fragments.filter(f=>f.proposal.candidatePhonemes===null).map(f=>f.proposal.reason);if(gaps.length){const gap=document.createElement('p');gap.className='muted';gap.textContent=[...new Set(gaps)].join(' ');li.append(gap);}
    list.append(li);
   }
   section.append(list);
   for(const gap of route.gaps){const note=document.createElement('p');note.className='muted';note.textContent=gap.reason==='hiatus-phonetics-needs-review'?'Adjacent vowels after consonant loss: phonetic hiatus treatment needs review.':gap.reason==='vowel-yod-phonetics-needs-review'?(report.profile.region==='modern-inventory'?'Modern inventory constituents retain the original source vowel–yod pair.':'Patah/qamats and postvocalic yod have source-based constituent proposals.')+' The phonetic transition, quantity and note timing still need review.':gap.reason==='unreviewed-diphthong-sequence'?'The source vowel–yod sequence needs contextual evidence.':'A source route or shared consonant correspondence is incomplete.';section.append(note);}
   $('phonology-word').append(section);
  }
  $('phonology-export').disabled=false;
 }
 $('phonology-profile').addEventListener('change',()=>{profileId=$('phonology-profile').value;try{localStorage.setItem(key,JSON.stringify({profileId}));}catch{}render();});
 $('phonology-export').addEventListener('click',()=>{if(!report)return;const a=$('phonology-download');a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(report,null,2)+'\n');a.download=`${report.sourceWordId}-${profileId}-proposal.json`;a.hidden=false;});
 render();return{show(value,currentWord,currentStyle){study=value;word=currentWord;style=currentStyle;render();}};
}
