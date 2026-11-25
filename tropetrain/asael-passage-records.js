import {ASAEL_GENESIS_PASSAGES} from './asael-genesis-passage-data.js';

export {ASAEL_GENESIS_PASSAGES};
export function asaelPassageEvidence(recordId){return ASAEL_GENESIS_PASSAGES.records.find(r=>r.recordId===recordId)??null;}
export function asaelPassageLabel(coverage){
  if(!coverage)return null;const a=coverage.start,z=coverage.end;
  return `Genesis ${a.chapter}:${a.verse}–${a.chapter===z.chapter?'':z.chapter+':'}${z.verse}`;
}
export function withAsaelPassageEvidence(record){
  const p=asaelPassageEvidence(record.id);if(!p)return record;
  if(record.sourceCatalogRow!==p.sourceCatalogRow||record.sourceCatalogRevision!==p.sourceCatalogRevision||
    record.sourceFileRevision!==p.sourceFileRevision||record.audio.sha1!==p.sha1||record.audio.bytes!==p.bytes||
    record.audio.file!==p.originalUrl||record.audio.filename!==p.filename||record.pronunciationId!==p.pronunciationId||
    record.deliveryId!==p.deliveryId||record.performer!==p.performer||record.license.id!==p.license.id)
    throw Error('The catalog recording differs from its pinned passage evidence. No reader mapping was applied.');
  const candidate=p.status==='unreviewed-catalog-passage-candidate';
  if((candidate&&!p.readerCoverage)||(!candidate&&p.readerCoverage!==null)||p.correctedCoverage!==null||p.review!==null)
    throw Error('A source passage cannot certify its own correction or review.');
  return {...record,audio:{...record.audio,sha256:p.sha256,estimatedDurationSeconds:p.decodedDurationSeconds,
    durationMethod:'Native decoded duration of the unchanged original; the catalog duration is retained separately in the evidence record.'},
    originalBytesVerifiedLocally:true,coverage:candidate?structuredClone(p.readerCoverage):null,
    coverageStatus:candidate?'Catalog passage candidate. Unchanged reader words follow the catalog’s stated range; recording content, source-edition correspondence and word/syllable timing remain unreviewed.':
      'Passage mapping withheld: the catalog range conflicts with unreviewed acoustic evidence. No corrected range, reader words or timing have been assigned. The unchanged complete recording remains available.',
    catalogPassageEvidence:structuredClone(p)};
}
