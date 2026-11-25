import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';
import{PronunciationLibrary,PRONUNCIATION_STYLES}from'../pronunciation.js';
import{HISTORICAL_ACCENT_PROFILES as profiles,historicalAccentProfile,historicalProfileSpecification as spec,historicalWordEvidence as evidence}from'../historical-pronunciation.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),json=p=>JSON.parse(gunzipSync(read('data/pronunciation/'+p+'.json.gz'))),segments=json('torah-segments');
const lib=new PronunciationLibrary(json('torah-display'),{underlay:json('torah-underlay'),segments});
const word=id=>{const hit=lib.byWord.get(id);return{id,sourceHebrew:hit.group.readerHebrew[hit.index]};};
test('six documentary profiles keep all87source-category rules unassigned and independent of the two MAMtext styles',()=>{
 assert.deepEqual(profiles.map(p=>p.label),['Ashkenazi Traditional','Ashkenazi Modern','Sephardi','Sephardi Traditional','U.S. Sephardi','Galician']);
 assert.deepEqual(PRONUNCIATION_STYLES.map(s=>s.id),['sephardic','ashkenazic']);
 for(const p of profiles){const s=spec(p.id);assert.equal(s.playable,false);assert.equal(s.singingVoice,null);assert.equal(s.categories.length,87);assert.deepEqual(s.categories.map(c=>c.categoryId),segments.catalog.map(c=>c.id));assert(s.categories.every(c=>c.phonologicalRule===null&&c.ipa===null&&c.phonemes===null&&c.review===null));assert.equal(s.counts.reviewedCategoryRules,0);}
 assert(Object.isFrozen(profiles[0].observations));assert.throws(()=>profiles[0].observations.push('invented'));assert.throws(()=>historicalAccentProfile('litvak'),/Unknown/);
});
test('every profile preserves exact opening Hebrew, accents, source syllables, stress, ranges and letter bindings in both independent text styles',()=>{
 const w=word('gen-1-1-1');assert.equal(w.sourceHebrew,'בְּרֵאשִׁ֖ית');
 for(const style of ['sephardic','ashkenazic']){const study=lib.study(w,style),before=JSON.stringify(study);for(const p of profiles){const r=evidence(study,w,style,p.id);assert.equal(r.hebrew,w.sourceHebrew);assert.equal(r.selectedTranscriptionStyle,style);assert.equal(r.historicalProfileId,p.id);assert.equal(r.phonemes,null);assert.equal(r.audioTimes,null);assert.equal(r.playable,false);
  for(const u of r.units){const original=study.rows.flatMap(row=>row.styles[style]).flatMap(c=>c.units).find(o=>o.id===u.sourceUnitId),v=original.sourceSegments.variants.find(v=>v.hebrewColumn===u.hebrewColumn);assert.equal(u.sourceText,original.text);assert.equal(u.sourceStress,original.sourceStress);assert.deepEqual(u.readerRanges,v.readerRanges);assert.deepEqual(u.letterClusterBindings,v.letterClusterBindings);assert.deepEqual(u.fragments.map(f=>f.sourceSegmentId),v.segments.map(s=>s.id));}
 }assert.equal(JSON.stringify(study),before);}
});
test('qamats and tav observations never become generic phonemes or rewrite the aligned MAMsource text',()=>{
 const w=word('gen-1-1-2');for(const style of ['sephardic','ashkenazic']){const s=lib.study(w,style),r=evidence(s,w,style,'galician');assert.equal(r.hebrew,'בָּרָ֣א');const q=r.units.flatMap(u=>u.fragments).filter(f=>f.categoryId==='QAMATS_G');assert.equal(q.length,2);assert(q.every(f=>f.observations.includes('qamats-examples')&&f.phonologicalRule===null&&f.ipa===null));assert.deepEqual(r.units.map(u=>u.sourceText),s.rows[0].styles[style][0].units.map(u=>u.text));}
});
test('shared consonant halves remain distinct references to the same original marked letter and unsplit source groups stay shared',()=>{
 const w=word('gen-8-20-7'),r=evidence(lib.study(w,'sephardic'),w,'sephardic','sephardi-traditional');const halves=r.units.flatMap(u=>u.fragments).filter(f=>f.categoryId==='BET_1DAG_XAZAQ');assert.deepEqual(halves.map(h=>h.part),['first-half-shared','second-half-shared']);assert.notEqual(halves[0].sourceSegmentId,halves[1].sourceSegmentId);assert.equal(halves[0].sharedWithUnitId,halves[1].sourceUnitId);
 for(const id of ['deu-32-6-1','deu-32-6-2']){const w=word(id),r=evidence(lib.study(w,'sephardic'),w,'sephardic','ashkenazi-modern');assert(r.units.length);assert(r.units.every(u=>u.ownerWordId===null&&u.occurrenceId===null&&u.ownership==='source-group-shared'));}
});
test('different source forms preserve null written ranges and repeated reading occurrences keep separate identities',()=>{
 for(const id of ['gen-4-18-9','gen-13-3-13']){const w=word(id),r=evidence(lib.study(w,'sephardic'),w,'sephardic','us-sephardi');assert(r.units.length);assert(r.units.every(u=>u.readerRanges===null));}
 const w=word('gen-1-1-2'),s=lib.study(w,'sephardic');for(const id of ['first','repeat']){const r=evidence(s,{...w,id,sourceWordId:w.id},'sephardic','ashkenazi-traditional');assert.equal(r.wordId,id);assert(r.units.every(u=>u.occurrenceId===id));}
});
test('unknown profiles/styles, altered accents and source categories refuse evidence; unavailable nonTorahcategories stay empty',()=>{
 const w=word('gen-1-1-1'),s=lib.study(w,'sephardic');assert.throws(()=>evidence(s,w,'sephardic','made-up'),/Unknown/);assert.throws(()=>evidence(s,w,'Galician','galician'),/Unknown source text/);assert.throws(()=>evidence(s,{...w,sourceHebrew:w.sourceHebrew.replace('֖','')},'sephardic','galician'),/marked Hebrew/);
 const bad=structuredClone(s);bad.rows[0].styles.sephardic[0].units[0].sourceSegments.variants[0].segments[0].categoryId='invented';assert.throws(()=>evidence(bad,w,'sephardic','galician'),/category/);
 const r=evidence(null,{id:'isa-42-5-1',sourceHebrew:'כֹּֽה־'},'ashkenazic','galician');assert.equal(r.sourceCategoryStatus,'source-categories-unavailable');assert.equal(r.hebrew,'כֹּֽה־');assert.deepEqual(r.units,[]);assert.equal(r.playable,false);
});
test('both builds include the six-profile evidence while the main pronunciation controls retain two text styles and no historical singing presets',()=>{
 const doc=read('docs/HISTORICAL-PRONUNCIATION-PROFILES.json'),normal=read('index.html').toString(),html=restoredPortableHtml(read('TropeTrain.html')).toString(),bundle=read('app.bundle.js').toString();assert.equal(JSON.parse(doc).profiles.length,6);assert(html.includes(doc.toString('base64')));assert(normal.includes('id="historical-accent-profile"'));assert(bundle.includes('tropetrain-historical-pronunciation-word-evidence-v1'));assert(html.includes('unassigned-pronunciation-rule'));assert(read('sw.js').toString().includes('./docs/HISTORICAL-PRONUNCIATION-PROFILES.json'));
});
