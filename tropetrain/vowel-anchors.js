import {VOWEL_ANCHORS} from './vowel-anchor-summary.js';
import {loadVowelAnchorPacket} from './vowel-anchor-data.js';
import {validatePhoneticWords,PHONETIC_WORDS} from './phonetic-word.js';
import {HISTORICAL_CATEGORY_INVENTORY} from './historical-pronunciation-categories.js';
export {VOWEL_ANCHORS};
const styles=['sephardic','ashkenazic'],categories=new Map(HISTORICAL_CATEGORY_INVENTORY.catalog.map(c=>[c.id,c]));
const vowels=new Set([...'aeiouyɑɐɒæɔəɚɛɜɝɞɘɤɨɪɵœøɶʉɯʊʌʏ']);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const empty=(value,keys)=>{for(const key of keys)if(value[key]!==null)throw Error('Vowel observations cannot approve sounds, quantity, timing or review.');};
const anchorKey=a=>[a.modelWindow,...a.modelCharacterRange,a.modelClassPart].join(':');
export function vowelAnchorsAvailable(record){return !!record&&VOWEL_ANCHORS.records.some(r=>r.recordId===record.id&&r.originalSha256===record.audio.sha256);}

export function validateVowelAnchors(value,draft,consonants){
 const prior=validatePhoneticWords(consonants,draft),entry=VOWEL_ANCHORS.records.find(r=>r.recordId===draft.source.id);
 if(!entry||value?.format!=='tropetrain-vowel-anchor-observations-v1'||value.revision!==1||value.status!=='unreviewed-structural-vowel-observations')throw Error('Only the checked structural vowel observations are available.');
 if(!same(value.source,draft.source)||!same(value.coverage,draft.coverage)||!same(value.comparisonStyles,styles))throw Error('Vowel observations belong to a different original or marked passage.');
 if(!same(value.model,prior.model)||!same(value.analysisClock,prior.analysisClock)||value.inferenceRecipeSha256!==prior.inferenceRecipeSha256||value.sourceCommit!==prior.sourcePronunciation.commit||value.categoryInputSha256!==prior.sourcePronunciation.categoryInputSha256||value.priorConsonantProposalSha256!==entry.priorConsonantProposalSha256||value.baseSourcePackSha256!==PHONETIC_WORDS.sourcePack.sha256||value.orthographicSupportSourcePackSha256!==VOWEL_ANCHORS.dependencies[1].sha256)throw Error('Vowel source, consonant provenance or original model clock changed.');
 empty(value,['wordTimes','syllableAlignment','phonemes','musicalNotes','independentReview','newSingingVoice']);
 for(const style of styles){
  const study=value.studies?.[style],old=prior.studies[style];
  if(!Array.isArray(study?.words)||study.words.length!==draft.words.length)throw Error('Vowel words differ from the unchanged reader passage.');
  const events=new Map(),atomOrder=new Map(),anchors=new Map();let atom=0;
  for(const word of old.words){
   for(const e of word.sourceEvents){events.set(e.eventId,e);for(let part=0;part<e.classes.length;part++)atomOrder.set(e.eventId+':'+part,atom++);}
   for(const c of word.candidateConsonants)if(c.letterBindingUnique&&c.sourceClassPart!==null)anchors.set(anchorKey(c),{...c,sourceWordId:word.id});
  }
  const inventory=VOWEL_ANCHORS.sourceUnitInventory,compoundUnits=inventory.unsplitCompounds[style];
  if(inventory.sourceUnits[style]!==1120||inventory.unitsWithSeparateVowelCategory[style]!==1106||compoundUnits.length!==14)throw Error('Complete source syllable inventory changed.');
  for(const v of compoundUnits){
   const e=events.get(v.sourceSegmentId),word=draft.words.find(w=>w.id===v.wordId),category=categories.get(v.categoryId);
   if(!e||!word||!category||!v.categoryId.startsWith('FPP_PATAX_')||v.categoryKind!==category.kind||category.kind!=='vowel-consonant-pair'||e.categoryId!==v.categoryId||e.categoryLabel!==v.categoryLabel||e.wordId!==v.wordId||e.sourceUnitIds.length!==1||e.sourceUnitIds[0]!==v.sourceUnitId||typeof v.sourceStress!=='boolean'||!Number.isInteger(v.sourcePosition)||!Array.isArray(v.parentSyllableReaderRanges))throw Error('Compound source unit cannot be dropped, split or moved to another word.');
   for(const r of v.parentSyllableReaderRanges)if(r.readerWordId!==word.id||word.hebrew.slice(r.start,r.end)!==r.text)throw Error('Compound marked Hebrew range changed.');
   if(v.sourceMarkedTextEqualsWrittenRanges!==(v.parentSyllableReaderRanges.filter(r=>r.role==='written').map(r=>r.text).join('')===v.sourceHebrew.text))throw Error('Compound source mark differences must stay explicit.');
   empty(v,['individualVowelPointRange','phonemes','audioTimes','quantity','review']);
  }
  let previousPosition=-1,observations=0,sourceCount=0;const seenSegments=new Set(),seenObservations=new Set();
  for(const [i,word] of study.words.entries()){
   if(word.id!==draft.words[i].id||word.hebrew!==draft.words[i].hebrew||!Array.isArray(word.sourceVowels)||!Array.isArray(word.candidateVowels))throw Error('Marked Hebrew word identity changed.');
   empty(word,['phonemes','audioTimes','syllableTimes','quantity','review']);const source=new Map();
   for(const v of word.sourceVowels){
    const cat=categories.get(v.categoryId);
    if(!cat||cat.label!==v.categoryLabel||cat.kind!==v.categoryKind||!['vowel','diphthong-part'].includes(cat.kind)||v.categoryId==='YOD_0DAG_PART2_OF_DIPHTHONG'||v.wordId!==word.id||typeof v.sourceUnitId!=='string'||!v.sourceUnitId.includes('-'+style+'-')||typeof v.sourceSegmentId!=='string'||!v.sourceSegmentId.startsWith(v.sourceUnitId+'-')||seenSegments.has(v.sourceSegmentId)||!Number.isInteger(v.sourcePosition)||v.sourcePosition<=previousPosition||typeof v.sourceUnitText!=='string'||typeof v.sourceStress!=='boolean'||typeof v.sourceRealization?.text!=='string'||typeof v.sourceRealization.ascii!=='string'||typeof v.sourceHebrew?.text!=='string'||!Array.isArray(v.parentSyllableReaderRanges)||!v.parentSyllableReaderRanges.length)throw Error('Source vowel category, syllable, stress or shared structure changed.');
    empty(v,['individualVowelPointRange','phonemes','audioTimes','quantity','review']);
    for(const r of v.parentSyllableReaderRanges)if(r.readerWordId!==word.id||!Number.isInteger(r.start)||!Number.isInteger(r.end)||r.start<0||r.end<=r.start||word.hebrew.slice(r.start,r.end)!==r.text||!['written','shared-consonant'].includes(r.role))throw Error('Whole marked Hebrew syllable ranges changed.');
    if(v.sourceMarkedTextEqualsWrittenRanges!==(v.parentSyllableReaderRanges.filter(r=>r.role==='written').map(r=>r.text).join('')===v.sourceHebrew.text))throw Error('Source-edition marked differences must stay explicit.');
    source.set(v.sourceSegmentId,v);seenSegments.add(v.sourceSegmentId);previousPosition=v.sourcePosition;sourceCount++;
   }
   for(const c of word.candidateVowels){
    const v=source.get(c.sourceVowelSegmentId),window=prior.modelWindows[c.modelWindow],range=c.modelCharacterRange,bin=c.modelLocationBins;
    if(!v||c.sourceUnitId!==v.sourceUnitId||!window||c.modelCoordinateUnit!=='UTF-16'||!Array.isArray(range)||range.length!==2||range.some(n=>!Number.isInteger(n))||range[0]<0||range[1]<=range[0]||window.rawModelOutput.slice(...range)!==c.modelText||![...c.modelText].some(x=>vowels.has(x))||[...c.modelText].some(x=>!vowels.has(x)&&!'ˈˌːˑ'.includes(x)&&!/[\s\p{M}]/u.test(x))||c.vowelCharacterCount!==[...c.modelText].filter(x=>vowels.has(x)).length)throw Error('Raw model vowel observation or exact Unicode range changed.');
    const core=window.sourceClock.coreSeconds;
    if(!Array.isArray(bin)||bin.length!==2||bin.some(n=>!Number.isFinite(n))||bin[0]<core[0]-1e-7||bin[1]<=bin[0]||bin[1]>core[1]+1e-7||c.sourceVowelCountBetweenAnchors!==1||c.uniqueConsonantAnchors!==true||c.adjacentSourceConsonantAtoms!==true||c.withinOriginalWordAuditionContext!==true||c.vowelQualityCompared!==false)throw Error('Ambiguous, clock-disagreeing or quality-approved vowel observation refused.');
    const bound=[];
    for(const a of [c.leftAnchor,c.rightAnchor]){
     if(!a||!Array.isArray(a.modelCharacterRange))throw Error('Missing unique source consonant anchor.');
     const oldAnchor=anchors.get(anchorKey(a));
     if(!oldAnchor||a.modelWindow!==c.modelWindow||a.modelGlyph!==oldAnchor.modelGlyph||a.sourceWordId!==oldAnchor.sourceWordId||a.sourceEventId!==oldAnchor.sourceEventCandidates[0]||a.sourceClassPart!==oldAnchor.sourceClassPart)throw Error('Unmatched, ambiguous or different-source consonant anchor refused.');
     bound.push(atomOrder.get(a.sourceEventId+':'+a.sourceClassPart));
    }
    if(bound[1]!==bound[0]+1||c.leftAnchor.sourceEventId===c.rightAnchor.sourceEventId||c.leftAnchor.sourceClassPart!==events.get(c.leftAnchor.sourceEventId).classes.length-1||c.rightAnchor.sourceClassPart!==0||events.get(c.rightAnchor.sourceEventId).categoryId.startsWith('FPP_PATAX_')||c.leftAnchor.modelCharacterRange[1]!==range[0]||c.rightAnchor.modelCharacterRange[0]!==range[1]||c.crossWordAnchorContext!==([c.leftAnchor,c.rightAnchor].some(a=>a.sourceWordId!==word.id)))throw Error('A vowel cannot cross a missing/compound consonant, model seam or different raw range.');
    const identity=[c.modelWindow,...range].join(':');if(seenObservations.has(identity))throw Error('A raw vowel observation cannot be assigned twice.');seenObservations.add(identity);observations++;
    empty(c,['phonemes','audioTimes','quantity','review']);
   }
  }
  if(sourceCount!==entry.comparisons[style].sourceVowelCategories||observations!==entry.comparisons[style].candidateObservations||!same(study.diagnostics,entry.comparisons[style]))throw Error('Vowel study coverage or withheld diagnostics changed.');
 }
 return structuredClone(value);
}

export async function loadVowelAnchors(record,draft,consonants,{readPacket=loadVowelAnchorPacket}={}){
 const entry=VOWEL_ANCHORS.records.find(r=>r.recordId===record.id&&r.originalSha256===record.audio.sha256);if(!entry)throw Error('No vowel observations exist for this original recording.');
 const bytes=await readPacket(entry.file),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(bytes.length!==entry.bytes||hash!==entry.sha256)throw Error('Vowel observation checksum differs from its source record.');
 const raw=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();return validateVowelAnchors(JSON.parse(raw),draft,consonants);
}

export function vowelWordView(packet,index,style){
 if(!styles.includes(style)||!Number.isInteger(index)||index<0||!packet.studies[style].words[index])throw Error('Choose an unchanged source word and an existing MAM text style.');
 const word=packet.studies[style].words[index],rows=word.sourceVowels.map(source=>({source,observations:word.candidateVowels.filter(c=>c.sourceVowelSegmentId===source.sourceSegmentId),unsplitCompound:false}));
 rows.push(...VOWEL_ANCHORS.sourceUnitInventory.unsplitCompounds[style].filter(s=>s.wordId===word.id).map(source=>({source,observations:[],unsplitCompound:true})));rows.sort((a,b)=>a.source.sourcePosition-b.source.sourcePosition);
 return {word,style,rows,phonemes:null,audioTimes:null,review:null};
}
