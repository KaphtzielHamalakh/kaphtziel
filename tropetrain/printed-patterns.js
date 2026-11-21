import {PRINTED_PATTERNS} from './printed-pattern-data.js';
import {PRINTED_PATTERN_CATALOG,PATTERN_IMAGE_DATA,PATTERN_RECORD_DATA} from './pattern-catalog-data.js';
export {PRINTED_PATTERNS,PRINTED_PATTERN_CATALOG,PATTERN_IMAGE_DATA,PATTERN_RECORD_DATA};
export function patternSource(id=PRINTED_PATTERNS.id){
 const row=PRINTED_PATTERN_CATALOG.rows.find(r=>r.id===id);if(!row)throw Error('Choose a checked printed source row.');return row;
}
export function availablePatternModes(sourceId=PRINTED_PATTERNS.id){
 const cells=new Set(patternSource(sourceId).record.notes.map(n=>n.cell));
 return PATTERN_MODES.filter(m=>m.id==='pair'?cells.has('munah')&&cells.has('revia'):cells.has(m.id));
}
export const PATTERN_MODES=Object.freeze([
  {id:'pair',name:'Munaḥ → Revia · both printed columns'},
  {id:'munah',name:'Munaḥ · plain “Resting” column'},
  {id:'revia',name:'Revia · printed column'}
]);
export function printedPatternPlan(mode='pair',{tempo=84,transpose=0,sourceId=PRINTED_PATTERNS.id}={}){
  if(!PATTERN_MODES.some(m=>m.id===mode))throw Error('Choose a printed pattern.');
  const row=patternSource(sourceId),record=row.record;
  if(!availablePatternModes(sourceId).some(m=>m.id===mode))throw Error('This printed source has no checked transcription for those columns.');
  if(!Number.isFinite(tempo)||tempo<=0||!Number.isInteger(transpose)||Math.abs(transpose)>36)throw Error('Invalid pattern tempo or key.');
  let beat=0;
  return record.notes.filter(n=>mode==='pair'||n.cell===mode).map(n=>{
    const e={id:n.id,sourceProfile:record.id,sourceRevision:record.revision,sourceLocation:n.sourceLocation,
      sourceLabel:n.cell==='munah'?'Munaḥ · printed plain form':'Revia · printed form',midi:n.midi+transpose,beats:n.quarterBeats,
      startBeat:beat,startSeconds:beat*60/tempo,durationSeconds:n.quarterBeats*60/tempo,sourceRhythm:{...n.rhythm},
      wordId:null,sourceWordId:null,syllableId:null,syllable:null,phonemes:null,
      ...(n.slur?{sourceSlurId:n.slur.id,sourceSlurPhase:n.slur.phase}:{}),
      ...(n.tie?{tieId:n.tie.id,tieStart:n.tie.phase==='start',tieStop:n.tie.phase==='stop'}:{}),
      ...(n.tuplet?{sourceTupletId:n.tuplet.id,sourceTupletPhase:n.tuplet.phase}:{})};
    beat+=e.beats;return Object.freeze(e);
  });
}
