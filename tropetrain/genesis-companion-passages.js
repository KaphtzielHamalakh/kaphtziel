import {GENESIS_COMPANION_PASSAGES} from './genesis-companion-passage-data.js';
export {GENESIS_COMPANION_PASSAGES};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const label=c=>`Genesis ${c.start.chapter}:${c.start.verse}–${c.end.chapter}:${c.end.verse}`;
export function withGenesisCompanionPassageEvidence(record){
 const p=GENESIS_COMPANION_PASSAGES.records.find(r=>r.recordId===record.id);if(!p)return record;
 const old=record.catalogPassageEvidence;
 if(!old||old.status!=='withheld-catalog-acoustic-discrepancy'||old.readerCoverage!==null||old.correctedCoverage!==null||old.review!==null||record.coverage!==null||record.studyId!==p.studyId||
  record.sourceCatalogRow!==p.sourceCatalogRow||record.sourceCatalogRevision!==p.sourceCatalogRevision||record.sourceFileRevision!==p.sourceFileRevision||
  record.audio.file!==p.originalUrl||record.audio.filename!==p.filename||record.audio.bytes!==p.bytes||record.audio.sha1!==p.sha1||record.audio.sha256!==p.sha256||record.audio.estimatedDurationSeconds!==p.decodedDurationSeconds||
  record.performer!==p.performer||record.pronunciationId!==p.pronunciationId||record.deliveryId!==p.deliveryId||record.sourcePronunciationLabel!==old.sourcePronunciationLabel||record.sourceMelodyLabel!==old.sourceMelodyLabel||!same(record.license,p.license)||old.catalogPassageNote!==p.originalCatalogPassageNote||
  !same(old.catalogProposedRange,p.originalCatalogProposedRange))throw Error('The original differs from its pinned companion evidence. No passage candidate was applied.');
 const gate=p.contentGate;
 if(!gate.passesPredeclaredReviewCandidateGate||gate.insideCandidate<3||gate.distinctCandidateVerses<3||gate.fractionInside<.9||!gate.firstHalf||!gate.lastHalf||
  p.actualRecordingCoverage!==null||p.sourceEditionCompared!==false||p.acceptedWordTimes!==null||p.review!==null||p.phonemes!==null||p.musicalReview!==null||p.phonologicalReview!==null||p.newVoice!==null)
  throw Error('Companion text cannot certify recording endpoints, phonology, music or word times.');
 const name=label(p.candidateCoverage);
 return {...record,linkedSourcePassageEvidence:{owner:GENESIS_COMPANION_PASSAGES.format,recordId:p.recordId,candidateCoverage:structuredClone(p.candidateCoverage),sourcePack:structuredClone(GENESIS_COMPANION_PASSAGES.sourcePack),originalSha256:p.sha256,
  actualRecordingBoundsConfirmed:false,sourceEditionCompared:false,acceptedWordTimes:null,review:null,
  textOpenLabel:`Open ${name} text candidate · unreviewed`,
  wordTimingNotice:`Companion text candidate: ${name}. The recording catalog states a different range; its original note is retained above. Old source-only recognition supports this companion passage, but exact performed endpoints and text-edition correspondence remain unreviewed. No automatic word times or listening cues are supplied. Enter heard boundaries only as personal drafts.`},
  coverageLabel:`${name} · companion text candidate · unreviewed`,
  coverageStatus:'Companion text candidate. The catalog caption and its discrepancy are retained separately. Source-only text evidence supports a passage for listening review; performed endpoints, edition correspondence, melody and pronunciation remain unreviewed. No word times are assigned.'};
}
export function genesisCompanionPassageAvailable(record){
 const p=GENESIS_COMPANION_PASSAGES.records.find(r=>r.recordId===record?.id),e=record?.linkedSourcePassageEvidence;
 return !!p&&e?.owner===GENESIS_COMPANION_PASSAGES.format&&e.recordId===record.id&&record.audio?.sha256===p.sha256&&e.originalSha256===p.sha256&&same(e.candidateCoverage,p.candidateCoverage)&&e.acceptedWordTimes===null&&e.review===null;
}
