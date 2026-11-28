import test from 'node:test';
import assert from 'node:assert/strict';
import engine from 'web-audio-engine';
import {getCorpus} from '../library.js';
import {createReadingModel} from '../music.js';
import {BAER_NO111_PROFILES} from '../baer-no111-score.js';
import {NO111_RECORD} from '../baer-no111-data.js';
import {NO111_GRACE_STUDY,validateNo111GraceEvent} from '../source-no111-performance.js';
import {validateGraceEvent} from '../source-grace.js';
import {scoreData} from '../score-data.js';
import {renderWav} from '../wav.js';
import {staffMarkup} from '../staff.js';
import {musicXml,midiFile,MIDI_PPQ} from '../music-exports.js';
import {execFileSync} from 'node:child_process';
const corpus=await getCorpus(),ids=BAER_NO111_PROFILES.map(p=>p.id),near=(a,b)=>assert(Math.abs(a-b)<1e-9);
function model(index,sections=['a']){const gen=index<2,bookId=gen?'gen':'exo',chapter=gen?2:13,verse=gen?3:21;return createReadingModel(corpus.passage(sections.map(id=>({id,bookId,start:{chapter,verse},end:{chapter,verse}}))),{melodyId:ids[index],sourceUnderlay:{word(){throw Error('Printed music must not consume a pronunciation syllabifier.');}}});}
const plan=(i,o={})=>model(i).buildPlan(0,4,{tempo:60,no111GraceDemo:true,...o});
test('No111 source words keep exact marked strings and separate literal Latin units with no Hebrew syllable or phoneme allocation',()=>{
 assert.equal(BAER_NO111_PROFILES.length,3);assert.deepEqual(NO111_RECORD.studies.map(s=>s.words.map(w=>w.sourceHebrew)),[['וַיְבָ֤רֶךְ','אֱלֹהִים֙','אֶת־','י֣וֹם','הַשְּׁבִיעִ֔י'],['וַֽיהוָ֡ה','הֹלֵךְ֩','לִפְנֵיהֶ֨ם','יוֹמָ֜ם','בְּעַמּ֤וּד']]);
 for(const s of NO111_RECORD.studies)for(const w of s.words)for(const k of ['acceptedWrittenRanges','acceptedSyllableMapping','phonemes','review'])assert.equal(w[k],null);
 assert.deepEqual(NO111_RECORD.studies[0].words[1].printedUnits,['e','lo','him']);assert.deepEqual(NO111_RECORD.studies[1].words[0].printedUnits,['Wa','do','noj']);assert.equal(NO111_RECORD.source.no,111);assert.equal(NO111_RECORD.source.printedPage,37);
});
test('the two Genesis paths preserve their shared notes, upper/lower G4/F4 heads, one-flat key and original short bars',()=>{
 const a=plan(0),b=plan(1);assert.deepEqual(a.map(n=>n.midi),[69,62,65,65,65,70,69,65,69,67,67,67,69,65]);assert.deepEqual(b.map(n=>n.midi),[69,62,65,65,65,70,69,65,69,65,65,65,69,65]);
 for(const p of [a,b]){assert.equal(p.length,14);assert.equal(p.filter(n=>n.sourceNo111Grace).length,2);assert.deepEqual(p.filter(n=>!n.sourceNo111Grace).map(n=>n.beats),[.5,1/3,1/3,1/3,1/3,1/3,1/3,1/3,1/3,1/3,.5,.5]);near(p.at(-1).startSeconds+p.at(-1).durationSeconds,4.66);near(p.filter(n=>!n.sourceNo111Grace).reduce((v,n)=>v+n.sourceQuarterBeats,0),4.5);assert.equal(p[5].sourcePitch.alter,-1);assert.equal(new Set(p.map(n=>n.sourceWordId)).size,5);}
 assert.deepEqual(a.slice(0,9).map(n=>n.sourceNoteId),b.slice(0,9).map(n=>n.sourceNoteId));assert.deepEqual(a.slice(12).map(n=>n.sourceNoteId),b.slice(12).map(n=>n.sourceNoteId));
});
test('Exodus retains the dotted F5 quarter, six complete3/4bars, two written tuplets, quarter rest and unspecified fermata',()=>{
 const p=plan(2);assert.deepEqual(p.map(n=>n.midi),[65,69,72,77,76,74,72,74,72,65,65,60,65,65,65,72,72,69,72,69,69,60,65]);assert.equal(p[3].sourceRhythm.dots,1);assert.equal(p[3].beats,1.5);assert(p.slice(4,7).every(n=>n.sourceRhythm.type==='16th'&&n.sourceRhythm.actual===3));
 const rest=p.flatMap(n=>n.sourceRestsAfter??[]);assert.equal(rest.length,1);assert.equal(rest[0].beats,1);near(rest[0].startSeconds,4);near(p[9].startSeconds,5);assert.equal(p[18].sourceFermata.duration,'unspecified');assert.equal(p[18].sourceFermata.placement,'above');near(p.at(-1).startSeconds+p.at(-1).durationSeconds,18.08);
 for(let bar=1;bar<=6;bar++)near(p.filter(n=>n.sourceBar===bar&&!n.sourceNo111Grace).reduce((v,n)=>v+n.beats,0)+(bar===2?1:0),3);
});
test('grace-containing spans fail closed until a strict explicit choice; the first measured Genesis word can play without it',()=>{
 for(let i=0;i<3;i++){const m=model(i);assert.throws(()=>m.buildPlan(0,4,{tempo:60}),/unmeasured|80ms/);assert.throws(()=>m.buildPlan(0,4,{tempo:60,no111GraceDemo:'true'}),/unmeasured|80ms/);assert.throws(()=>m.buildPlan(0,4,{tempo:60,smallNoteDemo:true,graceDemo:true,no266SmallEighthDemo:true}),/unmeasured|80ms/);}
 assert.equal(model(0).buildPlan(0,0,{tempo:60}).length,3);assert.equal(model(2).buildPlan(0,0,{tempo:60}).length,9);
 for(const tempo of [42,60,120])for(const p of [plan(0,{tempo}),plan(2,{tempo})])for(const n of p.filter(n=>n.sourceNo111Grace)){assert.equal(n.durationSeconds,.08);assert.equal(n.sourceQuarterBeats,null);assert.deepEqual(n.performanceTiming,NO111_GRACE_STUDY);}
});
test('new word-owned graces cannot weaken the existing untexted grace guard or forge a different source, word, pitch, route or lyric',()=>{
 const n=plan(0)[3];assert.doesNotThrow(()=>validateNo111GraceEvent(n));assert.throws(()=>validateGraceEvent({...n,sourceGrace:n.sourceNo111Grace}),/word|phoneme|inferred/);
 for(const change of [{sourceProfile:ids[2]},{sourceWordId:'gen-2-3-1'},{sourcePrintedLyric:'lo'},{midi:n.midi+1},{phonemes:['a']},{durationSeconds:.09},{performanceTiming:{...NO111_GRACE_STUDY,sourceDuration:.08}}])assert.throws(()=>validateNo111GraceEvent({...n,...change}));
 const upper=plan(0)[10];assert.throws(()=>validateNo111GraceEvent({...upper,sourceProfile:ids[1]}));
});
test('uncovered words and altered Hebrew marks are unavailable and no complete verse or unsupported source is substituted',()=>{
 for(let i=0;i<3;i++){const m=model(i);assert.throws(()=>m.buildPlan(0,15,{tempo:60,no111GraceDemo:true}),/covers only the unchanged words/);const score=scoreData(plan(i),m.words);assert(score.every(n=>n.sourceWordOnly&&n.syllable===null&&n.phonemes===null&&n.sourceWordCorrespondence.acceptedSyllableMapping===null));}
 const p=corpus.passage([{id:'changed',bookId:'gen',start:{chapter:2,verse:3},end:{chapter:2,verse:3}}]);p.verses[0].words[0].sourceHebrew=p.verses[0].words[0].sourceHebrew.replace('֤','');const m=createReadingModel(p,{melodyId:ids[0]});assert.throws(()=>m.buildPlan(0,0,{no111GraceDemo:true}),/covers only the unchanged words/);
});
test('repeated assignments have distinct occurrence/slur/tuplet identities and key/BPM changes retain source words and printed units',()=>{
 const m=model(0,['first','repeat']),a=m.buildPlan(0,4,{tempo:60,no111GraceDemo:true}),b=m.buildPlan(16,20,{tempo:60,no111GraceDemo:true});assert.equal(new Set([...a,...b].map(n=>n.id)).size,28);assert.notEqual(a[1].sourceSlurId,b[1].sourceSlurId);assert.notEqual(a[1].sourceTupletId,b[1].sourceTupletId);assert.deepEqual(a.map(n=>n.sourceWordId),b.map(n=>n.sourceWordId));
 const shifted=plan(0,{tempo:120,transpose:2});assert.deepEqual(shifted.map(n=>n.midi),a.map(n=>n.midi+2));assert.deepEqual(shifted.map(n=>n.sourcePrintedLyric),a.map(n=>n.sourcePrintedLyric));for(const [i,n]of shifted.entries())near(n.durationSeconds,a[i].sourceNo111Grace ? .08 : a[i].durationSeconds/2);
});
test('actual PCM contains all source time, the explicit original grace contribution and digital silence in the Exodus quarter rest',async()=>{
 for(const i of [0,1,2]){const p=plan(i),result=await renderWav(p,{sampleRate:8000,createContext:(n,rate)=>new engine.OfflineAudioContext(1,n,rate)}),b=Buffer.from(await result.blob.arrayBuffer()),expected=i<2?37280:144640;assert.equal(b.length,44+expected*2);assert.equal(b.readUInt32LE(40),expected*2);assert.equal(b.readUInt32LE(4)+8,b.length);assert(b.subarray(44).some(v=>v!==0));for(const r of p.flatMap(n=>n.sourceRestsAfter??[]))for(let n=Math.ceil((r.startSeconds+.04)*8000);n<Math.floor((r.startSeconds+r.durationSeconds-.04)*8000);n++)assert.equal(b.readInt16LE(44+n*2),0);}
});
test('engraving retains every literal Latin unit separately from whole marked Hebrew words, with original slashes and no syllable fitting',()=>{
 for(let i=0;i<3;i++){const m=model(i),p=plan(i),svg=staffMarkup(p,m.words,0,99);assert.equal((svg.match(/class="staff-source-latin"/g)??[]).length,i<2?12:13);assert.equal((svg.match(/class="note-stroke grace-slash"/g)??[]).length,i<2?2:1);assert.equal((svg.match(/data-syllable-alignment="unassigned"/g)??[]).length,p.length);assert.equal((svg.match(/class="staff-rest"/g)??[]).length,i<2?0:1);for(const w of NO111_RECORD.studies[i<2?0:1].words)assert(svg.includes(w.sourceHebrew));for(const label of NO111_RECORD.studies[i<2?0:1].words.flatMap(w=>w.printedUnits))assert(svg.includes(label.replaceAll("'",'&apos;')));assert(!svg.includes('undefined'));}
});
test('parsed MusicXML preserves source unmeasured grace elements, complete measured durations and both independent lyric layers',()=>{
 for(let i=0;i<3;i++){const m=model(i),p=plan(i),xml=musicXml(p,m.words,{title:'No111source test',tempo:60,melody:BAER_NO111_PROFILES[i]}),parsed=JSON.parse(execFileSync('python3',['-c',"import xml.etree.ElementTree as E,json,sys;r=E.fromstring(sys.stdin.read());n=r.findall('.//part/measure/note');g=[x for x in n if x.find('grace') is not None];print(json.dumps({'pitched':sum(x.find('pitch') is not None for x in n),'graces':len(g),'graceDurationsAbsent':all(x.find('duration') is None for x in g),'slashes':[x.find('grace').get('slash') for x in g],'duration':sum(int(x.findtext('duration','0')) for x in n),'restCount':sum(x.find('rest') is not None for x in n),'latin':[x.text for x in r.findall('.//lyric[@number=\"2\"]/text')],'metadata':json.loads(r.findtext('.//miscellaneous-field[@name=\"tropetrain-metadata\"]'))}))"],{input:xml,encoding:'utf8',maxBuffer:1024*1024}));
  assert.equal(parsed.pitched,p.length);assert.equal(parsed.graces,i<2?2:1);assert(parsed.graceDurationsAbsent);assert(parsed.slashes.every(s=>s==='yes'));assert.equal(parsed.duration,(i<2?4.5:18)*4800);assert.equal(parsed.restCount,i<2?0:1);assert.deepEqual(parsed.latin,NO111_RECORD.studies[i<2?0:1].words.flatMap(w=>w.printedUnits));assert(parsed.metadata.events.every(e=>e.syllableId===null&&e.syllable===null&&e.phonemes===null&&e.sourceWordCorrespondence.acceptedPhonemes===null));assert.equal(parsed.metadata.events.filter(e=>e.sourceNo111Grace).length,parsed.graces);assert(parsed.metadata.events.every(e=>typeof e.sourcePrintedLyric==='string'));
 }
});
function midiNotes(bytes){
 const b=Buffer.from(bytes);assert.equal(b.subarray(0,4).toString(),'MThd');const notes=[],ends=[];let offset=8+b.readUInt32BE(4);
 while(offset<b.length){assert.equal(b.subarray(offset,offset+4).toString(),'MTrk');const end=offset+8+b.readUInt32BE(offset+4);offset+=8;let tick=0,running=0;const vlq=()=>{let v=0,x;do{x=b[offset++];v=v*128+(x&127);}while(x&128);return v;};
  while(offset<end){tick+=vlq();let status=b[offset++];if(status<128){offset--;status=running;}else if(status<240)running=status;
   if(status===255){const type=b[offset++],len=vlq();if(type===47)ends.push(tick);offset+=len;}
   else if(status===240||status===247)offset+=vlq();
   else{const high=status&240,a=b[offset++],v=high===192||high===208?null:b[offset++];if(high===144&&v>0)notes.push({tick,midi:a});}
  }assert.equal(offset,end);
 }return {notes,ends};
}
test('independently parsed MIDI retains all distinct attacks and source clocks, including a selected word’s trailing rest',async()=>{
 for(let i=0;i<3;i++){const m=model(i),p=plan(i),r=midiNotes(midiFile(p,m.words,{title:'No111',tempo:60,melody:BAER_NO111_PROFILES[i]}));assert.deepEqual(r.notes.map(n=>n.midi),p.map(n=>n.midi));for(const [j,n]of r.notes.entries())assert.equal(n.tick,Math.round(p[j].startBeat*MIDI_PPQ));assert.equal(Math.max(...r.ends),Math.round((i<2?4.66:18.08)*MIDI_PPQ));}
 const m=model(2),p=m.buildPlan(0,0,{tempo:60}),r=midiNotes(midiFile(p,m.words,{title:'No111firstword',tempo:60,melody:BAER_NO111_PROFILES[2]}));assert.equal(r.notes.length,9);assert.equal(Math.max(...r.ends),5*MIDI_PPQ);const wave=await renderWav(p,{sampleRate:8000,createContext:(n,rate)=>new engine.OfflineAudioContext(1,n,rate)}),bytes=Buffer.from(await wave.blob.arrayBuffer());assert.equal(bytes.length,80044);for(let frame=32320;frame<39680;frame++)assert.equal(bytes.readInt16LE(44+frame*2),0);
});
