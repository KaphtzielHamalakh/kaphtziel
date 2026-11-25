import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {PronunciationLibrary} from '../pronunciation.js';import {getCorpus} from '../library.js';import {createReadingModel} from '../music.js';import {linkPronunciationToNotes,notePronunciationText} from '../pronunciation-note-links.js';import {staffMarkup,staffNotes} from '../staff.js';import {soundingNotes} from '../synthesis.js';
const read=f=>JSON.parse(gunzipSync(readFileSync(new URL('../'+f,import.meta.url))));const lib=new PronunciationLibrary(read('data/pronunciation/torah-display.json.gz'),{underlay:read('data/pronunciation/torah-underlay.json.gz')}),corpus=await getCorpus();
const modelAt=(bookId,chapter,verse,opts={})=>createReadingModel(corpus.passage([{id:'study',bookId,start:{chapter,verse},end:{chapter,verse}}]),opts);
const model=modelAt('gen',22,1,{melodyId:'cohen-1902-gen22-ending'}),plan=model.buildPlan(0,12,{tempo:60}),report=style=>linkPronunciationToNotes(plan,model.words,lib,style);
const annotate=report=>new Map(report.links.map(l=>[l.eventId,l]));

test('bounded source notes link only to exactly equal marked Hebrew ranges; Wa/ye versus vay stays unlinked',()=>{
 for(const style of ['sephardic','ashkenazic']){
  const r=report(style);assert.deepEqual(r.counts,{notes:52,linkedNotes:50,unlinkedNotes:2});assert.equal(r.format,'tropetrain-pronunciation-note-links-v1');assert.equal(r.phonemes,null);assert.equal(r.audioTimes,null);
  assert.deepEqual(r.links.filter(l=>l.status==='unlinked').map(l=>[l.eventId,l.hebrew,l.reason]),[[plan[0].id,'וַ','different-syllable-boundaries'],[plan[1].id,'יְ','different-syllable-boundaries']]);
  for(const link of r.links){const w=model.words.find(w=>w.id===link.wordId);assert.equal(w.sourceHebrew.slice(link.hebrewRange.start,link.hebrewRange.end),link.hebrew);for(const u of link.units){const written=u.hebrewClusterRanges.filter(r=>r.role==='written');assert.equal(written[0].start,link.hebrewRange.start);assert.equal(written.at(-1).end,link.hebrewRange.end);assert.equal(written.map(r=>r.text).join(''),link.hebrew);}}
 }
});
test('styles retain literal transcription/stress and change labels independently of pitches, ties, rhythm and Hebrew',()=>{
 const before=JSON.stringify(model),notes=JSON.stringify(plan),a=report('sephardic'),b=report('ashkenazic');assert.deepEqual(a.links.map(l=>l.eventId),b.links.map(l=>l.eventId));assert.notDeepEqual(a.links.map(notePronunciationText),b.links.map(notePronunciationText));
 const raised=model.buildPlan(0,12,{tempo:120,transpose:5}),c=linkPronunciationToNotes(raised,model.words,lib,'sephardic');assert.deepEqual(a,c);
 assert.equal(JSON.stringify(model),before);assert.equal(JSON.stringify(plan),notes);assert.equal(soundingNotes(plan).length,50);assert.equal(soundingNotes(raised).length,50);
 assert.equal(a.pronunciationSource.dataLicense,'CC-BY-SA-4.0');assert.match(a.review,/Structural text correspondence/);
});
test('held ties and melismas share the original unit IDs, with shared consonants kept as references',()=>{
 const r=report('sephardic'),held=plan.filter(e=>e.tieId);assert.equal(held.length,4);
 for(const e of held){const linked=r.links.find(l=>l.eventId===e.id);assert.equal(linked.status,'exact-written-span');assert.equal(linked.units.length,1);}
 for(const id of new Set(held.map(e=>e.tieId))){const links=held.filter(e=>e.tieId===id).map(e=>r.links.find(l=>l.eventId===e.id));assert.deepEqual(links[0].units,links[1].units);}
 const had=r.links.find(l=>l.sourceWordId==='gen-22-1-3'&&l.hebrew==='הַ');assert.equal(had.units[0].text,'had');assert.equal(had.units[0].sharesNextConsonant,true);assert.equal(had.units[0].hebrewClusterRanges[1].role,'shared-consonant');assert.equal(had.units[0].hebrewClusterRanges[1].text,'דְּ');
 assert.equal(lib.study(model.words[2],'sephardic').rows[0].styles.sephardic[0].units[0].noteIds,null);
});
test('repeated assigned occurrences retain separate event/word IDs and the same canonical source-unit evidence',()=>{
 const section={bookId:'gen',start:{chapter:22,verse:1},end:{chapter:22,verse:1}},m=createReadingModel(corpus.passage([{...section,id:'first'},{...section,id:'repeat'}]),{melodyId:'cohen-1902-gen22-ending'}),p=m.buildPlan(0,m.words.length-1),r=linkPronunciationToNotes(p,m.words,lib,'ashkenazic');
 assert.deepEqual(r.counts,{notes:104,linkedNotes:100,unlinkedNotes:4});assert.notEqual(r.links[2].eventId,r.links[54].eventId);assert.notEqual(r.links[2].wordId,r.links[54].wordId);assert.equal(r.links[2].sourceWordId,r.links[54].sourceWordId);assert.deepEqual(r.links[2].units,r.links[54].units);
});
test('combined forms, missing correspondence and source-only written alternatives do not borrow or invent text',()=>{
 const combined=modelAt('deu',32,6),p=combined.buildPlan(0,1),r=linkPronunciationToNotes(p,combined.words,lib,'sephardic');assert.ok(r.links.every(l=>l.status==='unlinked'&&l.reason==='combined-source-form'));
 const divine=modelAt('gen',2,4),index=divine.words.findIndex(w=>w.sourceHebrew.replace(/[^א-ת]/gu,'')==='יהוה');assert.ok(index>=0);assert.ok(linkPronunciationToNotes(divine.buildPlan(index,index),divine.words,lib,'sephardic').links.every(l=>l.reason==='source-only-written-form'));
 const missing={sourceCommit:lib.sourceCommit,study:()=>null};const absent=linkPronunciationToNotes(plan.slice(0,1),model.words,missing,'sephardic');assert.equal(absent.links[0].reason,'no-source-correspondence');assert.equal(notePronunciationText(absent.links[0]),null);
 const sourceOnly={sourceCommit:lib.sourceCommit,study:(word,style)=>{const s=structuredClone(lib.study(word,style));for(const row of s.rows)for(const cell of row.styles[style])for(const unit of cell.units)unit.hebrewClusterRanges=null;return s;}};assert.equal(linkPronunciationToNotes(plan.slice(7,8),model.words,sourceOnly,'ashkenazic').links[0].reason,'source-only-written-form');
 assert.throws(()=>linkPronunciationToNotes(plan,model.words,lib,'invented'),/Unsupported pronunciation/);
});
test('altered marks, source offsets, event lyrics or occurrence IDs fail explicitly instead of changing Hebrew',()=>{
 assert.throws(()=>linkPronunciationToNotes([{...plan[2],syllable:'הִי'}],model.words,lib,'sephardic'),/original Hebrew/);
 assert.throws(()=>linkPronunciationToNotes([{...plan[2],wordId:'different'}],model.words,lib,'sephardic'),/word occurrences/);
 assert.throws(()=>linkPronunciationToNotes([plan[2],plan[2]],model.words,lib,'sephardic'),/Duplicate/);
 const bad={sourceCommit:lib.sourceCommit,study:(word,style)=>{const s=structuredClone(lib.study(word,style));const unit=s.rows.flatMap(r=>r.styles[style].flatMap(c=>c.units)).find(u=>u.readerWordId===(word.sourceWordId??word.id)&&u.hebrewClusterRanges);unit.hebrewClusterRanges[0].text='changed';return s;}};assert.throws(()=>linkPronunciationToNotes(plan.slice(7,8),model.words,bad,'sephardic'),/original marked Hebrew/);
});
test('alternative qamats columns and explicit repeat references retain separate source-unit identities',()=>{
 const m=modelAt('deu',1,27),p=m.buildPlan(1,1),r=linkPronunciationToNotes(p,m.words,lib,'ashkenazic');
 assert.ok(r.links.some(l=>l.units.some(u=>u.sourceReference)));
 for(const link of r.links.filter(l=>l.status==='exact-written-span')){
  assert.ok(link.units.some(u=>u.sourceColumn===1));assert.ok(link.units.some(u=>u.sourceColumn===2));assert.equal(new Set(link.units.map(u=>u.sourceUnitId)).size,link.units.length);
  const repeated=link.units.find(u=>u.sourceColumn===2);assert.equal(repeated.sourceReference.style,'ashkenazic');assert.equal(repeated.sourceReference.column,1);assert.ok(repeated.labels.includes('קמץ-ס'));assert.ok(repeated.sourceMarks.every(m=>m.sourceColumn===1));
 }
 const s=linkPronunciationToNotes(p,m.words,lib,'sephardic');assert.notDeepEqual(r.links.map(notePronunciationText),s.links.map(notePronunciationText));assert.equal(r.words[0].hebrew,'בְאָהֳלֵיכֶם֙');
});
test('staff keeps exact Hebrew, source alternatives, melisma continuations and source note values while adding a separate text line',()=>{
 const r=report('sephardic'),map=annotate(r),plain=staffMarkup(plan,model.words),labeled=staffMarkup(plan,model.words,0,12,{pronunciationLinks:map});assert.match(labeled,/height="280"/);assert.match(labeled,/written-span correspondence only/);assert.match(labeled,/pronunciation text: unlinked/);assert.match(labeled,/class="staff-pronunciation unlinked"/);assert.match(labeled,/hí/);assert.match(labeled,/melisma-line/);assert.match(labeled,/Tie: hold the same pitch/);assert.doesNotMatch(plain,/class="staff-pronunciation/);
 const a=staffNotes(plan,model.words),b=staffNotes(plan,model.words,0,12,{pronunciationLinks:map});assert.deepEqual(a.map(n=>[n.id,n.midi,n.beats,n.syllable]),b.map(n=>[n.id,n.midi,n.beats,n.syllable]));
 const next=staffMarkup(plan,model.words,3,12,{pronunciationLinks:map});assert.match(next,/hí/);assert.match(next,/Tie: hold the same pitch/);
});
test('the full-Torah structural audit pins its source inputs and is embedded unchanged in the standalone',()=>{
 const raw=readFileSync(new URL('../docs/PRONUNCIATION-NOTE-CORRESPONDENCE.json',import.meta.url)),r=JSON.parse(raw);assert.equal(r.words,79985);assert.equal(r.verses,5853);
 for(const input of r.inputs)assert.equal(createHash('sha256').update(readFileSync(new URL('../'+input.path,import.meta.url))).digest('hex'),input.sha256);
 for(const style of ['sephardic','ashkenazic']){assert.equal(r.originalDemo[style].notes,231178);assert.equal(r.originalDemo[style].linkedNotes,220525);assert.equal(r.originalDemo[style].wordsFullyLinked,74783);assert.equal(r.boundedPrintedGenesis22[style].linkedNotes,50);assert.equal(r.boundedPrintedGenesis22[style].unlinked.length,2);}
 assert.match(r.limits,/not a traditional melody/);assert.ok(restoredPortableHtml(readFileSync(new URL('../TropeTrain.html',import.meta.url),'utf8')).includes('data:application/json;base64,'+raw.toString('base64')));
});
