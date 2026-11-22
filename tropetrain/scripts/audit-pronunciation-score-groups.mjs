import {readFileSync,writeFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {getCorpus} from '../library.js';import {PronunciationLibrary} from '../pronunciation.js';import {createReadingModel} from '../music.js';import {linkPronunciationScoreGroups} from '../pronunciation-score-groups.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),json=p=>JSON.parse(gunzipSync(read(p))),library=new PronunciationLibrary(json('data/pronunciation/torah-display.json.gz'),{underlay:json('data/pronunciation/torah-underlay.json.gz')}),corpus=await getCorpus();
const styles=['sephardic','ashkenazic'],totals=Object.fromEntries(styles.map(s=>[s,{events:0,eventsInCommonSpans:0,eventsInDifferentDivisions:0,eventsWithoutCommonSpan:0,groups:0,wordsWithCommonSpans:0,wordsFullyCovered:0,wordsWithoutCommonSpans:0,reasons:{}}]));
let words=0,verses=0;const wordsHash=createHash('sha256'),eventsHash=createHash('sha256');
function verify(report,model,plan){
 const covered=new Set();
 for(const word of report.words){const original=model.words.find(w=>w.id===word.wordId);assert.equal(word.hebrew,original.sourceHebrew);
  for(const group of word.groups){
   assert.equal(group.hebrew,word.hebrew.slice(group.hebrewRange.start,group.hebrewRange.end));
   assert.equal(group.scoreSyllables.map(s=>s.hebrew).join(''),group.hebrew);
   assert.equal(group.sourceUnits.flatMap(u=>u.hebrewClusterRanges.filter(r=>r.role==='written').map(r=>r.text)).join(''),group.hebrew);
   const scoreBoundaries=group.scoreSyllables.slice(0,-1).map(s=>s.end),sourceBoundaries=group.sourceUnits.slice(0,-1).map(u=>u.writtenSpan.end);
   assert.ok(!scoreBoundaries.some(n=>sourceBoundaries.includes(n)),'Common groups must be minimal.');
   if(group.relation==='different-syllable-divisions')assert.equal(group.individualNoteAllocation,null);
   for(const id of group.eventIds){assert.ok(plan.some(e=>e.id===id&&e.wordId===word.wordId&&group.scoreSyllables.some(s=>s.syllableId===e.syllableId)));covered.add(id);}
  }
 }
 assert.equal(covered.size,report.counts.eventsInCommonSpans);
 assert.equal(report.counts.eventsInCommonSpans+report.counts.eventsWithoutCommonSpan,plan.length);
}
for(const book of corpus.books){
 const last=book.chapters.at(-1),passage=corpus.passage([{id:'note-correspondence-audit',bookId:book.id,start:{chapter:1,verse:1},end:{chapter:last.number,verse:last.verses.at(-1).number}}]);
 for(const verse of passage.verses){const model=createReadingModel({...passage,verses:[verse]}),plan=model.buildPlan(0,model.words.length-1),before=JSON.stringify(plan);words+=model.words.length;verses++;
  for(const w of model.words)wordsHash.update(JSON.stringify([w.sourceWordId??w.id,w.sourceHebrew])+'\n');eventsHash.update(before+'\n');
  for(const style of styles){const report=linkPronunciationScoreGroups(plan,model.words,library,style),total=totals[style];verify(report,model,plan);
   for(const key of Object.keys(report.counts))total[key]+=report.counts[key];
   for(const word of report.words){const covered=new Set(word.groups.flatMap(g=>g.eventIds));total[covered.size?'wordsWithCommonSpans':'wordsWithoutCommonSpans']++;if(covered.size===word.eventIds.length)total.wordsFullyCovered++;if(word.reason)total.reasons[word.reason]=(total.reasons[word.reason]??0)+1;}
  }
  assert.equal(JSON.stringify(plan),before);
 }console.log('Common-span audit '+book.id+': '+words+' original words.');
}
const printed={};
for(const [id,chapter,startVerse,endVerse] of [['cohen-1902-gen22-ending',22,1,1],['baer-1894-gen1-1-5',1,1,5],['cohen-1902-gen22-prophetical',22,1,1],['baer-1894-gen22-19',22,19,19]]){
 const model=createReadingModel(corpus.passage([{id:'printed-common-spans',bookId:'gen',start:{chapter,verse:startVerse},end:{chapter,verse:endVerse}}]),{melodyId:id}),plan=model.buildPlan(0,model.words.length-1);printed[id]={};
 for(const style of styles){const report=linkPronunciationScoreGroups(plan,model.words,library,style);verify(report,model,plan);assert.equal(report.counts.eventsWithoutCommonSpan,0);printed[id][style]={...report.counts,differentDivisions:report.words.flatMap(w=>w.groups.filter(g=>g.relation==='different-syllable-divisions').map(g=>({wordId:g.sourceWordId,hebrew:g.hebrew,score:g.scoreSyllables.map(s=>s.hebrew),source:g.sourceUnits.map(u=>u.text),events:g.eventIds.length,individualNoteAllocation:null})))};}
}
const paths=['scripts/pronunciation_editions.py','scripts/audit-pronunciation-editions.py','pronunciation-word-alignment.js','docs/PRONUNCIATION-EDITION-WORDS.json','assets/pronunciation/mam-simple-torah-sources.zip','pronunciation-score-groups.js','data/pronunciation/torah-display.json.gz','data/pronunciation/torah-underlay.json.gz','data/pronunciation/torah-segments.json.gz','syllables.js','music.js','printed-score-data.js','baer-score-data.js','printed-score-registry.js','baer-high-holiday-data.js','baer-high-holiday-score.js','docs/BAER-HIGH-HOLIDAY-SCORE.json','assets/scores/baer-1894-no113-ii-page37.png','assets/scores/baer-1894-no113-ii-page38.png','assets/scores/baer-1894-no113-ii-page39.png','cohen-prophetical-data.js','cohen-prophetical-score.js','docs/COHEN-PROPHETICAL-SCORE.json','assets/scores/cohen-1902-prophetical-gen22.png','assets/scores/cohen-1902-page547.jpg',...corpus.books.map(b=>'data/torah/'+b.id+'.json')];
const report={format:'tropetrain-pronunciation-score-groups-audit-v1',revision:1,words,verses,markedWordSha256:wordsHash.digest('hex'),originalDemoEventSha256:eventsHash.digest('hex'),originalDemo:totals,boundedPrinted:printed,inputs:paths.map(path=>({path,sha256:createHash('sha256').update(read(path)).digest('hex')})),limits:'Exact common written spans preserve independent score and pronunciation syllables. Different divisions do not supply an individual syllable-to-note or acoustic mapping. Source-only/combined/missing forms are not repaired. Original demo is newly composed, not a traditional melody. All printed examples remain bounded instrumental transcriptions; six Kinnor pronunciation grammars/voices and complete musical systems still need evidence and review.'};
assert.equal(report.words,79985);assert.equal(report.markedWordSha256,'e7491f5d7f89cc94bb4e39b63e42d53b8219d1970846839f4822df4c3bc1728c');assert.equal(report.originalDemoEventSha256,'6870929024d0c2289f7d9ef1879a7908ac0ee04280c528d64c89d85956f4ba3d');
const output=JSON.stringify(report,null,2)+'\n',file=new URL('../docs/PRONUNCIATION-SCORE-GROUPS.json',import.meta.url);if(process.argv.includes('--check'))assert.equal(readFileSync(file,'utf8'),output);else writeFileSync(file,output);console.log(JSON.stringify({originalDemo:totals,boundedPrinted:printed}));
