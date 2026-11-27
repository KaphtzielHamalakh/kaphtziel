import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {getCorpus} from '../library.js';
import {GENESIS_COMPANION_PASSAGES as report,withGenesisCompanionPassageEvidence,genesisCompanionPassageAvailable} from '../genesis-companion-passages.js';
import {ASAEL_SOURCE_CATALOG as catalog} from '../asael-source-catalog-data.js';
import {withAsaelPassageEvidence} from '../asael-passage-records.js';
import {VOICE_SOURCE_RECORDINGS,voiceCoverage,voiceCombinations} from '../voice-studies.js';
import {createWordTimingDraft,setWordBoundary,parseWordTimingDraft} from '../word-timing-draft.js';
import {wordSupportAvailable,loadWordSupport} from '../word-support.js';
import {observedWordCuesAvailable} from '../observed-word-cues.js';
import {createWordRecordingNavigator} from '../word-recording-navigation.js';
const read=n=>readFileSync(new URL('../'+n,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex'),corpus=await getCorpus(),navigator=createWordRecordingNavigator(corpus);
const record=id=>VOICE_SOURCE_RECORDINGS.find(r=>r.id===id),words=r=>corpus.passage([{id:'companion-test',...voiceCoverage(r)}]).verses.flatMap(v=>v.words);

test('the new report and all generated bindings reproduce from the complete pinned evidence pack',()=>{
 assert.deepEqual(report,JSON.parse(read('docs/GENESIS-COMPANION-PASSAGES.json')));assert.equal(read(report.sourcePack.file).length,report.sourcePack.bytes);assert.equal(sha(read(report.sourcePack.file)),report.sourcePack.sha256);assert.equal(report.sourcePack.logicalFiles,43);
 execFileSync('python3',[new URL('../scripts/import-genesis-companion-passages.py',import.meta.url).pathname,'--check']);
 assert.deepEqual(report.counts,{recordings:2,readerCandidateWords:657,oldObservationsReused:6,candidateGatePasses:2,otherCandidatePasses:0,audioDecoderRuns:0,newApprovedWordTimes:0,newReviewedMelodyGrammars:0,newSingingVoices:0});
 assert.equal(report.withheldRecords.length,4);assert(report.withheldRecords.every(r=>!r.admission.passesPredeclaredReviewCandidateGate&&r.acceptedWordTimes===null));
});

test('all657new reader words match the independently packaged marked bindings and start with blank personal times',()=>{
 let total=0;
 for(const p of report.records){
  const r=record(p.recordId),raw=catalog.recordings.find(r=>r.id===p.recordId),source=words(r),draft=createWordTimingDraft(r,voiceCoverage(r),source),binding=JSON.parse(gunzipSync(read(p.readerBindingsPacket.file)));
  assert(genesisCompanionPassageAvailable(r));assert.equal(r.coverage,null);assert.equal(raw.coverage,null);assert.equal(raw.originalBytesVerifiedLocally,false);assert.equal(r.audio.sha256,p.sha256);assert.equal(r.audio.sha1,raw.audio.sha1);assert.equal(r.audio.file,raw.audio.file);assert.equal(r.audio.estimatedDurationSeconds,p.decodedDurationSeconds);
  assert.deepEqual(source.map(w=>({id:w.sourceWordId??w.id,hebrew:w.sourceHebrew})),binding.words);assert.equal(source.length,p.candidateWords);assert.equal(source[0].id,p.firstWordId);assert.equal(source.at(-1).id,p.lastWordId);assert(draft.words.every(w=>w.start===null&&w.end===null));assert.equal(draft.sourceEditionCompared,false);assert.equal(draft.phonemes,null);assert.equal(draft.musicalNotes,null);assert.equal(draft.independentReview,null);
  assert.equal(r.catalogPassageEvidence.readerCoverage,null);assert.equal(r.catalogPassageEvidence.correctedCoverage,null);assert.equal(r.catalogPassageEvidence.catalogPassageNote,p.originalCatalogPassageNote);assert.deepEqual(r.catalogPassageEvidence.catalogProposedRange,p.originalCatalogProposedRange);assert.notDeepEqual(p.candidateCoverage,p.originalCatalogProposedRange);assert.match(r.linkedSourcePassageEvidence.wordTimingNotice,/catalog states a different range/);
  for(const w of source){const match=navigator.forWord(w);assert(match.available);assert.deepEqual(match.recordings,[r.id]);assert.equal(match.review,null);assert.equal(match.word.hebrew,w.sourceHebrew);}
  total+=source.length;
 }assert.equal(total,657);assert.deepEqual(navigator.counts,{words:2172,recordings:15,passageRanges:7});
});

test('neither the old wrong-range forced path nor a new automatic cue becomes available',async()=>{
 for(const p of report.records){const r=record(p.recordId);assert.equal(wordSupportAvailable(r),false);assert.equal(observedWordCuesAvailable(r),false);await assert.rejects(loadWordSupport(r,{source:{}}),/No automatic/);for(const k of ['actualRecordingCoverage','acceptedWordTimes','phonemes','musicalReview','phonologicalReview','review','newVoice'])assert.equal(p[k],null);}
});

test('each candidate refuses changed original identity, source labels, previous evidence or existing coverage',()=>{
 for(const p of report.records){const raw=catalog.recordings.find(r=>r.id===p.recordId),base=withAsaelPassageEvidence(raw),before=JSON.stringify(base);
  for(const change of [r=>r.studyId='other',r=>r.sourceCatalogRevision++,r=>r.sourceFileRevision++,r=>r.sourceCatalogRow+='x',r=>r.audio.bytes++,r=>r.audio.sha1='0'.repeat(40),r=>r.audio.sha256='0'.repeat(64),r=>r.audio.file+='?other',r=>r.audio.filename+='x',r=>r.audio.estimatedDurationSeconds++,r=>r.performer='other',r=>r.pronunciationId='other',r=>r.deliveryId='other',r=>r.sourcePronunciationLabel='other',r=>r.sourceMelodyLabel='other',r=>r.license.url+='other',r=>r.catalogPassageEvidence.correctedCoverage={},r=>r.catalogPassageEvidence.catalogPassageNote='other',r=>r.coverage={}]){const bad=structuredClone(base);change(bad);assert.throws(()=>withGenesisCompanionPassageEvidence(bad),/No passage candidate/);}
  withGenesisCompanionPassageEvidence(base);assert.equal(JSON.stringify(base),before);
 }
});

test('the actual Ashkenazic-labelled performances remain unmapped and no independent voice pair is invented',()=>{
 for(const p of report.records){const provided=voiceCombinations(p.studyId);assert.equal(provided.length,2);const other=record(provided.find(r=>r.id!==p.recordId).id);assert.equal(other.pronunciationId,'ashkenazic-as-recorded');assert.equal(genesisCompanionPassageAvailable(other),false);assert.equal(voiceCoverage(other),null);assert.equal(wordSupportAvailable(other),false);assert.match(other.coverageStatus,/withheld/);assert.equal(other.audio.sha256,other.catalogPassageEvidence.sha256);}
 for(const p of report.withheldRecords){assert.equal(voiceCoverage(record(p.recordId)),null);assert.equal(genesisCompanionPassageAvailable(record(p.recordId)),false);}
});

test('a personal draft cannot transfer its boundaries to another recording or passage',()=>{
 const [a,b]=report.records.map(p=>record(p.recordId)),one=createWordTimingDraft(a,voiceCoverage(a),words(a)),two=createWordTimingDraft(b,voiceCoverage(b),words(b)),edit=setWordBoundary(setWordBoundary(one,0,'start',.1),0,'end',.8);assert.throws(()=>parseWordTimingDraft(JSON.stringify(edit),two),/different source recording/);const wrong=structuredClone(edit);wrong.coverage=report.records[0].originalCatalogProposedRange;assert.throws(()=>parseWordTimingDraft(JSON.stringify(wrong),one),/passage differs/);assert(one.words.every(w=>w.start===null&&w.end===null));assert(two.words.every(w=>w.start===null&&w.end===null));
});
