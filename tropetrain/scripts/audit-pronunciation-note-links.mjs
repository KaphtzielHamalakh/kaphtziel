import {readFileSync,writeFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {getCorpus} from '../library.js';import {PronunciationLibrary} from '../pronunciation.js';import {createReadingModel} from '../music.js';import {linkPronunciationToNotes} from '../pronunciation-note-links.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),json=p=>JSON.parse(gunzipSync(read(p))),library=new PronunciationLibrary(json('data/pronunciation/torah-display.json.gz'),{underlay:json('data/pronunciation/torah-underlay.json.gz')}),corpus=await getCorpus();
const styles=['sephardic','ashkenazic'],totals=Object.fromEntries(styles.map(s=>[s,{notes:0,linkedNotes:0,unlinkedNotes:0,wordsFullyLinked:0,wordsPartlyLinked:0,wordsUnlinked:0,reasons:{}}]));let words=0,verses=0;
const wordsHash=createHash('sha256'),eventsHash=createHash('sha256');
for(const book of corpus.books){
 const last=book.chapters.at(-1),passage=corpus.passage([{id:'note-correspondence-audit',bookId:book.id,start:{chapter:1,verse:1},end:{chapter:last.number,verse:last.verses.at(-1).number}}]);
 for(const verse of passage.verses){
  const model=createReadingModel({...passage,verses:[verse]}),plan=model.buildPlan(0,model.words.length-1),before=JSON.stringify(plan);words+=model.words.length;verses++;
  for(const w of model.words)wordsHash.update(JSON.stringify([w.sourceWordId??w.id,w.sourceHebrew])+'\n');eventsHash.update(before+'\n');
  for(const style of styles){
   const r=linkPronunciationToNotes(plan,model.words,library,style),total=totals[style],byWord=new Map();
   for(const field of ['notes','linkedNotes','unlinkedNotes'])total[field]+=r.counts[field];
   for(const l of r.links){const list=byWord.get(l.wordId)??[];list.push(l);byWord.set(l.wordId,list);if(l.reason)total.reasons[l.reason]=(total.reasons[l.reason]??0)+1;}
   assert.equal(byWord.size,model.words.length);
   for(const list of byWord.values())total[list.every(l=>l.status==='exact-written-span')?'wordsFullyLinked':list.some(l=>l.status==='exact-written-span')?'wordsPartlyLinked':'wordsUnlinked']++;
   assert.deepEqual(r.links.map(l=>l.eventId),plan.map(e=>e.id));
  }
  assert.equal(JSON.stringify(plan),before);
 }
 console.log('Checked '+book.id+'; '+words+' original marked words.');
}
assert.equal(words,79985);for(const total of Object.values(totals)){assert.equal(total.wordsFullyLinked+total.wordsPartlyLinked+total.wordsUnlinked,words);assert.equal(total.linkedNotes+total.unlinkedNotes,total.notes);}
const printedModel=createReadingModel(corpus.passage([{id:'bounded-study',bookId:'gen',start:{chapter:22,verse:1},end:{chapter:22,verse:1}}]),{melodyId:'cohen-1902-gen22-ending'}),printedPlan=printedModel.buildPlan(0,12),bounded=Object.fromEntries(styles.map(style=>{const r=linkPronunciationToNotes(printedPlan,printedModel.words,library,style);return [style,{...r.counts,unlinked:r.links.filter(l=>l.status==='unlinked').map(l=>({eventId:l.eventId,sourceWordId:l.sourceWordId,hebrew:l.hebrew,reason:l.reason}))}];}));
const inputPaths=['event-correspondence.js','source-joint-syllables.js','source-joint-note-links.js','source-reading-choices.js','scripts/pronunciation_editions.py','scripts/audit-pronunciation-editions.py','docs/PRONUNCIATION-EDITION-WORDS.json','assets/pronunciation/mam-simple-torah-sources.zip','data/pronunciation/torah-display.json.gz','data/pronunciation/torah-underlay.json.gz','pronunciation.js','pronunciation-note-links.js','pronunciation-underlay.js','pronunciation-structure.js','pronunciation-word-alignment.js','pronunciation-repeats.js','syllables.js','music.js','printed-score-data.js','data/torah/manifest.json',...corpus.books.map(b=>'data/torah/'+b.id+'.json')];
const report={schema:'tropetrain-pronunciation-note-correspondence-audit-v1',revision:1,sourceCommit:library.sourceCommit,words,verses,markedWordSha256:wordsHash.digest('hex'),originalDemoEventSha256:eventsHash.digest('hex'),originalDemo:totals,boundedPrintedGenesis22:bounded,syllableAnalyzer:'havarotjs0.25.5; existing manual/source fixtures retained',inputs:inputPaths.map(path=>({path,sha256:createHash('sha256').update(read(path)).digest('hex')})),limits:'Full Torah structural text-span audit against existing original-demo syllables, not a traditional melody, phonological approval or recording/acoustic timing. The bounded historical Gen22 score is separately checked; its first two printed syllables differ from the source pronunciation division and remain unlinked. Shared consonants and source alternatives retained. No original Hebrew/accents/notes/syllables/times rewritten; no new phonemes or voice.'};
const output=JSON.stringify(report,null,2)+'\n',file=new URL('../docs/PRONUNCIATION-NOTE-CORRESPONDENCE.json',import.meta.url);if(process.argv.includes('--check'))assert.equal(readFileSync(file,'utf8'),output);else writeFileSync(file,output);console.log(JSON.stringify({words,verses,originalDemo:totals,boundedPrintedGenesis22:bounded}));
