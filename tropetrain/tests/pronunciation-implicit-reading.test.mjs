import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {PronunciationLibrary,PRONUNCIATION_STYLES} from '../pronunciation.js';import {readerPronunciationWord} from '../pronunciation-reader.js';import {readerLetterForms,groupReaderLetterForms} from '../pronunciation-word-alignment.js';import {getCorpus} from '../library.js';import {createReadingModel} from '../music.js';import {linkPronunciationToNotes} from '../pronunciation-note-links.js';import {linkPronunciationScoreGroups} from '../pronunciation-score-groups.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),data=p=>JSON.parse(gunzipSync(read(p))),packet=data('data/pronunciation/torah-display.json.gz'),underlay=data('data/pronunciation/torah-underlay.json.gz'),segments=data('data/pronunciation/torah-segments.json.gz'),record=JSON.parse(read('docs/PRONUNCIATION-IMPLICIT-READING.json'));
const lib=new PronunciationLibrary(packet,{underlay,segments}),word={id:'gen-4-18-9',sourceHebrew:'וּמְחִיּיָאֵ֗ל'},group=lib.at(word);
test('independent original-source audit proves the full marked verse and conserves all68503 previous groups',()=>{
 const report=JSON.parse(execFileSync('python3',[new URL('scripts/audit-pronunciation-implicit-reading.py',root).pathname],{encoding:'utf8'}));
 assert.deepEqual(report,{previousGroupsUnchanged:68503,newWords:1,totalSourceLinkedWords:79985,markedVerseExact:true,individualWrittenSyllableRangesInferred:false,upstreamCodeExecuted:false});
 assert.equal(packet.revision,5);assert.equal(packet.groups.length,68504);assert.equal(lib.byWord.size,79985);
});
test('all three literal Hebrew forms stay separate and both styles retain their own four units and source stress',()=>{
 assert.equal(word.sourceHebrew,'וּמְחִיּיָאֵ֗ל');assert.equal(record.link.primaryHebrew,'וּמְחִיָּיאֵ֗ל');assert.equal(record.link.sourceReadingHebrew,'וּמְחִיָּאֵ֗ל');assert.equal(group.rows[0].hebrew[0][0],record.link.sourceReadingHebrew);
 const a=readerPronunciationWord(word,lib.study(word,'sephardic'),'sephardic'),b=readerPronunciationWord(word,lib.study(word,'ashkenazic'),'ashkenazic');
 assert.equal(a.entries[0].text,'um·ḥiy·ya·’él');assert.equal(b.entries[0].text,'um·ḥiy·yo·’él');assert.equal(a.hebrew,word.sourceHebrew);assert.equal(b.hebrew,word.sourceHebrew);
 for(const r of [a,b]){assert.equal(r.status,'word-linked');assert.deepEqual(r.entries[0].parts.map(u=>u.sourceStress),[false,false,false,true]);assert.equal(r.entries[0].implicitReadingLink,group.implicitReadingLinks[0]);assert.ok(r.entries[0].parts.every(p=>p.hebrewClusterRanges===null));}
});
test('the documented reading adds a word-only form without globally deleting yods or assigning the extra written letter',()=>{
 assert.deepEqual(readerLetterForms(word.sourceHebrew),['ומחייאל']);assert.deepEqual(groupReaderLetterForms(group,0),['ומחייאל','ומחיאל']);
 for(const text of ['ומחייאל','וּמְחִיָּיאֵ֗ל','יָי','וּמְחִיָּאֵ֗ל'])assert.deepEqual(readerLetterForms(text),[text.replace(/[^א-ת]/gu,'')]);
 for(const style of ['sephardic','ashkenazic'])for(const u of lib.study(word,style).rows[0].styles[style][0].units){assert.equal(u.readerWordId,word.id);assert.equal(u.hebrewClusterRanges,null);assert.equal(u.phonemes,null);assert.equal(u.noteIds,null);assert.equal(u.audioTimes,null);assert.equal(u.hebrewUnderlay.status,'source-only');}
});
test('source shared-consonant halves remain linked within the reading form without invented written-letter or acoustic ranges',()=>{
 const s=lib.study(word,'sephardic'),units=s.rows[0].styles.sephardic[0].units;
 const first=units[1].sourceSegments.variants[0].segments.find(p=>p.part==='first-half-shared'),second=units[2].sourceSegments.variants[0].segments.find(p=>p.part==='second-half-shared');
 assert.ok(first&&second);assert.equal(first.categoryId,'YOD_1DAG');assert.equal(second.categoryId,first.categoryId);assert.equal(first.sharedWithUnitId,units[2].id);assert.equal(second.sharedWithUnitId,units[1].id);
 for(const u of units)for(const v of u.sourceSegments.variants)for(const p of v.segments){assert.equal(p.individualHebrewRange,null);assert.equal(p.ipa,null);assert.equal(p.phonemes,null);assert.equal(p.audioTimes,null);}
 assert.equal(segments.catalog.length,87);assert.deepEqual(PRONUNCIATION_STYLES.map(s=>s.id),['sephardic','ashkenazic']);
});
test('changed evidence, scope, Hebrew, anchors, missing rules and source rows are refused',()=>{
 for(const change of [g=>g.implicitReadingLinks[0].primaryHebrew='אחר',g=>g.implicitReadingLinks[0].sourceReadingHebrew+='֑',g=>g.implicitReadingLinks[0].sourceRuleGitBlob='0'.repeat(40),g=>g.implicitReadingLinks[0].primaryVerse='Gen.4.19',g=>g.implicitReadingLinks[0].readerWordId='gen-4-18-8',g=>g.implicitReadingLinks[0].extra='unreviewed',g=>g.displayVerse=19,g=>g.variantWindow.beforeGroup='other',g=>delete g.implicitReadingLinks,g=>{delete g.implicitReadingLinks;g.match='single-word';g.id='unreviewed';},g=>g.rows[0].number=8,g=>g.rows[0].hebrew[0][0]+='֑',g=>g.primaryEditionArchiveSha256='0'.repeat(64),g=>g.implicitReadingSourceArchiveSha256='0'.repeat(64)]){
  const g=structuredClone(group);change(g);const broken=new PronunciationLibrary({...packet,groups:[g]});assert.throws(()=>broken.study(word,'sephardic'),/implicit-reading correspondence/);
 }
 assert.throws(()=>lib.study({...word,sourceHebrew:word.sourceHebrew+'֑'},'ashkenazic'),/Hebrew source changed/);
});
test('different source spelling creates no individual note links, common written spans or changes to the demo music',async()=>{
 const corpus=await getCorpus(),m=createReadingModel(corpus.passage([{id:'reading',bookId:'gen',start:{chapter:4,verse:18},end:{chapter:4,verse:18}}])),w=m.words[8],plan=m.buildPlan(8,8,{tempo:60,transpose:0}),before=JSON.stringify([m,plan]);
 for(const style of ['sephardic','ashkenazic']){const notes=linkPronunciationToNotes(plan,m.words,lib,style),spans=linkPronunciationScoreGroups(plan,m.words,lib,style);assert.equal(notes.counts.linkedNotes,0);assert.ok(notes.links.every(p=>p.reason==='source-only-written-form'));assert.equal(spans.counts.eventsInCommonSpans,0);assert.equal(readerPronunciationWord(w,lib.study(w,style),style).hebrew,word.sourceHebrew);}
 assert.equal(JSON.stringify([m,plan]),before);const changed=m.buildPlan(8,8,{tempo:120,transpose:2});for(let i=0;i<plan.length;i++){assert.equal(changed[i].midi,plan[i].midi+2);assert.equal(changed[i].durationSeconds,plan[i].durationSeconds/2);assert.equal(changed[i].id,plan[i].id);}
});
test('assignment occurrences keep separate IDs while the source word and source units remain identical',()=>{
 const again={...word,id:'again@gen-4-18-9',sourceWordId:word.id},a=readerPronunciationWord(word,lib.study(word,'ashkenazic'),'ashkenazic'),b=readerPronunciationWord(again,lib.study(again,'ashkenazic'),'ashkenazic');assert.notEqual(a.wordId,b.wordId);assert.equal(a.sourceWordId,b.sourceWordId);assert.deepEqual(a.entries,b.entries);
});
test('all previous packet groups retain their exact canonical digest and the new row is uniquely owned',()=>{
 const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
 const old=packet.groups.filter(g=>!g.implicitReadingLinks);assert.equal(old.length,68503);assert.equal(createHash('sha256').update(JSON.stringify(stable(old))).digest('hex'),'5403d1ec384384681ece8c86c3900ae844b550ebd4b360c2ae269c4bcf1da6fd');
 assert.equal(packet.groups.filter(g=>g.readerIds.includes(word.id)).length,1);assert.equal(record.addedWords,1);
});
test('portable evidence retains the exact source reference and an explicit text-only example',()=>{
 const html=restoredPortableHtml(read('TropeTrain.html')).toString(),normal=read('index.html').toString();for(const [path,mime] of [['docs/PRONUNCIATION-IMPLICIT-READING.json','application/json'],['assets/pronunciation/implicit-reading-source.zip','application/zip']])assert.ok(html.includes('data:'+mime+';base64,'+read(path).toString('base64')));
 assert.ok(normal.includes('id="implicit-reading-open"'));assert.match(record.review,/No extra yod is allocated/);assert.match(record.review,/singing voice/);
});
