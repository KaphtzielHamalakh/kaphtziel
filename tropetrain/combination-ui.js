import {FEATURED_COMBINATIONS,combinationName,combinationGlyphs,findCombinationsInReading,findCombinationsInCorpus,getCombinationCatalogue} from './accent-context.js';

const issueNames={
  'poetic-or-unclassified-sign':'poetic or unclassified sign','unresolved-repeated-sign':'repeated sign needs interpretation',
  'paseq-context':'paseq requires context','internal-verse-closing-mark':'verse-closing mark inside a verse',
  'internal-maqaf':'maqaf inside a source unit','accented-maqaf-prefix':'accent on a maqaf prefix',
  'dangling-maqaf':'maqaf continuation is outside this verse','no-functional-accent':'no functional accent identified',
  'multiple-disjunctives':'several disjunctives in one unit','sign-order-needs-context':'sign order needs interpretation'};
export function mountCombinationTools({getModel,getCorpus,selectHit}){
  const $=id=>document.getElementById(id);let hits=[],page=0,generation=0,searchWords=null,scope='reading',catalogue=[],chartPage=0,cataloguePromise=null;
  const PAGE=8,CHART_PAGE=20;
  const options=new Map(FEATURED_COMBINATIONS.map(p=>[p.id,p]));
  function updateOptions(){
    const selected=$('combination-query').value||'munah>etnahta';$('combination-query').replaceChildren();
    for(const pattern of options.values()){const option=document.createElement('option');option.value=pattern.id;option.textContent=combinationName(pattern.ids);$('combination-query').append(option);}
    $('combination-query').value=selected;
  }
  function choose(hit){selectHit(hit,scope==='torah');}
  function renderHits(){
    page=Math.min(page,Math.max(0,Math.ceil(hits.length/PAGE)-1));const first=page*PAGE,last=Math.min(first+PAGE,hits.length);
    $('combination-status').textContent=`${hits.length.toLocaleString()} source match${hits.length===1?'':'es'}${hits.length?` · showing ${first+1}–${last}`:''}. Whole source words are selected.`;
    $('combination-results').replaceChildren();$('combination-previous').disabled=first===0;$('combination-next').disabled=last===hits.length;$('combination-random').disabled=!hits.length;
    for(const hit of hits.slice(first,last)){
      const row=document.createElement('li'),text=document.createElement('span'),ref=document.createElement('span'),button=document.createElement('button');
      text.className='sign-result-word';text.lang='he';text.dir='rtl';text.textContent=hit.words.map(w=>w.sourceHebrew).join(' ');
      const from=hit.words[0],to=hit.words.at(-1),ordinal=from.ordinal===to.ordinal?`word ${from.ordinal}`:`words ${from.ordinal}–${to.ordinal}`;
      const section=scope==='reading'&&getModel().passage.ranges.length>1?` · section ${getModel().passage.ranges.findIndex(r=>r.id===from.sectionId)+1}`:'';
      ref.textContent=`${from.reference} · ${ordinal}${section}${hit.withinWord?' · within one word':''}${hit.includesMaqaf?' · maqaf unit':''}${hit.includesOtherSigns?' · whole-word selection includes other signs':''}`;
      button.textContent='Select combination';button.setAttribute('aria-label',`Select ${from.reference} ${ordinal}${section}`);button.addEventListener('click',()=>choose(hit));
      row.append(text,ref,button);$('combination-results').append(row);
    }
  }
  async function refresh({reset=false}={}){
    const current=++generation;searchWords=getModel().words;if(reset)page=0;scope=$('combination-scope').value;const query=$('combination-query').value,sourceScope=scope;
    hits=[];$('combination-results').replaceChildren();$('combination-status').textContent=scope==='torah'?'Searching source combinations across the Torah…':'Searching this reading…';
    for(const id of ['combination-previous','combination-next','combination-random'])$(id).disabled=true;
    try{
      const found=sourceScope==='torah'?await findCombinationsInCorpus(await getCorpus(),query):findCombinationsInReading(searchWords,query,getModel().context);
      if(current!==generation)return;hits=found;renderHits();
    }catch(error){if(current===generation)$('combination-status').textContent=error.message;}
  }
  function renderChart(){
    const first=chartPage*CHART_PAGE,last=Math.min(first+CHART_PAGE,catalogue.length);$('combination-chart-rows').replaceChildren();
    $('combination-chart-status').textContent=`${catalogue.length.toLocaleString()} distinct C* → D patterns derived from qualified source units in this edition · ${first+1}–${last}.`;
    $('chart-previous').disabled=first===0;$('chart-next').disabled=last===catalogue.length;
    for(const entry of catalogue.slice(first,last)){
      const row=document.createElement('li'),glyph=document.createElement('span'),name=document.createElement('span'),button=document.createElement('button');
      glyph.className='combination-glyphs';glyph.lang='he';glyph.dir='ltr';glyph.textContent=combinationGlyphs(entry.ids);glyph.setAttribute('aria-hidden','true');
      name.textContent=`${combinationName(entry.ids)} · ${entry.count.toLocaleString()} matches`;
      button.textContent='Find examples';button.setAttribute('aria-label',`Find ${combinationName(entry.ids)} examples`);
      button.addEventListener('click',()=>{$('find-combinations').open=true;$('combination-query').value=entry.id;$('combination-scope').value='torah';refresh({reset:true});$('combination-query').focus();});
      row.append(glyph,name,button);$('combination-chart-rows').append(row);
    }
  }
  async function ensureCatalogue(){
    if(cataloguePromise)return cataloguePromise;
    $('combination-chart-status').textContent='Building the source combination chart…';
    cataloguePromise=(async()=>{catalogue=await getCombinationCatalogue(await getCorpus());for(const entry of catalogue)options.set(entry.id,entry);updateOptions();renderChart();})();
    try{await cataloguePromise;}catch(error){cataloguePromise=null;$('combination-chart-status').textContent=error.message;}
  }
  for(const id of ['combination-query','combination-scope'])$(id).addEventListener('change',()=>refresh({reset:true}));
  for(const [id,delta] of [['combination-previous',-1],['combination-next',1]])$(id).addEventListener('click',()=>{page+=delta;renderHits();});
  for(const [id,delta] of [['chart-previous',-1],['chart-next',1]])$(id).addEventListener('click',()=>{chartPage+=delta;renderChart();});
  $('combination-random').addEventListener('click',()=>{if(hits.length)choose(hits[Math.floor(Math.random()*hits.length)]);});
  $('combination-chart').addEventListener('toggle',()=>{if($('combination-chart').open)ensureCatalogue();});
  $('find-combinations').addEventListener('toggle',()=>{if($('find-combinations').open){refresh();ensureCatalogue();}});
  updateOptions();refresh();
  return {
    findPattern(id){
      if(!options.has(id))throw Error('This source pattern is not in the search catalogue.');
      $('find-combinations').open=true;$('combination-query').value=id;$('combination-scope').value='torah';refresh({reset:true});
      $('combination-query').focus();$('find-combinations').scrollIntoView({block:'start'});
    },
    readingChanged(){if(searchWords!==getModel().words&&scope==='reading')refresh({reset:true});},
    showWord(index){
      const model=getModel(),context=model.context,entry=context.wordContexts[index],unit=context.units[entry.unitIndex],run=entry.runIndex===null?null:context.runs[entry.runIndex];
      const source=unit.wordIndices.map(n=>model.words[n].sourceHebrew).join(' ');$('context-word').textContent=source;
      $('context-summary').textContent=`${unit.wordIndices.length===1?'One source word':`${unit.wordIndices.length} source words linked by maqaf`} · ${unit.atoms.length?combinationName(unit.atoms.map(a=>a.id)):'no functional accent identified'}${unit.foldedPositions?` · ${unit.foldedPositions} repeated positional sign${unit.foldedPositions===1?'':'s'} grouped for search only`:''}.`;
      $('context-run').textContent=unit.issues.length?`Needs interpretation: ${unit.issues.map(id=>issueNames[id]).join('; ')}. Excluded from combination search.`:run?`Source C* → D run: ${combinationName(run.atoms.map(a=>a.id))}. ${run.wordIndices.length} source word${run.wordIndices.length===1?'':'s'}.`:'No complete C* → D run before the next source boundary. Adjacent-sign lookup only.';
    }
  };
}
