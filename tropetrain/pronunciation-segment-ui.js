import {appendIpaProposal} from './pronunciation-ipa.js';
const STYLE_NAMES={sephardic:'Sephardic',ashkenazic:'Ashkenazic'};
export function renderPronunciationRules(container,study,style){
 container.replaceChildren();
 const p=text=>{const node=document.createElement('p');node.textContent=text;container.append(node);return node;};
 if(!study?.sourceSegments){p('No checked source rules for this word. Your style choice is kept; no pronunciation is substituted.');return;}
 p('Written Hebrew bindings identify whole letter clusters with their original marks. Vowel-point and sound timing are unassigned. Shared halves refer to one written consonant.');
 p(`${STYLE_NAMES[style]} source text is selected. The two columns below explain the existing transcriptions; they do not select a singing voice or change the notes.`);
 const wordId=study.selection.sourceWordId;let shown=0;
 for(const row of study.rows)for(const cell of row.styles[style])for(const unit of cell.units){
  if(unit.readerWordId!==wordId&&unit.readerWordId!==null)continue;
  for(const variant of unit.sourceSegments.variants){
   shown++;
   const section=document.createElement('section');section.className='pronunciation-rule-unit';section.dataset.sourceUnit=unit.id;section.dataset.hebrewColumn=variant.hebrewColumn;
   const heading=document.createElement('h4');heading.textContent=`Source unit ${unit.number} · ${unit.text}${unit.sourceStress?' · primary stress':''}`;section.append(heading);
   const source=document.createElement('p');source.className='pronunciation-rule-hebrew';source.lang='he';source.dir='rtl';source.textContent=variant.sourceHebrew.text;section.append(source);
   const note=document.createElement('p');note.className='muted';note.textContent=`Source row ${row.number}, Hebrew column ${variant.hebrewColumn}${variant.sourceLabels.length?' · '+variant.sourceLabels.join(' / '):''}. ${unit.readerWordId===null?'Combined source form; not assigned to an individual reader word.':unit.hebrewClusterRanges?'Written syllable ranges remain exactly as linked above.':'Source Hebrew only; written syllable range remains unresolved.'} Whole-cluster bindings retain the reader’s marks. Individual vowel-point and sound timing are unassigned.`;section.append(note);
   const table=document.createElement('table');table.className='pronunciation-rule-table has-letter-bindings';
   const caption=document.createElement('caption');caption.textContent='Named source categories and their transcription values';table.append(caption);
   const head=document.createElement('thead'),tr=document.createElement('tr');
   for(const title of ['Source distinction','Sephardic text','Ashkenazic text','Written Hebrew cluster']){const th=document.createElement('th');th.scope='col';th.textContent=title;tr.append(th);}head.append(tr);table.append(head);
   const body=document.createElement('tbody');
   for(const segment of variant.segments){
    const r=document.createElement('tr');r.dataset.category=segment.categoryId;r.dataset.part=segment.part;
    if(segment.realizations.sephardic.text!==segment.realizations.ashkenazic.text)r.className='pronunciation-rule-difference';
    const name=document.createElement('th');name.scope='row';name.textContent=segment.label;name.title=segment.categoryId;
    if(segment.part!=='whole'){const label=document.createElement('small');label.textContent=segment.part==='first-half-shared'?'First half of shared consonant':'Second half of shared consonant';name.append(label);}r.append(name);
    for(const s of ['sephardic','ashkenazic']){const td=document.createElement('td');td.textContent=segment.realizations[s].text||'No transcription character';td.dataset.style=s;if(s===style)td.className='selected-source-style';r.append(td);}
    const binding=variant.letterClusterBindings?.bindings.find(b=>b.sourceSegmentId===segment.id),written=document.createElement('td');written.className='pronunciation-letter-binding';
    if(binding?.readerClusterRanges){
     const text=document.createElement('span');text.lang='he';text.dir='rtl';text.textContent=binding.readerClusterRanges.map(r=>r.text).join(' ');written.append(text);
     const note=document.createElement('small');note.textContent=segment.part==='first-half-shared'?'Shared reference to the next syllable’s written consonant':segment.part==='second-half-shared'?'Same written consonant as the preceding shared reference':'Exact marked reader cluster';written.append(note);
     written.dataset.segment=segment.id;written.dataset.readerRanges=JSON.stringify(binding.readerClusterRanges);written.title=binding.readerClusterRanges.map(r=>`${r.readerWordId} · UTF-16 ${r.start}–${r.end}`).join('; ');
     if(!binding.markedClustersEqual){const source=document.createElement('small');source.textContent=`Source marks differ: ${binding.sourceCluster.text}`;written.append(source);}
    }else written.textContent=binding?.status==='no-written-letter'?'No written letter in this category; syllable only':'Source form only; no exact reader letter binding';
    r.append(written);
    body.append(r);
   }
   table.append(body);section.append(table);appendIpaProposal(section,variant.segments);container.append(section);
  }
 }
 if(!shown)p('This source group has no individual or shared units for the selected word. No rule is substituted.');
}
