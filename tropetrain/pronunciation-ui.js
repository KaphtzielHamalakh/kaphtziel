import {mountHistoricalPronunciation} from './historical-pronunciation-ui.js';
import {sourceIpaEvidence} from './pronunciation-ipa.js';
import {getPronunciationLibrary,PRONUNCIATION_STYLES,pronunciationStyle} from './pronunciation.js';
import {PRONUNCIATION_SUMMARY} from './pronunciation-summary.js';
import {PRONUNCIATION_REPERTOIRE_SUMMARY} from './pronunciation-repertoire-summary.js';
import {PRONUNCIATION_UNDERLAY_SUMMARY} from './pronunciation-underlay-summary.js';
import {hasTranscription} from './pronunciation-repeats.js';
import {linkPronunciationToNotes} from './pronunciation-note-links.js';
import {linkPronunciationScoreGroups} from './pronunciation-score-groups.js';
import {pronunciationFollow} from './pronunciation-follow.js';
import {readerPronunciationWord} from './pronunciation-reader.js';
import {renderPronunciationRules} from './pronunciation-segment-ui.js';
export function mountPronunciationStudy({onChange=()=>{}}={}){
 const $=id=>document.getElementById(id),key='tropetrain-pronunciation-text-v1';
 let saved;try{saved=JSON.parse(localStorage.getItem(key));}catch{}
 let style=pronunciationStyle(saved?.style),word=null,listening=false,library=null,error=null,lastKey=null,study=null;
 const readerCache=new Map(),followCache=new Map(),bookRequests=new Map(),bookErrors=new Map();
 const historicalProfiles=mountHistoricalPronunciation();
 function requestBook(value){
  if(!library?.canLoadBook(value)||library.bookLoaded(value))return false;
  const id=library.bookId(value);if(bookErrors.has(id)||bookRequests.has(id))return true;
  const job=library.loadBookFor(value);bookRequests.set(id,job);
  job.catch(e=>bookErrors.set(id,e.message)).finally(()=>{
   if(bookRequests.get(id)===job)bookRequests.delete(id);
   readerCache.clear();followCache.clear();lastKey=null;render();onChange();
  });return true;
 }
 $('pronunciation-retry').addEventListener('click',()=>{if(word){bookErrors.delete(library.bookId(word));lastKey=null;render();}});
 for(const s of PRONUNCIATION_STYLES){const option=document.createElement('option');option.value=s.id;option.textContent=s.name;$('pronunciation-style').append(option);}
 $('pronunciation-style').value=style;
 $('pronunciation-coverage').textContent=`${PRONUNCIATION_SUMMARY.mappedWords.toLocaleString()} of ${PRONUNCIATION_SUMMARY.readerWords.toLocaleString()} Torah words linked to source groups; ${PRONUNCIATION_REPERTOIRE_SUMMARY.mappedWords.toLocaleString()} of ${PRONUNCIATION_REPERTOIRE_SUMMARY.readerWords.toLocaleString()} additional words in the Prophets and five scrolls. Unmatched words remain unassigned. Correspondence and linguistic review are pending.`;
 function appendInline(parent,nodes){
  for(const node of nodes){
   if(typeof node==='string'){parent.append(document.createTextNode(node));continue;}
   if(node.kind==='superscript-e'){const sup=document.createElement('sup');sup.textContent='e';parent.append(sup);continue;}
   if(!['stressed','reading'].includes(node.kind))throw Error('Unsupported source transcription markup.');
   const span=document.createElement(node.kind==='stressed'?'strong':'span');
   if(node.kind==='reading'){
    span.className='pronunciation-reading';const label=document.createElement('span');label.className='pronunciation-reading-label';label.lang='he';label.dir='rtl';label.textContent=node.label+' · ';span.append(label);
   }
   appendInline(span,node.content);parent.append(span);
  }
 }
 function columns(parent,cells,hebrew,derivedCells){
  for(const [index,cell] of cells.entries()){
   if(cell===null)continue;
   const box=document.createElement('div');box.className='pronunciation-cell';box.lang=hebrew?'he':'en';box.dir=hebrew?'rtl':'ltr';
   const label=document.createElement('small');label.textContent=`Source column ${index+1}`;label.lang='en';label.dir='ltr';box.append(label);
   const text=document.createElement('div');appendInline(text,cell);box.append(text);parent.append(box);
   if(derivedCells?.[index]?.sourceReference){const reference=document.createElement('small');reference.textContent='Same transcription as source column 1.';box.append(reference);}
  }
 }
 function structure(){
  const scope=$('pronunciation-unit-scope');
  const shared=study.readerIds.length>1,currentId=study.selection.sourceWordId;
  scope.textContent=study.alignmentScope==='single-reader-word'?'These source units correspond to the selected Hebrew word. Computed source syllables and exact written ranges are labeled below; musical notes are not assigned.':study.alignmentScope==='source-word-boundaries'?'Source boundaries and computed Hebrew ranges identify individual words. Units labeled “selected” belong to the selected Hebrew word.':study.alignmentScope==='partial-source-word-boundaries'?'Some source words have clear individual links. Combined source words remain together; their units are labeled “shared” and are not split.':'These source units correspond to the complete Hebrew group below. They are not divided among its individual words.';
  if(study.sourceGroup.implicitReadingLinks)scope.textContent='This word uses an explicit source reading. Its four source units stay linked to the whole Hebrew word; the extra written yod has no assigned syllable, note or acoustic time.';
  else if(study.sourceGroup.editionWordLinks)scope.textContent='These source words correspond by primary MAM verse and unchanged surrounding words. The two editions keep their own spellings and accents. Different spellings have no assigned written syllable ranges, musical notes or sound times; word correspondence does not establish equal pronunciation.';
  const group=document.createElement('p');group.className='pronunciation-group-hebrew';group.lang='he';group.dir='rtl';
  study.readerHebrew.forEach((text,index)=>{
   if(index)group.append(document.createTextNode(' '));
   const token=document.createElement('span');token.className='pronunciation-group-word';token.dataset.readerWordId=study.readerIds[index];
   const hasUnits=study.rows.some(row=>row.styles[style].some(cell=>cell.units.some(u=>u.readerWordId===currentId)));
   if(shared&&study.readerIds[index]===currentId&&hasUnits)token.classList.add('current-word');
   token.textContent=text;group.append(token);
  });$('pronunciation-units').append(group);
  for(const row of study.rows)for(const cell of row.styles[style]){
   const box=document.createElement('div');box.className='pronunciation-unit-cell';
   const title=document.createElement('p');title.className='muted';title.textContent=`Source row ${row.number} · column ${cell.column}`;box.append(title);
   if(cell.sourceReference){const reference=document.createElement('p');reference.className='pronunciation-repeat';reference.textContent='Source mark — · same transcription as column 1.';box.append(reference);}
   const labels=cell.sourceReference?.alternativeLabels??[...new Set(cell.marks.filter(m=>m.kind==='reading').map(m=>m.label))];
   if(labels.length){const label=document.createElement('p');label.lang='he';label.dir='rtl';label.textContent=labels.join(' · ');box.append(label);}
   if(!hasTranscription(cell)){
    const message=document.createElement('p');message.textContent=cell.status==='missing'?'No source cell in this column.':cell.status==='unresolved-repeat'?'The source uses a repeat mark here; its reference is unresolved.':'The source cell is empty.';box.append(message);
   }else{
    const list=document.createElement('ol');list.className='pronunciation-unit-list';list.lang='en';list.dir='ltr';
    for(const unit of cell.units){
     const li=document.createElement('li');li.className=unit.sourceStress?'source-stressed':'';
     if(unit.readerWordId)li.dataset.readerWordId=unit.readerWordId;
     const selected=shared&&unit.readerWordId===currentId;
     if(selected)li.classList.add('current-word');
     const value=document.createElement('span');value.className='pronunciation-unit-text';
     const supers=unit.sourceMarks.filter(m=>m.kind==='superscript-e');
     let position=unit.start;
     for(const mark of supers.sort((a,b)=>a.start-b.start)){
      value.append(document.createTextNode(cell.text.slice(position,mark.start)));const sup=document.createElement('sup');sup.textContent='e';value.append(sup);position=mark.end;
     }
     value.append(document.createTextNode(cell.text.slice(position,unit.end)));li.append(value);
     if(unit.hebrewUnderlay){
      const exact=unit.hebrewClusterRanges!==null,underlay=document.createElement('span');underlay.className='pronunciation-hebrew-underlay';underlay.lang='he';underlay.dir='rtl';
      const values=exact?[unit.hebrewClusterRanges.filter(r=>r.role==='written').map(r=>r.text).join(' ')]:[...new Set(unit.hebrewUnderlay.variants.map(v=>v.source.text))];
      underlay.textContent=values.join(' / ');li.append(underlay);
      const label=document.createElement('small');label.textContent=exact?'Written Hebrew':'Source Hebrew · target range unresolved';li.append(label);
      if(unit.hebrewUnderlay.variants.some(v=>v.sharesNextConsonant)){const note=document.createElement('small');note.className='pronunciation-geminate';note.textContent='Shares consonant with next unit';li.append(note);}
      if(unit.hebrewUnderlay.variants.some(v=>v.sharesPreviousConsonant)){const note=document.createElement('small');note.className='pronunciation-geminate';note.textContent='Shares consonant with previous unit';li.append(note);}
     }
     if(unit.sourceStress){const stress=document.createElement('small');stress.textContent='Primary stress';li.append(stress);}
     if(shared){const owner=document.createElement('small');owner.className='pronunciation-unit-owner';owner.textContent=unit.readerWordId?`Group word ${study.readerIds.indexOf(unit.readerWordId)+1}${selected?' · selected':''}`:'Shared · unsplit';li.append(owner);}
     const cues=[unit.acutePositions.length?'acute mark':'',unit.brevePositions.length?'breve mark':'',supers.length?'superscript e':''].filter(Boolean);
     li.setAttribute('aria-label',`Source unit ${unit.number}: ${unit.text}${unit.sourceStress?', primary stress':''}${cues.length?', '+cues.join(', '):''}${shared?unit.readerWordId?`, group word ${study.readerIds.indexOf(unit.readerWordId)+1}${selected?', selected':''}`:', shared and unsplit':''}${unit.hebrewUnderlay?`, ${unit.hebrewClusterRanges?'written Hebrew: '+unit.hebrewClusterRanges.filter(r=>r.role==='written').map(r=>r.text).join(' '):'source Hebrew; target range unresolved'}${unit.hebrewUnderlay.variants.some(v=>v.sharesNextConsonant)?', shares consonant with next unit':''}`:''}`);list.append(li);
    }
    box.append(list);
    const joins=cell.boundaries.filter(b=>b.kind!=='syllable-dot');
    if(joins.length){const note=document.createElement('p');note.className='muted';note.textContent=`Source joins retained: ${joins.map(b=>b.kind==='space'?'space':b.text).join(', ')}. ${cell.wordAlignment.status==='word-aligned'?'Word links follow the source Hebrew boundaries.':'Only unambiguous word links are shown; combined forms remain unsplit.'}`;box.append(note);}
   }
   $('pronunciation-units').append(box);
  }
 }
 function render(){
  const current=JSON.stringify([style,word?.id,word?.sourceHebrew,word?.reference,listening,!!library,error]);if(current===lastKey)return;lastKey=current;
  historicalProfiles.show(null,word,style);
  $('pronunciation-target').textContent=word?`${word.reference} · word ${word.ordinal} · ${listening?'listening word':'selected word'}`:'Choose a Hebrew word.';
  const bookCoverage=PRONUNCIATION_REPERTOIRE_SUMMARY.books.find(b=>b.bookId===(word?.sourceWordId??word?.id??'').split('-')[0]);
  const coverage=PRONUNCIATION_UNDERLAY_SUMMARY.styles[style];$('pronunciation-word-coverage').textContent=bookCoverage?`${bookCoverage.mappedWords.toLocaleString()} of ${bookCoverage.readerWords.toLocaleString()} words in this book have source-group correspondence; ${bookCoverage.unmappedWords.toLocaleString()} remain unassigned. Computed syllable ranges are shown only where the original marked Hebrew matches exactly. Different source forms keep unresolved ranges; source categories, IPA and new singing voices are not supplied for this book.`:`${coverage.wordsWithUnits.toLocaleString()} Torah words have individual source-unit links in this style; ${coverage.sharedWords} linked words remain in combined forms.`;
  $('pronunciation-retry').hidden=true;$('pronunciation-reader-word').textContent=word?.sourceHebrew??'';
  $('pronunciation-rows').replaceChildren();$('pronunciation-source-rows').replaceChildren();$('pronunciation-json').textContent='';
  $('pronunciation-units').replaceChildren();$('pronunciation-unit-scope').textContent='Choose a word with source correspondence.';$('pronunciation-export').disabled=true;$('ipa-proposal-export').disabled=true;$('ipa-proposal-download').hidden=true;$('ipa-proposal-download').removeAttribute('href');$('ipa-proposal-json').textContent='';study=null;renderPronunciationRules($('pronunciation-rules-content'),null,style);
  if(error){$('pronunciation-status').textContent=error;return;}
  if(!library){$('pronunciation-status').textContent='Loading the local pronunciation source…';return;}
  if(!word){$('pronunciation-status').textContent='Choose a Hebrew word.';return;}
  if(requestBook(word)){const message=bookErrors.get(library.bookId(word));$('pronunciation-status').textContent=message??'Loading this book’s local pronunciation source…';$('pronunciation-retry').hidden=!message;return;}
  let group;try{group=library.at(word);}catch(e){$('pronunciation-status').textContent=e.message;return;}
  if(!group){$('pronunciation-status').textContent='No checked source correspondence for this word. The selected style is kept; no transcription is substituted.';return;}
  study=library.study(word,style);historicalProfiles.show(study,word,style);
  if(group.implicitReadingLinks){
   const note=document.createElement('p');note.className='muted';note.textContent='Documented source reading · the primary MAM rule explicitly derives this reading from its written form. All three marked forms remain unchanged. Word correspondence does not allocate the extra written yod to a syllable or establish a singing voice.';$('pronunciation-source-rows').append(note);
   const table=document.createElement('table');table.className='pronunciation-edition-forms';const head=document.createElement('tr');
   for(const title of ['Reader · UXLC','Primary MAM · written','Phonetic MAM · source reading']){const th=document.createElement('th');th.scope='col';th.textContent=title;head.append(th);}table.append(head);
   for(const link of group.implicitReadingLinks){const row=document.createElement('tr');row.dataset.readerWord=link.readerWordId;for(const text of [link.readerHebrew,link.primaryHebrew,link.sourceReadingHebrew]){const cell=document.createElement('td');cell.lang='he';cell.dir='rtl';cell.textContent=text;row.append(cell);}table.append(row);}$('pronunciation-source-rows').append(table);
  }
  if(group.editionWordLinks){
   const note=document.createElement('p');note.className='muted';note.textContent='Different source spelling · linked through the primary MAM edition and surrounding words. The source transcription retains its own Hebrew form. No phonological equivalence or written syllable alignment is inferred.';$('pronunciation-source-rows').append(note);
   const table=document.createElement('table');table.className='pronunciation-edition-forms';
   const head=document.createElement('tr');for(const title of ['Reader · UXLC','Pronunciation source · MAM']){const th=document.createElement('th');th.scope='col';th.textContent=title;head.append(th);}table.append(head);
   for(const link of group.editionWordLinks){const row=document.createElement('tr');row.dataset.readerWord=link.readerWordId;for(const text of [link.readerHebrew,link.primaryHebrew]){const cell=document.createElement('td');cell.lang='he';cell.dir='rtl';cell.textContent=text;row.append(cell);}table.append(row);}$('pronunciation-source-rows').append(table);
  }
  $('pronunciation-status').textContent=`Phonetic MAM display ${group.displayChapter}:${group.displayVerse} · source row${group.rows.length===1?'':'s'} ${group.rows.map(r=>r.number).join(', ')} · ${group.readerIds.length} reader word${group.readerIds.length===1?'':'s'}. ${group.match==='forced-between-verse-anchors'?'Matched within a verse with text differences; unmatched words stay unassigned. ':''}${group.flags.includes('documented-implicit-reading-form')?'Linked by an explicit source reading rule; written syllable allocation remains unresolved. ':''}${group.flags.includes('documented-reading-form')?'The source uses a documented reading form. ':''}${group.flags.includes('explicit-written-read-variant')?'Linked through an explicit UXLC written/read pair; the pronunciation source retains its own written form. ':''}${group.flags.includes('source-text-difference')?'Source Hebrew differs; compare the exact forms below. ':''}${group.flags.includes('source-group')?'The source units below distinguish exact word links from combined forms.':''}`;
  for(const [rowIndex,row] of group.rows.entries()){
   const derived=study.rows[rowIndex].styles[style];
   const item=document.createElement('div');item.className='pronunciation-row';columns(item,row.transcriptions[style],false,derived);
   if(!derived.some(hasTranscription)){const note=document.createElement('small');note.textContent='This source row has no resolved transcription for the selected style. Source cells are retained above.';item.append(note);}
   $('pronunciation-rows').append(item);
   const source=document.createElement('div');source.className='pronunciation-row';columns(source,row.hebrew,true);$('pronunciation-source-rows').append(source);
  }
  structure();renderPronunciationRules($('pronunciation-rules-content'),study,style);$('pronunciation-export').disabled=false;$('ipa-proposal-export').disabled=!study.sourceSegments;$('ipa-proposal-json').textContent=study.sourceSegments?JSON.stringify(sourceIpaEvidence(study,word,style),null,2):'No checked category/IPA evidence for this source display. No phonemes, note or sound times are inferred.';
  $('pronunciation-json').textContent=JSON.stringify({sourceCommit:library.sourceCommit,license:'CC-BY-SA-4.0',group},null,2);
 }
 $('ipa-proposal-export').addEventListener('click',()=>{
  if(!study)return;const report=sourceIpaEvidence(study,word,style),a=$('ipa-proposal-download');a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(report,null,2)+'\n');a.download=`${report.sourceWordId}-ipa-source-proposal.json`;a.hidden=false;
 });
 $('pronunciation-export').addEventListener('click',()=>{
  if(!study)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(study,null,2)],{type:'application/json;charset=utf-8'})),a=document.createElement('a');
  a.href=url;a.download=`tropetrain-pronunciation-${study.selection.sourceWordId}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 $('pronunciation-style').addEventListener('change',()=>{style=pronunciationStyle($('pronunciation-style').value);try{localStorage.setItem(key,JSON.stringify({style}));}catch{}render();onChange();});
 getPronunciationLibrary().then(value=>{library=value;render();onChange();}).catch(e=>{error=e.message;render();onChange();});
 return {showWord(value,{following=false}={}){word=value;listening=following;render();},
  readerText(value){
   if(!library||requestBook(value))return null;
   // Bounded cache keeps repeated assignment occurrences independent while
   // avoiding source analysis on every paint. Always recheck the marked word.
   library.at(value);
   const cacheKey=JSON.stringify([style,value.sourceWordId??value.id,value.sourceHebrew]);
   if(!readerCache.has(cacheKey)){
    if(readerCache.size>=512)readerCache.delete(readerCache.keys().next().value);
    readerCache.set(cacheKey,readerPronunciationWord(value,library.study(value,style),style));
   }
   return {...readerCache.get(cacheKey),wordId:value.id};
  },
  followNote(event,words){
   if(!library)return null;
   const w=words[event.wordIndex];
   const cacheKey=JSON.stringify([style,event.id,event.wordId,event.sourceWordId,event.syllableId,event.syllable,w?.id,w?.sourceWordId,w?.sourceHebrew]);
   if(!followCache.has(cacheKey)){
    if(followCache.size>=256)followCache.delete(followCache.keys().next().value);
    const link=linkPronunciationToNotes([event],words,library,style).links[0];
    followCache.set(cacheKey,pronunciationFollow(event,w,link,style));
   }
   return followCache.get(cacheKey);
  },
  groupNotes(events,words){return library?linkPronunciationScoreGroups(events,words,library,style):null;},
  linkNotes(events,words){return library?linkPronunciationToNotes(events,words,library,style):null;},
  timingStudy(value){return library?{style,study:library.study(value,style)}:null;},
  scoreStatus(){return {style,name:PRONUNCIATION_STYLES.find(s=>s.id===style).name,error};}};
}
