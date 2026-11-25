import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {getCorpus,createAssignment,parseAssignment} from '../library.js';import {createReadingModel} from '../music.js';import {BAER_SCORE,baerWord} from '../baer-score.js';import {PronunciationLibrary} from '../pronunciation.js';import {linkPronunciationToNotes,notePronunciationText} from '../pronunciation-note-links.js';import {eventPitchName} from '../score-data.js';import {staffMarkup} from '../staff.js';import {musicXml,midiFile} from '../music-exports.js';import {validatePlan,soundingNotes} from '../synthesis.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),record=JSON.parse(read('docs/BAER-GENESIS-SCORE.json')),c=await getCorpus(),range={id:'study',bookId:'gen',start:{chapter:1,verse:1},end:{chapter:1,verse:5}},make=(ranges=[range])=>createReadingModel(c.passage(ranges),{melodyId:BAER_SCORE.id}),m=make(),p=m.buildPlan(0,51,{tempo:60}),at=id=>p.filter(e=>e.sourceWordId===id),names=id=>at(id).map(eventPitchName);
const lib=new PronunciationLibrary(JSON.parse(gunzipSync(read('data/pronunciation/torah-display.json.gz'))),{underlay:JSON.parse(gunzipSync(read('data/pronunciation/torah-underlay.json.gz')))});
test('Baer No939 preserves52 original marked words and145 distinct source notes without a full Torah preset',()=>{
 assert.equal(m.words.length,52);assert.equal(p.length,145);assert.equal(soundingNotes(p).length,145);assert.ok(Math.abs(validatePlan(p)-147.25)<1e-8);assert.equal(BAER_SCORE.coverage.length,52);
 assert.deepEqual(m.words.map(w=>w.sourceHebrew),c.passage([range]).verses.flatMap(v=>v.words.map(w=>w.sourceHebrew)));assert.deepEqual(p.map(e=>[e.midi,e.beats]),record.notes.map(n=>[n.midi,n.quarterBeats]));
 for(const w of m.words){assert.equal(w.syllables.map(s=>s.sourceHebrew).join(''),w.sourceHebrew);assert.equal(baerWord(w).id,w.sourceWordId);}
 assert.ok(p.every(e=>e.roman===null&&e.phonemes===null&&e.sourceProfile===BAER_SCORE.id));assert.match(BAER_SCORE.status,/review pending/);assert.match(BAER_SCORE.description,/not a complete Torah grammar/);
});
test('literal Baer pitches retain natural resets,F-sharp,C-sharp and the final triplet cadence',()=>{
 assert.deepEqual(names('gen-1-1-1'),['A4','A4','G♯4']);assert.deepEqual(at('gen-1-1-3').map(e=>e.beats),[.75,.25,2]);
 assert.deepEqual(names('gen-1-1-7'),['G4','G♯4','A4']);assert.deepEqual(names('gen-1-2-1'),['A4','A4','G4','C5','A4']);
 assert.deepEqual(names('gen-1-4-8'),['F♯4','G♯4','A4']);assert.deepEqual(names('gen-1-5-11'),['C♯5','C♯5']);
 assert.deepEqual(names('gen-1-5-13'),['A4','A4','G♯4','F♯4','G♯4','A4','G♯4']);assert.deepEqual(at('gen-1-5-13').map(e=>e.beats),[.5,.75,.25,1/3,1/3,1/3,2]);assert.equal(at('gen-1-2-9')[0].sourceRhythm.type,'16th');
});
test('six unspecified fermatas,two triplets,ten slurs and an eighth rest retain literal timing and distinct attacks',()=>{
 assert.equal(p.filter(e=>e.sourceFermata).length,6);assert.ok(p.filter(e=>e.sourceFermata).every(e=>e.sourceFermata.duration==='unspecified'));assert.ok(p.every(e=>!e.tieId));
 assert.equal(new Set(p.filter(e=>e.sourceTupletId).map(e=>e.sourceTupletId)).size,2);assert.equal(new Set(p.filter(e=>e.sourceSlurId).map(e=>e.sourceSlurId)).size,10);
 const rest=p.find(e=>e.sourceRestAfterBeats);assert.equal(rest.sourceWordId,'gen-1-2-14');assert.equal(rest.sourceRestAfterBeats,.5);assert.equal(rest.beats,.5);assert.equal(p[p.indexOf(rest)+1].startBeat-rest.startBeat-rest.beats,.5);
 const svg=staffMarkup(p,m.words,0,p.length);assert.equal((svg.match(/class="staff-fermata"/g)??[]).length,6);assert.equal((svg.match(/class="tuplet-bracket"/g)??[]).length,2);assert.match(svg,/Rest; 0.5 beats/);assert.match(svg,/F♯4/);assert.match(svg,/C♯5/);assert.doesNotMatch(svg,/Tie: hold/);
});
test('independent source text styles link139 exact spans and refuse the same six wa/j’ notes',()=>{
 const before=JSON.stringify(m),events=JSON.stringify(p),a=linkPronunciationToNotes(p,m.words,lib,'sephardic'),b=linkPronunciationToNotes(p,m.words,lib,'ashkenazic');
 for(const r of [a,b]){assert.deepEqual(r.counts,{notes:145,linkedNotes:139,unlinkedNotes:6});assert.deepEqual(r.links.filter(l=>l.status==='unlinked').map(l=>l.sourceWordId),['gen-1-3-5','gen-1-3-5','gen-1-5-8','gen-1-5-8','gen-1-5-10','gen-1-5-10']);assert.ok(r.links.filter(l=>l.status==='unlinked').every(l=>l.reason==='different-syllable-boundaries'&&l.units.length===0));}
 assert.notDeepEqual(a.links.map(notePronunciationText),b.links.map(notePronunciationText));assert.deepEqual(a.links.map(l=>l.eventId),b.links.map(l=>l.eventId));
 const raised=m.buildPlan(0,51,{tempo:120,transpose:3});assert.deepEqual(linkPronunciationToNotes(raised,m.words,lib,'sephardic'),a);
 for(let i=0;i<p.length;i++){assert.equal(raised[i].midi,p[i].midi+3);assert.equal(raised[i].durationSeconds,p[i].durationSeconds/2);assert.deepEqual(raised[i].sourcePitch,p[i].sourcePitch);assert.equal(raised[i].sourceTranspose,3);assert.equal(raised[i].syllable,p[i].syllable);}
 assert.equal(JSON.stringify(m),before);assert.equal(JSON.stringify(p),events);
});
test('changed marks and uncovered verses refuse playback; repeated assignments keep distinct occurrence IDs',()=>{
 const altered=structuredClone(c.passage([range]));altered.verses[0].words[0].sourceHebrew+='֖';const bad=createReadingModel(altered,{melodyId:BAER_SCORE.id});assert.equal(baerWord(bad.words[0]),null);assert.throws(()=>bad.buildPlan(0,51),/No notes are substituted/);
 const outside=make([{...range,end:{chapter:1,verse:6}}]);assert.throws(()=>outside.buildPlan(0,outside.words.length-1),/covers only.*Genesis 1:1–5/);assert.equal(outside.buildPlan(0,51).length,145);
 const repeated=make([range,{...range,id:'repeat'}]),plan=repeated.buildPlan(0,103);assert.equal(new Set(plan.map(e=>e.id)).size,290);assert.notEqual(plan[0].wordId,plan[145].wordId);assert.equal(plan[0].sourceNoteId,plan[145].sourceNoteId);assert.equal(new Set(plan.filter(e=>e.sourceSlurId).map(e=>e.sourceSlurId)).size,20);
 const assignment=parseAssignment(JSON.stringify(createAssignment('Baer study',[range],{melodyId:BAER_SCORE.id})),c);assert.equal(assignment.musicalPreferences.melodyId,BAER_SCORE.id);assert.equal(assignment.musicalPreferences.pronunciationId,null);assert.throws(()=>parseAssignment(JSON.stringify({...assignment,musicalPreferences:{melodyId:'baer-all-torah',pronunciationId:null}}),c),/not yet implemented/);
});
test('exports retain source identity,original spelling,unmeasured timing and unspecified fermatas',()=>{
 const context={title:'Baer source study',melody:BAER_SCORE,tempo:60,transpose:0,volume:0},xml=musicXml(p,m.words,context);assert.equal((xml.match(/<note id=/g)??[]).length,145);assert.equal((xml.match(/<fermata type=/g)??[]).length,6);assert.equal((xml.match(/<senza-misura\/>/g)??[]).length,1);assert.doesNotMatch(xml,/<beats>|<tie type=/);assert.match(xml,/Naumbourg/);assert.match(xml,/fermata hold lengths/);assert.ok(midiFile(p,m.words,context).length>1000);assert.ok(xml.includes('sourceNoteId'));assert.ok(xml.includes('sourcePitch'));assert.ok(xml.includes('sourceFermata'));
});
test('Baer source crop,exact-span audit and evidence remain verifiable and portable',()=>{
 const scan=read(record.scan.file);assert.equal(scan.length,record.scan.bytes);assert.equal(createHash('sha256').update(scan).digest('hex'),record.scan.sha256);assert.equal(record.source.pdfPage,255);assert.match(record.source.editionLimit,/not the1877edition/);assert.doesNotThrow(()=>execFileSync(process.execPath,['scripts/audit-baer-note-links.mjs','--check'],{cwd:new URL('../',import.meta.url)}));
 const html=restoredPortableHtml(read('TropeTrain.html')).toString(),image=html.match(/id="baer-score-scan" src="data:image\/png;base64,([A-Za-z0-9+/=]+)"/);assert.ok(image);assert.deepEqual(Buffer.from(image[1],'base64'),scan);assert.ok(html.includes('data:application/json;base64,'+Buffer.from(read('docs/BAER-GENESIS-SCORE.json')).toString('base64')));
});
