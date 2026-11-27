import {VOICE_SOURCE_STUDIES,VOICE_SOURCE_RECORDINGS,VOICE_FEATURED_STUDIES,voiceCombinations,voiceCoverage} from './voice-studies.js';
import {wordSupportAvailable} from './word-support.js';
import {observedWordCuesAvailable} from './observed-word-cues.js';
import {genesisCompanionPassageAvailable} from './genesis-companion-passages.js';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const identity=w=>({id:w.sourceWordId??w.id,hebrew:w.sourceHebrew,bookId:w.bookId,chapter:w.chapter,verse:w.verse,ordinal:w.ordinal,kind:w.kind});
const featured=new Set(VOICE_FEATURED_STUDIES.map(s=>s.id));
function choices(entries){
 const sorted=entries.map(s=>structuredClone(s)).sort((a,b)=>b.recordIds.length-a.recordIds.length||Number(featured.has(b.id))-Number(featured.has(a.id))||a.id.localeCompare(b.id));
 return sorted.filter((s,i)=>!sorted.slice(0,i).some(prior=>s.recordIds.every(id=>prior.recordIds.includes(id))));
}

// These are links to existing source studies. Range membership never certifies
// what was sung or supplies a timing, pronunciation, musical rule or missing pair.
export function createWordRecordingNavigator(corpus){
 if(!corpus?.passage)throw Error('The source reader is not ready for word comparison.');
 const byWord=new Map(),records=new Map(VOICE_SOURCE_RECORDINGS.map(r=>[r.id,r])),eligible=new Set(VOICE_SOURCE_RECORDINGS.filter(r=>wordSupportAvailable(r)||observedWordCuesAvailable(r)||genesisCompanionPassageAvailable(r)).map(r=>r.id)),ranges=new Map(),sourceIds=new Set();
 for(const study of VOICE_SOURCE_STUDIES){
  const grouped=new Map();
  for(const pair of voiceCombinations(study.id)){
   if(!eligible.has(pair.id))continue;const record=records.get(pair.id),coverage=voiceCoverage(record);if(!coverage)continue;
   const key=JSON.stringify(coverage);if(!grouped.has(key))grouped.set(key,{coverage,recordIds:[]});grouped.get(key).recordIds.push(record.id);sourceIds.add(record.id);
  }
  for(const [key,group]of grouped){
   if(!ranges.has(key))ranges.set(key,corpus.passage([{id:'word-recording-navigation',...group.coverage}]).verses.flatMap(v=>v.words));
   for(const word of ranges.get(key)){
    const canonical=identity(word);if(!canonical.id||!canonical.hebrew||!['w','q'].includes(canonical.kind))throw Error('A comparison study lacks an unchanged preferred reader word.');
    let binding=byWord.get(canonical.id);if(!binding){binding={word:canonical,studies:[]};byWord.set(canonical.id,binding);}else if(!same(binding.word,canonical))throw Error('Source study reader words disagree. No word comparison is inferred.');
    binding.studies.push({id:study.id,name:study.name,recordIds:[...group.recordIds],coverage:structuredClone(group.coverage),review:null});
   }
  }
 }
 return Object.freeze({counts:Object.freeze({words:byWord.size,recordings:sourceIds.size,passageRanges:ranges.size}),forWord(word){
  const canonical=word&&identity(word),binding=canonical&&byWord.get(canonical.id);
  if(!binding)return {available:false,reason:'No separate recording-comparison study is mapped to this word. Existing recorded-chant controls keep their own coverage and timing limits.',studies:[]};
  if(!same(binding.word,canonical))return {available:false,reason:'This word differs from the unchanged reader used by the recording study. No replacement is inferred.',studies:[]};
  const studies=choices(binding.studies);return {available:true,word:{...binding.word},studies,recordings:[...new Set(studies.flatMap(s=>s.recordIds))],review:null};
 },verify(word,studyId){
  const current=this.forWord(word),study=current.studies.find(s=>s.id===studyId);if(!current.available||!study)throw Error('Choose an available comparison for the current unchanged reader word.');return {word:{...current.word},study:{...study,recordIds:[...study.recordIds],coverage:structuredClone(study.coverage)}};
 }});
}
