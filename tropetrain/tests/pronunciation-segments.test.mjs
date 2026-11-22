import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {PronunciationLibrary} from '../pronunciation.js';import {getCorpus} from '../library.js';import {createReadingModel} from '../music.js';import {linkPronunciationToNotes} from '../pronunciation-note-links.js';
const bytes=f=>readFileSync(new URL('../'+f,import.meta.url)),unpack=f=>JSON.parse(gunzipSync(bytes(f))),hash=b=>createHash('sha256').update(b).digest('hex');
const data=unpack('data/pronunciation/torah-display.json.gz'),underlay=unpack('data/pronunciation/torah-underlay.json.gz'),segments=unpack('data/pronunciation/torah-segments.json.gz'),lib=new PronunciationLibrary(data,{underlay,segments}),baseline=new PronunciationLibrary(data,{underlay});
const word=id=>{const hit=lib.byWord.get(id);return {id,sourceHebrew:hit.group.readerHebrew[hit.index]};},study=(id,style='sephardic')=>lib.study(word(id),style),units=(id,style='sephardic',column=0)=>study(id,style).rows[0].styles[style][column].units;
const category=(u,name)=>u.sourceSegments.variants.flatMap(v=>v.segments).filter(s=>s.categoryId===name);
test('closed category data pins the unchanged source and differs in exactly the two documented transcription rules',()=>{
 assert.equal(segments.catalog.length,87);assert.equal(segments.inputSha256,hash(bytes('data/pronunciation/torah-display.json.gz')));assert.equal(segments.underlaySha256,hash(bytes('data/pronunciation/torah-underlay.json.gz')));assert.equal(segments.computationSourceSha256,hash(bytes('assets/pronunciation/phonetic-mam-computation-sources.zip')));
 assert.deepEqual(segments.catalog.filter(c=>c.ascii.sephardic!==c.ascii.ashkenazic).map(c=>c.id),['QAMATS_G','TAV_0DAG']);
 for(const c of segments.catalog)assert.deepEqual(Object.keys(c).sort(),['id','label','kind','hebrewLetters','geminate','ascii','display','half'].sort());
 const audit=JSON.parse(bytes('docs/PRONUNCIATION-SEGMENT-ALIGNMENT.json'));assert.equal(audit.segmentsSha256,hash(bytes('data/pronunciation/torah-segments.json.gz')));assert.equal(audit.groups,68503);assert.equal(audit.units,387888);assert.equal(audit.segmentReferences,1037430);assert.equal(audit.sharedHalves,72996);assert.equal(audit.sourceOnlyUnits,12502);assert.equal(audit.unownedUnits,8);assert.match(audit.existingFields,/Every prior study field/);
});
test('qamats and tav without dagesh project both existing styles while silent matres and vocal sheva remain explicit source categories',()=>{
 assert.deepEqual(units('gen-1-1-2').map(u=>u.text),['ba','ra']);assert.deepEqual(units('gen-1-1-2','ashkenazic').map(u=>u.text),['bo','ro']);
 for(const u of units('gen-1-1-2')){const q=category(u,'QAMATS_G');assert.equal(q.length,1);assert.deepEqual(q[0].realizations,{sephardic:{ascii:'a',text:'a'},ashkenazic:{ascii:'o',text:'o'}});assert.equal(q[0].readerWordId,'gen-1-1-2');assert.equal(q[0].sourceUnitId,u.id);assert.equal(q[0].individualHebrewRange,null);}
 const opening=units('gen-1-1-1');assert.equal(category(opening[0],'SHEVA_NA')[0].realizations.sephardic.text,'ᵉ');assert.equal(category(opening[1],'ALEF_0MAPIQ_ML')[0].realizations.sephardic.text,'');assert.equal(category(opening[2],'TAV_0DAG')[0].realizations.ashkenazic.text,'s');assert.equal(opening[2].text,'shít');assert.equal(units('gen-1-1-1','ashkenazic')[2].text,'shís');
});
test('shared consonant halves link adjacent source syllables and never become duplicate written letters or inferred audio events',()=>{
 const u=units('gen-8-20-7'),first=category(u[0],'BET_1DAG_XAZAQ')[0],second=category(u[1],'BET_1DAG_XAZAQ')[0];assert.equal(first.part,'first-half-shared');assert.equal(second.part,'second-half-shared');assert.equal(first.sharedWithUnitId,u[1].id);assert.equal(second.sharedWithUnitId,u[0].id);assert.equal(first.realizations.sephardic.text,'b');assert.equal(second.realizations.sephardic.text,'b');
 assert.equal(u.flatMap(x=>x.hebrewClusterRanges.filter(r=>r.role==='written').map(r=>r.text)).join(''),word('gen-8-20-7').sourceHebrew);
 for(const x of u)for(const v of x.sourceSegments.variants)for(const s of v.segments){assert.equal(s.ipa,null);assert.equal(s.phonemes,null);assert.equal(s.noteIds,null);assert.equal(s.audioTimes,null);assert.equal(s.individualHebrewRange,null);assert.equal(s.hebrewScope,'parent-syllable-only');}
});
test('coincident Ashkenazic qamats readings keep distinct category plans, original labels and literal repeat evidence',()=>{
 const s=study('deu-1-27-2','ashkenazic'),[first,second]=s.rows[0].styles.ashkenazic;assert.equal(second.literalText,'—');assert.equal(second.sourceReference.column,1);assert.equal(first.text,second.text);assert.equal(category(first.units[1],'QAMATS_Q').length,1);assert.equal(category(second.units[1],'QAMATS_G').length,1);assert.equal(first.units[1].text,second.units[1].text);assert.notEqual(first.units[1].sourceSegments.variants[0].sourceHebrew.text,second.units[1].sourceSegments.variants[0].sourceHebrew.text);
 assert.deepEqual(s.sourceGroup,baseline.study(word('deu-1-27-2'),'ashkenazic').sourceGroup);
});
test('source-only, combined and missing word correspondences retain every previous refusal and original Hebrew range',()=>{
 const old=baseline.study(word('gen-13-3-13'),'sephardic'),now=study('gen-13-3-13');assert.equal(now.revision,5);for(const [i,u] of now.rows[0].styles.sephardic[0].units.entries()){assert.equal(u.hebrewClusterRanges,null);assert.deepEqual(u.hebrewUnderlay,old.rows[0].styles.sephardic[0].units[i].hebrewUnderlay);assert.ok(u.sourceSegments.variants.length);}
 assert.ok(units('deu-32-6-1').every(u=>u.readerWordId===null&&u.sourceSegments.variants.every(v=>v.segments.every(s=>s.readerWordId===null))));
 assert.equal(lib.study({id:'gen-4-18-9',sourceHebrew:'וּמְחִיּיָאֵ֗ל'},'sephardic'),null);assert.throws(()=>lib.study({...word('gen-1-1-1'),sourceHebrew:'בְּרֵאשִׁית'},'sephardic'),/Hebrew source changed/);assert.throws(()=>lib.study(word('gen-1-1-1'),'galician'),/Unsupported pronunciation/);
});
test('changed provenance, category mappings, references and shared-consonant boundaries fail closed',()=>{
 assert.throws(()=>new PronunciationLibrary(data,{segments}),/underlay is required/);assert.throws(()=>new PronunciationLibrary(data,{underlay,segments:{...segments,inputSha256:'bad'}}),/source rules need review/);
 for(const mutate of [s=>s.catalog.find(c=>c.id==='QAMATS_G').display.ashkenazic='z',s=>s.groups['pmam-gen-1-1-2'][0][1][0][3][0][0][0]=999,s=>s.groups['pmam-gen-1-1-2'][0][1][0][3][0][0][1]=1,s=>s.groups['pmam-gen-8-20-7'][0][1][0][3][1][0][1]=0,s=>s.groups['pmam-gen-1-1-1']=[]]){const copy=structuredClone(segments);mutate(copy);const bad=new PronunciationLibrary(data,{underlay,segments:copy});assert.throws(()=>{bad.study(word('gen-1-1-2'),'sephardic');bad.study(word('gen-8-20-7'),'sephardic');bad.study(word('gen-1-1-1'),'sephardic');},/source|Source|shared|boundaries|rules/);}
});
test('source rules leave musical plans, exact note links, all marked text and repeated occurrence evidence independent',async()=>{
 const corpus=await getCorpus(),range={bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:5}},model=createReadingModel(corpus.passage([{...range,id:'first'},{...range,id:'repeat'}]),{melodyId:'baer-1894-gen1-1-5'}),plan=model.buildPlan(0,103,{tempo:60}),before=JSON.stringify({model,plan});
 for(const style of ['sephardic','ashkenazic'])assert.deepEqual(linkPronunciationToNotes(plan,model.words,lib,style),linkPronunciationToNotes(plan,model.words,baseline,style));
 const a=lib.study(model.words[1],'sephardic'),b=lib.study(model.words[53],'sephardic');assert.notEqual(a.selection.occurrenceId,b.selection.occurrenceId);assert.equal(a.selection.sourceWordId,b.selection.sourceWordId);assert.deepEqual(a.rows,b.rows);
 model.buildPlan(0,103,{tempo:120,transpose:5});assert.equal(JSON.stringify({model,plan}),before);
});
test('normal and standalone bundles retain exact source rule data and evidence without extra playable styles',()=>{
 const bundle=bytes('app.bundle.js').toString(),html=bytes('TropeTrain.html').toString();assert.ok(bundle.includes(bytes('data/pronunciation/torah-segments.json.gz').toString('base64')));assert.ok(html.includes(bytes('data/pronunciation/torah-segments.json.gz').toString('base64')));
 for(const name of ['PRONUNCIATION-SEGMENTS','PRONUNCIATION-SEGMENT-ALIGNMENT']){assert.ok(html.includes(bytes('docs/'+name+'.json').toString('base64')));assert.ok(bytes('sw.js').toString().includes('./docs/'+name+'.json'));}
 assert.match(bytes('index.html').toString(),/Why the pronunciation text changes/);assert.match(html,/No IPA, new singing voice or equivalence to Kinnor/);
});
