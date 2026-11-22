// Original cluster binding code CC0-1.0; source-category facts retain CC BY-SA4.0.
const clusters=text=>[...text.matchAll(/[א-ת][^א-ת]*/gu)].map(m=>({start:m.index,end:m.index+m[0].length,text:m[0]}));
function readerClusters(ranges,readerTexts,role){
 if(ranges===null)return null;
 if(!Array.isArray(ranges))throw Error('Reader letter-cluster ranges changed.');
 const result=[];
 for(const range of ranges){
  if(!['written','shared-consonant'].includes(range.role))throw Error('Source letter binding role changed.');
  const text=readerTexts.get(range.readerWordId),parts=typeof text==='string'?clusters(text).filter(c=>c.start>=range.start&&c.end<=range.end):[];
  if(!parts.length||parts[0].start!==range.start||parts.at(-1).end!==range.end||parts.map(c=>c.text).join('')!==range.text||text.slice(range.start,range.end)!==range.text)throw Error('Marked Hebrew letter-cluster correspondence changed.');
  if(range.role===role)result.push(...parts.map(c=>({...c,readerWordId:range.readerWordId,role})));
 }
 return result;
}
function sourceClusters(range){
 if(!range||!Number.isInteger(range.start)||!Number.isInteger(range.end)||range.start<0||range.end<=range.start||typeof range.text!=='string'||range.text.length!==range.end-range.start)throw Error('Source letter-cluster range changed.');
 const parts=clusters(range.text);
 if(!parts.length||parts[0].start!==0||parts.at(-1).end!==range.text.length)throw Error('Source letter clusters are incomplete.');
 return parts.map(c=>({...c,start:c.start+range.start,end:c.end+range.start,role:range.role}));
}
export function bindPronunciationLetters(segments,underlay,categories,readerTexts){
 if(underlay?.source?.role!=='written'||underlay.sharesNextConsonant&&underlay.sharesNextConsonant.role!=='shared-consonant')throw Error('Source letter-cluster role changed.');
 if(!Array.isArray(segments)||!segments.length||new Set(segments.map(s=>s.id)).size!==segments.length)throw Error('Source segment identities changed.');
 const written=sourceClusters(underlay.source),shared=underlay.sharesNextConsonant?sourceClusters(underlay.sharesNextConsonant):[],readerWritten=readerClusters(underlay.readerRanges,readerTexts,'written'),readerShared=readerClusters(underlay.readerRanges,readerTexts,'shared-consonant');
 const sameLetters=(a,b)=>a.length===b.length&&a.every((c,i)=>c.text[0]===b[i].text[0]);
 if(readerWritten&&!sameLetters(written,readerWritten)||readerShared&&!sameLetters(shared,readerShared))throw Error('Source and reader letter clusters differ.');
 let offset=0;
 const bindings=segments.map(segment=>{
  const category=categories.get(segment.categoryId);if(!category)throw Error('Unknown source category for letter binding.');
  if(!['whole','first-half-shared','second-half-shared'].includes(segment.part)||segment.part!=='whole'&&!category.geminate)throw Error('Source shared-consonant part changed.');
  const letters=category.hebrewLetters;
  if(typeof letters!=='string'||/[^א-ת]/u.test(letters))throw Error('Unsupported source category letters.');
  const reference=segment.part==='first-half-shared',source=reference?shared:written.slice(offset,offset+letters.length),target=reference?readerShared:readerWritten?.slice(offset,offset+letters.length)??null;
  if(!reference)offset+=letters.length;
  if(!letters)return {sourceSegmentId:segment.id,categoryId:segment.categoryId,part:segment.part,status:'no-written-letter',sourceCluster:null,readerClusterRanges:null,markedClustersEqual:null,writtenLetterCount:0,phonemes:null,individualVowelPointRange:null,audioTimes:null};
  if(source.map(c=>c.text[0]).join('')!==letters||reference&&(!category.geminate||source.length!==1)||target&&!sameLetters(source,target))throw Error('Source category letters do not reconstruct their clusters.');
  return {sourceSegmentId:segment.id,categoryId:segment.categoryId,part:segment.part,status:target?'exact-written-clusters':'source-only',sourceCluster:{start:source[0].start,end:source.at(-1).end,text:source.map(c=>c.text).join(''),role:reference?'shared-consonant':'written'},readerClusterRanges:target,markedClustersEqual:target?source.map(c=>c.text).join('')===target.map(c=>c.text).join(''):null,writtenLetterCount:reference?0:letters.length,phonemes:null,individualVowelPointRange:null,audioTimes:null};
 });
 if(offset!==written.length)throw Error('Source category letter binding is incomplete.');
 return {revision:1,coordinateUnit:'UTF-16',scope:'source-variant',bindings,review:null,limits:'Whole marked letter clusters only; source and reader marks may differ. A shared first half references the following written cluster and contributes no additional written letter. Categories without a written letter retain only their parent syllable. No vowel-point, phoneme, note or audio-time allocation.'};
}
