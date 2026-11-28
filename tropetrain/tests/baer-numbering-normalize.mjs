import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
export const NUMBERING_CORRECTION=JSON.parse(read('docs/BAER-NUMBERING-CORRECTION.json'));
export const PRIOR_SECOND_SHA='082909dd3e39f0ff45d92e0518b7a9b34909edddcf6574b159b6c08d3e4df9e2';
assert.equal(NUMBERING_CORRECTION.affectedPublishedRecords.find(r=>r.path==='docs/BAER-NO105-SECOND-PATTERNS.json').sha256,PRIOR_SECOND_SHA);
export const CURRENT_SECOND_SHA=createHash('sha256').update(read('docs/BAER-NO105-SECOND-PATTERNS.json')).digest('hex');
assert.notEqual(CURRENT_SECOND_SHA,PRIOR_SECOND_SHA);
// Only these two exact provenance values may change. Musical or other fields
// are compared in full against the original frozen fingerprints/snapshots.
export function originalParentProvenance(value){
 return Array.isArray(value)?value.map(originalParentProvenance):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,['parentSha256','secondSettingSha256'].includes(k)&&v===CURRENT_SECOND_SHA?PRIOR_SECOND_SHA:originalParentProvenance(v)])):value;
}
