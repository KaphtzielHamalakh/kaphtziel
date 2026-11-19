import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {getCorpus} from '../library.js';
import {CONTEXT_ANALYSIS,visitCorpusContext,getCombinationCatalogue} from '../accent-context.js';
const corpus=await getCorpus(),issues={},examples={};let words=0,units=0,runs=0,qualified=0,maqafUnits=0,withinWordCombinations=0,foldedPositions=0;
await visitCorpusContext(corpus,(source,context)=>{
  assert.deepEqual(context.units.flatMap(u=>u.wordIndices),source.map((_,i)=>i));words+=source.length;units+=context.units.length;runs+=context.runs.length;
  for(const unit of context.units){
    if(unit.qualified)qualified++;if(unit.wordIndices.length>1)maqafUnits++;
    if(unit.atoms.length>1&&unit.wordIndices.length===1)withinWordCombinations++;foldedPositions+=unit.foldedPositions;
    for(const atom of unit.atoms)for(const p of atom.positions)assert.equal(source[p.wordIndex].sourceHebrew.slice(p.offset,p.offset+1),p.char);
    for(const issue of unit.issues){issues[issue]=(issues[issue]??0)+1;(examples[issue]??=[]);if(examples[issue].length<4)examples[issue].push(unit.wordIndices.map(n=>({id:source[n].id,sourceHebrew:source[n].sourceHebrew})));}
  }
});
const catalogue=await getCombinationCatalogue(corpus);
const report={edition:corpus.manifest.edition,analysis:CONTEXT_ANALYSIS,readingWords:words,sourceUnits:units,qualifiedUnits:qualified,excludedUnits:units-qualified,maqafUnits,withinWordCombinations,foldedPositions,completeSourceRuns:runs,cataloguePatterns:catalogue.length,issues,examples,catalogue,
  verification:'Preferred w/q source units and offsets audited. These counts are edition-specific structural evidence, not musical, stress, hierarchy or independent reader review. Every source word, including an excluded case, remains in the reader. Existing major practice groups and demo pitches are unchanged.'};
await writeFile(new URL('../docs/SOURCE-CONTEXT-AUDIT.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({words,units,qualified,excluded:units-qualified,maqafUnits,withinWordCombinations,foldedPositions,runs,patterns:catalogue.length,issues}));
