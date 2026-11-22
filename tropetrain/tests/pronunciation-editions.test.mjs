import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {execFileSync} from 'node:child_process';
import {PronunciationLibrary} from '../pronunciation.js';import {readerPronunciationWord} from '../pronunciation-reader.js';import {getCorpus} from '../library.js';import {createReadingModel} from '../music.js';import {linkPronunciationToNotes} from '../pronunciation-note-links.js';import {linkPronunciationScoreGroups} from '../pronunciation-score-groups.js';
const root=new URL('../',import.meta.url),bytes=p=>readFileSync(new URL(p,root)),data=p=>JSON.parse(gunzipSync(bytes(p))),packet=data('data/pronunciation/torah-display.json.gz'),lib=new PronunciationLibrary(packet,{underlay:data('data/pronunciation/torah-underlay.json.gz'),segments:data('data/pronunciation/torah-segments.json.gz')}),record=JSON.parse(bytes('docs/PRONUNCIATION-EDITION-WORDS.json')),corpus=await getCorpus(),word=id=>{const hit=lib.byWord.get(id);return {id,sourceHebrew:hit.group.readerHebrew[hit.index]};};
test('independent primary-edition audit proves119 bounded gaps/141 words and preserves all68384 previous groups',()=>{
 const report=JSON.parse(execFileSync('python3',[new URL('scripts/audit-pronunciation-editions.py',root).pathname],{encoding:'utf8'}));assert.deepEqual(report,{editionGroups:119,editionWords:141,allPreviousGroupsUnchanged:68384,refusedWords:['gen-4-18-9'],phonologicalEquivalenceInferred:false});assert.equal(packet.revision,5);assert.equal(packet.groups.length,68504);
});
test('both independent styles retain the distinct primary/reader spellings, original source stress and null written ranges',()=>{
 const w=word('gen-8-20-8'),before=JSON.stringify(lib.at(w)),a=lib.study(w,'sephardic'),b=lib.study(w,'ashkenazic'),ra=readerPronunciationWord(w,a,'sephardic'),rb=readerPronunciationWord(w,b,'ashkenazic');
 assert.equal(w.sourceHebrew,'הַטְּהוֹרָ֗ה');assert.equal(ra.entries[0].editionWordLink.primaryHebrew,'הַטְּהֹרָ֗ה');assert.equal(ra.entries[0].text,'hat·tᵉ·hó·ra');assert.equal(rb.entries[0].text,'hat·tᵉ·hó·ro');assert.equal(ra.entries[0].parts.at(-1).sourceStress,true);
 for(const report of [ra,rb])assert.ok(report.entries.flatMap(e=>e.parts).every(p=>p.hebrewClusterRanges===null));assert.equal(JSON.stringify(lib.at(w)),before);
});
test('a joined source row assigns its exact prefix separately while different-spelling syllables keep source-only ranges',()=>{
 const a=word('exo-23-22-2'),b=word('exo-23-22-3');assert.equal(lib.at(a),lib.at(b));assert.deepEqual(lib.at(a).readerIds,[a.id,b.id]);
 for(const style of ['sephardic','ashkenazic']){
  const x=readerPronunciationWord(a,lib.study(a,style),style),y=readerPronunciationWord(b,lib.study(b,style),style);
  assert.equal(x.entries[0].text,'’im');assert.ok(x.entries[0].parts.every(p=>p.hebrewClusterRanges?.every(r=>r.readerWordId===a.id)));
  assert.ok(y.entries[0].parts.every(p=>p.hebrewClusterRanges===null));assert.ok(y.entries[0].text.startsWith(style==='sephardic'?'sha·':'sho·'));
  const ids=x.entries.flatMap(e=>e.parts.map(p=>p.sourceUnitId));assert.ok(y.entries.flatMap(e=>e.parts).every(p=>!ids.includes(p.sourceUnitId)));
 }
});
test('the two-row source gap and a null first Hebrew column preserve their literal cells and ordered word owners',()=>{
 const a=word('deu-4-42-14'),b=word('deu-4-42-15'),group=lib.at(a);assert.deepEqual(group.readerIds,[a.id,b.id]);assert.deepEqual(group.rows.map(r=>r.number),[11,12]);
 const s=lib.study(a,'sephardic');assert.ok(s.rows[0].styles.sephardic.flatMap(c=>c.units).every(u=>u.readerWordId===a.id));assert.ok(s.rows[1].styles.sephardic.flatMap(c=>c.units).every(u=>u.readerWordId===b.id));
 const w=word('deu-28-59-9');assert.equal(lib.at(w).rows[0].hebrew[0],null);assert.equal(readerPronunciationWord(w,lib.study(w,'ashkenazic'),'ashkenazic').entries[0].text,'gᵉ·dó·lós');
});
test('edition correspondence never manufactures individual note links or common marked-Hebrew spans for a changed spelling',()=>{
 const m=createReadingModel(corpus.passage([{id:'first',bookId:'gen',start:{chapter:8,verse:20},end:{chapter:8,verse:20}}])),i=m.words.findIndex(w=>w.sourceWordId==='gen-8-20-8'||w.id==='gen-8-20-8'),w=m.words[i],plan=m.buildPlan(i,i,{tempo:60}),before=JSON.stringify([m,plan]);assert.ok(i>=0);
 for(const style of ['sephardic','ashkenazic']){
  const notes=linkPronunciationToNotes(plan,m.words,lib,style),groups=linkPronunciationScoreGroups(plan,m.words,lib,style);assert.equal(notes.counts.linkedNotes,0);assert.ok(notes.links.every(l=>l.reason==='source-only-written-form'));assert.equal(groups.counts.eventsInCommonSpans,0);assert.equal(groups.words[0].reason,'source-only-written-form');
  const repeated=readerPronunciationWord({...w,id:'again',sourceWordId:'gen-8-20-8'},lib.study({...w,id:'again',sourceWordId:'gen-8-20-8'},style),style);assert.equal(repeated.wordId,'again');assert.equal(repeated.sourceWordId,'gen-8-20-8');
 }
 assert.equal(JSON.stringify([m,plan]),before);assert.equal(m.buildPlan(i,i,{tempo:120,transpose:2})[0].midi,plan[0].midi+2);
});
test('altered source spellings, owners, primary verse coordinates and reader marks are refused',()=>{
 const w=word('gen-8-20-8');assert.throws(()=>lib.study({...w,sourceHebrew:w.sourceHebrew+'֗'},'sephardic'),/Hebrew source changed/);
 for(const mutate of [g=>g.editionWordLinks[0].primaryHebrew='אחר',g=>g.editionWordLinks[0].readerWordId='other',g=>g.editionWordLinks[0].primaryVerse='Gen.8.21',g=>delete g.variantWindow.beforeGroup]){
  const g=structuredClone(lib.at(w));mutate(g);const broken=new PronunciationLibrary({...packet,groups:[g]});assert.throws(()=>broken.study(w,'sephardic'),/edition|Primary/);
 }
 const missing=corpus.passage([{id:'gap',bookId:'gen',start:{chapter:4,verse:18},end:{chapter:4,verse:18}}]).verses[0].words.find(w=>w.id==='gen-4-18-9'||w.sourceWordId==='gen-4-18-9');assert.ok(missing);assert.equal(lib.study(missing,'sephardic').sourceGroup.implicitReadingLinks[0].readerWordId,'gen-4-18-9');
});
test('primary Scripture projection chooses typed branches, reassembles formatted letters and refuses unknown roles',()=>{
 const script=`from pronunciation_editions import primary_text\nassert primary_text({'type':'kq','contents':[{'type':'kq-q','text':'קְרֵא'},{'type':'kq-k','text':'כתב'}]})=='קְרֵא'\nassert primary_text({'type':'scrdfftar','contents':[{'type':'sdt-target','text':'אָב'},{'type':'sdt-note','text':'a note with Hebrew אבג'}]})=='אָב'\nassert primary_text({'type':'slh-word','slhw-desc-0':'אָב','contents':[{'type':'letter-large','text':'אָ'},{'type':'text','text':'ב'}]})=='אָב'\nassert primary_text({'type':'verse','contents':[{'type':'text','text':'אָב'},{'type':'lp-paseq'},{'type':'text','text':'גַּד'}]})=='אָב׀גַּד'\nfor node in [{'type':'unknown','text':'א'},{'type':'text'},{'type':'slh-word','slhw-desc-0':'wrong','contents':[{'type':'text','text':'א'}]},{'type':'kq','contents':[{'type':'kq-k','text':'א'}]}]:\n try:primary_text(node)\n except ValueError:pass\n else:raise AssertionError(node)\nprint('primary projection fixtures passed')`;
 assert.match(execFileSync('python3',['-c',script],{cwd:new URL('scripts/',root),encoding:'utf8'}),/fixtures passed/);
});
test('both portable evidence files are exact and every new source unit retains null phonemes and sound times',()=>{
 const html=bytes('TropeTrain.html');for(const [path,mime] of [['docs/PRONUNCIATION-EDITION-WORDS.json','application/json'],['assets/pronunciation/mam-simple-torah-sources.zip','application/zip']])assert.ok(html.includes('data:'+mime+';base64,'+bytes(path).toString('base64')));
 for(const e of record.entries){const s=lib.study(word(e.readerIds[0]),'sephardic');for(const row of s.rows)for(const cells of Object.values(row.styles))for(const cell of cells)for(const u of cell.units){assert.equal(u.phonemes,null);assert.equal(u.noteIds,null);assert.equal(u.audioTimes,null);for(const v of u.sourceSegments.variants)for(const seg of v.segments){assert.equal(seg.phonemes,null);assert.equal(seg.audioTimes,null);}}}
});
