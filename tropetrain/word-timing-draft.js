// Personal review annotations. This format cannot certify linguistic or musical evidence.
export function recordingIdentity(record){
  return {id:record.id,bytes:record.audio.bytes,sha1:record.audio.sha1,sha256:record.audio.sha256,
    duration:record.audio.estimatedDurationSeconds};
}
const nullFields=['phonemes','syllableAlignment','musicalNotes','independentReview'];
export function createWordTimingDraft(record,coverage,words){
  if(!coverage||!Array.isArray(words)||!words.length||words.length>1000)throw Error('A source passage with at most 1,000 words is required.');
  return {format:'tropetrain-word-timing-draft-v1',status:'draft',source:recordingIdentity(record),
    coverage:structuredClone(coverage),timingBasis:'personal-unreviewed',sourceEditionCompared:false,
    ...Object.fromEntries(nullFields.map(k=>[k,null])),
    words:words.map(w=>({id:w.sourceWordId??w.id,hebrew:w.sourceHebrew,start:null,end:null}))};
}
export function validateWordTimingDraft(value,expected){
  if(!value||typeof value!=='object'||Array.isArray(value)||value.format!==expected.format||value.status!=='draft'||
    value.timingBasis!=='personal-unreviewed'||value.sourceEditionCompared!==false||
    nullFields.some(k=>value[k]!==null))throw Error('Only unreviewed word-timing drafts are supported.');
  for(const key of ['id','bytes','sha1','sha256','duration'])
    if(value.source?.[key]!==expected.source[key])throw Error('Draft belongs to a different source recording.');
  if(JSON.stringify(value.coverage)!==JSON.stringify(expected.coverage))throw Error('Draft passage differs from this recording.');
  if(!Array.isArray(value.words)||value.words.length!==expected.words.length)throw Error('Draft word count differs from the unchanged reader text.');
  let lastBoundary=0;
  const clean=structuredClone(expected);
  for(let i=0;i<value.words.length;i++){
    const word=value.words[i],original=expected.words[i];
    if(word?.id!==original.id||word.hebrew!==original.hebrew)throw Error('Draft word identity or marked Hebrew differs from the unchanged reader text.');
    for(const key of ['start','end']){
      const n=word[key];
      if(n!==null&&(!Number.isFinite(n)||n<0||n>expected.source.duration))throw Error('Word times must be seconds within the source recording, or blank.');
      if(n!==null&&n<lastBoundary)throw Error('Word boundaries must follow source order without overlaps. Clear an incorrect boundary before replacing it.');
      if(n!==null)lastBoundary=n;
      clean.words[i][key]=n;
    }
    if(word.start!==null&&word.end!==null&&word.end<=word.start)throw Error('A word end must follow its start.');
  }
  return clean;
}
export function setWordBoundary(draft,index,key,value){
  if(!Number.isInteger(index)||index<0||index>=draft.words.length||!['start','end'].includes(key))throw Error('Choose a word boundary.');
  const next=structuredClone(draft);next.words[index][key]=value;
  return validateWordTimingDraft(next,draft);
}
export function parseWordTimingDraft(text,expected){
  if(typeof text!=='string'||text.length>1000000)throw Error('Draft JSON must be smaller than 1 MB.');
  return validateWordTimingDraft(JSON.parse(text),expected);
}
export function draftWordSpan(draft,index){
  const word=draft.words[index];
  if(!word||word.start===null||word.end===null)throw Error('Enter both boundaries before auditioning this draft word.');
  return {start:word.start,end:word.end};
}
