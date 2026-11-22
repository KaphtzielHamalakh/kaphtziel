import {PHONETIC_WORDS} from './phonetic-word-summary.js';
import {loadPhoneticWordPacket} from './phonetic-word-data.js';
import {HISTORICAL_CATEGORY_INVENTORY} from './historical-pronunciation-categories.js';
import {WORD_SUPPORT} from './word-support-summary.js';
export {PHONETIC_WORDS};
const styles=['sephardic','ashkenazic'],categories=new Map(HISTORICAL_CATEGORY_INVENTORY.catalog.map(c=>[c.id,c]));
const classes=new Set(['B','D','F','G','GIMEL','H','J','K','L','M','N','P','R','S','SH','T','V','X','Z']);
const empty=(value,keys)=>{for(const key of keys)if(value[key]!==null)throw Error('Phonetic research cannot certify sounds, timing or review.');};
export function phoneticWordsAvailable(record){return !!record&&PHONETIC_WORDS.records.some(r=>r.recordId===record.id&&r.originalSha256===record.audio.sha256);}

export function validatePhoneticWords(value,expected){
 if(value?.format!=='tropetrain-phonetic-word-correspondence-v1'||value.revision!==1||value.status!=='unreviewed-consonant-correspondence')throw Error('Only the unreviewed source consonant study is available.');
 for(const key of ['id','bytes','sha1','sha256','duration'])if(value.source?.[key]!==expected.source[key])throw Error('Phonetic study belongs to a different source recording.');
 if(JSON.stringify(value.coverage)!==JSON.stringify(expected.coverage)||JSON.stringify(value.comparisonStyles)!==JSON.stringify(styles))throw Error('Phonetic source passage or comparison styles changed.');
 for(const key of ['id','revision','weightSha256'])if(value.model?.[key]!==PHONETIC_WORDS.model[key])throw Error('Phonetic model provenance changed.');
 for(const key of ['id','revision','weightSha256'])if(value.orthographicSupportModel?.[key]!==WORD_SUPPORT.model[key])throw Error('Original word-support model provenance changed.');
 if(value.inferenceRecipeSha256!==PHONETIC_WORDS.inferenceRecipeSha256||value.sourcePronunciation?.commit!==HISTORICAL_CATEGORY_INVENTORY.sourceCommit||value.sourcePronunciation.categoryInputSha256!==HISTORICAL_CATEGORY_INVENTORY.inputSha256)throw Error('Pronunciation source or analysis recipe changed.');
 empty(value,['wordTimes','syllableAlignment','phonemes','musicalNotes','independentReview','newSingingVoice']);
 const clock=value.analysisClock,pinned=PHONETIC_WORDS.records.find(r=>r.recordId===expected.source.id)?.analysisClock;
 if(!clock||JSON.stringify(clock)!==JSON.stringify(pinned)||!Number.isInteger(clock.originalDecodedFrames)||!Number.isInteger(clock.originalRate)||clock.analysisRate!==16000||clock.catalogDurationDecimals!==6||clock.originalDecodedDuration!==clock.originalDecodedFrames/clock.originalRate||Number(clock.originalDecodedDuration.toFixed(6))!==expected.source.duration||clock.analysisFrames!==Math.ceil(clock.originalDecodedFrames*clock.analysisRate/clock.originalRate)||clock.analysisDuration!==clock.analysisFrames/clock.analysisRate)throw Error('The original decoded, catalog and exact resampling clocks must stay separate.');
 const wordTexts=new Map(expected.words.map(w=>[w.id,w.hebrew]));let end=0;
 if(!Array.isArray(value.modelWindows)||!value.modelWindows.length)throw Error('Missing original model windows.');
 for(const [i,w] of value.modelWindows.entries()){
  const core=w?.sourceClock?.coreSeconds,input=w?.sourceClock?.inputSeconds;
  if(w.index!==i||typeof w.rawModelOutput!=='string'||!Array.isArray(core)||!Array.isArray(input)||[...core,...input].some(n=>!Number.isFinite(n))||core.length!==2||input.length!==2||core[0]!==end||core[1]<=core[0]||input[0]<0||input[0]>core[0]||input[1]<core[1]||input[1]>clock.analysisDuration||input[1]-input[0]>30||w.sourceClock.sourceOffsetSeconds!==input[0]||w.sourceClock.codecOffsetGuessed!==false)throw Error('Unknown or noncontiguous phonetic model clock.');
  end=core[1];
 }
 if(end!==clock.analysisDuration)throw Error('Phonetic study does not retain the complete analysis timeline.');
 for(const style of styles){
  const study=value.studies?.[style];if(!Array.isArray(study?.words)||study.words.length!==expected.words.length)throw Error('Phonetic words differ from the unchanged reader passage.');
  for(const [i,word] of study.words.entries()){
   if(word.id!==expected.words[i].id||word.hebrew!==expected.words[i].hebrew)throw Error('Phonetic word identity or marked Hebrew changed.');
   empty(word,['approvedWordBoundary','phonemes','syllableTimes','audioTimes','review']);
   if(!Array.isArray(word.sourceEvents)||!Array.isArray(word.candidateConsonants))throw Error('Missing source consonant evidence.');
   const events=new Map();
   for(const e of word.sourceEvents){
    const category=categories.get(e.categoryId);
    if(!category||category.label!==e.categoryLabel||e.wordId!==word.id||e.hebrew!==word.hebrew||typeof e.eventId!=='string'||events.has(e.eventId)||!Array.isArray(e.classes)||!e.classes.length||e.classes.some(c=>!classes.has(c))||!Array.isArray(e.sourceUnitIds)||![1,2].includes(e.sourceUnitIds.length)||e.sourceSegmentIds?.length!==e.sourceUnitIds.length||e.sourceClusters?.length!==e.sourceUnitIds.length||e.eventId!==e.sourceSegmentIds.join('+'))throw Error('Source category, word or shared consonant changed.');
    empty(e,['quantity','phonemes','audioTimes','review']);
    if(e.sourceUnitIds.length===2&&new Set(e.sourceClusters.map(c=>c.part)).size!==2)throw Error('Shared consonant halves must stay separate.');
    for(const b of e.sourceClusters){
     if(!e.sourceSegmentIds.includes(b.sourceSegmentId)||b.categoryId!==e.categoryId)throw Error('Source consonant cluster identity changed.');
     empty(b,['phonemes','individualVowelPointRange','audioTimes']);
     if(b.readerClusterRanges!==null){
      if(!Array.isArray(b.readerClusterRanges))throw Error('Invalid marked source cluster range.');
      for(const r of b.readerClusterRanges){const text=wordTexts.get(r.readerWordId);if(typeof text!=='string'||!Number.isInteger(r.start)||!Number.isInteger(r.end)||r.start<0||r.end<=r.start||text.slice(r.start,r.end)!==r.text)throw Error('Marked Hebrew consonant range changed.');}
     }
    }
    events.set(e.eventId,e);
   }
   for(const c of word.candidateConsonants){
    const window=value.modelWindows[c.modelWindow],range=c.modelCharacterRange,bin=c.modelLocationBins,ids=c.sourceEventCandidates;
    if(!window||c.modelCoordinateUnit!=='UTF-16'||!Array.isArray(range)||range.length!==2||range.some(x=>!Number.isInteger(x))||range[0]<0||range[1]<=range[0]||window.rawModelOutput.slice(...range)!==c.modelGlyph||[...c.modelGlyph].length!==1)throw Error('Model character identity or Unicode range changed.');
    if(!Array.isArray(bin)||bin.length!==2||bin.some(x=>!Number.isFinite(x))||bin[0]<0||bin[1]<=bin[0]||bin[1]>expected.source.duration||!Number.isInteger(c.modelClassPart)||c.modelClassPart<0||!classes.has(c.analysisClass))throw Error('Invalid model consonant comparison or clock.');
    if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!events.has(id))||c.letterBindingUnique!==(ids.length===1)||c.allOptimalPathsSameWord!==true||c.withinOriginalWordAuditionContext!==true)throw Error('Ambiguous or different-word consonant link cannot be assigned.');
    if(ids.length===1&&(!Number.isInteger(c.sourceClassPart)||events.get(ids[0]).classes[c.sourceClassPart]!==c.analysisClass)||ids.length>1&&c.sourceClassPart!==null)throw Error('Source consonant comparison atom changed.');
    empty(c,['phonemes','audioTimes','review']);
   }
  }
 }
 return structuredClone(value);
}

export async function loadPhoneticWords(record,expected,{readPacket=loadPhoneticWordPacket}={}){
 const entry=PHONETIC_WORDS.records.find(r=>r.recordId===record.id&&r.originalSha256===record.audio.sha256);if(!entry)throw Error('No phonetic word study exists for this original.');
 const bytes=await readPacket(entry.file),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(bytes.length!==entry.bytes||hash!==entry.sha256)throw Error('Phonetic word-study checksum differs from its source record.');
 const raw=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();return validatePhoneticWords(JSON.parse(raw),expected);
}

export function phoneticWordView(packet,index,style){
 if(!styles.includes(style)||!Number.isInteger(index)||index<0||!packet.studies[style].words[index])throw Error('Choose an unchanged source word and an existing MAM text style.');
 const word=packet.studies[style].words[index],contexts=[];
 for(const window of packet.modelWindows){
  const candidates=word.candidateConsonants.filter(c=>c.modelWindow===window.index);if(!candidates.length)continue;
  const start=Math.min(...candidates.map(c=>c.modelCharacterRange[0])),end=Math.max(...candidates.map(c=>c.modelCharacterRange[1])),text=window.rawModelOutput;
  const a=text.lastIndexOf(' ',start-1)+1,next=text.indexOf(' ',end),b=next<0?text.length:next;
  contexts.push({window:window.index,text:text.slice(a,b),textRange:[a,b],highlights:[...new Map(candidates.map(c=>[c.modelCharacterRange.join(':'),{start:c.modelCharacterRange[0]-a,end:c.modelCharacterRange[1]-a}])).values()].sort((x,y)=>x.start-y.start)});
 }
 return {word,style,contexts,review:null,phonemes:null,audioTimes:null};
}
