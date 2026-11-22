// Original mapping of separately computed, source-supported pronunciation facts.
// Source data and adaptation: CC BY-SA4.0. No IPA or acoustic phonemes inferred.
const STYLES=['sephardic','ashkenazic'];
const letters=text=>text.replace(/[^א-ת]/gu,'');
export class PronunciationSegments {
 constructor(data,sourceCommit){
  if(data?.format!=='tropetrain-pronunciation-segments-v1'||data.revision!==1||data.sourceCommit!==sourceCommit||data.inputSha256!=='0be1dc0fb62d1754ddb03eda10efd7f393d9b571b6a7cdff6436078452ff06c7'||data.underlaySha256!=='abaa42ef22f710638b4ac7a38e1d94687bda2ae537c2beb5a78dd286a79ff877'||data.computationSourceSha256!=='357314571720309945b3c7e1a2b33582a34dfbc6a497a02309af8c8572fcafaf'||data.license!=='CC-BY-SA-4.0'||!Array.isArray(data.catalog)||!data.groups)throw Error('The pronunciation source rules need review.');
  const ids=new Set();
  for(const c of data.catalog){
   if(typeof c.id!=='string'||ids.has(c.id)||typeof c.label!=='string'||typeof c.hebrewLetters!=='string'||!['consonant','vowel','diphthong-part','vowel-consonant-pair','silent-letter','silent-vowel-sign'].includes(c.kind)||typeof c.geminate!=='boolean')throw Error('Invalid pronunciation source category.');ids.add(c.id);
   for(const style of STYLES){if(typeof c.ascii?.[style]!=='string'||typeof c.display?.[style]!=='string'||c.geminate&&(typeof c.half?.ascii?.[style]!=='string'||typeof c.half?.display?.[style]!=='string'||c.half.ascii[style].repeat(2)!==c.ascii[style])||!c.geminate&&c.half!==null)throw Error('Invalid source transcription realization.');}
  }
  this.data=data;
 }
 apply(study){
  if(!study.hebrewUnderlay||study.sourceCommit!==this.data.sourceCommit||study.hebrewUnderlay.inputSha256!==this.data.inputSha256)throw Error('Checked Hebrew syllable underlay is required for source rules.');
  const entry=this.data.groups[study.groupId];if(!entry||entry.length!==study.rows.length)throw Error('Missing pronunciation source rules for this group.');
  let segmentCount=0;
  const rows=study.rows.map((row,ri)=>{
   const [number,variants]=entry[ri];if(number!==row.number||!Array.isArray(variants))throw Error('Pronunciation source rule row changed.');
   return {...row,styles:Object.fromEntries(STYLES.map(style=>[style,row.styles[style].map(cell=>{
    if(!cell.units.length)return cell;
    const candidates=variants.filter(v=>v[style==='sephardic'?1:2]===cell.column);
    if(!candidates.length||candidates.some(v=>!Array.isArray(v[3])||v[3].length!==cell.units.length))throw Error('Source rule syllable boundaries changed.');
    const units=cell.units.map((unit,ui)=>{
     const plans=candidates.map(([column,,,syllables])=>{
      const underlay=unit.hebrewUnderlay.variants.find(v=>v.hebrewColumn===column);if(!underlay)throw Error('Source rule Hebrew alternative changed.');
      const plan=syllables[ui];if(!Array.isArray(plan)||!plan.length)throw Error('Missing source rule segments.');
      let written='';const segments=plan.map((item,si)=>{
       if(!Array.isArray(item)||item.length!==2||!item.every(Number.isInteger))throw Error('Invalid source segment reference.');
       const [index,part]=item,category=this.data.catalog[index];if(!category||![0,1,2].includes(part)||part&&!category.geminate)throw Error('Invalid source segment category or shared consonant.');
       if(part!==1)written+=category.hebrewLetters;
       let sharedWithUnitId=null;
       if(part===1){const next=syllables[ui+1]?.[0];if(si!==plan.length-1||!underlay.sharesNextConsonant||next?.[0]!==index||next?.[1]!==2)throw Error('Invalid first shared-consonant half.');sharedWithUnitId=cell.units[ui+1]?.id;}
       if(part===2){const previous=syllables[ui-1]?.at(-1);if(si!==0||!underlay.sharesPreviousConsonant||previous?.[0]!==index||previous?.[1]!==1)throw Error('Invalid second shared-consonant half.');sharedWithUnitId=cell.units[ui-1]?.id;}
       const values=part?category.half:category;
       segmentCount++;
       return {id:`${unit.id}-h${column}-seg${si+1}`,categoryId:category.id,label:category.label,kind:category.kind,part:part===0?'whole':part===1?'first-half-shared':'second-half-shared',realizations:Object.fromEntries(STYLES.map(s=>[s,{ascii:values.ascii[s],text:values.display[s]}])),sourceUnitId:unit.id,readerWordId:unit.readerWordId,sourceStress:unit.sourceStress,sharedWithUnitId,hebrewScope:'parent-syllable-only',individualHebrewRange:null,ipa:null,phonemes:null,noteIds:null,audioTimes:null};
      });
      if(written!==letters(underlay.source.text)||segments.map(s=>s.realizations[style].text).join('')!==unit.text)throw Error('Source rule reconstruction differs from the original Hebrew or transcription.');
      return {hebrewColumn:column,sourceLabels:[...underlay.labels],sourceHebrew:underlay.source,readerRanges:underlay.readerRanges,segments};
     });
     return {...unit,sourceSegments:{revision:1,style,variants:plans,review:'Named source categories and transcription values only; no reviewed acoustic phonemes or segment timing.'}};
    });
    return {...cell,units};
   })]))};
  });
  return {...study,revision:5,rows,sourceSegments:{revision:1,segmentCount,inputSha256:this.data.inputSha256,underlaySha256:this.data.underlaySha256,computationSourceSha256:this.data.computationSourceSha256,method:'Closed source categories reproduce both existing styles exactly; shared consonant halves remain linked across syllables. Hebrew ownership and original marked ranges remain unchanged.',review:'Source computation only. IPA, acoustic phonemes, segment timings, note allocation, singing voice and Kinnor equivalence remain unassigned.'}};
 }
}
