import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PRINTED_PATTERNS,printedPatternPlan} from '../printed-patterns.js';
import {staffMarkup,staffNotes} from '../staff.js';
import {untextedScoreData} from '../score-data.js';
import {validatePlan,soundingNotes} from '../synthesis.js';

test('literal plain Munaḥ/Revia source components match the checked pitches and printed values',()=>{
  const plan=printedPatternPlan('pair',{tempo:60,transpose:0});
  assert.deepEqual(plan.map(e=>e.midi),[72,71,67,69,67,66,64,64]);
  assert.deepEqual(plan.map(e=>e.beats),[1,2,1,1.5,.25,.25,1,.5]);
  assert.deepEqual(plan.map(e=>e.startBeat),[0,1,3,4,5.5,5.75,6,7]);
  assert.equal(validatePlan(plan),7.5);assert.equal(soundingNotes(plan).length,8,'Slurs never merge attacks as ties.');
  assert.deepEqual(plan.map(e=>e.sourceRhythm.type),['quarter','half','quarter','quarter','16th','16th','quarter','eighth']);
  assert.equal(plan[3].sourceRhythm.dots,1);assert.equal(PRINTED_PATTERNS.source.page,540);
});
test('individual columns keep source component IDs and exclude the other printed column',()=>{
  const pair=printedPatternPlan(),munah=printedPatternPlan('munah'),revia=printedPatternPlan('revia');
  assert.equal(munah.length,3);assert.equal(revia.length,5);
  assert.deepEqual(munah.map(n=>n.id),pair.slice(0,3).map(n=>n.id));assert.deepEqual(revia.map(n=>n.id),pair.slice(3).map(n=>n.id));
  assert.equal(revia[0].startBeat,0);assert.equal(munah.reduce((n,e)=>n+e.beats,0),4);assert.equal(revia.reduce((n,e)=>n+e.beats,0),3.5);
  assert.throws(()=>printedPatternPlan('invented'),/Choose a printed pattern/);
});
test('pattern transposition and tempo leave source timing, IDs and absent alignment independent',()=>{
  const base=printedPatternPlan('pair',{tempo:60,transpose:0}),raised=printedPatternPlan('pair',{tempo:60,transpose:1}),slow=printedPatternPlan('pair',{tempo:40,transpose:0});
  for(let i=0;i<base.length;i++){
    assert.equal(raised[i].midi,base[i].midi+1);assert.equal(raised[i].beats,base[i].beats);assert.equal(raised[i].startSeconds,base[i].startSeconds);
    assert.equal(slow[i].midi,base[i].midi);assert.equal(slow[i].durationSeconds,base[i].durationSeconds*1.5);assert.equal(slow[i].id,base[i].id);
    for(const key of ['wordId','sourceWordId','syllableId','syllable','phonemes'])assert.equal(base[i][key],null);
  }
  assert.equal(PRINTED_PATTERNS.pronunciation,null);assert.equal(PRINTED_PATTERNS.syllableUnderlay,null);
  for(const options of [{tempo:0},{transpose:1.5},{transpose:40}])assert.throws(()=>printedPatternPlan('pair',options),/Invalid pattern/);
});
test('untexted engraving preserves exact note shapes and slurs without inventing Hebrew underlay or word navigation',()=>{
  const plan=printedPatternPlan(),notes=staffNotes(plan,[],0,12,{untexted:true}),svg=staffMarkup(plan,[],0,12,{untexted:true});
  assert.equal(notes.length,8);assert.equal((svg.match(/class="staff-note"/g)||[]).length,8);
  assert.equal((svg.match(/class="tie-arc source-slur"/g)||[]).length,2);
  assert.equal((svg.match(/open-notehead/g)||[]).length,1);assert.match(svg,/Printed pattern staff notes/);
  assert.doesNotMatch(svg,/class="staff-lyric"|class="melisma-line"|data-word-index|Go to .*word/);
  assert.ok(notes.every(n=>n.untexted&&n.syllable===''));
  assert.throws(()=>untextedScoreData([{...plan[0],wordId:'gen-1-1-1'}]),/must not claim/);
});
test('generated source record and rendered original crop retain exact pinned bytes and standalone provenance',()=>{
  const source=JSON.parse(readFileSync(new URL('../docs/PRINTED-PATTERNS.json',import.meta.url),'utf8'));
  assert.deepEqual(PRINTED_PATTERNS,source);assert.match(source.source.rights,/public domain/);assert.match(source.reviewStatus,/review pending/);
  const image=readFileSync(new URL('../'+source.source.image,import.meta.url));assert.equal(createHash('sha256').update(image).digest('hex'),source.source.imageSha256);
  const html=restoredPortableHtml(readFileSync(new URL('../TropeTrain.html',import.meta.url),'utf8'));
  assert.ok(html.includes(image.toString('base64')),'The standalone carries its printed pattern source.');
  const context=readFileSync(new URL('../'+source.source.contextImage.image,import.meta.url));
  assert.equal(createHash('sha256').update(context).digest('hex'),source.source.contextImage.sha256);
  assert.ok(html.includes(context.toString('base64')),'Full row attribution remains inspectable offline.');
  assert.ok(html.includes(Buffer.from(JSON.stringify(source,null,2)+'\n').toString('base64')),'Exact source record remains portable.');
});
