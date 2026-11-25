import test from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{createHash}from'node:crypto';
import{gunzipSync}from'node:zlib';
import{ASAEL_SOURCE_CATALOG as rawCatalog}from'../asael-source-catalog-data.js';
import{ASAEL_GENESIS_PASSAGES as report,asaelPassageEvidence,withAsaelPassageEvidence}from'../asael-passage-records.js';
import{ASAEL_GENESIS_WORD_SUPPORT as supportCatalog}from'../asael-genesis-word-support-summary.js';
import{VOICE_STUDIES,VOICE_SOURCE_RECORDINGS,voiceCoverage,voiceRecording,voiceStudy}from'../voice-studies.js';
import{getCorpus}from'../library.js';
import{createWordTimingDraft,setWordBoundary,parseWordTimingDraft}from'../word-timing-draft.js';
import{WORD_SUPPORT,wordSupportAvailable,loadWordSupport,validateWordSupport,wordSupportContext}from'../word-support.js';
const read=n=>readFileSync(new URL('../'+n,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex'),corpus=await getCorpus();
const candidates=report.records.filter(r=>r.readerCoverage),derived=id=>VOICE_SOURCE_RECORDINGS.find(r=>r.id===id);
const sourceWords=r=>corpus.passage([{...voiceCoverage(r),id:'test-source'}]).verses.flatMap(v=>v.words);

test('new evidence retains exact original catalog and all source nulls while exposing only two unreviewed passage candidates',()=>{
 assert.deepEqual(report,JSON.parse(read('docs/ASAEL-GENESIS-PASSAGES.json')));
 assert.equal(sha(read(report.sourcePack.file)),report.sourcePack.sha256);assert.equal(report.sourcePack.bytes,read(report.sourcePack.file).length);
 assert.deepEqual(report.counts,{additionalOriginalsVerified:10,originalBytesVerified:18651128,readerCandidateRecordings:4,readerCandidatePassages:2,readerCandidateWordOccurrences:866,withheldDiscrepantRecordings:6,newBundledAudio:0,newApprovedWordTimes:0,newReviewedPronunciationGrammars:0,newSingingVoices:0});
 assert.equal(sha(read('docs/ASAEL-SOURCE-CATALOG.json')),report.inputs.find(p=>p.path.endsWith('ASAEL-SOURCE-CATALOG.json')).sha256);
 assert.equal(VOICE_STUDIES.recordings.length,72);assert.equal(VOICE_SOURCE_RECORDINGS.length,917);assert(rawCatalog.recordings.every(r=>r.coverage===null&&r.originalBytesVerifiedLocally===false));
 for(const k of ['acceptedSourceEditionComparison','acceptedWordTimes','phonemes','musicalReview','newVoice','kinnorEquivalence'])assert.equal(report[k],null);
});

test('candidate recordings preserve documented independent labels and exact marked source words with separate blank drafts',()=>{
 for(const p of candidates){
  const r=derived(p.recordId),raw=rawCatalog.recordings.find(r=>r.id===p.recordId),words=sourceWords(r),draft=createWordTimingDraft(r,voiceCoverage(r),words);
  assert.deepEqual(r.coverage,p.readerCoverage);assert.equal(r.sourcePronunciationLabel,raw.sourcePronunciationLabel);assert.equal(r.sourceMelodyLabel,raw.sourceMelodyLabel);assert.equal(r.performer,raw.performer);assert.equal(r.audio.sha1,raw.audio.sha1);assert.equal(r.audio.file,raw.audio.file);assert.equal(r.audio.sha256,p.sha256);assert.equal(r.audio.estimatedDurationSeconds,p.decodedDurationSeconds);assert.match(r.coverageStatus,/Catalog passage candidate/);
  assert.equal(words.length,p.readerWords);assert.equal(words.length,p.catalogPassageNote==='ב,ד-יט'?217:216);assert(words.every((w,i)=>w.sourceHebrew===draft.words[i].hebrew&&(w.sourceWordId??w.id)===draft.words[i].id));assert(draft.words.every(w=>w.start===null&&w.end===null));assert.equal(draft.sourceEditionCompared,false);assert.equal(draft.phonemes,null);assert.equal(draft.independentReview,null);
  const pair=candidates.find(q=>q.studyId===p.studyId&&q.recordId!==p.recordId),other=derived(pair.recordId),otherDraft=createWordTimingDraft(other,voiceCoverage(other),sourceWords(other));assert.deepEqual(draft.words,otherDraft.words);assert.notEqual(r.audio.sha256,other.audio.sha256);assert.notEqual(r.audio.estimatedDurationSeconds,other.audio.estimatedDurationSeconds);
  const edit=setWordBoundary(setWordBoundary(draft,0,'start',.1),0,'end',.8);assert.throws(()=>parseWordTimingDraft(JSON.stringify(edit),otherDraft),/different source recording/);assert.equal(otherDraft.words[0].start,null);
 }
 const fifth=report.records.find(r=>r.catalogPassageNote==='ה,יט-כו');assert.equal(fifth.readerCoverage,null);assert.equal(fifth.correctedCoverage,null);
});

test('all six discrepant recordings and the earlier disputed sixth range keep reader mapping and support withheld',async()=>{
 for(const p of report.records.filter(r=>!r.readerCoverage)){
  const r=derived(p.recordId);assert.equal(voiceCoverage(r),null);assert.match(r.coverageStatus,/withheld/);assert.equal(r.catalogPassageEvidence.correctedCoverage,null);assert.equal(wordSupportAvailable(r),false);assert.match(p.discrepancy,/unreviewed recognizer/);assert.equal(r.audio.sha256,p.sha256);
  assert.throws(()=>createWordTimingDraft(r,voiceCoverage(r),[{id:'gen-1-1-1',sourceHebrew:'בְּרֵאשִׁ֖ית'}]),/source passage/);
  await assert.rejects(loadWordSupport(r,{source:{}}),/No automatic/);
 }
 for(const p of report.previouslyUnresolvedRows){assert.equal(voiceCoverage(derived(p.recordId)),null);assert.equal(p.readerCoverage,null);assert.equal(p.correctedCoverage,null);}
 const covered=new Set(candidates.map(p=>p.recordId));assert(rawCatalog.recordings.filter(r=>!covered.has(r.id)).every(r=>voiceCoverage(derived(r.id))===null));
});

test('source-specific runtime mapping refuses altered media identity, revision, labels, license and performer',()=>{
 const p=candidates[0],raw=rawCatalog.recordings.find(r=>r.id===p.recordId),before=JSON.stringify(raw);
 for(const change of [r=>r.audio.sha1='0'.repeat(40),r=>r.audio.bytes++,r=>r.audio.file+='?other',r=>r.audio.filename+='x',r=>r.sourceFileRevision++,r=>r.sourceCatalogRevision++,r=>r.sourceCatalogRow+='x',r=>r.pronunciationId='other',r=>r.deliveryId='other',r=>r.performer='other',r=>r.license.id='other']){
  const bad=structuredClone(raw);change(bad);assert.throws(()=>withAsaelPassageEvidence(bad),/differs from its pinned/);
 }
 withAsaelPassageEvidence(raw);assert.equal(JSON.stringify(raw),before);const old=VOICE_STUDIES.recordings[0];assert.equal(withAsaelPassageEvidence(old),old);
});

test('all866optional support entries bind exact marked words and their original clocks without approving boundaries',async()=>{
 let total=0;assert.equal(WORD_SUPPORT.records.length,2);assert.equal(supportCatalog.records.length,4);
 for(const p of supportCatalog.records){
  const r=derived(p.recordId),draft=createWordTimingDraft(r,voiceCoverage(r),sourceWords(r)),bytes=read(p.file);assert.equal(bytes.length,p.bytes);assert.equal(sha(bytes),p.sha256);assert(wordSupportAvailable(r));
  const value=await loadWordSupport(r,draft,{readPacket:async file=>read(file)});assert.equal(value.words.length,p.words);total+=p.words;assert.equal(value.sourceEditionCompared,false);assert.equal(value.sourcePassageStatus,'catalog-candidate-not-content-reviewed');assert.deepEqual(value.words.map(w=>({id:w.id,hebrew:w.hebrew})),draft.words.map(w=>({id:w.id,hebrew:w.hebrew})));assert(value.words.every(w=>w.approvedBoundary===null&&w.review===null));assert(draft.words.every(w=>w.start===null&&w.end===null));
  const context=wordSupportContext(value,0);assert(context.start>=0&&context.end<=r.audio.estimatedDurationSeconds);assert.equal(context.start,Math.max(0,value.words[0].modelSupport.start-1));
  const bad=structuredClone(value);bad.sourceEditionCompared=true;assert.throws(()=>validateWordSupport(bad,draft),/cannot certify/);const altered=structuredClone(value);altered.words[0].hebrew=altered.words[0].hebrew.replace(/[\u0591-\u05af]/u,'');assert.throws(()=>validateWordSupport(altered,draft),/marked Hebrew differs/);
  const corrupt=Uint8Array.from(bytes);corrupt[corrupt.length-1]^=1;await assert.rejects(loadWordSupport(r,draft,{readPacket:async()=>corrupt}),/checksum/);
 }
 assert.equal(total,866);
});

test('switching an explicit source pronunciation cannot create a synthetic delivery or transfer a word interval',()=>{
 for(const studyId of new Set(candidates.map(r=>r.studyId))){
  const s=voiceStudy(studyId);assert.equal(s.pronunciations.length,2);assert.equal(s.deliveries.length,1);const a=voiceRecording(studyId,'ashkenazic-as-recorded','ashkenazic-melody'),b=voiceRecording(studyId,'israeli-as-recorded','ashkenazic-melody');assert.notEqual(a.id,b.id);assert.deepEqual(voiceCoverage(a),voiceCoverage(b));assert.throws(()=>voiceRecording(studyId,'galician','ashkenazic-melody'),/does not provide/);assert.throws(()=>voiceRecording(studyId,'israeli-as-recorded','spoken'),/does not provide/);
  const expected=createWordTimingDraft(b,voiceCoverage(b),sourceWords(b)),v=JSON.parse(gunzipSync(read(supportCatalog.records.find(r=>r.recordId===a.id).file)));assert.throws(()=>validateWordSupport(v,expected),/different source recording/);
 }
});
