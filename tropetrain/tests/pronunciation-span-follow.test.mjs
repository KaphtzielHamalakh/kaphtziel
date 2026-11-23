import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';import{createHash}from'node:crypto';
import{getCorpus}from'../library.js';import{createReadingModel}from'../music.js';import{PronunciationLibrary}from'../pronunciation.js';import{linkPronunciationToNotes}from'../pronunciation-note-links.js';import{compilePronunciationSpanFollow as compile,pronunciationSpanFollow as follow}from'../pronunciation-span-follow.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),data=p=>JSON.parse(gunzipSync(read(p))),corpus=await getCorpus(),lib=new PronunciationLibrary(data('data/pronunciation/torah-display.json.gz'),{underlay:data('data/pronunciation/torah-underlay.json.gz'),segments:data('data/pronunciation/torah-segments.json.gz')}),section={id:'span',bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:5}},make=sections=>createReadingModel(corpus.passage(sections??[section]),{melodyId:'baer-1894-gen1-1-5'}),m=make(),plan=m.buildPlan(0,51),report=compile(plan,m.words,lib,'sephardic'),profiles=['katz-1993-northeastern-formal','katz-1993-mideastern-formal'];
test('all six different Baer note divisions follow three complete spans while exact individual links stay139/145',()=>{
 assert.equal(report.paths.length,3);const ids=new Set(report.paths.flatMap(p=>p.eventIds));assert.equal(ids.size,6);
 const links=linkPronunciationToNotes(plan,m.words,lib,'sephardic');assert.deepEqual(links.counts,{notes:145,linkedNotes:139,unlinkedNotes:6});assert.deepEqual(new Set(links.links.filter(l=>l.status==='unlinked').map(l=>l.eventId)),ids);
 for(const p of report.paths){assert.deepEqual(p.scoreSyllables.map(s=>s.hebrew),['וַֽ','יְ']);assert.deepEqual(p.sourceUnits.map(u=>u.text),['vay']);assert.equal(p.individualNoteAllocation,null);const results=p.eventIds.map(id=>{const e=plan.find(e=>e.id===id);return follow(e,m.words[e.wordIndex],report);});assert.deepEqual(results[0].paths,results[1].paths);assert.equal(results[0].units.length,1);}
});
test('common-span following never rewrites Hebrew, syllables, score labels, pitches, durations or source units',()=>{
 const before=JSON.stringify([m,plan]);for(const s of ['sephardic','ashkenazic'])for(const profileId of [null,...profiles]){const r=compile(plan,m.words,lib,s,{profileId});for(const p of r.paths){assert.equal(p.hebrew,m.words.find(w=>w.id===p.wordId).sourceHebrew.slice(p.hebrewRange.start,p.hebrewRange.end));assert.equal(p.scoreSyllables.map(s=>s.hebrew).join(''),p.hebrew);assert.ok(p.sourceUnits.every(u=>u.phonemes===null&&u.noteIds===null&&u.audioTimes===null));}}
 assert.equal(JSON.stringify([m,plan]),before);
});
test('both source text styles and two independent phonemic profiles retain complete original reference paths',()=>{
 for(const style of ['sephardic','ashkenazic'])for(const profileId of profiles){const r=compile(plan,m.words,lib,style,{profileId});assert.equal(r.paths.length,3);assert.equal(r.profile.id,profileId);assert.equal(r.profile.playable,false);assert.equal(r.profile.kinnorAccentId,null);assert.equal(r.phonologySource.id,'katz-1993-phonology');for(const p of r.paths){assert.equal(p.sourceUnits[0].sourceText,'vay');assert.ok(p.sourceUnits[0].references.length>0);assert.ok(p.sourceUnits[0].references.every(ref=>ref.sourceSegmentId&&ref.eventId));assert.equal(p.phonemes,null);assert.equal(p.review,null);}}
 assert.throws(()=>compile(plan,m.words,lib,'sephardic',{profileId:'invented'}),/Unknown phonological/);
});
test('one score syllable against two pronunciation units follows both together without a note allocation',()=>{
 const s={...section,start:{chapter:22,verse:19},end:{chapter:22,verse:19}},n=createReadingModel(corpus.passage([s]),{melodyId:'baer-1894-gen22-19'}),p=n.buildPlan(0,13),r=compile(p,n.words,lib,'ashkenazic'),g=r.paths.find(g=>g.sourceWordId==='gen-22-19-6');assert.equal(g.scoreSyllables.length,1);assert.equal(g.sourceUnits.length,2);assert.equal(g.eventIds.length,2);
 for(const id of g.eventIds){const e=p.find(e=>e.id===id),f=follow(e,n.words[e.wordIndex],r);assert.equal(f.units.length,2);assert.equal(f.individualNoteAllocation,null);}
});
test('tempo, key and range remain independent of all span correspondences',()=>{
 const p=m.buildPlan(0,51,{tempo:160,transpose:-7});assert.deepEqual(compile(p,m.words,lib,'sephardic'),report);const event=p.find(e=>report.paths[0].eventIds.includes(e.id));assert.ok(follow(event,m.words[event.wordIndex],report));
});
test('repeated assignment occurrences retain distinct span and event identities with identical canonical text',()=>{
 const n=make([section,{...section,id:'again'}]),p=n.buildPlan(0,103),r=compile(p,n.words,lib,'sephardic');assert.equal(r.paths.length,6);assert.equal(new Set(r.paths.map(g=>g.id)).size,6);const a=r.paths[0],b=r.paths[3];assert.equal(a.sourceWordId,b.sourceWordId);assert.notEqual(a.wordId,b.wordId);assert.deepEqual(a.sourceUnits,b.sourceUnits);const e=p.find(e=>b.eventIds.includes(e.id));assert.throws(()=>follow(e,n.words.find(w=>w.id===a.wordId),r),/original Hebrew score occurrence/);
});
test('stale syllables, marks, event IDs and source ownership fail closed',()=>{
 const e=plan.find(e=>report.paths[0].eventIds.includes(e.id)),w=m.words[e.wordIndex];for(const x of [{...w,sourceHebrew:w.sourceHebrew+'֗'},{...w,syllables:w.syllables.map((s,i)=>i? s:{...s,sourceHebrew:'וָ'})}])assert.throws(()=>follow(e,x,report),/original Hebrew score occurrence/);
 for(const change of [{syllable:'וָ'},{id:'other'},{sourceWordId:'other'},{wordId:'other'},{syllableId:'other'}])assert.throws(()=>follow({...e,...change},w,report),/original Hebrew score occurrence/);
 assert.throws(()=>compile([e,e],m.words,lib,'sephardic'),/Duplicate/);
});
test('partial staff pages cannot silently acquire a complete span; exact notes need no fallback',()=>{
 const ids=report.paths[0].eventIds,e=plan.find(e=>e.id===ids[0]),r=compile([e],m.words,lib,'sephardic');assert.equal(r.paths.length,0);assert.equal(r.gaps[0].reason,'incomplete-score-span');assert.equal(follow(e,m.words[e.wordIndex],r),null);
 const exact=plan.find(e=>!report.paths.some(g=>g.eventIds.includes(e.id)));assert.equal(follow(exact,m.words[exact.wordIndex],report),null);
});
test('source-only forms and shared word forms never receive a guessed written common span',()=>{
 for(const [bookId,chapter,verse,index]of [['gen',8,20,7],['deu',32,6,0]]){const n=createReadingModel(corpus.passage([{...section,bookId,start:{chapter,verse},end:{chapter,verse}}])),p=n.buildPlan(index,index),r=compile(p,n.words,lib,'sephardic');assert.equal(r.paths.length,0);assert.equal(follow(p[0],n.words[index],r),null);}
});
test('all four printed studies retain evidence/nulls and the exact whole-span policy is embedded in portable',()=>{
 const bytes=read('docs/PRONUNCIATION-SPAN-FOLLOW.json'),r=JSON.parse(bytes);assert.deepEqual(Object.values(r.printed).map(s=>s.sephardic.followedEvents),[6,2,2,4]);assert.equal(r.individualNoteAllocation,null);assert.equal(r.phonemes,null);assert.equal(r.review,null);for(const input of r.inputs)assert.equal(createHash('sha256').update(read(input.path)).digest('hex'),input.sha256);assert.ok(read('TropeTrain.html').includes('data:application/json;base64,'+bytes.toString('base64')));
});
