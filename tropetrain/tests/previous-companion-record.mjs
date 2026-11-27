import assert from 'node:assert/strict';
import {ASAEL_SOURCE_CATALOG} from '../asael-source-catalog-data.js';
import {withAsaelPassageEvidence} from '../asael-passage-records.js';
// The accepted registry fingerprints remain unchanged. Remove only the three
// documented annotation fields on the two newly qualified source candidates.
const ids=new Set(['asael-catalog-2460-26','asael-catalog-2460-33']);
export function previousCompanionRecord(record){
 if(!ids.has(record.id))return record;
 assert.equal(record.linkedSourcePassageEvidence?.owner,'tropetrain-genesis-companion-candidates-v1');
 assert.equal(record.linkedSourcePassageEvidence.acceptedWordTimes,null);
 assert.equal(record.linkedSourcePassageEvidence.review,null);
 const accepted=withAsaelPassageEvidence(ASAEL_SOURCE_CATALOG.recordings.find(r=>r.id===record.id));
 const {linkedSourcePassageEvidence,coverageLabel,...prior}=record;
 return {...prior,coverageStatus:accepted.coverageStatus};
}
