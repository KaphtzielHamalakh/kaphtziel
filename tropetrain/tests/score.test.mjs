import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildPlan,words,melody} from '../music.js';
import {pitchSpelling,rhythmSpelling,scoreData} from '../score-data.js';
import {staffNotes,staffMarkup} from '../staff.js';
import {musicXml,midiFile,MIDI_PPQ} from '../music-exports.js';
import {getCorpus} from '../library.js';
import {createReadingModel} from '../music.js';

const context={title:'Genesis 1:1–3',tempo:84,transpose:0,volume:70,melody,pronunciation:{id:null,status:'not implemented'}};
const decodeXml=s=>s.replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&amp;','&');
function readMidi(bytes){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),text=new TextDecoder();
  assert.equal(text.decode(bytes.slice(0,4)),'MThd');assert.equal(view.getUint32(4),6);assert.equal(view.getUint16(8),0);assert.equal(view.getUint16(10),1);
  assert.equal(text.decode(bytes.slice(14,18)),'MTrk');assert.equal(view.getUint32(18),bytes.length-22);
  let at=22,tick=0;const events=[];
  const variable=()=>{let value=0,b;do{b=bytes[at++];value=(value<<7)+(b&127);}while(b&128);return value;};
  while(at<bytes.length){
    tick+=variable();const status=bytes[at++];
    if(status===255){const type=bytes[at++],length=variable(),data=bytes.slice(at,at+length);at+=length;events.push({tick,status,type,data,text:text.decode(data)});}
    else{events.push({tick,status,a:bytes[at++],b:bytes[at++]});}
  }
  return {ppq:view.getUint16(12),events};
}

test('score spellings cover every semitone and preserve exact demonstration durations',()=>{
  const offsets={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  for(let midi=12;midi<=127;midi++){const p=pitchSpelling(midi);assert.equal((p.octave+1)*12+offsets[p.step]+p.alter,midi);}
  const values={whole:4,half:2,quarter:1,eighth:.5,'16th':.25,'32nd':.125};
  for(const beats of [.125,.25,.5,.6,.75,.9,1,1.5,2,3,4]){const r=rhythmSpelling(beats);assert.ok(Math.abs(values[r.type]*(r.dots?1.5:1)*r.normal/r.actual-beats)<1e-9);}
  assert.throws(()=>pitchSpelling(60.5),/integer MIDI/);
});
test('staff notes retain source syllables, MIDI values, duration and note navigation through transposition',()=>{
  const original=buildPlan(0,6),raised=buildPlan(0,6,{transpose:1}),a=staffNotes(original,words),b=staffNotes(raised,words);
  a.forEach((note,i)=>{assert.equal(note.id,b[i].id);assert.equal(note.syllable,b[i].syllable);assert.equal(note.beats,b[i].beats);assert.equal(note.midi+1,b[i].midi);assert.equal(note.word.id,original[i].wordId);});
  const low=staffNotes(buildPlan(0,0,{transpose:-12}),words);assert.ok(low.some(n=>n.ledgers.length));
  const markup=staffMarkup(original,words);assert.match(markup,/role="button" tabindex="0"/);assert.match(markup,/data-word-index="0"/);assert.match(markup,/בְּ/);
  assert.match(markup,/5:3/);assert.match(markup,/melisma-line/);
});
test('MusicXML preserves source text and IDs independently from notation and lyric extenders',()=>{
  const plan=buildPlan(0,26),xml=musicXml(plan,words,context);
  const metadata=JSON.parse(decodeXml(xml.match(/<miscellaneous-field name="tropetrain-metadata">([\s\S]*?)<\/miscellaneous-field>/)[1]));
  assert.deepEqual(metadata.events.map(e=>[e.eventId,e.syllableId,e.syllable,e.midi,e.startBeat,e.beats]),plan.map(e=>[e.id,e.syllableId,e.syllable,e.midi,e.startBeat,e.beats]));
  assert.deepEqual(metadata.words.map(w=>w.sourceHebrew),words.map(w=>w.sourceHebrew));
  assert.equal((xml.match(/<note id=/g)||[]).length,plan.length);assert.equal((xml.match(/<measure /g)||[]).length,3);
  assert.match(xml,/<text xml:lang="he" dir="rtl">/);assert.match(xml,/<extend type="start"/);assert.match(xml,/<extend type="continue"/);assert.match(xml,/<extend type="stop"/);
  const texts=[...xml.matchAll(/<text xml:lang="he" dir="rtl">([^<]*)<\/text>/g)].map(m=>decodeXml(m[1]));
  assert.equal(texts.join(''),words.map(w=>w.sourceHebrew).join(''));
  const bad=structuredClone(plan);bad[0].syllable='changed';assert.throws(()=>musicXml(bad,words,context),/syllables/);
});
test('decoded MIDI has every exact pitch, onset, note-off, UTF-8 syllable, source ID and tempo',()=>{
  const plan=buildPlan(0,26,{tempo:120,transpose:1}),c={...context,tempo:120,transpose:1,volume:0},m=readMidi(midiFile(plan,words,c));
  assert.equal(m.ppq,MIDI_PPQ);
  const on=m.events.filter(e=>e.status===0x90),off=m.events.filter(e=>e.status===0x80);
  assert.equal(on.length,plan.length);assert.equal(off.length,plan.length);
  plan.forEach((e,i)=>{assert.equal(on[i].a,e.midi);assert.equal(off[i].a,e.midi);assert.equal(on[i].tick,Math.round(e.startBeat*MIDI_PPQ));assert.equal(off[i].tick,Math.round((e.startBeat+e.beats)*MIDI_PPQ));});
  const tempo=m.events.find(e=>e.type===0x51).data;assert.equal((tempo[0]<<16)+(tempo[1]<<8)+tempo[2],500000);
  assert.equal(m.events.find(e=>e.status===0xb0&&e.a===7).b,0);
  const metadata=JSON.parse(m.events.find(e=>e.type===1).text);assert.deepEqual(metadata.events.map(e=>e.syllable),plan.map(e=>e.syllable));
  const lyricText=m.events.filter(e=>e.type===5).map(e=>e.text).join('');assert.equal(lyricText,words.map(w=>w.sourceHebrew).join(''));
});
test('musical exports reject mismatched beat/second timing rather than changing playback',()=>{
  const plan=buildPlan(0,0);assert.throws(()=>musicXml(plan,words,{...context,tempo:40}),/timing disagree/);
  assert.throws(()=>midiFile(plan,words,{...context,tempo:0}),/tempo/);
  const bad=structuredClone(plan);bad[0].wordId='wrong';assert.throws(()=>midiFile(bad,words,context),/source words/);
});
test('score exports retain ketiv/qere, enlarged letters and repeated passage occurrence IDs',async()=>{
  const corpus=await getCorpus(),ranges=[['gen',8,17],['deu',6,4],['gen',8,17]].map(([bookId,chapter,verse],i)=>({id:`test-${i}`,bookId,start:{chapter,verse},end:{chapter,verse}}));
  const model=createReadingModel(corpus.passage(ranges)),plan=model.buildPlan(0,model.words.length-1),xml=musicXml(plan,model.words,context);
  const metadata=JSON.parse(decodeXml(xml.match(/<miscellaneous-field name="tropetrain-metadata">([\s\S]*?)<\/miscellaneous-field>/)[1]));
  assert.ok(metadata.words.some(w=>w.kind==='q'&&w.writtenVariants.length));
  assert.ok(metadata.words.some(w=>w.editorialNotes?.some(n=>n.kind==='letterSize')));
  assert.ok(metadata.words.some(w=>w.id.includes('@')));
  assert.equal(new Set(metadata.events.map(e=>e.noteId)).size,plan.length);
  assert.deepEqual(metadata.words.map(w=>w.sourceHebrew),model.words.map(w=>w.sourceHebrew));
  const decoded=readMidi(midiFile(plan,model.words,context));assert.equal(decoded.events.filter(e=>e.status===0x90).length,plan.length);
});
