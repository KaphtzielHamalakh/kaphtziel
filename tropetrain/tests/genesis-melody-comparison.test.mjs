import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import{GENESIS_MELODY_COMPARISON as report}from'../genesis-melody-comparison-data.js';import{GENESIS_MELODY_WORD_SUPPORT as support}from'../genesis-melody-word-support-summary.js';
import{VOICE_STUDIES,VOICE_FEATURED_STUDIES,VOICE_SOURCE_RECORDINGS,voiceStudy,voiceRecording,voiceCoverage,voiceChoices,restoreVoicePreferences}from'../voice-studies.js';
import{getCorpus}from'../library.js';import{createWordTimingDraft,setWordBoundary,parseWordTimingDraft}from'../word-timing-draft.js';import{WORD_SUPPORT,wordSupportAvailable,loadWordSupport,validateWordSupport}from'../word-support.js';
const read=n=>readFileSync(new URL('../'+n,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex'),study=report.study.id,corpus=await getCorpus(),words=corpus.passage([{...report.recording.coverage,id:'compare'}]).verses.flatMap(v=>v.words),draft=r=>createWordTimingDraft(r,voiceCoverage(r),words),record=(p,d)=>voiceRecording(study,p+'-as-recorded',d+'-melody');

test('licensed original and separate catalog labels retain exact pinned metadata, clock and null review fields',()=>{
 assert.deepEqual(report,JSON.parse(read('docs/GENESIS-MELODY-COMPARISON.json')));assert.equal(read(report.sourcePack.file).length,report.sourcePack.bytes);assert.equal(sha(read(report.sourcePack.file)),report.sourcePack.sha256);
 const r=record('israeli','moroccan');assert.equal(r.id,'itamar-genesis-2-4-19');assert.equal(r.performer,'Itamar Malka (איתמר מלכא)');assert.equal(r.sourceMelodyLabel,'מרוקאית');assert.equal(r.sourcePronunciationLabel,'ישראלית');assert.equal(r.sourceFileRevision,779161963);assert.equal(r.sourceCatalogRevision,2898373);assert.equal(r.audio.bytes,969896);assert.equal(r.audio.sha256,'efb60efa2a36a3710fd613ccd5e69321b4edf5570c67f414252eced449ca3ef4');assert.equal(r.audio.estimatedDurationSeconds,6974208/44100);assert.equal(r.license.id,'CC-BY-SA-3.0');assert.equal(r.catalogPassageEvidence.correctedCoverage,null);assert.equal(r.catalogPassageEvidence.sourceEditionCompared,false);
 for(const k of ['acceptedWordTimes','phonemes','musicalReview','newVoice','kinnorEquivalence'])assert.equal(report[k],null);for(const k of ['timedWords','syllableAlignment','phonemes','musicalNotes','independentReview'])assert.equal(r[k],null);
 assert.equal(report.counts.newBundledAudio,0);assert.equal(report.counts.newReviewedMelodyGrammars,0);assert.equal(report.counts.newSingingVoices,0);
});

test('comparison references the existing Asael identities without duplicates or draft rebinding',()=>{
 assert.equal(VOICE_STUDIES.recordings.length,72);assert.equal(VOICE_STUDIES.studies.length,5);assert.equal(VOICE_FEATURED_STUDIES.length,7);assert.equal(VOICE_SOURCE_RECORDINGS.length,1183);assert.equal(new Set(VOICE_SOURCE_RECORDINGS.map(r=>r.id)).size,1183);
 for(const pronunciation of['ashkenazic','israeli']){const a=record(pronunciation,'ashkenazic'),canonical=voiceRecording('asael-source-2460-674615654d',pronunciation+'-as-recorded','ashkenazic-melody');assert.equal(a,canonical);assert.equal(a.studyId,'asael-source-2460-674615654d');assert.deepEqual(draft(a),draft(canonical));const edit=setWordBoundary(setWordBoundary(draft(a),0,'start',.1),0,'end',.8);assert.deepEqual(parseWordTimingDraft(JSON.stringify(edit),draft(canonical)),edit);}
});

test('only the three real melody/pronunciation combinations can be selected, with no automatic fallback',()=>{
 for(const [p,d]of[['ashkenazic','ashkenazic'],['israeli','ashkenazic'],['israeli','moroccan']]){const r=record(p,d);assert.equal(r.pronunciationId,p+'-as-recorded');assert.equal(r.deliveryId,d+'-melody');}
 assert.throws(()=>record('ashkenazic','moroccan'),/unavailable/);assert.throws(()=>voiceRecording(study,'sephardic','moroccan-melody'),/does not provide/);
 let c=voiceChoices(study,'ashkenazic-as-recorded','ashkenazic-melody');assert.equal(c.deliveries.find(d=>d.id==='moroccan-melody').disabled,true);assert(c.pronunciations.every(p=>!p.disabled));c=voiceChoices(study,'israeli-as-recorded','ashkenazic-melody');assert(c.deliveries.every(d=>!d.disabled));c=voiceChoices(study,'israeli-as-recorded','moroccan-melody');assert.equal(c.pronunciations.find(p=>p.id==='ashkenazic-as-recorded').disabled,true);assert.equal(c.deliveries.find(d=>d.id==='ashkenazic-melody').disabled,false);
 assert.equal(voiceStudy('asael-source-2460-674615654d').deliveries.length,1);assert.equal(voiceStudy('asael-bereshit').deliveries.length,1);
});

test('all217marked reader words and IDs remain exact across all three performances, with isolated blank timing drafts',()=>{
 const originals=[record('ashkenazic','ashkenazic'),record('israeli','ashkenazic'),record('israeli','moroccan')],drafts=originals.map(draft);assert.equal(words.length,217);assert.equal(words[0].sourceHebrew,'אֵ֣לֶּה');assert.equal(words.at(-1).sourceHebrew,'שְׁמֽוֹ׃');assert.equal(new Set(originals.map(r=>r.audio.sha256)).size,3);assert.equal(new Set(originals.map(r=>r.audio.estimatedDurationSeconds)).size,3);
 for(const d of drafts){assert.deepEqual(d.words,drafts[0].words);assert(d.words.every(w=>w.start===null&&w.end===null));assert.equal(d.sourceEditionCompared,false);assert.equal(d.independentReview,null);}
 for(let a=0;a<3;a++)for(let b=0;b<3;b++)if(a!==b){const edit=setWordBoundary(setWordBoundary(drafts[a],0,'start',.1),0,'end',.8);assert.throws(()=>parseWordTimingDraft(JSON.stringify(edit),drafts[b]),/different source recording/);}
});

test('comparison selection and each original seconds span restore without changing canonical recording identity',()=>{
 const records=[record('ashkenazic','ashkenazic'),record('israeli','ashkenazic'),record('israeli','moroccan')],spans=Object.fromEntries(records.map((r,i)=>[r.id,{start:i+.1,end:i+1}]));
 for(const r of records){const v=restoreVoicePreferences({studyId:study,pronunciationId:r.pronunciationId,deliveryId:r.deliveryId,volume:0,repeat:false,spans});assert.equal(v.studyId,study);assert.equal(voiceRecording(v.studyId,v.pronunciationId,v.deliveryId),r);assert.deepEqual(v.spans,spans);assert.equal(v.volume,0);assert.equal(v.repeat,false);}
 const invalid=restoreVoicePreferences({studyId:study,pronunciationId:'ashkenazic-as-recorded',deliveryId:'moroccan-melody'});assert.equal(invalid.studyId,'seed-esther');
});

test('new acoustic support retains exact words, original clock, model provenance and explicit unreviewed gaps',async()=>{
 const r=record('israeli','moroccan'),expected=draft(r),entry=support.records[0];assert.equal(WORD_SUPPORT.records.length,2);assert(wordSupportAvailable(r));assert.equal(sha(read(entry.file)),entry.sha256);const value=await loadWordSupport(r,expected,{readPacket:async n=>read(n)});assert.equal(value.words.length,217);assert.equal(value.words.filter(w=>!w.evidence.lettersWithArgmaxSupport).length,6);assert.deepEqual(value.words.map(w=>({id:w.id,hebrew:w.hebrew})),expected.words.map(w=>({id:w.id,hebrew:w.hebrew})));assert(value.words.every(w=>w.approvedBoundary===null&&w.review===null));assert.equal(value.sourceEditionCompared,false);assert.equal(value.source.duration,r.audio.estimatedDurationSeconds);assert(expected.words.every(w=>w.start===null&&w.end===null));
 assert.throws(()=>validateWordSupport(value,draft(record('israeli','ashkenazic'))),/different source recording/);const bad=structuredClone(value);bad.sourceEditionCompared=true;assert.throws(()=>validateWordSupport(bad,expected),/cannot certify/);const broken=Uint8Array.from(read(entry.file));broken[5]^=1;await assert.rejects(loadWordSupport(r,expected,{readPacket:async()=>broken}),/checksum/);
});
