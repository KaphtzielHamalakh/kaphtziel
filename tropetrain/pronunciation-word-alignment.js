// Literal display-boundary correspondence. This does not derive phonemes.
const letters=text=>text.replace(/[^א-ת]/gu,'');
export function readerLetterForms(text){
 const raw=letters(text),forms=new Set([raw]);
 if(/^[ובכלמשה]{0,3}יהוה$/u.test(raw))for(const name of ['אדני','אלהים'])forms.add(raw.slice(0,-4)+name);
 const clusters=text.match(/[א-ת][^א-ת]*/gu)??[];
 if(raw.endsWith('הוא')&&clusters.at(-3)?.includes('\u05b4'))forms.add(raw.slice(0,-3)+'היא');
 if(/^[ובכלמשה]{0,3}יששכר$/u.test(raw))forms.add(raw.replace('יששכר','ישכר'));
 return [...forms];
}

export function literalReaderWordPaths(source,forms){
 const levels=[new Map([[0,1n]])],edges=[];
 for(const [word,choices] of forms.entries()){
  const next=new Map(),row=[];
  for(const [start,count] of levels[word])for(const form of new Set(choices)){
   if(!form||!source.startsWith(form,start))continue;
   const end=start+form.length;row.push({word,start,end,form});next.set(end,(next.get(end)??0n)+count);
  }
  edges.push(row);levels.push(next);
 }
 const paths=levels.at(-1).get(source.length)??0n;
 if(!paths)return {paths:'0',edges:[]};
 let ends=new Set([source.length]);const valid=[];
 for(let word=forms.length-1;word>=0;word--){
  const row=edges[word].filter(edge=>ends.has(edge.end));valid.push(...row);ends=new Set(row.map(edge=>edge.start));
 }
 return {paths:paths.toString(),edges:valid};
}

function sourceParts(cell,column){
 if(cell.text===null)return null;
 const parts=[...cell.text.matchAll(/[^־\s]+/gu)].map(match=>({text:match[0],start:match.index,end:match.index+match[0].length,letters:letters(match[0])}));
 if(!parts.length||parts.some(part=>!part.letters))return {invalid:true};
 return {column:column+1,text:cell.text,labels:cell.marks.filter(m=>m.kind==='reading').map(m=>m.label),parts};
}
function boundaryProof(group,hebrewRows){
 const rows=hebrewRows.map(cells=>cells.map(sourceParts).filter(Boolean));
 if(rows.some(forms=>!forms.length||forms.some(f=>f.invalid)))return {reason:'missing-or-nonlexical-source-Hebrew'};
 if(rows.some(forms=>new Set(forms.map(f=>f.parts.length)).size!==1))return {reason:'source-Hebrew-boundaries-differ'};
 const slots=rows.map(forms=>forms[0].parts.map((_,part)=>({forms:forms.map(f=>({column:f.column,text:f.parts[part].text,start:f.parts[part].start,end:f.parts[part].end,labels:f.labels})),owners:new Set()})));
 const formLists=group.readerHebrew.map(readerLetterForms),variants=[];
 function visit(row,chosen){
  if(row<rows.length){for(const form of rows[row])visit(row+1,[...chosen,form]);return;}
  let position=0;const spans=chosen.flatMap((form,r)=>form.parts.map((part,p)=>{const start=position;position+=part.letters.length;return {row:r,part:p,start,end:position};}));
  const source=chosen.map(form=>form.parts.map(part=>part.letters).join('')).join('');
  const match=literalReaderWordPaths(source,formLists);
  variants.push({sourceColumns:chosen.map(f=>f.column),paths:match.paths});
  if(match.paths==='0')return;
  for(const span of spans)for(const edge of match.edges)if(edge.start<span.end&&edge.end>span.start)slots[span.row][span.part].owners.add(edge.word);
 }
 visit(0,[]);
 if(variants.some(v=>v.paths==='0'))return {reason:'source-reading-word-difference',variants};
 return {reason:null,variants,rows:slots.map(parts=>parts.map(part=>({sourceForms:part.forms,readerIds:group.readerIds.filter((_,index)=>part.owners.has(index)),readerWordId:part.owners.size===1?group.readerIds[[...part.owners][0]]:null})))};
}
function transcriptionWords(cell){
 if(cell.status!=='present')return [];
 return [...cell.text.matchAll(/[^-\s]+/gu)].map(match=>({number:0,text:match[0],start:match.index,end:match.index+match[0].length})).map((part,index)=>({...part,number:index+1,unitIds:cell.units.filter(u=>u.start>=part.start&&u.end<=part.end).map(u=>u.id)}));
}

export function alignSourceWordBoundaries(group,rows,hebrewRows){
 const single=group.readerIds.length===1,proof=single?null:boundaryProof(group,hebrewRows);
 const aligned=rows.map((row,rowIndex)=>({...row,styles:Object.fromEntries(Object.entries(row.styles).map(([style,cells])=>[style,cells.map(cell=>{
  const parts=transcriptionWords(cell),slots=proof?.rows?.[rowIndex];
  let reason=single?null:proof.reason;
  if(cell.status!=='present')reason='no-source-transcription';
  else if(parts.some(part=>!part.unitIds.length))reason='empty-transcription-word';
  else if(!single&&!reason&&parts.length!==slots.length)reason='transcription-boundaries-differ';
  const wordSegments=parts.map((part,index)=>({...part,
   readerIds:reason?[]:single?[group.readerIds[0]]:slots[index].readerIds,
   readerWordId:reason?null:single?group.readerIds[0]:slots[index].readerWordId,
   sourceForms:single?[]:slots?.[index]?.sourceForms??[]}));
  const owners=new Map(wordSegments.flatMap(part=>part.unitIds.map(id=>[id,part.readerWordId])));
  const units=cell.units.map(unit=>({...unit,readerWordId:owners.get(unit.id)??null}));
  const assigned=units.filter(u=>u.readerWordId!==null).length;
  const status=cell.status!=='present'?'no-source-transcription':!units.length?'group-only':assigned===units.length?'word-aligned':assigned?'partly-word-aligned':'group-only';
  return {...cell,units,wordSegments,wordAlignment:{status,method:single?'single-reader-word-group':'literal-source-boundaries',reason:reason??(assigned<units.length?'source-word-spans-multiple-reader-words':null)}};
 })]))}));
 const styles=Object.fromEntries(['sephardic','ashkenazic'].map(style=>{
  const units=aligned.flatMap(row=>row.styles[style].flatMap(cell=>cell.units)),assigned=units.filter(unit=>unit.readerWordId!==null).length;
  return [style,{status:!units.length?'no-source-transcription':assigned===units.length?'word-aligned':assigned?'partly-word-aligned':'group-only',assignedUnits:assigned,groupOnlyUnits:units.length-assigned}];
 }));
 return {rows:aligned,wordAlignment:{revision:1,styles,proof:single?{method:'single-reader-word-group'}:{method:'all-literal-source-readings-and-all-exact-reader-form-paths',reason:proof.reason,variants:proof.variants??[]}}};
}
