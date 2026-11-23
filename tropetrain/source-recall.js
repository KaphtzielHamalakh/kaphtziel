// Original source-character exercise. No melodic or phonetic realization.
import {analyzeSourceSigns, SEARCH_SIGNS, SIGN_ANALYSIS} from './accents.js';
import {analyzeAccentContext} from './accent-context.js';

const definitions=SEARCH_SIGNS.filter(s=>s.proseClass);
const byId=new Map(definitions.map(s=>[s.id,s]));
// Hebrew below-base marks: combining classes 220/222 and meteg/Silluq (22).
const below=new Set([0x0591,0x0596,0x059a,0x059b,0x05a3,0x05a4,0x05a5,0x05a6,0x05a7,0x05aa,0x05bd]);
const segmenter=new Intl.Segmenter('he',{granularity:'grapheme'});
const clone=value=>structuredClone(value);
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const identity=w=>[w.id,w.sourceWordId??w.id,w.sourceHebrew,w.index,w.bookId,w.chapter,w.verse,w.ordinal,w.sectionId,w.verseKey,w.kind];
export function recallReadingIdentity(words){
 if(!Array.isArray(words)||!words.length)throw Error('Open a reading before starting recall practice.');
 const ids=new Set();
 for(const [i,w]of words.entries()){
  if(!w||typeof w.id!=='string'||!w.id||ids.has(w.id)||typeof w.sourceHebrew!=='string'||!w.sourceHebrew||w.index!==i)throw Error('Recall requires unchanged, ordered reader occurrences.');
  ids.add(w.id);
 }
 return JSON.stringify(words.map(identity));
}
function questionWord(word,positions){
 const offsets=new Map(positions.map(p=>[p.offset,p]));
 for(const p of positions)if(word.sourceHebrew.slice(p.offset,p.offset+p.char.length)!==p.char)throw Error('A source mark no longer has its original position.');
 const clusters=[...segmenter.segment(word.sourceHebrew)].map(({segment,index})=>{
  let offset=index,display='';const slots=[];
  for(const char of segment){
   const sign=offsets.get(offset);
   if(sign)slots.push({offset,char:sign.char,position:below.has(char.codePointAt(0))?'below':'above'});
   else display+=char;
   offset+=char.length;
  }
  return {source:segment,start:index,end:index+segment.length,display,slots};
 });
 if(clusters.flatMap(c=>c.slots).length!==positions.length)throw Error('A source mark could not be placed in its original letter cluster.');
 return {id:word.id,sourceWordId:word.sourceWordId??word.id,hebrew:word.sourceHebrew,clusters};
}
export function createRecallDeck(words){
 const fingerprint=recallReadingIdentity(words);
 // Recompute source signs rather than trusting a caller's cached analysis.
 const context=analyzeAccentContext(words.map(w=>({...w,signAnalysis:analyzeSourceSigns(w.sourceHebrew)})));
 const meta=[],withheld=[],snapshot=words.map(w=>Object.freeze({id:w.id,sourceWordId:w.sourceWordId,sourceHebrew:w.sourceHebrew}));
 for(const unit of context.units){
  // The Shalshelet character can be named while retaining its printed paseq.
  // This does not classify or realize the composite as a musical performance.
  const shalsheletPaseq=unit.atoms.length===1&&unit.atoms[0].id==='shalshelet'&&unit.issues.length===1&&unit.issues[0]==='paseq-context';
  if((!unit.qualified&&!shalsheletPaseq)||unit.atoms.length!==1){withheld.push({wordIds:unit.wordIndices.map(i=>words[i].id),reasons:unit.issues.length?[...unit.issues]:['several-functional-accents']});continue;}
  const atom=unit.atoms[0],definition=byId.get(atom.id);
  if(!definition)throw Error('Unknown source-character answer.');
  meta.push(freeze({id:'recall:'+unit.id,startIndex:unit.wordIndices[0],endIndex:unit.wordIndices.at(-1),
   target:{id:definition.id,name:definition.name,char:definition.char,code:definition.code},wordIndices:[...unit.wordIndices],positions:clone(atom.positions),
   sourceContextWarnings:[...unit.issues],foldedPositions:unit.foldedPositions}));
 }
 const byCardId=new Map(meta.map((m,index)=>[m.id,index]));
 const buildCard=index=>{
  const m=meta[index];if(!m)return null;
  return freeze({id:m.id,kind:'source-character-recall',startIndex:m.startIndex,endIndex:m.endIndex,target:clone(m.target),
   words:m.wordIndices.map(i=>questionWord(snapshot[i],m.positions.filter(p=>p.wordIndex===i))),source:SIGN_ANALYSIS,
   sourceContextWarnings:[...m.sourceContextWarnings],foldedPositions:m.foldedPositions,melody:null,pronunciation:null,phonemes:null,audioTimes:null,review:null});
 };
 // Project graphemes only for requested cards. A full reading does not retain
 // tens of thousands of duplicate glyph/slot trees or serialized answers.
 const cards=new Array(meta.length);
 for(let index=0;index<meta.length;index++)Object.defineProperty(cards,index,{enumerable:true,get:()=>buildCard(index)});
 const indexForCursor=index=>{
  if(!meta.length)return -1;let lo=0,hi=meta.length;
  while(lo<hi){const middle=(lo+hi)>>>1;if(meta[middle].endIndex<index)lo=middle+1;else hi=middle;}
  return lo<meta.length?lo:0;
 };
 return Object.freeze({fingerprint,cards:Object.freeze(cards),withheld:freeze(withheld),indexForCursor,
  verify(card,currentWords){
   const index=byCardId.get(card?.id);
   if(recallReadingIdentity(currentWords)!==fingerprint||index===undefined)throw Error('This recall question belongs to a changed reading or source mark. Start a new session.');
   const expected=buildCard(index);
   if(JSON.stringify(expected)!==JSON.stringify(card))throw Error('This recall question belongs to a changed reading or source mark. Start a new session.');
   return clone(expected);
  },
  forCursor(index){return buildCard(indexForCursor(index));}
 });
}
function hash(text){let result=2166136261;for(const char of text)result=Math.imul(result^char.codePointAt(0),16777619)>>>0;return result;}
export function recallChoices(card){
 if(!byId.has(card?.target?.id))throw Error('Choose a qualified source-character question.');
 const distractors=definitions.filter(d=>d.id!==card.target.id).sort((a,b)=>hash(card.id+a.id)-hash(card.id+b.id)||a.id.localeCompare(b.id)).slice(0,3);
 return [...distractors,byId.get(card.target.id)].sort((a,b)=>hash(a.id+card.id)-hash(b.id+card.id)||a.id.localeCompare(b.id)).map(d=>({id:d.id,name:d.name}));
}
export function checkRecallAnswer(card,answerId){
 if(!recallChoices(card).some(c=>c.id===answerId))throw Error('Choose one of this question’s source-character names.');
 return {correct:card.target.id===answerId,kind:'source-character-self-check',musicalReview:null,phonologicalReview:null};
}
export function randomRecallIndex(count,current,random=Math.random()){
 if(!Number.isInteger(count)||count<1||!Number.isInteger(current)||current<0||current>=count||!Number.isFinite(random)||random<0||random>=1)throw Error('A valid recall session and random choice are required.');
 if(count===1)return 0;
 const index=Math.floor(random*(count-1));return index>=current?index+1:index;
}
