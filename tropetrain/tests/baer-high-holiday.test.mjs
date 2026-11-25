import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {getCorpus,createAssignment,parseAssignment} from '../library.js';import {createReadingModel} from '../music.js';
import {BAER_HIGH_HOLIDAY as profile,baerHighHolidayWord} from '../baer-high-holiday-score.js';
import {validatePlan,soundingNotes} from '../synthesis.js';import {Player} from '../audio.js';import {musicXml,midiFile,DIVISIONS} from '../music-exports.js';
import {eventPitchName} from '../score-data.js';import {staffMarkup} from '../staff.js';import {wavSummary,renderWav} from '../wav.js';
import {PronunciationLibrary} from '../pronunciation.js';import {linkPronunciationToNotes,notePronunciationText} from '../pronunciation-note-links.js';import {linkPronunciationScoreGroups} from '../pronunciation-score-groups.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),data=p=>JSON.parse(gunzipSync(read(p))),record=JSON.parse(read('docs/BAER-HIGH-HOLIDAY-SCORE.json'));
const corpus=await getCorpus(),section={id:'high-holiday',bookId:'gen',start:{chapter:22,verse:19},end:{chapter:22,verse:19}};
const make=(sections=[section])=>createReadingModel(corpus.passage(sections),{melodyId:profile.id}),model=make(),plan=model.buildPlan(0,13,{tempo:60}),at=id=>plan.filter(e=>e.sourceWordId===id);
const library=new PronunciationLibrary(data('data/pronunciation/torah-display.json.gz'),{underlay:data('data/pronunciation/torah-underlay.json.gz'),segments:data('data/pronunciation/torah-segments.json.gz')});
test('Baer No113 second setting preserves all14marked words and46source notes without a general melody or phoneme claim',()=>{
 assert.equal(model.words.length,14);assert.equal(plan.length,46);assert.equal(soundingNotes(plan).length,46);assert.equal(validatePlan(plan),32);
 assert.deepEqual(model.words.map(w=>[w.sourceWordId,w.sourceHebrew]),record.words.map(w=>[w.id,w.sourceHebrew]));
 assert.deepEqual(plan.map(e=>[e.sourceNoteId,e.midi,e.beats]),record.notes.map(n=>[n.id,n.midi,n.quarterBeats]));
 assert.ok(model.words.every(w=>w.syllables.map(s=>s.sourceHebrew).join('')===w.sourceHebrew));assert.ok(plan.every(e=>e.phonemes===null&&e.roman===null));
 assert.match(profile.description,/not a complete melody grammar or Kinnor preset/);assert.match(profile.status,/review pending/);
});
test('native printed B-natural, E-flat5, key-signature B-flat4 and the final F4 remain literal',()=>{
 assert.deepEqual(at('gen-22-19-1').map(eventPitchName),['G4','E4','G4']);assert.deepEqual(at('gen-22-19-3').map(eventPitchName),['B4']);
 assert.deepEqual(at('gen-22-19-11').map(eventPitchName),['G4','E♭5','D5']);assert.deepEqual(at('gen-22-19-12').map(eventPitchName),['C5','B♭4','A4','G4','F4']);
 assert.deepEqual(at('gen-22-19-14').map(eventPitchName),['C5','A4','G4','F4']);assert.equal(plan.at(-1).beats,3);assert.equal(plan.at(-1).endingRestSeconds,.5);
});
test('two tuplets and seven slurs retain their cross-word source groups and all five rests, including the final rest',()=>{
 const triplets=Map.groupBy(plan.filter(e=>e.sourceTupletId),e=>e.sourceTupletId),slurs=Map.groupBy(plan.filter(e=>e.sourceSlurId),e=>e.sourceSlurId);
 assert.equal(triplets.size,2);assert.equal(slurs.size,7);const cross=[...triplets.values()].find(g=>new Set(g.map(e=>e.wordId)).size===2);
 assert.deepEqual(cross.map(e=>e.sourceWordId),['gen-22-19-3','gen-22-19-4','gen-22-19-4']);assert.deepEqual(cross.map(e=>e.beats),[.5,1/6,1/3]);
 assert.equal(new Set(cross.map(e=>e.sourceSlurId)).size,1);assert.equal(cross[0].sourceTupletPhase,'start');assert.equal(cross.at(-1).sourceTupletPhase,'stop');
 const bars=Array(9).fill(0);for(const e of plan){bars[e.sourceBar]+=e.beats;bars[e.sourceRestAfterBar??e.sourceBar]+=e.sourceRestAfterBeats??0;}
 for(const [i,expected] of [.5,4,4,4,4,4,4,4,3.5].entries())assert.ok(Math.abs(bars[i]-expected)<1e-8);
 assert.equal(plan.filter(e=>e.sourceRestAfterBeats).length,5);const svg=staffMarkup(plan,model.words,0,plan.length);
 assert.equal((svg.match(/class="staff-rest"/g)??[]).length,5);assert.equal((svg.match(/class="tuplet-bracket"/g)??[]).length,2);assert.equal((svg.match(/class="tie-arc source-slur"/g)??[]).length,7);
});
test('the two pronunciation text styles preserve their original source units and refuse four individual note matches without changing music',()=>{
 const before=JSON.stringify([model.words,plan]),a=linkPronunciationToNotes(plan,model.words,library,'sephardic'),b=linkPronunciationToNotes(plan,model.words,library,'ashkenazic');
 assert.deepEqual(a.counts,{notes:46,linkedNotes:42,unlinkedNotes:4});assert.deepEqual(a.counts,b.counts);assert.notDeepEqual(a.links.map(notePronunciationText),b.links.map(notePronunciationText));
 for(const style of ['sephardic','ashkenazic']){const groups=linkPronunciationScoreGroups(plan,model.words,library,style);assert.equal(groups.counts.eventsInCommonSpans,46);assert.equal(groups.counts.eventsInDifferentDivisions,4);assert.equal(groups.counts.eventsWithoutCommonSpan,0);}
 assert.equal(JSON.stringify([model.words,plan]),before);
 const changed=model.buildPlan(0,13,{tempo:120,transpose:2});assert.equal(validatePlan(changed),16);assert.equal(changed.at(-1).endingRestSeconds,.25);
 for(let i=0;i<plan.length;i++){assert.equal(changed[i].midi,plan[i].midi+2);assert.equal(changed[i].durationSeconds,plan[i].durationSeconds/2);assert.deepEqual(changed[i].sourcePitch,plan[i].sourcePitch);assert.equal(changed[i].syllable,plan[i].syllable);}
 assert.deepEqual(linkPronunciationToNotes(changed,model.words,library,'ashkenazic'),b);
});
test('repeated assignments keep each verse’s cross-word group independent and other verses or changed marks refuse notes',()=>{
 const repeated=make([section,{...section,id:'again'}]),p=repeated.buildPlan(0,27,{tempo:60});assert.equal(p.length,92);assert.equal(new Set(p.map(e=>e.id)).size,92);
 assert.equal(new Set(p.filter(e=>e.sourceTupletId).map(e=>e.sourceTupletId)).size,4);assert.equal(new Set(p.filter(e=>e.sourceSlurId).map(e=>e.sourceSlurId)).size,14);
 assert.ok(Math.abs(validatePlan(p)-64)<1e-9);assert.notEqual(p[6].sourceTupletId,p[52].sourceTupletId);assert.equal(p[6].sourceNoteId,p[52].sourceNoteId);
 const changed=structuredClone(corpus.passage([section]));changed.verses[0].words[0].sourceHebrew+='֗';const bad=createReadingModel(changed,{melodyId:profile.id});assert.equal(baerHighHolidayWord(bad.words[0]),null);assert.throws(()=>bad.buildPlan(0,13),/No notes are substituted/);
 const outside=make([{...section,end:{chapter:22,verse:20}}]);assert.throws(()=>outside.buildPlan(0,outside.words.length-1),/covers only.*Genesis 22:19/);
 const saved=parseAssignment(JSON.stringify(createAssignment('High Holiday example',[section],{melodyId:profile.id,tempo:60,transpose:2})),corpus);assert.equal(saved.musicalPreferences.melodyId,profile.id);assert.equal(saved.musicalPreferences.pronunciationId,null);
});
test('MusicXML retains all source bar totals, five rests, cross-word notation and final-rest duration',()=>{
 const context={title:'Baer No113 second setting',melody:profile,tempo:60,transpose:0,volume:0},xml=musicXml(plan,model.words,context);
 const measures=[...xml.matchAll(/<measure\b[^>]*>([\s\S]*?)<\/measure>/g)].map(m=>[...m[1].matchAll(/<duration>(\d+)<\/duration>/g)].reduce((n,x)=>n+Number(x[1])/DIVISIONS,0));
 assert.equal(measures.length,9);for(const [i,expected] of [.5,4,4,4,4,4,4,4,3.5].entries())assert.ok(Math.abs(measures[i]-expected)<1e-8);
 assert.equal((xml.match(/<note id=/g)??[]).length,46);assert.equal((xml.match(/<rest\/>/g)??[]).length,5);assert.equal((xml.match(/<tuplet type="start"/g)??[]).length,2);assert.equal((xml.match(/<slur type="start"/g)??[]).length,7);assert.match(xml,/sourceRestAfterBar/);assert.match(xml,/endingRestSeconds/);assert.match(xml,/<step>E<\/step><alter>-1<\/alter><octave>5<\/octave>/);
 const midi=midiFile(plan,model.words,context);assert.ok(midi.length>1000);assert.equal(new TextDecoder().decode(midi.slice(0,4)),'MThd');
 // End-of-track delta carries the final eighth rest (2400 ticks at PPQ4800).
 assert.deepEqual(Array.from(midi.slice(-5)),[0x92,0x60,0xff,0x2f,0]);
});
test('muted playback enters the final rest and repeats or finishes only after the complete32beat source duration',async()=>{
 const originals={setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval,cancelAnimationFrame:globalThis.cancelAnimationFrame};let wall=0,pump;const frames=[],silences=[];let ends=0;
 globalThis.setInterval=fn=>(pump=fn,1);globalThis.clearInterval=()=>{};globalThis.cancelAnimationFrame=()=>{};
 const player=new Player((e,c)=>frames.push([e.sourceNoteId,c]),()=>ends++,(...a)=>silences.push(a),{wallClock:()=>wall});player.setVolume(0);
 try{await player.play(plan,true);wall=31.8;pump();assert.equal(silences.length,1);assert.equal(player.running,true);assert.equal(player.duration,32);wall=32.1;pump();assert.equal(frames.at(-1)[1],1);player.repeat=false;wall=32.2;pump();assert.equal(ends,1);assert.equal(player.running,false);
  for(const bad of [-1,NaN,Infinity])assert.throws(()=>validatePlan([{...plan[0],endingRestSeconds:bad}]),/final rest/);
 }finally{player.stop();Object.assign(globalThis,originals);}
});
test('offline WAV includes the final half second of digital silence and matches its header length',async()=>{
 const summary=wavSummary(plan,8000);assert.equal(summary.duration,32);assert.equal(summary.frames,256000);
 const engine=await import('web-audio-engine');const r=await renderWav(plan,{sampleRate:8000,createContext:(n,s)=>new engine.OfflineAudioContext(1,n,s)}),raw=await r.blob.arrayBuffer(),view=new DataView(raw);
 assert.equal(raw.byteLength,44+summary.frames*2);assert.equal(view.getUint32(40,true),summary.frames*2);assert.ok(r.peak>0);
 for(let i=252000;i<256000;i++)assert.equal(view.getInt16(44+i*2,true),0);
});
test('all three native-source crops and the exact note record remain portable with an explicitly bounded study button',()=>{
 const html=restoredPortableHtml(read('TropeTrain.html')).toString(),normal=read('index.html').toString();for(const scan of record.scans){const raw=read(scan.file);assert.equal(raw.length,scan.bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),scan.sha256);assert.ok(html.includes('data:image/png;base64,'+raw.toString('base64')));}
 assert.ok(html.includes('data:application/json;base64,'+read('docs/BAER-HIGH-HOLIDAY-SCORE.json').toString('base64')));assert.ok(normal.includes('id="baer-high-holiday-open"'));assert.match(record.source.scope,/bounded High Holiday/);assert.match(record.source.labelEvidence,/Preface pIX/);
 const audit=JSON.parse(read('docs/PRONUNCIATION-SCORE-GROUPS.json'));for(const style of ['sephardic','ashkenazic'])assert.equal(audit.boundedPrinted[profile.id][style].eventsInCommonSpans,46);
});
