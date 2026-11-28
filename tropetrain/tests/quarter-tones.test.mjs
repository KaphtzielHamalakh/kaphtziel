import test from 'node:test';
import assert from 'node:assert/strict';
import engine from 'web-audio-engine';
import {buildPlan,words,melody,noteName} from '../music.js';
import {pitchSpelling,eventPitchSpelling,eventPitchName} from '../score-data.js';
import {staffMarkup} from '../staff.js';
import {musicXml,midiFile,MIDI_PPQ} from '../music-exports.js';
import {scheduleInstrument,instrument,instrumentForPlan} from '../synthesis.js';
import {renderWav} from '../wav.js';
import {printedPatternRange} from '../pattern-range.js';
// Original engineering fixture only; no historical melody or phonetic claim.
const fixture=()=>buildPlan(0,0).map((e,i)=>({...e,midi:[67.5,69,65.5][i]}));
const context={title:'Original quarter-tone encoding test',tempo:84,transpose:0,volume:70,melody};
function messages(bytes){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);assert.equal(v.getUint32(18),bytes.length-22);let at=22,tick=0;const out=[];
 const vlq=()=>{let n=0,b;do{b=bytes[at++];n=n*128+(b&127);}while(b&128);return n;};
 while(at<bytes.length){tick+=vlq();const status=bytes[at++];if(status===255){const type=bytes[at++],n=vlq();out.push({tick,status,type,bytes:bytes.slice(at,at+n)});at+=n;}else out.push({tick,status,a:bytes[at++],b:bytes[at++]});}
 return out;
}
test('all equal-quarter-step pitches have exact spellings; unrelated fractional pitches remain rejected',()=>{
 const offset={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
 for(let m=0;m<=127;m+=.5){const p=pitchSpelling(m);assert.equal((p.octave+1)*12+offset[p.step]+p.alter,m);assert(Number.isInteger(p.position));}
 for(const m of [60.25,NaN,Infinity,-.5,127.5])assert.throws(()=>pitchSpelling(m));
 const p=fixture()[0];p.sourcePitch={step:'G',alter:.5,octave:4};p.sourceTranspose=0;assert.equal(eventPitchSpelling(p).alter,.5);assert.equal(eventPitchName(p),'G4 +50¢');assert.equal(noteName(67.5),'G4 +50¢');assert.throws(()=>eventPitchSpelling({...p,midi:68}),/disagree/);
});
test('staff and MusicXML preserve quarter alterations, marked Hebrew and exact rhythmic events through semitone transposition',()=>{
 const p=fixture(),before=JSON.stringify(words),xml=musicXml(p,words,context),svg=staffMarkup(p,words);
 assert.match(xml,/<step>G<\/step><alter>0.5<\/alter>/);assert.match(xml,/<accidental>quarter-sharp<\/accidental>/);assert(svg.includes('\ue282'));assert(svg.includes('G4 +50¢'));
 for(const delta of [-1,1]){const shifted=p.map(e=>({...e,midi:e.midi+delta})),s=staffMarkup(shifted,words);assert(!s.includes('undefined'));assert.match(musicXml(shifted,words,{...context,transpose:delta}),/<alter>-?0.5<\/alter>/);assert.deepEqual(shifted.map(e=>[e.id,e.syllable,e.durationSeconds]),p.map(e=>[e.id,e.syllable,e.durationSeconds]));}
 assert.equal(JSON.stringify(words),before);assert.equal(instrumentForPlan(buildPlan(0,0)),instrument);assert.match(instrumentForPlan(p).tuning,/24-TET/);assert.equal(instrumentForPlan(p).tuningReview,null);
 const range=printedPatternRange([p[0]],60,67);assert.equal(range.above,1);assert.equal(range.max,67.5);
});
test('parsed MIDI reconstructs every quarter pitch and clock with explicit bend range, resets and unchanged Hebrew metadata',()=>{
 const p=fixture(),events=messages(midiFile(p,words,context));let semitones=2,cents=0,selected=[127,127],bend=8192;const on=[],off=[];
 for(const e of events){if(e.status===0xb0){if(e.a===101)selected[0]=e.b;if(e.a===100)selected[1]=e.b;if(selected[0]===0&&selected[1]===0){if(e.a===6)semitones=e.b;if(e.a===38)cents=e.b;}}if(e.status===0xe0)bend=e.a+128*e.b;if(e.status===0x90)on.push({pitch:e.a+(bend-8192)/8192*(semitones+cents/100),tick:e.tick});if(e.status===0x80)off.push(e);}
 assert.deepEqual(on,p.map(e=>({pitch:e.midi,tick:Math.round(e.startBeat*MIDI_PPQ)})));assert.deepEqual(off.map(e=>e.tick),p.map(e=>Math.round((e.startBeat+e.beats)*MIDI_PPQ)));assert.equal(bend,8192);
 assert(events.some(e=>e.status===0xb0&&e.a===6&&e.b===2));assert(events.some(e=>e.status===0xb0&&e.a===38&&e.b===0));
 const meta=JSON.parse(new TextDecoder().decode(events.find(e=>e.status===255&&e.type===1).bytes));assert.deepEqual(meta.events.map(e=>e.midi),p.map(e=>e.midi));assert.equal(meta.words[0].sourceHebrew,words[0].sourceHebrew);
 assert(!messages(midiFile(buildPlan(0,0),words,context)).some(e=>e.status===0xe0||e.status===0xb0&&[6,38,100,101].includes(e.a)));
});
test('live scheduling and actual offline PCM keep the half-semitone frequency rather than rounding',async()=>{
 const scheduled=[],ctx={createOscillator:()=>({frequency:{},connect(){},start(){scheduled.push(this.frequency.value);},stop(){}}),createGain:()=>({gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){}})};
 scheduleInstrument(ctx,{}, {midi:67.5,durationSeconds:1},0);assert.equal(scheduled[0],440*2**((67.5-69)/12));
 const tone=[{id:'original-test',midi:67.5,startSeconds:0,durationSeconds:1}],rate=22050,wav=await renderWav(tone,{sampleRate:rate,volume:.7,createContext:(n,r)=>new engine.OfflineAudioContext(1,n,r)}),raw=new DataView(await wav.blob.arrayBuffer()),cross=[];
 let prev=raw.getInt16(44+Math.floor(.2*rate)*2,true);for(let i=Math.floor(.2*rate)+1;i<Math.floor(.8*rate);i++){const value=raw.getInt16(44+i*2,true);if(prev<=0&&value>0)cross.push(i);prev=value;}
 const hz=(cross.length-1)*rate/(cross.at(-1)-cross[0]);assert(Math.abs(hz-440*2**((67.5-69)/12))<.2);assert.equal(wav.frames,rate);assert.equal(raw.byteLength,44+rate*2);
});
