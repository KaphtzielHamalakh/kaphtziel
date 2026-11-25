import {restoredPortableHtml,portableFileBytes} from './portable-artifact.mjs';
import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import{VOICE_STUDIES,voiceStudy,voiceRecording,voiceCoverage,voiceAudioRecord,restoreVoicePreferences}from'../voice-studies.js';
import{getCorpus}from'../library.js';import{createWordTimingDraft,parseWordTimingDraft,setWordBoundary}from'../word-timing-draft.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=value=>createHash('sha256').update(value).digest('hex'),evidence=JSON.parse(read('docs/ASAEL-PAIRED-CHANT.json'));
const study=voiceStudy('asael-bereshit'),ash=voiceRecording(study.id,'ashkenazic-as-recorded','ashkenazic-melody'),isr=voiceRecording(study.id,'israeli-as-recorded','ashkenazic-melody');
const corpus=await getCorpus(),words=corpus.passage([{...voiceCoverage(ash),id:'asael-review'}]).verses.flatMap(v=>v.words);
test('the two licensed source Vorbis originals match Commons pins while all70earlier recordings and four study specifications remain exact',()=>{
 assert.equal(sha(JSON.stringify(VOICE_STUDIES.recordings.slice(0,70))),'53f7f8ef388940df6121ddcfc1c05d492afb4730a405eac5bba73fee86bca42b');
 assert.equal(sha(JSON.stringify(VOICE_STUDIES.studies.slice(0,4))),'db0de868de75c2d1d71f8068bb38935e39b244b67967f2721ac0c502bdec5c1d');
 assert.equal(evidence.study.rightsEvidence.catalogRevision,2898373);let total=0;
 for(const r of[ash,isr]){const raw=read(r.audio.file),p=evidence.recordings.find(p=>p.id===r.id);assert.deepEqual(r,p);assert.equal(raw.length,r.audio.bytes);assert.equal(raw.toString('ascii',0,4),'OggS');assert(raw.includes(Buffer.from([1,...Buffer.from('vorbis')])));assert.equal(r.audio.mimeType,'audio/ogg');assert.equal(r.audio.sourceMimeType,'application/ogg');for(const hash of['sha1','sha256'])assert.equal(createHash(hash).update(raw).digest('hex'),r.audio[hash]);assert.equal(r.license.id,'CC-BY-SA-3.0');assert.equal(r.performer,'Asael (עשהאל)');assert.match(r.sourceUrl,/commons\.wikimedia\.org/);total+=raw.length;}
 assert.equal(total,7517700);
});
test('source melody and pronunciation axes expose exactly the two documented performances with distinct clocks and no synthetic cross-product',()=>{
 assert.deepEqual(study.pronunciations.map(p=>p.id),['ashkenazic-as-recorded','israeli-as-recorded']);assert.equal(study.deliveries.length,1);assert.equal(study.deliveries[0].kind,'chanted');assert.equal(ash.sourceMelodyLabel,isr.sourceMelodyLabel);assert.notEqual(ash.audio.sha256,isr.audio.sha256);assert.notEqual(ash.audio.estimatedDurationSeconds,isr.audio.estimatedDurationSeconds);
 assert.throws(()=>voiceRecording(study.id,'Galician','ashkenazic-melody'),/does not provide/);assert.throws(()=>voiceRecording(study.id,'ashkenazic-as-recorded','spoken'),/does not provide/);
 for(const r of[ash,isr])for(const field of['timedWords','syllableAlignment','phonemes','musicalNotes','independentReview'])assert.equal(r[field],null);
});
test('both pronunciation drafts bind the complete unchanged marked passage and reject transferring times between source recordings',()=>{
 assert.equal(words.length,469);const a=createWordTimingDraft(ash,voiceCoverage(ash),words),b=createWordTimingDraft(isr,voiceCoverage(isr),words);
 assert.deepEqual(a.words,b.words);assert(a.words.every(w=>w.start===null&&w.end===null));assert.equal(a.words[0].id,'gen-1-1-1');assert.equal(a.words[0].hebrew,'בְּרֵאשִׁ֖ית');assert.equal(a.words.at(-1).id,'gen-2-3-16');
 const edited=setWordBoundary(setWordBoundary(a,0,'start',.2),0,'end',1.8);assert.throws(()=>parseWordTimingDraft(JSON.stringify(edited),b),/different source recording/);assert.equal(b.words[0].start,null);assert.equal(a.sourceEditionCompared,false);assert.equal(b.syllableAlignment,null);
});
test('saved source choices preserve separate seconds spans and runtime audio URLs without changing recording data or musical settings',()=>{
 const saved={studyId:study.id,pronunciationId:isr.pronunciationId,deliveryId:isr.deliveryId,volume:0,repeat:false,spans:{[ash.id]:{start:1,end:4},[isr.id]:{start:2,end:5}}},restored=restoreVoicePreferences(saved);
 assert.equal(restored.pronunciationId,isr.pronunciationId);assert.deepEqual(restored.spans,saved.spans);assert.equal('melodyId'in restored,false);assert.equal('transpose'in restored,false);
 for(const r of[ash,isr]){const before=JSON.stringify(r),runtime=voiceAudioRecord(r,'https://kaphtziel.com/tropetrain/');assert.equal(runtime.audio.url,'https://kaphtziel.com/tropetrain/'+r.audio.file);assert.equal(runtime.audio.mimeType,'audio/ogg');assert.equal(JSON.stringify(r),before);}
});
test('the larger rights index preserves redirected reading references and withholds unsupported performers, pronunciations, coverage and timings',()=>{
 const index=JSON.parse(read('docs/ASAEL-CORPUS-SOURCE-INDEX.json')),files=new Map(index.files.map(f=>[f.title,f]));assert.equal(index.titleCorrespondence.length,1124);assert.equal(files.size,1018);assert.equal(new Set(index.files.map(f=>f.sha1)).size,1018);assert(index.titleCorrespondence.every(r=>files.has(r.canonicalTitle)));assert.equal(index.titleCorrespondence.filter(r=>r.requestedTitle!==r.canonicalTitle).length,107);
 assert(index.files.every(f=>f.license.id==='CC-BY-SA-3.0'&&f.pageRevision&&f.bytes>0&&f.sha1.length===40));assert.equal(index.files.reduce((n,f)=>n+f.bytes,0),1426172331);assert.equal(index.files.filter(f=>f.originalBytesVerifiedLocally).length,2);
 for(const f of index.files)for(const field of['performer','coverage','pronunciation','melody','wordTimes','phonemes','review'])assert.equal(f[field],null);
 for(const r of[ash,isr])assert(index.files.some(f=>f.sha1===r.audio.sha1&&f.originalBytesVerifiedLocally));
});
test('both distributions offer a discoverable paired-study shortcut and embedded source rights while optional originals are loaded explicitly',()=>{
 const normal=read('index.html').toString(),portable=restoredPortableHtml(read('TropeTrain.html')).toString(),sw=read('sw.js').toString();assert(normal.includes('id="asael-study-open"'));assert(portable.includes('id="asael-study-open"'));assert(portable.includes(read('docs/ASAEL-PAIRED-CHANT.json').toString('base64')));assert(portable.includes(read('docs/VOICE-STUDIES.json').toString('base64')));
 assert(portable.includes(read('docs/ASAEL-CORPUS-SOURCE-INDEX.json').toString('base64')));for(const r of[ash,isr])assert(!sw.includes(r.audio.file));assert(normal.includes('separate, initially blank boundaries'));assert.equal(evidence.invariants.kinnorEquivalence,null);assert.equal(evidence.invariants.newSingingSynthesis,null);
});
