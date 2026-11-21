// Original resolver for the public display's equality-based qamats repeat mark.
// The literal source AST is retained; referenced text is a derived view.
export const PRONUNCIATION_REPEAT_EVIDENCE=Object.freeze({
 commit:'6f0612ed2109d32e288d7c0ca41ae3dbfaad702b',
 file:'py/phonetic_mam/display_projection.py',gitBlob:'737dc0c4330dca9984baf1ab3fe7e17a78bb2c70',
 url:'https://github.com/bdenckla/MAM-basics/blob/6f0612ed2109d32e288d7c0ca41ae3dbfaad702b/py/phonetic_mam/display_projection.py',
 rule:'The second qamats transcription is displayed as an em dash when its content equals the first qamats transcription in the same pronunciation style.'
});
const SECOND_LABELS=new Set(['קמץ-ס','טעם תחתון, קמץ-ס','טעם עליון, קמץ-ס']);
export const hasTranscription=cell=>cell.status==='present'||cell.status==='repeated';
export function resolvePronunciationRepeats(group,rows){
 return rows.map((row,rowIndex)=>({...row,styles:Object.fromEntries(Object.entries(row.styles).map(([style,cells])=>[style,cells.map((cell,index)=>{
  if(cell.status!=='repeat-mark')return cell;
  const original=group.rows[rowIndex],firstNodes=original.transcriptions[style][0];
  const alternativeLabels=[...new Set(original.hebrew.flatMap(nodes=>nodes??[]).filter(n=>n&&typeof n==='object'&&n.kind==='reading'&&SECOND_LABELS.has(n.label)).map(n=>n.label))];
  const base=cells[0];
  const valid=index===1&&original.transcriptions[style][index]?.length===1&&original.transcriptions[style][index][0]==='—'&&firstNodes?.length===1&&firstNodes[0]?.kind==='reading'&&firstNodes[0].label==='קמץ-ד'&&base.status==='present'&&base.units.length>0&&alternativeLabels.length>0;
  if(!valid)return {...cell,status:'unresolved-repeat',literalStatus:'repeat-mark',literalText:'—',sourceReference:null};
  const reference={cellId:base.id,row:row.number,column:1,style,kind:'equal-qamats-transcription',alternativeLabels};
  const mark=m=>({...m,sourceColumn:1});
  return {...cell,status:'repeated',literalStatus:'repeat-mark',literalText:'—',sourceReference:reference,
   text:base.text,boundaries:base.boundaries.map(b=>({...b})),marks:base.marks.map(mark),
   units:base.units.map(unit=>({...unit,id:`${cell.id}-u${unit.number}`,readerWordId:cell.readerWordId,sourceMarks:unit.sourceMarks.map(mark),sourceReference:{cellId:base.id,column:1}}))};
 })]))}));
}
