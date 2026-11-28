import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import engine from 'web-audio-engine';
import {BAER_THIRD_PATTERN_ROW as row} from '../baer-third-pattern-data.js';
import {baerThirdPatternModes,baerThirdPatternPlan} from '../baer-third-patterns.js';
import {printedPatternRests,printedPatternBeats,printedPatternDuration} from '../baer-patterns.js';
import {soundingNotes} from '../synthesis.js';
import {renderWav} from '../wav.js';
import {originalParentProvenance} from './baer-numbering-normalize.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex'),old=JSON.parse(read('docs/BAER-NO105-THIRD-PATTERNS-R1.json')),data=row.record,p=(mode,o={})=>baerThirdPatternPlan(mode,{tempo:60,transpose:0,...o}),near=(a,b)=>assert(Math.abs(a-b)<1e-10);
test('revision2 retains149accepted components and22figure objects after only the documented parent-citation correction, with the exact pinned revision1record',()=>{
 assert.equal(sha(read('docs/BAER-NO105-THIRD-PATTERNS-R1.json')),'3fad9153d3a0d05d396718dbce06e9026941e374013fe6e566e9938ad62cd81d');assert.equal(data.revision,2);assert.equal(old.revision,1);
 const ids=new Set(old.notes.map(n=>n.id)),figs=new Set(old.figures.filter(f=>f.status!=='unresolved-route').map(f=>f.id));assert.equal(ids.size,149);assert.equal(figs.size,22);assert.deepEqual(originalParentProvenance(data.notes.filter(n=>ids.has(n.id))),old.notes);assert.deepEqual(originalParentProvenance(data.figures.filter(f=>figs.has(f.id))),old.figures.filter(f=>figs.has(f.id)));assert.equal(data.notes.length-ids.size,87);
});
test('all28earlier third-row event and sounding plans change only source revision and the documented parent-citation hash, preserving every clock, pitch, rest and ID',()=>{
 const ids=new Set(old.figures.filter(f=>f.status!=='unresolved-route').map(f=>f.id)),normalize=value=>Array.isArray(value)?value.map(normalize):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='sourceRevision'?(assert.equal(v,2),1):normalize(v)])):value;
 const actual=baerThirdPatternModes().filter(m=>ids.has(m.sourceFigureId)).map(m=>{const plan=p(m.id,{graceDemo:true});return originalParentProvenance(normalize({source:'third',mode:m.id,plan,rests:printedPatternRests(plan),sounding:soundingNotes(plan)}));});assert.equal(actual.length,28);assert.equal(sha(JSON.stringify(actual)),'8a138ef57f7eb6821512e08bf2bd80a70e09d43f4d408a938f4acfc06527a8d7');
});
test('Mahpakh6/8 keeps the pickup and short closing bar, with two separately beamed twelve-eighth paths',()=>{
 const a=p('mahpakh-pashta-zaqef'),b=p('mahpakh-pashta-zaqef:lower');assert.deepEqual(a.map(n=>n.midi),[69,62,65,65,72,69,65,69,69,65,67,65]);assert.deepEqual(b.map(n=>n.midi),[69,62,65,65,72,69,64,65,67,69,67,65]);
 for(const notes of[a,b]){assert(notes.every(n=>n.beats===.5));assert.equal(printedPatternBeats(notes),6);assert.equal(notes[1].startBeat,.5);assert.equal(notes[7].startBeat,3.5);assert.equal(printedPatternDuration(notes),6);}assert.equal(data.figures.find(f=>f.id==='mahpakh-pashta-zaqef').sourceMeter,'6/8');
});
test('Munah–Etnahta preserves the upper sixteenth triplet and lower ordinary beams on shared heads',()=>{
 const a=p('munah-etnahta'),b=p('munah-etnahta:lower');assert.deepEqual(a.map(n=>n.midi),[77,69,74,67,62,65,65,60]);assert.deepEqual(b.map(n=>n.midi),[77,69,67,62,62,67,65,60]);
 assert.deepEqual(a.map(n=>n.beats),[1,1/6,1/6,1/6,.5,.5,.5,.5]);assert.deepEqual(b.map(n=>n.beats),[1,.25,.25,.5,.25,.25,.5,.5]);near(printedPatternBeats(a),3.5);near(printedPatternBeats(b),3.5);assert.equal(a[1].sourcePrintedHead.id,b[1].sourcePrintedHead.id);assert.equal(a[3].sourcePrintedHead.id,b[2].sourcePrintedHead.id);assert(a.slice(1,4).every(n=>n.sourceRhythm.actual===3&&n.sourceRhythm.type==='16th'));assert(b.every(n=>n.sourceRhythm.actual===1));
});
test('Pazer keeps the separate quarter/eighth heads and withholds its unmeasured slashed D5 in both paths until explicit original timing',()=>{
 const figure=data.figures.find(f=>f.id==='pazer');assert.equal(figure.sourceMeasuredQuarterBeats,3.75);assert.deepEqual(figure.sourceMeasuredQuarterBeatsByVariant,{upper:3.75,lower:3.75});
 for(const mode of['pazer','pazer:lower'])assert.throws(()=>p(mode,{repeatDemo:true,smallPatternDemo:true}),/unmeasured|timing review/);
 const a=p('pazer',{graceDemo:true}),b=p('pazer:lower',{graceDemo:true});assert.deepEqual(a.map(n=>n.midi),[65,69,72,77,72,69,74,72]);assert.deepEqual(b.map(n=>n.midi),[65,69,72,69,74,72]);assert.equal(a[0].sourcePrintedHead.id,b[0].sourcePrintedHead.id);assert.equal(a[4].sourcePrintedHead.id,b[2].sourcePrintedHead.id);assert.equal(a[4].beats,.5);assert.equal(b[2].beats,1);
 for(const mode of['pazer','pazer:lower']){const x=p(mode,{graceDemo:true}),fast=p(mode,{graceDemo:true,tempo:120});assert.equal(x.at(-2).midi,74);assert(x.at(-2).sourceGrace.slash);assert.equal(x.at(-2).durationSeconds,.08);assert.equal(fast.at(-2).durationSeconds,.08);assert.equal(x.at(-1).beats,.75);near(x.at(-2).startSeconds,3);near(printedPatternDuration(x),3.83);near(printedPatternDuration(fast),1.955);assert.equal(x.at(-1).sourceSlurs.at(-1).phase,'stop');}
});
test('Azla/Geresh shares four ordinary sixteenths and B-natural, then keeps the two final quarters separate',()=>{
 const a=p('azla-geresh'),b=p('azla-geresh:lower');assert.deepEqual(a.map(n=>n.midi),[65,69,72,71,74,72,72]);assert.deepEqual(b.map(n=>n.midi),[65,69,72,71,74,72,69]);assert.deepEqual(a.map(n=>n.beats),[.5,.5,.25,.25,.25,.25,1]);assert.deepEqual(a.slice(0,6).map(n=>n.id),b.slice(0,6).map(n=>n.id));assert.match(a[3].sourceAccidentalEvidence,/natural/);assert.equal(a[3].sourcePitch.alter,0);assert.equal(printedPatternBeats(a),3);assert.equal(printedPatternBeats(b),3);
});
test('Gershayim retains its upper natural/lower G4F4 distinction, shared phrase arc and all three trailing rests',()=>{
 const a=p('gershayim'),b=p('gershayim:lower');assert.deepEqual(a.map(n=>n.midi),[65,72,72,71,74,72]);assert.deepEqual(b.map(n=>n.midi),[65,72,69,67,65,69]);
 for(const x of[a,b]){assert.deepEqual(x.map(n=>n.beats),[.5,.5,.5,.25,.25,1]);assert.deepEqual(printedPatternRests(x).map(r=>[r.startSeconds,r.beats]),[[3,1],[4,1],[5,.5]]);assert.equal(printedPatternDuration(x),5.5);assert.equal(x[2].sourceSlurs[0].phase,'start');assert.equal(x.at(-1).sourceSlurs[0].phase,'stop');}assert.match(a[3].sourceAccidentalEvidence,/upper/);assert.equal(b[3].sourceAccidentalEvidence,undefined);
});
test('Darga/Tevir keeps its sixteenth rest, upper flat/common natural and final rest with separate pickup and final quarter',()=>{
 const a=p('darga-tevir'),b=p('darga-tevir:lower');assert.deepEqual(a.map(n=>n.midi),[72,72,70,69,67,65,65,64,64,63,62,64,65]);assert.deepEqual(b.map(n=>n.midi),[65,72,70,69,67,65,65,64,64,62,60,64,62]);
 for(const x of[a,b]){assert.deepEqual(printedPatternRests(x).map(r=>[r.startSeconds,r.beats]),[[3,.25],[5.5,.5]]);assert.equal(x[7].startSeconds,3.25);assert.equal(x[8].startSeconds,3.5);assert.equal(printedPatternDuration(x),6);}assert.match(a[9].sourceAccidentalEvidence,/flat/);assert.match(a[11].sourceAccidentalEvidence,/natural/);assert.match(b[11].sourceAccidentalEvidence,/natural/);assert.equal(a[9].sourcePitch.alter,-1);assert.equal(b[9].midi,62);
});
test('Sofpasuq retains three-beam versus two-beam pairs and unequal written cell lengths without padding or a fabricated tuplet',()=>{
 const a=p('sof-pasuq'),b=p('sof-pasuq:lower');assert.deepEqual(a.map(n=>n.midi),[67,69,69,69,62]);assert.deepEqual(b.map(n=>n.midi),[65,69,69,69,62]);assert.deepEqual(a.map(n=>n.beats),[.125,.125,1,.5,.5]);assert.deepEqual(b.map(n=>n.beats),[.25,.25,1,.5,.5]);assert.equal(a[1].sourcePrintedHead.id,b[1].sourcePrintedHead.id);assert(a.every(n=>n.sourceRhythm.actual===1));assert.equal(printedPatternBeats(a),2.25);assert.equal(printedPatternBeats(b),2.5);assert.equal(printedPatternRests(a).length,0);assert.equal(printedPatternRests(b).length,0);assert.equal(a[0].sourceSlurs[0].placement,'above');assert.equal(a.at(-1).sourceSlurs[0].placement,'below');
});
test('both new rest-bearing figures produce complete PCM16 WAV bytes including all written rests',async()=>{
 for(const mode of['gershayim','gershayim:lower','darga-tevir','darga-tevir:lower']){const plan=p(mode),r=await renderWav(plan,{sampleRate:8000,createContext:(n,rate)=>new engine.OfflineAudioContext(1,n,rate)}),bytes=Buffer.from(await r.blob.arrayBuffer());assert.equal(bytes.readUInt32LE(4)+8,bytes.length);assert.equal(bytes.readUInt32LE(40),bytes.length-44);assert.equal((bytes.length-44)/2,Math.ceil(printedPatternDuration(plan)*8000));for(const rest of printedPatternRests(plan))for(let i=Math.ceil((rest.startSeconds+.04)*8000);i<Math.floor((rest.startSeconds+rest.durationSeconds-.04)*8000);i++)assert.equal(bytes.readInt16LE(44+i*2),0);}
});
test('source delta retains exact earlier manual/compiler/crop bytes while the expanded excerpt has separate provenance',()=>{
 const result=JSON.parse(execFileSync('python3',['-c',"import zipfile,json,hashlib,sys;z=zipfile.ZipFile(sys.argv[1]);m=json.loads(z.read('SOURCE-MANIFEST.json'));assert all(hashlib.sha256(z.read(r['path'])).hexdigest()==r['sha256'] and len(z.read(r['path']))==r['bytes'] for r in m['files']);print(json.dumps(m))",new URL('../'+data.previousRevision.sourceDelta,import.meta.url).pathname],{encoding:'utf8'}));
 assert.equal(result.files.length,5);assert.equal(data.previousRevision.recordSha256,sha(read(data.previousRevision.record)));assert.equal(data.previousRevision.sourceDeltaSha256,sha(read(data.previousRevision.sourceDelta)));for(const r of old.inputs.filter(r=>result.files.some(x=>x.path===r.path)))assert.equal(result.files.find(x=>x.path===r.path).sha256,r.sha256);const current=data.source.pages['34'],prior=old.source.pages['34'];assert.notEqual(current.image,prior.image);assert.equal(current.inspectionCrop[3],1275);assert.equal(current.previousExcerpt.sha256,prior.imageSha256);assert.equal(sha(read(prior.image)),prior.imageSha256);assert.equal(sha(read(current.image)),current.imageSha256);
});
