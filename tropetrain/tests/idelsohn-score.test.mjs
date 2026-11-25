import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import engine from 'web-audio-engine';
import {getCorpus} from '../library.js';
import {createReadingModel} from '../music.js';
import {IDELSOHN_SCORE} from '../idelsohn-score.js';
import {IDELSOHN_SCORE_RECORD as record,IDELSOHN_SCORE_IMAGE,IDELSOHN_SCORE_EVIDENCE} from '../idelsohn-score-data.js';
import {SMALL_EIGHTH_STUDY} from '../source-small-eighth.js';
import {scoreData} from '../score-data.js';
import {staffMarkup,staffNotes} from '../staff.js';
import {musicXml,midiFile} from '../music-exports.js';
import {validatePlan,soundingNotes} from '../synthesis.js';
import {renderWav} from '../wav.js';
import {restoredPortableHtml} from './portable-artifact.mjs';
const corpus=await getCorpus(),range={id:'no268',bookId:'exo',start:{chapter:12,verse:21},end:{chapter:12,verse:22}};
const make=(ranges=[range])=>createReadingModel(corpus.passage(ranges),{melodyId:IDELSOHN_SCORE.id});
const options={tempo:84,transpose:0,smallEighthDemo:true},sha=b=>createHash('sha256').update(b).digest('hex');
test('No268 retains all39 exact canonical words,134 printed components and every unknown',()=>{
 const m=make(),demo=createReadingModel(corpus.passage([range]));assert.equal(m.words.length,39);assert.equal(m.events.length,125);
 assert.deepEqual(m.words.map(w=>[w.id,w.sourceHebrew,w.syllables]),demo.words.map(w=>[w.id,w.sourceHebrew,w.syllables]));
 assert.deepEqual(m.events.map(e=>e.midi),record.components.filter(c=>c.kind==='note').map(c=>c.midi));
 assert.equal(record.components.filter(c=>c.kind==='rest').length,9);assert.equal(record.components.length,134);
 assert.equal(new Set(m.events.filter(e=>e.sourceTupletId).map(e=>e.sourceTupletId)).size,9);assert.equal(new Set(m.events.filter(e=>e.sourceSlurId).map(e=>e.sourceSlurId)).size,11);
 for(const e of m.events){assert.equal(e.syllableId,null);assert.equal(e.syllable,null);assert.equal(e.phonemes,null);assert.equal(e.sourceWordCorrespondence.acceptedSyllableMapping,null);assert.equal(e.sourceWordCorrespondence.acceptedPhonemes,null);assert.equal(e.sourceWordCorrespondence.independentReview,null);assert.equal(e.sourceWordCorrespondence.sourceHebrew,m.words[e.wordIndex].sourceHebrew);}
 for(const key of ['independentReview','acceptedMamSyllableMapping','acceptedPhonemes','actualTuning','sourceRecording','sourceTempo','kinnorEquivalent','contextualGrammar'])assert.equal(record[key],null);
 assert.match(IDELSOHN_SCORE.status,/unreviewed/);assert.equal(record.source.printedPage,102);assert.equal(record.source.pdfPage,105);assert.equal(record.source.pdfSha256,'0ab0c051dc4d5c6f2e61a20edf254c492fb2abd0045c6fcb8edd727e107789df');
});
test('written timing starts with20notes/2rests/15quarterbeats; full score requires its own explicit policy',()=>{
 const m=make(),p=m.buildPlan(0,5,{tempo:60});assert.equal(p.length,20);assert.equal(validatePlan(p),15);assert.equal(p.flatMap(e=>[...e.sourceRestsBefore??[],...e.sourceRestsAfter??[]]).length,2);
 assert.deepEqual(p.slice(0,4).map(e=>[e.midi,e.beats]),[[65,.5],[69,.5],[67,1.5],[65,.5]]);
 assert.throws(()=>m.buildPlan(0,38),/unmeasured small eighth/);assert.throws(()=>m.buildPlan(0,38,{smallNoteDemo:true}),/unmeasured small eighth/);
 const all=m.buildPlan(0,38,options),rests=all.flatMap(e=>[...e.sourceRestsBefore??[],...e.sourceRestsAfter??[]]);assert.equal(all.length,125);assert.equal(rests.length,9);assert.equal(soundingNotes(all).length,125);assert.ok(Math.abs(validatePlan(all)-(80.75*60/84+.16))<1e-9);
 const small=all.filter(e=>e.sourceSmallEighth);assert.equal(small.length,2);assert.deepEqual(small.map(e=>e.sourceWordId),['exo-12-21-7','exo-12-22-17']);for(const e of small){assert.equal(e.midi,60);assert.equal(e.sourceQuarterBeats,null);assert.equal(e.sourcePrintedSyllableIndex,null);assert.equal(e.durationSeconds,.08);assert.deepEqual(e.performanceTiming,SMALL_EIGHTH_STUDY);for(const k of ['slash','role','sourceDuration','stealingRatio'])assert.equal(e.sourceSmallEighth[k],null);}
 assert.deepEqual(all.filter(e=>e.sourceTupletId?.endsWith('system2-triplet4')).map(e=>[e.sourceWordId,e.beats]),[['exo-12-21-13',2/3],['exo-12-21-14',1/3]]);
});
test('No268 tempo and transposition remain independent of small-note seconds and repeated occurrence identities',()=>{
 const m=make(),a=m.buildPlan(0,38,options),b=m.buildPlan(0,38,{...options,tempo:60,transpose:3});
 for(const [i,e] of a.entries()){assert.equal(b[i].midi,e.midi+3);assert.deepEqual(b[i].sourcePitch,e.sourcePitch);assert.equal(b[i].sourceTranspose,3);if(e.sourceSmallEighth)assert.equal(b[i].durationSeconds,e.durationSeconds);else assert.equal(b[i].beats,e.beats);}
 const twice=make([{...range,id:'one'},{...range,id:'two'}]),p=twice.buildPlan(0,77,options);assert.equal(p.length,250);assert.equal(new Set(p.map(e=>e.id)).size,250);assert.equal(new Set(p.filter(e=>e.sourceTupletId).map(e=>e.sourceTupletId)).size,18);assert.equal(new Set(p.filter(e=>e.sourceSlurId).map(e=>e.sourceSlurId)).size,22);assert.deepEqual(p.slice(0,125).map(e=>e.sourceNoteId),p.slice(125).map(e=>e.sourceNoteId));
 assert.throws(()=>make([{...range,end:{chapter:12,verse:23}}]).buildPlan(0,55,options),/covers only/);
 const changed=corpus.passage([range]);changed.verses[0].words[0].sourceHebrew='וַיִּקְרָא';assert.throws(()=>createReadingModel(changed,{melodyId:IDELSOHN_SCORE.id}).buildPlan(0,5),/covers only/);
});
test('word-only staff and exports retain null syllables, exact Hebrew and both small glyphs without inventing grace roles',()=>{
 const m=make(),p=m.buildPlan(0,38,options),data=scoreData(p,m.words),svg=staffMarkup(p,m.words,0,125),context={title:'No268 instrumental word study',melody:m.profile,tempo:84};
 assert.equal((svg.match(/class="staff-lyric"/g)||[]).length,39);assert.equal((svg.match(/unmeasured-small-eighth/g)||[]).length,2);assert.equal((svg.match(/class="staff-rest"/g)||[]).length,9);assert.equal((svg.match(/class="tuplet-bracket"/g)||[]).length,9);assert.equal((svg.match(/class="tie-arc source-slur"/g)||[]).length,11);assert.match(svg,/syllable and phoneme fitting remain unassigned/);assert.ok(data.every(e=>e.syllable===null&&e.syllableId===null&&e.lyricText===e.word.sourceHebrew));
 assert.equal(staffNotes(p,m.words,12,12)[0].continuedFromPrevious,p[11].wordId===p[12].wordId);
 const xml=musicXml(p,m.words,context);assert.equal((xml.match(/<pitch>/g)||[]).length,125);assert.equal((xml.match(/<rest\/>/g)||[]).length,9);assert.ok(!xml.includes('<grace'));assert.ok(xml.includes('lexical-source-word-candidate'));assert.ok(xml.includes('&quot;acceptedSyllableMapping&quot;:null'));assert.equal((xml.match(/<text xml:lang="he"/g)||[]).length,39);
 const midi=midiFile(p,m.words,context);assert.equal(Buffer.from(midi.subarray(0,4)).toString(),'MThd');assert.ok(Buffer.from(midi).includes(Buffer.from(m.words[0].sourceHebrew)));
 const broken=structuredClone(p);broken[0].syllable=broken[0].sourceWordCorrespondence.sourceHebrew;assert.throws(()=>scoreData(broken,m.words),/null syllable/);const badSmall=structuredClone(p);badSmall.find(e=>e.sourceSmallEighth).sourceSmallEighth.role='grace';assert.throws(()=>scoreData(badSmall,m.words),/null role/);
});
test('instrumental PCM renders its written pitches with zero-valued samples during both printed opening rests',async()=>{
 const m=make(),p=m.buildPlan(0,5,{tempo:60}),result=await renderWav(p,{volume:.7,createContext:(n,r)=>new engine.OfflineAudioContext(1,n,r)});assert.equal(result.duration,15);assert.ok(result.peak>0);
 const bytes=await result.blob.arrayBuffer(),view=new DataView(bytes);for(const rest of p.flatMap(e=>[...e.sourceRestsBefore??[],...e.sourceRestsAfter??[]]))for(let i=Math.ceil(rest.startSeconds*22050);i<Math.floor((rest.startSeconds+rest.durationSeconds)*22050);i++)assert.equal(view.getInt16(44+2*i,true),0);
});
test('both distributions preserve the exact source image, record and required recovery controls',()=>{
 const raw=readFileSync(new URL('../docs/IDELSOHN-NO268-SCORE.json',import.meta.url)),image=readFileSync(new URL('../'+record.source.image,import.meta.url));assert.equal(image.length,522167);assert.equal(sha(image),'3238419f17b2add9caea810c7ed87e3ea236952d77f36b97df2d0b4c0434963b');assert.deepEqual(Buffer.from(IDELSOHN_SCORE_IMAGE.split(',')[1],'base64'),image);assert.deepEqual(Buffer.from(IDELSOHN_SCORE_EVIDENCE.split(',')[1],'base64'),raw);
 for(const file of ['app.bundle.js','TropeTrain.html']){const text=restoredPortableHtml(readFileSync(new URL('../'+file,import.meta.url),'utf8'));assert.ok(text.includes(image.toString('base64')));assert.ok(text.includes(raw.toString('base64')));assert.ok(text.includes(SMALL_EIGHTH_STUDY.id));}
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(html.includes('id="idelsohn-score-open"'));assert.ok(html.includes('id="printed-small-eighth-demo"'));assert.ok(html.includes('syllable and phoneme fitting remain unassigned'));
});
