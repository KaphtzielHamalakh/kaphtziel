import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PronunciationLibrary} from '../pronunciation.js';
import {Corpus} from '../library.js';
import {createReadingModel} from '../music.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url));
const data=JSON.parse(gunzipSync(read('data/pronunciation/torah-display.json.gz'))),underlay=JSON.parse(gunzipSync(read('data/pronunciation/torah-underlay.json.gz'))),lib=new PronunciationLibrary(data,{underlay}),baseline=new PronunciationLibrary(data);
const word=id=>{const hit=lib.byWord.get(id);return {id,sourceHebrew:hit.group.readerHebrew[hit.index]};};
const cell=(id,style='sephardic',column=0)=>lib.study(word(id),style).rows[0].styles[style][column];
const plain=u=>u.hebrewClusterRanges.filter(r=>r.role==='written').map(r=>r.text).join('');
test('source syllables annotate exact Hebrew clusters and Unicode marks independently in both styles',()=>{
 const w=word('gen-1-1-1'),before=JSON.stringify(lib.at(w));
 for(const style of ['sephardic','ashkenazic']){
  const s=lib.study(w,style);assert.equal(s.revision,4);assert.deepEqual(cell(w.id,style).units.map(plain),['בְּ','רֵא','שִׁ֖ית']);
  assert.equal(cell(w.id,style).units.map(plain).join(''),w.sourceHebrew);assert.ok(cell(w.id,style).units.every(u=>u.phonemes===null&&u.noteIds===null&&u.audioTimes===null));
 }
 assert.equal(JSON.stringify(lib.at(w)),before);assert.equal(cell(w.id,'sephardic').units[2].text,'shít');assert.equal(cell(w.id,'ashkenazic').units[2].text,'shís');
});
test('geminated consonants reference the following written cluster without duplicating source letters or its vowel',()=>{
 for(const id of ['gen-8-20-7','num-12-9-1']){
  const c=cell(id),first=c.units[0],next=c.units[1];assert.equal(first.hebrewUnderlay.variants[0].sharesNextConsonant.letterStart,first.hebrewUnderlay.variants[0].source.letterEnd);
  assert.equal(next.hebrewUnderlay.variants[0].sharesPreviousConsonant,true);
  assert.deepEqual(first.hebrewClusterRanges.filter(r=>r.role==='shared-consonant').map(r=>[r.readerWordId,r.start,r.end,r.text]),next.hebrewClusterRanges.filter(r=>r.role==='written').map(r=>[r.readerWordId,r.start,r.end,r.text]));
  assert.equal(c.units.map(plain).join(''),word(id).sourceHebrew);
 }
 assert.equal(plain(cell('gen-8-20-7').units[0]),'הַ');assert.equal(plain(cell('gen-8-20-7').units[1]),'בְּ');
});
test('computed ranges resolve all twelve combined-name words, preserve earlier links and keep the unsplit divine reading unresolved',()=>{
 let added=new Set(),units=0;
 for(const exception of JSON.parse(read('docs/PRONUNCIATION-WORD-ALIGNMENT.json')).exceptions){
  const id=exception.readerIds[0],s=lib.study(word(id),'sephardic'),b=baseline.study(word(id),'sephardic');assert.deepEqual(s.sourceBoundaryWordAlignment,b.wordAlignment);
  for(const style of ['sephardic','ashkenazic'])s.rows.forEach((row,ri)=>row.styles[style].forEach((c,ci)=>c.units.forEach((u,ui)=>{
   const old=b.rows[ri].styles[style][ci].units[ui];assert.equal(u.sourceBoundaryReaderWordId,old.readerWordId);if(old.readerWordId)assert.equal(u.readerWordId,old.readerWordId);else if(u.readerWordId){added.add(u.readerWordId);units++;}
  })));
 }
 assert.equal(added.size,12);assert.equal(units,44);
 assert.deepEqual(cell('gen-14-17-9').units.map(u=>u.readerWordId),['gen-14-17-8','gen-14-17-9','gen-14-17-9','gen-14-17-10','gen-14-17-10','gen-14-17-10']);
 assert.ok(cell('deu-32-6-1').units.every(u=>u.readerWordId===null&&u.hebrewClusterRanges===null&&u.hebrewUnderlay.status==='source-only'));
});
test('repeat marks and four Hebrew alternatives retain separate source slices, labels and all reader accents',()=>{
 const d=lib.study(word('deu-1-27-2'),'ashkenazic'),[a,b]=d.rows[0].styles.ashkenazic;
 assert.equal(b.literalText,'—');assert.equal(b.sourceReference.column,1);assert.deepEqual(a.units.map(plain),b.units.map(plain));assert.notEqual(a.units[1].hebrewUnderlay.variants[0].source.text,b.units[1].hebrewUnderlay.variants[0].source.text);
 const c=cell('exo-20-5-5','ashkenazic',1);assert.ok(c.units.every(u=>u.hebrewUnderlay.variants.length===2));assert.deepEqual(c.units[2].hebrewUnderlay.variants.map(v=>v.source.text),['דֵ֑ם','דֵם֒']);assert.equal(plain(c.units[2]),'דֵ֑ם֒');
 assert.deepEqual(c.units[2].hebrewUnderlay.variants.map(v=>v.labels[0]),['טעם תחתון, קמץ-ס','טעם עליון, קמץ-ס']);
});
test('changed provenance, missing entries and malformed boundaries are refused without changing Hebrew',()=>{
 assert.throws(()=>new PronunciationLibrary(data,{underlay:{...underlay,inputSha256:'bad'}}),/source needs review/);
 for(const mutate of [g=>g.splice(0),g=>g[0][1][0][3][0]=0,g=>g[0][1][0][3][0]=999,g=>g[0][1][0][4]=[2]]){
  const copy=structuredClone(underlay);mutate(copy.groups['pmam-gen-1-1-1']);const bad=new PronunciationLibrary(data,{underlay:copy});assert.throws(()=>bad.study(word('gen-1-1-1'),'sephardic'),/underlay|boundaries/);
 }
 assert.throws(()=>lib.study({...word('gen-1-1-1'),sourceHebrew:'בְּרֵאשִׁית'},'sephardic'),/Hebrew source changed/);
});
test('every corpus range is an exact original slice and preserves all old unit IDs, text, marks and nonnull word links',()=>{
 let mapped=0,only=0,newLinks=0;
 for(const g of data.groups){
  const w=word(g.readerIds[0]),s=lib.study(w,'sephardic'),b=baseline.study(w,'sephardic');assert.equal(s.sourceGroup,g);
  for(const row of s.rows)for(const style of ['sephardic','ashkenazic'])row.styles[style].forEach((c,ci)=>c.units.forEach((u,ui)=>{
   const old=b.rows.find(r=>r.number===row.number).styles[style][ci].units[ui];assert.equal(u.id,old.id);assert.equal(u.text,old.text);assert.deepEqual(u.sourceMarks,old.sourceMarks);if(old.readerWordId)assert.equal(u.readerWordId,old.readerWordId);else newLinks+=u.readerWordId!==null;
   if(u.hebrewClusterRanges){mapped++;for(const r of u.hebrewClusterRanges){const text=g.readerHebrew[g.readerIds.indexOf(r.readerWordId)];assert.equal(text.slice(r.start,r.end),r.text);assert.ok(/[א-ת]/u.test(text[r.start]));assert.ok(r.end===text.length||/[א-ת]/u.test(text[r.end]));}}
   else only++;
  }));
 }
 assert.deepEqual({mapped,only,newLinks},{mapped:375386,only:12502,newLinks:44});assert.equal(createHash('sha256').update(read('data/pronunciation/torah-display.json.gz')).digest('hex'),'0be1dc0fb62d1754ddb03eda10efd7f393d9b571b6a7cdff6436078452ff06c7');
});
test('the pinned GPL3 computation and both full style projections reproducibly regenerate the entire factual packet',()=>{
 const output=execFileSync('python3',[new URL('../scripts/build-pronunciation-underlay.py',import.meta.url).pathname,'--check'],{encoding:'utf8',timeout:60000});const report=JSON.parse(output);
 assert.equal(report.groups,68503);assert.deepEqual(report.unresolved,[]);assert.equal(report.counts.variants,68718);assert.equal(report.counts.variantUnits,194268);assert.equal(report.counts.sharedConsonants,18249);assert.equal(report.outputSha256,createHash('sha256').update(read('data/pronunciation/torah-underlay.json.gz')).digest('hex'));
});
test('underlay studies preserve musical plans, range/transposition settings and repeated assignment occurrence IDs',()=>{
 const manifest=JSON.parse(read('data/torah/manifest.json')),corpus=new Corpus({manifest,books:manifest.books.map(b=>JSON.parse(read('data/torah/'+b.file)))}),model=createReadingModel(corpus.passage([{id:'a',bookId:'gen',start:{chapter:8,verse:20},end:{chapter:8,verse:20}}]));
 const before=JSON.stringify(model),plan=JSON.stringify(model.buildPlan(0,model.words.length-1,{tempo:74,transpose:-3}));for(const w of model.words)for(const style of ['sephardic','ashkenazic'])lib.study(w,style);assert.equal(JSON.stringify(model),before);assert.equal(JSON.stringify(model.buildPlan(0,model.words.length-1,{tempo:74,transpose:-3})),plan);
 const w=word('gen-8-20-7'),s=lib.study({...w,id:w.id+'@repeat',sourceWordId:w.id},'ashkenazic');assert.equal(s.selection.occurrenceId,w.id+'@repeat');assert.equal(s.rows[0].styles.ashkenazic[0].units[0].hebrewClusterRanges[0].readerWordId,w.id);
});
