import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {words,events,bounds,buildPlan,consonantal,frequency} from '../music.js';

test('source text survives exact syllable concatenation; IDs are unique',()=>{
  assert.equal(words.length,27);assert.equal(new Set(words.map(w=>w.id)).size,27);
  const excerpt=readFileSync(new URL('../docs/genesis-1-1-3.xml',import.meta.url),'utf8');
  assert.deepEqual([...excerpt.matchAll(/<w>(.*?)<\/w>/gu)].map(m=>m[1]),words.map(w=>w.sourceHebrew));
  for(const w of words){
    assert.equal(w.syllables.map(s=>s.sourceHebrew).join(''),w.sourceHebrew);
    assert.ok(events.some(e=>e.wordId===w.id));
    for(const s of w.syllables)assert.ok(events.some(e=>e.syllableId===s.id));
  }
  assert.ok(words[9].sourceHebrew.includes('֙')); // duplicated pashta is retained
  assert.ok(words[12].sourceHebrew.endsWith('־'));
});
test('first word, internal group word and final verse word have exact boundaries',()=>{
  assert.deepEqual(bounds(0,0,'word'),[0,0]);
  assert.deepEqual(bounds(0,0,'group'),[0,2]);
  assert.deepEqual(bounds(1,1,'group'),[1,2]);
  assert.deepEqual(bounds(1,1,'verse'),[1,6]);
  for(const scope of ['word','group','verse'])assert.deepEqual(bounds(6,6,scope),[6,6]);
});
test('cross-group and reverse selections preserve inclusive endpoints',()=>{
  for(const [cursor,anchor] of [[3,1],[1,3]]){
    assert.deepEqual(bounds(cursor,anchor,'selection'),[1,3]);
    const p=buildPlan(...bounds(cursor,anchor,'selection'));
    assert.equal(p[0].wordId,'gen-1-1-2');assert.equal(p.at(-1).wordId,'gen-1-1-4');
    assert.deepEqual([...new Set(p.map(e=>e.wordIndex))],[1,2,3]);
  }
});
test('every event rises exactly one semitone with identical syllables and timing',()=>{
  const original=buildPlan(0,26), shifted=buildPlan(0,26,{transpose:1});
  assert.equal(original.length,shifted.length);
  original.forEach((e,i)=>{assert.equal(shifted[i].midi,e.midi+1);assert.deepEqual({...shifted[i],midi:e.midi},e);});
});
test('halving tempo doubles seconds while preserving pitch, beats and text',()=>{
  const normal=buildPlan(0,26,{tempo:84}), slow=buildPlan(0,26,{tempo:42});
  normal.forEach((e,i)=>{
    assert.equal(slow[i].midi,e.midi);assert.equal(slow[i].syllable,e.syllable);
    assert.equal(slow[i].startBeat,e.startBeat);assert.equal(slow[i].beats,e.beats);
    assert.equal(slow[i].durationSeconds,e.durationSeconds*2);assert.equal(slow[i].startSeconds,e.startSeconds*2);
  });
});
test('view transformations do not mutate source or plans; maqaf and sof pasuq remain',()=>{
  const snapshot=JSON.stringify(words), plan=buildPlan(1,3);
  words.forEach(w=>assert.doesNotMatch(consonantal(w.sourceHebrew),/[\u0591-\u05bd]/u));
  assert.equal(consonantal(words[6].sourceHebrew),'הארץ׃');
  assert.equal(consonantal(words[12].sourceHebrew),'על־');
  assert.equal(JSON.stringify(words),snapshot);assert.deepEqual(buildPlan(1,3),plan);
});
test('no event crosses the selected stopping point; sequence is contiguous',()=>{
  for(let start=0;start<27;start++)for(let end=start;end<27;end++){
    const p=buildPlan(start,end);assert.equal(p[0].startSeconds,0);
    p.forEach((e,i)=>{assert.ok(e.wordIndex>=start&&e.wordIndex<=end);if(i)assert.ok(Math.abs(p[i-1].startSeconds+p[i-1].durationSeconds-e.startSeconds)<1e-10);});
  }
  assert.equal(frequency(69),440);
});
