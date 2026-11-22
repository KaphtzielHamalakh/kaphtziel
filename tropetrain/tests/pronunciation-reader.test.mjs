import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';
import {PronunciationLibrary} from '../pronunciation.js';import {readerPronunciationWord} from '../pronunciation-reader.js';import {getCorpus} from '../library.js';import {createReadingModel} from '../music.js';
const json=f=>JSON.parse(gunzipSync(readFileSync(new URL('../'+f,import.meta.url)))),data=json('data/pronunciation/torah-display.json.gz'),lib=new PronunciationLibrary(data,{underlay:json('data/pronunciation/torah-underlay.json.gz')});
const word=id=>{const hit=lib.byWord.get(id);return {id,sourceHebrew:hit.group.readerHebrew[hit.index]};};
const report=(id,style='sephardic')=>{const w=word(id);return readerPronunciationWord(w,lib.study(w,style),style);};

test('reader text preserves literal units, original joins, stress, marks and exact marked Hebrew in both independent styles',()=>{
 const a=report('gen-22-1-3'),b=report('gen-22-1-3','ashkenazic');
 assert.equal(a.hebrew,'הַדְּבָרִ֣ים');assert.equal(b.hebrew,a.hebrew);assert.equal(a.entries[0].text,'had·dᵉ·va·rím');assert.equal(b.entries[0].text,'had·dᵉ·vo·rím');
 assert.deepEqual(a.entries[0].parts.map(p=>p.sourceStress),[false,false,false,true]);assert.ok(a.entries[0].parts[0].sharesNextConsonant);assert.ok(a.entries[0].parts[1].sharesPreviousConsonant);
 for(const r of [a,b]){assert.equal(r.status,'word-linked');assert.equal(r.entries[0].parts.map(p=>p.join+p.text).join(''),r.entries[0].text);assert.equal(r.entries[0].parts.flatMap(p=>p.hebrewClusterRanges.filter(r=>r.role==='written')).map(r=>r.text).join(''),r.hebrew);}
});
test('joined source groups display only individually owned units and never another word’s pronunciation',()=>{
 assert.equal(report('gen-1-2-6').entries[0].text,'‘al');assert.equal(report('gen-1-2-7').entries[0].text,'pᵉ·né');
 assert.equal(report('gen-14-17-9').entries[0].text,'kᵉ·dor');assert.equal(report('gen-14-17-10').entries[0].text,'la·‘ó·mer');
 const r=report('gen-14-17-9');assert.equal(r.entries[0].start,4);assert.equal(r.entries[0].end,10);assert.ok(r.entries[0].parts.every(p=>p.hebrewClusterRanges.every(x=>x.readerWordId===r.sourceWordId)));
});
test('qamats alternatives and explicit repeated columns remain separate with their source labels and identities',()=>{
 const a=report('deu-1-27-2'),b=report('deu-1-27-2','ashkenazic');assert.equal(a.entries.length,2);assert.notEqual(a.entries[0].text,a.entries[1].text);
 assert.deepEqual(a.entries.map(e=>e.labels),[['קמץ-ד'],['קמץ-ס']]);assert.equal(b.entries.length,2);assert.equal(b.entries[0].text,b.entries[1].text);assert.equal(b.entries[1].sourceReference.column,1);assert.notEqual(b.entries[0].sourceCellId,b.entries[1].sourceCellId);
 assert.deepEqual(report('exo-20-5-5','ashkenazic').entries[1].labels,['טעם תחתון, קמץ-ס','טעם עליון, קמץ-ס']);
});
test('combined, missing and source-only reading forms remain explicit without inventing a written range or fallback',()=>{
 for(const id of ['deu-32-6-1','deu-32-6-2']){const r=report(id);assert.equal(r.status,'combined-source-form');assert.deepEqual(r.entries,[]);}
 const absent=readerPronunciationWord({id:'gen-8-20-8',sourceHebrew:'הַטְּהוֹרָ֗ה'},null,'ashkenazic');assert.equal(absent.status,'no-source-correspondence');assert.deepEqual(absent.entries,[]);
 const id=[...lib.byWord.keys()].find(id=>{const r=report(id);return r.entries.some(e=>e.sourceForm);});assert.ok(id);const r=report(id);assert.equal(r.status,'word-linked');assert.ok(r.entries.some(e=>e.parts.some(p=>p.hebrewClusterRanges===null)));
 const w=word('gen-1-1-2'),s=structuredClone(lib.study(w,'sephardic'));s.rows.forEach(r=>r.styles.sephardic=[]);assert.equal(readerPronunciationWord(w,s,'sephardic').status,'no-style-transcription');
});
test('different marks, unsupported styles, wrong owners and corrupted source offsets are refused',()=>{
 const w=word('gen-1-1-2'),s=lib.study(w,'sephardic');assert.throws(()=>readerPronunciationWord({...w,sourceHebrew:'בָּרָא'},s,'sephardic'),/Hebrew source changed/);assert.throws(()=>readerPronunciationWord(w,s,'invented'),/Unsupported/);
 for(const change of [s=>s.rows[0].styles.sephardic[0].units[0].start++,s=>s.rows[0].styles.sephardic[0].units[0].hebrewClusterRanges[0].text='changed']){const bad=structuredClone(s);change(bad);assert.throws(()=>readerPronunciationWord(w,bad,'sephardic'),/source offsets|original marked Hebrew/);}
});
test('reading occurrences stay distinct while source units, Hebrew, melody plans, pitches and durations remain unchanged',async()=>{
 const c=await getCorpus(),section={bookId:'gen',start:{chapter:22,verse:1},end:{chapter:22,verse:1}},m=createReadingModel(c.passage([{id:'first',...section},{id:'repeat',...section}]),{melodyId:'cohen-1902-gen22-ending'}),before=JSON.stringify(m),plan=m.buildPlan(0,m.words.length-1,{tempo:60,transpose:0}),p=JSON.stringify(plan),a=m.words.filter(w=>w.sourceWordId==='gen-22-1-3').map(w=>readerPronunciationWord(w,lib.study(w,'sephardic'),'sephardic'));
 assert.equal(a.length,2);assert.notEqual(a[0].wordId,a[1].wordId);assert.equal(a[0].sourceWordId,a[1].sourceWordId);assert.deepEqual(a[0].entries,a[1].entries);
 for(const w of m.words)for(const style of ['sephardic','ashkenazic'])readerPronunciationWord(w,lib.study(w,style),style);
 assert.equal(JSON.stringify(m),before);assert.equal(JSON.stringify(m.buildPlan(0,m.words.length-1,{tempo:60,transpose:0})),p);assert.equal(m.buildPlan(0,m.words.length-1,{tempo:120,transpose:2})[0].midi,plan[0].midi+2);
});
test('every mapped Torah word retains every owned source unit in both styles and no combined unit is allocated',()=>{
 const counts={};
 for(const style of ['sephardic','ashkenazic']){
  const tally=counts[style]={linked:0,combined:0,units:0,sourceForm:0};
  for(const group of data.groups){
   const study=lib.study(word(group.readerIds[0]),style),before=JSON.stringify(study);
   for(const [i,id] of group.readerIds.entries()){
    const w={id,sourceHebrew:group.readerHebrew[i]},r=readerPronunciationWord(w,study,style),owned=study.rows.flatMap(row=>row.styles[style].flatMap(c=>c.units.filter(u=>u.readerWordId===id).map(u=>u.id)));
    assert.equal(r.hebrew,w.sourceHebrew);assert.deepEqual(r.entries.flatMap(e=>e.parts.map(p=>p.sourceUnitId)),owned);assert.equal(new Set(owned).size,owned.length);tally.units+=owned.length;
    if(r.status==='word-linked'){tally.linked++;tally.sourceForm+=r.entries.some(e=>e.sourceForm);}else{assert.equal(r.status,'combined-source-form');tally.combined++;}
    for(const entry of r.entries)assert.equal(entry.parts.map(p=>p.join+p.text).join(''),entry.text);
   }
   assert.equal(JSON.stringify(study),before);
  }
  assert.equal(tally.linked,79982);assert.equal(tally.combined,2);assert.equal(tally.sourceForm,2180);
 }
 // The sources have different syllable counts. Conserve each style instead of
 // forcing their units onto one common segmentation. Four combined units/style
 // remain unallocated, matching the existing independent source audit.
 const audit=JSON.parse(readFileSync(new URL('../docs/PRONUNCIATION-UNDERLAY-ALIGNMENT.json',import.meta.url)));
 for(const style of ['sephardic','ashkenazic'])assert.equal(counts[style].units,audit.counts[style].units-4);
 assert.equal(counts.sephardic.units,193928);assert.equal(counts.ashkenazic.units,193952);
});
