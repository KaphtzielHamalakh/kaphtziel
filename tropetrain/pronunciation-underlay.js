// Original reader-cluster mapping of separately computed source syllable facts.
import {transcriptionStructure} from './pronunciation-structure.js';
const letters=text=>text.replace(/[^א-ת]/gu,'');
const clusters=text=>[...text.matchAll(/[א-ת][^א-ת]*/gu)].map(m=>({start:m.index,end:m.index+m[0].length,text:m[0]}));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function rangesForClusters(list,start,end,role='written'){
 const selected=list.slice(start,end),ranges=[];
 if(selected.length!==end-start||!selected.length)return null;
 for(const c of selected){
  const last=ranges.at(-1);
  if(last?.readerWordId===c.readerWordId&&last.end===c.start&&last.role===role){last.end=c.end;last.text+=c.text;}
  else ranges.push({readerWordId:c.readerWordId,start:c.start,end:c.end,text:c.text,role});
 }
 return ranges;
}
function sourceRange(cell,list,start,end,role='written'){
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||start>=end||end>list.length)throw Error('Invalid source Hebrew underlay range.');
 const from=list[start].start,to=list[end-1].end;
 return {start:from,end:to,text:cell.text.slice(from,to),letterStart:start,letterEnd:end,role};
}
export class PronunciationUnderlay {
 constructor(data,sourceCommit){
  if(data?.format!=='tropetrain-pronunciation-underlay-v1'||data.revision!==1||data.sourceCommit!==sourceCommit||data.inputSha256!=='0be1dc0fb62d1754ddb03eda10efd7f393d9b571b6a7cdff6436078452ff06c7'||!data.groups)throw Error('The pronunciation underlay source needs review.');
  this.data=data;
 }
 apply(study){
  const entry=this.data.groups[study.groupId],group=study.sourceGroup;
  if(!entry||entry.length!==group.rows.length)throw Error('The pronunciation underlay group needs review.');
  const hebrewRows=group.rows.map(row=>row.hebrew.map(transcriptionStructure));
  const rowLetters=hebrewRows.map(cells=>{const forms=[...new Set(cells.filter(c=>c.text!==null).map(c=>letters(c.text)))];return forms.length===1?forms[0]:null;});
  const readerClusters=group.readerHebrew.flatMap((text,index)=>clusters(text).map(c=>({...c,readerWordId:group.readerIds[index]})));
  const exactGroup=rowLetters.every(s=>s!==null)&&rowLetters.join('')===group.readerHebrew.map(letters).join('');
  const rowOffsets=rowLetters.map((_,index)=>rowLetters.slice(0,index).reduce((n,s)=>n+(s?.length??0),0));
  const byWord=new Map(group.readerIds.map((id,index)=>[id,clusters(group.readerHebrew[index]).map(c=>({...c,readerWordId:id}))]));
  let sourceUnits=0,readerUnits=0;
  const rows=study.rows.map((row,rowIndex)=>{
   const [number,variants]=entry[rowIndex];if(number!==row.number||!Array.isArray(variants))throw Error('The pronunciation underlay row needs review.');
   return {...row,styles:Object.fromEntries(Object.entries(row.styles).map(([style,cells])=>[style,cells.map(cell=>{
    if(!cell.units.length)return cell;
    const candidates=variants.filter(v=>v[style==='sephardic'?1:2]===cell.column);
    if(!candidates.length)throw Error('No checked Hebrew underlay for this source cell.');
    const prepared=candidates.map(([column,,,ends,shared])=>{
     const source=hebrewRows[rowIndex][column-1];if(!source||source.text===null)throw Error('Missing source Hebrew underlay.');
     const list=clusters(source.text);
     if(ends.length!==cell.units.length||ends.at(-1)!==list.length||ends.some((end,i)=>!Number.isInteger(end)||end<=(ends[i-1]??0))||shared.some(i=>!Number.isInteger(i)||i<0||i>=ends.length-1)||new Set(shared).size!==shared.length)throw Error('Invalid source Hebrew syllable boundaries.');
     const parts=[...source.text.matchAll(/[^־\s]+/gu)].map(m=>({start:letters(source.text.slice(0,m.index)).length,letters:letters(m[0])}));
     function readerRange(unit,start,end,role){
      if(exactGroup)return rangesForClusters(readerClusters,rowOffsets[rowIndex]+start,rowOffsets[rowIndex]+end,role);
      // A separately proven complete source word may match even when another word differs.
      const segment=cell.wordSegments.find(s=>s.unitIds.includes(unit.id));
      const index=cell.wordSegments.indexOf(segment),part=parts[index],target=byWord.get(unit.readerWordId);
      if(!unit.readerWordId||segment?.readerWordId!==unit.readerWordId||!part||!target||part.letters!==target.map(c=>c.text[0]).join('')||start<part.start||end>part.start+part.letters.length)return null;
      return rangesForClusters(target,start-part.start,end-part.start,role);
     }
     return {column,source,list,ends,shared:new Set(shared),readerRange};
    });
    const units=cell.units.map((unit,index)=>{
     const variants=prepared.map(v=>{
      const start=v.ends[index-1]??0,end=v.ends[index],written=sourceRange(v.source,v.list,start,end);
      const shared=v.shared.has(index)?sourceRange(v.source,v.list,end,end+1,'shared-consonant'):null;
      const primary=v.readerRange(unit,start,end,'written'),sharedReader=shared?v.readerRange(unit,end,end+1,'shared-consonant'):[];
      return {hebrewColumn:v.column,labels:v.source.marks.filter(m=>m.kind==='reading').map(m=>m.label),source:written,sharesNextConsonant:shared,sharesPreviousConsonant:v.shared.has(index-1),readerRanges:primary&&sharedReader?[...primary,...sharedReader]:null};
     });
     const candidate=variants[0].readerRanges;
     const readerRanges=candidate&&variants.every(v=>same(v.readerRanges,candidate))?candidate:null;
     sourceUnits++;readerUnits+=readerRanges!==null;
     const owners=readerRanges?[...new Set(readerRanges.map(r=>r.readerWordId))]:[];
     const computedOwner=owners.length===1?owners[0]:null;
     if(unit.readerWordId&&computedOwner&&unit.readerWordId!==computedOwner)throw Error('Conflicting pronunciation word ownership.');
     return {...unit,sourceBoundaryReaderWordId:unit.readerWordId,readerWordId:unit.readerWordId??computedOwner,hebrewClusterRanges:readerRanges,hebrewUnderlay:{status:readerRanges?'exact-reader-clusters':variants.some(v=>v.readerRanges)?'variant-reader-difference':'source-only',variants}};
    });
    const assigned=units.filter(u=>u.readerWordId!==null).length;
    return {...cell,units,sourceBoundaryWordAlignment:cell.wordAlignment,wordAlignment:{status:assigned===units.length?'word-aligned':assigned?'partly-word-aligned':'group-only',method:'source-boundaries-and-computed-written-ranges',reason:assigned<units.length?'unresolved-source-word-ownership':null},hebrewUnderlay:{sourceUnits:units.length,readerUnits:units.filter(u=>u.hebrewClusterRanges!==null).length}};
   })]))};
  });
  const styles=Object.fromEntries(['sephardic','ashkenazic'].map(style=>{
   const units=rows.flatMap(row=>row.styles[style].flatMap(cell=>cell.units)),assigned=units.filter(u=>u.readerWordId!==null).length;
   return [style,{status:!units.length?'no-source-transcription':assigned===units.length?'word-aligned':assigned?'partly-word-aligned':'group-only',assignedUnits:assigned,groupOnlyUnits:units.length-assigned}];
  }));
  const alignmentScope=study.readerIds.length===1?'single-reader-word':styles[study.selectedStyle].status==='word-aligned'?'source-word-boundaries':styles[study.selectedStyle].status==='partly-word-aligned'?'partial-source-word-boundaries':'complete-reader-group';
  return {...study,revision:4,rows,alignmentScope,sourceBoundaryWordAlignment:study.wordAlignment,wordAlignment:{revision:2,styles,method:'Existing source-boundary proofs plus exact computed Hebrew cluster ranges; original proofs and prior IDs retained.'},hebrewUnderlay:{revision:1,sourceUnits,readerUnits,sourceCommit:this.data.sourceCommit,inputSha256:this.data.inputSha256,computationSourceSha256:this.data.computationSourceSha256,method:'Pinned source syllable computation checked against both literal transcriptions; target ranges require exact written letters and consensus across original alternatives. Shared consonants are explicit references.'},review:'Computed source syllables reproduce both published transcription styles. Existing boundary proofs and exact written cluster ranges support word links; prior links and raw source AST/stress are retained. Shared consonants are explicit references. Differing or ambiguous written forms keep source-only ranges. Independent linguistic/cantorial review remains pending; phonemes, notes, audio times and new singing voices remain unassigned.'};
 }
}
