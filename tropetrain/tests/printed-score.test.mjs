import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {getCorpus,createAssignment,parseAssignment} from '../library.js';
import {createReadingModel} from '../music.js';
import {PRINTED_SCORE} from '../printed-score.js';
import {musicXml,midiFile} from '../music-exports.js';
import {staffMarkup} from '../staff.js';

const corpus=await getCorpus(),range={id:'study',bookId:'gen',start:{chapter:22,verse:1},end:{chapter:22,verse:1}};
const make=(ranges=[range])=>createReadingModel(corpus.passage(ranges),{melodyId:PRINTED_SCORE.id});
const record=JSON.parse(readFileSync(new URL('../docs/PRINTED-SCORE.json',import.meta.url)));
test('bounded score agrees with the independent six-note source record and keeps exact underlay',()=>{
  const m=make(),plan=m.buildPlan(11,12,{tempo:60});
  assert.deepEqual(plan.map(e=>[e.midi,e.beats]),record.notes.map(n=>[n.midi,n.quarterBeats]));
  assert.deepEqual(plan.map(e=>e.startBeat),[0,.5,2.5,3.5,4.5,6.5]);
  assert.equal(plan.at(-1).startSeconds+plan.at(-1).durationSeconds,7.5);
  for(const w of m.words.slice(11))assert.equal(w.syllables.map(s=>s.sourceHebrew).join(''),w.sourceHebrew);
  assert.ok(plan.every(e=>e.phonemes===null&&e.roman===null));
  assert.equal(plan.map(e=>e.syllable).join(''),'וַיֹּ֥אמֶרהִנֵּֽנִי׃');
  assert.ok(m.profile.status.includes('review pending'));
});
test('uncovered or altered source words fail without invented demo notes or inferred coda',()=>{
  const m=make();assert.equal(m.events.length,6);
  for(const [a,b] of [[0,12],[10,12],[0,0]])assert.throws(()=>m.buildPlan(a,b),/covers only/);
  const p=corpus.passage([range]);p.verses[0].words[11].sourceHebrew='וַיֹּ֣אמֶר';
  assert.throws(()=>createReadingModel(p,{melodyId:PRINTED_SCORE.id}).buildPlan(11,12),/covers only/);
  assert.throws(()=>createReadingModel(p,{melodyId:'unsupported-tradition'}),/not implemented/);
});
test('source score pitch and tempo vary independently and repeated assignments retain occurrences',()=>{
  const m=make(),original=m.buildPlan(11,12,{tempo:60}),up=m.buildPlan(11,12,{tempo:60,transpose:1}),slow=m.buildPlan(11,12,{tempo:40});
  original.forEach((e,i)=>{
    assert.deepEqual({...up[i],midi:e.midi},e);
    assert.equal(slow[i].midi,e.midi);assert.equal(slow[i].syllableId,e.syllableId);assert.equal(slow[i].durationSeconds,e.durationSeconds*1.5);
  });
  const repeated=make([range,{...range,id:'again'}]);
  assert.equal(new Set(repeated.events.map(e=>e.id)).size,12);
  assert.deepEqual(repeated.buildPlan(24,25).map(e=>e.midi),original.map(e=>e.midi));
  const assignment=parseAssignment(JSON.stringify(createAssignment('Printed source',[range],{melodyId:PRINTED_SCORE.id,tempo:50,transpose:7})),corpus);
  assert.equal(assignment.musicalPreferences.melodyId,PRINTED_SCORE.id);assert.equal(assignment.musicalPreferences.pronunciationId,null);
  assert.equal('tempo' in assignment.displayPreferences,false);
});
test('score/export provenance, open half notes and standalone source scan survive distribution',()=>{
  const m=make(),plan=m.buildPlan(11,12,{tempo:60}),context={title:'Genesis 22:1 words 12–13',melody:m.profile,tempo:60,volume:0,transpose:0};
  const xml=musicXml(plan,m.words,context);
  assert.match(xml,/Francis L. Cohen/);assert.match(xml,/public domain/);assert.match(xml,/No added coda/);
  assert.doesNotMatch(xml,/TropeTrain original demonstration/);
  assert.equal((xml.match(/<note id=/g)||[]).length,6);
  assert.equal((staffMarkup(plan,m.words).match(/notehead open-notehead/g)||[]).length,2);
  assert.ok(midiFile(plan,m.words,context).length>100);
  const bytes=readFileSync(new URL('../assets/scores/cohen-1902-genesis22.png',import.meta.url));
  assert.equal(bytes.length,record.scan.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.scan.sha256);
  const standalone=readFileSync(new URL('../TropeTrain.html',import.meta.url),'utf8');
  const encoded=standalone.match(/id="printed-score-scan" src="data:image\/png;base64,([A-Za-z0-9+/=]+)"/);
  assert.ok(encoded);assert.ok(Buffer.from(encoded[1],'base64').equals(bytes));
});
