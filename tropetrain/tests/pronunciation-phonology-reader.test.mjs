import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';
import{PronunciationLibrary}from'../pronunciation.js';import{PHONOLOGY_PROFILES as profiles}from'../pronunciation-phonology.js';import{readerPhonologyWord as project}from'../pronunciation-phonology-reader.js';
import{READER_PRONUNCIATION_SOURCES as sources}from'../khan-pronunciation.js';import{getCorpus}from'../library.js';import{createReadingModel}from'../music.js';
const j=n=>JSON.parse(gunzipSync(readFileSync(new URL('../data/pronunciation/'+n+'.json.gz',import.meta.url)))),data=j('torah-display'),lib=new PronunciationLibrary(data,{underlay:j('torah-underlay'),segments:j('torah-segments')});
const word=id=>{const h=lib.byWord.get(id);return{id,sourceHebrew:h.group.readerHebrew[h.index]};},report=(id,p=0,style='sephardic')=>{const w=word(id);return project(w,lib.study(w,style),style,profiles[p].id);};

test('independent phonemic reader profiles preserve marked words, original source syllables and stress in both text styles',()=>{
 const options=sources.filter(s=>s.kind==='phonemic-research');assert.deepEqual(options.map(o=>o.profileId),['katz-1993-northeastern-formal','katz-1993-mideastern-formal','phonikud-modern-inventory']);assert.equal(profiles.length,2);assert.equal(sources.filter(s=>s.kind==='published-word').length,2);
 for(const style of['sephardic','ashkenazic']){const a=report('gen-1-1-2',0,style),b=report('gen-1-1-2',1,style);assert.equal(a.hebrew,'בָּרָ֣א');assert.equal(b.hebrew,a.hebrew);assert.equal(a.entries[0].text,'bɔ · rɔ∅');assert.equal(b.entries[0].text,'bu · ru∅');assert.deepEqual(a.entries[0].parts.map(p=>p.sourceStress),[false,true]);assert.deepEqual(a.entries[0].parts.map(p=>p.hebrewClusterRanges),b.entries[0].parts.map(p=>p.hebrewClusterRanges));assert.equal(a.evidence.selectedTranscriptionStyle,style);}
});
test('shared source halves reference one candidate event while unresolved, source-silent and proposed absence remain distinct',()=>{
 const r=report('gen-8-20-7'),refs=r.entries.flatMap(e=>e.parts.flatMap(p=>p.references)),halves=refs.filter(f=>f.part!=='whole');assert.equal(halves.length,2);assert.equal(halves[0].eventId,halves[1].eventId);assert.deepEqual(halves.map(f=>[f.text,f.sharedReference]),[['b',false],['↔',true]]);assert.equal(refs.filter(f=>f.soundStatus==='unresolved').length,1);assert(r.entries[0].text.includes('↔?'));assert(refs.some(f=>f.soundStatus==='source-silent'&&f.text==='∅'));
 const loss=report('gen-1-2-6').entries.flatMap(e=>e.parts.flatMap(p=>p.references)).find(f=>f.soundStatus==='proposed-absence');assert.equal(loss.text,'(∅)');assert.deepEqual(loss.candidatePhonemes,[]);
});
test('source-only forms, exact CGJ, qamats branches and unsplit combined groups remain separate',()=>{
 const r=report('gen-13-3-13',1);assert.equal(r.hebrew,'אֽ͏ָהֳלוֹ֙');assert.equal(r.entries.length,2);assert.deepEqual(r.entries.map(e=>e.hebrewColumn),[1,2]);assert(r.entries.every(e=>e.sourceForm&&e.parts.every(p=>p.hebrewClusterRanges===null)));assert.notEqual(r.entries[0].text,r.entries[1].text);
 for(const id of['deu-32-6-1','deu-32-6-2']){const r=report(id);assert.equal(r.status,'combined-source-form');assert.deepEqual(r.entries,[]);assert(r.evidence.routes.flatMap(r=>r.units).every(u=>u.ownerWordId===null));}
 const a=report('deu-1-27-2',1);assert.deepEqual(a.entries.map(e=>e.labels),[['קמץ-ד'],['קמץ-ס']]);assert.notEqual(a.entries[0].sourceCellId,a.entries[1].sourceCellId);
});
test('changed Hebrew, source ranges, profile or source correspondence refuse; missing categories never fall back',()=>{
 const w=word('gen-1-1-2'),s=lib.study(w,'sephardic');assert.throws(()=>project({...w,sourceHebrew:'בָּרָא'},s,'sephardic',profiles[0].id),/marked Hebrew/);assert.throws(()=>project(w,s,'sephardic','invented'),/Unknown/);
 const bad=structuredClone(s);bad.rows[0].styles.sephardic[0].units[0].sourceSegments.variants[0].readerRanges[0].text='changed';assert.throws(()=>project(w,bad,'sephardic',profiles[0].id),/original marked Hebrew ranges/);
 const absent=project({id:'isa-42-5-1',sourceHebrew:'כֹּֽה־'},null,'sephardic',profiles[1].id);assert.equal(absent.status,'no-source-correspondence');assert.equal(absent.hebrew,'כֹּֽה־');assert.deepEqual(absent.entries,[]);
});
test('repeated occurrences retain source identities without mutating Hebrew, melody, pitch, timing or acoustic nulls',async()=>{
 const corpus=await getCorpus(),section={bookId:'gen',start:{chapter:22,verse:1},end:{chapter:22,verse:1}},model=createReadingModel(corpus.passage([{id:'first',...section},{id:'repeat',...section}]),{melodyId:'cohen-1902-gen22-ending'}),before=JSON.stringify(model),plan=JSON.stringify(model.buildPlan(0,model.words.length-1,{tempo:60,transpose:0})),reports=[];
 for(const w of model.words)for(const p of profiles)for(const style of['sephardic','ashkenazic']){const s=lib.study(w,style),pin=JSON.stringify(s),r=project(w,s,style,p.id);assert.equal(JSON.stringify(s),pin);assert.equal(r.evidence.wordId,w.id);for(const key of['phonemes','noteIds','audioTimes','review','newSingingVoice'])assert.equal(r[key],null);assert.equal(r.profile.playable,false);if(w.sourceWordId==='gen-22-1-3'&&p===profiles[0]&&style==='sephardic')reports.push(r);}
 assert.equal(reports.length,2);assert.notEqual(reports[0].wordId,reports[1].wordId);assert.equal(reports[0].sourceWordId,reports[1].sourceWordId);assert.deepEqual(reports[0].entries,reports[1].entries);assert.equal(JSON.stringify(model),before);assert.equal(JSON.stringify(model.buildPlan(0,model.words.length-1,{tempo:60,transpose:0})),plan);
});
test('every Torah word conserves owned route units in both research profiles and both original source styles',()=>{
 for(const style of['sephardic','ashkenazic'])for(const profile of profiles){let linked=0,combined=0,parts=0,references=0;
  for(const group of data.groups){const s=lib.study(word(group.readerIds[0]),style);
   for(const [i,id]of group.readerIds.entries()){
    const w={id,sourceHebrew:group.readerHebrew[i]},r=project(w,s,style,profile.id);assert.equal(r.hebrew,w.sourceHebrew);assert.equal(r.sourceWordId,id);
    const owned=r.evidence.routes.flatMap(route=>route.units.filter(u=>u.ownerWordId===id).map(u=>u.sourceUnitId));assert.deepEqual(r.entries.flatMap(e=>e.parts.map(p=>p.sourceUnitId)),owned);parts+=owned.length;
    if(r.status==='word-linked')linked++;else{assert.equal(r.status,'combined-source-form');combined++;}
    for(const e of r.entries){assert.equal(e.text,e.parts.map(p=>p.join+p.text).join(''));for(const p of e.parts){references+=p.references.length;for(const ref of p.references){const event=r.evidence.routes.find(route=>route.id===e.sourceCellId).events.find(event=>event.id===ref.eventId);assert.deepEqual(ref.candidatePhonemes,event.candidatePhonemes);}}}
   }
  }
  assert.equal(linked,79983);assert.equal(combined,2);assert(parts>194000);assert(references>518000);console.log(JSON.stringify({sourceStyle:style,profileId:profile.id,linked,combined,routeUnits:parts,categoryReferences:references}));
 }
});
test('distributed reader clearly exposes research provenance and preserves the original published source streams',()=>{
 const normal=readFileSync(new URL('../index.html',import.meta.url),'utf8'),bundle=readFileSync(new URL('../app.bundle.js',import.meta.url),'utf8'),portable=readFileSync(new URL('../TropeTrain.html',import.meta.url),'utf8');assert(normal.includes('Inspect phonemic research evidence'));for(const text of[bundle,portable]){assert(text.includes('tropetrain-reader-phonology-proposal-v1'));assert(text.includes('proposed consonant loss'));assert(text.includes('phonemic-research-word'));assert(text.includes('tropetrain-published-pronunciation-word-v1'));}
});
