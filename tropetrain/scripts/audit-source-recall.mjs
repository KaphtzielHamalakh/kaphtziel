import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {getCorpus} from '../library.js';
import {analyzeSourceSigns,SIGN_ANALYSIS} from '../accents.js';
import {createRecallDeck,recallChoices,checkRecallAnswer} from '../source-recall.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),corpus=await getCorpus();
const counts={verses:0,readerWords:0,cards:0,includedWords:0,withheldWords:0,hiddenSourcePositions:0,abovePositions:0,belowPositions:0,repeatedPositionCards:0,maqafCards:0,splitMaqafCards:0,longestWordClusters:0};
const books=[],bySign={},withheldReasons={},examples=[];
for(const book of corpus.books){
 const summary={bookId:book.id,verses:0,readerWords:0,cards:0,includedWords:0,withheldWords:0};
 for(const chapter of book.chapters)for(const verse of chapter.verses){
  const passage=corpus.passage([{id:'recall-audit',bookId:book.id,start:{chapter:chapter.number,verse:verse.number},end:{chapter:chapter.number,verse:verse.number}}]);
  const words=passage.verses.flatMap(v=>v.words).map((w,index)=>({...w,index})),before=JSON.stringify(words),deck=createRecallDeck(words),accounted=new Set();
  counts.verses++;summary.verses++;counts.readerWords+=words.length;summary.readerWords+=words.length;
  for(const card of deck.cards){
   counts.cards++;summary.cards++;counts.includedWords+=card.words.length;summary.includedWords+=card.words.length;
   bySign[card.target.id]=(bySign[card.target.id]??0)+1;if(card.foldedPositions)counts.repeatedPositionCards++;
   if(card.words.length>1)counts.maqafCards++;
   assert.deepEqual(card.words.map(w=>w.id),words.slice(card.startIndex,card.endIndex+1).map(w=>w.id));
   assert(!words[card.startIndex-1]?.sourceHebrew.endsWith('־'));assert(!words[card.endIndex].sourceHebrew.endsWith('־'));
   for(const word of card.words){
    assert(!accounted.has(word.id));accounted.add(word.id);
    const source=words.find(w=>w.id===word.id);assert.equal(word.hebrew,source.sourceHebrew);assert.equal(word.sourceWordId,source.sourceWordId??source.id);
    assert.equal(word.clusters.map(c=>c.source).join(''),source.sourceHebrew);
    counts.longestWordClusters=Math.max(counts.longestWordClusters,word.clusters.length);
    const analysis=analyzeSourceSigns(word.hebrew),expected=[...analysis.signs,...analysis.marks].filter(s=>s.id===card.target.id),slots=word.clusters.flatMap(c=>c.slots);
    assert.deepEqual(slots.map(s=>[s.offset,s.char]),expected.map(s=>[s.offset,s.char]));
    const removed=new Set(slots.map(s=>s.offset));let offset=0,projection='';
    for(const char of word.hebrew){if(!removed.has(offset))projection+=char;offset+=char.length;}
    assert.equal(word.clusters.map(c=>c.display).join(''),projection);
    for(const slot of slots){counts.hiddenSourcePositions++;counts[slot.position==='above'?'abovePositions':'belowPositions']++;assert.equal(slot.char,word.hebrew.slice(slot.offset,slot.offset+slot.char.length));}
   }
   for(const key of ['melody','pronunciation','phonemes','audioTimes','review'])assert.equal(card[key],null);
   const choices=recallChoices(card);assert.equal(choices.length,4);assert.equal(new Set(choices.map(c=>c.id)).size,4);assert.equal(choices.filter(c=>checkRecallAnswer(card,c.id).correct).length,1);
  }
  for(const omitted of deck.withheld){
   counts.withheldWords+=omitted.wordIds.length;summary.withheldWords+=omitted.wordIds.length;
   for(const reason of omitted.reasons)withheldReasons[reason]=(withheldReasons[reason]??0)+1;
   for(const id of omitted.wordIds){assert(!accounted.has(id));accounted.add(id);}
  }
  assert.equal(accounted.size,words.length);assert.equal(JSON.stringify(words),before);
  if(deck.cards.length&&examples.length<4){const card=deck.verify(deck.cards[0],words);examples.push({bookId:book.id,chapter:chapter.number,verse:verse.number,hebrew:card.words.map(w=>w.hebrew),projection:card.words.map(w=>w.clusters.map(c=>c.display).join('')),answer:card.target,wordIds:card.words.map(w=>w.sourceWordId)});}
 }
 books.push(summary);
}
assert.equal(counts.readerWords,79985);assert.equal(counts.verses,5853);assert.equal(counts.includedWords+counts.withheldWords,79985);assert.equal(counts.abovePositions+counts.belowPositions,counts.hiddenSourcePositions);
const inputs=['source-recall.js','source-recall-ui.js','pronunciation-reader.js','pronunciation-ui.js','source-joint-syllables.js','scripts/audit-source-recall.mjs','accents.js','accent-context.js','app.js','index.html','style.css','sw.js','scripts/build.mjs',...corpus.books.map(b=>'data/torah/'+b.id+'.json')].map(path=>({path,sha256:createHash('sha256').update(read(path)).digest('hex')}));
const audit={schema:'tropetrain-source-recall-audit-v1',revision:1,source:SIGN_ANALYSIS,counts,books,bySign,withheldReasons,examples,inputs,sourceTextChanged:false,sourceAccentMarksChanged:false,questionProjectionOnly:true,answersRestoreOriginalWords:true,canonicalAndOccurrenceIdsSeparate:true,maqafGroupsPreserved:true,melody:null,pronunciation:null,phonemes:null,audioTimes:null,singingVoice:null,musicalReview:null,phonologicalReview:null,
 limits:'Source-character self-check, not musical or phonological assessment. Optional pronunciation hints reuse the existing source reader renderer; complete shared words keep collective ownership. A question contains one qualified functional accent, including its repeated source positions. Shalshelet keeps its printed paseq without inferring a musical composite. Maqaf units stay complete. Unresolved composites, poetic/unclassified signs and clipped joins receive no guessed answer. Boxes mask source offsets only in the exercise; the reader/model/underlay retain original marked Hebrew. Playback delegates to the selected existing sound source and its availability gates. No source note, recording, clock or pronunciation rule is derived.'};
writeFileSync(new URL('docs/SOURCE-RECALL.json',root),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify({sourceRecall:counts,bySign,withheldReasons}));
