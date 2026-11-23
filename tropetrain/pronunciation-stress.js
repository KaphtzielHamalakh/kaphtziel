// Original source-context adapter. This records primary stress evidence, not sound.
export const MAQAF_STRESS_SOURCE=Object.freeze({
 id:'gesenius-cowley-1910-maqaf',title:'Gesenius’ Hebrew Grammar',edition:'Kautzsch–Cowley, 1910',
 sections:Object.freeze(['16a','16c']),url:'https://en.wikisource.org/wiki/Gesenius%27_Hebrew_Grammar/16',
 witnesses:Object.freeze([
  'https://en.wikisource.org/w/index.php?title=Page:Gesenius%27_Hebrew_Grammar_(1910_Kautzsch-Cowley_edition).djvu/87&oldid=8849221',
  'https://en.wikisource.org/w/index.php?title=Page:Gesenius%27_Hebrew_Grammar_(1910_Kautzsch-Cowley_edition).djvu/88&oldid=16367737'
 ]),
 rights:'Public-domain original grammar; references and original implementation only. No scan or transcription is imported.',
 scope:'Maqaf joins a primary-accent group. Meteg can mark secondary stress or full vowel realization; neither its quality nor its timing is inferred.'
});
const joined=text=>/־[\s\u034f\u200d]*$/u.test(text);
const accent=text=>/[\u0591-\u05af]/u.test(text);

export function sourceMaqafChain(study,units,column){
 const ids=study?.readerIds,hebrew=study?.readerHebrew;
 if(!Array.isArray(units)||!Array.isArray(ids)||!Array.isArray(hebrew)||ids.length<2||ids.length!==hebrew.length||new Set(ids).size!==ids.length)return null;
 const refs=ids.map(id=>/^([a-z0-9]+)-(\d+)-(\d+)-(\d+)$/u.exec(id));
 if(refs.some(r=>!r)||refs.some((r,i)=>i&&(r.slice(1,4).join('-')!==refs[0].slice(1,4).join('-')||Number(r[4])!==Number(refs[i-1][4])+1)))return null;
 if(hebrew.some(h=>typeof h!=='string')||hebrew.some(h=>h.includes('\u05c0'))||hebrew.slice(0,-1).some(h=>!joined(h)||accent(h)||h.includes('\u05c3'))||joined(hebrew.at(-1)))return null;
 const primary=units.filter(u=>u.sourceStress);
 if(primary.length!==1||primary[0].readerWordId!==ids.at(-1)||ids.some(id=>!units.some(u=>u.readerWordId===id)))return null;
 const words=new Map(ids.map((id,i)=>[id,hebrew[i]])),coverage=new Map(ids.map((id,i)=>[id,new Uint8Array(hebrew[i].length)])),segments=[];
 for(const unit of units){
  const variant=unit.sourceSegments?.variants.find(v=>v.hebrewColumn===column);
  if(!words.has(unit.readerWordId)||!variant||!Array.isArray(variant.readerRanges)||!variant.readerRanges.length)return null;
  for(const range of variant.readerRanges){
   const text=words.get(range.readerWordId);
   if(text===undefined||!Number.isInteger(range.start)||!Number.isInteger(range.end)||range.start<0||range.end<=range.start||range.end>text.length||text.slice(range.start,range.end)!==range.text)return null;
   if(range.role!=='written'&&range.role!=='shared-consonant'||range.role==='written'&&range.readerWordId!==unit.readerWordId)return null;
   if(range.role==='written')coverage.get(range.readerWordId).fill(1,range.start,range.end);
  }
  if(!Array.isArray(variant.segments))return null;
  for(const segment of variant.segments){if(segment.sourceUnitId!==unit.id||segment.readerWordId!==unit.readerWordId)return null;segments.push({segment,unit});}
 }
 if([...coverage.values()].some(range=>range.some(covered=>!covered))||new Set(segments.map(x=>x.segment.id)).size!==segments.length)return null;
 for(const {segment:s,unit}of segments)if(s.part!=='whole'){
  const reciprocal=s.part==='first-half-shared'?'second-half-shared':s.part==='second-half-shared'?'first-half-shared':null;
  if(!reciprocal||segments.filter(x=>x.segment.categoryId===s.categoryId&&x.unit.id===s.sharedWithUnitId&&x.segment.sharedWithUnitId===unit.id&&x.segment.part===reciprocal).length!==1)return null;
 }
 return {readerWordIds:[...ids],markedHebrew:[...hebrew],primaryWordId:ids.at(-1),primarySourceUnitId:primary[0].id,
  precedingMetegWordIds:ids.slice(0,-1).filter((id,i)=>hebrew[i].includes('\u05bd')),
  evidence:{sourceId:MAQAF_STRESS_SOURCE.id,sections:['16a','16c']},review:null};
}
