import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {PronunciationLibrary} from '../pronunciation.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url));
const data=JSON.parse(gunzipSync(read('data/pronunciation/torah-display.json.gz'))),underlay=JSON.parse(gunzipSync(read('data/pronunciation/torah-underlay.json.gz'))),lib=new PronunciationLibrary(data,{underlay});
const before=createHash('sha256').update(JSON.stringify(data)).digest('hex'),counts={},words={},linkedWords={},unmapped={};
for(const style of ['sephardic','ashkenazic']){counts[style]={units:0,readerRangeUnits:0,sourceOnlyUnits:0,sharedConsonantUnits:0,multipleWordRangeUnits:0};words[style]=new Set();linkedWords[style]=new Set();unmapped[style]=new Set();}
for(const group of data.groups){
 const study=lib.study({id:group.readerIds[0],sourceHebrew:group.readerHebrew[0]},'sephardic');
 for(const row of study.rows)for(const [style,cells] of Object.entries(row.styles))for(const cell of cells)for(const unit of cell.units){
  const count=counts[style];count.units++;if(unit.readerWordId)linkedWords[style].add(unit.readerWordId);assert.ok(unit.hebrewUnderlay);assert.equal(unit.phonemes,null);assert.equal(unit.noteIds,null);assert.equal(unit.audioTimes,null);
  const ranges=unit.hebrewClusterRanges;count.readerRangeUnits+=ranges!==null;count.sourceOnlyUnits+=ranges===null;
  count.sharedConsonantUnits+=unit.hebrewUnderlay.variants.some(v=>v.sharesNextConsonant!==null);
  if(ranges){
   count.multipleWordRangeUnits+=new Set(ranges.filter(r=>r.role==='written').map(r=>r.readerWordId)).size>1;
   for(const range of ranges){const i=group.readerIds.indexOf(range.readerWordId);assert.ok(i>=0);assert.equal(group.readerHebrew[i].slice(range.start,range.end),range.text);assert.match(range.text,/^[א-ת][^א-ת]*(?:[א-ת][^א-ת]*)*$/u);words[style].add(range.readerWordId);}
  }else unmapped[style].add(group.id);
  for(const variant of unit.hebrewUnderlay.variants){
   const source=group.rows.find(r=>r.number===row.number).hebrew[variant.hebrewColumn-1];
   const text=source.map(n=>typeof n==='string'?n:n.content.map(s=>typeof s==='string'?s:'').join('')).join('');
   assert.equal(text.slice(variant.source.start,variant.source.end),variant.source.text);
   if(variant.sharesNextConsonant)assert.equal(text.slice(variant.sharesNextConsonant.start,variant.sharesNextConsonant.end),variant.sharesNextConsonant.text);
  }
 }
}
assert.equal(createHash('sha256').update(JSON.stringify(data)).digest('hex'),before);
const report={schema:'tropetrain-pronunciation-underlay-alignment-v1',revision:1,sourceCommit:data.sourceCommit,license:'CC-BY-SA-4.0',inputSha256:underlay.inputSha256,counts:Object.fromEntries(Object.entries(counts).map(([style,c])=>[style,{...c,readerWordsWithRanges:words[style].size,individuallyLinkedWords:linkedWords[style].size,groupsWithSourceOnlyUnits:[...unmapped[style]]}])),method:'Every emitted target range is an exact half-open UTF16 slice of original marked Hebrew. Direct full-group letter equality or an existing explicit whole-word boundary proof is required. Source-only alternatives retain every original source slice; no target pronunciation spelling is rewritten.',limits:'Computed source syllables and written correspondence, not independently reviewed phonemes/music/audio timing or six Kinnor grammars/voices.'};
writeFileSync(new URL('../pronunciation-underlay-summary.js',import.meta.url),'// Generated source range/word coverage; data CC BY-SA4.\nexport const PRONUNCIATION_UNDERLAY_SUMMARY='+JSON.stringify({styles:Object.fromEntries(Object.entries(counts).map(([style,c])=>[style,{wordsWithUnits:linkedWords[style].size,sharedWords:data.groups.reduce((n,g)=>n+g.readerIds.length,0)-linkedWords[style].size,readerWordsWithRanges:words[style].size}]))})+';\n');
writeFileSync(new URL('../docs/PRONUNCIATION-UNDERLAY-ALIGNMENT.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({underlayAlignment:Object.fromEntries(Object.entries(report.counts).map(([style,c])=>[style,{...c,groupsWithSourceOnlyUnits:c.groupsWithSourceOnlyUnits.length}]))}));
