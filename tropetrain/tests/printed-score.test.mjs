import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import engine from 'web-audio-engine';
import {getCorpus,createAssignment,parseAssignment} from '../library.js';
import {createReadingModel} from '../music.js';
import {PRINTED_SCORE} from '../printed-score.js';
import {musicXml,midiFile,MIDI_PPQ} from '../music-exports.js';
import {staffMarkup} from '../staff.js';
import {soundingNotes} from '../synthesis.js';
import {renderWav} from '../wav.js';
import {scoreData} from '../score-data.js';

const corpus=await getCorpus(),range={id:'study',bookId:'gen',start:{chapter:22,verse:1},end:{chapter:22,verse:1}};
const make=(ranges=[range])=>createReadingModel(corpus.passage(ranges),{melodyId:PRINTED_SCORE.id});
const record=JSON.parse(readFileSync(new URL('../docs/PRINTED-SCORE.json',import.meta.url)));
const pitches=[67,67,69,67,66,64,64,67,71,62,62,62,71,67,67,69,71,67,67,67,74,69,69,71,67,67,67,64,64,64,64,67,62,67,71,67,67,69,71,67,67,67,67,71,64,64,64,71,69,64,67,67];
const createContext=(length,rate)=>new engine.OfflineAudioContext(1,length,rate);
function midiEvents(bytes){
 let at=22,tick=0;const out=[];
 const vlq=()=>{let v=0,b;do{b=bytes[at++];v=(v<<7)+(b&127);}while(b&128);return v;};
 while(at<bytes.length){tick+=vlq();const status=bytes[at++];if(status===255){const type=bytes[at++],length=vlq();at+=length;out.push({tick,status,type});}else out.push({tick,status,pitch:bytes[at++],value:bytes[at++]});}
 return out;
}
test('complete printed verse agrees with both source record and manually checked pitch sequence',()=>{
 const m=make(),plan=m.buildPlan(0,12,{tempo:60});
 assert.deepEqual(plan.map(e=>e.midi),pitches);assert.equal(plan.length,52);
 assert.deepEqual(plan.map(e=>[e.midi,e.beats]),record.notes.map(n=>[n.midi,n.quarterBeats]));
 assert.equal(plan.at(-1).startSeconds+plan.at(-1).durationSeconds,44);
 assert.equal(soundingNotes(plan).length,50);
 assert.equal(plan.filter(e=>e.sourceRestAfterBeats===.5).length,4);
 for(const w of m.words)assert.equal(w.syllables.map(s=>s.sourceHebrew).join(''),w.sourceHebrew);
 assert.ok(plan.every(e=>e.phonemes===null&&e.roman===null));
 assert.ok(m.profile.status.includes('review pending'));
 const ending=m.buildPlan(11,12,{tempo:60});
 assert.deepEqual(ending.map(e=>[e.midi,e.beats]),[[64,.5],[71,2],[69,1],[64,1],[67,2],[67,1]]);
 assert.equal(ending.at(-1).startSeconds+ending.at(-1).durationSeconds,7.5);
});
test('printed bars, exact tuplets, selected-word rests and source note components remain distinct',()=>{
 const m=make(),plan=m.buildPlan(0,12,{tempo:60}),bars=Array(14).fill(0);
 for(const e of plan)bars[e.sourceBar]+=e.beats+(e.sourceRestAfterBeats??0);
 assert.deepEqual(bars,[1,4,4,3,3,3,3,3,3,3,3,4,4,3]);
 const tuplets=scoreData(plan,m.words).filter(e=>e.rhythm.actual===3);
 assert.equal(tuplets.length,6);assert.equal(tuplets[3].rhythm.type,'eighth');assert.equal(tuplets[3].rhythm.dots,1);
 const word=m.buildPlan(0,0,{tempo:60});assert.equal(word.at(-1).startSeconds+word.at(-1).durationSeconds,3.5);
 const following=m.buildPlan(1,1,{tempo:60});assert.equal(following[0].startSeconds,0);
 assert.equal(plan.find(e=>e.wordIndex===1).startSeconds,4);
});
test('uncovered or altered source words fail without invented notes or inferred coda',()=>{
 const m=make([{...range,start:{chapter:22,verse:1},end:{chapter:22,verse:2}}]);
 assert.equal(m.events.length,52);assert.throws(()=>m.buildPlan(0,m.words.length-1),/covers only/);
 const p=corpus.passage([range]);p.verses[0].words[11].sourceHebrew='וַיֹּ֣אמֶר';
 assert.throws(()=>createReadingModel(p,{melodyId:PRINTED_SCORE.id}).buildPlan(0,12),/covers only/);
 assert.throws(()=>createReadingModel(p,{melodyId:'unsupported-tradition'}),/not implemented/);
});
test('source pitch and tempo vary independently; repeated assignments retain unique ties and occurrences',()=>{
 const m=make(),original=m.buildPlan(0,12,{tempo:60}),up=m.buildPlan(0,12,{tempo:60,transpose:1}),slow=m.buildPlan(0,12,{tempo:40});
 original.forEach((e,i)=>{
  assert.deepEqual({...up[i],midi:e.midi},e);assert.equal(slow[i].midi,e.midi);assert.equal(slow[i].syllableId,e.syllableId);
  assert.ok(Math.abs(slow[i].durationSeconds-e.durationSeconds*1.5)<1e-9);
 });
 const repeated=make([range,{...range,id:'again'}]);assert.equal(new Set(repeated.events.map(e=>e.id)).size,104);
 assert.equal(new Set(repeated.events.filter(e=>e.tieStart).map(e=>e.tieId)).size,4);
 assert.deepEqual(repeated.buildPlan(13,25).map(e=>e.midi),pitches);
 const assignment=parseAssignment(JSON.stringify(createAssignment('Printed source',[range],{melodyId:PRINTED_SCORE.id,tempo:50,transpose:7})),corpus);
 assert.equal(assignment.musicalPreferences.melodyId,PRINTED_SCORE.id);assert.equal(assignment.musicalPreferences.pronunciationId,null);assert.equal('tempo' in assignment.displayPreferences,false);
});
test('MusicXML retains source bars, rests and ties while MIDI joins tied components into held notes',()=>{
 const m=make(),plan=m.buildPlan(0,12,{tempo:60}),context={title:'Genesis 22:1',melody:m.profile,tempo:60,volume:0,transpose:0};
 const xml=musicXml(plan,m.words,context);
 assert.match(xml,/Francis L. Cohen/);assert.match(xml,/public domain/);assert.match(xml,/No added coda/);assert.doesNotMatch(xml,/TropeTrain original demonstration/);
 assert.equal((xml.match(/<note id=/g)||[]).length,52);assert.equal((xml.match(/<measure /g)||[]).length,14);
 assert.equal((xml.match(/<rest\/>/g)||[]).length,4);assert.equal((xml.match(/<tie type="start"/g)||[]).length,2);assert.equal((xml.match(/<tie type="stop"/g)||[]).length,2);
 assert.equal((xml.match(/<actual-notes>3<\/actual-notes>/g)||[]).length,6);
 const markup=staffMarkup(plan,m.words,0,52);
 assert.equal((markup.match(/notehead open-notehead/g)||[]).length,3);assert.equal((markup.match(/class="tie-arc"/g)||[]).length,2);assert.equal((markup.match(/class="staff-rest"/g)||[]).length,4);
 const midi=midiEvents(midiFile(plan,m.words,context)),on=midi.filter(e=>e.status===0x90),off=midi.filter(e=>e.status===0x80);
 assert.equal(on.length,50);assert.equal(off.length,50);assert.equal(off.at(-1).tick,44*MIDI_PPQ);
 assert.equal(on[5].tick,2*MIDI_PPQ);assert.equal(off[5].tick,3.5*MIDI_PPQ);assert.equal(on[6].tick,4*MIDI_PPQ);
});
test('WAV sustains the printed tie like one note and preserves actual digital silence in source rests',async()=>{
 const m=make(),plan=m.buildPlan(0,1,{tempo:60});
 const starts=[0,.75,1,4/3,5/3,2,4,5],durations=[.75,.25,1/3,1/3,1/3,1.5,1,3],midis=[67,67,69,67,66,64,67,71];
 const reference=starts.map((startSeconds,i)=>({midi:midis[i],startSeconds,durationSeconds:durations[i]}));
 const a=await renderWav(plan,{createContext,volume:.7}),b=await renderWav(reference,{createContext,volume:.7});
 const ab=new Uint8Array(await a.blob.arrayBuffer()),bb=new Uint8Array(await b.blob.arrayBuffer());
 assert.equal(a.duration,8);assert.ok(ab.every((n,i)=>n===bb[i]),'Printed tie must have one attack envelope, not separate re-attacks.');
 const samples=new DataView(ab.buffer);for(let i=Math.ceil(3.5*22050);i<4*22050;i++)assert.equal(samples.getInt16(44+i*2,true),0);
 const broken=structuredClone(plan);broken[6].midi++;
 assert.throws(()=>soundingNotes(broken),/mismatched/);
});
test('both immutable source scans survive the self-contained distribution',()=>{
 for(const [file,id,sha,bytes] of [['cohen-1902-genesis22.png','printed-score-scan',record.scan.sha256,record.scan.bytes],['cohen-1902-alternate-score.png','printed-score-alternate',record.alternateScan.cropSha256,record.alternateScan.cropBytes]]){
  const raw=readFileSync(new URL('../assets/scores/'+file,import.meta.url));assert.equal(raw.length,bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),sha);
  const standalone=readFileSync(new URL('../TropeTrain.html',import.meta.url),'utf8');
  const encoded=standalone.match(new RegExp(`id="${id}" src="data:image/png;base64,([A-Za-z0-9+/=]+)"`));assert.ok(encoded);assert.ok(Buffer.from(encoded[1],'base64').equals(raw));
 }
});
