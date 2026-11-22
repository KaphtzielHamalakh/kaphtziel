import {WORD_SUPPORT} from './word-support-summary.js';
import {loadWordSupportPacket} from './word-support-data.js';
export {WORD_SUPPORT};

export function wordSupportAvailable(record){return WORD_SUPPORT.records.some(r=>r.recordId===record.id&&r.originalSha256===record.audio.sha256);}

export function validateWordSupport(value,expected){
  if(value?.format!=='tropetrain-word-support-v1'||value.status!=='unreviewed-model-support')throw Error('Only unreviewed model support is available.');
  for(const key of ['id','bytes','sha1','sha256','duration'])if(value.source?.[key]!==expected.source[key])throw Error('Model support belongs to a different source recording.');
  if(JSON.stringify(value.coverage)!==JSON.stringify(expected.coverage)||!Array.isArray(value.words)||value.words.length!==expected.words.length)throw Error('Model support passage differs from the unchanged reader text.');
  for(const key of ['timedWords','syllableAlignment','phonemes','musicalNotes','independentReview'])if(value[key]!==null)throw Error('Model support cannot certify timing, phonemes or review.');
  if(value.model?.id!==WORD_SUPPORT.model.id||value.model.revision!==WORD_SUPPORT.model.revision||value.model.weightSha256!==WORD_SUPPORT.model.weightSha256)throw Error('Unknown acoustic model provenance.');
  if(value.clock?.analysisRate!==16000||value.clock.strideSamples!==320||value.clock.convolutionSupportSamples!==400)throw Error('Unknown model frame clock.');
  let previousEnd=0;
  for(let i=0;i<value.words.length;i++){
    const word=value.words[i],source=expected.words[i],span=word?.modelSupport,e=word?.evidence;
    if(word?.id!==source.id||word.hebrew!==source.hebrew)throw Error('Model support word identity or marked Hebrew differs.');
    if(word.approvedBoundary!==null||word.review!==null)throw Error('Model support is unreviewed.');
    if(!Number.isFinite(span?.start)||!Number.isFinite(span.end)||span.start<previousEnd||span.start<0||span.end<=span.start||span.end>expected.source.duration)throw Error('Model support must follow source order inside its original clock.');
    if(!Number.isInteger(e?.targetLetters)||e.targetLetters<1||!Number.isInteger(e.lettersWithArgmaxSupport)||e.lettersWithArgmaxSupport<0||e.lettersWithArgmaxSupport>e.targetLetters)throw Error('Invalid model letter-support evidence.');
    for(const key of ['meanLetterPosterior','weakestLetterMaxPosterior'])if(!Number.isFinite(e[key])||e[key]<0||e[key]>1)throw Error('Invalid model probability evidence.');
    previousEnd=span.end;
  }
  return structuredClone(value);
}

export async function loadWordSupport(record,expected,{readPacket=loadWordSupportPacket}={}){
  const entry=WORD_SUPPORT.records.find(r=>r.recordId===record.id&&r.originalSha256===record.audio.sha256);
  if(!entry)throw Error('No automatic word-support study exists for this original.');
  const bytes=await readPacket(entry.file),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(bytes.length!==entry.bytes||hash!==entry.sha256)throw Error('Word-support packet checksum differs from its source record.');
  const decoded=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  return validateWordSupport(JSON.parse(decoded),expected);
}

export function wordSupportContext(proposal,index,seconds=1){
  const word=proposal?.words?.[index];if(!word||seconds!==1||!Number.isFinite(proposal.source?.duration)||proposal.source.duration<=0)throw Error('Choose a model-support word with one second of context.');
  return {start:Math.max(0,word.modelSupport.start-seconds),end:Math.min(proposal.source.duration,word.modelSupport.end+seconds)};
}
