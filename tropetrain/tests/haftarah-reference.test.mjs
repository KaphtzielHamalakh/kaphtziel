import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';import {execFileSync} from 'node:child_process';
import {HaftarahLibrary,restoreHaftarahPreferences,haftarahSections} from '../haftarah-reference.js';
import {getRepertoireCorpus} from '../repertoire.js';import {ReferenceLibrary} from '../reference-library.js';import {splitReferenceSegments} from '../recorded-reference.js';import {RecordedPitchStore} from '../recorded-pitch-store.js';
const bytes=name=>readFileSync(new URL('../'+name,import.meta.url)),data=JSON.parse(gunzipSync(bytes('data/references/haftarah-library.json.gz'))),library=new HaftarahLibrary(data),corpus=await getRepertoireCorpus();
const source=JSON.parse(execFileSync('python3',['-c',`import zipfile,json,hashlib,sys
with zipfile.ZipFile(sys.argv[1]) as z:
 files={n:{'bytes':len(z.read(n)),'gitBlob':hashlib.sha1(b'blob '+str(len(z.read(n))).encode()+b'\\0'+z.read(n)).hexdigest()} for n in z.namelist() if n.startswith(('xml/','labels/'))}
 starts={n:[float(v) for v in z.read(n).decode().strip().split(',')] for n in z.namelist() if n.startswith('labels/')}
 print(json.dumps({'files':files,'starts':starts}))`,new URL('../data/references/haftarah-sources.zip',import.meta.url).pathname],{maxBuffer:4*1048576}).toString());
const named=name=>library.records.find(r=>r.partName===name);
const wordsFor=sections=>corpus.passage(sections).verses.flatMap(v=>v.words).map((w,index)=>({...w,index}));
const verse=(bookId,chapter,n)=>wordsFor([{id:'test',bookId,start:{chapter,verse:n},end:{chapter,verse:n}}]);
test('54 original Haftarah takes retain independent pins, source assignments and explicit review gaps',()=>{
 assert.equal(library.records.length,54);assert.equal(library.byId.size,54);assert.equal(library.records.reduce((n,r)=>n+r.audio.bytes,0),93023935);
 assert.deepEqual(library.records.filter(r=>r.status==='timing-review').map(r=>r.partName),['Vayera','Tazria','Masei']);assert.equal(library.records.filter(r=>r.status==='source-timed').length,51);
 assert.equal(library.audit.sourceTimedMappedWordOccurrences,16604);assert.equal(library.audit.uniqueMappedReaderWords,17275);assert.equal(library.audit.mappedReaderWordOccurrences,17577);assert.equal(library.source.individualReader,null);
 for(const record of library.records){assert.match(record.audio.sha1,/^[a-f0-9]{40}$/);assert.match(record.audio.sha256,/^[a-f0-9]{64}$/);assert.equal(record.audio.source,'original');assert.equal(record.audio.measuredDurationSeconds,record.audio.decodedPcm.pcmFrames/16000);assert.notEqual(record.audio.decodedPcm.pcmSha256,record.audio.decodedPcm.decodedWavSha256);}
 assert.equal(library.source.audioLicense,'https://creativecommons.org/licenses/by-sa/3.0/');assert.equal(library.source.timingLicense,'https://creativecommons.org/licenses/by-sa/2.5/');
});
test('every source label and XML Git blob is unchanged, and all54 timestamp sequences reconstruct from the original archive',()=>{
 const audit=JSON.parse(bytes('docs/HAFTARAH-REFERENCE-AUDIT.json'));assert.equal(Object.keys(source.files).length,70);
 for(const file of audit.sourceFiles.files){assert.equal(source.files[file.local].gitBlob,file.gitBlob);assert.equal(source.files[file.local].bytes,file.bytes);}
 for(const record of library.records){const raw=source.starts[record.timingSource.local];assert.deepEqual(record.sourceStarts,raw);let index=0;
  for(const word of record.words){const after=index+word.sourceWords.length;if(record.status==='source-timed'){assert.equal(word.startSeconds,raw[index]);assert.equal(word.endSeconds,after===raw.length?null:raw[after]);}else{assert.equal(word.startSeconds,null);assert.equal(word.endSeconds,null);}index=after;}
  assert.equal(index,record.sourceWordCount);
 }
});
test('the opening Isaiah reading preserves all marks, exact canonical owners and original source-time boundaries',()=>{
 const record=library.records[0],words=verse('isa',42,5),before=JSON.stringify(words),rows=library.selection(record.id,words,0,words.length-1);
 assert.equal(record.partName,'Bereshit');assert.equal(rows.length,17);assert.equal(rows[0].id,'isa-42-5-1');assert.equal(rows[0].uxlcHebrew,'כֹּֽה־');assert.equal(rows[0].startSeconds,source.starts[record.timingSource.local][0]);
 assert.deepEqual(rows.map(r=>r.uxlcHebrew),words.map(w=>w.sourceHebrew));assert.deepEqual(rows.map(r=>r.occurrenceId),words.map(w=>w.id));assert.equal(JSON.stringify(words),before);assert.equal(splitReferenceSegments(rows).length,1);
});
test('overlapping haftarot retain separate recordings, timings and choices for the same Hebrew words',()=>{
 const a=named('Noach'),b=named('Re’eh'),words=verse('isa',54,11),ra=library.selection(a.id,words,0,0)[0],rb=library.selection(b.id,words,0,0)[0];
 assert.equal(ra.id,rb.id);assert.equal(ra.uxlcHebrew,rb.uxlcHebrew);assert.notEqual(ra.recordingId,rb.recordingId);assert.notEqual(ra.startSeconds,rb.startSeconds);assert.notEqual(a.audio.sha1,b.audio.sha1);assert.notEqual(library.wordMaps.get(a.id),library.wordMaps.get(b.id));
});
test('discontinuous readings preserve primary section order, including the backward Jeremiah chapter transition',()=>{
 assert.equal(library.records.filter(r=>r.sections.length>1).length,5);
 const record=named('Mishpatim'),original=JSON.stringify(record.sections),sections=haftarahSections(record),words=wordsFor(sections),rows=library.selection(record.id,words,0,words.length-1);
 assert.deepEqual(sections.map(s=>[s.start.chapter,s.start.verse,s.end.chapter,s.end.verse]),[[34,8,34,22],[33,25,33,26]]);assert.equal(rows.length,words.length);assert.equal(rows[0].id,'jer-34-8-1');assert(rows.at(-1).id.startsWith('jer-33-26-'));assert.equal(splitReferenceSegments(rows).length,1);assert.equal(JSON.stringify(record.sections),original);sections[0].start.verse=9;assert.equal(record.sections[0].start.verse,8);
});
test('repeated assignment occurrences stay distinct while the same original source interval can be replayed twice',()=>{
 const record=library.records[0],section={bookId:'isa',start:{chapter:42,verse:5},end:{chapter:42,verse:5}},words=wordsFor([{...section,id:'one'},{...section,id:'again'}]),rows=library.selection(record.id,words,0,words.length-1);
 assert.equal(new Set(rows.map(r=>r.occurrenceId)).size,words.length);assert.equal(rows[0].id,rows[17].id);assert.notEqual(rows[0].occurrenceId,rows[17].occurrenceId);assert.equal(rows[0].startSeconds,rows[17].startSeconds);assert.equal(splitReferenceSegments(rows).length,2);
});
test('source timing failures keep every original value and cannot become word playback through a partial selection',()=>{
 for(const record of library.records.filter(r=>r.status==='timing-review')){const first=record.words.find(w=>w.id);assert.throws(()=>library.selection(record.id,[{id:first.id,sourceHebrew:first.uxlcHebrew,index:0}],0,0),/Complete-recording playback/);}
 const t=named('Tazria');assert.equal(t.sourceStarts[164],177.645787);assert.equal(t.sourceStarts[165],177.4);assert.equal(named('Vayera').sourceWordCount,200);assert.equal(named('Vayera').sourceStarts.length,556);assert.equal(named('Masei').sourceWordCount,389);assert.equal(named('Masei').sourceStarts.length,367);
});
test('the original invalid Vayera passage is refused without silently substituting a different book',()=>{
 const record=named('Vayera');assert.equal(record.sourceCoverage,'Kings_1 4:1 - 4:37');assert.equal(record.bookId,'kgs1');assert.equal(record.readerSectionsValid,false);assert.throws(()=>haftarahSections(record),/no replacement passage/i);
});
test('the different Ezekiel form remains unassigned while exact neighboring words retain source links',()=>{
 const record=named('Tetzaveh'),words=verse('ezk',43,15),missing=words.findIndex(w=>(w.sourceWordId??w.id)==='ezk-43-15-4');assert.equal(missing,3);assert.throws(()=>library.selection(record.id,words,missing,missing),/Unmatched forms/);
 assert.equal(library.selection(record.id,words,2,2)[0].id,'ezk-43-15-3');assert.equal(library.selection(record.id,words,4,4)[0].id,'ezk-43-15-5');
 const original=record.words.find(w=>w.id===null);assert.equal(original.sourceHebrew,'וּמֵהָאֲרִיאֵ֣ל');assert.equal(original.uxlcHebrew,null);assert.equal(words[missing].sourceHebrew,'וּמֵהָאֲרִאֵ֣יל');
});
test('changed accents, unrelated readings and out-of-duration word windows are rejected without clipping',()=>{
 const words=verse('isa',42,5),bad=structuredClone(words);bad[0].sourceHebrew=bad[0].sourceHebrew.replace('ֽ','');assert.throws(()=>library.selection(library.records[0].id,bad,0,0),/marked reader/);
 assert.throws(()=>library.selection(library.records[0].id,verse('gen',1,1),0,0),/not fully mapped/);
 const modified=structuredClone(data);modified.records[0].audio.measuredDurationSeconds=.05;modified.records[0].audio.decodedPcm.pcmFrames=800;const constrained=new HaftarahLibrary(modified);assert.throws(()=>constrained.selection(library.records[0].id,words,0,0),/No boundary is changed/);
});
test('Haftarah preferences validate source, bounded pitch/speed and independent volume without accepting a pronunciation or instrument preset',()=>{
 const defaults=restoreHaftarahPreferences(null,library),valid=restoreHaftarahPreferences({recordingId:named('Noach').id,volume:0,rate:75,semitones:3,repeat:true,instrumentTranspose:7,pronunciation:'Galician'},library);
 assert.deepEqual(valid,{recordingId:named('Noach').id,volume:0,rate:75,semitones:3,repeat:true});assert.deepEqual(restoreHaftarahPreferences({recordingId:'unknown',volume:'90',rate:'75',semitones:'3',repeat:'yes'},library),defaults);assert.equal(restoreHaftarahPreferences({rate:95,semitones:13,volume:-1},library).rate,100);
});
test('the existing full Torah reference library stays separate and retains its previous coverage',()=>{
 const torah=new ReferenceLibrary(JSON.parse(gunzipSync(bytes('data/references/torah-library.json.gz'))));assert.equal(torah.recordings.length,378);assert.equal(torah.byWord.size,79985);assert.equal(torah.at(verse('isa',42,5)[0]),undefined);assert.equal(library.wordMaps.get(library.records[0].id).has('gen-1-1-1'),false);
});
test('zero Haftarah pitch bypasses processing and keeps the unchanged original media',async()=>{
 const record=library.records[0],calls=[];const store=new RecordedPitchStore({sourceStore:{url:async r=>{calls.push(r.audio.sha1);return 'original-haftarah';}},decode:()=>{throw Error('No decode expected');},probe:()=>{throw Error('No probe expected');},render:()=>{throw Error('No processing expected');}});
 assert.equal(await store.url(record,{semitones:0}),'original-haftarah');assert.deepEqual(calls,[record.audio.sha1]);
});
test('normal and portable builds include the exact original Haftarah preview and reproducible source data',()=>{
 const normal=bytes('index.html').toString(),portable=restoredPortableHtml(bytes('TropeTrain.html')).toString(),record=library.records[0],audio=bytes('assets/references/Bereshit-H.mp3');assert.equal(audio.length,record.audio.bytes);assert.equal(createHash('sha1').update(audio).digest('hex'),record.audio.sha1);assert.equal(createHash('sha256').update(audio).digest('hex'),record.audio.sha256);
 const match=portable.match(/<audio id="haftarah-audio" src="data:audio\/mpeg;base64,([A-Za-z0-9+/=]+)"/);assert(match);assert.deepEqual(Buffer.from(match[1],'base64'),audio);assert(portable.includes(bytes('data/references/haftarah-sources.zip').toString('base64')));assert(portable.includes(bytes('docs/HAFTARAH-PRACTICE.json').toString('base64')));
 for(const id of ['haftarah-choice','haftarah-open','haftarah-play','haftarah-whole','haftarah-pitch','haftarah-rate','haftarah-repeat','haftarah-volume','haftarah-cancel'])assert(normal.includes(`id="${id}"`));
});
