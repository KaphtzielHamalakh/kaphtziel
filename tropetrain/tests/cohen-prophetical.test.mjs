import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {getCorpus,createAssignment,parseAssignment} from '../library.js';import {createReadingModel} from '../music.js';import {COHEN_PROPHETICAL as profile,cohenPropheticalWord} from '../cohen-prophetical-score.js';import {PronunciationLibrary} from '../pronunciation.js';import {linkPronunciationToNotes,notePronunciationText} from '../pronunciation-note-links.js';import {linkPronunciationScoreGroups} from '../pronunciation-score-groups.js';import {validatePlan,soundingNotes} from '../synthesis.js';import {staffMarkup} from '../staff.js';import {eventPitchName} from '../score-data.js';import {musicXml,midiFile} from '../music-exports.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),data=p=>JSON.parse(gunzipSync(read(p))),record=JSON.parse(read('docs/COHEN-PROPHETICAL-SCORE.json')),corpus=await getCorpus(),section={id:'comparison',bookId:'gen',start:{chapter:22,verse:1},end:{chapter:22,verse:1}},make=(sections=[section])=>createReadingModel(corpus.passage(sections),{melodyId:profile.id}),m=make(),plan=m.buildPlan(0,12,{tempo:60}),lib=new PronunciationLibrary(data('data/pronunciation/torah-display.json.gz'),{underlay:data('data/pronunciation/torah-underlay.json.gz'),segments:data('data/pronunciation/torah-segments.json.gz')}),at=id=>plan.filter(e=>e.sourceWordId===id);
test('the hypothetical prophetical example preserves all13 Torah words and exact notes without claiming a complete system',()=>{
 assert.equal(m.words.length,13);assert.equal(plan.length,51);assert.equal(soundingNotes(plan).length,50);assert.ok(Math.abs(validatePlan(plan)-41)<1e-8);
 assert.deepEqual(m.words.map(w=>w.sourceHebrew),corpus.passage([section]).verses[0].words.map(w=>w.sourceHebrew));assert.deepEqual(plan.map(e=>[e.sourceNoteId,e.midi,e.beats]),record.notes.map(n=>[n.id,n.midi,n.quarterBeats]));
 assert.ok(m.words.every(w=>w.syllables.map(s=>s.sourceHebrew).join('')===w.sourceHebrew));assert.match(profile.description,/hypothetical/);assert.match(profile.description,/not an actual Haftarah/);assert.match(profile.status,/review pending/);assert.ok(plan.every(e=>e.roman===null&&e.phonemes===null));
});
test('literal pickup, opening melisma and Abraham cadence retain source pitches and dotted/triplet rhythms',()=>{
 assert.deepEqual(at('gen-22-1-1').map(eventPitchName),['E4','E4','A4','G4','F♯4','E4','E4']);assert.deepEqual(at('gen-22-1-2').map(eventPitchName),['A4','C5']);
 assert.deepEqual(at('gen-22-1-11').map(eventPitchName),['G4','E4','E4','C5','B4','A4','B4','A4','G4']);assert.deepEqual(at('gen-22-1-11').map(e=>e.beats),[.5,.5,.5,.75,.25,1/3,1/3,1/3,1]);
 assert.deepEqual(at('gen-22-1-13').map(eventPitchName),['D4','E4','E4']);assert.equal(at('gen-22-1-11')[3].sourceRhythm.dots,1);assert.ok(plan.every(e=>e.sourcePitch.step!=='F'||e.sourcePitch.alter===1));
});
test('five rests and one tied pair preserve clock gaps and50distinct attacks; all13bars balance',()=>{
 const expected=[1,4,4,3,3,3,3,3,3,3,4,4,3];assert.equal(plan.filter(e=>e.sourceRestAfterBeats).length,5);assert.equal(plan.filter(e=>e.tieId).length,2);
 for(let bar=0;bar<expected.length;bar++)assert.ok(Math.abs(plan.filter(e=>e.sourceBar===bar).reduce((s,e)=>s+e.beats+(e.sourceRestAfterBeats??0),0)-expected[bar])<1e-8);
 for(const e of plan.filter(e=>e.sourceRestAfterBeats)){const next=plan[plan.indexOf(e)+1];assert.ok(Math.abs(next.startBeat-e.startBeat-e.beats-.5)<1e-8);}
 const tie=plan.filter(e=>e.tieId);assert.equal(tie[0].midi,tie[1].midi);assert.equal(tie[0].syllableId,tie[1].syllableId);assert.equal(soundingNotes(plan).filter(e=>e.tieId).length,1);
});
test('seven source slurs retain separate attacks and three complete tuplets retain the mixed dotted pickup group',()=>{
 assert.equal(new Set(plan.filter(e=>e.sourceSlurId).map(e=>e.sourceSlurId)).size,7);assert.equal(new Set(plan.filter(e=>e.sourceTupletId).map(e=>e.sourceTupletId)).size,3);
 const triples=Map.groupBy(plan.filter(e=>e.sourceTupletId),e=>e.sourceTupletId);for(const notes of triples.values()){assert.equal(notes.length,3);assert.equal(notes[0].sourceTupletPhase,'start');assert.equal(notes[2].sourceTupletPhase,'stop');assert.ok(Math.abs(notes.reduce((s,e)=>s+e.beats,0)-1)<1e-8);}
 const svg=staffMarkup(plan,m.words,0,plan.length);assert.equal((svg.match(/class="tie-arc source-slur"/g)??[]).length,7);assert.equal((svg.match(/class="tuplet-bracket"/g)??[]).length,3);assert.equal((svg.match(/class="staff-rest"/g)??[]).length,5);assert.equal((svg.match(/Tie: hold the same pitch/g)??[]).length,1);
});
test('both existing source pronunciation styles remain independent of notes and keep the two opening divisions explicit',()=>{
 const before=JSON.stringify([m,plan]),a=linkPronunciationToNotes(plan,m.words,lib,'sephardic'),b=linkPronunciationToNotes(plan,m.words,lib,'ashkenazic');
 assert.deepEqual(a.counts,{notes:51,linkedNotes:49,unlinkedNotes:2});assert.deepEqual(a.counts,b.counts);assert.notDeepEqual(a.links.map(notePronunciationText),b.links.map(notePronunciationText));
 for(const style of ['sephardic','ashkenazic']){const r=linkPronunciationScoreGroups(plan,m.words,lib,style);assert.equal(r.counts.eventsInCommonSpans,51);assert.equal(r.counts.eventsInDifferentDivisions,2);const g=r.words[0].groups[0];assert.deepEqual(g.scoreSyllables.map(s=>s.hebrew),['וַ','יְ']);assert.equal(g.sourceUnits[0].text,'vay');assert.equal(g.individualNoteAllocation,null);assert.ok(g.sourceUnits[0].sourceSegments);}
 assert.equal(JSON.stringify([m,plan]),before);
});
test('transpose and tempo change independently while source pitch spelling, Hebrew, rhythms and source text links stay fixed',()=>{
 const p=m.buildPlan(0,12,{tempo:120,transpose:2});for(let i=0;i<plan.length;i++){assert.equal(p[i].midi,plan[i].midi+2);assert.equal(p[i].durationSeconds,plan[i].durationSeconds/2);assert.deepEqual(p[i].sourcePitch,plan[i].sourcePitch);assert.equal(p[i].sourceTranspose,2);assert.equal(p[i].syllable,plan[i].syllable);}
 assert.deepEqual(linkPronunciationToNotes(p,m.words,lib,'ashkenazic'),linkPronunciationToNotes(plan,m.words,lib,'ashkenazic'));assert.deepEqual(linkPronunciationScoreGroups(p,m.words,lib,'ashkenazic'),linkPronunciationScoreGroups(plan,m.words,lib,'ashkenazic'));
});
test('altered marks and other verses refuse substitution; saved/repeated assignments preserve distinct occurrence IDs',()=>{
 const bad=structuredClone(corpus.passage([section]));bad.verses[0].words[0].sourceHebrew+='֗';const altered=createReadingModel(bad,{melodyId:profile.id});assert.equal(cohenPropheticalWord(altered.words[0]),null);assert.throws(()=>altered.buildPlan(0,12),/No notes are substituted/);
 const outside=make([{...section,end:{chapter:22,verse:2}}]);assert.throws(()=>outside.buildPlan(0,outside.words.length-1),/covers only.*Genesis 22:1/);assert.equal(outside.buildPlan(0,12).length,51);
 const repeated=make([section,{...section,id:'again'}]),p=repeated.buildPlan(0,25);assert.equal(new Set(p.map(e=>e.id)).size,102);assert.equal(soundingNotes(p).length,100);assert.equal(p[0].sourceNoteId,p[51].sourceNoteId);assert.notEqual(p[0].wordId,p[51].wordId);assert.equal(new Set(p.filter(e=>e.sourceSlurId).map(e=>e.sourceSlurId)).size,14);
 const saved=parseAssignment(JSON.stringify(createAssignment('Cohen hypothetical',[section],{melodyId:profile.id,tempo:60,transpose:2})),corpus);assert.equal(saved.musicalPreferences.melodyId,profile.id);assert.equal(saved.musicalPreferences.pronunciationId,null);
});
test('source exports use the correct p547creator, changing meters and hypothetical scope, with original rest/tie/slur metadata',()=>{
 const context={title:'Hypothetical printed example',melody:profile,tempo:60,transpose:0,volume:0},xml=musicXml(plan,m.words,context);assert.match(xml,/p\.\s*547/);assert.match(xml,/hypothetical/);assert.doesNotMatch(xml,/p. 539, Genesis/);assert.equal((xml.match(/<note id=/g)??[]).length,51);assert.equal((xml.match(/<rest\/>/g)??[]).length,5);assert.equal((xml.match(/<tie type="start"/g)??[]).length,1);assert.equal((xml.match(/<slur type="start"/g)??[]).length,7);assert.equal((xml.match(/<tuplet type="start"/g)??[]).length,3);assert.equal((xml.match(/<beats>3<\/beats>/g)??[]).length,1);assert.equal((xml.match(/<beats>4<\/beats>/g)??[]).length,2);assert.ok(midiFile(plan,m.words,context).length>1000);assert.match(xml,/sourceNoteId/);assert.match(xml,/sourcePitch/);
});
test('both faithful scans and exact source record are immutable and embedded in standalone; common-span audit includes this example',()=>{
 for(const scan of [record.scan,record.secondScan]){const bytes=read(scan.file);assert.equal(bytes.length,scan.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),scan.sha256);}
 assert.equal(record.source.pdfPage,585);assert.equal(record.source.printedPage,547);assert.match(record.source.scope,/hypothetical/);assert.match(record.notation.coda,/excluded/);
 const html=read('TropeTrain.html').toString();assert.ok(html.includes('data:application/json;base64,'+read('docs/COHEN-PROPHETICAL-SCORE.json').toString('base64')));assert.ok(html.includes('data:image/png;base64,'+read(record.scan.file).toString('base64')));assert.ok(html.includes('data:image/jpeg;base64,'+read(record.secondScan.file).toString('base64')));
 const audit=JSON.parse(read('docs/PRONUNCIATION-SCORE-GROUPS.json'));for(const style of ['sephardic','ashkenazic'])assert.equal(audit.boundedPrinted[profile.id][style].eventsInCommonSpans,51);
});
