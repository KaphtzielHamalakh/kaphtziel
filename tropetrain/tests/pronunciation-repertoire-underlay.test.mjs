import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {PronunciationLibrary,PRONUNCIATION_STYLES} from '../pronunciation.js';
import {PRONUNCIATION_REPERTOIRE_SUMMARY as summary} from '../pronunciation-repertoire-summary.js';
import {PRONUNCIATION_REPERTOIRE_UNDERLAY as facts} from '../pronunciation-repertoire-underlay-summary.js';
import {readerPronunciationWord} from '../pronunciation-reader.js';
import {Corpus} from '../library.js';
import {createReadingModel} from '../music.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const display=id=>JSON.parse(gunzipSync(read(`data/pronunciation/repertoire/${id}.json.gz`)));
const underlay=id=>JSON.parse(gunzipSync(read(`data/pronunciation/repertoire-underlay/${id}.json.gz`)));
const empty={format:'tropetrain-pronunciation-display-v1',revision:5,sourceCommit:summary.sourceCommit,groups:[]};
const make=(loadUnderlay=async id=>underlay(id))=>new PronunciationLibrary(empty,{repertoire:{books:summary.books,loadBook:async id=>display(id),loadUnderlay}});
const reader=id=>JSON.parse(read(`data/repertoire/${id}.json`));
const word=id=>{const g=display(id.split('-')[0]).groups.find(g=>g.readerIds.includes(id));return {id,sourceHebrew:g.readerHebrew[g.readerIds.indexOf(id)]};};

test('all26 additional underlays retain the exact pinned display and computation identities',()=>{
 const audit=JSON.parse(read('docs/PRONUNCIATION-REPERTOIRE-UNDERLAY.json'));assert.equal(audit.books.length,26);assert.equal(audit.groups,129400);assert.equal(audit.unresolvedRows,0);
 assert.equal(audit.books.reduce((n,b)=>n+b.counts.variantUnits,0),367932);
 for(const info of facts.books){
  const raw=read(`data/pronunciation/repertoire-underlay/${info.bookId}.json.gz`),data=underlay(info.bookId);
  assert.equal(raw.length,info.packetBytes);assert.equal(createHash('sha256').update(raw).digest('hex'),info.packetSha256);
  assert.equal(data.inputSha256,summary.books.find(b=>b.bookId===info.bookId).packetSha256);assert.equal(data.sourceCommit,summary.sourceCommit);
  assert.equal(data.computationSourceSha256,facts.computationSourceSha256);assert.equal(Object.keys(data.groups).length,info.groups);
 }
 const aligned=JSON.parse(read('docs/PRONUNCIATION-REPERTOIRE-UNDERLAY-ALIGNMENT.json'));
 for(const s of Object.values(aligned.styles))assert.deepEqual(s,{units:367932,exactReaderUnits:356847,sourceOnlyUnits:11085,priorWordLinks:367830,additionalWordLinks:102,wordsWithUnits:150620,wordsWithExactRanges:146934,wordsFullyCovered:146934,wordsWithPartialRanges:0});
 assert.equal(aligned.review,null);
});

test('independent text styles align Isaiah42:5 to exact marked slices while retaining the complete maqaf group',async()=>{
 const library=make(),w=word('isa-42-5-2');await library.loadBookFor(w);const before=JSON.stringify(library.at(w));
 for(const [style,text] of [['sephardic','’a·mar'],['ashkenazic','’o·mar']]){
  const study=library.study(w,style),report=readerPronunciationWord(w,study,style),entry=report.entries[0];
  assert.equal(entry.text,text);assert.equal(entry.sourceForm,false);assert.deepEqual(entry.parts.map(p=>p.hebrewClusterRanges[0].text),['אָ','מַ֞ר']);assert.equal(entry.parts.at(-1).sourceStress,true);
  assert.deepEqual(study.readerHebrew,['כֹּֽה־','אָמַ֞ר']);assert.equal(study.sourceSegments,undefined);
  for(const row of study.rows)for(const cells of Object.values(row.styles))for(const cell of cells)for(const unit of cell.units)for(const field of ['phonemes','noteIds','audioTimes'])assert.equal(unit[field],null);
 }
 assert.equal(JSON.stringify(library.at(w)),before);assert.equal(w.sourceHebrew,'אָמַ֞ר');
 assert.deepEqual(PRONUNCIATION_STYLES.map(s=>s.id),['sephardic','ashkenazic']);
});

test('a different source reading keeps its word link and null written ranges instead of rewriting the reader',async()=>{
 const info=JSON.parse(read('docs/PRONUNCIATION-REPERTOIRE-ALIGNMENT.json')).books.find(b=>b.explicitWrittenReadEvidence.length);
 const data=display(info.bookId),group=data.groups.find(g=>g.writtenReadVariants?.length),id=group.writtenReadVariants[0].readerWordId,w=word(id),library=make();await library.loadBookFor(w);
 const before=JSON.stringify(library.at(w));
 for(const style of ['sephardic','ashkenazic']){
  const s=library.study(w,style),units=s.rows.flatMap(r=>r.styles[style].flatMap(c=>c.units)).filter(u=>u.readerWordId===id);
  assert.ok(units.length);assert.ok(units.every(u=>u.hebrewClusterRanges===null));assert.ok(units.every(u=>u.hebrewUnderlay.status==='source-only'));
  assert.ok(readerPronunciationWord(w,s,style).entries.every(e=>e.sourceForm));
 }
 assert.equal(JSON.stringify(library.at(w)),before);
});

test('underlay requests share work, recover after failure and refuse swapped provenance',async()=>{
 const w=word('isa-42-5-2');let count=0;const library=make(async id=>{count++;return underlay(id);});
 await Promise.all([library.loadBookFor(w),library.loadBookFor(w)]);assert.equal(count,1);
 let tries=0;const retry=make(async id=>{if(!tries++)throw Error('fixture unavailable');return underlay(id);});
 await assert.rejects(retry.loadBookFor(w),/fixture unavailable/);assert.equal(retry.bookLoaded(w),false);await retry.loadBookFor(w);assert.ok(retry.study(w,'sephardic').hebrewUnderlay);
 for(const mutate of [d=>{d.inputSha256='changed';},d=>{d.sourceCommit='changed';},d=>{d.computationSourceSha256='changed';},d=>{delete d.groups[Object.keys(d.groups)[0]];}]){
  const bad=make(async id=>{const d=underlay(id);mutate(d);return d;});await assert.rejects(bad.loadBookFor(w),/underlay source changed/);assert.equal(bad.bookLibraries.size,0);
 }
});

test('changed accents and invalid source boundaries are refused; assignment occurrences and musical plans remain independent',async()=>{
 const w=word('isa-42-5-2'),library=make();await library.loadBookFor(w);
 assert.throws(()=>library.study({...w,sourceHebrew:w.sourceHebrew.replace('֞','')},'sephardic'),/Hebrew source changed/);
 const bad=make(async id=>{const d=underlay(id),g=display(id).groups.find(g=>g.readerIds.includes(w.id));d.groups[g.id][0][1][0][3][0]=0;return d;});await bad.loadBookFor(w);assert.throws(()=>bad.study(w,'sephardic'),/boundaries/);
 const manifest=JSON.parse(read('data/repertoire/manifest.json')),corpus=new Corpus({manifest:{...manifest,books:manifest.books.filter(b=>b.id==='isa')},books:[reader('isa')]}),model=createReadingModel(corpus.passage([{id:'a',bookId:'isa',start:{chapter:42,verse:5},end:{chapter:42,verse:5}}]));
 const before=JSON.stringify(model),plan=JSON.stringify(model.buildPlan(0,model.words.length-1,{tempo:63,transpose:4}));
 for(const word of model.words)for(const style of ['sephardic','ashkenazic'])library.study(word,style);
 assert.equal(JSON.stringify(model),before);assert.equal(JSON.stringify(model.buildPlan(0,model.words.length-1,{tempo:63,transpose:4})),plan);
 const repeated=library.study({...w,id:'occurrence-two',sourceWordId:w.id},'ashkenazic');assert.equal(repeated.selection.occurrenceId,'occurrence-two');assert.equal(repeated.selection.sourceWordId,w.id);
});

test('both distributions embed all26 checked underlays and their audits within the portable file limit',()=>{
 const bundle=read('app.bundle.js').toString(),portable=restoredPortableHtml(read('TropeTrain.html')).toString();
 for(const info of facts.books){const encoded=read(`data/pronunciation/repertoire-underlay/${info.bookId}.json.gz`).toString('base64');assert.ok(bundle.includes(encoded),info.bookId);assert.ok(portable.includes(encoded),info.bookId);}
 for(const name of ['PRONUNCIATION-REPERTOIRE-UNDERLAY','PRONUNCIATION-REPERTOIRE-UNDERLAY-ALIGNMENT'])assert.ok(portable.includes(read('docs/'+name+'.json').toString('base64')));
 assert.ok(portableFileBytes()<100*1024*1024);
});
